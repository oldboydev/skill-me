// Leitura léxica mínima de uma fonte Python, só como texto: separa código de
// comentários e de literais de string (inclusive docstrings e strings de três
// aspas que atravessam linhas) e marca onde cada instrução começa. Nada é
// importado, compilado ou executado. Serve para que uma atribuição só seja
// reconhecida quando é código real no nível do módulo — o mesmo texto dentro
// de um comentário, de uma docstring ou de uma chamada não é a tabela nem a
// versão do pacote.
//
// Não é um parser de Python: nomes, strings e pontuação bastam aos leitores
// do doctor. Tudo o que esta leitura não consegue delimitar com certeza
// (string não terminada, f-string cujo fim depende de aspas aninhadas,
// colchetes desbalanceados, "\" fora de string que não continua a linha)
// devolve null para o arquivo inteiro: nunca adivinha o contexto.

const STRING_PREFIXES = new Set(["r", "u", "b", "f", "t", "br", "rb", "fr", "rf", "tr", "rt"]);
const MULTI_CHAR_OPERATORS = [
  "**=", "//=", ">>=", "<<=", "...",
  "->", ":=", "==", "!=", "<=", ">=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "@=",
  "**", "//", "<<", ">>",
];
// `name OP= valor` liga `name` ao resultado de uma operação com seu valor
// anterior: nunca um literal novo determinável por esta leitura léxica.
const AUGMENTED_ASSIGNMENT_OPERATORS = new Set([
  "+=", "-=", "*=", "/=", "//=", "%=", "**=", "&=", "|=", "^=", ">>=", "<<=", "@=",
]);
const WORD = /[\p{L}\p{N}_]+/uy;

// Antes do Python 3.12 a aspa externa não pode aparecer dentro de um campo
// `{...}` de f-string, então a primeira aspa igual encerra a string. Desde o
// 3.12 pode (PEP 701); nesse caso a primeira aspa cai dentro de um campo
// aberto e as chaves ficam desbalanceadas — sinal de que o fim lido não é o
// real, e a leitura desiste em vez de seguir com o contexto errado.
function hasBalancedReplacementFields(body) {
  let depth = 0;
  for (let k = 0; k < body.length; k += 1) {
    const ch = body[k];
    if (ch === "{") {
      if (depth === 0 && body[k + 1] === "{") k += 1;
      else depth += 1;
    } else if (ch === "}") {
      if (depth > 0) depth -= 1;
      else if (body[k + 1] === "}") k += 1;
      else return false;
    }
  }
  return depth === 0;
}

function scanString(text, start, prefix) {
  const quote = text[start];
  const triple = text.startsWith(quote.repeat(3), start);
  const delimiter = triple ? quote.repeat(3) : quote;
  const bodyStart = start + delimiter.length;
  let hasBackslash = false;
  let j = bodyStart;
  while (j < text.length) {
    if (text.startsWith(delimiter, j)) {
      const body = text.slice(bodyStart, j);
      if (/[ft]/.test(prefix) && !hasBalancedReplacementFields(body)) return null;
      return { end: j + delimiter.length, triple, body, hasBackslash };
    }
    const ch = text[j];
    if (ch === "\\") {
      // Mesmo em string crua a barra impede que a aspa seguinte encerre a
      // string; "\" + CRLF é uma única continuação.
      hasBackslash = true;
      j += text.startsWith("\r\n", j + 1) ? 3 : 2;
    } else if (ch === "\n" && !triple) {
      return null;
    } else {
      j += 1;
    }
  }
  return null;
}

function columnOf(text, index) {
  return index - (text.lastIndexOf("\n", index - 1) + 1);
}

// Tokens: { type: "name" | "string" | "op" | "newline", start, depth,
// statementStart, column, ... }. `newline` só aparece no fim de uma linha
// lógica (fora de colchetes e sem continuação com "\"); `statementStart`
// marca o primeiro token de cada linha lógica.
export function tokenizePython(text) {
  const tokens = [];
  let depth = 0;
  let statementStart = true;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\n") {
      if (depth === 0 && !statementStart) {
        tokens.push({ type: "newline", start: i, depth });
        statementStart = true;
      }
      i += 1;
      continue;
    }
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\f") {
      i += 1;
      continue;
    }
    if (ch === "#") {
      const end = text.indexOf("\n", i);
      i = end === -1 ? text.length : end;
      continue;
    }
    if (ch === "\\") {
      if (text[i + 1] === "\n") i += 2;
      else if (text.startsWith("\r\n", i + 1)) i += 3;
      else return null;
      continue;
    }
    const base = { start: i, depth, statementStart, column: columnOf(text, i) };
    statementStart = false;
    WORD.lastIndex = i;
    const word = WORD.exec(text)?.[0];
    const prefix = word && STRING_PREFIXES.has(word.toLowerCase()) ? word : null;
    const quoteAt = prefix ? i + prefix.length : i;
    if (text[quoteAt] === '"' || text[quoteAt] === "'") {
      const literal = scanString(text, quoteAt, (prefix ?? "").toLowerCase());
      if (literal === null) return null;
      tokens.push({ ...base, type: "string", prefix: prefix ?? "", ...literal });
      i = literal.end;
      continue;
    }
    if (word) {
      tokens.push({ ...base, type: "name", value: word });
      i += word.length;
      continue;
    }
    const op = MULTI_CHAR_OPERATORS.find((candidate) => text.startsWith(candidate, i)) ?? ch;
    if ("([{".includes(op)) depth += 1;
    if (")]}".includes(op)) {
      depth -= 1;
      if (depth < 0) return null;
    }
    tokens.push({ ...base, type: "op", value: op });
    i += op.length;
  }
  return depth === 0 ? tokens : null;
}

