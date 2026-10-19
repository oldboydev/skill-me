import assert from "node:assert/strict";
import { test } from "node:test";
import { correlateTrace } from "../../../src/integrations/correlation/timeline.mjs";
import { CAPTURE_A, CAPTURE_B, at, buildTrace } from "./helpers/trace-builder.mjs";

// Provas S1 da issue #6 (.checks/issue-6-correlacao.md, C1–C5): a correlação é
// pura — recebe a cópia de `replayCapture` e devolve a timeline v1.

const ENTRY_KEYS = ["duplicateOf", "evidence", "eventKind", "gaps", "ids", "fields", "identity", "nativeEvent", "observedAt", "outOfOrder", "segment", "sequence", "session", "source"].sort();

test("T6-C1 ordered entries: uma entrada por registro em 1..N, campos v1 e evidência, mesmo com observedAt decrescente; vazio devolve listas vazias", () => {
  const trace = buildTrace([
    { src: "claude", kind: "session_start", native: "SessionStart", ids: { sessionId: "s1" }, fields: { source: "startup" }, at: 30 },
    { src: "claude", kind: "tool_pre", native: "PreToolUse", ids: { sessionId: "s1", toolUseId: "t1" }, fields: { toolName: "Bash" }, gaps: ["agentId:absent"], at: 20 },
    { src: "claude", kind: "tool_post", native: "PostToolUse", ids: { sessionId: "s1", toolUseId: "t1" }, fields: { toolName: "Bash", outcome: "success" }, at: 10 },
  ]);
  const result = correlateTrace(trace);
  assert.deepEqual(Object.keys(result).sort(), ["capture", "coverage", "entries", "operations", "timelineVersion"]);
  assert.equal(result.timelineVersion, 1);
  assert.deepEqual(result.capture, trace.capture);
  assert.deepEqual(result.entries.map((e) => e.sequence), [1, 2, 3], "ordem da gravação, não do instante");
  assert.deepEqual(result.entries.map((e) => e.observedAt), [at(30), at(20), at(10)]);
  for (const [index, entry] of result.entries.entries()) {
    const { envelope } = trace.records[index].record;
    assert.deepEqual(Object.keys(entry).sort(), ENTRY_KEYS);
    assert.deepEqual(entry.source, envelope.source);
    assert.deepEqual(
      [entry.eventKind, entry.nativeEvent, entry.ids, entry.fields, entry.gaps, entry.observedAt],
      [envelope.eventKind, envelope.nativeEvent, envelope.ids, envelope.fields, envelope.gaps, envelope.observedAt],
    );
    assert.deepEqual(entry.evidence, [index + 1]);
  }
  assert.deepEqual(result.entries[1].gaps, ["agentId:absent"]);

  const empty = correlateTrace(buildTrace([]));
  assert.deepEqual([empty.timelineVersion, empty.entries, empty.operations], [1, [], []]);
});

test("T6-C1 ordered entries: a ordem é a de sequence mesmo se os registros chegarem embaralhados, e a entrada não aponta para o objeto do trace", () => {
  const trace = buildTrace([
    { src: "claude", kind: "turn_start", ids: { sessionId: "s1" } },
    { src: "claude", kind: "turn_end", ids: { sessionId: "s1" } },
    { src: "claude", kind: "session_end", ids: { sessionId: "s1" } },
  ]);
  const shuffled = { ...trace, records: [trace.records[2], trace.records[0], trace.records[1]] };
  assert.deepEqual(correlateTrace(shuffled).entries.map((e) => [e.sequence, e.eventKind]), [[1, "turn_start"], [2, "turn_end"], [3, "session_end"]]);
  const result = correlateTrace(trace);
  result.entries[0].ids.sessionId = "alterado";
  assert.equal(trace.records[0].record.envelope.ids.sessionId, "s1", "cópia, não alias");
});

