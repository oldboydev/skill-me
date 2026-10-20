import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateReport } from "../../../src/integrations/report/evaluate.mjs";
import { parseInstructions } from "../../../src/integrations/report/instructions.mjs";
import { renderReport } from "../../../src/integrations/report/render.mjs";
import { buildTrace } from "../correlation/helpers/trace-builder.mjs";

test("T7-C7 texto e Markdown citam eventos e skill, versões e limites, sem percentual nem raciocínio privado", () => {
  const trace = buildTrace([{ src: "claude", kind: "session_start", ids: { sessionId: "s1" }, fields: { platform: "win32" } }]);
  const skill = { name: "demo", observedName: "demo", identification: "explicit_path", nameMatchesObservation: true, sha256: "b".repeat(64), instructions: parseInstructions("# Fluxo\n- Run `npm test`.\n") };
  const report = evaluateReport({ trace, skill });
  for (const format of ["text", "markdown"]) {
    const output = renderReport(report, format);
    for (const part of ["sha256:", "SKILL.md:2", "evento #1", "claude-code-hooks@", "Timeline", "Avaliação das instruções", "Limitações", "Ausência de evento não prova omissão"]) assert.ok(output.includes(part), `${format}: ${part}`);
    assert.ok(!output.includes("%"));
    assert.ok(!output.toLowerCase().includes("raciocínio privado"));
  }
  const json = JSON.parse(renderReport(report, "json"));
  assert.equal(json.reportVersion, 1);
  assert.equal(json.environment[0].contract, trace.records[0].record.envelope.source.contract);
  assert.deepEqual(json.evaluations[0].sources.skill, { sha256: skill.sha256, line: 2 });
});

test("T7-C7 erro, correção e lacuna aparecem na explicação com fontes observadas", () => {
  const command = { fields: [{ field: "tool_input.command", role: "args", kind: "text", value: "npm test" }] };
  const trace = buildTrace([
    { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "a" }, fields: { toolName: "Bash" }, content: command },
    { src: "claude", kind: "tool_post", ids: { sessionId: "s1", toolUseId: "a" }, fields: { toolName: "Bash", outcome: "failure", errorType: "command_error" } },
    { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "b" }, fields: { toolName: "Bash" }, content: command },
    { src: "claude", kind: "tool_post", ids: { sessionId: "s1", toolUseId: "b" }, fields: { toolName: "Bash", outcome: "success" }, gaps: ["durationMs:absent"] },
  ]);
  const skill = { name: "demo", observedName: "demo", identification: "explicit_path", nameMatchesObservation: true, sha256: "c".repeat(64), instructions: parseInstructions("- Run `npm test`.\n") };
  const output = renderReport(evaluateReport({ trace, skill }), "text");
  for (const part of ["Operações e erros", "failure", "erro command_error", "Correção observada: evento #1, evento #2 → evento #3, evento #4", "Cobertura parcial: true"]) assert.ok(output.includes(part), part);
});

test("T7-C7 nome observado cita evento e marca vínculo heurístico", () => {
  const trace = buildTrace([{ src: "claude", kind: "skill_invocation", ids: { sessionId: "s1", promptId: "p1" }, fields: { invocationPath: "direct_command", phase: "expansion", skillName: "demo" } }]);
  const skill = { name: "demo", observedName: "demo", identification: "observed_name", nameMatchesObservation: true, observedSources: [{ events: [1], strength: "heuristic" }], sha256: "d".repeat(64), instructions: [] };
  const report = evaluateReport({ trace, skill });
  assert.deepEqual(report.skill.observedSources, [{ events: [1], strength: "heuristic" }]);
  for (const format of ["text", "markdown"]) {
    const output = renderReport(report, format);
    assert.match(output, /nome observado.*evento #1.*hipótese/);
  }
});

test("T7-C7 operação Codex exibe exitCode negativo e captura sem conteúdo explica a lacuna", () => {
  const trace = buildTrace([
    { src: "codexExec", kind: "item", native: "item.started", ids: { itemId: "it1" }, fields: { phase: "started", itemType: "command_execution" } },
    { src: "codexExec", kind: "item", native: "item.completed", ids: { itemId: "it1" }, fields: { phase: "completed", itemType: "command_execution", status: "completed", exitCode: 1 } },
  ]);
  const skill = { name: "demo", observedName: null, identification: "explicit_path", nameMatchesObservation: null, sha256: "e".repeat(64), instructions: [] };
  const report = evaluateReport({ trace, skill });
  assert.ok(report.limitations.some((item) => item.source === "timeline.capture.content"));
  for (const format of ["text", "markdown"]) {
    const output = renderReport(report, format);
    assert.match(output, /completed.*exit 1.*evento #1.*evento #2/);
    assert.match(output, /conteúdo.*argumentos.*não.*coletado/i);
  }
});

test("T7-C7 conteúdo habilitado mas argumento omitido pela política é limitação citada", () => {
  const trace = buildTrace([{ src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "a" }, fields: { toolName: "Bash" } }]);
  trace.capture.content = true;
  trace.records[0].record.privacy = ["tool_input.command:unsanitizable"];
  const skill = { name: "demo", observedName: null, identification: "explicit_path", nameMatchesObservation: null, sha256: "f".repeat(64), instructions: parseInstructions("- Run `npm test`.\n") };
  const report = evaluateReport({ trace, skill });
  assert.equal(report.evaluations[0].status, "unobserved");
  assert.ok(report.limitations.some((item) => item.source.includes("evento #1") && item.source.includes("tool_input.command:unsanitizable")));
  for (const format of ["text", "markdown"]) assert.match(renderReport(report, format), /política.*omitiu.*argumento.*evento #1/i);
});

test("T7-C7 argumento truncado pela política limita comparação e cita evento", () => {
  const trace = buildTrace([{ src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "a" }, fields: { toolName: "Bash" }, content: { fields: [{ field: "tool_input.command", role: "args", kind: "text", value: "npm" }] } }]);
  trace.capture.content = true;
  trace.records[0].record.privacy = ["tool_input.command:content_truncated"];
  const skill = { name: "demo", observedName: null, identification: "explicit_path", nameMatchesObservation: null, sha256: "f".repeat(64), instructions: parseInstructions("- Run `npm test`.\n") };
  const report = evaluateReport({ trace, skill });
  assert.equal(report.evaluations[0].status, "unobserved");
  assert.ok(report.limitations.some((item) => item.source.includes("evento #1") && item.source.includes("tool_input.command:content_truncated")));
  for (const format of ["text", "markdown"]) assert.match(renderReport(report, format), /argumento.*truncado.*evento #1/i);
});
