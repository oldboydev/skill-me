import path from "node:path";
import { runSystemTool } from "./system-tool.mjs";

// DACL de arquivos no Windows, para que a reescrita da configuração não amplie
// o acesso do original (revisão formal round 4; forma e alternativas na linha
// de Landing correspondente em .checks/issue-4-integracoes.md). O Node não
// expõe DACL: o mecanismo é o PowerShell do Windows (5.1, componente do
// sistema) só com tipos .NET — com um PSModulePath herdado do PowerShell 7, o
// Windows PowerShell não carrega o módulo de Get-Acl/Set-Acl (constatado no
// build). Os scripts são fixos e sem aspas duplas; caminho, DACL e conteúdo
// chegam pelo stdin, uma linha cada (caminho Windows e SDDL não têm quebra de
// linha; o conteúdo vai em base64): com `-Command`, argumentos extras virariam
// texto do script. A saída do PowerShell nunca é repassada nem registrada.

const POWERSHELL = process.env.SystemRoot ? path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : null;
const DACL_SDDL = /^D:[^\r\n]*$/;

// HResult do erro mais interno: 0x80070002/0x80070003 (arquivo ou pasta
// ausente) → 10; 0x80070050 (arquivo já existe) → 11; o resto → 1.
const NOT_FOUND = 10;
const EXISTS = 11;
const script = (...body) =>
  [
    "$ErrorActionPreference='Stop'",
    "try {",
    "$access=[Security.AccessControl.AccessControlSections]::Access",
    "$in=[IO.StreamReader]::new([Console]::OpenStandardInput(),[Text.UTF8Encoding]::new($false))",
    ...body,
    "exit 0",
    "} catch { $e=$_.Exception; while ($e.InnerException) { $e=$e.InnerException }",
    `if ($e.HResult -eq -2147024894 -or $e.HResult -eq -2147024893) { exit ${NOT_FOUND} }`,
    `if ($e.HResult -eq -2147024816) { exit ${EXISTS} }`,
    "exit 1 }",
  ].join("\n");

const READ_DACL = script("$p=$in.ReadLine()", "[Console]::Out.Write([IO.File]::GetAccessControl($p,$access).GetSecurityDescriptorSddlForm($access))");

// A DACL recebida vira a do arquivo no próprio CreateFile (FileStream com
// FileSecurity): as mesmas ACEs, na mesma ordem, com a flag de herança limpa
// (0xEF = todas as AceFlags menos Inherited) e a DACL protegida — a próxima
// propagação de herança da pasta não as recalcula. O conteúdo é escrito e
// descarregado pelo handle da criação (FileShare.None); tudo é lido do stdin
// antes de criar, para que entrada incompleta não crie nada.
const CREATE_WITH_DACL = script(
  "$p=$in.ReadLine(); $d=$in.ReadLine(); $bytes=[Convert]::FromBase64String($in.ReadLine())",
  "$sd=[Security.AccessControl.RawSecurityDescriptor]::new($d)",
  "foreach ($ace in $sd.DiscretionaryAcl) { $ace.AceFlags=[Security.AccessControl.AceFlags]([int]$ace.AceFlags -band 0xEF) }",
  "$sd.SetFlags($sd.ControlFlags -bor [Security.AccessControl.ControlFlags]::DiscretionaryAclProtected)",
  "$security=[Security.AccessControl.FileSecurity]::new()",
  "$security.SetSecurityDescriptorSddlForm($sd.GetSddlForm($access),$access)",
  "$file=[IO.FileStream]::new($p,[IO.FileMode]::CreateNew,[Security.AccessControl.FileSystemRights]::Write,[IO.FileShare]::None,4096,[IO.FileOptions]::None,$security)",
  "try { $file.Write($bytes,0,$bytes.Length); $file.Flush($true) } finally { $file.Dispose() }",
);

// Código de saída e stdout (system-tool.mjs); `status` nulo também sem
// %SystemRoot%.
function runPowerShell(source, lines) {
  if (POWERSHELL === null) return Promise.resolve({ status: null, stdout: "" });
  return runSystemTool(POWERSHELL, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", source], { lines });
}

// Mensagens fixas: nada do caminho, da DACL ou do conteúdo.
function failure(status) {
  if (status === NOT_FOUND) return Object.assign(new Error("arquivo ausente"), { code: "ENOENT" });
  if (status === EXISTS) return Object.assign(new Error("arquivo já existe"), { code: "EEXIST" });
  return unavailable();
}
const unavailable = () => Object.assign(new Error("DACL da configuração indisponível no Windows"), { code: "config_access_unavailable" });
const fitsLine = (text) => !/[\r\n]/.test(text);

// SDDL da DACL do arquivo (seção Access), seguindo link como o `stat`.
export async function readDacl(file) {
  if (!fitsLine(file)) throw unavailable();
  const { status, stdout } = await runPowerShell(READ_DACL, [file]);
  if (status === 0 && DACL_SDDL.test(stdout)) return stdout;
  throw failure(status);
}

// Cria `file` (falha com EEXIST se o caminho existe) já com `dacl` — vinda de
// `readDacl` — e grava `data` nele.
export async function createWithDacl(file, data, dacl) {
  if (!fitsLine(file) || typeof dacl !== "string" || !DACL_SDDL.test(dacl)) throw unavailable();
  const { status } = await runPowerShell(CREATE_WITH_DACL, [file, dacl, Buffer.from(data, "utf8").toString("base64")]);
  if (status !== 0) throw failure(status);
}
