import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { after, test } from "node:test";
import { runSkillMe as runInProcess } from "../../../src/integrations/launch/command.mjs";
import { PRIVACY_LIMITS } from "../../../src/integrations/privacy/lifecycle.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { appendRecords } from "../../../src/integrations/privacy/store.mjs";
import { makeScratch } from "../helpers/cli.mjs";
import { HEX32, agentArgs, launchCapturesOnDisk, ofInvocation, pointerFile, preparedLaunch, readJsonLines, runSkillMe, writeScenario } from "../helpers/launch.mjs";
import { assertSameAsIngest, authorizationFile, automaticOf, listCaptures, observeFile, observeOk } from "../helpers/observe.mjs";
import { claudePayload, codexHookPayload, hermesRecord } from "../helpers/privacy-canaries.mjs";
import { recordLineBytes, sanitizedRecord } from "../helpers/privacy-store.mjs";
import { boundEnv, expectedPseudonym, exportOf, runHook, startCapture, statusOf, storeDir } from "../helpers/traces.mjs";
import { snapshotTree } from "../helpers/tree.mjs";

// Provas S3 da issue #25 (C16, C18–C23): a execução aberta por
// `skill-me <agente>` e as capturas sucessivas dela, com produtores reais —
// hooks pela linha instalada e o ingest Hermes pelo `hermesDelivery` — dentro
// de um agente de fixture. Formatos e limites do Landing de
// .checks/issue-25-agent-launch.md; pseudônimos pela definição publicada da #5.

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
const LAUNCHED = (n) => ({ launch: true, code: null, entries: n, committed: n, persisted: n, lost: 0 });
const isoAt = (state) => state.launchedAt;
const sum = (states) => states.reduce((total, state) => total + state.counters.persisted, 0);

async function waitFor(predicate, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`tempo esgotado: ${label}`);
    await sleep(20);
  }
}

test("I25-C16 execução aberta antes do agente: segmento 1 e ponteiro na forma do Landing, e o agente vê só o par da execução", async () => {
  const prepared = preparedLaunch(scratch, "i25 c16", { agents: ["claude"] });
  const other = path.join(scratch("i25 c16 outra raiz"), "outra");
  mkdirSync(other);
  const manual = startCapture(other);
  const probe = path.join(scratch("i25 c16 provas"), "probe.ndjson");
  const inherited = { SKILL_ME_CAPTURE_ROOT: other, SKILL_ME_CAPTURE_ID: manual, SKILL_ME_LAUNCH_ID: "f".repeat(32), ...(process.platform === "win32" ? { skill_me_launch_root: other } : {}) };
  const result = await runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, ...inherited, FAKE_AGENT_PROBE: probe } });
  assert.equal(result.status, 0, result.stderr);
  const [seen] = readJsonLines(probe);
  const invocation = seen.env.SKILL_ME_LAUNCH_ID;
  assert.match(invocation, HEX32);
  assert.notEqual(invocation, "f".repeat(32));
  assert.deepEqual(seen.env, { SKILL_ME_LAUNCH_ROOT: prepared.rootReal, SKILL_ME_LAUNCH_ID: invocation }, "nenhum valor herdado dos dois pares");
  // Visto pelo agente no instante em que iniciou: a execução já existia.
  assert.equal(seen.atStart.captures.length, 1);
  const [first] = seen.atStart.captures;
  assert.deepEqual(
    { origin: first.origin, invocation: first.invocation, segment: first.segment, state: first.state, content: first.content, retentionDays: first.retentionDays, limits: first.limits, launchedAt: first.launchedAt },
    { origin: "launch", invocation, segment: 1, state: "active", content: true, retentionDays: 7, limits: { maxEvents: 500, maxBytes: 8388608 }, launchedAt: first.createdAt },
  );
  assert.deepEqual(seen.atStart.pointer, { launchVersion: 1, invocation, capture: first.id, segment: 1, launchedAt: first.createdAt });
  assert.equal(statusOf(other, manual).counters.accepted, 0, "a captura manual herdada não recebe nada");
});

