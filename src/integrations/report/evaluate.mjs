import { correlateTrace } from "../correlation/timeline.mjs";

const SUCCESS = new Set(["success", "completed"]);
const FAILURE = new Set(["failure", "failed", "blocked", "declined"]);
const PROHIBITION = /\b(?:do\s+not|don't|never|must\s+not|não|nunca|jamais)\s+(?:run|execute|rode|use|call|chame|instale|install|faça)\b/i;

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
  const sequences = trace.records.filter(({ record }) => commandAt(record) === command).map(({ sequence }) => sequence);
  return timeline.operations.filter((op) => op.type === "tool" && op.evidence.some((sequence) => sequences.includes(sequence)))
    .map((op) => ({ operation: op.id, strength: op.strength, state: op.state, result: operationResult(op), session: op.session, origin: op.origin, sequences: op.evidence }))
    .sort((a, b) => a.sequences[0] - b.sequences[0]);
}

const contextOf = (observation) => JSON.stringify([observation.origin, observation.session]);
const multipleContexts = (observations) => new Set(observations.map(contextOf)).size > 1;

function overlappingAttempts(observations) {
  let latestEnd = -Infinity;
  for (const item of observations) {
    if (item.sequences[0] <= latestEnd) return true;
    latestEnd = Math.max(latestEnd, item.state === "closed" ? item.sequences.at(-1) : Infinity);
  }
  return false;
}

function evidenceForCommand(command, timeline, trace, { afterSequence = 0, context = null } = {}) {
  const observations = commandObservations(command, timeline, trace)
    .filter((item) => item.sequences[0] > afterSequence && (context === null || contextOf(item) === context));
  if (observations.length === 0) return { status: "unobserved", reasonCode: "no_matching_observation", events: [], corrections: [] };
  if (multipleContexts(observations)) return { status: "partial", reasonCode: "ambiguous_context", events: observations.flatMap((item) => item.sequences), corrections: [] };
  if (overlappingAttempts(observations)) return { status: "partial", reasonCode: "overlapping_attempts", events: [...new Set(observations.flatMap((item) => item.sequences))].sort((a, b) => a - b), corrections: [] };
  const last = observations.at(-1);
  const earlierFailures = observations.slice(0, -1).filter((item) => item.result === "negative" && item.strength === "native");
  const corrections = last.result === "positive" && last.strength === "native"
    ? earlierFailures.map((item) => ({ failed: item.sequences, corrected: last.sequences }))
    : [];
  const events = [...new Set(observations.flatMap((item) => item.sequences))];
  if (last.result === "negative") return { status: "contradicted", reasonCode: "matching_command_failed", events, corrections };
  if (last.result === "positive" && last.strength === "native") return { status: "sufficient", reasonCode: "matching_command_succeeded", events, corrections };
  return { status: "partial", reasonCode: last.strength === "heuristic" ? "heuristic_operation" : "result_unconfirmed", events, corrections };
}

function evidenceForCommands(commands, timeline, trace, options) {
  const evidence = commands.map((command) => evidenceForCommand(command, timeline, trace, options));
  if (evidence.length === 1) return evidence[0];
  const statuses = evidence.map((item) => item.status);
  const status = statuses.includes("contradicted") ? "contradicted"
    : statuses.every((item) => item === "sufficient") ? "sufficient"
      : statuses.every((item) => item === "unobserved") ? "unobserved" : "partial";
  const reasonCode = {
    contradicted: "some_commands_failed",
    sufficient: "all_commands_succeeded",
    unobserved: "no_matching_observation",
    partial: "commands_incomplete",
  }[status];
  return {
    status,
    reasonCode,
    events: [...new Set(evidence.flatMap((item) => item.events))].sort((a, b) => a - b),
    corrections: evidence.flatMap((item) => item.corrections),
  };
}

