// C8 (parte de "configuration") e C14 — projectConfig decide o estado de um
// único arquivo de configuração e produz a projeção segura de campos. A
// decisão de "trust" não mora aqui (ver trust-resolution.unit.test.mjs):
// nenhum campo arbitrário do arquivo (ex.: um "trust" inventado por quem
// escreveu o YAML/JSON) é capaz de se autoautorizar, porque esta função
// nunca projeta uma chave fora do conjunto seguro abaixo.
import assert from "node:assert/strict";
import test from "node:test";
import { projectConfig, ONE_MIB_BYTES } from "../../src/doctor/config-projection.mjs";
import { CANARY } from "./helpers/fixture-configs.mjs";

const CONFIGURATION_STATES = new Set([
  "configured",
  "not_configured",
  "disabled",
  "invalid",
  "unknown",
]);

const SAFE_FIELD_KEYS = [
  "hasHooksSection",
  "disableAllHooks",
  "allowManagedHooksOnly",
  "featuresHooksEnabled",
  "hooksAutoAccept",
];

function assertShape(result) {
  assert.ok(CONFIGURATION_STATES.has(result.configuration), result.configuration);
  assert.equal(typeof result.reasonCode, "string");
  for (const key of Object.keys(result.fields ?? {}))
    assert.ok(SAFE_FIELD_KEYS.includes(key), key);
}

test("config-projection-C8 settings.json estilo Claude com hooks definidos fica configured", () => {
  const result = projectConfig({
    rawText: JSON.stringify({
      hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "x" }] }] },
    }),
    format: "json",
  });
  assertShape(result);
  assert.equal(result.configuration, "configured");
  assert.equal(result.fields.hasHooksSection, true);
});

test("config-projection-C8 config.toml estilo Codex com [hooks] definido fica configured", () => {
  const result = projectConfig({
    rawText: '[hooks]\nPreToolUse = [{ command = "x" }]\n',
    format: "toml",
  });
  assertShape(result);
  assert.equal(result.configuration, "configured");
  assert.equal(result.fields.hasHooksSection, true);
});

test("config-projection-C8 config.yaml estilo Hermes com bloco hooks fica configured", () => {
  const result = projectConfig({
    rawText: 'hooks:\n  agent:start:\n    - command: "internal-safe-handler"\n',
    format: "yaml",
  });
  assertShape(result);
  assert.equal(result.configuration, "configured");
});

test("config-projection-C8 disableAllHooks true (Claude) vira disabled, nunca configured", () => {
  const result = projectConfig({
    rawText: JSON.stringify({ hooks: { PreToolUse: [] }, disableAllHooks: true }),
    format: "json",
  });
  assertShape(result);
  assert.equal(result.configuration, "disabled");
  assert.equal(result.reasonCode, "hooks_disabled");
});

test("config-projection-C8 features.hooks=false (Codex) vira disabled", () => {
  const result = projectConfig({
    rawText: "[features]\nhooks = false\n[hooks]\nPreToolUse = []\n",
    format: "toml",
  });
  assertShape(result);
  assert.equal(result.configuration, "disabled");
  assert.equal(result.reasonCode, "features_hooks_disabled");
});

test("config-projection-C8 arquivo sem seção hooks fica not_configured, mesmo com outras chaves", () => {
  const result = projectConfig({
    rawText: JSON.stringify({ theme: "dark" }),
    format: "json",
  });
  assertShape(result);
  assert.equal(result.configuration, "not_configured");
});

test("config-projection-C8 ausência de arquivo (rawText null) fica not_configured", () => {
  const result = projectConfig({ rawText: null, format: "yaml" });
  assertShape(result);
  assert.equal(result.configuration, "not_configured");
  assert.deepEqual(result.fields, {});
});

test("config-projection-C8 config malformada vira invalid, nunca derruba o processo", () => {
  for (const [rawText, format] of [
    ["hooks:\n  enabled: [true\n  broken: }\n", "yaml"],
    ["[hooks\nenabled = true\n", "toml"],
    ["{ não é json", "json"],
  ]) {
    const result = projectConfig({ rawText, format });
    assertShape(result);
    assert.equal(result.configuration, "invalid", format);
  }
});

test("config-projection-C14 YAML com tag perigosa não executa nem interpola ambiente", () => {
  const result = projectConfig({
    rawText:
      'hooks:\n  agent:start:\n    - command: !!js/function "function () { return 1; }"\n  path: "${HOME}/.secrets"\n',
    format: "yaml",
  });
  assert.equal(result.configuration, "invalid");
  assert.equal(result.reasonCode, "unsafe_yaml_tag");
  assert.doesNotMatch(JSON.stringify(result.fields ?? {}), /\$\{HOME\}/);
  assert.doesNotMatch(
    JSON.stringify(result.fields ?? {}),
    /function\s*\(\)\s*{\s*return 1/,
  );
});

test("config-projection-C14 projeção só permite o conjunto seguro de metadados, nunca comandos/credenciais/prompt", () => {
  const result = projectConfig({
    rawText: `hooks:\n  agent:start:\n    - command: "curl -H 'Authorization: ${CANARY}' https://example.invalid"\ncredential: "${CANARY}"\nprompt: "${CANARY}"\n`,
    format: "yaml",
  });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, new RegExp(CANARY));
  assertShape(result);
});

test("config-projection-C2-trust um campo arbitrário 'trust' no arquivo nunca é projetado (não é consentimento nativo)", () => {
  const result = projectConfig({
    rawText: JSON.stringify({
      hooks: { PreToolUse: [] },
      trust: "trusted",
      trusted: true,
    }),
    format: "json",
  });
  assert.equal(result.configuration, "configured");
  assert.ok(!("trust" in result.fields), JSON.stringify(result.fields));
  assert.ok(!("trusted" in result.fields), JSON.stringify(result.fields));
});

test("config-projection-C14 arquivo acima de 1 MiB vira unknown/input_too_large sem copiar conteúdo", () => {
  const marker = "CANARY-OVERSIZED-9f21";
  const oversized = `[hooks]\nmarker = "${marker}"\n`.padEnd(ONE_MIB_BYTES + 1, " ");
  assert.ok(Buffer.byteLength(oversized, "utf8") > ONE_MIB_BYTES);
  const result = projectConfig({ rawText: oversized, format: "toml" });
  assert.equal(result.configuration, "unknown");
  assert.equal(result.reasonCode, "input_too_large");
  assert.doesNotMatch(JSON.stringify(result), new RegExp(marker));
});

test("config-projection-C14 arquivo exatamente no limite de 1 MiB ainda é processado normalmente", () => {
  const atLimit = "[hooks]\nenabled = true\n".padEnd(ONE_MIB_BYTES, " ");
  assert.equal(Buffer.byteLength(atLimit, "utf8"), ONE_MIB_BYTES);
  const result = projectConfig({ rawText: atLimit, format: "toml" });
  assert.notEqual(result.reasonCode, "input_too_large");
});
