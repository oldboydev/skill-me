import { isDeepStrictEqual } from "node:util";
import { coverageOf } from "./coverage.mjs";
import { identityOf } from "./identity.mjs";
import { toolOperations } from "./operations.mjs";
import { skillOperations } from "./skills.mjs";
import { attachChildOperations, subagentOperations } from "./subagents.mjs";

// Timeline v1 (issue #6). Consumidor puro da cópia de `replayCapture`: não lê
// disco, não executa nada e não relê skill. `sequence` é a ordem canônica;
// `observedAt` só informa e nunca reordena. Cada vínculo declara a força
// (`native`, `heuristic`, `inconclusive`) e as `sequence` que o sustentam.

export const TIMELINE_VERSION = 1;

// Para esses eventos, o ID do escopo indicado também é necessário para a
// identidade nativa ser completa (crit. 4); um evento só com ID de sessão não
// identifica qual chamada, turno ou subagente se repetiu.
const REQUIRED_SCOPE = Object.freeze({
  tool_pre: "call",
  tool_post: "call",
  skill_invocation: "call",
  item: "call",
  turn_start: "turn",
  turn_end: "turn",
  subagent_start: "subagent",
  subagent_stop: "subagent",
});

const INCONCLUSIVE = () => ({ key: null, strength: "inconclusive", evidence: [] });

function toEntry(captureId, { sequence, record }) {
  const envelope = structuredClone(record.envelope);
  return {
    sequence,
    observedAt: envelope.observedAt,
    source: envelope.source,
    eventKind: envelope.eventKind,
    nativeEvent: envelope.nativeEvent,
    ids: envelope.ids,
    fields: envelope.fields,
    gaps: envelope.gaps,
    evidence: [sequence],
    identity: identityOf(captureId, envelope),
    session: INCONCLUSIVE(),
    segment: null,
    duplicateOf: null,
    outOfOrder: false,
  };
}

const isResume = (entry) => entry.eventKind === "session_start" && entry.fields.source === "resume";

// Sessões nomeadas pelo próprio registro são `native`. Uma retomada com ID
// continua a sessão e abre um segmento novo; sem ID ela não é ligada a nada.
function linkNativeSessions(entries) {
  const segments = new Map();
  for (const entry of entries) {
    const key = entry.identity.session;
    if (key === null) continue;
    entry.session = { key, strength: "native", evidence: [entry.sequence] };
    const current = segments.get(key);
    entry.segment = current === undefined ? 1 : isResume(entry) ? current + 1 : current;
    segments.set(key, entry.segment);
  }
}

const sameOrigin = (a, b) => a.source.agent === b.source.agent && a.source.mechanism === b.source.mechanism;

// Registro sem ID de sessão: só há candidato quando a mesma origem identificou
// exatamente uma sessão na captura; ele é `heuristic` e cita os vizinhos
// nativos dessa sessão. Mais de uma, nenhuma ou abertura de sessão sem ID:
// `inconclusive`, nunca um vínculo por proximidade.
function linkContextualSessions(entries) {
  for (const entry of entries) {
    if (entry.identity.session !== null || entry.eventKind === "session_start") continue;
    const candidates = new Set(entries.filter((other) => other.identity.session !== null && sameOrigin(entry, other)).map((other) => other.identity.session));
    if (candidates.size !== 1) continue;
    const [key] = candidates;
    const members = entries.filter((other) => other.identity.session === key);
    const previous = members.findLast((other) => other.sequence < entry.sequence);
    const next = members.find((other) => other.sequence > entry.sequence);
    entry.session = { key, strength: "heuristic", evidence: [previous, next].filter(Boolean).map((other) => other.sequence) };
  }
}

function hasCompleteIdentity(entry) {
  if (entry.identity.session === null) return false;
  const required = REQUIRED_SCOPE[entry.eventKind];
  return required === undefined || entry.identity[required] !== null;
}

const content = ({ source, eventKind, nativeEvent, ids, fields, gaps }) => ({ source, eventKind, nativeEvent, ids, fields, gaps });

// `observedAt` fica fora da comparação: a repetição chega em outro instante.
function markDuplicates(entries) {
  for (const [index, entry] of entries.entries()) {
    if (!hasCompleteIdentity(entry)) continue;
    const first = entries.slice(0, index).find((earlier) => hasCompleteIdentity(earlier) && isDeepStrictEqual(content(earlier), content(entry)));
    if (first !== undefined) entry.duplicateOf = first.sequence;
  }
}

function markOutOfOrder(entries) {
  for (let index = 1; index < entries.length; index++) {
    entries[index].outOfOrder = Date.parse(entries[index].observedAt) < Date.parse(entries[index - 1].observedAt);
  }
}

// Uma duplicata não abre operação: ela só fica listada na operação da primeira
// ocorrência, para a evidência continuar completa.
function buildOperations(entries, captureId) {
  const live = entries.filter((entry) => entry.duplicateOf === null);
  const operations = [...toolOperations(live), ...skillOperations(live), ...subagentOperations(live, captureId)]
    .sort((a, b) => a.evidence[0] - b.evidence[0])
    .map((op, index) => ({ id: `op-${index + 1}`, ...op, duplicates: [] }));
  for (const entry of entries) {
    if (entry.duplicateOf === null) continue;
    operations.find((op) => op.evidence.includes(entry.duplicateOf))?.duplicates.push(entry.sequence);
  }
  attachChildOperations(operations);
  return operations;
}

export function correlateTrace(trace) {
  const records = [...trace.records].sort((a, b) => a.sequence - b.sequence);
  const entries = records.map((record) => toEntry(trace.capture.id, record));
  linkNativeSessions(entries);
  linkContextualSessions(entries);
  markDuplicates(entries);
  markOutOfOrder(entries);
  const operations = buildOperations(entries, trace.capture.id);
  return { timelineVersion: TIMELINE_VERSION, capture: structuredClone(trace.capture), entries, operations, coverage: coverageOf(trace.capture, entries, operations) };
}