export function isOp(token, value) {
  return token?.type === "op" && token.value === value;
}

// Índice do primeiro token depois do nome em `nameIndex` e de qualquer
// sequência de `)` que o segue: com o nome agrupado (`((NOME)).clear()`,
// `(NOME) += x`), é ali que fica o ponto da chamada ou o operador. Os `(`
// que abrem o grupo não mudam a decisão de quem consome. Uma passada, sem
// recursão; quebra de linha e comentário dentro do grupo o tokenizer já
// descartou.
export function indexAfterGroupedName(tokens, nameIndex) {
  let next = nameIndex + 1;
  while (isOp(tokens[next], ")")) next += 1;
  return next;
}

function isName(token, value) {
  return token?.type === "name" && token.value === value;
}

export function endsStatement(token) {
  return token === undefined || token.type === "newline";
}

// Literal de string simples: sem prefixo, sem três aspas e sem barra
// invertida — o texto entre as aspas é exatamente o valor.
export function simpleStringValue(token) {
  if (token?.type !== "string" || token.prefix !== "" || token.triple || token.hasBackslash) return null;
  return token.body;
}

function statementEnd(tokens, from) {
  let k = from;
  while (k < tokens.length && tokens[k].type !== "newline" && !(isOp(tokens[k], ";") && tokens[k].depth === 0)) {
    k += 1;
  }
  return k;
}

function topLevelEqualsIn(tokens, from, to) {
  for (let k = from; k < to; k += 1) {
    if (isOp(tokens[k], "=") && tokens[k].depth === 0) return k;
  }
  return -1;
}

const BINDING_STATEMENT_HEADS = new Set(["import", "from", "del", "global", "nonlocal"]);
const BINDING_PREDECESSORS = new Set(["as", "import", "def", "class"]);

// Formas que também ligam o nome, além de `name = ...`: alvo de
// desempacotamento antes do "=" da instrução, `for name in`, `import`/`from
// ... import name`, `as name`, `del`/`global`/`nonlocal name`, `def`/`class
// name`. Lidas de modo conservador: na dúvida, é ligação.
function isOtherBindingTarget(tokens, first, k) {
  const previous = tokens[k - 1];
  if (previous?.type === "name" && BINDING_PREDECESSORS.has(previous.value)) return true;
  const head = tokens[first];
  if (head.type === "name" && BINDING_STATEMENT_HEADS.has(head.value)) return true;
  if (isName(head, "for")) {
    return !tokens.slice(first, k).some((t) => isName(t, "in") && t.depth === head.depth);
  }
  return topLevelEqualsIn(tokens, k + 1, statementEnd(tokens, k)) !== -1;
}

// Capturas que ligam sem `=` (CPython 3.13 Grammar/python.gram, lido só como
// texto, https://github.com/python/cpython/blob/v3.13.0/Grammar/python.gram):
// o alvo de `with ... as` é um star_target, com grupo, tupla, lista e `*`
// (l. 407–410 e 1056–1070); num padrão de `case`, todo NAME que não vem
// depois de `.` nem antes de `.`, `(` ou `=` é pattern_capture_target
// (l. 455–630). Guarda, subject e corpo só leem. Uma passada por instrução,
// sem recursão. Ver .checks/issue-3-agent-diagnostics.build.md, seção 28.
const PATTERN_START_OPS = new Set(["(", "[", "{", "-", "*"]);
const WITH_TARGET_END_OPS = new Set([",", ":", ")", "]", "}"]);

// `case` é soft keyword: `case = x`, `case.a`, `case(x)` usam um nome comum.
// É case_block quando o token seguinte pode abrir um padrão e há `:` fora de
// colchetes antes de qualquer `=`; devolve onde o padrão termina (`if` da
// guarda ou `:`), ou -1. `case[i]: T` (anotação) também passa: conservador.
function canStartPattern(token) {
  if (token?.type === "op") return PATTERN_START_OPS.has(token.value);
  return token?.type === "name" || token?.type === "string";
}

