// C5 (achado formal 2) — a evidência de contrato por mecanismo vem de uma
// tabela que a PRÓPRIA instalação do agente traz, ligada ao launcher pelo
// mesmo pacote de onde a versão foi lida. Única tabela reconhecida: o literal
// `VALID_HOOKS` de `hermes_cli/plugins.py` (a doc local do Hermes declara que
// a validade dos nomes de evento vem dali, e o parser de shell hooks usa a
// mesma tabela como allow-list). O texto é só lido, nunca importado; acima de
// 1 MiB, mutado durante a leitura, ausente, ilegível ou com forma diferente
// do literal, não há prova. Claude e Codex não têm artefato textual
// equivalente nos layouts inspecionados.
import assert from "node:assert/strict";
import test from "node:test";
import {
  extractHermesShellUnsupportedHooks,
  extractHermesValidHooks,
  readContractEvidence,
} from "../../src/doctor/contract-evidence.mjs";
import { MECHANISMS } from "../../src/doctor/capability-matrix.mjs";
import {
  hermesPluginsLookalikeSources,
  hermesPluginsSource,
} from "./helpers/hermes-contract-source.mjs";
import { addFile, buildFsTree, createFakeFsAdapter, wrapFsMethodFault } from "./helpers/fake-fs-adapter.mjs";
import {
  AUGMENTED_OPERATORS,
  GROUPED_AUGMENTED_TARGETS,
  groupedAugmentedStatement,
} from "./helpers/grouped-augmented-targets.mjs";
import {
  CAPTURE_CONTROLS,
  CASE_CAPTURE_PATTERNS,
  WITH_CAPTURE_TARGETS,
  captureStatement,
} from "./helpers/binding-captures.mjs";

const PKG_DIR = "/venv/lib/python3.12/site-packages/hermes_cli";
const PLUGINS_PATH = PKG_DIR + "/plugins.py";

function fsWithPlugins(content) {
  const tree = buildFsTree();
  if (content !== undefined) addFile(tree, PKG_DIR, "plugins.py", content);
  return createFakeFsAdapter(tree);
}

const EXPECTED_EVENTS = {
  skill_usage_signal: ["on_skill_lifecycle"],
  tool_calls: ["pre_tool_call", "post_tool_call"],
  results_and_errors: ["post_tool_call"],
  session_turn: ["on_session_start", "on_session_end"],
  subagents: ["subagent_start", "subagent_stop"],
};

test("contract-evidence-C5 Hermes: VALID_HOOKS ligado ao pacote lista os eventos de cada mecanismo, com origem e caminho seguros", async () => {
  const result = await readContractEvidence({
    agentId: "hermes",
    packageDir: PKG_DIR,
    fs: fsWithPlugins(hermesPluginsSource()),
  });
  assert.equal(result.state, "found");
  assert.deepEqual(result.source, { kind: "hermes_valid_hooks", path: PLUGINS_PATH });
  assert.deepEqual(Object.keys(result.mechanisms).sort(), [...MECHANISMS].sort());
  for (const mechanism of MECHANISMS) {
    assert.deepEqual(result.mechanisms[mechanism].events, EXPECTED_EVENTS[mechanism], mechanism);
    assert.deepEqual(result.mechanisms[mechanism].missingEvents, [], mechanism);
  }
});

test("contract-evidence-C5 Hermes: evento ausente da tabela aparece em missingEvents só no mecanismo afetado", async () => {
  const result = await readContractEvidence({
    agentId: "hermes",
    packageDir: PKG_DIR,
    fs: fsWithPlugins(hermesPluginsSource({ omit: ["on_skill_lifecycle", "subagent_stop"] })),
  });
  assert.equal(result.state, "found");
  assert.deepEqual(result.mechanisms.skill_usage_signal.missingEvents, ["on_skill_lifecycle"]);
  assert.deepEqual(result.mechanisms.subagents.missingEvents, ["subagent_stop"]);
  assert.deepEqual(result.mechanisms.tool_calls.missingEvents, []);
});

test("contract-evidence-C5 nome citado só em comentário dentro do conjunto não conta como item", () => {
  const text =
    "VALID_HOOKS: Set[str] = {\n" +
    '    "pre_tool_call",  # depois deste vem "post_tool_call" — só comentário\n' +
    '    # "on_skill_lifecycle",\n' +
    "    'subagent_start',\n" +
    "}\n";
  assert.deepEqual(extractHermesValidHooks(text), ["pre_tool_call", "subagent_start"]);
});

test("contract-evidence-C5 forma diferente do literal único no nível do módulo não é reconhecida", () => {
  const cases = {
    "sem atribuição": 'HOOKS = {"pre_tool_call"}\n',
    "atribuição só dentro de função": 'def f():\n    VALID_HOOKS = {"pre_tool_call"}\n',
    "duas atribuições no módulo": 'VALID_HOOKS = {"pre_tool_call"}\nVALID_HOOKS = {"post_tool_call"}\n',
    "item não literal": 'VALID_HOOKS = {"pre_tool_call", *EXTRA}\n',
    "frozenset em vez de literal": 'VALID_HOOKS = frozenset({"pre_tool_call"})\n',
    "nome fora do alfabeto de evento": 'VALID_HOOKS = {"pre tool call"}\n',
    "literal não fechado": 'VALID_HOOKS = {"pre_tool_call",\n',
  };
  for (const [label, text] of Object.entries(cases)) {
    assert.equal(extractHermesValidHooks(text), null, label);
  }
});

// Pré-revisão formal: as três formas abaixo trazem todos os eventos mapeados
// escritos, mas nenhuma é o literal atribuído à tabela em código — em Python,
// strings adjacentes viram uma só, a diferença retira pre_tool_call, e a
// docstring não atribui nada.
test("contract-evidence-C5 strings adjacentes, expressão depois do literal e atribuição em docstring não são a tabela", async () => {
  for (const [label, text] of Object.entries(hermesPluginsLookalikeSources())) {
    assert.equal(extractHermesValidHooks(text), null, label);
    const result = await readContractEvidence({ agentId: "hermes", packageDir: PKG_DIR, fs: fsWithPlugins(text) });
    assert.equal(result.state, "unrecognized", label);
    assert.equal(result.mechanisms, undefined, label);
  }
});

