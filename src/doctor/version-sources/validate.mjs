// Formato mínimo plausível de uma versão: sem isto, um leitor de texto
// aceitaria qualquer string não vazia — incluindo um canário/credencial ou
// texto ilegível — e a exporia verbatim como `version` no relatório. O
// padrão é deliberadamente permissivo com números de versão reais (semver e
// variações próximas), mas fechado em tamanho e alfabeto.
const PLAUSIBLE_VERSION_PATTERN = /^[0-9]+(?:\.[0-9]+){0,3}(?:[-+][0-9A-Za-z.]{1,20})?$/;
const MAX_VERSION_LENGTH = 32;

export function isPlausibleVersionString(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_VERSION_LENGTH &&
    PLAUSIBLE_VERSION_PATTERN.test(value)
  );
}
