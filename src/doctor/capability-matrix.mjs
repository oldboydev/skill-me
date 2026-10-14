export const MECHANISMS = Object.freeze([
  "skill_usage_signal",
  "tool_calls",
  "results_and_errors",
  "session_turn",
  "subagents",
]);

export const SURFACES = Object.freeze(["cli_local", "ide", "desktop", "cloud"]);

// Estado da fonte de contrato (ver contract-evidence.mjs) → motivo de uma
// linha que não pôde ser comprovada por ela. Nenhum desses estados afirma
// ausência do mecanismo: todos ficam unverified.
const CONTRACT_STATE_REASON = Object.freeze({
  no_static_source: "no_static_contract_source",
  not_found: "contract_source_not_found",
  unreadable: "contract_source_unreadable",
  too_large: "input_too_large",
  changed_during_read: "contract_changed_during_read",
  unrecognized: "contract_source_unrecognized",
  // Um pacote/extensão/bytecode de maior precedência resolve o mesmo nome de
  // módulo antes da fonte textual que o doctor lê (revisão formal8, achado
  // 2): o catálogo físico existe, mas não é o que o Hermes importaria.
  shadowed: "contract_source_shadowed",
});

// Só a tabela de contrato da própria instalação decide verified; um evento
// que falta nela vira unverified, não unavailable — a tabela prova o que o
// mecanismo de hooks aceita, não que nenhum outro caminho observe aquilo.
function evaluateContract(mechanism, contract) {
  if (!contract) return { support: "unverified", reasonCode: "no_local_evidence" };
  if (contract.state !== "found") {
    return {
      support: "unverified",
      reasonCode: CONTRACT_STATE_REASON[contract.state] ?? "no_local_evidence",
    };
  }
  const listed = contract.mechanisms?.[mechanism];
  if (!listed) return { support: "unverified", reasonCode: "no_local_evidence" };
  const detail = { source: contract.source, events: listed.events };
  if (listed.missingEvents.length > 0) {
    return {
      support: "unverified",
      reasonCode: "contract_event_not_listed",
      detail: { ...detail, missingEvents: listed.missingEvents },
    };
  }
  return { support: "verified", reasonCode: "local_contract_lists_events", detail };
}

// Hosted tools do Codex são um detalhe documentado de execução de
// ferramenta, não uma superfície de cliente inteira: não verificar uma
// superfície a partir da CLI local significa unverified (não sabemos),
// nunca unavailable (afirmaríamos ausência sem evidência) — o mesmo
// tratamento dado a qualquer outra superfície/agente, sem equiparar
// "hosted tool" a "superfície não inspecionada" nem a um mecanismo genérico.
// Na CLI local, a única ausência comprovada é a do próprio launcher no PATH
// consultado: sem ele, nenhum mecanismo local daquele agente está
// disponível nesse ambiente (unavailable) — o que nada diz sobre IDE,
// desktop ou cloud.
function evaluateSupport({ agentId, mechanism, surface, evidence }) {
  if (surface !== "cli_local") {
    return { support: "unverified", reasonCode: "surface_not_inspected" };
  }
  if (evidence.presence === "absent") {
    return { support: "unavailable", reasonCode: "executable_not_found" };
  }
  if (evidence.presence === "unknown") {
    return { support: "unverified", reasonCode: "presence_undetermined" };
  }
  if (evidence.version === null) {
    return { support: "unverified", reasonCode: "version_unresolved" };
  }
  if (evidence.versionProfileCompatible === false) {
    return { support: "unverified", reasonCode: "version_profile_incompatible" };
  }
  if (evidence.documentationOnly) {
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
  return evaluateContract(mechanism, evidence.contract);
}

// Origem de cada linha: real_environment para o que a CLI leu, fixture só
// quando uma prova a informa explicitamente, e not_inspected para o que não
// foi examinado — inclusive qualquer superfície além da CLI local, que esta
// entrega nunca inspeciona, seja qual for a origem recebida.
function rowEvidence({ surface, evidence, detail }) {
  if (surface !== "cli_local") return { origin: "not_inspected" };
  return { origin: evidence.origin ?? "not_inspected", ...detail };
}

// Hosted tools do Codex (ex.: busca web/WebSearch) rodam no servidor, fora do
// processo local onde os hooks locais do Codex inspecionam tool_calls (fonte:
// "Hooks" em https://learn.chatgpt.com/docs/hooks, seção "Tool coverage" —
// não usar nomes de evento do Hermes aqui, Codex não os documenta). Essa
// exclusão vem do CONTRATO DOCUMENTADO, não de uma inspeção desta instalação:
// por isso fica separada da conclusão de support/reasonCode da linha (que
// permanece a avaliação genérica de evaluateSupport, nunca sobrescrita por
// este fato) e tem sua própria origem "documented_contract", distinta da
// origem usada pela evidência da linha. Vale só para tool_calls na própria
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
  const { support, reasonCode, detail } = evaluateSupport({
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
    evidence: rowEvidence({ surface, evidence, detail }),
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