test("T6-C2 strong identities: cada nome de ID alimenta sua identidade; ausente fica null", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", promptId: "p1", agentId: "ag1", toolUseId: "tu1" } },
      { src: "codexExec", kind: "session_start", ids: { threadId: "th1" } },
      { src: "codexExec", kind: "item", ids: { itemId: "it1" } },
      { src: "hermes", kind: "tool_pre", ids: { sessionId: "hs", turnId: "ht", toolCallId: "tc1", taskId: "task1" } },
      { src: "hermes", kind: "subagent_start", ids: { parentSessionId: "hs", childSessionId: "hc", subagentId: "sub1" } },
      { src: "hermes", kind: "subagent_stop", ids: { parentSessionId: "hs", childSessionId: "hc" } },
      { src: "codexExec", kind: "turn_start", ids: {} },
    ]),
  );
  const part = (entry) => Object.fromEntries(Object.entries(entry.identity).map(([scope, key]) => [scope, key === null ? null : key.split("/").slice(-1)[0]]));
  assert.deepEqual(part(result.entries[0]), { session: "s1", turn: "p1", call: "tu1", subagent: "ag1" });
  assert.deepEqual(part(result.entries[1]), { session: "th1", turn: null, call: null, subagent: null });
  assert.deepEqual(part(result.entries[2]), { session: null, turn: null, call: "it1", subagent: null });
  assert.deepEqual(part(result.entries[3]), { session: "hs", turn: "ht", call: "tc1", subagent: null });
  assert.deepEqual(part(result.entries[4]), { session: null, turn: null, call: null, subagent: "sub1" }, "parentSessionId não é a sessão do evento");
  assert.deepEqual(part(result.entries[5]), { session: null, turn: null, call: null, subagent: "hc" });
  assert.deepEqual(part(result.entries[6]), { session: null, turn: null, call: null, subagent: null });
});

test("T6-C2 strong identities: o mesmo texto de ID em captura, agente ou mecanismo distintos não gera a mesma chave nem vínculo", () => {
  const same = { sessionId: "same", toolUseId: "same" };
  const items = [
    { src: "claude", kind: "tool_pre", ids: same },
    { src: "codexHooks", kind: "tool_pre", ids: same },
    { src: "claude", kind: "tool_pre", ids: same },
    { src: "codexHooks", kind: "session_start", ids: { sessionId: "same" } },
    { src: "codexExec", kind: "session_start", ids: { threadId: "same" } },
  ];
  const a = correlateTrace(buildTrace(items, { captureId: CAPTURE_A })).entries;
  const b = correlateTrace(buildTrace(items, { captureId: CAPTURE_B })).entries;
  assert.equal(a[0].identity.session, a[2].identity.session, "mesma origem e captura: mesma chave");
  assert.equal(a[0].identity.call, a[2].identity.call);
  const keys = [a[0], a[1], a[4]].map((e) => e.identity.session);
  assert.equal(new Set(keys).size, 3, "agente distinto e mecanismo distinto do mesmo agente");
  assert.equal(a[1].identity.session, a[3].identity.session, "mesmo agente e mecanismo");
  assert.notEqual(a[3].identity.session, a[4].identity.session, "codex hook × codex exec");
  assert.notEqual(a[1].identity.call, a[0].identity.call);
  assert.notEqual(a[0].identity.session, b[0].identity.session, "captura distinta");
  assert.notEqual(a[0].identity.call, b[0].identity.call);
  assert.equal(new Set(a.map((e) => e.session.key)).size >= 3, true);
  for (const entry of a) assert.equal(entry.session.strength, "native");
  assert.notEqual(a[0].session.key, a[1].session.key, "sem vínculo cruzado de sessão");
});

test("T6-C3 session attribution: duas sessões simultâneas e evento sem ID de sessão não recebem vínculo native; ambiguidade é inconclusive", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "a" } },
      { src: "claude", kind: "tool_pre", ids: { sessionId: "s2", toolUseId: "b" } },
      { src: "claude", kind: "tool_post", ids: { toolUseId: "a" }, fields: { toolName: "Bash" } },
      { src: "claude", kind: "tool_post", ids: { sessionId: "s2", toolUseId: "b" } },
    ]),
  );
  const [s1, s2, orphan, last] = result.entries;
  assert.deepEqual([s1.session.strength, s2.session.strength, last.session.strength], ["native", "native", "native"]);
  assert.deepEqual([s1.session.evidence, s2.session.evidence], [[1], [2]]);
  assert.notEqual(s1.session.key, s2.session.key);
  assert.deepEqual(orphan.session, { key: null, strength: "inconclusive", evidence: [] });
});

