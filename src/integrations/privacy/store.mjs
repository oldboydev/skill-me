import { randomBytes } from "node:crypto";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { validateEnvelope } from "../boundary.mjs";
import { assignSession, isCurrentGeneration, isValidObservation, sessionTag, switchObservation } from "../observe/authorization.mjs";
import { createStoreIo } from "./fs.mjs";
import {
  admitLines,
  CAPTURE_ID_PATTERN,
  DEFAULT_RETENTION_DAYS,
  isExpired,
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  PRIVACY_LIMITS,
  transition,
} from "./lifecycle.mjs";

// Armazenamento local mínimo das capturas (issue #5, crit. 13–19), reutilizado
// pela #8. Grava somente registros já produzidos pela política; nunca lê nem
// interpreta conteúdo. Layout, lock, atomismo e barreira de exclusão seguem as
// linhas do Landing em .checks/issue-5-privacidade.md.

export class StoreError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export const STORE_DIR = "skill-me-privacy";
const CAPTURES_DIR = "captures";
const STORE_FILE = "store.json";
const STORE_MARKER = '{"skillMePrivacyStore":1}';
const LOCK_FILE = ".lock";
const STATE_FILE = "state.json";
const KEY_FILE = "key";
const KEY_BYTES = 32;
const DELETING_PREFIX = ".deleting-";
const DATA_FILE_PATTERN = /^events-(\d{6})\.ndjson$/;
const TEMP_PATTERN = /^(state\.json|events-\d{6}\.ndjson)\.[0-9a-f]{8}\.skill-me-tmp$/;
// state.json tem forma fechada e pequena; um arquivo maior não é nosso.
const MAX_STATE_BYTES = 64 * 1024;
// Estado da observação automática (#23), ao lado do marcador do store. O teto
// cobre o mapa cheio (MAX_SESSIONS entradas de ~100 bytes).
const OBSERVE_FILE = "observe.json";
const MAX_OBSERVE_BYTES = 256 * 1024;
export const AUTOMATIC_ORIGIN = "automatic";

export const CONTENT_OMISSION_CODES = Object.freeze([
  "content_disabled",
  "unsupported_content",
  "unsanitizable",
  "sensitive_removed",
  "content_truncated",
  "privacy_failure",
]);
const DROP_REASON_PATTERN = /^[a-z][a-z_]{0,39}$/;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// Toda falha de E/S sai como código fechado, sem mensagem, caminho ou stack.
async function storeOp(fn) {
  try {
    return await fn();
  } catch (error) {
    throw error instanceof StoreError ? error : new StoreError("io_failure");
  }
}

async function entryKind(io, file) {
  let stats;
  try {
    stats = await io.lstat(file);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return "missing";
    throw error;
  }
  // No Windows uma junção também é reportada como link pelo `lstat`.
  if (stats.isSymbolicLink()) return "link";
  if (stats.isDirectory()) return "dir";
  return stats.isFile() ? "file" : "other";
}

const tempName = (target) => `${target}.${randomBytes(4).toString("hex")}.skill-me-tmp`;

async function resolveRoot(rootArg, io) {
  let stats;
  try {
    stats = await io.stat(path.resolve(rootArg));
  } catch {
    throw new StoreError("root_not_found");
  }
  if (!stats.isDirectory()) throw new StoreError("root_not_directory");
  return io.realpath(path.resolve(rootArg));
}

async function readSmallFile(io, file, maxBytes, invalidCode) {
  const kind = await entryKind(io, file);
  if (kind === "missing") return null;
  if (kind === "link") throw new StoreError("link_refused");
  if (kind !== "file") throw new StoreError(invalidCode);
  const bytes = await io.readBounded(file, maxBytes);
  if (bytes === null) throw new StoreError(invalidCode);
  return bytes;
}

