import assert from "node:assert/strict";
import test from "node:test";
import { buildEnvelope } from "../../src/integrations/boundary.mjs";
import { claudeHookDraft } from "../../src/integrations/adapters/claude.mjs";
import { codexHookDraft } from "../../src/integrations/adapters/codex-hooks.mjs";
import { codexExecDraft, processExitDraft } from "../../src/integrations/adapters/codex-exec.mjs";
import { hermesDraft } from "../../src/integrations/adapters/hermes.mjs";
import { fixtureCase, loadFixture } from "./helpers/fixtures.mjs";

// Expectativas escritas a partir da tabela de mapeamento do plano
// ("Mapeamento por contrato") e dos contratos citados nas fixtures — não da
// implementação. `gaps` é comparado ordenado.
function expectEnvelope(adapted, expected, label) {
  assert.equal(adapted.kind, "draft", label);
  const result = buildEnvelope(adapted.draft);
  assert.equal(result.ok, true, label);
  const { envelope } = result;
  assert.equal(envelope.eventKind, expected.eventKind, label);
  assert.equal(envelope.nativeEvent, expected.nativeEvent, label);
  assert.equal(envelope.signal, expected.signal, label);
  assert.deepEqual(envelope.source, expected.source, label);
  assert.deepEqual(envelope.ids, expected.ids, label);
  assert.deepEqual(envelope.fields, expected.fields, label);
  assert.deepEqual([...envelope.gaps].sort(), [...expected.gaps].sort(), label);
}

const CLAUDE = {
  source: { agent: "claude", mechanism: "command_hook", contract: "claude-code-hooks@docs-2026-10-16" },
  signal: "native_hook",
};
const S1 = "5f1e9c2a-0b7d-4e55-9a31-claude-sess-01";
const P1 = "7c0d2b44-1a9e-4f0b-8d2e-claude-prompt-01";
const P2 = "7c0d2b44-1a9e-4f0b-8d2e-claude-prompt-02";
const CLAUDE_TABLE = {
  pre_tool_bash: { eventKind: "tool_pre", nativeEvent: "PreToolUse", ids: { sessionId: S1, promptId: P1, toolUseId: "toolu_01ClaudeFixtureBash" }, fields: { toolName: "Bash" }, gaps: ["agentId:absent"] },
  post_tool_bash: { eventKind: "tool_post", nativeEvent: "PostToolUse", ids: { sessionId: S1, promptId: P1, toolUseId: "toolu_01ClaudeFixtureBash" }, fields: { toolName: "Bash", outcome: "success", durationMs: 42 }, gaps: ["agentId:absent", "errorType:not_in_contract", "interrupted:not_in_contract"] },
  post_tool_failure_bash: { eventKind: "tool_post", nativeEvent: "PostToolUseFailure", ids: { sessionId: S1, promptId: P1, toolUseId: "toolu_01ClaudeFixtureFail" }, fields: { toolName: "Bash", outcome: "failure", interrupted: false, durationMs: 7 }, gaps: ["agentId:absent", "errorType:not_in_contract"] },
  post_tool_failure_minimal: { eventKind: "tool_post", nativeEvent: "PostToolUseFailure", ids: { sessionId: S1, toolUseId: "toolu_01ClaudeFixtureFailMin" }, fields: { toolName: "Read", outcome: "failure" }, gaps: ["agentId:absent", "durationMs:absent", "errorType:not_in_contract", "interrupted:absent", "promptId:absent"] },
  pre_tool_skill: { eventKind: "skill_invocation", nativeEvent: "PreToolUse", ids: { sessionId: S1, promptId: P2, toolUseId: "toolu_01ClaudeFixtureSkill" }, fields: { invocationPath: "skill_tool", phase: "pre", skillName: "third-party-skill" }, gaps: ["agentId:absent", "commandSource:not_in_contract", "interrupted:not_in_contract", "outcome:not_in_contract"] },
  post_tool_skill: { eventKind: "skill_invocation", nativeEvent: "PostToolUse", ids: { sessionId: S1, promptId: P2, toolUseId: "toolu_01ClaudeFixtureSkill" }, fields: { invocationPath: "skill_tool", phase: "post", skillName: "third-party-skill", outcome: "success" }, gaps: ["agentId:absent", "commandSource:not_in_contract", "interrupted:not_in_contract"] },
  expansion_slash_command: { eventKind: "skill_invocation", nativeEvent: "UserPromptExpansion", ids: { sessionId: "5f1e9c2a-0b7d-4e55-9a31-claude-sess-02", promptId: "7c0d2b44-1a9e-4f0b-8d2e-claude-prompt-03" }, fields: { invocationPath: "direct_command", phase: "expansion", skillName: "third-party-skill", commandSource: "plugin" }, gaps: ["agentId:absent", "interrupted:not_in_contract", "outcome:not_in_contract"] },
  expansion_mcp_prompt: { eventKind: "command_expansion", nativeEvent: "UserPromptExpansion", ids: { sessionId: "5f1e9c2a-0b7d-4e55-9a31-claude-sess-02", promptId: "7c0d2b44-1a9e-4f0b-8d2e-claude-prompt-04" }, fields: { expansionType: "mcp_prompt", commandName: "docs-server:summarize", commandSource: "mcp" }, gaps: ["agentId:absent"] },
  session_start: { eventKind: "session_start", nativeEvent: "SessionStart", ids: { sessionId: S1 }, fields: { source: "startup" }, gaps: ["agentId:absent", "platform:not_in_contract", "promptId:absent"] },
  session_end: { eventKind: "session_end", nativeEvent: "SessionEnd", ids: { sessionId: S1 }, fields: { reason: "prompt_input_exit" }, gaps: ["agentId:absent", "promptId:absent"] },
  subagent_start: { eventKind: "subagent_start", nativeEvent: "SubagentStart", ids: { sessionId: S1, agentId: "agent-claude-fixture-01" }, fields: { agentType: "Explore" }, gaps: ["childRole:not_in_contract", "promptId:absent"] },
  subagent_stop: { eventKind: "subagent_stop", nativeEvent: "SubagentStop", ids: { sessionId: S1, agentId: "agent-claude-fixture-01" }, fields: { agentType: "Explore" }, gaps: ["childRole:not_in_contract", "childStatus:not_in_contract", "durationMs:not_in_contract", "promptId:absent"] },
  subagent_pre_tool: { eventKind: "tool_pre", nativeEvent: "PreToolUse", ids: { sessionId: S1, promptId: P1, agentId: "agent-claude-fixture-01", toolUseId: "toolu_01ClaudeFixtureSubagent" }, fields: { toolName: "Grep" }, gaps: [] },
};

