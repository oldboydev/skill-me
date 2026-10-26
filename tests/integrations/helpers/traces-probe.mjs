// Pré-carga só de teste da issue #8 (`node --import <este arquivo> cli.mjs …`).
// O produto não lê nenhuma destas variáveis; o instrumento envolve
// `open`/`unlink` de node:fs/promises e publica os wrappers nos imports ESM com
// `syncBuiltinESMExports`, como helpers/fs-probe.mjs.
//
// SKILL_ME_TEST_TRACES_GATE=<pasta>|<n>: antes da n-ésima criação exclusiva do
// `.lock` do store, cria `<pasta>/waiting` e espera `<pasta>/go` existir — o
// processo fica parado fora do lock, num ponto conhecido (sondagem do follow).
//
// SKILL_ME_TEST_TRACES_LOST_CONFIRMATION=<n>: o n-ésimo `unlink` do `.lock`
// acontece de verdade e depois lança EIO — o commit e a liberação do lock
// ocorreram, mas quem chamou só vê a falha (confirmação perdida).
//
// SKILL_ME_TEST_TRACES_LOCK_KEPT=<n>: o n-ésimo `unlink` do `.lock` lança EIO
// sem tocar no disco — a liberação falha e o lock fica (issue #25, C43).
//
// SKILL_ME_TEST_TRACES_BUSY_LOCK=<n>: a n-ésima criação exclusiva do `.lock`
// falha com EEXIST sem tocar no disco, como se outro processo o tivesse
// naquele instante; a seguinte é real.
//
// SKILL_ME_TEST_TRACES_STALL_SEGMENT=1: a criação exclusiva do temporário de
// um segmento (`events-*.skill-me-tmp`) nunca termina — disco parado depois de
// o processo obter o lock.
//
// SKILL_ME_TEST_TRACES_TIMING=<arquivo>: só observa. Mede cada operação de disco
// do processo e, na saída, acrescenta ao arquivo uma linha
// `{"ops":[[operação, tipo do arquivo, início ms, duração ms, código do erro?]…],"cpuMs":n}`
// — tipo e código (`EPERM`…), nunca caminho, ID, mensagem ou conteúdo. Mostra
// onde a tentativa de entrega gastou o prazo, qual operação falhou e quais
// arquivos receberam flush (rodada 6 do build da #8).
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { createRequire, syncBuiltinESMExports } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const fsp = require("node:fs/promises");
const env = process.env;
const [gateDir, gateAt] = (env.SKILL_ME_TEST_TRACES_GATE ?? "").split("|");
const lostAt = Number(env.SKILL_ME_TEST_TRACES_LOST_CONFIRMATION ?? 0);
const isLock = (file) => typeof file === "string" && path.basename(file) === ".lock";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (gateDir) {
  const realOpen = fsp.open;
  let creations = 0;
  fsp.open = async function gatedOpen(file, flags, mode) {
    if (isLock(file) && typeof flags === "string" && flags.includes("x") && ++creations === Number(gateAt)) {
      writeFileSync(path.join(gateDir, "waiting"), String(process.pid));
      const deadline = Date.now() + 30_000;
      while (!existsSync(path.join(gateDir, "go")) && Date.now() < deadline) await sleep(10);
    }
    return realOpen(file, flags, mode);
  };
}

const busyAt = Number(env.SKILL_ME_TEST_TRACES_BUSY_LOCK ?? 0);
const stallSegment = env.SKILL_ME_TEST_TRACES_STALL_SEGMENT === "1";
const isSegmentTemp = (file) => typeof file === "string" && /^events-\d{6}\.ndjson\.[0-9a-f]{8}\.skill-me-tmp$/.test(path.basename(file));