// Abre a pasta do store da raiz. Só `start` e o `on` da observação (create)
// criam a pasta; os demais recebem null quando ela não existe. O marcador é
// imutável depois de criado, então é conferido antes do lock: uma pasta alheia
// com o mesmo nome nunca recebe o nosso lock. `expectedReal` (observação
// automática, #23): o caminho real gravado no setup; outro destino é
// `root_changed`, e `withLock` mantém a conferência até o fim da operação.
async function openStore(rootArg, io, { create = false, expectedReal = null } = {}) {
  const rootReal = await resolveRoot(rootArg, io);
  if (expectedReal !== null && rootReal !== expectedReal) throw new StoreError("root_changed");
  const storeDir = path.join(rootReal, STORE_DIR);
  let kind = await entryKind(io, storeDir);
  if (kind === "missing") {
    if (!create) return null;
    try {
      await io.mkdir(storeDir);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    kind = await entryKind(io, storeDir);
  }
  if (kind === "link") throw new StoreError("link_refused");
  if (kind !== "dir") throw new StoreError("store_invalid");
  const marker = await readSmallFile(io, path.join(storeDir, STORE_FILE), STORE_MARKER.length, "store_invalid");
  let needsInit = false;
  if (marker === null) {
    // Sem marcador, só uma pasta vazia (ou só com um lock) é adotada, e só por start.
    const names = (await io.readdir(storeDir)).filter((name) => name !== LOCK_FILE);
    if (!create || names.length > 0) throw new StoreError("store_invalid");
    needsInit = true;
  } else if (marker.toString("utf8") !== STORE_MARKER) {
    throw new StoreError("store_invalid");
  }
  return { io, rootArg, rootReal, storeDir, capturesDir: path.join(storeDir, CAPTURES_DIR), needsInit };
}

// A raiz e a pasta do store continuam as resolvidas no início: trocadas por
// junção/link no meio da operação, o mesmo nome alcançaria outro lugar.
async function assertUnchanged(ctx) {
  let real;
  try {
    real = await ctx.io.realpath(path.resolve(ctx.rootArg));
  } catch {
    throw new StoreError("root_changed");
  }
  if (real !== ctx.rootReal || (await entryKind(ctx.io, ctx.storeDir)) !== "dir") throw new StoreError("root_changed");
}

// Lock exclusivo por arquivo, sem espera: ocupado → conflito sem mutação, e
// nunca removido por outro processo. Só sai se ainda tiver os bytes que
// gravamos; senão `lostCode`. Consumidores: o lock da raiz (withLock) e o da
// configuração da observação (#23, linha "Barreira da configuração").
//
// O lock é criado sem flush: só serializa processos vivos — a criação `wx` é
// atômica e os bytes conferidos na liberação são lidos pelo mesmo sistema — e,
// depois de uma queda do sistema, nenhum processo o detém; guardá-lo no disco
// não protege nada. Cada flush espera o disco dentro do prazo de entrega da #8,
// e os dois do lock eram metade dos de um hook (.checks/issue-8-traces.build.md,
// rodada 6).
export async function holdLockFile({ io, lockPath, lostCode }, fn) {
  const bytes = Buffer.from(JSON.stringify({ lockVersion: 1, pid: process.pid, nonce: randomBytes(8).toString("hex") }));
  try {
    await io.writeExclusive(lockPath, bytes, { durable: false });
  } catch (error) {
    if (error.code === "EEXIST") throw new StoreError("lock_present");
    throw error;
  }
  let failure = null;
  let result;
  try {
    result = await fn();
  } catch (error) {
    failure = error;
  }
  try {
    const current = await readSmallFile(io, lockPath, bytes.length, lostCode);
    if (current === null || !current.equals(bytes)) throw new StoreError(lostCode);
    await io.unlink(lockPath);
  } catch (error) {
    failure ??= error;
  }
  if (failure) throw failure;
  return result;
}

// Lock da raiz. `ctx.onLock`, quando houver, é chamado quando o lock passa a
// ser desta operação, antes de qualquer leitura ou mutação; se lançar, a
// operação desiste sem mudar nada.
function withLock(ctx, fn) {
  return holdLockFile({ io: ctx.io, lockPath: path.join(ctx.storeDir, LOCK_FILE), lostCode: "root_changed" }, async () => {
    ctx.onLock?.();
    await assertUnchanged(ctx);
    return fn();
  });
}

async function ensureCapturesDir(ctx) {
  const kind = await entryKind(ctx.io, ctx.capturesDir);
  if (kind === "missing") return ctx.io.mkdir(ctx.capturesDir);
  if (kind === "link") throw new StoreError("link_refused");
  if (kind !== "dir") throw new StoreError("store_invalid");
}

async function capturesDirKind(ctx) {
  const kind = await entryKind(ctx.io, ctx.capturesDir);
  if (kind === "link") throw new StoreError("link_refused");
  if (kind !== "dir" && kind !== "missing") throw new StoreError("store_invalid");
  return kind;
}

function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isCountMap(value, keyOk) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.entries(value).every(([key, count]) => keyOk(key) && isCount(count) && count > 0)
  );
}

const isDropReason = (key) => DROP_REASON_PATTERN.test(key);
const isOmissionCode = (key) => CONTENT_OMISSION_CODES.includes(key);
const isIso = (value) => typeof value === "string" && ISO_PATTERN.test(value) && !Number.isNaN(Date.parse(value));

const STATE_KEYS = ["captureVersion", "content", "counters", "createdAt", "dataBytes", "dataFile", "endedAt", "id", "limits", "retentionDays", "state"];
// Só a captura criada pela observação automática traz `origin`; a manual
// continua com a forma da #5 (linha "Captura automática" do Landing da #23).
const AUTOMATIC_STATE_KEYS = [...STATE_KEYS, "origin"].sort();
const COUNTER_KEYS = ["accepted", "contentOmitted", "dropped", "malformed", "persisted"];

