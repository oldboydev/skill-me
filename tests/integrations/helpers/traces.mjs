import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { afterEach, beforeEach } from "node:test";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { INTEGRATIONS_CLI, baseEnv, parseReport } from "./cli.mjs";
import { runPrivacy } from "./privacy-store.mjs";
import { TRACES_PROBE, activeRecording, finishRecording, noteProcess, recordedProducer, startRecording } from "./producer-runs.mjs";
import { fileKind } from "./trace-kinds.mjs";

// Apoio das provas da issue #8: vínculo explícito por ambiente, processos
// reais dos produtores e leitura da captura pelo CLI. Nada aqui reimplementa
// a política: o esperado vem do contrato publicado (pseudônimo HMAC, envelope
// do relatório em memória da #4/#5) ou do `privacy ingest` da #5.

export { TRACES_PROBE, noteProcess };
export const storeDir = (root) => path.join(root, "skill-me-privacy");
export const capturesDir = (root) => path.join(storeDir(root), "captures");
export const captureDir = (root, id) => path.join(capturesDir(root), id);
export const ISO_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const boundEnv = (root, id, extra = {}) => baseEnv({ SKILL_ME_CAPTURE_ROOT: root, SKILL_ME_CAPTURE_ID: id, ...extra });

export function startCapture(root, extra = []) {
  const result = runPrivacy(["start", "--root", root, ...extra]);
  assert.equal(result.status, 0, result.stdout);
  return result.body.capture.id;
}

export function privacyOk(args) {
  const result = runPrivacy(args);
  assert.equal(result.status, 0, `${args[0]}: ${result.stdout}`);
  assert.equal(result.stderr, "", args[0]);
  return result.body;
}

// Comando do usuário enquanto um `follow` sonda ou um produtor grava: o CLI da
// #5 não espera o lock e responde 4 `lock_present` sem mudar nada; o usuário
// repete (docs/traces.md). Só esse caso é repetido.
export async function privacyRetrying(args) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const result = runPrivacy(args);
    if (result.status !== 4 || result.body.error?.code !== "lock_present") {
      assert.equal(result.status, 0, `${args[0]}: ${result.stdout}`);
      assert.equal(result.stderr, "", args[0]);
      return result.body;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`lock ocupado demais: ${args[0]}`);
}

export const exportOf = (root, id) => privacyOk(["export", "--root", root, "--capture", id]);
export const statusOf = (root, id) => privacyOk(["status", "--root", root, "--capture", id]).capture;

// Definição publicada em docs/privacidade.md: HMAC-SHA-256 com a chave da
// captura sobre `id\0<valor>`, em base64url, prefixo `h1:`. Calculado aqui
// com a chave lida do disco, sem o código do produto.
export function expectedPseudonym(root, id, value) {
  const key = readFileSync(path.join(captureDir(root, id), "key"));
  return "h1:" + createHmac("sha256", key).update(`id\0${value}`, "utf8").digest("base64url");
}

// Processo real de um comando interno (`hook` ou `ingest`): stdio
// [stdin, stdout, stderr, relatório no fd 3]. `stdinText` vai inteiro de uma
// vez; `writeAfterMs` adia a escrita e o fim do stdin (processo já iniciado),
// devolvendo `stdinClosedAt`; `keepOpen` nunca fecha o stdin; `lines` alterna
// textos e pausas (ms). `fixtureReport: false` inicia o comando como no uso
// normal: sem SKILL_ME_OBSERVER_REPORT_FD nem fd 3 (`report` fica null).
export function runInternal(args, { env, cwd, stdinText = "", writeAfterMs = 0, keepOpen = false, nodeArgs = [], lines, fixtureReport = true } = {}) {
  const recorded = recordedProducer(args[0] === "hook" || args[0] === "ingest" ? `${args[0]} ${args[2]}` : args[0], env);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [...nodeArgs, INTEGRATIONS_CLI, ...args], {
      env: fixtureReport ? { ...recorded.env, SKILL_ME_OBSERVER_REPORT_FD: "3" } : recorded.env,
      cwd,
      stdio: fixtureReport ? ["pipe", "pipe", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let fd3 = "";
    let stdinClosedAt = null;
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    if (fixtureReport) {
      child.stdio[3].on("data", (chunk) => (fd3 += chunk));
      child.stdio[3].on("error", () => {});
    }
    child.stdin.on("error", () => {});
    const feed = async () => {
      if (writeAfterMs > 0) await new Promise((r) => setTimeout(r, writeAfterMs));
      if (lines) {
        for (const step of lines) {
          if (typeof step === "number") await new Promise((r) => setTimeout(r, step));
          else child.stdin.write(step);
        }
      } else child.stdin.write(stdinText);
      if (keepOpen) return;
      stdinClosedAt = performance.now();
      child.stdin.end();
    };
    feed();
    child.on("close", (status, signal) => {
      child.stdin.destroy();
      resolve(recorded.settle({ status, signal, stdout, stderr, report: fixtureReport ? parseReport(fd3) : null, stdinClosedAt, closedAt: performance.now() }));
    });
  });
}

