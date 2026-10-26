import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { runSkillMe as runInProcess } from "../../../src/integrations/launch/command.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { INTEGRATIONS_CLI, makeScratch, runIntegrationsJson } from "../helpers/cli.mjs";
import { FIXTURES_DIR } from "../helpers/fixtures.mjs";
import { locateSystemPython } from "../helpers/hermes-runtime.mjs";
import { readClaudeHandlers, readCodexHandlers } from "../helpers/installed-hooks.mjs";
import { LAUNCHER, agentArgs, agentBin, freshHome, launchCapturesOnDisk, launchEnv, readJsonLines, runSkillMe } from "../helpers/launch.mjs";
import { authorizationFile, configFile, runObserve } from "../helpers/observe.mjs";
import { sha256File, snapshotTree } from "../helpers/tree.mjs";

// Provas S2 da issue #25 (C7–C15): o primeiro uso conduzido por
// `skill-me <agente>`. A decisão sobre a prévia, as respostas e o que é
// aplicado roda em processo com as respostas da prova (terminal simulado só
// nesse ponto: `terminal` e `readLine`); o que depende de terminal ou pipe de
// verdade roda como processo real — pipes (C7, C12) e um pseudoterminal no
// POSIX (C15). O esperado vem do Landing de .checks/issue-25-agent-launch.md e
// da saída do próprio instalador (`plan --json`), não do código do launcher.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

const WINDOWS = process.platform === "win32";
const RECORDING_LINE =
  "cada execução de skill-me {agent} grava localmente, depois da sanitização, os argumentos e resultados suportados, em capturas sucessivas de até 500 eventos ou 8 MiB, mantidas por 7 dias depois de encerradas.";
const ROOT_PROMPT = "Pasta das capturas (Enter aceita a proposta; ou digite outro caminho absoluto): ";
const CONFIRM_PROMPT = "Confirmar? [s/N]: ";

// Home sem configuração, com os diretórios dos agentes, e PATH com os agentes de fixture.
function firstUse(label, extraEnv = {}) {
  const { home, homes } = freshHome(scratch, label);
  const bin = agentBin(path.join(scratch(`${label} bin`), "bin"));
  const env = launchEnv({ home, homes, bin, extra: extraEnv });
  return { home, homes, bin, env };
}

const proposedRoot = (env, home) =>
  WINDOWS ? path.join(env.LOCALAPPDATA ?? path.join(home, "AppData", "Local"), "skill-me", "capturas") : path.join(home, ".local", "share", "skill-me", "capturas");

// O plan do instalador, pelo CLI existente: a fonte das mudanças que a prévia mostra.
const installerPlan = (agent, target, env) => runIntegrationsJson(["plan", "--agent", agent, "--target", target], { env }).report;
const changeLines = (plan) => plan.changes.map((c) => `  ${c.action} ${c.file}${c.event ? ` ${c.event}` : ""}`);

// `skill-me` em processo com respostas da prova. `onPrompt(n)` roda quando o
// launcher espera a n-ésima resposta (o instante em que ele está parado na pergunta).
async function interactive(argv, { env, home, answers, onPrompt = () => {} }) {
  let stderr = "";
  let asked = 0;
  const pending = [...answers];
  const result = await runInProcess({
    argv,
    deps: {
      env,
      platform: process.platform,
      home,
      cwd: home,
      io: createStoreIo(),
      proc: new EventEmitter(),
      terminal: true,
      writeOut: () => {},
      writeErr: (text) => (stderr += text),
      readLine: () => {
        asked += 1;
        onPrompt(asked, stderr);
        return pending.length > 0 ? pending.shift() : null;
      },
    },
  });
  return { ...result, stderr, asked };
}

const everything = (ctx, extra = []) => Object.fromEntries([ctx.home, ...extra].map((dir) => [dir, existsSync(dir) ? snapshotTree(dir) : null]));

