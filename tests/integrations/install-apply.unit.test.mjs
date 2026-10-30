import assert from "node:assert/strict";
import { appendFileSync, chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { isDeepStrictEqual } from "node:util";
import { replacementMode } from "../../src/integrations/install/io.mjs";
import { parseConfig, planJsonInstall, planJsonUninstall } from "../../src/integrations/install/json-hooks.mjs";
import { widenedAclRecipients, widenedRecipients } from "./helpers/posix-access.mjs";
import { rawAcl, readAcl, removeAcl, setAcl } from "./helpers/posix-acl.mjs";
import { createNodeIo, runIntegrationCommand } from "../../src/integrations/install/run.mjs";
import { INTEGRATIONS_CLI, makeScratch, REPO_ROOT } from "./helpers/cli.mjs";
import { readClaudeHandlers, readCodexHandlers } from "./helpers/installed-hooks.mjs";
import { sha256File, snapshotTree } from "./helpers/tree.mjs";
import { grantsOf, readAces, sddlAces, setDacl, widenedSids } from "./helpers/windows-acl.mjs";

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

// `os.tmpdir()` lê TEMP/TMP (Windows) ou TMPDIR (POSIX) a cada chamada: troca
// síncrona, sem await no meio, restaurada como estava.
function withTempDir(dir, fn) {
  const saved = ["TEMP", "TMP", "TMPDIR"].map((key) => [key, process.env[key]]);
  for (const [key] of saved) process.env[key] = dir;
  try {
    return fn();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

// As intervenções deste arquivo comparam o caminho absoluto montado pelo teste
// com o que o instalador passa ao io (`file === tmp`, `from === deny`…). Na CI
// Windows do PR #16 (run 39071778945) o TEMP tinha um nome curto 8.3
// (`C:\Users\RUNNER~1\…`): o instalador resolve o alvo para o nome longo e 12
// testes falharam sem que nenhuma intervenção disparasse (makeScratch, em
// helpers/cli.mjs). Alias sintético de uma pasta própria no lugar do TEMP —
// nome curto 8.3 e letra de unidade minúscula (Windows), link simbólico
// (POSIX): o scratch criado sob ele é o caminho real que o instalador resolve
// e a intervenção pelo caminho do temporário da configuração dispara na
// criação e no rename.
test("I4-C30f scratch das provas no caminho real que o instalador resolve: alias no TEMP não desarma intervenções por caminho", async (t) => {
  const base = makeScratch("temp alias");
  scratches.push(base);
  const longDir = path.join(base, "temporario-longo-da-prova");
  mkdirSync(longDir);
  const aliases = [];
  if (process.platform === "win32") {
    // Única entrada de uma pasta nova: o NTFS lhe dá o nome curto `TEMPOR~1`.
    const short = path.join(base, "TEMPOR~1");
    if (existsSync(short) && realpathSync.native(short) === longDir) aliases.push(["nome curto 8.3", short]);
    else t.diagnostic("linha do nome curto 8.3 não executada: o volume do TEMP não gerou TEMPOR~1 (nomes curtos desligados ou outro algoritmo)");
    if (/^[A-Z]:\\/.test(longDir)) aliases.push(["letra de unidade minúscula", longDir[0].toLowerCase() + longDir.slice(1)]);
    else t.diagnostic("linha da letra de unidade não executada: o TEMP não está numa unidade com letra");
  } else {
    const link = path.join(base, "temp por link");
    symlinkSync(longDir, link, "dir");
    aliases.push(["link simbólico", link]);
  }
  const io = createNodeIo();
  const observed = [];
  const expected = [];
  for (const [label, alias] of aliases) {
    const scratch = withTempDir(alias, () => makeScratch("sob alias"));
    const dir = path.join(scratch, ".claude");
    mkdirSync(dir);
    writeFileSync(path.join(dir, "settings.json"), ORIGINAL);
    const tmp = path.join(dir, "settings.json.skill-me-tmp");
    const hits = { writeExclusive: 0, rename: 0 };
    const instrumented = {
      ...io,
      async writeExclusive(file, data, options) {
        if (file === tmp) hits.writeExclusive += 1;
        return io.writeExclusive(file, data, options);
      },
      async rename(from, to) {
        if (from === tmp) hits.rename += 1;
        return io.rename(from, to);
      },
    };
    const result = await runIntegrationCommand({ command: "install", agent: "claude", target: dir, apply: true, io: instrumented });
    observed.push({
      alias: label,
      aliasIsAnotherSpelling: alias !== longDir,
      createdUnderAlias: realpathSync.native(path.dirname(scratch)) === longDir,
      scratchIsRealPath: scratch === (await io.realpath(scratch)),
      hits,
      exitCode: result.exitCode,
      ownEvents: Object.keys(readClaudeHandlers(dir)).length,
    });
    expected.push({ alias: label, aliasIsAnotherSpelling: true, createdUnderAlias: true, scratchIsRealPath: true, hits: { writeExclusive: 1, rename: 1 }, exitCode: 0, ownEvents: 8 });
  }
  assert.ok(aliases.length > 0, "ao menos um alias executado");
  assert.deepEqual(observed, expected);
});

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

// Mudança no temporário de nome fixo depois da leitura feita sob o lock: posto
// por outro antes da criação exclusiva, editado ou trocado depois dela, ou
// trocado com o rename falhando. O arquivo do usuário nunca é apagado nem
// promovido a configuração/registro; na falha de E/S só sai o temporário que
// continua nosso (controle). Configuração e registro: Claude, Codex, Hermes.
const USER_TEMP = '{ "recuperado": "cópia sintética do usuário" }\n';
const CODEX_ORIGINAL = JSON.stringify({ description: "team hooks", hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "python3 policy.py" }] }] } }, null, 2) + "\n";
const failEio = () => Object.assign(new Error("falha de E/S simulada"), { code: "EIO" });

