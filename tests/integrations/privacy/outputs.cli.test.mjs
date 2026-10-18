import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { INTEGRATIONS_CLI, REPO_ROOT, baseEnv, makeScratch, parseReport } from "../helpers/cli.mjs";
import { runClaudeHandler } from "../helpers/installed-hooks.mjs";
import { CANARIES, MARKER, SECRET_TEXT, claudePayload, codexHookPayload, execEvent, hermesRecord, leaks, ndjson } from "../helpers/privacy-canaries.mjs";
import { runPrivacy } from "../helpers/privacy-store.mjs";
import { runWrapper, writeScenario } from "../helpers/wrapper.mjs";

const PSEUDONYM = /^h1:[A-Za-z0-9_-]{43}$/;
const ENVELOPE_KEYS = ["schemaVersion", "source", "signal", "eventKind", "nativeEvent", "ids", "fields", "gaps", "observedAt"];
const CODES = ["content_disabled", "unsupported_content", "unsanitizable", "sensitive_removed", "content_truncated", "privacy_failure"];
const zeroPrivacy = (counts = {}) => Object.fromEntries(CODES.map((code) => [code, counts[code] ?? 0]));
const FS_PROBE = pathToFileURL(path.join(REPO_ROOT, "tests", "integrations", "helpers", "fs-probe.mjs")).href;
const PRIVACY_PROBE = pathToFileURL(path.join(REPO_ROOT, "tests", "integrations", "helpers", "privacy-probe.mjs")).href;

const hookHandler = (agent) => ({ command: process.execPath, args: [INTEGRATIONS_CLI, "hook", "--agent", agent] });

async function hook(agent, payload, { env = baseEnv(), cwd, stdinText } = {}) {
  const run = await runClaudeHandler(hookHandler(agent), payload, { env, cwd, stdinText });
  assert.equal(run.status, 0, `${agent}: ${run.stderr}`);
  assert.equal(run.stdout, "", `${agent}: stdout vazio`);
  assert.ok(run.report, `${agent}: relatório ausente ${run.stderr}`);
  return run;
}

function hermesIngest(records) {
  const result = spawnSync(process.execPath, [INTEGRATIONS_CLI, "ingest", "--agent", "hermes"], {
    input: ndjson(records),
    env: baseEnv({ SKILL_ME_OBSERVER_REPORT_FD: "3" }),
    stdio: ["pipe", "pipe", "pipe", "pipe"],
  });
  const fd3 = result.output[3].toString("utf8");
  assert.equal(result.status, 0);
  return { stdout: result.stdout.toString("utf8"), stderr: result.stderr.toString("utf8"), fd3, report: parseReport(fd3) };
}

function wrapper(dir, name, events, extra = {}) {
  const steps = events.map((event) => ({ stdout: typeof event === "string" ? event : JSON.stringify(event) }));
  return runWrapper({ args: ["p"], env: baseEnv({ FAKE_CODEX_SCENARIO: writeScenario(dir, name, steps), ...extra }), cwd: dir });
}

function walkFiles(root) {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = lstatSync(full);
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile()) files.push(full);
    }
  };
  walk(root);
  return files;
}

function assertNoLeakInTree(root, label) {
  for (const file of walkFiles(root)) assert.deepEqual(leaks(readFileSync(file, "utf8")), [], `${label}: ${path.relative(root, file)}`);
}

