// Achado 1 da conferência root do delta formal8
// (.checks/code-review/formal8-root-feedback.md): o caller runDiagnostics
// (e, acima dele, cli.mjs:main) não captura a rejeição que
// isHermesPluginsModuleSelected podia lançar fora do try/catch de
// readHermesContract (achado 2 do formal8, contract-evidence.mjs) — um
// stat/listDir negado (EACCES/EIO) na checagem de precedência do catálogo
// Hermes derrubava o diagnóstico inteiro (perdendo presença/versão dos três
// agentes), em vez de só deixar o contrato do Hermes "unreadable".
//
// Fixture mínima própria para esta prova de fronteira: não reusa
// installAgentsInTree de agent-resolution.unit.test.mjs (fora do ownership
// desta correção — preservar aquele arquivo intacto), só o necessário para
// os três agentes ficarem "present" com versão compatível com o perfil
// examinado (known-version-profiles.mjs), uma única convenção de SO (linux)
// — "uma prova da fronteira pública... é suficiente" (root-feedback).
// Sem CLI nativa nem simulação de permissão real (chmod): o root já pediu
// para não repetir essa abordagem, que outros testes desta suíte já
// documentam como não portátil/determinística entre SOs e CI
// (configuration-trust.cli.test.mjs, C16).
import assert from "node:assert/strict";
import test from "node:test";
import { runDiagnostics } from "../../src/doctor/run-diagnostics.mjs";
import {
  addDir,
  addFile,
  addSymlink,
  buildFsTree,
  createFakeFsAdapter,
  wrapFsMethodFault,
} from "./helpers/fake-fs-adapter.mjs";
import { buildMinimalPe } from "./helpers/synthetic-pe.mjs";

const CLAUDE_VERSION = { major: 2, minor: 1, build: 295, revision: 0 };
const CODEX_PACKAGE_JSON = JSON.stringify({ name: "@openai/codex", version: "0.162.1" });
const BIN_DIR = "/fixture/bin";

function installThreeAgents(tree) {
  addFile(tree, BIN_DIR, "claude", buildMinimalPe({ version: CLAUDE_VERSION }));

  const codexPkgDir = "/fixture/lib/node_modules/@openai/codex";
  addFile(tree, codexPkgDir, "package.json", CODEX_PACKAGE_JSON);
  addFile(tree, `${codexPkgDir}/bin`, "codex.js", "#!/usr/bin/env node\n");
  addSymlink(tree, BIN_DIR, "codex", `${codexPkgDir}/bin/codex.js`);

  const hermesVenvRoot = `${BIN_DIR}/hermes-venv`;
  const hermesBinDir = `${hermesVenvRoot}/bin`;
  addFile(
    tree,
    hermesBinDir,
    "hermes",
    `#!${hermesVenvRoot}/bin/python3.12\nfrom hermes_cli import main\nimport sys\nsys.exit(main())\n`,
  );
  addDir(tree, `${hermesVenvRoot}/lib`, "python3.12");
  const hermesPkgDir = `${hermesVenvRoot}/lib/python3.12/site-packages/hermes_cli`;
  addFile(tree, hermesPkgDir, "__init__.py", '__version__ = "0.21.4"\n');
  // Namespace puro (sem __init__): não sombreia plugins.py (que nem existe
  // nesta fixture — sem conteúdo de contrato, só a checagem de precedência
  // importa aqui), só dá a isHermesPluginsModuleSelected um diretório
  // plugins/ real para o listDir isolado do segundo teste abaixo alcançar.
  const pluginsDir = `${hermesPkgDir}/plugins`;
  addFile(tree, pluginsDir, "helper.py", "# não é __init__\n");

  return { hermesBinDir, hermesPkgDir, pluginsDir };
}

function baseEnv(hermesBinDir) {
  return {
    PATH: [BIN_DIR, hermesBinDir].join(":"),
    HOME: "/fixture/home",
    USERPROFILE: "/fixture/home",
  };
}

test("run-diagnostics-formal8-root-1 stat negado (EACCES) na checagem de precedência do catálogo Hermes preserva os três agentes; contrato vira unreadable", async () => {
  const tree = buildFsTree();
  const { hermesBinDir, hermesPkgDir } = installThreeAgents(tree);
  const fs = createFakeFsAdapter(tree);
  fs.injectFault(`${hermesPkgDir}/plugins`, "EACCES");

  const report = await runDiagnostics({
    cwd: "/fixture/cwd",
    collectorEndpoint: undefined,
    env: baseEnv(hermesBinDir),
    platform: "linux",
    fs,
  });

  assert.deepEqual(report.agents.map((agent) => agent.id), ["claude", "codex", "hermes"]);
  const claude = report.agents.find((agent) => agent.id === "claude");
  const codex = report.agents.find((agent) => agent.id === "codex");
  const hermes = report.agents.find((agent) => agent.id === "hermes");
  assert.equal(claude.presence, "present");
  assert.equal(claude.version, "2.1.295");
  assert.equal(codex.presence, "present");
  assert.equal(codex.version, "0.162.1");
  assert.equal(hermes.presence, "present");
  assert.equal(hermes.version, "0.21.4");

  const hermesLocalRow = hermes.capabilities.find(
    (row) => row.surface === "cli_local" && row.mechanism === "tool_calls",
  );
  assert.equal(hermesLocalRow.support, "unverified");
  assert.equal(hermesLocalRow.reasonCode, "contract_source_unreadable");
});

// listDir(packageDir) não serve de alvo aqui: hermes.mjs já faz a mesma
// chamada (hasCompiledSibling do __init__ compilado, achado 1 do formal8)
// durante a RESOLUÇÃO DE VERSÃO, antes mesmo de contract-evidence.mjs
// rodar — um fault ali derrubaria presença/versão por um motivo diferente
// do que este teste prova. listDir(pluginsDir) é exclusivo da checagem de
// precedência do catálogo (plugins/__init__[.ABI].so/.pyd): isola o mesmo
// achado sem esse conflito.
test("run-diagnostics-formal8-root-1 listDir negado (EIO) no diretório plugins/ (mesma checagem de precedência) também preserva os três agentes", async () => {
  const tree = buildFsTree();
  const { hermesBinDir, pluginsDir } = installThreeAgents(tree);
  const fs = wrapFsMethodFault(createFakeFsAdapter(tree), "listDir", pluginsDir, "EIO");

  const report = await runDiagnostics({
    cwd: "/fixture/cwd",
    collectorEndpoint: undefined,
    env: baseEnv(hermesBinDir),
    platform: "linux",
    fs,
  });

  assert.deepEqual(report.agents.map((agent) => agent.id), ["claude", "codex", "hermes"]);
  const hermes = report.agents.find((agent) => agent.id === "hermes");
  assert.equal(hermes.presence, "present");
  const hermesLocalRow = hermes.capabilities.find(
    (row) => row.surface === "cli_local" && row.mechanism === "tool_calls",
  );
  assert.equal(hermesLocalRow.reasonCode, "contract_source_unreadable");
});
