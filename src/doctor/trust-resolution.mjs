// Confiança é decidida separada do conteúdo não confiável da configuração:
// esta função nunca lê um campo arbitrário do arquivo de hooks (qualquer
// chave dentro dele é escrita por quem já tem acesso de escrita ao arquivo,
// então não pode se autoautorizar). A única entrada aceita é uma evidência
// nativa já extraída por um leitor específico do agente, com origem
// reconhecida — ver native-trust-evidence.mjs para a extração real.
export function resolveTrust({ configuration, evidence, recognizedOrigins }) {
  if (configuration === "disabled") {
    return { trust: "not_applicable", reasonCode: "configuration_disabled" };
  }
  if (configuration === "not_configured") {
    return { trust: "not_applicable", reasonCode: "configuration_not_configured" };
  }
  if (configuration !== "configured") {
    return { trust: "unknown", reasonCode: "configuration_not_determined" };
  }
  if (!evidence) {
    return { trust: "unknown", reasonCode: "no_native_consent_evidence" };
  }
  if (!recognizedOrigins.has(evidence.origin)) {
    return { trust: "unknown", reasonCode: "untrusted_evidence_origin" };
  }
  if (evidence.decision === "trusted") {
    return { trust: "trusted", reasonCode: evidence.reasonCode ?? "native_consent_granted" };
  }
  if (evidence.decision === "untrusted") {
    return { trust: "untrusted", reasonCode: evidence.reasonCode ?? "native_consent_revoked" };
  }
  return { trust: "unknown", reasonCode: "native_consent_unresolved" };
}