test("I25-C18 execução indisponível: raiz ausente, store inválido, lock alheio por 2 s e E/S não iniciam o agente e mostram só o código", async () => {
  const observed = {};
  const expected = {};
  const cases = {
    // A raiz preparada ainda está vazia (o setup não cria o store): `rmdirSync`,
    // não `rmSync` — no Windows, o do Node 24.13.0 (o da CI) não apaga num
    // caminho com "ação" e não lança (nodejs/node#56049).
    root_not_found: {
      exit: 3,
      arrange: (p) => {
        rmdirSync(p.root);
        assert.equal(existsSync(p.root), false, "a raiz saiu");
      },
    },
    store_invalid: { exit: 3, arrange: (p) => writeFileSync(storeDir(p.root), "não é o store\n") },
    lock_present: {
      exit: 4,
      arrange: (p) => {
        mkdirSync(storeDir(p.root));
        writeFileSync(path.join(storeDir(p.root), "store.json"), '{"skillMePrivacyStore":1}');
        writeFileSync(path.join(storeDir(p.root), ".lock"), "lock alheio\n");
      },
    },
  };
  for (const [code, { exit, arrange }] of Object.entries(cases)) {
    const prepared = preparedLaunch(scratch, `i25 c18 ${code}`, { agents: ["claude"] });
    arrange(prepared);
    const probe = path.join(scratch(`i25 c18 ${code} provas`), "probe.ndjson");
    // Relógio monotônico, como a paciência do produto: o de parede pode recuar
    // durante a espera (achado F3 da verificação, WSL).
    const started = performance.now();
    const result = await runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_PROBE: probe } });
    observed[code] = {
      status: result.status,
      stderr: result.stderr,
      started: existsSync(probe),
      waited: code === "lock_present" ? performance.now() - started >= 2000 : true,
    };
    expected[code] = { status: exit, stderr: `skill-me: não foi possível abrir a execução [${code}]\n`, started: false, waited: true };
  }
  // E/S: a gravação do state.json da captura nova falha (io instrumentado, em processo).
  const prepared = preparedLaunch(scratch, "i25 c18 io", { agents: ["claude"] });
  const probe = path.join(scratch("i25 c18 io provas"), "probe.ndjson");
  const base = createStoreIo();
  const io = { ...base, rename: async (from, to) => (path.basename(to) === "state.json" ? Promise.reject(Object.assign(new Error("EIO"), { code: "EIO" })) : base.rename(from, to)) };
  let stderr = "";
  const inProcess = await runInProcess({
    argv: ["claude", ...agentArgs("claude")],
    deps: { env: { ...prepared.env, FAKE_AGENT_PROBE: probe }, home: prepared.home, io, proc: new EventEmitter(), terminal: false, writeOut: () => {}, writeErr: (t) => (stderr += t), readLine: () => null },
  });
  observed.io_failure = { status: inProcess.exitCode, stderr, started: existsSync(probe), waited: true };
  expected.io_failure = { status: 5, stderr: "skill-me: não foi possível abrir a execução [io_failure]\n", started: false, waited: true };
  assert.deepEqual(observed, expected);
});