test("I4-C30c temporário posto, editado ou trocado durante a aplicação não é apagado nem promovido", async () => {
  let codexInstalled = null;
  const temps = [
    {
      label: "Claude, instalação, temporário da configuração",
      agent: "claude",
      op: "install",
      rel: "settings.json.skill-me-tmp",
      step: "config",
      stepsBefore: [],
      prepare: () => target("tmp-race-claude-config"),
      state: (dir) => (readFileSync(path.join(dir, "settings.json"), "utf8") === ORIGINAL && !existsSync(path.join(dir, ".skill-me", "claude-install.json")) ? "configuração original, sem registro" : "alterado"),
      expectedState: "configuração original, sem registro",
    },
    {
      label: "Claude, instalação, temporário do registro",
      agent: "claude",
      op: "install",
      rel: ".skill-me/claude-install.json.skill-me-tmp",
      step: "manifest",
      stepsBefore: [{ step: "config", state: "done" }],
      prepare: () => target("tmp-race-claude-manifest"),
      state: (dir) =>
        Object.keys(readClaudeHandlers(dir)).length === 8 && !existsSync(path.join(dir, ".skill-me", "claude-install.json")) ? "configuração gravada, sem registro" : "outro estado",
      expectedState: "configuração gravada, sem registro",
    },
    {
      label: "Codex, remoção, temporário da configuração",
      agent: "codex",
      op: "uninstall",
      rel: "hooks.json.skill-me-tmp",
      step: "config",
      stepsBefore: [],
      prepare: async () => {
        const dir = path.join(makeScratch("tmp-race-codex"), ".codex");
        scratches.push(path.dirname(dir));
        mkdirSync(dir);
        writeFileSync(path.join(dir, "hooks.json"), CODEX_ORIGINAL);
        assert.equal((await runIntegrationCommand({ command: "install", agent: "codex", target: dir, apply: true, io: createNodeIo() })).exitCode, 0);
        codexInstalled = { hooks: readFileSync(path.join(dir, "hooks.json")), manifest: readFileSync(path.join(dir, ".skill-me", "codex-install.json")) };
        return dir;
      },
      state: (dir) =>
        readFileSync(path.join(dir, "hooks.json")).equals(codexInstalled.hooks) && readFileSync(path.join(dir, ".skill-me", "codex-install.json")).equals(codexInstalled.manifest)
          ? "hooks.json e registro da instalação intactos"
          : "alterado",
      expectedState: "hooks.json e registro da instalação intactos",
    },
    {
      label: "Hermes, instalação, temporário do registro",
      agent: "hermes",
      op: "install",
      rel: ".skill-me/hermes-install.json.skill-me-tmp",
      step: "manifest",
      stepsBefore: [{ step: "artifacts", state: "done" }],
      prepare: () => {
        const dir = path.join(makeScratch("tmp-race-hermes"), "hermes home");
        scratches.push(path.dirname(dir));
        mkdirSync(dir);
        return dir;
      },
      state: (dir) =>
        existsSync(path.join(dir, "plugins", "skill-me-observer", "__init__.py")) && !existsSync(path.join(dir, ".skill-me", "hermes-install.json")) ? "artefatos gravados, sem registro" : "outro estado",
      expectedState: "artefatos gravados, sem registro",
    },
  ];
  const mutations = ["posto antes da criação", "editado depois da criação", "trocado depois da criação", "trocado e o rename falha", "controle: rename falha com o temporário nosso"];
  const observed = [];
  const expected = [];
  for (const temp of temps) {
    for (const mutation of mutations) {
      const dir = await temp.prepare();
      const tmp = path.join(dir, ...temp.rel.split("/"));
      const moved = path.join(path.dirname(dir), "temporário próprio movido");
      const io = createNodeIo();
      let mutated = false;
      const putUserTemp = () => {
        writeFileSync(tmp, USER_TEMP);
        mutated = true;
      };
      const instrumented = {
        ...io,
        async writeExclusive(file, data, options) {
          if (file === tmp && mutation === "posto antes da criação") putUserTemp();
          await io.writeExclusive(file, data, options);
          if (file === tmp && mutation === "editado depois da criação") putUserTemp();
          if (file === tmp && mutation === "trocado depois da criação") {
            renameSync(tmp, moved);
            putUserTemp();
          }
        },
        async rename(from, to) {
          if (from === tmp && mutation === "trocado e o rename falha") {
            renameSync(tmp, moved);
            putUserTemp();
            throw failEio();
          }
          if (from === tmp && mutation.startsWith("controle")) {
            mutated = true;
            throw failEio();
          }
          return io.rename(from, to);
        },
      };
      const result = await runIntegrationCommand({ command: temp.op, agent: temp.agent, target: dir, apply: true, io: instrumented });
      observed.push({
        case: `${temp.label} — ${mutation}`,
        mutated,
        exitCode: result.exitCode,
        status: result.status,
        conflicts: result.conflicts,
        errors: result.errors,
        steps: result.steps,
        atTemp: existsSync(tmp) ? (readFileSync(tmp, "utf8") === USER_TEMP ? "arquivo do usuário intacto" : "outro conteúdo") : "nada",
        state: temp.state(dir),
        lockReleased: !existsSync(path.join(dir, ".skill-me", `${temp.agent}.lock`)),
      });
      const failedStep = [...temp.stepsBefore, { step: temp.step, state: "failed" }];
      const outcome = {
        "posto antes da criação": { exitCode: 4, status: "conflict", conflicts: [{ code: "foreign_artifact", file: temp.rel }], errors: [], steps: temp.stepsBefore, atTemp: "arquivo do usuário intacto" },
        "editado depois da criação": { exitCode: 4, status: "conflict", conflicts: [{ code: "config_changed_during_apply", file: temp.rel }], errors: [], steps: temp.stepsBefore, atTemp: "arquivo do usuário intacto" },
        "trocado depois da criação": { exitCode: 4, status: "conflict", conflicts: [{ code: "config_changed_during_apply", file: temp.rel }], errors: [], steps: temp.stepsBefore, atTemp: "arquivo do usuário intacto" },
        "trocado e o rename falha": { exitCode: 5, status: "incomplete", conflicts: [], errors: [{ code: "EIO" }], steps: failedStep, atTemp: "arquivo do usuário intacto" },
        "controle: rename falha com o temporário nosso": { exitCode: 5, status: "incomplete", conflicts: [], errors: [{ code: "EIO" }], steps: failedStep, atTemp: "nada" },
      }[mutation];
      expected.push({ case: `${temp.label} — ${mutation}`, mutated: true, ...outcome, state: temp.expectedState, lockReleased: true });
    }
  }
  assert.deepEqual(observed, expected);
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
    const traced = rejectionTrace(io, home);
    const installed = await runIntegrationCommand({ command: "install", agent: "hermes", target: home, apply: true, io: traced.io });
    assert.equal(installed.exitCode, 0, installed.exitCode === 0 ? label : installEvidence(label, installed, traced.rejected));
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

test("I4-C25e plano puro: chaves JSON __proto__ ficam próprias nos textos planejados de instalação e remoção", () => {
  // Decisão na própria camada, sem sistema de arquivos: o texto que os planos
  // mandam gravar mantém cada `__proto__` do usuário como propriedade própria
  // (raiz e aninhada; string e objeto) e o protótipo dos objetos intacto. A raiz
  // do Claude traz um objeto `__proto__` com chave `hooks` e nenhum `hooks`
  // próprio: os grupos próprios precisam ir para um `hooks` próprio.
  const ctx = { nodePath: "/usr/bin/node", cliPath: "/opt/skill-me/cli.mjs", platform: "linux" };
  const cases = [
    {
      agent: "claude",
      text: '{\n  "__proto__": { "hooks": { "Stop": [] }, "nota": "objeto do usuário" },\n  "env": { "__proto__": "valor-do-usuario", "FOO": "bar" },\n  "ratio": 1.50\n}\n',
      places: [
        [[], { hooks: { Stop: [] }, nota: "objeto do usuário" }],
        [["env"], "valor-do-usuario"],
      ],
      events: 8,
    },
    {
      agent: "codex",
      text: '{\n  "hooks": {\n    "PreToolUse": [ { "matcher": "Bash", "__proto__": "texto do usuário", "hooks": [ { "type": "command", "command": "policy", "__proto__": { "x": 1 } } ] } ]\n  }\n}\n',
      places: [
        [["hooks", "PreToolUse", 0], "texto do usuário"],
        [["hooks", "PreToolUse", 0, "hooks", 0], { x: 1 }],
      ],
      events: 6,
    },
  ];
  const describe = (doc, places) =>
    places.map(([at]) => {
      const node = at.reduce((value, key) => value[key], doc);
      return [at.join("."), Object.hasOwn(node, "__proto__") ? node["__proto__"] : "<ausente>", Object.getPrototypeOf(node) === Object.prototype];
    });
  for (const { agent, text, places, events } of cases) {
    const want = places.map(([at, value]) => [at.join("."), value, true]);
    const install = planJsonInstall({ agent, parsed: parseConfig(agent, text, "linux"), manifest: null, ctx });
    const installed = JSON.parse(install.newText);
    assert.deepEqual(describe(installed, places), want, `${agent}: texto planejado da instalação`);
    assert.ok(Object.hasOwn(installed, "hooks"), `${agent}: hooks próprio`);
    const ownEvents = Object.keys(installed.hooks).filter((event) => installed.hooks[event].some((group) => JSON.stringify(group).includes(ctx.cliPath)));
    assert.equal(ownEvents.length, events, `${agent}: grupos próprios no texto planejado`);

    const manifest = { entries: install.manifestBody.entries, created: install.manifestBody.created };
    const uninstall = planJsonUninstall({ agent, parsed: parseConfig(agent, install.newText, "linux"), manifest, ctx });
    const restored = JSON.parse(uninstall.newText);
    assert.deepEqual(describe(restored, places), want, `${agent}: texto planejado da remoção`);
    assert.deepEqual(restored, JSON.parse(text), `${agent}: remoção planeja os valores originais`);
    if (agent === "claude") assert.ok(uninstall.newText.includes('"ratio": 1.50'), "token numérico preservado");
  }
});

// Windows: substituir um arquivo que outro processo mantém aberto falha com
// EPERM/EACCES/EBUSY enquanto o handle existe (6 aplicações paralelas de
// I4-C29 bastam). Simulado aqui pelo `rename` instrumentado, nas duas
// plataformas: novas tentativas curtas, cada uma depois de refazer as
// conferências do temporário e da configuração. O limite de tempo é o das
// esperas entre tentativas (no máximo 630 ms): o tempo de `accessOf` e de
// `writeExclusive` (leitura do acesso, criação dos temporários e do lock) fica
// de fora — no Windows, ler e aplicar a DACL são processos do PowerShell, um
// por conferência (revisão formal round 4), que nada têm a ver com essas
// esperas; no POSIX são `stat`/`open`.
test("I4-C29b substituição negada por handle aberto é repetida, refazendo as conferências antes de cada tentativa", async () => {
  const deny = (code) => Object.assign(new Error(`${code} simulado`), { code });
  const scenarios = [
    { label: "EPERM duas vezes, depois passa", temp: "config", denials: ["EPERM", "EPERM"] },
    { label: "EACCES uma vez, depois passa", temp: "config", denials: ["EACCES"] },
    { label: "EBUSY uma vez, depois passa", temp: "config", denials: ["EBUSY"] },
    { label: "registro: EPERM uma vez, depois passa", temp: "manifest", denials: ["EPERM"] },
    { label: "negado e temporário trocado antes da nova tentativa", temp: "config", denials: ["EPERM"], during: "swap" },
    { label: "negado e configuração editada antes da nova tentativa", temp: "config", denials: ["EPERM"], during: "edit" },
    { label: "sempre negado", temp: "config", denials: Array(20).fill("EPERM") },
    { label: "EIO não é repetido", temp: "config", denials: ["EIO"] },
  ];
  const observed = [];
  for (const { label, temp, denials, during } of scenarios) {
    const dir = target(`rename-denied-${temp}`);
    const settings = path.join(dir, "settings.json");
    const tmp = temp === "config" ? `${settings}.skill-me-tmp` : path.join(dir, ".skill-me", "claude-install.json.skill-me-tmp");
    const io = createNodeIo();
    let attempts = 0;
    let accessMs = 0;
    const timed = (op) => async (...args) => {
      const before = Date.now();
      try {
        return await io[op](...args);
      } finally {
        accessMs += Date.now() - before;
      }
    };
    const instrumented = {
      ...io,
      accessOf: timed("accessOf"),
      writeExclusive: timed("writeExclusive"),
      async rename(from, to) {
        if (from !== tmp) return io.rename(from, to);
        attempts += 1;
        if (attempts > denials.length) return io.rename(from, to);
        if (during === "swap") {
          renameSync(tmp, path.join(path.dirname(dir), "temporário próprio movido"));
          writeFileSync(tmp, USER_TEMP);
        }
        if (during === "edit") writeFileSync(settings, JSON.stringify({ env: { A: "editado durante a espera" } }, null, 2));
        throw deny(denials[attempts - 1]);
      },
    };
    const started = Date.now();
    const result = await runIntegrationCommand({ command: "install", agent: "claude", target: dir, apply: true, io: instrumented });
    const settingsText = readFileSync(settings, "utf8");
    observed.push({
      label,
      attempts,
      exitCode: result.exitCode,
      status: result.status,
      conflicts: result.conflicts,
      errors: result.errors,
      steps: result.steps.map((s) => `${s.step}:${s.state}`),
      atTemp: existsSync(tmp) ? (readFileSync(tmp, "utf8") === USER_TEMP ? "arquivo do usuário intacto" : "outro conteúdo") : "nada",
      settings: settingsText === ORIGINAL ? "original" : settingsText.includes("editado durante a espera") ? "edição externa preservada" : Object.keys(JSON.parse(settingsText).hooks ?? {}).length === 9 ? "instalada" : "outro",
      waitedUnderOneSecond: Date.now() - started - accessMs < 1000 + 500,
    });
  }
  const done = ["config:done", "manifest:done"];
  assert.deepEqual(observed, [
    { label: "EPERM duas vezes, depois passa", attempts: 3, exitCode: 0, status: "applied", conflicts: [], errors: [], steps: done, atTemp: "nada", settings: "instalada", waitedUnderOneSecond: true },
    { label: "EACCES uma vez, depois passa", attempts: 2, exitCode: 0, status: "applied", conflicts: [], errors: [], steps: done, atTemp: "nada", settings: "instalada", waitedUnderOneSecond: true },
    { label: "EBUSY uma vez, depois passa", attempts: 2, exitCode: 0, status: "applied", conflicts: [], errors: [], steps: done, atTemp: "nada", settings: "instalada", waitedUnderOneSecond: true },
    { label: "registro: EPERM uma vez, depois passa", attempts: 2, exitCode: 0, status: "applied", conflicts: [], errors: [], steps: done, atTemp: "nada", settings: "instalada", waitedUnderOneSecond: true },
    {
      label: "negado e temporário trocado antes da nova tentativa",
      attempts: 1,
      exitCode: 4,
      status: "conflict",
      conflicts: [{ code: "config_changed_during_apply", file: "settings.json.skill-me-tmp" }],
      errors: [],
      steps: [],
      atTemp: "arquivo do usuário intacto",
      settings: "original",
      waitedUnderOneSecond: true,
    },
    {
      label: "negado e configuração editada antes da nova tentativa",
      attempts: 1,
      exitCode: 4,
      status: "conflict",
      conflicts: [{ code: "config_changed_during_apply", file: "settings.json" }],
      errors: [],
      steps: [],
      atTemp: "nada",
      settings: "edição externa preservada",
      waitedUnderOneSecond: true,
    },
    { label: "sempre negado", attempts: 7, exitCode: 5, status: "incomplete", conflicts: [], errors: [{ code: "EPERM" }], steps: ["config:failed"], atTemp: "nada", settings: "original", waitedUnderOneSecond: true },
    { label: "EIO não é repetido", attempts: 1, exitCode: 5, status: "incomplete", conflicts: [], errors: [{ code: "EIO" }], steps: ["config:failed"], atTemp: "nada", settings: "original", waitedUnderOneSecond: true },
  ]);
});

// A contenção roda fora do lock: o temporário transitório de outro processo do
// skill-me pode existir no `lstat` e já ter sido renomeado no `realpath`. A
// entrada que sumiu uma vez é sondada de novo (agora ausente), em vez de virar
// falha de E/S; a aplicação segue. Instável em sondagens sucessivas (o `lstat`
// sempre a encontra, o `realpath` sempre devolve ENOENT), a repetição é
// limitada e termina em conflito sem efeito — nota do coordenador sobre o laço
// sem progresso. O instrumento para de oscilar depois de 1000 chamadas, só
// para que uma repetição sem limite também termine e possa ser contada.
test("I4-C29c entrada que some entre o lstat e o realpath da contenção é sondada de novo, com limite", async () => {
  const UNSTABLE_CAP = 1000;
  const observed = [];
  const expected = [];
  for (const rel of ["settings.json.skill-me-tmp", ".skill-me/claude-install.json.skill-me-tmp"]) {
    for (const mode of ["some uma vez", "instável em sondagens sucessivas"]) {
      const dir = target("vanishing-temp");
      const transient = path.join(dir, ...rel.split("/"));
      mkdirSync(path.dirname(transient), { recursive: true });
      writeFileSync(transient, "temporário transitório de outro processo\n");
      const io = createNodeIo();
      let realpathCalls = 0;
      const instrumented = {
        ...io,
        async realpath(file) {
          if (file !== transient || !existsSync(transient)) return io.realpath(file);
          realpathCalls += 1;
          if (mode === "some uma vez" || realpathCalls > UNSTABLE_CAP) {
            // `unlink`, não `rmSync`: no Windows, o do Node 24 até 24.13.0 não
            // apaga num caminho com "ação" e não lança (nodejs/node#56049).
            unlinkSync(transient);
            return io.realpath(file);
          }
          throw Object.assign(new Error("ENOENT simulado: a entrada sumiu de novo"), { code: "ENOENT" });
        },
      };
      const result = await runIntegrationCommand({ command: "install", agent: "claude", target: dir, apply: true, io: instrumented });
      observed.push({
        case: `${rel} — ${mode}`,
        realpathCalls,
        exitCode: result.exitCode,
        status: result.status,
        errors: result.errors,
        conflicts: result.conflicts,
        events: Object.keys(readClaudeHandlers(dir)).length,
        manifest: existsSync(path.join(dir, ".skill-me", "claude-install.json")),
      });
      expected.push(
        mode === "some uma vez"
          ? { case: `${rel} — ${mode}`, realpathCalls: 1, exitCode: 0, status: "applied", errors: [], conflicts: [], events: 8, manifest: true }
          : {
              case: `${rel} — ${mode}`,
              realpathCalls: 4,
              exitCode: 4,
              status: "conflict",
              errors: [],
              // Caminho relativo como no `target_escape` da mesma função (separador da plataforma).
              conflicts: [{ code: "config_changed_during_read", file: rel.split("/").join(path.sep) }],
              events: 0,
              manifest: false,
            },
      );
    }
  }
  assert.deepEqual(observed, expected);
});

// Registro, lock e pasta de estado mexidos por outro programa durante a
// aplicação — achados R5-F1/F2/F3 da verificação independente round 5. A
// mutação acontece depois do passo anterior real (rename da configuração;
// pasta do plugin no Hermes), logo depois de criar o lock ou numa nova
// tentativa do rename. Os arquivos postos são sintéticos; os próprios são
// movidos para fora do alvo e conferidos depois. Nada que outro programa pôs ou
// mudou é apagado ou sobrescrito, e o que já foi aplicado continua reportado.
const USER_FILE = "dados sintéticos novos do usuário\n";
const USER_EDIT = "\nedição sintética do usuário\n";
const OWN_LOCK = `${process.pid}\n`;
const DIR_LINK = process.platform === "win32" ? "junction" : "dir";
const OWN_ARTIFACTS = ["__init__.py", "kwargs.json", "plugin.yaml"];
const CONFIG_OF = { claude: "settings.json", codex: "hooks.json" };
const simulated = (code) => Object.assign(new Error(`${code} simulado`), { code });

// Symlink de arquivo exige privilégio no Windows: as linhas que o usam ficam
// de fora com diagnóstico e rodam no Linux/WSL.
let fileLinks;
function fileLinksAllowed() {
  if (fileLinks === undefined) {
    const dir = makeScratch("sonda link de arquivo");
    scratches.push(dir);
    try {
      symlinkSync(path.join(dir, "inexistente"), path.join(dir, "sonda"), "file");
      fileLinks = true;
    } catch (error) {
      if (error.code !== "EPERM") throw error;
      fileLinks = false;
    }
  }
  return fileLinks;
}

function isSymlink(file) {
  try {
    return lstatSync(file).isSymbolicLink();
  } catch {
    return false;
  }
}

// O que está num caminho, sem seguir link.
function describeEntry(file) {
  let stats;
  try {
    stats = lstatSync(file);
  } catch (error) {
    if (error.code === "ENOENT") return "ausente";
    throw error;
  }
  if (stats.isSymbolicLink()) return existsSync(file) ? `link → ${path.basename(realpathSync(file))}` : "link pendente";
  if (stats.isDirectory()) return `diretório [${readdirSync(file).sort().map((name) => `${name}: ${describeEntry(path.join(file, name))}`).join("; ")}]`;
  const text = readFileSync(file, "utf8");
  if (text === USER_FILE) return "arquivo do usuário intacto";
  if (text.endsWith(USER_EDIT)) return "edição do usuário intacta";
  if (text === OWN_LOCK) return "lock próprio";
  try {
    const body = JSON.parse(text);
    if (body.tool === "skill-me") return `registro próprio (${(body.entries ?? body.artifacts).length})`;
  } catch {
    // Não é registro.
  }
  return "outro conteúdo";
}

// `label` descreve a linha da tabela; o scratch usa só o que é válido em nome de arquivo.
function freshTarget(agent, label) {
  const scratchLabel = `r5 ${label}`.replace(/[\\/:*?"<>|,—]+/g, " ").replace(/\s+/g, " ").slice(0, 60).trim();
  if (agent === "claude") return target(scratchLabel);
  const dir = path.join(makeScratch(scratchLabel), agent === "codex" ? ".codex" : "hermes home");
  scratches.push(path.dirname(dir));
  mkdirSync(dir);
  if (agent === "codex") writeFileSync(path.join(dir, "hooks.json"), CODEX_ORIGINAL);
  return dir;
}

// Instalado; `partial`: uma entrada própria editada, para que a remoção
// regrave o registro só com ela.
async function installedTarget(agent, label, { partial = false } = {}) {
  const dir = freshTarget(agent, label);
  assert.equal((await runIntegrationCommand({ command: "install", agent, target: dir, apply: true, io: createNodeIo() })).exitCode, 0, label);
  if (partial && agent === "hermes") {
    appendFileSync(path.join(dir, "plugins", "skill-me-observer", "kwargs.json"), "\n");
  } else if (partial) {
    const file = path.join(dir, CONFIG_OF[agent]);
    const doc = JSON.parse(readFileSync(file, "utf8"));
    doc.hooks.PreToolUse.at(-1).hooks[0].timeout = 99;
    writeFileSync(file, JSON.stringify(doc, null, 2));
  }
  return dir;
}

const partialConflict = (agent) =>
  agent === "hermes"
    ? { code: "owned_entry_modified", file: "plugins/skill-me-observer/kwargs.json" }
    : { code: "owned_entry_modified", file: CONFIG_OF[agent], event: "PreToolUse" };

// Estado do que é próprio no alvo, lido sem confiar no instalador.
function ownState(agent, dir) {
  if (agent === "hermes") {
    const plugin = path.join(dir, "plugins", "skill-me-observer");
    return existsSync(plugin) ? readdirSync(plugin).sort().join(",") : "sem pasta do plugin";
  }
  return `${Object.keys(agent === "claude" ? readClaudeHandlers(dir) : readCodexHandlers(dir)).length} eventos próprios`;
}
const ownStateAfter = (agent, op, partial) => {
  if (agent === "hermes") return op === "install" ? OWN_ARTIFACTS.join(",") : partial ? "kwargs.json" : "sem pasta do plugin";
  if (op === "install") return `${agent === "claude" ? 8 : 6} eventos próprios`;
  return partial ? "1 eventos próprios" : "0 eventos próprios";
};
const previousStep = (agent) => ({ step: agent === "hermes" ? "artifacts" : "config", state: "done" });

// io real com uma mutação disparada uma vez: depois do passo anterior ao
// registro (`after: "step"`), logo depois de criar `afterCreate`, ou na primeira
// tentativa de rename de `deny`, que então falha com EPERM e é repetida.
function mutatingIo(agent, op, dir, { after, afterCreate, deny, failRenameTo, failUnlink, partial = false }, mutate) {
  const io = createNodeIo();
  const probe = { mutated: false, attempts: 0 };
  const fire = () => {
    if (probe.mutated || !mutate) return;
    probe.mutated = true;
    mutate();
  };
  const pluginDir = path.join(dir, "plugins", "skill-me-observer");
  const stepRenamedTo = agent === "hermes" ? pluginDir : path.join(dir, CONFIG_OF[agent] ?? "");
  // Remoção Hermes: o passo anterior termina com a exclusão do último artefato do plano.
  const removalsBeforeManifest = partial ? OWN_ARTIFACTS.length - 1 : OWN_ARTIFACTS.length;
  let artifactsRemoved = 0;
  return {
    probe,
    io: {
      ...io,
      async writeExclusive(file, data, options) {
        await io.writeExclusive(file, data, options);
        if (file === afterCreate) fire();
      },
      async rename(from, to) {
        if (from === deny && probe.attempts++ === 0) {
          fire();
          throw simulated("EPERM");
        }
        if (to === failRenameTo) throw simulated("EIO");
        await io.rename(from, to);
        if (after === "step" && !(agent === "hermes" && op === "uninstall") && to === stepRenamedTo) fire();
      },
      async unlink(file) {
        if (file === failUnlink) throw simulated("EACCES");
        await io.unlink(file);
        const ownArtifact = path.dirname(file) === pluginDir && OWN_ARTIFACTS.includes(path.basename(file));
        if (after === "step" && agent === "hermes" && op === "uninstall" && ownArtifact && ++artifactsRemoved === removalsBeforeManifest) fire();
      },
    },
  };
}

test("I4-C30d registro editado, trocado, removido ou posto durante a aplicação fica intacto e vira conflito", async (t) => {
  // [agente, operação, remoção parcial, mutação do registro]
  const rows = [
    ["claude", "install", false, "posto: arquivo"],
    ["claude", "install", false, "posto: diretório"],
    ["claude", "install", false, "posto durante a nova tentativa do rename"],
    ["claude", "uninstall", false, "editado no lugar"],
    ["claude", "uninstall", false, "trocado por arquivo"],
    ["claude", "uninstall", false, "removido"],
    ["claude", "uninstall", false, "trocado por diretório"],
    ["claude", "uninstall", false, "trocado por junção/link de diretório"],
    ["claude", "uninstall", false, "trocado por link de arquivo"],
    ["claude", "uninstall", true, "trocado por arquivo"],
    ["claude", "uninstall", true, "trocado durante a nova tentativa do rename"],
    ["codex", "install", false, "posto: arquivo"],
    ["codex", "uninstall", false, "trocado por arquivo"],
    ["hermes", "install", false, "posto: arquivo"],
    ["hermes", "uninstall", false, "trocado por arquivo"],
    ["hermes", "uninstall", true, "trocado por arquivo"],
    ["claude", "install", false, "controle: nada muda"],
    ["claude", "install", false, "controle: rename negado uma vez, nada muda"],
    ["claude", "uninstall", false, "controle: nada muda"],
    ["claude", "uninstall", true, "controle: nada muda"],
    ["hermes", "uninstall", true, "controle: nada muda"],
  ];
  const observed = [];
  const expected = [];
  for (const [agent, op, partial, mutation] of rows) {
    const label = `${agent} ${op}${partial ? " parcial" : ""} — ${mutation}`;
    if (mutation.includes("link de arquivo") && !fileLinksAllowed()) {
      t.diagnostic(`${label}: não executado — symlink de arquivo exige privilégio neste Windows (EPERM); coberto no Linux/WSL`);
      continue;
    }
    const dir = op === "install" ? freshTarget(agent, label) : await installedTarget(agent, label, { partial });
    const scratch = path.dirname(dir);
    const manifestRel = `.skill-me/${agent}-install.json`;
    const manifest = path.join(dir, ".skill-me", `${agent}-install.json`);
    const manifestBefore = existsSync(manifest) ? readFileSync(manifest) : null;
    const moved = path.join(scratch, "registro próprio movido");
    const outside = path.join(scratch, "pasta externa");
    const outsideFile = path.join(scratch, "arquivo externo.txt");
    const moveOwn = () => renameSync(manifest, moved);
    const mutations = {
      "posto: arquivo": () => writeFileSync(manifest, USER_FILE),
      "posto: diretório": () => {
        mkdirSync(manifest);
        writeFileSync(path.join(manifest, "nota.txt"), USER_FILE);
      },
      "posto durante a nova tentativa do rename": () => writeFileSync(manifest, USER_FILE),
      "editado no lugar": () => appendFileSync(manifest, USER_EDIT),
      "trocado por arquivo": () => {
        moveOwn();
        writeFileSync(manifest, USER_FILE);
      },
      removido: moveOwn,
      "trocado por diretório": () => {
        moveOwn();
        mkdirSync(manifest);
        writeFileSync(path.join(manifest, "nota.txt"), USER_FILE);
      },
      "trocado por junção/link de diretório": () => {
        moveOwn();
        mkdirSync(outside);
        writeFileSync(path.join(outside, "nota.txt"), USER_FILE);
        symlinkSync(outside, manifest, DIR_LINK);
      },
      "trocado por link de arquivo": () => {
        moveOwn();
        writeFileSync(outsideFile, USER_FILE);
        symlinkSync(outsideFile, manifest, "file");
      },
      "trocado durante a nova tentativa do rename": () => {
        moveOwn();
        writeFileSync(manifest, USER_FILE);
      },
    };
    const control = mutation.startsWith("controle");
    const duringRetry = mutation.includes("nova tentativa") || mutation.includes("negado uma vez");
    const { io, probe } = mutatingIo(agent, op, dir, { after: duringRetry ? undefined : "step", deny: duringRetry ? `${manifest}.skill-me-tmp` : undefined, partial }, mutations[mutation]);
    const result = await runIntegrationCommand({ command: op, agent, target: dir, apply: true, io });
    observed.push({
      label,
      mutated: probe.mutated,
      renameAttempts: probe.attempts,
      exitCode: result.exitCode,
      status: result.status,
      applied: result.applied,
      conflicts: result.conflicts,
      steps: result.steps,
      atManifest: describeEntry(manifest),
      ownMoved: existsSync(moved) ? (readFileSync(moved).equals(manifestBefore) ? "registro próprio intacto" : "alterado") : "—",
      external: existsSync(outside) ? describeEntry(outside) : existsSync(outsideFile) ? describeEntry(outsideFile) : "—",
      ownState: ownState(agent, dir),
      tempLeft: existsSync(`${manifest}.skill-me-tmp`),
      lockReleased: !existsSync(path.join(dir, ".skill-me", `${agent}.lock`)),
    });
    const planConflicts = partial ? [partialConflict(agent)] : [];
    const movedOwn = ["trocado por arquivo", "removido", "trocado por diretório", "trocado por junção/link de diretório", "trocado por link de arquivo", "trocado durante a nova tentativa do rename"].includes(mutation);
    const common = {
      label,
      mutated: !control,
      renameAttempts: mutation === "controle: rename negado uma vez, nada muda" ? 2 : duringRetry ? 1 : 0,
      ownMoved: movedOwn ? "registro próprio intacto" : "—",
      external: { "trocado por junção/link de diretório": "diretório [nota.txt: arquivo do usuário intacto]", "trocado por link de arquivo": "arquivo do usuário intacto" }[mutation] ?? "—",
      ownState: ownStateAfter(agent, op, partial),
      tempLeft: false,
      lockReleased: true,
    };
    if (control) {
      const ownCount = agent === "hermes" ? (partial ? 1 : 3) : partial ? 1 : agent === "claude" ? 8 : 6;
      expected.push({
        ...common,
        exitCode: partial ? 4 : 0,
        status: partial ? "conflict" : "applied",
        applied: true,
        conflicts: planConflicts,
        steps: [previousStep(agent), { step: "manifest", state: "done" }],
        atManifest: op === "uninstall" && !partial ? "ausente" : `registro próprio (${ownCount})`,
      });
      continue;
    }
    expected.push({
      ...common,
      exitCode: 4,
      status: "conflict",
      applied: false,
      conflicts: [...planConflicts, { code: "config_changed_during_apply", file: manifestRel }],
      steps: [previousStep(agent)],
      atManifest: {
        "posto: diretório": "diretório [nota.txt: arquivo do usuário intacto]",
        "trocado por diretório": "diretório [nota.txt: arquivo do usuário intacto]",
        "editado no lugar": "edição do usuário intacta",
        removido: "ausente",
        "trocado por junção/link de diretório": "link → pasta externa",
        "trocado por link de arquivo": "link → arquivo externo.txt",
      }[mutation] ?? "arquivo do usuário intacto",
    });
  }
  assert.deepEqual(observed, expected);
});

test("I4-C31b lock ausente, editado ou trocado durante a aplicação fica e é reportado sem esconder o resultado", async (t) => {
  // O lock só sai pela mesma pasta de estado e enquanto for o arquivo regular
  // com os bytes que esta execução gravou — em sucesso, conflito ou erro do
  // comando. A mutação acontece logo depois de criado o primeiro temporário da
  // aplicação (configuração; artefato no Hermes).
  const lockMutations = ["controle: nada muda", "removido", "editado no lugar", "trocado por arquivo", "trocado por diretório", "trocado por junção/link de diretório", "trocado por link de arquivo"];
  const rows = [
    ...["sucesso", "conflito", "erro"].flatMap((outcome) => lockMutations.map((mutation) => ["claude", outcome, mutation])),
    ["claude", "sucesso", "unlink do lock negado (EACCES)"],
    ["codex", "sucesso", "trocado por arquivo"],
    ["hermes", "sucesso", "trocado por arquivo"],
  ];
  const observed = [];
  const expected = [];
  for (const [agent, outcome, mutation] of rows) {
    const label = `${agent} install, ${outcome} — ${mutation}`;
    if (mutation.includes("link de arquivo") && !fileLinksAllowed()) {
      t.diagnostic(`${label}: não executado — symlink de arquivo exige privilégio neste Windows (EPERM); coberto no Linux/WSL`);
      continue;
    }
    const dir = freshTarget(agent, label);
    const scratch = path.dirname(dir);
    const lockRel = `.skill-me/${agent}.lock`;
    const lock = path.join(dir, ".skill-me", `${agent}.lock`);
    const moved = path.join(scratch, "lock próprio movido");
    const outside = path.join(scratch, "pasta externa");
    const outsideFile = path.join(scratch, "arquivo externo.txt");
    const config = agent === "hermes" ? null : path.join(dir, CONFIG_OF[agent]);
    const external = JSON.stringify({ env: { A: "editado por outro editor" } }, null, 2);
    const firstTemp = agent === "hermes" ? path.join(dir, "plugins", ".skill-me-observer.skill-me-tmp", "__init__.py") : `${config}.skill-me-tmp`;
    const moveOwn = () => renameSync(lock, moved);
    const mutateLock = {
      removido: moveOwn,
      "editado no lugar": () => appendFileSync(lock, USER_EDIT),
      "trocado por arquivo": () => {
        moveOwn();
        writeFileSync(lock, USER_FILE);
      },
      "trocado por diretório": () => {
        moveOwn();
        mkdirSync(lock);
        writeFileSync(path.join(lock, "nota.txt"), USER_FILE);
      },
      "trocado por junção/link de diretório": () => {
        moveOwn();
        mkdirSync(outside);
        writeFileSync(path.join(outside, "nota.txt"), USER_FILE);
        symlinkSync(outside, lock, DIR_LINK);
      },
      "trocado por link de arquivo": () => {
        moveOwn();
        writeFileSync(outsideFile, USER_FILE);
        symlinkSync(outsideFile, lock, "file");
      },
    }[mutation];
    const { io, probe } = mutatingIo(
      agent,
      "install",
      dir,
      {
        afterCreate: firstTemp,
        failRenameTo: outcome === "erro" ? path.join(dir, ".skill-me", `${agent}-install.json`) : undefined,
        failUnlink: mutation.includes("EACCES") ? lock : undefined,
      },
      () => {
        mutateLock?.();
        if (outcome === "conflito") writeFileSync(config, external);
      },
    );
    const result = await runIntegrationCommand({ command: "install", agent, target: dir, apply: true, io });
    observed.push({
      label,
      mutated: probe.mutated,
      exitCode: result.exitCode,
      status: result.status,
      applied: result.applied,
      conflicts: result.conflicts,
      errors: result.errors,
      steps: result.steps,
      atLock: describeEntry(lock),
      ownLockMoved: existsSync(moved) ? describeEntry(moved) : "—",
      external: existsSync(outside) ? describeEntry(outside) : existsSync(outsideFile) ? describeEntry(outsideFile) : "—",
      config: config === null ? ownState(agent, dir) : readFileSync(config, "utf8") === external ? "edição externa preservada" : ownState(agent, dir),
      // A pasta de estado só sai vazia depois de liberado o nosso lock.
      stateDirLeft: existsSync(path.join(dir, ".skill-me")),
    });
    const control = mutation.startsWith("controle");
    const kept = control ? [] : [{ code: "config_changed_during_apply", file: lockRel }];
    const done = [previousStep(agent), { step: "manifest", state: "done" }];
    const byOutcome = {
      sucesso: { exitCode: control ? 0 : 4, status: control ? "applied" : "conflict", applied: true, conflicts: kept, errors: [], steps: done },
      conflito: { exitCode: 4, status: "conflict", applied: false, conflicts: [{ code: "config_changed_during_apply", file: CONFIG_OF[agent] }, ...kept], errors: [], steps: [] },
      erro: { exitCode: 5, status: "incomplete", applied: false, conflicts: kept, errors: [{ code: "EIO" }], steps: [previousStep(agent), { step: "manifest", state: "failed" }] },
    }[outcome];
    const movedOwn = ["removido", "trocado por arquivo", "trocado por diretório", "trocado por junção/link de diretório", "trocado por link de arquivo"].includes(mutation);
    const deniedUnlink = mutation.includes("EACCES");
    expected.push({
      label,
      mutated: true,
      ...byOutcome,
      ...(deniedUnlink ? { exitCode: 5, status: "incomplete", conflicts: [], errors: [{ code: "EACCES" }], steps: [...done, { step: "lock", state: "failed" }] } : {}),
      atLock: deniedUnlink
        ? "lock próprio"
        : {
            "controle: nada muda": "ausente",
            removido: "ausente",
            "editado no lugar": "edição do usuário intacta",
            "trocado por diretório": "diretório [nota.txt: arquivo do usuário intacto]",
            "trocado por junção/link de diretório": "link → pasta externa",
            "trocado por link de arquivo": "link → arquivo externo.txt",
          }[mutation] ?? "arquivo do usuário intacto",
      ownLockMoved: movedOwn ? "lock próprio" : "—",
      external: { "trocado por junção/link de diretório": "diretório [nota.txt: arquivo do usuário intacto]", "trocado por link de arquivo": "arquivo do usuário intacto" }[mutation] ?? "—",
      config: outcome === "conflito" ? "edição externa preservada" : ownStateAfter(agent, "install", false),
      // Com o registro gravado (sucesso) a pasta fica; sem ele, sai só vazia e com o lock liberado.
      stateDirLeft: outcome === "sucesso" || !control,
    });
  }
  assert.deepEqual(observed, expected);
});

test("I4-C27b pasta de estado trocada durante a aplicação não leva leitura, escrita ou exclusão para outro lugar", async () => {
  // Depois do passo anterior ao registro, ou logo depois de criado o lock (antes
  // da leitura sob ele), `.skill-me` é movida para fora do alvo e no lugar fica
  // junção (Windows) / symlink (POSIX) para fora do alvo, para outra pasta do
  // alvo, ou outro diretório real — os três com arquivos sintéticos de mesmo
  // nome que o registro e o lock. Na variante da própria pasta movida, o link
  // aponta para ela: lá o registro e o lock têm os nossos bytes, e só a
  // conferência da pasta impede apagá-los (ou criar o temporário) fora do alvo.
  // Controle: junção para dentro do alvo posta antes do comando continua aceita
  // (I4-C34d).
  const rows = [
    ["claude", "uninstall", false, "depois da configuração", "junção/link para fora do alvo"],
    ["claude", "uninstall", true, "depois da configuração", "junção/link para fora do alvo"],
    ["claude", "install", false, "depois da configuração", "junção/link para fora do alvo"],
    ["claude", "uninstall", false, "depois da configuração", "junção/link para outra pasta do alvo"],
    ["claude", "uninstall", false, "depois da configuração", "outro diretório real no mesmo caminho"],
    ["claude", "install", false, "depois da configuração", "outro diretório real no mesmo caminho"],
    ["claude", "uninstall", false, "logo depois de criar o lock", "junção/link para fora do alvo"],
    ["claude", "uninstall", false, "depois da configuração", "junção/link para a própria pasta movida para fora do alvo"],
    ["claude", "install", false, "depois da configuração", "junção/link para a própria pasta movida para fora do alvo"],
    ["claude", "uninstall", true, "durante a nova tentativa do rename", "junção/link para a própria pasta movida para fora do alvo"],
    ["codex", "install", false, "depois da configuração", "junção/link para fora do alvo"],
    ["hermes", "uninstall", false, "depois dos artefatos", "junção/link para fora do alvo"],
    ["hermes", "install", false, "depois dos artefatos", "junção/link para fora do alvo"],
    ["hermes", "uninstall", false, "logo depois de criar o lock", "junção/link para fora do alvo"],
    ["claude", "uninstall", false, "antes do comando", "controle: junção/link para outra pasta do alvo"],
  ];
  const observed = [];
  const expected = [];
  for (const [agent, op, partial, when, swap] of rows) {
    const label = `${agent} ${op}${partial ? " parcial" : ""}, ${when} — ${swap}`;
    const dir = op === "install" ? freshTarget(agent, label) : await installedTarget(agent, label, { partial });
    const scratch = path.dirname(dir);
    const stateDir = path.join(dir, ".skill-me");
    const lock = path.join(stateDir, `${agent}.lock`);
    const moved = path.join(scratch, "pasta de estado própria movida");
    // Pasta com os arquivos sintéticos de mesmo nome (`null`: a linha não tem).
    const userDirs = {
      "junção/link para fora do alvo": path.join(scratch, "pasta externa"),
      "outro diretório real no mesmo caminho": stateDir,
      "junção/link para a própria pasta movida para fora do alvo": null,
    };
    const userDir = Object.hasOwn(userDirs, swap) ? userDirs[swap] : path.join(dir, "pasta do usuário");
    const putUserFiles = (where) => {
      mkdirSync(where);
      writeFileSync(path.join(where, `${agent}-install.json`), USER_FILE);
      writeFileSync(path.join(where, `${agent}.lock`), USER_FILE);
    };
    const ownDirLinked = swap === "junção/link para a própria pasta movida para fora do alvo";
    const doSwap = () => {
      renameSync(stateDir, moved);
      if (ownDirLinked) {
        symlinkSync(moved, stateDir, DIR_LINK);
        return;
      }
      if (swap === "outro diretório real no mesmo caminho") {
        putUserFiles(stateDir);
        return;
      }
      putUserFiles(userDir);
      symlinkSync(userDir, stateDir, DIR_LINK);
    };
    const control = swap.startsWith("controle");
    if (control) {
      // Antes do comando: a pasta própria vira `pasta do usuário` (só com o
      // registro, sem arquivos alheios) e o caminho fica com uma junção para ela.
      renameSync(stateDir, userDir);
      symlinkSync(userDir, stateDir, DIR_LINK);
    }
    const beforeRead = when === "logo depois de criar o lock";
    const duringRetry = when === "durante a nova tentativa do rename";
    const { io, probe } = mutatingIo(
      agent,
      op,
      dir,
      {
        after: beforeRead || duringRetry ? undefined : "step",
        afterCreate: beforeRead ? lock : undefined,
        deny: duringRetry ? path.join(stateDir, `${agent}-install.json.skill-me-tmp`) : undefined,
        partial,
      },
      control ? undefined : doSwap,
    );
    const result = await runIntegrationCommand({ command: op, agent, target: dir, apply: true, io });
    const stateDirStats = existsSync(stateDir) || isSymlink(stateDir) ? lstatSync(stateDir) : null;
    observed.push({
      label,
      mutated: probe.mutated,
      exitCode: result.exitCode,
      status: result.status,
      conflicts: result.conflicts,
      steps: result.steps,
      userFiles: userDir === null ? "—" : describeEntry(userDir),
      atStateDir: stateDirStats === null ? "ausente" : stateDirStats.isSymbolicLink() ? describeEntry(stateDir) : stateDirStats.isDirectory() ? "diretório real" : "outro",
      ownMoved: existsSync(moved) ? describeEntry(moved) : "—",
      ownState: ownState(agent, dir),
    });
    const manifestName = `${agent}-install.json`;
    const lockName = `${agent}.lock`;
    if (control) {
      expected.push({
        label,
        mutated: false,
        exitCode: 0,
        status: "applied",
        conflicts: [],
        steps: [previousStep(agent), { step: "manifest", state: "done" }],
        userFiles: "diretório []",
        atStateDir: "link → pasta do usuário",
        ownMoved: "—",
        ownState: ownStateAfter(agent, op, partial),
      });
      continue;
    }
    const swapConflict = {
      "junção/link para fora do alvo": { code: "target_escape", file: ".skill-me" },
      "junção/link para a própria pasta movida para fora do alvo": { code: "target_escape", file: ".skill-me" },
      "junção/link para outra pasta do alvo": { code: "config_changed_during_apply", file: ".skill-me" },
      "outro diretório real no mesmo caminho": { code: "config_changed_during_apply", file: `.skill-me/${manifestName}` },
    }[swap];
    // O que foi movido: o registro (se já existia), o temporário já criado
    // quando a troca acontece durante a nova tentativa — fica lá, nada é apagado
    // através da pasta trocada — e o lock desta execução.
    const ownEntries = [
      ...(op === "uninstall" ? [`${manifestName}: registro próprio (${agent === "hermes" ? 3 : agent === "claude" ? 8 : 6})`] : []),
      ...(duringRetry ? [`${manifestName}.skill-me-tmp: registro próprio (1)`] : []),
      `${lockName}: lock próprio`,
    ];
    expected.push({
      label,
      mutated: true,
      exitCode: 4,
      status: "conflict",
      conflicts: [...(partial ? [partialConflict(agent)] : []), swapConflict, { code: "config_changed_during_apply", file: `.skill-me/${lockName}` }],
      steps: beforeRead ? [] : [previousStep(agent)],
      userFiles: userDir === null ? "—" : `diretório [${manifestName}: arquivo do usuário intacto; ${lockName}: arquivo do usuário intacto]`,
      atStateDir: swap === "outro diretório real no mesmo caminho" ? "diretório real" : `link → ${path.basename(userDir ?? moved)}`,
      ownMoved: `diretório [${ownEntries.join("; ")}]`,
      ownState: beforeRead ? ownStateAfter(agent, "install", false) : ownStateAfter(agent, op, partial),
    });
  }
  assert.deepEqual(observed, expected);
});

test("I4-C30e registro que não é arquivo regular não é lido nem apagado: prévia e aplicação recusam com 4", async (t) => {
  // Já presente antes do comando no caminho do registro: diretório, junção/link
  // de diretório ou link de arquivo para uma cópia exata do registro próprio —
  // os links apontam para dentro do alvo (para fora já é `target_escape`, I4-C27).
  const rows = [
    ["claude", "uninstall", "diretório"],
    ["claude", "uninstall", "junção/link de diretório"],
    ["claude", "uninstall", "link de arquivo para cópia do registro"],
    ["claude", "install", "diretório"],
    ["codex", "uninstall", "diretório"],
    ["hermes", "uninstall", "junção/link de diretório"],
  ];
  const observed = [];
  const expected = [];
  for (const [agent, op, kind] of rows) {
    const label = `${agent} ${op} — ${kind}`;
    if (kind.startsWith("link de arquivo") && !fileLinksAllowed()) {
      t.diagnostic(`${label}: não executado — symlink de arquivo exige privilégio neste Windows (EPERM); coberto no Linux/WSL`);
      continue;
    }
    const dir = op === "install" ? freshTarget(agent, label) : await installedTarget(agent, label);
    const scratch = path.dirname(dir);
    const manifest = path.join(dir, ".skill-me", `${agent}-install.json`);
    const userDir = path.join(dir, "pasta do usuário");
    mkdirSync(path.dirname(manifest), { recursive: true });
    if (existsSync(manifest)) renameSync(manifest, path.join(scratch, "registro próprio movido"));
    if (kind === "diretório") {
      mkdirSync(manifest);
      writeFileSync(path.join(manifest, "nota.txt"), USER_FILE);
    } else if (kind === "junção/link de diretório") {
      mkdirSync(userDir);
      writeFileSync(path.join(userDir, "nota.txt"), USER_FILE);
      symlinkSync(userDir, manifest, DIR_LINK);
    } else {
      copyFileSync(path.join(scratch, "registro próprio movido"), path.join(dir, "cópia do registro.json"));
      symlinkSync(path.join(dir, "cópia do registro.json"), manifest, "file");
    }
    // Árvore inteira do alvo, com mtime e sem seguir links: inclui a pasta e a
    // cópia apontadas pelos links.
    const before = snapshotTree(dir);
    for (const apply of [false, true]) {
      const result = await runIntegrationCommand({ command: op, agent, target: dir, apply, io: createNodeIo() });
      observed.push({
        label,
        apply,
        exitCode: result.exitCode,
        status: result.status,
        conflicts: result.conflicts,
        changes: result.changes,
        atManifest: describeEntry(manifest),
        tree: isDeepStrictEqual(snapshotTree(dir), before) ? "alvo inalterado" : "alterado",
      });
      expected.push({
        label,
        apply,
        exitCode: 4,
        status: "conflict",
        conflicts: [{ code: "foreign_artifact", file: `.skill-me/${agent}-install.json` }],
        changes: [],
        atManifest: {
          diretório: "diretório [nota.txt: arquivo do usuário intacto]",
          "junção/link de diretório": "link → pasta do usuário",
        }[kind] ?? "link → cópia do registro.json",
        tree: "alvo inalterado",
      });
    }
  }
  assert.deepEqual(observed, expected);
});

// Ancestral `plugins` do Hermes trocado durante a aplicação — achado F1 da
// revisão formal round 3. A troca acontece dentro do próprio comando: na
// remoção, logo depois da exclusão real do primeiro ou do último artefato
// próprio, ou logo depois de criado o lock; na instalação, logo depois de criar
// `plugins`, do primeiro ou do último artefato gravado no staging, ou da
// primeira exclusão da sobra própria dele. `plugins` é movida (sempre dentro do
// mesmo scratch) e no lugar fica junção (Windows) / symlink (POSIX) para uma
// pasta fora do alvo ou para outra pasta do alvo — com cópias exatas dos
// artefatos cujo hash está no registro, bytecode com o nome do cache próprio,
// `skill-me-observer` vazio ou staging com cópias exatas — ou para a própria
// `plugins` movida. Depois da troca nenhuma leitura de conteúdo, gravação ou
// exclusão passa pelo caminho trocado; o destino alheio fica intacto (bytes,
// mtime e tipo), o que já saiu ou foi gravado fica onde está e o registro não é
// tocado. Controles: nada muda; `plugins` como junção/link para outra pasta do
// alvo já antes do comando (I4-C34d).
const PLUGIN_SOURCE = path.join(REPO_ROOT, "src", "integrations", "hermes", "plugin");
const STAGING_NAME = ".skill-me-observer.skill-me-tmp";

function copyPackageArtifacts(dir) {
  mkdirSync(dir, { recursive: true });
  for (const name of OWN_ARTIFACTS) copyFileSync(path.join(PLUGIN_SOURCE, name), path.join(dir, name));
}

// O que fica num caminho, sem seguir link.
function entryAt(file) {
  if (isSymlink(file)) return existsSync(file) ? `link → ${path.basename(realpathSync(file))}` : "link pendente";
  if (!existsSync(file)) return "ausente";
  return lstatSync(file).isDirectory() ? "diretório real" : "arquivo";
}

const listTree = (dir) => Object.keys(snapshotTree(dir, { withMtime: false }));

// Destino da junção/link: fora do alvo ou outra pasta dele, e o que tem antes da
// troca; `own`: a própria `plugins` movida.
const SWAP_DESTS = {
  "pasta externa com cópias exatas dos artefatos": { outside: true, fill: (dir) => copyPackageArtifacts(path.join(dir, "skill-me-observer")) },
  "outra pasta do alvo com cópias exatas dos artefatos": { outside: false, fill: (dir) => copyPackageArtifacts(path.join(dir, "skill-me-observer")) },
  "pasta externa com skill-me-observer vazio": { outside: true, fill: (dir) => mkdirSync(path.join(dir, "skill-me-observer"), { recursive: true }) },
  "outra pasta do alvo com bytecode de mesmo nome": {
    outside: false,
    fill: (dir) => {
      mkdirSync(path.join(dir, "skill-me-observer", "__pycache__"), { recursive: true });
      writeFileSync(path.join(dir, "skill-me-observer", "__pycache__", "__init__.cpython-311.pyc"), USER_FILE);
    },
  },
  "outra pasta do alvo com staging de cópias exatas": { outside: false, fill: (dir) => copyPackageArtifacts(path.join(dir, STAGING_NAME)) },
  "pasta externa vazia": { outside: true, fill: (dir) => mkdirSync(dir) },
  "a própria plugins movida para fora do alvo": { outside: true, own: true },
  "a própria plugins movida para outra pasta do alvo": { outside: false, own: true },
};

// io real que registra leitura de conteúdo, gravação e exclusão através de
// `<alvo>/plugins` depois da troca e dispara a troca uma vez, na ocorrência
// `on[1]` do evento `on[0]`; `probe.trigger` é o nome do arquivo desse evento
// (a sobra do staging sai na ordem do `readdir`, que o ext4 não ordena).
function ancestorSwapIo(home, on, swap) {
  const io = createNodeIo();
  const plugins = path.join(home, "plugins");
  const own = path.join(plugins, "skill-me-observer");
  const staging = path.join(plugins, STAGING_NAME);
  const lock = path.join(home, ".skill-me", "hermes.lock");
  const probe = { swapped: false, through: [], trigger: null };
  const counts = {};
  const viaPlugins = (file) => file === plugins || file.startsWith(plugins + path.sep);
  const relToHome = (file) => path.relative(home, file).split(path.sep).join("/");
  const eventOf = (op, file) => {
    if (op === "unlink" && path.dirname(file) === own && OWN_ARTIFACTS.includes(path.basename(file))) return "artefato próprio removido";
    if (op === "unlink" && path.dirname(file) === staging) return "sobra própria do staging removida";
    if (op === "writeExclusive" && path.dirname(file) === staging) return "artefato gravado no staging";
    if (op === "writeExclusive" && file === lock) return "lock criado";
    if (op === "mkdir" && file === plugins) return "plugins criada";
    return null;
  };
  const wrapped = { ...io };
  for (const op of ["readdir", "readBytes", "readText", "unlink", "rmdir", "mkdir", "writeExclusive", "rename"]) {
    wrapped[op] = async (...args) => {
      const files = args.slice(0, op === "rename" ? 2 : 1);
      if (probe.swapped && files.some(viaPlugins)) probe.through.push(`${op} ${files.map(relToHome).join(" → ")}`);
      const out = await io[op](...args);
      const event = eventOf(op, args[0]);
      if (event !== null) counts[event] = (counts[event] ?? 0) + 1;
      if (on && !probe.swapped && event === on[0] && counts[event] === on[1]) {
        swap();
        probe.swapped = true;
        probe.trigger = path.basename(args[0]);
      }
      return out;
    };
  }
  return { io: wrapped, probe };
}

test("I4-C34h Hermes: ancestral plugins trocado durante a remoção ou a instalação não leva leitura, gravação ou exclusão para outro lugar", async () => {
  const escape = { code: "target_escape", file: "plugins" };
  const changed = { code: "config_changed_during_apply", file: "plugins" };
  const ownPlugin = (...names) => ["skill-me-observer", ...names.map((name) => `skill-me-observer/${name}`)];
  const ownStaging = (...names) => [STAGING_NAME, ...names.map((name) => `${STAGING_NAME}/${name}`)];
  const done = [
    { step: "artifacts", state: "done" },
    { step: "manifest", state: "done" },
  ];
  const rows = [
    { op: "uninstall", on: ["artefato próprio removido", 1], dest: "pasta externa com cópias exatas dos artefatos", conflict: escape, ownLeft: ownPlugin("kwargs.json", "plugin.yaml") },
    { op: "uninstall", on: ["artefato próprio removido", 1], dest: "outra pasta do alvo com cópias exatas dos artefatos", conflict: changed, ownLeft: ownPlugin("kwargs.json", "plugin.yaml") },
    { op: "uninstall", on: ["artefato próprio removido", 1], dest: "a própria plugins movida para fora do alvo", conflict: escape, ownLeft: ownPlugin("kwargs.json", "plugin.yaml") },
    { op: "uninstall", cache: true, on: ["artefato próprio removido", 3], dest: "outra pasta do alvo com bytecode de mesmo nome", conflict: changed, ownLeft: ownPlugin("__pycache__", "__pycache__/__init__.cpython-311.pyc") },
    { op: "uninstall", on: ["artefato próprio removido", 3], dest: "pasta externa com skill-me-observer vazio", conflict: escape, ownLeft: ownPlugin() },
    { op: "uninstall", on: ["lock criado", 1], dest: "pasta externa com cópias exatas dos artefatos", conflict: escape, ownLeft: ownPlugin(...OWN_ARTIFACTS) },
    { op: "install", noPlugins: true, on: ["plugins criada", 1], dest: "pasta externa vazia", conflict: escape, ownLeft: [] },
    { op: "install", on: ["artefato gravado no staging", 1], dest: "a própria plugins movida para fora do alvo", conflict: escape, ownLeft: ownStaging("__init__.py") },
    { op: "install", on: ["artefato gravado no staging", 3], dest: "a própria plugins movida para fora do alvo", conflict: escape, ownLeft: ownStaging(...OWN_ARTIFACTS) },
    { op: "install", on: ["artefato gravado no staging", 1], dest: "a própria plugins movida para outra pasta do alvo", conflict: changed, ownLeft: ownStaging("__init__.py") },
    {
      op: "install",
      leftover: true,
      on: ["sobra própria do staging removida", 1],
      dest: "outra pasta do alvo com staging de cópias exatas",
      conflict: changed,
      ownLeft: (removed) => ownStaging(...OWN_ARTIFACTS.filter((name) => name !== removed)),
    },
    { op: "uninstall", control: "nada muda", atPlugins: "ausente" },
    { op: "uninstall", control: "junção/link para outra pasta do alvo já antes do comando", atPlugins: "link → plugins do usuário", ownLeft: [] },
    { op: "install", control: "nada muda", atPlugins: "diretório real" },
  ];
  const observed = [];
  const expected = [];
  for (const [index, row] of rows.entries()) {
    const label = `${row.op} — ${row.control ? `controle: ${row.control}` : `${row.on[0]} (${row.on[1]}º) — ${row.dest}`}`;
    const dir = makeScratch(`f1 plugins ${index}`);
    scratches.push(dir);
    const home = path.join(dir, "hermes home");
    mkdirSync(home);
    const plugins = path.join(home, "plugins");
    if (row.op === "uninstall") {
      assert.equal((await runIntegrationCommand({ command: "install", agent: "hermes", target: home, apply: true, io: createNodeIo() })).exitCode, 0, label);
      if (row.cache) {
        mkdirSync(path.join(plugins, "skill-me-observer", "__pycache__"));
        writeFileSync(path.join(plugins, "skill-me-observer", "__pycache__", "__init__.cpython-311.pyc"), "bytecode sintético próprio\n");
      }
    } else if (!row.noPlugins) {
      mkdirSync(plugins);
      if (row.leftover) copyPackageArtifacts(path.join(plugins, STAGING_NAME));
    }
    const manifest = path.join(home, ".skill-me", "hermes-install.json");
    const manifestBefore = existsSync(manifest) ? readFileSync(manifest) : null;
    const dest = row.dest && SWAP_DESTS[row.dest];
    let destPath = null;
    let movedPath = null;
    if (dest) {
      const inScratch = dest.outside ? dir : home;
      destPath = path.join(inScratch, dest.own ? "plugins próprio movido" : dest.outside ? "pasta externa" : "outra pasta");
      movedPath = dest.own ? destPath : path.join(dir, "plugins próprio movido");
      dest.fill?.(destPath);
    }
    if (row.control?.startsWith("junção/link")) {
      movedPath = path.join(home, "plugins do usuário");
      renameSync(plugins, movedPath);
      symlinkSync(movedPath, plugins, DIR_LINK);
    }
    const destBefore = dest && !dest.own ? snapshotTree(destPath) : null;
    const { io, probe } = ancestorSwapIo(home, row.on, () => {
      renameSync(plugins, movedPath);
      symlinkSync(destPath, plugins, DIR_LINK);
    });
    const result = await runIntegrationCommand({ command: row.op, agent: "hermes", target: home, apply: true, io });
    observed.push({
      label,
      swapped: probe.swapped,
      exitCode: result.exitCode,
      status: result.status,
      applied: result.applied,
      conflicts: result.conflicts,
      steps: result.steps,
      throughSwapped: probe.through,
      foreignDest: destBefore === null ? "—" : existsSync(destPath) && isDeepStrictEqual(snapshotTree(destPath), destBefore) ? "intacto" : "alterado",
      atPlugins: entryAt(plugins),
      ownLeft: movedPath === null ? "—" : listTree(movedPath),
      manifest: !existsSync(manifest) ? "ausente" : manifestBefore !== null && readFileSync(manifest).equals(manifestBefore) ? "intacto" : "gravado",
      lockReleased: !existsSync(path.join(home, ".skill-me", "hermes.lock")),
    });
    if (row.control) {
      expected.push({
        label,
        swapped: false,
        exitCode: 0,
        status: "applied",
        applied: true,
        conflicts: [],
        steps: done,
        throughSwapped: [],
        foreignDest: "—",
        atPlugins: row.atPlugins,
        ownLeft: row.ownLeft ?? "—",
        manifest: row.op === "install" ? "gravado" : "ausente",
        lockReleased: true,
      });
      continue;
    }
    expected.push({
      label,
      swapped: true,
      exitCode: 4,
      status: "conflict",
      applied: false,
      conflicts: [row.conflict],
      steps: [],
      throughSwapped: [],
      foreignDest: dest.own ? "—" : "intacto",
      atPlugins: `link → ${path.basename(destPath)}`,
      ownLeft: typeof row.ownLeft === "function" ? row.ownLeft(probe.trigger) : row.ownLeft,
      manifest: row.op === "uninstall" ? "intacto" : "ausente",
      lockReleased: true,
    });
  }
  assert.deepEqual(observed, expected);
});

// Alias (junção/link) de `--target` para o diretório de política gerenciada do
// Claude — achado F2 da revisão formal round 3. A prova nunca toca um diretório
// gerenciado real: o io dela resolve o alias sintético para o nome canônico
// gerenciado (ou um descendente) e registra e recusa (EACCES) qualquer outro
// acesso, sem delegar nada ao sistema de arquivos. Só o `stat` e o `realpath`
// do próprio alvo podem preceder a recusa; o caminho escrito como gerenciado é
// recusado sem nenhum acesso. Controles: nome irmão com o mesmo prefixo segue
// para a primeira leitura (recusada pela prova: 5) e alias legítimo num scratch,
// com o sistema de arquivos real, instala no diretório real.
const MANAGED_DIR = process.platform === "win32" ? "C:\\Program Files\\ClaudeCode" : process.platform === "darwin" ? "/Library/Application Support/ClaudeCode" : "/etc/claude-code";

function aliasIo(alias, resolvesTo) {
  const calls = [];
  const refuse = (op, file) => {
    calls.push([op, file]);
    return Object.assign(new Error(`${op} recusado pela prova`), { code: "EACCES" });
  };
  const io = {};
  for (const op of ["lstat", "readdir", "rename", "rmdir", "unlink", "mkdir", "readBytes", "readText", "accessOf", "writeExclusive"]) {
    io[op] = async (file) => {
      throw refuse(op, file);
    };
  }
  io.stat = async (file) => {
    if (file !== alias) throw refuse("stat", file);
    calls.push(["stat", file]);
    return { isDirectory: () => true };
  };
  io.realpath = async (file) => {
    if (file !== alias) throw refuse("realpath", file);
    calls.push(["realpath", file]);
    return resolvesTo;
  };
  return { io, calls };
}

test("I4-C27c alias de --target para o diretório gerenciado do Claude é recusado pelo caminho real antes de qualquer outro acesso", async () => {
  const dir = makeScratch("f2 alias gerenciado");
  scratches.push(dir);
  const alias = path.join(dir, "perfil claude por alias");
  const descendant = path.join(MANAGED_DIR, "perfil interno");
  const sibling = `${MANAGED_DIR}-irmão`;
  const resolution = [
    ["stat", alias],
    ["realpath", alias],
  ];
  // [comando, --apply, caso, argumento --target, caminho real devolvido pelo io]
  const rows = [
    ["install", true, "alias → diretório gerenciado", alias, MANAGED_DIR],
    ["uninstall", true, "alias → diretório gerenciado", alias, MANAGED_DIR],
    ["plan", false, "alias → diretório gerenciado", alias, MANAGED_DIR],
    ["install", true, "alias → descendente do diretório gerenciado", alias, descendant],
    ["uninstall", false, "alias → descendente do diretório gerenciado", alias, descendant],
    ["install", true, "texto: o próprio diretório gerenciado", MANAGED_DIR, MANAGED_DIR],
    ["install", true, "texto: descendente do diretório gerenciado", descendant, descendant],
    ["install", true, "controle: alias → irmão com o mesmo prefixo", alias, sibling],
  ];
  const observed = [];
  const expected = [];
  for (const [command, apply, label, targetArg, real] of rows) {
    const { io, calls } = aliasIo(targetArg, real);
    const result = await runIntegrationCommand({ command, agent: "claude", target: targetArg, apply, io });
    const row = `${command}${apply ? " --apply" : ""} — ${label}`;
    observed.push({ row, exitCode: result.exitCode, status: result.status, applied: result.applied, conflicts: result.conflicts, errors: result.errors, changes: result.changes, target: result.target, calls });
    if (label.startsWith("controle")) {
      expected.push({ row, exitCode: 5, status: "incomplete", applied: false, conflicts: [], errors: [{ code: "EACCES" }], changes: [], target: sibling, calls: [...resolution, ["lstat", path.join(sibling, "settings.json")]] });
      continue;
    }
    expected.push({
      row,
      exitCode: 4,
      status: "conflict",
      applied: false,
      conflicts: [{ code: "managed_policy_target" }],
      errors: [],
      changes: [],
      target: targetArg,
      calls: label.startsWith("texto") ? [] : resolution,
    });
  }

  // Controle com o sistema de arquivos real: alias legítimo para um perfil no scratch.
  const real = target("f2 alias legítimo");
  const legit = path.join(path.dirname(real), "perfil por alias");
  symlinkSync(real, legit, DIR_LINK);
  const result = await runIntegrationCommand({ command: "install", agent: "claude", target: legit, apply: true, io: createNodeIo() });
  const settings = JSON.parse(readFileSync(path.join(real, "settings.json"), "utf8"));
  observed.push({
    row: "install --apply — controle: alias legítimo num scratch",
    exitCode: result.exitCode,
    status: result.status,
    conflicts: result.conflicts,
    target: result.target === realpathSync.native(real) ? "caminho real do perfil" : result.target,
    ownEvents: Object.keys(readClaudeHandlers(real)).length,
    thirdPartyStop: settings.hooks.Stop,
    aliasKept: entryAt(legit),
    manifest: existsSync(path.join(real, ".skill-me", "claude-install.json")),
  });
  expected.push({
    row: "install --apply — controle: alias legítimo num scratch",
    exitCode: 0,
    status: "applied",
    conflicts: [],
    target: "caminho real do perfil",
    ownEvents: 8,
    thirdPartyStop: [{ hooks: [{ type: "command", command: "notify.sh" }] }],
    aliasKept: `link → ${path.basename(real)}`,
    manifest: true,
  });
  assert.deepEqual(observed, expected);
});

// O que há num caminho, sem seguir link; artefato com os bytes do pacote é
// reconhecido pelo conteúdo, sem confiar no instalador.
function packageEntry(file) {
  if (isSymlink(file)) return existsSync(file) ? `link → ${path.basename(realpathSync(file))}` : "link pendente";
  if (!existsSync(file)) return "ausente";
  if (lstatSync(file).isDirectory()) return `diretório real [${readdirSync(file).sort().map((name) => `${name}: ${packageEntry(path.join(file, name))}`).join("; ")}]`;
  const content = readFileSync(file);
  const name = path.basename(file);
  if (OWN_ARTIFACTS.includes(name) && content.equals(readFileSync(path.join(PLUGIN_SOURCE, name)))) return "artefato do pacote";
  return content.toString("utf8") === USER_FILE ? "arquivo do usuário intacto" : "outro conteúdo";
}
const packageDir = (names) => `diretório real [${names.map((name) => `${name}: artefato do pacote`).join("; ")}]`;
const FS_OPS = ["readdir", "readBytes", "readText", "unlink", "rmdir", "mkdir", "writeExclusive", "rename", "lstat", "stat", "realpath"];

// Evidência da instalação inicial do I4-C34g, que saiu 5 sem dizer onde no D da
// S16 (.tasks/issue-25-hermes-install-diagnostic-plan.md, O2). Cada operação de
// FS_OPS é repassada uma vez ao io, com o mesmo `this`, argumentos, valor e o
// mesmo objeto de erro. Toda rejeição fica em memória e em ordem, ENOENT
// normal inclusive: filtrar escolheria a causa. De cada uma ficam a operação,
// os caminhos relativos ao home Hermes e o código — nunca bytes, opções,
// mensagem ou stack. A coleta é melhor esforço: falhando, o erro original
// segue intacto.
function rejectionTrace(io, home) {
  const rejected = [];
  const traced = { ...io };
  for (const op of FS_OPS) {
    traced[op] = async (...args) => {
      try {
        return await io[op](...args);
      } catch (error) {
        try {
          let paths;
          try {
            paths = args.slice(0, op === "rename" ? 2 : 1).map((file) => homeRelative(home, file));
          } catch {
            paths = "<caminhos não observáveis>";
          }
          rejected.push({ op, paths, code: rejectionCode(error) });
        } catch {
          // Registro indisponível (ex.: lista congelada por quem a recebeu): a
          // rejeição segue sem ele — um TypeError aqui tomaria o lugar do erro.
        }
        throw error;
      }
    };
  }
  return { io: traced, rejected };
}

// Raiz `.`; fora do home um marcador, sem caminho absoluto nem `..` que exponha ancestrais.
function homeRelative(home, file) {
  if (typeof file !== "string") return "<não é caminho>";
  const relative = path.relative(home, file);
  if (relative === "") return ".";
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return "<fora do home>";
  return relative.split(path.sep).join("/");
}

// Só o código textual: objeto (até cíclico) nunca é registrado, e um `code`
// ilegível vira marcador em vez de trocar o erro que está sendo relançado.
function rejectionCode(error) {
  try {
    const code = error?.code;
    if (code === undefined || code === null) return null;
    return typeof code === "string" ? code : "<código não é texto>";
  } catch {
    return "<código não observável>";
  }
}

// Mensagem da asserção quando a instalação não sai 0: o rótulo e só status,
// códigos, passos e conflitos (já relativos) — sem alvo, mudanças, bytes ou
// mensagens. Ausente fica ausente, nunca [] ou 0. Nunca lança: uma exceção
// aqui trocaria a falha da asserção; sem como coletar, fica o rótulo marcado.
function installEvidence(label, result, rejected) {
  const text = (value) => (value === undefined || typeof value === "string" ? value : "<não é texto>");
  const pick = (list, keys) => {
    if (list === undefined) return undefined;
    if (!Array.isArray(list)) return "<não é lista>";
    return list.map((item) => Object.fromEntries(keys.flatMap((key) => (typeof item?.[key] === "string" ? [[key, item[key]]] : []))));
  };
  try {
    return `${label} ${JSON.stringify({
      status: text(result?.status),
      errors: pick(result?.errors, ["code"]),
      steps: pick(result?.steps, ["step", "state"]),
      conflicts: pick(result?.conflicts, ["code", "file", "event"]),
      rejected,
    })}`;
  } catch {
    return `${label} (evidência indisponível)`;
  }
}

// Staging próprio trocado durante a instalação Hermes — achado R7-F1 da
// verificação independente round 7. Com `plugins` estável, só o staging é
// movido e no lugar dele fica junção (Windows) / symlink (POSIX) para outra
// pasta do alvo ou para fora dele — com cópias exatas dos artefatos, ou vazia
// — ou um arquivo. A troca acontece logo depois de um efeito real da própria
// instalação: exclusão de um arquivo da sobra própria (também na limpeza
// depois de um rename falho), criação do staging ou gravação de um artefato.
// O io registra toda operação que atravessa o caminho do staging depois da
// troca — leitura, gravação, exclusão, promoção e metadado de um filho; só o
// `lstat` do próprio caminho não segue o link — e cada promoção tentada.
function stagingSwapIo(home, { on, failRename }, swap) {
  const io = createNodeIo();
  const staging = path.join(home, "plugins", STAGING_NAME);
  const pluginDir = path.join(home, "plugins", "skill-me-observer");
  const probe = { swapped: false, through: [], promotions: 0, trigger: null };
  const counts = {};
  const through = (op, file) => file.startsWith(staging + path.sep) || (file === staging && op !== "lstat");
  const eventOf = (op, file) => {
    if (op === "unlink" && path.dirname(file) === staging) return "arquivo da sobra própria removido";
    if (op === "mkdir" && file === staging) return "staging criado";
    if (op === "writeExclusive" && path.dirname(file) === staging) return "artefato gravado no staging";
    return null;
  };
  const wrapped = { ...io };
  for (const op of FS_OPS) {
    wrapped[op] = async (...args) => {
      const files = args.slice(0, op === "rename" ? 2 : 1);
      if (probe.swapped && files.some((file) => through(op, file))) {
        probe.through.push(`${op} ${files.map((file) => path.relative(home, file).split(path.sep).join("/")).join(" → ")}`);
      }
      if (op === "rename" && args[0] === staging && args[1] === pluginDir) {
        probe.promotions += 1;
        if (failRename) throw simulated("EIO");
      }
      const out = await io[op](...args);
      const event = eventOf(op, args[0]);
      if (event !== null) counts[event] = (counts[event] ?? 0) + 1;
      if (on && !probe.swapped && event === on[0] && counts[event] === on[1]) {
        swap();
        probe.swapped = true;
        probe.trigger = path.basename(args[0]);
      }
      return out;
    };
  }
  return { io: wrapped, probe };
}

test("I4-C34i Hermes: staging próprio trocado durante a instalação não leva leitura, gravação, exclusão nem promoção para outro lugar", async () => {
  const changed = { code: "config_changed_during_apply", file: `plugins/${STAGING_NAME}` };
  const done = [
    { step: "artifacts", state: "done" },
    { step: "manifest", state: "done" },
  ];
  // Destino da junção/link e o que ele tem antes da troca; `file`: arquivo do
  // usuário no lugar do staging.
  const DESTS = {
    "outra pasta do alvo com cópias exatas dos artefatos": { outside: false, fill: copyPackageArtifacts },
    "pasta externa com cópias exatas dos artefatos": { outside: true, fill: copyPackageArtifacts },
    "outra pasta do alvo vazia": { outside: false, fill: (dir) => mkdirSync(dir) },
    "pasta externa vazia": { outside: true, fill: (dir) => mkdirSync(dir) },
    "arquivo do usuário": { file: true },
  };
  // O que fica no staging próprio movido: a sobra menos o arquivo cuja
  // exclusão disparou a troca (ordem do `readdir`), ou o que já foi gravado.
  const leftoverMinus = (removed) => OWN_ARTIFACTS.filter((name) => name !== removed);
  const writtenUpTo = (written) => OWN_ARTIFACTS.slice(0, OWN_ARTIFACTS.indexOf(written) + 1);
  const rows = [
    { leftover: true, on: ["arquivo da sobra própria removido", 1], dest: "outra pasta do alvo com cópias exatas dos artefatos", ownLeft: leftoverMinus },
    { leftover: true, on: ["arquivo da sobra própria removido", 1], dest: "pasta externa com cópias exatas dos artefatos", ownLeft: leftoverMinus },
    // Depois da última exclusão sobra o `rmdir`: no Windows ele removeria a junção.
    { leftover: true, on: ["arquivo da sobra própria removido", 3], dest: "outra pasta do alvo vazia", ownLeft: () => [] },
    { on: ["staging criado", 1], dest: "pasta externa vazia", ownLeft: () => [] },
    { on: ["artefato gravado no staging", 1], dest: "outra pasta do alvo vazia", ownLeft: writtenUpTo },
    { on: ["artefato gravado no staging", 1], dest: "pasta externa vazia", ownLeft: writtenUpTo },
    { on: ["artefato gravado no staging", 1], dest: "arquivo do usuário", ownLeft: writtenUpTo },
    // Completo, antes da promoção: o link não vira a pasta do plugin.
    { on: ["artefato gravado no staging", 3], dest: "pasta externa com cópias exatas dos artefatos", ownLeft: writtenUpTo },
    { on: ["artefato gravado no staging", 3], dest: "outra pasta do alvo com cópias exatas dos artefatos", ownLeft: writtenUpTo },
    // Limpeza depois de um rename falho (EIO): a troca acontece depois da 1ª exclusão dela.
    { failRename: true, on: ["arquivo da sobra própria removido", 1], dest: "outra pasta do alvo com cópias exatas dos artefatos", ownLeft: leftoverMinus },
    { control: "instalação sem troca" },
    { control: "sobra própria limpa sem troca", leftover: true },
    { control: "rename falho (EIO) sem troca: só a sobra própria sai", failRename: true },
  ];
  const observed = [];
  const expected = [];
  for (const [index, row] of rows.entries()) {
    const label = row.control
      ? `controle: ${row.control}`
      : `${row.leftover ? "sobra própria, " : ""}${row.on[0]} (${row.on[1]}º)${row.failRename ? " na limpeza do rename falho" : ""} — ${row.dest}`;
    const dir = makeScratch(`r7 staging ${index}`);
    scratches.push(dir);
    const home = path.join(dir, "hermes home");
    const plugins = path.join(home, "plugins");
    mkdirSync(plugins, { recursive: true });
    const staging = path.join(plugins, STAGING_NAME);
    if (row.leftover) copyPackageArtifacts(staging);
    const dest = row.dest ? DESTS[row.dest] : null;
    const destPath = dest && !dest.file ? path.join(dest.outside ? dir : home, dest.outside ? "pasta externa" : "outra pasta") : null;
    if (destPath) dest.fill(destPath);
    const destBefore = destPath ? snapshotTree(destPath) : null;
    const moved = path.join(dir, "staging próprio movido");
    const { io, probe } = stagingSwapIo(home, row, () => {
      renameSync(staging, moved);
      if (dest.file) writeFileSync(staging, USER_FILE);
      else symlinkSync(destPath, staging, DIR_LINK);
    });
    const result = await runIntegrationCommand({ command: "install", agent: "hermes", target: home, apply: true, io });
    const manifest = path.join(home, ".skill-me", "hermes-install.json");
    observed.push({
      label,
      swapped: probe.swapped,
      exitCode: result.exitCode,
      status: result.status,
      applied: result.applied,
      conflicts: result.conflicts,
      errors: result.errors,
      steps: result.steps,
      throughStaging: probe.through,
      promotions: probe.promotions,
      foreignDest: destBefore === null ? "—" : existsSync(destPath) && isDeepStrictEqual(snapshotTree(destPath), destBefore) ? "intacto" : "alterado",
      atStaging: packageEntry(staging),
      ownMoved: existsSync(moved) ? packageEntry(moved) : "—",
      pluginDir: packageEntry(path.join(plugins, "skill-me-observer")),
      manifest: existsSync(manifest) ? "gravado" : "ausente",
      lockReleased: !existsSync(path.join(home, ".skill-me", "hermes.lock")),
    });
    if (row.control) {
      expected.push({
        label,
        swapped: false,
        exitCode: row.failRename ? 5 : 0,
        status: row.failRename ? "incomplete" : "applied",
        applied: !row.failRename,
        conflicts: [],
        errors: row.failRename ? [{ code: "EIO" }] : [],
        steps: row.failRename ? [{ step: "artifacts", state: "failed" }] : done,
        throughStaging: [],
        promotions: 1,
        foreignDest: "—",
        atStaging: "ausente",
        ownMoved: "—",
        pluginDir: row.failRename ? "ausente" : packageDir(OWN_ARTIFACTS),
        manifest: row.failRename ? "ausente" : "gravado",
        lockReleased: true,
      });
      continue;
    }
    expected.push({
      label,
      swapped: true,
      exitCode: row.failRename ? 5 : 4,
      status: row.failRename ? "incomplete" : "conflict",
      applied: false,
      conflicts: row.failRename ? [] : [changed],
      errors: row.failRename ? [{ code: "EIO" }] : [],
      steps: row.failRename ? [{ step: "artifacts", state: "failed" }] : [],
      throughStaging: [],
      promotions: row.failRename ? 1 : 0,
      foreignDest: dest.file ? "—" : "intacto",
      atStaging: dest.file ? "arquivo do usuário intacto" : `link → ${path.basename(destPath)}`,
      ownMoved: packageDir(row.ownLeft(probe.trigger)),
      pluginDir: "ausente",
      manifest: "ausente",
      lockReleased: true,
    });
  }
  assert.deepEqual(observed, expected);
});

// Tipo, bytes e árvore de uma entrada sem seguir link (do destino de um link:
// caminho real e árvore).
function entrySnapshot(file) {
  const stats = lstatSync(file);
  if (stats.isSymbolicLink()) return { type: "link", to: realpathSync(file), tree: snapshotTree(realpathSync(file)) };
  if (stats.isDirectory()) return { type: "dir", mtimeMs: stats.mtimeMs, tree: snapshotTree(file) };
  return { type: "file", mtimeMs: stats.mtimeMs, sha256: sha256File(file) };
}

// Entrada posta por outro programa no destino da promoção depois de o plano o
// ler ausente — achado R7-F2. Logo depois do último artefato gravado no
// staging aparece em `plugins/skill-me-observer` um diretório real vazio (com
// `plugins` já presente ou criada pela instalação), um diretório com arquivo
// do usuário, uma junção/link para uma pasta vazia do alvo ou um arquivo. No
// POSIX, `rename` de um diretório sobre um diretório vazio o substitui com
// sucesso (rename(2)); no Windows ele falha. Só no Windows o io da prova emula
// essa semântica — remove o diretório vazio antes do rename real — para que a
// falta de conferência apareça nas duas plataformas; o comportamento POSIX
// nativo é o do Linux/WSL. A prova registra cada promoção tentada e o que
// havia no destino nela.
test("I4-C34j Hermes: entrada surgida no destino da promoção depois do plano é alheia e não é tomada pela instalação", async (t) => {
  const foreign = { code: "foreign_artifact", file: "plugins/skill-me-observer" };
  const APPEAR = {
    "diretório real vazio": (pluginDir) => mkdirSync(pluginDir),
    "diretório real com arquivo do usuário": (pluginDir) => {
      mkdirSync(pluginDir);
      writeFileSync(path.join(pluginDir, "notas.txt"), USER_FILE);
    },
    "junção/link para uma pasta vazia do alvo": (pluginDir, home) => {
      const userDir = path.join(home, "pasta vazia do usuário");
      mkdirSync(userDir);
      symlinkSync(userDir, pluginDir, DIR_LINK);
    },
    "arquivo do usuário": (pluginDir) => writeFileSync(pluginDir, USER_FILE),
  };
  const rows = [
    { appear: "diretório real vazio", atPluginDir: "diretório real []" },
    { appear: "diretório real vazio", noPlugins: true, atPluginDir: "diretório real []" },
    { appear: "diretório real com arquivo do usuário", atPluginDir: "diretório real [notas.txt: arquivo do usuário intacto]" },
    { appear: "junção/link para uma pasta vazia do alvo", atPluginDir: "link → pasta vazia do usuário" },
    { appear: "arquivo do usuário", atPluginDir: "arquivo do usuário intacto" },
    { control: "nada surge" },
    { control: "nada surge, plugins criada pela instalação", noPlugins: true },
  ];
  const observed = [];
  const expected = [];
  for (const [index, row] of rows.entries()) {
    const label = row.control ? `controle: ${row.control}` : `${row.appear}${row.noPlugins ? " (plugins criada pela instalação)" : ""}`;
    const dir = makeScratch(`r7 destino ${index}`);
    scratches.push(dir);
    const home = path.join(dir, "hermes home");
    mkdirSync(home);
    const plugins = path.join(home, "plugins");
    if (!row.noPlugins) mkdirSync(plugins);
    const pluginDir = path.join(plugins, "skill-me-observer");
    const staging = path.join(plugins, STAGING_NAME);
    const io = createNodeIo();
    const probe = { appeared: false, promotions: [] };
    let written = 0;
    let destBefore = null;
    const instrumented = {
      ...io,
      async writeExclusive(file, data, options) {
        await io.writeExclusive(file, data, options);
        if (row.appear && path.dirname(file) === staging && ++written === OWN_ARTIFACTS.length) {
          APPEAR[row.appear](pluginDir, home);
          probe.appeared = true;
          destBefore = entrySnapshot(pluginDir);
        }
      },
      async rename(from, to) {
        if (from === staging && to === pluginDir) {
          probe.promotions.push(packageEntry(to));
          if (process.platform === "win32" && !isSymlink(to) && existsSync(to) && lstatSync(to).isDirectory() && readdirSync(to).length === 0) {
            t.diagnostic(`${label}: rename emulado com a semântica POSIX (destino vazio removido antes do rename real) — não é execução POSIX`);
            rmdirSync(to);
          }
        }
        return io.rename(from, to);
      },
    };
    const result = await runIntegrationCommand({ command: "install", agent: "hermes", target: home, apply: true, io: instrumented });
    const manifest = path.join(home, ".skill-me", "hermes-install.json");
    observed.push({
      label,
      appeared: probe.appeared,
      exitCode: result.exitCode,
      status: result.status,
      applied: result.applied,
      conflicts: result.conflicts,
      steps: result.steps,
      promotions: probe.promotions,
      destination: destBefore === null ? "—" : (existsSync(pluginDir) || isSymlink(pluginDir)) && isDeepStrictEqual(entrySnapshot(pluginDir), destBefore) ? "intacto" : "alterado",
      atPluginDir: packageEntry(pluginDir),
      ownStaging: packageEntry(staging),
      manifest: existsSync(manifest) ? "gravado" : "ausente",
      lockReleased: !existsSync(path.join(home, ".skill-me", "hermes.lock")),
    });
    if (row.control) {
      expected.push({
        label,
        appeared: false,
        exitCode: 0,
        status: "applied",
        applied: true,
        conflicts: [],
        steps: [
          { step: "artifacts", state: "done" },
          { step: "manifest", state: "done" },
        ],
        promotions: ["ausente"],
        destination: "—",
        atPluginDir: packageDir(OWN_ARTIFACTS),
        ownStaging: "ausente",
        manifest: "gravado",
        lockReleased: true,
      });
      continue;
    }
    // Nada é promovido sobre a entrada alheia: ela fica com tipo, bytes e
    // árvore, e o staging próprio completo fica onde está.
    expected.push({
      label,
      appeared: true,
      exitCode: 4,
      status: "conflict",
      applied: false,
      conflicts: [foreign],
      steps: [],
      promotions: [],
      destination: "intacto",
      atPluginDir: row.atPluginDir,
      ownStaging: packageDir(OWN_ARTIFACTS),
      manifest: "ausente",
      lockReleased: true,
    });
  }
  assert.deepEqual(observed, expected);
});

// O que há num caminho da configuração, sem seguir link; reconhecido pelo
// conteúdo, sem confiar no instalador.
function configEntry(file) {
  if (isSymlink(file)) return existsSync(file) ? `link → ${path.basename(realpathSync(file))}` : "link pendente";
  if (!existsSync(file)) return "ausente";
  if (lstatSync(file).isDirectory()) return `diretório [${readdirSync(file).sort().map((name) => `${name}: ${configEntry(path.join(file, name))}`).join("; ")}]`;
  const text = readFileSync(file, "utf8");
  if (text === OWN_LOCK) return "lock próprio";
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return text === USER_FILE ? "arquivo do usuário intacto" : "outro conteúdo";
  }
  if (body.tool === "skill-me") return `registro próprio (${(body.entries ?? body.artifacts).length})`;
  const own = (handler) => (Array.isArray(handler.args) && handler.args.includes(INTEGRATIONS_CLI)) || (typeof handler.command === "string" && handler.command.includes(INTEGRATIONS_CLI));
  const events = Object.values(body.hooks ?? {}).filter((groups) => groups.some((group) => (group.hooks ?? []).some(own)));
  return `configuração (${events.length} eventos próprios)`;
}
const dirOf = (entries) => `diretório [${Object.keys(entries).sort().map((name) => `${name}: ${entries[name]}`).join("; ")}]`;
const CONTENT_OPS = ["readdir", "readBytes", "readText", "unlink", "rmdir", "mkdir", "writeExclusive", "rename"];

// io real que troca uma vez o caminho `swapped` — logo depois do evento `on`
// ou na primeira tentativa de rename do temporário da configuração, que então
// falha com `renameFails` — e registra leitura de conteúdo, gravação e
// exclusão através dele depois da troca.
function rootSwapIo(scratch, swapped, files, { on, renameFails }, swap) {
  const io = createNodeIo();
  const probe = { swapped: false, through: [], renameAttempts: 0 };
  const counts = {};
  const fire = () => {
    if (probe.swapped || !swap) return;
    swap();
    probe.swapped = true;
  };
  const passes = (file) => file === swapped || file.startsWith(swapped + path.sep);
  const configTemp = files.config && `${files.config}.skill-me-tmp`;
  const eventOf = (op, file) => {
    if (op === "readText" && file === files.config) return "leitura da configuração";
    if (op === "readText" && file === files.manifest) return "leitura do registro";
    if (op === "writeExclusive" && file === configTemp) return "temporário da configuração criado";
    if (op === "writeExclusive" && file === files.lock) return "lock criado";
    return null;
  };
  const wrapped = { ...io };
  for (const op of CONTENT_OPS) {
    wrapped[op] = async (...args) => {
      const paths = args.slice(0, op === "rename" ? 2 : 1);
      if (op === "rename" && args[0] === configTemp && ++probe.renameAttempts === 1 && renameFails) {
        fire();
        throw simulated(renameFails);
      }
      if (probe.swapped && paths.some(passes)) probe.through.push(`${op} ${paths.map((file) => path.relative(scratch, file).split(path.sep).join("/")).join(" → ")}`);
      const out = await io[op](...args);
      const event = eventOf(op, args[0]);
      if (event !== null) counts[event] = (counts[event] ?? 0) + 1;
      if (on && event === on[0] && counts[event] === on[1]) fire();
      return out;
    };
  }
  return { io: wrapped, probe };
}

// Raiz do alvo, ou um ancestral dela, trocada durante a aplicação — achado
// R7-F3. A pasta é movida para outro lugar do scratch e no nome antigo fica
// junção (Windows) / symlink (POSIX) para a pasta movida: os mesmos arquivos,
// com os mesmos bytes e acesso, passam a ser alcançados fora da raiz real
// resolvida no início. A troca acontece logo depois de um passo real: última
// leitura da prévia, lock criado, leitura do registro sob o lock, criação do
// temporário da configuração, leitura da configuração na exclusão, ou na
// primeira tentativa de rename do temporário (negada com EPERM ou com falha de
// E/S). Também só o arquivo da configuração trocado por link de arquivo para
// ele mesmo movido para fora do alvo. Controles: nada muda, rename negado uma
// vez, alvo por alias e configuração já como link de arquivo contido (julgado
// na rodada 6: o link vira arquivo regular).
test("I4-C27d raiz ou ancestral trocados durante a aplicação não levam leitura, gravação nem exclusão da configuração para fora da raiz real", async (t) => {
  const C = (n) => `configuração (${n} eventos próprios)`;
  const LOCK = "lock próprio";
  const REG = (n) => `registro próprio (${n})`;
  const rootEscape = { code: "target_escape", file: "." };
  const lockKept = (agent) => ({ code: "config_changed_during_apply", file: `.skill-me/${agent}.lock` });
  const fileEscape = { code: "target_escape", file: "settings.json" };
  const claudeInstallTemp = dirOf({ ".skill-me": dirOf({ "claude.lock": LOCK }), "settings.json": C(0), "settings.json.skill-me-tmp": C(8) });
  const claudeDeleteKept = dirOf({ ".skill-me": dirOf({ "claude-install.json": REG(8), "claude.lock": LOCK }), "settings.json": C(8) });
  const codexInstallTemp = dirOf({ ".skill-me": dirOf({ "codex.lock": LOCK }), "hooks.json": C(0), "hooks.json.skill-me-tmp": C(6) });
  // `op`: "uninstall delete" parte de um alvo sem configuração (a instalação
  // cria o arquivo; a remoção o apaga). `tree`: o que fica na pasta real — a
  // movida, nas trocas da raiz e do ancestral.
  const rows = [
    { agent: "claude", op: "install", swap: "raiz", on: ["leitura do registro", 1], conflicts: [rootEscape], tree: dirOf({ "settings.json": C(0) }) },
    { agent: "claude", op: "install", swap: "raiz", on: ["lock criado", 1], conflicts: [rootEscape, lockKept("claude")], tree: dirOf({ ".skill-me": dirOf({ "claude.lock": LOCK }), "settings.json": C(0) }) },
    { agent: "claude", op: "install", swap: "raiz", on: ["leitura do registro", 2], conflicts: [rootEscape, lockKept("claude")], tree: dirOf({ ".skill-me": dirOf({ "claude.lock": LOCK }), "settings.json": C(0) }) },
    { agent: "claude", op: "install", swap: "raiz", on: ["temporário da configuração criado", 1], conflicts: [rootEscape, lockKept("claude")], tree: claudeInstallTemp },
    { agent: "claude", op: "install", swap: "ancestral", on: ["temporário da configuração criado", 1], conflicts: [rootEscape, lockKept("claude")], tree: dirOf({ ".claude": claudeInstallTemp }) },
    {
      agent: "claude",
      op: "uninstall",
      swap: "raiz",
      on: ["temporário da configuração criado", 1],
      conflicts: [rootEscape, lockKept("claude")],
      tree: dirOf({ ".skill-me": dirOf({ "claude-install.json": REG(8), "claude.lock": LOCK }), "settings.json": C(8), "settings.json.skill-me-tmp": C(0) }),
    },
    { agent: "claude", op: "uninstall delete", swap: "raiz", on: ["leitura do registro", 2], conflicts: [rootEscape, lockKept("claude")], tree: claudeDeleteKept },
    { agent: "claude", op: "uninstall delete", swap: "raiz", on: ["leitura da configuração", 3], conflicts: [rootEscape, lockKept("claude")], tree: claudeDeleteKept },
    { agent: "claude", op: "uninstall delete", swap: "ancestral", on: ["leitura da configuração", 3], conflicts: [rootEscape, lockKept("claude")], tree: dirOf({ ".claude": claudeDeleteKept }) },
    { agent: "codex", op: "install", swap: "raiz", renameFails: "EPERM", renameAttempts: 1, conflicts: [rootEscape, lockKept("codex")], tree: codexInstallTemp },
    {
      agent: "codex",
      op: "install",
      swap: "raiz",
      renameFails: "EIO",
      renameAttempts: 1,
      exitCode: 5,
      conflicts: [lockKept("codex")],
      errors: [{ code: "EIO" }],
      steps: [{ step: "config", state: "failed" }],
      tree: codexInstallTemp,
    },
    {
      agent: "codex",
      op: "uninstall",
      swap: "raiz",
      on: ["temporário da configuração criado", 1],
      conflicts: [rootEscape, lockKept("codex")],
      tree: dirOf({ ".skill-me": dirOf({ "codex-install.json": REG(6), "codex.lock": LOCK }), "hooks.json": C(6), "hooks.json.skill-me-tmp": C(0) }),
    },
    { agent: "hermes", op: "install", swap: "raiz", on: ["leitura do registro", 2], conflicts: [rootEscape, lockKept("hermes")], tree: dirOf({ ".skill-me": dirOf({ "hermes.lock": LOCK }) }) },
    { agent: "claude", op: "install", swap: "arquivo", on: ["temporário da configuração criado", 1], conflicts: [fileEscape], tree: dirOf({ "settings.json": "link → configuração movida.json" }), outside: C(0) },
    {
      agent: "claude",
      op: "uninstall delete",
      swap: "arquivo",
      on: ["leitura do registro", 2],
      conflicts: [fileEscape],
      tree: dirOf({ ".skill-me": dirOf({ "claude-install.json": REG(8) }), "settings.json": "link → configuração movida.json" }),
      outside: C(8),
    },
    { agent: "claude", op: "install", control: "nada muda", renameAttempts: 1, tree: dirOf({ ".skill-me": dirOf({ "claude-install.json": REG(8) }), "settings.json": C(8) }) },
    { agent: "claude", op: "uninstall delete", control: "nada muda", tree: dirOf({}) },
    { agent: "codex", op: "install", control: "rename negado uma vez, nada muda", renameFails: "EPERM", renameAttempts: 2, tree: dirOf({ ".skill-me": dirOf({ "codex-install.json": REG(6) }), "hooks.json": C(6) }) },
    { agent: "claude", op: "install", control: "alvo por alias já antes do comando", renameAttempts: 1, tree: dirOf({ ".skill-me": dirOf({ "claude-install.json": REG(8) }), "settings.json": C(8) }) },
    {
      agent: "claude",
      op: "install",
      control: "configuração já como link de arquivo contido",
      renameAttempts: 1,
      tree: dirOf({ ".skill-me": dirOf({ "claude-install.json": REG(8) }), "configuração real.json": C(0), "settings.json": C(8) }),
    },
  ];
  const observed = [];
  const expected = [];
  for (const [index, row] of rows.entries()) {
    const label = `${row.agent} ${row.op} — ${row.control ? `controle: ${row.control}` : `${row.swap}, ${row.on ? `${row.on[0]} (${row.on[1]}ª)` : `rename ${row.renameFails}`}`}`;
    const fileLink = row.swap === "arquivo" || row.control?.includes("link de arquivo");
    if (fileLink && !fileLinksAllowed()) {
      t.diagnostic(`${label}: não executado — symlink de arquivo exige privilégio neste Windows (EPERM); coberto no Linux/WSL`);
      continue;
    }
    const dir = makeScratch(`r7 raiz ${index}`);
    scratches.push(dir);
    const perfil = path.join(dir, "perfil");
    const home = path.join(perfil, { claude: ".claude", codex: ".codex", hermes: "hermes home" }[row.agent]);
    mkdirSync(home, { recursive: true });
    const config = row.agent === "hermes" ? null : path.join(home, CONFIG_OF[row.agent]);
    if (row.control === "configuração já como link de arquivo contido") {
      writeFileSync(path.join(home, "configuração real.json"), ORIGINAL);
      symlinkSync(path.join(home, "configuração real.json"), config, "file");
    } else if (row.agent === "claude" && row.op !== "uninstall delete") {
      writeFileSync(config, ORIGINAL);
    } else if (row.agent === "codex") {
      writeFileSync(config, CODEX_ORIGINAL);
    }
    const op = row.op === "install" ? "install" : "uninstall";
    if (op === "uninstall") assert.equal((await runIntegrationCommand({ command: "install", agent: row.agent, target: home, apply: true, io: createNodeIo() })).exitCode, 0, label);
    const configBefore = config !== null && existsSync(config) ? readFileSync(config) : null;
    const alias = path.join(dir, "perfil por alias");
    if (row.control === "alvo por alias já antes do comando") symlinkSync(home, alias, DIR_LINK);
    // Pasta real depois da troca, caminho trocado e configuração própria nela.
    const swaps = {
      raiz: { swapped: home, real: path.join(dir, "alvo movido"), from: home },
      ancestral: { swapped: perfil, real: path.join(dir, "perfil movido"), from: perfil },
      arquivo: { swapped: config, real: home, from: config, to: path.join(dir, "configuração movida.json") },
    };
    const swap = row.swap ? swaps[row.swap] : null;
    const doSwap =
      swap &&
      (() => {
        if (row.swap === "arquivo") {
          renameSync(config, swap.to);
          symlinkSync(swap.to, config, "file");
          return;
        }
        renameSync(swap.from, swap.real);
        symlinkSync(swap.real, swap.from, DIR_LINK);
      });
    const files = { config, manifest: path.join(home, ".skill-me", `${row.agent}-install.json`), lock: path.join(home, ".skill-me", `${row.agent}.lock`) };
    const { io, probe } = rootSwapIo(dir, swap?.swapped ?? home, files, row, doSwap);
    const targetArg = row.control === "alvo por alias já antes do comando" ? alias : home;
    const result = await runIntegrationCommand({ command: op, agent: row.agent, target: targetArg, apply: true, io });
    const realHome = row.swap === "ancestral" || row.swap === "raiz" ? swap.real : home;
    const ownConfig = row.swap === "arquivo" ? swap.to : row.swap === "ancestral" ? path.join(swap.real, path.basename(home), CONFIG_OF[row.agent] ?? "") : row.swap === "raiz" && config ? path.join(swap.real, CONFIG_OF[row.agent]) : null;
    observed.push({
      label,
      swapped: probe.swapped,
      exitCode: result.exitCode,
      status: result.status,
      applied: result.applied,
      conflicts: result.conflicts,
      errors: result.errors,
      steps: result.steps,
      renameAttempts: probe.renameAttempts,
      throughSwapped: probe.through,
      atSwapped: swap && row.swap !== "arquivo" ? configEntry(swap.from) : "—",
      tree: configEntry(realHome),
      ownConfigBytes: ownConfig === null || configBefore === null ? "—" : !existsSync(ownConfig) ? "ausente" : readFileSync(ownConfig).equals(configBefore) ? "iguais" : "diferentes",
      outside: row.swap === "arquivo" ? configEntry(swap.to) : "—",
      alias: row.control === "alvo por alias já antes do comando" ? configEntry(alias) : "—",
    });
    if (row.control) {
      expected.push({
        label,
        swapped: false,
        exitCode: 0,
        status: "applied",
        applied: true,
        conflicts: [],
        errors: [],
        steps: [
          { step: "config", state: "done" },
          { step: "manifest", state: "done" },
        ],
        renameAttempts: row.renameAttempts ?? 0,
        throughSwapped: [],
        atSwapped: "—",
        tree: row.tree,
        ownConfigBytes: "—",
        outside: "—",
        alias: row.control === "alvo por alias já antes do comando" ? `link → ${path.basename(home)}` : "—",
      });
      continue;
    }
    // Nada da configuração é lido, gravado nem apagado através do caminho
    // trocado: o que estava na pasta movida fica — inclusive o temporário e o
    // lock próprios criados antes da troca — e o código não mascara o efeito.
    expected.push({
      label,
      swapped: true,
      exitCode: row.exitCode ?? 4,
      status: row.exitCode === 5 ? "incomplete" : "conflict",
      applied: false,
      conflicts: row.conflicts,
      errors: row.errors ?? [],
      steps: row.steps ?? [],
      renameAttempts: row.renameAttempts ?? 0,
      throughSwapped: [],
      atSwapped: row.swap === "arquivo" ? "—" : `link → ${path.basename(swap.real)}`,
      tree: row.tree,
      ownConfigBytes: row.agent === "hermes" ? "—" : "iguais",
      outside: row.outside ?? "—",
      alias: "—",
    });
  }
  assert.deepEqual(observed, expected);
});

// Configuração trocada por outro documento depois da leitura sob o lock —
// achado R8-F1 da verificação independente round 8. O texto a gravar vem da
// configuração lida (0600, com um canário sintético no lugar de um segredo);
// outro processo põe no caminho um arquivo regular diferente 0644, contido no
// alvo, ou um link para um documento 0644 fora do alvo (no mesmo scratch), e a
// configuração lida vai para fora do alvo. A troca acontece logo depois da
// leitura do registro sob o lock, imediatamente antes de o instalador obter o
// acesso do original (`accessOf`) ou — janela residual, depois da última
// conferência — imediatamente antes de criar o temporário. O io registra o
// acesso pedido para o temporário e, depois da gravação e antes de cada
// tentativa de rename, o modo dele, quem ganhou acesso sobre o original e se o
// canário está nele. O modo depois da gravação é o mais amplo que o temporário
// teve: ele nasce só com os bits de dono e recebe grupo e modo antes do
// conteúdo (os quatro instantes de `I4-C25b`). Controles: troca na nova
// tentativa de um rename negado, acesso do próprio arquivo ampliado depois da
// conferência, configuração ausente na leitura e nada muda. No Windows o
// acesso é a DACL (o modo POSIX não se aplica): as colunas de modo ficam
// "ACL", o acesso pedido é conferido contra a DACL da configuração lida (a
// proteção efetiva dela é afirmada em I4-C25h) e as linhas de link de arquivo
// e de modo rodam no Linux/WSL.
const POSIX_ACCESS = process.platform !== "win32";
const octal = (mode) => `0${mode.toString(8)}`;
const R8_CANARY = "sintetico-r8-canario-nao-e-segredo";
const R8_READ = {
  claude: JSON.stringify({ env: { API_TOKEN: R8_CANARY }, permissions: { allow: ["Bash(npm test)"] } }, null, 2) + "\n",
  codex: JSON.stringify({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: `notify --token ${R8_CANARY}`, timeout: 30 }] }] } }, null, 2) + "\n",
};
const R8_SUBSTITUTE = JSON.stringify({ env: { OUTRO: "documento substituto sintético" } }, null, 2) + "\n";
const R8_EXTERNAL = JSON.stringify({ nota: "documento externo sintético" }, null, 2) + "\n";

