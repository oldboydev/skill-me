import assert from "node:assert/strict";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { isDeepStrictEqual } from "node:util";
import { baseEnv, INTEGRATIONS_CLI, makeScratch, REPO_ROOT, runIntegrations, runIntegrationsAsync, runIntegrationsJson } from "./helpers/cli.mjs";
import { readClaudeHandlers, readCodexHandlers } from "./helpers/installed-hooks.mjs";
import { sha256File, snapshotTree } from "./helpers/tree.mjs";

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
function scratch(label) {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
}

const CLAUDE_EVENTS = ["PreToolUse", "PostToolUse", "PostToolUseFailure", "UserPromptExpansion", "SessionStart", "SessionEnd", "SubagentStart", "SubagentStop"];
const CODEX_EVENTS = ["PreToolUse", "PostToolUse", "SessionStart", "SessionEnd", "SubagentStart", "SubagentStop"];
const HERMES_ARTIFACTS = ["plugins/skill-me-observer/__init__.py", "plugins/skill-me-observer/kwargs.json", "plugins/skill-me-observer/plugin.yaml"];
const HERMES_STAGING = "plugins/.skill-me-observer.skill-me-tmp";
const HERMES_PLUGIN_SOURCE = path.join(REPO_ROOT, "src", "integrations", "hermes", "plugin");

// Texto com um inteiro que um double não representa: a reescrita precisa
// preservar o token exato (valor alheio), não só valores "parecidos".
const CLAUDE_SETTINGS_TEXT = `{
    "permissions": { "allow": ["Bash(npm test)"], "deny": ["Read(./.env)"] },
    "env": { "FOO": "bar" },
    "disableAllHooks": false,
    "allowManagedHooksOnly": false,
    "bigNumber": 12345678901234567890,
    "ratio": 1.50,
    "hooks": {
        "PreToolUse": [
            { "matcher": "Bash", "hooks": [ { "type": "command", "command": "third-party-guard.sh", "timeout": 5 } ] }
        ],
        "Stop": [ { "hooks": [ { "type": "command", "command": "notify.sh" } ] } ]
    }
}
`;
const CODEX_HOOKS_TEXT = JSON.stringify({ description: "team hooks", hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "python3 policy.py", timeout: 30 }] }] } }, null, 2) + "\n";
const CODEX_CONFIG_TOML = 'model = "fixture"\n\n[features]\nhooks = true\n\n[hooks.state."hooks.json:PreToolUse:0:0"]\ntrusted_hash = "sha256:0000"\n';
const HERMES_CONFIG_YAML = "plugins:\n  enabled:\n    - disk-cleanup\nhooks_auto_accept: false\n";

function claudeTarget(label, text = CLAUDE_SETTINGS_TEXT) {
  const target = path.join(scratch(label), ".claude");
  mkdirSync(target);
  if (text !== null) writeFileSync(path.join(target, "settings.json"), text);
  return target;
}
function codexTarget(label) {
  const target = path.join(scratch(label), ".codex");
  mkdirSync(target);
  writeFileSync(path.join(target, "hooks.json"), CODEX_HOOKS_TEXT);
  writeFileSync(path.join(target, "config.toml"), CODEX_CONFIG_TOML);
  return target;
}
function hermesTarget(label) {
  const target = path.join(scratch(label), "hermes home");
  mkdirSync(path.join(target, "plugins", "other-plugin"), { recursive: true });
  writeFileSync(path.join(target, "config.yaml"), HERMES_CONFIG_YAML);
  writeFileSync(path.join(target, "plugins", "other-plugin", "plugin.yaml"), "name: other-plugin\n");
  return target;
}
const env = baseEnv();
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const cli = (args) => runIntegrationsJson(args, { env });

function withoutHooks(doc) {
  const { hooks, ...rest } = doc;
  return rest;
}

// Link de arquivo exige privilégio no Windows (EPERM): o subcaso fica registrado
// por diagnóstico e roda no Linux/WSL.
function linkFileOrDiagnose(t, existing, link, subcase) {
  try {
    symlinkSync(existing, link, "file");
    return true;
  } catch (error) {
    if (error.code !== "EPERM") throw error;
    t.diagnostic(`subcaso ${subcase} não executado: criar symlink de arquivo exige privilégio neste Windows (EPERM); coberto no Linux/WSL`);
    return false;
  }
}

// Remoção Hermes com cache que resolve para fora do alvo: prévia e aplicação
// recusam com 4, sem declarar sucesso e sem mudar nada no alvo.
function assertHermesUninstallEscapes(target, label) {
  const before = snapshotTree(target);
  for (const apply of [false, true]) {
    const result = cli(["uninstall", "--agent", "hermes", "--target", target, ...(apply ? ["--apply"] : [])]);
    assert.equal(result.status, 4, `${label} apply=${apply}: ${result.stdout}`);
    assert.equal(result.report.status, "conflict", label);
    assert.equal(result.report.applied, false, label);
    assert.deepEqual(result.report.conflicts.map((c) => c.code), ["target_escape"], label);
  }
  assert.deepEqual(snapshotTree(target), before, `${label}: nada removido dentro do alvo`);
}

// Instalação Hermes com o staging ocupado por algo cuja propriedade não se
// comprova: prévia e aplicação recusam com 4 antes de qualquer exclusão, sem
// mudança listada e sem nada removido ou criado no alvo.
function assertHermesInstallRefused(target, label, codes) {
  const before = snapshotTree(target);
  for (const apply of [false, true]) {
    const result = cli(["install", "--agent", "hermes", "--target", target, ...(apply ? ["--apply"] : [])]);
    assert.equal(result.status, 4, `${label} apply=${apply}: ${result.stdout}`);
    assert.equal(result.report.status, "conflict", label);
    assert.equal(result.report.applied, false, label);
    assert.deepEqual(result.report.changes, [], label);
    assert.deepEqual(result.report.conflicts.map((c) => c.code), codes, label);
    for (const conflict of result.report.conflicts.filter((c) => c.code === "foreign_artifact")) assert.equal(conflict.file, HERMES_STAGING, label);
  }
  assert.deepEqual(snapshotTree(target), before, `${label}: nada removido nem criado no alvo`);
}

// Alvo Hermes com um segundo plugin de terceiro que contém só `__init__.py` e
// `plugin.yaml` — os nomes que o staging também usa.
const VICTIM_FILES = { "__init__.py": "# plugin sintético de terceiro\n", "plugin.yaml": "name: victim-plugin\n" };
function hermesStagingTarget(label) {
  const home = hermesTarget(label);
  const victim = path.join(home, "plugins", "victim-plugin");
  mkdirSync(victim);
  for (const [name, text] of Object.entries(VICTIM_FILES)) writeFileSync(path.join(victim, name), text);
  return { home, victim, staging: path.join(home, ...HERMES_STAGING.split("/")) };
}

// Agentes-sentinela no PATH: se qualquer comando os iniciar, um arquivo aparece.
function sentinelPath(label) {
  const dir = path.join(scratch(label), "bin com espaço");
  mkdirSync(dir);
  const marker = path.join(dir, "EXECUTED");
  for (const agent of ["claude", "codex", "hermes"]) {
    if (process.platform === "win32") writeFileSync(path.join(dir, `${agent}.cmd`), `@echo off\r\necho x> "${marker}"\r\n`);
    else writeFileSync(path.join(dir, agent), `#!/bin/sh\necho x > "${marker}"\n`, { mode: 0o755 });
  }
  return { dir, marker };
}

