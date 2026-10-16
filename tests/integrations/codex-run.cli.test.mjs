import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { after, test } from "node:test";
import { CODEX_GLOBAL_WINDOWS_TARGET, npmCmdShim } from "../doctor/helpers/npm-shims.mjs";
import { baseEnv, makeScratch } from "./helpers/cli.mjs";
import { FAKE_CODEX, execEventLine, probeOf, runWrapper, writeScenario } from "./helpers/wrapper.mjs";

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
function scratch(label) {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
}

const BASIC = ["thread_started", "turn_started", "item_completed_command", "turn_completed"];

test("I4-C10 argumentos chegam literais ao filho, sem shell e sem comandos embutidos", async () => {
  const cwd = scratch("argv");
  const literal = [
    "prompt com espaço",
    "ação ç ü 日本",
    "&& echo PWNED > pwned.txt",
    "| calc",
    "; rm -rf .",
    "$(echo PWNED)",
    "`echo PWNED`",
    "%PATH%",
    "> out.txt",
    '"aspas" e \'simples\'',
    "",
  ];
  const run = await runWrapper({ args: literal, env: baseEnv(), cwd });
  assert.equal(run.status, 0, run.stderr);
  const probe = probeOf(run.stderr);
  assert.deepEqual(probe.argv, ["exec", "--json", ...literal]);
  assert.deepEqual(readdirSync(cwd), [], "nenhum arquivo criado por redirecionamento embutido");
  assert.ok(!run.stdout.toString("utf8").includes("PWNED"));
});

test("I4-C11 --json existente não é duplicado e --json após -- é literal", async () => {
  const cwd = scratch("json-flag");
  for (const [args, expected] of [
    [["--json", "p"], ["exec", "--json", "p"]],
    [["--experimental-json", "p"], ["exec", "--experimental-json", "p"]],
    [["p", "--json"], ["exec", "p", "--json"]],
    [["--", "--json"], ["exec", "--json", "--", "--json"]],
    [["p"], ["exec", "--json", "p"]],
  ]) {
    const run = await runWrapper({ args, env: baseEnv(), cwd });
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(probeOf(run.stderr).argv, expected, JSON.stringify(args));
  }
});

test("I4-C12 cwd, stdin, ambiente e flags de sandbox/aprovação chegam inalterados", async () => {
  const cwd = scratch("cwd stdin");
  const env = baseEnv({
    FAKE_CODEX_READ_STDIN: "1",
    CODEX_HOME: path.join(cwd, "codex home"),
    SKILLME_TEST_VALUE: "valor com espaço ç & | %X%",
  });
  const userArgs = ["--sandbox", "read-only", "--ask-for-approval", "never", "-c", 'model="fixture"', "-"];
  const stdinText = "PROMPT pelo stdin ação\nsegunda linha\n";
  const run = await runWrapper({ args: userArgs, env, cwd, stdinText });
  assert.equal(run.status, 0, run.stderr);
  const probe = probeOf(run.stderr);
  assert.equal(probe.cwd, cwd);
  assert.equal(probe.stdin, stdinText);
  // Linha de base: o mesmo fake iniciado direto, com o mesmo ambiente. No
  // Windows o libuv acrescenta variáveis obrigatórias e funde chaves de caixa
  // diferente em todo spawn; o wrapper não pode acrescentar nem tirar nada além.
  const direct = spawnSync(process.execPath, [FAKE_CODEX, "x"], {
    cwd,
    env: { ...env, SKILL_ME_OBSERVER_REPORT_FD: "3" },
    input: stdinText,
    encoding: "utf8",
  });
  assert.deepEqual(probe.env, probeOf(direct.stderr).env);
  assert.equal(probe.env.SKILLME_TEST_VALUE, "valor com espaço ç & | %X%");
  assert.equal(probe.env.CODEX_HOME, env.CODEX_HOME);
  assert.deepEqual(probe.argv, ["exec", "--json", ...userArgs]);
  for (const bypass of ["--dangerously-bypass-approvals-and-sandbox", "--yolo", "--full-auto", "--dangerously-bypass-hook-trust"])
    assert.ok(!probe.argv.includes(bypass), bypass);
});

test("I4-C13 códigos 0 e 17 do filho são preservados mesmo com o destino falhando", async () => {
  const dir = scratch("exit");
  const scenario = writeScenario(dir, "basic", BASIC.map((name) => ({ stdout: execEventLine(name) })));
  const flood = writeScenario(dir, "flood", [{ repeat: { count: 600, line: '{"type":"item.completed","item":{"id":"item_{i}","type":"agent_message","text":"x"}}' } }]);
  for (const code of [0, 17]) {
    const ok = await runWrapper({ args: ["p"], env: baseEnv({ FAKE_CODEX_SCENARIO: scenario, FAKE_CODEX_EXIT: String(code) }), cwd: dir });
    assert.equal(ok.status, code);
    assert.equal(ok.report.events.length, BASIC.length + 1, "eventos + process_exit");
    assert.deepEqual(ok.report.events.at(-1).fields, { processExitCode: code });
    // Destino de relatório inexistente (fd fechado) + receptor estourado.
    const broken = await runWrapper({ args: ["p"], env: baseEnv({ FAKE_CODEX_SCENARIO: flood, FAKE_CODEX_EXIT: String(code) }), cwd: dir, closeReportFd: true });
    assert.equal(broken.status, code);
    const overflow = await runWrapper({ args: ["p"], env: baseEnv({ FAKE_CODEX_SCENARIO: flood, FAKE_CODEX_EXIT: String(code) }), cwd: dir });
    assert.equal(overflow.status, code);
    assert.equal(overflow.report.counters.accepted, 500);
    assert.equal(overflow.report.counters.dropped, 101, "600 itens + process_exit além da capacidade 500");
  }
});

