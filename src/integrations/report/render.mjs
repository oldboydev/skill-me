const STATUS = Object.freeze({
  sufficient: "evidência suficiente",
  partial: "evidência parcial",
  contradicted: "contradição observada",
  unobserved: "ausência de observação",
  not_applicable: "não aplicável",
  inconclusive: "inconclusivo",
});

const REASON = Object.freeze({
  matching_command_succeeded: "o mesmo comando teve resultado positivo",
  matching_command_failed: "o mesmo comando teve resultado negativo",
  heuristic_operation: "o vínculo da operação é heurístico",
  ambiguous_context: "o mesmo comando aparece em contextos distintos",
  result_unconfirmed: "o resultado da operação não foi confirmado",
  no_matching_observation: "nenhum comando correspondente foi observado",
  no_observable_command: "a instrução não contém comando literal observável",
  guidance_not_step: "orientação, sem etapa executável para julgar",
  condition_unresolved: "a condição não tem resultado explícito suficiente",
  condition_false_observed: "a condição foi explicitamente falsa",
  condition_true_action_unobserved: "a condição ocorreu, mas a ação não foi observada",
  some_commands_failed: "ao menos um comando da instrução teve resultado negativo",
  all_commands_succeeded: "todos os comandos da instrução tiveram resultado positivo",
  commands_incomplete: "nem todos os comandos da instrução têm prova suficiente",
  command_conflict: "os argumentos do mesmo comando divergem entre eventos da operação",
  prohibition_uninterpreted: "a proibição não foi interpretada como ação exigida",
  overlapping_attempts: "as tentativas do mesmo comando se sobrepõem; a ordem de correção é indeterminada",
});

const md = (value) => String(value).replace(/[\\`*_{}\[\]()+!|<>]/g, "\\$&");
const citeEvents = (events) => events.map((sequence) => `evento #${sequence}`).join(", ");

function sourceLine(evaluation) {
  const { line, sha256 } = evaluation.sources.skill;
  const source = `SKILL.md:${line} sha256:${sha256}`;
  const events = citeEvents(evaluation.sources.events);
  const cited = events ? `${source}; ${events}` : source;
  return cited;
}

function renderEvaluation(item, markdown) {
  const text = item.text === null ? "[texto omitido pela política]" : item.text;
  const label = `${item.instruction} ${item.kind}: ${text}`;
  const verdict = `${STATUS[item.status]} — ${REASON[item.reasonCode] ?? item.reasonCode}`;
  const correction = item.corrections.map((pair) => `Correção observada: ${citeEvents(pair.failed)} → ${citeEvents(pair.corrected)}.`).join(" ");
  const line = `${label}. ${verdict}. ${correction} Fonte: ${sourceLine(item)}.`;
  return markdown ? `- ${md(line)}` : `  ${line}`;
}

function timelineLines(report, markdown) {
  return report.timeline.entries.map((entry) => {
    const candidate = entry.session.strength === "heuristic" ? " hipótese de sessão" : entry.session.strength === "inconclusive" ? " sessão inconclusiva" : "";
    const line = `evento #${entry.sequence}: ${entry.eventKind} (${entry.source.agent}, ${entry.source.contract})${candidate}; fonte: evento #${entry.sequence}.`;
    return markdown ? `- ${md(line)}` : `  ${line}`;
  });
}

function operationLines(report, markdown) {
  return report.timeline.operations.map((op) => {
    const result = [op.outcome ?? op.status, op.exitCode === null || op.exitCode === undefined ? null : `exit ${op.exitCode}`].filter(Boolean).join("; ") || "sem resultado";
    const error = op.errorType === null || op.errorType === undefined ? "" : `; erro ${op.errorType}`;
    const hypothesis = op.strength === "heuristic" ? "; hipótese de vínculo" : op.strength === "inconclusive" ? "; vínculo inconclusivo" : "";
    const line = `${op.id}: ${op.type}, ${op.state}, ${result}${error}${hypothesis}; fonte: ${citeEvents(op.evidence)}.`;
    return markdown ? `- ${md(line)}` : `  ${line}`;
  });
}

export function renderReport(report, format = "text") {
  if (format === "json") return JSON.stringify(report) + "\n";
  const markdown = format === "markdown";
  const heading = (title) => markdown ? `## ${title}` : `${title}:`;
  const bullet = (line) => markdown ? `- ${md(line)}` : `  ${line}`;
  const observedSources = (sources) => sources.map((source) => {
    const strength = source.strength === "heuristic" ? "hipótese de identificação" : source.strength === "native" ? "vínculo nativo" : "vínculo inconclusivo";
    return `${citeEvents(source.events) || "evento não identificado"} (${strength})`;
  }).join("; ") || "nenhum evento identificável";
  const observed = report.skill.observedNames.length > 1
    ? `nomes observados ambíguos: ${report.skill.observedNames.map((item) => `${md(item.name)} (${observedSources(item.sources)})`).join("; ")}; coincidência indeterminada`
    : `nome observado ${md(report.skill.observedName ?? "não observado")}; fonte do nome observado: ${observedSources(report.skill.observedSources)}; coincidência ${report.skill.nameMatchesObservation ?? "indeterminada"}`;
  const identificationSource = report.skill.identification === "explicit_path" ? "argumento --skill" : "eventos da captura";
  const rows = [
    markdown ? "# Relatório de execução" : "Relatório de execução",
    "",
    `${heading("Skill")} ${md(report.skill.name)}; identificação ${report.skill.identification} (fonte: ${identificationSource}); sha256:${report.skill.sha256}; ${observed}.`,
    "",
    heading("Ambiente e versões"),
    ...((report.environment.length ? report.environment : [{ agent: "não observado", contract: "não observado", platform: null, events: [] }]).map((item) => bullet(`${item.agent}; contrato ${item.contract}; plataforma ${item.platform ?? "não observada"}; fonte: ${citeEvents(item.events) || "captura sem eventos"}.`))),
    "",
    heading("Timeline"),
    ...(report.timeline.entries.length ? timelineLines(report, markdown) : [bullet("Nenhum evento registrado; fonte: timeline.entries vazia.")]),
    "",
    heading("Operações e erros"),
    ...(report.timeline.operations.length ? operationLines(report, markdown) : [bullet("Nenhuma operação correlacionada; fonte: timeline.operations vazia.")]),
    "",
    heading("Avaliação das instruções"),
    ...(report.evaluations.length ? report.evaluations.map((item) => renderEvaluation(item, markdown)) : [bullet(`Nenhum item de lista classificável; fonte: SKILL.md sha256:${report.skill.sha256}.`)]),
    "",
    heading("Limitações"),
    ...report.limitations.map((item) => bullet(`${item.text} Fonte: ${item.source}.`)),
    bullet(`Cobertura parcial: ${report.timeline.coverage.partial}; fonte: timeline.coverage.`),
  ];
  return rows.join("\n") + "\n";
}
