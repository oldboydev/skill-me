import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { after, test } from "node:test";
import { claudeHookDraft } from "../../../src/integrations/adapters/claude.mjs";
import { createLaunchDelivery } from "../../../src/integrations/observe/delivery.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { endLaunch, startLaunch } from "../../../src/integrations/privacy/store.mjs";
import { makeScratch } from "../helpers/cli.mjs";
import { HEX32, ofInvocation, pointerFile } from "../helpers/launch.mjs";
import { claudePayload } from "../helpers/privacy-canaries.mjs";
import { runPrivacy } from "../helpers/privacy-store.mjs";
import { captureDir, expectedPseudonym, exportOf, statusOf } from "../helpers/traces.mjs";
import { snapshotTree } from "../helpers/tree.mjs";

// Provas da issue #25 na camada do store e da entrega em processo (C17, C24,
// C27): formatos do Landing de .checks/issue-25-agent-launch.md ("Ponteiro da
// execução aberta", "Captura da execução", "Início da execução", "Sucessão",
// "Ordem e falha do encerramento"), sobre um store real numa raiz temporária.
// A ordem entre produtor e encerramento é controlada pelo io instrumentado.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

const ISO_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const LAUNCHED = (n) => ({ launch: true, code: null, entries: n, committed: n, persisted: n, lost: 0 });

function launchRoot(label) {
  const root = path.join(scratch(label), "raiz ação");
  mkdirSync(root);
  return root;
}

async function deliver(root, invocation, payloads, io) {
  const producer = createLaunchDelivery({ root, invocation, agent: "claude", ...(io ? { io } : {}) });
  for (const payload of payloads) producer.submit(claudeHookDraft(payload), payload);
  await producer.settle();
  return producer;
}

test("I25-C17 formato persistido: a captura launch e o ponteiro saem na forma literal do Landing, e privacy list mostra origin, invocation, segment e launchedAt", async () => {
  const root = launchRoot("i25 c17 forma");
  const opened = await startLaunch({ root, expectedReal: root, nowMs: Date.parse("2026-10-26T10:00:00.000Z") });
  assert.match(opened.invocation, HEX32);
  const pointer = JSON.parse(readFileSync(pointerFile(root, opened.invocation), "utf8"));
  assert.deepEqual(pointer, { launchVersion: 1, invocation: opened.invocation, capture: opened.capture, segment: 1, launchedAt: "2026-10-26T10:00:00.000Z" });
  const state = JSON.parse(readFileSync(path.join(captureDir(root, opened.capture), "state.json"), "utf8"));
  assert.deepEqual(Object.keys(state).sort(), [
    "captureVersion",
    "content",
    "counters",
    "createdAt",
    "dataBytes",
    "dataFile",
    "endedAt",
    "id",
    "invocation",
    "launchedAt",
    "limits",
    "origin",
    "retentionDays",
    "segment",
    "state",
  ]);
  assert.deepEqual(
    { origin: state.origin, invocation: state.invocation, segment: state.segment, launchedAt: state.launchedAt, content: state.content, retentionDays: state.retentionDays, limits: state.limits, state: state.state },
    { origin: "launch", invocation: opened.invocation, segment: 1, launchedAt: "2026-10-26T10:00:00.000Z", content: true, retentionDays: 7, limits: { maxEvents: 500, maxBytes: 8388608 }, state: "active" },
  );
  const listed = runPrivacy(["list", "--root", root]).body.captures;
  assert.equal(listed.length, 1);
  assert.deepEqual([listed[0].origin, listed[0].invocation, listed[0].segment, listed[0].launchedAt], ["launch", opened.invocation, 1, "2026-10-26T10:00:00.000Z"]);
});

