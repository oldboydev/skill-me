import { detectSeparator, dirnameGeneric, isAbsolutePathGeneric, joinGeneric, joinPath } from "./path-helpers.mjs";
import { isNativeExecutable } from "./native-executable.mjs";
import { commandStartLines } from "./shim-lines.mjs";
import {
  endsStatement,
  findAssignments,
  isOp,
  simpleStringValue,
  tokenizePython,
} from "../python-source.mjs";
import { readBoundedText } from "../snapshot-read.mjs";
import { isPlausibleVersionString } from "../version-sources/validate.mjs";

const ONE_MIB_BYTES = 1024 * 1024;

// Nome de intérprete Python, com ou sem versão: "python", "python3",
// "python3.12" (mas não "sh", "node" etc.). Um caminho absoluto bare
// (`/b/bin/python3`, sem X.Y) fixa o intérprete tanto quanto um com versão
// (achado G4 da rodada 3, variante residual).
const PYTHON_INTERPRETER_NAME = /(?:^|[\\/])python[\d.]*$/;

// Segunda linha do trampolim que o distlib do pip grava quando o shebang
// direto não serve (caminho com espaço ou linha acima de 127 bytes; 512 no
// macOS): `'''exec' <intérprete> "$0" "$@"`, com aspas só quando há espaço
// (pypa/distlib, distlib/scripts.py, `_build_shebang`). Só valem caracteres
// que o sh não expande nem separa; `$`, crase, `\`, glob, operadores ou
// qualquer opção antes de "$0" deixam o intérprete indeterminado.
const DISTLIB_TRAMPOLINE_EXEC = /^'''exec' (?:"([^"$`\\]+)"|([^\s"'$`\\*?[\]{}();&|<>]+)) "\$0" "\$@"$/;

// .cmd simplificado: executa o python.exe do diretório do próprio .cmd
// (`%~dp0` já termina na barra) com `-m hermes_cli` e todos os argumentos.
const CMD_SIBLING_PYTHON_INVOCATION = /^[ \t]*@?"%~dp0python\.exe"[ \t]+-m[ \t]+hermes_cli[ \t]+%\*[ \t]*$/;

// O SO decide pela extensão quem interpreta o launcher: .cmd/.bat pelo
// cmd.exe, que só é aceito pela invocação `-m hermes_cli` acima.
const CMD_LAUNCHER = /\.(?:cmd|bat)$/i;

// PYTHONPATH acrescenta caminhos antes do site-packages, e PYTHONHOME muda o
// prefix de onde ele é calculado (docs.python.org/3.13, `sys_path_init`). O
// conteúdo não é examinado: com qualquer valor, o hermes_cli importado pode
// ser outro. Vazia, a variável é ignorada pelo Python (CPython v3.13.0:
// `config_get_env_dup` em Python/initconfig.c e o teste de verdade de
// ENV_PYTHONHOME em Modules/getpath.py).
const IMPORT_PATH_ENV_VARS = ["PYTHONPATH", "PYTHONHOME"];

// Resultado de três estados (não só texto|null): "too_large" precisa de um
// reasonCode próprio (input_too_large), distinto de "não reconhecido".
// Qualquer erro de acesso além de ENOENT/limite sobe para o chamador decidir
// presence: unknown preservando o código, conforme o critério 3.
async function readLinkedText(filePath, fs) {
  return readBoundedText(filePath, { fs, maxBytes: ONE_MIB_BYTES });
}

// A versão do pacote é o literal de `__version__ = "..."` atribuído em código
// no nível do módulo, encerrando a instrução (python-source.mjs). O mesmo
// texto num comentário, numa docstring ou dentro de outra string não é
// atribuição; um literal seguido de expressão (`"x" + "-dev"`) não é o valor.
// Uma atribuição reconhecida junto de outra ligação do nome em código
// (reatribuição indentada, valor calculado) deixa o valor efetivo
// indeterminado: ambíguo, nunca o primeiro literal.
function extractSourceLiteralVersion(text) {
  const tokens = tokenizePython(text);
  if (tokens === null) return { version: null, reasonCode: "version_unreadable" };
  const sites = findAssignments(tokens, "__version__");
  const literals = sites
    .filter((site) => site.moduleLevel && endsStatement(tokens[site.valueIndex + 1]))
    .map((site) => simpleStringValue(tokens[site.valueIndex]))
    .filter((value) => value !== null);
  if (literals.length === 0) return { version: null, reasonCode: "version_unreadable" };
  if (literals.length < sites.length || new Set(literals).size > 1) {
    return { version: null, reasonCode: "version_source_ambiguous" };
  }
  // Um `__version__` com formato implausível (canário, credencial, texto
  // ilegível) nunca é exposto verbatim como versão.
  if (!isPlausibleVersionString(literals[0])) {
    return { version: null, reasonCode: "version_unreadable" };
  }
  return { version: literals[0], versionSource: "source_literal" };
}

// Intérprete que as duas primeiras linhas de um launcher POSIX fixam sem
// depender de quem o executa: `#!<caminho>` sozinho, `#!<env> <caminho>` com
// um único operando, ou o trampolim `#!/bin/sh` do distlib. O env procura no
// PATH um nome sem barra, mas usa como está um caminho com barra (POSIX:
// XBD 8.3 PATH e exec/execvp); um operando com "=" é atribuição de ambiente.
// Opções do env ou do Python (`-S` tira o site-packages do sys.path) e
// argumentos extras não são interpretados: o resultado é null, como para
// `#!/usr/bin/env python3.12`, um nome relativo ou um sh qualquer.
function interpreterFixedByShebang(text) {
  const [firstLine, secondLine = ""] = text.split("\n", 2).map((line) => line.replace(/\r$/, ""));
  if (!firstLine.startsWith("#!")) return null;
  const words = firstLine.slice(2).trim().split(/\s+/);
  if (words.length === 1 && words[0] === "/bin/sh") {
    const exec = DISTLIB_TRAMPOLINE_EXEC.exec(secondLine);
    return exec ? (exec[1] ?? exec[2]) : null;
  }
  if (words.length === 1) return words[0];
  const viaEnv = words.length === 2 && isAbsolutePathGeneric(words[0]) && /[\\/]env$/.test(words[0]);
  return viaEnv && !words[1].includes("=") ? words[1] : null;
}

// `from hermes_cli[.x] import ...` ou `import hermes_cli` como instrução em
// código — nunca numa docstring ou string.
function importsHermesCli(tokens) {
  return tokens.some((token, k) => {
    if (!token.statementStart || token.type !== "name") return false;
    const next = tokens[k + 1];
    const isHermesCli = next?.type === "name" && next.value === "hermes_cli";
    if (token.value === "import") return isHermesCli;
    if (token.value !== "from" || !isHermesCli) return false;
    let m = k + 2;
    while (isOp(tokens[m], ".") && tokens[m + 1]?.type === "name") m += 2;
    return tokens[m]?.type === "name" && tokens[m].value === "import";
  });
}

// Caminho absoluto do intérprete Python que o texto do launcher fixa e com o
// qual executa o hermes_cli, ou null. O dialeto vem da extensão, como o SO
// decide quem interpreta o arquivo: um .cmd/.bat só vale pela invocação do
// python.exe irmão numa linha que começa um comando (shim-lines.mjs), nunca
// por um shebang; os demais são Python pelo shebang ou pelo trampolim, e o
// import de hermes_cli só conta em código, não numa docstring. Um intérprete
// achado pelo PATH, pelo diretório de trabalho ou por variável do shell pode
// ser de outro prefixo: nunca é presumido o do launcher (revisão formal7).
function hermesInterpreterPath(text, launcherPath) {
  if (CMD_LAUNCHER.test(launcherPath)) {
    const invokesSibling = commandStartLines(text, "cmd").some((line) => CMD_SIBLING_PYTHON_INVOCATION.test(line));
    return invokesSibling ? joinGeneric(detectSeparator(launcherPath), dirnameGeneric(launcherPath), "python.exe") : null;
  }
  const interpreter = interpreterFixedByShebang(text);
  if (interpreter === null || !isAbsolutePathGeneric(interpreter) || !PYTHON_INTERPRETER_NAME.test(interpreter)) {
    return null;
  }
  const tokens = tokenizePython(text);
  return tokens !== null && importsHermesCli(tokens) ? interpreter : null;
}

async function fileExists(filePath, fs) {
  try {
    await fs.stat(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

// Caminho do script que o Python executa: o próprio launcher ou, se ele for
// um link simbólico, o alvo resolvido ("If it's a symbolic link, resolve
// symbolic links", `sys.path` na documentação do Python 3.13). Sem
// lstat/realpath no adaptador, o link não é reconhecível e vale o caminho
// recebido, como em codex.mjs.
async function realScriptPath(launcherPath, fs) {
  if (typeof fs.lstat !== "function" || typeof fs.realpath !== "function") return launcherPath;
  const stats = await fs.lstat(launcherPath).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  return stats?.isSymbolicLink?.() ? fs.realpath(launcherPath) : launcherPath;
}

// Diretório que o Python põe em sys.path[0], antes de PYTHONPATH e do
// site-packages (`sys.path`, Python 3.13): o diretório de trabalho para
// `-m hermes_cli` (o .cmd) e o diretório do script para shebang, env e
// trampolim, que executam o próprio launcher. null quando o cwd não foi
// informado: o diretório não é conhecido.
async function firstImportDirectory(launcherPath, { fs, cwd }) {
  if (CMD_LAUNCHER.test(launcherPath)) return cwd;
  return dirnameGeneric(await realScriptPath(launcherPath, fs));
}

// Verdadeiro quando outro hermes_cli pode ser importado antes do
// site-packages do intérprete fixado: um módulo hermes_cli.py ou um pacote
// regular hermes_cli/__init__.py no primeiro diretório de import, esse
// diretório desconhecido ou PYTHONPATH/PYTHONHOME definidos. Um diretório
// hermes_cli sem __init__.py é só porção de namespace (PEP 420): a busca
// continua e o pacote regular do site-packages vence. A versão do vizinho
// nunca é lida, e o resto do sys.path (.pth, site do usuário) não é modelado.
async function mayImportBeforeSitePackages(launcherPath, { fs, cwd, env }) {
  if (IMPORT_PATH_ENV_VARS.some((name) => (env[name] ?? "") !== "")) return true;
  const firstDir = await firstImportDirectory(launcherPath, { fs, cwd });
  if (firstDir === null) return true;
  return (
    (await fileExists(joinPath(firstDir, "hermes_cli.py"), fs)) ||
    (await fileExists(joinPath(joinPath(firstDir, "hermes_cli"), "__init__.py"), fs))
  );
}

// Layout padrão de venv/pip (documentação do módulo venv): o intérprete mora
// em <prefix>/bin (POSIX) ou <prefix>\Scripts (Windows) e o pacote em
// <prefix>/lib/pythonX.Y/site-packages ou <prefix>\Lib\site-packages. Um
// hermes_cli colocado ao lado do launcher, fora desse layout, nunca é fonte
// de versão — proximidade no diretório não é vínculo; no primeiro diretório
// de import, ele só impede o vínculo (mayImportBeforeSitePackages). No POSIX o
// mesmo prefixo pode ter vários pythonX.Y: o X.Y do intérprete fixado decide;
// sem ele, só um candidato com hermes_cli é aceito, e dois ou mais ficam
// ambíguos — nunca o primeiro em ordem lexical, que pode ser de outro
// intérprete.
async function findSitePackagesInitFile(prefix, sep, interpreterVersion, fs) {
  if (sep === "\\") {
    const candidate = joinGeneric(sep, prefix, "Lib", "site-packages", "hermes_cli", "__init__.py");
    return (await fileExists(candidate, fs)) ? { state: "found", initPath: candidate } : { state: "missing" };
  }
  const initPathFor = (dirName) =>
    joinGeneric(sep, prefix, "lib", dirName, "site-packages", "hermes_cli", "__init__.py");
  if (interpreterVersion !== null) {
    const candidate = initPathFor(`python${interpreterVersion}`);
    return (await fileExists(candidate, fs)) ? { state: "found", initPath: candidate } : { state: "missing" };
  }
  let entries = [];
  try {
    entries = await fs.listDir(joinGeneric(sep, prefix, "lib"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const found = [];
  for (const dirName of entries.filter((name) => /^python\d+(\.\d+)?$/.test(name))) {
    const candidate = initPathFor(dirName);
    if (await fileExists(candidate, fs)) found.push(candidate);
  }
  if (found.length === 0) return { state: "missing" };
  if (found.length > 1) return { state: "ambiguous" };
  return { state: "found", initPath: found[0] };
}

// Além da versão, devolve `packageDir` (o hermes_cli de onde ela foi lida):
// a fonte de contrato desta instalação só é procurada nesse mesmo pacote
// (ver contract-evidence.mjs). `cwd` e `env` descrevem a execução
// diagnosticada e nunca vêm do processo atual: `cwd` ausente vale null
// (desconhecido, então o `-m` do .cmd não liga), e `env` ausente vale um
// ambiente sem variáveis, a mesma convenção de resolveAgents.
export async function resolveHermesVersion(launcherPath, { fs, cwd = null, env = {} }) {
  // Launcher compilado (ex.: hermes.exe): não é um script de texto com o
  // import de hermes_cli, então o vínculo não é demonstrável a partir dele.
  if (await isNativeExecutable(launcherPath, { fs })) {
    return { version: null, reasonCode: "launcher_not_recognized" };
  }
  const linked = await readLinkedText(launcherPath, fs);
  if (linked.state === "too_large") return { version: null, reasonCode: "input_too_large" };
  // O próprio shim mudou de tamanho durante a leitura: a referência extraída
  // dele não é confiável (critério 15), então nunca chega a ser avaliada.
  if (linked.state === "changed_during_read") {
    return { version: null, reasonCode: "version_changed_during_read" };
  }
  if (linked.state === "missing") return { version: null, reasonCode: "launcher_not_recognized" };

  // O pacote é o do prefixo do intérprete que o launcher fixa, possivelmente
  // diferente do prefixo do launcher (achado G4 da rodada 3). Sem intérprete
  // fixado — env com nome, PATH, caminho relativo, sem shebang, comentário ou
  // docstring no lugar do import —, ou com ele na raiz, sem um prefixo de venv
  // acima de bin/Scripts, a presença continua comprovada, mas nenhum pacote é
  // atribuído: nem o do launcher, nem outro (revisão formal7).
  const interpreterPath = hermesInterpreterPath(linked.text, launcherPath);
  const prefix = interpreterPath === null ? "" : dirnameGeneric(dirnameGeneric(interpreterPath));
  if (prefix === "") return { version: null, reasonCode: "launcher_not_recognized" };
  // O site-packages desse prefixo só é o hermes_cli importado se nada vier
  // antes dele em sys.path. Com um candidato anterior observável, ou sem
  // como saber, o vínculo não é demonstrável: a presença continua, sem
  // versão nem pacote. Ver .checks/issue-3-agent-diagnostics.build.md, seção 30.
  if (await mayImportBeforeSitePackages(launcherPath, { fs, cwd, env })) {
    return { version: null, reasonCode: "launcher_not_recognized" };
  }
  const interpreterVersion = /(?:^|[\\/])python(\d+\.\d+)$/.exec(interpreterPath)?.[1] ?? null;
  const sep = detectSeparator(interpreterPath);
  const located = await findSitePackagesInitFile(prefix, sep, interpreterVersion, fs);
  if (located.state === "ambiguous") return { version: null, reasonCode: "version_source_ambiguous" };
  if (located.state === "missing") return { version: null, reasonCode: "launcher_not_recognized" };
  const { initPath } = located;

  const initResult = await readLinkedText(initPath, fs);
  if (initResult.state === "too_large") return { version: null, reasonCode: "input_too_large" };
  // __init__.py mudou de tamanho entre o stat() e a leitura efetiva: o
  // literal de versão lido pode não corresponder a nenhum estado real do
  // arquivo. Fica inconclusivo, nunca publicado como source_literal estável
  // (critério 15).
  if (initResult.state === "changed_during_read") {
    return { version: null, reasonCode: "version_changed_during_read" };
  }
  if (initResult.state === "missing") return { version: null, reasonCode: "version_unreadable" };
  const result = extractSourceLiteralVersion(initResult.text);
  return result.version === null ? result : { ...result, packageDir: dirnameGeneric(initPath) };
}
