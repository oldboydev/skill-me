// Formas do alvo de uma atribuição aumentada `NOME OP= valor` com o nome
// agrupado por parênteses redundantes. A gramática do CPython 3.13
// (Grammar/python.gram, regra assignment com augassign e single_target:
// NAME | '(' single_target ')',
// https://github.com/python/cpython/blob/v3.13.0/Grammar/python.gram#L968)
// liga o MESMO nome em todas elas; dentro do par valem a continuação
// implícita (quebra de linha, CRLF, comentário) e a explícita com "\".
// "sem parêntese" é o controle já coberto pela correção formal4.
export const AUGMENTED_OPERATORS = Object.freeze([
  "+=", "-=", "*=", "/=", "//=", "%=", "**=", "&=", "|=", "^=", ">>=", "<<=", "@=",
]);

export const GROUPED_AUGMENTED_TARGETS = Object.freeze({
  "sem parêntese (controle)": "NOME OP VALOR",
  "um par": "(NOME) OP VALOR",
  "um par, operador colado": "(NOME)OP VALOR",
  "espaço e tab dentro do par": "( \tNOME\t ) OP VALOR",
  "dois pares": "((NOME)) OP VALOR",
  "64 pares": `${"(".repeat(64)}NOME${")".repeat(64)} OP VALOR`,
  "quebra de linha dentro do par": "(\nNOME\n) OP VALOR",
  "CRLF dentro do par": "(\r\nNOME\r\n) OP VALOR",
  "comentário com ) dentro do par": "(NOME  # comentário com )\n) OP VALOR",
  "pares aninhados em linhas diferentes": "(\n    (\n        NOME\n    )\n) OP VALOR",
  "continuação com \\ antes do operador": "(NOME) \\\nOP VALOR",
  "indentado em bloco": "if DEV:\n    (NOME) OP VALOR",
});

// Uma passada só: o texto já substituído (um nome com "OP", por exemplo)
// nunca é substituído de novo.
export function groupedAugmentedStatement(template, name, op, value) {
  const parts = { NOME: name, OP: op, VALOR: value };
  return template.replace(/NOME|OP|VALOR/g, (placeholder) => parts[placeholder]);
}