test("T6-C3 session attribution: com uma única sessão da mesma origem o candidato é heuristic e cita as sequências que o motivaram; outras origens não contam", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "codexHooks", kind: "session_start", ids: { sessionId: "cx" } },
      { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "a" } },
      { src: "claude", kind: "turn_end", ids: {} },
      { src: "claude", kind: "tool_post", ids: { sessionId: "s1", toolUseId: "a" } },
      { src: "claude", kind: "turn_end", ids: {} },
      { src: "codexHooks", kind: "tool_pre", ids: { sessionId: "cx", toolUseId: "z" } },
    ]),
  );
  const between = result.entries[2];
  assert.equal(between.session.strength, "heuristic");
  assert.equal(between.session.key, result.entries[1].session.key);
  assert.deepEqual(between.session.evidence, [2, 4], "vizinhos anterior e seguinte com ID da sessão");
  const tail = result.entries[4];
  assert.equal(tail.session.strength, "heuristic");
  assert.deepEqual(tail.session.evidence, [4], "só há vizinho anterior");
  assert.notEqual(tail.session.key, result.entries[0].session.key, "a sessão do Codex não é candidata do Claude");
  for (const entry of result.entries) assert.ok(entry.session.strength === "native" ? entry.identity.session !== null : true);
  assert.ok(result.entries.filter((e) => e.identity.session === null).every((e) => e.session.strength !== "native"));
});

test("T6-C3 session attribution: sem nenhuma sessão identificada na origem fica inconclusive; session_start sem ID nunca vira candidato", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "codexExec", kind: "turn_start", ids: {} },
      { src: "codexExec", kind: "item", ids: { itemId: "i1" }, fields: { phase: "started" } },
      { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "a" } },
      { src: "claude", kind: "session_start", fields: { source: "startup" }, gaps: ["sessionId:absent"] },
    ]),
  );
  assert.deepEqual(result.entries[0].session, { key: null, strength: "inconclusive", evidence: [] });
  assert.deepEqual(result.entries[1].session, { key: null, strength: "inconclusive", evidence: [] });
  assert.deepEqual(result.entries[3].session, { key: null, strength: "inconclusive", evidence: [] }, "abertura de sessão sem ID");
});

test("T6-C4 duplicates: repetição com identidade nativa completa e conteúdo igual vira entrada distinta com duplicateOf na primeira sequência", () => {
  const call = { sessionId: "s1", toolUseId: "t1" };
  const result = correlateTrace(
    buildTrace([
      { src: "claude", kind: "tool_pre", native: "PreToolUse", ids: call, fields: { toolName: "Bash" }, at: 1 },
      { src: "claude", kind: "tool_pre", native: "PreToolUse", ids: call, fields: { toolName: "Bash" }, at: 2 },
      { src: "claude", kind: "tool_pre", native: "PreToolUse", ids: call, fields: { toolName: "Bash" }, at: 3 },
    ]),
  );
  assert.equal(result.entries.length, 3, "nada é removido");
  assert.deepEqual(result.entries.map((e) => e.duplicateOf), [null, 1, 1], "sempre a primeira sequência");
  assert.deepEqual(result.entries.map((e) => e.observedAt), [at(1), at(2), at(3)]);
});

