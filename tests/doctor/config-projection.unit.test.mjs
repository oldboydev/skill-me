// C8 (parte de "configuration") e C14 — projectConfig decide o estado de um
// único arquivo de configuração e produz a projeção segura de campos. A
// decisão de "trust" não mora aqui (ver trust-resolution.unit.test.mjs):
// nenhum campo arbitrário do arquivo (ex.: um "trust" inventado por quem
// escreveu o YAML/JSON) é capaz de se autoautorizar, porque esta função
// nunca projeta uma chave fora do conjunto seguro abaixo.
import assert from "node:assert/strict";
import test from "node:test";
import { projectConfig, ONE_MIB_BYTES } from "../../src/doctor/config-projection.mjs";
import { CANARY } from "./helpers/fixture-configs.mjs";

const AGENT_BY_FORMAT = { json: "claude", toml: "codex", yaml: "hermes" };

const CONFIGURATION_STATES = new Set([
  "configured",
  "not_configured",
  "disabled",
  "invalid",
  "unknown",
]);

const SAFE_FIELD_KEYS = [
  "hasHooksSection",
  "disableAllHooks",
  "allowManagedHooksOnly",
  "featuresHooksEnabled",
  "hooksAutoAccept",
  "hermesTargetedEvents",
];

function assertShape(result) {
  assert.ok(CONFIGURATION_STATES.has(result.configuration), result.configuration);
  assert.equal(typeof result.reasonCode, "string");
  for (const key of Object.keys(result.fields ?? {}))
    assert.ok(SAFE_FIELD_KEYS.includes(key), key);
}

test("config-projection-C8 settings.json estilo Claude com hooks definidos fica configured", () => {
  const result = projectConfig({
    rawText: JSON.stringify({
      hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "x" }] }] },
    }),
    format: "json",
    agentId: "claude",
  });
  assertShape(result);
  assert.equal(result.configuration, "configured");
  assert.equal(result.fields.hasHooksSection, true);
});

// Forma nativa do Codex em config.toml (doc "Hooks", "Equivalent inline TOML
// in config.toml"): evento como array of tables de grupos, com os handlers
// em `[[hooks.<Evento>.hooks]]`. A fixture anterior (`PreToolUse = [{ command
// = "x" }]`, sem grupo nem `hooks`) não era a forma documentada.
test("config-projection-C8 config.toml estilo Codex com [[hooks.PreToolUse]] definido fica configured", () => {
  const result = projectConfig({
    rawText:
      '[[hooks.PreToolUse]]\nmatcher = "^Bash$"\n\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\n',
    format: "toml",
    agentId: "codex",
  });
  assertShape(result);
  assert.equal(result.configuration, "configured");
  assert.equal(result.fields.hasHooksSection, true);
});

// `agent:start` é evento de gateway hook (HOOK.yaml), não de shell hook em
// config.yaml; a fixture usa um evento real de shell hook.
test("config-projection-C8 config.yaml estilo Hermes com bloco hooks fica configured", () => {
  const result = projectConfig({
    rawText: 'hooks:\n  pre_tool_call:\n    - command: "internal-safe-handler"\n',
    format: "yaml",
    agentId: "hermes",
  });
  assertShape(result);
  assert.equal(result.configuration, "configured");
});

test("config-projection-C8 disableAllHooks true (Claude) vira disabled, nunca configured", () => {
  const result = projectConfig({
    rawText: JSON.stringify({ hooks: { PreToolUse: [] }, disableAllHooks: true }),
    format: "json",
    agentId: "claude",
  });
  assertShape(result);
  assert.equal(result.configuration, "disabled");
  assert.equal(result.reasonCode, "hooks_disabled");
});

test("config-projection-C8 features.hooks=false (Codex) vira disabled", () => {
  const result = projectConfig({
    rawText: "[features]\nhooks = false\n[hooks]\nPreToolUse = []\n",
    format: "toml",
    agentId: "codex",
  });
  assertShape(result);
  assert.equal(result.configuration, "disabled");
  assert.equal(result.reasonCode, "features_hooks_disabled");
});

// Achados bloqueantes da segunda revisão formal (.checks/code-review/issue-3/
// response.json, AC3/AC5): `codex_hooks` é o alias depreciado de
// `features.hooks` para a MESMA feature (legacy.rs, rust-v0.162.1: `Alias {
// legacy_key: "codex_hooks", feature: Feature::CodexHooks }`; `feature.key()
// == "hooks"` em lib.rs).
test("config-projection-C8 features.codex_hooks=false (alias depreciado) vira disabled, igual a features.hooks", () => {
  const result = projectConfig({
    rawText: "[features]\ncodex_hooks = false\n[hooks]\nPreToolUse = []\n",
    format: "toml",
    agentId: "codex",
  });
  assertShape(result);
  assert.equal(result.configuration, "disabled");
  assert.equal(result.reasonCode, "features_hooks_disabled");
  assert.equal(result.fields.featuresHooksEnabled, false);
});

