import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { after, before, test } from "node:test";
import { DELIVERY_DEADLINE_MS } from "../../../src/integrations/traces/delivery.mjs";
import { PSEUDONYM, baseEnv, makeScratch, runIntegrations, runIntegrationsJson } from "../helpers/cli.mjs";
import { loadFixture } from "../helpers/fixtures.mjs";
import { readClaudeHandlers, readCodexHandlers, runClaudeHandler, runCodexHandler } from "../helpers/installed-hooks.mjs";
import { SECRET_TEXT, claudePayload, codexHookPayload, hermesRecord, leaks } from "../helpers/privacy-canaries.mjs";
import { DELIVERED_AUTO, assertSameAsIngest, automaticOf, observeOk, prepareObservation, readObserveState, runNpmScript, runObserve } from "../helpers/observe.mjs";
import {
  assertAbsentOnDisk,
  captureDir,
  capturesDir,
  describeTiming,
  deliveryTiming,
  diskTrace,
  exportOf,
  expectedPseudonym,
  filesUnder,
  inspected,
  privacyBody,
  privacyOk,
  runHermesIngest,
  runInternal,
  sameEnvelope,
  shown,
  storeDir,
  timedEnv,
  timingLines,
} from "../helpers/traces.mjs";
import { snapshotTree } from "../helpers/tree.mjs";

// Provas S2 da issue #23 (C6, C7, C10, C14): hooks Claude e Codex pela linha
// que o instalador grava, iniciados como o agente os inicia, com a observação
// ligada e SEM variáveis de captura no ambiente. O esperado vem do relatório em
// memória da #4/#5, do `privacy ingest` da #5 e da definição publicada do
// pseudônimo; a captura de cada sessão é achada pelo pseudônimo, não pelo código.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

const CLAUDE_IDS = { sessionId: "session_id", promptId: "prompt_id", agentId: "agent_id", toolUseId: "tool_use_id" };
const CODEX_HOOK_IDS = { sessionId: "session_id", turnId: "turn_id", agentId: "agent_id", toolUseId: "tool_use_id" };
const CLAUDE_SOURCE = { agent: "claude", mechanism: "command_hook", contract: "claude-code-hooks@docs-2026-10-16" };
const CODEX_HOOK_SOURCE = { agent: "codex", mechanism: "command_hook", contract: "codex-hooks@rust-v0.162.1" };
const lostAll = (code, entries = 1) => ({ automatic: true, code, entries, committed: 0, persisted: 0, lost: entries, unrouted: 0 });
// POSIX: o Codex roda hooks por `$SHELL -lc`; o home temporário já isola o perfil.
const codexShell = (env) => (process.platform === "win32" ? env : { ...env, SHELL: "/bin/sh" });

let claude;
let codex;
before(() => {
  const project = scratch("i23 agentes projeto");
  claude = { target: path.join(project, ".claude"), cwd: project };
  codex = { target: path.join(project, ".codex"), cwd: project };
  mkdirSync(claude.target);
  mkdirSync(codex.target);
  assert.equal(runIntegrationsJson(["install", "--agent", "claude", "--target", claude.target, "--apply"], { env: baseEnv() }).status, 0);
  assert.equal(runIntegrationsJson(["install", "--agent", "codex", "--target", codex.target, "--apply"], { env: codexShell(baseEnv({ HOME: project })) }).status, 0);
  claude.handlers = readClaudeHandlers(claude.target);
  codex.handlers = readCodexHandlers(codex.target);
});

const runClaude = (payload, env) => runClaudeHandler(claude.handlers[payload.hook_event_name].handler, payload, { env, cwd: claude.cwd });
const runCodex = (payload, env, options = {}) => runCodexHandler(codex.handlers[payload.hook_event_name].handler, payload, { env: codexShell(env), cwd: codex.cwd, ...options });

// A captura automática de uma sessão nativa: aquela cujos registros trazem o
// pseudônimo da sessão calculado com a chave dela.
function captureOfSession(root, nativeSession) {
  const found = automaticOf(root).filter((capture) => {
    const { records } = exportOf(root, capture.id);
    return records.length > 0 && records.every((r) => r.envelope.ids.sessionId === expectedPseudonym(root, capture.id, nativeSession));
  });
  assert.equal(found.length, 1, `uma captura para a sessão ${nativeSession}`);
  return found[0];
}

