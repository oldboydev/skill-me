import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import { resolveAgents } from "../doctor/agent-resolution.mjs";
import { createProductionFsAdapter } from "../doctor/fs-adapter.mjs";
import { codexExecDraft, processExitDraft } from "./adapters/codex-exec.mjs";
import { STREAM_MAX_LINE_BYTES, createLineReader } from "./line-reader.mjs";
import { REPORT_DEADLINE_MS, createObservation } from "./observation.mjs";
import { captureDeliveryFor } from "./traces/binding.mjs";

// Modo supervisionado: `codex exec --json` como processo filho, sem shell.
// O stdout do wrapper é o JSONL nativo do Codex, byte a byte (inclusive itens
// de raciocínio que o Codex emitir) — saída do agente, não telemetria do
// debugger. Em paralelo, o mesmo fluxo passa pela fronteira até um receptor em
// memória que morre com o processo. Mesmo padrão de sinais/saída do launcher
// oficial `@openai/codex/bin/codex.js` 0.162.1.

const JSON_FLAGS = new Set(["--json", "--experimental-json"]);
const FORWARDED_SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"];
const SHELL_ONLY = /\.(cmd|bat)$/i;
const SCRIPT = /\.(mjs|cjs|js)$/i;
// Relatório não drenado: o wrapper sai em ≤ REPORT_DEADLINE_MS depois do fim do
// filho (C38). O prazo conta do `close` do filho e reserva o que o timer não
// cobre — o intervalo entre o fim real do filho e o `close`, a granularidade do
// timer e o encerramento do próprio processo. Sem reserva, isso somou 23–63 ms
// no Windows (inclusive com CPU saturada) e 4–14 ms no WSL; a calibração está
// em .checks/issue-4-integracoes.build.md.
const EXIT_RESERVE_MS = 200;

// `exec`, depois `--json` (se ainda não estiver entre as flags, antes de um
// `--`), depois os argumentos do usuário intactos. `--json` vem logo após
// `exec` porque depois de um `--` ele viraria texto do prompt.
export function childArgv(execArgs) {
  const separator = execArgs.indexOf("--");
  const own = separator === -1 ? execArgs : execArgs.slice(0, separator);
  return own.some((arg) => JSON_FLAGS.has(arg)) ? ["exec", ...execArgs] : ["exec", "--json", ...execArgs];
}

function fail(code, message) {
  process.stderr.write(`skill-me integrations run: ${message}\n`);
  process.exitCode = code;
}

async function resolveLaunch(codexEntry) {
  if (codexEntry !== undefined) {
    const entry = path.resolve(codexEntry);
    if (SHELL_ONLY.test(entry)) return { usage: true };
    // Para uma entrada .js o filho seria o node, que iniciaria e sairia com 1:
    // a ausência do arquivo precisa virar falha de início (127) antes do spawn.
    const isFile = await stat(entry).then((s) => s.isFile(), () => false);
    if (!isFile) return { notFound: "ENOENT" };
    return SCRIPT.test(entry) ? { command: process.execPath, prefix: [entry] } : { command: entry, prefix: [] };
  }
  const pathDirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const agents = await resolveAgents({
    pathDirs,
    platform: process.platform,
    env: process.env,
    cwd: process.cwd(),
    fs: createProductionFsAdapter(),
  });
  const codex = agents.find((agent) => agent.id === "codex");
  if (!codex || codex.presence !== "present" || !codex.path) return { notFound: "codex_not_found" };
  if (SHELL_ONLY.test(codex.path)) return { notFound: "launcher_requires_shell" };
  return { command: codex.path, prefix: [] };
}

function createExecObserver(observation) {
  const reader = createLineReader({
    maxLineBytes: STREAM_MAX_LINE_BYTES,
    onLine(buffer) {
      let event;
      try {
        event = JSON.parse(buffer.toString("utf8"));
      } catch {
        return observation.count("invalidJson");
      }
      observation.submit(codexExecDraft(event), event);
    },
    onOversize: () => observation.count("oversizeLine"),
    onPartialTrailing: () => observation.count("partialTrailingLine"),
  });
  return reader;
}

