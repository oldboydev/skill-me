import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { createStoreIo } from "../privacy/fs.mjs";

// Configuração única da observação automática (issue #23): a raiz escolhida
// pelo usuário e o argv da entrega Hermes, no home deste usuário — por isso
// `on/off/status` dispensam argumentos e os hooks dispensam variáveis. Formato
// na linha "Configuração do usuário" do Landing em
// .checks/issue-23-observacao-on-off.md. O plugin Hermes lê o mesmo arquivo pelo
// `Path.home()` e usa só `hermesDelivery`; on/off ficam no store da raiz.

export const CONFIG_DIR = ".skill-me";
export const CONFIG_FILE = "observe.json";
// Barreira de `setup`, `on` e `off` (linha "Barreira da configuração" do
// Landing), direto no home: dentro da pasta `.skill-me` ela ia junto com a
// pasta trocada. O lock é tomado em observe/command.mjs.
export const CONTROL_LOCK_FILE = ".skill-me-observe.lock";
export const CONFIG_VERSION = 1;
// Registro da raiz autorizada (linha "Registro da autorização" do Landing),
// direto no home e fora da pasta `.skill-me`.
export const AUTHORIZATION_FILE = ".skill-me-authorization.json";
const AUTHORIZATION_VERSION = 1;
const MAX_CONFIG_BYTES = 64 * 1024;
const MAX_ARGV = 32;
const MAX_ARG_LENGTH = 4096;
const KEYS = ["hermesDelivery", "root", "rootReal", "skillMeObserveConfig"];
const AUTHORIZATION_KEYS = ["rootReal", "skillMeObserveAuthorization"];

// `os.homedir()` segue USERPROFILE (Windows) ou HOME (POSIX), como o
// `Path.home()` do plugin. Sem home utilizável não há configuração.
export function userHome() {
  try {
    return os.homedir();
  } catch {
    return "";
  }
}

const absolute = (value) => typeof value === "string" && value !== "" && path.isAbsolute(value);
const argvItem = (value) => typeof value === "string" && value !== "" && value.length <= MAX_ARG_LENGTH;

function isValidConfig(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    isDeepStrictEqual(Object.keys(value).sort(), KEYS) &&
    value.skillMeObserveConfig === CONFIG_VERSION &&
    absolute(value.root) &&
    absolute(value.rootReal) &&
    Array.isArray(value.hermesDelivery) &&
    value.hermesDelivery.length > 0 &&
    value.hermesDelivery.length <= MAX_ARGV &&
    value.hermesDelivery.every(argvItem)
  );
}

export class ObserveConfigError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// A pasta da configuração é a fronteira de confiança do consentimento (linha
// "Pasta da configuração" do Landing): o `lstat` do arquivo atravessa uma pasta
// trocada por link ou junção sem perceber, e o lock e a leitura iam para a
// configuração de outra pasta (F2 da verificação, rodada 2). Por isso ela é
// conferida — diretório real, com a mesma identidade — antes e depois de cada
// leitura e antes de cada efeito nela. Uma troca desfeita entre duas
// conferências fica fora do alcance, como no `assertUnchanged` do store.

