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
// Temporário do marcador durante a publicação (initStore), na pasta do store.
const MARKER_TEMP_PATTERN = /^store\.json\.[0-9a-f]{8}\.skill-me-tmp$/;
// state.json tem forma fechada e pequena; um arquivo maior não é nosso.
const MAX_STATE_BYTES = 64 * 1024;
// Estado da observação automática (#23), ao lado do marcador do store. O teto
// cobre o mapa cheio (MAX_SESSIONS entradas de ~100 bytes).
const OBSERVE_FILE = "observe.json";
const MAX_OBSERVE_BYTES = 256 * 1024;
export const AUTOMATIC_ORIGIN = "automatic";
// Execução de `skill-me <agente>` (issue #25): capturas sucessivas com
// `invocation` e `segment`, e o ponteiro da execução aberta em `launches/`
// (linhas "Ponteiro da execução aberta" e "Captura da execução" do Landing em
// .checks/issue-25-agent-launch.md).
export const LAUNCH_ORIGIN = "launch";
const LAUNCHES_DIR = "launches";
const LAUNCH_VERSION = 1;
const MAX_LAUNCH_BYTES = 1024;

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

// Abre a pasta do store da raiz. Só `start`, o `on` da observação e a abertura
// do launcher (create) criam a pasta; os demais recebem null quando ela não
// existe. O marcador é imutável depois de publicado, então é conferido antes do
// lock: uma pasta alheia com o mesmo nome nunca recebe o nosso lock.
// `expectedReal` (observação automática, #23): o caminho real gravado no setup;
// outro destino é `root_changed`, e `withLock` mantém a conferência até o fim
// da operação.
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
  let needsInit = false;
  if (create) needsInit = await needsAdoption(io, storeDir);
  else if (!(await readMarker(io, storeDir))) throw new StoreError("store_invalid");
  return { io, rootArg, rootReal, storeDir, capturesDir: path.join(storeDir, CAPTURES_DIR), needsInit };
}

// true com o marcador exato, false sem ele; outro conteúdo é store_invalid.
async function readMarker(io, storeDir) {
  const marker = await readSmallFile(io, path.join(storeDir, STORE_FILE), STORE_MARKER.length, "store_invalid");
  if (marker === null) return false;
  if (marker.toString("utf8") !== STORE_MARKER) throw new StoreError("store_invalid");
  return true;
}

