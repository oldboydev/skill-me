import { CliUsageError } from "../doctor/cli-args.mjs";
import { HELP_TEXT, parseCommandFlags, parseRunArgs, wantsJson } from "./cli-args.mjs";

// CLI separado do doctor (que continua somente leitura). `hook` e `ingest`
// são iniciados pelas integrações instaladas e terminam sempre com 0: uma falha
// do debugger nunca muda o código que o agente vê. Os módulos de cada comando
// são importados sob demanda para o hook de cada evento carregar só o mínimo.

const argv = process.argv.slice(2);
const command = argv[0];

async function internal(loader, exportName, allowedAgents) {
  try {
    const flags = parseCommandFlags(argv.slice(1), new Set(["--agent"]));
    const module = await loader();
    await module[exportName]({
      agent: allowedAgents.includes(flags.agent) ? flags.agent : null,
      stdin: process.stdin,
      env: process.env,
    });
  } catch {
    // Absorvido: hooks e ingest nunca propagam falha ao agente.
  }
  process.exit(0);
}

async function installer() {
  const json = wantsJson(argv.slice(1));
  let result;
  try {
    const flags = parseCommandFlags(argv.slice(1), new Set(["--agent", "--target", "--apply", "--json"]));
    const { runIntegrationCommand } = await import("./install/run.mjs");
    result = await runIntegrationCommand({ command, agent: flags.agent, target: flags.target, apply: flags.apply });
  } catch (error) {
    const code = error instanceof CliUsageError ? error.code : "unexpected_error";
    result = {
      schemaVersion: 1,
      command,
      agent: null,
      target: null,
      applied: false,
      status: error instanceof CliUsageError ? "usage_error" : "incomplete",
      changes: [],
      conflicts: [],
      errors: [{ code }],
      steps: [],
      manualSteps: [],
      exitCode: error instanceof CliUsageError ? 2 : 5,
    };
  }
  const { exitCode, ...body } = result;
  if (json) process.stdout.write(JSON.stringify(body) + "\n");
  else {
    const { renderText } = await import("./install/render.mjs");
    process.stdout.write(renderText(body));
  }
  process.exitCode = exitCode;
}

async function supervised() {
  let parsed;
  try {
    parsed = parseRunArgs(argv.slice(1));
  } catch (error) {
    process.stderr.write(`skill-me integrations run: uso inválido [${error.code ?? "usage"}]\n`);
    process.exitCode = 2;
    return;
  }
  const { runSupervisedCodex } = await import("./codex-run.mjs");
  await runSupervisedCodex(parsed);
}

// Controle de capturas de privacidade: um JSON por execução em stdout (o
// `follow` escreve as próprias linhas), stderr vazio; qualquer falha
// inesperada vira o código fechado io_failure.
async function privacy() {
  const { runPrivacyCommand } = await import("./privacy/command.mjs");
  // Cada linha do follow espera o stdout aceitá-la: um consumidor lento não
  // acumula a captura inteira na memória, e um que saiu encerra o follow.
  let stdoutClosed = false;
  process.stdout.on("error", () => {
    stdoutClosed = true;
  });
  const write = (text) =>
    new Promise((resolve) => {
      if (stdoutClosed) return resolve(false);
      process.stdout.write(text, (error) => resolve(!error && !stdoutClosed));
    });
  let result;
  try {
    result = await runPrivacyCommand({ argv: argv.slice(1), stdin: process.stdin, write });
  } catch {
    result = { exitCode: 5, body: { schemaVersion: 1, command: null, status: "error", error: { code: "io_failure" } } };
  }
  if (result.help !== undefined) process.stdout.write(result.help);
  else if (result.body !== undefined) process.stdout.write(JSON.stringify(result.body) + "\n");
  process.exitCode = result.exitCode;
}

async function report() {
  const { runReportCommand } = await import("./report/command.mjs");
  const result = await runReportCommand({ argv: argv.slice(1) });
  process.stdout.write(result.output);
  process.exitCode = result.exitCode;
}

switch (command) {
  case "report":
    await report();
    break;
  case "privacy":
    await privacy();
    break;
  case "hook":
    await internal(() => import("./hook-command.mjs"), "runHookCommand", ["claude", "codex"]);
    break;
  case "ingest":
    await internal(() => import("./ingest-command.mjs"), "runIngestCommand", ["hermes"]);
    break;
  case "plan":
  case "install":
  case "uninstall":
    await installer();
    break;
  case "run":
    await supervised();
    break;
  case "--help":
  case "help":
    process.stdout.write(HELP_TEXT);
    break;
  default:
    process.stderr.write(HELP_TEXT);
    process.exitCode = 2;
}
