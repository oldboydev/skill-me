import assert from "node:assert/strict";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Readable } from "node:stream";
import { test } from "node:test";
import { validateEnvelope } from "../../../src/integrations/boundary.mjs";
import { runPrivacyCommand } from "../../../src/integrations/privacy/command.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { INTEGRATIONS_CLI, REPO_ROOT, baseEnv, makeScratch, runIntegrations } from "../helpers/cli.mjs";
import { fixtureCase, loadFixture } from "../helpers/fixtures.mjs";
import { runClaudeHandler } from "../helpers/installed-hooks.mjs";
import { CANARIES, MARKER, SECRET_TEXT, claudePayload, codexHookPayload, execEvent, hermesRecord, ndjson } from "../helpers/privacy-canaries.mjs";
import { appendSanitized, runPrivacy, startIn } from "../helpers/privacy-store.mjs";
import { snapshotTree } from "../helpers/tree.mjs";

const FS_PROBE = pathToFileURL(path.join(REPO_ROOT, "tests", "integrations", "helpers", "fs-probe.mjs")).href;
const PRIVACY_PROBE = pathToFileURL(path.join(REPO_ROOT, "tests", "integrations", "helpers", "privacy-probe.mjs")).href;

const POSIX = process.platform !== "win32";
const DAY_MS = 86_400_000;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const STATE_KEYS = ["captureVersion", "content", "counters", "createdAt", "dataBytes", "dataFile", "endedAt", "id", "limits", "retentionDays", "state"];
const COUNTER_KEYS = ["accepted", "contentOmitted", "dropped", "malformed", "persisted"];

const storeDir = (root) => path.join(root, "skill-me-privacy");
const captureDir = (root, id) => path.join(storeDir(root), "captures", id);
const readState = (root, id) => JSON.parse(readFileSync(path.join(captureDir(root, id), "state.json"), "utf8"));

// Nenhuma saída do comando ecoa a raiz, valor de flag ou exceção.
function assertClosedOutput(result, root) {
  assert.equal(result.stderr, "");
  for (const forbidden of [root, path.basename(root), "Error", "at "]) assert.ok(!result.stdout.includes(forbidden), `stdout contém ${forbidden}`);
}

test("I5-C36 start cria captura active, conteúdo off, 7 dias, ID próprio e o layout literal", () => {
  const root = makeScratch("i5 c36");
  const first = runPrivacy(["start", "--root", root]);
  assert.equal(first.status, 0);
  assertClosedOutput(first, root);
  const { id, createdAt } = first.body.capture;
  assert.match(id, /^[0-9a-f]{32}$/);
  assert.match(createdAt, ISO);
  assert.deepEqual(first.body, {
    schemaVersion: 1,
    command: "start",
    status: "ok",
    capture: { id, state: "active", content: false, retentionDays: 7, createdAt },
  });

  const rel = `skill-me-privacy/captures/${id}`;
  assert.deepEqual(Object.keys(snapshotTree(root)).sort(), [
    "skill-me-privacy",
    "skill-me-privacy/captures",
    rel,
    `${rel}/key`,
    `${rel}/state.json`,
    "skill-me-privacy/store.json",
  ]);
  assert.equal(readFileSync(path.join(storeDir(root), "store.json"), "utf8"), '{"skillMePrivacyStore":1}');
  const key = readFileSync(path.join(captureDir(root, id), "key"));
  assert.equal(key.length, 32);
  assert.deepEqual(readState(root, id), {
    captureVersion: 1,
    id,
    state: "active",
    content: false,
    retentionDays: 7,
    createdAt,
    endedAt: null,
    dataFile: null,
    dataBytes: 0,
    counters: { accepted: 0, persisted: 0, malformed: 0, dropped: {}, contentOmitted: {} },
    limits: { maxEvents: 500, maxBytes: 8388608 },
  });
  if (POSIX) {
    for (const dir of [storeDir(root), path.join(storeDir(root), "captures"), captureDir(root, id)]) assert.equal(lstatSync(dir).mode & 0o777, 0o700, dir);
    for (const file of ["key", "state.json"]) assert.equal(lstatSync(path.join(captureDir(root, id), file)).mode & 0o777, 0o600, file);
  }

  const second = runPrivacy(["start", "--root", root]);
  assert.equal(second.status, 0);
  assert.notEqual(second.body.capture.id, id);
  assert.ok(!readFileSync(path.join(captureDir(root, second.body.capture.id), "key")).equals(key), "chaves diferentes");
});

test("I5-C2 conteúdo é opt-in por captura e não é herdado", () => {
  const root = makeScratch("i5 c2");
  const optIn = runPrivacy(["start", "--root", root, "--content"]);
  assert.equal(optIn.status, 0);
  assert.equal(optIn.body.capture.content, true);
  const plain = runPrivacy(["start", "--root", root]);
  assert.equal(plain.body.capture.content, false, "sem --content nasce false mesmo com outra captura opt-in ativa");
  const optInId = optIn.body.capture.id;
  assert.equal(runPrivacy(["stop", "--root", root, "--capture", optInId]).status, 0);
  assert.equal(runPrivacy(["start", "--root", root]).body.capture.content, false, "depois de uma opt-in parada");
  assert.equal(runPrivacy(["disable", "--root", root, "--capture", optInId]).status, 0);
  const after = runPrivacy(["start", "--root", root]);
  assert.equal(after.body.capture.content, false, "depois de uma opt-in desabilitada");
  assert.equal(readState(root, after.body.capture.id).content, false);
  assert.equal(readState(root, optInId).content, false, "disable desliga o conteúdo da própria captura");
});

test("I5-C37 --retention-days aceita 1 e 365 e rejeita fora do contrato sem criar nada", () => {
  const root = makeScratch("i5 c37");
  for (const days of [1, 365]) {
    const result = runPrivacy(["start", "--root", root, "--retention-days", String(days)]);
    assert.equal(result.status, 0);
    assert.equal(result.body.capture.retentionDays, days);
    assert.equal(readState(root, result.body.capture.id).retentionDays, days);
  }
  const before = snapshotTree(root);
  for (const value of ["0", "366", "1.5", "7d", "-1", "", "+7", "07"]) {
    for (const argv of [["--retention-days", value], [`--retention-days=${value}`]]) {
      const result = runPrivacy(["start", "--root", root, ...argv]);
      assert.equal(result.status, 2, `${argv.join(" ")}`);
      assert.deepEqual(result.body, { schemaVersion: 1, command: "start", status: "error", error: { code: "invalid_retention" } }, argv.join(" "));
      assertClosedOutput(result, root);
    }
  }
  const missing = runPrivacy(["start", "--root", root, "--retention-days"]);
  assert.equal(missing.status, 2);
  assert.deepEqual(missing.body.error, { code: "missing_flag_value" });
  assert.deepEqual(snapshotTree(root), before, "nenhuma rejeição cria ou muda arquivo");
});

test("I5-C38 --root é obrigatório, sem default, e precisa ser um diretório existente", () => {
  const cwd = makeScratch("i5 c38 cwd");
  const before = snapshotTree(cwd);
  const missing = runPrivacy(["start"], { cwd });
  assert.equal(missing.status, 2);
  assert.deepEqual(missing.body, { schemaVersion: 1, command: "start", status: "error", error: { code: "missing_root" } });
  assert.deepEqual(snapshotTree(cwd), before, "nada criado no cwd");

  const absent = path.join(cwd, "não existe");
  const notFound = runPrivacy(["start", "--root", absent], { cwd });
  assert.equal(notFound.status, 3);
  assert.deepEqual(notFound.body.error, { code: "root_not_found" });
  assertClosedOutput(notFound, absent);

  const file = path.join(cwd, "arquivo.txt");
  writeFileSync(file, "x");
  const notDir = runPrivacy(["start", "--root", file], { cwd });
  assert.equal(notDir.status, 3);
  assert.deepEqual(notDir.body.error, { code: "root_not_directory" });
  assertClosedOutput(notDir, file);
  assert.ok(!existsSync(path.join(cwd, "skill-me-privacy")));
});

