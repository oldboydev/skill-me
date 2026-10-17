// Fronteira mínima compartilhada da issue #4 (recorte U1 aprovado em
// 16/10/2026). Única dona da allowlist, dos tipos, dos limites e das lacunas do
// envelope v1; os adaptadores só traduzem nomes nativos. A política integral de
// coleta continua com a #5 e o consumidor real com a #8 — ver "Fronteira mínima
// — assinatura fechada (U1)" em .tasks/issue-4-integracoes.md.

export const ENVELOPE_SCHEMA_VERSION = 1;

export const ENVELOPE_LIMITS = Object.freeze({
  maxEnvelopeBytes: 4096,
  maxIdLength: 256,
  maxNameLength: 128,
});

export const SIGNALS = Object.freeze(["native_hook", "native_plugin", "supervised_exec"]);

// O contrato é aquele contra o qual o adaptador leu o payload; nenhum payload
// nativo informa a versão do agente em execução, então nenhuma é inventada.
const SOURCES = Object.freeze([
  { agent: "claude", mechanism: "command_hook", contract: "claude-code-hooks@docs-2026-10-16" },
  { agent: "codex", mechanism: "command_hook", contract: "codex-hooks@rust-v0.162.1" },
  { agent: "codex", mechanism: "exec_jsonl", contract: "codex-exec-jsonl@rust-v0.162.1" },
  { agent: "hermes", mechanism: "python_plugin", contract: "hermes-plugin-hooks@0.21.4" },
]);

export const ID_NAMES = Object.freeze([
  "sessionId",
  "promptId",
  "turnId",
  "toolUseId",
  "toolCallId",
  "agentId",
  "taskId",
  "threadId",
  "itemId",
  "parentSessionId",
  "parentTurnId",
  "childSessionId",
  "subagentId",
  "parentSubagentId",
]);

export const GAP_REASONS = Object.freeze([
  "absent",
  "not_in_contract",
  "invalid_type",
  "too_long",
  "not_identifier",
  "unrecognized_value",
]);

// Nomes são identificadores, nunca texto livre: sem quebra de linha, aspas,
// ponto e vírgula ou barra invertida, e sem truncamento — um nome cortado
// seria um nome que o agente nunca emitiu.
const NAME_PATTERN = /^[\p{L}\p{N} ._:/@+-]+$/u;

const name = { type: "name" };
const boolean = { type: "boolean" };
const count = { type: "integer", min: 0 };
const enumOf = (...values) => ({ type: "enum", values: Object.freeze(values) });

const FIELD_TYPES = Object.freeze({
  toolName: name,
  skillName: name,
  commandName: name,
  commandSource: name,
  agentType: name,
  mcpServer: name,
  errorType: name,
  platform: name,
  childRole: name,
  childStatus: name,
  processSignal: name,
  invocationPath: enumOf("skill_tool", "direct_command"),
  phase: enumOf("pre", "post", "expansion", "started", "updated", "completed"),
  outcome: enumOf("success", "failure", "blocked", "completed", "failed"),
  expansionType: enumOf("slash_command", "mcp_prompt"),
  source: enumOf("startup", "resume", "clear", "compact", "fork"),
  reason: enumOf("clear", "resume", "logout", "prompt_input_exit", "other"),
  itemType: enumOf(
    "agent_message",
    "command_execution",
    "file_change",
    "mcp_tool_call",
    "collab_tool_call",
    "web_search",
    "todo_list",
    "error",
  ),
  status: enumOf("in_progress", "completed", "failed", "declined"),
  collabTool: enumOf("spawn_agent", "send_input", "wait", "close_agent"),
  action: enumOf("loaded", "patched", "edited", "created", "installed", "restored", "archived", "stale"),
  provenance: enumOf("installed", "agent_created", "external", "local", "unknown"),
  interrupted: boolean,
  completed: boolean,
  failed: boolean,
  reused: boolean,
  reuseAfterPatch: boolean,
  durationMs: count,
  useCount: count,
  inputTokens: count,
  cachedInputTokens: count,
  cacheWriteInputTokens: count,
  outputTokens: count,
  reasoningOutputTokens: count,
  exitCode: { type: "integer" },
  processExitCode: { type: "integer" },
});

