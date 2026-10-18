import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { isDeepStrictEqual } from "node:util";
import { EVENT_KIND_FIELDS } from "../../../src/integrations/boundary.mjs";
import { INTEGRATIONS_CLI, REPO_ROOT, baseEnv, makeScratch, parseReport } from "../helpers/cli.mjs";
import { runClaudeHandler } from "../helpers/installed-hooks.mjs";
import { CANARIES, DELIMITED_COMMAND, DELIMITED_COMMAND_OUT, DELIMITED_OUTPUT, DELIMITED_OUTPUT_OUT, ENCODED_MARKER, ENCODED_QUERY_URL, ENCODED_VALUE_URL, ENCODED_VALUE_URL_OUT, KEY_CANARIES, MARKER, SECRET_TEXT, claudePayload, codexHookPayload, execEvent, hermesRecord, leaks, ndjson } from "../helpers/privacy-canaries.mjs";
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

test("I5-C14b token como chave de argumentos MCP e nome de query codificado não chegam a temporários, lock, arquivos nem export", () => {
  const R = "[removido]";
  const tokenKeys = Object.values(KEY_CANARIES);
  const args = { q: "fica", nested: { keep: true, list: [{ keep: 2 }] } };
  tokenKeys.forEach((key, i) => {
    args[key] = "ok";
    args.nested[key] = { d: { d: "sub" } };
    args.nested.list[0][key] = [i];
  });
  const command = `curl '${ENCODED_QUERY_URL}'`;
  const commandOut = `curl 'https://example.test/p?t%6fken=${R}&page=2'`;
  const input = {
    "codex-exec": [execEvent("item_completed_mcp_tool_call", { arguments: args, result: null }), execEvent("item_completed_command", { command, aggregated_output: ENCODED_QUERY_URL })],
    claude: [claudePayload("pre_tool_bash", { tool_input: { command } }), claudePayload("post_tool_bash", { tool_input: { command }, tool_response: { stdout: ENCODED_QUERY_URL, stderr: "" } })],
    "codex-hooks": [codexHookPayload("pre_tool_bash", { tool_input: { command } })],
  };

  const root = makeScratch("i5 c14b store");
  const probeDir = makeScratch("i5 c14b probe");
  const fsProbeLog = path.join(probeDir, "fs-probe.jsonl");
  const privacyLog = path.join(probeDir, "privacy-probe.jsonl");
  const options = {
    nodeArgs: ["--import", FS_PROBE, "--import", PRIVACY_PROBE],
    env: baseEnv({ SKILL_ME_TEST_PRIVACY_PROBE_LOG: privacyLog, SKILL_ME_TEST_PRIVACY_PROBE_MARKER: MARKER, SKILL_ME_TEST_FS_PROBE_LOG: fsProbeLog, SKILL_ME_TEST_FS_PROBE_CANARY: MARKER }),
  };
  const commands = [];
  const run = (argv, extra = {}) => {
    const result = runPrivacy(argv, { ...options, ...extra });
    commands.push([argv[0], result]);
    return result;
  };
  const id = run(["start", "--root", root, "--content"]).body.capture.id;
  for (const [agent, entries] of Object.entries(input)) {
    const result = run(["ingest", "--root", root, "--capture", id, "--agent", agent], { input: ndjson(entries) });
    assert.equal(result.status, 0, agent);
    assert.equal(result.body.batch.persisted, entries.length, agent);
  }
  // Sem diff: a mensagem de falha não pode carregar o marcador.
  const clean = (text, label) => assert.ok(leaks(text).length === 0, label);
  for (const file of walkFiles(root)) clean(readFileSync(file, "utf8"), `após ingest: ${path.relative(root, file)}`);

  // O caso chegou aos campos certos: projeção exata e URL com só o valor removido.
  const exported = run(["export", "--root", root, "--capture", id]);
  assert.equal(exported.status, 0);
  const fieldsOf = (record) => record.content?.fields ?? [];
  const mcp = exported.body.records.find((r) => fieldsOf(r).some((f) => f.field === "item.arguments"));
  assert.ok(mcp, "registro do mcp_tool_call");
  assert.ok(isDeepStrictEqual(fieldsOf(mcp).find((f) => f.field === "item.arguments").value, { q: "fica", nested: { keep: true, list: [{ keep: 2 }] } }), "projeção sem as chaves-token");
  assert.ok(mcp.privacy.includes("item.arguments:sensitive_removed"));
  const texts = exported.body.records.flatMap((r) => fieldsOf(r).filter((f) => f.kind === "text").map((f) => [f.field, f.value]));
  assert.deepEqual(texts.map(([name]) => name).sort(), ["item.aggregated_output", "item.command", "tool_input.command", "tool_input.command", "tool_input.command", "tool_response.stderr", "tool_response.stdout"].sort());
  for (const [name, value] of texts) {
    if (name.endsWith("command")) assert.ok(value === commandOut, `${name} só o valor do parâmetro removido`);
    if (name === "item.aggregated_output" || name === "tool_response.stdout") assert.ok(value === `https://example.test/p?t%6fken=${R}&page=2`, name);
  }
  const status = run(["status", "--root", root, "--capture", id]);
  assert.ok(status.body.capture.counters.contentOmitted.sensitive_removed >= 6, "remoções contadas");
  run(["stop", "--root", root, "--capture", id]);
  assert.equal(run(["delete", "--root", root, "--capture", id, "--apply"]).status, 0);

  for (const [name, result] of commands) {
    clean(result.stdout, `${name} stdout`);
    assert.equal(result.stderr, "", `${name} stderr`);
  }
  const fsText = readFileSync(fsProbeLog, "utf8");
  const privacyText = readFileSync(privacyLog, "utf8");
  clean(fsText, "log do fs-probe");
  clean(privacyText, "log da sonda de privacidade");
  const renamed = fsText.trim().split("\n").map((line) => JSON.parse(line)).filter((o) => o.moment === "before_rename");
  assert.ok(renamed.filter((o) => /^events-\d{6}\.ndjson\.[0-9a-f]{8}\.skill-me-tmp$/.test(o.file)).length >= 3, "temporário de dados de cada ingest");
  for (const observation of renamed) assert.equal(observation.containsCanary, false, observation.file);
  const written = privacyText.trim().split("\n").map((line) => JSON.parse(line)).filter((e) => e.op === "closed_written");
  assert.ok(written.filter((e) => path.basename(e.file) === ".lock").length >= commands.length, "lock de cada comando");
  assert.ok(written.some((e) => e.file.endsWith(".skill-me-tmp")), "temporários observados");
  for (const entry of written) assert.equal(entry.containsMarker, false, path.basename(entry.file));
});

