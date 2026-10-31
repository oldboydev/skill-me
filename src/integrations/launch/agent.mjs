import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { resolveAgents } from "../../doctor/agent-resolution.mjs";
import { createProductionFsAdapter } from "../../doctor/fs-adapter.mjs";
import { resolveCodexShimEntry } from "../../doctor/launcher-link/codex.mjs";
import { CAPTURE_ID_ENV, CAPTURE_ROOT_ENV, LAUNCH_ID_ENV, LAUNCH_ROOT_ENV } from "../traces/binding.mjs";

// O agente iniciado por `skill-me <agente>` (issue #25, linhas "Início do
// agente", "Sinais" e "Vínculo da execução (ambiente)" do Landing em
// .checks/issue-25-agent-launch.md): o executável que o PATH resolve, sem
// shell, com os argumentos literais e o terminal herdado. Mesmo padrão de
// sinais e códigos de início do wrapper `integrations run` (codex-run.mjs).

export const AGENTS = Object.freeze(["codex", "claude", "hermes"]);
const SHELL_ONLY = /\.(cmd|bat)$/i;

// Variável de ambiente pelo nome, sem diferenciar maiúsculas no Windows (um
// ambiente copiado de process.env guarda `Path`, não `PATH`).
export function envValue(env, name, platform) {
  if (platform !== "win32") return env[name];
  const key = Object.keys(env).find((candidate) => candidate.toUpperCase() === name);
  return key === undefined ? undefined : env[key];
}

// Diretórios do PATH na ordem (task 37; linha "Componentes vazios do PATH" do
// Landing). No POSIX, um componente vazio — no começo, no meio, no fim,
// repetido, ou o PATH inteiro vazio — é o diretório atual, na posição dele,
// como no shell, no `execvp` e no `spawn` do Node. PATH ausente não tem
// diretórios. No Windows, vazios continuam ignorados.
function launchPathDirs(env, platform, cwd) {
  const value = envValue(env, "PATH", platform);
  if (value === undefined) return [];
  if (platform === "win32") return value.split(";").filter(Boolean);
  return value.split(":").map((dir) => (dir === "" ? cwd : dir));
}

// { command, prefix } do agente, ou { failure } com o código de 127. A
// resolução é a do doctor (somente leitura). No Windows, um .cmd/.bat só é
// iniciado quando é o shim do npm do `@openai/codex` que o doctor reconhece, e
// então pela entrada que o shim executa com o node; outro exigiria shell.
export async function resolveAgentLaunch({ agent, env, platform, cwd, fs = createProductionFsAdapter() }) {
  const pathDirs = launchPathDirs(env, platform, cwd);
  const pathext = envValue(env, "PATHEXT", platform);
  const agents = await resolveAgents({ pathDirs, platform, env: pathext === undefined ? env : { ...env, PATHEXT: pathext }, cwd, fs });
  const found = agents.find((candidate) => candidate.id === agent);
  if (found.path === null) return { failure: found.reasonCode ?? "executable_not_found" };
  if (!SHELL_ONLY.test(found.path)) return { command: found.path, prefix: [] };
  if (platform !== "win32" || agent !== "codex" || found.versionSource !== "package_metadata") return { failure: "launcher_requires_shell" };
  const entry = await resolveCodexShimEntry(found.path, { fs });
  return entry === null ? { failure: "launcher_requires_shell" } : { command: process.execPath, prefix: [entry], entry };
}

const REPLACED = [LAUNCH_ROOT_ENV, LAUNCH_ID_ENV, CAPTURE_ROOT_ENV, CAPTURE_ID_ENV];

// Ambiente do agente: o recebido, sem nenhum valor herdado dos dois pares —
// completo ou não —, mais o par da execução. Só o processo do agente o recebe.
export function agentEnvironment(env, platform, { root, invocation }) {
  const fold = (name) => (platform === "win32" ? name.toUpperCase() : name);
  const out = {};
  for (const [name, value] of Object.entries(env)) if (!REPLACED.includes(fold(name))) out[name] = value;
  out[LAUNCH_ROOT_ENV] = root;
  out[LAUNCH_ID_ENV] = invocation;
  return out;
}

// Sinais do terminal chegam ao grupo inteiro: o agente já os recebe, e o
// launcher só precisa não morrer antes dele — nem durante o encerramento da
// execução, que vem depois. SIGTERM vem só para o launcher e é repassado ao
// agente vivo, um para um. Antes de o agente iniciar não há a quem entregar:
// o primeiro sinal fica em `cancelled` e cancela a abertura (task 34; linha
// "Cancelamento antes do agente" do Landing). `release` devolve o padrão.
export function guardSignals({ proc = process, platform }) {
  let child = null;
  let cancelled = null;
  const terminal = platform === "win32" ? ["SIGINT", "SIGHUP"] : ["SIGINT", "SIGQUIT", "SIGHUP"];
  const handlers = new Map();
  for (const signal of terminal) {
    handlers.set(signal, () => {
      if (child === null) cancelled ??= signal;
    });
  }
  handlers.set("SIGTERM", () => {
    if (child === null) cancelled ??= "SIGTERM";
    else if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  });
  for (const [signal, handler] of handlers) proc.on(signal, handler);
  return {
    get cancelled() {
      return cancelled;
    },
    attach(started) {
      child = started;
    },
    release() {
      for (const [signal, handler] of handlers) proc.removeListener(signal, handler);
    },
  };
}

// Inicia o agente e espera o fim: { code, signal }, { spawnError } (o `code`
// do erro decide 127/126) ou { cancelled } quando um sinal chegou antes do
// spawn. A entrada de um shim que sumiu é ENOENT antes do spawn: para o node
// seria um script ausente, saída 1. Do último `await` ao `attach` tudo é
// síncrono: nenhum sinal cai entre a conferência e o agente vivo.
export async function runAgent({ launch, args, env, guard }) {
  if (launch.entry !== undefined && !(await stat(launch.entry).then((s) => s.isFile(), () => false))) {
    return { spawnError: { code: "ENOENT" } };
  }
  if (guard.cancelled !== null) return { cancelled: guard.cancelled };
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(launch.command, [...launch.prefix, ...args], { stdio: "inherit", env, windowsHide: false });
    } catch (error) {
      resolve({ spawnError: { code: error.code ?? "spawn_error" } });
      return;
    }
    guard.attach(child);
    child.once("error", (error) => resolve({ spawnError: { code: error.code ?? "spawn_error" } }));
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
}

export const startFailureExit = (spawnError) => (spawnError.code === "ENOENT" ? 127 : 126);
