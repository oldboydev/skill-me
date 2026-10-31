import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { runObserveCommand } from "../../../src/integrations/observe/command.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { DEFAULT_RETENTION_DAYS } from "../../../src/integrations/privacy/lifecycle.mjs";
import { holdLockFile, listCaptures, startCapture, startLaunch, StoreError } from "../../../src/integrations/privacy/store.mjs";
import { makeScratch } from "../helpers/cli.mjs";
import { controlLockFile } from "../helpers/observe.mjs";

// Liberação do lock por reserva exclusiva (issue #25, C46 (u); linha
// "Liberação do lock por reserva exclusiva" do Landing; plano aprovado em
// .tasks/issue-25-lock-release-proposal.md). Casos derivados da tabela de
// falhas, das quedas e da D2; nada aqui lê a implementação para decidir o
// esperado.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

const CHILD = path.join(import.meta.dirname, "..", "helpers", "lock-release-child.mjs");
const FOREIGN = '{"lockVersion":1,"pid":1,"nonce":"0000000000000000"}';
const SLOT = /^\.lock-release-[A-Za-z0-9]{6}$/;
const EIO = () => Object.assign(new Error("EIO injetado pelo teste"), { code: "EIO" });
const outcomeOf = (promise) => promise.then((value) => ({ value }), (error) => ({ error }));

// Os bytes que `holdLockFile` grava: exatamente estas três chaves.
const isOwnLock = (text, pid = process.pid) => {
  try {
    const value = JSON.parse(text);
    return Object.keys(value).join() === "lockVersion,pid,nonce" && value.lockVersion === 1 && value.pid === pid && /^[0-9a-f]{16}$/.test(value.nonce);
  } catch {
    return false;
  }
};

function lockState(lockPath) {
  if (!existsSync(lockPath)) return "ausente";
  const text = readFileSync(lockPath, "utf8");
  if (text === FOREIGN) return "alheio";
  return isOwnLock(text) ? "nosso" : `outro (${text.length} bytes)`;
}

// O que sobrou ao lado do lock, além dele: `slot` é um nome da reserva.
function leftovers(dir) {
  return readdirSync(dir)
    .filter((name) => name !== ".lock")
    .sort()
    .map((name) => {
      const label = SLOT.test(name) ? "slot" : name;
      const stats = lstatSync(path.join(dir, name));
      if (stats.isSymbolicLink()) return `${label}: link`;
      if (!stats.isDirectory()) return `${label}: arquivo`;
      const inside = readdirSync(path.join(dir, name));
      return `${label}: ${inside.length === 0 ? "vazio" : inside.join(",")}`;
    });
}
const slotOf = (dir) => readdirSync(dir).find((name) => SLOT.test(name));
const retiredText = (dir) => readFileSync(path.join(dir, slotOf(dir), "lock"), "utf8");

// io real com o registro, em ordem, de cada operação que a liberação pode
// fazer, e uma injeção opcional por operação: `inject[nome](base, ...args)`.
function recordingIo(inject = {}) {
  const base = createStoreIo();
  const log = [];
  const slots = [];
  const io = { ...base };
  for (const name of ["mkdtemp", "lstat", "readBounded", "rename", "unlink", "rmdir", "writeExclusive"]) {
    io[name] = async (...args) => {
      log.push([name, ...args.filter((arg) => typeof arg === "string")]);
      const result = await (inject[name] ? inject[name](base, ...args) : base[name](...args));
      if (name === "mkdtemp") slots.push(result);
      return result;
    };
  }
  const count = (name) => log.filter(([op]) => op === name).length;
  return { io, log, slots, counts: () => ["mkdtemp", "rename", "unlink", "rmdir"].map(count) };
}

const isSlotPath = (lockPath) => (file) => typeof file === "string" && path.dirname(file) === path.dirname(lockPath) && SLOT.test(path.basename(file));
const inSlot = (lockPath) => (file) => typeof file === "string" && isSlotPath(lockPath)(path.dirname(file)) && path.basename(file) === "lock";

async function release(label, { inject, callback = async () => "resultado" } = {}) {
  const dir = scratch(label);
  const lockPath = path.join(dir, ".lock");
  const recorded = recordingIo(typeof inject === "function" ? inject(lockPath, dir) : inject);
  const outcome = await outcomeOf(holdLockFile({ io: recorded.io, lockPath, lostCode: "lock_lost" }, () => callback(lockPath)));
  return { dir, lockPath, outcome, ...recorded };
}

