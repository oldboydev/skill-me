import { detectSeparator, joinGeneric } from "./launcher-link/path-helpers.mjs";
import { compiledModuleSuffixPattern, fileExists, hasCompiledSibling } from "./launcher-link/compiled-sibling.mjs";
import {
  endsStatement,
  findAssignments,
  indexAfterGroupedName,
  isOp,
  simpleStringValue,
  tokenizePython,
} from "./python-source.mjs";
import { readBoundedText } from "./snapshot-read.mjs";

const ONE_MIB_BYTES = 1024 * 1024;

// Eventos de hook que sustentam cada mecanismo da matriz no Hermes, segundo o
// catálogo de plugin hooks da documentação do Hermes ("Shipped plugin-hook
// catalog", https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks):
// on_skill_lifecycle é a mudança de estado de uso de skill; pre/post_tool_call
// cercam cada chamada de ferramenta e post_tool_call carrega resultado/erro;
// on_session_start/on_session_end marcam sessão e fim de turno;
// subagent_start/subagent_stop cercam cada subagente. O mapeamento é uma
// decisão do doctor; os nomes que comprovam o contrato vêm da tabela que a
// própria instalação traz, nunca desta lista.
const HERMES_EVENTS_BY_MECHANISM = Object.freeze({
  skill_usage_signal: ["on_skill_lifecycle"],
  tool_calls: ["pre_tool_call", "post_tool_call"],
  results_and_errors: ["post_tool_call"],
  session_turn: ["on_session_start", "on_session_end"],
  subagents: ["subagent_start", "subagent_stop"],
});

const HERMES_CONTRACT_SOURCE_KIND = "hermes_valid_hooks";
// Procurado no texto bruto, inclusive em strings: na dúvida (um exec() com o
// mesmo texto, por exemplo), a tabela não é reconhecida. Parametrizado pelo
// nome porque o mesmo arquivo traz duas tabelas de conjunto reconhecidas por
// esta leitura (VALID_HOOKS e SHELL_UNSUPPORTED_HOOKS, ver
// extractHermesShellUnsupportedHooks abaixo).
//
// Achado formal5 (nº1): `NOME.clear(` exigia o ponto imediatamente após o
// nome, mas espaço, tab ou continuação lógica (`\` + quebra de linha) entre
// nome/ponto e entre método/parêntese são Python tão válidos quanto a forma
// sem separador — `VALID_HOOKS .clear()` escapava do filtro. Continua regex
// sobre texto bruto (não token) para preservar a mesma proteção contra
// mutação escondida em string/exec já documentada acima.
//
// Achado formal5 residual (.checks/code-review/formal5-residual-fixes.md):
// `__ior__`/`__iand__`/`__ixor__`/`__isub__` (formas de método dos operadores
// aumentados já cobertos: `|=`, `&=`, `^=`, `-=`) e `__init__` (reinicializa/
// limpa o conjunto — CPython `set_init`, setobject.c:2171-2192,
// https://github.com/python/cpython/blob/v3.13.0/Objects/setobject.c#L2170)
// são a mesma família de métodos mutadores diretos, só com nomes diferentes.
//
// Nome agrupado (.checks/code-review/formal5-parentheses-fixes.md): qualquer
// quantidade de parênteses redundantes ao redor do nome é a mesma chamada
// direta. Aqui basta o nome seguido de qualquer sequência de `)`: os `(` que
// abrem o grupo não mudam a decisão. Quebra de linha e comentário dentro do
// grupo (continuação implícita) ficam com callsMutatorDirectly, sobre tokens:
// um comentário nesta regex não ancorada custaria tempo quadrático numa linha
// longa de 1 MiB. Casar demais aqui nunca é menos seguro: qualquer
// correspondência a mais só reforça o lado conservador (tabela tratada como
// não reconhecida) — inclusive `f(NOME).clear()`, que muta o resultado de f.
//
// Alvo agrupado (.checks/code-review/formal5-grouped-binding-fixes.md):
// `(NOME) -= {...}` é a mesma atribuição aumentada, então a alternativa
// `OP=` aceita o mesmo grupo de `)` da chamada. Em código, a ligação vem de
// findAssignments (python-source.mjs), com os treze operadores.
const PY_TOKEN_SEP = String.raw`(?:[ \t]|\\\r?\n)*`;
const PY_CLOSING_GROUP_SEP = String.raw`(?:[ \t)]|\\\r?\n)*`;
const SET_MUTATOR_METHODS = [
  "add", "discard", "remove", "clear", "pop", "update",
  "difference_update", "intersection_update", "symmetric_difference_update",
  "__ior__", "__iand__", "__ixor__", "__isub__", "__init__",
];
function runtimeMutationPattern(name) {
  return new RegExp(
    `${name}${PY_CLOSING_GROUP_SEP}(?:[-&^|+]=|\\.${PY_TOKEN_SEP}(?:${SET_MUTATOR_METHODS.join("|")})${PY_TOKEN_SEP}\\()`,
  );
}

