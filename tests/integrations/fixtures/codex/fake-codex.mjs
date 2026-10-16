// Codex falso para as provas do wrapper supervisionado (fixture sintética,
// nunca executa modelo). Reporta no stderr o que recebeu e emite no stdout os
// passos de um cenário JSON (FAKE_CODEX_SCENARIO), na ordem e no ritmo pedidos.
import { existsSync, readFileSync, writeSync } from "node:fs";

const env = process.env;
const scenario = env.FAKE_CODEX_SCENARIO ? JSON.parse(readFileSync(env.FAKE_CODEX_SCENARIO, "utf8")) : { steps: [] };
const stdinText = env.FAKE_CODEX_READ_STDIN === "1" ? readFileSync(0, "utf8") : null;

const probe = { argv: process.argv.slice(2), cwd: process.cwd(), env: { ...env }, stdin: stdinText };
writeSync(2, `FAKE_CODEX_PROBE ${JSON.stringify(probe)}\n`);

// Último instante observável dentro do filho (relógio do sistema), para medir
// quanto o wrapper demora a sair depois dele.
if (env.FAKE_CODEX_EXIT_STAMP === "1") process.on("exit", () => writeSync(2, `FAKE_CODEX_EXIT_AT ${Date.now()}\n`));

if (env.FAKE_CODEX_ON_SIGINT) {
  process.on("SIGINT", () => {
    writeSync(1, JSON.stringify({ type: "turn.failed", error: { message: "interrompido" } }) + "\n");
    process.exit(Number(env.FAKE_CODEX_ON_SIGINT));
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (const step of scenario.steps) {
  if (step.stdout !== undefined) writeSync(1, step.stdout + "\n");
  if (step.raw !== undefined) writeSync(1, step.raw);
  if (step.stderr !== undefined) writeSync(2, step.stderr + "\n");
  if (step.repeat !== undefined) for (let i = 0; i < step.repeat.count; i++) writeSync(1, step.repeat.line.replaceAll("{i}", String(i)) + "\n");
  if (step.sleepMs !== undefined) await sleep(step.sleepMs);
  if (step.waitFile !== undefined) {
    const deadline = Date.now() + 10_000;
    while (!existsSync(step.waitFile)) {
      if (Date.now() > deadline) process.exit(99);
      await sleep(20);
    }
  }
  if (step.waitForever) await new Promise(() => setInterval(() => {}, 1000));
}

if (env.FAKE_CODEX_SELF_SIGNAL) process.kill(process.pid, env.FAKE_CODEX_SELF_SIGNAL);
process.exitCode = Number(env.FAKE_CODEX_EXIT ?? 0);
