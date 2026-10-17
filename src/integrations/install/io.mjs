import { lstat, mkdir, open, readdir, readFile, realpath, rename, rmdir, stat, unlink } from "node:fs/promises";
import { ONE_MIB_BYTES } from "../../doctor/config-projection.mjs";
import { createProductionFsAdapter } from "../../doctor/fs-adapter.mjs";
import { readBoundedText } from "../../doctor/snapshot-read.mjs";

// No Windows o acesso é decidido por ACL; modo e ids do `stat` não a
// representam. Lá a reescrita segue como antes (limite declarado no checklist).
const POSIX_ACCESS = process.platform !== "win32";

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

// Grupo e bits finais aplicados pelo próprio handle, antes de qualquer
// conteúdo: o temporário nasceu só com os bits de dono do original.
async function matchAccess(handle, like) {
  let sameGroup = (await handle.stat()).gid === like.gid;
  if (!sameGroup) {
    try {
      await handle.chown(-1, like.gid);
      sameGroup = true;
    } catch {
      // Sem permissão para o grupo original: bits limitados em replacementMode.
    }
  }
  await handle.chmod(replacementMode(like, sameGroup));
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
    // POSIX: modo, dono e grupo do arquivo que será substituído; `null` no Windows.
    async accessOf(file) {
      if (!POSIX_ACCESS) return null;
      const stats = await stat(file);
      return { mode: stats.mode & 0o777, uid: stats.uid, gid: stats.gid };
    },
    // `wx`: falha se o caminho já existe — serve de lock e impede que um
    // temporário sobrescreva algo que não seja nosso. Com `like` (de
    // `accessOf`), o temporário que vai substituir uma configuração nasce só
    // com os bits de dono do original e recebe grupo e bits finais antes do
    // conteúdo: em nenhum instante concede mais do que o original concedia.
    async writeExclusive(file, data, { like = null } = {}) {
      const handle = await open(file, "wx", like ? like.mode & 0o700 : 0o666);
      try {
        if (like) await matchAccess(handle, like);
        await handle.writeFile(data);
        await handle.sync();
      } finally {
        await handle.close();
      }
    },
  };
}
