import { lstat, open, readdir, readFile, realpath, stat } from "node:fs/promises";

// Único ponto de acesso real ao filesystem do processo: todo o resto do
// doctor recebe este adaptador por injeção, nunca importa node:fs
// diretamente, para que os testes possam substituí-lo por um adaptador em
// memória sem tocar disco.
export function createProductionFsAdapter() {
  return {
    stat,
    readFile,
    lstat,
    realpath,
    listDir: (dirPath) => readdir(dirPath),
    async open(filePath) {
      const handle = await open(filePath, "r");
      return {
        read: (buffer, offset, length, position) =>
          handle.read(buffer, offset, length, position),
        stat: () => handle.stat(),
        close: () => handle.close(),
      };
    },
  };
}
