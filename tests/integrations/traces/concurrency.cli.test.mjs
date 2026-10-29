import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, linkSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { cp } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { after, test } from "node:test";
import { claudeHookDraft } from "../../../src/integrations/adapters/claude.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { deleteCapture, exportCapture, listCaptures, pruneCaptures } from "../../../src/integrations/privacy/store.mjs";
import { ATTEMPT_MS, DELIVERY_DEADLINE_MS, createCaptureDelivery } from "../../../src/integrations/traces/delivery.mjs";
import { CAPTURE_REPORT_ENV, appendDeliveryReport, deliveryReportFile, deliveryReportLine } from "../../../src/integrations/traces/delivery-report.mjs";
import { REPO_ROOT, baseEnv, makeScratch, runIntegrations, runIntegrationsJson } from "../helpers/cli.mjs";
import { readClaudeHandlers, readCodexHandlers, runClaudeHandler, runCodexHandler } from "../helpers/installed-hooks.mjs";
import { MARKER, claudePayload, codexHookPayload, execEvent, hermesRecord, leaks } from "../helpers/privacy-canaries.mjs";
import {
  ISO_MS,
  TRACES_PROBE,
  boundEnv,
  captureDir,
  capturesDir,
  describeTiming,
  deliveryTiming,
  diskTrace,
  exportOf,
  expectedPseudonym,
  inspected,
  privacyBody,
  privacyOk,
  recordProducersInEachTest,
  runHermesIngest,
  runHook,
  shown,
  startCapture,
  statusOf,
  storeDir,
  timedEnv,
  timingLines,
  UNSURE_PLACE,
  waitUntil,
} from "../helpers/traces.mjs";
import { snapshotTree } from "../helpers/tree.mjs";
import { runWrapper, writeScenario } from "../helpers/wrapper.mjs";

// Evidência comum dos produtores quando um teste falha (issue #25, linha
// "Evidência comum dos produtores e formatter legado" do Landing): helpers/traces.mjs.
recordProducersInEachTest();

// Provas S3 da issue #8 (C15–C16): produtores reais concorrentes na mesma
// captura e falhas de entrega (lock ocupado, E/S, confirmação perdida, disco
// parado) com fixtures sintéticas. O diagnóstico de cada falha é lido como o
// usuário o lê: no arquivo de SKILL_ME_CAPTURE_REPORT (docs/traces.md).
//
// `unlinkSync`/`rmdirSync` e o `cp` de node:fs/promises, não `rmSync`/`cpSync`:
// no Windows, o Node 24.13.0 (o da CI) converte o caminho pela página de código
// ANSI. Com "ação", o `rmSync` não apaga e não lança (nodejs/node#56049,
// corrigido na 24.13.1) — o lock alheio ficava e a prova seguinte via
// `lock_present` — e o `cpSync` derruba o processo do arquivo (0xC0000409; ainda
// na 24.13.1, não na 24.21.0), sem que o `node --test` acuse os testes que não
// rodaram. Os substitutos lançam se não conseguirem.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

const FS_PROBE = pathToFileURL(path.join(REPO_ROOT, "tests", "integrations", "helpers", "fs-probe.mjs")).href;
// Em processo, o fim da tentativa é medido contra o prazo exato. No processo
// real a medida vai do fim do stdin à saída do processo e inclui, além da
// tentativa, o encerramento (relatório, `process.exit`, fechamento dos pipes).
const PROCESS_EXIT_ALLOWANCE_MS = 500;

const hermesLines = (prefix, count) =>
  Array.from({ length: count }, (_, i) => JSON.stringify(hermesRecord("pre_tool_call", { tool_call_id: `${prefix}-${i}`, session_id: `sessao-${prefix}` })) + "\n");
const interleaved = (lines, pauseMs) => lines.flatMap((line) => [line, pauseMs]);

// Linhas do arquivo de diagnóstico; uma linha intercalada por outro processo
// não seria JSON e a prova falharia aqui.
const diagnostics = (file) => (existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : []);
const lostAll = (code, entries, bound = true) => ({ bound, code, entries, committed: 0, persisted: 0, lost: entries });

// Cada linha tem exatamente estes campos: nenhum caminho, valor de variável,
// payload ou mensagem de erro cabe nela.
function assertDiagnostic(line, { agent, capture, delivery }, label) {
  assert.match(line.at, ISO_MS, label);
  assert.deepEqual(line, { skillMeDeliveryReport: 1, at: line.at, agent, capture, delivery }, label);
}

function assertSegmentConsistent(root, id, label) {
  const dir = captureDir(root, id);
  const state = JSON.parse(readFileSync(path.join(dir, "state.json"), "utf8"));
  const names = readdirSync(dir).sort();
  assert.deepEqual(names.filter((name) => /^events-/.test(name)), [state.dataFile], `${label}: um segmento, o do commit`);
  assert.deepEqual(names.filter((name) => name.endsWith(".skill-me-tmp")), [], `${label}: sem temporários`);
  assert.equal(statSync(path.join(dir, state.dataFile)).size, state.dataBytes, `${label}: dataBytes`);
  const lines = readFileSync(path.join(dir, state.dataFile), "utf8").trimEnd().split("\n");
  assert.equal(lines.length, state.counters.persisted, `${label}: linhas = persisted`);
  assert.ok(!readdirSync(storeDir(root)).includes(".lock"), `${label}: lock liberado`);
  return state;
}

// O T8-C15 e as provas do diagnóstico dele (I25-C46, issue #25, AC7) passam pela
// mesma rotina: produtores, inspeção e asserções. A falha do gate da 9ª
// verificação da #25 (`b` com `io_failure` e 20 de 40 sem confirmação) não
// deixou operação, código de erro nem estado da captura; a inspeção os põe na
// mensagem, sem caminho, ID, chave, conteúdo ou ambiente. Diagnóstico, não
// correção: linha "Diagnóstico do T8-C15" do Landing em
// .checks/issue-25-agent-launch.md.
const PRODUCERS = ["a", "b"];

// Os dois começam juntos, como antes, cada um com a pré-carga de tempos — só
// observa: acumula as operações em memória e grava uma linha ao sair — e, nas
// provas do diagnóstico, com uma injeção existente dela em `injected[nome]`.
async function runConcurrentProducers(label, injected = {}) {
  const root = scratch(`${label} raiz`);
  const id = startCapture(root);
  const times = scratch(`${label} tempos`);
  const timing = Object.fromEntries(PRODUCERS.map((name) => [name, path.join(times, `${name}.ndjson`)]));
  const startedAt = performance.now();
  const runs = await Promise.all(
    PRODUCERS.map((name) =>
      runHermesIngest([], { env: boundEnv(root, id, { ...timedEnv(timing[name]), ...injected[name] }), lines: interleaved(hermesLines(name, 40), 4) }),
    ),
  );
  return { root, id, timing, startedAt, runs: Object.fromEntries(PRODUCERS.map((name, index) => [name, runs[index]])) };
}

// Operações com erro da linha da pré-carga (`diskTrace`, helpers/traces.mjs),
// com a fase. No caminho manual cada tomada do lock tem um só `rename` de
// `state.json.tmp`, que é o commit (store.mjs). O `open` do `.lock` com EEXIST
// é a disputa normal do lock, repetida pelo contrato da entrega: só contada,
// senão esconderia a falha real. Depois de um `rename lock` com erro a posse
// fica indeterminada (`unsure`, C46 (u)), nunca “fora do lock”.
function failuresWithPhase(ops) {
  let contention = 0;
  const failures = [];
  for (const { op, kind, code, held, unsure, commits } of diskTrace(ops)) {
    if (code === undefined) continue;
    if (op === "open" && kind === "lock" && code === "EEXIST") contention += 1;
    else failures.push(`${op} ${kind} ${code} (${held ? (commits > 0 ? "depois do commit" : "antes do commit") : kind === "lock" ? "tomada do lock" : unsure ? UNSURE_PLACE : "fora do lock"})`);
  }
  return { contention, failures };
}

function producerTiming(file) {
  const lines = timingLines(file);
  if (lines.length === 0) return { unavailable: "sem linha da pré-carga" };
  const { contention, failures } = failuresWithPhase(lines.at(-1).ops);
  return { lines: lines.length, contention, failures, summary: describeTiming({ ...deliveryTiming(lines.at(-1)), failed: failures }) };
}

