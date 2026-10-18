import { validateEnvelope } from "./boundary.mjs";

// Receptor em memória do recorte U1: existe só enquanto o processo que o criou
// existe. Não grava nem envia nada — por isso este módulo não importa sistema de
// arquivos, rede ou processos (há teste conferindo). Armazenamento e consumidor
// real pertencem à #8.

// Também usado pela releitura de capturas da #8 (traces/replay.mjs).
export function deepFreeze(value) {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

// `receive` nunca lança: um envelope hostil (Proxy, getter que lança) conta
// como malformado. Fila cheia descarta o NOVO envelope e preserva os aceitos,
// para que uma rajada tardia não apague o começo da execução observada.
export function createMemoryReceiver({ capacity = 500 } = {}) {
  const events = [];
  const counters = { accepted: 0, dropped: 0, malformed: 0 };
  let closed = false;

  return {
    receive(envelope) {
      if (closed) {
        counters.dropped += 1;
        return "dropped";
      }
      let copy;
      try {
        if (!validateEnvelope(envelope)) {
          counters.malformed += 1;
          return "malformed";
        }
        copy = deepFreeze(structuredClone(envelope));
      } catch {
        counters.malformed += 1;
        return "malformed";
      }
      if (events.length >= capacity) {
        counters.dropped += 1;
        return "dropped";
      }
      events.push(copy);
      counters.accepted += 1;
      return "accepted";
    },
    snapshot() {
      return Object.freeze({ events: Object.freeze([...events]), counters: Object.freeze({ ...counters }) });
    },
    close() {
      closed = true;
    },
  };
}
