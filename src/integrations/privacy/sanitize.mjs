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
// Autoridade (grupo 2, só lida) até `/?#`, espaço, tab, quebra de linha ou
// `<>`; o host não contém `@`, então o userinfo casado vai até o último `@`
// dela (`u:a@b@host`). Aspas e `\` fazem parte dela como da palavra de shell.
const URL_USERINFO = /\b([A-Za-z][A-Za-z0-9+.-]*:\/\/)(?=([^ \t\n/?#<>]*))(?:[^ \t\n/?#<>]+@)?/g;
const QUERY_PARAM = /([?&])([^=&#\s"'<>]+)=([^&#\s"'<>]*)/g;
// Texto serializado de novo (JSON dentro de um resultado) traz o separador
// escrito como escape (`Basic\nYTpi`, `x\nCookie:` com `\` literal): ele é só
// lido, nunca decodificado. Vale entre `Bearer`/`Basic` e a credencial e
// entre flag e valor, e o fim dele vale como fronteira antes do esquema e dos
// nomes das regras 3 e 5 (o `n`/`0` do escape colaria no nome). Linhas
// "Separador escrito como escape…" e "Nome sensível depois de separador
// escapado…" do Landing.
const ESCAPE_BODY = String.raw`(?:[nrt]|u00(?:0[9adAD]|20))`;
const ESCAPED_SEPARATOR = String.raw`\\+${ESCAPE_BODY}`;
// Lookbehind: consumir a sequência de `\` em cada posição seria quadrático.
const AFTER_ESCAPE = `(?<=${ESCAPED_SEPARATOR})`;
// Aspa logo antes do nome: o cabeçalho é o conteúdo dela (`-H 'Authorization: …'`).
const HEADER_NAME = new RegExp(String.raw`(["']?)(?:\b|${AFTER_ESCAPE})(authorization|proxy-authorization|cookie|set-cookie|x-api-key)([ \t]*:[ \t]*)`, "gi");
// Sem mínimo de comprimento: token68 tem um caractere ou mais, e `Basic YTpi`
// (`a:b`) já é credencial. Qualquer caixa ASCII (sem `u`, `ſ` não vira `s`) e
// credencial depois de quebra ou linha em branco: só ela sai, esquema e
// separadores ficam como vieram. Custa a palavra seguinte em prosa (`basic
// idea`, inclusive na linha seguinte); linhas "Credencial curta depois de
// `Bearer`/`Basic`" e "Caixa e quebra antes da credencial…" do Landing. Com
// a flag `i`, o separador escapado `\N` também conta (perda declarada).
const AUTH_SCHEME = new RegExp(String.raw`(?:\b|(?<=${ESCAPED_SEPARATOR}))(bearer|basic)(?:[ \t\r\n]|${ESCAPED_SEPARATOR})+([A-Za-z0-9._~+/=-]+)`, "gi");
// Cabeçalho sem aspa cuja linha termina no esquema: a regra 3 o consome antes
// da regra 4, e a credencial da linha seguinte ficaria. Estender o valor seria
// ler dobra de cabeçalho HTTP; o campo é recusado.
const SCHEME_AT_LINE_END = new RegExp(String.raw`(?:\b|(?<=${ESCAPED_SEPARATOR}))(?:bearer|basic)(?:[ \t]|${ESCAPED_SEPARATOR})*$`, "i");
const CREDENTIAL_AFTER_BREAK = /\r?\n[ \t\r\n]*[A-Za-z0-9._~+/=-]/y;
// Nome + separador sem o valor: o valor só é consumido quando o nome é
// sensível, para que `foo:password=x` não esconda a segunda atribuição. O
// nome também pode vir entre aspas escapadas (`{\"Cookie\":\"s=…\"}`), com a
// mesma sequência de `\` nos dois lados; ela só começa no primeiro `\`.
const ASSIGNMENT_NAME = new RegExp(String.raw`((?<!\\)\\+"|["']?)(?:\b|${AFTER_ESCAPE})([A-Za-z][A-Za-z0-9_.-]{0,63})\1([ \t]*[:=][ \t]*)`, "g");
// Nome lido a partir da letra de um escape (`nauth` em `x\nauth=`).
const ESCAPE_AT_NAME = new RegExp(String.raw`(?<=\\)${ESCAPE_BODY}(?=[A-Za-z])`, "y");
const FLAG_NAME = new RegExp(String.raw`(^|[\s"'(]|${AFTER_ESCAPE})(--?)([A-Za-z][A-Za-z0-9_.-]{0,63})(?:[ \t]|${ESCAPED_SEPARATOR})+`, "g");
// Valor = palavra de shell na mesma linha: vírgula, `}`, `-` inicial e
// separador escapado pertencem a ela (`DB_PASSWORD=a,b`). Só espaço, tab,
// quebra de linha e os operadores a encerram: o Bash não separa palavras em
// NBSP nem em CR isolado, e `\s` deixaria o sufixo. Aspa sem fecho na linha ou
// `\` no fim dela não dizem se o valor acaba (fecho do texto ao redor ou
// continuação): o valor vai até o fim do texto, como a chave privada sem END.
const QUOTED = /"(?:[^"\\\r\n]|\\.)*"|'[^'\r\n]*'/;
const QUOTED_AT = new RegExp(QUOTED.source, "y");
const SENSITIVE_VALUE = new RegExp(String.raw`(?:${QUOTED.source}|\\.|\r(?!\n)|[^ \t\r\n"'\\;&|<>()])*(?:["'\\][\s\S]*)?`, "y");
const LINE_REST = /(?:\r(?!\n)|[^\r\n])*/y;
// Valor das regras 1–4 já completado até o fim da palavra: a regra 5 não o
// reprocessa. Não diz que o texto ao redor foi saneado. NUL nunca vem da
// entrada (recusada antes), então não se confunde com o texto `[removido]`
// que a própria entrada traga.
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

const count = (text, part) => text.split(part).length - 1;

// Varredura de trás para frente: `/\\*$/` tentaria cada posição de uma
// sequência longa de `\` (quadrático numa entrada de 1 MiB).
function endsInEscape(text, start = 0, end = text.length) {
  let at = end;
  while (at > start && text[at - 1] === "\\") at -= 1;
  return (end - at) % 2 === 1;
}

// Mesma aspa desde o início da linha até `end` (exclusivo). Contagem, não
// parser: um apóstrofo anterior inverte a leitura (limite do Landing). As
// consultas de uma passada vêm em ordem crescente; recontar a linha a cada
// valor seria quadrático numa linha longa com muitos valores.
function quoteCounter(text) {
  let at = 0;
  let double = 0;
  let single = 0;
  return (end, quote) => {
    if (end < at) [at, double, single] = [0, 0, 0];
    for (; at < end; at += 1) {
      if (text[at] === "\n") [double, single] = [0, 0];
      else if (text[at] === '"') double += 1;
      else if (text[at] === "'") single += 1;
    }
    return quote === '"' ? double : single;
  };
}

function wordEnd(text, from) {
  SENSITIVE_VALUE.lastIndex = from;
  return from + SENSITIVE_VALUE.exec(text)[0].length;
}

// Composição que o shell lê além de [start, end): `$'…'` (aspa escapada),
// crase ímpar, `$(`/`${`/`$[` sem fecho, ou palavra que para antes de `(`,
// `<(` ou `>(`. Só lê o texto; nada é expandido nem executado. Trecho que vai
// até o fim do texto não deixa sobra. Linha "Valor sensível composto…" do Landing.
function leavesWordOpen(text, start, end, stop = end) {
  if (end === text.length) return false;
  const span = text.slice(start, end);
  const next = text[stop] === "<" || text[stop] === ">" ? text[stop + 1] : text[stop];
  return (
    next === "(" ||
    span.includes("$'") ||
    count(span, "`") % 2 === 1 ||
    count(span, "(") > count(span, ")") ||
    count(span, "${") > count(span, "}") ||
    count(span, "$[") > count(span, "]")
  );
}

// Regras 2 e 4: [start, stop) é o que a gramática da regra delimita; a palavra
// de shell pode continuar depois. `\` final escapa o próximo caractere; aspa
// de fecho (contagem ímpar na linha) fica e o que a palavra concatena depois
// dela sai junto; aspa de abertura e outro caractere da palavra saem junto.
function completeWord(text, start, stop, quotes) {
  let from = stop;
  let quote = "";
  if (endsInEscape(text, start, stop)) from = stop - 1;
  else if ((text[stop] === '"' || text[stop] === "'") && quotes(stop, text[stop]) % 2 === 1) {
    from = stop + 1;
    quote = text[stop];
  }
  const end = wordEnd(text, from);
  return end === from ? { start, end: stop, keep: "", stop: from } : { start, end, keep: quote, stop: end };
}

// Regra 2, valor de query de nome sensível ou com token codificado: `&` e `#`
// encerram o valor pela gramática de URL (o fragmento fica).
function queryValue(match, text, quotes) {
  const [whole, , name, value] = match;
  if (!isSensitiveQueryName(name) && !isUnsafeQueryValue(value)) return null;
  const stop = match.index + whole.length;
  return text[stop] === "#" || text[stop] === "&" ? { start: stop - value.length, end: stop, keep: "", stop } : completeWord(text, stop - value.length, stop, quotes);
}

function schemeValue(match, text, quotes) {
  const stop = match.index + match[0].length;
  return completeWord(text, stop - match[2].length, stop, quotes);
}

// Valor que só começa na linha seguinte: indicador de bloco (`|`/`>`,
// chomping/indentação simples, comentário), comentário depois de espaço ou
// nada até a quebra, com até duas propriedades (tag `!…`, âncora `&…`) antes.
// Só uma gramática YAML diria onde o valor acaba; só lê o texto, nada é
// extraído nem interpretado. O limite de duas (tag e âncora de um nó) impede
// que nomes dentro de `!…` releiam a linha. Linhas "Valor sensível em bloco
// multilinha…", "Valor sensível na linha seguinte…" e "Tag/âncora seguida de
// texto…" do Landing.
const NEXT_LINE_VALUE = /(?:[!&][^ \t\r\n]*(?:[ \t]+|(?=[\r\n]))){0,2}(?:[|>][0-9+-]{0,2}(?:[ \t]*(?=[\r\n])|[ \t]+#)|[ \t]*(?:(?<=[ \t])#[^\r\n]*)?(?=[\r\n]))/y;
// Propriedade seguida de texto na mesma linha: pular a tag/âncora para achar o
// valor seria interpretar o nó YAML. `&` sozinho é o operador de shell.
const PROPERTY_START = /!|&(?=[^ \t\r\n])/y;
const PROPERTY_REST = /[^ \t\r\n]*/y;
const TEXT_AFTER_PROPERTY = /[ \t]+[^ \t\r\n]/y;
const NO_SAFE_PROJECTION = Symbol("no safe projection");

// Valor que começa em quebra com texto depois ou em propriedade com texto
// depois na mesma linha. A última quebra assim é calculada uma vez por
// passada: procurar o fim da linha a cada nome seria quadrático numa linha
// longa de `secret: | # …`. Valor ausente começa na própria quebra
// (`at === lastBreak`). As consultas vêm em ordem crescente; um nome dentro da
// sequência da propriedade anterior (`&secret:&secret:…`) reusa o resultado
// dela em vez de varrê-la de novo.
function blockOpener(text) {
  const end = text.length - (text.endsWith("\r\n") ? 2 : text.endsWith("\n") || text.endsWith("\r") ? 1 : 0);
  const lastBreak = Math.max(text.lastIndexOf("\n", end - 1), text.lastIndexOf("\r", end - 1));
  let propertyEnd = -1;
  let textAfterProperty = false;
  return (at) => {
    PROPERTY_START.lastIndex = at;
    if (PROPERTY_START.test(text)) {
      if (at >= propertyEnd) {
        PROPERTY_REST.lastIndex = at;
        PROPERTY_REST.test(text);
        propertyEnd = PROPERTY_REST.lastIndex;
        TEXT_AFTER_PROPERTY.lastIndex = propertyEnd;
        textAfterProperty = TEXT_AFTER_PROPERTY.test(text);
      }
      if (textAfterProperty) return true;
    }
    NEXT_LINE_VALUE.lastIndex = at;
    return at <= lastBreak && NEXT_LINE_VALUE.test(text);
  };
}

// Regra 3: com aspa antes do nome, o valor vai até o fecho dela (aspas
// internas do outro tipo, como `Digest username="…"`, são do valor) e a
// concatenação depois do fecho sai junto; sem fecho na linha, até o fim do
// texto. Sem aspa, até o fim da linha, ou do texto se ela deixar aspa aberta.
function headerValue(match, text, _quotes, opensBlock) {
  const start = match.index + match[0].length;
  if (opensBlock(start)) return NO_SAFE_PROJECTION;
  if (match[1] !== "") {
    QUOTED_AT.lastIndex = match.index;
    const quoted = QUOTED_AT.exec(text);
    const end = wordEnd(text, match.index);
    const close = quoted === null ? -1 : match.index + quoted[0].length - 1;
    return end === close + 1 ? { start, end: close, keep: "", stop: end } : { start, end, keep: quoted === null ? "" : match[1], stop: end };
  }
  LINE_REST.lastIndex = start;
  const line = LINE_REST.exec(text)[0];
  const open = count(line, '"') % 2 === 1 || count(line, "'") % 2 === 1 || endsInEscape(line);
  const end = open ? text.length : start + line.length;
  CREDENTIAL_AFTER_BREAK.lastIndex = end;
  if (!open && SCHEME_AT_LINE_END.test(line) && CREDENTIAL_AFTER_BREAK.test(text)) return NO_SAFE_PROJECTION;
  return { start, end, keep: "", stop: end };
}

// Regra 5: o valor é a palavra inteira depois do separador. Valor vazio depois
// de espaço é ausência de valor (`password: (x)`); colado ao separador, um `(`
// seguinte é composição (`NOME=(…)`). Valor que começa no marcador já foi
// completado pelas regras 1–4: pular antes de varrer a palavra evita relê-la
// a cada nome numa linha longa. Nome comum que começa na letra de um escape
// é lido de novo depois dele (`nauth` → `auth`); reler a partir da posição
// seguinte qualquer nome mudaria `x-auth` e o limite de 64.
function assignedValue(match, text, nameGroup, opensBlock) {
  const name = match[nameGroup];
  if (!isSensitiveKey(name)) {
    const nameStart = match.index + match[0].indexOf(name);
    ESCAPE_AT_NAME.lastIndex = nameStart;
    return { skip: ESCAPE_AT_NAME.test(text) ? ESCAPE_AT_NAME.lastIndex : nameStart + name.length };
  }
  const start = match.index + match[0].length;
  if (text[start] === PENDING_REMOVED) return { skip: start };
  if (opensBlock(start)) return NO_SAFE_PROJECTION;
  const end = wordEnd(text, start);
  return end === start && /[ \t]$/.test(match[0]) ? { skip: start } : { start, end, keep: "", stop: end };
}

// Troca cada valor que `locate` devolve pelo marcador interno. Valor que já
// começa no marcador ou é exatamente `[removido]` não conta de novo; trecho
// com composição aberta ou valor em bloco deixa o texto sem projeção segura
// (`null`).
function removeValues(text, pattern, locate) {
  let out = "";
  let copied = 0;
  let removed = false;
  const quotes = quoteCounter(text);
  const opensBlock = blockOpener(text);
  pattern.lastIndex = 0;
  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    const found = locate(match, text, quotes, opensBlock);
    if (found === null) continue;
    if (found === NO_SAFE_PROJECTION) return null;
    if ("skip" in found) {
      pattern.lastIndex = found.skip;
      continue;
    }
    const value = text.slice(found.start, found.end);
    if (value.startsWith(PENDING_REMOVED) || value === REMOVED || value === `"${REMOVED}"`) {
      pattern.lastIndex = found.start;
      continue;
    }
    if (leavesWordOpen(text, found.start, found.end, found.stop)) return null;
    if (value === "") {
      pattern.lastIndex = found.start;
      continue;
    }
    out += text.slice(copied, found.start) + PENDING_REMOVED + found.keep;
    copied = found.end;
    removed = true;
    pattern.lastIndex = found.end;
  }
  return { text: out + text.slice(copied), removed };
}

// Regra 2, userinfo: a autoridade só é a da palavra inteira se não ficar
// aberta no fim (aspa dela com contagem ímpar na linha, `\` final, composição).
function userinfoIsOpen(text, start, authority, quotes) {
  const end = start + authority.length;
  if (end === text.length) return false;
  return endsInEscape(authority) || ['"', "'"].some((quote) => authority.includes(quote) && quotes(end, quote) % 2 === 1) || leavesWordOpen(text, start, end);
}

// Regras 2 (valor de query) a 5, na ordem do Landing.
const VALUE_RULES = [
  [QUERY_PARAM, queryValue],
  [HEADER_NAME, headerValue],
  [AUTH_SCHEME, schemeValue],
  [ASSIGNMENT_NAME, (match, text, _quotes, opensBlock) => assignedValue(match, text, 2, opensBlock)],
  [FLAG_NAME, (match, text, _quotes, opensBlock) => assignedValue(match, text, 3, opensBlock)],
];

// Texto não bem formado (surrogate isolado), com NUL ou com um valor sensível
// sem fim seguro não tem projeção segura: quem chama omite o campo com
// `unsanitizable`.
export function sanitizeText(text) {
  if (typeof text !== "string" || !text.isWellFormed() || text.includes("\0")) return { ok: false };
  let removed = false;
  let open = false;
  const replace = (pattern, replacer) => {
    text = text.replace(pattern, (...args) => {
      const out = replacer(...args);
      if (out !== args[0]) removed = true;
      return out;
    });
  };

  replace(PRIVATE_KEY_BLOCK, () => PENDING_REMOVED);
  const quotes = quoteCounter(text);
  replace(URL_USERINFO, (match, scheme, authority, offset, input) => {
    if (userinfoIsOpen(input, offset + scheme.length, authority, quotes)) open = true;
    return scheme;
  });
  if (open) return { ok: false };
  for (const [pattern, locate] of VALUE_RULES) {
    const scanned = removeValues(text, pattern, locate);
    if (scanned === null) return { ok: false };
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
