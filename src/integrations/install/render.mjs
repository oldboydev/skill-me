// Saída humana do instalador: só códigos fechados, arquivos relativos ao alvo e
// eventos — nunca conteúdo de configuração.
export function renderText(result) {
  const lines = [`skill-me integrations ${result.command} (${result.agent ?? "?"}) — alvo: ${result.target ?? "?"}`];
  lines.push(`estado: ${result.status}${result.applied ? " (aplicado)" : ""}`);
  if (result.changes.length > 0) {
    lines.push("mudanças próprias:");
    for (const change of result.changes) lines.push(`  ${change.action} ${change.file}${change.event ? ` ${change.event}` : ""}`);
  }
  if (result.conflicts.length > 0) {
    lines.push("conflitos (nada foi sobrescrito):");
    for (const conflict of result.conflicts) {
      lines.push(`  ${conflict.code}${conflict.file ? ` ${conflict.file}` : ""}${conflict.event ? ` ${conflict.event}` : ""}`);
    }
  }
  if (result.errors.length > 0) {
    lines.push("erros:");
    for (const error of result.errors) lines.push(`  ${error.code}${error.file ? ` ${error.file}` : ""}`);
  }
  if (result.steps.length > 0) {
    lines.push("passos:");
    for (const entry of result.steps) lines.push(`  ${entry.step}: ${entry.state}`);
  }
  if (result.manualSteps.length > 0) {
    lines.push("passos manuais:");
    for (const step of result.manualSteps) lines.push(`  - ${step}`);
  }
  return lines.join("\n") + "\n";
}