// io real que troca uma vez a configuração — logo depois do evento `on` ou na
// primeira tentativa de rename do temporário, que então falha com
// `renameFails` — e observa o temporário da configuração (com `acl`, também
// as entradas da ACL POSIX dele, no Linux).
function accessSwapIo(files, { on, renameFails }, swap, { acl = false } = {}) {
  const io = createNodeIo();
  const probe = { swapped: false, requested: [], temp: [], renameAttempts: 0 };
  const counts = {};
  const configTemp = `${files.config}.skill-me-tmp`;
  const fire = () => {
    if (probe.swapped || !swap) return;
    swap();
    probe.swapped = true;
  };
  const due = (event) => {
    counts[event] = (counts[event] ?? 0) + 1;
    return on !== undefined && on[0] === event && counts[event] === on[1];
  };
  const observeTemp = (moment) => {
    const stats = lstatSync(configTemp);
    const dacl = POSIX_ACCESS ? null : readAces(configTemp);
    const entries = acl ? readAcl(configTemp).access : undefined;
    probe.temp.push({ moment, mode: stats.mode & 0o7777, gid: stats.gid, dacl, ...(acl ? { entries } : {}), canary: readFileSync(configTemp).includes(R8_CANARY) });
  };
  return {
    probe,
    io: {
      ...io,
      async readText(file) {
        const out = await io.readText(file);
        if (file === files.manifest && due("leitura do registro")) fire();
        return out;
      },
      async accessOf(file) {
        if (file === files.config && due("acesso do original")) fire();
        return io.accessOf(file);
      },
      async writeExclusive(file, data, options) {
        if (file !== configTemp) return io.writeExclusive(file, data, options);
        if (due("criação do temporário")) fire();
        probe.requested.push(options?.like ?? null);
        await io.writeExclusive(file, data, options);
        observeTemp("conteúdo gravado");
      },
      async rename(from, to) {
        if (from !== configTemp) return io.rename(from, to);
        observeTemp("antes do rename");
        if (++probe.renameAttempts === 1 && renameFails) {
          fire();
          throw simulated(renameFails);
        }
        return io.rename(from, to);
      },
    },
  };
}

