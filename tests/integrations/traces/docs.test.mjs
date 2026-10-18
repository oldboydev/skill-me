import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { ONE_MIB_BYTES } from "../../../src/doctor/config-projection.mjs";
import { HOOK_STDIN_DEADLINE_MS } from "../../../src/integrations/hook-command.mjs";
import { STREAM_MAX_LINE_BYTES } from "../../../src/integrations/line-reader.mjs";
import { PRIVACY_HELP_TEXT } from "../../../src/integrations/privacy/args.mjs";
import { FOLLOW_LOCK_PATIENCE_MS, FOLLOW_POLL_MS } from "../../../src/integrations/privacy/follow.mjs";
import { PRIVACY_LIMITS } from "../../../src/integrations/privacy/lifecycle.mjs";
import { LIST_PAGE_SIZE } from "../../../src/integrations/privacy/store.mjs";
import { CAPTURE_ID_ENV, CAPTURE_ROOT_ENV } from "../../../src/integrations/traces/binding.mjs";
import { DELIVERY_CODES, DELIVERY_DEADLINE_MS } from "../../../src/integrations/traces/delivery.mjs";
import { REPO_ROOT } from "../helpers/cli.mjs";

// Prova C20 da issue #8: o guia de uso descreve o que o código faz, com os
// números tirados das constantes que o código usa, e só declara comprovado o
// que foi executado (build.md da entrega).

const read = (rel) => readFileSync(path.join(REPO_ROOT, rel), "utf8").replaceAll("\r\n", "\n");
const GUIDE = read("docs/traces.md");
const BUILD = read(".checks/issue-8-traces.build.md");
const PKG = JSON.parse(read("package.json"));

function section(text, title) {
  const start = text.indexOf(`\n## ${title}\n`);
  assert.ok(start >= 0, `seção ausente: ${title}`);
  const rest = text.slice(start + title.length + 5);
  const next = rest.indexOf("\n## ");
  return next === -1 ? rest : rest.slice(0, next);
}
const cells = (line) => line.slice(1, -1).split(" | ").map((cell) => cell.trim());
const tableRows = (text) => text.split("\n").filter((line) => line.startsWith("|")).slice(2).map(cells);

