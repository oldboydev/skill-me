import path from "node:path";
import { resolveAgents, AGENT_ORDER } from "./agent-resolution.mjs";
import { readAgentConfiguration } from "./config-reader.mjs";
import { buildCapabilityMatrix } from "./capability-matrix.mjs";
import { probeCollector } from "./collector-probe.mjs";
import { buildEnvelope } from "./report-envelope.mjs";
import { isVersionProfileCompatible } from "./known-version-profiles.mjs";
import { readContractEvidence } from "./contract-evidence.mjs";

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
  // Uma versão compatível com o perfil examinado não é, por si só, evidência
  // do contrato de nenhum mecanismo: só prova que aquele número foi lido de
  // um artefato real. O contrato vem da tabela que a própria instalação traz,
  // procurada no pacote ligado ao launcher, e só quando a versão desse
  // pacote está num perfil examinado — antes disso a matriz já decide por
  // presença/versão e a leitura seria inútil.
  const contract =
    presence.presence === "present" && versionProfileCompatible
      ? await readContractEvidence({ agentId: presence.id, packageDir: presence.packageDir, fs })
      : null;
  const evidence = {
    presence: presence.presence,
    version: presence.version,
    configuration: configResult.configuration,
    trust: configResult.trust,
    versionProfileCompatible,
    contract,
    documentationOnly: false,
    // A CLI declara o que leu do ambiente que recebeu; se esse ambiente foi
    // montado por um teste, é o registro do cenário que diz "fixture".
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

  const agentsPresence = await resolveAgents({ pathDirs, platform, env, fs });
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