const assertInternal = (error, label) => {
  assert.ok(error instanceof Error && !(error instanceof StoreError), `${label}: erro interno, não StoreError`);
  assert.equal(error.name, "LockReleaseError", label);
  assert.equal(error.code, undefined, `${label}: sem errno inventado`);
};

test("I25-C46 liberação do lock: no caminho saudável a reserva é filha direta da pasta do lock, o .lock é conferido logo antes do rename para <slot>/lock, o retirado é relido antes do unlink e nada sobra", async () => {
  const { dir, lockPath, outcome, log, slots, counts } = await release("i25 c46 liberação saudável");
  assert.deepEqual(outcome, { value: "resultado" });
  assert.deepEqual(counts(), [1, 1, 1, 1], "mkdtemp, rename, unlink e rmdir uma vez cada");
  const [slot] = slots;
  assert.deepEqual(log.find(([op]) => op === "mkdtemp"), ["mkdtemp", `${lockPath}-release-`]);
  assert.equal(path.dirname(slot), dir, "a reserva fica ao lado do lock");
  assert.match(path.basename(slot), SLOT);
  const retired = path.join(slot, "lock");
  const at = (entry) => log.findIndex((item) => item.join("\0") === entry.join("\0"));
  const renamed = at(["rename", lockPath, retired]);
  assert.ok(renamed > 0, "o .lock vai para <slot>/lock");
  assert.deepEqual(log[renamed - 1], ["readBounded", lockPath], "conferência dos bytes adjacente ao rename");
  assert.deepEqual(log[at(["unlink", retired]) - 1], ["readBounded", retired], "o retirado é relido logo antes do unlink");
  assert.deepEqual(log.at(-1), ["rmdir", slot]);
  assert.deepEqual([lockState(lockPath), leftovers(dir)], ["ausente", []]);
});

