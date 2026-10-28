import assert from "node:assert/strict";
import { test } from "node:test";
import { StoreError } from "../../../src/integrations/privacy/store.mjs";
import { untilDeadline } from "../../../src/integrations/traces/delivery.mjs";

// Decisão do prazo de uma entrega (issue #25, refinamento do C46 (o); linha
// "Abandono terminal no prazo da entrega" do Landing): só a recusa concluída do
// lock é repetida até o prazo; a tentativa abandonada no prazo é a última; o
// lock obtido com o prazo esgotado não autoriza gravar. O relógio é o injetado
// e o timer é o real: um relógio que ainda não chegou ao prazo quando o timer
// dispara é o caso do T8-C16 no gate B final (`4 !== 3` criações do lock).

const DEADLINE = 30;

// Cada chamada da operação recebe o `onLock` da tentativa e roda o passo
// seguinte do roteiro com o relógio manual.
function scripted(steps) {
  const clock = { now: 0 };
  const calls = [];
  const operation = (onLock) => {
    calls.push(onLock);
    const step = steps[calls.length - 1];
    if (step === undefined) throw new Error(`chamada ${calls.length} fora do roteiro`);
    return step(onLock, clock);
  };
  return { calls, run: () => untilDeadline(operation, DEADLINE, () => clock.now) };
}

const refused = async () => {
  throw new StoreError("lock_present");
};
const failed = async () => {
  throw new StoreError("io_failure");
};
const pending = () => new Promise(() => {});
// Como no store: `onLock` é chamado quando o lock passa a ser da operação, com
// o relógio em `at`; se ele lança, a operação desiste sem mutação e o store a
// devolve como io_failure (storeOp).
const lockAt = (at, then = async () => "gravado") => async (onLock, clock) => {
  await null;
  clock.now = at;
  try {
    onLock();
  } catch {
    throw new StoreError("io_failure");
  }
  return then();
};

test("I25-C46 prazo da entrega: sucesso, recusa concluída repetida até obter o lock e falha de E/S sem nova tentativa", async () => {
  const success = scripted([lockAt(0)]);
  assert.deepEqual(await success.run(), { ok: true, value: "gravado" });
  assert.equal(success.calls.length, 1);

  const retried = scripted([refused, lockAt(0)]);
  assert.deepEqual(await retried.run(), { ok: true, value: "gravado" }, "a recusa concluída é repetida");
  assert.equal(retried.calls.length, 2);

  const io = scripted([failed]);
  assert.deepEqual(await io.run(), { ok: false, code: "io_failure" });
  assert.equal(io.calls.length, 1, "nenhuma outra falha é repetida");
});

test("I25-C46 prazo da entrega: abandonada pelo timer sai delivery_timeout sem o lock e sem recusa anterior, ou com o lock obtido antes do prazo; o lock tardio não autoriza gravar", async () => {
  const unlocked = scripted([pending]);
  assert.deepEqual(await unlocked.run(), { ok: false, code: "delivery_timeout" });
  assert.equal(unlocked.calls.length, 1);
  assert.throws(() => unlocked.calls[0](), "o lock obtido depois do abandono não autoriza gravar");

  // Com o lock obtido antes do prazo, o commit pode terminar depois: confirmação incerta.
  const locked = scripted([lockAt(0, pending)]);
  assert.deepEqual(await locked.run(), { ok: false, code: "delivery_timeout" });
  assert.equal(locked.calls.length, 1);

  const relocked = scripted([refused, lockAt(0, pending)]);
  assert.deepEqual(await relocked.run(), { ok: false, code: "delivery_timeout" }, "a repetição com o lock também é incerta");
  assert.equal(relocked.calls.length, 2);
});

test("I25-C46 prazo da entrega: depois de uma recusa, a tentativa abandonada pelo timer com o relógio ainda aquém do prazo é a última e sai lock_present", async () => {
  const run = scripted([
    refused,
    (onLock, clock) => {
      clock.now = DEADLINE - 0.5;
      return pending();
    },
    // Só com o defeito: a 3ª chamada leva o relógio ao prazo, para o laço terminar.
    (onLock, clock) => {
      clock.now = DEADLINE;
      return pending();
    },
  ]);
  assert.deepEqual(await run.run(), { ok: false, code: "lock_present" });
  assert.equal(run.calls.length, 2, "nenhuma tentativa nova com a abandonada pendente");
  assert.throws(() => run.calls[1](), "o lock que a abandonada obtiver depois não autoriza gravar");
});

test("I25-C46 prazo da entrega: lock obtido com o relógio no prazo ou depois, antes de o timer rodar, não grava e sai com o motivo do prazo, nunca io_failure", async () => {
  for (const at of [DEADLINE, DEADLINE + 1]) {
    const fresh = scripted([lockAt(at)]);
    assert.deepEqual(await fresh.run(), { ok: false, code: "delivery_timeout" }, `sem recusa, relógio ${at}`);
    assert.equal(fresh.calls.length, 1);

    const contended = scripted([refused, lockAt(at)]);
    assert.deepEqual(await contended.run(), { ok: false, code: "lock_present" }, `depois de uma recusa, relógio ${at}`);
    assert.equal(contended.calls.length, 2);
  }
});

test("I25-C46 prazo da entrega: lock obtido com o relógio ainda aquém do prazo grava", async () => {
  const run = scripted([lockAt(DEADLINE - 0.001)]);
  assert.deepEqual(await run.run(), { ok: true, value: "gravado" });
  assert.equal(run.calls.length, 1);
});
