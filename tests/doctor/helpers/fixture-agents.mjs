import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildMinimalPe } from "./synthetic-pe.mjs";

export const AGENT_ORDER = ["claude", "codex", "hermes"];

export function makeScratch(prefix) {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

function launcherFileName(name) {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

// Script stub: só grava um canário se DOCTOR_TEST_WRITE_SENTINEL estiver
// definido. Em uso normal do doctor essa variável nunca é setada; o teste
// a usa apenas para distinguir "nunca invocado" de "invocado sem efeito".
// O corpo real (abaixo de cada shim) também é o que a resolução estática
// precisa reconhecer como vínculo ao pacote — não é só um "stub" genérico.
function sentinelLine(sentinelPath) {
  return process.platform === "win32"
    ? `if defined DOCTOR_TEST_WRITE_SENTINEL echo executed> "${sentinelPath}"\r\n`
    : `if [ -n "$DOCTOR_TEST_WRITE_SENTINEL" ]; then echo executed > "${sentinelPath}"; fi\n`;
}

// claude: launcher real na forma de PE com VS_FIXEDFILEINFO (binary_metadata).
// O conteúdo é lido como bytes estruturados; nenhum SO precisa executá-lo
// para o doctor extrair a versão. A PE sintética prova a estrutura de
// versão, não a execução de agentes.
function writeClaude(dir, { version, overlayBytes = 0 }) {
  const name = process.platform === "win32" ? "claude.exe" : "claude";
  const file = path.join(dir, name);
  mkdirSync(dir, { recursive: true });
  const pe = buildMinimalPe({ version, overlayBytes });
  writeFileSync(file, pe);
  if (process.platform !== "win32") chmodSync(file, 0o755);
  return file;
}

// codex: launcher real referenciando node_modules/@openai/codex/bin/codex.js
// (como um shim gerado pelo npm faz), não um "stub" desconectado do
// package.json ao lado — ver src/doctor/launcher-link/codex.mjs.
function writeCodexShimContent(sentinelPath) {
  if (process.platform === "win32") {
    return (
      "@ECHO off\r\n" +
      sentinelLine(sentinelPath) +
      'SET "_prog=node"\r\n' +
      'endLocal & "%_prog%" "%~dp0\\node_modules\\@openai\\codex\\bin\\codex.js" %*\r\n'
    );
  }
  return (
    "#!/usr/bin/env node\n" +
    sentinelLine(sentinelPath) +
    'require("./node_modules/@openai/codex/bin/codex.js");\n'
  );
}

export function writeCodex(dir, { version, sentinelPath }) {
  const pkgDir = path.join(dir, "node_modules", "@openai", "codex");
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(
    path.join(pkgDir, "package.json"),
    JSON.stringify({ name: "@openai/codex", version }, null, 2),
  );
  const file = path.join(dir, launcherFileName("codex"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, writeCodexShimContent(sentinelPath));
  if (process.platform !== "win32") chmodSync(file, 0o755);
  return file;
}

// hermes: console-script de um venv/pip real importa hermes_cli e vive em
// <venvRoot>/bin (POSIX) ou <venvRoot>/Scripts (Windows, layout
// simplificado — ver nota em src/doctor/launcher-link/hermes.mjs); o pacote
// mora em site-packages na estrutura padrão do interpretador, não ao lado
// do launcher. venvRoot normalmente NÃO é o mesmo diretório do PATH de
// claude/codex: cada instalação tem sua própria raiz.
const HERMES_PYTHON_DIR = "python3.12";

function hermesBinDirName() {
  return process.platform === "win32" ? "Scripts" : "bin";
}

function writeHermesShimContent(sentinelPath) {
  if (process.platform === "win32") {
    return "@ECHO off\r\n" + sentinelLine(sentinelPath) + "python -m hermes_cli %*\r\n";
  }
  return (
    "#!/usr/bin/env python3\n" +
    "import os, sys\n" +
    `if os.environ.get("DOCTOR_TEST_WRITE_SENTINEL"):\n` +
    `    open(r"${sentinelPath}", "w").write("executed")\n` +
    "from hermes_cli import main\n" +
    "sys.exit(main())\n"
  );
}

function writeHermes(venvRoot, { version, sentinelPath }) {
  const binDir = path.join(venvRoot, hermesBinDirName());
  mkdirSync(binDir, { recursive: true });
  const file = path.join(binDir, launcherFileName("hermes"));
  writeFileSync(file, writeHermesShimContent(sentinelPath));
  if (process.platform !== "win32") chmodSync(file, 0o755);

  const sitePackages =
    process.platform === "win32"
      ? path.join(venvRoot, "Lib", "site-packages")
      : path.join(venvRoot, "lib", HERMES_PYTHON_DIR, "site-packages");
  const pkgDir = path.join(sitePackages, "hermes_cli");
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(
    path.join(pkgDir, "__init__.py"),
    `__version__ = "${version}"\nHOOKS = {"pre_tool_call": None}\n`,
  );
  return { launcherPath: file, binDir };
}

export const KNOWN_GOOD_VERSIONS = {
  claude: { major: 2, minor: 1, build: 295, revision: 0 },
  codex: "0.162.1",
  hermes: "0.21.4",
};

export const KNOWN_GOOD_VERSION_TEXT = {
  claude: "2.1.295",
  codex: "0.162.1",
  hermes: "0.21.4",
};

// Instala os três agentes em diretórios de PATH, cada um com sua fonte de
// versão real (não uma string copiada da saída esperada) e seu layout real
// (claude/codex num diretório de bin compartilhado, como um global install
// do npm costuma expor; hermes num venv próprio). Retorna todos os
// diretórios que precisam entrar no PATH.
export function installAllAgents(dir, { sentinelPath }) {
  writeClaude(dir, { version: KNOWN_GOOD_VERSIONS.claude, overlayBytes: 2 * 1024 * 1024 });
  writeCodex(dir, { version: KNOWN_GOOD_VERSIONS.codex, sentinelPath });
  const venvRoot = path.join(dir, "hermes-venv");
  const { binDir } = writeHermes(venvRoot, { version: KNOWN_GOOD_VERSIONS.hermes, sentinelPath });
  return { pathDirs: [dir, binDir] };
}

export function pathEnv(dirs) {
  return dirs.join(path.delimiter);
}

export { hermesBinDirName };
