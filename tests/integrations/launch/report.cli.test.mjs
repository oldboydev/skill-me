import assert from "node:assert/strict";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { after, test } from "node:test";
import { makeScratch, runIntegrations } from "../helpers/cli.mjs";
import { agentArgs, freshHome, launchCapturesOnDisk, launchEnv, npmScriptEnv, ofInvocation, preparedLaunch, readJsonLines, runSkillMe, writeScenario } from "../helpers/launch.mjs";
import { automaticOf, observeOk, runNpmScript } from "../helpers/observe.mjs";
import { claudePayload } from "../helpers/privacy-canaries.mjs";
import { runPrivacy } from "../helpers/privacy-store.mjs";
import { runHook, startCapture } from "../helpers/traces.mjs";
import { snapshotTree } from "../helpers/tree.mjs";

// Provas S4 da issue #25 sobre a consulta (C34, C35): `skill-me report` como o
// usuário o chama, sem --root nem --capture, sobre execuções reais. Cada seção
// precisa ser o relatório da #7 daquela captura — comparado com o
// `integrations report --root --capture` dela —, e o cabeçalho segue as linhas
// literais da linha "Consulta" do Landing de .checks/issue-25-agent-launch.md.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

async function waitFor(predicate, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`tempo esgotado: ${label}`);
    await sleep(20);
  }
}

function skillFile(label) {
  const file = path.join(scratch(label), "SKILL.md");
  writeFileSync(file, "---\nname: demo-skill\n---\n\n- Run `npm test`.\n");
  return file;
}

const hook = (id) => ({ hook: { agent: "claude", payload: claudePayload("pre_tool_bash", { session_id: "sessao-relatorio", tool_use_id: id }) } });
const skillMe = (args, env, cwd) => runSkillMe(["report", ...args], { env, cwd });
const explicit = (root, id, skill, format, env, cwd) => runIntegrations(["report", "--root", root, "--capture", id, "--skill", skill, "--format", format], { env, cwd });

// Execução com dois segmentos: a corrente é encerrada à mão e o próximo evento abre a sucessora.
async function twoSegments(prepared, label) {
  const work = scratch(`${label} provas`);
  const f = (name) => path.join(work, name);
  const probe = f("probe.ndjson");
  const scenario = writeScenario(work, "dois", [hook(`${label}-1`), { touch: f("um") }, { waitFile: f("parada") }, hook(`${label}-2`)]);
  const running = runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_SCENARIO: scenario, FAKE_AGENT_PROBE: probe } });
  await waitFor(() => existsSync(f("um")), "primeiro evento");
  const invocation = readJsonLines(probe)[0].env.SKILL_ME_LAUNCH_ID;
  const [first] = ofInvocation(prepared.root, invocation);
  assert.equal(runPrivacy(["stop", "--root", prepared.root, "--capture", first.id]).status, 0);
  writeFileSync(f("parada"), "");
  assert.equal((await running).status, 0);
  return ofInvocation(prepared.root, invocation);
}

const header = (invocation, segments, missing, open) =>
  [
    `Execução skill-me: ${invocation}; fonte: launch.invocation.`,
    `Capturas da execução: ${segments.length} (segmentos ${segments.map((s) => s.segment).join(", ")}); fonte: launch.segments.`,
    `Segmentos ausentes: ${missing.length ? missing.join(", ") : "nenhum"}; fonte: launch.missingSegments.`,
    `Execução aberta: ${open ? "sim" : "não"}; fonte: launch.open.`,
    "Cada seção avalia só a própria captura.",
  ].join("\n");

