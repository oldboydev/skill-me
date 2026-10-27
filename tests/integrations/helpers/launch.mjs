import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { chmodSync, copyFileSync, existsSync, linkSync, mkdirSync, readdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { open } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { runSkillMe as runLauncher } from "../../../src/integrations/launch/command.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { CODEX_GLOBAL_WINDOWS_TARGET, npmCmdShim } from "../../doctor/helpers/npm-shims.mjs";
import { REPO_ROOT, baseEnv, runIntegrations, runIntegrationsJson } from "./cli.mjs";
import { FIXTURES_DIR } from "./fixtures.mjs";
import { runObserve } from "./observe.mjs";
import { capturesDir, storeDir } from "./traces.mjs";

// Apoio das provas da issue #25: o `skill-me` como o usuário o chama, com
// agentes de fixture no PATH e home, raiz e diretórios de configuração dos
// agentes temporários (nunca os de quem roda os testes). O esperado vem do
// Landing de .checks/issue-25-agent-launch.md, não do código.

export const LAUNCHER = path.join(REPO_ROOT, "src", "integrations", "launch", "cli.mjs");
export const FAKE_AGENT = path.join(FIXTURES_DIR, "launch", "fake-agent.mjs");
export const AGENT_NAMES = ["codex", "claude", "hermes"];
export const HEX32 = /^[0-9a-f]{32}$/;
const WINDOWS = process.platform === "win32";

// Executáveis de fixture num diretório só, para o PATH. POSIX: um arquivo
// executável `<agente>` com o node no shebang. Windows: `claude.exe` e
// `hermes.exe` são cópias do node.exe (o primeiro argumento é o script do
// agente falso, ver agentArgs), e o `codex` é o shim `codex.cmd` real do npm,
// apontando para um pacote `@openai/codex` cujo bin/codex.js é o agente falso.
export function agentBin(dir, agents = AGENT_NAMES) {
  mkdirSync(dir, { recursive: true });
  const fakeUrl = pathToFileURL(FAKE_AGENT).href;
  for (const agent of agents) {
    if (!WINDOWS) {
      const file = path.join(dir, agent);
      writeFileSync(file, `#!${process.execPath}\nimport(${JSON.stringify(fakeUrl)});\n`);
      chmodSync(file, 0o755);
    } else if (agent === "codex") {
      writeFileSync(path.join(dir, "codex.cmd"), npmCmdShim(CODEX_GLOBAL_WINDOWS_TARGET));
      const pkg = path.join(dir, "node_modules", "@openai", "codex");
      mkdirSync(path.join(pkg, "bin"), { recursive: true });
      writeFileSync(path.join(pkg, "package.json"), JSON.stringify({ name: "@openai/codex", version: "0.162.1" }));
      writeFileSync(path.join(pkg, "bin", "codex.js"), `import(${JSON.stringify(fakeUrl)});\n`);
    } else {
      const exe = path.join(dir, `${agent}.exe`);
      try {
        linkSync(process.execPath, exe);
      } catch {
        copyFileSync(process.execPath, exe);
      }
    }
  }
  return dir;
}

// Ambiente do `npm run on/off/status` nas provas da execução (C33, C34; linha
// "Ambiente do npm run nas provas" do Landing): o npm roda o script com o
// `node` do PATH, como no terminal do usuário, e no POSIX por um `sh` também
// procurado no PATH. O diretório do Node da suíte não serve: na CI ele não tem
// `sh`, e no WSL é o `/usr/bin`, que tem agentes reais. No POSIX, o PATH é uma
// pasta do scratch só com `node` e `sh` (ligados ao `process.execPath` e ao
// `/bin/sh`), seguida do bin de fixture; no Windows, onde o npm usa o
// `ComSpec`, o diretório do Node e o bin de fixture, como antes.
export function npmScriptEnv(scratch, env) {
  let dir = path.dirname(process.execPath);
  if (!WINDOWS) {
    dir = scratch("npm run node e sh");
    symlinkSync(process.execPath, path.join(dir, "node"));
    symlinkSync("/bin/sh", path.join(dir, "sh"));
  }
  return { ...env, PATH: [dir, env.PATH].join(path.delimiter) };
}

// Argumentos de `skill-me <agente>` que fazem o agente falso receber `args`:
// no Windows, a cópia do node.exe precisa do script como primeiro argumento.
export const agentArgs = (agent, args = []) => (WINDOWS && agent !== "codex" ? [FAKE_AGENT, ...args] : args);

// Home e diretórios dos agentes, sem nada configurado.
export function freshHome(scratch, label) {
  const home = scratch(`${label} home`);
  const homes = { claude: path.join(home, ".claude"), codex: path.join(home, ".codex"), hermes: path.join(home, ".hermes") };
  for (const dir of Object.values(homes)) mkdirSync(dir);
  return { home, homes };
}

export function launchEnv({ home, homes, bin, extra = {} }) {
  return baseEnv({
    HOME: home,
    USERPROFILE: home,
    LOCALAPPDATA: path.join(home, "AppData", "Local"),
    CLAUDE_CONFIG_DIR: homes.claude,
    CODEX_HOME: homes.codex,
    HERMES_HOME: homes.hermes,
    PATH: bin,
    ...extra,
  });
}

// Preparo concluído sem o primeiro uso: a raiz pelo `observe setup` e a
// integração dos agentes pelo instalador, os mesmos comandos que o primeiro
// uso aplica.
export function preparedLaunch(scratch, label, { agents = AGENT_NAMES } = {}) {
  const { home, homes } = freshHome(scratch, label);
  const bin = agentBin(path.join(scratch(`${label} bin`), "bin"));
  const root = path.join(scratch(`${label} raiz`), "capturas ação");
  mkdirSync(root);
  const env = launchEnv({ home, homes, bin });
  const setup = runObserve(["setup", "--root", root], { env });
  assert.equal(setup.status, 0, setup.stdout);
  for (const agent of agents) {
    const installed = runIntegrationsJson(["install", "--agent", agent, "--target", homes[agent], "--apply"], { env });
    assert.equal(installed.status, 0, installed.stdout);
  }
  return { home, homes, bin, root, rootReal: realpathSync.native(root), env };
}

// `skill-me` como processo real. `stdin`: texto para um pipe, ou "ignore".
export function runSkillMe(args, { env, cwd, stdin = "ignore", timeout = 60_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [LAUNCHER, ...args], { env, cwd, stdio: [stdin === "ignore" ? "ignore" : "pipe", "pipe", "pipe"] });
    const out = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => out.push(chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    if (stdin !== "ignore") {
      child.stdin.on("error", () => {});
      child.stdin.end(stdin);
    }
    const timer = setTimeout(() => child.kill("SIGKILL"), timeout);
    child.on("close", (status, signal) => {
      clearTimeout(timer);
      resolve({ status, signal, stdout: Buffer.concat(out), stderr, pid: child.pid });
    });
  });
}

