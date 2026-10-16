import assert from "node:assert/strict";
import test from "node:test";
import { buildEnvelope, validateEnvelope, EVENT_KIND_FIELDS } from "../../src/integrations/boundary.mjs";
import { claudeHookDraft } from "../../src/integrations/adapters/claude.mjs";
import { codexHookDraft } from "../../src/integrations/adapters/codex-hooks.mjs";
import { codexExecDraft, processExitDraft } from "../../src/integrations/adapters/codex-exec.mjs";
import { hermesDraft } from "../../src/integrations/adapters/hermes.mjs";
import { loadFixture } from "./helpers/fixtures.mjs";

const FIXED_NOW = () => new Date("2026-10-16T12:00:00.000Z");
const SOURCE = { agent: "claude", mechanism: "command_hook", contract: "claude-code-hooks@docs-2026-10-16" };

function draft(overrides) {
  return {
    source: SOURCE,
    signal: "native_hook",
    eventKind: "tool_post",
    nativeEvent: "PostToolUseFailure",
    ids: {},
    fields: {},
    ...overrides,
  };
}

test("I4-C3b lacunas: ausente, tipo errado e enum desconhecido nunca viram valor", () => {
  const result = buildEnvelope(
    draft({
      ids: { sessionId: "sess-1", toolUseId: undefined, agentId: null, promptId: 42 },
      fields: {
        toolName: "Bash",
        outcome: "failure",
        interrupted: "yes",
        durationMs: -5,
        errorType: undefined,
      },
    }),
    { now: FIXED_NOW },
  );
  assert.equal(result.ok, true);
  const { envelope } = result;
  assert.deepEqual(envelope.ids, { sessionId: "sess-1" });
  assert.deepEqual(envelope.fields, { toolName: "Bash", outcome: "failure" });
  assert.deepEqual(
    [...envelope.gaps].sort(),
    [
      "agentId:absent",
      "durationMs:invalid_type",
      "errorType:absent",
      "interrupted:invalid_type",
      "promptId:invalid_type",
      "toolUseId:absent",
    ].sort(),
  );

  const enumCase = buildEnvelope(
    draft({ eventKind: "session_start", nativeEvent: "SessionStart", fields: { source: "teleport" } }),
    { now: FIXED_NOW },
  );
  assert.deepEqual(enumCase.envelope.fields, {});
  assert.deepEqual([...enumCase.envelope.gaps].sort(), ["platform:not_in_contract", "source:unrecognized_value"]);

  // Campo do eventKind que o contrato do agente não fornece (chave ausente do
  // rascunho) vira `not_in_contract`, distinto de `absent`.
  const notInContract = buildEnvelope(draft({ fields: { toolName: "Bash" } }), { now: FIXED_NOW });
  assert.deepEqual(notInContract.envelope.fields, { toolName: "Bash" });
  assert.deepEqual(
    [...notInContract.envelope.gaps].sort(),
    ["durationMs:not_in_contract", "errorType:not_in_contract", "interrupted:not_in_contract", "outcome:not_in_contract"],
  );

  // Lacuna explícita do adaptador (valor nativo sem tradução) prevalece.
  const explicit = buildEnvelope(
    draft({ fields: { toolName: "Bash", outcome: undefined }, fieldGaps: { outcome: "unrecognized_value" } }),
    { now: FIXED_NOW },
  );
  assert.deepEqual(explicit.envelope.fields, { toolName: "Bash" });
  assert.ok(explicit.envelope.gaps.includes("outcome:unrecognized_value"));
  assert.ok(!explicit.envelope.gaps.includes("outcome:absent"));
  assert.deepEqual(
    buildEnvelope(draft({ fields: {}, fieldGaps: { outcome: "made_up" } }), { now: FIXED_NOW }),
    { ok: false, reason: "invalid_draft" },
  );
  assert.equal(explicit.envelope.observedAt, "2026-10-16T12:00:00.000Z");
});

// Seis categorias que nunca saem do debugger, com os nomes nativos que o plano
// atribui a cada uma ("Fora de toda saída do debugger") e um canário próprio.
const EXCLUDED = Object.freeze({
  args: ["tool_input", "args", "command_args", "arguments", "command"],
  result: ["tool_response", "result", "aggregated_output", "content"],
  prompt: ["prompt", "child_goal"],
  path: ["cwd", "transcript_path", "file_path", "changes"],
  reasoning: ["last_assistant_message", "reasoning"],
  error: ["error", "error_message", "message", "child_summary"],
});
const CATEGORIES = Object.keys(EXCLUDED);
const canary = (category) => `SKILLME-CANARY-${category}`;
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