test("I25-C17 formato persistido: state.json launch fora da forma é capture_invalid", async () => {
  const root = launchRoot("i25 c17 state");
  const opened = await startLaunch({ root, expectedReal: root });
  const file = path.join(captureDir(root, opened.capture), "state.json");
  const good = JSON.parse(readFileSync(file, "utf8"));
  const variants = {
    "segment 0": { ...good, segment: 0 },
    "segment texto": { ...good, segment: "1" },
    "segment fracionário": { ...good, segment: 1.5 },
    "sem segment": (({ segment, ...rest }) => rest)(good),
    "invocation maiúscula": { ...good, invocation: good.invocation.toUpperCase() },
    "invocation curta": { ...good, invocation: good.invocation.slice(1) },
    "launchedAt sem milissegundos": { ...good, launchedAt: good.launchedAt.replace(/\.\d{3}Z$/, "Z") },
    "sem launchedAt": (({ launchedAt, ...rest }) => rest)(good),
    "chave extra": { ...good, extra: 1 },
    "origin automatic com invocation": { ...good, origin: "automatic" },
  };
  const observed = {};
  for (const [label, value] of Object.entries(variants)) {
    writeFileSync(file, JSON.stringify(value));
    const status = runPrivacy(["status", "--root", root, "--capture", opened.capture]);
    observed[label] = [status.status, status.body.error?.code ?? null];
  }
  writeFileSync(file, JSON.stringify(good));
  const control = runPrivacy(["status", "--root", root, "--capture", opened.capture]);
  observed.controle = [control.status, control.body.error?.code ?? null];
  const expected = Object.fromEntries(Object.keys(variants).map((label) => [label, [3, "capture_invalid"]]));
  expected.controle = [0, null];
  assert.deepEqual(observed, expected);
});

test("I25-C17 formato persistido: ponteiro ilegível, fora da forma ou link é recusado sem gravar", async (t) => {
  const root = launchRoot("i25 c17 ponteiro");
  const opened = await startLaunch({ root, expectedReal: root });
  const file = pointerFile(root, opened.invocation);
  const good = readFileSync(file, "utf8");
  const pointer = JSON.parse(good);
  const variants = {
    "JSON quebrado": "{",
    "launchVersion 2": JSON.stringify({ ...pointer, launchVersion: 2 }),
    "invocation de outra execução": JSON.stringify({ ...pointer, invocation: "0".repeat(32) }),
    "segment 0": JSON.stringify({ ...pointer, segment: 0 }),
    "sem launchedAt": JSON.stringify((({ launchedAt, ...rest }) => rest)(pointer)),
    "chave extra": JSON.stringify({ ...pointer, extra: true }),
    "maior que 1 KiB": JSON.stringify({ ...pointer, launchedAt: pointer.launchedAt }) + " ".repeat(1100),
  };
  const observed = {};
  const expected = {};
  const payload = claudePayload("pre_tool_bash");
  for (const [label, text] of Object.entries(variants)) {
    writeFileSync(file, text);
    const before = snapshotTree(root);
    const producer = await deliver(root, opened.invocation, [payload]);
    observed[label] = [producer.report().code, producer.report().persisted, snapshotTree(root)];
    expected[label] = ["store_invalid", 0, before];
  }
  unlinkSync(file);
  const target = path.join(scratch("i25 c17 alvo"), "ponteiro alheio.json");
  writeFileSync(target, good);
  let linked = true;
  try {
    symlinkSync(target, file, "file");
  } catch {
    linked = false;
    t.diagnostic("variante link não executada: sem privilégio de link simbólico de arquivo (Windows sem modo de desenvolvedor)");
  }
  if (linked) {
    const producer = await deliver(root, opened.invocation, [payload]);
    observed.link = [producer.report().code, producer.report().persisted];
    expected.link = ["link_refused", 0];
  }
  assert.deepEqual(observed, expected);
});

test("I25-C24 captura corrente encerrada à mão: o próximo evento abre o segmento seguinte da mesma execução", async () => {
  const root = launchRoot("i25 c24 manual");
  const opened = await startLaunch({ root, expectedReal: root });
  assert.deepEqual((await deliver(root, opened.invocation, [claudePayload("pre_tool_bash")])).report(), LAUNCHED(1));
  assert.equal(runPrivacy(["stop", "--root", root, "--capture", opened.capture]).status, 0);
  const late = claudePayload("post_tool_bash", { tool_use_id: "depois-do-stop" });
  assert.deepEqual((await deliver(root, opened.invocation, [late])).report(), LAUNCHED(1));
  const [first, second] = ofInvocation(root, opened.invocation);
  assert.equal(ofInvocation(root, opened.invocation).length, 2);
  assert.deepEqual([first.id, first.state, first.counters.persisted], [opened.capture, "stopped", 1]);
  assert.deepEqual([second.segment, second.state, second.counters.persisted, second.launchedAt], [2, "active", 1, first.launchedAt]);
  assert.deepEqual(exportOf(root, second.id).records.map((r) => r.envelope.ids.toolUseId), [expectedPseudonym(root, second.id, "depois-do-stop")]);
  assert.equal(JSON.parse(readFileSync(pointerFile(root, opened.invocation), "utf8")).capture, second.id);
});