function assertIds(root, id, envelope, native, names, label) {
  for (const [name, value] of Object.entries(envelope.ids)) {
    assert.match(value, PSEUDONYM, `${label}: ${name}`);
    assert.equal(value, expectedPseudonym(root, id, native[names[name]]), `${label}: ${name}`);
  }
}

const nativeIdValues = (payloads, names) => payloads.flatMap((p) => Object.values(names).map((n) => p[n]).filter((v) => typeof v === "string" && v !== ""));

test("I23-C6 Claude grava automaticamente com on: hook instalado grava cada sessão numa captura própria, sem variável de captura, com o comando só depois da sanitização", async () => {
  const { root, env } = prepareObservation(scratch, "i23 c6");
  observeOk(["on"], env);
  assert.ok(!Object.keys(env).some((name) => name.startsWith("SKILL_ME_CAPTURE")), "nenhuma variável de captura no ambiente do agente");
  const cases = [
    ...loadFixture("claude-hooks.json").cases.filter((c) => c.valid),
    { name: "bash com segredo", payload: claudePayload("pre_tool_bash", { tool_use_id: "toolu_segredo", tool_input: { command: SECRET_TEXT, description: "listar ação" } }) },
  ];
  assert.ok(cases.length >= 10);
  const runs = [];
  for (const { name, payload } of cases) {
    const run = await runClaude(payload, env);
    assert.deepEqual([run.status, run.stdout], [0, ""], `${name}: ${run.stderr}`);
    assert.deepEqual(run.report.delivery, DELIVERED_AUTO(1), name);
    runs.push({ name, payload, observed: run.report.events[0] });
  }

  // Uma captura por sessão nativa, com os eventos dela na ordem em que chegaram.
  const sessions = [...new Set(runs.map((r) => r.payload.session_id))];
  assert.equal(sessions.length, 2, "a fixture traz duas sessões");
  assert.equal(automaticOf(root).length, 2);
  const storedInRunOrder = new Map();
  for (const session of sessions) {
    const capture = captureOfSession(root, session);
    assert.deepEqual([capture.state, capture.content, capture.retentionDays, capture.origin], ["active", true, 7, "automatic"]);
    const expected = runs.filter((r) => r.payload.session_id === session);
    const { records } = exportOf(root, capture.id);
    assert.equal(records.length, expected.length, session);
    assert.deepEqual([capture.counters.accepted, capture.counters.persisted, capture.counters.malformed, capture.counters.dropped], [expected.length, expected.length, 0, {}]);
    for (const [index, record] of records.entries()) {
      const { name, payload, observed } = expected[index];
      assert.equal(record.recordVersion, 1, name);
      assert.deepEqual(record.envelope.source, CLAUDE_SOURCE, name);
      assert.equal(record.envelope.signal, "native_hook", name);
      assert.equal(record.envelope.nativeEvent, payload.hook_event_name, name);
      sameEnvelope(record.envelope, observed, name);
      assertIds(root, capture.id, record.envelope, payload, CLAUDE_IDS, name);
      storedInRunOrder.set(expected[index], record);
    }
  }
  const stored = runs.map((r) => storedInRunOrder.get(r));

  // Comandos suportados só depois da sanitização: o mesmo conteúdo do `privacy ingest`.
  const secret = stored.at(-1).content.fields.find((f) => f.field === "tool_input.command");
  assert.ok(secret.value.includes("[removido]") && secret.value.includes("início seguro"), "texto sanitizado, não omitido");
  assertSameAsIngest(root, "claude", runs.map((r) => r.payload), stored, "Claude");
  const payloads = runs.map((r) => r.payload);
  assertAbsentOnDisk(root, [...nativeIdValues(payloads, CLAUDE_IDS), ...payloads.flatMap((p) => [p.cwd, p.transcript_path].filter(Boolean))], "C6");
  for (const file of filesUnder(storeDir(root))) if (path.basename(file) !== "key") assert.deepEqual(leaks(readFileSync(file, "utf8")), [], path.relative(root, file));
});

