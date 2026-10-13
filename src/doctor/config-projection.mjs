import { parseDocument } from "yaml";
import { parse as parseToml } from "smol-toml";
import { inspectNativeHooks } from "./hooks-shape.mjs";

export const ONE_MIB_BYTES = 1024 * 1024;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
  if (parsed.features) {
    const hasCanonical = Object.hasOwn(parsed.features, "hooks");
    const hasAlias = Object.hasOwn(parsed.features, "codex_hooks");
    const canonicalIsBoolean = typeof parsed.features.hooks === "boolean";
    const aliasIsBoolean = typeof parsed.features.codex_hooks === "boolean";
    if ((hasCanonical && !canonicalIsBoolean) || (hasAlias && !aliasIsBoolean)) {
      return { fields: {}, featuresFlagsReasonCode: "features_hooks_flag_invalid_type" };
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
  const parse = PARSERS[format];
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
