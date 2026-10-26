import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { after, test } from "node:test";
import { runSkillMe as runInProcess } from "../../../src/integrations/launch/command.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { INTEGRATIONS_CLI, REPO_ROOT, makeScratch, runIntegrationsJson } from "../helpers/cli.mjs";
import { FIXTURES_DIR } from "../helpers/fixtures.mjs";
import { locateSystemPython } from "../helpers/hermes-runtime.mjs";
import { agentArgs, launchCapturesOnDisk, ofInvocation, pointerFile, preparedLaunch, readJsonLines, runSkillMe, writeScenario } from "../helpers/launch.mjs";
import { automaticOf, runNpmScript } from "../helpers/observe.mjs";
import { claudePayload, hermesRecord } from "../helpers/privacy-canaries.mjs";
import { runPrivacy } from "../helpers/privacy-store.mjs";
import { ISO_MS, expectedPseudonym, exportOf, runHook, statusOf, storeDir } from "../helpers/traces.mjs";
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
  rmSync(lock);
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
