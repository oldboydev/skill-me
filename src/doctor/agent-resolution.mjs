import { readPeVersion } from "./version-sources/pe.mjs";
import { resolveCodexVersion } from "./launcher-link/codex.mjs";
import { resolveHermesVersion } from "./launcher-link/hermes.mjs";
import { joinPath } from "./launcher-link/path-helpers.mjs";

export const AGENT_ORDER = Object.freeze(["claude", "codex", "hermes"]);

// Lista de nomes candidatos em ordem de precedência (como PATHEXT: a
// primeira extensão reconhecida em cada diretório do PATH vence). O launcher
// real de um console-script do pip no Windows é `hermes.exe` (um executável
// compilado, não um script de texto); `hermes.cmd` fica como candidato
// secundário para layouts que produzam um shim de texto.
function launcherFileNames(agentId, platform) {
  if (platform !== "win32") return [agentId];
  if (agentId === "claude") return ["claude.exe"];
  if (agentId === "codex") return ["codex.cmd"];
  if (agentId === "hermes") return ["hermes.exe", "hermes.cmd"];
  throw new Error(`agente desconhecido: ${agentId}`);
}

function isExecutableMode(mode) {
  return typeof mode === "number" && (mode & 0o111) !== 0;
}

// readPeVersion espera um adaptador "abrível" (open/read/stat/close) para
// ler só os trechos necessários de um binário grande sem carregá-lo inteiro
// (ver version-sources/pe.mjs). Um adaptador plano (stat/readFile, como o
// de teste em memória ou qualquer um sem suporte nativo a leitura posicional)
// ainda funciona aqui, só sem esse ganho de memória — o contrato de
// resolveAgents não exige um `open` do chamador.
function openableFromFlatFs(fs) {
  if (typeof fs.open === "function") return fs;
  return {
    async open(filePath) {
      const [content, stats] = await Promise.all([fs.readFile(filePath), fs.stat(filePath)]);
      return {
        async read(buffer, offset, length, position) {
          const bytesRead = Math.max(0, Math.min(length, content.length - position));
          if (bytesRead > 0) content.copy(buffer, offset, position, position + bytesRead);
          return { bytesRead };
        },
        async stat() {
          return stats;
        },
        async close() {},
      };
    },
  };
}

// A resolução nunca aciona child_process: cada agente tem seu próprio leitor
// estático (PE por estrutura de recursos, shim por conteúdo/link real ao
// pacote). Mantemos a função aqui só para dar o reasonCode certo por agente.
async function readVersion(agentId, launcherPath, fs) {
  if (agentId === "claude") return readPeVersion(launcherPath, { fs: openableFromFlatFs(fs) });
  if (agentId === "codex") return resolveCodexVersion(launcherPath, { fs });
  return resolveHermesVersion(launcherPath, { fs });
}

// Ordem real de resolução de PATH: para cada diretório (precedência mais
// alta primeiro), tenta cada sufixo candidato nessa ordem — um diretório com
// o nome do agente (sem ser um arquivo) nunca é aceito, e no POSIX um
// arquivo sem nenhum bit de execução é tratado como "não encontrado" nesse
// candidato (segue procurando), não como presença válida.
async function findLauncherPath(agentId, pathDirs, platform, fs) {
  const names = launcherFileNames(agentId, platform);
  for (const dir of pathDirs) {
    for (const name of names) {
      const candidate = joinPath(dir, name);
      let stats;
      try {
        stats = await fs.stat(candidate);
      } catch (error) {
        if (error.code === "ENOENT") continue;
        throw error;
      }
      if (stats.isDirectory?.()) continue;
      if (platform !== "win32" && !isExecutableMode(stats.mode)) continue;
      return candidate;
    }
  }
  return null;
}

async function resolveOneAgent(agentId, { pathDirs, platform, fs }) {
  let launcherPath;
  try {
    launcherPath = await findLauncherPath(agentId, pathDirs, platform, fs);
  } catch (error) {
    return {
      id: agentId,
      presence: "unknown",
      version: null,
      versionSource: null,
      path: null,
      reasonCode: error.code ?? "unknown_error",
    };
  }
  if (launcherPath === null) {
    return {
      id: agentId,
      presence: "absent",
      version: null,
      versionSource: null,
      path: null,
      reasonCode: "executable_not_found",
    };
  }
  try {
    const result = await readVersion(agentId, launcherPath, fs);
    return {
      id: agentId,
      presence: "present",
      version: result.version,
      versionSource: result.versionSource ?? null,
      path: launcherPath,
      reasonCode: result.version === null ? result.reasonCode : null,
    };
  } catch (error) {
    return {
      id: agentId,
      presence: "unknown",
      version: null,
      versionSource: null,
      path: launcherPath,
      reasonCode: error.code ?? "unknown_error",
    };
  }
}

// Leitura puramente estática: nenhuma chamada a child_process acontece aqui
// nem nos módulos que esta função usa (ver testes com um childProcess que
// lança exceção em toda chamada). `fs`/`childProcess` são sempre recebidos
// por injeção para permitir um adaptador de teste em memória.
export async function resolveAgents({ pathDirs, platform, fs }) {
  const results = [];
  for (const agentId of AGENT_ORDER) {
    results.push(await resolveOneAgent(agentId, { pathDirs, platform, fs }));
  }
  return results;
}