test("I25-C7 agente ausente: 127 com executable_not_found, sem pergunta e sem criar nada", async () => {
  const { home, homes } = freshHome(scratch, "i25 c7");
  const emptyBin = scratch("i25 c7 bin vazio");
  const before = snapshotTree(home);
  for (const agent of ["codex", "claude", "hermes"]) {
    const result = await runSkillMe([agent], { env: launchEnv({ home, homes, bin: emptyBin }) });
    assert.deepEqual(
      { status: result.status, stdout: result.stdout.toString(), code: result.stderr.includes("[executable_not_found]"), asked: result.stderr.includes("Confirmar") || result.stderr.includes("primeiro uso") },
      { status: 127, stdout: "", code: true, asked: false },
      agent,
    );
  }
  assert.deepEqual(snapshotTree(home), before, "home, configuração e diretórios dos agentes intactos");
});

test("I25-C8 prévia antes de escrever: pasta padrão da plataforma, mudanças do plan, gravação e pergunta, sem nenhuma escrita até a resposta", async () => {
  for (const agent of ["codex", "claude", "hermes"]) {
    const ctx = firstUse(`i25 c8 ${agent}`);
    const target = ctx.homes[agent];
    const plan = installerPlan(agent, target, ctx.env);
    assert.ok(plan.changes.length > 0, `${agent}: a integração ainda não está instalada`);
    const before = everything(ctx);
    const atPrompt = [];
    const result = await interactive([agent, ...agentArgs(agent)], {
      env: ctx.env,
      home: ctx.home,
      answers: ["", "n"],
      onPrompt: (n, shown) => atPrompt.push({ n, shown, trees: everything(ctx) }),
    });
    const expectedPreview = [
      `skill-me: primeiro uso de ${agent}; nada foi alterado ainda.`,
      `skill-me: pasta proposta para as capturas: ${proposedRoot(ctx.env, ctx.home)}`,
      `skill-me: mudanças em ${target}:`,
      ...changeLines(plan),
      `skill-me: ${RECORDING_LINE.replace("{agent}", agent)}`,
    ].join("\n") + "\n";
    assert.deepEqual(atPrompt.map((p) => [p.n, p.shown]), [
      [1, expectedPreview + ROOT_PROMPT],
      [2, expectedPreview + ROOT_PROMPT + CONFIRM_PROMPT],
    ], agent);
    for (const p of atPrompt) assert.deepEqual(p.trees, before, `${agent}: nada escrito até a resposta ${p.n}`);
    assert.equal(result.exitCode, 3, agent);
  }
});

test("I25-C8 prévia antes de escrever: no Windows, a pasta padrão segue LOCALAPPDATA e, sem ela, o AppData\\Local do home", { skip: WINDOWS ? false : "LOCALAPPDATA só no Windows; o POSIX está no caso acima" }, async () => {
  const local = path.join(scratch("i25 c8 localappdata"), "Dados Locais");
  const withVar = firstUse("i25 c8 com var", { LOCALAPPDATA: local });
  const without = firstUse("i25 c8 sem var");
  delete without.env.LOCALAPPDATA;
  const shown = {};
  for (const [label, ctx] of Object.entries({ comVariavel: withVar, semVariavel: without })) {
    const result = await interactive(["claude", ...agentArgs("claude")], { env: ctx.env, home: ctx.home, answers: [] });
    shown[label] = result.stderr.split("\n").find((line) => line.startsWith("skill-me: pasta proposta"));
  }
  assert.deepEqual(shown, {
    comVariavel: `skill-me: pasta proposta para as capturas: ${path.join(local, "skill-me", "capturas")}`,
    semVariavel: `skill-me: pasta proposta para as capturas: ${path.join(without.home, "AppData", "Local", "skill-me", "capturas")}`,
  });
});

