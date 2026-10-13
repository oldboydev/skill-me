import { detectSeparator, dirnameGeneric, joinGeneric, stripCommentLines } from "./path-helpers.mjs";
import { readBoundedText } from "../snapshot-read.mjs";
import { isPlausibleVersionString } from "../version-sources/validate.mjs";

const ONE_MIB_BYTES = 1024 * 1024;
const VERSION_LITERAL_PATTERN = /__version__\s*=\s*["']([^"']+)["']/g;
// Exige uma referência real de import/execução no início da linha (shebang
// à parte), não apenas a substring "hermes_cli" em qualquer lugar do texto
// — uma linha de comentário mencionando o mesmo texto nunca casa aqui.
const HERMES_CLI_REFERENCE_PATTERN =
  /^[ \t]*(from\s+hermes_cli(?:\.[\w.]+)?\s+import\b|import\s+hermes_cli\b|python3?(?:\.\w+)?\s+-m\s+hermes_cli\b)/m;

// Resultado de três estados (não só texto|null): "too_large" precisa de um
// reasonCode próprio (input_too_large), distinto de "não reconhecido".
// Qualquer erro de acesso além de ENOENT/limite sobe para o chamador decidir
// presence: unknown preservando o código, conforme o critério 3.
async function readLinkedText(filePath, fs) {
  return readBoundedText(filePath, { fs, maxBytes: ONE_MIB_BYTES });
}

function extractSourceLiteralVersion(text) {
  const matches = [...text.matchAll(VERSION_LITERAL_PATTERN)];
  if (matches.length === 0) return { version: null, reasonCode: "version_unreadable" };
  const uniqueVersions = new Set(matches.map((m) => m[1]));
  if (uniqueVersions.size > 1) {
    return { version: null, reasonCode: "version_source_ambiguous" };
  }
  // Um `__version__` com formato implausível (canário, credencial, texto
  // ilegível) nunca é exposto verbatim como versão.
  if (!isPlausibleVersionString(matches[0][1])) {
    return { version: null, reasonCode: "version_unreadable" };
  }
  return { version: matches[0][1], versionSource: "source_literal" };
}

// Layout padrão de venv/pip: o launcher mora em <prefix>/bin (POSIX) ou
// <prefix>\Scripts (Windows simplificado — ver nota abaixo) e o pacote em
// <prefix>/lib/python3.x/site-packages (POSIX) ou <prefix>\Lib\site-packages
// (Windows). Um hermes_cli colocado ao lado do launcher, fora desse layout,
// não é encontrado por aqui — proximidade no diretório não é vínculo.
async function findSitePackagesInitFile(prefix, sep, fs) {
  const candidates = [];
  if (sep === "\\") {
    candidates.push(joinGeneric(sep, prefix, "Lib", "site-packages", "hermes_cli", "__init__.py"));
  } else {
    let entries = [];
    try {
      entries = await fs.listDir(joinGeneric(sep, prefix, "lib"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    for (const dirName of entries.filter((name) => /^python\d+(\.\d+)?$/.test(name)).sort()) {
      candidates.push(
        joinGeneric(sep, prefix, "lib", dirName, "site-packages", "hermes_cli", "__init__.py"),
      );
    }
  }
  for (const candidate of candidates) {
    try {
      await fs.stat(candidate);
      return candidate;
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
  }
  return null;
}

export async function resolveHermesVersion(launcherPath, { fs }) {
  const linked = await readLinkedText(launcherPath, fs);
  if (linked.state === "too_large") return { version: null, reasonCode: "input_too_large" };
  // O próprio shim mudou de tamanho durante a leitura: a referência extraída
  // dele não é confiável (critério 15), então nunca chega a ser avaliada.
  if (linked.state === "changed_during_read") {
    return { version: null, reasonCode: "version_changed_during_read" };
  }
  // O launcher real (console-script do pip) importa hermes_cli; um shim sem
  // essa referência real (uma linha de comentário mencionando o mesmo texto
  // não conta) não é reconhecido, mesmo que um hermes_cli exista perto.
  if (
    linked.state === "missing" ||
    !HERMES_CLI_REFERENCE_PATTERN.test(stripCommentLines(linked.text))
  ) {
    return { version: null, reasonCode: "launcher_not_recognized" };
  }

  const launcherDir = dirnameGeneric(launcherPath); // .../bin ou .../Scripts
  const prefix = dirnameGeneric(launcherDir); // raiz do venv
  // O separador para o layout do venv vem do caminho do launcher já
  // resolvido (dirname), não do caminho original recebido (ver nota
  // equivalente em launcher-link/codex.mjs).
  const sep = detectSeparator(prefix || launcherDir);
  const initPath = await findSitePackagesInitFile(prefix, sep, fs);
  if (!initPath) return { version: null, reasonCode: "launcher_not_recognized" };

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
  return extractSourceLiteralVersion(initResult.text);
}