test("contract-evidence-C5 só a atribuição literal em código, no nível do módulo e encerrando a instrução, é reconhecida", () => {
  const unrecognized = {
    "segunda instrução depois de ;": 'VALID_HOOKS = {"pre_tool_call"}; VALID_HOOKS = set()\n',
    "expressão continuada com \\": 'VALID_HOOKS = {"pre_tool_call"} \\\n    | {"post_tool_call"}\n',
    "argumento nomeado em chamada, na coluna 0": 'registrar(\nVALID_HOOKS = {"pre_tool_call"}\n)\n',
    "atribuição em cadeia": 'HOOKS = VALID_HOOKS = {"pre_tool_call"}\n',
    "reatribuição condicional em código": 'VALID_HOOKS = {"pre_tool_call"}\nif DEBUG:\n    VALID_HOOKS = {"post_tool_call"}\n',
    "atribuição por expressão (:=)": 'VALID_HOOKS = {"pre_tool_call"}\n(VALID_HOOKS := {"post_tool_call"})\n',
    // formal4 P2 (nº2, alcance compartilhado): atribuição aumentada fora do
    // padrão textual de mutação já coberto acima ("-&^|+="), provando que é a
    // ligação em findAssignments — não só o regex de runtimeMutationPattern —
    // que invalida a confirmação da tabela.
    "atribuição aumentada (%=) depois do literal": 'VALID_HOOKS = {"pre_tool_call"}\nVALID_HOOKS %= {"post_tool_call"}\n',
    "dict vazio": "VALID_HOOKS = {}\n",
    "string com prefixo": 'VALID_HOOKS = {r"pre_tool_call"}\n',
    "string de três aspas": 'VALID_HOOKS = {"""pre_tool_call"""}\n',
    "vírgula antes do primeiro item": 'VALID_HOOKS = {, "pre_tool_call"}\n',
    "vírgula duplicada": 'VALID_HOOKS = {"pre_tool_call",, "post_tool_call"}\n',
    "string não terminada adiante no arquivo": 'VALID_HOOKS = {"pre_tool_call"}\nDOC = """aberta\n',
  };
  for (const [label, text] of Object.entries(unrecognized)) {
    assert.equal(extractHermesValidHooks(text), null, label);
  }

  const recognized = {
    "vírgula final e comentário depois do literal": [
      'VALID_HOOKS = {\n    "pre_tool_call",\n    "post_tool_call",\n}  # fim\n',
      ["pre_tool_call", "post_tool_call"],
    ],
    "atribuição citada na docstring não conta como segunda": [
      '"""Exemplo:\nVALID_HOOKS = {"inventado"}\n"""\nVALID_HOOKS = {"pre_tool_call"}\n',
      ["pre_tool_call"],
    ],
  };
  for (const [label, [text, expected]] of Object.entries(recognized)) {
    assert.deepEqual(extractHermesValidHooks(text), expected, label);
  }
});

// Achado formal5 P2 (nº1, .checks/code-review/formal5-fixes.md): o regex de
// mutação exigia o ponto imediatamente após o nome — `VALID_HOOKS .clear()`
// (espaço antes do ponto) é Python tão válido quanto a forma sem espaço, e
// escapava do filtro: a tabela mutada passava como reconhecida, liberando
// `verified`/`configured`/`trusted` com eventos que a mutação já removeu do
// conjunto efetivo. Cobre espaço, tab e continuação lógica (`\` + quebra de
// linha) nas duas junções (nome→ponto e método→parêntese), nas duas tabelas.
test("contract-evidence-formal5-1 mutação com espaço, tab ou continuação lógica entre nome/ponto/método/parêntese não escapa do filtro", () => {
  const MUTATIONS = {
    "espaço antes do ponto": "VALID_HOOKS .clear()\n",
    "tab antes do ponto": "VALID_HOOKS\t.clear()\n",
    "espaço depois do ponto, antes do método": "VALID_HOOKS. clear()\n",
    "espaço antes do parêntese": "VALID_HOOKS.clear ()\n",
    "continuação lógica (\\) antes do ponto": "VALID_HOOKS \\\n.clear()\n",
    "continuação lógica (\\) antes do parêntese": "VALID_HOOKS.clear \\\n()\n",
  };
  for (const [label, mutation] of Object.entries(MUTATIONS)) {
    const validHooksText = 'VALID_HOOKS = {"pre_tool_call"}\n' + mutation;
    assert.equal(extractHermesValidHooks(validHooksText), null, `VALID_HOOKS/${label}`);

    const shellMutation = mutation.replace("VALID_HOOKS", "SHELL_UNSUPPORTED_HOOKS");
    const shellText = 'SHELL_UNSUPPORTED_HOOKS = {"pre_tool_call"}\n' + shellMutation;
    assert.equal(extractHermesShellUnsupportedHooks(shellText), null, `SHELL_UNSUPPORTED_HOOKS/${label}`);
  }
});

test("contract-evidence-formal5-1 VALID_HOOKS com espaço antes de .clear() no arquivo da instalação vira state unrecognized, nunca found", async () => {
  const mutated = hermesPluginsSource({ extra: "VALID_HOOKS .clear()\n" });
  const result = await readContractEvidence({
    agentId: "hermes",
    packageDir: PKG_DIR,
    fs: fsWithPlugins(mutated),
  });
  assert.equal(result.state, "unrecognized");
  assert.equal(result.mechanisms, undefined);
  assert.equal(result.validHooks, undefined);
});

