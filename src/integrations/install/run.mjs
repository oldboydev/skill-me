import path from "node:path";
import { fileURLToPath } from "node:url";
import { CliUsageError } from "../../doctor/cli-args.mjs";
import { ARTIFACT_NAMES, PLUGIN_NAME, PLUGIN_REL_DIR, isOwnCache, loadArtifacts, sha256 } from "./hermes-artifacts.mjs";
import { createNodeIo } from "./io.mjs";
import {
  CONFIG_FILE,
  InvalidConfigError,
  parseConfig,
  planJsonInstall,
  planJsonUninstall,
  unrecordedOwnedEvents,
} from "./json-hooks.mjs";
import { STATE_DIR, manifestPath, manifestRelPath, parseManifest, serializeManifest } from "./manifest.mjs";
import { ConflictError, assertContained, isManagedPolicyTarget, resolveTarget } from "./target.mjs";

export { createNodeIo };
export const CLI_PATH = fileURLToPath(new URL("../cli.mjs", import.meta.url));

const AGENTS = ["claude", "codex", "hermes"];
const COMMANDS = ["plan", "install", "uninstall"];
// Nome fixo: só um processo do skill-me escreve por alvo/agente (lock), então
// um temporário que já exista é sobra de execução anterior — se for arquivo
// regular, é removido; qualquer outra coisa é falha de E/S, nunca apagada.
const TMP_SUFFIX = ".skill-me-tmp";
const STAGING_REL_DIR = `plugins/.${PLUGIN_NAME}${TMP_SUFFIX}`;
// Marca de artefato que não é arquivo regular: nunca é igual a um SHA-256.
const NOT_REGULAR_FILE = "not_a_regular_file";

const MANUAL_STEPS = {
  claude: [
    "Claude Code só executa hooks de settings depois da confiança do workspace; revise as entradas em /hooks.",
    "Sem consumidor da #8, cada hook observa em memória e descarta ao sair: nada é gravado nem enviado.",
  ],
  codex: [
    "Abra /hooks no Codex e revise/confie nas entradas novas; hooks de projeto só rodam em projeto confiável.",
    "Hosted tools (ex.: busca web) não passam por hooks locais; para o ciclo de turno use 'integrations run --agent codex'.",
  ],
  hermes: [
    "Habilite manualmente: hermes plugins enable skill-me-observer",
    "Sem SKILL_ME_HERMES_DELIVERY o plugin fica inativo: callbacks devolvem None sem fila, thread ou processo.",
  ],
};

class IncompleteError extends Error {
  constructor(cause) {
    super("incomplete");
    this.code = cause?.code ?? "io_error";
  }
}

