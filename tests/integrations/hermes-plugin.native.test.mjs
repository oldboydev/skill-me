import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { INTEGRATIONS_CLI, assertPseudonymIds, baseEnv, makeScratch, parseReport, runIntegrationsJson } from "./helpers/cli.mjs";
import { fixtureCase } from "./helpers/fixtures.mjs";
import { DELIVERY_FIXTURE, FIXTURE_PLUGINS, bytecodeState, harnessEnv, locateHermesRuntime, runHarness } from "./helpers/hermes-runtime.mjs";
import { snapshotTree } from "./helpers/tree.mjs";

// Prova nativa: PluginManager, invoke_hook e handle_function_call reais do
// Hermes 0.21.4 local, em HERMES_HOME temporário, `python -I -B`, plugins
// empacotados desviados para diretório vazio e sem modelos. Sem esse runtime
// (ou com outra revisão), todos os testes ficam `skipped` com o motivo — prova
// nativa pendente, nunca aprovada por simulação.
const runtime = locateHermesRuntime();
const SKIP = runtime.skipReason ? `hermes-runtime-ausente: ${runtime.skipReason}` : false;
const NODE = process.execPath;
const ARGS = { value: "SKILLME-CANARY-args ação" };
const IDS = { session_id: "hermes-native-sess", task_id: "hermes-native-task", turn_id: "hermes-native-turn" };
const SEVEN = ["on_session_end", "on_session_start", "on_skill_lifecycle", "post_tool_call", "pre_tool_call", "subagent_start", "subagent_stop"];
const kw = (name) => fixtureCase("hermes-hooks.json", name).kwargs;

const scratches = [];
const runs = {};
let bytecodeBefore;

// Entradas do HERMES_HOME criadas, alteradas (conteúdo ou mtime) ou removidas
// durante o harness, por caminho relativo, com o conteúdo de cada arquivo. O
// backup que o host grava do config.yaml leva data e hora no nome, que é
// normalizado para comparar execuções.
function homeChanges(before, after) {
  const changes = {};
  for (const [rel, entry] of Object.entries(after)) {
    if (JSON.stringify(before[rel]) === JSON.stringify(entry)) continue;
    changes[rel.replace(/\.good\.\d{8}-\d{6}$/, ".good.<data>")] = entry.type === "file" ? { type: "file", sha256: entry.sha256 } : { type: entry.type };
  }
  for (const rel of Object.keys(before)) if (!(rel in after)) changes[rel] = { type: "removed" };
  return changes;
}

async function prepareAndRun(name, { delivery, enable = ["skill-me-observer", "skillme-fixture-tool"], installObserver = enable.includes("skill-me-observer"), timeout = 30, scenario }) {
  const sandbox = makeScratch(`hermes-${name}`);
  scratches.push(sandbox);
  const env = harnessEnv(sandbox, delivery ? { SKILL_ME_HERMES_DELIVERY: JSON.stringify(delivery(sandbox)) } : {});
  const home = env.HERMES_HOME;
  mkdirSync(home, { recursive: true });
  if (installObserver) {
    const installed = runIntegrationsJson(["install", "--agent", "hermes", "--target", home, "--apply"], { env: baseEnv() });
    assert.equal(installed.status, 0, installed.stdout);
  }
  for (const plugin of enable.filter((p) => p !== "skill-me-observer")) {
    cpSync(path.join(FIXTURE_PLUGINS, plugin), path.join(home, "plugins", plugin), { recursive: true });
  }
  // Habilitação manual simulada no HERMES_HOME do teste (o instalador nunca a faz).
  writeFileSync(path.join(home, "config.yaml"), `plugins:\n  enabled:\n${enable.map((p) => `    - ${p}`).join("\n")}\n  hook_callback_timeout: ${timeout}\n`);
  const pluginDir = path.join(home, "plugins", "skill-me-observer");
  const pluginBefore = existsSync(pluginDir) ? snapshotTree(pluginDir) : null;
  const homeBefore = snapshotTree(home);
  const run = await runHarness(runtime, { sandbox, env, scenario: { ids: IDS, toolArgs: ARGS, ...scenario } });
  assert.ok(run.result, `${name}: harness sem resultado (status ${run.status})\n${run.stderr.slice(-2000)}`);
  const homeAfter = snapshotTree(home);
  runs[name] = {
    ...run,
    sandbox,
    home,
    pluginDir,
    pluginBefore,
    pluginAfter: pluginBefore ? snapshotTree(pluginDir) : null,
    homeChanges: homeChanges(homeBefore, homeAfter),
  };
}