export const runSkillMeSync = (args, { env, cwd, input } = {}) =>
  spawnSync(process.execPath, [LAUNCHER, ...args], { env, cwd, input, encoding: "utf8", timeout: 60_000 });

// `skill-me` em processo, com o `deps` de command.mjs (como as provas de
// C41/C43), para a prova que precisa fixar o relógio de parede das aberturas:
// `now` só carimba a abertura e o encerramento da execução (linha "Cronologia
// explícita no C34" do Landing). Devolve a forma de runSkillMe.
export async function runSkillMeInProcess(args, { env, home, now }) {
  let stderr = "";
  const result = await runLauncher({
    argv: args,
    deps: { env, home, now, proc: new EventEmitter(), terminal: false, writeOut: () => {}, writeErr: (text) => (stderr += text), readLine: () => null },
  });
  return { status: result.exitCode, signal: null, stderr };
}

// Relógio de parede de uma abertura em processo: começa em `startMs` e anda com
// o tempo monotônico, sem recuar com o relógio do host; depois de `release()`, é
// o relógio do sistema (o do encerramento).
export function launchClock(startMs) {
  const origin = performance.now();
  let released = false;
  return {
    now: () => (released ? Date.now() : startMs + Math.round(performance.now() - origin)),
    release: () => {
      released = true;
    },
  };
}

