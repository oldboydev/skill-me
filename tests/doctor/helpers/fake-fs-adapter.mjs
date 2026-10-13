// Adaptador de filesystem em memória para testar regras de resolução sem
// depender de permissões reais do SO (não portáveis entre Windows/Linux/
// macOS) nem de um sistema de arquivos real. Contrato esperado por
// src/doctor/agent-resolution.mjs: listDir, readFile, stat — todas podem
// ser substituídas por falhas injetadas (ex.: EACCES) por caminho exato.
export function createFakeFsAdapter(tree) {
  const faults = new Map();

  function raise(filePath) {
    const fault = faults.get(filePath);
    if (fault) {
      const error = new Error(`${fault.code}: acesso negado a ${filePath}`);
      error.code = fault.code;
      error.path = filePath;
      throw error;
    }
  }

  return {
    injectFault(filePath, code) {
      faults.set(filePath, { code });
    },
    // Marca um arquivo já adicionado como não-executável (sem bit +x), para
    // provar que a resolução de launcher trata isso como "não encontrado"
    // nesse candidato, não como presença válida (ver critério 3 — POSIX).
    markNonExecutable(filePath) {
      tree.nonExecutable ??= new Set();
      tree.nonExecutable.add(filePath);
    },
    async listDir(dirPath) {
      raise(dirPath);
      const node = tree.dirs.get(dirPath);
      if (!node) return [];
      return [...node];
    },
    async readFile(filePath) {
      raise(filePath);
      const node = tree.files.get(filePath);
      if (node === undefined) {
        const error = new Error(`ENOENT: ${filePath}`);
        error.code = "ENOENT";
        throw error;
      }
      return node;
    },
    async stat(filePath) {
      raise(filePath);
      const node = tree.files.get(filePath);
      if (node === undefined) {
        if (tree.dirs.has(filePath)) {
          return {
            size: 0,
            isDirectory: () => true,
            isFile: () => false,
            mode: 0o755,
          };
        }
        const error = new Error(`ENOENT: ${filePath}`);
        error.code = "ENOENT";
        throw error;
      }
      const mode = tree.nonExecutable?.has(filePath) ? 0o644 : 0o755;
      return {
        size: node.length,
        isDirectory: () => false,
        isFile: () => true,
        isExecutable: true,
        mode,
      };
    },
    // Esta árvore em memória não modela links simbólicos: todo arquivo é
    // "comum", então a resolução de Codex cai sempre para a leitura de
    // conteúdo do shim, nunca para o atalho de realpath — ver
    // src/doctor/launcher-link/codex.mjs.
    async lstat(filePath) {
      raise(filePath);
      if (!tree.files.has(filePath)) {
        const error = new Error(`ENOENT: ${filePath}`);
        error.code = "ENOENT";
        throw error;
      }
      return { isSymbolicLink: () => false };
    },
    async realpath(filePath) {
      raise(filePath);
      return filePath;
    },
  };
}

export function buildFsTree() {
  return { dirs: new Map(), files: new Map() };
}

// A chave de arquivo usa o separador que o próprio dirPath já contém
// (backslash se simular Windows, "/" por padrão), para casar exatamente
// com o que src/doctor/launcher-link/path-helpers.mjs (joinPath/
// detectSeparator) produz ao montar o mesmo caminho a partir do diretório.
// Registra uma subpasta "vazia" (sem arquivo direto nela) para que
// listDir(parentDirPath) a enxergue — necessário para simular um layout
// como lib/python3.x/site-packages, onde python3.x pode não ter nenhum
// arquivo direto além de outra pasta.
export function addDir(tree, parentDirPath, dirName) {
  const entries = tree.dirs.get(parentDirPath) ?? [];
  if (!entries.includes(dirName)) entries.push(dirName);
  tree.dirs.set(parentDirPath, entries);
}

export function addFile(tree, dirPath, fileName, content) {
  const sep = dirPath.includes("\\") ? "\\" : "/";
  const entries = tree.dirs.get(dirPath) ?? [];
  if (!entries.includes(fileName)) entries.push(fileName);
  tree.dirs.set(dirPath, entries);
  tree.files.set(
    dirPath + sep + fileName,
    Buffer.isBuffer(content) ? content : Buffer.from(content),
  );
}
