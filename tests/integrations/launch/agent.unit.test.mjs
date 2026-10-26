import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { createProductionFsAdapter } from "../../../src/doctor/fs-adapter.mjs";
import { resolveCodexShimEntry } from "../../../src/doctor/launcher-link/codex.mjs";
import { agentEnvironment, guardSignals, resolveAgentLaunch, runAgent } from "../../../src/integrations/launch/agent.mjs";
import { buildFsTree, createFakeFsAdapter } from "../../doctor/helpers/fake-fs-adapter.mjs";
import { CODEX_GLOBAL_SH_TARGET, CODEX_GLOBAL_WINDOWS_TARGET, CODEX_LOCAL_WINDOWS_TARGET, npmCmdShim, npmShShim } from "../../doctor/helpers/npm-shims.mjs";
import { makeScratch } from "../helpers/cli.mjs";

// Prova C4 da issue #25 na própria camada: a decisão de como iniciar o agente
// resolvido no PATH (linha "Início do agente" do Landing em
// .checks/issue-25-agent-launch.md). Os shims são os templates reais do npm
// (tests/doctor/helpers/npm-shims.mjs); a resolução roda com platform "win32"
// sobre o disco real, em qualquer SO, porque só o PATHEXT muda por plataforma.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

const fs = createProductionFsAdapter();

function codexPackage(prefix, { name = "@openai/codex", version = "0.162.1" } = {}) {
  const pkg = path.join(prefix, "node_modules", "@openai", "codex");
  mkdirSync(path.join(pkg, "bin"), { recursive: true });
  writeFileSync(path.join(pkg, "package.json"), JSON.stringify({ name, version }));
  writeFileSync(path.join(pkg, "bin", "codex.js"), "// fixture sintética\n");
  return path.join(pkg, "bin", "codex.js");
}

test("I25-C4 entrada do shim: só a linha de invocação do template do npm, de um único pacote @openai/codex com versão, vira a entrada iniciada pelo node", async () => {
  const observed = {};
  const expected = {};
  // Shim global (prefixo do npm) e local (node_modules/.bin) do Windows, e o sh do npm.
  const global = scratch("i25 c4 global");
  expected["cmd global"] = codexPackage(global);
  writeFileSync(path.join(global, "codex.cmd"), npmCmdShim(CODEX_GLOBAL_WINDOWS_TARGET));
  observed["cmd global"] = await resolveCodexShimEntry(path.join(global, "codex.cmd"), { fs });

  const local = scratch("i25 c4 local");
  expected["cmd local"] = codexPackage(local);
  mkdirSync(path.join(local, "node_modules", ".bin"));
  writeFileSync(path.join(local, "node_modules", ".bin", "codex.cmd"), npmCmdShim(CODEX_LOCAL_WINDOWS_TARGET));
  observed["cmd local"] = await resolveCodexShimEntry(path.join(local, "node_modules", ".bin", "codex.cmd"), { fs });

  const sh = scratch("i25 c4 sh");
  expected["sh global"] = codexPackage(sh);
  writeFileSync(path.join(sh, "codex"), npmShShim(CODEX_GLOBAL_SH_TARGET));
  observed["sh global"] = await resolveCodexShimEntry(path.join(sh, "codex"), { fs });

  // Recusas: referência só ecoada, pacote alheio, versão ilegível, shim ausente.
  const echoed = scratch("i25 c4 eco");
  codexPackage(echoed);
  writeFileSync(path.join(echoed, "codex.cmd"), `@ECHO off\r\necho "%dp0%\\${CODEX_GLOBAL_WINDOWS_TARGET}" %*\r\n`);
  observed["só ecoa a referência"] = await resolveCodexShimEntry(path.join(echoed, "codex.cmd"), { fs });
  expected["só ecoa a referência"] = null;

  const foreign = scratch("i25 c4 alheio");
  codexPackage(foreign, { name: "codex-falso" });
  writeFileSync(path.join(foreign, "codex.cmd"), npmCmdShim(CODEX_GLOBAL_WINDOWS_TARGET));
  observed["pacote alheio"] = await resolveCodexShimEntry(path.join(foreign, "codex.cmd"), { fs });
  expected["pacote alheio"] = null;

  const unreadable = scratch("i25 c4 versao");
  codexPackage(unreadable, { version: "SKILLMECANARY versão" });
  writeFileSync(path.join(unreadable, "codex.cmd"), npmCmdShim(CODEX_GLOBAL_WINDOWS_TARGET));
  observed["versão ilegível"] = await resolveCodexShimEntry(path.join(unreadable, "codex.cmd"), { fs });
  expected["versão ilegível"] = null;

  observed["shim ausente"] = await resolveCodexShimEntry(path.join(scratch("i25 c4 vazio"), "codex.cmd"), { fs });
  expected["shim ausente"] = null;
  assert.deepEqual(observed, expected);
});

