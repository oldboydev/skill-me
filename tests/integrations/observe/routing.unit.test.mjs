import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { after, test } from "node:test";
import { claudeHookDraft } from "../../../src/integrations/adapters/claude.mjs";
import { codexExecDraft } from "../../../src/integrations/adapters/codex-exec.mjs";
import { codexHookDraft } from "../../../src/integrations/adapters/codex-hooks.mjs";
import { hermesDraft } from "../../../src/integrations/adapters/hermes.mjs";
import { MAX_SESSIONS, assignSession, isValidObservation } from "../../../src/integrations/observe/authorization.mjs";
import { runObserveCommand } from "../../../src/integrations/observe/command.mjs";
import { createAutomaticDelivery } from "../../../src/integrations/observe/delivery.mjs";
import { sessionIdentity } from "../../../src/integrations/observe/routing.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { changeObservation, exportCapture, listCaptures } from "../../../src/integrations/privacy/store.mjs";
import { makeScratch } from "../helpers/cli.mjs";
import { fixtureCase } from "../helpers/fixtures.mjs";
import { claudePayload, codexHookPayload, execEvent, hermesRecord } from "../helpers/privacy-canaries.mjs";
import { DELIVERED_AUTO, observeOk, prepareObservation, readObserveState } from "../helpers/observe.mjs";
import { captureDir, capturesDir, expectedPseudonym, runHook } from "../helpers/traces.mjs";
import { snapshotTree } from "../helpers/tree.mjs";

// Provas da issue #23 sobre roteamento e barreira (C9, C12, C13): a decisão
// pura da sessão (`sessionIdentity`) e a entrega automática em processo, sobre
// um store real numa raiz temporária. Ordem e concorrência são controladas
// pela prova (io instrumentado e chamadas diretas), não por tempo de processo.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

const ADAPTERS = { claude: claudeHookDraft, "codex-hooks": codexHookDraft, hermes: hermesDraft };
const lostAll = (code, entries = 1) => ({ automatic: true, code, entries, committed: 0, persisted: 0, lost: entries, unrouted: 0 });

// Raiz com a observação ligada; a configuração é a que o setup gravaria.
async function observedRoot(label) {
  const root = path.join(scratch(label), "raiz ação");
  mkdirSync(root);
  await changeObservation({ root, expectedReal: root, action: "on" });
  return { root, rootReal: root };
}

async function deliver(config, agent, payloads, options = {}) {
  const delivery = createAutomaticDelivery({ config, agent, ...options });
  for (const payload of payloads) delivery.submit(ADAPTERS[agent](payload), payload);
  await delivery.settle();
  return delivery.report();
}

const automatic = async (root) => (await listCaptures({ root })).captures.filter((capture) => capture.origin === "automatic");
const recordsOf = async (root, id) => (await exportCapture({ root, id })).records;
const tagOf = (sessionKey, agent, native) => createHmac("sha256", Buffer.from(sessionKey, "hex")).update(`${agent}\0${native}`, "utf8").digest("hex");

test("I23-C9 evento sem sessão não é atribuído: só o ID de sessão aceito pela fronteira v1 identifica a sessão", () => {
  const claude = claudePayload("pre_tool_bash");
  const codex = codexHookPayload("pre_tool_bash");
  assert.deepEqual(sessionIdentity(claudeHookDraft(claude)), { agent: "claude", id: claude.session_id });
  assert.deepEqual(sessionIdentity(codexHookDraft(codex)), { agent: "codex", id: codex.session_id });
  assert.deepEqual(sessionIdentity(hermesDraft(hermesRecord("pre_tool_call"))), { agent: "hermes", id: "hermes-sess-01" });
  // Subagente Hermes: o evento é emitido na sessão do pai, nomeada por parent_session_id.
  const child = hermesRecord("subagent_start");
  assert.deepEqual([child.kwargs.session_id, child.kwargs.parent_session_id], [undefined, "hermes-sess-01"]);
  assert.deepEqual(sessionIdentity(hermesDraft(child)), { agent: "hermes", id: "hermes-sess-01" });

  const { session_id: _claude, ...claudeWithout } = claude;
  const { session_id: _codex, ...codexWithout } = codex;
  const { parent_session_id: _parent, ...orphanKwargs } = child.kwargs;
  const without = [
    ["Claude sem session_id", claudeHookDraft(claudeWithout)],
    ["Claude com session_id vazio", claudeHookDraft({ ...claude, session_id: "" })],
    ["Claude com session_id numérico", claudeHookDraft({ ...claude, session_id: 42 })],
    ["Claude com session_id longo demais", claudeHookDraft({ ...claude, session_id: "s".repeat(4096) })],
    ["Codex sem session_id", codexHookDraft(codexWithout)],
    ["Hermes sem sessão nem pai", hermesDraft(hermesRecord("additive_and_missing_kwargs"))],
    ["Hermes subagente sem pai", hermesDraft({ ...child, kwargs: orphanKwargs })],
    ["Codex exec (thread, não sessão)", codexExecDraft(execEvent("thread_started"))],
    ["evento desconhecido", claudeHookDraft(fixtureCase("claude-hooks.json", "unknown_event").payload)],
    ["entrada que não é objeto", claudeHookDraft("não é objeto")],
    ["ausente", null],
  ];
  for (const [label, adapted] of without) assert.equal(sessionIdentity(adapted), null, label);
});

