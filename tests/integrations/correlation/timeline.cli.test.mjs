import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { runPrivacyCommand } from "../../../src/integrations/privacy/command.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { runIntegrations, makeScratch } from "../helpers/cli.mjs";
import { claudePayload } from "../helpers/privacy-canaries.mjs";
import { runPrivacy } from "../helpers/privacy-store.mjs";
import { boundEnv, captureDir, privacyOk, runHook, startCapture, storeDir } from "../helpers/traces.mjs";
import { snapshotTree } from "../helpers/tree.mjs";

// Prova C12 da issue #6: `privacy timeline` pela fronteira real do CLI, com o
// envelope fechado de erro da #5 e sem escrever nada.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

const RESULT_KEYS = ["capture", "command", "coverage", "entries", "operations", "schemaVersion", "status", "timelineVersion"];
const timeline = (root, id) => runPrivacy(["timeline", "--root", root, "--capture", id]);

async function feed(root, id) {
  const env = boundEnv(root, id);
  for (const name of ["pre_tool_skill", "post_tool_skill", "pre_tool_bash"]) assert.equal((await runHook("claude", claudePayload(name), { env })).status, 0, name);
}

test("T6-C12 timeline command: JSON único v1 com a timeline da captura ativa, encerrada ou desabilitada, sem modificar arquivos", async () => {
  const root = scratch("t6 c12 raiz");
  const active = startCapture(root);
  const stopped = startCapture(root);
  const disabled = startCapture(root, ["--content"]);
  for (const id of [active, stopped, disabled]) await feed(root, id);
  privacyOk(["stop", "--root", root, "--capture", stopped]);
  privacyOk(["disable", "--root", root, "--capture", disabled]);

  for (const [id, state] of [[active, "active"], [stopped, "stopped"], [disabled, "disabled"]]) {
    const before = snapshotTree(root);
    const result = timeline(root, id);
    assert.deepEqual(snapshotTree(root), before, `${state}: nenhum arquivo, lock ou mtime alterado`);
    assert.equal(result.status, 0, result.stdout);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout.trimEnd().split("\n").length, 1, "um JSON por execução");
    assert.deepEqual(Object.keys(result.body).sort(), RESULT_KEYS);
    assert.deepEqual([result.body.schemaVersion, result.body.command, result.body.status, result.body.timelineVersion], [1, "timeline", "ok", 1]);
    assert.equal(result.body.capture.id, id);
    assert.equal(result.body.capture.state, state);
    assert.deepEqual(result.body.entries.map((e) => e.sequence), [1, 2, 3]);
    assert.deepEqual(result.body.operations.filter((op) => op.type === "skill_invocation").map((op) => [op.strength, op.state, op.skillName]), [["native", "closed", "third-party-skill"]]);
    assert.deepEqual(Object.keys(result.body.coverage).sort(), ["capture", "eventGaps", "partial", "totals"]);
  }
});

test("T6-C12 timeline command: captura sem registros devolve entries e operations vazios", () => {
  const root = scratch("t6 c12 vazia");
  const id = startCapture(root);
  const result = timeline(root, id);
  assert.equal(result.status, 0);
  assert.deepEqual([result.body.entries, result.body.operations, result.body.timelineVersion], [[], [], 1]);
  assert.equal(result.body.coverage.partial, false);
});

const closed = (result, root, canary) => {
  assert.equal(result.stderr, "");
  for (const forbidden of [root, path.basename(root), canary, "Error", "at "].filter(Boolean)) assert.ok(!result.stdout.includes(forbidden), "sem eco");
};
const failure = (code) => ({ schemaVersion: 1, command: "timeline", status: "error", error: { code } });

test("T6-C12 timeline command: uso inválido sai com 2 e o envelope fechado de erro, sem eco", () => {
  const root = scratch("t6 c12 uso");
  const id = startCapture(root);
  const canary = "SKILLME-CANARY-flag";
  const cases = [
    [["timeline"], "missing_root"],
    [["timeline", "--capture", id], "missing_root"],
    [["timeline", "--root", root], "missing_capture"],
    [["timeline", "--root", root, "--capture", `../${canary}`], "invalid_capture_id"],
    [["timeline", "--root", root, "--capture", id.toUpperCase()], "invalid_capture_id"],
    [["timeline", "--root", root, "--capture", id, "--apply"], "unknown_flag"],
    [["timeline", "--root", root, "--capture", id, canary], "unexpected_argument"],
    [["timeline", "--root", root, "--capture"], "missing_flag_value"],
  ];
  const before = snapshotTree(root);
  for (const [argv, code] of cases) {
    const result = runPrivacy(argv);
    assert.equal(result.status, 2, argv.join(" "));
    assert.deepEqual(result.body, failure(code), argv.join(" "));
    closed(result, root, canary);
  }
  assert.deepEqual(snapshotTree(root), before);
});