// Da captura, depois que os dois saíram: a pasta e o lock lidos direto; export
// e status pelo CLI, como o usuário os consulta (com o lock preso, saem com o
// código dele). Um registro é de `a` ou de `b` pelo pseudônimo do tool_call_id.
function inspectCapture({ root, id }) {
  const files = inspected(() => {
    const names = readdirSync(captureDir(root, id));
    return { segments: names.filter((name) => /^events-\d{6}\.ndjson$/.test(name)).length, temporaries: names.filter((name) => name.endsWith(".skill-me-tmp")).length };
  });
  const lock = inspected(() => ({ present: readdirSync(storeDir(root)).includes(".lock") }));
  const exported = inspected(() => {
    const result = privacyBody(["export", "--root", root, "--capture", id]);
    if (result.unavailable !== undefined) return result;
    const callIds = result.body.records.map((r) => r.envelope.ids.toolCallId);
    const of = Object.fromEntries(PRODUCERS.map((name) => [name, new Set(Array.from({ length: 40 }, (_, i) => expectedPseudonym(root, id, `${name}-${i}`)))]));
    const counts = Object.fromEntries(PRODUCERS.map((name) => [name, callIds.filter((callId) => of[name].has(callId)).length]));
    const others = callIds.filter((callId) => !PRODUCERS.some((name) => of[name].has(callId))).length;
    return { records: callIds.length, ...counts, others, repeated: callIds.length - new Set(callIds).size };
  });
  const status = inspected(() => {
    const result = privacyBody(["status", "--root", root, "--capture", id]);
    if (result.unavailable !== undefined) return result;
    const { state, counters } = result.body.capture;
    return { state, accepted: counters.accepted, persisted: counters.persisted };
  });
  return { export: exported, status, files, lock };
}

// Nunca lança: o que não pôde ser lido aparece como indisponível.
function inspectProducers(flow) {
  const producers = Object.fromEntries(
    PRODUCERS.map((name) => {
      const run = flow.runs[name];
      const timing = inspected(() => producerTiming(flow.timing[name]));
      return [name, { status: run.status, signal: run.signal, exitMs: Math.round(run.closedAt - flow.startedAt), delivery: run.report?.delivery ?? null, timing }];
    }),
  );
  return { producers, capture: inspected(() => inspectCapture(flow)) };
}

function describeProducers({ producers, capture }) {
  const lines = PRODUCERS.flatMap((name) => {
    const { status, signal, exitMs, delivery, timing } = producers[name];
    return [
      `produtor ${name}: status ${status}, sinal ${signal ?? "nenhum"}, saiu aos ${exitMs} ms; entrega ${delivery === null ? "sem relatório" : JSON.stringify(delivery)}`,
      `  tempos: ${shown(timing, (t) => `${t.summary}; lock ocupado (EEXIST, repetido) ${t.contention}x${t.lines === 1 ? "" : `; ${t.lines} linhas da pré-carga`}`)}`,
    ];
  });
  const captured = shown(capture, (c) =>
    [
      `export ${shown(c.export, (e) => `${e.records} registros: a ${e.a}/40, b ${e.b}/40, outros ${e.others}, repetidos ${e.repeated}`)}`,
      `status ${shown(c.status, (s) => `${s.state}, accepted ${s.accepted}, persisted ${s.persisted}`)}`,
      `pasta ${shown(c.files, (f) => `${f.segments} segmento(s), ${f.temporaries} temporário(s)`)}`,
      `lock ${shown(c.lock, (l) => (l.present ? "presente" : "ausente"))}`,
    ].join("; "),
  );
  return [...lines, `captura: ${captured}`].join("\n");
}

// As asserções de sempre do T8-C15; só a mensagem traz a evidência.
function assertProducersConfirmed(flow, evidence) {
  const diagnosis = describeProducers(evidence);
  for (const name of PRODUCERS) {
    const run = flow.runs[name];
    assert.equal(run.status, 0, `${name}\n${diagnosis}`);
    assert.deepEqual(run.report.delivery, { bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0 }, `${name}\n${diagnosis}`);
  }
}

test("T8-C15 concurrent producers: dois produtores em paralelo confirmam cada evento uma vez e deixam estado e segmento coerentes", async () => {
  const flow = await runConcurrentProducers("t8 c15");
  assertProducersConfirmed(flow, inspectProducers(flow));
  const { root, id } = flow;
  const env = boundEnv(root, id);
  const callIds = exportOf(root, id).records.map((r) => r.envelope.ids.toolCallId);
  const expected = ["a", "b"].flatMap((p) => Array.from({ length: 40 }, (_, i) => expectedPseudonym(root, id, `${p}-${i}`)));
  assert.equal(callIds.length, 80);
  assert.deepEqual([...callIds].sort(), [...expected].sort(), "cada evento confirmado exatamente uma vez");
  const state = assertSegmentConsistent(root, id, "fluxos");
  assert.deepEqual([state.counters.accepted, state.counters.persisted], [80, 80]);

  // Hooks (um processo por evento) em pares simultâneos: abrir e gravar
  // disputam o mesmo lock e os dois confirmam.
  for (let round = 0; round < 5; round++) {
    const pair = await Promise.all(
      ["x", "y"].map((side) => runHook("claude", claudePayload("pre_tool_bash", { tool_use_id: `hook-${round}-${side}` }), { env })),
    );
    for (const run of pair) assert.deepEqual(run.report.delivery, { bound: true, code: null, entries: 1, committed: 1, persisted: 1, lost: 0 }, `rodada ${round}`);
  }
  const toolUseIds = exportOf(root, id).records.slice(80).map((r) => r.envelope.ids.toolUseId);
  const expectedHooks = Array.from({ length: 5 }, (_, round) => ["x", "y"].map((side) => expectedPseudonym(root, id, `hook-${round}-${side}`))).flat();
  assert.deepEqual([...toolUseIds].sort(), [...expectedHooks].sort());
  assertSegmentConsistent(root, id, "hooks");

  // Conflito é distinguível de aceitação: com o lock ocupado o produtor
  // informa o código, nada dele entra e o restante fica como estava.
  const lock = path.join(storeDir(root), ".lock");
  writeFileSync(lock, "lock alheio\n");
  const before = snapshotTree(captureDir(root, id));
  const refused = await runHermesIngest([], { env, lines: hermesLines("c", 3) });
  assert.equal(refused.status, 0);
  assert.deepEqual(refused.report.delivery, { bound: true, code: "lock_present", entries: 3, committed: 0, persisted: 0, lost: 3 });
  assert.deepEqual(snapshotTree(captureDir(root, id)), before);
  unlinkSync(lock);
  assert.ok(!exportOf(root, id).records.some((r) => r.envelope.ids.toolCallId === expectedPseudonym(root, id, "c-0")));
});

// I25-C46 (issue #25, AC7): o diagnóstico pela rotina do T8-C15, com uma injeção
// existente da pré-carga só no produtor `b`. Na prova antiga, a falha antes do
// commit e a confirmação perdida davam a mesma mensagem (`b` e as contagens);
// aqui a asserção continua vermelha e a evidência separa as duas pela operação,
// pela fase e pelo export.
const injectedInB = (name, value) => ({ b: { [`SKILL_ME_TEST_TRACES_${name}`]: value } });

function failureOf(flow, evidence) {
  try {
    assertProducersConfirmed(flow, evidence);
  } catch (error) {
    return error;
  }
  return null;
}

// Falhou a asserção de sempre (`actual` e `expected` dela) sobre o produtor
// `name`, e a mensagem começa pelo nome e pela evidência inteira; o Node anexa
// o diff dos valores depois dela.
function assertFailedWithEvidence(failure, name, flow, evidence) {
  assert.ok(failure instanceof assert.AssertionError, `a asserção do T8-C15 continua vermelha: ${failure}`);
  assert.deepEqual([failure.actual, failure.expected], [flow.runs[name].report.delivery, { bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0 }]);
  assert.ok(failure.message.startsWith(`${name}\n${describeProducers(evidence)}`), failure.message);
}

function assertNoLeak(flow, text) {
  const key = readFileSync(path.join(captureDir(flow.root, flow.id), "key"));
  const secrets = [flow.root, flow.id, key.toString("hex"), key.toString("base64"), key.toString("base64url"), "sessao-a", "sessao-b", process.env.PATH];
  for (const value of secrets.filter(Boolean)) assert.ok(!text.includes(value), "a evidência não traz caminho, ID, chave, conteúdo nem ambiente");
  assert.deepEqual(leaks(text), []);
}

test("I25-C46 diagnóstico do T8-C15: falha antes do commit mantém a prova vermelha e mostra a operação, a fase e o export sem as entradas perdidas", async () => {
  const flow = await runConcurrentProducers("i25 c46 antes", injectedInB("SEGMENT_EIO", "1"));
  const evidence = inspectProducers(flow);
  const failure = failureOf(flow, evidence);
  assertFailedWithEvidence(failure, "b", flow, evidence);
  const { a, b } = evidence.producers;
  assert.deepEqual([a.delivery, a.timing.failures], [{ bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0 }, []], failure.message);
  const { code, committed, persisted, lost } = b.delivery;
  assert.ok(code === "io_failure" && lost > 0 && committed + lost === 40 && persisted === committed, failure.message);
  assert.deepEqual(b.timing.failures, ["rename segmento.tmp EIO (antes do commit)"], "a injeção aconteceu, sem nova tentativa");
  // As entradas perdidas não estão no disco: o export só tem as confirmadas.
  const total = 40 + committed;
  assert.deepEqual(
    evidence.capture,
    {
      export: { records: total, a: 40, b: committed, others: 0, repeated: 0 },
      status: { state: "active", accepted: total, persisted: total },
      files: { segments: 1, temporaries: 0 },
      lock: { present: false },
    },
    failure.message,
  );
  assert.ok(failure.message.includes("falhas rename segmento.tmp EIO (antes do commit)"), failure.message);
  assert.ok(failure.message.includes(`captura: export ${total} registros: a 40/40, b ${committed}/40, outros 0, repetidos 0`), failure.message);
  assertNoLeak(flow, failure.message);
});