// As entradas de `[features]` achatam num único `BTreeMap<String, bool>`
// (FeaturesToml::entries/apply_map, lib.rs); a iteração alfabética aplica
// "codex_hooks" antes de "hooks", e a canônica, aplicada por último,
// sobrescreve a legada — nunca um OR de "false" entre as duas chaves.
test("config-projection-C8 features.hooks e features.codex_hooks coexistindo: a chave canônica decide, nos dois sentidos", () => {
  const canonicalTrueAliasFalse = projectConfig({
    rawText: "[features]\nhooks = true\ncodex_hooks = false\n[hooks]\nPreToolUse = []\n",
    format: "toml",
    agentId: "codex",
  });
  assertShape(canonicalTrueAliasFalse);
  assert.equal(canonicalTrueAliasFalse.fields.featuresHooksEnabled, true);
  assert.notEqual(canonicalTrueAliasFalse.configuration, "disabled");

  const canonicalFalseAliasTrue = projectConfig({
    rawText: "[features]\nhooks = false\ncodex_hooks = true\n[hooks]\nPreToolUse = []\n",
    format: "toml",
    agentId: "codex",
  });
  assertShape(canonicalFalseAliasTrue);
  assert.equal(canonicalFalseAliasTrue.fields.featuresHooksEnabled, false);
  assert.equal(canonicalFalseAliasTrue.configuration, "disabled");
  assert.equal(canonicalFalseAliasTrue.reasonCode, "features_hooks_disabled");
});

test("config-projection-C8 arquivo sem seção hooks fica not_configured, mesmo com outras chaves", () => {
  const result = projectConfig({
    rawText: JSON.stringify({ theme: "dark" }),
    format: "json",
    agentId: "claude",
  });
  assertShape(result);
  assert.equal(result.configuration, "not_configured");
});

test("config-projection-C8 ausência de arquivo (rawText null) fica not_configured", () => {
  const result = projectConfig({ rawText: null, format: "yaml", agentId: "hermes" });
  assertShape(result);
  assert.equal(result.configuration, "not_configured");
  assert.deepEqual(result.fields, {});
});

test("config-projection-C8 config malformada vira invalid, nunca derruba o processo", () => {
  for (const [rawText, format] of [
    ["hooks:\n  enabled: [true\n  broken: }\n", "yaml"],
    ["[hooks\nenabled = true\n", "toml"],
    ["{ não é json", "json"],
  ]) {
    const result = projectConfig({ rawText, format, agentId: AGENT_BY_FORMAT[format] });
    assertShape(result);
    assert.equal(result.configuration, "invalid", format);
  }
});

test("config-projection-C14 YAML com tag perigosa não executa nem interpola ambiente", () => {
  const result = projectConfig({
    rawText:
      'hooks:\n  pre_tool_call:\n    - command: !!js/function "function () { return 1; }"\n  path: "${HOME}/.secrets"\n',
    format: "yaml",
    agentId: "hermes",
  });
  assert.equal(result.configuration, "invalid");
  assert.equal(result.reasonCode, "unsafe_yaml_tag");
  assert.doesNotMatch(JSON.stringify(result.fields ?? {}), /\$\{HOME\}/);
  assert.doesNotMatch(
    JSON.stringify(result.fields ?? {}),
    /function\s*\(\)\s*{\s*return 1/,
  );
});

test("config-projection-C14 projeção só permite o conjunto seguro de metadados, nunca comandos/credenciais/prompt", () => {
  const result = projectConfig({
    rawText: `hooks:\n  pre_tool_call:\n    - command: "curl -H 'Authorization: ${CANARY}' https://example.invalid"\ncredential: "${CANARY}"\nprompt: "${CANARY}"\n`,
    format: "yaml",
    agentId: "hermes",
  });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, new RegExp(CANARY));
  assertShape(result);
});

test("config-projection-C2-trust um campo arbitrário 'trust' no arquivo nunca é projetado (não é consentimento nativo)", () => {
  const result = projectConfig({
    rawText: JSON.stringify({
      hooks: { PreToolUse: [{ hooks: [{ type: "command", command: "x" }] }] },
      trust: "trusted",
      trusted: true,
    }),
    format: "json",
    agentId: "claude",
  });
  assert.equal(result.configuration, "configured");
  assert.ok(!("trust" in result.fields), JSON.stringify(result.fields));
  assert.ok(!("trusted" in result.fields), JSON.stringify(result.fields));
});

test("config-projection-C14 arquivo acima de 1 MiB vira unknown/input_too_large sem copiar conteúdo", () => {
  const marker = "CANARY-OVERSIZED-9f21";
  const oversized = `[hooks]\nmarker = "${marker}"\n`.padEnd(ONE_MIB_BYTES + 1, " ");
  assert.ok(Buffer.byteLength(oversized, "utf8") > ONE_MIB_BYTES);
  const result = projectConfig({ rawText: oversized, format: "toml", agentId: "codex" });
  assert.equal(result.configuration, "unknown");
  assert.equal(result.reasonCode, "input_too_large");
  assert.doesNotMatch(JSON.stringify(result), new RegExp(marker));
});

test("config-projection-C14 arquivo exatamente no limite de 1 MiB ainda é processado normalmente", () => {
  const atLimit = '[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\n'.padEnd(
    ONE_MIB_BYTES,
    " ",
  );
  assert.equal(Buffer.byteLength(atLimit, "utf8"), ONE_MIB_BYTES);
  const result = projectConfig({ rawText: atLimit, format: "toml", agentId: "codex" });
  assert.notEqual(result.reasonCode, "input_too_large");
});

// --- Forma nativa da seção de hooks por agente (achado formal 6) ---
// JSON/TOML/YAML sintaticamente válidos podem trazer uma seção `hooks` que o
// agente não consegue usar. Cada agente é validado pela própria forma
// documentada/implementada; comandos nunca são validados nem executados.

