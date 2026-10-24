import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { CLI_PATH } from "../install/run.mjs";
import { createStoreIo } from "../privacy/fs.mjs";
import { changeObservation, holdLockFile, readObservation, StoreError } from "../privacy/store.mjs";
import {
  assertNoOtherAuthorization,
  CONFIG_VERSION,
  CONTROL_LOCK_FILE,
  claimAuthorization,
  configDir,
  ObserveConfigError,
  readAuthorization,
  readObserveConfig,
  releaseAuthorization,
  userHome,
  writeObserveConfig,
} from "./config.mjs";

export const OBSERVE_HELP_TEXT = `Uso:
  integrations observe setup --root <diretório-absoluto>
  integrations observe on        (npm run on)
  integrations observe off       (npm run off)
  integrations observe status    (npm run status)

Observação automática local (issue #23). setup, uma vez, guarda a raiz das
capturas (pasta absoluta existente) na configuração deste usuário. Depois, on
autoriza capturas locais sucessivas, com conteúdo sanitizado, até off: os hooks
Claude/Codex e o plugin Hermes instalados e confiáveis gravam cada sessão numa
captura própria, sem variável de ambiente; ao chegar a 500 eventos ou 8 MiB, a
sessão continua numa nova captura. off desliga inclusive produtores já abertos
e encerra as capturas automáticas, que continuam consultáveis. status mostra o
estado e as 10 capturas automáticas mais recentes; report --latest relata a
mais recente. Capturas manuais (privacy start/stop/disable) não mudam. Nada é
enviado pela rede.

Resposta: um JSON por execução em stdout. Códigos: 0 concluído; 2 uso inválido;
3 sem setup, estado ou formato inválido ou ausente; 4 conflito, lock ocupado ou
raiz trocada; 5 falha de E/S.
`;

const EXIT_BY_CODE = {
  root_not_found: 3,
  root_not_directory: 3,
  store_invalid: 3,
  capture_not_found: 3,
  capture_invalid: 3,
  capture_not_active: 3,
  not_configured: 3,
  config_invalid: 3,
  observe_on: 4,
  lock_present: 4,
  link_refused: 4,
  foreign_entry: 4,
  root_changed: 4,
  io_failure: 5,
};
const COMMANDS = ["setup", "on", "off", "status"];
// on/off/status esperam um produtor terminar o commit (ele segura o lock por
// milissegundos, no máximo o prazo de entrega de 750 ms) antes de responder 4:
// um off precisa concluir mesmo com o agente gravando.
export const OBSERVE_LOCK_PATIENCE_MS = 2000;
const LOCK_RETRY_MS = 10;
export const RECENT_CAPTURES = 10;

class UsageError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const ok = (command, fields) => ({ exitCode: 0, body: { schemaVersion: 1, command, status: "ok", ...fields } });
const failure = (command, code, fields = {}) => ({
  exitCode: EXIT_BY_CODE[code] ?? 5,
  body: { schemaVersion: 1, command, status: "error", ...fields, error: { code: Object.hasOwn(EXIT_BY_CODE, code) ? code : "io_failure" } },
});
const worstOf = (failed) => failed.reduce((a, b) => ((EXIT_BY_CODE[b.code] ?? 5) > (EXIT_BY_CODE[a.code] ?? 5) ? b : a));
const codeOf = (error) => ((error instanceof StoreError || error instanceof ObserveConfigError) && Object.hasOwn(EXIT_BY_CODE, error.code) ? error.code : "io_failure");

// Nunca expõe a chave das sessões nem o mapa: só estado, geração e instante.
function view(observation, configured) {
  const on = observation?.state === "on";
  return {
    configured,
    state: on ? "on" : "off",
    generation: on ? observation.generation : null,
    changedAt: observation?.changedAt ?? null,
    ...(on ? { content: true } : {}),
  };
}

async function patiently(operation, clock = () => performance.now()) {
  const deadline = clock() + OBSERVE_LOCK_PATIENCE_MS;
  for (;;) {
    try {
      return await operation();
    } catch (error) {
      if (!(error instanceof StoreError) || error.code !== "lock_present" || clock() >= deadline) throw error;
      await sleep(LOCK_RETRY_MS);
    }
  }
}

