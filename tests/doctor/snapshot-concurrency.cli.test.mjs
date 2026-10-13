// C15 — duas execuções simultâneas sobre as mesmas fixtures não criam
// cache/lock/backup/estado e retornam os mesmos fatos, descontando
// timestamps. Fronteira externa real: dois processos CLI de verdade.
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import {
  installAllAgents,
  makeScratch,
  pathEnv,
} from "./helpers/fixture-agents.mjs";
import { inventory } from "./helpers/fs-inventory.mjs";
import { CLI_PATH } from "./helpers/spawn-doctor.mjs";

function emptyHomeEnv(scratch) {
  return {
    HOME: path.join(scratch, "home-vazio"),
    USERPROFILE: path.join(scratch, "home-vazio"),
    LOCALAPPDATA: path.join(scratch, "localappdata-vazio"),
  };
}

function stripTimestamp(report) {
  const copy = structuredClone(report);
  delete copy.environment.generatedAt;
  return copy;
}

test("snapshot-C15 duas execuções concorrentes retornam os mesmos fatos e não criam cache/lock/backup", async () => {
  const scratch = makeScratch("doctor-c15-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, { sentinelPath: path.join(scratch, "sentinel") });
    const env = { PATH: pathEnv(pathDirs), ...emptyHomeEnv(scratch) };
    const before = inventory(scratch);

    const run = () =>
      new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [CLI_PATH, "--json"], { env });
        let stdout = "";
        child.stdout.on("data", (chunk) => (stdout += chunk));
        child.on("error", reject);
        child.on("close", (status) => resolve({ status, stdout }));
      });

    // Ambos os processos são iniciados antes de qualquer await, garantindo
    // sobreposição real em vez de duas execuções sequenciais.
    const pending = [run(), run()];
    const [a, b] = await Promise.all(pending);
    assert.equal(a.status, 0);
    assert.equal(b.status, 0);
    const reportA = JSON.parse(a.stdout);
    const reportB = JSON.parse(b.stdout);
    assert.deepEqual(stripTimestamp(reportA), stripTimestamp(reportB));

    const after = inventory(scratch);
    assert.deepEqual(after, before);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