test("I25-C46 diagnóstico do T8-C15: confirmação perdida depois do commit mantém a prova vermelha e mostra que as entradas dadas como perdidas estão no export", async () => {
  const flow = await runConcurrentProducers("i25 c46 depois", injectedInB("LOST_CONFIRMATION", "2"));
  const evidence = inspectProducers(flow);
  const failure = failureOf(flow, evidence);
  assertFailedWithEvidence(failure, "b", flow, evidence);
  const { a, b } = evidence.producers;
  assert.deepEqual([a.delivery, a.timing.failures], [{ bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0 }, []], failure.message);
  const { code, committed, persisted, lost } = b.delivery;
  assert.ok(code === "io_failure" && lost > 0 && committed + lost === 40 && persisted === committed, failure.message);
  // A liberação é o rename do `.lock` (C46 (u)): a injeção foi para ele.
  assert.deepEqual(b.timing.failures, ["rename lock EIO (depois do commit)"], "a injeção aconteceu, sem nova tentativa");
  // O commit aconteceu: as entradas dadas como perdidas estão no export.
  assert.deepEqual(
    evidence.capture,
    {
      export: { records: 80, a: 40, b: 40, others: 0, repeated: 0 },
      status: { state: "active", accepted: 80, persisted: 80 },
      files: { segments: 1, temporaries: 0 },
      lock: { present: false },
    },
    failure.message,
  );
  assert.ok(failure.message.includes("falhas rename lock EIO (depois do commit)"), failure.message);
  assert.ok(failure.message.includes("captura: export 80 registros: a 40/40, b 40/40, outros 0, repetidos 0"), failure.message);
  assertNoLeak(flow, failure.message);
});

test("I25-C46 diagnóstico do T8-C15: com o lock preso, export e status saem indisponíveis com o código, sem contagem presumida", async () => {
  const flow = await runConcurrentProducers("i25 c46 lock", injectedInB("LOCK_KEPT", "2"));
  const evidence = inspectProducers(flow);
  const failure = failureOf(flow, evidence);
  const first = PRODUCERS.find((name) => flow.runs[name].status !== 0 || !isDeepStrictEqual(flow.runs[name].report.delivery, { bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0 }));
  assertFailedWithEvidence(failure, first, flow, evidence);
  const { b } = evidence.producers;
  assert.deepEqual(b.delivery, { bound: true, code: "io_failure", entries: 40, committed: 0, persisted: 0, lost: 40 }, failure.message);
  // O rename que libera falhou sem mover (C46 (u)): a limpeza confere o retirado,
  // que não existe, e a posse fica indeterminada em vez de “fora do lock”.
  assert.deepEqual(b.timing.failures, ["rename lock EIO (depois do commit)", `lstat lock.retirado ENOENT (${UNSURE_PLACE})`], "a injeção aconteceu, sem nova tentativa");
  assert.deepEqual(
    evidence.capture,
    {
      export: { unavailable: "lock_present" },
      status: { unavailable: "lock_present" },
      files: { segments: 1, temporaries: 0 },
      lock: { present: true },
    },
    failure.message,
  );
  assert.ok(failure.message.includes("captura: export indisponível [lock_present]; status indisponível [lock_present]; pasta 1 segmento(s), 0 temporário(s); lock presente"), failure.message);
  assertNoLeak(flow, failure.message);
});

test("T8-C16 delivery failure neutrality: lock ocupado, falha de E/S e confirmação perdida não prendem o agente, só dão código fechado e não reenviam", async (t) => {
  const root = scratch("t8 c16 raiz");
  const id = startCapture(root);
  const env = boundEnv(root, id);
  const lock = path.join(storeDir(root), ".lock");

  // 1. Lock ocupado: o hook lê o evento e desiste até o prazo; stdout vazio e exit 0.
  writeFileSync(lock, "lock alheio\n");
  const before = snapshotTree(captureDir(root, id));
  const held = await runHook("claude", claudePayload("pre_tool_bash"), { env, writeAfterMs: 1000 });
  const heldElapsed = held.closedAt - held.stdinClosedAt;
  assert.equal(held.status, 0);
  assert.equal(held.stdout, "");
  assert.equal(held.stderr, "");
  assert.deepEqual(held.report.delivery, { bound: true, code: "lock_present", entries: 1, committed: 0, persisted: 0, lost: 1 });
  assert.ok(heldElapsed <= DELIVERY_DEADLINE_MS + PROCESS_EXIT_ALLOWANCE_MS, `hook: ${Math.round(heldElapsed)} ms do fim do stdin à saída`);
  t.diagnostic(`hook com lock ocupado: ${Math.round(heldElapsed)} ms do fim do stdin à saída do processo`);
  const dir = scratch("t8 c16 wrapper");
  const scenario = writeScenario(dir, "c16", [{ stdout: '{"type":"thread.started","thread_id":"t"}' }]);
  const wrapped = await runWrapper({ args: ["p"], env: boundEnv(root, id, { FAKE_CODEX_SCENARIO: scenario, FAKE_CODEX_EXIT: "9" }), cwd: dir });
  assert.equal(wrapped.status, 9);
  assert.deepEqual(wrapped.stdout, Buffer.from('{"type":"thread.started","thread_id":"t"}\n'));
  assert.equal(wrapped.report.delivery.code, "lock_present");
  assert.equal(readFileSync(lock, "utf8"), "lock alheio\n", "lock alheio nunca é removido");
  assert.deepEqual(snapshotTree(captureDir(root, id)), before, "nada gravado");
  unlinkSync(lock);

  // 2. Falha real de E/S no commit (rename do state.json): exit 0, código fechado, nada parcial.
  const io = await runHook("claude", claudePayload("pre_tool_bash"), {
    env: { ...env, SKILL_ME_TEST_FS_PROBE_FAIL_RENAME_TO: "state.json" },
    nodeArgs: ["--import", FS_PROBE],
  });
  assert.equal(io.status, 0);
  assert.equal(io.stdout, "");
  assert.deepEqual(io.report.delivery, { bound: true, code: "io_failure", entries: 1, committed: 0, persisted: 0, lost: 1 });
  assert.deepEqual(snapshotTree(captureDir(root, id)), before, "commit desfeito, sem temporário");

  // 3. Confirmação perdida: o commit aconteceu, o hook vê a falha e não reenvia.
  // O usuário vê a mesma perda no arquivo de diagnóstico.
  const lostReport = path.join(scratch("t8 c16 confirmação"), "entregas.ndjson");
  const lost = await runHook("claude", claudePayload("pre_tool_bash", { tool_use_id: "perdido-1" }), {
    env: { ...env, SKILL_ME_TEST_TRACES_LOST_CONFIRMATION: "2", [CAPTURE_REPORT_ENV]: lostReport },
    nodeArgs: ["--import", TRACES_PROBE],
  });
  assert.equal(lost.status, 0);
  assert.deepEqual(lost.report.delivery, { bound: true, code: "io_failure", entries: 1, committed: 0, persisted: 0, lost: 1 });
  const [lostLine, ...extra] = diagnostics(lostReport);
  assert.deepEqual(extra, []);
  assertDiagnostic(lostLine, { agent: "claude", capture: id, delivery: lost.report.delivery }, "confirmação perdida");
  assert.deepEqual(exportOf(root, id).records.map((r) => r.envelope.ids.toolUseId), [expectedPseudonym(root, id, "perdido-1")], "uma ocorrência, sem retry");
  // Num fluxo, o lote seguinte segue normalmente e o perdido não é reenviado.
  const stream = await runHermesIngest([], {
    env: { ...env, SKILL_ME_TEST_TRACES_LOST_CONFIRMATION: "2" },
    nodeArgs: ["--import", TRACES_PROBE],
    lines: [hermesLines("s", 1)[0], 400, hermesLines("t", 1)[0]],
  });
  assert.deepEqual(stream.report.delivery, { bound: true, code: "io_failure", entries: 2, committed: 1, persisted: 1, lost: 1 });
  const callIds = exportOf(root, id).records.map((r) => r.envelope.ids.toolCallId).filter(Boolean);
  assert.deepEqual(callIds, [expectedPseudonym(root, id, "s-0"), expectedPseudonym(root, id, "t-0")]);
  assert.equal(statusOf(root, id).counters.persisted, 3);
  assertSegmentConsistent(root, id, "depois das falhas");

  // 4. Em processo: o prazo vale do evento lido, com lock ocupado ou disco parado.
  writeFileSync(lock, "lock alheio\n");
  const payload = claudePayload("pre_tool_bash");
  const busy = createCaptureDelivery({ root, id, agent: "claude" });
  let started = performance.now();
  busy.submit(claudeHookDraft(payload), payload);
  await busy.settle();
  const busyElapsed = performance.now() - started;
  assert.equal(busy.report().code, "lock_present");
  assert.ok(busyElapsed <= DELIVERY_DEADLINE_MS, `lock ocupado: ${Math.round(busyElapsed)} ms`);
  t.diagnostic(`em processo, lock ocupado: ${Math.round(busyElapsed)} ms da entrada ao fim da tentativa`);
  unlinkSync(lock);
  const real = createStoreIo();
  const stalled = createCaptureDelivery({
    root,
    id,
    agent: "claude",
    io: { ...real, writeExclusive: (file, data) => (path.basename(file) === ".lock" ? new Promise(() => {}) : real.writeExclusive(file, data)) },
  });
  started = performance.now();
  stalled.submit(claudeHookDraft(payload), payload);
  await stalled.settle();
  const stalledElapsed = performance.now() - started;
  assert.deepEqual(stalled.report(), { bound: true, code: "delivery_timeout", entries: 1, committed: 0, persisted: 0, lost: 1 });
  assert.ok(stalledElapsed <= DELIVERY_DEADLINE_MS, `disco parado: ${Math.round(stalledElapsed)} ms`);
  t.diagnostic(`em processo, disco parado: ${Math.round(stalledElapsed)} ms da entrada ao abandono`);
  assert.equal(statusOf(root, id).counters.persisted, 3, "nada além das confirmações acima");
});

