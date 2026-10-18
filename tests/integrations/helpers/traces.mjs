import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { INTEGRATIONS_CLI, REPO_ROOT, baseEnv, parseReport } from "./cli.mjs";
import { runPrivacy } from "./privacy-store.mjs";

// Apoio das provas da issue #8: vínculo explícito por ambiente, processos
// reais dos produtores e leitura da captura pelo CLI. Nada aqui reimplementa
// a política: o esperado vem do contrato publicado (pseudônimo HMAC, envelope
// do relatório em memória da #4/#5) ou do `privacy ingest` da #5.

export const TRACES_PROBE = pathToFileURL(path.join(REPO_ROOT, "tests", "integrations", "helpers", "traces-probe.mjs")).href;
export const storeDir = (root) => path.join(root, "skill-me-privacy");
export const capturesDir = (root) => path.join(storeDir(root), "captures");
export const captureDir = (root, id) => path.join(capturesDir(root), id);
export const ISO_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const boundEnv = (root, id, extra = {}) => baseEnv({ SKILL_ME_CAPTURE_ROOT: root, SKILL_ME_CAPTURE_ID: id, ...extra });

export function startCapture(root, extra = []) {
  const result = runPrivacy(["start", "--root", root, ...extra]);
  assert.equal(result.status, 0, result.stdout);
  return result.body.capture.id;
}

export function privacyOk(args) {
  const result = runPrivacy(args);
  assert.equal(result.status, 0, `${args[0]}: ${result.stdout}`);
  assert.equal(result.stderr, "", args[0]);
  return result.body;
}

// Comando do usuário enquanto um `follow` sonda ou um produtor grava: o CLI da
// #5 não espera o lock e responde 4 `lock_present` sem mudar nada; o usuário
// repete (docs/traces.md). Só esse caso é repetido.
export async function privacyRetrying(args) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const result = runPrivacy(args);
    if (result.status !== 4 || result.body.error?.code !== "lock_present") {
      assert.equal(result.status, 0, `${args[0]}: ${result.stdout}`);
      assert.equal(result.stderr, "", args[0]);
      return result.body;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`lock ocupado demais: ${args[0]}`);
}

export const exportOf = (root, id) => privacyOk(["export", "--root", root, "--capture", id]);
export const statusOf = (root, id) => privacyOk(["status", "--root", root, "--capture", id]).capture;

// Definição publicada em docs/privacidade.md: HMAC-SHA-256 com a chave da
// captura sobre `id\0<valor>`, em base64url, prefixo `h1:`. Calculado aqui
// com a chave lida do disco, sem o código do produto.
export function expectedPseudonym(root, id, value) {
  const key = readFileSync(path.join(captureDir(root, id), "key"));
  return "h1:" + createHmac("sha256", key).update(`id\0${value}`, "utf8").digest("base64url");
}

// Processo real de um comando interno (`hook` ou `ingest`): stdio
// [stdin, stdout, stderr, relatório no fd 3]. `stdinText` vai inteiro de uma
// vez; `writeAfterMs` adia a escrita e o fim do stdin (processo já iniciado),
// devolvendo `stdinClosedAt`; `keepOpen` nunca fecha o stdin; `lines` alterna
// textos e pausas (ms).
export function runInternal(args, { env, cwd, stdinText = "", writeAfterMs = 0, keepOpen = false, nodeArgs = [], lines } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [...nodeArgs, INTEGRATIONS_CLI, ...args], {
      env: { ...env, SKILL_ME_OBSERVER_REPORT_FD: "3" },
      cwd,
      stdio: ["pipe", "pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let fd3 = "";
    let stdinClosedAt = null;
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.stdio[3].on("data", (chunk) => (fd3 += chunk));
    child.stdio[3].on("error", () => {});
    child.stdin.on("error", () => {});
    const feed = async () => {
      if (writeAfterMs > 0) await new Promise((r) => setTimeout(r, writeAfterMs));
      if (lines) {
        for (const step of lines) {
          if (typeof step === "number") await new Promise((r) => setTimeout(r, step));
          else child.stdin.write(step);
        }
      } else child.stdin.write(stdinText);
      if (keepOpen) return;
      stdinClosedAt = performance.now();
      child.stdin.end();
    };
    feed();
    child.on("close", (status, signal) => {
      child.stdin.destroy();
      resolve({ status, signal, stdout, stderr, report: parseReport(fd3), stdinClosedAt, closedAt: performance.now() });
    });
  });
}

export const runHook = (agent, payload, options = {}) =>
  runInternal(["hook", "--agent", agent], { ...options, stdinText: options.stdinText ?? JSON.stringify(payload) });

export const runHermesIngest = (records, options = {}) =>
  runInternal(["ingest", "--agent", "hermes"], { ...options, stdinText: options.stdinText ?? records.map((r) => (typeof r === "string" ? r : JSON.stringify(r)) + "\n").join("") });

// Todos os arquivos sob `dir`, sem seguir links.
export function filesUnder(dir) {
  const out = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const full = path.join(current, name);
      if (lstatSync(full).isDirectory()) walk(full);
      else out.push(full);
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

// Nenhum arquivo do store contém algum dos valores dados.
export function assertAbsentOnDisk(root, values, label) {
  for (const file of filesUnder(storeDir(root))) {
    if (path.basename(file) === "key") continue;
    const text = readFileSync(file, "utf8");
    for (const value of values) assert.ok(!text.includes(value), `${label}: ${JSON.stringify(value).slice(0, 60)} em ${path.relative(root, file)}`);
  }
}

// Folhas de texto de um payload nativo (valores que nunca podem ir ao disco
// quando o conteúdo está desligado, exceto os nomes que o envelope publica).
export function stringLeaves(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (value !== null && typeof value === "object") for (const child of Object.values(value)) stringLeaves(child, out);
  return out;
}

// O envelope gravado é o do relatório em memória da #4/#5 a menos dos IDs
// (outra chave) e do instante de observação.
export function sameEnvelope(stored, observed, label) {
  const strip = ({ ids, observedAt, ...rest }) => rest;
  assert.deepEqual(strip(stored), strip(observed), label);
  assert.deepEqual(Object.keys(stored.ids).sort(), Object.keys(observed.ids).sort(), label);
  assert.match(stored.observedAt, ISO_MS, label);
}

export const waitUntil = async (predicate, { timeoutMs = 15_000, label = "condição" } = {}) => {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`tempo esgotado esperando ${label}`);
    await new Promise((r) => setTimeout(r, 20));
  }
};

export { baseEnv };
