// Sanitizador de texto e regras de nome/chave da política (issue #5, crit.
// 5–6). Detecção por padrões complementa a projeção por allowlist: não é
// garantia universal para texto livre ou segredo de formato desconhecido (o
// guia declara essa limitação). A ordem das regras é a do Landing; cada
// remoção marca `removed`, que a política vira `sensitive_removed`.

export const REMOVED = "[removido]";

const EXACT_SENSITIVE = new Set(["auth", "authorization", "proxyauthorization", "cookie", "setcookie", "xapikey", "pwd", "passwd"]);
const SENSITIVE_PARTS = ["password", "secret", "token", "apikey", "privatekey", "credential", "accesskey"];

export function isSensitiveKey(name) {
  const normalized = name.toLowerCase().replace(/[-_]/g, "");
  return EXACT_SENSITIVE.has(normalized) || SENSITIVE_PARTS.some((part) => normalized.includes(part));
}

// Nome de parâmetro de query: vale o nome como veio e sua forma decodificada
// (uma camada, a codificação normal de URL: `t%6fken` é `token`). Escape
// inválido não é classificável e conta como sensível (falha fechada).
function isSensitiveQueryName(name) {
  if (isSensitiveKey(name)) return true;
  if (!name.includes("%")) return false;
  try {
    return isSensitiveKey(decodeURIComponent(name));
  } catch {
    return true;
  }
}