test("T6-C12 timeline command: captura ausente ou inválida sai com 3; lock ou conflito com 4; sem alterar nada", () => {
  const base = scratch("t6 c12 erros");
  const check = (root, argv, exit, code, label) => {
    const before = snapshotTree(base);
    const result = runPrivacy(argv);
    assert.equal(result.status, exit, `${label}: ${result.stdout}`);
    assert.deepEqual(result.body, failure(code), label);
    closed(result, base);
    assert.deepEqual(snapshotTree(base), before, `${label}: nada alterado`);
  };
  const missing = path.join(base, "não existe");
  check(missing, ["timeline", "--root", missing, "--capture", "a".repeat(32)], 3, "root_not_found", "raiz ausente");
  writeFileSync(path.join(base, "arquivo.txt"), "x");
  check(base, ["timeline", "--root", path.join(base, "arquivo.txt"), "--capture", "a".repeat(32)], 3, "root_not_directory", "raiz é arquivo");
  const empty = path.join(base, "sem store");
  mkdirSync(empty);
  check(empty, ["timeline", "--root", empty, "--capture", "a".repeat(32)], 3, "capture_not_found", "sem store");
  assert.ok(!existsSync(storeDir(empty)), "a consulta não cria o store");

  const root = path.join(base, "raiz");
  mkdirSync(root);
  const id = startCapture(root);
  check(root, ["timeline", "--root", root, "--capture", "f".repeat(32)], 3, "capture_not_found", "captura ausente");
  const foreign = path.join(base, "alheia");
  mkdirSync(path.join(foreign, "skill-me-privacy"), { recursive: true });
  writeFileSync(path.join(foreign, "skill-me-privacy", "store.json"), '{"skillMePrivacyStore":2}');
  check(foreign, ["timeline", "--root", foreign, "--capture", id], 3, "store_invalid", "marcador alheio");

  const invalid = path.join(base, "estado inválido");
  mkdirSync(invalid);
  const bad = startCapture(invalid);
  writeFileSync(path.join(captureDir(invalid, bad), "state.json"), '{"captureVersion":1}');
  check(invalid, ["timeline", "--root", invalid, "--capture", bad], 3, "capture_invalid", "estado inválido");

  const broken = path.join(base, "segmento inválido");
  mkdirSync(broken);
  const badData = startCapture(broken);
  writeFileSync(path.join(captureDir(broken, badData), "events-000001.ndjson"), "{não é registro}\n");
  const state = JSON.parse(readFileSync(path.join(captureDir(broken, badData), "state.json"), "utf8"));
  writeFileSync(path.join(captureDir(broken, badData), "state.json"), JSON.stringify({ ...state, dataFile: "events-000001.ndjson", dataBytes: 17 }));
  check(broken, ["timeline", "--root", broken, "--capture", badData], 3, "capture_invalid", "segmento ilegível");

  const linked = path.join(base, "com link");
  mkdirSync(linked);
  symlinkSync(storeDir(root), storeDir(linked), "junction");
  check(linked, ["timeline", "--root", linked, "--capture", id], 4, "link_refused", "store por link");

  writeFileSync(path.join(storeDir(root), ".lock"), "lock alheio\n");
  check(root, ["timeline", "--root", root, "--capture", id], 4, "lock_present", "lock ocupado");
  assert.equal(readFileSync(path.join(storeDir(root), ".lock"), "utf8"), "lock alheio\n", "lock alheio preservado");
});

test("T6-C12 timeline command: falha de E/S na leitura sai com 5 e io_failure, sem eco da causa", async () => {
  const root = scratch("t6 c12 es");
  const id = startCapture(root);
  await feed(root, id);
  const io = { ...createStoreIo(), readBounded: async () => { throw Object.assign(new Error(`EIO ${root} SKILLME-CANARY-io`), { code: "EIO" }); } };
  const result = await runPrivacyCommand({ argv: ["timeline", "--root", root, "--capture", id], io });
  assert.equal(result.exitCode, 5);
  assert.deepEqual(result.body, failure("io_failure"));
  assert.ok(!JSON.stringify(result.body).includes("SKILLME-CANARY") && !JSON.stringify(result.body).includes(root));
});

test("T6-C12 timeline command: a ajuda lista o comando, e --help não lê a captura", () => {
  const root = scratch("t6 c12 ajuda");
  for (const argv of [["--help"], ["timeline", "--help"]]) {
    const help = runIntegrations(["privacy", ...argv]);
    assert.equal(help.status, 0);
    assert.equal(help.stderr, "");
    assert.ok(help.stdout.includes("integrations privacy timeline --root <diretório> --capture <id>"), argv.join(" "));
    assert.match(help.stdout, /timeline/);
  }
  assert.ok(!existsSync(storeDir(root)));
});
