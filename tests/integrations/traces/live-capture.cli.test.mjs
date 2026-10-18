import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { INTEGRATIONS_CLI, PSEUDONYM, baseEnv, makeScratch, runIntegrationsJson } from "../helpers/cli.mjs";
import { CANARY_PATTERN, loadFixture } from "../helpers/fixtures.mjs";
import { readClaudeHandlers, readCodexHandlers, runClaudeHandler, runCodexHandler } from "../helpers/installed-hooks.mjs";
import { MARKER, SECRET_TEXT, claudePayload, codexHookPayload, execEvent, hermesRecord, leaks, ndjson } from "../helpers/privacy-canaries.mjs";
import { runPrivacy } from "../helpers/privacy-store.mjs";
import {
  assertAbsentOnDisk,
  boundEnv,
  exportOf,
  expectedPseudonym,
  filesUnder,
  privacyOk,
  runHermesIngest,
  runHook,
  sameEnvelope,
  startCapture,
  statusOf,
  storeDir,
} from "../helpers/traces.mjs";
import { snapshotTree } from "../helpers/tree.mjs";
import { probeOf, runWrapper, writeScenario } from "../helpers/wrapper.mjs";

// Provas S1 da issue #8 (.checks/issue-8-traces.md, C1–C8): processos reais
// dos produtores (hooks instalados, ingest Hermes, wrapper com Codex falso),
// vinculados só pelo par SKILL_ME_CAPTURE_ROOT/SKILL_ME_CAPTURE_ID, com
// fixtures sintéticas. O esperado vem do relatório em memória da #4/#5, do
// `privacy ingest` da #5 ou da definição publicada do pseudônimo.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

// Nome do ID no envelope → nome nativo, por contrato (fixtures e guias da #4).
const CLAUDE_IDS = { sessionId: "session_id", promptId: "prompt_id", agentId: "agent_id", toolUseId: "tool_use_id" };
const CODEX_HOOK_IDS = { sessionId: "session_id", turnId: "turn_id", agentId: "agent_id", toolUseId: "tool_use_id" };
const HERMES_IDS = {
  sessionId: "session_id",
  taskId: "task_id",
  toolCallId: "tool_call_id",
  turnId: "turn_id",
  parentSessionId: "parent_session_id",
  parentTurnId: "parent_turn_id",
  parentSubagentId: "parent_subagent_id",
  childSessionId: "child_session_id",
  subagentId: "child_subagent_id",
};
const CLAUDE_SOURCE = { agent: "claude", mechanism: "command_hook", contract: "claude-code-hooks@docs-2026-10-16" };
const CODEX_HOOK_SOURCE = { agent: "codex", mechanism: "command_hook", contract: "codex-hooks@rust-v0.162.1" };
const EXEC_SOURCE = { agent: "codex", mechanism: "exec_jsonl", contract: "codex-exec-jsonl@rust-v0.162.1" };
const HERMES_SOURCE = { agent: "hermes", mechanism: "python_plugin", contract: "hermes-plugin-hooks@0.21.4" };
const TOOL_KINDS = ["tool_pre", "tool_post", "item", "skill_invocation"];
const DELIVERED = (n) => ({ bound: true, code: null, entries: n, committed: n, persisted: n, lost: 0 });

function assertCapturePseudonyms(root, id, envelope, native, names, label) {
  for (const [name, value] of Object.entries(envelope.ids)) {
    assert.match(value, PSEUDONYM, `${label}: ${name}`);
    assert.equal(value, expectedPseudonym(root, id, native[names[name]]), `${label}: ${name}`);
  }
}

function nativeIdValues(payloads, names) {
  return payloads.flatMap((payload) => Object.values(names).map((name) => payload[name]).filter((value) => typeof value === "string" && value !== ""));
}

let claude;
let codex;
before(() => {
  const root = scratch("t8 hooks instalados");
  claude = { target: path.join(root, ".claude"), cwd: root };
  codex = { target: path.join(root, ".codex"), cwd: root };
  mkdirSync(claude.target);
  mkdirSync(codex.target);
  // POSIX: o Codex roda hooks por `$SHELL -lc`; HOME temporário isola o perfil.
  codex.extra = process.platform === "win32" ? { HOME: root } : { HOME: root, SHELL: "/bin/sh" };
  assert.equal(runIntegrationsJson(["install", "--agent", "claude", "--target", claude.target, "--apply"], { env: baseEnv() }).status, 0);
  assert.equal(runIntegrationsJson(["install", "--agent", "codex", "--target", codex.target, "--apply"], { env: baseEnv(codex.extra) }).status, 0);
  claude.handlers = readClaudeHandlers(claude.target);
  codex.handlers = readCodexHandlers(codex.target);
});