async function waitFor(file, ms = 10_000) {
  const deadline = Date.now() + ms;
  while (!existsSync(file)) {
    if (Date.now() > deadline) return false;
    await sleep(50);
  }
  return true;
}

const OTHER_HOOKS = [
  { hook: "on_skill_lifecycle", kwargs: kw("on_skill_lifecycle") },
  { hook: "on_session_start", kwargs: kw("on_session_start") },
  { hook: "on_session_end", kwargs: kw("on_session_end") },
  { hook: "subagent_start", kwargs: kw("subagent_start") },
  { hook: "subagent_stop", kwargs: kw("subagent_stop") },
];
const ALL_SEVEN = [{ hook: "pre_tool_call", kwargs: kw("pre_tool_call") }, { hook: "post_tool_call", kwargs: kw("post_tool_call") }, ...OTHER_HOOKS];

before(async () => {
  if (SKIP) return;
  bytecodeBefore = bytecodeState(runtime.agentDir);
  const capture = (sandbox) => [NODE, DELIVERY_FIXTURE, "capture", path.join(sandbox, "captured.ndjson")];
  // Argumento vazio tornaria o argv inválido (plugin inativo): "-" ocupa a posição do arquivo.
  const spawnLog = (mode) => (sandbox) => [NODE, DELIVERY_FIXTURE, mode, "-", path.join(sandbox, "spawns.log")];
  const captureScenario = {
    toolCalls: 2,
    invokes: [
      ...ALL_SEVEN,
      { hook: "on_skill_lifecycle", kwargs: kw("additive_and_missing_kwargs") },
      { hook: "pre_tool_call", kwargs: kw("non_scalar_listed_kwarg") },
      { hook: "on_skill_lifecycle", kwargs: { action: "loaded", skill_name: "s".repeat(300), session_id: "long-name" } },
      { hook: "on_skill_lifecycle", kwargs: { action: "loaded", skill_name: "o".repeat(10_000), session_id: "oversize" } },
    ],
  };
  const jobs = [
    () => prepareAndRun("inactive", { scenario: { toolCalls: 2, invokes: ALL_SEVEN, directPreToolCalls: 5 } }),
    () => prepareAndRun("capture", { delivery: capture, scenario: captureScenario }),
    // Controle do C23: mesmo cenário e destino da captura, observer instalado mas
    // não habilitado — o que aparecer no HERMES_HOME aqui é do host.
    () => prepareAndRun("hostOnly", { delivery: capture, enable: ["skillme-fixture-tool"], installObserver: true, scenario: captureScenario }),
    () => prepareAndRun("ingest", { delivery: () => [NODE, INTEGRATIONS_CLI, "ingest", "--agent", "hermes"], scenario: { toolCalls: 3, invokes: OTHER_HOOKS } }),
    () => prepareAndRun("stall", { delivery: (s) => [NODE, DELIVERY_FIXTURE, "stall"], timeout: 1, scenario: { toolCalls: 300, directPreToolCalls: 50, settleMaxMs: 2000 } }),
    () => prepareAndRun("naive", { delivery: (s) => [NODE, DELIVERY_FIXTURE, "stall"], timeout: 1, enable: ["naive-blocking-observer", "skillme-fixture-tool"], scenario: { toolCalls: 1 } }),
    () => prepareAndRun("spawnfail", { delivery: (s) => [path.join(s, "não existe", "destino.exe")], scenario: { toolCalls: 10 } }),
    () => prepareAndRun("exit", { delivery: spawnLog("exit"), scenario: { toolCalls: 20, pauseBetweenCallsMs: 30 } }),
    () => prepareAndRun("disconnect", { delivery: spawnLog("disconnect"), scenario: { toolCalls: 20, pauseBetweenCallsMs: 30 } }),
  ];
  // Quatro processos Python por vez: cada um importa o Hermes inteiro.
  const queue = [...jobs];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length > 0) await queue.shift()();
  }));
  runs.capture.done = await waitFor(path.join(runs.capture.sandbox, "captured.ndjson.done"));
});