test("I25-C4 entrada do shim: no Windows, .cmd/.bat só é iniciado quando é o shim reconhecido do codex; os demais exigiriam shell", async () => {
  const env = { PATHEXT: ".COM;.EXE;.BAT;.CMD" };
  const observed = {};
  const expected = {};
  const recognized = scratch("i25 c4 path codex");
  const entry = codexPackage(recognized);
  writeFileSync(path.join(recognized, "codex.cmd"), npmCmdShim(CODEX_GLOBAL_WINDOWS_TARGET));
  observed["codex.cmd do npm"] = await resolveAgentLaunch({ agent: "codex", env: { ...env, PATH: recognized }, platform: "win32", cwd: null });
  expected["codex.cmd do npm"] = { command: process.execPath, prefix: [entry], entry };

  const foreignShim = scratch("i25 c4 path alheio");
  writeFileSync(path.join(foreignShim, "codex.cmd"), "@echo off\r\nnode outro.js %*\r\n");
  observed["codex.cmd alheio"] = await resolveAgentLaunch({ agent: "codex", env: { ...env, PATH: foreignShim }, platform: "win32", cwd: null });
  expected["codex.cmd alheio"] = { failure: "launcher_requires_shell" };

  for (const agent of ["claude", "hermes"]) {
    const dir = scratch(`i25 c4 path ${agent}`);
    writeFileSync(path.join(dir, `${agent}.cmd`), "@echo off\r\n");
    observed[`${agent}.cmd`] = await resolveAgentLaunch({ agent, env: { ...env, PATH: dir }, platform: "win32", cwd: null });
    expected[`${agent}.cmd`] = { failure: "launcher_requires_shell" };
  }
  const bat = scratch("i25 c4 path bat");
  writeFileSync(path.join(bat, "claude.bat"), "@echo off\r\n");
  observed["claude.bat"] = await resolveAgentLaunch({ agent: "claude", env: { ...env, PATH: bat }, platform: "win32", cwd: null });
  expected["claude.bat"] = { failure: "launcher_requires_shell" };

  // Um .exe antes do .cmd no PATHEXT vence e é iniciado direto, sem shell.
  const exe = scratch("i25 c4 path exe");
  writeFileSync(path.join(exe, "claude.exe"), "MZ");
  writeFileSync(path.join(exe, "claude.cmd"), "@echo off\r\n");
  observed["claude.exe"] = await resolveAgentLaunch({ agent: "claude", env: { ...env, PATH: exe }, platform: "win32", cwd: null });
  expected["claude.exe"] = { command: path.join(exe, "claude.exe"), prefix: [] };

  observed.ausente = await resolveAgentLaunch({ agent: "hermes", env: { ...env, PATH: scratch("i25 c4 path vazio") }, platform: "win32", cwd: null });
  expected.ausente = { failure: "executable_not_found" };
  assert.deepEqual(observed, expected);
});

