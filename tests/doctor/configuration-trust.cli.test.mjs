// C8 — fronteira externa real: a decisão de configuration/trust (provada
// na própria camada em config-projection.unit.test.mjs, scope-merge.unit.
// test.mjs e trust-resolution.unit.test.mjs) precisa também aparecer
// corretamente no relatório de um processo CLI real, com os formatos reais
// de cada agente (JSON para Claude, TOML para Codex, YAML para Hermes).
//
// Limitação declarada: a política gerenciada do Claude mora em um caminho
// fixo do SO (ver src/doctor/config-sources.mjs) que este teste não escreve
// nem sobrescreve; esse cenário é provado em scope-merge.unit.test.mjs.
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { makeScratch } from "./helpers/fixture-agents.mjs";
import { AGENT_CONFIG_PATH, writeAgentConfig } from "./helpers/fixture-agent-config.mjs";
import { runDoctorJson } from "./helpers/spawn-doctor.mjs";

function homeEnv(home) {
  return {
    HOME: home,
    USERPROFILE: home,
    LOCALAPPDATA: path.join(home, "..", "localappdata-vazio"),
  };
}

test("configuration-trust-C8 settings.json do Claude com hooks definidos fica configured/unknown no relatório real", () => {
  const scratch = makeScratch("doctor-c8-valid-");
  try {
    const home = path.join(scratch, "home");
    writeAgentConfig(
      home,
      "claude",
      JSON.stringify({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "x" }] }] } }),
    );
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    const claude = report.agents.find((a) => a.id === "claude");
    assert.equal(claude.configuration, "configured");
    assert.equal(claude.trust, "unknown");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("configuration-trust-C8 disableAllHooks:true do Claude fica disabled/not_applicable no relatório real", () => {
  const scratch = makeScratch("doctor-c8-disabled-");
  try {
    const home = path.join(scratch, "home");
    writeAgentConfig(
      home,
      "claude",
      JSON.stringify({ hooks: { PreToolUse: [] }, disableAllHooks: true }),
    );
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    const claude = report.agents.find((a) => a.id === "claude");
    assert.equal(claude.configuration, "disabled");
    assert.equal(claude.trust, "not_applicable");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("configuration-trust-C8 features.hooks=false do Codex fica disabled/not_applicable no relatório real", () => {
  const scratch = makeScratch("doctor-c8-codex-disabled-");
  try {
    const home = path.join(scratch, "home");
    writeAgentConfig(home, "codex", '[features]\nhooks = false\n[hooks]\nPreToolUse = []\n');
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "disabled");
    assert.equal(codex.trust, "not_applicable");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Regressão na fronteira real da CLI (home e cwd temporários): hooks
// definidos são aditivos entre camadas, mas a feature flag não é um OR
// aditivo de "false" — um "true" explícito de PROJETO depende de confiança
// de projeto que o doctor não determina por leitura estática, então um
// "false" de usuário em conflito com ele fica unknown, nunca disabled por
// suposição.
test("configuration-trust-C8 features.hooks=true do Codex em PROJETO (--cwd) + false em USUÁRIO fica unknown, nunca disabled", () => {
  const scratch = makeScratch("doctor-c8-codex-conflict-");
  try {
    const home = path.join(scratch, "home");
    const project = path.join(scratch, "project");
    writeAgentConfig(home, "codex", "[features]\nhooks = false\n[hooks]\nPreToolUse = []\n");
    const projectConfigDir = path.join(project, ".codex");
    mkdirSync(projectConfigDir, { recursive: true });
    writeFileSync(path.join(projectConfigDir, "config.toml"), "[features]\nhooks = true\n");

    const { status, report } = runDoctorJson(["--cwd", project], { env: homeEnv(home) });
    assert.equal(status, 0);
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "unknown");
    assert.equal(codex.configReasonCode, "policy_precedence_undetermined");
    assert.notEqual(codex.configuration, "disabled");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("configuration-trust-C8 config.toml do Codex com [hooks] definido fica configured/unknown no relatório real", () => {
  const scratch = makeScratch("doctor-c8-codex-configured-");
  try {
    const home = path.join(scratch, "home");
    writeAgentConfig(home, "codex", '[hooks]\nPreToolUse = [{ command = "x" }]\n');
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "configured");
    assert.equal(codex.trust, "unknown");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("configuration-trust-C8 hooks_auto_accept:true do Hermes é a única origem nativa de confiança desta entrega (trust: trusted)", () => {
  const scratch = makeScratch("doctor-c8-hermes-trusted-");
  try {
    const home = path.join(scratch, "home");
    // Escreve exatamente onde o hermesHome real resolve para este mesmo
    // env/plataforma: no Windows isso é <LOCALAPPDATA>/hermes, não
    // <HOME>/.hermes (ver src/doctor/config-sources.mjs::hermesHome).
    writeAgentConfig(
      home,
      "hermes",
      'hooks:\n  agent:start:\n    - command: "internal-safe-handler"\nhooks_auto_accept: true\n',
      { env: homeEnv(home), platform: process.platform },
    );
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    const hermes = report.agents.find((a) => a.id === "hermes");
    assert.equal(hermes.configuration, "configured");
    assert.equal(hermes.trust, "trusted");
    assert.equal(hermes.trustReasonCode, "hooks_auto_accept_enabled");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// C16/G4 — fronteira real da CLI: config inacessível, provada de forma
// portátil entre Windows/Linux/macOS. chmod não bloqueia o dono no Windows e
// CI costuma rodar como root, então uma permissão negada real não é
// reproduzível aqui (essa condição já está provada na camada pura em
// scope-merge.unit.test.mjs, critério 3). Um diretório no lugar do arquivo
// de config é uma falha de leitura real e determinística nas três
// convenções de SO: fs.readFile/open+read sempre rejeita (EISDIR/EPERM
// conforme o SO), nunca ENOENT — não é um input inventado, é a mesma
// consequência real de uma config inacessível chegando à CLI de verdade.
test("configuration-trust-C16 config inacessível (diretório no lugar do arquivo) fica unknown/policy_precedence_undetermined, preservando os demais agentes", () => {
  const scratch = makeScratch("doctor-c16-config-inacessivel-");
  try {
    const home = path.join(scratch, "home");
    const env = homeEnv(home);
    const hermesConfigPath = AGENT_CONFIG_PATH.hermes(home, { env, platform: process.platform });
    mkdirSync(hermesConfigPath, { recursive: true });
    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    assert.equal(report.status, "partial");
    assert.equal(report.agents.length, 3);
    const hermes = report.agents.find((a) => a.id === "hermes");
    assert.equal(hermes.configuration, "unknown");
    assert.equal(hermes.configReasonCode, "policy_precedence_undetermined");
    const claude = report.agents.find((a) => a.id === "claude");
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(claude.configuration, "not_configured", "config inacessível de um agente não deve contaminar os demais");
    assert.equal(codex.configuration, "not_configured", "config inacessível de um agente não deve contaminar os demais");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("configuration-trust-C8 ausência de config fica not_configured/not_applicable", () => {
  const scratch = makeScratch("doctor-c8-absent-");
  try {
    const home = path.join(scratch, "home-vazio");
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    const claude = report.agents.find((a) => a.id === "claude");
    assert.equal(claude.configuration, "not_configured");
    assert.equal(claude.trust, "not_applicable");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("configuration-trust-C8 campo 'trust' arbitrário embutido no próprio arquivo não concede confiança (não é consentimento nativo)", () => {
  const scratch = makeScratch("doctor-c8-fake-trust-field-");
  try {
    const home = path.join(scratch, "home");
    // Alguém com acesso de escrita ao mesmo arquivo de hooks tenta se
    // autoautorizar escrevendo um campo "trust"/"trusted" diretamente no
    // conteúdo. Esse campo não está no conjunto seguro de projeção (ver
    // config-projection.mjs) e nunca chega à resolução de confiança.
    writeAgentConfig(
      home,
      "claude",
      JSON.stringify({
        hooks: { PreToolUse: [] },
        trust: "trusted",
        trusted: true,
      }),
    );
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    const claude = report.agents.find((a) => a.id === "claude");
    assert.equal(claude.configuration, "configured");
    assert.notEqual(claude.trust, "trusted");
    assert.equal(claude.trust, "unknown");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
