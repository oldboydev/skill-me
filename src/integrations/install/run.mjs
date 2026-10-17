import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
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
// Nome fixo, ao lado do arquivo que o temporário substitui. O lock só exclui
// outros processos do skill-me: nem ele nem o nome provam que algo já presente
// nesse caminho (arquivo regular, diretório ou link) seja sobra nossa — fica, e
// prévia e aplicação recusam com 4. O temporário que criamos só é renomeado ou
// apagado enquanto continuar com os bytes que gravamos.
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

// Temporários de `files` cujo caminho já tem alguma entrada, sem seguir link;
// caminhos relativos ao alvo.
async function occupiedTemps(io, root, files) {
  const occupied = [];
  for (const file of files) {
    if ((await entryKind(io, file + TMP_SUFFIX)) !== "absent") occupied.push(rel(root, file + TMP_SUFFIX));
  }
  return occupied;
}

// Temporários de que o plano precisa: o da configuração quando ela é
// reescrita (não apagada) e o do registro quando ele é gravado.
function neededTemps(plan, configRel, manifestRel) {
  const needed = [];
  if (configRel !== null && plan.configChanged && !plan.deleteFile) needed.push(configRel + TMP_SUFFIX);
  if (plan.manifestAction === "write") needed.push(manifestRel + TMP_SUFFIX);
  return needed;
}

// Temporário necessário já ocupado: o plano inteiro vira conflito, sem
// mudança listada nem passo de escrita (campos dos planos JSON e Hermes) —
// prévia e aplicação recusam igual, antes da primeira mutação, e nada no
// caminho ocupado é apagado ou seguido.
function refuseOccupiedTemps(plan, needed, occupied) {
  const blocked = needed.filter((tmp) => occupied.includes(tmp));
  if (blocked.length === 0) return plan;
  return {
    ...plan,
    changes: [],
    conflicts: [...plan.conflicts, ...blocked.map((file) => ({ code: "foreign_artifact", file }))],
    configChanged: false,
    deleteFile: false,
    writeArtifacts: false,
    removals: [],
    caches: [],
    removeCacheDir: false,
    manifestAction: null,
  };
}

// Arquivo regular (não link) com exatamente estes bytes: a identidade por
// caminho, tipo e hash que comprova como nosso um arquivo de nome conhecido.
async function holdsExactly(io, file, content, hash) {
  const stats = await io.lstat(file);
  if (!stats.isFile() || stats.size !== content.length) return false;
  return sha256(await io.readBytes(file)) === hash;
}