// A mesma chamada direta lida em código: o tokenizer já descarta espaço,
// quebra de linha dentro de colchetes, comentário e continuação com "\", e
// recusa o arquivo com colchetes desbalanceados. Percorre a lista uma vez,
// sem recursão, qualquer que seja a profundidade do grupo.
function callsMutatorDirectly(tokens, name) {
  return tokens.some((token, k) => {
    if (token.type !== "name" || token.value !== name) return false;
    const next = indexAfterGroupedName(tokens, k);
    const method = tokens[next + 1];
    return (
      isOp(tokens[next], ".") &&
      method?.type === "name" &&
      SET_MUTATOR_METHODS.includes(method.value) &&
      isOp(tokens[next + 2], "(")
    );
  });
}
const EVENT_NAME = /^[a-z_][a-z0-9_]*$/;

// `{ "a", "b", }` — strings simples separadas por vírgula (a final é
// opcional) e nada depois do "}" na instrução. Duas strings sem vírgula
// entre elas são UMA string para o Python (concatenação implícita), e um
// operador depois do literal (`- {...}`) muda o conjunto: nenhum dos dois é a
// forma reconhecida. `{}` é um dict, não um conjunto.
function readStringSetStatement(tokens, start) {
  if (!isOp(tokens[start], "{")) return null;
  const names = [];
  let expectItem = true;
  let k = start + 1;
  for (; !isOp(tokens[k], "}"); k += 1) {
    const value = simpleStringValue(tokens[k]);
    if (expectItem && value !== null) {
      names.push(value);
      expectItem = false;
    } else if (!expectItem && isOp(tokens[k], ",")) {
      expectItem = true;
    } else {
      return null;
    }
  }
  if (names.length === 0 || !endsStatement(tokens[k + 1])) return null;
  return names.every((name) => EVENT_NAME.test(name)) ? names : null;
}

// Lê o literal de conjunto atribuído a `name` no nível do módulo, só como
// texto (python-source.mjs): comentários, docstrings e demais strings não são
// código, então uma atribuição citada nelas não conta. Exige exatamente uma
// ligação do nome em código, e que seja essa atribuição; outra ligação
// (reatribuição, `:=`, desempacotamento, import) ou qualquer mutação do
// conjunto torna a forma não reconhecida — o literal deixaria de ser o
// conjunto efetivo em tempo de execução. Devolve a lista de nomes ou null.
function extractTopLevelStringSet(text, name) {
  if (runtimeMutationPattern(name).test(text)) return null;
  const tokens = tokenizePython(text);
  if (tokens === null || callsMutatorDirectly(tokens, name)) return null;
  const sites = findAssignments(tokens, name);
  if (sites.length !== 1 || !sites[0].moduleLevel) return null;
  return readStringSetStatement(tokens, sites[0].valueIndex);
}

export function extractHermesValidHooks(text) {
  return extractTopLevelStringSet(text, "VALID_HOOKS");
}

// `agent/shell_hooks.py:_parse_hooks_block` recusa um evento listado em
// SHELL_UNSUPPORTED_HOOKS ANTES de testar presença em VALID_HOOKS: pertencer
// ao catálogo geral de plugin hooks (usado pelos mecanismos de C5) não basta
// para que o Hermes registre um shell hook de `config.yaml` — são duas
// superfícies do mesmo agente. A tabela fica no mesmo `plugins.py`, lida do
// mesmo texto já obtido para VALID_HOOKS (nenhuma leitura extra). Ausência,
// forma não reconhecida ou mutação devolvem null: nunca um conjunto vazio
// presumido, que esconderia uma exclusão real não lida.
export function extractHermesShellUnsupportedHooks(text) {
  return extractTopLevelStringSet(text, "SHELL_UNSUPPORTED_HOOKS");
}

function mechanismsFromListedEvents(listed) {
  const listedSet = new Set(listed);
  const mechanisms = {};
  for (const [mechanism, events] of Object.entries(HERMES_EVENTS_BY_MECHANISM)) {
    mechanisms[mechanism] = {
      events: [...events],
      missingEvents: events.filter((event) => !listedSet.has(event)),
    };
  }
  return mechanisms;
}

const COMPILED_PLUGINS_INIT_NAME = compiledModuleSuffixPattern("__init__");
const COMPILED_PLUGINS_MODULE_NAME = compiledModuleSuffixPattern("plugins");

