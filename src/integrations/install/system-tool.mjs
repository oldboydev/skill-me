import { spawn } from "node:child_process";

// Programa do sistema que lê ou aplica o acesso da configuração (PowerShell do
// Windows em windows-access.mjs; Python e `ls` do POSIX em posix-acl.mjs):
// caminho absoluto fixo, script fixo e dados pelo stdin, uma linha cada. A
// saída de erro é descartada e o stdout só volta a quem chamou, que o valida;
// nada dele é repassado ou registrado.

// Muito acima do custo medido por chamada (PowerShell ~0,2–0,3 s; Python e
// `ls`, dezenas de ms); só evita espera indefinida.
const TIMEOUT_MS = 20_000;

// Código de saída e stdout; `status` nulo quando o processo não pôde ser
// criado, foi bloqueado ou excedeu o prazo. `fd`: descritor aberto deste
// processo que o filho recebe como fd 3 — o objeto exato, não um caminho.
// `env`: ambiente do filho (padrão: o herdado).
export function runSystemTool(executable, args, { lines = [], fd = null, env } = {}) {
  return new Promise((resolve) => {
    const stdio = fd === null ? ["pipe", "pipe", "ignore"] : ["pipe", "pipe", "ignore", fd];
    const child = spawn(executable, args, { stdio, env, windowsHide: true });
    const chunks = [];
    let settled = false;
    const settle = (status) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ status, stdout: Buffer.concat(chunks).toString("utf8") });
    };
    const timer = setTimeout(() => child.kill(), TIMEOUT_MS);
    child.on("error", () => settle(null));
    child.on("close", (status) => settle(status));
    child.stdout?.on("data", (chunk) => chunks.push(chunk));
    child.stdin?.on("error", () => {});
    child.stdin?.end(lines.map((line) => `${line}\n`).join(""));
  });
}
