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

// Achado P1 do Verifier: um agentId só identifica o subagente dentro da sessão
// que o nomeia; o mesmo texto em outra sessão não pareia nem atribui ferramentas.
const agentEvent = (kind, session, extra = {}) => ({ src: "claude", kind, ids: { sessionId: session, agentId: "A", ...extra.ids }, fields: { agentType: "Explore", ...extra.fields } });

test("T6-C10 subagent relations: o mesmo agentId em outra sessão não pareia início e fim nem leva ferramentas para o subagente da primeira", () => {
  const result = correlateTrace(
    buildTrace([
      agentEvent("subagent_start", "s1"),
      { src: "claude", kind: "tool_pre", ids: { sessionId: "s2", toolUseId: "k1", agentId: "A" }, fields: { toolName: "Grep" } },
      { src: "claude", kind: "tool_post", ids: { sessionId: "s2", toolUseId: "k1", agentId: "A" }, fields: { toolName: "Grep" } },
      agentEvent("subagent_stop", "s2"),
    ]),
  );
  const [first, second] = subagents(result);
  assert.equal(subagents(result).length, 2, "nenhuma operação cruza as sessões");
  assert.deepEqual(view(first), ["native", "open", 1, null, [1]]);
  assert.deepEqual(view(second), ["native", "orphan_result", null, 4, [4]]);
  assert.notEqual(first.parentSession, second.parentSession);
  const [tool] = tools(result);
  assert.deepEqual(first.operations, [], "a ferramenta de s2 não vai para o subagente de s1");
  assert.deepEqual(second.operations, [tool.id], "ela fica com o subagente da própria sessão");
});

test("T6-C10 subagent relations: o mesmo agentId em duas sessões completas gera dois subagentes, cada um com as ferramentas da sua sessão", () => {
  const tool = (session, id) => ({ src: "claude", kind: "tool_pre", ids: { sessionId: session, toolUseId: id, agentId: "A" }, fields: { toolName: "Grep" } });
  const result = correlateTrace(
    buildTrace([
      agentEvent("subagent_start", "s1"),
      agentEvent("subagent_start", "s2"),
      tool("s2", "k2"),
      tool("s1", "k1"),
      agentEvent("subagent_stop", "s2"),
      agentEvent("subagent_stop", "s1"),
    ]),
  );
  const [s1, s2] = subagents(result);
  assert.deepEqual([view(s1), view(s2)], [["native", "closed", 1, 6, [1, 6]], ["native", "closed", 2, 5, [2, 5]]]);
  const bySession = Object.fromEntries(tools(result).map((op) => [op.call.split("/").at(-1), op.id]));
  assert.deepEqual([s1.operations, s2.operations], [[bySession.k1], [bySession.k2]]);
});

test("T6-C10 subagent relations: agentId sem ID de sessão não pareia nem é native; o filho do Hermes continua pareado por childSessionId com pai e filho distintos", () => {
  const loose = correlateTrace(
    buildTrace([
      { src: "claude", kind: "subagent_start", ids: { agentId: "A" }, fields: { agentType: "Explore" } },
      { src: "claude", kind: "subagent_stop", ids: { agentId: "A" }, fields: { agentType: "Explore" } },
    ]),
  );
  assert.deepEqual(subagents(loose).map(view), [["inconclusive", "open", 1, null, [1]], ["inconclusive", "orphan_result", null, 2, [2]]]);

  const hermes = correlateTrace(
    buildTrace([
      { src: "hermes", kind: "subagent_start", ids: { parentSessionId: "hs", childSessionId: "hc", subagentId: "A" }, fields: { childRole: "leaf" } },
      { src: "hermes", kind: "tool_pre", ids: { sessionId: "hc", toolCallId: "c1" }, fields: { toolName: "write_file" } },
      { src: "hermes", kind: "subagent_stop", ids: { parentSessionId: "hs", childSessionId: "hc" }, fields: { childRole: "leaf", childStatus: "completed" } },
    ]),
  );
  const [sub] = subagents(hermes);
  assert.equal(subagents(hermes).length, 1);
  assert.deepEqual(view(sub), ["native", "closed", 1, 3, [1, 3]]);
  assert.notEqual(sub.parentSession, sub.childSession, "pai e filho legitimamente diferentes");
  assert.deepEqual(sub.operations, [tools(hermes)[0].id]);
});

// Segundo achado do Verifier (C10): pais explícitos que divergem para o mesmo childSessionId.
const hermesStart = (parent, extra = {}) => ({ src: "hermes", kind: "subagent_start", ids: { ...(parent === null ? {} : { parentSessionId: parent }), childSessionId: "c", subagentId: "A" }, fields: { childRole: "leaf", ...extra.fields } });
const hermesStop = (parent) => ({ src: "hermes", kind: "subagent_stop", ids: { ...(parent === null ? {} : { parentSessionId: parent }), childSessionId: "c" }, fields: { childRole: "leaf", childStatus: "completed" } });
const childTool = { src: "hermes", kind: "tool_pre", ids: { sessionId: "c", toolCallId: "t1" }, fields: { toolName: "write_file" } };

test("T6-C10 subagent relations: pais explícitos diferentes para o mesmo childSessionId não pareiam, e a ferramenta da sessão filha não é atribuída a nenhum dos dois", () => {
  const result = correlateTrace(buildTrace([hermesStart("p1"), childTool, hermesStop("p2")]));
  const [start, stop] = subagents(result);
  assert.equal(subagents(result).length, 2, "a contradição fica visível, não fundida");
  assert.deepEqual(view(start), ["native", "open", 1, null, [1]]);
  assert.deepEqual(view(stop), ["native", "orphan_result", null, 3, [3]]);
  assert.notEqual(start.parentSession, stop.parentSession);
  assert.deepEqual([start.operations, stop.operations], [[], []], "sessão filha com pais em conflito não é atribuída");
  assert.equal(stop.childStatus, "completed");
});

test("T6-C10 subagent relations: o mesmo pai no início e no fim pareia e atribui a sessão filha; sem pai de um lado a ausência não prova divergência", () => {
  const matching = correlateTrace(buildTrace([hermesStart("p1"), childTool, hermesStop("p1")]));
  const [pair] = subagents(matching);
  assert.equal(subagents(matching).length, 1);
  assert.deepEqual(view(pair), ["native", "closed", 1, 3, [1, 3]]);
  assert.deepEqual(pair.operations, [tools(matching)[0].id]);

  const noParentOnStop = subagents(correlateTrace(buildTrace([hermesStart("p1"), hermesStop(null)])));
  assert.deepEqual(noParentOnStop.map(view), [["native", "closed", 1, 2, [1, 2]]]);
  assert.equal(noParentOnStop[0].parentSession !== null, true, "o pai vem do início");
  const noParentOnStart = subagents(correlateTrace(buildTrace([hermesStart(null), hermesStop("p2")])));
  assert.deepEqual(noParentOnStart.map(view), [["native", "closed", 1, 2, [1, 2]]]);
});
