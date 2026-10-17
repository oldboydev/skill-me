import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { baseEnv, makeScratch, runIntegrationsJson } from "./helpers/cli.mjs";
import { fixtureCase } from "./helpers/fixtures.mjs";
import { readClaudeHandlers, runClaudeHandler } from "./helpers/installed-hooks.mjs";

let scratch;
let target;
let handlers;
const env = baseEnv();

before(() => {
  scratch = makeScratch("claude-hook");
  target = path.join(scratch, ".claude");
  mkdirSync(target);
  writeFileSync(
    path.join(target, "settings.json"),
    JSON.stringify({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "third-party.sh" }] }] } }, null, 2),
  );
  const installed = runIntegrationsJson(["install", "--agent", "claude", "--target", target, "--apply"], { env });
  assert.equal(installed.status, 0, installed.stderr);
  handlers = readClaudeHandlers(target);
});

after(() => rmSync(scratch, { recursive: true, force: true }));

async function observe(event, caseName) {
  const { payload } = fixtureCase("claude-hooks.json", caseName);
  assert.equal(payload.hook_event_name ?? event, event, caseName);
  const run = await runClaudeHandler(handlers[event].handler, payload, { env, cwd: scratch });
  // Saída neutra em todo evento: nada em stdout (nenhuma decisão/contexto) e exit 0.
  assert.equal(run.status, 0, `${caseName}: ${run.stderr}`);
  assert.equal(run.stdout, "", caseName);
  assert.ok(run.report, `${caseName}: relatório ausente`);
  return run.report;
}

function single(report, label) {
  assert.equal(report.events.length, 1, label);
  assert.equal(report.counters.accepted, 1, label);
  return report.events[0];
}

test("I4-C1 claude: eventos de ferramenta atravessam o hook instalado preservando IDs nativos", async () => {
  // Forma exec gravada: node absoluto + CLI absoluto, sem shell e sem matcher.
  for (const event of ["PreToolUse", "PostToolUse", "PostToolUseFailure"]) {
    assert.equal(handlers[event].count, 1, event);
    assert.equal(handlers[event].handler.command, process.execPath, event);
    assert.equal(handlers[event].group.matcher, undefined, event);
  }
  const pre = single(await observe("PreToolUse", "pre_tool_bash"), "pre");
  assert.equal(pre.eventKind, "tool_pre");
  assert.equal(pre.nativeEvent, "PreToolUse");
  assert.equal(pre.signal, "native_hook");
  assert.deepEqual(pre.ids, {
    sessionId: "5f1e9c2a-0b7d-4e55-9a31-claude-sess-01",
    promptId: "7c0d2b44-1a9e-4f0b-8d2e-claude-prompt-01",
    toolUseId: "toolu_01ClaudeFixtureBash",
  });
  assert.deepEqual(pre.fields, { toolName: "Bash" });

  const post = single(await observe("PostToolUse", "post_tool_bash"), "post");
  assert.equal(post.eventKind, "tool_post");
  assert.equal(post.ids.toolUseId, "toolu_01ClaudeFixtureBash");
  assert.deepEqual(post.fields, { toolName: "Bash", outcome: "success", durationMs: 42 });

  const failure = single(await observe("PostToolUseFailure", "post_tool_failure_bash"), "failure");
  assert.equal(failure.eventKind, "tool_post");
  assert.equal(failure.nativeEvent, "PostToolUseFailure");
  assert.equal(failure.ids.toolUseId, "toolu_01ClaudeFixtureFail");
  assert.deepEqual(failure.fields, { toolName: "Bash", outcome: "failure", interrupted: false, durationMs: 7 });

  const inSubagent = single(await observe("PreToolUse", "subagent_pre_tool"), "subagent tool");
  assert.equal(inSubagent.ids.agentId, "agent-claude-fixture-01");
});