function invalidStructure(rawText, format, agentId) {
  const result = projectConfig({ rawText, format, agentId });
  assertShape(result);
  assert.equal(result.configuration, "invalid", `${agentId}: ${rawText}`);
  assert.equal(result.reasonCode, "hooks_structure_invalid", `${agentId}: ${rawText}`);
  assert.deepEqual(result.fields, {}, `${agentId}: nada projetado de uma seção inválida`);
}

test("config-projection-C8 Claude: exemplos formais hooks:{PreToolUse:42} e hooks:[\"invalid\"] viram invalid/hooks_structure_invalid", () => {
  invalidStructure(JSON.stringify({ hooks: { PreToolUse: 42 } }), "json", "claude");
  invalidStructure(JSON.stringify({ hooks: ["invalid"] }), "json", "claude");
});

test("config-projection-C8 Claude: grupo sem lista hooks, handler sem type string ou matcher não string são inválidos", () => {
  for (const hooks of [
    { PreToolUse: [{ matcher: "Bash" }] },
    { PreToolUse: [{ matcher: "Bash", hooks: "x" }] },
    { PreToolUse: [{ hooks: [{ command: "x" }] }] },
    { PreToolUse: [{ hooks: ["x"] }] },
    { PreToolUse: [{ matcher: 7, hooks: [{ type: "command", command: "x" }] }] },
    { PreToolUse: ["x"] },
    "texto",
  ]) {
    invalidStructure(JSON.stringify({ hooks }), "json", "claude");
  }
});

// A forma de `PreToolUse = [{ command = "x" }]` deixou de estar aqui: não é
// um grupo fora de forma, é um grupo sem a chave `hooks` (default nativo
// vazio) — ver o teste dedicado logo abaixo e Landing "grupo sem hooks no
// Codex" (achado 1 da pré-revisão formal da rodada 3).
test("config-projection-C8 Codex: hooks.json e config.toml com forma diferente da documentada são inválidos", () => {
  invalidStructure(JSON.stringify({ hooks: { PreToolUse: 42 } }), "json", "codex");
  invalidStructure(JSON.stringify({ hooks: [{ hooks: [] }] }), "json", "codex");
  invalidStructure("[hooks]\nPreToolUse = 42\n", "toml", "codex");
  invalidStructure('[[hooks.PreToolUse]]\nhooks = ["x"]\n', "toml", "codex");
});

// Achado 1 da pré-revisão formal da rodada 3: `MatcherGroup` do Codex
// (hook_config.rs, rust-v0.162.1) declara `#[serde(default)]` em `hooks` e
// não tem `deny_unknown_fields`; um grupo sem a chave `hooks` deserializa com
// `hooks: []` (válido, zero handlers) e uma chave estranha ao lado (ex.:
// `command`) é ignorada, não rejeitada. A fixture anterior tratava isso como
// `invalid` — hipótese errada da preparação (seção 11 do build, decisão 6),
// corrigida aqui. Claude preserva a exigência atual: a doc não declara um
// default equivalente para esse campo e não há código acessível que o
// confirme, então "preservar quando o campo é obrigatório" aqui significa
// "quando não há fonte que prove o contrário".
test("config-projection-C8 Codex: grupo sem a chave hooks é válido e vazio (MatcherGroup#[serde(default)]), nunca conta como handler", () => {
  for (const [rawText, format] of [
    ['[hooks]\nPreToolUse = [{ command = "x" }]\n', "toml"],
    [JSON.stringify({ hooks: { PreToolUse: [{ command: "x" }] } }), "json"],
    ['[[hooks.PreToolUse]]\nmatcher = "^Bash$"\n', "toml"],
  ]) {
    const result = projectConfig({ rawText, format, agentId: "codex" });
    assertShape(result);
    assert.equal(result.configuration, "not_configured", rawText);
    assert.equal(result.fields.hasHooksSection, false, rawText);
  }
  // Ao lado de um grupo real no mesmo evento, o grupo sem `hooks` continua
  // vazio (não invalida o arquivo) e o handler do outro grupo ainda conta.
  const mixed = projectConfig({
    rawText: JSON.stringify({
      hooks: { PreToolUse: [{ command: "noise" }, { hooks: [{ type: "command", command: "x" }] }] },
    }),
    format: "json",
    agentId: "codex",
  });
  assert.equal(mixed.configuration, "configured");
});

test("config-projection-C8 Hermes: hooks não mapeamento, evento não lista ou entrada sem command são inválidos", () => {
  invalidStructure("hooks:\n  - invalid\n", "yaml", "hermes");
  invalidStructure("hooks:\n  pre_tool_call: 42\n", "yaml", "hermes");
  invalidStructure("hooks:\n  pre_tool_call:\n    command: x\n", "yaml", "hermes");
  invalidStructure('hooks:\n  pre_tool_call:\n    - matcher: "terminal"\n', "yaml", "hermes");
  invalidStructure('hooks:\n  pre_tool_call:\n    - command: "   "\n', "yaml", "hermes");
  invalidStructure("hooks:\n  pre_tool_call:\n    - just-a-string\n", "yaml", "hermes");
});

