import { isRecord, pick } from "./shared.mjs";

// Contrato: openai/codex tag rust-v0.162.1, codex-rs/hooks/src/schema.rs
// (`*CommandInput`). Não há ferramenta Skill nem evento de início de skill: ler
// SKILL.md é só uma chamada de ferramenta, sem atribuição. Hosted tools não
// passam por hooks locais (learn.chatgpt.com/docs/hooks, "Tool coverage").
const SOURCE = Object.freeze({ agent: "codex", mechanism: "command_hook", contract: "codex-hooks@rust-v0.162.1" });

// `agent_id` é Option nos eventos de ferramenta (só dentro de subagente).
function toolIds(payload) {
  return {
    sessionId: payload.session_id,
    turnId: payload.turn_id,
    agentId: payload.agent_id,
    toolUseId: payload.tool_use_id,
  };
}

function subagentIds(payload) {
  return { sessionId: payload.session_id, turnId: payload.turn_id, agentId: payload.agent_id };
}

const MAPPERS = {
  PreToolUse(payload) {
    return { eventKind: "tool_pre", ids: toolIds(payload), fields: { toolName: payload.tool_name } };
  },
  // `tool_response` é conteúdo e o contrato não traz sucesso/falha nem
  // duração: só `toolName` é fornecido; o resto vira `not_in_contract`.
  PostToolUse(payload) {
    return { eventKind: "tool_post", ids: toolIds(payload), fields: { toolName: payload.tool_name } };
  },
  SessionStart(payload) {
    return { eventKind: "session_start", ids: { sessionId: payload.session_id }, fields: { source: payload.source } };
  },
  SessionEnd(payload) {
    return { eventKind: "session_end", ids: { sessionId: payload.session_id }, fields: { reason: payload.reason } };
  },
  SubagentStart(payload) {
    return { eventKind: "subagent_start", ids: subagentIds(payload), fields: { agentType: payload.agent_type } };
  },
  SubagentStop(payload) {
    return { eventKind: "subagent_stop", ids: subagentIds(payload), fields: { agentType: payload.agent_type } };
  },
};

export function codexHookDraft(payload) {
  if (!isRecord(payload) || typeof payload.hook_event_name !== "string") return { kind: "invalid" };
  const mapper = pick(MAPPERS, payload.hook_event_name);
  if (!mapper) return { kind: "unknown" };
  return {
    kind: "draft",
    draft: { source: SOURCE, signal: "native_hook", nativeEvent: payload.hook_event_name, ...mapper(payload) },
  };
}
