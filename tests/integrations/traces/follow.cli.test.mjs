import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { FOLLOW_LOCK_PATIENCE_MS, FOLLOW_POLL_MS } from "../../../src/integrations/privacy/follow.mjs";
import { INTEGRATIONS_CLI, baseEnv, makeScratch } from "../helpers/cli.mjs";
import { MARKER, claudePayload, hermesRecord } from "../helpers/privacy-canaries.mjs";
import { TRACES_PROBE, boundEnv, captureDir, capturesDir, exportOf, noteProcess, privacyOk, privacyRetrying, recordProducersInEachTest, recordingProducers, runHermesIngest, runHook, startCapture, statusOf, storeDir, waitUntil } from "../helpers/traces.mjs";

// Evidência comum dos produtores quando um teste falha (issue #25, linha
// "Evidência comum dos produtores e formatter legado" do Landing): helpers/traces.mjs.
recordProducersInEachTest();

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
  // O follow sonda sob o lock: na evidência comum, o pid dele identifica o lock.
  noteProcess("follow", child);
  return state;
}

const recordLine = (sequence, record) => ({ schemaVersion: 1, command: "follow", type: "record", sequence, record });

// A rotina do T8-C12 para um fim (`stop` ou `disable`); `firstHook` só
// acrescenta ao ambiente do 1º hook no controle do diagnóstico (I25-C46).
async function followNewRecords(root, id, ending, followed, firstHook = {}) {
  const env = boundEnv(root, id);
  await sleep(QUIET_MS);
  assert.deepEqual(followed.lines, [], `${ending}: ativa e vazia, nada a emitir`);
  assert.equal(followed.exit, null, `${ending}: continua acompanhando`);

  assert.equal((await runHook("claude", claudePayload("pre_tool_bash"), { env: { ...env, ...firstHook } })).report.delivery.persisted, 1);
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

test("T8-C12 follow new records once: captura ativa vazia espera; dois appends saem como 1 e 2 uma vez cada; stop ou disable fecha com end", async () => {
  for (const ending of ["stop", "disable"]) {
    const root = scratch(`t8 c12 ${ending}`);
    const id = startCapture(root);
    await followNewRecords(root, id, ending, follow(root, id));
  }
});

// Início do T8-C13: uma captura com dois hooks e um ingest, encerrada. `ingest`
// só acrescenta ao ambiente do ingest no controle do diagnóstico (I25-C46).
async function finishedCapture(root, ingest = {}) {
  const done = startCapture(root);
  const env = boundEnv(root, done);
  for (const payload of [claudePayload("pre_tool_bash"), claudePayload("post_tool_bash")]) assert.equal((await runHook("claude", payload, { env })).status, 0);
  assert.equal((await runHermesIngest([hermesRecord("on_session_start")], { env: { ...env, ...ingest } })).status, 0);
  privacyOk(["stop", "--root", root, "--capture", done]);
  return done;
}

test("T8-C13 follow terminal and deletion: encerrada entrega o acumulado e end; exclusão no meio dá error 3 sem eco; lock que fica dá error 4", async () => {
  // Captura já encerrada: acumulado inteiro e fim, sem esperar mudança.
  const root = scratch("t8 c13 raiz");
  const done = await finishedCapture(root);
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

// I25-C46 (issue #25, AC7; linha "Evidência comum dos produtores e formatter
// legado" do Landing): na CI 40728249484 o T8-C12 saiu com `0 !== 1` no 1º hook e
// o T8-C13 com o `stop` em `lock_present`, sem dado nenhum dos produtores. Pelas
// mesmas rotinas, com o disco parado sob o lock só num produtor, a asserção
// continua vermelha e o mesmo erro sai com a evidência comum: os relatórios, a
// operação em curso e o processo cujo pid está no lock. A operação parada é
// conhecida pela injeção; numa falha real os mesmos campos são evidência.
const STALLED = { SKILL_ME_TEST_TRACES_STALL_SEGMENT: "1" };
const DELIVERED_ONE = { bound: true, code: null, entries: 1, committed: 1, persisted: 1, lost: 0 };
const LOST_ONE = { bound: true, code: "delivery_timeout", entries: 1, committed: 0, persisted: 0, lost: 1 };
const EVIDENCE = "\nevidência dos produtores deste teste (";

// O mesmo erro da asserção e, na mensagem, a original seguida da evidência;
// devolve a evidência.
function evidenceAfterOriginal(failure, original) {
  assert.ok(failure instanceof assert.AssertionError, `a asserção continua vermelha: ${failure}`);
  assert.ok(failure.message.startsWith(`${original}${EVIDENCE}`), failure.message);
  assert.ok(failure.stack.includes(failure.message), "o stack traz a mensagem com a evidência");
  return failure.message.slice(original.length + 1);
}

function assertNoLeak(text, root, id) {
  const key = readFileSync(path.join(captureDir(root, id), "key"));
  for (const value of [root, path.basename(root), id, key.toString("hex"), key.toString("base64"), key.toString("base64url"), MARKER, process.env.PATH].filter(Boolean)) {
    assert.ok(!text.includes(value), "a evidência não traz caminho, ID, chave, conteúdo nem ambiente");
  }
}

test("I25-C46 diagnóstico do T8-C12: o 1º hook parado sob o lock mantém a asserção vermelha e o mesmo erro traz o relatório dele, a operação em curso e o lock dele", async () => {
  const root = scratch("i25 c46 c12");
  const id = startCapture(root);
  let followed = null;
  const failure = await recordingProducers(() => followNewRecords(root, id, "stop", (followed = follow(root, id)), STALLED)).then(
    () => null,
    (error) => error,
  );
  // O follow espera o lock que o hook deixou até a paciência dele: a prova o encerra.
  followed.child.kill();
  await followed.done;
  assert.deepEqual([failure?.actual, failure?.expected, failure?.operator], [0, 1, "strictEqual"], String(failure));
  let original;
  try {
    assert.equal(0, 1);
  } catch (error) {
    original = error.message;
  }
  const evidence = evidenceAfterOriginal(failure, original);
  assert.ok(evidence.startsWith(`evidência dos produtores deste teste (1):\nprodutor 1 hook claude: status 0, sinal nenhum; entrega ${JSON.stringify(LOST_ONE)}\n`), evidence);
  assert.ok(evidence.includes("pendentes na saída: open segmento.tmp (sob o lock, 2ª tomada) há "), evidence);
  assert.ok(evidence.includes("raiz 1 (produtores 1): lock presente, de produtor 1 hook claude; capturas indisponível [lock_present]"), evidence);
  assertNoLeak(failure.message, root, id);
});

test("I25-C46 diagnóstico do T8-C13: o ingest parado sob o lock mantém o stop vermelho e o mesmo erro traz os três produtores e quem tem o pid do lock", async () => {
  const root = scratch("i25 c46 c13");
  const failure = await recordingProducers(() => finishedCapture(root, STALLED)).then(
    () => null,
    (error) => error,
  );
  assert.deepEqual([failure?.actual, failure?.expected], [4, 0], String(failure));
  // A mensagem do privacyOk com o stdout do stop recusado.
  let original;
  try {
    assert.equal(4, 0, `stop: ${JSON.stringify({ schemaVersion: 1, command: "stop", status: "error", error: { code: "lock_present" } })}\n`);
  } catch (error) {
    original = error.message;
  }
  const evidence = evidenceAfterOriginal(failure, original);
  const lines = evidence.split("\n");
  assert.equal(lines[0], "evidência dos produtores deste teste (3):");
  assert.deepEqual(
    lines.filter((line) => line.startsWith("produtor ")),
    [
      `produtor 1 hook claude: status 0, sinal nenhum; entrega ${JSON.stringify(DELIVERED_ONE)}`,
      `produtor 2 hook claude: status 0, sinal nenhum; entrega ${JSON.stringify(DELIVERED_ONE)}`,
      `produtor 3 ingest hermes: status 0, sinal nenhum; entrega ${JSON.stringify(LOST_ONE)}`,
    ],
    evidence,
  );
  assert.ok(evidence.includes("pendentes na saída: open segmento.tmp (sob o lock, 2ª tomada) há "), evidence);
  assert.ok(evidence.includes("raiz 1 (produtores 1, 2, 3): lock presente, de produtor 3 ingest hermes; capturas indisponível [lock_present]"), evidence);
  const [id] = readdirSync(capturesDir(root));
  assertNoLeak(failure.message, root, id);
});
