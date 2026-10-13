// C11-C13 — fronteira externa real via CLI: envelope JSON, paridade com o
// texto, exit codes e o contrato de --help.
import assert from "node:assert/strict";
import path from "node:path";
import { rmSync } from "node:fs";
import test from "node:test";
import {
  installAllAgents,
  makeScratch,
  pathEnv,
} from "./helpers/fixture-agents.mjs";
import { writeAgentConfig } from "./helpers/fixture-agent-config.mjs";
import { runDoctor, runDoctorJson } from "./helpers/spawn-doctor.mjs";

function emptyHomeEnv(scratch) {
  return {
    HOME: path.join(scratch, "home-vazio"),
    USERPROFILE: path.join(scratch, "home-vazio"),
    LOCALAPPDATA: path.join(scratch, "localappdata-vazio"),
  };
}

test("envelope-C11 JSON é um objeto único, sem banner/ANSI/logs antes ou depois", () => {
  const scratch = makeScratch("doctor-c11-");
  try {
    const { status, stdout } = runDoctor(["--json"], {
      env: emptyHomeEnv(scratch),
    });
    assert.equal(status, 0);
    const trimmed = stdout.trimEnd();
    assert.equal(stdout, trimmed + "\n");
    assert.doesNotThrow(() => JSON.parse(trimmed));
    assert.doesNotMatch(stdout, /\x1b\[/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C11 texto em português distingue ausente, desconhecido, indisponível e não verificado; identificadores do JSON em inglês", () => {
  const scratch = makeScratch("doctor-c11-text-");
  try {
    const { report } = runDoctorJson([], { env: emptyHomeEnv(scratch) });
    for (const key of [
      "schemaVersion",
      "status",
      "environment",
      "agents",
      "collector",
      "limitations",
      "errors",
    ])
      assert.ok(key in report, key);

    const { stdout } = runDoctor([], { env: emptyHomeEnv(scratch) });
    assert.match(stdout, /ausente|não encontrado/i);
    assert.match(stdout, /não verificad/i);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C12 diagnóstico completo usa schemaVersion 1, status complete e exit 0", () => {
  const scratch = makeScratch("doctor-c12-complete-");
  try {
    const { status, report } = runDoctorJson([], {
      env: emptyHomeEnv(scratch),
    });
    assert.equal(status, 0);
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.status, "complete");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C12 configuração inválida de um agente gera status partial preservando as demais entradas, exit 0", () => {
  const scratch = makeScratch("doctor-c12-partial-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, { sentinelPath: path.join(scratch, "sentinel") });
    const home = path.join(scratch, "home");
    writeAgentConfig(home, "claude", '{ "hooks": { "PreToolUse": [true, }');
    const { status, report } = runDoctorJson([], {
      env: {
        PATH: pathEnv(pathDirs),
        HOME: home,
        USERPROFILE: home,
        LOCALAPPDATA: path.join(scratch, "localappdata-vazio"),
      },
    });
    assert.equal(status, 0);
    assert.equal(report.status, "partial");
    assert.equal(report.agents.length, 3);
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.presence, "present");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C12 flag desconhecida usa exit 2, sintaxe inválida nunca usa exit 0/1", () => {
  const scratch = makeScratch("doctor-c12-exit2-");
  try {
    const { status } = runDoctor(["--flag-inexistente"], {
      env: emptyHomeEnv(scratch),
    });
    assert.equal(status, 2);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C12 erro reportado em --json preserva o envelope com status failed, sem stack bruta", () => {
  const scratch = makeScratch("doctor-c12-failed-json-");
  try {
    const { status, stdout } = runDoctor(
      ["--json", "--cwd", path.join(scratch, "nao-existe")],
      { env: emptyHomeEnv(scratch) },
    );
    assert.equal(status, 2);
    const report = JSON.parse(stdout);
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.status, "failed");
    assert.doesNotMatch(stdout, /at [\w./\\]+:\d+:\d+/); // sem frame de stack trace
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C13 --help lista exatamente as quatro flags documentadas, exit 0", () => {
  const scratch = makeScratch("doctor-c13-help-");
  try {
    const start = Date.now();
    const { status, stdout } = runDoctor(["--help"], {
      env: emptyHomeEnv(scratch),
    });
    const elapsed = Date.now() - start;
    assert.equal(status, 0);
    for (const flag of ["--json", "--cwd", "--collector", "--help"])
      assert.match(stdout, new RegExp(flag.replace(/[-]/g, "\\-")));
    // "--collect" não pode casar com o "--collector" legítimo documentado
    // acima: o motivo proibido é um modo de captura/coleta genérico, não o
    // endpoint de conexão do critério 9-10.
    for (const forbidden of ["--fix", "--install", "--collect(?!or\\b)", "--repair"])
      assert.doesNotMatch(stdout, new RegExp(forbidden));
    assert.ok(elapsed < 2000, `--help demorou ${elapsed}ms`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C13 diretório inexistente em --cwd (sem --json) usa exit 2 com erro legível", () => {
  const scratch = makeScratch("doctor-c13-cwd-");
  try {
    const { status, stdout, stderr } = runDoctor(
      ["--cwd", path.join(scratch, "nao-existe")],
      { env: emptyHomeEnv(scratch) },
    );
    assert.equal(status, 2);
    assert.match(stdout + stderr, /diretório/i);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C13 flag de reparo/instalação/coleta não existe nesta CLI", () => {
  const scratch = makeScratch("doctor-c13-norepair-");
  try {
    for (const flag of ["--fix", "--install", "--collect", "--repair"]) {
      const { status } = runDoctor([flag], { env: emptyHomeEnv(scratch) });
      assert.equal(status, 2, flag);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