// Acesso que o instalador pediu para o temporário: no POSIX o modo; no Windows,
// se a DACL transmitida é, ACE por ACE, a da configuração lida antes do
// comando (`originalDacl`, decomposta pelo helper, sem confiar no instalador).
function requestedAccess(like, originalDacl) {
  if (like === null) return "nenhum";
  if (POSIX_ACCESS) return octal(like.mode);
  return typeof like.dacl === "string" && isDeepStrictEqual(sddlAces(like.dacl), originalDacl) ? "DACL da configuração lida" : "outra DACL";
}

// O que está num caminho, sem seguir link, reconhecido pelos bytes conhecidos
// (ou pela configuração, sem confiar no instalador); no POSIX, com o modo.
function accessEntry(file, known, withMode) {
  let stats;
  try {
    stats = lstatSync(file);
  } catch (error) {
    if (error.code === "ENOENT") return "ausente";
    throw error;
  }
  if (stats.isSymbolicLink()) return `link → ${path.basename(realpathSync(file))}`;
  const bytes = readFileSync(file);
  const name = known.find(([, content]) => content !== null && bytes.equals(Buffer.from(content)))?.[0] ?? configEntry(file);
  return POSIX_ACCESS && withMode ? `${name} · ${octal(stats.mode & 0o7777)}` : name;
}