test("I4-C24 prévia e comandos sem --apply não escrevem nem iniciam agentes", () => {
  const sentinel = sentinelPath("sentinel");
  const pathEnv = baseEnv({ PATH: sentinel.dir + path.delimiter + (process.env.PATH ?? "") });
  const targets = { claude: claudeTarget("plan-claude"), codex: codexTarget("plan-codex"), hermes: hermesTarget("plan-hermes") };
  for (const [agent, target] of Object.entries(targets)) {
    const before = snapshotTree(target);
    const plan = runIntegrationsJson(["plan", "--agent", agent, "--target", target], { env: pathEnv });
    assert.equal(plan.status, 0, plan.stderr);
    assert.equal(plan.report.applied, false);
    assert.equal(plan.report.status, "planned");
    for (const command of ["install", "uninstall"]) {
      const preview = runIntegrationsJson([command, "--agent", agent, "--target", target], { env: pathEnv });
      assert.equal(preview.status, 0, `${agent} ${command}: ${preview.stderr}`);
      assert.equal(preview.report.applied, false);
    }
    assert.deepEqual(snapshotTree(target), before, agent);
    if (agent === "claude" || agent === "codex") {
      const events = plan.report.changes.filter((c) => c.action === "add_group").map((c) => c.event).sort();
      assert.deepEqual(events, [...(agent === "claude" ? CLAUDE_EVENTS : CODEX_EVENTS)].sort(), agent);
      const file = agent === "claude" ? "settings.json" : "hooks.json";
      assert.ok(plan.report.changes.filter((c) => c.action === "add_group").every((c) => c.file === file));
    } else {
      assert.deepEqual(plan.report.changes.filter((c) => c.action === "write_artifact").map((c) => c.file).sort(), HERMES_ARTIFACTS);
      assert.ok(plan.report.manualSteps.some((step) => step.includes("hermes plugins enable skill-me-observer")));
    }
    assert.ok(plan.report.changes.some((c) => c.action === "write_manifest" && c.file === `.skill-me/${agent}-install.json`));
  }
  assert.equal(existsSync(sentinel.marker), false);
  // Texto padrão também é só leitura e não ecoa conteúdo da configuração.
  const text = runIntegrations(["plan", "--agent", "claude", "--target", targets.claude], { env: pathEnv });
  assert.equal(text.status, 0);
  assert.ok(!text.stdout.includes("third-party-guard") && !text.stdout.includes("FOO"));
  assert.equal(existsSync(sentinel.marker), false);
});

test("I4-C25 instalação altera só o alvo e preserva confiança, política, sandbox e terceiros", () => {
  const claude = claudeTarget("apply-claude");
  const before = json(path.join(claude, "settings.json"));
  const applied = cli(["install", "--agent", "claude", "--target", claude, "--apply"]);
  assert.equal(applied.status, 0, applied.stderr);
  assert.equal(applied.report.status, "applied");
  const afterText = readFileSync(path.join(claude, "settings.json"), "utf8");
  const afterDoc = JSON.parse(afterText);
  assert.deepEqual(withoutHooks(afterDoc), withoutHooks(before));
  assert.ok(afterText.includes("12345678901234567890") && afterText.includes("1.50"), "tokens numéricos alheios preservados");
  assert.deepEqual(afterDoc.hooks.PreToolUse[0], before.hooks.PreToolUse[0]);
  assert.deepEqual(afterDoc.hooks.Stop, before.hooks.Stop);
  assert.deepEqual(Object.keys(readClaudeHandlers(claude)).sort(), [...CLAUDE_EVENTS].sort());
  assert.ok(afterText.startsWith('{\n    "permissions"'), "indentação de 4 espaços preservada");

  const codex = codexTarget("apply-codex");
  const tomlHash = sha256File(path.join(codex, "config.toml"));
  assert.equal(cli(["install", "--agent", "codex", "--target", codex, "--apply"]).status, 0);
  assert.equal(sha256File(path.join(codex, "config.toml")), tomlHash, "config.toml (inclusive [hooks.state]) intacto");
  const hooksDoc = json(path.join(codex, "hooks.json"));
  assert.equal(hooksDoc.description, "team hooks");
  assert.deepEqual(hooksDoc.hooks.PreToolUse[0], JSON.parse(CODEX_HOOKS_TEXT).hooks.PreToolUse[0]);
  assert.deepEqual(Object.keys(readCodexHandlers(codex)).sort(), [...CODEX_EVENTS].sort());

  const hermes = hermesTarget("apply-hermes");
  const yamlHash = sha256File(path.join(hermes, "config.yaml"));
  const other = snapshotTree(path.join(hermes, "plugins", "other-plugin"));
  const hermesApplied = cli(["install", "--agent", "hermes", "--target", hermes, "--apply"]);
  assert.equal(hermesApplied.status, 0, hermesApplied.stderr);
  assert.equal(sha256File(path.join(hermes, "config.yaml")), yamlHash, "plugins.enabled não muda: habilitação é manual");
  assert.deepEqual(snapshotTree(path.join(hermes, "plugins", "other-plugin")), other);
});

test("I4-C26 configuração inválida ou grande demais não é substituída", () => {
  const cases = [
    ["claude", "settings.json", "{ not json"],
    ["claude", "settings.json", "[1, 2]"],
    ["claude", "settings.json", JSON.stringify({ hooks: { PreToolUse: 42 } })],
    ["claude", "settings.json", JSON.stringify({ hooks: null })],
    ["claude", "settings.json", JSON.stringify({ pad: "x".repeat(1024 * 1024 + 10) })],
    ["codex", "hooks.json", JSON.stringify({ hooks: {}, unexpected: 1 })],
    ["codex", "hooks.json", "{ \"hooks\": "],
    ["codex", "hooks.json", JSON.stringify({ hooks: { PreToolUse: [{ hooks: [{ type: "command" }] }] } })],
  ];
  for (const [agent, file, text] of cases) {
    const target = path.join(scratch(`invalid-${agent}`), `.${agent}`);
    mkdirSync(target);
    writeFileSync(path.join(target, file), text);
    const before = snapshotTree(target);
    const result = cli(["install", "--agent", agent, "--target", target, "--apply"]);
    assert.equal(result.status, 3, `${agent}: ${text.slice(0, 40)} → ${result.stdout}`);
    assert.equal(result.report.status, "invalid_config");
    assert.deepEqual(snapshotTree(target), before, "nada escrito, nenhum registro");
  }
});

// Teto de leitura do instalador (`ONE_MIB_BYTES` do doctor, em bytes UTF-8):
// uma escrita que o ultrapassasse deixaria o arquivo inadministrável.
const ONE_MIB = 1024 * 1024;
const CONFIG_FILE = { claude: "settings.json", codex: "hooks.json" };
const fileBytes = (file) => statSync(file).size;

// Configuração válida sem hooks, com o preenchimento sintético num valor alheio.
function paddedConfig(agent, padding) {
  return agent === "claude"
    ? JSON.stringify({ env: { SYNTHETIC_PAD: padding } }, null, 2) + "\n"
    : JSON.stringify({ description: padding, hooks: {} }, null, 2) + "\n";
}
function paddedToBytes(agent, total) {
  return paddedConfig(agent, "x".repeat(total - Buffer.byteLength(paddedConfig(agent, ""), "utf8")));
}
function sizedTarget(agent, label, text) {
  const target = path.join(scratch(label), `.${agent}`);
  mkdirSync(target);
  writeFileSync(path.join(target, CONFIG_FILE[agent]), text);
  return target;
}

// Recusa antes de qualquer escrita, na prévia e na aplicação: código 3, motivo
// fechado, sem conteúdo bruto na saída e sem nada criado ou alterado no alvo.
function assertOutputTooLarge(agent, target, command, label) {
  const before = snapshotTree(target);
  for (const apply of [false, true]) {
    const result = cli([command, "--agent", agent, "--target", target, ...(apply ? ["--apply"] : [])]);
    assert.equal(result.status, 3, `${label} apply=${apply}: ${result.stdout.slice(0, 400)}`);
    assert.equal(result.report.status, "invalid_config", label);
    assert.equal(result.report.applied, false, label);
    assert.deepEqual(result.report.errors, [{ code: "output_too_large", file: CONFIG_FILE[agent] }], label);
    assert.ok(!result.stdout.includes("xxxxxxxx") && !result.stdout.includes("çççç"), `${label}: saída sem conteúdo da configuração`);
  }
  assert.deepEqual(snapshotTree(target), before, `${label}: nada escrito, nenhum registro`);
}

