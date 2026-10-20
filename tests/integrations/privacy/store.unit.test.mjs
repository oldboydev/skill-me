import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { runPrivacyCommand } from "../../../src/integrations/privacy/command.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { PRIVACY_LIMITS } from "../../../src/integrations/privacy/lifecycle.mjs";
import { appendRecords, readCaptureSnapshot, StoreError } from "../../../src/integrations/privacy/store.mjs";
import { makeScratch } from "../helpers/cli.mjs";
import { appendSanitized, recordLineBytes, sanitizedRecord, startIn } from "../helpers/privacy-store.mjs";
import { snapshotTree } from "../helpers/tree.mjs";

// Camada de armazenamento com registros JÁ sanitizados (helpers/privacy-store):
// provam admissão, contadores, atomismo e barreira de estado do storage. Os
// checks de CLI correspondentes (C30, C42, C48, C52b, C53) dependem de
// `privacy ingest` e ficam pendentes até o lote da política.

const captureDir = (root, id) => path.join(root, "skill-me-privacy", "captures", id);
const readState = (root, id) => JSON.parse(readFileSync(path.join(captureDir(root, id), "state.json"), "utf8"));
const command = (argv) => runPrivacyCommand({ argv });

async function rejects(promise, code) {
  await assert.rejects(promise, (error) => error instanceof StoreError && error.code === code);
}

test("T7-C8 snapshot do store lê registros sem solicitar escrita", async () => {
  const root = makeScratch("t7 c8 snapshot");
  const id = await startIn(root);
  const before = snapshotTree(root);
  let writes = 0;
  const io = { ...createStoreIo(), writeExclusive: async () => { writes += 1; throw new Error("write refused"); } };
  const snapshot = await readCaptureSnapshot({ root, id, io });
  assert.equal(snapshot.capture.id, id);
  assert.deepEqual(snapshot.records, []);
  assert.equal(writes, 0);
  assert.deepEqual(snapshotTree(root), before);
});

test("T7-C8 snapshot do store recusa estado alterado durante a leitura", async () => {
  const root = makeScratch("t7 c8 concurrent");
  const id = await startIn(root);
  const stateFile = path.join(captureDir(root, id), "state.json");
  const base = createStoreIo();
  let changed = false;
  const io = {
    ...base,
    async readBounded(file, maxBytes) {
      const bytes = await base.readBounded(file, maxBytes);
      if (file === stateFile && !changed) {
        changed = true;
        const state = JSON.parse(bytes.toString("utf8"));
        state.counters.malformed += 1;
        writeFileSync(stateFile, JSON.stringify(state));
      }
      return bytes;
    },
    writeExclusive: async () => { throw new Error("snapshot attempted write"); },
  };
  await rejects(readCaptureSnapshot({ root, id, io }), "lock_present");
  assert.equal(changed, true);
});

test("I5-C42s captura stopped ou disabled recusa novos registros sem mudar a árvore", async () => {
  const root = makeScratch("i5 c42s");
  for (const action of ["stop", "disable"]) {
    const id = await startIn(root);
    await appendSanitized(root, id, 1);
    assert.equal((await command([action, "--root", root, "--capture", id])).exitCode, 0);
    const before = snapshotTree(root);
    await rejects(appendSanitized(root, id, 1), "capture_not_active");
    assert.deepEqual(snapshotTree(root), before, action);
  }
});

test("I5-C48s depois de stop/disable/delete um produtor atrasado não grava nem recria a captura", async () => {
  const root = makeScratch("i5 c48s");
  const id = await startIn(root);
  await appendSanitized(root, id, 1);
  assert.equal((await command(["stop", "--root", root, "--capture", id])).exitCode, 0);
  await rejects(appendSanitized(root, id, 1), "capture_not_active");
  assert.equal((await command(["disable", "--root", root, "--capture", id])).exitCode, 0);
  await rejects(appendSanitized(root, id, 1), "capture_not_active");
  assert.equal((await command(["delete", "--root", root, "--capture", id, "--apply"])).exitCode, 0);
  await rejects(appendSanitized(root, id, 1), "capture_not_found");
  assert.ok(!existsSync(captureDir(root, id)), "não recria captures/<id>");
  assert.deepEqual(readdirSync(path.join(root, "skill-me-privacy", "captures")), []);
});

