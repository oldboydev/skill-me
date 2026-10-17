import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { REPO_ROOT } from "./helpers/cli.mjs";

// Checkout no Windows com core.autocrlf traz CRLF; o conteúdo é o mesmo.
const GUIDE = readFileSync(path.join(REPO_ROOT, "docs", "agent-observation.md"), "utf8").replaceAll("\r\n", "\n");

// Linhas da primeira tabela depois do cabeçalho `## <título>`, como arrays de células.
function table(title) {
  const start = GUIDE.indexOf(`\n## ${title}\n`);
  assert.ok(start >= 0, `seção ausente: ${title}`);
  const rest = GUIDE.slice(start + title.length + 5);
  const next = rest.indexOf("\n## ");
  const section = next === -1 ? rest : rest.slice(0, next);
  const rows = section.split("\n").filter((line) => line.startsWith("|"));
  assert.ok(rows.length >= 3, `tabela ausente: ${title}`);
  const [header, , ...body] = rows;
  const cells = (line) => line.slice(1, -1).split(" | ").map((cell) => cell.trim());
  return { header: cells(header), rows: body.map(cells) };
}

test("I4-C6 caminhos de skill classificados por agente, com fonte", () => {
  const { header, rows } = table("Caminhos de uso de skill");
  assert.deepEqual(header, ["Agente", "Caminho", "Classificação", "Fonte"]);
  const expected = [
    ["Claude", /^agente — ferramenta `Skill`/, "contrato+fixture", /code\.claude\.com\/docs\/en\/hooks/],
    ["Claude", /^direto — `\/nome` \(`UserPromptExpansion`/, "contrato+fixture", /code\.claude\.com\/docs\/en\/hooks/],
    ["Codex", /^início de skill$/, "indisponível", /rust-v0\.162\.1/],
    ["Hermes", /^`on_skill_lifecycle`/, "nativo local", /Hermes 0\.21\.4/],
  ];
  assert.equal(rows.length, expected.length);
  for (const [index, [agent, pathPattern, classification, source]] of expected.entries()) {
    const [a, p, c, s] = rows[index];
    assert.equal(a, agent);
    assert.match(p, pathPattern);
    assert.equal(c, classification);
    assert.match(s, source);
  }
  for (const [, , classification] of rows) assert.ok(["contrato+fixture", "nativo local", "pendente", "indisponível"].includes(classification));
});

test("I4-C9 hosted tools do Codex declaradas sem cobertura", () => {
  const { rows } = table("Cobertura por mecanismo");
  const hosted = rows.filter(([agent, mechanism]) => agent === "Codex" && mechanism.includes("hosted tools"));
  assert.equal(hosted.length, 1);
  assert.match(hosted[0][2], /^sem cobertura/);
  assert.match(hosted[0][3], /learn\.chatgpt\.com\/docs\/hooks/);
  for (const row of rows.filter(([agent, mechanism]) => agent === "Codex" && /hosted|WebSearch/i.test(mechanism)))
    assert.ok(!/observad|assinad|coberto/i.test(row[2]), row.join(" | "));
});

test("I4-C41 evidências separam determinístico, nativo local e E2E; E2E só pendente", () => {
  const { header, rows } = table("Evidências por agente");
  assert.deepEqual(header, ["Agente", "Determinístico", "Nativo local", "E2E real opt-in"]);
  assert.deepEqual(rows.map((row) => row[0]), ["Claude", "Codex", "Hermes"]);
  for (const [agent, deterministic, native, e2e] of rows) {
    assert.match(e2e, /^pendente: .+/, `${agent}: E2E com motivo`);
    assert.ok(!/\bpass\b|aprovad/i.test(e2e), agent);
    assert.ok(deterministic.length > 0 && native.length > 0, agent);
  }
  assert.match(rows[0][2], /^não executado:/);
  assert.match(rows[1][2], /^não executado:/);
  assert.match(rows[2][2], /^executado:/);
});

test("I4-C44c guia não anuncia coletor nem ingestão real", () => {
  assert.match(GUIDE, /Não há coletor nem ingestão real\./);
  assert.match(GUIDE, /nada é gravado\s+nem enviado pelo debugger/);
  for (const forbidden of [/coletor (real )?(ativo|disponível|instalado)/i, /ingestão real (ativa|disponível)/i, /envia(mos)? (os )?(eventos|dados) (para|ao) /i])
    assert.ok(!forbidden.test(GUIDE), String(forbidden));
  const { rows } = table("O que roda onde");
  const hermes = rows.find(([integration]) => integration.startsWith("Plugin Hermes"));
  assert.match(hermes[2], /inativo/);
});