test("I4-C26b escrita que deixaria a configuração acima de 1 MiB é recusada antes de alterar arquivos", () => {
  for (const agent of ["claude", "codex"]) {
    const file = CONFIG_FILE[agent];

    // Entrada válida próxima do limite (1 MiB − 64 bytes, ASCII, sem hooks): a
    // leitura aceita, a saída com os grupos próprios excederia o teto.
    const nearText = paddedToBytes(agent, ONE_MIB - 64);
    assert.equal(Buffer.byteLength(nearText, "utf8"), ONE_MIB - 64);
    const near = sizedTarget(agent, `near-limit-${agent}`, nearText);
    assertOutputTooLarge(agent, near, "install", `${agent} entrada de 1 MiB − 64 bytes`);
    // Remoção seguinte: nada a remover; reinstalação recusa de novo.
    const nothing = cli(["uninstall", "--agent", agent, "--target", near, "--apply"]);
    assert.equal(nothing.status, 0, nothing.stdout.slice(0, 400));
    assert.equal(nothing.report.status, "unchanged");
    assertOutputTooLarge(agent, near, "install", `${agent} reinstalação após recusa`);
    assert.equal(readFileSync(path.join(near, file), "utf8"), nearText);

    // Calibração: bytes que a instalação acrescenta nesta máquina (caminhos
    // absolutos do node e do CLI); o preenchimento é a única diferença.
    const probeText = paddedConfig(agent, "x".repeat(1000));
    const probe = sizedTarget(agent, `calibrate-${agent}`, probeText);
    assert.equal(cli(["install", "--agent", agent, "--target", probe, "--apply"]).status, 0);
    const added = fileBytes(path.join(probe, file)) - Buffer.byteLength(probeText, "utf8");

    // Saída exatamente no limite: aceita; reinstalar e remover continuam
    // funcionando sobre o arquivo de 1 MiB.
    const exactText = paddedToBytes(agent, ONE_MIB - added);
    const exact = sizedTarget(agent, `exact-limit-${agent}`, exactText);
    const installed = cli(["install", "--agent", agent, "--target", exact, "--apply"]);
    assert.equal(installed.status, 0, installed.stdout.slice(0, 400));
    assert.equal(installed.report.status, "applied");
    assert.equal(fileBytes(path.join(exact, file)), ONE_MIB, `${agent}: saída exatamente no limite`);
    const exactOutput = readFileSync(path.join(exact, file));
    assert.ok(exactOutput.toString("utf8").length <= ONE_MIB, "caracteres da saída no limite");
    const again = cli(["install", "--agent", agent, "--target", exact, "--apply"]);
    assert.equal(again.status, 0, again.stdout.slice(0, 400));
    assert.equal(again.report.status, "unchanged");
    assert.deepEqual(readFileSync(path.join(exact, file)), exactOutput);
    const removed = cli(["uninstall", "--agent", agent, "--target", exact, "--apply"]);
    assert.equal(removed.status, 0, removed.stdout.slice(0, 400));
    assert.equal(removed.report.status, "applied");
    assert.equal(readFileSync(path.join(exact, file), "utf8"), exactText, `${agent}: remoção restaura a entrada`);

    // Um byte acima do limite: recusado.
    assertOutputTooLarge(agent, sizedTarget(agent, `over-limit-${agent}`, paddedToBytes(agent, ONE_MIB - added + 1)), "install", `${agent} saída de 1 MiB + 1`);

    // Bytes UTF-8, não caracteres: dez "x" viram "ç" (2 bytes cada) — a saída
    // teria a mesma quantidade de caracteres da saída no limite e 10 bytes a mais.
    const multibyteText = exactText.replace("x".repeat(10), "ç".repeat(10));
    assert.equal(multibyteText.length, exactText.length);
    assert.equal(Buffer.byteLength(multibyteText, "utf8"), Buffer.byteLength(exactText, "utf8") + 10);
    assertOutputTooLarge(agent, sizedTarget(agent, `utf8-over-${agent}`, multibyteText), "install", `${agent} saída de 1 MiB + 10 bytes UTF-8`);
  }

  // Remoção cuja reescrita passaria do limite: depois da instalação o usuário
  // grava o arquivo minificado com um valor grande; a serialização indentada
  // sem os grupos próprios excederia o teto → recusa sem tocar configuração e registro.
  const minified = claudeTarget("minified", JSON.stringify({ env: { FOO: "bar" } }, null, 2) + "\n");
  assert.equal(cli(["install", "--agent", "claude", "--target", minified, "--apply"]).status, 0);
  const settings = path.join(minified, "settings.json");
  const doc = JSON.parse(readFileSync(settings, "utf8"));
  doc.list = new Array(200_000).fill(0);
  writeFileSync(settings, JSON.stringify(doc));
  assert.ok(fileBytes(settings) < ONE_MIB, "entrada minificada abaixo do limite");
  assertOutputTooLarge("claude", minified, "uninstall", "claude remoção com reescrita acima de 1 MiB");
});

test("I4-C27 alvo fora do diretório, link que escapa e política gerenciada são recusados", (t) => {
  const outside = scratch("outside");
  writeFileSync(path.join(outside, "settings.json"), "{}\n");
  const outsideBefore = snapshotTree(outside);

  // .skill-me como junção/link de diretório para fora do alvo.
  const escapeState = claudeTarget("escape-state");
  symlinkSync(outside, path.join(escapeState, ".skill-me"), "junction");
  const stateResult = cli(["install", "--agent", "claude", "--target", escapeState, "--apply"]);
  assert.equal(stateResult.status, 4, stateResult.stdout);
  assert.ok(stateResult.report.conflicts.some((c) => c.code === "target_escape"));
  assert.equal(readFileSync(path.join(escapeState, "settings.json"), "utf8"), CLAUDE_SETTINGS_TEXT);

  // Hermes: pasta plugins é junção para fora.
  const hermes = path.join(scratch("escape-hermes"), "home");
  mkdirSync(hermes);
  symlinkSync(outside, path.join(hermes, "plugins"), "junction");
  const hermesResult = cli(["install", "--agent", "hermes", "--target", hermes, "--apply"]);
  assert.equal(hermesResult.status, 4, hermesResult.stdout);
  assert.ok(hermesResult.report.conflicts.some((c) => c.code === "target_escape"));

  // settings.json como link de arquivo para fora (exige privilégio no Windows).
  const escapeFile = claudeTarget("escape-file", null);
  if (linkFileOrDiagnose(t, path.join(outside, "settings.json"), path.join(escapeFile, "settings.json"), "link de arquivo settings.json")) {
    const fileResult = cli(["install", "--agent", "claude", "--target", escapeFile, "--apply"]);
    assert.equal(fileResult.status, 4, fileResult.stdout);
    assert.ok(fileResult.report.conflicts.some((c) => c.code === "target_escape"));
  }
  assert.deepEqual(snapshotTree(outside), outsideBefore, "nada escrito fora do alvo");

  // Hermes instalado: `__pycache__` do plugin vira junção/link de diretório para
  // fora do alvo, com um arquivo externo de nome igual ao bytecode próprio.
  const cacheOutside = scratch("cache-outside");
  writeFileSync(path.join(cacheOutside, "__init__.cpython-311.pyc"), "arquivo externo sintético do usuário\n");
  const cacheOutsideBefore = snapshotTree(cacheOutside);
  const cacheDirEscape = hermesTarget("escape-cache-dir");
  assert.equal(cli(["install", "--agent", "hermes", "--target", cacheDirEscape, "--apply"]).status, 0);
  symlinkSync(cacheOutside, path.join(cacheDirEscape, "plugins", "skill-me-observer", "__pycache__"), "junction");
  assertHermesUninstallEscapes(cacheDirEscape, "__pycache__ junção/link de diretório");
  assert.deepEqual(snapshotTree(cacheOutside), cacheOutsideBefore, "arquivo externo preservado (junção/link de diretório)");

  // `__pycache__` real com link de arquivo de nome próprio apontando para fora:
  // o nome não comprova propriedade.
  const cacheFileEscape = hermesTarget("escape-cache-file");
  assert.equal(cli(["install", "--agent", "hermes", "--target", cacheFileEscape, "--apply"]).status, 0);
  const realCache = path.join(cacheFileEscape, "plugins", "skill-me-observer", "__pycache__");
  mkdirSync(realCache);
  if (linkFileOrDiagnose(t, path.join(cacheOutside, "__init__.cpython-311.pyc"), path.join(realCache, "__init__.cpython-311.pyc"), "link de arquivo no __pycache__")) {
    assertHermesUninstallEscapes(cacheFileEscape, "__pycache__ com link de arquivo");
  }
  assert.deepEqual(snapshotTree(cacheOutside), cacheOutsideBefore, "arquivo externo preservado (link de arquivo)");

  // Staging da instalação Hermes como junção/link de diretório para fora do
  // alvo, com arquivos externos de nomes iguais aos artefatos próprios.
  const stagingOutside = scratch("staging-outside");
  for (const [name, text] of Object.entries(VICTIM_FILES)) writeFileSync(path.join(stagingOutside, name), text);
  const stagingOutsideBefore = snapshotTree(stagingOutside);
  const stagingEscape = hermesStagingTarget("escape-staging");
  symlinkSync(stagingOutside, stagingEscape.staging, "junction");
  assertHermesInstallRefused(stagingEscape.home, "staging junção/link para fora", ["target_escape"]);
  assert.deepEqual(snapshotTree(stagingOutside), stagingOutsideBefore, "arquivos externos preservados (staging)");

  // Diretório de política gerenciada do Claude é recusado antes de qualquer leitura.
  const managed = process.platform === "win32" ? "C:\\Program Files\\ClaudeCode" : process.platform === "darwin" ? "/Library/Application Support/ClaudeCode" : "/etc/claude-code";
  const managedResult = cli(["install", "--agent", "claude", "--target", managed, "--apply"]);
  assert.equal(managedResult.status, 4, managedResult.stdout);
  assert.ok(managedResult.report.conflicts.some((c) => c.code === "managed_policy_target"));

  // --target ausente, inexistente ou arquivo → uso inválido.
  assert.equal(runIntegrations(["install", "--agent", "claude", "--apply"], { env }).status, 2);
  assert.equal(runIntegrations(["install", "--agent", "claude", "--target", path.join(outside, "nao existe"), "--apply"], { env }).status, 2);
  assert.equal(runIntegrations(["install", "--agent", "claude", "--target", path.join(outside, "settings.json"), "--apply"], { env }).status, 2);
  assert.equal(runIntegrations(["install", "--agent", "outro", "--target", outside], { env }).status, 2);
  assert.equal(runIntegrations(["plan", "--agent", "claude", "--target", outside, "--apply"], { env }).status, 2);
});

