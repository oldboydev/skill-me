import { callKey, callState, originOf, pairCalls, sameScopes, sequencesOf } from "./calls.mjs";

// Operações de ferramenta (issue #6, crit. 6–7): `tool_pre`/`tool_post` dos
// hooks e Hermes (par `native` por identidade completa) e `item` do `codex
// exec` (par `heuristic` por itemId, pois a linha não traz a sessão). Nada é
// inferido do conteúdo coletado.

const TOOL_ROLE = Object.freeze({ tool_pre: "start", tool_post: "result" });
const TOOL_ITEM_TYPES = new Set(["command_execution", "mcp_tool_call", "file_change", "collab_tool_call", "web_search"]);

// Duração nativa, quando observada, prevalece (zero inclusive). Sem ela, o
// intervalo entre os instantes só vale com início e resultado em ordem.
function timingOf(start, result, nativeMs) {
  if (nativeMs !== null) return { durationMs: nativeMs, elapsedMs: null, durationEvidence: "native" };
  if (start !== null && result !== null) {
    const elapsed = Date.parse(result.observedAt) - Date.parse(start.observedAt);
    if (elapsed >= 0) return { durationMs: null, elapsedMs: elapsed, durationEvidence: "derived" };
  }
  return { durationMs: null, elapsedMs: null, durationEvidence: null };
}

const observed = (fields, name) => (fields[name] === undefined ? null : fields[name]);

function toolShape({ start, result, strength, state, session, call, subagent, itemType = null, updates = [], toolName, outcome, errorType, exitCode, status = null, nativeMs }) {
  const anchor = start ?? result;
  return {
    type: "tool",
    strength,
    state,
    origin: anchor === null ? null : originOf(anchor),
    session,
    call,
    subagent,
    itemType,
    toolName,
    outcome,
    errorType,
    exitCode,
    status,
    ...timingOf(start, result, nativeMs),
    start: start?.sequence ?? null,
    updates: updates.map((entry) => entry.sequence),
    result: result?.sequence ?? null,
    evidence: sequencesOf(start, updates, result),
  };
}

function hookOperations(entries) {
  return pairCalls({ entries, roleOf: (entry) => TOOL_ROLE[entry.eventKind] ?? null, keyOf: callKey, compatible: sameScopes }).map((pair) => {
    const { start, result } = pair;
    const anchor = start ?? result;
    const fields = result?.fields ?? {};
    return toolShape({
      start,
      result,
      strength: pair.identified ? "native" : "inconclusive",
      state: callState(pair),
      session: anchor.identity.session,
      call: anchor.identity.call,
      subagent: anchor.identity.subagent,
      toolName: result?.fields.toolName ?? start?.fields.toolName ?? null,
      outcome: observed(fields, "outcome"),
      errorType: observed(fields, "errorType"),
      exitCode: null,
      nativeMs: observed(fields, "durationMs"),
    });
  });
}

// Por que um grupo de itens não pode ser tratado como uma operação só: só uma
// colisão observável do mesmo itemId. A linha do exec não traz a sessão, então a
// abertura de outra sessão no meio da vida de um item não prova reuso: itemIds
// distintos seguem como operações separadas, ainda que as vidas se sobreponham.
// Fase repetida é colisão (`multiple_sessions` quando a origem tem mais de uma
// sessão, `repeated_phase` com uma só); tipo ou ordem conflitantes também. Um
// único início e um único fim que atravessam um `session_start` não se provam
// colisão: ficam `heuristic`, nunca `native`.
function itemAmbiguity(group, sessionsInOrigin) {
  const phases = group.map((entry) => entry.fields.phase ?? null);
  if (phases.includes(null)) return "unknown_phase";
  const count = (phase) => phases.filter((candidate) => candidate === phase).length;
  if (count("started") > 1 || count("completed") > 1) return sessionsInOrigin > 1 ? "multiple_sessions" : "repeated_phase";
  if (new Set(group.map((entry) => entry.fields.itemType)).size > 1) return "mixed_item_type";
  const ordered = phases.indexOf("started") <= 0 && (phases.indexOf("completed") === -1 || phases.indexOf("completed") === phases.length - 1);
  return ordered ? null : "phase_order";
}

const lastObserved = (group, name) => group.findLast((entry) => entry.fields[name] !== undefined)?.fields[name] ?? null;

function itemOperations(entries) {
  const sessionsByOrigin = new Map();
  for (const entry of entries) {
    if (entry.identity.session === null) continue;
    const origin = `${entry.source.agent}/${entry.source.mechanism}`;
    sessionsByOrigin.set(origin, (sessionsByOrigin.get(origin) ?? new Set()).add(entry.identity.session));
  }
  const groups = new Map();
  for (const entry of entries) {
    if (entry.eventKind !== "item" || entry.identity.call === null || !TOOL_ITEM_TYPES.has(entry.fields.itemType)) continue;
    groups.set(entry.identity.call, [...(groups.get(entry.identity.call) ?? []), entry]);
  }
  return [...groups.entries()].map(([call, group]) => {
    const origin = `${group[0].source.agent}/${group[0].source.mechanism}`;
    const ambiguity = itemAmbiguity(group, sessionsByOrigin.get(origin)?.size ?? 0);
    const common = { session: group[0].session.key, call, subagent: null, itemType: group[0].fields.itemType };
    if (ambiguity !== null) {
      const ambiguous = toolShape({ ...common, start: null, result: null, strength: "inconclusive", state: "ambiguous", toolName: null, outcome: null, errorType: null, exitCode: null, nativeMs: null });
      return { ...ambiguous, ambiguity, origin: originOf(group[0]), evidence: sequencesOf(group) };
    }
    const start = group.find((entry) => entry.fields.phase === "started") ?? null;
    const result = group.find((entry) => entry.fields.phase === "completed") ?? null;
    return toolShape({
      ...common,
      start,
      result,
      updates: group.filter((entry) => entry.fields.phase === "updated"),
      strength: "heuristic",
      state: result === null ? "open" : start === null ? "orphan_result" : "closed",
      toolName: lastObserved(group, "toolName"),
      outcome: null,
      errorType: null,
      exitCode: lastObserved(group, "exitCode"),
      status: lastObserved(group, "status"),
      nativeMs: null,
    });
  });
}

export function toolOperations(entries) {
  return [...hookOperations(entries), ...itemOperations(entries)];
}
