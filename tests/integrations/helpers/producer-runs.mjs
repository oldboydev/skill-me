import { readFileSync, realpathSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { REPO_ROOT, makeScratch } from "./cli.mjs";

// Registro dos produtores de um teste (issue #25, linha "Evidência comum dos
// produtores e formatter legado" do Landing): só o estado e o ambiente de cada
// produtor iniciado pelos apoios. A evidência é montada em helpers/traces.mjs,
// e só na falha. Fica num módulo leve porque installed-hooks.mjs também é
// carregado pela fixture do launcher (fixtures/launch/fake-agent.mjs), que não
// deve pagar a carga do apoio das provas.

export const TRACES_PROBE = pathToFileURL(path.join(REPO_ROOT, "tests", "integrations", "helpers", "traces-probe.mjs")).href;

let recording = null;

export const activeRecording = () => recording;

export function startRecording() {
  const current = { previous: recording, producers: [], processes: [], dir: null, disposers: [] };
  recording = current;
  return current;
}

export function finishRecording(current) {
  recording = current.previous;
  for (const dispose of current.disposers) dispose();
  if (current.dir !== null) rmSync(current.dir, { recursive: true, force: true });
}

// Ambiente de um produtor iniciado por um apoio. Fora de um registro, o mesmo
// objeto. Num registro: sem `SKILL_ME_TEST_TRACES_TIMING`, a pré-carga de tempos
// por `NODE_OPTIONS` (somada à que houver) e um arquivo próprio; com ele, o do
// teste, e a linha é a da saída deste processo. Um ambiente herdado (`env`
// ausente) não é tocado: os apoios o tratam de formas diferentes.
export function recordedProducer(label, env) {
  if (recording === null) return { env, settle: (run) => run };
  const current = recording;
  const entry = { index: current.producers.length + 1, label, inProcess: false, run: null, root: rootOf(env), timing: null, line: -1 };
  current.producers.push(entry);
  if (env === undefined) return { env, settle: (run) => ((entry.run = run), run) };
  const own = env.SKILL_ME_TEST_TRACES_TIMING === undefined;
  entry.timing = own ? path.join((current.dir ??= makeScratch("traces produtores")), `${entry.index}.ndjson`) : env.SKILL_ME_TEST_TRACES_TIMING;
  const probe = `--import=${TRACES_PROBE}`;
  const options = env.NODE_OPTIONS === undefined || env.NODE_OPTIONS === "" ? probe : env.NODE_OPTIONS.includes(probe) ? env.NODE_OPTIONS : `${env.NODE_OPTIONS} ${probe}`;
  return {
    env: own ? { ...env, NODE_OPTIONS: options, SKILL_ME_TEST_TRACES_TIMING: entry.timing } : env,
    settle(run) {
      entry.run = run;
      if (!own) entry.line = linesIn(entry.timing) - 1;
      return run;
    },
  };
}

const linesIn = (file) => {
  try {
    return readFileSync(file, "utf8").split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
};

// Processo que não produz (o `follow`), registrado só para o dono do lock.
export function noteProcess(label, child) {
  if (recording !== null && typeof child.pid === "number") recording.processes.push({ label, pid: child.pid });
}

// Raiz de um produtor pelo ambiente dele, na precedência do produto: o par da
// execução, o par manual, e na rota automática o `rootReal` da configuração do
// home que o produtor lê ao partir — só num home de prova, nunca no perfil real.
export function rootOf(env) {
  if (env === undefined) return { unavailable: "ambiente herdado" };
  for (const name of ["SKILL_ME_LAUNCH_ROOT", "SKILL_ME_CAPTURE_ROOT"]) if (typeof env[name] === "string" && env[name] !== "") return { root: env[name] };
  const home = process.platform === "win32" ? env.USERPROFILE : env.HOME;
  if (typeof home !== "string" || home === "") return { unavailable: "sem raiz no ambiente" };
  if (!isTestHome(home)) return { unavailable: "home fora do temporário" };
  let config;
  try {
    config = JSON.parse(readFileSync(path.join(home, ".skill-me", "observe.json"), "utf8"));
  } catch (error) {
    return { unavailable: typeof error?.code === "string" && /^E[A-Z]+$/.test(error.code) ? error.code : "config_invalid" };
  }
  const root = config?.rootReal ?? config?.root;
  return typeof root === "string" ? { root } : { unavailable: "config_invalid" };
}

// Dentro do temporário real do sistema e numa pasta `skill-me …` dele (os
// scratches das provas), decidido pelo caminho, sem tocá-lo.
export function isTestHome(home, tmp = realpathSync.native(os.tmpdir())) {
  const relative = path.relative(tmp, path.resolve(home));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative) && relative.split(path.sep)[0].startsWith("skill-me ");
}