test("T8-C1 Claude live capture: hook instalado e vinculado grava um registro v1 por evento suportado, sem payload bruto", async () => {
  const root = scratch("t8 c1 raiz");
  const id = startCapture(root);
  const env = boundEnv(root, id);
  const cases = loadFixture("claude-hooks.json").cases.filter((c) => c.valid);
  assert.ok(cases.length >= 10);
  let toolEvents = 0;
  for (const [index, { name, payload }] of cases.entries()) {
    const run = await runClaudeHandler(claude.handlers[payload.hook_event_name].handler, payload, { env, cwd: claude.cwd });
    assert.equal(run.status, 0, `${name}: ${run.stderr}`);
    assert.equal(run.stdout, "", name);
    assert.deepEqual(run.report.delivery, DELIVERED(1), name);
    const { records } = exportOf(root, id);
    assert.equal(records.length, index + 1, `${name}: exatamente um registro novo`);
    const record = records.at(-1);
    assert.deepEqual(Object.keys(record).sort(), ["content", "envelope", "privacy", "recordVersion"], name);
    assert.equal(record.recordVersion, 1, name);
    assert.deepEqual(record.envelope.source, CLAUDE_SOURCE, name);
    assert.equal(record.envelope.signal, "native_hook", name);
    assert.equal(record.envelope.nativeEvent, payload.hook_event_name, name);
    sameEnvelope(record.envelope, run.report.events[0], name);
    assertCapturePseudonyms(root, id, record.envelope, payload, CLAUDE_IDS, name);
    assert.equal(record.content, null, `${name}: conteúdo desligado`);
    const isTool = TOOL_KINDS.includes(record.envelope.eventKind);
    if (isTool) toolEvents += 1;
    assert.deepEqual(record.privacy, isTool ? ["content:content_disabled"] : [], name);
  }
  const status = statusOf(root, id);
  assert.deepEqual(status.counters, {
    accepted: cases.length,
    persisted: cases.length,
    malformed: 0,
    dropped: {},
    contentOmitted: { content_disabled: toolEvents },
  });
  const payloads = cases.map((c) => c.payload);
  assertAbsentOnDisk(root, [...nativeIdValues(payloads, CLAUDE_IDS), ...payloads.flatMap((p) => [p.cwd, p.transcript_path].filter(Boolean))], "C1");
  for (const file of filesUnder(storeDir(root))) assert.ok(!CANARY_PATTERN.test(readFileSync(file, "latin1")), path.basename(file));
});

test("T8-C2 Codex hook live capture: linha instalada em hooks.json grava um registro por evento suportado e sai 0", async () => {
  const root = scratch("t8 c2 raiz");
  const id = startCapture(root);
  const env = boundEnv(root, id, codex.extra);
  const cases = loadFixture("codex-hooks.json").cases.filter((c) => c.valid);
  assert.ok(cases.length >= 8);
  for (const [index, { name, payload }] of cases.entries()) {
    const run = await runCodexHandler(codex.handlers[payload.hook_event_name].handler, payload, { env, cwd: codex.cwd });
    assert.equal(run.status, 0, `${name}: ${run.stderr}`);
    assert.equal(run.stdout, "", name);
    assert.ok(run.report, `${name}: relatório`);
    assert.deepEqual(run.report.delivery, DELIVERED(1), name);
    const { records } = exportOf(root, id);
    assert.equal(records.length, index + 1, name);
    const record = records.at(-1);
    assert.equal(record.recordVersion, 1);
    assert.deepEqual(record.envelope.source, CODEX_HOOK_SOURCE, name);
    assert.equal(record.envelope.signal, "native_hook", name);
    sameEnvelope(record.envelope, run.report.events[0], name);
    assertCapturePseudonyms(root, id, record.envelope, payload, CODEX_HOOK_IDS, name);
    assert.equal(record.content, null, name);
  }
  assert.equal(statusOf(root, id).counters.persisted, cases.length);
  const payloads = cases.map((c) => c.payload);
  assertAbsentOnDisk(root, [...nativeIdValues(payloads, CODEX_HOOK_IDS), ...payloads.flatMap((p) => [p.cwd, p.transcript_path].filter(Boolean))], "C2");
  for (const file of filesUnder(storeDir(root))) assert.ok(!CANARY_PATTERN.test(readFileSync(file, "latin1")), path.basename(file));
});