test("I5-C41b stop/disable pelo CLI seguem a tabela de transições e são idempotentes", () => {
  const root = makeScratch("i5 c41b");
  const id = runPrivacy(["start", "--root", root, "--content"]).body.capture.id;
  const stop = runPrivacy(["stop", "--root", root, "--capture", id]);
  assert.equal(stop.status, 0);
  const endedAt = stop.body.capture.endedAt;
  assert.match(endedAt, ISO);
  assert.deepEqual(stop.body, { schemaVersion: 1, command: "stop", status: "ok", capture: { id, state: "stopped", content: true, endedAt }, changed: true });
  const stopAgain = runPrivacy(["stop", "--root", root, "--capture", id]);
  assert.equal(stopAgain.status, 0);
  assert.deepEqual(stopAgain.body, { ...stop.body, changed: false });

  const disable = runPrivacy(["disable", "--root", root, "--capture", id]);
  assert.equal(disable.status, 0);
  assert.deepEqual(disable.body, { schemaVersion: 1, command: "disable", status: "ok", capture: { id, state: "disabled", content: false, endedAt }, changed: true });
  assert.deepEqual(runPrivacy(["disable", "--root", root, "--capture", id]).body, { ...disable.body, changed: false });
  const before = snapshotTree(root);
  const invalid = runPrivacy(["stop", "--root", root, "--capture", id]);
  assert.equal(invalid.status, 3);
  assert.deepEqual(invalid.body, { schemaVersion: 1, command: "stop", status: "error", error: { code: "invalid_transition" } });
  assert.deepEqual(snapshotTree(root), before);
  assert.equal(readState(root, id).state, "disabled");

  const direct = runPrivacy(["start", "--root", root, "--content"]).body.capture.id;
  const directDisable = runPrivacy(["disable", "--root", root, "--capture", direct]);
  assert.equal(directDisable.status, 0);
  assert.equal(directDisable.body.capture.state, "disabled");
  assert.equal(directDisable.body.capture.content, false);
  assert.match(directDisable.body.capture.endedAt, ISO);
  assert.equal(readState(root, direct).content, false);
});

test("I5-C44 delete mostra prévia sem mudar a árvore e --apply remove stopped/disabled, nunca active", async () => {
  const root = makeScratch("i5 c44");
  const stopped = await startIn(root);
  await appendSanitized(root, stopped, 2);
  await appendSanitized(root, stopped, 1);
  const disabled = await startIn(root);
  const active = await startIn(root);
  assert.equal(runPrivacy(["stop", "--root", root, "--capture", stopped]).status, 0);
  assert.equal(runPrivacy(["disable", "--root", root, "--capture", disabled]).status, 0);

  const before = snapshotTree(root);
  const preview = runPrivacy(["delete", "--root", root, "--capture", stopped]);
  assert.equal(preview.status, 0);
  assert.deepEqual(preview.body, {
    schemaVersion: 1,
    command: "delete",
    status: "ok",
    capture: stopped,
    applied: false,
    entries: [readState(root, stopped).dataFile, "key", "state.json"],
  });
  assert.match(preview.body.entries[0], /^events-\d{6}\.ndjson$/);
  assert.deepEqual(snapshotTree(root), before, "a prévia não muda nada");

  const activeTry = runPrivacy(["delete", "--root", root, "--capture", active, "--apply"]);
  assert.equal(activeTry.status, 3);
  assert.deepEqual(activeTry.body.error, { code: "capture_active" });
  assert.equal(runPrivacy(["delete", "--root", root, "--capture", active]).body.error.code, "capture_active");
  assert.deepEqual(snapshotTree(root), before);

  for (const id of [stopped, disabled]) {
    const applied = runPrivacy(["delete", "--root", root, "--capture", id, "--apply"]);
    assert.equal(applied.status, 0);
    assert.deepEqual(applied.body, { schemaVersion: 1, command: "delete", status: "ok", capture: id, applied: true, deleted: true });
    assert.ok(!existsSync(captureDir(root, id)));
  }
  assert.deepEqual(readdirSync(path.join(storeDir(root), "captures")), [active]);
  assert.equal(runPrivacy(["delete", "--root", root, "--capture", stopped, "--apply"]).body.error.code, "capture_not_found");
});

test("I5-C46 prune: prévia sem mudança, --apply com now injetado remove só as vencidas, relógio real preserva recém-parada", async () => {
  const root = makeScratch("i5 c46");
  const t0 = Date.parse("2026-01-01T00:00:00.000Z");
  const at = (ms) => () => ms;
  const run = (argv, now) => runPrivacyCommand({ argv: [...argv.slice(0, 1), "--root", root, ...argv.slice(1)], now });

  const expiredStop = await startIn(root, [], at(t0));
  await appendSanitized(root, expiredStop, 2);
  assert.equal((await run(["stop", "--capture", expiredStop], at(t0))).exitCode, 0);
  const expiredDisable = await startIn(root, ["--retention-days", "1"], at(t0));
  assert.equal((await run(["stop", "--capture", expiredDisable], at(t0))).exitCode, 0);
  assert.equal((await run(["disable", "--capture", expiredDisable], at(t0 + 5 * DAY_MS))).exitCode, 0);
  const notYet = await startIn(root, [], at(t0));
  assert.equal((await run(["stop", "--capture", notYet], at(t0 + 1))).exitCode, 0);
  const active = await startIn(root, ["--retention-days", "1"], at(t0 - 400 * DAY_MS));
  const now = at(t0 + 7 * DAY_MS);

  const before = snapshotTree(root);
  const preview = await run(["prune"], now);
  assert.equal(preview.exitCode, 0);
  assert.deepEqual(preview.body, {
    schemaVersion: 1,
    command: "prune",
    status: "ok",
    applied: false,
    selected: [expiredStop, expiredDisable].sort(),
    deleted: [],
    failed: [],
  });
  assert.deepEqual(snapshotTree(root), before, "prévia sem mudança");

  const applied = await run(["prune", "--apply"], now);
  assert.equal(applied.exitCode, 0);
  assert.deepEqual(applied.body, { ...preview.body, applied: true, deleted: [expiredStop, expiredDisable].sort() });
  assert.deepEqual(readdirSync(path.join(storeDir(root), "captures")).sort(), [notYet, active].sort());

  const fresh = runPrivacy(["start", "--root", root, "--retention-days", "1"]).body.capture.id;
  assert.equal(runPrivacy(["stop", "--root", root, "--capture", fresh]).status, 0);
  const real = runPrivacy(["prune", "--root", root, "--apply"]);
  assert.equal(real.status, 0);
  assert.equal(real.body.selected.includes(fresh), false);
  assert.ok(existsSync(captureDir(root, fresh)), "relógio real não remove recém-parada");
  assert.ok(existsSync(captureDir(root, active)), "active de 400 dias permanece");
  for (const flag of ["--now", "--clock"]) assert.equal(runPrivacy(["prune", "--root", root, flag, "0"]).body.error.code, "unknown_flag");

  // Raiz sem store: prune não cria nada; os demais comandos não encontram a captura.
  const bare = makeScratch("i5 c46 vazio");
  for (const apply of [[], ["--apply"]]) {
    const empty = runPrivacy(["prune", "--root", bare, ...apply]);
    assert.equal(empty.status, 0);
    assert.deepEqual(empty.body, { schemaVersion: 1, command: "prune", status: "ok", applied: apply.length > 0, selected: [], deleted: [], failed: [] });
  }
  assert.equal(runPrivacy(["stop", "--root", bare, "--capture", fresh]).body.error.code, "capture_not_found");
  assert.deepEqual(readdirSync(bare), []);
});

