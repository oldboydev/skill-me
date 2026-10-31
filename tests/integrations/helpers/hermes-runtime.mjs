import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FIXTURES_DIR } from "./fixtures.mjs";

// Revisão examinada no plano (.tasks/issue-4-integracoes.md): o nome de versão
// sozinho não fixa uma instalação editável, então os hashes também precisam bater.
const EXPECTED = {
  version: '__version__ = "0.21.4"',
  "plugins.py": "51c7fdd506b187c8713e706a7b264614902b28039e79875770e4b120180b423c",
  "plugins_dispatch.py": "fd1185e23edb80234e3f816a2fbbf990cdab37a3bf5c3d98b38337c7dd50e330",
};

export const HARNESS = path.join(FIXTURES_DIR, "hermes", "harness.py");
export const FIXTURE_PLUGINS = path.join(FIXTURES_DIR, "hermes", "plugins");
export const DELIVERY_FIXTURE = path.join(FIXTURES_DIR, "hermes", "delivery", "delivery.mjs");

// Plugin de fixture versionado no HERMES_HOME temporário de uma prova. Pelo
// `cp`/`rm` de node:fs/promises, não `cpSync`/`rmSync`: no Windows, o Node
// 24.13.0 (o da CI) com "ação" no caminho deixa o destino da cópia vazio e a
// pasta da remoção no lugar, sem lançar (gate B em 60bbda8; o mesmo defeito do
// nodejs/node#56049 documentado em traces/concurrency.cli.test.mjs). Sem
// `force`: remover um plugin que não está lá lança ENOENT.
export const installFixturePlugin = (home, name) => cp(path.join(FIXTURE_PLUGINS, name), path.join(home, "plugins", name), { recursive: true });
export const removeFixturePlugin = (home, name) => rm(path.join(home, "plugins", name), { recursive: true });

function defaultPython() {
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA;
    return local ? path.join(local, "hermes", "hermes-agent", "venv", "Scripts", "python.exe") : null;
  }
  return path.join(os.homedir(), ".hermes", "hermes-agent", "venv", "bin", "python");
}

const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

// Só lê a instalação do programa (fonte e intérprete), nunca a configuração do
// perfil: HERMES_HOME do teste é sempre temporário. Ausência ou revisão diferente
// vira motivo de skip — a prova nativa fica pendente, nunca "pass".
export function locateHermesRuntime() {
  const python = process.env.SKILL_ME_HERMES_PYTHON || defaultPython();
  if (!python || !existsSync(python)) return { skipReason: "interpretador do Hermes não encontrado" };
  const agentDir = path.resolve(path.dirname(python), "..", "..");
  const cli = path.join(agentDir, "hermes_cli");
  try {
    if (!readFileSync(path.join(cli, "__init__.py"), "utf8").includes(EXPECTED.version)) return { skipReason: "versão do Hermes diferente de 0.21.4" };
    for (const file of ["plugins.py", "plugins_dispatch.py"]) {
      if (sha256(path.join(cli, file)) !== EXPECTED[file]) return { skipReason: `revisão de ${file} diferente da examinada` };
    }
  } catch {
    return { skipReason: "fonte do Hermes ilegível" };
  }
  return { python, agentDir };
}

// Python 3 do sistema, para provas da fonte do plugin que não precisam do
// Hermes: o plugin só importa a biblioteca padrão. Cada candidato é executado
// antes de ser aceito, porque no Windows `python3` pode ser o atalho da loja,
// que não roda nada. Sem nenhum, `skipReason` diz por quê.
export function locateSystemPython() {
  const candidates = process.platform === "win32" ? [["python"], ["py", "-3"]] : [["python3"], ["python"]];
  for (const [command, ...prefix] of candidates) {
    const probe = spawnSync(command, [...prefix, "-I", "-c", "import sys; print(sys.version_info[0])"], { encoding: "utf8", timeout: 30_000, windowsHide: true });
    if (probe.status === 0 && probe.stdout.trim() === "3") return { command, prefix };
  }
  return { skipReason: `nenhum Python 3 do sistema entre ${candidates.map((c) => c.join(" ")).join(", ")}` };
}

// Estado dos caches de bytecode do pacote instalado: precisa ficar igual,
// porque os testes rodam com `-B` e não podem escrever na instalação.
export function bytecodeState(agentDir) {
  const out = {};
  for (const sub of [".", "hermes_cli", "tools", "agent"]) {
    const cache = path.join(agentDir, sub, "__pycache__");
    if (!existsSync(cache)) continue;
    for (const name of readdirSync(cache).sort()) out[`${sub}/${name}`] = statSync(path.join(cache, name)).mtimeMs;
  }
  return out;
}

export function harnessEnv(sandbox, extra = {}) {
  const env = {
    HERMES_HOME: path.join(sandbox, "hermes home"),
    HERMES_BUNDLED_PLUGINS: path.join(sandbox, "bundled vazio"),
    PYTHONDONTWRITEBYTECODE: "1",
    HOME: path.join(sandbox, "user home"),
    USERPROFILE: path.join(sandbox, "user home"),
    APPDATA: path.join(sandbox, "user home", "AppData", "Roaming"),
    LOCALAPPDATA: path.join(sandbox, "user home", "AppData", "Local"),
    TEMP: path.join(sandbox, "tmp"),
    TMP: path.join(sandbox, "tmp"),
    TMPDIR: path.join(sandbox, "tmp"),
    PATH: process.env.PATH ?? "",
    ...extra,
  };
  for (const key of ["SystemRoot", "SYSTEMROOT", "ComSpec", "WINDIR", "PATHEXT"]) if (process.env[key]) env[key] = process.env[key];
  for (const dir of [env.HERMES_BUNDLED_PLUGINS, env.APPDATA, env.LOCALAPPDATA, env.TEMP]) mkdirSync(dir, { recursive: true });
  return env;
}

export function runHarness(runtime, { sandbox, env, scenario }) {
  const scenarioPath = path.join(sandbox, `scenario-${process.hrtime.bigint()}.json`);
  const resultPath = path.join(sandbox, `result-${process.hrtime.bigint()}.json`);
  writeFileSync(scenarioPath, JSON.stringify({ ...scenario, resultPath }));
  return new Promise((resolve) => {
    const child = spawn(runtime.python, ["-I", "-B", HARNESS, scenarioPath], { cwd: sandbox, env, windowsHide: true });
    let stderr = "";
    child.stdout.on("data", () => {});
    child.stderr.on("data", (chunk) => (stderr += chunk));
    const timer = setTimeout(() => child.kill(), 180_000);
    child.on("close", (status) => {
      clearTimeout(timer);
      const result = existsSync(resultPath) ? JSON.parse(readFileSync(resultPath, "utf8")) : null;
      resolve({ status, stderr, result });
    });
  });
}