test("I23-C7 Codex grava automaticamente com on: hook instalado grava a sessão sem variável de captura; ler SKILL.md continua só operação de ferramenta", async () => {
  const { root, env } = prepareObservation(scratch, "i23 c7");
  observeOk(["on"], env);
  const cases = loadFixture("codex-hooks.json").cases.filter((c) => c.valid);
  assert.ok(cases.length >= 8);
  const runs = [];
  for (const { name, payload } of cases) {
    const run = await runCodex(payload, env);
    assert.deepEqual([run.status, run.stdout], [0, ""], `${name}: ${run.stderr}`);
    assert.ok(run.report, `${name}: relatório`);
    assert.deepEqual(run.report.delivery, DELIVERED_AUTO(1), name);
    runs.push({ name, payload, observed: run.report.events[0] });
  }
  const [session] = [...new Set(runs.map((r) => r.payload.session_id))];
  assert.equal(automaticOf(root).length, 1, "uma sessão, uma captura");
  const capture = captureOfSession(root, session);
  const { records } = exportOf(root, capture.id);
  assert.equal(records.length, runs.length);
  for (const [index, record] of records.entries()) {
    const { name, payload, observed } = runs[index];
    assert.deepEqual(record.envelope.source, CODEX_HOOK_SOURCE, name);
    assert.equal(record.envelope.signal, "native_hook", name);
    sameEnvelope(record.envelope, observed, name);
    assertIds(root, capture.id, record.envelope, payload, CODEX_HOOK_IDS, name);
  }
  assertSameAsIngest(root, "codex-hooks", runs.map((r) => r.payload), records, "Codex");

  // Ler SKILL.md: a timeline tem a operação de ferramenta e nenhuma invocação
  // ou evidência de skill; o relatório não observa nome de skill.
  const timeline = privacyOk(["timeline", "--root", root, "--capture", capture.id]);
  const read = runs.findIndex((r) => r.name === "pre_tool_read_skill_md") + 1;
  assert.ok(read > 0);
  assert.ok(timeline.operations.some((op) => op.type === "tool" && op.evidence.includes(read)), "leitura de SKILL.md é operação de ferramenta");
  assert.deepEqual(timeline.operations.filter((op) => op.type === "skill_invocation" || op.type === "skill_evidence"), [], "nenhuma ativação de skill");
  assert.ok(!timeline.entries.some((e) => e.eventKind === "skill_invocation" || e.eventKind === "skill_lifecycle"));
  const skillFile = path.join(scratch("i23 c7 skill"), "third-party-skill", "SKILL.md");
  mkdirSync(path.dirname(skillFile));
  writeFileSync(skillFile, "---\nname: third-party-skill\n---\n\n- Run `npm test`.\n");
  const report = runIntegrations(["report", "--latest", "--skill", skillFile, "--format", "json"], { env });
  assert.equal(report.status, 0, report.stdout);
  const skill = JSON.parse(report.stdout).skill;
  assert.deepEqual([skill.identification, skill.observedName, skill.observedNames], ["explicit_path", null, []], "nome de skill não inferido da leitura");
});

// O I23-C10 e as provas do diagnóstico dele (I25-C47, issue #25, AC8) passam
// pela mesma rotina: cada etapa inicia os produtores dela juntos, cada um com a
// pré-carga de tempos existente (só observa), e confere a entrega de cada um.
// Na CI 40514323240 o "codex A 0" saiu com delivery_timeout sem operação nem
// estado; a evidência os põe na mensagem quando uma entrega sai do esperado,
// sem caminho, conteúdo, ID, chave ou ambiente. Diagnóstico, não correção: linha
// "Diagnóstico do I23-C10" do Landing em .checks/issue-25-agent-launch.md.
// O mesmo valor nativo em Claude e Codex são duas sessões (o agente entra no vínculo).
const SESSION_A = "sessao-a-c10-ação";
const SESSION_B = "sessao-b-c10";

