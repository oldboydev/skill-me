import { CliUsageError } from "../doctor/cli-args.mjs";

export const HELP_TEXT = `Uso:
  integrations plan --agent <claude|codex|hermes> --target <diretório> [--json]
  integrations install --agent <claude|codex|hermes> --target <diretório> [--apply] [--json]
  integrations uninstall --agent <claude|codex|hermes> --target <diretório> [--apply] [--json]
  integrations run --agent codex [--codex-entry <arquivo>] -- <argumentos de codex exec>
  integrations privacy <start|ingest|stop|disable|status|export|list|follow|delete|prune> --root <diretório> …
  integrations observe <setup --root <diretório-absoluto>|on|off|status>
  integrations report --root <diretório> --capture <id> [--skill <SKILL.md>] [--format text|markdown|json]
  integrations report --latest [--skill <SKILL.md>] [--format text|markdown|json]

Observação local de execuções (issue #4), separada do doctor. Sem --apply nada é
escrito e nenhum agente é iniciado; --target é obrigatório e não tem default.
Confiança nativa (workspace do Claude, /hooks do Codex, plugins.enabled do Hermes)
continua manual. Não há coletor: sem vínculo a uma captura e sem a observação
automática ligada, a observação fica em memória e é descartada ao fim do
processo. Depois de observe setup (uma vez) e observe on (npm run on), hooks e
ingest Hermes gravam cada sessão numa captura automática até observe off
(docs/traces.md). Com SKILL_ME_CAPTURE_ROOT (absoluto) e SKILL_ME_CAPTURE_ID de
uma captura ativa (privacy start) no ambiente do agente, hooks, ingest e run
gravam só nela o resultado sanitizado.

Códigos: 0 concluído ou nada a fazer; 2 uso inválido; 3 configuração inválida
(não substituída); 4 conflito (preservado); 5 incompleto (estado reportado).
O run devolve o código do Codex (127/126 se ele não iniciar).

Comandos internos usados pelas integrações instaladas (não chame à mão):
  integrations hook --agent <claude|codex>     hook de comando, sempre exit 0
  integrations ingest --agent hermes           destino da entrega do plugin Hermes
`;

const VALUE_FLAGS = new Set(["--agent", "--target", "--codex-entry"]);

function splitInline(token) {
  const eq = token.indexOf("=");
  if (eq === -1) return [token, undefined];
  const flag = token.slice(0, eq);
  return VALUE_FLAGS.has(flag) ? [flag, token.slice(eq + 1)] : [token, undefined];
}

// Flags de plan/install/uninstall/hook/ingest. Mensagens fixas: nenhum valor
// recebido é ecoado (mesmo cuidado do doctor com canários em argumentos).
export function parseCommandFlags(tokens, allowed) {
  const out = { agent: undefined, target: undefined, apply: false, json: false };
  const rest = [...tokens];
  while (rest.length > 0) {
    const [flag, inline] = splitInline(rest.shift());
    if (!allowed.has(flag)) throw new CliUsageError("flag desconhecida", { code: "unknown_flag" });
    if (VALUE_FLAGS.has(flag)) {
      const value = inline ?? rest.shift();
      if (value === undefined) throw new CliUsageError("valor ausente para uma flag que exige valor", { code: "missing_flag_value" });
      out[flag === "--agent" ? "agent" : flag === "--target" ? "target" : "codexEntry"] = value;
    } else {
      out[flag.slice(2)] = true;
    }
  }
  return out;
}

// `run`: flags próprias antes de `--`; tudo depois de `--` vai literalmente
// para `codex exec`, sem interpretação.
export function parseRunArgs(tokens) {
  const separator = tokens.indexOf("--");
  if (separator === -1) throw new CliUsageError("use -- antes dos argumentos de codex exec", { code: "missing_separator" });
  const flags = parseCommandFlags(tokens.slice(0, separator), new Set(["--agent", "--codex-entry"]));
  if (flags.agent !== "codex") throw new CliUsageError("run só supervisiona o Codex (--agent codex)", { code: "invalid_agent" });
  return { codexEntry: flags.codexEntry, execArgs: tokens.slice(separator + 1) };
}

export function wantsJson(tokens) {
  const separator = tokens.indexOf("--");
  const own = separator === -1 ? tokens : tokens.slice(0, separator);
  return own.includes("--json");
}