// Achado formal5 residual nº1 (.checks/code-review/formal5-residual-fixes.md):
// uma parentesização simples do nome antes do ponto (`(VALID_HOOKS).clear()`)
// é a mesma chamada direta `nome.mutator(args)` do achado anterior, só com um
// `(`/`)` redundante ao redor do nome — Python tão válido quanto a forma sem
// parêntese, e continuava escapando do filtro. Prova um par com os mesmos
// separadores flexíveis já testados para a forma sem parêntese; qualquer
// quantidade de pares e a continuação implícita dentro deles ficam nos testes
// formal5-parens abaixo.
test("contract-evidence-formal5-residual parêntese ao redor do nome, com os mesmos separadores flexíveis, não escapa do filtro", () => {
  const MUTATIONS = {
    "parêntese simples": "(NOME).clear()\n",
    "espaço dentro do parêntese": "( NOME ).clear()\n",
    "tab dentro do parêntese": "(\tNOME\t).clear()\n",
    "espaço antes do ponto, depois do parêntese": "(NOME) .clear()\n",
    "tab antes do ponto, depois do parêntese": "(NOME)\t.clear()\n",
    "espaço depois do ponto, antes do método": "(NOME). clear()\n",
    "espaço antes do parêntese de chamada": "(NOME).clear ()\n",
    "continuação lógica (\\) antes do ponto": "(NOME) \\\n.clear()\n",
    "continuação lógica (\\) antes do parêntese de chamada": "(NOME).clear \\\n()\n",
  };
  for (const [label, template] of Object.entries(MUTATIONS)) {
    const validHooksText = 'VALID_HOOKS = {"pre_tool_call"}\n' + template.replaceAll("NOME", "VALID_HOOKS");
    assert.equal(extractHermesValidHooks(validHooksText), null, `VALID_HOOKS/${label}`);

    const shellText =
      'SHELL_UNSUPPORTED_HOOKS = {"pre_tool_call"}\n' + template.replaceAll("NOME", "SHELL_UNSUPPORTED_HOOKS");
    assert.equal(extractHermesShellUnsupportedHooks(shellText), null, `SHELL_UNSUPPORTED_HOOKS/${label}`);
  }
});

test("contract-evidence-formal5-residual (VALID_HOOKS).clear() no arquivo da instalação vira state unrecognized, nunca found", async () => {
  const mutated = hermesPluginsSource({ extra: "(VALID_HOOKS).clear()\n" });
  const result = await readContractEvidence({
    agentId: "hermes",
    packageDir: PKG_DIR,
    fs: fsWithPlugins(mutated),
  });
  assert.equal(result.state, "unrecognized");
  assert.equal(result.mechanisms, undefined);
  assert.equal(result.validHooks, undefined);
});

// Achado formal5 residual nº2 (mesmo arquivo): `__ior__`/`__iand__`/
// `__ixor__`/`__isub__` são as formas de método explícitas dos operadores
// aumentados já cobertos (`|=`, `&=`, `^=`, `-=`) e `__init__` reinicializa o
// conjunto (CPython `set_init`, limpa o conteúdo existente antes de
// reconstruir — setobject.c:2171-2192,
// https://github.com/python/cpython/blob/v3.13.0/Objects/setobject.c#L2170);
// as cinco são chamadas de método tão diretas quanto `clear()`/`add()`, e
// faltavam na lista de mutadores reconhecidos. Testado com e sem o parêntese
// redundante ao redor do nome, nas duas tabelas.
test("contract-evidence-formal5-residual __ior__/__iand__/__ixor__/__isub__/__init__ chamados diretamente mutam o conjunto, com ou sem parêntese ao redor do nome", () => {
  const DUNDER_CALLS = {
    __ior__: '.__ior__({"post_tool_call"})',
    __iand__: '.__iand__({"pre_tool_call"})',
    __ixor__: '.__ixor__({"pre_tool_call"})',
    __isub__: '.__isub__({"pre_tool_call"})',
    __init__: ".__init__()",
  };
  const WRAPS = {
    "sem parêntese": (name) => name,
    "com parêntese": (name) => `(${name})`,
  };
  for (const [dunder, call] of Object.entries(DUNDER_CALLS)) {
    for (const [wrapLabel, wrap] of Object.entries(WRAPS)) {
      const label = `${dunder}/${wrapLabel}`;
      const validHooksText = 'VALID_HOOKS = {"pre_tool_call"}\n' + wrap("VALID_HOOKS") + call + "\n";
      assert.equal(extractHermesValidHooks(validHooksText), null, `VALID_HOOKS/${label}`);

      const shellText = 'SHELL_UNSUPPORTED_HOOKS = {"pre_tool_call"}\n' + wrap("SHELL_UNSUPPORTED_HOOKS") + call + "\n";
      assert.equal(extractHermesShellUnsupportedHooks(shellText), null, `SHELL_UNSUPPORTED_HOOKS/${label}`);
    }
  }
});

test("contract-evidence-formal5-residual VALID_HOOKS.__init__() no arquivo da instalação vira state unrecognized, nunca found", async () => {
  const mutated = hermesPluginsSource({ extra: "VALID_HOOKS.__init__()\n" });
  const result = await readContractEvidence({
    agentId: "hermes",
    packageDir: PKG_DIR,
    fs: fsWithPlugins(mutated),
  });
  assert.equal(result.state, "unrecognized");
  assert.equal(result.mechanisms, undefined);
  assert.equal(result.validHooks, undefined);
});

// Último residual do achado formal5 (.checks/code-review/formal5-parentheses-
// fixes.md): `((VALID_HOOKS)).clear()` e `(\nVALID_HOOKS\n).clear()` são a
// mesma chamada direta `nome.mutator(args)` dos testes acima e ainda
// publicavam a lista anterior. O nome agrupado admite qualquer quantidade de
// parênteses redundantes e, dentro deles, a continuação implícita do Python
// (quebra de linha, CRLF, comentário). Matriz: catorze métodos mutadores ×
// duas tabelas; "sem parêntese" e "um par" são os controles já corrigidos.
const TABLE_EXTRACTORS = [
  ["VALID_HOOKS", extractHermesValidHooks],
  ["SHELL_UNSUPPORTED_HOOKS", extractHermesShellUnsupportedHooks],
];

const MUTATOR_CALL_ARGS = {
  add: '"post_tool_call"',
  discard: '"pre_tool_call"',
  remove: '"pre_tool_call"',
  clear: "",
  pop: "",
  update: '{"post_tool_call"}',
  difference_update: '{"pre_tool_call"}',
  intersection_update: '{"post_tool_call"}',
  symmetric_difference_update: '{"pre_tool_call"}',
  __ior__: '{"post_tool_call"}',
  __iand__: '{"post_tool_call"}',
  __ixor__: '{"pre_tool_call"}',
  __isub__: '{"pre_tool_call"}',
  __init__: "",
};

