export function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Busca só chaves próprias: um nome nativo como "toString" ou "__proto__"
// nunca alcança um membro herdado da tabela de mapeamento.
export function pick(table, key) {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}
