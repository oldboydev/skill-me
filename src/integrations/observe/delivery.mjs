import { createStoreIo } from "../privacy/fs.mjs";
import { createIngestBatch, toStoreBatch } from "../privacy/ingest.mjs";
import { appendAutomatic, appendLaunch, openObservation, StoreError } from "../privacy/store.mjs";
import { ATTEMPT_MS, untilDeadline } from "../traces/delivery.mjs";
import { sessionIdentity } from "./routing.mjs";

// Entrega de um produtor com sucessão de capturas: a observação automática
// (issue #23, crit. 2–4 e 6), sem vínculo explícito, e a execução de
// `skill-me <agente>` (issue #25, linha "Entrega da execução" do Landing em
// .checks/issue-25-agent-launch.md). Mesmo contrato da entrega da #8 — `open`,
// `submit`, `malformed`, `settle`, `report`, `publish` — e o mesmo prazo por
// entrada; o store escolhe a captura e faz a sucessão no limite. Nada sai em
// stdout/stderr; o arquivo de SKILL_ME_CAPTURE_REPORT continua só do vínculo
// explícito.

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
const AUTOMATIC_FINAL_CODES = new Set(["config_invalid", "observe_off", "root_not_found", "root_not_directory", "store_invalid", "link_refused", "foreign_entry", "root_changed"]);

export const LAUNCH_DELIVERY_CODES = Object.freeze([
  "launch_ended",
  ...AUTOMATIC_DELIVERY_CODES.filter((code) => !["config_invalid", "observe_off"].includes(code)),
]);

// Execução encerrada (ponteiro apagado) ou raiz que não é mais a dela.
const LAUNCH_FINAL_CODES = new Set(["launch_ended", "root_not_found", "root_not_directory", "store_invalid", "link_refused", "foreign_entry", "root_changed"]);

const codeIn = (codes) => (error) => (error instanceof StoreError && codes.includes(error.code) ? error.code : "io_failure");

// Núcleo comum. `opening()` resolve o contexto do produtor ({ok, value} ou
// {ok: false, code}); `routeOf(adapted)` dá o destino de uma entrada (null:
// sem destino, contada em `unrouted`); `append({context, route, entries,
// produce, onLock})` é a gravação no store com sucessão. `routeMalformed`:
// destino de uma entrada ilegível, ou null quando ela não tem destino.
function createSuccessionDelivery({ agent, io, clock, now, codeOf, finalCodes, opening: openContext, routeOf, routeMalformed, append, describe }) {
  const counts = { entries: 0, committed: 0, persisted: 0, lost: 0, unrouted: 0 };
  let code = null;
  let phase = "opening";
  let context = null;
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

  // Chamado pelo store sob o lock, com a chave e o uso da captura corrente.
  function produce(capture, pending) {
    const ingest = createIngestBatch({ agent, key: capture.key, content: capture.content, usage: capture.usage, rollover: true });
    let consumed = 0;
    for (const entry of pending) {
      if (entry.malformed !== undefined) ingest.malformed(entry.malformed);
      else {
        // Como no `privacy ingest`, uma entrada que faz o adaptador lançar é
        // entrada inválida; a entrega nunca lança para a observação.
        try {
          ingest.draft(entry.adapted, entry.payload);
        } catch {
          ingest.malformed("invalid_input");
        }
      }
      if (ingest.full()) break;
      consumed += 1;
    }
    return { batch: toStoreBatch(ingest.result()), consumed };
  }

  async function drain() {
    // Linhas de um mesmo bloco do stdout entram juntas no lote do destino.
    await null;
    while (phase === "open" && batches.size > 0) {
      const [key, sent] = batches.entries().next().value;
      batches.delete(key);
      const outcome = await untilDeadline(
        (onLock) => append({ context, route: sent.route, entries: sent.entries, produce, nowMs: now(), io, onLock }),
        sent.deadlineAt,
        clock,
        codeOf,
      );
      if (outcome.ok) {
        counts.committed += outcome.value.committed;
        counts.persisted += outcome.value.persisted;
      } else {
        lose(sent.entries.length, outcome.code);
        if (finalCodes.has(outcome.code)) close(outcome.code);
      }
    }
    flushing = null;
  }

  // A abertura começa na criação: o hook a faz enquanto lê o stdin, e o evento
  // lido pertence ao contexto vigente no início do processo.
  const opening = (async () => {
    const outcome = await openContext();
    if (!outcome.ok) return close(outcome.code);
    context = outcome.value;
    phase = "open";
    if (batches.size > 0) flushing ??= drain();
  })();

  function enter(route, entry) {
    if (route === null) {
      counts.unrouted += 1;
      return;
    }
    if (phase === "closed") return lose(1, code);
    if (!batches.has(route.key)) batches.set(route.key, { route, entries: [], deadlineAt: clock() + ATTEMPT_MS });
    batches.get(route.key).entries.push(entry);
    if (phase === "open") flushing ??= drain();
  }

  return {
    open: () => opening,
    submit(adapted, payload) {
      counts.entries += 1;
      enter(routeOf(adapted), { adapted, payload });
    },
    malformed(reason) {
      counts.entries += 1;
      enter(routeMalformed, { malformed: reason });
    },
    async settle() {
      await opening;
      while (flushing !== null) await flushing;
    },
    report: () => describe(code, counts),
    publish: async () => {},
  };
}

