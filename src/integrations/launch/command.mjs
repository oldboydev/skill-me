import os from "node:os";
import { setTimeout as sleep } from "node:timers/promises";
import { CLI_PATH } from "../install/run.mjs";
import { patiently } from "../observe/command.mjs";
import { userHome } from "../observe/config.mjs";
import { createStoreIo } from "../privacy/fs.mjs";
import { endLaunch, peekLaunch, startLaunch, StoreError } from "../privacy/store.mjs";
import { DELIVERY_DEADLINE_MS } from "../traces/delivery.mjs";
import { AGENTS, agentEnvironment, guardSignals, resolveAgentLaunch, runAgent, startFailureExit } from "./agent.mjs";
import { exitFor, knownCode } from "./exit-codes.mjs";
import { prepareLaunch } from "./prepare.mjs";

// `skill-me` (issue #25): abre o agente com uma execução própria, em capturas
// sucessivas, e consulta a execução sem ID. O stdout é do agente (e do
// `report`/`--help`); tudo do launcher vai ao stderr. Formatos e decisões no
// Landing de .checks/issue-25-agent-launch.md.

export const SKILL_ME_HELP = `Uso:
  skill-me codex [argumentos do codex…]
  skill-me claude [argumentos do claude…]
  skill-me hermes [argumentos do hermes…]
  skill-me report [--skill <SKILL.md>] [--format text|markdown|json]
  skill-me --help

Preparo único, no checkout do skill-me: npm ci e npm link. Depois, o primeiro
skill-me <agente> num terminal mostra a pasta das capturas e a instalação da
integração, pede confirmação antes de alterar algo e indica a confiança
manual que o agente exige (workspace e /hooks no Claude, /hooks e projeto
confiável no Codex, hermes plugins enable skill-me-observer no Hermes).

Uso diário, uma linha: skill-me codex, skill-me claude ou skill-me hermes.
Todos os argumentos vão literalmente para o agente, que abre no terminal como
abriria sem o skill-me; o código de saída é o dele. Cada invocação abre uma
execução própria: só a sessão iniciada por ela é gravada, localmente e depois
da sanitização, sem npm run on/off nem variável de ambiente.

Consulta: skill-me report relata a execução iniciada por último, uma seção
por captura, sem copiar ID.

Limites:
  - a confiança nativa é manual, por agente; sem ela nada é gravado, e o
    resumo final avisa;
  - o Codex não tem evento nativo de ativação de skill: ler um SKILL.md
    aparece só como operação de ferramenta;
  - os hooks do Codex cobrem só ferramentas locais; as hospedadas ficam fora;
  - cada captura tem até 500 eventos ou 8 MiB; a execução continua em
    capturas sucessivas, cada uma com chave própria, até o agente sair;
  - entregas que chegam mais de 750 ms depois da saída do agente não entram;
  - encerrar o skill-me à força (SIGKILL, TerminateProcess) deixa a captura
    corrente active e a execução aberta.
`;

export const LAUNCH_SETTLE_MS = DELIVERY_DEADLINE_MS;

const codeOf = (error) => (error instanceof StoreError ? knownCode(error.code) : "io_failure");

function droppedText(dropped) {
  const entries = Object.entries(dropped).sort(([a], [b]) => (a < b ? -1 : 1));
  return entries.length === 0 ? "nenhum" : entries.map(([reason, count]) => `${reason} ${count}`).join(", ");
}

// `agentRan` falso (abertura cancelada): sem a dica de confiança — nada foi
// gravado porque o agente não rodou.
function summaryLines({ invocation, captures, manualSteps, agentRan }) {
  const total = captures.reduce((sum, capture) => sum + capture.counters.persisted, 0);
  const lines = [`skill-me: execução ${invocation} encerrada; capturas: ${captures.length}; eventos gravados: ${total}.`];
  for (const capture of captures) {
    lines.push(`skill-me: segmento ${capture.segment}: captura ${capture.id} ${capture.state}; gravados ${capture.counters.persisted}; descartados: ${droppedText(capture.counters.dropped)}.`);
  }
  if (total === 0 && agentRan) lines.push(`skill-me: nada foi gravado nesta execução. Confira a confiança do agente: ${manualSteps[0]}`);
  lines.push("skill-me: consulte com: skill-me report");
  return lines;
}

const privacyCommand = (config, action, capture) =>
  `"${process.execPath}" "${CLI_PATH}" privacy ${action} --root "${config.root}"` + (capture === undefined ? "" : ` --capture ${capture}`);
