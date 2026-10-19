import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { FOLLOW_LOCK_PATIENCE_MS, FOLLOW_POLL_MS } from "../../../src/integrations/privacy/follow.mjs";
import { INTEGRATIONS_CLI, baseEnv, makeScratch } from "../helpers/cli.mjs";
import { MARKER, claudePayload, hermesRecord } from "../helpers/privacy-canaries.mjs";
import { TRACES_PROBE, boundEnv, captureDir, exportOf, privacyOk, privacyRetrying, runHermesIngest, runHook, startCapture, statusOf, storeDir, waitUntil } from "../helpers/traces.mjs";

// Provas do `privacy follow` da issue #8 (C12–C13) pelo processo real do CLI.
// O ritmo da sondagem vem do próprio módulo; a pré-carga de teste
// (helpers/traces-probe.mjs) só segura uma sondagem num ponto conhecido.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Algumas sondagens inteiras sem mudança na captura.
const QUIET_MS = 4 * FOLLOW_POLL_MS;

function follow(root, id, { env = baseEnv(), nodeArgs = [] } = {}) {
  const child = spawn(process.execPath, [...nodeArgs, INTEGRATIONS_CLI, "privacy", "follow", "--root", root, "--capture", id], { env, windowsHide: true });
  const state = { lines: [], stdout: "", stderr: "", exit: null };
  let partial = "";
  child.stdout.on("data", (chunk) => {
    state.stdout += chunk;
    partial += chunk;
    let index;
    while ((index = partial.indexOf("\n")) !== -1) {
      state.lines.push(JSON.parse(partial.slice(0, index)));
      partial = partial.slice(index + 1);
    }
  });
  child.stderr.on("data", (chunk) => (state.stderr += chunk));
  state.done = new Promise((resolve) => child.on("close", (status, signal) => resolve((state.exit = { status, signal, partial }))));
  state.child = child;
  return state;
}

const recordLine = (sequence, record) => ({ schemaVersion: 1, command: "follow", type: "record", sequence, record });

test("T8-C12 follow new records once: captura ativa vazia espera; dois appends saem como 1 e 2 uma vez cada; stop ou disable fecha com end", async () => {
  for (const ending of ["stop", "disable"]) {
    const root = scratch(`t8 c12 ${ending}`);
    const id = startCapture(root);
    const env = boundEnv(root, id);
    const followed = follow(root, id);
    await sleep(QUIET_MS);
    assert.deepEqual(followed.lines, [], `${ending}: ativa e vazia, nada a emitir`);
    assert.equal(followed.exit, null, `${ending}: continua acompanhando`);

    assert.equal((await runHook("claude", claudePayload("pre_tool_bash"), { env })).report.delivery.persisted, 1);
    await waitUntil(() => followed.lines.length >= 1, { label: "registro 1" });
    await sleep(QUIET_MS);
    assert.equal(followed.lines.length, 1, `${ending}: sondagens sem mudança não repetem`);
    assert.equal((await runHermesIngest([hermesRecord("pre_tool_call")], { env })).report.delivery.persisted, 1);
    await waitUntil(() => followed.lines.length >= 2, { label: "registro 2" });
    await sleep(QUIET_MS);
    assert.equal(followed.lines.length, 2, `${ending}: o segundo também sai uma vez`);

    // O follow segue sondando: o comando do usuário pode encontrar o lock.
    await privacyRetrying([ending, "--root", root, "--capture", id]);
    const exit = await followed.done;
    assert.deepEqual([exit.status, exit.signal, exit.partial], [0, null, ""], ending);
    assert.equal(followed.stderr, "");
    const { records } = exportOf(root, id);
    assert.deepEqual(followed.lines, [
      recordLine(1, records[0]),
      recordLine(2, records[1]),
      { schemaVersion: 1, command: "follow", type: "end", sequence: 3, capture: statusOf(root, id) },
    ]);
    assert.equal(followed.lines[2].capture.state, ending === "stop" ? "stopped" : "disabled");
  }
});

