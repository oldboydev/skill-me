import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { replayCapture } from "../../../src/integrations/traces/replay.mjs";
import { INTEGRATIONS_CLI, baseEnv, makeScratch, runIntegrationsJson } from "../helpers/cli.mjs";
import { fixtureCase } from "../helpers/fixtures.mjs";
import { readClaudeHandlers, runClaudeHandler } from "../helpers/installed-hooks.mjs";
import { hermesRecord } from "../helpers/privacy-canaries.mjs";
import { TRACES_PROBE, boundEnv, privacyOk, privacyRetrying, runHermesIngest, waitUntil } from "../helpers/traces.mjs";
import { FAKE_CODEX, runWrapper, writeScenario } from "../helpers/wrapper.mjs";

// Demonstração versionada da issue #8 (crit. 12): percorre início, evento de
// integração, persistência, list, export, follow, encerramento e leitura
// analítica, pelo CLI e pelos produtores reais, num diretório temporário com
// espaço e Unicode. Cada passo rotula de onde veio a entrada (fixture
// sintética ou comando do usuário) e qual mecanismo foi exercitado; nenhum
// agente real é iniciado e nenhum modelo é executado.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

const INPUTS = ["comando do usuário", "fixture sintética"];
const NOT_RUN = "agente real não iniciado; nenhum modelo executado";

// O `privacy follow` é filho da rotina e só sai sozinho com a captura encerrada
// ou indisponível. Numa falha antes do `stop` ele seguia vivo até o `after`
// apagar a pasta, que o encerrava por acaso e podia colidir com ele (ENOTEMPTY
// no Windows); se a limpeza não o alcançasse, prenderia o processo do arquivo.
// Em toda saída da rotina ele é encerrado pelo próprio objeto, e o `close` real
// é esperado: o sinal enviado não prova o término. A falha segue intacta, e um
// filho que já saiu não recebe sinal (issue #25, linha "Ciclo de vida do follow
// no T8-C19" do Landing).
async function endFollow(follow, closed) {
  if (follow.exitCode === null && follow.signalCode === null) follow.kill();
  await closed;
}

