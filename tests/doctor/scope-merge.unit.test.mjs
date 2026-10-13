// C8 — "considera escopos relevantes e overrides documentados; se política,
// precedência ou decisão de confiança não puderem ser determinadas por
// leitura, usa unknown". mergeConfigScopes combina vários arquivos (ex.:
// Claude tem managed/project local/project shared/user) na ordem real de
// precedência. A política gerenciada do Claude (managed-settings.json em um
// caminho fixo do SO) não pode ser escrita por este teste em /etc ou
// Program Files de forma portátil — por isso é provada aqui, na camada pura,
// com resultados de leitura já estruturados, como as demais permissões
// negadas desta suíte (ver agent-resolution.unit.test.mjs).
import assert from "node:assert/strict";
import test from "node:test";
import { mergeConfigScopes } from "../../src/doctor/scope-merge.mjs";

function hasHooksSection(fields) {
  return fields.hasHooksSection === true;
}

function claudeIsDisabled(fields, scope) {
  if (scope === "managed") {
    if (fields.disableAllHooks === true) return "disabled_by_managed_policy";
    if (fields.allowManagedHooksOnly === true) return "hooks_blocked_by_managed_policy";
    if (fields.disableAllHooks === false) return false;
    return undefined;
  }
  if (fields.disableAllHooks === true) return "hooks_disabled";
  if (fields.disableAllHooks === false) return false;
  return undefined;
}

test("scope-merge-C8 todos os escopos ausentes fica not_configured", () => {
  const result = mergeConfigScopes(
    [
      { scope: "managed", state: "missing" },
      { scope: "user", state: "missing" },
    ],
    { isDisabled: claudeIsDisabled, hasHooks: hasHooksSection },
  );
  assert.equal(result.configuration, "not_configured");
});

test("scope-merge-C8 escopo de usuário com hooks e nada de maior precedência fica configured", () => {
  const result = mergeConfigScopes(
    [
      { scope: "managed", state: "missing" },
      { scope: "project_local", state: "missing" },
      { scope: "project_shared", state: "missing" },
      { scope: "user", state: "parsed", parsed: { hasHooksSection: true } },
    ],
    { isDisabled: claudeIsDisabled, hasHooks: hasHooksSection },
  );
  assert.equal(result.configuration, "configured");
});

test("scope-merge-C8 projeto local com disableAllHooks:false sobrepõe usuário com disableAllHooks:true", () => {
  const result = mergeConfigScopes(
    [
      { scope: "managed", state: "missing" },
      { scope: "project_local", state: "parsed", parsed: { disableAllHooks: false, hasHooksSection: true } },
      { scope: "project_shared", state: "missing" },
      { scope: "user", state: "parsed", parsed: { disableAllHooks: true } },
    ],
    { isDisabled: claudeIsDisabled, hasHooks: hasHooksSection },
  );
  assert.equal(result.configuration, "configured");
});

test("scope-merge-C8 managed com disableAllHooks:true força disabled mesmo com hooks no usuário", () => {
  const result = mergeConfigScopes(
    [
      { scope: "managed", state: "parsed", parsed: { disableAllHooks: true } },
      { scope: "user", state: "parsed", parsed: { hasHooksSection: true } },
    ],
    { isDisabled: claudeIsDisabled, hasHooks: hasHooksSection },
  );
  assert.equal(result.configuration, "disabled");
  assert.equal(result.configReasonCode, "disabled_by_managed_policy");
});

test("scope-merge-C8 managed com allowManagedHooksOnly bloqueia hooks não gerenciados", () => {
  const result = mergeConfigScopes(
    [
      { scope: "managed", state: "parsed", parsed: { allowManagedHooksOnly: true } },
      { scope: "user", state: "parsed", parsed: { hasHooksSection: true } },
    ],
    { isDisabled: claudeIsDisabled, hasHooks: hasHooksSection },
  );
  assert.equal(result.configuration, "disabled");
  assert.equal(result.configReasonCode, "hooks_blocked_by_managed_policy");
});

test("scope-merge-C8 managed ilegível (permissão negada) torna a precedência indeterminável: unknown, nunca trusted por omissão", () => {
  const result = mergeConfigScopes(
    [
      { scope: "managed", state: "unreadable", errorCode: "EACCES" },
      { scope: "user", state: "parsed", parsed: { hasHooksSection: true } },
    ],
    { isDisabled: claudeIsDisabled, hasHooks: hasHooksSection },
  );
  assert.equal(result.configuration, "unknown");
  assert.equal(result.configReasonCode, "policy_precedence_undetermined");
});

test("scope-merge-C8 escopo quebrado de MENOR precedência é ignorado quando os sinais já foram resolvidos antes dele", () => {
  const result = mergeConfigScopes(
    [
      { scope: "managed", state: "missing" },
      { scope: "project_local", state: "parsed", parsed: { disableAllHooks: true } },
      { scope: "user", state: "unreadable", errorCode: "EACCES" },
    ],
    { isDisabled: claudeIsDisabled, hasHooks: hasHooksSection },
  );
  assert.equal(result.configuration, "disabled");
  assert.notEqual(result.configReasonCode, "policy_precedence_undetermined");
});

test("scope-merge-C8 escopo malformado de maior precedência vira invalid, não cai para o próximo escopo", () => {
  const result = mergeConfigScopes(
    [
      { scope: "managed", state: "missing" },
      { scope: "user", state: "invalid", reasonCode: "config_malformed" },
    ],
    { isDisabled: claudeIsDisabled, hasHooks: hasHooksSection },
  );
  assert.equal(result.configuration, "invalid");
  assert.equal(result.configReasonCode, "config_malformed");
});

// C8/C9 — isDisabled pode retornar um resultado final que não é "disabled"
// (ex.: Codex com um valor de escopo de projeto cuja efetividade depende de
// confiança não determinável por leitura — fica unknown).
function isDisabledWithUnknownEscape(fields, scope) {
  if (fields.ambiguous !== true) return undefined;
  if (scope === "untrusted-ish") {
    return { configuration: "unknown", configReasonCode: "policy_precedence_undetermined" };
  }
  return "disabled_by_rule";
}

test("scope-merge-C9 isDisabled pode resolver para unknown (não apenas disabled) quando a efetividade do escopo é indeterminada", () => {
  const result = mergeConfigScopes(
    [{ scope: "untrusted-ish", state: "parsed", parsed: { ambiguous: true, hasHooksSection: true } }],
    { isDisabled: isDisabledWithUnknownEscape, hasHooks: hasHooksSection },
  );
  assert.equal(result.configuration, "unknown");
  assert.equal(result.configReasonCode, "policy_precedence_undetermined");
});

test("scope-merge-C9 escopo de menor precedência nunca é considerado depois de um unknown resolvido antes dele", () => {
  const result = mergeConfigScopes(
    [
      { scope: "untrusted-ish", state: "parsed", parsed: { ambiguous: true } },
      { scope: "user", state: "parsed", parsed: { hasHooksSection: true } },
    ],
    { isDisabled: isDisabledWithUnknownEscape, hasHooks: hasHooksSection },
  );
  assert.equal(result.configuration, "unknown");
  assert.notEqual(result.configuration, "configured");
});

test("scope-merge-C8 escopo acima do limite de tamanho vira unknown/input_too_large", () => {
  const result = mergeConfigScopes(
    [
      { scope: "managed", state: "missing" },
      { scope: "user", state: "too_large" },
    ],
    { isDisabled: claudeIsDisabled, hasHooks: hasHooksSection },
  );
  assert.equal(result.configuration, "unknown");
  assert.equal(result.configReasonCode, "input_too_large");
});
