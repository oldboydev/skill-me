import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
export const INTEGRATIONS_CLI = path.join(REPO_ROOT, "src", "integrations", "cli.mjs");

// Diretório temporário com espaço e Unicode no caminho: toda prova de
// instalação/execução passa por um caminho desses (crit. 4 e 11).
// Devolvido na grafia do caminho real que o instalador resolve (`realpath` de
// `fs/promises`, a semântica de `realpathSync.native`): as provas instrumentam
// o io por caminho absoluto. `realpathSync` em JS só resolve links e conserva o
// resto — no Windows, um nome curto 8.3 do TEMP (`C:\Users\RUNNER~1\…` na CI)
// ou a letra de unidade minúscula ficavam, e nenhuma intervenção disparava
// (I4-C30f).
export function makeScratch(label) {
  return realpathSync.native(mkdtempSync(path.join(tmpdir(), `skill-me i4 ${label} ação-`)));
}

// Home que não existe. Desde a #23 hooks e ingest leem a observação automática
// em <home>/.skill-me/observe.json, e o `os.homedir()` sem HOME/USERPROFILE
// cai no perfil real: um `npm run on` de quem roda os testes faria as fixtures
// gravarem na raiz dele. As provas que precisam de home passam o seu.
export const NO_HOME = path.join(REPO_ROOT, "tests", "integrations", "fixtures", "home inexistente");

// Ambiente mínimo e explícito: nada do perfil de quem roda os testes
// (CLAUDE_CONFIG_DIR, CODEX_HOME, HERMES_HOME, home…) chega aos processos.
export function baseEnv(extra = {}) {
  const env = { PATH: process.env.PATH ?? "", HOME: NO_HOME, USERPROFILE: NO_HOME };
  for (const key of ["SystemRoot", "SYSTEMROOT", "ComSpec", "COMSPEC", "PATHEXT", "WINDIR", "windir"]) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  return { ...env, ...extra };
}

// `nodeArgs`: opções do node antes do CLI (ex.: `--import` do instrumento de
// teste `fs-probe.mjs`).
export function runIntegrations(args, { env = baseEnv(), cwd, input, timeout = 30_000, nodeArgs = [] } = {}) {
  const result = spawnSync(process.execPath, [...nodeArgs, INTEGRATIONS_CLI, ...args], {
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
// linha JSON com `skillMeObserverReport: 2` no canal indicado. A v2 (issue #5)
// traz IDs pseudonimizados pela chave do processo e `counters.privacy`; um
// relatório v1 não é mais aceito.
export const PSEUDONYM = /^h1:[A-Za-z0-9_-]{43}$/;

// Desde a #5 o relatório traz, no lugar de cada ID nativo, um pseudônimo da
// chave do processo: mesmos nomes de ID, nenhum valor nativo.
export function assertPseudonymIds(ids, nativeIds, label) {
  assert.deepEqual(Object.keys(ids).sort(), Object.keys(nativeIds).sort(), label);
  for (const [name, value] of Object.entries(ids)) {
    assert.match(value, PSEUDONYM, `${label}: ${name}`);
    assert.ok(!Object.values(nativeIds).includes(value), `${label}: ${name} nativo`);
  }
  const text = JSON.stringify(ids);
  for (const native of Object.values(nativeIds)) assert.ok(!text.includes(native), `${label}: ${native}`);
}

export function parseReport(channelText) {
  const lines = channelText.split(/\r?\n/).filter((line) => line.startsWith('{"skillMeObserverReport":2'));
  if (lines.length !== 1) return null;
  return JSON.parse(lines[0]);
}