const GROUPED_MUTATIONS = {
  "sem parêntese (controle)": "NOME.METODO(ARGS)",
  "um par (controle)": "(NOME).METODO(ARGS)",
  "dois pares": "((NOME)).METODO(ARGS)",
  "três pares": "(((NOME))).METODO(ARGS)",
  "64 pares": `${"(".repeat(64)}NOME${")".repeat(64)}.METODO(ARGS)`,
  "quebra de linha dentro do par": "(\nNOME\n).METODO(ARGS)",
  "CRLF dentro do par": "(\r\nNOME\r\n).METODO(ARGS)",
  "comentário com ) dentro do par": "(NOME  # comentário com )\n).METODO(ARGS)",
  "comentário antes do nome, dentro do par": "(  # comentário\n    NOME\n).METODO(ARGS)",
  "pares aninhados em linhas diferentes": "(\n    (\n        NOME\n    )\n).METODO(ARGS)",
  "ponto depois de quebra, dentro do par externo": "((NOME)\n    .METODO(ARGS))",
  "método depois de quebra, dentro do par externo": "((NOME).\n    METODO(ARGS))",
  "parêntese da chamada depois de quebra, dentro do par externo": "((NOME).METODO\n    (ARGS))",
};

function groupedSource(template, table, method, args) {
  const statement = template.replaceAll("NOME", table).replaceAll("METODO", method).replaceAll("ARGS", args);
  return `${table} = {"pre_tool_call"}\n${statement}\n`;
}

test("contract-evidence-formal5-parens nome agrupado por qualquer quantidade de parênteses redundantes, com continuação implícita dentro deles, não escapa do filtro em nenhum mutador nem tabela", () => {
  const escaped = [];
  let checked = 0;
  for (const [table, extract] of TABLE_EXTRACTORS) {
    for (const [shape, template] of Object.entries(GROUPED_MUTATIONS)) {
      for (const [method, args] of Object.entries(MUTATOR_CALL_ARGS)) {
        checked += 1;
        const result = extract(groupedSource(template, table, method, args));
        if (result !== null) escaped.push(`${table}/${shape}/${method} -> ${JSON.stringify(result)}`);
      }
    }
  }
  assert.equal(checked, 2 * 13 * 14);
  assert.deepEqual(escaped, []);
});

// Controles: o mesmo agrupamento sem mutação da própria tabela continua sendo
// a forma reconhecida — consulta, pertinência, argumento de outra chamada e
// mutador de OUTRO objeto que só recebe o nome agrupado.
test("contract-evidence-formal5-parens nome agrupado em consulta, pertinência ou argumento continua reconhecido nas duas tabelas", () => {
  const GROUPED_QUERIES = {
    "consulta com dois pares": "((NOME)).copy()",
    "consulta multilinha com comentário": "(\n    NOME  # consulta\n).issubset(OUTRO)",
    "consulta depois de quebra, dentro do par externo": '((NOME)\n    .union({"x"}))',
    "nome agrupado como argumento": "print(sorted(((NOME))))",
    "pertinência em nome agrupado": 'ativo = "x" in ((NOME))',
    "mutador de outro objeto recebendo o nome agrupado": "OUTRO.update((NOME)); OUTRO.clear()",
  };
  for (const [table, extract] of TABLE_EXTRACTORS) {
    for (const [label, template] of Object.entries(GROUPED_QUERIES)) {
      const text = `${table} = {"pre_tool_call"}\n${template.replaceAll("NOME", table)}\n`;
      assert.deepEqual(extract(text), ["pre_tool_call"], `${table}/${label}`);
    }
  }
});

test("contract-evidence-formal5-parens forma agrupada no arquivo da instalação: VALID_HOOKS vira unrecognized; SHELL_UNSUPPORTED_HOOKS vira exclusões desconhecidas, nunca vazias", async () => {
  for (const extra of ["((VALID_HOOKS)).clear()\n", "(\n    VALID_HOOKS  # agrupado\n).clear()\n"]) {
    const result = await readContractEvidence({
      agentId: "hermes",
      packageDir: PKG_DIR,
      fs: fsWithPlugins(hermesPluginsSource({ extra })),
    });
    assert.equal(result.state, "unrecognized", extra);
    assert.equal(result.mechanisms, undefined, extra);
    assert.equal(result.validHooks, undefined, extra);
  }

  const shellMutated = await readContractEvidence({
    agentId: "hermes",
    packageDir: PKG_DIR,
    fs: fsWithPlugins(hermesPluginsSource({ extra: "(\n    (SHELL_UNSUPPORTED_HOOKS)\n).clear()\n" })),
  });
  assert.equal(shellMutated.state, "found");
  assert.equal(shellMutated.shellUnsupportedHooks, null);
});

// Redundância profunda dentro do limite de leitura do arquivo (1 MiB): a
// leitura percorre os parênteses sem recursão nem regex de retrocesso
// descontrolado — 262 mil pares em linhas separadas, ou 524 mil numa linha
// só, terminam com a mesma decisão das formas curtas. Sem orçamento de tempo.
test("contract-evidence-formal5-parens parênteses profundamente redundantes em texto de até 1 MiB: mutação recusada, consulta preservada", () => {
  const ONE_MIB = 1024 * 1024;
  const head = 'VALID_HOOKS = {"pre_tool_call"}\n';
  const linePairs = Math.floor((ONE_MIB - 64) / 4);
  const multiline = (call) => `${head}${"(\n".repeat(linePairs)}VALID_HOOKS${"\n)".repeat(linePairs)}${call}\n`;
  const inlinePairs = Math.floor((ONE_MIB - 64) / 2);
  const inline = `${head}${"(".repeat(inlinePairs)}VALID_HOOKS${")".repeat(inlinePairs)}.clear()\n`;
  const cases = {
    "multilinha .clear()": [multiline(".clear()"), null],
    "multilinha .copy()": [multiline(".copy()"), ["pre_tool_call"]],
    "linha única .clear()": [inline, null],
  };
  const observed = {};
  for (const [label, [text, expected]] of Object.entries(cases)) {
    assert.ok(Buffer.byteLength(text) <= ONE_MIB, `${label}: premissa de tamanho`);
    observed[label] = { expected, actual: extractHermesValidHooks(text) };
  }
  for (const [label, { expected, actual }] of Object.entries(observed)) {
    assert.deepEqual(actual, expected, `${label}: ${JSON.stringify(observed)}`);
  }
});

