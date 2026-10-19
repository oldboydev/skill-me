import assert from "node:assert/strict";
import { test } from "node:test";
import { correlateTrace } from "../../../src/integrations/correlation/timeline.mjs";
import { buildTrace } from "./helpers/trace-builder.mjs";

// Provas C8, C9 e C11 da issue #6: a skill só é "usada" quando o agente emite
// um evento nativo de invocação; nenhum fim de escopo conclui instruções.

const invocations = (result) => result.operations.filter((op) => op.type === "skill_invocation");
const evidence = (result) => result.operations.filter((op) => op.type === "skill_evidence");

const skill = (phase, id, extra = {}) => ({
  src: "claude",
  kind: "skill_invocation",
  native: phase === "pre" ? "PreToolUse" : "PostToolUse",
  ids: { sessionId: "s1", toolUseId: id, ...extra.ids },
  fields: { invocationPath: "skill_tool", phase, skillName: extra.skillName ?? "third-party-skill", ...extra.fields },
});
const view = (op) => [op.strength, op.state, op.skillName, op.start, op.result, op.evidence];

test("T6-C8 native skill invocation: pre e post com toolUseId formam invocação native da skill nomeada, com open e orphan_result nas metades ausentes", () => {
  const result = correlateTrace(
    buildTrace([
      skill("pre", "u1"),
      skill("pre", "u2", { skillName: "outra-skill" }),
      skill("post", "u2", { skillName: "outra-skill", fields: { outcome: "success" } }),
      skill("post", "u1", { fields: { outcome: "failure" } }),
      skill("pre", "u3"),
      skill("post", "u4", { skillName: "orfa" }),
    ]),
  );
  assert.deepEqual(invocations(result).map(view), [
    ["native", "closed", "third-party-skill", 1, 4, [1, 4]],
    ["native", "closed", "outra-skill", 2, 3, [2, 3]],
    ["native", "open", "third-party-skill", 5, null, [5]],
    ["native", "orphan_result", "orfa", null, 6, [6]],
  ]);
  assert.deepEqual(invocations(result).slice(0, 2).map((op) => op.outcome), ["failure", "success"]);
  assert.equal(result.operations.filter((op) => op.type === "tool").length, 0, "a ferramenta Skill não vira operação de ferramenta comum");
});

test("T6-C8 native skill invocation: o post encerra a invocação da ferramenta e não afirma conclusão das instruções; ID de outra sessão não pareia", () => {
  const result = correlateTrace(buildTrace([skill("pre", "u1"), skill("post", "u1", { fields: { outcome: "success" } }), skill("pre", "u9"), skill("post", "u9", { ids: { sessionId: "s2" } })]));
  const [closed, open, orphan] = invocations(result);
  assert.equal(closed.state, "closed");
  assert.equal(closed.instructionCompletion, "unobserved");
  assert.deepEqual([open.state, orphan.state], ["open", "orphan_result"], "mesmo toolUseId em sessão distinta");
  const text = JSON.stringify(result);
  for (const forbidden of ["skill_completed", "completed_skill"]) assert.ok(!text.includes(forbidden), forbidden);
  assert.ok(invocations(result).every((op) => !["completed", "finished", "done"].includes(op.state)));
});

test("T6-C9 skill evidence: expansão direta e ciclo de vida do Hermes são evidência heuristic com nome, nunca invocação native", () => {
  const lifecycle = (action, id) => ({ src: "hermes", kind: "skill_lifecycle", native: "on_skill_lifecycle", ids: { sessionId: "hs", taskId: id }, fields: { action, skillName: "third-party-skill", provenance: "local" } });
  const result = correlateTrace(
    buildTrace([
      { src: "claude", kind: "skill_invocation", native: "UserPromptExpansion", ids: { sessionId: "s1", promptId: "p1" }, fields: { invocationPath: "direct_command", phase: "expansion", skillName: "third-party-skill", commandSource: "project" } },
      lifecycle("loaded", "t1"),
      lifecycle("patched", "t2"),
      lifecycle("edited", "t3"),
    ]),
  );
  assert.equal(invocations(result).length, 0);
  const found = evidence(result);
  assert.deepEqual(found.map((op) => [op.basis, op.strength, op.skillName, op.action, op.state, op.evidence]), [
    ["expansion", "heuristic", "third-party-skill", null, "observed", [1]],
    ["lifecycle", "heuristic", "third-party-skill", "loaded", "observed", [2]],
    ["lifecycle", "heuristic", "third-party-skill", "patched", "observed", [3]],
    ["lifecycle", "heuristic", "third-party-skill", "edited", "observed", [4]],
  ]);
  assert.equal(found[0].commandSource, "project");
  assert.ok(result.operations.every((op) => op.strength !== "native"));
});

