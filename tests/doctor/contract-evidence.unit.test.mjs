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
  extractHermesValidHooks,
  readContractEvidence,
} from "../../src/doctor/contract-evidence.mjs";
import { MECHANISMS } from "../../src/doctor/capability-matrix.mjs";
import {
  hermesPluginsLookalikeSources,
  hermesPluginsSource,
} from "./helpers/hermes-contract-source.mjs";
import { addFile, buildFsTree, createFakeFsAdapter } from "./helpers/fake-fs-adapter.mjs";

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

test("contract-evidence-C5 tabela com forma não reconhecida vira state unrecognized, sem eventos", async () => {
  const result = await readContractEvidence({
    agentId: "hermes",
    packageDir: PKG_DIR,
    fs: fsWithPlugins('VALID_HOOKS = {"pre_tool_call", *EXTRA}\n'),
  });
  assert.equal(result.state, "unrecognized");
  assert.equal(result.mechanisms, undefined);
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
