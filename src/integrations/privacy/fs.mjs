import { lstat, mkdir, open, readdir, readFile, realpath, rename, rmdir, stat, unlink } from "node:fs/promises";

// Efeitos de disco do armazenamento de privacidade num objeto só, para que os
// testes instrumentem uma operação (falha de unlink/rename) sem simular o
// resto. Não reutiliza `install/io.mjs#writeExclusive`: aquele cria com
// 0666 &~umask e carrega o acesso do instalador; aqui todo arquivo nasce 0600
// e toda pasta 0700 (POSIX; no Windows vale a DACL herdada da raiz escolhida).
export function createStoreIo() {
  return {
    lstat,
    stat,
    realpath,
    readdir,
    rename,
    rmdir,
    unlink,
    readFile: (file) => readFile(file),
    // Não recursivo: só a pasta pedida, nunca ancestrais.
    mkdir: (dir) => mkdir(dir, { mode: 0o700 }),
    // `wx`: falha se o caminho existe — serve de lock e impede que um
    // temporário sobrescreva o que não é nosso.
    async writeExclusive(file, data) {
      const handle = await open(file, "wx", 0o600);
      try {
        await handle.writeFile(data);
        await handle.sync();
      } finally {
        await handle.close();
      }
    },
  };
}