// Acrescenta os nomes nativos das seis categorias, com o canário de cada uma, a
// um objeto de entrada. Um objeto já presente nesse nome (`tool_input` com
// `skill`, `error` com `message`) recebe o canário dentro dele, sem perder o
// que o adaptador lê.
function withCanaries(input) {
  const out = { ...input };
  for (const [category, keys] of Object.entries(EXCLUDED)) {
    for (const key of keys) {
      if (isObject(out[key])) out[key] = { ...out[key], value: canary(category) };
      else if (key === "changes") out[key] = [{ path: `/fixture/${canary(category)}/a.txt`, kind: "update" }];
      else out[key] = canary(category);
    }
  }
  return out;
}

function assertHasAllCanaries(input, label) {
  const text = JSON.stringify(input);
  for (const category of CATEGORIES) assert.ok(text.includes(canary(category)), `${label}: entrada sem o canário de ${category}`);
}

// Toda entrada válida de cada contrato, com as seis categorias injetadas antes
// de adaptador + fronteira. Hermes entra como registro bruto, sem projeção no
// teste: restringir aos nomes listados é papel do adaptador/fronteira.
function nativeInputsWithCanaries() {
  const out = [];
  for (const c of loadFixture("claude-hooks.json").cases.filter((c) => c.valid))
    out.push({ name: `claude/${c.name}`, input: withCanaries(c.payload), adapt: claudeHookDraft });
  for (const c of loadFixture("codex-hooks.json").cases.filter((c) => c.valid))
    out.push({ name: `codex-hooks/${c.name}`, input: withCanaries(c.payload), adapt: codexHookDraft });
  for (const c of loadFixture("codex-exec.json").cases.filter((c) => c.valid)) {
    const event = withCanaries(c.event);
    if (isObject(c.event.item)) event.item = withCanaries(c.event.item);
    out.push({ name: `codex-exec/${c.name}`, input: event, adapt: codexExecDraft });
  }
  for (const c of loadFixture("hermes-hooks.json").cases.filter((c) => c.valid))
    out.push({ name: `hermes/${c.name}`, input: { hook: c.hook, kwargs: withCanaries(c.kwargs), nonScalar: [] }, adapt: hermesDraft });
  // Fim do filho observado pelo wrapper: a observação também recebe as seis.
  out.push({ name: "codex-run/process_exit", input: withCanaries({ code: 17, signal: null }), adapt: processExitDraft });
  return out;
}

// Nomes de rascunho para as seis categorias; nenhum está na allowlist.
const DRAFT_KEYS = { args: "toolInput", result: "toolResponse", prompt: "prompt", path: "transcriptPath", reasoning: "lastAssistantMessage", error: "errorMessage" };