test("T6-C4 duplicates: sem identidade completa ou com fase, campo, evento nativo ou lacuna diferentes, cada evento é independente", () => {
  const call = { sessionId: "s1", toolUseId: "t1" };
  const result = correlateTrace(
    buildTrace([
      { src: "claude", kind: "tool_pre", native: "PreToolUse", ids: call, fields: { toolName: "Bash" } },
      { src: "claude", kind: "tool_pre", native: "PreToolUse", ids: call, fields: { toolName: "Read" } },
      { src: "claude", kind: "tool_pre", native: "PreToolUse", ids: call, fields: { toolName: "Bash" }, gaps: ["agentId:absent"] },
      { src: "claude", kind: "tool_pre", native: "OutroNome", ids: call, fields: { toolName: "Bash" } },
      { src: "claude", kind: "tool_pre", native: "PreToolUse", ids: { toolUseId: "t1" }, fields: { toolName: "Bash" } },
      { src: "claude", kind: "tool_pre", native: "PreToolUse", ids: { toolUseId: "t1" }, fields: { toolName: "Bash" } },
      { src: "codexExec", kind: "item", native: "item.started", ids: { itemId: "i1" }, fields: { phase: "started", itemType: "command_execution" } },
      { src: "codexExec", kind: "item", native: "item.started", ids: { itemId: "i1" }, fields: { phase: "started", itemType: "command_execution" } },
      { src: "claude", kind: "skill_invocation", native: "UserPromptExpansion", ids: { sessionId: "s1" }, fields: { phase: "expansion", skillName: "x" } },
      { src: "claude", kind: "skill_invocation", native: "UserPromptExpansion", ids: { sessionId: "s1" }, fields: { phase: "expansion", skillName: "x" } },
    ]),
  );
  assert.deepEqual(result.entries.map((e) => e.duplicateOf), [null, null, null, null, null, null, null, null, null, null]);
});

test("T6-C4 duplicates: a mesma chamada em fases pre e post distintas não é duplicata, e a identidade completa de turno e subagente também deduplica", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "hermes", kind: "tool_pre", ids: { sessionId: "h", toolCallId: "c" }, fields: { toolName: "echo" } },
      { src: "hermes", kind: "tool_post", ids: { sessionId: "h", toolCallId: "c" }, fields: { toolName: "echo" } },
      { src: "hermes", kind: "turn_end", ids: { sessionId: "h", turnId: "u" }, fields: { completed: true } },
      { src: "hermes", kind: "turn_end", ids: { sessionId: "h", turnId: "u" }, fields: { completed: true } },
      { src: "hermes", kind: "session_end", ids: { sessionId: "h" } },
    ]),
  );
  assert.deepEqual(result.entries.map((e) => e.duplicateOf), [null, null, null, 3, null]);
});

test("T6-C4 duplicates: a duplicata fica registrada como entrada e na operação original, sem criar segunda operação", () => {
  const call = { sessionId: "s1", toolUseId: "t1" };
  const result = correlateTrace(
    buildTrace([
      { src: "claude", kind: "tool_pre", native: "PreToolUse", ids: call, fields: { toolName: "Bash" } },
      { src: "claude", kind: "tool_pre", native: "PreToolUse", ids: call, fields: { toolName: "Bash" } },
      { src: "claude", kind: "tool_post", native: "PostToolUse", ids: call, fields: { toolName: "Bash" } },
      { src: "claude", kind: "tool_post", native: "PostToolUse", ids: call, fields: { toolName: "Bash" } },
    ]),
  );
  assert.deepEqual(result.entries.map((e) => e.duplicateOf), [null, 1, null, 3]);
  assert.equal(result.operations.length, 1, "uma operação para a chamada");
  const [op] = result.operations;
  assert.deepEqual([op.state, op.start, op.result, op.evidence, op.duplicates], ["closed", 1, 3, [1, 3], [2, 4]]);

  // Sem identidade completa nada é deduplicado, então cada evento mantém a sua operação.
  const loose = correlateTrace(
    buildTrace([
      { src: "claude", kind: "tool_pre", native: "PreToolUse", ids: { toolUseId: "t1" }, fields: { toolName: "Bash" } },
      { src: "claude", kind: "tool_pre", native: "PreToolUse", ids: { toolUseId: "t1" }, fields: { toolName: "Bash" } },
    ]),
  );
  assert.equal(loose.operations.length, 2);
});

