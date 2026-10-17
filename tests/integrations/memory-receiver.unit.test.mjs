import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildEnvelope } from "../../src/integrations/boundary.mjs";
import { createMemoryReceiver } from "../../src/integrations/memory-receiver.mjs";

function validEnvelope(index) {
  const result = buildEnvelope({
    source: { agent: "codex", mechanism: "exec_jsonl", contract: "codex-exec-jsonl@rust-v0.162.1" },
    signal: "supervised_exec",
    eventKind: "item",
    nativeEvent: "item.completed",
    ids: { itemId: `item_${index}` },
    fields: { phase: "completed", itemType: "agent_message" },
  });
  assert.equal(result.ok, true);
  return result.envelope;
}

test("I4-C43 receptor limitado conta perdas e malformados sem lançar nem persistir", () => {
  const receiver = createMemoryReceiver({ capacity: 500 });
  for (let i = 0; i < 500; i++) assert.equal(receiver.receive(validEnvelope(i)), "accepted");
  // O 501º é descartado e os 500 aceitos continuam intactos (descarta o novo).
  assert.equal(receiver.receive(validEnvelope(500)), "dropped");
  let snap = receiver.snapshot();
  assert.equal(snap.events.length, 500);
  assert.equal(snap.events[0].ids.itemId, "item_0");
  assert.equal(snap.events[499].ids.itemId, "item_499");
  assert.deepEqual(snap.counters, { accepted: 500, dropped: 1, malformed: 0 });

  // Fora do schema → malformed, inclusive objetos que lançam ao serem lidos.
  const hostile = new Proxy({}, { get() { throw new Error("SKILLME-CANARY-error"); }, ownKeys() { throw new Error("x"); } });
  const extraKey = { ...validEnvelope(1), raw: "SKILLME-CANARY-result" };
  const wrongVersion = { ...validEnvelope(2), schemaVersion: 2 };
  const inferred = { ...validEnvelope(3), signal: "inferred" };
  const badField = { ...validEnvelope(4), fields: { phase: "completed", itemType: "reasoning" } };
  const small = createMemoryReceiver({ capacity: 2 });
  for (const bad of [null, undefined, 42, "x", [], hostile, extraKey, wrongVersion, inferred, badField])
    assert.equal(small.receive(bad), "malformed");
  assert.deepEqual(small.snapshot().counters, { accepted: 0, dropped: 0, malformed: 10 });

  // Snapshot imutável e desacoplado do envelope recebido.
  const original = validEnvelope(7);
  small.receive(original);
  original.ids.itemId = "mutated";
  snap = small.snapshot();
  assert.equal(snap.events[0].ids.itemId, "item_7");
  assert.throws(() => {
    snap.events[0].ids.itemId = "changed";
  }, TypeError);
  assert.throws(() => snap.events.push({}), TypeError);

  // Depois de close(), toda chegada é descartada.
  small.close();
  assert.equal(small.receive(validEnvelope(8)), "dropped");
  assert.deepEqual(small.snapshot().counters, { accepted: 1, dropped: 1, malformed: 10 });

  // Sem persistência: o módulo não importa sistema de arquivos, rede nem processos.
  const source = readFileSync(
    path.resolve(import.meta.dirname, "../../src/integrations/memory-receiver.mjs"),
    "utf8",
  );
  for (const forbidden of ["node:fs", "node:net", "node:child_process", "node:http", "node:dgram", "node:worker_threads"])
    assert.ok(!source.includes(forbidden), forbidden);
});