test("config-projection-C8 vazio válido e chaves reservadas nativas continuam válidos e not_configured", () => {
  const cases = [
    [JSON.stringify({ hooks: {} }), "json", "claude"],
    [JSON.stringify({ hooks: null }), "json", "claude"],
    // Registro de revisão que o próprio Codex escreve sob [hooks] (observado
    // em config.toml local; só cabeçalhos lidos): não é evento.
    ["[hooks.state.'C:/u/.codex/hooks.json:pre_tool_use:0:0']\n", "toml", "codex"],
    ["hooks:\n", "yaml", "hermes"],
    // Subseções reservadas que o parser do Hermes pula (output_spill, outbound).
    ["hooks:\n  outbound:\n    url: https://example.invalid\n", "yaml", "hermes"],
  ];
  for (const [rawText, format, agentId] of cases) {
    const result = projectConfig({ rawText, format, agentId });
    assertShape(result);
    assert.equal(result.configuration, "not_configured", `${agentId}: ${rawText}`);
    assert.notEqual(result.reasonCode, "hooks_structure_invalid", `${agentId}: ${rawText}`);
  }
});

test("config-projection-C8 forma nativa válida ao lado das chaves reservadas continua configured; null no Hermes é evento sem entradas", () => {
  const codex = projectConfig({
    rawText:
      "[hooks.state.'x:pre_tool_use:0:0']\n\n[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = \"command\"\ncommand = \"x\"\n",
    format: "toml",
    agentId: "codex",
  });
  assert.equal(codex.configuration, "configured");
  const hermes = projectConfig({
    rawText: 'hooks:\n  outbound: {}\n  pre_tool_call:\n    - command: "x"\n      matcher: 42\n      timeout: "abc"\n  post_tool_call:\n',
    format: "yaml",
    agentId: "hermes",
  });
  // matcher/timeout inválidos são ignorados com aviso pelo próprio Hermes
  // (_parse_single_entry), então não tornam a seção inválida.
  assert.equal(hermes.configuration, "configured");
});

// --- Handlers: alvo obrigatório por tipo (pré-revisão da forma nativa) ---
// Fontes: Claude "Hook handler fields" (type obrigatório; command, url,
// server+tool ou prompt conforme o tipo) e o código do Codex na tag
// rust-v0.162.1 (hook_config.rs: enum etiquetado por `type`, `command`
// obrigatório, `command_windows` opcional; discovery.rs: alvo vazio e
// prompt/agent pulados). Ver .checks/issue-3-agent-diagnostics.build.md, seção 11.

function withHandlers(handlers) {
  return JSON.stringify({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: handlers }] } });
}

function projectHandlers(agentId, handlers, platform = "linux") {
  return projectConfig({ rawText: withHandlers(handlers), format: "json", agentId, platform });
}

test("config-projection-C8 Claude: handler de tipo conhecido sem o campo obrigatório (ou com outro tipo de valor) é inválido, nunca configured", () => {
  for (const handler of [
    { type: "command" },
    { type: "command", command: 7 },
    { type: "command", args: ["x"] },
    { type: "http" },
    { type: "http", url: { href: "https://example.invalid" } },
    { type: "mcp_tool", server: "s" },
    { type: "mcp_tool", tool: "t" },
    { type: "prompt" },
    { type: "agent", prompt: ["x"] },
    { type: "", command: "x" },
  ]) {
    invalidStructure(withHandlers([handler]), "json", "claude");
  }
  // Um handler com alvo ao lado não salva a seção.
  invalidStructure(withHandlers([{ type: "command", command: "x" }, { type: "command" }]), "json", "claude");
});

test("config-projection-C8 Codex: handler sem type, ou de tipo conhecido sem campo obrigatório, é inválido (hooks.json e config.toml)", () => {
  for (const handler of [
    {},
    { command: "x" },
    { type: 7, command: "x" },
    { type: "command" },
    { type: "command", command_windows: "x.cmd" },
    { type: "command", command: ["x"] },
    { type: "command", command: "x", command_windows: 7 },
    { type: "command", command: "x", commandWindows: "a.cmd", command_windows: "b.cmd" },
    { type: "mcp_tool", server: "s" },
    { type: "mcp_tool", server: "s", tool: 1 },
  ]) {
    invalidStructure(withHandlers([handler]), "json", "codex");
  }
  invalidStructure("[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\n", "toml", "codex");
  invalidStructure('[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\n', "toml", "codex");
});

test("config-projection-C8 handler sem alvo é válido mas não conta: alvo vazio, e prompt/agent no Codex (lidos e pulados)", () => {
  for (const [agentId, handler] of [
    ["claude", { type: "command", command: "   " }],
    ["claude", { type: "http", url: "" }],
    ["claude", { type: "mcp_tool", server: "s", tool: " " }],
    ["claude", { type: "agent", prompt: "" }],
    ["codex", { type: "command", command: "" }],
    ["codex", { type: "mcp_tool", server: "", tool: "t" }],
    ["codex", { type: "prompt" }],
    ["codex", { type: "agent", prompt: "x" }],
  ]) {
    const result = projectHandlers(agentId, [handler]);
    const label = `${agentId}: ${JSON.stringify(handler)}`;
    assertShape(result);
    assert.equal(result.configuration, "not_configured", label);
    assert.equal(result.reasonCode, "no_config_found", label);
    assert.equal(result.fields.hasHooksSection, false, label);
  }
  const mixed = projectHandlers("codex", [{ type: "prompt" }, { type: "command", command: "x" }]);
  assert.equal(mixed.configuration, "configured");
});

