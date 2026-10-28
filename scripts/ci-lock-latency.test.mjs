import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { createStoreIo } from "../src/integrations/privacy/fs.mjs";
import {
  BANDS_MS,
  PHASE,
  SCRIPT,
  aggregatePhase,
  createOwnDir,
  measure,
  measureCycles,
  parseLines,
  removeOwnDir,
  resolveDestinations,
  runPhase,
  samePlace,
  spawnWorker,
  summarize,
} from "./ci-lock-latency.mjs";

// Provas do C50 (issue #25, AC9; linha "Medição comparativa do lock na CI
// Windows" do Landing em .checks/issue-25-agent-launch.md). Os valores
// esperados vêm do contrato do Landing. As fases rodam pela API exportada com
// poucos ciclos; a medição completa (500 ciclos por produtor, 120 s) é a do job
// manual no runner. Filhos de fixture são `node -e`; nenhum agente é iniciado.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), `skill-me lock latency ${label}-`)));
  scratches.push(dir);
  return dir;
};

const ok = (ciclo) => ({ ciclo, tomada: 1.5, liberacao: 0.5, criacao: 0.2, escrita: 0.1, fechamento: 0.05, remocao: 0.1, erro: null });
const lines = (records) => records.map((record) => `${JSON.stringify(record)}\n`).join("");
const fixture = (code) => (role) => spawn(process.execPath, ["-e", code], { stdio: [role === "carga" ? "pipe" : "ignore", "pipe", "pipe"], windowsHide: true });
const forever = "setInterval(() => {}, 1000);";
const UNAVAILABLE = { amostras: 0, indisponivel: "sem amostras" };

test("C50 percentis e faixas: valores exatos por posição mais próxima, inclusive imediatamente abaixo de 600 e de 650", () => {
  assert.deepEqual(summarize([700, 10, 650, 599.999, 20, 649.999, 600]), { amostras: 7, p50: 600, p99: 700, max: 700, ">=600": 4, ">=650": 2 });
  assert.deepEqual(
    summarize(Array.from({ length: 100 }, (_, i) => i + 1)),
    { amostras: 100, p50: 50, p99: 99, max: 100, ">=600": 0, ">=650": 0 },
    "zero medido, com amostras, é diferente de sem amostras",
  );
  assert.deepEqual(summarize([0.0004, 0.0006]), { amostras: 2, p50: 0, p99: 0.001, max: 0.001, ">=600": 0, ">=650": 0 }, "3 casas, contagem sobre o valor sem arredondar");
  assert.deepEqual(BANDS_MS, [600, 650]);
});

test("C50 sem amostras: a métrica fica indisponível, nunca percentil ou contagem zero, também numa fase em que todos os ciclos tiveram erro", () => {
  assert.deepEqual(summarize([]), UNAVAILABLE);
  const failed = [1, 2].map((ciclo) => ({ ...ok(ciclo), tomada: null, liberacao: null, criacao: null, escrita: null, fechamento: null, remocao: null, erro: "EIO" }));
  const phase = aggregatePhase({ fase: "A", destino: "padrao", producers: 1, cycles: 2, result: { durationMs: 1, timedOut: false, children: [{ role: "produtor", text: lines(failed), exit: { codigo: 0, sinal: null } }] } });
  assert.deepEqual(phase.ciclos, { previstos: 2, concluidos: 2, comErro: 2, incompletos: 0 });
  assert.deepEqual([phase.tomada, phase.liberacao, phase.operacoes], [UNAVAILABLE, UNAVAILABLE, { criacao: UNAVAILABLE, escrita: UNAVAILABLE, fechamento: UNAVAILABLE, remocao: UNAVAILABLE }]);
  assert.deepEqual(phase.erros, { lockPresent: 0, lockLost: 0, es: { EIO: 2 } });
});