const PRIVATE_KEY_BLOCK = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY[A-Z0-9 ]*-----[\s\S]*?(?:-----END [A-Z0-9 ]*PRIVATE KEY[A-Z0-9 ]*-----|$)/g;
// Autoridade até `/?#`, espaço, aspa ou `<>`; o host não contém `@`, então o
// userinfo vai até o último `@` dela (`u:a@b@host`).
const URL_USERINFO = /\b([A-Za-z][A-Za-z0-9+.-]*:\/\/)[^\s/?#"'<>]+@/g;
const QUERY_PARAM = /([?&])([^=&#\s"'<>]+)=([^&#\s"'<>]*)/g;
const HEADER_LINE = /\b(authorization|proxy-authorization|cookie|set-cookie|x-api-key)([ \t]*:[ \t]*)[^\r\n"']+/gi;
const AUTH_SCHEME = /\b(Bearer|bearer|Basic)[ \t]+[A-Za-z0-9._~+/=-]{8,}/g;
// Nome + separador sem o valor: o valor só é consumido quando o nome é
// sensível, para que `foo:password=x` não esconda a segunda atribuição.
const ASSIGNMENT_NAME = /(["']?)\b([A-Za-z][A-Za-z0-9_.-]{0,63})\1([ \t]*[:=][ \t]*)/g;
const FLAG_NAME = /(^|[\s"'(])(--?)([A-Za-z][A-Za-z0-9_.-]{0,63})[ \t]+/g;
// Valor = palavra de shell na mesma linha: vírgula, `}`, `-` inicial e
// separador escapado pertencem a ela (`DB_PASSWORD=a,b`). Aspa sem fecho na
// linha ou `\` no fim dela não dizem se o valor acaba (fecho do texto ao redor
// ou continuação): o valor vai até o fim do texto, como a chave privada sem END.
const SENSITIVE_VALUE = /(?:"(?:[^"\\\r\n]|\\.)*"|'[^'\r\n]*'|\\.|[^\s"'\\;&|<>()])*(?:["'\\][\s\S]*)?/y;
// Remoção das regras 1–4 até a regra 5 terminar: o trecho delas acaba em aspa,
// `#`, `&` ou espaço por desenho e o que segue é texto ao redor, não valor. NUL
// nunca vem da entrada (recusada antes), então não se confunde com o texto
// `[removido]` que a própria entrada traga.
const PENDING_REMOVED = "\0";
const TOKEN_FORMATS = [
  /(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9]{20,}/g,
  /(?<![A-Za-z0-9])github_pat_[A-Za-z0-9_]{20,}/g,
  /(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}/g,
  /(?<![A-Za-z0-9])xox[abprs]-[A-Za-z0-9-]{10,}/g,
  /(?<![A-Za-z0-9])AKIA[0-9A-Z]{16}(?![0-9A-Z])/g,
  /(?<![A-Za-z0-9])glpat-[A-Za-z0-9_-]{20,}/g,
  /(?<![A-Za-z0-9])AIza[0-9A-Za-z_-]{35}/g,
  /(?<![A-Za-z0-9])eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g,
];
const hasTokenFormat = (text) => TOKEN_FORMATS.some((pattern) => text.search(pattern) !== -1);

// Valor de query com nome não sensível: a regra 6 só vê o texto literal, e
// `ghp%5F…` esconde o token atrás de uma camada normal de URL. Decodifica uma
// camada só para decidir, com o mesmo detector; nunca a aplica ao texto nem
// redecodifica. Escape inválido não é classificável (falha fechada). Linha
// "Valor de parâmetro de query codificado…" do Landing.
function isUnsafeQueryValue(value) {
  if (!value.includes("%")) return false;
  try {
    return hasTokenFormat(decodeURIComponent(value));
  } catch {
    return true;
  }
}

const HOME_PREFIXES =[/[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"'<>|:*?]+/gi, /\/(?:home|Users)\/[^/\s"'<>]+/g];

function removeSensitiveValues(text, namePattern, nameGroup) {
  let out = "";
  let copied = 0;
  let removed = false;
  namePattern.lastIndex = 0;
  for (let match = namePattern.exec(text); match !== null; match = namePattern.exec(text)) {
    const name = match[nameGroup];
    const nameEnd = match.index + match[0].indexOf(name) + name.length;
    if (!isSensitiveKey(name)) {
      namePattern.lastIndex = nameEnd;
      continue;
    }
    const valueStart = match.index + match[0].length;
    SENSITIVE_VALUE.lastIndex = valueStart;
    const value = SENSITIVE_VALUE.exec(text);
    if (value[0] === "" || value[0].startsWith(PENDING_REMOVED) || value[0] === REMOVED || value[0] === `"${REMOVED}"`) {
      namePattern.lastIndex = Math.max(valueStart, nameEnd);
      continue;
    }
    out += text.slice(copied, valueStart) + REMOVED;
    copied = valueStart + value[0].length;
    removed = true;
    namePattern.lastIndex = copied;
  }
  return { text: out + text.slice(copied), removed };
}

// Texto não bem formado (surrogate isolado) ou com NUL não tem projeção
// segura: quem chama omite o campo com `unsanitizable`.
export function sanitizeText(text) {
  if (typeof text !== "string" || !text.isWellFormed() || text.includes("\0")) return { ok: false };
  let removed = false;
  const replace = (pattern, replacer) => {
    text = text.replace(pattern, (...args) => {
      const out = replacer(...args);
      if (out !== args[0]) removed = true;
      return out;
    });
  };
  const isRemoved = (value) => value === REMOVED || value === `"${REMOVED}"`;

  replace(PRIVATE_KEY_BLOCK, () => PENDING_REMOVED);
  replace(URL_USERINFO, (_, scheme) => scheme);
  replace(QUERY_PARAM, (match, sep, name, value) =>
    value !== "" && !isRemoved(value) && (isSensitiveQueryName(name) || isUnsafeQueryValue(value)) ? `${sep}${name}=${PENDING_REMOVED}` : match,
  );
  replace(HEADER_LINE, (_, name, sep) => `${name}${sep}${PENDING_REMOVED}`);
  replace(AUTH_SCHEME, (match, scheme) => `${scheme} ${PENDING_REMOVED}`);
  for (const [namePattern, nameGroup] of [[ASSIGNMENT_NAME, 2], [FLAG_NAME, 3]]) {
    const scanned = removeSensitiveValues(text, namePattern, nameGroup);
    text = scanned.text;
    removed ||= scanned.removed;
  }
  text = text.replaceAll(PENDING_REMOVED, REMOVED);
  for (const pattern of TOKEN_FORMATS) replace(pattern, () => REMOVED);
  for (const pattern of HOME_PREFIXES) replace(pattern, () => "<home>");
  return { ok: true, text, removed };
}

// Nome do envelope que expõe caminho, conta ou segredo: removido inteiro
// (nunca pseudonimizado — destruiria `toolName`/`skillName`, usados pela #6).
export function isUnsafeName(value) {
  if (value.includes("/") || value.includes("@") || value.startsWith("~") || /^[A-Za-z]:/.test(value)) return true;
  const sanitized = sanitizeText(value);
  return !sanitized.ok || sanitized.removed;
}