after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

function echoed(result) {
  return result.toolResults.map((text) => JSON.parse(text));
}

test("I4-C18 plugin carrega por register(ctx) com exatamente os 7 hooks e sem monkey patch", { skip: SKIP }, () => {
  for (const name of ["inactive", "capture"]) {
    const { result } = runs[name];
    assert.deepEqual(result.loaded["skill-me-observer"], { enabled: true, error: null, hooks: SEVEN, tools: [], middleware: [], commands: [] }, name);
    assert.equal(result.identitiesUnchanged, true, `${name}: funções do host mantêm a identidade`);
    assert.equal(result.dontWriteBytecode, 1);
    assert.equal(result.isolated, 1);
  }
  assert.deepEqual(bytecodeState(runtime.agentDir), bytecodeBefore, "nenhum bytecode escrito na instalação");
});

test("I4-C19 hooks nativos chegam ao ingest real com IDs preservados; on_session_end vira turn_end", { skip: SKIP }, () => {
  const capture = runs.capture;
  assert.ok(capture.done, "destino de captura recebeu EOF");
  const bytes = readFileSync(path.join(capture.sandbox, "captured.ndjson"));
  const records = bytes.toString("utf8").trim().split("\n").map((line) => JSON.parse(line));
  const tool = records.find((r) => r.hook === "pre_tool_call" && r.kwargs.tool_call_id === "call-0");
  assert.deepEqual(tool, { hook: "pre_tool_call", kwargs: { tool_name: "skillme_fixture_echo", session_id: IDS.session_id, task_id: IDS.task_id, tool_call_id: "call-0", turn_id: IDS.turn_id }, nonScalar: [] });
  const post = records.find((r) => r.hook === "post_tool_call" && r.kwargs.tool_call_id === "call-0");
  assert.equal(post.kwargs.status, "ok");
  assert.equal(typeof post.kwargs.duration_ms, "number");

  const ingest = spawnSync(NODE, [INTEGRATIONS_CLI, "ingest", "--agent", "hermes"], {
    input: bytes,
    env: baseEnv({ SKILL_ME_OBSERVER_REPORT_FD: "3" }),
    stdio: ["pipe", "pipe", "pipe", "pipe"],
  });
  assert.equal(ingest.status, 0);
  assert.equal(ingest.stdout.length, 0);
  const report = parseReport(ingest.output[3].toString("utf8"));
  const find = (predicate, label) => {
    const found = report.events.find(predicate);
    assert.ok(found, label);
    return found;
  };
  // #5: IDs são pseudônimos da chave deste processo de ingest; as relações
  // entre eventos (mesmo valor nativo → mesmo pseudônimo) continuam provadas.
  const lifecycle = find((e) => e.eventKind === "skill_lifecycle" && e.fields.useCount === 3, "skill_lifecycle");
  assert.deepEqual(lifecycle.fields, { action: "loaded", skillName: "third-party-skill", provenance: "local", useCount: 3, reused: true, reuseAfterPatch: false });
  // Chamadas reais do handle_function_call usam a sessão IDS, diferente da
  // sessão hermes-sess-01 dos kwargs de fixture invocados diretamente.
  const nativeCalls = report.events.filter((e) => e.eventKind === "tool_pre" && "taskId" in e.ids && e.ids.sessionId !== lifecycle.ids.sessionId);
  assert.equal(nativeCalls.length, 2, "duas chamadas reais de ferramenta");
  assert.equal(new Set(nativeCalls.map((e) => e.ids.sessionId)).size, 1, "mesma sessão nativa, mesmo pseudônimo");
  assert.notEqual(nativeCalls[0].ids.toolCallId, nativeCalls[1].ids.toolCallId);
  const pre = nativeCalls[0];
  assertPseudonymIds(pre.ids, { sessionId: IDS.session_id, toolCallId: "call-0", taskId: IDS.task_id, turnId: IDS.turn_id }, "tool_pre");
  assert.equal(pre.signal, "native_plugin");
  const postEnvelope = find((e) => e.eventKind === "tool_post" && e.ids.toolCallId === pre.ids.toolCallId, "tool_post da mesma chamada");
  assert.equal(postEnvelope.fields.outcome, "success");
  assert.equal(postEnvelope.ids.sessionId, pre.ids.sessionId);
  const turnEnd = find((e) => e.nativeEvent === "on_session_end", "on_session_end");
  assert.equal(turnEnd.eventKind, "turn_end");
  assertPseudonymIds(turnEnd.ids, { sessionId: "hermes-sess-01", turnId: "hermes-turn-01", taskId: "hermes-task-01" }, "turn_end");
  assert.equal(turnEnd.ids.sessionId, lifecycle.ids.sessionId, "mesma sessão hermes-sess-01");
  assert.equal(turnEnd.ids.taskId, lifecycle.ids.taskId, "mesma tarefa hermes-task-01");
  assert.ok(!report.events.some((e) => e.eventKind === "session_end"), "fim de run nunca vira fim de sessão");
  const subStart = find((e) => e.eventKind === "subagent_start", "subagent_start");
  assertPseudonymIds(subStart.ids, { parentSessionId: "hermes-sess-01", parentTurnId: "hermes-turn-01", childSessionId: "hermes-sess-child-01", subagentId: "hermes-subagent-01" }, "subagent_start");
  assert.equal(subStart.ids.parentSessionId, lifecycle.ids.sessionId, "pai = sessão observada");
  assert.equal(subStart.ids.parentTurnId, turnEnd.ids.turnId);
  assert.ok(subStart.gaps.includes("parentSubagentId:absent"));
  for (const native of [IDS.session_id, IDS.task_id, IDS.turn_id, "call-0", "hermes-sess-01", "hermes-turn-01", "hermes-subagent-01"]) {
    assert.ok(!JSON.stringify(report).includes(native), native);
  }
  const subStop = find((e) => e.eventKind === "subagent_stop", "subagent_stop");
  assert.deepEqual(subStop.fields, { childRole: "leaf", childStatus: "completed", durationMs: 1234 });
  find((e) => e.eventKind === "session_start" && e.fields.platform === "cli", "session_start");
  // kwargs extra (campo de versão mais nova) não passa; ausentes viram lacuna.
  const additive = find((e) => e.eventKind === "skill_lifecycle" && e.gaps.includes("provenance:absent"), "aditivo/ausente");
  assert.ok(additive.gaps.includes("sessionId:absent"));
  assert.ok(!JSON.stringify(report).includes("SKILLME-CANARY"));

  // Com o ingest real como destino, tudo o que foi enfileirado foi entregue.
  const real = runs.ingest.result.stats;
  assert.equal(real.deliveryFailed, 0);
  assert.equal(real.delivered, real.enqueued);
  // 3 ferramentas × (pre + post) + 5 hooks + o pre_tool_call da checagem de bloqueio do harness.
  assert.equal(real.enqueued, 3 * 2 + OTHER_HOOKS.length + 1);
});

