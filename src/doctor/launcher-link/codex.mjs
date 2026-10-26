import { detectSeparator, dirnameGeneric, joinGeneric, resolveRelative } from "./path-helpers.mjs";
import { isNativeExecutable } from "./native-executable.mjs";
import { commandStartLines } from "./shim-lines.mjs";
import { readBoundedText } from "../snapshot-read.mjs";
import { isPlausibleVersionString } from "../version-sources/validate.mjs";

const ONE_MIB_BYTES = 1024 * 1024;

// Linhas com que o cmd-shim do npm EXECUTA o node com o arquivo de entrada do
// pacote, relativo ao diretório do shim — no prefixo global
// `node_modules\@openai\codex\bin\codex.js`, numa instalação local
// `..\@openai\codex\bin\codex.js` (a partir de node_modules\.bin). No .cmd é
// a última linha do template, com o prefixo fixo que ele grava; no sh são as
// duas linhas `exec` do if/else. A referência só conta como argumento do node
// nessa posição, numa linha que começa um comando (shim-lines.mjs): a mesma
// referência impressa por echo, dentro de here-document/string, numa linha
// que continua outra ou no dialeto errado não executa o pacote.
const CMD_SHIM_INVOCATION =
  /^[ \t]*endLocal & goto #_undefined_# 2>NUL \|\| title %COMSPEC% & "%_prog%"[ \t]+"%dp0%\\([^"%]+)"[ \t]+%\*[ \t]*$/;
