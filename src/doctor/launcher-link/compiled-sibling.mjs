// Compartilhado por hermes.mjs (hermes_cli e seu __init__) e
// contract-evidence.mjs (hermes_cli.plugins e seu __init__): detecta um
// vizinho de MÓDULO PYTHON que o FileFinder do CPython importaria antes de
// uma fonte textual de mesmo nome — bytecode solto (<nome>.pyc) e extensão
// nativa (<nome>[.ABI].so/.pyd), com ou sem marcador de ABI entre o nome e a
// extensão real (`importlib.machinery.EXTENSION_SUFFIXES`, ex.
// "cpython-313-x86_64-linux-gnu" ou "cp313-win_amd64"). O marcador não é
// interpretado, só casado como texto; listar o diretório é a única forma de
// alcançar esse nome, que um fileExists exato não cobre.
export function compiledModuleSuffixPattern(moduleName) {
  return new RegExp(`^${moduleName}(?:\\.[^/\\\\]+)?\\.(?:so|pyd)$`);
}

export async function fileExists(filePath, fs) {
  try {
    await fs.stat(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

// No Windows, o FileFinder do import cacheia os nomes do diretório com tudo
// a partir do primeiro ponto em minúsculas antes de casar contra os sufixos
// (CPython v3.13.0, `_bootstrap_external.py` `_fill_cache`: "Windows users
// can import modules with case-insensitive file suffixes"). O nome antes do
// primeiro ponto nunca é tocado por essa normalização: a base do módulo
// continua contrato exato, só a extensão e o marcador de ABI perdem caixa.
export function windowsFoldedSuffix(name) {
  const dotIndex = name.indexOf(".");
  return dotIndex === -1 ? name : name.slice(0, dotIndex) + name.slice(dotIndex).toLowerCase();
}

// `platform` vem sempre do chamador (nunca de process.platform implícito):
// só "win32" aciona o casefold acima; qualquer outro valor, incluindo
// ausente, mantém o POSIX exato — o lado conservador quando o chamador
// direto não declara a plataforma.
export async function hasCompiledSibling(dirPath, namePattern, fs, platform) {
  let entries = [];
  try {
    entries = await fs.listDir(dirPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return entries.some((name) => namePattern.test(platform === "win32" ? windowsFoldedSuffix(name) : name));
}