test("I25-C34 report da execução: cabeçalho e uma seção por captura, igual ao relatório existente de cada uma, nos três formatos", async () => {
  const prepared = preparedLaunch(scratch, "i25 c34 secoes", { agents: ["claude"] });
  const project = scratch("i25 c34 projeto");
  const skill = skillFile("i25 c34 skill");
  const [one, two] = await twoSegments(prepared, "secoes");
  const before = snapshotTree(prepared.root);
  const text = await skillMe(["--skill", skill], prepared.env, project);
  assert.deepEqual([text.status, text.stderr], [0, ""]);
  const sections = [one, two].map((capture) => `== Segmento ${capture.segment} de 2 ==\n\n${explicit(prepared.root, capture.id, skill, "text", prepared.env, project).stdout}`);
  assert.equal(text.stdout.toString(), [header(one.invocation, [one, two], [], false), ...sections].join("\n\n"));
  for (const capture of [one, two]) assert.ok(text.stdout.toString().includes(`Captura: ${capture.id}; fonte: timeline.capture.id.`));
  // O texto padrão é o --format text.
  assert.equal(text.stdout.toString(), (await skillMe(["--skill", skill, "--format", "text"], prepared.env, project)).stdout.toString());

  const json = await skillMe(["--skill", skill, "--format", "json"], prepared.env, project);
  assert.equal(json.status, 0);
  const parsed = JSON.parse(json.stdout.toString());
  assert.deepEqual(
    { ...parsed, reports: parsed.reports.length },
    { skillMeLaunchReport: 1, invocation: one.invocation, open: false, segments: [{ segment: 1, capture: one.id }, { segment: 2, capture: two.id }], missingSegments: [], reports: 2 },
  );
  for (const [index, capture] of [one, two].entries()) {
    assert.deepEqual(parsed.reports[index], JSON.parse(explicit(prepared.root, capture.id, skill, "json", prepared.env, project).stdout));
    assert.deepEqual([parsed.reports[index].timeline.capture.origin, parsed.reports[index].timeline.capture.segment], ["launch", capture.segment]);
  }

  const markdown = (await skillMe(["--skill", skill, "--format", "markdown"], prepared.env, project)).stdout.toString();
  assert.ok(markdown.startsWith("# Execução skill-me\n\n- Execução skill-me: "), markdown.slice(0, 80));
  for (const capture of [one, two]) {
    assert.ok(markdown.includes(`## Segmento ${capture.segment} de 2\n\n${explicit(prepared.root, capture.id, skill, "markdown", prepared.env, project).stdout}`));
  }
  assert.deepEqual(snapshotTree(prepared.root), before, "consulta sem lock nem escrita");
});

test("I25-C34 report da execução: escolhe a iniciada por último mesmo com o segmento 1 de uma mais antiga apagado e a sucessora dela criada depois; mostra ausentes e aberta", async () => {
  const prepared = preparedLaunch(scratch, "i25 c34 ordem", { agents: ["claude"] });
  const project = scratch("i25 c34 ordem projeto");
  const skill = skillFile("i25 c34 ordem skill");
  const work = scratch("i25 c34 ordem provas");
  const f = (name) => path.join(work, name);
  // A antiga começa, a nova começa depois, e só então a antiga abre a sucessora.
  const oldScenario = writeScenario(work, "antiga", [hook("antiga-1"), { touch: f("antiga-1") }, { waitFile: f("antiga-segue") }, hook("antiga-2"), { touch: f("antiga-2") }]);
  const newScenario = writeScenario(work, "nova", [hook("nova-1"), { touch: f("nova-1") }, { waitFile: f("nova-fim") }]);
  const runOld = runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_SCENARIO: oldScenario, FAKE_AGENT_PROBE: f("antiga.ndjson") } });
  await waitFor(() => existsSync(f("antiga-1")), "antiga começou");
  const runNew = runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_SCENARIO: newScenario, FAKE_AGENT_PROBE: f("nova.ndjson") } });
  await waitFor(() => existsSync(f("nova-1")), "nova começou");
  const oldInv = readJsonLines(f("antiga.ndjson"))[0].env.SKILL_ME_LAUNCH_ID;
  const newInv = readJsonLines(f("nova.ndjson"))[0].env.SKILL_ME_LAUNCH_ID;
  const [oldFirst] = ofInvocation(prepared.root, oldInv);
  assert.equal(runPrivacy(["stop", "--root", prepared.root, "--capture", oldFirst.id]).status, 0);
  writeFileSync(f("antiga-segue"), "");
  await waitFor(() => existsSync(f("antiga-2")), "sucessora da antiga");
  assert.equal((await runOld).status, 0);

  // Com a nova ainda rodando, a consulta a mostra aberta.
  const open = JSON.parse((await skillMe(["--skill", skill, "--format", "json"], prepared.env, project)).stdout.toString());
  assert.deepEqual([open.invocation, open.open], [newInv, true]);
  assert.ok((await skillMe(["--skill", skill], prepared.env, project)).stdout.toString().includes("Execução aberta: sim; fonte: launch.open."));
  writeFileSync(f("nova-fim"), "");
  assert.equal((await runNew).status, 0);

  // O segmento 1 da antiga sai; a sucessora restante dela é mais recente que o início da nova.
  assert.equal(runPrivacy(["delete", "--root", prepared.root, "--capture", oldFirst.id, "--apply"]).status, 0);
  const [oldSecond] = ofInvocation(prepared.root, oldInv);
  const [newOnly] = ofInvocation(prepared.root, newInv);
  assert.equal(oldSecond.segment, 2);
  assert.ok(oldSecond.createdAt > newOnly.launchedAt, "a sucessora da antiga nasceu depois do início da nova");
  assert.ok(oldSecond.launchedAt < newOnly.launchedAt);
  const chosen = JSON.parse((await skillMe(["--skill", skill, "--format", "json"], prepared.env, project)).stdout.toString());
  assert.deepEqual({ invocation: chosen.invocation, open: chosen.open, segments: chosen.segments, missing: chosen.missingSegments }, { invocation: newInv, open: false, segments: [{ segment: 1, capture: newOnly.id }], missing: [] });

  // A mais recente com o segmento 1 apagado: ainda é ela, com o ausente explícito.
  const [gone, kept] = await twoSegments(prepared, "ausente");
  assert.equal(runPrivacy(["delete", "--root", prepared.root, "--capture", gone.id, "--apply"]).status, 0);
  const missing = await skillMe(["--skill", skill], prepared.env, project);
  const expected = [header(kept.invocation, [kept], [1], false), `== Segmento 2 de 2 ==\n\n${explicit(prepared.root, kept.id, skill, "text", prepared.env, project).stdout}`].join("\n\n");
  assert.equal(missing.stdout.toString(), expected);
});