const CODEX = {
  source: { agent: "codex", mechanism: "command_hook", contract: "codex-hooks@rust-v0.162.1" },
  signal: "native_hook",
};
const CS = "0199a213-81c0-7800-8aa1-codex-sess-01";
const TOOL_POST_CODEX_GAPS = ["agentId:absent", "durationMs:not_in_contract", "errorType:not_in_contract", "interrupted:not_in_contract", "outcome:not_in_contract"];
const CODEX_HOOK_TABLE = {
  pre_tool_bash: { eventKind: "tool_pre", nativeEvent: "PreToolUse", ids: { sessionId: CS, turnId: "codex-turn-01", toolUseId: "call_codex_fixture_01" }, fields: { toolName: "Bash" }, gaps: ["agentId:absent"] },
  post_tool_bash: { eventKind: "tool_post", nativeEvent: "PostToolUse", ids: { sessionId: CS, turnId: "codex-turn-01", toolUseId: "call_codex_fixture_01" }, fields: { toolName: "Bash" }, gaps: TOOL_POST_CODEX_GAPS },
  pre_tool_read_skill_md: { eventKind: "tool_pre", nativeEvent: "PreToolUse", ids: { sessionId: CS, turnId: "codex-turn-02", toolUseId: "call_codex_fixture_skill_md" }, fields: { toolName: "Bash" }, gaps: ["agentId:absent"] },
  post_tool_read_skill_md: { eventKind: "tool_post", nativeEvent: "PostToolUse", ids: { sessionId: CS, turnId: "codex-turn-02", toolUseId: "call_codex_fixture_skill_md" }, fields: { toolName: "Bash" }, gaps: TOOL_POST_CODEX_GAPS },
  subagent_pre_tool: { eventKind: "tool_pre", nativeEvent: "PreToolUse", ids: { sessionId: CS, turnId: "codex-turn-03", agentId: "codex-agent-fixture-01", toolUseId: "call_codex_fixture_sub" }, fields: { toolName: "apply_patch" }, gaps: [] },
  session_start: { eventKind: "session_start", nativeEvent: "SessionStart", ids: { sessionId: CS }, fields: { source: "startup" }, gaps: ["platform:not_in_contract"] },
  session_end: { eventKind: "session_end", nativeEvent: "SessionEnd", ids: { sessionId: CS }, fields: { reason: "other" }, gaps: [] },
  subagent_start: { eventKind: "subagent_start", nativeEvent: "SubagentStart", ids: { sessionId: CS, turnId: "codex-turn-03", agentId: "codex-agent-fixture-01" }, fields: { agentType: "worker" }, gaps: ["childRole:not_in_contract"] },
  subagent_stop: { eventKind: "subagent_stop", nativeEvent: "SubagentStop", ids: { sessionId: CS, turnId: "codex-turn-03", agentId: "codex-agent-fixture-01" }, fields: { agentType: "worker" }, gaps: ["childRole:not_in_contract", "childStatus:not_in_contract", "durationMs:not_in_contract"] },
  invalid_tool_name_type: { eventKind: "tool_pre", nativeEvent: "PreToolUse", ids: { sessionId: CS, toolUseId: "call_codex_fixture_bad" }, fields: {}, gaps: ["agentId:absent", "toolName:invalid_type", "turnId:invalid_type"] },
};

