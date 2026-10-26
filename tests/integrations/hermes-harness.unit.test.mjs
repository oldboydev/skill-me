import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { makeScratch } from "./helpers/cli.mjs";
import { FIXTURES_DIR } from "./helpers/fixtures.mjs";
import { locateSystemPython } from "./helpers/hermes-runtime.mjs";

// Provas C39 e C40 da issue #25 (S6, autorização 6419121665): a espera da
// harness nativa do Hermes termina pela entrega, não por 300 ms de contadores
// parados. Rodam sem o Hermes instalado — na CI também —, com o Python do
// sistema: a decisão de `fixtures/hermes/settle.py` com um relógio controlado,
// e a própria `harness.py` com o Hermes simulado no nível dos módulos que ela
// importa. O esperado vem do contrato (linha "Espera da harness nativa do
// Hermes" do Landing em .checks/issue-25-agent-launch.md e critérios 31–32 da
// task), não do algoritmo.

const PYTHON = locateSystemPython();
const SKIP = PYTHON.skipReason ? `python-ausente: ${PYTHON.skipReason}` : false;
const SETTLE = path.join(FIXTURES_DIR, "hermes", "settle.py");
const HARNESS = path.join(FIXTURES_DIR, "hermes", "harness.py");
const POLL_MS = 50;

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

// Contadores no formato de `observer_stats()` do plugin.
const stats = ({ enqueued, delivered = 0, oversize = 0, serializationFailed = 0, deliveryFailed = 0, droppedQueueFull = 0, active = true }) => ({
  enqueued,
  delivered,
  droppedQueueFull,
  deliveryFailed,
  oversize,
  serializationFailed,
  active,
});

const python = (args, input) => {
  const run = spawnSync(PYTHON.command, [...PYTHON.prefix, "-I", "-B", ...args], { input, encoding: "utf8", timeout: 60_000, windowsHide: true });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout);
};

// Relógio controlado: `sleep` avança o tempo; a leitura devolve os contadores
// da última entrada da linha do tempo já alcançada.
const CONTROLLED = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("settle_prova", sys.argv[1])
settle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(settle)
case = json.loads(sys.stdin.read())
now = [0.0]
reads = [0]
def clock():
    return now[0]
def sleep(seconds):
    now[0] += seconds
def read():
    reads[0] += 1
    current = None
    for at_ms, entry in case["timeline"]:
        if at_ms <= now[0] * 1000 + 1e-6:
            current = entry
    return dict(current)
max_ms = settle.settle_max_ms(case["scenario"])
outcome = settle.wait_for_delivery(read, max_ms, clock=clock, sleep=sleep)
print(json.dumps({"maxMs": max_ms, "state": outcome["state"], "waitedMs": outcome["waitedMs"], "stats": outcome["stats"], "returnedAtMs": now[0] * 1000, "reads": reads[0]}))
`;

function controlled(timeline, scenario = {}) {
  const out = python(["-c", CONTROLLED, SETTLE], JSON.stringify({ timeline, scenario }));
  return { ...out, returnedAtMs: Math.round(out.returnedAtMs), waitedMs: Math.round(out.waitedMs) };
}

// A espera termina dentro do intervalo de leitura depois do instante esperado.
const endsAt = (out, ms) => out.returnedAtMs >= ms && out.returnedAtMs < ms + POLL_MS + 1;

test("I25-C39 entrega concluída: com todo registro da fila entregue a espera termina na hora, como concluída", { skip: SKIP }, () => {
  const done = controlled([[0, stats({ enqueued: 3, delivered: 3 })]]);
  assert.deepEqual([done.state, done.returnedAtMs, done.stats.delivered], ["concluded", 0, 3]);
  // Registro grande demais ou não serializável também saiu da fila: conta como processado.
  const dropped = controlled([[0, stats({ enqueued: 4, delivered: 2, oversize: 1, serializationFailed: 1 })]]);
  assert.deepEqual([dropped.state, dropped.returnedAtMs], ["concluded", 0]);
});

test("I25-C39 entrega pendente: contadores parados por mais de 300 ms com a abertura do processo atrasada não encerram a espera, que termina quando a entrega conclui", { skip: SKIP }, () => {
  // Abertura do processo de entrega de 470 ms (o Verifier mediu 453–469 ms): nada muda nos contadores até lá.
  const late = controlled([
    [0, stats({ enqueued: 12 })],
    [470, stats({ enqueued: 12, delivered: 12 })],
  ]);
  assert.equal(late.state, "concluded");
  assert.ok(endsAt(late, 470), `terminou em ${late.returnedAtMs} ms`);
  assert.deepEqual([late.stats.enqueued, late.stats.delivered], [12, 12], "os mesmos eventos, todos entregues");
  // Parada longa e entrega em partes: só a última parte conclui.
  const parts = controlled([
    [0, stats({ enqueued: 12 })],
    [1200, stats({ enqueued: 12, delivered: 5 })],
    [1900, stats({ enqueued: 12, delivered: 11, oversize: 1 })],
  ]);
  assert.equal(parts.state, "concluded");
  assert.ok(endsAt(parts, 1900), `terminou em ${parts.returnedAtMs} ms`);
});

// Hermes simulado no nível dos módulos que a harness importa: nenhuma
// ferramenta, nenhum hook disparado; o módulo do observer devolve contadores
// que mudam com o tempo real desde a carga dos plugins.
const STUB_MODEL_TOOLS = `
def handle_function_call(name, args, **kwargs):
    raise AssertionError("cenário sem ferramentas")
