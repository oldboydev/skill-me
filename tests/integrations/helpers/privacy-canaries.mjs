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

// Delimitação do valor sensível (vírgula e separador escapado dentro do valor)
// e userinfo com mais de um `@` (achados P1 da revisão formal, tentativa 2).
// Só os valores e o userinfo saem; os separadores reais e o resto ficam.
export const DELIMITED_COMMAND = "DB_PASSWORD=prefix,SKILLMECANARYdbpass ./deploy.sh --password prefix,SKILLMECANARYpw && git clone https://u:prefix@SKILLMECANARYpass@example.test/repo; echo ok,fim";
export const DELIMITED_COMMAND_OUT = "DB_PASSWORD=[removido] ./deploy.sh --password [removido] && git clone https://example.test/repo; echo ok,fim";
export const DELIMITED_OUTPUT = "PASSWORD=a\\,SKILLMECANARYesc conectado\nremoto https://:SKILLMECANARYempty@example.test/db e https://example.test/p@x?e=a@b";
export const DELIMITED_OUTPUT_OUT = "PASSWORD=[removido] conectado\nremoto https://example.test/db e https://example.test/p@x?e=a@b";

// Valor sensível composto (cenário do coordenador após o lote formal2 e riscos
// vizinhos). Comando com substituição e userinfo com aspa que atravessa espaço:
// sem projeção segura, o campo inteiro sai como `unsanitizable`. Saída com NBSP
// na palavra, Digest com aspas internas, query com aspa colada e `Bearer` com
// vírgula colada: a palavra inteira sai e o resto fica. Só dados; nada é executado.
export const COMPOSED_COMMAND = "DB_PASSWORD=prefix$(printf SKILLMECANARYcompound) ./deploy.sh && git clone https://u:abc'SKILLMECANARYurl x'@example.test/p";
export const COMPOSED_OUTPUT = 'PASSWORD=abc SKILLMECANARYnbsp ok\nAuthorization: Digest username="SKILLMECANARYheader", response="SKILLMECANARYresp"\nGET https://example.test/p?password=abc\'SKILLMECANARYsuffix\' 200\nBearer abcdefgh12,SKILLMECANARYbearer fim';
export const COMPOSED_OUTPUT_OUT = "PASSWORD=[removido] ok\nAuthorization: [removido]\nGET https://example.test/p?password=[removido] 200\nBearer [removido] fim";

// Valor sensível em bloco multilinha (risco relatado no lote anterior): resultado
// textual com `password: |` e `token: >-` aninhados; sem projeção segura, o campo
// inteiro sai como `unsanitizable`. Só dados; nada é lido nem executado.
export const BLOCK_COMMAND = "cat config.yml";
export const BLOCK_OUTPUT = "db:\n  host: localhost\n  password: |\n    SKILLMECANARYblock\n  api:\n    token: >- # rotacionar\n      SKILLMECANARYfolded\n";
// Mesmo risco, decisão do coordenador: valor na linha seguinte e tag/âncora
// antes do indicador ou do fim da linha.
export const NEXT_LINE_OUTPUT = "db:\n  host: localhost\n  password:  \n    SKILLMECANARYnextline\n  user: u\n";
export const TAGGED_OUTPUT = "db:\n  secret: !!str &s |\n    SKILLMECANARYtagged\n  api_key: !!str\n    SKILLMECANARYtagline\n";

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