// Verificação independente 9 (.checks/code-review/formal5-grouped-binding-
// fixes.md): `(VALID_HOOKS) -= {"pre_tool_call"}` é a mesma atribuição
// aumentada da correção formal4, só com o alvo agrupado (single_target do
// CPython, ver helpers/grouped-augmented-targets.mjs), e publicava a lista
// anterior nas duas tabelas. Matriz: formas do alvo × treze operadores × duas
// tabelas.
test("contract-evidence-formal5-grouped-binding atribuição aumentada com o nome agrupado, em qualquer forma e operador, não confirma nenhuma das duas tabelas", () => {
  const escaped = [];
  let checked = 0;
  for (const [table, extract] of TABLE_EXTRACTORS) {
    for (const [shape, template] of Object.entries(GROUPED_AUGMENTED_TARGETS)) {
      for (const op of AUGMENTED_OPERATORS) {
        checked += 1;
        const statement = groupedAugmentedStatement(template, table, op, '{"pre_tool_call"}');
        const result = extract(`${table} = {"pre_tool_call"}\n${statement}\n`);
        if (result !== null) escaped.push(`${table}/${shape}/${op} -> ${JSON.stringify(result)}`);
      }
    }
  }
  assert.equal(checked, 2 * 12 * 13);
  assert.deepEqual(escaped, []);
});

// A proteção bruta (texto inteiro, inclusive strings: um exec() com o mesmo
// texto) já cobria `NOME OP=` para os operadores -= &= ^= |= +=; o alvo
// agrupado de uma linha entra na mesma classe. Os demais operadores seguem só
// na leitura por tokens, como antes.
test("contract-evidence-formal5-grouped-binding alvo agrupado de uma linha dentro de exec() também torna as duas tabelas não reconhecidas", () => {
  const escaped = [];
  let checked = 0;
  for (const [table, extract] of TABLE_EXTRACTORS) {
    for (const op of ["-=", "&=", "^=", "|=", "+="]) {
      for (const target of [`(${table})`, `(( ${table} ))`]) {
        checked += 1;
        const result = extract(`${table} = {"pre_tool_call"}\nexec("${target} ${op} {'pre_tool_call'}")\n`);
        if (result !== null) escaped.push(`${table}/${target}/${op} -> ${JSON.stringify(result)}`);
      }
    }
  }
  assert.equal(checked, 2 * 5 * 2);
  assert.deepEqual(escaped, []);
});

// Controles: o nome agrupado sem ligação da própria tabela continua sendo a
// forma reconhecida — comparação (operadores que também terminam em "="),
// subscrito de outro objeto, outra variável agrupada, e comentário/string com
// operador fora da proteção bruta. Com -= &= ^= |= += o texto bruto
// em comentário/string já tornava a tabela não reconhecida antes desta
// correção (ver o teste acima); por isso esses controles usam %= e *=.
test("contract-evidence-formal5-grouped-binding nome agrupado sem ligação da tabela continua reconhecido nas duas tabelas", () => {
  const CONTROLS = {
    "comparação ==": "IGUAL = (NOME) == OUTRO",
    "comparação !=": "DIFERENTE = (NOME) != OUTRO",
    "comparação <=": "SUBCONJUNTO = ((NOME)) <= OUTRO",
    "comparação >=": "SUPERCONJUNTO = (\n    NOME  # agrupado\n) >= OUTRO",
    "subscrito de outro objeto": "CONTAGEM[len((NOME))] += 1",
    "outra variável agrupada": '(OUTRO) -= {"pre_tool_call"}',
    "comentário com %=": '# (NOME) %= {"pre_tool_call"}',
    "string com *=": `EXEMPLO = '(NOME) *= {"pre_tool_call"}'`,
  };
  for (const [table, extract] of TABLE_EXTRACTORS) {
    for (const [label, template] of Object.entries(CONTROLS)) {
      const text = `${table} = {"pre_tool_call"}\n${template.replaceAll("NOME", table)}\n`;
      assert.deepEqual(extract(text), ["pre_tool_call"], `${table}/${label}`);
    }
  }
});

test("contract-evidence-formal5-grouped-binding alvo agrupado no arquivo da instalação: VALID_HOOKS vira unrecognized; SHELL_UNSUPPORTED_HOOKS vira exclusões desconhecidas, nunca a lista anterior", async () => {
  for (const extra of ['(VALID_HOOKS) -= {"pre_tool_call"}\n', '(\n    (VALID_HOOKS)  # agrupado\n) |= {"x"}\n']) {
    const result = await readContractEvidence({
      agentId: "hermes",
      packageDir: PKG_DIR,
      fs: fsWithPlugins(hermesPluginsSource({ extra })),
    });
    assert.equal(result.state, "unrecognized", extra);
    assert.equal(result.mechanisms, undefined, extra);
    assert.equal(result.validHooks, undefined, extra);
  }

  const shellMutated = await readContractEvidence({
    agentId: "hermes",
    packageDir: PKG_DIR,
    fs: fsWithPlugins(hermesPluginsSource({ extra: '(SHELL_UNSUPPORTED_HOOKS) -= {"transform_api_error_classification"}\n' })),
  });
  assert.equal(shellMutated.state, "found");
  assert.equal(shellMutated.shellUnsupportedHooks, null);
});

// Revisão formal6 (.checks/code-review/formal6-fixes.md): `case VALID_HOOKS:`
// depois de `match {"not_mapped"}:` substitui a tabela sem `=`, assim como o
// alvo agrupado de with; as duas tabelas publicavam a lista anterior.
test("contract-evidence-formal6-captures captura em padrão case ou no alvo de with não confirma nenhuma das duas tabelas", () => {
  const escaped = [];
  let checked = 0;
  for (const [table, extract] of TABLE_EXTRACTORS) {
    for (const [shape, template] of Object.entries({ ...CASE_CAPTURE_PATTERNS, ...WITH_CAPTURE_TARGETS })) {
      checked += 1;
      const statement = captureStatement(template, table, '{"not_mapped"}');
      const result = extract(`${table} = {"pre_tool_call"}\n${statement}\n`);
      if (result !== null) escaped.push(`${table}/${shape} -> ${JSON.stringify(result)}`);
    }
  }
  assert.equal(checked, 2 * (20 + 10));
  assert.deepEqual(escaped, []);
});

