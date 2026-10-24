import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { HELP_TEXT } from "../../../src/integrations/cli-args.mjs";
import { MAX_SESSIONS } from "../../../src/integrations/observe/authorization.mjs";
import { OBSERVE_HELP_TEXT, OBSERVE_LOCK_PATIENCE_MS, RECENT_CAPTURES } from "../../../src/integrations/observe/command.mjs";
import { AUTOMATIC_DELIVERY_CODES } from "../../../src/integrations/observe/delivery.mjs";
import { DEFAULT_RETENTION_DAYS, PRIVACY_LIMITS } from "../../../src/integrations/privacy/lifecycle.mjs";
import { REPORT_HELP } from "../../../src/integrations/report/command.mjs";
import { REPO_ROOT, makeScratch, runIntegrations } from "../helpers/cli.mjs";
import { claudePayload } from "../helpers/privacy-canaries.mjs";
import { DELIVERED_AUTO, homeEnv, runNpmScript } from "../helpers/observe.mjs";
import { runHook } from "../helpers/traces.mjs";

// Prova C18 da issue #23: o README ensina a preparação única, o fluxo de uma
// linha por ação e os limites reais, com nomes e números tirados do código, e
// seguir o README como está escrito liga, observa, desliga e relata.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

const read = (rel) => readFileSync(path.join(REPO_ROOT, rel), "utf8").replaceAll("\r\n", "\n");
const README = read("README.md");
const TRACES = read("docs/traces.md");
const PKG = JSON.parse(read("package.json"));
const MIB = 1024 * 1024;

