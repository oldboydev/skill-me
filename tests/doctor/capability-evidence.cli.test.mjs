// C5 — fronteira externa real: uma versão conhecida/compatível não é, por si
// só, evidência do contrato de nenhum mecanismo específico — só prova que
// aquele número de versão foi lido de um artefato real. run-diagnostics.mjs
// nunca deriva `hasLocalVerifiedContract` de `versionProfileCompatible`
// (nenhum artefato de contrato por mecanismo é inspecionado nesta entrega),
// então um PE sintético com versão conhecida não deve "provar"
// ferramentas/skills.
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { installAllAgents, makeScratch, pathEnv } from "./helpers/fixture-agents.mjs";
import { runDoctor, runDoctorJson } from "./helpers/spawn-doctor.mjs";

function emptyHomeEnv(scratch) {
  return {
    HOME: path.join(scratch, "home-vazio"),
    USERPROFILE: path.join(scratch, "home-vazio"),
    LOCALAPPDATA: path.join(scratch, "localappdata-vazio"),
  };
}

test("capability-evidence-C5 versão conhecida sem nenhum artefato de contrato inspecionado nunca produz capacidade verified", () => {
  const scratch = makeScratch("doctor-c5-no-verified-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, { sentinelPath: path.join(scratch, "sentinel") });
    const { status, report } = runDoctorJson([], {
      env: { PATH: pathEnv(pathDirs), ...emptyHomeEnv(scratch) },
    });
    assert.equal(status, 0);
    for (const agent of report.agents) {
      // Confirma que a premissa do teste é real: a versão foi de fato
      // resolvida e bate com o perfil conhecido (ver known-version-profiles.mjs).
      assert.ok(agent.version, agent.id);
      for (const row of agent.capabilities) {
        assert.notEqual(
          row.support,
          "verified",
          `${agent.id}/${row.mechanism}/${row.surface}: versão compatível não é evidência de contrato`,
        );
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// C7/G2 — a exclusão de hosted tools dos hooks locais do Codex (fato do
// CONTRATO DOCUMENTADO, não desta instalação) precisa ser consultável nos
// dois formatos de saída de um processo real, não apenas na camada pura
// (capability-matrix.unit.test.mjs). Usa uma instalação com versão compatível
// (known-version-profiles.mjs) para confirmar que a exclusão aparece mesmo
// quando a avaliação genérica da linha segue seu curso normal
// (no_local_evidence, pois run-diagnostics.mjs nunca fornece
// hasLocalVerifiedContract nesta entrega), nunca "unavailable" e com origem
// própria (documented_contract), distinta da origem real_environment da
// linha e do motivo surface_not_inspected da superfície cloud.
test("capability-evidence-C7 Codex tool_calls na CLI local expõe a exclusão documentada de hosted tools nos dois formatos, sem sobrescrever o motivo genérico nem a superfície cloud", () => {
  const scratch = makeScratch("doctor-c7-hosted-tools-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, { sentinelPath: path.join(scratch, "sentinel.txt") });
    const env = { PATH: pathEnv(pathDirs), ...emptyHomeEnv(scratch) };

    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.version, "0.162.1");

    const toolCallsLocal = codex.capabilities.find(
      (row) => row.mechanism === "tool_calls" && row.surface === "cli_local",
    );
    assert.equal(toolCallsLocal.reasonCode, "no_local_evidence");
    assert.notEqual(toolCallsLocal.support, "unavailable");
    assert.notEqual(toolCallsLocal.support, "verified");
    assert.ok(toolCallsLocal.exclusion, "exclusão documentada de hosted tools ausente");
    assert.equal(toolCallsLocal.exclusion.reasonCode, "hosted_tools_outside_local_hooks");
    assert.equal(toolCallsLocal.exclusion.origin, "documented_contract");
    assert.notEqual(toolCallsLocal.exclusion.origin, toolCallsLocal.evidence.origin);

    const toolCallsCloud = codex.capabilities.find(
      (row) => row.mechanism === "tool_calls" && row.surface === "cloud",
    );
    assert.equal(toolCallsCloud.reasonCode, "surface_not_inspected");
    assert.notEqual(toolCallsCloud.support, "unavailable");
    assert.equal(toolCallsCloud.exclusion, null, "exclusão de hosted tools só vale para cli_local");

    const { status: textStatus, stdout } = runDoctor([], { env });
    assert.equal(textStatus, 0);
    assert.match(stdout, /hosted_tools_outside_local_hooks/);
    assert.match(stdout, /documented_contract/);
    assert.match(stdout, /surface_not_inspected/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
