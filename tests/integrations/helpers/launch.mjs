import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, linkSync, mkdirSync, readdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
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

export { runIntegrations };
