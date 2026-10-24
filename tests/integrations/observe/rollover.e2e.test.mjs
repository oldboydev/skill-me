import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { rmSync } from "node:fs";
import { after, test } from "node:test";
import { PRIVACY_LIMITS } from "../../../src/integrations/privacy/lifecycle.mjs";
import { appendRecords } from "../../../src/integrations/privacy/store.mjs";
import { makeScratch } from "../helpers/cli.mjs";
import { claudePayload, hermesRecord } from "../helpers/privacy-canaries.mjs";
import { recordLineBytes, sanitizedRecord } from "../helpers/privacy-store.mjs";
import { DELIVERED_AUTO, automaticOf, observeOk, prepareObservation, readObserveState } from "../helpers/observe.mjs";
import { exportOf, expectedPseudonym, runHermesIngest, runHook, statusOf } from "../helpers/traces.mjs";

// Prova C11 da issue #23: com a observação ligada, a captura cheia de uma
// sessão é encerrada e a sessão segue numa captura sucessora, com chave
// própria, sem ultrapassar o limite individual (PRIVACY_LIMITS da #5) e sem
// descartar o evento que não coube. Limites do Landing: 500 eventos / 8 MiB.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

const { maxEvents: MAX_EVENTS, maxBytes: MAX_BYTES } = PRIVACY_LIMITS;
const tagOf = (sessionKey, agent, native) => createHmac("sha256", Buffer.from(sessionKey, "hex")).update(`${agent}\0${native}`, "utf8").digest("hex");

// Enche a captura até `targetBytes` com poucos registros já sanitizados (forma
// do store; não passam por política), como na prova de limites da #8: só a
// admissão por bytes é observada. A captura deixa de ser exportável, então
// dela só se lê o status.
async function fillBytes(root, id, targetBytes) {
  const count = 8;
  const base = recordLineBytes(sanitizedRecord(0));
  const share = Math.floor(targetBytes / count);
  const records = Array.from({ length: count }, (_, i) => sanitizedRecord(i, "p".repeat((i === count - 1 ? targetBytes - share * (count - 1) : share) - base)));
  assert.equal(records.reduce((sum, r) => sum + recordLineBytes(r), 0), targetBytes);
  await appendRecords({ root, id, batch: { records, malformed: 0, dropped: {}, contentOmitted: {} } });
}

test("I23-C11 limite abre captura sucessiva: no evento 501 a sessão segue noutra captura, sem descarte e sem perder o evento de transição", async () => {
  const { root, env } = prepareObservation(scratch, "i23 c11 eventos");
  observeOk(["on"], env);
  const session = "hermes-sessao-longa";
  const total = MAX_EVENTS + 3;
  const lines = Array.from({ length: total }, (_, i) => hermesRecord("pre_tool_call", { session_id: session, tool_call_id: `chamada-${i}` }));
  const run = await runHermesIngest(lines, { env });
  assert.deepEqual([run.status, run.stdout, run.stderr], [0, "", ""]);
  assert.deepEqual(run.report.delivery, DELIVERED_AUTO(total), "toda entrada confirmada, nenhuma perdida");

  const [full, next] = automaticOf(root);
  assert.equal(automaticOf(root).length, 2, "uma sucessora");
  assert.equal(full.state, "stopped", "a cheia é encerrada");
  assert.deepEqual([full.counters.accepted, full.counters.persisted, full.counters.malformed, full.counters.dropped], [MAX_EVENTS, MAX_EVENTS, 0, {}], "cheia no limite, sem descarte");
  assert.ok(full.dataBytes <= MAX_BYTES);
  assert.equal(next.state, "active");
  assert.deepEqual([next.counters.accepted, next.counters.persisted, next.counters.dropped], [3, 3, {}]);
  assert.deepEqual([next.content, next.retentionDays, next.origin], [true, 7, "automatic"]);

  // Cada evento uma vez, na ordem, com a chave da captura em que ficou: o 501º
  // (chamada-500) é o primeiro da sucessora.
  const calls = (id) => exportOf(root, id).records.map((r) => r.envelope.ids.toolCallId);
  assert.deepEqual(calls(full.id), Array.from({ length: MAX_EVENTS }, (_, i) => expectedPseudonym(root, full.id, `chamada-${i}`)));
  assert.deepEqual(calls(next.id), [500, 501, 502].map((i) => expectedPseudonym(root, next.id, `chamada-${i}`)));
  assert.notEqual(expectedPseudonym(root, next.id, session), expectedPseudonym(root, full.id, session), "chave própria");
  const state = readObserveState(root);
  assert.deepEqual(state.sessions, { [tagOf(state.sessionKey, "hermes", session)]: next.id }, "a sessão aponta para a sucessora");

  // A sessão continua na sucessora em outro processo, sob o mesmo on.
  assert.deepEqual((await runHermesIngest([hermesRecord("pre_tool_call", { session_id: session, tool_call_id: "chamada-depois" })], { env })).report.delivery, DELIVERED_AUTO(1));
  assert.equal(statusOf(root, next.id).counters.persisted, 4);
  assert.equal(automaticOf(root).length, 2);
});

