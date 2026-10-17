import assert from "node:assert/strict";
import { appendFileSync, copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { isDeepStrictEqual } from "node:util";
import { replacementMode } from "../../src/integrations/install/io.mjs";
import { parseConfig, planJsonInstall, planJsonUninstall } from "../../src/integrations/install/json-hooks.mjs";
import { widenedRecipients } from "./helpers/posix-access.mjs";
import { createNodeIo, runIntegrationCommand } from "../../src/integrations/install/run.mjs";
import { makeScratch } from "./helpers/cli.mjs";
import { readClaudeHandlers, readCodexHandlers } from "./helpers/installed-hooks.mjs";
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
            rmSync(transient);
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