test("I25-C46 liberação do lock: uma falha por etapa (f1–f14) dá o erro, o .lock, as sobras e uma chamada por passo, sem nova tentativa", async () => {
  const callbackError = new Error("falha do callback");
  const eio = EIO();
  const cases = [
    { name: "f1 callback falha", callback: async () => Promise.reject(callbackError), error: callbackError, lock: "ausente", rest: [], counts: [1, 1, 1, 1] },
    { name: "f2 mkdtemp EIO", inject: { mkdtemp: async () => Promise.reject(eio) }, error: eio, lock: "nosso", rest: [], counts: [1, 0, 0, 0] },
    {
      name: "f3 lstat do slot EIO",
      inject: (lockPath) => ({ lstat: async (base, file, ...rest) => (isSlotPath(lockPath)(file) ? Promise.reject(eio) : base.lstat(file, ...rest)) }),
      error: eio,
      lock: "nosso",
      rest: ["slot: vazio"],
      counts: [1, 0, 0, 0],
    },
    {
      name: "f4 slot que virou arquivo",
      inject: {
        mkdtemp: async (base, prefix) => {
          const slot = await base.mkdtemp(prefix);
          rmdirSync(slot);
          writeFileSync(slot, "");
          return slot;
        },
      },
      error: "interno",
      lock: "nosso",
      rest: ["slot: arquivo"],
      counts: [1, 0, 0, 0],
    },
    {
      name: "f5 bytes alheios no lock",
      callback: async (lockPath) => writeFileSync(lockPath, FOREIGN),
      error: "lock_lost",
      lock: "alheio",
      rest: [],
      counts: [1, 0, 0, 1],
    },
    {
      name: "f6 rename EIO sem mover",
      inject: (lockPath) => ({ rename: async (base, from, to) => (from === lockPath ? Promise.reject(eio) : base.rename(from, to)) }),
      error: eio,
      lock: "nosso",
      rest: [],
      counts: [1, 1, 0, 1],
    },
    {
      name: "f7 rename move e lança EIO",
      inject: (lockPath) => ({
        rename: async (base, from, to) => {
          await base.rename(from, to);
          if (from === lockPath) throw eio;
        },
      }),
      error: eio,
      lock: "ausente",
      rest: [],
      counts: [1, 1, 1, 1],
    },
    {
      name: "f8 retirado com bytes alheios",
      inject: (lockPath) => ({
        rename: async (base, from, to) => {
          await base.rename(from, to);
          if (from === lockPath) writeFileSync(to, FOREIGN);
        },
      }),
      error: "lock_lost",
      lock: "ausente",
      rest: ["slot: lock"],
      retired: FOREIGN,
      counts: [1, 1, 0, 0],
    },
    {
      name: "f9 leitura do retirado EIO",
      inject: (lockPath) => ({ readBounded: async (base, file, max) => (inSlot(lockPath)(file) ? Promise.reject(eio) : base.readBounded(file, max)) }),
      error: eio,
      lock: "ausente",
      rest: ["slot: lock"],
      retired: "nosso",
      counts: [1, 1, 0, 0],
    },
    {
      name: "f10 unlink do retirado EIO sem apagar",
      inject: (lockPath) => ({ unlink: async (base, file) => (inSlot(lockPath)(file) ? Promise.reject(eio) : base.unlink(file)) }),
      error: eio,
      lock: "ausente",
      rest: ["slot: lock"],
      retired: "nosso",
      counts: [1, 1, 1, 0],
    },
    {
      name: "f11 unlink apaga e lança EIO",
      inject: (lockPath) => ({
        unlink: async (base, file) => {
          await base.unlink(file);
          if (inSlot(lockPath)(file)) throw eio;
        },
      }),
      error: eio,
      lock: "ausente",
      rest: [],
      counts: [1, 1, 1, 1],
    },
    { name: "f12 rmdir EIO", inject: { rmdir: async () => Promise.reject(eio) }, error: eio, lock: "ausente", rest: ["slot: vazio"], counts: [1, 1, 1, 1] },
    {
      name: "f14 callback e rename falham",
      callback: async () => Promise.reject(callbackError),
      inject: (lockPath) => ({ rename: async (base, from, to) => (from === lockPath ? Promise.reject(eio) : base.rename(from, to)) }),
      error: callbackError,
      lock: "nosso",
      rest: [],
      counts: [1, 1, 0, 1],
    },
  ];
  for (const row of cases) {
    const { dir, lockPath, outcome, counts } = await release(`i25 c46 ${row.name}`, row);
    assert.ok(outcome.error !== undefined, `${row.name}: lança`);
    if (row.error === "interno") assertInternal(outcome.error, row.name);
    else if (typeof row.error === "string") assert.ok(outcome.error instanceof StoreError && outcome.error.code === row.error, `${row.name}: ${outcome.error}`);
    else assert.equal(outcome.error, row.error, `${row.name}: o mesmo erro, cru`);
    assert.deepEqual([lockState(lockPath), leftovers(dir), counts()], [row.lock, row.rest, row.counts], row.name);
    if (row.retired === FOREIGN) assert.equal(retiredText(dir), FOREIGN, `${row.name}: o retirado alheio fica byte a byte`);
    if (row.retired === "nosso") assert.ok(isOwnLock(retiredText(dir)), `${row.name}: o retirado continua o nosso`);
  }
});

test("I25-C46 liberação do lock: slot trocado por junção ou link antes da limpeza não é atravessado, e o lock fica", async () => {
  const target = scratch("i25 c46 alvo do link");
  const { dir, lockPath, outcome, counts } = await release("i25 c46 slot link", {
    inject: {
      mkdtemp: async (base, prefix) => {
        const slot = await base.mkdtemp(prefix);
        rmdirSync(slot);
        symlinkSync(target, slot, "junction");
        return slot;
      },
    },
  });
  assertInternal(outcome.error, "slot link");
  assert.deepEqual([lockState(lockPath), leftovers(dir), counts()], ["nosso", ["slot: link"], [1, 0, 0, 0]]);
  assert.deepEqual(readdirSync(target), [], "nada entrou no alvo do link");
});