test("I25-C19 eventos na captura da execução: hooks Claude e Codex e o ingest Hermes gravam na captura corrente, com a chave dela, e nada vai para captura manual ou automática", async () => {
  const prepared = preparedLaunch(scratch, "i25 c19");
  const work = scratch("i25 c19 provas");
  observeOk(["on"], prepared.env);
  const manual = startCapture(prepared.root, ["--content"]);
  const claude = claudePayload("pre_tool_bash", { session_id: "sessao-claude" });
  const codex = codexHookPayload("pre_tool_bash", { session_id: "sessao-codex" });
  const hermes = [hermesRecord("pre_tool_call", { session_id: "sessao-hermes", tool_call_id: "h-1" }), hermesRecord("post_tool_call", { session_id: "sessao-hermes", tool_call_id: "h-1" })];
  const reports = path.join(work, "relatorios.ndjson");
  const scenario = writeScenario(work, "eventos", [
    { hook: { agent: "claude", payload: claude } },
    { hook: { agent: "codex", payload: codex } },
    { hermesOpen: true },
    { hermes },
    { waitPersisted: 4 },
  ]);
  const env = { ...boundEnv(prepared.root, manual), ...prepared.env, FAKE_AGENT_SCENARIO: scenario, FAKE_AGENT_REPORTS: reports };
  const result = await runSkillMe(["hermes", ...agentArgs("hermes")], { env });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readJsonLines(reports).map((line) => line.report.delivery), [LAUNCHED(1), LAUNCHED(1)]);
  const [capture, ...extra] = launchCapturesOnDisk(prepared.root);
  assert.equal(extra.length, 0, "uma captura na execução");
  const records = exportOf(prepared.root, capture.id).records;
  assert.equal(records.length, 4);
  assert.deepEqual(
    records.map((r) => [r.recordVersion, r.envelope.source.agent, r.envelope.ids.sessionId]),
    [
      [1, "claude", expectedPseudonym(prepared.root, capture.id, "sessao-claude")],
      [1, "codex", expectedPseudonym(prepared.root, capture.id, "sessao-codex")],
      [1, "hermes", expectedPseudonym(prepared.root, capture.id, "sessao-hermes")],
      [1, "hermes", expectedPseudonym(prepared.root, capture.id, "sessao-hermes")],
    ],
  );
  assert.deepEqual([statusOf(prepared.root, manual).counters.accepted, automaticOf(prepared.root).length], [0, 0], "nada na manual nem em automática, com on");
  // O conteúdo é o mesmo que o `privacy ingest --content` grava (referência numa raiz à parte).
  const reference = path.join(scratch("i25 c19 referencia"), "ref");
  mkdirSync(reference);
  assertSameAsIngest(reference, "claude", [claude], records.slice(0, 1), "claude");
  assertSameAsIngest(reference, "codex-hooks", [codex], records.slice(1, 2), "codex");
  assertSameAsIngest(reference, "hermes", hermes, records.slice(2), "hermes");
});

test("I25-C20 par inválido: SKILL_ME_LAUNCH_* incompleto ou inválido não grava em lugar nenhum, também com on e par manual válido", async () => {
  const prepared = preparedLaunch(scratch, "i25 c20", { agents: ["claude"] });
  observeOk(["on"], prepared.env);
  const manual = startCapture(prepared.root, ["--content"]);
  const opened = await runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_EXIT: "0" } });
  assert.equal(opened.status, 0);
  const [ended] = launchCapturesOnDisk(prepared.root);
  const project = scratch("i25 c20 projeto");
  const variants = {
    "só o ID": { SKILL_ME_LAUNCH_ID: "a".repeat(32) },
    "só a raiz": { SKILL_ME_LAUNCH_ROOT: prepared.rootReal },
    "raiz relativa": { SKILL_ME_LAUNCH_ROOT: "capturas", SKILL_ME_LAUNCH_ID: "a".repeat(32) },
    "ID inválido": { SKILL_ME_LAUNCH_ROOT: prepared.rootReal, SKILL_ME_LAUNCH_ID: ended.id.toUpperCase() },
  };
  const before = snapshotTree(prepared.root);
  const observed = {};
  for (const [label, pair] of Object.entries(variants)) {
    const env = { ...boundEnv(prepared.root, manual), ...prepared.env, ...pair };
    observed[label] = (await runHook("claude", claudePayload("pre_tool_bash"), { env, cwd: project })).report.delivery;
  }
  const refused = { bound: false, code: "binding_invalid", entries: 1, committed: 0, persisted: 0, lost: 1 };
  assert.deepEqual(observed, Object.fromEntries(Object.keys(variants).map((label) => [label, refused])));
  assert.deepEqual(snapshotTree(prepared.root), before, "nenhuma captura recebeu nada");
});