// Ambiente que carrega a pré-carga de tempo (SKILL_ME_TEST_TRACES_TIMING) num
// processo iniciado como o agente o inicia — sem argumento novo na linha de
// comando instalada, só pelo NODE_OPTIONS herdado.
export const timedEnv = (file) => ({ NODE_OPTIONS: `--import=${TRACES_PROBE}`, SKILL_ME_TEST_TRACES_TIMING: file });
export const timingLines = (file) => (existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : []);

// Tentativa de entrega de um processo, pela linha da pré-carga (ou pelo
// instantâneo do io medido de um produtor em processo): as operações de disco
// concluídas, da primeira ao fim da última, e — quando a linha os registra — as
// que estavam em curso na saída, o processo e o laço de eventos. Só tipos e
// números; sem dado, `null`, nunca 0 (issue #25, linha "Evidência comum dos
// produtores e formatter legado" do Landing).
export function deliveryTiming(line) {
  const { ops, cpuMs } = line;
  const inFlight = { pending: line.pending === undefined ? null : pendingOf(line, neutralPlace), process: processOf(line), loop: line.loop ?? null };
  if (ops.length === 0) return { ms: null, operations: 0, syncs: [], syncMs: 0, byOperation: [], slowest: "nenhuma", failed: [], cpuMs, ...inFlight };
  const start = Math.min(...ops.map(([, , at]) => at));
  const end = Math.max(...ops.map(([, , at, ms]) => at + ms));
  const totals = {};
  for (const [op, , , ms] of ops) totals[op] = (totals[op] ?? 0) + ms;
  const syncs = ops.filter(([op]) => op === "sync");
  const [op, kind, , ms] = ops.reduce((a, b) => (b[3] > a[3] ? b : a));
  return {
    ms: Math.round(end - start),
    operations: ops.length,
    syncs: syncs.map(([, file]) => file),
    syncMs: Math.round(syncs.reduce((sum, entry) => sum + entry[3], 0)),
    byOperation: Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, total]) => `${name} ${Math.round(total)}`),
    slowest: `${op} ${kind} ${Math.round(ms)} ms`,
    failed: ops.filter((entry) => entry.length > 4).map(([name, file, , , code]) => `${name} ${file} ${code}`),
    cpuMs,
    ...inFlight,
  };
}

// Sem os campos da pré-carga de `51679df` (`exitMs`, `startedAt`) nem os do
// instantâneo em processo, o processo não foi registrado.
function processOf(line) {
  if (line.exitMs === undefined && line.snapshotMs === undefined && line.startedAt === undefined) return null;
  const all = [...line.ops, ...(line.pending ?? [])];
  return {
    inProcess: line.inProcess === true,
    startedAt: line.startedAt ?? null,
    firstOpMs: all.length === 0 ? null : Math.min(...all.map(([, , at]) => at)),
    lastEndMs: line.ops.length === 0 ? null : Math.round(Math.max(...line.ops.map(([, , at, ms]) => at + ms)) * 10) / 10,
    endMs: line.exitMs ?? line.snapshotMs ?? null,
  };
}

