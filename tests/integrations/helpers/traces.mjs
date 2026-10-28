import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { INTEGRATIONS_CLI, REPO_ROOT, baseEnv, parseReport } from "./cli.mjs";
import { runPrivacy } from "./privacy-store.mjs";

// Apoio das provas da issue #8: vínculo explícito por ambiente, processos
// reais dos produtores e leitura da captura pelo CLI. Nada aqui reimplementa
// a política: o esperado vem do contrato publicado (pseudônimo HMAC, envelope
// do relatório em memória da #4/#5) ou do `privacy ingest` da #5.

export const TRACES_PROBE = pathToFileURL(path.join(REPO_ROOT, "tests", "integrations", "helpers", "traces-probe.mjs")).href;
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
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [...nodeArgs, INTEGRATIONS_CLI, ...args], {
      env: fixtureReport ? { ...env, SKILL_ME_OBSERVER_REPORT_FD: "3" } : env,
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
      resolve({ status, signal, stdout, stderr, report: fixtureReport ? parseReport(fd3) : null, stdinClosedAt, closedAt: performance.now() });
    });
  });
}

// Ambiente que carrega a pré-carga de tempo (SKILL_ME_TEST_TRACES_TIMING) num
// processo iniciado como o agente o inicia — sem argumento novo na linha de
// comando instalada, só pelo NODE_OPTIONS herdado.
export const timedEnv = (file) => ({ NODE_OPTIONS: `--import=${TRACES_PROBE}`, SKILL_ME_TEST_TRACES_TIMING: file });
export const timingLines = (file) => (existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : []);

// Tentativa de entrega de um processo, pela linha da pré-carga: da primeira
// operação de disco (a abertura começa no instante em que o evento lido entra
// na entrega) ao fim da última. Só tipos e números.
export function deliveryTiming({ ops, cpuMs }) {
  if (ops.length === 0) return { ms: 0, operations: 0, syncs: [], syncMs: 0, byOperation: [], slowest: "nenhuma", failed: [], cpuMs };
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
  };
}

export const describeTiming = (t) =>
  `${t.ms} ms da 1ª à última operação de disco; ${t.operations} operações; flush ${t.syncs.join("+") || "nenhum"} = ${t.syncMs} ms; ` +
  `por operação ${t.byOperation.join(", ")} ms; mais lenta ${t.slowest}; falhas ${t.failed.join(", ") || "nenhuma"}; CPU do processo ${t.cpuMs} ms`;

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
      if (op === "writeFile" && kind === "lock" && code === undefined) [held, hold, commits] = [true, hold + 1, 0];
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
const named = (entry) => `${entry.op} ${entry.kind}${entry.code === undefined || entry.code === PENDING ? "" : ` ${entry.code}`} (${placeInCapture(entry)})`;
const isLockContention = ({ op, kind, code }) => op === "open" && kind === "lock" && code === "EEXIST";

// Da última linha da pré-carga de um produtor: o resumo de sempre com as falhas
// que não são disputa do lock, a última operação concluída, as que estavam em
// curso na saída (com a idade), o processo e o laço de eventos.
export function producerTrace(file) {
  const lines = timingLines(file);
  if (lines.length === 0) return { unavailable: "sem linha da pré-carga" };
  const line = lines.at(-1);
  const trace = diskTrace([...line.ops, ...(line.pending ?? []).map(([op, kind, at, age]) => [op, kind, at, age, PENDING])]);
  const done = trace.filter((entry) => entry.code !== PENDING);
  const failures = done.filter((entry) => entry.code !== undefined && !isLockContention(entry)).map(named);
  const firstOpMs = line.ops.length === 0 ? null : Math.min(...line.ops.map(([, , at]) => at));
  return {
    lines: lines.length,
    pid: line.pid ?? null,
    failures,
    contention: done.filter(isLockContention).length,
    last: done.length === 0 ? "nenhuma" : named(done.at(-1)),
    pending: trace.filter((entry) => entry.code === PENDING).map((entry) => ({ name: named(entry), startMs: entry.at, ageMs: entry.ms })),
    holdEnds: Object.fromEntries(
      [...new Set(done.filter((entry) => entry.held).map((entry) => entry.hold))].map((hold) => [hold, Math.max(...done.filter((entry) => entry.hold === hold).map((entry) => entry.at + entry.ms))]),
    ),
    process: { startedAt: line.startedAt ?? null, firstOpMs, exitMs: line.exitMs ?? null },
    loop: line.loop ?? null,
    summary: describeTiming({ ...deliveryTiming(line), failed: failures }),
  };
}

const describeProcess = ({ startedAt, firstOpMs, exitMs }, loop) =>
  `processo: iniciado ${startedAt === null ? "?" : new Date(startedAt).toISOString()}, 1ª operação aos ${firstOpMs ?? "?"} ms, saída aos ${exitMs ?? "?"} ms; ` +
  `laço de eventos: ${loop === null || loop.samples === 0 ? "sem amostras" : `atraso máximo ${loop.maxMs} ms, p99 ${loop.p99Ms} ms (${loop.samples} amostras)`}`;

export const describeProducerTrace = (t) =>
  `${t.summary}; lock ocupado (EEXIST, repetido) ${t.contention}x; última concluída: ${t.last}; ` +
  `pendentes na saída: ${t.pending.length === 0 ? "nenhuma" : t.pending.map((p) => `${p.name} há ${Math.round(p.ageMs)} ms`).join(", ")}` +
  `${t.lines === 1 ? "" : `; ${t.lines} linhas da pré-carga`}\n  ${describeProcess(t.process, t.loop)}`;

// Da captura, depois que os produtores saíram: o status pelo CLI, como o
// usuário o consulta (com o lock preso, sai com o código dele); a pasta e o lock
// lidos direto. O dono do lock é o produtor cujo `pid` (da linha da pré-carga)
// está no `.lock`; o nonce do lock não é lido para a saída.
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
  const lock = inspected(() => {
    if (!readdirSync(storeDir(root)).includes(".lock")) return { present: false };
    const pid = inspected(() => JSON.parse(readFileSync(path.join(storeDir(root), ".lock"), "utf8")).pid);
    if (typeof pid !== "number") return { present: true, owner: `ilegível [${pid.unavailable ?? "sem pid"}]` };
    const by = owners.filter((owner) => owner.pid === pid).map((owner) => owner.label);
    return { present: true, owner: by.length > 0 ? by.join(", ") : "outro processo" };
  });
  return { status, files, lock };
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