`;
const STUB_PLUGINS = `
import json, os, sys, time, types

def invoke_hook(name, **kwargs):
    return []

def _dispatch_pre_tool_call_hooks(*args, **kwargs):
    return None

def get_pre_tool_call_block_message(*args, **kwargs):
    return None

class _Manager:
    _plugins = {}
    def discover_and_load(self):
        timeline = json.loads(os.environ["SKILL_ME_STUB_TIMELINE"])
        started = time.monotonic()
        def observer_stats():
            elapsed = (time.monotonic() - started) * 1000
            current = None
            for at_ms, entry in timeline:
                if at_ms <= elapsed:
                    current = entry
            return dict(current)
        observer = types.ModuleType("hermes_plugins.skill_me_observer")
        observer.observer_stats = observer_stats
        sys.modules["hermes_plugins.skill_me_observer"] = observer

def get_plugin_manager():
    return _Manager()
`;
const RUN_HARNESS = `
import runpy, sys
stubs, harness, scenario = sys.argv[1:4]
sys.path.insert(0, stubs)
sys.argv = [harness, scenario]
runpy.run_path(harness, run_name="__main__")
`;

function realHarness(label, timeline, scenario = {}) {
  const dir = scratch(label);
  const stubs = path.join(dir, "stubs");
  mkdirSync(path.join(stubs, "hermes_cli"), { recursive: true });
  writeFileSync(path.join(stubs, "model_tools.py"), STUB_MODEL_TOOLS);
  writeFileSync(path.join(stubs, "hermes_cli", "__init__.py"), "");
  writeFileSync(path.join(stubs, "hermes_cli", "plugins.py"), STUB_PLUGINS);
  const resultPath = path.join(dir, "resultado.json");
  const scenarioPath = path.join(dir, "cenario.json");
  writeFileSync(scenarioPath, JSON.stringify({ ...scenario, resultPath }));
  const started = performance.now();
  const run = spawnSync(PYTHON.command, [...PYTHON.prefix, "-I", "-B", "-c", RUN_HARNESS, stubs, HARNESS, scenarioPath], {
    encoding: "utf8",
    timeout: 60_000,
    windowsHide: true,
    env: { ...process.env, SKILL_ME_STUB_TIMELINE: JSON.stringify(timeline) },
  });
  const elapsedMs = performance.now() - started;
  assert.equal(run.status, 0, run.stderr);
  return { result: JSON.parse(readFileSync(resultPath, "utf8")), elapsedMs };
}

test("I25-C39 harness real: com a abertura do processo de entrega atrasada além de 300 ms, o resultado só é gravado depois da entrega, com os eventos entregues", { skip: SKIP }, () => {
  const { result } = realHarness("i25 c39 harness", [
    [0, stats({ enqueued: 12 })],
    [700, stats({ enqueued: 12, delivered: 12 })],
  ]);
  assert.deepEqual([result.stats.enqueued, result.stats.delivered, result.stats.deliveryFailed], [12, 12, 0], JSON.stringify(result.stats));
  assert.equal(result.settle?.state, "concluded");
  assert.ok(result.settle.waitedMs >= 700, `esperou ${result.settle.waitedMs} ms`);
});

test("I25-C40 falha terminal: a entrega desligada por falha termina a espera como failed, antes do prazo e distinta de concluída", { skip: SKIP }, () => {
  const failed = controlled([
    [0, stats({ enqueued: 5 })],
    [480, stats({ enqueued: 5, deliveryFailed: 5, active: false })],
  ]);
  assert.equal(failed.state, "failed");
  assert.ok(endsAt(failed, 480), `terminou em ${failed.returnedAtMs} ms`);
  assert.deepEqual([failed.stats.active, failed.stats.deliveryFailed], [false, 5]);
  // Plugin sem destino configurado: nada a entregar, nem falha nem conclusão de entrega.
  const inactive = controlled([[0, stats({ enqueued: 0, active: false })]]);
  assert.deepEqual([inactive.state, inactive.returnedAtMs], ["inactive", 0]);
  // Pela harness real: a falha chega depois de 300 ms parados e aparece no resultado.
  const { result } = realHarness("i25 c40 falha", [
    [0, stats({ enqueued: 5 })],
    [600, stats({ enqueued: 5, deliveryFailed: 5, active: false })],
  ]);
  assert.deepEqual([result.settle?.state, result.stats.deliveryFailed, result.stats.active], ["failed", 5, false]);
  assert.ok(result.settle.waitedMs >= 600, `esperou ${result.settle.waitedMs} ms`);
});

test("I25-C40 destino travado: a espera vai até o limite configurado e termina como timeout, com o padrão de 5000 ms quando o cenário não define settleMaxMs", { skip: SKIP }, () => {
  const stuck = [[0, stats({ enqueued: 256, delivered: 3, droppedQueueFull: 94 })]];
  const configured = controlled(stuck, { settleMaxMs: 2000 });
  assert.deepEqual([configured.maxMs, configured.state], [2000, "timeout"]);
  assert.ok(endsAt(configured, 2000), `terminou em ${configured.returnedAtMs} ms`);
  assert.deepEqual([configured.stats.delivered, configured.stats.droppedQueueFull], [3, 94], "os contadores lidos no prazo");
  const byDefault = controlled(stuck, {});
  assert.deepEqual([byDefault.maxMs, byDefault.state], [5000, "timeout"]);
  assert.ok(endsAt(byDefault, 5000), `terminou em ${byDefault.returnedAtMs} ms`);
  // Pela harness real, com um prazo curto do cenário: espera o prazo inteiro, não 300 ms.
  const { result, elapsedMs } = realHarness("i25 c40 travado", stuck, { settleMaxMs: 1000 });
  assert.equal(result.settle?.state, "timeout");
  assert.ok(result.settle.waitedMs >= 1000, `esperou ${result.settle.waitedMs} ms`);
  assert.ok(elapsedMs >= 1000);
  assert.deepEqual([result.stats.delivered, result.stats.droppedQueueFull], [3, 94]);
});

// C44 (segunda revisão formal em 6d57e6e, P2 de settle.py:26; linha "Leitura
// transitória na espera da harness" do Landing): o plugin marca a entrega
// desligada antes de contar a perda, e `observer_stats` lê `active` fora do
// lock dos contadores. Uma leitura pode trazer `active` falso com registros da
// fila ainda sem destino contado.
const STATES = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("settle_prova", sys.argv[1])
settle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(settle)
print(json.dumps([settle.delivery_state(entry) for entry in json.loads(sys.stdin.read())]))
`;
const statesOf = (snapshots) => python(["-c", STATES, SETTLE], JSON.stringify(snapshots));

