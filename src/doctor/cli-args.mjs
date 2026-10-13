import { parseLoopbackEndpoint } from "./collector-probe.mjs";

// Mensagem sempre fixa e própria do doctor: nunca interpola o token/flag/
// valor bruto recebido, para que uma entrada maliciosa (ex.: um canário
// embutido no nome da flag ou no endpoint) nunca alcance stdout/stderr
// através de `error.message` (ver report-envelope.mjs toFailureEnvelope).
export class CliUsageError extends Error {
  constructor(message, { code = "unknown_flag" } = {}) {
    super(message);
    this.code = code;
  }
}

const FLAG_WITH_VALUE = new Set(["--cwd", "--collector"]);

// Mesmo reconhecedor usado por collector-probe.mjs (importado, não
// duplicado): a validação aqui acontece antes de ler ambiente ou tentar
// conexão, para que um endpoint fora da assinatura vire erro de uso
// (exit 2), não um diagnóstico "bem sucedido" com
// collector.status unknown/invalid_endpoint.
function isLoopbackEndpointShape(value) {
  return parseLoopbackEndpoint(value) !== null;
}

// Only --json, --cwd <dir>, --collector <endpoint> e --help existem nesta
// CLI (critério 13): não há modo de reparo, instalação ou coleta.
export function parseArgs(argv) {
  const result = { help: false, json: false, cwd: undefined, collector: undefined };
  const args = [...argv];
  while (args.length > 0) {
    const token = args.shift();
    const [flag, inlineValue] = splitInlineValue(token);
    if (flag === "--help") {
      result.help = true;
      continue;
    }
    if (flag === "--json") {
      result.json = true;
      continue;
    }
    if (flag === "--cwd" || flag === "--collector") {
      const value = inlineValue ?? args.shift();
      if (value === undefined) {
        throw new CliUsageError("valor ausente para uma flag que exige valor", {
          code: "missing_flag_value",
        });
      }
      if (flag === "--collector" && !isLoopbackEndpointShape(value)) {
        throw new CliUsageError(
          "endpoint do --collector inválido: use tcp://127.0.0.1:<porta> ou tcp://[::1]:<porta>",
          { code: "invalid_collector_endpoint" },
        );
      }
      result[flag === "--cwd" ? "cwd" : "collector"] = value;
      continue;
    }
    throw new CliUsageError("flag desconhecida", { code: "unknown_flag" });
  }
  return result;
}

function splitInlineValue(token) {
  const eq = token.indexOf("=");
  if (eq === -1) return [token, undefined];
  const flag = token.slice(0, eq);
  if (!FLAG_WITH_VALUE.has(flag)) return [token, undefined];
  return [flag, token.slice(eq + 1)];
}

export function wantsJsonOutput(argv) {
  return argv.includes("--json") || argv.some((token) => token.startsWith("--json="));
}

export const HELP_TEXT = `Uso: doctor [--json] [--cwd <diretório>] [--collector <endpoint>] [--help]

Diagnóstico local, somente leitura, de quais agentes (claude, codex, hermes)
estão instalados e quais mecanismos de observação são suportados, configurados
ou verificados. Não inicia agentes, não instala hooks e não corrige configuração.

  --json                 Emite o relatório como um único objeto JSON.
  --cwd <diretório>      Diretório usado para config de projeto (padrão: cwd atual).
  --collector <endpoint> Tenta uma conexão de transporte a tcp://127.0.0.1:<porta>
                         ou tcp://[::1]:<porta> (padrão: nenhum endpoint).
  --help                 Mostra esta ajuda e sai, sem inspecionar agentes.
`;