test("I4-C25f configuração trocada depois da leitura sob o lock: o conteúdo lido não vai para um temporário com o acesso de outro documento", async (t) => {
  if (!POSIX_ACCESS) t.diagnostic('Windows: acesso pela DACL — as colunas de modo POSIX não se aplicam e ficam "ACL"; acesso pedido (DACL conferida), código, conflito, temporário e arquivos são afirmados');
  const READ = "configuração lida sob o lock";
  const REGULAR = "arquivo regular diferente 0644";
  const LINK = "link para documento externo 0644";
  const WIDENED = "acesso do próprio arquivo ampliado para 0644";
  const POSTED = "arquivo do usuário posto";
  const m = (name, mode) => (POSIX_ACCESS ? `${name} · ${mode}` : name);
  const changed = (agent) => ({ code: "config_changed_during_apply", file: CONFIG_OF[agent] });
  const escape = (agent) => ({ code: "target_escape", file: CONFIG_OF[agent] });
  const swapped = { aside: m(READ, "0600") };
  const linked = { ...swapped, atConfig: "link → documento externo.json", external: m("documento externo", "0644") };
  const replaced = { ...swapped, atConfig: m("documento substituto", "0644") };
  // `temp`: instantes em que o temporário existe com conteúdo; ausente = nenhum.
  const rows = [
    { agent: "claude", op: "install", swap: REGULAR, on: ["leitura do registro", 2], conflict: changed("claude"), ...replaced },
    { agent: "claude", op: "install", swap: REGULAR, on: ["acesso do original", 1], conflict: changed("claude"), ...replaced },
    { agent: "claude", op: "install", swap: LINK, on: ["leitura do registro", 2], conflict: escape("claude"), ...linked },
    { agent: "claude", op: "install", swap: LINK, on: ["acesso do original", 1], conflict: escape("claude"), ...linked },
    { agent: "codex", op: "uninstall", swap: REGULAR, on: ["acesso do original", 1], conflict: changed("codex"), ...replaced, manifest: "registro próprio (6)" },
    { agent: "claude", op: "install", absent: true, swap: POSTED, on: ["leitura do registro", 2], conflict: changed("claude"), atConfig: "arquivo do usuário" },
    { agent: "claude", op: "install", swap: REGULAR, on: ["criação do temporário", 1], conflict: changed("claude"), temp: ["conteúdo gravado"], ...replaced },
    { agent: "claude", op: "install", swap: LINK, on: ["criação do temporário", 1], conflict: escape("claude"), temp: ["conteúdo gravado"], ...linked },
    { agent: "claude", op: "install", swap: WIDENED, on: ["criação do temporário", 1], conflict: changed("claude"), temp: ["conteúdo gravado"], atConfig: m(READ, "0644") },
    { agent: "claude", op: "install", swap: REGULAR, renameFails: "EPERM", conflict: changed("claude"), temp: ["conteúdo gravado", "antes do rename"], ...replaced },
    { agent: "claude", op: "install", control: true, atConfig: m("configuração (8 eventos próprios)", "0600"), manifest: "registro próprio (8)" },
    { agent: "codex", op: "uninstall", control: true, atConfig: m("configuração original", "0600") },
    { agent: "claude", op: "install", absent: true, control: true, atConfig: "configuração (8 eventos próprios)", manifest: "registro próprio (8)" },
  ];
  const observed = [];
  const expected = [];
  for (const [index, row] of rows.entries()) {
    const moment = { "leitura do registro": "logo depois da leitura do registro", "acesso do original": "imediatamente antes de obter o acesso do original", "criação do temporário": "imediatamente antes de criar o temporário" };
    const trigger = row.on ? `${moment[row.on[0]]} (${row.on[1]}ª)` : `rename negado (${row.renameFails}) e nova tentativa`;
    const label = `${row.agent} ${row.op}${row.absent ? " sem configuração" : ""} — ${row.control ? "controle: nada muda" : `${row.swap}, ${trigger}`}`;
    if (row.swap === LINK && !fileLinksAllowed()) {
      t.diagnostic(`${label}: não executado — symlink de arquivo exige privilégio neste Windows (EPERM); coberto no Linux/WSL`);
      continue;
    }
    if (row.swap === WIDENED && !POSIX_ACCESS) {
      t.diagnostic(`${label}: não executado — modo POSIX não se aplica no Windows (ACL); coberto no Linux/WSL`);
      continue;
    }
    const dir = makeScratch(`r8 acesso ${index}`);
    scratches.push(dir);
    const home = path.join(dir, "perfil", row.agent === "claude" ? ".claude" : ".codex");
    mkdirSync(home, { recursive: true });
    const config = path.join(home, CONFIG_OF[row.agent]);
    const aside = path.join(dir, "configuração lida movida.json");
    const external = path.join(dir, "documento externo.json");
    if (!row.absent) {
      writeFileSync(config, R8_READ[row.agent]);
      chmodSync(config, 0o600);
    }
    if (row.swap === LINK) {
      writeFileSync(external, R8_EXTERNAL);
      chmodSync(external, 0o644);
    }
    if (row.op === "uninstall") assert.equal((await runIntegrationCommand({ command: "install", agent: row.agent, target: home, apply: true, io: createNodeIo() })).exitCode, 0, label);
    const readBefore = row.absent ? null : readFileSync(config);
    const original = POSIX_ACCESS && !row.absent ? { mode: lstatSync(config).mode & 0o7777, gid: lstatSync(config).gid } : null;
    const originalDacl = !POSIX_ACCESS && !row.absent ? readAces(config) : null;
    if (original !== null) assert.equal(original.mode, 0o600, `${label}: configuração lida 0600`);
    const known = [
      [READ, readBefore],
      ["configuração original", row.absent ? null : R8_READ[row.agent]],
      ["documento substituto", R8_SUBSTITUTE],
      ["documento externo", R8_EXTERNAL],
      ["arquivo do usuário", USER_FILE],
    ];
    const swaps = {
      [REGULAR]: () => {
        renameSync(config, aside);
        writeFileSync(config, R8_SUBSTITUTE);
        chmodSync(config, 0o644);
      },
      [LINK]: () => {
        renameSync(config, aside);
        symlinkSync(external, config, "file");
      },
      [WIDENED]: () => chmodSync(config, 0o644),
      [POSTED]: () => {
        writeFileSync(config, USER_FILE);
        chmodSync(config, 0o644);
      },
    };
    const files = { config, manifest: path.join(home, ".skill-me", `${row.agent}-install.json`) };
    const { io, probe } = accessSwapIo(files, row, row.control ? null : swaps[row.swap]);
    const result = await runIntegrationCommand({ command: row.op, agent: row.agent, target: home, apply: true, io });
    observed.push({
      label,
      swapped: probe.swapped,
      exitCode: result.exitCode,
      status: result.status,
      applied: result.applied,
      conflicts: result.conflicts,
      errors: result.errors,
      steps: result.steps,
      renameAttempts: probe.renameAttempts,
      requested: probe.requested.map((like) => requestedAccess(like, originalDacl)),
      temp: probe.temp.map((o) => ({
        moment: o.moment,
        mode: !POSIX_ACCESS ? "ACL" : original === null ? "sem original" : octal(o.mode),
        widened: !POSIX_ACCESS ? "ACL" : original === null ? "sem original" : widenedRecipients(original, o),
        canary: o.canary,
      })),
      atConfig: accessEntry(config, known, !row.absent),
      aside: accessEntry(aside, known, true),
      external: accessEntry(external, known, true),
      tempLeft: accessEntry(`${config}.skill-me-tmp`, known, true),
      manifest: describeEntry(files.manifest),
      lockReleased: !existsSync(path.join(home, ".skill-me", `${row.agent}.lock`)),
    });
    // Com a troca antes da conferência, nada é gravado no temporário; depois
    // dela, o temporário tem o acesso conferido (0600 — nenhum destinatário
    // ganha acesso) e não é promovido. O documento posto, o externo e a
    // configuração lida ficam com bytes e modo; só sai o temporário próprio.
    const moments = row.temp ?? (row.control ? ["conteúdo gravado", "antes do rename"] : []);
    expected.push({
      label,
      swapped: !row.control,
      exitCode: row.control ? 0 : 4,
      status: row.control ? "applied" : "conflict",
      applied: Boolean(row.control),
      conflicts: row.control ? [] : [row.conflict],
      errors: [],
      steps: row.control
        ? [
            { step: "config", state: "done" },
            { step: "manifest", state: "done" },
          ]
        : [],
      renameAttempts: row.control || row.renameFails ? 1 : 0,
      requested: moments.length > 0 ? [row.absent ? "nenhum" : POSIX_ACCESS ? "0600" : "DACL da configuração lida"] : [],
      temp: moments.map((moment) => ({
        moment,
        mode: !POSIX_ACCESS ? "ACL" : row.absent ? "sem original" : "0600",
        widened: !POSIX_ACCESS ? "ACL" : row.absent ? "sem original" : [],
        canary: !row.absent,
      })),
      atConfig: row.atConfig,
      aside: row.aside ?? "ausente",
      external: row.external ?? "ausente",
      tempLeft: "ausente",
      manifest: row.manifest ?? "ausente",
      lockReleased: true,
    });
  }
  assert.deepEqual(observed, expected);
});

