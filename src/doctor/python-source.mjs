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

// Toda ligação de `name` em código. Só `name = ...` e `name: T = ...` com a
// instrução começando no próprio nome, na coluna 0 e fora de colchetes têm
// `moduleLevel` e `valueIndex` (primeiro token do valor); `name=` dentro de
// uma chamada é argumento nomeado, não ligação. As demais (cadeia `x = name
// = ...`, `:=`, atribuição aumentada `name OP= ...`, indentadas e as de
// isOtherBindingTarget) entram sem `moduleLevel`: o valor lido no nível do
// módulo pode não ser o efetivo.
export function findAssignments(tokens, name) {
  const sites = [];
  let first = 0;
  tokens.forEach((token, k) => {
    if (token.statementStart || (isOp(tokens[k - 1], ";") && tokens[k - 1].depth === 0)) first = k;
    if (token.type !== "name" || token.value !== name) return;
    const moduleLevel = token.statementStart && token.column === 0 && token.depth === 0;
    const next = tokens[k + 1];
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
      (next?.type === "op" && AUGMENTED_ASSIGNMENT_OPERATORS.has(next.value) && token.depth === 0) ||
      isOtherBindingTarget(tokens, first, k)
    ) {
      sites.push({ moduleLevel: false, valueIndex: null });
    }
  });
  return sites;
}
