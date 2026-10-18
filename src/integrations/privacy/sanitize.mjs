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
const URL_USERINFO = /\b([A-Za-z][A-Za-z0-9+.-]*:\/\/)[^\s/?#@"'<>]+@/g;
const QUERY_PARAM = /([?&])([^=&#\s"'<>]+)=([^&#\s"'<>]*)/g;
const HEADER_LINE = /\b(authorization|proxy-authorization|cookie|set-cookie|x-api-key)([ \t]*:[ \t]*)[^\r\n"']+/gi;
const AUTH_SCHEME = /\b(Bearer|bearer|Basic)[ \t]+[A-Za-z0-9._~+/=-]{8,}/g;
// Nome + separador sem o valor: o valor só é consumido quando o nome é
// sensível, para que `foo:password=x` não esconda a segunda atribuição.
const ASSIGNMENT_NAME = /(["']?)\b([A-Za-z][A-Za-z0-9_.-]{0,63})\1([ \t]*[:=][ \t]*)/g;
const ASSIGNMENT_VALUE = /"(?:[^"\\\r\n]|\\.)*"|'[^'\r\n]*'|[^\s"'&,;}]+/y;
const FLAG_NAME = /(^|[\s"'(])(--?)([A-Za-z][A-Za-z0-9_.-]{0,63})[ \t]+/g;
const FLAG_VALUE = /"(?:[^"\\\r\n]|\\.)*"|'[^'\r\n]*'|[^\s"'&,;}-][^\s"'&,;}]*/y;
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
const HOME_PREFIXES = [/[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"'<>|:*?]+/gi, /\/(?:home|Users)\/[^/\s"'<>]+/g];

function removeSensitiveValues(text, namePattern, valuePattern, nameGroup) {
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
    valuePattern.lastIndex = valueStart;
    const value = valuePattern.exec(text);
    if (value === null || value[0] === REMOVED || value[0] === `"${REMOVED}"`) {
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

  replace(PRIVATE_KEY_BLOCK, () => REMOVED);
  replace(URL_USERINFO, (_, scheme) => scheme);
  replace(QUERY_PARAM, (match, sep, name, value) => (value !== "" && !isRemoved(value) && isSensitiveQueryName(name) ? `${sep}${name}=${REMOVED}` : match));
  replace(HEADER_LINE, (_, name, sep) => `${name}${sep}${REMOVED}`);
  replace(AUTH_SCHEME, (match, scheme) => `${scheme} ${REMOVED}`);
  for (const [namePattern, valuePattern, nameGroup] of [[ASSIGNMENT_NAME, ASSIGNMENT_VALUE, 2], [FLAG_NAME, FLAG_VALUE, 3]]) {
    const scanned = removeSensitiveValues(text, namePattern, valuePattern, nameGroup);
    text = scanned.text;
    removed ||= scanned.removed;
  }
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