function c10Sessions(env) {
  const hook = (label, agent, native, prefix, start) => ({
    label,
    agent,
    native,
    call: (i) => `${prefix}-${i}`,
    step: (i) => ({ label: `${label} ${i}`, start: (extra) => start({ session_id: native, tool_use_id: `${prefix}-${i}` }, { ...env, ...extra }) }),
  });
  return [
    hook("claude A", "claude", SESSION_A, "chamada-a", (ids, runEnv) => runClaude(claudePayload("pre_tool_bash", ids), runEnv)),
    hook("claude B", "claude", SESSION_B, "chamada-b", (ids, runEnv) => runClaude(claudePayload("pre_tool_bash", ids), runEnv)),
    hook("codex A", "codex", SESSION_A, "chamada-x", (ids, runEnv) => runCodex(codexHookPayload("pre_tool_bash", ids), runEnv)),
  ];
}

// Inicia juntos os produtores da etapa, cada um com o próprio arquivo de tempos;
// `injected[rótulo]` acrescenta ao ambiente de um deles uma injeção existente da
// pré-carga (só nas provas do C47).
let timingFiles = 0;
async function runStep(step, times, injected = {}) {
  return Promise.all(
    step.map(({ label, start }) => {
      const timing = path.join(times, `${(timingFiles += 1)}.ndjson`);
      return start({ ...timedEnv(timing), ...injected[label] }).then((run) => ({ label, run, timing }));
    }),
  );
}

// Lugar de uma operação em relação ao lock. Na gravação automática uma tomada
// pode renomear mais de um state.json.tmp (captura nova e commit), então aqui
// não se diz "antes/depois do commit".
const placeOf = ({ held, hold, kind }) => (held ? `sob o lock, ${hold}ª tomada` : kind === "lock" ? "tomada do lock" : "fora do lock");
const isContention = ({ op, kind, code }) => op === "open" && kind === "lock" && code === "EEXIST";
const isAbsence = ({ op, code }) => op === "lstat" && code === "ENOENT";

// Da linha da pré-carga de um produtor: o resumo de sempre, com as falhas que
// não são disputa do lock nem conferência de ausência, e a última operação
// concluída — uma que nunca terminou não aparece na linha.
function hookTiming(file) {
  const lines = timingLines(file);
  if (lines.length === 0) return { unavailable: "sem linha da pré-carga" };
  const trace = diskTrace(lines.at(-1).ops);
  const failures = trace.filter((e) => e.code !== undefined && !isContention(e) && !isAbsence(e)).map((e) => `${e.op} ${e.kind} ${e.code} (${placeOf(e)})`);
  const last = trace.at(-1);
  return {
    lines: lines.length,
    failures,
    contention: trace.filter(isContention).length,
    absences: trace.filter(isAbsence).length,
    last: last === undefined ? "nenhuma" : `${last.op} ${last.kind}${last.code === undefined ? "" : ` ${last.code}`} (${placeOf(last)})`,
    summary: describeTiming({ ...deliveryTiming(lines.at(-1)), failed: failures }),
  };
}

// Da raiz, depois que a etapa terminou: as capturas automáticas pelo `privacy
// list`, como o usuário as consulta, sem ID; os arquivos e o lock lidos direto.
function rootEvidence(root) {
  const captures = inspected(() => {
    const listed = privacyBody(["list", "--root", root]);
    if (listed.unavailable !== undefined) return listed;
    const automatic = listed.body.captures.filter((capture) => capture.origin === "automatic");
    return { rows: automatic.map((c) => `${c.state} accepted ${c.counters.accepted} persisted ${c.counters.persisted}`).sort() };
  });
  const files = inspected(() => {
    let names;
    try {
      names = readdirSync(capturesDir(root));
    } catch (error) {
      if (error.code === "ENOENT") return { segments: 0, temporaries: 0 };
      throw error;
    }
    const inside = names.filter((name) => /^[0-9a-f]{32}$/.test(name)).flatMap((name) => readdirSync(path.join(capturesDir(root), name)));
    return { segments: inside.filter((name) => /^events-\d{6}\.ndjson$/.test(name)).length, temporaries: inside.filter((name) => name.endsWith(".skill-me-tmp")).length };
  });
  const lock = inspected(() => ({ present: readdirSync(storeDir(root)).includes(".lock") }));
  return { captures, files, lock };
}

// Nunca lança: o que não pôde ser lido aparece como indisponível.
function stepEvidence(root, produced) {
  return {
    producers: produced.map(({ label, run, timing }) => ({ label, status: run.status, delivery: run.report?.delivery ?? null, timing: inspected(() => hookTiming(timing)) })),
    root: inspected(() => rootEvidence(root)),
  };
}

