import assert from "node:assert/strict";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { baseEnv, makeScratch, runIntegrationsJson } from "./helpers/cli.mjs";
import { fixtureCase } from "./helpers/fixtures.mjs";
import { FIXTURE_PLUGINS, harnessEnv, locateHermesRuntime, runHarness } from "./helpers/hermes-runtime.mjs";
import { readClaudeHandlers, readCodexHandlers, runClaudeHandler, runCodexHandler } from "./helpers/installed-hooks.mjs";
import { snapshotTree, writeThirdPartySkill } from "./helpers/tree.mjs";
import { FAKE_CODEX, runWrapper, writeScenario } from "./helpers/wrapper.mjs";

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

// Mapa caminho → {sha256, bytes, mtime} de TODOS os arquivos da skill de
// terceiro: igual nas quatro fotos (antes, instalado, observado, removido).
function expectUntouched(skillRoot, baseline, label) {
  assert.deepEqual(snapshotTree(skillRoot), baseline, label);
}

test("I4-C35 hash da árvore da skill de terceiro não muda em instalação, observação e remoção", async (t) => {
  const env = baseEnv();

  // Claude: skill em <target>/skills; observação pelos dois caminhos de skill.
  const claudeRoot = makeScratch("hash-claude");
  scratches.push(claudeRoot);
  const claudeTarget = path.join(claudeRoot, ".claude");
  mkdirSync(claudeTarget);
  const claudeSkill = writeThirdPartySkill(path.join(claudeTarget, "skills"));
  const claudeBaseline = snapshotTree(claudeSkill);
  assert.equal(runIntegrationsJson(["install", "--agent", "claude", "--target", claudeTarget, "--apply"], { env }).status, 0);
  expectUntouched(claudeSkill, claudeBaseline, "claude depois de instalar");
  const claudeHandlers = readClaudeHandlers(claudeTarget);
  for (const [event, caseName] of [["PreToolUse", "pre_tool_skill"], ["PostToolUse", "post_tool_skill"], ["UserPromptExpansion", "expansion_slash_command"]]) {
    const payload = { ...fixtureCase("claude-hooks.json", caseName).payload, cwd: claudeRoot };
    const run = await runClaudeHandler(claudeHandlers[event].handler, payload, { env, cwd: claudeRoot });
    assert.equal(run.status, 0);
    assert.equal(run.report.events[0].fields.skillName, "third-party-skill");
  }
  const readSkill = { ...fixtureCase("claude-hooks.json", "pre_tool_bash").payload, tool_name: "Read", tool_input: { file_path: path.join(claudeSkill, "SKILL.md") } };
  assert.equal((await runClaudeHandler(claudeHandlers.PreToolUse.handler, readSkill, { env, cwd: claudeRoot })).status, 0);
  expectUntouched(claudeSkill, claudeBaseline, "claude depois de observar");
  assert.equal(runIntegrationsJson(["uninstall", "--agent", "claude", "--target", claudeTarget, "--apply"], { env }).status, 0);
  expectUntouched(claudeSkill, claudeBaseline, "claude depois de remover");

  // Codex: skill em <target>/skills; observação por hooks e pelo wrapper.
  const codexRoot = makeScratch("hash-codex");
  scratches.push(codexRoot);
  const codexTarget = path.join(codexRoot, ".codex");
  mkdirSync(codexTarget);
  const codexSkill = writeThirdPartySkill(path.join(codexTarget, "skills"));
  const codexBaseline = snapshotTree(codexSkill);
  const codexEnv = baseEnv({ HOME: codexRoot, ...(process.platform === "win32" ? {} : { SHELL: "/bin/sh" }) });
  assert.equal(runIntegrationsJson(["install", "--agent", "codex", "--target", codexTarget, "--apply"], { env: codexEnv }).status, 0);
  expectUntouched(codexSkill, codexBaseline, "codex depois de instalar");
  const codexHandlers = readCodexHandlers(codexTarget);
  for (const [event, caseName] of [["PreToolUse", "pre_tool_read_skill_md"], ["PostToolUse", "post_tool_read_skill_md"]]) {
    const payload = { ...fixtureCase("codex-hooks.json", caseName).payload, tool_input: { command: `cat "${path.join(codexSkill, "SKILL.md")}"` } };
    assert.equal((await runCodexHandler(codexHandlers[event].handler, payload, { env: codexEnv, cwd: codexRoot })).status, 0);
  }
  const wrapped = await runWrapper({
    args: ["leia a skill"],
    entry: FAKE_CODEX,
    env: baseEnv({ FAKE_CODEX_SCENARIO: writeScenario(codexRoot, "skill", [{ stdout: JSON.stringify({ type: "item.completed", item: { id: "i", type: "command_execution", command: `cat ${path.join(codexSkill, "SKILL.md")}`, aggregated_output: "x", exit_code: 0, status: "completed" } }) }]) }),
    cwd: codexSkill,
  });
  assert.equal(wrapped.status, 0);
  expectUntouched(codexSkill, codexBaseline, "codex depois de observar");
  assert.equal(runIntegrationsJson(["uninstall", "--agent", "codex", "--target", codexTarget, "--apply"], { env: codexEnv }).status, 0);
  expectUntouched(codexSkill, codexBaseline, "codex depois de remover");

  // Hermes: skill em <HERMES_HOME>/skills; observação pelo dispatch nativo.
  const hermesRoot = makeScratch("hash-hermes");
  scratches.push(hermesRoot);
  const runtime = locateHermesRuntime();
  const hermesEnv = harnessEnv(hermesRoot);
  const home = hermesEnv.HERMES_HOME;
  mkdirSync(home, { recursive: true });
  const hermesSkill = writeThirdPartySkill(path.join(home, "skills"));
  const hermesBaseline = snapshotTree(hermesSkill);
  assert.equal(runIntegrationsJson(["install", "--agent", "hermes", "--target", home, "--apply"], { env }).status, 0);
  expectUntouched(hermesSkill, hermesBaseline, "hermes depois de instalar");
  if (runtime.skipReason) {
    t.diagnostic(`observação Hermes não executada: hermes-runtime-ausente: ${runtime.skipReason} (prova nativa pendente)`);
  } else {
    cpSync(path.join(FIXTURE_PLUGINS, "skillme-fixture-tool"), path.join(home, "plugins", "skillme-fixture-tool"), { recursive: true });
    writeFileSync(path.join(home, "config.yaml"), "plugins:\n  enabled:\n    - skill-me-observer\n    - skillme-fixture-tool\n");
    const run = await runHarness(runtime, {
      sandbox: hermesRoot,
      env: hermesEnv,
      scenario: {
        toolCalls: 1,
        toolArgs: { value: path.join(hermesSkill, "SKILL.md") },
        invokes: [{ hook: "on_skill_lifecycle", kwargs: { action: "loaded", skill_name: "third-party-skill", provenance: "local", session_id: "s", use_count: 1 } }],
      },
    });
    assert.ok(run.result, run.stderr.slice(-1000));
    expectUntouched(hermesSkill, hermesBaseline, "hermes depois de observar");
    rmSync(path.join(home, "plugins", "skillme-fixture-tool"), { recursive: true });
  }
  const removed = runIntegrationsJson(["uninstall", "--agent", "hermes", "--target", home, "--apply"], { env });
  assert.equal(removed.status, 0, removed.stdout);
  expectUntouched(hermesSkill, hermesBaseline, "hermes depois de remover");
});
