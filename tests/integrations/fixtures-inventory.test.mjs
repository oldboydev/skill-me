import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { parse } from "yaml";
import { INTEGRATION_TESTS, MAX_PARALLEL_FILES, testArgs, testConcurrency } from "../../scripts/test-integrations.mjs";
import { REPO_ROOT, makeScratch } from "./helpers/cli.mjs";
import { FIXTURES_DIR } from "./helpers/fixtures.mjs";

const CONTRACTS = ["claude-code-hooks@docs-2026-10-16", "codex-hooks@rust-v0.162.1", "codex-exec-jsonl@rust-v0.162.1", "hermes-plugin-hooks@0.21.4"];

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

test("I4-C40 fixtures sintéticas declaram origem, contrato e fonte, com casos válidos e inválidos", () => {
  const files = filesUnder(FIXTURES_DIR);
  const dataFiles = files.filter((file) => path.dirname(file) === FIXTURES_DIR && file.endsWith(".json"));
  const seen = new Set();
  for (const file of dataFiles) {
    const fixture = JSON.parse(readFileSync(file, "utf8"));
    const label = path.basename(file);
    assert.equal(fixture.origin, "synthetic", label);
    assert.ok(CONTRACTS.includes(fixture.contract), `${label}: ${fixture.contract}`);
    assert.ok(typeof fixture.source === "string" && fixture.source.length > 20, label);
    assert.ok(fixture.cases.some((c) => c.valid === true), `${label}: caso válido`);
    assert.ok(fixture.cases.some((c) => c.valid === false), `${label}: caso inválido`);
    assert.ok(fixture.cases.every((c) => typeof c.name === "string" && typeof c.valid === "boolean"), label);
    seen.add(fixture.contract);
  }
  assert.deepEqual([...seen].sort(), [...CONTRACTS].sort(), "cada contrato tem fixture");
  // Fixtures executáveis (scripts, plugins de teste) se declaram sintéticas.
  for (const file of files.filter((f) => /\.(mjs|py)$/.test(f))) {
    const head = readFileSync(file, "utf8").split("\n").slice(0, 3).join("\n");
    assert.match(head, /[Ff]ixture sintética/, path.relative(FIXTURES_DIR, file));
  }
  for (const file of files.filter((f) => f.endsWith("plugin.yaml"))) {
    assert.match(parse(readFileSync(file, "utf8")).description, /Fixture sintética/, path.relative(FIXTURES_DIR, file));
  }
});

test("I4-C47 a suíte de integrações faz parte do npm test e da CI", () => {
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  assert.equal(pkg.private, true);
  // O lançador roda `node --test` com este mesmo glob (G1 da #23, prova abaixo).
  assert.equal(pkg.scripts["test:integrations"], "node scripts/test-integrations.mjs");
  assert.equal(INTEGRATION_TESTS, "tests/integrations/**/*.test.mjs");
  assert.ok(pkg.scripts.test.split("&&").map((s) => s.trim()).includes("npm run test:integrations"));
  assert.equal(pkg.scripts.integrations, "node src/integrations/cli.mjs");
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), ["smol-toml"], "nenhuma dependência nova");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}), ["yaml"]);
  const workflow = parse(readFileSync(path.join(REPO_ROOT, ".github", "workflows", "governance.yml"), "utf8"));
  assert.ok(workflow.jobs.verify.steps.some((step) => step.run === "npm run test:integrations"));
});

// Lançador da suíte (G1 da issue #23): no máximo 8 arquivos em paralelo, o
// padrão do Node (núcleos lógicos menos um) abaixo disso, e o código de saída do
// próprio `node --test`, com o mesmo glob.
test("I23 suíte de integrações com no máximo 8 arquivos em paralelo: o lançador só reduz o padrão do Node e devolve o resultado da suíte", () => {
  assert.equal(MAX_PARALLEL_FILES, 8);
  assert.deepEqual([1, 2, 3, 4, 9, 10, 32, 128].map((available) => testConcurrency(available)), [1, 1, 2, 3, 8, 8, 8, 8]);
  assert.deepEqual(testArgs(3), ["--test", "--test-concurrency=3", "tests/integrations/**/*.test.mjs"]);

  // Um `node --test` dentro de um teste herdaria o canal do runner externo.
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  const outcomes = [];
  for (const [label, body] of [["passa", "test('passa', () => {});"], ["falha", "test('falha', () => { throw new Error('falha esperada'); });"]]) {
    const dir = makeScratch(`i23 lançador ${label}`);
    try {
      mkdirSync(path.join(dir, "tests", "integrations", "sub"), { recursive: true });
      writeFileSync(path.join(dir, "tests", "integrations", "sub", "um.test.mjs"), `import test from "node:test";\n${body}\n`);
      // Fora do glob: se rodasse, a suíte falharia.
      writeFileSync(path.join(dir, "tests", "integrations", "apoio.mjs"), "throw new Error('fora do glob');\n");
      const run = spawnSync(process.execPath, [path.join(REPO_ROOT, "scripts", "test-integrations.mjs")], { cwd: dir, env, encoding: "utf8", timeout: 60_000 });
      outcomes.push([label, run.status, /^ℹ tests 1$/m.test(run.stdout) || /^# tests 1$/m.test(run.stdout)]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  assert.deepEqual(outcomes, [
    ["passa", 0, true],
    ["falha", 1, true],
  ]);
});
