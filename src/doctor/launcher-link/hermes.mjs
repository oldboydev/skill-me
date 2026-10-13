import {
  detectSeparator,
  dirnameGeneric,
  isAbsolutePathGeneric,
  joinGeneric,
  stripCommentLines,
} from "./path-helpers.mjs";
import { isNativeExecutable } from "./native-executable.mjs";
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
// Launcher que não é Python pelo shebang (o .cmd simplificado, o trampolim
// `#!/bin/sh` do pip): exige uma referência real de import/execução no início
// da linha, não apenas a substring "hermes_cli" em qualquer lugar do texto —
// uma linha de comentário mencionando o mesmo texto nunca casa aqui.
const HERMES_CLI_REFERENCE_PATTERN =
  /^[ \t]*(from\s+hermes_cli(?:\.[\w.]+)?\s+import\b|import\s+hermes_cli\b|python3?(?:\.\w+)?\s+-m\s+hermes_cli\b)/m;

// Nome de intérprete Python reconhecido pelo shebang, com ou sem versão:
// "python", "python3", "python3.12" (mas não "sh", "node" etc.). Mesma
// família de nome em `referencesHermesCli` (decide se o shim é Python) e em
// `shebangPythonInterpreterPath` (decide se um caminho absoluto do shebang
// liga a OUTRO prefixo) — um caminho absoluto bare (`/b/bin/python`,
// `/b/bin/python3`, sem X.Y) é tão reconhecido quanto um com versão
// (achado G4 da rodada 3, variante residual: antes só `pythonX.Y` contava).
const PYTHON_INTERPRETER_NAME = /(?:^|[\\/])python[\d.]*$/;

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

// Interpretador da primeira linha do launcher, direto (`#!/venv/bin/python3.12`)
// ou via env (`#!/usr/bin/env python3.12`, com ou sem flags como `-S`).
function shebangInterpreter(text) {
  const firstLine = text.split("\n", 1)[0].replace(/\r$/, "");
  if (!firstLine.startsWith("#!")) return null;
  const tokens = firstLine.slice(2).trim().split(/\s+/);
  const interpreter = tokens[0] ?? "";
  if (/(^|[\\/])env$/.test(interpreter)) {
    return tokens.slice(1).find((token) => !token.startsWith("-")) ?? "";
  }
  return interpreter;
}

// Versão X.Y do intérprete do shebang. `python`/`python3` sem X.Y, ou um
// trampolim `#!/bin/sh` (o pip usa um quando o caminho do intérprete tem
// espaços), não determinam a versão: null.
function shebangPythonVersion(text) {
  const match = /(?:^|[\\/])python(\d+\.\d+)$/.exec(shebangInterpreter(text) ?? "");
  return match ? match[1] : null;
}

// Caminho absoluto do intérprete no shebang, para qualquer nome Python já
// reconhecido (`.../python`, `.../python3` ou `.../pythonX.Y`), nunca um nome
// bare resolvido via PATH/`env` — ex.: o `python3.12` que sobra de
// `#!/usr/bin/env python3.12` não tem prefixo próprio, e um caminho relativo
// com separador (`bin/python3.12`) não é absoluto só por conter barra
// (isAbsolutePathGeneric). Um caminho absoluto aponta para um prefixo de venv
// que pode ser diferente do prefixo do launcher: o vínculo precisa seguir
// ESSE prefixo, nunca presumir que o intérprete mora no mesmo venv do
// launcher só porque ambos têm `bin`/`Scripts` (achado G4 da rodada 3). Sem
// X.Y no nome (`.../python`, `.../python3`), a versão específica continua
// indeterminada pelo shebang: `findSitePackagesInitFile` decide por varredura
// do prefixo já resolvido (achado, nunca um pacote de outro prefixo).
function shebangPythonInterpreterPath(text) {
  const interpreter = shebangInterpreter(text);
  if (interpreter === null || !isAbsolutePathGeneric(interpreter)) return null;
  return PYTHON_INTERPRETER_NAME.test(interpreter) ? interpreter : null;
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

// O console-script do pip é Python (shebang de python): o import de
// hermes_cli só conta em código. Os demais launchers seguem a leitura por
// linha sem comentários.
function referencesHermesCli(text) {
  if (PYTHON_INTERPRETER_NAME.test(shebangInterpreter(text) ?? "")) {
    const tokens = tokenizePython(text);
    return tokens !== null && importsHermesCli(tokens);
  }
  return HERMES_CLI_REFERENCE_PATTERN.test(stripCommentLines(text));
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

// Layout padrão de venv/pip: o launcher mora em <prefix>/bin (POSIX) ou
// <prefix>\Scripts (Windows simplificado — ver nota abaixo) e o pacote em
// <prefix>/lib/pythonX.Y/site-packages (POSIX) ou <prefix>\Lib\site-packages
// (Windows). Um hermes_cli colocado ao lado do launcher, fora desse layout,
// não é encontrado por aqui — proximidade no diretório não é vínculo. No
// POSIX o mesmo prefixo pode ter vários pythonX.Y: o do shebang decide; sem
// ele, só um candidato com hermes_cli é aceito, e dois ou mais ficam
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
// (ver contract-evidence.mjs).
export async function resolveHermesVersion(launcherPath, { fs }) {
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
  // O launcher real (console-script do pip) importa hermes_cli; um shim sem
  // essa referência real (comentário ou docstring mencionando o mesmo texto
  // não conta) não é reconhecido, mesmo que um hermes_cli exista perto.
  if (linked.state === "missing" || !referencesHermesCli(linked.text)) {
    return { version: null, reasonCode: "launcher_not_recognized" };
  }

  const launcherDir = dirnameGeneric(launcherPath); // .../bin ou .../Scripts
  const launcherPrefix = dirnameGeneric(launcherDir); // raiz do venv do launcher
  // Um shebang com caminho absoluto de intérprete (`#!/outro/prefixo/bin/
  // pythonX.Y`, ou sem a versão, `#!/outro/prefixo/bin/python3`) liga a esse
  // prefixo, possivelmente diferente do launcher: o pacote procurado precisa
  // ser o do intérprete real, nunca o do launcher só por proximidade de
  // diretório (achado G4 da rodada 3, incluindo a variante residual sem
  // X.Y). Sem um caminho absoluto reconhecido (bare/`env`/relativo/
  // não-Python), preserva o prefixo do launcher como sempre.
  const interpreterPath = shebangPythonInterpreterPath(linked.text);
  const interpreterPrefix =
    interpreterPath !== null ? dirnameGeneric(dirnameGeneric(interpreterPath)) : "";
  const prefix = interpreterPrefix || launcherPrefix;
  // O separador para o layout do venv vem do caminho já resolvido (dirname),
  // não do caminho original recebido (ver nota equivalente em
  // launcher-link/codex.mjs).
  const sep = detectSeparator(prefix || launcherDir);
  const located = await findSitePackagesInitFile(prefix, sep, shebangPythonVersion(linked.text), fs);
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
