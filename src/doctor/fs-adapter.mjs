import { constants, lstat, open, readdir, readFile, realpath, stat } from "node:fs/promises";

const OPEN_FLAGS_NONBLOCKING = constants.O_RDONLY | (constants.O_NONBLOCK ?? 0);

// Único ponto de acesso real ao filesystem do processo: todo o resto do
// doctor recebe este adaptador por injeção, nunca importa node:fs
// diretamente, para que os testes possam substituí-lo por um adaptador em
// memória sem tocar disco.
// `openFile` isola só a chamada nativa `open` para teste determinístico
// (conferência root do delta formal8, achado 2,
// .checks/code-review/formal8-root-feedback.md) — produção sempre usa o
// `open` de node:fs/promises; nenhum outro consumidor real precisa deste
// parâmetro.
export function createProductionFsAdapter({ openFile = open } = {}) {
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
      const handle = await openFile(filePath, OPEN_FLAGS_NONBLOCKING);
      // handle.stat() pode rejeitar (ex.: EIO) tanto quanto resolver para um
      // tipo não regular: as duas falhas de validação do handle precisam da
      // mesma barreira de fechamento (conferência root do delta formal8,
      // achado 2) — sem o try/catch aqui, uma rejeição deixava o fd aberto,
      // porque o finally de quem chama (readSnapshot, snapshot-read.mjs) só
      // recebe o handle depois que esta função resolve.
      let stats;
      try {
        stats = await handle.stat();
      } catch (error) {
        await handle.close();
        throw error;
      }
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
