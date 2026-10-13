// C8 — precedência de escopo é diferente de uma definição aditiva. Provado
// com um adaptador de filesystem em memória (mesmo padrão de
// mid-read-mutation.unit.test.mjs), já que o caminho de managed-settings.json
// é fixo por SO e não pode ser escrito por este teste.
import assert from "node:assert/strict";
import test from "node:test";
import { readAgentConfiguration } from "../../src/doctor/config-reader.mjs";
import {
  CLAUDE_MANAGED_SETTINGS_PATH,
  claudeConfigScopes,
  claudeHome,
  codexConfigScopes,
  codexHome,
  hermesConfigScopes,
  hermesHome,
} from "../../src/doctor/config-sources.mjs";

function fsWithFiles(filesByPath) {
  return {
    async stat(filePath) {
      if (!(filePath in filesByPath)) {
        const error = new Error("ENOENT");
        error.code = "ENOENT";
        throw error;
      }
      return { size: Buffer.byteLength(filesByPath[filePath]) };
    },
    async readFile(filePath) {
      if (!(filePath in filesByPath)) {
        const error = new Error("ENOENT");
        error.code = "ENOENT";
        throw error;
      }
      return Buffer.from(filesByPath[filePath]);
    },
  };
}

// Para Claude: allowManagedHooksOnly restringe hooks NÃO gerenciados, não
// desativa os hooks gerenciados que o próprio escopo managed já define.
test("config-reader-C9 managed com hooks válidos + allowManagedHooksOnly fica configured, nunca disabled globalmente", async () => {
  const home = "/fixture/home";
  const cwd = "/fixture/cwd";
  const platform = "linux";
  const managedPath = CLAUDE_MANAGED_SETTINGS_PATH[platform];
  const scopes = claudeConfigScopes({ home, cwd, platform });
  const userPath = scopes.find((s) => s.scope === "user").path;

  const fs = fsWithFiles({
    [managedPath]: JSON.stringify({
      hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "x" }] }] },
      allowManagedHooksOnly: true,
    }),
    [userPath]: JSON.stringify({ hooks: { PreToolUse: [{ matcher: "*", hooks: [] }] } }),
  });

  const result = await readAgentConfiguration({
    agentId: "claude",
    env: { HOME: home, USERPROFILE: home },
    platform,
    cwd,
    fs,
  });
  assert.equal(result.configuration, "configured");
  assert.notEqual(result.configuration, "disabled");
});

test("config-reader-C9 managed só com allowManagedHooksOnly (sem hooks próprios) continua bloqueando hooks não gerenciados", async () => {
  const home = "/fixture/home2";
  const cwd = "/fixture/cwd2";
  const platform = "linux";
  const managedPath = CLAUDE_MANAGED_SETTINGS_PATH[platform];
  const scopes = claudeConfigScopes({ home, cwd, platform });
  const userPath = scopes.find((s) => s.scope === "user").path;

  const fs = fsWithFiles({
    [managedPath]: JSON.stringify({ allowManagedHooksOnly: true }),
    [userPath]: JSON.stringify({ hooks: { PreToolUse: [{ matcher: "*", hooks: [] }] } }),
  });

  const result = await readAgentConfiguration({
    agentId: "claude",
    env: { HOME: home, USERPROFILE: home },
    platform,
    cwd,
    fs,
  });
  assert.equal(result.configuration, "disabled");
  assert.equal(result.configReasonCode, "hooks_blocked_by_managed_policy");
});

// Para Codex: hooks são aditivos, mas um escopo de projeto só é efetivo se
// o projeto for confiável — algo que o doctor não determina por leitura
// estática. Um `features.hooks = false` de projeto não pode ser lido como
// desativação confiante; vira unknown, não disabled.
test("config-reader-C9 features.hooks=false do Codex em escopo de PROJETO fica unknown (confiança de projeto não determinada)", async () => {
  const home = "/fixture/codex-home";
  const cwd = "/fixture/codex-project";
  const platform = "linux";
  const scopes = codexConfigScopes({ home: codexHome({ env: { HOME: home }, platform }), cwd, platform });
  const projectConfigPath = scopes.find((s) => s.scope === "project" && s.format === "toml").path;

  const fs = fsWithFiles({
    [projectConfigPath]: "[features]\nhooks = false\n",
  });

  const result = await readAgentConfiguration({
    agentId: "codex",
    env: { HOME: home, USERPROFILE: home },
    platform,
    cwd,
    fs,
  });
  assert.equal(result.configuration, "unknown");
  assert.equal(result.configReasonCode, "policy_precedence_undetermined");
});

