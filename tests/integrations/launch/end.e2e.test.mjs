import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { after, test } from "node:test";
import { runSkillMe as runInProcess } from "../../../src/integrations/launch/command.mjs";
import { claudeHookDraft } from "../../../src/integrations/adapters/claude.mjs";
import { createLaunchDelivery } from "../../../src/integrations/observe/delivery.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { appendRecords, startLaunch } from "../../../src/integrations/privacy/store.mjs";
import { INTEGRATIONS_CLI, REPO_ROOT, makeScratch, runIntegrationsJson } from "../helpers/cli.mjs";
import { FIXTURES_DIR } from "../helpers/fixtures.mjs";
import { locateSystemPython } from "../helpers/hermes-runtime.mjs";
import { agentArgs, launchCapturesOnDisk, ofInvocation, pointerFile, preparedLaunch, readJsonLines, runSkillMe, writeScenario } from "../helpers/launch.mjs";
import { automaticOf, runNpmScript } from "../helpers/observe.mjs";
import { claudePayload, hermesRecord } from "../helpers/privacy-canaries.mjs";
import { runPrivacy, sanitizedRecord } from "../helpers/privacy-store.mjs";
import { ISO_MS, TRACES_PROBE, captureDir, expectedPseudonym, exportOf, runHook, statusOf, storeDir } from "../helpers/traces.mjs";
import { snapshotTree } from "../helpers/tree.mjs";

// Provas S4 da issue #25 sobre o encerramento (C25–C28, C31–C33): o fim da
// execução quando o agente sai, o resumo no stderr, a revogação dos produtores,
// as entregas Hermes em voo pelo plugin real, a falha do encerramento e a
// concorrência com outra invocação e com on/off. Linhas literais do Landing de
// .checks/issue-25-agent-launch.md ("Mensagens do launcher", "Ordem e falha do
// encerramento").

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

const LAUNCHED = (n) => ({ launch: true, code: null, entries: n, committed: n, persisted: n, lost: 0 });
const manualStepsOf = (agent, target, env) => runIntegrationsJson(["plan", "--agent", agent, "--target", target], { env }).report.manualSteps;

async function waitFor(predicate, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`tempo esgotado: ${label}`);
    await sleep(20);
  }
}

test("I25-C25 encerramento e resumo: depois da saída, as capturas da execução estão stopped, o ponteiro sumiu e o stderr traz o resumo por captura", async () => {
  const prepared = preparedLaunch(scratch, "i25 c25");
  const work = scratch("i25 c25 provas");
  const f = (name) => path.join(work, name);
  // Dois segmentos: a corrente é encerrada à mão no meio e o próximo evento abre a sucessora;
  // um evento desconhecido do Hermes conta como descarte na sucessora.
  const scenario = writeScenario(work, "resumo", [
    { hook: { agent: "claude", payload: claudePayload("pre_tool_bash") } },
    { touch: f("primeiro") },
    { waitFile: f("parada") },
    { hermesOpen: true },
    { hermes: [hermesRecord("pre_tool_call", { session_id: "s" }), { hook: "gancho_desconhecido", kwargs: {}, nonScalar: [] }] },
    { waitPersisted: 2 },
  ]);
  const running = runSkillMe(["hermes", ...agentArgs("hermes")], { env: { ...prepared.env, FAKE_AGENT_SCENARIO: scenario, FAKE_AGENT_EXIT: "3" } });
  await waitFor(() => existsSync(f("primeiro")), "primeiro evento");
  const [first] = launchCapturesOnDisk(prepared.root);
  assert.equal(runPrivacy(["stop", "--root", prepared.root, "--capture", first.id]).status, 0);
  writeFileSync(f("parada"), "");
  const result = await running;
  const captures = ofInvocation(prepared.root, first.invocation);
  assert.equal(captures.length, 2);
  for (const capture of captures) {
    assert.equal(capture.state, "stopped");
    assert.match(capture.endedAt, ISO_MS);
  }
  assert.equal(existsSync(pointerFile(prepared.root, first.invocation)), false, "o ponteiro sumiu");
  assert.deepEqual(captures[1].counters.dropped, { unknown_event: 1 });
  assert.equal(result.status, 3, "o código do agente");
  assert.equal(
    result.stderr,
    [
      `skill-me: execução ${first.invocation} encerrada; capturas: 2; eventos gravados: 2.`,
      `skill-me: segmento 1: captura ${captures[0].id} stopped; gravados 1; descartados: nenhum.`,
      `skill-me: segmento 2: captura ${captures[1].id} stopped; gravados 1; descartados: unknown_event 1.`,
      "skill-me: consulte com: skill-me report",
      "",
    ].join("\n"),
  );
});

test("I25-C26 nada gravado: o resumo diz que nada foi gravado e repete o primeiro passo manual de confiança do agente", async () => {
  const observed = {};
  const expected = {};
  for (const agent of ["codex", "claude", "hermes"]) {
    const prepared = preparedLaunch(scratch, `i25 c26 ${agent}`, { agents: [agent] });
    const [step] = manualStepsOf(agent, prepared.homes[agent], prepared.env);
    const result = await runSkillMe([agent, ...agentArgs(agent)], { env: prepared.env });
    const [capture] = launchCapturesOnDisk(prepared.root);
    observed[agent] = result.stderr;
    expected[agent] = [
      `skill-me: execução ${capture.invocation} encerrada; capturas: 1; eventos gravados: 0.`,
      `skill-me: segmento 1: captura ${capture.id} stopped; gravados 0; descartados: nenhum.`,
      `skill-me: nada foi gravado nesta execução. Confira a confiança do agente: ${step}`,
      "skill-me: consulte com: skill-me report",
      "",
    ].join("\n");
  }
  assert.deepEqual(observed, expected);
});