test("contract-evidence-formal6-captures guarda, subject, corpo, valor pontuado, classe, case/match comuns, contexto do with, comentário e string continuam reconhecidos nas duas tabelas", () => {
  for (const [table, extract] of TABLE_EXTRACTORS) {
    for (const [label, template] of Object.entries(CAPTURE_CONTROLS)) {
      const text = `${table} = {"pre_tool_call"}\n${captureStatement(template, table, '{"not_mapped"}')}\n`;
      assert.deepEqual(extract(text), ["pre_tool_call"], `${table}/${label}`);
    }
  }
});

test("contract-evidence-formal6-captures captura no arquivo da instalação: VALID_HOOKS vira unrecognized; SHELL_UNSUPPORTED_HOOKS vira exclusões desconhecidas, nunca a lista anterior", async () => {
  for (const extra of [
    'match {"not_mapped"}:\n    case VALID_HOOKS:\n        pass\n',
    "with C() as (VALID_HOOKS, outro):\n    pass\n",
  ]) {
    const result = await readContractEvidence({
      agentId: "hermes",
      packageDir: PKG_DIR,
      fs: fsWithPlugins(hermesPluginsSource({ extra })),
    });
    assert.equal(result.state, "unrecognized", extra);
    assert.equal(result.mechanisms, undefined, extra);
    assert.equal(result.validHooks, undefined, extra);
  }

  for (const extra of [
    'match {"x"}:\n    case SHELL_UNSUPPORTED_HOOKS:\n        pass\n',
    "with C() as [outro, SHELL_UNSUPPORTED_HOOKS]:\n    pass\n",
  ]) {
    const shellCaptured = await readContractEvidence({
      agentId: "hermes",
      packageDir: PKG_DIR,
      fs: fsWithPlugins(hermesPluginsSource({ extra })),
    });
    assert.equal(shellCaptured.state, "found", extra);
    assert.equal(shellCaptured.shellUnsupportedHooks, null, extra);
    assert.ok(shellCaptured.validHooks.includes("pre_tool_call"), extra);
  }
});

test("contract-evidence-C5 tabela com forma não reconhecida vira state unrecognized, sem eventos", async () => {
  const result = await readContractEvidence({
    agentId: "hermes",
    packageDir: PKG_DIR,
    fs: fsWithPlugins('VALID_HOOKS = {"pre_tool_call", *EXTRA}\n'),
  });
  assert.equal(result.state, "unrecognized");
  assert.equal(result.mechanisms, undefined);
});

// Residual G3 (rodada 4, .checks/code-review/verifier4-g3-shell-fix.md):
// `_parse_hooks_block` (agent/shell_hooks.py) recusa um evento de
// SHELL_UNSUPPORTED_HOOKS antes de checar VALID_HOOKS — pertencer ao
// catálogo geral de plugin hooks (C5, `mechanisms`) não implica que o Hermes
// registraria esse mesmo nome como shell hook. A tabela real
// (hermes_cli/plugins.py:208) lista `transform_api_error_classification` nas
// DUAS tabelas; a fixture positiva reproduz essa mesma forma.
test("contract-evidence-C5/G3 SHELL_UNSUPPORTED_HOOKS reconhecida ao lado de VALID_HOOKS, sem afetar mechanisms", async () => {
  const result = await readContractEvidence({
    agentId: "hermes",
    packageDir: PKG_DIR,
    fs: fsWithPlugins(hermesPluginsSource()),
  });
  assert.equal(result.state, "found");
  assert.deepEqual(result.shellUnsupportedHooks, ["transform_api_error_classification"]);
  assert.ok(result.validHooks.includes("transform_api_error_classification"));
  // C5 preservado: mechanisms/missingEvents inalterados pela exclusão de shell.
  for (const mechanism of MECHANISMS) {
    assert.deepEqual(result.mechanisms[mechanism].missingEvents, [], mechanism);
  }
});

test("contract-evidence-C5/G3 SHELL_UNSUPPORTED_HOOKS ausente, ilegível ou não reconhecida vira shellUnsupportedHooks null, sem derrubar o state found de VALID_HOOKS", async () => {
  const absent = await readContractEvidence({
    agentId: "hermes",
    packageDir: PKG_DIR,
    fs: fsWithPlugins(hermesPluginsSource({ shellUnsupportedHooksLine: "" })),
  });
  assert.equal(absent.state, "found");
  assert.equal(absent.shellUnsupportedHooks, null);
  assert.ok(Object.keys(absent.mechanisms).length > 0, "C5 continua disponível sem a tabela de exclusão");

  const unrecognizedForm = await readContractEvidence({
    agentId: "hermes",
    packageDir: PKG_DIR,
    fs: fsWithPlugins(
      hermesPluginsSource({
        shellUnsupportedHooksLine: 'SHELL_UNSUPPORTED_HOOKS = frozenset({"transform_api_error_classification"})\n',
      }),
    ),
  });
  assert.equal(unrecognizedForm.state, "found");
  assert.equal(unrecognizedForm.shellUnsupportedHooks, null);

  assert.equal(extractHermesShellUnsupportedHooks('SHELL_UNSUPPORTED_HOOKS -= {"x"}\nSHELL_UNSUPPORTED_HOOKS = {"x"}\n'), null);
  // Mesmo achado do teste acima para VALID_HOOKS: operador fora do padrão
  // textual de mutação ("-&^|+="), só pego pela ligação em findAssignments.
  assert.equal(extractHermesShellUnsupportedHooks('SHELL_UNSUPPORTED_HOOKS = {"x"}\nSHELL_UNSUPPORTED_HOOKS **= 2\n'), null);
});