const describeDiskOps = (t) =>
  `${t.operations === 0 ? "nenhuma operação de disco concluída" : `${t.ms} ms do início da 1ª ao fim da última operação de disco concluída; ${t.operations} operações concluídas`}; ` +
  `flush ${t.syncs.length === 0 ? "nenhum" : `${t.syncs.join("+")} = ${t.syncMs} ms`}; ${t.byOperation.length === 0 ? "" : `por operação ${t.byOperation.join(", ")} ms; `}` +
  `mais lenta concluída ${t.slowest}; falhas ${t.failed.join(", ") || "nenhuma"}; ${t.process?.inProcess ? "CPU do processo da prova desde a criação do produtor" : "CPU do processo"} ${t.cpuMs} ms`;

const describePending = (pending, inProcess) =>
  `pendentes ${inProcess ? "no instantâneo" : "na saída"}: ${pending === null ? "não registradas" : pending.length === 0 ? "nenhuma" : pending.map((p) => `${p.name} há ${Math.round(p.ageMs)} ms`).join(", ")}`;

const describeLoop = (loop) => (loop === null ? "não registrado" : loop.samples === 0 ? "sem amostras" : `atraso máximo ${loop.maxMs} ms, p99 ${loop.p99Ms} ms (${loop.samples} amostras)`);

const msOrUnknown = (ms) => `${ms ?? "?"} ms`;

// O prazo de uma entrada conta da leitura dela, que a linha não registra: a
// mensagem dá a 1ª operação e a saída, e quem lê compara com os 650 ms.
function describeProcess(process, loop) {
  if (process === null) return `processo: não registrado; laço de eventos: ${describeLoop(loop)}`;
  const { inProcess, startedAt, firstOpMs, lastEndMs, endMs } = process;
  const since = firstOpMs === null || endMs === null ? "" : ` (${Math.round(endMs - firstOpMs)} ms depois da 1ª operação)`;
  return (
    `processo: ${inProcess ? "o da prova (produtor em processo)" : `iniciado ${startedAt === null ? "?" : new Date(startedAt).toISOString()}`}, ` +
    `1ª operação aos ${msOrUnknown(firstOpMs)}, última conclusão aos ${msOrUnknown(lastEndMs)}, ${inProcess ? "instantâneo" : "saída"} aos ${msOrUnknown(endMs)}${since}; ` +
    `${inProcess ? "laço de eventos do processo da prova desde a criação do produtor" : "laço de eventos"}: ${describeLoop(loop)}`
  );
}

// Os consumidores que já montam o objeto com `deliveryTiming` recebem também os
// pendentes, o processo e o laço; um objeto sem `process` sai como antes.
export const describeTiming = (t) =>
  t.process === undefined ? describeDiskOps(t) : `${describeDiskOps(t)}; ${describePending(t.pending, t.process?.inProcess)}; ${describeProcess(t.process, t.loop)}`;

// Diagnóstico de produtores reais nas provas (consumidores: T8-C15/I25-C46 em
// traces/concurrency.cli.test.mjs e I23-C10/I25-C47 em
// observe/agents.e2e.test.mjs; linhas "Diagnóstico do T8-C15" e "Diagnóstico do
// I23-C10" do Landing da #25). Nada aqui lança nem traz caminho, conteúdo, ID ou
// chave: o que não pôde ser lido vira o código da falha.

// O `code` E… da E/S ou o nome do erro, nunca a mensagem, que pode trazer caminho.
export const failureCode = (error) => (typeof error?.code === "string" && /^E[A-Z]+$/.test(error.code) ? error.code : (error?.name ?? "erro"));

// Uma inspeção que falha vira `{unavailable: <código>}`, em vez de um estado presumido.
export function inspected(read) {
  try {
    return read();
  } catch (error) {
    return { unavailable: failureCode(error) };
  }
}

// Comando `privacy` como o usuário o consulta: com o lock preso ou outro erro,
// o código fechado dele.
export function privacyBody(args) {
  const result = runPrivacy(args);
  return result.status === 0 ? { body: result.body } : { unavailable: result.body.error?.code ?? `status ${result.status}` };
}

export const shown = (value, describe) => (value.unavailable === undefined ? describe(value) : `indisponível [${value.unavailable}]`);

