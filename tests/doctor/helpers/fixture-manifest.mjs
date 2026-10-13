// Registro explícito de origem e cobertura de SO exigido pelo critério 16:
// cada cenário da suíte declara se usa fixture sintética ou ambiente real,
// e quais convenções de SO exercita. Nenhum cenário aqui usa ambiente real
// nem payload privado; a suíte não alega E2E de captura.
export const FIXTURE_SCENARIOS = [
  { id: "C1-path-vazio", origin: "fixture", os: ["any"], file: "presence.cli.test.mjs" },
  { id: "C2-instalacao-presente", origin: "fixture", os: ["host"], file: "presence.cli.test.mjs" },
  { id: "C2-caminho-unicode-espaco", origin: "fixture", os: ["host"], file: "presence.cli.test.mjs" },
  { id: "C2-convencao-windows", origin: "fixture", os: ["windows"], file: "agent-resolution.unit.test.mjs" },
  { id: "C2-convencao-linux", origin: "fixture", os: ["linux"], file: "agent-resolution.unit.test.mjs" },
  { id: "C2-convencao-macos", origin: "fixture", os: ["macos"], file: "agent-resolution.unit.test.mjs" },
  { id: "C2-precedencia-path", origin: "fixture", os: ["any"], file: "agent-resolution.unit.test.mjs" },
  { id: "C3-versao-ilegivel", origin: "fixture", os: ["host"], file: "presence.cli.test.mjs" },
  { id: "C3-launcher-nao-reconhecido", origin: "fixture", os: ["host"], file: "presence.cli.test.mjs" },
  { id: "C3-fonte-ambigua", origin: "fixture", os: ["host"], file: "presence.cli.test.mjs" },
  { id: "C3-permissao-negada", origin: "fixture", os: ["any"], file: "agent-resolution.unit.test.mjs" },
  { id: "C3-launcher-alheio-codex", origin: "fixture", os: ["host"], file: "presence.cli.test.mjs" },
  { id: "C3-launcher-alheio-codex-hermes", origin: "fixture", os: ["any"], file: "agent-resolution.unit.test.mjs" },
  { id: "C2-layout-windows-hermes", origin: "fixture", os: ["windows"], file: "agent-resolution.unit.test.mjs" },
  { id: "C2-realpath-symlink-codex", origin: "fixture", os: ["host"], file: "agent-resolution.unit.test.mjs" },
  { id: "C8-trust-resolution", origin: "fixture", os: ["any"], file: "trust-resolution.unit.test.mjs" },
  { id: "C8-scope-merge-precedencia", origin: "fixture", os: ["any"], file: "scope-merge.unit.test.mjs" },
  { id: "C4-sem-execucao", origin: "fixture", os: ["host"], file: "presence.cli.test.mjs" },
  { id: "C5-C7-matriz-capacidades", origin: "fixture", os: ["any"], file: "capability-matrix.unit.test.mjs" },
  { id: "C8-configuracao-confianca", origin: "fixture", os: ["any"], file: "config-projection.unit.test.mjs" },
  { id: "C9-coletor-alcancavel", origin: "fixture", os: ["host"], file: "collector.cli.test.mjs" },
  { id: "C10-coletor-invalido-timeout", origin: "fixture", os: ["any"], file: "collector-probe.unit.test.mjs" },
  { id: "C11-C13-envelope-cli", origin: "fixture", os: ["host"], file: "envelope.cli.test.mjs" },
  { id: "C12-erro-interno", origin: "fixture", os: ["any"], file: "envelope-failure.unit.test.mjs" },
  { id: "C14-vazamento-limites", origin: "fixture", os: ["host"], file: "leak-and-limits.cli.test.mjs" },
  { id: "C14-pe-leitura-parcial", origin: "fixture", os: ["any"], file: "version-metadata.unit.test.mjs" },
  { id: "C15-concorrencia", origin: "fixture", os: ["host"], file: "snapshot-concurrency.cli.test.mjs" },
  { id: "C15-mutacao-durante-leitura", origin: "fixture", os: ["any"], file: "mid-read-mutation.unit.test.mjs" },
  { id: "C16-versao-sem-perfil-cli", origin: "fixture", os: ["host"], file: "presence.cli.test.mjs" },
  { id: "C16-config-inacessivel-cli", origin: "fixture", os: ["host"], file: "configuration-trust.cli.test.mjs" },
  { id: "C8-caminhos-por-plataforma", origin: "fixture", os: ["windows", "linux", "macos"], file: "config-sources.unit.test.mjs" },
  { id: "C5-contrato-tabela-instalada", origin: "fixture", os: ["any"], file: "contract-evidence.unit.test.mjs" },
  { id: "C5-contrato-tabela-instalada-cli", origin: "fixture", os: ["host"], file: "capability-evidence.cli.test.mjs" },
  { id: "C5-indisponivel-launcher-ausente-cli", origin: "fixture", os: ["host"], file: "capability-evidence.cli.test.mjs" },
  { id: "C16-origem-superficies-nao-inspecionadas-cli", origin: "fixture", os: ["host"], file: "capability-evidence.cli.test.mjs" },
  { id: "C2-C3-windows-pathext", origin: "fixture", os: ["windows"], file: "agent-resolution.unit.test.mjs" },
  { id: "C3-formato-desconhecido-primeiro-path-cli", origin: "fixture", os: ["host"], file: "presence.cli.test.mjs" },
  { id: "C2-codex-shim-npm-local", origin: "fixture", os: ["windows", "linux", "macos"], file: "agent-resolution.unit.test.mjs" },
  { id: "C2-codex-instalacao-local-cli", origin: "fixture", os: ["host"], file: "presence.cli.test.mjs" },
  { id: "C2-C3-hermes-interpretador-shebang", origin: "fixture", os: ["linux", "macos"], file: "agent-resolution.unit.test.mjs" },
  { id: "C8-forma-nativa-hooks", origin: "fixture", os: ["any"], file: "config-projection.unit.test.mjs" },
  { id: "C8-forma-nativa-hooks-cli", origin: "fixture", os: ["host"], file: "configuration-trust.cli.test.mjs" },
];

// "any"/"host" cobrem SO-independente ou o SO real do executor da suíte;
// a cobertura das três convenções (windows/linux/macos) está nos cenários
// parametrizados por plataforma, que rodam em qualquer executor da CI.
export const PLATFORM_PARAMETERIZED_OS_COVERAGE = ["windows", "linux", "macos"];

export const NO_E2E_CAPTURE_CLAIM =
  "Nenhum cenário desta suíte alega ter provado captura real de eventos " +
  "em funcionamento (E2E); runtimeVerification permanece not_performed.";

export const NO_PRIVATE_PAYLOAD_CLAIM =
  "Todo conteúdo de fixture é sintético: nenhum perfil, config ou segredo " +
  "real de usuário é lido ou versionado por esta suíte.";