test("contract-evidence-C5 plugins.py ausente, ilegível, acima de 1 MiB ou mutado nunca vira found", async () => {
  const missing = await readContractEvidence({ agentId: "hermes", packageDir: PKG_DIR, fs: fsWithPlugins() });
  assert.equal(missing.state, "not_found");

  const denied = fsWithPlugins(hermesPluginsSource());
  denied.injectFault(PLUGINS_PATH, "EACCES");
  const unreadable = await readContractEvidence({ agentId: "hermes", packageDir: PKG_DIR, fs: denied });
  assert.equal(unreadable.state, "unreadable");
  assert.equal(unreadable.errorCode, "EACCES");

  const marker = "CANARY-CONTRACT-OVERSIZED-41d0";
  const oversized = hermesPluginsSource({ extra: `# ${marker}\n# ${"x".repeat(1024 * 1024)}\n` });
  const tooLarge = await readContractEvidence({
    agentId: "hermes",
    packageDir: PKG_DIR,
    fs: fsWithPlugins(oversized),
  });
  assert.equal(tooLarge.state, "too_large");
  assert.doesNotMatch(JSON.stringify(tooLarge), new RegExp(marker));

  const content = Buffer.from(hermesPluginsSource());
  const mutating = {
    // isHermesPluginsModuleSelected (achado 2 da revisão formal8) confere a
    // precedência antes de abrir plugins.py: sem diretório plugins/ nem
    // extensão nativa — a verdade desta fixture —, stat/listDir só precisam
    // devolver "nada aqui", preservando o cenário de mutação original.
    async stat() {
      const error = new Error("ENOENT");
      error.code = "ENOENT";
      throw error;
    },
    async listDir() {
      return [];
    },
    async open() {
      return {
        async read(buffer, offset, length, position) {
          const bytesRead = Math.max(0, Math.min(length, content.length - position));
          if (bytesRead > 0) content.copy(buffer, offset, position, position + bytesRead);
          return { bytesRead };
        },
        async stat() {
          return { size: content.length + 9 };
        },
        async close() {},
      };
    },
  };
  const changed = await readContractEvidence({ agentId: "hermes", packageDir: PKG_DIR, fs: mutating });
  assert.equal(changed.state, "changed_during_read");
});

test("contract-evidence-C5 Claude e Codex não têm fonte textual de contrato nos layouts inspecionados", async () => {
  for (const agentId of ["claude", "codex"]) {
    const result = await readContractEvidence({
      agentId,
      packageDir: PKG_DIR,
      fs: fsWithPlugins(hermesPluginsSource()),
    });
    assert.deepEqual(result, { state: "no_static_source" }, agentId);
  }
});

test("contract-evidence-C5 Hermes sem pacote ligado ao launcher não procura tabela em lugar nenhum", async () => {
  const result = await readContractEvidence({
    agentId: "hermes",
    packageDir: null,
    fs: fsWithPlugins(hermesPluginsSource()),
  });
  assert.equal(result.state, "not_found");
  assert.equal(result.source, undefined);
});

// --- P2 nº2 da revisão formal8 (.checks/code-review/issue-3-formal8-
// response.json): hermes_cli.plugins pode resolver para um pacote/extensão/
// bytecode de MAIOR precedência do que o módulo plugins.py que esta leitura
// abre direto (CPython v3.13.0, `_bootstrap_external.py`,
// `FileFinder.find_spec` — pacote antes de módulo, extensão antes de fonte
// antes de bytecode em cada nível; texto primário em
// verifier12/bootstrap_external.py). O catálogo físico de plugins.py existe,
// mas não é o que o Hermes importaria: o estado vira "shadowed", sem ler o
// conteúdo nem conceder mechanisms/validHooks.
const PLUGINS_DIR = PKG_DIR + "/plugins";

function treeWithPluginsModule() {
  const tree = buildFsTree();
  addFile(tree, PKG_DIR, "plugins.py", hermesPluginsSource());
  return tree;
}

test("contract-evidence-formal8-2 pacote regular, extensão ou bytecode solto em plugins/__init__* tem precedência sobre plugins.py: state shadowed", async () => {
  const cases = {
    "pacote regular plugins/__init__.py": (tree) =>
      addFile(tree, PLUGINS_DIR, "__init__.py", 'VALID_HOOKS = {"post_tool_call"}\n'),
    "extensão plugins/__init__.so": (tree) => addFile(tree, PLUGINS_DIR, "__init__.so", "\0"),
    "bytecode solto plugins/__init__.pyc": (tree) => addFile(tree, PLUGINS_DIR, "__init__.pyc", "\0"),
  };
  for (const [label, install] of Object.entries(cases)) {
    const tree = treeWithPluginsModule();
    install(tree);
    const result = await readContractEvidence({
      agentId: "hermes",
      packageDir: PKG_DIR,
      fs: createFakeFsAdapter(tree),
    });
    assert.equal(result.state, "shadowed", label);
    assert.equal(result.mechanisms, undefined, label);
    assert.equal(result.validHooks, undefined, label);
    assert.deepEqual(result.source, { kind: "hermes_valid_hooks", path: PLUGINS_PATH }, label);
  }
});

test("contract-evidence-formal8-2 extensão plugins[.ABI].so/.pyd (módulo, sem diretório plugins) também precede plugins.py: state shadowed", async () => {
  const tree = treeWithPluginsModule();
  addFile(tree, PKG_DIR, "plugins.cpython-313-x86_64-linux-gnu.so", "\0");
  const result = await readContractEvidence({ agentId: "hermes", packageDir: PKG_DIR, fs: createFakeFsAdapter(tree) });
  assert.equal(result.state, "shadowed");
  assert.equal(result.mechanisms, undefined);
});

// Um diretório plugins/ sem nenhum __init__ é só porção de namespace (PEP
// 420): não impede o módulo regular plugins.py de ser a fonte.
test("contract-evidence-formal8-2 diretório plugins sem nenhum __init__ é só namespace: plugins.py continua a fonte (state found)", async () => {
  const tree = treeWithPluginsModule();
  addFile(tree, PLUGINS_DIR, "helper.py", "# não é __init__\n");
  const result = await readContractEvidence({ agentId: "hermes", packageDir: PKG_DIR, fs: createFakeFsAdapter(tree) });
  assert.equal(result.state, "found");
  assert.ok(result.validHooks.includes("pre_tool_call"));
});