function describeStep({ producers, root }) {
  const lines = producers.flatMap(({ label, status, delivery, timing }) => [
    `produtor ${label}: status ${status}; entrega ${delivery === null ? "sem relatório" : JSON.stringify(delivery)}`,
    `  tempos: ${shown(timing, (t) => `${t.summary}; lock ocupado (EEXIST, repetido) ${t.contention}x; ausências conferidas (lstat ENOENT) ${t.absences}x; última concluída: ${t.last}${t.lines === 1 ? "" : `; ${t.lines} linhas da pré-carga`}`)}`,
  ]);
  const described = shown(root, ({ captures, files, lock }) =>
    [
      `capturas automáticas ${shown(captures, (c) => `${c.rows.length} [${c.rows.join("; ")}]`)}`,
      `pasta das capturas ${shown(files, (f) => `${f.segments} segmento(s), ${f.temporaries} temporário(s)`)}`,
      `lock ${shown(lock, (l) => (l.present ? "presente" : "ausente"))}`,
    ].join("; "),
  );
  return [...lines, `raiz: ${described}`].join("\n");
}

// As asserções de sempre da etapa. A evidência só é calculada, e só entra na
// mensagem, quando alguma entrega sai do esperado: a execução saudável não ganha
// chamadas de CLI.
function assertStepDelivered(root, produced, expected) {
  const healthy = produced.every(({ run }) => isDeepStrictEqual(run.report?.delivery, expected));
  const diagnosis = healthy ? null : describeStep(stepEvidence(root, produced));
  for (const { label, run } of produced) assert.deepEqual(run.report?.delivery, expected, diagnosis === null ? label : `${label}\n${diagnosis}`);
}