test("I5-C1b sem captura hook, ingest e wrapper não levam conteúdo e contam content_disabled por evento de ferramenta", async () => {
  for (const [agent, payload, tool] of [
    ["claude", claudePayload("pre_tool_bash"), true],
    ["claude", claudePayload("post_tool_bash"), true],
    ["claude", claudePayload("session_start"), false],
    ["codex", codexHookPayload("post_tool_bash"), true],
    ["codex", codexHookPayload("session_end"), false],
  ]) {
    const { report } = await hook(agent, payload);
    assert.equal(report.skillMeObserverReport, 2);
    assert.equal(report.events.length, 1);
    assert.deepEqual(Object.keys(report.events[0]), ENVELOPE_KEYS, "evento sem campo de conteúdo");
    assert.deepEqual(report.counters.privacy, zeroPrivacy(tool ? { content_disabled: 1 } : {}), `${agent} ${payload.hook_event_name}`);
  }
  const hermes = hermesIngest([hermesRecord("pre_tool_call"), hermesRecord("post_tool_call"), hermesRecord("on_session_start")]);
  assert.equal(hermes.report.events.length, 3);
  assert.deepEqual(hermes.report.counters.privacy, zeroPrivacy({ content_disabled: 2 }));

  const dir = makeScratch("i5 c1b wrapper");
  const run = await wrapper(dir, "c1b", [execEvent("thread_started"), execEvent("item_completed_command"), execEvent("item_completed_mcp_tool_call"), execEvent("item_completed_file_change"), execEvent("turn_completed")]);
  assert.equal(run.status, 0);
  assert.deepEqual(run.report.counters.privacy, zeroPrivacy({ content_disabled: 3 }));
  for (const event of run.report.events) assert.deepEqual(Object.keys(event), ENVELOPE_KEYS);
  assert.ok(!JSON.stringify(run.report).includes("SKILLME-CANARY"));
});

test("I5-C10b o mesmo ID em dois processos de hook dá pseudônimos diferentes; no mesmo wrapper, o mesmo", async () => {
  const payload = claudePayload("pre_tool_bash");
  const first = (await hook("claude", payload)).report.events[0].ids;
  const second = (await hook("claude", payload)).report.events[0].ids;
  for (const name of ["sessionId", "promptId", "toolUseId"]) {
    assert.match(first[name], PSEUDONYM);
    assert.match(second[name], PSEUDONYM);
    assert.notEqual(first[name], second[name], name);
  }
  assert.ok(!JSON.stringify(first).includes("claude-sess"));
  const dir = makeScratch("i5 c10b");
  const run = await wrapper(dir, "c10b", [execEvent("item_started_command"), execEvent("item_completed_command")]);
  const [started, completed] = run.report.events;
  assert.equal(started.ids.itemId, completed.ids.itemId, "mesma chave dentro do processo");
  assert.match(started.ids.itemId, PSEUDONYM);
});

