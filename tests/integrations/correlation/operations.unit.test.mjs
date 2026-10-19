import assert from "node:assert/strict";
import { test } from "node:test";
import { correlateTrace } from "../../../src/integrations/correlation/timeline.mjs";
import { buildTrace } from "./helpers/trace-builder.mjs";

// Provas C6 e C7 da issue #6 (.checks/issue-6-correlacao.md): operações de
// ferramenta pareadas por identidade, sem inventar vínculo nem duração.

const tools = (result) => result.operations.filter((op) => op.type === "tool");
const shape = (op) => [op.strength, op.state, op.start, op.updates, op.result, op.evidence];

const pre = (id, extra = {}, src = "claude") => ({ src, kind: "tool_pre", ids: { sessionId: "s1", toolUseId: id, ...extra.ids }, fields: { toolName: extra.toolName ?? "Bash" }, at: extra.at });
const post = (id, extra = {}, src = "claude") => ({ src, kind: "tool_post", ids: { sessionId: "s1", toolUseId: id, ...extra.ids }, fields: { toolName: extra.toolName ?? "Bash", ...extra.fields }, at: extra.at });
const item = (id, phase, itemType, extra = {}) => ({ src: "codexExec", kind: "item", native: `item.${phase}`, ids: { itemId: id }, fields: { phase, itemType, ...extra.fields }, at: extra.at });

test("T6-C6 tool pairing: chamadas paralelas e resultados fora de ordem são pareados por identidade completa, e IDs iguais em outra sessão ou origem não se cruzam", () => {
  const parallel = tools(
    correlateTrace(buildTrace([pre("A"), pre("B", { toolName: "Read" }), post("B", { toolName: "Read" }), post("A")])),
  );
  assert.equal(parallel.length, 2);
  assert.deepEqual(parallel.map((op) => op.id), ["op-1", "op-2"]);
  assert.deepEqual(shape(parallel[0]), ["native", "closed", 1, [], 4, [1, 4]]);
  assert.deepEqual(shape(parallel[1]), ["native", "closed", 2, [], 3, [2, 3]]);
  assert.deepEqual(parallel.map((op) => op.toolName), ["Bash", "Read"]);
  assert.notEqual(parallel[0].call, parallel[1].call);

  const crossed = tools(
    correlateTrace(
      buildTrace([
        pre("x"),
        pre("x", { ids: { sessionId: "s2" } }),
        post("x", { ids: { sessionId: "s2" } }),
        post("x"),
        pre("x", {}, "codexHooks"),
        post("x", { ids: { sessionId: "s9" } }, "codexHooks"),
      ]),
    ),
  );
  assert.deepEqual(crossed.map(shape), [
    ["native", "closed", 1, [], 4, [1, 4]],
    ["native", "closed", 2, [], 3, [2, 3]],
    ["native", "open", 5, [], null, [5]],
    ["native", "orphan_result", null, [], 6, [6]],
  ]);
});

test("T6-C6 tool pairing: resultado sem início é orphan_result, início sem resultado é open, e turno ou subagente conflitantes não pareiam", () => {
  const result = correlateTrace(
    buildTrace([
      post("a"),
      pre("b"),
      pre("c", { ids: { promptId: "p1" } }),
      post("c", { ids: { promptId: "p2" } }),
      pre("d", { ids: { promptId: "p1" } }),
      post("d"),
      pre("e", { ids: { agentId: "ag1" } }),
      post("e", { ids: { agentId: "ag2" } }),
    ]),
  );
  assert.deepEqual(tools(result).map(shape), [
    ["native", "orphan_result", null, [], 1, [1]],
    ["native", "open", 2, [], null, [2]],
    ["native", "open", 3, [], null, [3]],
    ["native", "orphan_result", null, [], 4, [4]],
    ["native", "closed", 5, [], 6, [5, 6]],
    ["native", "open", 7, [], null, [7]],
    ["native", "orphan_result", null, [], 8, [8]],
  ]);
});

