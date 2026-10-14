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

// Complementação do mesmo achado (.checks/code-review/formal2-flag-types-
// residual.md): `FeaturesToml::entries` é um `BTreeMap<String, bool>`
// (lib.rs:869–871) — a deserialização nativa rejeita qualquer uma das duas
// chaves conhecidas presente com tipo diferente de bool, antes mesmo de
// aplicar a precedência entre canônica e alias. Não é um fallback por
// ausência: a canônica com tipo errado não cai para o alias, mesmo que o
// alias seja um bool válido, e um alias com tipo errado não fica escondido
// atrás de uma canônica válida. Handlers nativos válidos ao lado não mudam o
// resultado — o arquivo inteiro falha a deserialização.
test("config-projection-C8 features.hooks com tipo inválido não cai para codex_hooks válido, mesmo com hooks nativos válidos", () => {
  const result = projectConfig({
    rawText: '[features]\nhooks = "yes"\ncodex_hooks = true\n[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype="command"\ncommand="echo ok"\n',
    format: "toml",
    agentId: "codex",
  });
  assertShape(result);
  assert.equal(result.configuration, "invalid");
  assert.equal(result.reasonCode, "features_hooks_flag_invalid_type");
  assert.deepEqual(result.fields, {});
});

test("config-projection-C8 features.codex_hooks com tipo inválido não fica escondido atrás de features.hooks válido", () => {
  const result = projectConfig({
    rawText: '[features]\nhooks = true\ncodex_hooks = "no"\n[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype="command"\ncommand="echo ok"\n',
    format: "toml",
    agentId: "codex",
  });
  assertShape(result);
  assert.equal(result.configuration, "invalid");
  assert.equal(result.reasonCode, "features_hooks_flag_invalid_type");
  assert.deepEqual(result.fields, {});
});

test("config-projection-C8 features.codex_hooks sozinho com tipo inválido (sem features.hooks) também invalida, não vira not_configured/configured", () => {
  const result = projectConfig({
    rawText: '[features]\ncodex_hooks = "no"\n[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype="command"\ncommand="echo ok"\n',
    format: "toml",
    agentId: "codex",
  });
  assertShape(result);
  assert.equal(result.configuration, "invalid");
  assert.equal(result.reasonCode, "features_hooks_flag_invalid_type");
});

test("config-projection-C8 features.hooks sozinho com tipo inválido (sem codex_hooks) também invalida", () => {
  const result = projectConfig({
    rawText: '[features]\nhooks = "yes"\n[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype="command"\ncommand="echo ok"\n',
    format: "toml",
    agentId: "codex",
  });
  assertShape(result);
  assert.equal(result.configuration, "invalid");
  assert.equal(result.reasonCode, "features_hooks_flag_invalid_type");
});

// Preservação explícita: ausência de uma das duas chaves (nunca tipo
// inválido) continua delegando normalmente para a outra, e os dois bools
// válidos continuam decididos pela canônica (já provado acima).
test("config-projection-C8 features.hooks ausente delega a features.codex_hooks válido; o inverso também preserva a canônica", () => {
  const aliasOnly = projectConfig({
    rawText: "[features]\ncodex_hooks = true\n[hooks]\nPreToolUse = []\n",
    format: "toml",
    agentId: "codex",
  });
  assertShape(aliasOnly);
  assert.notEqual(aliasOnly.configuration, "invalid");
  assert.equal(aliasOnly.fields.featuresHooksEnabled, true);

  const canonicalOnly = projectConfig({
    rawText: "[features]\nhooks = true\n[hooks]\nPreToolUse = []\n",
    format: "toml",
    agentId: "codex",
  });
  assertShape(canonicalOnly);
  assert.notEqual(canonicalOnly.configuration, "invalid");
  assert.equal(canonicalOnly.fields.featuresHooksEnabled, true);
});

