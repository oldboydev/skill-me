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

// `null` é o `None` de um `Option<T>` em JSON (TOML não tem `null`, então a
// ausência da chave é a única forma lá); um valor presente de outro tipo é
// erro de deserialização na fonte, nunca um valor ignorado em silêncio.
function isValidOptionalField(handler, field, isValidValue) {
  if (!Object.hasOwn(handler, field)) return true;
  const value = handler[field];
  return value === null || isValidValue(value);
}

// Teto comum dos dois campos nativos de magnitude que o doctor confere:
// `timeout` (`Option<u64>`, Command e McpTool) e `additionalContextLimit`
// (`Option<usize>`, só Command) — hook_config.rs, rust-v0.162.1. O Codex
// 0.162.1 só publica binário nativo para plataformas de 64 bits (Windows
// x64/arm64, macOS, Linux x64/arm64 — ver docs/agent-compatibility.md,
// instalação local inspecionada), onde `usize` tem a mesma largura de `u64`;
// por isso os dois campos compartilham o mesmo teto.
const CODEX_U64_MAX = 18446744073709551615n; // 2^64 - 1

// `JSON.parse` não lança para um inteiro acima da faixa segura de um double
// (2^53): ele arredonda para o double mais próximo. O valor nativo máximo
// válido (2^64-1, ímpar) arredonda para o MESMO double que o primeiro valor
// inválido acima dele (2^64, já exatamente representável nessa magnitude) —
// comparar só o `value` já arredondado não distingue os dois, e um literal
// `18446744073709551615n` escrito como `Number` no nosso próprio código
// sofreria o mesmo arredondamento. O limite superior por isso precisa do
// texto-fonte exato do número, preservado só para `format: "json"` do Codex
// em `CODEX_INTEGER_SOURCE` (config-projection.mjs, reviver de `JSON.parse`
// do Node 24 com acesso a `context.source`).
export const CODEX_INTEGER_SOURCE = Symbol("codexIntegerSource");

// serde_json (de.rs, `parse_number`) roteia um token com ponto decimal ou
// expoente para `ParserNumber::F64`, nunca para o visitor inteiro que
// `u64`/`usize` exigem — `timeout: 1.0` ou `timeout: 1e2` falham a
// deserialização do campo mesmo com valor matemático inteiro, porque
// `Number.isInteger`/`JSON.parse` apagam essa distinção lexical (`1.0` e `1`
// viram o mesmo `Number`). Só um token puramente decimal (sinal opcional +
// dígitos, sem `.`/`e`/`E`) é um inteiro nativo de verdade.
const PLAIN_INTEGER_TOKEN = /^-?\d+$/;

// TOML tipa inteiro como `i64` assinado (spec TOML, "64-bit signed long"); um
// literal além de `i64::MAX` nunca é um inteiro TOML válido, mesmo que o
// campo Rust de destino seja `u64`/`usize` — o toml-rs real falha ao
// desserializar o PRÓPRIO documento TOML antes de alcançar a conversão para
// o campo (o teto do formato decide primeiro, nunca o teto do campo). Teto
// menor que `CODEX_U64_MAX`, então só se aplica à origem TOML (`BigInt`).
const CODEX_TOML_I64_MAX = 9223372036854775807n; // 2^63 - 1

// `null` é o `None` do `Option<T>`, como a ausência da chave. Um valor
// presente precisa ser um inteiro não negativo dentro do teto nativo.
// `value` chega como `BigInt` quando a origem é `config.toml`
// (`integersAsBigInt: true` em `parseCodexToml`, config-projection.mjs, faz
// TODO inteiro TOML virar `BigInt` exato, qualquer magnitude, sem jamais
// perder precisão — e um FLOAT do TOML, como `1.0`, nunca vira `BigInt`, só
// `Number`, então cai no ramo de baixo sem fonte de texto JSON e é recusado)
// ou `Number` quando a origem é `hooks.json`, caso em que o texto-fonte exato
// (`CODEX_INTEGER_SOURCE`) decide tanto o teto quanto a forma lexical
// (inteiro vs. float — ver `PLAIN_INTEGER_TOKEN`). Sem fonte de texto para
// confirmar um `Number`, a configuração não pode ser anunciada como válida —
// nunca presume "dentro do limite"/"é inteiro nativo" por omissão da prova.
function isValidOptionalU64Field(handler, field) {
  if (!Object.hasOwn(handler, field)) return true;
  const value = handler[field];
  if (value === null) return true;
  if (typeof value === "bigint") return value >= 0n && value <= CODEX_TOML_I64_MAX;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return false;
  const source = handler[CODEX_INTEGER_SOURCE]?.[field];
  if (typeof source !== "string" || !PLAIN_INTEGER_TOKEN.test(source)) return false;
  // serde_json (`de.rs::parse_number`, linhas 509–526 da fonte baixada do
  // publisher crates.io com checksum igual ao `Cargo.lock` da tag
  // rust-v0.162.1 — `.checks/code-review/native-codex-0.162.1/serde-json-
  // 1.0.149/src/de.rs`): um token negativo de magnitude zero sempre faz
  // `neg = (significand as i64).wrapping_neg()` devolver `0`, e o comentário
  // da própria fonte ("Convert into a float if we underflow, or on `-0`")
  // roteia esse caso para `ParserNumber::F64`, nunca para o inteiro — o
  // campo `Option<u64>` nunca aceita esse token, mesmo sendo matematicamente
  // zero. `-0` do JS (`-0 < 0` é `false`) e `BigInt("-0")` (`0n`) não
  // distinguem esse caso de `"0"`; só o texto-fonte decide. Um segundo zero à
  // esquerda ("-00") já é rejeitado pelo próprio parser JSON antes deste
  // ponto, então "-0" é a única forma lexical dessa armadilha. Qualquer OUTRO
  // token negativo ("-5") já é recusado pelo `value < 0` acima — este é o
  // único caso em que um valor não negativo (`-0` é `0` em JS) esconde um
  // token que o parser real trata como float.
  if (source === "-0") return false;
  return BigInt(source) <= CODEX_U64_MAX;
}