// Operações de uma linha da pré-carga de tempos em ordem de início, cada uma
// com o lugar dela em relação ao lock do store: `held` vale do `writeFile` do
// `.lock` que deu certo até o `unlink` dele, inclusive; `hold` numera as
// tomadas do processo (1, 2…); `commits` conta os `rename` de `state.json.tmp`
// concluídos naquela tomada antes da operação. Cada consumidor diz a fase com
// o que vale no caminho dele. `at` e `ms` são o início e a duração (ou a idade,
// para uma operação em curso na saída) da linha.
export function diskTrace(ops) {
  let held = false;
  let hold = 0;
  let commits = 0;
  return [...ops]
    .sort((x, y) => x[2] - y[2])
    .map(([op, kind, at, ms, code]) => {
      const entry = { op, kind, code, held, hold: held ? hold : null, commits: held ? commits : 0, at, ms };
      // `writeExclusive lock`: a tomada vista pelo io medido de um produtor em processo.
      if ((op === "writeFile" || op === "writeExclusive") && kind === "lock" && code === undefined) [held, hold, commits] = [true, hold + 1, 0];
      else if (op === "rename" && kind === "state.json.tmp" && code === undefined && held) commits += 1;
      else if (op === "unlink" && kind === "lock") held = false;
      return entry;
    });
}

// Diagnóstico das entregas de um produtor nas provas da #8 (consumidores: T8-C3 e
// T8-C8 em traces/live-capture.cli.test.mjs, T8-C14 em traces/query.cli.test.mjs
// e T8-C18 em traces/replay.unit.test.mjs; linha "Diagnóstico das entregas de um
// produtor nas provas T8" do Landing da #25). Na captura manual a 1ª tomada do
// lock é a abertura e a seguinte grava o lote; cada tomada tem no máximo um
// commit (o `rename` de state.json.tmp). Nada aqui lança nem traz caminho,
// conteúdo, ID, chave, nonce ou ambiente.
const PENDING = "pendente";
const placeInCapture = ({ held, hold, commits, kind }) =>
  held ? `sob o lock, ${hold}ª tomada${commits > 0 ? ", depois do commit" : ""}` : kind === "lock" ? "tomada do lock" : "fora do lock";
// Fora do caminho manual (rota automática, produtor em processo) uma tomada
// pode renomear mais de um state.json.tmp, então o lugar não diz commit.
const neutralPlace = ({ held, hold, kind }) => (held ? `sob o lock, ${hold}ª tomada` : kind === "lock" ? "tomada do lock" : "fora do lock");
const named = (entry, place = placeInCapture) => `${entry.op} ${entry.kind}${entry.code === undefined || entry.code === PENDING ? "" : ` ${entry.code}`} (${place(entry)})`;
const isLockContention = ({ op, kind, code }) => (op === "open" || op === "writeExclusive") && kind === "lock" && code === "EEXIST";
const traceOfLine = (line) => diskTrace([...line.ops, ...(line.pending ?? []).map(([op, kind, at, age]) => [op, kind, at, age, PENDING])]);
const pendingOf = (line, place) =>
  traceOfLine(line)
    .filter((entry) => entry.code === PENDING)
    .map((entry) => ({ name: named(entry, place), startMs: entry.at, ageMs: entry.ms }));

// De uma linha da pré-carga de um produtor (a última, ou a `line` dada, quando o
// arquivo é do teste e tem uma linha por processo): o resumo de sempre com as
// falhas que não são disputa do lock, a última operação concluída, as que
// estavam em curso na saída (com a idade), o processo e o laço de eventos.
// `commits: false` (a evidência comum, de qualquer rota) usa o lugar neutro e
// conta à parte o `lstat ENOENT`, a conferência normal de ausência da captura
// nova na rota automática (como o C47); no caminho manual ele continua falha.
export function producerTrace(file, { line: index = -1, commits = true } = {}) {
  const lines = timingLines(file);
  if (lines.length === 0) return { unavailable: "sem linha da pré-carga" };
  const line = lines.at(index);
  if (line === undefined) return { unavailable: "linha da pré-carga ausente" };
  return lineTrace(line, { lines: lines.length, ...(commits ? { place: placeInCapture } : NEUTRAL) });
}

const isAbsence = ({ op, code }) => op === "lstat" && code === "ENOENT";
const NEUTRAL = { place: neutralPlace, absences: true };

