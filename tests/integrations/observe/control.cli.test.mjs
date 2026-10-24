import assert from "node:assert/strict";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { runObserveCommand } from "../../../src/integrations/observe/command.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { INTEGRATIONS_CLI, makeScratch, runIntegrations } from "../helpers/cli.mjs";
import { SECRET_TEXT, claudePayload, codexHookPayload, execEvent, hermesRecord, leaks } from "../helpers/privacy-canaries.mjs";
import {
  DELIVERED_AUTO,
  HEX32,
  HEX64,
  automaticOf,
  configFile,
  homeEnv,
  listCaptures,
  observeFile,
  observeOk,
  prepareObservation,
  readObserveState,
  runNpmScript,
  runObserve,
} from "../helpers/observe.mjs";
import { ISO_MS, captureDir, exportOf, filesUnder, privacyOk, runHermesIngest, runHook, startCapture, statusOf, storeDir } from "../helpers/traces.mjs";
import { snapshotTree } from "../helpers/tree.mjs";
import { runWrapper, writeScenario } from "../helpers/wrapper.mjs";

// Provas S1 da issue #23 (.checks/issue-23-observacao-on-off.md, C1–C5):
// configuração única, `npm run on/off/status` em processos separados, como o
// usuário os chama, e a precedência do vínculo manual. Home e raiz são sempre
// temporários; nada lê ou grava o home de quem roda os testes.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

const OFF = { configured: true, state: "off", generation: null, changedAt: null };
const lostAll = (code, entries = 1) => ({ automatic: true, code, entries, committed: 0, persisted: 0, lost: entries, unrouted: 0 });
const MANUAL_STATE_KEYS = ["captureVersion", "content", "counters", "createdAt", "dataBytes", "dataFile", "endedAt", "id", "limits", "retentionDays", "state"];

test("I23-C1 setup persiste raiz e começa off: a configuração única vale para outro processo, e antes do on nada é criado", async () => {
  const home = scratch("i23 c1 home");
  const root = path.join(scratch("i23 c1 raiz"), "capturas ação");
  mkdirSync(root);
  const project = scratch("i23 c1 projeto");
  const env = homeEnv(home);

  // Antes da configuração: off e nada configurado.
  const before = runNpmScript("status", { env });
  assert.equal(before.status, 0, before.stdout);
  assert.deepEqual(before.body, { schemaVersion: 1, command: "status", status: "ok", observation: { ...OFF, configured: false }, automaticCaptures: 0, captures: [] });

  const setup = runObserve(["setup", "--root", root], { env });
  assert.deepEqual([setup.status, setup.stderr], [0, ""], setup.stdout);
  assert.deepEqual(setup.body, { schemaVersion: 1, command: "setup", status: "ok", observation: OFF });
  assert.ok(!setup.stdout.includes(path.basename(root)), "a resposta não ecoa a raiz");

  // Formato literal do Landing: raiz informada, caminho real e argv da entrega Hermes.
  assert.deepEqual(JSON.parse(readFileSync(configFile(home), "utf8")), {
    skillMeObserveConfig: 1,
    root,
    rootReal: root,
    hermesDelivery: [process.execPath, INTEGRATIONS_CLI, "ingest", "--agent", "hermes"],
  });
  assert.deepEqual(readdirSync(path.dirname(configFile(home))), ["observe.json"], "sem temporário de sobra");
  if (process.platform !== "win32") {
    assert.equal(statSync(path.dirname(configFile(home))).mode & 0o777, 0o700, "pasta só do dono");
    assert.equal(statSync(configFile(home)).mode & 0o777, 0o600, "arquivo só do dono");
  }

  // Outro processo, sem argumentos: configurado e off; nenhuma pasta do store.
  const status = runNpmScript("status", { env });
  assert.equal(status.status, 0, status.stdout);
  assert.deepEqual(status.body, { schemaVersion: 1, command: "status", status: "ok", observation: OFF, automaticCaptures: 0, captures: [] });
  const off = runNpmScript("off", { env });
  assert.deepEqual(off.body, { schemaVersion: 1, command: "off", status: "ok", observation: OFF, changed: false, stopped: [] });

  // Antes do on, um hook sem variáveis não cria captura nem pasta.
  const hook = await runHook("claude", claudePayload("pre_tool_bash"), { env, cwd: project });
  assert.deepEqual([hook.status, hook.stdout, hook.stderr], [0, "", ""]);
  assert.deepEqual(hook.report.delivery, lostAll("observe_off"));
  const hermes = await runHermesIngest([hermesRecord("pre_tool_call")], { env, cwd: project });
  assert.deepEqual(hermes.report.delivery, lostAll("observe_off"));
  assert.deepEqual(readdirSync(root), [], "raiz intacta antes do on");
});