test("I23-C9 evento sem sessão não é atribuído: nem à única sessão aberta, nem a outra sessão do mesmo lote", async () => {
  const scratchOf = (label) => scratch(label);
  const { root, env } = prepareObservation(scratchOf, "i23 c9");
  observeOk(["on"], env);
  const config = { root, rootReal: root };
  assert.deepEqual(await deliver(config, "claude", [claudePayload("pre_tool_bash")]), DELIVERED_AUTO(1));
  const [open] = await automatic(root);

  // Uma só sessão aberta: o evento sem sessão e a entrada ilegível não vão a ela.
  const { session_id: _s, ...noSession } = claudePayload("post_tool_bash");
  const delivery = createAutomaticDelivery({ config, agent: "claude" });
  delivery.submit(claudeHookDraft(noSession), noSession);
  delivery.submit(claudeHookDraft({ ...noSession, session_id: "" }), noSession);
  delivery.malformed("invalid_json");
  await delivery.settle();
  assert.deepEqual(delivery.report(), { automatic: true, code: null, entries: 3, committed: 0, persisted: 0, lost: 0, unrouted: 3 });
  // O mesmo pelo hook real, sem variável de captura.
  const hook = await runHook("claude", noSession, { env, cwd: scratch("i23 c9 projeto") });
  assert.deepEqual([hook.status, hook.stdout, hook.stderr], [0, "", ""]);
  assert.deepEqual(hook.report.delivery, { automatic: true, code: null, entries: 1, committed: 0, persisted: 0, lost: 0, unrouted: 1 });
  assert.equal((await recordsOf(root, open.id)).length, 1);
  assert.equal((await automatic(root)).length, 1);
  assert.equal(Object.keys(readObserveState(root).sessions).length, 1);

  // Lote Hermes com sessão, sem sessão e outra sessão: cada um no seu lugar.
  const lot = [
    hermesRecord("pre_tool_call", { session_id: "hermes-s1", tool_call_id: "chamada-s1" }),
    hermesRecord("additive_and_missing_kwargs"),
    hermesRecord("pre_tool_call", { session_id: "hermes-s2", tool_call_id: "chamada-s2" }),
  ];
  assert.deepEqual(await deliver(config, "hermes", lot), { automatic: true, code: null, entries: 3, committed: 2, persisted: 2, lost: 0, unrouted: 1 });
  const captures = await automatic(root);
  assert.equal(captures.length, 3);
  for (const native of ["hermes-s1", "hermes-s2"]) {
    const owned = [];
    for (const capture of captures) {
      const records = await recordsOf(root, capture.id);
      if (records.some((r) => r.envelope.ids.sessionId === expectedPseudonym(root, capture.id, native))) owned.push(records);
    }
    assert.equal(owned.length, 1, native);
    assert.deepEqual(owned[0].map((r) => [r.envelope.eventKind, r.envelope.ids.sessionId === undefined]), [["tool_pre", false]], `${native}: só o próprio evento`);
  }
  for (const capture of captures) assert.ok(!(await recordsOf(root, capture.id)).some((r) => r.envelope.eventKind === "skill_lifecycle"), "o evento sem sessão não foi a nenhuma captura");
});

// io do store que segura o primeiro commit de registros (a escrita do segmento
// temporário, já com o lock) até a prova soltar.
function gatedIo() {
  const base = createStoreIo();
  let armed = true;
  let reach;
  let release;
  const reached = new Promise((resolve) => (reach = resolve));
  const released = new Promise((resolve) => (release = resolve));
  const io = {
    ...base,
    async writeExclusive(file, data, options) {
      if (armed && /events-\d{6}\.ndjson\.[0-9a-f]{8}\.skill-me-tmp$/.test(file)) {
        armed = false;
        reach();
        await released;
      }
      return base.writeExclusive(file, data, options);
    },
  };
  return { io, reached, release };
}