test("config-projection-C8 Codex usa o comando efetivo da plataforma: command_windows no Windows, command nos demais", () => {
  const onlyWindows = [{ type: "command", command: "", command_windows: "x.cmd" }];
  assert.equal(projectHandlers("codex", onlyWindows, "win32").configuration, "configured");
  assert.equal(projectHandlers("codex", onlyWindows, "linux").configuration, "not_configured");
  const onlyPosix = [{ type: "command", command: "x", commandWindows: "  " }];
  assert.equal(projectHandlers("codex", onlyPosix, "win32").configuration, "not_configured");
  assert.equal(projectHandlers("codex", onlyPosix, "darwin").configuration, "configured");
});

test("config-projection-C8 tipo de handler não reconhecido fica unknown/hooks_handler_type_unrecognized, nunca configured", () => {
  for (const [agentId, handlers] of [
    ["claude", [{ type: "future_kind", target: CANARY }]],
    ["claude", [{ type: "command", command: "x" }, { type: "future_kind" }]],
    ["codex", [{ type: "future_kind" }]],
    // `http` é tipo do Claude; o Codex instalado só conhece command,
    // mcp_tool, prompt e agent.
    ["codex", [{ type: "http", url: "https://example.invalid" }]],
  ]) {
    const result = projectHandlers(agentId, handlers);
    const label = `${agentId}: ${JSON.stringify(handlers)}`;
    assertShape(result);
    assert.equal(result.configuration, "unknown", label);
    assert.equal(result.reasonCode, "hooks_handler_type_unrecognized", label);
    assert.deepEqual(result.fields, {}, label);
    assert.doesNotMatch(JSON.stringify(result), new RegExp(CANARY), label);
  }
  // Campo obrigatório ausente num tipo conhecido é inválido, mesmo ao lado
  // de um tipo não reconhecido.
  invalidStructure(withHandlers([{ type: "future_kind" }, { type: "command" }]), "json", "claude");
});

test("config-projection-C8 cada tipo conhecido com o alvo obrigatório fica configured, com opções válidas preservadas", () => {
  for (const handler of [
    { type: "command", command: "x", args: ["a"], timeout: 30, async: true, shell: "bash" },
    { type: "http", url: "https://example.invalid/hook", headers: { A: "b" } },
    { type: "mcp_tool", server: "s", tool: "t", input: {} },
    { type: "prompt", prompt: "x", model: "m" },
    { type: "agent", prompt: "x" },
  ]) {
    assert.equal(projectHandlers("claude", [handler]).configuration, "configured", JSON.stringify(handler));
  }
  for (const handler of [
    { type: "command", command: "x", timeout: 30, statusMessage: "s", async: false },
    { type: "command", command: "x", command_windows: "x.cmd" },
    { type: "command", command: "x", commandWindows: "x.cmd" },
    { type: "mcp_tool", server: "s", tool: "t", input: { a: "b" } },
  ]) {
    for (const platform of ["win32", "linux"]) {
      const label = `${platform}: ${JSON.stringify(handler)}`;
      assert.equal(projectHandlers("codex", [handler], platform).configuration, "configured", label);
    }
  }
});

test("config-projection-C8 evento sem handler é válido e não conta para configured", () => {
  for (const [rawText, format, agentId] of [
    [JSON.stringify({ hooks: { PreToolUse: [] } }), "json", "claude"],
    [JSON.stringify({ hooks: { PreToolUse: [{ matcher: "*", hooks: [] }] } }), "json", "claude"],
    ["[hooks]\nPreToolUse = []\n", "toml", "codex"],
    ['[[hooks.PreToolUse]]\nmatcher = "^Bash$"\nhooks = []\n', "toml", "codex"],
    ["hooks:\n  pre_tool_call:\n", "yaml", "hermes"],
    ["hooks:\n  pre_tool_call: []\n", "yaml", "hermes"],
  ]) {
    const result = projectConfig({ rawText, format, agentId, platform: "linux" });
    assertShape(result);
    assert.equal(result.configuration, "not_configured", `${agentId}: ${rawText}`);
    assert.equal(result.fields.hasHooksSection, false, `${agentId}: ${rawText}`);
  }
});

test("config-projection-C8 Codex: managed_dir e windows_managed_dir sob [hooks] são campos nativos reservados, não eventos nem configuração", () => {
  const managedOnly =
    "[hooks]\nmanaged_dir = \"/enterprise/hooks\"\nwindows_managed_dir = 'C:\\enterprise\\hooks'\n";
  const withEvent =
    managedOnly +
    '\n[[hooks.PreToolUse]]\nmatcher = "^Bash$"\n\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "/enterprise/hooks/pre.sh"\n';
  const hooksJson = JSON.stringify({
    hooks: { managed_dir: "/enterprise/hooks", windows_managed_dir: "C:/enterprise/hooks" },
  });
  for (const platform of ["win32", "linux"]) {
    const onlyDirs = projectConfig({ rawText: managedOnly, format: "toml", agentId: "codex", platform });
    assertShape(onlyDirs);
    assert.equal(onlyDirs.configuration, "not_configured", platform);
    assert.equal(onlyDirs.reasonCode, "no_config_found", platform);
    assert.deepEqual(onlyDirs.fields, { hasHooksSection: false }, platform);

    const json = projectConfig({ rawText: hooksJson, format: "json", agentId: "codex", platform });
    assert.equal(json.configuration, "not_configured", platform);

    const events = projectConfig({ rawText: withEvent, format: "toml", agentId: "codex", platform });
    assert.equal(events.configuration, "configured", platform);
    assert.equal(events.reasonCode, "hooks_configured", platform);
  }
});

