import assert from "node:assert/strict";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { runPrivacyCommand } from "../../../src/integrations/privacy/command.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { makeScratch, runIntegrations } from "../helpers/cli.mjs";
import { appendSanitized, runPrivacy, startIn } from "../helpers/privacy-store.mjs";
import { snapshotTree } from "../helpers/tree.mjs";

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
    [["ingest", "--root", root], 2, "unknown_command", null],
    [["export", "--root", root], 2, "unknown_command", null],
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
