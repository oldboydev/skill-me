// C1-C4 — fronteira externa real: a CLI é invocada como processo filho,
// como os critérios descrevem (`doctor --json`). Origem: ambiente
// sintético (fixtures), nunca instalação real do agente.
import assert from "node:assert/strict";
import { mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  AGENT_ORDER,
  KNOWN_GOOD_VERSION_TEXT,
  hermesBinDirName,
  installAllAgents,
  makeScratch,
  pathEnv,
} from "./helpers/fixture-agents.mjs";
import { inventory } from "./helpers/fs-inventory.mjs";
import { buildMinimalPe, corruptFixedFileInfoSignature } from "./helpers/synthetic-pe.mjs";
import { runDoctor, runDoctorJson } from "./helpers/spawn-doctor.mjs";

function emptyHomeEnv(scratch) {
  return {
    HOME: path.join(scratch, "home-vazio"),
    USERPROFILE: path.join(scratch, "home-vazio"),
    LOCALAPPDATA: path.join(scratch, "localappdata-vazio"),
  };
}

function hermesSitePackagesDir(venvRoot) {
  return process.platform === "win32"
    ? path.join(venvRoot, "Lib", "site-packages")
    : path.join(venvRoot, "lib", "python3.12", "site-packages");
}

function hermesShimContent() {
  return process.platform === "win32"
    ? "@ECHO off\r\npython -m hermes_cli %*\r\n"
    : "#!/usr/bin/env python3\nfrom hermes_cli import main\nimport sys\nsys.exit(main())\n";
}

