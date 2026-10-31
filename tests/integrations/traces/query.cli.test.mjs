import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { isDeepStrictEqual } from "node:util";
import { runPrivacyCommand } from "../../../src/integrations/privacy/command.mjs";
import { makeScratch } from "../helpers/cli.mjs";
import { claudePayload, execEvent, hermesRecord } from "../helpers/privacy-canaries.mjs";
import { runPrivacy } from "../helpers/privacy-store.mjs";
import {
  boundEnv,
  captureDir,
  capturesDir,
  explainedUnless,
  exportOf,
  privacyOk,
  recordProducersInEachTest,
  runHermesIngest,
  runHook,
  startCapture,
  statusOf,
  storeDir,
  timedEnv,
} from "../helpers/traces.mjs";
import { snapshotTree } from "../helpers/tree.mjs";
import { runWrapper, writeScenario } from "../helpers/wrapper.mjs";

// Evidência comum dos produtores quando um teste falha (issue #25, linha
// "Evidência comum dos produtores e formatter legado" do Landing): helpers/traces.mjs.
recordProducersInEachTest();

// Provas S2 da issue #8 (C9–C11 e C14): `list`, `export` e ciclo de vida pelo
// CLI real, sobre capturas alimentadas pelos produtores vinculados.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

const DAY_MS = 86_400_000;
const PUBLIC_KEYS = ["content", "counters", "createdAt", "dataBytes", "endedAt", "id", "limits", "retentionDays", "state"];
const LIMITS = { maxEvents: 500, maxBytes: 8 * 1024 * 1024 };
const at = (ms) => () => ms;

async function startAt(root, ms, extra = []) {
  const result = await runPrivacyCommand({ argv: ["start", "--root", root, ...extra], now: at(ms) });
  assert.equal(result.exitCode, 0, JSON.stringify(result.body));
  return result.body.capture.id;
}

function list(root, after) {
  const result = runPrivacy(["list", "--root", root, ...(after === undefined ? [] : ["--after", after])]);
  assert.equal(result.stderr, "");
  return result;
}

// Ordem do contrato: `createdAt` e, no empate, `id`.
const byCreation = (a, b) => (a.createdAt === b.createdAt ? (a.id < b.id ? -1 : 1) : a.createdAt < b.createdAt ? -1 : 1);

test("T8-C9 list pages and metadata: até 100 por página em createdAt,id; --after continua sem repetir e traz estado, limites e contadores", async () => {
  const root = scratch("t8 c9 raiz");
  const t0 = Date.parse("2026-05-01T10:00:00.000Z");
  const created = [];
  // 201 capturas criadas fora da ordem final, com instantes repetidos (empate por id).
  for (let i = 0; i < 201; i++) {
    const ms = t0 + ((i * 37) % 67) * 1000;
    created.push({ id: await startAt(root, ms), createdAt: new Date(ms).toISOString() });
  }
  const expected = [...created].sort(byCreation).map((c) => c.id);
  assert.ok(created.some((c, i) => created.findIndex((d) => d.createdAt === c.createdAt) !== i), "há empates de createdAt");
  // Metadados reais: uma captura encerrada e uma com registros de um produtor.
  const stopped = expected[150];
  assert.equal((await runPrivacyCommand({ argv: ["stop", "--root", root, "--capture", stopped], now: at(t0 + DAY_MS) })).exitCode, 0);
  const withData = expected[42];
  assert.equal((await runHook("claude", claudePayload("pre_tool_bash"), { env: boundEnv(root, withData) })).status, 0);

  const pages = [];
  let after;
  do {
    const result = list(root, after);
    assert.equal(result.status, 0, result.stdout);
    assert.deepEqual(Object.keys(result.body).sort(), ["captures", "command", "nextAfter", "schemaVersion", "status"]);
    assert.deepEqual([result.body.schemaVersion, result.body.command, result.body.status], [1, "list", "ok"]);
    pages.push(result.body);
    after = result.body.nextAfter ?? undefined;
  } while (after !== undefined && pages.length < 10);
  assert.deepEqual(pages.map((p) => p.captures.length), [100, 100, 1]);
  assert.deepEqual(pages.map((p) => p.nextAfter), [expected[99], expected[199], null]);
  const listed = pages.flatMap((p) => p.captures);
  assert.deepEqual(listed.map((c) => c.id), expected, "ordem createdAt,id sem repetição nem lacuna");
  for (const capture of listed) {
    assert.deepEqual(Object.keys(capture).sort(), PUBLIC_KEYS);
    assert.deepEqual(capture.limits, LIMITS);
  }
  for (const id of [stopped, withData, expected[0], expected[200]]) {
    assert.deepEqual(listed.find((c) => c.id === id), statusOf(root, id), `${id}: mesmos dados do status`);
  }
  const stoppedEntry = listed.find((c) => c.id === stopped);
  assert.deepEqual([stoppedEntry.state, stoppedEntry.endedAt], ["stopped", new Date(t0 + DAY_MS).toISOString()]);
  assert.deepEqual(listed.find((c) => c.id === withData).counters, { accepted: 1, persisted: 1, malformed: 0, dropped: {}, contentOmitted: { content_disabled: 1 } });

  // Depois da última captura não há mais nada; exatamente 100 cabem numa página.
  assert.deepEqual(list(root, expected[200]).body.captures, []);
  assert.equal(list(root, expected[200]).body.nextAfter, null);
  const hundred = scratch("t8 c9 cem");
  for (let i = 0; i < 100; i++) await startAt(hundred, t0 + i);
  const single = list(hundred);
  assert.equal(single.body.captures.length, 100);
  assert.equal(single.body.nextAfter, null);
});

