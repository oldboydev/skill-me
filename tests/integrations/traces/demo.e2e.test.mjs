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
import { boundEnv, privacyOk, privacyRetrying, runHermesIngest, waitUntil } from "../helpers/traces.mjs";
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

test("T8-C19 trace walkthrough: start, integração com fixtures, list, export, follow, stop e replay, com a origem de cada passo", async (t) => {
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

  // 2. Integrações locais vinculadas pelo par de ambiente, com entradas de fixture.
  assert.equal(runIntegrationsJson(["install", "--agent", "claude", "--target", target, "--apply"], { env: baseEnv() }).status, 0);
  const handler = readClaudeHandlers(target).PreToolUse.handler;
  const hook = await runClaudeHandler(handler, fixtureCase("claude-hooks.json", "pre_tool_bash").payload, { env: boundEnv(root, id), cwd: base });
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
});