test("I23-C2 setup recusa raiz inválida: relativa, inexistente ou arquivo não configuram; raiz trocada depois não recebe gravação", async () => {
  const home = scratch("i23 c2 home");
  const env = homeEnv(home);
  const base = scratch("i23 c2 base");
  // A relativa existe no diretório atual do comando e mesmo assim é recusada.
  mkdirSync(path.join(base, "capturas relativas ação"));
  const file = path.join(base, "arquivo ação.txt");
  writeFileSync(file, "não é pasta");
  const cases = [
    [["setup", "--root", "capturas relativas ação"], 2, "root_not_absolute"],
    [["setup", "--root=capturas relativas ação"], 2, "root_not_absolute"],
    [["setup", "--root", path.join(base, "não existe ação")], 3, "root_not_found"],
    [["setup", "--root", file], 3, "root_not_directory"],
    [["setup"], 2, "missing_root"],
    [["setup", "--root"], 2, "missing_flag_value"],
    [["setup", "--root="], 2, "missing_root"],
    [["setup", "--outra", base], 2, "unknown_flag"],
    [["setup", base], 2, "unexpected_argument"],
    [["setup", "--root", base, "--root", base], 2, "unexpected_argument"],
    [["on"], 3, "not_configured"],
    [["on", "--root", base], 2, "unexpected_argument"],
    [["ligar"], 2, "unknown_command"],
  ];
  for (const [args, exitCode, code] of cases) {
    const run = runObserve(args, { env, cwd: base });
    const label = args.join(" ");
    assert.equal(run.status, exitCode, `${label}: ${run.stdout}`);
    assert.equal(run.body.status, "error", label);
    assert.equal(run.body.error.code, code, label);
    assert.equal(run.stderr, "", label);
    for (const value of args.slice(1).filter((v) => v.length > 8)) assert.ok(!run.stdout.includes(value.replace(/^--root=/, "")), `${label}: valor ecoado`);
    assert.ok(!existsSync(path.join(home, ".skill-me")), `${label}: nada configurado`);
  }

  // Raiz configurada e ligada, depois trocada por junção/link para outra pasta.
  const { root, env: envOn } = prepareObservation(scratch, "i23 c2 troca");
  const project = scratch("i23 c2 projeto");
  observeOk(["on"], envOn);
  assert.deepEqual((await runHook("claude", claudePayload("pre_tool_bash"), { env: envOn, cwd: project })).report.delivery, DELIVERED_AUTO(1));
  const moved = `${root} original`;
  renameSync(root, moved);
  const elsewhere = scratch("i23 c2 outro destino");
  symlinkSync(elsewhere, root, process.platform === "win32" ? "junction" : "dir");
  const movedBefore = snapshotTree(moved);
  const runs = [
    await runHook("claude", claudePayload("post_tool_bash"), { env: envOn, cwd: project }),
    await runHook("codex", codexHookPayload("pre_tool_bash"), { env: envOn, cwd: project }),
    await runHermesIngest([hermesRecord("pre_tool_call")], { env: envOn, cwd: project }),
  ];
  for (const run of runs) {
    assert.deepEqual([run.status, run.stdout, run.stderr], [0, "", ""]);
    assert.deepEqual(run.report.delivery, lostAll("root_changed"));
  }
  assert.deepEqual(readdirSync(elsewhere), [], "nada no outro destino");
  assert.deepEqual(snapshotTree(moved), movedBefore, "nada na raiz original");
  for (const command of ["status", "on", "off"]) {
    const run = runObserve([command], { env: envOn });
    assert.deepEqual([run.status, run.body.error?.code], [4, "root_changed"], command);
  }
  const report = runIntegrations(["report", "--latest", "--format", "json"], { env: envOn });
  assert.deepEqual([report.status, JSON.parse(report.stdout).error.code], [4, "root_changed"], "report --latest");
  assert.deepEqual(readdirSync(elsewhere), [], "nem os comandos gravam no outro destino");
});

// Troca concorrente da raiz (F1 da verificação, rodada 1): os comandos rodam em
// processo, sobre home e raízes temporários reais, e a ordem entre eles é fixada
// pelo io de cada um, não por tempo. Linha "Barreira da configuração" do Landing.