// Quem cria lista a pasta antes de ler o marcador (linha "Primeira criação
// concorrente do store" do Landing da #25): duas primeiras aberturas na mesma
// raiz criam o store juntas, e quem lia o marcador e depois listava a pasta
// encontrava a criação da outra pela metade. Como initStore publica o marcador
// por rename, um `store.json` listado já está inteiro; ausente na listagem, a
// decisão final é sob o lock. Sem marcador, a pasta é adotável vazia, só com o
// `.lock`, ou com o temporário do marcador junto do `.lock` — outra criação em
// curso, sob o lock dela, que esta abertura vai encontrar (`lock_present`).
// Qualquer outra entrada é store_invalid, antes do lock.
async function needsAdoption(io, storeDir) {
  const names = await io.readdir(storeDir);
  if (names.includes(STORE_FILE)) {
    if (!(await readMarker(io, storeDir))) throw new StoreError("store_invalid");
    return false;
  }
  const creating = names.includes(LOCK_FILE);
  if (names.some((name) => name !== LOCK_FILE && !(creating && MARKER_TEMP_PATTERN.test(name)))) throw new StoreError("store_invalid");
  return true;
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
// A do launcher traz também a execução, o número da captura nela e o início
// da execução (#25; `launchedAt` na linha "Início da execução" do Landing).
const LAUNCH_STATE_KEYS = [...STATE_KEYS, "invocation", "launchedAt", "origin", "segment"].sort();
const COUNTER_KEYS = ["accepted", "contentOmitted", "dropped", "malformed", "persisted"];

const isSegment = (value) => Number.isSafeInteger(value) && value >= 1;
const isLaunchId = (value) => typeof value === "string" && CAPTURE_ID_PATTERN.test(value);

function hasKnownOrigin(state, keys) {
  if (isDeepStrictEqual(keys, STATE_KEYS)) return true;
  if (isDeepStrictEqual(keys, AUTOMATIC_STATE_KEYS)) return state.origin === AUTOMATIC_ORIGIN;
  return (
    isDeepStrictEqual(keys, LAUNCH_STATE_KEYS) &&
    state.origin === LAUNCH_ORIGIN &&
    isLaunchId(state.invocation) &&
    isSegment(state.segment) &&
    isIso(state.launchedAt)
  );
}

function isValidState(state, id) {
  if (state === null || typeof state !== "object" || Array.isArray(state)) return false;
  if (!hasKnownOrigin(state, Object.keys(state).sort())) return false;
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
  if (state.origin === undefined) return shown;
  if (state.origin === LAUNCH_ORIGIN) {
    return { ...shown, origin: state.origin, invocation: state.invocation, segment: state.segment, launchedAt: state.launchedAt };
  }
  return { ...shown, origin: state.origin };
}

// Marcador publicado sob o lock pela operação que adotou a pasta. Outra criação
// pode tê-lo publicado entre a listagem (needsAdoption) e este lock: presente,
// ele vale e nada é regravado. Ausente, a pasta só pode ter o nosso `.lock`, e
// o marcador nasce por temporário + rename, como o state.json: nunca existe
// pela metade para quem o lê sem o lock.
async function initStore(ctx) {
  if (!ctx.needsInit) return;
  const { io, storeDir } = ctx;
  if (await readMarker(io, storeDir)) return;
  if ((await io.readdir(storeDir)).some((name) => name !== LOCK_FILE)) throw new StoreError("store_invalid");
  const tmp = path.join(storeDir, tempName(STORE_FILE));
  try {
    await io.writeExclusive(tmp, STORE_MARKER);
    await io.rename(tmp, path.join(storeDir, STORE_FILE));
  } catch (error) {
    await io.unlink(tmp).catch(() => {});
    throw error;
  }
  await assertUnchanged(ctx);
}

// Captura nova, já sob o lock: pasta, chave própria e o state.json, que é o
// commit. `origin` só existe nas criadas pela observação automática ou pelo
// launcher; `launch` ({invocation, segment, launchedAt}) só nas do launcher.
async function createCapture(ctx, { content, retentionDays, nowMs, origin, launch }) {
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
    ...(launch === undefined ? {} : { invocation: launch.invocation, segment: launch.segment, launchedAt: launch.launchedAt }),
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

// Capturas legíveis de uma origem (`automatic` da #23, `launch` da #25), por
// criação; as ilegíveis vão para `failed`, como no list.
async function capturesOfOrigin(ctx, origin) {
  if ((await capturesDirKind(ctx)) === "missing") return { found: [], failed: [] };
  const found = [];
  const failed = [];
  for (const name of (await ctx.io.readdir(ctx.capturesDir)).sort()) {
    if (!CAPTURE_ID_PATTERN.test(name)) continue;
    try {
      const capture = await readCapture(ctx, name);
      if (capture.state.origin === origin) found.push(capture);
    } catch (error) {
      if (!(error instanceof StoreError)) throw error;
      failed.push({ capture: name, code: error.code });
    }
  }
  found.sort((a, b) => byCreation(a.state, b.state));
  return { found, failed };
}

// Devolve o estado gravado: o resumo do encerramento sai dele, sem reler.
async function stopCapture(ctx, { dir, state }, nowIso) {
  const stopped = transition(state, "stop", nowIso).capture;
  await writeStateAtomic(ctx.io, dir, stopped);
  return stopped;
}

// on/off. Só o `on` cria a pasta do store; `off` sem store não tem o que
// desligar. Depois de gravar off, encerra toda captura automática ativa —
// também as de um off anterior interrompido —, e a retenção delas começa.
// `authorization` (linha "Registro da autorização" do Landing da #23): o
// registro da raiz on, fora deste módulo, que só muda sob este lock — `claim`
// antes de gravar on (mesmo repetido), `release` depois do off concluído.
export function changeObservation({ root, expectedReal, action, nowMs = Date.now(), io = createStoreIo(), authorization = null }) {
  return storeOp(async () => {
    const ctx = await openStore(root, io, { create: action === "on", expectedReal });
    if (ctx === null) return { observation: null, changed: false, stopped: [], failed: [] };
    return withLock(ctx, async () => {
      await initStore(ctx);
      const nowIso = new Date(nowMs).toISOString();
      const fresh = { nowIso, generation: randomBytes(16).toString("hex"), sessionKey: randomBytes(32).toString("hex") };
      const { next, changed } = switchObservation(await readObservationFile(ctx), action, fresh);
      if (action === "on") await authorization?.claim();
      if (changed) await writeObservationFile(ctx, next);
      if (action === "on") return { observation: next, changed, stopped: [], failed: [] };
      const { found, failed } = await capturesOfOrigin(ctx, AUTOMATIC_ORIGIN);
      const stopped = [];
      for (const capture of found) {
        if (capture.state.state !== "active") continue;
        await stopCapture(ctx, capture, nowIso);
        stopped.push(capture.state.id);
      }
      await authorization?.release();
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
      const { found, failed } = await capturesOfOrigin(ctx, AUTOMATIC_ORIGIN);
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

// Sucessão por limite, numa tomada do lock já obtida: a regra da observação
// automática (#23), reusada pela execução do launcher (#25, linha "Sucessão"
// do Landing). `produce(capture, pendentes)` — a política, fora deste módulo —
// devolve o lote e quantas entradas iniciais consumiu com a chave e o uso da
// captura; as que não couberam vão para a sucessora, que `succeed()` cria (e
// registra no índice de quem chama) depois de encerrar a cheia, com a política
// reaplicada com a chave nova. `target` null: não há corrente ativa — também
// quando foi encerrada ou excluída à mão — e a primeira entrada já abre a
// sucessora. `entries` é opaco.
async function appendWithSuccession(ctx, { target, entries, produce, nowIso, succeed }) {
  let current = target;
  let pending = entries;
  let committed = 0;
  let persisted = 0;
  while (pending.length > 0) {
    let created = false;
    if (current === null) {
      current = await succeed();
      created = true;
    }
    const usage = { events: current.state.counters.persisted, bytes: current.state.dataBytes };
    const { batch, consumed } = produce({ key: await readCaptureKey(ctx.io, current.dir), content: current.state.content, usage }, pending);
    assertBatch(batch);
    // Uma captura recém-criada sempre consome (o limite nela é descarte);
    // sem isso o laço criaria capturas vazias sob o lock indefinidamente.
    if (consumed === 0 && created) throw new StoreError("io_failure");
    if (consumed > 0) {
      const lines = batch.records.map((record) => JSON.stringify(record) + "\n");
      const appended = await commitBatch(ctx, current.dir, current.state, batch, lines);
      current = { dir: current.dir, state: appended.state };
      persisted += appended.admitted;
      committed += consumed;
      pending = pending.slice(consumed);
    }
    if (pending.length > 0) {
      await stopCapture(ctx, current, nowIso);
      current = null;
    }
  }
  return { committed, persisted };
}

// Gravação automática de entradas de uma sessão numa só tomada do lock: confere
// a geração do produtor e grava na captura da sessão pela sucessão comum. A
// captura encerrada ou excluída à mão também é sucedida: o `on` continua
// valendo até o `off`.
export function appendAutomatic({ root, expectedReal, generation, session, entries, produce, nowMs = Date.now(), io = createStoreIo(), onLock }) {
  return storeOp(async () => {
    const opened = await openStore(root, io, { expectedReal });
    if (opened === null) throw new StoreError("observe_off");
    const ctx = { ...opened, onLock };
    return withLock(ctx, async () => {
      let observation = await readObservationFile(ctx);
      if (!isCurrentGeneration(observation, generation)) throw new StoreError("observe_off");
      const tag = sessionTag(observation.sessionKey, session);
      const target = observation.sessions[tag] === undefined ? null : await activeCapture(ctx, observation.sessions[tag]);
      return appendWithSuccession(ctx, {
        target,
        entries,
        produce,
        nowIso: new Date(nowMs).toISOString(),
        succeed: async () => {
          const created = await createCapture(ctx, { content: true, retentionDays: DEFAULT_RETENTION_DAYS, nowMs, origin: AUTOMATIC_ORIGIN });
          observation = assignSession(observation, tag, created.state.id);
          await writeObservationFile(ctx, observation);
          return created;
        },
      });
    });
  });
}

// Execução de `skill-me <agente>` (issue #25). O ponteiro em
// `launches/<invocation>.json` aponta a captura corrente e só existe enquanto
// a execução recebe registros; muda só sob o lock da raiz (linhas "Ponteiro da
// execução aberta", "Início da execução" e "Ordem e falha do encerramento" do
// Landing em .checks/issue-25-agent-launch.md).

const LAUNCH_KEYS = ["capture", "invocation", "launchVersion", "launchedAt", "segment"];
const launchesDir = (ctx) => path.join(ctx.storeDir, LAUNCHES_DIR);
const launchFile = (ctx, invocation) => path.join(launchesDir(ctx), `${invocation}.json`);

function isValidLaunch(value, invocation) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    isDeepStrictEqual(Object.keys(value).sort(), LAUNCH_KEYS) &&
    value.launchVersion === LAUNCH_VERSION &&
    value.invocation === invocation &&
    isLaunchId(value.capture) &&
    isSegment(value.segment) &&
    isIso(value.launchedAt)
  );
}

async function launchesDirKind(ctx) {
  const kind = await entryKind(ctx.io, launchesDir(ctx));
  if (kind === "link") throw new StoreError("link_refused");
  if (kind !== "dir" && kind !== "missing") throw new StoreError("store_invalid");
  return kind;
}

// null: a execução foi encerrada, ou nunca existiu nesta raiz.
async function readLaunchFile(ctx, invocation) {
  if ((await launchesDirKind(ctx)) === "missing") return null;
  const bytes = await readSmallFile(ctx.io, launchFile(ctx, invocation), MAX_LAUNCH_BYTES, "store_invalid");
  if (bytes === null) return null;
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new StoreError("store_invalid");
  }
  if (!isValidLaunch(value, invocation)) throw new StoreError("store_invalid");
  return value;
}

async function writeLaunchFile(ctx, launch) {
  if ((await launchesDirKind(ctx)) === "missing") await ctx.io.mkdir(launchesDir(ctx));
  const tmp = path.join(launchesDir(ctx), tempName(`${launch.invocation}.json`));
  try {
    await ctx.io.writeExclusive(tmp, JSON.stringify(launch));
    await ctx.io.rename(tmp, launchFile(ctx, launch.invocation));
  } catch (error) {
    await ctx.io.unlink(tmp).catch(() => {});
    throw error;
  }
}

const launchSegment = (ctx, { invocation, segment, launchedAt, nowMs }) =>
  createCapture(ctx, { content: true, retentionDays: DEFAULT_RETENTION_DAYS, nowMs, origin: LAUNCH_ORIGIN, launch: { invocation, segment, launchedAt } });

// Falha de E/S com a captura que ficou `active` por causa dela: quem chama
// precisa dizer qual é e como encerrá-la (storeOp preserva o StoreError).
const leftActive = (error, fields) => Object.assign(error instanceof StoreError ? error : new StoreError("io_failure"), fields);

// Abre a execução antes do agente (crit. 15): o segmento 1 e o ponteiro na
// mesma tomada do lock. Sem o ponteiro a execução não existe, então a captura
// criada não fica `active`; se nem pará-la der certo, o erro diz qual ficou
// (task 33; linha "Sucessora não publicada" do Landing). Com captura e ponteiro
// gravados, só a liberação do lock pode falhar: a execução já existe, e o erro
// leva a identidade dela (`opened`) e o lock.
export function startLaunch({ root, expectedReal, nowMs = Date.now(), io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openStore(root, io, { create: true, expectedReal });
    return keepingResult(
      ctx,
      async () => {
        await initStore(ctx);
        const invocation = randomBytes(16).toString("hex");
        const launchedAt = new Date(nowMs).toISOString();
        const first = await launchSegment(ctx, { invocation, segment: 1, launchedAt, nowMs });
        try {
          await writeLaunchFile(ctx, { launchVersion: LAUNCH_VERSION, invocation, capture: first.state.id, segment: 1, launchedAt });
        } catch (error) {
          try {
            await stopCapture(ctx, first, launchedAt);
          } catch {
            throw leftActive(error, { capture: first.state.id, orphan: true });
          }
          throw error;
        }
        return { invocation, capture: first.state.id, launchedAt };
      },
      (opened) => ({ ...opened, opened: true }),
    );
  });
}

// Liberação do lock que falha depois de o callback terminar (task 35; linha
// "Lock após a abertura" do Landing): holdLockFile lança a falha e o resultado
// já gravado se perderia. `describe(resultado)` diz o que vai no erro, com o
// lock: `lockLeft` quando a falha foi de E/S e o lock gravado aqui pode ter
// ficado; um lock ausente ou com outros bytes (`StoreError`) não é desta
// operação. Uma falha do próprio callback continua a que sai, sem resultado.
async function keepingResult(ctx, fn, describe) {
  let done = null;
  try {
    return await withLock(ctx, async () => (done = { result: await fn() }).result);
  } catch (error) {
    if (done === null) throw error;
    throw leftActive(error, { ...describe(done.result), lockPath: path.join(ctx.storeDir, LOCK_FILE), lockLeft: !(error instanceof StoreError) });
  }
}

// Captura seguinte da execução, ainda sem publicar (task 33; linha "Sucessora
// não publicada" do Landing). Uma sucessora criada numa tomada anterior cujo
// ponteiro não chegou a ser gravado está `active` com `segment` maior que o do
// ponteiro: ela é a seguinte, e nenhuma outra recebe o número dela. Senão,
// nasce uma nova com o maior número já visto na execução + 1. Só roda quando a
// corrente não está ativa — no limite ou depois de um encerramento à mão.
async function nextLaunchSegment(ctx, launch, nowMs) {
  const known = await launchCaptures(ctx, launch.invocation);
  const unpublished = known.filter((state) => state.state === "active" && state.segment > launch.segment).at(-1);
  if (unpublished !== undefined) {
    return { capture: { dir: path.join(ctx.capturesDir, unpublished.id), state: unpublished }, segment: unpublished.segment };
  }
  const segment = Math.max(launch.segment, ...known.map((state) => state.segment)) + 1;
  return { capture: await launchSegment(ctx, { invocation: launch.invocation, segment, launchedAt: launch.launchedAt, nowMs }), segment };
}

// Gravação de um produtor da execução (crit. 17 e 19): sem ponteiro, a
// execução acabou (`launch_ended`) e nada é gravado. A corrente que não
// comporta o próximo registro — ou que não está mais ativa — é sucedida pela
// regra comum, e o ponteiro passa à sucessora na mesma tomada do lock.
export function appendLaunch({ root, expectedReal, invocation, entries, produce, nowMs = Date.now(), io = createStoreIo(), onLock }) {
  return storeOp(async () => {
    const opened = await openStore(root, io, { expectedReal });
    if (opened === null) throw new StoreError("launch_ended");
    const ctx = { ...opened, onLock };
    return withLock(ctx, async () => {
      let launch = await readLaunchFile(ctx, invocation);
      if (launch === null) throw new StoreError("launch_ended");
      const target = await activeCapture(ctx, launch.capture);
      if (target !== null && target.state.invocation !== invocation) throw new StoreError("store_invalid");
      return appendWithSuccession(ctx, {
        target,
        entries,
        produce,
        nowIso: new Date(nowMs).toISOString(),
        // O ponteiro só passa à seguinte se a gravação dele der certo; senão a
        // entrega falha e a seguinte fica para a próxima tomada (nextLaunchSegment).
        succeed: async () => {
          const next = await nextLaunchSegment(ctx, launch, nowMs);
          const published = { ...launch, capture: next.capture.state.id, segment: next.segment };
          await writeLaunchFile(ctx, published);
          launch = published;
          return next.capture;
        },
      });
    });
  });
}

// Vínculo de uma captura com a execução: o ponteiro tem só a forma conferida,
// e quem diz a execução da captura é o estado dela.
const ofLaunch = (state, invocation) => state.origin === LAUNCH_ORIGIN && state.invocation === invocation;

// Capturas legíveis de uma execução, por segmento (a seguinte, em
// nextLaunchSegment). Uma ilegível de qualquer origem fica de fora.
async function launchCaptures(ctx, invocation) {
  const { found } = await capturesOfOrigin(ctx, LAUNCH_ORIGIN);
  return found
    .map(({ state }) => state)
    .filter((state) => state.invocation === invocation)
    .sort((a, b) => a.segment - b.segment);
}

// Capturas da execução lidas uma a uma no encerramento (linha "Descoberta das
// capturas no encerramento" do Landing). `StoreError` (formato inválido, link,
// entrada alheia) fica de fora, como em launchCaptures; um erro de E/S cru põe
// o nome em `unreadable` sem perder as demais. A pasta que não pôde ser listada
// torna a descoberta inteira não conferida. `error`: a primeira falha.
async function discoverLaunch(ctx, invocation) {
  const found = [];
  const unreadable = [];
  let names;
  try {
    names = (await capturesDirKind(ctx)) === "missing" ? [] : (await ctx.io.readdir(ctx.capturesDir)).sort();
  } catch (error) {
    return { found, unreadable, complete: false, error };
  }
  let error = null;
  for (const name of names) {
    if (!CAPTURE_ID_PATTERN.test(name)) continue;
    try {
      const capture = await readCapture(ctx, name);
      if (ofLaunch(capture.state, invocation)) found.push(capture);
    } catch (failure) {
      if (failure instanceof StoreError) continue;
      unreadable.push(name);
      error ??= failure;
    }
  }
  found.sort((a, b) => a.state.segment - b.state.segment);
  return { found, unreadable, complete: unreadable.length === 0, error };
}

// Encerramento (crit. 20): o ponteiro sai antes de qualquer captura parar —
// sem ele nenhum produtor grava, mesmo que parar falhe depois. Então para a
// corrente e qualquer outra `active` da execução, como uma sucessora cujo
// ponteiro não foi gravado (task 33). As que não pararam vão no erro, para
// quem chama dizer quais são; o resumo de sucesso nunca traz uma `active`.
// Uma captura que não pôde ser lida pode ser desta execução: o erro diz que o
// encerramento não foi conferido (`unverified`) e quais nomes faltaram, sem
// tocar nelas — podem ser de outra execução. Com tudo parado, só a liberação
// do lock pode falhar: o erro leva o resultado (`closed`) e o lock.
export function endLaunch({ root, expectedReal, invocation, nowMs = Date.now(), io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openStore(root, io, { expectedReal });
    if (ctx === null) return { ended: false, captures: [] };
    return keepingResult(
      ctx,
      async () => {
        const nowIso = new Date(nowMs).toISOString();
        const launch = await readLaunchFile(ctx, invocation);
        if (launch !== null) await io.unlink(launchFile(ctx, invocation));
        const failures = [];
        // Para a captura lida só se ela for desta execução e estiver `active`;
        // devolve o estado que fica (o gravado, quando parou).
        const stop = async (capture) => {
          if (capture.state.state !== "active" || !ofLaunch(capture.state, invocation)) return capture.state;
          try {
            return await stopCapture(ctx, capture, nowIso);
          } catch (error) {
            failures.push({ id: capture.state.id, error });
            return capture.state;
          }
        };
        // A captura do ponteiro vale pelo vínculo do estado dela (linha "Vínculo
        // do ponteiro no encerramento"); a que não pôde ser lida fica para a
        // descoberta, que a relê ou a dá como não lida.
        if (launch !== null) {
          const current = await readCapture(ctx, launch.capture).catch(() => null);
          if (current !== null) await stop(current);
        }
        const discovered = await discoverLaunch(ctx, invocation);
        const states = [];
        for (const capture of discovered.found) {
          states.push(failures.some((failure) => failure.id === capture.state.id) ? capture.state : await stop(capture));
        }
        if (failures.length > 0 || !discovered.complete) {
          const ids = failures.map((failure) => failure.id);
          const unverified = discovered.complete ? {} : { unverified: true, unreadable: discovered.unreadable };
          throw leftActive(failures[0]?.error ?? discovered.error, { revoked: true, capture: ids[0], captures: ids, ...unverified });
        }
        return { ended: launch !== null, captures: states.map(publicCapture) };
      },
      (closed) => ({ closed }),
    );
  });
}

// Ponteiro lido sem lock, só para orientar o usuário depois de um
// encerramento que falhou: null quando a execução já não recebe registros.
// A captura dele só é devolvida se o estado dela for desta execução; de outra,
// o ponteiro é inválido, e a ilegível lança o erro da leitura.
export function peekLaunch({ root, expectedReal, invocation, io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openStore(root, io, { expectedReal });
    if (ctx === null) return null;
    const launch = await readLaunchFile(ctx, invocation);
    if (launch === null) return null;
    const { state } = await readCapture(ctx, launch.capture);
    if (!ofLaunch(state, invocation)) throw new StoreError("store_invalid");
    return launch;
  });
}

// `skill-me report` (crit. 27): a execução iniciada por último, sem criar lock
// — como em latestAutomaticCapture, lock ausente e raiz conferidos antes e
// depois; uma captura ilegível impede a escolha. A ordem é (`launchedAt`,
// `invocation`), que não depende de qual segmento ainda existe.
export function latestLaunch({ root, expectedReal, io = createStoreIo() }) {
  return storeOp(async () => {
    const ctx = await openStore(root, io, { expectedReal });
    if (ctx === null) throw new StoreError("no_launch_capture");
    const lockPath = path.join(ctx.storeDir, LOCK_FILE);
    const assertQuiet = async () => {
      if ((await entryKind(io, lockPath)) !== "missing") throw new StoreError("lock_present");
      await assertUnchanged(ctx);
    };
    await assertQuiet();
    const { found, failed } = await capturesOfOrigin(ctx, LAUNCH_ORIGIN);
    if (failed.length > 0) throw new StoreError(failed[0].code);
    if (found.length === 0) throw new StoreError("no_launch_capture");
    const latest = found
      .map(({ state }) => state)
      .reduce((a, b) => (b.launchedAt > a.launchedAt || (b.launchedAt === a.launchedAt && b.invocation > a.invocation) ? b : a));
    const segments = found
      .map(({ state }) => state)
      .filter((state) => state.invocation === latest.invocation)
      .sort((a, b) => a.segment - b.segment)
      .map((state) => ({ segment: state.segment, capture: state.id }));
    const present = new Set(segments.map((item) => item.segment));
    const missingSegments = Array.from({ length: segments.at(-1).segment }, (_, i) => i + 1).filter((segment) => !present.has(segment));
    let open = false;
    if ((await launchesDirKind(ctx)) === "dir") {
      const kind = await entryKind(io, launchFile(ctx, latest.invocation));
      if (kind === "link") throw new StoreError("link_refused");
      open = kind === "file";
    }
    await assertQuiet();
    return { invocation: latest.invocation, open, segments, missingSegments };
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
    const { found, failed } = await capturesOfOrigin(ctx, AUTOMATIC_ORIGIN);
    await assertQuiet();
    if (failed.length > 0) throw new StoreError(failed[0].code);
    if (found.length === 0) throw new StoreError("no_automatic_capture");
    return found.at(-1).state.id;
  });
}