test("T8-C3 Hermes live capture: ingest vinculado grava cada evento suportado uma vez e sai 0", async () => {
  const root = scratch("t8 c3 raiz");
  const id = startCapture(root);
  const records = loadFixture("hermes-hooks.json").cases.filter((c) => c.valid).map((c) => hermesRecord(c.name));
  const run = await runHermesIngest(records, { env: boundEnv(root, id) });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, "");
  assert.equal(run.report.events.length, records.length, "cada linha fixture é um evento suportado");
  assert.deepEqual(run.report.delivery, DELIVERED(records.length));
  const stored = exportOf(root, id).records;
  assert.equal(stored.length, records.length);
  for (const [index, record] of stored.entries()) {
    const label = records[index].hook;
    assert.deepEqual(record.envelope.source, HERMES_SOURCE, label);
    assert.equal(record.envelope.signal, "native_plugin", label);
    sameEnvelope(record.envelope, run.report.events[index], label);
    assertCapturePseudonyms(root, id, record.envelope, records[index].kwargs, HERMES_IDS, label);
  }
  assertAbsentOnDisk(root, nativeIdValues(records.map((r) => r.kwargs), HERMES_IDS), "C3");

  // O código do comando interno não muda: sem vínculo, e com a captura encerrada.
  const unbound = await runHermesIngest(records, { env: baseEnv() });
  assert.equal(unbound.status, 0);
  assert.equal(unbound.report.delivery, undefined, "sem vínculo, o relatório é o da #4/#5");
  privacyOk(["stop", "--root", root, "--capture", id]);
  const late = await runHermesIngest(records, { env: boundEnv(root, id) });
  assert.equal(late.status, 0);
  assert.equal(late.stdout, "");
  assert.deepEqual(late.report.delivery, { bound: true, code: "capture_not_active", entries: records.length, committed: 0, persisted: 0, lost: records.length });
  assert.equal(exportOf(root, id).records.length, records.length, "nada gravado depois do stop");
});

const EXEC_CASES = loadFixture("codex-exec.json").cases.filter((c) => c.valid && c.event);
const HOOK_STEP = (payload) => ({ hook: { command: process.execPath, args: [INTEGRATIONS_CLI, "hook", "--agent", "codex"], stdin: JSON.stringify(payload) } });

// O stderr inteiro do wrapper é o que o filho escreveu (cópia gravada pelo
// próprio Codex falso): uma linha a mais do debugger em qualquer posição falha.
function assertNativeStderr(run, stderrCopy, label) {
  const native = readFileSync(stderrCopy);
  assert.ok(native.includes("FAKE_CODEX_PROBE "), `${label}: a cópia registrou o stderr do filho`);
  assert.deepEqual(run.stderrBytes, native, `${label}: stderr do wrapper = stderr do filho, byte a byte`);
}