// Windows: DACL da configuração mudada ou trocada em volta da conferência —
// achado P1 da revisão formal round 4, na ordem de R8-F1. Fixture de I4-C25g:
// pasta com leitura herdável a "Usuários" e configuração lida com DACL
// protegida só do usuário do teste (canário sintético). O io de
// `accessSwapIo` registra a DACL pedida para o temporário e, depois da
// gravação e antes de cada tentativa de rename, a DACL dele e se o canário
// está nele. A DACL ampliada pelo dono depois da conferência — antes de criar
// o temporário ou antes da nova tentativa de um rename negado — não chega ao
// temporário e vira 4; o documento posto antes de o acesso ser obtido não
// fornece DACL a nada (4 sem temporário); uma falha de E/S no rename apaga o
// temporário próprio, criado com a DACL conferida. Controles: instalação do
// Claude e remoção do Codex sem troca.
const WINDOWS_HOME_DACL = "D:P(A;OICI;FA;;;{usuario})(A;OI;FR;;;BU)";
const OWNER_ONLY_DACL = "D:P(A;;FA;;;{usuario})";
const OWNER_AND_USERS_READ_DACL = "D:P(A;;FA;;;{usuario})(A;;FR;;;BU)";

// Caminho com o que está nele (sem seguir link) e a DACL, decomposta por SID.
function daclEntry(file, known) {
  if (!existsSync(file)) return "ausente";
  return [accessEntry(file, known, false), grantsOf(readAces(file))];
}