export const EVENT_KIND_FIELDS = Object.freeze({
  tool_pre: Object.freeze(["toolName"]),
  tool_post: Object.freeze(["toolName", "outcome", "interrupted", "durationMs", "errorType"]),
  skill_invocation: Object.freeze(["invocationPath", "phase", "skillName", "commandSource", "outcome", "interrupted"]),
  command_expansion: Object.freeze(["expansionType", "commandName", "commandSource"]),
  skill_lifecycle: Object.freeze(["action", "skillName", "provenance", "useCount", "reused", "reuseAfterPatch"]),
  session_start: Object.freeze(["source", "platform"]),
  session_end: Object.freeze(["reason"]),
  turn_start: Object.freeze([]),
  turn_end: Object.freeze([
    "outcome",
    "completed",
    "failed",
    "interrupted",
    "inputTokens",
    "cachedInputTokens",
    "cacheWriteInputTokens",
    "outputTokens",
    "reasoningOutputTokens",
  ]),
  subagent_start: Object.freeze(["agentType", "childRole"]),
  subagent_stop: Object.freeze(["agentType", "childRole", "childStatus", "durationMs"]),
  item: Object.freeze(["phase", "itemType", "status", "exitCode", "toolName", "mcpServer", "collabTool"]),
  error: Object.freeze([]),
  process_exit: Object.freeze(["processExitCode", "processSignal"]),
});

const NATIVE_EVENT_PATTERN = /^[A-Za-z][A-Za-z0-9._]{0,63}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ENVELOPE_KEYS = ["schemaVersion", "source", "signal", "eventKind", "nativeEvent", "ids", "fields", "gaps", "observedAt"];

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isKnownSource(source) {
  return (
    isPlainObject(source) &&
    Object.keys(source).length === 3 &&
    SOURCES.some(
      (known) =>
        known.agent === source.agent &&
        known.mechanism === source.mechanism &&
        known.contract === source.contract,
    )
  );
}

// `null`/`undefined`/"" são ausência: o agente não forneceu o valor. Hermes,
// por exemplo, envia `task_id or ""` quando não há tarefa.
function isMissing(value) {
  return value === undefined || value === null || value === "";
}

// Devolve `{ value }` aceito ou `{ gap }` com o motivo; nunca um valor ajustado.
function checkId(value) {
  if (isMissing(value)) return { gap: "absent" };
  if (typeof value !== "string") return { gap: "invalid_type" };
  if (value.length > ENVELOPE_LIMITS.maxIdLength) return { gap: "too_long" };
  return { value };
}

function checkField(spec, value) {
  if (isMissing(value)) return { gap: "absent" };
  switch (spec.type) {
    case "name":
      if (typeof value !== "string") return { gap: "invalid_type" };
      if (value.length > ENVELOPE_LIMITS.maxNameLength) return { gap: "too_long" };
      if (!NAME_PATTERN.test(value)) return { gap: "not_identifier" };
      return { value };
    case "enum":
      if (typeof value !== "string") return { gap: "invalid_type" };
      if (!spec.values.includes(value)) return { gap: "unrecognized_value" };
      return { value };
    case "integer":
      if (!Number.isSafeInteger(value)) return { gap: "invalid_type" };
      if (spec.min !== undefined && value < spec.min) return { gap: "invalid_type" };
      return { value };
    case "boolean":
      if (typeof value !== "boolean") return { gap: "invalid_type" };
      return { value };
    default:
      throw new Error("tipo de campo desconhecido");
  }
}

function validDraftShape(draft) {
  if (!isPlainObject(draft)) return false;
  if (!isKnownSource(draft.source)) return false;
  if (!SIGNALS.includes(draft.signal)) return false;
  if (!hasOwn(EVENT_KIND_FIELDS, draft.eventKind)) return false;
  if (typeof draft.nativeEvent !== "string" || !NATIVE_EVENT_PATTERN.test(draft.nativeEvent)) return false;
  if (!isPlainObject(draft.ids) || !isPlainObject(draft.fields)) return false;
  if (draft.fieldGaps !== undefined && !isPlainObject(draft.fieldGaps)) return false;
  const allowedFields = EVENT_KIND_FIELDS[draft.eventKind];
  if (!Object.keys(draft.ids).every((key) => ID_NAMES.includes(key))) return false;
  if (!Object.keys(draft.fields).every((key) => allowedFields.includes(key))) return false;
  for (const [key, reason] of Object.entries(draft.fieldGaps ?? {})) {
    if (!allowedFields.includes(key) || !GAP_REASONS.includes(reason)) return false;
  }
  return true;
}

