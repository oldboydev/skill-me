import { readCaptureSince, StoreError } from "./store.mjs";

// `privacy follow` (issue #8, crit. 7; Landing "Saída pública nova" em
// .checks/issue-8-traces.md): NDJSON v1, uma linha `record` por registro já
// gravado ou novo, na ordem do segmento, e uma linha final `end` ou `error`.
// `sequence` é a da linha nesta execução, a partir de 1; a de um `record` é
// também a posição dele na captura. A sondagem toma o lock como os demais
// comandos e não espera por ele: ocupado, a leitura fica para a próxima.

export const FOLLOW_POLL_MS = 200;
// Lock ocupado por mais que isso em sondagens seguidas não é mais um commit
// em curso (cada um leva milissegundos): é um lock que ficou, e o
// acompanhamento termina com o código em vez de esperar em silêncio.
export const FOLLOW_LOCK_PATIENCE_MS = 5000;

export const followLine = (sequence, type, fields) => JSON.stringify({ schemaVersion: 1, command: "follow", type, sequence, ...fields }) + "\n";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// `write(texto)` resolve false quando a saída fechou (consumidor saiu): o
// acompanhamento para sem erro. Devolve o código da falha, ou null.
export async function followCapture({ root, id, io, write, clock = () => performance.now() }) {
  let sequence = 0;
  let seen = 0;
  let busySince = null;
  const emit = (type, fields) => write(followLine(++sequence, type, fields));
  for (;;) {
    let polled = null;
    try {
      polled = await readCaptureSince({ root, id, seen, io });
      busySince = null;
    } catch (error) {
      const code = error instanceof StoreError ? error.code : "io_failure";
      const waiting = code === "lock_present" && clock() - (busySince ??= clock()) < FOLLOW_LOCK_PATIENCE_MS;
      if (!waiting) {
        await emit("error", { error: { code } });
        return code;
      }
    }
    if (polled !== null) {
      for (const record of polled.records) {
        if (!(await emit("record", { record }))) return null;
      }
      seen += polled.records.length;
      if (polled.capture.state !== "active") {
        await emit("end", { capture: polled.capture });
        return null;
      }
    }
    await sleep(FOLLOW_POLL_MS);
  }
}
