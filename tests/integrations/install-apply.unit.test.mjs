import assert from "node:assert/strict";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { isDeepStrictEqual } from "node:util";
import { replacementMode } from "../../src/integrations/install/io.mjs";
import { widenedRecipients } from "./helpers/posix-access.mjs";
import { createNodeIo, runIntegrationCommand } from "../../src/integrations/install/run.mjs";
import { makeScratch } from "./helpers/cli.mjs";
import { sha256File, snapshotTree } from "./helpers/tree.mjs";

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

test("I4-C34c Hermes: pasta própria, __pycache__ ou artefato trocados durante a remoção não levam arquivos de outro plugin", async (t) => {
  // A troca acontece depois da leitura feita sob o lock. Logo após a remoção do
  // último artefato próprio, a pasta do plugin ou o `__pycache__` dela vira
  // junção (Windows) / symlink (POSIX) para outro plugin no alvo cujo bytecode
  // tem o nome do cache próprio; logo após o primeiro, `plugin.yaml` vira link de
  // arquivo para uma cópia idêntica no outro plugin. Antes de cada exclusão a
  // remoção reconfere.
  const ownArtifacts = ["__init__.py", "kwargs.json", "plugin.yaml"];
  const variants = [
    { swapped: "plugins/skill-me-observer", after: ownArtifacts.length, linkTo: (other) => other, type: "junction" },
    { swapped: "plugins/skill-me-observer/__pycache__", after: ownArtifacts.length, linkTo: (other) => path.join(other, "__pycache__"), type: "junction" },
    { swapped: "plugins/skill-me-observer/plugin.yaml", after: 1, linkTo: (other) => path.join(other, "plugin.yaml"), type: "file" },
  ];
  const observed = [];
  const expected = [];
  for (const { swapped, after: swapAfter, linkTo: linkTarget, type } of variants) {
    const dir = makeScratch("swap-during-uninstall");
    scratches.push(dir);
    if (type === "file") {
      try {
        symlinkSync(path.join(dir, "inexistente"), path.join(dir, "sonda de link de arquivo"), "file");
      } catch (error) {
        if (error.code !== "EPERM") throw error;
        t.diagnostic(`subcaso ${swapped} trocado por link de arquivo não executado: criar symlink de arquivo exige privilégio neste Windows (EPERM); coberto no Linux/WSL`);
        continue;
      }
    }
    const home = path.join(dir, "hermes home");
    const other = path.join(home, "plugins", "victim-plugin");
    mkdirSync(path.join(other, "__pycache__"), { recursive: true });
    writeFileSync(path.join(other, "__init__.py"), "# plugin sintético de terceiro\n");
    const otherBytecode = path.join(other, "__pycache__", "__init__.cpython-311.pyc");
    writeFileSync(otherBytecode, "bytecode sintético de terceiro\n");
    const io = createNodeIo();
    assert.equal((await runIntegrationCommand({ command: "install", agent: "hermes", target: home, apply: true, io })).exitCode, 0);
    const own = path.join(home, "plugins", "skill-me-observer");
    mkdirSync(path.join(own, "__pycache__"));
    writeFileSync(path.join(own, "__pycache__", "__init__.cpython-311.pyc"), "bytecode sintético próprio\n");
    copyFileSync(path.join(own, "plugin.yaml"), path.join(other, "plugin.yaml"));
    const manifest = path.join(home, ".skill-me", "hermes-install.json");
    const manifestBefore = readFileSync(manifest);
    const otherBefore = snapshotTree(other);
    const bytecodeHash = sha256File(otherBytecode);
    const swapPath = path.join(home, ...swapped.split("/"));
    const linkTo = linkTarget(other);
    let artifactsRemoved = 0;
    let swappedAt = null;
    const instrumented = {
      ...io,
      async unlink(file) {
        await io.unlink(file);
        const ownArtifact = path.basename(path.dirname(file)) === "skill-me-observer" && ownArtifacts.includes(path.basename(file));
        if (ownArtifact && ++artifactsRemoved === swapAfter) {
          renameSync(swapPath, path.join(dir, "movido"));
          symlinkSync(linkTo, swapPath, type);
          swappedAt = artifactsRemoved;
        }
      },
    };
    const result = await runIntegrationCommand({ command: "uninstall", agent: "hermes", target: home, apply: true, io: instrumented });
    assert.equal(swappedAt, swapAfter, `${swapped}: a troca aconteceu`);
    observed.push({
      swapped,
      exitCode: result.exitCode,
      status: result.status,
      conflicts: result.conflicts,
      otherBytecode: existsSync(otherBytecode) ? (sha256File(otherBytecode) === bytecodeHash ? "intacto" : "alterado") : "apagado",
      otherPluginIntact: existsSync(other) && isDeepStrictEqual(snapshotTree(other), otherBefore),
      linkKept: existsSync(swapPath) && lstatSync(swapPath).isSymbolicLink() && realpathSync(swapPath) === realpathSync(linkTo),
      manifestKept: existsSync(manifest) && readFileSync(manifest).equals(manifestBefore),
      lockReleased: !existsSync(path.join(home, ".skill-me", "hermes.lock")),
    });
    expected.push({
      swapped,
      exitCode: 4,
      status: "conflict",
      conflicts: [{ code: "config_changed_during_apply", file: swapped }],
      otherBytecode: "intacto",
      otherPluginIntact: true,
      linkKept: true,
      manifestKept: true,
      lockReleased: true,
    });
  }
  assert.deepEqual(observed, expected);
});