test("C50 caminhos: o mesmo destino no Windows sem diferenciar maiúsculas nem separador final, distinto por volume, e exato no POSIX", () => {
  assert.equal(samePlace("C:\\Temp", "c:\\temp\\", "win32"), true);
  assert.equal(samePlace("C:\\Users\\R\\AppData\\Local\\Temp", "D:\\a\\_temp", "win32"), false);
  assert.equal(samePlace("/tmp", "/tmp/", "linux"), true);
  assert.equal(samePlace("/tmp", "/TMP", "linux"), false);

  const real = { "C:\\Temp": "C:\\Temp", "D:\\a\\_temp": "D:\\a\\_temp", "c:\\temp\\": "C:\\Temp", "D:\\arquivo": "D:\\arquivo" };
  const realpath = (dir) => {
    if (!(dir in real)) throw Object.assign(new Error("ausente"), { code: "ENOENT" });
    return real[dir];
  };
  const plan = (runnerTemp) => resolveDestinations({ tmpdir: "C:\\Temp", runnerTemp, platform: "win32", realpath, isDirectory: (dir) => dir !== "D:\\arquivo" });
  const single = (motivo) => ({ comparacao: `não aplicável: ${motivo}`, runner: { indisponivel: motivo }, phases: [["A", "padrao", "C:\\Temp"]] });
  const shape = (p) => ({ comparacao: p.comparacao, runner: p.destinos.runner, phases: p.phases.map(({ fase, destino, dir }) => [fase, destino, dir]) });
  assert.deepEqual(shape(plan(undefined)), single("RUNNER_TEMP ausente"));
  assert.deepEqual(shape(plan("")), single("RUNNER_TEMP ausente"));
  assert.deepEqual(shape(plan("D:\\nada")), single("RUNNER_TEMP ilegível [ENOENT]"));
  assert.deepEqual(shape(plan("D:\\arquivo")), single("RUNNER_TEMP não é pasta"));
  assert.deepEqual(shape(plan("c:\\temp\\")), single("RUNNER_TEMP é o mesmo destino do temporário padrão"));
  assert.deepEqual(shape(plan("D:\\a\\_temp")), {
    comparacao: "A1/B/A2",
    runner: { volume: "D:" },
    phases: [
      ["A1", "padrao", "C:\\Temp"],
      ["B", "runner", "D:\\a\\_temp"],
      ["A2", "padrao", "C:\\Temp"],
    ],
  });
  assert.deepEqual(plan("D:\\a\\_temp").destinos.padrao, { volume: "C:" });
});

test("C50 caminhos reais: um link ou junção para o temporário padrão resolve para o mesmo destino, sem duas fases", () => {
  const base = scratch("link");
  const target = path.join(base, "padrao");
  mkdirSync(target);
  const link = path.join(base, "ligacao");
  symlinkSync(target, link, "junction");
  const plan = resolveDestinations({ tmpdir: target, runnerTemp: link });
  assert.deepEqual([plan.comparacao, plan.phases.map((p) => p.fase)], ["não aplicável: RUNNER_TEMP é o mesmo destino do temporário padrão", ["A"]]);
  const other = path.join(base, "outro");
  mkdirSync(other);
  assert.deepEqual(resolveDestinations({ tmpdir: target, runnerTemp: other }).phases.map((p) => p.fase), ["A1", "B", "A2"]);
});

test("C50 E/S: a remoção do lock com EIO dá EIO entre os erros de E/S e os ciclos seguintes saem com lock_present, separado; tomada e liberação só de ciclos sem erro", async () => {
  const dir = scratch("eio");
  const real = createStoreIo();
  let failed = false;
  const io = {
    ...real,
    async unlink(file) {
      if (!failed && path.basename(file) === ".lock") {
        failed = true;
        throw Object.assign(new Error("EIO injetado"), { code: "EIO" });
      }
      return real.unlink(file);
    },
  };
  const records = [];
  await measureCycles({ lockPath: path.join(dir, ".lock"), cycles: 3, io, onCycle: (cycle) => records.push(cycle) });
  assert.deepEqual(records.map((r) => r.erro), ["EIO", "lock_present", "lock_present"]);
  assert.ok(records.every((r) => r.tomada === null && r.liberacao === null && r.remocao === null));
  const phase = aggregatePhase({ fase: "A", destino: "padrao", producers: 1, cycles: 3, result: { durationMs: 1, timedOut: false, children: [{ role: "produtor", text: lines(records), exit: { codigo: 0, sinal: null } }] } });
  assert.deepEqual([phase.ciclos, phase.erros, phase.tomada, phase.liberacao], [{ previstos: 3, concluidos: 3, comErro: 3, incompletos: 0 }, { lockPresent: 2, lockLost: 0, es: { EIO: 1 } }, UNAVAILABLE, UNAVAILABLE]);

  // Controle: o mesmo io sem falha dá três ciclos limpos, com tomada e liberação.
  const clean = [];
  await measureCycles({ lockPath: path.join(scratch("eio controle"), ".lock"), cycles: 3, io: real, onCycle: (cycle) => clean.push(cycle) });
  assert.deepEqual(clean.map((r) => [r.erro, typeof r.tomada, typeof r.liberacao, typeof r.remocao]), Array(3).fill([null, "number", "number", "number"]));
});

