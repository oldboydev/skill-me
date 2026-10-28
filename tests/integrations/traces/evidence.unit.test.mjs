import assert from "node:assert/strict";
import { mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { REPO_ROOT, baseEnv, makeScratch } from "../helpers/cli.mjs";
import { claudePayload, leaks } from "../helpers/privacy-canaries.mjs";
import { isTestHome, recordedProducer, rootOf } from "../helpers/producer-runs.mjs";
import { TRACES_PROBE, deliveryTiming, describeTiming, inProcessProducer, recordingProducers, runHook } from "../helpers/traces.mjs";

// Provas do apoio comum da evidência dos produtores (issue #25; refinamento do
// C46 (k) e do C47; linha "Evidência comum dos produtores e formatter legado" do
// Landing): o formatter com dados válidos e ausentes, o mesmo erro com a
// evidência, o ambiente dos apoios dentro e fora de um registro, a raiz só de um
// home de prova e o io medido de um produtor em processo. Este arquivo não adota
// o registro por teste: os registros aqui são os explícitos de cada prova.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};
const rejection = (promise) => promise.then(
  () => null,
  (error) => error,
);

const STARTED_AT = Date.UTC(2026, 9, 28, 16, 48, 0);

test("I25-C46 evidência comum: o formatter legado mostra, da linha da pré-carga, as concluídas, o pendente com o lugar e a idade, o processo com a saída depois da 1ª operação e o laço", () => {
  // Abertura (1ª tomada) e a 2ª tomada parada na criação do temporário do segmento.
  const line = {
    ops: [
      ["realpath", "pasta", 50, 1.5],
      ["open", "lock", 52, 1],
      ["writeFile", "lock", 53.5, 0.5],
      ["close", "lock", 54, 0.5],
      ["unlink", "lock", 60, 1],
      ["open", "lock", 62, 1],
      ["writeFile", "lock", 63, 0.5],
      ["close", "lock", 64, 0.5],
    ],
    cpuMs: 30,
    pending: [["open", "segmento.tmp", 65, 635]],
    exitMs: 700,
    startedAt: STARTED_AT,
    pid: 4242,
    loop: { samples: 40, maxMs: 12.5, p99Ms: 11.1 },
  };
  assert.equal(
    describeTiming(deliveryTiming(line)),
    "15 ms do início da 1ª ao fim da última operação de disco concluída; 8 operações concluídas; flush nenhum; por operação open 2, realpath 2, writeFile 1, close 1 ms; " +
      "mais lenta concluída realpath pasta 2 ms; falhas nenhuma; CPU do processo 30 ms; pendentes na saída: open segmento.tmp (sob o lock, 2ª tomada) há 635 ms; " +
      "processo: iniciado 2026-10-28T16:48:00.000Z, 1ª operação aos 50 ms, última conclusão aos 64.5 ms, saída aos 700 ms (650 ms depois da 1ª operação); " +
      "laço de eventos: atraso máximo 12.5 ms, p99 11.1 ms (40 amostras)",
  );
  // A operação em curso não entra nas concluídas nem na mais lenta.
  assert.deepEqual([deliveryTiming(line).operations, deliveryTiming(line).pending], [8, [{ name: "open segmento.tmp (sob o lock, 2ª tomada)", startMs: 65, ageMs: 635 }]]);
});

test("I25-C46 evidência comum: sem dado o formatter diz que não há — nenhuma operação concluída, laço sem amostra, linha sem os campos — e nunca põe 0 no lugar", () => {
  const empty = { ops: [], cpuMs: 3, pending: [], exitMs: 5, startedAt: STARTED_AT, pid: 1, loop: { samples: 0, maxMs: null, p99Ms: null } };
  assert.equal(deliveryTiming(empty).ms, null);
  assert.equal(
    describeTiming(deliveryTiming(empty)),
    "nenhuma operação de disco concluída; flush nenhum; mais lenta concluída nenhuma; falhas nenhuma; CPU do processo 3 ms; pendentes na saída: nenhuma; " +
      "processo: iniciado 2026-10-28T16:48:00.000Z, 1ª operação aos ? ms, última conclusão aos ? ms, saída aos 5 ms; laço de eventos: sem amostras",
  );
  // Linha sem os campos da pré-carga de `51679df`: não registrados, não zero.
  const old = { ops: [["stat", "pasta", 1, 2]], cpuMs: 4 };
  assert.equal(
    describeTiming(deliveryTiming(old)),
    "2 ms do início da 1ª ao fim da última operação de disco concluída; 1 operações concluídas; flush nenhum; por operação stat 2 ms; mais lenta concluída stat pasta 2 ms; " +
      "falhas nenhuma; CPU do processo 4 ms; pendentes na saída: não registradas; processo: não registrado; laço de eventos: não registrado",
  );
  // Um objeto montado sem `process` (fora de deliveryTiming) sai só com as concluídas.
  const { process: _, pending: __, loop: ___, ...bare } = deliveryTiming(old);
  assert.equal(describeTiming(bare), "2 ms do início da 1ª ao fim da última operação de disco concluída; 1 operações concluídas; flush nenhum; por operação stat 2 ms; mais lenta concluída stat pasta 2 ms; falhas nenhuma; CPU do processo 4 ms");
});

test("I25-C46 evidência comum: o erro do corpo sai o mesmo objeto, com os valores da asserção e a evidência na mensagem e no stack; inspeção que falha fica indisponível; valor que não é Error e erro congelado saem iguais; corpo que passa não calcula nada", async () => {
  let original;
  try {
    assert.deepEqual({ code: "delivery_timeout" }, { code: null });
  } catch (error) {
    original = error;
  }
  const before = [original.message, original.actual, original.expected, original.operator, original.generatedMessage, original.code];
  const thrown = await rejection(recordingProducers(async () => {
    throw original;
  }));
  assert.equal(thrown, original, "o mesmo objeto");
  assert.deepEqual([thrown.actual, thrown.expected, thrown.operator, thrown.generatedMessage, thrown.code], before.slice(1));
  assert.equal(thrown.message, `${before[0]}\nevidência dos produtores deste teste: nenhum produtor registrado`);
  assert.ok(thrown.stack.includes(thrown.message), "o stack traz a mensagem com a evidência");

  const value = "texto lançado";
  assert.equal(await rejection(recordingProducers(async () => {
    throw value;
  })), value);
  const frozen = Object.freeze(new Error("congelado"));
  const unchanged = await rejection(recordingProducers(async () => {
    throw frozen;
  }));
  assert.deepEqual([unchanged === frozen, unchanged.message], [true, "congelado"]);

  const root = scratch("i25 c46 evidência raiz");
  let reports = 0;
  const passed = await recordingProducers(async () => {
    inProcessProducer("sem falha", root, () => ({ report: () => ((reports += 1), null) }));
    return 42;
  });
  assert.deepEqual([passed, reports], [42, 0], "corpo que passa: nenhum relatório lido, nenhuma evidência");

  const failing = await rejection(recordingProducers(async () => {
    inProcessProducer("relatório que falha", root, () => ({
      report: () => {
        reports += 1;
        throw new TypeError(`mensagem com caminho ${root}`);
      },
    }));
    throw new Error("falhou");
  }));
  assert.equal(reports, 1);
  assert.ok(failing.message.startsWith("falhou\nevidência dos produtores deste teste (1):\nprodutor 1 relatório que falha (em processo): entrega indisponível [TypeError]\n"), failing.message);
  assert.ok(!failing.message.includes(root), "a mensagem da falha da inspeção não entra");
});

test("I25-C46 evidência comum: fora de um registro os apoios usam o mesmo ambiente; num registro acrescentam a pré-carga só a quem não a tem, e o ambiente herdado fica como está", async () => {
  const env = baseEnv({ SKILLME_TEST_VALUE: "1" });
  assert.equal(recordedProducer("hook claude", env).env, env);
  await recordingProducers(async () => {
    const own = recordedProducer("hook claude", env).env;
    assert.equal(own.NODE_OPTIONS, `--import=${TRACES_PROBE}`);
    assert.equal(path.basename(own.SKILL_ME_TEST_TRACES_TIMING), "1.ndjson");
    const { NODE_OPTIONS, SKILL_ME_TEST_TRACES_TIMING, ...rest } = own;
    assert.deepEqual(rest, env, "nada mais muda");
    assert.equal(recordedProducer("hook claude", { ...env, NODE_OPTIONS: "--max-old-space-size=64" }).env.NODE_OPTIONS, `--max-old-space-size=64 --import=${TRACES_PROBE}`);
    const timed = { ...env, SKILL_ME_TEST_TRACES_TIMING: "arquivo do teste" };
    assert.equal(recordedProducer("hook claude", timed).env, timed, "a pré-carga do teste fica");
    assert.equal(recordedProducer("hook claude", undefined).env, undefined, "o ambiente herdado não é tocado");
  });
  assert.equal(recordedProducer("hook claude", env).env, env, "o registro termina com o corpo");
});

test("I25-C47 evidência comum: a raiz da rota automática vem só de um home de prova no temporário, e um home fora dele não é lido", async () => {
  const home = scratch("i25 c47 home");
  const root = scratch("i25 c47 raiz");
  mkdirSync(path.join(home, ".skill-me"));
  writeFileSync(path.join(home, ".skill-me", "observe.json"), JSON.stringify({ skillMeObserveConfig: 1, root, rootReal: root }));
  const homeEnv = { HOME: home, USERPROFILE: home };
  assert.deepEqual(rootOf(homeEnv), { root });
  // Precedência do produto: o par da execução, depois o manual, depois o on.
  assert.deepEqual(rootOf({ ...homeEnv, SKILL_ME_CAPTURE_ROOT: "manual" }), { root: "manual" });
  assert.deepEqual(rootOf({ ...homeEnv, SKILL_ME_CAPTURE_ROOT: "manual", SKILL_ME_LAUNCH_ROOT: "execução" }), { root: "execução" });
  // Fora do temporário o caminho decide sem ler: a pasta do repositório existe e
  // não tem `.skill-me`; uma leitura daria ENOENT.
  assert.deepEqual(rootOf({ HOME: REPO_ROOT, USERPROFILE: REPO_ROOT }), { unavailable: "home fora do temporário" });
  assert.deepEqual(rootOf(baseEnv()), { unavailable: "home fora do temporário" });
  const tmp = realpathSync.native(tmpdir());
  assert.deepEqual([isTestHome(home, tmp), isTestHome(path.join(tmp, "outra pasta"), tmp), isTestHome(tmp, tmp), isTestHome(home, root)], [true, false, false, false]);
  assert.deepEqual(rootOf(undefined), { unavailable: "ambiente herdado" });
  assert.deepEqual(rootOf({ PATH: "x" }), { unavailable: "sem raiz no ambiente" });
  const empty = scratch("i25 c47 home sem configuração");
  assert.deepEqual(rootOf({ HOME: empty, USERPROFILE: empty }), { unavailable: "ENOENT" });
  writeFileSync(path.join(home, ".skill-me", "observe.json"), "{quebrado");
  assert.deepEqual(rootOf(homeEnv), { unavailable: "config_invalid" });

  // Pelo apoio real: um hook com o home de fixture fora do temporário.
  const failure = await rejection(recordingProducers(async () => {
    assert.equal((await runHook("claude", claudePayload("pre_tool_bash"), { env: baseEnv() })).status, 0);
    throw new Error("falhou");
  }));
  assert.ok(failure.message.startsWith("falhou\nevidência dos produtores deste teste (1):\nprodutor 1 hook claude: status 0, sinal nenhum; entrega "), failure.message);
  assert.ok(failure.message.endsWith("\nprodutor 1: raiz indisponível [home fora do temporário]"), failure.message);
  for (const value of [REPO_ROOT, home, root, process.env.PATH].filter(Boolean)) assert.ok(!failure.message.includes(value), "sem caminho nem ambiente");
  assert.deepEqual(leaks(failure.message), []);
});

test("I25-C47 evidência comum: o io medido do produtor em processo traz as concluídas, a falha, a em curso no instantâneo, o processo e o laço da prova; sem operação, diz que não há", async () => {
  const root = scratch("i25 c47 io medido");
  const store = path.join(root, "skill-me-privacy");
  const base = {
    lstat: async () => ({ isDirectory: () => true }),
    unlink: async () => {
      throw Object.assign(new Error(`EIO em ${store}`), { code: "EIO" });
    },
    writeExclusive: () => new Promise(() => {}),
  };
  const failure = await rejection(recordingProducers(async () => {
    inProcessProducer("produtor de prova", root, (io) => {
      io.lstat(path.join(store, "captures"));
      io.unlink(path.join(store, ".lock")).catch(() => {});
      io.writeExclusive(path.join(store, "captures", "c", "events-000001.ndjson.0a1b2c3d.skill-me-tmp"), "");
      return { report: () => ({ automatic: true, code: "delivery_timeout" }) };
    }, { base });
    await new Promise((resolve) => setTimeout(resolve, 60));
    throw new Error("falhou");
  }));
  const text = failure.message;
  assert.ok(text.startsWith('falhou\nevidência dos produtores deste teste (1):\nprodutor 1 produtor de prova (em processo): entrega {"automatic":true,"code":"delivery_timeout"}\n'), text);
  for (const piece of [
    "2 operações concluídas",
    "falhas unlink lock EIO (tomada do lock)",
    "CPU do processo da prova desde a criação do produtor ",
    "pendentes no instantâneo: writeExclusive segmento.tmp (fora do lock) há ",
    "processo: o da prova (produtor em processo), 1ª operação aos ",
    "laço de eventos do processo da prova desde a criação do produtor: ",
  ]) {
    assert.ok(text.includes(piece), `${piece}: ${text}`);
  }
  assert.ok(!text.includes(root) && !text.includes(store), "sem caminho");

  const idle = await rejection(recordingProducers(async () => {
    inProcessProducer("produtor parado", root, () => ({ report: () => null }), { base });
    throw new Error("falhou");
  }));
  for (const piece of ["produtor 1 produtor parado (em processo): entrega sem relatório", "nenhuma operação de disco concluída", "pendentes no instantâneo: nenhuma", "1ª operação aos ? ms, última conclusão aos ? ms, instantâneo aos "]) {
    assert.ok(idle.message.includes(piece), `${piece}: ${idle.message}`);
  }
});
