import { parseDocument } from "yaml";
import { parse as parseToml } from "smol-toml";
import {
  inspectNativeHooks,
  CODEX_INTEGER_SOURCE,
  CODEX_TOML_I64_MIN,
  CODEX_TOML_I64_MAX,
} from "./hooks-shape.mjs";

export const ONE_MIB_BYTES = 1024 * 1024;

// `typeof value === "object" && !Array.isArray(value)` sozinho também aceita
// um `Date`/`TomlDate` (smol-toml devolve `TomlDate extends Date` para um
// datetime/date TOML — dist/date.js; um `Date` não tem propriedade própria
// enumerável, então `Object.entries` nele é sempre `[]`, como uma tabela
// vazia). Não é uma tabela TOML/objeto JSON real: `FeaturesToml` desserializa
// de um MAPA de verdade (lib.rs:838–871), e um `Date` precisa ser recusado
// como qualquer outro escalar TOML solto (bool/número/string). Tabelas reais
// do smol-toml usam `Object.create(null)` (dist/parse.js); objetos de
// `JSON.parse` usam `Object.prototype`. O protótipo por isso precisa ser um
// dos dois — nunca o protótipo de uma classe como `Date`.
function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

// `timeout` (Command e McpTool) e `additionalContextLimit` (Command) são
// `Option<u64>`/`Option<usize>` nativos cujo teto superior (2^64-1) um
// `Number` do JSON.parse já não representa com exatidão (ver comentário de
// `CODEX_U64_MAX` em hooks-shape.mjs). O reviver de três argumentos do Node
// 24 expõe `context.source`, o texto-fonte exato de cada número do
// documento, só para valores primitivos (nunca para objetos/arrays — `this`
// nesse ponto é sempre o contêiner imediato daquela chave). Guardamos esse
// texto numa propriedade de Symbol no PRÓPRIO objeto que tem o campo: invisível
// a `Object.keys`/`JSON.stringify`/`Object.values` (nunca vaza na projeção
// nem atrapalha as checagens estruturais existentes), e sem ambiguidade entre
// um `timeout` do handler e uma chave do mesmo nome dentro de `input`
// (McpTool), que é outro objeto. Só para `hooks.json` do Codex: config.toml
// nunca passa por `JSON.parse`, e outros agentes não têm esses dois campos
// nativos tipados.
function parseCodexHooksJson(rawText) {
  return JSON.parse(rawText, function (key, value, context) {
    if (context !== undefined && typeof value === "number" && (key === "timeout" || key === "additionalContextLimit")) {
      (this[CODEX_INTEGER_SOURCE] ??= {})[key] = context.source;
    }
    return value;
  });
}

// `smol-toml` por padrão converte todo inteiro TOML para `Number`, perdendo
// precisão acima de 2^53 (lança `config_malformed` para um `i64::MAX` válido
// e nativo) e, pior, apaga a distinção lexical entre `timeout = 1` (inteiro)
// e `timeout = 1.0` (float): as duas formas, distintas no TOML e tratadas de
// forma diferente pelo `toml`/`serde` nativos, viram o mesmo `Number`
// JavaScript. `ParseOptions.integersAsBigInt: true` (já incluído no pacote
// instalado, sem dependência nova) faz TODO inteiro virar `BigInt` exato,
// qualquer magnitude — só um FLOAT continua `Number`, nunca `BigInt` — então
// `isValidOptionalU64Field` (hooks-shape.mjs) decide pelo tipo do próprio
// valor: `BigInt` é sempre um inteiro nativo exato; `Number` nessa posição só
// pode ser um float (sem fonte de texto JSON para provar o contrário), logo
// inválido. Escopo só do Codex: é o único agente com `format: "toml"`.
//
// Sem essa opção, o `smol-toml` recusava todo inteiro fora da faixa segura do
// double; com ela, não recusa nem o que o carregador real recusa. O Codex
// desserializa o documento inteiro em `toml::Value` antes de qualquer campo
// tipado (ver `CODEX_TOML_I64_MAX` em hooks-shape.mjs), então um inteiro fora
// de i64 em QUALQUER posição — inclusive numa chave que o doctor ignora —
// derruba o arquivo: vira `config_malformed`, como os demais erros de parse.
// A mensagem não cita chave nem valor. Float continua `Number` e não entra
// nesta faixa.
function parseCodexToml(rawText) {
  const document = parseToml(rawText, { integersAsBigInt: true });
  if (hasIntegerOutsideTomlI64(document)) {
    throw new Error("inteiro TOML fora da faixa i64 aceita pelo Codex");
  }
  return document;
}

