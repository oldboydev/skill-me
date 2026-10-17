import { realpath } from "node:fs/promises";
import { runSystemTool } from "./system-tool.mjs";

// ACL dos arquivos no POSIX, para que a reescrita da configuração não amplie
// o acesso do original (revisão formal round 5; forma e alternativas na linha
// de Landing correspondente em .checks/issue-4-integracoes.md). O Node não
// expõe xattr nem ACL.
//
// Linux: a ACL de acesso é o xattr `system.posix_acl_access` — onde a própria
// libacl a guarda (`ACL_EA_ACCESS` em acl_ea.h) —, lido e gravado pelo Python
// do sistema (`os.getxattr`/`os.setxattr`/`os.removexattr`, que só existem no
// Linux) sobre o descritor aberto por este processo, recebido como fd 3:
// nenhum caminho chega ao Python e o objeto lido ou gravado é o do descritor.
// Caminho fixo (não o PATH) e `-I -S`: sem variáveis PYTHON*, site do usuário
// nem o módulo `site`. Valor sem ACL estendida: `ENODATA`; sistema de arquivos
// sem ACL POSIX (`ENOTSUP`) ou qualquer outro erro → recusa.
//
// macOS: a ACL estendida (ACEs, avaliadas antes dos bits de modo) não é
// copiada, só detectada pelo `ls -ledi` do sistema — no file_cmds da Apple,
// `-e` imprime uma linha " <n>: …" por ACE e `-i` o inode no início —, com o
// inode conferido contra o descritor. Os `+`/`@` depois do modo não bastam: o
// `@` dos xattrs esconde o `+` da ACL.

const PYTHON = "/usr/bin/python3";
const LS = "/bin/ls";
const ACL_HEX = /^(?:[0-9a-f]{2})+$/;

const READ_ACL = [
  "import errno, os, sys",
  "try:",
  "    sys.stdout.write(os.getxattr(3, 'system.posix_acl_access').hex())",
  "except OSError as e:",
  "    if e.errno != errno.ENODATA:",
  "        sys.exit(1)",
  "    sys.stdout.write('none')",
].join("\n");

// Grava no descritor a ACL pedida (hexadecimal, a de READ_ACL) ou remove a
// dele ('none') e relê: sai 0 só se o que ficou é exatamente o pedido.
const APPLY_ACL = [
  "import errno, os, sys",
  "want = sys.stdin.readline().strip()",
  "if want == 'none':",
  "    try:",
  "        os.removexattr(3, 'system.posix_acl_access')",
  "    except OSError as e:",
  "        if e.errno != errno.ENODATA:",
  "            sys.exit(1)",
  "else:",
  "    os.setxattr(3, 'system.posix_acl_access', bytes.fromhex(want))",
  "try:",
  "    got = os.getxattr(3, 'system.posix_acl_access').hex()",
  "except OSError as e:",
  "    if e.errno != errno.ENODATA:",
  "        sys.exit(1)",
  "    got = 'none'",
  "sys.exit(0 if got == want else 1)",
].join("\n");

const python = (script, fd, lines = []) => runSystemTool(PYTHON, ["-I", "-S", "-c", script], { fd, lines, env: {} });

// Mensagem fixa: nada do caminho, da ACL ou do conteúdo.
const unavailable = () => Object.assign(new Error("ACL da configuração indisponível"), { code: "config_access_unavailable" });

// macOS: se o arquivo do caminho — que precisa ser o do inode `ino` — tem ACE.
async function listsAce(file, ino) {
  if (/[\r\n]/.test(file)) throw unavailable();
  const { status, stdout } = await runSystemTool(LS, ["-ledi", "--", file], { env: {} });
  if (status !== 0) throw unavailable();
  const [head = "", ...aces] = stdout.split("\n").filter(Boolean);
  const entry = /^\s*(\d+) \S{10}([ @+%]) /.exec(head);
  if (entry === null || BigInt(entry[1]) !== ino || aces.some((line) => !/^ \d+: /.test(line))) throw unavailable();
  if (entry[2] === "+" && aces.length === 0) throw unavailable();
  return aces.length > 0;
}

// ACL do arquivo aberto em `handle` (`file`: o caminho pelo qual foi aberto),
// parte do acesso que o temporário recebe. Linux: a ACL de acesso em
// hexadecimal, ou `null` sem ACL estendida. macOS: `null` sem ACE; com ACE,
// recusa (não é copiada). Sem como saber, ou outra plataforma POSIX →
// `config_access_unavailable`.
export async function aclOf(handle, file) {
  if (process.platform === "linux") {
    const { status, stdout } = await python(READ_ACL, handle.fd);
    if (status === 0 && stdout === "none") return null;
    if (status === 0 && ACL_HEX.test(stdout)) return stdout;
    throw unavailable();
  }
  if (process.platform === "darwin") {
    const { ino } = await handle.stat({ bigint: true });
    if (await listsAce(await realpath(file), ino)) throw unavailable();
    return null;
  }
  throw unavailable();
}

// Deixa no temporário recém-criado em `handle` — ainda sem conteúdo, só com
// os bits de dono — exatamente a ACL `acl` (de `aclOf`) do original, antes do
// `fchmod` aos bits finais: com ACL, os bits de grupo são a máscara e
// abririam as entradas herdadas da ACL default da pasta. `sameGroup`: o grupo
// dono do temporário já é o do original. Linux: grava a ACL ou remove a
// herdada e confere; ACL estendida com outro grupo dono → recusa (a entrada
// `group::` valeria para esse grupo). macOS: temporário que herdou ACE da
// pasta → recusa. Falha → `config_access_unavailable`.
export async function matchAcl(handle, file, acl, sameGroup) {
  if (process.platform === "linux") {
    if (acl !== null && (!sameGroup || !ACL_HEX.test(acl))) throw unavailable();
    const { status } = await python(APPLY_ACL, handle.fd, [acl ?? "none"]);
    if (status !== 0) throw unavailable();
    return;
  }
  if (process.platform === "darwin") {
    const { ino } = await handle.stat({ bigint: true });
    if (await listsAce(file, ino)) throw unavailable();
    return;
  }
  throw unavailable();
}