function isValidState(state, id) {
  if (state === null || typeof state !== "object" || Array.isArray(state)) return false;
  const keys = Object.keys(state).sort();
  const manual = isDeepStrictEqual(keys, STATE_KEYS);
  if (!manual && !(isDeepStrictEqual(keys, AUTOMATIC_STATE_KEYS) && state.origin === AUTOMATIC_ORIGIN)) return false;
  const counters = state.counters;
  return (
    state.captureVersion === 1 &&
    state.id === id &&
    ["active", "stopped", "disabled"].includes(state.state) &&
    typeof state.content === "boolean" &&
    Number.isInteger(state.retentionDays) &&
    state.retentionDays >= MIN_RETENTION_DAYS &&
    state.retentionDays <= MAX_RETENTION_DAYS &&
    isIso(state.createdAt) &&
    (state.state === "active" ? state.endedAt === null : isIso(state.endedAt)) &&
    (state.dataFile === null ? state.dataBytes === 0 : DATA_FILE_PATTERN.test(state.dataFile)) &&
    isCount(state.dataBytes) &&
    // `dataBytes` é o teto de leitura e alocação do segmento: acima do limite
    // da captura, nenhuma admissão o produziria e o estado não é nosso.
    state.dataBytes <= PRIVACY_LIMITS.maxBytes &&
    counters !== null &&
    typeof counters === "object" &&
    isDeepStrictEqual(Object.keys(counters).sort(), COUNTER_KEYS) &&
    isCount(counters.accepted) &&
    isCount(counters.persisted) &&
    isCount(counters.malformed) &&
    isCountMap(counters.dropped, isDropReason) &&
    isCountMap(counters.contentOmitted, isOmissionCode) &&
    isDeepStrictEqual(state.limits, { ...PRIVACY_LIMITS })
  );
}

async function readCapture(ctx, id) {
  if ((await capturesDirKind(ctx)) === "missing") throw new StoreError("capture_not_found");
  const dir = path.join(ctx.capturesDir, id);
  const kind = await entryKind(ctx.io, dir);
  if (kind === "missing") throw new StoreError("capture_not_found");
  if (kind === "link") throw new StoreError("link_refused");
  if (kind !== "dir") throw new StoreError("capture_invalid");
  const bytes = await readSmallFile(ctx.io, path.join(dir, STATE_FILE), MAX_STATE_BYTES, "capture_invalid");
  if (bytes === null) throw new StoreError("capture_invalid");
  let state;
  try {
    state = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new StoreError("capture_invalid");
  }
  if (!isValidState(state, id)) throw new StoreError("capture_invalid");
  return { dir, state };
}

// Temporário `wx` + `rename`: o state.json anterior continua íntegro até o
// rename, que é o ponto de commit. Falha → temporário (só controle) apagado.
async function writeStateAtomic(io, dir, state) {
  const tmp = path.join(dir, tempName(STATE_FILE));
  try {
    await io.writeExclusive(tmp, JSON.stringify(state));
    await io.rename(tmp, path.join(dir, STATE_FILE));
  } catch (error) {
    await io.unlink(tmp).catch(() => {});
    throw error;
  }
}

function publicCapture(state) {
  const { id, state: lifecycle, content, retentionDays, createdAt, endedAt, dataBytes, counters, limits } = state;
  const shown = { id, state: lifecycle, content, retentionDays, createdAt, endedAt, dataBytes, counters, limits };
  return state.origin === undefined ? shown : { ...shown, origin: state.origin };
}

// Marcador gravado sob o lock pela operação que adotou a pasta vazia.
async function initStore(ctx) {
  if (!ctx.needsInit) return;
  await ctx.io.writeExclusive(path.join(ctx.storeDir, STORE_FILE), STORE_MARKER);
  await assertUnchanged(ctx);
}

// Captura nova, já sob o lock: pasta, chave própria e o state.json, que é o
// commit. `origin` só existe nas criadas pela observação automática.
async function createCapture(ctx, { content, retentionDays, nowMs, origin }) {
  const { io } = ctx;
  await ensureCapturesDir(ctx);
  const id = randomBytes(16).toString("hex");
  const dir = path.join(ctx.capturesDir, id);
  await io.mkdir(dir);
  await io.writeExclusive(path.join(dir, KEY_FILE), randomBytes(KEY_BYTES));
  const state = {
    captureVersion: 1,
    id,
    state: "active",
    content,
    retentionDays,
    createdAt: new Date(nowMs).toISOString(),
    endedAt: null,
    dataFile: null,
    dataBytes: 0,
    counters: { accepted: 0, persisted: 0, malformed: 0, dropped: {}, contentOmitted: {} },
    limits: { ...PRIVACY_LIMITS },
    ...(origin === undefined ? {} : { origin }),
  };
  await writeStateAtomic(io, dir, state);
  return { dir, state };
}

export function startCapture({ root, content = false, retentionDays, nowMs = Date.now(), io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openStore(root, io, { create: true });
    return withLock(ctx, async () => {
      await initStore(ctx);
      const { state } = await createCapture(ctx, { content, retentionDays, nowMs });
      return { id: state.id, state: "active", content, retentionDays, createdAt: state.createdAt };
    });
  });
}