test("I23-C11 limite abre captura sucessiva: no limite de 8 MiB o registro que cabe exatamente fica, e o que não cabe abre a sucessora", async () => {
  const { root, env } = prepareObservation(scratch, "i23 c11 bytes");
  observeOk(["on"], env);
  const project = scratch("i23 c11 projeto");
  const filled = new Set();
  // Capturas reais (não preenchidas) da sessão, achadas pelo pseudônimo dela.
  const ofSession = (session) =>
    automaticOf(root).filter((c) => !filled.has(c.id) && exportOf(root, c.id).records.some((r) => r.envelope.ids.sessionId === expectedPseudonym(root, c.id, session)));
  for (const [label, gap] of [["cabe exatamente", 0], ["falta um byte", 1]]) {
    const session = `sessao-bytes-${gap}`;
    const payload = claudePayload("pre_tool_bash", { session_id: session });
    assert.deepEqual((await runHook("claude", payload, { env, cwd: project })).report.delivery, DELIVERED_AUTO(1), label);
    const [first] = ofSession(session);
    // Mesmo payload, mesmo tamanho de registro (pseudônimos e instantes têm largura fixa).
    const size = recordLineBytes(exportOf(root, first.id).records[0]);
    assert.equal(first.dataBytes, size);
    await fillBytes(root, first.id, MAX_BYTES - size + gap - first.dataBytes);
    filled.add(first.id);
    assert.equal(statusOf(root, first.id).dataBytes, MAX_BYTES - size + gap, label);

    assert.deepEqual((await runHook("claude", payload, { env, cwd: project })).report.delivery, DELIVERED_AUTO(1), `${label}: o evento é confirmado`);
    if (gap === 0) {
      const exact = statusOf(root, first.id);
      assert.deepEqual([exact.state, exact.dataBytes, exact.counters.dropped], ["active", MAX_BYTES, {}], `${label}: ficou na mesma captura`);
      assert.deepEqual(ofSession(session), [], "sem sucessora enquanto cabe");
      // O próximo já não cabe: sucessora.
      assert.deepEqual((await runHook("claude", payload, { env, cwd: project })).report.delivery, DELIVERED_AUTO(1));
    }
    const full = statusOf(root, first.id);
    assert.deepEqual([full.state, full.dataBytes, full.counters.dropped], ["stopped", gap === 0 ? MAX_BYTES : MAX_BYTES - size + gap, {}], `${label}: cheia encerrada sem passar do limite nem descartar`);
    const successors = ofSession(session);
    assert.equal(successors.length, 1, `${label}: uma sucessora`);
    const moved = exportOf(root, successors[0].id).records;
    assert.equal(moved.length, 1, `${label}: o evento que não coube é o primeiro da sucessora`);
    assert.equal(recordLineBytes(moved[0]), size);
    assert.deepEqual([successors[0].state, successors[0].counters.dropped], ["active", {}]);
  }
});
