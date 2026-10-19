import { lstat, mkdir, open, readdir, realpath, rename, rmdir, stat, unlink } from "node:fs/promises";
import { createProductionFsAdapter } from "../../doctor/fs-adapter.mjs";
import { readSnapshot } from "../../doctor/snapshot-read.mjs";

// Efeitos de disco do armazenamento de privacidade num objeto só, para que os
// testes instrumentem uma operação (falha de unlink/rename) sem simular o
// resto. Não reutiliza `install/io.mjs#writeExclusive`: aquele cria com
// 0666 &~umask e carrega o acesso do instalador; aqui todo arquivo nasce 0600
// e toda pasta 0700 (POSIX; no Windows vale a DACL herdada da raiz escolhida).
// `openFile` só existe para as provas contarem os bytes lidos.
export function createStoreIo({ openFile = open } = {}) {
  const doctorFs = createProductionFsAdapter({ openFile });
  return {
    lstat,
    stat,
    realpath,
    readdir,
    rename,
    rmdir,
    unlink,
    // Leitor limitado do doctor: o teto vale na própria leitura posicional
    // (no máximo `maxBytes + 1` bytes) e o fd é conferido como arquivo
    // regular. Nada do disco é lido inteiro antes de comparar com o limite.
    // Devolve null se maior que `maxBytes` ou se mudou durante a leitura.
    async readBounded(file, maxBytes) {
      const snapshot = await readSnapshot(file, { fs: doctorFs, maxBytes });
      return snapshot.tooLarge || snapshot.changedDuringRead ? null : snapshot.content;
    },
    // Não recursivo: só a pasta pedida, nunca ancestrais.
    mkdir: (dir) => mkdir(dir, { mode: 0o700 }),
    // `wx`: falha se o caminho existe — serve de lock e impede que um
    // temporário sobrescreva o que não é nosso. `durable: false` dispensa o
    // flush; só o lock o usa (store.mjs, `withLock`).
    async writeExclusive(file, data, { durable = true } = {}) {
      const handle = await open(file, "wx", 0o600);
      try {
        await handle.writeFile(data);
        if (durable) await handle.sync();
      } finally {
        await handle.close();
      }
    },
  };
}
