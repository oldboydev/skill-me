// Identidades fortes de um registro (issue #6, crit. 2). Só IDs já
// pseudonimizados que o envelope v1 traz; ID ausente continua `null`. A chave
// inclui captura, agente e mecanismo de origem: o mesmo texto de ID vindo de
// outra captura, agente ou mecanismo nunca produz a mesma chave, então nada
// liga sessões ou chamadas por coincidência de texto.

// A ordem é a de preferência quando um registro traz mais de um nome do escopo.
const SCOPE_ID_NAMES = Object.freeze({
  session: ["sessionId", "threadId"],
  turn: ["turnId", "promptId"],
  call: ["toolUseId", "toolCallId", "itemId"],
  subagent: ["agentId", "subagentId", "childSessionId"],
});

export const keyFor = (captureId, source, scope, value) => `${captureId}/${source.agent}/${source.mechanism}/${scope}/${value}`;

export function identityOf(captureId, envelope) {
  const { source, ids } = envelope;
  const identity = {};
  for (const [scope, names] of Object.entries(SCOPE_ID_NAMES)) {
    const name = names.find((candidate) => typeof ids[candidate] === "string");
    identity[scope] = name === undefined ? null : keyFor(captureId, source, scope, ids[name]);
  }
  return identity;
}
