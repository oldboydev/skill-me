import { callKey, callState, originOf, pairCalls, sameScopes, sequencesOf } from "./calls.mjs";

// Skills (issue #6, crit. 8, 9 e 11). Só o par pre/post da ferramenta `Skill`
// do Claude é invocação `native`; expansão direta e ciclo de vida do Hermes
// são evidência `heuristic`. Nenhum evento de fim de escopo produz conclusão:
// uma invocação sem `post` fica `open` ou, havendo um fim do próprio escopo
// depois dela, `boundary_only`. Nome de arquivo e conteúdo coletado nunca são lidos.

const PHASE_ROLE = Object.freeze({ pre: "start", post: "result" });
const isSkillTool = (entry) => entry.eventKind === "skill_invocation" && entry.fields.invocationPath === "skill_tool";

// O fim só vale para o escopo que ele próprio nomeia: turno, sessão ou
// subagente por identidade nativa; `process_exit` não traz ID e só alcança a
// própria origem.
function closesScope(boundary, op, anchor) {
  const sameSession = boundary.identity.session !== null && boundary.identity.session === anchor.identity.session;
  switch (boundary.eventKind) {
    case "turn_end":
      return sameSession && boundary.identity.turn !== null && boundary.identity.turn === anchor.identity.turn;
    case "session_end":
      return sameSession;
    case "subagent_stop":
      return sameSession && boundary.identity.subagent !== null && boundary.identity.subagent === anchor.identity.subagent;
    case "process_exit":
      return boundary.source.agent === op.origin.agent && boundary.source.mechanism === op.origin.mechanism;
    default:
      return false;
  }
}

function invocationOperations(entries) {
  return pairCalls({
    entries,
    roleOf: (entry) => (isSkillTool(entry) ? (PHASE_ROLE[entry.fields.phase] ?? null) : null),
    keyOf: callKey,
    compatible: sameScopes,
  }).map((pair) => {
    const { start, result } = pair;
    const anchor = start ?? result;
    const op = {
      type: "skill_invocation",
      strength: pair.identified ? "native" : "inconclusive",
      state: callState(pair),
      origin: originOf(anchor),
      session: anchor.identity.session,
      call: anchor.identity.call,
      subagent: anchor.identity.subagent,
      skillName: start?.fields.skillName ?? result?.fields.skillName ?? null,
      outcome: result?.fields.outcome ?? null,
      // O `post` encerra a chamada da ferramenta; o que o agente fez com as instruções não é observado.
      instructionCompletion: "unobserved",
      boundary: null,
      start: start?.sequence ?? null,
      updates: [],
      result: result?.sequence ?? null,
      evidence: sequencesOf(start, result),
    };
    if (op.state === "open") {
      const boundary = entries.find((entry) => entry.sequence > start.sequence && closesScope(entry, op, start));
      if (boundary !== undefined) Object.assign(op, { state: "boundary_only", boundary: boundary.sequence });
    }
    return op;
  });
}

function evidenceOperations(entries) {
  const found = [];
  for (const entry of entries) {
    const expansion = entry.eventKind === "skill_invocation" && entry.fields.invocationPath === "direct_command";
    if (!expansion && entry.eventKind !== "skill_lifecycle") continue;
    found.push({
      type: "skill_evidence",
      basis: expansion ? "expansion" : "lifecycle",
      strength: "heuristic",
      state: "observed",
      origin: originOf(entry),
      session: entry.session.key,
      skillName: entry.fields.skillName ?? null,
      commandSource: entry.fields.commandSource ?? null,
      action: entry.fields.action ?? null,
      provenance: entry.fields.provenance ?? null,
      start: null,
      updates: [],
      result: null,
      evidence: [entry.sequence],
    });
  }
  return found;
}

export function skillOperations(entries) {
  return [...invocationOperations(entries), ...evidenceOperations(entries)];
}