test("C50 teto: produtores de fixture que nunca terminam são encerrados no teto, e um processo alheio continua vivo; nada vira zero", async () => {
  const dir = scratch("teto");
  const foreign = spawn(process.execPath, ["-e", forever], { stdio: "ignore", windowsHide: true });
  const foreignClosed = new Promise((resolve) => foreign.on("close", resolve));
  try {
    const result = await runPhase({ dir, producers: 3, cycles: 4, loaders: 1, loadBytes: 1024, limitMs: 1_500, spawnChild: (role, own, value) => (role === "produtor" ? fixture(forever)(role) : spawnWorker(role, own, value)) });
    assert.equal(result.timedOut, true);
    assert.ok(result.children.every((child) => child.exit !== null), "os filhos do supervisor fecharam");
    assert.equal(process.kill(foreign.pid, 0), true, "o processo alheio não foi encerrado");
    const phase = aggregatePhase({ fase: "A", destino: "padrao", producers: 3, cycles: 4, result });
    assert.deepEqual([phase.encerradaPeloTeto, phase.ciclos, phase.tomada, phase.operacoes.criacao], [true, { previstos: 12, concluidos: 0, comErro: 0, incompletos: 12 }, UNAVAILABLE, UNAVAILABLE]);
    assert.deepEqual([phase.carga.processos, phase.carga.terminaram], [1, 0], "a carga encerrada no teto não traz relatório");
  } finally {
    foreign.kill();
    await foreignClosed;
  }
});

test("C50 término parcial: um produtor que conclui 2 de 3 ciclos e para fica com 2 concluídos e 1 incompleto, e as métricas têm 2 amostras", async () => {
  const partial = `process.stdout.write(${JSON.stringify(lines([ok(1), { ...ok(2), tomada: 700 }]))}); ${forever}`;
  const result = await runPhase({ dir: scratch("parcial"), producers: 1, cycles: 3, loaders: 0, loadBytes: 1024, limitMs: 1_500, spawnChild: fixture(partial) });
  const phase = aggregatePhase({ fase: "A", destino: "padrao", producers: 1, cycles: 3, result });
  assert.deepEqual([phase.encerradaPeloTeto, phase.ciclos], [true, { previstos: 3, concluidos: 2, comErro: 0, incompletos: 1 }]);
  assert.deepEqual(phase.tomada, { amostras: 2, p50: 1.5, p99: 700, max: 700, ">=600": 1, ">=650": 1 });
});

test("C50 protocolo: linha incompleta, linha que não é JSON e objeto fora da forma contam como inválidas, nunca como ciclo", () => {
  assert.deepEqual(parseLines(`{"ciclo":1\n${lines([ok(1)])}{"ciclo":2`), { records: [ok(1)], invalid: 2 });
  const text = `${lines([ok(1), { ciclo: 2, tomada: "rápido" }, { fim: true, ciclos: 3 }])}não é json\n{"ciclo":3,"tom`;
  const phase = aggregatePhase({ fase: "A", destino: "padrao", producers: 1, cycles: 3, result: { durationMs: 1, timedOut: false, children: [{ role: "produtor", text, exit: { codigo: 0, sinal: null } }] } });
  assert.deepEqual([phase.ciclos, phase.linhasInvalidas, phase.tomada.amostras], [{ previstos: 3, concluidos: 1, comErro: 0, incompletos: 2 }, 3, 1]);
});

test("C50 limpeza: só remove a pasta criada por esta execução no destino, com o marcador e o nonce; recusa as outras sem apagar nada", () => {
  const destination = scratch("limpeza");
  const nonce = "0123456789abcdef";
  const own = createOwnDir(destination, "A", nonce);
  writeFileSync(path.join(own, "dado.bin"), "x");
  const keep = (dir) => readdirSync(dir).sort();

  const elsewhere = scratch("limpeza fora");
  const outside = createOwnDir(elsewhere, "A", nonce);
  assert.deepEqual(removeOwnDir(outside, { created: outside, destination, nonce }), { ok: false, motivo: "fora da árvore própria" });
  assert.ok(existsSync(outside));

  const unmarked = path.join(destination, "skill-me-lock-latency-A-sem-marcador");
  mkdirSync(unmarked);
  writeFileSync(path.join(unmarked, "alheio.txt"), "alheio");
  assert.deepEqual(removeOwnDir(unmarked, { created: unmarked, destination, nonce }), { ok: false, motivo: "sem o marcador desta execução" });
  const otherNonce = createOwnDir(destination, "B", "fedcba9876543210");
  assert.deepEqual(removeOwnDir(otherNonce, { created: otherNonce, destination, nonce }), { ok: false, motivo: "sem o marcador desta execução" });

  const link = path.join(destination, "skill-me-lock-latency-A-ligacao");
  symlinkSync(own, link, "junction");
  assert.deepEqual(removeOwnDir(link, { created: link, destination, nonce }), { ok: false, motivo: "não é uma pasta real" });
  // Literal: no Windows, `path.relative` para outro volume devolve um caminho absoluto.
  assert.deepEqual(removeOwnDir(path.join("pasta relativa", path.basename(own)), { created: own, destination, nonce }), { ok: false, motivo: "caminho relativo" });
  assert.deepEqual(removeOwnDir(own, { created: otherNonce, destination, nonce }), { ok: false, motivo: "não é a pasta criada por esta execução" });
  assert.deepEqual([keep(own), keep(unmarked)], [[".skill-me-lock-latency", "dado.bin"], ["alheio.txt"]], "nada apagado nas recusas");

  assert.deepEqual(removeOwnDir(own, { created: own, destination, nonce }), { ok: true });
  assert.ok(!existsSync(own));
  assert.ok(existsSync(unmarked) && existsSync(otherNonce) && existsSync(outside), "as recusadas continuam");
});