const SH_SHIM_INVOCATION = /^[ \t]*exec[ \t]+(?:"\$basedir\/node"|node)[ \t]+"\$basedir\/([^"$`\\]+)"[ \t]+"\$@"[ \t]*$/;

// Resultado de três estados (não só texto|null): "too_large" precisa de um
// reasonCode próprio (input_too_large), distinto de "não reconhecido".
// Qualquer erro de acesso além de ENOENT/limite sobe para o chamador decidir
// presence: unknown preservando o código, conforme o critério 3.
async function readLinkedText(filePath, fs) {
  return readBoundedText(filePath, { fs, maxBytes: ONE_MIB_BYTES });
}

// Só um caminho que atravessa node_modules/@openai/codex chega ao pacote;
// "@openai/codex" fora de um node_modules (ex.: uma referência que sobe com
// ".." para fora dele) não é a instalação que o npm criou.
function packageRootFromAbsolutePath(resolvedPath, sep) {
  const segments = resolvedPath.split(/[\\/]/);
  const index = segments.findIndex(
    (segment, i) =>
      segment === "node_modules" &&
      segments[i + 1] === "@openai" &&
      segments[i + 2] === "codex",
  );
  if (index === -1) return null;
  return segments.slice(0, index + 3).join(sep);
}

// O dialeto vem da extensão do launcher, como o SO decide quem interpreta o
// arquivo: .cmd/.bat pelo cmd.exe, o shim sem extensão pelo sh. Devolve, por
// pacote, os arquivos de entrada que o shim executa com o node.
function packageEntriesInvokedByShim(text, launcherPath, sep) {
  const dialect = /\.(?:cmd|bat)$/i.test(launcherPath) ? "cmd" : "sh";
  const invocation = dialect === "cmd" ? CMD_SHIM_INVOCATION : SH_SHIM_INVOCATION;
  const launcherDir = dirnameGeneric(launcherPath);
  const entries = new Map();
  for (const line of commandStartLines(text, dialect)) {
    const reference = invocation.exec(line)?.[1];
    if (reference === undefined) continue;
    const resolved = resolveRelative(launcherDir, reference, sep);
    if (resolved === null) continue;
    const root = packageRootFromAbsolutePath(resolved, sep);
    if (!root) continue;
    if (!entries.has(root)) entries.set(root, new Set());
    entries.get(root).add(resolved);
  }
  return entries;
}

async function readCodexPackageVersion(pkgRootPath, sep, fs) {
  const pkgJsonPath = joinGeneric(sep, pkgRootPath, "package.json");
  const result = await readLinkedText(pkgJsonPath, fs);
  if (result.state === "too_large") return { version: null, reasonCode: "input_too_large" };
  // package.json mudou de tamanho entre o stat() e a leitura efetiva: o
  // conteúdo lido pode ser um estado que nunca existiu de verdade (metade de
  // antes, metade de depois). Fica inconclusivo, nunca publicado como versão
  // estável nem confundido com "launcher não reconhecido" (critério 15).
  if (result.state === "changed_during_read") {
    return { version: null, reasonCode: "version_changed_during_read" };
  }
  if (result.state === "missing") return { version: null, reasonCode: "launcher_not_recognized" };
  let parsed;
  try {
    parsed = JSON.parse(result.text);
  } catch {
    return { version: null, reasonCode: "launcher_not_recognized" };
  }
  // `parsed` pode ser `null` (JSON válido) ou outro primitivo/array: o
  // acesso a `.name` não lança nesses casos (exceto `null`, por isso a ordem
  // do `||` abaixo), mas nenhum deles tem `name`, então caem na mesma
  // resposta de "não reconhecido" — presença e leitura já aconteceram, só a
  // identificação do pacote falhou (critério 3).
  if (parsed === null || parsed.name !== "@openai/codex") {
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
// realpath) atravessa node_modules/@openai/codex — instalação global ou
// local no POSIX; (2) o shim de texto do cmd-shim (.cmd no Windows, sh ao
// lado dele) executa o node com o arquivo de entrada do pacote, a partir do
// próprio diretório, na linha de invocação do template. Um launcher alheio,
// mesmo com um package.json de @openai/codex ao lado — sem referência a ele
// ou só mencionando-o —, nunca é reconhecido: proximidade no diretório ou
// menção textual não é vínculo. Um executável nativo (codex.exe) fica sem
// versão: não há metadado de pacote ligado a ele que o doctor reconheça.
export async function resolveCodexVersion(launcherPath, { fs }) {
  if (typeof fs.lstat === "function" && typeof fs.realpath === "function") {
    const lstat = await fs.lstat(launcherPath).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (lstat?.isSymbolicLink?.()) {
      const real = await fs.realpath(launcherPath);
      const sep = detectSeparator(real);
      const pkgRoot = packageRootFromAbsolutePath(real, sep);
      if (!pkgRoot) return { version: null, reasonCode: "launcher_not_recognized" };
      return readCodexPackageVersion(pkgRoot, sep, fs);
    }
  }

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

  // O separador para montar o caminho do pacote vem do diretório do
  // launcher já resolvido (estilo nativo e consistente com o PATH).
  const sep = detectSeparator(dirnameGeneric(launcherPath));
  const roots = [...packageEntriesInvokedByShim(linked.text, launcherPath, sep).keys()];
  if (roots.length === 0) return { version: null, reasonCode: "launcher_not_recognized" };
  if (roots.length > 1) return { version: null, reasonCode: "version_source_ambiguous" };
  return readCodexPackageVersion(roots[0], sep, fs);
}

// Arquivo de entrada que um shim de texto do npm executa com o node (issue
// #25, linha "Início do agente" do Landing em .checks/issue-25-agent-launch.md):
// a mesma linha de invocação que liga o shim ao pacote na versão acima, e só
// ela. null quando o shim não é reconhecido, aponta mais de um pacote ou mais
// de uma entrada, ou o pacote não é @openai/codex com versão legível — o
// launcher então recusa o shim em vez de interpretá-lo.
export async function resolveCodexShimEntry(launcherPath, { fs }) {
  const linked = await readLinkedText(launcherPath, fs);
  if (linked.state !== "ok") return null;
  const sep = detectSeparator(dirnameGeneric(launcherPath));
  const byRoot = packageEntriesInvokedByShim(linked.text, launcherPath, sep);
  if (byRoot.size !== 1) return null;
  const [[root, entries]] = byRoot;
  if (entries.size !== 1) return null;
  const pkg = await readCodexPackageVersion(root, sep, fs);
  return pkg.versionSource === "package_metadata" ? [...entries][0] : null;
}