function lineTrace(line, { lines, place, absences = false }) {
  const trace = traceOfLine(line);
  const done = trace.filter((entry) => entry.code !== PENDING);
  const failures = done.filter((entry) => entry.code !== undefined && !isLockContention(entry) && !(absences && isAbsence(entry))).map((entry) => named(entry, place));
  const timing = deliveryTiming(line);
  return {
    lines,
    pid: line.pid ?? null,
    failures,
    contention: done.filter(isLockContention).length,
    ...(absences ? { absences: done.filter(isAbsence).length } : {}),
    last: done.length === 0 ? "nenhuma" : named(done.at(-1), place),
    pending: pendingOf(line, place),
    holdEnds: Object.fromEntries(
      [...new Set(done.filter((entry) => entry.held).map((entry) => entry.hold))].map((hold) => [hold, Math.max(...done.filter((entry) => entry.hold === hold).map((entry) => entry.at + entry.ms))]),
    ),
    process: timing.process,
    loop: timing.loop,
    summary: describeDiskOps({ ...timing, failed: failures }),
  };
}

export const describeProducerTrace = (t) =>
  `${t.summary}; lock ocupado (EEXIST, repetido) ${t.contention}x; ` +
  `${t.absences === undefined ? "" : `ausências conferidas (lstat ENOENT) ${t.absences}x; `}última concluída: ${t.last}; ` +
  `${describePending(t.pending, t.process?.inProcess)}${t.lines === 1 ? "" : `; ${t.lines} linhas da pré-carga`}\n  ${describeProcess(t.process, t.loop)}`;

// O lock da raiz lido direto. O dono é todo processo registrado (`owners`:
// rótulo e `pid`) cujo `pid` coincide com o gravado no `.lock` — coincidência,
// não prova de quem deixou o arquivo; o nonce do lock não é lido para a saída.
function lockEvidence(root, owners) {
  return inspected(() => {
    if (!readdirSync(storeDir(root)).includes(".lock")) return { present: false };
    const pid = inspected(() => JSON.parse(readFileSync(path.join(storeDir(root), ".lock"), "utf8")).pid);
    if (typeof pid !== "number") return { present: true, owner: `ilegível [${pid.unavailable ?? "sem pid"}]` };
    const by = owners.filter((owner) => owner.pid === pid).map((owner) => owner.label);
    return { present: true, owner: by.length > 0 ? by.join(", ") : "outro processo" };
  });
}

// Da captura, depois que os produtores saíram: o status pelo CLI, como o
// usuário o consulta (com o lock preso, sai com o código dele); a pasta e o lock
// lidos direto.
export function captureEvidence(root, id, owners = []) {
  const status = inspected(() => {
    const result = privacyBody(["status", "--root", root, "--capture", id]);
    if (result.unavailable !== undefined) return result;
    const { state, counters } = result.body.capture;
    return { state, accepted: counters.accepted, persisted: counters.persisted };
  });
  const files = inspected(() => {
    const names = readdirSync(captureDir(root, id));
    return { segments: names.filter((name) => /^events-\d{6}\.ndjson$/.test(name)).length, temporaries: names.filter((name) => name.endsWith(".skill-me-tmp")).length };
  });
  return { status, files, lock: lockEvidence(root, owners) };
}

// Produtores já terminados (`produced`: rótulo, resultado de runInternal e o
// arquivo da pré-carga de cada um) e a captura deles.
export function deliveryEvidence({ root, id, produced }) {
  const producers = produced.map(({ label, run, timing }) => ({
    label,
    status: run.status,
    signal: run.signal,
    delivery: run.report?.delivery ?? null,
    trace: inspected(() => producerTrace(timing)),
  }));
  const owners = producers.filter((p) => typeof p.trace.pid === "number").map((p) => ({ label: p.label, pid: p.trace.pid }));
  return { producers, capture: inspected(() => captureEvidence(root, id, owners)) };
}

