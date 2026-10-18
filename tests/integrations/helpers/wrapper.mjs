import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { INTEGRATIONS_CLI, parseReport } from "./cli.mjs";
import { FIXTURES_DIR, loadFixture } from "./fixtures.mjs";

export const FAKE_CODEX = path.join(FIXTURES_DIR, "codex", "fake-codex.mjs");

export function execEventLine(caseName) {
  const found = loadFixture("codex-exec.json").cases.find((c) => c.name === caseName);
  if (!found) throw new Error(`caso inexistente: ${caseName}`);
  return found.event ? JSON.stringify(found.event) : found.rawLine;
}

export function writeScenario(dir, name, steps) {
  const file = path.join(dir, `${name}.json`);
  writeFileSync(file, JSON.stringify({ steps }));
  return file;
}

export function probeOf(stderr) {
  const line = stderr.split(/\r?\n/).find((l) => l.startsWith("FAKE_CODEX_PROBE "));
  return line ? JSON.parse(line.slice("FAKE_CODEX_PROBE ".length)) : null;
}

// Inicia `integrations run` como processo real. `reportFd: 3` abre o pipe do
// exportador de fixture; `closeReportFd` mantém a variável mas deixa o fd
// inexistente (destino que falha). `onLine` recebe cada linha do stdout assim
// que chega, para provar repasse incremental. `stderrBytes` é o stderr sem
// decodificação, para comparação byte a byte com o do filho.
export function runWrapper({ args, entry = FAKE_CODEX, env, cwd, stdinText, reportFd = 3, closeReportFd = false, onLine, extraArgs = [] }) {
  return new Promise((resolve) => {
    const childEnv = { ...env };
    if (reportFd !== null) childEnv.SKILL_ME_OBSERVER_REPORT_FD = String(reportFd);
    const wrapperArgs = [INTEGRATIONS_CLI, "run", "--agent", "codex", ...(entry ? ["--codex-entry", entry] : []), ...extraArgs, "--", ...args];
    const child = spawn(process.execPath, wrapperArgs, {
      cwd,
      env: childEnv,
      stdio: [stdinText === undefined ? "ignore" : "pipe", "pipe", "pipe", closeReportFd ? "ignore" : "pipe"],
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let stderr = "";
    let fd3 = "";
    let partial = "";
    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(chunk);
      if (onLine) {
        partial += chunk.toString("utf8");
        let index;
        while ((index = partial.indexOf("\n")) !== -1) {
          const line = partial.slice(0, index);
          partial = partial.slice(index + 1);
          onLine(line, child);
        }
      }
    });
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(chunk);
      stderr += chunk;
    });
    if (!closeReportFd) child.stdio[3].on("data", (chunk) => (fd3 += chunk));
    if (stdinText !== undefined) {
      child.stdin.on("error", () => {});
      child.stdin.end(stdinText);
    }
    child.on("close", (status, signal) => {
      const stdout = Buffer.concat(stdoutChunks);
      resolve({ status, signal, stdout, stderr, stderrBytes: Buffer.concat(stderrChunks), report: parseReport(fd3), child });
    });
  });
}