test("T8-C10 list invalid store: raiz ausente, link e estado inválido saem com código fechado, sem criar arquivos", async () => {
  const base = scratch("t8 c10");
  const check = (root, exit, code, label, extra = {}) => {
    const before = existsSync(base) ? snapshotTree(base) : null;
    const result = list(root, extra.after);
    assert.equal(result.status, exit, `${label}: ${result.stdout}`);
    assert.equal(result.body.status, exit === 0 ? "ok" : "error", label);
    if (code !== null) assert.deepEqual(result.body.error, { code }, label);
    for (const forbidden of [base, path.basename(base), "Error", "at "]) assert.ok(!result.stdout.includes(forbidden), `${label}: eco`);
    assert.deepEqual(snapshotTree(base), before, `${label}: nada criado ou alterado`);
    return result.body;
  };

  check(path.join(base, "não existe"), 3, "root_not_found", "raiz ausente");
  writeFileSync(path.join(base, "arquivo.txt"), "x");
  check(path.join(base, "arquivo.txt"), 3, "root_not_directory", "raiz é arquivo");
  const empty = path.join(base, "vazia ação");
  mkdirSync(empty);
  assert.deepEqual(check(empty, 0, null, "sem store"), { schemaVersion: 1, command: "list", status: "ok", captures: [], nextAfter: null });
  assert.deepEqual(readdirSync(empty), [], "list não cria a pasta do store");
  check(empty, 3, "capture_not_found", "cursor sem store", { after: "a".repeat(32) });

  // Pasta do store por junção/link.
  const real = path.join(base, "real");
  mkdirSync(real);
  startCapture(real);
  const linked = path.join(base, "com link");
  mkdirSync(linked);
  symlinkSync(storeDir(real), storeDir(linked), "junction");
  check(linked, 4, "link_refused", "store por link");

  // Marcador alheio.
  const foreign = path.join(base, "alheia");
  mkdirSync(path.join(foreign, "skill-me-privacy"), { recursive: true });
  writeFileSync(path.join(foreign, "skill-me-privacy", "store.json"), '{"skillMePrivacyStore":2}');
  check(foreign, 3, "store_invalid", "marcador alheio");

  // Uma captura com estado inválido ou por link impede a página inteira e aparece em `failed`.
  const invalid = path.join(base, "estado inválido");
  mkdirSync(invalid);
  startCapture(invalid);
  const bad = startCapture(invalid);
  writeFileSync(path.join(captureDir(invalid, bad), "state.json"), '{"captureVersion":1}');
  assert.deepEqual(check(invalid, 3, "capture_invalid", "estado inválido").failed, [{ capture: bad, code: "capture_invalid" }]);
  const withLink = path.join(base, "captura por link");
  mkdirSync(withLink);
  startCapture(withLink);
  const elsewhere = path.join(base, "fora");
  mkdirSync(elsewhere);
  symlinkSync(elsewhere, captureDir(withLink, "d".repeat(32)), "junction");
  assert.deepEqual(check(withLink, 4, "link_refused", "captura por link").failed, [{ capture: "d".repeat(32), code: "link_refused" }]);
  // Nomes alheios e exclusão interrompida ficam fora da lista, preservados.
  const root = path.join(base, "raiz");
  mkdirSync(root);
  const good = startCapture(root);
  writeFileSync(path.join(capturesDir(root), "notas.txt"), "alheio");
  mkdirSync(path.join(capturesDir(root), `.deleting-${"b".repeat(32)}`));
  assert.deepEqual(check(root, 0, null, "nomes alheios").captures.map((c) => c.id), [good]);
  check(root, 3, "capture_not_found", "cursor inexistente", { after: "c".repeat(32) });
  // Lock ocupado: conflito sem mutação, lock alheio preservado.
  writeFileSync(path.join(storeDir(root), ".lock"), "lock alheio\n");
  check(root, 4, "lock_present", "lock ocupado");
  assert.equal(readFileSync(path.join(storeDir(root), ".lock"), "utf8"), "lock alheio\n");
  // Uso inválido: cursor fora do formato, sem eco.
  const usage = list(root, "../x");
  assert.equal(usage.status, 2);
  assert.deepEqual(usage.body.error, { code: "invalid_capture_id" });
});

