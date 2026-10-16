import { readFileSync } from "node:fs";
import path from "node:path";

export const FIXTURES_DIR = path.resolve(import.meta.dirname, "..", "fixtures");

export function loadFixture(name) {
  return JSON.parse(readFileSync(path.join(FIXTURES_DIR, name), "utf8"));
}

export function fixtureCase(fixtureName, caseName) {
  const found = loadFixture(fixtureName).cases.find((c) => c.name === caseName);
  if (!found) throw new Error(`caso de fixture inexistente: ${fixtureName}/${caseName}`);
  return found;
}

// Todos os marcadores de conteúdo proibido usados pelas fixtures; qualquer
// ocorrência em saída do debugger é vazamento.
export const CANARY_PATTERN = /SKILLME-CANARY-[a-z]+/;
