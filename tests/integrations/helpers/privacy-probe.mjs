// Pré-carga só de teste da issue #5 (`node --import <este arquivo> cli.mjs …`).
// Registra em JSONL, no caminho de SKILL_ME_TEST_PRIVACY_PROBE_LOG, toda
// abertura/leitura/escrita de arquivo pela API pública de `fs` e
// `fs/promises` e toda criação de processo por `child_process`, com o caminho
// absoluto e — para arquivos escritos — se o marcador sintético
// (SKILL_ME_TEST_PRIVACY_PROBE_MARKER) estava no arquivo ao fechar o handle.
// Rede (`net.connect`/`createConnection`, `dns.lookup`, `http(s).request/get`,
// `fetch`) é registrada e lança. Com SKILL_ME_TEST_PRIVACY_PROBE_FAIL_UNLINK=<nome>
// o unlink desse nome de arquivo falha com EIO. Com
// SKILL_ME_TEST_PRIVACY_PROBE_RETARGET_ON_LOCK=<link>|<alvo>, logo depois de o
// `.lock` ser criado, a junção/link `<link>` é renomeada e outra com o mesmo
// nome passa a apontar para `<alvo>` (raiz trocada durante a operação). O
// produto não lê nenhuma dessas variáveis.
import { createRequire, syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const childProcess = require("node:child_process");
const net = require("node:net");
const dns = require("node:dns");
const http = require("node:http");
const https = require("node:https");

const env = process.env;
const log = env.SKILL_ME_TEST_PRIVACY_PROBE_LOG;
const marker = env.SKILL_ME_TEST_PRIVACY_PROBE_MARKER ?? "";
const failUnlink = env.SKILL_ME_TEST_PRIVACY_PROBE_FAIL_UNLINK ?? "";
const retarget = env.SKILL_ME_TEST_PRIVACY_PROBE_RETARGET_ON_LOCK ?? "";

const original = {
  readFileSync: fs.readFileSync,
  renameSync: fs.renameSync,
  symlinkSync: fs.symlinkSync,
};
// O log é escrito por um fd aberto antes das trocas: `appendFileSync` chama
// `fs.writeFileSync`, que a sonda envolve, e a gravação entraria em recursão.
const logFd = log ? fs.openSync(log, "a") : null;

function record(entry) {
  if (logFd !== null) fs.writeSync(logFd, JSON.stringify(entry) + "\n");
}

const asPath = (file) => (typeof file === "string" ? path.resolve(file) : file instanceof URL ? fileURLToPath(file) : typeof file);
const writes = (flags) => typeof flags === "string" && /[wax+]/.test(flags);

function containsMarker(file) {
  if (marker === "") return null;
  try {
    return original.readFileSync.call(fs, file).includes(marker);
  } catch {
    return null;
  }
}

let retargeted = false;
function afterLockCreated(file) {
  if (retarget === "" || retargeted || path.basename(file) !== ".lock") return;
  retargeted = true;
  const [link, target] = retarget.split("|");
  original.renameSync.call(fs, link, `${link}.trocado`);
  original.symlinkSync.call(fs, target, link, "junction");
}

const realOpenP = fsp.open;
fsp.open = async function probedOpen(file, flags, mode) {
  const handle = await realOpenP(file, flags, mode);
  const resolved = asPath(file);
  record({ op: "open", file: resolved, flags: flags ?? "r" });
  if (!writes(flags)) return handle;
  if (typeof flags === "string" && flags.includes("x")) afterLockCreated(resolved);
  const realClose = handle.close.bind(handle);
  handle.close = async () => {
    const result = await realClose();
    record({ op: "closed_written", file: resolved, containsMarker: containsMarker(resolved) });
    return result;
  };
  return handle;
};

for (const name of ["readFile", "writeFile", "appendFile"]) {
  const real = fsp[name];
  fsp[name] = function probed(file, ...rest) {
    record({ op: `promises.${name}`, file: asPath(file) });
    return real.call(this, file, ...rest);
  };
}

const realUnlinkP = fsp.unlink;
fsp.unlink = async function probedUnlink(file) {
  if (failUnlink !== "" && path.basename(String(file)) === failUnlink) {
    throw Object.assign(new Error("EIO injetado pelo teste"), { code: "EIO" });
  }
  return realUnlinkP(file);
};

for (const name of ["open", "openSync", "readFile", "readFileSync", "writeFile", "writeFileSync", "appendFile", "appendFileSync", "createReadStream", "createWriteStream"]) {
  const real = fs[name];
  fs[name] = function probed(file, ...rest) {
    record({ op: `fs.${name}`, file: asPath(file) });
    return real.call(this, file, ...rest);
  };
}

for (const name of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"]) {
  const real = childProcess[name];
  childProcess[name] = function probed(command, ...rest) {
    record({ op: `child_process.${name}`, command: String(command) });
    return real.call(this, command, ...rest);
  };
}

function refuseNetwork(label) {
  return function refused() {
    record({ op: "network", call: label });
    throw Object.assign(new Error("rede recusada pela sonda"), { code: "EPROBE" });
  };
}
net.connect = refuseNetwork("net.connect");
net.createConnection = refuseNetwork("net.createConnection");
dns.lookup = refuseNetwork("dns.lookup");
dns.promises.lookup = refuseNetwork("dns.promises.lookup");
for (const [label, mod] of [["http", http], ["https", https]]) {
  mod.request = refuseNetwork(`${label}.request`);
  mod.get = refuseNetwork(`${label}.get`);
}
globalThis.fetch = refuseNetwork("fetch");

syncBuiltinESMExports();