const EXEC = {
  source: { agent: "codex", mechanism: "exec_jsonl", contract: "codex-exec-jsonl@rust-v0.162.1" },
  signal: "supervised_exec",
};
const ITEM_ALL = ["status", "exitCode", "toolName", "mcpServer", "collabTool"];
const notIn = (names) => names.map((n) => `${n}:not_in_contract`);
const EXEC_TABLE = {
  thread_started: { eventKind: "session_start", nativeEvent: "thread.started", ids: { threadId: "0199a213-81c0-7800-8aa1-bbab2a035a53" }, fields: {}, gaps: notIn(["source", "platform"]) },
  turn_started: { eventKind: "turn_start", nativeEvent: "turn.started", ids: {}, fields: {}, gaps: [] },
  item_started_command: { eventKind: "item", nativeEvent: "item.started", ids: { itemId: "item_0" }, fields: { phase: "started", itemType: "command_execution", status: "in_progress" }, gaps: ["exitCode:absent", ...notIn(["toolName", "mcpServer", "collabTool"])] },
  item_completed_command: { eventKind: "item", nativeEvent: "item.completed", ids: { itemId: "item_0" }, fields: { phase: "completed", itemType: "command_execution", status: "completed", exitCode: 0 }, gaps: notIn(["toolName", "mcpServer", "collabTool"]) },
  item_completed_agent_message: { eventKind: "item", nativeEvent: "item.completed", ids: { itemId: "item_2" }, fields: { phase: "completed", itemType: "agent_message" }, gaps: notIn(ITEM_ALL) },
  item_updated_todo_list: { eventKind: "item", nativeEvent: "item.updated", ids: { itemId: "item_3" }, fields: { phase: "updated", itemType: "todo_list" }, gaps: notIn(ITEM_ALL) },
  item_completed_file_change: { eventKind: "item", nativeEvent: "item.completed", ids: { itemId: "item_4" }, fields: { phase: "completed", itemType: "file_change", status: "completed" }, gaps: notIn(["exitCode", "toolName", "mcpServer", "collabTool"]) },
  item_completed_mcp_tool_call: { eventKind: "item", nativeEvent: "item.completed", ids: { itemId: "item_5" }, fields: { phase: "completed", itemType: "mcp_tool_call", status: "completed", toolName: "search", mcpServer: "docs" }, gaps: notIn(["exitCode", "collabTool"]) },
  item_completed_collab_tool_call: { eventKind: "item", nativeEvent: "item.completed", ids: { itemId: "item_6" }, fields: { phase: "completed", itemType: "collab_tool_call", status: "completed", collabTool: "spawn_agent" }, gaps: notIn(["exitCode", "toolName", "mcpServer"]) },
  item_completed_web_search: { eventKind: "item", nativeEvent: "item.completed", ids: { itemId: "item_7" }, fields: { phase: "completed", itemType: "web_search" }, gaps: notIn(ITEM_ALL) },
  item_completed_error: { eventKind: "item", nativeEvent: "item.completed", ids: { itemId: "item_8" }, fields: { phase: "completed", itemType: "error" }, gaps: notIn(ITEM_ALL) },
  turn_completed: { eventKind: "turn_end", nativeEvent: "turn.completed", ids: {}, fields: { outcome: "completed", inputTokens: 24763, cachedInputTokens: 24448, cacheWriteInputTokens: 0, outputTokens: 122, reasoningOutputTokens: 64 }, gaps: notIn(["completed", "failed", "interrupted"]) },
  turn_failed: { eventKind: "turn_end", nativeEvent: "turn.failed", ids: {}, fields: { outcome: "failed" }, gaps: notIn(["completed", "failed", "interrupted", "inputTokens", "cachedInputTokens", "cacheWriteInputTokens", "outputTokens", "reasoningOutputTokens"]) },
  stream_error: { eventKind: "error", nativeEvent: "error", ids: {}, fields: {}, gaps: [] },
  unknown_item_type: { eventKind: "item", nativeEvent: "item.completed", ids: { itemId: "item_9" }, fields: { phase: "completed" }, gaps: ["itemType:unrecognized_value", ...notIn(ITEM_ALL)] },
  bad_usage_types: { eventKind: "turn_end", nativeEvent: "turn.completed", ids: {}, fields: { outcome: "completed", reasoningOutputTokens: 3 }, gaps: ["inputTokens:invalid_type", "cachedInputTokens:invalid_type", "outputTokens:invalid_type", "cacheWriteInputTokens:absent", ...notIn(["completed", "failed", "interrupted"])] },
};