test("I4-C28 instalar duas vezes deixa uma única instalação própria", () => {
  for (const [agent, target, file, events, read] of [
    ["claude", claudeTarget("twice-claude"), "settings.json", CLAUDE_EVENTS, readClaudeHandlers],
    ["codex", codexTarget("twice-codex"), "hooks.json", CODEX_EVENTS, readCodexHandlers],
  ]) {
    assert.equal(cli(["install", "--agent", agent, "--target", target, "--apply"]).status, 0);
    const first = readFileSync(path.join(target, file));
    const second = cli(["install", "--agent", agent, "--target", target, "--apply"]);
    assert.equal(second.status, 0);
    assert.equal(second.report.status, "unchanged");
    assert.deepEqual(readFileSync(path.join(target, file)), first, `${agent}: segunda execução não muda bytes`);
    const handlers = read(target);
    for (const event of events) assert.equal(handlers[event].count, 1, `${agent} ${event}`);
  }
  const hermes = hermesTarget("twice-hermes");
  assert.equal(cli(["install", "--agent", "hermes", "--target", hermes, "--apply"]).status, 0);
  const tree = snapshotTree(hermes);
  const again = cli(["install", "--agent", "hermes", "--target", hermes, "--apply"]);
  assert.equal(again.status, 0);
  assert.equal(again.report.status, "unchanged");
  assert.deepEqual(snapshotTree(hermes), tree);
});

test("I4-C29 concorrência: lock, aplicações paralelas e edição entre prévia e aplicação", async () => {
  // Lock de outro processo do skill-me presente → conflito sem escrita.
  const locked = claudeTarget("locked");
  mkdirSync(path.join(locked, ".skill-me"));
  writeFileSync(path.join(locked, ".skill-me", "claude.lock"), "outro processo\n");
  const before = snapshotTree(locked);
  const lockedResult = cli(["install", "--agent", "claude", "--target", locked, "--apply"]);
  assert.equal(lockedResult.status, 4);
  assert.ok(lockedResult.report.conflicts.some((c) => c.code === "lock_present"));
  assert.deepEqual(snapshotTree(locked), before);

  // Seis aplicações simultâneas: nunca duplicam, nunca perdem os valores alheios.
  const parallel = claudeTarget("parallel");
  const results = await Promise.all(
    Array.from({ length: 6 }, () => runIntegrationsAsync(["install", "--agent", "claude", "--target", parallel, "--apply", "--json"], { env })),
  );
  for (const result of results) assert.ok([0, 4].includes(result.status), `${result.status} ${result.stdout} ${result.stderr}`);
  assert.ok(results.some((result) => result.status === 0));
  const handlers = readClaudeHandlers(parallel);
  for (const event of CLAUDE_EVENTS) assert.equal(handlers[event].count, 1, event);
  assert.deepEqual(withoutHooks(json(path.join(parallel, "settings.json"))), withoutHooks(JSON.parse(CLAUDE_SETTINGS_TEXT)));
  assert.equal(existsSync(path.join(parallel, ".skill-me", "claude.lock")), false, "lock liberado");

  // Edição externa entre a prévia e a aplicação é preservada.
  const edited = claudeTarget("edited");
  assert.equal(cli(["plan", "--agent", "claude", "--target", edited]).status, 0);
  const doc = JSON.parse(CLAUDE_SETTINGS_TEXT);
  doc.theme = "dark";
  doc.hooks.Notification = [{ hooks: [{ type: "command", command: "user-added.sh" }] }];
  writeFileSync(path.join(edited, "settings.json"), JSON.stringify(doc, null, 2));
  assert.equal(cli(["install", "--agent", "claude", "--target", edited, "--apply"]).status, 0);
  const merged = json(path.join(edited, "settings.json"));
  assert.equal(merged.theme, "dark");
  assert.deepEqual(merged.hooks.Notification, doc.hooks.Notification);
});

test("I4-C31 remoção retira só o que confere com o registro e restaura os valores", () => {
  // Arquivo preexistente: valores voltam a ser os originais, inclusive tokens numéricos.
  const target = claudeTarget("remove");
  assert.equal(cli(["install", "--agent", "claude", "--target", target, "--apply"]).status, 0);
  // Grupo de terceiro adicionado depois da instalação numa chave que a instalação
  // criou, por um editor que preserva o texto exato dos números.
  const doc = JSON.parse(readFileSync(path.join(target, "settings.json"), "utf8"), (key, value, context) =>
    typeof value === "number" && String(value) !== context.source ? JSON.rawJSON(context.source) : value,
  );
  doc.hooks.SessionStart.push({ hooks: [{ type: "command", command: "user-session.sh" }] });
  writeFileSync(path.join(target, "settings.json"), JSON.stringify(doc, null, 4) + "\n");
  const removed = cli(["uninstall", "--agent", "claude", "--target", target, "--apply"]);
  assert.equal(removed.status, 0, removed.stdout);
  const after = json(path.join(target, "settings.json"));
  const expected = JSON.parse(CLAUDE_SETTINGS_TEXT);
  expected.hooks.SessionStart = [{ hooks: [{ type: "command", command: "user-session.sh" }] }];
  assert.deepEqual(after, expected);
  assert.ok(readFileSync(path.join(target, "settings.json"), "utf8").includes("12345678901234567890"));
  assert.equal(existsSync(path.join(target, ".skill-me")), false, "registro e pasta própria removidos");

  // Arquivo criado pela instalação: some quando volta a ficar vazio.
  const created = claudeTarget("remove-created", null);
  assert.equal(cli(["install", "--agent", "claude", "--target", created, "--apply"]).status, 0);
  assert.equal(cli(["uninstall", "--agent", "claude", "--target", created, "--apply"]).status, 0);
  assert.equal(existsSync(path.join(created, "settings.json")), false);

  // Codex: hooks.json volta aos valores de antes; config.toml intocado.
  const codex = codexTarget("remove-codex");
  assert.equal(cli(["install", "--agent", "codex", "--target", codex, "--apply"]).status, 0);
  assert.equal(cli(["uninstall", "--agent", "codex", "--target", codex, "--apply"]).status, 0);
  assert.deepEqual(json(path.join(codex, "hooks.json")), JSON.parse(CODEX_HOOKS_TEXT));
  assert.equal(readFileSync(path.join(codex, "config.toml"), "utf8"), CODEX_CONFIG_TOML);

  // Hermes: só os três artefatos próprios saem.
  const hermes = hermesTarget("remove-hermes");
  const hermesBefore = snapshotTree(hermes, { withMtime: false });
  assert.equal(cli(["install", "--agent", "hermes", "--target", hermes, "--apply"]).status, 0);
  assert.equal(cli(["uninstall", "--agent", "hermes", "--target", hermes, "--apply"]).status, 0);
  assert.deepEqual(snapshotTree(hermes, { withMtime: false }), hermesBefore);
});