test("T6-C6 tool pairing: sem ID de sessão ou de chamada o par não é formado e cada metade é inconclusive", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "claude", kind: "tool_pre", ids: { toolUseId: "z" }, fields: { toolName: "Bash" } },
      { src: "claude", kind: "tool_post", ids: { toolUseId: "z" }, fields: { toolName: "Bash" } },
      { src: "claude", kind: "tool_pre", ids: { sessionId: "s1" }, fields: { toolName: "Bash" } },
    ]),
  );
  assert.deepEqual(tools(result).map(shape), [
    ["inconclusive", "open", 1, [], null, [1]],
    ["inconclusive", "orphan_result", null, [], 2, [2]],
    ["inconclusive", "open", 3, [], null, [3]],
  ]);
});

test("T6-C6 tool pairing: itens do codex exec formam operações heuristic por itemId, com início, atualizações e resultado; itens que não são ferramenta ficam só como entrada", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "codexExec", kind: "session_start", ids: { threadId: "th1" } },
      item("item_0", "started", "command_execution"),
      item("item_1", "started", "mcp_tool_call", { fields: { toolName: "search" } }),
      item("item_0", "updated", "command_execution"),
      item("item_1", "completed", "mcp_tool_call", { fields: { toolName: "search", status: "completed" } }),
      item("item_0", "completed", "command_execution", { fields: { exitCode: 0, status: "completed" } }),
      item("item_2", "completed", "agent_message"),
      item("item_3", "started", "command_execution"),
      item("item_4", "completed", "file_change", { fields: { status: "completed" } }),
    ]),
  );
  const ops = tools(result);
  assert.deepEqual(ops.map(shape), [
    ["heuristic", "closed", 2, [4], 6, [2, 4, 6]],
    ["heuristic", "closed", 3, [], 5, [3, 5]],
    ["heuristic", "open", 8, [], null, [8]],
    ["heuristic", "orphan_result", null, [], 9, [9]],
  ]);
  assert.deepEqual(ops.map((op) => op.itemType), ["command_execution", "mcp_tool_call", "command_execution", "file_change"]);
  assert.equal(ops[1].toolName, "search");
  assert.ok(!result.operations.some((op) => op.evidence.includes(7)), "agent_message não é operação");
});

test("T6-C6 tool pairing: colisão ou ambiguidade de itemId não recebe vínculo forte", () => {
  const twoThreads = correlateTrace(
    buildTrace([
      { src: "codexExec", kind: "session_start", ids: { threadId: "th1" } },
      item("item_0", "started", "command_execution"),
      item("item_0", "completed", "command_execution"),
      { src: "codexExec", kind: "session_start", ids: { threadId: "th2" } },
      item("item_0", "started", "command_execution"),
      item("item_0", "completed", "command_execution"),
    ]),
  );
  const [collided] = tools(twoThreads);
  assert.equal(tools(twoThreads).length, 1);
  assert.deepEqual([collided.strength, collided.state, collided.ambiguity, collided.start, collided.result, collided.evidence], ["inconclusive", "ambiguous", "multiple_sessions", null, null, [2, 3, 5, 6]]);

  const repeated = tools(
    correlateTrace(
      buildTrace([
        { src: "codexExec", kind: "session_start", ids: { threadId: "th1" } },
        item("item_0", "started", "command_execution"),
        item("item_0", "started", "command_execution", { fields: { status: "in_progress" } }),
        item("item_0", "completed", "command_execution"),
        item("item_5", "started", "command_execution"),
        item("item_5", "completed", "command_execution"),
      ]),
    ),
  );
  assert.deepEqual(repeated.map((op) => [op.strength, op.state, op.ambiguity ?? null]), [
    ["inconclusive", "ambiguous", "repeated_phase"],
    ["heuristic", "closed", null],
  ]);
  const misordered = tools(correlateTrace(buildTrace([item("item_0", "completed", "command_execution"), item("item_0", "started", "command_execution")])));
  assert.deepEqual(misordered.map((op) => [op.state, op.ambiguity]), [["ambiguous", "phase_order"]]);
});

