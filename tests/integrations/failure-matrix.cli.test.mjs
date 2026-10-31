import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { pathToFileURL } from "node:url";
import { INTEGRATIONS_CLI, REPO_ROOT, baseEnv, makeScratch, parseReport, runIntegrationsJson } from "./helpers/cli.mjs";
import { CANARY_PATTERN, fixtureCase, loadFixture } from "./helpers/fixtures.mjs";
import { readClaudeHandlers, readCodexHandlers, runClaudeHandler, runCodexHandler } from "./helpers/installed-hooks.mjs";
import { snapshotTree } from "./helpers/tree.mjs";
import { FAKE_CODEX, execEventLine, runWrapper, writeScenario } from "./helpers/wrapper.mjs";

const scratches = [];
let claude;
let codex;
before(() => {
  for (const agent of ["claude", "codex"]) {
    const root = makeScratch(`failure-${agent}`);
    scratches.push(root);
    const target = path.join(root, `.${agent}`);
    const temp = path.join(root, "temp dedicado");
    mkdirSync(target);
    mkdirSync(temp);
    const env = baseEnv({ TEMP: temp, TMP: temp, TMPDIR: temp, HOME: root, ...(process.platform === "win32" ? {} : { SHELL: "/bin/sh" }) });
    assert.equal(runIntegrationsJson(["install", "--agent", agent, "--target", target, "--apply"], { env }).status, 0);
    const handlers = agent === "claude" ? readClaudeHandlers(target) : readCodexHandlers(target);
    const run = agent === "claude" ? runClaudeHandler : runCodexHandler;
    const state = { root, target, temp, env, handlers, run, reportFd: agent === "claude" ? 3 : 2 };
    if (agent === "claude") claude = state;
    else codex = state;
  }
});
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

function scanForCanary(dir) {
  const hits = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const full = path.join(current, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (CANARY_PATTERN.test(readFileSync(full, "utf8"))) hits.push(full);
    }
  };
  walk(dir);
  return hits;
}

test("I4-C36 hooks Claude e Codex: seis falhas do consumidor/entrada mantêm saída neutra", async () => {
  const cases = {
    claude: { valid: fixtureCase("claude-hooks.json", "pre_tool_bash").payload, refused: fixtureCase("claude-hooks.json", "unknown_event").payload, event: "PreToolUse" },
    codex: { valid: fixtureCase("codex-hooks.json", "pre_tool_bash").payload, refused: fixtureCase("codex-hooks.json", "unknown_event").payload, event: "PreToolUse" },
  };
  for (const [agent, state] of [["claude", claude], ["codex", codex]]) {
    const { valid, refused, event } = cases[agent];
    const handler = state.handlers[event].handler;
    const outcomes = {};
    // 1. consumidor ausente: nenhuma variável de relatório.
    outcomes.ausente = await state.run(handler, valid, { env: state.env, cwd: state.root, reportFd: null });
    // 2. recusa: evento fora da allowlist.
    outcomes.recusa = await state.run(handler, refused, { env: state.env, cwd: state.root });
    // 3. desconexão: o leitor do canal de relatório fecha antes da escrita.
    outcomes.desconexao = await state.run(handler, valid, { env: state.env, cwd: state.root, destroyChannel: state.reportFd });
    // 4. timeout: stdin nunca fecha; o hook desiste no prazo de 2000 ms.
    outcomes.timeout = await state.run(handler, undefined, { env: state.env, cwd: state.root, stdinText: '{"hook_event_name":', keepStdinOpenMs: 1 });
    // 5. entrada inválida.
    outcomes.invalida = await state.run(handler, undefined, { env: state.env, cwd: state.root, stdinText: "não é json {" });
    // 6. limite: stdin acima de 1 MiB, mesmo começando como JSON plausível.
    outcomes.limite = await state.run(handler, undefined, {
      env: state.env,
      cwd: state.root,
      stdinText: JSON.stringify({ ...valid, padding: "x".repeat(1024 * 1024) }),
    });
    for (const [name, outcome] of Object.entries(outcomes)) {
      assert.equal(outcome.status, 0, `${agent}/${name}: ${outcome.stderr}`);
      assert.equal(outcome.stdout, "", `${agent}/${name}: nenhuma decisão ou contexto no stdout`);
    }
    assert.equal(outcomes.ausente.stderr, "", `${agent}: sem consumidor, nada no stderr`);
    assert.equal(outcomes.recusa.report.counters.unknownEvent, 1);
    assert.deepEqual(outcomes.recusa.report.events, []);
    assert.equal(outcomes.timeout.report.counters.stdinTimeout, 1);
    assert.ok(outcomes.timeout.elapsedMs >= 1900 && outcomes.timeout.elapsedMs < 6000, `${agent} timeout: ${outcomes.timeout.elapsedMs} ms`);
    assert.equal(outcomes.invalida.report.counters.invalidInput, 1);
    assert.equal(outcomes.limite.report.counters.inputTooLarge, 1);
    assert.deepEqual(outcomes.limite.report.events, []);
  }
});