test(
  "I4-C25h Windows: o temporário recebe a DACL da configuração conferida; DACL mudada ou documento trocado em volta da conferência não leva o conteúdo lido a um acesso mais amplo",
  { skip: POSIX_ACCESS ? "windows-dacl: DACL do Windows; no POSIX o mesmo contrato de acesso é provado por I4-C25f" : false },
  async () => {
    const READ = "configuração lida sob o lock";
    const ownerOnly = { protegida: true, acessos: { "usuário do teste": "controle total" }, herdadas: 0 };
    const widenedByOwner = { protegida: true, acessos: { Usuários: "leitura", "usuário do teste": "controle total" }, herdadas: 0 };
    const inherited = { protegida: false, acessos: { Usuários: "leitura", "usuário do teste": "controle total" }, herdadas: 2 };
    const changed = (agent) => ({ code: "config_changed_during_apply", file: CONFIG_OF[agent] });
    const done = [
      { step: "config", state: "done" },
      { step: "manifest", state: "done" },
    ];
    const both = ["conteúdo gravado", "antes do rename"];
    const rows = [
      { agent: "claude", op: "install", label: "controle: nada muda", temp: both, renameAttempts: 1, steps: done, atConfig: ["configuração (8 eventos próprios)", ownerOnly], manifest: "registro próprio (8)" },
      { agent: "codex", op: "uninstall", label: "controle: nada muda", temp: both, renameAttempts: 1, steps: done, atConfig: ["configuração original", ownerOnly], manifest: "ausente" },
      { agent: "claude", op: "install", label: "DACL ampliada pelo dono imediatamente antes de criar o temporário", swap: "widen", on: ["criação do temporário", 1], conflict: changed("claude"), temp: ["conteúdo gravado"], renameAttempts: 0, atConfig: [READ, widenedByOwner] },
      { agent: "claude", op: "install", label: "rename negado (EPERM) e DACL ampliada antes da nova tentativa", swap: "widen", renameFails: "EPERM", conflict: changed("claude"), temp: both, renameAttempts: 1, atConfig: [READ, widenedByOwner] },
      { agent: "claude", op: "install", label: "documento com a ACL herdada posto imediatamente antes de obter o acesso", swap: "substitute", on: ["acesso do original", 1], conflict: changed("claude"), temp: [], renameAttempts: 0, atConfig: ["documento substituto", inherited], aside: [READ, ownerOnly] },
      { agent: "codex", op: "uninstall", label: "documento com a ACL herdada posto imediatamente antes de obter o acesso", swap: "substitute", on: ["acesso do original", 1], conflict: changed("codex"), temp: [], renameAttempts: 0, atConfig: ["documento substituto", inherited], aside: [READ, ownerOnly], manifest: "registro próprio (6)" },
      { agent: "claude", op: "install", label: "falha de E/S no rename", renameFails: "EIO", failure: "EIO", temp: both, renameAttempts: 1, atConfig: [READ, ownerOnly] },
    ];
    const observed = [];
    const expected = [];
    for (const [index, row] of rows.entries()) {
      const label = `${row.agent} ${row.op} — ${row.label}`;
      const dir = makeScratch(`r4 dacl ${index}`);
      scratches.push(dir);
      const home = path.join(dir, "perfil", row.agent === "claude" ? ".claude" : ".codex");
      mkdirSync(home, { recursive: true });
      setDacl(home, WINDOWS_HOME_DACL);
      const config = path.join(home, CONFIG_OF[row.agent]);
      const aside = path.join(dir, "configuração lida movida.json");
      writeFileSync(config, R8_READ[row.agent]);
      setDacl(config, OWNER_ONLY_DACL);
      if (row.op === "uninstall") assert.equal((await runIntegrationCommand({ command: "install", agent: row.agent, target: home, apply: true, io: createNodeIo() })).exitCode, 0, label);
      const readBefore = readFileSync(config);
      const originalDacl = readAces(config);
      const known = [
        [READ, readBefore],
        ["configuração original", R8_READ[row.agent]],
        ["documento substituto", R8_SUBSTITUTE],
      ];
      const swaps = {
        widen: () => setDacl(config, OWNER_AND_USERS_READ_DACL),
        substitute: () => {
          renameSync(config, aside);
          writeFileSync(config, R8_SUBSTITUTE);
        },
      };
      const files = { config, manifest: path.join(home, ".skill-me", `${row.agent}-install.json`) };
      const { io, probe } = accessSwapIo(files, row, row.swap ? swaps[row.swap] : null);
      const result = await runIntegrationCommand({ command: row.op, agent: row.agent, target: home, apply: true, io });
      observed.push({
        label,
        swapped: probe.swapped,
        exitCode: result.exitCode,
        status: result.status,
        applied: result.applied,
        conflicts: result.conflicts,
        errors: result.errors,
        steps: result.steps,
        renameAttempts: probe.renameAttempts,
        requested: probe.requested.map((like) => requestedAccess(like, originalDacl)),
        temp: probe.temp.map((o) => ({ moment: o.moment, ampliados: widenedSids(originalDacl, o.dacl), canary: o.canary })),
        atConfig: daclEntry(config, known),
        aside: daclEntry(aside, known),
        tempLeft: existsSync(`${config}.skill-me-tmp`) ? "presente" : "ausente",
        manifest: describeEntry(files.manifest),
        lockReleased: !existsSync(path.join(home, ".skill-me", `${row.agent}.lock`)),
      });
      // O temporário só existe com a DACL conferida — nenhum SID ganha acesso
      // sobre a configuração lida em nenhum instante observado — e só é
      // promovido sem troca; trocada a DACL ou o documento, a mudança do dono e
      // o documento posto ficam como estão.
      const control = row.label.startsWith("controle");
      expected.push({
        label,
        swapped: Boolean(row.swap),
        exitCode: control ? 0 : row.failure ? 5 : 4,
        status: control ? "applied" : row.failure ? "incomplete" : "conflict",
        applied: control,
        conflicts: row.conflict ? [row.conflict] : [],
        errors: row.failure ? [{ code: row.failure }] : [],
        steps: row.steps ?? (row.failure ? [{ step: "config", state: "failed" }] : []),
        renameAttempts: row.renameAttempts,
        requested: row.temp.length > 0 ? ["DACL da configuração lida"] : [],
        temp: row.temp.map((moment) => ({ moment, ampliados: [], canary: true })),
        atConfig: row.atConfig,
        aside: row.aside ?? "ausente",
        tempLeft: "ausente",
        manifest: row.manifest ?? "ausente",
        lockReleased: true,
      });
    }
    assert.deepEqual(observed, expected);
  },
);

