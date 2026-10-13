import { constants, lstat, open, readdir, readFile, realpath, stat } from "node:fs/promises";

const OPEN_FLAGS_NONBLOCKING = constants.O_RDONLY | (constants.O_NONBLOCK ?? 0);

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
    // O_NONBLOCK evita que abrir um FIFO (ou link para FIFO) sem escritor
    // conectado bloqueie o diagnóstico inteiro — no POSIX, open() para
    // leitura de um FIFO espera por um escritor a menos que essa flag esteja
    // presente (fifo(7)); regular files não são afetados por ela. O handle só
    // é devolvido depois de confirmar, pelo próprio fd já aberto (nunca por
    // um stat() anterior — corrida entre stat/open), que é um arquivo
    // regular; qualquer outro tipo (FIFO, socket, diretório, dispositivo) é
    // fechado aqui mesmo e reportado como erro, nunca lido (revisão formal8,
    // achado 4). No Windows, `O_NONBLOCK` não existe e a flag some do
    // bitmask (valor 0), preservando exatamente o "r" de antes.
    async open(filePath) {
      const handle = await open(filePath, OPEN_FLAGS_NONBLOCKING);
      const stats = await handle.stat();
      if (!stats.isFile()) {
        await handle.close();
        const error = new Error(
          `${filePath}: não é um arquivo regular (FIFO, socket ou dispositivo)`,
        );
        error.code = "ERR_NOT_REGULAR_FILE";
        throw error;
      }
      return {
        read: (buffer, offset, length, position) =>
          handle.read(buffer, offset, length, position),
        stat: () => handle.stat(),
        close: () => handle.close(),
      };
    },
  };
}
