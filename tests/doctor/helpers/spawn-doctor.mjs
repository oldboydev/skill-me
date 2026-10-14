import { spawnSync } from "node:child_process";
import path from "node:path";

export const CLI_PATH = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "src/doctor/cli.mjs",
);

// Executa a CLI real como processo filho. env substitui totalmente o
// ambiente herdado (PATH vazio por padrão) para que fixtures controlem
// exatamente quais agentes são "encontrados".
export function runDoctor(args = [], { env = {}, cwd } = {}) {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: "utf8",
    cwd,
    env: { PATH: "", ...env },
    timeout: 15_000,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    signal: result.signal,
    error: result.error,
  };
}

export function runDoctorJson(args = [], options = {}) {
  const result = runDoctor([...args, "--json"], options);
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (cause) {
    throw new Error(
      `stdout não é um JSON único válido: ${JSON.stringify(result.stdout)}`,
      { cause },
    );
  }
  return { ...result, report };
}
