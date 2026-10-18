// Pré-carga só de teste da issue #8 (`node --import <este arquivo> cli.mjs …`).
// O produto não lê nenhuma destas variáveis; o instrumento envolve
// `open`/`unlink` de node:fs/promises e publica os wrappers nos imports ESM com
// `syncBuiltinESMExports`, como helpers/fs-probe.mjs.
//
// SKILL_ME_TEST_TRACES_GATE=<pasta>|<n>: antes da n-ésima criação exclusiva do
// `.lock` do store, cria `<pasta>/waiting` e espera `<pasta>/go` existir — o
// processo fica parado fora do lock, num ponto conhecido (sondagem do follow).
//
// SKILL_ME_TEST_TRACES_LOST_CONFIRMATION=<n>: o n-ésimo `unlink` do `.lock`
// acontece de verdade e depois lança EIO — o commit e a liberação do lock
// ocorreram, mas quem chamou só vê a falha (confirmação perdida).
import { existsSync, writeFileSync } from "node:fs";
import { createRequire, syncBuiltinESMExports } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const fsp = require("node:fs/promises");
const env = process.env;
const [gateDir, gateAt] = (env.SKILL_ME_TEST_TRACES_GATE ?? "").split("|");
const lostAt = Number(env.SKILL_ME_TEST_TRACES_LOST_CONFIRMATION ?? 0);
const isLock = (file) => typeof file === "string" && path.basename(file) === ".lock";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (gateDir) {
  const realOpen = fsp.open;
  let creations = 0;
  fsp.open = async function gatedOpen(file, flags, mode) {
    if (isLock(file) && typeof flags === "string" && flags.includes("x") && ++creations === Number(gateAt)) {
      writeFileSync(path.join(gateDir, "waiting"), String(process.pid));
      const deadline = Date.now() + 30_000;
      while (!existsSync(path.join(gateDir, "go")) && Date.now() < deadline) await sleep(10);
    }
    return realOpen(file, flags, mode);
  };
}

if (lostAt > 0) {
  const realUnlink = fsp.unlink;
  let unlinks = 0;
  fsp.unlink = async function lossyUnlink(file) {
    const result = await realUnlink(file);
    if (isLock(file) && ++unlinks === lostAt) throw Object.assign(new Error("EIO injetado pelo teste"), { code: "EIO" });
    return result;
  };
}

syncBuiltinESMExports();
