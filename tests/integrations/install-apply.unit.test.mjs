import assert from "node:assert/strict";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { isDeepStrictEqual } from "node:util";
import { replacementMode } from "../../src/integrations/install/io.mjs";
import { parseConfig, planJsonInstall, planJsonUninstall } from "../../src/integrations/install/json-hooks.mjs";
import { widenedRecipients } from "./helpers/posix-access.mjs";
import { createNodeIo, runIntegrationCommand } from "../../src/integrations/install/run.mjs";
import { makeScratch } from "./helpers/cli.mjs";
import { readClaudeHandlers } from "./helpers/installed-hooks.mjs";
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
// conferências do temporário e da configuração.
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
    const instrumented = {
      ...io,
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
      waitedUnderOneSecond: Date.now() - started < 1000 + 500,
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
// entrada que sumiu é sondada de novo (agora ausente), em vez de virar falha de
// E/S; a aplicação segue.
test("I4-C29c entrada que some entre o lstat e o realpath da contenção é sondada de novo", async () => {
  const observed = [];
  for (const rel of ["settings.json.skill-me-tmp", ".skill-me/claude-install.json.skill-me-tmp"]) {
    const dir = target("vanishing-temp");
    const transient = path.join(dir, ...rel.split("/"));
    mkdirSync(path.dirname(transient), { recursive: true });
    writeFileSync(transient, "temporário transitório de outro processo\n");
    const io = createNodeIo();
    let vanished = false;
    const instrumented = {
      ...io,
      async realpath(file) {
        if (file === transient && !vanished) {
          vanished = true;
          rmSync(transient);
        }
        return io.realpath(file);
      },
    };
    const result = await runIntegrationCommand({ command: "install", agent: "claude", target: dir, apply: true, io: instrumented });
    observed.push({ rel, vanished, exitCode: result.exitCode, status: result.status, errors: result.errors, conflicts: result.conflicts, events: Object.keys(readClaudeHandlers(dir)).length });
  }
  assert.deepEqual(
    observed,
    ["settings.json.skill-me-tmp", ".skill-me/claude-install.json.skill-me-tmp"].map((rel) => ({ rel, vanished: true, exitCode: 0, status: "applied", errors: [], conflicts: [], events: 8 })),
  );
});