test("I25-C27 revogação: depois do encerramento, um produtor com o par da execução recebe launch_ended e nada é gravado", async () => {
  const prepared = preparedLaunch(scratch, "i25 c27", { agents: ["claude"] });
  const result = await runSkillMe(["claude", ...agentArgs("claude")], { env: prepared.env });
  assert.equal(result.status, 0);
  const [capture] = launchCapturesOnDisk(prepared.root);
  const before = snapshotTree(prepared.root);
  const env = { ...prepared.env, SKILL_ME_LAUNCH_ROOT: prepared.rootReal, SKILL_ME_LAUNCH_ID: capture.invocation };
  const late = await runHook("claude", claudePayload("pre_tool_bash"), { env, cwd: scratch("i25 c27 projeto") });
  assert.deepEqual(late.report.delivery, { launch: true, code: "launch_ended", entries: 1, committed: 0, persisted: 0, lost: 1 });
  assert.deepEqual(snapshotTree(prepared.root), before);
});

const PYTHON = locateSystemPython();
const PLUGIN_SOURCE = path.join(REPO_ROOT, "src", "integrations", "hermes", "plugin", "__init__.py");

test("I25-C28 entregas Hermes em voo: com o plugin real e o processo de entrega já em execução, 3 registros entregues logo antes da saída somam persisted 3, todos stopped", { skip: PYTHON.skipReason ? `python-ausente: ${PYTHON.skipReason}` : false }, async () => {
  const prepared = preparedLaunch(scratch, "i25 c28", { agents: ["hermes"] });
  const work = scratch("i25 c28 provas");
  const executable = spawnSync(PYTHON.command, [...PYTHON.prefix, "-I", "-c", "import sys; print(sys.executable)"], { encoding: "utf8" }).stdout.trim();
  const hooks = [
    hermesRecord("on_session_start", { session_id: "sessao-voo" }),
    hermesRecord("pre_tool_call", { session_id: "sessao-voo", tool_call_id: "voo-1" }),
    hermesRecord("post_tool_call", { session_id: "sessao-voo", tool_call_id: "voo-1" }),
  ].map(({ hook, kwargs }) => ({ hook, kwargs }));
  writeFileSync(path.join(work, "hooks.json"), JSON.stringify(hooks));
  const output = path.join(work, "plugin.json");
  const scenario = writeScenario(work, "plugin", [
    { run: { command: executable, args: ["-I", "-B", path.join(FIXTURES_DIR, "launch", "hermes-plugin-session.py"), PLUGIN_SOURCE, path.join(work, "hooks.json")], output } },
  ]);
  const result = await runSkillMe(["hermes", ...agentArgs("hermes")], { env: { ...prepared.env, FAKE_AGENT_SCENARIO: scenario } });
  const run = JSON.parse(readFileSync(output, "utf8"));
  assert.equal(run.status, 0, run.out);
  const plugin = JSON.parse(run.out.trim().split("\n").at(-1));
  assert.deepEqual(
    { started: plugin.started, delivered: plugin.delivered, enqueued: plugin.stats.enqueued, sent: plugin.stats.delivered, queueFull: plugin.stats.droppedQueueFull, failed: plugin.stats.deliveryFailed },
    { started: true, delivered: true, enqueued: 3, sent: 3, queueFull: 0, failed: 0 },
    "o plugin entregou os 3 e nada ficou na fila",
  );
  const captures = launchCapturesOnDisk(prepared.root);
  assert.deepEqual(
    { persisted: captures.reduce((sum, c) => sum + c.counters.persisted, 0), states: captures.map((c) => c.state), status: result.status },
    { persisted: 3, states: captures.map(() => "stopped"), status: 0 },
    result.stderr,
  );
  assert.ok(result.stderr.includes("eventos gravados: 3."), result.stderr);
});

test("I25-C31 encerramento falha: com lock alheio por mais de 2 s, o código, a captura active, o comando privacy stop e a execução aberta; o comando encerra a captura", async () => {
  const prepared = preparedLaunch(scratch, "i25 c31 lock", { agents: ["claude"] });
  const lock = path.join(storeDir(prepared.root), ".lock");
  const scenario = writeScenario(scratch("i25 c31 lock provas"), "lock", [{ writeFile: { path: lock, text: "lock alheio\n" } }]);
  const result = await runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_SCENARIO: scenario, FAKE_AGENT_EXIT: "6" } });
  const [capture] = launchCapturesOnDisk(prepared.root);
  const inv = capture.invocation;
  assert.equal(result.status, 6, "o código do agente");
  assert.equal(
    result.stderr,
    [
      `skill-me: não foi possível encerrar a execução ${inv} [lock_present]; a captura ${capture.id} continua active.`,
      `skill-me: encerre com: "${process.execPath}" "${INTEGRATIONS_CLI}" privacy stop --root "${prepared.root}" --capture ${capture.id}`,
      `skill-me: a execução ${inv} continua aberta: o comando acima encerra só a captura ${capture.id}, e um processo do agente que ainda grave abre a captura seguinte; rode-o depois que o agente e os processos dele terminarem.`,
      "",
    ].join("\n"),
  );
  assert.deepEqual([capture.state, existsSync(pointerFile(prepared.root, inv))], ["active", true]);
  // `unlinkSync`, não `rmSync`: no Windows, o do Node 24.13.0 (o da CI) não
  // apaga num caminho com "ação" e não lança (nodejs/node#56049).
  unlinkSync(lock);
  assert.equal(existsSync(lock), false, "o lock alheio saiu");
  const stop = spawnSync(process.execPath, [INTEGRATIONS_CLI, "privacy", "stop", "--root", prepared.root, "--capture", capture.id], { encoding: "utf8", env: prepared.env });
  assert.equal(stop.status, 0, stop.stdout);
  assert.equal(statusOf(prepared.root, capture.id).state, "stopped", "o comando mostrado encerra a captura");
});