test("config-projection-C8 Codex: managed_dir/windows_managed_dir fora do tipo string são inválidos", () => {
  invalidStructure("[hooks]\nmanaged_dir = 42\n", "toml", "codex");
  invalidStructure('[hooks]\nwindows_managed_dir = ["C:/x"]\n', "toml", "codex");
  invalidStructure('[hooks.managed_dir]\npath = "/x"\n', "toml", "codex");
  invalidStructure(JSON.stringify({ hooks: { windows_managed_dir: 7 } }), "json", "codex");
});

// --- Achado bloqueante da segunda revisão formal: envelope de hooks.json ---
// `HooksFile` (hook_config.rs, rust-v0.162.1): `#[serde(deny_unknown_fields)]`
// na raiz, `description: Option<String>`, `hooks: HookEventsToml` (default só
// na AUSÊNCIA da chave). Só se aplica a hooks.json (json do Codex); nunca a
// config.toml (raiz própria) nem a Claude/Hermes (schemas de raiz distintos).

test("config-projection-C8 Codex hooks.json: description=42 com handler válido vira invalid/hooks_file_envelope_invalid", () => {
  const result = projectConfig({
    rawText: JSON.stringify({
      description: 42,
      hooks: { PreToolUse: [{ hooks: [{ type: "command", command: "x" }] }] },
    }),
    format: "json",
    agentId: "codex",
  });
  assertShape(result);
  assert.equal(result.configuration, "invalid");
  assert.equal(result.reasonCode, "hooks_file_envelope_invalid");
  assert.deepEqual(result.fields, {});
});

test("config-projection-C8 Codex hooks.json: campo desconhecido na raiz (evento fora de hooks) vira invalid/hooks_file_envelope_invalid", () => {
  const result = projectConfig({
    rawText: JSON.stringify({ SessionStart: [{ hooks: [{ type: "command", command: "x" }] }] }),
    format: "json",
    agentId: "codex",
  });
  assertShape(result);
  assert.equal(result.configuration, "invalid");
  assert.equal(result.reasonCode, "hooks_file_envelope_invalid");
});

test("config-projection-C8 Codex hooks.json: hooks=null é tipo errado (HookEventsToml não é Option), vira invalid/hooks_file_envelope_invalid", () => {
  const result = projectConfig({ rawText: JSON.stringify({ hooks: null }), format: "json", agentId: "codex" });
  assertShape(result);
  assert.equal(result.configuration, "invalid");
  assert.equal(result.reasonCode, "hooks_file_envelope_invalid");
});

test("config-projection-C8 Codex hooks.json: raiz que não é objeto (array/string/número) vira invalid/hooks_file_envelope_invalid", () => {
  for (const rawText of [JSON.stringify(["x"]), JSON.stringify("x"), JSON.stringify(42)]) {
    const result = projectConfig({ rawText, format: "json", agentId: "codex" });
    assertShape(result);
    assert.equal(result.configuration, "invalid", rawText);
    assert.equal(result.reasonCode, "hooks_file_envelope_invalid", rawText);
  }
});

test("config-projection-C8 Codex hooks.json: description ausente/nulo/string e hooks ausente/vazio continuam fora do envelope inválido", () => {
  for (const content of [
    {},
    { description: null },
    { description: "gate de revisão" },
    { hooks: {} },
    { description: "gate", hooks: { PreToolUse: [] } },
  ]) {
    const result = projectConfig({ rawText: JSON.stringify(content), format: "json", agentId: "codex" });
    assertShape(result);
    assert.notEqual(result.reasonCode, "hooks_file_envelope_invalid", JSON.stringify(content));
  }
});

test("config-projection-C8 Claude settings.json (mesmo formato json) não herda a whitelist de raiz do HooksFile do Codex", () => {
  const result = projectConfig({
    rawText: JSON.stringify({
      description: 42,
      hooks: { PreToolUse: [{ hooks: [{ type: "command", command: "x" }] }] },
    }),
    format: "json",
    agentId: "claude",
  });
  assertShape(result);
  assert.equal(result.configuration, "configured");
});

test("config-projection-C8 Codex config.toml (mesmo agente, formato toml) não passa pelo envelope de hooks.json", () => {
  const result = projectConfig({
    rawText: "[hooks]\nPreToolUse = []\n",
    format: "toml",
    agentId: "codex",
  });
  assertShape(result);
  assert.notEqual(result.reasonCode, "hooks_file_envelope_invalid");
});

// --- Achado bloqueante da segunda revisão formal: null aninhado no input de mcp_tool ---
// `deserialize_mcp_tool_input` (hook_config.rs) tenta `toml::Value::try_from`
// sobre o mapa inteiro: TOML não tem `null`, então QUALQUER profundidade de
// objeto/array com `null` falha a deserialização, não só o container externo
// (hooks_tests.rs, `hooks_file_rejects_mcp_tool_handler_with_null_input`).

test("config-projection-C8 Codex: input do mcp_tool com null aninhado em objeto/array (qualquer profundidade) invalida o documento, nunca configured", () => {
  for (const input of [
    { optional: null },
    { metadata: { optional: null } },
    { values: [null] },
    { a: { b: { c: [{ d: null }] } } },
  ]) {
    invalidStructure(
      withHandlers([{ type: "mcp_tool", server: "s", tool: "t", input }]),
      "json",
      "codex",
    );
  }
});