test("I4-C34g Hermes: fonte posta durante a remoção conserva o bytecode dela", async () => {
  // Depois da leitura sob o lock — logo após a exclusão do nosso `__init__.py`
  // ou, com a fonte registrada já ausente (bytecode órfão), do primeiro artefato —
  // o usuário põe uma fonte nova e o bytecode dela no lugar do cache próprio
  // (ou só a fonte, com o `__pycache__` próprio vazio). Antes de apagar o
  // bytecode e o `__pycache__` a remoção reconfere que a fonte continua ausente.
  const userSource = "# fonte sintética nova do usuário\n";
  const userBytecode = "bytecode sintético da fonte nova do usuário\n";
  const variants = [
    { label: "nossa fonte removida pela própria remoção", trigger: "__init__.py", recordedSourceAbsent: false, bytecode: true },
    { label: "fonte registrada já ausente", trigger: "kwargs.json", recordedSourceAbsent: true, bytecode: true },
    { label: "__pycache__ próprio vazio", trigger: "__init__.py", recordedSourceAbsent: false, bytecode: false },
  ];
  const observed = [];
  const expected = [];
  for (const { label, trigger, recordedSourceAbsent, bytecode: withBytecode } of variants) {
    const dir = makeScratch("source-during-uninstall");
    scratches.push(dir);
    const home = path.join(dir, "hermes home");
    mkdirSync(home);
    const io = createNodeIo();
    assert.equal((await runIntegrationCommand({ command: "install", agent: "hermes", target: home, apply: true, io })).exitCode, 0, label);
    const own = path.join(home, "plugins", "skill-me-observer");
    const cacheDir = path.join(own, "__pycache__");
    mkdirSync(cacheDir);
    const bytecode = path.join(cacheDir, "__init__.cpython-311.pyc");
    if (withBytecode) writeFileSync(bytecode, "bytecode sintético próprio\n");
    const source = path.join(own, "__init__.py");
    if (recordedSourceAbsent) renameSync(source, path.join(dir, "fonte própria movida.py"));
    const manifest = path.join(home, ".skill-me", "hermes-install.json");
    const manifestBefore = readFileSync(manifest);
    let raced = false;
    const instrumented = {
      ...io,
      async unlink(file) {
        await io.unlink(file);
        if (!raced && path.basename(path.dirname(file)) === "skill-me-observer" && path.basename(file) === trigger) {
          raced = true;
          writeFileSync(source, userSource);
          if (withBytecode) writeFileSync(bytecode, userBytecode);
        }
      },
    };
    const result = await runIntegrationCommand({ command: "uninstall", agent: "hermes", target: home, apply: true, io: instrumented });
    observed.push({
      label,
      raced,
      exitCode: result.exitCode,
      status: result.status,
      conflicts: result.conflicts,
      source: existsSync(source) && readFileSync(source, "utf8") === userSource,
      cacheLeft: existsSync(cacheDir)
        ? readdirSync(cacheDir).map((name) => `${name}: ${readFileSync(path.join(cacheDir, name), "utf8") === userBytecode ? "do usuário, intacto" : "outro conteúdo"}`)
        : "apagado",
      manifestKept: existsSync(manifest) && readFileSync(manifest).equals(manifestBefore),
      lockReleased: !existsSync(path.join(home, ".skill-me", "hermes.lock")),
    });
    expected.push({
      label,
      raced: true,
      exitCode: 4,
      status: "conflict",
      conflicts: [{ code: "config_changed_during_apply", file: "plugins/skill-me-observer/__init__.py" }],
      source: true,
      cacheLeft: withBytecode ? ["__init__.cpython-311.pyc: do usuário, intacto"] : [],
      manifestKept: true,
      lockReleased: true,
    });
  }
  assert.deepEqual(observed, expected);
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