test("I4-C32 entrada própria editada é preservada como conflito, também na segunda remoção", () => {
  const target = claudeTarget("modified");
  assert.equal(cli(["install", "--agent", "claude", "--target", target, "--apply"]).status, 0);
  const doc = json(path.join(target, "settings.json"));
  const ownIndex = doc.hooks.PreToolUse.findIndex((group) => group.hooks.some((h) => (h.args ?? []).includes(INTEGRATIONS_CLI)));
  doc.hooks.PreToolUse[ownIndex].hooks[0].timeout = 99;
  writeFileSync(path.join(target, "settings.json"), JSON.stringify(doc, null, 2));
  const first = cli(["uninstall", "--agent", "claude", "--target", target, "--apply"]);
  assert.equal(first.status, 4, first.stdout);
  assert.deepEqual(first.report.conflicts.map((c) => [c.code, c.event]), [["owned_entry_modified", "PreToolUse"]]);
  const after = json(path.join(target, "settings.json"));
  assert.equal(after.hooks.PreToolUse.length, 2, "terceiro + própria editada");
  assert.equal(after.hooks.PreToolUse[1].hooks[0].timeout, 99);
  for (const event of CLAUDE_EVENTS.filter((e) => e !== "PreToolUse")) assert.equal(after.hooks[event], undefined, event);
  const bytes = readFileSync(path.join(target, "settings.json"));
  const second = cli(["uninstall", "--agent", "claude", "--target", target, "--apply"]);
  assert.equal(second.status, 4);
  assert.deepEqual(second.report.conflicts.map((c) => c.code), ["owned_entry_modified"]);
  assert.deepEqual(readFileSync(path.join(target, "settings.json")), bytes, "segunda remoção não apaga nada");
});

// Edição do usuário na configuração por um editor que preserva o texto exato
// dos números (inteiro > 2^53 alheio), como em I4-C31.
function editConfig(file, mutate) {
  const doc = JSON.parse(readFileSync(file, "utf8"), (key, value, context) =>
    typeof value === "number" && String(value) !== context.source ? JSON.rawJSON(context.source) : value,
  );
  mutate(doc);
  writeFileSync(file, JSON.stringify(doc, null, 4) + "\n");
}
const isOwnHandler = (agent) => (handler) =>
  agent === "claude" ? Array.isArray(handler.args) && handler.args.includes(INTEGRATIONS_CLI) : typeof handler.command === "string" && handler.command.includes(INTEGRATIONS_CLI);
const ownGroupOf = (agent, groups) => groups.find((group) => group.hooks.some(isOwnHandler(agent)));

test("I4-C32b reinstalar sobre entrada própria editada não duplica nem perde o registro; a remoção não declara sucesso", () => {
  for (const [agent, makeTarget, file, read] of [
    ["claude", claudeTarget, "settings.json", readClaudeHandlers],
    ["codex", codexTarget, "hooks.json", readCodexHandlers],
  ]) {
    const target = makeTarget(`edit-reinstall-${agent}`);
    const config = path.join(target, file);
    const manifest = path.join(target, ".skill-me", `${agent}-install.json`);
    assert.equal(cli(["install", "--agent", agent, "--target", target, "--apply"]).status, 0);
    const recorded = json(manifest).entries.find((entry) => entry.event === "PreToolUse");
    editConfig(config, (doc) => {
      ownGroupOf(agent, doc.hooks.PreToolUse).hooks[0].timeout = 99;
    });
    const editedBytes = readFileSync(config);
    const manifestBytes = readFileSync(manifest);
    const conflict = [{ code: "owned_entry_modified", file, event: "PreToolUse" }];

    // Reinstalar (prévia e aplicação): conflito reconhecido; nada acrescentado,
    // adotado ou regravado — a edição continua sendo o único grupo próprio.
    for (const apply of [false, true]) {
      const again = cli(["install", "--agent", agent, "--target", target, ...(apply ? ["--apply"] : [])]);
      assert.equal(again.status, 4, `${agent} reinstall apply=${apply}: ${again.stdout}`);
      assert.equal(again.report.status, "conflict", agent);
      assert.deepEqual(again.report.conflicts, conflict, agent);
      assert.deepEqual(again.report.changes, [], `${agent} apply=${apply}: nenhuma mudança`);
    }
    assert.deepEqual(readFileSync(config), editedBytes, `${agent}: configuração intocada`);
    assert.deepEqual(readFileSync(manifest), manifestBytes, `${agent}: registro intocado`);
    assert.equal(read(target).PreToolUse.count, 1, `${agent}: um único grupo próprio no evento`);
    assert.equal(read(target).PreToolUse.handler.timeout, 99);

    // Remover: os grupos intactos saem; o editado fica ativo, é reportado e
    // continua no registro.
    const removed = cli(["uninstall", "--agent", agent, "--target", target, "--apply"]);
    assert.equal(removed.status, 4, `${agent} uninstall: ${removed.stdout}`);
    assert.equal(removed.report.status, "conflict", agent);
    assert.deepEqual(removed.report.conflicts, conflict, agent);
    assert.deepEqual(Object.keys(read(target)), ["PreToolUse"], `${agent}: só o grupo editado resta`);
    assert.equal(read(target).PreToolUse.handler.timeout, 99);
    assert.deepEqual(json(manifest).entries, [recorded], `${agent}: registro do grupo editado mantido`);

    // Remover de novo: nenhum byte muda e o conflito continua.
    const configAfter = readFileSync(config);
    const manifestAfter = readFileSync(manifest);
    const second = cli(["uninstall", "--agent", agent, "--target", target, "--apply"]);
    assert.equal(second.status, 4, agent);
    assert.deepEqual(second.report.conflicts, conflict, agent);
    assert.deepEqual(readFileSync(config), configAfter, agent);
    assert.deepEqual(readFileSync(manifest), manifestAfter, agent);

    // Sem registro (perdido depois da instalação) e com o grupo próprio editado:
    // a assinatura não basta para adotar nem para acrescentar outro grupo no
    // evento; os grupos intactos são adotados e a remoção continua reportando.
    const unrecorded = makeTarget(`edit-unrecorded-${agent}`);
    assert.equal(cli(["install", "--agent", agent, "--target", unrecorded, "--apply"]).status, 0);
    editConfig(path.join(unrecorded, file), (doc) => {
      ownGroupOf(agent, doc.hooks.PreToolUse).hooks[0].timeout = 99;
    });
    rmSync(path.join(unrecorded, ".skill-me"), { recursive: true });
    const unrecordedConflict = [{ code: "owned_entry_unrecorded", file, event: "PreToolUse" }];
    const adopted = cli(["install", "--agent", agent, "--target", unrecorded, "--apply"]);
    assert.equal(adopted.status, 4, `${agent} sem registro: ${adopted.stdout}`);
    assert.deepEqual(adopted.report.conflicts, unrecordedConflict, agent);
    assert.ok(!adopted.report.changes.some((c) => c.event === "PreToolUse"), agent);
    assert.equal(read(unrecorded).PreToolUse.count, 1, agent);
    assert.ok(!json(path.join(unrecorded, ".skill-me", `${agent}-install.json`)).entries.some((e) => e.event === "PreToolUse"), agent);
    for (let round = 0; round < 2; round += 1) {
      const result = cli(["uninstall", "--agent", agent, "--target", unrecorded, "--apply"]);
      assert.equal(result.status, 4, `${agent} sem registro, remoção ${round + 1}: ${result.stdout}`);
      assert.deepEqual(result.report.conflicts, unrecordedConflict, agent);
      assert.deepEqual(Object.keys(read(unrecorded)), ["PreToolUse"], agent);
      assert.equal(read(unrecorded).PreToolUse.handler.timeout, 99);
    }
  }

  // Cópia editada de um grupo próprio ao lado do grupo registrado intacto: a
  // remoção tira o registrado e não declara sucesso com a cópia ativa.
  const copied = claudeTarget("edit-copy");
  assert.equal(cli(["install", "--agent", "claude", "--target", copied, "--apply"]).status, 0);
  editConfig(path.join(copied, "settings.json"), (doc) => {
    const copy = JSON.parse(JSON.stringify(ownGroupOf("claude", doc.hooks.SessionStart)));
    copy.hooks[0].timeout = 99;
    doc.hooks.SessionStart.push(copy);
  });
  const copyRemoved = cli(["uninstall", "--agent", "claude", "--target", copied, "--apply"]);
  assert.equal(copyRemoved.status, 4, copyRemoved.stdout);
  assert.deepEqual(copyRemoved.report.conflicts, [{ code: "owned_entry_unrecorded", file: "settings.json", event: "SessionStart" }]);
  assert.deepEqual(Object.keys(readClaudeHandlers(copied)), ["SessionStart"]);
  assert.equal(readClaudeHandlers(copied).SessionStart.handler.timeout, 99);
});

