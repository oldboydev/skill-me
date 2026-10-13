import { detectSeparator, joinGeneric } from "./launcher-link/path-helpers.mjs";
import {
  endsStatement,
  findAssignments,
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
// mesmo texto, por exemplo), a tabela não é reconhecida.
const RUNTIME_MUTATION =
  /VALID_HOOKS[ \t]*[-&^|+]=|VALID_HOOKS\.(?:add|discard|remove|clear|pop|update|difference_update|intersection_update|symmetric_difference_update)\s*\(/;
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

// Lê o literal de conjunto atribuído a VALID_HOOKS no nível do módulo, só
// como texto (python-source.mjs): comentários, docstrings e demais strings
// não são código, então uma atribuição citada nelas não conta. Exige
// exatamente uma ligação do nome em código, e que seja essa atribuição; outra
// ligação (reatribuição, `:=`, desempacotamento, import) ou qualquer mutação
// do conjunto torna a forma não reconhecida — o literal deixaria de ser o
// conjunto efetivo em tempo de execução. Devolve a lista de nomes ou null.
export function extractHermesValidHooks(text) {
  if (RUNTIME_MUTATION.test(text)) return null;
  const tokens = tokenizePython(text);
  if (tokens === null) return null;
  const sites = findAssignments(tokens, "VALID_HOOKS");
  if (sites.length !== 1 || !sites[0].moduleLevel) return null;
  return readStringSetStatement(tokens, sites[0].valueIndex);
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

// A tabela fica em hermes_cli/plugins.py do MESMO pacote de onde a versão foi
// lida (packageDir, resolvido a partir do launcher): a doc local do Hermes
// declara que a validade dos nomes de evento vem de
// hermes_cli.plugins.VALID_HOOKS, e o parser de shell hooks
// (agent/shell_hooks.py) usa a mesma tabela como allow-list. O arquivo é lido
// limitado a 1 MiB, nunca importado.
async function readHermesContract(packageDir, fs) {
  if (!packageDir) return { state: "not_found" };
  const source = {
    kind: HERMES_CONTRACT_SOURCE_KIND,
    path: joinGeneric(detectSeparator(packageDir), packageDir, "plugins.py"),
  };
  let read;
  try {
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
  return { state: "found", source, mechanisms: mechanismsFromListedEvents(listed), validHooks: listed };
}

// Claude (claude.exe nativo) e Codex (codex.exe nativo dentro do pacote npm,
// sem schema ou tabela de eventos em texto) não trazem, nos layouts
// inspecionados, um artefato textual de contrato legível dentro de 1 MiB;
// varrer strings de binários de centenas de MB não seria uma fonte
// reconhecida. A lacuna fica explícita como no_static_source.
export async function readContractEvidence({ agentId, packageDir, fs }) {
  if (agentId === "hermes") return readHermesContract(packageDir, fs);
  return { state: "no_static_source" };
}