test("I25-C31 encerramento falha: com E/S depois de apagar o ponteiro, a execução já não recebe registros e o comando encerra a captura", async () => {
  const prepared = preparedLaunch(scratch, "i25 c31 io", { agents: ["claude"] });
  const base = createStoreIo();
  let stateRenames = 0;
  // A 1ª gravação de state.json é a abertura da execução; a 2ª, o encerramento da corrente.
  const io = {
    ...base,
    async rename(from, to) {
      if (path.basename(to) === "state.json" && ++stateRenames === 2) throw Object.assign(new Error("EIO"), { code: "EIO" });
      return base.rename(from, to);
    },
  };
  let stderr = "";
  const result = await runInProcess({
    argv: ["claude", ...agentArgs("claude")],
    deps: { env: { ...prepared.env, FAKE_AGENT_EXIT: "2" }, home: prepared.home, io, proc: new EventEmitter(), terminal: false, writeOut: () => {}, writeErr: (t) => (stderr += t), readLine: () => null },
  });
  const [capture] = launchCapturesOnDisk(prepared.root);
  const inv = capture.invocation;
  assert.equal(result.exitCode, 2);
  assert.equal(
    stderr,
    [
      `skill-me: não foi possível encerrar a execução ${inv} [io_failure]; a captura ${capture.id} continua active.`,
      `skill-me: encerre com: "${process.execPath}" "${INTEGRATIONS_CLI}" privacy stop --root "${prepared.root}" --capture ${capture.id}`,
      `skill-me: a execução ${inv} já não recebe registros; o comando acima só encerra a captura.`,
      "",
    ].join("\n"),
  );
  assert.deepEqual([capture.state, existsSync(pointerFile(prepared.root, inv))], ["active", false]);
  const late = await runHook("claude", claudePayload("pre_tool_bash"), { env: { ...prepared.env, SKILL_ME_LAUNCH_ROOT: prepared.rootReal, SKILL_ME_LAUNCH_ID: inv }, cwd: scratch("i25 c31 projeto") });
  assert.equal(late.report.delivery.code, "launch_ended");
  assert.equal(runPrivacy(["stop", "--root", prepared.root, "--capture", capture.id]).status, 0);
  assert.equal(statusOf(prepared.root, capture.id).state, "stopped");
});

test("I25-C32 invocações simultâneas: capturas e chaves próprias, nenhum registro cruzado, e a saída da primeira não encerra a outra", async () => {
  const prepared = preparedLaunch(scratch, "i25 c32", { agents: ["claude"] });
  const work = scratch("i25 c32 provas");
  const f = (name) => path.join(work, name);
  const hook = (id) => ({ hook: { agent: "claude", payload: claudePayload("pre_tool_bash", { session_id: "sessao-compartilhada", tool_use_id: id }) } });
  const scenarioA = writeScenario(work, "a", [hook("a-1"), { touch: f("A1") }, { waitFile: f("B1") }, hook("a-2"), { touch: f("A2") }, { waitFile: f("A-fim") }]);
  const scenarioB = writeScenario(work, "b", [{ waitFile: f("A1") }, hook("b-1"), { touch: f("B1") }, { waitFile: f("A2") }, hook("b-2"), { touch: f("B2") }, { waitFile: f("B-segue") }, hook("b-3"), { touch: f("B3") }, { waitFile: f("B-fim") }]);
  const probeA = f("probe-a.ndjson");
  const probeB = f("probe-b.ndjson");
  const runA = runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_SCENARIO: scenarioA, FAKE_AGENT_PROBE: probeA } });
  const runB = runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_SCENARIO: scenarioB, FAKE_AGENT_PROBE: probeB } });
  await waitFor(() => existsSync(f("A2")) && existsSync(f("B2")), "eventos intercalados");
  writeFileSync(f("A-fim"), "");
  const resultA = await runA;
  assert.equal(resultA.status, 0, resultA.stderr);
  const invA = readJsonLines(probeA)[0].env.SKILL_ME_LAUNCH_ID;
  const invB = readJsonLines(probeB)[0].env.SKILL_ME_LAUNCH_ID;
  assert.notEqual(invA, invB);
  const [capA] = ofInvocation(prepared.root, invA);
  const [capB] = ofInvocation(prepared.root, invB);
  assert.deepEqual([capA.state, capB.state], ["stopped", "active"], "a saída da primeira encerra só a dela");
  writeFileSync(f("B-segue"), "");
  await waitFor(() => existsSync(f("B3")), "evento depois da saída da outra");
  writeFileSync(f("B-fim"), "");
  const resultB = await runB;
  assert.equal(resultB.status, 0, resultB.stderr);
  const uses = (root, id) => exportOf(root, id).records.map((r) => r.envelope.ids.toolUseId);
  assert.deepEqual(uses(prepared.root, capA.id), ["a-1", "a-2"].map((v) => expectedPseudonym(prepared.root, capA.id, v)));
  assert.deepEqual(uses(prepared.root, capB.id), ["b-1", "b-2", "b-3"].map((v) => expectedPseudonym(prepared.root, capB.id, v)));
  assert.notEqual(expectedPseudonym(prepared.root, capA.id, "sessao-compartilhada"), expectedPseudonym(prepared.root, capB.id, "sessao-compartilhada"), "chaves próprias");
  assert.deepEqual([ofInvocation(prepared.root, invA).length, ofInvocation(prepared.root, invB).length], [1, 1]);
});