test("presence-C1 PATH vazio e nenhum local reconhecido retorna três ausentes, nesta ordem, exit 0", () => {
  const scratch = makeScratch("doctor-c1-");
  try {
    const { status, report } = runDoctorJson([], {
      env: emptyHomeEnv(scratch),
    });
    assert.equal(status, 0);
    assert.equal(report.agents.length, 3);
    assert.deepEqual(
      report.agents.map((a) => a.id),
      AGENT_ORDER,
    );
    for (const agent of report.agents) {
      assert.equal(agent.presence, "absent", agent.id);
      assert.equal(agent.version, null, agent.id);
      assert.equal(agent.reasonCode, "executable_not_found", agent.id);
    }
    const text = runDoctor([], { env: emptyHomeEnv(scratch) });
    assert.equal(text.status, 0);
    for (const id of AGENT_ORDER)
      assert.match(
        text.stdout,
        new RegExp(id + "[^\\n]*não encontrado", "i"),
        id,
      );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("presence-C2 fixtures de instalação resolvem caminho, versão e origem explícita por agente", () => {
  const scratch = makeScratch("doctor-c2-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, { sentinelPath: path.join(scratch, "sentinel.txt") });
    const { status, report } = runDoctorJson([], {
      env: { PATH: pathEnv(pathDirs), ...emptyHomeEnv(scratch) },
    });
    assert.equal(status, 0);
    const byId = Object.fromEntries(report.agents.map((a) => [a.id, a]));
    assert.equal(byId.claude.presence, "present");
    assert.equal(byId.claude.version, KNOWN_GOOD_VERSION_TEXT.claude);
    assert.equal(byId.claude.versionSource, "binary_metadata");
    assert.equal(byId.codex.presence, "present");
    assert.equal(byId.codex.version, KNOWN_GOOD_VERSION_TEXT.codex);
    assert.equal(byId.codex.versionSource, "package_metadata");
    assert.equal(byId.hermes.presence, "present");
    assert.equal(byId.hermes.version, KNOWN_GOOD_VERSION_TEXT.hermes);
    assert.equal(byId.hermes.versionSource, "source_literal");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("presence-C2 caminho com espaços e Unicode não altera a resolução", () => {
  const scratch = makeScratch("doctor-c2-unicode-");
  try {
    const dir = path.join(scratch, "pasta com espaço", "ágéntes café");
    const { pathDirs } = installAllAgents(dir, { sentinelPath: path.join(scratch, "sentinel.txt") });
    const { status, report } = runDoctorJson([], {
      env: { PATH: pathEnv(pathDirs), ...emptyHomeEnv(scratch) },
    });
    assert.equal(status, 0);
    const claude = report.agents.find((a) => a.id === "claude");
    assert.equal(claude.version, KNOWN_GOOD_VERSION_TEXT.claude);
    assert.ok(claude.path.includes("ágéntes café"), claude.path);
    const hermes = report.agents.find((a) => a.id === "hermes");
    assert.equal(hermes.version, KNOWN_GOOD_VERSION_TEXT.hermes);
    assert.ok(hermes.path.includes("ágéntes café"), hermes.path);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("presence-C3 artefato presente com versão ilegível mantém presence present, version null e motivo específico", () => {
  const scratch = makeScratch("doctor-c3-unreadable-");
  try {
    const dir = path.join(scratch, "bin");
    mkdirSync(dir, { recursive: true });
    const claudeFile = path.join(
      dir,
      process.platform === "win32" ? "claude.exe" : "claude",
    );
    const pe = buildMinimalPe({
      version: { major: 2, minor: 1, build: 295, revision: 0 },
    });
    writeFileSync(claudeFile, corruptFixedFileInfoSignature(pe), {
      mode: 0o755,
    });
    const { status, report } = runDoctorJson([], {
      env: { PATH: pathEnv([dir]), ...emptyHomeEnv(scratch) },
    });
    assert.equal(status, 0);
    const claude = report.agents.find((a) => a.id === "claude");
    assert.equal(claude.presence, "present");
    assert.equal(claude.version, null);
    assert.equal(claude.reasonCode, "version_unreadable");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("presence-C3 launcher não reconhecido mantém presence present com motivo launcher_not_recognized", () => {
  const scratch = makeScratch("doctor-c3-launcher-");
  try {
    const dir = path.join(scratch, "bin");
    mkdirSync(dir, { recursive: true });
    const claudeFile = path.join(
      dir,
      process.platform === "win32" ? "claude.exe" : "claude",
    );
    writeFileSync(claudeFile, Buffer.from("não é um formato reconhecido\n"), {
      mode: 0o755,
    });
    const { status, report } = runDoctorJson([], {
      env: { PATH: pathEnv([dir]), ...emptyHomeEnv(scratch) },
    });
    assert.equal(status, 0);
    const claude = report.agents.find((a) => a.id === "claude");
    assert.equal(claude.presence, "present");
    assert.equal(claude.version, null);
    assert.equal(claude.reasonCode, "launcher_not_recognized");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("presence-C3 fonte de versão ambígua mantém version null com motivo version_source_ambiguous", () => {
  const scratch = makeScratch("doctor-c3-ambiguous-");
  try {
    const venvRoot = path.join(scratch, "hermes-venv");
    const binDir = path.join(venvRoot, hermesBinDirName());
    mkdirSync(binDir, { recursive: true });
    const hermesFile = path.join(
      binDir,
      process.platform === "win32" ? "hermes.cmd" : "hermes",
    );
    writeFileSync(hermesFile, hermesShimContent(), { mode: 0o755 });
    const pkgDir = path.join(hermesSitePackagesDir(venvRoot), "hermes_cli");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      path.join(pkgDir, "__init__.py"),
      '__version__ = "0.21.4"\n__version__ = "0.21.5"\n',
    );
    const { status, report } = runDoctorJson([], {
      env: { PATH: pathEnv([binDir]), ...emptyHomeEnv(scratch) },
    });
    assert.equal(status, 0);
    const hermes = report.agents.find((a) => a.id === "hermes");
    assert.equal(hermes.presence, "present");
    assert.equal(hermes.version, null);
    assert.equal(hermes.reasonCode, "version_source_ambiguous");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("presence-C3 launcher alheio do Codex com package.json vizinho (não referenciado) continua launcher_not_recognized", () => {
  const scratch = makeScratch("doctor-c3-foreign-codex-");
  try {
    const dir = path.join(scratch, "bin");
    mkdirSync(dir, { recursive: true });
    const codexFile = path.join(dir, process.platform === "win32" ? "codex.cmd" : "codex");
    const content =
      process.platform === "win32"
        ? "@ECHO off\r\necho ferramenta nao relacionada\r\n"
        : "#!/bin/sh\necho ferramenta nao relacionada\n";
    writeFileSync(codexFile, content, { mode: 0o755 });
    const pkgDir = path.join(dir, "node_modules", "@openai", "codex");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({ name: "@openai/codex", version: "9.9.9" }),
    );
    const { status, report } = runDoctorJson([], {
      env: { PATH: pathEnv([dir]), ...emptyHomeEnv(scratch) },
    });
    assert.equal(status, 0);
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.presence, "present");
    assert.equal(codex.version, null);
    assert.equal(codex.reasonCode, "launcher_not_recognized");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("presence-C4 execução completa não invoca launchers nem altera arquivos de configuração/skills", () => {
  const scratch = makeScratch("doctor-c4-");
  try {
    const dir = path.join(scratch, "bin");
    const sentinelPath = path.join(scratch, "sentinel.txt");
    const { pathDirs } = installAllAgents(dir, { sentinelPath });
    const snapshotBefore = inventory(scratch);

    const { status } = runDoctorJson([], {
      env: {
        PATH: pathEnv(pathDirs),
        ...emptyHomeEnv(scratch),
        DOCTOR_TEST_WRITE_SENTINEL: "1",
      },
    });
    assert.equal(status, 0);
    assert.throws(() => statSync(sentinelPath));

    const snapshotAfter = inventory(scratch);
    assert.deepEqual(snapshotAfter, snapshotBefore);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