// Linux: ACL POSIX da configuração mudada ou trocada em volta da conferência —
// achado P1 da revisão formal round 5, na ordem de R8-F1 (como I4-C25h para a
// DACL). Fixture sintética: pasta com ACL default que concede leitura a um uid
// sintético (sem conta) e configuração lida com ACL estendida que o restringe
// abaixo de "outros" (canário sintético). O io de `accessSwapIo` registra a
// ACL pedida para o temporário e, depois da gravação e antes de cada tentativa
// de rename, as entradas da ACL dele (acesso efetivo pelo algoritmo de acl(5)
// em helpers/posix-access.mjs) e se o canário está nele. A ACL ampliada ou
// removida pelo dono depois da conferência — antes de criar o temporário ou
// antes da nova tentativa de um rename negado — não chega ao temporário e
// vira 4; uma falha de E/S no rename apaga o temporário próprio, criado com a
// ACL conferida. Controles: instalação do Claude e remoção do Codex sem troca.
const ACL_SYN_UID = 2147400001;
const ACL_OTHER_UID = 2147400003;
const ACL_HOME_DEFAULT = `u::rwx,u:${ACL_SYN_UID}:r-x,g::r-x,m::r-x,o::---`;
const ACL_RESTRICTED = `u::rw-,u:${ACL_SYN_UID}:---,g::r--,m::r--,o::r--`;
const ACL_WIDENED = `u::rw-,u:${ACL_SYN_UID}:r--,g::r--,m::r--,o::r--`;

test(
  "I4-C25k Linux: o temporário recebe a ACL POSIX da configuração conferida; ACL mudada em volta da conferência não leva o conteúdo lido a um acesso mais amplo",
  { skip: process.platform !== "linux" ? "posix-acl: ACL POSIX (xattr) só no Linux; no Windows o mesmo contrato de acesso é provado por I4-C25h" : false },
  async () => {
    const READ = "configuração lida sob o lock";
    const restricted = ["user::rw-", `user:${ACL_SYN_UID}:---`, "group::r--", "mask::r--", "other::r--"];
    const widenedByOwner = ["user::rw-", `user:${ACL_SYN_UID}:r--`, "group::r--", "mask::r--", "other::r--"];
    const strippedByOwner = ["user::rw-", "group::r--", "other::r--"];
    const changed = (agent) => ({ code: "config_changed_during_apply", file: CONFIG_OF[agent] });
    const done = [
      { step: "config", state: "done" },
      { step: "manifest", state: "done" },
    ];
    const both = ["conteúdo gravado", "antes do rename"];
    const rows = [
      { agent: "claude", op: "install", label: "controle: nada muda", temp: both, renameAttempts: 1, steps: done, atConfig: ["configuração (8 eventos próprios)", restricted], manifest: "registro próprio (8)" },
      { agent: "codex", op: "uninstall", label: "controle: nada muda", temp: both, renameAttempts: 1, steps: done, atConfig: ["configuração original", restricted], manifest: "ausente" },
      { agent: "claude", op: "install", label: "ACL ampliada pelo dono imediatamente antes de criar o temporário", swap: "widen", on: ["criação do temporário", 1], conflict: changed("claude"), temp: ["conteúdo gravado"], renameAttempts: 0, atConfig: [READ, widenedByOwner] },
      { agent: "claude", op: "install", label: "ACL estendida removida pelo dono imediatamente antes de criar o temporário", swap: "strip", on: ["criação do temporário", 1], conflict: changed("claude"), temp: ["conteúdo gravado"], renameAttempts: 0, atConfig: [READ, strippedByOwner] },
      { agent: "claude", op: "install", label: "rename negado (EPERM) e ACL ampliada antes da nova tentativa", swap: "widen", renameFails: "EPERM", conflict: changed("claude"), temp: both, renameAttempts: 1, atConfig: [READ, widenedByOwner] },
      { agent: "claude", op: "install", label: "falha de E/S no rename", renameFails: "EIO", failure: "EIO", temp: both, renameAttempts: 1, atConfig: [READ, restricted] },
    ];
    const observed = [];
    const expected = [];
    for (const [index, row] of rows.entries()) {
      const label = `${row.agent} ${row.op} — ${row.label}`;
      const dir = makeScratch(`f5 acl ${index}`);
      scratches.push(dir);
      const home = path.join(dir, "perfil", row.agent === "claude" ? ".claude" : ".codex");
      mkdirSync(home, { recursive: true });
      const config = path.join(home, CONFIG_OF[row.agent]);
      writeFileSync(config, R8_READ[row.agent]);
      setAcl(config, ACL_RESTRICTED);
      setAcl(home, ACL_HOME_DEFAULT, { kind: "default" });
      if (row.op === "uninstall") assert.equal((await runIntegrationCommand({ command: "install", agent: row.agent, target: home, apply: true, io: createNodeIo() })).exitCode, 0, label);
      const readBefore = readFileSync(config);
      const original = { gid: lstatSync(config).gid, entries: readAcl(config).access };
      const originalRaw = rawAcl(config);
      const recipients = {
        "uid sintético": { uid: ACL_SYN_UID, groups: [] },
        "membro só do grupo dono": { uid: ACL_OTHER_UID, groups: [original.gid] },
        outros: { uid: ACL_OTHER_UID, groups: [] },
      };
      const known = [
        [READ, readBefore],
        ["configuração original", R8_READ[row.agent]],
      ];
      const swaps = { widen: () => setAcl(config, ACL_WIDENED), strip: () => removeAcl(config) };
      const files = { config, manifest: path.join(home, ".skill-me", `${row.agent}-install.json`) };
      const { io, probe } = accessSwapIo(files, row, row.swap ? swaps[row.swap] : null, { acl: true });
      const result = await runIntegrationCommand({ command: row.op, agent: row.agent, target: home, apply: true, io });
      observed.push({
        label,
        swapped: probe.swapped,
        exitCode: result.exitCode,
        status: result.status,
        applied: result.applied,
        conflicts: result.conflicts,
        errors: result.errors,
        steps: result.steps,
        renameAttempts: probe.renameAttempts,
        requested: probe.requested.map((like) => (like === null ? "nenhum" : like.acl === originalRaw ? "ACL da configuração lida" : like.acl === undefined ? "ACL não transmitida" : "outra ACL")),
        temp: probe.temp.map((o) => ({ moment: o.moment, ampliados: widenedAclRecipients(original, { gid: o.gid, entries: o.entries }, recipients), aclDaLida: isDeepStrictEqual(o.entries, original.entries), canary: o.canary })),
        atConfig: existsSync(config) ? [accessEntry(config, known, false), readAcl(config).access] : "ausente",
        tempLeft: existsSync(`${config}.skill-me-tmp`) ? "presente" : "ausente",
        manifest: describeEntry(files.manifest),
        lockReleased: !existsSync(path.join(home, ".skill-me", `${row.agent}.lock`)),
      });
      // O temporário só existe com a ACL conferida — nenhum destinatário ganha
      // acesso sobre a configuração lida em nenhum instante observado — e só é
      // promovido sem troca; mudada a ACL, a mudança do dono fica como está.
      const control = row.label.startsWith("controle");
      expected.push({
        label,
        swapped: Boolean(row.swap),
        exitCode: control ? 0 : row.failure ? 5 : 4,
        status: control ? "applied" : row.failure ? "incomplete" : "conflict",
        applied: control,
        conflicts: row.conflict ? [row.conflict] : [],
        errors: row.failure ? [{ code: row.failure }] : [],
        steps: row.steps ?? (row.failure ? [{ step: "config", state: "failed" }] : []),
        renameAttempts: row.renameAttempts,
        requested: row.temp.length > 0 ? ["ACL da configuração lida"] : [],
        temp: row.temp.map((moment) => ({ moment, ampliados: [], aclDaLida: true, canary: true })),
        atConfig: row.atConfig,
        tempLeft: "ausente",
        manifest: row.manifest ?? "ausente",
        lockReleased: true,
      });
    }
    assert.deepEqual(observed, expected);
  },
);
