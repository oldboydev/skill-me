import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { runPrivacyCommand } from "../../../src/integrations/privacy/command.mjs";
import { INTEGRATIONS_CLI, REPO_ROOT, baseEnv, makeScratch } from "../helpers/cli.mjs";
import { loadFixture } from "../helpers/fixtures.mjs";
import { MARKER, SECRET_TEXT, claudePayload, execEvent, leaks, ndjson } from "../helpers/privacy-canaries.mjs";
import { runPrivacy } from "../helpers/privacy-store.mjs";

// Demonstração versionada da issue #5: somente fixtures sintéticas, num
// diretório temporário próprio, pelo CLI real (e pela API em processo só para
// o relógio da retenção, que o CLI não aceita por flag ou ambiente).

const FS_PROBE = pathToFileURL(path.join(REPO_ROOT, "tests", "integrations", "helpers", "fs-probe.mjs")).href;
const DAY_MS = 86_400_000;
const store = (root) => path.join(root, "skill-me-privacy");
const capturesOf = (root) => path.join(store(root), "captures");

function files(root) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (lstatSync(full).isDirectory()) walk(full);
      else out.push(full);
    }
  };
  if (existsSync(root)) walk(root);
  return out;
}

// Todo arquivo realmente criado é examinado: nenhum canário de segredo e, nas
// capturas sem opt-in, nenhum texto das fixtures da #4.
function scan(root, label, forbidden = []) {
  for (const file of files(root)) {
    const text = readFileSync(file, "utf8");
    assert.deepEqual(leaks(text), [], `${label}: ${path.relative(root, file)}`);
    for (const value of forbidden) assert.ok(!text.includes(value), `${label}: ${value} em ${path.relative(root, file)}`);
  }
}

const claudeFixture = () => loadFixture("claude-hooks.json").cases.map((c) => c.payload);

test("I5-C55 demo: start → ingest → stop → export → delete, opt-in separado, disable e prune com relógio controlado", async () => {
  const root = makeScratch("i5 demo");
  const probeLog = path.join(makeScratch("i5 demo probe"), "fs-probe.jsonl");
  const steps = [];
  const cli = (args, options = {}) => {
    const result = runPrivacy(args, options);
    steps.push(result);
    assert.equal(result.stderr, "", args[0]);
    assert.deepEqual(leaks(result.stdout), [], args[0]);
    return result;
  };

  // 1. Captura padrão: conteúdo desligado.
  const plain = cli(["start", "--root", root]).body.capture;
  assert.equal(plain.content, false);
  const plainIngest = cli(["ingest", "--root", root, "--capture", plain.id, "--agent", "claude"], {
    input: ndjson([...claudeFixture(), claudePayload("pre_tool_bash", { tool_input: { command: SECRET_TEXT } })]),
    nodeArgs: ["--import", FS_PROBE],
    env: baseEnv({ SKILL_ME_TEST_FS_PROBE_LOG: probeLog, SKILL_ME_TEST_FS_PROBE_CANARY: MARKER }),
  });
  assert.equal(plainIngest.status, 0);
  scan(root, "ingest sem opt-in", ["SKILLME-CANARY"]);
  assert.equal(cli(["stop", "--root", root, "--capture", plain.id]).body.capture.state, "stopped");
  const plainExport = cli(["export", "--root", root, "--capture", plain.id]).body;
  assert.equal(plainExport.records.length, plainIngest.body.batch.persisted);
  assert.ok(plainExport.records.every((r) => r.content === null));

  // 2. Captura opt-in separada: conteúdo sanitizado; disable desliga.
  const optIn = cli(["start", "--root", root, "--content"]).body.capture;
  assert.notEqual(optIn.id, plain.id);
  assert.equal(cli(["ingest", "--root", root, "--capture", optIn.id, "--agent", "codex-exec"], { input: ndjson([execEvent("item_completed_command", { command: SECRET_TEXT, aggregated_output: "resultado comum" })]) }).status, 0);
  const optInExport = cli(["export", "--root", root, "--capture", optIn.id]).body;
  assert.equal(optInExport.records[0].content.fields.find((f) => f.field === "item.aggregated_output").value, "resultado comum");
  const disabled = cli(["disable", "--root", root, "--capture", optIn.id]).body.capture;
  assert.deepEqual([disabled.state, disabled.content], ["disabled", false]);
  assert.equal(cli(["ingest", "--root", root, "--capture", optIn.id, "--agent", "codex-exec"], { input: ndjson([execEvent("item_completed_command")]) }).status, 3);
  scan(root, "opt-in");

  // 3. Exclusão com prévia e aplicação: dados e chave deixam de existir.
  for (const capture of [plain.id, optIn.id]) {
    const preview = cli(["delete", "--root", root, "--capture", capture]).body;
    assert.deepEqual(preview.entries.filter((name) => name === "key"), ["key"]);
    assert.ok(existsSync(path.join(capturesOf(root), capture, "key")));
    assert.equal(cli(["delete", "--root", root, "--capture", capture, "--apply"]).body.deleted, true);
    assert.ok(!existsSync(path.join(capturesOf(root), capture)));
  }
  assert.deepEqual(readdirSync(capturesOf(root)), []);
  assert.ok(!files(root).some((file) => /events-\d{6}\.ndjson|[\\/]key$/.test(file)), "nenhum dado ou chave restante");

  // 4. Prune com relógio controlado (API em processo).
  const t0 = Date.parse("2026-03-01T00:00:00.000Z");
  const at = (ms) => () => ms;
  const started = await runPrivacyCommand({ argv: ["start", "--root", root, "--retention-days", "2"], now: at(t0) });
  const old = started.body.capture.id;
  assert.equal((await runPrivacyCommand({ argv: ["stop", "--root", root, "--capture", old], now: at(t0) })).exitCode, 0);
  const young = cli(["start", "--root", root]).body.capture.id;
  const notYet = await runPrivacyCommand({ argv: ["prune", "--root", root, "--apply"], now: at(t0 + 2 * DAY_MS - 1) });
  assert.deepEqual(notYet.body.deleted, []);
  const pruned = await runPrivacyCommand({ argv: ["prune", "--root", root, "--apply"], now: at(t0 + 2 * DAY_MS) });
  assert.deepEqual([pruned.body.selected, pruned.body.deleted], [[old], [old]]);
  assert.deepEqual(readdirSync(capturesOf(root)), [young], "active preservada");

  const observed = readFileSync(probeLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  assert.ok(observed.some((o) => o.moment === "before_rename"));
  for (const o of observed) assert.equal(o.containsCanary, false, `${o.file} ${o.moment}`);
  scan(root, "fim");
  assert.ok(steps.length > 10);
});

function produce(root, id, count, tag) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [INTEGRATIONS_CLI, "privacy", "ingest", "--root", root, "--capture", id, "--agent", "codex-exec"], { env: baseEnv(), stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.stdin.on("error", () => {});
    child.stdin.end(ndjson(Array.from({ length: count }, (_, i) => execEvent("item_completed_command", { id: `${tag}_${i}`, command: SECRET_TEXT }))));
    child.on("close", (status) => resolve({ status, stderr, body: JSON.parse(stdout) }));
  });
}