test("I23-C12 off corta produtor em voo: produtor aberto antes do off não grava depois dele", async () => {
  const config = await observedRoot("i23 c12 aberto");
  const first = claudePayload("pre_tool_bash");
  assert.deepEqual(await deliver(config, "claude", [first]), DELIVERED_AUTO(1));
  const producer = createAutomaticDelivery({ config, agent: "claude" });
  await producer.open();
  const off = await changeObservation({ root: config.root, expectedReal: config.rootReal, action: "off" });
  assert.equal(off.stopped.length, 1);
  const before = snapshotTree(capturesDir(config.root));
  const late = claudePayload("post_tool_bash");
  producer.submit(claudeHookDraft(late), late);
  await producer.settle();
  assert.deepEqual(producer.report(), lostAll("observe_off"));
  assert.deepEqual(snapshotTree(capturesDir(config.root)), before, "nenhuma gravação depois do off");
});

test("I23-C12 off corta produtor em voo: commit em curso termina antes do off, e nenhum é confirmado depois da conclusão dele", async () => {
  const home = scratch("i23 c12 home");
  const root = path.join(scratch("i23 c12 raiz"), "raiz ação");
  mkdirSync(root);
  assert.equal((await runObserveCommand({ argv: ["setup", "--root", root], home })).exitCode, 0);
  assert.equal((await runObserveCommand({ argv: ["on"], home })).exitCode, 0);
  const config = { root, rootReal: root };
  const gate = gatedIo();
  const producer = createAutomaticDelivery({ config, agent: "claude", io: gate.io });
  await producer.open();
  const first = claudePayload("pre_tool_bash", { tool_use_id: "chamada-em-voo" });
  producer.submit(claudeHookDraft(first), first);
  await gate.reached;

  // O off espera o lock do commit em curso (não grava por cima dele).
  let offDone = false;
  const off = runObserveCommand({ argv: ["off"], home }).then((result) => {
    offDone = true;
    return result;
  });
  await sleep(150);
  assert.equal(offDone, false, "off espera o commit em curso");
  gate.release();
  const offResult = await off;
  assert.equal(offResult.exitCode, 0, JSON.stringify(offResult.body));
  await producer.settle();
  assert.deepEqual(producer.report(), DELIVERED_AUTO(1), "o commit em curso terminou antes do off");
  const [capture] = await automatic(root);
  assert.deepEqual(offResult.body.stopped, [capture.id]);
  assert.equal(capture.state, "stopped");

  // Depois da conclusão do off: o produtor já aberto e um novo não gravam nada.
  const afterOff = snapshotTree(capturesDir(root));
  const second = claudePayload("post_tool_bash", { tool_use_id: "chamada-depois" });
  producer.submit(claudeHookDraft(second), second);
  await producer.settle();
  assert.deepEqual(producer.report(), { automatic: true, code: "observe_off", entries: 2, committed: 1, persisted: 1, lost: 1, unrouted: 0 });
  assert.deepEqual(await deliver(config, "claude", [second]), lostAll("observe_off"));
  assert.deepEqual(snapshotTree(capturesDir(root)), afterOff);
  assert.deepEqual((await recordsOf(root, capture.id)).map((r) => r.envelope.ids.toolUseId), [expectedPseudonym(root, capture.id, "chamada-em-voo")]);
});

// Provas suplementares de formato do Landing (linhas "Estado da observação" e
// "Consulta"), sem critério próprio no checklist.
test("I23 mapa de sessões: até 1000 sessões por geração, a mais antiga sai e a reatribuída vai para o fim", () => {
  assert.equal(MAX_SESSIONS, 1000);
  const tag = (i) => i.toString(16).padStart(64, "0");
  const id = (i) => i.toString(16).padStart(32, "0");
  let observation = { observeVersion: 1, state: "on", generation: "a".repeat(32), sessionKey: "b".repeat(64), changedAt: "2026-10-24T12:00:00.000Z", sessions: {} };
  for (let i = 0; i < MAX_SESSIONS; i++) observation = assignSession(observation, tag(i), id(i));
  assert.equal(Object.keys(observation.sessions).length, MAX_SESSIONS);
  assert.ok(isValidObservation(observation));
  observation = assignSession(observation, tag(1), id(5000));
  observation = assignSession(observation, tag(MAX_SESSIONS), id(MAX_SESSIONS));
  const tags = Object.keys(observation.sessions);
  assert.equal(tags.length, MAX_SESSIONS);
  assert.ok(!tags.includes(tag(0)), "a mais antiga saiu");
  assert.ok(tags.includes(tag(2)) && tags.includes(tag(MAX_SESSIONS)));
  assert.equal(observation.sessions[tag(1)], id(5000), "a reatribuída ficou, com a captura nova");
  assert.deepEqual(tags.slice(-2), [tag(1), tag(MAX_SESSIONS)]);
  assert.ok(!isValidObservation({ ...observation, sessions: { ...observation.sessions, [tag(9999)]: id(9999) } }), "mais de 1000 não é nosso");
});

