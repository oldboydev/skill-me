import { callState, originOf, pairCalls, sequencesOf } from "./calls.mjs";
import { agentKeyOf, childKeyOf, keyFor } from "./identity.mjs";

// Subagentes (issue #6, crit. 10). Início e fim só se ligam por um ID
// explícito do próprio subagente; `agentType` e `childRole` iguais não unem
// nada, e ferramentas só são atribuídas ao filho por agentId ou pela sessão
// filha nomeada — nunca por papel ou proximidade.

const ROLE = Object.freeze({ subagent_start: "start", subagent_stop: "result" });
// `childSessionId` primeiro: o início do Hermes traz também `subagentId`, mas o fim traz só a sessão filha.
const refOf = (captureId, entry) => childKeyOf(captureId, entry) ?? agentKeyOf(captureId, entry);

// Pareamento. `childSessionId` já é a identidade da sessão filha e vale sozinho
// (pai e filho são sessões diferentes por definição); `agentId`/`subagentId`
// já trazem a sessão na própria chave, e sem sessão não há par.
const pairKeyOf = (captureId, entry) => {
  const ref = refOf(captureId, entry);
  return ref === null ? null : JSON.stringify([childKeyOf(captureId, entry) === null ? "agent" : "child", ref]);
};

// Pais explícitos que divergem para o mesmo filho são uma contradição, não um
// par; a ausência do pai em um dos lados não prova divergência.
const sameParent = (a, b) => a.ids.parentSessionId === undefined || b.ids.parentSessionId === undefined || a.ids.parentSessionId === b.ids.parentSessionId;

const sessionKey = (captureId, entry, name) => (typeof entry.ids[name] === "string" ? keyFor(captureId, entry.source, "session", entry.ids[name]) : null);

export function subagentOperations(entries, captureId) {
  return pairCalls({
    entries,
    roleOf: (entry) => ROLE[entry.eventKind] ?? null,
    keyOf: (entry) => pairKeyOf(captureId, entry),
    compatible: sameParent,
  }).map((pair) => {
    const { start, result } = pair;
    const anchor = start ?? result;
    return {
      type: "subagent",
      strength: pair.identified ? "native" : "inconclusive",
      state: callState(pair),
      origin: originOf(anchor),
      subagent: refOf(captureId, anchor),
      parentSession: sessionKey(captureId, anchor, "parentSessionId") ?? anchor.identity.session,
      childSession: sessionKey(captureId, anchor, "childSessionId"),
      agentType: result?.fields.agentType ?? start?.fields.agentType ?? null,
      childRole: result?.fields.childRole ?? start?.fields.childRole ?? null,
      childStatus: result?.fields.childStatus ?? null,
      durationMs: result?.fields.durationMs ?? null,
      operations: [],
      start: start?.sequence ?? null,
      updates: [],
      result: result?.sequence ?? null,
      evidence: sequencesOf(start, result),
    };
  });
}

// Ferramentas do filho: a sessão filha nomeada (Hermes) ou, nos hooks, o mesmo
// agentId na mesma sessão. Uma sessão filha com pais em conflito não é
// atribuída a nenhum deles.
export function attachChildOperations(operations) {
  const callers = operations.filter((op) => op.type === "tool" || op.type === "skill_invocation");
  const subs = operations.filter((op) => op.type === "subagent" && op.strength === "native");
  const parentsOf = (child) => new Set(subs.filter((sub) => sub.childSession === child).map((sub) => sub.parentSession));
  for (const sub of subs) {
    const contested = sub.childSession !== null && parentsOf(sub.childSession).size > 1;
    sub.operations = contested
      ? []
      : callers
          .filter((op) => (sub.childSession !== null ? op.session === sub.childSession : op.subagent === sub.subagent && op.session === sub.parentSession))
          .map((op) => op.id);
  }
}