test("T6-C5 clock and resume: observedAt anterior ao registro precedente marca outOfOrder sem deslocar a entrada", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "claude", kind: "turn_start", ids: { sessionId: "s1" }, at: 30 },
      { src: "claude", kind: "turn_end", ids: { sessionId: "s1" }, at: 10 },
      { src: "claude", kind: "turn_start", ids: { sessionId: "s1" }, at: 20 },
      { src: "claude", kind: "turn_end", ids: { sessionId: "s1" }, at: 20 },
      { src: "claude", kind: "turn_start", ids: { sessionId: "s1" }, at: 19.999 },
    ]),
  );
  assert.deepEqual(result.entries.map((e) => e.sequence), [1, 2, 3, 4, 5]);
  assert.deepEqual(result.entries.map((e) => e.outOfOrder), [false, true, false, false, true], "primeira nunca; igual não regride");
});

test("T6-C5 clock and resume: resume com ID mantém a sessão e abre um segmento novo; sem ID não junta sessões por proximidade", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "claude", kind: "session_start", ids: { sessionId: "s1" }, fields: { source: "startup" } },
      { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "a" } },
      { src: "claude", kind: "session_start", ids: { sessionId: "s1" }, fields: { source: "resume" } },
      { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "b" } },
      { src: "claude", kind: "session_start", ids: { sessionId: "s2" }, fields: { source: "resume" } },
      { src: "claude", kind: "session_start", fields: { source: "resume" }, gaps: ["sessionId:absent"] },
      { src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: "c" } },
    ]),
  );
  const e = result.entries;
  assert.equal(e[0].session.key, e[2].session.key, "a retomada continua a sessão identificada");
  assert.deepEqual(e.slice(0, 4).map((x) => x.segment), [1, 1, 2, 2]);
  assert.equal(e[4].segment, 1, "resume de sessão ainda não vista começa no segmento 1");
  assert.notEqual(e[4].session.key, e[2].session.key);
  assert.deepEqual(e[5].session, { key: null, strength: "inconclusive", evidence: [] }, "sem ID não une a sessão vizinha");
  assert.equal(e[5].segment, null);
  assert.equal(e[6].segment, 2, "a retomada sem ID não abriu segmento em s1");
});

// Achado do Verifier (C2): o agentId (e o subagentId) só identifica o subagente dentro da sessão.
test("T6-C2 strong identities: agentId ou subagentId iguais em sessões distintas dão chaves públicas distintas, e as operações da mesma sessão alinham", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "claude", kind: "subagent_start", ids: { sessionId: "s1", agentId: "A" }, fields: { agentType: "Explore" } },
      { src: "claude", kind: "subagent_start", ids: { sessionId: "s2", agentId: "A" }, fields: { agentType: "Explore" } },
      { src: "claude", kind: "tool_pre", ids: { sessionId: "s2", toolUseId: "k2", agentId: "A" }, fields: { toolName: "Grep" } },
      { src: "hermes", kind: "subagent_start", ids: { parentSessionId: "p1", subagentId: "H" }, fields: { childRole: "leaf" } },
      { src: "hermes", kind: "subagent_start", ids: { parentSessionId: "p2", subagentId: "H" }, fields: { childRole: "leaf" } },
    ]),
  );
  const [s1, s2, tool, h1, h2] = result.entries;
  assert.notEqual(s1.identity.subagent, s2.identity.subagent);
  assert.equal(s2.identity.subagent, tool.identity.subagent, "mesma sessão e agentId alinham");
  assert.notEqual(h1.identity.subagent, h2.identity.subagent, "subagentId também é escopado pelo pai");
  const [sub1, sub2, hs1, hs2] = result.operations.filter((op) => op.type === "subagent");
  assert.notEqual(sub1.subagent, sub2.subagent);
  assert.notEqual(hs1.subagent, hs2.subagent);
  const toolOp = result.operations.find((op) => op.type === "tool");
  assert.equal(toolOp.subagent, sub2.subagent, "a operação de ferramenta aponta para o subagente da sua sessão");
  assert.notEqual(toolOp.subagent, sub1.subagent);
});