// Rascunho de adaptador → envelope v1. Uma chave presente em `draft.ids` ou
// `draft.fields` significa "o contrato fornece este nome"; valor ausente vira
// `absent`. Campo do eventKind sem chave vira `not_in_contract`. Rascunho com
// nome fora da allowlist é recusado inteiro: nunca um envelope parcial que
// esconda um erro de adaptador.
export function buildEnvelope(draft, { now = () => new Date() } = {}) {
  if (!validDraftShape(draft)) return { ok: false, reason: "invalid_draft" };
  const ids = {};
  const fields = {};
  const gaps = [];
  for (const key of ID_NAMES) {
    if (!hasOwn(draft.ids, key)) continue;
    const checked = checkId(draft.ids[key]);
    if (checked.gap) gaps.push(`${key}:${checked.gap}`);
    else ids[key] = checked.value;
  }
  for (const key of EVENT_KIND_FIELDS[draft.eventKind]) {
    const explicitGap = draft.fieldGaps?.[key];
    if (explicitGap) {
      gaps.push(`${key}:${explicitGap}`);
      continue;
    }
    if (!hasOwn(draft.fields, key)) {
      gaps.push(`${key}:not_in_contract`);
      continue;
    }
    const checked = checkField(FIELD_TYPES[key], draft.fields[key]);
    if (checked.gap) gaps.push(`${key}:${checked.gap}`);
    else fields[key] = checked.value;
  }
  const envelope = {
    schemaVersion: ENVELOPE_SCHEMA_VERSION,
    source: { agent: draft.source.agent, mechanism: draft.source.mechanism, contract: draft.source.contract },
    signal: draft.signal,
    eventKind: draft.eventKind,
    nativeEvent: draft.nativeEvent,
    ids,
    fields,
    gaps,
    observedAt: now().toISOString(),
  };
  if (Buffer.byteLength(JSON.stringify(envelope), "utf8") > ENVELOPE_LIMITS.maxEnvelopeBytes) {
    return { ok: false, reason: "oversize" };
  }
  return { ok: true, envelope };
}

const GAP_PATTERN = new RegExp(`^[A-Za-z]+:(${GAP_REASONS.join("|")})$`);

// Conferência estrutural usada pelo receptor: aceita só o que `buildEnvelope`
// pode produzir. Lança em objetos hostis (Proxy, getters); quem chama trata.
export function validateEnvelope(envelope) {
  if (!isPlainObject(envelope)) return false;
  const keys = Object.keys(envelope);
  if (keys.length !== ENVELOPE_KEYS.length || !ENVELOPE_KEYS.every((key) => keys.includes(key))) return false;
  if (envelope.schemaVersion !== ENVELOPE_SCHEMA_VERSION) return false;
  if (!isKnownSource(envelope.source)) return false;
  if (!SIGNALS.includes(envelope.signal)) return false;
  if (!hasOwn(EVENT_KIND_FIELDS, envelope.eventKind)) return false;
  if (typeof envelope.nativeEvent !== "string" || !NATIVE_EVENT_PATTERN.test(envelope.nativeEvent)) return false;
  if (!isPlainObject(envelope.ids) || !isPlainObject(envelope.fields)) return false;
  for (const [key, value] of Object.entries(envelope.ids)) {
    if (!ID_NAMES.includes(key) || checkId(value).value === undefined) return false;
  }
  const allowedFields = EVENT_KIND_FIELDS[envelope.eventKind];
  for (const [key, value] of Object.entries(envelope.fields)) {
    if (!allowedFields.includes(key)) return false;
    if (checkField(FIELD_TYPES[key], value).value === undefined) return false;
  }
  if (!Array.isArray(envelope.gaps) || !envelope.gaps.every((gap) => typeof gap === "string" && GAP_PATTERN.test(gap))) {
    return false;
  }
  if (typeof envelope.observedAt !== "string" || !ISO_INSTANT.test(envelope.observedAt)) return false;
  return Buffer.byteLength(JSON.stringify(envelope), "utf8") <= ENVELOPE_LIMITS.maxEnvelopeBytes;
}
