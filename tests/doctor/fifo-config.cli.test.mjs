// P2 nº4 da revisão formal8 (.checks/code-review/issue-3-formal8-response.json):
// fronteira real da CLI — um arquivo de configuração FIFO (ou link para FIFO)
// sem escritor conectado não pode bloquear o diagnóstico inteiro. runDoctor/
// runDoctorJson (helpers/spawn-doctor.mjs) já chamam spawnSync com
// timeout: 15_000, o protetor exigido para o RED (antes da correção) não
// travar este processo: ele mata o processo filho em vez de travar o runner.
// Não existe FIFO real no Windows, então este arquivo roda só em POSIX.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runDoctor, runDoctorJson } from "./helpers/spawn-doctor.mjs";

function homeEnv(home) {
  return {
    HOME: home,
    USERPROFILE: home,
    LOCALAPPDATA: path.join(home, "..", "localappdata-vazio"),
  };
}

function makeFifo(fifoPath) {
  execFileSync("mkfifo", [fifoPath]);
}

test(
  "fifo-config-formal8-4 .claude/settings.local.json como FIFO sem escritor não bloqueia: configuração inconclusiva, relatório partial, três agentes preservados",
  { skip: process.platform === "win32" },
  () => {
    const scratch = mkdtempSync(path.join(tmpdir(), "doctor-formal8-4-cli-fifo-"));
    try {
      const project = path.join(scratch, "projeto");
      mkdirSync(path.join(project, ".claude"), { recursive: true });
      const fifoPath = path.join(project, ".claude", "settings.local.json");
      makeFifo(fifoPath);
      const env = homeEnv(path.join(scratch, "home"));

      const started = Date.now();
      const { status, report } = runDoctorJson(["--cwd", project], { env });
      const elapsedMs = Date.now() - started;
      assert.ok(
        elapsedMs < 10_000,
        `diagnóstico não pode bloquear esperando um escritor do FIFO (levou ${elapsedMs}ms)`,
      );
      assert.equal(status, 0);
      assert.equal(report.status, "partial");
      assert.equal(report.agents.length, 3);
      assert.deepEqual(report.agents.map((a) => a.id), ["claude", "codex", "hermes"]);

      const claude = report.agents.find((a) => a.id === "claude");
      assert.equal(claude.configuration, "unknown");
      assert.equal(claude.configReasonCode, "policy_precedence_undetermined");
      assert.notEqual(claude.configuration, "configured");

      // O FIFO pertence só ao Claude (project_local); os demais agentes
      // continuam com seu próprio estado, sem contaminação (C12/isolamento).
      const codex = report.agents.find((a) => a.id === "codex");
      const hermes = report.agents.find((a) => a.id === "hermes");
      assert.equal(codex.configuration, "not_configured");
      assert.equal(hermes.configuration, "not_configured");

      const text = runDoctor(["--cwd", project], { env });
      assert.equal(text.status, 0);
      assert.match(text.stdout, /policy_precedence_undetermined/);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  },
);

test(
  "fifo-config-formal8-4 link simbólico para um FIFO no caminho de configuração recebe o mesmo tratamento, sem bloquear",
  { skip: process.platform === "win32" },
  () => {
    const scratch = mkdtempSync(path.join(tmpdir(), "doctor-formal8-4-cli-fifo-link-"));
    try {
      const project = path.join(scratch, "projeto");
      mkdirSync(path.join(project, ".claude"), { recursive: true });
      const realFifo = path.join(scratch, "real-fifo");
      makeFifo(realFifo);
      symlinkSync(realFifo, path.join(project, ".claude", "settings.local.json"));
      const env = homeEnv(path.join(scratch, "home"));

      const started = Date.now();
      const { status, report } = runDoctorJson(["--cwd", project], { env });
      assert.ok(Date.now() - started < 10_000, "link para FIFO não pode bloquear o diagnóstico");
      assert.equal(status, 0);
      assert.equal(report.status, "partial");
      assert.equal(report.agents.length, 3);
      const claude = report.agents.find((a) => a.id === "claude");
      assert.equal(claude.configuration, "unknown");
      assert.equal(claude.configReasonCode, "policy_precedence_undetermined");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  },
);