// I25-C46 (l) (gate C em 60bbda8; linha "Duração monotônica no apoio dos hooks
// instalados" do Landing): no WSL o relógio civil recua ~1,8 s a cada ~30 s, e o
// caso de stdin aberto acima saiu com `claude timeout: 209 ms`. Um processo de
// prova isolado importa o apoio e recua só o próprio `Date.now` em 1.800 ms no
// meio da mesma chamada; o hook instalado (o CLI do produto) roda sem injeção.
const CLOCK_STEP_CHILD = `
const [url, handler, cwd, env] = process.argv.slice(1);
const { runClaudeHandler } = await import(url);
const realNow = Date.now;
let back = 0;
Date.now = () => realNow() - back;
setTimeout(() => (back = 1800), 200);
const civilStart = Date.now();
const run = await runClaudeHandler(JSON.parse(handler), undefined, { env: JSON.parse(env), cwd, stdinText: '{"hook_event_name":', keepStdinOpenMs: 1 });
process.stdout.write(JSON.stringify({ elapsedMs: run.elapsedMs, civilMs: Date.now() - civilStart, stdinTimeout: run.report?.counters?.stdinTimeout ?? null, status: run.status }));
`;
const INSTALLED_HOOKS = pathToFileURL(path.join(REPO_ROOT, "tests", "integrations", "helpers", "installed-hooks.mjs")).href;

test("I25-C46 apoio dos hooks instalados: com o relógio civil recuado no meio do caso de stdin aberto do I4-C36, a duração do apoio continua dentro da faixa do I4-C36", () => {
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", CLOCK_STEP_CHILD, INSTALLED_HOOKS, JSON.stringify(claude.handlers.PreToolUse.handler), claude.root, JSON.stringify(claude.env)], {
    encoding: "utf8",
    timeout: 60_000,
    windowsHide: true,
  });
  assert.equal(child.status, 0, child.stderr);
  const outcome = JSON.parse(child.stdout);
  assert.ok(outcome.civilMs < 1900, `o relógio civil do processo isolado recuou: ${outcome.civilMs} ms`);
  assert.deepEqual([outcome.status, outcome.stdinTimeout], [0, 1], "o hook esperou o prazo de 2000 ms do stdin");
  // A mesma faixa do I4-C36.
  assert.ok(outcome.elapsedMs >= 1900 && outcome.elapsedMs < 6000, `claude timeout: ${outcome.elapsedMs} ms`);
});