export async function runSupervisedCodex({ codexEntry, execArgs }) {
  const launch = await resolveLaunch(codexEntry);
  if (launch.usage) return fail(2, "uso inválido [unsupported_entry]: .cmd/.bat exigiria shell; aponte --codex-entry para bin/codex.js");
  if (launch.notFound) {
    const hint = codexEntry === undefined ? "; informe --codex-entry com o caminho de @openai/codex/bin/codex.js" : "";
    return fail(127, `não foi possível iniciar o Codex [${launch.notFound}]${hint}`);
  }

  // Stderr do wrapper pertence ao filho: o relatório de fixture só aceita fd >= 3.
  // Vinculado a uma captura, a abre antes de iniciar o filho (até
  // DELIVERY_DEADLINE_MS); o ambiente do filho continua o recebido, inclusive
  // o vínculo, que os hooks do próprio Codex usam para os eventos deles.
  const delivery = await captureDeliveryFor({ env: process.env, agent: "codex-exec" });
  const observation = createObservation({ env: process.env, allowStderrReport: false, delivery });
  await delivery?.open();
  const reader = createExecObserver(observation);

  const child = spawn(launch.command, [...launch.prefix, ...childArgv(execArgs)], {
    stdio: ["inherit", "pipe", "inherit"],
    env: process.env,
    windowsHide: false,
  });

  // Consumidor do stdout que desconecta (EPIPE): o repasse para, mas o filho
  // continua sendo drenado — um `drain` que nunca chega não pode travá-lo.
  let stdoutBroken = false;
  process.stdout.on("error", () => {
    stdoutBroken = true;
    child.stdout.resume();
  });

  const forward = (signal) => {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal);
  };
  for (const signal of FORWARDED_SIGNALS) process.on(signal, forward);

  child.stdout.on("data", (chunk) => {
    // Observação nunca pode afetar o repasse nem o código do filho.
    try {
      reader.push(chunk);
    } catch {
      observation.count("invalidInput");
    }
    if (stdoutBroken) return;
    if (!process.stdout.write(chunk)) {
      child.stdout.pause();
      process.stdout.once("drain", () => child.stdout.resume());
    }
  });

  const outcome = await new Promise((resolve) => {
    child.once("error", (error) => resolve({ spawnError: error }));
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  const childEndedAt = performance.now();
  for (const signal of FORWARDED_SIGNALS) process.removeListener(signal, forward);

  if (outcome.spawnError) {
    const code = outcome.spawnError.code === "ENOENT" ? 127 : 126;
    return fail(code, `não foi possível iniciar o Codex [${outcome.spawnError.code ?? "spawn_error"}]`);
  }

  reader.end();
  observation.submit(processExitDraft({ code: outcome.code, signal: outcome.signal }));
  await observation.flush({ deadlineAt: childEndedAt + REPORT_DEADLINE_MS - EXIT_RESERVE_MS });
  // No POSIX a escrita do stdout em pipe é assíncrona (Node 24, "A note on
  // process I/O"; no Windows é síncrona): bytes ainda na fila se perderiam com
  // process.exit. Um write vazio com callback só conclui depois dos anteriores;
  // esperar `drain` não serve, porque ele só é emitido após um write que
  // devolveu false. A saída é explícita porque um relatório que estourou o
  // prazo deixaria um handle aberto segurando o event loop.
  if (!stdoutBroken) {
    await new Promise((resolve) => {
      process.stdout.once("error", resolve);
      process.stdout.write("", () => resolve());
    });
  }

  if (outcome.signal) {
    // Reemite o mesmo sinal sobre si, como o launcher oficial: quem chamou
    // observa a terminação por sinal, nunca um código inventado para ela.
    process.kill(process.pid, outcome.signal);
    return;
  }
  process.exit(outcome.code ?? 1);
}