export function describeDeliveryEvidence({ producers, capture }) {
  const lines = producers.flatMap(({ label, status, signal, delivery, trace }) => [
    `produtor ${label}: status ${status}, sinal ${signal ?? "nenhum"}; entrega ${delivery === null ? "sem relatório" : JSON.stringify(delivery)}`,
    `  tempos: ${shown(trace, describeProducerTrace)}`,
  ]);
  const described = shown(capture, ({ status, files, lock }) =>
    [
      `status ${shown(status, (s) => `${s.state}, accepted ${s.accepted}, persisted ${s.persisted}`)}`,
      `pasta ${shown(files, (f) => `${f.segments} segmento(s), ${f.temporaries} temporário(s)`)}`,
      `lock ${shown(lock, (l) => (l.present ? `presente, de ${l.owner}` : "ausente"))}`,
    ].join("; "),
  );
  return [...lines, `captura: ${described}`].join("\n");
}

// Mensagem de uma asserção de entrega: o rótulo de sempre e, só quando o valor
// não é o esperado, a evidência — o caminho saudável não ganha chamadas de CLI.
export const explainedUnless = (matches, label, flow) => (matches ? label : `${label}\n${describeDeliveryEvidence(deliveryEvidence(flow))}`);

// Evidência comum dos produtores de um teste (issue #25, linha "Evidência comum
// dos produtores e formatter legado" do Landing). Um arquivo de prova adota com
// uma chamada no topo, `recordProducersInEachTest()`: cada teste dele roda num
// registro, e todo produtor iniciado pelos apoios (`runInternal`, `runHook`,
// `runHermesIngest`, `runClaudeHandler`, `runCodexHandler`, `runWrapper`) ou
// criado por `inProcessProducer` entra nele. Quando o teste falha, o mesmo erro
// sai com a evidência de todos eles e das raízes deles; quando passa, nada é
// calculado. Fora de um registro os apoios rodam exatamente como antes. Nada
// aqui lança nem traz caminho, conteúdo, ID, chave, nonce ou ambiente.
// Pelos hooks do arquivo, e não envolvendo o `test`: o runner do Node grava como
// local da falha quem chamou o `test`, e um envelope trocaria o arquivo e a linha
// da prova pelos deste apoio. `context.error` (o erro do teste, com o original em
// `cause`) e `context.passed` existem no Node 24.13.0 da CI e no 24.22.1.
export function recordProducersInEachTest() {
  let current = null;
  beforeEach(() => {
    current = startRecording();
  });
  afterEach((t) => {
    if (current === null) return;
    try {
      if (!t.passed) withEvidence(t.error?.cause ?? t.error, current);
    } finally {
      finishRecording(current);
      current = null;
    }
  });
}

// Registro explícito em volta de um corpo (os controles do diagnóstico): o erro
// que o corpo lança sai o mesmo, com a evidência.
export async function recordingProducers(body) {
  const current = startRecording();
  try {
    return await body();
  } catch (error) {
    throw withEvidence(error, current);
  } finally {
    finishRecording(current);
  }
}

// Acrescenta a evidência à mensagem e ao cabeçalho do `stack` do próprio erro: o
// runner do Node imprime o `stack` no resumo das falhas, e `actual`, `expected`,
// `operator` e o tipo continuam os da asserção original. Um valor que não é
// `Error`, ou cuja mensagem não muda, sai como veio.
function withEvidence(error, current) {
  if (!(error instanceof Error)) return error;
  let evidence;
  try {
    evidence = describeRecording(current);
  } catch (failure) {
    evidence = `evidência dos produtores deste teste indisponível [${failureCode(failure)}]`;
  }
  try {
    const before = error.message;
    const after = `${before}\n${evidence}`;
    const stack = error.stack;
    error.message = after;
    if (before !== "" && typeof stack === "string" && stack.includes(before)) error.stack = stack.replace(before, () => after);
  } catch {
    // Mensagem que não pode mudar (erro congelado): o original sai intacto.
  }
  return error;
}

// Produtor em processo (`createAutomaticDelivery`, `createCaptureDelivery`,
// `createLaunchDelivery`) pela injeção pública de `io`: `criar(io)` recebe um io
// que envolve o `base` e mede cada operação dele; o laço de eventos e a CPU são
// os do processo da prova desde a criação. Fora de um registro, `criar(base)`.
export function inProcessProducer(label, root, create, { base = createStoreIo() } = {}) {
  const recording = activeRecording();
  if (recording === null) return create(base);
  const measured = measuredIo(base);
  const producer = create(measured.io);
  recording.producers.push({ index: recording.producers.length + 1, label, inProcess: true, root: { root }, snapshot: measured.snapshot, report: () => producer.report() });
  recording.disposers.push(measured.dispose);
  return producer;
}