test("I4-C33 falha depois da primeira mutação é reportada como incompleta e se reconcilia", () => {
  const target = claudeTarget("partial");
  // Um diretório no caminho temporário do registro impede gravá-lo depois
  // que a configuração já foi escrita.
  mkdirSync(path.join(target, ".skill-me", "claude-install.json.skill-me-tmp"), { recursive: true });
  const failed = cli(["install", "--agent", "claude", "--target", target, "--apply"]);
  assert.equal(failed.status, 5, failed.stdout);
  assert.equal(failed.report.status, "incomplete");
  assert.deepEqual(failed.report.steps.map((s) => [s.step, s.state]), [["config", "done"], ["manifest", "failed"]]);
  assert.equal(Object.keys(readClaudeHandlers(target)).length, 8, "configuração escrita antes da falha");

  rmSync(path.join(target, ".skill-me", "claude-install.json.skill-me-tmp"), { recursive: true });
  const retried = cli(["install", "--agent", "claude", "--target", target, "--apply"]);
  assert.equal(retried.status, 0, retried.stdout);
  assert.equal(retried.report.changes.filter((c) => c.action === "adopt_group").length, 8);
  for (const event of CLAUDE_EVENTS) assert.equal(readClaudeHandlers(target)[event].count, 1);
  assert.equal(cli(["uninstall", "--agent", "claude", "--target", target, "--apply"]).status, 0);
  assert.deepEqual(json(path.join(target, "settings.json")), JSON.parse(CLAUDE_SETTINGS_TEXT));
});

test("I4-C34 Hermes: artefatos com hash, habilitação manual, pasta alheia e edições preservadas", (t) => {
  const hermes = hermesTarget("hermes-own");
  const installed = cli(["install", "--agent", "hermes", "--target", hermes, "--apply"]);
  assert.equal(installed.status, 0);
  const manifest = json(path.join(hermes, ".skill-me", "hermes-install.json"));
  assert.deepEqual(manifest.artifacts.map((a) => a.path).sort(), HERMES_ARTIFACTS);
  for (const artifact of manifest.artifacts) assert.equal(artifact.sha256, sha256File(path.join(hermes, artifact.path)));
  assert.ok(!readFileSync(path.join(hermes, "config.yaml"), "utf8").includes("skill-me-observer"));

  // Pasta homônima de outra origem → conflito sem escrita.
  const foreign = hermesTarget("hermes-foreign");
  mkdirSync(path.join(foreign, "plugins", "skill-me-observer"));
  writeFileSync(path.join(foreign, "plugins", "skill-me-observer", "plugin.yaml"), "name: skill-me-observer\nauthor: outra pessoa\n");
  const foreignBefore = snapshotTree(foreign);
  const foreignResult = cli(["install", "--agent", "hermes", "--target", foreign, "--apply"]);
  assert.equal(foreignResult.status, 4);
  assert.ok(foreignResult.report.conflicts.some((c) => c.code === "foreign_artifact"));
  assert.deepEqual(snapshotTree(foreign), foreignBefore);

  // Artefato editado e arquivo extra do usuário ficam; o resto sai; código 4.
  const initFile = path.join(hermes, "plugins", "skill-me-observer", "__init__.py");
  writeFileSync(initFile, readFileSync(initFile, "utf8") + "\n# edição do usuário\n");
  writeFileSync(path.join(hermes, "plugins", "skill-me-observer", "notas.txt"), "minhas notas\n");
  const removed = cli(["uninstall", "--agent", "hermes", "--target", hermes, "--apply"]);
  assert.equal(removed.status, 4, removed.stdout);
  assert.deepEqual(removed.report.conflicts.map((c) => c.code).sort(), ["foreign_files_preserved", "owned_entry_modified"]);
  assert.ok(existsSync(initFile));
  assert.ok(existsSync(path.join(hermes, "plugins", "skill-me-observer", "notas.txt")));
  assert.equal(existsSync(path.join(hermes, "plugins", "skill-me-observer", "plugin.yaml")), false);
  assert.equal(existsSync(path.join(hermes, "plugins", "skill-me-observer", "kwargs.json")), false);
  assert.ok(statSync(path.join(hermes, "plugins", "other-plugin")).isDirectory());

  // Bytecode que o Hermes grava para o nosso `__init__.py` (arquivo regular num
  // `__pycache__` real) continua saindo com a remoção: a árvore volta à anterior.
  const cachedHome = hermesTarget("hermes-cache");
  const cachedBefore = snapshotTree(cachedHome, { withMtime: false });
  assert.equal(cli(["install", "--agent", "hermes", "--target", cachedHome, "--apply"]).status, 0);
  const ownCache = path.join(cachedHome, "plugins", "skill-me-observer", "__pycache__");
  mkdirSync(ownCache);
  for (const name of ["__init__.cpython-311.pyc", "__init__.cpython-311.opt-1.pyc"]) writeFileSync(path.join(ownCache, name), "bytecode sintético\n");
  const cleaned = cli(["uninstall", "--agent", "hermes", "--target", cachedHome, "--apply"]);
  assert.equal(cleaned.status, 0, cleaned.stdout);
  assert.equal(cleaned.report.status, "applied");
  assert.deepEqual(cleaned.report.changes.filter((c) => c.action === "remove_cache").map((c) => c.file).sort(), [
    "plugins/skill-me-observer/__pycache__/__init__.cpython-311.opt-1.pyc",
    "plugins/skill-me-observer/__pycache__/__init__.cpython-311.pyc",
  ]);
  assert.deepEqual(snapshotTree(cachedHome, { withMtime: false }), cachedBefore);

  // `__pycache__` que não é diretório real do plugin — junção/link para o cache de
  // outro plugin dentro do alvo, ou arquivo com esse nome — é alheio: nada nele
  // nem através dele é apagado; os artefatos próprios saem; conflito 4.
  for (const variant of ["link para cache de outro plugin", "arquivo regular"]) {
    const home = hermesTarget(`hermes-cache-${variant === "arquivo regular" ? "file" : "link"}`);
    assert.equal(cli(["install", "--agent", "hermes", "--target", home, "--apply"]).status, 0);
    const otherCache = path.join(home, "plugins", "other-plugin", "__pycache__");
    mkdirSync(otherCache);
    writeFileSync(path.join(otherCache, "__init__.cpython-311.pyc"), "bytecode de outro plugin\n");
    const cacheEntry = path.join(home, "plugins", "skill-me-observer", "__pycache__");
    if (variant === "arquivo regular") writeFileSync(cacheEntry, "arquivo do usuário\n");
    else symlinkSync(otherCache, cacheEntry, "junction");
    const otherBefore = snapshotTree(path.join(home, "plugins", "other-plugin"));
    const entryBefore = snapshotTree(path.join(home, "plugins", "skill-me-observer"));
    const result = cli(["uninstall", "--agent", "hermes", "--target", home, "--apply"]);
    assert.equal(result.status, 4, `${variant}: ${result.stdout}`);
    assert.deepEqual(result.report.conflicts.map((c) => c.code), ["foreign_files_preserved"], variant);
    assert.ok(!result.report.changes.some((c) => c.action === "remove_cache"), variant);
    assert.deepEqual(snapshotTree(path.join(home, "plugins", "other-plugin")), otherBefore, `${variant}: cache do outro plugin preservado`);
    assert.deepEqual(snapshotTree(path.join(home, "plugins", "skill-me-observer")), { __pycache__: entryBefore.__pycache__ }, `${variant}: só a entrada alheia fica`);
  }

  // Staging da instalação: o nome fixo e os nomes dos artefatos não comprovam
  // propriedade. Junção/link para outro plugin dentro do alvo, diretório real com
  // arquivos de mesmo nome e conteúdo alheio, arquivo no lugar do diretório e link
  // de arquivo de nome próprio → 4 antes de qualquer exclusão; o outro plugin fica.
  const linked = hermesStagingTarget("staging-link");
  symlinkSync(linked.victim, linked.staging, "junction");
  assertHermesInstallRefused(linked.home, "staging junção/link para outro plugin", ["foreign_artifact"]);

  const sameNames = hermesStagingTarget("staging-foreign-dir");
  mkdirSync(sameNames.staging);
  for (const [name, text] of Object.entries(VICTIM_FILES)) writeFileSync(path.join(sameNames.staging, name), text);
  assertHermesInstallRefused(sameNames.home, "staging diretório real com conteúdo alheio", ["foreign_artifact"]);

  const asFile = hermesStagingTarget("staging-file");
  writeFileSync(asFile.staging, "arquivo do usuário\n");
  assertHermesInstallRefused(asFile.home, "staging como arquivo", ["foreign_artifact"]);

  const fileLink = hermesStagingTarget("staging-file-link");
  mkdirSync(fileLink.staging);
  if (linkFileOrDiagnose(t, path.join(fileLink.victim, "__init__.py"), path.join(fileLink.staging, "__init__.py"), "link de arquivo no staging")) {
    assertHermesInstallRefused(fileLink.home, "staging com link de arquivo de nome próprio", ["foreign_artifact"]);
  }

  // Sobra própria de uma instalação interrompida (cópias exatas de artefatos do
  // pacote num diretório real) é limpa e a instalação conclui normalmente.
  const leftover = hermesStagingTarget("staging-own");
  const leftoverBefore = snapshotTree(leftover.home, { withMtime: false });
  mkdirSync(leftover.staging);
  for (const name of ["__init__.py", "kwargs.json"]) copyFileSync(path.join(HERMES_PLUGIN_SOURCE, name), path.join(leftover.staging, name));
  const reconciled = cli(["install", "--agent", "hermes", "--target", leftover.home, "--apply"]);
  assert.equal(reconciled.status, 0, reconciled.stdout);
  assert.equal(reconciled.report.status, "applied");
  assert.equal(existsSync(leftover.staging), false, "staging próprio removido");
  const leftoverManifest = json(path.join(leftover.home, ".skill-me", "hermes-install.json"));
  assert.deepEqual(leftoverManifest.artifacts.map((a) => a.path).sort(), HERMES_ARTIFACTS);
  for (const artifact of leftoverManifest.artifacts) assert.equal(artifact.sha256, sha256File(path.join(leftover.home, artifact.path)));
  assert.equal(cli(["uninstall", "--agent", "hermes", "--target", leftover.home, "--apply"]).status, 0);
  assert.deepEqual(snapshotTree(leftover.home, { withMtime: false }), leftoverBefore, "árvore volta à anterior, outro plugin intacto");
});