test("T8-C11 export observed capture: ativa ou encerrada, mesma ordem gravada, origem e cobertura, sem alterar arquivos", async () => {
  const root = scratch("t8 c11 raiz");
  const id = startCapture(root);
  const env = boundEnv(root, id);
  const dir = scratch("t8 c11 wrapper");
  const scenario = writeScenario(dir, "c11", [{ stdout: JSON.stringify(execEvent("thread_started")) }, { stdout: "{json quebrado" }]);
  assert.equal((await runHook("claude", claudePayload("pre_tool_bash"), { env })).status, 0);
  assert.equal((await runHermesIngest([hermesRecord("pre_tool_call"), hermesRecord("post_tool_call")], { env })).status, 0);
  assert.equal((await runWrapper({ args: ["p"], env: boundEnv(root, id, { FAKE_CODEX_SCENARIO: scenario }), cwd: dir })).status, 0);
  assert.equal((await runHook("claude", claudePayload("post_tool_bash"), { env })).status, 0);
  const expectedOrigin = [
    ["claude", "native_hook", "PreToolUse"],
    ["hermes", "native_plugin", "pre_tool_call"],
    ["hermes", "native_plugin", "post_tool_call"],
    ["codex", "supervised_exec", "thread.started"],
    ["codex", "supervised_exec", "process.exit"],
    ["claude", "native_hook", "PostToolUse"],
  ];

  const segmentRecords = () => {
    const segments = readdirSync(captureDir(root, id)).filter((name) => /^events-\d{6}\.ndjson$/.test(name));
    assert.equal(segments.length, 1);
    return readFileSync(path.join(captureDir(root, id), segments[0]), "utf8").trimEnd().split("\n").map((line) => JSON.parse(line));
  };
  for (const phase of ["active", "stopped"]) {
    if (phase === "stopped") privacyOk(["stop", "--root", root, "--capture", id]);
    const before = snapshotTree(storeDir(root));
    const exported = exportOf(root, id);
    assert.deepEqual(snapshotTree(storeDir(root)), before, `${phase}: export não altera arquivos nem mtimes`);
    assert.equal(exported.capture.state, phase);
    assert.deepEqual(exported.records, segmentRecords(), `${phase}: ordem gravada`);
    assert.deepEqual(exported.records.map((r) => [r.envelope.source.agent, r.envelope.signal, r.envelope.nativeEvent]), expectedOrigin, phase);
    assert.deepEqual(exported.capture, statusOf(root, id), `${phase}: cobertura igual ao status`);
    assert.deepEqual(exported.capture.counters, {
      accepted: 6,
      persisted: 6,
      malformed: 1,
      dropped: {},
      contentOmitted: { content_disabled: 4 },
    });
  }
});