test("I4-C14 falha ao iniciar o Codex sai 127 com mensagem fixa e stdout vazio", async () => {
  const dir = scratch("spawn");
  const missing = path.join(dir, "não existe", "codex.mjs");
  const run = await runWrapper({ args: ["p"], entry: missing, env: baseEnv(), cwd: dir });
  assert.equal(run.status, 127);
  assert.equal(run.stdout.length, 0);
  assert.match(run.stderr, /não foi possível iniciar o Codex/);
  assert.ok(!run.stderr.includes("não existe"), "caminho recebido não é ecoado");
  assert.equal(run.report, null, "nenhum relatório de eventos");

  // Sem --codex-entry e sem Codex no PATH: resolução do doctor falha → 127.
  const noCodex = await runWrapper({ args: ["p"], entry: null, env: baseEnv({ PATH: path.join(dir, "vazio") }), cwd: dir });
  assert.equal(noCodex.status, 127);
  assert.equal(noCodex.stdout.length, 0);

  // `.cmd` explícito exigiria shell: uso inválido, nada é iniciado.
  const cmdEntry = await runWrapper({ args: ["p"], entry: path.join(dir, "codex.cmd"), env: baseEnv(), cwd: dir });
  assert.equal(cmdEntry.status, 2);
  assert.equal(cmdEntry.stdout.length, 0);

  // Sem --codex-entry, o wrapper usa o launcher que a resolução do doctor
  // (resolveAgents) encontra no PATH, sempre sem shell.
  const prefix = path.join(dir, "npm prefix");
  const pkg = process.platform === "win32" ? path.join(prefix, "node_modules", "@openai", "codex") : path.join(prefix, "lib", "node_modules", "@openai", "codex");
  mkdirSync(path.join(pkg, "bin"), { recursive: true });
  writeFileSync(path.join(pkg, "package.json"), JSON.stringify({ name: "@openai/codex", version: "0.162.1", type: "module", bin: { codex: "bin/codex.js" } }));
  writeFileSync(path.join(pkg, "bin", "codex.js"), `#!/usr/bin/env node\nimport ${JSON.stringify(pathToFileURL(FAKE_CODEX).href)};\n`, { mode: 0o755 });
  if (process.platform === "win32") {
    // Shim npm `.cmd`: iniciá-lo exigiria cmd.exe → 127 pedindo --codex-entry.
    writeFileSync(path.join(prefix, "codex.cmd"), npmCmdShim(CODEX_GLOBAL_WINDOWS_TARGET));
    const shim = await runWrapper({ args: ["p"], entry: null, env: baseEnv({ PATH: prefix }), cwd: dir });
    assert.equal(shim.status, 127);
    assert.match(shim.stderr, /--codex-entry/);
    assert.equal(probeOf(shim.stderr), null, "o shim não foi executado");
  } else {
    // Launcher POSIX (link para bin/codex.js com shebang) é iniciado direto.
    const binDir = path.join(prefix, "bin");
    mkdirSync(binDir);
    symlinkSync("../lib/node_modules/@openai/codex/bin/codex.js", path.join(binDir, "codex"));
    const pathValue = binDir + path.delimiter + path.dirname(process.execPath);
    const resolved = await runWrapper({ args: ["p"], entry: null, env: baseEnv({ PATH: pathValue, FAKE_CODEX_EXIT: "17" }), cwd: dir });
    assert.equal(resolved.status, 17, resolved.stderr);
    assert.deepEqual(probeOf(resolved.stderr).argv, ["exec", "--json", "p"]);
  }
});