async function openExisting(root, io) {
  const ctx = await openStore(root, io);
  if (ctx === null) throw new StoreError("capture_not_found");
  return ctx;
}

// stop/disable: decisão em lifecycle.transition; aqui só leitura e commit.
export function changeCaptureState({ root, id, action, nowMs = Date.now(), io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openExisting(root, io);
    return withLock(ctx, async () => {
      const { dir, state } = await readCapture(ctx, id);
      const result = transition(state, action, new Date(nowMs).toISOString());
      if (!result.ok) throw new StoreError(result.code);
      if (result.changed) await writeStateAtomic(io, dir, result.capture);
      const { state: lifecycle, content, endedAt } = result.capture;
      return { capture: { id, state: lifecycle, content, endedAt }, changed: result.changed };
    });
  });
}

// Todo comando toma o lock, inclusive a leitura: no Windows um handle aberto
// faria o rename de um escritor concorrente falhar.
export function readCaptureStatus({ root, id, io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openExisting(root, io);
    return withLock(ctx, async () => publicCapture((await readCapture(ctx, id)).state));
  });
}

async function readCaptureKey(io, dir) {
  const key = await readSmallFile(io, path.join(dir, KEY_FILE), KEY_BYTES, "capture_invalid");
  if (key === null || key.length !== KEY_BYTES) throw new StoreError("capture_invalid");
  return key;
}

// Fase 1 do ingest: estado e chave lidos sob o lock e liberados antes do
// stdin (Landing "Ingest — fases"). A chave só sai deste módulo para a
// política, em memória; nunca para uma resposta. `onLock`: ver withLock (a
// entrega da #8 distingue assim uma tentativa cortada com ou sem o lock).
export function openCaptureForIngest({ root, id, io = createStoreIo(), onLock }) {
  return storeOp(async () => {
    const ctx = { ...(await openExisting(root, io)), onLock };
    return withLock(ctx, async () => {
      const { dir, state } = await readCapture(ctx, id);
      if (state.state !== "active") throw new StoreError("capture_not_active");
      const key = await readCaptureKey(io, dir);
      return { content: state.content, usage: { events: state.counters.persisted, bytes: state.dataBytes }, key };
    });
  });
}

// Registros da captura, como gravados: o segmento tem exatamente `dataBytes`
// e cada linha precisa ser um registro v1 com envelope válido.
async function readRecords(io, dir, state) {
  const records = [];
  if (state.dataFile === null) return records;
  const bytes = await readSmallFile(io, path.join(dir, state.dataFile), state.dataBytes, "capture_invalid");
  if (bytes === null || bytes.length !== state.dataBytes) throw new StoreError("capture_invalid");
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n")) throw new StoreError("capture_invalid");
  for (const line of text.slice(0, -1).split("\n")) {
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      throw new StoreError("capture_invalid");
    }
    if (!isStoredRecord(record)) throw new StoreError("capture_invalid");
    records.push(record);
  }
  return records;
}

export function exportCapture({ root, id, io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openExisting(root, io);
    return withLock(ctx, async () => {
      const { dir, state } = await readCapture(ctx, id);
      return { capture: publicCapture(state), records: await readRecords(io, dir, state) };
    });
  });
}

// O relatório precisa consultar capturas arquivadas sem criar .lock. A leitura
// confere estado e lock antes e depois do segmento; uma escrita concorrente
// que altere o snapshot é exposta como conflito, sem combinar versões.
async function assertSnapshotUnchanged(ctx, id, state, lockPath) {
  if ((await entryKind(ctx.io, lockPath)) !== "missing") throw new StoreError("lock_present");
  await assertUnchanged(ctx);
  const current = await readCapture(ctx, id);
  if (!isDeepStrictEqual(state, current.state)) throw new StoreError("lock_present");
}

export function readCaptureSnapshot({ root, id, io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openExisting(root, io);
    const lockPath = path.join(ctx.storeDir, LOCK_FILE);
    if ((await entryKind(io, lockPath)) !== "missing") throw new StoreError("lock_present");
    await assertUnchanged(ctx);
    const { dir, state } = await readCapture(ctx, id);
    let records;
    try {
      records = await readRecords(io, dir, state);
    } catch (error) {
      // O escritor troca o segmento depois de publicar state.json. Uma leitura
      // do nome anterior pode falhar; só preservamos a falha se o estado não mudou.
      await assertSnapshotUnchanged(ctx, id, state, lockPath);
      throw error;
    }
    await assertSnapshotUnchanged(ctx, id, state, lockPath);
    return { capture: publicCapture(state), records };
  });
}