test("I25-C46 liberação do lock: identidade do slot trocada antes da releitura (f13 antes do rmdir e logo depois do rename) não apaga nada alheio", async () => {
  // Troca por rename para o lado + pasta nova no nome: a original continua
  // existindo, então o sistema não reaproveita o mesmo inode.
  const swap = (slot, withRetired) => {
    renameSync(slot, `${slot}-movida`);
    mkdirSync(slot);
    if (withRetired) writeFileSync(path.join(slot, "lock"), readFileSync(path.join(`${slot}-movida`, "lock")));
  };
  const beforeRmdir = await release("i25 c46 f13 slot trocado", {
    inject: (lockPath) => ({
      unlink: async (base, file) => {
        await base.unlink(file);
        if (inSlot(lockPath)(file)) swap(path.dirname(file), false);
      },
    }),
  });
  assertInternal(beforeRmdir.outcome.error, "f13");
  const moved = readdirSync(beforeRmdir.dir).filter((name) => name.endsWith("-movida"));
  assert.equal(moved.length, 1);
  assert.deepEqual([lockState(beforeRmdir.lockPath), beforeRmdir.counts()], ["ausente", [1, 1, 1, 0]], "f13: sem rmdir");
  assert.deepEqual(readdirSync(path.join(beforeRmdir.dir, moved[0])), [], "f13: a pasta movida fica");
  assert.deepEqual(readdirSync(path.join(beforeRmdir.dir, slotOf(beforeRmdir.dir))), [], "f13: a pasta posta no lugar fica");

  const afterRename = await release("i25 c46 slot trocado depois do rename", {
    inject: (lockPath) => ({
      rename: async (base, from, to) => {
        await base.rename(from, to);
        if (from === lockPath) swap(path.dirname(to), true);
      },
    }),
  });
  assertInternal(afterRename.outcome.error, "depois do rename");
  const { dir, lockPath, log, counts } = afterRename;
  assert.deepEqual([lockState(lockPath), counts()], ["ausente", [1, 1, 0, 0]], "nem unlink nem rmdir");
  assert.ok(!log.some(([op, file]) => op === "readBounded" && inSlot(lockPath)(file)), "o conteúdo da pasta trocada não é lido");
  const movedAfter = readdirSync(dir).find((name) => name.endsWith("-movida"));
  assert.ok(isOwnLock(readFileSync(path.join(dir, movedAfter, "lock"), "utf8")), "o retirado fica na pasta movida");
  assert.ok(isOwnLock(retiredText(dir)), "a cópia posta no lugar fica");
});

test("I25-C46 liberação do lock: entradas alheias de nome parecido ao lado do lock ficam intactas depois de 50 ciclos, e nada mais sobra", async () => {
  const dir = scratch("i25 c46 nomes parecidos");
  const lockPath = path.join(dir, ".lock");
  mkdirSync(path.join(dir, ".lock-release-AAAAAA"));
  const foreign = { ".lock-release-AAAAAA/lock": "alheio A", ".lock-release-BBBBBB": "alheio B", lock: "alheio C" };
  for (const [name, text] of Object.entries(foreign)) writeFileSync(path.join(dir, name), text);
  const identity = () => Object.fromEntries(Object.keys(foreign).map((name) => [name, [readFileSync(path.join(dir, name), "utf8"), lstatSync(path.join(dir, name), { bigint: true }).ino]]));
  const before = identity();
  const io = createStoreIo();
  for (let cycle = 0; cycle < 50; cycle++) await holdLockFile({ io, lockPath, lostCode: "lock_lost" }, async () => {});
  assert.deepEqual(identity(), before, "bytes e inode iguais");
  assert.deepEqual(readdirSync(dir).sort(), [".lock-release-AAAAAA", ".lock-release-BBBBBB", "lock"]);
});

function runChild(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CHILD, ...args], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (status, signal) => resolve({ pid: child.pid, status, signal, stdout, stderr }));
  });
}

test("I25-C46 liberação do lock: queda de um processo filho depois do mkdtemp, do rename e do unlink do retirado deixa a sobra intacta, e só antes do rename o lock fica", async () => {
  for (const [point, expected] of [
    ["reserva", { lock: "do filho", rest: ["slot: vazio"], next: "lock_present" }],
    ["rename", { lock: "ausente", rest: ["slot: lock"], next: "tomou e liberou" }],
    ["retirado", { lock: "ausente", rest: ["slot: vazio"], next: "tomou e liberou" }],
  ]) {
    const dir = scratch(`i25 c46 queda ${point}`);
    const lockPath = path.join(dir, ".lock");
    const child = await runChild(["queda", lockPath, point]);
    assert.deepEqual([child.status, child.signal, child.stderr], [7, null, ""], `${point}: saiu no ponto`);
    const lock = existsSync(lockPath) ? (isOwnLock(readFileSync(lockPath, "utf8"), child.pid) ? "do filho" : "outro") : "ausente";
    assert.deepEqual([lock, leftovers(dir)], [expected.lock, expected.rest], point);
    if (point === "rename") assert.ok(isOwnLock(retiredText(dir), child.pid), "a sobra só tem lockVersion, pid e nonce");
    const slot = path.join(dir, slotOf(dir));
    const kept = () => [lstatSync(slot, { bigint: true }).ino, readdirSync(slot).map((name) => readFileSync(path.join(slot, name), "utf8"))];
    const before = kept();
    const next = await outcomeOf(holdLockFile({ io: createStoreIo(), lockPath, lostCode: "lock_lost" }, async () => {}));
    assert.equal(next.error === undefined ? "tomou e liberou" : next.error.code, expected.next, point);
    assert.deepEqual(kept(), before, `${point}: a sobra não é tocada`);
    assert.deepEqual(leftovers(dir), expected.rest, `${point}: nada novo sobra`);
  }
});