test("I4-C15 interrupção POSIX: sinais encaminhados e término espelhado", { skip: process.platform === "win32" ? "posix-signals: no Windows, sinal programático vira TerminateProcess sem handler; limite declarado no guia" : false }, async () => {
  const dir = scratch("signals");
  const waiting = writeScenario(dir, "waiting", [{ stdout: execEventLine("thread_started") }, { waitForever: true }]);

  // SIGTERM ao wrapper → filho sem handler morre por SIGTERM → wrapper reemite.
  const term = await runWrapper({
    args: ["p"],
    env: baseEnv({ FAKE_CODEX_SCENARIO: waiting }),
    cwd: dir,
    onLine: (line, child) => child.kill("SIGTERM"),
  });
  assert.equal(term.signal, "SIGTERM");
  assert.equal(term.status, null);

  // SIGINT ao wrapper → filho trata, emite turn.failed e sai 130 → wrapper sai 130.
  const int = await runWrapper({
    args: ["p"],
    env: baseEnv({ FAKE_CODEX_SCENARIO: waiting, FAKE_CODEX_ON_SIGINT: "130" }),
    cwd: dir,
    onLine: (line, child) => {
      if (line.includes("thread.started")) child.kill("SIGINT");
    },
  });
  assert.equal(int.status, 130);
  assert.deepEqual(int.report.events.map((e) => e.nativeEvent), ["thread.started", "turn.failed", "process.exit"]);
  assert.deepEqual(int.report.events.at(-1).fields, { processExitCode: 130 });

  // Filho que se mata com SIGTERM → wrapper termina pelo mesmo sinal.
  const self = await runWrapper({ args: ["p"], env: baseEnv({ FAKE_CODEX_SELF_SIGNAL: "SIGTERM" }), cwd: dir });
  assert.equal(self.signal, "SIGTERM");
});

test("I4-C16 stdout repassado byte a byte e de forma incremental; JSONL consumido com limites", async () => {
  const dir = scratch("stream");
  const gate = path.join(dir, "liberar");
  const thread = execEventLine("thread_started");
  const turnStarted = execEventLine("turn_started");
  const steps = [
    { stdout: thread },
    { waitFile: gate },
    { raw: turnStarted.slice(0, 7) },
    { sleepMs: 50 },
    { raw: turnStarted.slice(7) + "\n" },
    { raw: "x".repeat(70 * 1024) + "\n" },
    { stdout: execEventLine("invalid_json_line") },
    { stdout: execEventLine("unknown_type") },
    { raw: "\r\n" },
    { stdout: execEventLine("turn_completed") },
    { raw: '{"type":"turn.started"' },
  ];
  const expectedStdout = Buffer.concat([
    Buffer.from(thread + "\n"),
    Buffer.from(turnStarted + "\n"),
    Buffer.from("x".repeat(70 * 1024) + "\n"),
    Buffer.from(execEventLine("invalid_json_line") + "\n"),
    Buffer.from(execEventLine("unknown_type") + "\n"),
    Buffer.from("\r\n"),
    Buffer.from(execEventLine("turn_completed") + "\n"),
    Buffer.from('{"type":"turn.started"'),
  ]);
  let firstLineSeenBeforeGate = false;
  const run = await runWrapper({
    args: ["p"],
    env: baseEnv({ FAKE_CODEX_SCENARIO: writeScenario(dir, "stream", steps) }),
    cwd: dir,
    onLine: (line) => {
      if (line === thread && !existsSync(gate)) {
        firstLineSeenBeforeGate = true;
        writeFileSync(gate, "ok");
      }
    },
  });
  assert.equal(run.status, 0, run.stderr);
  assert.ok(firstLineSeenBeforeGate, "primeira linha chegou antes de o filho emitir a segunda");
  assert.deepEqual(run.stdout, expectedStdout);
  assert.deepEqual(run.report.events.map((e) => e.nativeEvent), ["thread.started", "turn.started", "turn.completed", "process.exit"]);
  assert.equal(run.report.counters.oversizeLine, 1);
  assert.equal(run.report.counters.invalidJson, 1);
  assert.equal(run.report.counters.unknownEvent, 1);
  assert.equal(run.report.counters.partialTrailingLine, 1);
});

test("I4-C17 stderr do filho fica separado e raciocínio nunca entra no debugger", async () => {
  const dir = scratch("stderr");
  const reasoning = execEventLine("item_completed_reasoning");
  const steps = [
    { stderr: '{"type":"thread.started","thread_id":"veio-do-stderr"}' },
    { stderr: "erro livre SKILLME-CANARY-error" },
    { stdout: execEventLine("thread_started") },
    { stdout: reasoning },
    { stdout: execEventLine("item_completed_agent_message") },
  ];
  const run = await runWrapper({ args: ["p"], env: baseEnv({ FAKE_CODEX_SCENARIO: writeScenario(dir, "stderr", steps) }), cwd: dir });
  assert.equal(run.status, 0);
  assert.ok(run.stderr.includes('{"type":"thread.started","thread_id":"veio-do-stderr"}\nerro livre SKILLME-CANARY-error\n'));
  const reportText = JSON.stringify(run.report);
  assert.ok(!reportText.includes("veio-do-stderr"), "stderr não é lido como JSONL");
  assert.ok(!reportText.includes("SKILLME-CANARY"), "nenhum conteúdo no relatório");
  assert.equal(run.report.counters.reasoningExcluded, 1);
  assert.deepEqual(run.report.events.map((e) => e.fields.itemType ?? e.nativeEvent), ["thread.started", "agent_message", "process.exit"]);
  // O stdout do wrapper é a saída nativa do Codex — inclusive o item de
  // raciocínio que o próprio Codex emitiu —, não telemetria do debugger.
  assert.ok(run.stdout.toString("utf8").includes(reasoning));
});
