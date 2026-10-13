// Origens de evidência nativa realmente documentadas e vinculadas a um
// mecanismo do próprio agente (ver docs/agent-compatibility.md para a fonte
// de cada uma). Claude e Codex não têm, até esta data, um local estático e
// documentado que o doctor possa ler para a decisão de confiança — por isso
// não aparecem aqui, e trust fica `unknown` para os dois (ver
// resolveTrust). Isso não é uma limitação de implementação: é a ausência de
// um contrato público para ler sem executar o agente.
export const RECOGNIZED_NATIVE_TRUST_ORIGINS = new Set(["hermes_hooks_auto_accept"]);

// `hooks_auto_accept: true` em config.yaml é a única chave documentada do
// Hermes que concede consentimento nativo para hooks de shell sem exigir
// aprovação interativa prévia (ver referência em docs/agent-compatibility.md).
// A ausência da chave, ou o valor `false`, não é lida como recusa: apenas
// como ausência de consentimento, que resolveTrust trata como `unknown`.
export function extractNativeTrustEvidence({ agentId, fields }) {
  if (agentId === "hermes" && fields?.hooksAutoAccept === true) {
    return {
      origin: "hermes_hooks_auto_accept",
      decision: "trusted",
      reasonCode: "hooks_auto_accept_enabled",
    };
  }
  return null;
}
