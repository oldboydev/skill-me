import {
  claudeConfigScopes,
  claudeHome,
  codexConfigScopes,
  codexHome,
  hermesConfigScopes,
  hermesHome,
} from "./config-sources.mjs";
import { projectConfig, ONE_MIB_BYTES } from "./config-projection.mjs";
import { mergeConfigScopes } from "./scope-merge.mjs";
import {
  extractNativeTrustEvidence,
  RECOGNIZED_NATIVE_TRUST_ORIGINS,
} from "./native-trust-evidence.mjs";
import { resolveTrust } from "./trust-resolution.mjs";
import { readSnapshot } from "./snapshot-read.mjs";

function hasHooksSection(fields) {
  return fields.hasHooksSection === true;
}

// `isDisabled` só enxerga o escopo que está processando no momento (não o
// conjunto inteiro); por isso Claude e Codex recebem o nome do escopo. Claude
// segue override por precedência (ver mergeConfigScopes): um escopo que
// endereça a chave e diz "false" encerra a pergunta; só a política gerenciada
// pode bloquear hooks de outros escopos (allowManagedHooksOnly). Codex não
// segue esse mesmo padrão: a lista de handlers é aditiva entre camadas, mas
// a feature flag não é — um valor explícito dela em escopo de PROJETO
// (true OU false) depende de confiança de projeto não determinável por
// leitura, então encerra a pergunta como "unknown" (nunca "disabled" por
// suposição); só a ausência da chave em projeto delega ao escopo de
// usuário, que resolve "false" como desativação confiante de verdade.
const AGENT_CONFIG_DEFINITIONS = {
  claude: {
    resolveHome: claudeHome,
    resolveScopes: claudeConfigScopes,
    isDisabled(fields, scope) {
      if (scope === "managed") {
        if (fields.disableAllHooks === true) return "disabled_by_managed_policy";
        // allowManagedHooksOnly restringe hooks NÃO gerenciados; não
        // desativa os hooks que o próprio escopo managed já define. Quando
        // o managed tem hooks próprios, a chave fica "endereçada e não
        // desliga" (false) — hasHooks(managed) resolve "configured" a
        // seguir, e a leitura para aqui (escopos de menor precedência
        // ficam irrelevantes, pois já foram bloqueados pela política).
        // Quando o managed NÃO tem hooks próprios, a política só bloqueia
        // os demais escopos, sem nada para configurar: "disabled" mesmo.
        if (fields.allowManagedHooksOnly === true) {
          return hasHooksSection(fields) ? false : "hooks_blocked_by_managed_policy";
        }
        if (fields.disableAllHooks === false) return false;
        return undefined;
      }
      if (fields.disableAllHooks === true) return "hooks_disabled";
      if (fields.disableAllHooks === false) return false;
      return undefined;
    },
    hasHooks: hasHooksSection,
  },
  codex: {
    resolveHome: codexHome,
    resolveScopes: codexConfigScopes,
    isDisabled(fields, scope) {
      // Hooks de projeto só ficam ativos se o projeto for confiável — uma
      // decisão que o doctor não determina por leitura estática (ver
      // docs/agent-compatibility.md). Qualquer valor explícito de
      // features.hooks em escopo de PROJETO (true OU false) depende dessa
      // confiança indeterminada: um "true" de projeto poderia sobrepor um
      // "false" de usuário se o projeto fosse confiável, e um "false" de
      // projeto poderia não se aplicar se o projeto não for confiável. Hooks
      // definidos (a lista de handlers) são aditivos entre camadas, mas essa
      // aditividade não se estende à própria feature flag: ela não é um OR
      // de "false" entre escopos. Por isso qualquer endereçamento da chave
      // em escopo de projeto vira unknown, nunca disabled/configured por
      // suposição — só a ausência da chave em projeto deixa a pergunta em
      // aberto para o escopo de usuário.
      if (scope === "project" && fields.featuresHooksEnabled !== undefined) {
        return { configuration: "unknown", configReasonCode: "policy_precedence_undetermined" };
      }
      // O escopo de usuário não depende de confiança de projeto: um "false"
      // aqui é desativação confiante de verdade (critério 8), sem gate.
      if (fields.featuresHooksEnabled !== false) return undefined;
      return "features_hooks_disabled";
    },
    hasHooks: hasHooksSection,
  },
  hermes: {
    resolveHome: hermesHome,
    resolveScopes: hermesConfigScopes,
    isDisabled() {
      return undefined;
    },
    hasHooks: hasHooksSection,
  },
};