test("I5-C52s storage admite 500 de 510 registros e exatamente 8 MiB", async () => {
  const root = makeScratch("i5 c52s");
  const id = await startIn(root);
  const result = await appendSanitized(root, id, 510);
  assert.deepEqual(result, { admitted: 500, dropped: { capture_event_limit: 10 } });
  const state = readState(root, id);
  assert.deepEqual(state.counters, { accepted: 510, persisted: 500, malformed: 0, dropped: { capture_event_limit: 10 }, contentOmitted: {} });
  const lines = readFileSync(path.join(captureDir(root, id), state.dataFile), "utf8").split("\n");
  assert.equal(lines.pop(), "");
  assert.equal(lines.length, 500);
  assert.equal(state.dataBytes, readFileSync(path.join(captureDir(root, id), state.dataFile)).length);

  // Oito registros de exatamente 1 MiB serializado: 8 388 608 aceitos; o seguinte, não.
  const bytesRoot = makeScratch("i5 c52s bytes");
  const big = await startIn(bytesRoot);
  const base = recordLineBytes(sanitizedRecord(0, ""));
  const mib = sanitizedRecord(0, "x".repeat(1_048_576 - base));
  assert.equal(recordLineBytes(mib), 1_048_576);
  const records = Array.from({ length: 8 }, () => mib);
  assert.deepEqual(await appendRecords({ root: bytesRoot, id: big, batch: { records, malformed: 0, dropped: {}, contentOmitted: {} } }), {
    admitted: 8,
    dropped: {},
  });
  assert.equal(readState(bytesRoot, big).dataBytes, 8_388_608);
  assert.deepEqual(await appendRecords({ root: bytesRoot, id: big, batch: { records: [sanitizedRecord(1)], malformed: 0, dropped: {}, contentOmitted: {} } }), {
    admitted: 0,
    dropped: { capture_byte_limit: 1 },
  });
  const final = readState(bytesRoot, big);
  assert.equal(final.dataBytes, 8_388_608);
  assert.deepEqual(final.counters, { accepted: 9, persisted: 8, malformed: 0, dropped: { capture_byte_limit: 1 }, contentOmitted: {} });
});

test("I5-C53s status traz contadores exatos de um lote misto e accepted >= persisted", async () => {
  const root = makeScratch("i5 c53s");
  const id = await startIn(root);
  await appendSanitized(root, id, 498, { malformed: 2, dropped: { envelope_oversize: 1 }, contentOmitted: { content_disabled: 498 } });
  await appendSanitized(root, id, 4, { malformed: 1, dropped: { envelope_oversize: 2 }, contentOmitted: { content_disabled: 4, unsupported_content: 1 } });
  const status = await command(["status", "--root", root, "--capture", id]);
  assert.equal(status.exitCode, 0);
  assert.deepEqual(status.body.capture.counters, {
    accepted: 502,
    persisted: 500,
    malformed: 3,
    dropped: { envelope_oversize: 3, capture_event_limit: 2 },
    contentOmitted: { content_disabled: 502, unsupported_content: 1 },
  });
  assert.deepEqual(Object.keys(status.body.capture).sort(), [
    "content",
    "counters",
    "createdAt",
    "dataBytes",
    "endedAt",
    "id",
    "limits",
    "retentionDays",
    "state",
  ]);
  assert.ok(status.body.capture.counters.accepted >= status.body.capture.counters.persisted);
});

test("I5-C30s falha de rename na gravação deixa estado e dados anteriores idênticos e nenhum temporário", async () => {
  const root = makeScratch("i5 c30s");
  const id = await startIn(root);
  await appendSanitized(root, id, 2);
  const real = createStoreIo();
  for (const target of [/^events-\d{6}\.ndjson$/, /^state\.json$/]) {
    const before = snapshotTree(root);
    const io = {
      ...real,
      async rename(from, to) {
        if (target.test(path.basename(to))) throw Object.assign(new Error("EIO injetado"), { code: "EIO" });
        return real.rename(from, to);
      },
    };
    await rejects(appendRecords({ root, id, io, batch: { records: [sanitizedRecord(9)], malformed: 0, dropped: {}, contentOmitted: {} } }), "io_failure");
    const after = snapshotTree(root);
    // Arquivos idênticos; o novo arquivo de dados que não chegou ao commit sai.
    assert.deepEqual(after, before, String(target));
    assert.ok(!Object.keys(after).some((name) => name.endsWith(".skill-me-tmp")));
  }
  assert.equal(readState(root, id).counters.persisted, 2);
});

