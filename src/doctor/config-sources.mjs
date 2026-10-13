import path from "node:path";

// Caminhos reais de managed-settings.json por SO, documentados em
// https://code.claude.com/docs/en/managed-settings (consulta 13/10/2026).
// Claude Code ignora o caminho legado %ProgramData%; não o lemos.
export const CLAUDE_MANAGED_SETTINGS_PATH = {
  darwin: "/Library/Application Support/ClaudeCode/managed-settings.json",
  linux: "/etc/claude-code/managed-settings.json",
  win32: "C:\\Program Files\\ClaudeCode\\managed-settings.json",
};

// A junção segue a plataforma recebida, não o `path` nativo do processo:
// em produção as duas coincidem (platform = process.platform), mas um
// caminho do Windows montado com path.posix (ou o inverso) misturaria
// separadores e apontaria para um arquivo que o agente nunca leria.
function pathFor(platform) {
  return platform === "win32" ? path.win32 : path.posix;
}

function homeDir({ env, platform }) {
  return platform === "win32" ? env.USERPROFILE : env.HOME;
}

export function claudeHome({ env, platform }) {
  if (env.CLAUDE_CONFIG_DIR) return env.CLAUDE_CONFIG_DIR;
  return pathFor(platform).join(homeDir({ env, platform }), ".claude");
}

// Ordem de maior para menor precedência (gerenciado > local do projeto >
// compartilhado do projeto > usuário), conforme a página de precedência de
// settings da Claude Code.
export function claudeConfigScopes({ home, cwd, platform }) {
  const { join } = pathFor(platform);
  return [
    { scope: "managed", path: CLAUDE_MANAGED_SETTINGS_PATH[platform], format: "json" },
    { scope: "project_local", path: join(cwd, ".claude", "settings.local.json"), format: "json" },
    { scope: "project_shared", path: join(cwd, ".claude", "settings.json"), format: "json" },
    { scope: "user", path: join(home, "settings.json"), format: "json" },
  ];
}

export function codexHome({ env, platform }) {
  if (env.CODEX_HOME) return env.CODEX_HOME;
  return pathFor(platform).join(homeDir({ env, platform }), ".codex");
}

// Codex carrega hooks.json e as tabelas [hooks] de config.toml lado a lado
// (aditivo, nunca substituição); o projeto só é ativo quando confiável, algo
// que o doctor não determina por leitura estática — ver docs/agent-
// compatibility.md para a lacuna declarada.
export function codexConfigScopes({ home, cwd, platform }) {
  const { join } = pathFor(platform);
  return [
    { scope: "project", path: join(cwd, ".codex", "hooks.json"), format: "json" },
    { scope: "project", path: join(cwd, ".codex", "config.toml"), format: "toml" },
    { scope: "user", path: join(home, "hooks.json"), format: "json" },
    { scope: "user", path: join(home, "config.toml"), format: "toml" },
  ];
}

// A ausência de menção a LOCALAPPDATA na documentação pública do Hermes não
// prova a ausência do comportamento. Fonte primária local (lida apenas como
// texto, nunca importada/executada): hermes_constants.py,
// `_get_platform_default_hermes_home` e `get_hermes_home` — no Windows, o
// default nativo é %LOCALAPPDATA%/hermes, com fallback para
// <HOME>/AppData/Local/hermes quando LOCALAPPDATA está vazio; HERMES_HOME
// (override) continua tendo prioridade sobre os dois e aponta para o home
// exato, sem sufixo adicional. Nenhum caminho é fixado a uma máquina
// específica.
export function hermesHome({ env, platform }) {
  if (env.HERMES_HOME) return env.HERMES_HOME;
  const { join } = pathFor(platform);
  if (platform === "win32") {
    const localAppData = env.LOCALAPPDATA?.trim();
    const base = localAppData ? localAppData : join(homeDir({ env, platform }), "AppData", "Local");
    return join(base, "hermes");
  }
  return join(homeDir({ env, platform }), ".hermes");
}

export function hermesConfigScopes({ home, platform }) {
  return [{ scope: "user", path: pathFor(platform).join(home, "config.yaml"), format: "yaml" }];
}
