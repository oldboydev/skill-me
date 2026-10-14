// Versões cujo contrato de hooks/observabilidade foi examinado durante o
// planejamento desta entrega (ver "Evidência obtida no planejamento" na
// task). Uma versão fora deste conjunto não herda suporte "verified" só por
// ser mais nova — critério 5.
const KNOWN_VERSION_PROFILES = {
  claude: new Set(["2.1.295"]),
  codex: new Set(["0.162.1"]),
  hermes: new Set(["0.21.4"]),
};

export function isVersionProfileCompatible(agentId, version) {
  return version !== null && KNOWN_VERSION_PROFILES[agentId]?.has(version) === true;
}
