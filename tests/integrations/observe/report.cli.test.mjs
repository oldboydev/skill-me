import assert from "node:assert/strict";
import { rmSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { REPORT_HELP } from "../../../src/integrations/report/command.mjs";
import { makeScratch, runIntegrations } from "../helpers/cli.mjs";
import { claudePayload, codexHookPayload } from "../helpers/privacy-canaries.mjs";
import { DELIVERED_AUTO, automaticOf, homeEnv, listCaptures, observeOk, prepareObservation } from "../helpers/observe.mjs";
import { boundEnv, runHook, startCapture, storeDir } from "../helpers/traces.mjs";
import { snapshotTree } from "../helpers/tree.mjs";

// Provas S3 da issue #23 (C15, C16): `integrations report --latest` como o
// usuário o chama depois do uso normal, com o home e a raiz da configuração
// única. O formato do relatório é o da #7: o mesmo texto de
// `report --root --capture` para a captura escolhida.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

function skillFile(label) {
  const file = path.join(scratch(label), "SKILL.md");
  writeFileSync(file, "---\nname: demo-skill\n---\n\n- Run `npm test`.\n");
  return file;
}

const report = (args, env, cwd) => runIntegrations(["report", ...args], { env, cwd });
const errorOf = (run) => JSON.parse(run.stdout);
const byCreation = (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1);

test("I23-C15 report latest escolhe captura automática: a mais recente da raiz configurada, sem --root/--capture, com a identidade dela e o formato do relatório atual", async () => {
  const { root, env } = prepareObservation(scratch, "i23 c15");
  const project = scratch("i23 c15 projeto");
  observeOk(["on"], env);
  assert.deepEqual((await runHook("claude", claudePayload("pre_tool_bash", { session_id: "sessao-mais-antiga" }), { env, cwd: project })).report.delivery, DELIVERED_AUTO(1));
  assert.deepEqual((await runHook("codex", codexHookPayload("pre_tool_bash", { session_id: "sessao-mais-recente" }), { env, cwd: project })).report.delivery, DELIVERED_AUTO(1));
  // Uma manual criada depois de todas, com eventos: mais recente, mas não é automática.
  const manual = startCapture(root, ["--content"]);
  assert.equal((await runHook("claude", claudePayload("post_tool_bash"), { env: boundEnv(root, manual, { HOME: env.HOME, USERPROFILE: env.USERPROFILE }), cwd: project })).report.delivery.committed, 1);
  const all = listCaptures(root).sort(byCreation);
  assert.equal(all.at(-1).id, manual, "a manual é a mais recente de todas");
  const automatic = automaticOf(root).sort(byCreation);
  assert.equal(automatic.length, 2);
  const expected = automatic.at(-1);

  const skill = skillFile("i23 c15 skill");
  const before = snapshotTree(root);
  for (const format of ["text", "markdown", "json"]) {
    const latest = report(["--latest", "--skill", skill, "--format", format], env, project);
    assert.deepEqual([latest.status, latest.stderr], [0, ""], `${format}: ${latest.stdout}`);
    const explicit = report(["--root", root, "--capture", expected.id, "--skill", skill, "--format", format], env, project);
    assert.equal(explicit.status, 0, explicit.stdout);
    assert.equal(latest.stdout, explicit.stdout, `${format}: o mesmo relatório da captura escolhida`);
    if (format === "json") {
      const parsed = JSON.parse(latest.stdout);
      assert.equal(parsed.reportVersion, 1);
      assert.equal(parsed.timeline.capture.id, expected.id);
      assert.equal(parsed.timeline.capture.origin, "automatic");
    } else {
      const line = latest.stdout.split("\n").find((l) => l.includes(expected.id));
      assert.equal(line, format === "text" ? `Captura: ${expected.id}; fonte: timeline.capture.id.` : `## Captura ${expected.id}; fonte: timeline.capture.id.`, format);
    }
    assert.ok(!latest.stdout.includes(manual), `${format}: nada da manual`);
  }
  // O texto padrão (sem --format) é o mesmo da saída text.
  assert.equal(report(["--latest", "--skill", skill], env, project).stdout, report(["--latest", "--skill", skill, "--format", "text"], env, project).stdout);
  assert.deepEqual(snapshotTree(root), before, "consulta sem lock nem escrita");

  // --latest dispensa e recusa a raiz e o ID; o help descreve a forma.
  for (const args of [["--latest", "--root", root], ["--latest", "--capture", expected.id], ["--latest=sim"], ["--latest", "--latest"], ["--latest", "--format", "html"]]) {
    const run = report([...args, "--skill", skill], env, project);
    assert.equal(run.status, 2, args.join(" "));
    assert.equal(errorOf(run).status, "error");
  }
  assert.ok(REPORT_HELP.includes("integrations report --latest [--skill <SKILL.md>] [--format text|markdown|json]"));
});

test("I23-C15 report latest escolhe captura automática: depois do off, a última automática encerrada continua sendo a consultada", async () => {
  const { root, env } = prepareObservation(scratch, "i23 c15 off");
  const project = scratch("i23 c15 off projeto");
  observeOk(["on"], env);
  assert.deepEqual((await runHook("claude", claudePayload("pre_tool_bash"), { env, cwd: project })).report.delivery, DELIVERED_AUTO(1));
  const [only] = automaticOf(root);
  assert.deepEqual(observeOk(["off"], env).stopped, [only.id]);
  const run = report(["--latest", "--skill", skillFile("i23 c15 off skill"), "--format", "json"], env, project);
  assert.equal(run.status, 0, run.stdout);
  assert.deepEqual([JSON.parse(run.stdout).timeline.capture.id, JSON.parse(run.stdout).timeline.capture.state], [only.id, "stopped"]);
});

test("I23-C16 report latest não escolhe captura manual: sem automática, erro fechado; sem configuração ou com lock, o código do contrato", async () => {
  const skill = skillFile("i23 c16 skill");
  const project = scratch("i23 c16 projeto");

  // Sem configuração única.
  const noSetup = report(["--latest", "--skill", skill], homeEnv(scratch("i23 c16 home vazio")), project);
  assert.equal(noSetup.status, 3);
  assert.deepEqual(errorOf(noSetup), { schemaVersion: 1, command: "report", status: "error", error: { code: "not_configured" } });

  // Configurada, sem store.
  const { root, env } = prepareObservation(scratch, "i23 c16");
  const empty = report(["--latest", "--skill", skill], env, project);
  assert.deepEqual([empty.status, errorOf(empty).error.code], [3, "no_automatic_capture"]);

  // Só uma captura manual, com eventos: nunca é escolhida.
  const manual = startCapture(root, ["--content"]);
  assert.equal((await runHook("claude", claudePayload("pre_tool_bash"), { env: boundEnv(root, manual, { HOME: env.HOME, USERPROFILE: env.USERPROFILE }), cwd: project })).report.delivery.committed, 1);
  const before = snapshotTree(root);
  for (const format of ["text", "markdown", "json"]) {
    const run = report(["--latest", "--skill", skill, "--format", format], env, project);
    assert.equal(run.status, 3, `${format}: ${run.stdout}`);
    assert.deepEqual(errorOf(run), { schemaVersion: 1, command: "report", status: "error", error: { code: "no_automatic_capture" } });
    assert.ok(!run.stdout.includes(manual));
  }
  // on sem evento ainda não cria captura automática.
  observeOk(["on"], env);
  assert.deepEqual(errorOf(report(["--latest", "--skill", skill], env, project)).error.code, "no_automatic_capture");
  assert.deepEqual(Object.keys(snapshotTree(root)).filter((rel) => !rel.endsWith("observe.json")), Object.keys(before), "nada escrito além do on");

  // Lock ocupado: conflito, sem esperar e sem escolher.
  writeFileSync(path.join(storeDir(root), ".lock"), "lock alheio\n");
  const busy = report(["--latest", "--skill", skill], env, project);
  assert.deepEqual([busy.status, errorOf(busy).error.code], [4, "lock_present"]);
  unlinkSync(path.join(storeDir(root), ".lock"));
});