test("I5-C14 canários das cinco categorias em conteúdo não aparecem em nenhum canal do debugger, com e sem opt-in", async () => {
  // Relatórios dos hooks, do ingest Hermes e do wrapper (sem captura).
  const claudeSecret = [
    claudePayload("pre_tool_bash", { tool_input: { command: SECRET_TEXT, description: SECRET_TEXT } }),
    claudePayload("post_tool_bash", { tool_input: { command: SECRET_TEXT }, tool_response: { stdout: SECRET_TEXT, stderr: SECRET_TEXT } }),
    claudePayload("post_tool_failure_bash", { tool_input: { command: SECRET_TEXT }, error: SECRET_TEXT }),
    claudePayload("expansion_slash_command", { prompt: SECRET_TEXT, command_args: SECRET_TEXT }),
  ];
  const codexSecret = [
    codexHookPayload("pre_tool_bash", { tool_input: { command: SECRET_TEXT } }),
    codexHookPayload("post_tool_bash", { tool_input: { command: SECRET_TEXT }, tool_response: { output: SECRET_TEXT } }),
    codexHookPayload("subagent_stop", { last_assistant_message: SECRET_TEXT }),
  ];
  for (const [agent, payloads] of [["claude", claudeSecret], ["codex", codexSecret]]) {
    for (const payload of payloads) {
      const run = await hook(agent, payload);
      for (const channel of [run.stdout, run.stderr, run.fd3]) assert.deepEqual(leaks(channel), [], `${agent} ${payload.hook_event_name}`);
    }
  }
  const hermes = hermesIngest([
    hermesRecord("pre_tool_call", { args: { value: SECRET_TEXT } }),
    hermesRecord("post_tool_call", { result: SECRET_TEXT, error_message: SECRET_TEXT }),
    hermesRecord("subagent_start", { child_goal: SECRET_TEXT }),
  ]);
  for (const channel of [hermes.stdout, hermes.stderr, hermes.fd3]) assert.deepEqual(leaks(channel), []);
  const execSecret = [
    execEvent("item_completed_command", { command: SECRET_TEXT, aggregated_output: SECRET_TEXT }),
    execEvent("item_completed_mcp_tool_call", { arguments: { q: SECRET_TEXT, password: SECRET_TEXT }, result: { content: [{ type: "text", text: SECRET_TEXT }] } }),
  ];
  const dir = makeScratch("i5 c14 wrapper");
  const wrapped = await wrapper(dir, "c14", execSecret);
  assert.equal(wrapped.status, 0);
  assert.deepEqual(leaks(JSON.stringify(wrapped.report)), [], "relatório do wrapper");

  // Comandos privacy com e sem opt-in: stdout/stderr, arquivos, temporários, lock e export.
  const root = makeScratch("i5 c14 store");
  const probeDir = makeScratch("i5 c14 probe");
  const fsProbeLog = path.join(probeDir, "fs-probe.jsonl");
  const privacyLog = path.join(probeDir, "privacy-probe.jsonl");
  const probed = (withFsProbe) => ({
    nodeArgs: [...(withFsProbe ? ["--import", FS_PROBE] : []), "--import", PRIVACY_PROBE],
    env: baseEnv({
      SKILL_ME_TEST_PRIVACY_PROBE_LOG: privacyLog,
      SKILL_ME_TEST_PRIVACY_PROBE_MARKER: MARKER,
      ...(withFsProbe ? { SKILL_ME_TEST_FS_PROBE_LOG: fsProbeLog, SKILL_ME_TEST_FS_PROBE_CANARY: MARKER } : {}),
    }),
  });
  const commands = [];
  const run = (args, options = {}, withFsProbe = false) => {
    const result = runPrivacy(args, { ...probed(withFsProbe), ...options });
    commands.push([args[0], result]);
    return result;
  };
  const ingestInput = {
    claude: ndjson(claudeSecret),
    "codex-hooks": ndjson(codexSecret),
    "codex-exec": ndjson(execSecret),
    hermes: ndjson([hermesRecord("post_tool_call", { result: SECRET_TEXT })]),
  };
  const captures = [];
  for (const optIn of [[], ["--content"]]) {
    const id = run(["start", "--root", root, ...optIn]).body.capture.id;
    captures.push(id);
    for (const [agent, input] of Object.entries(ingestInput)) {
      const result = run(["ingest", "--root", root, "--capture", id, "--agent", agent], { input }, agent === "claude");
      assert.equal(result.status, 0, `${agent}: ${result.stdout}`);
    }
    assertNoLeakInTree(root, `após ingest ${optIn.join("")}`);
    const exported = run(["export", "--root", root, "--capture", id]);
    assert.equal(exported.status, 0);
    assert.ok(exported.body.records.length >= 8);
    if (optIn.length > 0) assert.ok(exported.body.records.some((r) => r.content !== null), "opt-in grava conteúdo sanitizado");
    run(["status", "--root", root, "--capture", id]);
    run(["stop", "--root", root, "--capture", id]);
    run(["disable", "--root", root, "--capture", id]);
    run(["delete", "--root", root, "--capture", id]);
  }
  run(["prune", "--root", root]);
  for (const id of captures) assert.equal(run(["delete", "--root", root, "--capture", id, "--apply"]).status, 0);
  for (const [command, result] of commands) {
    assert.deepEqual(leaks(result.stdout), [], `${command} stdout`);
    assert.equal(result.stderr, "", `${command} stderr`);
  }
  const fsObservations = readFileSync(fsProbeLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  assert.ok(fsObservations.some((o) => o.moment === "before_rename"), "temporários observados antes do rename");
  for (const observation of fsObservations) assert.equal(observation.containsCanary, false, `${observation.file} ${observation.moment}`);
  const written = readFileSync(privacyLog, "utf8").trim().split("\n").map((line) => JSON.parse(line)).filter((e) => e.op === "closed_written");
  assert.ok(written.some((e) => path.basename(e.file) === ".lock"), "lock observado");
  assert.ok(written.some((e) => e.file.endsWith(".skill-me-tmp")), "temporários observados");
  for (const entry of written) assert.equal(entry.containsMarker, false, entry.file);
  assert.ok(!existsSync(path.join(root, "skill-me-privacy", "captures", captures[0])));
});

test("I5-C15 canários em IDs, nomes e caminhos não aparecem em nenhum canal do debugger", async () => {
  const claudeIds = {
    session_id: CANARIES.header,
    prompt_id: CANARIES.token,
    tool_use_id: CANARIES.url,
    agent_id: CANARIES.password,
    cwd: `/home/x/${CANARIES.token}`,
    transcript_path: `C:\\Users\\${CANARIES.token}\\t.jsonl`,
  };
  const claude = [
    claudePayload("pre_tool_bash", { ...claudeIds, tool_name: CANARIES.token, tool_input: { command: "ls" } }),
    claudePayload("pre_tool_bash", { ...claudeIds, tool_name: "Read", tool_input: { file_path: `/home/x/${CANARIES.token}/${CANARIES.url}` } }),
    claudePayload("pre_tool_skill", { ...claudeIds, tool_input: { skill: CANARIES.header } }),
    claudePayload("expansion_slash_command", { ...claudeIds, command_name: CANARIES.token, command_source: CANARIES.header }),
    claudePayload("subagent_start", { ...claudeIds, agent_type: CANARIES.header }),
  ];
  const codex = [codexHookPayload("pre_tool_bash", { session_id: CANARIES.token, turn_id: CANARIES.header, tool_use_id: CANARIES.url, cwd: CANARIES.url, tool_name: CANARIES.header })];
  const exec = [
    { type: "thread.started", thread_id: CANARIES.token },
    execEvent("item_completed_mcp_tool_call", { id: CANARIES.url, server: CANARIES.header, tool: CANARIES.token }),
    execEvent("item_completed_file_change", { id: CANARIES.header, changes: [{ path: `/home/x/${CANARIES.token}`, kind: "add" }] }),
  ];
  const hermes = [hermesRecord("pre_tool_call", { session_id: CANARIES.token, tool_call_id: CANARIES.url, tool_name: CANARIES.header }), hermesRecord("on_skill_lifecycle", { skill_name: CANARIES.header, task_id: CANARIES.password })];

  for (const [agent, payloads] of [["claude", claude], ["codex", codex]]) {
    for (const payload of payloads) {
      const run = await hook(agent, payload);
      for (const channel of [run.stdout, run.stderr, run.fd3]) assert.deepEqual(leaks(channel), [], `${agent} ${payload.hook_event_name}`);
      assert.equal(run.report.events.length, 1, "evento aceito, com o valor tratado");
    }
  }
  const ingested = hermesIngest(hermes);
  assert.deepEqual(leaks(ingested.fd3), []);
  assert.equal(ingested.report.events.length, 2);
  const dir = makeScratch("i5 c15 wrapper");
  const wrapped = await wrapper(dir, "c15", exec);
  assert.deepEqual(leaks(JSON.stringify(wrapped.report)), []);
  assert.equal(wrapped.report.events.length, exec.length + 1);

  const root = makeScratch("i5 c15 store");
  for (const optIn of [[], ["--content"]]) {
    const id = runPrivacy(["start", "--root", root, ...optIn]).body.capture.id;
    const outputs = [];
    for (const [agent, payloads] of [["claude", claude], ["codex-hooks", codex], ["codex-exec", exec], ["hermes", hermes]]) {
      const result = runPrivacy(["ingest", "--root", root, "--capture", id, "--agent", agent], { input: ndjson(payloads) });
      assert.equal(result.status, 0, result.stdout);
      assert.equal(result.body.batch.persisted, payloads.length, agent);
      outputs.push(result);
    }
    outputs.push(runPrivacy(["export", "--root", root, "--capture", id]), runPrivacy(["status", "--root", root, "--capture", id]));
    for (const result of outputs) {
      assert.deepEqual(leaks(result.stdout), []);
      assert.equal(result.stderr, "");
    }
    assertNoLeakInTree(root, optIn.join("") || "sem opt-in");
  }
});

test("I5-C26 relatório v2 traz a contagem exata dos seis códigos para um lote misto", async () => {
  const dir = makeScratch("i5 c26");
  const events = [
    execEvent("thread_started"),
    execEvent("item_started_command"),
    execEvent("item_completed_command"),
    execEvent("item_completed_command", { id: "item_x" }),
    execEvent("item_completed_mcp_tool_call", { server: "dir/servidor" }),
    execEvent("item_completed_agent_message"),
    execEvent("item_completed_reasoning"),
    execEvent("turn_completed"),
  ];
  const run = await wrapper(dir, "c26", events);
  assert.equal(run.status, 0);
  assert.deepEqual(run.report.counters.privacy, zeroPrivacy({ content_disabled: 5, sensitive_removed: 1 }));
  assert.equal(run.report.counters.reasoningExcluded, 1);
  assert.equal(run.report.events.length, 8, "7 eventos aceitos + process_exit");
  const mcp = run.report.events.find((e) => e.fields.itemType === "mcp_tool_call");
  assert.ok(!("mcpServer" in mcp.fields));
  const hookRun = await hook("claude", claudePayload("pre_tool_skill", { tool_input: { skill: "dono@marketplace" } }));
  assert.deepEqual(hookRun.report.counters.privacy, zeroPrivacy({ content_disabled: 1, sensitive_removed: 1 }));
});

test("I5-C29 entrada hostil com canários: hooks com stdout vazio e exit 0; wrapper preserva stdout e código 17", async () => {
  let deep = SECRET_TEXT;
  for (let i = 0; i < 3000; i++) deep = [deep];
  const hostile = [
    JSON.stringify({ ...claudePayload("pre_tool_bash"), tool_input: deep }),
    `{"__proto__":{"hook_event_name":"PreToolUse","tool_name":"Bash"},"secret":${JSON.stringify(SECRET_TEXT)}}`,
    JSON.stringify({ ...claudePayload("pre_tool_bash"), tool_name: { nome: SECRET_TEXT } }),
    JSON.stringify({ ...claudePayload("pre_tool_bash"), hook_event_name: "constructor", tool_input: { command: SECRET_TEXT } }),
    JSON.stringify({ ...claudePayload("pre_tool_bash"), tool_input: { command: SECRET_TEXT.repeat(1500) } }),
    `{"hook_event_name":"PreToolUse","tool_name":"Bash","x":"${SECRET_TEXT.replaceAll("\n", " ")}\uD800`,
    "\u0000" + SECRET_TEXT,
  ];
  for (const agent of ["claude", "codex"]) {
    for (const stdinText of hostile) {
      const run = await runClaudeHandler(hookHandler(agent), undefined, { env: baseEnv(), stdinText });
      assert.equal(run.status, 0, `${agent}: ${run.stderr}`);
      assert.equal(run.stdout, "", agent);
      for (const channel of [run.stderr, run.fd3]) assert.deepEqual(leaks(channel), [], agent);
    }
  }
  const dir = makeScratch("i5 c29 wrapper");
  const lines = [JSON.stringify(execEvent("item_completed_command", { command: SECRET_TEXT })), JSON.stringify({ type: "item.completed", item: deep }), `{"type":"item.completed","item":{"id":"${CANARIES.token}"`, JSON.stringify({ type: SECRET_TEXT })];
  const run = await wrapper(dir, "c29", lines, { FAKE_CODEX_EXIT: "17" });
  assert.equal(run.status, 17);
  assert.deepEqual(run.stdout, Buffer.from(lines.map((line) => line + "\n").join("")), "stdout do filho byte a byte");
  assert.deepEqual(leaks(JSON.stringify(run.report)), []);
});

test("I5-C33 o wrapper repassa canário nativo do filho enquanto o relatório do debugger não o contém", async () => {
  const dir = makeScratch("i5 c33");
  const childLine = JSON.stringify(execEvent("item_completed_command", { command: SECRET_TEXT, aggregated_output: CANARIES.token }));
  const scenario = writeScenario(dir, "c33", [{ stdout: childLine }, { stderr: `stderr nativo ${CANARIES.header}` }]);
  const run = await runWrapper({ args: ["p"], env: baseEnv({ FAKE_CODEX_SCENARIO: scenario, FAKE_CODEX_EXIT: "3" }), cwd: dir });
  assert.equal(run.status, 3);
  assert.deepEqual(run.stdout, Buffer.from(childLine + "\n"), "stdout nativo inalterado, canários inclusive");
  assert.ok(run.stdout.toString("utf8").includes(CANARIES.token));
  assert.ok(run.stderr.includes(`stderr nativo ${CANARIES.header}\n`), "stderr nativo inalterado");
  assert.ok(run.report, "relatório do debugger presente");
  assert.deepEqual(leaks(JSON.stringify(run.report)), [], "relatório sem canário");
});