test("T8-C20 trace documentation contract: Node >=24, uso local com espaço e Unicode, configuração explícita, limites, códigos, retenção e capacidades demonstradas", () => {
  // Requisitos: os do package.json.
  assert.equal(PKG.engines.node, ">=24");
  assert.equal(PKG.private, true);
  const requirements = section(GUIDE, "Requisitos");
  assert.match(requirements, /Node\.js >= 24/);
  assert.match(requirements, /privado \(`"private": true`\)/);

  // Configuração explícita: as duas variáveis do código, raiz absoluta, exemplo com espaço e acento.
  const config = section(GUIDE, "Configuração explícita da captura");
  for (const name of [CAPTURE_ROOT_ENV, CAPTURE_ID_ENV]) assert.ok(config.includes(name), name);
  assert.match(config, /privacy start --root "[^"]* [^"]*"/, "exemplo com espaço entre aspas");
  assert.ok(/privacy start --root "[^"]*[^\x00-\x7f][^"]*"/.test(config), "exemplo com Unicode");
  assert.match(config, /precisa ser absoluta/);
  assert.match(config, /Só o par completo escolhe uma captura/);
  assert.match(config, /`binding_invalid`/);
  assert.match(config, /não criam captura nem ligam conteúdo/);

  // Comandos de consulta como o help os aceita.
  for (const usage of ["privacy list   --root <diretório> [--after <id>]", "privacy follow --root <diretório> --capture <id>", "privacy export --root <diretório> --capture <id>"]) {
    assert.ok(section(GUIDE, "Consultar").includes(usage), usage);
    assert.ok(PRIVACY_HELP_TEXT.includes(usage.replace(/ +/g, " ")), `help: ${usage}`);
  }
  assert.ok(PRIVACY_HELP_TEXT.includes("docs/traces.md"));

  // Limites: cada valor vem da constante usada pelo código.
  const limits = Object.fromEntries(tableRows(section(GUIDE, "Limites")).map(([name, value]) => [name, value]));
  const MIB = 1024 * 1024;
  assert.deepEqual(limits, {
    "registros por captura": String(PRIVACY_LIMITS.maxEvents),
    "dados por captura": `${PRIVACY_LIMITS.maxBytes / MIB} MiB`,
    "linha nativa do ingest e do wrapper": `${STREAM_MAX_LINE_BYTES / 1024} KiB`,
    "entrada de hook": `${ONE_MIB_BYTES / MIB} MiB`,
    "stdin de hook": `${HOOK_STDIN_DEADLINE_MS / 1000} s`,
    "entrega de um evento": `${DELIVERY_DEADLINE_MS} ms depois de lido`,
    "página do `list`": `${LIST_PAGE_SIZE} capturas`,
    "sondagem do `follow`": `${FOLLOW_POLL_MS} ms`,
    "lock ocupado no `follow`": `${FOLLOW_LOCK_PATIENCE_MS / 1000} s seguidos`,
  });

  // Códigos de entrega: exatamente o vocabulário fechado do código.
  const codes = tableRows(section(GUIDE, "Falhas de entrega")).map(([code]) => code.replaceAll("`", ""));
  assert.deepEqual(codes, [...DELIVERY_CODES]);
  assert.match(section(GUIDE, "Falhas de entrega"), /nunca é reenviado/);

  // Códigos de saída, retenção e exclusão.
  const exits = section(GUIDE, "Códigos de saída").replace(/\s+/g, " ");
  assert.match(exits, /0 concluído; 2 uso inválido; 3 estado ou formato inválido ou ausente; 4 conflito, lock ocupado ou isolamento; 5 falha de E\/S/);
  assert.match(exits, /`hook` e `ingest` sempre saem com 0/);
  const retention = section(GUIDE, "Retenção e exclusão").replace(/\s+/g, " ");
  for (const pattern of [/não há daemon/, /`privacy prune --root <diretório> --apply`/, /só apagam com `--apply`/, /ativa nunca é apagada/, /não volta/]) assert.match(retention, pattern);

  // Capacidades: o que foi demonstrado existe; nada anuncia execução real de modelo.
  const capabilities = section(GUIDE, "Capacidades demonstradas");
  assert.ok(existsSync(path.join(REPO_ROOT, "tests", "integrations", "traces", "demo.e2e.test.mjs")));
  assert.match(capabilities, /Não demonstrado: sessões reais do Claude, do Codex ou do Hermes com modelo \(E2E\s+pendente/);
  assert.match(capabilities, /Nenhuma prova executa um modelo\./);
  assert.ok(!/modelo (real )?(foi )?executado|execução real (de|do) modelo|E2E (real )?(aprovado|executado)/i.test(GUIDE), "sem anúncio de execução real");

  // Plataformas: só as que têm execução verde registrada no build.md.
  const listed = section(GUIDE, "Plataformas comprovadas").split("\n").filter((line) => line.startsWith("- ")).map((line) => line.slice(2).trim());
  assert.ok(listed.length > 0);
  const executed = tableRows(section(BUILD, "Execuções"))
    .filter(([, , result]) => /\d+ pass/.test(result) && /\b0 fail/.test(result))
    .map(([platform]) => platform);
  for (const platform of listed) assert.ok(executed.some((row) => row.startsWith(platform)), `${platform} sem execução verde no build.md`);
  for (const platform of ["macOS", "Linux nativo"]) {
    if (!executed.some((row) => row.startsWith(platform))) assert.ok(!listed.some((p) => p.startsWith(platform)), `${platform} não executado não pode ser listado`);
  }
});