test("T8-C16 delivery failure neutrality: no uso normal, sem o relatório de fixture, cada produtor que perde entregas deixa código fechado e contagens no arquivo de SKILL_ME_CAPTURE_REPORT", async (t) => {
  const base = scratch("t8 c16 uso normal");
  const root = path.join(base, "capturas ação");
  const project = path.join(base, "projeto");
  mkdirSync(root);
  mkdirSync(path.join(project, ".claude"), { recursive: true });
  mkdirSync(path.join(project, ".codex"));
  const id = startCapture(root);
  const reportFile = path.join(base, "diagnóstico de entrega.ndjson");
  const lock = path.join(storeDir(root), ".lock");

  // Hooks pela linha que o instalador grava; o Codex os roda pelo shell.
  const codexExtra = process.platform === "win32" ? { HOME: project } : { HOME: project, SHELL: "/bin/sh" };
  assert.equal(runIntegrationsJson(["install", "--agent", "claude", "--target", path.join(project, ".claude"), "--apply"], { env: baseEnv() }).status, 0);
  assert.equal(runIntegrationsJson(["install", "--agent", "codex", "--target", path.join(project, ".codex"), "--apply"], { env: baseEnv(codexExtra) }).status, 0);
  const claudeHook = readClaudeHandlers(path.join(project, ".claude")).PreToolUse.handler;
  const codexHook = readCodexHandlers(path.join(project, ".codex")).PreToolUse.handler;
  const env = boundEnv(root, id, { ...codexExtra, [CAPTURE_REPORT_ENV]: reportFile });
  const neutral = (run, label) => {
    assert.equal(run.status, 0, label);
    assert.equal(run.stdout, "", label);
    assert.equal(run.stderr, "", label);
  };

  // 0. Entrega confirmada: o produtor não escreve diagnóstico, nem cria o arquivo.
  neutral(await runClaudeHandler(claudeHook, claudePayload("pre_tool_bash"), { env, cwd: project, reportFd: null }), "confirmada");
  assert.equal(statusOf(root, id).counters.persisted, 1);
  assert.equal(existsSync(reportFile), false, "sem falha, sem arquivo");

  // 1. Lock ocupado: cada produtor sai como sempre e deixa uma linha.
  writeFileSync(lock, "lock alheio\n");
  const before = snapshotTree(captureDir(root, id));
  neutral(await runClaudeHandler(claudeHook, claudePayload("pre_tool_bash"), { env, cwd: project, reportFd: null }), "claude");
  neutral(await runCodexHandler(codexHook, codexHookPayload("pre_tool_bash"), { env, cwd: project, reportFd: null }), "codex");
  neutral(await runHermesIngest([], { env, lines: hermesLines("d", 2), fixtureReport: false }), "hermes");
  const held = await runHook("claude", claudePayload("pre_tool_bash"), { env, writeAfterMs: 1000, fixtureReport: false });
  neutral(held, "hook medido");
  const heldElapsed = held.closedAt - held.stdinClosedAt;
  assert.ok(heldElapsed <= DELIVERY_DEADLINE_MS + PROCESS_EXIT_ALLOWANCE_MS, `hook com diagnóstico: ${Math.round(heldElapsed)} ms do fim do stdin à saída`);
  t.diagnostic(`hook com lock ocupado e diagnóstico: ${Math.round(heldElapsed)} ms do fim do stdin à saída do processo`);
  const execLine = JSON.stringify(execEvent("thread_started"));
  const stderrCopy = path.join(base, "stderr do filho.bin");
  const scenario = writeScenario(base, "c16 normal", [{ stdout: execLine }, { stderr: "stderr nativo ação" }]);
  const wrapped = await runWrapper({ args: ["p"], env: { ...env, FAKE_CODEX_SCENARIO: scenario, FAKE_CODEX_EXIT: "9", FAKE_CODEX_STDERR_COPY: stderrCopy }, cwd: base, reportFd: null });
  assert.equal(wrapped.status, 9);
  assert.deepEqual(wrapped.stdout, Buffer.from(execLine + "\n"));
  assert.deepEqual(wrapped.stderrBytes, readFileSync(stderrCopy), "stderr do wrapper = stderr do filho");
  let lines = diagnostics(reportFile);
  assert.equal(lines.length, 5);
  assertDiagnostic(lines[0], { agent: "claude", capture: id, delivery: lostAll("lock_present", 1) }, "claude");
  assertDiagnostic(lines[1], { agent: "codex-hooks", capture: id, delivery: lostAll("lock_present", 1) }, "codex");
  assertDiagnostic(lines[2], { agent: "hermes", capture: id, delivery: lostAll("lock_present", 2) }, "hermes");
  assertDiagnostic(lines[3], { agent: "claude", capture: id, delivery: lostAll("lock_present", 1) }, "hook medido");
  // Linha do thread.started e o process.exit: o wrapper desistiu da captura antes do filho.
  assertDiagnostic(lines[4], { agent: "codex-exec", capture: id, delivery: lostAll("lock_present", 2) }, "wrapper");

  // Produtores simultâneos: uma linha inteira por processo.
  const parallel = await Promise.all(Array.from({ length: 4 }, () => runHook("claude", claudePayload("pre_tool_bash"), { env, fixtureReport: false })));
  for (const run of parallel) neutral(run, "paralelo");
  lines = diagnostics(reportFile);
  assert.equal(lines.length, 9);
  for (const line of lines.slice(5)) assertDiagnostic(line, { agent: "claude", capture: id, delivery: lostAll("lock_present", 1) }, "paralelo");
  assert.equal(readFileSync(lock, "utf8"), "lock alheio\n");
  assert.deepEqual(snapshotTree(captureDir(root, id)), before, "nada gravado na captura");
  unlinkSync(lock);

  // 2. Falha real de E/S no commit: uma pasta ocupa o nome do próximo segmento
  // e o rename do sistema operacional falha.
  const blocker = path.join(captureDir(root, id), "events-000002.ndjson");
  mkdirSync(blocker);
  const beforeIo = snapshotTree(captureDir(root, id));
  neutral(await runClaudeHandler(claudeHook, claudePayload("pre_tool_bash"), { env, cwd: project, reportFd: null }), "E/S");
  assert.deepEqual(snapshotTree(captureDir(root, id)), beforeIo, "commit desfeito, sem temporário");
  rmdirSync(blocker);
  lines = diagnostics(reportFile);
  assert.equal(lines.length, 10);
  assertDiagnostic(lines[9], { agent: "claude", capture: id, delivery: lostAll("io_failure", 1) }, "E/S");
  neutral(await runClaudeHandler(claudeHook, claudePayload("pre_tool_bash"), { env, cwd: project, reportFd: null }), "recuperada");
  assert.equal(statusOf(root, id).counters.persisted, 2, "a falha não conta como registro; a seguinte grava");
  assert.equal(diagnostics(reportFile).length, 10, "entrega confirmada não escreve");

  // 3. Par inválido: o ID fora do formato não é ecoado.
  const invalidId = `${MARKER}-ação`;
  neutral(await runHook("claude", claudePayload("pre_tool_bash"), { env: baseEnv({ SKILL_ME_CAPTURE_ROOT: root, SKILL_ME_CAPTURE_ID: invalidId, [CAPTURE_REPORT_ENV]: reportFile }), fixtureReport: false }), "par inválido");
  lines = diagnostics(reportFile);
  assertDiagnostic(lines[10], { agent: "claude", capture: null, delivery: lostAll("binding_invalid", 1, false) }, "par inválido");

  // 4. Sem vínculo a variável sozinha não escreve; caminho relativo é ignorado;
  // um arquivo impossível de gravar perde o diagnóstico sem o agente perceber.
  neutral(await runHook("claude", claudePayload("pre_tool_bash"), { env: baseEnv({ [CAPTURE_REPORT_ENV]: reportFile }), fixtureReport: false }), "sem vínculo");
  const cwdBefore = readdirSync(project).sort();
  writeFileSync(lock, "lock alheio\n");
  neutral(await runHook("claude", claudePayload("pre_tool_bash"), { env: boundEnv(root, id, { [CAPTURE_REPORT_ENV]: "diagnóstico relativo.ndjson" }), cwd: project, fixtureReport: false }), "relativo");
  assert.deepEqual(readdirSync(project).sort(), cwdBefore, "nada criado no diretório do projeto");
  const unwritable = path.join(base, "não existe", "entregas.ndjson");
  neutral(await runHook("claude", claudePayload("pre_tool_bash"), { env: boundEnv(root, id, { [CAPTURE_REPORT_ENV]: unwritable }), fixtureReport: false }), "impossível");
  const stderrCopyLost = path.join(base, "stderr do filho, diagnóstico perdido.bin");
  const wrappedLost = await runWrapper({
    args: ["p"],
    env: boundEnv(root, id, { [CAPTURE_REPORT_ENV]: unwritable, FAKE_CODEX_SCENARIO: scenario, FAKE_CODEX_EXIT: "9", FAKE_CODEX_STDERR_COPY: stderrCopyLost }),
    cwd: base,
    reportFd: null,
  });
  assert.equal(wrappedLost.status, 9, "impossível: código do filho");
  assert.deepEqual(wrappedLost.stdout, Buffer.from(execLine + "\n"));
  assert.deepEqual(wrappedLost.stderrBytes, readFileSync(stderrCopyLost));
  assert.equal(existsSync(path.dirname(unwritable)), false);
  unlinkSync(lock);

  // 5. Captura encerrada: a perda também aparece.
  privacyOk(["stop", "--root", root, "--capture", id]);
  neutral(await runHermesIngest([], { env, lines: hermesLines("e", 1), fixtureReport: false }), "encerrada");
  lines = diagnostics(reportFile);
  assert.equal(lines.length, 12, "sem vínculo e relativo não escreveram aqui");
  assertDiagnostic(lines[11], { agent: "hermes", capture: id, delivery: lostAll("capture_not_active", 1) }, "encerrada");

  const text = readFileSync(reportFile, "utf8");
  for (const value of [root, base, MARKER, "SKILLME-CANARY", claudePayload("pre_tool_bash").session_id, "Error", "    at "]) assert.ok(!text.includes(value), `vazou ${value}`);
  if (process.platform !== "win32") assert.equal(statSync(reportFile).mode & 0o077, 0, "arquivo só do dono");
});