// Achado P2 da revisão formal3 (.checks/code-review/formal3-fixes.md, item 2):
// `FeaturesToml::entries` (lib.rs:838-871) é o `BTreeMap<String, bool>`
// INTEIRO de `[features]`, não só `hooks`/`codex_hooks` — a restrição
// anterior só conferia essas duas chaves. Qualquer outra chave (conhecida do
// doctor ou não, como `shell_tool`) com valor não booleano derruba o
// documento inteiro na própria deserialização nativa, mesmo com handlers
// nativos válidos ao lado.
test("config-projection-C8 features com chave desconhecida (shell_tool) de tipo inválido invalida o documento, mesmo com hooks nativos válidos", () => {
  const result = projectConfig({
    rawText:
      '[features]\nhooks = true\nshell_tool = "yes"\n[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype="command"\ncommand="echo ok"\n',
    format: "toml",
    agentId: "codex",
  });
  assertShape(result);
  assert.equal(result.configuration, "invalid");
  assert.equal(result.reasonCode, "features_hooks_flag_invalid_type");
  assert.deepEqual(result.fields, {});
});

// Tabela de tipos/contêiner do mapa achatado: booleano válido (conhecida ou
// desconhecida) preserva a resolução normal; os campos NOMEADOS/tipados de
// `FeaturesToml` (struct/enum próprios, não bool) ficam fora desta regra —
// não reimplementamos o schema deles, só a decisão de exclusão do mapa.
test("config-projection-C8 features: booleano em chave desconhecida é preservado; campo nomeado/tipado (objeto) não entra na regra de bool do mapa achatado", () => {
  const unknownBoolean = projectConfig({
    rawText:
      "[features]\nhooks = true\nmy_future_toggle = false\n[hooks]\nPreToolUse = []\n",
    format: "toml",
    agentId: "codex",
  });
  assertShape(unknownBoolean);
  assert.notEqual(unknownBoolean.configuration, "invalid");
  assert.equal(unknownBoolean.fields.featuresHooksEnabled, true);

  const typedFieldAsObject = projectConfig({
    rawText: "[features.tool_registry]\nenabled = true\n[features]\nhooks = true\n[hooks]\nPreToolUse = []\n",
    format: "toml",
    agentId: "codex",
  });
  assertShape(typedFieldAsObject);
  assert.notEqual(typedFieldAsObject.configuration, "invalid");
  assert.equal(typedFieldAsObject.fields.featuresHooksEnabled, true);
});

// A regra é o contrato de `[features]` do CODEX (`FeaturesToml`), não um
// schema genérico: Claude não tem essa struct, então uma chave desconhecida
// de `features` com tipo não booleano no settings.json do Claude nunca
// invalida o arquivo por essa regra.
test("config-projection-C8 features com chave desconhecida de tipo inválido não invalida settings.json do Claude (regra é só do Codex)", () => {
  const result = projectConfig({
    rawText: JSON.stringify({
      hooks: { PreToolUse: [{ hooks: [{ type: "command", command: "x" }] }] },
      features: { shell_tool: "yes" },
    }),
    format: "json",
    agentId: "claude",
  });
  assertShape(result);
  assert.equal(result.configuration, "configured");
});

// Regressão compartilhada da revisão formal3 (.checks/code-review/formal3-
// shared-projection-regression.md): `features`/`hooks`/`codex_hooks` são
// contrato exclusivo do Codex (`FeaturesToml`, lib.rs:838–871). Trocar o
// teste de truthiness por `!== undefined` deixou `features: null` do Claude/
// Hermes chegar a `Object.hasOwn(null, ...)` fora de qualquer catch, e um
// mapa com essas chaves ainda projetava `featuresHooksEnabled`/motivos do
// Codex nesses agentes. Esperado: nenhum tipo de `features` lança nem muda a
// decisão; só as chaves próprias de cada agente decidem.
const FOREIGN_FEATURES_VALUES = [
  null,
  true,
  0,
  "yes",
  [],
  { hooks: false },
  { codex_hooks: false },
  { hooks: "yes", codex_hooks: true },
  { shell_tool: "yes" },
];

test("config-projection-C8 Claude: features de qualquer tipo (null/escalar/mapa com chaves do Codex) não lança nem projeta campo/motivo do Codex", () => {
  for (const features of FOREIGN_FEATURES_VALUES) {
    const label = JSON.stringify(features);
    const withHooks = projectConfig({
      rawText: JSON.stringify({
        hooks: { PreToolUse: [{ hooks: [{ type: "command", command: "x" }] }] },
        allowManagedHooksOnly: true,
        features,
      }),
      format: "json",
      agentId: "claude",
    });
    assertShape(withHooks);
    assert.equal(withHooks.configuration, "configured", label);
    assert.equal(withHooks.reasonCode, "hooks_configured", label);
    assert.deepEqual(withHooks.fields, { hasHooksSection: true, allowManagedHooksOnly: true }, label);

    const disabled = projectConfig({
      rawText: JSON.stringify({ hooks: { PreToolUse: [] }, disableAllHooks: true, features }),
      format: "json",
      agentId: "claude",
    });
    assert.equal(disabled.configuration, "disabled", label);
    assert.equal(disabled.reasonCode, "hooks_disabled", label);
    assert.deepEqual(disabled.fields, { hasHooksSection: false, disableAllHooks: true }, label);
  }
});

