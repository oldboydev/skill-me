// C11-C13 — fronteira externa real via CLI: envelope JSON, paridade com o
// texto, exit codes e o contrato de --help.
import assert from "node:assert/strict";
import path from "node:path";
import { rmSync } from "node:fs";
import test from "node:test";
import {
  installAllAgents,
  makeScratch,
  pathEnv,
} from "./helpers/fixture-agents.mjs";
import { writeAgentConfig } from "./helpers/fixture-agent-config.mjs";
import { runDoctor, runDoctorJson } from "./helpers/spawn-doctor.mjs";

function emptyHomeEnv(scratch) {
  return {
    HOME: path.join(scratch, "home-vazio"),
    USERPROFILE: path.join(scratch, "home-vazio"),
    LOCALAPPDATA: path.join(scratch, "localappdata-vazio"),
  };
}

test("envelope-C11 JSON é um objeto único, sem banner/ANSI/logs antes ou depois", () => {
  const scratch = makeScratch("doctor-c11-");
  try {
    const { status, stdout } = runDoctor(["--json"], {
      env: emptyHomeEnv(scratch),
    });
    assert.equal(status, 0);
    const trimmed = stdout.trimEnd();
    assert.equal(stdout, trimmed + "\n");
    assert.doesNotThrow(() => JSON.parse(trimmed));
    assert.doesNotMatch(stdout, /\x1b\[/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C11 texto em português distingue ausente, desconhecido, indisponível e não verificado; identificadores do JSON em inglês", () => {
  const scratch = makeScratch("doctor-c11-text-");
  try {
    const { report } = runDoctorJson([], { env: emptyHomeEnv(scratch) });
    for (const key of [
      "schemaVersion",
      "status",
      "environment",
      "agents",
      "collector",
      "limitations",
      "errors",
    ])
      assert.ok(key in report, key);

    const { stdout } = runDoctor([], { env: emptyHomeEnv(scratch) });
    assert.match(stdout, /ausente|não encontrado/i);
    assert.match(stdout, /não verificad/i);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// C11/G1 — fronteira real da CLI: duas invocações de processo real contra a
// MESMA instalação sintética, comparando o JSON de uma com o texto da outra.
// generatedAt é o único fato que pode legitimamente divergir entre as duas
// invocações (timestamps reais, não um modelo compartilhado); por isso só
// ele é excluído da comparação — nenhum outro campo é ignorado para obter
// verde. Cada asserção abaixo falharia no renderer anterior (sem path, sem
// mecanismo/superfície/motivo/origem por capacidade, sem ambiente).
test("envelope-C11 texto e JSON de processos reais distintos expõem os mesmos fatos por agente/capacidade (caminho, mecanismo, superfície, motivo, origem)", () => {
  const scratch = makeScratch("doctor-c11-paridade-cli-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, { sentinelPath: path.join(scratch, "sentinel.txt") });
    const env = { PATH: pathEnv(pathDirs), ...emptyHomeEnv(scratch) };

    const { status: jsonStatus, report } = runDoctorJson([], { env });
    assert.equal(jsonStatus, 0);
    const { status: textStatus, stdout } = runDoctor([], { env });
    assert.equal(textStatus, 0);

    assert.ok(stdout.includes(report.environment.platform), "plataforma ausente no texto");
    assert.ok(stdout.includes(report.environment.cwd), "cwd ausente no texto");

    for (const agent of report.agents) {
      if (agent.path) {
        assert.ok(stdout.includes(agent.path), `${agent.id}.path ausente no texto`);
      }
      const reasonCodesSeen = new Set(agent.capabilities.map((row) => row.reasonCode));
      assert.ok(reasonCodesSeen.size > 1, `${agent.id}: fixture precisa produzir motivos distintos por superfície`);
      for (const reasonCode of reasonCodesSeen) {
        assert.ok(
          stdout.includes(reasonCode),
          `${agent.id}: motivo de capacidade "${reasonCode}" ausente no texto`,
        );
      }
      const originsSeen = new Set(agent.capabilities.map((row) => row.evidence.origin));
      for (const origin of originsSeen) {
        assert.ok(stdout.includes(origin), `${agent.id}: origem "${origin}" ausente no texto`);
      }
      for (const row of agent.capabilities) {
        if (!row.exclusion) continue;
        assert.ok(
          stdout.includes(row.exclusion.reasonCode),
          `${agent.id}: exclusão documentada "${row.exclusion.reasonCode}" ausente no texto`,
        );
        assert.ok(
          stdout.includes(row.exclusion.origin),
          `${agent.id}: origem da exclusão "${row.exclusion.origin}" ausente no texto`,
        );
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// C11 — a paridade também vale nas falhas: o texto (stderr) de uma invocação
// real precisa expor o mesmo `code` e a mesma `message` seguros que o envelope
// JSON de outra invocação real com a mesma entrada inválida. Cada entrada
// carrega um canário para provar que nem o valor bruto recebido nem uma stack
// chegam a qualquer uma das duas saídas.
test("envelope-C11 falha em texto expõe o mesmo code e message seguros do envelope JSON (flag, cwd e collector inválidos), sem canário nem stack", () => {
  const scratch = makeScratch("doctor-c11-falha-");
  try {
    const canary = "CANARY-C11-FAILURE-5d3e";
    const cases = [
      { args: [`--${canary}`], code: "unknown_flag" },
      { args: ["--cwd", path.join(scratch, canary)], code: "cwd_not_found" },
      { args: [`--collector=tcp://${canary}:x@127.0.0.1:9`], code: "invalid_collector_endpoint" },
    ];
    for (const { args, code } of cases) {
      const jsonRun = runDoctor([...args, "--json"], { env: emptyHomeEnv(scratch) });
      const textRun = runDoctor(args, { env: emptyHomeEnv(scratch) });

      const envelope = JSON.parse(jsonRun.stdout);
      assert.equal(envelope.status, "failed", code);
      assert.equal(envelope.errors.length, 1, code);
      const [failure] = envelope.errors;
      assert.equal(failure.code, code);
      assert.equal(jsonRun.status, 2, code);
      assert.equal(textRun.status, jsonRun.status, code);

      assert.ok(textRun.stderr.includes(failure.code), `${code}: código do envelope ausente no texto`);
      assert.ok(textRun.stderr.includes(failure.message), `${code}: mensagem do envelope ausente no texto`);
      for (const output of [jsonRun.stdout, jsonRun.stderr, textRun.stdout, textRun.stderr]) {
        assert.ok(!output.includes(canary), `${code}: canário ecoado na saída`);
        assert.doesNotMatch(output, /^\s+at\s/m, `${code}: frame de stack na saída`);
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C12 diagnóstico completo usa schemaVersion 1, status complete e exit 0", () => {
  const scratch = makeScratch("doctor-c12-complete-");
  try {
    const { status, report } = runDoctorJson([], {
      env: emptyHomeEnv(scratch),
    });
    assert.equal(status, 0);
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.status, "complete");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C12 configuração inválida de um agente gera status partial preservando as demais entradas, exit 0", () => {
  const scratch = makeScratch("doctor-c12-partial-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, { sentinelPath: path.join(scratch, "sentinel") });
    const home = path.join(scratch, "home");
    writeAgentConfig(home, "claude", '{ "hooks": { "PreToolUse": [true, }');
    const { status, report } = runDoctorJson([], {
      env: {
        PATH: pathEnv(pathDirs),
        HOME: home,
        USERPROFILE: home,
        LOCALAPPDATA: path.join(scratch, "localappdata-vazio"),
      },
    });
    assert.equal(status, 0);
    assert.equal(report.status, "partial");
    assert.equal(report.agents.length, 3);
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.presence, "present");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C12 flag desconhecida usa exit 2, sintaxe inválida nunca usa exit 0/1", () => {
  const scratch = makeScratch("doctor-c12-exit2-");
  try {
    const { status } = runDoctor(["--flag-inexistente"], {
      env: emptyHomeEnv(scratch),
    });
    assert.equal(status, 2);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C12 erro reportado em --json preserva o envelope com status failed, sem stack bruta", () => {
  const scratch = makeScratch("doctor-c12-failed-json-");
  try {
    const { status, stdout } = runDoctor(
      ["--json", "--cwd", path.join(scratch, "nao-existe")],
      { env: emptyHomeEnv(scratch) },
    );
    assert.equal(status, 2);
    const report = JSON.parse(stdout);
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.status, "failed");
    assert.doesNotMatch(stdout, /at [\w./\\]+:\d+:\d+/); // sem frame de stack trace
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C13 --help lista exatamente as quatro flags documentadas, exit 0", () => {
  const scratch = makeScratch("doctor-c13-help-");
  try {
    const start = Date.now();
    const { status, stdout } = runDoctor(["--help"], {
      env: emptyHomeEnv(scratch),
    });
    const elapsed = Date.now() - start;
    assert.equal(status, 0);
    for (const flag of ["--json", "--cwd", "--collector", "--help"])
      assert.match(stdout, new RegExp(flag.replace(/[-]/g, "\\-")));
    // "--collect" não pode casar com o "--collector" legítimo documentado
    // acima: o motivo proibido é um modo de captura/coleta genérico, não o
    // endpoint de conexão do critério 9-10.
    for (const forbidden of ["--fix", "--install", "--collect(?!or\\b)", "--repair"])
      assert.doesNotMatch(stdout, new RegExp(forbidden));
    assert.ok(elapsed < 2000, `--help demorou ${elapsed}ms`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C13 diretório inexistente em --cwd (sem --json) usa exit 2 com erro legível", () => {
  const scratch = makeScratch("doctor-c13-cwd-");
  try {
    const { status, stdout, stderr } = runDoctor(
      ["--cwd", path.join(scratch, "nao-existe")],
      { env: emptyHomeEnv(scratch) },
    );
    assert.equal(status, 2);
    assert.match(stdout + stderr, /diretório/i);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("envelope-C13 flag de reparo/instalação/coleta não existe nesta CLI", () => {
  const scratch = makeScratch("doctor-c13-norepair-");
  try {
    for (const flag of ["--fix", "--install", "--collect", "--repair"]) {
      const { status } = runDoctor([flag], { env: emptyHomeEnv(scratch) });
      assert.equal(status, 2, flag);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
