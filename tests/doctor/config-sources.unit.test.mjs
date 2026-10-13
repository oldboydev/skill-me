// C8/C16 — os caminhos de configuração seguem a semântica da `platform`
// recebida, não o `path` nativo do processo que roda o teste: com
// `platform: "win32"` o resultado usa separador e junção do Windows em
// qualquer runner (Windows, Linux ou macOS), e com `linux`/`darwin` usa os do
// POSIX. Por isso cada asserção compara com um literal exato do contrato,
// nunca com `path.join` do executor (que daria `C:\...\Local/hermes` num
// runner POSIX, ou `\home\...` no Windows).
//
// Fonte do default do Hermes no Windows: instalação local lida apenas como
// texto (hermes_constants.py, `_get_platform_default_hermes_home` e
// `get_hermes_home`) — %LOCALAPPDATA%/hermes, com fallback para
// <HOME>/AppData/Local/hermes quando LOCALAPPDATA está vazio; HERMES_HOME
// tem prioridade e aponta para o home exato, sem sufixo adicional.
import assert from "node:assert/strict";
import test from "node:test";
import {
  CLAUDE_MANAGED_SETTINGS_PATH,
  claudeConfigScopes,
  claudeHome,
  codexConfigScopes,
  codexHome,
  hermesConfigScopes,
  hermesHome,
} from "../../src/doctor/config-sources.mjs";

test("config-sources-C8 hermesHome no Windows usa %LOCALAPPDATA%/hermes quando definido", () => {
  const home = hermesHome({
    env: { LOCALAPPDATA: "C:\\Users\\alguem\\AppData\\Local" },
    platform: "win32",
  });
  assert.equal(home, "C:\\Users\\alguem\\AppData\\Local\\hermes");
});

test("config-sources-C8 hermesHome no Windows cai para <HOME>/AppData/Local/hermes sem LOCALAPPDATA", () => {
  for (const env of [
    { USERPROFILE: "C:\\Users\\alguem" },
    { USERPROFILE: "C:\\Users\\alguem", LOCALAPPDATA: "   " },
  ]) {
    const home = hermesHome({ env, platform: "win32" });
    assert.equal(home, "C:\\Users\\alguem\\AppData\\Local\\hermes", JSON.stringify(env));
  }
});

test("config-sources-C8 HERMES_HOME continua tendo prioridade sobre o default do Windows", () => {
  const home = hermesHome({
    env: { HERMES_HOME: "C:\\custom\\hermes-home", LOCALAPPDATA: "C:\\Users\\alguem\\AppData\\Local" },
    platform: "win32",
  });
  assert.equal(home, "C:\\custom\\hermes-home");
});

test("config-sources-C8 hermesHome fora do Windows usa <HOME>/.hermes com separador POSIX (linux e darwin)", () => {
  for (const platform of ["linux", "darwin"]) {
    const home = hermesHome({ env: { HOME: "/home/alguem", LOCALAPPDATA: "C:\\ignorado" }, platform });
    assert.equal(home, "/home/alguem/.hermes", platform);
  }
});

test("config-sources-C8 caminhos de config do Hermes, Claude e Codex seguem a plataforma informada nos três SOs", () => {
  const cases = [
    {
      platform: "win32",
      env: { USERPROFILE: "C:\\Users\\alguem", LOCALAPPDATA: "C:\\Users\\alguem\\AppData\\Local" },
      cwd: "C:\\projeto",
      hermes: "C:\\Users\\alguem\\AppData\\Local\\hermes\\config.yaml",
      claudeUser: "C:\\Users\\alguem\\.claude\\settings.json",
      claudeProjectLocal: "C:\\projeto\\.claude\\settings.local.json",
      codexUserToml: "C:\\Users\\alguem\\.codex\\config.toml",
      codexProjectHooks: "C:\\projeto\\.codex\\hooks.json",
    },
    {
      platform: "linux",
      env: { HOME: "/home/alguem" },
      cwd: "/srv/projeto",
      hermes: "/home/alguem/.hermes/config.yaml",
      claudeUser: "/home/alguem/.claude/settings.json",
      claudeProjectLocal: "/srv/projeto/.claude/settings.local.json",
      codexUserToml: "/home/alguem/.codex/config.toml",
      codexProjectHooks: "/srv/projeto/.codex/hooks.json",
    },
    {
      platform: "darwin",
      env: { HOME: "/Users/alguem" },
      cwd: "/Users/alguem/projeto",
      hermes: "/Users/alguem/.hermes/config.yaml",
      claudeUser: "/Users/alguem/.claude/settings.json",
      claudeProjectLocal: "/Users/alguem/projeto/.claude/settings.local.json",
      codexUserToml: "/Users/alguem/.codex/config.toml",
      codexProjectHooks: "/Users/alguem/projeto/.codex/hooks.json",
    },
  ];
  for (const c of cases) {
    const { platform, env, cwd } = c;
    const [hermesScope] = hermesConfigScopes({ home: hermesHome({ env, platform }), platform });
    assert.equal(hermesScope.path, c.hermes, platform);

    const claudeScopes = claudeConfigScopes({ home: claudeHome({ env, platform }), cwd, platform });
    assert.equal(claudeScopes.find((s) => s.scope === "user").path, c.claudeUser, platform);
    assert.equal(
      claudeScopes.find((s) => s.scope === "project_local").path,
      c.claudeProjectLocal,
      platform,
    );

    const codexScopes = codexConfigScopes({ home: codexHome({ env, platform }), cwd, platform });
    assert.equal(
      codexScopes.find((s) => s.scope === "user" && s.format === "toml").path,
      c.codexUserToml,
      platform,
    );
    assert.equal(
      codexScopes.find((s) => s.scope === "project" && s.format === "json").path,
      c.codexProjectHooks,
      platform,
    );
  }
});