const FOREIGN_FEATURES_YAML = [
  "",
  "null",
  "true",
  "0",
  '"yes"',
  "[]",
  "\n  hooks: false",
  "\n  codex_hooks: false",
  '\n  hooks: "yes"\n  codex_hooks: true',
  '\n  shell_tool: "yes"',
];

test("config-projection-C8 Hermes: features de qualquer tipo (null/escalar/mapa com chaves do Codex) não lança nem projeta campo/motivo do Codex", () => {
  for (const features of FOREIGN_FEATURES_YAML) {
    const result = projectConfig({
      rawText: `hooks:\n  pre_tool_call:\n    - command: "x"\nhooks_auto_accept: true\nfeatures: ${features}\n`,
      format: "yaml",
      agentId: "hermes",
    });
    assertShape(result);
    assert.equal(result.configuration, "configured", features);
    assert.equal(result.reasonCode, "hooks_configured", features);
    assert.deepEqual(
      result.fields,
      { hasHooksSection: true, hermesTargetedEvents: ["pre_tool_call"], hooksAutoAccept: true },
      features,
    );
  }
});

// Controle do mesmo achado: restringir `features` ao Codex não pode afrouxar
// a validação de contêiner do próprio Codex.
test("config-projection-C8 Codex: features escalar/array (string, inteiro, array) continua invalid/features_hooks_flag_invalid_type", () => {
  for (const literal of ['"yes"', "1", "[]"]) {
    const result = projectConfig({
      rawText: `features = ${literal}\n[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\n`,
      format: "toml",
      agentId: "codex",
    });
    assert.equal(result.configuration, "invalid", literal);
    assert.equal(result.reasonCode, "features_hooks_flag_invalid_type", literal);
    assert.deepEqual(result.fields, {}, literal);
  }
});

// Achado residual da revisão formal3 (.checks/code-review/formal3-residual-
// fixes.md, item 1): `FeaturesToml` desserializa de uma TABELA — `features =
// true` ou `features = false` no lugar de `[features]` falha a
// deserialização do documento ANTES de qualquer chave interna existir, não
// um booleano "sem efeito". `{ parsed.features }` (truthy) deixava passar
// `features = true` sem checagem alguma e pulava `features = false` por
// inteiro (falsy) — os dois casos apareciam `configured`/`not_configured`
// silenciosamente, nunca `invalid`.
test("config-projection-C8 Codex: features=true ou features=false (bool solto, não tabela) invalida o documento, mesmo com hooks nativos válidos", () => {
  for (const literal of ["true", "false"]) {
    const result = projectConfig({
      rawText: `features = ${literal}\n[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\n`,
      format: "toml",
      agentId: "codex",
    });
    assert.equal(result.configuration, "invalid", literal);
    assert.equal(result.reasonCode, "features_hooks_flag_invalid_type", literal);
    assert.deepEqual(result.fields, {}, literal);
  }
});

// `[features]` vazio continua uma tabela real, só sem chaves: válido.
test("config-projection-C8 Codex: [features] vazio (tabela sem chaves) continua válido, decidido só pelos hooks", () => {
  const result = projectConfig({
    rawText: '[features]\n[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\n',
    format: "toml",
    agentId: "codex",
  });
  assert.equal(result.configuration, "configured");
});

