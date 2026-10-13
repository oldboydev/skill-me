const BROKEN_STATES = new Set([
  "unreadable",
  "invalid",
  "too_large",
  "changed_during_read",
  "inconclusive",
]);

// Combina o resultado de leitura de vários arquivos de configuração (um
// agente pode ter escopos de usuário, projeto e política gerenciada) em um
// único `configuration`, na ordem de precedência recebida em `scopeResults`
// (maior precedência primeiro).
//
// `isDisabled(fields, scope)` tem quatro retornos possíveis, para suportar
// tanto um override por precedência (Claude: o escopo mais específico que
// define a chave decide) quanto uma regra aditiva (Codex: qualquer escopo
// pode desligar, então a ausência da chave nunca "resolve" a pergunta):
//   - uma string (reasonCode): a chave desliga hooks aqui — resultado final
//     imediato, pois nenhum escopo de menor precedência muda uma decisão de
//     desabilitar.
//   - `false`: este escopo endereçou a chave e decidiu que NÃO desliga —
//     só faz sentido para uma regra de override; marca a pergunta como
//     resolvida, então um escopo ilegível de menor precedência deixa de
//     importar para essa chave.
//   - `undefined`: este escopo não endereça a chave; a pergunta continua em
//     aberto e um escopo ilegível de menor precedência ainda pode esconder
//     a resposta.
//   - `{ configuration, configReasonCode }`: resultado final imediato que
//     não é "disabled" — usado quando a EFETIVIDADE do próprio escopo não
//     pode ser determinada por leitura estática (ex.: um valor de projeto no
//     Codex que só vale se o projeto for confiável, algo que o doctor não
//     lê). Diferente da string acima, não afirma que hooks estão desligados.
export function mergeConfigScopes(scopeResults, { isDisabled, hasHooks }) {
  let disabledSettled = false;
  let configuredFound;

  for (const scope of scopeResults) {
    if (scope.state === "missing") continue;
    if (BROKEN_STATES.has(scope.state)) {
      const disabledStillOpen = !disabledSettled;
      const configuredStillOpen = configuredFound === undefined;
      if (disabledStillOpen || configuredStillOpen) return blockingResult(scope);
      continue;
    }
    if (!disabledSettled) {
      const verdict = isDisabled(scope.parsed, scope.scope);
      if (typeof verdict === "string") {
        return { configuration: "disabled", configReasonCode: verdict };
      }
      if (verdict && typeof verdict === "object") {
        return { configuration: verdict.configuration, configReasonCode: verdict.configReasonCode };
      }
      if (verdict === false) disabledSettled = true;
    }
    if (configuredFound === undefined && hasHooks(scope.parsed)) {
      configuredFound = true;
    }
    if (disabledSettled && configuredFound !== undefined) break;
  }

  if (configuredFound) {
    return { configuration: "configured", configReasonCode: "hooks_configured" };
  }
  return { configuration: "not_configured", configReasonCode: "no_config_found" };
}

function blockingResult(scope) {
  if (scope.state === "unreadable") {
    return { configuration: "unknown", configReasonCode: "policy_precedence_undetermined" };
  }
  if (scope.state === "too_large") {
    return { configuration: "unknown", configReasonCode: "input_too_large" };
  }
  // Mutação detectada durante a leitura (critério 15): estado inconclusivo,
  // nunca um reparo silencioso nem uma reinterpretação como config malformada.
  if (scope.state === "changed_during_read") {
    return { configuration: "unknown", configReasonCode: "config_changed_during_read" };
  }
  // Arquivo legível que a forma conhecida não decide (ex.: tipo de handler
  // fora da fonte consultada): nem inválido nem configurado.
  if (scope.state === "inconclusive") {
    return { configuration: "unknown", configReasonCode: scope.reasonCode };
  }
  return {
    configuration: "invalid",
    configReasonCode: scope.reasonCode ?? "config_malformed",
  };
}
