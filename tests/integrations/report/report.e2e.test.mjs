import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { REPO_ROOT, runIntegrations } from "../helpers/cli.mjs";
import { claudePayload, codexHookPayload } from "../helpers/privacy-canaries.mjs";
import { boundEnv, runHook, startCapture } from "../helpers/traces.mjs";

const roots = [];
after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

test("T7-C10 fixtures normal, erro/correção e condição atravessam captura; leitura não é atribuída como carregamento", async () => {
  const root = mkdtempSync(path.join(REPO_ROOT, ".checks", "t7-flow-"));
  roots.push(root);
  const id = startCapture(root, ["--content"]);
  const env = boundEnv(root, id);
  const skill = path.join(root, "SKILL.md");
  writeFileSync(skill, "# Fluxo\n- Run `npm test`.\n- Run `npm run retry`.\n- Run `npm run open`.\n- Run `npm run absent`.\n- If `npm test` fails, run `npm run fix`.\n- If `npm run unknown` fails, run `npm run fix`.\n- Prefer checks.\n");

  const send = async (name, toolUseId, command, failure = false) => {
    const payload = claudePayload(name);
    payload.tool_use_id = toolUseId;
    if (payload.tool_input) payload.tool_input.command = command;
    const delivered = await runHook("claude", payload, { env });
    assert.equal(delivered.status, 0);
  };
  await send("pre_tool_bash", "t7-ok", "npm test");
  await send("post_tool_bash", "t7-ok", "npm test");
  await send("pre_tool_bash", "t7-retry1", "npm run retry");
  await send("post_tool_failure_bash", "t7-retry1", "npm run retry");
  await send("pre_tool_bash", "t7-retry2", "npm run retry");
  await send("post_tool_bash", "t7-retry2", "npm run retry");
  await send("pre_tool_bash", "t7-open", "npm run open");
  const read = codexHookPayload("post_tool_read_skill_md");
  assert.equal((await runHook("codex", read, { env })).status, 0);

  const result = runIntegrations(["report", "--root", root, "--capture", id, "--skill", skill, "--format", "json"]);
  assert.equal(result.status, 0, result.stdout);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.evaluations.map((item) => item.status), ["sufficient", "sufficient", "partial", "unobserved", "not_applicable", "inconclusive", "not_applicable"]);
  assert.equal(report.evaluations[1].corrections.length, 1);
  assert.ok(report.evaluations[1].corrections[0].failed.length === 2);
  assert.deepEqual(report.evaluations[3].sources.events, []);
  assert.ok(report.limitations.some((item) => item.text.includes("SKILL.md não comprova")));
  assert.ok(report.timeline.entries.every((entry) => entry.evidence.length === 1));
});
