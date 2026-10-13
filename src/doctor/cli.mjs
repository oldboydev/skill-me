import { stat } from "node:fs/promises";
import { CliUsageError, HELP_TEXT, parseArgs, wantsJsonOutput } from "./cli-args.mjs";
import { createProductionFsAdapter } from "./fs-adapter.mjs";
import { runDiagnostics } from "./run-diagnostics.mjs";
import { exitCodeForStatus, toFailureEnvelope } from "./report-envelope.mjs";
import { renderText } from "./render-text.mjs";

// A mensagem impressa em stderr vem sempre do envelope seguro (vocabulário
// fechado de report-envelope.mjs), nunca de `error.message` diretamente: um
// valor arbitrário recebido pela CLI (flag, cwd, endpoint) nunca alcança a
// saída de texto, da mesma forma que já não alcança o JSON.
function emitFailure(error, { json, exitCode }) {
  const envelope = toFailureEnvelope(error);
  if (json) {
    process.stdout.write(JSON.stringify(envelope) + "\n");
  } else {
    process.stderr.write(`Erro: ${envelope.errors[0].message}\n`);
  }
  process.exitCode = exitCode;
}

async function assertDirectoryExists(dirPath) {
  let stats;
  try {
    stats = await stat(dirPath);
  } catch {
    throw new CliUsageError("diretório informado em --cwd não existe ou não é acessível", {
      code: "cwd_not_found",
    });
  }
  if (!stats.isDirectory()) {
    throw new CliUsageError("caminho informado em --cwd não é um diretório", {
      code: "cwd_not_a_directory",
    });
  }
}

async function main(argv) {
  const json = wantsJsonOutput(argv);
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    emitFailure(error, { json, exitCode: 2 });
    return;
  }

  if (args.help) {
    process.stdout.write(HELP_TEXT);
    process.exitCode = 0;
    return;
  }

  const cwd = args.cwd ?? process.cwd();
  try {
    await assertDirectoryExists(cwd);
  } catch (error) {
    emitFailure(error, { json: args.json, exitCode: 2 });
    return;
  }

  const report = await runDiagnostics({
    cwd,
    collectorEndpoint: args.collector,
    env: process.env,
    platform: process.platform,
    fs: createProductionFsAdapter(),
  });

  if (args.json) {
    process.stdout.write(JSON.stringify(report) + "\n");
  } else {
    process.stdout.write(renderText(report));
  }
  process.exitCode = exitCodeForStatus(report.status);
}

main(process.argv.slice(2)).catch((error) => {
  emitFailure(error, { json: wantsJsonOutput(process.argv.slice(2)), exitCode: 1 });
});