function casePatternEnd(tokens, first, end) {
  if (!isName(tokens[first], "case") || !canStartPattern(tokens[first + 1])) return -1;
  for (let k = first + 1; k < end; k += 1) {
    if (tokens[k].depth !== 0) continue;
    if (isOp(tokens[k], ":") || isName(tokens[k], "if")) return k;
    if (isOp(tokens[k], "=")) return -1;
  }
  return -1;
}

function isPatternCapture(tokens, k) {
  const next = tokens[k + 1];
  return !isOp(tokens[k - 1], ".") && !(next?.type === "op" && [".", "(", "="].includes(next.value));
}

// Do `as` até `,`, `:` ou o fecho de um grupo na profundidade do próprio
// `as`, tudo é alvo; o nome dentro de um subscrito do alvo (`as c[NOME]`)
// também conta: conservador.
function addWithTargets(tokens, first, end, captured) {
  let targetDepth = -1;
  for (let k = first + 1; k < end; k += 1) {
    const token = tokens[k];
    if (targetDepth === -1) {
      if (isName(token, "as")) targetDepth = token.depth;
    } else if (token.depth === targetDepth && token.type === "op" && WITH_TARGET_END_OPS.has(token.value)) {
      targetDepth = -1;
    } else if (token.type === "name") {
      captured.add(k);
    }
  }
}

function captureTargetIndices(tokens) {
  const captured = new Set();
  for (let first = 0; first < tokens.length; ) {
    const end = statementEnd(tokens, first);
    const head = tokens[first];
    const patternEnd = casePatternEnd(tokens, first, end);
    for (let k = first + 1; k < patternEnd; k += 1) {
      if (tokens[k].type === "name" && isPatternCapture(tokens, k)) captured.add(k);
    }
    if (isName(head, "with") || (isName(head, "async") && isName(tokens[first + 1], "with"))) {
      addWithTargets(tokens, first, end, captured);
    }
    first = end + 1;
  }
  return captured;
}

// Toda ligação de `name` em código. Só `name = ...` e `name: T = ...` com a
// instrução começando no próprio nome, na coluna 0 e fora de colchetes têm
// `moduleLevel` e `valueIndex` (primeiro token do valor); `name=` dentro de
// uma chamada é argumento nomeado, não ligação. As demais (cadeia `x = name
// = ...`, `:=`, atribuição aumentada `name OP= ...`, indentadas e as de
// isOtherBindingTarget) entram sem `moduleLevel`: o valor lido no nível do
// módulo pode não ser o efetivo.
//
// O alvo da atribuição aumentada pode vir agrupado: `(name) OP= ...` e
// `((name)) OP= ...` ligam o mesmo nome (CPython 3.13 Grammar/python.gram,
// augassign sobre single_target ::= NAME | '(' single_target ')',
// https://github.com/python/cpython/blob/v3.13.0/Grammar/python.gram#L968).
// Basta o operador logo depois do grupo, fora de colchetes: `x[(name)] += 1`
// muda `x`, e `f(name) += 1` ou `(a, name) += 1` não são Python válido.
// Capturas de `case` e alvos de `with ... as` vêm de captureTargetIndices.
export function findAssignments(tokens, name) {
  const sites = [];
  const captured = captureTargetIndices(tokens);
  let first = 0;
  tokens.forEach((token, k) => {
    if (token.statementStart || (isOp(tokens[k - 1], ";") && tokens[k - 1].depth === 0)) first = k;
    if (token.type !== "name" || token.value !== name) return;
    const moduleLevel = token.statementStart && token.column === 0 && token.depth === 0;
    const next = tokens[k + 1];
    const afterGroup = tokens[indexAfterGroupedName(tokens, k)];
    if (isOp(next, "=") && token.depth === 0) {
      sites.push({ moduleLevel, valueIndex: k + 2 });
      return;
    }
    if (isOp(next, ":") && token.statementStart) {
      const equals = topLevelEqualsIn(tokens, k + 2, statementEnd(tokens, k));
      if (equals !== -1) {
        sites.push({ moduleLevel, valueIndex: equals + 1 });
        return;
      }
    }
    if (
      isOp(next, ":=") ||
      (afterGroup?.type === "op" && AUGMENTED_ASSIGNMENT_OPERATORS.has(afterGroup.value) && afterGroup.depth === 0) ||
      captured.has(k) ||
      isOtherBindingTarget(tokens, first, k)
    ) {
      sites.push({ moduleLevel: false, valueIndex: null });
    }
  });
  return sites;
}
