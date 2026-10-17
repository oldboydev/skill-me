import path from "node:path";
import { CliUsageError } from "../../doctor/cli-args.mjs";
import { CLAUDE_MANAGED_SETTINGS_PATH } from "../../doctor/config-sources.mjs";

export class ConflictError extends Error {
  constructor(code, file) {
    super(code);
    this.conflict = file === undefined ? { code } : { code, file };
  }
}

function pathApi(platform) {
  return platform === "win32" ? path.win32 : path.posix;
}

function isInside(root, candidate, platform) {
  const api = pathApi(platform);
  const relative = api.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !api.isAbsolute(relative));
}

// Comparação textual, antes de qualquer acesso: o diretório de política
// gerenciada do Claude (managed-settings.json) nunca é alvo, exista ou não.
export function isManagedPolicyTarget(targetArg, platform) {
  const managedFile = CLAUDE_MANAGED_SETTINGS_PATH[platform];
  if (!managedFile) return false;
  const api = pathApi(platform);
  const fold = (value) => (platform === "win32" ? value.toLowerCase() : value);
  const managedDir = fold(api.resolve(api.dirname(managedFile)));
  const target = fold(api.resolve(targetArg));
  return isInside(managedDir, target, platform);
}

// O alvo é sempre explícito; nunca há default (nada aponta para o perfil
// pessoal sem que o usuário escreva o caminho). Links no próprio alvo são
// resolvidos: o diretório real é a raiz de contenção.
export async function resolveTarget(targetArg, io) {
  if (typeof targetArg !== "string" || targetArg === "") {
    throw new CliUsageError("--target <diretório> é obrigatório", { code: "missing_target" });
  }
  let stats;
  try {
    stats = await io.stat(path.resolve(targetArg));
  } catch {
    throw new CliUsageError("diretório informado em --target não existe ou não é acessível", { code: "target_not_found" });
  }
  if (!stats.isDirectory()) {
    throw new CliUsageError("caminho informado em --target não é um diretório", { code: "target_not_directory" });
  }
  return io.realpath(path.resolve(targetArg));
}

// Novas sondagens de uma entrada que sumiu entre o lstat e o realpath.
const VANISHED_REPROBES = 3;

// Todo caminho tocado precisa resolver dentro da raiz: um link (ou junção)
// no próprio caminho ou em qualquer ancestral que leve para fora é conflito.
// Link pendente também é recusado — escrever nele criaria o alvo fora.
export async function assertContained(root, candidate, io, platform = process.platform) {
  let probe = candidate;
  let reprobes = 0;
  for (;;) {
    let stats;
    try {
      stats = await io.lstat(probe);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const parent = path.dirname(probe);
      if (parent === probe) throw new ConflictError("target_escape", path.relative(root, candidate));
      probe = parent;
      continue;
    }
    let real;
    try {
      real = await io.realpath(probe);
    } catch (error) {
      if (stats.isSymbolicLink() && error.code === "ENOENT") throw new ConflictError("target_escape", path.relative(root, candidate));
      if (error.code !== "ENOENT") throw error;
      // Entrada que sumiu entre o lstat e o realpath (ex.: temporário de outro
      // processo do skill-me renomeado nesse intervalo): o mesmo caminho é
      // sondado de novo, poucas vezes — oscilando além disso, nada se comprova
      // e a operação para em conflito, sem laço sem progresso.
      reprobes += 1;
      if (reprobes > VANISHED_REPROBES) throw new ConflictError("config_changed_during_read", path.relative(root, candidate));
      continue;
    }
    if (!isInside(root, real, platform)) throw new ConflictError("target_escape", path.relative(root, candidate));
    return;
  }
}
