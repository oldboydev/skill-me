import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { ONE_MIB_BYTES } from "../../../src/doctor/config-projection.mjs";
import { HOOK_STDIN_DEADLINE_MS } from "../../../src/integrations/hook-command.mjs";
import { STREAM_MAX_LINE_BYTES } from "../../../src/integrations/line-reader.mjs";
import { PRIVACY_HELP_TEXT } from "../../../src/integrations/privacy/args.mjs";
import { FOLLOW_LOCK_PATIENCE_MS, FOLLOW_POLL_MS } from "../../../src/integrations/privacy/follow.mjs";
import { INGEST_AGENTS } from "../../../src/integrations/privacy/ingest.mjs";
import { PRIVACY_LIMITS } from "../../../src/integrations/privacy/lifecycle.mjs";
import { LIST_PAGE_SIZE } from "../../../src/integrations/privacy/store.mjs";
import { CAPTURE_ID_ENV, CAPTURE_ROOT_ENV } from "../../../src/integrations/traces/binding.mjs";
import { CAPTURE_REPORT_ENV } from "../../../src/integrations/traces/delivery-report.mjs";
import { DELIVERY_CODES, DELIVERY_DEADLINE_MS } from "../../../src/integrations/traces/delivery.mjs";
import { REPO_ROOT, baseEnv, makeScratch, runIntegrations } from "../helpers/cli.mjs";
import { claudePayload } from "../helpers/privacy-canaries.mjs";
import { ISO_MS, startCapture, storeDir } from "../helpers/traces.mjs";

// Prova C20 da issue #8: o guia de uso descreve o que o código faz, com os
// números tirados das constantes que o código usa, e só declara comprovado o
// que foi executado (build.md da entrega). O diagnóstico de entrega é seguido
// como o guia manda e comparado com o que o hook realmente grava.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

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

// Linhas da tabela da seção cuja primeira coluna se chama `header` (a seção
// "Falhas de entrega" tem a tabela de campos e a de códigos).
function tableByHeader(text, header) {
  const tables = [];
  let current = null;
  for (const line of text.split("\n")) {
    if (!line.startsWith("|")) current = null;
    else if (current === null) tables.push((current = [line]));
    else current.push(line);
  }
  const table = tables.find((lines) => cells(lines[0])[0] === header);
  assert.ok(table, `tabela ausente: ${header}`);
  return table.slice(2).map(cells);
}

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
  const codes = tableByHeader(section(GUIDE, "Falhas de entrega"), "Código").map(([code]) => code.replaceAll("`", ""));
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

const flatKeys = (value, prefix = "") =>
  Object.entries(value).flatMap(([key, child]) => (child !== null && typeof child === "object" ? flatKeys(child, `${prefix}${key}.`) : [`${prefix}${key}`]));

test("T8-C20 trace documentation contract: o guia diz onde o usuário lê o diagnóstico de entrega, e o exemplo é o que um hook com lock ocupado grava", () => {
  assert.ok(section(GUIDE, "Configuração explícita da captura").includes(CAPTURE_REPORT_ENV), "configuração aponta o diagnóstico");
  const failures = section(GUIDE, "Falhas de entrega");

  // Configurar e ler: a mesma variável do código, caminho absoluto com espaço e
  // acento, e o comando de leitura aponta para o arquivo configurado.
  const winPath = new RegExp(`\\$env:${CAPTURE_REPORT_ENV} = "([^"]+)"`).exec(failures)?.[1];
  const posixPath = new RegExp(`export ${CAPTURE_REPORT_ENV}="([^"]+)"`).exec(failures)?.[1];
  assert.ok(winPath && path.win32.isAbsolute(winPath) && / /.test(winPath) && /[^\x00-\x7f]/.test(winPath), "PowerShell: caminho absoluto com espaço e acento");
  assert.ok(posixPath && path.posix.isAbsolute(posixPath) && / /.test(posixPath) && /[^\x00-\x7f]/.test(posixPath), "bash: caminho absoluto com espaço e acento");
  assert.ok(failures.includes(`Get-Content "${winPath}"`), "leitura no PowerShell");
  assert.ok(failures.includes(`cat "${posixPath}"`), "leitura no bash");

  // Regras que o guia promete e a prova C16 exercita.
  const prose = failures.replace(/\s+/g, " ");
  for (const pattern of [
    /Uma entrega confirmada não escreve nada: arquivo ausente ou sem linhas quer dizer nenhuma falha registrada/,
    /não traz caminho, valor de variável, payload, mensagem de erro nem stack/,
    /Sem o par do vínculo, `SKILL_ME_CAPTURE_REPORT` sozinha não escreve, e um caminho relativo é ignorado/,
    /o diagnóstico se perde e nada muda para o agente/,
    /`delete` e `prune` não o apagam/,
  ])
    assert.match(prose, pattern);

  // Campos: a tabela tem exatamente as chaves da linha; `agent` lista os produtores do lote.
  const example = failures.split("\n").find((line) => line.startsWith('{"skillMeDeliveryReport"'));
  assert.ok(example, "exemplo de linha");
  const fields = tableByHeader(failures, "Campo");
  assert.deepEqual(fields.map(([name]) => name.replaceAll("`", "")), flatKeys(JSON.parse(example)));
  const agentRow = fields.find(([name]) => name === "`agent`")[1];
  for (const agent of Object.keys(INGEST_AGENTS)) assert.ok(agentRow.includes(`\`${agent}\``), agent);

  // Seguindo o guia: captura, as três variáveis, lock ocupado, hook real.
  const base = makeScratch("t8 c20 guia");
  scratches.push(base);
  const root = path.join(base, "capturas ação");
  mkdirSync(root);
  const id = startCapture(root);
  const file = path.join(base, "diagnóstico de entrega.ndjson");
  writeFileSync(path.join(storeDir(root), ".lock"), "lock alheio\n");
  const run = runIntegrations(["hook", "--agent", "claude"], {
    env: baseEnv({ [CAPTURE_ROOT_ENV]: root, [CAPTURE_ID_ENV]: id, [CAPTURE_REPORT_ENV]: file }),
    input: JSON.stringify(claudePayload("pre_tool_bash")),
  });
  assert.deepEqual([run.status, run.stdout, run.stderr], [0, "", ""]);
  const written = readFileSync(file, "utf8");
  assert.ok(written.endsWith("\n") && written.split("\n").length === 2, "uma linha");
  const at = JSON.parse(written).at;
  assert.match(at, ISO_MS);
  assert.equal(written, example.replace('"<id>"', JSON.stringify(id)).replace(/"at":"[^"]+"/, `"at":"${at}"`) + "\n", "o exemplo do guia, a menos do ID e do instante");
});
