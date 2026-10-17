import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { baseEnv, makeScratch, runIntegrationsJson } from "./helpers/cli.mjs";
import { fixtureCase } from "./helpers/fixtures.mjs";
import { readCodexHandlers, runCodexHandler } from "./helpers/installed-hooks.mjs";

let scratch;
let target;
let handlers;
let env;

before(() => {
  scratch = makeScratch("codex-hook");
  target = path.join(scratch, ".codex");
  mkdirSync(target);
  writeFileSync(
    path.join(target, "hooks.json"),
    JSON.stringify({ description: "terceiros", hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "python3 policy.py" }] }] } }, null, 2),
  );
  // POSIX: `sh -lc` lê o perfil de login do HOME; um HOME temporário evita
  // depender do perfil de quem roda o teste.
  env = baseEnv({ HOME: scratch, SHELL: process.platform === "win32" ? undefined : "/bin/sh" });
  if (env.SHELL === undefined) delete env.SHELL;
  const installed = runIntegrationsJson(["install", "--agent", "codex", "--target", target, "--apply"], { env });
  assert.equal(installed.status, 0, installed.stderr);
  handlers = readCodexHandlers(target);
});

after(() => rmSync(scratch, { recursive: true, force: true }));

async function observe(event, caseName) {
  const { payload } = fixtureCase("codex-hooks.json", caseName);
  assert.equal(payload.hook_event_name, event, caseName);
  const run = await runCodexHandler(handlers[event].handler, payload, { env, cwd: scratch });
  assert.equal(run.status, 0, `${caseName}: ${run.stderr}`);
  assert.equal(run.stdout, "", caseName);
  assert.ok(run.report, `${caseName}: relatório ausente; stderr=${run.stderr}`);
  assert.equal(run.report.events.length, 1, caseName);
  return { envelope: run.report.events[0], text: JSON.stringify(run.report) };
}

test("I4-C7 codex: hooks locais instalados encaminham ferramentas e ciclo de vida com IDs nativos", async () => {
  const expected = {
    PreToolUse: ["pre_tool_bash", "tool_pre", { sessionId: "0199a213-81c0-7800-8aa1-codex-sess-01", turnId: "codex-turn-01", toolUseId: "call_codex_fixture_01" }],
    PostToolUse: ["post_tool_bash", "tool_post", { sessionId: "0199a213-81c0-7800-8aa1-codex-sess-01", turnId: "codex-turn-01", toolUseId: "call_codex_fixture_01" }],
    SessionStart: ["session_start", "session_start", { sessionId: "0199a213-81c0-7800-8aa1-codex-sess-01" }],
    SessionEnd: ["session_end", "session_end", { sessionId: "0199a213-81c0-7800-8aa1-codex-sess-01" }],
    SubagentStart: ["subagent_start", "subagent_start", { sessionId: "0199a213-81c0-7800-8aa1-codex-sess-01", turnId: "codex-turn-03", agentId: "codex-agent-fixture-01" }],
    SubagentStop: ["subagent_stop", "subagent_stop", { sessionId: "0199a213-81c0-7800-8aa1-codex-sess-01", turnId: "codex-turn-03", agentId: "codex-agent-fixture-01" }],
  };
  assert.deepEqual(Object.keys(handlers).sort(), Object.keys(expected).sort());
  for (const [event, [caseName, eventKind, ids]] of Object.entries(expected)) {
    assert.equal(handlers[event].count, 1, event);
    // SessionEnd mantém o default do agente (1 s); os demais gravam 10 s.
    assert.equal(handlers[event].handler.timeout, event === "SessionEnd" ? undefined : 10, event);
    const { envelope, text } = await observe(event, caseName);
    assert.equal(envelope.eventKind, eventKind, event);
    assert.equal(envelope.nativeEvent, event, event);
    assert.equal(envelope.signal, "native_hook", event);
    assert.deepEqual(envelope.ids, ids, event);
    assert.ok(!text.includes("SKILLME-CANARY"), event);
  }
  const { envelope: post } = await observe("PostToolUse", "post_tool_bash");
  assert.deepEqual(post.fields, { toolName: "Bash" });
  assert.ok(post.gaps.includes("outcome:not_in_contract"));
  const { envelope: sub } = await observe("PreToolUse", "subagent_pre_tool");
  assert.equal(sub.ids.agentId, "codex-agent-fixture-01");
});

test("I4-C8 codex: ler SKILL.md não vira evento de skill nem atribuição", async () => {
  for (const [event, caseName, eventKind] of [
    ["PreToolUse", "pre_tool_read_skill_md", "tool_pre"],
    ["PostToolUse", "post_tool_read_skill_md", "tool_post"],
  ]) {
    const { envelope, text } = await observe(event, caseName);
    assert.equal(envelope.eventKind, eventKind);
    assert.equal(envelope.signal, "native_hook");
    assert.deepEqual(Object.keys(envelope.fields), ["toolName"]);
    for (const forbidden of ["skill_invocation", "skillName", "SKILL.md", "third-party-skill", "SKILLME-CANARY"])
      assert.ok(!text.includes(forbidden), `${caseName}: ${forbidden}`);
  }
});
