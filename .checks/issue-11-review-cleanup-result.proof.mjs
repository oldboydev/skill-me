// Prova complementar da issue #11: hashes dos cinco arquivos comuns, escopo da
// entrega e o caso "blocked" da tabela C11, que o core aprovado no ERP não cobre
// com um teste próprio na CLI (só prova ready/changes_requested).
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseCommit = "3b6387615aa9233fe89771782fd8e0948042cdac";

const expectedHashes = {
  "scripts/code-review/review.mjs": "c51cff675f6472b9e2ffa02eaa03cd80f3d48dad",
  "scripts/code-review/review.test.mjs": "6495b4d3d61db91c5896e7efc919880237f4b572",
  "scripts/code-review/README.md": "711a7161c58ea65dd8dd6a6148d8ef3948d4f2eb",
  "scripts/code-review/cli.mjs": "c6a4abcd52cf140f64b596136080f36d066b1ee8",
  "scripts/code-review/schema.json": "b02001e2b10df2e46b244490ee3cf5ae1b410694",
};

function hashObject(cwd, relativePath) {
  return execFileSync("git", ["hash-object", relativePath], {
    cwd,
    encoding: "utf8",
  }).trim();
}

console.log("== C8: hashes dos cinco arquivos comuns no checkout (AC5) ==");
for (const [path, expected] of Object.entries(expectedHashes)) {
  const actual = hashObject(repoRoot, path);
  assert.equal(actual, expected, `${path}: esperado ${expected}, achou ${actual}`);
  console.log(`OK ${path} = ${actual}`);
}

console.log("\n== C10: escopo da entrega contra a base fixa ==");
const diffOutput = execFileSync("git", ["diff", "--name-only", baseCommit], {
  cwd: repoRoot,
  encoding: "utf8",
}).trim();
const changed = diffOutput ? diffOutput.split("\n") : [];

const statusOutput = execFileSync(
  "git",
  ["status", "--porcelain", "--untracked-files=all"],
  { cwd: repoRoot, encoding: "utf8" },
).trim();
const untracked = statusOutput
  ? statusOutput
      .split("\n")
      .filter((line) => line.startsWith("??"))
      .map((line) => line.slice(3).trim())
  : [];

const touched = [...new Set([...changed, ...untracked])];
assert.ok(touched.length > 0, "Esperava arquivos alterados ou novos para a issue 11.");

const allowlist = new Set([
  "scripts/code-review/review.mjs",
  "scripts/code-review/review.test.mjs",
  "scripts/code-review/README.md",
  ".tasks/issue-11-review-cleanup-result.md",
]);
const isAllowed = (path) =>
  allowlist.has(path) || path.startsWith(".checks/issue-11-review-cleanup-result");

for (const path of touched) {
  assert.ok(isAllowed(path), `Arquivo fora do escopo autorizado: ${path}`);
  console.log(`OK no escopo: ${path}`);
}
assert.ok(
  !touched.includes("scripts/code-review/cli.mjs") &&
    !touched.includes("scripts/code-review/schema.json"),
  "cli.mjs e schema.json não deveriam mudar nesta entrega.",
);
console.log("OK cli.mjs e schema.json seguem fora do diff e do untracked.");

console.log('\n== C3: prova complementar do status "blocked" em cópia isolada ==');
const scratchPrefix = "skill-me-issue11-proof-";
const scratchRoot = mkdtempSync(join(tmpdir(), scratchPrefix));
function assertWithinScratch(path) {
  const within = relative(resolve(tmpdir()), resolve(path));
  assert.ok(
    within.startsWith(scratchPrefix) && !within.includes("..") && !within.includes(sep),
    `Caminho fora da pasta temporária esperada: ${path}`,
  );
}
assertWithinScratch(scratchRoot);

try {
  const coreFiles = [
    "scripts/code-review/review.mjs",
    "scripts/code-review/cli.mjs",
    "scripts/code-review/schema.json",
  ];
  for (const relPath of coreFiles) {
    const destName = relPath.split("/").pop();
    writeFileSync(join(scratchRoot, destName), readFileSync(join(repoRoot, relPath)));
    const actual = hashObject(scratchRoot, destName);
    assert.equal(actual, expectedHashes[relPath], `Cópia de ${destName} divergiu do checkout.`);
    console.log(`OK cópia ${destName} = ${actual}`);
  }

  // Normaliza CRLF->LF só no texto copiado ao scratch: um checkout com
  // core.autocrlf=true converte o blob LF do Git para CRLF na working tree,
  // e a âncora abaixo usa quebras LF literais para casar com o fonte do ERP.
  const testSource = readFileSync(
    join(repoRoot, "scripts/code-review/review.test.mjs"),
    "utf8",
  ).replace(/\r\n/g, "\n");
  const anchor =
    'for (const [status, code] of [\n  ["ready", 0],\n  ["changes_requested", 2],\n])';
  const occurrences = testSource.split(anchor).length - 1;
  assert.equal(occurrences, 1, "A âncora da tabela C11 deve aparecer exatamente uma vez.");
  const replacement =
    'for (const [status, code] of [\n  ["ready", 0],\n  ["changes_requested", 2],\n  ["blocked", 2],\n])';
  const patchedTest = testSource.replace(anchor, replacement);
  writeFileSync(join(scratchRoot, "review.test.mjs"), patchedTest);
  console.log('OK âncora única substituída: tabela C11 agora inclui ["blocked", 2].');

  const expectedTestName =
    "C11 comando com limpeza falha imprime o relatório blocked, sai com 2 e avisa a pasta no stderr";
  const run = spawnSync(
    process.execPath,
    [
      "--test",
      "--test-reporter=spec",
      "--test-reporter-destination=stdout",
      `--test-name-pattern=${expectedTestName}`,
      "review.test.mjs",
    ],
    { cwd: scratchRoot, encoding: "utf8" },
  );

  const lines = run.stdout.split(/\r?\n/).map((line) => line.trim());
  assert.ok(
    lines.some((line) => line.startsWith(`✔ ${expectedTestName}`)),
    `Teste complementar não apareceu como aprovado:\n${run.stdout}\n${run.stderr}`,
  );
  assert.ok(lines.includes("ℹ tests 1"), `Esperava 1 teste executado:\n${run.stdout}`);
  assert.ok(lines.includes("ℹ pass 1"), `Esperava 1 aprovação:\n${run.stdout}`);
  assert.ok(lines.includes("ℹ fail 0"), `Esperava 0 falhas:\n${run.stdout}`);
  assert.equal(run.status, 0, "node --test deveria sair com 0 para o caso blocked.");
  console.log(`OK ${expectedTestName}`);
  console.log("OK node --test saiu com 0, 1 pass, 0 fail.");
} finally {
  assertWithinScratch(scratchRoot);
  rmSync(scratchRoot, { recursive: true, force: true });
}

console.log("\n== Simulações declaradas ==");
console.log(
  "- deps.cleanup (falha de limpeza) e deps.execute (resultado do revisor) são dublês, iguais aos da suíte oficial C10/C11.",
);
console.log(
  "- Nenhuma pasta ocupada real do Windows nem chamada de IA/Codex foi usada nesta prova.",
);
console.log(
  "- A suíte oficial de 16 casos não muda: este script roda 1 teste extra em cópia isolada, sem tocar nos arquivos vendorizados.",
);

console.log("\nTODAS AS PROVAS DO proof.mjs PASSARAM.");