test("T8-C16 delivery failure neutrality: o diagnóstico só recebe linha de falha, só em arquivo regular de caminho absoluto, e nunca lança", async (t) => {
  // Configuração: só caminho absoluto.
  const dir = scratch("t8 c16 arquivo");
  const file = path.join(dir, "entregas ação.ndjson");
  for (const [label, env, expected] of [
    ["ausente", {}, null],
    ["vazia", { [CAPTURE_REPORT_ENV]: "" }, null],
    ["relativa", { [CAPTURE_REPORT_ENV]: "entregas.ndjson" }, null],
    ["absoluta", { [CAPTURE_REPORT_ENV]: file }, file],
  ])
    assert.equal(deliveryReportFile(env), expected, label);

  // Decisão: sem código e sem perda não há linha; código sozinho (captura que
  // não abriu antes de qualquer entrada) ou perda geram a linha completa.
  const at = "2026-10-18T12:00:00.000Z";
  const capture = "a".repeat(32);
  assert.equal(deliveryReportLine({ summary: { bound: true, code: null, entries: 3, committed: 3, persisted: 2, lost: 0 }, capture, agent: "hermes", at }), null);
  for (const summary of [
    { bound: true, code: "capture_not_active", entries: 0, committed: 0, persisted: 0, lost: 0 },
    { bound: true, code: "lock_present", entries: 3, committed: 2, persisted: 2, lost: 1 },
    { bound: false, code: "binding_invalid", entries: 1, committed: 0, persisted: 0, lost: 1 },
  ]) {
    const line = deliveryReportLine({ summary, capture, agent: "hermes", at });
    assert.ok(line.endsWith("\n") && !line.slice(0, -1).includes("\n"), summary.code);
    assert.deepEqual(JSON.parse(line), { skillMeDeliveryReport: 1, at, agent: "hermes", capture, delivery: summary }, summary.code);
  }

  // Efeito: cria o arquivo e acrescenta sem tocar no que já havia.
  const deadline = () => performance.now() + 500;
  await appendDeliveryReport(file, "primeira\n", deadline());
  await appendDeliveryReport(file, "segunda\n", deadline());
  assert.equal(readFileSync(file, "utf8"), "primeira\nsegunda\n");

  // Pasta no lugar do arquivo e pasta-mãe ausente: nada muda e nada lança.
  const asDir = path.join(dir, "é uma pasta");
  mkdirSync(asDir);
  const dirBefore = snapshotTree(dir);
  await appendDeliveryReport(asDir, "x\n", deadline());
  await appendDeliveryReport(path.join(dir, "não existe", "entregas.ndjson"), "x\n", deadline());
  assert.deepEqual(snapshotTree(dir), dirBefore);

  // Link para um arquivo: o alvo fica intocado.
  const target = path.join(dir, "alvo.txt");
  writeFileSync(target, "alvo\n");
  const link = path.join(dir, "link.ndjson");
  let linked = true;
  try {
    symlinkSync(target, link, "file");
  } catch (error) {
    if (process.platform !== "win32" || error.code !== "EPERM") throw error;
    linked = false;
    t.diagnostic("link de arquivo: o Windows exige privilégio para criar o link; caso não exercitado nesta execução");
  }
  if (linked) {
    await appendDeliveryReport(link, "x\n", deadline());
    assert.equal(readFileSync(target, "utf8"), "alvo\n");
  }

  // FIFO sem leitor (POSIX): não prende o processo nem recebe a linha.
  if (process.platform !== "win32") {
    const fifo = path.join(dir, "fila.ndjson");
    execFileSync("mkfifo", [fifo]);
    const started = performance.now();
    await appendDeliveryReport(fifo, "x\n", performance.now() + 5_000);
    assert.ok(performance.now() - started < 1_000, "FIFO não prende");
  } else t.diagnostic("FIFO: só POSIX; no Windows não há FIFO no sistema de arquivos");
});

// Nome curto 8.3 de uma pasta filha no Windows, ou null se o volume não os gera.
function shortName(parent, name) {
  const listing = execFileSync("cmd", ["/d", "/c", "dir", "/x", "/ad", parent], { encoding: "latin1", windowsHide: true });
  const found = new RegExp(`<DIR>\\s+(\\S+)\\s+${name}\\r?$`, "m").exec(listing)?.[1];
  return found === undefined || found === name ? null : found;
}

