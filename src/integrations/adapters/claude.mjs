import { isRecord, pick } from "./shared.mjs";

// Contrato: code.claude.com/docs/en/hooks e /docs/en/permissions, consulta
// 16/10/2026 (campos comuns e de cada evento; `Skill(skill:<name>)` só existe
// para campo direto da entrada, logo a ferramenta Skill traz `tool_input.skill`).
// Só nomes são traduzidos aqui; tipos, limites e lacunas são da fronteira.
const SOURCE = Object.freeze({ agent: "claude", mechanism: "command_hook", contract: "claude-code-hooks@docs-2026-10-16" });

// `prompt_id` é comum a todo evento, mas ausente até a primeira entrada do
// usuário; `agent_id` só existe dentro de subagente. Os dois entram como
// previstos para que a ausência apareça como lacuna, nunca como valor.
function commonIds(payload) {
  return { sessionId: payload.session_id, promptId: payload.prompt_id, agentId: payload.agent_id };
}

function toolIds(payload) {
  return { ...commonIds(payload), toolUseId: payload.tool_use_id };
}

function skillName(payload) {
  return isRecord(payload.tool_input) ? payload.tool_input.skill : undefined;
}

const MAPPERS = {
  PreToolUse(payload) {
    if (payload.tool_name === "Skill") {
      return {
        eventKind: "skill_invocation",
        ids: toolIds(payload),
        fields: { invocationPath: "skill_tool", phase: "pre", skillName: skillName(payload) },
      };
    }
    return { eventKind: "tool_pre", ids: toolIds(payload), fields: { toolName: payload.tool_name } };
  },
  PostToolUse(payload) {
    if (payload.tool_name === "Skill") {
      return {
        eventKind: "skill_invocation",
        ids: toolIds(payload),
        fields: { invocationPath: "skill_tool", phase: "post", skillName: skillName(payload), outcome: "success" },
      };
    }
    return {
      eventKind: "tool_post",
      ids: toolIds(payload),
      fields: { toolName: payload.tool_name, outcome: "success", durationMs: payload.duration_ms },
    };
  },
  // `error` é texto livre (conteúdo) e nunca é lido; o contrato não traz
  // classificação de erro, então `errorType` fica `not_in_contract`.
  PostToolUseFailure(payload) {
    if (payload.tool_name === "Skill") {
      return {
        eventKind: "skill_invocation",
        ids: toolIds(payload),
        fields: {
          invocationPath: "skill_tool",
          phase: "post",
          skillName: skillName(payload),
          outcome: "failure",
          interrupted: payload.is_interrupt,
        },
      };
    }
    return {
      eventKind: "tool_post",
      ids: toolIds(payload),
      fields: {
        toolName: payload.tool_name,
        outcome: "failure",
        interrupted: payload.is_interrupt,
        durationMs: payload.duration_ms,
      },
    };
  },
  // `slash_command` cobre skills e comandos personalizados (o Claude trata os
  // dois como skill); decidir se o nome é de uma skill é atribuição da #6.
  // `prompt` e `command_args` são conteúdo e nunca são lidos.
  UserPromptExpansion(payload) {
    if (payload.expansion_type === "slash_command") {
      return {
        eventKind: "skill_invocation",
        ids: commonIds(payload),
        fields: {
          invocationPath: "direct_command",
          phase: "expansion",
          skillName: payload.command_name,
          commandSource: payload.command_source,
        },
      };
    }
    return {
      eventKind: "command_expansion",
      ids: commonIds(payload),
      fields: {
        expansionType: payload.expansion_type,
        commandName: payload.command_name,
        commandSource: payload.command_source,
      },
    };
  },
  SessionStart(payload) {
    return { eventKind: "session_start", ids: commonIds(payload), fields: { source: payload.source } };
  },
  SessionEnd(payload) {
    return { eventKind: "session_end", ids: commonIds(payload), fields: { reason: payload.reason } };
  },
  SubagentStart(payload) {
    return { eventKind: "subagent_start", ids: commonIds(payload), fields: { agentType: payload.agent_type } };
  },
  // `last_assistant_message` e `agent_transcript_path` nunca são lidos.
  SubagentStop(payload) {
    return { eventKind: "subagent_stop", ids: commonIds(payload), fields: { agentType: payload.agent_type } };
  },
};

export function claudeHookDraft(payload) {
  if (!isRecord(payload) || typeof payload.hook_event_name !== "string") return { kind: "invalid" };
  const mapper = pick(MAPPERS, payload.hook_event_name);
  if (!mapper) return { kind: "unknown" };
  const mapped = mapper(payload);
  return {
    kind: "draft",
    draft: { source: SOURCE, signal: "native_hook", nativeEvent: payload.hook_event_name, ...mapped },
  };
}
