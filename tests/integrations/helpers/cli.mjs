import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
export const INTEGRATIONS_CLI = path.join(REPO_ROOT, "src", "integrations", "cli.mjs");

// Diretório temporário com espaço e Unicode no caminho: toda prova de
// instalação/execução passa por um caminho desses (crit. 4 e 11).
export function makeScratch(label) {
  return realpathSync(mkdtempSync(path.join(tmpdir(), `skill-me i4 ${label} ação-`)));
}

// Ambiente mínimo e explícito: nada do perfil de quem roda os testes
// (CLAUDE_CONFIG_DIR, CODEX_HOME, HERMES_HOME…) chega aos processos.
export function baseEnv(extra = {}) {
  const env = { PATH: process.env.PATH ?? "" };
  for (const key of ["SystemRoot", "SYSTEMROOT", "ComSpec", "COMSPEC", "PATHEXT", "WINDIR", "windir"]) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  return { ...env, ...extra };
}

export function runIntegrations(args, { env = baseEnv(), cwd, input, timeout = 30_000 } = {}) {
  const result = spawnSync(process.execPath, [INTEGRATIONS_CLI, ...args], {
    encoding: "utf8",
    env,
    cwd,
    input,
    timeout,
  });
  return {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
}

export function runIntegrationsJson(args, options) {
  const result = runIntegrations([...args, "--json"], options);
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (cause) {
    throw new Error(`stdout não é um JSON único: ${JSON.stringify(result.stdout)} stderr=${JSON.stringify(result.stderr)}`, { cause });
  }
  return { ...result, report };
}

export function runIntegrationsAsync(args, { env = baseEnv(), cwd } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [INTEGRATIONS_CLI, ...args], { env, cwd });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (status, signal) => resolve({ status, signal, stdout, stderr }));
  });
}

// Linha do exportador de fixture (`SKILL_ME_OBSERVER_REPORT_FD`): única
// linha JSON com `skillMeObserverReport: 1` no canal indicado.
export function parseReport(channelText) {
  const lines = channelText.split(/\r?\n/).filter((line) => line.startsWith('{"skillMeObserverReport":1'));
  if (lines.length !== 1) return null;
  return JSON.parse(lines[0]);
}
