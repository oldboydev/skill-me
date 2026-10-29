import assert from "node:assert/strict";
import { mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { REPO_ROOT, baseEnv, makeScratch } from "../helpers/cli.mjs";
import { claudePayload, leaks } from "../helpers/privacy-canaries.mjs";
import { isTestHome, recordedProducer, rootOf } from "../helpers/producer-runs.mjs";
import { TRACES_PROBE, deliveryTiming, describeProducerTrace, describeTiming, inProcessProducer, producerTrace, recordingProducers, runHook } from "../helpers/traces.mjs";

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

// I25-C46 (u) (liberação segura do lock): o rename do `.lock` é a liberação; um
// rename com erro não prova que o lock saiu, então as operações seguintes ficam
// com a posse indeterminada até a tomada seguinte. As linhas legadas com
// `unlink lock` (acima) continuam como antes.
test("I25-C46 evidência comum: liberação por rename — concluído encerra a posse e a limpeza sai fora do lock; com erro ou pendente, as seguintes ficam com a posse indeterminada até a próxima tomada", () => {
  const dir = scratch("i25 c46 evidência liberação");
  const taken = [["open", "lock", 1, 1], ["writeFile", "lock", 2, 1], ["close", "lock", 3, 1], ["rename", "state.json.tmp", 4, 1]];
  const line = (ops, pending = []) => ({ ops, cpuMs: 1, pending, exitMs: 100, startedAt: STARTED_AT, pid: 4242, loop: { samples: 0, maxMs: null, p99Ms: null } });
  const traceOf = (name, value, options) => {
    const file = path.join(dir, `${name}.ndjson`);
    writeFileSync(file, `${JSON.stringify(value)}\n`);
    return producerTrace(file, options);
  };

  const released = traceOf("concluido", line([...taken, ["mkdtemp", "lock.reserva", 5, 1], ["lstat", "lock.reserva", 6, 1], ["rename", "lock", 7, 1], ["lstat", "lock.reserva", 8, 1], ["unlink", "lock.retirado", 9, 1], ["lstat", "lock.reserva", 10, 1], ["rmdir", "lock.reserva", 11, 1]], [["open", "segmento.tmp", 12, 50]]));
  assert.deepEqual([released.failures, released.last, released.pending.map((p) => p.name)], [[], "rmdir lock.reserva (fora do lock)", ["open segmento.tmp (fora do lock)"]]);

  const cleanup = [["lstat", "lock.reserva", 8, 1], ["lstat", "lock.retirado", 9, 1, "ENOENT"], ["lstat", "lock.reserva", 10, 1], ["rmdir", "lock.reserva", 11, 1]];
  const unsure = traceOf("erro", line([...taken, ["mkdtemp", "lock.reserva", 5, 1], ["lstat", "lock.reserva", 6, 1], ["rename", "lock", 7, 1, "EIO"], ...cleanup], [["open", "segmento.tmp", 12, 50]]));
  assert.deepEqual(unsure.failures, ["rename lock EIO (sob o lock, 1ª tomada, depois do commit)", "lstat lock.retirado ENOENT (posse do lock indeterminada)"]);
  assert.deepEqual([unsure.last, unsure.pending.map((p) => p.name)], ["rmdir lock.reserva (posse do lock indeterminada)", ["open segmento.tmp (posse do lock indeterminada)"]]);
  assert.ok(describeProducerTrace(unsure).includes("última concluída: rmdir lock.reserva (posse do lock indeterminada)"), describeProducerTrace(unsure));

  const neutral = traceOf("neutro", line([...taken, ["rename", "lock", 5, 1, "EIO"], ["rmdir", "lock.reserva", 6, 1]]), { commits: false });
  assert.deepEqual([neutral.failures, neutral.last], [["rename lock EIO (sob o lock, 1ª tomada)"], "rmdir lock.reserva (posse do lock indeterminada)"]);

  const retaken = traceOf("nova tomada", line([...taken, ["rename", "lock", 5, 1, "EIO"], ["open", "lock", 6, 1, "EEXIST"], ["open", "lock", 8, 1], ["writeFile", "lock", 9, 1]], [["open", "segmento.tmp", 11, 50]]));
  assert.deepEqual([retaken.contention, retaken.pending.map((p) => p.name)], [1, ["open segmento.tmp (sob o lock, 2ª tomada)"]]);

  const pendingRename = deliveryTiming(line(taken, [["rename", "lock", 5, 40], ["lstat", "lock.reserva", 6, 39]]));
  assert.deepEqual(pendingRename.pending.map((p) => p.name), ["rename lock (sob o lock, 1ª tomada)", "lstat lock.reserva (posse do lock indeterminada)"]);
});

// I25-C46 (m)–(n) (gate B em c0d61d7: o T8-C4 saiu com um lock ilegível e a
// evidência mostrou só a linha do wrapper, de 3): linhas sintéticas no arquivo
// da pré-carga, na ordem de saída dos processos.
const treeLine = (pid, pending = []) => ({ ops: [["realpath", "pasta", 1, 1]], cpuMs: 1, pending, exitMs: 10, startedAt: STARTED_AT, pid, loop: { samples: 0, maxMs: null, p99Ms: null } });

function storeWithLock(label, lock) {
  const root = scratch(label);
  mkdirSync(path.join(root, "skill-me-privacy"));
  writeFileSync(path.join(root, "skill-me-privacy", ".lock"), lock);
  return root;
}

test("I25-C46 evidência comum: com o arquivo do registro, os 3 processos da árvore do produtor aparecem e o pid do lock aponta o processo; com o arquivo do teste, só a linha da saída do produtor", async () => {
  const root = storeWithLock("i25 c46 árvore raiz", JSON.stringify({ lockVersion: 1, pid: 3003, nonce: "0011223344556677" }));
  const bound = { SKILL_ME_CAPTURE_ROOT: root, SKILL_ME_CAPTURE_ID: "0".repeat(32) };
  const shared = path.join(scratch("i25 c46 árvore tempos"), "compartilhado.ndjson");
  const failure = await rejection(recordingProducers(async () => {
    const wrapper = recordedProducer("wrapper codex", baseEnv(bound));
    // O hook filho sai primeiro, parado na criação do lock; depois o Codex falso e o wrapper.
    writeFileSync(wrapper.env.SKILL_ME_TEST_TRACES_TIMING, [treeLine(3003, [["open", "lock", 5, 640]]), treeLine(2002), treeLine(1001)].map((l) => JSON.stringify(l) + "\n").join(""));
    wrapper.settle({ status: 17, signal: null, report: { delivery: { bound: true, code: "lock_present" } } });
    writeFileSync(shared, [treeLine(4004), treeLine(5005)].map((l) => JSON.stringify(l) + "\n").join(""));
    const hook = recordedProducer("hook claude", baseEnv({ ...bound, SKILL_ME_TEST_TRACES_TIMING: shared }));
    hook.settle({ status: 0, signal: null, report: null });
    throw new Error("falhou");
  }));
  const lines = failure.message.split("\n");
  assert.deepEqual(
    lines.filter((line) => /^ {2}(processo \d de \d|tempos):/.test(line)).map((line) => line.slice(0, line.indexOf(":") + 1)),
    ["  processo 1 de 3:", "  processo 2 de 3:", "  processo 3 de 3:", "  tempos:"],
    failure.message,
  );
  assert.ok(lines.find((line) => line.startsWith("  processo 1 de 3:")).includes("pendentes na saída: open lock (tomada do lock) há 640 ms"), failure.message);
  assert.ok(!lines.some((line) => /^ {2}processo \d de 3:.*linhas da pré-carga/.test(line)), "cada processo da árvore é uma linha, não uma contagem");
  // O arquivo do teste continua contado na linha da saída do produtor.
  assert.ok(lines.find((line) => line.startsWith("  tempos:")).includes("; 2 linhas da pré-carga"), failure.message);
  assert.ok(failure.message.includes("raiz 1 (produtores 1, 2): lock presente, de produtor 1 wrapper codex, processo 1 de 3;"), failure.message);
  assert.ok(!failure.message.includes(root) && !failure.message.includes("0011223344556677"), "sem caminho nem nonce");
});

// O C46 (m) como escrito (F1 da verificação 19): o pendente e o pid do lock na
// 3ª linha. Com eles só na 1ª, como acima, uma montagem que desse sempre o
// processo 1 ao dono do lock passaria; por isso os esperados são literais.
test("I25-C46 evidência comum: com o pendente e o pid do lock na 3ª das 3 linhas do arquivo do registro, o lock aponta o processo 3 de 3 e só ele tem o pendente; com o arquivo do teste, só a linha da saída do produtor", async () => {
  const root = storeWithLock("i25 c46 árvore 3ª raiz", JSON.stringify({ lockVersion: 1, pid: 3003, nonce: "8899aabbccddeeff" }));
  const bound = { SKILL_ME_CAPTURE_ROOT: root, SKILL_ME_CAPTURE_ID: "0".repeat(32) };
  const shared = path.join(scratch("i25 c46 árvore 3ª tempos"), "compartilhado.ndjson");
  let own;
  const failure = await rejection(recordingProducers(async () => {
    const wrapper = recordedProducer("wrapper codex", baseEnv(bound));
    own = wrapper.env.SKILL_ME_TEST_TRACES_TIMING;
    // O processo parado na criação do lock é o último a sair.
    writeFileSync(own, [treeLine(1001), treeLine(2002), treeLine(3003, [["open", "lock", 5, 640]])].map((l) => JSON.stringify(l) + "\n").join(""));
    wrapper.settle({ status: 17, signal: null, report: { delivery: { bound: true, code: "lock_present" } } });
    writeFileSync(shared, [treeLine(4004), treeLine(5005)].map((l) => JSON.stringify(l) + "\n").join(""));
    const hook = recordedProducer("hook claude", baseEnv({ ...bound, SKILL_ME_TEST_TRACES_TIMING: shared }));
    hook.settle({ status: 0, signal: null, report: null });
    throw new Error("falhou");
  }));
  const lines = failure.message.split("\n");
  assert.deepEqual(
    lines.filter((line) => /^ {2}(processo \d de \d|tempos):/.test(line)).map((line) => line.slice(0, line.indexOf(":") + 1)),
    ["  processo 1 de 3:", "  processo 2 de 3:", "  processo 3 de 3:", "  tempos:"],
    failure.message,
  );
  const [first, second, third] = ["  processo 1 de 3:", "  processo 2 de 3:", "  processo 3 de 3:"].map((header) => lines.find((line) => line.startsWith(header)));
  assert.ok(third.includes("pendentes na saída: open lock (tomada do lock) há 640 ms"), failure.message);
  for (const line of [first, second]) assert.ok(line.includes("pendentes na saída: nenhuma"), failure.message);
  assert.ok(!lines.some((line) => /^ {2}processo \d de 3:.*linhas da pré-carga/.test(line)), "cada processo da árvore é uma linha, não uma contagem");
  assert.ok(lines.find((line) => line.startsWith("  tempos:")).includes("; 2 linhas da pré-carga"), failure.message);
  assert.ok(failure.message.includes("raiz 1 (produtores 1, 2): lock presente, de produtor 1 wrapper codex, processo 3 de 3;"), failure.message);
  for (const value of [root, shared, own, "8899aabbccddeeff"]) assert.ok(!failure.message.includes(value), "sem caminho nem nonce");
});

test("I25-C46 evidência comum: um lock que não se lê como o JSON de um produtor sai com o código e o tamanho, sem o conteúdo", async () => {
  for (const [label, lock, expected] of [
    ["vazio", "", "lock presente, ilegível [SyntaxError; 0 bytes]"],
    ["sem pid", '{"lockVersion":1}', "lock presente, ilegível [sem pid; 17 bytes]"],
    ["texto", "lock alheio\n", "lock presente, ilegível [SyntaxError; 12 bytes]"],
  ]) {
    const root = storeWithLock(`i25 c46 lock ${label}`, lock);
    const failure = await rejection(recordingProducers(async () => {
      recordedProducer("hook claude", baseEnv({ SKILL_ME_CAPTURE_ROOT: root, SKILL_ME_CAPTURE_ID: "0".repeat(32) })).settle({ status: 0, signal: null, report: null });
      throw new Error("falhou");
    }));
    assert.ok(failure.message.includes(`raiz 1 (produtores 1): ${expected};`), `${label}: ${failure.message}`);
    if (lock.trim() !== "") assert.ok(!failure.message.includes(lock.trim()), `${label}: sem o conteúdo do lock`);
  }
});
