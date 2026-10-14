import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { hermesHome } from "../../../src/doctor/config-sources.mjs";

// Caminhos reais documentados por agente (ver docs/agent-compatibility.md):
// Claude usa settings.json dentro de .claude (JSON); Codex usa config.toml
// dentro de .codex (TOML); Hermes usa config.yaml dentro do home resolvido
// por hermesHome (`<LOCALAPPDATA>/hermes` no Windows, `<HOME>/.hermes` nos
// demais). Não existe um "hooks.yaml" genérico para os três. Nenhum dos
// três varre catálogo arbitrário de plugins.
export const AGENT_CONFIG_PATH = {
  claude: (home) => path.join(home, ".claude", "settings.json"),
  codex: (home) => path.join(home, ".codex", "config.toml"),
  // Reusa a mesma função de resolução que o doctor usa em produção, para
  // que a fixture escreva exatamente onde o CLI real vai procurar, com
  // qualquer env/plataforma que o chamador do teste já tenha montado.
  hermes: (home, { env, platform } = {}) =>
    path.join(
      hermesHome({ env: env ?? { HOME: home, USERPROFILE: home }, platform: platform ?? process.platform }),
      "config.yaml",
    ),
};

export const AGENT_CONFIG_FORMAT = {
  claude: "json",
  codex: "toml",
  hermes: "yaml",
};

export function writeAgentConfig(home, agentId, content, { env, platform } = {}) {
  const file =
    agentId === "hermes"
      ? AGENT_CONFIG_PATH.hermes(home, { env, platform })
      : AGENT_CONFIG_PATH[agentId](home);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}