// Abertura instrumentada: soma os bytes realmente lidos de cada arquivo pelo
// handle, para provar que o teto vale na leitura, não depois dela.
function countingIo() {
  const bytesRead = new Map();
  const io = createStoreIo({
    async openFile(file, flags) {
      const { open } = await import("node:fs/promises");
      const handle = await open(file, flags);
      return new Proxy(handle, {
        get(target, property) {
          const value = Reflect.get(target, property, target);
          if (property !== "read") return typeof value === "function" ? value.bind(target) : value;
          return async (...args) => {
            const result = await value.apply(target, args);
            bytesRead.set(path.basename(file), (bytesRead.get(path.basename(file)) ?? 0) + result.bytesRead);
            return result;
          };
        },
      });
    },
  });
  return { io, bytesRead };
}

test("I5-S-bounded controle ou segmento maior que o limite é recusado sem ler o arquivo inteiro", async () => {
  const { truncateSync } = await import("node:fs");
  const MIB = 1024 * 1024;
  const root = makeScratch("i5 bounded");
  const id = await startIn(root);
  await appendSanitized(root, id, 2);
  const dir = captureDir(root, id);
  const { dataFile, dataBytes } = readState(root, id);

  // Segmento de dados maior que o dataBytes registrado: recusa lendo no máximo dataBytes + 1.
  truncateSync(path.join(dir, dataFile), 4 * MIB);
  const data = countingIo();
  await rejects(appendRecords({ root, id, io: data.io, batch: { records: [sanitizedRecord(3)], malformed: 0, dropped: {}, contentOmitted: {} } }), "capture_invalid");
  assert.ok(data.bytesRead.get(dataFile) <= dataBytes + 1, `lidos ${data.bytesRead.get(dataFile)}`);

  // state.json acima de 64 KiB: capture_invalid lendo no máximo 64 KiB + 1.
  truncateSync(path.join(dir, "state.json"), 4 * MIB);
  const state = countingIo();
  const status = await runPrivacyCommand({ argv: ["status", "--root", root, "--capture", id], io: state.io });
  assert.equal(status.exitCode, 3);
  assert.deepEqual(status.body.error, { code: "capture_invalid" });
  assert.ok(state.bytesRead.get("state.json") <= 64 * 1024 + 1, `lidos ${state.bytesRead.get("state.json")}`);

  // Marcador do store acima do seu tamanho: store_invalid lendo no máximo 26 bytes.
  const markerRoot = makeScratch("i5 bounded marker");
  await startIn(markerRoot);
  truncateSync(path.join(markerRoot, "skill-me-privacy", "store.json"), 4 * MIB);
  const marker = countingIo();
  const start = await runPrivacyCommand({ argv: ["start", "--root", markerRoot], io: marker.io });
  assert.equal(start.exitCode, 3);
  assert.deepEqual(start.body.error, { code: "store_invalid" });
  assert.ok(marker.bytesRead.get("store.json") <= '{"skillMePrivacyStore":1}'.length + 1, `lidos ${marker.bytesRead.get("store.json")}`);
});

// Sonda de orçamento: registra cada arquivo aberto e cada teto pedido a
// `readBounded`. Teto acima do limite da captura nunca chega ao leitor real
// (que alocaria `maxBytes + 1`): devolve null, como um arquivo maior faria.
function budgetIo() {
  const opened = [];
  const budgets = [];
  const real = createStoreIo({
    async openFile(file, flags) {
      opened.push(path.basename(file));
      const { open } = await import("node:fs/promises");
      return open(file, flags);
    },
  });
  const io = {
    ...real,
    async readBounded(file, maxBytes) {
      budgets.push([path.basename(file), maxBytes]);
      return maxBytes > PRIVACY_LIMITS.maxBytes ? null : real.readBounded(file, maxBytes);
    },
  };
  return { io, opened, budgets };
}