// O arquivo que criamos (temporário, lock) ou lemos sob o lock (registro)
// continua o mesmo enquanto for o arquivo regular com esses bytes; editado,
// trocado (arquivo, diretório, link) ou removido por outro, não é.
async function stillHolds(io, file, bytes) {
  try {
    return await holdsExactly(io, file, bytes, sha256(bytes));
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

// Caminho real de uma pasta do alvo atravessada pelos efeitos (`.skill-me`;
// `plugins` do Hermes), contida no alvo, enquanto ela for um diretório
// (junção/link que resolve dentro do alvo conta, como na leitura).
async function dirRealPath(io, root, rel, platform) {
  const dir = path.join(root, rel);
  const real = await assertContained(root, dir, io, platform);
  let stats = null;
  try {
    stats = await io.stat(dir);
  } catch (error) {
    if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
  }
  if (!stats?.isDirectory()) throw new ConflictError("config_changed_during_apply", rel);
  return real;
}

// Conferência de que a pasta continua no caminho real de referência da
// execução. Trocada depois por junção/link (para fora ou para outra pasta do
// alvo), o mesmo nome alcançaria arquivos de outro lugar — o `lstat` de um
// filho atravessa o ancestral trocado sem perceber.
function dirUnchangedGuard(io, root, rel, real, platform) {
  return async () => {
    if ((await dirRealPath(io, root, rel, platform)) !== real) throw new ConflictError("config_changed_during_apply", rel);
  };
}

// A própria raiz, pela mesma regra: o caminho real resolvido no início é a
// referência da execução. Trocada ela — ou um ancestral — por junção/link para
// a pasta movida, o mesmo nome alcançaria arquivos fora da raiz; a conferência
// vem antes de cada efeito que passa só por ela (configuração do Claude/Codex
// e o temporário dela, `mkdir` de `.skill-me` e de `plugins`). Conflito em `.`.
function rootUnchangedGuard(io, root, platform) {
  return dirUnchangedGuard(io, root, ".", root, platform);
}

// Filho que só é nosso como diretório real (pasta do plugin, `__pycache__`,
// staging), com o ancestral já conferido: trocado por junção/link — mesmo para
// dentro do alvo —, arquivo ou ausente, nada é lido, gravado, apagado ou
// promovido através dele.
async function assertStillRealDir(io, dir, rel) {
  if ((await entryKind(io, dir)) !== "dir") throw new ConflictError("config_changed_during_apply", rel);
}

// Só sai o lock que esta execução criou: pela mesma pasta de estado e enquanto
// for o arquivo regular com os bytes gravados. Ausente, editado, trocado ou
// com a pasta trocada, ele não é comprovadamente nosso e fica.
async function releaseLock(io, root, lockPath, lockText, stateDirUnchanged) {
  const kept = new ConflictError("config_changed_during_apply", rel(root, lockPath));
  try {
    await stateDirUnchanged();
  } catch (error) {
    throw error instanceof ConflictError ? kept : error;
  }
  if (!(await stillHolds(io, lockPath, Buffer.from(lockText, "utf8")))) throw kept;
  try {
    await io.unlink(lockPath);
  } catch (error) {
    throw error.code === "ENOENT" ? kept : error;
  }
}

// O lock que ficou não esconde o resultado do comando: o conflito dele se soma
// (0 → 4 com passos e `applied` mantidos; conflito → os dois; 5 continua 5) e
// uma falha de E/S ao conferi-lo ou apagá-lo vira passo `lock` falho e 5 —
// antes ela era engolida e o comando dizia 0 com o lock bloqueando os próximos.
// Devolve a falha a propagar.
function withLockKept(result, failure, error) {
  if (error instanceof ConflictError) {
    if (failure instanceof ConflictError) {
      // Mesmo efeito do `catch` de runIntegrationCommand (4), com o conflito
      // principal antes do conflito do lock.
      result.conflicts.push(failure.conflict);
      failure = null;
    }
    result.conflicts.push(error.conflict);
    return failure;
  }
  result.steps.push({ step: "lock", state: "failed" });
  if (failure instanceof ConflictError) result.conflicts.push(failure.conflict);
  else if (failure instanceof InvalidConfigError) result.errors.push(failure.error);
  else if (failure !== null) return failure;
  return new IncompleteError(error);
}

// Lock exclusivo do agente no alvo. O caminho real da pasta de estado,
// conferido antes de criar o lock, vira a referência da execução: `fn` recebe
// a conferência e a usa antes de ler o registro e de cada efeito nele. Trocada
// depois por junção/link (para fora ou para outra pasta do alvo), o mesmo nome
// alcançaria arquivos de outro lugar. `fn` recebe também a conferência da
// raiz, já usada antes do `mkdir` da pasta de estado.
async function withLock(io, root, agent, platform, result, fn) {
  const stateDir = path.join(root, STATE_DIR);
  const lockPath = path.join(stateDir, `${agent}.lock`);
  const lockText = `${process.pid}\n`;
  const rootUnchanged = rootUnchangedGuard(io, root, platform);
  await rootUnchanged();
  try {
    await io.mkdir(stateDir);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const stateDirUnchanged = dirUnchangedGuard(io, root, STATE_DIR, await dirRealPath(io, root, STATE_DIR, platform), platform);
  try {
    await io.writeExclusive(lockPath, lockText);
  } catch (error) {
    if (error.code === "EEXIST") throw new ConflictError("lock_present", rel(root, lockPath));
    throw error;
  }
  let failure = null;
  try {
    await fn(stateDirUnchanged, rootUnchanged);
  } catch (error) {
    failure = error;
  }
  try {
    await releaseLock(io, root, lockPath, lockText, stateDirUnchanged);
    await removeDirIfEmpty(io, stateDir);
  } catch (error) {
    failure = withLockKept(result, failure, error);
  }
  if (failure) throw failure;
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

// Substituição negada enquanto outro processo mantém o destino aberto (no
// Windows: o agente, um editor, antivírus, a prévia de outro skill-me): novas
// tentativas curtas. No POSIX esses códigos são permissão real e só atrasam o 5.
const RENAME_DENIED = new Set(["EPERM", "EACCES", "EBUSY"]);
const RENAME_RETRY_DELAYS_MS = [10, 20, 40, 80, 160, 320];

// Grava `text` num temporário novo e o renomeia sobre `file`. `wx` só cria com
// o caminho livre: ocupado depois da leitura, ele é alheio, como na prévia.
// Antes de cada tentativa de rename, o temporário precisa continuar nosso
// (senão seria promovido conteúdo que não gravamos) e as conferências do
// chamador precisam passar — também depois de uma espera. Em qualquer falha
// sai só o temporário que continua nosso. `dirUnchanged` confere o diretório
// do temporário antes de criá-lo, de cada tentativa e da limpeza: através de
// uma pasta trocada nada é criado, renomeado nem apagado.
async function writeViaTemp(io, root, file, text, { like = null, dirUnchanged = async () => {}, beforeRename = async () => {} } = {}) {
  const tmp = file + TMP_SUFFIX;
  const bytes = Buffer.from(text, "utf8");
  await dirUnchanged();
  try {
    await io.writeExclusive(tmp, text, { like });
  } catch (error) {
    if (error.code === "EEXIST") throw new ConflictError("foreign_artifact", rel(root, tmp));
    throw error;
  }
  try {
    for (let retry = 0; ; retry += 1) {
      await dirUnchanged();
      if (!(await stillHolds(io, tmp, bytes))) throw new ConflictError("config_changed_during_apply", rel(root, tmp));
      await beforeRename();
      try {
        await io.rename(tmp, file);
        return;
      } catch (error) {
        if (!RENAME_DENIED.has(error.code) || retry === RENAME_RETRY_DELAYS_MS.length) throw error;
      }
      await sleep(RENAME_RETRY_DELAYS_MS[retry]);
    }
  } catch (error) {
    const sameDir = await dirUnchanged().then(
      () => true,
      () => false,
    );
    if (sameDir && (await stillHolds(io, tmp, bytes).catch(() => false))) await io.unlink(tmp).catch(() => {});
    throw error;
  }
}

// Troca o arquivo só se ele ainda for o lido sob o lock — contido e com o
// mesmo conteúdo — e tiver o acesso que o temporário recebe. A mesma
// conferência vem antes de criar o temporário e antes de cada tentativa de
// rename: um documento posto no lugar depois da leitura (outro arquivo, link)
// não fornece o acesso com que o texto calculado da leitura é gravado. Antes,
// o temporário recebia esse texto com o modo do substituto e o conflito só
// vinha depois da gravação — apagar o temporário não revoga quem já o abriu.
// O acesso é lido antes da conferência para que ela o confirme no documento
// com o conteúdo lido; lido depois dela, viria de um documento não conferido.
// O temporário herda esse acesso sem nunca ampliá-lo (ver io.mjs); uma mudança
// de modo/dono/grupo também é conflito. `rootUnchanged` guarda a pasta do
// temporário (a raiz) na criação, em cada tentativa e na limpeza;
// `configContained`, cada leitura da configuração — só o arquivo virar link
// para fora não impede apagar o temporário próprio.
// Limite registrado no plano: entre a última conferência e a criação ou o
// rename não há atomicidade contra editores arbitrários (o sistema de arquivos
// não tem CAS); a troca nesse intervalo encontra o temporário com o acesso
// conferido e é recusada antes do rename.
async function replaceChecked(io, root, file, text, expectedHash, { rootUnchanged, configContained }) {
  let like = null;
  if (expectedHash !== null) {
    await configContained();
    like = await accessBeforeReplace(io, root, file);
  }
  const stillAsRead = async () => {
    await configContained();
    const current = await readOptional(io, root, file);
    const currentHash = current === null ? null : sha256(Buffer.from(current, "utf8"));
    if (currentHash !== expectedHash) throw new ConflictError("config_changed_during_apply", rel(root, file));
    if (like !== null && !sameAccess(await accessBeforeReplace(io, root, file), like)) throw new ConflictError("config_changed_during_apply", rel(root, file));
  };
  await stillAsRead();
  await writeViaTemp(io, root, file, text, { like, dirUnchanged: rootUnchanged, beforeRename: stillAsRead });
}

async function deleteChecked(io, root, file, expectedHash, { configContained }) {
  await configContained();
  const current = await readOptional(io, root, file);
  const currentHash = current === null ? null : sha256(Buffer.from(current, "utf8"));
  if (currentHash !== expectedHash) throw new ConflictError("config_changed_during_apply", rel(root, file));
  await configContained();
  await io.unlink(file);
}

// O registro é nosso só como arquivo regular: link (mesmo para um registro),
// junção ou diretório no caminho é alheio, nada é lido através dele e prévia e
// aplicação recusam antes de qualquer mutação — a aplicação confere o mesmo
// tipo antes de substituí-lo ou apagá-lo.
async function readManifestText(io, root, agent) {
  const file = manifestPath(root, agent);
  // Sem entrada (ou caminho ilegível), o leitor da configuração decide, como antes.
  const stats = await io.lstat(file).catch(() => null);
  if (stats && !stats.isFile()) throw new ConflictError("foreign_artifact", manifestRelPath(agent));
  return readOptional(io, root, file);
}

// O registro que decidiu o plano é o que pode ser substituído ou apagado:
// lido ausente, o caminho continua sem nenhuma entrada; lido presente, continua
// o arquivo regular com os mesmos bytes. Senão — editado, trocado, removido ou
// posto por outro depois da leitura — fica, e a operação para em conflito com
// os passos anteriores já reportados (sem desfazer nada).
async function assertManifestUnchanged(io, root, file, readText) {
  const unchanged = readText === null ? (await entryKind(io, file)) === "absent" : await stillHolds(io, file, Buffer.from(readText, "utf8"));
  if (!unchanged) throw new ConflictError("config_changed_during_apply", rel(root, file));
}

// Conferido antes de cada tentativa de rename, inclusive as novas tentativas.
async function writeManifest(io, root, agent, body, readText, stateDirUnchanged) {
  const file = manifestPath(root, agent);
  await writeViaTemp(io, root, file, serializeManifest(agent, body), {
    dirUnchanged: stateDirUnchanged,
    beforeRename: () => assertManifestUnchanged(io, root, file, readText),
  });
}

// Ausente na hora de apagar também é conflito: sob o lock só outro programa o
// tiraria, e o 0 esconderia a mudança na pasta de estado.
async function deleteManifest(io, root, agent, readText, stateDirUnchanged) {
  const file = manifestPath(root, agent);
  await stateDirUnchanged();
  await assertManifestUnchanged(io, root, file, readText);
  try {
    await io.unlink(file);
  } catch (error) {
    throw error.code === "ENOENT" ? new ConflictError("config_changed_during_apply", rel(root, file)) : error;
  }
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

// Sob o lock, `beforeConfigRead` confere a raiz e a contenção da configuração
// e `beforeManifestRead`, a pasta de estado.
async function readJsonState(io, root, agent, platform, { beforeConfigRead = async () => {}, beforeManifestRead = async () => {} } = {}) {
  const configFile = path.join(root, CONFIG_FILE[agent]);
  await beforeConfigRead();
  const configText = await readOptional(io, root, configFile);
  await beforeManifestRead();
  const manifestText = await readManifestText(io, root, agent);
  return {
    parsed: configText === null ? null : parseConfig(agent, configText, platform),
    configHash: configText === null ? null : sha256(Buffer.from(configText, "utf8")),
    manifestText,
    manifest: manifestText === null ? null : parseManifest(agent, manifestText),
    occupiedTemps: await occupiedTemps(io, root, [configFile, manifestPath(root, agent)]),
  };
}

function planJson(op, agent, state, ctx) {
  const plan = planJsonChanges(op, agent, state, ctx);
  return refuseOccupiedTemps(plan, neededTemps(plan, CONFIG_FILE[agent], manifestRelPath(agent)), state.occupiedTemps);
}

function planJsonChanges(op, agent, state, ctx) {
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
  await withLock(io, root, agent, platform, result, async (stateDirUnchanged, rootUnchanged) => {
    // A configuração só é lida, regravada ou apagada com a raiz no caminho real
    // de referência e o próprio arquivo contido nela: um link posto durante a
    // aplicação que leve para fora não é lido nem apagado, nem fornece o
    // acesso do temporário.
    const configContained = async () => {
      await rootUnchanged();
      await assertContained(root, file, io, platform);
    };
    state = await readJsonState(io, root, agent, platform, { beforeConfigRead: configContained, beforeManifestRead: stateDirUnchanged });
    plan = planJson(op, agent, state, ctx);
    result.changes = plan.changes;
    result.conflicts = plan.conflicts;
    if (!needsWrite(plan)) return;
    if (plan.configChanged) {
      const guards = { rootUnchanged, configContained };
      await step(result, "config", () =>
        plan.deleteFile ? deleteChecked(io, root, file, state.configHash, guards) : replaceChecked(io, root, file, plan.newText, state.configHash, guards),
      );
    }
    if (plan.manifestAction) {
      await step(result, "manifest", () =>
        plan.manifestAction === "delete"
          ? deleteManifest(io, root, agent, state.manifestText, stateDirUnchanged)
          : writeManifest(io, root, agent, plan.manifestBody, state.manifestText, stateDirUnchanged),
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
  return holdsExactly(io, file, artifact.content, artifact.sha256);
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

// `beforeManifestRead`: sob o lock, a conferência da pasta de estado.
async function readHermesState(io, root, platform, { op, artifacts, beforeManifestRead = async () => {} }) {
  await beforeManifestRead();
  const manifestText = await readManifestText(io, root, "hermes");
  const pluginsDir = path.join(root, "plugins");
  const pluginDir = path.join(root, PLUGIN_REL_DIR);
  const exists = async (dir) => io.stat(dir).then((s) => s.isDirectory(), () => false);
  const pluginsDirExists = await exists(pluginsDir);
  const state = {
    manifestText,
    manifest: manifestText === null ? null : parseManifest("hermes", manifestText),
    pluginsDirExists,
    // Lido sob o lock, antes da pasta do plugin e do staging, é a referência de
    // tudo que a aplicação lê, grava ou apaga através de `plugins`.
    pluginsDirReal: pluginsDirExists ? await dirRealPath(io, root, "plugins", platform) : null,
    pluginDirExists: await ownPluginDirExists(io, root),
    files: {},
    caches: [],
    cacheDirReal: false,
    foreign: [],
    staging: null,
    occupiedTemps: await occupiedTemps(io, root, [manifestPath(root, "hermes")]),
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
  const plan = planHermesChanges(op, state, artifacts);
  return refuseOccupiedTemps(plan, neededTemps(plan, null, manifestRelPath("hermes")), state.occupiedTemps);
}

function planHermesChanges(op, state, artifacts) {
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

// Remove o staging só enquanto ele continuar comprovadamente nosso: antes do
// `readdir`, de cada arquivo e do `rmdir`, `stagingStillOwn` confere `plugins`
// no caminho real de referência e o staging como diretório real; imediatamente
// antes de cada exclusão, o arquivo próprio (mesma reconferência dos artefatos
// na remoção). Uma troca feita depois da leitura vira conflito e nada além dos
// arquivos já conferidos é apagado; `rmdir` só alcança o diretório real
// conferido (no Windows removeria uma junção).
async function removeOwnedStaging(io, root, artifacts, platform, stagingStillOwn) {
  const dir = path.join(root, STAGING_REL_DIR);
  await stagingStillOwn();
  for (const name of await io.readdir(dir)) {
    const file = path.join(dir, name);
    await stagingStillOwn();
    if (!(await isOwnStagedFile(io, root, file, name, artifacts, platform))) throw new ConflictError("foreign_artifact", STAGING_REL_DIR);
    await io.unlink(file);
  }
  await stagingStillOwn();
  await io.rmdir(dir);
}

// Staging e pasta do plugin ficam em `plugins`, criada na raiz quando falta:
// trocada uma delas durante a aplicação, nada mais é criado, gravado ou
// renomeado através dela, e o staging já gravado fica onde estiver. O staging
// em si só é nosso como diretório real nessa `plugins` — trocado depois de
// criado ou de um artefato gravado por junção/link (mesmo para dentro do alvo)
// ou arquivo, nada mais é gravado, apagado ou promovido através dele.
async function installHermesArtifacts(io, root, artifacts, state, platform, rootUnchanged) {
  const pluginsDir = path.join(root, "plugins");
  const pluginDir = path.join(root, PLUGIN_REL_DIR);
  const tmpDir = path.join(root, STAGING_REL_DIR);
  let pluginsDirReal = state.pluginsDirReal;
  if (!state.pluginsDirExists) {
    await rootUnchanged();
    await io.mkdir(pluginsDir);
    // Criada agora: a referência vem logo depois do `mkdir`, como na pasta de estado.
    pluginsDirReal = await dirRealPath(io, root, "plugins", platform);
  }
  const pluginsUnchanged = dirUnchangedGuard(io, root, "plugins", pluginsDirReal, platform);
  const stagingStillOwn = async () => {
    await pluginsUnchanged();
    await assertStillRealDir(io, tmpDir, STAGING_REL_DIR);
  };
  // Sobra própria de uma instalação interrompida; alheia já virou conflito no plano.
  if (state.staging) await removeOwnedStaging(io, root, artifacts, platform, stagingStillOwn);
  await pluginsUnchanged();
  await io.mkdir(tmpDir);
  for (const a of artifacts) {
    await stagingStillOwn();
    await io.writeExclusive(path.join(tmpDir, a.name), a.content);
  }
  await stagingStillOwn();
  // O plano só grava artefatos com a pasta do plugin ausente: uma entrada surgida
  // depois é alheia, mesmo vazia — no POSIX o rename substituiria um diretório
  // vazio com sucesso. Nada é promovido sobre ela e o staging próprio completo
  // fica onde está (a instalação seguinte o limpa como sobra própria).
  if ((await entryKind(io, pluginDir)) !== "absent") throw new ConflictError("foreign_artifact", PLUGIN_REL_DIR);
  try {
    await io.rename(tmpDir, pluginDir);
  } catch (error) {
    await removeOwnedStaging(io, root, artifacts, platform, stagingStillOwn).catch(() => {});
    if (await io.stat(pluginDir).then(() => true, () => false)) throw new ConflictError("foreign_artifact", PLUGIN_REL_DIR);
    throw error;
  }
}

// A pasta do plugin e o `__pycache__` foram lidos como diretórios reais, com
// `plugins` no caminho real de referência; imediatamente antes de cada leitura
// e exclusão isso é reconferido, o ancestral primeiro. Trocados depois da
// leitura por junção/link, o mesmo nome apagaria o arquivo de outro plugin, e
// `rmdir` removeria a junção (Windows). A troca vira conflito e nada além do já
// conferido é apagado — mesmo limite não atômico do `rename` da configuração.
async function removeHermesArtifacts(io, root, plan, state, platform) {
  const pluginDir = path.join(root, PLUGIN_REL_DIR);
  const cacheDir = path.join(pluginDir, "__pycache__");
  const cacheRel = `${PLUGIN_REL_DIR}/__pycache__`;
  const pluginsUnchanged = dirUnchangedGuard(io, root, "plugins", state.pluginsDirReal, platform);
  const pluginDirStillOwn = async () => {
    await pluginsUnchanged();
    await assertStillRealDir(io, pluginDir, PLUGIN_REL_DIR);
  };
  const cacheDirStillOwn = async () => {
    await pluginDirStillOwn();
    await assertStillRealDir(io, cacheDir, cacheRel);
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
  await withLock(io, root, "hermes", platform, result, async (stateDirUnchanged, rootUnchanged) => {
    state = await readHermesState(io, root, platform, { op, artifacts, beforeManifestRead: stateDirUnchanged });
    plan = planHermes(op, state, artifacts);
    result.changes = plan.changes;
    result.conflicts = plan.conflicts;
    if (!needsWrite(plan)) return;
    if (op === "install" && plan.writeArtifacts) await step(result, "artifacts", () => installHermesArtifacts(io, root, artifacts, state, platform, rootUnchanged));
    if (op === "uninstall") await step(result, "artifacts", () => removeHermesArtifacts(io, root, plan, state, platform));
    if (plan.manifestAction) {
      await step(result, "manifest", () =>
        plan.manifestAction === "delete"
          ? deleteManifest(io, root, "hermes", state.manifestText, stateDirUnchanged)
          : writeManifest(io, root, "hermes", plan.manifestBody, state.manifestText, stateDirUnchanged),
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
    // O argumento pode ser um alias (junção/link) do diretório gerenciado: o
    // caminho real passa pela mesma recusa antes de qualquer leitura no alvo.
    if (agent === "claude" && isManagedPolicyTarget(root, platform)) throw new ConflictError("managed_policy_target");
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