test("I25-C46 liberação do lock: com o marcador uma sobra .lock-release-ZZZZZZ/lock não muda startCapture nem listCaptures e fica; sem o marcador a criação sai store_invalid (D2)", async () => {
  const leftover = (root) => {
    const slot = path.join(root, "skill-me-privacy", ".lock-release-ZZZZZZ");
    mkdirSync(slot, { recursive: true });
    writeFileSync(path.join(slot, "lock"), FOREIGN);
    return () => [readdirSync(slot), readFileSync(path.join(slot, "lock"), "utf8")];
  };
  const root = scratch("i25 c46 sobra com marcador");
  await startCapture({ root, retentionDays: DEFAULT_RETENTION_DAYS });
  const kept = leftover(root);
  await startCapture({ root, retentionDays: DEFAULT_RETENTION_DAYS });
  const listed = await listCaptures({ root });
  assert.deepEqual([listed.captures.length, listed.failed], [2, []]);
  assert.deepEqual(kept(), [["lock"], FOREIGN]);
  assert.deepEqual(readdirSync(path.join(root, "skill-me-privacy")).sort(), [".lock-release-ZZZZZZ", "captures", "store.json"]);

  const bare = scratch("i25 c46 sobra sem marcador");
  const keptBare = leftover(bare);
  const refused = await outcomeOf(startCapture({ root: bare, retentionDays: DEFAULT_RETENTION_DAYS }));
  assert.ok(refused.error instanceof StoreError && refused.error.code === "store_invalid", String(refused.error));
  assert.deepEqual(keptBare(), [["lock"], FOREIGN]);
  assert.deepEqual(readdirSync(path.join(bare, "skill-me-privacy")), [".lock-release-ZZZZZZ"]);
});

// Slot que vira arquivo logo depois do mkdtemp, só para a reserva de `lockPath`.
const brokenReservation = (lockPath, base = createStoreIo()) => ({
  ...base,
  async mkdtemp(prefix) {
    const slot = await base.mkdtemp(prefix);
    if (prefix === `${lockPath}-release-`) {
      rmdirSync(slot);
      writeFileSync(slot, "");
    }
    return slot;
  },
});