// Sondagem do `privacy follow` (#8, crit. 7): estado sempre; segmento só
// quando há registros além dos `seen` já entregues. Os registros só crescem
// no fim do segmento, então os `seen` primeiros são os já entregues.
export function readCaptureSince({ root, id, seen, io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openExisting(root, io);
    return withLock(ctx, async () => {
      const { dir, state } = await readCapture(ctx, id);
      if (state.counters.persisted < seen) throw new StoreError("capture_invalid");
      if (state.counters.persisted === seen) return { capture: publicCapture(state), records: [] };
      const records = await readRecords(io, dir, state);
      if (records.length !== state.counters.persisted) throw new StoreError("capture_invalid");
      return { capture: publicCapture(state), records: records.slice(seen) };
    });
  });
}

export const LIST_PAGE_SIZE = 100;

const byCreation = (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// `privacy list` (#8, crit. 5): página de capturas por `createdAt`,`id`,
// continuando depois de `after`. Sem a pasta do store a lista é vazia (nada é
// criado). Pasta em exclusão e nomes alheios ficam fora; uma captura ilegível
// impede a ordem da página inteira e aparece em `failed`, como no prune.
export function listCaptures({ root, after = null, io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openStore(root, io);
    const read = async () => {
      if (ctx === null || (await capturesDirKind(ctx)) === "missing") return { states: [], failed: [] };
      const states = [];
      const failed = [];
      for (const name of (await io.readdir(ctx.capturesDir)).sort()) {
        if (!CAPTURE_ID_PATTERN.test(name)) continue;
        try {
          states.push((await readCapture(ctx, name)).state);
        } catch (error) {
          if (!(error instanceof StoreError)) throw error;
          failed.push({ capture: name, code: error.code });
        }
      }
      return { states, failed };
    };
    const { states, failed } = ctx === null ? await read() : await withLock(ctx, read);
    if (failed.length > 0) return { captures: [], nextAfter: null, failed };
    states.sort(byCreation);
    let start = 0;
    if (after !== null) {
      start = states.findIndex((state) => state.id === after) + 1;
      if (start === 0) throw new StoreError("capture_not_found");
    }
    const page = states.slice(start, start + LIST_PAGE_SIZE);
    const nextAfter = start + LIST_PAGE_SIZE < states.length ? page.at(-1).id : null;
    return { captures: page.map(publicCapture), nextAfter, failed };
  });
}

const RECORD_KEYS = ["content", "envelope", "privacy", "recordVersion"];

function isStoredRecord(record) {
  return (
    record !== null &&
    typeof record === "object" &&
    !Array.isArray(record) &&
    isDeepStrictEqual(Object.keys(record).sort(), RECORD_KEYS) &&
    record.recordVersion === 1 &&
    Array.isArray(record.privacy) &&
    validateEnvelope(record.envelope)
  );
}

function addCounts(target, source) {
  const out = { ...target };
  for (const [key, count] of Object.entries(source)) out[key] = (out[key] ?? 0) + count;
  return out;
}

function assertBatch(batch) {
  const { records, malformed, dropped, contentOmitted } = batch ?? {};
  if (!Array.isArray(records)) throw new TypeError("records");
  for (const record of records) {
    if (record === null || typeof record !== "object" || Array.isArray(record) || record.recordVersion !== 1) throw new TypeError("record");
  }
  if (!isCount(malformed) || !isCountMap(dropped, isDropReason) || !isCountMap(contentOmitted, isOmissionCode)) throw new TypeError("counters");
}

const dataFileName = (sequence) => `events-${String(sequence).padStart(6, "0")}.ndjson`;

// Consumidores: o futuro `privacy ingest` e a #8, sempre com registros que
// saíram de applyPolicy. O storage não sanitiza nem deriva contadores do
// conteúdo: soma os do chamador e decide só a admissão por limite. O arquivo
// de dados é reescrito inteiro num novo segmento (anterior + admitidos) e o
// state.json é o commit; o segmento anterior sai depois. `onLock`: ver
// openCaptureForIngest.
export async function appendRecords({ root, id, batch, io = createStoreIo(), onLock }) {
  assertBatch(batch);
  const lines = batch.records.map((record) => JSON.stringify(record) + "\n");
  return storeOp(async () => {
    const ctx = { ...(await openExisting(root, io)), onLock };
    return withLock(ctx, async () => {
      const { dir, state } = await readCapture(ctx, id);
      if (state.state !== "active") throw new StoreError("capture_not_active");
      const { admitted, dropped } = await commitBatch(ctx, dir, state, batch, lines);
      return { admitted, dropped };
    });
  });
}