test("I25-C9 confirmação aplica: a pasta é criada, a raiz vai ao observe.json da #23, a integração é instalada, a confiança manual aparece e o agente inicia", async () => {
  const typedRoot = (ctx) => path.join(ctx.home, "minhas capturas ação");
  for (const [agent, rootAnswer, confirmation] of [
    ["claude", "", "s"],
    ["codex", null, " SIM "],
    ["hermes", "", "S"],
  ]) {
    const ctx = firstUse(`i25 c9 ${agent}`);
    const target = ctx.homes[agent];
    const plan = installerPlan(agent, target, ctx.env);
    const probe = path.join(scratch(`i25 c9 ${agent} provas`), "probe.ndjson");
    const env = { ...ctx.env, FAKE_AGENT_PROBE: probe };
    const root = rootAnswer === null ? typedRoot(ctx) : proposedRoot(ctx.env, ctx.home);
    const result = await interactive([agent, ...agentArgs(agent)], { env, home: ctx.home, answers: [rootAnswer ?? root, confirmation] });
    assert.equal(result.exitCode, 0, result.stderr);
    const rootReal = realpathSync.native(root);
    assert.deepEqual(JSON.parse(readFileSync(configFile(ctx.home), "utf8")), {
      skillMeObserveConfig: 1,
      root,
      rootReal,
      hermesDelivery: [process.execPath, INTEGRATIONS_CLI, "ingest", "--agent", "hermes"],
    }, agent);
    assert.deepEqual(installerPlan(agent, target, ctx.env).changes, [], `${agent}: integração aplicada`);
    if (agent === "claude") assert.ok(Object.keys(readClaudeHandlers(target)).length > 0);
    if (agent === "codex") assert.ok(Object.keys(readCodexHandlers(target)).length > 0);
    if (agent === "hermes") assert.ok(existsSync(path.join(target, "plugins", "skill-me-observer", "__init__.py")));
    const trust = ["skill-me: passo manual de confiança:", ...plan.manualSteps.map((step) => `  - ${step}`)].join("\n");
    assert.ok(result.stderr.includes(trust), `${agent}: ${result.stderr}`);
    const [seen] = readJsonLines(probe);
    assert.deepEqual([seen.env.SKILL_ME_LAUNCH_ROOT, launchCapturesOnDisk(root).length], [rootReal, 1], `${agent}: o agente iniciou na execução`);
  }
});

test("I25-C10 recusa: n, vazio, yes, não ou EOF saem com 3 setup_declined sem criar nem alterar nada e sem iniciar o agente", async () => {
  const observed = {};
  const expected = {};
  for (const [label, answers] of Object.entries({ n: ["", "n"], vazio: ["", ""], yes: ["", "yes"], não: ["", "não"], "EOF na confirmação": [""], "EOF na pasta": [] })) {
    const ctx = firstUse(`i25 c10 ${label}`);
    const probe = path.join(scratch(`i25 c10 ${label} provas`), "probe.ndjson");
    const before = everything(ctx);
    const result = await interactive(["claude", ...agentArgs("claude")], { env: { ...ctx.env, FAKE_AGENT_PROBE: probe }, home: ctx.home, answers });
    observed[label] = { exitCode: result.exitCode, code: result.stderr.includes("[setup_declined]"), trees: everything(ctx), started: existsSync(probe), root: existsSync(proposedRoot(ctx.env, ctx.home)) };
    expected[label] = { exitCode: 3, code: true, trees: before, started: false, root: false };
  }
  assert.deepEqual(observed, expected);
});

test("I25-C11 caminho relativo: 2 root_not_absolute, nenhuma pasta criada e observe.json ausente", async () => {
  const ctx = firstUse("i25 c11");
  const before = everything(ctx);
  const result = await interactive(["claude", ...agentArgs("claude")], { env: ctx.env, home: ctx.home, answers: ["capturas relativas", "s"] });
  assert.deepEqual(
    { exitCode: result.exitCode, code: result.stderr.includes("[root_not_absolute]"), asked: result.asked, trees: everything(ctx), relative: existsSync(path.join(ctx.home, "capturas relativas")), config: existsSync(configFile(ctx.home)) },
    { exitCode: 2, code: true, asked: 1, trees: before, relative: false, config: false },
  );
});