test("I4-C20 callbacks devolvem None e a ferramenta executa com argumentos idênticos", { skip: SKIP }, () => {
  for (const name of ["inactive", "capture", "ingest"]) {
    const { result } = runs[name];
    for (const invoke of result.invokeResults) assert.deepEqual(invoke.results, [], `${name}/${invoke.hook}`);
    assert.deepEqual(echoed(result), result.toolResults.map(() => ({ echo: ARGS })), name);
    assert.deepEqual(result.toolCalls, result.toolResults.map(() => ARGS), `${name}: argumentos intactos`);
    assert.equal(result.blockMessage, null, name);
  }
  assert.deepEqual(runs.inactive.result.invokeResults.map((i) => i.hook).sort(), SEVEN);
});

test("I4-C21 destino travado não espera nem bloqueia; controle RED bloqueia", { skip: SKIP }, () => {
  const { result } = runs.stall;
  assert.equal(result.toolResults.length, 300);
  assert.deepEqual(echoed(result), result.toolResults.map(() => ({ echo: ARGS })), "nenhuma ferramenta bloqueada");
  assert.ok(Math.max(...result.directPreMs) < 1000, `maior pre_tool_call: ${Math.max(...result.directPreMs)} ms`);
  assert.ok(result.stats.droppedQueueFull > 0, "fila cheia declarada como perda");
  assert.equal(result.stats.deliveryFailed, 0);
  // Controle: escrever de forma síncrona no mesmo destino faz o host bloquear.
  const naive = JSON.parse(runs.naive.result.toolResults[0]);
  assert.match(naive.error, /timed out or is still running/);
});

