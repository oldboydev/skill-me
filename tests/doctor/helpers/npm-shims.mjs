// Templates dos shims que o npm (cmd-shim) realmente gera, reproduzidos a
// partir dos arquivos existentes nesta máquina em 13/10/2026: o shim global
// `codex.cmd`/`codex` do prefixo npm (`%dp0%\node_modules\@openai\codex\...`)
// e os shims locais de `node_modules/.bin/` deste repositório
// (`%dp0%\..\<pacote>\...`). Só o caminho relativo ao arquivo de entrada do
// pacote muda entre instalação global e local; o restante do texto é o mesmo,
// inclusive as referências a `node`/`node.exe` que não apontam para pacote.
// `extraLine` permite inserir uma linha de sentinela de execução (provas de
// C4), sem alterar a linha que vincula o shim ao pacote.

export const CODEX_GLOBAL_WINDOWS_TARGET = "node_modules\\@openai\\codex\\bin\\codex.js";
export const CODEX_LOCAL_WINDOWS_TARGET = "..\\@openai\\codex\\bin\\codex.js";
export const CODEX_GLOBAL_SH_TARGET = "node_modules/@openai/codex/bin/codex.js";
export const CODEX_LOCAL_SH_TARGET = "../@openai/codex/bin/codex.js";

export function npmCmdShim(windowsTarget, { extraLine = "" } = {}) {
  return (
    "@ECHO off\r\n" +
    "GOTO start\r\n" +
    ":find_dp0\r\n" +
    "SET dp0=%~dp0\r\n" +
    "EXIT /b\r\n" +
    ":start\r\n" +
    "SETLOCAL\r\n" +
    "CALL :find_dp0\r\n" +
    extraLine +
    "\r\n" +
    'IF EXIST "%dp0%\\node.exe" (\r\n' +
    '  SET "_prog=%dp0%\\node.exe"\r\n' +
    ") ELSE (\r\n" +
    '  SET "_prog=node"\r\n' +
    "  SET PATHEXT=%PATHEXT:;.JS;=;%\r\n" +
    ")\r\n" +
    "\r\n" +
    `endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\${windowsTarget}" %*\r\n`
  );
}

export function npmShShim(posixTarget, { extraLine = "" } = {}) {
  return (
    "#!/bin/sh\n" +
    `basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")\n` +
    "\n" +
    "case `uname` in\n" +
    "    *CYGWIN*|*MINGW*|*MSYS*)\n" +
    "        if command -v cygpath > /dev/null 2>&1; then\n" +
    '            basedir=`cygpath -w "$basedir"`\n' +
    "        fi\n" +
    "    ;;\n" +
    "esac\n" +
    extraLine +
    "\n" +
    'if [ -x "$basedir/node" ]; then\n' +
    `  exec "$basedir/node"  "$basedir/${posixTarget}" "$@"\n` +
    "else \n" +
    `  exec node  "$basedir/${posixTarget}" "$@"\n` +
    "fi\n"
  );
}