test("I23-C10 sessões concorrentes ficam isoladas: sessões intercaladas e simultâneas têm captura e chave próprias, e o relatório de uma não traz a outra", async () => {
  const { root, env } = prepareObservation(scratch, "i23 c10");
  observeOk(["on"], env);
  const A = SESSION_A;
  const B = SESSION_B;
  const sessions = c10Sessions(env);
  const times = scratch("i23 c10 tempos");
  // Intercaladas, uma de cada vez; depois simultâneas, disputando o lock.
  for (let round = 0; round < 2; round++) {
    for (const s of sessions) assertStepDelivered(root, await runStep([s.step(round)], times), DELIVERED_AUTO(1));
  }
  for (let round = 2; round < 4; round++) {
    assertStepDelivered(root, await runStep(sessions.map((s) => s.step(round)), times), DELIVERED_AUTO(1));
  }
  // Hermes: um processo com duas sessões intercaladas.
  const hermesLines = Array.from({ length: 10 }, (_, i) => [hermesRecord("pre_tool_call", { session_id: "hermes-h1", tool_call_id: `chamada-h1-${i}` }), hermesRecord("pre_tool_call", { session_id: "hermes-h2", tool_call_id: `chamada-h2-${i}` })]).flat();
  assertStepDelivered(root, await runStep([{ label: "hermes", start: (extra) => runHermesIngest(hermesLines, { env: { ...env, ...extra } }) }], times), DELIVERED_AUTO(20));

  const captures = automaticOf(root);
  assert.equal(captures.length, 5, "uma captura por sessão de cada agente");
  assert.equal(new Set(captures.map((c) => readFileSync(path.join(captureDir(root, c.id), "key")).toString("hex"))).size, 5, "chaves próprias");
  const owners = new Map();
  for (const capture of captures) {
    const { records } = exportOf(root, capture.id);
    const agents = new Set(records.map((r) => r.envelope.source.agent));
    assert.equal(agents.size, 1, "um agente por captura");
    const [agent] = agents;
    const candidates = agent === "hermes" ? ["hermes-h1", "hermes-h2"] : [A, B];
    const matching = candidates.filter((native) => records.every((r) => r.envelope.ids.sessionId === expectedPseudonym(root, capture.id, native)));
    assert.equal(matching.length, 1, `${capture.id}: uma só sessão`);
    owners.set(`${agent} ${matching[0]}`, { capture, records });
  }
  assert.deepEqual([...owners.keys()].sort(), ["claude sessao-a-c10-ação", "claude sessao-b-c10", "codex sessao-a-c10-ação", "hermes hermes-h1", "hermes hermes-h2"]);
  for (const s of sessions) {
    const { capture, records } = owners.get(`${s.agent} ${s.native}`);
    const calls = records.map((r) => r.envelope.ids.toolUseId);
    assert.deepEqual([...calls].sort(), [0, 1, 2, 3].map((i) => expectedPseudonym(root, capture.id, s.call(i))).sort(), `${s.label}: exatamente os seus eventos`);
  }
  for (const h of ["h1", "h2"]) {
    const { capture, records } = owners.get(`hermes hermes-${h}`);
    assert.deepEqual(records.map((r) => r.envelope.ids.toolCallId), Array.from({ length: 10 }, (_, i) => expectedPseudonym(root, capture.id, `chamada-${h}-${i}`)));
  }

  // O mapa sessão → captura guarda só o HMAC publicado; nenhum ID nativo vai ao disco.
  const state = readObserveState(root);
  const tag = (agent, native) => createHmac("sha256", Buffer.from(state.sessionKey, "hex")).update(`${agent}\0${native}`, "utf8").digest("hex");
  assert.deepEqual(state.sessions, Object.fromEntries([...owners.entries()].map(([key, { capture }]) => [tag(...key.split(" ")), capture.id])));
  assertAbsentOnDisk(root, [A, B, "hermes-h1", "hermes-h2", ...sessions.flatMap((s) => [0, 1, 2, 3].map((i) => s.call(i)))], "C10");

  // Relatório de uma sessão: só os eventos dela, com os pseudônimos da chave dela.
  const skillFile = path.join(scratch("i23 c10 skill"), "SKILL.md");
  writeFileSync(skillFile, "---\nname: demo\n---\n\n- Run `npm test`.\n");
  const a = owners.get(`claude ${A}`);
  const run = runIntegrations(["report", "--root", root, "--capture", a.capture.id, "--skill", skillFile, "--format", "json"]);
  assert.equal(run.status, 0, run.stdout);
  const timeline = JSON.parse(run.stdout).timeline;
  assert.equal(timeline.entries.length, 4);
  assert.ok(timeline.entries.every((e) => e.ids.sessionId === expectedPseudonym(root, a.capture.id, A)));
  for (const foreign of [B, ...[0, 1, 2, 3].flatMap((i) => [`chamada-b-${i}`, `chamada-x-${i}`])]) assert.ok(!run.stdout.includes(expectedPseudonym(root, a.capture.id, foreign)), foreign);
  for (const [key, { records }] of owners) {
    if (key === `claude ${A}`) continue;
    for (const r of records) assert.ok(!run.stdout.includes(r.envelope.ids.sessionId), `${key} no relatório de claude A`);
  }
});

// I25-C47 (issue #25, AC8): o diagnóstico do I23-C10 pela mesma rotina, numa
// raiz observada nova, com uma injeção existente da pré-carga só no hook da
// sessão Codex A na primeira entrega dela — o "codex A 0" da CI 40514323240. Na
// prova antiga a mensagem era só o rótulo; aqui a asserção continua vermelha e
// a evidência diz a operação, onde ela parou e o estado da raiz.
async function codexFirstDelivery(label, injection) {
  const { root, home, env } = prepareObservation(scratch, `i25 c47 ${label}`);
  observeOk(["on"], env);
  const codexA = c10Sessions(env).find((s) => s.label === "codex A");
  const produced = await runStep([codexA.step(0)], scratch(`i25 c47 ${label} tempos`), { "codex A 0": injection });
  const evidence = stepEvidence(root, produced);
  let failure = null;
  try {
    assertStepDelivered(root, produced, DELIVERED_AUTO(1));
  } catch (error) {
    failure = error;
  }
  return { root, home, env, produced, evidence, failure };
}

// Falhou a asserção de sempre (`actual` e `expected` dela), e a mensagem começa
// pelo rótulo e pela evidência inteira; o Node anexa o diff depois.
function assertRedWithEvidence({ produced, evidence, failure }) {
  assert.ok(failure instanceof assert.AssertionError, `a asserção do I23-C10 continua vermelha: ${failure}`);
  assert.deepEqual([failure.actual, failure.expected], [produced[0].run.report.delivery, DELIVERED_AUTO(1)]);
  assert.ok(failure.message.startsWith(`codex A 0\n${describeStep(evidence)}`), failure.message);
}