const HERMES = {
  source: { agent: "hermes", mechanism: "python_plugin", contract: "hermes-plugin-hooks@0.21.4" },
  signal: "native_plugin",
};
const HTOOL = { sessionId: "hermes-sess-01", taskId: "hermes-task-01", toolCallId: "hermes-call-01", turnId: "hermes-turn-01" };
const TURN_END_TOKENS = notIn(["outcome", "inputTokens", "cachedInputTokens", "cacheWriteInputTokens", "outputTokens", "reasoningOutputTokens"]);
// Registros exatamente como o plugin Python os envia (nomes listados em
// kwargs.json, escalares inalterados, não escalares só nomeados).
const HERMES_TABLE = [
  ["pre_tool_call", { hook: "pre_tool_call", kwargs: { tool_name: "skillme_fixture_echo", session_id: "hermes-sess-01", task_id: "hermes-task-01", tool_call_id: "hermes-call-01", turn_id: "hermes-turn-01" }, nonScalar: [] },
    { eventKind: "tool_pre", nativeEvent: "pre_tool_call", ids: HTOOL, fields: { toolName: "skillme_fixture_echo" }, gaps: [] }],
  ["post_tool_call", { hook: "post_tool_call", kwargs: { tool_name: "skillme_fixture_echo", session_id: "hermes-sess-01", task_id: "hermes-task-01", tool_call_id: "hermes-call-01", turn_id: "hermes-turn-01", status: "ok", error_type: null, duration_ms: 3 }, nonScalar: [] },
    { eventKind: "tool_post", nativeEvent: "post_tool_call", ids: HTOOL, fields: { toolName: "skillme_fixture_echo", outcome: "success", durationMs: 3 }, gaps: ["errorType:absent", "interrupted:not_in_contract"] }],
  ["post_tool_call_error", { hook: "post_tool_call", kwargs: { tool_name: "skillme_fixture_echo", session_id: "hermes-sess-01", task_id: "hermes-task-01", tool_call_id: "hermes-call-02", turn_id: "hermes-turn-01", status: "error", error_type: "ValueError", duration_ms: 1 }, nonScalar: [] },
    { eventKind: "tool_post", nativeEvent: "post_tool_call", ids: { ...HTOOL, toolCallId: "hermes-call-02" }, fields: { toolName: "skillme_fixture_echo", outcome: "failure", errorType: "ValueError", durationMs: 1 }, gaps: ["interrupted:not_in_contract"] }],
  ["post_tool_call_blocked", { hook: "post_tool_call", kwargs: { tool_name: "skillme_fixture_echo", session_id: "hermes-sess-01", tool_call_id: "hermes-call-05", status: "blocked", error_type: "plugin_block", duration_ms: 0 }, nonScalar: [] },
    { eventKind: "tool_post", nativeEvent: "post_tool_call", ids: { sessionId: "hermes-sess-01", toolCallId: "hermes-call-05" }, fields: { toolName: "skillme_fixture_echo", outcome: "blocked", errorType: "plugin_block", durationMs: 0 }, gaps: ["taskId:absent", "turnId:absent", "interrupted:not_in_contract"] }],
  ["on_skill_lifecycle", { hook: "on_skill_lifecycle", kwargs: { action: "loaded", skill_name: "third-party-skill", provenance: "local", task_id: "hermes-task-01", session_id: "hermes-sess-01", use_count: 3, reused: true, reuse_after_patch: false }, nonScalar: [] },
    { eventKind: "skill_lifecycle", nativeEvent: "on_skill_lifecycle", ids: { sessionId: "hermes-sess-01", taskId: "hermes-task-01" }, fields: { action: "loaded", skillName: "third-party-skill", provenance: "local", useCount: 3, reused: true, reuseAfterPatch: false }, gaps: [] }],
  ["on_session_start", { hook: "on_session_start", kwargs: { session_id: "hermes-sess-01", platform: "cli" }, nonScalar: [] },
    { eventKind: "session_start", nativeEvent: "on_session_start", ids: { sessionId: "hermes-sess-01" }, fields: { platform: "cli" }, gaps: ["source:not_in_contract"] }],
  ["on_session_end", { hook: "on_session_end", kwargs: { session_id: "hermes-sess-01", task_id: "hermes-task-01", turn_id: "hermes-turn-01", completed: true, failed: false, interrupted: false }, nonScalar: [] },
    { eventKind: "turn_end", nativeEvent: "on_session_end", ids: { sessionId: "hermes-sess-01", taskId: "hermes-task-01", turnId: "hermes-turn-01" }, fields: { completed: true, failed: false, interrupted: false }, gaps: TURN_END_TOKENS }],
  ["subagent_start", { hook: "subagent_start", kwargs: { parent_session_id: "hermes-sess-01", parent_turn_id: "hermes-turn-01", parent_subagent_id: null, child_session_id: "hermes-sess-child-01", child_subagent_id: "hermes-subagent-01", child_role: "leaf" }, nonScalar: [] },
    { eventKind: "subagent_start", nativeEvent: "subagent_start", ids: { parentSessionId: "hermes-sess-01", parentTurnId: "hermes-turn-01", childSessionId: "hermes-sess-child-01", subagentId: "hermes-subagent-01" }, fields: { childRole: "leaf" }, gaps: ["parentSubagentId:absent", "agentType:not_in_contract"] }],
  ["subagent_stop", { hook: "subagent_stop", kwargs: { parent_session_id: "hermes-sess-01", parent_turn_id: "hermes-turn-01", child_session_id: "hermes-sess-child-01", child_role: "leaf", child_status: "completed", duration_ms: 1234 }, nonScalar: [] },
    { eventKind: "subagent_stop", nativeEvent: "subagent_stop", ids: { parentSessionId: "hermes-sess-01", parentTurnId: "hermes-turn-01", childSessionId: "hermes-sess-child-01" }, fields: { childRole: "leaf", childStatus: "completed", durationMs: 1234 }, gaps: ["agentType:not_in_contract"] }],
  ["missing_kwargs", { hook: "on_skill_lifecycle", kwargs: { action: "loaded", skill_name: "third-party-skill" }, nonScalar: [] },
    { eventKind: "skill_lifecycle", nativeEvent: "on_skill_lifecycle", ids: {}, fields: { action: "loaded", skillName: "third-party-skill" }, gaps: ["sessionId:absent", "taskId:absent", "provenance:absent", "useCount:absent", "reused:absent", "reuseAfterPatch:absent"] }],
  ["non_scalar_listed_kwarg", { hook: "pre_tool_call", kwargs: { tool_call_id: "hermes-call-03" }, nonScalar: ["tool_name", "session_id"] },
    { eventKind: "tool_pre", nativeEvent: "pre_tool_call", ids: { toolCallId: "hermes-call-03" }, fields: {}, gaps: ["sessionId:invalid_type", "taskId:absent", "turnId:absent", "toolName:invalid_type"] }],
  ["unrecognized_status", { hook: "post_tool_call", kwargs: { tool_name: "skillme_fixture_echo", session_id: "hermes-sess-01", tool_call_id: "hermes-call-04", status: "exploded", duration_ms: "fast" }, nonScalar: [] },
    { eventKind: "tool_post", nativeEvent: "post_tool_call", ids: { sessionId: "hermes-sess-01", toolCallId: "hermes-call-04" }, fields: { toolName: "skillme_fixture_echo" }, gaps: ["taskId:absent", "turnId:absent", "outcome:unrecognized_value", "durationMs:invalid_type", "errorType:absent", "interrupted:not_in_contract"] }],
];