test("I25-C12 sem terminal: com o preparo pendente e stdin/stderr em pipe, 3 setup_required com a orientação e nada alterado", async () => {
  const observed = {};
  const expected = {};
  // Sem configuração; e com configuração mas sem a integração do agente.
  const missing = firstUse("i25 c12 sem config");
  const partial = firstUse("i25 c12 sem integracao");
  const root = path.join(scratch("i25 c12 raiz"), "raiz");
  mkdirSync(root);
  assert.equal(runObserve(["setup", "--root", root], { env: partial.env }).status, 0);
  for (const [label, ctx] of Object.entries({ "sem configuração": missing, "sem integração": partial })) {
    const probe = path.join(scratch(`i25 c12 ${label} provas`), "probe.ndjson");
    const before = everything(ctx, [root]);
    const result = await runSkillMe(["codex", ...agentArgs("codex")], { env: { ...ctx.env, FAKE_AGENT_PROBE: probe }, stdin: "s\n" });
    observed[label] = {
      status: result.status,
      line: result.stderr.trim(),
      trees: everything(ctx, [root]),
      started: existsSync(probe),
    };
    expected[label] = { status: 3, line: "skill-me: preparação pendente [setup_required]; rode skill-me codex num terminal para revisar e confirmar.", trees: before, started: false };
  }
  assert.deepEqual(observed, expected);
});

test("I25-C13 preparo concluído: sem prévia nem pergunta, observe.json e configuração do agente com o mesmo SHA-256, e o agente inicia", async () => {
  const ctx = firstUse("i25 c13");
  const first = await interactive(["claude", ...agentArgs("claude")], { env: ctx.env, home: ctx.home, answers: ["", "s"] });
  assert.equal(first.exitCode, 0, first.stderr);
  const settings = path.join(ctx.homes.claude, "settings.json");
  const hashes = { config: sha256File(configFile(ctx.home)), settings: sha256File(settings) };
  const probe = path.join(scratch("i25 c13 provas"), "probe.ndjson");
  const again = await interactive(["claude", ...agentArgs("claude")], { env: { ...ctx.env, FAKE_AGENT_PROBE: probe }, home: ctx.home, answers: [] });
  assert.deepEqual(
    { exitCode: again.exitCode, asked: again.asked, preview: again.stderr.includes("primeiro uso"), config: sha256File(configFile(ctx.home)), settings: sha256File(settings), started: readJsonLines(probe).length },
    { exitCode: 0, asked: 0, preview: false, config: hashes.config, settings: hashes.settings, started: 1 },
  );
});

test("I25-C14 falha do preparo: setup em conflito (4), instalador em conflito (4) e configuração inválida (3) mostram o código, não iniciam o agente e saem com ele; a raiz gravada fica e a próxima execução mostra só o que falta", async () => {
  // Setup recusado: registro de autorização de outra raiz (observe_on).
  const conflict = firstUse("i25 c14 observe_on");
  writeFileSync(authorizationFile(conflict.home), JSON.stringify({ skillMeObserveAuthorization: 1, rootReal: path.join(conflict.home, "outra raiz") }));
  const probeA = path.join(scratch("i25 c14 a"), "probe.ndjson");
  const a = await interactive(["claude", ...agentArgs("claude")], { env: { ...conflict.env, FAKE_AGENT_PROBE: probeA }, home: conflict.home, answers: ["", "s"] });
  assert.deepEqual(
    { exitCode: a.exitCode, code: a.stderr.includes("[observe_on]"), started: existsSync(probeA), config: existsSync(configFile(conflict.home)) },
    { exitCode: 4, code: true, started: false, config: false },
  );

  // Instalador em conflito depois da raiz gravada: um temporário alheio aparece enquanto o usuário responde.
  const ctx = firstUse("i25 c14 instalador");
  const target = ctx.homes.claude;
  const foreignTemp = path.join(target, "settings.json.skill-me-tmp");
  const probeB = path.join(scratch("i25 c14 b"), "probe.ndjson");
  const b = await interactive(["claude", ...agentArgs("claude")], {
    env: { ...ctx.env, FAKE_AGENT_PROBE: probeB },
    home: ctx.home,
    answers: ["", "s"],
    onPrompt: (n) => n === 2 && writeFileSync(foreignTemp, "alheio\n"),
  });
  assert.deepEqual(
    { exitCode: b.exitCode, code: /conflitos[^]*foreign_artifact/.test(b.stderr), started: existsSync(probeB), config: existsSync(configFile(ctx.home)) },
    { exitCode: 4, code: true, started: false, config: true },
    b.stderr,
  );
  rmSync(foreignTemp);
  const next = await interactive(["claude", ...agentArgs("claude")], { env: { ...ctx.env, FAKE_AGENT_PROBE: probeB }, home: ctx.home, answers: ["s"] });
  assert.deepEqual(
    { exitCode: next.exitCode, asked: next.asked, rootPrompt: next.stderr.includes(ROOT_PROMPT) || next.stderr.includes("pasta proposta"), changes: next.stderr.includes(`skill-me: mudanças em ${target}:`), started: readJsonLines(probeB).length },
    { exitCode: 0, asked: 1, rootPrompt: false, changes: true, started: 1 },
    next.stderr,
  );

  // Configuração inválida: observe.json ilegível (3) e settings.json do agente ilegível (3, do instalador).
  const broken = firstUse("i25 c14 config");
  mkdirSync(path.dirname(configFile(broken.home)));
  writeFileSync(configFile(broken.home), "{");
  const c = await interactive(["claude", ...agentArgs("claude")], { env: broken.env, home: broken.home, answers: ["", "s"] });
  const brokenAgent = firstUse("i25 c14 settings");
  writeFileSync(path.join(brokenAgent.homes.claude, "settings.json"), "{");
  const d = await interactive(["claude", ...agentArgs("claude")], { env: brokenAgent.env, home: brokenAgent.home, answers: ["", "s"] });
  assert.deepEqual(
    { observeJson: [c.exitCode, c.stderr.includes("[config_invalid]"), c.asked], settings: [d.exitCode, d.stderr.includes("invalid_config"), d.asked] },
    { observeJson: [3, true, 0], settings: [3, true, 0] },
    d.stderr,
  );
});

