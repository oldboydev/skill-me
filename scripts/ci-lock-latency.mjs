import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { open } from "node:fs/promises";
import { createRequire, syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStoreIo } from "../src/integrations/privacy/fs.mjs";
import { StoreError, holdLockFile } from "../src/integrations/privacy/store.mjs";

// Medição comparativa da latência do lock do store no runner (issue #25, AC9;
// linha "Medição comparativa do lock na CI Windows" do Landing em
// .checks/issue-25-agent-launch.md). Compara o temporário padrão com o
// RUNNER_TEMP em fases A1/B/A2, com produtores que tomam e liberam o lock do
// store pela implementação real (holdLockFile) e processos de carga gravando com
// flush. É diagnóstico: não mede a suíte, não dá taxa histórica nem causa, e as
// faixas de 600/650 ms não são prazos. A saída só tem rótulos e números.

export const SCRIPT = fileURLToPath(import.meta.url);
export const PHASE = Object.freeze({ producers: 3, cycles: 500, loaders: 3, loadBytes: 64 * 1024, limitMs: 120_000 });
export const BANDS_MS = Object.freeze([600, 650]);
const DIR_PREFIX = "skill-me-lock-latency-";
const MARKER = ".skill-me-lock-latency";
// Depois do kill() no teto, quanto esperar o close antes de insistir com SIGKILL.
const KILL_GRACE_MS = 5_000;
const OPERATIONS = ["criacao", "escrita", "fechamento", "remocao"];

// O `code` E… da E/S ou o nome do erro; nunca a mensagem, que traz caminho.
const codeOf = (error) => (typeof error?.code === "string" && /^E[A-Z]+$/.test(error.code) ? error.code : (error?.name ?? "erro"));
const rounded = (ms) => Math.round(ms * 1000) / 1000;

// Percentil por posição mais próxima: o valor na posição ⌈p/100 × n⌉ da lista
// ordenada, sempre um valor observado. As faixas comparam o valor sem
// arredondar. Sem amostras não há medida: nada vira zero.
export function summarize(values) {
  if (values.length === 0) return { amostras: 0, indisponivel: "sem amostras" };
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p) => sorted[Math.ceil((p * sorted.length) / 100) - 1];
  return {
    amostras: sorted.length,
    p50: rounded(at(50)),
    p99: rounded(at(99)),
    max: rounded(sorted.at(-1)),
    ...Object.fromEntries(BANDS_MS.map((band) => [`>=${band}`, values.filter((value) => value >= band).length])),
  };
}

// Mesmo destino: caminhos já reais, comparados como o sistema os compara — no
// Windows sem diferenciar maiúsculas; o `resolve` tira o separador final.
export function samePlace(a, b, platform = process.platform) {
  const paths = platform === "win32" ? path.win32 : path.posix;
  const normal = (value) => (platform === "win32" ? paths.resolve(value).toLowerCase() : paths.resolve(value));
  return normal(a) === normal(b);
}

// Só o volume, no Windows ("C:"), para dizer se os destinos estão no mesmo disco
// lógico sem mostrar o caminho.
const volumeOf = (real, platform) => {
  if (platform !== "win32") return undefined;
  const root = path.win32.parse(real).root.replace(/[\\/]$/, "");
  return /^[A-Za-z]:$/.test(root) ? root.toUpperCase() : "outro";
};

