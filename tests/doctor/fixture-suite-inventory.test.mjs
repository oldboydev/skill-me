// C16 — a suíte registra se a origem de cada cenário é fixture ou
// ambiente real, não contém payloads privados, não alega E2E de captura e
// cobre as três convenções de SO nas fixtures (mesmo quando o executor da
// CI é um único SO).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  FIXTURE_SCENARIOS,
  NO_E2E_CAPTURE_CLAIM,
  NO_PRIVATE_PAYLOAD_CLAIM,
  PLATFORM_PARAMETERIZED_OS_COVERAGE,
} from "./helpers/fixture-manifest.mjs";

const root = path.resolve(import.meta.dirname);

test("fixture-suite-C16 todo cenário declara origem fixture; nenhum alega ambiente real", () => {
  assert.ok(FIXTURE_SCENARIOS.length > 0);
  for (const scenario of FIXTURE_SCENARIOS) {
    assert.equal(scenario.origin, "fixture", scenario.id);
    assert.ok(Array.isArray(scenario.os) && scenario.os.length > 0, scenario.id);
    assert.ok(typeof scenario.file === "string" && scenario.file.length > 0, scenario.id);
  }
});

test("fixture-suite-C16 o arquivo citado por cada cenário existe na suíte", () => {
  for (const scenario of FIXTURE_SCENARIOS) {
    assert.doesNotThrow(
      () => readFileSync(path.join(root, scenario.file)),
      scenario.file,
    );
  }
});

test("fixture-suite-C16 as três convenções de SO (windows, linux, macos) estão cobertas por algum cenário", () => {
  assert.deepEqual(
    [...PLATFORM_PARAMETERIZED_OS_COVERAGE].sort(),
    ["linux", "macos", "windows"],
  );
  const coveredElsewhere = readFileSync(
    path.join(root, "agent-resolution.unit.test.mjs"),
    "utf8",
  );
  for (const platform of ["win32", "linux", "darwin"])
    assert.match(coveredElsewhere, new RegExp(platform));
});

test("fixture-suite-C16 a suíte declara explicitamente que não alega E2E de captura nem payload privado", () => {
  assert.match(NO_E2E_CAPTURE_CLAIM, /not_performed/);
  assert.match(NO_PRIVATE_PAYLOAD_CLAIM, /sintético/);
});
