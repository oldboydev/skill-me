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
});

// `agentId` e `subagentId` só valem dentro da sessão que os nomeia (a do
// evento ou, no Hermes, a do pai): o mesmo texto em outra sessão é outro
// subagente. Sem sessão não há chave — um texto compartilhado não é vínculo.
const AGENT_NAMES = ["agentId", "subagentId"];
const AGENT_SCOPE_NAMES = ["sessionId", "threadId", "parentSessionId"];

export function agentKeyOf(captureId, envelope) {
  const { source, ids } = envelope;
  const scopeName = AGENT_SCOPE_NAMES.find((name) => typeof ids[name] === "string");
  const name = AGENT_NAMES.find((candidate) => typeof ids[candidate] === "string");
  if (scopeName === undefined || name === undefined) return null;
  return keyFor(captureId, source, "subagent", `${ids[scopeName].length}:${ids[scopeName]}/${ids[name]}`);
}

export const childKeyOf = (captureId, envelope) =>
  typeof envelope.ids.childSessionId === "string" ? keyFor(captureId, envelope.source, "subagent", envelope.ids.childSessionId) : null;

export const keyFor = (captureId, source, scope, value) => `${captureId}/${source.agent}/${source.mechanism}/${scope}/${value}`;

export function identityOf(captureId, envelope) {
  const { source, ids } = envelope;
  const identity = {};
  for (const [scope, names] of Object.entries(SCOPE_ID_NAMES)) {
    const name = names.find((candidate) => typeof ids[candidate] === "string");
    identity[scope] = name === undefined ? null : keyFor(captureId, source, scope, ids[name]);
  }
  identity.subagent = agentKeyOf(captureId, envelope) ?? childKeyOf(captureId, envelope);
  return identity;
}
