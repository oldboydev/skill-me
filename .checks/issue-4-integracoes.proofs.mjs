// Executa, exatamente como escritas, todas as linhas `Proof:` de
// .checks/issue-4-integracoes.md e tabula o resumo TAP de cada uma.
// Uso: node .checks/issue-4-integracoes.proofs.mjs [saída.md]
// Não substitui o Verifier: só repete os comandos e registra o que saiu.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const checklist = readFileSync(path.join(root, ".checks", "issue-4-integracoes.md"), "utf8").replaceAll("\r\n", "\n");

// Tokens separados por espaço, respeitando aspas duplas (o padrão de nome contém espaço).
function tokenize(command) {
  const tokens = [];
  let current = "";
  let quoted = false;
  let started = false;
  for (const char of command) {
    if (char === '"') {
      quoted = !quoted;
      started = true;
    } else if (char === " " && !quoted) {
      if (started) tokens.push(current);
      current = "";
      started = false;
    } else {
      current += char;
      started = true;
    }
  }
  if (started) tokens.push(current);
  return tokens;
}

const rows = [];
let check = null;
for (const line of checklist.split("\n")) {
  const heading = /^\*\*(C\d+)\*\*/.exec(line);
  if (heading) check = heading[1];
  const proof = /^Proof: `([^`]+)`(.*)$/.exec(line);
  if (!proof || !check) continue;
  const [command, ...args] = tokenize(proof[1]);
  if (command !== "node") throw new Error(`comando inesperado em ${check}: ${proof[1]}`);
  const started = Date.now();
  const run = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", timeout: 600_000 });
  const summary = (name) => Number(new RegExp(`^# ${name} (\\d+)$`, "m").exec(run.stdout ?? "")?.[1] ?? NaN);
  const skipReasons = [...(run.stdout ?? "").matchAll(/# SKIP (.+)$/gm)].map((m) => m[1].trim());
  rows.push({
    check,
    command: proof[1],
    contract: proof[2].trim(),
    exit: run.status,
    tests: summary("tests"),
    pass: summary("pass"),
    fail: summary("fail"),
    skipped: summary("skipped"),
    seconds: ((Date.now() - started) / 1000).toFixed(1),
    skipReasons,
  });
  process.stdout.write(`${check} exit=${run.status} tests=${summary("tests")} pass=${summary("pass")} fail=${summary("fail")} skipped=${summary("skipped")}\n`);
}

const table = [
  "| Check | Comando | Contrato | exit | tests | pass | fail | skipped | s | motivo do skip |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...rows.map((r) => `| ${r.check} | \`${r.command}\` | ${r.contract || "N=1"} | ${r.exit} | ${r.tests} | ${r.pass} | ${r.fail} | ${r.skipped} | ${r.seconds} | ${r.skipReasons.join("; ") || "-"} |`),
].join("\n");
if (process.argv[2]) writeFileSync(process.argv[2], table + "\n");
process.stdout.write(`\n${rows.length} provas executadas\n`);
process.exitCode = rows.every((r) => r.exit === 0 && r.fail === 0) ? 0 : 1;