// O T8-C19 inteiro. `hookEnv` só acrescenta ao ambiente do hook Claude no
// controle do ciclo de vida (I25-C46); `seen` recebe o follow e o `close` dele.
async function walkthrough(t, hookEnv = {}, seen = {}) {
  const base = makeScratch("t8 c19 demonstração");
  scratches.push(base);
  const root = path.join(base, "capturas ação");
  const target = path.join(base, ".claude");
  mkdirSync(root);
  mkdirSync(target);
  const walkthrough = [];
  const step = (name, input, mechanism, result, agent = null) => walkthrough.push({ name, input, mechanism, agent, result });

  // 1. Início explícito da captura e do acompanhamento.
  const id = privacyOk(["start", "--root", root]).capture.id;
  step("privacy start", "comando do usuário", "CLI real", `captura ${id.slice(0, 8)}… ativa, conteúdo desligado`);
  const follow = spawn(process.execPath, [INTEGRATIONS_CLI, "privacy", "follow", "--root", root, "--capture", id], { env: baseEnv() });
  let followed = "";
  follow.stdout.on("data", (chunk) => (followed += chunk));
  const followDone = new Promise((resolve) => follow.on("close", resolve));
  Object.assign(seen, { follow, closed: followDone });

  try {
    // 2. Integrações locais vinculadas pelo par de ambiente, com entradas de fixture.
    assert.equal(runIntegrationsJson(["install", "--agent", "claude", "--target", target, "--apply"], { env: baseEnv() }).status, 0);
    const handler = readClaudeHandlers(target).PreToolUse.handler;
    const hook = await runClaudeHandler(handler, fixtureCase("claude-hooks.json", "pre_tool_bash").payload, { env: boundEnv(root, id, hookEnv), cwd: base });
    assert.equal(hook.report.delivery.persisted, 1);
    step("hook Claude", "fixture sintética", "hook de comando instalado em settings.json, processo real", "1 registro", NOT_RUN);
    const hermes = await runHermesIngest([hermesRecord("on_skill_lifecycle")], { env: boundEnv(root, id) });
    assert.equal(hermes.report.delivery.persisted, 1);
    step("ingest Hermes", "fixture sintética", "comando interno ingest (destino do plugin), processo real", "1 registro", NOT_RUN);
    const scenario = writeScenario(base, "demo", [
      { stdout: JSON.stringify(fixtureCase("codex-exec.json", "thread_started").event) },
      { stdout: JSON.stringify(fixtureCase("codex-exec.json", "item_completed_command").event) },
    ]);
    const wrapped = await runWrapper({ args: ["demonstração"], entry: FAKE_CODEX, env: boundEnv(root, id, { FAKE_CODEX_SCENARIO: scenario }), cwd: base });
    assert.equal(wrapped.status, 0);
    assert.equal(wrapped.report.delivery.persisted, 3);
    step("integrations run --agent codex", "fixture sintética", "wrapper real supervisionando o Codex falso de tests/integrations/fixtures", "3 registros (2 do exec + process.exit)", NOT_RUN);

    // 3. Persistência, list e export enquanto ativa. O follow continua
    // sondando: um comando que encontra o lock dele é repetido, como o usuário faria.
    const listed = (await privacyRetrying(["list", "--root", root])).captures;
    assert.deepEqual(listed.map((c) => [c.id, c.state, c.counters.persisted]), [[id, "active", 5]]);
    step("privacy list", "comando do usuário", "CLI real", "1 captura ativa, 5 persistidos");
    const exported = await privacyRetrying(["export", "--root", root, "--capture", id]);
    assert.deepEqual(
      exported.records.map((r) => [r.envelope.source.agent, r.envelope.signal, r.envelope.nativeEvent]),
      [
        ["claude", "native_hook", "PreToolUse"],
        ["hermes", "native_plugin", "on_skill_lifecycle"],
        ["codex", "supervised_exec", "thread.started"],
        ["codex", "supervised_exec", "item.completed"],
        ["codex", "supervised_exec", "process.exit"],
      ],
    );
    step("privacy export", "comando do usuário", "CLI real", "5 registros sanitizados com origem");
    await waitUntil(() => followed.split("\n").filter(Boolean).length >= 5, { label: "follow com os 5 registros" });

    // 4. Encerramento: follow fecha com end; replay entrega ao consumidor.
    await privacyRetrying(["stop", "--root", root, "--capture", id]);
    assert.equal(await followDone, 0);
    const lines = followed.trim().split("\n").map((line) => JSON.parse(line));
    assert.deepEqual(lines.map((l) => [l.type, l.sequence]), [["record", 1], ["record", 2], ["record", 3], ["record", 4], ["record", 5], ["end", 6]]);
    assert.deepEqual(lines.slice(0, 5).map((l) => l.record), exported.records);
    step("privacy follow", "comando do usuário", "CLI real", "5 linhas record e end após o stop");
    step("privacy stop", "comando do usuário", "CLI real", "captura encerrada");
    const summary = await replayCapture({ root, id, consumer: (trace) => trace.records.map(({ sequence, record }) => `${sequence}:${record.envelope.source.agent}/${record.envelope.eventKind}`) });
    assert.deepEqual(summary, ["1:claude/tool_pre", "2:hermes/skill_lifecycle", "3:codex/session_start", "4:codex/item", "5:codex/process_exit"]);
    step("replayCapture", "comando do usuário", "API local, consumidor falso", summary.join(" "));

    // Rótulos: toda entrada é do usuário ou de fixture; toda integração declara
    // que nem agente nem modelo rodaram, e nada anuncia execução real.
    for (const entry of walkthrough) {
      assert.ok(INPUTS.includes(entry.input), entry.name);
      if (entry.input === "fixture sintética") assert.equal(entry.agent, NOT_RUN, entry.name);
      assert.ok(!/modelo (real|executado)\b|agente real iniciado/i.test(`${entry.mechanism} ${entry.result}`), entry.name);
    }
    assert.deepEqual(walkthrough.map((e) => e.name), ["privacy start", "hook Claude", "ingest Hermes", "integrations run --agent codex", "privacy list", "privacy export", "privacy follow", "privacy stop", "replayCapture"]);
    for (const entry of walkthrough) t.diagnostic(`${entry.name} | entrada: ${entry.input} | mecanismo: ${entry.mechanism}${entry.agent ? ` | ${entry.agent}` : ""} | ${entry.result}`);
  } finally {
    await endFollow(follow, followDone);
  }
}

test("T8-C19 trace walkthrough: start, integração com fixtures, list, export, follow, stop e replay, com a origem de cada passo", async (t) => {
  await walkthrough(t);
});

// I25-C46 (issue #25, linha "Ciclo de vida do follow no T8-C19" do Landing): na
// manual 40814471097 o Windows foi cancelado no teto de 20 min sem o resultado do
// T8-C19, e numa falha dele antes do `stop` o follow só terminava quando a
// limpeza do arquivo apagava a pasta. Com a entrega do hook Claude perdida pela
// pré-carga de provas, a asserção do passo do hook falha com a captura ativa; o
// mesmo erro sai da rotina, e o follow já fechou, encerrado por ela antes da
// limpeza. A falha injetada é conhecida; numa falha real o encerramento é o mesmo.
test("I25-C46 ciclo de vida do follow no T8-C19: falha antes do stop sai com o mesmo erro, e o follow já fechou, encerrado pela rotina antes da limpeza", async (t) => {
  const seen = {};
  const failure = await walkthrough(t, { NODE_OPTIONS: `--import=${TRACES_PROBE}`, SKILL_ME_TEST_TRACES_SEGMENT_EIO: "1" }, seen).then(
    () => null,
    (error) => error,
  );
  assert.ok(failure instanceof assert.AssertionError, `a asserção do passo do hook continua vermelha: ${failure}`);
  assert.deepEqual([failure.actual, failure.expected, failure.operator], [0, 1, "strictEqual"]);
  const settled = await Promise.race([seen.closed.then(() => "close"), new Promise((resolve) => setImmediate(resolve, "pendente"))]);
  assert.equal(settled, "close", "o close do follow ocorreu antes de a falha sair da rotina");
  assert.deepEqual([seen.follow.exitCode, seen.follow.signalCode], [null, "SIGTERM"], "encerrado pela rotina, com a captura ativa");
});
