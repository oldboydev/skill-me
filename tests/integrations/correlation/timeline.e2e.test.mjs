import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { correlateTrace } from "../../../src/integrations/correlation/timeline.mjs";
import { replayCapture } from "../../../src/integrations/traces/replay.mjs";
import { makeScratch } from "../helpers/cli.mjs";
import { fixtureCase } from "../helpers/fixtures.mjs";
import { claudePayload, codexHookPayload, hermesRecord } from "../helpers/privacy-canaries.mjs";
import { runPrivacy } from "../helpers/privacy-store.mjs";
import { boundEnv, exportOf, privacyOk, runHermesIngest, runHook, startCapture } from "../helpers/traces.mjs";
import { FAKE_CODEX, runWrapper, writeScenario } from "../helpers/wrapper.mjs";

// Prova C14 da issue #6: o fluxo de fixtures pelos caminhos locais da #8 entrega
// a mesma timeline pela API pura e pelo CLI. Cada passo rotula a origem da
// entrada; nenhum agente real é iniciado e nenhum modelo é executado.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

const NOT_RUN = "agente real não iniciado; nenhum modelo executado";
const byType = (result, type) => result.operations.filter((op) => op.type === type);

test("T6-C14 fixture flow: fixtures de Claude, Codex e Hermes pela captura local dão a mesma timeline na API e no CLI", async (t) => {
  const base = makeScratch("t6 c14 demonstração");
  scratches.push(base);
  const root = path.join(base, "capturas ação");
  mkdirSync(root);
  const walkthrough = [];
  const step = (name, mechanism, result) => walkthrough.push({ name, input: name === "privacy timeline" || name === "privacy start" || name === "privacy stop" ? "comando do usuário" : "fixture sintética", mechanism, agent: NOT_RUN, result });

  const id = startCapture(root);
  step("privacy start", "CLI real", `captura ${id.slice(0, 8)}…`);
  const env = boundEnv(root, id);
  const hook = async (agent, payload) => assert.equal((await runHook(agent, payload, { env })).status, 0);

  await hook("claude", claudePayload("pre_tool_skill"));
  await hook("claude", claudePayload("post_tool_skill"));
  await hook("claude", claudePayload("expansion_slash_command"));
  await hook("claude", claudePayload("subagent_start"));
  await hook("claude", claudePayload("subagent_pre_tool"));
  await hook("claude", claudePayload("subagent_stop"));
  step("hooks Claude", "hook de comando, processo real, 6 eventos", "skill pre/post, expansão direta e subagente");
  await hook("codex", codexHookPayload("pre_tool_read_skill_md"));
  await hook("codex", codexHookPayload("post_tool_read_skill_md"));
  step("hooks Codex", "hook de comando, processo real, 2 eventos", "leitura de SKILL.md como ferramenta");
  const hermes = ["pre_tool_call", "post_tool_call", "on_skill_lifecycle", "subagent_start", "subagent_stop"].map((name) => hermesRecord(name));
  assert.equal((await runHermesIngest(hermes, { env })).status, 0);
  step("ingest Hermes", "comando interno ingest, processo real, 5 linhas", "ferramenta, ciclo de vida de skill e subagente");
  const scenario = writeScenario(base, "c14", [
    { stdout: JSON.stringify(fixtureCase("codex-exec.json", "thread_started").event) },
    { stdout: JSON.stringify(fixtureCase("codex-exec.json", "item_started_command").event) },
    { stdout: JSON.stringify(fixtureCase("codex-exec.json", "item_completed_command").event) },
  ]);
  const wrapped = await runWrapper({ args: ["c14"], env: boundEnv(root, id, { FAKE_CODEX_SCENARIO: scenario }), cwd: base });
  assert.equal(wrapped.status, 0);
  step("integrations run --agent codex", "wrapper real com o Codex falso das fixtures", "3 linhas do exec + process.exit");
  privacyOk(["stop", "--root", root, "--capture", id]);
  step("privacy stop", "CLI real", "captura encerrada");

  const exported = exportOf(root, id);
  const api = JSON.parse(JSON.stringify(await replayCapture({ root, id, consumer: correlateTrace })));
  const cli = runPrivacy(["timeline", "--root", root, "--capture", id]);
  assert.equal(cli.status, 0, cli.stdout);
  const { schemaVersion, command, status, ...cliResult } = cli.body;
  assert.deepEqual([schemaVersion, command, status], [1, "timeline", "ok"]);
  assert.deepEqual(cliResult, api, "API pura e CLI: mesma timeline");
  step("privacy timeline", "CLI real comparado com replayCapture + correlateTrace", `${api.entries.length} entradas, ${api.operations.length} operações`);

  // Mesmos registros sanitizados e mesma ordem do export.
  assert.equal(api.entries.length, 17);
  assert.deepEqual(api.entries.map((e) => e.sequence), exported.records.map((_, i) => i + 1));
  assert.deepEqual(
    api.entries.map(({ source, eventKind, nativeEvent, ids, fields, gaps, observedAt }) => ({ source, eventKind, nativeEvent, ids, fields, gaps, observedAt })),
    exported.records.map(({ envelope: e }) => ({ source: e.source, eventKind: e.eventKind, nativeEvent: e.nativeEvent, ids: e.ids, fields: e.fields, gaps: e.gaps, observedAt: e.observedAt })),
  );
  assert.deepEqual(api.capture, exported.capture);
  assert.deepEqual(api.coverage.capture, { counters: exported.capture.counters, limits: exported.capture.limits });

  // Vínculos que as fixtures permitem afirmar.
  const skills = byType(api, "skill_invocation");
  assert.deepEqual(skills.map((op) => [op.origin.agent, op.strength, op.state, op.skillName, op.start, op.result]), [["claude", "native", "closed", "third-party-skill", 1, 2]]);
  const evidence = byType(api, "skill_evidence");
  assert.deepEqual(evidence.map((op) => [op.origin.agent, op.basis, op.strength, op.skillName]), [
    ["claude", "expansion", "heuristic", "third-party-skill"],
    ["hermes", "lifecycle", "heuristic", "third-party-skill"],
  ]);
  assert.ok(![...skills, ...evidence].some((op) => op.origin.agent === "codex"), "ler SKILL.md no Codex não cria skill");
  const tools = byType(api, "tool");
  const where = (agent, mechanism) => tools.filter((op) => op.origin.agent === agent && op.origin.mechanism === mechanism);
  assert.deepEqual(where("codex", "command_hook").map((op) => [op.strength, op.state, op.toolName]), [["native", "closed", "Bash"]]);
  assert.deepEqual(where("hermes", "python_plugin").map((op) => [op.strength, op.state, op.toolName]), [["native", "closed", "skillme_fixture_echo"]]);
  assert.deepEqual(where("codex", "exec_jsonl").map((op) => [op.strength, op.state, op.itemType, op.exitCode]), [["heuristic", "closed", "command_execution", 0]]);
  const subagents = byType(api, "subagent");
  assert.deepEqual(subagents.map((op) => [op.origin.agent, op.strength, op.state]), [["claude", "native", "closed"], ["hermes", "native", "closed"]]);
  const claudeTool = tools.find((op) => op.origin.agent === "claude");
  assert.deepEqual(subagents[0].operations, [claudeTool.id], "a ferramenta com agentId do subagente");
  assert.equal(api.coverage.partial, true);
  assert.ok(!JSON.stringify(api).includes("skill_completed"));

  // Rótulos: toda entrada é do usuário ou fixture, e nada anuncia modelo real.
  for (const entry of walkthrough) {
    assert.ok(["comando do usuário", "fixture sintética"].includes(entry.input), entry.name);
    assert.equal(entry.agent, NOT_RUN);
    assert.ok(!/modelo (real|executado)\b|agente real iniciado/i.test(`${entry.mechanism} ${entry.result}`), entry.name);
  }
  for (const entry of walkthrough) t.diagnostic(`${entry.name} | entrada: ${entry.input} | mecanismo: ${entry.mechanism} | ${entry.agent} | ${entry.result}`);
});