test("I25-C33 on e off durante a invocação: a corrente continua active e os eventos seguintes entram nela, sem captura automática", async () => {
  const prepared = preparedLaunch(scratch, "i25 c33", { agents: ["claude"] });
  const work = scratch("i25 c33 provas");
  const f = (name) => path.join(work, name);
  const hook = (id) => ({ hook: { agent: "claude", payload: claudePayload("pre_tool_bash", { session_id: "sessao-c33", tool_use_id: id }) } });
  const reports = f("relatorios.ndjson");
  const scenario = writeScenario(work, "onoff", [hook("e-1"), { touch: f("E1") }, { waitFile: f("ligado") }, hook("e-2"), { touch: f("E2") }, { waitFile: f("desligado") }, hook("e-3")]);
  const running = runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_SCENARIO: scenario, FAKE_AGENT_REPORTS: reports } });
  await waitFor(() => existsSync(f("E1")), "primeiro evento");
  const [capture] = launchCapturesOnDisk(prepared.root);
  // O npm roda o script com o `node` do PATH, como no terminal do usuário.
  const npmEnv = { ...prepared.env, PATH: [path.dirname(process.execPath), prepared.env.PATH].join(path.delimiter) };
  const on = runNpmScript("on", { env: npmEnv });
  assert.deepEqual([on.status, on.body.observation.state], [0, "on"]);
  assert.equal(statusOf(prepared.root, capture.id).state, "active", "on não muda a execução");
  writeFileSync(f("ligado"), "");
  await waitFor(() => existsSync(f("E2")), "evento com on");
  const off = runNpmScript("off", { env: npmEnv });
  assert.deepEqual([off.status, off.body.observation.state, off.body.stopped], [0, "off", []]);
  assert.equal(statusOf(prepared.root, capture.id).state, "active", "off não encerra a execução");
  writeFileSync(f("desligado"), "");
  const result = await running;
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readJsonLines(reports).map((line) => line.report.delivery), [LAUNCHED(1), LAUNCHED(1), LAUNCHED(1)]);
  assert.deepEqual(
    exportOf(prepared.root, capture.id).records.map((r) => r.envelope.ids.toolUseId),
    ["e-1", "e-2", "e-3"].map((v) => expectedPseudonym(prepared.root, capture.id, v)),
  );
  assert.deepEqual(automaticOf(prepared.root), [], "nenhuma captura automática nasceu da sessão");
  assert.equal(ofInvocation(prepared.root, capture.invocation).length, 1);
});

// C41 (revisão formal em 2fd858a, P2 de store.mjs:1071; linha "Sucessora não
// publicada" do Landing), pelo launcher real: um produtor da execução cria a
// sucessora e a publicação do ponteiro dela falha (io instrumentado só nesse
// produtor, em processo); depois o agente sai.
test("I25-C41 encerramento pelo launcher com sucessora não publicada: o resumo lista as duas capturas stopped e nenhuma fica active", async () => {
  const prepared = preparedLaunch(scratch, "i25 c41 launcher", { agents: ["claude"] });
  const work = scratch("i25 c41 launcher provas");
  const f = (name) => path.join(work, name);
  const scenario = writeScenario(work, "espera", [{ touch: f("pronto") }, { waitFile: f("segue") }]);
  const running = runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_SCENARIO: scenario, FAKE_AGENT_PROBE: f("probe.ndjson") } });
  await waitFor(() => existsSync(f("pronto")), "agente pronto");
  const invocation = readJsonLines(f("probe.ndjson"))[0].env.SKILL_ME_LAUNCH_ID;
  const [first] = ofInvocation(prepared.root, invocation);
  const records = Array.from({ length: 500 }, (_, i) => sanitizedRecord(i));
  assert.equal((await appendRecords({ root: prepared.rootReal, id: first.id, batch: { records, malformed: 0, dropped: {}, contentOmitted: {} } })).admitted, 500);
  const base = createStoreIo();
  let armed = true;
  const io = {
    ...base,
    async rename(from, to) {
      if (armed && path.basename(to) === `${invocation}.json`) {
        armed = false;
        throw Object.assign(new Error("falha de E/S injetada"), { code: "EIO" });
      }
      return base.rename(from, to);
    },
  };
  const producer = createLaunchDelivery({ root: prepared.rootReal, invocation, agent: "claude", io });
  const payload = claudePayload("pre_tool_bash");
  producer.submit(claudeHookDraft(payload), payload);
  await producer.settle();
  assert.equal(producer.report().code, "io_failure");
  writeFileSync(f("segue"), "");
  const result = await running;
  const captures = ofInvocation(prepared.root, invocation);
  assert.deepEqual(captures.map((c) => [c.segment, c.state, c.counters.persisted]), [[1, "stopped", 500], [2, "stopped", 0]]);
  assert.equal(result.status, 0);
  assert.equal(
    result.stderr,
    [
      `skill-me: execução ${invocation} encerrada; capturas: 2; eventos gravados: 500.`,
      `skill-me: segmento 1: captura ${captures[0].id} stopped; gravados 500; descartados: nenhum.`,
      `skill-me: segmento 2: captura ${captures[1].id} stopped; gravados 0; descartados: nenhum.`,
      "skill-me: consulte com: skill-me report",
      "",
    ].join("\n"),
  );
  assert.equal(existsSync(pointerFile(prepared.root, invocation)), false);
});

