import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { SKILL_ME_HELP } from "../../../src/integrations/launch/command.mjs";
import { REPO_ROOT } from "../helpers/cli.mjs";

// Prova C37 da issue #25 (critério 30): o README apresenta o preparo único e o
// fluxo diário do `skill-me` antes do on/off, e o README e os três guias
// declaram os limites reais, com os valores literais do critério 30 e do
// Landing de .checks/issue-25-agent-launch.md (não as constantes do código).

// Linha "Entrega da execução" do Landing, na ordem.
const LAUNCH_CODES = ["launch_ended", "root_not_found", "root_not_directory", "store_invalid", "capture_invalid", "lock_present", "link_refused", "foreign_entry", "root_changed", "io_failure", "delivery_timeout"];

const read = (rel) => readFileSync(path.join(REPO_ROOT, rel), "utf8").replaceAll("\r\n", "\n");
const prose = (text) => text.replace(/\s+/g, " ");
const README = read("README.md");
const DOCS = { "README.md": README, "docs/traces.md": read("docs/traces.md"), "docs/privacidade.md": read("docs/privacidade.md"), "docs/agent-observation.md": read("docs/agent-observation.md") };

// Seção até o próximo título de nível igual ou maior, fora de blocos cercados.
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
const codeBlocks = (text) => [...text.matchAll(/```([a-z]*)\n([\s\S]*?)```/g)].map(([, , body]) => body.split("\n").filter(Boolean));

const DAILY = "## Uso diário: `skill-me <agente>`";
const ON_OFF = "## Alternativa: observar todas as sessões com `on` e `off`";

const LIMITS = {
  "confiança manual por agente": /confiança nativa é manual, por agente/,
  "sem evento de skill no Codex": /evento nativo de ativação de skill/,
  "SKILL.md só como ferramenta": /ler um `SKILL\.md` aparece só como operação de ferramenta/,
  "só ferramentas locais": /cobrem só ferramentas locais/,
  "limite por captura": /500 eventos ou 8 MiB/,
  "capturas sucessivas com chave própria": /capturas? sucessivas?, com chave própria/,
  "janela depois da saída": /750 ms depois da saída do agente não entram/,
  "encerramento forçado": /\(SIGKILL, TerminateProcess\) deixa a captura corrente `active`[^.]*execução aberta/,
  "próximo passo": /próximo passo [^.]*`skill-me report`/,
};

test("I25-C37 documentação: o README traz o preparo único e o fluxo diário do skill-me antes do on/off, que continua documentado", () => {
  assert.ok(README.indexOf(DAILY) >= 0 && README.indexOf(DAILY) < README.indexOf(ON_OFF), "o uso diário vem antes do on/off");
  const daily = section(README, DAILY);
  const blocks = codeBlocks(daily);
  assert.deepEqual(blocks[0], ["npm ci", "npm link"], "preparo único");
  assert.deepEqual(blocks[1], ["skill-me codex", "skill-me claude", "skill-me hermes"], "uma linha por agente");
  assert.deepEqual(blocks[2], ['skill-me report --skill "<caminho/para/SKILL.md>"'], "consulta sem ID");
  const text = prose(daily);
  for (const step of ["`/hooks` no Claude Code", "`/hooks` e projeto confiável no Codex CLI", "`hermes plugins enable skill-me-observer` no Hermes", "`Confirmar? [s/N]`", "`setup_declined`", "`setup_required`"]) {
    assert.ok(text.includes(step), step);
  }
  // O on/off continua com o fluxo e os comandos dele.
  const onOff = prose(section(README, ON_OFF));
  for (const command of ["npm run on", "npm run off", "report --latest", "observe setup --root"]) assert.ok(onOff.includes(command), command);
  // A ajuda e o README contam o mesmo preparo.
  assert.ok(SKILL_ME_HELP.includes("npm ci e npm link"));
});

test("I25-C37 documentação: README e guias declaram confiança manual, limites do Codex, capturas sucessivas, a janela de 750 ms, o encerramento forçado e skill-me report", () => {
  const observed = {};
  const expected = {};
  for (const [name, text] of Object.entries(DOCS)) {
    const flat = prose(text);
    observed[name] = Object.fromEntries(Object.entries(LIMITS).map(([label, pattern]) => [label, pattern.test(flat)]));
    expected[name] = Object.fromEntries(Object.keys(LIMITS).map((label) => [label, true]));
  }
  assert.deepEqual(observed, expected);
});

test("I25-C37 documentação: os guias citam o par SKILL_ME_LAUNCH_* e a precedência dele, e o guia de traces traz os códigos de entrega da execução", () => {
  for (const name of ["docs/traces.md", "docs/privacidade.md", "docs/agent-observation.md"]) {
    const flat = prose(DOCS[name]);
    assert.ok(flat.includes("SKILL_ME_LAUNCH_ROOT") && flat.includes("SKILL_ME_LAUNCH_ID"), `${name}: o par`);
    assert.match(flat, /tem precedência sobre o par [^.]* e sobre o `on`/, `${name}: a precedência`);
  }
  const launch = section(DOCS["docs/traces.md"], "## Execução do `skill-me <agente>` (issue #25)");
  const codes = launch.split("\n").filter((line) => line.startsWith("| `")).map((line) => line.slice(1).split(" | ")[0].trim().replaceAll("`", ""));
  assert.deepEqual(codes, LAUNCH_CODES);
  assert.match(prose(DOCS["docs/privacidade.md"]), /`SKILL_ME_LAUNCH_ROOT`\/`SKILL_ME_LAUNCH_ID` só aponta para a execução que `skill-me <agente>` abriu/);
});