test("config-projection-C8 Codex: input do mcp_tool sem null em nenhuma profundidade continua configured, dados aninhados preservados", () => {
  const handler = {
    type: "mcp_tool",
    server: "s",
    tool: "t",
    input: {
      file_path: "${tool_input.file_path}",
      include_ignored: false,
      nested: { ok: true, list: [1, "a", true] },
    },
  };
  assert.equal(projectHandlers("codex", [handler]).configuration, "configured", JSON.stringify(handler));
});

// --- Achado 2 da pré-revisão formal da rodada 3: nomes de evento ---
// Fontes: `HookEventsToml` (hook_config.rs, rust-v0.162.1, 12 campos
// renomeados) e https://learn.chatgpt.com/docs/hooks para o Codex; seção
// "Hook Events" de https://code.claude.com/docs/en/hooks (33 nomes) para o
// Claude. Ver Landing "Nomes de evento não validados".

test("config-projection-C8 chave de hooks que não é um evento nativo nunca conta, mesmo com handler válido (Claude e Codex)", () => {
  for (const [agentId, rawText, format] of [
    [
      "claude",
      JSON.stringify({ hooks: { NotAnEvent: [{ hooks: [{ type: "command", command: "x" }] }] } }),
      "json",
    ],
    [
      "codex",
      JSON.stringify({ hooks: { NotAnEvent: [{ hooks: [{ type: "command", command: "x" }] }] } }),
      "json",
    ],
    ["codex", '[[hooks.NotAnEvent]]\n[[hooks.NotAnEvent.hooks]]\ntype = "command"\ncommand = "x"\n', "toml"],
  ]) {
    const result = projectConfig({ rawText, format, agentId });
    assertShape(result);
    assert.equal(result.configuration, "unknown", `${agentId}: ${rawText}`);
    assert.equal(result.reasonCode, "hooks_event_name_unrecognized", `${agentId}: ${rawText}`);
    assert.deepEqual(result.fields, {}, `${agentId}: ${rawText}`);
  }
  // Ao lado de um evento reconhecido com handler real, a chave desconhecida
  // ainda impede "configured" — "unknown" nunca cede a "configured".
  const mixed = projectConfig({
    rawText: JSON.stringify({
      hooks: {
        PreToolUse: [{ hooks: [{ type: "command", command: "x" }] }],
        NotAnEvent: [{ hooks: [{ type: "command", command: "y" }] }],
      },
    }),
    format: "json",
    agentId: "codex",
  });
  assert.equal(mixed.configuration, "unknown");
  assert.equal(mixed.reasonCode, "hooks_event_name_unrecognized");
});

// discovery.rs (rust-v0.162.1): um handler mcp_tool sob o evento SessionEnd é
// lido e pulado com aviso ("SessionEnd MCP hooks are not supported"), antes
// mesmo de checar server/tool vazios — mesmo tratamento que prompt/agent.
test("config-projection-C8 Codex: mcp_tool sob SessionEnd é lido e pulado (nunca conta), igual a prompt/agent", () => {
  const result = projectConfig({
    rawText: JSON.stringify({
      hooks: { SessionEnd: [{ hooks: [{ type: "mcp_tool", server: "s", tool: "t" }] }] },
    }),
    format: "json",
    agentId: "codex",
  });
  assertShape(result);
  assert.equal(result.configuration, "not_configured");
  assert.equal(result.fields.hasHooksSection, false);
  // mcp_tool malformado sob SessionEnd continua invalid: a restrição de
  // evento não mascara um campo obrigatório ausente (a checagem de tipo é
  // anterior, na própria deserialização).
  invalidStructure(
    JSON.stringify({ hooks: { SessionEnd: [{ hooks: [{ type: "mcp_tool", server: "s" }] }] } }),
    "json",
    "codex",
  );
  // mcp_tool válido em outro evento continua contando normalmente.
  const other = projectConfig({
    rawText: JSON.stringify({
      hooks: { PreToolUse: [{ hooks: [{ type: "mcp_tool", server: "s", tool: "t" }] }] },
    }),
    format: "json",
    agentId: "codex",
  });
  assert.equal(other.configuration, "configured");
});

// Doc do Claude ("Hook handler fields" / SessionStart): "Only type: 'command'
// and type: 'mcp_tool' hooks are supported" — sem código acessível que
// confirme o efeito real de um tipo diferente ali, então fica inconclusivo
// (unknown), nunca configured por suposição.
test("config-projection-C8 Claude: http/prompt/agent sob SessionStart ficam unknown/hooks_handler_type_unsupported_for_event (doc só confirma command/mcp_tool)", () => {
  for (const handler of [
    { type: "http", url: "https://example.invalid" },
    { type: "prompt", prompt: "x" },
    { type: "agent", prompt: "x" },
  ]) {
    const result = projectConfig({
      rawText: JSON.stringify({ hooks: { SessionStart: [{ hooks: [handler] }] } }),
      format: "json",
      agentId: "claude",
    });
    assertShape(result);
    assert.equal(result.configuration, "unknown", JSON.stringify(handler));
    assert.equal(result.reasonCode, "hooks_handler_type_unsupported_for_event", JSON.stringify(handler));
  }
  // command/mcp_tool continuam suportados em SessionStart.
  for (const handler of [
    { type: "command", command: "x" },
    { type: "mcp_tool", server: "s", tool: "t" },
  ]) {
    const result = projectConfig({
      rawText: JSON.stringify({ hooks: { SessionStart: [{ hooks: [handler] }] } }),
      format: "json",
      agentId: "claude",
    });
    assert.equal(result.configuration, "configured", JSON.stringify(handler));
  }
  // Um handler malformado sob SessionStart continua invalid: a restrição de
  // evento não mascara um campo obrigatório ausente.
  invalidStructure(JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: "http" }] }] } }), "json", "claude");
});

