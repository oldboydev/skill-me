#!/usr/bin/env node
import { readSync, writeSync } from "node:fs";
import { isatty } from "node:tty";
import { runSkillMe } from "./command.mjs";

// Executável `skill-me` (issue #25, `bin` do package.json, disponibilizado por
// `npm link`). Liga o comando ao processo real: escritas síncronas — nada fica
// na fila de um pipe quando o launcher reemite o sinal do agente — e respostas
// do primeiro uso lidas direto do fd 0, sem um stream que continue lendo o
// terminal depois que o agente o herda (linha "Primeiro uso" do Landing).

function write(fd, text) {
  const bytes = Buffer.from(text, "utf8");
  let offset = 0;
  while (offset < bytes.length) {
    try {
      offset += writeSync(fd, bytes, offset);
    } catch (error) {
      // Terminal fechado (EIO/EPIPE): o resumo se perde, a execução não.
      if (error.code !== "EAGAIN") return;
    }
  }
}

const pause = new Int32Array(new SharedArrayBuffer(4));

// Uma linha do fd 0 sem o fim de linha (\n ou \r\n), ou null no EOF.
function readLine() {
  const bytes = [];
  const one = Buffer.alloc(1);
  for (;;) {
    let read;
    try {
      read = readSync(0, one, 0, 1, null);
    } catch (error) {
      if (error.code === "EAGAIN") {
        Atomics.wait(pause, 0, 0, 10);
        continue;
      }
      if (error.code === "EOF") read = 0;
      else throw error;
    }
    if (read === 0) return bytes.length === 0 ? null : Buffer.from(bytes).toString("utf8").replace(/\r$/, "");
    if (one[0] === 0x0a) return Buffer.from(bytes).toString("utf8").replace(/\r$/, "");
    bytes.push(one[0]);
  }
}

const result = await runSkillMe({
  argv: process.argv.slice(2),
  deps: {
    writeOut: (text) => write(1, text),
    writeErr: (text) => write(2, text),
    terminal: isatty(0) && isatty(2),
    readLine,
  },
});

// O agente terminou por sinal: no POSIX o launcher termina pelo mesmo sinal,
// como o launcher oficial do Codex; no Windows, pelo código.
if (result.signal && process.platform !== "win32") process.kill(process.pid, result.signal);
else process.exitCode = result.exitCode;