// Refinamento de C41 (linha "Descoberta das capturas no encerramento"): a
// leitura do state.json da sucessora não publicada falha por E/S só no
// encerramento, com o arquivo íntegro; a orientação mostrada, rodada depois,
// confere e encerra a captura.
test("I25-C41 encerramento pelo launcher com a sucessora não lida: o launcher não declara a execução conferida e a orientação mostrada a encerra quando a leitura volta", async () => {
  const prepared = preparedLaunch(scratch, "i25 c41 nao lida", { agents: ["claude"] });
  const work = scratch("i25 c41 nao lida provas");
  const f = (name) => path.join(work, name);
  const scenario = writeScenario(work, "espera", [{ touch: f("pronto") }, { waitFile: f("segue") }]);
  const base = createStoreIo();
  const unreadable = new Set();
  const launcherIo = {
    ...base,
    async readBounded(file, maxBytes) {
      if (path.basename(file) === "state.json" && unreadable.has(path.basename(path.dirname(file)))) throw Object.assign(new Error("falha de leitura injetada"), { code: "EIO" });
      return base.readBounded(file, maxBytes);
    },
  };
  let stderr = "";
  const running = runInProcess({
    argv: ["claude", ...agentArgs("claude")],
    deps: { env: { ...prepared.env, FAKE_AGENT_SCENARIO: scenario, FAKE_AGENT_PROBE: f("probe.ndjson") }, home: prepared.home, io: launcherIo, proc: new EventEmitter(), terminal: false, writeOut: () => {}, writeErr: (t) => (stderr += t), readLine: () => null },
  });
  await waitFor(() => existsSync(f("pronto")), "agente pronto");
  const invocation = readJsonLines(f("probe.ndjson"))[0].env.SKILL_ME_LAUNCH_ID;
  const [first] = ofInvocation(prepared.root, invocation);
  const records = Array.from({ length: 500 }, (_, i) => sanitizedRecord(i));
  assert.equal((await appendRecords({ root: prepared.rootReal, id: first.id, batch: { records, malformed: 0, dropped: {}, contentOmitted: {} } })).admitted, 500);
  let armed = true;
  const producerIo = {
    ...base,
    async rename(from, to) {
      if (armed && path.basename(to) === `${invocation}.json`) {
        armed = false;
        throw Object.assign(new Error("falha de E/S injetada"), { code: "EIO" });
      }
      return base.rename(from, to);
    },
  };
  const producer = createLaunchDelivery({ root: prepared.rootReal, invocation, agent: "claude", io: producerIo });
  const payload = claudePayload("pre_tool_bash");
  producer.submit(claudeHookDraft(payload), payload);
  await producer.settle();
  const orphan = ofInvocation(prepared.root, invocation).find((c) => c.segment === 2);
  unreadable.add(orphan.id);
  writeFileSync(f("segue"), "");
  const result = await running;
  assert.equal(result.exitCode, 0);
  const cli = `"${process.execPath}" "${INTEGRATIONS_CLI}"`;
  assert.equal(
    stderr,
    [
      `skill-me: a execução ${invocation} já não recebe registros, mas não foi possível conferir se todas as capturas dela pararam [io_failure].`,
      `skill-me: capturas que não puderam ser lidas: ${orphan.id}.`,
      `skill-me: quando a leitura voltar, confira com ${cli} privacy status --root "${prepared.root}" --capture ${orphan.id}; se mostrar "invocation":"${invocation}" e "state":"active", encerre com ${cli} privacy stop --root "${prepared.root}" --capture ${orphan.id}`,
      "",
    ].join("\n"),
  );
  assert.deepEqual(ofInvocation(prepared.root, invocation).map((c) => [c.segment, c.state, c.counters.persisted]), [[1, "stopped", 500], [2, "active", 0]]);
  assert.equal(existsSync(pointerFile(prepared.root, invocation)), false);
  const status = spawnSync(process.execPath, [INTEGRATIONS_CLI, "privacy", "status", "--root", prepared.root, "--capture", orphan.id], { encoding: "utf8", env: prepared.env });
  assert.equal(status.status, 0, status.stdout);
  assert.ok(status.stdout.includes(`"invocation":"${invocation}"`) && status.stdout.includes('"state":"active"'), status.stdout);
  const stop = spawnSync(process.execPath, [INTEGRATIONS_CLI, "privacy", "stop", "--root", prepared.root, "--capture", orphan.id], { encoding: "utf8", env: prepared.env });
  assert.equal(stop.status, 0, stop.stdout);
  assert.deepEqual(ofInvocation(prepared.root, invocation).map((c) => c.state), ["stopped", "stopped"]);
});

test("I25-C41 encerramento pelo launcher sem listar a pasta das capturas: o launcher não declara a execução conferida e indica o privacy list", async () => {
  const prepared = preparedLaunch(scratch, "i25 c41 listagem", { agents: ["claude"] });
  const base = createStoreIo();
  let listing = false;
  const io = {
    ...base,
    async readdir(dir) {
      if (listing && path.basename(dir) === "captures") throw Object.assign(new Error("falha de listagem injetada"), { code: "EIO" });
      return base.readdir(dir);
    },
    async unlink(file) {
      // O ponteiro sai no início do encerramento: daí em diante a listagem falha.
      if (path.basename(path.dirname(file)) === "launches") listing = true;
      return base.unlink(file);
    },
  };
  let stderr = "";
  const result = await runInProcess({
    argv: ["claude", ...agentArgs("claude")],
    deps: { env: prepared.env, home: prepared.home, io, proc: new EventEmitter(), terminal: false, writeOut: () => {}, writeErr: (t) => (stderr += t), readLine: () => null },
  });
  const [capture] = launchCapturesOnDisk(prepared.root);
  const inv = capture.invocation;
  const cli = `"${process.execPath}" "${INTEGRATIONS_CLI}"`;
  assert.equal(result.exitCode, 0);
  assert.equal(
    stderr,
    [
      `skill-me: a execução ${inv} já não recebe registros, mas não foi possível conferir se todas as capturas dela pararam [io_failure].`,
      "skill-me: a pasta das capturas não pôde ser lida.",
      `skill-me: quando a leitura voltar, confira com ${cli} privacy list --root "${prepared.root}"; se mostrar "invocation":"${inv}" e "state":"active", encerre com ${cli} privacy stop --root "${prepared.root}" --capture <id>`,
      "",
    ].join("\n"),
  );
  assert.deepEqual([capture.state, existsSync(pointerFile(prepared.root, inv))], ["stopped", false], "a corrente, lida pelo ponteiro, parou");
});