test("I5-C47s lock presente: start/stop/disable/delete/prune/status saem 4 sem mutação e o lock alheio fica", async () => {
  const root = makeScratch("i5 c47s");
  const id = await startIn(root);
  const stopped = await startIn(root);
  assert.equal(runPrivacy(["stop", "--root", root, "--capture", stopped]).status, 0);
  const lock = path.join(storeDir(root), ".lock");
  writeFileSync(lock, "lock alheio\n");
  const before = snapshotTree(root);
  const commands = [
    ["start"],
    ["stop", "--capture", id],
    ["disable", "--capture", id],
    ["status", "--capture", id],
    ["delete", "--capture", stopped],
    ["delete", "--capture", stopped, "--apply"],
    ["prune"],
    ["prune", "--apply"],
  ];
  for (const [command, ...rest] of commands) {
    const result = runPrivacy([command, "--root", root, ...rest]);
    assert.equal(result.status, 4, command);
    assert.deepEqual(result.body, { schemaVersion: 1, command, status: "error", error: { code: "lock_present" } }, command);
    assertClosedOutput(result, root);
  }
  assert.deepEqual(snapshotTree(root), before, "árvore idêntica, inclusive mtime");
  assert.equal(readFileSync(lock, "utf8"), "lock alheio\n");
});

test("I5-C49 delete recusa link/junção, subdiretório e arquivo alheio sem apagar nada e preserva alheios fora da captura", async () => {
  const root = makeScratch("i5 c49");
  const outside = makeScratch("i5 c49 fora");
  writeFileSync(path.join(outside, "sentinela.txt"), "fora da raiz");
  writeFileSync(path.join(root, "alheio-raiz.txt"), "alheio");

  const variants = [
    ["junção para fora", "link_refused", (dir) => symlinkSync(outside, path.join(dir, "ligação"), "junction")],
    ["subdiretório", "foreign_entry", (dir) => mkdirSync(path.join(dir, "sub"))],
    ["arquivo alheio", "foreign_entry", (dir) => writeFileSync(path.join(dir, "notas.txt"), "alheio")],
    ["nome parecido", "foreign_entry", (dir) => writeFileSync(path.join(dir, "events-1.ndjson"), "alheio")],
  ];
  for (const [label, code, plant] of variants) {
    const id = await startIn(root);
    await appendSanitized(root, id, 1);
    assert.equal(runPrivacy(["stop", "--root", root, "--capture", id]).status, 0, label);
    plant(captureDir(root, id));
    const before = snapshotTree(root);
    for (const apply of [[], ["--apply"]]) {
      const result = runPrivacy(["delete", "--root", root, "--capture", id, ...apply]);
      assert.equal(result.status, 4, label);
      assert.deepEqual(result.body.error, { code }, label);
    }
    assert.deepEqual(snapshotTree(root), before, `${label}: nada apagado`);
    assert.equal(readFileSync(path.join(outside, "sentinela.txt"), "utf8"), "fora da raiz");
  }

  // A própria pasta da captura trocada por junção também é recusada.
  const swapped = await startIn(root);
  assert.equal(runPrivacy(["stop", "--root", root, "--capture", swapped]).status, 0);
  const moved = path.join(outside, "captura movida");
  renameSync(captureDir(root, swapped), moved);
  symlinkSync(moved, captureDir(root, swapped), "junction");
  const beforeSwap = snapshotTree(root);
  const refused = runPrivacy(["delete", "--root", root, "--capture", swapped, "--apply"]);
  assert.equal(refused.status, 4);
  assert.deepEqual(refused.body.error, { code: "link_refused" });
  assert.deepEqual(snapshotTree(root), beforeSwap);
  assert.ok(existsSync(path.join(moved, "key")), "nada apagado através da junção");

  // Exclusão válida preserva alheios na raiz e em skill-me-privacy/.
  writeFileSync(path.join(storeDir(root), "alheio-store.txt"), "alheio");
  const clean = await startIn(root);
  await appendSanitized(root, clean, 2);
  assert.equal(runPrivacy(["stop", "--root", root, "--capture", clean]).status, 0);
  assert.equal(runPrivacy(["delete", "--root", root, "--capture", clean, "--apply"]).status, 0);
  assert.ok(!existsSync(captureDir(root, clean)));
  assert.equal(readFileSync(path.join(root, "alheio-raiz.txt"), "utf8"), "alheio");
  assert.equal(readFileSync(path.join(storeDir(root), "alheio-store.txt"), "utf8"), "alheio");

  // Pasta do store como junção: nenhum comando atravessa.
  const linkedRoot = makeScratch("i5 c49 store link");
  symlinkSync(storeDir(root), path.join(linkedRoot, "skill-me-privacy"), "junction");
  const viaLink = runPrivacy(["status", "--root", linkedRoot, "--capture", swapped]);
  assert.equal(viaLink.status, 4);
  assert.deepEqual(viaLink.body.error, { code: "link_refused" });
  assert.equal(runPrivacy(["start", "--root", linkedRoot]).body.error.code, "link_refused");
});

test("I5-C50s a chave nunca aparece no status e sai com a captura", async () => {
  const root = makeScratch("i5 c50s");
  const id = await startIn(root, ["--content"]);
  await appendSanitized(root, id, 2);
  const key = readFileSync(path.join(captureDir(root, id), "key"));
  const status = runPrivacy(["status", "--root", root, "--capture", id]);
  assert.equal(status.status, 0);
  for (const form of [key.toString("hex"), key.toString("base64"), key.toString("base64url"), key.toString("latin1")]) {
    assert.ok(!status.stdout.includes(form));
  }
  assert.equal(runPrivacy(["stop", "--root", root, "--capture", id]).status, 0);
  assert.equal(runPrivacy(["delete", "--root", root, "--capture", id, "--apply"]).status, 0);
  assert.ok(!existsSync(path.join(captureDir(root, id), "key")));
  assert.ok(!existsSync(captureDir(root, id)));
  assert.deepEqual(readdirSync(path.join(storeDir(root), "captures")), []);
});

test("I5-C43s status isolado por captura, JSON v1 e --help em português", async () => {
  const root = makeScratch("i5 c43s");
  const a = await startIn(root);
  const b = await startIn(root, ["--content"]);
  await appendSanitized(root, a, 3);
  await appendSanitized(root, b, 1, { malformed: 2 });
  const status = runPrivacy(["status", "--root", root, "--capture", a]);
  assert.equal(status.status, 0);
  assert.equal(status.body.schemaVersion, 1);
  assert.equal(status.body.capture.id, a);
  assert.ok(!status.stdout.includes(b));
  assert.deepEqual(status.body.capture.counters, { accepted: 3, persisted: 3, malformed: 0, dropped: {}, contentOmitted: {} });
  assert.equal(status.body.capture.content, false);

  for (const argv of [["--help"], ["start", "--help"]]) {
    const help = runIntegrations(["privacy", ...argv]);
    assert.equal(help.status, 0);
    assert.equal(help.stderr, "");
    assert.match(help.stdout, /Uso:/);
    assert.match(help.stdout, /captura/);
    assert.match(help.stdout, /--root <diretório>/);
    assert.match(help.stdout, /retenção/);
  }
});

test("I5-C54s state.json e .lock têm exatamente as chaves do Landing", async () => {
  const root = makeScratch("i5 c54s");
  const id = await startIn(root, ["--content", "--retention-days", "30"]);
  await appendSanitized(root, id, 2, { dropped: { envelope_oversize: 1 }, contentOmitted: { content_disabled: 2 } });
  const state = readState(root, id);
  assert.deepEqual(Object.keys(state).sort(), STATE_KEYS);
  assert.deepEqual(Object.keys(state.counters).sort(), COUNTER_KEYS);
  assert.deepEqual(state.limits, { maxEvents: 500, maxBytes: 8388608 });
  assert.equal(state.captureVersion, 1);
  assert.match(state.dataFile, /^events-\d{6}\.ndjson$/);

  // O lock observado enquanto é segurado (no rename do state.json).
  const real = createStoreIo();
  const seen = [];
  const io = {
    ...real,
    async rename(from, to) {
      if (path.basename(to) === "state.json") seen.push(readFileSync(path.join(storeDir(root), ".lock"), "utf8"));
      return real.rename(from, to);
    },
  };
  assert.equal((await runPrivacyCommand({ argv: ["stop", "--root", root, "--capture", id], io })).exitCode, 0);
  assert.equal(seen.length, 1);
  const lock = JSON.parse(seen[0]);
  assert.deepEqual(Object.keys(lock).sort(), ["lockVersion", "nonce", "pid"]);
  assert.equal(lock.lockVersion, 1);
  assert.equal(lock.pid, process.pid);
  assert.match(lock.nonce, /^[0-9a-f]{16}$/);
  assert.ok(!existsSync(path.join(storeDir(root), ".lock")), "lock liberado");
});

