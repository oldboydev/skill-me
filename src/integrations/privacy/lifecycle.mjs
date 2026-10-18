// Decisões puras do ciclo de vida de uma captura (issue #5, crit. 13–19):
// transições, admissão por limite e retenção. O disco fica em store.mjs; a
// futura #8 reutiliza estas regras sem reimplementá-las.

export const PRIVACY_LIMITS = Object.freeze({ maxEvents: 500, maxBytes: 8 * 1024 * 1024 });

export const DEFAULT_RETENTION_DAYS = 7;
export const MIN_RETENTION_DAYS = 1;
export const MAX_RETENTION_DAYS = 365;

// 128 bits de `randomBytes(16)` em hex minúsculo; conferido antes de qualquer
// `path.join`, o ID nunca carrega separador ou `..`.
export const CAPTURE_ID_PATTERN = /^[0-9a-f]{32}$/;

const DAY_MS = 86_400_000;

// `endedAt` marca a primeira saída de active e não muda depois: a retenção de
// uma captura parada e depois desabilitada conta do stop original. Nenhuma
// ação volta a active; `stop` em disabled é ordem inválida, não idempotência.
export function transition(capture, action, nowIso) {
  const endedAt = capture.endedAt ?? nowIso;
  if (action === "stop") {
    if (capture.state === "active") return { ok: true, capture: { ...capture, state: "stopped", endedAt }, changed: true };
    if (capture.state === "stopped") return { ok: true, capture, changed: false };
  }
  if (action === "disable") {
    if (capture.state === "active" || capture.state === "stopped") {
      return { ok: true, capture: { ...capture, state: "disabled", content: false, endedAt }, changed: true };
    }
    if (capture.state === "disabled") return { ok: true, capture, changed: false };
  }
  return { ok: false, code: "invalid_transition" };
}

// Admite em ordem até o primeiro registro que ultrapassaria um limite; ele e
// todos os seguintes contam no motivo desse primeiro, para que um registro
// menor posterior não passe à frente de um recusado.
export function admitLines(usage, lineBytes) {
  let events = usage.events;
  let bytes = usage.bytes;
  let admitted = 0;
  let reason = null;
  for (const size of lineBytes) {
    if (events + 1 > PRIVACY_LIMITS.maxEvents) reason = "capture_event_limit";
    else if (bytes + size > PRIVACY_LIMITS.maxBytes) reason = "capture_byte_limit";
    if (reason !== null) break;
    events += 1;
    bytes += size;
    admitted += 1;
  }
  const rejected = lineBytes.length - admitted;
  return { admitted, reason, dropped: rejected > 0 ? { [reason]: rejected } : {} };
}

// Captura active nunca expira; encerrada expira com idade >= prazo, contada
// do encerramento.
export function isExpired(capture, nowMs) {
  if (capture.state === "active" || capture.endedAt === null) return false;
  return nowMs - Date.parse(capture.endedAt) >= capture.retentionDays * DAY_MS;
}
