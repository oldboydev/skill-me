import assert from "node:assert/strict";
import { test } from "node:test";
import { correlateTrace } from "../../../src/integrations/correlation/timeline.mjs";
import { buildTrace } from "./helpers/trace-builder.mjs";

// Prova C13 da issue #6: a cobertura mostra o que a timeline NÃO conseguiu
// afirmar, com números exatos e sem percentual de cumprimento.

const LIMITS = { maxEvents: 500, maxBytes: 8388608 };
const ZERO_TOTALS = { inconclusiveEntries: 0, inconclusiveOperations: 0, orphanResult: 0, open: 0, boundaryOnly: 0, duplicates: 0, outOfOrder: 0 };
const CLEAN = [
  { src: "claude", kind: "session_start", ids: { sessionId: "s1" }, fields: { source: "startup" } },
  { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "t1" }, fields: { toolName: "Bash" } },
  { src: "claude", kind: "tool_post", ids: { sessionId: "s1", toolUseId: "t1" }, fields: { toolName: "Bash" } },
];
const coverageOf = (items, options) => correlateTrace(buildTrace(items, options)).coverage;
const partialOf = (items, options) => coverageOf(items, options).partial;

test("T6-C13 coverage: captura sem lacuna, ambiguidade nem operação pendente traz contadores e limites da #8, totais zerados e partial false", () => {
  assert.deepEqual(coverageOf(CLEAN), {
    capture: { counters: { accepted: 3, persisted: 3, malformed: 0, dropped: {}, contentOmitted: {} }, limits: LIMITS },
    eventGaps: [],
    totals: ZERO_TOTALS,
    partial: false,
  });
});

test("T6-C13 coverage: contadores, motivos por sequência e totais exatos de uma captura com lacunas, duplicata, ordem e operações pendentes", () => {
  const gaps = ["promptId:absent", "agentId:absent"];
  const call = { sessionId: "s1", toolUseId: "a" };
  const coverage = coverageOf(
    [
      { src: "claude", kind: "session_start", ids: { sessionId: "s1" }, fields: { source: "startup" }, gaps },
      { src: "claude", kind: "tool_pre", ids: call, fields: { toolName: "Bash" }, gaps: ["agentId:absent"] },
      { src: "claude", kind: "tool_post", ids: { sessionId: "s1", toolUseId: "b" }, fields: { toolName: "Bash" } },
      { src: "claude", kind: "tool_pre", ids: call, fields: { toolName: "Bash" }, gaps: ["agentId:absent"] },
      { src: "codexExec", kind: "turn_start", ids: {} },
      { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "c" }, fields: { toolName: "Read" }, at: 1 },
    ],
    { counters: { malformed: 2, dropped: { capture_event_limit: 3 }, contentOmitted: { content_disabled: 4 } } },
  );
  assert.deepEqual(coverage.capture, {
    counters: { accepted: 6, persisted: 6, malformed: 2, dropped: { capture_event_limit: 3 }, contentOmitted: { content_disabled: 4 } },
    limits: LIMITS,
  });
  assert.deepEqual(coverage.eventGaps, [
    { sequence: 1, gaps: [{ field: "promptId", reason: "absent" }, { field: "agentId", reason: "absent" }] },
    { sequence: 2, gaps: [{ field: "agentId", reason: "absent" }] },
    { sequence: 4, gaps: [{ field: "agentId", reason: "absent" }] },
  ]);
  assert.deepEqual(coverage.totals, { inconclusiveEntries: 1, inconclusiveOperations: 0, orphanResult: 1, open: 2, boundaryOnly: 0, duplicates: 1, outOfOrder: 1 });
  assert.equal(coverage.partial, true);
});

test("T6-C13 coverage: ambiguidade de operação e skill encerrada só por fronteira entram nos totais", () => {
  const coverage = coverageOf([
    { src: "codexExec", kind: "session_start", ids: { threadId: "th1" } },
    { src: "codexExec", kind: "item", native: "item.started", ids: { itemId: "i0" }, fields: { phase: "started", itemType: "command_execution" } },
    { src: "codexExec", kind: "session_start", ids: { threadId: "th2" } },
    { src: "codexExec", kind: "item", native: "item.completed", ids: { itemId: "i0" }, fields: { phase: "completed", itemType: "command_execution" } },
    { src: "claude", kind: "skill_invocation", ids: { sessionId: "s1", toolUseId: "u1" }, fields: { invocationPath: "skill_tool", phase: "pre", skillName: "x" } },
    { src: "claude", kind: "session_end", ids: { sessionId: "s1" }, fields: { reason: "other" } },
  ]);
  assert.deepEqual(coverage.totals, { ...ZERO_TOTALS, inconclusiveEntries: 2, inconclusiveOperations: 1, boundaryOnly: 1 });
  assert.equal(coverage.partial, true);
});

test("T6-C13 coverage: cada causa isolada marca partial, e o que o contrato não lista como perda não marca", () => {
  const partial = (label, items, options) => assert.equal(partialOf(items, options), true, label);
  partial("registro malformado", CLEAN, { counters: { malformed: 1 } });
  partial("registro descartado", CLEAN, { counters: { dropped: { capture_byte_limit: 1 } } });
  partial("lacuna de envelope", [{ ...CLEAN[0], gaps: ["platform:not_in_contract"] }, ...CLEAN.slice(1)]);
  partial("evento inconclusivo", [...CLEAN, { src: "codexExec", kind: "turn_start", ids: {} }]);
  partial("operação aberta", [...CLEAN, { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "t2" }, fields: { toolName: "Bash" } }]);
  partial("operação órfã", [...CLEAN, { src: "claude", kind: "tool_post", ids: { sessionId: "s1", toolUseId: "t3" }, fields: { toolName: "Bash" } }]);

  const notPartial = (label, items, options) => assert.equal(partialOf(items, options), false, label);
  notPartial("conteúdo omitido por política", CLEAN, { counters: { contentOmitted: { content_disabled: 3 } } });
  const call = { sessionId: "s1", toolUseId: "t1" };
  notPartial("duplicata", [...CLEAN, { src: "claude", kind: "tool_pre", ids: call, fields: { toolName: "Bash" } }]);
  notPartial("instante regressivo", [CLEAN[0], { ...CLEAN[1], at: 50 }, { ...CLEAN[2], at: 5 }]);
});

test("T6-C13 coverage: nenhum percentual ou razão de cumprimento é calculado", () => {
  const coverage = coverageOf(CLEAN, { counters: { malformed: 1 } });
  const walk = (value, trail = "") =>
    Object.entries(value).flatMap(([key, child]) => (child !== null && typeof child === "object" ? walk(child, `${trail}${key}.`) : [[`${trail}${key}`, child]]));
  for (const [key, value] of walk(coverage)) {
    // Palavras inteiras (separadas por ponto ou por maiúscula): "Operations" contém "ratio" sem ser uma razão.
    const words = key.replace(/([a-z])([A-Z])/g, "$1.$2").toLowerCase().split(/[.\W_]+/);
    for (const forbidden of ["percent", "percentage", "pct", "ratio", "rate", "score", "compliance", "conformidade", "cumprimento"]) assert.ok(!words.includes(forbidden), key);
    if (typeof value === "number") assert.ok(Number.isInteger(value), `${key} é contagem inteira`);
  }
});
