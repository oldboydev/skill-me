// Pareamento de início e resultado por identidade, compartilhado pelas
// operações de ferramenta, de skill e de subagente (issue #6, crit. 6, 8 e 10).
// Opera sobre as entradas na ordem de `sequence`; nunca por proximidade.

// `roleOf` → "start" | "result" | null; `keyOf` → chave de pareamento ou null.
// Sem chave não há par: cada metade vira uma chamada isolada e não identificada.
// Um resultado pareia com o início aberto mais antigo da mesma chave que
// `compatible` aceita; sem ele, vira resultado órfão.
export function pairCalls({ entries, roleOf, keyOf, compatible = () => true }) {
  const open = new Map();
  const calls = [];
  for (const entry of entries) {
    const role = roleOf(entry);
    if (role === null) continue;
    const key = keyOf(entry);
    if (key === null) {
      calls.push(role === "start" ? { start: entry, result: null, identified: false } : { start: null, result: entry, identified: false });
      continue;
    }
    const pending = open.get(key) ?? [];
    open.set(key, pending);
    if (role === "start") {
      const call = { start: entry, result: null, identified: true };
      pending.push(call);
      calls.push(call);
      continue;
    }
    const match = pending.find((call) => compatible(call.start, entry));
    if (match === undefined) calls.push({ start: null, result: entry, identified: true });
    else {
      match.result = entry;
      pending.splice(pending.indexOf(match), 1);
    }
  }
  return calls;
}

export function callState({ start, result }) {
  if (start !== null && result !== null) return "closed";
  return start !== null ? "open" : "orphan_result";
}

// Chamada completa: sessão e ID de chamada, da mesma origem (a chave já os inclui).
export const callKey = (entry) => (entry.identity.session !== null && entry.identity.call !== null ? JSON.stringify([entry.identity.session, entry.identity.call]) : null);

// Turno ou subagente presentes nos dois lados precisam coincidir; a ausência
// de um lado não prova divergência.
export const sameScopes = (a, b) => ["turn", "subagent"].every((scope) => a.identity[scope] === null || b.identity[scope] === null || a.identity[scope] === b.identity[scope]);

export const sequencesOf = (...entries) => entries.flat().filter(Boolean).map((entry) => entry.sequence).sort((a, b) => a - b);

export const originOf = (entry) => ({ agent: entry.source.agent, mechanism: entry.source.mechanism });