// `hermes_cli.plugins` pode resolver para outra coisa além do módulo
// `plugins.py` que esta leitura abre: o FileFinder do CPython procura
// primeiro um PACOTE `plugins/` (extensão `__init__[.ABI].so/.pyd`, depois
// fonte `__init__.py`, depois bytecode solto `__init__.pyc`, nessa ordem) e
// só cai para um MÓDULO de mesmo nome (extensão `plugins[.ABI].so/.pyd`,
// depois `plugins.py`) quando `plugins/` não existe ou é só porção de
// namespace sem nenhum desses três (PEP 420; CPython v3.13.0,
// `_bootstrap_external.py`, `FileFinder.find_spec` — pacote antes de módulo,
// extensão antes de fonte antes de bytecode em cada nível; texto primário já
// lido em verifier12/bootstrap_external.py). Reutiliza o mesmo scanner de
// hermes.mjs (hasCompiledSibling/fileExists, ver compiled-sibling.mjs) em vez
// de duplicar a guarda; nenhum bytecode de MÓDULO (`plugins.pyc`) é
// verificado aqui porque fonte sempre precede bytecode nesse mesmo nível —
// só importa quando `plugins.py` já está ausente, caso em que o estado
// "not_found" de baixo já é o resultado correto sem distinção adicional.
async function isHermesPluginsModuleSelected(packageDir, fs, platform) {
  const sep = detectSeparator(packageDir);
  const pluginsDir = joinGeneric(sep, packageDir, "plugins");
  let pluginsDirStats = null;
  try {
    pluginsDirStats = await fs.stat(pluginsDir);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (pluginsDirStats?.isDirectory?.()) {
    if (await hasCompiledSibling(pluginsDir, COMPILED_PLUGINS_INIT_NAME, fs, platform)) return false;
    if (await fileExists(joinGeneric(sep, pluginsDir, "__init__.py"), fs)) return false;
    if (await fileExists(joinGeneric(sep, pluginsDir, "__init__.pyc"), fs)) return false;
    // Sem nenhum dos três, `plugins/` é só porção de namespace: a busca
    // continua para o módulo de mesmo nome, como um diretório hermes_cli
    // sem __init__ não impede o pacote regular em mayImportBeforeSitePackages.
  }
  return !(await hasCompiledSibling(packageDir, COMPILED_PLUGINS_MODULE_NAME, fs, platform));
}

// A tabela fica em hermes_cli/plugins.py do MESMO pacote de onde a versão foi
// lida (packageDir, resolvido a partir do launcher): a doc local do Hermes
// declara que a validade dos nomes de evento vem de
// hermes_cli.plugins.VALID_HOOKS, e o parser de shell hooks
// (agent/shell_hooks.py) usa a mesma tabela como allow-list. O arquivo é lido
// limitado a 1 MiB, nunca importado.
async function readHermesContract(packageDir, fs, platform) {
  if (!packageDir) return { state: "not_found" };
  const source = {
    kind: HERMES_CONTRACT_SOURCE_KIND,
    path: joinGeneric(detectSeparator(packageDir), packageDir, "plugins.py"),
  };
  let read;
  try {
    // `plugins.py` só é a fonte de hermes_cli.plugins quando nada de maior
    // precedência existe: sem essa checagem, um catálogo preterido podia
    // conceder confiança que o módulo efetivo não sustenta (revisão formal8,
    // achado 2). Nenhuma leitura de conteúdo acontece quando preterido — só a
    // listagem/stat já usados por isHermesPluginsModuleSelected.
    //
    // Precisa ficar DENTRO desta mesma barreira de erro (conferência root do
    // delta formal8, achado 1, .checks/code-review/formal8-root-feedback.md):
    // stat/listDir negados aqui (EACCES/EIO) são a mesma classe de falha de
    // leitura que já vira "unreadable" logo abaixo. Fora do try, a rejeição
    // escapava sem captura por nenhum caller (runDiagnostics incluso),
    // derrubando o relatório inteiro por uma única checagem de precedência.
    if (!(await isHermesPluginsModuleSelected(packageDir, fs, platform))) {
      return { state: "shadowed", source };
    }
    read = await readBoundedText(source.path, { fs, maxBytes: ONE_MIB_BYTES });
  } catch (error) {
    return { state: "unreadable", source, errorCode: error.code ?? "unknown_error" };
  }
  if (read.state === "missing") return { state: "not_found", source };
  if (read.state === "too_large") return { state: "too_large", source };
  if (read.state === "changed_during_read") return { state: "changed_during_read", source };
  const listed = extractHermesValidHooks(read.text);
  if (listed === null) return { state: "unrecognized", source };
  // `validHooks`: os nomes crus da tabela (não só os mapeados por mecanismo),
  // consumidos por config-reader.mjs para decidir se um evento configurado
  // pelo usuário é registrado pelo Hermes instalado (achado G3 da rodada 3).
  // `shellUnsupportedHooks`: nomes refusados pelo parser de shell hooks apesar
  // de listados em VALID_HOOKS (achado G3, variante residual da rodada 4) —
  // `null` quando a tabela de exclusão não pôde ser lida/reconhecida deste
  // MESMO texto; nunca afeta `mechanisms`/`validHooks` (C5 preservado).
  return {
    state: "found",
    source,
    mechanisms: mechanismsFromListedEvents(listed),
    validHooks: listed,
    shellUnsupportedHooks: extractHermesShellUnsupportedHooks(read.text),
  };
}

// Claude (claude.exe nativo) e Codex (codex.exe nativo dentro do pacote npm,
// sem schema ou tabela de eventos em texto) não trazem, nos layouts
// inspecionados, um artefato textual de contrato legível dentro de 1 MiB;
// varrer strings de binários de centenas de MB não seria uma fonte
// reconhecida. A lacuna fica explícita como no_static_source.
export async function readContractEvidence({ agentId, packageDir, fs, platform = null }) {
  if (agentId === "hermes") return readHermesContract(packageDir, fs, platform);
  return { state: "no_static_source" };
}