// Destinos e fases. O temporário padrão precisa existir; o RUNNER_TEMP ausente,
// ilegível, que não é pasta ou que é o mesmo destino fica indisponível, e então
// há uma só fase, sem comparação.
export function resolveDestinations({ tmpdir = os.tmpdir(), runnerTemp = process.env.RUNNER_TEMP, platform = process.platform, realpath = realpathSync.native, isDirectory = (dir) => statSync(dir).isDirectory() } = {}) {
  const standard = realpath(tmpdir);
  let runner;
  if (runnerTemp === undefined || runnerTemp === "") runner = { indisponivel: "RUNNER_TEMP ausente" };
  else {
    try {
      const real = realpath(runnerTemp);
      runner = isDirectory(real) ? { real } : { indisponivel: "RUNNER_TEMP não é pasta" };
    } catch (error) {
      runner = { indisponivel: `RUNNER_TEMP ilegível [${codeOf(error)}]` };
    }
  }
  if (runner.real !== undefined && samePlace(standard, runner.real, platform)) runner = { indisponivel: "RUNNER_TEMP é o mesmo destino do temporário padrão" };
  const destinos = { padrao: { volume: volumeOf(standard, platform) }, runner: runner.real === undefined ? { indisponivel: runner.indisponivel } : { volume: volumeOf(runner.real, platform) } };
  if (runner.real === undefined) return { destinos, comparacao: `não aplicável: ${runner.indisponivel}`, phases: [{ fase: "A", destino: "padrao", dir: standard }] };
  return {
    destinos,
    comparacao: "A1/B/A2",
    phases: [
      { fase: "A1", destino: "padrao", dir: standard },
      { fase: "B", destino: "runner", dir: runner.real },
      { fase: "A2", destino: "padrao", dir: standard },
    ],
  };
}

// Protocolo dos filhos: uma linha JSON por evento. Linha que não é JSON, que
// não tem a forma esperada ou que ficou pela metade (sem quebra no fim) conta
// como inválida, nunca como ciclo.
const isDuration = (value) => value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
const isCycle = (value) =>
  Number.isSafeInteger(value?.ciclo) && ["tomada", "liberacao", ...OPERATIONS].every((key) => isDuration(value[key])) && (value.erro === null || typeof value.erro === "string");

export function parseLines(text) {
  const parts = text.split("\n");
  const partial = parts.pop();
  let invalid = partial === "" ? 0 : 1;
  const records = [];
  for (const line of parts) {
    try {
      records.push(JSON.parse(line));
    } catch {
      invalid += 1;
    }
  }
  return { records, invalid };
}

// Ciclos de um produtor no próprio lock, pela implementação real do store.
// Tomada: do início até a entrada no callback; liberação: da saída do callback
// até o retorno. Um ciclo com erro não dá tomada nem liberação; as operações
// concluídas nele contam. `ops.current` recebe criação, escrita e fechamento da
// instrumentação do processo (instrumentLockFile) e a remoção daqui.
export async function measureCycles({ lockPath, cycles, io, onCycle, ops = { current: null }, clock = () => performance.now() }) {
  const measured = {
    ...io,
    async unlink(file) {
      const start = clock();
      const value = await io.unlink(file);
      if (path.basename(file) === ".lock") ops.current.remocao = clock() - start;
      return value;
    },
  };
  for (let ciclo = 1; ciclo <= cycles; ciclo++) {
    ops.current = { criacao: null, escrita: null, fechamento: null, remocao: null };
    let entered = null;
    let left = null;
    let erro = null;
    const start = clock();
    try {
      await holdLockFile({ io: measured, lockPath, lostCode: "lock_lost" }, async () => {
        entered = clock();
        left = clock();
      });
    } catch (error) {
      erro = error instanceof StoreError ? error.code : codeOf(error);
    }
    const end = clock();
    onCycle({ ciclo, tomada: erro === null ? entered - start : null, liberacao: erro === null ? end - left : null, ...ops.current, erro });
  }
}