test("I5-C32s códigos de uso e de estado do lote de armazenamento, sem eco", () => {
  const root = makeScratch("i5 c32s");
  const id = runPrivacy(["start", "--root", root]).body.capture.id;
  const canary = "SKILLME-CANARY-flag";
  const cases = [
    [[], 2, "unknown_command", null],
    // Lote D1: ingest/export existem (antes saíam unknown_command pela linha
    // "Roteamento parcial"); comandos da #8 continuam desconhecidos.
    [["ingest", "--root", root], 2, "missing_capture", "ingest"],
    [["export", "--root", root], 2, "missing_capture", "export"],
    [["follow", "--root", root], 2, "unknown_command", null],
    [["list", "--root", root], 2, "unknown_command", null],
    [[canary], 2, "unknown_command", null],
    [["status", "--root", root, "--capture", id, `--${canary}`], 2, "unknown_flag", "status"],
    [["status", "--root", root, "--capture"], 2, "missing_flag_value", "status"],
    [["status", "--root", root], 2, "missing_capture", "status"],
    [["status", "--capture", id], 2, "missing_root", "status"],
    [["status", "--root", root, "--capture", `../${canary}`], 2, "invalid_capture_id", "status"],
    [["status", "--root", root, "--capture", id.toUpperCase()], 2, "invalid_capture_id", "status"],
    [["status", "--root", root, "--capture", id, canary], 2, "unexpected_argument", "status"],
    [["start", "--root", root, "--capture", id], 2, "unknown_flag", "start"],
    [["status", "--root", root, "--capture", "f".repeat(32)], 3, "capture_not_found", "status"],
  ];
  for (const [argv, exit, code, command] of cases) {
    const result = runPrivacy(argv);
    assert.equal(result.status, exit, `${argv.join(" ")}`);
    assert.deepEqual(result.body, { schemaVersion: 1, command, status: "error", error: { code } }, argv.join(" "));
    assertClosedOutput(result, root);
    assert.ok(!result.stdout.includes(canary));
  }

  writeFileSync(path.join(captureDir(root, id), "state.json"), "{não é json");
  const invalid = runPrivacy(["status", "--root", root, "--capture", id]);
  assert.equal(invalid.status, 3);
  assert.deepEqual(invalid.body.error, { code: "capture_invalid" });

  const broken = makeScratch("i5 c32s store");
  mkdirSync(path.join(broken, "skill-me-privacy"));
  writeFileSync(path.join(broken, "skill-me-privacy", "store.json"), '{"skillMePrivacyStore":2}');
  const before = snapshotTree(broken);
  for (const argv of [["start"], ["status", "--capture", id]]) {
    const result = runPrivacy([argv[0], "--root", broken, ...argv.slice(1)]);
    assert.equal(result.status, 3, argv[0]);
    assert.deepEqual(result.body.error, { code: "store_invalid" }, argv[0]);
  }
  assert.deepEqual(snapshotTree(broken), before);
});

// ── Lote D1: ingest, export e política pelo processo real do CLI ──

const ingest = (root, id, agent, entries, options = {}) =>
  runPrivacy(["ingest", "--root", root, "--capture", id, "--agent", agent], { input: typeof entries === "string" ? entries : ndjson(entries), ...options });
const exportOf = (root, id, options) => runPrivacy(["export", "--root", root, "--capture", id], options);
const fieldOf = (record, name) => record.content?.fields.find((f) => f.field === name);
const probeLog = (file) => readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
const PSEUDONYM = /^h1:[A-Za-z0-9_-]{43}$/;
const R = "[removido]";

test("I5-C3 variáveis herdadas e configurações de agente no cwd não ativam conteúdo", async () => {
  const cwd = makeScratch("i5 c3 cwd");
  mkdirSync(path.join(cwd, ".claude"));
  writeFileSync(path.join(cwd, ".claude", "settings.json"), JSON.stringify({ skillMe: { content: true }, env: { SKILL_ME_CONTENT: "1" } }));
  mkdirSync(path.join(cwd, ".codex"));
  writeFileSync(path.join(cwd, ".codex", "config.toml"), "[skill_me]\ncontent = true\n");
  writeFileSync(path.join(cwd, ".skill-me.json"), JSON.stringify({ content: true, includeContent: true }));
  const env = baseEnv({
    SKILL_ME_CONTENT: "1",
    SKILL_ME_PRIVACY_CONTENT: "true",
    SKILL_ME_INCLUDE_CONTENT: "1",
    CLAUDE_CONTENT: "1",
    CLAUDE_CODE_SKILL_ME_CONTENT: "1",
    CODEX_CONTENT: "1",
    CODEX_HOME: path.join(cwd, ".codex"),
    CLAUDE_CONFIG_DIR: path.join(cwd, ".claude"),
  });
  const root = makeScratch("i5 c3");
  const start = runPrivacy(["start", "--root", root], { env, cwd });
  assert.equal(start.body.capture.content, false);
  const result = ingest(root, start.body.capture.id, "claude", [claudePayload("pre_tool_bash"), claudePayload("post_tool_bash")], { env, cwd });
  assert.deepEqual(result.body.batch.contentOmitted, { content_disabled: 2 });
  for (const record of exportOf(root, start.body.capture.id, { env, cwd }).body.records) {
    assert.equal(record.content, null);
    assert.deepEqual(record.privacy, ["content:content_disabled"]);
  }
  const hookRun = await runClaudeHandler({ command: process.execPath, args: [INTEGRATIONS_CLI, "hook", "--agent", "claude"] }, claudePayload("pre_tool_bash"), { env, cwd });
  assert.equal(hookRun.report.counters.privacy.content_disabled, 1);
  assert.ok(!hookRun.fd3.includes("SKILLME-CANARY"));
});

test("I5-C4b com --content o CLI real grava args e results sanitizados para claude, codex-hooks e codex-exec", () => {
  const root = makeScratch("i5 c4b");
  const id = runPrivacy(["start", "--root", root, "--content"]).body.capture.id;
  assert.equal(ingest(root, id, "claude", [claudePayload("pre_tool_bash", { tool_input: { command: "ls /home/ana", description: "listar" } }), claudePayload("post_tool_bash", { tool_input: { command: "ls" }, tool_response: { stdout: "saída ç", stderr: "Bearer abcdefgh1234" } })]).status, 0);
  assert.equal(ingest(root, id, "codex-hooks", [codexHookPayload("post_tool_bash", { tool_input: { command: "env" }, tool_response: { output: "ok password=x" } })]).status, 0);
  assert.equal(ingest(root, id, "codex-exec", [execEvent("item_completed_command", { command: "echo 1", aggregated_output: "1\n" }), execEvent("item_completed_mcp_tool_call", { arguments: { q: "x" }, result: { content: [{ type: "text", text: "r" }] } })]).status, 0);
  const records = exportOf(root, id).body.records;
  assert.equal(records.length, 5);
  const [pre, post, codexPost, command, mcp] = records;
  assert.deepEqual(pre.content, { contentVersion: 1, tool: "Bash", fields: [{ field: "tool_input.command", role: "args", kind: "text", value: "ls <home>", truncated: false }, { field: "tool_input.description", role: "args", kind: "text", value: "listar", truncated: false }] });
  assert.equal(fieldOf(post, "tool_response.stdout").value, "saída ç");
  assert.equal(fieldOf(post, "tool_response.stderr").value, `Bearer ${R}`);
  assert.equal(fieldOf(codexPost, "tool_input.command").value, "env");
  assert.equal(fieldOf(codexPost, "tool_response.output").value, `ok password=${R}`);
  assert.deepEqual(command.content.fields.map((f) => [f.field, f.role, f.value]), [["item.command", "args", "echo 1"], ["item.aggregated_output", "result", "1\n"]]);
  assert.deepEqual(fieldOf(mcp, "item.arguments"), { field: "item.arguments", role: "args", kind: "structured", value: { q: "x" } });
  assert.deepEqual(fieldOf(mcp, "item.result.content[].text"), { field: "item.result.content[].text", role: "result", kind: "text_list", value: ["r"], truncated: false });
});