test("C50 fronteira real: uma fase com os filhos reais do script (3 produtores de 5 ciclos, 3 cargas de 64 KiB com flush) termina sem teto e sem erro", async () => {
  const result = await runPhase({ dir: scratch("real"), producers: 3, cycles: 5, loaders: 3, loadBytes: 64 * 1024, limitMs: 60_000 });
  const phase = aggregatePhase({ fase: "A", destino: "padrao", producers: 3, cycles: 5, result });
  assert.deepEqual([phase.encerradaPeloTeto, phase.ciclos, phase.erros, phase.linhasInvalidas], [false, { previstos: 15, concluidos: 15, comErro: 0, incompletos: 0 }, { lockPresent: 0, lockLost: 0, es: {} }, 0]);
  for (const [name, metric] of [["tomada", phase.tomada], ["liberacao", phase.liberacao], ...Object.entries(phase.operacoes)]) {
    assert.equal(metric.amostras, 15, name);
    assert.ok(metric.p50 <= metric.p99 && metric.p99 <= metric.max, name);
  }
  assert.deepEqual([phase.carga.processos, phase.carga.terminaram, phase.carga.erros], [3, 3, {}]);
  assert.ok(phase.carga.escritas >= 3, "cada carga gravou ao menos uma vez antes da medição");
  assert.deepEqual(phase.processos.produtores, Array(3).fill({ codigo: 0, sinal: null }));
});

test("C50 relatório: A1/B/A2 com o RUNNER_TEMP distinto, uma fase sem ele, e nenhum caminho, nonce ou variável de ambiente na saída", async () => {
  const small = { producers: 3, cycles: 2, loaders: 1, loadBytes: 1024, limitMs: 60_000 };
  const standard = scratch("relatorio padrao");
  const runner = scratch("relatorio runner");
  const both = await measure({ phase: small, env: { RUNNER_TEMP: runner }, tmpdir: standard });
  assert.deepEqual([both.comparacao, both.fases.map((f) => [f.fase, f.destino, f.ciclos.concluidos])], ["A1/B/A2", [["A1", "padrao", 6], ["B", "runner", 6], ["A2", "padrao", 6]]]);
  assert.deepEqual(both.limpeza, { removidas: 3, recusadas: [] });
  assert.deepEqual([readdirSync(standard), readdirSync(runner)], [[], []], "as pastas da medição saíram");
  const alone = await measure({ phase: small, env: {}, tmpdir: standard });
  assert.deepEqual([alone.comparacao, alone.destinos.runner, alone.fases.map((f) => f.fase)], ["não aplicável: RUNNER_TEMP ausente", { indisponivel: "RUNNER_TEMP ausente" }, ["A"]]);
  for (const report of [both, alone]) {
    const text = JSON.stringify(report);
    for (const value of [standard, runner, os.tmpdir(), process.env.PATH].filter(Boolean)) {
      assert.ok(!text.includes(value) && !text.includes(JSON.stringify(value).slice(1, -1)), "nenhum caminho nem variável de ambiente");
    }
    assert.doesNotMatch(text, /[0-9a-f]{16}/, "nenhum nonce");
  }
});

test("C50 CLI: as constantes vinculantes e o uso inválido, sem medir", () => {
  assert.deepEqual({ ...PHASE }, { producers: 3, cycles: 500, loaders: 3, loadBytes: 65_536, limitMs: 120_000 });
  const usage = spawnSync(process.execPath, [SCRIPT, "--ciclos", "5"], { encoding: "utf8" });
  assert.deepEqual([usage.status, usage.stdout, usage.stderr], [2, "", "uso: node scripts/ci-lock-latency.mjs\n"]);
});