// Observação automática: cada sessão vai à captura dela e a geração é a lida
// na abertura (linha "Barreira do off" do Landing da #23). `config` lida por
// readObserveConfig no estado "ok"; `failure`, o código de uma configuração
// inválida (a entrega já nasce encerrada). `unrouted` conta as entradas sem
// identidade de sessão — e as ilegíveis —, que nunca vão a captura.
export function createAutomaticDelivery({ config = null, failure = null, agent, io = createStoreIo(), clock = () => performance.now(), now = Date.now }) {
  const codeOf = codeIn(AUTOMATIC_DELIVERY_CODES);
  return createSuccessionDelivery({
    agent,
    io,
    clock,
    now,
    codeOf,
    finalCodes: AUTOMATIC_FINAL_CODES,
    async opening() {
      if (failure !== null) return { ok: false, code: failure };
      const outcome = await untilDeadline((onLock) => openObservation({ root: config.root, expectedReal: config.rootReal, io, onLock }), clock() + ATTEMPT_MS, clock, codeOf);
      if (!outcome.ok) return outcome;
      if (outcome.value.state !== "on") return { ok: false, code: "observe_off" };
      return { ok: true, value: outcome.value.generation };
    },
    routeOf(adapted) {
      const session = sessionIdentity(adapted);
      return session === null ? null : { key: `${session.agent}\0${session.id}`, session };
    },
    routeMalformed: null,
    append: ({ context, route, entries, produce, nowMs, onLock }) =>
      appendAutomatic({ root: config.root, expectedReal: config.rootReal, generation: context, session: route.session, entries, produce, nowMs, io, onLock }),
    describe: (code, counts) => ({ automatic: true, code, ...counts }),
  });
}

// Execução do launcher: toda entrada — também sem sessão e as ilegíveis, que
// somam em `malformed` da captura — vai à execução, na ordem de chegada. O
// ponteiro só some no encerramento, e cada gravação o confere sob o lock; por
// isso a abertura não toca o disco. `root` é o caminho real da raiz.
const LAUNCH_ROUTE = Object.freeze({ key: "launch" });

export function createLaunchDelivery({ root, invocation, agent, io = createStoreIo(), clock = () => performance.now(), now = Date.now }) {
  return createSuccessionDelivery({
    agent,
    io,
    clock,
    now,
    codeOf: codeIn(LAUNCH_DELIVERY_CODES),
    finalCodes: LAUNCH_FINAL_CODES,
    opening: async () => ({ ok: true, value: null }),
    routeOf: () => LAUNCH_ROUTE,
    routeMalformed: LAUNCH_ROUTE,
    append: ({ entries, produce, nowMs, onLock }) => appendLaunch({ root, expectedReal: root, invocation, entries, produce, nowMs, io, onLock }),
    describe: (code, { entries, committed, persisted, lost }) => ({ launch: true, code, entries, committed, persisted, lost }),
  });
}
