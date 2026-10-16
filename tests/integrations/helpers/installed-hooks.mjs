import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { INTEGRATIONS_CLI, parseReport } from "./cli.mjs";

function ownGroups(groups, isOwn) {
  return (Array.isArray(groups) ? groups : []).filter((group) => (group.hooks ?? []).some(isOwn));
}

// Handlers gravados pelo instalador em <target>/settings.json, por evento.
// Reconhecidos pela referência ao CLI desta árvore — o teste não confia na
// saída do próprio instalador para saber o que foi gravado.
export function readClaudeHandlers(target) {
  const settings = JSON.parse(readFileSync(path.join(target, "settings.json"), "utf8"));
  const handlers = {};
  for (const [event, groups] of Object.entries(settings.hooks ?? {})) {
    const own = ownGroups(groups, (handler) => Array.isArray(handler.args) && handler.args.includes(INTEGRATIONS_CLI));
    if (own.length > 0) handlers[event] = { count: own.length, group: own[0], handler: own[0].hooks[0] };
  }
  return handlers;
}

export function readCodexHandlers(target) {
  const file = JSON.parse(readFileSync(path.join(target, "hooks.json"), "utf8"));
  const handlers = {};
  for (const [event, groups] of Object.entries(file.hooks ?? {})) {
    const own = ownGroups(groups, (handler) => typeof handler.command === "string" && handler.command.includes(INTEGRATIONS_CLI));
    if (own.length > 0) handlers[event] = { count: own.length, group: own[0], handler: own[0].hooks[0] };
  }
  return handlers;
}

// `destroyChannel` fecha o lado de leitura de um canal logo após o spawn:
// consumidor que desconecta antes de o hook escrever o relatório.
function collect(child, { stdinText, keepStdinOpenMs, extraFd, destroyChannel }) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let fd3 = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.stderr.on("error", () => {});
    if (extraFd) {
      child.stdio[3].on("data", (chunk) => (fd3 += chunk));
      child.stdio[3].on("error", () => {});
    }
    if (destroyChannel !== undefined) child.stdio[destroyChannel].destroy();
    child.stdin.on("error", () => {});
    if (stdinText !== undefined) child.stdin.write(stdinText);
    if (keepStdinOpenMs === undefined) child.stdin.end();
    const started = Date.now();
    child.on("close", (status, signal) => {
      child.stdin.destroy();
      resolve({ status, signal, stdout, stderr, fd3, elapsedMs: Date.now() - started });
    });
  });
}

// Forma exec do Claude (code.claude.com/docs/en/hooks, "Exec form and shell
// form"): com `args`, `command` é iniciado diretamente, sem shell. O payload
// vai no stdin; o relatório de fixture sai pelo fd 3 (Node → Node direto).
export function runClaudeHandler(handler, payload, { env, cwd, stdinText, keepStdinOpenMs, reportFd = 3, destroyChannel } = {}) {
  const child = spawn(handler.command, handler.args, {
    cwd,
    env: reportFd === null ? env : { ...env, SKILL_ME_OBSERVER_REPORT_FD: String(reportFd) },
    stdio: ["pipe", "pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  return collect(child, {
    stdinText: stdinText ?? (payload === undefined ? undefined : JSON.stringify(payload)),
    keepStdinOpenMs,
    extraFd: true,
    destroyChannel,
  }).then((result) => ({ ...result, report: parseReport(reportFd === 2 ? result.stderr : result.fd3) }));
}

// Codex 0.162.1 (hooks/src/engine/command_runner.rs:384-437): Windows
// `cmd.exe /C "<linha>"` com a linha crua entre aspas; POSIX `$SHELL -lc
// <linha>`. O fd 3 não atravessa o cmd.exe, então o relatório sai pelo fd 2.
export function runCodexHandler(handler, payload, { env, cwd, stdinText, keepStdinOpenMs, reportFd = 2, destroyChannel } = {}) {
  const childEnv = reportFd === null ? env : { ...env, SKILL_ME_OBSERVER_REPORT_FD: String(reportFd) };
  const child =
    process.platform === "win32"
      ? spawn(env.ComSpec ?? env.COMSPEC ?? "cmd.exe", ["/C", `"${handler.command}"`], {
          cwd,
          env: childEnv,
          windowsVerbatimArguments: true,
          stdio: ["pipe", "pipe", "pipe", "pipe"],
          windowsHide: true,
        })
      : spawn(env.SHELL ?? "/bin/sh", ["-lc", handler.command], {
          cwd,
          env: childEnv,
          stdio: ["pipe", "pipe", "pipe", "pipe"],
        });
  return collect(child, {
    stdinText: stdinText ?? (payload === undefined ? undefined : JSON.stringify(payload)),
    keepStdinOpenMs,
    extraFd: true,
    destroyChannel,
  }).then((result) => ({ ...result, report: parseReport(reportFd === 3 ? result.fd3 : result.stderr) }));
}
