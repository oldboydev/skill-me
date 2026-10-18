import { createStoreIo } from "../privacy/fs.mjs";
import { createIngestBatch, toStoreBatch } from "../privacy/ingest.mjs";
import { appendRecords, openCaptureForIngest, StoreError } from "../privacy/store.mjs";

// Entrega de um processo produtor vinculado (hook, ingest Hermes ou wrapper) à
// captura escolhida (issue #8, crit. 1–4 e 9–10). Reutiliza o lote do
// `privacy ingest` (adaptador → política → admissão) com a chave e o opt-in da
// captura, e o commit do store sob o mesmo lock. Nada sai em stdout/stderr: o
// resultado é um código fechado e contagens no relatório do processo.

export const DELIVERY_DEADLINE_MS = 750;
// A tentativa desiste com esta folga antes do prazo: o timer do Node dispara
// depois do pedido quando o processo está carregado (14 ms medidos com a suíte
// inteira em paralelo no Windows; .checks/issue-8-traces.build.md), e o prazo
// vale para o fim da tentativa, não para o disparo.
const DELIVERY_RESERVE_MS = 100;
const ATTEMPT_MS = DELIVERY_DEADLINE_MS - DELIVERY_RESERVE_MS;
const LOCK_RETRY_MS = 10;

export const DELIVERY_CODES = Object.freeze([
  "binding_invalid",
  "root_not_found",
  "root_not_directory",
  "store_invalid",
  "capture_not_found",
  "capture_invalid",
  "capture_not_active",
  "lock_present",
  "link_refused",
  "foreign_entry",
  "root_changed",
  "io_failure",
  "delivery_timeout",
]);

// Depois destes nenhuma entrega deste processo pode ser aceita (a captura não
// existe, encerrou ou não é nossa); os demais valem só para o lote que falhou.
const FINAL_CODES = new Set([
  "root_not_found",
  "root_not_directory",
  "store_invalid",
  "capture_not_found",
  "capture_invalid",
  "capture_not_active",
  "link_refused",
  "foreign_entry",
  "root_changed",
]);

const codeOf = (error) => (error instanceof StoreError && DELIVERY_CODES.includes(error.code) ? error.code : "io_failure");
const lineBytes = (records) => records.reduce((sum, record) => sum + Buffer.byteLength(JSON.stringify(record) + "\n"), 0);

// Uma operação do store até `deadlineAt`. Só o lock ocupado é tentado de novo:
// o store o recusa antes de qualquer mutação, então nada foi gravado. Qualquer
// outra falha — inclusive uma que chegue depois do commit, com a confirmação
// perdida — encerra a tentativa sem reenviar. Uma operação ainda em curso no
// prazo é abandonada: o agente não espera o disco. O motivo do abandono é
// `delivery_timeout`, ou `lock_present` se o prazo se foi disputando o lock (a
// última tentativa cortada não muda a causa).
async function untilDeadline(operation, deadlineAt, clock) {
  let code = "delivery_timeout";
  for (;;) {
    const remaining = deadlineAt - clock();
    if (remaining <= 0) return { ok: false, code };
    let timer;
    const outcome = await Promise.race([
      operation().then(
        (value) => ({ ok: true, value }),
        (error) => ({ ok: false, code: codeOf(error) }),
      ),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve({ ok: false, code }), remaining);
      }),
    ]);
    clearTimeout(timer);
    if (outcome.ok || outcome.code !== "lock_present") return outcome;
    code = "lock_present";
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, Math.min(LOCK_RETRY_MS, deadlineAt - clock()))));
  }
}

const emptyCounts = () => ({ entries: 0, committed: 0, persisted: 0, lost: 0 });

// Par de vínculo inválido: nenhuma captura é aberta; cada entrada só conta.
export function refusedDelivery(code) {
  const counts = emptyCounts();
  const lose = () => {
    counts.entries += 1;
    counts.lost += 1;
  };
  return { open: async () => {}, submit: lose, malformed: lose, settle: async () => {}, report: () => ({ bound: false, code, ...counts }) };
}

