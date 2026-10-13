export const SCHEMA_VERSION = 1;

const EXIT_CODE_BY_STATUS = {
  complete: 0,
  partial: 0,
  failed: 1,
};

export function exitCodeForStatus(status) {
  const code = EXIT_CODE_BY_STATUS[status];
  if (code === undefined) throw new Error(`status desconhecido: ${status}`);
  return code;
}

// Vocabulário fechado de falhas de uso/leitura que a própria CLI reconhece
// (ver cli.mjs/cli-args.mjs). Cada mensagem é fixa e própria do doctor —
// nunca construída a partir de um valor recebido (flag, cwd, endpoint,
// conteúdo de arquivo), então nenhuma entrada arbitrária pode se propagar
// até stdout/stderr através deste mapeamento.
const SAFE_MESSAGE_BY_CODE = {
  unknown_flag: "Flag desconhecida.",
  missing_flag_value: "Valor ausente para uma flag que exige valor.",
  invalid_collector_endpoint:
    "Endpoint do --collector inválido: use tcp://127.0.0.1:<porta> ou tcp://[::1]:<porta>.",
  cwd_not_found: "Diretório informado em --cwd não existe ou não é acessível.",
  cwd_not_a_directory: "Caminho informado em --cwd não é um diretório.",
  internal_error: "Falha interna inesperada ao gerar o diagnóstico.",
};

// Erros inesperados nunca repassam stack/mensagem/código bruto do processo:
// só um `error.code` do vocabulário fechado acima troca a mensagem padrão;
// qualquer outro valor (incluindo um `error.message`/`error.code` arbitrário
// injetado por uma entrada não confiável) cai no código/mensagem genéricos
// de `internal_error`, nunca ecoado a partir do próprio erro.
export function toFailureEnvelope(error) {
  const code =
    typeof error?.code === "string" && error.code in SAFE_MESSAGE_BY_CODE
      ? error.code
      : "internal_error";
  const message = SAFE_MESSAGE_BY_CODE[code];
  return {
    schemaVersion: SCHEMA_VERSION,
    status: "failed",
    environment: null,
    agents: [],
    collector: null,
    limitations: [],
    errors: [{ code, message }],
  };
}

export function buildEnvelope({
  environment,
  agents,
  collector,
  limitations = [],
  errors = [],
}) {
  const hasUnresolvedAgentConfig = agents.some((agent) =>
    ["invalid", "unknown"].includes(agent.configuration),
  );
  const status = hasUnresolvedAgentConfig ? "partial" : "complete";
  return {
    schemaVersion: SCHEMA_VERSION,
    status,
    environment,
    agents,
    collector,
    limitations,
    errors,
  };
}