test("T8-C14 lifecycle remains authoritative: encerrada recusa entrega; delete/prune exigem --apply, preservam ativa e alheios; nada ressuscita", async () => {
  const root = scratch("t8 c14 raiz");
  const t0 = Date.parse("2026-06-01T00:00:00.000Z");
  const stopped = await startAt(root, t0);
  const disabled = await startAt(root, t0, ["--content"]);
  const active = await startAt(root, t0);
  // Cada produtor com a pré-carga de tempos, num arquivo fora da raiz; a
  // mensagem só ganha a evidência quando a entrega não vem como esperado (na CI
  // do Windows a abertura de uma delas saiu com `delivery_timeout`, sem dado).
  const times = scratch("t8 c14 tempos");
  let timings = 0;
  const deliver = async (label, id, start) => {
    const timing = path.join(times, `${(timings += 1)}.ndjson`);
    const run = await start(boundEnv(root, id, timedEnv(timing)));
    return { run, flow: { root, id, produced: [{ label, run, timing }] } };
  };
  for (const id of [stopped, disabled, active]) {
    const { run, flow } = await deliver("hook claude pre_tool_bash", id, (env) => runHook("claude", claudePayload("pre_tool_bash"), { env }));
    const code = run.report?.delivery?.code;
    assert.deepEqual(code, null, explainedUnless(code === null, "hook claude pre_tool_bash", flow));
  }
  assert.equal((await runPrivacyCommand({ argv: ["stop", "--root", root, "--capture", stopped], now: at(t0) })).exitCode, 0);
  const disabledBody = (await runPrivacyCommand({ argv: ["disable", "--root", root, "--capture", disabled], now: at(t0) })).body;
  assert.deepEqual([disabledBody.capture.state, disabledBody.capture.content], ["disabled", false]);

  // Produtores atrasados: código fechado, exit 0 e nenhum registro novo.
  for (const id of [stopped, disabled]) {
    const before = snapshotTree(captureDir(root, id));
    const hook = await deliver("hook claude post_tool_bash", id, (env) => runHook("claude", claudePayload("post_tool_bash"), { env }));
    const hermes = await deliver("ingest hermes", id, (env) => runHermesIngest([hermesRecord("pre_tool_call")], { env }));
    const refused = { bound: true, code: "capture_not_active", entries: 1, committed: 0, persisted: 0, lost: 1 };
    for (const { run, flow } of [hook, hermes]) {
      assert.equal(run.status, 0);
      assert.deepEqual(run.report?.delivery, refused, explainedUnless(isDeepStrictEqual(run.report?.delivery, refused), flow.produced[0].label, flow));
    }
    assert.deepEqual(snapshotTree(captureDir(root, id)), before, id);
    assert.equal(exportOf(root, id).records.length, 1);
  }

  // Prévia por padrão; captura ativa nunca é apagada.
  const preview = privacyOk(["delete", "--root", root, "--capture", stopped]);
  assert.equal(preview.applied, false);
  assert.ok(existsSync(captureDir(root, stopped)));
  const refused = runPrivacy(["delete", "--root", root, "--capture", active, "--apply"]);
  assert.deepEqual([refused.status, refused.body.error.code], [3, "capture_active"]);
  const prunePreview = await runPrivacyCommand({ argv: ["prune", "--root", root], now: at(t0 + 30 * DAY_MS) });
  assert.deepEqual([prunePreview.body.selected, prunePreview.body.deleted], [[disabled, stopped].sort(), []]);
  assert.ok(existsSync(captureDir(root, stopped)) && existsSync(captureDir(root, disabled)));

  // Arquivo alheio dentro da captura: recusa sem apagar; nomes alheios em captures/ ficam.
  writeFileSync(path.join(captureDir(root, disabled), "alheio.txt"), "não é nosso");
  writeFileSync(path.join(capturesDir(root), "notas.txt"), "alheio");
  const foreign = runPrivacy(["delete", "--root", root, "--capture", disabled, "--apply"]);
  assert.deepEqual([foreign.status, foreign.body.error.code], [4, "foreign_entry"]);
  assert.equal(readFileSync(path.join(captureDir(root, disabled), "alheio.txt"), "utf8"), "não é nosso");
  // `unlinkSync`, não `rmSync`: no Windows, o do Node 24.13.0 (o da CI) não
  // apaga num caminho com "ação" e não lança (nodejs/node#56049); o alheio
  // ficava e o prune do --apply saía com foreign_entry.
  unlinkSync(path.join(captureDir(root, disabled), "alheio.txt"));

  assert.equal(privacyOk(["delete", "--root", root, "--capture", stopped, "--apply"]).deleted, true);
  const pruned = await runPrivacyCommand({ argv: ["prune", "--root", root, "--apply"], now: at(t0 + 30 * DAY_MS) });
  assert.equal(pruned.exitCode, 0, JSON.stringify(pruned.body));
  assert.deepEqual(pruned.body.deleted, [disabled]);
  assert.deepEqual(readdirSync(capturesDir(root)).sort(), [active, "notas.txt"].sort(), "só a ativa e o alheio ficam");

  // Consulta e produtores não ressuscitam o que saiu.
  for (const id of [stopped, disabled]) {
    assert.deepEqual(list(root).body.captures.map((c) => c.id), [active]);
    const exported = runPrivacy(["export", "--root", root, "--capture", id]);
    assert.deepEqual([exported.status, exported.body.error.code], [3, "capture_not_found"]);
    const followed = runPrivacy(["follow", "--root", root, "--capture", id]);
    assert.equal(followed.status, 3);
    assert.deepEqual(followed.body, { schemaVersion: 1, command: "follow", type: "error", sequence: 1, error: { code: "capture_not_found" } });
    const late = await runHook("claude", claudePayload("pre_tool_bash"), { env: boundEnv(root, id) });
    assert.equal(late.status, 0);
    assert.equal(late.report.delivery.code, "capture_not_found");
    assert.ok(!existsSync(captureDir(root, id)), `${id}: nada recriado`);
  }
  assert.equal(exportOf(root, active).records.length, 1);
});