// Pilha explícita, sem recursão nem `push(...lista)`: abaixo de 1 MiB o
// `smol-toml` aceita chaves pontilhadas com dezenas de milhares de níveis
// (`maxDepth` só limita arrays/tabelas inline) e arrays com centenas de
// milhares de itens; o limite de 1 MiB da leitura limita o número de nós, não
// a profundidade. Mesmo padrão de `hasNullDeep` (hooks-shape.mjs), mantido à
// parte para não alterar a checagem de `input` do McpTool nesta correção.
function hasIntegerOutsideTomlI64(document) {
  const stack = [document];
  while (stack.length > 0) {
    const value = stack.pop();
    if (typeof value === "bigint") {
      if (value < CODEX_TOML_I64_MIN || value > CODEX_TOML_I64_MAX) return true;
    } else if (Array.isArray(value)) {
      for (const item of value) stack.push(item);
    } else if (isPlainObject(value)) {
      for (const item of Object.values(value)) stack.push(item);
    }
  }
  return false;
}

// `HooksFile` (hook_config.rs, rust-v0.162.1) é a raiz exclusiva de
// hooks.json: `#[serde(deny_unknown_fields)]`, `description: Option<String>`
// e `hooks: HookEventsToml` (default só quando a CHAVE está ausente, não um
// `Option`). Só se aplica a hooks.json (json do Codex); config.toml tem raiz
// própria (features/hooks/etc.), nunca esta whitelist, e Claude/Hermes têm
// schemas de raiz distintos. Campo desconhecido na raiz, `description` de
// outro tipo que não string/null, ou `hooks` explicitamente `null` (tipo
// errado para um campo não-Option, ao contrário da ausência da chave, que usa
// o default vazio) falham a deserialização do arquivo inteiro
// (hooks_tests.rs: `hooks_file_rejects_events_outside_hooks_object`). Um
// `hooks` presente de outro tipo (array/string/número) continua decidido
// adiante por `inspectNativeHooks`, que já rejeita essa forma com o mesmo
// resultado haja ou não esta checagem.
function hooksFileEnvelopeReasonCode(parsed) {
  if (!isPlainObject(parsed)) return "hooks_file_envelope_invalid";
  for (const key of Object.keys(parsed)) {
    if (key !== "description" && key !== "hooks") return "hooks_file_envelope_invalid";
  }
  if (Object.hasOwn(parsed, "description")) {
    const description = parsed.description;
    if (description !== null && typeof description !== "string") return "hooks_file_envelope_invalid";
  }
  if (Object.hasOwn(parsed, "hooks") && parsed.hooks === null) return "hooks_file_envelope_invalid";
  return null;
}