// C45 (terceira revisão formal em 9cd06d5, P2 de agent.mjs:30; linha
// "Componentes vazios do PATH" do Landing): a decisão do resolver, com o
// filesystem em memória do doctor — os mesmos caminhos POSIX e Windows em
// qualquer SO. Há um `codex` no diretório atual e outro num diretório
// posterior; `/vazio` não tem agente.
test("I25-C45 resolução: no POSIX cada componente vazio do PATH é o diretório atual, na posição dele; PATH ausente e o Windows não mudam", async () => {
  const tree = buildFsTree();
  for (const file of ["/projeto/codex", "/depois/bin/codex", "C:\\projeto\\codex.exe", "C:\\depois\\bin\\codex.exe"]) tree.files.set(file, Buffer.from("#!/bin/sh\n"));
  const fs = createFakeFsAdapter(tree);
  const posix = (PATH) => resolveAgentLaunch({ agent: "codex", env: PATH === undefined ? {} : { PATH }, platform: "linux", cwd: "/projeto", fs });
  const windows = (PATH) => resolveAgentLaunch({ agent: "codex", env: { PATH, PATHEXT: ".COM;.EXE;.BAT;.CMD" }, platform: "win32", cwd: "C:\\projeto", fs });
  const here = { command: "/projeto/codex", prefix: [] };
  const later = { command: "/depois/bin/codex", prefix: [] };
  const cases = {
    "controle: só o posterior": [() => posix("/depois/bin"), later],
    "controle: diretório sem o agente antes": [() => posix("/vazio:/depois/bin"), later],
    "vazio no começo": [() => posix(":/depois/bin"), here],
    "vazio no meio": [() => posix("/vazio::/depois/bin"), here],
    "vazio no fim, depois do agente": [() => posix("/depois/bin:"), later],
    "vazio no fim": [() => posix("/vazio:"), here],
    "vazios repetidos no começo": [() => posix("::/depois/bin"), here],
    "vazios repetidos no fim": [() => posix("/vazio:::"), here],
    "PATH explicitamente vazio": [() => posix(""), here],
    "PATH ausente": [() => posix(undefined), { failure: "executable_not_found" }],
    "Windows: vazios continuam ignorados": [() => windows(";C:\\depois\\bin;"), { command: "C:\\depois\\bin\\codex.exe", prefix: [] }],
    "Windows: PATH vazio": [() => windows(""), { failure: "executable_not_found" }],
  };
  const observed = {};
  const expected = {};
  for (const [label, [resolve, want]] of Object.entries(cases)) {
    observed[label] = await resolve();
    expected[label] = want;
  }
  assert.deepEqual(observed, expected);
});

test("I25-C16 ambiente do agente: nenhum valor herdado dos dois pares, completo ou não, e só o par da execução", () => {
  const binding = { root: "/raiz real", invocation: "a".repeat(32) };
  const inherited = { PATH: "/bin", SKILL_ME_CAPTURE_ROOT: "/outra", SKILL_ME_CAPTURE_ID: "b".repeat(32), SKILL_ME_LAUNCH_ID: "c".repeat(32), SKILL_ME_CAPTURE_REPORT: "/diag.ndjson" };
  assert.deepEqual(agentEnvironment(inherited, "linux", binding), { PATH: "/bin", SKILL_ME_CAPTURE_REPORT: "/diag.ndjson", SKILL_ME_LAUNCH_ROOT: "/raiz real", SKILL_ME_LAUNCH_ID: "a".repeat(32) });
  // No Windows o nome da variável não diferencia maiúsculas.
  const windows = { Path: "C:\\bin", skill_me_capture_id: "b".repeat(32), Skill_Me_Launch_Root: "C:\\velha" };
  assert.deepEqual(agentEnvironment(windows, "win32", binding), { Path: "C:\\bin", SKILL_ME_LAUNCH_ROOT: "/raiz real", SKILL_ME_LAUNCH_ID: "a".repeat(32) });
  // No POSIX, nomes de outra grafia são outras variáveis e ficam.
  assert.deepEqual(agentEnvironment({ skill_me_capture_id: "x" }, "linux", binding), { skill_me_capture_id: "x", SKILL_ME_LAUNCH_ROOT: "/raiz real", SKILL_ME_LAUNCH_ID: "a".repeat(32) });
});