// Só no processo do produtor: mede a criação exclusiva do `.lock` e a escrita e
// o fechamento desse handle, como o writeExclusive de privacy/fs.mjs os faz.
// Uma operação que falha não vira amostra.
function instrumentLockFile(ops) {
  const fsp = createRequire(import.meta.url)("node:fs/promises");
  const realOpen = fsp.open;
  fsp.open = async function measuredOpen(file, flags, ...rest) {
    const exclusiveLock = typeof file === "string" && path.basename(file) === ".lock" && typeof flags === "string" && flags.includes("x");
    if (!exclusiveLock) return realOpen.call(this, file, flags, ...rest);
    const start = performance.now();
    const handle = await realOpen.call(this, file, flags, ...rest);
    ops.current.criacao = performance.now() - start;
    const timed = (name, key) => {
      const real = handle[name];
      handle[name] = async (...args) => {
        const begin = performance.now();
        const value = await real.apply(handle, args);
        ops.current[key] = performance.now() - begin;
        return value;
      };
    };
    timed("writeFile", "escrita");
    timed("close", "fechamento");
    return handle;
  };
  syncBuiltinESMExports();
}

async function producerProcess(dir, cycles) {
  const ops = { current: null };
  instrumentLockFile(ops);
  await measureCycles({ lockPath: path.join(dir, ".lock"), cycles, io: createStoreIo(), ops, onCycle: (cycle) => process.stdout.write(`${JSON.stringify(cycle)}\n`) });
  process.stdout.write(`${JSON.stringify({ fim: true, ciclos: cycles })}\n`);
}

// Carga: grava `bytes` sintéticos com flush num arquivo próprio até o stdin
// fechar; avisa `pronto` depois da 1ª tentativa e, ao sair, quantas escritas e
// erros houve.
async function loadProcess(dir, bytes) {
  const data = randomBytes(bytes);
  const file = path.join(dir, "carga.bin");
  let stopping = false;
  process.stdin.on("end", () => (stopping = true));
  process.stdin.resume();
  let escritas = 0;
  const erros = {};
  let attempts = 0;
  while (!stopping) {
    try {
      const handle = await open(file, "w");
      try {
        await handle.writeFile(data);
        await handle.sync();
      } finally {
        await handle.close();
      }
      escritas += 1;
    } catch (error) {
      erros[codeOf(error)] = (erros[codeOf(error)] ?? 0) + 1;
    }
    if (++attempts === 1) process.stdout.write('{"pronto":true}\n');
  }
  process.stdout.write(`${JSON.stringify({ fim: true, escritas, erros })}\n`);
}

// Filho do supervisor: o próprio script num papel interno, sem janela.
export const spawnWorker = (role, dir, value) =>
  spawn(process.execPath, [SCRIPT, "--papel", role, dir, String(value)], { stdio: [role === "carga" ? "pipe" : "ignore", "pipe", "pipe"], windowsHide: true });

// Supervisor de uma fase. Inicia as cargas e espera cada uma ficar pronta, para
// a carga correr durante a medição; inicia os produtores; com todos fechados,
// fecha o stdin das cargas. No teto, encerra só os filhos que ele mesmo criou e
// espera o close de cada um. Nunca lista nem encerra outros processos.
export async function runPhase({ dir, producers, cycles, loaders, loadBytes, limitMs, spawnChild = spawnWorker, clock = () => performance.now() }) {
  const start = clock();
  const children = [];
  const track = (role, child) => {
    const entry = { role, child, text: "", closed: false, exit: null };
    let markReady;
    entry.ready = new Promise((resolve) => (markReady = resolve));
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      entry.text += chunk;
      if (entry.text.includes('{"pronto":true}\n')) markReady();
    });
    child.stderr.resume();
    child.stdin?.on("error", () => {});
    entry.done = new Promise((resolve) =>
      child.on("close", (code, signal) => {
        entry.closed = true;
        entry.exit = { codigo: code, sinal: signal };
        markReady();
        resolve();
      }),
    );
    children.push(entry);
    return entry;
  };
  let timedOut = false;
  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => {
      timedOut = true;
      resolve();
    }, limitMs);
  });
  const until = (promises) => Promise.race([Promise.all(promises), deadline]);

  const loads = Array.from({ length: loaders }, (_, k) => {
    const own = path.join(dir, `carga-${k + 1}`);
    mkdirSync(own);
    return track("carga", spawnChild("carga", own, loadBytes));
  });
  await until(loads.map((load) => load.ready));
  if (!timedOut) {
    const runs = Array.from({ length: producers }, (_, k) => {
      const own = path.join(dir, `produtor-${k + 1}`);
      mkdirSync(own);
      return track("produtor", spawnChild("produtor", own, cycles));
    });
    await until(runs.map((run) => run.done));
  }
  if (!timedOut) {
    for (const load of loads) load.child.stdin?.end();
    await until(loads.map((load) => load.done));
  }
  clearTimeout(timer);
  if (timedOut) {
    const running = children.filter((entry) => !entry.closed);
    for (const entry of running) entry.child.kill();
    await Promise.race([Promise.all(running.map((entry) => entry.done)), new Promise((resolve) => setTimeout(resolve, KILL_GRACE_MS))]);
    for (const entry of running.filter((item) => !item.closed)) entry.child.kill("SIGKILL");
  }
  await Promise.all(children.map((entry) => entry.done));
  return { durationMs: clock() - start, timedOut, children: children.map(({ role, text, exit }) => ({ role, text, exit })) };
}

