import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildMinimalPe } from "./synthetic-pe.mjs";
import {
  CODEX_GLOBAL_WINDOWS_TARGET,
  CODEX_LOCAL_SH_TARGET,
  CODEX_LOCAL_WINDOWS_TARGET,
  npmCmdShim,
} from "./npm-shims.mjs";

export const AGENT_ORDER = ["claude", "codex", "hermes"];

export function makeScratch(prefix) {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

// Script stub: só grava um canário se DOCTOR_TEST_WRITE_SENTINEL estiver
// definido. Em uso normal do doctor essa variável nunca é setada; o teste
// a usa apenas para distinguir "nunca invocado" de "invocado sem efeito".
function cmdSentinelLine(sentinelPath) {
  return `if defined DOCTOR_TEST_WRITE_SENTINEL echo executed> "${sentinelPath}"\r\n`;
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

// Arquivo de entrada do pacote (bin/codex.js). Só grava a sentinela se for
// executado com DOCTOR_TEST_WRITE_SENTINEL; o doctor nunca o executa.
function writeCodexPackage(pkgDir, { version, sentinelPath }) {
  mkdirSync(path.join(pkgDir, "bin"), { recursive: true });
  writeFileSync(
    path.join(pkgDir, "package.json"),
    JSON.stringify({ name: "@openai/codex", version }, null, 2),
  );
  const entry = path.join(pkgDir, "bin", "codex.js");
  writeFileSync(
    entry,
    "#!/usr/bin/env node\n" +
      `if (process.env.DOCTOR_TEST_WRITE_SENTINEL) require("node:fs").writeFileSync(${JSON.stringify(sentinelPath)}, "executed");\n`,
  );
  if (process.platform !== "win32") chmodSync(entry, 0o755);
}

// codex, instalação global com o layout real do npm em cada SO:
// - Windows: `<prefix>\codex.cmd` gerado pelo cmd-shim, referenciando
//   `%dp0%\node_modules\@openai\codex\bin\codex.js`; o pacote mora em
//   `<prefix>\node_modules\@openai\codex` (mesmo layout do prefixo global
//   observado nesta máquina).
// - POSIX: `<prefix>/bin/codex` é um link simbólico relativo para
//   `../lib/node_modules/@openai/codex/bin/codex.js`, como `npm i -g` cria.
// Devolve o diretório que precisa entrar no PATH.
export function writeCodex(prefix, { version, sentinelPath }) {
  if (process.platform === "win32") {
    writeCodexPackage(path.join(prefix, "node_modules", "@openai", "codex"), {
      version,
      sentinelPath,
    });
    const launcherPath = path.join(prefix, "codex.cmd");
    writeFileSync(
      launcherPath,
      npmCmdShim(CODEX_GLOBAL_WINDOWS_TARGET, { extraLine: cmdSentinelLine(sentinelPath) }),
    );
    return { launcherPath, binDir: prefix };
  }
  writeCodexPackage(path.join(prefix, "lib", "node_modules", "@openai", "codex"), {
    version,
    sentinelPath,
  });
  const binDir = path.join(prefix, "bin");
  mkdirSync(binDir, { recursive: true });
  const launcherPath = path.join(binDir, "codex");
  symlinkSync("../lib/node_modules/@openai/codex/bin/codex.js", launcherPath);
  return { launcherPath, binDir };
}

// codex, instalação local de projeto (`npm i @openai/codex`): o launcher fica
// em `<projeto>/node_modules/.bin/`. No Windows é o `codex.cmd` do cmd-shim
// com `%dp0%\..\@openai\codex\bin\codex.js`; no POSIX, o link simbólico
// relativo `../@openai/codex/bin/codex.js`.
export function writeCodexLocalInstall(projectDir, { version, sentinelPath }) {
  const nodeModules = path.join(projectDir, "node_modules");
  writeCodexPackage(path.join(nodeModules, "@openai", "codex"), { version, sentinelPath });
  const binDir = path.join(nodeModules, ".bin");
  mkdirSync(binDir, { recursive: true });
  if (process.platform === "win32") {
    const launcherPath = path.join(binDir, "codex.cmd");
    writeFileSync(
      launcherPath,
      npmCmdShim(CODEX_LOCAL_WINDOWS_TARGET, { extraLine: cmdSentinelLine(sentinelPath) }),
    );
    return { launcherPath, binDir };
  }
  const launcherPath = path.join(binDir, "codex");
  symlinkSync(CODEX_LOCAL_SH_TARGET, launcherPath);
  return { launcherPath, binDir };
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
    return "@ECHO off\r\n" + cmdSentinelLine(sentinelPath) + "python -m hermes_cli %*\r\n";
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

// `contractSource`, quando informado, vira `hermes_cli/plugins.py` ao lado do
// `__init__.py` — o mesmo pacote de onde a versão é lida (ver
// helpers/hermes-contract-source.mjs). Sem ele, a instalação tem só a versão.
// `initSource` substitui o `__init__.py` inteiro (provas de onde a versão
// pode ou não ser lida).
export function writeHermes(
  venvRoot,
  { version, sentinelPath, contractSource, initSource = `__version__ = "${version}"\n` },
) {
  const binDir = path.join(venvRoot, hermesBinDirName());
  mkdirSync(binDir, { recursive: true });
  const file = path.join(binDir, process.platform === "win32" ? "hermes.cmd" : "hermes");
  writeFileSync(file, writeHermesShimContent(sentinelPath));
  if (process.platform !== "win32") chmodSync(file, 0o755);

  const sitePackages =
    process.platform === "win32"
      ? path.join(venvRoot, "Lib", "site-packages")
      : path.join(venvRoot, "lib", HERMES_PYTHON_DIR, "site-packages");
  const pkgDir = path.join(sitePackages, "hermes_cli");
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(path.join(pkgDir, "__init__.py"), initSource);
  if (contractSource !== undefined) writeFileSync(path.join(pkgDir, "plugins.py"), contractSource);
  return { launcherPath: file, binDir, pkgDir };
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
// (claude num diretório de bin, codex num prefixo npm global, hermes num venv
// próprio). Retorna todos os diretórios que precisam entrar no PATH.
export function installAllAgents(dir, { sentinelPath, hermesContractSource, hermesInitSource }) {
  writeClaude(dir, { version: KNOWN_GOOD_VERSIONS.claude, overlayBytes: 2 * 1024 * 1024 });
  const codex = writeCodex(dir, { version: KNOWN_GOOD_VERSIONS.codex, sentinelPath });
  const venvRoot = path.join(dir, "hermes-venv");
  const hermes = writeHermes(venvRoot, {
    version: KNOWN_GOOD_VERSIONS.hermes,
    sentinelPath,
    contractSource: hermesContractSource,
    ...(hermesInitSource !== undefined ? { initSource: hermesInitSource } : {}),
  });
  const pathDirs = [dir];
  if (codex.binDir !== dir) pathDirs.push(codex.binDir);
  pathDirs.push(hermes.binDir);
  return { pathDirs, hermesPkgDir: hermes.pkgDir };
}

export function pathEnv(dirs) {
  return dirs.join(path.delimiter);
}

export { hermesBinDirName };
