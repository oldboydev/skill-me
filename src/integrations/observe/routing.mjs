import { buildEnvelope } from "../boundary.mjs";

// Sessão de um evento adaptado, para escolher a captura automática (issue #23,
// crit. 3). Vale só o ID que a fronteira v1 aceitaria no envelope — o mesmo que
// a política pseudonimiza no registro —, nunca um valor que ela recusaria. No
// Hermes, subagent_start/stop não trazem `sessionId`: o evento é emitido na
// sessão do pai, identificada por `parentSessionId`. Sem identidade, null: o
// evento não é atribuído a nenhuma captura, nem à única sessão aberta.
export function sessionIdentity(adapted) {
  if (adapted === null || typeof adapted !== "object" || adapted.kind !== "draft") return null;
  let built;
  try {
    built = buildEnvelope(adapted.draft);
  } catch {
    return null;
  }
  if (!built.ok) return null;
  const { ids, source } = built.envelope;
  const id = ids.sessionId ?? (source.agent === "hermes" ? ids.parentSessionId : undefined);
  return typeof id === "string" && id !== "" ? { agent: source.agent, id } : null;
}