function twoRoots(label) {
  const home = scratch(`${label} home`);
  const base = scratch(`${label} raízes`);
  const previous = path.join(base, "raiz anterior ação");
  const next = path.join(base, "raiz nova ação");
  mkdirSync(previous);
  mkdirSync(next);
  return { home, previous, next };
}

// io que segura a primeira chamada `op` cujo caminho satisfaz `matches` até a
// prova soltar.
function pausedAt(op, matches) {
  const base = createStoreIo();
  let armed = true;
  let reach;
  let release;
  const reached = new Promise((resolve) => (reach = resolve));
  const released = new Promise((resolve) => (release = resolve));
  const io = {
    ...base,
    async [op](file, ...rest) {
      if (armed && matches(file)) {
        armed = false;
        reach();
        await released;
      }
      return base[op](file, ...rest);
    },
  };
  return { io, reached, release };
}

// io que avisa quando o comando encontra ocupado um arquivo exclusivo (o lock de
// outro comando), sem mudar o resultado.
function watchingContention(label) {
  const base = createStoreIo();
  let signal;
  const contended = new Promise((resolve) => (signal = resolve));
  const io = {
    ...base,
    async writeExclusive(file, data, options) {
      try {
        return await base.writeExclusive(file, data, options);
      } catch (error) {
        if (error.code === "EEXIST") signal(`${label} esperou`);
        throw error;
      }
    },
  };
  return { io, contended };
}

const stateOf = (root) => (existsSync(observeFile(root)) ? readObserveState(root).state : "off");
const configuredRoot = (home) => JSON.parse(readFileSync(configFile(home), "utf8")).root;

// Só a raiz configurada pode estar on: é a única que status e off alcançam.
function assertOnlyConfiguredOn(home, roots) {
  const configured = configuredRoot(home);
  for (const root of roots) if (root !== configured) assert.equal(stateOf(root), "off", `${path.basename(root)} ficou on fora da configuração`);
}

async function assertOffReachesAll(home, roots) {
  const off = await runObserveCommand({ argv: ["off"], home });
  assert.equal(off.exitCode, 0, JSON.stringify(off.body));
  for (const root of roots) assert.equal(stateOf(root), "off", `off alcança ${path.basename(root)}`);
}

test("I23-C2 setup recusa raiz inválida: troca concorrente com on — setup já leu a raiz anterior off, on chega, setup grava a nova — não deixa raiz on fora da configuração", async () => {
  const { home, previous, next } = twoRoots("i23 c2 setup primeiro");
  assert.equal((await runObserveCommand({ argv: ["setup", "--root", previous], home })).exitCode, 0);
  const configDir = path.dirname(configFile(home));

  // setup da nova para logo antes de gravar a configuração: já conferiu que a anterior está off.
  const paused = pausedAt("writeExclusive", (file) => path.dirname(file) === configDir && file.endsWith(".skill-me-tmp"));
  const setup = runObserveCommand({ argv: ["setup", "--root", next], home, io: paused.io });
  await paused.reached;
  const watch = watchingContention("on");
  const on = runObserveCommand({ argv: ["on"], home, io: watch.io });
  const first = await Promise.race([on.then(() => "on concluído"), watch.contended]);
  paused.release();
  const [setupResult, onResult] = await Promise.all([setup, on]);

  assertOnlyConfiguredOn(home, [previous, next]);
  assert.equal(first, "on esperou", "on não conclui enquanto o setup troca a configuração");
  assert.deepEqual(setupResult, { exitCode: 0, body: { schemaVersion: 1, command: "setup", status: "ok", observation: OFF } });
  assert.equal(onResult.exitCode, 0, JSON.stringify(onResult.body));
  assert.deepEqual([onResult.body.observation.state, onResult.body.changed], ["on", true]);
  assert.equal(configuredRoot(home), next);
  assert.deepEqual([stateOf(previous), stateOf(next)], ["off", "on"], "o on serializado depois do setup liga a nova");
  assert.deepEqual(readdirSync(configDir), ["observe.json"], "nenhum lock ou temporário de sobra");
  await assertOffReachesAll(home, [previous, next]);
});

