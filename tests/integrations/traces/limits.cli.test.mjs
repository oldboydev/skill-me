import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, test } from "node:test";
import { appendRecords } from "../../../src/integrations/privacy/store.mjs";
import { makeScratch } from "../helpers/cli.mjs";
import { claudePayload, execEvent, hermesRecord } from "../helpers/privacy-canaries.mjs";
import { recordLineBytes, sanitizedRecord } from "../helpers/privacy-store.mjs";
import { boundEnv, exportOf, runHermesIngest, runHook, startCapture, statusOf } from "../helpers/traces.mjs";
import { runWrapper, writeScenario } from "../helpers/wrapper.mjs";

// Prova C17 da issue #8: os tetos da #4/#5 continuam valendo nos produtores
// vinculados — no limite e um passo acima, admissão e motivos coincidem com a
// política. Valores do contrato: 500 registros, 8 MiB, 64 KiB por linha
// nativa, 1 MiB e 2 s de stdin do hook.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

const MAX_EVENTS = 500;
const MAX_BYTES = 8 * 1024 * 1024;
const LINE_MAX = 64 * 1024;
const HOOK_INPUT_MAX = 1024 * 1024;
const HOOK_STDIN_DEADLINE_MS = 2000;

const hermesLine = (index) => JSON.stringify(hermesRecord("pre_tool_call", { tool_call_id: `limite-${index}` }));

// JSON válido com exatamente `bytes` bytes, crescendo um campo que o adaptador não lê.
function sized(build, bytes) {
  const pad = bytes - Buffer.byteLength(build(""));
  assert.ok(pad > 0);
  const text = build("x".repeat(pad));
  assert.equal(Buffer.byteLength(text), bytes);
  return text;
}

// Enche a captura até `targetBytes` com poucos registros já sanitizados (forma
// do store; não passam por política): o teste olha só a admissão por bytes.
async function fillBytes(root, id, targetBytes) {
  const count = 8;
  const base = recordLineBytes(sanitizedRecord(0));
  const share = Math.floor(targetBytes / count);
  const records = Array.from({ length: count }, (_, i) => sanitizedRecord(i, "p".repeat((i === count - 1 ? targetBytes - share * (count - 1) : share) - base)));
  assert.equal(records.reduce((sum, r) => sum + recordLineBytes(r), 0), targetBytes);
  const result = await appendRecords({ root, id, batch: { records, malformed: 0, dropped: {}, contentOmitted: {} } });
  assert.equal(result.admitted, count);
}

