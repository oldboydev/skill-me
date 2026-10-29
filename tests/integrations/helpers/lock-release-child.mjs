import path from "node:path";
import { setImmediate as nextTurn } from "node:timers/promises";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { holdLockFile, StoreError } from "../../../src/integrations/privacy/store.mjs";

// Processo filho próprio das provas da liberação do lock (issue #25, C46 (u);
// linha "Liberação do lock por reserva exclusiva" do Landing). Usa só a API
// pública do store; a saída tem só números e códigos, nunca caminho.
//
//   disputa <lock> <eventos> <início, ms desde a época>: espera o início comum e
//   toma e libera o lock `eventos` vezes. `lock_present` é tentado de novo na
//   volta seguinte do laço; qualquer outro erro perde o evento, como numa
//   entrega, e é contado pelo código. Escreve uma linha
//   {"ok":n,"lockPresent":n,"falhas":{"<código>":n}}.
//
//   queda <lock> <reserva|rename|retirado>: toma o lock e sai com 7 logo depois
//   do `mkdtemp`, do `rename` do lock ou do `unlink` do arquivo retirado.
const [mode, lockPath, value, startAt] = process.argv.slice(2);
const codeOf = (error) => (error instanceof StoreError ? error.code : typeof error?.code === "string" ? error.code : (error?.name ?? "erro"));

async function contend(events) {
  const io = createStoreIo();
  const counts = { ok: 0, lockPresent: 0, falhas: {} };
  while (Date.now() < Number(startAt)) await nextTurn();
  for (let event = 0; event < events; event++) {
    for (;;) {
      try {
        await holdLockFile({ io, lockPath, lostCode: "lock_lost" }, async () => {});
        counts.ok += 1;
        break;
      } catch (error) {
        if (error instanceof StoreError && error.code === "lock_present") {
          counts.lockPresent += 1;
          await nextTurn();
          continue;
        }
        counts.falhas[codeOf(error)] = (counts.falhas[codeOf(error)] ?? 0) + 1;
        break;
      }
    }
  }
  process.stdout.write(`${JSON.stringify(counts)}\n`);
}

async function crash(point) {
  const base = createStoreIo();
  const exitAfter = (name, matches) => async (...args) => {
    const result = await base[name](...args);
    if (matches(...args)) process.exit(7);
    return result;
  };
  const io = {
    ...base,
    mkdtemp: exitAfter("mkdtemp", () => point === "reserva"),
    rename: exitAfter("rename", (from) => point === "rename" && from === lockPath),
    unlink: exitAfter("unlink", (file) => point === "retirado" && path.basename(file) === "lock"),
  };
  await holdLockFile({ io, lockPath, lostCode: "lock_lost" }, async () => {});
}

if (mode === "disputa") await contend(Number(value));
else if (mode === "queda") await crash(value);
else {
  process.stderr.write("uso: lock-release-child.mjs disputa|queda …\n");
  process.exitCode = 2;
}