if (busyAt > 0 || stallSegment) {
  const realOpen = fsp.open;
  let creations = 0;
  fsp.open = async function contendedOpen(file, flags, mode) {
    const exclusive = typeof flags === "string" && flags.includes("x");
    if (exclusive && isLock(file) && ++creations === busyAt) throw Object.assign(new Error("EEXIST injetado pelo teste"), { code: "EEXIST" });
    if (exclusive && stallSegment && isSegmentTemp(file)) return new Promise(() => {});
    return realOpen(file, flags, mode);
  };
}

if (lostAt > 0) {
  const realUnlink = fsp.unlink;
  let unlinks = 0;
  fsp.unlink = async function lossyUnlink(file) {
    const result = await realUnlink(file);
    if (isLock(file) && ++unlinks === lostAt) throw Object.assign(new Error("EIO injetado pelo teste"), { code: "EIO" });
    return result;
  };
}

const keptAt = Number(env.SKILL_ME_TEST_TRACES_LOCK_KEPT ?? 0);
if (keptAt > 0) {
  const realUnlink = fsp.unlink;
  let unlinks = 0;
  fsp.unlink = async function keptUnlink(file) {
    if (isLock(file) && ++unlinks === keptAt) throw Object.assign(new Error("EIO injetado pelo teste"), { code: "EIO" });
    return realUnlink(file);
  };
}

const timingFile = env.SKILL_ME_TEST_TRACES_TIMING;
const FILE_KINDS = [
  [/^\.lock$/, "lock"],
  [/^store\.json$/, "store.json"],
  [/^state\.json$/, "state.json"],
  [/^key$/, "key"],
  [/^events-\d{6}\.ndjson$/, "segmento"],
  [/^events-\d{6}\.ndjson\.[0-9a-f]{8}\.skill-me-tmp$/, "segmento.tmp"],
  [/^state\.json\.[0-9a-f]{8}\.skill-me-tmp$/, "state.json.tmp"],
];
const fileKind = (file) => (typeof file === "string" ? (FILE_KINDS.find(([pattern]) => pattern.test(path.basename(file)))?.[1] ?? "pasta") : "fd");

if (timingFile) {
  const ops = [];
  let cpuAtStart = null;
  const timed = (op, kind, run) => {
    cpuAtStart ??= process.cpuUsage();
    const started = performance.now();
    const done = (...code) => ops.push([op, kind, Math.round(started * 10) / 10, Math.round((performance.now() - started) * 10) / 10, ...code]);
    return run().then(
      (value) => {
        done();
        return value;
      },
      (error) => {
        done(typeof error?.code === "string" && /^E[A-Z]+$/.test(error.code) ? error.code : "erro");
        throw error;
      },
    );
  };
  for (const name of ["lstat", "stat", "realpath", "readdir", "rename", "rmdir", "unlink", "mkdir"]) {
    const real = fsp[name];
    fsp[name] = function timedFs(file, ...rest) {
      return timed(name, fileKind(file), () => real.call(this, file, ...rest));
    };
  }
  const handleKinds = new WeakMap();
  let handlePatched = false;
  const realOpen = fsp.open;
  fsp.open = function timedOpen(file, ...rest) {
    const kind = fileKind(file);
    return timed("open", kind, () => realOpen.call(this, file, ...rest)).then((handle) => {
      if (!handlePatched) {
        handlePatched = true;
        const proto = Object.getPrototypeOf(handle);
        for (const name of ["read", "stat", "writeFile", "sync"]) {
          const real = proto[name];
          proto[name] = function timedHandle(...args) {
            return timed(name, handleKinds.get(this) ?? "fd", () => real.apply(this, args));
          };
        }
      }
      handleKinds.set(handle, kind);
      // No Node 24 `close` é campo de cada FileHandle, não do protótipo.
      const realClose = handle.close;
      handle.close = () => timed("close", kind, () => realClose.call(handle));
      return handle;
    });
  };
  process.on("exit", () => {
    const cpu = process.cpuUsage(cpuAtStart ?? undefined);
    appendFileSync(timingFile, JSON.stringify({ ops, cpuMs: Math.round((cpu.user + cpu.system) / 1000) }) + "\n");
  });
}

syncBuiltinESMExports();