async function readScope({ path: filePath, format, scope }, { agentId, fs, platform }) {
  let snapshot;
  try {
    snapshot = await readSnapshot(filePath, { fs, maxBytes: ONE_MIB_BYTES });
  } catch (error) {
    if (error.code === "ENOENT") return { scope, state: "missing" };
    return { scope, state: "unreadable", errorCode: error.code ?? "unknown" };
  }
  if (snapshot.tooLarge) return { scope, state: "too_large" };
  if (snapshot.changedDuringRead) return { scope, state: "changed_during_read" };
  const projected = projectConfig({
    rawText: snapshot.content.toString("utf8"),
    format,
    agentId,
    platform,
  });
  if (projected.configuration === "invalid") {
    return { scope, state: "invalid", reasonCode: projected.reasonCode };
  }
  if (projected.configuration === "unknown") {
    return { scope, state: "inconclusive", reasonCode: projected.reasonCode };
  }
  return { scope, state: "parsed", parsed: projected.fields };
}

function firstParsedFields(scopeResults) {
  return scopeResults.find((result) => result.state === "parsed")?.parsed ?? {};
}

// `hermesValidHooks`: `Set<string>` dos nomes nativos de evento lidos de
// VALID_HOOKS no pacote ligado ao launcher (ver contract-evidence.mjs),
// quando essa evidência foi encontrada; `null` quando não há fonte vinculada
// (presença ausente, versão fora do perfil examinado, ou pacote/tabela
// ilegível). Sem o catálogo, preserva o resultado estrutural de sempre: a
// ausência de fonte vinculada não vira "configured"/"not_configured" novo,
// só não decide nada a mais do que hooks-shape.mjs já decide (achado G3).
export async function readAgentConfiguration({ agentId, env, platform, cwd, fs, hermesValidHooks = null }) {
  const definition = AGENT_CONFIG_DEFINITIONS[agentId];
  const home = definition.resolveHome({ env, platform });
  const scopeDefs = definition.resolveScopes({ home, cwd, platform });

  const scopeResults = [];
  for (const scopeDef of scopeDefs) {
    scopeResults.push(await readScope(scopeDef, { agentId, fs, platform }));
  }

  let { configuration, configReasonCode } = mergeConfigScopes(scopeResults, {
    isDisabled: definition.isDisabled,
    hasHooks: definition.hasHooks,
  });

  const fields = firstParsedFields(scopeResults);

  // Um evento Hermes fora do catálogo instalado nunca é registrado pelo
  // agente (`_parse_hooks_block` ignora nomes fora de VALID_HOOKS): a
  // configuração estrutural não pode contar como "configured" quando NENHUM
  // dos eventos com handler bate com a tabela real. Só decide quando o
  // catálogo foi de fato lido; `trust` é recalculado a seguir a partir desta
  // `configuration`, como qualquer outro resultado (fonte única de verdade).
  if (
    agentId === "hermes" &&
    configuration === "configured" &&
    hermesValidHooks !== null &&
    !(fields.hermesTargetedEvents ?? []).some((event) => hermesValidHooks.has(event))
  ) {
    configuration = "not_configured";
    configReasonCode = "hooks_event_not_in_installed_catalog";
  }

  const evidence = extractNativeTrustEvidence({ agentId, fields });
  const { trust, reasonCode: trustReasonCode } = resolveTrust({
    configuration,
    evidence,
    recognizedOrigins: RECOGNIZED_NATIVE_TRUST_ORIGINS,
  });

  return { configuration, configReasonCode, trust, trustReasonCode, fields };
}
