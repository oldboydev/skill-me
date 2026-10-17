// DACL de arquivos sintéticos nas provas Windows, definida e lida pelo
// PowerShell do Windows só com tipos .NET — sem cmdlets: com um PSModulePath
// herdado do PowerShell 7, o Windows PowerShell não carrega o módulo de
// Get-Acl/Set-Acl. Independente do produto: a leitura decompõe a DACL em ACEs
// (`RawSecurityDescriptor`) e as provas comparam acessos por SID, não a SDDL
// que o instalador transmite. O SID de quem roda os testes é trocado dentro do
// PowerShell por "usuário do teste"; SIDs conhecidos têm nome e os demais, um
// prefixo de hash — nenhum SID ou nome de conta chega às saídas das provas.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

const POWERSHELL = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");

// Scripts fixos sem aspas duplas; caminhos e DACLs chegam pelo stdin.
const PRELUDE = [
  "$ErrorActionPreference='Stop'",
  "$r=[IO.StreamReader]::new([Console]::OpenStandardInput(),[Text.UTF8Encoding]::new($false))",
  "$access=[Security.AccessControl.AccessControlSections]::Access",
  "$me=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value",
];
const SET_DACL = [
  ...PRELUDE,
  "$p=$r.ReadLine(); $d=$r.ReadLine().Replace('{usuario}',$me)",
  "if ([IO.Directory]::Exists($p)) { $s=[Security.AccessControl.DirectorySecurity]::new(); $s.SetSecurityDescriptorSddlForm($d,$access); [IO.Directory]::SetAccessControl($p,$s) }",
  "else { $s=[Security.AccessControl.FileSecurity]::new(); $s.SetSecurityDescriptorSddlForm($d,$access); [IO.File]::SetAccessControl($p,$s) }",
].join("\n");
// Uma linha `P:<0|1>` (DACL protegida) e uma por ACE, na ordem da DACL:
// `<AccessAllowed|AccessDenied>;<SID ou usuario>;<máscara>;<1 se herdada>`;
// `?` para ACE que não é comum (objeto, condicional).
const READ_ACES = [
  ...PRELUDE,
  "$mode=$r.ReadLine(); $arg=$r.ReadLine()",
  "if ($mode -eq 'file') { $sddl=[IO.File]::GetAccessControl($arg,$access).GetSecurityDescriptorSddlForm($access) } else { $sddl=$arg }",
  "$sd=[Security.AccessControl.RawSecurityDescriptor]::new($sddl)",
  "$out=[Text.StringBuilder]::new()",
  "[void]$out.Append('P:').Append([int](($sd.ControlFlags -band [Security.AccessControl.ControlFlags]::DiscretionaryAclProtected) -ne 0)).Append([char]10)",
  "foreach ($ace in $sd.DiscretionaryAcl) {",
  "  if ($ace -isnot [Security.AccessControl.CommonAce]) { [void]$out.Append('?').Append([char]10); continue }",
  "  $sid=$ace.SecurityIdentifier.Value; if ($sid -eq $me) { $sid='usuario' }",
  "  [void]$out.Append([string]$ace.AceQualifier).Append(';').Append($sid).Append(';').Append($ace.AccessMask).Append(';').Append([int]$ace.IsInherited).Append([char]10)",
  "}",
  "[Console]::Out.Write($out.ToString())",
].join("\n");

function powershell(script, lines) {
  const result = spawnSync(POWERSHELL, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script], {
    input: lines.map((line) => `${line}\n`).join(""),
    encoding: "utf8",
    windowsHide: true,
    timeout: 60_000,
  });
  if (result.status !== 0) throw new Error(`PowerShell da prova terminou com ${result.status ?? result.signal}`);
  return result.stdout;
}

const KNOWN_SIDS = {
  usuario: "usuário do teste",
  "S-1-5-18": "SYSTEM",
  "S-1-5-32-544": "Administradores",
  "S-1-5-32-545": "Usuários",
  "S-1-5-11": "Usuários autenticados",
  "S-1-1-0": "Todos",
};
const recipient = (sid) => KNOWN_SIDS[sid] ?? `outro SID ${createHash("sha256").update(sid).digest("hex").slice(0, 8)}`;
const RIGHTS = { 0x1f01ff: "controle total", 0x1301bf: "modificação", 0x1200a9: "leitura e execução", 0x120089: "leitura" };
const rightsLabel = (mask) => RIGHTS[mask] ?? `0x${mask.toString(16)}`;

function parseAces(text) {
  const [head, ...lines] = text.split("\n").filter(Boolean);
  return {
    protected: head === "P:1",
    aces: lines.map((line) => {
      if (line === "?") return { type: "outra" };
      const [type, sid, mask, inherited] = line.split(";");
      return { type: type === "AccessAllowed" ? "permite" : type === "AccessDenied" ? "nega" : type, who: recipient(sid), mask: Number(mask), inherited: inherited === "1" };
    }),
  };
}

// `template` é SDDL de DACL em que `{usuario}` vira o SID de quem roda os testes.
export function setDacl(file, template) {
  powershell(SET_DACL, [file, template]);
}

// DACL de um arquivo/diretório, ou de uma SDDL de DACL: protegida e ACEs em ordem.
export const readAces = (file) => parseAces(powershell(READ_ACES, ["file", file]));
export const sddlAces = (sddl) => parseAces(powershell(READ_ACES, ["sddl", sddl]));

// Acesso efetivo por SID, para DACL só com ACEs de permissão: quem tem um SID
// recebe a união das máscaras das ACEs dele (e das dos outros SIDs que tiver);
// comparar SID a SID cobre cada classe de destinatário, como
// helpers/posix-access.mjs faz com as classes POSIX. Com ACE de negação a
// ordem decidiria o resultado — o modelo não se aplica e a prova falha em vez
// de concluir errado.
function maskBySid(dacl) {
  const masks = {};
  for (const ace of dacl.aces) {
    if (ace.type !== "permite") throw new Error(`modelo de acesso só para DACL com permissões; encontrada ACE ${ace.type}`);
    masks[ace.who] = (masks[ace.who] ?? 0) | ace.mask;
  }
  return masks;
}

export function grantsOf(dacl) {
  const masks = maskBySid(dacl);
  return {
    protegida: dacl.protected,
    acessos: Object.fromEntries(Object.keys(masks).sort().map((who) => [who, rightsLabel(masks[who])])),
    herdadas: dacl.aces.filter((ace) => ace.inherited).length,
  };
}

// Destinatários (SIDs rotulados) que ganham algum direito de `before` para
// `after`; vazio = nenhuma ampliação.
export function widenedSids(before, after) {
  const was = maskBySid(before);
  const now = maskBySid(after);
  return Object.keys(now)
    .filter((who) => (now[who] & ~(was[who] ?? 0)) !== 0)
    .sort();
}
