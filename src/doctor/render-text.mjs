const PRESENCE_TEXT = {
  absent: "não encontrado",
  present: "encontrado",
  unknown: "desconhecido (não foi possível inspecionar)",
};

const CONFIGURATION_TEXT = {
  configured: "configurado",
  not_configured: "sem configuração",
  disabled: "desabilitado",
  invalid: "configuração inválida",
  unknown: "configuração desconhecida",
};

const TRUST_TEXT = {
  trusted: "confiável",
  untrusted: "não confiável",
  unknown: "confiança desconhecida",
  not_applicable: "não aplicável",
};

const SUPPORT_TEXT = {
  verified: "verificado",
  unavailable: "indisponível",
  unverified: "não verificado",
};

// Cada linha de capacidade expõe exatamente os mesmos campos que o JSON tem
// por combinação mecanismo×superfície (support, reasonCode, evidence com
// origem e, quando houver, fonte de contrato e eventos, configuration);
// reduzir isto a uma contagem (como a versão anterior fazia)
// esconde por que um mecanismo específico não foi verificado e qual
// instalação/origem sustenta cada linha — quebrando a paridade de fatos
// exigida entre texto e JSON (critério 11).
function renderContractEvidence(evidence) {
  if (!evidence.source) return "";
  return (
    `; fonte: ${evidence.source.path} (${evidence.source.kind})` +
    `; eventos: ${evidence.events.join(", ")}` +
    (evidence.missingEvents ? `; eventos ausentes: ${evidence.missingEvents.join(", ")}` : "")
  );
}

function renderCapabilityRow(row) {
  const base =
    `    ${row.mechanism} × ${row.surface}: ${SUPPORT_TEXT[row.support]} ` +
    `(motivo: ${row.reasonCode}; origem: ${row.evidence.origin}; ` +
    `configuração: ${CONFIGURATION_TEXT[row.configuration]}` +
    `${renderContractEvidence(row.evidence)})`;
  if (!row.exclusion) return base;
  // Exclusão documentada (contrato publicado pelo agente, não inspeção desta
  // instalação): origem/motivo próprios, distintos dos da linha acima.
  return (
    base +
    `\n      exclusão documentada: ${row.exclusion.reasonCode} ` +
    `(origem: ${row.exclusion.origin}; fonte: ${row.exclusion.source})`
  );
}

function renderAgent(agent) {
  const lines = [
    `${agent.id}: ${PRESENCE_TEXT[agent.presence]}` +
      (agent.path ? ` (caminho: ${agent.path})` : "") +
      (agent.reasonCode ? ` (motivo: ${agent.reasonCode})` : ""),
  ];
  if (agent.presence === "present") {
    lines.push(
      agent.version
        ? `  versão ${agent.version} (origem: ${agent.versionSource})`
        : `  versão não pôde ser determinada (motivo: ${agent.reasonCode})`,
    );
  }
  lines.push(
    `  configuração: ${CONFIGURATION_TEXT[agent.configuration]} (motivo: ${agent.configReasonCode})`,
  );
  lines.push(`  confiança: ${TRUST_TEXT[agent.trust]} (motivo: ${agent.trustReasonCode})`);
  lines.push("  cobertura observável (mecanismo × superfície):");
  for (const row of agent.capabilities) lines.push(renderCapabilityRow(row));
  lines.push(
    "  execução real (runtimeVerification): não verificado nesta entrega (not_performed)",
  );
  return lines.join("\n");
}

function renderEnvironment(environment) {
  return (
    `ambiente: plataforma ${environment.platform}, diretório ${environment.cwd}, ` +
    `gerado em ${environment.generatedAt}`
  );
}

function renderCollector(collector) {
  const statusText = {
    reachable: "alcançável",
    unreachable: "inalcançável",
    unknown: "desconhecido",
  }[collector.status];
  return (
    `coletor: ${statusText}` +
    (collector.reasonCode ? ` (motivo: ${collector.reasonCode})` : "") +
    ` — identidade do coletor não verificada (identityVerified: ${collector.identityVerified})`
  );
}

export function renderText(report) {
  const lines = [
    `diagnóstico de agentes — schemaVersion ${report.schemaVersion}, status: ${report.status}`,
    renderEnvironment(report.environment),
    "",
  ];
  for (const agent of report.agents) {
    lines.push(renderAgent(agent));
    lines.push("");
  }
  lines.push(renderCollector(report.collector));
  if (report.limitations.length > 0) {
    lines.push("", "limitações:");
    for (const limitation of report.limitations) lines.push(`- ${limitation}`);
  }
  if (report.errors.length > 0) {
    lines.push("", "erros:");
    for (const error of report.errors) lines.push(`- ${error.code}: ${error.message}`);
  }
  return lines.join("\n") + "\n";
}