// Projeção segura: a saída nunca inclui o conteúdo bruto nem os valores de
// comandos/credenciais/prompts de um hook, só os booleanos/estrutura
// necessários para decidir "configuration". Cada chave aqui corresponde a um
// campo real e documentado de um dos três agentes (ver docs/agent-
// compatibility.md); um campo desconhecido/arbitrário no arquivo nunca entra
// neste objeto, então nunca alcança a resolução de confiança.
// `hasHooksSection` só é verdadeiro com ≥1 handler que o agente registraria
// com alvo. Uma seção `hooks` presente (não nula) fora da forma nativa, ou
// com tipo de handler não reconhecido, devolve só `hooksShape`: nenhum campo
// do arquivo é aproveitado. `hermesTargetedEvents` (só Hermes) projeta nomes
// de evento (chaves), nunca o comando/credencial dentro deles.
function extractSafeFields(parsed, agentId, platform) {
  if (parsed === null || typeof parsed !== "object") return { fields: {} };
  const fields = {};
  if (parsed.hooks !== undefined && parsed.hooks !== null) {
    const hooks = inspectNativeHooks(agentId, parsed.hooks, { platform });
    if (hooks.shape !== "valid") return { hooksShape: hooks.shape, hooksReasonCode: hooks.reasonCode };
    fields.hasHooksSection = hooks.handlersWithTarget > 0;
    // Só nomes de evento (chaves), nunca conteúdo de comando: consumido por
    // config-reader.mjs para cruzar com o catálogo VALID_HOOKS da instalação
    // ligada ao launcher, quando essa evidência existe (achado G3).
    if (agentId === "hermes") fields.hermesTargetedEvents = hooks.eventsWithTarget ?? [];
  }
  if (typeof parsed.disableAllHooks === "boolean") {
    fields.disableAllHooks = parsed.disableAllHooks;
  }
  if (typeof parsed.allowManagedHooksOnly === "boolean") {
    fields.allowManagedHooksOnly = parsed.allowManagedHooksOnly;
  }
  // `features.hooks` é a chave real; `codex_hooks` é o alias depreciado para
  // a MESMA feature (legacy.rs, rust-v0.162.1: `Alias { legacy_key:
  // "codex_hooks", feature: Feature::CodexHooks }`, `feature.key() == "hooks"`
  // em lib.rs). As duas viram entradas de um único `BTreeMap<String, bool>`
  // achatado (`FeaturesToml::entries`, `apply_map` em lib.rs:869–871); a
  // ordem de iteração do BTreeMap é alfabética, então "codex_hooks" é
  // aplicada antes de "hooks" quando as duas chaves coexistem, e a canônica,
  // aplicada por último, sobrescreve a legada — nunca um OR de "false" entre
  // as duas. Mas o `BTreeMap<String, bool>` rejeita, na própria
  // deserialização, qualquer uma das duas chaves presente com tipo diferente
  // de bool — antes mesmo de aplicar essa precedência. Por isso um tipo
  // inválido numa chave CONHECIDA presente invalida o documento mesmo que a
  // outra chave seja um bool válido: a canônica errada não cai para o alias,
  // e um alias errado não fica escondido atrás de uma canônica válida. Só a
  // AUSÊNCIA da chave (não um tipo inválido dela) abre espaço para a outra
  // decidir; com as duas presentes e booleanas, a canônica decide.
  if (parsed.features !== undefined) {
    // `FeaturesToml` deserializa de uma TABELA (struct), nunca de um
    // booleano/array/string/número soltos — `features = true` ou `features =
    // false` no lugar de `[features]` falha a deserialização do documento
    // antes mesmo de qualquer chave interna existir. Checagem de container
    // primeiro, antes de ler `hooks`/`codex_hooks`: um `[features]` vazio
    // (`{}`) continua válido (tabela real, só sem chaves). Só para Codex —
    // Claude/Hermes não têm essa struct.
    if (agentId === "codex" && !isPlainObject(parsed.features)) {
      return { fields: {}, featuresFlagsReasonCode: "features_hooks_flag_invalid_type" };
    }
    const hasCanonical = Object.hasOwn(parsed.features, "hooks");
    const hasAlias = Object.hasOwn(parsed.features, "codex_hooks");
    const canonicalIsBoolean = typeof parsed.features.hooks === "boolean";
    const aliasIsBoolean = typeof parsed.features.codex_hooks === "boolean";
    if ((hasCanonical && !canonicalIsBoolean) || (hasAlias && !aliasIsBoolean)) {
      return { fields: {}, featuresFlagsReasonCode: "features_hooks_flag_invalid_type" };
    }
    // Restrição anterior insuficiente: só `hooks`/`codex_hooks` eram
    // conferidas, mas `FeaturesToml::entries` é o `BTreeMap<String, bool>`
    // inteiro — uma chave desconhecida com tipo errado (ex.: `shell_tool =
    // "yes"`) já derruba o documento na fonte, mesmo que as duas chaves de
    // hooks estejam corretas. Restrito a `agentId === "codex"`: é o contrato
    // de `[features]` do Codex, não um schema genérico de `[features]`.
    if (agentId === "codex") {
      const entriesReasonCode = codexFeaturesEntriesReasonCode(parsed.features);
      if (entriesReasonCode) {
        return { fields: {}, featuresFlagsReasonCode: entriesReasonCode };
      }
    }
    if (canonicalIsBoolean) {
      fields.featuresHooksEnabled = parsed.features.hooks;
    } else if (aliasIsBoolean) {
      fields.featuresHooksEnabled = parsed.features.codex_hooks;
    }
  }
  if (typeof parsed.hooks_auto_accept === "boolean") {
    fields.hooksAutoAccept = parsed.hooks_auto_accept;
  }
  return { fields };
}

