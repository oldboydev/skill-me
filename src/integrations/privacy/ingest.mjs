import { claudeHookDraft } from "../adapters/claude.mjs";
import { codexExecDraft } from "../adapters/codex-exec.mjs";
import { codexHookDraft } from "../adapters/codex-hooks.mjs";
import { hermesDraft } from "../adapters/hermes.mjs";
import { STREAM_MAX_LINE_BYTES, createLineReader } from "../line-reader.mjs";
import { admitLines } from "./lifecycle.mjs";
import { applyPolicy } from "./policy.mjs";
import { appendRecords, openCaptureForIngest } from "./store.mjs";

// `privacy ingest`: entradas nativas NDJSON explícitas no stdin → adaptador →
// política → `appendRecords`. Não executa agente, não lê arquivo por caminho e
// não guarda pré-imagem bruta: cada linha vira registro sanitizado ou só
// contagem. Fases e classificação no Landing de .checks/issue-5-privacidade.md.

export const INGEST_AGENTS = Object.freeze({ claude: claudeHookDraft, "codex-hooks": codexHookDraft, "codex-exec": codexExecDraft, hermes: hermesDraft });

const increment = (counts, reason, by = 1) => {
  counts[reason] = (counts[reason] ?? 0) + by;
};

// Decisão por linha, sem E/S: o lote acumulado e os contadores do comando.
export function createIngestBatch({ agent, key, content, usage }) {
  const adapter = INGEST_AGENTS[agent];
  const records = [];
  const malformed = {};
  const dropped = {};
  const contentOmitted = {};
  let current = { ...usage };
  // Primeiro motivo de limite: daí em diante nada é guardado (o uso só cresce).
  let overflow = null;

  function admit(record) {
    if (overflow === null) {
      const decision = admitLines(current, [Buffer.byteLength(JSON.stringify(record) + "\n")]);
      if (decision.admitted === 1) {
        records.push(record);
        current = { events: current.events + 1, bytes: current.bytes + Buffer.byteLength(JSON.stringify(record) + "\n") };
        for (const entry of record.privacy) increment(contentOmitted, entry.slice(entry.lastIndexOf(":") + 1));
        return;
      }
      overflow = decision.reason;
    }
    increment(dropped, overflow);
  }

  function draft(adapted, value) {
    if (adapted.kind === "unknown") return increment(dropped, "unknown_event");
    if (adapted.kind === "excluded") return increment(dropped, "reasoning_excluded");
    if (adapted.kind !== "draft") return increment(malformed, "invalid_input");
    const result = applyPolicy({ draft: adapted.draft, payload: value, key, content });
    if (!result.ok) return increment(dropped, result.drop);
    admit(result.record);
  }

  return {
    line(buffer) {
      let value;
      try {
        value = JSON.parse(buffer.toString("utf8"));
      } catch {
        return increment(malformed, "invalid_json");
      }
      let adapted;
      try {
        adapted = adapter(value);
      } catch {
        return increment(malformed, "invalid_input");
      }
      draft(adapted, value);
    },
    // Entrada já adaptada pelo produtor vinculado (#8): hook, ingest Hermes e
    // wrapper leem e adaptam uma vez para a observação em memória e a captura.
    draft,
    malformed: (reason) => increment(malformed, reason),
    oversize: () => increment(malformed, "oversize_line"),
    partial: () => increment(malformed, "partial_trailing_line"),
    result: () => ({ records, malformed, dropped, contentOmitted }),
  };
}

// Lote do comando → forma de `appendRecords`: o store guarda só o total de
// malformados; os motivos ficam na resposta de quem leu.
export function toStoreBatch({ records, malformed, dropped, contentOmitted }) {
  return { records, malformed: Object.values(malformed).reduce((sum, n) => sum + n, 0), dropped, contentOmitted };
}

function readLines(stdin, batch) {
  const reader = createLineReader({
    maxLineBytes: STREAM_MAX_LINE_BYTES,
    onLine: batch.line,
    onOversize: batch.oversize,
    onPartialTrailing: batch.partial,
  });
  return new Promise((resolve, reject) => {
    stdin.on("data", (chunk) => reader.push(chunk));
    stdin.on("end", () => {
      reader.end();
      resolve();
    });
    stdin.on("error", reject);
  });
}

// Entrada recusada antes de ler: o stdin é drenado e descartado, para quem
// escreve não receber erro de pipe; nada dele é guardado.
function drain(stdin) {
  if (stdin.isTTY) return Promise.resolve();
  return new Promise((resolve) => {
    stdin.on("data", () => {});
    stdin.on("end", resolve);
    stdin.on("error", resolve);
    stdin.resume();
  });
}

export async function ingestCapture({ root, id, agent, stdin, io }) {
  let opened;
  try {
    opened = await openCaptureForIngest({ root, id, io });
  } catch (error) {
    await drain(stdin);
    throw error;
  }
  const batch = createIngestBatch({ agent, key: opened.key, content: opened.content, usage: opened.usage });
  await readLines(stdin, batch);
  const result = batch.result();
  const { records, malformed, dropped, contentOmitted } = result;
  const appended = await appendRecords({ root, id, batch: toStoreBatch(result), io });
  const allDropped = { ...dropped };
  for (const [reason, count] of Object.entries(appended.dropped)) increment(allDropped, reason, count);
  return { accepted: records.length, persisted: appended.admitted, malformed, dropped: allDropped, contentOmitted };
}