// Sequência do destino que falha com 5 registros na fila e 2 entregues.
const FAILING = {
  running: stats({ enqueued: 5, delivered: 2 }),
  disabledUncounted: stats({ enqueued: 5, delivered: 2, active: false }),
  partlyCounted: stats({ enqueued: 5, delivered: 2, deliveryFailed: 1, active: false }),
  counted: stats({ enqueued: 5, delivered: 2, deliveryFailed: 3, active: false }),
};

test("I25-C44 leituras: com a entrega desligada, a falha só é terminal com todo registro da fila contado; sem destino continua inactive", { skip: SKIP }, () => {
  const snapshots = {
    "desligada, perda ainda não contada": FAILING.disabledUncounted,
    "perda contada em parte": FAILING.partlyCounted,
    "perda contada inteira": FAILING.counted,
    "fechada com grande demais e não serializável": stats({ enqueued: 5, delivered: 1, oversize: 1, serializationFailed: 1, deliveryFailed: 2, active: false }),
    "sem destino": stats({ enqueued: 0, active: false }),
    "ativa e pendente": FAILING.running,
    "ativa e concluída": stats({ enqueued: 5, delivered: 5 }),
  };
  const labels = Object.keys(snapshots);
  const states = statesOf(labels.map((label) => snapshots[label]));
  const observed = Object.fromEntries(labels.map((label, i) => [label, states[i]]));
  assert.deepEqual(observed, {
    "desligada, perda ainda não contada": "pending",
    "perda contada em parte": "pending",
    "perda contada inteira": "failed",
    "fechada com grande demais e não serializável": "failed",
    "sem destino": "inactive",
    "ativa e pendente": "pending",
    "ativa e concluída": "concluded",
  });
});