// Commit preso no meio (escrita do segmento de dados) até a prova liberar.
function gatedIo() {
  const base = createStoreIo();
  let armed = true;
  let reach;
  let release;
  const reached = new Promise((resolve) => (reach = resolve));
  const released = new Promise((resolve) => (release = resolve));
  const io = {
    ...base,
    async writeExclusive(file, data, options) {
      if (armed && /events-\d{6}\.ndjson\.[0-9a-f]{8}\.skill-me-tmp$/.test(file)) {
        armed = false;
        reach();
        await released;
      }
      return base.writeExclusive(file, data, options);
    },
  };
  return { io, reached, release };
}

async function endPatiently(root, invocation) {
  for (;;) {
    try {
      return await endLaunch({ root, expectedReal: root, invocation });
    } catch (error) {
      if (error.code !== "lock_present") throw error;
      await sleep(10);
    }
  }
}

test("I25-C27 produtor em voo: o commit que já tem o lock termina antes do encerramento, e nada entra depois dele", async () => {
  const root = launchRoot("i25 c27 voo");
  const opened = await startLaunch({ root, expectedReal: root });
  const gate = gatedIo();
  const producer = createLaunchDelivery({ root, invocation: opened.invocation, agent: "claude", io: gate.io });
  const first = claudePayload("pre_tool_bash", { tool_use_id: "chamada-em-voo" });
  producer.submit(claudeHookDraft(first), first);
  await gate.reached;

  let ended = false;
  const ending = endPatiently(root, opened.invocation).then((result) => {
    ended = true;
    return result;
  });
  await sleep(150);
  assert.equal(ended, false, "o encerramento espera o commit em curso");
  gate.release();
  const result = await ending;
  await producer.settle();
  assert.deepEqual(producer.report(), LAUNCHED(1), "o commit em curso terminou antes do encerramento");
  assert.deepEqual(result.captures.map((c) => [c.id, c.state, c.counters.persisted]), [[opened.capture, "stopped", 1]]);
  assert.throws(() => readFileSync(pointerFile(root, opened.invocation)), { code: "ENOENT" });

  const afterEnd = snapshotTree(root);
  const second = claudePayload("post_tool_bash", { tool_use_id: "chamada-depois" });
  producer.submit(claudeHookDraft(second), second);
  await producer.settle();
  assert.deepEqual(producer.report(), { launch: true, code: "launch_ended", entries: 2, committed: 1, persisted: 1, lost: 1 });
  const fresh = await deliver(root, opened.invocation, [second]);
  assert.deepEqual(fresh.report(), { launch: true, code: "launch_ended", entries: 1, committed: 0, persisted: 0, lost: 1 });
  assert.deepEqual(snapshotTree(root), afterEnd, "nenhuma gravação depois do encerramento");
  assert.equal(statusOf(root, opened.capture).counters.persisted, 1);
});

test("I25-C27 ordem do encerramento: o ponteiro sai antes de a corrente parar, e uma falha ao parar não reabre a execução", async () => {
  const root = launchRoot("i25 c27 ordem");
  const opened = await startLaunch({ root, expectedReal: root });
  const base = createStoreIo();
  const failing = {
    ...base,
    async rename(from, to) {
      if (path.basename(to) === "state.json") throw Object.assign(new Error("falha de E/S"), { code: "EIO" });
      return base.rename(from, to);
    },
  };
  await assert.rejects(endLaunch({ root, expectedReal: root, invocation: opened.invocation, io: failing }), (error) => {
    assert.deepEqual([error.code, error.revoked, error.capture], ["io_failure", true, opened.capture]);
    return true;
  });
  assert.throws(() => readFileSync(pointerFile(root, opened.invocation)), { code: "ENOENT" }, "o ponteiro já saiu");
  assert.equal(statusOf(root, opened.capture).state, "active", "só a captura ficou ativa");
  const producer = await deliver(root, opened.invocation, [claudePayload("pre_tool_bash")]);
  assert.equal(producer.report().code, "launch_ended", "a execução não recebe mais nada");
  assert.equal(statusOf(root, opened.capture).counters.persisted, 0);
  assert.match(statusOf(root, opened.capture).createdAt, ISO_MS);
});
