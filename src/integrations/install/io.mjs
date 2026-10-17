import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, readFile, realpath, rename, rmdir, stat, unlink } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { ONE_MIB_BYTES } from "../../doctor/config-projection.mjs";
import { createProductionFsAdapter } from "../../doctor/fs-adapter.mjs";
import { readBoundedText } from "../../doctor/snapshot-read.mjs";
import { aclOf, matchAcl } from "./posix-acl.mjs";
import { createWithDacl, readDacl } from "./windows-access.mjs";

// No Windows o acesso é decidido pela DACL; modo e ids do `stat` não a
// representam. Lá o acesso do arquivo substituído é a DACL (windows-access.mjs).
const POSIX_ACCESS = process.platform !== "win32";
// A configuração é aberta só para ler o acesso: um FIFO posto no lugar não
// bloqueia a abertura e um terminal não vira terminal de controle.
const ACCESS_READ_FLAGS = constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOCTTY;

// Mesmo acesso, na forma devolvida por `accessOf` — modo, dono, grupo e ACL
// (POSIX) ou a DACL inteira (Windows): a comparação única das conferências
// feitas antes de criar o temporário e antes de cada rename.
export const sameAccess = (a, b) => isDeepStrictEqual(a, b);

// Bits finais do arquivo que substitui `original`: os mesmos quando o grupo
// do arquivo novo é o do original. Se o grupo não pôde ser igualado, quem não
// é o dono muda de classe: membro do grupo novo passa a usar os bits de grupo
// e membro só do grupo antigo passa a "outros" (no POSIX, o grupo do arquivo
// usa os bits de grupo mesmo que "outros" seja mais amplo — em 0604 ele não
// lia). Sem saber quem pertence a cada grupo, grupo e "outros" recebem só o
// que os dois já concediam: ninguém ganha acesso.
export function replacementMode(original, sameGroup) {
  const mode = original.mode & 0o777;
  if (sameGroup) return mode;
  const grantedToBoth = (mode >> 3) & mode & 0o7;
  return (mode & 0o700) | (grantedToBoth << 3) | grantedToBoth;
}

// Grupo, ACL e bits finais aplicados pelo próprio handle, antes de qualquer
// conteúdo: o temporário nasceu só com os bits de dono do original — com ACL
// default na pasta, com as entradas herdadas sob a máscara fechada. A ACL do
// original vem antes do `fchmod`, que com ACL abriria essa máscara
// (posix-acl.mjs).
async function matchAccess(handle, file, like) {
  let sameGroup = (await handle.stat()).gid === like.gid;
  if (!sameGroup) {
    try {
      await handle.chown(-1, like.gid);
      sameGroup = true;
    } catch {
      // Sem permissão para o grupo original: bits limitados em replacementMode.
    }
  }
  await matchAcl(handle, file, like.acl, sameGroup);
  await handle.chmod(replacementMode(like, sameGroup));
}

// Sem como dar ao temporário o acesso do original, ele não recebe conteúdo e
// sai — vazio, só com o dono —, enquanto o caminho ainda for o inode criado
// por este handle: deixado, as execuções seguintes o recusariam como alheio.
async function matchAccessOrDiscard(handle, file, like) {
  try {
    await matchAccess(handle, file, like);
  } catch (error) {
    const created = await handle.stat({ bigint: true }).catch(() => null);
    const current = await lstat(file, { bigint: true }).catch(() => null);
    if (created !== null && current !== null && current.dev === created.dev && current.ino === created.ino) await unlink(file).catch(() => {});
    throw error;
  }
}

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
    // Acesso do arquivo que será substituído: modo, dono, grupo e ACL (POSIX,
    // todos do mesmo descritor, seguindo link como o `stat`) ou a DACL em SDDL
    // (Windows). Ausente → ENOENT; ACL ou DACL que não pôde ser lida →
    // `config_access_unavailable`.
    async accessOf(file) {
      if (!POSIX_ACCESS) return { dacl: await readDacl(file) };
      const handle = await open(file, ACCESS_READ_FLAGS);
      try {
        const stats = await handle.stat();
        return { mode: stats.mode & 0o777, uid: stats.uid, gid: stats.gid, acl: await aclOf(handle, file) };
      } finally {
        await handle.close();
      }
    },
    // `wx`: falha se o caminho já existe — serve de lock e impede que um
    // temporário sobrescreva algo que não seja nosso. Com `like` (de
    // `accessOf`, conferido pelo chamador no documento com o conteúdo lido
    // antes da gravação), o temporário que vai substituir uma configuração em
    // nenhum instante concede mais do que o original concedia. POSIX: nasce só
    // com os bits de dono do original e recebe grupo, ACL e bits finais antes
    // do conteúdo; sem como aplicar a ACL, falha com `config_access_unavailable`
    // sem conteúdo e o temporário vazio sai. Windows: já nasce com a DACL do
    // original (explícita e protegida) e o conteúdo vai pelo handle da criação
    // — nunca existe com a ACL herdada da pasta; sem como criá-lo assim, falha
    // com `config_access_unavailable`.
    async writeExclusive(file, data, { like = null } = {}) {
      if (like !== null && !POSIX_ACCESS) return createWithDacl(file, data, like.dacl);
      const handle = await open(file, "wx", like ? like.mode & 0o700 : 0o666);
      try {
        if (like) await matchAccessOrDiscard(handle, file, like);
        await handle.writeFile(data);
        await handle.sync();
      } finally {
        await handle.close();
      }
    },
  };
}
