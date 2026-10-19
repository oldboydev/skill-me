import { callState, originOf, pairCalls, sequencesOf } from "./calls.mjs";
import { keyFor } from "./identity.mjs";

// Subagentes (issue #6, crit. 10). Início e fim só se ligam por um ID
// explícito do próprio subagente; `agentType` e `childRole` iguais não unem
// nada, e ferramentas só são atribuídas ao filho por agentId ou pela sessão
// filha nomeada — nunca por papel ou proximidade.

const ROLE = Object.freeze({ subagent_start: "start", subagent_stop: "result" });
// `childSessionId` primeiro: o início do Hermes traz também `subagentId`, mas o fim traz só a sessão filha.
const REF_NAMES = ["childSessionId", "agentId", "subagentId"];

function refOf(captureId, entry) {
  const name = REF_NAMES.find((candidate) => typeof entry.ids[candidate] === "string");
  return name === undefined ? null : keyFor(captureId, entry.source, "subagent", entry.ids[name]);
}

// Chave de pareamento. `childSessionId` já é a identidade da sessão filha e
// vale sozinha (pai e filho são sessões diferentes por definição). `agentId` e
// `subagentId` só identificam o subagente dentro da sessão que os nomeia: o
// mesmo texto em outra sessão é outro subagente, e sem sessão não há par.
function pairKeyOf(captureId, entry) {
  const ref = refOf(captureId, entry);
  if (ref === null) return null;
  if (typeof entry.ids.childSessionId === "string") return JSON.stringify(["child", ref]);
  return entry.identity.session === null ? null : JSON.stringify(["agent", ref, entry.identity.session]);
}

const sessionKey = (captureId, entry, name) => (typeof entry.ids[name] === "string" ? keyFor(captureId, entry.source, "session", entry.ids[name]) : null);

export function subagentOperations(entries, captureId) {
  return pairCalls({
    entries,
    roleOf: (entry) => ROLE[entry.eventKind] ?? null,
    keyOf: (entry) => pairKeyOf(captureId, entry),
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
// agentId na mesma sessão em que o subagente foi nomeado.
export function attachChildOperations(operations) {
  const callers = operations.filter((op) => op.type === "tool" || op.type === "skill_invocation");
  for (const sub of operations.filter((op) => op.type === "subagent" && op.strength === "native")) {
    sub.operations = callers
      .filter((op) => (sub.childSession !== null ? op.session === sub.childSession : op.subagent === sub.subagent && op.session === sub.parentSession))
      .map((op) => op.id);
  }
}
