// P2 nº4 da revisão formal8 (.checks/code-review/issue-3-formal8-response.json):
// createProductionFsAdapter().open() abria o arquivo de configuração com
// open(filePath, "r") antes de qualquer verificação de tipo — um FIFO (ou
// link para FIFO) sem escritor conectado bloqueia essa chamada indefinidamente
// (fifo(7): "opening for read-only access will succeed only after a process
// opens the same FIFO for writing" sem O_NONBLOCK). As duas provas de FIFO
// chamam o adaptador num PROCESSO FILHO isolado (fifo-open-probe.mjs) com
// spawnSync(..., { timeout }): se o RED ainda bloquear, o timeout mata o
// processo filho em vez de travar este runner de testes. Não existe FIFO real
// no Windows, então todo o arquivo roda só em POSIX.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createProductionFsAdapter } from "../../src/doctor/fs-adapter.mjs";

const PROBE_SCRIPT = path.resolve(import.meta.dirname, "helpers", "fifo-open-probe.mjs");
const PROBE_TIMEOUT_MS = 5000;

function makeFifo(fifoPath) {
  execFileSync("mkfifo", [fifoPath]);
}

function runProbe(targetPath) {
  const result = spawnSync(process.execPath, [PROBE_SCRIPT, targetPath], {
    encoding: "utf8",
    timeout: PROBE_TIMEOUT_MS,
  });
  return { stdout: (result.stdout ?? "").trim(), signal: result.signal, status: result.status };
}

test(
  "fs-adapter-formal8-4 abrir um FIFO sem escritor não bloqueia: recusa como não-regular, sem travar o processo",
  { skip: process.platform === "win32" },
  () => {
    const scratch = mkdtempSync(path.join(tmpdir(), "doctor-formal8-4-fifo-"));
    try {
      const fifoPath = path.join(scratch, "settings.local.json");
      makeFifo(fifoPath);
      const { stdout, signal } = runProbe(fifoPath);
      assert.equal(signal, null, "o processo filho não pode precisar ser morto por timeout");
      assert.equal(stdout, "REJECTED:ERR_NOT_REGULAR_FILE");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  },
);

test(
  "fs-adapter-formal8-4 link simbólico para um FIFO sem escritor recebe o mesmo tratamento, sem bloquear",
  { skip: process.platform === "win32" },
  () => {
    const scratch = mkdtempSync(path.join(tmpdir(), "doctor-formal8-4-fifo-link-"));
    try {
      const fifoPath = path.join(scratch, "real-fifo");
      makeFifo(fifoPath);
      const linkPath = path.join(scratch, "settings.local.json");
      symlinkSync(fifoPath, linkPath);
      const { stdout, signal } = runProbe(linkPath);
      assert.equal(signal, null, "o processo filho não pode precisar ser morto por timeout");
      assert.equal(stdout, "REJECTED:ERR_NOT_REGULAR_FILE");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  },
);

// Controle: um arquivo regular comum continua sendo aberto e lido
// normalmente, no mesmo processo (não há risco de bloqueio aqui) — a flag
// O_NONBLOCK e a checagem de tipo não afetam o caminho feliz.
test(
  "fs-adapter-formal8-4 controle: arquivo regular continua sendo aberto e lido normalmente",
  { skip: process.platform === "win32" },
  async () => {
    const scratch = mkdtempSync(path.join(tmpdir(), "doctor-formal8-4-regular-"));
    try {
      const filePath = path.join(scratch, "settings.local.json");
      writeFileSync(filePath, '{"hooks":{}}');
      const fs = createProductionFsAdapter();
      const handle = await fs.open(filePath);
      try {
        const buffer = Buffer.alloc(64);
        const { bytesRead } = await handle.read(buffer, 0, 64, 0);
        assert.equal(buffer.subarray(0, bytesRead).toString("utf8"), '{"hooks":{}}');
      } finally {
        await handle.close();
      }
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  },
);