test("I25-C21 autorização global intacta: observe.json da raiz e o registro do home com os mesmos bytes (ou ausentes), com on e com off", async () => {
  const observed = {};
  const expected = {};
  for (const state of ["off", "on"]) {
    const prepared = preparedLaunch(scratch, `i25 c21 ${state}`, { agents: ["claude"] });
    if (state === "on") observeOk(["on"], prepared.env);
    const read = (file) => (existsSync(file) ? readFileSync(file).toString("base64") : null);
    const files = [observeFile(prepared.root), authorizationFile(prepared.home)];
    const before = files.map(read);
    const result = await runSkillMe(["claude", ...agentArgs("claude")], { env: prepared.env });
    assert.equal(result.status, 0);
    observed[state] = files.map(read);
    expected[state] = before;
    if (state === "off") assert.deepEqual(before, [null, null]);
    else assert.ok(before.every((bytes) => bytes !== null));
  }
  assert.deepEqual(observed, expected);
});

test("I25-C22 limite de eventos: 503 eventos Hermes viram o segmento 1 cheio e o 2 com os 3 seguintes, com chave nova, e outro produtor segue no 2", async () => {
  const prepared = preparedLaunch(scratch, "i25 c22");
  const work = scratch("i25 c22 provas");
  const session = "hermes-sessao-longa";
  const total = MAX_EVENTS + 3;
  const lines = Array.from({ length: total }, (_, i) => hermesRecord("pre_tool_call", { session_id: session, tool_call_id: `chamada-${i}` }));
  const later = claudePayload("pre_tool_bash", { session_id: session, tool_use_id: "depois-do-limite" });
  const reports = path.join(work, "relatorios.ndjson");
  const scenario = writeScenario(work, "limite", [{ hermesOpen: true }, { hermes: lines }, { waitPersisted: total }, { hook: { agent: "claude", payload: later } }]);
  const result = await runSkillMe(["hermes", ...agentArgs("hermes")], { env: { ...prepared.env, FAKE_AGENT_SCENARIO: scenario, FAKE_AGENT_REPORTS: reports } });
  assert.equal(result.status, 0, result.stderr);
  const [{ invocation }] = launchCapturesOnDisk(prepared.root);
  const [full, next, ...rest] = ofInvocation(prepared.root, invocation);
  assert.equal(rest.length, 0, "uma sucessora");
  assert.deepEqual(
    [full.segment, full.state, full.counters.accepted, full.counters.persisted, full.counters.dropped],
    [1, "stopped", MAX_EVENTS, MAX_EVENTS, {}],
    "cheia no limite, sem descarte",
  );
  assert.ok(full.dataBytes <= MAX_BYTES);
  assert.deepEqual(
    [next.segment, next.state, next.counters.persisted, next.counters.dropped, next.content, next.retentionDays, next.limits, next.origin, isoAt(next)],
    [2, "stopped", 4, {}, true, 7, { maxEvents: 500, maxBytes: 8388608 }, "launch", isoAt(full)],
  );
  const calls = (id) => exportOf(prepared.root, id).records.map((r) => r.envelope.ids.toolCallId ?? r.envelope.ids.toolUseId);
  assert.deepEqual(calls(full.id), Array.from({ length: MAX_EVENTS }, (_, i) => expectedPseudonym(prepared.root, full.id, `chamada-${i}`)));
  assert.deepEqual(calls(next.id), [
    ...[500, 501, 502].map((i) => expectedPseudonym(prepared.root, next.id, `chamada-${i}`)),
    expectedPseudonym(prepared.root, next.id, "depois-do-limite"),
  ]);
  assert.notEqual(expectedPseudonym(prepared.root, next.id, session), expectedPseudonym(prepared.root, full.id, session), "chave própria");
  assert.deepEqual(readJsonLines(reports).map((line) => line.report.delivery), [LAUNCHED(1)], "o hook gravou na sucessora");
});