// Uma fase em números. `incompletos` são os ciclos previstos que não terminaram
// (teto ou filho que parou); `comErro`, os que terminaram com erro.
export function aggregatePhase({ fase, destino, producers, cycles, result }) {
  const producerOut = result.children.filter((child) => child.role === "produtor").map((child) => ({ ...parseLines(child.text), exit: child.exit }));
  const loadOut = result.children.filter((child) => child.role === "carga").map((child) => ({ ...parseLines(child.text), exit: child.exit }));
  let invalid = 0;
  const done = [];
  for (const out of [...producerOut, ...loadOut]) invalid += out.invalid;
  for (const out of producerOut) {
    for (const record of out.records) {
      if (record.fim === true) continue;
      if (isCycle(record)) done.push(record);
      else invalid += 1;
    }
  }
  const previstos = producers * cycles;
  const erros = { lockPresent: 0, lockLost: 0, es: {} };
  for (const { erro } of done) {
    if (erro === "lock_present") erros.lockPresent += 1;
    else if (erro === "lock_lost") erros.lockLost += 1;
    else if (erro !== null) erros.es[erro] = (erros.es[erro] ?? 0) + 1;
  }
  const clean = done.filter((record) => record.erro === null);
  const loadEnds = loadOut.map((out) => out.records.find((record) => record.fim === true)).filter(Boolean);
  const loadErrors = {};
  for (const end of loadEnds) for (const [code, n] of Object.entries(end.erros ?? {})) loadErrors[code] = (loadErrors[code] ?? 0) + n;
  return {
    fase,
    destino,
    duracaoMs: rounded(result.durationMs),
    encerradaPeloTeto: result.timedOut,
    ciclos: { previstos, concluidos: done.length, comErro: done.length - clean.length, incompletos: previstos - done.length },
    erros,
    tomada: summarize(clean.map((record) => record.tomada)),
    liberacao: summarize(clean.map((record) => record.liberacao)),
    operacoes: Object.fromEntries(OPERATIONS.map((op) => [op, summarize(done.map((record) => record[op]).filter((value) => value !== null))])),
    linhasInvalidas: invalid,
    carga: { processos: loadOut.length, terminaram: loadEnds.length, escritas: loadEnds.reduce((sum, end) => sum + (end.escritas ?? 0), 0), erros: loadErrors },
    processos: { produtores: producerOut.map((out) => out.exit), carga: loadOut.map((out) => out.exit) },
  };
}

// Pasta própria da fase, criada no destino com o marcador e o nonce da execução.
export function createOwnDir(destination, fase, nonce) {
  const dir = mkdtempSync(path.join(destination, `${DIR_PREFIX}${fase}-`));
  writeFileSync(path.join(dir, MARKER), nonce);
  return dir;
}

