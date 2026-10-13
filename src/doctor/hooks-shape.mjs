// Forma nativa da seção `hooks` de cada agente, conferida só até onde decide
// se a configuração registra algum hook. Cada validador segue a fonte do
// próprio agente (não há schema comum entre os três) e nunca olha o conteúdo
// de comandos, URLs ou prompts: só se o campo obrigatório existe, é string e
// não está vazio, mais os campos opcionais do Codex que a fonte tipa (ver
// abaixo). Decisões e fontes em .checks/issue-3-agent-diagnostics.build.md,
// seções 9 e 11, e no Landing "grupo vazio, nomes de evento e campos
// opcionais tipados dos hooks" de .checks/issue-3-agent-diagnostics.md.

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isOptionalString(value) {
  return value === undefined || typeof value === "string";
}

function isString(value) {
  return typeof value === "string";
}

function isNonNegativeInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

// `null` é o `None` de um `Option<T>` em JSON (TOML não tem `null`, então a
// ausência da chave é a única forma lá); um valor presente de outro tipo é
// erro de deserialização na fonte, nunca um valor ignorado em silêncio.
function isValidOptionalField(handler, field, isValidValue) {
  if (!Object.hasOwn(handler, field)) return true;
  const value = handler[field];
  return value === null || isValidValue(value);
}

// Classificação de um handler:
//   - "targeted": o agente o registra com um alvo;
//   - "untargeted": forma válida que não registra hook (alvo vazio, tipo que
//     o agente lê e pula, ou tipo que o agente pula só para este evento);
//   - "invalid": fora da forma da fonte (campo obrigatório ou opcional
//     tipado ausente/com outro tipo de valor);
//   - "unrecognized": `type` fora da fonte consultada — uma versão futura
//     pode aceitá-lo, então não decide nem invalid nem configured;
//   - "unsupported_for_event": tipo conhecido e bem formado, mas a fonte só
//     documenta (sem confirmar por código) que este evento não o suporta —
//     o efeito real (ignorado, rejeitado, nunca invocado) é desconhecido.
function classifyRequiredTargets(handler, fields) {
  if (!fields.every((field) => isString(handler[field]))) return "invalid";
  return fields.every((field) => handler[field].trim() !== "") ? "targeted" : "untargeted";
}

// Claude Code (https://code.claude.com/docs/en/hooks, "Hook handler fields"):
// `type` obrigatório e, por tipo, os campos marcados "Required: yes".
const CLAUDE_HANDLER_TARGETS = new Map([
  ["command", ["command"]],
  ["http", ["url"]],
  ["mcp_tool", ["server", "tool"]],
  ["prompt", ["prompt"]],
  ["agent", ["prompt"]],
]);

// Mesma doc, seção do evento SessionStart: "Only type: 'command' and
// type: 'mcp_tool' hooks are supported". A doc não diz o que acontece com um
// `http`/`prompt`/`agent` ali (ignorado, rejeitado ou nunca invocado), então
// um handler desses não vira "invalid" (a forma está correta) nem conta como
// "targeted" (o suporte não está confirmado) — fica "unsupported_for_event".
const CLAUDE_SESSION_START_SUPPORTED_TYPES = new Set(["command", "mcp_tool"]);

function classifyClaudeHandler(handler, event) {
  if (!isPlainObject(handler) || !isString(handler.type) || handler.type === "") return "invalid";
  const targets = CLAUDE_HANDLER_TARGETS.get(handler.type);
  if (!targets) return "unrecognized";
  const base = classifyRequiredTargets(handler, targets);
  if (base === "invalid") return "invalid";
  if (event === "SessionStart" && !CLAUDE_SESSION_START_SUPPORTED_TYPES.has(handler.type)) {
    return "unsupported_for_event";
  }
  return base;
}