function rel(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

// Leitura de arquivo do alvo: ausente é normal; grande demais ou ilegível é
// configuração inválida (não substituída); mudança durante a leitura é conflito.
async function readOptional(io, root, file) {
  let read;
  try {
    read = await io.readText(file);
  } catch {
    throw new InvalidConfigError("config_unreadable", rel(root, file));
  }
  if (read.state === "missing") return null;
  if (read.state === "too_large") throw new InvalidConfigError("input_too_large", rel(root, file));
  if (read.state === "changed_during_read") throw new ConflictError("config_changed_during_read", rel(root, file));
  return read.text;
}

async function clearStaleTemp(io, tmp) {
  let stats;
  try {
    stats = await io.lstat(tmp);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  if (!stats.isFile()) {
    const error = new Error("temporário ocupado por algo que não é arquivo");
    error.code = "tmp_path_occupied";
    throw error;
  }
  await io.unlink(tmp);
}

// Só diretório real: um link posto pelo usuário no lugar de um diretório que a
// instalação criou (`plugins`, `.skill-me`) fica — no Windows `rmdir` numa
// junção a remove quando o destino está vazio.
async function removeDirIfEmpty(io, dir) {
  try {
    if ((await io.lstat(dir)).isDirectory() && (await io.readdir(dir)).length === 0) await io.rmdir(dir);
  } catch {
    // Diretório já ausente ou ocupado: nada a remover.
  }
}

// Tipo da entrada sem seguir link: "absent", "dir" (diretório real) ou "other"
// (junção/link, arquivo…).
async function entryKind(io, file) {
  let stats;
  try {
    stats = await io.lstat(file);
  } catch (error) {
    if (error.code === "ENOENT") return "absent";
    throw error;
  }
  return stats.isDirectory() ? "dir" : "other";
}

async function withLock(io, root, agent, fn) {
  const stateDir = path.join(root, STATE_DIR);
  const lockPath = path.join(stateDir, `${agent}.lock`);
  try {
    await io.mkdir(stateDir);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  try {
    await io.writeExclusive(lockPath, `${process.pid}\n`);
  } catch (error) {
    if (error.code === "EEXIST") throw new ConflictError("lock_present", rel(root, lockPath));
    throw error;
  }
  try {
    return await fn();
  } finally {
    await io.unlink(lockPath).catch(() => {});
    await removeDirIfEmpty(io, stateDir);
  }
}

const sameAccess = (a, b) => a.mode === b.mode && a.uid === b.uid && a.gid === b.gid;

// Modo/dono/grupo do arquivo a substituir (POSIX); sumiu depois da leitura →
// conflito, como a mudança de conteúdo.
async function accessBeforeReplace(io, root, file) {
  try {
    return await io.accessOf(file);
  } catch (error) {
    if (error.code === "ENOENT") throw new ConflictError("config_changed_during_apply", rel(root, file));
    throw error;
  }
}

// Troca o arquivo só se o conteúdo atual ainda for o que foi lido sob o lock.
// O temporário herda o acesso do original sem nunca ampliá-lo (ver io.mjs);
// uma mudança de modo/dono/grupo durante a aplicação também é conflito.
// Limite registrado no plano: entre esta última comparação e o rename não há
// atomicidade contra editores arbitrários (o sistema de arquivos não tem CAS).
async function replaceChecked(io, root, file, text, expectedHash) {
  const tmp = file + TMP_SUFFIX;
  const like = expectedHash === null ? null : await accessBeforeReplace(io, root, file);
  await clearStaleTemp(io, tmp);
  await io.writeExclusive(tmp, text, { like });
  try {
    const current = await readOptional(io, root, file);
    const currentHash = current === null ? null : sha256(Buffer.from(current, "utf8"));
    if (currentHash !== expectedHash) throw new ConflictError("config_changed_during_apply", rel(root, file));
    if (like !== null && !sameAccess(await io.accessOf(file), like)) throw new ConflictError("config_changed_during_apply", rel(root, file));
    await io.rename(tmp, file);
  } catch (error) {
    await io.unlink(tmp).catch(() => {});
    throw error;
  }
}

async function deleteChecked(io, root, file, expectedHash) {
  const current = await readOptional(io, root, file);
  const currentHash = current === null ? null : sha256(Buffer.from(current, "utf8"));
  if (currentHash !== expectedHash) throw new ConflictError("config_changed_during_apply", rel(root, file));
  await io.unlink(file);
}

async function writeManifest(io, root, agent, body) {
  const file = manifestPath(root, agent);
  const tmp = file + TMP_SUFFIX;
  await clearStaleTemp(io, tmp);
  await io.writeExclusive(tmp, serializeManifest(agent, body));
  try {
    await io.rename(tmp, file);
  } catch (error) {
    await io.unlink(tmp).catch(() => {});
    throw error;
  }
}

async function deleteManifest(io, root, agent) {
  await io.unlink(manifestPath(root, agent)).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}

// Executa um passo de escrita registrando seu estado; falha de E/S vira
// operação incompleta (código 5) com o estado de cada passo, nunca sucesso.
async function step(result, name, fn) {
  try {
    await fn();
    result.steps.push({ step: name, state: "done" });
  } catch (error) {
    if (error instanceof ConflictError) throw error;
    result.steps.push({ step: name, state: "failed" });
    throw new IncompleteError(error);
  }
}

async function readJsonState(io, root, agent, platform) {
  const configText = await readOptional(io, root, path.join(root, CONFIG_FILE[agent]));
  const manifestText = await readOptional(io, root, manifestPath(root, agent));
  return {
    parsed: configText === null ? null : parseConfig(agent, configText, platform),
    configHash: configText === null ? null : sha256(Buffer.from(configText, "utf8")),
    manifestText,
    manifest: manifestText === null ? null : parseManifest(agent, manifestText),
  };
}

function planJson(op, agent, state, ctx) {
  const manifestFile = manifestRelPath(agent);
  if (op === "install") {
    const plan = planJsonInstall({ agent, parsed: state.parsed, manifest: state.manifest, ctx });
    const manifestText = serializeManifest(agent, plan.manifestBody);
    const manifestAction = manifestText === state.manifestText ? null : "write";
    return {
      ...plan,
      manifestAction,
      changes: manifestAction ? [...plan.changes, { file: manifestFile, action: "write_manifest" }] : plan.changes,
    };
  }
  if (!state.manifest) {
    const conflicts = unrecordedOwnedEvents(agent, state.parsed, ctx).map((event) => ({
      code: "owned_entry_unrecorded",
      file: CONFIG_FILE[agent],
      event,
    }));
    return { changes: [], conflicts, configChanged: false, manifestAction: null };
  }
  const plan = planJsonUninstall({ agent, parsed: state.parsed, manifest: state.manifest, ctx });
  let manifestAction = null;
  if (plan.remaining.length === 0) manifestAction = "delete";
  else if (plan.remaining.length !== state.manifest.entries.length) manifestAction = "write";
  const manifestChange = manifestAction && { file: manifestFile, action: manifestAction === "delete" ? "delete_manifest" : "write_manifest" };
  return {
    ...plan,
    manifestAction,
    manifestBody: { ...state.manifest, entries: plan.remaining },
    changes: manifestChange ? [...plan.changes, manifestChange] : plan.changes,
  };
}

async function runJsonAgent({ op, agent, root, apply, io, ctx, platform, result }) {
  const file = path.join(root, CONFIG_FILE[agent]);
  for (const candidate of [file, file + TMP_SUFFIX, path.join(root, STATE_DIR), manifestPath(root, agent), manifestPath(root, agent) + TMP_SUFFIX]) {
    await assertContained(root, candidate, io, platform);
  }
  let state = await readJsonState(io, root, agent, platform);
  let plan = planJson(op, agent, state, ctx);
  result.changes = plan.changes;
  result.conflicts = plan.conflicts;
  const needsWrite = (p) => p.configChanged || p.manifestAction !== null;
  if (!apply || !needsWrite(plan)) return { wrote: false };
  await withLock(io, root, agent, async () => {
    state = await readJsonState(io, root, agent, platform);
    plan = planJson(op, agent, state, ctx);
    result.changes = plan.changes;
    result.conflicts = plan.conflicts;
    if (!needsWrite(plan)) return;
    if (plan.configChanged) {
      await step(result, "config", () =>
        plan.deleteFile ? deleteChecked(io, root, file, state.configHash) : replaceChecked(io, root, file, plan.newText, state.configHash),
      );
    }
    if (plan.manifestAction) {
      await step(result, "manifest", () =>
        plan.manifestAction === "delete" ? deleteManifest(io, root, agent) : writeManifest(io, root, agent, plan.manifestBody),
      );
    }
    result.applied = true;
  });
  return { wrote: result.applied };
}

// O nome sozinho não faz um bytecode ser nosso: a contenção vem antes de
// listar ou apagar qualquer coisa. Junção/link que resolve fora do alvo é
// conflito (nada é seguido); `__pycache__` que não é diretório real, ou entrada
// dele que não é arquivo regular, é alheio e fica — mesmo apontando para dentro
// do alvo, apagar através dele removeria arquivo de outra origem.
async function readPluginCache(io, root, dir, state, platform) {
  await assertContained(root, dir, io, platform);
  if (!(await io.lstat(dir)).isDirectory()) {
    state.foreign.push("__pycache__");
    return;
  }
  // Diretório real, não propriedade: quem decide se ele é nosso é o plano.
  state.cacheDirReal = true;
  for (const name of await io.readdir(dir)) {
    const file = path.join(dir, name);
    await assertContained(root, file, io, platform);
    if (isOwnCache(name) && (await io.lstat(file)).isFile()) state.caches.push(name);
    else state.foreign.push(`__pycache__/${name}`);
  }
}

// Arquivo do staging que comprova ser nosso: contido no alvo, arquivo regular
// (não link) e idêntico, byte a byte, ao artefato do pacote de mesmo nome.
async function isOwnStagedFile(io, root, file, name, artifacts, platform) {
  const artifact = artifacts.find((a) => a.name === name);
  if (!artifact) return false;
  await assertContained(root, file, io, platform);
  const stats = await io.lstat(file);
  if (!stats.isFile() || stats.size !== artifact.content.length) return false;
  return sha256(await io.readBytes(file)) === artifact.sha256;
}

// O staging tem nome fixo, mas nem esse nome nem os nomes dos artefatos provam
// propriedade: só é sobra nossa um diretório real (não junção/link) cujas
// entradas são todas arquivos próprios. Qualquer outra coisa é alheia e fica,
// mesmo apontando para dentro do alvo — limpar através dela apagaria arquivos
// de outro plugin. `null`: staging ausente.
async function readStaging(io, root, artifacts, platform) {
  const dir = path.join(root, STAGING_REL_DIR);
  await assertContained(root, dir, io, platform);
  let stats;
  try {
    stats = await io.lstat(dir);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  if (!stats.isDirectory()) return { owned: false };
  for (const name of await io.readdir(dir)) {
    if (!(await isOwnStagedFile(io, root, path.join(dir, name), name, artifacts, platform))) return { owned: false };
  }
  return { owned: true };
}

// A pasta do plugin só é nossa como diretório real: junção/link — mesmo para
// dentro do alvo — ou arquivo no lugar dela é alheio, e nada é lido nem
// apagado através dela (o bytecode e os arquivos de outro plugin pareceriam
// nossos pelo nome, e até cópias exatas dos artefatos pertencem a outra pasta).
// `false`: pasta ausente.
async function ownPluginDirExists(io, root) {
  const kind = await entryKind(io, path.join(root, PLUGIN_REL_DIR));
  if (kind === "other") throw new ConflictError("foreign_artifact", PLUGIN_REL_DIR);
  return kind === "dir";
}

async function readHermesState(io, root, platform, { op, artifacts }) {
  const manifestText = await readOptional(io, root, manifestPath(root, "hermes"));
  const pluginsDir = path.join(root, "plugins");
  const pluginDir = path.join(root, PLUGIN_REL_DIR);
  const exists = async (dir) => io.stat(dir).then((s) => s.isDirectory(), () => false);
  const state = {
    manifestText,
    manifest: manifestText === null ? null : parseManifest("hermes", manifestText),
    pluginsDirExists: await exists(pluginsDir),
    pluginDirExists: await ownPluginDirExists(io, root),
    files: {},
    caches: [],
    cacheDirReal: false,
    foreign: [],
    staging: null,
  };
  if (!state.pluginDirExists) {
    // Só a instalação dos artefatos usa o staging.
    if (op === "install" && state.pluginsDirExists) state.staging = await readStaging(io, root, artifacts, platform);
    return state;
  }
  for (const name of await io.readdir(pluginDir)) {
    const full = path.join(pluginDir, name);
    if (ARTIFACT_NAMES.includes(name)) {
      // Gravamos arquivos regulares: link (mesmo para conteúdo idêntico) ou
      // outro tipo no lugar do artefato é alteração preservada, como uma edição.
      state.files[name] = (await io.lstat(full)).isFile() ? sha256(await io.readBytes(full)) : NOT_REGULAR_FILE;
    } else if (name === "__pycache__") {
      await readPluginCache(io, root, full, state, platform);
    } else {
      state.foreign.push(name);
    }
  }
  return state;
}

function planHermes(op, state, artifacts) {
  const changes = [];
  const conflicts = [];
  const manifestFile = manifestRelPath("hermes");
  if (op === "install") {
    const matches = artifacts.every((a) => state.files[a.name] === a.sha256);
    const body = {
      artifacts: artifacts.map((a) => ({ path: a.rel, sha256: a.sha256 })),
      created: state.manifest?.created ?? { pluginsDir: !state.pluginsDirExists },
    };
    if (!state.pluginDirExists && state.staging?.owned === false) {
      conflicts.push({ code: "foreign_artifact", file: STAGING_REL_DIR });
    } else if (!state.pluginDirExists) {
      if (!state.pluginsDirExists) changes.push({ file: "plugins", action: "create_dir" });
      for (const a of artifacts) changes.push({ file: a.rel, action: "write_artifact" });
    } else if (state.manifest) {
      const modified = state.manifest.artifacts.filter((a) => state.files[path.posix.basename(a.path)] !== a.sha256);
      for (const a of modified) conflicts.push({ code: "owned_entry_modified", file: a.path });
      // Registro parcial (remoção anterior com conflito): artefato fora dele só
      // volta ao registro com o conteúdo exato do pacote, como na adoção sem
      // registro. Ausente ou diferente, a pasta não é uma instalação nossa
      // completa e nada é registrado — senão a remoção seguinte tomaria a fonte
      // do usuário, e o bytecode dela, por nossos.
      const recorded = state.manifest.artifacts.map((a) => path.posix.basename(a.path));
      const unrecorded = artifacts.filter((a) => !recorded.includes(a.name));
      if (unrecorded.some((a) => state.files[a.name] !== a.sha256)) conflicts.push({ code: "foreign_artifact", file: PLUGIN_REL_DIR });
      else if (conflicts.length === 0) for (const a of unrecorded) changes.push({ file: a.rel, action: "adopt_artifact" });
    } else if (matches && state.foreign.length === 0) {
      for (const a of artifacts) changes.push({ file: a.rel, action: "adopt_artifact" });
    } else {
      conflicts.push({ code: "foreign_artifact", file: PLUGIN_REL_DIR });
    }
    const writeArtifacts = changes.some((c) => c.action === "write_artifact");
    const manifestText = serializeManifest("hermes", body);
    const manifestAction = conflicts.length === 0 && manifestText !== state.manifestText ? "write" : null;
    if (manifestAction) changes.push({ file: manifestFile, action: "write_manifest" });
    return { changes, conflicts, writeArtifacts, manifestAction, manifestBody: body };
  }
  if (!state.manifest) {
    // Sem registro nada na pasta é comprovadamente nosso, nem o bytecode.
    if (state.pluginDirExists) conflicts.push({ code: "owned_entry_unrecorded", file: PLUGIN_REL_DIR });
    return { changes, conflicts, removals: [], caches: [], manifestAction: null };
  }
  const removals = [];
  const remaining = [];
  for (const recorded of state.manifest.artifacts) {
    const name = path.posix.basename(recorded.path);
    const current = state.files[name];
    if (current === undefined) changes.push({ file: recorded.path, action: "already_absent" });
    else if (current === recorded.sha256) {
      removals.push({ name, sha256: recorded.sha256 });
      changes.push({ file: recorded.path, action: "remove_artifact" });
    } else {
      conflicts.push({ code: "owned_entry_modified", file: recorded.path });
      remaining.push(recorded);
    }
  }
  // O bytecode acompanha a fonte e só é nosso com ela comprovada pelo registro:
  // `__init__.py` registrado e removido agora como nosso, ou já ausente (órfão
  // da nossa fonte). Preservado (editado, trocado por link ou de outro plugin de
  // mesmo nome) ou fora do registro — registro parcial de uma remoção anterior,
  // com fonte nova do usuário (até cópia exata) ou nenhuma —, o cache fica,
  // inclusive o `__pycache__` vazio.
  const recordedNames = state.manifest.artifacts.map((a) => path.posix.basename(a.path));
  const sourceRecorded = recordedNames.includes("__init__.py");
  const sourcePreserved = remaining.some((a) => path.posix.basename(a.path) === "__init__.py");
  const cacheOwned = sourceRecorded && !sourcePreserved;
  const caches = cacheOwned ? state.caches : [];
  for (const cached of caches) changes.push({ file: `${PLUGIN_REL_DIR}/__pycache__/${cached}`, action: "remove_cache" });
  // Fora do registro, nome de artefato não comprova nada: o arquivo é alheio,
  // como o `__pycache__` sem fonte registrada, e fica reportado.
  const unrecorded = Object.keys(state.files).filter((name) => !recordedNames.includes(name));
  if (state.foreign.length > 0 || unrecorded.length > 0 || (!sourceRecorded && state.cacheDirReal)) {
    conflicts.push({ code: "foreign_files_preserved", file: PLUGIN_REL_DIR });
  }
  let manifestAction = null;
  if (remaining.length === 0) manifestAction = "delete";
  else if (remaining.length !== state.manifest.artifacts.length) manifestAction = "write";
  if (manifestAction) changes.push({ file: manifestFile, action: manifestAction === "delete" ? "delete_manifest" : "write_manifest" });
  return {
    changes,
    conflicts,
    removals,
    caches,
    removeCacheDir: cacheOwned && state.cacheDirReal,
    manifestAction,
    manifestBody: { artifacts: remaining, created: state.manifest.created },
  };
}

// Remove o staging só enquanto ele continuar comprovadamente nosso: diretório
// real e, imediatamente antes de cada exclusão, arquivo próprio (mesma
// reconferência dos artefatos na remoção). Uma troca feita depois da leitura
// vira conflito e nada além dos arquivos já conferidos é apagado; `rmdir` só
// alcança o diretório real inspecionado (no Windows removeria uma junção).
async function removeOwnedStaging(io, root, artifacts, platform) {
  const dir = path.join(root, STAGING_REL_DIR);
  await assertContained(root, dir, io, platform);
  if (!(await io.lstat(dir)).isDirectory()) throw new ConflictError("foreign_artifact", STAGING_REL_DIR);
  for (const name of await io.readdir(dir)) {
    const file = path.join(dir, name);
    if (!(await isOwnStagedFile(io, root, file, name, artifacts, platform))) throw new ConflictError("foreign_artifact", STAGING_REL_DIR);
    await io.unlink(file);
  }
  await io.rmdir(dir);
}

async function installHermesArtifacts(io, root, artifacts, state, platform) {
  const pluginsDir = path.join(root, "plugins");
  const pluginDir = path.join(root, PLUGIN_REL_DIR);
  const tmpDir = path.join(root, STAGING_REL_DIR);
  if (!state.pluginsDirExists) await io.mkdir(pluginsDir);
  // Sobra própria de uma instalação interrompida; alheia já virou conflito no plano.
  if (state.staging) await removeOwnedStaging(io, root, artifacts, platform);
  await io.mkdir(tmpDir);
  for (const a of artifacts) await io.writeExclusive(path.join(tmpDir, a.name), a.content);
  try {
    await io.rename(tmpDir, pluginDir);
  } catch (error) {
    await removeOwnedStaging(io, root, artifacts, platform).catch(() => {});
    if (await io.stat(pluginDir).then(() => true, () => false)) throw new ConflictError("foreign_artifact", PLUGIN_REL_DIR);
    throw error;
  }
}

// A pasta do plugin e o `__pycache__` foram lidos como diretórios reais;
// imediatamente antes de cada exclusão isso é reconferido. Trocados depois da
// leitura por junção/link, o mesmo nome apagaria o arquivo de outro plugin, e
// `rmdir` removeria a junção (Windows). A troca vira conflito e nada além do já
// conferido é apagado — mesmo limite não atômico do `rename` da configuração.
async function removeHermesArtifacts(io, root, plan, state, platform) {
  const pluginDir = path.join(root, PLUGIN_REL_DIR);
  const cacheDir = path.join(pluginDir, "__pycache__");
  const cacheRel = `${PLUGIN_REL_DIR}/__pycache__`;
  const stillRealDir = async (dir, rel) => {
    if ((await entryKind(io, dir)) !== "dir") throw new ConflictError("config_changed_during_apply", rel);
  };
  const pluginDirStillOwn = () => stillRealDir(pluginDir, PLUGIN_REL_DIR);
  const cacheDirStillOwn = async () => {
    await pluginDirStillOwn();
    await stillRealDir(cacheDir, cacheRel);
  };
  // O bytecode e o `__pycache__` só saem com a fonte ausente — removida acima
  // como nossa ou já ausente na leitura. Uma fonte posta depois é de outra
  // origem e o bytecode ao lado pode ser dela.
  const sourceStillAbsent = async () => {
    if ((await entryKind(io, path.join(pluginDir, "__init__.py"))) !== "absent") {
      throw new ConflictError("config_changed_during_apply", `${PLUGIN_REL_DIR}/__init__.py`);
    }
  };
  if (state.pluginDirExists) {
    for (const removal of plan.removals) {
      const file = path.join(pluginDir, removal.name);
      await pluginDirStillOwn();
      // Confere de novo antes de apagar: uma edição ou um link postos depois da leitura ficam.
      if (!(await io.lstat(file)).isFile() || sha256(await io.readBytes(file)) !== removal.sha256) {
        throw new ConflictError("config_changed_during_apply", `${PLUGIN_REL_DIR}/${removal.name}`);
      }
      await io.unlink(file);
    }
    for (const cached of plan.caches) {
      const file = path.join(cacheDir, cached);
      await cacheDirStillOwn();
      await sourceStillAbsent();
      // Mesma conferência para o cache: link posto depois da leitura não é seguido.
      await assertContained(root, file, io, platform);
      if (!(await io.lstat(file)).isFile()) throw new ConflictError("config_changed_during_apply", `${cacheRel}/${cached}`);
      await io.unlink(file);
    }
    // Só o diretório real que foi inspecionado e que o plano tomou por nosso,
    // como o bytecode: ao lado de fonte preservada ou fora do registro, fica.
    if (plan.removeCacheDir) {
      await cacheDirStillOwn();
      await sourceStillAbsent();
      await removeDirIfEmpty(io, cacheDir);
    }
    await pluginDirStillOwn();
    await removeDirIfEmpty(io, pluginDir);
  }
  if (state.manifest.created.pluginsDir) await removeDirIfEmpty(io, path.join(root, "plugins"));
}

async function runHermesAgent({ op, root, apply, io, platform, result }) {
  const artifacts = loadArtifacts();
  for (const candidate of [path.join(root, "plugins"), path.join(root, PLUGIN_REL_DIR), path.join(root, STAGING_REL_DIR)]) {
    await assertContained(root, candidate, io, platform);
  }
  // Os caminhos dos artefatos só são conferidos dentro de uma pasta do plugin
  // nossa ou ausente: através de uma pasta alheia nada é seguido.
  await ownPluginDirExists(io, root);
  const candidates = [
    ...artifacts.map((a) => path.join(root, a.rel)),
    path.join(root, STATE_DIR),
    manifestPath(root, "hermes"),
    manifestPath(root, "hermes") + TMP_SUFFIX,
  ];
  for (const candidate of candidates) await assertContained(root, candidate, io, platform);
  let state = await readHermesState(io, root, platform, { op, artifacts });
  let plan = planHermes(op, state, artifacts);
  result.changes = plan.changes;
  result.conflicts = plan.conflicts;
  // O plano é a fonte do que a aplicação apaga: o que a prévia não lista não sai.
  const needsWrite = (p) => p.writeArtifacts || (p.removals?.length ?? 0) > 0 || (p.caches?.length ?? 0) > 0 || p.manifestAction !== null;
  if (!apply || !needsWrite(plan)) return;
  await withLock(io, root, "hermes", async () => {
    state = await readHermesState(io, root, platform, { op, artifacts });
    plan = planHermes(op, state, artifacts);
    result.changes = plan.changes;
    result.conflicts = plan.conflicts;
    if (!needsWrite(plan)) return;
    if (op === "install" && plan.writeArtifacts) await step(result, "artifacts", () => installHermesArtifacts(io, root, artifacts, state, platform));
    if (op === "uninstall") await step(result, "artifacts", () => removeHermesArtifacts(io, root, plan, state, platform));
    if (plan.manifestAction) {
      await step(result, "manifest", () =>
        plan.manifestAction === "delete" ? deleteManifest(io, root, "hermes") : writeManifest(io, root, "hermes", plan.manifestBody),
      );
    }
    result.applied = true;
  });
}

// Prévia (`plan`, ou install/uninstall sem `--apply`) nunca escreve, nunca
// pega lock e nunca inicia agente. Com `--apply`, só o alvo informado muda.
export async function runIntegrationCommand({
  command,
  agent,
  target,
  apply = false,
  platform = process.platform,
  io = createNodeIo(),
  nodePath = process.execPath,
  cliPath = CLI_PATH,
}) {
  const result = {
    schemaVersion: 1,
    command,
    agent,
    target: typeof target === "string" ? target : null,
    applied: false,
    status: "planned",
    changes: [],
    conflicts: [],
    errors: [],
    steps: [],
    manualSteps: [],
    exitCode: 0,
  };
  try {
    if (!COMMANDS.includes(command)) throw new CliUsageError("comando desconhecido", { code: "unknown_command" });
    if (!AGENTS.includes(agent)) throw new CliUsageError("--agent deve ser claude, codex ou hermes", { code: "invalid_agent" });
    if (command === "plan" && apply) throw new CliUsageError("plan nunca aplica; use install --apply", { code: "plan_with_apply" });
    if (agent === "claude" && typeof target === "string" && target !== "" && isManagedPolicyTarget(target, platform)) {
      throw new ConflictError("managed_policy_target");
    }
    const root = await resolveTarget(target, io);
    result.target = root;
    const op = command === "uninstall" ? "uninstall" : "install";
    if (op === "install") result.manualSteps = MANUAL_STEPS[agent];
    const ctx = { nodePath, cliPath, platform };
    const doApply = apply && command !== "plan";
    if (agent === "hermes") await runHermesAgent({ op, root, apply: doApply, io, platform, result });
    else await runJsonAgent({ op, agent, root, apply: doApply, io, ctx, platform, result });
    if (result.conflicts.length > 0) {
      result.status = "conflict";
      result.exitCode = 4;
    } else if (!doApply) {
      result.status = "planned";
    } else {
      result.status = result.applied ? "applied" : "unchanged";
    }
  } catch (error) {
    if (error instanceof CliUsageError) {
      result.status = "usage_error";
      result.exitCode = 2;
      result.errors.push({ code: error.code });
    } else if (error instanceof ConflictError) {
      result.status = "conflict";
      result.exitCode = 4;
      result.conflicts.push(error.conflict);
    } else if (error instanceof InvalidConfigError) {
      result.status = "invalid_config";
      result.exitCode = 3;
      result.errors.push(error.error);
    } else {
      result.status = "incomplete";
      result.exitCode = 5;
      result.errors.push({ code: error instanceof IncompleteError ? error.code : (error.code ?? "io_error") });
    }
  }
  return result;
}