test("I5-S-databytes state.json com dataBytes acima de 8 MiB é capture_invalid antes de abrir o segmento", async () => {
  const root = makeScratch("i5 databytes");
  const id = await startIn(root);
  await appendSanitized(root, id, 2);
  const dir = captureDir(root, id);
  const original = readState(root, id);
  const withBytes = (dataBytes) => writeFileSync(path.join(dir, "state.json"), JSON.stringify({ ...original, dataBytes }));
  const run = (argv, io) => runPrivacyCommand({ argv: [argv[0], "--root", root, "--capture", id, ...argv.slice(1)], io });

  // Exatamente o limite: estado válido, export lê o segmento com esse teto.
  withBytes(PRIVACY_LIMITS.maxBytes);
  const status = await run(["status"]);
  assert.equal(status.exitCode, 0);
  assert.equal(status.body.capture.dataBytes, 8388608);
  const atLimit = budgetIo();
  // O segmento real tem menos bytes que o declarado: recusa depois de ler.
  assert.deepEqual((await run(["export"], atLimit.io)).body.error, { code: "capture_invalid" });
  assert.ok(atLimit.opened.includes(original.dataFile), "segmento aberto no limite");
  assert.deepEqual(atLimit.budgets.find(([name]) => name === original.dataFile), [original.dataFile, 8388608]);

  for (const dataBytes of [PRIVACY_LIMITS.maxBytes + 1, 1024 * 1024 * 1024]) {
    withBytes(dataBytes);
    const before = snapshotTree(root);
    for (const argv of [["export"], ["status"], ["stop"], ["delete", "--apply"]]) {
      const probe = budgetIo();
      const result = await run(argv, probe.io);
      assert.equal(result.exitCode, 3, `${dataBytes} ${argv[0]}`);
      assert.deepEqual(result.body.error, { code: "capture_invalid" }, `${dataBytes} ${argv[0]}`);
      assert.ok(!probe.opened.includes(original.dataFile), `${dataBytes} ${argv[0]} não abre o segmento`);
      assert.ok(probe.budgets.every(([, max]) => max <= 64 * 1024), `${dataBytes} ${argv[0]} tetos ${JSON.stringify(probe.budgets)}`);
    }
    const append = budgetIo();
    await rejects(appendRecords({ root, id, io: append.io, batch: { records: [sanitizedRecord(3)], malformed: 0, dropped: {}, contentOmitted: {} } }), "capture_invalid");
    assert.ok(!append.opened.includes(original.dataFile), `${dataBytes} append não abre o segmento`);
    assert.deepEqual(snapshotTree(root), before, `${dataBytes} árvore intacta`);
  }

  // Estado restaurado: os demais campos eram válidos. (Os registros manuais de
  // appendSanitized não têm envelope v1, então o controle é o status; o export
  // restaurado é provado no I5-S-databytes-cli com registros do ingest.)
  withBytes(original.dataBytes);
  const restored = await run(["status"]);
  assert.equal(restored.exitCode, 0);
  assert.equal(restored.body.capture.dataBytes, original.dataBytes);
});

test("I5-S-record o storage recusa o que não é registro v1 sem gravar nada", async () => {
  const root = makeScratch("i5 record");
  const id = await startIn(root);
  const before = snapshotTree(root);
  for (const bad of [null, "texto", [], { recordVersion: 2 }, { envelope: {} }]) {
    await assert.rejects(appendRecords({ root, id, batch: { records: [bad], malformed: 0, dropped: {}, contentOmitted: {} } }), TypeError);
  }
  for (const counters of [{ contentOmitted: { "SKILLME-CANARY-x": 1 } }, { dropped: { "Fora Do Padrão": 1 } }, { malformed: -1 }, { dropped: { envelope_oversize: 1.5 } }]) {
    await assert.rejects(appendRecords({ root, id, batch: { records: [], malformed: 0, dropped: {}, contentOmitted: {}, ...counters } }), TypeError);
  }
  assert.deepEqual(snapshotTree(root), before);
});