test("T6-C7 tool outcome and duration: resultado, erro e duração nativos aparecem como observados; a duração nativa prevalece sobre o intervalo", () => {
  const [op] = tools(
    correlateTrace(
      buildTrace([
        { src: "hermes", kind: "tool_pre", ids: { sessionId: "hs", toolCallId: "c1" }, fields: { toolName: "echo" }, at: 10 },
        { src: "hermes", kind: "tool_post", ids: { sessionId: "hs", toolCallId: "c1" }, fields: { toolName: "echo", outcome: "failure", errorType: "ValueError", durationMs: 3 }, at: 12 },
      ]),
    ),
  );
  assert.deepEqual(
    [op.toolName, op.outcome, op.errorType, op.exitCode, op.durationMs, op.elapsedMs, op.durationEvidence],
    ["echo", "failure", "ValueError", null, 3, null, "native"],
  );
  const [zero] = tools(correlateTrace(buildTrace([pre("z", { at: 10 }), post("z", { at: 15, fields: { durationMs: 0 } })])));
  assert.deepEqual([zero.durationMs, zero.elapsedMs, zero.durationEvidence], [0, null, "native"], "zero nativo é observado");
});

test("T6-C7 tool outcome and duration: intervalo válido sem duração nativa é derived; exitCode do item é preservado, inclusive 0", () => {
  const [hook] = tools(
    correlateTrace(
      buildTrace([
        { ...pre("a", { at: 20 }, "codexHooks") },
        { ...post("a", { at: 21 }, "codexHooks") },
      ]),
    ),
  );
  assert.deepEqual(
    [hook.outcome, hook.errorType, hook.exitCode, hook.durationMs, hook.elapsedMs, hook.durationEvidence],
    [null, null, null, null, 1000, "derived"],
    "o que o contrato não traz fica null",
  );
  const [command] = tools(
    correlateTrace(buildTrace([item("item_0", "started", "command_execution", { at: 10 }), item("item_0", "completed", "command_execution", { at: 12.5, fields: { exitCode: 0, status: "completed" } })])),
  );
  assert.strictEqual(command.exitCode, 0);
  assert.deepEqual([command.durationMs, command.elapsedMs, command.durationEvidence], [null, 2500, "derived"]);
  const [equal] = tools(correlateTrace(buildTrace([pre("e", { at: 7 }), post("e", { at: 7 })])));
  assert.deepEqual([equal.elapsedMs, equal.durationEvidence], [0, "derived"], "instantes iguais estão em ordem");
});

test("T6-C7 tool outcome and duration: resultado anterior ao início, operação aberta ou órfã não têm duração calculada", () => {
  const result = correlateTrace(buildTrace([pre("r", { at: 20 }), post("r", { at: 10 }), pre("o", { at: 30 }), post("p", { at: 40 })]));
  const [reversed, open, orphan] = tools(result);
  assert.equal(reversed.state, "closed");
  for (const op of [reversed, open, orphan]) assert.deepEqual([op.durationMs, op.elapsedMs, op.durationEvidence], [null, null, null], op.state);
  assert.deepEqual([open.state, orphan.state], ["open", "orphan_result"]);
});

// Achado 1 da revisão formal (C6/C7): duas sessões do exec com itemId distintos não são colisão.
test("T6-C6 tool pairing: duas sessões do exec com itemId distintos formam operações heuristic separadas, com resultado, exitCode e duração visíveis e sem sessão native", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "codexExec", kind: "session_start", ids: { threadId: "th1" } },
      item("item_a", "started", "command_execution", { at: 10 }),
      item("item_a", "completed", "command_execution", { at: 12.5, fields: { exitCode: 3, status: "failed" } }),
      { src: "codexExec", kind: "session_start", ids: { threadId: "th2" } },
      item("item_b", "started", "mcp_tool_call", { at: 20, fields: { toolName: "search" } }),
      item("item_b", "completed", "mcp_tool_call", { at: 21, fields: { toolName: "search", status: "completed" } }),
    ]),
  );
  const [a, b] = tools(result);
  assert.equal(tools(result).length, 2);
  assert.deepEqual(shape(a), ["heuristic", "closed", 2, [], 3, [2, 3]]);
  assert.deepEqual(shape(b), ["heuristic", "closed", 5, [], 6, [5, 6]]);
  assert.equal(a.ambiguity ?? null, null);
  assert.deepEqual([a.exitCode, a.status, a.elapsedMs, a.durationEvidence], [3, "failed", 2500, "derived"]);
  assert.deepEqual([b.exitCode, b.toolName, b.elapsedMs, b.durationEvidence], [null, "search", 1000, "derived"]);
  assert.notEqual(a.call, b.call);
  for (const op of [a, b]) assert.deepEqual([op.session, op.strength === "native"], [null, false], "sem atribuição de sessão native");
  for (const entry of result.entries.filter((e) => e.eventKind === "item")) assert.notEqual(entry.session.strength, "native");
});