const stopCommand = (config, capture) => privacyCommand(config, "stop", capture);

// Encerramento não conferido (linha "Descoberta das capturas no encerramento"):
// uma captura que não pôde ser lida pode ser de qualquer execução, então nada
// a encerra sozinho; quando a leitura voltar, o status (ou o list, sem nomes)
// mostra se é desta execução e se continua `active`.
function uncheckedLines({ code, invocation, config, unreadable }) {
  const criterion = `se mostrar "invocation":"${invocation}" e "state":"active", encerre com`;
  const lines = [`skill-me: a execução ${invocation} já não recebe registros, mas não foi possível conferir se todas as capturas dela pararam [${code}].`];
  if (unreadable.length === 0) {
    lines.push("skill-me: a pasta das capturas não pôde ser lida.");
    lines.push(`skill-me: quando a leitura voltar, confira com ${privacyCommand(config, "list")}; ${criterion} ${stopCommand(config, "<id>")}`);
    return lines;
  }
  lines.push(`skill-me: capturas que não puderam ser lidas: ${unreadable.join(", ")}.`);
  for (const id of unreadable) {
    lines.push(`skill-me: quando a leitura voltar, confira com ${privacyCommand(config, "status", id)}; ${criterion} ${stopCommand(config, id)}`);
  }
  return lines;
}

// Falha do encerramento (crit. 24; linhas "Ordem e falha do encerramento",
// "Sucessora não publicada" e "Descoberta das capturas no encerramento"): a
// orientação depende de o ponteiro ainda existir — `privacy stop` encerra só a
// captura, nunca a execução —, cada captura que ficou `active` tem o comando
// que a encerra, e as que não puderam ser lidas vêm depois, com o critério.
async function failedEndLines({ error, invocation, config, io, fallbackCapture }) {
  const code = codeOf(error);
  let open = true;
  let captures = error.captures ?? [error.capture ?? fallbackCapture];
  if (error.revoked === true) open = false;
  else {
    try {
      const pointer = await peekLaunch({ root: config.root, expectedReal: config.rootReal, invocation, io });
      open = pointer !== null;
      if (pointer !== null) captures = [pointer.capture];
    } catch {
      // Ponteiro ilegível, ou com captura que não se confere desta execução:
      // a orientação conservadora é a da execução aberta, com a captura que a
      // invocação abriu (linha "Vínculo do ponteiro no encerramento").
    }
  }
  const unchecked = error.unverified === true ? uncheckedLines({ code, invocation, config, unreadable: error.unreadable }) : [];
  if (captures.length === 0) return unchecked;
  const [capture] = captures;
  const lines = [
    captures.length === 1
      ? `skill-me: não foi possível encerrar a execução ${invocation} [${code}]; a captura ${capture} continua active.`
      : `skill-me: não foi possível encerrar a execução ${invocation} [${code}]; as capturas ${captures.join(", ")} continuam active.`,
    ...captures.map((id) => `skill-me: encerre com: ${stopCommand(config, id)}`),
  ];
  lines.push(
    open
      ? `skill-me: a execução ${invocation} continua aberta: o comando acima encerra só a captura ${capture}, e um processo do agente que ainda grave abre a captura seguinte; rode-o depois que o agente e os processos dele terminarem.`
      : captures.length === 1
        ? `skill-me: a execução ${invocation} já não recebe registros; o comando acima só encerra a captura.`
        : `skill-me: a execução ${invocation} já não recebe registros; os comandos acima só encerram as capturas.`,
  );
  return [...lines, ...unchecked];
}

// Sinal recebido antes de o agente iniciar (task 34; linha "Cancelamento antes
// do agente"): no POSIX o launcher reemite o sinal; no Windows sai com 128 + n.
const cancelledResult = (signal) => ({ exitCode: 128 + (os.constants.signals[signal] ?? 0), signal });
const OPENING_CANCELLED = Symbol("abertura cancelada");

