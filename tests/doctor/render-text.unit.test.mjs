// C11/G1 — renderText reduzia cada capacidade a uma contagem por estado e
// nunca imprimia agent.path nem o ambiente; os dois formatos de saída
// deixavam de apresentar os mesmos fatos/códigos do mesmo modelo de
// relatório (critério 11). Usa um ÚNICO relatório sintético COMPARTILHADO
// entre a montagem e as asserções (nunca duas invocações/timestamps
// diferentes) para provar a paridade na própria função pura, sem subir a
// CLI — a fronteira real é provada à parte em envelope.cli.test.mjs e
// capability-evidence.cli.test.mjs. Cada asserção abaixo falharia no
// renderer anterior.
import assert from "node:assert/strict";
import test from "node:test";
import { renderText } from "../../src/doctor/render-text.mjs";
import { buildCapabilityMatrix } from "../../src/doctor/capability-matrix.mjs";

function buildSyntheticReport() {
  const claudeCapabilities = buildCapabilityMatrix({
    agentId: "claude",
    evidenceBySurface: {
      cli_local: {
        configuration: "configured",
        hasLocalVerifiedContract: false,
        documentationOnly: false,
        versionProfileCompatible: true,
        origin: "real_environment",
      },
    },
  });
  const codexCapabilities = buildCapabilityMatrix({
    agentId: "codex",
    evidenceBySurface: {
      cli_local: {
        configuration: "not_configured",
        hasLocalVerifiedContract: false,
        documentationOnly: false,
        versionProfileCompatible: true,
        origin: "real_environment",
      },
    },
  });
  const hermesCapabilities = buildCapabilityMatrix({ agentId: "hermes", evidenceBySurface: {} });

  return {
    schemaVersion: 1,
    status: "partial",
    environment: {
      platform: "linux",
      cwd: "/home/usuario/projeto-sintetico",
      generatedAt: "2026-10-13T00:00:00.000Z",
    },
    agents: [
      {
        id: "claude",
        presence: "present",
        version: "2.1.295",
        versionSource: "binary_metadata",
        path: "/usr/local/bin/claude",
        reasonCode: null,
        configuration: "configured",
        configReasonCode: "hooks_configured",
        trust: "unknown",
        trustReasonCode: "claude_trust_not_statically_determinable",
        capabilities: claudeCapabilities,
      },
      {
        id: "codex",
        presence: "present",
        version: null,
        versionSource: null,
        path: "/usr/local/bin/codex",
        reasonCode: "launcher_not_recognized",
        configuration: "unknown",
        configReasonCode: "policy_precedence_undetermined",
        trust: "unknown",
        trustReasonCode: "codex_trust_not_statically_determinable",
        capabilities: codexCapabilities,
      },
      {
        id: "hermes",
        presence: "absent",
        version: null,
        versionSource: null,
        path: null,
        reasonCode: "executable_not_found",
        configuration: "not_configured",
        configReasonCode: "no_config_found",
        trust: "not_applicable",
        trustReasonCode: "no_native_consent_source",
        capabilities: hermesCapabilities,
      },
    ],
    collector: {
      status: "unreachable",
      reasonCode: "connection_refused",
      identityVerified: false,
    },
    limitations: ["limitação sintética de exemplo para o teste de paridade."],
    errors: [],
  };
}

test("render-text-C11 texto expõe o ambiente e, por agente, caminho + mecanismo/superfície/motivo/origem/configuração de cada capacidade", () => {
  const report = buildSyntheticReport();
  const text = renderText(report);

  assert.ok(text.includes(report.environment.platform), "plataforma ausente no texto");
  assert.ok(text.includes(report.environment.cwd), "cwd ausente no texto");
  assert.ok(text.includes(report.environment.generatedAt), "generatedAt ausente no texto");

  assert.ok(text.includes(report.agents[0].path), "path do claude ausente no texto");
  assert.ok(text.includes(report.agents[1].path), "path do codex ausente no texto");

  for (const agent of report.agents) {
    assert.ok(agent.capabilities.length > 0, agent.id);
    for (const row of agent.capabilities) {
      assert.ok(
        text.includes(`${row.mechanism} × ${row.surface}`),
        `${agent.id}: linha de ${row.mechanism}/${row.surface} ausente no texto`,
      );
      assert.ok(
        text.includes(row.reasonCode),
        `${agent.id}: motivo ${row.reasonCode} de ${row.mechanism}/${row.surface} ausente no texto`,
      );
      assert.ok(
        text.includes(row.evidence.origin),
        `${agent.id}: origem ${row.evidence.origin} de ${row.mechanism}/${row.surface} ausente no texto`,
      );
      if (row.exclusion) {
        assert.ok(
          text.includes(row.exclusion.reasonCode),
          `${agent.id}: exclusão documentada ${row.exclusion.reasonCode} ausente no texto`,
        );
        assert.ok(
          text.includes(row.exclusion.origin),
          `${agent.id}: origem da exclusão ${row.exclusion.origin} ausente no texto`,
        );
      }
    }
  }

  // Estados distintos exigidos pelo critério 11: ausente, desconhecido e não
  // verificado aparecem no relatório sintético acima ("indisponível" nunca é
  // produzido pelo produto — ver capability-matrix.mjs — mas seu dicionário
  // de texto permanece coberto por capability-matrix.unit.test.mjs).
  assert.match(text, /não encontrado/); // hermes ausente
  assert.match(text, /configuração desconhecida/); // codex/configuration unknown
  assert.match(text, /não verificado/); // support unverified
});

test("render-text-C11 exclusão documentada de hosted tools do Codex aparece no texto com origem própria, distinta da origem da linha", () => {
  const report = buildSyntheticReport();
  const text = renderText(report);
  const codexToolCallsLocal = report.agents
    .find((agent) => agent.id === "codex")
    .capabilities.find((row) => row.mechanism === "tool_calls" && row.surface === "cli_local");
  assert.equal(codexToolCallsLocal.exclusion.reasonCode, "hosted_tools_outside_local_hooks");
  assert.notEqual(codexToolCallsLocal.exclusion.origin, codexToolCallsLocal.evidence.origin);
  assert.ok(
    text.includes("hosted_tools_outside_local_hooks"),
    "motivo específico de hosted tools do Codex ausente no texto",
  );
  assert.ok(
    text.includes(codexToolCallsLocal.exclusion.origin),
    "origem documentada da exclusão ausente no texto",
  );
});