test("T6-C2 strong identities: agentId sem ID de sessão não expõe vínculo forte por texto compartilhado", () => {
  const result = correlateTrace(
    buildTrace([
      { src: "claude", kind: "subagent_start", ids: { agentId: "A" }, fields: { agentType: "Explore" } },
      { src: "claude", kind: "subagent_start", ids: { sessionId: "s1", agentId: "A" }, fields: { agentType: "Explore" } },
    ]),
  );
  assert.equal(result.entries[0].identity.subagent, null);
  assert.notEqual(result.entries[1].identity.subagent, null);
  const [loose] = result.operations.filter((op) => op.type === "subagent");
  assert.deepEqual([loose.subagent, loose.strength], [null, "inconclusive"]);
});

// Último achado do Verifier (C2): turno e chamada também só valem dentro da sessão que os nomeia.
const turnCall = (entry) => [entry.identity.turn, entry.identity.call];

test("T6-C2 strong identities: promptId e toolUseId iguais em sessões distintas dão chaves públicas de turno e chamada distintas, e cada sessão continua alinhada e pareada", () => {
  const step = (kind, session) => ({ src: "claude", kind, ids: { sessionId: session, promptId: "p", toolUseId: "t" }, fields: { toolName: "Bash" } });
  const result = correlateTrace(buildTrace([step("tool_pre", "s1"), step("tool_post", "s1"), step("tool_pre", "s2"), step("tool_post", "s2")]));
  const [pre1, post1, pre2, post2] = result.entries;
  assert.deepEqual(turnCall(pre1), turnCall(post1), "pre e post da mesma sessão alinham");
  assert.deepEqual(turnCall(pre2), turnCall(post2));
  assert.notEqual(pre1.identity.turn, pre2.identity.turn);
  assert.notEqual(pre1.identity.call, pre2.identity.call);
  const [first, second] = result.operations;
  assert.equal(result.operations.length, 2);
  assert.deepEqual([first.state, first.evidence, second.state, second.evidence], ["closed", [1, 2], "closed", [3, 4]]);
  assert.notEqual(first.call, second.call, "a chave pública da operação também não cruza sessões");
  assert.notEqual(first.session, second.session);
});

test("T6-C2 strong identities: a chamada de skill e o turno do Hermes seguem a mesma regra, e origem ou captura distintas continuam separadas", () => {
  const skill = (session) => ({ src: "claude", kind: "skill_invocation", ids: { sessionId: session, toolUseId: "u" }, fields: { invocationPath: "skill_tool", phase: "pre", skillName: "x" } });
  const skills = correlateTrace(buildTrace([skill("s1"), skill("s2")])).operations;
  assert.notEqual(skills[0].call, skills[1].call);

  const items = [
    { src: "claude", kind: "tool_pre", ids: { sessionId: "s", promptId: "p", toolUseId: "t" } },
    { src: "codexHooks", kind: "tool_pre", ids: { sessionId: "s", turnId: "p", toolUseId: "t" } },
    { src: "hermes", kind: "tool_pre", ids: { sessionId: "s", turnId: "p", toolCallId: "t" } },
  ];
  const a = correlateTrace(buildTrace(items, { captureId: CAPTURE_A })).entries.map(turnCall);
  const b = correlateTrace(buildTrace(items, { captureId: CAPTURE_B })).entries.map(turnCall);
  const all = [...a, ...b].flat();
  assert.equal(new Set(all).size, 12, "três origens × duas capturas: nenhuma chave de turno ou chamada se repete");
});