test("I25-C44 espera: desligada sem perda contada, depois perda parcial, termina failed só na contagem final; a leitura que não fecha termina timeout no prazo do cenário ou no padrão", { skip: SKIP }, () => {
  const sequence = controlled([
    [0, FAILING.running],
    [120, FAILING.disabledUncounted],
    [260, FAILING.partlyCounted],
    [400, FAILING.counted],
  ]);
  assert.equal(sequence.state, "failed");
  assert.ok(endsAt(sequence, 400), `terminou em ${sequence.returnedAtMs} ms`);
  assert.deepEqual(sequence.stats, FAILING.counted, "os contadores finais");
  const stuck = [[0, FAILING.disabledUncounted]];
  const configured = controlled(stuck, { settleMaxMs: 1000 });
  assert.deepEqual([configured.maxMs, configured.state], [1000, "timeout"]);
  assert.ok(endsAt(configured, 1000), `terminou em ${configured.returnedAtMs} ms`);
  const byDefault = controlled(stuck, {});
  assert.deepEqual([byDefault.maxMs, byDefault.state], [5000, "timeout"]);
  assert.ok(endsAt(byDefault, 5000), `terminou em ${byDefault.returnedAtMs} ms`);
});

test("I25-C44 harness real: a leitura transitória da falha não encerra a espera; o resultado traz failed com os contadores finais, e sem destino continua inactive", { skip: SKIP }, () => {
  const { result } = realHarness("i25 c44 harness", [
    [0, FAILING.running],
    [300, FAILING.disabledUncounted],
    [450, FAILING.partlyCounted],
    [600, FAILING.counted],
  ]);
  assert.equal(result.settle?.state, "failed");
  assert.deepEqual(result.stats, FAILING.counted, JSON.stringify(result.stats));
  assert.ok(result.settle.waitedMs >= 600, `esperou ${result.settle.waitedMs} ms`);
  const none = realHarness("i25 c44 sem destino", [[0, stats({ enqueued: 0, active: false })]]);
  assert.deepEqual([none.result.settle?.state, none.result.stats.enqueued, none.result.stats.deliveryFailed], ["inactive", 0, 0]);
});