// Enche a captura até `targetBytes` com registros já sanitizados (forma do
// store), como na prova de limite da #23: só a admissão por bytes é observada.
async function fillBytes(root, id, targetBytes) {
  const count = 8;
  const base = recordLineBytes(sanitizedRecord(0));
  const share = Math.floor(targetBytes / count);
  const records = Array.from({ length: count }, (_, i) => sanitizedRecord(i, "p".repeat((i === count - 1 ? targetBytes - share * (count - 1) : share) - base)));
  assert.equal(records.reduce((total, r) => total + recordLineBytes(r), 0), targetBytes);
  await appendRecords({ root, id, batch: { records, malformed: 0, dropped: {}, contentOmitted: {} } });
}

test("I25-C23 limite de 8 MiB: o registro que cabe exatamente fica, e o que não cabe abre o segmento seguinte sem descarte", async () => {
  for (const [label, gap] of [["cabe exatamente", 0], ["falta um byte", 1]]) {
    const prepared = preparedLaunch(scratch, `i25 c23 ${gap}`, { agents: ["claude"] });
    const work = scratch(`i25 c23 ${gap} provas`);
    const f = (name) => path.join(work, name);
    const payload = claudePayload("pre_tool_bash", { session_id: `sessao-bytes-${gap}` });
    const scenario = writeScenario(work, "bytes", [
      { hook: { agent: "claude", payload } },
      { touch: f("medido") },
      { waitFile: f("cheio") },
      { hook: { agent: "claude", payload } },
      ...(gap === 0 ? [{ touch: f("segundo") }, { waitFile: f("conferido") }, { hook: { agent: "claude", payload } }] : []),
    ]);
    const running = runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_SCENARIO: scenario } });
    await waitFor(() => existsSync(f("medido")), "primeiro evento");
    const [first] = launchCapturesOnDisk(prepared.root);
    const size = recordLineBytes(exportOf(prepared.root, first.id).records[0]);
    assert.equal(first.dataBytes, size);
    await fillBytes(prepared.root, first.id, MAX_BYTES - size + gap - first.dataBytes);
    writeFileSync(f("cheio"), "");
    if (gap === 0) {
      await waitFor(() => existsSync(f("segundo")), "segundo evento");
      const exact = statusOf(prepared.root, first.id);
      assert.deepEqual([exact.state, exact.dataBytes, exact.counters.dropped, launchCapturesOnDisk(prepared.root).length], ["active", MAX_BYTES, {}, 1], `${label}: ficou na mesma captura`);
      writeFileSync(f("conferido"), "");
    }
    const result = await running;
    assert.equal(result.status, 0, result.stderr);
    const [full, next, ...rest] = ofInvocation(prepared.root, first.invocation);
    assert.equal(rest.length, 0, `${label}: uma sucessora`);
    assert.deepEqual([full.state, full.dataBytes, full.counters.dropped], ["stopped", gap === 0 ? MAX_BYTES : MAX_BYTES - size + gap, {}], `${label}: cheia sem passar do limite nem descartar`);
    const moved = exportOf(prepared.root, next.id).records;
    assert.deepEqual([next.segment, moved.length, recordLineBytes(moved[0]), next.counters.dropped], [2, 1, size, {}], `${label}: o evento que não coube é o primeiro da sucessora`);
  }
});

test("I25-C17 ponteiro some no encerramento e a lista mostra a execução", async () => {
  const prepared = preparedLaunch(scratch, "i25 c17 lista", { agents: ["claude"] });
  const result = await runSkillMe(["claude", ...agentArgs("claude")], { env: prepared.env });
  assert.equal(result.status, 0);
  const [capture] = listCaptures(prepared.root);
  assert.deepEqual([capture.origin, capture.segment, HEX32.test(capture.invocation)], ["launch", 1, true]);
  assert.equal(existsSync(pointerFile(prepared.root, capture.invocation)), false);
});
