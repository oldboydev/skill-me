import { lstat, mkdir, open, readdir, readFile, realpath, rename, rmdir, stat, unlink } from "node:fs/promises";
import { ONE_MIB_BYTES } from "../../doctor/config-projection.mjs";
import { createProductionFsAdapter } from "../../doctor/fs-adapter.mjs";
import { readBoundedText } from "../../doctor/snapshot-read.mjs";

// Efeitos de sistema de arquivos do instalador, num objeto só para que os
// testes unitários possam instrumentar uma operação (edição concorrente,
// falha de rename) sem simular o resto. A leitura reaproveita o leitor
// limitado do doctor: arquivo regular, teto de 1 MiB, mutação durante a
// leitura detectada.
export function createNodeIo() {
  const doctorFs = createProductionFsAdapter();
  return {
    lstat,
    stat,
    realpath,
    readdir,
    rename,
    rmdir,
    unlink,
    mkdir: (dir) => mkdir(dir),
    readBytes: (file) => readFile(file),
    readText: (file) => readBoundedText(file, { fs: doctorFs, maxBytes: ONE_MIB_BYTES }),
    // `wx`: falha se o caminho já existe — serve de lock e impede que um
    // temporário sobrescreva algo que não seja nosso.
    async writeExclusive(file, data) {
      const handle = await open(file, "wx");
      try {
        await handle.writeFile(data);
        await handle.sync();
      } finally {
        await handle.close();
      }
    },
  };
}
