// Fixture sintética da issue #5: canários das cinco categorias da issue (token,
// cabeçalho, URL com credencial, password, chave privada). Nenhum é segredo
// real; todos carregam o marcador MARKER, que nunca pode sair do debugger.
// Os payloads derivam das fixtures da #4 (mesmos contratos), só com os campos
// trocados por cada prova.
import { fixtureCase } from "./fixtures.mjs";

export const MARKER = "SKILLMECANARY";

export const CANARIES = Object.freeze({
  token: "ghp_SKILLMECANARYtoken0123456789abcdefgh",
  header: "Authorization: Bearer SKILLMECANARYheader0123",
  url: "https://SKILLMECANARYuser:SKILLMECANARYpass@example.test/p?token=SKILLMECANARYquery&page=2",
  password: "--password SKILLMECANARYpassword DB_PASSWORD=SKILLMECANARYdbpass",
  privateKey: "-----BEGIN OPENSSH PRIVATE KEY-----\nSKILLMECANARYkeyAAAA\nBBBBSKILLMECANARY\n-----END OPENSSH PRIVATE KEY-----",
});

// Texto livre com as cinco categorias entre trechos que podem permanecer.
export const SECRET_TEXT = [
  "início seguro",
  `git push ${CANARIES.url}`,
  `curl -H '${CANARIES.header}' https://example.test/api`,
  `export GH=${CANARIES.token}`,
  `mysql ${CANARIES.password}`,
  CANARIES.privateKey,
  "fim seguro",
].join("\n");

const clone = (value) => structuredClone(value);

export function claudePayload(caseName, patch = {}) {
  return { ...clone(fixtureCase("claude-hooks.json", caseName).payload), ...patch };
}

export function codexHookPayload(caseName, patch = {}) {
  return { ...clone(fixtureCase("codex-hooks.json", caseName).payload), ...patch };
}

export function execEvent(caseName, itemPatch) {
  const event = clone(fixtureCase("codex-exec.json", caseName).event);
  if (itemPatch) event.item = { ...event.item, ...itemPatch };
  return event;
}

export function hermesRecord(caseName, kwargsPatch = {}) {
  const fixture = fixtureCase("hermes-hooks.json", caseName);
  return { hook: fixture.hook, kwargs: { ...clone(fixture.kwargs), ...kwargsPatch }, nonScalar: [] };
}

// Linha NDJSON de cada entrada nativa, como o `privacy ingest` recebe.
export const ndjson = (entries) => entries.map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)) + "\n").join("");

// Tudo o que uma saída do debugger não pode conter.
export function leaks(text) {
  const found = [];
  if (text.includes(MARKER)) found.push(MARKER);
  for (const [name, value] of Object.entries(CANARIES)) if (text.includes(value)) found.push(name);
  return found;
}
