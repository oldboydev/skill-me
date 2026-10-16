import assert from "node:assert/strict";
import test from "node:test";
import { buildEnvelope, validateEnvelope, EVENT_KIND_FIELDS } from "../../src/integrations/boundary.mjs";
import { claudeHookDraft } from "../../src/integrations/adapters/claude.mjs";
import { codexHookDraft } from "../../src/integrations/adapters/codex-hooks.mjs";
import { codexExecDraft } from "../../src/integrations/adapters/codex-exec.mjs";
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

// Seis categorias que nunca podem sair do debugger, cada uma marcada por um
// canário próprio nas fixtures sintéticas. A tabela atravessa adaptador +
// fronteira para todo caso válido de cada contrato, cobrindo cada eventKind
// que esses contratos produzem.
const EXCLUDED_CATEGORIES = ["args", "result", "prompt", "path", "reasoning", "error"];

function allDraftsFromFixtures() {
  const out = [];
  for (const c of loadFixture("claude-hooks.json").cases.filter((c) => c.valid))
    out.push({ name: `claude/${c.name}`, adapted: claudeHookDraft(c.payload) });
  for (const c of loadFixture("codex-hooks.json").cases.filter((c) => c.valid))
    out.push({ name: `codex-hooks/${c.name}`, adapted: codexHookDraft(c.payload) });
  for (const c of loadFixture("codex-exec.json").cases.filter((c) => c.valid))
    out.push({ name: `codex-exec/${c.name}`, adapted: codexExecDraft(c.event) });
  for (const c of loadFixture("hermes-hooks.json").cases.filter((c) => c.valid)) {
    // Registro como o plugin Python o envia: só nomes listados, escalares
    // inalterados; aqui os valores não escalares são marcados à mão.
    const listed = {
      pre_tool_call: ["tool_name", "session_id", "task_id", "tool_call_id", "turn_id"],
      post_tool_call: ["tool_name", "session_id", "task_id", "tool_call_id", "turn_id", "status", "error_type", "duration_ms"],
      on_skill_lifecycle: ["action", "skill_name", "provenance", "task_id", "session_id", "use_count", "reused", "reuse_after_patch"],
      on_session_start: ["session_id", "platform"],
      on_session_end: ["session_id", "task_id", "turn_id", "completed", "failed", "interrupted"],
      subagent_start: ["parent_session_id", "parent_turn_id", "parent_subagent_id", "child_session_id", "child_subagent_id", "child_role"],
      subagent_stop: ["parent_session_id", "parent_turn_id", "child_session_id", "child_role", "child_status", "duration_ms"],
    }[c.hook];
    const kwargs = {};
    for (const name of listed) if (Object.hasOwn(c.kwargs, name)) kwargs[name] = c.kwargs[name];
    out.push({ name: `hermes/${c.name}`, adapted: hermesDraft({ hook: c.hook, kwargs, nonScalar: [] }) });
  }
  return out;
}

test("I4-C42 fronteira emite só a allowlist e nenhuma das seis categorias excluídas", () => {
  const kindsSeen = new Set();
  for (const { name, adapted } of allDraftsFromFixtures()) {
    if (adapted.kind === "excluded") {
      assert.equal(adapted.reason, "reasoning", name);
      continue;
    }
    assert.equal(adapted.kind, "draft", name);
    const result = buildEnvelope(adapted.draft, { now: FIXED_NOW });
    assert.equal(result.ok, true, name);
    const json = JSON.stringify(result.envelope);
    for (const category of EXCLUDED_CATEGORIES)
      assert.ok(!json.includes(`SKILLME-CANARY-${category}`), `${name} vazou ${category}`);
    assert.deepEqual(
      Object.keys(result.envelope),
      ["schemaVersion", "source", "signal", "eventKind", "nativeEvent", "ids", "fields", "gaps", "observedAt"],
      name,
    );
    for (const field of Object.keys(result.envelope.fields))
      assert.ok(EVENT_KIND_FIELDS[result.envelope.eventKind].includes(field), `${name}: ${field}`);
    assert.equal(validateEnvelope(result.envelope), true, name);
    kindsSeen.add(result.envelope.eventKind);
  }
  // Todo eventKind exceto process_exit (produzido pelo wrapper, coberto em C13/C38) aparece.
  assert.deepEqual(
    [...kindsSeen].sort(),
    Object.keys(EVENT_KIND_FIELDS).filter((kind) => kind !== "process_exit").sort(),
  );

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
