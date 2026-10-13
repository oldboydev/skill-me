import { parseDocument } from "yaml";
import { parse as parseToml } from "smol-toml";

export const ONE_MIB_BYTES = 1024 * 1024;

// Projeção segura: a saída nunca inclui o conteúdo bruto nem os valores de
// comandos/credenciais/prompts de um hook, só os booleanos/estrutura
// necessários para decidir "configuration". Cada chave aqui corresponde a um
// campo real e documentado de um dos três agentes (ver docs/agent-
// compatibility.md); um campo desconhecido/arbitrário no arquivo nunca entra
// neste objeto, então nunca alcança a resolução de confiança.
function extractSafeFields(parsed) {
  if (parsed === null || typeof parsed !== "object") return {};
  const fields = {};
  if (parsed.hooks && typeof parsed.hooks === "object") {
    fields.hasHooksSection = Object.keys(parsed.hooks).length > 0;
  }
  if (typeof parsed.disableAllHooks === "boolean") {
    fields.disableAllHooks = parsed.disableAllHooks;
  }
  if (typeof parsed.allowManagedHooksOnly === "boolean") {
    fields.allowManagedHooksOnly = parsed.allowManagedHooksOnly;
  }
  if (parsed.features && typeof parsed.features.hooks === "boolean") {
    fields.featuresHooksEnabled = parsed.features.hooks;
  }
  if (typeof parsed.hooks_auto_accept === "boolean") {
    fields.hooksAutoAccept = parsed.hooks_auto_accept;
  }
  return fields;
}

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

export function projectConfig({ rawText, format }) {
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
  const fields = extractSafeFields(parsed);
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
