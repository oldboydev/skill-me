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
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { installAllAgents, makeScratch, pathEnv } from "./helpers/fixture-agents.mjs";
import { AGENT_CONFIG_PATH, writeAgentConfig } from "./helpers/fixture-agent-config.mjs";
import { CANARY } from "./helpers/fixture-configs.mjs";
import { hermesPluginsSource } from "./helpers/hermes-contract-source.mjs";
import { runDoctor, runDoctorJson } from "./helpers/spawn-doctor.mjs";

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

// Achados bloqueantes da segunda revisão formal (.checks/code-review/issue-3/
// response.json, AC3/AC5): `codex_hooks` é o alias depreciado de
// `features.hooks` para a MESMA feature (legacy.rs/lib.rs, rust-v0.162.1,
// `Feature::CodexHooks.key() == "hooks"`). Só no escopo de USUÁRIO (sem gate
// de confiança de projeto) um valor explícito resolve de verdade.
test("configuration-trust-C8 features.codex_hooks=false (alias) do Codex em USUÁRIO fica disabled/not_applicable, igual a features.hooks", () => {
  const scratch = makeScratch("doctor-c8-codex-alias-disabled-");
  try {
    const home = path.join(scratch, "home");
    writeAgentConfig(home, "codex", "[features]\ncodex_hooks = false\n[hooks]\nPreToolUse = []\n");
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "disabled");
    assert.equal(codex.configReasonCode, "features_hooks_disabled");
    assert.equal(codex.trust, "not_applicable");

    const text = runDoctor([], { env: homeEnv(home) });
    assert.equal(text.status, 0);
    assert.match(text.stdout, /features_hooks_disabled/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// As entradas de `[features]` do config.toml achatam num único
// `BTreeMap<String, bool>` (FeaturesToml::entries/apply_map, lib.rs);
// "codex_hooks" < "hooks" alfabeticamente, então a canônica é aplicada por
// último e sobrescreve a legada quando as duas coexistem — nunca um OR de
// "false" entre as duas chaves.
test("configuration-trust-C8 features.hooks e features.codex_hooks coexistindo: a chave canônica decide no relatório real, nunca um OR de false", () => {
  const scratch = makeScratch("doctor-c8-codex-alias-conflito-");
  try {
    const home = path.join(scratch, "home");
    writeAgentConfig(
      home,
      "codex",
      "[features]\nhooks = true\ncodex_hooks = false\n[hooks]\nPreToolUse = []\n",
    );
    const { report } = runDoctorJson([], { env: homeEnv(home) });
    const codex = report.agents.find((a) => a.id === "codex");
    assert.notEqual(codex.configuration, "disabled");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// A restrição de confiança de PROJETO (achado original, já coberta acima para
// a chave canônica) também se aplica ao alias: qualquer valor explícito da
// MESMA feature em escopo de projeto fica unknown, nunca disabled/configured
// por suposição — a chave usada para endereçá-la não muda essa regra.
test("configuration-trust-C8 features.codex_hooks (alias) explícito em PROJETO (--cwd) fica unknown, nunca disabled/configured", () => {
  const scratch = makeScratch("doctor-c8-codex-alias-projeto-");
  try {
    const home = path.join(scratch, "home");
    const project = path.join(scratch, "project");
    const projectConfigDir = path.join(project, ".codex");
    mkdirSync(projectConfigDir, { recursive: true });
    writeFileSync(path.join(projectConfigDir, "config.toml"), "[features]\ncodex_hooks = false\n");

    const { status, report } = runDoctorJson(["--cwd", project], { env: homeEnv(home) });
    assert.equal(status, 0);
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "unknown");
    assert.equal(codex.configReasonCode, "policy_precedence_undetermined");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Complementação do mesmo achado (.checks/code-review/formal2-flag-types-
// residual.md): `FeaturesToml::entries` (lib.rs:869–871) é um
// `BTreeMap<String, bool>` — a deserialização nativa rejeita qualquer uma das
// duas chaves conhecidas presente com tipo diferente de bool ANTES de aplicar
// a precedência entre canônica e alias. Com handlers nativos válidos ao lado,
// o relatório real precisa mostrar `invalid/partial`, sem trust concedido —
// nunca `configured/trusted` por um fallback indevido entre as duas chaves.
test("configuration-trust-C8 features.hooks com tipo inválido não cai para codex_hooks válido no relatório real, fica invalid/partial", () => {
  const scratch = makeScratch("doctor-c8-codex-flagtype-canonica-");
  try {
    const home = path.join(scratch, "home");
    writeAgentConfig(
      home,
      "codex",
      '[features]\nhooks = "yes"\ncodex_hooks = true\n[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype="command"\ncommand="echo ok"\n',
    );
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    assert.equal(report.status, "partial");
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "invalid");
    assert.equal(codex.configReasonCode, "features_hooks_flag_invalid_type");
    assert.notEqual(codex.trust, "trusted");

    const text = runDoctor([], { env: homeEnv(home) });
    assert.equal(text.status, 0);
    assert.match(text.stdout, /features_hooks_flag_invalid_type/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("configuration-trust-C8 features.codex_hooks com tipo inválido não fica escondido atrás de features.hooks válido no relatório real, fica invalid/partial", () => {
  const scratch = makeScratch("doctor-c8-codex-flagtype-alias-");
  try {
    const home = path.join(scratch, "home");
    writeAgentConfig(
      home,
      "codex",
      '[features]\nhooks = true\ncodex_hooks = "no"\n[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype="command"\ncommand="echo ok"\n',
    );
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    assert.equal(report.status, "partial");
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "invalid");
    assert.equal(codex.configReasonCode, "features_hooks_flag_invalid_type");
    assert.notEqual(codex.trust, "trusted");

    const text = runDoctor([], { env: homeEnv(home) });
    assert.equal(text.status, 0);
    assert.match(text.stdout, /features_hooks_flag_invalid_type/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("configuration-trust-C8 config.toml do Codex com [hooks] definido fica configured/unknown no relatório real", () => {
  const scratch = makeScratch("doctor-c8-codex-configured-");
  try {
    const home = path.join(scratch, "home");
    writeAgentConfig(
      home,
      "codex",
      '[[hooks.PreToolUse]]\nmatcher = "^Bash$"\n\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\n',
    );
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "configured");
    assert.equal(codex.trust, "unknown");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Corrigido na correção residual de G3 (.checks/code-review/verifier3-fix-
// residuals.md): esta prova dependia de `configured` sem nenhuma instalação
// real do Hermes (presence absent, catálogo nunca lido) — a própria ausência
// de catálogo agora rebaixa isso a `unknown/hooks_catalog_unavailable` (ver
// teste abaixo), então "trust: trusted" não seria mais alcançável por esse
// caminho. Reutiliza `installAllAgents`/`hermesPluginsSource` (mesmo padrão
// dos testes G3 de catálogo real) para confirmar `pre_tool_call` contra um
// VALID_HOOKS de verdade e isolar o que este teste realmente prova:
// `hooks_auto_accept` é a única origem nativa de confiança, não um substituto
// para o catálogo.
test("configuration-trust-C8 hooks_auto_accept:true do Hermes é a única origem nativa de confiança desta entrega (trust: trusted)", () => {
  const scratch = makeScratch("doctor-c8-hermes-trusted-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, {
      sentinelPath: path.join(scratch, "sentinel.txt"),
      hermesContractSource: hermesPluginsSource(),
    });
    const home = path.join(scratch, "home");
    const env = { PATH: pathEnv(pathDirs), ...homeEnv(home) };
    writeAgentConfig(
      home,
      "hermes",
      'hooks:\n  pre_tool_call:\n    - command: "internal-safe-handler"\nhooks_auto_accept: true\n',
      { env, platform: process.platform },
    );
    const { status, report } = runDoctorJson([], { env });
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
        hooks: { PreToolUse: [{ hooks: [{ type: "command", command: "x" }] }] },
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

// Achado formal 6 — fronteira real da CLI: JSON válido com a seção de hooks
// fora da forma nativa do Claude não pode virar configured/complete. O agente
// afetado fica invalid com motivo, o relatório fica partial e os outros dois
// agentes continuam no relatório com o próprio estado.
test("configuration-trust-C8 settings.json com hooks:{PreToolUse:42} ou hooks:[\"invalid\"] fica invalid/hooks_structure_invalid, partial, preservando os demais", () => {
  for (const content of [{ hooks: { PreToolUse: 42 } }, { hooks: ["invalid"] }]) {
    const scratch = makeScratch("doctor-c8-hooks-estrutura-");
    try {
      const home = path.join(scratch, "home");
      writeAgentConfig(home, "claude", JSON.stringify(content));
      const { status, report } = runDoctorJson([], { env: homeEnv(home) });
      const label = JSON.stringify(content);
      assert.equal(status, 0, label);
      assert.equal(report.status, "partial", label);
      assert.equal(report.agents.length, 3, label);
      const claude = report.agents.find((a) => a.id === "claude");
      assert.equal(claude.configuration, "invalid", label);
      assert.equal(claude.configReasonCode, "hooks_structure_invalid", label);
      assert.equal(claude.trust, "unknown", label);
      for (const id of ["codex", "hermes"]) {
        const other = report.agents.find((a) => a.id === id);
        assert.equal(other.configuration, "not_configured", `${label}: ${id} preservado`);
      }
      // A configuração lida pertence à CLI local; superfícies não
      // inspecionadas continuam com configuration unknown.
      for (const row of claude.capabilities.filter((r) => r.surface === "cli_local")) {
        assert.equal(row.configuration, "invalid", `${label}: ${row.mechanism}`);
      }
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
});

test("configuration-trust-C8 config.toml do Codex e config.yaml do Hermes fora da forma nativa ficam invalid no relatório real", () => {
  const scratch = makeScratch("doctor-c8-hooks-estrutura-codex-hermes-");
  try {
    const home = path.join(scratch, "home");
    const env = homeEnv(home);
    writeAgentConfig(home, "codex", "[hooks]\nPreToolUse = 42\n");
    writeAgentConfig(home, "hermes", 'hooks:\n  pre_tool_call:\n    - matcher: "terminal"\n', {
      env,
      platform: process.platform,
    });
    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    assert.equal(report.status, "partial");
    for (const id of ["codex", "hermes"]) {
      const agent = report.agents.find((a) => a.id === id);
      assert.equal(agent.configuration, "invalid", id);
      assert.equal(agent.configReasonCode, "hooks_structure_invalid", id);
    }
    assert.equal(report.agents.find((a) => a.id === "claude").configuration, "not_configured");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("configuration-trust-C8 seção de hooks vazia e válida (ou evento sem handler) continua not_configured, sem partial", () => {
  for (const content of [{ hooks: {} }, { hooks: { PreToolUse: [] } }]) {
    const scratch = makeScratch("doctor-c8-hooks-vazio-");
    try {
      const home = path.join(scratch, "home");
      const label = JSON.stringify(content);
      writeAgentConfig(home, "claude", label);
      const { status, report } = runDoctorJson([], { env: homeEnv(home) });
      assert.equal(status, 0, label);
      assert.equal(report.status, "complete", label);
      const claude = report.agents.find((a) => a.id === "claude");
      assert.equal(claude.configuration, "not_configured", label);
      assert.equal(claude.trust, "not_applicable", label);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
});

// Pré-revisão da forma nativa (achado 6): handler de tipo conhecido sem o
// alvo obrigatório não registra hook nenhum e não pode chegar a configured.
test("configuration-trust-C8 handler sem alvo obrigatório (Claude {type:'command'}, Codex {}) fica invalid no relatório real, nunca configured", () => {
  const scratch = makeScratch("doctor-c8-handler-sem-alvo-");
  try {
    const home = path.join(scratch, "home");
    const env = homeEnv(home);
    writeAgentConfig(home, "claude", JSON.stringify({ hooks: { PreToolUse: [{ hooks: [{ type: "command" }] }] } }));
    writeAgentConfig(home, "codex", "[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\n");
    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    assert.equal(report.status, "partial");
    for (const id of ["claude", "codex"]) {
      const agent = report.agents.find((a) => a.id === id);
      assert.equal(agent.configuration, "invalid", id);
      assert.equal(agent.configReasonCode, "hooks_structure_invalid", id);
      assert.equal(agent.trust, "unknown", id);
    }
    assert.equal(report.agents.find((a) => a.id === "hermes").configuration, "not_configured");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("configuration-trust-C8 tipo de handler não reconhecido fica unknown/hooks_handler_type_unrecognized no relatório real, JSON e texto, sem confiança", () => {
  const scratch = makeScratch("doctor-c8-handler-tipo-");
  try {
    const home = path.join(scratch, "home");
    const env = homeEnv(home);
    writeAgentConfig(
      home,
      "claude",
      JSON.stringify({ hooks: { PreToolUse: [{ hooks: [{ type: "future_kind", target: CANARY }] }] } }),
    );
    const { status, stdout, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    assert.equal(report.status, "partial");
    const claude = report.agents.find((a) => a.id === "claude");
    assert.equal(claude.configuration, "unknown");
    assert.equal(claude.configReasonCode, "hooks_handler_type_unrecognized");
    assert.equal(claude.trust, "unknown");
    assert.equal(claude.trustReasonCode, "configuration_not_determined");
    for (const row of claude.capabilities.filter((r) => r.surface === "cli_local")) {
      assert.equal(row.configuration, "unknown", row.mechanism);
      assert.equal(row.runtimeVerification, "not_performed", row.mechanism);
    }
    assert.doesNotMatch(stdout, new RegExp(CANARY));

    const text = runDoctor([], { env });
    assert.equal(text.status, 0);
    assert.match(text.stdout, /hooks_handler_type_unrecognized/);
    assert.doesNotMatch(text.stdout, new RegExp(CANARY));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// managed_dir/windows_managed_dir: campos nativos de [hooks] do Codex
// (https://learn.chatgpt.com/docs/hooks, "Managed hooks"). O diretório
// recebe um hooks.json e um script com canário: se o doctor lesse o
// diretório como fonte de hooks, o Codex ficaria configured ou o canário
// vazaria; se executasse o script, o marcador existiria.
test("configuration-trust-C8 managed_dir/windows_managed_dir do Codex são forma válida no relatório real, sem abrir o diretório, sem confiança e sem execução", () => {
  const scratch = makeScratch("doctor-c8-codex-managed-dir-");
  try {
    const home = path.join(scratch, "home");
    const env = homeEnv(home);
    const managedDir = path.join(scratch, "enterprise-hooks");
    const marker = path.join(scratch, "executou.txt");
    mkdirSync(managedDir, { recursive: true });
    writeFileSync(
      path.join(managedDir, "hooks.json"),
      JSON.stringify({ hooks: { PreToolUse: [{ hooks: [{ type: "command", command: CANARY }] }] } }),
    );
    writeFileSync(path.join(managedDir, "pre.cmd"), `@echo ${CANARY} > "${marker}"\r\n`);
    writeFileSync(path.join(managedDir, "pre.sh"), `#!/bin/sh\necho ${CANARY} > '${marker}'\n`);
    const dirs = `[hooks]\nmanaged_dir = '${managedDir}'\nwindows_managed_dir = '${managedDir}'\n`;
    const script = path.join(managedDir, process.platform === "win32" ? "pre.cmd" : "pre.sh");
    const withEvent = `${dirs}\n[[hooks.PreToolUse]]\nmatcher = "^Bash$"\n\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = '${script}'\n`;

    const expected = [
      [dirs, "not_configured", "no_config_found", "not_applicable", "configuration_not_configured"],
      [withEvent, "configured", "hooks_configured", "unknown", "no_native_consent_evidence"],
    ];
    for (const [content, configuration, configReasonCode, trust, trustReasonCode] of expected) {
      writeAgentConfig(home, "codex", content);
      const { status, stdout, report } = runDoctorJson([], { env });
      assert.equal(status, 0, configuration);
      assert.equal(report.status, "complete", configuration);
      const codex = report.agents.find((a) => a.id === "codex");
      assert.equal(codex.configuration, configuration);
      assert.equal(codex.configReasonCode, configReasonCode);
      assert.equal(codex.trust, trust);
      assert.equal(codex.trustReasonCode, trustReasonCode);
      for (const row of codex.capabilities) {
        assert.equal(row.runtimeVerification, "not_performed", `${row.mechanism}/${row.surface}`);
      }
      assert.doesNotMatch(stdout, new RegExp(CANARY), configuration);
      assert.equal(existsSync(marker), false, "o script do diretório gerenciado não pode ser executado");
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Achado 2 da pré-revisão formal da rodada 3 (Landing "Nomes de evento não
// validados"): uma chave de `[hooks]` que não é um dos 12 eventos nativos do
// Codex (HookEventsToml, rust-v0.162.1) não pode virar configured só porque o
// handler dentro dela tem alvo — o Codex real nunca inspeciona esse valor.
test("configuration-trust-C8 chave de evento não reconhecida do Codex com handler command válido fica unknown/hooks_event_name_unrecognized, nunca configured", () => {
  const scratch = makeScratch("doctor-c8-evento-nao-reconhecido-");
  try {
    const home = path.join(scratch, "home");
    const env = homeEnv(home);
    writeAgentConfig(
      home,
      "codex",
      '[[hooks.NotAnEvent]]\n[[hooks.NotAnEvent.hooks]]\ntype = "command"\ncommand = "x"\n',
    );
    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    assert.equal(report.status, "partial");
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "unknown");
    assert.equal(codex.configReasonCode, "hooks_event_name_unrecognized");
    assert.equal(codex.trust, "unknown");
    assert.equal(codex.trustReasonCode, "configuration_not_determined");
    for (const row of codex.capabilities.filter((r) => r.surface === "cli_local")) {
      assert.equal(row.configuration, "unknown", row.mechanism);
    }

    const text = runDoctor([], { env });
    assert.equal(text.status, 0);
    assert.match(text.stdout, /hooks_event_name_unrecognized/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Achado G3 da rodada 3: um evento Hermes fora do catálogo VALID_HOOKS da
// instalação ligada ao launcher (plugins.py do mesmo pacote da versão) nunca
// é registrado pelo agente real (_parse_hooks_block ignora nomes fora da
// tabela) — a configuração não pode afirmar "configured" só porque a chave
// tem um handler bem formado. Usa installAllAgents para que a versão e o
// contrato sejam lidos de uma instalação real (presence present, perfil
// compatível), não apenas a forma estrutural de hooks-shape.mjs.
test("configuration-trust-C8/G3 Hermes: hooks.made_up_event (fora do VALID_HOOKS instalado) fica not_configured, nunca configured, com o catálogo real ligado", () => {
  const scratch = makeScratch("doctor-c8-hermes-evento-fora-catalogo-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, {
      sentinelPath: path.join(scratch, "sentinel.txt"),
      hermesContractSource: hermesPluginsSource(),
    });
    const home = path.join(scratch, "home");
    const env = { PATH: pathEnv(pathDirs), ...homeEnv(home) };
    writeAgentConfig(home, "hermes", 'hooks:\n  made_up_event:\n    - command: "echo ok"\n', {
      env,
      platform: process.platform,
    });

    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    assert.equal(report.status, "complete");
    const hermes = report.agents.find((a) => a.id === "hermes");
    assert.equal(hermes.version, "0.21.4");
    assert.equal(hermes.configuration, "not_configured");
    assert.equal(hermes.configReasonCode, "hooks_event_not_in_installed_catalog");
    assert.equal(hermes.trust, "not_applicable");
    assert.equal(hermes.trustReasonCode, "configuration_not_configured");

    const text = runDoctor([], { env });
    assert.equal(text.status, 0);
    assert.match(text.stdout, /hooks_event_not_in_installed_catalog/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Ao lado de um evento REAL da tabela instalada, o evento inventado não
// impede "configured" — pelo menos um hook de verdade será registrado.
test("configuration-trust-C8/G3 Hermes: evento real do catálogo instalado ao lado de um inventado continua configured", () => {
  const scratch = makeScratch("doctor-c8-hermes-evento-misto-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, {
      sentinelPath: path.join(scratch, "sentinel.txt"),
      hermesContractSource: hermesPluginsSource(),
    });
    const home = path.join(scratch, "home");
    const env = { PATH: pathEnv(pathDirs), ...homeEnv(home) };
    writeAgentConfig(
      home,
      "hermes",
      'hooks:\n  made_up_event:\n    - command: "echo ok"\n  pre_tool_call:\n    - command: "echo real"\n',
      { env, platform: process.platform },
    );

    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    const hermes = report.agents.find((a) => a.id === "hermes");
    assert.equal(hermes.configuration, "configured");
    assert.equal(hermes.configReasonCode, "hooks_configured");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Residual G3 (rodada 4, .checks/code-review/verifier4-g3-shell-fix.md):
// `transform_api_error_classification` pertence a VALID_HOOKS (contrato geral
// de plugin hooks, sustenta `verified` em C5), mas `agent/shell_hooks.py::
// _parse_hooks_block` recusa esse MESMO nome como shell hook de `config.yaml`
// (está em SHELL_UNSUPPORTED_HOOKS, checado antes de VALID_HOOKS) — a
// instalação real nunca registraria este handler. Reprodução exata do
// Verifier independente: único evento com handler, fonte real do
// `plugins.py` copiada para a fixture (ambas as tabelas).
test("configuration-trust-C8/G3 Hermes: único handler Python-plugin-only (transform_api_error_classification) fica not_configured/hooks_event_shell_unsupported no relatório real, nunca configured", () => {
  const scratch = makeScratch("doctor-c8-hermes-shell-unsupported-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, {
      sentinelPath: path.join(scratch, "sentinel.txt"),
      hermesContractSource: hermesPluginsSource(),
    });
    const home = path.join(scratch, "home");
    const env = { PATH: pathEnv(pathDirs), ...homeEnv(home) };
    writeAgentConfig(
      home,
      "hermes",
      'hooks:\n  transform_api_error_classification:\n    - command: "echo forbidden"\n',
      { env, platform: process.platform },
    );

    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    assert.equal(report.status, "complete");
    const hermes = report.agents.find((a) => a.id === "hermes");
    assert.equal(hermes.version, "0.21.4");
    assert.equal(hermes.configuration, "not_configured");
    assert.equal(hermes.configReasonCode, "hooks_event_shell_unsupported");
    assert.equal(hermes.trust, "not_applicable");
    assert.equal(hermes.trustReasonCode, "configuration_not_configured");

    const text = runDoctor([], { env });
    assert.equal(text.status, 0);
    assert.match(text.stdout, /hooks_event_shell_unsupported/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Ao lado de um evento shell real aceito, o evento Python-plugin-only não
// impede "configured" — pelo menos um shell hook de verdade seria registrado.
test("configuration-trust-C8/G3 Hermes: evento Python-plugin-only ao lado de um evento shell real continua configured", () => {
  const scratch = makeScratch("doctor-c8-hermes-shell-misto-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, {
      sentinelPath: path.join(scratch, "sentinel.txt"),
      hermesContractSource: hermesPluginsSource(),
    });
    const home = path.join(scratch, "home");
    const env = { PATH: pathEnv(pathDirs), ...homeEnv(home) };
    writeAgentConfig(
      home,
      "hermes",
      'hooks:\n  transform_api_error_classification:\n    - command: "echo forbidden"\n  pre_tool_call:\n    - command: "echo real"\n',
      { env, platform: process.platform },
    );

    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    const hermes = report.agents.find((a) => a.id === "hermes");
    assert.equal(hermes.configuration, "configured");
    assert.equal(hermes.configReasonCode, "hooks_configured");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Fonte real ligada e reconhecida (VALID_HOOKS), mas SEM a tabela de exclusão
// de shell reconhecida: sem ela, o doctor não tem como confirmar se o evento
// catalogado de fato sobrevive ao parser de shell hooks — fica inconclusivo,
// nunca presume um conjunto vazio de exclusões para chegar a "configured".
test("configuration-trust-C8/G3 Hermes: SHELL_UNSUPPORTED_HOOKS não reconhecida/ausente fica unknown/hooks_shell_exclusion_unavailable, nunca configured", () => {
  const scratch = makeScratch("doctor-c8-hermes-shell-exclusao-indisponivel-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, {
      sentinelPath: path.join(scratch, "sentinel.txt"),
      hermesContractSource: hermesPluginsSource({ shellUnsupportedHooksLine: "" }),
    });
    const home = path.join(scratch, "home");
    const env = { PATH: pathEnv(pathDirs), ...homeEnv(home) };
    writeAgentConfig(
      home,
      "hermes",
      'hooks:\n  transform_api_error_classification:\n    - command: "echo forbidden"\n',
      { env, platform: process.platform },
    );

    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    assert.equal(report.status, "partial");
    const hermes = report.agents.find((a) => a.id === "hermes");
    assert.equal(hermes.configuration, "unknown");
    assert.equal(hermes.configReasonCode, "hooks_shell_exclusion_unavailable");
    assert.equal(hermes.trust, "unknown");
    assert.equal(hermes.trustReasonCode, "configuration_not_determined");

    const text = runDoctor([], { env });
    assert.equal(text.status, 0);
    assert.match(text.stdout, /hooks_shell_exclusion_unavailable/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Achado G3 da rodada 3, variante residual (correção após a primeira rodada
// de fixes, .checks/code-review/verifier3-fix-residuals.md): Hermes presente
// e com versão lida (perfil compatível), mas SEM `plugins.py` vinculado —
// `readContractEvidence` devolve `state: "not_found"`, então `hermesValidHooks`
// chega `null` em `readAgentConfiguration`. A correção anterior preservava
// "configured" neste caso (nenhuma fonte para decidir o contrário); isso
// afirmava um registro que ninguém comprovou — o próprio encaminhamento
// original já exigia motivo inconclusivo sem catálogo vinculado. Mesmo
// `installAllAgents` sem `hermesContractSource` (usado em toda esta suíte
// quando o catálogo não é o fato sob teste) reproduz esse estado de verdade.
test("configuration-trust-C8/G3 Hermes: sem plugins.py vinculado (hermesValidHooks null), hooks.made_up_event fica unknown/hooks_catalog_unavailable, nunca configured", () => {
  const scratch = makeScratch("doctor-c8-hermes-sem-catalogo-");
  try {
    const dir = path.join(scratch, "bin");
    const { pathDirs } = installAllAgents(dir, { sentinelPath: path.join(scratch, "sentinel.txt") });
    const home = path.join(scratch, "home");
    const env = { PATH: pathEnv(pathDirs), ...homeEnv(home) };
    writeAgentConfig(home, "hermes", 'hooks:\n  made_up_event:\n    - command: "echo ok"\n', {
      env,
      platform: process.platform,
    });

    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    assert.equal(report.status, "partial");
    const hermes = report.agents.find((a) => a.id === "hermes");
    assert.equal(hermes.version, "0.21.4");
    assert.equal(hermes.configuration, "unknown");
    assert.equal(hermes.configReasonCode, "hooks_catalog_unavailable");
    assert.equal(hermes.trust, "unknown");
    assert.equal(hermes.trustReasonCode, "configuration_not_determined");

    const text = runDoctor([], { env });
    assert.equal(text.status, 0);
    assert.match(text.stdout, /hooks_catalog_unavailable/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Achado 3 da pré-revisão formal da rodada 3 (Landing "Campos opcionais
// tipados do Codex"): um campo opcional conhecido (`timeout`) com tipo errado
// falha a deserialização do documento inteiro no Codex real — o doctor não
// pode chamar isso de configured/complete. Caso concreto do achado.
test("configuration-trust-C8 handler command do Codex com timeout de tipo errado fica invalid no relatório real, nunca configured", () => {
  const scratch = makeScratch("doctor-c8-timeout-tipo-errado-");
  try {
    const home = path.join(scratch, "home");
    const env = homeEnv(home);
    writeAgentConfig(
      home,
      "codex",
      '[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "echo ok"\ntimeout = { bad = true }\n',
    );
    const { status, report } = runDoctorJson([], { env });
    assert.equal(status, 0);
    assert.equal(report.status, "partial");
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "invalid");
    assert.equal(codex.configReasonCode, "hooks_structure_invalid");
    assert.equal(codex.trust, "unknown");
    for (const row of codex.capabilities.filter((r) => r.surface === "cli_local")) {
      assert.equal(row.configuration, "invalid", row.mechanism);
    }

    const text = runDoctor([], { env });
    assert.equal(text.status, 0);
    assert.match(text.stdout, /hooks_structure_invalid/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Achados residuais da revisão formal3 (.checks/code-review/formal3-residual-
// fixes.md, itens 1 e 3; .checks/code-review/formal3-final-residuals.md,
// item 1 para o datetime): `features=true` (bool solto), `features=
// 1979-05-27` (datetime solto, mesmo defeito de container que o bool — ver
// isPlainObject em config-projection.mjs) e `timeout=1.0` em config.toml
// invalidam o documento na fronteira real da CLI, com os mesmos motivos já
// provados na camada pura.
test("configuration-trust-C8 features=true (bool solto), features=1979-05-27 (datetime solto) e timeout=1.0 (float TOML) ficam invalid/partial no relatório real", () => {
  for (const rawText of [
    'features = true\n[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\n',
    'features = 1979-05-27\n[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\n',
    '[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\ntimeout = 1.0\n',
  ]) {
    const scratch = makeScratch("doctor-c8-residual-toml-");
    try {
      const home = path.join(scratch, "home");
      const env = homeEnv(home);
      writeAgentConfig(home, "codex", rawText);
      const { status, report } = runDoctorJson([], { env });
      assert.equal(status, 0, rawText);
      assert.equal(report.status, "partial", rawText);
      const codex = report.agents.find((a) => a.id === "codex");
      assert.equal(codex.configuration, "invalid", rawText);
      assert.equal(codex.trust, "unknown", rawText);

      const text = runDoctor([], { env });
      assert.equal(text.status, 0, rawText);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
});

// Regressão global do achado 3 (.checks/code-review/formal3-toml-document-
// range.md; reprodução da raiz em .checks/code-review/probe-formal3-before-
// global-range.txt): um inteiro fora da faixa i64 numa chave que o doctor
// ignora, ao lado de hooks nativos válidos, aparecia complete/configured. O
// carregador do Codex recusa o documento inteiro (fontes citadas em
// config-projection.unit.test.mjs); a chave e o valor não podem aparecer no
// relatório.
const CODEX_VALID_HOOKS_TOML = '[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\n';

test("configuration-trust-C8 config.toml do Codex com inteiro fora de i64 em chave ignorada ou aninhada fica invalid/config_malformed/partial no relatório real, sem expor chave nem valor", () => {
  const cases = [
    ["ignored_count", "9223372036854775808", `ignored_count = 9223372036854775808\n${CODEX_VALID_HOOKS_TOML}`],
    ["ignored_count", "9223372036854775809", `ignored_count = -9223372036854775809\n${CODEX_VALID_HOOKS_TOML}`],
    [
      "nested_secret",
      "9223372036854775808",
      `${CODEX_VALID_HOOKS_TOML}\n[profiles.nested_secret]\nvalues = [[1, { n = 9223372036854775808 }]]\n`,
    ],
  ];
  for (const [key, digits, rawText] of cases) {
    const scratch = makeScratch("doctor-c8-toml-i64-documento-");
    try {
      const home = path.join(scratch, "home");
      const env = homeEnv(home);
      writeAgentConfig(home, "codex", rawText);
      const { status, stdout, report } = runDoctorJson([], { env });
      assert.equal(status, 0, rawText);
      assert.equal(report.status, "partial", rawText);
      assert.equal(report.agents.length, 3, rawText);
      const codex = report.agents.find((a) => a.id === "codex");
      assert.equal(codex.configuration, "invalid", rawText);
      assert.equal(codex.configReasonCode, "config_malformed", rawText);
      assert.equal(codex.trust, "unknown", rawText);
      for (const id of ["claude", "hermes"]) {
        assert.equal(report.agents.find((a) => a.id === id).configuration, "not_configured", id);
      }
      assert.doesNotMatch(stdout, new RegExp(key), rawText);
      assert.doesNotMatch(stdout, new RegExp(digits), rawText);

      const text = runDoctor([], { env });
      assert.equal(text.status, 0, rawText);
      assert.match(text.stdout, /config_malformed/);
      assert.doesNotMatch(text.stdout, new RegExp(key), rawText);
      assert.doesNotMatch(text.stdout, new RegExp(digits), rawText);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
});

test("configuration-trust-C8 config.toml do Codex com extremos nativos do i64, float e datetime em posições gerais (e timeout=i64::MAX) continua configured/complete no relatório real", () => {
  const scratch = makeScratch("doctor-c8-toml-i64-extremos-");
  try {
    const home = path.join(scratch, "home");
    writeAgentConfig(
      home,
      "codex",
      "ignored_min = -9223372036854775808\nignored_max = 9223372036854775807\nratio = 1.5\n" +
        "when = 1979-05-27T07:32:00Z\nvalues = [[-9223372036854775808, { n = 9223372036854775807, f = 2.5 }]]\n" +
        `${CODEX_VALID_HOOKS_TOML}timeout = 9223372036854775807\n`,
    );
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    assert.equal(report.status, "complete");
    assert.equal(report.agents.length, 3);
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "configured");
    assert.equal(codex.configReasonCode, "hooks_configured");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

function writeCodexHooksJson(home, content) {
  const dir = path.join(home, ".codex");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "hooks.json"), content);
}

// Achado bloqueante da segunda revisão formal (response.json, AC3/AC5):
// `HooksFile` (hook_config.rs, rust-v0.162.1) tem `#[serde(deny_unknown_
// fields)]` na raiz e `description: Option<String>` — um `description` de
// outro tipo falha a deserialização do hooks.json inteiro, mesmo ao lado de
// um handler válido em `hooks`.
test("configuration-trust-C8 hooks.json do Codex com description=42 fica invalid/hooks_file_envelope_invalid no relatório real, partial, preservando os demais", () => {
  const scratch = makeScratch("doctor-c8-hooksjson-envelope-");
  try {
    const home = path.join(scratch, "home");
    writeCodexHooksJson(
      home,
      JSON.stringify({
        description: 42,
        hooks: { PreToolUse: [{ hooks: [{ type: "command", command: "x" }] }] },
      }),
    );
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    assert.equal(report.status, "partial");
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "invalid");
    assert.equal(codex.configReasonCode, "hooks_file_envelope_invalid");
    assert.equal(codex.trust, "unknown");
    for (const id of ["claude", "hermes"]) {
      assert.equal(report.agents.find((a) => a.id === id).configuration, "not_configured", id);
    }

    const text = runDoctor([], { env: homeEnv(home) });
    assert.equal(text.status, 0);
    assert.match(text.stdout, /hooks_file_envelope_invalid/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// `deny_unknown_fields` na raiz rejeita qualquer chave fora de
// description/hooks (hooks_tests.rs, `hooks_file_rejects_events_outside_
// hooks_object`) — um evento colocado na raiz, fora de `hooks`, nunca é
// alcançado pelo Codex real.
test("configuration-trust-C8 hooks.json do Codex com evento na raiz (fora de hooks) fica invalid/hooks_file_envelope_invalid, nunca configured", () => {
  const scratch = makeScratch("doctor-c8-hooksjson-raiz-desconhecida-");
  try {
    const home = path.join(scratch, "home");
    writeCodexHooksJson(
      home,
      JSON.stringify({ SessionStart: [{ hooks: [{ type: "command", command: "x" }] }] }),
    );
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "invalid");
    assert.equal(codex.configReasonCode, "hooks_file_envelope_invalid");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Forma válida preservada: description ausente/nulo/string e hooks
// ausente/vazio continuam configured/not_configured conforme o conteúdo real
// de `hooks`, nunca invalid por causa do envelope.
test("configuration-trust-C8 hooks.json do Codex com description ausente/nulo/string continua válido no relatório real", () => {
  const scratch = makeScratch("doctor-c8-hooksjson-envelope-valido-");
  try {
    const home = path.join(scratch, "home");
    for (const content of [
      {},
      { description: null },
      { description: "gate de revisão" },
      { description: "gate", hooks: { PreToolUse: [{ hooks: [{ type: "command", command: "x" }] }] } },
    ]) {
      writeCodexHooksJson(home, JSON.stringify(content));
      const { status, report } = runDoctorJson([], { env: homeEnv(home) });
      const label = JSON.stringify(content);
      assert.equal(status, 0, label);
      const codex = report.agents.find((a) => a.id === "codex");
      assert.notEqual(codex.configReasonCode, "hooks_file_envelope_invalid", label);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Achado bloqueante da segunda revisão formal (response.json, AC3/AC5):
// `input` (serde_json::Map, desserializador customizado) rejeita `null` em
// qualquer profundidade — objeto raso, aninhado em objeto e aninhado em
// array (hooks_tests.rs, `hooks_file_rejects_mcp_tool_handler_with_null_
// input`) — não só no container externo.
test("configuration-trust-C8 hooks.json do Codex com mcp_tool input contendo null aninhado fica invalid/hooks_structure_invalid no relatório real", () => {
  for (const input of [{ optional: null }, { metadata: { optional: null } }, { values: [null] }]) {
    const scratch = makeScratch("doctor-c8-mcp-input-null-aninhado-");
    try {
      const home = path.join(scratch, "home");
      writeCodexHooksJson(
        home,
        JSON.stringify({
          hooks: {
            PostToolUse: [{ hooks: [{ type: "mcp_tool", server: "security", tool: "scan", input }] }],
          },
        }),
      );
      const { status, report } = runDoctorJson([], { env: homeEnv(home) });
      const label = JSON.stringify(input);
      assert.equal(status, 0, label);
      assert.equal(report.status, "partial", label);
      const codex = report.agents.find((a) => a.id === "codex");
      assert.equal(codex.configuration, "invalid", label);
      assert.equal(codex.configReasonCode, "hooks_structure_invalid", label);
      assert.equal(codex.trust, "unknown", label);

      const text = runDoctor([], { env: homeEnv(home) });
      assert.equal(text.status, 0, label);
      assert.match(text.stdout, /hooks_structure_invalid/);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
});

// Dados válidos preservados: `input` sem `null` em nenhuma profundidade
// continua configured, incluindo valores aninhados reais.
test("configuration-trust-C8 hooks.json do Codex com mcp_tool input aninhado sem null continua configured no relatório real", () => {
  const scratch = makeScratch("doctor-c8-mcp-input-valido-aninhado-");
  try {
    const home = path.join(scratch, "home");
    writeCodexHooksJson(
      home,
      JSON.stringify({
        hooks: {
          PostToolUse: [
            {
              hooks: [
                {
                  type: "mcp_tool",
                  server: "security",
                  tool: "scan",
                  input: { file_path: "x", nested: { ok: true, list: [1, "a", true] } },
                },
              ],
            },
          ],
        },
      }),
    );
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "configured");
    assert.equal(codex.configReasonCode, "hooks_configured");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Achado P2 da revisão formal3 (.checks/code-review/formal3-fixes.md, item 4):
// `hooks.json` com um grupo PreToolUse cuja lista `hooks` tem 300.000 objetos
// vazios (~900 KB, abaixo do limite de 1 MiB) derrubava `matcherGroupHandlers`/
// `inspectMatcherGroupHooks` com `RangeError: Maximum call stack size
// exceeded` (`.push(...array)` espalhado como argumentos) ANTES de qualquer
// classificação — a exceção escapava da leitura de configuração e a CLI
// emitia `failed/internal_error`, `agents: []` e exit 1, perdendo o
// diagnóstico inteiro por causa de UM agente. Esperado: `partial`/exit 0,
// Codex `invalid/hooks_structure_invalid`, e Claude/Hermes/collector
// preservados (isolamento de falha, critério 12).
test("configuration-trust-C12 hooks.json do Codex com 300.000 handlers inválidos (~900 KB) fica partial/exit 0, preservando os 3 agentes e o collector", () => {
  const scratch = makeScratch("doctor-c12-hooks-lista-grande-");
  try {
    const home = path.join(scratch, "home");
    const content = JSON.stringify({ hooks: { PreToolUse: [{ hooks: new Array(300000).fill({}) }] } });
    assert.ok(Buffer.byteLength(content, "utf8") < 1024 * 1024, "fixture precisa caber abaixo de 1 MiB");
    writeCodexHooksJson(home, content);

    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    assert.equal(report.status, "partial");
    assert.equal(report.agents.length, 3);
    assert.deepEqual(
      report.agents.map((a) => a.id).sort(),
      ["claude", "codex", "hermes"],
    );
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "invalid");
    assert.equal(codex.configReasonCode, "hooks_structure_invalid");
    assert.equal(codex.trust, "unknown");
    for (const id of ["claude", "hermes"]) {
      assert.equal(report.agents.find((a) => a.id === id).configuration, "not_configured", id);
    }
    assert.ok(report.collector, "collector precisa continuar presente no envelope");

    const text = runDoctor([], { env: homeEnv(home) });
    assert.equal(text.status, 0);
    assert.match(text.stdout, /hooks_structure_invalid/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Achado residual da revisão formal3 (.checks/code-review/formal3-residual-
// fixes.md, item 2): `timeout=1.0`/`timeout=1e0` em hooks.json são tokens
// decimal/exponencial do JSON — serde_json roteia para `ParserNumber::F64`,
// recusado pelo visitor de `u64`; `JSON.parse` apaga essa distinção lexical
// (vira o mesmo `Number` que `1`), então a checagem real precisa do
// texto-fonte exato na fronteira da CLI, não só na camada pura.
test("configuration-trust-C8 hooks.json do Codex com timeout=1.0/1e0 (token decimal/exponencial) fica invalid/partial no relatório real", () => {
  for (const literal of ["1.0", "1e0"]) {
    const scratch = makeScratch("doctor-c8-timeout-decimal-token-");
    try {
      const home = path.join(scratch, "home");
      writeCodexHooksJson(
        home,
        `{"hooks":{"PreToolUse":[{"hooks":[{"type":"command","command":"echo ok","timeout":${literal}}]}]}}`,
      );
      const { status, report } = runDoctorJson([], { env: homeEnv(home) });
      assert.equal(status, 0, literal);
      assert.equal(report.status, "partial", literal);
      const codex = report.agents.find((a) => a.id === "codex");
      assert.equal(codex.configuration, "invalid", literal);
      assert.equal(codex.configReasonCode, "hooks_structure_invalid", literal);

      const text = runDoctor([], { env: homeEnv(home) });
      assert.equal(text.status, 0, literal);
      assert.match(text.stdout, /hooks_structure_invalid/);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
});

// Resíduo final (.checks/code-review/formal3-final-residuals.md, item 2):
// `timeout=-0` em hooks.json é o mesmo token "float de magnitude zero" que o
// serde_json real recusa para `Option<u64>` (de.rs::parse_number, ver
// config-projection.unit.test.mjs para a citação completa da fonte) —
// precisa invalidar na fronteira real da CLI, não só na camada pura.
test("configuration-trust-C8 hooks.json do Codex com timeout=-0 fica invalid/partial no relatório real", () => {
  const scratch = makeScratch("doctor-c8-timeout-negative-zero-");
  try {
    const home = path.join(scratch, "home");
    writeCodexHooksJson(
      home,
      '{"hooks":{"PreToolUse":[{"hooks":[{"type":"command","command":"echo ok","timeout":-0}]}]}}',
    );
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    assert.equal(report.status, "partial");
    const codex = report.agents.find((a) => a.id === "codex");
    assert.equal(codex.configuration, "invalid");
    assert.equal(codex.configReasonCode, "hooks_structure_invalid");

    const text = runDoctor([], { env: homeEnv(home) });
    assert.equal(text.status, 0);
    assert.match(text.stdout, /hooks_structure_invalid/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Regressão compartilhada da revisão formal3 (.checks/code-review/formal3-
// shared-projection-regression.md; reprodução da raiz em .checks/code-review/
// probe-formal3-shared-features.txt, cenário claude-irrelevant-features-null):
// `features: null` num settings.json do Claude válido derrubava o relatório
// inteiro (`failed`, `agents: []`, exit 1). `features` é contrato só do Codex;
// Claude/Hermes nunca lançam nem herdam motivo dele, e o Codex com `features`
// inválido continua isolado como invalid/partial, com os 3 agentes.
const CLAUDE_VALID_HOOKS = { hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "x" }] }] } };

test("configuration-trust-C12 settings.json do Claude válido com features:null, demais agentes sem config, fica complete/exit 0 com os 3 agentes", () => {
  const scratch = makeScratch("doctor-c12-claude-features-null-");
  try {
    const home = path.join(scratch, "home");
    writeAgentConfig(home, "claude", JSON.stringify({ ...CLAUDE_VALID_HOOKS, features: null }));
    const { status, report } = runDoctorJson([], { env: homeEnv(home) });
    assert.equal(status, 0);
    assert.equal(report.status, "complete");
    assert.equal(report.agents.length, 3);
    const claude = report.agents.find((a) => a.id === "claude");
    assert.equal(claude.configuration, "configured");
    assert.equal(claude.configReasonCode, "hooks_configured");

    const text = runDoctor([], { env: homeEnv(home) });
    assert.equal(text.status, 0);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("configuration-trust-C12 features null/escalar/mapa no Claude e no Hermes não derruba nem herda motivo do Codex; Codex com features inválido continua invalid/partial com 3 agentes", () => {
  const cases = [
    [null, "null"],
    ["yes", "1"],
    [{ hooks: false }, "\n  hooks: false"],
    [{ hooks: "yes", codex_hooks: true }, '\n  hooks: "yes"\n  codex_hooks: true'],
  ];
  for (const [claudeFeatures, hermesFeatures] of cases) {
    const label = JSON.stringify(claudeFeatures);
    const scratch = makeScratch("doctor-c12-features-alheio-");
    try {
      const home = path.join(scratch, "home");
      const env = homeEnv(home);
      writeAgentConfig(home, "claude", JSON.stringify({ ...CLAUDE_VALID_HOOKS, features: claudeFeatures }));
      writeAgentConfig(home, "hermes", `hooks_auto_accept: true\nfeatures: ${hermesFeatures}\n`, {
        env,
        platform: process.platform,
      });
      writeAgentConfig(home, "codex", `features = "yes"\n${CODEX_VALID_HOOKS_TOML}`);

      const { status, report } = runDoctorJson([], { env });
      assert.equal(status, 0, label);
      assert.equal(report.status, "partial", label);
      assert.equal(report.agents.length, 3, label);
      const claude = report.agents.find((a) => a.id === "claude");
      assert.equal(claude.configuration, "configured", label);
      assert.equal(claude.configReasonCode, "hooks_configured", label);
      const hermes = report.agents.find((a) => a.id === "hermes");
      assert.equal(hermes.configuration, "not_configured", label);
      assert.equal(hermes.configReasonCode, "no_config_found", label);
      const codex = report.agents.find((a) => a.id === "codex");
      assert.equal(codex.configuration, "invalid", label);
      assert.equal(codex.configReasonCode, "features_hooks_flag_invalid_type", label);
      assert.equal(codex.trust, "unknown", label);

      const text = runDoctor([], { env });
      assert.equal(text.status, 0, label);
      assert.match(text.stdout, /features_hooks_flag_invalid_type/, label);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
});