// --- P2 nº3 da revisão formal8 (.checks/code-review/issue-3-formal8-
// response.json): HOME/USERPROFILE ausente ou vazio, sem override, não pode
// lançar — o home do SO fica indeterminável (null), nunca presumido como o
// cwd da execução diagnosticada.
test("config-sources-formal8-3 HOME/USERPROFILE ausente ou vazio, sem override, deixa o home indeterminável (null) para os três agentes, sem lançar", () => {
  for (const env of [{}, { USERPROFILE: "" }]) {
    assert.equal(claudeHome({ env, platform: "win32" }), null, JSON.stringify(env));
    assert.equal(codexHome({ env, platform: "win32" }), null, JSON.stringify(env));
  }
  for (const platform of ["linux", "darwin"]) {
    for (const env of [{}, { HOME: "" }]) {
      assert.equal(claudeHome({ env, platform }), null, `${platform}/${JSON.stringify(env)}`);
      assert.equal(codexHome({ env, platform }), null, `${platform}/${JSON.stringify(env)}`);
    }
  }
  assert.equal(hermesHome({ env: {}, platform: "linux" }), null);
  assert.equal(hermesHome({ env: { HOME: "" }, platform: "darwin" }), null);
  // Windows: sem LOCALAPPDATA (ausente ou só espaço, já tratado) e sem
  // USERPROFILE para o fallback, o default do Hermes também fica
  // indeterminável — nunca lança.
  assert.equal(hermesHome({ env: {}, platform: "win32" }), null);
  assert.equal(hermesHome({ env: { LOCALAPPDATA: "   " }, platform: "win32" }), null);
});

test("config-sources-formal8-3 overrides (CLAUDE_CONFIG_DIR/CODEX_HOME/HERMES_HOME, LOCALAPPDATA do Hermes no Windows) continuam funcionando sem HOME/USERPROFILE", () => {
  assert.equal(claudeHome({ env: { CLAUDE_CONFIG_DIR: "/opt/claude-cfg" }, platform: "linux" }), "/opt/claude-cfg");
  assert.equal(codexHome({ env: { CODEX_HOME: "/opt/codex-home" }, platform: "linux" }), "/opt/codex-home");
  assert.equal(hermesHome({ env: { HERMES_HOME: "/opt/hermes-home" }, platform: "linux" }), "/opt/hermes-home");
  assert.equal(
    hermesHome({ env: { LOCALAPPDATA: "C:\\Users\\alguem\\AppData\\Local" }, platform: "win32" }),
    "C:\\Users\\alguem\\AppData\\Local\\hermes",
  );
});

test("config-sources-formal8-3 home indeterminável (null) marca só os escopos de usuário como locationUnknown, preservando managed/projeto", () => {
  const claudeScopes = claudeConfigScopes({ home: null, cwd: "/projeto", platform: "linux" });
  const claudeUser = claudeScopes.find((s) => s.scope === "user");
  assert.equal(claudeUser.path, null);
  assert.equal(claudeUser.locationUnknown, true);
  assert.equal(claudeScopes.find((s) => s.scope === "managed").path, CLAUDE_MANAGED_SETTINGS_PATH.linux);
  assert.equal(
    claudeScopes.find((s) => s.scope === "project_local").path,
    "/projeto/.claude/settings.local.json",
  );

  const codexScopes = codexConfigScopes({ home: null, cwd: "/projeto", platform: "linux" });
  for (const scope of codexScopes.filter((s) => s.scope === "user")) {
    assert.equal(scope.path, null, scope.format);
    assert.equal(scope.locationUnknown, true, scope.format);
  }
  assert.equal(
    codexScopes.find((s) => s.scope === "project" && s.format === "json").path,
    "/projeto/.codex/hooks.json",
  );

  const hermesScopes = hermesConfigScopes({ home: null, platform: "linux" });
  assert.equal(hermesScopes.length, 1);
  assert.equal(hermesScopes[0].path, null);
  assert.equal(hermesScopes[0].locationUnknown, true);
});

test("config-sources-C8 CLAUDE_CONFIG_DIR e CODEX_HOME apontam para o home exato, sem sufixo adicional", () => {
  assert.equal(
    claudeHome({ env: { CLAUDE_CONFIG_DIR: "/opt/claude-cfg", HOME: "/home/alguem" }, platform: "linux" }),
    "/opt/claude-cfg",
  );
  assert.equal(
    codexHome({ env: { CODEX_HOME: "C:\\codex-home", USERPROFILE: "C:\\Users\\alguem" }, platform: "win32" }),
    "C:\\codex-home",
  );
});