test("I4-C22 falha do destino é absorvida, contada e sem nova tentativa", { skip: SKIP }, () => {
  for (const name of ["spawnfail", "exit", "disconnect"]) {
    const { result, sandbox } = runs[name];
    assert.deepEqual(echoed(result), result.toolResults.map(() => ({ echo: ARGS })), name);
    assert.ok(result.stats.deliveryFailed >= 1, `${name}: ${JSON.stringify(result.stats)}`);
    assert.equal(result.stats.active, false, `${name}: entrega desligada no processo`);
    for (const invoke of result.invokeResults) assert.deepEqual(invoke.results, []);
    if (name !== "spawnfail") {
      assert.equal(readFileSync(path.join(sandbox, "spawns.log"), "utf8"), `${name}\n`, `${name}: um único spawn`);
    }
  }
});

test("I4-C23 Python só projeta nomes listados, sem sanitizar, atribuir ou persistir", { skip: SKIP }, () => {
  const capture = runs.capture;
  const text = readFileSync(path.join(capture.sandbox, "captured.ndjson"), "utf8");
  assert.ok(!text.includes("SKILLME-CANARY"), "args/result/error_message/child_goal nunca saem do processo");
  const records = text.trim().split("\n").map((line) => JSON.parse(line));
  const listed = JSON.parse(readFileSync(path.join(capture.pluginDir, "kwargs.json"), "utf8")).hooks;
  for (const record of records) {
    assert.deepEqual(Object.keys(record).sort(), ["hook", "kwargs", "nonScalar"]);
    for (const key of [...Object.keys(record.kwargs), ...record.nonScalar]) assert.ok(listed[record.hook].includes(key), `${record.hook}.${key}`);
  }
  // Valor escalar segue inalterado (300 caracteres), recusado depois pela fronteira JS.
  const long = records.find((r) => r.kwargs.session_id === "long-name");
  assert.equal(long.kwargs.skill_name, "s".repeat(300));
  const ingest = spawnSync(NODE, [INTEGRATIONS_CLI, "ingest", "--agent", "hermes"], { input: JSON.stringify(long) + "\n", env: baseEnv({ SKILL_ME_OBSERVER_REPORT_FD: "3" }), stdio: ["pipe", "pipe", "pipe", "pipe"] });
  const envelope = parseReport(ingest.output[3].toString("utf8")).events[0];
  assert.ok(envelope.gaps.includes("skillName:too_long"));
  // Não escalar só é nomeado.
  const nonScalar = records.find((r) => r.kwargs.tool_call_id === "hermes-call-03");
  assert.deepEqual(nonScalar, { hook: "pre_tool_call", kwargs: { tool_call_id: "hermes-call-03" }, nonScalar: ["tool_name", "session_id"] });
  // Registro acima de 8192 bytes é contado e não enviado.
  assert.equal(capture.result.stats.oversize, 1);
  assert.ok(!records.some((r) => r.kwargs.session_id === "oversize"));
  // O plugin não grava nada: sua pasta fica idêntica.
  assert.deepEqual(capture.pluginAfter, capture.pluginBefore);

  // Nem no resto do HERMES_HOME. O host grava ali os próprios arquivos (SOUL.md,
  // state.db, caches, backup do config.yaml); o controle — mesmo cenário, plugin
  // instalado sem habilitar, nenhum código dele executado — mostra exatamente
  // quais. Com o plugin ativo, as mudanças precisam ser as mesmas, com o mesmo
  // conteúdo. Só o backup difere entre as duas: é cópia do config.yaml de cada
  // execução, que difere na lista de habilitados.
  const hostOnly = runs.hostOnly;
  assert.equal(hostOnly.result.loaded["skill-me-observer"].enabled, false, "controle não carrega o plugin");
  assert.deepEqual(hostOnly.result.loaded["skill-me-observer"].hooks, []);
  assert.equal(hostOnly.result.stats, null, "controle: módulo do plugin nunca importado");
  assert.ok(capture.result.stats.delivered > 0, "captura: plugin ativo e entregando");
  const BACKUP = "backups/config/config.yaml.good.<data>";
  const comparable = (run) => {
    const { [BACKUP]: backup, ...rest } = run.homeChanges;
    if (backup) {
      const [file] = Object.keys(snapshotTree(run.home)).filter((rel) => rel.replace(/\.good\.\d{8}-\d{6}$/, ".good.<data>") === BACKUP);
      assert.deepEqual(readFileSync(path.join(run.home, file)), readFileSync(path.join(run.home, "config.yaml")), "backup do host é cópia do config.yaml");
    }
    return rest;
  };
  const hostChanges = comparable(hostOnly);
  assert.ok(Object.keys(hostChanges).length > 0, "o controle observa as escritas do host");
  assert.deepEqual(comparable(capture), hostChanges, "nenhum arquivo do HERMES_HOME criado ou alterado pelo plugin");
});

test("I4-C37 Hermes: seis casos de falha mantêm callbacks neutros e ferramenta inalterada", { skip: SKIP }, () => {
  const table = {
    "consumidor ausente": "inactive",
    recusa: "exit",
    "desconexão": "disconnect",
    "destino travado": "stall",
    "kwargs inválidos": "capture",
    "limite excedido": "stall",
  };
  for (const [label, name] of Object.entries(table)) {
    const { result } = runs[name];
    for (const invoke of result.invokeResults) assert.deepEqual(invoke.results, [], `${label}: ${invoke.hook}`);
    assert.deepEqual(echoed(result), result.toolResults.map(() => ({ echo: ARGS })), label);
    assert.equal(result.blockMessage, null, label);
  }
  assert.ok(runs.stall.result.stats.droppedQueueFull > 0);
  assert.equal(runs.capture.result.stats.oversize, 1);
});

test("I4-C44b Hermes sem entrega configurada fica inativo", { skip: SKIP }, () => {
  assert.deepEqual(runs.inactive.result.stats, {
    enqueued: 0,
    delivered: 0,
    droppedQueueFull: 0,
    deliveryFailed: 0,
    oversize: 0,
    serializationFailed: 0,
    active: false,
  });
});
