import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { parse } from "yaml";
import { REPO_ROOT } from "./helpers/cli.mjs";
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
  assert.equal(pkg.scripts["test:integrations"], 'node --test "tests/integrations/**/*.test.mjs"');
  assert.ok(pkg.scripts.test.split("&&").map((s) => s.trim()).includes("npm run test:integrations"));
  assert.equal(pkg.scripts.integrations, "node src/integrations/cli.mjs");
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), ["smol-toml"], "nenhuma dependência nova");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}), ["yaml"]);
  const workflow = parse(readFileSync(path.join(REPO_ROOT, ".github", "workflows", "governance.yml"), "utf8"));
  assert.ok(workflow.jobs.verify.steps.some((step) => step.run === "npm run test:integrations"));
});