// Caminhos de SKILL_ME_CAPTURE_ROOT/REPORT que alcançam um arquivo do store, ou
// criam um dentro dele, sem a grafia literal: equivalentes, links de pasta (junção
// no Windows) e hard links. `ctx.dir` é a captura encerrada; `ctx.aside` fica fora da raiz.
function storeReportVariants(t) {
  const state = (ctx) => path.join(ctx.dir, "state.json");
  const dirLink = (target, at) => {
    symlinkSync(target, at, process.platform === "win32" ? "junction" : "dir");
    return at;
  };
  const hardLink = (target, at) => {
    linkSync(target, at);
    return at;
  };
  const variants = [
    { label: "state.json da captura encerrada", report: state },
    { label: "key", report: (ctx) => path.join(ctx.dir, "key") },
    { label: "segmento", report: (ctx) => path.join(ctx.dir, "events-000001.ndjson") },
    { label: "marcador do store", report: (ctx) => path.join(storeDir(ctx.root), "store.json") },
    { label: ".lock ainda ausente", report: (ctx) => path.join(storeDir(ctx.root), ".lock") },
    { label: "arquivo novo na pasta da captura", report: (ctx) => path.join(ctx.dir, "diagnóstico.ndjson") },
    { label: "arquivo novo em captures", report: (ctx) => path.join(capturesDir(ctx.root), "diagnóstico.ndjson") },
    { label: "com . e ..", report: (ctx) => [storeDir(ctx.root), ".", "captures", ctx.closed, "..", ctx.closed, "state.json"].join(path.sep) },
    // No Windows e no macOS é o mesmo arquivo; no Linux, um caminho que não existe.
    { label: "maiúsculas", report: (ctx) => path.join(ctx.root, "SKILL-ME-PRIVACY", "CAPTURES", ctx.closed, "STATE.JSON") },
    { label: "pasta da captura por link", report: (ctx) => path.join(dirLink(ctx.dir, path.join(ctx.aside, "atalho da captura")), "state.json") },
    { label: "store por link", report: (ctx) => path.join(dirLink(storeDir(ctx.root), path.join(ctx.aside, "atalho do store")), "captures", ctx.closed, "state.json") },
    {
      label: "raiz do vínculo e diagnóstico pelo mesmo link",
      env: (ctx, report) => boundEnv(ctx.linkedRoot, ctx.closed, { [CAPTURE_REPORT_ENV]: report }),
      report: (ctx) => path.join((ctx.linkedRoot = dirLink(ctx.root, path.join(ctx.aside, "raiz por link"))), "skill-me-privacy", "captures", ctx.closed, "state.json"),
    },
    { label: "hard link do state.json", report: (ctx) => hardLink(state(ctx), path.join(ctx.aside, "estado.ndjson")) },
    { label: "hard link da key", report: (ctx) => hardLink(path.join(ctx.dir, "key"), path.join(ctx.aside, "chave.ndjson")) },
    {
      label: "par inválido com o state.json",
      code: "binding_invalid",
      env: (ctx, report) => baseEnv({ SKILL_ME_CAPTURE_ROOT: ctx.root, SKILL_ME_CAPTURE_ID: "fora-do-formato", [CAPTURE_REPORT_ENV]: report }),
      report: state,
    },
    {
      label: "state.json da captura ativa com lock ocupado",
      code: "lock_present",
      env: (ctx, report) => boundEnv(ctx.root, ctx.active, { [CAPTURE_REPORT_ENV]: report }),
      report: (ctx) => path.join(captureDir(ctx.root, ctx.active), "state.json"),
      lock: true,
    },
  ];
  if (process.platform === "win32") {
    variants.push(
      { label: "barras normais", report: (ctx) => state(ctx).replaceAll("\\", "/") },
      { label: "prefixo \\\\?\\", report: (ctx) => `\\\\?\\${state(ctx)}` },
      { label: "ponto final no nome", report: (ctx) => `${state(ctx)}.` },
      { label: "fluxo ::$DATA", report: (ctx) => `${state(ctx)}::$DATA` },
      // Fluxo nomeado da própria pasta do store: a árvore não o mostra, só o
      // arquivo criado. Em maiúsculas, porque o realpath da pasta-mãe não toca no nome final.
      { label: "fluxo nomeado da pasta do store, em maiúsculas", report: (ctx) => path.join(ctx.root, "SKILL-ME-PRIVACY:diagnóstico.ndjson") },
      {
        label: "nome curto 8.3 do store",
        report: (ctx) => {
          const short = shortName(ctx.root, "skill-me-privacy");
          if (short === null) return null;
          return path.join(ctx.root, short, "captures", ctx.closed, "state.json");
        },
      },
    );
  } else t.diagnostic("barras, \\\\?\\, ponto final, ::$DATA e nome 8.3: grafias só do Windows");
  return variants;
}

// O que o usuário não poderia mais fazer com o store: cada operação pública que
// falhar ou responder diferente do modelo vira um item.
async function storeDamage(root, { closed, active, exported }) {
  const damage = [];
  const attempt = async (label, operation) => {
    try {
      const problem = await operation();
      if (problem) damage.push(`${label}: ${problem}`);
    } catch (error) {
      damage.push(`${label}: ${error.code ?? error.message}`);
    }
  };
  await attempt("export da encerrada", async () => !isDeepStrictEqual(await exportCapture({ root, id: closed }), exported.closed) && "diferente");
  await attempt("export da ativa", async () => !isDeepStrictEqual(await exportCapture({ root, id: active }), exported.active) && "diferente");
  await attempt("list", async () => {
    const { captures, failed } = await listCaptures({ root });
    return (failed.length > 0 || captures.length !== 2) && JSON.stringify(failed);
  });
  await attempt("prune", async () => {
    const { failed } = await pruneCaptures({ root });
    return failed.length > 0 && JSON.stringify(failed);
  });
  await attempt("delete --apply", async () => !(await deleteCapture({ root, id: closed, apply: true })).deleted && "não apagou");
  return damage;
}

test("T8-C16 delivery failure neutrality: SKILL_ME_CAPTURE_REPORT dentro do store, por qualquer grafia, link ou hard link, não altera a captura nem impede consulta e exclusão", async (t) => {
  // Modelo copiado para cada variante: captura encerrada com um registro e uma ativa vazia.
  const base = scratch("t8 c16 store");
  const template = path.join(base, "modelo");
  mkdirSync(template);
  const closed = startCapture(template);
  assert.equal((await runHook("claude", claudePayload("pre_tool_bash"), { env: boundEnv(template, closed) })).report.delivery.persisted, 1);
  privacyOk(["stop", "--root", template, "--capture", closed]);
  const active = startCapture(template);
  const exported = { closed: await exportCapture({ root: template, id: closed }), active: await exportCapture({ root: template, id: active }) };
  assert.equal(exported.closed.records.length, 1);

  const damaged = [];
  for (const [index, variant] of storeReportVariants(t).entries()) {
    const ctx = { root: path.join(base, `raiz ${index} ação`), aside: path.join(base, `fora ${index}`), closed, active };
    await cp(template, ctx.root, { recursive: true });
    mkdirSync(ctx.aside);
    ctx.dir = captureDir(ctx.root, closed);
    const report = variant.report(ctx);
    if (report === null) {
      t.diagnostic(`${variant.label}: o volume não gera nomes 8.3; variante não exercitada`);
      continue;
    }
    const lock = path.join(storeDir(ctx.root), ".lock");
    if (variant.lock) writeFileSync(lock, "lock alheio\n");
    const before = snapshotTree(ctx.root);
    const existed = existsSync(report);
    const env = variant.env ? variant.env(ctx, report) : boundEnv(ctx.root, closed, { [CAPTURE_REPORT_ENV]: report });
    const run = await runHook("claude", claudePayload("pre_tool_bash"), { env });
    // O agente não percebe nada e o código do processo é o da entrega, não o do diagnóstico.
    assert.deepEqual([run.status, run.stdout, run.stderr], [0, "", ""], variant.label);
    assert.equal(run.report.delivery.code, variant.code ?? "capture_not_active", variant.label);
    if (!isDeepStrictEqual(snapshotTree(ctx.root), before)) damaged.push(`${variant.label}: arquivos do store mudaram`);
    if (!existed && existsSync(report)) damaged.push(`${variant.label}: o caminho apontado foi criado`);
    if (variant.lock) {
      if (readFileSync(lock, "utf8") !== "lock alheio\n") damaged.push(`${variant.label}: lock alheio mudou`);
      unlinkSync(lock);
    }
    damaged.push(...(await storeDamage(ctx.root, { closed, active, exported })).map((item) => `${variant.label}: ${item}`));
  }
  assert.deepEqual(damaged, [], "nenhuma grafia do store recebe a linha de diagnóstico");

  // Cenário da revisão pela CLI do usuário: hook tardio numa captura encerrada
  // com o diagnóstico apontado para o state.json dela.
  const root = path.join(base, "raiz da revisão");
  await cp(template, root, { recursive: true });
  const state = path.join(captureDir(root, closed), "state.json");
  const stateBytes = readFileSync(state);
  const late = await runHook("claude", claudePayload("pre_tool_bash"), { env: boundEnv(root, closed, { [CAPTURE_REPORT_ENV]: state }), fixtureReport: false });
  assert.deepEqual([late.status, late.stdout, late.stderr], [0, "", ""]);
  assert.deepEqual(readFileSync(state), stateBytes, "state.json intacto");
  // O mesmo hook com um arquivo fora do store registra o código da entrega, sem vazar nada.
  const valid = path.join(base, "diagnóstico de entrega.ndjson");
  const logged = await runHook("claude", claudePayload("pre_tool_bash"), { env: boundEnv(root, closed, { [CAPTURE_REPORT_ENV]: valid }), fixtureReport: false });
  assert.deepEqual([logged.status, logged.stdout, logged.stderr], [0, "", ""]);
  const lines = diagnostics(valid);
  assert.equal(lines.length, 1);
  assertDiagnostic(lines[0], { agent: "claude", capture: closed, delivery: lostAll("capture_not_active", 1) }, "fora do store");
  for (const value of [root, base, "state.json"]) assert.ok(!readFileSync(valid, "utf8").includes(value), `vazou ${value}`);

  assert.deepEqual(privacyOk(["export", "--root", root, "--capture", closed]).records, exported.closed.records);
  assert.deepEqual(privacyOk(["list", "--root", root]).captures.map((capture) => capture.id).sort(), [closed, active].sort());
  const followed = runIntegrations(["privacy", "follow", "--root", root, "--capture", closed]);
  assert.equal(followed.status, 0);
  assert.deepEqual(followed.stdout.trimEnd().split("\n").map((line) => JSON.parse(line).type), ["record", "end"]);
  assert.deepEqual(privacyOk(["prune", "--root", root]).failed, []);
  assert.equal(privacyOk(["delete", "--root", root, "--capture", closed, "--apply"]).deleted, true);
  assert.ok(!existsSync(captureDir(root, closed)));
});

