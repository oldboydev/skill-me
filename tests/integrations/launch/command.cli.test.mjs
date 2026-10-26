import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, rmdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { after, test } from "node:test";
import { SKILL_ME_HELP } from "../../../src/integrations/launch/command.mjs";
import { CODEX_GLOBAL_WINDOWS_TARGET, npmCmdShim } from "../../doctor/helpers/npm-shims.mjs";
import { REPO_ROOT, baseEnv, makeScratch } from "../helpers/cli.mjs";
import { FIXTURES_DIR } from "../helpers/fixtures.mjs";
import { locateSystemPython } from "../helpers/hermes-runtime.mjs";
import { AGENT_NAMES, LAUNCHER, agentArgs, agentBin, freshHome, launchCapturesOnDisk, launchEnv, preparedLaunch, readJsonLines, readLines, runSkillMe, writeScenario } from "../helpers/launch.mjs";
import { npmCli } from "../helpers/observe.mjs";
import { snapshotTree } from "../helpers/tree.mjs";

// Provas S1 e parte de S4 da issue #25 (C1–C6, C29, C30, C36): `skill-me` como
// processo real, com agentes de fixture no PATH, home e raiz temporários. Os
// valores esperados vêm dos critérios e do Landing de
// .checks/issue-25-agent-launch.md.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

const WINDOWS = process.platform === "win32";
const POSIX_ONLY = WINDOWS ? "sinais POSIX: o Windows não tem grupo de processos nem SIGQUIT/SIGHUP/SIGTERM entregáveis" : false;
const WINDOWS_ONLY = WINDOWS ? false : "PATHEXT, .cmd e o console do Windows só existem no Windows";

const fileIn = (dir) => (name) => path.join(dir, name);

async function waitFor(predicate, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`tempo esgotado: ${label}`);
    await sleep(20);
  }
}

test("I25-C1 npm link num prefixo temporário: skill-me --help de outro diretório sai com 0 e a ajuda, e o pacote continua privado", () => {
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  assert.equal(pkg.private, true);
  assert.deepEqual(pkg.bin, { "skill-me": "src/integrations/launch/cli.mjs" });
  assert.match(readFileSync(LAUNCHER, "utf8").split("\n")[0], /^#!\/usr\/bin\/env node\r?$/);
  const gitStatus = () => spawnSync("git", ["status", "--porcelain"], { cwd: REPO_ROOT, encoding: "utf8" }).stdout;
  const before = gitStatus();
  const prefix = scratch("i25 c1 prefixo npm");
  const home = scratch("i25 c1 home");
  const env = { ...baseEnv({ HOME: home, USERPROFILE: home }), npm_config_prefix: prefix, npm_config_cache: path.join(home, "npm cache"), npm_config_update_notifier: "false" };
  const linked = spawnSync(process.execPath, [npmCli(), "link", "--offline", "--no-audit", "--no-fund", "--ignore-scripts"], { cwd: REPO_ROOT, env, encoding: "utf8", timeout: 120_000 });
  const link = WINDOWS ? path.join(prefix, "node_modules", "skill-me") : path.join(prefix, "lib", "node_modules", "skill-me");
  try {
    assert.equal(linked.status, 0, linked.stderr);
    const other = scratch("i25 c1 outro diretório");
    const nodeDir = path.dirname(process.execPath);
    const run = WINDOWS
      ? spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "skill-me --help"], { cwd: other, env: baseEnv({ PATH: `${prefix};${nodeDir}` }), encoding: "utf8" })
      : spawnSync(path.join(prefix, "bin", "skill-me"), ["--help"], { cwd: other, env: baseEnv({ PATH: `${nodeDir}:/usr/bin:/bin` }), encoding: "utf8" });
    assert.deepEqual([run.status, run.stdout, run.stderr], [0, SKILL_ME_HELP, ""]);
  } finally {
    // O link aponta para o checkout: sai sozinho, nunca pela remoção recursiva do prefixo.
    if (existsSync(link) && lstatSync(link).isSymbolicLink()) {
      try {
        unlinkSync(link);
      } catch {
        rmdirSync(link);
      }
    }
  }
  assert.ok(existsSync(path.join(REPO_ROOT, "package.json")), "o checkout continua intacto");
  assert.equal(gitStatus(), before, "npm link não altera o checkout");
});

