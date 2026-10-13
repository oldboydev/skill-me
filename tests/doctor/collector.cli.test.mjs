// C9-C10 — fronteira externa real: a CLI tenta de fato conectar (ou recusa)
// via `--collector`. Servidores TCP reais em loopback, nunca simulados.
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { makeScratch } from "./helpers/fixture-agents.mjs";
import { runDoctor, runDoctorJson } from "./helpers/spawn-doctor.mjs";
import {
  reserveClosedPort,
  startLoopbackServer,
} from "./helpers/tcp-test-server.mjs";

function emptyHomeEnv(scratch) {
  return {
    HOME: path.join(scratch, "home-vazio"),
    USERPROFILE: path.join(scratch, "home-vazio"),
    LOCALAPPDATA: path.join(scratch, "localappdata-vazio"),
  };
}

test("collector-C9 socket local disponível retorna reachable sem identidade comprovada", async () => {
  const scratch = makeScratch("doctor-collector-reachable-");
  const server = await startLoopbackServer("127.0.0.1");
  try {
    const { status, report } = runDoctorJson(
      [`--collector=tcp://127.0.0.1:${server.port}`],
      { env: emptyHomeEnv(scratch) },
    );
    assert.equal(status, 0);
    assert.equal(report.collector.status, "reachable");
    assert.equal(report.collector.identityVerified, false);
  } finally {
    await server.close();
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("collector-C9 recusa de conexão retorna unreachable com motivo, identidade nunca comprovada", async () => {
  const scratch = makeScratch("doctor-collector-unreachable-");
  const closedPort = await reserveClosedPort("127.0.0.1");
  try {
    const { status, report } = runDoctorJson(
      [`--collector=tcp://127.0.0.1:${closedPort}`],
      { env: emptyHomeEnv(scratch) },
    );
    assert.equal(status, 0);
    assert.equal(report.collector.status, "unreachable");
    assert.equal(typeof report.collector.reasonCode, "string");
    assert.equal(report.collector.identityVerified, false);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("collector-C9 IPv6 loopback [::1] também é aceito como entrada local", async () => {
  const scratch = makeScratch("doctor-collector-ipv6-");
  let server;
  try {
    server = await startLoopbackServer("::1");
  } catch (error) {
    // Ambiente sem IPv6 habilitado: limitação registrada, não falha falsa.
    return;
  }
  try {
    const { status, report } = runDoctorJson(
      [`--collector=tcp://[::1]:${server.port}`],
      { env: emptyHomeEnv(scratch) },
    );
    assert.equal(status, 0);
    assert.equal(report.collector.status, "reachable");
    assert.equal(report.collector.identityVerified, false);
  } finally {
    await server.close();
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("collector-C10 sem endpoint retorna unknown/endpoint_not_provided sem concluir ausência de instrumentação", () => {
  const scratch = makeScratch("doctor-collector-absent-");
  try {
    const { status, report } = runDoctorJson([], {
      env: emptyHomeEnv(scratch),
    });
    assert.equal(status, 0);
    assert.equal(report.collector.status, "unknown");
    assert.equal(report.collector.reasonCode, "endpoint_not_provided");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Um endpoint fora da assinatura da CLI (tcp://127.0.0.1:<porta> ou
// tcp://[::1]:<porta>, nada além disso) é entrada inválida de uso, não um
// diagnóstico "bem sucedido" com collector.status unknown/invalid_endpoint e
// exit 0.
test("collector-C10 loopback estrito: 'localhost' não é aceito mesmo resolvendo para loopback e havendo listener real", async () => {
  const scratch = makeScratch("doctor-collector-localhost-");
  const server = await startLoopbackServer("127.0.0.1");
  try {
    const { status, report } = runDoctorJson(
      [`--collector=tcp://localhost:${server.port}`],
      { env: emptyHomeEnv(scratch) },
    );
    assert.equal(status, 2);
    assert.equal(report.status, "failed");
    assert.notEqual(report.collector?.status, "reachable");
  } finally {
    await server.close();
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("collector-C10 endpoint fora da assinatura (credenciais, path, query, não local, esquema errado) é erro de uso, exit 2, sem conexão", () => {
  const scratch = makeScratch("doctor-collector-invalid-");
  try {
    for (const endpoint of [
      "tcp://user:pass@127.0.0.1:9", // credenciais
      "tcp://127.0.0.1:9/caminho", // path
      "tcp://127.0.0.1:9?query=1", // query
      "tcp://10.0.0.5:9", // não local
      "http://127.0.0.1:9", // esquema errado
    ]) {
      const { status, report } = runDoctorJson([`--collector=${endpoint}`], {
        env: emptyHomeEnv(scratch),
      });
      assert.equal(status, 2, endpoint);
      assert.equal(report.status, "failed", endpoint);
      assert.notEqual(report.collector?.status, "reachable", endpoint);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("collector-C10 endpoint inválido com canário embutido (credenciais) nunca ecoa o valor no envelope nem em stderr", () => {
  const scratch = makeScratch("doctor-collector-invalid-canary-");
  try {
    const canary = "CANARY-ENDPOINT-SECRET-7a21";
    const endpoint = `tcp://${canary}:x@127.0.0.1:9`;
    const { status, stdout, stderr, report } = runDoctorJson([`--collector=${endpoint}`], {
      env: emptyHomeEnv(scratch),
    });
    assert.equal(status, 2);
    assert.equal(report.status, "failed");
    assert.doesNotMatch(stdout, new RegExp(canary));
    assert.doesNotMatch(stderr, new RegExp(canary));

    const textRun = runDoctor([`--collector=${endpoint}`], { env: emptyHomeEnv(scratch) });
    assert.equal(textRun.status, 2);
    assert.doesNotMatch(textRun.stdout, new RegExp(canary));
    assert.doesNotMatch(textRun.stderr, new RegExp(canary));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("collector-C10 coletor inacessível não trava os demais diagnósticos", () => {
  const scratch = makeScratch("doctor-collector-timeout-overall-");
  try {
    const start = Date.now();
    const { status, report } = runDoctorJson(
      ["--collector=tcp://127.0.0.1:1"],
      { env: emptyHomeEnv(scratch) },
    );
    const elapsed = Date.now() - start;
    assert.equal(status, 0);
    assert.equal(report.agents.length, 3);
    assert.ok(elapsed < 5000, `demorou ${elapsed}ms`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