test("T6-C2 strong identities: sem ID de sessão o hook não expõe turno nem chamada fortes, e o itemId do codex exec segue como agrupamento heuristic", () => {
  const loose = correlateTrace(buildTrace([{ src: "claude", kind: "tool_pre", ids: { promptId: "p", toolUseId: "t" }, fields: { toolName: "Bash" } }]));
  assert.deepEqual(turnCall(loose.entries[0]), [null, null]);
  assert.deepEqual([loose.operations[0].call, loose.operations[0].strength], [null, "inconclusive"]);

  const item = (phase) => ({ src: "codexExec", kind: "item", native: `item.${phase}`, ids: { itemId: "i0" }, fields: { phase, itemType: "command_execution" } });
  const exec = correlateTrace(buildTrace([item("started"), item("completed")]));
  assert.notEqual(exec.entries[0].identity.call, null);
  assert.equal(exec.entries[0].identity.call, exec.entries[1].identity.call, "mesmo itemId agrupa sem sessão por linha");
  assert.deepEqual([exec.operations[0].strength, exec.operations[0].state, exec.operations[0].call], ["heuristic", "closed", exec.entries[0].identity.call]);
  const other = correlateTrace(buildTrace([item("started")], { captureId: CAPTURE_B }));
  assert.notEqual(other.entries[0].identity.call, exec.entries[0].identity.call, "outra captura");
});

// Achado 2 da revisão formal (C4): subagentes do Hermes não trazem sessionId; pai e filho explícitos bastam.
const hStart = (parent, child = "c", extra = {}) => ({ src: "hermes", kind: "subagent_start", native: "subagent_start", ids: { ...(parent === null ? {} : { parentSessionId: parent }), ...(child === null ? {} : { childSessionId: child, subagentId: "A" }) }, fields: { childRole: "leaf", ...extra.fields } });
const hStop = (parent, child = "c") => ({ src: "hermes", kind: "subagent_stop", native: "subagent_stop", ids: { ...(parent === null ? {} : { parentSessionId: parent }), childSessionId: child }, fields: { childRole: "leaf", childStatus: "completed" } });
const subs = (result) => result.operations.filter((op) => op.type === "subagent");

test("T6-C4 duplicates: início ou fim idêntico do subagente do Hermes, com pai e filho explícitos e sem sessionId, aponta duplicateOf e não abre outra operação", () => {
  const result = correlateTrace(buildTrace([hStart("p1"), hStart("p1"), hStop("p1"), hStop("p1")]));
  assert.deepEqual(result.entries.map((e) => e.duplicateOf), [null, 1, null, 3]);
  assert.equal(subs(result).length, 1, "uma operação só");
  const [op] = subs(result);
  assert.deepEqual([op.strength, op.state, op.start, op.result, op.evidence, op.duplicates], ["native", "closed", 1, 3, [1, 3], [2, 4]]);

  const childOnly = correlateTrace(buildTrace([hStart(null), hStart(null), hStop(null)]));
  assert.deepEqual(childOnly.entries.map((e) => e.duplicateOf), [null, 1, null], "childSessionId sozinho já é identidade nativa");
  assert.deepEqual(subs(childOnly).map((op) => [op.state, op.duplicates]), [["closed", [2]]]);
});

test("T6-C4 duplicates: subagente sem identidade nativa suficiente ou com pais diferentes não é deduplicado", () => {
  const noId = correlateTrace(buildTrace([hStart("p1", null), hStart("p1", null)]));
  assert.deepEqual(noId.entries.map((e) => e.duplicateOf), [null, null]);
  assert.equal(subs(noId).length, 2);
  const parents = correlateTrace(buildTrace([hStart("p1"), hStart("p2")]));
  assert.deepEqual(parents.entries.map((e) => e.duplicateOf), [null, null], "pais diferentes não são a mesma identidade");
  const fields = correlateTrace(buildTrace([hStart("p1"), hStart("p1", "c", { fields: { childRole: "other" } })]));
  assert.deepEqual(fields.entries.map((e) => e.duplicateOf), [null, null], "campo diferente");
  const claudeNoSession = correlateTrace(buildTrace([{ src: "claude", kind: "subagent_start", ids: { agentId: "A" }, fields: { agentType: "Explore" } }, { src: "claude", kind: "subagent_start", ids: { agentId: "A" }, fields: { agentType: "Explore" } }]));
  assert.deepEqual(claudeNoSession.entries.map((e) => e.duplicateOf), [null, null]);
});