test("T8-C4 supervised Codex live capture: wrapper vinculado grava o exec --json uma vez, preserva stdout, stderr e código, e o hook do filho não duplica o fluxo", async () => {
  const lines = EXEC_CASES.map((c) => JSON.stringify(c.event));
  const half = Math.floor(lines.length / 2);
  const expectedStdout = Buffer.from(lines.map((line) => line + "\n").join(""));
  const excluded = EXEC_CASES.filter((c) => c.event.item?.type === "reasoning").length;
  for (const withHook of [true, false]) {
    const label = withHook ? "com hook do filho" : "sem hook";
    const dir = scratch(`t8 c4 ${withHook ? "hook" : "sem hook"}`);
    const id = startCapture(dir);
    const hookPayload = codexHookPayload("pre_tool_bash");
    const steps = [
      { stderr: "stderr nativo do Codex antes ação" },
      ...lines.slice(0, half).map((stdout) => ({ stdout })),
      { stderr: "stderr nativo do Codex ação" },
      ...(withHook ? [HOOK_STEP(hookPayload)] : []),
      ...lines.slice(half).map((stdout) => ({ stdout })),
      { stderr: "stderr nativo do Codex depois" },
    ];
    const scenario = writeScenario(dir, "c4", steps);
    const stderrCopy = path.join(dir, "stderr do filho.bin");
    const env = boundEnv(dir, id, { FAKE_CODEX_SCENARIO: scenario, FAKE_CODEX_EXIT: "17", FAKE_CODEX_STDERR_COPY: stderrCopy });
    const run = await runWrapper({ args: ["prompt ação"], env, cwd: dir });
    assert.equal(run.status, 17, `${label}: ${run.stderr}`);
    assert.equal(run.signal, null, label);
    assert.deepEqual(run.stdout, expectedStdout, `${label}: stdout nativo byte a byte`);
    assertNativeStderr(run, stderrCopy, label);
    const probe = probeOf(run.stderr);
    assert.equal(probe.env.SKILL_ME_CAPTURE_ROOT, dir, `${label}: o filho herda o vínculo`);
    assert.equal(probe.env.SKILL_ME_CAPTURE_ID, id, label);

    const execEvents = run.report.events;
    assert.equal(execEvents.length, EXEC_CASES.length - excluded + 1, `${label}: eventos suportados + process.exit`);
    // Toda linha é uma entrada confirmada; o raciocínio só conta como descarte.
    assert.deepEqual(run.report.delivery, { bound: true, code: null, entries: EXEC_CASES.length + 1, committed: EXEC_CASES.length + 1, persisted: execEvents.length, lost: 0 }, label);

    const stored = exportOf(dir, id).records;
    const fromExec = stored.filter((r) => r.envelope.source.contract === EXEC_SOURCE.contract);
    const fromHooks = stored.filter((r) => r.envelope.source.contract === CODEX_HOOK_SOURCE.contract);
    assert.equal(stored.length, fromExec.length + fromHooks.length, label);
    assert.equal(fromExec.length, execEvents.length, `${label}: cada evento do exec uma vez`);
    for (const [index, record] of fromExec.entries()) {
      assert.deepEqual(record.envelope.source, EXEC_SOURCE, label);
      assert.equal(record.envelope.signal, "supervised_exec", label);
      sameEnvelope(record.envelope, execEvents[index], `${label}: ${execEvents[index].nativeEvent}`);
    }
    if (withHook) {
      assert.equal(fromHooks.length, 1, "o hook do filho grava só o próprio evento");
      assert.equal(fromHooks[0].envelope.nativeEvent, "PreToolUse");
      assert.equal(fromHooks[0].envelope.ids.sessionId, expectedPseudonym(dir, id, hookPayload.session_id));
    } else assert.deepEqual(fromHooks, [], "sem hook, só o fluxo do exec");
    const threadRecord = fromExec.find((r) => r.envelope.nativeEvent === "thread.started");
    assert.equal(threadRecord.envelope.ids.threadId, expectedPseudonym(dir, id, EXEC_CASES.find((c) => c.name === "thread_started").event.thread_id), label);
    const status = statusOf(dir, id);
    assert.equal(status.counters.persisted, stored.length, label);
    assert.deepEqual(status.counters.dropped, { reasoning_excluded: excluded }, label);
  }
});

test("T8-C4 supervised Codex live capture: sinal POSIX do filho é espelhado com a captura vinculada", { skip: process.platform === "win32" ? "posix-signals: no Windows, sinal programático vira TerminateProcess sem handler (limite do guia da #4)" : false }, async () => {
  const dir = scratch("t8 c4 sinal");
  const id = startCapture(dir);
  const scenario = writeScenario(dir, "c4s", [{ stdout: JSON.stringify(execEvent("thread_started")) }, { stderr: "stderr antes do sinal" }]);
  const stderrCopy = path.join(dir, "stderr do filho.bin");
  const run = await runWrapper({ args: ["p"], env: boundEnv(dir, id, { FAKE_CODEX_SCENARIO: scenario, FAKE_CODEX_SELF_SIGNAL: "SIGTERM", FAKE_CODEX_STDERR_COPY: stderrCopy }), cwd: dir });
  assert.equal(run.signal, "SIGTERM");
  assert.equal(run.status, null);
  assert.deepEqual(run.stdout, Buffer.from(JSON.stringify(execEvent("thread_started")) + "\n"));
  assertNativeStderr(run, stderrCopy, "sinal");
  const stored = exportOf(dir, id).records.map((r) => [r.envelope.nativeEvent, r.envelope.fields]);
  assert.deepEqual(stored, [["thread.started", {}], ["process.exit", { processSignal: "SIGTERM" }]]);
});