// Campo com `#[serde(default)]` mas tipo NÃO `Option<T>` (`async: bool` do
// Command, `input: Map` do McpTool — hook_config.rs, rust-v0.162.1): a
// ausência da chave usa o default da fonte, mas um valor presente precisa
// deserializar como esse tipo exato. Ao contrário de `isValidOptionalField`,
// `null` aqui não é o `None` de um Option — é um valor de tipo errado para um
// bool/Map, e falha a deserialização da struct inteira como qualquer outro
// tipo errado (achado G1 da rodada 3 do Verifier).
function isValidDefaultedField(handler, field, isValidValue) {
  if (!Object.hasOwn(handler, field)) return true;
  return isValidValue(handler[field]);
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
// `timeout` (renomeado de `timeout_sec: Option<u64>`) e `statusMessage`
// (`status_message: Option<String>`) são `Option<T>` — ausência e `null`
// válidos. `additionalContextLimit` (`Option<usize>`) idem. `async`
// (`r#async: bool`, com `#[serde(default)]`) NÃO é Option: só a ausência usa
// o default; um `null` presente é tipo errado (ver isValidDefaultedField).
// `Prompt {}`/`Agent {}` não têm campo nenhum na fonte, então nunca são
// afetados por esta checagem.
function classifyCodexCommand(handler, platform) {
  if (!isString(handler.command)) return "invalid";
  const overrideKeys = CODEX_WINDOWS_COMMAND_KEYS.filter((key) => Object.hasOwn(handler, key));
  if (overrideKeys.length > 1) return "invalid";
  // `null` em JSON é o `None` de Option<String>, como a ausência.
  const override = overrideKeys.length === 1 ? handler[overrideKeys[0]] : null;
  if (override !== null && !isString(override)) return "invalid";
  if (!isValidOptionalU64Field(handler, "timeout")) return "invalid";
  if (!isValidDefaultedField(handler, "async", (value) => typeof value === "boolean")) return "invalid";
  if (!isValidOptionalField(handler, "statusMessage", isString)) return "invalid";
  if (!isValidOptionalU64Field(handler, "additionalContextLimit")) return "invalid";
  const effective = platform === "win32" && override !== null ? override : handler.command;
  return effective.trim() !== "" ? "targeted" : "untargeted";
}

// `null` não existe em TOML; o desserializador customizado do Codex
// (`deserialize_mcp_tool_input`, hook_config.rs) tenta `toml::Value::try_from`
// sobre o mapa inteiro e rejeita qualquer `null`, em QUALQUER profundidade de
// objeto/array dentro de `input` — não só no container externo
// (hooks_tests.rs, `hooks_file_rejects_mcp_tool_handler_with_null_input`:
// objeto raso `{"optional": null}`, aninhado em objeto `{"metadata": {...}}`
// e aninhado em array `{"values": [null]}`, as três rejeitadas). Reproduz só
// essa regra (não um parser TOML completo: outros valores não representáveis
// em TOML, se algum dia existirem via JSON, ficam fora do escopo desta
// checagem). Pilha explícita (sem recursão de chamada) para não depender da
// profundidade de um `input` arbitrário — o limite de 1 MiB já aplicado à
// leitura do arquivo limita o número de nós, não a profundidade de pilha.
function hasNullDeep(root) {
  const stack = [root];
  while (stack.length > 0) {
    const value = stack.pop();
    if (value === null) return true;
    if (Array.isArray(value)) {
      for (const item of value) stack.push(item);
    } else if (isPlainObject(value)) {
      for (const item of Object.values(value)) stack.push(item);
    }
  }
  return false;
}

function isTomlRepresentableMcpInput(value) {
  return isPlainObject(value) && !hasNullDeep(value);
}

// Campos opcionais de `HookHandlerConfig::McpTool` que a fonte tipa:
// `timeout`/`statusMessage` são `Option<T>` (mesmos tipos do Command, null
// válido). `input` (`serde_json::Map` com desserializador customizado, NÃO
// Option) só aceita ausência ou um objeto sem `null` em nenhuma profundidade
// (ver isTomlRepresentableMcpInput); um `null` presente no container externo
// também é tipo errado, como qualquer outro tipo (ver isValidDefaultedField e
// achado G1 da rodada 3). discovery.rs: um `mcp_tool` sob o evento SessionEnd
// é lido e pulado com aviso ("SessionEnd MCP hooks are not supported"), antes
// mesmo de checar server/tool vazios — mas só depois de a struct
// deserializar com tipos corretos, então a checagem de tipo decide primeiro.
function classifyCodexMcpTool(handler, event) {
  const base = classifyRequiredTargets(handler, ["server", "tool"]);
  if (base === "invalid") return "invalid";
  if (!isValidOptionalU64Field(handler, "timeout")) return "invalid";
  if (!isValidOptionalField(handler, "statusMessage", isString)) return "invalid";
  if (!isValidDefaultedField(handler, "input", isTomlRepresentableMcpInput)) return "invalid";
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
// acessível que o confirme), então preserva a exigência atual.
// `matcherAllowsNull` segue a mesma fonte para o próprio campo `matcher`: em
// `MatcherGroup`, `matcher` é `Option<String>` com default (hook_config.rs:
// 154–159), então `null` é o `None` válido, diferente de `hooksFieldOptional`
// (ausência vs. tipo errado de OUTRO campo) — só o Codex tem essa fonte
// confirmada; o Claude preserva a exigência atual sem ela (achado G2 da
// rodada 3). Devolve os handlers (cada um com o evento a que pertence), ou
// `null` fora da forma.
function matcherGroupHandlers(groups, { hooksFieldOptional = false, matcherAllowsNull = false } = {}) {
  if (!Array.isArray(groups)) return null;
  const handlers = [];
  for (const group of groups) {
    if (!isPlainObject(group)) return null;
    const matcherValid = isOptionalString(group.matcher) || (matcherAllowsNull && group.matcher === null);
    if (!matcherValid) return null;
    if (group.hooks === undefined && hooksFieldOptional) continue;
    if (!Array.isArray(group.hooks)) return null;
    // Nunca espalhar `group.hooks` como argumentos de `push`: um grupo com
    // dezenas de milhares de handlers (`hooks.json` sintaticamente válido,
    // abaixo do limite de 1 MiB) estoura o limite de argumentos do V8 e
    // lança `RangeError` antes de qualquer classificação rodar — achado P2
    // da revisão formal3, item 4. Laço simples não tem esse teto.
    for (const hook of group.hooks) handlers.push(hook);
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
  {
    classifyHandler,
    recognizedEvents,
    reservedKeys = new Map(),
    hooksFieldOptional = false,
    matcherAllowsNull = false,
  },
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
    const handlers = matcherGroupHandlers(value, { hooksFieldOptional, matcherAllowsNull });
    if (handlers === null) return INVALID;
    // Mesmo motivo do laço em `matcherGroupHandlers`: `.push(...array.map(...))`
    // espalha o resultado do `map` como argumentos, sujeito ao mesmo teto do V8.
    for (const handler of handlers) classifications.push(classifyHandler(handler, key));
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

// `eventsWithTarget`: nomes de evento (chaves do mapeamento, nunca conteúdo
// de comando) com ao menos um handler bem formado — só isso, nada do próprio
// comando/credencial. Esta checagem é puramente estrutural e não sabe se o
// nome é um evento real do Hermes instalado; essa validação contra o
// catálogo (`VALID_HOOKS` do pacote ligado ao launcher) é feita por quem
// chama com a evidência de contrato, fora desta função (achado G3 da
// rodada 3 — ver contract-evidence.mjs e config-reader.mjs).
function inspectHermesHooks(hooks) {
  if (!isPlainObject(hooks)) return INVALID;
  let handlersWithTarget = 0;
  const eventsWithTarget = new Set();
  for (const [key, entries] of Object.entries(hooks)) {
    if (HERMES_RESERVED_KEYS.includes(key) || entries === null) continue;
    if (!Array.isArray(entries)) return INVALID;
    const valid = entries.every(
      (entry) => isPlainObject(entry) && isString(entry.command) && entry.command.trim() !== "",
    );
    if (!valid) return INVALID;
    if (entries.length > 0) eventsWithTarget.add(key);
    handlersWithTarget += entries.length;
  }
  return { shape: "valid", handlersWithTarget, eventsWithTarget: [...eventsWithTarget] };
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
      matcherAllowsNull: true,
    }),
  hermes: inspectHermesHooks,
};

// `{ shape: "invalid", reasonCode }`, `{ shape: "unrecognized", reasonCode }`
// ou `{ shape: "valid", handlersWithTarget }` (Hermes também devolve
// `eventsWithTarget`, consumido por quem cruza com o catálogo instalado —
// ver config-projection.mjs). `platform` é a mesma recebida por
// config-sources e escolhe o comando efetivo do Codex.
export function inspectNativeHooks(agentId, hooks, { platform }) {
  const inspect = HOOKS_INSPECTORS[agentId];
  if (!inspect) throw new Error(`agente sem forma de hooks conhecida: ${agentId}`);
  return inspect(hooks, platform);
}
