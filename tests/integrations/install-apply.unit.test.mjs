import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { replacementMode } from "../../src/integrations/install/io.mjs";
import { widenedRecipients } from "./helpers/posix-access.mjs";
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

test("I4-C25c regra pura: o arquivo que substitui a configuração não amplia o acesso de nenhum destinatário", () => {
  // Mesmo grupo do original: bits idênticos. Grupo diferente que não pôde ser
  // igualado: nenhum destinatário — só do grupo antigo, só do novo, dos dois ou
  // de nenhum — ganha acesso (contraexemplo do coordenador: 0604).
  const table = [
    [0o600, true, 0o600],
    [0o640, true, 0o640],
    [0o660, true, 0o660],
    [0o644, true, 0o644],
    [0o640, false, 0o600],
    [0o660, false, 0o600],
    [0o644, false, 0o644],
    [0o664, false, 0o644],
    [0o674, false, 0o644],
    [0o604, false, 0o600],
    [0o606, false, 0o600],
    [0o646, false, 0o644],
    [0o751, false, 0o711],
    [0o777, false, 0o777],
  ];
  for (const [mode, sameGroup, expected] of table) {
    assert.equal(replacementMode({ mode }, sameGroup), expected, `0${mode.toString(8)} sameGroup=${sameGroup}`);
  }
  for (let mode = 0; mode <= 0o777; mode += 1) {
    assert.equal(replacementMode({ mode }, true), mode);
    const regrouped = replacementMode({ mode }, false);
    assert.equal(regrouped & 0o700, mode & 0o700, `0${mode.toString(8)}: dono intacto`);
    assert.deepEqual(widenedRecipients({ mode, gid: 1 }, { mode: regrouped, gid: 2 }), [], `0${mode.toString(8)} → 0${regrouped.toString(8)}`);
  }
});
