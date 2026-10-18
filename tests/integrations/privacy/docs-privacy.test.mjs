import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { CONTENT_TABLE } from "../../../src/integrations/privacy/content.mjs";
import { REPO_ROOT } from "../helpers/cli.mjs";

const read = (rel) => readFileSync(path.join(REPO_ROOT, rel), "utf8").replaceAll("\r\n", "\n");
const GUIDE = read("docs/privacidade.md");
const BUILD = read(".checks/issue-5-privacidade.build.md");

function section(text, title) {
  const start = text.indexOf(`\n## ${title}\n`);
  assert.ok(start >= 0, `seção ausente: ${title}`);
  const rest = text.slice(start + title.length + 5);
  const next = rest.indexOf("\n## ");
  return next === -1 ? rest : rest.slice(0, next);
}

const cells = (line) => line.slice(1, -1).split(" | ").map((cell) => cell.trim());
const code = (value) => `\`${value}\``;

test("I5-C34 guia traz a matriz idêntica a CONTENT_TABLE, defaults, limites, códigos, prune manual, canais nativos e a ressalva da detecção", () => {
  const rows = section(GUIDE, "Matriz de conteúdo").split("\n").filter((line) => line.startsWith("|"));
  const [header, , ...body] = rows;
  assert.deepEqual(cells(header), ["Contrato", "Eventos", "Ferramenta", "Campo", "Papel", "Tipo", "Condição"]);
  const expected = CONTENT_TABLE.map((row) => [
    code(row.contract),
    row.events.map(code).join(", "),
    code(row.tool),
    code(row.field),
    row.role,
    row.kind,
    row.when ? Object.entries(row.when).map(([k, v]) => `${code(k)} = ${code(v)}`).join(", ") : "—",
  ]);
  assert.deepEqual(body.map(cells), expected);

  const text = GUIDE.replace(/\s+/g, " ");
  for (const pattern of [
    /conteúdo começa desligado em cada captura/i,
    /retenção padrão de 7 dias/i,
    /`--retention-days` aceita inteiros de 1 a 365/,
    /1 MiB/,
    /64 KiB/,
    /4096 bytes/,
    /8192 bytes/,
    /profundidade máxima 8/,
    /128 membros/,
    /500 eventos/,
    /8 MiB/,
    /não há daemon/i,
    /`privacy prune --root <diretório> --apply`/,
    /stdout e stderr nativos do agente supervisionado são repassados/i,
    /não são exportação sanitizada do debugger/i,
    /A detecção por padrões não é garantia universal/,
  ]) assert.match(text, pattern);
  for (const omission of ["content_disabled", "unsupported_content", "unsanitizable", "sensitive_removed", "content_truncated", "privacy_failure"]) {
    assert.ok(GUIDE.includes(code(omission)), omission);
  }
  assert.ok(!/garant(e|imos) (que )?(nenhum|todo)/i.test(text), "sem promessa de detecção universal");
});

test("I5-C35 o guia lista como comprovadas só as plataformas com execução real registrada no build.md", () => {
  const listed = section(GUIDE, "Plataformas comprovadas")
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
  assert.ok(listed.length > 0);
  const executed = section(BUILD, "Execuções do lote D1")
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("| ---") && !line.startsWith("| Plataforma"))
    .map((line) => cells(line))
    .filter(([, , result]) => /\d+ pass/.test(result) && /0 fail/.test(result))
    .map(([platform]) => platform);
  for (const platform of listed) assert.ok(executed.some((row) => row.startsWith(platform)), `${platform} sem execução real verde no build.md`);
  for (const platform of ["macOS", "Linux nativo"]) {
    if (!executed.some((row) => row.startsWith(platform))) assert.ok(!listed.some((p) => p.startsWith(platform)), `${platform} não executado não pode ser listado`);
  }
});