function assertNoLeak({ root, home, env }, text) {
  const captures = existsSync(capturesDir(root)) ? readdirSync(capturesDir(root)).filter((name) => /^[0-9a-f]{32}$/.test(name)) : [];
  const keys = captures.flatMap((id) => {
    const key = readFileSync(path.join(captureDir(root, id), "key"));
    return [key.toString("hex"), key.toString("base64"), key.toString("base64url")];
  });
  for (const value of [root, home, ...captures, ...keys, SESSION_A, "chamada-x-0", env.PATH, process.env.PATH].filter(Boolean)) {
    assert.ok(!text.includes(value), "a evidência não traz caminho, ID, chave, sessão nativa nem ambiente");
  }
  assert.deepEqual(leaks(text), []);
}

test("I25-C47 diagnóstico do I23-C10: falha de E/S na gravação do hook mantém a asserção vermelha e mostra a operação, a tomada do lock e o estado da raiz, sem vazar dados", async () => {
  const outcome = await codexFirstDelivery("eio", { SKILL_ME_TEST_TRACES_SEGMENT_EIO: "1" });
  assertRedWithEvidence(outcome);
  const { produced, evidence, failure } = outcome;
  assert.deepEqual(produced[0].run.report.delivery, { automatic: true, code: "io_failure", entries: 1, committed: 0, persisted: 0, lost: 1, unrouted: 0 });
  const [{ timing }] = evidence.producers;
  assert.deepEqual([timing.failures, timing.contention, timing.absences], [["rename segmento.tmp EIO (sob o lock, 2ª tomada)"], 0, 1], "a injeção aconteceu, sem nova tentativa");
  // A captura da sessão nasceu na mesma tomada, antes do segmento que falhou.
  assert.deepEqual(evidence.root, { captures: { rows: ["active accepted 0 persisted 0"] }, files: { segments: 0, temporaries: 0 }, lock: { present: false } });
  assert.ok(failure.message.includes("falhas rename segmento.tmp EIO (sob o lock, 2ª tomada)"), failure.message);
  assert.ok(failure.message.includes("ausências conferidas (lstat ENOENT) 1x"), failure.message);
  assert.ok(failure.message.includes("raiz: capturas automáticas 1 [active accepted 0 persisted 0]; pasta das capturas 0 segmento(s), 0 temporário(s); lock ausente"), failure.message);
  assertNoLeak(outcome, failure.message);
});

test("I25-C47 diagnóstico do I23-C10: disco parado no hook (delivery_timeout, o sintoma da CI 40514323240) mostra a última operação concluída e a inspeção da raiz indisponível com o código", async () => {
  const outcome = await codexFirstDelivery("parado", { SKILL_ME_TEST_TRACES_STALL_SEGMENT: "1" });
  assertRedWithEvidence(outcome);
  const { produced, evidence, failure } = outcome;
  assert.deepEqual(produced[0].run.report.delivery, { automatic: true, code: "delivery_timeout", entries: 1, committed: 0, persisted: 0, lost: 1, unrouted: 0 });
  const [{ timing }] = evidence.producers;
  assert.deepEqual([timing.failures, timing.last], [[], "close key (sob o lock, 2ª tomada)"], "parou na criação do segmento, depois de ler a chave");
  // O hook saiu no prazo com o lock tomado (limite do guia): a consulta sai com o código dele.
  assert.deepEqual(evidence.root, { captures: { unavailable: "lock_present" }, files: { segments: 0, temporaries: 0 }, lock: { present: true } });
  assert.ok(failure.message.includes("última concluída: close key (sob o lock, 2ª tomada)"), failure.message);
  assert.ok(failure.message.includes("raiz: capturas automáticas indisponível [lock_present]; pasta das capturas 0 segmento(s), 0 temporário(s); lock presente"), failure.message);
  assertNoLeak(outcome, failure.message);
});