// --- Achado 3 da pré-revisão formal da rodada 3: campos opcionais tipados ---
// Só os campos que hook_config.rs tipa e o Codex 0.162.1 realmente lê. Sem
// `deny_unknown_fields` mas com tipo exato por campo: um valor presente de
// tipo errado falha a deserialização da struct do handler, o que falha o
// documento inteiro (o Codex não carrega nada dele) — por isso vira
// `invalid`, nunca um estado novo. Ver Landing "Campos opcionais tipados do
// Codex".

test("config-projection-C8 Codex: campo opcional de tipo conhecido com tipo errado invalida o documento inteiro, nunca configured", () => {
  for (const handler of [
    { type: "command", command: "echo ok", timeout: { bad: true } },
    { type: "command", command: "echo ok", timeout: -1 },
    { type: "command", command: "echo ok", timeout: 1.5 },
    { type: "command", command: "echo ok", async: "yes" },
    { type: "command", command: "echo ok", statusMessage: 7 },
    { type: "command", command: "echo ok", additionalContextLimit: -1 },
    { type: "command", command: "echo ok", additionalContextLimit: "2500" },
    { type: "mcp_tool", server: "s", tool: "t", timeout: "30" },
    { type: "mcp_tool", server: "s", tool: "t", statusMessage: false },
    { type: "mcp_tool", server: "s", tool: "t", input: "x" },
  ]) {
    invalidStructure(withHandlers([handler]), "json", "codex");
  }
});

test("config-projection-C8 Codex: campo opcional ausente ou corretamente tipado continua configured", () => {
  for (const handler of [
    { type: "command", command: "echo ok" },
    { type: "command", command: "echo ok", timeout: 30, async: true, statusMessage: "s", additionalContextLimit: 0 },
    { type: "mcp_tool", server: "s", tool: "t", timeout: 30, statusMessage: "s", input: { a: "b" } },
  ]) {
    assert.equal(projectHandlers("codex", [handler]).configuration, "configured", JSON.stringify(handler));
  }
});

// Achado G1 da rodada 3 (hook_config.rs, rust-v0.162.1): `timeout`,
// `statusMessage` e `additionalContextLimit` são `Option<T>` — `null`
// presente é o `None` válido, como a ausência. `async` (`r#async: bool`) e
// `input` (`serde_json::Map`) têm `#[serde(default)]` mas NÃO são Option:
// só a AUSÊNCIA da chave usa o default; um `null` presente falha a
// deserialização do campo (tipo errado), como qualquer outro valor que não
// seja bool/objeto — e isso invalida o documento inteiro, igual aos demais
// casos de tipo errado acima.
test("config-projection-C8 Codex: null em timeout/statusMessage/additionalContextLimit (Option<T>) continua configured", () => {
  const handler = {
    type: "command",
    command: "echo ok",
    timeout: null,
    statusMessage: null,
    additionalContextLimit: null,
  };
  assert.equal(projectHandlers("codex", [handler]).configuration, "configured", JSON.stringify(handler));
});

test("config-projection-C8 Codex: null em async (bool) ou input (Map) não é Option — invalida o documento, nunca configured", () => {
  invalidStructure(withHandlers([{ type: "command", command: "echo ok", async: null }]), "json", "codex");
  invalidStructure(
    withHandlers([{ type: "mcp_tool", server: "s", tool: "t", input: null }]),
    "json",
    "codex",
  );
});

// Achado G2 da rodada 3: `matcher` é `Option<String>` com default em
// `MatcherGroup` (hook_config.rs:154–159) — `null` é o `None` válido, ao
// contrário de um matcher de outro tipo (ex.: número), que continua
// invalid. O Claude não tem fonte equivalente confirmada: preserva a
// exigência atual (matcher precisa ser string ou ausente; `null` é invalid).
test("config-projection-C8 Codex: matcher:null é Option<String> válido (configured); Claude sem fonte equivalente continua invalid", () => {
  const codex = projectConfig({
    rawText: JSON.stringify({ hooks: { PreToolUse: [{ matcher: null, hooks: [{ type: "command", command: "x" }] }] } }),
    format: "json",
    agentId: "codex",
  });
  assertShape(codex);
  assert.equal(codex.configuration, "configured");

  invalidStructure(
    JSON.stringify({ hooks: { PreToolUse: [{ matcher: null, hooks: [{ type: "command", command: "x" }] }] } }),
    "json",
    "claude",
  );

  // matcher de outro tipo continua invalid para os dois agentes.
  for (const agentId of ["codex", "claude"]) {
    invalidStructure(
      JSON.stringify({ hooks: { PreToolUse: [{ matcher: 42, hooks: [{ type: "command", command: "x" }] }] } }),
      "json",
      agentId,
    );
  }
});