test("contract-evidence-formal8-2 controle de nome: extensão com nome diferente no mesmo diretório não sombreia plugins.py", async () => {
  const tree = treeWithPluginsModule();
  addFile(tree, PKG_DIR, "plugins_extra.so", "\0");
  addFile(tree, PKG_DIR, "outro.so", "\0");
  const result = await readContractEvidence({ agentId: "hermes", packageDir: PKG_DIR, fs: createFakeFsAdapter(tree) });
  assert.equal(result.state, "found");
});

test("contract-evidence-formal8-2 sufixo maiúsculo (.PYD) em plugins/__init__ ou plugins (módulo) sombreia no Windows com platform:'win32'; sem platform ou em POSIX, mantém plugins.py", async () => {
  const cases = {
    "plugins/__init__.PYD": (tree) => addFile(tree, PLUGINS_DIR, "__init__.PYD", "\0"),
    "plugins.PYD (módulo)": (tree) => addFile(tree, PKG_DIR, "plugins.PYD", "\0"),
  };
  for (const [label, install] of Object.entries(cases)) {
    const tree = treeWithPluginsModule();
    install(tree);
    const fs = createFakeFsAdapter(tree);

    const shadowedOnWindows = await readContractEvidence({
      agentId: "hermes",
      packageDir: PKG_DIR,
      fs,
      platform: "win32",
    });
    assert.equal(shadowedOnWindows.state, "shadowed", `${label}/win32`);

    const posixControl = await readContractEvidence({ agentId: "hermes", packageDir: PKG_DIR, fs, platform: "linux" });
    assert.equal(posixControl.state, "found", `${label}/linux`);

    const noPlatformControl = await readContractEvidence({ agentId: "hermes", packageDir: PKG_DIR, fs });
    assert.equal(noPlatformControl.state, "found", `${label}/sem platform`);
  }
});

// --- Achado 1 da conferência root do delta formal8
// (.checks/code-review/formal8-root-feedback.md): isHermesPluginsModuleSelected
// (achado 2 do formal8, acima) ficava ANTES do try/catch de readHermesContract
// que já existe para readBoundedText. stat/listDir negados (EACCES/EIO)
// *nessa checagem de precedência* (não na leitura do próprio plugins.py,
// já coberta pelo teste "plugins.py ausente, ilegível...") escapavam como
// rejeição não capturada por nenhum caller — runDiagnostics perdia o
// relatório inteiro em vez de só este contrato virar "unreadable", como já
// acontece para falha de leitura. Reprodução mínima confirmada pelo root:
// readContractEvidence({agentId:'hermes', packageDir:'/fixture/hermes_cli',
// platform:'linux', fs:{stat: async () => { throw erroEACCES }}}) rejeita.
test("contract-evidence-formal8-root-1 stat negado (EACCES/EIO) no diretório plugins/ durante a checagem de precedência vira unreadable, nunca uma rejeição", async () => {
  for (const code of ["EACCES", "EIO"]) {
    const fs = fsWithPlugins(hermesPluginsSource());
    fs.injectFault(PKG_DIR + "/plugins", code);
    const result = await readContractEvidence({ agentId: "hermes", packageDir: PKG_DIR, fs, platform: "linux" });
    assert.equal(result.state, "unreadable", code);
    assert.equal(result.errorCode, code, code);
    assert.deepEqual(result.source, { kind: "hermes_valid_hooks", path: PLUGINS_PATH }, code);
  }
});

// Mesma checagem, segunda chamada de fs (listDir): packageDir é sempre
// consultado por hasCompiledSibling para o módulo plugins[.ABI].so/.pyd,
// mesmo quando plugins/ não existe (pluginsDirStats fica null, ENOENT
// engolido como "nada aqui" — só o controle abaixo prova que ENOENT
// continua tratado assim, nunca como rejeição). wrapFsMethodFault isola
// listDir(packageDir) sem afetar stat(pluginsDir), chamado antes no mesmo
// caminho-prefixo: injectFault por si só não distingue método, só caminho.
test("contract-evidence-formal8-root-1 listDir negado (EACCES/EIO) em packageDir durante a checagem de precedência vira unreadable, nunca uma rejeição", async () => {
  for (const code of ["EACCES", "EIO"]) {
    const fs = wrapFsMethodFault(fsWithPlugins(hermesPluginsSource()), "listDir", PKG_DIR, code);
    const result = await readContractEvidence({ agentId: "hermes", packageDir: PKG_DIR, fs, platform: "linux" });
    assert.equal(result.state, "unreadable", code);
    assert.equal(result.errorCode, code, code);
  }
});

// listDir negado no PRÓPRIO diretório plugins/ (ramo só alcançado quando
// plugins/ existe como diretório — aqui, um namespace sem nenhum __init__,
// mesmo layout do teste formal8-2 "só namespace" acima). stat(pluginsDir)
// precisa continuar respondendo normal (isDirectory: true) para o fluxo
// chegar ao listDir isolado abaixo.
test("contract-evidence-formal8-root-1 listDir negado (EACCES/EIO) no diretório plugins/ (namespace) durante a checagem de precedência vira unreadable, nunca uma rejeição", async () => {
  for (const code of ["EACCES", "EIO"]) {
    const tree = treeWithPluginsModule();
    addFile(tree, PLUGINS_DIR, "helper.py", "# não é __init__\n");
    const fs = wrapFsMethodFault(createFakeFsAdapter(tree), "listDir", PLUGINS_DIR, code);
    const result = await readContractEvidence({ agentId: "hermes", packageDir: PKG_DIR, fs, platform: "linux" });
    assert.equal(result.state, "unreadable", code);
    assert.equal(result.errorCode, code, code);
  }
});

// Controle: sem nenhum fault injetado, a mesma checagem de precedência vê
// ENOENT em stat(plugins/) e listDir(packageDir) — continua "found", nunca
// "unreadable" nem rejeição. Mesmo fixture exato dos três testes acima.
test("contract-evidence-formal8-root-1 controle: ausência real (ENOENT) na checagem de precedência continua found, nunca unreadable", async () => {
  const result = await readContractEvidence({
    agentId: "hermes",
    packageDir: PKG_DIR,
    fs: fsWithPlugins(hermesPluginsSource()),
    platform: "linux",
  });
  assert.equal(result.state, "found");
  assert.ok(result.validHooks.includes("pre_tool_call"));
});
