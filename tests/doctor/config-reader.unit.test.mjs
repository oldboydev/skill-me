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
  codexConfigScopes,
  codexHome,
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