// Commit de um lote numa captura ativa já lida sob o lock (appendRecords e a
// observação automática); `lines` são os registros já serializados.
async function commitBatch(ctx, dir, state, batch, lines) {
  const { io } = ctx;
  const admission = admitLines(
    { events: state.counters.persisted, bytes: state.dataBytes },
    lines.map((line) => Buffer.byteLength(line)),
  );
  const next = {
    ...state,
    counters: {
      accepted: state.counters.accepted + lines.length,
      persisted: state.counters.persisted + admission.admitted,
      malformed: state.counters.malformed + batch.malformed,
      dropped: addCounts(addCounts(state.counters.dropped, batch.dropped), admission.dropped),
      contentOmitted: addCounts(state.counters.contentOmitted, batch.contentOmitted),
    },
  };
  let written = null;
  if (admission.admitted > 0) {
    // O segmento anterior tem exatamente `dataBytes`: maior, menor ou não
    // regular, ele não é o que o commit registrou.
    const previous =
      state.dataFile === null ? Buffer.alloc(0) : await readSmallFile(io, path.join(dir, state.dataFile), state.dataBytes, "capture_invalid");
    if (previous === null || previous.length !== state.dataBytes) throw new StoreError("capture_invalid");
    const sequence = state.dataFile === null ? 1 : Number(DATA_FILE_PATTERN.exec(state.dataFile)[1]) + 1;
    const added = Buffer.from(lines.slice(0, admission.admitted).join(""));
    written = dataFileName(sequence);
    const tmp = path.join(dir, tempName(written));
    try {
      await io.writeExclusive(tmp, Buffer.concat([previous, added]));
      await io.rename(tmp, path.join(dir, written));
    } catch (error) {
      await io.unlink(tmp).catch(() => {});
      throw error;
    }
    next.dataFile = written;
    next.dataBytes = previous.length + added.length;
  }
  try {
    await writeStateAtomic(io, dir, next);
  } catch (error) {
    if (written !== null) await io.unlink(path.join(dir, written)).catch(() => {});
    throw error;
  }
  // Sobra do segmento anterior não desfaz o commit: só tem registros
  // sanitizados, pertence ao conjunto literal e sai no delete.
  if (written !== null && state.dataFile !== null) await io.unlink(path.join(dir, state.dataFile)).catch(() => {});
  return { admitted: admission.admitted, dropped: admission.dropped, state: next };
}

const ENTRY_ORDER = [(name) => TEMP_PATTERN.test(name), (name) => DATA_FILE_PATTERN.test(name), (name) => name === KEY_FILE, (name) => name === STATE_FILE];
const entryRank = (name) => ENTRY_ORDER.findIndex((matches) => matches(name));

// Só arquivos regulares do conjunto literal; link/junção ou qualquer outra
// coisa recusa a exclusão inteira antes de apagar algo.
async function inspectEntries(io, dir) {
  const names = (await io.readdir(dir)).sort();
  for (const name of names) {
    const kind = await entryKind(io, path.join(dir, name));
    if (kind === "link") throw new StoreError("link_refused");
    if (kind !== "file" || entryRank(name) === -1) throw new StoreError("foreign_entry");
  }
  return names;
}

// Alvo da exclusão: a pasta em exclusão (retomada) ou a captura encerrada.
// As duas juntas não saem do fluxo do produto (o rename tira `<id>`): nenhuma
// é escolhida nem lida, só os nomes passam por lstat. Linha "Pasta em
// exclusão coexistindo com a captura" do Landing.
async function deletionTarget(ctx, id) {
  if ((await capturesDirKind(ctx)) === "missing") throw new StoreError("capture_not_found");
  const deleting = path.join(ctx.capturesDir, DELETING_PREFIX + id);
  const kind = await entryKind(ctx.io, deleting);
  if (kind === "link") throw new StoreError("link_refused");
  if (kind === "dir") {
    if ((await entryKind(ctx.io, path.join(ctx.capturesDir, id))) !== "missing") throw new StoreError("foreign_entry");
    return { dir: deleting, resumed: true };
  }
  if (kind !== "missing") throw new StoreError("foreign_entry");
  const { dir, state } = await readCapture(ctx, id);
  if (state.state === "active") throw new StoreError("capture_active");
  return { dir, resumed: false };
}

// Barreira: o rename para `.deleting-<id>` vem antes de qualquer unlink, então
// um produtor atrasado não encontra mais `captures/<id>` e nada o recria.
async function removeCapture(ctx, id, target) {
  const { io } = ctx;
  let dir = target.dir;
  if (!target.resumed) {
    await assertUnchanged(ctx);
    const deleting = path.join(ctx.capturesDir, DELETING_PREFIX + id);
    await io.rename(dir, deleting);
    dir = deleting;
  }
  try {
    const names = await inspectEntries(io, dir);
    names.sort((a, b) => entryRank(a) - entryRank(b) || a.localeCompare(b));
    for (const name of names) await io.unlink(path.join(dir, name));
    await io.rmdir(dir);
  } catch (error) {
    if (error instanceof StoreError) throw error;
    throw new StoreError("partial_delete");
  }
}

export function deleteCapture({ root, id, apply = false, io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openExisting(root, io);
    return withLock(ctx, async () => {
      const target = await deletionTarget(ctx, id);
      const entries = await inspectEntries(io, target.dir);
      if (!apply) return { applied: false, entries };
      await removeCapture(ctx, id, target);
      return { applied: true, deleted: true };
    });
  });
}

const DELETING_PATTERN = new RegExp(`^${DELETING_PREFIX.replace(".", "\\.")}([0-9a-f]{32})$`);

