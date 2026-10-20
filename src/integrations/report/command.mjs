import { parsePrivacyArgs, PrivacyUsageError } from "../privacy/args.mjs";
import { StoreError } from "../privacy/store.mjs";
import { createStoreIo } from "../privacy/fs.mjs";
import { replayCapture } from "../traces/replay.mjs";
import { correlateTrace } from "../correlation/timeline.mjs";
import { readSkillSource, SkillSourceError } from "./skill-source.mjs";
import { evaluateReport } from "./evaluate.mjs";
import { renderReport } from "./render.mjs";

export const REPORT_HELP = `Uso:
  integrations report --root <diretório> --capture <id> [--skill <SKILL.md>] [--format text|markdown|json]

Consulta local, somente leitura. Sem --skill, procura pelo único nome de skill
observado em .agents/skills, .claude/skills, .codex/skills ou skills do diretório
atual. Saída padrão: texto; --format markdown produz relatório Markdown em
stdout; --format json produz dados estruturados sanitizados. Redirecione stdout
para salvar um arquivo. Nenhum script da skill é executado.
`;

const ALLOWED = new Set(["--root", "--capture", "--skill", "--format"]);
const FORMATS = new Set(["text", "markdown", "json"]);
const STORE_EXIT = Object.freeze({
  root_not_found: 3, root_not_directory: 3, store_invalid: 3, capture_not_found: 3, capture_invalid: 3, capture_not_active: 3,
  lock_present: 4, link_refused: 4, foreign_entry: 4, root_changed: 4,
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
    const value = at < 0 ? tokens[++index] : token.slice(at + 1);
    if (value === undefined || value === "") throw new PrivacyUsageError("missing_flag_value");
    values[flag] = value;
  }
  const privacyTokens = [];
  if (values["--root"] !== undefined) privacyTokens.push("--root", values["--root"]);
  if (values["--capture"] !== undefined) privacyTokens.push("--capture", values["--capture"]);
  const privacy = parsePrivacyArgs("timeline", privacyTokens);
  const format = values["--format"] ?? "text";
  if (!FORMATS.has(format)) throw new PrivacyUsageError("invalid_format");
  return { ...privacy, skill: values["--skill"] ?? null, format };
}

function failure(code, exitCode) {
  return { exitCode, output: JSON.stringify({ schemaVersion: 1, command: "report", status: "error", error: { code } }) + "\n" };
}

export async function runReportCommand({ argv, io = createStoreIo(), cwd = process.cwd() }) {
  if (argv.length === 1 && ["--help", "help"].includes(argv[0])) return { exitCode: 0, output: REPORT_HELP };
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    return failure(error instanceof PrivacyUsageError ? error.code : "unknown_flag", 2);
  }
  try {
    const report = await replayCapture({
      root: args.root,
      id: args.capture,
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
    if (error instanceof StoreError) return failure(error.code, STORE_EXIT[error.code] ?? 5);
    return failure("io_failure", 5);
  }
}