function conditionalEvidence(instruction, timeline, trace) {
  const [trigger, ...actions] = instruction.commands;
  const [prefix, between] = (instruction.text ?? "").split(/`[^`]*`/);
  const conditionText = `${prefix ?? ""} ${between ?? ""}`;
  const fails = /\b(?:falh\w*|fail\w*|erro|error)\b/i.test(conditionText);
  const succeeds = /\b(?:pass\w*|succeed\w*|sucesso|success)\b/i.test(conditionText);
  if (!trigger || actions.length === 0 || fails === succeeds) return { status: "inconclusive", reasonCode: "condition_unresolved", events: [], corrections: [] };
  const observations = commandObservations(trigger, timeline, trace);
  if (multipleContexts(observations)) return { status: "inconclusive", reasonCode: "condition_unresolved", events: observations.flatMap((item) => item.sequences), corrections: [] };
  const proven = observations.filter((item) => item.result !== "unknown" && item.strength === "native");
  if (proven.length === 0) {
    return { status: "inconclusive", reasonCode: "condition_unresolved", events: observations.flatMap((item) => item.sequences), corrections: [] };
  }
  const matching = proven.filter((item) => fails ? item.result === "negative" : item.result === "positive");
  if (matching.length === 0) {
    if (proven.length !== observations.length) return { status: "inconclusive", reasonCode: "condition_unresolved", events: observations.flatMap((item) => item.sequences), corrections: [] };
    return { status: "not_applicable", reasonCode: "condition_false_observed", events: observations.flatMap((item) => item.sequences), corrections: [] };
  }
  const triggerResult = matching.at(-1);
  const actionEvidence = evidenceForCommands(actions, timeline, trace, { afterSequence: triggerResult.sequences.at(-1), context: contextOf(triggerResult) });
  return { ...actionEvidence, events: [...new Set([...triggerResult.sequences, ...actionEvidence.events])], reasonCode: actionEvidence.status === "unobserved" ? "condition_true_action_unobserved" : actionEvidence.reasonCode };
}

function prohibitionEvidence(instruction, timeline, trace) {
  const events = instruction.commands.flatMap((command) => commandObservations(command, timeline, trace).flatMap((item) => item.sequences));
  return { status: "inconclusive", reasonCode: "prohibition_uninterpreted", events: [...new Set(events)].sort((a, b) => a - b), corrections: [] };
}

export function evaluateReport({ trace, skill }) {
  const timeline = correlateTrace(trace);
  const evaluations = skill.instructions.map((instruction) => {
    const evidence = PROHIBITION.test(instruction.text ?? "")
      ? prohibitionEvidence(instruction, timeline, trace)
      : instruction.kind === "guidance"
      ? { status: "not_applicable", reasonCode: "guidance_not_step", events: [], corrections: [] }
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
    const key = `${entry.source.agent}/${entry.source.contract}`;
    if (!bySource.has(key)) bySource.set(key, { agent: entry.source.agent, contract: entry.source.contract, platform: null, events: [] });
    const source = bySource.get(key);
    source.platform ??= entry.fields.platform ?? null;
    source.events.push(entry.sequence);
  }
  const environment = [...bySource.values()];
  return {
    reportVersion: 1,
    skill: { name: skill.name, observedName: skill.observedName, observedSources: skill.observedSources ?? [], identification: skill.identification, nameMatchesObservation: skill.nameMatchesObservation, sha256: skill.sha256 },
    environment,
    timeline,
    evaluations,
    limitations: [
      { text: "Ausência de evento não prova omissão.", source: "docs/traces.md" },
      { text: "Leitura ou referência a SKILL.md não comprova que o agente carregou as instruções.", source: "docs/traces.md" },
      { text: "Evidência de comando comprova apenas o resultado observado da ferramenta, não toda a intenção da instrução.", source: "docs/agent-observation.md" },
      ...(timeline.capture.content === false ? [{ text: "Conteúdo dos argumentos não foi coletado; comandos não podem ser comparados pela captura.", source: "timeline.capture.content" }] : []),
      ...(timeline.coverage.partial ? [{ text: "Cobertura parcial da captura ou correlação; veja timeline.coverage.", source: "timeline.coverage" }] : []),
    ],
  };
}
