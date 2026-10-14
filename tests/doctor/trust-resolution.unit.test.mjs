// C8 — a decisão de trust nunca lê um campo arbitrário do conteúdo não
// confiável de um arquivo de configuração: a única entrada aceita é uma
// evidência nativa já extraída por um leitor específico do agente (ver
// native-trust-evidence.mjs), com origem/motivo explicitamente inspecionados
// contra uma lista reconhecida. Esta suíte prova o contrato das quatro
// decisões (trusted/untrusted/unknown/not_applicable) usando origens de
// teste, separadas da extração real.
import assert from "node:assert/strict";
import test from "node:test";
import { resolveTrust } from "../../src/doctor/trust-resolution.mjs";

const TEST_ORIGINS = new Set(["test:native_trust_registry"]);

test("trust-resolution-C8 configuration disabled sempre vira not_applicable, mesmo com evidência trusted", () => {
  const result = resolveTrust({
    configuration: "disabled",
    evidence: { origin: "test:native_trust_registry", decision: "trusted" },
    recognizedOrigins: TEST_ORIGINS,
  });
  assert.equal(result.trust, "not_applicable");
});

test("trust-resolution-C8 configuration not_configured sempre vira not_applicable", () => {
  const result = resolveTrust({
    configuration: "not_configured",
    evidence: null,
    recognizedOrigins: TEST_ORIGINS,
  });
  assert.equal(result.trust, "not_applicable");
});

test("trust-resolution-C8 configuration invalid/unknown vira unknown, nunca trusted/untrusted", () => {
  for (const configuration of ["invalid", "unknown"]) {
    const result = resolveTrust({
      configuration,
      evidence: { origin: "test:native_trust_registry", decision: "trusted" },
      recognizedOrigins: TEST_ORIGINS,
    });
    assert.equal(result.trust, "unknown", configuration);
  }
});

test("trust-resolution-C8 configured sem nenhuma evidência fica unknown (ausência de consentimento não é inferida)", () => {
  const result = resolveTrust({
    configuration: "configured",
    evidence: null,
    recognizedOrigins: TEST_ORIGINS,
  });
  assert.equal(result.trust, "unknown");
  assert.equal(result.reasonCode, "no_native_consent_evidence");
});

test("trust-resolution-C8 campo arbitrário do próprio arquivo (origem não reconhecida) nunca concede trusted", () => {
  // Simula exatamente o caso rejeitado nesta correção: alguém com acesso de
  // escrita ao arquivo de hooks embute um campo "trust: trusted" dentro do
  // próprio conteúdo não confiável. Essa "evidência" chega com uma origem
  // que não está na lista reconhecida — nunca a de um leitor nativo real.
  const result = resolveTrust({
    configuration: "configured",
    evidence: { origin: "embedded_config_field", decision: "trusted" },
    recognizedOrigins: TEST_ORIGINS,
  });
  assert.notEqual(result.trust, "trusted");
  assert.equal(result.trust, "unknown");
  assert.equal(result.reasonCode, "untrusted_evidence_origin");
});

test("trust-resolution-C8 evidência de origem reconhecida com decisão trusted é refletida", () => {
  const result = resolveTrust({
    configuration: "configured",
    evidence: {
      origin: "test:native_trust_registry",
      decision: "trusted",
      reasonCode: "test_native_decision",
    },
    recognizedOrigins: TEST_ORIGINS,
  });
  assert.equal(result.trust, "trusted");
  assert.equal(result.reasonCode, "test_native_decision");
});

test("trust-resolution-C8 evidência de origem reconhecida com decisão untrusted é refletida", () => {
  const result = resolveTrust({
    configuration: "configured",
    evidence: { origin: "test:native_trust_registry", decision: "untrusted" },
    recognizedOrigins: TEST_ORIGINS,
  });
  assert.equal(result.trust, "untrusted");
  assert.notEqual(result.trust, "unknown");
});
