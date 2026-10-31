// Fixture sintética da issue #25: agente falso que `skill-me <agente>` inicia
// nas provas (como claude, codex ou hermes do PATH). Nunca executa modelo nem
// rede. Registra o que recebeu e segue um cenário: hooks pela linha instalada
// (como o Claude e o Codex os iniciam), entrega Hermes pelo `hermesDelivery`
// da configuração única (como o plugin), sinais, esperas e código de saída.
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync, readSync, writeFileSync, writeSync } from "node:fs";
import path from "node:path";
import { readClaudeHandlers, readCodexHandlers, runClaudeHandler, runCodexHandler } from "../../helpers/installed-hooks.mjs";

const env = process.env;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const scenario = env.FAKE_AGENT_SCENARIO ? JSON.parse(readFileSync(env.FAKE_AGENT_SCENARIO, "utf8")) : { steps: [] };
const home = env.USERPROFILE || env.HOME;

// Capturas da execução vistas no disco, sem o código do produto: state.json
// de cada captura com a `invocation` do par herdado, e o ponteiro dela.
function launchView() {
  const root = env.SKILL_ME_LAUNCH_ROOT;
  const id = env.SKILL_ME_LAUNCH_ID;
  if (!root || !id) return { captures: [], pointer: null };
  const store = path.join(root, "skill-me-privacy");
  const captures = [];
  const dir = path.join(store, "captures");
  if (existsSync(dir)) {
    for (const name of readdirSync(dir)) {
      try {
        const state = JSON.parse(readFileSync(path.join(dir, name, "state.json"), "utf8"));
        if (state.invocation === id) captures.push(state);
      } catch {
        // Captura de outra execução em gravação: não é desta.
      }
    }
  }
  const pointerFile = path.join(store, "launches", `${id}.json`);
  return { captures, pointer: existsSync(pointerFile) ? JSON.parse(readFileSync(pointerFile, "utf8")) : null };
}

// Uma linha do terminal herdado (sem o fim de linha), como um agente que lê o
// primeiro pedido do usuário.
function readOneLine() {
  const bytes = [];
  const one = Buffer.alloc(1);
  while (readSync(0, one, 0, 1, null) === 1 && one[0] !== 0x0a) bytes.push(one[0]);
  return Buffer.from(bytes).toString("utf8").replace(/\r$/, "");
}

const SKILL_ME_VARS = (source) => Object.fromEntries(Object.entries(source).filter(([name]) => name.toUpperCase().startsWith("SKILL_ME_")));

if (env.FAKE_AGENT_PROBE) {
  const stdin = env.FAKE_AGENT_READ_STDIN === "1" ? readFileSync(0, "utf8") : env.FAKE_AGENT_READ_LINE === "1" ? readOneLine() : null;
  const probe = { argv: process.argv.slice(2), execPath: process.execPath, script: process.argv[1], stdin, env: SKILL_ME_VARS(env), path: env.PATH ?? null, cwd: process.cwd(), atStart: launchView() };
  appendFileSync(env.FAKE_AGENT_PROBE, JSON.stringify(probe) + "\n");
}
if (env.FAKE_AGENT_STDOUT) writeSync(1, env.FAKE_AGENT_STDOUT);
if (env.FAKE_AGENT_STDERR) writeSync(2, env.FAKE_AGENT_STDERR);

// Sinais recebidos, um por linha; com FAKE_AGENT_EXIT_ON o agente termina pelo
// sinal recebido (reemitido sobre si, como um agente real sem tratador).
if (env.FAKE_AGENT_SIGNALS) {
  const signals = process.platform === "win32" ? ["SIGINT", "SIGHUP", "SIGBREAK"] : ["SIGINT", "SIGQUIT", "SIGHUP", "SIGTERM"];
  for (const signal of signals) {
    const handler = () => {
      appendFileSync(env.FAKE_AGENT_SIGNALS, signal + "\n");
      if (env.FAKE_AGENT_EXIT_ON === signal) {
        process.removeListener(signal, handler);
        process.kill(process.pid, signal);
      }
    };
    process.on(signal, handler);
  }
}

const reports = (step, report) => {
  if (env.FAKE_AGENT_REPORTS) appendFileSync(env.FAKE_AGENT_REPORTS, JSON.stringify({ step, report }) + "\n");
};

async function runHook({ agent, payload }) {
  if (agent === "claude") {
    const handlers = readClaudeHandlers(env.CLAUDE_CONFIG_DIR);
    const result = await runClaudeHandler(handlers[payload.hook_event_name].handler, payload, { env, cwd: process.cwd() });
    return result.report;
  }
  const handlers = readCodexHandlers(env.CODEX_HOME);
  const result = await runCodexHandler(handlers[payload.hook_event_name].handler, payload, { env, cwd: process.cwd() });
  return result.report;
}

// Processo de entrega Hermes, como o plugin o inicia: o argv da configuração
// única, ambiente herdado, stdin em pipe e saídas descartadas.
let delivery = null;
function openHermes() {
  const config = JSON.parse(readFileSync(path.join(home, ".skill-me", "observe.json"), "utf8"));
  const [command, ...args] = config.hermesDelivery;
  delivery = spawn(command, args, { env, stdio: ["pipe", "ignore", "ignore"], windowsHide: true });
  delivery.stdin.on("error", () => {});
}

// Entregue = escrito no pipe (o `delivered` do plugin): o callback da escrita.
const deliver = (records) =>
  new Promise((resolve) => delivery.stdin.write(records.map((record) => JSON.stringify(record) + "\n").join(""), () => resolve()));

async function waitPersisted(count) {
  const deadline = Date.now() + 30_000;
  for (;;) {
    const persisted = launchView().captures.reduce((sum, state) => sum + state.counters.persisted, 0);
    if (persisted >= count) return;
    if (Date.now() > deadline) process.exit(98);
    await sleep(20);
  }
}

async function waitFile(file) {
  const deadline = Date.now() + 60_000;
  while (!existsSync(file)) {
    if (Date.now() > deadline) process.exit(99);
    await sleep(20);
  }
}

for (const [index, step] of scenario.steps.entries()) {
  if (step.hook) reports(index, await runHook(step.hook));
  if (step.hermesOpen) openHermes();
  if (step.hermes) await deliver(step.hermes);
  if (step.waitPersisted !== undefined) await waitPersisted(step.waitPersisted);
  if (step.touch) writeFileSync(step.touch, "");
  if (step.waitFile) await waitFile(step.waitFile);
  if (step.sleepMs !== undefined) await sleep(step.sleepMs);
  if (step.writeFile) writeFileSync(step.writeFile.path, step.writeFile.text);
  if (step.run) {
    // Um processo filho do agente (ex.: o Python do plugin Hermes real), com
    // o ambiente herdado; o agente espera por ele.
    const child = spawn(step.run.command, step.run.args, { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.stderr.on("data", (chunk) => (out += chunk));
    const status = await new Promise((resolve) => child.on("close", resolve));
    if (step.run.output) writeFileSync(step.run.output, JSON.stringify({ status, out }));
  }
  if (step.waitForever) await new Promise(() => setInterval(() => {}, 1000));
}

// Termina por um sinal enviado a si mesmo (no Windows, o node encerra o
// processo com código 1).
if (env.FAKE_AGENT_SELF_SIGNAL) process.kill(process.pid, env.FAKE_AGENT_SELF_SIGNAL);

// Sai logo depois da última entrega: o processo de entrega fica com o pipe e
// recebe o EOF quando este processo termina, como no Hermes.
process.exit(Number(env.FAKE_AGENT_EXIT ?? 0));
