export const MECHANISMS = Object.freeze([
  "skill_usage_signal",
  "tool_calls",
  "results_and_errors",
  "session_turn",
  "subagents",
]);

export const SURFACES = Object.freeze(["cli_local", "ide", "desktop", "cloud"]);

// Hosted tools do Codex são um detalhe documentado de execução de
// ferramenta, não uma superfície de cliente inteira: não verificar uma
// superfície a partir da CLI local significa unverified (não sabemos),
// nunca unavailable (afirmaríamos ausência sem evidência) — o mesmo
// tratamento dado a qualquer outra superfície/agente, sem equiparar
// "hosted tool" a "superfície não inspecionada" nem a um mecanismo genérico.
function evaluateSupport({ agentId, mechanism, surface, evidence }) {
  if (surface !== "cli_local") {
    return { support: "unverified", reasonCode: "surface_not_inspected" };
  }
  if (evidence?.versionProfileCompatible === false) {
    return { support: "unverified", reasonCode: "version_profile_incompatible" };
  }
  if (evidence?.documentationOnly) {
    return { support: "unverified", reasonCode: "documentation_without_version_binding" };
  }
  // Codex não documenta um evento nativo equivalente a "SkillStart"; a
  // ausência desse evento específico prova só isso, não a ausência de
  // qualquer sinal de uso de skill por outro caminho não inspecionado aqui.
  // Por isso este mecanismo nunca alega "unavailable" (afirmaria ausência
  // sem prova) nem chega a "verified" por evidência genérica — fica sempre
  // unverified com o motivo específico, mesmo quando outra evidência
  // (versão compatível, contrato local) estaria disponível para os demais
  // mecanismos.
  if (agentId === "codex" && mechanism === "skill_usage_signal") {
    return { support: "unverified", reasonCode: "skill_start_not_documented" };
  }
  if (evidence?.hasLocalVerifiedContract) {
    return { support: "verified", reasonCode: "local_evidence_matches_contract" };
  }
  return { support: "unverified", reasonCode: "no_local_evidence" };
}

// Hosted tools do Codex (ex.: busca web/WebSearch) rodam no servidor, fora do
// processo local onde os hooks locais do Codex inspecionam tool_calls (fonte:
// "Hooks" em https://learn.chatgpt.com/docs/hooks, seção "Tool coverage" —
// não usar nomes de evento do Hermes aqui, Codex não os documenta). Essa
// exclusão vem do CONTRATO DOCUMENTADO, não de uma inspeção desta instalação:
// por isso fica separada da conclusão de support/reasonCode da linha (que
// permanece a avaliação genérica — no_local_evidence ou
// version_profile_incompatible, nunca sobrescrita por este fato) e tem sua
// própria origem "documented_contract", distinta de "real_environment"/
// "fixture" usada pela evidência da linha. Vale só para tool_calls na própria
// CLI local: é justamente aí que a exclusão é notável, pois é a superfície
// que esta entrega inspeciona.
const CODEX_HOSTED_TOOLS_EXCLUSION = Object.freeze({
  reasonCode: "hosted_tools_outside_local_hooks",
  origin: "documented_contract",
  source: "https://learn.chatgpt.com/docs/hooks",
});

function knownExclusionFor({ agentId, mechanism, surface }) {
  if (agentId === "codex" && mechanism === "tool_calls" && surface === "cli_local") {
    return CODEX_HOSTED_TOOLS_EXCLUSION;
  }
  return null;
}

export function buildCapabilityRow({ agentId, mechanism, surface, evidence = {} }) {
  const { support, reasonCode } = evaluateSupport({
    agentId,
    mechanism,
    surface,
    evidence,
  });
  return {
    agentId,
    mechanism,
    surface,
    support,
    reasonCode,
    configuration: evidence.configuration ?? "unknown",
    // Esta entrega nunca inicia captura real: runtimeVerification é sempre
    // not_performed, independente de configuration/support.
    runtimeVerification: "not_performed",
    evidence: {
      origin: evidence.origin ?? "fixture",
    },
    // null quando não há exclusão documentada conhecida para esta linha.
    exclusion: knownExclusionFor({ agentId, mechanism, surface }),
  };
}

export function buildCapabilityMatrix({ agentId, evidenceBySurface = {} }) {
  const rows = [];
  for (const mechanism of MECHANISMS) {
    for (const surface of SURFACES) {
      rows.push(
        buildCapabilityRow({
          agentId,
          mechanism,
          surface,
          evidence: evidenceBySurface[surface] ?? {},
        }),
      );
    }
  }
  return rows;
}
