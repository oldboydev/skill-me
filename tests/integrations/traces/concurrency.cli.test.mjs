import assert from "node:assert/strict";
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { after, test } from "node:test";
import { claudeHookDraft } from "../../../src/integrations/adapters/claude.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { DELIVERY_DEADLINE_MS, createCaptureDelivery } from "../../../src/integrations/traces/delivery.mjs";
import { REPO_ROOT, makeScratch } from "../helpers/cli.mjs";
import { claudePayload, hermesRecord } from "../helpers/privacy-canaries.mjs";
import { TRACES_PROBE, boundEnv, captureDir, exportOf, expectedPseudonym, runHermesIngest, runHook, startCapture, statusOf, storeDir } from "../helpers/traces.mjs";
import { snapshotTree } from "../helpers/tree.mjs";
import { runWrapper, writeScenario } from "../helpers/wrapper.mjs";

// Provas S3 da issue #8 (C15–C16): produtores reais concorrentes na mesma
// captura e falhas de entrega (lock ocupado, E/S, confirmação perdida, disco
// parado) com fixtures sintéticas.

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
  const lost = await runHook("claude", claudePayload("pre_tool_bash", { tool_use_id: "perdido-1" }), {
    env: { ...env, SKILL_ME_TEST_TRACES_LOST_CONFIRMATION: "2" },
    nodeArgs: ["--import", TRACES_PROBE],
  });
  assert.equal(lost.status, 0);
  assert.deepEqual(lost.report.delivery, { bound: true, code: "io_failure", entries: 1, committed: 0, persisted: 0, lost: 1 });
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