test("I4-C38 wrapper: seis falhas da observação preservam o código do filho", async (t) => {
  const dir = makeScratch("failure-wrapper");
  scratches.push(dir);
  const flood = (count) => [{ repeat: { count, line: '{"type":"item.completed","item":{"id":"item_{i}","type":"agent_message","text":"x"}}' } }];
  const env = (scenario) => baseEnv({ FAKE_CODEX_SCENARIO: writeScenario(dir, `s${Math.random().toString(16).slice(2)}`, scenario), FAKE_CODEX_EXIT: "17" });

  // 1. sem relatório.
  const absent = await runWrapper({ args: ["p"], env: env(flood(3)), cwd: dir, reportFd: null });
  assert.equal(absent.status, 17);
  // 2. eventos recusados.
  const refused = await runWrapper({ args: ["p"], env: env([{ stdout: execEventLine("unknown_type") }, { stdout: execEventLine("missing_type") }]), cwd: dir });
  assert.equal(refused.status, 17);
  assert.equal(refused.report.counters.unknownEvent, 1);
  assert.equal(refused.report.counters.invalidInput, 1);
  // 3. consumidor do stdout desconecta (EPIPE): o filho continua sendo drenado.
  const disconnected = await new Promise((resolve) => {
    const child = spawn(process.execPath, [INTEGRATIONS_CLI, "run", "--agent", "codex", "--codex-entry", FAKE_CODEX, "--", "p"], {
      cwd: dir,
      env: { ...env([{ stdout: execEventLine("thread_started") }, { sleepMs: 200 }, ...flood(2000)]), SKILL_ME_OBSERVER_REPORT_FD: "3" },
      stdio: ["ignore", "pipe", "pipe", "pipe"],
    });
    let fd3 = "";
    child.stdio[3].on("data", (chunk) => (fd3 += chunk));
    child.stdout.once("data", () => child.stdout.destroy());
    child.on("close", (status) => resolve({ status, report: parseReport(fd3) }));
  });
  assert.equal(disconnected.status, 17);
  assert.equal(disconnected.report.counters.accepted + disconnected.report.counters.dropped, 2002, "todas as linhas consumidas");
  // 4. relatório não drenado: ninguém lê o fd 3 enquanto o wrapper vive. Ele
  // precisa sair com o código do filho em ≤ 1000 ms além do fim do filho.
  // Medição: o filho carimba o relógio do sistema no seu último instante
  // observável (handler de `exit`) e o teste carimba ao receber o `exit` do
  // wrapper. Os atrasos de observação dos dois lados só aumentam o intervalo
  // medido: ele é um limite superior do intervalo real.
  const undrained = await new Promise((resolve) => {
    const child = spawn(process.execPath, [INTEGRATIONS_CLI, "run", "--agent", "codex", "--codex-entry", FAKE_CODEX, "--", "p"], {
      cwd: dir,
      env: { ...env(flood(600)), SKILL_ME_OBSERVER_REPORT_FD: "3", FAKE_CODEX_EXIT_STAMP: "1" },
      stdio: ["ignore", "ignore", "pipe", "pipe"],
    });
    child.stdio[3].pause();
    let stderr = "";
    const leftover = [];
    let wrapperExit;
    let stderrEnded = false;
    let reportEnded = false;
    const done = () => {
      if (wrapperExit && stderrEnded && reportEnded) resolve({ ...wrapperExit, stderr, leftover: Buffer.concat(leftover).toString("utf8") });
    };
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.stderr.on("end", () => ((stderrEnded = true), done()));
    // `close` esperaria o fd 3 pausado; `exit` é o fim do wrapper. Só depois
    // dele o teste lê o que ficou no pipe, para confirmar que o relatório não
    // tinha sido entregue (a escrita estava de fato bloqueada).
    child.on("exit", (status, signal) => {
      wrapperExit = { status, signal, exitedAt: Date.now() };
      const guard = setTimeout(() => child.stdio[3].destroy(), 10_000);
      child.stdio[3].on("data", (chunk) => leftover.push(chunk));
      child.stdio[3].once("close", () => {
        clearTimeout(guard);
        reportEnded = true;
        done();
      });
      child.stdio[3].resume();
      done();
    });
  });
  assert.equal(undrained.status, 17);
  const childExitAt = Number(/FAKE_CODEX_EXIT_AT (\d+)/.exec(undrained.stderr)?.[1]);
  assert.ok(Number.isSafeInteger(childExitAt), "carimbo do fim do filho presente");
  const afterChildMs = undrained.exitedAt - childExitAt;
  assert.ok(afterChildMs >= 0 && afterChildMs <= 1000, `wrapper saiu ${afterChildMs} ms depois do filho`);
  t.diagnostic(`relatório não drenado: wrapper saiu ${afterChildMs} ms depois do filho; ${undrained.leftover.length} bytes do relatório no pipe`);
  // A linha do relatório termina em "\n"; sem ela, a escrita ficou bloqueada até a saída.
  assert.ok(!undrained.leftover.includes("\n"), `relatório não entregue inteiro (${undrained.leftover.length} bytes no pipe)`);
  // 5. JSONL inválido.
  const invalid = await runWrapper({ args: ["p"], env: env([{ stdout: execEventLine("invalid_json_line") }, { stdout: execEventLine("non_object_line") }]), cwd: dir });
  assert.equal(invalid.status, 17);
  assert.equal(invalid.report.counters.invalidJson, 1);
  assert.equal(invalid.report.counters.invalidInput, 1);
  // 6. linha e receptor acima do limite.
  const limits = await runWrapper({ args: ["p"], env: env([{ raw: "y".repeat(80 * 1024) + "\n" }, ...flood(600)]), cwd: dir });
  assert.equal(limits.status, 17);
  assert.equal(limits.report.counters.oversizeLine, 1);
  assert.equal(limits.report.counters.dropped, 101);
});