// Texto da seção até o próximo título de nível igual ou maior, fora de blocos
// cercados (um comentário `# …` de shell não é título).
function section(text, heading) {
  const lines = text.split("\n");
  const start = lines.indexOf(heading);
  assert.ok(start >= 0, `seção ausente: ${heading}`);
  const level = heading.split(" ")[0].length;
  let fenced = false;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index++) {
    if (lines[index].startsWith("```")) fenced = !fenced;
    const match = /^(#+) /.exec(lines[index]);
    if (!fenced && match && match[1].length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}
const prose = (text) => text.replace(/\s+/g, " ");
const codeBlocks = (text) => [...text.matchAll(/```([a-z]*)\n([\s\S]*?)```/g)].map(([, lang, body]) => ({ lang, lines: body.split("\n").filter(Boolean) }));
const cells = (line) => line.slice(1, -1).split(" | ").map((cell) => cell.trim());

const USAGE = section(README, "## Primeiro uso: observar sessões com `on` e `off`");
const PREPARE = section(USAGE, "### 1. Preparar uma vez");
const NORMAL = section(USAGE, "### 2. Uso normal");
const LIMITS = section(USAGE, "### 3. Limites reais");
const MANUAL = section(USAGE, "### Avançado: captura manual");
const FLOW = ["npm run on", "# use Claude Code, Codex CLI ou Hermes normalmente, com a skill", "npm run off", 'node src/integrations/cli.mjs report --latest --skill "<caminho/para/SKILL.md>"'];

test("I23-C18 README descreve on off real: preparação única, uma linha por ação e limites reais, conferidos com o código", () => {
  // Os scripts do fluxo são os do package.json, sem argumentos.
  assert.equal(PKG.scripts.on, "node src/integrations/cli.mjs observe on");
  assert.equal(PKG.scripts.off, "node src/integrations/cli.mjs observe off");
  assert.equal(PKG.scripts.status, "node src/integrations/cli.mjs observe status");
  assert.equal(PKG.private, true);

  // Preparação feita uma vez: instalação/confiança e a raiz, nos dois terminais.
  const prepare = prose(PREPARE);
  for (const pattern of [/npm ci/, /`\/hooks` no Claude\/Codex/, /`hermes plugins enable skill-me-observer`/, /absoluta e existente/, /`\.skill-me\/observe\.json`/, /deixa de precisar de `SKILL_ME_HERMES_DELIVERY`/, /`npm run off` antes e repita o `setup`/, /`root_changed`/]) {
    assert.match(prepare, pattern);
  }
  const setups = codeBlocks(PREPARE).flatMap((b) => b.lines).filter((line) => line.includes("observe setup"));
  assert.deepEqual(setups, ["node src/integrations/cli.mjs observe setup --root $root", 'node src/integrations/cli.mjs observe setup --root "$HOME/.local/share/skill-me/capturas"']);
  assert.ok(OBSERVE_HELP_TEXT.includes("integrations observe setup --root <diretório-absoluto>"));
  assert.ok(HELP_TEXT.includes("integrations observe <setup --root <diretório-absoluto>|on|off|status>"));

  // Uso normal: exatamente uma linha por ação.
  const [flow] = codeBlocks(NORMAL);
  assert.deepEqual(flow.lines, FLOW);
  assert.ok(REPORT_HELP.includes("integrations report --latest [--skill <SKILL.md>] [--format text|markdown|json]"));
  assert.ok(HELP_TEXT.includes("integrations report --latest [--skill <SKILL.md>]"));
  const normal = prose(NORMAL);
  for (const text of [
    `${PRIVACY_LIMITS.maxEvents} eventos ou ${PRIVACY_LIMITS.maxBytes / MIB} MiB`,
    `retidas por ${DEFAULT_RETENTION_DAYS} dias`,
    `as ${RECENT_CAPTURES} capturas automáticas mais recentes`,
    `esperado por até ${OBSERVE_LOCK_PATIENCE_MS / 1000} s`,
    "nunca escolhe uma captura manual",
    "depois da sanitização",
    "inclusive para hooks ou plugin já em execução",
    "Repetir `off` não muda nada",
    "repetir `on` não muda nada",
    "`npm run status`",
  ]) {
    assert.ok(normal.includes(text), text);
  }
  assert.match(normal, /0 concluído, 2 uso inválido, 3 sem `setup` ou estado inválido, 4 conflito, lock ocupado ou raiz trocada, 5 falha de E\/S/);

  // Limites reais declarados.
  const limits = prose(LIMITS);
  for (const pattern of [
    /Hooks só rodam depois da confiança nativa/,
    /ferramentas hospedadas \(como a busca na web\) ficam fora da cobertura dos hooks/,
    /não tem evento de ativação de skill/,
    /`SKILL\.md` aparece só como operação de ferramenta, nunca como prova de que a skill foi carregada/,
    /`integrations run --agent codex` continua só com a captura manual/,
    /inicie o Hermes depois do `setup`/,
    /eventos Hermes não incluem conteúdo de comandos/,
    /raciocínio interno do agente nunca é capturado/,
    /evento sem identidade de sessão aceita pela fronteira não é gravado nem atribuído a outra sessão/i,
    /nunca bloqueia o agente/,
    /Para parar, use `npm run off`/,
  ]) {
    assert.match(limits, pattern);
  }

  // Os comandos manuais avançados continuam documentados.
  const manual = prose(MANUAL);
  for (const text of ["SKILL_ME_CAPTURE_ROOT", "SKILL_ME_CAPTURE_ID", "privacy start --root", "privacy stop --root", "`privacy disable`", "report --root", "SKILL_ME_HERMES_DELIVERY", "--codex-entry", "têm precedência", "nunca convertido em captura automática", "`npm run off` não a encerra"]) {
    assert.ok(manual.includes(text), text);
  }
  assert.ok(!/ainda não está implementada/.test(README), "o README não diz mais que a captura automática falta");

  // O guia de traces traz o mesmo vocabulário fechado da entrega automática.
  const auto = section(TRACES, "## Observação automática (issue #23)");
  const table = auto.split("\n").filter((line) => line.startsWith("| `"));
  assert.deepEqual(table.map((line) => cells(line)[0].replaceAll("`", "")), [...AUTOMATIC_DELIVERY_CODES]);
  assert.ok(prose(auto).includes(`até ${MAX_SESSIONS} sessões por geração`));
});

// Linha de shell do README → argv: aspas duplas agrupam; $HOME é o home dado.
const argvOf = (line, home) => [...line.matchAll(/"([^"]*)"|(\S+)/g)].map(([, quoted, bare]) => (quoted ?? bare).replaceAll("$HOME", home));

test("I23-C18 README descreve on off real: seguir o README como está escrito liga, observa, desliga e relata a sessão", async () => {
  const home = makeScratch("i23 c18 home");
  scratches.push(home);
  const project = makeScratch("i23 c18 projeto");
  scratches.push(project);
  const env = homeEnv(home);

  // Preparação, bloco bash/zsh: mkdir -p e o setup, com o $HOME deste usuário de teste.
  const posix = codeBlocks(PREPARE).find((b) => b.lang === "sh" && b.lines.some((line) => line.includes("observe setup")));
  for (const line of posix.lines) {
    const argv = argvOf(line, home);
    if (argv[0] === "mkdir") mkdirSync(argv[2], { recursive: true });
    else {
      assert.deepEqual(argv.slice(0, 2), ["node", "src/integrations/cli.mjs"], line);
      const run = runIntegrations(argv.slice(2), { env, cwd: REPO_ROOT });
      assert.equal(run.status, 0, `${line}: ${run.stdout}`);
    }
  }
  const root = path.join(home, ".local", "share", "skill-me", "capturas");

  const skill = path.join(project, "SKILL.md");
  writeFileSync(skill, "---\nname: demo\n---\n\n- Run `npm test`.\n");
  let captureId = null;
  for (const line of FLOW) {
    if (line.startsWith("npm run ")) {
      const run = runNpmScript(line.slice("npm run ".length), { env });
      assert.equal(run.status, 0, `${line}: ${run.stdout}`);
      if (line === "npm run on") {
        assert.equal(run.body.observation.state, "on");
        assert.equal(runNpmScript("status", { env }).body.observation.state, "on", "outro processo vê on");
      } else {
        assert.equal(run.body.observation.state, "off");
        captureId = run.body.stopped[0];
      }
    } else if (line.startsWith("#")) {
      // "use o agente normalmente": um hook Claude sem variável de captura.
      const hook = await runHook("claude", claudePayload("pre_tool_bash", { tool_input: { command: "npm test" } }), { env, cwd: project });
      assert.deepEqual(hook.report.delivery, DELIVERED_AUTO(1));
    } else {
      const argv = argvOf(line.replace("<caminho/para/SKILL.md>", skill), home);
      const run = runIntegrations(argv.slice(2), { env, cwd: project });
      assert.equal(run.status, 0, run.stdout);
      assert.ok(run.stdout.startsWith(`Relatório de execução\n\nCaptura: ${captureId}; fonte: timeline.capture.id.\n`), run.stdout.slice(0, 200));
    }
  }
  assert.match(captureId ?? "", /^[0-9a-f]{32}$/, "o off encerrou a captura da sessão");
  assert.ok(readFileSync(path.join(root, "skill-me-privacy", "captures", captureId, "state.json"), "utf8").includes('"origin":"automatic"'));
});