test("T8-C5 capture scoped pseudonyms: mesmo ID nativo em dois processos da captura dá o mesmo h1:, outra captura dá outro", async () => {
  const root = scratch("t8 c5 raiz");
  const a = startCapture(root);
  const b = startCapture(root);
  const shared = "sessao-compartilhada-c5-ação";
  const claudeRun = await runHook("claude", claudePayload("pre_tool_bash", { session_id: shared }), { env: boundEnv(root, a) });
  const codexRun = await runHook("codex", codexHookPayload("session_start", { session_id: shared }), { env: boundEnv(root, a) });
  const otherRun = await runHook("claude", claudePayload("pre_tool_bash", { session_id: shared }), { env: boundEnv(root, b) });
  for (const run of [claudeRun, codexRun, otherRun]) assert.deepEqual(run.report.delivery, DELIVERED(1));
  const [inA1, inA2] = exportOf(root, a).records;
  const [inB] = exportOf(root, b).records;
  assert.equal(inA1.envelope.ids.sessionId, inA2.envelope.ids.sessionId, "mesmo pseudônimo entre processos da captura");
  assert.equal(inA1.envelope.ids.sessionId, expectedPseudonym(root, a, shared));
  assert.notEqual(inB.envelope.ids.sessionId, inA1.envelope.ids.sessionId, "outra captura, outro pseudônimo");
  assert.equal(inB.envelope.ids.sessionId, expectedPseudonym(root, b, shared));
  // A observação em memória continua com a chave efêmera do processo.
  for (const run of [claudeRun, codexRun]) assert.notEqual(run.report.events[0].ids.sessionId, inA1.envelope.ids.sessionId);
  assert.notEqual(claudeRun.report.events[0].ids.sessionId, codexRun.report.events[0].ids.sessionId);
  assertAbsentOnDisk(root, [shared], "C5");
});

test("T8-C6 no implicit capture: sem o par completo e válido nada é escolhido; hooks saem 0 e o wrapper mantém o contrato do filho", async () => {
  const base = scratch("t8 c6");
  const root = path.join(base, "raiz única ação");
  mkdirSync(root);
  const active = startCapture(root);
  const stopped = startCapture(root);
  privacyOk(["stop", "--root", root, "--capture", stopped]);
  const execLine = JSON.stringify(execEvent("thread_started"));
  const scenario = writeScenario(base, "c6", [{ stdout: execLine }, { stderr: "stderr do filho" }]);
  // Fora de `base` e da raiz, que precisam continuar intactas.
  const copies = scratch("t8 c6 stderr do filho");
  const variants = [
    ["nenhuma variável", {}, undefined],
    ["só a raiz", { SKILL_ME_CAPTURE_ROOT: root }, "binding_invalid"],
    ["só o id", { SKILL_ME_CAPTURE_ID: active }, "binding_invalid"],
    ["raiz relativa que apontaria para a captura", { SKILL_ME_CAPTURE_ROOT: path.basename(root), SKILL_ME_CAPTURE_ID: active }, "binding_invalid"],
    ["id fora do formato", { SKILL_ME_CAPTURE_ROOT: root, SKILL_ME_CAPTURE_ID: active.toUpperCase() }, "binding_invalid"],
    ["id inexistente", { SKILL_ME_CAPTURE_ROOT: root, SKILL_ME_CAPTURE_ID: "f".repeat(32) }, "capture_not_found"],
    ["captura encerrada", { SKILL_ME_CAPTURE_ROOT: root, SKILL_ME_CAPTURE_ID: stopped }, "capture_not_active"],
    ["raiz sem store", { SKILL_ME_CAPTURE_ROOT: base, SKILL_ME_CAPTURE_ID: active }, "capture_not_found"],
  ];
  const rootBefore = snapshotTree(root);
  const baseEntries = readdirSync(base).sort();
  for (const [index, [label, extra, code]] of variants.entries()) {
    const env = baseEnv(extra);
    // cwd = pasta que contém a raiz: uma descoberta implícita pelo cwd acharia a captura.
    const runs = {
      claude: await runHook("claude", claudePayload("pre_tool_bash"), { env, cwd: base }),
      codex: await runHook("codex", codexHookPayload("pre_tool_bash"), { env, cwd: base }),
      hermes: await runHermesIngest([hermesRecord("pre_tool_call")], { env, cwd: base }),
    };
    for (const [producer, run] of Object.entries(runs)) {
      assert.equal(run.status, 0, `${label}/${producer}`);
      assert.equal(run.stdout, "", `${label}/${producer}`);
      assert.equal(run.stderr, "", `${label}/${producer}`);
      if (code === undefined) assert.equal(run.report.delivery, undefined, `${label}/${producer}`);
      else assert.deepEqual(run.report.delivery, { bound: code !== "binding_invalid", code, entries: 1, committed: 0, persisted: 0, lost: 1 }, `${label}/${producer}`);
    }
    const stderrCopy = path.join(copies, `variante ${index}.bin`);
    const wrapped = await runWrapper({ args: ["p"], env: baseEnv({ ...extra, FAKE_CODEX_SCENARIO: scenario, FAKE_CODEX_EXIT: "17", FAKE_CODEX_STDERR_COPY: stderrCopy }), cwd: base });
    assert.equal(wrapped.status, 17, label);
    assert.equal(wrapped.signal, null, label);
    assert.deepEqual(wrapped.stdout, Buffer.from(execLine + "\n"), label);
    assertNativeStderr(wrapped, stderrCopy, label);
    if (code === undefined) assert.equal(wrapped.report.delivery, undefined, label);
    else assert.equal(wrapped.report.delivery.code, code, label);
    // Nada gravado, criado ou alterado, inclusive na captura ativa e ao lado da raiz.
    assert.deepEqual(snapshotTree(root), rootBefore, label);
    assert.deepEqual(readdirSync(base).sort(), baseEntries, label);
  }
  assert.deepEqual(statusOf(root, active).counters, { accepted: 0, persisted: 0, malformed: 0, dropped: {}, contentOmitted: {} });
});