// Resíduo final (.checks/code-review/formal3-final-residuals.md, item 1):
// `features = 1979-05-27` é um escalar TOML datetime/date, não uma tabela —
// smol-toml devolve uma instância de `TomlDate extends Date` (dist/date.js),
// que satisfaz `typeof value === "object" && !Array.isArray(value)` e tem
// `Object.entries` vazio, como uma tabela `{}` de verdade. `FeaturesToml`
// desserializa de um MAPA (lib.rs:838-871); um datetime solto no lugar da
// tabela falha a deserialização do documento, igual a `features = true`.
test("config-projection-C8 Codex: features=1979-05-27 (datetime TOML solto, não tabela) invalida o documento, mesmo com hooks nativos válidos", () => {
  const result = projectConfig({
    rawText:
      'features = 1979-05-27\n[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\n',
    format: "toml",
    agentId: "codex",
  });
  assert.equal(result.configuration, "invalid");
  assert.equal(result.reasonCode, "features_hooks_flag_invalid_type");
  assert.deepEqual(result.fields, {});
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

// Achado P2 da revisão formal3 (.checks/code-review/formal3-fixes.md, item 3):
// `timeout` (`Option<u64>`, Command e McpTool) e `additionalContextLimit`
// (`Option<usize>`, Command) têm teto nativo 2^64-1 (hook_config.rs). Um
// `Number` do `JSON.parse` não representa esse teto com exatidão: o valor
// válido máximo (2^64-1, ímpar) arredonda para o MESMO double que o primeiro
// valor inválido acima dele (2^64) — por isso os literais abaixo são escritos
// como TEXTO num template de JSON bruto, nunca como `Number` num objeto JS
// passado a `JSON.stringify` (o literal já arredondaria na própria autoria do
// teste, mascarando o defeito que esta prova existe para pegar).
function codexHandlerRawJson(handlerJson, platform = "linux") {
  const rawText = `{"hooks":{"PreToolUse":[{"hooks":[${handlerJson}]}]}}`;
  return projectConfig({ rawText, format: "json", agentId: "codex", platform });
}

test("config-projection-C8 Codex: timeout no teto máximo válido do u64 (2^64-1) continua configured, em Command e McpTool", () => {
  const command = codexHandlerRawJson(
    '{"type":"command","command":"echo ok","timeout":18446744073709551615}',
  );
  assert.equal(command.configuration, "configured");
  assert.equal(command.fields.hasHooksSection, true);

  const mcpTool = codexHandlerRawJson(
    '{"type":"mcp_tool","server":"s","tool":"t","timeout":18446744073709551615}',
  );
  assert.equal(mcpTool.configuration, "configured");
});

test("config-projection-C8 Codex: timeout imediatamente acima do teto do u64 (2^64) invalida o documento, em Command e McpTool", () => {
  const command = codexHandlerRawJson(
    '{"type":"command","command":"echo ok","timeout":18446744073709551616}',
  );
  assert.equal(command.configuration, "invalid");
  assert.equal(command.reasonCode, "hooks_structure_invalid");
  assert.deepEqual(command.fields, {});

  const mcpTool = codexHandlerRawJson(
    '{"type":"mcp_tool","server":"s","tool":"t","timeout":18446744073709551616}',
  );
  assert.equal(mcpTool.configuration, "invalid");
  assert.equal(mcpTool.reasonCode, "hooks_structure_invalid");
});

test("config-projection-C8 Codex: additionalContextLimit no teto do usize (2^64-1) continua configured; 2^64 invalida (só Command)", () => {
  const atMax = codexHandlerRawJson(
    '{"type":"command","command":"echo ok","additionalContextLimit":18446744073709551615}',
  );
  assert.equal(atMax.configuration, "configured");

  const aboveMax = codexHandlerRawJson(
    '{"type":"command","command":"echo ok","additionalContextLimit":18446744073709551616}',
  );
  assert.equal(aboveMax.configuration, "invalid");
  assert.equal(aboveMax.reasonCode, "hooks_structure_invalid");
});

// Achados residuais da revisão formal3 (.checks/code-review/formal3-residual-
// fixes.md, item 3): TOML tipa inteiro como `i64` assinado — um literal além
// de `i64::MAX` nunca é um inteiro TOML válido, mesmo que o campo Rust seja
// `u64`/`usize` (o teto do FORMATO decide primeiro). `smol-toml` com
// `integersAsBigInt` preserva o inteiro exato (sem o limite de precisão de
// double antigo), então `9223372036854775807` (i64::MAX, válido e nativo)
// precisa ficar `configured`; qualquer coisa acima, mesmo um `u64::MAX`
// matematicamente válido para o CAMPO, nunca é um `i64` TOML válido.
// Regressão global do mesmo achado (.checks/code-review/formal3-toml-
// document-range.md): o motivo dos dois casos acima do teto mudou de
// `hooks_structure_invalid` para `config_malformed`, sem mudar `invalid`. A
// camada anterior do carregador real decide primeiro: `read_config_from_path`
// (layer_io.rs:154–160, Codex 0.162.1) desserializa o arquivo inteiro em
// `toml::Value` ANTES da configuração tipada, e o `ValueVisitor` do toml
// 0.9.11 (value.rs:442–446) recusa ali o inteiro acima de `i64::MAX` — o
// documento falha antes de existir um handler para classificar.
test("config-projection-C8 Codex: timeout no teto do i64 TOML (i64::MAX) continua configured; acima dele é invalid mesmo dentro do u64 do campo", () => {
  const atI64Max = projectConfig({
    rawText: '[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\ntimeout = 9223372036854775807\n',
    format: "toml",
    agentId: "codex",
  });
  assert.equal(atI64Max.configuration, "configured");

  const aboveI64Max = projectConfig({
    rawText: '[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\ntimeout = 9223372036854775808\n',
    format: "toml",
    agentId: "codex",
  });
  assert.equal(aboveI64Max.configuration, "invalid");
  assert.equal(aboveI64Max.reasonCode, "config_malformed");

  // u64::MAX (2^64-1) é válido para o CAMPO Rust, mas excede o teto do
  // próprio formato TOML (i64): o formato decide primeiro, nunca configured.
  const u64MaxInToml = projectConfig({
    rawText: '[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\ntimeout = 18446744073709551615\n',
    format: "toml",
    agentId: "codex",
  });
  assert.equal(u64MaxInToml.configuration, "invalid");
  assert.equal(u64MaxInToml.reasonCode, "config_malformed");
});

test("config-projection-C8 Codex: timeout pequeno e dentro da faixa segura em config.toml continua configured", () => {
  const result = projectConfig({
    rawText: '[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\ntimeout = 86400\n',
    format: "toml",
    agentId: "codex",
  });
  assert.equal(result.configuration, "configured");
});

// Achado residual (item 3): um FLOAT do TOML (`1.0`) nunca vira o mesmo
// `Number` convertido pelo smol-toml quanto um inteiro — com
// `integersAsBigInt`, só um inteiro vira `BigInt`; um float continua
// `Number`, sem fonte de texto JSON, e é recusado mesmo com valor matemático
// inteiro (o campo nativo é `Option<u64>`, não float).
test("config-projection-C8 Codex: timeout como float do TOML (1.0) invalida o documento, mesmo com valor matemático inteiro", () => {
  const result = projectConfig({
    rawText: '[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\ntimeout = 1.0\n',
    format: "toml",
    agentId: "codex",
  });
  assert.equal(result.configuration, "invalid");
  assert.equal(result.reasonCode, "hooks_structure_invalid");
});

// Achado residual (item 2): serde_json roteia um token com ponto decimal ou
// expoente para `ParserNumber::F64`, nunca para o visitor inteiro de
// `u64`/`usize` — `1.0`/`1e0`/`1e2` em JSON são recusados mesmo com valor
// matemático inteiro, porque `JSON.parse`/`Number.isInteger` apagam essa
// distinção lexical (viram o mesmo `Number` que `1`).
test("config-projection-C8 Codex: timeout como token decimal/exponencial do JSON (1.0, 1e0, 1e2) invalida", () => {
  for (const literal of ["1.0", "1e0", "1e2", "30.0", "3e1"]) {
    const result = codexHandlerRawJson(
      `{"type":"command","command":"echo ok","timeout":${literal}}`,
    );
    assert.equal(result.configuration, "invalid", literal);
    assert.equal(result.reasonCode, "hooks_structure_invalid", literal);
  }
});

// Resíduo final (.checks/code-review/formal3-final-residuals.md, item 2):
// `de.rs::parse_number` (serde_json 1.0.149, fonte baixada do publisher
// crates.io com checksum igual ao `Cargo.lock` da tag rust-v0.162.1 —
// `.checks/code-review/native-codex-0.162.1/serde-json-1.0.149/src/de.rs:
// 509-526`) roteia um token negativo de magnitude zero ("-0") para
// `ParserNumber::F64(-0.0)`, não para o inteiro — o comentário da própria
// fonte ("Convert into a float if we underflow, or on `-0`") confirma que
// esse token nunca alcança o visitor de `u64`/`usize`. O JS não preserva essa
// distinção lexical sozinho: `-0 < 0` é `false` e `BigInt("-0")` é `0n`,
// então só o texto-fonte exato decide. O MESMO valor "-0" em TOML (BigInt,
// sem fonte JSON) continua um inteiro nativo válido — é zero, dentro do teto
// i64 — porque o parser do TOML/Rust real nunca faz essa conversão para
// float; só o token JSON tem essa regra.
test("config-projection-C8 Codex: timeout=-0 em hooks.json (JSON) invalida — token negativo de magnitude zero é float para o parser, nunca inteiro", () => {
  const result = codexHandlerRawJson('{"type":"command","command":"echo ok","timeout":-0}');
  assert.equal(result.configuration, "invalid");
  assert.equal(result.reasonCode, "hooks_structure_invalid");
});

test("config-projection-C8 Codex: timeout=-0 em config.toml (TOML, inteiro BigInt) continua configured — mesmo valor, formato diferente", () => {
  const result = projectConfig({
    rawText: '[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\ntimeout = -0\n',
    format: "toml",
    agentId: "codex",
  });
  assert.equal(result.configuration, "configured");
});

// Regressão global do achado 3 (.checks/code-review/formal3-toml-document-
// range.md): `integersAsBigInt: true` vale para o documento INTEIRO, mas a
// faixa i64 só era conferida em `timeout`/`additionalContextLimit`. Sem essa
// opção o `smol-toml` recusava esses valores; com ela, um inteiro fora de i64
// numa chave que o doctor ignora passava adiante como `configured`. O
// carregador do Codex 0.162.1 desserializa o arquivo inteiro em `toml::Value`
// (layer_io.rs:154–160) e o `ValueVisitor` do toml 0.9.11 (value.rs:442–446)
// só aceita inteiro que caiba em i64 — em qualquer posição: raiz, tabela,
// array ou mapa inline aninhados, inclusive `[hooks.state]`, cujo conteúdo o
// doctor não interpreta. O hexadecimal prova que a faixa vale para o valor,
// não para uma forma lexical.
const CODEX_VALID_HOOKS_TOML = '[[hooks.PreToolUse]]\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "x"\n';

function projectCodexToml(rawText) {
  return projectConfig({ rawText, format: "toml", agentId: "codex", platform: "linux" });
}

test("config-projection-C8 Codex: inteiro fora da faixa i64 em qualquer posição de config.toml invalida o documento (config_malformed), mesmo ao lado de hooks válidos", () => {
  const cases = [
    ["raiz ignorada, i64::MAX+1", `ignored_count = 9223372036854775808\n${CODEX_VALID_HOOKS_TOML}`],
    ["raiz ignorada, i64::MIN-1", `ignored_count = -9223372036854775809\n${CODEX_VALID_HOOKS_TOML}`],
    ["raiz ignorada, hexadecimal u64::MAX", `ignored_mask = 0xffffffffffffffff\n${CODEX_VALID_HOOKS_TOML}`],
    ["tabela aninhada", `${CODEX_VALID_HOOKS_TOML}\n[profiles.default.limits]\nmax = 9223372036854775808\n`],
    ["array aninhado", `values = [1, [2, [3, -9223372036854775809]]]\n${CODEX_VALID_HOOKS_TOML}`],
    ["mapa inline dentro de array", `items = [{ deep = { n = 9223372036854775808 } }]\n${CODEX_VALID_HOOKS_TOML}`],
    ["[hooks.state] não interpretado", `${CODEX_VALID_HOOKS_TOML}\n[hooks.state]\ncounter = -9223372036854775809\n`],
  ];
  for (const [label, rawText] of cases) {
    const result = projectCodexToml(rawText);
    assertShape(result);
    assert.equal(result.configuration, "invalid", label);
    assert.equal(result.reasonCode, "config_malformed", label);
    assert.deepEqual(result.fields, {}, label);
  }
});

test("config-projection-C8 Codex: extremos nativos do i64, floats e datetimes TOML em posições gerais (e timeout=i64::MAX) continuam configured", () => {
  const rawText = [
    "ignored_min = -9223372036854775808",
    "ignored_max = 9223372036854775807",
    "ignored_hex = 0x7fffffffffffffff",
    "ratio = 1.5",
    "huge_float = 1e300",
    "not_a_number = nan",
    "unbounded = -inf",
    "when = 1979-05-27T07:32:00Z",
    "values = [-9223372036854775808, [9223372036854775807, 2.5, 1979-05-27]]",
    "items = [{ deep = { n = -9223372036854775808, f = 3.0 } }]",
    "[profiles.default.limits]",
    "max = 9223372036854775807",
    `${CODEX_VALID_HOOKS_TOML}timeout = 9223372036854775807`,
    "[hooks.state]",
    "counter = -9223372036854775808",
    "",
  ].join("\n");
  const result = projectCodexToml(rawText);
  assertShape(result);
  assert.equal(result.configuration, "configured");
  assert.equal(result.reasonCode, "hooks_configured");
  assert.equal(result.fields.hasHooksSection, true);
});

// O percurso da faixa precisa ser iterativo: abaixo de 1 MiB, o `smol-toml`
// aceita um array com 150.000 itens e uma chave pontilhada de 100.000 níveis
// (seu `maxDepth` só limita arrays/tabelas inline). Recursão de chamada
// estouraria a pilha no documento profundo e espalhar 150.000 itens como
// argumentos estouraria o teto do V8 — nos dois casos o `RangeError` viraria
// `config_malformed` para um documento cujos inteiros estão todos na faixa.
// O controle válido só preserva o resultado que esse documento já tinha antes
// da checagem de faixa; não afirma como o Codex nativo trata essa profundidade
// (nenhum Rust foi executado).
test("config-projection-C8 Codex: checagem da faixa i64 percorre sem recursão um array de 150.000 inteiros e uma chave de 100.000 níveis", () => {
  const wideValues = new Array(150000).fill("1").join(",");
  const deepKey = new Array(100000).fill("a").join(".");
  const inRange = `values = [${wideValues},9223372036854775807]\n${deepKey} = -9223372036854775808\n${CODEX_VALID_HOOKS_TOML}`;
  assert.ok(Buffer.byteLength(inRange, "utf8") < ONE_MIB_BYTES, "fixture precisa caber abaixo de 1 MiB");
  const valid = projectCodexToml(inRange);
  assert.equal(valid.configuration, "configured");
  assert.equal(valid.reasonCode, "hooks_configured");

  for (const rawText of [
    `values = [${wideValues},9223372036854775808]\n${CODEX_VALID_HOOKS_TOML}`,
    `${deepKey} = -9223372036854775809\n${CODEX_VALID_HOOKS_TOML}`,
  ]) {
    const result = projectCodexToml(rawText);
    assert.equal(result.configuration, "invalid");
    assert.equal(result.reasonCode, "config_malformed");
    assert.deepEqual(result.fields, {});
  }
});

// A faixa é do carregador TOML do Codex: JSON do Claude e YAML do Hermes não
// passam por `parseCodexToml`, então o mesmo inteiro numa chave ignorada não
// muda o resultado que esses agentes já tinham.
test("config-projection-C8 inteiro fora de i64 em chave ignorada não altera a projeção de Claude (JSON) e Hermes (YAML)", () => {
  const claudeHooks = '"hooks":{"PreToolUse":[{"hooks":[{"type":"command","command":"x"}]}]}';
  assert.deepEqual(
    projectConfig({ rawText: `{"ignored_count":9223372036854775808,${claudeHooks}}`, format: "json", agentId: "claude" }),
    projectConfig({ rawText: `{${claudeHooks}}`, format: "json", agentId: "claude" }),
  );
  const hermesHooks = 'hooks:\n  pre_tool_call:\n    - command: "x"\n';
  assert.deepEqual(
    projectConfig({ rawText: `ignored_count: 9223372036854775808\n${hermesHooks}`, format: "yaml", agentId: "hermes" }),
    projectConfig({ rawText: hermesHooks, format: "yaml", agentId: "hermes" }),
  );
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

// --- Achado P2 da revisão formal3 (.checks/code-review/formal3-fixes.md,
// item 4): grupo de matcher com uma lista muito grande de hooks ---
// `matcherGroupHandlers`/`inspectMatcherGroupHooks` espalhavam a lista como
// argumentos de `.push(...)`/`.push(...array.map(...))`; um grupo com
// dezenas de milhares de handlers (`hooks.json` sintaticamente válido, abaixo
// do limite de 1 MiB) estourava o limite de argumentos do V8 (`RangeError:
// Maximum call stack size exceeded`) ANTES de qualquer classificação, e a
// exceção escapava da leitura de configuração. `matcherGroupHandlers` é
// compartilhada por Claude e Codex (`HOOKS_INSPECTORS`): a mesma prova cobre
// os dois agentes que a usam.

test("config-projection-C12 Codex: grupo com 300.000 handlers inválidos (sem type) classifica invalid sem lançar RangeError, nunca escapa como erro interno", () => {
  const rawText = JSON.stringify({ hooks: { PreToolUse: [{ hooks: new Array(300000).fill({}) }] } });
  assert.ok(Buffer.byteLength(rawText, "utf8") < ONE_MIB_BYTES, "fixture precisa caber abaixo de 1 MiB");
  const result = projectConfig({ rawText, format: "json", agentId: "codex", platform: "linux" });
  assertShape(result);
  assert.equal(result.configuration, "invalid");
  assert.equal(result.reasonCode, "hooks_structure_invalid");
  assert.deepEqual(result.fields, {});
});

// Um handler válido e visado precisa de `type`+`command` não vazios
// (≥32 bytes cada), bem mais pesado que o `{}` inválido (2 bytes) do caso
// acima — 300.000 deles não cabem no mesmo teto de 1 MiB. A contagem abaixo
// (30.000) é a maior que ainda cabe com esse handler mínimo, mantendo a
// prova sob o mesmo limite de arquivo que o relatório real aplicaria.
const LARGE_VALID_HANDLER_COUNT = 30000;

test("config-projection-C12 Codex: grupo com handlers válidos em larga escala classifica configured sem lançar RangeError", () => {
  const validHandler = { type: "command", command: "x" };
  const rawText = JSON.stringify({
    hooks: { PreToolUse: [{ hooks: new Array(LARGE_VALID_HANDLER_COUNT).fill(validHandler) }] },
  });
  assert.ok(Buffer.byteLength(rawText, "utf8") < ONE_MIB_BYTES, "fixture precisa caber abaixo de 1 MiB");
  const result = projectConfig({ rawText, format: "json", agentId: "codex", platform: "linux" });
  assertShape(result);
  assert.equal(result.configuration, "configured");
  assert.equal(result.fields.hasHooksSection, true);
});

test("config-projection-C12 Claude usa o mesmo helper de grupos de matcher: 300.000 handlers inválidos ou handlers válidos em larga escala não lançam RangeError", () => {
  const invalid = projectConfig({
    rawText: JSON.stringify({ hooks: { PreToolUse: [{ hooks: new Array(300000).fill({}) }] } }),
    format: "json",
    agentId: "claude",
  });
  assertShape(invalid);
  assert.equal(invalid.configuration, "invalid");
  assert.equal(invalid.reasonCode, "hooks_structure_invalid");

  const validHandler = { type: "command", command: "x" };
  const validRawText = JSON.stringify({
    hooks: { PreToolUse: [{ hooks: new Array(LARGE_VALID_HANDLER_COUNT).fill(validHandler) }] },
  });
  assert.ok(Buffer.byteLength(validRawText, "utf8") < ONE_MIB_BYTES, "fixture precisa caber abaixo de 1 MiB");
  const valid = projectConfig({ rawText: validRawText, format: "json", agentId: "claude" });
  assertShape(valid);
  assert.equal(valid.configuration, "configured");
});

// Limite de bytes independente: o mesmo payload de lista grande, empurrado
// para cima de 1 MiB, continua `unknown/input_too_large` — a correção do
// limite de argumentos não substitui nem enfraquece o teto de leitura.
test("config-projection-C12/C14 lista grande de hooks acima de 1 MiB continua input_too_large, não invalid nem RangeError", () => {
  const marker = "x".repeat(2000);
  const rawText = JSON.stringify({
    hooks: { PreToolUse: [{ hooks: new Array(300000).fill({}) }] },
    padding: marker,
  }).padEnd(ONE_MIB_BYTES + 1, " ");
  assert.ok(Buffer.byteLength(rawText, "utf8") > ONE_MIB_BYTES);
  const result = projectConfig({ rawText, format: "json", agentId: "codex", platform: "linux" });
  assert.equal(result.configuration, "unknown");
  assert.equal(result.reasonCode, "input_too_large");
});