// Outro plugin com bytecode de nome igual ao do cache próprio
// (`__pycache__/__init__.cpython-311.pyc`), com `__init__.py` diferente ou com
// cópias exatas dos nossos artefatos: conteúdo igual não torna a pasta nossa.
const OTHER_PLUGIN_FILES = { "__init__.py": "# plugin sintético de terceiro\n", "plugin.yaml": "name: victim-plugin\n" };
const ownArtifactCopies = () => Object.fromEntries(["__init__.py", "kwargs.json", "plugin.yaml"].map((name) => [name, readFileSync(path.join(HERMES_PLUGIN_SOURCE, name))]));
function writeOtherPlugin(dir, files) {
  mkdirSync(path.join(dir, "__pycache__"), { recursive: true });
  for (const [name, content] of Object.entries(files)) writeFileSync(path.join(dir, name), content);
  const bytecode = path.join(dir, "__pycache__", "__init__.cpython-311.pyc");
  writeFileSync(bytecode, "bytecode sintético de terceiro\n");
  return bytecode;
}
const snapshotIfPresent = (dir) => (existsSync(dir) ? snapshotTree(dir) : null);
const conflictText = (c) => (c.code === "target_escape" ? c.code : `${c.code}:${c.file}`);
const bytecodeState = (file, hash) => (existsSync(file) ? (sha256File(file) === hash ? "intacto" : "alterado") : "apagado");

// Junção no Windows, symlink real no POSIX; link de arquivo exige privilégio no Windows.
const PLUGIN_DIR_SWAPS = [
  { label: "junção/link para outro plugin no alvo", outside: false, link: "dir", files: () => OTHER_PLUGIN_FILES },
  { label: "junção/link para cópia exata dos artefatos no alvo", outside: false, link: "dir", files: ownArtifactCopies },
  { label: "junção/link para cópia exata fora do alvo", outside: true, link: "dir", files: ownArtifactCopies },
  { label: "link de arquivo para o __init__.py de outro plugin no alvo", outside: false, link: "file", files: () => OTHER_PLUGIN_FILES },
  { label: "link de arquivo para fora do alvo", outside: true, link: "file", files: () => OTHER_PLUGIN_FILES },
  { label: "arquivo regular", outside: false, link: null, files: () => OTHER_PLUGIN_FILES },
];
const PLUGIN_DIR_COMMANDS = [["install"], ["install", "--apply"], ["uninstall"], ["uninstall", "--apply"]];
function runPluginDirCommands(home) {
  return PLUGIN_DIR_COMMANDS.map(([command, ...flags]) => {
    const { status, report } = cli([command, "--agent", "hermes", "--target", home, ...flags]);
    return `${[command, ...flags].join(" ")} → ${status} ${report.status} applied=${report.applied} changes=${report.changes.length} conflicts=${report.conflicts.map(conflictText).join(",")}`;
  });
}