const OVERSIZE_ID = "\u0001".repeat(256);

test("T8-C7 invalid native input classifications: entrada inválida, desconhecida, linha longa, envelope recusado e conteúdo não suportado nunca viram registro", async () => {
  const root = scratch("t8 c7 raiz");
  const id = startCapture(root, ["--content"]);
  const env = boundEnv(root, id);
  const runs = {};
  runs.invalidJson = await runHook("claude", undefined, { env, stdinText: `não é json { ${MARKER}` });
  runs.unknown = await runHook("claude", { ...loadFixture("claude-hooks.json").cases.find((c) => c.name === "unknown_event").payload, message: MARKER }, { env });
  runs.oversize = await runHook("claude", claudePayload("pre_tool_bash", { session_id: OVERSIZE_ID, prompt_id: OVERSIZE_ID, tool_use_id: OVERSIZE_ID }), { env });
  const unsupported = claudePayload("pre_tool_bash", { tool_name: "Write", tool_input: { file_path: "C:\\x\\a.txt", content: `texto ${MARKER}` } });
  runs.unsupported = await runHook("claude", unsupported, { env });
  const longLine = JSON.stringify({ ...hermesRecord("pre_tool_call"), padding: MARKER.padEnd(64 * 1024, "x") });
  runs.hermes = await runHermesIngest([], { env, stdinText: `${longLine}\n{não é json ${MARKER}\n${JSON.stringify(hermesRecord("pre_tool_call"))}\n{"hook":"pre_tool_call"` });
  const dir = scratch("t8 c7 wrapper");
  const scenario = writeScenario(dir, "c7", [
    { stdout: JSON.stringify({ type: "item.completed", item: { id: "x", type: "agent_message", text: MARKER.padEnd(64 * 1024 + 1, "y") } }) },
    { stdout: `{"type": ${MARKER}` },
    { stdout: JSON.stringify({ type: "evento.novo", detalhe: MARKER }) },
  ]);
  runs.wrapper = await runWrapper({ args: ["p"], env: boundEnv(root, id, { FAKE_CODEX_SCENARIO: scenario }), cwd: dir });

  for (const [name, run] of Object.entries(runs)) {
    assert.equal(run.status, 0, name);
    assert.equal(run.report.delivery.code, null, `${name}: entrega confirmada`);
  }
  // Relatório do processo: cada motivo no seu contador.
  assert.equal(runs.invalidJson.report.counters.invalidInput, 1);
  assert.equal(runs.unknown.report.counters.unknownEvent, 1);
  assert.equal(runs.oversize.report.counters.oversize, 1);
  assert.equal(runs.unsupported.report.counters.privacy.content_disabled, 1, "a observação em memória nunca tem conteúdo");
  assert.deepEqual([runs.hermes.report.counters.oversizeLine, runs.hermes.report.counters.invalidJson, runs.hermes.report.counters.partialTrailingLine], [1, 1, 1]);
  assert.deepEqual([runs.wrapper.report.counters.oversizeLine, runs.wrapper.report.counters.invalidJson, runs.wrapper.report.counters.unknownEvent], [1, 1, 1]);

  const { records, capture } = exportOf(root, id);
  // Só três registros: o Write sem conteúdo, o pre_tool_call válido e o process.exit do wrapper.
  assert.deepEqual(records.map((r) => r.envelope.nativeEvent), ["PreToolUse", "pre_tool_call", "process.exit"]);
  assert.equal(records[0].content, null);
  assert.deepEqual(records[0].privacy, ["content:unsupported_content"]);
  assert.deepEqual(capture.counters, {
    accepted: 3,
    persisted: 3,
    malformed: 1 + 3 + 2,
    dropped: { unknown_event: 2, envelope_oversize: 1 },
    contentOmitted: { unsupported_content: 2 },
  });
  for (const file of filesUnder(storeDir(root))) assert.ok(!readFileSync(file, "latin1").includes(MARKER), path.basename(file));
});