test("I25-C34 report --latest e npm run status continuam só com capturas automáticas", async () => {
  const prepared = preparedLaunch(scratch, "i25 c34 automatica", { agents: ["claude"] });
  observeOk(["on"], prepared.env);
  const project = scratch("i25 c34 automatica projeto");
  assert.equal((await runHook("claude", claudePayload("pre_tool_bash", { session_id: "fora-do-launcher" }), { env: prepared.env, cwd: project })).report.delivery.persisted, 1);
  const [automatic] = automaticOf(prepared.root);
  const result = await runSkillMe(["claude", ...agentArgs("claude")], { env: { ...prepared.env, FAKE_AGENT_SCENARIO: writeScenario(scratch("i25 c34 automatica cenario"), "um", [hook("lancado")]) } });
  assert.equal(result.status, 0);
  const [launched] = launchCapturesOnDisk(prepared.root);
  assert.ok(launched.createdAt > automatic.createdAt, "a do launcher é a mais recente");
  const skill = skillFile("i25 c34 automatica skill");
  const latest = runIntegrations(["report", "--latest", "--skill", skill, "--format", "json"], { env: prepared.env, cwd: project });
  assert.equal(latest.status, 0, latest.stdout);
  assert.equal(JSON.parse(latest.stdout).timeline.capture.id, automatic.id);
  const status = runNpmScript("status", { env: npmScriptEnv(scratch, prepared.env) });
  assert.deepEqual([status.status, status.body.automaticCaptures, status.body.captures.map((c) => c.id)], [0, 1, [automatic.id]]);
});

test("I25-C35 report sem execução: 3 no_launch_capture com só capturas manuais ou automáticas, e 3 not_configured sem raiz, no JSON de erro", async () => {
  const fresh = freshHome(scratch, "i25 c35 sem raiz");
  const notConfigured = await skillMe([], launchEnv({ ...fresh, bin: scratch("i25 c35 bin") }), fresh.home);
  const prepared = preparedLaunch(scratch, "i25 c35 sem execucao", { agents: ["claude"] });
  const empty = await skillMe([], prepared.env, prepared.home);
  startCapture(prepared.root);
  observeOk(["on"], prepared.env);
  await runHook("claude", claudePayload("pre_tool_bash"), { env: prepared.env, cwd: prepared.home });
  const others = await skillMe(["--format", "markdown"], prepared.env, prepared.home);
  const error = (code) => JSON.stringify({ schemaVersion: 1, command: "report", status: "error", error: { code } }) + "\n";
  assert.deepEqual(
    [notConfigured, empty, others].map((r) => [r.status, r.stdout.toString(), r.stderr]),
    [
      [3, error("not_configured"), ""],
      [3, error("no_launch_capture"), ""],
      [3, error("no_launch_capture"), ""],
    ],
  );
});
