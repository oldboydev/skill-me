// Fixture sintética da issue #4: destinos de entrega para o plugin Hermes.
// Uso: delivery.mjs <capture|stall|exit|disconnect> [arquivo] [log de spawn]
import { appendFileSync, writeFileSync } from "node:fs";

const [mode, outFile, spawnLog] = process.argv.slice(2);
if (spawnLog) appendFileSync(spawnLog, `${mode}\n`);

// Sai quando o processo Hermes (pai) termina: um destino travado nunca fica órfão.
function exitWithParent() {
  const parent = process.ppid;
  setInterval(() => {
    try {
      process.kill(parent, 0);
    } catch {
      process.exit(0);
    }
  }, 200);
  setTimeout(() => process.exit(0), 60_000);
}

if (mode === "capture") {
  writeFileSync(outFile, "");
  process.stdin.on("data", (chunk) => appendFileSync(outFile, chunk));
  process.stdin.on("end", () => writeFileSync(outFile + ".done", "ok"));
} else if (mode === "stall") {
  // Nunca lê o stdin: o pipe enche e quem escreve fica bloqueado.
  exitWithParent();
} else if (mode === "exit") {
  process.exit(1);
} else if (mode === "disconnect") {
  process.stdin.once("data", () => process.exit(0));
} else {
  process.exit(2);
}