test("T6-C6 tool pairing: itemId reutilizado entre duas sessões do exec continua ambiguous, e fase ou tipo conflitantes também", () => {
  const reused = tools(
    correlateTrace(
      buildTrace([
        { src: "codexExec", kind: "session_start", ids: { threadId: "th1" } },
        item("item_0", "started", "command_execution"),
        item("item_0", "completed", "command_execution", { fields: { exitCode: 0 } }),
        { src: "codexExec", kind: "session_start", ids: { threadId: "th2" } },
        item("item_0", "started", "command_execution"),
        item("item_0", "completed", "command_execution", { fields: { exitCode: 1 } }),
        item("item_z", "started", "command_execution"),
        item("item_z", "completed", "command_execution"),
      ]),
    ),
  );
  assert.deepEqual(reused.map((op) => [op.state, op.ambiguity ?? null, op.exitCode]), [["ambiguous", "multiple_sessions", null], ["closed", null, null]]);
  const mixed = tools(correlateTrace(buildTrace([
    { src: "codexExec", kind: "session_start", ids: { threadId: "th1" } },
    { src: "codexExec", kind: "session_start", ids: { threadId: "th2" } },
    item("item_0", "started", "command_execution"),
    item("item_0", "completed", "file_change"),
  ])));
  assert.deepEqual(mixed.map((op) => [op.state, op.ambiguity]), [["ambiguous", "mixed_item_type"]]);
});

// Achado da revisão: a abertura de uma sessão dentro da vida de um item não prova reuso do itemId.
test("T6-C6 tool pairing: itens de itemId distintos com vidas sobrepostas e session_start no meio continuam heuristic closed, com campos e evidência, sem sessão native", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "codexExec", kind: "session_start", ids: { threadId: "th1" } },
      item("item_a", "started", "command_execution", { at: 10 }),
      { src: "codexExec", kind: "session_start", ids: { threadId: "th2" } },
      item("item_b", "started", "command_execution", { at: 12 }),
      item("item_a", "completed", "command_execution", { at: 14, fields: { exitCode: 3, status: "failed" } }),
      item("item_b", "completed", "command_execution", { at: 13, fields: { exitCode: 0, status: "completed" } }),
    ]),
  );
  const [a, b] = tools(result);
  assert.equal(tools(result).length, 2);
  assert.deepEqual(shape(a), ["heuristic", "closed", 2, [], 5, [2, 5]]);
  assert.deepEqual(shape(b), ["heuristic", "closed", 4, [], 6, [4, 6]]);
  assert.deepEqual([a.ambiguity ?? null, b.ambiguity ?? null], [null, null]);
  assert.deepEqual([a.exitCode, a.status, a.elapsedMs, a.durationEvidence], [3, "failed", 4000, "derived"]);
  assert.strictEqual(b.exitCode, 0);
  assert.deepEqual([b.status, b.elapsedMs, b.durationEvidence], ["completed", 1000, "derived"], "resultado anterior ao outro não altera a conta");
  for (const op of [a, b]) assert.deepEqual([op.session, op.strength === "native"], [null, false]);
  for (const entry of result.entries.filter((e) => e.eventKind === "item")) assert.notEqual(entry.session.strength, "native");
});