// Codex na versão instalada (openai/codex, tag rust-v0.162.1:
// config/src/hook_config.rs e hooks/src/engine/discovery.rs). A doc pública
// não declara `type` obrigatório, mas o código o usa como etiqueta do enum.
// `command` é obrigatório mesmo no Windows, onde `command_windows` (alias de
// `commandWindows`) o substitui se presente; as duas grafias juntas são campo
// duplicado para o serde. Comando efetivo vazio, mcp_tool com server/tool
// vazios e prompt/agent são lidos e pulados com aviso, sem invalidar o
// arquivo. Nenhuma das duas structs (`HookHandlerConfig`, `MatcherGroup`) tem
// `#[serde(deny_unknown_fields)]`, mas cada campo declarado exige o tipo
// exato: um valor presente de outro tipo falha a deserialização da struct
// inteira (e, por isso, do documento TOML/JSON inteiro), nunca só aquele
// handler.
const CODEX_WINDOWS_COMMAND_KEYS = ["command_windows", "commandWindows"];

// Campos opcionais de `HookHandlerConfig::Command` que a fonte tipa:
// `timeout` (renomeado de `timeout_sec: Option<u64>`), `async`
// (`r#async: bool`), `statusMessage` (`status_message: Option<String>`),
// `additionalContextLimit` (`Option<usize>`). `Prompt {}`/`Agent {}` não têm
// campo nenhum na fonte, então nunca são afetados por esta checagem.
function classifyCodexCommand(handler, platform) {
  if (!isString(handler.command)) return "invalid";
  const overrideKeys = CODEX_WINDOWS_COMMAND_KEYS.filter((key) => Object.hasOwn(handler, key));
  if (overrideKeys.length > 1) return "invalid";
  // `null` em JSON é o `None` de Option<String>, como a ausência.
  const override = overrideKeys.length === 1 ? handler[overrideKeys[0]] : null;
  if (override !== null && !isString(override)) return "invalid";
  if (!isValidOptionalField(handler, "timeout", isNonNegativeInteger)) return "invalid";
  if (!isValidOptionalField(handler, "async", (value) => typeof value === "boolean")) return "invalid";
  if (!isValidOptionalField(handler, "statusMessage", isString)) return "invalid";
  if (!isValidOptionalField(handler, "additionalContextLimit", isNonNegativeInteger)) return "invalid";
  const effective = platform === "win32" && override !== null ? override : handler.command;
  return effective.trim() !== "" ? "targeted" : "untargeted";
}

// Campos opcionais de `HookHandlerConfig::McpTool` que a fonte tipa:
// `timeout`/`statusMessage` (mesmos tipos do Command) e `input`
// (`serde_json::Map` → objeto simples; a checagem extra de representabilidade
// TOML do deserializer customizado não é reproduzida). discovery.rs: um
// `mcp_tool` sob o evento SessionEnd é lido e pulado com aviso ("SessionEnd
// MCP hooks are not supported"), antes mesmo de checar server/tool vazios —
// mas só depois de a struct deserializar com tipos corretos, então a checagem
// de tipo decide primeiro.
function classifyCodexMcpTool(handler, event) {
  const base = classifyRequiredTargets(handler, ["server", "tool"]);
  if (base === "invalid") return "invalid";
  if (!isValidOptionalField(handler, "timeout", isNonNegativeInteger)) return "invalid";
  if (!isValidOptionalField(handler, "statusMessage", isString)) return "invalid";
  if (!isValidOptionalField(handler, "input", isPlainObject)) return "invalid";
  if (event === "SessionEnd") return "untargeted";
  return base;
}

function classifyCodexHandler(handler, platform, event) {
  if (!isPlainObject(handler) || !isString(handler.type)) return "invalid";
  switch (handler.type) {
    case "command":
      return classifyCodexCommand(handler, platform);
    case "mcp_tool":
      return classifyCodexMcpTool(handler, event);
    case "prompt":
    case "agent":
      return "untargeted";
    default:
      return "unrecognized";
  }
}

