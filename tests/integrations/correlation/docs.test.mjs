import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PRIVACY_HELP_TEXT } from "../../../src/integrations/privacy/args.mjs";
import { correlateTrace } from "../../../src/integrations/correlation/timeline.mjs";
import { REPO_ROOT } from "../helpers/cli.mjs";
import { buildTrace } from "./helpers/trace-builder.mjs";

// Guia de uso da issue #6: o que ele promete é o que a timeline emite, e a
// limitação sintética do C11 fica registrada no build.md.

const read = (rel) => readFileSync(path.join(REPO_ROOT, rel), "utf8").replaceAll("\r\n", "\n");
const GUIDE = read("docs/traces.md");
const start = GUIDE.indexOf("\n## Timeline e cobertura");
const SECTION = GUIDE.slice(start, GUIDE.indexOf("\n## ", start + 4));

test("T6-docs timeline guide: a seção cita o comando da ajuda, as forças, os estados emitidos e os limites da leitura", () => {
  assert.ok(start >= 0, "seção ausente");
  const usage = "privacy timeline --root <diretório> --capture <id>";
  assert.ok(SECTION.includes(usage));
  assert.ok(PRIVACY_HELP_TEXT.includes(usage));
  for (const strength of ["native", "heuristic", "inconclusive"]) assert.ok(SECTION.includes(`\`${strength}\``), strength);

  const trace = buildTrace([
    { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "a" }, fields: { toolName: "Bash" } },
    { src: "claude", kind: "tool_post", ids: { sessionId: "s1", toolUseId: "a" }, fields: { toolName: "Bash" } },
    { src: "claude", kind: "tool_post", ids: { sessionId: "s1", toolUseId: "b" }, fields: { toolName: "Bash" } },
    { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "c" }, fields: { toolName: "Bash" } },
    { src: "claude", kind: "skill_invocation", ids: { sessionId: "s1", toolUseId: "u" }, fields: { invocationPath: "skill_tool", phase: "pre", skillName: "x" } },
    { src: "claude", kind: "session_end", ids: { sessionId: "s1" }, fields: { reason: "other" } },
    { src: "codexExec", kind: "session_start", ids: { threadId: "t1" } },
    { src: "codexExec", kind: "item", ids: { itemId: "i" }, fields: { phase: "started", itemType: "command_execution" } },
    { src: "codexExec", kind: "session_start", ids: { threadId: "t2" } },
    { src: "codexExec", kind: "item", ids: { itemId: "i" }, fields: { phase: "completed", itemType: "command_execution" } },
  ]);
  const result = correlateTrace(trace);
  const states = new Set(result.operations.map((op) => op.state));
  assert.deepEqual([...states].sort(), ["ambiguous", "boundary_only", "closed", "open", "orphan_result"]);
  for (const state of states) assert.ok(SECTION.includes(`\`${state}\``), state);
  for (const type of new Set(result.operations.map((op) => op.type))) assert.ok(SECTION.includes(`\`${type}\``), type);
  for (const key of Object.keys(result.coverage.totals)) assert.ok(SECTION.includes(key) || key.startsWith("inconclusive"), key);
  for (const word of ["partial", "eventGaps", "duplicateOf", "outOfOrder", "elapsedMs", "instructionCompletion"]) assert.ok(SECTION.includes(word), word);
  assert.match(SECTION, /Nenhum percentual de cumprimento é calculado/);
  assert.match(SECTION, /Nenhuma prova\s+inicia um agente real nem executa um modelo/);
  assert.ok(!/modelo (real )?(foi )?executado|E2E (real )?(aprovado|executado)/i.test(SECTION));
});

test("T6-docs timeline guide: o registro do build declara que a prova de turn_end do C11 é sintética", () => {
  const build = read(".checks/issue-6-correlacao.build.md");
  assert.match(build, /turn_end[^\n]*sint[ée]tic/i);
  assert.match(build, /n[ãa]o emite `turn_end`/);
});