test("I25-C46 liberação do lock: nos dois consumidores, reserva inválida antes da retirada é io_failure com o lock no lugar, e bytes alheios continuam o código fechado de cada um", async () => {
  // Store, pelo launcher: io_failure com lockLeft true; bytes alheios: root_changed com lockLeft false.
  const root = path.join(scratch("i25 c46 consumidor launcher"), "raiz ação");
  mkdirSync(root);
  const rootLock = path.join(root, "skill-me-privacy", ".lock");
  const broken = await outcomeOf(startLaunch({ root, expectedReal: root, io: brokenReservation(rootLock) }));
  assert.deepEqual(
    { code: broken.error?.code, opened: broken.error?.opened, lockPath: broken.error?.lockPath, lockLeft: broken.error?.lockLeft },
    { code: "io_failure", opened: true, lockPath: rootLock, lockLeft: true },
  );
  assert.equal(lockState(rootLock), "nosso", "o lock da invocação ficou");
  // unlinkSync, não rmSync: no Windows o rmSync do Node 24.13.0 volta sem apagar
  // um arquivo de caminho não ASCII (o scratch tem "ação"; gate B em e80b99e).
  unlinkSync(rootLock);
  const base = createStoreIo();
  const swapped = await outcomeOf(
    startLaunch({
      root,
      expectedReal: root,
      io: {
        ...base,
        async rename(from, to) {
          await base.rename(from, to);
          if (path.basename(path.dirname(to)) === "launches") writeFileSync(rootLock, FOREIGN);
        },
      },
    }),
  );
  assert.deepEqual({ code: swapped.error?.code, lockLeft: swapped.error?.lockLeft }, { code: "root_changed", lockLeft: false });
  assert.equal(lockState(rootLock), "alheio");

  // Home, pela observação: io_failure (5) com o lock do home no lugar; bytes alheios: foreign_entry (4).
  const home = scratch("i25 c46 consumidor home");
  const observed = scratch("i25 c46 consumidor raiz observada");
  assert.equal((await runObserveCommand({ argv: ["setup", "--root", observed], home })).exitCode, 0);
  const homeLock = controlLockFile(home);
  const on = await runObserveCommand({ argv: ["on"], home, io: brokenReservation(homeLock) });
  assert.deepEqual([on.exitCode, on.body.error?.code], [5, "io_failure"]);
  assert.equal(lockState(homeLock), "nosso", "o lock do home ficou");
  unlinkSync(homeLock);
  const storeLock = path.join(observed, "skill-me-privacy", ".lock");
  const foreignIo = {
    ...base,
    async writeExclusive(file, data, options) {
      await base.writeExclusive(file, data, options);
      if (file === storeLock) writeFileSync(homeLock, FOREIGN);
    },
  };
  const off = await runObserveCommand({ argv: ["off"], home, io: foreignIo });
  assert.deepEqual([off.exitCode, off.body.error?.code], [4, "foreign_entry"]);
  assert.equal(lockState(homeLock), "alheio");
  const reserved = readdirSync(home).filter((name) => name.startsWith(`${path.basename(homeLock)}-release-`));
  assert.deepEqual(reserved.map((name) => lstatSync(path.join(home, name)).isFile()), [true], "só a reserva quebrada de propósito sobra no home");
});

test("I25-C46 liberação do lock: nos dois consumidores, o caminho saudável não deixa lock nem reserva", async () => {
  const root = scratch("i25 c46 saudável store");
  const recorded = recordingIo();
  await startCapture({ root, retentionDays: DEFAULT_RETENTION_DAYS, io: recorded.io });
  const store = path.join(root, "skill-me-privacy");
  assert.deepEqual(recorded.counts(), [1, 3, 1, 1], "mkdtemp 1; rename: marcador, state.json e lock; unlink: só o retirado; rmdir 1");
  assert.deepEqual(readdirSync(store).sort(), ["captures", "store.json"]);

  const home = scratch("i25 c46 saudável home");
  const observed = scratch("i25 c46 saudável raiz observada");
  for (const argv of [["setup", "--root", observed], ["on"], ["off"]]) assert.equal((await runObserveCommand({ argv, home })).exitCode, 0, argv[0]);
  assert.deepEqual(readdirSync(home).filter((name) => name.startsWith(".skill-me-observe.lock")), [], "nem o lock do home nem reserva");
  assert.deepEqual(readdirSync(path.join(observed, "skill-me-privacy")).filter((name) => name.startsWith(".lock")), []);
});

test("I25-C46 liberação do lock: dois processos disputando o mesmo .lock (2 × 2.000 eventos, nova tentativa imediata só em lock_present) não têm nenhum erro além de lock_present — prova estatística, vermelha no Windows com a liberação por unlink", async (t) => {
  const dir = scratch("i25 c46 disputa");
  const lockPath = path.join(dir, ".lock");
  const startAt = String(Date.now() + 1500);
  const runs = await Promise.all(["a", "b"].map(() => runChild(["disputa", lockPath, "2000", startAt])));
  const counts = runs.map((run) => {
    assert.deepEqual([run.status, run.signal, run.stderr], [0, null, ""]);
    return JSON.parse(run.stdout);
  });
  t.diagnostic(`disputa: ${JSON.stringify(counts)}`);
  assert.deepEqual(counts.map(({ ok, falhas }) => ({ ok, falhas })), [{ ok: 2000, falhas: {} }, { ok: 2000, falhas: {} }]);
  assert.ok(counts[0].lockPresent + counts[1].lockPresent > 0, "os dois processos disputaram o lock");
  assert.deepEqual(readdirSync(dir), [], "nem lock nem reserva no fim");
});