test("I25-C41 abertura pelo launcher: falha do ponteiro e falha ao parar o segmento 1 nomeiam a captura active e o comando privacy stop a encerra", async () => {
  const prepared = preparedLaunch(scratch, "i25 c41 abertura", { agents: ["claude"] });
  const base = createStoreIo();
  let pointerFailed = false;
  const io = {
    ...base,
    async rename(from, to) {
      if (path.basename(path.dirname(to)) === "launches") {
        pointerFailed = true;
        throw Object.assign(new Error("falha de E/S injetada"), { code: "EIO" });
      }
      if (pointerFailed && path.basename(to) === "state.json") throw Object.assign(new Error("falha de E/S injetada"), { code: "EIO" });
      return base.rename(from, to);
    },
  };
  const probe = path.join(scratch("i25 c41 abertura provas"), "probe.ndjson");
  let stderr = "";
  const result = await runInProcess({
    argv: ["claude", ...agentArgs("claude")],
    deps: { env: { ...prepared.env, FAKE_AGENT_PROBE: probe }, home: prepared.home, io, proc: new EventEmitter(), terminal: false, writeOut: () => {}, writeErr: (t) => (stderr += t), readLine: () => null },
  });
  const [capture] = launchCapturesOnDisk(prepared.root);
  assert.deepEqual([result.exitCode, existsSync(probe), capture.state], [5, false, "active"]);
  assert.equal(
    stderr,
    [
      "skill-me: não foi possível abrir a execução [io_failure]",
      `skill-me: a captura ${capture.id} ficou active; encerre com: "${process.execPath}" "${INTEGRATIONS_CLI}" privacy stop --root "${prepared.root}" --capture ${capture.id}`,
      "",
    ].join("\n"),
  );
  const stop = spawnSync(process.execPath, [INTEGRATIONS_CLI, "privacy", "stop", "--root", prepared.root, "--capture", capture.id], { encoding: "utf8", env: prepared.env });
  assert.equal(stop.status, 0, stop.stdout);
  assert.equal(statusOf(prepared.root, capture.id).state, "stopped");
});

// Refinamento de C41 (vínculo do ponteiro; linha "Vínculo do ponteiro no
// encerramento" do Landing), pelo launcher real: durante a execução A, o
// ponteiro dela passa a nomear a captura active de B, outra execução da mesma
// raiz aberta pelo store; os demais campos do ponteiro continuam válidos.
async function relinkedRun(label, steps = () => []) {
  const prepared = preparedLaunch(scratch, label, { agents: ["claude"] });
  const work = scratch(`${label} provas`);
  const f = (name) => path.join(work, name);
  const scenario = writeScenario(work, "espera", [{ touch: f("pronto") }, { waitFile: f("segue") }, ...steps(prepared)]);
  const running = runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_SCENARIO: scenario, FAKE_AGENT_PROBE: f("probe.ndjson") } });
  await waitFor(() => existsSync(f("pronto")), "agente pronto");
  const invocation = readJsonLines(f("probe.ndjson"))[0].env.SKILL_ME_LAUNCH_ID;
  const [own] = ofInvocation(prepared.root, invocation);
  const other = await startLaunch({ root: prepared.rootReal, expectedReal: prepared.rootReal });
  const pointer = JSON.parse(readFileSync(pointerFile(prepared.root, invocation), "utf8"));
  writeFileSync(pointerFile(prepared.root, invocation), JSON.stringify({ ...pointer, capture: other.capture }));
  const otherBytes = () => ({
    state: readFileSync(path.join(captureDir(prepared.root, other.capture), "state.json"), "utf8"),
    pointer: readFileSync(pointerFile(prepared.root, other.invocation), "utf8"),
  });
  const before = otherBytes();
  writeFileSync(f("segue"), "");
  return { prepared, invocation, own, other, otherBytes, before, result: await running };
}

test("I25-C41 vínculo do ponteiro pelo launcher: com o ponteiro nomeando a captura active de outra execução, o encerramento para só a da execução e a outra continua gravando", async () => {
  const { prepared, invocation, own, other, otherBytes, before, result } = await relinkedRun("i25 c41 vinculo");
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stderr.startsWith(`skill-me: execução ${invocation} encerrada; capturas: 1; eventos gravados: 0.\nskill-me: segmento 1: captura ${own.id} stopped;`), result.stderr);
  assert.ok(!result.stderr.includes(other.capture), "o stderr não fala da captura alheia");
  assert.deepEqual(otherBytes(), before, "state.json e ponteiro da outra intactos");
  assert.equal(existsSync(pointerFile(prepared.root, invocation)), false);
  const late = await runHook("claude", claudePayload("pre_tool_bash"), { env: { ...prepared.env, SKILL_ME_LAUNCH_ROOT: prepared.rootReal, SKILL_ME_LAUNCH_ID: other.invocation }, cwd: scratch("i25 c41 vinculo projeto") });
  assert.deepEqual(late.report.delivery, LAUNCHED(1), "a outra execução continua gravando");
  assert.deepEqual(ofInvocation(prepared.root, other.invocation).map((c) => [c.segment, c.state, c.counters.persisted]), [[1, "active", 1]]);
});

test("I25-C41 vínculo do ponteiro no diagnóstico: com lock alheio no encerramento e o ponteiro nomeando a captura de outra execução, o stderr indica só a captura da execução e não toca a outra", async () => {
  const lockOf = (prepared) => path.join(storeDir(prepared.root), ".lock");
  const { prepared, invocation, own, other, otherBytes, before, result } = await relinkedRun("i25 c41 vinculo lock", (p) => [{ writeFile: { path: lockOf(p), text: "lock alheio\n" } }]);
  const cli = `"${process.execPath}" "${INTEGRATIONS_CLI}"`;
  assert.equal(result.status, 0);
  assert.equal(
    result.stderr,
    [
      `skill-me: não foi possível encerrar a execução ${invocation} [lock_present]; a captura ${own.id} continua active.`,
      `skill-me: encerre com: ${cli} privacy stop --root "${prepared.root}" --capture ${own.id}`,
      `skill-me: a execução ${invocation} continua aberta: o comando acima encerra só a captura ${own.id}, e um processo do agente que ainda grave abre a captura seguinte; rode-o depois que o agente e os processos dele terminarem.`,
      "",
    ].join("\n"),
  );
  assert.deepEqual(otherBytes(), before, "state.json e ponteiro da outra intactos");
  // `unlinkSync`, não `rmSync`: ver I25-C31 com lock alheio (nodejs/node#56049).
  unlinkSync(lockOf(prepared));
  const stop = spawnSync(process.execPath, [INTEGRATIONS_CLI, "privacy", "stop", "--root", prepared.root, "--capture", own.id], { encoding: "utf8", env: prepared.env });
  assert.equal(stop.status, 0, stop.stdout);
  assert.deepEqual([statusOf(prepared.root, own.id).state, statusOf(prepared.root, other.capture).state], ["stopped", "active"]);
  assert.deepEqual(otherBytes(), before, "o comando mostrado não toca a outra");
});

