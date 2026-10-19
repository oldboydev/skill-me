import { isPrivacyCommand, parsePrivacyArgs, PRIVACY_HELP_TEXT, PrivacyUsageError } from "./args.mjs";
import { correlateTrace } from "../correlation/timeline.mjs";
import { replayCapture } from "../traces/replay.mjs";
import { followCapture, followLine } from "./follow.mjs";
import { createStoreIo } from "./fs.mjs";
import { ingestCapture } from "./ingest.mjs";
import { changeCaptureState, deleteCapture, exportCapture, listCaptures, pruneCaptures, readCaptureStatus, startCapture, StoreError } from "./store.mjs";

// Vocabulário fechado de falhas → código de saída (crit. 16). Nenhuma
// resposta carrega caminho, valor de flag, mensagem de exceção ou stack.
const EXIT_BY_CODE = {
  root_not_found: 3,
  root_not_directory: 3,
  store_invalid: 3,
  capture_not_found: 3,
  capture_invalid: 3,
  capture_not_active: 3,
  capture_active: 3,
  invalid_transition: 3,
  lock_present: 4,
  link_refused: 4,
  foreign_entry: 4,
  root_changed: 4,
  io_failure: 5,
  partial_delete: 5,
};

// Falha parcial visível: o mais grave decide o código, e a lista de cada
// captura que falhou continua na resposta.
const worstOf = (failed) => failed.reduce((a, b) => (EXIT_BY_CODE[b.code] > EXIT_BY_CODE[a.code] ? b : a));

const ok = (command, fields) => ({ exitCode: 0, body: { schemaVersion: 1, command, status: "ok", ...fields } });
const failure = (command, code, exitCode, fields = {}) => ({
  exitCode,
  body: { schemaVersion: 1, command, status: "error", ...fields, error: { code } },
});

async function execute(command, args, { nowMs, io, stdin }) {
  const { root, capture: id } = args;
  switch (command) {
    case "start":
      return ok(command, { capture: await startCapture({ root, content: args.content, retentionDays: args.retentionDays, nowMs, io }) });
    case "ingest":
      return ok(command, { capture: id, batch: await ingestCapture({ root, id, agent: args.agent, stdin, io }) });
    case "export":
      return ok(command, await exportCapture({ root, id, io }));
    case "timeline":
      return ok(command, await replayCapture({ root, id, consumer: correlateTrace, io }));
    case "stop":
    case "disable":
      return ok(command, await changeCaptureState({ root, id, action: command, nowMs, io }));
    case "status":
      return ok(command, { capture: await readCaptureStatus({ root, id, io }) });
    case "delete":
      return ok(command, { capture: id, ...(await deleteCapture({ root, id, apply: args.apply, io })) });
    case "prune": {
      const result = await pruneCaptures({ root, apply: args.apply, nowMs, io });
      const fields = { applied: args.apply, ...result };
      if (result.failed.length === 0) return ok(command, fields);
      const worst = worstOf(result.failed);
      return failure(command, worst.code, EXIT_BY_CODE[worst.code], fields);
    }
    case "list": {
      const { captures, nextAfter, failed } = await listCaptures({ root, after: args.after, io });
      if (failed.length === 0) return ok(command, { captures, nextAfter });
      const worst = worstOf(failed);
      return failure(command, worst.code, EXIT_BY_CODE[worst.code], { failed });
    }
  }
}

const exitOf = (code) => (Object.hasOwn(EXIT_BY_CODE, code) ? EXIT_BY_CODE[code] : EXIT_BY_CODE.io_failure);

// `follow` escreve as próprias linhas, inclusive a de uso inválido.
async function runFollow(tokens, { io, write }) {
  let args;
  try {
    args = parsePrivacyArgs("follow", tokens);
  } catch (error) {
    if (!(error instanceof PrivacyUsageError)) throw error;
    await write(followLine(1, "error", { error: { code: error.code } }));
    return { exitCode: 2 };
  }
  const code = await followCapture({ root: args.root, id: args.capture, io, write });
  return { exitCode: code === null ? 0 : exitOf(code) };
}

// Relógio só injetável em processo (provas de retenção); o CLI nunca o lê de
// flag ou variável de ambiente. Só `ingest` lê `stdin`; só `follow` usa
// `write` (texto → Promise<boolean>, false quando a saída fechou) e devolve
// apenas o código, sem `body`.
export async function runPrivacyCommand({ argv, now = Date.now, io = createStoreIo(), stdin, write }) {
  const [command, ...tokens] = argv;
  if (command === "--help" || command === "help" || (isPrivacyCommand(command) && tokens.includes("--help"))) {
    return { exitCode: 0, help: PRIVACY_HELP_TEXT };
  }
  if (!isPrivacyCommand(command)) return failure(null, "unknown_command", 2);
  if (command === "follow") return runFollow(tokens, { io, write });
  try {
    return await execute(command, parsePrivacyArgs(command, tokens), { nowMs: now(), io, stdin });
  } catch (error) {
    if (error instanceof PrivacyUsageError) return failure(command, error.code, 2);
    const code = error instanceof StoreError && Object.hasOwn(EXIT_BY_CODE, error.code) ? error.code : "io_failure";
    return failure(command, code, EXIT_BY_CODE[code]);
  }
}