test("T8-C8 live content policy: sem opt-in omite argumentos e resultados; com --content grava só os campos suportados, sanitizados como no privacy ingest", async () => {
  const root = scratch("t8 c8 raiz");
  const off = startCapture(root);
  const on = startCapture(root, ["--content"]);
  const reference = startCapture(root, ["--content"]);
  const bash = claudePayload("pre_tool_bash", { tool_input: { command: SECRET_TEXT, description: "listar ação" } });
  const exec = execEvent("item_completed_command", { command: SECRET_TEXT, aggregated_output: `saída comum\n${SECRET_TEXT}` });
  const hermes = hermesRecord("post_tool_call");
  const dir = scratch("t8 c8 wrapper");
  const scenario = writeScenario(dir, "c8", [{ stdout: JSON.stringify(exec) }]);
  for (const capture of [off, on]) {
    const env = boundEnv(root, capture);
    assert.deepEqual((await runHook("claude", bash, { env })).report.delivery, DELIVERED(1));
    assert.deepEqual((await runHermesIngest([hermes], { env })).report.delivery, DELIVERED(1));
    const wrapped = await runWrapper({ args: ["p"], env: boundEnv(root, capture, { FAKE_CODEX_SCENARIO: scenario }), cwd: dir });
    assert.deepEqual(wrapped.report.delivery, DELIVERED(2));
  }
  // Referência: o mesmo payload pelo `privacy ingest` da #5.
  for (const [agent, entry] of [["claude", bash], ["hermes", hermes], ["codex-exec", exec]]) {
    assert.equal(runPrivacy(["ingest", "--root", root, "--capture", reference, "--agent", agent], { input: ndjson([entry]) }).status, 0, agent);
  }
  const offRecords = exportOf(root, off).records;
  const onRecords = exportOf(root, on).records.filter((r) => r.envelope.nativeEvent !== "process.exit");
  const refRecords = exportOf(root, reference).records;
  assert.equal(offRecords.length, 4);
  for (const record of offRecords.filter((r) => TOOL_KINDS.includes(r.envelope.eventKind))) {
    assert.equal(record.content, null, record.envelope.nativeEvent);
    assert.deepEqual(record.privacy, ["content:content_disabled"], record.envelope.nativeEvent);
  }
  assert.deepEqual(onRecords.map((r) => r.envelope.nativeEvent), refRecords.map((r) => r.envelope.nativeEvent));
  for (const [index, record] of onRecords.entries()) {
    assert.deepEqual(record.content, refRecords[index].content, record.envelope.nativeEvent);
    assert.deepEqual(record.privacy, refRecords[index].privacy, record.envelope.nativeEvent);
  }
  const command = onRecords[0].content.fields.find((f) => f.field === "tool_input.command");
  assert.ok(command.value.includes("[removido]") && command.value.includes("início seguro"), "texto sanitizado, não omitido");
  assert.equal(onRecords[1].content, null, "Hermes não tem linha na matriz");
  assert.ok(onRecords[2].content.fields.some((f) => f.field === "item.aggregated_output" && f.value.startsWith("saída comum")));
  for (const file of filesUnder(storeDir(root))) {
    if (path.basename(file) === "key") continue;
    assert.deepEqual(leaks(readFileSync(file, "utf8")), [], path.relative(root, file));
  }
});
