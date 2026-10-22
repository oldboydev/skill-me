import { correlateTrace } from "../correlation/timeline.mjs";

const SUCCESS = new Set(["success", "completed"]);
const FAILURE = new Set(["failure", "failed", "blocked", "declined"]);
const PROHIBITION = /\b(?:do\s+not|don't|never|must\s+not|não|nunca|jamais)\s+(?:run|execute|rode|use|call|chame|instale|install|faça)\b/i;
const COMMAND_PRIVACY = /^(?:tool_input\.command|item\.command):(unsanitizable|sensitive_removed|content_truncated)$/;
const PRIVACY_LIMIT_TEXT = Object.freeze({
  unsanitizable: "A política omitiu o argumento de comando; essa operação não pode comprovar o comando literal.",
  sensitive_removed: "A política removeu parte do argumento de comando; a igualdade do texto restante não comprova o comando literal.",
  content_truncated: "O argumento de comando foi truncado pela política; a comparação literal ficou limitada.",
});

function commandAt(record) {
  const fields = record?.content?.fields;
  if (!Array.isArray(fields)) return null;
  const item = fields.find((field) => field.role === "args" && ["tool_input.command", "item.command"].includes(field.field) && typeof field.value === "string");
  return item?.value.trim() ?? null;
}

function operationResult(operation) {
  if (operation.state !== "closed" || operation.result === null) return "unknown";
  if (operation.exitCode !== null) return operation.exitCode === 0 ? "positive" : "negative";
  if (operation.errorType != null) return "negative";
  if (FAILURE.has(operation.outcome) || FAILURE.has(operation.status)) return "negative";
  if (SUCCESS.has(operation.outcome) || SUCCESS.has(operation.status)) return "positive";
  return "unknown";
}

function commandObservations(command, timeline, trace) {
  const recordsBySequence = new Map(trace.records.map(({ sequence, record }) => [sequence, record]));
  return timeline.operations.filter((op) => op.type === "tool")
    .map((op) => {
      const sequences = [...new Set([...op.evidence, ...op.duplicates])].sort((a, b) => a - b);
      const records = sequences.map((sequence) => recordsBySequence.get(sequence)).filter(Boolean);
      return {
        op,
        sequences,
        commands: [...new Set(records.map(commandAt).filter(Boolean))],
        privacyLimited: records.some((record) => (record.privacy ?? []).some((item) => COMMAND_PRIVACY.test(item))),
      };
    })
    .filter(({ commands }) => commands.includes(command))
    .map(({ op, sequences, commands, privacyLimited }) => ({ operation: op.id, strength: op.strength, state: op.state, result: commands.length === 1 && !privacyLimited ? operationResult(op) : "unknown", commandConflict: commands.length > 1, privacyLimited, session: op.session, origin: op.origin, subagent: op.subagent, sequences, orderSequences: op.evidence }))
    .sort((a, b) => a.orderSequences[0] - b.orderSequences[0]);
}

const contextOf = (observation) => JSON.stringify([observation.origin, observation.session, observation.subagent]);
const multipleContexts = (observations) => new Set(observations.map(contextOf)).size > 1;

function overlappingAttempts(observations) {
  let latestEnd = -Infinity;
  for (const item of observations) {
    if (item.orderSequences[0] <= latestEnd) return true;
    latestEnd = Math.max(latestEnd, item.state === "closed" ? item.orderSequences.at(-1) : Infinity);
  }
  return false;
}

function confirmedCorrections(observations) {
  const corrections = [];
  let failures = [];
  for (const item of observations) {
    if (item.strength !== "native") continue;
    if (item.result === "negative") failures.push(item.sequences);
    if (item.result === "positive") {
      corrections.push(...failures.map((failed) => ({ failed, corrected: item.sequences })));
      failures = [];
    }
  }
  return corrections;
}

function evidenceForCommand(command, timeline, trace, { afterSequence = 0, context = null } = {}) {
  const observations = commandObservations(command, timeline, trace)
    .filter((item) => item.orderSequences[0] > afterSequence && (context === null || contextOf(item) === context));
  if (observations.length === 0) return { status: "unobserved", reasonCode: "no_matching_observation", events: [], corrections: [] };
  if (multipleContexts(observations)) return { status: "partial", reasonCode: "ambiguous_context", events: observations.flatMap((item) => item.sequences), corrections: [] };
  if (overlappingAttempts(observations)) return { status: "partial", reasonCode: "overlapping_attempts", events: [...new Set(observations.flatMap((item) => item.sequences))].sort((a, b) => a - b), corrections: [] };
  const last = observations.at(-1);
  const corrections = confirmedCorrections(observations);
  const events = [...new Set(observations.flatMap((item) => item.sequences))];
  if (last.result === "negative" && last.strength === "native") return { status: "contradicted", reasonCode: "matching_command_failed", events, corrections, context: contextOf(last) };
  if (last.result === "positive" && last.strength === "native") return { status: "sufficient", reasonCode: "matching_command_succeeded", events, corrections, context: contextOf(last) };
  return { status: "partial", reasonCode: last.commandConflict ? "command_conflict" : last.privacyLimited ? "command_privacy_limited" : last.strength === "heuristic" ? "heuristic_operation" : "result_unconfirmed", events, corrections, context: contextOf(last) };
}

function evidenceForCommands(commands, timeline, trace, options) {
  const evidence = commands.map((command) => evidenceForCommand(command, timeline, trace, options));
  if (evidence.length === 1) return evidence[0];
  const statuses = evidence.map((item) => item.status);
  const differentContexts = new Set(evidence.map((item) => item.context).filter(Boolean)).size > 1;
  const ambiguousContext = evidence.some((item) => item.reasonCode === "ambiguous_context");
  const status = differentContexts || ambiguousContext ? "partial"
    : statuses.includes("contradicted") ? "contradicted"
    : statuses.every((item) => item === "sufficient") ? "sufficient"
      : statuses.every((item) => item === "unobserved") ? "unobserved" : "partial";
  const reasonCode = {
    contradicted: "some_commands_failed",
    sufficient: "all_commands_succeeded",
    unobserved: "no_matching_observation",
    partial: ambiguousContext ? "ambiguous_context" : differentContexts ? "commands_different_contexts" : evidence.some((item) => item.reasonCode === "command_conflict") ? "command_conflict" : evidence.some((item) => item.reasonCode === "command_privacy_limited") ? "command_privacy_limited" : "commands_incomplete",
  }[status];
  return {
    status,
    reasonCode,
    events: [...new Set(evidence.flatMap((item) => item.events))].sort((a, b) => a - b),
    corrections: evidence.flatMap((item) => item.corrections),
  };
}

function hasAlternativeCommands(instruction, firstCommand = 0) {
  if (typeof instruction.text !== "string") return false;
  const commands = new Set(instruction.commands);
  let previousEnd = null;
  let commandIndex = 0;
  for (const match of instruction.text.matchAll(/`([^`\r\n]+)`/g)) {
    const value = match[1].trim();
    if (!commands.has(value) && !(instruction.commandRedacted && /(?:<home>|\[removido\])/.test(value))) continue;
    const between = previousEnd === null ? "" : instruction.text.slice(previousEnd, match.index).replace(/\([^()]*\)/g, "");
    if (commandIndex > firstCommand && /\b(?:or|ou)\b/i.test(between)) return true;
    previousEnd = match.index + match[0].length;
    commandIndex += 1;
  }
  return false;
}

function alternativeCommandEvidence(instruction, timeline, trace) {
  const observed = evidenceForCommands(instruction.commands, timeline, trace);
  if (observed.status === "unobserved") return observed;
  return { status: "inconclusive", reasonCode: "alternative_commands_unresolved", events: observed.events, corrections: [] };
}

function conditionalEvidence(instruction, timeline, trace) {
  const [trigger, ...actions] = instruction.commands;
  // Se o primeiro trecho citado não foi reconhecido como comando, os comandos
  // restantes podem pertencer apenas à ação; nenhum deles prova o gatilho.
  const firstSpan = /`([^`\r\n]+)`/.exec(instruction.text ?? "")?.[1].trim();
  const [prefix, between] = (instruction.text ?? "").split(/`[^`]*`/);
  if (firstSpan !== trigger || !/^\s*(?:if|when|se|caso|quando)\s*$/i.test(prefix ?? "")) {
    return { status: "inconclusive", reasonCode: "condition_unresolved", events: [], corrections: [] };
  }
  // Só a ligação simples entre resultado e ação é interpretada. Qualificadores
  // como "with exit code 2" exigiriam uma prova própria que não temos aqui.
  if (!/^\s*(?:fails?|succeeds?|passes?|falh\w*|pass\w*)\s*[,;:]?\s*(?:(?:then|então|depois)\s+)?(?:run|execute|rode|use|call|chame|faça)\s*$/i.test(between ?? "")) {
    return { status: "inconclusive", reasonCode: "condition_unresolved", events: [], corrections: [] };
  }
  const conditionText = `${prefix ?? ""} ${between ?? ""}`;
  const beforeAction = `${prefix ?? ""} ${(between ?? "").split(/\b(?:run|execute|rode|use|call|chame)\b/i)[0]}`;
  if (/\b(?:or|ou|and|e|n[aã]o|sem|no|not|never|without|doesn['’]t|didn['’]t)\b/i.test(beforeAction)) return { status: "inconclusive", reasonCode: "condition_unresolved", events: [], corrections: [] };
  const fails = /\b(?:falh\w*|fail\w*|erro|error)\b/i.test(conditionText);
  const succeeds = /\b(?:pass\w*|succeed\w*|sucesso|success)\b/i.test(conditionText);
  if (!trigger || actions.length === 0 || fails === succeeds) return { status: "inconclusive", reasonCode: "condition_unresolved", events: [], corrections: [] };
  const observations = commandObservations(trigger, timeline, trace);
  if (multipleContexts(observations)) return { status: "inconclusive", reasonCode: "condition_unresolved", events: observations.flatMap((item) => item.sequences), corrections: [] };
  const proven = observations.filter((item) => item.result !== "unknown" && item.strength === "native");
  if (proven.length === 0) {
    return { status: "inconclusive", reasonCode: "condition_unresolved", events: observations.flatMap((item) => item.sequences), corrections: [] };
  }
  if (proven.length !== observations.length) return { status: "inconclusive", reasonCode: "condition_unresolved", events: observations.flatMap((item) => item.sequences), corrections: [] };
  const matching = proven.filter((item) => fails ? item.result === "negative" : item.result === "positive");
  if (matching.length === 0) {
    return { status: "not_applicable", reasonCode: "condition_false_observed", events: observations.flatMap((item) => item.sequences), corrections: [] };
  }
  const triggerResult = matching.reduce((latest, item) => item.orderSequences.at(-1) > latest.orderSequences.at(-1) ? item : latest);
  const actionEvidence = evidenceForCommands(actions, timeline, trace, { afterSequence: triggerResult.orderSequences.at(-1), context: contextOf(triggerResult) });
  if (actionEvidence.status === "unobserved") return { ...actionEvidence, events: triggerResult.sequences, reasonCode: "condition_true_action_unobserved" };
  if (hasAlternativeCommands(instruction, 1)) return { status: "inconclusive", reasonCode: "alternative_commands_unresolved", events: [...new Set([...triggerResult.sequences, ...actionEvidence.events])], corrections: [] };
  return { ...actionEvidence, events: [...new Set([...triggerResult.sequences, ...actionEvidence.events])] };
}

function prohibitionEvidence(instruction, timeline, trace) {
  const events = instruction.commands.flatMap((command) => commandObservations(command, timeline, trace).flatMap((item) => item.sequences));
  return { status: "inconclusive", reasonCode: "prohibition_uninterpreted", events: [...new Set(events)].sort((a, b) => a - b), corrections: [] };
}

function redactedEvidence(instruction, timeline, trace) {
  if (instruction.kind === "condition") return { status: "inconclusive", reasonCode: "command_redacted", events: [], corrections: [] };
  if (instruction.commands.length === 0) return { status: "inconclusive", reasonCode: "command_redacted", events: [], corrections: [] };
  const observed = evidenceForCommands(instruction.commands, timeline, trace);
  if (instruction.text === null) return { status: "inconclusive", reasonCode: "command_redacted", events: observed.events, corrections: [] };
  if (hasAlternativeCommands(instruction)) return { status: "inconclusive", reasonCode: "command_redacted", events: observed.events, corrections: [] };
  if (observed.status === "contradicted") return observed;
  return { ...observed, status: observed.status === "unobserved" ? "inconclusive" : "partial", reasonCode: "command_redacted" };
}

export function evaluateReport({ trace, skill }) {
  const timeline = correlateTrace(trace);
  const commandLimitations = trace.records.flatMap(({ sequence, record }) => (record.privacy ?? [])
    .map((item) => ({ marker: item, reason: COMMAND_PRIVACY.exec(item)?.[1] }))
    .filter((item) => item.reason !== undefined)
    .map((item) => ({ text: PRIVACY_LIMIT_TEXT[item.reason], source: `evento #${sequence} privacy:${item.marker}` })));
  const evaluations = skill.instructions.map((instruction) => {
    const evidence = PROHIBITION.test(instruction.text ?? "")
      ? prohibitionEvidence(instruction, timeline, trace)
      : instruction.kind === "guidance"
      ? { status: "not_applicable", reasonCode: "guidance_not_step", events: [], corrections: [] }
      : instruction.commandRedacted
        ? redactedEvidence(instruction, timeline, trace)
      : instruction.kind !== "condition" && hasAlternativeCommands(instruction)
        ? alternativeCommandEvidence(instruction, timeline, trace)
      : instruction.kind === "condition"
        ? conditionalEvidence(instruction, timeline, trace)
        : instruction.commands.length > 0
          ? evidenceForCommands(instruction.commands, timeline, trace)
          : { status: "unobserved", reasonCode: "no_observable_command", events: [], corrections: [] };
    return {
      instruction: instruction.id,
      kind: instruction.kind,
      text: instruction.text,
      heading: instruction.heading,
      status: evidence.status,
      reasonCode: evidence.reasonCode,
      sources: { skill: { sha256: skill.sha256, line: instruction.line }, events: evidence.events },
      corrections: evidence.corrections,
    };
  });
  const bySource = new Map();
  for (const entry of timeline.entries) {
    const platform = entry.fields.platform ?? null;
    const key = JSON.stringify([entry.source.agent, entry.source.contract, platform]);
    if (!bySource.has(key)) bySource.set(key, { agent: entry.source.agent, contract: entry.source.contract, platform, events: [] });
    const source = bySource.get(key);
    source.events.push(entry.sequence);
  }
  const environment = [...bySource.values()];
  return {
    reportVersion: 1,
    skill: { name: skill.name, observedName: skill.observedName, observedNames: skill.observedNames ?? [], observedSources: skill.observedSources ?? [], identification: skill.identification, nameMatchesObservation: skill.nameMatchesObservation, sha256: skill.sha256 },
    environment,
    timeline,
    evaluations,
    limitations: [
      { text: "Ausência de evento não prova omissão.", source: "docs/traces.md" },
      { text: "Leitura ou referência a SKILL.md não comprova que o agente carregou as instruções.", source: "docs/traces.md" },
      { text: "Evidência de comando comprova apenas o resultado observado da ferramenta, não toda a intenção da instrução.", source: "docs/agent-observation.md" },
      ...(timeline.capture.content === false ? [{ text: "Conteúdo dos argumentos não foi coletado; comandos não podem ser comparados pela captura.", source: "timeline.capture.content" }] : []),
      ...commandLimitations,
      ...(timeline.coverage.partial ? [{ text: "Cobertura parcial da captura ou correlação; veja timeline.coverage.", source: "timeline.coverage" }] : []),
    ],
  };
}
