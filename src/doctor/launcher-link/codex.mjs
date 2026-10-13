import {
  detectSeparator,
  dirnameGeneric,
  joinGeneric,
  normalizeReference,
  stripCommentLines,
} from "./path-helpers.mjs";
import { readBoundedText } from "../snapshot-read.mjs";
import { isPlausibleVersionString } from "../version-sources/validate.mjs";

const ONE_MIB_BYTES = 1024 * 1024;
const PACKAGE_SEGMENTS = ["node_modules", "@openai", "codex"];
// Casa a referência real que um shim gerado pelo npm embute (local ou
// global): algo como "node_modules/@openai/codex/bin/codex.js" ou
// "node_modules\@openai\codex\bin\codex.js" dentro do texto do script.
const PACKAGE_REFERENCE_PATTERN = /node_modules[\\/]@openai[\\/]codex[\\/][^"'\s)]+/;

// Resultado de três estados (não só texto|null): "too_large" precisa de um
// reasonCode próprio (input_too_large), distinto de "não reconhecido".
// Qualquer erro de acesso além de ENOENT/limite sobe para o chamador decidir
// presence: unknown preservando o código, conforme o critério 3.
async function readLinkedText(filePath, fs) {
  return readBoundedText(filePath, { fs, maxBytes: ONE_MIB_BYTES });
}

function packageRootFromAbsolutePath(resolvedPath) {
  const normalized = resolvedPath.replace(/\\/g, "/");
  const segments = normalized.split("/");
  const index = segments.findIndex(
    (segment, i) =>
      segment === "node_modules" &&
      segments[i + 1] === "@openai" &&
      segments[i + 2] === "codex",
  );
  if (index === -1) return null;
  return segments.slice(0, index + 3).join("/");
}

async function readCodexPackageVersion(pkgRootPath, sep, fs) {
  const pkgJsonPath = joinGeneric(sep, pkgRootPath, "package.json");
  const result = await readLinkedText(pkgJsonPath, fs);
  if (result.state === "too_large") return { version: null, reasonCode: "input_too_large" };
  if (result.state === "missing") return { version: null, reasonCode: "launcher_not_recognized" };
  let parsed;
  try {
    parsed = JSON.parse(result.text);
  } catch {
    return { version: null, reasonCode: "launcher_not_recognized" };
  }
  if (parsed.name !== "@openai/codex") {
    return { version: null, reasonCode: "launcher_not_recognized" };
  }
  // Um "version" com formato implausível (canário, credencial, texto
  // ilegível) nunca é exposto verbatim como versão.
  if (!isPlausibleVersionString(parsed.version)) {
    return { version: null, reasonCode: "version_unreadable" };
  }
  return { version: parsed.version, versionSource: "package_metadata" };
}

// Linka o launcher ao pacote @openai/codex de duas formas, as mesmas que um
// npm real produz: (1) o launcher é um link simbólico cujo alvo (via
// realpath) atravessa node_modules/@openai/codex — instalação global típica
// em POSIX; (2) o conteúdo do launcher (shim .cmd do Windows, ou script
// .bin local em POSIX) embute uma referência relativa ao arquivo de entrada
// do pacote. Um launcher alheio, mesmo com um package.json de @openai/codex
// ao lado sem nenhuma referência a ele, nunca é reconhecido — proximidade
// no diretório não é vínculo.
export async function resolveCodexVersion(launcherPath, { fs }) {
  if (typeof fs.lstat === "function" && typeof fs.realpath === "function") {
    const lstat = await fs.lstat(launcherPath).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (lstat?.isSymbolicLink?.()) {
      const real = await fs.realpath(launcherPath);
      const pkgRoot = packageRootFromAbsolutePath(real);
      if (!pkgRoot) return { version: null, reasonCode: "launcher_not_recognized" };
      return readCodexPackageVersion(pkgRoot, "/", fs);
    }
  }

  const linked = await readLinkedText(launcherPath, fs);
  if (linked.state === "too_large") return { version: null, reasonCode: "input_too_large" };
  if (linked.state === "missing") return { version: null, reasonCode: "launcher_not_recognized" };

  // Uma referência dentro de um comentário (sem nenhuma execução/require
  // real) nunca conta como vínculo.
  const match = PACKAGE_REFERENCE_PATTERN.exec(stripCommentLines(linked.text));
  if (!match) return { version: null, reasonCode: "launcher_not_recognized" };

  const launcherDir = dirnameGeneric(launcherPath);
  // O separador para montar o caminho do pacote vem do diretório do
  // launcher já resolvido (estilo nativo e consistente), não do caminho
  // original — que pode ter uma junção final em estilo diferente (ver
  // findLauncherPath em agent-resolution.mjs).
  const sep = detectSeparator(launcherDir);
  const reference = normalizeReference(match[0], sep);
  const referenceSegments = reference.split(sep);
  const pkgIndex = referenceSegments.findIndex(
    (segment, i) =>
      segment === PACKAGE_SEGMENTS[0] &&
      referenceSegments[i + 1] === PACKAGE_SEGMENTS[1] &&
      referenceSegments[i + 2] === PACKAGE_SEGMENTS[2],
  );
  if (pkgIndex === -1) return { version: null, reasonCode: "launcher_not_recognized" };
  const pkgRoot = joinGeneric(
    sep,
    launcherDir,
    referenceSegments.slice(pkgIndex, pkgIndex + 3).join(sep),
  );
  return readCodexPackageVersion(pkgRoot, sep, fs);
}
