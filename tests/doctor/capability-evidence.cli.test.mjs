// C5 — fronteira externa real: uma versão conhecida/compatível não é, por si
// só, evidência do contrato de nenhum mecanismo específico — só prova que
// aquele número de versão foi lido de um artefato real. O contrato vem da
// tabela que a própria instalação traz (Hermes: VALID_HOOKS em
// hermes_cli/plugins.py, ao lado do __init__.py da versão); sem ela, nenhum
// mecanismo chega a "verified". Toda fixture aqui é sintética: prova o
// algoritmo da CLI, não a máquina do usuário.
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  installAllAgents,
  makeScratch,
  pathEnv,
  writeHermes,
  hermesBinDirName,
} from "./helpers/fixture-agents.mjs";
import {
  hermesPluginsLookalikeSources,
  hermesPluginsSource,
} from "./helpers/hermes-contract-source.mjs";
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
      const expectedLocalReason = {
        claude: "no_static_contract_source",
        codex: "no_static_contract_source",
        hermes: "contract_source_not_found",
      }[agent.id];
      for (const row of agent.capabilities) {
        if (row.surface === "cli_local" && !(agent.id === "codex" && row.mechanism === "skill_usage_signal")) {
          assert.equal(row.reasonCode, expectedLocalReason, `${agent.id}/${row.mechanism}`);
        }
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
// (no_static_contract_source: o Codex não traz tabela textual de contrato no
// layout inspecionado), nunca "unavailable" e com origem
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
    assert.equal(toolCallsLocal.reasonCode, "no_static_contract_source");
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

// --- Avaliação efetiva de contrato pela CLI (achado formal 2) ---

const HERMES_EVENTS_BY_MECHANISM = {
  skill_usage_signal: ["on_skill_lifecycle"],
  tool_calls: ["pre_tool_call", "post_tool_call"],
  results_and_errors: ["post_tool_call"],
  session_turn: ["on_session_start", "on_session_end"],
  subagents: ["subagent_start", "subagent_stop"],
};

function localRows(agent) {
  return agent.capabilities.filter((row) => row.surface === "cli_local");
}

test("capability-evidence-C5 Hermes com VALID_HOOKS da própria instalação: as cinco linhas da CLI local ficam verified com fonte e eventos, nos dois formatos", () => {
  const scratch = makeScratch("doctor-c5-contrato-hermes-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs, hermesPkgDir } = installAllAgents(dir, {
      sentinelPath: path.join(scratch, "sentinel.txt"),
      hermesContractSource: hermesPluginsSource(),
    });
    const env = { PATH: pathEnv(pathDirs), ...emptyHomeEnv(scratch) };
    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    const hermes = report.agents.find((a) => a.id === "hermes");
    assert.equal(hermes.version, "0.21.4");
    const pluginsPath = path.join(hermesPkgDir, "plugins.py");
    const rows = localRows(hermes);
    assert.equal(rows.length, 5);
    for (const row of rows) {
      assert.equal(row.support, "verified", row.mechanism);
      assert.equal(row.reasonCode, "local_contract_lists_events", row.mechanism);
      assert.equal(row.runtimeVerification, "not_performed", row.mechanism);
      assert.deepEqual(row.evidence, {
        origin: "real_environment",
        source: { kind: "hermes_valid_hooks", path: pluginsPath },
        events: HERMES_EVENTS_BY_MECHANISM[row.mechanism],
      });
    }
    for (const id of ["claude", "codex"]) {
      const agent = report.agents.find((a) => a.id === id);
      for (const row of localRows(agent)) assert.notEqual(row.support, "verified", `${id}/${row.mechanism}`);
    }

    const { status: textStatus, stdout } = runDoctor([], { env });
    assert.equal(textStatus, 0);
    assert.match(stdout, /verificado \(motivo: local_contract_lists_events; origem: real_environment/);
    assert.ok(stdout.includes(pluginsPath), "caminho da fonte de contrato ausente no texto");
    for (const event of ["on_skill_lifecycle", "pre_tool_call", "subagent_stop"]) {
      assert.ok(stdout.includes(event), `evento ${event} ausente no texto`);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("capability-evidence-C5 evento ausente na tabela instalada deixa só aquele mecanismo unverified/contract_event_not_listed", () => {
  const scratch = makeScratch("doctor-c5-contrato-evento-ausente-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, {
      sentinelPath: path.join(scratch, "sentinel.txt"),
      hermesContractSource: hermesPluginsSource({ omit: ["on_skill_lifecycle"] }),
    });
    const env = { PATH: pathEnv(pathDirs), ...emptyHomeEnv(scratch) };
    const { report } = runDoctorJson([], { env });
    const rows = localRows(report.agents.find((a) => a.id === "hermes"));
    const skill = rows.find((row) => row.mechanism === "skill_usage_signal");
    assert.equal(skill.support, "unverified");
    assert.equal(skill.reasonCode, "contract_event_not_listed");
    assert.deepEqual(skill.evidence.missingEvents, ["on_skill_lifecycle"]);
    for (const row of rows.filter((r) => r.mechanism !== "skill_usage_signal")) {
      assert.equal(row.support, "verified", row.mechanism);
    }
    const { stdout } = runDoctor([], { env });
    assert.match(stdout, /eventos ausentes: on_skill_lifecycle/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("capability-evidence-C5 versão sem perfil compatível não vira verified mesmo com a tabela instalada", () => {
  const scratch = makeScratch("doctor-c5-contrato-versao-");
  try {
    const { binDir } = writeHermes(path.join(scratch, "hermes-venv"), {
      version: "0.99.0",
      sentinelPath: path.join(scratch, "sentinel.txt"),
      contractSource: hermesPluginsSource(),
    });
    const { report } = runDoctorJson([], { env: { PATH: pathEnv([binDir]), ...emptyHomeEnv(scratch) } });
    const hermes = report.agents.find((a) => a.id === "hermes");
    assert.equal(hermes.version, "0.99.0");
    assert.ok(binDir.endsWith(hermesBinDirName()));
    for (const row of localRows(hermes)) {
      assert.equal(row.support, "unverified", row.mechanism);
      assert.equal(row.reasonCode, "version_profile_incompatible", row.mechanism);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Pré-revisão formal: cada fonte abaixo escreve todos os eventos mapeados,
// mas não é o literal atribuído à tabela em código (strings adjacentes que o
// Python concatena, diferença depois do literal, bloco dentro da docstring).
// Com versão e perfil compatíveis, a única razão para não chegar a verified
// é a forma da fonte.
test("capability-evidence-C5 fonte que só parece VALID_HOOKS fica unverified/contract_source_unrecognized nas cinco linhas, nos dois formatos", () => {
  for (const [label, contractSource] of Object.entries(hermesPluginsLookalikeSources())) {
    const scratch = makeScratch("doctor-c5-contrato-forma-");
    try {
      const { binDir } = writeHermes(path.join(scratch, "hermes-venv"), {
        version: "0.21.4",
        sentinelPath: path.join(scratch, "sentinel.txt"),
        contractSource,
      });
      const env = { PATH: pathEnv([binDir]), ...emptyHomeEnv(scratch) };
      const { status, report } = runDoctorJson([], { env });
      assert.equal(status, 0, label);
      const hermes = report.agents.find((a) => a.id === "hermes");
      assert.equal(hermes.version, "0.21.4", `${label}: premissa — versão e perfil compatíveis`);
      const rows = localRows(hermes);
      assert.equal(rows.length, 5, label);
      for (const row of rows) {
        assert.equal(row.support, "unverified", `${label}/${row.mechanism}`);
        assert.equal(row.reasonCode, "contract_source_unrecognized", `${label}/${row.mechanism}`);
        assert.equal(row.evidence.events, undefined, `${label}/${row.mechanism}`);
      }
      const { status: textStatus, stdout } = runDoctor([], { env });
      assert.equal(textStatus, 0, label);
      assert.match(stdout, /contract_source_unrecognized/, label);
      assert.doesNotMatch(stdout, /local_contract_lists_events/, label);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
});

// Pré-revisão formal: `__version__` só em comentário não é a versão do pacote
// e não pode liberar o contrato, mesmo com a tabela válida ao lado.
test("capability-evidence-C5 __version__ só em comentário: versão nula e nenhuma linha verified, mesmo com VALID_HOOKS válido", () => {
  const scratch = makeScratch("doctor-c5-versao-comentario-");
  try {
    const { binDir } = writeHermes(path.join(scratch, "hermes-venv"), {
      version: "0.21.4",
      sentinelPath: path.join(scratch, "sentinel.txt"),
      contractSource: hermesPluginsSource(),
      initSource: '# __version__ = "0.21.4"\n',
    });
    const env = { PATH: pathEnv([binDir]), ...emptyHomeEnv(scratch) };
    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    const hermes = report.agents.find((a) => a.id === "hermes");
    assert.equal(hermes.presence, "present");
    assert.equal(hermes.version, null);
    assert.equal(hermes.versionSource, null);
    assert.equal(hermes.reasonCode, "version_unreadable");
    for (const row of localRows(hermes)) {
      assert.equal(row.support, "unverified", row.mechanism);
      assert.equal(row.reasonCode, "version_unresolved", row.mechanism);
    }
    const { status: textStatus, stdout } = runDoctor([], { env });
    assert.equal(textStatus, 0);
    assert.match(stdout, /version_unreadable/);
    assert.doesNotMatch(stdout, /0\.21\.4/);
    assert.doesNotMatch(stdout, /local_contract_lists_events/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Achado formal4 P2 (nº2): `__version__ += "-dev"` ao lado de uma tabela de
// contrato válida publicava 0.21.4 (literal da primeira atribuição) e
// liberava "verified" para uma versão efetiva (0.21.4-dev) fora do perfil
// publicado. Instala os três agentes (alcance compartilhado: a mesma leitura
// léxica serve Hermes e os contratos VALID_HOOKS/SHELL_UNSUPPORTED_HOOKS) com
// contrato sintético válido. O controle sem reatribuição é o teste "Hermes
// com VALID_HOOKS da própria instalação" acima, que continua verified.
test("capability-evidence-C5 formal4-P2 Hermes com __version__ += \"-dev\": version_source_ambiguous e nenhuma linha verified, mesmo com VALID_HOOKS válido", () => {
  const scratch = makeScratch("doctor-c5-versao-reatribuicao-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, {
      sentinelPath: path.join(scratch, "sentinel.txt"),
      hermesContractSource: hermesPluginsSource(),
      hermesInitSource: '__version__ = "0.21.4"\n__version__ += "-dev"\n',
    });
    const env = { PATH: pathEnv(pathDirs), ...emptyHomeEnv(scratch) };
    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    const hermes = report.agents.find((a) => a.id === "hermes");
    assert.equal(hermes.presence, "present");
    assert.equal(hermes.version, null);
    assert.notEqual(hermes.version, "0.21.4", "a versão efetiva (0.21.4-dev) nunca pode ser publicada como 0.21.4");
    assert.equal(hermes.versionSource, null);
    assert.equal(hermes.reasonCode, "version_source_ambiguous");
    const rows = localRows(hermes);
    assert.equal(rows.length, 5);
    for (const row of rows) {
      assert.equal(row.support, "unverified", row.mechanism);
      assert.equal(row.reasonCode, "version_unresolved", row.mechanism);
      assert.equal(row.runtimeVerification, "not_performed", row.mechanism);
    }
    for (const id of ["claude", "codex"]) {
      const agent = report.agents.find((a) => a.id === id);
      for (const row of localRows(agent)) assert.notEqual(row.support, "verified", `${id}/${row.mechanism}`);
    }
    const { status: textStatus, stdout } = runDoctor([], { env });
    assert.equal(textStatus, 0);
    assert.match(stdout, /version_source_ambiguous/);
    assert.doesNotMatch(stdout, /0\.21\.4/);
    assert.doesNotMatch(stdout, /local_contract_lists_events/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("capability-evidence-C5 launcher ausente no PATH consultado: CLI local unavailable/executable_not_found, demais superfícies continuam não inspecionadas", () => {
  const scratch = makeScratch("doctor-c5-indisponivel-");
  try {
    const env = emptyHomeEnv(scratch);
    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    for (const agent of report.agents) {
      assert.equal(agent.presence, "absent", agent.id);
      for (const row of agent.capabilities) {
        if (row.surface === "cli_local") {
          assert.equal(row.support, "unavailable", `${agent.id}/${row.mechanism}`);
          assert.equal(row.reasonCode, "executable_not_found", `${agent.id}/${row.mechanism}`);
          assert.equal(row.evidence.origin, "real_environment");
        } else {
          assert.equal(row.support, "unverified", `${agent.id}/${row.mechanism}/${row.surface}`);
          assert.equal(row.reasonCode, "surface_not_inspected");
          assert.equal(row.evidence.origin, "not_inspected");
        }
      }
    }
    const { stdout } = runDoctor([], { env });
    const unavailableLines =
      stdout.match(/× cli_local: indisponível \(motivo: executable_not_found; origem: real_environment/g) ?? [];
    assert.equal(unavailableLines.length, 15);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// --- Origem das superfícies não inspecionadas (achado formal 7) ---
// 3 agentes × 5 mecanismos × 3 superfícies (ide, desktop, cloud) = 45 linhas
// que a CLI não inspeciona: nenhuma pode afirmar origem de fixture, nem no
// JSON nem no texto, mesmo quando o PATH consultado contém instalações.
test("capability-evidence-C16 as 45 linhas de superfícies não inspecionadas declaram origem not_inspected nos dois formatos, nunca fixture", () => {
  const scratch = makeScratch("doctor-c16-origem-nao-inspecionada-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, { sentinelPath: path.join(scratch, "sentinel.txt") });
    const env = { PATH: pathEnv(pathDirs), ...emptyHomeEnv(scratch) };
    const { status, report, stdout: jsonStdout } = runDoctorJson([], { env });
    assert.equal(status, 0);
    const nonLocal = report.agents.flatMap((agent) =>
      agent.capabilities.filter((row) => row.surface !== "cli_local"),
    );
    assert.equal(nonLocal.length, 45);
    for (const row of nonLocal) {
      const label = `${row.agentId}/${row.mechanism}/${row.surface}`;
      assert.equal(row.evidence.origin, "not_inspected", label);
      assert.equal(row.support, "unverified", label);
      assert.equal(row.reasonCode, "surface_not_inspected", label);
    }
    for (const agent of report.agents) {
      for (const row of localRows(agent)) assert.equal(row.evidence.origin, "real_environment", agent.id);
    }
    assert.doesNotMatch(jsonStdout, /"origin":"fixture"/);

    const { stdout } = runDoctor([], { env });
    const nonLocalLines =
      stdout.match(/× (ide|desktop|cloud): não verificado \(motivo: surface_not_inspected; origem: not_inspected/g) ??
      [];
    assert.equal(nonLocalLines.length, 45);
    assert.doesNotMatch(stdout, /origem: fixture/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