// Remove a pasta da fase só se ela for a desta execução: absoluta, a mesma que
// foi criada, filha direta do destino, sem link e com o marcador e o nonce. Senão
// recusa, sem tocar em nada; o motivo não leva o caminho.
export function removeOwnDir(dir, { created, destination, nonce, platform = process.platform }) {
  const refuse = (motivo) => ({ ok: false, motivo });
  if (!path.isAbsolute(dir)) return refuse("caminho relativo");
  if (dir !== created) return refuse("não é a pasta criada por esta execução");
  if (!samePlace(path.dirname(dir), destination, platform) || !path.basename(dir).startsWith(DIR_PREFIX)) return refuse("fora da árvore própria");
  let stats;
  try {
    stats = lstatSync(dir);
  } catch (error) {
    return refuse(`ilegível [${codeOf(error)}]`);
  }
  if (stats.isSymbolicLink() || !stats.isDirectory()) return refuse("não é uma pasta real");
  let marker;
  try {
    marker = readFileSync(path.join(dir, MARKER), "utf8");
  } catch {
    return refuse("sem o marcador desta execução");
  }
  if (marker !== nonce) return refuse("sem o marcador desta execução");
  rmSync(dir, { recursive: true });
  return { ok: true };
}

// A medição inteira. O CLI usa só as constantes de PHASE; as provas passam
// valores pequenos pela mesma função. Uma fase que não pôde ter a pasta própria
// ou que falhou no supervisor fica indisponível com o motivo, e as outras
// seguem: o resultado de uma não se perde pela falha de outra.
export async function measure({ phase = PHASE, env = process.env, tmpdir = os.tmpdir(), platform = process.platform, spawnChild = spawnWorker } = {}) {
  const plan = resolveDestinations({ tmpdir, runnerTemp: env.RUNNER_TEMP, platform });
  const nonce = randomBytes(8).toString("hex");
  const report = {
    skillMeLockLatency: 1,
    comparacao: plan.comparacao,
    destinos: plan.destinos,
    parametros: { produtores: phase.producers, ciclosPorProdutor: phase.cycles, carga: phase.loaders, bytesPorEscrita: phase.loadBytes, tetoMs: phase.limitMs, faixasMs: [...BANDS_MS] },
    fases: [],
    limpeza: { removidas: 0, recusadas: [] },
  };
  for (const step of plan.phases) {
    let dir;
    try {
      dir = createOwnDir(step.dir, step.fase, nonce);
    } catch (error) {
      report.fases.push({ fase: step.fase, destino: step.destino, indisponivel: `pasta própria não criada [${codeOf(error)}]` });
      continue;
    }
    try {
      const result = await runPhase({ dir, ...phase, spawnChild });
      report.fases.push(aggregatePhase({ fase: step.fase, destino: step.destino, producers: phase.producers, cycles: phase.cycles, result }));
    } catch (error) {
      report.fases.push({ fase: step.fase, destino: step.destino, indisponivel: `fase interrompida [${codeOf(error)}]` });
    } finally {
      const outcome = removeOwnDir(dir, { created: dir, destination: step.dir, nonce, platform });
      if (outcome.ok) report.limpeza.removidas += 1;
      else report.limpeza.recusadas.push(outcome.motivo);
    }
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT) {
  const [first, role, dir, value] = process.argv.slice(2);
  if (first === "--papel" && role === "produtor") await producerProcess(dir, Number(value));
  else if (first === "--papel" && role === "carga") await loadProcess(dir, Number(value));
  else if (first !== undefined) {
    process.stderr.write("uso: node scripts/ci-lock-latency.mjs\n");
    process.exitCode = 2;
  } else {
    try {
      process.stdout.write(`${JSON.stringify(await measure(), null, 2)}\n`);
    } catch (error) {
      // O temporário padrão não resolvido ou um erro interno: sem relatório de fases.
      process.stdout.write(`${JSON.stringify({ skillMeLockLatency: 1, indisponivel: `medição não concluída [${codeOf(error)}]` })}\n`);
      process.exitCode = 1;
    }
  }
}