test("I4-C48 mapas dos adaptadores cobrem cada conjunto inteiro do contrato", () => {
  // Claude: os 8 eventos assinados (PreToolUse aparece em 3 formas).
  const claudeEvents = new Set();
  for (const [name, expected] of Object.entries(CLAUDE_TABLE)) {
    expectEnvelope(claudeHookDraft(fixtureCase("claude-hooks.json", name).payload), { ...CLAUDE, ...expected }, `claude/${name}`);
    claudeEvents.add(expected.nativeEvent);
  }
  assert.deepEqual([...claudeEvents].sort(), ["PostToolUse", "PostToolUseFailure", "PreToolUse", "SessionEnd", "SessionStart", "SubagentStart", "SubagentStop", "UserPromptExpansion"]);
  for (const name of ["unknown_event"]) assert.deepEqual(claudeHookDraft(fixtureCase("claude-hooks.json", name).payload), { kind: "unknown" });
  for (const name of ["missing_event_name", "not_an_object"]) assert.deepEqual(claudeHookDraft(fixtureCase("claude-hooks.json", name).payload), { kind: "invalid" });
  for (const payload of [null, undefined, "x", 1, { hook_event_name: 42 }]) assert.deepEqual(claudeHookDraft(payload), { kind: "invalid" });
  for (const event of ["UserPromptSubmit", "Stop", "PreCompact", "Notification", "toString", "__proto__"])
    assert.deepEqual(claudeHookDraft({ hook_event_name: event, session_id: "s" }), { kind: "unknown" }, event);

  // Codex hooks: os 6 eventos assinados.
  const codexEvents = new Set();
  for (const [name, expected] of Object.entries(CODEX_HOOK_TABLE)) {
    expectEnvelope(codexHookDraft(fixtureCase("codex-hooks.json", name).payload), { ...CODEX, ...expected }, `codex/${name}`);
    codexEvents.add(expected.nativeEvent);
  }
  assert.deepEqual([...codexEvents].sort(), ["PostToolUse", "PreToolUse", "SessionEnd", "SessionStart", "SubagentStart", "SubagentStop"]);
  assert.deepEqual(codexHookDraft(fixtureCase("codex-hooks.json", "unknown_event").payload), { kind: "unknown" });
  assert.deepEqual(codexHookDraft(fixtureCase("codex-hooks.json", "not_an_object").payload), { kind: "invalid" });
  for (const event of ["UserPromptSubmit", "Stop", "PermissionRequest", "PreCompact", "PostCompact", "Interrupt"])
    assert.deepEqual(codexHookDraft({ hook_event_name: event, session_id: "s" }), { kind: "unknown" }, event);

  // exec --json: 8 tipos reconhecidos, 9 tipos de item (reasoning excluído).
  const execTypes = new Set();
  const itemTypes = new Set();
  for (const [name, expected] of Object.entries(EXEC_TABLE)) {
    expectEnvelope(codexExecDraft(fixtureCase("codex-exec.json", name).event), { ...EXEC, ...expected }, `exec/${name}`);
    execTypes.add(expected.nativeEvent);
    if (expected.fields.itemType) itemTypes.add(expected.fields.itemType);
  }
  assert.deepEqual([...execTypes].sort(), ["error", "item.completed", "item.started", "item.updated", "thread.started", "turn.completed", "turn.failed", "turn.started"]);
  assert.deepEqual(codexExecDraft(fixtureCase("codex-exec.json", "item_completed_reasoning").event), { kind: "excluded", reason: "reasoning" });
  itemTypes.add("reasoning");
  assert.deepEqual([...itemTypes].sort(), ["agent_message", "collab_tool_call", "command_execution", "error", "file_change", "mcp_tool_call", "reasoning", "todo_list", "web_search"]);
  assert.deepEqual(codexExecDraft(fixtureCase("codex-exec.json", "unknown_type").event), { kind: "unknown" });
  assert.deepEqual(codexExecDraft(fixtureCase("codex-exec.json", "missing_type").event), { kind: "invalid" });
  for (const event of [null, [], "x", { type: 5 }]) assert.deepEqual(codexExecDraft(event), { kind: "invalid" });
  for (const reasoningPhase of ["item.started", "item.updated"])
    assert.deepEqual(codexExecDraft({ type: reasoningPhase, item: { id: "r", type: "reasoning", text: "SKILLME-CANARY-reasoning" } }), { kind: "excluded", reason: "reasoning" });

  // Saída do processo filho observada pelo wrapper.
  expectEnvelope(processExitDraft({ code: 17, signal: null }), { ...EXEC, eventKind: "process_exit", nativeEvent: "process.exit", ids: {}, fields: { processExitCode: 17 }, gaps: ["processSignal:absent"] }, "exit-17");
  expectEnvelope(processExitDraft({ code: null, signal: "SIGTERM" }), { ...EXEC, eventKind: "process_exit", nativeEvent: "process.exit", ids: {}, fields: { processSignal: "SIGTERM" }, gaps: ["processExitCode:absent"] }, "exit-signal");

  // Hermes: os 7 hooks.
  const hermesHooks = new Set();
  for (const [name, record, expected] of HERMES_TABLE) {
    expectEnvelope(hermesDraft(record), { ...HERMES, ...expected }, `hermes/${name}`);
    hermesHooks.add(expected.nativeEvent);
  }
  assert.deepEqual([...hermesHooks].sort(), ["on_session_end", "on_session_start", "on_skill_lifecycle", "post_tool_call", "pre_tool_call", "subagent_start", "subagent_stop"]);
  for (const record of [{ hook: "pre_llm_call", kwargs: {}, nonScalar: [] }, { hook: "transform_tool_result", kwargs: {}, nonScalar: [] }])
    assert.deepEqual(hermesDraft(record), { kind: "unknown" });
  for (const record of [null, [], { hook: 1 }, { hook: "pre_tool_call" }, { hook: "pre_tool_call", kwargs: [], nonScalar: [] }, { hook: "pre_tool_call", kwargs: {}, nonScalar: "x" }])
    assert.deepEqual(hermesDraft(record), { kind: "invalid" });
  // O adaptador só lê nomes listados: chave extra no registro não chega ao envelope.
  const extra = hermesDraft({ hook: "pre_tool_call", kwargs: { tool_name: "t", args: "SKILLME-CANARY-args" }, nonScalar: [] });
  assert.ok(!JSON.stringify(buildEnvelope(extra.draft).envelope).includes("SKILLME-CANARY"));
});

test("I4-C46 sinal de cada envelope corresponde à origem e nunca é inferência", () => {
  const signals = new Map();
  const record = (label, adapted) => {
    if (adapted.kind !== "draft") return;
    const { envelope } = buildEnvelope(adapted.draft);
    signals.set(label, envelope.signal);
  };
  for (const c of loadFixture("claude-hooks.json").cases) record(`claude/${c.name}`, claudeHookDraft(c.payload));
  for (const c of loadFixture("codex-hooks.json").cases) record(`codex/${c.name}`, codexHookDraft(c.payload));
  for (const c of loadFixture("codex-exec.json").cases.filter((c) => c.event)) record(`exec/${c.name}`, codexExecDraft(c.event));
  record("exec/exit", processExitDraft({ code: 0, signal: null }));
  for (const [name, rec] of HERMES_TABLE) record(`hermes/${name}`, hermesDraft(rec));
  assert.ok(signals.size >= 50, `envelopes avaliados: ${signals.size}`);
  for (const [label, signal] of signals) {
    const expected = label.startsWith("hermes/") ? "native_plugin" : label.startsWith("exec/") ? "supervised_exec" : "native_hook";
    assert.equal(signal, expected, label);
  }
  assert.ok(![...signals.values()].includes("inferred"));
});