// io do store em processo com um roteiro: `busy` (1-based) são as criações do
// `.lock` que falham com EEXIST sem tocar no disco; `stall(file, kind, stats)`
// devolve uma promessa que segura aquela operação (ou null para seguir).
// `lockReleases` conta as liberações completas do lock: o `rmdir` da reserva,
// último passo depois do rename que libera (C46 (u)); antes era o `unlink` do
// `.lock`, então as esperas continuam pelo fim real da liberação.
function scriptedIo({ busy = [], stall = () => null }) {
  const real = createStoreIo();
  const stats = { lockCreations: 0, lockReleases: 0 };
  const isLock = (file) => path.basename(file) === ".lock";
  const isReservation = (dir) => /^\.lock-release-[A-Za-z0-9]{6}$/.test(path.basename(dir));
  return {
    stats,
    io: {
      ...real,
      async writeExclusive(file, data) {
        if (isLock(file) && busy.includes(++stats.lockCreations)) throw Object.assign(new Error("EEXIST simulado"), { code: "EEXIST" });
        await stall(file, "write", stats);
        return real.writeExclusive(file, data);
      },
      async readBounded(file, maxBytes) {
        await stall(file, "read", stats);
        return real.readBounded(file, maxBytes);
      },
      async rmdir(dir) {
        await real.rmdir(dir);
        if (isReservation(dir)) stats.lockReleases += 1;
      },
    },
  };
}

const gate = () => {
  let open;
  const promise = new Promise((resolve) => (open = resolve));
  return { promise, open };
};
const isSegmentTemp = (file) => /^events-\d{6}\.ndjson\.[0-9a-f]{8}\.skill-me-tmp$/.test(path.basename(file));

// Uma entrada do Claude entregue em processo; devolve o tempo da entrada ao fim da tentativa.
async function deliverOne(delivery, toolUseId) {
  const payload = claudePayload("pre_tool_bash", { tool_use_id: toolUseId });
  const started = performance.now();
  delivery.submit(claudeHookDraft(payload), payload);
  await delivery.settle();
  return performance.now() - started;
}

test("T8-C16 delivery failure neutrality: commit cortado no prazo depois de obter o lock na repetição sai como delivery_timeout, e a confirmação é incerta", async (t) => {
  // Cenário da revisão: o commit encontra o lock ocupado, a repetição obtém o
  // lock e o disco para no segmento. Criação 1 do lock = abertura, 2 = commit ocupado, 3 = repetição.
  const root = scratch("t8 c16 prazo commit");
  const id = startCapture(root);
  const disk = gate();
  const commit = scriptedIo({ busy: [2], stall: (file, kind) => (kind === "write" && isSegmentTemp(file) ? disk.promise : null) });
  const delivery = createCaptureDelivery({ root, id, agent: "claude", io: commit.io });
  const elapsed = await deliverOne(delivery, "prazo-commit");
  assert.deepEqual(delivery.report(), { bound: true, code: "delivery_timeout", entries: 1, committed: 0, persisted: 0, lost: 1 });
  assert.ok(elapsed <= DELIVERY_DEADLINE_MS, `commit parado: ${Math.round(elapsed)} ms`);
  t.diagnostic(`em processo, lock obtido na repetição e disco parado: ${Math.round(elapsed)} ms da entrada ao abandono`);
  assert.equal(commit.stats.lockCreations, 3, "a repetição obteve o lock");
  // Liberado o disco, o commit que já tinha o lock termina: a entrada contada
  // como perdida está gravada uma vez — por isso o código não afirma o lock ocupado.
  disk.open();
  await waitUntil(() => commit.stats.lockReleases === 2, { label: "commit abandonado terminar" });
  assert.deepEqual(exportOf(root, id).records.map((r) => r.envelope.ids.toolUseId), [expectedPseudonym(root, id, "prazo-commit")]);
  assertSegmentConsistent(root, id, "commit depois do prazo");
});

test("T8-C16 delivery failure neutrality: abertura cortada no prazo depois de obter o lock na repetição sai como delivery_timeout", async () => {
  // Criação 1 do lock ocupada, 2 obtida; a leitura do state.json sob o lock para.
  const root = scratch("t8 c16 prazo abertura");
  const id = startCapture(root);
  const read = gate();
  let stateReads = 0;
  const opening = scriptedIo({
    busy: [1],
    stall: (file, kind) => (kind === "read" && path.basename(file) === "state.json" && ++stateReads === 1 ? read.promise : null),
  });
  const before = snapshotTree(captureDir(root, id));
  const delivery = createCaptureDelivery({ root, id, agent: "claude", io: opening.io });
  assert.ok((await deliverOne(delivery, "prazo-abertura")) <= DELIVERY_DEADLINE_MS);
  assert.deepEqual(delivery.report(), { bound: true, code: "delivery_timeout", entries: 1, committed: 0, persisted: 0, lost: 1 });
  assert.deepEqual([opening.stats.lockCreations, stateReads], [2, 1], "a repetição obteve o lock e parou na leitura");
  read.open();
  await waitUntil(() => opening.stats.lockReleases === 1, { label: "abertura abandonada terminar" });
  assert.deepEqual(snapshotTree(captureDir(root, id)), before, "abertura só lê");
});

test("T8-C16 delivery failure neutrality: tentativa cortada no prazo antes de obter o lock sai como lock_present e, obtido o lock depois, não grava nada", async () => {
  // Criação 1 do lock = abertura; 2 = commit ocupado; a 3 (repetição) fica parada
  // até depois do prazo, antes de existir o lock.
  const root = scratch("t8 c16 prazo sem lock");
  const id = startCapture(root);
  const lockDisk = gate();
  const contended = scriptedIo({
    busy: [2],
    stall: (file, kind, stats) => (kind === "write" && path.basename(file) === ".lock" && stats.lockCreations === 3 ? lockDisk.promise : null),
  });
  const before = snapshotTree(captureDir(root, id));
  const delivery = createCaptureDelivery({ root, id, agent: "claude", io: contended.io });
  assert.ok((await deliverOne(delivery, "prazo-sem-lock")) <= DELIVERY_DEADLINE_MS);
  assert.deepEqual(delivery.report(), { bound: true, code: "lock_present", entries: 1, committed: 0, persisted: 0, lost: 1 });
  assert.equal(contended.stats.lockCreations, 3, "a repetição estava em curso no prazo");
  // Liberado o disco, a tentativa abandonada obtém o lock e o devolve sem mutação.
  lockDisk.open();
  await waitUntil(() => contended.stats.lockReleases === 2, { label: "tentativa abandonada liberar o lock" });
  assert.deepEqual(snapshotTree(captureDir(root, id)), before, "lock_present: nada gravado depois do prazo");
  assert.ok(!existsSync(path.join(storeDir(root), ".lock")), "lock liberado");
  assert.equal(statusOf(root, id).counters.persisted, 0);
});

// Prazo da entrega pelo relógio injetado (issue #25, refinamento do C46 (p);
// linha "Abandono terminal no prazo da entrega" do Landing): a entrada é lida
// com o relógio em 0, então o prazo da tentativa é ATTEMPT_MS nesse relógio. O
// roteiro só move o relógio; o timer do prazo continua o real.
const LOCK_DEADLINE = ATTEMPT_MS;

test("I25-C46 prazo da entrega: depois de uma recusa do lock, a repetição abandonada pelo timer com o relógio ainda aquém do prazo é a última tentativa e não grava", async () => {
  // Criação 1 do lock = abertura; 2 = commit ocupado; 3 = repetição parada antes de
  // existir o lock, com o relógio 0,5 abaixo do prazo quando o timer dispara (o caso
  // do T8-C16 no gate B final).
  const root = scratch("i25 c46 prazo repeticao");
  const id = startCapture(root);
  const lockDisk = gate();
  let now = 0;
  const contended = scriptedIo({
    busy: [2],
    stall: (file, kind, stats) => {
      if (kind !== "write" || path.basename(file) !== ".lock" || stats.lockCreations < 3) return null;
      // Só com o defeito há a 4ª: ela leva o relógio ao prazo, para a entrega terminar.
      now = stats.lockCreations === 3 ? LOCK_DEADLINE - 0.5 : LOCK_DEADLINE;
      return lockDisk.promise;
    },
  });
  const before = snapshotTree(captureDir(root, id));
  const delivery = createCaptureDelivery({ root, id, agent: "claude", io: contended.io, clock: () => now });
  assert.ok((await deliverOne(delivery, "prazo-relogio")) <= DELIVERY_DEADLINE_MS);
  assert.deepEqual(delivery.report(), { bound: true, code: "lock_present", entries: 1, committed: 0, persisted: 0, lost: 1 });
  assert.equal(contended.stats.lockCreations, 3, "nenhuma tentativa nova depois da abandonada");
  lockDisk.open();
  await waitUntil(() => contended.stats.lockReleases === 2, { label: "tentativa abandonada liberar o lock" });
  assert.equal(contended.stats.lockCreations, 3);
  assert.deepEqual(snapshotTree(captureDir(root, id)), before, "nada gravado depois do prazo");
  assert.ok(!existsSync(path.join(storeDir(root), ".lock")), "lock liberado");
  assert.equal(statusOf(root, id).counters.persisted, 0);
});