test("I23-C2 setup recusa raiz inválida: troca concorrente com on — on já leu a raiz anterior, setup tenta trocar, on liga — setup recusa observe_on", async () => {
  const { home, previous, next } = twoRoots("i23 c2 on primeiro");
  assert.equal((await runObserveCommand({ argv: ["setup", "--root", previous], home })).exitCode, 0);
  const configBytes = readFileSync(configFile(home));

  // on para ao abrir a raiz anterior, depois de ler a configuração que a aponta.
  const paused = pausedAt("stat", (file) => path.resolve(file) === previous);
  const on = runObserveCommand({ argv: ["on"], home, io: paused.io });
  await paused.reached;
  const watch = watchingContention("setup");
  const setup = runObserveCommand({ argv: ["setup", "--root", next], home, io: watch.io });
  const first = await Promise.race([setup.then(() => "setup concluído"), watch.contended]);
  paused.release();
  const [onResult, setupResult] = await Promise.all([on, setup]);

  assertOnlyConfiguredOn(home, [previous, next]);
  assert.equal(first, "setup esperou", "setup não troca a configuração enquanto o on está em curso");
  assert.equal(onResult.exitCode, 0, JSON.stringify(onResult.body));
  assert.deepEqual([onResult.body.observation.state, onResult.body.changed], ["on", true]);
  assert.deepEqual(setupResult, { exitCode: 4, body: { schemaVersion: 1, command: "setup", status: "error", error: { code: "observe_on" } } });
  assert.deepEqual(readFileSync(configFile(home)), configBytes, "a configuração continua a anterior");
  assert.deepEqual([stateOf(previous), stateOf(next)], ["on", "off"]);
  assert.deepEqual(readdirSync(path.dirname(configFile(home))), ["observe.json"], "nenhum lock ou temporário de sobra");
  await assertOffReachesAll(home, [previous, next]);
});

test("I23-C2 setup recusa raiz inválida: troca concorrente com outro setup e on — o setup atrasado relê sob o lock a configuração gravada pelo outro e recusa observe_on", async () => {
  const { home, previous, next } = twoRoots("i23 c2 dois setups");
  const third = path.join(path.dirname(previous), "raiz terceira ação");
  mkdirSync(third);
  assert.equal((await runObserveCommand({ argv: ["setup", "--root", previous], home })).exitCode, 0);
  const configDir = path.dirname(configFile(home));

  // O setup da terceira para antes de tomar o lock, com a raiz dela já validada.
  const paused = pausedAt("mkdir", (dir) => dir === configDir);
  const late = runObserveCommand({ argv: ["setup", "--root", third], home, io: paused.io });
  await paused.reached;
  assert.equal((await runObserveCommand({ argv: ["setup", "--root", next], home })).exitCode, 0);
  assert.equal((await runObserveCommand({ argv: ["on"], home })).exitCode, 0);
  paused.release();
  const lateResult = await late;

  assertOnlyConfiguredOn(home, [previous, next, third]);
  assert.deepEqual(lateResult, { exitCode: 4, body: { schemaVersion: 1, command: "setup", status: "error", error: { code: "observe_on" } } });
  assert.equal(configuredRoot(home), next);
  assert.deepEqual([stateOf(previous), stateOf(next), stateOf(third)], ["off", "on", "off"]);
  assert.deepEqual(readdirSync(configDir), ["observe.json"], "nenhum lock ou temporário de sobra");
  await assertOffReachesAll(home, [previous, next, third]);
});

test("I23-C4 off encerra e é idempotente: com um setup trocando a raiz, off espera a barreira e responde pela raiz que ficou configurada", async () => {
  const { home, previous, next } = twoRoots("i23 c4 setup e off");
  assert.equal((await runObserveCommand({ argv: ["setup", "--root", previous], home })).exitCode, 0);
  const configDir = path.dirname(configFile(home));
  const paused = pausedAt("writeExclusive", (file) => path.dirname(file) === configDir && file.endsWith(".skill-me-tmp"));
  const setup = runObserveCommand({ argv: ["setup", "--root", next], home, io: paused.io });
  await paused.reached;
  const watch = watchingContention("off");
  const off = runObserveCommand({ argv: ["off"], home, io: watch.io });
  const first = await Promise.race([off.then(() => "off concluído"), watch.contended]);
  paused.release();
  const [setupResult, offResult] = await Promise.all([setup, off]);

  assert.equal(first, "off esperou", "off não conclui enquanto o setup troca a configuração");
  assert.equal(setupResult.exitCode, 0, JSON.stringify(setupResult.body));
  assert.deepEqual(offResult, { exitCode: 0, body: { schemaVersion: 1, command: "off", status: "ok", observation: OFF, changed: false, stopped: [] } });
  assert.equal(configuredRoot(home), next);
  assert.deepEqual([stateOf(previous), stateOf(next)], ["off", "off"]);
  assert.deepEqual(readdirSync(configDir), ["observe.json"], "nenhum lock ou temporário de sobra");
});

