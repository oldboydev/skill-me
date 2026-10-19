import assert from "node:assert/strict";
import { test } from "node:test";
import { correlateTrace } from "../../../src/integrations/correlation/timeline.mjs";
import { buildTrace } from "./helpers/trace-builder.mjs";

// Prova C10 da issue #6: subagente só se liga a pai e filho por IDs
// explícitos; papel ou tipo iguais não unem nada nem atribuem ferramentas.

const subagents = (result) => result.operations.filter((op) => op.type === "subagent");
const tools = (result) => result.operations.filter((op) => op.type === "tool");
const view = (op) => [op.strength, op.state, op.start, op.result, op.evidence];

test("T6-C10 subagent relations: Claude com agentId liga início, fim e as ferramentas do próprio subagente, sem atribuir as do pai", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "claude", kind: "subagent_start", ids: { sessionId: "s1", agentId: "A" }, fields: { agentType: "Explore" } },
      { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "k1", agentId: "A" }, fields: { toolName: "Grep" } },
      { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "k2" }, fields: { toolName: "Bash" } },
      { src: "claude", kind: "tool_post", ids: { sessionId: "s1", toolUseId: "k1", agentId: "A" }, fields: { toolName: "Grep" } },
      { src: "claude", kind: "tool_post", ids: { sessionId: "s1", toolUseId: "k2" }, fields: { toolName: "Bash" } },
      { src: "claude", kind: "subagent_stop", ids: { sessionId: "s1", agentId: "A" }, fields: { agentType: "Explore" } },
    ]),
  );
  const [sub] = subagents(result);
  assert.equal(subagents(result).length, 1);
  assert.deepEqual(view(sub), ["native", "closed", 1, 6, [1, 6]]);
  assert.equal(sub.agentType, "Explore");
  const [child, parent] = tools(result);
  assert.deepEqual([child.toolName, parent.toolName], ["Grep", "Bash"]);
  assert.deepEqual(sub.operations, [child.id], "só a ferramenta com o agentId do subagente");
  assert.equal(child.subagent, sub.subagent);
  assert.equal(parent.subagent, null);
  assert.equal(sub.parentSession, child.session, "o pai é a sessão que o evento nomeia");
});

test("T6-C10 subagent relations: Hermes com parent e child explícitos preserva a relação, e as ferramentas da sessão filha não vão para o pai", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "hermes", kind: "subagent_start", ids: { parentSessionId: "hs", parentTurnId: "ht", childSessionId: "hc", subagentId: "sub1" }, fields: { childRole: "leaf" } },
      { src: "hermes", kind: "tool_pre", ids: { sessionId: "hs", toolCallId: "p1" }, fields: { toolName: "echo" } },
      { src: "hermes", kind: "tool_pre", ids: { sessionId: "hc", toolCallId: "c1" }, fields: { toolName: "write_file" } },
      { src: "hermes", kind: "tool_post", ids: { sessionId: "hc", toolCallId: "c1" }, fields: { toolName: "write_file" } },
      { src: "hermes", kind: "subagent_stop", ids: { parentSessionId: "hs", parentTurnId: "ht", childSessionId: "hc" }, fields: { childRole: "leaf", childStatus: "completed", durationMs: 50 } },
      { src: "hermes", kind: "tool_post", ids: { sessionId: "hs", toolCallId: "p1" }, fields: { toolName: "echo" } },
    ]),
  );
  const [sub] = subagents(result);
  assert.equal(subagents(result).length, 1);
  assert.deepEqual(view(sub), ["native", "closed", 1, 5, [1, 5]], "start e stop se ligam por childSessionId");
  assert.deepEqual([sub.childRole, sub.childStatus, sub.durationMs], ["leaf", "completed", 50]);
  const [parentTool, childTool] = tools(result);
  assert.equal(parentTool.toolName, "echo");
  assert.equal(sub.parentSession, parentTool.session, "pai = parentSessionId");
  assert.equal(sub.childSession, childTool.session, "filho = childSessionId");
  assert.notEqual(sub.parentSession, sub.childSession);
  assert.deepEqual(sub.operations, [childTool.id]);
});

test("T6-C10 subagent relations: agentType ou childRole iguais, sem ID, não unem subagentes nem atribuem ferramentas", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "hermes", kind: "subagent_start", ids: {}, fields: { childRole: "leaf" } },
      { src: "hermes", kind: "subagent_start", ids: {}, fields: { childRole: "leaf" } },
      { src: "hermes", kind: "subagent_stop", ids: {}, fields: { childRole: "leaf", childStatus: "completed" } },
      { src: "claude", kind: "subagent_start", ids: { sessionId: "s1", agentId: "A" }, fields: { agentType: "Explore" } },
      { src: "claude", kind: "subagent_start", ids: { sessionId: "s1", agentId: "B" }, fields: { agentType: "Explore" } },
      { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "k1" }, fields: { toolName: "Grep" } },
      { src: "claude", kind: "subagent_stop", ids: { sessionId: "s1", agentId: "B" }, fields: { agentType: "Explore" } },
    ]),
  );
  assert.deepEqual(subagents(result).map(view), [
    ["inconclusive", "open", 1, null, [1]],
    ["inconclusive", "open", 2, null, [2]],
    ["inconclusive", "orphan_result", null, 3, [3]],
    ["native", "open", 4, null, [4]],
    ["native", "closed", 5, 7, [5, 7]],
  ]);
  assert.deepEqual(subagents(result).map((op) => op.operations), [[], [], [], [], []], "nenhuma ferramenta atribuída");
  assert.equal(tools(result)[0].subagent, null);
});

test("T6-C10 subagent relations: o mesmo texto de agentId em outra origem não pareia início e fim", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "claude", kind: "subagent_start", ids: { sessionId: "s1", agentId: "X" }, fields: { agentType: "Explore" } },
      { src: "codexHooks", kind: "subagent_stop", ids: { sessionId: "s1", agentId: "X" }, fields: { agentType: "worker" } },
    ]),
  );
  assert.deepEqual(subagents(result).map(view), [
    ["native", "open", 1, null, [1]],
    ["native", "orphan_result", null, 2, [2]],
  ]);
});