test("T8-C13 follow terminal and deletion: encerrada entrega o acumulado e end; exclusão no meio dá error 3 sem eco; lock que fica dá error 4", async () => {
  // Captura já encerrada: acumulado inteiro e fim, sem esperar mudança.
  const root = scratch("t8 c13 raiz");
  const done = startCapture(root);
  const env = boundEnv(root, done);
  for (const payload of [claudePayload("pre_tool_bash"), claudePayload("post_tool_bash")]) assert.equal((await runHook("claude", payload, { env })).status, 0);
  assert.equal((await runHermesIngest([hermesRecord("on_session_start")], { env })).status, 0);
  privacyOk(["stop", "--root", root, "--capture", done]);
  const finished = follow(root, done);
  const finishedExit = await finished.done;
  assert.equal(finishedExit.status, 0);
  const records = exportOf(root, done).records;
  assert.equal(records.length, 3);
  assert.deepEqual(finished.lines, [
    ...records.map((record, index) => recordLine(index + 1, record)),
    { schemaVersion: 1, command: "follow", type: "end", sequence: 4, capture: statusOf(root, done) },
  ]);

  // Captura inexistente: uma linha de erro e código 3.
  const missing = follow(root, "e".repeat(32));
  assert.equal((await missing.done).status, 3);
  assert.deepEqual(missing.lines, [{ schemaVersion: 1, command: "follow", type: "error", sequence: 1, error: { code: "capture_not_found" } }]);

  // Exclusão durante o acompanhamento: a segunda sondagem fica parada antes do
  // lock enquanto stop e delete --apply acontecem.
  const gate = scratch("t8 c13 portão");
  const live = startCapture(root);
  const secret = claudePayload("pre_tool_bash", { session_id: `sessao-${MARKER}`, tool_input: { command: `echo ${MARKER}` } });
  assert.equal((await runHook("claude", secret, { env: boundEnv(root, live) })).status, 0);
  const deleting = follow(root, live, { nodeArgs: ["--import", TRACES_PROBE], env: baseEnv({ SKILL_ME_TEST_TRACES_GATE: `${gate}|2` }) });
  await waitUntil(() => existsSync(path.join(gate, "waiting")), { label: "segunda sondagem parada" });
  assert.equal(deleting.lines.length, 1, "o acumulado saiu na primeira sondagem");
  privacyOk(["stop", "--root", root, "--capture", live]);
  assert.equal(privacyOk(["delete", "--root", root, "--capture", live, "--apply"]).deleted, true);
  writeFileSync(path.join(gate, "go"), "ok");
  const deletedExit = await deleting.done;
  assert.equal(deletedExit.status, 3);
  assert.deepEqual(deleting.lines.at(-1), { schemaVersion: 1, command: "follow", type: "error", sequence: 2, error: { code: "capture_not_found" } });
  assert.equal(deleting.stderr, "");
  for (const forbidden of [root, path.basename(root), MARKER, "Error", "at "]) assert.ok(!deleting.stdout.includes(forbidden), `sem eco: ${forbidden}`);
  assert.ok(!existsSync(captureDir(root, live)), "a consulta não recria a captura");

  // Lock que nunca sai: depois da paciência, erro fechado e código 4; o lock fica.
  const stuck = startCapture(root);
  writeFileSync(path.join(storeDir(root), ".lock"), "lock alheio\n");
  const started = performance.now();
  const blocked = follow(root, stuck);
  const blockedExit = await blocked.done;
  const elapsed = performance.now() - started;
  assert.equal(blockedExit.status, 4);
  assert.deepEqual(blocked.lines, [{ schemaVersion: 1, command: "follow", type: "error", sequence: 1, error: { code: "lock_present" } }]);
  assert.ok(elapsed >= FOLLOW_LOCK_PATIENCE_MS && elapsed < FOLLOW_LOCK_PATIENCE_MS + 5000, `${Math.round(elapsed)} ms`);
  assert.equal(readFileSync(path.join(storeDir(root), ".lock"), "utf8"), "lock alheio\n");
});