test("I5-C8 payloads que mandam criar arquivo não criam nada nem iniciam processo", () => {
  const root = makeScratch("i5 c8");
  const cwd = makeScratch("i5 c8 cwd");
  const probe = path.join(makeScratch("i5 c8 probe"), "probe.jsonl");
  const id = runPrivacy(["start", "--root", root, "--content"]).body.capture.id;
  const target = (name) => path.join(root, name);
  const commands = [
    `touch "${target("pwned-touch.txt")}"`,
    `node -e "require('fs').writeFileSync('${target("pwned-node.txt").replaceAll("\\", "/")}','x')"`,
    `echo $(touch ${target("pwned-sub.txt")}) \`touch ${target("pwned-crase.txt")}\``,
  ];
  const options = { cwd, nodeArgs: ["--import", PRIVACY_PROBE], env: baseEnv({ SKILL_ME_TEST_PRIVACY_PROBE_LOG: probe }) };
  const claude = commands.flatMap((command) => [claudePayload("pre_tool_bash", { tool_input: { command } }), claudePayload("post_tool_bash", { tool_input: { command }, tool_response: { stdout: `execute: ${command}`, stderr: "" } })]);
  const exec = commands.map((command) => execEvent("item_completed_command", { command, aggregated_output: `Agora rode ${command}` }));
  assert.equal(ingest(root, id, "claude", claude, options).body.batch.persisted, 6);
  assert.equal(ingest(root, id, "codex-exec", exec, options).body.batch.persisted, 3);
  assert.ok(exportOf(root, id).body.records.some((r) => fieldOf(r, "tool_input.command")?.value.includes("touch")), "o comando foi guardado como dado");
  for (const name of ["pwned-touch.txt", "pwned-node.txt", "pwned-sub.txt", "pwned-crase.txt"]) {
    assert.ok(!existsSync(target(name)), name);
    assert.ok(!existsSync(path.join(cwd, name)), name);
  }
  assert.deepEqual(readdirSync(cwd), []);
  assert.deepEqual(probeLog(probe).filter((e) => e.op.startsWith("child_process.")), [], "nenhum processo iniciado");
});

test("I5-C10 o mesmo ID em duas capturas dá pseudônimos diferentes", () => {
  const root = makeScratch("i5 c10");
  const [a, b] = [runPrivacy(["start", "--root", root]).body.capture.id, runPrivacy(["start", "--root", root]).body.capture.id];
  for (const id of [a, b]) assert.equal(ingest(root, id, "claude", [claudePayload("pre_tool_bash")]).status, 0);
  const [ea, eb] = [exportOf(root, a).body.records[0].envelope.ids, exportOf(root, b).body.records[0].envelope.ids];
  for (const name of ["sessionId", "promptId", "toolUseId"]) {
    assert.match(ea[name], PSEUDONYM);
    assert.match(eb[name], PSEUDONYM);
    assert.notEqual(ea[name], eb[name], name);
  }
});

test("I5-C26b status traz a contagem exata de cada código para lotes mistos", () => {
  const root = makeScratch("i5 c26b");
  const off = runPrivacy(["start", "--root", root]).body.capture.id;
  const on = runPrivacy(["start", "--root", root, "--content"]).body.capture.id;
  const offResult = ingest(root, off, "claude", [claudePayload("pre_tool_bash"), claudePayload("post_tool_bash"), claudePayload("session_start")]);
  assert.deepEqual(offResult.body.batch.contentOmitted, { content_disabled: 2 });
  const bash = (command, extra = {}) => claudePayload("pre_tool_bash", { tool_input: { command }, ...extra });
  const mixed = [
    claudePayload("pre_tool_bash", { tool_name: "WebFetch", tool_input: { url: "https://x.test" } }),
    bash("a\u0000b"),
    bash("password=x1"),
    bash("y".repeat(20000)),
    bash(`password=x2 ${"z".repeat(20000)}`),
    bash("ls", { tool_name: "dir/x" }),
  ];
  const expected = { unsupported_content: 2, unsanitizable: 1, sensitive_removed: 3, content_truncated: 2 };
  assert.deepEqual(ingest(root, on, "claude", mixed).body.batch.contentOmitted, expected);
  assert.deepEqual(runPrivacy(["status", "--root", root, "--capture", on]).body.capture.counters.contentOmitted, expected);
  assert.deepEqual(runPrivacy(["status", "--root", root, "--capture", off]).body.capture.counters.contentOmitted, { content_disabled: 2 });
});

test("I5-C27 contentOmitted e dropped são separados e o status tem conjunto de chaves exato, sem cobertura", () => {
  const root = makeScratch("i5 c27");
  const id = runPrivacy(["start", "--root", root]).body.capture.id;
  const lines = [execEvent("item_completed_command"), execEvent("item_completed_reasoning"), fixtureCase("codex-exec.json", "unknown_type").event, execEvent("thread_started")];
  const result = ingest(root, id, "codex-exec", lines);
  assert.deepEqual(result.body.batch, { accepted: 2, persisted: 2, malformed: {}, dropped: { reasoning_excluded: 1, unknown_event: 1 }, contentOmitted: { content_disabled: 1 } });
  const status = runPrivacy(["status", "--root", root, "--capture", id]);
  assert.deepEqual(Object.keys(status.body).sort(), ["capture", "command", "schemaVersion", "status"]);
  assert.deepEqual(Object.keys(status.body.capture).sort(), ["content", "counters", "createdAt", "dataBytes", "endedAt", "id", "limits", "retentionDays", "state"]);
  assert.deepEqual(status.body.capture.counters, { accepted: 2, persisted: 2, malformed: 0, dropped: { reasoning_excluded: 1, unknown_event: 1 }, contentOmitted: { content_disabled: 1 } });
  assert.ok(!/coverage|complete|cobertura|completo/i.test(status.stdout));
});

test("I5-C30 falha de rename na gravação: ingest sai 5 io_failure, estado e dados anteriores idênticos, nenhum temporário", () => {
  const root = makeScratch("i5 c30");
  const id = runPrivacy(["start", "--root", root]).body.capture.id;
  assert.equal(ingest(root, id, "claude", [claudePayload("pre_tool_bash")]).status, 0);
  for (const target of ["state.json", "events-000002.ndjson"]) {
    const before = snapshotTree(root);
    const failed = ingest(root, id, "claude", [claudePayload("post_tool_bash")], { nodeArgs: ["--import", FS_PROBE], env: baseEnv({ SKILL_ME_TEST_FS_PROBE_FAIL_RENAME_TO: target }) });
    assert.equal(failed.status, 5, target);
    assert.deepEqual(failed.body, { schemaVersion: 1, command: "ingest", status: "error", error: { code: "io_failure" } });
    assertClosedOutput(failed, root);
    assert.deepEqual(snapshotTree(root), before, `${target}: estado e dados idênticos, sem temporário nem lock`);
  }
  assert.equal(runPrivacy(["status", "--root", root, "--capture", id]).body.capture.counters.persisted, 1);
});