test("I4-C39 canários não aparecem em nada produzido pelo debugger", async () => {
  // Hooks: todo caso de fixture (válido e inválido) atravessa o hook instalado.
  for (const [agent, state, fixture] of [["claude", claude, "claude-hooks.json"], ["codex", codex, "codex-hooks.json"]]) {
    for (const c of loadFixture(fixture).cases) {
      const event = c.payload?.hook_event_name;
      const handler = (state.handlers[event] ?? state.handlers.PreToolUse).handler;
      const run = await state.run(handler, c.payload, { env: state.env, cwd: state.root });
      assert.equal(run.status, 0);
      const channels = agent === "claude" ? [run.stdout, run.stderr, run.fd3] : [run.stdout, run.stderr];
      for (const text of channels) assert.ok(!CANARY_PATTERN.test(text), `${agent}/${c.name}`);
    }
    assert.deepEqual(scanForCanary(state.target), [], `${agent}: alvo`);
    assert.deepEqual(readdirSync(state.temp), [], `${agent}: TEMP dedicado continua vazio`);
  }

  // Wrapper: todos os eventos com canário no stdout do filho.
  const dir = makeScratch("canary-wrapper");
  scratches.push(dir);
  const temp = path.join(dir, "temp dedicado");
  mkdirSync(temp);
  const lines = loadFixture("codex-exec.json").cases.map((c) => (c.event ? JSON.stringify(c.event) : c.rawLine));
  const childStdout = Buffer.from(lines.map((line) => line + "\n").join(""));
  const run = await runWrapper({
    args: ["p"],
    env: baseEnv({ TEMP: temp, TMP: temp, TMPDIR: temp, FAKE_CODEX_SCENARIO: writeScenario(dir, "canaries", lines.map((line) => ({ stdout: line }))) }),
    cwd: dir,
  });
  assert.equal(run.status, 0);
  assert.ok(!CANARY_PATTERN.test(JSON.stringify(run.report)), "relatório");
  assert.ok(!CANARY_PATTERN.test(run.stderr), "stderr");
  // O stdout do wrapper é o stdout nativo do filho (C16): o debugger não
  // acrescenta nenhum byte — os canários ali são exatamente os que o Codex emitiu.
  assert.deepEqual(run.stdout, childStdout);
  assert.deepEqual(readdirSync(temp), []);
  assert.deepEqual(
    readdirSync(dir).sort(),
    ["canaries.json", "temp dedicado"],
    "nenhum arquivo criado pelo wrapper",
  );
});

test("I4-C44 sem consumidor, o hook instalado não escreve nada em lugar nenhum", async () => {
  for (const [agent, state, fixture] of [["claude", claude, "claude-hooks.json"], ["codex", codex, "codex-hooks.json"]]) {
    const before = snapshotTree(state.root);
    for (const c of loadFixture(fixture).cases.filter((c) => c.valid)) {
      const handler = state.handlers[c.payload.hook_event_name].handler;
      const run = await state.run(handler, c.payload, { env: state.env, cwd: state.root, reportFd: null });
      assert.equal(run.status, 0);
      assert.equal(run.stdout, "", `${agent}/${c.name}`);
      assert.equal(run.stderr, "", `${agent}/${c.name}`);
    }
    assert.deepEqual(snapshotTree(state.root), before, `${agent}: nenhum arquivo criado ou alterado (alvo e TEMP)`);
  }
});
