// Pré-carga só de teste (`node --import <este arquivo> cli.mjs …`): observa o
// temporário da reescrita de configuração (`*.skill-me-tmp`) nos instantes em
// que um terceiro poderia abri-lo — logo após a criação, imediatamente antes e
// depois da escrita do conteúdo e imediatamente antes do rename. Registra só
// modo, dono, grupo, tamanho e se o canário sintético está no arquivo, em
// JSONL no caminho de SKILL_ME_TEST_FS_PROBE_LOG; nunca o conteúdo. O produto
// não lê essas variáveis: o instrumento envolve `open`/`rename` de
// node:fs/promises e publica os wrappers nos imports ESM com
// `syncBuiltinESMExports`. Com SKILL_ME_TEST_FS_PROBE_FAIL_CHOWN=1, `chown`
// no handle do temporário falha com EPERM, como para um grupo do qual o
// usuário não é membro. Com SKILL_ME_TEST_FS_PROBE_FAIL_RENAME_TO=<nome>, o
// rename cujo destino tem esse nome de arquivo falha com EIO (falha real de
// E/S no processo do CLI, sem depender de um obstáculo no caminho), com ou
// sem o registro de observações. No Windows cada observação traz também a
// DACL do temporário, decomposta em ACEs com SIDs rotulados
// (helpers/windows-acl.mjs). Com SKILL_ME_TEST_FS_PROBE_NO_POWERSHELL=1, o
// `spawn` do PowerShell do Windows pelo processo do CLI aponta para um
// executável inexistente ao lado dele: a falha real de criação de processo
// (ENOENT), como num sistema sem o componente ou com ele removido.
import { appendFileSync, lstatSync, readFileSync } from "node:fs";
import { createRequire, syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { readAces } from "./windows-acl.mjs";

const require = createRequire(import.meta.url);
const fsp = require("node:fs/promises");
const log = process.env.SKILL_ME_TEST_FS_PROBE_LOG;
const canary = process.env.SKILL_ME_TEST_FS_PROBE_CANARY ?? "";
const failChown = process.env.SKILL_ME_TEST_FS_PROBE_FAIL_CHOWN === "1";
const failRenameTo = process.env.SKILL_ME_TEST_FS_PROBE_FAIL_RENAME_TO ?? "";
const noPowerShell = process.env.SKILL_ME_TEST_FS_PROBE_NO_POWERSHELL === "1";
const isTemp = (file) => typeof file === "string" && file.endsWith(".skill-me-tmp");

function record(moment, file) {
  const stats = lstatSync(file);
  const entry = { moment, file: path.basename(file), mode: stats.mode & 0o7777, uid: stats.uid, gid: stats.gid, size: stats.size };
  if (canary !== "" && stats.isFile()) entry.containsCanary = readFileSync(file).includes(canary);
  if (process.platform === "win32") entry.dacl = readAces(file);
  appendFileSync(log, JSON.stringify(entry) + "\n");
}

if (noPowerShell) {
  const childProcess = require("node:child_process");
  const realSpawn = childProcess.spawn;
  childProcess.spawn = function spawnWithoutPowerShell(command, ...rest) {
    const missing = typeof command === "string" && path.win32.basename(command).toLowerCase() === "powershell.exe";
    return realSpawn.call(this, missing ? path.join(path.dirname(command), "powershell-ausente-na-prova.exe") : command, ...rest);
  };
}

if (log) {
  const realOpen = fsp.open;
  fsp.open = async function probedOpen(file, flags, mode) {
    const handle = await realOpen(file, flags, mode);
    if (!isTemp(file) || typeof flags !== "string" || !flags.includes("x")) return handle;
    record("created", file);
    return new Proxy(handle, {
      get(target, property) {
        const value = Reflect.get(target, property, target);
        if (typeof value !== "function") return value;
        if (property === "chown" && failChown) {
          return async () => {
            throw Object.assign(new Error("EPERM injetado pelo teste"), { code: "EPERM" });
          };
        }
        if (property === "writeFile" || property === "write") {
          return async (...args) => {
            record("before_content", file);
            const result = await value.apply(target, args);
            record("after_content", file);
            return result;
          };
        }
        return value.bind(target);
      },
    });
  };
}
if (log || failRenameTo !== "") {
  const realRename = fsp.rename;
  fsp.rename = async function probedRename(from, to) {
    if (log && isTemp(from)) record("before_rename", from);
    if (failRenameTo !== "" && typeof to === "string" && path.basename(to) === failRenameTo) {
      throw Object.assign(new Error("EIO injetado pelo teste"), { code: "EIO" });
    }
    return realRename(from, to);
  };
}
syncBuiltinESMExports();