test("I5-C32 cada código de erro do privacy sai de um cenário real com JSON exato e sem eco", () => {
  const root = makeScratch("i5 c32");
  const canary = "SKILLMECANARYflag";
  const active = runPrivacy(["start", "--root", root]).body.capture.id;
  const stopped = runPrivacy(["start", "--root", root]).body.capture.id;
  runPrivacy(["stop", "--root", root, "--capture", stopped]);
  const disabled = runPrivacy(["start", "--root", root]).body.capture.id;
  runPrivacy(["disable", "--root", root, "--capture", disabled]);
  const file = path.join(makeScratch("i5 c32 arquivo"), "raiz.txt");
  writeFileSync(file, "x");
  const missingRoot = path.join(root, "não existe");
  const broken = makeScratch("i5 c32 store");
  mkdirSync(path.join(broken, "skill-me-privacy"));
  writeFileSync(path.join(broken, "skill-me-privacy", "store.json"), "{}");
  const invalidCapture = runPrivacy(["start", "--root", root]).body.capture.id;
  writeFileSync(path.join(captureDir(root, invalidCapture), "state.json"), `{"id":"${canary}"}`);
  const stdinCanary = ndjson([claudePayload("pre_tool_bash", { tool_input: { command: CANARIES.token } })]);

  const cases = [
    [[], 2, "unknown_command", null],
    [["status", "--root", root, "--capture", active, `--${canary}`], 2, "unknown_flag", "status"],
    [["status", "--root", root, "--capture"], 2, "missing_flag_value", "status"],
    [["export", "--capture", active], 2, "missing_root", "export"],
    [["ingest", "--root", root, "--agent", "claude"], 2, "missing_capture", "ingest"],
    [["export", "--root", root, "--capture", canary], 2, "invalid_capture_id", "export"],
    [["ingest", "--root", root, "--capture", active, "--agent", canary], 2, "invalid_agent", "ingest"],
    [["ingest", "--root", root, "--capture", active], 2, "invalid_agent", "ingest"],
    [["start", "--root", root, "--retention-days", canary], 2, "invalid_retention", "start"],
    [["export", "--root", root, "--capture", active, canary], 2, "unexpected_argument", "export"],
    [["export", "--root", missingRoot, "--capture", active], 3, "root_not_found", "export"],
    [["ingest", "--root", file, "--capture", active, "--agent", "claude"], 3, "root_not_directory", "ingest"],
    [["export", "--root", broken, "--capture", active], 3, "store_invalid", "export"],
    [["export", "--root", root, "--capture", "f".repeat(32)], 3, "capture_not_found", "export"],
    [["export", "--root", root, "--capture", invalidCapture], 3, "capture_invalid", "export"],
    [["ingest", "--root", root, "--capture", stopped, "--agent", "claude"], 3, "capture_not_active", "ingest"],
    [["delete", "--root", root, "--capture", active, "--apply"], 3, "capture_active", "delete"],
    [["stop", "--root", root, "--capture", disabled], 3, "invalid_transition", "stop"],
  ];
  for (const [argv, exit, code, command] of cases) {
    const result = runPrivacy(argv, { input: stdinCanary });
    assert.equal(result.status, exit, argv.join(" "));
    assert.deepEqual(result.body, { schemaVersion: 1, command, status: "error", error: { code } }, argv.join(" "));
    assertClosedOutput(result, root);
    for (const forbidden of [canary, CANARIES.token, MARKER, file, missingRoot, broken, path.basename(broken)]) assert.ok(!result.stdout.includes(forbidden), `${argv.join(" ")}: ${forbidden}`);
  }

  // 4: lock alheio, link para a pasta do store, entrada alheia e raiz trocada durante a operação.
  const lockRoot = makeScratch("i5 c32 lock");
  const lockId = runPrivacy(["start", "--root", lockRoot]).body.capture.id;
  writeFileSync(path.join(storeDir(lockRoot), ".lock"), "alheio");
  const linked = makeScratch("i5 c32 link");
  symlinkSync(storeDir(root), path.join(linked, "skill-me-privacy"), "junction");
  const foreign = runPrivacy(["start", "--root", root]).body.capture.id;
  runPrivacy(["stop", "--root", root, "--capture", foreign]);
  writeFileSync(path.join(captureDir(root, foreign), "notas.txt"), canary);
  const swapBase = makeScratch("i5 c32 troca");
  const realA = path.join(swapBase, "a");
  const realB = path.join(swapBase, "b");
  mkdirSync(realA);
  mkdirSync(realB);
  const swapId = runPrivacy(["start", "--root", realA]).body.capture.id;
  const swapLink = path.join(swapBase, "raiz");
  symlinkSync(realA, swapLink, "junction");
  const probeEnv = (extra) => ({ nodeArgs: ["--import", PRIVACY_PROBE], env: baseEnv(extra) });
  const conflicts = [
    [["ingest", "--root", lockRoot, "--capture", lockId, "--agent", "claude"], "lock_present", "ingest", lockRoot, {}],
    [["export", "--root", linked, "--capture", active], "link_refused", "export", linked, {}],
    [["delete", "--root", root, "--capture", foreign, "--apply"], "foreign_entry", "delete", root, {}],
    [["export", "--root", swapLink, "--capture", swapId], "root_changed", "export", swapLink, probeEnv({ SKILL_ME_TEST_PRIVACY_PROBE_RETARGET_ON_LOCK: `${swapLink}|${realB}` })],
  ];
  for (const [argv, code, command, base, options] of conflicts) {
    const result = runPrivacy(argv, { input: stdinCanary, ...options });
    assert.equal(result.status, 4, code);
    assert.deepEqual(result.body, { schemaVersion: 1, command, status: "error", error: { code } });
    assertClosedOutput(result, base);
    assert.ok(!result.stdout.includes(canary) && !result.stdout.includes(MARKER));
  }
  assert.ok(existsSync(path.join(storeDir(realA), "captures", swapId)), "nada mudou na raiz original");
  assert.deepEqual(readdirSync(realB), [], "nada criado no novo alvo");

  // 5: falha de E/S na gravação e exclusão parcial.
  const io = ingest(root, active, "claude", [claudePayload("pre_tool_bash")], { nodeArgs: ["--import", FS_PROBE], env: baseEnv({ SKILL_ME_TEST_FS_PROBE_FAIL_RENAME_TO: "state.json" }) });
  assert.equal(io.status, 5);
  assert.deepEqual(io.body, { schemaVersion: 1, command: "ingest", status: "error", error: { code: "io_failure" } });
  assertClosedOutput(io, root);
  const partial = runPrivacy(["delete", "--root", root, "--capture", stopped, "--apply"], probeEnv({ SKILL_ME_TEST_PRIVACY_PROBE_FAIL_UNLINK: "key" }));
  assert.equal(partial.status, 5);
  assert.deepEqual(partial.body, { schemaVersion: 1, command: "delete", status: "error", error: { code: "partial_delete" } });
  assertClosedOutput(partial, root);
  assert.ok(existsSync(path.join(storeDir(root), "captures", `.deleting-${stopped}`)), "falha parcial visível");
  assert.equal(runPrivacy(["delete", "--root", root, "--capture", stopped, "--apply"]).status, 0, "nova exclusão conclui");
});

function fixtureEntries(agent) {
  if (agent === "claude") return loadFixture("claude-hooks.json").cases.map((c) => c.payload);
  if (agent === "codex-hooks") return loadFixture("codex-hooks.json").cases.map((c) => c.payload);
  if (agent === "codex-exec") return loadFixture("codex-exec.json").cases.map((c) => c.event ?? c.rawLine);
  return loadFixture("hermes-hooks.json").cases.map((c) => ({ hook: c.hook, kwargs: c.kwargs, nonScalar: [] }));
}

