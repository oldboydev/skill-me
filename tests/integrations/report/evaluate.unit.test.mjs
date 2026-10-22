import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateReport } from "../../../src/integrations/report/evaluate.mjs";
import { parseInstructions } from "../../../src/integrations/report/instructions.mjs";
import { buildTrace } from "../correlation/helpers/trace-builder.mjs";

const commandContent = (command) => ({ fields: [{ field: "tool_input.command", role: "args", kind: "text", value: command }] });
const pre = (id, command) => ({ src: "claude", kind: "tool_pre", ids: { sessionId: "s1", toolUseId: id }, fields: { toolName: "Bash" }, content: commandContent(command) });
const post = (id, outcome) => ({ src: "claude", kind: "tool_post", ids: { sessionId: "s1", toolUseId: id }, fields: { toolName: "Bash", outcome } });
const skill = (source) => ({ name: "demo", observedName: "demo", identification: "explicit_path", nameMatchesObservation: true, sha256: "a".repeat(64), instructions: parseInstructions(source) });
const states = (report) => report.evaluations.map((item) => item.status);

test("T7-C4 seis estados fechados, justificativa, linha/hash e sequência; orientação não é etapa executável", () => {
  const trace = buildTrace([
    pre("ok", "npm test"), post("ok", "success"),
    pre("bad", "npm run bad"), post("bad", "failure"),
    pre("open", "npm run open"),
    { src: "codexExec", kind: "item", native: "item.started", ids: { itemId: "it1" }, fields: { phase: "started", itemType: "command_execution" }, content: { fields: [{ field: "item.command", role: "args", kind: "text", value: "npm run maybe" }] } },
    { src: "codexExec", kind: "item", native: "item.completed", ids: { itemId: "it1" }, fields: { phase: "completed", itemType: "command_execution", status: "completed", exitCode: 0 } },
  ]);
  const report = evaluateReport({ trace, skill: skill("# Fluxo\n- Run `npm test`.\n- Run `npm run bad`.\n- Run `npm run open`.\n- Run `npm run maybe`.\n- Run `npm run absent`.\n- If `npm test` fails, run `npm run fix`.\n- If `npm run unknown` fails, run `npm run fix`.\n- Prefer simplicity.\n") });
  assert.deepEqual(states(report), ["sufficient", "contradicted", "partial", "partial", "unobserved", "not_applicable", "inconclusive", "not_applicable"]);
  assert.deepEqual(report.evaluations.map((item) => item.sources.skill.line), [2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
  assert.equal(report.evaluations[7].reasonCode, "guidance_not_step");
  assert.ok(report.evaluations.every((item) => item.reasonCode && item.sources.skill.sha256 === "a".repeat(64)));
});

test("T7-C5 comando literal: resultado nativo, parcial, negativo e silêncio; leitura de SKILL.md não vira carregamento", () => {
  const trace = buildTrace([
    pre("read", "cat SKILL.md"), post("read", "success"),
    pre("test", "npm test"), post("test", "success"),
    pre("fail", "npm run bad"), post("fail", "failure"),
    pre("open", "npm run open"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test`.\n- Run `npm run bad`.\n- Run `npm run open`.\n- Run `npm run absent`.\n- Read `SKILL.md`.\n") });
  assert.deepEqual(states(report), ["sufficient", "contradicted", "partial", "unobserved", "unobserved"]);
  assert.deepEqual(report.evaluations[4].sources.events, []);
  assert.ok(report.limitations.some((item) => item.text.includes("não comprova")));
});

test("T7-C5 ação em checklist mantém a falha observada", () => {
  const trace = buildTrace([pre("test", "npm test"), post("test", "failure")]);
  const report = evaluateReport({ trace, skill: skill("- [ ] Run `npm test`.\n") });
  assert.deepEqual(states(report), ["contradicted"]);
  assert.equal(report.evaluations[0].kind, "action");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
});

test("T7-C5 exemplo em bloco aninhado não exige comando adicional", () => {
  const trace = buildTrace([pre("test", "npm test"), post("test", "success")]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test`.\n    ```sh\n    - Run `npm run deploy`.\n    ```\n") });
  assert.deepEqual(states(report), ["sufficient"]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
});

test("T7-C5 condição aninhada falsa não altera a ação anterior", () => {
  const trace = buildTrace([pre("test", "npm test"), post("test", "success")]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test`.\n    - If `npm test` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["sufficient", "not_applicable"]);
  assert.deepEqual(report.evaluations.map((item) => item.sources.skill.line), [1, 2]);
  assert.deepEqual(report.evaluations.map((item) => item.sources.events), [[1, 2], [1, 2]]);
});

test("T7-C5 condição aninhada após linha em branco conserva fonte própria", () => {
  const trace = buildTrace([pre("test", "npm test"), post("test", "success")]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test`.\n\n    - If `npm test` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["sufficient", "not_applicable"]);
  assert.deepEqual(report.evaluations.map((item) => item.sources.skill.line), [1, 3]);
  assert.deepEqual(report.evaluations.map((item) => item.sources.events), [[1, 2], [1, 2]]);
});

test("T7-C5 item irmão após sublista profunda recebe avaliação e fonte próprias", () => {
  const trace = buildTrace([
    pre("build", "npm run build"), post("build", "success"),
    pre("deploy", "npm run deploy"), post("deploy", "failure"),
  ]);
  const source = "- Run `npm test`.\n    - Verify `npm run lint`.\n      - Run `npm run build`.\n    - Run `npm run deploy`.\n";
  const report = evaluateReport({ trace, skill: skill(source) });
  assert.deepEqual(states(report), ["unobserved", "unobserved", "sufficient", "contradicted"]);
  assert.deepEqual(report.evaluations.map((item) => item.sources.skill.line), [1, 2, 3, 4]);
  assert.deepEqual(report.evaluations.map((item) => item.sources.events), [[], [], [1, 2], [3, 4]]);
});

test("T7-C5 curl literal executado com sucesso recebe fonte e estado suficiente", () => {
  const trace = buildTrace([pre("curl", "curl --version"), post("curl", "success")]);
  const report = evaluateReport({ trace, skill: skill("- Run `curl --version`.\n") });
  assert.deepEqual(states(report), ["sufficient"]);
  assert.equal(report.evaluations[0].reasonCode, "matching_command_succeeded");
  assert.deepEqual(report.evaluations[0].sources.skill.line, 1);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
});

test("T7-C7 coleta desativada não nega argumentos preservados anteriormente", () => {
  const trace = buildTrace([pre("test", "npm test"), post("test", "success")]);
  trace.capture.state = "disabled";
  const report = evaluateReport({ trace, skill: skill("- Run `npm test`.\n") });
  assert.deepEqual(states(report), ["sufficient"]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
  assert.deepEqual(report.limitations.find((item) => item.source === "timeline.capture.content"), {
    text: "A coleta de conteúdo está desativada no estado atual da captura; somente argumentos já sanitizados e preservados nos eventos podem comprovar comandos.",
    source: "timeline.capture.content",
  });
});

test("T7-C5 referência textual não rebaixa prova de curl observada", () => {
  const trace = buildTrace([pre("curl", "curl --version"), post("curl", "success")]);
  const report = evaluateReport({ trace, skill: skill("- Run `curl --version` (see `expected output` for reference).\n") });
  assert.deepEqual(states(report), ["sufficient"]);
  assert.equal(report.evaluations[0].reasonCode, "matching_command_succeeded");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
});

test("T7-C5 referência parentética não oculta segundo comando sem prova", () => {
  const trace = buildTrace([pre("curl", "curl --version"), post("curl", "success")]);
  const source = "- Run `curl --version` (see `expected output`) and\n  `docker build .`.\n";
  const report = evaluateReport({ trace, skill: skill(source) });
  assert.deepEqual(states(report), ["partial"]);
  assert.equal(report.evaluations[0].reasonCode, "commands_incomplete");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
  const complete = buildTrace([
    pre("curl", "curl --version"), post("curl", "success"),
    pre("docker", "docker build ."), post("docker", "success"),
  ]);
  const completeReport = evaluateReport({ trace: complete, skill: skill(source) });
  assert.deepEqual(states(completeReport), ["sufficient"]);
  assert.deepEqual(completeReport.evaluations[0].sources.events, [1, 2, 3, 4]);
});

test("T7-C5 falha de comando com vínculo heurístico não vira contradição", () => {
  const trace = buildTrace([
    { src: "codexExec", kind: "item", native: "item.started", ids: { itemId: "it1" }, fields: { phase: "started", itemType: "command_execution" }, content: { fields: [{ field: "item.command", role: "args", kind: "text", value: "npm test" }] } },
    { src: "codexExec", kind: "item", native: "item.completed", ids: { itemId: "it1" }, fields: { phase: "completed", itemType: "command_execution", status: "completed", exitCode: 1 } },
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test`.\n") });
  assert.deepEqual(states(report), ["partial"]);
  assert.equal(report.evaluations[0].reasonCode, "heuristic_operation");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
});

test("T7-C6 condição falsa explícita, desconhecida e erro corrigido preservando ambas as sequências", () => {
  const trace = buildTrace([
    pre("check", "npm test"), post("check", "success"),
    pre("retry1", "npm run deploy"), post("retry1", "failure"),
    pre("retry2", "npm run deploy"), post("retry2", "success"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails, run `npm run fix`.\n- If `npm run unknown` fails, run `npm run fix`.\n- Run `npm run deploy`.\n") });
  assert.deepEqual(states(report), ["not_applicable", "inconclusive", "sufficient"]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
  assert.deepEqual(report.evaluations[2].corrections, [{ failed: [3, 4], corrected: [5, 6] }]);
});

test("T7-C6 referência textual no gatilho não usa o sucesso da ação para declarar condição falsa", () => {
  const trace = buildTrace([pre("fix", "npm run fix"), post("fix", "success")]);
  const report = evaluateReport({ trace, skill: skill("- If `expected output` validation fails, run `npm run fix` and `npm run verify`.\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "condition_unresolved");
  assert.deepEqual(report.evaluations[0].sources.events, []);
});

test("T7-C6 condição em prosa não usa o primeiro comando da ação como gatilho", () => {
  const trace = buildTrace([pre("fix", "npm run fix"), post("fix", "success")]);
  const report = evaluateReport({ trace, skill: skill("- If validation fails, run `npm run fix` then `npm run verify`.\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "condition_unresolved");
  assert.deepEqual(report.evaluations[0].sources.events, []);
});

test("T7-C6 falha genérica não comprova qualificador de código de saída", () => {
  const trace = buildTrace([pre("test", "npm test"), post("test", "failure")]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails with exit code 2, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "condition_unresolved");
  assert.deepEqual(report.evaluations[0].sources.events, []);
});

test("T7-C6 falha genérica não comprova qualificador anterior ao comando", () => {
  const trace = buildTrace([pre("test", "npm test"), post("test", "failure")]);
  const report = evaluateReport({ trace, skill: skill("- If on Linux `npm test` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "condition_unresolved");
  assert.deepEqual(report.evaluations[0].sources.events, []);
});

test("T7-C5 enumeração por vírgulas exige prova de todos os comandos", () => {
  const source = "- Run `npm test`, `npm run lint` and `npm run build`.\n";
  const partial = evaluateReport({ trace: buildTrace([pre("test", "npm test"), post("test", "success")]), skill: skill(source) });
  assert.deepEqual(states(partial), ["partial"]);
  assert.equal(partial.evaluations[0].reasonCode, "commands_incomplete");
  assert.deepEqual(partial.evaluations[0].sources.events, [1, 2]);
  const complete = evaluateReport({ trace: buildTrace([
    pre("test", "npm test"), post("test", "success"),
    pre("lint", "npm run lint"), post("lint", "success"),
    pre("build", "npm run build"), post("build", "success"),
  ]), skill: skill(source) });
  assert.deepEqual(states(complete), ["sufficient"]);
  assert.equal(complete.evaluations[0].reasonCode, "all_commands_succeeded");
  assert.deepEqual(complete.evaluations[0].sources.events, [1, 2, 3, 4, 5, 6]);
});

test("T7-C6 comando repetido em sessões distintas não é declarado correção nem condição falsa", () => {
  const trace = buildTrace([
    pre("a", "npm test"), post("a", "failure"),
    { ...pre("b", "npm test"), ids: { sessionId: "s2", toolUseId: "b" } },
    { ...post("b", "success"), ids: { sessionId: "s2", toolUseId: "b" } },
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test`.\n- If `npm test` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["partial", "inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "ambiguous_context");
  assert.deepEqual(report.evaluations[0].corrections, []);
});

test("T7-C5 falha e sucesso de subagentes distintos não são uma correção", () => {
  const withAgent = (item, agentId) => ({ ...item, ids: { ...item.ids, agentId } });
  const trace = buildTrace([
    withAgent(pre("a", "npm test"), "agent-a"), withAgent(post("a", "failure"), "agent-a"),
    withAgent(pre("b", "npm test"), "agent-b"), withAgent(post("b", "success"), "agent-b"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test`.\n") });
  assert.notEqual(report.timeline.operations[0].subagent, report.timeline.operations[1].subagent);
  assert.deepEqual(states(report), ["partial"]);
  assert.equal(report.evaluations[0].reasonCode, "ambiguous_context");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4]);
  assert.deepEqual(report.evaluations[0].corrections, []);
});

test("T7-C5 instrução com dois comandos só é suficiente quando ambos são observados", () => {
  const trace = buildTrace([pre("test", "npm test"), post("test", "success")]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test` and `npm run build`.\n") });
  assert.deepEqual(states(report), ["partial"]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
});

test("T7-C5 segundo comando na continuação não é declarado executado pelo primeiro", () => {
  const trace = buildTrace([pre("test", "npm test"), post("test", "success")]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test` and\n  `npm run build`.\n") });
  assert.deepEqual(states(report), ["partial"]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
});

test("T7-C5 argumentos divergentes no mesmo par nativo não comprovam nenhum comando", () => {
  const trace = buildTrace([
    pre("mixed", "npm test"),
    { ...post("mixed", "success"), content: commandContent("npm run build") },
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test` and `npm run build`.\n") });
  assert.deepEqual(states(report), ["partial"]);
  assert.equal(report.evaluations[0].reasonCode, "command_conflict");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
});

test("T7-C5 argumento divergente em evento duplicado limita prova e cita a duplicata", () => {
  const trace = buildTrace([
    pre("mixed", "npm test"),
    { ...post("mixed", "success"), content: commandContent("npm test") },
    { ...post("mixed", "success"), content: commandContent("npm run build") },
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test`.\n") });
  assert.deepEqual(report.timeline.operations[0].duplicates, [3]);
  assert.deepEqual(states(report), ["partial"]);
  assert.equal(report.evaluations[0].reasonCode, "command_conflict");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3]);
});

test("T7-C5 sanitização de caminhos não transforma comandos distintos em prova suficiente", () => {
  const trace = buildTrace([pre("other", "bash <home>/verify.sh"), post("other", "success")]);
  trace.records[0].record.privacy = ["tool_input.command:sensitive_removed"];
  const report = evaluateReport({ trace, skill: skill("- Run `bash /home/alice/verify.sh`.\n- Run `bash <home>/verify.sh`.\n") });
  assert.deepEqual(states(report), ["inconclusive", "partial"]);
  assert.equal(report.evaluations[0].reasonCode, "command_redacted");
  assert.equal(report.evaluations[1].reasonCode, "command_privacy_limited");
  assert.deepEqual(report.evaluations[1].sources.events, [1, 2]);
});

test("T7-C5 comando legível não encobre outro comando omitido no mesmo item", () => {
  const trace = buildTrace([pre("test", "npm test"), post("test", "success")]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test` and `bash /home/alice/verify.sh`.\n") });
  assert.deepEqual(states(report), ["partial"]);
  assert.equal(report.evaluations[0].reasonCode, "command_redacted");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
});

test("T7-C5 comandos de sessões distintas não comprovam uma instrução composta", () => {
  const buildPre = { ...pre("build", "npm run build"), ids: { sessionId: "s2", toolUseId: "build" } };
  const buildPost = { ...post("build", "success"), ids: { sessionId: "s2", toolUseId: "build" } };
  const trace = buildTrace([pre("test", "npm test"), post("test", "success"), buildPre, buildPost]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test` and `npm run build`.\n") });
  assert.deepEqual(states(report), ["partial"]);
  assert.equal(report.evaluations[0].reasonCode, "commands_different_contexts");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4]);
  const failed = buildTrace([pre("test", "npm test"), post("test", "success"), buildPre, { ...buildPost, fields: { toolName: "Bash", outcome: "failure" } }]);
  const failureReport = evaluateReport({ trace: failed, skill: skill("- Run `npm test` and `npm run build`.\n") });
  assert.deepEqual(states(failureReport), ["partial"]);
  assert.equal(failureReport.evaluations[0].reasonCode, "commands_different_contexts");
});

test("T7-C5 tentativas sobrepostas não permitem contradição entre sessões", () => {
  const inSecondSession = (item) => ({ ...item, ids: { ...item.ids, sessionId: "s2" } });
  const trace = buildTrace([
    pre("first", "npm test"), pre("second", "npm test"),
    post("first", "success"), post("second", "success"),
    inSecondSession(pre("build", "npm run build")),
    inSecondSession(post("build", "failure")),
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test` and `npm run build`.\n") });
  assert.deepEqual(states(report), ["partial"]);
  assert.equal(report.evaluations[0].reasonCode, "commands_different_contexts");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4, 5, 6]);
});

test("T7-C5 comando ambíguo não deixa outra sessão contradizer instrução composta", () => {
  const inSession = (item, sessionId) => ({ ...item, ids: { ...item.ids, sessionId } });
  const trace = buildTrace([
    inSession(pre("a", "npm test"), "s1"), inSession(post("a", "success"), "s1"),
    inSession(pre("b", "npm test"), "s2"), inSession(post("b", "success"), "s2"),
    inSession(pre("c", "npm run build"), "s3"), inSession(post("c", "failure"), "s3"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test` and `npm run build`.\n") });
  assert.deepEqual(states(report), ["partial"]);
  assert.equal(report.evaluations[0].reasonCode, "ambiguous_context");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4, 5, 6]);
});

test("T7-C5 todos os comandos positivos são suficientes; falha em um contradiz a instrução", () => {
  const trace = buildTrace([
    pre("test", "npm test"), post("test", "success"),
    pre("build", "npm run build"), post("build", "success"),
    pre("lint", "npm run lint"), post("lint", "failure"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test` and `npm run build`.\n- Run `npm test` and `npm run lint`.\n") });
  assert.deepEqual(states(report), ["sufficient", "contradicted"]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4]);
  assert.deepEqual(report.evaluations[1].sources.events, [1, 2, 5, 6]);
});

test("T7-C5 comandos alternativos não são contraditos pela falha de uma opção", () => {
  const trace = buildTrace([
    pre("test", "npm test"), post("test", "failure"),
    pre("build", "npm run build"), post("build", "success"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test` or `npm run build`.\n- Run `npm test` ou `npm run build`.\n- Run `npm test` (see errors or warnings) and `npm run build`.\n") });
  assert.deepEqual(states(report), ["inconclusive", "inconclusive", "contradicted"]);
  assert.deepEqual(report.evaluations.map((item) => item.reasonCode), ["alternative_commands_unresolved", "alternative_commands_unresolved", "some_commands_failed"]);
  assert.deepEqual(report.evaluations.map((item) => item.sources.events), [[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4]]);
  assert.deepEqual(report.evaluations.map((item) => item.sources.skill.line), [1, 2, 3]);
});

test("T7-C5 alternativa conserva correção comprovada de uma opção", () => {
  const trace = buildTrace([
    pre("failed", "npm test"), post("failed", "failure"),
    pre("corrected", "npm test"), post("corrected", "success"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test` or `npm run build`.\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "alternative_commands_unresolved");
  assert.deepEqual(report.evaluations[0].corrections, [{ failed: [1, 2], corrected: [3, 4] }]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4]);
});

test("T7-C5 alternativa redigida conserva correção da opção observada", () => {
  const trace = buildTrace([
    pre("failed", "npm test"), post("failed", "failure"),
    pre("corrected", "npm test"), post("corrected", "success"),
  ]);
  const source = "- Run `npm test` or `npm run build` (see `TOKEN=$(gh auth token)` for authentication).\n";
  const report = evaluateReport({ trace, skill: skill(source) });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "command_redacted");
  assert.deepEqual(report.evaluations[0].corrections, [{ failed: [1, 2], corrected: [3, 4] }]);
});

test("T7-C5 falha do segundo comando coordenado impede prova suficiente", () => {
  const trace = buildTrace([
    pre("test", "npm test"), post("test", "success"),
    pre("docker", "docker ps"), post("docker", "failure"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test` and `docker ps`.\n") });
  assert.deepEqual(states(report), ["contradicted"]);
  assert.equal(report.evaluations[0].reasonCode, "some_commands_failed");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4]);
});

test("T7-C5 alternativa após texto longo mantém julgamento inconclusivo", () => {
  const trace = buildTrace([
    pre("test", "npm test"), post("test", "failure"),
    pre("build", "npm run build"), post("build", "success"),
  ]);
  const source = `- Run \`npm test\` (${"a".repeat(1000)}) or \`npm run build\`.\n`;
  const report = evaluateReport({ trace, skill: skill(source) });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "alternative_commands_unresolved");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4]);
  assert.match(report.evaluations[0].text, /or `npm run build`\.$/);
});

test("T7-C5 comando literal acima de 300 caracteres usa resultado e fontes nativas", () => {
  const command = `node ${"x".repeat(298)}`;
  const trace = buildTrace([pre("long", command), post("long", "success")]);
  const report = evaluateReport({ trace, skill: skill(`- Run \`${command}\`.\n`) });
  assert.deepEqual(states(report), ["sufficient"]);
  assert.equal(report.evaluations[0].reasonCode, "matching_command_succeeded");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
});

test("T7-C5 alternativas sem observação preservam ausência e fonte da condição", () => {
  const source = "- Run `npm test` or `npm run build`.\n- If `npm test` fails, run `npm run fix` or `npm run retry`.\n";
  const noEvents = evaluateReport({ trace: buildTrace([]), skill: skill(source) });
  assert.deepEqual(states(noEvents), ["unobserved", "inconclusive"]);
  assert.equal(noEvents.evaluations[0].reasonCode, "no_matching_observation");
  assert.deepEqual(noEvents.evaluations[0].sources.events, []);
  const triggered = evaluateReport({ trace: buildTrace([pre("test", "npm test"), post("test", "failure")]), skill: skill(source) });
  assert.equal(triggered.evaluations[1].status, "unobserved");
  assert.equal(triggered.evaluations[1].reasonCode, "condition_true_action_unobserved");
  assert.deepEqual(triggered.evaluations[1].sources.events, [1, 2]);
});

test("T7-C5 alternativa entre parênteses não acusa contradição pela primeira falha", () => {
  const trace = buildTrace([
    pre("test", "npm test"), post("test", "failure"),
    pre("build", "npm run build"), post("build", "success"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test` (or `npm run build`).\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "alternative_commands_unresolved");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4]);
});

test("T7-C5 alternativa redigida impede contradição da opção visível", () => {
  const trace = buildTrace([pre("test", "npm test"), post("test", "failure")]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test` or `bash /home/alice/check.sh`.\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "command_redacted");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
  assert.match(report.evaluations[0].text, /bash <home>\/check\.sh/);
  const mandatory = evaluateReport({ trace, skill: skill("- Run `npm test` and `bash /home/alice/check.sh`.\n") });
  assert.deepEqual(states(mandatory), ["contradicted"]);
  assert.equal(mandatory.evaluations[0].reasonCode, "matching_command_failed");
  const redactedFirst = evaluateReport({ trace, skill: skill("- Run `bash /home/alice/check.sh` or `npm test`.\n") });
  assert.deepEqual(states(redactedFirst), ["inconclusive"]);
  assert.equal(redactedFirst.evaluations[0].reasonCode, "command_redacted");
  assert.deepEqual(redactedFirst.evaluations[0].sources.events, [1, 2]);
});

test("T7-C5 texto inteiro omitido pela política impede acusar alternativa invisível", () => {
  const trace = buildTrace([pre("test", "npm test"), post("test", "failure")]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test` or `export TOKEN=$(gh auth token)`.\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "command_redacted");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
  assert.equal(report.evaluations[0].text, null);
});

test("T7-C5 texto omitido por referência parentética não transforma alternativa em contradição", () => {
  const trace = buildTrace([
    pre("test", "npm test"), post("test", "failure"),
    pre("build", "npm run build"), post("build", "success"),
  ]);
  const source = "- Run `npm test` or `npm run build` (see `TOKEN=$(gh auth token)` for authentication).\n";
  const report = evaluateReport({ trace, skill: skill(source) });
  assert.equal(report.evaluations[0].text, null);
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "command_redacted");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4]);
});

test("T7-C5 script bash literal observado é comparado sem executar a referência", () => {
  const trace = buildTrace([pre("verify", "bash ./verify.sh"), post("verify", "success")]);
  const report = evaluateReport({ trace, skill: skill("- Run `bash ./verify.sh`.\n") });
  assert.deepEqual(states(report), ["sufficient"]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2]);
});

test("T7-C6 falha anterior mantém condição verdadeira e ação precisa vir depois", () => {
  const trace = buildTrace([
    pre("fix-early", "npm run fix"), post("fix-early", "success"),
    pre("fail", "npm test"), post("fail", "failure"),
    pre("retry", "npm test"), post("retry", "success"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["unobserved"]);
  assert.deepEqual(report.evaluations[0].corrections, [{ failed: [3, 4], corrected: [5, 6] }]);
  assert.deepEqual(report.evaluations[0].sources.events, [3, 4, 5, 6]);
});

test("T7-C6 ação posterior à falha comprova condição mesmo após retry positivo", () => {
  const trace = buildTrace([
    pre("fail", "npm test"), post("fail", "failure"),
    pre("retry", "npm test"), post("retry", "success"),
    pre("fix", "npm run fix"), post("fix", "success"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["sufficient"]);
  assert.deepEqual(report.evaluations[0].corrections, [{ failed: [1, 2], corrected: [3, 4] }]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4, 5, 6]);
});

test("T7-C6 ação condicional ausente ainda cita correção do gatilho", () => {
  const trace = buildTrace([
    pre("fail", "npm test"), post("fail", "failure"),
    pre("retry", "npm test"), post("retry", "success"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["unobserved"]);
  assert.equal(report.evaluations[0].reasonCode, "condition_true_action_unobserved");
  assert.deepEqual(report.evaluations[0].corrections, [{ failed: [1, 2], corrected: [3, 4] }]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4]);
});

test("T7-C6 escolha condicional inconclusiva ainda cita correção do gatilho", () => {
  const trace = buildTrace([
    pre("fail", "npm test"), post("fail", "failure"),
    pre("retry", "npm test"), post("retry", "success"),
    pre("fix", "npm run fix"), post("fix", "success"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails, run `npm run fix` or `npm run retry`.\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "alternative_commands_unresolved");
  assert.deepEqual(report.evaluations[0].corrections, [{ failed: [1, 2], corrected: [3, 4] }]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4, 5, 6]);
});

test("T7-C6 tentativa aberta posterior não apaga correção comprovada do gatilho", () => {
  const trace = buildTrace([
    pre("fail", "npm test"), post("fail", "failure"),
    pre("retry", "npm test"), post("retry", "success"),
    pre("open", "npm test"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "condition_unresolved");
  assert.deepEqual(report.evaluations[0].corrections, [{ failed: [1, 2], corrected: [3, 4] }]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4, 5]);
});

test("T7-C6 outra sessão não apaga correção comprovada do gatilho", () => {
  const inSecondSession = (item) => ({ ...item, ids: { ...item.ids, sessionId: "s2" } });
  const trace = buildTrace([
    pre("fail", "npm test"), post("fail", "failure"),
    pre("retry", "npm test"), post("retry", "success"),
    inSecondSession(pre("other", "npm test")),
    inSecondSession(post("other", "success")),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "condition_unresolved");
  assert.deepEqual(report.evaluations[0].corrections, [{ failed: [1, 2], corrected: [3, 4] }]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4, 5, 6]);
});

test("T7-C6 novo gatilho mantém correção histórica da ação anterior", () => {
  const trace = buildTrace([
    pre("first-trigger", "npm test"), post("first-trigger", "failure"),
    pre("fix-failed", "npm run fix"), post("fix-failed", "failure"),
    pre("fix-corrected", "npm run fix"), post("fix-corrected", "success"),
    pre("last-trigger", "npm test"), post("last-trigger", "failure"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["unobserved"]);
  assert.equal(report.evaluations[0].reasonCode, "condition_true_action_unobserved");
  assert.deepEqual(report.evaluations[0].corrections, [{ failed: [3, 4], corrected: [5, 6] }]);
  assert.deepEqual(report.evaluations[0].sources.events, [3, 4, 5, 6, 7, 8]);
});

test("T7-C6 novo gatilho em outra sessão mantém correção histórica da ação", () => {
  const inSecondSession = (item) => ({ ...item, ids: { ...item.ids, sessionId: "s2" } });
  const trace = buildTrace([
    pre("first-trigger", "npm test"), post("first-trigger", "failure"),
    pre("fix-failed", "npm run fix"), post("fix-failed", "failure"),
    pre("fix-corrected", "npm run fix"), post("fix-corrected", "success"),
    inSecondSession(pre("other-trigger", "npm test")),
    inSecondSession(post("other-trigger", "failure")),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "condition_unresolved");
  assert.deepEqual(report.evaluations[0].corrections, [{ failed: [3, 4], corrected: [5, 6] }]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("T7-C6 ação corrigida antes do gatilho ou em outra sessão não é atribuída", () => {
  const before = buildTrace([
    pre("fix-failed", "npm run fix"), post("fix-failed", "failure"),
    pre("fix-corrected", "npm run fix"), post("fix-corrected", "success"),
    pre("trigger", "npm test"), post("trigger", "failure"),
  ]);
  const inSecondSession = (item) => ({ ...item, ids: { ...item.ids, sessionId: "s2" } });
  const otherSession = buildTrace([
    pre("trigger", "npm test"), post("trigger", "failure"),
    inSecondSession(pre("fix-failed", "npm run fix")),
    inSecondSession(post("fix-failed", "failure")),
    inSecondSession(pre("fix-corrected", "npm run fix")),
    inSecondSession(post("fix-corrected", "success")),
  ]);
  for (const trace of [before, otherSession]) {
    const report = evaluateReport({ trace, skill: skill("- If `npm test` fails, run `npm run fix`.\n") });
    assert.deepEqual(states(report), ["unobserved"]);
    assert.equal(report.evaluations[0].reasonCode, "condition_true_action_unobserved");
    assert.deepEqual(report.evaluations[0].corrections, []);
  }
});

test("T7-C6 tentativas simultâneas não são relatadas como correção", () => {
  const trace = buildTrace([
    pre("a", "npm test"), pre("b", "npm test"),
    post("a", "failure"), post("b", "success"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test`.\n") });
  assert.deepEqual(states(report), ["partial"]);
  assert.equal(report.evaluations[0].reasonCode, "overlapping_attempts");
  assert.deepEqual(report.evaluations[0].corrections, []);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4]);
});

test("T7-C6 proibição condicional não recebe suficiente pela ação proibida", () => {
  const trace = buildTrace([
    pre("fail", "npm test"), post("fail", "failure"),
    pre("deploy", "npm deploy"), post("deploy", "success"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails, do not run `npm deploy`.\n- Do not run `npm deploy`.\n") });
  assert.deepEqual(states(report), ["inconclusive", "inconclusive"]);
  assert.ok(report.evaluations.every((item) => item.reasonCode === "prohibition_uninterpreted"));
});

test("T7-C6 palavra failure no comando da ação não altera condição succeeds", () => {
  const trace = buildTrace([
    pre("test", "npm test"), post("test", "success"),
    pre("report", "npm run failure-report"), post("report", "success"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` succeeds, run `npm run failure-report`.\n") });
  assert.deepEqual(states(report), ["sufficient"]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4]);
});

test("T7-C6 condição com dois gatilhos alternativos não é declarada falsa pelo primeiro", () => {
  const trace = buildTrace([
    pre("test", "npm test"), post("test", "success"),
    pre("lint", "npm run lint"), post("lint", "failure"),
    pre("fix", "npm run fix"), post("fix", "success"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails or `npm run lint` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "condition_unresolved");
});

test("T7-C6 ações alternativas após gatilho não são contraditas pela primeira falha", () => {
  const trace = buildTrace([
    pre("test", "npm test"), post("test", "failure"),
    pre("fix", "npm run fix"), post("fix", "failure"),
    pre("retry", "npm run retry"), post("retry", "success"),
  ]);
  const source = "- If `npm test` fails, run `npm run fix` or `npm run retry`.\n- If `npm test` fails, run `npm run fix` and `npm run retry`.\n";
  const report = evaluateReport({ trace, skill: skill(source) });
  assert.deepEqual(states(report), ["inconclusive", "contradicted"]);
  assert.deepEqual(report.evaluations.map((item) => item.reasonCode), ["alternative_commands_unresolved", "some_commands_failed"]);
  assert.deepEqual(report.evaluations.map((item) => item.sources.events), [[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]]);
  assert.deepEqual(report.evaluations.map((item) => item.sources.skill.line), [1, 2]);
  const falseTrigger = buildTrace([pre("test", "npm test"), post("test", "success")]);
  const falseReport = evaluateReport({ trace: falseTrigger, skill: skill(source) });
  assert.deepEqual(states(falseReport), ["not_applicable", "not_applicable"]);
  assert.deepEqual(falseReport.evaluations.map((item) => item.sources.events), [[1, 2], [1, 2]]);
});

test("T7-C6 ações alternativas conservam correção comprovada após o gatilho", () => {
  const trace = buildTrace([
    pre("trigger", "npm test"), post("trigger", "failure"),
    pre("failed", "npm run fix"), post("failed", "failure"),
    pre("corrected", "npm run fix"), post("corrected", "success"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails, run `npm run fix` or `npm run retry`.\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "alternative_commands_unresolved");
  assert.deepEqual(report.evaluations[0].corrections, [{ failed: [3, 4], corrected: [5, 6] }]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4, 5, 6]);
});

test("T7-C6 condição com gatilho removido não é contradita pela ação isolada", () => {
  const trace = buildTrace([pre("fix", "npm run fix"), post("fix", "failure")]);
  const report = evaluateReport({ trace, skill: skill("- If `bash /home/alice/check.sh` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "command_redacted");
  assert.deepEqual(report.evaluations[0].sources.events, []);
});

test("T7-C6 negação do gatilho não é interpretada como condição falsa", () => {
  const trace = buildTrace([pre("test", "npm test"), post("test", "success")]);
  const report = evaluateReport({ trace, skill: skill("- Se `npm test` não falhar, rode `npm run deploy`.\n- If `npm test` does not fail, run `npm run deploy`.\n- If `npm test` has no errors, run `npm run deploy`.\n- If `npm test` has no error, run `npm run deploy`.\n- Se `npm test` passar sem erros, rode `npm run deploy`.\n") });
  assert.deepEqual(states(report), ["inconclusive", "inconclusive", "inconclusive", "inconclusive", "inconclusive"]);
  assert.ok(report.evaluations.every((item) => item.reasonCode === "condition_unresolved"));
});

test("T7-C6 ação deve vir depois do último resultado verdadeiro entre gatilhos sobrepostos", () => {
  const trace = buildTrace([
    pre("a", "npm test"), pre("b", "npm test"), post("b", "failure"),
    pre("fix", "npm run fix"), post("fix", "success"), post("a", "failure"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["unobserved"]);
  assert.equal(report.evaluations[0].reasonCode, "condition_true_action_unobserved");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 6]);
});

test("T7-C6 tentativa aberta impede confirmar a condição apesar de outra falha", () => {
  const trace = buildTrace([
    pre("open", "npm test"), pre("fail", "npm test"), post("fail", "failure"),
    pre("fix", "npm run fix"), post("fix", "success"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- If `npm test` fails, run `npm run fix`.\n") });
  assert.deepEqual(states(report), ["inconclusive"]);
  assert.equal(report.evaluations[0].reasonCode, "condition_unresolved");
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3]);
});

test("T7-C6 tentativa aberta posterior conserva correção comprovada", () => {
  const trace = buildTrace([
    pre("fail", "npm test"), post("fail", "failure"),
    pre("ok", "npm test"), post("ok", "success"), pre("open", "npm test"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test`.\n") });
  assert.deepEqual(states(report), ["partial"]);
  assert.deepEqual(report.evaluations[0].corrections, [{ failed: [1, 2], corrected: [3, 4] }]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4, 5]);
});

test("T7-C5 duas tentativas abertas sobrepostas não apagam correção anterior", () => {
  const trace = buildTrace([
    pre("fail", "npm test"), post("fail", "failure"),
    pre("ok", "npm test"), post("ok", "success"),
    pre("open1", "npm test"), pre("open2", "npm test"),
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test`.\n") });
  assert.deepEqual(states(report), ["partial"]);
  assert.equal(report.evaluations[0].reasonCode, "overlapping_attempts");
  assert.deepEqual(report.evaluations[0].corrections, [{ failed: [1, 2], corrected: [3, 4] }]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4, 5, 6]);
});

test("T7-C5 outra sessão não apaga correção comprovada na primeira", () => {
  const trace = buildTrace([
    pre("fail", "npm test"), post("fail", "failure"),
    pre("ok", "npm test"), post("ok", "success"),
    { ...pre("other", "npm test"), ids: { sessionId: "s2", toolUseId: "other" } },
    { ...post("other", "success"), ids: { sessionId: "s2", toolUseId: "other" } },
  ]);
  const report = evaluateReport({ trace, skill: skill("- Run `npm test`.\n") });
  assert.deepEqual(states(report), ["partial"]);
  assert.equal(report.evaluations[0].reasonCode, "ambiguous_context");
  assert.deepEqual(report.evaluations[0].corrections, [{ failed: [1, 2], corrected: [3, 4] }]);
  assert.deepEqual(report.evaluations[0].sources.events, [1, 2, 3, 4, 5, 6]);
});