// `open` lê estado e chave sob o lock (fase 1 do ingest da #5); o wrapper e o
// ingest Hermes abrem antes de ler eventos, o hook depois de ler o seu. Cada
// entrada lida tem até DELIVERY_DEADLINE_MS para ser confirmada; as que chegam
// durante um commit vão juntas no lote seguinte, com o prazo da mais antiga.
// `committed`/`persisted` contam só commits confirmados; `lost` inclui a
// confirmação incerta, que nunca é reenviada.
export function createCaptureDelivery({ root, id, agent, io = createStoreIo(), clock = () => performance.now() }) {
  const counts = emptyCounts();
  let code = null;
  let phase = "new";
  let opening = null;
  let capture = null;
  // Limite inferior do uso real: outro produtor só o aumenta, então a
  // admissão local nunca recusa o que o store aceitaria.
  let usage = null;
  const waiting = [];
  let batch = null;
  let flushing = null;

  const lose = (entries, failure) => {
    counts.lost += entries;
    code ??= failure;
  };

  function close(failure) {
    phase = "closed";
    lose(waiting.length + (batch?.entries ?? 0), failure);
    waiting.length = 0;
    batch = null;
  }

  function place(entry) {
    batch ??= {
      ingest: createIngestBatch({ agent, key: capture.key, content: capture.content, usage }),
      entries: 0,
      deadlineAt: entry.readAt + ATTEMPT_MS,
    };
    // Como no `privacy ingest`, uma entrada que faz o adaptador lançar é
    // entrada inválida; a entrega nunca lança para a observação.
    try {
      entry.apply(batch.ingest);
    } catch {
      batch.ingest.malformed("invalid_input");
    }
    batch.entries += 1;
  }

  async function drain() {
    // As linhas de um mesmo bloco do stdout chegam numa sequência síncrona e
    // entram juntas no lote antes do primeiro commit.
    await null;
    while (batch !== null) {
      const sent = batch;
      batch = null;
      const result = sent.ingest.result();
      const outcome = await untilDeadline(() => appendRecords({ root, id, batch: toStoreBatch(result), io }), sent.deadlineAt, clock);
      if (outcome.ok) {
        const admitted = result.records.slice(0, outcome.value.admitted);
        counts.committed += sent.entries;
        counts.persisted += admitted.length;
        usage = { events: usage.events + admitted.length, bytes: usage.bytes + lineBytes(admitted) };
      } else {
        lose(sent.entries, outcome.code);
        if (FINAL_CODES.has(outcome.code)) close(outcome.code);
      }
    }
    flushing = null;
  }

  function open() {
    opening ??= (async () => {
      phase = "opening";
      const deadlineAt = (waiting[0]?.readAt ?? clock()) + ATTEMPT_MS;
      const outcome = await untilDeadline(() => openCaptureForIngest({ root, id, io }), deadlineAt, clock);
      if (!outcome.ok) return close(outcome.code);
      capture = { key: outcome.value.key, content: outcome.value.content };
      usage = { ...outcome.value.usage };
      phase = "open";
      for (const entry of waiting.splice(0)) place(entry);
      if (batch !== null) flushing ??= drain();
    })();
    return opening;
  }

  function enter(apply) {
    counts.entries += 1;
    const entry = { readAt: clock(), apply };
    if (phase === "closed") return lose(1, code);
    if (phase === "open") {
      place(entry);
      flushing ??= drain();
      return;
    }
    waiting.push(entry);
    open();
  }

  return {
    open,
    submit: (adapted, payload) => enter((ingest) => ingest.draft(adapted, payload)),
    malformed: (reason) => enter((ingest) => ingest.malformed(reason)),
    async settle() {
      await opening;
      while (flushing !== null) await flushing;
    },
    report: () => ({ bound: true, code, ...counts }),
  };
}