test("I4-C34b Hermes: pasta própria trocada por junção/link ou arquivo não é lida nem limpa como nossa", (t) => {
  // A troca acontece depois da instalação (registro presente) ou num alvo nunca
  // instalado. Prévia e aplicação de install e uninstall recusam com 4 sem
  // mudança listada; o bytecode e a árvore do outro plugin, o link, a
  // configuração e o registro ficam byte a byte (e mtime) iguais.
  const observed = [];
  const expected = [];
  for (const [index, swap] of PLUGIN_DIR_SWAPS.entries()) {
    for (const installed of [true, false]) {
      const label = `${swap.label}, ${installed ? "depois de instalar" : "sem instalação"}`;
      const home = hermesTarget(`plugin-dir-${index}-${installed ? "installed" : "fresh"}`);
      const own = path.join(home, "plugins", "skill-me-observer");
      if (installed) {
        assert.equal(cli(["install", "--agent", "hermes", "--target", home, "--apply"]).status, 0, label);
        // A pasta instalada sai do alvo sem ser apagada; a troca ocupa o lugar dela.
        renameSync(own, path.join(path.dirname(home), "pasta própria movida"));
      }
      const otherDir = path.join(swap.outside ? scratch(`plugin-dir-${index}-outside`) : path.join(home, "plugins"), "victim-plugin");
      const bytecode = writeOtherPlugin(otherDir, swap.files());
      if (swap.link === "dir") symlinkSync(otherDir, own, "junction");
      else if (swap.link === "file") {
        if (!linkFileOrDiagnose(t, path.join(otherDir, "__init__.py"), own, label)) continue;
      } else writeFileSync(own, "arquivo do usuário\n");
      const linkTarget = swap.link ? realpathSync(own) : null;
      const bytecodeHash = sha256File(bytecode);
      const otherBefore = snapshotTree(otherDir);
      const homeBefore = snapshotTree(home);

      const results = runPluginDirCommands(home);
      let linkKept = null;
      if (swap.link) linkKept = existsSync(own) && lstatSync(own).isSymbolicLink() && realpathSync(own) === linkTarget;
      observed.push({
        label,
        results,
        bytecode: bytecodeState(bytecode, bytecodeHash),
        otherPluginIntact: isDeepStrictEqual(snapshotIfPresent(otherDir), otherBefore),
        targetIntact: isDeepStrictEqual(snapshotTree(home), homeBefore),
        linkKept,
      });
      const conflict = swap.outside ? "target_escape" : "foreign_artifact:plugins/skill-me-observer";
      expected.push({
        label,
        results: PLUGIN_DIR_COMMANDS.map((args) => `${args.join(" ")} → 4 conflict applied=false changes=0 conflicts=${conflict}`),
        bytecode: "intacto",
        otherPluginIntact: true,
        targetIntact: true,
        linkKept: swap.link ? true : null,
      });
    }
  }
  // Diretório real de mesmo nome que nunca foi instalado (sem registro): nada
  // nele é comprovadamente nosso, nem o bytecode — a aplicação não apaga o que a
  // prévia não lista.
  const unrecorded = hermesTarget("plugin-dir-unrecorded");
  const unrecordedDir = path.join(unrecorded, "plugins", "skill-me-observer");
  const unrecordedBytecode = writeOtherPlugin(unrecordedDir, OTHER_PLUGIN_FILES);
  const unrecordedHash = sha256File(unrecordedBytecode);
  const unrecordedDirBefore = snapshotTree(unrecordedDir);
  const unrecordedBefore = snapshotTree(unrecorded);
  const unrecordedLabel = "diretório real de mesmo nome, sem registro";
  observed.push({
    label: unrecordedLabel,
    results: runPluginDirCommands(unrecorded),
    bytecode: bytecodeState(unrecordedBytecode, unrecordedHash),
    otherPluginIntact: isDeepStrictEqual(snapshotIfPresent(unrecordedDir), unrecordedDirBefore),
    targetIntact: isDeepStrictEqual(snapshotTree(unrecorded), unrecordedBefore),
    linkKept: null,
  });
  expected.push({
    label: unrecordedLabel,
    results: PLUGIN_DIR_COMMANDS.map((args) => `${args.join(" ")} → 4 conflict applied=false changes=0 conflicts=${args[0] === "install" ? "foreign_artifact" : "owned_entry_unrecorded"}:plugins/skill-me-observer`),
    bytecode: "intacto",
    otherPluginIntact: true,
    targetIntact: true,
    linkKept: null,
  });
  assert.deepEqual(observed, expected);

  // Controle: pasta própria real com o cache normal, ao lado de outro plugin com
  // bytecode de mesmo nome — o nosso sai e a árvore volta à anterior; o outro fica.
  const control = hermesTarget("plugin-dir-real");
  const controlOther = path.join(control, "plugins", "victim-plugin");
  writeOtherPlugin(controlOther, OTHER_PLUGIN_FILES);
  const controlBefore = snapshotTree(control, { withMtime: false });
  const controlOtherBefore = snapshotTree(controlOther);
  assert.equal(cli(["install", "--agent", "hermes", "--target", control, "--apply"]).status, 0);
  const ownCache = path.join(control, "plugins", "skill-me-observer", "__pycache__");
  mkdirSync(ownCache);
  writeFileSync(path.join(ownCache, "__init__.cpython-311.pyc"), "bytecode sintético próprio\n");
  const cleaned = cli(["uninstall", "--agent", "hermes", "--target", control, "--apply"]);
  assert.equal(cleaned.status, 0, cleaned.stdout);
  assert.equal(cleaned.report.status, "applied");
  assert.deepEqual(cleaned.report.conflicts, []);
  assert.deepEqual(cleaned.report.changes.filter((c) => c.action === "remove_cache").map((c) => c.file), ["plugins/skill-me-observer/__pycache__/__init__.cpython-311.pyc"]);
  assert.deepEqual(snapshotTree(control, { withMtime: false }), controlBefore, "árvore volta à anterior");
  assert.deepEqual(snapshotTree(controlOther), controlOtherBefore, "outro plugin intacto, inclusive mtime");
});

function linkPointsTo(link, target) {
  try {
    return lstatSync(link).isSymbolicLink() && realpathSync(link) === realpathSync(target);
  } catch {
    return false;
  }
}

test("I4-C34d diretório criado pela instalação e trocado depois por junção/link do usuário fica na limpeza", () => {
  // Controle: sem troca, `plugins` e `.skill-me` reais criados pela instalação
  // saem na remoção e a árvore volta à anterior.
  const fresh = path.join(scratch("container-real"), "hermes home");
  mkdirSync(fresh);
  writeFileSync(path.join(fresh, "config.yaml"), HERMES_CONFIG_YAML);
  const freshBefore = snapshotTree(fresh, { withMtime: false });
  assert.equal(cli(["install", "--agent", "hermes", "--target", fresh, "--apply"]).status, 0);
  assert.equal(json(path.join(fresh, ".skill-me", "hermes-install.json")).created.pluginsDir, true);
  const freshRemoved = cli(["uninstall", "--agent", "hermes", "--target", fresh, "--apply"]);
  assert.equal(freshRemoved.status, 0, freshRemoved.stdout);
  assert.deepEqual(snapshotTree(fresh, { withMtime: false }), freshBefore, "plugins e .skill-me criados pela instalação saem");

  // Depois da instalação o usuário move o diretório criado por ela (`plugins` do
  // Hermes; `.skill-me`, comum aos agentes) para outro lugar do alvo e põe no
  // lugar uma junção (Windows) / symlink (POSIX). A remoção conclui o que é
  // nosso; o destino fica vazio e o link do usuário continua.
  const scenarios = [
    { label: "Hermes: plugins → plugin-store", agent: "hermes", moved: "plugins", store: "plugin-store", target: () => {
      const home = path.join(scratch("container-link"), "hermes home");
      mkdirSync(home);
      writeFileSync(path.join(home, "config.yaml"), HERMES_CONFIG_YAML);
      return home;
    } },
    { label: "Claude: .skill-me → state-store", agent: "claude", moved: ".skill-me", store: "state-store", target: () => claudeTarget("state-link") },
  ];
  const observed = [];
  const expected = [];
  for (const scenario of scenarios) {
    const target = scenario.target();
    assert.equal(cli(["install", "--agent", scenario.agent, "--target", target, "--apply"]).status, 0, scenario.label);
    const moved = path.join(target, scenario.moved);
    const store = path.join(target, scenario.store);
    renameSync(moved, store);
    symlinkSync(store, moved, "junction");
    const { status, report } = cli(["uninstall", "--agent", scenario.agent, "--target", target, "--apply"]);
    observed.push({
      label: scenario.label,
      result: `${status} ${report.status} conflicts=${report.conflicts.map(conflictText).join(",")}`,
      changes: report.changes.map((c) => `${c.action}${c.event ? `:${c.event}` : ""}:${c.file}`).sort(),
      storeLeftEmpty: existsSync(store) && lstatSync(store).isDirectory() && readdirSync(store).length === 0,
      linkKept: linkPointsTo(moved, store),
    });
  }
  expected.push({
    label: "Hermes: plugins → plugin-store",
    result: "0 applied conflicts=",
    changes: ["delete_manifest:.skill-me/hermes-install.json", ...HERMES_ARTIFACTS.map((file) => `remove_artifact:${file}`)].sort(),
    storeLeftEmpty: true,
    linkKept: true,
  });
  expected.push({
    label: "Claude: .skill-me → state-store",
    result: "0 applied conflicts=",
    changes: [
      "delete_manifest:.skill-me/claude-install.json",
      ...CLAUDE_EVENTS.map((event) => `remove_group:${event}:settings.json`),
      // PreToolUse já existia no arquivo do usuário; as demais chaves foram criadas pela instalação.
      ...CLAUDE_EVENTS.filter((event) => event !== "PreToolUse").map((event) => `remove_event_key:${event}:settings.json`),
    ].sort(),
    storeLeftEmpty: true,
    linkKept: true,
  });
  assert.deepEqual(observed, expected);
});
