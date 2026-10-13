// C5, C6, C7 — a matriz de cobertura é a fonte de verdade das decisões de
// suporte/configuração/execução. Testada na própria camada (regra pura),
// sem subir CLI nem agentes, conforme AGENTS.md.
import assert from "node:assert/strict";
import test from "node:test";
import {
  MECHANISMS,
  SURFACES,
  buildCapabilityMatrix,
  buildCapabilityRow,
} from "../../src/doctor/capability-matrix.mjs";

const SUPPORT_STATES = new Set(["verified", "unavailable", "unverified"]);

const FAVORABLE_EVIDENCE = {
  versionProfileCompatible: true,
  hasLocalVerifiedContract: true,
  documentationOnly: false,
  configuration: "configured",
  trust: "trusted",
};

test("capability-matrix-C5 mecanismo/superfície sempre tem support, reasonCode e evidence", () => {
  for (const agentId of ["claude", "codex", "hermes"]) {
    const matrix = buildCapabilityMatrix({
      agentId,
      evidenceBySurface: { cli_local: FAVORABLE_EVIDENCE },
    });
    assert.equal(matrix.length, MECHANISMS.length * SURFACES.length);
    for (const row of matrix) {
      assert.ok(SUPPORT_STATES.has(row.support), JSON.stringify(row));
      assert.equal(typeof row.reasonCode, "string");
      assert.ok(row.reasonCode.length > 0);
      assert.ok("evidence" in row);
    }
  }
});

test("capability-matrix-C5 versão sem perfil compatível não herda suporte por ser mais nova", () => {
  const row = buildCapabilityRow({
    agentId: "claude",
    mechanism: "tool_calls",
    surface: "cli_local",
    evidence: { ...FAVORABLE_EVIDENCE, versionProfileCompatible: false },
  });
  assert.equal(row.support, "unverified");
  assert.notEqual(row.reasonCode, "local_evidence_matches_contract");
});

test("capability-matrix-C5 documentação sem vínculo com a versão não basta para verified", () => {
  const row = buildCapabilityRow({
    agentId: "hermes",
    mechanism: "results_and_errors",
    surface: "cli_local",
    evidence: {
      ...FAVORABLE_EVIDENCE,
      hasLocalVerifiedContract: false,
      documentationOnly: true,
    },
  });
  assert.notEqual(row.support, "verified");
});

test("capability-matrix-C5 fixture validada não é marcada como prova do ambiente real", () => {
  const row = buildCapabilityRow({
    agentId: "claude",
    mechanism: "tool_calls",
    surface: "cli_local",
    evidence: { ...FAVORABLE_EVIDENCE, origin: "fixture" },
  });
  assert.equal(row.evidence.origin, "fixture");
  assert.notEqual(row.evidence.origin, "real_environment");
});

test("capability-matrix-C6 configuration e runtimeVerification são independentes; captura nunca iniciada", () => {
  for (const configuration of [
    "configured",
    "not_configured",
    "disabled",
    "invalid",
    "unknown",
  ]) {
    const row = buildCapabilityRow({
      agentId: "claude",
      mechanism: "session_turn",
      surface: "cli_local",
      evidence: { ...FAVORABLE_EVIDENCE, configuration },
    });
    assert.equal(row.configuration, configuration);
    assert.equal(
      row.runtimeVerification,
      "not_performed",
      `configuration=${configuration} não deve produzir runtimeVerification verified`,
    );
  }
  const matrix = buildCapabilityMatrix({
    agentId: "codex",
    evidenceBySurface: { cli_local: FAVORABLE_EVIDENCE },
  });
  assert.ok(matrix.every((row) => row.runtimeVerification === "not_performed"));
});

test("capability-matrix-C7 matriz cobre os cinco mecanismos nas quatro superfícies", () => {
  assert.deepEqual(
    [...MECHANISMS].sort(),
    [
      "results_and_errors",
      "session_turn",
      "skill_usage_signal",
      "subagents",
      "tool_calls",
    ].sort(),
  );
  assert.deepEqual(
    [...SURFACES].sort(),
    ["cli_local", "cloud", "desktop", "ide"].sort(),
  );
});

