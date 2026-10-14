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

// null quando HOME/USERPROFILE está ausente ou vazio: a localização do home
// do SO não é determinável por leitura, nunca presumida como o cwd da
// execução diagnosticada (revisão formal8, achado 3).
function homeDir({ env, platform }) {
  const raw = platform === "win32" ? env.USERPROFILE : env.HOME;
  return raw ? raw : null;
}

export function claudeHome({ env, platform }) {
  if (env.CLAUDE_CONFIG_DIR) return env.CLAUDE_CONFIG_DIR;
  const home = homeDir({ env, platform });
  return home === null ? null : pathFor(platform).join(home, ".claude");
}

// Um escopo cujo caminho depende do home do SO vira `locationUnknown` quando
// esse home não é determinável: `path: null` sinaliza para readScope
// (config-reader.mjs) não tentar nenhum acesso a filesystem, nunca presumir
// ausência nem lançar. Escopos que não dependem de home (managed, de
// projeto) continuam intactos (revisão formal8, achado 3) — sua presença não
// prova a ausência do escopo de home desconhecido, só mergeConfigScopes
// decide isso pela ordem de precedência real.
function userScope(home, buildPath, format) {
  return home === null
    ? { scope: "user", path: null, format, locationUnknown: true }
    : { scope: "user", path: buildPath(home), format };
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
    userScope(home, (h) => join(h, "settings.json"), "json"),
  ];
}

export function codexHome({ env, platform }) {
  if (env.CODEX_HOME) return env.CODEX_HOME;
  const home = homeDir({ env, platform });
  return home === null ? null : pathFor(platform).join(home, ".codex");
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
    userScope(home, (h) => join(h, "hooks.json"), "json"),
    userScope(home, (h) => join(h, "config.toml"), "toml"),
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
    if (localAppData) return join(localAppData, "hermes");
    const home = homeDir({ env, platform });
    return home === null ? null : join(home, "AppData", "Local", "hermes");
  }
  const home = homeDir({ env, platform });
  return home === null ? null : join(home, ".hermes");
}

export function hermesConfigScopes({ home, platform }) {
  return [userScope(home, (h) => pathFor(platform).join(h, "config.yaml"), "yaml")];
}
