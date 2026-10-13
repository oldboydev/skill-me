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
import { runDoctorJson } from "./helpers/spawn-doctor.mjs";

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
