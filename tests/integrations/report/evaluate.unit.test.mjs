import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateReport } from "../../../src/integrations/report/evaluate.mjs";
import { parseInstructions } from "../../../src/integrations/report/instructions.mjs";
import { buildTrace } from "../correlation/helpers/trace-builder.mjs";

const commandContent = (command) => ({ fields: [{ field: "tool_input.command", role: "args", kind: "text", value: command }] });
const pre = (id, command) => ({ src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: id }, fields: { toolName: "Bash" }, content: commandContent(command) });
const post = (id, outcome) => ({ src: "claude", kind: "tool_post", ids: { sessionId: "s1", toolUseId: id }, fields: { toolName: "Bash", outcome } });
const skill = (source) => ({ name: "demo", observedName: "demo", identification: "explicit_path", nameMatchesObservation: true, sha256: "a".repeat(64), instructions: parseInstructions(source) });
const states = (report) => report.evaluations.map((item) => item.status);

test("T7-C4 seis estados fechados, justificativa, linha/hash e sequência; orientação não é etapa executável", () => {
  const trace = buildTrace([
    pre("ok", "npm test"), post("ok", "success"),
    pre("bad", "npm run bad"), post("bad", "failure"),
    pre("open", "npm run open"),
    { src: "codexExec", kind: "item", native: "item.started", ids: { itemId: "it1" }, fields: { phase: "started", itemType: "command_execution" }, content: { fields: [{ field: "item.command", role: "args", kind: "text", value: "npm run maybe" }] } },
    { src: "codexExec", kind: "item", native: "item.completed", ids: { itemId: "it1" }, fields: { phase: "completed", itemType: "command_execution", status: "completed", exitCode: 0 } },
  ]);
  const report = evaluateReport({ trace, skill: skill("# Fluxo\n- Run `npm test`.\n- Run `npm run bad`.\n- Run `npm run open`.\n- Run `npm run maybe`.\n- Run `npm run absent`.\n- If `npm test` fails, run `npm run fix`.\n- If `npm run unknown` fails, run `npm run fix`.\n- Prefer simplicity.\n") });
  assert.deepEqual(states(report), ["sufficient", "contradicted", "partial", "partial", "unobserved", "not_applicable", "inconclusive", "not_applicable"]);
  assert.deepEqual(report.evaluations.map((item) => item.sources.skill.line), [2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
  assert.equal(report.evaluations[7].reasonCode, "guidance_not_step");
  assert.ok(report.evaluations.every((item) => item.reasonCode && item.sources.skill.sha256 === "a".repeat(64)));
});

test("T7-C5 comando literal: resultado nativo, parcial, negativo e silêncio; leitura de SKILL.md não vira carregamento", () => {
  const trace = buildTrace([
    pre("read", "cat SKILL.md"), post("read", "success"),
    pre("test", "npm test"), post("test", "success"),
    pre("fail", "npm run bad"), post("fail", "failure"),
    pre("open", "npm run open"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test`.\n- Run `npm run bad`.\n- Run `npm run open`.\n- Run `npm run absent`.\n- Read `SKILL.md`.\n") });
  assert.deepEqual(states(report), ["sufficient", "contradicted", "partial", "unobserved", "unobserved"]);
  assert.deepEqual(report.evaluations[4].sources.events, []);
  assert.ok(report.limitations.some((item) => item.text.includes("não comprova")));
});

test("T7-C6 condição falsa explícita, desconhecida e erro corrigido preservando ambas as sequências", () => {
  const trace = buildTrace([
    pre("check", "npm test"), post("check", "success"),
    pre("retry1", "npm run deploy"), post("retry1", "failure"),
    pre("retry2", "npm run deploy"), post("retry2", "success"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails, run `npm run fix`.\n- If `npm run unknown` fails, run `npm run fix`.\n- Run `npm run deploy`.\n") });
  assert.deepEqual(states(report), ["not_applicable", "inconclusive", "sufficient"]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
  assert.deepEqual(report.evaluations[2].corrections, [{ failed: [3, 4], corrected: [5, 6] }]);
});

test("T7-C6 comando repetido em sessões distintas não é declarado correção nem condição falsa", () => {
  const trace = buildTrace([
    pre("a", "npm test"), post("a", "failure"),
    { ...pre("b", "npm test"), ids: { sessionId: "s2", toolUseId: "b" } },
    { ...post("b", "success"), ids: { sessionId: "s2", toolUseId: "b" } },
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test`.\n- If `npm test` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["partial", "inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "ambiguous_context");
  assert.deepEqual(report.evaluations[0].corrections, []);
});
