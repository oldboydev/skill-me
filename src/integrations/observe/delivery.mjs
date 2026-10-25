import { createStoreIo } from "../privacy/fs.mjs";
import { createIngestBatch, toStoreBatch } from "../privacy/ingest.mjs";
import { appendAutomatic, openObservation, StoreError } from "../privacy/store.mjs";
import { ATTEMPT_MS, untilDeadline } from "../traces/delivery.mjs";
import { sessionIdentity } from "./routing.mjs";

// Entrega de um produtor sem vínculo explícito (hook Claude/Codex ou ingest
// Hermes) à observação automática (issue #23, crit. 2–4 e 6). Mesmo contrato da
// entrega da #8 — `open`, `submit`, `malformed`, `settle`, `report`, `publish`
// — e o mesmo prazo por entrada, mas cada sessão vai à captura dela e a geração
// é a lida na abertura (linha "Barreira do off" do Landing em
// .checks/issue-23-observacao-on-off.md). Nada sai em stdout/stderr; o arquivo
// de SKILL_ME_CAPTURE_REPORT continua só do vínculo explícito.

export const AUTOMATIC_DELIVERY_CODES = Object.freeze([
  "config_invalid",
  "observe_off",
  "root_not_found",
  "root_not_directory",
  "store_invalid",
  "capture_invalid",
  "lock_present",
  "link_refused",
  "foreign_entry",
  "root_changed",
  "io_failure",
  "delivery_timeout",
]);

// Depois destes nenhuma gravação deste produtor pode ser aceita: a observação
// desligou ou mudou de geração, ou a raiz não é mais a configurada.
const FINAL_CODES = new Set(["config_invalid", "observe_off", "root_not_found", "root_not_directory", "store_invalid", "link_refused", "foreign_entry", "root_changed"]);

const codeOf = (error) => (error instanceof StoreError && AUTOMATIC_DELIVERY_CODES.includes(error.code) ? error.code : "io_failure");

// `config` lida por readObserveConfig no estado "ok"; `failure`, o código de
// uma configuração inválida (a entrega já nasce encerrada). `entries` conta as
// lidas; `unrouted`, as sem identidade de sessão, que nunca vão a captura.
export function createAutomaticDelivery({ config = null, failure = null, agent, io = createStoreIo(), clock = () => performance.now(), now = Date.now }) {
  const counts = { entries: 0, committed: 0, persisted: 0, lost: 0, unrouted: 0 };
  let code = null;
  let phase = "opening";
  let generation = null;
  const batches = new Map();
  let flushing = null;

  const lose = (entries, reason) => {
    counts.lost += entries;
    code ??= reason;
  };

  function close(reason) {
    phase = "closed";
    for (const batch of batches.values()) lose(batch.entries.length, reason);
    batches.clear();
    code ??= reason;
  }

  // Chamado pelo store sob o lock, com a chave e o uso da captura da sessão.
  function produce(capture, pending) {
    const ingest = createIngestBatch({ agent, key: capture.key, content: capture.content, usage: capture.usage, rollover: true });
    let consumed = 0;
    for (const entry of pending) {
      // Como no `privacy ingest`, uma entrada que faz o adaptador lançar é
      // entrada inválida; a entrega nunca lança para a observação.
      try {
        ingest.draft(entry.adapted, entry.payload);
      } catch {
        ingest.malformed("invalid_input");
      }
      if (ingest.full()) break;
      consumed += 1;
    }
    return { batch: toStoreBatch(ingest.result()), consumed };
  }

  async function drain() {
    // Linhas de um mesmo bloco do stdout entram juntas no lote da sessão.
    await null;
    while (phase === "open" && batches.size > 0) {
      const [sessionKey, sent] = batches.entries().next().value;
      batches.delete(sessionKey);
      const outcome = await untilDeadline(
        (onLock) => appendAutomatic({ root: config.root, expectedReal: config.rootReal, generation, session: sent.session, entries: sent.entries, produce, nowMs: now(), io, onLock }),
        sent.deadlineAt,
        clock,
        codeOf,
      );
      if (outcome.ok) {
        counts.committed += outcome.value.committed;
        counts.persisted += outcome.value.persisted;
      } else {
        lose(sent.entries.length, outcome.code);
        if (FINAL_CODES.has(outcome.code)) close(outcome.code);
      }
    }
    flushing = null;
  }

  // A abertura começa na criação: o hook a faz enquanto lê o stdin, e o evento
  // lido pertence à geração vigente no início do processo, nunca a uma posterior.
  const opening = (async () => {
    if (failure !== null) return close(failure);
    const outcome = await untilDeadline((onLock) => openObservation({ root: config.root, expectedReal: config.rootReal, io, onLock }), clock() + ATTEMPT_MS, clock, codeOf);
    if (!outcome.ok) return close(outcome.code);
    if (outcome.value.state !== "on") return close("observe_off");
    generation = outcome.value.generation;
    phase = "open";
    if (batches.size > 0) flushing ??= drain();
  })();

  function enter(adapted, payload) {
    counts.entries += 1;
    const session = sessionIdentity(adapted);
    if (session === null) {
      counts.unrouted += 1;
      return;
    }
    if (phase === "closed") return lose(1, code);
    const sessionKey = `${session.agent}\0${session.id}`;
    if (!batches.has(sessionKey)) batches.set(sessionKey, { session, entries: [], deadlineAt: clock() + ATTEMPT_MS });
    batches.get(sessionKey).entries.push({ adapted, payload });
    if (phase === "open") flushing ??= drain();
  }

  return {
    open: () => opening,
    submit: enter,
    // Entrada ilegível não tem sessão: nunca é atribuída a uma captura.
    malformed() {
      counts.entries += 1;
      counts.unrouted += 1;
    },
    async settle() {
      await opening;
      while (flushing !== null) await flushing;
    },
    report: () => ({ automatic: true, code, ...counts }),
    publish: async () => {},
  };
}
