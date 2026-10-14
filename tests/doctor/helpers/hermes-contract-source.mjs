// Fonte sintética de `hermes_cli/plugins.py` com a mesma FORMA da tabela que
// a instalação real do Hermes 0.21.4 traz: atribuição anotada no nível do
// módulo, literal de conjunto de strings, comentários entre os itens que
// contêm aspas, chaves e dicionários de exemplo, e um segundo conjunto
// (SHELL_UNSUPPORTED_HOOKS) logo depois. Os nomes listados são um subconjunto
// sintético; não é cópia do arquivo real nem prova a máquina do usuário.
//
// `transform_api_error_classification` pertence às DUAS tabelas, como na
// instalação real: VALID_HOOKS (contrato geral de plugin hooks, C5) E
// SHELL_UNSUPPORTED_HOOKS (recusado como shell hook por `_parse_hooks_block`
// antes mesmo de checar VALID_HOOKS). Uma fixture que listasse o nome só em
// SHELL_UNSUPPORTED_HOOKS esconderia o caso real que a correção residual de
// G3 cobre (achado `.checks/code-review/verifier4-g3-shell-fix.md`).
export const HERMES_MAPPED_EVENTS = Object.freeze([
  "pre_tool_call",
  "post_tool_call",
  "on_session_start",
  "on_session_end",
  "on_skill_lifecycle",
  "subagent_start",
  "subagent_stop",
]);

const UNMAPPED_EVENTS = [
  "transform_tool_result",
  "pre_llm_call",
  "post_llm_call",
  "pre_command",
  "transform_api_error_classification",
];

const SHELL_UNSUPPORTED_HOOKS_LINE =
  '# Hooks cuja diretiva o parser de shell hooks não tem como devolver: {"x"}\n' +
  'SHELL_UNSUPPORTED_HOOKS: Set[str] = {"transform_api_error_classification"}\n';

// `shellUnsupportedHooksLine` troca a segunda tabela por outra forma (string
// vazia simula o arquivo sem essa tabela — versão sem a restrição, ou leitor
// que não a reconhece; uma forma não reconhecida simula o mesmo "não
// reconhecida" sem remover a tabela). Default: a forma real reconhecida.
export function hermesPluginsSource({ omit = [], extra = "", shellUnsupportedHooksLine } = {}) {
  const listed = [...HERMES_MAPPED_EVENTS, ...UNMAPPED_EVENTS].filter((name) => !omit.includes(name));
  const items = listed.map((name, index) => {
    const comment =
      index % 3 === 0
        ? `    # exemplo: retorne {"action": "block", "message": "x"} ou 'None' — não é item\n`
        : "";
    return `${comment}    "${name}",\n`;
  });
  return (
    '"""Plugins do Hermes (fixture sintética)."""\n' +
    "from typing import Set\n" +
    "\n" +
    "VALID_HOOKS: Set[str] = {\n" +
    items.join("") +
    "}\n" +
    "\n" +
    (shellUnsupportedHooksLine ?? SHELL_UNSUPPORTED_HOOKS_LINE) +
    extra
  );
}

function replaceOnce(text, from, to) {
  if (!text.includes(from)) throw new Error(`fixture: trecho ausente: ${JSON.stringify(from)}`);
  return text.replace(from, to);
}

// Formas que um leitor só textual confundiria com a tabela (pré-revisão
// formal). Cada uma deriva da fonte completa acima, com todos os eventos
// mapeados escritos, para que só a FORMA explique a recusa — nunca a falta de
// um evento: (a) duas strings adjacentes sem vírgula, que o Python concatena
// numa string só; (b) diferença de conjuntos depois do literal, que retira
// pre_tool_call em tempo de execução; (c) o bloco inteiro dentro da docstring
// do módulo, sem nenhuma atribuição em código.
export function hermesPluginsLookalikeSources() {
  const source = hermesPluginsSource();
  return {
    "strings adjacentes sem vírgula": replaceOnce(source, '"pre_tool_call",\n', '"pre_tool_call"\n'),
    "expressão de diferença depois do literal": replaceOnce(
      source,
      "}\n\n#",
      '} - {"pre_tool_call"}\n\n#',
    ),
    "atribuição dentro da docstring do módulo": replaceOnce(
      replaceOnce(source, '(fixture sintética)."""\n', "(fixture sintética).\n\n"),
      "}\n\n#",
      '}\n"""\n\n#',
    ),
  };
}