// Valores recebidos nunca são ecoados: o erro carrega só o código.
function parseSetup(tokens) {
  let root;
  const rest = [...tokens];
  while (rest.length > 0) {
    const token = rest.shift();
    const eq = token.indexOf("=");
    const flag = eq === -1 ? token : token.slice(0, eq);
    if (!token.startsWith("--")) throw new UsageError("unexpected_argument");
    if (flag !== "--root") throw new UsageError("unknown_flag");
    if (root !== undefined) throw new UsageError("unexpected_argument");
    root = eq === -1 ? rest.shift() : token.slice(eq + 1);
    if (root === undefined) throw new UsageError("missing_flag_value");
  }
  if (root === undefined || root === "") throw new UsageError("missing_root");
  // Hooks rodam no diretório do projeto do agente: um caminho relativo
  // apontaria para outra raiz em cada processo.
  if (!path.isAbsolute(root)) throw new UsageError("root_not_absolute");
  return root;
}

function configFrom(read) {
  if (read.state === "invalid") throw new StoreError(read.code);
  return read.state === "ok" ? read.config : null;
}

const configured = async (home, io) => configFrom(await readObserveConfig({ home, io }));

// Barreira de setup, on e off, direto no home (linha "Barreira da
// configuração" do Landing): sob ela cada um lê a configuração e aplica a
// decisão sobre a raiz dela. Sem barreira comum, um setup concorrente com on
// deixava a raiz anterior on fora do alcance do off (F1 da verificação, rodada
// 1). Dentro da pasta `.skill-me` o lock ia junto com a pasta trocada: um on
// com o lock da pasta antiga e um off com o da nova não se revezavam, e o on
// religava a raiz depois de o off pelo registro responder. A pasta conferida
// antes do lock (configDir) continua a referência da leitura sob ele (F2,
// rodada 2; linha "Pasta da configuração"). Um lock_present lançado por `fn`
// (lock da raiz) só chega depois da paciência dela, quando este prazo também já
// passou: `fn` não é repetida. Sem home absoluto não há configuração nem
// registro a proteger, e o lock iria para o diretório atual.
async function withControlLock({ home, io }, fn) {
  if (!path.isAbsolute(home)) return fn();
  const lock = { io, lockPath: path.join(home, CONTROL_LOCK_FILE), lostCode: "foreign_entry" };
  return patiently(() => holdLockFile(lock, fn));
}

async function setup(tokens, { home, io }) {
  const root = parseSetup(tokens);
  let stats;
  try {
    stats = await io.stat(root);
  } catch {
    throw new StoreError("root_not_found");
  }
  if (!stats.isDirectory()) throw new StoreError("root_not_directory");
  const rootReal = await io.realpath(root);
  const folder = await configDir({ home, io, create: true });
  return withControlLock({ home, io }, async () => {
    // Trocar a raiz com a observação ligada deixaria a autorização sem quem a
    // desligue: um registro presente — de qualquer raiz, pois a configuração
    // pode já ser outra (linha "Conflito com o registro") — ou a raiz anterior
    // on recusam; uma raiz anterior inacessível não tem o que gravar.
    await assertNoOtherAuthorization({ home, io }, null);
    const read = await readObserveConfig({ home, io, folder });
    const previous = read.state === "ok" ? read.config : null;
    if (previous !== null) {
      const old = await patiently(() => readObservation({ root: previous.root, expectedReal: previous.rootReal, io })).catch((error) => {
        if (error instanceof StoreError && ["lock_present", "io_failure"].includes(error.code)) throw error;
        return null;
      });
      if (old?.observation?.state === "on") throw new StoreError("observe_on");
    }
    const current = await patiently(() => readObservation({ root, expectedReal: rootReal, io }));
    await writeObserveConfig({
      folder,
      io,
      config: { skillMeObserveConfig: CONFIG_VERSION, root, rootReal, hermesDelivery: [process.execPath, CLI_PATH, "ingest", "--agent", "hermes"] },
    });
    return ok("setup", { observation: view(current.observation, true) });
  });
}

// O registro da autorização de `rootReal`, para o store mudá-lo sob o lock da
// raiz (linha "Registro da autorização" do Landing); o código do erro passa
// pelo store como StoreError.
function authorizationOf({ home, io }, rootReal) {
  const asStore = (fn) => async () => {
    try {
      await fn({ home, io, rootReal });
    } catch (error) {
      throw error instanceof ObserveConfigError ? new StoreError(error.code) : error;
    }
  };
  return { claim: asStore(claimAuthorization), release: asStore(releaseAuthorization) };
}

const switchRoot = ({ home, io, nowMs }, action, { root, rootReal }) =>
  patiently(() => changeObservation({ root, expectedReal: rootReal, action, nowMs, io, authorization: authorizationOf({ home, io }, rootReal) }));

