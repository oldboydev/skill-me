import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { after, test } from "node:test";
import { claudeHookDraft } from "../../../src/integrations/adapters/claude.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { DELIVERY_DEADLINE_MS, createCaptureDelivery } from "../../../src/integrations/traces/delivery.mjs";
import { CAPTURE_REPORT_ENV, appendDeliveryReport, deliveryReportFile, deliveryReportLine } from "../../../src/integrations/traces/delivery-report.mjs";
import { REPO_ROOT, baseEnv, makeScratch, runIntegrationsJson } from "../helpers/cli.mjs";
import { readClaudeHandlers, readCodexHandlers, runClaudeHandler, runCodexHandler } from "../helpers/installed-hooks.mjs";
import { MARKER, claudePayload, codexHookPayload, execEvent, hermesRecord } from "../helpers/privacy-canaries.mjs";
import { ISO_MS, TRACES_PROBE, boundEnv, captureDir, exportOf, expectedPseudonym, privacyOk, runHermesIngest, runHook, startCapture, statusOf, storeDir } from "../helpers/traces.mjs";
import { snapshotTree } from "../helpers/tree.mjs";
import { runWrapper, writeScenario } from "../helpers/wrapper.mjs";

// Provas S3 da issue #8 (C15–C16): produtores reais concorrentes na mesma
// captura e falhas de entrega (lock ocupado, E/S, confirmação perdida, disco
// parado) com fixtures sintéticas. O diagnóstico de cada falha é lido como o
// usuário o lê: no arquivo de SKILL_ME_CAPTURE_REPORT (docs/traces.md).

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

test("T8-C15 concurrent producers: dois produtores em paralelo confirmam cada evento uma vez e deixam estado e segmento coerentes", async () => {
  const root = scratch("t8 c15 raiz");
  const id = startCapture(root);
  const env = boundEnv(root, id);
  const [a, b] = await Promise.all([
    runHermesIngest([], { env, lines: interleaved(hermesLines("a", 40), 4) }),
    runHermesIngest([], { env, lines: interleaved(hermesLines("b", 40), 4) }),
  ]);
  for (const [name, run] of [["a", a], ["b", b]]) {
    assert.equal(run.status, 0, name);
    assert.deepEqual(run.report.delivery, { bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0 }, name);
  }
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
  rmSync(lock);
  assert.ok(!exportOf(root, id).records.some((r) => r.envelope.ids.toolCallId === expectedPseudonym(root, id, "c-0")));
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
  rmSync(lock);

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
  rmSync(lock);
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
  rmSync(lock);

  // 2. Falha real de E/S no commit: uma pasta ocupa o nome do próximo segmento
  // e o rename do sistema operacional falha.
  const blocker = path.join(captureDir(root, id), "events-000002.ndjson");
  mkdirSync(blocker);
  const beforeIo = snapshotTree(captureDir(root, id));
  neutral(await runClaudeHandler(claudeHook, claudePayload("pre_tool_bash"), { env, cwd: project, reportFd: null }), "E/S");
  assert.deepEqual(snapshotTree(captureDir(root, id)), beforeIo, "commit desfeito, sem temporário");
  rmSync(blocker, { recursive: true });
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

  // 4. Sem vínculo a variável sozinha não escreve; caminho relativo é ignorado.
  neutral(await runHook("claude", claudePayload("pre_tool_bash"), { env: baseEnv({ [CAPTURE_REPORT_ENV]: reportFile }), fixtureReport: false }), "sem vínculo");
  const cwdBefore = readdirSync(project).sort();
  writeFileSync(lock, "lock alheio\n");
  neutral(await runHook("claude", claudePayload("pre_tool_bash"), { env: boundEnv(root, id, { [CAPTURE_REPORT_ENV]: "diagnóstico relativo.ndjson" }), cwd: project, fixtureReport: false }), "relativo");
  rmSync(lock);
  assert.deepEqual(readdirSync(project).sort(), cwdBefore, "nada criado no diretório do projeto");

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