test("I4-C42 fronteira emite só a allowlist e nenhuma das seis categorias excluídas", () => {
  const representative = new Map();
  for (const { name, input, adapt } of nativeInputsWithCanaries()) {
    assertHasAllCanaries(input, name);
    const adapted = adapt(input);
    if (adapted.kind === "excluded") {
      assert.equal(adapted.reason, "reasoning", name);
      continue;
    }
    assert.equal(adapted.kind, "draft", name);
    const result = buildEnvelope(adapted.draft, { now: FIXED_NOW });
    assert.equal(result.ok, true, name);
    const json = JSON.stringify(result.envelope);
    for (const category of CATEGORIES) assert.ok(!json.includes(canary(category)), `${name} vazou ${category}`);
    assert.deepEqual(
      Object.keys(result.envelope),
      ["schemaVersion", "source", "signal", "eventKind", "nativeEvent", "ids", "fields", "gaps", "observedAt"],
      name,
    );
    for (const field of Object.keys(result.envelope.fields))
      assert.ok(EVENT_KIND_FIELDS[result.envelope.eventKind].includes(field), `${name}: ${field}`);
    assert.equal(validateEnvelope(result.envelope), true, name);
    if (!representative.has(result.envelope.eventKind)) representative.set(result.envelope.eventKind, adapted.draft);
  }
  // Todo eventKind do envelope v1 aparece, inclusive process_exit.
  assert.deepEqual([...representative.keys()].sort(), Object.keys(EVENT_KIND_FIELDS).sort());

  // Na própria fronteira, para cada eventKind: as seis categorias no rascunho
  // entregue a buildEnvelope. Como campo ou ID fora da allowlist, o rascunho é
  // recusado inteiro; dentro do valor de um campo/ID permitido, o tipo é
  // inválido, vira lacuna e nada do valor é emitido.
  const allCanaries = Object.fromEntries(CATEGORIES.map((category) => [category, canary(category)]));
  for (const [kind, base] of representative) {
    for (const category of CATEGORIES) {
      for (const where of ["fields", "ids"]) {
        const injected = { ...base, [where]: { ...base[where], [DRAFT_KEYS[category]]: canary(category) } };
        assert.ok(JSON.stringify(injected).includes(canary(category)), `${kind}/${where}/${category}`);
        assert.deepEqual(buildEnvelope(injected, { now: FIXED_NOW }), { ok: false, reason: "invalid_draft" }, `${kind}/${where}/${category}`);
      }
    }
    const { fieldGaps, ...withoutGaps } = base;
    const idKeys = Object.keys(base.ids);
    const fieldKeys = EVENT_KIND_FIELDS[kind];
    if (idKeys.length + fieldKeys.length === 0) continue;
    const nested = {
      ...withoutGaps,
      ids: Object.fromEntries(idKeys.map((key) => [key, { ...allCanaries }])),
      fields: Object.fromEntries(fieldKeys.map((key) => [key, { ...allCanaries }])),
    };
    assertHasAllCanaries(nested, `${kind}/valores`);
    const result = buildEnvelope(nested, { now: FIXED_NOW });
    assert.equal(result.ok, true, kind);
    assert.deepEqual(result.envelope.ids, {}, kind);
    assert.deepEqual(result.envelope.fields, {}, kind);
    assert.deepEqual([...result.envelope.gaps].sort(), [...idKeys, ...fieldKeys].map((key) => `${key}:invalid_type`).sort(), kind);
    assert.ok(!/SKILLME-CANARY/.test(JSON.stringify(result.envelope)), `${kind}: valores`);
  }

  // Campo ou ID fora da allowlist recusa o rascunho inteiro, nunca é emitido.
  for (const bad of [
    draft({ fields: { toolName: "Bash", toolInput: "SKILLME-CANARY-args" } }),
    draft({ ids: { sessionId: "s", transcriptPath: "SKILLME-CANARY-path" } }),
    draft({ eventKind: "tool_pre", nativeEvent: "PreToolUse", fields: { outcome: "success" } }),
    draft({ eventKind: "not_a_kind" }),
    draft({ signal: "inferred" }),
  ]) {
    const result = buildEnvelope(bad, { now: FIXED_NOW });
    assert.deepEqual(result, { ok: false, reason: "invalid_draft" });
  }

  // ID acima de 256 caracteres é omitido (truncar fabricaria outro ID).
  const longId = buildEnvelope(draft({ ids: { toolUseId: "x".repeat(257), sessionId: "y".repeat(256) } }), { now: FIXED_NOW });
  assert.deepEqual(longId.envelope.ids, { sessionId: "y".repeat(256) });
  assert.ok(longId.envelope.gaps.includes("toolUseId:too_long"));

  // Nome fora da regex é omitido sem truncar.
  const badName = buildEnvelope(
    draft({ eventKind: "tool_pre", nativeEvent: "PreToolUse", fields: { toolName: "rm -rf /; echo" } }),
    { now: FIXED_NOW },
  );
  assert.deepEqual(badName.envelope.fields, {});
  assert.deepEqual(badName.envelope.gaps, ["toolName:not_identifier"]);
  const longName = buildEnvelope(
    draft({ eventKind: "tool_pre", nativeEvent: "PreToolUse", fields: { toolName: "a".repeat(129) } }),
    { now: FIXED_NOW },
  );
  assert.deepEqual(longName.envelope.gaps, ["toolName:too_long"]);

  // Envelope serializado acima de 4096 bytes é recusado.
  const ids = {};
  for (const key of ["sessionId", "promptId", "turnId", "toolUseId", "toolCallId", "agentId", "taskId", "threadId", "itemId", "parentSessionId", "parentTurnId", "childSessionId", "subagentId", "parentSubagentId"])
    ids[key] = "i".repeat(256);
  const oversize = buildEnvelope(
    draft({ ids, fields: { toolName: "a".repeat(128), errorType: "b".repeat(128), outcome: "failure" } }),
    { now: FIXED_NOW },
  );
  assert.deepEqual(oversize, { ok: false, reason: "oversize" });
});