test("I23 status lista no máximo 10 automáticas, da mais recente para a mais antiga, e conta todas", async () => {
  const home = scratch("i23 status home");
  const root = path.join(scratch("i23 status raiz"), "raiz ação");
  mkdirSync(root);
  assert.equal((await runObserveCommand({ argv: ["setup", "--root", root], home })).exitCode, 0);
  assert.equal((await runObserveCommand({ argv: ["on"], home })).exitCode, 0);
  const config = { root, rootReal: root };
  const base = Date.parse("2026-10-24T12:00:00.000Z");
  const ids = [];
  for (let i = 0; i < 11; i++) {
    const payload = claudePayload("pre_tool_bash", { session_id: `sessao-status-${i}` });
    assert.deepEqual(await deliver(config, "claude", [payload], { now: () => base + i * 1000 }), DELIVERED_AUTO(1));
    ids.push((await automatic(root)).find((c) => c.createdAt === new Date(base + i * 1000).toISOString()).id);
  }
  const status = await runObserveCommand({ argv: ["status"], home });
  assert.equal(status.exitCode, 0);
  assert.equal(status.body.automaticCaptures, 11);
  assert.deepEqual(status.body.captures.map((c) => c.id), ids.slice(1).reverse(), "as 10 mais recentes, da mais nova para a mais antiga");
});

test("I23-C13 novo on isola geração anterior: produtor da geração anterior não grava na nova nem herda chave ou conteúdo", async () => {
  const config = await observedRoot("i23 c13");
  const { root } = config;
  const session = claudePayload("pre_tool_bash").session_id;
  const g1 = readObserveState(root);
  const old = createAutomaticDelivery({ config, agent: "claude" });
  await old.open();
  const first = claudePayload("pre_tool_bash", { tool_use_id: "chamada-g1" });
  old.submit(claudeHookDraft(first), first);
  await old.settle();
  assert.deepEqual(old.report(), DELIVERED_AUTO(1));
  const [c1] = await automatic(root);
  assert.deepEqual(g1.sessions, {});
  assert.deepEqual(readObserveState(root).sessions, { [tagOf(g1.sessionKey, "claude", session)]: c1.id });

  await changeObservation({ root, expectedReal: root, action: "off" });
  await changeObservation({ root, expectedReal: root, action: "on" });
  const g2 = readObserveState(root);
  assert.notEqual(g2.generation, g1.generation, "outra geração");
  assert.notEqual(g2.sessionKey, g1.sessionKey, "outra chave de sessões");
  assert.deepEqual(g2.sessions, {}, "mapa novo");

  // O produtor aberto na geração anterior não grava na nova.
  const stale = claudePayload("post_tool_bash", { tool_use_id: "chamada-g1-tardia" });
  old.submit(claudeHookDraft(stale), stale);
  await old.settle();
  assert.deepEqual(old.report(), { automatic: true, code: "observe_off", entries: 2, committed: 1, persisted: 1, lost: 1, unrouted: 0 });
  assert.equal((await automatic(root)).length, 1, "nenhuma captura na geração nova");
  assert.equal((await recordsOf(root, c1.id)).length, 1);

  // A mesma sessão na geração nova: outra captura, outra chave, só o próprio evento.
  const fresh = claudePayload("pre_tool_bash", { tool_use_id: "chamada-g2" });
  assert.deepEqual(await deliver(config, "claude", [fresh]), DELIVERED_AUTO(1));
  const c2 = (await automatic(root)).find((c) => c.id !== c1.id);
  assert.ok(c2);
  assert.deepEqual(Object.fromEntries((await automatic(root)).map((c) => [c.id, c.state])), { [c1.id]: "stopped", [c2.id]: "active" });
  assert.ok(!readFileSync(path.join(captureDir(root, c1.id), "key")).equals(readFileSync(path.join(captureDir(root, c2.id), "key"))), "chave própria");
  const [record] = await recordsOf(root, c2.id);
  assert.equal((await recordsOf(root, c2.id)).length, 1);
  assert.equal(record.envelope.ids.toolUseId, expectedPseudonym(root, c2.id, "chamada-g2"));
  assert.equal(record.envelope.ids.sessionId, expectedPseudonym(root, c2.id, session));
  assert.notEqual(record.envelope.ids.sessionId, expectedPseudonym(root, c1.id, session), "pseudônimo da chave nova");
  assert.deepEqual(readObserveState(root).sessions, { [tagOf(g2.sessionKey, "claude", session)]: c2.id });
});
