import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { INTEGRATIONS_CLI, REPO_ROOT, baseEnv, makeScratch } from "../helpers/cli.mjs";
import { claudePayload, codexHookPayload, execEvent, hermesRecord, ndjson, SECRET_TEXT } from "../helpers/privacy-canaries.mjs";
import { runPrivacy } from "../helpers/privacy-store.mjs";

const PRIVACY_DIR = path.join(REPO_ROOT, "src", "integrations", "privacy");
const PROBE = pathToFileURL(path.join(REPO_ROOT, "tests", "integrations", "helpers", "privacy-probe.mjs")).href;
const NETWORK_MODULES = ["net", "http", "https", "http2", "dns", "dgram", "tls"];

test("I5-C31 nenhum módulo de privacidade importa rede e o demo e os hooks não fazem chamada de rede", () => {
  const files = readdirSync(PRIVACY_DIR).filter((name) => name.endsWith(".mjs"));
  assert.ok(files.length >= 7, files.join(", "));
  const imports = new RegExp(`(from\\s+|import\\s*\\(\\s*|require\\s*\\(\\s*)["'](node:)?(${NETWORK_MODULES.join("|")})(/[^"']*)?["']`);
  for (const name of files) {
    const source = readFileSync(path.join(PRIVACY_DIR, name), "utf8");
    assert.ok(!imports.test(source), `${name} importa módulo de rede`);
    assert.ok(!/\bfetch\s*\(/.test(source), `${name} usa fetch`);
  }

  const log = path.join(makeScratch("i5 c31 probe"), "probe.jsonl");
  const env = baseEnv({ SKILL_ME_TEST_PRIVACY_PROBE_LOG: log });
  const probed = { nodeArgs: ["--import", PROBE], env };
  const root = makeScratch("i5 c31");
  const steps = [];
  const run = (args, options = {}) => {
    const result = runPrivacy(args, { ...probed, ...options });
    steps.push([args[0], result.status]);
    return result;
  };
  const id = run(["start", "--root", root]).body.capture.id;
  const optIn = run(["start", "--root", root, "--content"]).body.capture.id;
  for (const capture of [id, optIn]) {
    run(["ingest", "--root", root, "--capture", capture, "--agent", "claude"], { input: ndjson([claudePayload("pre_tool_bash", { tool_input: { command: SECRET_TEXT } })]) });
    run(["ingest", "--root", root, "--capture", capture, "--agent", "codex-hooks"], { input: ndjson([codexHookPayload("post_tool_bash")]) });
    run(["ingest", "--root", root, "--capture", capture, "--agent", "codex-exec"], { input: ndjson([execEvent("item_completed_mcp_tool_call", { arguments: { url: "https://u:p@example.test/x" } })]) });
    run(["ingest", "--root", root, "--capture", capture, "--agent", "hermes"], { input: ndjson([hermesRecord("post_tool_call")]) });
    run(["status", "--root", root, "--capture", capture]);
    run(["export", "--root", root, "--capture", capture]);
  }
  run(["stop", "--root", root, "--capture", id]);
  run(["disable", "--root", root, "--capture", optIn]);
  run(["delete", "--root", root, "--capture", id]);
  run(["delete", "--root", root, "--capture", id, "--apply"]);
  run(["prune", "--root", root, "--apply"]);
  assert.ok(steps.every(([, status]) => status === 0), JSON.stringify(steps));

  for (const [agent, payload] of [["claude", claudePayload("post_tool_bash")], ["codex", codexHookPayload("pre_tool_bash")]]) {
    const hook = spawnSync(process.execPath, ["--import", PROBE, INTEGRATIONS_CLI, "hook", "--agent", agent], {
      input: JSON.stringify(payload),
      env: { ...env, SKILL_ME_OBSERVER_REPORT_FD: "3" },
      stdio: ["pipe", "pipe", "pipe", "pipe"],
    });
    assert.equal(hook.status, 0);
    assert.equal(hook.stdout.length, 0);
    assert.ok(hook.output[3].toString("utf8").includes('"skillMeObserverReport":2'), `${agent}: relatório entregue`);
  }
  const entries = readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  assert.ok(entries.length > 0, "a sonda registrou a execução");
  assert.deepEqual(entries.filter((entry) => entry.op === "network"), [], "nenhuma chamada de rede");
});
