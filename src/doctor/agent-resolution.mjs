import { readPeVersion } from "./version-sources/pe.mjs";
import { resolveCodexVersion } from "./launcher-link/codex.mjs";
import { resolveHermesVersion } from "./launcher-link/hermes.mjs";
import { joinPath } from "./launcher-link/path-helpers.mjs";

export const AGENT_ORDER = Object.freeze(["claude", "codex", "hermes"]);

// No Windows um comando sem extensão é resolvido, em cada diretório do PATH,
// tentando cada extensão de PATHEXT na ordem — então `codex.exe` (app do
// Codex), `claude.cmd` (shim do npm) ou `hermes.exe` (launcher compilado) são
// candidatos tanto quanto os formatos que o doctor sabe ler. Entradas que
// não são uma extensão simples são ignoradas para que um PATHEXT estranho
// nunca forme um caminho fora do diretório examinado. A preferência do
// PowerShell por `.ps1` é do shell, não do SO, e não é modelada.
const DEFAULT_WINDOWS_PATHEXT = Object.freeze([".com", ".exe", ".bat", ".cmd"]);

function windowsLauncherExtensions(env) {
  const raw = env?.PATHEXT;
  if (typeof raw !== "string") return DEFAULT_WINDOWS_PATHEXT;
  const extensions = raw
    .split(";")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => /^\.[a-z0-9]{1,8}$/.test(entry));
  return extensions.length > 0 ? [...new Set(extensions)] : DEFAULT_WINDOWS_PATHEXT;
}

function launcherFileNames(agentId, platform, env) {
  if (platform !== "win32") return [agentId];
  return windowsLauncherExtensions(env).map((extension) => agentId + extension);
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
async function readVersion(agentId, launcherPath, { fs, cwd, env }) {
  if (agentId === "claude") return readPeVersion(launcherPath, { fs: openableFromFlatFs(fs) });
  if (agentId === "codex") return resolveCodexVersion(launcherPath, { fs });
  return resolveHermesVersion(launcherPath, { fs, cwd, env });
}

// Ordem real de resolução de PATH: para cada diretório (precedência mais
// alta primeiro), tenta cada sufixo candidato nessa ordem — um diretório com
// o nome do agente (sem ser um arquivo) nunca é aceito, e no POSIX um
// arquivo sem nenhum bit de execução é tratado como "não encontrado" nesse
// candidato (segue procurando), não como presença válida. O primeiro
// candidato existente vence mesmo que seu formato não seja reconhecido:
// pular para outro diretório atribuiria a versão de outra instalação.
async function findLauncherPath(agentId, pathDirs, platform, env, fs) {
  const names = launcherFileNames(agentId, platform, env);
  for (const dir of pathDirs) {
    for (const name of names) {
      const candidate = joinPath(dir, name);
      let stats;
      try {
        stats = await fs.stat(candidate);
      } catch (error) {
        // Achado formal5 (nº2): uma entrada do PATH que é, na verdade, um
        // arquivo regular (não diretório) faz stat(dir/nome) devolver
        // ENOTDIR, não ENOENT — mesma ausência de candidato válido nesse
        // diretório, mesma continuação para o próximo. Outros erros de E/S
        // (EACCES, EIO, ...) continuam propagados; resolveOneAgent os
        // reporta como presence: unknown.
        if (error.code === "ENOENT" || error.code === "ENOTDIR") continue;
        throw error;
      }
      if (stats.isDirectory?.()) continue;
      if (platform !== "win32" && !isExecutableMode(stats.mode)) continue;
      return candidate;
    }
  }
  return null;
}

async function resolveOneAgent(agentId, { pathDirs, platform, env, cwd, fs }) {
  let launcherPath;
  try {
    launcherPath = await findLauncherPath(agentId, pathDirs, platform, env, fs);
  } catch (error) {
    return {
      id: agentId,
      presence: "unknown",
      version: null,
      versionSource: null,
      path: null,
      reasonCode: error.code ?? "unknown_error",
      packageDir: null,
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
      packageDir: null,
    };
  }
  try {
    const result = await readVersion(agentId, launcherPath, { fs, cwd, env });
    return {
      id: agentId,
      presence: "present",
      version: result.version,
      versionSource: result.versionSource ?? null,
      path: launcherPath,
      reasonCode: result.version === null ? result.reasonCode : null,
      // Pacote de onde a versão foi lida (hoje só o hermes_cli do Hermes):
      // é nele, e só nele, que a fonte de contrato desta instalação é
      // procurada. Não entra no relatório.
      packageDir: result.packageDir ?? null,
    };
  } catch (error) {
    return {
      id: agentId,
      presence: "unknown",
      version: null,
      versionSource: null,
      path: launcherPath,
      reasonCode: error.code ?? "unknown_error",
      packageDir: null,
    };
  }
}

// Leitura puramente estática: nenhuma chamada a child_process acontece aqui
// nem nos módulos que esta função usa (ver testes com um childProcess que
// lança exceção em toda chamada). `fs`/`childProcess` são sempre recebidos
// por injeção para permitir um adaptador de teste em memória. `env` fornece
// PATHEXT para a resolução no Windows e PYTHONPATH/PYTHONHOME para o vínculo
// do Hermes; ausente, vale um ambiente sem variáveis. `cwd` é o diretório de
// trabalho da execução diagnosticada, onde o `-m` do Python importa primeiro;
// ausente, vale null (desconhecido), nunca o diretório do processo atual.
export async function resolveAgents({ pathDirs, platform, env = {}, cwd = null, fs }) {
  const results = [];
  for (const agentId of AGENT_ORDER) {
    results.push(await resolveOneAgent(agentId, { pathDirs, platform, env, cwd, fs }));
  }
  return results;
}
