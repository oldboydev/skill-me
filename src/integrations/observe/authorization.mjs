import { createHmac } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

// Decisões puras da observação automática (issue #23): estado on/off,
// geração da autorização e mapa sessão → captura. O disco e o lock ficam em
// privacy/store.mjs; formato e barreira nas linhas "Estado da observação" e
// "Barreira do off" do Landing em .checks/issue-23-observacao-on-off.md.

export const OBSERVE_VERSION = 1;
// Teto do mapa de uma geração: mantém o observe.json pequeno o bastante para a
// leitura limitada. A sessão mais antiga sai do mapa; o próximo evento dela abre
// outra captura, sem perder o que já foi gravado.
export const MAX_SESSIONS = 1000;

const GENERATION_PATTERN = /^[0-9a-f]{32}$/;
const SESSION_KEY_PATTERN = /^[0-9a-f]{64}$/;
const TAG_PATTERN = /^[0-9a-f]{64}$/;
const CAPTURE_ID_PATTERN = /^[0-9a-f]{32}$/;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const KEYS = ["changedAt", "generation", "observeVersion", "sessionKey", "sessions", "state"];

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function isValidObservation(value) {
  if (!isPlainObject(value) || !isDeepStrictEqual(Object.keys(value).sort(), KEYS)) return false;
  if (value.observeVersion !== OBSERVE_VERSION || typeof value.changedAt !== "string" || !ISO_PATTERN.test(value.changedAt)) return false;
  if (!isPlainObject(value.sessions)) return false;
  const entries = Object.entries(value.sessions);
  if (value.state === "off") return value.generation === null && value.sessionKey === null && entries.length === 0;
  return (
    value.state === "on" &&
    typeof value.generation === "string" &&
    GENERATION_PATTERN.test(value.generation) &&
    typeof value.sessionKey === "string" &&
    SESSION_KEY_PATTERN.test(value.sessionKey) &&
    entries.length <= MAX_SESSIONS &&
    entries.every(([tag, id]) => TAG_PATTERN.test(tag) && typeof id === "string" && CAPTURE_ID_PATTERN.test(id))
  );
}

// `current` null: a raiz nunca foi ligada (sem observe.json), o que vale off.
// `on` repetido mantém a geração; só `on` depois de `off` recebe a geração e a
// chave novas que quem chama sorteou. `off` repetido não grava nada.
export function switchObservation(current, action, { nowIso, generation, sessionKey }) {
  const state = current?.state ?? "off";
  if (action === "on") {
    if (state === "on") return { next: current, changed: false };
    return { next: { observeVersion: OBSERVE_VERSION, state: "on", generation, sessionKey, changedAt: nowIso, sessions: {} }, changed: true };
  }
  if (state === "off") return { next: current, changed: false };
  return { next: { observeVersion: OBSERVE_VERSION, state: "off", generation: null, sessionKey: null, changedAt: nowIso, sessions: {} }, changed: true };
}

// A gravação automática só vale na geração em que o produtor abriu.
export const isCurrentGeneration = (observation, generation) =>
  observation !== null && observation.state === "on" && typeof generation === "string" && observation.generation === generation;

// O mapa guarda só este HMAC, nunca o ID nativo da sessão. O agente entra na
// mensagem: o mesmo valor em dois agentes são duas sessões.
export function sessionTag(sessionKeyHex, { agent, id }) {
  return createHmac("sha256", Buffer.from(sessionKeyHex, "hex")).update(`${agent}\0${id}`, "utf8").digest("hex");
}

// Nova captura da sessão no fim do mapa (a ordem das chaves é a de inserção).
export function assignSession(observation, tag, captureId) {
  const sessions = { ...observation.sessions };
  delete sessions[tag];
  sessions[tag] = captureId;
  const tags = Object.keys(sessions);
  for (const old of tags.slice(0, Math.max(0, tags.length - MAX_SESSIONS))) delete sessions[old];
  return { ...observation, sessions };
}