// C43 (segunda revisão formal em 6d57e6e, P2 de store.mjs:1042; linha "Lock
// após a abertura" do Landing): a abertura grava o segmento 1 e o ponteiro e
// só a liberação do lock da raiz falha. Em processo, com o io de
// createStoreIo instrumentado; em processo real, com a pré-carga de teste.
const C43_CLI = `"${process.execPath}" "${INTEGRATIONS_CLI}"`;
const eio = () => Object.assign(new Error("falha de E/S injetada"), { code: "EIO" });
const rootLockOf = (prepared) => path.join(storeDir(prepared.rootReal), ".lock");
const openedLine = (inv, cap, code) => `skill-me: a execução ${inv} foi aberta com a captura ${cap}, mas a liberação do lock da raiz falhou [${code}]; o agente não foi iniciado.`;
const endFailedLines = (prepared, inv, cap, code) => [
  `skill-me: não foi possível encerrar a execução ${inv} [${code}]; a captura ${cap} continua active.`,
  `skill-me: encerre com: ${C43_CLI} privacy stop --root "${prepared.root}" --capture ${cap}`,
  `skill-me: a execução ${inv} continua aberta: o comando acima encerra só a captura ${cap}, e um processo do agente que ainda grave abre a captura seguinte; rode-o depois que o agente e os processos dele terminarem.`,
];
const lockLine = (lock, pid) =>
  `skill-me: o lock "${lock}" desta invocação pode ter ficado na raiz; enquanto existir, gravações e comandos nela saem com lock_present. Quando a E/S voltar, se ele ainda contiver "pid":${pid} e esse processo tiver terminado, remova-o e só então rode o comando acima.`;

async function launchInProcess(prepared, io, label) {
  const probe = path.join(scratch(`${label} provas`), "probe.ndjson");
  let stderr = "";
  const result = await runInProcess({
    argv: ["claude", ...agentArgs("claude")],
    deps: { env: { ...prepared.env, FAKE_AGENT_PROBE: probe }, home: prepared.home, io, proc: new EventEmitter(), terminal: false, writeOut: () => {}, writeErr: (t) => (stderr += t), readLine: () => null },
  });
  return { exitCode: result.exitCode, stderr, started: existsSync(probe) };
}

// Unlink do `.lock` falhando: `times` vezes, ou sempre (Infinity).
function lockKeptIo(times) {
  const base = createStoreIo();
  let failures = 0;
  return {
    ...base,
    async unlink(file) {
      if (path.basename(file) === ".lock" && failures < times) {
        failures += 1;
        throw eio();
      }
      return base.unlink(file);
    },
  };
}

const otherLaunchBytes = (prepared, other) => () => ({
  state: readFileSync(path.join(captureDir(prepared.root, other.capture), "state.json"), "utf8"),
  pointer: readFileSync(pointerFile(prepared.root, other.invocation), "utf8"),
});
const hookFor = (prepared, invocation, label) =>
  runHook("claude", claudePayload("pre_tool_bash"), { env: { ...prepared.env, SKILL_ME_LAUNCH_ROOT: prepared.rootReal, SKILL_ME_LAUNCH_ID: invocation }, cwd: scratch(label) });

// Recuperação declarada na linha do lock: com o processo terminado e o lock
// ainda com o pid dele, removê-lo e rodar o comando mostrado.
function recoverDeclared(prepared, capture, pid) {
  const lock = rootLockOf(prepared);
  assert.ok(readFileSync(lock, "utf8").includes(`"pid":${pid}`), "o lock ainda é o da invocação");
  // `unlinkSync`, não `rmSync`: ver I25-C31 com lock alheio (nodejs/node#56049).
  unlinkSync(lock);
  const stop = spawnSync(process.execPath, [INTEGRATIONS_CLI, "privacy", "stop", "--root", prepared.root, "--capture", capture], { encoding: "utf8", env: prepared.env });
  assert.equal(stop.status, 0, stop.stdout);
  assert.equal(statusOf(prepared.root, capture).state, "stopped");
}

test("I25-C43 abertura pelo launcher com a liberação do lock falhando por E/S uma vez: o agente não inicia, o stderr dá a execução, a captura active e o lock, e a recuperação declarada a encerra sem mudar a outra execução", async () => {
  const prepared = preparedLaunch(scratch, "i25 c43 transitorio", { agents: ["claude"] });
  const other = await startLaunch({ root: prepared.rootReal, expectedReal: prepared.rootReal });
  const otherBytes = otherLaunchBytes(prepared, other);
  const before = otherBytes();
  const run = await launchInProcess(prepared, lockKeptIo(1), "i25 c43 transitorio");
  const [created] = launchCapturesOnDisk(prepared.root).filter((c) => c.invocation !== other.invocation);
  assert.deepEqual([run.exitCode, run.started], [5, false]);
  assert.equal(run.stderr, [openedLine(created.invocation, created.id, "io_failure"), ...endFailedLines(prepared, created.invocation, created.id, "lock_present"), lockLine(rootLockOf(prepared), process.pid), ""].join("\n"));
  assert.deepEqual([created.segment, created.state, created.endedAt, existsSync(pointerFile(prepared.root, created.invocation))], [1, "active", null, true]);
  // O impedimento declarado: com o lock, a outra execução não grava, e nada dela muda.
  assert.equal((await hookFor(prepared, other.invocation, "i25 c43 transitorio projeto")).report.delivery.code, "lock_present");
  assert.deepEqual(otherBytes(), before);
  recoverDeclared(prepared, created.id, process.pid);
  assert.deepEqual(otherBytes(), before, "a recuperação não toca a outra execução");
  assert.deepEqual((await hookFor(prepared, other.invocation, "i25 c43 transitorio depois")).report.delivery, LAUNCHED(1));
});