const PTY = WINDOWS ? "pseudoterminal só no POSIX; no Windows o primeiro uso é provado em processo (C8–C14)" : locateSystemPython().skipReason ? `python-ausente: ${locateSystemPython().skipReason}` : false;

function ptySession({ env, argv, answers }, work) {
  const python = locateSystemPython();
  const config = path.join(work, `pty-${Date.now()}.json`);
  const result = path.join(work, `pty-resultado-${Date.now()}.json`);
  writeFileSync(config, JSON.stringify({ argv, env, answers }));
  return new Promise((resolve) => {
    const child = spawn(python.command, [...python.prefix, "-I", path.join(FIXTURES_DIR, "launch", "pty-session.py"), config, result], { stdio: "ignore" });
    child.on("exit", () => resolve(JSON.parse(readFileSync(result, "utf8"))));
  });
}

test("I25-C15 terminal real (pty): a prévia aparece, a confirmação aplica e o agente inicia; a recusa não altera nada", { skip: PTY }, async () => {
  const work = scratch("i25 c15 provas");
  const confirm = firstUse("i25 c15 confirma");
  const probe = path.join(work, "probe.ndjson");
  const ok = await ptySession({ env: { ...confirm.env, FAKE_AGENT_PROBE: probe }, argv: [process.execPath, LAUNCHER, "claude"], answers: [{ after: ROOT_PROMPT, send: "\n" }, { after: CONFIRM_PROMPT, send: "s\n" }] }, work);
  assert.equal(ok.status, 0, ok.screen);
  assert.equal(ok.pending, 0);
  assert.ok(ok.screen.includes("skill-me: primeiro uso de claude; nada foi alterado ainda."), ok.screen);
  assert.ok(ok.screen.includes("skill-me: passo manual de confiança:"), ok.screen);
  assert.ok(existsSync(configFile(confirm.home)));
  assert.equal(readJsonLines(probe).length, 1, "o agente iniciou");

  const refuse = firstUse("i25 c15 recusa");
  const before = everything(refuse);
  const no = await ptySession({ env: refuse.env, argv: [process.execPath, LAUNCHER, "claude"], answers: [{ after: ROOT_PROMPT, send: "\n" }, { after: CONFIRM_PROMPT, send: "n\n" }] }, work);
  assert.deepEqual({ status: no.status, declined: no.screen.includes("[setup_declined]"), trees: everything(refuse) }, { status: 3, declined: true, trees: before }, no.screen);
});