// Claude e Codex: evento → lista de grupos `{ matcher?: string, hooks:
// [handler] }`. `hooksFieldOptional` segue a fonte de cada agente para a
// ausência da chave `hooks` no grupo: o Codex a declara `#[serde(default)]`
// em `MatcherGroup` (hook_config.rs, rust-v0.162.1), sem
// `deny_unknown_fields`, então um grupo sem `hooks` deserializa como `[]`
// (válido, zero handlers) e uma chave estranha ao lado é ignorada — por isso
// `hooksFieldOptional: true` só para o Codex. O Claude não tem fonte
// equivalente (a doc não declara um default para esse campo e não há código
// acessível que o confirme), então preserva a exigência atual. Devolve os
// handlers (cada um com o evento a que pertence), ou `null` fora da forma.
function matcherGroupHandlers(groups, { hooksFieldOptional = false } = {}) {
  if (!Array.isArray(groups)) return null;
  const handlers = [];
  for (const group of groups) {
    if (!isPlainObject(group) || !isOptionalString(group.matcher)) return null;
    if (group.hooks === undefined && hooksFieldOptional) continue;
    if (!Array.isArray(group.hooks)) return null;
    handlers.push(...group.hooks);
  }
  return handlers;
}

const INVALID = Object.freeze({ shape: "invalid", reasonCode: "hooks_structure_invalid" });

// Um campo obrigatório ausente, ou um campo opcional tipado com outro tipo de
// valor, num tipo conhecido é erro segundo a fonte, então decide antes de
// qualquer forma de "não sei" (evento não reconhecido, tipo não reconhecido,
// ou tipo restrito só para este evento). Entre as formas de "não sei", evento
// não reconhecido decide antes de tipo de handler não reconhecido, que decide
// antes de restrição por evento — a ordem não muda nenhum resultado hoje
// coberto por teste (cada caso de prova isola um eixo), só documenta o
// desempate para um caso futuro que combine mais de um.
function summarizeGroupHooks(classifications, hasUnrecognizedEvent) {
  if (classifications.includes("invalid")) return INVALID;
  if (hasUnrecognizedEvent) return { shape: "unrecognized", reasonCode: "hooks_event_name_unrecognized" };
  if (classifications.includes("unrecognized")) {
    return { shape: "unrecognized", reasonCode: "hooks_handler_type_unrecognized" };
  }
  if (classifications.includes("unsupported_for_event")) {
    return { shape: "unrecognized", reasonCode: "hooks_handler_type_unsupported_for_event" };
  }
  const handlersWithTarget = classifications.filter((kind) => kind === "targeted").length;
  return { shape: "valid", handlersWithTarget };
}

// `recognizedEvents`: nomes de evento nativos do agente (fora das chaves
// reservadas). Uma chave que não é um evento reconhecido nunca tem seu valor
// inspecionado — o próprio agente também não inspeciona, pois `HooksToml`/
// `HookEventsToml` (Codex) não têm `deny_unknown_fields` nem campo coletor; a
// doc do Claude também não documenta um catálogo aberto. O resultado nunca é
// "configured" só porque o handler dentro tem alvo.
function inspectMatcherGroupHooks(
  hooks,
  { classifyHandler, recognizedEvents, reservedKeys = new Map(), hooksFieldOptional = false },
) {
  if (!isPlainObject(hooks)) return INVALID;
  const classifications = [];
  let hasUnrecognizedEvent = false;
  for (const [key, value] of Object.entries(hooks)) {
    const isValidReserved = reservedKeys.get(key);
    if (isValidReserved) {
      if (!isValidReserved(value)) return INVALID;
      continue;
    }
    if (!recognizedEvents.has(key)) {
      hasUnrecognizedEvent = true;
      continue;
    }
    const handlers = matcherGroupHandlers(value, { hooksFieldOptional });
    if (handlers === null) return INVALID;
    classifications.push(...handlers.map((handler) => classifyHandler(handler, key)));
  }
  return summarizeGroupHooks(classifications, hasUnrecognizedEvent);
}

// Chaves de [hooks] do Codex que não são eventos:
//   - `state`: registro de revisão/confiança que o próprio Codex grava em
//     config.toml (observado localmente; só os cabeçalhos foram lidos). Seu
//     conteúdo não é interpretado.
//   - `managed_dir`/`windows_managed_dir` (doc "Managed hooks"): caminhos dos
//     scripts dos hooks gerenciados de requirements.toml. O Codex não carrega
//     definições desse diretório, então ele não é aberto e não decide
//     configuração nem confiança.
const CODEX_RESERVED_KEYS = new Map([
  ["state", isPlainObject],
  ["managed_dir", isString],
  ["windows_managed_dir", isString],
]);