test("T6-C6 tool pairing: um único início e um único fim do mesmo itemId em torno de um session_start não provam colisão — heuristic, nunca native; a repetição de fase continua ambígua", () => {
  const straddle = tools(
    correlateTrace(
      buildTrace([
        { src: "codexExec", kind: "session_start", ids: { threadId: "th1" } },
        item("item_0", "started", "command_execution"),
        { src: "codexExec", kind: "session_start", ids: { threadId: "th2" } },
        item("item_0", "completed", "command_execution", { fields: { exitCode: 0 } }),
      ]),
    ),
  );
  assert.deepEqual(straddle.map((op) => [op.strength, op.state, op.ambiguity ?? null, op.exitCode, op.session]), [["heuristic", "closed", null, 0, null]]);

  const twoSessions = tools(
    correlateTrace(
      buildTrace([
        { src: "codexExec", kind: "session_start", ids: { threadId: "th1" } },
        item("item_0", "started", "command_execution"),
        { src: "codexExec", kind: "session_start", ids: { threadId: "th2" } },
        item("item_0", "started", "command_execution"),
      ]),
    ),
  );
  assert.deepEqual(twoSessions.map((op) => [op.strength, op.state, op.ambiguity]), [["inconclusive", "ambiguous", "multiple_sessions"]]);
  const oneSession = tools(correlateTrace(buildTrace([{ src: "codexExec", kind: "session_start", ids: { threadId: "th1" } }, item("item_0", "completed", "command_execution"), item("item_0", "completed", "command_execution")])));
  assert.deepEqual(oneSession.map((op) => [op.state, op.ambiguity]), [["ambiguous", "repeated_phase"]]);
});

// Achado 1 da revisão formal 2: item do exec sem item.id não pode sumir nem ser pareado.
const idless = (phase, itemType, extra = {}) => ({ src: "codexExec", kind: "item", native: `item.${phase}`, ids: {}, fields: { phase, itemType, ...extra.fields }, gaps: ["itemId:absent"], at: extra.at });

test("T6-C6 tool pairing: item.completed do exec sem itemId vira operação inconclusive orphan_result com os campos observados, sem chamada inventada, e entra na cobertura", () => {
  const result = correlateTrace(buildTrace([idless("completed", "command_execution", { fields: { status: "failed", exitCode: 7 } })]));
  assert.equal(result.entries.length, 1);
  const [op] = result.operations;
  assert.equal(result.operations.length, 1, "a observação não é descartada");
  assert.deepEqual([op.type, op.strength, op.state, op.call, op.session, op.subagent], ["tool", "inconclusive", "orphan_result", null, null, null]);
  assert.deepEqual([op.start, op.updates, op.result, op.evidence, op.itemType, op.status], [null, [], 1, [1], "command_execution", "failed"]);
  assert.strictEqual(op.exitCode, 7);
  assert.deepEqual([op.durationMs, op.elapsedMs, op.durationEvidence], [null, null, null]);
  assert.deepEqual([result.coverage.totals.orphanResult, result.coverage.totals.inconclusiveOperations, result.coverage.partial], [1, 1, true]);
});

test("T6-C6 tool pairing: itens do exec sem itemId nunca pareiam entre si nem com itens identificados, e item que não é ferramenta continua só como entrada", () => {
  const result = correlateTrace(
    buildTrace([
      idless("started", "command_execution", { fields: { toolName: "bash" } }),
      item("item_0", "started", "command_execution"),
      idless("updated", "mcp_tool_call", { fields: { toolName: "search" } }),
      item("item_0", "completed", "command_execution", { fields: { exitCode: 0 } }),
      idless("completed", "command_execution", { fields: { exitCode: 1 } }),
      idless("completed", "agent_message"),
      idless("completed", "command_execution", { fields: { exitCode: 2 } }),
    ]),
  );
  assert.deepEqual(tools(result).map(shape), [
    ["inconclusive", "open", 1, [], null, [1]],
    ["heuristic", "closed", 2, [], 4, [2, 4]],
    ["inconclusive", "open", null, [3], null, [3]],
    ["inconclusive", "orphan_result", null, [], 5, [5]],
    ["inconclusive", "orphan_result", null, [], 7, [7]],
  ]);
  assert.deepEqual(tools(result).map((op) => op.call === null), [true, false, true, true, true]);
  assert.deepEqual(tools(result).map((op) => op.exitCode), [null, 0, null, 1, 2], "cada exitCode fica na sua operação");
  assert.ok(!result.operations.some((op) => op.evidence.includes(6)), "agent_message sem id não é operação");
  assert.deepEqual([result.coverage.totals.orphanResult, result.coverage.totals.open], [2, 2]);
});
