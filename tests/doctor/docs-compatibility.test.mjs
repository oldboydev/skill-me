// C17 — documentação pura, mas parte da mesma entrega de comportamento:
// o README ensina a rodar a CLI e a ler os três estados; a documentação de
// compatibilidade registra fonte, data, versão/superfície, evidência e
// lacunas, separando contrato documentado, inspeção estática e execução real.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..", "..");

test("docs-C17 README ensina a invocação e a leitura de partial/unverified/identityVerified", () => {
  const readme = readFileSync(path.join(root, "README.md"), "utf8");
  assert.match(readme, /npm run --silent doctor -- --json/);
  assert.match(readme, /partial/);
  assert.match(readme, /unverified/);
  assert.match(readme, /identityVerified[^\n]*false/);
});

test("docs-C17 documentação de compatibilidade registra fonte, data, versão/superfície, evidência e lacunas", () => {
  const doc = readFileSync(
    path.join(root, "docs", "agent-compatibility.md"),
    "utf8",
  );
  for (const column of [
    /fonte/i,
    /data de consulta/i,
    /vers[ãa]o\s*\/?\s*superf[íi]cie/i,
    /evid[êe]ncia/i,
    /lacuna/i,
  ])
    assert.match(doc, column);
});

test("docs-C17 documentação separa contrato documentado, inspeção estática e execução real", () => {
  const doc = readFileSync(
    path.join(root, "docs", "agent-compatibility.md"),
    "utf8",
  );
  assert.match(doc, /contrato documentado/i);
  assert.match(doc, /inspe[çc][ãa]o est[áa]tica/i);
  assert.match(doc, /execu[çc][ãa]o real/i);
});