// C42 (revisão formal em 2fd858a, P2 de agent.mjs:61; linha "Cancelamento antes
// do agente" do Landing): a decisão do guard sobre cada sinal, antes e depois de
// o agente iniciar. O processo é um EventEmitter só aqui, na tabela; a fronteira
// real (processo do launcher, console do Windows) está em command.cli.
function fakeChild() {
  const killed = [];
  return { exitCode: null, signalCode: null, killed, kill: (signal) => killed.push(signal) };
}

test("I25-C42 guard: antes de o agente iniciar, o primeiro sinal do terminal ou SIGTERM cancela; depois, o terminal é ignorado e SIGTERM chega ao agente uma vez por sinal", () => {
  const observed = {};
  const expected = {};
  for (const [platform, signals] of [["linux", ["SIGINT", "SIGQUIT", "SIGHUP", "SIGTERM"]], ["win32", ["SIGINT", "SIGHUP", "SIGTERM"]]]) {
    for (const signal of signals) {
      const proc = new EventEmitter();
      const guard = guardSignals({ proc, platform });
      proc.emit(signal);
      proc.emit("SIGTERM");
      observed[`${platform} ${signal} antes`] = guard.cancelled;
      expected[`${platform} ${signal} antes`] = signal;
      guard.release();
    }
  }
  // No Windows o SIGQUIT não existe: nada escuta nem cancela.
  const windows = new EventEmitter();
  const windowsGuard = guardSignals({ proc: windows, platform: "win32" });
  windows.emit("SIGQUIT");
  observed["win32 SIGQUIT"] = [windowsGuard.cancelled, windows.listenerCount("SIGQUIT")];
  expected["win32 SIGQUIT"] = [null, 0];
  windowsGuard.release();

  // Agente vivo: terminal ignorado (já chegou ao grupo), SIGTERM repassado um para um, sem cancelar.
  const proc = new EventEmitter();
  const guard = guardSignals({ proc, platform: "linux" });
  const child = fakeChild();
  guard.attach(child);
  for (const signal of ["SIGINT", "SIGQUIT", "SIGHUP", "SIGTERM", "SIGTERM"]) proc.emit(signal);
  observed.vivo = [guard.cancelled, [...child.killed]];
  expected.vivo = [null, ["SIGTERM", "SIGTERM"]];
  // Agente já saiu (espera e encerramento da execução): nada é repassado nem cancela.
  child.exitCode = 0;
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) proc.emit(signal);
  observed.saiu = [guard.cancelled, [...child.killed]];
  expected.saiu = [null, ["SIGTERM", "SIGTERM"]];
  guard.release();
  observed.liberado = ["SIGINT", "SIGQUIT", "SIGHUP", "SIGTERM"].map((signal) => proc.listenerCount(signal));
  expected.liberado = [0, 0, 0, 0];
  assert.deepEqual(observed, expected);
});

test("I25-C42 runAgent: um sinal durante a conferência da entrada do shim cancela antes do spawn, e o agente não roda", async () => {
  const dir = scratch("i25 c42 shim");
  const marker = path.join(dir, "agente rodou");
  const script = path.join(dir, "agente.mjs");
  writeFileSync(script, `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "x");\n`);
  const proc = new EventEmitter();
  const guard = guardSignals({ proc, platform: process.platform });
  // A entrada existe: sem o sinal, o agente iniciaria.
  const running = runAgent({ launch: { command: process.execPath, prefix: [script], entry: script }, args: [], env: process.env, guard });
  // runAgent já está no await da conferência da entrada quando o sinal chega.
  proc.emit("SIGINT");
  const outcome = await running;
  guard.release();
  assert.deepEqual([outcome, existsSync(marker)], [{ cancelled: "SIGINT" }, false]);
  // Controle: sem sinal, o mesmo agente roda.
  const control = guardSignals({ proc: new EventEmitter(), platform: process.platform });
  const ran = await runAgent({ launch: { command: process.execPath, prefix: [script], entry: script }, args: [], env: process.env, guard: control });
  control.release();
  assert.deepEqual([ran, existsSync(marker)], [{ code: 0, signal: null }, true]);
});