test("I5-C14c valor de query com token percent-encoded não chega a temporários, lock, arquivos, logs nem export", () => {
  const command = `curl '${ENCODED_VALUE_URL}'`;
  const commandOut = `curl '${ENCODED_VALUE_URL_OUT}'`;
  const input = {
    "codex-exec": [execEvent("item_completed_command", { command, aggregated_output: ENCODED_VALUE_URL })],
    claude: [claudePayload("pre_tool_bash", { tool_input: { command } }), claudePayload("post_tool_bash", { tool_input: { command }, tool_response: { stdout: ENCODED_VALUE_URL, stderr: "" } })],
    "codex-hooks": [codexHookPayload("pre_tool_bash", { tool_input: { command } })],
  };
  // Sem diff: a mensagem de falha não pode carregar o marcador.
  const clean = (text, label) => assert.ok(leaks(text).length === 0 && !text.includes(ENCODED_MARKER), label);

  // As sondas procuram um marcador por vez: uma passada com o literal
  // (`ghp%5FSKILLMECANARY…`) e outra com o valor inteiro codificado.
  for (const marker of [MARKER, ENCODED_MARKER]) {
    const root = makeScratch("i5 c14c store");
    const probeDir = makeScratch("i5 c14c probe");
    const fsProbeLog = path.join(probeDir, "fs-probe.jsonl");
    const privacyLog = path.join(probeDir, "privacy-probe.jsonl");
    const options = {
      nodeArgs: ["--import", FS_PROBE, "--import", PRIVACY_PROBE],
      env: baseEnv({ SKILL_ME_TEST_PRIVACY_PROBE_LOG: privacyLog, SKILL_ME_TEST_PRIVACY_PROBE_MARKER: marker, SKILL_ME_TEST_FS_PROBE_LOG: fsProbeLog, SKILL_ME_TEST_FS_PROBE_CANARY: marker }),
    };
    const commands = [];
    const run = (argv, extra = {}) => {
      const result = runPrivacy(argv, { ...options, ...extra });
      commands.push([argv[0], result]);
      return result;
    };
    const id = run(["start", "--root", root, "--content"]).body.capture.id;
    for (const [agent, entries] of Object.entries(input)) {
      const result = run(["ingest", "--root", root, "--capture", id, "--agent", agent], { input: ndjson(entries) });
      assert.equal(result.status, 0, agent);
      assert.equal(result.body.batch.persisted, entries.length, agent);
    }
    for (const file of walkFiles(root)) clean(readFileSync(file, "utf8"), `após ingest: ${path.relative(root, file)}`);

    const exported = run(["export", "--root", root, "--capture", id]);
    assert.equal(exported.status, 0);
    const texts = exported.body.records.flatMap((r) => (r.content?.fields ?? []).filter((f) => f.kind === "text").map((f) => [f.field, f.value]));
    assert.deepEqual(texts.map(([name]) => name).sort(), ["item.aggregated_output", "item.command", "tool_input.command", "tool_input.command", "tool_input.command", "tool_response.stderr", "tool_response.stdout"].sort());
    for (const [name, value] of texts) {
      if (name.endsWith("command")) assert.ok(value === commandOut, `${name} só os valores removidos`);
      if (name === "item.aggregated_output" || name === "tool_response.stdout") assert.ok(value === ENCODED_VALUE_URL_OUT, name);
    }
    for (const record of exported.body.records.filter((r) => r.content !== null)) assert.ok(record.privacy.some((e) => e.endsWith(":sensitive_removed")), "remoção registrada");
    run(["stop", "--root", root, "--capture", id]);
    assert.equal(run(["delete", "--root", root, "--capture", id, "--apply"]).status, 0);

    for (const [name, result] of commands) {
      clean(result.stdout, `${name} stdout`);
      assert.equal(result.stderr, "", `${name} stderr`);
    }
    const fsText = readFileSync(fsProbeLog, "utf8");
    const privacyText = readFileSync(privacyLog, "utf8");
    clean(fsText, "log do fs-probe");
    clean(privacyText, "log da sonda de privacidade");
    const renamed = fsText.trim().split("\n").map((line) => JSON.parse(line)).filter((o) => o.moment === "before_rename");
    assert.ok(renamed.filter((o) => /^events-\d{6}\.ndjson\.[0-9a-f]{8}\.skill-me-tmp$/.test(o.file)).length >= 3, "temporário de dados de cada ingest");
    for (const observation of renamed) assert.equal(observation.containsCanary, false, observation.file);
    const written = privacyText.trim().split("\n").map((line) => JSON.parse(line)).filter((e) => e.op === "closed_written");
    assert.ok(written.filter((e) => path.basename(e.file) === ".lock").length >= commands.length, "lock de cada comando");
    assert.ok(written.some((e) => e.file.endsWith(".skill-me-tmp")), "temporários observados");
    for (const entry of written) assert.equal(entry.containsMarker, false, path.basename(entry.file));
  }
});