// `FeaturesToml` (lib.rs, rust-v0.162.1) tem campos nomeados/tipados (cada um
// um struct/enum próprio, não bool) e um `#[serde(flatten)] entries:
// BTreeMap<String, bool>` que absorve QUALQUER outra chave de `[features]` —
// inclusive uma desconhecida do doctor, como `shell_tool`. Um valor não
// booleano em qualquer uma dessas outras chaves falha a deserialização do
// MAPA INTEIRO (não só de uma chave isolada), derrubando o documento TOML
// inteiro — o mesmo efeito que já vale para `hooks`/`codex_hooks` tipados
// errado (checagem acima). Esta lista é só os nomes dos campos tipados
// (`lib.rs:838-868`), não o schema de cada um: não reimplementamos
// `tool_registry`/`guardianv2`/etc., só a decisão de que ELES não entram
// nesta regra de bool.
const CODEX_TYPED_FEATURE_KEYS = new Set([
  "tool_registry",
  "code_mode",
  "code_mode_host",
  "non_prefixed_mcp_tool_names",
  "guardianv2",
  "multi_agent_v2",
  "token_budget",
  "context_management",
  "rollout_budget",
  "current_time_reminder",
  "sleep_tool",
  "apps_mcp_path_override",
  "network_proxy",
]);

function codexFeaturesEntriesReasonCode(features) {
  for (const [key, value] of Object.entries(features)) {
    if (CODEX_TYPED_FEATURE_KEYS.has(key)) continue;
    if (typeof value !== "boolean") return "features_hooks_flag_invalid_type";
  }
  return null;
}

// Tipo/evento não reconhecido não é erro de forma (uma versão do agente pode
// aceitá-lo), mas também não sustenta configured, disabled nem trusted; o
// `reasonCode` exato vem de `inspectNativeHooks` (vários motivos possíveis
// por shape — ver hooks-shape.mjs), não de um valor fixo por shape aqui.
const HOOKS_SHAPE_CONFIGURATION = {
  invalid: "invalid",
  unrecognized: "unknown",
};

function hasNonEmptyHooks(fields) {
  return fields.hasHooksSection === true;
}

function parseYamlSafely(rawText) {
  const doc = parseDocument(rawText, { uniqueKeys: true });
  // A lib `yaml` nunca executa tags customizadas (um `!!js/function` vira
  // texto opaco, não código) nem interpola `${...}`; tratamos uma tag não
  // resolvida como config inválida mesmo assim, para não aceitar em
  // silêncio algo que o autor do arquivo esperava ser executável.
  const hasUnsafeTag = doc.warnings.some((w) => w.code === "TAG_RESOLVE_FAILED");
  if (hasUnsafeTag) {
    const error = new Error("tag YAML não reconhecida/insegura");
    error.reasonCode = "unsafe_yaml_tag";
    throw error;
  }
  if (doc.errors.length > 0) {
    throw new Error(doc.errors[0].message);
  }
  return doc.toJS();
}

const PARSERS = {
  yaml: parseYamlSafely,
  toml: parseToml,
  json: JSON.parse,
};

export function projectConfig({ rawText, format, agentId, platform }) {
  if (rawText === null || rawText === undefined) {
    return { configuration: "not_configured", reasonCode: "no_config_found", fields: {} };
  }
  if (Buffer.byteLength(rawText, "utf8") > ONE_MIB_BYTES) {
    return { configuration: "unknown", reasonCode: "input_too_large", fields: {} };
  }
  let parse = PARSERS[format];
  if (agentId === "codex" && format === "json") parse = parseCodexHooksJson;
  if (agentId === "codex" && format === "toml") parse = parseCodexToml;
  if (!parse) throw new Error(`formato de configuração desconhecido: ${format}`);
  let parsed;
  try {
    parsed = parse(rawText);
  } catch (error) {
    return {
      configuration: "invalid",
      reasonCode: error.reasonCode ?? "config_malformed",
      fields: {},
    };
  }
  if (agentId === "codex" && format === "json") {
    const envelopeReasonCode = hooksFileEnvelopeReasonCode(parsed);
    if (envelopeReasonCode) {
      return { configuration: "invalid", reasonCode: envelopeReasonCode, fields: {} };
    }
  }
  const { fields, hooksShape, hooksReasonCode, featuresFlagsReasonCode } = extractSafeFields(
    parsed,
    agentId,
    platform,
  );
  if (featuresFlagsReasonCode) {
    return { configuration: "invalid", reasonCode: featuresFlagsReasonCode, fields: {} };
  }
  if (hooksShape) {
    return { configuration: HOOKS_SHAPE_CONFIGURATION[hooksShape], reasonCode: hooksReasonCode, fields: {} };
  }
  if (fields.disableAllHooks === true) {
    return { configuration: "disabled", reasonCode: "hooks_disabled", fields };
  }
  if (fields.featuresHooksEnabled === false) {
    return { configuration: "disabled", reasonCode: "features_hooks_disabled", fields };
  }
  if (hasNonEmptyHooks(fields)) {
    return { configuration: "configured", reasonCode: "hooks_configured", fields };
  }
  return { configuration: "not_configured", reasonCode: "no_config_found", fields };
}