const LITERAL_ARGS = ["com espaço", 'aspas "duplas" e \'simples\'', "ção ✓ 日本", "--", "", "--flag=valor", "-x", "barra\\final\\", "%PATH%", "$HOME"];

test("I25-C2 argumentos literais: cada agente do PATH inicia sem shell com os argumentos na ordem, stdin herdado e o stdout dele intacto", async () => {
  const prepared = preparedLaunch(scratch, "i25 c2");
  const work = scratch("i25 c2 provas");
  const observed = {};
  const expected = {};
  for (const agent of AGENT_NAMES) {
    const probe = path.join(work, `${agent}.ndjson`);
    const stdout = `saída do ${agent}: ção ✓\n`;
    const result = await runSkillMe([agent, ...agentArgs(agent, LITERAL_ARGS)], {
      env: { ...prepared.env, FAKE_AGENT_PROBE: probe, FAKE_AGENT_READ_STDIN: "1", FAKE_AGENT_STDOUT: stdout, FAKE_AGENT_STDERR: `erro do ${agent}\n` },
      stdin: `entrada do ${agent} ✓\n`,
    });
    const [seen] = readJsonLines(probe);
    observed[agent] = { status: result.status, stdout: result.stdout.toString("utf8"), stderrFirst: result.stderr.split("\n")[0], argv: seen.argv, stdin: seen.stdin };
    expected[agent] = { status: 0, stdout, stderrFirst: `erro do ${agent}`, argv: LITERAL_ARGS, stdin: `entrada do ${agent} ✓\n` };
  }
  assert.deepEqual(observed, expected);
});

test("I25-C3 código do agente: 0 e 7 viram o código do skill-me", async () => {
  const prepared = preparedLaunch(scratch, "i25 c3", { agents: ["claude"] });
  const observed = {};
  for (const code of ["0", "7"]) observed[code] = (await runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_EXIT: code } })).status;
  assert.deepEqual(observed, { 0: 0, 7: 7 });
});

test("I25-C4 shim do npm no Windows: codex.cmd reconhecido inicia node com bin/codex.js sem passar pelo cmd, e outro .cmd sai com 127 sem criar nada", { skip: WINDOWS_ONLY }, async () => {
  const prepared = preparedLaunch(scratch, "i25 c4", { agents: ["codex", "claude"] });
  const work = scratch("i25 c4 provas");
  // Sentinela no shim: se o cmd.exe interpretasse o shim, o arquivo nasceria.
  const sentinel = path.join(work, "shim executado");
  writeFileSync(path.join(prepared.bin, "codex.cmd"), npmCmdShim(CODEX_GLOBAL_WINDOWS_TARGET, { extraLine: `echo x> "${sentinel}"` }));
  const probe = path.join(work, "codex.ndjson");
  const ok = await runSkillMe(["codex", "exec", "texto com espaço", "--", "ção"], { env: { ...prepared.env, FAKE_AGENT_PROBE: probe } });
  const [seen] = readJsonLines(probe);
  assert.deepEqual(
    { status: ok.status, argv: seen.argv, execPath: seen.execPath, script: seen.script, sentinel: existsSync(sentinel) },
    { status: 0, argv: ["exec", "texto com espaço", "--", "ção"], execPath: process.execPath, script: path.join(prepared.bin, "node_modules", "@openai", "codex", "bin", "codex.js"), sentinel: false },
  );

  // Outro .cmd (claude.cmd antes de qualquer claude.exe): recusado antes de preparar ou abrir algo.
  const { home, homes } = freshHome(scratch, "i25 c4 cmd");
  const bin = scratch("i25 c4 cmd bin");
  writeFileSync(path.join(bin, "claude.cmd"), `@echo off\r\necho x> "${sentinel}"\r\n`);
  const root = path.join(scratch("i25 c4 cmd raiz"), "raiz");
  mkdirSync(root);
  const before = { home: snapshotTree(home), root: snapshotTree(root) };
  const refused = await runSkillMe(["claude", "a"], { env: launchEnv({ home, homes, bin }) });
  assert.deepEqual(
    { status: refused.status, stdout: refused.stdout.toString(), code: refused.stderr.includes("[launcher_requires_shell]"), home: snapshotTree(home), root: snapshotTree(root), sentinel: existsSync(sentinel) },
    { status: 127, stdout: "", code: true, home: before.home, root: before.root, sentinel: false },
  );
});