test("I5-C14e valor sensível com vírgula/escape e userinfo com vários @ não chegam a temporários, lock, arquivos, logs nem export", () => {
  const input = {
    "codex-exec": [execEvent("item_completed_command", { command: DELIMITED_COMMAND, aggregated_output: DELIMITED_OUTPUT })],
    claude: [
      claudePayload("pre_tool_bash", { tool_input: { command: DELIMITED_COMMAND } }),
      claudePayload("post_tool_bash", { tool_input: { command: DELIMITED_COMMAND }, tool_response: { stdout: DELIMITED_OUTPUT, stderr: "" } }),
    ],
    "codex-hooks": [codexHookPayload("pre_tool_bash", { tool_input: { command: DELIMITED_COMMAND } })],
  };
  const root = makeScratch("i5 c14e store");
  const probeDir = makeScratch("i5 c14e probe");
  const fsProbeLog = path.join(probeDir, "fs-probe.jsonl");
  const privacyLog = path.join(probeDir, "privacy-probe.jsonl");
  const options = {
    nodeArgs: ["--import", FS_PROBE, "--import", PRIVACY_PROBE],
    env: baseEnv({ SKILL_ME_TEST_PRIVACY_PROBE_LOG: privacyLog, SKILL_ME_TEST_PRIVACY_PROBE_MARKER: MARKER, SKILL_ME_TEST_FS_PROBE_LOG: fsProbeLog, SKILL_ME_TEST_FS_PROBE_CANARY: MARKER }),
  };
  const commands = [];
  const run = (argv, extra = {}) => {
    const result = runPrivacy(argv, { ...options, ...extra });
    commands.push([argv[0], result]);
    return result;
  };
  // Sem diff: a mensagem de falha não pode carregar o marcador.
  const clean = (text, label) => assert.ok(leaks(text).length === 0, label);

  const id = run(["start", "--root", root, "--content"]).body.capture.id;
  for (const [agent, entries] of Object.entries(input)) {
    const result = run(["ingest", "--root", root, "--capture", id, "--agent", agent], { input: ndjson(entries) });
    assert.equal(result.status, 0, agent);
    assert.equal(result.body.batch.persisted, entries.length, agent);
  }
  for (const file of walkFiles(root)) clean(readFileSync(file, "utf8"), `após ingest: ${path.relative(root, file)}`);

  const exported = run(["export", "--root", root, "--capture", id]);
  assert.equal(exported.status, 0);
  const texts = exported.body.records.flatMap((r) => (r.content?.fields ?? []).filter((f) => f.kind === "text").map((f) => [f.field, f.value]));
  assert.deepEqual(texts.map(([name]) => name).sort(), ["item.aggregated_output", "item.command", "tool_input.command", "tool_input.command", "tool_input.command", "tool_response.stderr", "tool_response.stdout"].sort());
  for (const [name, value] of texts) {
    if (name.endsWith("command")) assert.ok(value === DELIMITED_COMMAND_OUT, `${name} só valores e userinfo removidos`);
    if (name === "item.aggregated_output" || name === "tool_response.stdout") assert.ok(value === DELIMITED_OUTPUT_OUT, name);
  }
  for (const record of exported.body.records.filter((r) => r.content !== null)) assert.ok(record.privacy.some((e) => e.endsWith(":sensitive_removed")), "remoção registrada");
  run(["stop", "--root", root, "--capture", id]);
  assert.equal(run(["delete", "--root", root, "--capture", id, "--apply"]).status, 0);
  assert.deepEqual(readdirSync(path.join(root, "skill-me-privacy", "captures")), [], "captura apagada");

  for (const [name, result] of commands) {
    clean(result.stdout, `${name} stdout`);
    assert.equal(result.stderr, "", `${name} stderr`);
  }
  const fsText = readFileSync(fsProbeLog, "utf8");
  const privacyText = readFileSync(privacyLog, "utf8");
  clean(fsText, "log do fs-probe");
  clean(privacyText, "log da sonda de privacidade");
  const renamed = fsText.trim().split("\n").map((line) => JSON.parse(line)).filter((o) => o.moment === "before_rename");
  assert.ok(renamed.filter((o) => /^events-\d{6}\.ndjson\.[0-9a-f]{8}\.skill-me-tmp$/.test(o.file)).length >= 3, "temporário de dados de cada ingest");
  for (const observation of renamed) assert.equal(observation.containsCanary, false, observation.file);
  const written = privacyText.trim().split("\n").map((line) => JSON.parse(line)).filter((e) => e.op === "closed_written");
  assert.ok(written.filter((e) => path.basename(e.file) === ".lock").length >= commands.length, "lock de cada comando");
  assert.ok(written.some((e) => e.file.endsWith(".skill-me-tmp")), "temporários observados");
  for (const entry of written) assert.equal(entry.containsMarker, false, path.basename(entry.file));
});