const IO_OPERATIONS = ["lstat", "stat", "realpath", "readdir", "rename", "rmdir", "unlink", "mkdir", "readBounded", "writeExclusive"];
const tenth = (ms) => Math.round(ms * 10) / 10;

function measuredIo(base) {
  const ops = [];
  const inFlight = new Set();
  const loop = monitorEventLoopDelay({ resolution: 10 });
  loop.enable();
  const cpuAtStart = process.cpuUsage();
  const measure = (name, file, run) => {
    const started = performance.now();
    const entry = [name, fileKind(file), started];
    inFlight.add(entry);
    const done = (...code) => {
      inFlight.delete(entry);
      ops.push([name, entry[1], tenth(started), tenth(performance.now() - started), ...code]);
    };
    return Promise.resolve()
      .then(run)
      .then(
        (value) => {
          done();
          return value;
        },
        (error) => {
          done(typeof error?.code === "string" && /^E[A-Z]+$/.test(error.code) ? error.code : "erro");
          throw error;
        },
      );
  };
  const io = { ...base };
  for (const name of IO_OPERATIONS) if (typeof base[name] === "function") io[name] = (file, ...rest) => measure(name, file, () => base[name](file, ...rest));
  return {
    io,
    snapshot() {
      const now = performance.now();
      const cpu = process.cpuUsage(cpuAtStart);
      return {
        ops: [...ops],
        cpuMs: Math.round((cpu.user + cpu.system) / 1000),
        pending: [...inFlight].map(([name, kind, started]) => [name, kind, tenth(started), tenth(now - started)]),
        snapshotMs: tenth(now),
        startedAt: null,
        pid: process.pid,
        inProcess: true,
        loop: loop.count > 0 ? { samples: loop.count, maxMs: tenth(loop.max / 1e6), p99Ms: tenth(loop.percentile(99) / 1e6) } : { samples: 0, maxMs: null, p99Ms: null },
      };
    },
    dispose: () => loop.disable(),
  };
}

// Da raiz, na hora da falha: o lock, as capturas pelo `privacy list` (como o
// usuário as consulta; com o lock preso, o código dele), sem ID, e a pasta das
// capturas lida direto.
function storeEvidence(root, owners) {
  const captures = inspected(() => {
    const listed = privacyBody(["list", "--root", root]);
    if (listed.unavailable !== undefined) return listed;
    return { rows: listed.body.captures.map((c) => `${c.origin ?? "manual"} ${c.state} accepted ${c.counters.accepted} persisted ${c.counters.persisted}`) };
  });
  const files = inspected(() => {
    let names;
    try {
      names = readdirSync(capturesDir(root));
    } catch (error) {
      if (error.code === "ENOENT") return { segments: 0, temporaries: 0 };
      throw error;
    }
    const inside = names.filter((name) => /^[0-9a-f]{32}$/.test(name)).flatMap((name) => readdirSync(path.join(capturesDir(root), name)));
    return { segments: inside.filter((name) => /^events-\d{6}\.ndjson$/.test(name)).length, temporaries: inside.filter((name) => name.endsWith(".skill-me-tmp")).length };
  });
  return { lock: lockEvidence(root, owners), captures, files };
}

// Linha da pré-carga do processo (a da saída dele) ou instantâneo do io medido
// do produtor em processo, com o lugar neutro.
const traceOf = (producer) =>
  producer.inProcess
    ? lineTrace(producer.snapshot(), { lines: 1, ...NEUTRAL })
    : producer.timing === null
      ? { unavailable: "ambiente herdado, sem pré-carga" }
      : producerTrace(producer.timing, { line: producer.line, commits: false });