// Pasta da configuração trocada (F2 da verificação, rodada 2): depois da primeira
// conferência, `.skill-me` é movida e no lugar fica uma junção (Windows) / link
// (POSIX) para a pasta de outra configuração válida, que aponta para outra raiz,
// ou outra pasta real com a mesma configuração alheia. A troca é feita pelo io
// do comando logo antes da operação escolhida e, numa linha, desfeita logo
// depois de outra. Linha "Pasta da configuração" do Landing.

const DIR_LINK = process.platform === "win32" ? "junction" : "dir";
const rootState = (root) => (existsSync(observeFile(root)) ? (({ state, generation }) => ({ state, generation }))(readObserveState(root)) : { state: "off", generation: null });

function swappingIo({ before: [op, matches], swap, after = null, undo }) {
  const base = createStoreIo();
  let swapped = false;
  const io = {
    ...base,
    async [op](file, ...rest) {
      if (!swapped && matches(file)) {
        swapped = true;
        swap();
      }
      return base[op](file, ...rest);
    },
  };
  if (after !== null) {
    const [afterOp, afterMatches] = after;
    io[afterOp] = async (file, ...rest) => {
      const value = await base[afterOp](file, ...rest);
      if (swapped && afterMatches(file)) undo();
      return value;
    };
  }
  return io;
}

function isOwnLock(bytes) {
  try {
    const lock = JSON.parse(bytes.toString("utf8"));
    return Object.keys(lock).sort().join() === "lockVersion,nonce,pid" && lock.lockVersion === 1 && lock.pid === process.pid && /^[0-9a-f]{16}$/.test(lock.nonce);
  } catch {
    return false;
  }
}

function describeConfigFolder(dir, configBytes, label) {
  return readdirSync(dir)
    .sort()
    .map((name) => {
      const bytes = readFileSync(path.join(dir, name));
      if (name === "observe.json") return `${name}: ${bytes.equals(configBytes) ? label : "alterada"}`;
      return `${name}: ${name === "observe.lock" && isOwnLock(bytes) ? "lock próprio" : "outro"}`;
    });
}