async function retryOnLock(args) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const result = await new Promise((resolve) => {
      const child = spawn(process.execPath, [INTEGRATIONS_CLI, "privacy", ...args], { env: baseEnv() });
      let stdout = "";
      child.stdout.on("data", (chunk) => (stdout += chunk));
      child.on("close", (status) => resolve({ status, body: JSON.parse(stdout) }));
    });
    if (result.status !== 4 || result.body.error.code !== "lock_present") return result;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("lock ocupado demais");
}

test("I5-C56 oito produtores concorrentes com stop e depois delete: contagem coerente e nada reaparece", async () => {
  for (const round of [1, 2]) {
    const root = makeScratch(`i5 c56 ${round}`);
    const id = runPrivacy(["start", "--root", root]).body.capture.id;
    const producers = Array.from({ length: 8 }, (_, i) => produce(root, id, 20, `r${round}p${i}`));
    // Rodada 1: stop no meio dos produtores, delete depois de todos. Rodada 2:
    // stop e delete enquanto ainda há produtores em voo.
    await new Promise((resolve) => setTimeout(resolve, round === 1 ? 150 : 50));
    const stop = await retryOnLock(["stop", "--root", root, "--capture", id]);
    assert.equal(stop.status, 0, JSON.stringify(stop.body));
    let deleted = null;
    if (round === 2) deleted = await retryOnLock(["delete", "--root", root, "--capture", id, "--apply"]);
    const results = await Promise.all(producers);
    let succeeded = 0;
    for (const result of results) {
      assert.equal(result.stderr, "");
      assert.deepEqual(leaks(JSON.stringify(result.body)), []);
      if (result.status === 0) {
        assert.equal(result.body.batch.persisted, 20, "sucesso grava o lote inteiro");
        succeeded += result.body.batch.persisted;
      } else {
        assert.ok([3, 4].includes(result.status), JSON.stringify(result.body));
        assert.ok(["capture_not_active", "capture_not_found", "lock_present"].includes(result.body.error.code), result.body.error.code);
      }
    }
    if (round === 1) {
      const status = runPrivacy(["status", "--root", root, "--capture", id]).body.capture;
      assert.equal(status.counters.persisted, succeeded, "persisted = soma dos sucessos");
      const exported = runPrivacy(["export", "--root", root, "--capture", id]).body.records;
      assert.equal(exported.length, succeeded);
      deleted = await retryOnLock(["delete", "--root", root, "--capture", id, "--apply"]);
    }
    assert.equal(deleted.status, 0, JSON.stringify(deleted.body));
    const late = await produce(root, id, 3, `tarde${round}`);
    assert.equal(late.status, 3);
    assert.equal(late.body.error.code, "capture_not_found");
    assert.ok(!existsSync(path.join(capturesOf(root), id)), "nada recriado depois do delete e do fim dos produtores");
    assert.deepEqual(readdirSync(capturesOf(root)), []);
    assert.ok(!files(root).some((file) => /events-|skill-me-tmp|[\\/]key$/.test(file)));
    scan(root, `rodada ${round}`);
  }
});