test("T6-C9 skill evidence: ler SKILL.md em uma ferramenta do Codex não cria skill nem lê o conteúdo coletado", () => {
  const read = { text: "cat /home/fixture/.codex/skills/third-party-skill/SKILL.md" };
  const result = correlateTrace(
    buildTrace([
      { src: "codexHooks", kind: "tool_pre", ids: { sessionId: "cx", toolUseId: "k1" }, fields: { toolName: "Bash" }, content: { args: read } },
      { src: "codexHooks", kind: "tool_post", ids: { sessionId: "cx", toolUseId: "k1" }, fields: { toolName: "Bash" }, content: { result: read } },
      { src: "codexExec", kind: "item", native: "item.completed", ids: { itemId: "item_0" }, fields: { phase: "completed", itemType: "command_execution" }, content: { args: read } },
    ]),
  );
  assert.deepEqual(result.operations.map((op) => op.type).sort(), ["tool", "tool"]);
  const text = JSON.stringify(result);
  for (const leaked of ["SKILL.md", "third-party-skill", "cat /home"]) assert.ok(!text.includes(leaked), leaked);
  assert.equal(invocations(result).length + evidence(result).length, 0);
});

const base = [skill("pre", "uA", { ids: { promptId: "p1" } }), skill("pre", "uB", { ids: { promptId: "p2" } }), { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "tT" }, fields: { toolName: "Bash" } }];

test("T6-C11 scope boundaries: fim de outro escopo, process_exit e turn_end alheios deixam a skill open e nenhum evento produz skill_completed", () => {
  const result = correlateTrace(
    buildTrace([
      ...base,
      { src: "codexExec", kind: "process_exit", fields: { processExitCode: 0 } },
      { src: "claude", kind: "session_end", ids: { sessionId: "s2" }, fields: { reason: "other" } },
      { src: "hermes", kind: "turn_end", ids: { sessionId: "hs", turnId: "t9" }, fields: { completed: true } },
      { src: "claude", kind: "turn_end", ids: { sessionId: "s1", promptId: "p9" }, fields: { completed: true } },
    ]),
  );
  assert.deepEqual(invocations(result).map((op) => [op.state, op.boundary]), [["open", null], ["open", null]]);
  assert.ok(!JSON.stringify(result).includes("skill_completed"));
});

test("T6-C11 scope boundaries: session_end, turn_end e subagent_stop do próprio escopo marcam boundary_only, nunca conclusão, e não fecham ferramenta aberta nem skill já encerrada", () => {
  // O adaptador do Claude não emite turn_end; o registro sintético exercita a regra pura.
  const result = correlateTrace(
    buildTrace([
      ...base,
      skill("pre", "uC"),
      skill("post", "uC"),
      skill("pre", "uD", { ids: { agentId: "ag1" } }),
      { src: "claude", kind: "subagent_stop", ids: { sessionId: "s1", agentId: "ag2" }, fields: { agentType: "Explore" } },
      { src: "claude", kind: "turn_end", ids: { sessionId: "s1", promptId: "p1" }, fields: { completed: true } },
      { src: "claude", kind: "subagent_stop", ids: { sessionId: "s1", agentId: "ag1" }, fields: { agentType: "Explore" } },
      { src: "claude", kind: "session_end", ids: { sessionId: "s1" }, fields: { reason: "prompt_input_exit" } },
    ]),
  );
  const states = invocations(result).map((op) => [op.skillName, op.state, op.boundary]);
  assert.deepEqual(states, [
    ["third-party-skill", "boundary_only", 8], // uA: turn_end do mesmo turno (p1)
    ["third-party-skill", "boundary_only", 10], // uB: turno p2 sem fim próprio; session_end da sessão
    ["third-party-skill", "closed", null], // uC: já tem post
    ["third-party-skill", "boundary_only", 9], // uD: subagent_stop do ag1 (o do ag2 não conta)
  ]);
  const tool = result.operations.find((op) => op.type === "tool");
  assert.equal(tool.state, "open", "a ferramenta aberta continua aberta");
  assert.ok(!JSON.stringify(result).includes("skill_completed"));
});
