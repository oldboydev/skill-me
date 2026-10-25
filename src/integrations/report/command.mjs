import { assertNoOtherAuthorization, ObserveConfigError, readObserveConfig, userHome } from "../observe/config.mjs";
import { parsePrivacyArgs, PrivacyUsageError } from "../privacy/args.mjs";
import { latestAutomaticCapture, StoreError } from "../privacy/store.mjs";
import { createStoreIo } from "../privacy/fs.mjs";
import { replayCaptureReadOnly } from "../traces/replay.mjs";
import { correlateTrace } from "../correlation/timeline.mjs";
import { readSkillSource, SkillSourceError } from "./skill-source.mjs";
import { evaluateReport } from "./evaluate.mjs";
import { renderReport } from "./render.mjs";

export const REPORT_HELP = `Uso:
  integrations report --root <diretório> --capture <id> [--skill <SKILL.md>] [--format text|markdown|json]
  integrations report --latest [--skill <SKILL.md>] [--format text|markdown|json]

Consulta local, somente leitura. --latest usa a captura automática mais recente
da raiz configurada por integrations observe setup, sem --root/--capture; nunca
escolhe uma captura manual. Sem --skill, procura pelo único nome de skill
observado em .agents/skills, .claude/skills, .codex/skills ou skills do diretório
atual. Saída padrão: texto; --format markdown produz relatório Markdown em
stdout; --format json produz dados estruturados sanitizados. Redirecione stdout
para salvar um arquivo. Nenhum script da skill é executado.
`;

const ALLOWED = new Set(["--root", "--capture", "--skill", "--format", "--latest"]);
const FORMATS = new Set(["text", "markdown", "json"]);
const STORE_EXIT = Object.freeze({
  root_not_found: 3, root_not_directory: 3, store_invalid: 3, capture_not_found: 3, capture_invalid: 3, capture_not_active: 3,
  not_configured: 3, config_invalid: 3, no_automatic_capture: 3,
  lock_present: 4, link_refused: 4, foreign_entry: 4, root_changed: 4, observe_on: 4,
  io_failure: 5,
});

function parseArgs(tokens) {
  const values = {};
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const at = token.indexOf("=");
    const flag = at < 0 ? token : token.slice(0, at);
    if (!ALLOWED.has(flag)) throw new PrivacyUsageError("unknown_flag");
    if (Object.hasOwn(values, flag)) throw new PrivacyUsageError("unexpected_argument");
    if (flag === "--latest") {
      if (at >= 0) throw new PrivacyUsageError("unexpected_argument");
      values[flag] = true;
      continue;
    }
    const value = at < 0 ? tokens[++index] : token.slice(at + 1);
    if (value === undefined || value === "" || (at < 0 && value.startsWith("--"))) throw new PrivacyUsageError("missing_flag_value");
    values[flag] = value;
  }
  const format = values["--format"] ?? "text";
  const options = { skill: values["--skill"] ?? null, format };
  // --latest dispensa e recusa a raiz e o ID: a raiz é a do setup.
  if (values["--latest"]) {
    if (values["--root"] !== undefined || values["--capture"] !== undefined) throw new PrivacyUsageError("unexpected_argument");
    if (!FORMATS.has(format)) throw new PrivacyUsageError("invalid_format");
    return { latest: true, ...options };
  }
  const privacyTokens = [];
  if (values["--root"] !== undefined) privacyTokens.push("--root", values["--root"]);
  if (values["--capture"] !== undefined) privacyTokens.push("--capture", values["--capture"]);
  const privacy = parsePrivacyArgs("timeline", privacyTokens);
  if (!FORMATS.has(format)) throw new PrivacyUsageError("invalid_format");
  return { latest: false, ...privacy, ...options };
}

function failure(code, exitCode) {
  return { exitCode, output: JSON.stringify({ schemaVersion: 1, command: "report", status: "error", error: { code } }) + "\n" };
}

// Raiz e ID da consulta; com --latest, da configuração deste usuário e da
// captura automática mais recente, sem criar lock (#23, crit. 5). Com outra
// raiz registrada, a observação do usuário pode estar nela, e a captura da
// configuração não é escolhida (linha "Conflito com o registro").
async function target(args, { io, home }) {
  if (!args.latest) return { root: args.root, id: args.capture };
  const read = await readObserveConfig({ home, io });
  if (read.state === "missing") throw new StoreError("not_configured");
  if (read.state === "invalid") throw new StoreError(read.code);
  const { root, rootReal } = read.config;
  await assertNoOtherAuthorization({ home, io }, rootReal);
  return { root, id: await latestAutomaticCapture({ root, expectedReal: rootReal, io }) };
}

export async function runReportCommand({ argv, io = createStoreIo(), cwd = process.cwd(), home = userHome() }) {
  if (argv.length === 1 && ["--help", "help"].includes(argv[0])) return { exitCode: 0, output: REPORT_HELP };
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    return failure(error instanceof PrivacyUsageError ? error.code : "unknown_flag", 2);
  }
  try {
    const { root, id } = await target(args, { io, home });
    const report = await replayCaptureReadOnly({
      root,
      id,
      io,
      consumer: async (trace) => {
        const timeline = correlateTrace(trace);
        const skill = await readSkillSource({ timeline, explicitPath: args.skill, cwd });
        return evaluateReport({ trace, skill });
      },
    });
    return { exitCode: 0, output: renderReport(report, args.format) };
  } catch (error) {
    if (error instanceof SkillSourceError) return failure(error.code, error.code === "skill_io_failure" ? 5 : 3);
    if (error instanceof StoreError || error instanceof ObserveConfigError) return failure(error.code, STORE_EXIT[error.code] ?? 5);
    return failure("io_failure", 5);
  }
}