test("config-reader-C9 features.hooks=false do Codex em escopo de USUÁRIO continua disabled (não gated por confiança de projeto)", async () => {
  const home = "/fixture/codex-home2";
  const cwd = "/fixture/codex-project2";
  const platform = "linux";
  const scopes = codexConfigScopes({ home: codexHome({ env: { HOME: home }, platform }), cwd, platform });
  const userConfigPath = scopes.find((s) => s.scope === "user" && s.format === "toml").path;

  const fs = fsWithFiles({
    [userConfigPath]: "[features]\nhooks = false\n[hooks]\nPreToolUse = []\n",
  });

  const result = await readAgentConfiguration({
    agentId: "codex",
    env: { HOME: home, USERPROFILE: home },
    platform,
    cwd,
    fs,
  });
  assert.equal(result.configuration, "disabled");
  assert.equal(result.configReasonCode, "features_hooks_disabled");
});

// Regressão: hooks definidos são aditivos entre camadas, mas a feature flag
// não é um OR aditivo de "false" — um "true" explícito de PROJETO poderia
// sobrepor o "false" de usuário se o projeto fosse confiável, algo que o
// doctor não determina por leitura estática. Antes desta correção, o "true"
// de projeto não era tratado como endereçamento da chave (só "false" virava
// unknown), então a iteração continuava até o "false" de usuário e resolvia
// "disabled" — ignorando que o projeto já havia afirmado o oposto. O
// conflito correto é unknown, nunca disabled nem configured por suposição.
test("config-reader-C9 features.hooks=true do Codex em PROJETO + false em USUÁRIO fica unknown (conflito de confiança indeterminada)", async () => {
  const home = "/fixture/codex-home3";
  const cwd = "/fixture/codex-project3";
  const platform = "linux";
  const scopes = codexConfigScopes({ home: codexHome({ env: { HOME: home }, platform }), cwd, platform });
  const projectConfigPath = scopes.find((s) => s.scope === "project" && s.format === "toml").path;
  const userConfigPath = scopes.find((s) => s.scope === "user" && s.format === "toml").path;

  const fs = fsWithFiles({
    [projectConfigPath]: "[features]\nhooks = true\n",
    [userConfigPath]: "[features]\nhooks = false\n[hooks]\nPreToolUse = []\n",
  });

  const result = await readAgentConfiguration({
    agentId: "codex",
    env: { HOME: home, USERPROFILE: home },
    platform,
    cwd,
    fs,
  });
  assert.equal(result.configuration, "unknown");
  assert.equal(result.configReasonCode, "policy_precedence_undetermined");
  assert.notEqual(result.configuration, "disabled");
});

// Achado formal 6 — JSON válido com seção de hooks estruturalmente inválida
// precisa chegar ao relatório como `invalid` (e daí `partial`), nunca
// `configured/hooks_configured`.
test("config-reader-C8 settings.json do Claude com hooks:{PreToolUse:42} ou hooks:[\"invalid\"] fica invalid/hooks_structure_invalid", async () => {
  const home = "/fixture/claude-home-invalid";
  const cwd = "/fixture/claude-project-invalid";
  const platform = "linux";
  const userPath = claudeConfigScopes({ home: claudeHome({ env: { HOME: home }, platform }), cwd, platform }).find(
    (s) => s.scope === "user",
  ).path;
  for (const content of [{ hooks: { PreToolUse: 42 } }, { hooks: ["invalid"] }]) {
    const result = await readAgentConfiguration({
      agentId: "claude",
      env: { HOME: home, USERPROFILE: home },
      platform,
      cwd,
      fs: fsWithFiles({ [userPath]: JSON.stringify(content) }),
    });
    assert.equal(result.configuration, "invalid", JSON.stringify(content));
    assert.equal(result.configReasonCode, "hooks_structure_invalid", JSON.stringify(content));
    assert.equal(result.trust, "unknown");
  }
});