test("I25-C5 sinais do terminal no POSIX: SIGINT, SIGQUIT e SIGHUP ao grupo chegam ao agente uma vez cada e o launcher sai depois dele, com o código dele", { skip: POSIX_ONLY }, async () => {
  const prepared = preparedLaunch(scratch, "i25 c5 posix", { agents: ["claude"] });
  const work = scratch("i25 c5 posix provas");
  const f = fileIn(work);
  const scenario = writeScenario(work, "espera", [{ touch: f("pronto") }, { waitFile: f("liberado") }]);
  const child = spawn(process.execPath, [LAUNCHER, "claude", ...agentArgs("claude")], {
    env: { ...prepared.env, FAKE_AGENT_SCENARIO: scenario, FAKE_AGENT_SIGNALS: f("sinais"), FAKE_AGENT_EXIT: "4" },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => (stderr += chunk));
  const closed = new Promise((resolve) => child.on("close", (status, signal) => resolve({ status, signal })));
  let launcherGone = false;
  child.on("exit", () => (launcherGone = true));
  await waitFor(() => existsSync(f("pronto")), "agente pronto");
  for (const [index, signal] of ["SIGINT", "SIGQUIT", "SIGHUP"].entries()) {
    process.kill(-child.pid, signal);
    await waitFor(() => readLines(f("sinais")).length === index + 1, signal);
    await sleep(100);
    assert.equal(launcherGone, false, `${signal} não encerra o launcher`);
  }
  writeFileSync(f("liberado"), "");
  const result = await closed;
  assert.deepEqual({ ...result, signals: readLines(f("sinais")) }, { status: 4, signal: null, signals: ["SIGINT", "SIGQUIT", "SIGHUP"] });
  assert.deepEqual(launchCapturesOnDisk(prepared.root).map((c) => c.state), ["stopped"], stderr);
});

test("I25-C5 Ctrl+C no console do Windows: um CTRL_C_EVENT real chega ao agente uma vez e o launcher sai depois dele, com o código dele", { skip: WINDOWS_ONLY || (locateSystemPython().skipReason ? `python-ausente: ${locateSystemPython().skipReason}` : false) }, async () => {
  const python = locateSystemPython();
  const prepared = preparedLaunch(scratch, "i25 c5 windows", { agents: ["claude"] });
  const work = scratch("i25 c5 windows provas");
  const f = fileIn(work);
  const scenario = writeScenario(work, "espera", [{ touch: f("pronto") }, { waitFile: f("liberado") }]);
  const env = { ...prepared.env, FAKE_AGENT_SCENARIO: scenario, FAKE_AGENT_SIGNALS: f("sinais"), FAKE_AGENT_EXIT: "5" };
  writeFileSync(f("config.json"), JSON.stringify({ argv: [process.execPath, LAUNCHER, "claude", ...agentArgs("claude")], env, ready: f("pronto"), seen: f("sinais"), release: f("liberado") }));
  const driver = spawn(python.command, [...python.prefix, "-I", path.join(FIXTURES_DIR, "launch", "console-ctrl-c.py"), f("config.json"), f("resultado.json")], { detached: true, stdio: "ignore" });
  await new Promise((resolve) => driver.on("exit", resolve));
  const result = JSON.parse(readFileSync(f("resultado.json"), "utf8"));
  assert.deepEqual(
    { stage: result.stage, generated: result.generated, seen: result.seen, status: result.status, signals: readLines(f("sinais")) },
    { stage: "done", generated: true, seen: true, status: 5, signals: ["SIGINT"] },
    JSON.stringify(result),
  );
  assert.deepEqual(launchCapturesOnDisk(prepared.root).map((c) => c.state), ["stopped"], result.stderr);
});

test("I25-C6 SIGTERM só ao launcher chega ao agente exatamente uma vez", { skip: POSIX_ONLY }, async () => {
  const prepared = preparedLaunch(scratch, "i25 c6", { agents: ["claude"] });
  const work = scratch("i25 c6 provas");
  const f = fileIn(work);
  const scenario = writeScenario(work, "espera", [{ touch: f("pronto") }, { waitFile: f("liberado") }]);
  const child = spawn(process.execPath, [LAUNCHER, "claude", ...agentArgs("claude")], {
    env: { ...prepared.env, FAKE_AGENT_SCENARIO: scenario, FAKE_AGENT_SIGNALS: f("sinais") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const closed = new Promise((resolve) => child.on("close", (status, signal) => resolve({ status, signal })));
  await waitFor(() => existsSync(f("pronto")), "agente pronto");
  process.kill(child.pid, "SIGTERM");
  await waitFor(() => readLines(f("sinais")).length >= 1, "SIGTERM no agente");
  await sleep(200);
  writeFileSync(f("liberado"), "");
  const result = await closed;
  assert.deepEqual({ ...result, signals: readLines(f("sinais")) }, { status: 0, signal: null, signals: ["SIGTERM"] });
});

test("I25-C29 término por sinal: a execução fica stopped e o launcher termina pelo mesmo sinal no POSIX, ou com o código do agente no Windows", async () => {
  const prepared = preparedLaunch(scratch, "i25 c29", { agents: ["claude"] });
  const observed = {};
  const expected = {};
  for (const signal of WINDOWS ? ["SIGTERM"] : ["SIGTERM", "SIGINT", "SIGHUP"]) {
    const result = await runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_SELF_SIGNAL: signal } });
    observed[signal] = { status: result.status, signal: result.signal, summary: /encerrada; capturas: 1/.test(result.stderr) };
    // No Windows o node encerra o próprio processo com código 1 e não há sinal a reemitir.
    expected[signal] = WINDOWS ? { status: 1, signal: null, summary: true } : { status: null, signal, summary: true };
  }
  if (!WINDOWS) {
    // Pelo terminal: SIGINT ao grupo encerra o agente (que morre pelo sinal) e o launcher reemite.
    const work = scratch("i25 c29 grupo");
    const f = fileIn(work);
    const scenario = writeScenario(work, "espera", [{ touch: f("pronto") }, { waitForever: true }]);
    const child = spawn(process.execPath, [LAUNCHER, "claude", ...agentArgs("claude")], {
      env: { ...prepared.env, FAKE_AGENT_SCENARIO: scenario, FAKE_AGENT_SIGNALS: f("sinais"), FAKE_AGENT_EXIT_ON: "SIGINT" },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });
    const closed = new Promise((resolve) => child.on("close", (status, signal) => resolve({ status, signal })));
    await waitFor(() => existsSync(f("pronto")), "agente pronto");
    process.kill(-child.pid, "SIGINT");
    const result = await closed;
    observed.terminal = { ...result, signals: readLines(f("sinais")) };
    expected.terminal = { status: null, signal: "SIGINT", signals: ["SIGINT"] };
  }
  assert.deepEqual(observed, expected);
  const states = launchCapturesOnDisk(prepared.root).map((c) => c.state);
  assert.equal(states.length, Object.keys(expected).length);
  assert.ok(states.every((state) => state === "stopped"), JSON.stringify(states));
});

test("I25-C30 falha de início: ENOENT sai com 127 e outro erro com 126, com o segmento 1 stopped e 0 eventos", async (t) => {
  const prepared = preparedLaunch(scratch, "i25 c30", { agents: ["claude", "codex"] });
  const cases = {};
  if (WINDOWS) {
    // ENOENT: o shim reconhecido aponta um bin/codex.js que sumiu.
    rmSync(path.join(prepared.bin, "node_modules", "@openai", "codex", "bin", "codex.js"));
    cases.ENOENT = { agent: "codex", status: 127 };
    // Outro erro: claude.exe que não é executável do Windows.
    unlinkSync(path.join(prepared.bin, "claude.exe"));
    writeFileSync(path.join(prepared.bin, "claude.exe"), "não é um executável\n");
    cases.outro = { agent: "claude", status: 126 };
  } else {
    // ENOENT: o interpretador do shebang não existe.
    writeFileSync(path.join(prepared.bin, "codex"), "#!/caminho/inexistente/interpretador\n");
    cases.ENOENT = { agent: "codex", status: 127 };
    if (process.getuid?.() === 0) t.diagnostic("root executa qualquer arquivo com bit x: o caso 126 (EACCES) fica de fora");
    else {
      // Outro erro: bit de execução só para outros usuários (EACCES no execve).
      // O arquivo já existe (agentBin): o modo vai por chmod, não pela escrita.
      writeFileSync(path.join(prepared.bin, "claude"), "#!/bin/sh\nexit 0\n");
      chmodSync(path.join(prepared.bin, "claude"), 0o001);
      cases.outro = { agent: "claude", status: 126 };
    }
  }
  const observed = {};
  const expected = {};
  for (const [label, { agent, status }] of Object.entries(cases)) {
    const before = new Set(launchCapturesOnDisk(prepared.root).map((c) => c.id));
    const result = await runSkillMe([agent], { env: prepared.env });
    const created = launchCapturesOnDisk(prepared.root).filter((c) => !before.has(c.id));
    observed[label] = {
      status: result.status,
      startCode: label === "ENOENT" ? result.stderr.includes("[ENOENT]") : /não foi possível iniciar \w+ \[[A-Z_]+\]/.test(result.stderr),
      captures: created.map((c) => [c.segment, c.state, c.counters.persisted]),
    };
    expected[label] = { status, startCode: true, captures: [[1, "stopped", 0]] };
  }
  assert.deepEqual(observed, expected);
});

test("I25-C36 ajuda: --help e help em stdout com 0; sem argumento ou com subcomando desconhecido, 2 e a ajuda no stderr", async () => {
  for (const args of [["--help"], ["help"]]) {
    const result = await runSkillMe(args, { env: baseEnv() });
    assert.deepEqual([result.status, result.stdout.toString(), result.stderr], [0, SKILL_ME_HELP, ""], args[0]);
  }
  for (const args of [[], ["gemini"], ["--versao"]]) {
    const result = await runSkillMe(args, { env: baseEnv() });
    assert.deepEqual([result.status, result.stdout.toString(), result.stderr], [2, "", SKILL_ME_HELP], args.join(" ") || "sem argumento");
  }
  for (const text of [
    "npm ci e npm link",
    "skill-me codex, skill-me claude ou skill-me hermes",
    "skill-me report",
    "confiança nativa é manual",
    "o Codex não tem evento nativo de ativação de skill",
    "os hooks do Codex cobrem só ferramentas locais",
    "cada captura tem até 500 eventos ou 8 MiB",
    "capturas sucessivas",
    "750 ms",
    "SIGKILL, TerminateProcess",
  ]) {
    assert.ok(SKILL_ME_HELP.replace(/\s+/g, " ").includes(text), text);
  }
});