// io roteirizado que leva o relógio a `at` quando a criação real `creation` do
// lock termina, antes de o store chamar o onLock. O timer do prazo é o real e o
// roteiro não o controla: ele pode resolver a entrega antes (linha "Fim da
// liberação esperado na prova do lock tardio" do Landing).
function lockTakenAt(clock, { busy, creation, at }) {
  const scripted = scriptedIo({ busy });
  return {
    stats: scripted.stats,
    io: {
      ...scripted.io,
      async writeExclusive(file, data) {
        await scripted.io.writeExclusive(file, data);
        if (path.basename(file) === ".lock" && scripted.stats.lockCreations === creation) clock.now = at;
      },
    },
  };
}

test("I25-C46 prazo da entrega: lock obtido com o relógio no prazo ou depois, antes do onLock, é devolvido sem gravar e sai com o motivo do prazo", async (t) => {
  for (const [label, busy, creation, code] of [
    ["sem recusa", [], 2, "delivery_timeout"],
    ["depois de uma recusa", [2], 3, "lock_present"],
  ]) {
    for (const [moment, at] of [["no prazo", LOCK_DEADLINE], ["depois do prazo", LOCK_DEADLINE + 1]]) {
      const name = `${label}, ${moment}`;
      const root = scratch(`i25 c46 prazo tardio ${creation} ${at}`);
      const id = startCapture(root);
      const clock = { now: 0 };
      const late = lockTakenAt(clock, { busy, creation, at });
      const before = snapshotTree(captureDir(root, id));
      const delivery = createCaptureDelivery({ root, id, agent: "claude", io: late.io, clock: () => clock.now });
      await deliverOne(delivery, "prazo-tardio");
      assert.deepEqual(delivery.report(), { bound: true, code, entries: 1, committed: 0, persisted: 0, lost: 1 }, name);
      // A entrega pode voltar pelo timer com a liberação da tentativa ainda em
      // curso (o agente não espera o disco), então as pós-condições valem depois
      // do fim dela. Só o observado sai: 2 no retorno não diz quem resolveu a
      // corrida, e 1 não diz por quê.
      const releasedAtReturn = late.stats.lockReleases;
      await waitUntil(() => late.stats.lockReleases === 2, { label: `${name}: a tentativa tardia devolver o próprio lock` });
      t.diagnostic(`${name}: no retorno da entrega, ${releasedAtReturn} de 2 liberações concluídas; depois da espera, 2`);
      assert.deepEqual([late.stats.lockCreations, late.stats.lockReleases], [creation, 2], `${name}: a abertura e a tentativa tardia devolveram o próprio lock`);
      assert.deepEqual(snapshotTree(captureDir(root, id)), before, `${name}: nada gravado`);
      assert.ok(!existsSync(path.join(storeDir(root), ".lock")), `${name}: lock liberado`);
      assert.equal(statusOf(root, id).counters.persisted, 0, name);
      assert.deepEqual(exportOf(root, id).records, [], name);
    }
  }
});

test("I25-C46 prazo da entrega: lock obtido com o relógio ainda aquém do prazo grava e confirma", async () => {
  const root = scratch("i25 c46 prazo limite");
  const id = startCapture(root);
  const clock = { now: 0 };
  const inTime = lockTakenAt(clock, { busy: [], creation: 2, at: LOCK_DEADLINE - 0.001 });
  const delivery = createCaptureDelivery({ root, id, agent: "claude", io: inTime.io, clock: () => clock.now });
  await deliverOne(delivery, "prazo-limite");
  assert.deepEqual(delivery.report(), { bound: true, code: null, entries: 1, committed: 1, persisted: 1, lost: 0 });
  assert.deepEqual([inTime.stats.lockCreations, inTime.stats.lockReleases], [2, 2]);
  assert.deepEqual(exportOf(root, id).records.map((r) => r.envelope.ids.toolUseId), [expectedPseudonym(root, id, "prazo-limite")]);
  assertSegmentConsistent(root, id, "commit no limite do prazo");
});

test("T8-C16 delivery failure neutrality: no hook real, lock obtido na repetição e disco parado aparecem como delivery_timeout no diagnóstico, sem prender o agente", async (t) => {
  const base = scratch("t8 c16 prazo hook");
  const root = path.join(base, "capturas ação");
  mkdirSync(root);
  const id = startCapture(root);
  const reportFile = path.join(base, "diagnóstico de entrega.ndjson");
  const before = snapshotTree(captureDir(root, id));
  // Criação 1 do lock = abertura; 2 = commit, ocupado; 3 = repetição, obtida; o segmento não termina.
  const run = await runHook("claude", claudePayload("pre_tool_bash"), {
    env: boundEnv(root, id, { [CAPTURE_REPORT_ENV]: reportFile, SKILL_ME_TEST_TRACES_BUSY_LOCK: "2", SKILL_ME_TEST_TRACES_STALL_SEGMENT: "1" }),
    nodeArgs: ["--import", TRACES_PROBE],
    writeAfterMs: 500,
  });
  const elapsed = run.closedAt - run.stdinClosedAt;
  assert.deepEqual([run.status, run.stdout, run.stderr], [0, "", ""]);
  assert.ok(elapsed <= DELIVERY_DEADLINE_MS + PROCESS_EXIT_ALLOWANCE_MS, `hook: ${Math.round(elapsed)} ms do fim do stdin à saída`);
  t.diagnostic(`hook com lock obtido na repetição e disco parado: ${Math.round(elapsed)} ms do fim do stdin à saída do processo`);
  const delivery = lostAll("delivery_timeout", 1);
  assert.deepEqual(run.report.delivery, delivery);
  const lines = diagnostics(reportFile);
  assert.equal(lines.length, 1);
  assertDiagnostic(lines[0], { agent: "claude", capture: id, delivery }, "diagnóstico");
  for (const value of [root, base, MARKER, claudePayload("pre_tool_bash").session_id, "Error", "    at "]) assert.ok(!readFileSync(reportFile, "utf8").includes(value), `vazou ${value}`);
  // O processo saiu com o commit parado e o lock tomado (limite do guia); removido o
  // lock, a captura está como antes, sem temporário.
  const lock = path.join(storeDir(root), ".lock");
  assert.ok(existsSync(lock), "lock do processo que saiu no meio do commit");
  unlinkSync(lock);
  assert.deepEqual(snapshotTree(captureDir(root, id)), before);
  assert.equal(statusOf(root, id).counters.persisted, 0);
});

test("T8-C16 delivery failure neutrality: no hook real, a tentativa só faz flush dos dados confirmados (segmento e state.json); o lock é tomado e liberado sem flush", async () => {
  // Cada flush espera o disco dentro dos 650 ms da tentativa, e no runner
  // Windows da CI as operações com flush são lentas (rodada 6 do build). O lock
  // só serializa processos vivos e continua obrigatório na abertura e no commit.
  const root = scratch("t8 c16 flush");
  const id = startCapture(root);
  const timing = path.join(scratch("t8 c16 flush tempos"), "operações.ndjson");
  // A 1ª entrega cria o segmento; a 2ª lê o anterior, grava o seguinte e apaga o antigo.
  for (const [index, toolUseId] of ["flush-1", "flush-2"].entries()) {
    const run = await runHook("claude", claudePayload("pre_tool_bash", { tool_use_id: toolUseId }), {
      env: boundEnv(root, id, { SKILL_ME_TEST_TRACES_TIMING: timing }),
      nodeArgs: ["--import", TRACES_PROBE],
    });
    const lines = timingLines(timing);
    assert.equal(lines.length, index + 1, `${toolUseId}: uma linha da pré-carga de tempo por hook`);
    assert.deepEqual(run.report.delivery, { bound: true, code: null, entries: 1, committed: 1, persisted: 1, lost: 0 }, `${toolUseId}: ${describeTiming(deliveryTiming(lines.at(-1)))}`);
  }
  for (const [index, { ops }] of timingLines(timing).entries()) {
    const label = `entrega ${index + 1}`;
    assert.deepEqual(
      ops.filter(([op]) => op === "sync").map(([, kind]) => kind),
      ["segmento.tmp", "state.json.tmp"],
      `${label}: flush do segmento e do state.json, nessa ordem, e nenhum outro`,
    );
    // A liberação é o rename do `.lock` (C46 (u)), e cada uma reserva e remove a própria pasta.
    assert.deepEqual(
      [["writeFile", "lock"], ["rename", "lock"], ["mkdtemp", "lock.reserva"], ["rmdir", "lock.reserva"]].map(([name, file]) => ops.filter(([op, kind]) => op === name && kind === file).length),
      [2, 2, 2, 2],
      `${label}: abertura e commit gravaram e liberaram o próprio lock`,
    );
  }
  assert.deepEqual(exportOf(root, id).records.map((r) => r.envelope.ids.toolUseId), ["flush-1", "flush-2"].map((value) => expectedPseudonym(root, id, value)));
  assertSegmentConsistent(root, id, "depois das duas entregas");
});
