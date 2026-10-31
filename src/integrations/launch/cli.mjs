#!/usr/bin/env node
import { readSync, writeSync } from "node:fs";
import { isatty } from "node:tty";
import { runSkillMe } from "./command.mjs";

// Executável `skill-me` (issue #25, `bin` do package.json, disponibilizado por
// `npm link`). Liga o comando ao processo real: escritas síncronas — nada fica
// na fila de um pipe quando o launcher reemite o sinal do agente — e respostas
// do primeiro uso lidas direto do fd 0, sem um stream que continue lendo o
// terminal depois que o agente o herda (linha "Primeiro uso" do Landing). No
// console do Windows, as duas passam pelos streams tty do Node (linha "Console
// do Windows").

const WINDOWS_CONSOLE = (fd) => process.platform === "win32" && isatty(fd);

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

// O console do Windows lê os bytes de uma escrita no fd pela página de código
// dele (`prepara├º├úo`); o stream tty escreve o texto por `WriteConsoleW`. O
// stream só é criado nesse caso: o de um pipe mudaria o fd que o agente herda.
function writerFor(fd, streamOf) {
  if (!WINDOWS_CONSOLE(fd)) return (text) => write(fd, text);
  const stream = streamOf();
  stream.on("error", () => {});
  return (text) => {
    stream.write(text);
  };
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

// Console do Windows: a leitura síncrona chega na página de código OEM (um
// caminho com acento virava outro). O stream tty lê por `ReadConsoleW`; depois
// de cada linha ele para — o libuv cancela a leitura pendente do console — e sai
// do laço de eventos, para o agente herdar o terminal sem disputa. Linhas a mais
// de uma leitura ficam para a pergunta seguinte.
let pending = "";
let ended = false;

function readConsoleLine() {
  const stdin = process.stdin;
  const take = () => {
    const end = pending.indexOf("\n");
    if (end === -1) return undefined;
    const line = pending.slice(0, end).replace(/\r$/, "");
    pending = pending.slice(end + 1);
    return line;
  };
  const ready = take();
  if (ready !== undefined) return Promise.resolve(ready);
  if (ended) return Promise.resolve(null);
  return new Promise((resolve) => {
    const finish = (value) => {
      stdin.removeListener("data", onData);
      stdin.removeListener("end", onEnd);
      stdin.pause();
      stdin.unref();
      resolve(value);
    };
    const onData = (chunk) => {
      pending += chunk;
      const line = take();
      if (line !== undefined) finish(line);
    };
    const onEnd = () => {
      ended = true;
      const rest = pending;
      pending = "";
      finish(rest === "" ? null : rest.replace(/\r$/, ""));
    };
    stdin.setEncoding("utf8");
    stdin.ref();
    stdin.on("data", onData);
    stdin.on("end", onEnd);
    stdin.resume();
  });
}

const result = await runSkillMe({
  argv: process.argv.slice(2),
  deps: {
    writeOut: writerFor(1, () => process.stdout),
    writeErr: writerFor(2, () => process.stderr),
    terminal: isatty(0) && isatty(2),
    readLine: WINDOWS_CONSOLE(0) ? readConsoleLine : readLine,
  },
});

// O agente terminou por sinal: no POSIX o launcher termina pelo mesmo sinal,
// como o launcher oficial do Codex; no Windows, pelo código.
if (result.signal && process.platform !== "win32") process.kill(process.pid, result.signal);
else process.exitCode = result.exitCode;
