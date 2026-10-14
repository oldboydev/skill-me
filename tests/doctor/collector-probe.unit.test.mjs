// C10 — duas garantias que não são provadas de forma determinística via
// CLI real: (1) um endpoint inválido nunca chega a tentar conexão; (2) o
// timeout de 1000 ms é aplicado de verdade (tempo real decorrido, sem
// relógio falso). Um hang de rede real não é reproduzível de forma
// portátil e rápida em CI; a simulação injeta uma função connect que nunca
// resolve, e o teste mede o tempo de parede efetivo — essa é a limitação
// declarada desta prova.
import assert from "node:assert/strict";
import test from "node:test";
import { defaultConnect, probeCollector } from "../../src/doctor/collector-probe.mjs";
import { startLoopbackServer } from "./helpers/tcp-test-server.mjs";

function neverCallConnect() {
  return () => {
    throw new Error("connect não deve ser chamado para endpoint inválido");
  };
}

// Connect "pendente para sempre" que só se resolve quando o signal de
// cancelamento dispara — simula o socket real que o antigo
// `Promise.race` deixava órfão: a correção precisa cancelar isso, não só
// "vencer a corrida" e seguir em frente.
function hangingConnect({ onAbort } = {}) {
  return (host, port, { signal } = {}) =>
    new Promise((resolve, reject) => {
      const onAbortEvent = () => {
        onAbort?.();
        const error = new Error("abortado");
        error.code = "ABORT_ERR";
        reject(error);
      };
      if (signal?.aborted) {
        onAbortEvent();
        return;
      }
      signal?.addEventListener("abort", onAbortEvent, { once: true });
    });
}

for (const endpoint of [
  "tcp://user:pass@127.0.0.1:9",
  "tcp://127.0.0.1:9/caminho",
  "tcp://127.0.0.1:9?query=1",
  "tcp://10.0.0.5:9",
  "tcp://localhost:9",
  "http://127.0.0.1:9",
  "not a url",
]) {
  test(`collector-probe-C10 endpoint inválido (${endpoint}) nunca tenta conexão`, async () => {
    const result = await probeCollector(endpoint, {
      connect: neverCallConnect(),
    });
    assert.notEqual(result.status, "reachable");
    assert.equal(result.identityVerified, false);
  });
}

test("collector-probe-C10 timeout real de 1000 ms é aplicado com relógio de parede verdadeiro", async () => {
  const start = Date.now();
  const result = await probeCollector("tcp://127.0.0.1:65000", {
    timeoutMs: 1000,
    connect: hangingConnect(),
  });
  const elapsed = Date.now() - start;
  assert.equal(result.status, "unreachable");
  assert.equal(result.reasonCode, "connection_timeout");
  assert.equal(result.identityVerified, false);
  assert.ok(elapsed >= 990, `retornou cedo demais: ${elapsed}ms`);
  assert.ok(elapsed < 3000, `não respeitou o teto: ${elapsed}ms`);
});

test("collector-probe-C10 timeout cancela a tentativa de conexão pendente (não apenas 'vence a corrida')", async () => {
  let aborted = false;
  const unhandled = [];
  const onUnhandledRejection = (error) => unhandled.push(error);
  process.on("unhandledRejection", onUnhandledRejection);
  try {
    const result = await probeCollector("tcp://127.0.0.1:65000", {
      timeoutMs: 50,
      connect: hangingConnect({ onAbort: () => (aborted = true) }),
    });
    assert.equal(result.status, "unreachable");
    assert.equal(result.reasonCode, "connection_timeout");
    assert.equal(aborted, true, "o connect pendente deveria ter sido cancelado no timeout");
    // Dá uma volta do event loop para qualquer rejeição tardia aparecer.
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(unhandled, [], "não deve haver rejeição de promise não tratada");
  } finally {
    process.off("unhandledRejection", onUnhandledRejection);
  }
});

test("defaultConnect aborta um socket real pendente quando o signal já foi abortado antes de conectar", async () => {
  const server = await startLoopbackServer("127.0.0.1");
  try {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      defaultConnect("127.0.0.1", server.port, { signal: controller.signal }),
      (error) => error.code === "ABORT_ERR",
    );
  } finally {
    await server.close();
  }
});
