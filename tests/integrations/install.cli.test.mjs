import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
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
