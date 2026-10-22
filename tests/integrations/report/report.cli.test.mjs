import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { runReportCommand } from "../../../src/integrations/report/command.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { REPO_ROOT, runIntegrations } from "../helpers/cli.mjs";
import { claudePayload } from "../helpers/privacy-canaries.mjs";
import { boundEnv, captureDir, runHook, startCapture, storeDir } from "../helpers/traces.mjs";
import { snapshotTree } from "../helpers/tree.mjs";

const roots = [];
after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));
const scratch = () => { const root = mkdtempSync(path.join(REPO_ROOT, ".checks", "t7-report-")); roots.push(root); return root; };
const setup = () => {
  const root = scratch();
  const id = startCapture(root);
  const skill = path.join(root, "SKILL.md");
  writeFileSync(skill, "# Fluxo\n- Run `npm test`.\n");
  return { root, id, skill };
};
const args = ({ root, id, skill }, format) => ["report", "--root", root, "--capture", id, "--skill", skill, ...(format ? ["--format", format] : [])];

test("T7-C8 texto, Markdown e JSON v1 refletem a mesma consulta sanitizada sem modificar captura ou skill", () => {
  const target = setup();
  const before = snapshotTree(target.root);
  const text = runIntegrations(args(target));
  const markdown = runIntegrations(args(target, "markdown"));
  const json = runIntegrations(args(target, "json"));
  for (const result of [text, markdown, json]) {
    assert.equal(result.status, 0, result.stdout);
    assert.equal(result.stderr, "");
  }
  assert.match(text.stdout, /^Relatório de execução/);
  assert.match(markdown.stdout, /^# Relatório de execução/);
  const data = JSON.parse(json.stdout);
  assert.deepEqual([data.reportVersion, data.skill.identification, data.evaluations[0].status], [1, "explicit_path", "unobserved"]);
  assert.deepEqual(data.timeline.entries, []);
  assert.equal(runIntegrations(args(target, "json")).stdout, json.stdout);
  assert.deepEqual(snapshotTree(target.root), before);
  assert.equal(readFileSync(target.skill, "utf8"), "# Fluxo\n- Run `npm test`.\n");
});

test("T7-C8 bloco sensível na skill não aparece em texto, Markdown ou JSON", () => {
  const target = setup();
  writeFileSync(target.skill, "- Run `npm test`.\n  password: |\n    SENHA_INTERNA_EXEMPLO\n");
  for (const format of ["text", "markdown", "json"]) {
    const result = runIntegrations(args(target, format));
    assert.equal(result.status, 0);
    assert.ok(!result.stdout.includes("SENHA_INTERNA_EXEMPLO"));
    if (format === "json") assert.equal(JSON.parse(result.stdout).evaluations[0].text, null);
  }
});

test("T7-C8 subitem de bloco sensível não aparece em nenhum formato", () => {
  const target = setup();
  writeFileSync(target.skill, "- Run `npm test`.\n  password: |\n    - SENHA_INTERNA_EXEMPLO\n");
  for (const format of ["text", "markdown", "json"]) {
    const result = runIntegrations(args(target, format));
    assert.equal(result.status, 0);
    assert.ok(!result.stdout.includes("SENHA_INTERNA_EXEMPLO"));
    if (format === "json") {
      const evaluations = JSON.parse(result.stdout).evaluations;
      assert.equal(evaluations.length, 1);
      assert.deepEqual([evaluations[0].status, evaluations[0].reasonCode, evaluations[0].text], ["inconclusive", "command_redacted", null]);
    }
  }
});

test("T7-C8 valor entre aspas removido pela política não vaza entre itens", () => {
  const target = setup();
  writeFileSync(target.skill, "- Run `npm test`.\n  password: \"\n    - SENHA_INTERNA_EXEMPLO\n  \"\n");
  for (const format of ["text", "markdown", "json"]) {
    const result = runIntegrations(args(target, format));
    assert.equal(result.status, 0);
    assert.ok(!result.stdout.includes("SENHA_INTERNA_EXEMPLO"));
  }
});

test("T7-C8 consulta de captura legível não solicita escrita nem lock", async () => {
  const target = setup();
  let writes = 0;
  const io = {
    ...createStoreIo(),
    writeExclusive: async () => { writes += 1; throw new Error("write refused"); },
  };
  for (const format of ["text", "markdown", "json"]) {
    const result = await runReportCommand({ argv: args(target, format).slice(1), io });
    assert.equal(result.exitCode, 0, result.output);
  }
  assert.equal(writes, 0);
});

test("T7-C8 troca concorrente do segmento é conflito, sem mascarar corrupção estável", async () => {
  const target = setup();
  const env = boundEnv(target.root, target.id);
  const send = async (toolUseId) => {
    const payload = claudePayload("pre_tool_bash");
    payload.tool_use_id = toolUseId;
    assert.equal((await runHook("claude", payload, { env })).status, 0);
  };
  await send("before-report");
  const base = createStoreIo();
  let replaced = false;
  const io = {
    ...base,
    readBounded: async (file, maxBytes) => {
      if (!replaced && path.basename(file) === "events-000001.ndjson") {
        replaced = true;
        await send("during-report");
      }
      return base.readBounded(file, maxBytes);
    },
  };
  const result = await runReportCommand({ argv: args(target).slice(1), io });
  assert.equal(replaced, true);
  assert.equal(result.exitCode, 4, result.output);
  assert.equal(JSON.parse(result.output).error.code, "lock_present");

  const state = JSON.parse(readFileSync(path.join(captureDir(target.root, target.id), "state.json"), "utf8"));
  writeFileSync(path.join(captureDir(target.root, target.id), state.dataFile), "invalid\n");
  const corrupt = await runReportCommand({ argv: args(target).slice(1) });
  assert.equal(corrupt.exitCode, 3, corrupt.output);
  assert.equal(JSON.parse(corrupt.output).error.code, "capture_invalid");
});

test("T7-C9 erros de uso, skill/captura, lock e E/S têm códigos fechados sem eco", async () => {
  const target = setup();
  const canary = "SKILLME-CANARY-secret";
  const check = (tokens, exit, code) => {
    const result = runIntegrations(["report", ...tokens]);
    assert.equal(result.status, exit, result.stdout);
    assert.deepEqual(JSON.parse(result.stdout), { schemaVersion: 1, command: "report", status: "error", error: { code } });
    assert.equal(result.stderr, "");
    assert.ok(!result.stdout.includes(target.root) && !result.stdout.includes(canary));
  };
  check([], 2, "missing_root");
  check(["--root", target.root], 2, "missing_capture");
  check(["--root", target.root, "--capture", target.id, "--skill", "--format=markdown"], 2, "missing_flag_value");
  check([...args(target).slice(1), "--format", canary], 2, "invalid_format");
  check(["--root", target.root, "--capture", `../${canary}`, "--skill", target.skill], 2, "invalid_capture_id");
  check(["--root", target.root, "--capture", target.id, "--skill", path.join(target.root, canary)], 3, "skill_not_found");
  check(["--root", target.root, "--capture", "f".repeat(32), "--skill", target.skill], 3, "capture_not_found");
  const statePath = path.join(captureDir(target.root, target.id), "state.json");
  const state = readFileSync(statePath);
  writeFileSync(statePath, '{"captureVersion":1}');
  check(args(target).slice(1), 3, "capture_invalid");
  writeFileSync(statePath, state);
  writeFileSync(path.join(storeDir(target.root), ".lock"), "lock alheio\n");
  check(args(target).slice(1), 4, "lock_present");
  rmSync(path.join(storeDir(target.root), ".lock"));
  const io = { ...createStoreIo(), readBounded: async () => { throw new Error(`${canary} ${target.root}`); } };
  const result = await runReportCommand({ argv: args(target).slice(1), io });
  assert.equal(result.exitCode, 5);
  assert.equal(JSON.parse(result.output).error.code, "io_failure");
  assert.ok(!result.output.includes(canary) && !result.output.includes(target.root));
});