// Seleção da retenção: encerradas vencidas (lifecycle.isExpired) e exclusões
// interrompidas. Nomes alheios em captures/ são ignorados e preservados; uma
// captura ilegível aparece em `failed`, nunca é apagada às cegas.
export function pruneCaptures({ root, apply = false, nowMs = Date.now(), io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openStore(root, io);
    const empty = { selected: [], deleted: [], failed: [] };
    if (ctx === null) return empty;
    return withLock(ctx, async () => {
      if ((await capturesDirKind(ctx)) === "missing") return empty;
      const selected = new Set();
      const failed = [];
      for (const name of (await io.readdir(ctx.capturesDir)).sort()) {
        const resumed = DELETING_PATTERN.exec(name);
        if (resumed) {
          selected.add(resumed[1]);
          continue;
        }
        if (!CAPTURE_ID_PATTERN.test(name) || selected.has(name)) continue;
        try {
          if (isExpired((await readCapture(ctx, name)).state, nowMs)) selected.add(name);
        } catch (error) {
          if (!(error instanceof StoreError)) throw error;
          failed.push({ capture: name, code: error.code });
        }
      }
      const deleted = [];
      for (const id of [...selected].sort()) {
        try {
          const target = await deletionTarget(ctx, id);
          await inspectEntries(io, target.dir);
          if (!apply) continue;
          await removeCapture(ctx, id, target);
          deleted.push(id);
        } catch (error) {
          if (!(error instanceof StoreError)) throw error;
          failed.push({ capture: id, code: error.code });
        }
      }
      return { selected: [...selected].sort(), deleted, failed };
    });
  });
}

// Observação automática (issue #23). O observe.json fica na pasta do store e
// só muda sob o lock, junto com as capturas que ele autoriza: linhas "Estado da
// observação", "Captura automática" e "Barreira do off" do Landing em
// .checks/issue-23-observacao-on-off.md. `expectedReal` é o caminho real
// gravado no setup (openStore).

async function readObservationFile(ctx) {
  const bytes = await readSmallFile(ctx.io, path.join(ctx.storeDir, OBSERVE_FILE), MAX_OBSERVE_BYTES, "store_invalid");
  if (bytes === null) return null;
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new StoreError("store_invalid");
  }
  if (!isValidObservation(value)) throw new StoreError("store_invalid");
  return value;
}

async function writeObservationFile(ctx, observation) {
  const tmp = path.join(ctx.storeDir, tempName(OBSERVE_FILE));
  try {
    await ctx.io.writeExclusive(tmp, JSON.stringify(observation));
    await ctx.io.rename(tmp, path.join(ctx.storeDir, OBSERVE_FILE));
  } catch (error) {
    await ctx.io.unlink(tmp).catch(() => {});
    throw error;
  }
}

// Capturas `origin: automatic` legíveis, por criação; as ilegíveis vão para
// `failed`, como no list.
async function automaticCaptures(ctx) {
  if ((await capturesDirKind(ctx)) === "missing") return { found: [], failed: [] };
  const found = [];
  const failed = [];
  for (const name of (await ctx.io.readdir(ctx.capturesDir)).sort()) {
    if (!CAPTURE_ID_PATTERN.test(name)) continue;
    try {
      const capture = await readCapture(ctx, name);
      if (capture.state.origin === AUTOMATIC_ORIGIN) found.push(capture);
    } catch (error) {
      if (!(error instanceof StoreError)) throw error;
      failed.push({ capture: name, code: error.code });
    }
  }
  found.sort((a, b) => byCreation(a.state, b.state));
  return { found, failed };
}

const stopCapture = (ctx, { dir, state }, nowIso) => writeStateAtomic(ctx.io, dir, transition(state, "stop", nowIso).capture);

// on/off. Só o `on` cria a pasta do store; `off` sem store não tem o que
// desligar. Depois de gravar off, encerra toda captura automática ativa —
// também as de um off anterior interrompido —, e a retenção delas começa.
export function changeObservation({ root, expectedReal, action, nowMs = Date.now(), io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openStore(root, io, { create: action === "on", expectedReal });
    if (ctx === null) return { observation: null, changed: false, stopped: [], failed: [] };
    return withLock(ctx, async () => {
      await initStore(ctx);
      const nowIso = new Date(nowMs).toISOString();
      const fresh = { nowIso, generation: randomBytes(16).toString("hex"), sessionKey: randomBytes(32).toString("hex") };
      const { next, changed } = switchObservation(await readObservationFile(ctx), action, fresh);
      if (changed) await writeObservationFile(ctx, next);
      if (action === "on") return { observation: next, changed, stopped: [], failed: [] };
      const { found, failed } = await automaticCaptures(ctx);
      const stopped = [];
      for (const capture of found) {
        if (capture.state.state !== "active") continue;
        await stopCapture(ctx, capture, nowIso);
        stopped.push(capture.state.id);
      }
      return { observation: next, changed, stopped, failed };
    });
  });
}

