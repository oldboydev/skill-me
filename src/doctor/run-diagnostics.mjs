import path from "node:path";
import { resolveAgents, AGENT_ORDER } from "./agent-resolution.mjs";
import { readAgentConfiguration } from "./config-reader.mjs";
import { buildCapabilityMatrix } from "./capability-matrix.mjs";
import { probeCollector } from "./collector-probe.mjs";
import { buildEnvelope } from "./report-envelope.mjs";
import { isVersionProfileCompatible } from "./known-version-profiles.mjs";

const STATIC_LIMITATIONS = [
  "runtimeVerification não é realizada nesta entrega: mecanismos configurados " +
    "permanecem not_performed, sem captura real de eventos.",
  "collector.identityVerified é sempre false: um socket aceitar a conexão não " +
    "comprova que o processo escutando é o coletor nem que a captura funciona.",
];

function platformPathDelimiter(platform) {
  return platform === "win32" ? ";" : ":";
}

async function diagnoseAgent({ presence, env, platform, cwd, fs }) {
  const configResult = await readAgentConfiguration({
    agentId: presence.id,
    env,
    platform,
    cwd,
    fs,
  });
  const versionProfileCompatible = isVersionProfileCompatible(presence.id, presence.version);
  const evidence = {
    configuration: configResult.configuration,
    trust: configResult.trust,
    versionProfileCompatible,
    // Uma versão compatível com o perfil examinado não é, por si só,
    // evidência do contrato de nenhum mecanismo específico — só prova que
    // aquele número de versão foi lido de um artefato real. Esta entrega
    // não inspeciona nenhum artefato de contrato por mecanismo (hooks/
    // tools/skills), então nenhuma capacidade chega a "verified" por este
    // caminho; capability-matrix.mjs continua capaz de produzir "verified"
    // quando receber essa evidência (ver capability-matrix.unit.test.mjs),
    // mas run-diagnostics.mjs nunca a fornece hoje — a lacuna fica
    // explícita como "unverified" em vez de presumida a partir da versão.
    hasLocalVerifiedContract: false,
    documentationOnly: false,
    origin: "real_environment",
  };
  const capabilities = buildCapabilityMatrix({
    agentId: presence.id,
    evidenceBySurface: { cli_local: evidence },
  });
  return {
    id: presence.id,
    presence: presence.presence,
    version: presence.version,
    versionSource: presence.versionSource,
    path: presence.path,
    reasonCode: presence.reasonCode,
    configuration: configResult.configuration,
    configReasonCode: configResult.configReasonCode,
    trust: configResult.trust,
    trustReasonCode: configResult.trustReasonCode,
    capabilities,
  };
}

export async function runDiagnostics({ cwd, collectorEndpoint, env, platform, fs }) {
  const pathDirs = (env.PATH ?? "")
    .split(platformPathDelimiter(platform))
    .filter((entry) => entry.length > 0);

  const agentsPresence = await resolveAgents({ pathDirs, platform, fs });
  const agents = [];
  for (const presence of agentsPresence) {
    agents.push(await diagnoseAgent({ presence, env, platform, cwd, fs }));
  }

  const collector =
    collectorEndpoint === undefined
      ? { status: "unknown", reasonCode: "endpoint_not_provided", identityVerified: false }
      : await probeCollector(collectorEndpoint);

  const environment = {
    platform,
    cwd: path.resolve(cwd),
    generatedAt: new Date().toISOString(),
  };

  return buildEnvelope({
    environment,
    agents,
    collector,
    limitations: STATIC_LIMITATIONS,
    errors: [],
  });
}

export { AGENT_ORDER };