test("I23-C2 setup recusa raiz inválida: pasta da configuração trocada por junção depois da primeira conferência — on, off e setup recusam, nenhuma raiz alheia muda e a raiz original continua controlável", async () => {
  const lockAt = (dir) => ["writeExclusive", (file) => file === path.join(dir, "observe.lock")];
  const configAt = (op) => (dir) => [op, (file) => file === path.join(dir, "observe.json")];
  const rows = [
    // A reprodução do F2: `on` já conferiu a pasta e ainda não criou o lock.
    { argv: ["on"], when: "junção antes de criar o lock", startOn: false, before: lockAt },
    // Só a conferência sob o lock, antes da leitura, vê esta troca.
    { argv: ["on"], when: "junção antes de criar o lock, desfeita depois da leitura", startOn: false, before: lockAt, after: configAt("readBounded") },
    { argv: ["off"], when: "junção sob o lock, ao ler a configuração", startOn: true, before: configAt("lstat") },
    // Diretório real: só a identidade conferida antes do lock o distingue.
    { argv: ["on"], when: "outra pasta real antes de criar o lock", startOn: false, before: lockAt, realFolder: true },
    { argv: ["setup", "--root"], when: "junção sob o lock, antes do temporário da configuração", startOn: false, before: (dir) => ["writeExclusive", (file) => path.dirname(file) === dir && file.endsWith(".skill-me-tmp")] },
  ];
  const observed = [];
  const expected = [];
  for (const [index, row] of rows.entries()) {
    const command = row.argv[0];
    const base = scratch(`i23 c2 pasta trocada ${index}`);
    const [home, foreignHome, original, foreign, next] = ["home", "home alheio", "raiz original ação", "raiz alheia ação", "raiz nova ação"].map((name) => path.join(base, name));
    for (const dir of [home, foreignHome, original, foreign, next]) mkdirSync(dir);
    const project = scratch(`i23 c2 pasta trocada ${index} projeto`);
    const env = homeEnv(home);
    const dir = path.dirname(configFile(home));
    const foreignDir = path.dirname(configFile(foreignHome));
    const moved = path.join(base, "pasta da configuração movida");
    for (const [owner, root] of [[home, original], [foreignHome, foreign]]) {
      assert.equal((await runObserveCommand({ argv: ["setup", "--root", root], home: owner })).exitCode, 0);
      if (row.startOn) assert.equal((await runObserveCommand({ argv: ["on"], home: owner })).exitCode, 0);
    }
    const originalBytes = readFileSync(configFile(home));
    const foreignBytes = readFileSync(configFile(foreignHome));
    const before = { original: rootState(original), foreign: rootState(foreign) };

    const swap = () => {
      renameSync(dir, moved);
      if (!row.realFolder) return symlinkSync(foreignDir, dir, DIR_LINK);
      mkdirSync(dir);
      writeFileSync(configFile(home), foreignBytes);
    };
    const restore = () => {
      if (!existsSync(moved)) return;
      if (lstatSync(dir).isSymbolicLink()) unlinkSync(dir);
      else rmSync(dir, { recursive: true });
      renameSync(moved, dir);
    };
    const io = swappingIo({ before: row.before(dir), swap, after: row.after?.(dir) ?? null, undo: restore });
    const result = await runObserveCommand({ argv: command === "setup" ? [...row.argv, next] : row.argv, home, io });
    const afterSwap = { original: rootState(original), foreign: rootState(foreign) };

    // Com a junção ainda no lugar, nenhum leitor segue a pasta trocada. Uma
    // pasta real no lugar já é, para quem chega depois, a configuração.
    let readers = null;
    if (!row.realFolder) {
      const status = runObserve(["status"], { env });
      const report = runIntegrations(["report", "--latest", "--format", "json"], { env });
      const hook = await runHook("claude", claudePayload("pre_tool_bash"), { env, cwd: project });
      readers = {
        status: [status.status, status.body.error?.code ?? null],
        report: [report.status, JSON.parse(report.stdout).error?.code ?? null],
        hook: hook.report.delivery,
        foreignCaptures: existsSync(path.join(storeDir(foreign), "captures")),
      };
    }
    const folders = { foreign: describeConfigFolder(foreignDir, foreignBytes, "configuração alheia"), moved: existsSync(moved) ? describeConfigFolder(moved, originalBytes, "configuração original") : "restaurada" };

    // A pasta original volta ao lugar. O lock que a troca levou junto não é
    // apagado por processo nenhum: sai pela remoção manual documentada.
    restore();
    const ownLock = path.join(dir, "observe.lock");
    if (existsSync(ownLock) && isOwnLock(readFileSync(ownLock))) unlinkSync(ownLock);
    const control = [];
    for (const step of ["on", "off"]) {
      const done = await runObserveCommand({ argv: [step], home });
      control.push([step, done.exitCode, stateOf(original)]);
    }

    const label = `${command}, ${row.when}`;
    observed.push({ label, result, afterSwap, readers, folders, control, foreignAtEnd: rootState(foreign) });
    expected.push({
      label,
      result: { exitCode: 4, body: { schemaVersion: 1, command, status: "error", error: { code: row.realFolder ? "foreign_entry" : "link_refused" } } },
      afterSwap: before,
      readers: row.realFolder ? null : { status: [4, "link_refused"], report: [4, "link_refused"], hook: lostAll("link_refused"), foreignCaptures: false },
      // Trocada antes do lock, ele foi criado através da junção e saiu por ela;
      // trocada depois, ele foi junto com a pasta movida.
      folders: { foreign: ["observe.json: configuração alheia"], moved: ["observe.json: configuração original", ...(row.before === lockAt ? [] : ["observe.lock: lock próprio"])] },
      control: [
        ["on", 0, "on"],
        ["off", 0, "off"],
      ],
      foreignAtEnd: before.foreign,
    });
  }
  assert.deepEqual(observed, expected);
});