test("I5-C15 canários em IDs, nomes e caminhos não aparecem em nenhum canal do debugger", async () => {
  // Cada uma das cinco categorias ocupa, em entradas próprias, todo papel de
  // ID, nome e caminho que os quatro contratos fornecem. `expect` diz o que a
  // política precisa ter visto (ID aceito e pseudonimizado, nome removido com
  // sensitive_removed, caminho virado ref): sem isso a ausência do canário
  // poderia vir de uma entrada que nunca chegou ao papel. Rótulos por
  // categoria: nenhuma mensagem ecoa o canário.
  const CATEGORIES = Object.keys(CANARIES);
  assert.deepEqual(CATEGORIES, ["token", "header", "url", "password", "privateKey"]);
  const inPath = (value) => `/home/x/${value}/f.txt`;
  const cases = { claude: [], codex: [], exec: [], hermes: [] };
  for (const category of CATEGORIES) {
    const v = CANARIES[category];
    const claudeIds = { session_id: v, prompt_id: v, tool_use_id: v, cwd: inPath(v), transcript_path: `C:\\Users\\${v}\\t.jsonl` };
    const ids = ["sessionId", "promptId", "toolUseId"];
    cases.claude.push(
      { category, payload: claudePayload("pre_tool_bash", { ...claudeIds, tool_name: v, tool_input: { command: "ls" } }), ids, names: ["toolName"] },
      { category, payload: claudePayload("pre_tool_bash", { ...claudeIds, tool_name: "Read", tool_input: { file_path: inPath(v) } }), ids, names: [], path: "tool_input.file_path" },
      { category, payload: claudePayload("pre_tool_skill", { ...claudeIds, tool_input: { skill: v } }), ids, names: ["skillName"] },
      { category, payload: claudePayload("expansion_slash_command", { session_id: v, prompt_id: v, cwd: inPath(v), command_name: v, command_source: v }), ids: ["sessionId", "promptId"], names: ["skillName", "commandSource"] },
      { category, payload: claudePayload("expansion_mcp_prompt", { session_id: v, prompt_id: v, cwd: inPath(v), command_name: v, command_source: v }), ids: ["sessionId", "promptId"], names: ["commandName", "commandSource"] },
      { category, payload: claudePayload("subagent_start", { session_id: v, agent_id: v, cwd: inPath(v), agent_type: v }), ids: ["sessionId", "agentId"], names: ["agentType"] },
    );
    cases.codex.push({ category, payload: codexHookPayload("pre_tool_bash", { session_id: v, turn_id: v, tool_use_id: v, cwd: inPath(v), tool_name: v }), ids: ["sessionId", "turnId", "toolUseId"], names: ["toolName"] });
    cases.exec.push(
      { category, payload: { type: "thread.started", thread_id: v }, ids: ["threadId"], names: [] },
      { category, payload: execEvent("item_completed_mcp_tool_call", { id: v, server: v, tool: v }), ids: ["itemId"], names: ["toolName", "mcpServer"] },
      { category, payload: execEvent("item_completed_file_change", { id: v, changes: [{ path: inPath(v), kind: "add" }] }), ids: ["itemId"], names: [], path: "item.changes[].path" },
    );
    cases.hermes.push(
      { category, payload: hermesRecord("pre_tool_call", { session_id: v, tool_call_id: v, task_id: v, tool_name: v }), ids: ["sessionId", "taskId", "toolCallId"], names: ["toolName"] },
      { category, payload: hermesRecord("on_skill_lifecycle", { session_id: v, task_id: v, skill_name: v }), ids: ["sessionId", "taskId"], names: ["skillName"] },
    );
  }
  for (const [agent, list] of Object.entries(cases)) assert.deepEqual([...new Set(list.map((c) => c.category))], CATEGORIES, agent);

  const assertIds = (envelope, item, label) => {
    for (const name of item.ids) assert.match(envelope.ids[name] ?? "", PSEUDONYM, `${label} ${name}`);
    for (const name of item.names) {
      assert.ok(EVENT_KIND_FIELDS[envelope.eventKind].includes(name), `${label} ${name} pertence ao evento`);
      assert.ok(!(name in envelope.fields), `${label} ${name}`);
    }
    assert.ok(!envelope.gaps.some((gap) => item.names.some((name) => gap.startsWith(`${name}:`))), `${label} nome sem lacuna v1`);
  };
  const sensitive = (item) => item.names.length;

  // Relatórios dos hooks (um processo por entrada), do ingest Hermes e do wrapper, sem captura.
  for (const [agent, list] of [["claude", cases.claude], ["codex", cases.codex]]) {
    for (const item of list) {
      const label = `${agent} ${item.payload.hook_event_name} ${item.category}`;
      const run = await hook(agent, item.payload);
      for (const channel of [run.stdout, run.stderr, run.fd3]) assert.deepEqual(leaks(channel), [], label);
      assert.equal(run.report.events.length, 1, label);
      assertIds(run.report.events[0], item, label);
      assert.equal(run.report.counters.privacy.sensitive_removed, sensitive(item), label);
    }
  }
  const ingested = hermesIngest(cases.hermes.map((c) => c.payload));
  for (const channel of [ingested.stdout, ingested.stderr, ingested.fd3]) assert.deepEqual(leaks(channel), [], "ingest hermes");
  assert.equal(ingested.report.events.length, cases.hermes.length);
  cases.hermes.forEach((item, i) => assertIds(ingested.report.events[i], item, `hermes ${item.category}`));
  assert.equal(ingested.report.counters.privacy.sensitive_removed, cases.hermes.reduce((sum, c) => sum + sensitive(c), 0));
  const dir = makeScratch("i5 c15 wrapper");
  const wrapped = await wrapper(dir, "c15", cases.exec.map((c) => c.payload));
  assert.equal(wrapped.status, 0);
  assert.deepEqual(leaks(JSON.stringify(wrapped.report)), [], "relatório do wrapper");
  assert.deepEqual(leaks(wrapped.stderr), [], "stderr do wrapper (o filho não escreve stderr)");
  assert.equal(wrapped.report.events.length, cases.exec.length + 1);
  cases.exec.forEach((item, i) => assertIds(wrapped.report.events[i], item, `wrapper ${item.category}`));
  assert.equal(wrapped.report.counters.privacy.sensitive_removed, cases.exec.reduce((sum, c) => sum + sensitive(c), 0));

  // Comandos privacy com e sem opt-in: stdout/stderr, árvore final, export e,
  // pelas sondas da C14, lock e temporários observados antes do rename.
  const root = makeScratch("i5 c15 store");
  const probeDir = makeScratch("i5 c15 probe");
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
  const byAgent = [["claude", cases.claude], ["codex-hooks", cases.codex], ["codex-exec", cases.exec], ["hermes", cases.hermes]];
  const captures = [];
  for (const optIn of [[], ["--content"]]) {
    const mode = optIn.join("") || "sem opt-in";
    const id = run(["start", "--root", root, ...optIn]).body.capture.id;
    captures.push(id);
    const all = [];
    for (const [agent, list] of byAgent) {
      const result = run(["ingest", "--root", root, "--capture", id, "--agent", agent], { input: ndjson(list.map((c) => c.payload)) }, true);
      assert.equal(result.status, 0, `${mode} ${agent}`);
      assert.equal(result.body.batch.persisted, list.length, `${mode} ${agent}`);
      all.push(...list);
    }
    assertNoLeakInTree(root, `${mode} após ingest`);
    const exported = run(["export", "--root", root, "--capture", id]);
    assert.equal(exported.status, 0, mode);
    assert.equal(exported.body.records.length, all.length, mode);
    exported.body.records.forEach((record, i) => {
      const item = all[i];
      const label = `${mode} ${record.envelope.source.contract} ${item.category}`;
      assertIds(record.envelope, item, label);
      for (const name of item.names) assert.ok(record.privacy.includes(`envelope.${name}:sensitive_removed`), `${label} ${name}`);
      if (item.path && optIn.length > 0) {
        const ref = record.content?.fields.find((f) => f.field === item.path);
        assert.ok(ref, `${label} caminho virou ref`);
        for (const value of ref.refs ?? [ref.ref]) assert.match(value, PSEUDONYM, label);
      }
    });
    run(["status", "--root", root, "--capture", id]);
    run(["stop", "--root", root, "--capture", id], {}, true);
    run(["disable", "--root", root, "--capture", id], {}, true);
    run(["delete", "--root", root, "--capture", id]);
  }
  run(["prune", "--root", root]);
  for (const id of captures) assert.equal(run(["delete", "--root", root, "--capture", id, "--apply"]).status, 0);
  for (const [command, result] of commands) {
    assert.deepEqual(leaks(result.stdout), [], `${command} stdout`);
    assert.equal(result.stderr, "", `${command} stderr`);
  }
  for (const id of captures) assert.ok(!existsSync(path.join(root, "skill-me-privacy", "captures", id)));

  // As sondas viram os temporários e o lock de cada ingest; nenhum continha o
  // marcador. Os logs só têm nomes, booleanos e caminhos do scratch.
  const fsText = readFileSync(fsProbeLog, "utf8");
  const privacyText = readFileSync(privacyLog, "utf8");
  assert.deepEqual(leaks(fsText), [], "log do fs-probe");
  assert.deepEqual(leaks(privacyText), [], "log da sonda de privacidade");
  const fsObservations = fsText.trim().split("\n").map((line) => JSON.parse(line));
  const renamed = fsObservations.filter((o) => o.moment === "before_rename");
  assert.ok(renamed.filter((o) => /^events-\d{6}\.ndjson\.[0-9a-f]{8}\.skill-me-tmp$/.test(o.file)).length >= byAgent.length * 2, "temporário de dados de cada ingest");
  assert.ok(renamed.filter((o) => /^state\.json\.[0-9a-f]{8}\.skill-me-tmp$/.test(o.file)).length >= byAgent.length * 2, "temporário de estado de cada ingest");
  for (const observation of fsObservations) assert.equal(observation.containsCanary, false, `${observation.file} ${observation.moment}`);
  const written = privacyText.trim().split("\n").map((line) => JSON.parse(line)).filter((e) => e.op === "closed_written");
  assert.ok(written.filter((e) => path.basename(e.file) === ".lock").length >= commands.length, "lock de cada comando");
  assert.ok(written.some((e) => e.file.endsWith(".skill-me-tmp")), "temporários observados");
  for (const entry of written) assert.equal(entry.containsMarker, false, path.basename(entry.file));
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
