import KWARGS from "../hermes/plugin/kwargs.json" with { type: "json" };
import { isRecord, pick } from "./shared.mjs";

// Contrato: Hermes 0.21.4 local (locais de disparo citados no plano). O plugin
// Python envia `{hook, kwargs, nonScalar}` com SOMENTE os nomes listados em
// kwargs.json — o mesmo arquivo importado aqui, para que a lista de nomes que
// sai do processo do agente e a lista lida pela fronteira sejam uma só. Valor
// não escalar chega só nomeado em `nonScalar` e vira `invalid_type`.
const SOURCE = Object.freeze({ agent: "hermes", mechanism: "python_plugin", contract: KWARGS.contract });

// Marca de valor não escalar: um objeto nunca passa pela checagem de tipo.
const NON_SCALAR = Object.freeze({});

const STATUS_TO_OUTCOME = { ok: "success", error: "failure", blocked: "blocked" };

function toolIds(kw) {
  return { sessionId: kw.session_id, taskId: kw.task_id, toolCallId: kw.tool_call_id, turnId: kw.turn_id };
}

const MAPPERS = {
  pre_tool_call: (kw) => ({ eventKind: "tool_pre", ids: toolIds(kw), fields: { toolName: kw.tool_name } }),
  post_tool_call(kw) {
    const mapped = {
      eventKind: "tool_post",
      ids: toolIds(kw),
      fields: { toolName: kw.tool_name, outcome: undefined, errorType: kw.error_type, durationMs: kw.duration_ms },
    };
    if (typeof kw.status === "string") {
      const outcome = pick(STATUS_TO_OUTCOME, kw.status);
      if (outcome) mapped.fields.outcome = outcome;
      else mapped.fieldGaps = { outcome: "unrecognized_value" };
    } else if (kw.status !== undefined && kw.status !== null) {
      mapped.fieldGaps = { outcome: "invalid_type" };
    }
    return mapped;
  },
  on_skill_lifecycle: (kw) => ({
    eventKind: "skill_lifecycle",
    ids: { sessionId: kw.session_id, taskId: kw.task_id },
    fields: {
      action: kw.action,
      skillName: kw.skill_name,
      provenance: kw.provenance,
      useCount: kw.use_count,
      reused: kw.reused,
      reuseAfterPatch: kw.reuse_after_patch,
    },
  }),
  on_session_start: (kw) => ({ eventKind: "session_start", ids: { sessionId: kw.session_id }, fields: { platform: kw.platform } }),
  // `run_conversation()` dispara on_session_end uma vez por mensagem
  // (agent/turn_finalizer.py): é fim do run/turno observado, nunca fim da
  // sessão nem da skill — por isso vira `turn_end`.
  on_session_end: (kw) => ({
    eventKind: "turn_end",
    ids: { sessionId: kw.session_id, taskId: kw.task_id, turnId: kw.turn_id },
    fields: { completed: kw.completed, failed: kw.failed, interrupted: kw.interrupted },
  }),
  subagent_start: (kw) => ({
    eventKind: "subagent_start",
    ids: {
      parentSessionId: kw.parent_session_id,
      parentTurnId: kw.parent_turn_id,
      parentSubagentId: kw.parent_subagent_id,
      childSessionId: kw.child_session_id,
      subagentId: kw.child_subagent_id,
    },
    fields: { childRole: kw.child_role },
  }),
  subagent_stop: (kw) => ({
    eventKind: "subagent_stop",
    ids: { parentSessionId: kw.parent_session_id, parentTurnId: kw.parent_turn_id, childSessionId: kw.child_session_id },
    fields: { childRole: kw.child_role, childStatus: kw.child_status, durationMs: kw.duration_ms },
  }),
};

// Restringe o registro recebido aos nomes listados, mesmo que o emissor
// mande algo a mais: o adaptador nunca lê um nome fora da lista.
function listedKwargs(hook, record) {
  const kw = {};
  for (const nameListed of KWARGS.hooks[hook]) {
    if (record.nonScalar.includes(nameListed)) kw[nameListed] = NON_SCALAR;
    else if (Object.prototype.hasOwnProperty.call(record.kwargs, nameListed)) kw[nameListed] = record.kwargs[nameListed];
  }
  return kw;
}

export function hermesDraft(record) {
  if (
    !isRecord(record) ||
    typeof record.hook !== "string" ||
    !isRecord(record.kwargs) ||
    !Array.isArray(record.nonScalar) ||
    !record.nonScalar.every((entry) => typeof entry === "string")
  ) {
    return { kind: "invalid" };
  }
  const mapper = pick(MAPPERS, record.hook);
  if (!mapper || !pick(KWARGS.hooks, record.hook)) return { kind: "unknown" };
  return {
    kind: "draft",
    draft: { source: SOURCE, signal: "native_plugin", nativeEvent: record.hook, ...mapper(listedKwargs(record.hook, record)) },
  };
}