test("I23-C3 on persiste e é idempotente: outro processo vê on com conteúdo sanitizado; repetir on mantém geração e não cria captura", async () => {
  const { root, env } = prepareObservation(scratch, "i23 c3");
  const project = scratch("i23 c3 projeto");
  const on = runNpmScript("on", { env });
  assert.deepEqual([on.status, on.stderr], [0, ""], on.stdout);
  const { observation } = on.body;
  assert.match(observation.generation, HEX32);
  assert.match(observation.changedAt, ISO_MS);
  assert.deepEqual(on.body, {
    schemaVersion: 1,
    command: "on",
    status: "ok",
    observation: { configured: true, state: "on", generation: observation.generation, changedAt: observation.changedAt, content: true },
    changed: true,
  });

  // Estado persistido sob a raiz: forma literal do Landing; a chave não sai na resposta.
  const state = readObserveState(root);
  assert.match(state.sessionKey, HEX64);
  assert.deepEqual(state, { observeVersion: 1, state: "on", generation: observation.generation, sessionKey: state.sessionKey, changedAt: observation.changedAt, sessions: {} });
  assert.ok(!on.stdout.includes(state.sessionKey));

  // Outro processo: on, mesma geração, nenhuma captura.
  const status = runNpmScript("status", { env });
  assert.deepEqual(status.body, { schemaVersion: 1, command: "status", status: "ok", observation, automaticCaptures: 0, captures: [] });
  assert.ok(!existsSync(path.join(storeDir(root), "captures")), "on não cria captura");

  // Repetir: mesma geração e instante, arquivo intocado.
  const bytes = readFileSync(observeFile(root));
  const mtimeMs = statSync(observeFile(root)).mtimeMs;
  const again = runNpmScript("on", { env });
  assert.deepEqual(again.body, { schemaVersion: 1, command: "on", status: "ok", observation, changed: false });
  assert.deepEqual(readFileSync(observeFile(root)), bytes);
  assert.equal(statSync(observeFile(root)).mtimeMs, mtimeMs);
  assert.deepEqual(listCaptures(root), []);

  // A autorização é de conteúdo sanitizado: a sessão ganha uma captura com conteúdo, sem segredo.
  const hook = await runHook("claude", claudePayload("pre_tool_bash", { tool_input: { command: SECRET_TEXT } }), { env, cwd: project });
  assert.deepEqual(hook.report.delivery, DELIVERED_AUTO(1));
  const [capture] = automaticOf(root);
  assert.deepEqual([capture.state, capture.content, capture.retentionDays], ["active", true, 7]);
  const command = exportOf(root, capture.id).records[0].content.fields.find((field) => field.field === "tool_input.command");
  assert.ok(command.value.includes("[removido]") && command.value.includes("início seguro"), "texto sanitizado, não omitido");
  for (const file of filesUnder(storeDir(root))) if (path.basename(file) !== "key") assert.deepEqual(leaks(readFileSync(file, "utf8")), [], path.relative(root, file));
  const third = runNpmScript("on", { env });
  assert.deepEqual([third.body.changed, third.body.observation.generation], [false, observation.generation]);
  assert.equal(automaticOf(root).length, 1, "on repetido não abre outra captura");
});

test("I23-C4 off encerra e é idempotente: capturas automáticas ficam encerradas e consultáveis, e produtor depois do off não grava", async () => {
  const { root, env } = prepareObservation(scratch, "i23 c4");
  const project = scratch("i23 c4 projeto");
  observeOk(["on"], env);
  assert.deepEqual((await runHook("claude", claudePayload("pre_tool_bash"), { env, cwd: project })).report.delivery, DELIVERED_AUTO(1));
  assert.deepEqual((await runHook("codex", codexHookPayload("pre_tool_bash"), { env, cwd: project })).report.delivery, DELIVERED_AUTO(1));
  const active = automaticOf(root);
  assert.deepEqual(active.map((c) => c.state), ["active", "active"], "uma captura por sessão");

  const off = runNpmScript("off", { env });
  assert.deepEqual([off.status, off.stderr], [0, ""], off.stdout);
  const { changedAt } = off.body.observation;
  assert.match(changedAt, ISO_MS);
  assert.deepEqual(off.body, { schemaVersion: 1, command: "off", status: "ok", observation: { ...OFF, changedAt }, changed: true, stopped: active.map((c) => c.id) });
  assert.deepEqual(readObserveState(root), { observeVersion: 1, state: "off", generation: null, sessionKey: null, changedAt, sessions: {} });

  const status = runNpmScript("status", { env });
  assert.equal(status.status, 0);
  assert.deepEqual(status.body.observation, { ...OFF, changedAt });
  assert.equal(status.body.automaticCaptures, 2);
  assert.deepEqual(status.body.captures.map((c) => [c.id, c.state, c.endedAt, c.origin]), [...active].reverse().map((c) => [c.id, "stopped", changedAt, "automatic"]), "mais recente primeiro");

  // Produtores depois do off: nada gravado.
  const before = snapshotTree(storeDir(root));
  const late = [
    await runHook("claude", claudePayload("post_tool_bash"), { env, cwd: project }),
    await runHook("codex", codexHookPayload("post_tool_bash"), { env, cwd: project }),
    await runHermesIngest([hermesRecord("pre_tool_call")], { env, cwd: project }),
  ];
  for (const run of late) assert.deepEqual(run.report.delivery, lostAll("observe_off"));
  assert.deepEqual(snapshotTree(storeDir(root)), before, "store intacto");

  // Repetir off: nada muda.
  const bytes = readFileSync(observeFile(root));
  const again = runNpmScript("off", { env });
  assert.deepEqual(again.body, { schemaVersion: 1, command: "off", status: "ok", observation: { ...OFF, changedAt }, changed: false, stopped: [] });
  assert.deepEqual(readFileSync(observeFile(root)), bytes);

  // Encerradas continuam consultáveis.
  for (const capture of active) {
    const exported = exportOf(root, capture.id);
    assert.equal(exported.capture.state, "stopped");
    assert.equal(exported.records.length, 1);
    assert.equal(privacyOk(["timeline", "--root", root, "--capture", capture.id]).entries.length, 1);
  }
});