async function launchAgent(agent, args, deps) {
  const { env, platform, home, cwd, io, now, proc, settleMs, writeErr, terminal, readLine } = deps;
  const say = (line) => writeErr(line + "\n");
  const launch = await resolveAgentLaunch({ agent, env, platform, cwd });
  if (launch.failure !== undefined) {
    say(launch.failure === "launcher_requires_shell" ? `skill-me: ${agent} exigiria um shell para iniciar [launcher_requires_shell]` : `skill-me: ${agent} não encontrado no PATH [${launch.failure}]`);
    return { exitCode: 127 };
  }
  const prepared = await prepareLaunch({ agent, env, platform, home, io, terminal, readLine, writeErr });
  if (prepared.exitCode !== undefined) return prepared;
  const { config, manualSteps } = prepared;
  const sayCancelled = (signal) => say(`skill-me: abertura cancelada por ${signal}; o agente não foi iniciado.`);

  // Encerra a execução e escreve o resumo ou a falha (crit. 20 e 24).
  const finish = async (opened, agentRan) => {
    const { invocation } = opened;
    try {
      const ended = await patiently(() => endLaunch({ root: config.root, expectedReal: config.rootReal, invocation, nowMs: now(), io }));
      for (const line of summaryLines({ invocation, captures: ended.captures, manualSteps, agentRan })) say(line);
    } catch (error) {
      for (const line of await failedEndLines({ error, invocation, config, io, fallbackCapture: opened.capture })) say(line);
    }
  };

  const guard = guardSignals({ proc, platform });
  try {
    let opened;
    try {
      // Cada tentativa confere o cancelamento: um sinal na espera do lock para
      // de tentar, sem criar captura.
      opened = await patiently(() => {
        if (guard.cancelled !== null) throw OPENING_CANCELLED;
        return startLaunch({ root: config.root, expectedReal: config.rootReal, nowMs: now(), io });
      });
    } catch (error) {
      if (guard.cancelled !== null && error?.orphan !== true) {
        sayCancelled(guard.cancelled);
        return cancelledResult(guard.cancelled);
      }
      say(`skill-me: não foi possível abrir a execução [${codeOf(error)}]`);
      if (error?.orphan === true) say(`skill-me: a captura ${error.capture} ficou active; encerre com: ${stopCommand(config, error.capture)}`);
      return { exitCode: exitFor(codeOf(error)) };
    }
    const outcome =
      guard.cancelled !== null
        ? { cancelled: guard.cancelled }
        : await runAgent({ launch, args, env: agentEnvironment(env, platform, { root: config.rootReal, invocation: opened.invocation }), guard });
    if (outcome.cancelled !== undefined) {
      // A captura já criada é encerrada sem a espera de entregas: nenhum agente rodou.
      sayCancelled(outcome.cancelled);
      await finish(opened, false);
      return cancelledResult(outcome.cancelled);
    }
    let result;
    if (outcome.spawnError !== undefined) {
      say(`skill-me: não foi possível iniciar ${agent} [${outcome.spawnError.code}]`);
      result = { exitCode: startFailureExit(outcome.spawnError) };
    } else {
      // Entregas em voo (o ingest Hermes lê o pipe depois da saída do agente)
      // têm o prazo de uma entrega para gravar (linha "Encerramento").
      await sleep(settleMs);
      result = { exitCode: outcome.code ?? 1, signal: outcome.signal ?? null };
    }
    await finish(opened, true);
    return result;
  } finally {
    guard.release();
  }
}

// `deps` existe para as provas em processo; o CLI passa o processo real.
// Devolve { exitCode, signal? } — quem chama reemite o sinal no POSIX.
export async function runSkillMe({ argv, deps: given = {} }) {
  const deps = {
    env: process.env,
    platform: process.platform,
    home: userHome(),
    cwd: process.cwd(),
    io: createStoreIo(),
    now: Date.now,
    proc: process,
    settleMs: LAUNCH_SETTLE_MS,
    ...given,
  };
  const [command, ...rest] = argv;
  if (command === "--help" || command === "help") {
    deps.writeOut(SKILL_ME_HELP);
    return { exitCode: 0 };
  }
  if (command === "report") {
    if (rest.length === 1 && ["--help", "help"].includes(rest[0])) {
      deps.writeOut(SKILL_ME_HELP);
      return { exitCode: 0 };
    }
    const { runLaunchReportCommand } = await import("../report/command.mjs");
    const result = await runLaunchReportCommand({ argv: rest, io: deps.io, cwd: deps.cwd, home: deps.home });
    deps.writeOut(result.output);
    return { exitCode: result.exitCode };
  }
  if (AGENTS.includes(command)) return launchAgent(command, rest, deps);
  deps.writeErr(SKILL_ME_HELP);
  return { exitCode: 2 };
}
