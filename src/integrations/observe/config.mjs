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
export const CONFIG_VERSION = 1;
const MAX_CONFIG_BYTES = 64 * 1024;
const MAX_ARGV = 32;
const MAX_ARG_LENGTH = 4096;
const KEYS = ["hermesDelivery", "root", "rootReal", "skillMeObserveConfig"];

export const configPath = (home) => path.join(home, CONFIG_DIR, CONFIG_FILE);

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

// { state: "missing" } antes do setup; { state: "invalid", code } para arquivo
// alheio, link ou ilegível; { state: "ok", config }. Nunca lança: hooks e
// ingest decidem pelo estado, sem exceção nem mensagem.
export async function readObserveConfig({ home = userHome(), io = createStoreIo() } = {}) {
  if (!absolute(home)) return { state: "missing" };
  const file = configPath(home);
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

export class ObserveConfigError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// Só `observe setup` grava. A pasta nasce 0700 (não recursiva: o home já
// existe) e precisa ser diretório real; o arquivo entra por temporário `wx`
// 0600 + `rename`, sem nunca abrir um link no caminho final.
export async function writeObserveConfig({ home, config, io = createStoreIo() }) {
  if (!absolute(home)) throw new ObserveConfigError("io_failure");
  const dir = path.join(home, CONFIG_DIR);
  try {
    await io.mkdir(dir);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const stats = await io.lstat(dir);
  if (stats.isSymbolicLink()) throw new ObserveConfigError("link_refused");
  if (!stats.isDirectory()) throw new ObserveConfigError("config_invalid");
  const tmp = path.join(dir, `${CONFIG_FILE}.${randomBytes(4).toString("hex")}.skill-me-tmp`);
  try {
    await io.writeExclusive(tmp, JSON.stringify(config));
    await io.rename(tmp, configPath(home));
  } catch (error) {
    await io.unlink(tmp).catch(() => {});
    throw error;
  }
}
