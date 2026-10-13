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

function renderAgent(agent) {
  const lines = [
    `${agent.id}: ${PRESENCE_TEXT[agent.presence]}` +
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
  const supportCounts = agent.capabilities.reduce((acc, row) => {
    acc[row.support] = (acc[row.support] ?? 0) + 1;
    return acc;
  }, {});
  const supportSummary = Object.entries(supportCounts)
    .map(([support, count]) => `${SUPPORT_TEXT[support]}: ${count}`)
    .join(", ");
  lines.push(`  cobertura observável (mecanismo × superfície): ${supportSummary}`);
  lines.push(
    "  execução real (runtimeVerification): não verificado nesta entrega (not_performed)",
  );
  return lines.join("\n");
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