test("I23-C14 falha de entrega não bloqueia agente: lock ocupado ou raiz ausente deixam hooks com 0 e saídas vazias, e status não promete captura", async () => {
  const { root, env } = prepareObservation(scratch, "i23 c14");
  observeOk(["on"], env);
  const lock = path.join(storeDir(root), ".lock");
  const foreign = "lock de outro processo\n";
  writeFileSync(lock, foreign);

  // Uso normal (sem o relatório de fixture): o agente não vê nada.
  const normal = [
    await runClaudeHandler(claude.handlers.PreToolUse.handler, claudePayload("pre_tool_bash"), { env, cwd: claude.cwd, reportFd: null }),
    await runCodex(codexHookPayload("pre_tool_bash"), env, { reportFd: null }),
    await runHermesIngest([hermesRecord("pre_tool_call")], { env, fixtureReport: false }),
  ];
  for (const run of normal) {
    assert.deepEqual([run.status, run.stdout, run.stderr], [0, "", ""]);
  }
  // O prazo da entrega vale: o lock alheio nunca sai, e o hook não o espera.
  for (const run of normal.slice(0, 2)) assert.ok(run.elapsedMs < DELIVERY_DEADLINE_MS + 5000, `${run.elapsedMs} ms`);
  const reported = await runClaude(claudePayload("pre_tool_bash"), env);
  assert.deepEqual(reported.report.delivery, lostAll("lock_present"));
  assert.equal(readFileSync(lock, "utf8"), foreign, "lock alheio preservado");
  assert.ok(!existsSync(path.join(storeDir(root), "captures")), "nada gravado");

  // status responde o conflito, sem afirmar estado nem captura.
  const busy = runNpmScript("status", { env });
  assert.equal(busy.status, 4, busy.stdout);
  assert.deepEqual(busy.body, { schemaVersion: 1, command: "status", status: "error", error: { code: "lock_present" } });
  unlinkSync(lock);
  const quiet = runNpmScript("status", { env });
  assert.deepEqual([quiet.body.observation.state, quiet.body.automaticCaptures, quiet.body.captures], ["on", 0, []], "on não significa captura gravada");

  // Lock que aparece depois da abertura e antes da gravação: a tentativa acaba
  // no prazo da entrega, contado do evento lido, e o processo sai em seguida.
  const lockAt = (ms) => setTimeout(() => writeFileSync(lock, foreign), ms);
  lockAt(500);
  const lateHook = await runInternal(["hook", "--agent", "claude"], { env, cwd: claude.cwd, stdinText: JSON.stringify(claudePayload("pre_tool_bash")), writeAfterMs: 1000 });
  unlinkSync(lock);
  lockAt(500);
  const lateIngest = await runInternal(["ingest", "--agent", "hermes"], { env, cwd: claude.cwd, lines: [1000, JSON.stringify(hermesRecord("pre_tool_call")) + "\n"] });
  unlinkSync(lock);
  for (const run of [lateHook, lateIngest]) {
    assert.deepEqual([run.status, run.stdout, run.stderr], [0, "", ""]);
    assert.deepEqual(run.report.delivery, lostAll("lock_present"));
    assert.ok(run.closedAt - run.stdinClosedAt < DELIVERY_DEADLINE_MS + 1500, `${Math.round(run.closedAt - run.stdinClosedAt)} ms do fim do stdin à saída`);
  }
  assert.ok(!existsSync(path.join(storeDir(root), "captures")), "nada gravado");

  // Raiz indisponível: nada é recriado e o agente segue.
  const away = `${root} fora`;
  renameSync(root, away);
  for (const run of [await runClaude(claudePayload("pre_tool_bash"), env), await runCodex(codexHookPayload("pre_tool_bash"), env)]) {
    assert.deepEqual([run.status, run.stdout], [0, ""]);
    assert.deepEqual(run.report.delivery, lostAll("root_not_found"));
  }
  assert.ok(!existsSync(root), "raiz não recriada");
  const missing = runObserve(["status"], { env });
  assert.deepEqual([missing.status, missing.body.error.code], [3, "root_not_found"]);
  renameSync(away, root);
  const store = snapshotTree(storeDir(root));
  assert.deepEqual(Object.keys(store).filter((rel) => rel.startsWith("captures")), [], "nenhuma captura de entrega falha");
});