// `status`: estado e capturas automáticas, sob o lock como as demais leituras.
export function readObservation({ root, expectedReal, io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openStore(root, io, { expectedReal });
    if (ctx === null) return { observation: null, captures: [], failed: [] };
    return withLock(ctx, async () => {
      const observation = await readObservationFile(ctx);
      const { found, failed } = await automaticCaptures(ctx);
      return { observation, captures: found.map(({ state }) => publicCapture(state)), failed };
    });
  });
}

// Abertura do produtor automático: a geração vigente, que ele não troca
// depois. `onLock`: ver withLock.
export function openObservation({ root, expectedReal, io = createStoreIo(), onLock }) {
  return storeOp(async () => {
    const opened = await openStore(root, io, { expectedReal });
    if (opened === null) return { state: "off", generation: null };
    const ctx = { ...opened, onLock };
    return withLock(ctx, async () => {
      const observation = await readObservationFile(ctx);
      return observation?.state === "on" ? { state: "on", generation: observation.generation } : { state: "off", generation: null };
    });
  });
}

async function activeCapture(ctx, id) {
  try {
    const capture = await readCapture(ctx, id);
    return capture.state.state === "active" ? capture : null;
  } catch (error) {
    if (error instanceof StoreError && error.code === "capture_not_found") return null;
    throw error;
  }
}

// Gravação automática de entradas de uma sessão numa só tomada do lock: confere
// a geração do produtor, escolhe ou cria a captura da sessão e chama `produce`
// — a política, fora deste módulo — com a chave e o uso dela. `produce(capture,
// pendentes)` devolve o lote e quantas entradas iniciais ele consumiu; as que
// não couberam vão para a sucessora, criada depois de encerrar a cheia, com a
// política reaplicada com a chave nova. Captura encerrada ou excluída à mão
// também é sucedida: o `on` continua valendo até o `off`. `entries` é opaco.
export function appendAutomatic({ root, expectedReal, generation, session, entries, produce, nowMs = Date.now(), io = createStoreIo(), onLock }) {
  return storeOp(async () => {
    const opened = await openStore(root, io, { expectedReal });
    if (opened === null) throw new StoreError("observe_off");
    const ctx = { ...opened, onLock };
    return withLock(ctx, async () => {
      let observation = await readObservationFile(ctx);
      if (!isCurrentGeneration(observation, generation)) throw new StoreError("observe_off");
      const tag = sessionTag(observation.sessionKey, session);
      const nowIso = new Date(nowMs).toISOString();
      let target = observation.sessions[tag] === undefined ? null : await activeCapture(ctx, observation.sessions[tag]);
      let pending = entries;
      let committed = 0;
      let persisted = 0;
      while (pending.length > 0) {
        let created = false;
        if (target === null) {
          target = await createCapture(ctx, { content: true, retentionDays: DEFAULT_RETENTION_DAYS, nowMs, origin: AUTOMATIC_ORIGIN });
          created = true;
          observation = assignSession(observation, tag, target.state.id);
          await writeObservationFile(ctx, observation);
        }
        const usage = { events: target.state.counters.persisted, bytes: target.state.dataBytes };
        const { batch, consumed } = produce({ key: await readCaptureKey(ctx.io, target.dir), content: target.state.content, usage }, pending);
        assertBatch(batch);
        // Uma captura recém-criada sempre consome (o limite nela é descarte);
        // sem isso o laço criaria capturas vazias sob o lock indefinidamente.
        if (consumed === 0 && created) throw new StoreError("io_failure");
        if (consumed > 0) {
          const lines = batch.records.map((record) => JSON.stringify(record) + "\n");
          const appended = await commitBatch(ctx, target.dir, target.state, batch, lines);
          target = { dir: target.dir, state: appended.state };
          persisted += appended.admitted;
          committed += consumed;
          pending = pending.slice(consumed);
        }
        if (pending.length > 0) {
          await stopCapture(ctx, target, nowIso);
          target = null;
        }
      }
      return { committed, persisted };
    });
  });
}

// `report --latest`: a captura automática mais recente, sem criar lock. Como em
// readCaptureSnapshot, o lock ausente e a raiz são conferidos antes e depois da
// leitura; uma captura ilegível impede a escolha, como no list.
export function latestAutomaticCapture({ root, expectedReal, io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openStore(root, io, { expectedReal });
    if (ctx === null) throw new StoreError("no_automatic_capture");
    const lockPath = path.join(ctx.storeDir, LOCK_FILE);
    const assertQuiet = async () => {
      if ((await entryKind(io, lockPath)) !== "missing") throw new StoreError("lock_present");
      await assertUnchanged(ctx);
    };
    await assertQuiet();
    const { found, failed } = await automaticCaptures(ctx);
    await assertQuiet();
    if (failed.length > 0) throw new StoreError(failed[0].code);
    if (found.length === 0) throw new StoreError("no_automatic_capture");
    return found.at(-1).state.id;
  });
}