test("I4-C2 claude: início/fim de sessão e subagentes pelo hook instalado", async () => {
  const start = single(await observe("SessionStart", "session_start"), "start");
  assert.equal(start.eventKind, "session_start");
  assert.deepEqual(start.fields, { source: "startup" });
  assert.equal(start.ids.sessionId, "5f1e9c2a-0b7d-4e55-9a31-claude-sess-01");

  const end = single(await observe("SessionEnd", "session_end"), "end");
  assert.equal(end.eventKind, "session_end");
  assert.deepEqual(end.fields, { reason: "prompt_input_exit" });

  const subStart = single(await observe("SubagentStart", "subagent_start"), "subagent start");
  assert.equal(subStart.eventKind, "subagent_start");
  assert.equal(subStart.ids.agentId, "agent-claude-fixture-01");
  assert.deepEqual(subStart.fields, { agentType: "Explore" });

  const subStop = single(await observe("SubagentStop", "subagent_stop"), "subagent stop");
  assert.equal(subStop.eventKind, "subagent_stop");
  assert.equal(subStop.ids.agentId, "agent-claude-fixture-01");
  assert.deepEqual(subStop.fields, { agentType: "Explore" });
  assert.ok(!JSON.stringify(subStop).includes("SKILLME-CANARY"));
});

test("I4-C3 claude: campos ausentes e inválidos viram lacunas, nunca valores", async () => {
  const minimal = single(await observe("PostToolUseFailure", "post_tool_failure_minimal"), "minimal");
  assert.deepEqual(minimal.fields, { toolName: "Read", outcome: "failure" });
  for (const gap of ["interrupted:absent", "durationMs:absent", "agentId:absent", "promptId:absent", "errorType:not_in_contract"])
    assert.ok(minimal.gaps.includes(gap), gap);
  assert.ok(!("agentId" in minimal.ids) && !("promptId" in minimal.ids));

  const wrongTypes = single(await observe("PostToolUseFailure", "invalid_types"), "types");
  assert.deepEqual(wrongTypes.fields, { toolName: "Bash", outcome: "failure" });
  assert.ok(wrongTypes.gaps.includes("interrupted:invalid_type"));
  assert.ok(wrongTypes.gaps.includes("durationMs:invalid_type"));

  const unknownSource = single(await observe("SessionStart", "unrecognized_source"), "source");
  assert.deepEqual(unknownSource.fields, {});
  assert.ok(unknownSource.gaps.includes("source:unrecognized_value"));
});

test("I4-C4 claude: invocação pelo agente via ferramenta Skill", async () => {
  const report = await observe("PreToolUse", "pre_tool_skill");
  const skill = single(report, "skill tool");
  assert.equal(skill.eventKind, "skill_invocation");
  assert.equal(skill.nativeEvent, "PreToolUse");
  assert.deepEqual(skill.fields, { invocationPath: "skill_tool", phase: "pre", skillName: "third-party-skill" });
  assert.equal(skill.ids.toolUseId, "toolu_01ClaudeFixtureSkill");
  assert.ok(!JSON.stringify(report).includes("SKILLME-CANARY-args"));
});

test("I4-C5 claude: invocação direta por /nome observada por UserPromptExpansion", async () => {
  // O cenário direto executa somente o handler de UserPromptExpansion: nenhum
  // PreToolUse da ferramenta Skill participa desta prova.
  const report = await observe("UserPromptExpansion", "expansion_slash_command");
  const direct = single(report, "direct");
  assert.equal(direct.eventKind, "skill_invocation");
  assert.equal(direct.nativeEvent, "UserPromptExpansion");
  assert.deepEqual(direct.fields, {
    invocationPath: "direct_command",
    phase: "expansion",
    skillName: "third-party-skill",
    commandSource: "plugin",
  });
  assert.ok(!("toolUseId" in direct.ids));
  const text = JSON.stringify(report);
  assert.ok(!text.includes("SKILLME-CANARY-prompt") && !text.includes("SKILLME-CANARY-args"));

  const mcp = single(await observe("UserPromptExpansion", "expansion_mcp_prompt"), "mcp");
  assert.equal(mcp.eventKind, "command_expansion");
  assert.deepEqual(mcp.fields, { expansionType: "mcp_prompt", commandName: "docs-server:summarize", commandSource: "mcp" });
});