function describeRecording({ producers, processes }) {
  if (producers.length === 0) return "evidência dos produtores deste teste: nenhum produtor registrado";
  const traced = producers.map((producer) => ({ producer, trace: inspected(() => traceOf(producer)), report: inspected(() => ({ value: producer.inProcess ? producer.report() : (producer.run?.report?.delivery ?? null) })) }));
  const owners = [
    ...traced.filter(({ trace }) => typeof trace.pid === "number").map(({ producer, trace }) => ({ pid: trace.pid, label: `produtor ${producer.index} ${producer.label}` })),
    ...processes,
  ];
  const lines = [`evidência dos produtores deste teste (${producers.length}):`];
  for (const { producer, trace, report } of traced) {
    const outcome = producer.inProcess ? "" : producer.run === null ? "ainda em curso; " : `status ${producer.run.status}, sinal ${producer.run.signal ?? "nenhum"}; `;
    const delivery = shown(report, ({ value }) => (value === null || value === undefined ? "sem relatório" : JSON.stringify(value)));
    lines.push(`produtor ${producer.index} ${producer.label}${producer.inProcess ? " (em processo)" : ""}: ${outcome}entrega ${delivery}`);
    lines.push(`  tempos: ${shown(trace, describeProducerTrace)}`);
  }
  const roots = new Map();
  const unavailable = [];
  for (const producer of producers) {
    if (producer.root.unavailable !== undefined) unavailable.push(`produtor ${producer.index}: raiz indisponível [${producer.root.unavailable}]`);
    else roots.set(producer.root.root, [...(roots.get(producer.root.root) ?? []), producer.index]);
  }
  for (const [index, [root, members]] of [...roots].entries()) {
    const { lock, captures, files } = storeEvidence(root, owners);
    lines.push(
      `raiz ${index + 1} (produtores ${members.join(", ")}): ` +
        [
          `lock ${shown(lock, (l) => (l.present ? `presente, de ${l.owner}` : "ausente"))}`,
          `capturas ${shown(captures, (c) => `${c.rows.length} [${c.rows.join("; ")}]`)}`,
          `pasta das capturas ${shown(files, (f) => `${f.segments} segmento(s), ${f.temporaries} temporário(s)`)}`,
        ].join("; "),
    );
  }
  return [...lines, ...unavailable].join("\n");
}

export const runHook = (agent, payload, options = {}) =>
  runInternal(["hook", "--agent", agent], { ...options, stdinText: options.stdinText ?? JSON.stringify(payload) });

export const runHermesIngest = (records, options = {}) =>
  runInternal(["ingest", "--agent", "hermes"], { ...options, stdinText: options.stdinText ?? records.map((r) => (typeof r === "string" ? r : JSON.stringify(r)) + "\n").join("") });

// Todos os arquivos sob `dir`, sem seguir links.
export function filesUnder(dir) {
  const out = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const full = path.join(current, name);
      if (lstatSync(full).isDirectory()) walk(full);
      else out.push(full);
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

// Nenhum arquivo do store contém algum dos valores dados.
export function assertAbsentOnDisk(root, values, label) {
  for (const file of filesUnder(storeDir(root))) {
    if (path.basename(file) === "key") continue;
    const text = readFileSync(file, "utf8");
    for (const value of values) assert.ok(!text.includes(value), `${label}: ${JSON.stringify(value).slice(0, 60)} em ${path.relative(root, file)}`);
  }
}

// Folhas de texto de um payload nativo (valores que nunca podem ir ao disco
// quando o conteúdo está desligado, exceto os nomes que o envelope publica).
export function stringLeaves(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (value !== null && typeof value === "object") for (const child of Object.values(value)) stringLeaves(child, out);
  return out;
}

// O envelope gravado é o do relatório em memória da #4/#5 a menos dos IDs
// (outra chave) e do instante de observação.
export function sameEnvelope(stored, observed, label) {
  const strip = ({ ids, observedAt, ...rest }) => rest;
  assert.deepEqual(strip(stored), strip(observed), label);
  assert.deepEqual(Object.keys(stored.ids).sort(), Object.keys(observed.ids).sort(), label);
  assert.match(stored.observedAt, ISO_MS, label);
}

export const waitUntil = async (predicate, { timeoutMs = 15_000, label = "condição" } = {}) => {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`tempo esgotado esperando ${label}`);
    await new Promise((r) => setTimeout(r, 20));
  }
};

export { baseEnv };