// Sem a pasta nada foi configurado, e o on não toma o lock nem cria nada.
async function on(context) {
  const { home, io } = context;
  const folder = await configDir({ home, io });
  if (folder === null) throw new StoreError("not_configured");
  return withControlLock(context, async () => {
    const config = configFrom(await readObserveConfig({ home, io, folder }));
    if (config === null) throw new StoreError("not_configured");
    const result = await switchRoot(context, "on", config);
    return ok("on", { observation: view(result.observation, true), changed: result.changed });
  });
}

// O off desliga a raiz configurada e depois, uma vez, a do registro quando é
// outra ou a configuração não pôde ser lida — pela própria `rootReal`, que o
// store confere como em toda operação automática. É assim que a raiz que o on
// ligou continua ao alcance, troque-se a pasta `.skill-me` antes ou depois do
// efeito (F3 da verificação, rodada 3). As duas partes ficam sob o mesmo lock
// do home, também com a pasta recusada: um on em voo termina antes, e nenhum
// religa a raiz depois deste off. A resposta segue a da configuração;
// `changed`, `stopped` e `failed` somam as duas, e um erro sai só com o código.
async function off(context) {
  const { home, io } = context;
  const results = [];
  const errors = [];
  let observation = view(null, false);
  let folder = null;
  try {
    folder = await configDir({ home, io });
  } catch (error) {
    errors.push(error);
  }
  try {
    await withControlLock(context, async () => {
      let configuredReal = null;
      try {
        const config = folder === null ? null : configFrom(await readObserveConfig({ home, io, folder }));
        if (config !== null) {
          configuredReal = config.rootReal;
          const result = await switchRoot(context, "off", config);
          observation = view(result.observation, true);
          results.push(result);
        }
      } catch (error) {
        errors.push(error);
      }
      try {
        const recorded = await readAuthorization({ home, io });
        if (recorded !== null && recorded.rootReal !== configuredReal) results.push(await switchRoot(context, "off", { root: recorded.rootReal, rootReal: recorded.rootReal }));
      } catch (error) {
        errors.push(error);
      }
    });
  } catch (error) {
    errors.push(error);
  }
  if (errors.length > 0) return failure("off", worstOf(errors.map((error) => ({ code: codeOf(error) }))).code);
  const fields = { observation, changed: results.some((result) => result.changed), stopped: results.flatMap((result) => result.stopped) };
  const failed = results.flatMap((result) => result.failed);
  if (failed.length === 0) return ok("off", fields);
  return failure("off", worstOf(failed).code, { ...fields, failed });
}

// Com outra raiz registrada — ou sem configuração e com registro —, a
// configuração não diz se a observação está on: observe_on, nunca off.
async function status({ home, io }) {
  const config = await configured(home, io);
  await assertNoOtherAuthorization({ home, io }, config?.rootReal ?? null);
  if (config === null) return ok("status", { observation: view(null, false), automaticCaptures: 0, captures: [] });
  const result = await patiently(() => readObservation({ root: config.root, expectedReal: config.rootReal, io }));
  const fields = {
    observation: view(result.observation, true),
    automaticCaptures: result.captures.length,
    captures: result.captures.slice(-RECENT_CAPTURES).reverse(),
  };
  if (result.failed.length === 0) return ok("status", fields);
  return failure("status", worstOf(result.failed).code, { ...fields, failed: result.failed });
}

// `home` e o relógio só são injetáveis em processo (provas); o CLI usa o home
// do usuário (os.homedir) e nunca lê outro de flag ou variável própria.
export async function runObserveCommand({ argv, home = userHome(), now = Date.now, io = createStoreIo() }) {
  const [command, ...tokens] = argv;
  if (command === "--help" || command === "help" || (COMMANDS.includes(command) && tokens.includes("--help"))) {
    return { exitCode: 0, help: OBSERVE_HELP_TEXT };
  }
  if (!COMMANDS.includes(command)) return { exitCode: 2, body: { schemaVersion: 1, command: null, status: "error", error: { code: "unknown_command" } } };
  try {
    if (command === "setup") return await setup(tokens, { home, io });
    if (tokens.length > 0) throw new UsageError("unexpected_argument");
    if (command === "status") return await status({ home, io });
    return await (command === "on" ? on : off)({ home, io, nowMs: now() });
  } catch (error) {
    if (error instanceof UsageError) return { exitCode: 2, body: { schemaVersion: 1, command, status: "error", error: { code: error.code } } };
    return failure(command, codeOf(error));
  }
}