test("I25-C43 abertura pelo launcher com a liberação do lock falhando por E/S sempre: o mesmo diagnóstico, e outra abertura na raiz sai com lock_present sem criar captura nem iniciar o agente até a recuperação", async () => {
  const prepared = preparedLaunch(scratch, "i25 c43 persistente", { agents: ["claude"] });
  const io = lockKeptIo(Infinity);
  const run = await launchInProcess(prepared, io, "i25 c43 persistente");
  const [created] = launchCapturesOnDisk(prepared.root);
  assert.deepEqual([run.exitCode, run.started], [5, false]);
  assert.equal(run.stderr, [openedLine(created.invocation, created.id, "io_failure"), ...endFailedLines(prepared, created.invocation, created.id, "lock_present"), lockLine(rootLockOf(prepared), process.pid), ""].join("\n"));
  const again = await launchInProcess(prepared, io, "i25 c43 persistente outra");
  assert.deepEqual([again.exitCode, again.started, again.stderr], [4, false, "skill-me: não foi possível abrir a execução [lock_present]\n"]);
  assert.deepEqual(launchCapturesOnDisk(prepared.root).map((c) => [c.id, c.state]), [[created.id, "active"]], "nenhuma captura nova");
  recoverDeclared(prepared, created.id, process.pid);
});

test("I25-C43 abertura pelo launcher com o lock trocado por outro processo depois de gravar: root_changed, o encerramento sai com lock_present e o lock alheio não é citado nem removido", async () => {
  const prepared = preparedLaunch(scratch, "i25 c43 trocado", { agents: ["claude"] });
  const FOREIGN = '{"lockVersion":1,"pid":1,"nonce":"0000000000000000"}';
  const base = createStoreIo();
  let swapped = false;
  const io = {
    ...base,
    async rename(from, to) {
      await base.rename(from, to);
      if (!swapped && path.basename(path.dirname(to)) === "launches") {
        swapped = true;
        writeFileSync(rootLockOf(prepared), FOREIGN);
      }
    },
  };
  const run = await launchInProcess(prepared, io, "i25 c43 trocado");
  const [created] = launchCapturesOnDisk(prepared.root);
  assert.deepEqual([run.exitCode, run.started], [4, false]);
  assert.equal(run.stderr, [openedLine(created.invocation, created.id, "root_changed"), ...endFailedLines(prepared, created.invocation, created.id, "lock_present"), ""].join("\n"));
  assert.equal(readFileSync(rootLockOf(prepared), "utf8"), FOREIGN, "o lock alheio fica byte a byte");
  assert.equal(created.state, "active");
});

test("I25-C43 abertura pelo launcher (processo real) com o lock mantido pela falha de E/S: o diagnóstico traz o pid do launcher, que já terminou, e a recuperação declarada libera a raiz para uma nova abertura", async () => {
  const prepared = preparedLaunch(scratch, "i25 c43 real", { agents: ["claude"] });
  const work = scratch("i25 c43 real provas");
  const probe = path.join(work, "probe.ndjson");
  const result = await runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_PROBE: probe, NODE_OPTIONS: `--import=${TRACES_PROBE}`, SKILL_ME_TEST_TRACES_LOCK_KEPT: "1" } });
  const [created] = launchCapturesOnDisk(prepared.root);
  const lock = rootLockOf(prepared);
  assert.deepEqual([result.status, existsSync(probe), JSON.parse(readFileSync(lock, "utf8")).pid], [5, false, result.pid]);
  assert.equal(result.stderr, [openedLine(created.invocation, created.id, "io_failure"), ...endFailedLines(prepared, created.invocation, created.id, "lock_present"), lockLine(lock, result.pid), ""].join("\n"));
  assert.deepEqual([created.state, created.endedAt], ["active", null]);
  recoverDeclared(prepared, created.id, result.pid);
  const next = await runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_PROBE: path.join(work, "probe-seguinte.ndjson") } });
  assert.equal(next.status, 0, next.stderr);
  assert.ok(existsSync(path.join(work, "probe-seguinte.ndjson")), "a nova abertura inicia o agente");
});

test("I25-C43 abertura pelo launcher (processo real) com a confirmação da liberação perdida: o agente não inicia, o encerramento conclui e o resumo mostra a captura stopped, sem linha de lock", async () => {
  const prepared = preparedLaunch(scratch, "i25 c43 confirmacao", { agents: ["claude"] });
  const probe = path.join(scratch("i25 c43 confirmacao provas"), "probe.ndjson");
  const result = await runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_PROBE: probe, NODE_OPTIONS: `--import=${TRACES_PROBE}`, SKILL_ME_TEST_TRACES_LOST_CONFIRMATION: "1" } });
  const [created] = launchCapturesOnDisk(prepared.root);
  assert.deepEqual([result.status, existsSync(probe)], [5, false]);
  assert.equal(
    result.stderr,
    [
      openedLine(created.invocation, created.id, "io_failure"),
      `skill-me: execução ${created.invocation} encerrada; capturas: 1; eventos gravados: 0.`,
      `skill-me: segmento 1: captura ${created.id} stopped; gravados 0; descartados: nenhum.`,
      "skill-me: consulte com: skill-me report",
      "",
    ].join("\n"),
  );
  assert.deepEqual([created.state, existsSync(pointerFile(prepared.root, created.invocation)), existsSync(rootLockOf(prepared))], ["stopped", false, false]);
});