test("capability-matrix-C7 encontrar a CLI local não verifica outras superfícies", () => {
  for (const mechanism of MECHANISMS) {
    const localRow = buildCapabilityRow({
      agentId: "claude",
      mechanism,
      surface: "cli_local",
      evidence: FAVORABLE_EVIDENCE,
    });
    assert.equal(localRow.support, "verified", mechanism);
    for (const surface of ["ide", "desktop", "cloud"]) {
      const otherRow = buildCapabilityRow({
        agentId: "claude",
        mechanism,
        surface,
        evidence: FAVORABLE_EVIDENCE,
      });
      assert.notEqual(otherRow.support, "verified", `${mechanism}/${surface}`);
    }
  }
});

// Não inspecionar uma superfície a partir da CLI local significa unverified
// (não sabemos), nunca unavailable (afirmar ausência sem evidência); o
// Codex recebe o mesmo tratamento que qualquer outro agente para
// superfícies não inspecionadas — "hosted tool" não é sinônimo de
// "superfície cloud/desktop inteira".
test("capability-matrix-C7 superfície cloud do Codex não verificada pela CLI local fica unverified, não unavailable", () => {
  const row = buildCapabilityRow({
    agentId: "codex",
    mechanism: "tool_calls",
    surface: "cloud",
    evidence: FAVORABLE_EVIDENCE,
  });
  assert.equal(row.support, "unverified");
  assert.equal(row.reasonCode, "surface_not_inspected");
  assert.notEqual(row.support, "unavailable");
});

// Critério: nunca anunciar o evento nativo "SkillStart" do Codex sem
// evidência — não afirmar indisponibilidade genérica do mecanismo. Mesmo
// com evidência local favorável (hasLocalVerifiedContract: true), o
// mecanismo fica unverified/skill_start_not_documented na CLI local, nunca
// verified (evidência genérica não prova esse contrato específico) e nunca
// unavailable (ausência do evento documentado não prova ausência de
// qualquer sinal de uso de skill).
test("capability-matrix-C7 Codex não anuncia SkillStart nativo sem evidência (evidência favorável não basta)", () => {
  for (const surface of SURFACES) {
    const row = buildCapabilityRow({
      agentId: "codex",
      mechanism: "skill_usage_signal",
      surface,
      evidence: FAVORABLE_EVIDENCE,
    });
    assert.notEqual(row.support, "verified", surface);
    if (surface === "cli_local") {
      assert.equal(row.support, "unverified", surface);
      assert.equal(row.reasonCode, "skill_start_not_documented", surface);
      assert.notEqual(row.support, "unavailable", surface);
    }
  }
});

// Regressão: antes desta correção, o caso codex/skill_usage_signal era
// decidido ANTES da checagem de compatibilidade de versão, então uma versão
// sem perfil compatível ainda recebia "unavailable/skill_start_not_documented"
// em vez do motivo real (version_profile_incompatible) — escondendo por que
// o mecanismo não pôde ser avaliado. Prova RED/GREEN: versão conhecida
// compatível fica unverified/skill_start_not_documented; versão incompatível
// fica unverified/version_profile_incompatible, nunca o motivo de SkillStart.
test("capability-matrix-C5/C7 Codex skill_usage_signal: versão incompatível reporta o motivo de versão, não SkillStart", () => {
  const compatibleRow = buildCapabilityRow({
    agentId: "codex",
    mechanism: "skill_usage_signal",
    surface: "cli_local",
    evidence: { ...FAVORABLE_EVIDENCE, versionProfileCompatible: true },
  });
  assert.equal(compatibleRow.support, "unverified");
  assert.equal(compatibleRow.reasonCode, "skill_start_not_documented");

  const incompatibleRow = buildCapabilityRow({
    agentId: "codex",
    mechanism: "skill_usage_signal",
    surface: "cli_local",
    evidence: { ...FAVORABLE_EVIDENCE, versionProfileCompatible: false },
  });
  assert.equal(incompatibleRow.support, "unverified");
  assert.equal(incompatibleRow.reasonCode, "version_profile_incompatible");
  assert.notEqual(incompatibleRow.reasonCode, "skill_start_not_documented");
});
