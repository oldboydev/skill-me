// Formas que ligam NOME sem `=` nem operador aumentado, segundo o CPython 3.13
// (Grammar/python.gram, só texto, https://github.com/python/cpython/blob/v3.13.0/Grammar/python.gram):
// - padrão de `case` (case_block, l. 455–460): pattern_capture_target é o
//   NAME que não vem seguido de `.`, `(` ou `=` (l. 531–533), em captura
//   simples, grupo, sequência, `*`, valor de mapping, `**`, `as`,
//   alternativa e argumento posicional ou keyword de classe (l. 471–630);
// - alvo de `with ... as` (with_item, l. 407–410): star_target com tupla,
//   lista, grupo e `*` (l. 1056–1070).
// VALOR é o subject do `match`. Fora do padrão (guarda, subject, corpo) e
// antes do `as` do with, o nome é só lido: são os controles.
export const CASE_CAPTURE_PATTERNS = Object.freeze({
  "captura simples": "match VALOR:\n    case NOME:\n        pass",
  "captura com corpo na mesma linha": "match VALOR:\n    case NOME: pass",
  "captura antes da guarda": "match VALOR:\n    case NOME if outro:\n        pass",
  "captura agrupada": "match VALOR:\n    case (NOME):\n        pass",
  "captura agrupada aninhada": "match VALOR:\n    case ((NOME)):\n        pass",
  "sequência entre colchetes": "match VALOR:\n    case [1, NOME]:\n        pass",
  "sequência entre parênteses": "match VALOR:\n    case (1, NOME):\n        pass",
  "sequência aberta": "match VALOR:\n    case 1, NOME:\n        pass",
  "sequência aninhada": "match VALOR:\n    case [1, [2, (NOME, 3)]]:\n        pass",
  "star em sequência": "match VALOR:\n    case [1, *NOME]:\n        pass",
  "star em sequência aberta": "match VALOR:\n    case *NOME, 1:\n        pass",
  "valor de mapping": 'match VALOR:\n    case {"k": NOME}:\n        pass',
  "resto ** de mapping": 'match VALOR:\n    case {"k": 1, **NOME}:\n        pass',
  "alvo de as": "match VALOR:\n    case [1, 2] as NOME:\n        pass",
  "captura antes de as": "match VALOR:\n    case NOME as outro:\n        pass",
  "alternativas com o mesmo nome": "match VALOR:\n    case [NOME] | (1, NOME):\n        pass",
  "posicional em classe": "match VALOR:\n    case Ponto(NOME):\n        pass",
  "keyword em classe": "match VALOR:\n    case Ponto(x=NOME):\n        pass",
  "classe aninhada em mapping": 'match VALOR:\n    case {"k": pacote.Ponto(y=[NOME])}:\n        pass',
  "multilinha com comentário": "match VALOR:\n    case (\n        1,  # comentário com ) e :\n        NOME,\n    ):\n        pass",
});

export const WITH_CAPTURE_TARGETS = Object.freeze({
  "tupla entre parênteses": "with C() as (NOME, outro):\n    pass",
  "nome agrupado": "with C() as (NOME):\n    pass",
  "nome agrupado aninhado": "with C() as ((NOME)):\n    pass",
  "lista": "with C() as [outro, NOME]:\n    pass",
  "tupla aninhada": "with C() as (outro, [mais, (NOME,)]):\n    pass",
  "star na tupla": "with C() as (outro, *NOME):\n    pass",
  "segundo item": "with A() as a, B() as (b, NOME):\n    pass",
  "itens entre parênteses, multilinha com comentário":
    "with (\n    A() as a,  # comentário com ) e :\n    B() as (\n        b,\n        NOME,\n    ),\n):\n    pass",
  "corpo na mesma linha": "with C() as (NOME, outro): pass",
  // Dentro de função a ligação é local, mas, como qualquer ligação indentada
  // já registrada, conta: a leitura não acompanha escopos.
  "async with": "async def f():\n    async with C() as (NOME, outro):\n        pass",
});

// Nenhuma destas liga NOME: guarda, subject e corpo leem o nome; `x.NOME`,
// `NOME.x`, `NOME(...)` e `Ponto(NOME=...)` não são pattern_capture_target;
// `case`/`match` são soft keywords, nomes comuns fora do case_block; no with,
// o nome no contexto ou em outro item sem `as` é expressão.
export const CAPTURE_CONTROLS = Object.freeze({
  "guarda com o nome": 'match VALOR:\n    case _ if NOME == "x":\n        pass',
  "guarda depois da captura de outro nome": "match VALOR:\n    case outro if outro in NOME:\n        pass",
  "subject": "match NOME:\n    case _:\n        pass",
  "subject em tupla": "match NOME, 1:\n    case (a, b):\n        pass",
  "leitura no corpo": "match VALOR:\n    case outro:\n        print(NOME)",
  "leitura no corpo na mesma linha": "match VALOR:\n    case outro: print(NOME)",
  "valor pontuado depois do nome": "match VALOR:\n    case NOME.atributo:\n        pass",
  "valor pontuado antes do nome": "match VALOR:\n    case pacote.NOME:\n        pass",
  "nome da classe": "match VALOR:\n    case NOME(x=1):\n        pass",
  "palavra-chave da classe": "match VALOR:\n    case Ponto(NOME=1):\n        pass",
  "case como nome: atribuição": "case = NOME",
  "case como nome: chamada": "case(NOME)",
  "case como nome: atributo": "case.atributo = NOME",
  "case como nome: subscrito": "case[0] = NOME",
  "case como nome: lambda": "case = lambda: NOME",
  "case como nome: aumentada": "case += NOME",
  "match como nome": "match = NOME",
  "with: nome no contexto": "with abrir(NOME) as (f, g):\n    pass",
  "with: item seguinte sem as": "with A() as a, B(NOME):\n    pass",
  "with: item seguinte com alvo de outro nome": "with A() as (a, b), B(NOME) as c:\n    pass",
  "with: leitura no corpo": "with A() as (a, b):\n    print(NOME)",
  "comentário": "# case NOME:  with C() as (NOME, outro):",
  "string": 'EXEMPLO = "case NOME: pass; with C() as (NOME, outro): pass"',
});

// Uma passada só: o texto já substituído nunca é substituído de novo.
export function captureStatement(template, name, value) {
  const parts = { NOME: name, VALOR: value };
  return template.replace(/NOME|VALOR/g, (placeholder) => parts[placeholder]);
}