// O Codex grava o registro de revisão dos hooks em `[hooks.state]` do
// config.toml do usuário enquanto os handlers ficam em hooks.json (layout
// observado localmente). A tabela reservada não pode tornar o config.toml
// inválido nem contar como hook definido.
test("config-reader-C8 Codex com só [hooks.state] no config.toml e handlers em hooks.json fica configured pelo hooks.json", async () => {
  const home = "/fixture/codex-home-state";
  const cwd = "/fixture/codex-project-state";
  const platform = "linux";
  const scopes = codexConfigScopes({ home: codexHome({ env: { HOME: home }, platform }), cwd, platform });
  const userToml = scopes.find((s) => s.scope === "user" && s.format === "toml").path;
  const userHooksJson = scopes.find((s) => s.scope === "user" && s.format === "json").path;

  const onlyState = await readAgentConfiguration({
    agentId: "codex",
    env: { HOME: home },
    platform,
    cwd,
    fs: fsWithFiles({ [userToml]: "[hooks.state.'x:pre_tool_use:0:0']\n" }),
  });
  assert.equal(onlyState.configuration, "not_configured");

  const withHandlers = await readAgentConfiguration({
    agentId: "codex",
    env: { HOME: home },
    platform,
    cwd,
    fs: fsWithFiles({
      [userToml]: "[hooks.state.'x:pre_tool_use:0:0']\n",
      [userHooksJson]: JSON.stringify({
        description: "fixture",
        hooks: { PreToolUse: [{ matcher: "^Bash$", hooks: [{ type: "command", command: "x" }] }] },
      }),
    }),
  });
  assert.equal(withHandlers.configuration, "configured");
  assert.equal(withHandlers.configReasonCode, "hooks_configured");
});

// Pré-revisão da forma nativa: um tipo de handler fora da fonte consultada
// não pode virar configured nem trusted, nem ser coberto por handlers
// válidos de outro escopo do Codex (os escopos são aditivos e o arquivo
// inconclusivo ainda poderia trazer features.hooks).
test("config-reader-C8 tipo de handler não reconhecido em um escopo fica unknown com motivo e sem confiança", async () => {
  const home = "/fixture/codex-home-tipo";
  const cwd = "/fixture/codex-project-tipo";
  const platform = "linux";
  const scopes = codexConfigScopes({ home: codexHome({ env: { HOME: home }, platform }), cwd, platform });
  const projectHooksJson = scopes.find((s) => s.scope === "project" && s.format === "json").path;
  const userToml = scopes.find((s) => s.scope === "user" && s.format === "toml").path;

  const result = await readAgentConfiguration({
    agentId: "codex",
    env: { HOME: home },
    platform,
    cwd,
    fs: fsWithFiles({
      [projectHooksJson]: JSON.stringify({
        hooks: { PreToolUse: [{ hooks: [{ type: "command", command: "x" }] }] },
      }),
      [userToml]: '[[hooks.Stop]]\n[[hooks.Stop.hooks]]\ntype = "future_kind"\n',
    }),
  });
  assert.equal(result.configuration, "unknown");
  assert.equal(result.configReasonCode, "hooks_handler_type_unrecognized");
  assert.equal(result.trust, "unknown");
  assert.equal(result.trustReasonCode, "configuration_not_determined");
});

test("config-reader-C8 Codex recebe a plataforma do leitor para escolher o comando efetivo (command_windows no Windows)", async () => {
  const handlers = JSON.stringify({
    hooks: { PreToolUse: [{ hooks: [{ type: "command", command: "", command_windows: "x.cmd" }] }] },
  });
  const expected = { win32: "configured", linux: "not_configured" };
  for (const [platform, configuration] of Object.entries(expected)) {
    const env = platform === "win32" ? { USERPROFILE: "C:\\fixture\\home" } : { HOME: "/fixture/home" };
    const cwd = platform === "win32" ? "C:\\fixture\\cwd" : "/fixture/cwd";
    const scopes = codexConfigScopes({ home: codexHome({ env, platform }), cwd, platform });
    const userHooksJson = scopes.find((s) => s.scope === "user" && s.format === "json").path;
    const result = await readAgentConfiguration({
      agentId: "codex",
      env,
      platform,
      cwd,
      fs: fsWithFiles({ [userHooksJson]: handlers }),
    });
    assert.equal(result.configuration, configuration, platform);
  }
});

