import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { createNodeIo, runIntegrationCommand } from "../../src/integrations/install/run.mjs";
import { makeScratch } from "./helpers/cli.mjs";

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

const ORIGINAL = JSON.stringify({ env: { A: "1" }, hooks: { Stop: [{ hooks: [{ type: "command", command: "notify.sh" }] }] } }, null, 2) + "\n";

function target(label) {
  const dir = makeScratch(label);
  scratches.push(dir);
  const claude = path.join(dir, ".claude");
  mkdirSync(claude);
  writeFileSync(path.join(claude, "settings.json"), ORIGINAL);
  return claude;
}

test("I4-C30 edição externa entre a leitura e o rename vira conflito sem escrita", async () => {
  const dir = target("mid-apply");
  const settings = path.join(dir, "settings.json");
  const external = JSON.stringify({ env: { A: "editado por outro editor" } }, null, 2);
  const io = createNodeIo();
  // Um editor externo grava o arquivo depois da leitura usada para calcular a
  // mudança e antes do rename do conteúdo novo.
  const instrumented = {
    ...io,
    async writeExclusive(file, data) {
      await io.writeExclusive(file, data);
      if (path.basename(file).startsWith("settings.json")) writeFileSync(settings, external);
    },
  };
  const result = await runIntegrationCommand({ command: "install", agent: "claude", target: dir, apply: true, io: instrumented });
  assert.equal(result.exitCode, 4);
  assert.equal(result.status, "conflict");
  assert.deepEqual(result.conflicts.map((c) => c.code), ["config_changed_during_apply"]);
  assert.equal(readFileSync(settings, "utf8"), external, "conteúdo externo preservado, nada sobrescrito");
  assert.deepEqual(readdirSync(dir).sort(), ["settings.json"], "sem temporário, sem registro, sem lock");
});

test("I4-C33b falha ao gravar o registro depois da configuração não é declarada sucesso", async () => {
  const dir = target("manifest-fail");
  const io = createNodeIo();
  const instrumented = {
    ...io,
    async rename(from, to) {
      if (to.endsWith("claude-install.json")) {
        const error = new Error("falha de E/S simulada");
        error.code = "EIO";
        throw error;
      }
      return io.rename(from, to);
    },
  };
  const result = await runIntegrationCommand({ command: "install", agent: "claude", target: dir, apply: true, io: instrumented });
  assert.equal(result.exitCode, 5);
  assert.equal(result.status, "incomplete");
  assert.deepEqual(result.steps, [
    { step: "config", state: "done" },
    { step: "manifest", state: "failed" },
  ]);
  const written = JSON.parse(readFileSync(path.join(dir, "settings.json"), "utf8"));
  assert.equal(Object.keys(written.hooks).length, 9, "Stop de terceiro + 8 eventos próprios");
  assert.equal(existsSync(path.join(dir, ".skill-me", "claude-install.json")), false);
  assert.equal(existsSync(path.join(dir, ".skill-me", "claude.lock")), false, "lock liberado mesmo com falha");
});