function secretEntries(agent) {
  if (agent === "claude") return [claudePayload("pre_tool_bash", { tool_input: { command: SECRET_TEXT } }), claudePayload("post_tool_bash", { tool_response: { stdout: SECRET_TEXT, stderr: SECRET_TEXT } })];
  if (agent === "codex-hooks") return [codexHookPayload("post_tool_bash", { tool_input: { command: SECRET_TEXT }, tool_response: { output: SECRET_TEXT } })];
  if (agent === "codex-exec") return [execEvent("item_completed_command", { command: SECRET_TEXT, aggregated_output: SECRET_TEXT }), execEvent("item_completed_mcp_tool_call", { arguments: { q: SECRET_TEXT, api_key: SECRET_TEXT } })];
  return [hermesRecord("post_tool_call", { result: SECRET_TEXT })];
}

test("I5-C39 ingest dos quatro agentes grava só registros v1 válidos e nenhum arquivo, temporário ou lock tem canário", () => {
  const probeDir = makeScratch("i5 c39 probe");
  for (const agent of ["claude", "codex-hooks", "codex-exec", "hermes"]) {
    // Sem opt-in nenhum texto das fixtures da #4 pode ser gravado; com opt-in o
    // texto comum é dado legítimo e só os cinco canários são proibidos — por
    // isso cada combinação tem a própria raiz.
    for (const [optIn, entries, marker] of [[[], fixtureEntries(agent), "SKILLME-CANARY"], [["--content"], secretEntries(agent), MARKER]]) {
      const root = makeScratch(`i5 c39 ${agent} ${optIn.length}`);
      const id = runPrivacy(["start", "--root", root, ...optIn]).body.capture.id;
      const fsLog = path.join(probeDir, `${agent}-${optIn.length}-fs.jsonl`);
      const privacyLog = path.join(probeDir, `${agent}-${optIn.length}-privacy.jsonl`);
      const result = ingest(root, id, agent, entries, {
        nodeArgs: ["--import", FS_PROBE, "--import", PRIVACY_PROBE],
        env: baseEnv({ SKILL_ME_TEST_FS_PROBE_LOG: fsLog, SKILL_ME_TEST_FS_PROBE_CANARY: marker, SKILL_ME_TEST_PRIVACY_PROBE_LOG: privacyLog, SKILL_ME_TEST_PRIVACY_PROBE_MARKER: marker }),
      });
      assert.equal(result.status, 0, `${agent}: ${result.stdout}`);
      assert.ok(result.body.batch.persisted > 0, agent);
      const records = exportOf(root, id).body.records;
      assert.equal(records.length, result.body.batch.persisted);
      for (const record of records) {
        assert.deepEqual(Object.keys(record), ["recordVersion", "envelope", "privacy", "content"]);
        assert.equal(record.recordVersion, 1);
        assert.equal(validateEnvelope(record.envelope), true, agent);
      }
      const observed = probeLog(fsLog);
      assert.ok(observed.some((o) => o.moment === "before_rename"), `${agent}: temporário observado`);
      for (const o of observed) assert.equal(o.containsCanary, false, `${agent}: ${o.file} ${o.moment}`);
      const written = probeLog(privacyLog).filter((e) => e.op === "closed_written");
      assert.ok(written.some((e) => path.basename(e.file) === ".lock"));
      for (const e of written) assert.equal(e.containsMarker, false, `${agent}: ${e.file}`);
      for (const [rel, entry] of Object.entries(snapshotTree(root))) {
        if (entry.type === "file") assert.ok(!readFileSync(path.join(root, rel), "utf8").includes(marker), `${agent}: ${rel}`);
      }
    }
  }
});

test("I5-C40 ingest não inicia processo nem abre arquivo fora de <root>/skill-me-privacy/", () => {
  const root = makeScratch("i5 c40");
  const id = runPrivacy(["start", "--root", root, "--content"]).body.capture.id;
  const log = path.join(makeScratch("i5 c40 probe"), "probe.jsonl");
  const options = { nodeArgs: ["--import", PRIVACY_PROBE], env: baseEnv({ SKILL_ME_TEST_PRIVACY_PROBE_LOG: log }) };
  for (const agent of ["claude", "codex-hooks", "codex-exec", "hermes"]) {
    const entries = [...fixtureEntries(agent), ...secretEntries(agent)];
    assert.equal(ingest(root, id, agent, entries, options).status, 0, agent);
  }
  const entries = probeLog(log);
  const storePrefix = storeDir(root) + path.sep;
  // O carregador ESM do Node lê o código do próprio CLI por `fs.readFileSync`
  // (que abre por `fs.openSync`): fonte do programa, não dado do usuário. Só
  // esses arquivos são aceitos fora do store.
  const ownSource = (entry) => ["fs.readFileSync", "fs.openSync"].includes(entry.op) && entry.file.startsWith(path.join(REPO_ROOT, "src") + path.sep) && /\.(mjs|json)$/.test(entry.file);
  const fileOps = entries.filter((e) => typeof e.file === "string" && !ownSource(e));
  assert.ok(fileOps.some((e) => e.file.startsWith(storePrefix)), "aberturas do store registradas");
  for (const entry of fileOps) assert.ok(entry.file.startsWith(storePrefix), `${entry.op} fora do store: ${entry.file}`);
  assert.ok(entries.some(ownSource), "a sonda viu o carregamento do próprio código");
  assert.deepEqual(entries.filter((e) => e.op.startsWith("child_process.") || e.op === "network"), []);
});

test("I5-C42 captura stopped ou disabled recusa ingest com capture_not_active e árvore idêntica", () => {
  const root = makeScratch("i5 c42");
  for (const action of ["stop", "disable"]) {
    const id = runPrivacy(["start", "--root", root, "--content"]).body.capture.id;
    assert.equal(ingest(root, id, "claude", [claudePayload("pre_tool_bash")]).status, 0);
    assert.equal(runPrivacy([action, "--root", root, "--capture", id]).status, 0);
    const before = snapshotTree(root);
    const refused = ingest(root, id, "claude", [claudePayload("post_tool_bash"), claudePayload("pre_tool_bash")]);
    assert.equal(refused.status, 3, action);
    assert.deepEqual(refused.body, { schemaVersion: 1, command: "ingest", status: "error", error: { code: "capture_not_active" } });
    assert.deepEqual(snapshotTree(root), before, action);
  }
});

test("I5-C43 status e export isolados por captura, JSON v1 e --help em português", () => {
  const root = makeScratch("i5 c43");
  const a = runPrivacy(["start", "--root", root]).body.capture.id;
  const b = runPrivacy(["start", "--root", root, "--content"]).body.capture.id;
  ingest(root, a, "claude", [claudePayload("pre_tool_bash")]);
  ingest(root, b, "claude", [claudePayload("pre_tool_bash"), claudePayload("post_tool_bash"), "não é json"]);
  const exportA = exportOf(root, a);
  const exportB = exportOf(root, b);
  assert.equal(exportA.status, 0);
  assert.equal(exportA.body.schemaVersion, 1);
  assert.deepEqual(Object.keys(exportA.body).sort(), ["capture", "command", "records", "schemaVersion", "status"]);
  assert.equal(exportA.body.capture.id, a);
  assert.equal(exportA.body.records.length, 1);
  assert.deepEqual(exportA.body.capture.counters, { accepted: 1, persisted: 1, malformed: 0, dropped: {}, contentOmitted: { content_disabled: 1 } });
  const otherPseudonyms = exportB.body.records.flatMap((r) => Object.values(r.envelope.ids));
  assert.equal(otherPseudonyms.length > 0, true);
  const statusA = runPrivacy(["status", "--root", root, "--capture", a]).stdout;
  for (const forbidden of [b, ...otherPseudonyms]) {
    assert.ok(!exportA.stdout.includes(forbidden), forbidden);
    assert.ok(!statusA.includes(forbidden), forbidden);
  }
  const help = runIntegrations(["privacy", "--help"]);
  assert.equal(help.status, 0);
  assert.equal(help.stderr, "");
  for (const pattern of [/Uso:/, /privacy ingest --root <diretório> --capture <id> --agent <claude\|codex-hooks\|codex-exec\|hermes>/, /privacy export --root <diretório> --capture <id>/, /conteúdo/, /retenção/]) assert.match(help.stdout, pattern);
  for (const argv of [["ingest", "--help"], ["export", "--help"]]) assert.equal(runIntegrations(["privacy", ...argv]).stdout, help.stdout);
});

