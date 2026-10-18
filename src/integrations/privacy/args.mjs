import { CAPTURE_ID_PATTERN, DEFAULT_RETENTION_DAYS, MAX_RETENTION_DAYS, MIN_RETENTION_DAYS } from "./lifecycle.mjs";

// `ingest` e `export` entram com o lote da política (D1): até lá não são
// anunciados nem aceitos, para nenhum comando sugerir sanitização inexistente.
export const PRIVACY_HELP_TEXT = `Uso:
  integrations privacy start --root <diretório> [--content] [--retention-days <1-365>]
  integrations privacy stop --root <diretório> --capture <id>
  integrations privacy disable --root <diretório> --capture <id>
  integrations privacy status --root <diretório> --capture <id>
  integrations privacy delete --root <diretório> --capture <id> [--apply]
  integrations privacy prune --root <diretório> [--apply]

Capturas locais de privacidade (issue #5). --root é obrigatório e não tem
default: nada é criado fora de <diretório>/skill-me-privacy/. Cada start cria uma
captura nova, com ID e chave próprios, conteúdo desligado (--content liga só
para essa captura) e retenção de 7 dias. stop encerra a captura; disable também
desliga o conteúdo; nenhuma captura volta a ativa. delete e prune mostram uma
prévia e só apagam com --apply; prune remove capturas encerradas cuja idade,
contada do encerramento, alcançou a retenção — não há daemon: rode prune quando
quiser aplicar a retenção. Nada é enviado pela rede.

Resposta: um JSON por execução em stdout. Códigos: 0 concluído; 2 uso inválido;
3 estado ou formato inválido ou ausente; 4 conflito, lock ocupado ou
isolamento; 5 falha de E/S.
`;

export class PrivacyUsageError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const COMMAND_FLAGS = {
  start: ["--root", "--content", "--retention-days"],
  stop: ["--root", "--capture"],
  disable: ["--root", "--capture"],
  status: ["--root", "--capture"],
  delete: ["--root", "--capture", "--apply"],
  prune: ["--root", "--apply"],
};
const VALUE_FLAGS = new Set(["--root", "--capture", "--retention-days"]);
const RETENTION_PATTERN = /^[1-9][0-9]{0,2}$/;

export function isPrivacyCommand(name) {
  return Object.hasOwn(COMMAND_FLAGS, name);
}

function parseRetention(value) {
  if (value === undefined) return DEFAULT_RETENTION_DAYS;
  const days = RETENTION_PATTERN.test(value) ? Number(value) : NaN;
  if (!(days >= MIN_RETENTION_DAYS && days <= MAX_RETENTION_DAYS)) throw new PrivacyUsageError("invalid_retention");
  return days;
}

// Valores recebidos nunca são ecoados: o erro carrega só o código.
export function parsePrivacyArgs(command, tokens) {
  const allowed = COMMAND_FLAGS[command];
  const values = {};
  const rest = [...tokens];
  while (rest.length > 0) {
    const token = rest.shift();
    if (!token.startsWith("--")) throw new PrivacyUsageError("unexpected_argument");
    const eq = token.indexOf("=");
    const flag = eq === -1 ? token : token.slice(0, eq);
    if (!allowed.includes(flag)) throw new PrivacyUsageError("unknown_flag");
    if (Object.hasOwn(values, flag)) throw new PrivacyUsageError("unexpected_argument");
    if (VALUE_FLAGS.has(flag)) {
      const value = eq === -1 ? rest.shift() : token.slice(eq + 1);
      if (value === undefined) throw new PrivacyUsageError("missing_flag_value");
      values[flag] = value;
    } else {
      if (eq !== -1) throw new PrivacyUsageError("unexpected_argument");
      values[flag] = true;
    }
  }
  if (values["--root"] === undefined || values["--root"] === "") throw new PrivacyUsageError("missing_root");
  const parsed = { root: values["--root"] };
  if (allowed.includes("--capture")) {
    if (values["--capture"] === undefined) throw new PrivacyUsageError("missing_capture");
    if (!CAPTURE_ID_PATTERN.test(values["--capture"])) throw new PrivacyUsageError("invalid_capture_id");
    parsed.capture = values["--capture"];
  }
  if (command === "start") {
    parsed.content = values["--content"] === true;
    parsed.retentionDays = parseRetention(values["--retention-days"]);
  }
  if (allowed.includes("--apply")) parsed.apply = values["--apply"] === true;
  return parsed;
}
