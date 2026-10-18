import assert from "node:assert/strict";
import { test } from "node:test";
import { INTEGRATIONS_CLI, baseEnv, makeScratch } from "../helpers/cli.mjs";
import { runClaudeHandler } from "../helpers/installed-hooks.mjs";
import { claudePayload, codexHookPayload } from "../helpers/privacy-canaries.mjs";
import { runPrivacy } from "../helpers/privacy-store.mjs";

const ONE_MIB = 1024 * 1024;
const LINE_MAX = 64 * 1024;

// JSON válido com exatamente `bytes` bytes UTF-8, crescendo um campo não lido.
function payloadOfBytes(base, bytes) {
  const empty = JSON.stringify({ ...base, padding: "" });
  const pad = bytes - Buffer.byteLength(empty);
  assert.ok(pad > 0);
  const text = JSON.stringify({ ...base, padding: "x".repeat(pad) });
  assert.equal(Buffer.byteLength(text), bytes);
  return text;
}

test("I5-C20 hook lê exatamente 1 MiB e conta inputTooLarge com 1 byte a mais; ingest lê linha de 64 KiB e recusa 64 KiB + 1", async () => {
  const handler = { command: process.execPath, args: [INTEGRATIONS_CLI, "hook", "--agent", "claude"] };
  const base = claudePayload("pre_tool_bash");
  const exact = await runClaudeHandler(handler, undefined, { env: baseEnv(), stdinText: payloadOfBytes(base, ONE_MIB) });
  assert.equal(exact.status, 0);
  assert.equal(exact.stdout, "");
  assert.equal(exact.report.events.length, 1, "1 MiB exato é lido");
  assert.equal(exact.report.counters.inputTooLarge, 0);
  const over = await runClaudeHandler(handler, undefined, { env: baseEnv(), stdinText: payloadOfBytes(base, ONE_MIB + 1) });
  assert.equal(over.status, 0);
  assert.equal(over.stdout, "");
  assert.deepEqual(over.report.events, []);
  assert.equal(over.report.counters.inputTooLarge, 1);

  const root = makeScratch("i5 c20");
  const id = runPrivacy(["start", "--root", root, "--content"]).body.capture.id;
  const line = payloadOfBytes(codexHookPayload("pre_tool_bash"), LINE_MAX);
  const lineOver = payloadOfBytes(codexHookPayload("pre_tool_bash"), LINE_MAX + 1);
  const ingest = (input) => runPrivacy(["ingest", "--root", root, "--capture", id, "--agent", "codex-hooks"], { input });
  const read = ingest(line + "\n");
  assert.equal(read.status, 0, read.stdout);
  assert.deepEqual(read.body.batch, { accepted: 1, persisted: 1, malformed: {}, dropped: {}, contentOmitted: {} });
  const refused = ingest(lineOver + "\n" + line + "\n");
  assert.equal(refused.status, 0);
  assert.deepEqual(refused.body.batch, { accepted: 1, persisted: 1, malformed: { oversize_line: 1 }, dropped: {}, contentOmitted: {} });
  const status = runPrivacy(["status", "--root", root, "--capture", id]);
  assert.equal(status.body.capture.counters.malformed, 1);
  assert.equal(status.body.capture.counters.persisted, 2);
});