// Achado G3 da rodada 3, variante residual (encaminhamento pós-primeira
// correção, .checks/code-review/verifier3-fix-residuals.md): sem o catálogo
// VALID_HOOKS vinculado (hermesValidHooks null — presença ausente, versão
// fora do perfil, ou plugins.py ilegível/ausente/não reconhecido), nenhum
// nome de evento pode ser confirmado contra a instalação real. A primeira
// correção (637abc9) só decidia quando o catálogo FOI lido; preservar
// "configured" quando ele falta afirmaria um registro que ninguém comprovou,
// contradizendo o próprio encaminhamento original ("mantenha motivo
// inconclusivo e prove o caso"). Um evento com nome plausível (`pre_tool_call`,
// já documentado) não muda isso: sem a tabela real desta instalação, o doctor
// não tem como saber se ESTE Hermes a reconhece — "parece real" não é fonte.
function hermesConfigPath(home, platform) {
  return hermesConfigScopes({ home: hermesHome({ env: { HOME: home, USERPROFILE: home }, platform }), platform })[0]
    .path;
}

test("config-reader-G3 Hermes sem catálogo vinculado (hermesValidHooks null) com evento configurado fica unknown/hooks_catalog_unavailable, nunca configured", async () => {
  const home = "/fixture/hermes-sem-catalogo";
  const platform = "linux";
  const configPath = hermesConfigPath(home, platform);

  for (const hooksYaml of [
    'hooks:\n  made_up_event:\n    - command: "echo ok"\n',
    'hooks:\n  pre_tool_call:\n    - command: "echo ok"\n',
  ]) {
    const result = await readAgentConfiguration({
      agentId: "hermes",
      env: { HOME: home, USERPROFILE: home },
      platform,
      cwd: "/fixture/cwd",
      fs: fsWithFiles({ [configPath]: hooksYaml }),
      hermesValidHooks: null,
    });
    assert.equal(result.configuration, "unknown", hooksYaml);
    assert.equal(result.configReasonCode, "hooks_catalog_unavailable", hooksYaml);
    assert.equal(result.trust, "unknown", hooksYaml);
    assert.equal(result.trustReasonCode, "configuration_not_determined", hooksYaml);
  }
});

// Preserva o que já decidia antes desta correção: `not_configured` (sem
// handler nenhum) e `invalid` (erro nativo de forma) não passam pelo
// cruzamento de catálogo — o novo ramo só se aplica depois que a forma
// estrutural já decidiu "configured".
test("config-reader-G3 Hermes sem catálogo vinculado preserva not_configured (sem handler) e invalid (forma errada), nunca os rebaixa para unknown", async () => {
  const home = "/fixture/hermes-sem-catalogo-outros";
  const platform = "linux";
  const configPath = hermesConfigPath(home, platform);

  const semHandler = await readAgentConfiguration({
    agentId: "hermes",
    env: { HOME: home, USERPROFILE: home },
    platform,
    cwd: "/fixture/cwd",
    fs: fsWithFiles({ [configPath]: "hooks:\n  pre_tool_call: null\n" }),
    hermesValidHooks: null,
  });
  assert.equal(semHandler.configuration, "not_configured");

  const formaInvalida = await readAgentConfiguration({
    agentId: "hermes",
    env: { HOME: home, USERPROFILE: home },
    platform,
    cwd: "/fixture/cwd",
    fs: fsWithFiles({ [configPath]: "hooks:\n  pre_tool_call: 42\n" }),
    hermesValidHooks: null,
  });
  assert.equal(formaInvalida.configuration, "invalid");
  assert.equal(formaInvalida.configReasonCode, "hooks_structure_invalid");
});