test("I5-C47 com .lock presente ingest e export saem 4 lock_present sem mutação e o lock alheio fica", () => {
  const root = makeScratch("i5 c47");
  const id = runPrivacy(["start", "--root", root]).body.capture.id;
  ingest(root, id, "claude", [claudePayload("pre_tool_bash")]);
  const lock = path.join(storeDir(root), ".lock");
  writeFileSync(lock, "lock alheio\n");
  const before = snapshotTree(root);
  for (const [command, run] of [["ingest", () => ingest(root, id, "claude", [claudePayload("post_tool_bash", { tool_input: { command: CANARIES.token } })])], ["export", () => exportOf(root, id)]]) {
    const result = run();
    assert.equal(result.status, 4, command);
    assert.deepEqual(result.body, { schemaVersion: 1, command, status: "error", error: { code: "lock_present" } });
    assertClosedOutput(result, root);
    assert.ok(!result.stdout.includes(MARKER));
  }
  assert.deepEqual(snapshotTree(root), before);
  assert.equal(readFileSync(lock, "utf8"), "lock alheio\n");
});

test("I5-C48 depois de stop/disable/delete um ingest atrasado sai 3 e não grava nem recria a captura", () => {
  const root = makeScratch("i5 c48");
  for (const steps of [["stop"], ["disable"], ["stop", "delete"]]) {
    const id = runPrivacy(["start", "--root", root]).body.capture.id;
    ingest(root, id, "claude", [claudePayload("pre_tool_bash")]);
    for (const step of steps) assert.equal(runPrivacy(step === "delete" ? ["delete", "--root", root, "--capture", id, "--apply"] : [step, "--root", root, "--capture", id]).status, 0, step);
    const before = snapshotTree(root);
    const late = ingest(root, id, "claude", [claudePayload("post_tool_bash")]);
    assert.equal(late.status, 3, steps.join("+"));
    assert.equal(late.body.error.code, steps.includes("delete") ? "capture_not_found" : "capture_not_active");
    assert.deepEqual(snapshotTree(root), before);
    if (steps.includes("delete")) assert.ok(!existsSync(captureDir(root, id)), "não recriada");
  }
});

test("I5-C50 a chave nunca aparece em export/status e sai com a captura", () => {
  const root = makeScratch("i5 c50");
  const id = runPrivacy(["start", "--root", root, "--content"]).body.capture.id;
  assert.equal(ingest(root, id, "codex-exec", [execEvent("item_completed_command"), execEvent("item_completed_file_change")]).status, 0);
  const key = readFileSync(path.join(captureDir(root, id), "key"));
  const exported = exportOf(root, id);
  assert.equal(exported.status, 0);
  assert.equal(exported.body.records.length, 2);
  const outputs = [exported.stdout, runPrivacy(["status", "--root", root, "--capture", id]).stdout];
  for (const text of outputs) {
    for (const form of [key.toString("hex"), key.toString("base64"), key.toString("base64url"), key.toString("hex").toUpperCase(), key.toString("latin1")]) assert.ok(!text.includes(form));
    assert.ok(!/"key"/.test(text));
  }
  runPrivacy(["stop", "--root", root, "--capture", id]);
  assert.equal(runPrivacy(["delete", "--root", root, "--capture", id, "--apply"]).status, 0);
  assert.ok(!existsSync(path.join(captureDir(root, id), "key")));
  assert.ok(!existsSync(captureDir(root, id)));
});

test("I5-C52b 510 linhas pelo CLI: persisted 500 e dropped 10 por capture_event_limit", () => {
  const root = makeScratch("i5 c52b");
  const id = runPrivacy(["start", "--root", root]).body.capture.id;
  const lines = Array.from({ length: 510 }, (_, i) => execEvent("item_completed_command", { id: `item_${i}` }));
  const result = ingest(root, id, "codex-exec", lines);
  assert.equal(result.status, 0);
  assert.deepEqual(result.body.batch, { accepted: 500, persisted: 500, malformed: {}, dropped: { capture_event_limit: 10 }, contentOmitted: { content_disabled: 500 } });
  const counters = runPrivacy(["status", "--root", root, "--capture", id]).body.capture.counters;
  assert.equal(counters.persisted, 500);
  assert.deepEqual(counters.dropped, { capture_event_limit: 10 });
  assert.equal(exportOf(root, id).body.records.length, 500);
  const more = ingest(root, id, "codex-exec", [execEvent("item_completed_command")]);
  assert.deepEqual(more.body.batch.dropped, { capture_event_limit: 1 });
});

test("I5-C53 lote misto pelo ingest: accepted, persisted, malformed e dropped exatos, accepted >= persisted", () => {
  const root = makeScratch("i5 c53");
  const id = runPrivacy(["start", "--root", root]).body.capture.id;
  const input =
    [
      JSON.stringify(execEvent("item_started_command")),
      JSON.stringify(execEvent("item_completed_command")),
      JSON.stringify(execEvent("thread_started")),
      JSON.stringify(execEvent("item_completed_reasoning")),
      JSON.stringify(fixtureCase("codex-exec.json", "unknown_type").event),
      fixtureCase("codex-exec.json", "invalid_json_line").rawLine,
      fixtureCase("codex-exec.json", "non_object_line").rawLine,
      "y".repeat(64 * 1024 + 1),
      "",
    ].join("\n") + '{"type":"turn.started"';
  const result = ingest(root, id, "codex-exec", input);
  assert.equal(result.status, 0);
  assert.deepEqual(result.body.batch, {
    accepted: 3,
    persisted: 3,
    malformed: { invalid_json: 1, invalid_input: 1, oversize_line: 1, partial_trailing_line: 1 },
    dropped: { reasoning_excluded: 1, unknown_event: 1 },
    contentOmitted: { content_disabled: 2 },
  });
  const counters = runPrivacy(["status", "--root", root, "--capture", id]).body.capture.counters;
  assert.deepEqual(counters, { accepted: 3, persisted: 3, malformed: 4, dropped: { reasoning_excluded: 1, unknown_event: 1 }, contentOmitted: { content_disabled: 2 } });
  assert.ok(counters.accepted >= counters.persisted);
});

test("I5-C54 state.json e .lock têm exatamente as chaves do Landing e nenhum canário depois de ingest real", async () => {
  const root = makeScratch("i5 c54");
  const id = await startIn(root, ["--content"]);
  const real = createStoreIo();
  const locks = [];
  const io = {
    ...real,
    async rename(from, to) {
      if (path.basename(to) === "state.json") locks.push(readFileSync(path.join(storeDir(root), ".lock"), "utf8"));
      return real.rename(from, to);
    },
  };
  const stdin = Readable.from([Buffer.from(ndjson(secretEntries("claude")))]);
  const result = await runPrivacyCommand({ argv: ["ingest", "--root", root, "--capture", id, "--agent", "claude"], stdin, io });
  assert.equal(result.exitCode, 0, JSON.stringify(result.body));
  assert.equal(locks.length, 1);
  const lock = JSON.parse(locks[0]);
  assert.deepEqual(Object.keys(lock).sort(), ["lockVersion", "nonce", "pid"]);
  assert.ok(!locks[0].includes(MARKER));
  const stateText = readFileSync(path.join(captureDir(root, id), "state.json"), "utf8");
  assert.ok(!stateText.includes(MARKER));
  const state = JSON.parse(stateText);
  assert.deepEqual(Object.keys(state).sort(), STATE_KEYS);
  assert.deepEqual(Object.keys(state.counters).sort(), COUNTER_KEYS);
  assert.equal(state.counters.persisted, 2);
});