// `HookEventsToml` (hook_config.rs, rust-v0.162.1): os 12 campos renomeados,
// idênticos aos nomes de evento da doc pública (https://learn.chatgpt.com/
// docs/hooks, "Hooks reference").
const CODEX_RECOGNIZED_EVENTS = new Set([
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "SessionStart",
  "SessionEnd",
  "UserPromptSubmit",
  "SubagentStart",
  "SubagentStop",
  "Stop",
  "Interrupt",
]);

// https://code.claude.com/docs/en/hooks, seção "Hook Events": lifecycle
// completo de eventos documentados, consultado nesta data.
const CLAUDE_RECOGNIZED_EVENTS = new Set([
  "SessionStart",
  "Setup",
  "UserPromptSubmit",
  "UserPromptExpansion",
  "PreToolUse",
  "PermissionRequest",
  "PermissionDenied",
  "PostToolUse",
  "PostToolUseFailure",
  "PostToolBatch",
  "Notification",
  "MessageDisplay",
  "SubagentStart",
  "SubagentStop",
  "TaskCreated",
  "TaskCompleted",
  "Stop",
  "StopFailure",
  "TeammateIdle",
  "InstructionsLoaded",
  "ConfigChange",
  "CwdChanged",
  "DirectoryAdded",
  "FileChanged",
  "WorktreeCreate",
  "WorktreeRemove",
  "PreCompact",
  "PostCompact",
  "PreModelSwitch",
  "PostModelSwitch",
  "Elicitation",
  "ElicitationResult",
  "SessionEnd",
]);

// Hermes (agent/shell_hooks.py da instalação local, lido como texto:
// `_parse_hooks_block` e `_parse_single_entry`): `hooks` é um mapeamento;
// `output_spill` e `outbound` são subseções reservadas, não eventos; cada
// evento é `null` (sem entradas) ou uma lista de mapeamentos com `command`
// string não vazia. Matcher/timeout inválidos são ignorados com aviso pelo
// próprio Hermes, então não invalidam a seção aqui. Nomes de evento não são
// conferidos contra um catálogo fixo: ao contrário de Claude/Codex, os
// eventos do Hermes são extensíveis por plugin e só são conhecidos lendo
// `VALID_HOOKS` da instalação (ver contract-evidence.mjs, evidência de
// contrato C5 — uma preocupação distinta da forma estrutural aqui).
const HERMES_RESERVED_KEYS = ["output_spill", "outbound"];

function inspectHermesHooks(hooks) {
  if (!isPlainObject(hooks)) return INVALID;
  let handlersWithTarget = 0;
  for (const [key, entries] of Object.entries(hooks)) {
    if (HERMES_RESERVED_KEYS.includes(key) || entries === null) continue;
    if (!Array.isArray(entries)) return INVALID;
    const valid = entries.every(
      (entry) => isPlainObject(entry) && isString(entry.command) && entry.command.trim() !== "",
    );
    if (!valid) return INVALID;
    handlersWithTarget += entries.length;
  }
  return { shape: "valid", handlersWithTarget };
}

const HOOKS_INSPECTORS = {
  claude: (hooks) =>
    inspectMatcherGroupHooks(hooks, {
      classifyHandler: classifyClaudeHandler,
      recognizedEvents: CLAUDE_RECOGNIZED_EVENTS,
    }),
  codex: (hooks, platform) =>
    inspectMatcherGroupHooks(hooks, {
      classifyHandler: (handler, event) => classifyCodexHandler(handler, platform, event),
      recognizedEvents: CODEX_RECOGNIZED_EVENTS,
      reservedKeys: CODEX_RESERVED_KEYS,
      hooksFieldOptional: true,
    }),
  hermes: inspectHermesHooks,
};

// `{ shape: "invalid", reasonCode }`, `{ shape: "unrecognized", reasonCode }`
// ou `{ shape: "valid", handlersWithTarget }`. `platform` é a mesma recebida
// por config-sources e escolhe o comando efetivo do Codex.
export function inspectNativeHooks(agentId, hooks, { platform }) {
  const inspect = HOOKS_INSPECTORS[agentId];
  if (!inspect) throw new Error(`agente sem forma de hooks conhecida: ${agentId}`);
  return inspect(hooks, platform);
}