// Invocações sobrepostas (linhas "Diagnóstico de C32" e "Cronologia explícita no
// C34" do Landing): cada espera pelos marcadores corre com o limite de 30 s, mas
// só enquanto as invocações que precisam estar vivas estão vivas. `track` inclui
// uma invocação aberta depois. Em qualquer falha, os marcadores de barreira são
// gravados (os agentes de fixture saem), as invocações terminam, e o erro traz o
// que se viu: marcadores, o ID da execução de cada probe, as capturas (segmento,
// estado, persisted, launchedAt, createdAt) e status, sinal e stderr de cada
// launcher.
export async function withOverlappingRuns({ root, work, runs, probes, markers }, body) {
  const settled = {};
  const track = (name, run) => {
    runs[name] = run;
    run.then((result) => (settled[name] = result));
    return run;
  };
  for (const [name, run] of Object.entries(runs)) track(name, run);
  const whileAlive = async (predicate, label, names) => {
    const deadline = Date.now() + 30_000;
    while (!predicate()) {
      const ended = names.filter((name) => settled[name] !== undefined);
      if (ended.length > 0) throw new Error(`${label}: ${ended.join(" e ")} terminou antes`);
      if (Date.now() > deadline) throw new Error(`tempo esgotado: ${label}`);
      await sleep(20);
    }
  };
  try {
    return await body(whileAlive, track);
  } catch (error) {
    const seen = markers.filter((name) => existsSync(path.join(work, name)));
    const started = Object.fromEntries(Object.entries(probes).map(([name, file]) => [name, readJsonLines(file)[0]?.env.SKILL_ME_LAUNCH_ID ?? null]));
    const captures = launchCapturesOnDisk(root).map((c) => [c.invocation, c.segment, c.state, c.counters.persisted, c.launchedAt, c.createdAt]);
    for (const name of markers) writeFileSync(path.join(work, name), "");
    const launchers = {};
    for (const [name, run] of Object.entries(runs)) {
      const { status, signal, stderr } = await run;
      launchers[name] = { status, signal, stderr };
    }
    throw new Error(`${error.message}\n${JSON.stringify({ marcadores: seen, probes: started, capturas: captures, launchers })}`, { cause: error });
  }
}

export function writeScenario(dir, name, steps) {
  const file = path.join(dir, `${name}.json`);
  writeFileSync(file, JSON.stringify({ steps }));
  return file;
}

export const readLines = (file) => (existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean) : []);
export const readJsonLines = (file) => readLines(file).map((line) => JSON.parse(line));

// Capturas e ponteiros lidos do disco pelos formatos do Landing (não pelo
// código do produto).
export function launchCapturesOnDisk(root) {
  const dir = capturesDir(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => HEX32.test(name))
    .map((name) => JSON.parse(readFileSync(path.join(dir, name, "state.json"), "utf8")))
    .filter((state) => state.origin === "launch");
}

export const ofInvocation = (root, invocation) =>
  launchCapturesOnDisk(root)
    .filter((state) => state.invocation === invocation)
    .sort((a, b) => a.segment - b.segment);

export const pointerFile = (root, invocation) => path.join(storeDir(root), "launches", `${invocation}.json`);

export function invocationsOf(root) {
  return [...new Set(launchCapturesOnDisk(root).map((state) => state.invocation))];
}

// Primeira criação do store (linha "Primeira criação concorrente do store" do
// Landing): io do store que, uma vez, para dentro da criação exclusiva do
// marcador — o arquivo já nasceu pelo `wx` e os bytes ainda não foram escritos,
// como no writeExclusive de privacy/fs.mjs — até a prova liberar. Reconhece o
// marcador pelo nome, gravado direto ou por temporário.
export function markerPausedIo() {
  const base = createStoreIo();
  let reach;
  let release;
  const reached = new Promise((resolve) => (reach = resolve));
  const released = new Promise((resolve) => (release = resolve));
  let armed = true;
  const io = {
    ...base,
    async writeExclusive(file, data, options) {
      if (!armed || !path.basename(file).startsWith("store.json")) return base.writeExclusive(file, data, options);
      armed = false;
      const handle = await open(file, "wx", 0o600);
      try {
        reach();
        await released;
        await handle.writeFile(data);
        await handle.sync();
      } finally {
        await handle.close();
      }
    },
  };
  return { io, reached, release };
}

export { runIntegrations };