// null sem a pasta; link ou junção no nome: link_refused. `bigint`: no Windows
// o índice do arquivo passa de 2^53 e perderia precisão como Number.
async function lstatFolder(io, dir) {
  let stats;
  try {
    stats = await io.lstat(dir, { bigint: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  }
  if (stats.isSymbolicLink()) throw new ObserveConfigError("link_refused");
  return stats;
}

const identityOf = (stats) => ({ dev: stats.dev, ino: stats.ino });

// `dir` ainda é a pasta de identidade `identity`; outra pasta, ausente ou não
// diretório no mesmo nome: foreign_entry.
async function assertConfigFolder(io, dir, identity) {
  const stats = await lstatFolder(io, dir);
  if (stats === null || !stats.isDirectory() || stats.dev !== identity.dev || stats.ino !== identity.ino) throw new ObserveConfigError("foreign_entry");
}

async function readConfigFile(io, file) {
  try {
    const stats = await io.lstat(file);
    if (stats.isSymbolicLink()) return { state: "invalid", code: "link_refused" };
    if (!stats.isFile()) return { state: "invalid", code: "config_invalid" };
    const bytes = await io.readBounded(file, MAX_CONFIG_BYTES);
    if (bytes === null) return { state: "invalid", code: "config_invalid" };
    const value = JSON.parse(bytes.toString("utf8"));
    return isValidConfig(value) ? { state: "ok", config: value } : { state: "invalid", code: "config_invalid" };
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return { state: "missing" };
    return { state: "invalid", code: error instanceof SyntaxError ? "config_invalid" : "io_failure" };
  }
}

// { state: "missing" } antes do setup; { state: "invalid", code } para arquivo
// alheio, link ou ilegível, ou pasta trocada; { state: "ok", config }. Nunca
// lança: hooks e ingest decidem pelo estado, sem exceção nem mensagem.
// `folder` (de configDir): a referência de setup/on/off, conferida antes de
// criar o lock — a primeira conferência daqui já recusa uma troca anterior a
// ele. Sem ela, vale a identidade da primeira conferência, e um nome que não é
// diretório continua sendo nada configurado.
export async function readObserveConfig({ home = userHome(), io = createStoreIo(), folder = null } = {}) {
  if (!absolute(home)) return { state: "missing" };
  const dir = path.join(home, CONFIG_DIR);
  try {
    let identity = folder?.identity;
    if (identity === undefined) {
      const stats = await lstatFolder(io, dir);
      if (stats === null || !stats.isDirectory()) return { state: "missing" };
      identity = identityOf(stats);
    } else {
      await assertConfigFolder(io, dir, identity);
    }
    const read = await readConfigFile(io, path.join(dir, CONFIG_FILE));
    await assertConfigFolder(io, dir, identity);
    return read;
  } catch (error) {
    return { state: "invalid", code: error instanceof ObserveConfigError ? error.code : "io_failure" };
  }
}

// Pasta da configuração, que precisa ser diretório real: { dir, identity }.
// Com `create` (só o setup) nasce 0700, não recursiva: o home já existe. Sem
// `create`, null quando ainda não existe — nada foi configurado.
export async function configDir({ home, io = createStoreIo(), create = false }) {
  if (!absolute(home)) {
    if (create) throw new ObserveConfigError("io_failure");
    return null;
  }
  const dir = path.join(home, CONFIG_DIR);
  if (create) {
    try {
      await io.mkdir(dir);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }
  const stats = await lstatFolder(io, dir);
  if (stats === null) {
    if (create) throw new ObserveConfigError("io_failure");
    return null;
  }
  if (!stats.isDirectory()) throw new ObserveConfigError("config_invalid");
  return { dir, identity: identityOf(stats) };
}

// Registro da autorização: a raiz que pode estar on, para o `off` alcançá-la
// mesmo com a pasta `.skill-me` trocada ou apagada depois de qualquer
// conferência (F3 da verificação, rodada 3). Fica no home, que não se move com
// a pasta. Só muda sob o lock do store da raiz que nomeia (claim/release, pelo
// changeObservation de privacy/store.mjs), dentro de um on ou off que já
// segura o lock do home: um on e um off nunca se cruzam entre o registro e o
// estado, e a criação exclusiva impede que duas raízes se registrem.
// Invariante: raiz on ⇒ registro com ela.

const authorizationPath = (home) => path.join(home, AUTHORIZATION_FILE);

// null sem registro; senão { rootReal }. Link ou junção: link_refused; outra
// entrada, ilegível ou fora da forma: config_invalid, e o arquivo fica — nunca
// se apaga o que não é nosso.
export async function readAuthorization({ home, io = createStoreIo() }) {
  if (!absolute(home)) return null;
  const file = authorizationPath(home);
  try {
    const stats = await io.lstat(file);
    if (stats.isSymbolicLink()) throw new ObserveConfigError("link_refused");
    if (!stats.isFile()) throw new ObserveConfigError("config_invalid");
    const bytes = await io.readBounded(file, MAX_CONFIG_BYTES);
    if (bytes === null) throw new ObserveConfigError("config_invalid");
    const value = JSON.parse(bytes.toString("utf8"));
    const valid =
      value !== null &&
      typeof value === "object" &&
      isDeepStrictEqual(Object.keys(value).sort(), AUTHORIZATION_KEYS) &&
      value.skillMeObserveAuthorization === AUTHORIZATION_VERSION &&
      absolute(value.rootReal);
    if (!valid) throw new ObserveConfigError("config_invalid");
    return { rootReal: value.rootReal };
  } catch (error) {
    // Apagado entre o lstat e a leitura por um off concorrente: não há registro.
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    if (error instanceof SyntaxError) throw new ObserveConfigError("config_invalid");
    throw error;
  }
}

// Antes de gravar on, sob o lock do store de `rootReal`. Sem temporário: a
// criação exclusiva é a própria decisão, e o flush a deixa no disco antes do
// estado on. Registro de outra raiz (ou que sumiu no meio, por um off
// concorrente): observe_on. Uma falha depois de criar o arquivo deixa-o
// incompleto (config_invalid até a remoção manual): apagá-lo depois de uma
// falha da abertura poderia apagar o registro que outra raiz acabou de criar.
export async function claimAuthorization({ home, io = createStoreIo(), rootReal }) {
  if (!absolute(home)) throw new ObserveConfigError("io_failure");
  try {
    await io.writeExclusive(authorizationPath(home), JSON.stringify({ skillMeObserveAuthorization: AUTHORIZATION_VERSION, rootReal }));
    return;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const current = await readAuthorization({ home, io });
  if (current?.rootReal !== rootReal) throw new ObserveConfigError("observe_on");
}

// Linha "Conflito com o registro" do Landing: um registro de outra raiz que não
// `rootReal` — com `rootReal` null, qualquer registro — diz que uma raiz pode
// estar on fora do alcance desta configuração. status e report --latest não
// respondem por ela, e setup não a troca: observe_on, sem caminho.
export async function assertNoOtherAuthorization({ home, io = createStoreIo() }, rootReal) {
  const recorded = await readAuthorization({ home, io });
  if (recorded !== null && recorded.rootReal !== rootReal) throw new ObserveConfigError("observe_on");
}

// Depois de gravar off e encerrar as automáticas, sob o mesmo lock do store
// de `rootReal`: apaga o registro só se ele nomeia esta raiz.
export async function releaseAuthorization({ home, io = createStoreIo(), rootReal }) {
  const current = await readAuthorization({ home, io });
  if (current === null || current.rootReal !== rootReal) return;
  try {
    await io.unlink(authorizationPath(home));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

// Só `observe setup` grava, na pasta `folder` conferida antes do lock. O
// arquivo entra por temporário `wx` 0600 + `rename`, sem nunca abrir um link no
// caminho final. A pasta é conferida entre os dois: o temporário gravado
// através de uma pasta trocada sai de lá, e o `rename` pelo nome só acha o
// temporário na pasta onde ele foi gravado.
export async function writeObserveConfig({ folder, config, io = createStoreIo() }) {
  const tmp = path.join(folder.dir, `${CONFIG_FILE}.${randomBytes(4).toString("hex")}.skill-me-tmp`);
  try {
    await io.writeExclusive(tmp, JSON.stringify(config));
    await assertConfigFolder(io, folder.dir, folder.identity);
    await io.rename(tmp, path.join(folder.dir, CONFIG_FILE));
  } catch (error) {
    await io.unlink(tmp).catch(() => {});
    throw error;
  }
}
