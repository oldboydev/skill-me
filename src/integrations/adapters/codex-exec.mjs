import { isRecord, pick } from "./shared.mjs";

// Contrato: openai/codex tag rust-v0.162.1, codex-rs/exec/src/exec_events.rs
// (`ThreadEvent`; `ThreadItem` com `#[serde(flatten)]` sobre `type`). Itens
// `reasoning` são excluídos inteiros: nem o fato de existirem vira envelope.
// Textos (`text`, `command`, `aggregated_output`, `arguments`, `result`,
// `query`, `prompt`, `message`, `changes[].path`) nunca são lidos.
const SOURCE = Object.freeze({ agent: "codex", mechanism: "exec_jsonl", contract: "codex-exec-jsonl@rust-v0.162.1" });

const ITEM_PHASES = { "item.started": "started", "item.updated": "updated", "item.completed": "completed" };

// Campos que cada tipo de item realmente traz no contrato; os demais campos de
// `item` ficam `not_in_contract`. Tipo desconhecido só informa fase e tipo.
const ITEM_FIELDS = {
  command_execution: (item) => ({ status: item.status, exitCode: item.exit_code }),
  file_change: (item) => ({ status: item.status }),
  mcp_tool_call: (item) => ({ status: item.status, toolName: item.tool, mcpServer: item.server }),
  collab_tool_call: (item) => ({ status: item.status, collabTool: item.tool }),
  agent_message: () => ({}),
  web_search: () => ({}),
  todo_list: () => ({}),
  error: () => ({}),
};

function usageFields(usage) {
  const u = isRecord(usage) ? usage : {};
  return {
    inputTokens: u.input_tokens,
    cachedInputTokens: u.cached_input_tokens,
    cacheWriteInputTokens: u.cache_write_input_tokens,
    outputTokens: u.output_tokens,
    reasoningOutputTokens: u.reasoning_output_tokens,
  };
}

function itemMapping(event, phase) {
  const item = isRecord(event.item) ? event.item : {};
  if (item.type === "reasoning") return null;
  const perType = pick(ITEM_FIELDS, item.type);
  return {
    eventKind: "item",
    ids: { itemId: item.id },
    fields: { phase, itemType: item.type, ...(perType ? perType(item) : {}) },
  };
}

const MAPPERS = {
  "thread.started": (event) => ({ eventKind: "session_start", ids: { threadId: event.thread_id }, fields: {} }),
  "turn.started": () => ({ eventKind: "turn_start", ids: {}, fields: {} }),
  "turn.completed": (event) => ({
    eventKind: "turn_end",
    ids: {},
    fields: { outcome: "completed", ...usageFields(event.usage) },
  }),
  "turn.failed": () => ({ eventKind: "turn_end", ids: {}, fields: { outcome: "failed" } }),
  "item.started": (event) => itemMapping(event, ITEM_PHASES["item.started"]),
  "item.updated": (event) => itemMapping(event, ITEM_PHASES["item.updated"]),
  "item.completed": (event) => itemMapping(event, ITEM_PHASES["item.completed"]),
  error: () => ({ eventKind: "error", ids: {}, fields: {} }),
};

export function codexExecDraft(event) {
  if (!isRecord(event) || typeof event.type !== "string") return { kind: "invalid" };
  const mapper = pick(MAPPERS, event.type);
  if (!mapper) return { kind: "unknown" };
  const mapped = mapper(event);
  if (mapped === null) return { kind: "excluded", reason: "reasoning" };
  return { kind: "draft", draft: { source: SOURCE, signal: "supervised_exec", nativeEvent: event.type, ...mapped } };
}

// Término do processo filho, observado pelo próprio wrapper (não é evento do
// JSONL): o Node informa código ou sinal, e o outro vem nulo — vira lacuna
// `absent`, nunca um código inventado para sinal.
export function processExitDraft({ code, signal }) {
  const fields = { processExitCode: code, processSignal: signal };
  return {
    kind: "draft",
    draft: { source: SOURCE, signal: "supervised_exec", nativeEvent: "process.exit", eventKind: "process_exit", ids: {}, fields },
  };
}
