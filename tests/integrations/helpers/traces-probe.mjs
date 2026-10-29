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
// SKILL_ME_TEST_TRACES_SEGMENT_EIO=<n>: a n-ésima promoção de segmento (`rename`
// do temporário para `events-NNNNNN.ndjson`) lança EIO sem tocar no disco — a
// gravação é desfeita e a entrega perde as entradas (issue #25, C28).
//
// SKILL_ME_TEST_TRACES_BUSY_LOCK=<n>: a n-ésima criação exclusiva do `.lock`
// falha com EEXIST sem tocar no disco, como se outro processo o tivesse
// naquele instante; a seguinte é real.
//
// SKILL_ME_TEST_TRACES_STALL_SEGMENT=1: a criação exclusiva do temporário de
// um segmento (`events-*.skill-me-tmp`) nunca termina — disco parado depois de
// o processo obter o lock.
//
// SKILL_ME_TEST_TRACES_BLOCK_LOOP=<n>|<ms>: antes da n-ésima criação exclusiva
// do `.lock`, prende o laço de eventos de forma síncrona por <ms> — processo
// parado, não disco (só a prova do diagnóstico das entregas T8, issue #25).
//
// SKILL_ME_TEST_TRACES_STALL_REPORT=1: o `open` do arquivo de diagnóstico do
// usuário (o caminho exato de SKILL_ME_CAPTURE_REPORT) nunca termina — a
// gravação perde a corrida com o prazo do relatório.
//
// SKILL_ME_TEST_TRACES_REPORT_EIO=1: o `open` desse arquivo falha com EIO sem
// tocar no disco — o diagnóstico se perde em silêncio. Os dois só servem aos
// controles do diagnóstico do T8-C20 (issue #25, linha "Diagnóstico do T8-C20"
// do Landing), que se distinguem só pela evidência.
//
// SKILL_ME_TEST_TRACES_TIMING=<arquivo>: só observa. Mede cada operação de disco
// do processo e, na saída, acrescenta ao arquivo uma linha
// `{"ops":[[operação, tipo do arquivo, início ms, duração ms, código do erro?]…],"cpuMs":n,
// "pending":[[operação, tipo, início ms, idade ms]…],"exitMs":n,"startedAt":n,"pid":n,
// "loop":{"samples":n,"maxMs":n,"p99Ms":n}}`
// — tipo e código (`EPERM`…), nunca caminho, ID, mensagem ou conteúdo. Mostra
// onde a tentativa de entrega gastou o prazo, qual operação falhou e quais
// arquivos receberam flush (rodada 6 do build da #8). `pending` são as operações
// ainda em curso quando o processo saiu (o `process.exit` do CLI encerra a
// tentativa abandonada no prazo), `exitMs` e os inícios vêm do relógio
// monotônico do processo, `startedAt` (`performance.timeOrigin`) só serve para
// correlacionar processos, e `loop` é o atraso do laço de eventos medido pelo
// `monitorEventLoopDelay`: laço livre com a operação parada é compatível com uma
// espera de E/S ou do sistema; laço parado, com o processo parado ou sem CPU —
// evidências, não a causa (issue #25, linhas "Diagnóstico das entregas de um
// produtor nas provas T8" e "Evidência comum dos produtores e formatter legado"
// do Landing). Os tipos de arquivo vêm de helpers/trace-kinds.mjs; o arquivo de
// diagnóstico do usuário sai `diagnóstico`, pelo valor exato da variável que o
// produtor recebe, porque o nome dele é escolhido por cada prova.
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { createRequire, syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { fileKind } from "./trace-kinds.mjs";

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

const segmentEioAt = Number(env.SKILL_ME_TEST_TRACES_SEGMENT_EIO ?? 0);
const isSegment = (file) => typeof file === "string" && /^events-\d{6}\.ndjson$/.test(path.basename(file));
if (segmentEioAt > 0) {
  const realRename = fsp.rename;
  let promotions = 0;
  fsp.rename = async function failingPromotion(from, to) {
    if (isSegment(to) && ++promotions === segmentEioAt) throw Object.assign(new Error("EIO injetado pelo teste"), { code: "EIO" });
    return realRename(from, to);
  };
}

const [blockAt, blockMs] = (env.SKILL_ME_TEST_TRACES_BLOCK_LOOP ?? "").split("|").map(Number);
if (blockAt > 0) {
  const realOpen = fsp.open;
  let creations = 0;
  fsp.open = async function blockedOpen(file, flags, mode) {
    if (isLock(file) && typeof flags === "string" && flags.includes("x") && ++creations === blockAt) {
      const until = performance.now() + blockMs;
      while (performance.now() < until);
    }
    return realOpen(file, flags, mode);
  };
}

const reportFile = env.SKILL_ME_CAPTURE_REPORT;
const isReport = (file) => typeof reportFile === "string" && reportFile !== "" && file === reportFile;
const stallReport = env.SKILL_ME_TEST_TRACES_STALL_REPORT === "1";
const reportEio = env.SKILL_ME_TEST_TRACES_REPORT_EIO === "1";
if (stallReport || reportEio) {
  const realOpen = fsp.open;
  fsp.open = async function faultyReportOpen(file, flags, mode) {
    if (!isReport(file)) return realOpen(file, flags, mode);
    if (stallReport) return new Promise(() => {});
    throw Object.assign(new Error("EIO injetado pelo teste"), { code: "EIO" });
  };
}
const kindOf = (file) => (isReport(file) ? "diagnóstico" : fileKind(file));

const timingFile = env.SKILL_ME_TEST_TRACES_TIMING;

const tenth = (ms) => Math.round(ms * 10) / 10;

if (timingFile) {
  const ops = [];
  const inFlight = new Set();
  const loop = monitorEventLoopDelay({ resolution: 10 });
  loop.enable();
  let cpuAtStart = null;
  const timed = (op, kind, run) => {
    cpuAtStart ??= process.cpuUsage();
    const started = performance.now();
    const entry = [op, kind, started];
    inFlight.add(entry);
    const done = (...code) => {
      inFlight.delete(entry);
      ops.push([op, kind, tenth(started), tenth(performance.now() - started), ...code]);
    };
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
      return timed(name, kindOf(file), () => real.call(this, file, ...rest));
    };
  }
  const handleKinds = new WeakMap();
  let handlePatched = false;
  const realOpen = fsp.open;
  fsp.open = function timedOpen(file, ...rest) {
    const kind = kindOf(file);
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
    const exitAt = performance.now();
    loop.disable();
    const cpu = process.cpuUsage(cpuAtStart ?? undefined);
    const pending = [...inFlight].map(([op, kind, started]) => [op, kind, tenth(started), tenth(exitAt - started)]);
    const delay = loop.count > 0 ? { samples: loop.count, maxMs: tenth(loop.max / 1e6), p99Ms: tenth(loop.percentile(99) / 1e6) } : { samples: 0, maxMs: null, p99Ms: null };
    const line = { ops, cpuMs: Math.round((cpu.user + cpu.system) / 1000), pending, exitMs: tenth(exitAt), startedAt: Math.round(performance.timeOrigin), pid: process.pid, loop: delay };
    appendFileSync(timingFile, JSON.stringify(line) + "\n");
  });
}

syncBuiltinESMExports();