test("T8-C17 capture and input bounds: 500 registros, 8 MiB, 64 KiB por linha e 1 MiB/2 s do hook no limite e um passo acima", async () => {
  const root = scratch("t8 c17 raiz");

  // 500 registros: o 500º entra, o 501º e os seguintes saem como capture_event_limit.
  const events = startCapture(root);
  const fill = await runHermesIngest([], { env: boundEnv(root, events), stdinText: Array.from({ length: MAX_EVENTS - 1 }, (_, i) => hermesLine(i) + "\n").join("") });
  assert.equal(fill.report.delivery.persisted, MAX_EVENTS - 1);
  const edge = await runHermesIngest([], { env: boundEnv(root, events), stdinText: `${hermesLine(1000)}\n${hermesLine(1001)}\n${hermesLine(1002)}\n` });
  assert.deepEqual(edge.report.delivery, { bound: true, code: null, entries: 3, committed: 3, persisted: 1, lost: 0 });
  const late = await runHook("claude", claudePayload("pre_tool_bash"), { env: boundEnv(root, events) });
  assert.deepEqual(late.report.delivery, { bound: true, code: null, entries: 1, committed: 1, persisted: 0, lost: 0 });
  const full = statusOf(root, events);
  // Como no `privacy ingest` da #5, o registro recusado pela admissão do lote
  // conta só em `dropped`, não em `accepted`.
  assert.deepEqual([full.counters.accepted, full.counters.persisted], [MAX_EVENTS, MAX_EVENTS]);
  assert.deepEqual(full.counters.dropped, { capture_event_limit: 3 });

  // 8 MiB: tamanho de um registro real medido numa captura à parte; cabe
  // exatamente no que falta e não cabe com um byte a menos.
  const probe = startCapture(root);
  const payload = claudePayload("pre_tool_bash");
  assert.equal((await runHook("claude", payload, { env: boundEnv(root, probe) })).report.delivery.persisted, 1);
  const size = recordLineBytes(exportOf(root, probe).records[0]);
  const exact = startCapture(root);
  await fillBytes(root, exact, MAX_BYTES - size);
  assert.equal((await runHook("claude", payload, { env: boundEnv(root, exact) })).report.delivery.persisted, 1, "cabe exatamente");
  assert.equal(statusOf(root, exact).dataBytes, MAX_BYTES);
  assert.equal((await runHook("claude", payload, { env: boundEnv(root, exact) })).report.delivery.persisted, 0, "um passo acima");
  assert.deepEqual(statusOf(root, exact).counters.dropped, { capture_byte_limit: 1 });
  const short = startCapture(root);
  await fillBytes(root, short, MAX_BYTES - size + 1);
  assert.equal((await runHook("claude", payload, { env: boundEnv(root, short) })).report.delivery.persisted, 0, "falta um byte");
  assert.deepEqual(statusOf(root, short).counters, { accepted: 8, persisted: 8, malformed: 0, dropped: { capture_byte_limit: 1 }, contentOmitted: {} });
  assert.equal(statusOf(root, short).dataBytes, MAX_BYTES - size + 1);

  // 64 KiB por linha nativa no ingest Hermes e no wrapper.
  const lines = startCapture(root);
  const hermesAt = (bytes) => sized((pad) => JSON.stringify({ ...hermesRecord("pre_tool_call"), kwargs: { ...hermesRecord("pre_tool_call").kwargs, padding: pad } }), bytes);
  const hermes = await runHermesIngest([], { env: boundEnv(root, lines), stdinText: `${hermesAt(LINE_MAX)}\n${hermesAt(LINE_MAX + 1)}\n` });
  assert.deepEqual([hermes.report.counters.oversizeLine, hermes.report.delivery.persisted], [1, 1]);
  const execAt = (bytes) => sized((pad) => JSON.stringify({ ...execEvent("turn_started"), padding: pad }), bytes);
  const dir = scratch("t8 c17 wrapper");
  const scenario = writeScenario(dir, "c17", [{ stdout: execAt(LINE_MAX) }, { stdout: execAt(LINE_MAX + 1) }]);
  const wrapped = await runWrapper({ args: ["p"], env: boundEnv(root, lines, { FAKE_CODEX_SCENARIO: scenario }), cwd: dir });
  assert.equal(wrapped.report.counters.oversizeLine, 1);
  assert.deepEqual(exportOf(root, lines).records.map((r) => r.envelope.nativeEvent), ["pre_tool_call", "turn.started", "process.exit"]);
  assert.equal(statusOf(root, lines).counters.malformed, 2);

  // Hook: 1 MiB exato é lido, 1 MiB + 1 não; stdin aberto além de 2 s vira
  // malformado sem registro, e o hook sai em seguida com 0.
  const hook = startCapture(root);
  const hookAt = (bytes) => sized((pad) => JSON.stringify({ ...payload, padding: pad }), bytes);
  assert.equal((await runHook("claude", undefined, { env: boundEnv(root, hook), stdinText: hookAt(HOOK_INPUT_MAX) })).report.delivery.persisted, 1);
  const tooLarge = await runHook("claude", undefined, { env: boundEnv(root, hook), stdinText: hookAt(HOOK_INPUT_MAX + 1) });
  assert.deepEqual([tooLarge.report.counters.inputTooLarge, tooLarge.report.delivery.persisted, tooLarge.report.delivery.committed], [1, 0, 1]);
  const inTime = await runHook("claude", payload, { env: boundEnv(root, hook), writeAfterMs: 1200 });
  assert.equal(inTime.report.delivery.persisted, 1, "stdin fechado antes de 2 s");
  const started = performance.now();
  const open = await runHook("claude", undefined, { env: boundEnv(root, hook), stdinText: '{"hook_event_name":', keepOpen: true });
  const elapsed = performance.now() - started;
  assert.equal(open.status, 0);
  assert.equal(open.report.counters.stdinTimeout, 1);
  assert.deepEqual(open.report.delivery, { bound: true, code: null, entries: 1, committed: 1, persisted: 0, lost: 0 });
  assert.ok(elapsed >= HOOK_STDIN_DEADLINE_MS - 100 && elapsed < HOOK_STDIN_DEADLINE_MS + 750 + 2000, `${Math.round(elapsed)} ms`);
  assert.deepEqual(statusOf(root, hook).counters, { accepted: 2, persisted: 2, malformed: 2, dropped: {}, contentOmitted: { content_disabled: 2 } });
});
