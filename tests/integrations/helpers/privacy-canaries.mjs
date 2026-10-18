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

// Formatos de token do sanitizador usados como CHAVE de objeto: todos cabem em
// `^[A-Za-z0-9_.-]{1,64}$` e nenhum contém palavra de `isSensitiveKey`, então só
// a detecção de formato os reconhece (achado P1 da revisão formal, tentativa 1).
export const KEY_CANARIES = Object.freeze({
  github: "ghp_SKILLMECANARY0123456789abcdefgh",
  githubPat: "github_pat_SKILLMECANARY_0123456789ab",
  openai: "sk-SKILLMECANARY0123456789ab",
  slack: "xoxb-SKILLMECANARY01",
  aws: "AKIASKILLMECANARY123",
  gitlab: "glpat-SKILLMECANARY0123456789",
  google: "AIzaSKILLMECANARY0123456789abcdefghijkl",
  jwt: "eyJSKILLMECANARY.eyJhbGciOi.c2lnbmF0dXJl",
});

// Nome de parâmetro sensível em codificação percentual normal (`t%6fken` = token).
export const ENCODED_QUERY_URL = "https://example.test/p?t%6fken=SKILLMECANARYquery&page=2";

// Percent encoding de todo caractere (`%XX` maiúsculo), para canário cujo
// marcador não aparece literal no texto.
export const percentEncodeAll = (text) => [...Buffer.from(text, "utf8")].map((b) => `%${b.toString(16).toUpperCase().padStart(2, "0")}`).join("");
export const ENCODED_MARKER = percentEncodeAll(MARKER);

// Valores de query não sensíveis pelo nome com token em uma camada de percent
// encoding: underscore codificado e valor inteiro codificado (variante do
// lote formal1). Só o valor sai; os demais parâmetros ficam literais.
export const ENCODED_VALUE_URL = `https://example.test/search?page=2&q=ghp%5FSKILLMECANARYvalue0123456789abcd&sort=asc&k=${percentEncodeAll("sk-SKILLMECANARYfull0123456789ab")}&lang=pt%2Dbr`;
export const ENCODED_VALUE_URL_OUT = "https://example.test/search?page=2&q=[removido]&sort=asc&k=[removido]&lang=pt%2Dbr";

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