test("I23-C5 vínculo manual mantém precedência: par completo só grava na manual, par incompleto não vira rota automática, wrapper fica manual e off não encerra a manual", async () => {
  const { root, env } = prepareObservation(scratch, "i23 c5");
  const project = scratch("i23 c5 projeto");
  observeOk(["on"], env);
  const manual = startCapture(root, ["--content"]);
  const pair = { SKILL_ME_CAPTURE_ROOT: root, SKILL_ME_CAPTURE_ID: manual };
  const boundDelivery = { bound: true, code: null, entries: 1, committed: 1, persisted: 1, lost: 0 };

  const bound = await runHook("claude", claudePayload("pre_tool_bash"), { env: { ...env, ...pair }, cwd: project });
  assert.deepEqual(bound.report.delivery, boundDelivery);
  assert.equal(exportOf(root, manual).records.length, 1);
  assert.deepEqual(automaticOf(root), [], "o par explícito não abre captura automática");

  const variants = [
    ["só a raiz", { SKILL_ME_CAPTURE_ROOT: root }],
    ["só o id", { SKILL_ME_CAPTURE_ID: manual }],
    ["raiz relativa", { SKILL_ME_CAPTURE_ROOT: path.basename(root), SKILL_ME_CAPTURE_ID: manual }],
    ["id fora do formato", { SKILL_ME_CAPTURE_ROOT: root, SKILL_ME_CAPTURE_ID: manual.toUpperCase() }],
  ];
  for (const [label, extra] of variants) {
    const runs = {
      claude: await runHook("claude", claudePayload("pre_tool_bash"), { env: { ...env, ...extra }, cwd: project }),
      codex: await runHook("codex", codexHookPayload("pre_tool_bash"), { env: { ...env, ...extra }, cwd: project }),
      hermes: await runHermesIngest([hermesRecord("pre_tool_call")], { env: { ...env, ...extra }, cwd: project }),
    };
    for (const [producer, run] of Object.entries(runs)) {
      assert.deepEqual([run.status, run.stdout, run.stderr], [0, "", ""], `${label}/${producer}`);
      assert.deepEqual(run.report.delivery, { bound: false, code: "binding_invalid", entries: 1, committed: 0, persisted: 0, lost: 1 }, `${label}/${producer}`);
    }
  }
  assert.deepEqual(automaticOf(root), [], "par incompleto ou inválido nunca vira rota automática");
  assert.deepEqual(readObserveState(root).sessions, {});
  assert.equal(exportOf(root, manual).records.length, 1);

  // O wrapper continua só manual: sem variáveis, com on, nada é gravado.
  const scenario = writeScenario(project, "c5", [{ stdout: JSON.stringify(execEvent("thread_started")) }]);
  const wrapped = await runWrapper({ args: ["p"], env: { ...env, FAKE_CODEX_SCENARIO: scenario }, cwd: project });
  assert.equal(wrapped.status, 0);
  assert.equal(wrapped.report.delivery, undefined, "wrapper sem vínculo fica em memória");
  assert.deepEqual(automaticOf(root), []);

  // off não encerra a manual, que continua recebendo pelo par.
  assert.deepEqual(observeOk(["off"], env).stopped, []);
  assert.equal(statusOf(root, manual).state, "active");
  assert.deepEqual((await runHook("codex", codexHookPayload("post_tool_bash"), { env: { ...env, ...pair }, cwd: project })).report.delivery, boundDelivery);
  assert.equal(exportOf(root, manual).records.length, 2);

  // stop/disable da manual seguem os comandos da #5; a forma do state.json não ganha `origin`.
  assert.equal(privacyOk(["stop", "--root", root, "--capture", manual]).capture.state, "stopped");
  assert.deepEqual(privacyOk(["disable", "--root", root, "--capture", manual]).capture, { id: manual, state: "disabled", content: false, endedAt: statusOf(root, manual).endedAt });
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(path.join(captureDir(root, manual), "state.json"), "utf8"))).sort(), MANUAL_STATE_KEYS);
  assert.deepEqual(automaticOf(root), []);
});
