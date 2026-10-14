// C3 (subclaim de permissão) e C4 (subclaim de não-execução) provados na
// própria camada: simular permissão negada de forma portável entre SOs e
// provar que nenhum child_process é usado não é possível de forma
// determinística via CLI real, então a regra é exercida diretamente aqui.
// C2 (precedência de PATH, caminhos com espaço/Unicode, convenções de SO e
// vínculo real do launcher ao pacote/fonte) também é provado aqui: um shim
// "stub" sem conteúdo real não prova vínculo (ver launcher-link/codex.mjs e
// launcher-link/hermes.mjs) — esta suíte usa o mesmo tipo de referência que
// um shim gerado por npm/pip realmente contém.
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { lstat, readFile, realpath, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { isDeepStrictEqual } from "node:util";
import { resolveAgents } from "../../src/doctor/agent-resolution.mjs";
import { resolveCodexVersion } from "../../src/doctor/launcher-link/codex.mjs";
import { resolveHermesVersion } from "../../src/doctor/launcher-link/hermes.mjs";
import { buildMinimalPe, corruptSizeOfOptionalHeader } from "./helpers/synthetic-pe.mjs";
import { hermesPluginsSource } from "./helpers/hermes-contract-source.mjs";
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
import {
  addDir,
  addFile,
  addSymlink,
  buildFsTree,
  createFakeFsAdapter,
} from "./helpers/fake-fs-adapter.mjs";
import {
  CODEX_GLOBAL_SH_TARGET,
  CODEX_GLOBAL_WINDOWS_TARGET,
  CODEX_LOCAL_SH_TARGET,
  CODEX_LOCAL_WINDOWS_TARGET,
  npmCmdShim,
  npmShShim,
} from "./helpers/npm-shims.mjs";

function throwingChildProcess() {
  const fail = (method) => () => {
    throw new Error(`child_process.${method} não deve ser chamado pelo doctor`);
  };
  return {
    spawn: fail("spawn"),
    spawnSync: fail("spawnSync"),
    execFile: fail("execFile"),
    exec: fail("exec"),
  };
}

function peBytes(version) {
  return buildMinimalPe({ version });
}

const V1 = { major: 2, minor: 1, build: 295, revision: 0 };
const V2 = { major: 9, minor: 9, build: 999, revision: 0 };

function sepFor(platform) {
  return platform === "win32" ? "\\" : "/";
}

const CODEX_PACKAGE_JSON = JSON.stringify({ name: "@openai/codex", version: "0.162.1" });

// Layout global real do npm: no Windows, `<prefix>\codex.cmd` do cmd-shim e
// o pacote em `<prefix>\node_modules`; no POSIX, `<prefix>/bin/codex` é link
// simbólico para `../lib/node_modules/@openai/codex/bin/codex.js` (aqui o
// diretório do PATH já é `<prefix>/bin`).
function installCodexGlobal(tree, dir, platform) {
  if (platform === "win32") {
    addFile(tree, dir, "codex.cmd", npmCmdShim(CODEX_GLOBAL_WINDOWS_TARGET));
    const pkgDir = [dir, "node_modules", "@openai", "codex"].join("\\");
    addFile(tree, pkgDir, "package.json", CODEX_PACKAGE_JSON);
    addFile(tree, pkgDir + "\\bin", "codex.js", "#!/usr/bin/env node\n");
    return pkgDir;
  }
  const prefix = dir.slice(0, dir.lastIndexOf("/"));
  const pkgDir = `${prefix}/lib/node_modules/@openai/codex`;
  addFile(tree, pkgDir, "package.json", CODEX_PACKAGE_JSON);
  addFile(tree, `${pkgDir}/bin`, "codex.js", "#!/usr/bin/env node\n");
  addSymlink(tree, dir, "codex", `${pkgDir}/bin/codex.js`);
  return pkgDir;
}

// Shim sh do cmd-shim (o mesmo texto que o npm grava ao lado do .cmd), com o
// pacote abaixo do diretório do shim — usado onde o teste precisa de um
// launcher de texto com caminhos POSIX.
function installCodexShShim(tree, dir, packageJson = CODEX_PACKAGE_JSON) {
  addFile(tree, dir, "codex", npmShShim(CODEX_GLOBAL_SH_TARGET));
  addFile(tree, `${dir}/node_modules/@openai/codex`, "package.json", packageJson);
}

// O launcher real (console-script do pip) importa hermes_cli e fixa o
// intérprete do próprio venv: no POSIX, o shebang absoluto de
// <venv>/bin/python3.12; no .cmd simplificado do Windows (ver
// src/doctor/launcher-link/hermes.mjs), o python.exe do mesmo Scripts por
// `%~dp0`. Até a revisão formal7 este shim era `#!/usr/bin/env python3` —
// inclusive dentro de hermes.cmd —, que deixa o intérprete para o PATH e não
// comprova vínculo; os testes que o usavam passavam só porque o leitor
// presumia o prefixo do launcher.
function hermesShimContent(venvRoot, platform = "linux") {
  if (platform === "win32") return '@ECHO off\r\n"%~dp0python.exe" -m hermes_cli %*\r\n';
  return `#!${venvRoot}/bin/python3.12\nfrom hermes_cli import main\nimport sys\nsys.exit(main())\n`;
}

function installAgentsInTree(tree, dir, platform) {
  const sep = sepFor(platform);
  const claudeName = platform === "win32" ? "claude.exe" : "claude";
  addFile(tree, dir, claudeName, peBytes(V1));

  const codexPkgDir = installCodexGlobal(tree, dir, platform);

  const hermesBinDirName = platform === "win32" ? "Scripts" : "bin";
  const hermesVenvRoot = [dir, "hermes-venv"].join(sep);
  const hermesBinDir = [hermesVenvRoot, hermesBinDirName].join(sep);
  const hermesName = platform === "win32" ? "hermes.cmd" : "hermes";
  addFile(tree, hermesBinDir, hermesName, hermesShimContent(hermesVenvRoot, platform));
  let sitePackagesDir;
  if (platform === "win32") {
    sitePackagesDir = [hermesVenvRoot, "Lib", "site-packages"].join(sep);
  } else {
    // listDir precisa enxergar "python3.12" dentro de "lib" para a
    // resolução encontrá-lo sem presumir a versão fixa de antemão.
    addDir(tree, [hermesVenvRoot, "lib"].join(sep), "python3.12");
    sitePackagesDir = [hermesVenvRoot, "lib", "python3.12", "site-packages"].join(sep);
  }
  addFile(tree, [sitePackagesDir, "hermes_cli"].join(sep), "__init__.py", '__version__ = "0.21.4"\n');

  return { hermesBinDir, codexPkgDir };
}

test("agent-resolution-C2 conventions por SO: windows, linux e macos resolvem os três agentes com vínculo real ao pacote/fonte", async () => {
  for (const platform of ["win32", "linux", "darwin"]) {
    const tree = buildFsTree();
    const dir = platform === "win32" ? "C:\\fixture\\bin" : "/fixture/bin";
    const { hermesBinDir } = installAgentsInTree(tree, dir, platform);

    // O hermes.cmd executa `-m hermes_cli`, e o Python põe primeiro em
    // sys.path o diretório de trabalho de quem executa. Sem ele o vínculo do
    // `-m` não é demonstrável (correção de vínculo Hermes); aqui é um
    // diretório sem hermes_cli.
    const results = await resolveAgents({
      pathDirs: [dir, hermesBinDir],
      platform,
      cwd: platform === "win32" ? "C:\\projeto" : "/projeto",
      fs: createFakeFsAdapter(tree),
      childProcess: throwingChildProcess(),
    });

    assert.deepEqual(
      results.map((r) => r.id),
      ["claude", "codex", "hermes"],
      platform,
    );
    const claude = results.find((r) => r.id === "claude");
    assert.equal(claude.presence, "present", platform);
    assert.equal(claude.version, "2.1.295", platform);
    assert.equal(claude.versionSource, "binary_metadata", platform);

    const codex = results.find((r) => r.id === "codex");
    assert.equal(codex.presence, "present", platform);
    assert.equal(codex.version, "0.162.1", platform);
    assert.equal(codex.versionSource, "package_metadata", platform);

    const hermes = results.find((r) => r.id === "hermes");
    assert.equal(hermes.presence, "present", platform);
    assert.equal(hermes.version, "0.21.4", platform);
    assert.equal(hermes.versionSource, "source_literal", platform);
  }
});

test("agent-resolution-C2 primeira resolução válida no PATH tem precedência", async () => {
  const tree = buildFsTree();
  const dirFirst = "/path/first";
  const dirSecond = "/path/second";
  const claudeName = "claude";
  addFile(tree, dirFirst, claudeName, peBytes(V1));
  addFile(tree, dirSecond, claudeName, peBytes(V2));

  const results = await resolveAgents({
    pathDirs: [dirFirst, dirSecond],
    platform: "linux",
    fs: createFakeFsAdapter(tree),
    childProcess: throwingChildProcess(),
  });
  const claude = results.find((r) => r.id === "claude");
  assert.equal(claude.version, "2.1.295");
  assert.equal(claude.path, dirFirst + "/" + claudeName);
});

test("agent-resolution-C2 caminhos com espaços e Unicode não alteram a resolução", async () => {
  const tree = buildFsTree();
  const dir = "/caminho com espaço/ágéntes café";
  addFile(tree, dir, "claude", peBytes(V1));

  const results = await resolveAgents({
    pathDirs: [dir],
    platform: "linux",
    fs: createFakeFsAdapter(tree),
    childProcess: throwingChildProcess(),
  });
  const claude = results.find((r) => r.id === "claude");
  assert.equal(claude.version, "2.1.295");
  assert.equal(claude.path, dir + "/claude");
});

test("agent-resolution-C3 permissão negada vira presence unknown preservando o código do SO, sem interromper os demais", async () => {
  const tree = buildFsTree();
  const dir = "/path/one";
  const { hermesBinDir, codexPkgDir } = installAgentsInTree(tree, dir, "linux");

  const fs = createFakeFsAdapter(tree);
  fs.injectFault(codexPkgDir + "/package.json", "EACCES");

  const results = await resolveAgents({
    pathDirs: [dir, hermesBinDir],
    platform: "linux",
    fs,
    childProcess: throwingChildProcess(),
  });
  const codex = results.find((r) => r.id === "codex");
  assert.equal(codex.presence, "unknown");
  assert.equal(codex.reasonCode, "EACCES");
  const claude = results.find((r) => r.id === "claude");
  const hermes = results.find((r) => r.id === "hermes");
  assert.equal(claude.presence, "present");
  assert.equal(hermes.presence, "present");
});

// Achado formal5 P2 (nº2, .checks/code-review/formal5-fixes.md): uma entrada
// do PATH que é, na verdade, um arquivo regular (não diretório) faz
// stat(dir/agente) retornar ENOTDIR — a mesma ausência de candidato válido
// que ENOENT, exigindo a mesma continuação para o diretório seguinte. Antes
// da correção só ENOENT era ignorado; ENOTDIR interrompia findLauncherPath e
// devolvia presence:unknown/reasonCode:ENOTDIR, mesmo com uma instalação
// reconhecida no diretório seguinte. Fake FS, portável entre SOs (não
// depende do errno real do SO que roda o teste). Outros erros de E/S
// (EACCES, EIO) continuam propagados, provado no teste de permissão negada
// acima.
test("agent-resolution-formal5-2 entrada do PATH que faz stat(dir/agente) devolver ENOTDIR é ignorada como ENOENT, continuando para o diretório seguinte", async () => {
  const tree = buildFsTree();
  const fileEntryDir = "/tmp/entrada-arquivo";
  const laterDir = "/path/two";
  addFile(tree, laterDir, "claude", peBytes(V1));
  const fs = createFakeFsAdapter(tree);
  fs.injectFault(fileEntryDir + "/claude", "ENOTDIR");

  const results = await resolveAgents({
    pathDirs: [fileEntryDir, laterDir],
    platform: "linux",
    fs,
    childProcess: throwingChildProcess(),
  });
  const claude = results.find((r) => r.id === "claude");
  assert.equal(claude.presence, "present");
  assert.equal(claude.path, laterDir + "/claude");
  assert.equal(claude.version, "2.1.295");
});

// Mesmo achado, fronteira real do SO (Linux/macOS): um ARQUIVO de verdade no
// primeiro diretório do PATH precisa produzir o ENOTDIR nativo (não
// simulado) ao tentar stat(arquivo/claude), e a instalação real no segundo
// diretório precisa ser encontrada mesmo assim. O Windows não reproduz esta
// mesma condição de SO (um componente de caminho que é arquivo resolve
// diferente no NTFS/Win32; a cobertura portável acima já cobre o contrato em
// todo SO), então este teste roda só em Linux/macOS, como o teste de
// symlink real já faz nesta suíte.
test(
  "agent-resolution-formal5-2 arquivo regular real no PATH antes de uma instalação real (POSIX): ENOTDIR não interrompe a busca",
  { skip: process.platform === "win32" },
  async () => {
    const scratch = mkdtempSync(path.join(tmpdir(), "doctor-enotdir-"));
    try {
      const fileEntry = path.join(scratch, "arquivo-no-path");
      writeFileSync(fileEntry, "não é um diretório\n");
      const binDir = path.join(scratch, "bin");
      mkdirSync(binDir, { recursive: true });
      const claudePath = path.join(binDir, "claude");
      writeFileSync(claudePath, peBytes(V1));
      chmodSync(claudePath, 0o755);

      const fsAdapter = { stat, readFile, lstat, realpath };
      const results = await resolveAgents({
        pathDirs: [fileEntry, binDir],
        platform: process.platform,
        fs: fsAdapter,
      });
      const claude = results.find((r) => r.id === "claude");
      assert.equal(claude.presence, "present");
      assert.equal(claude.path, claudePath);
      assert.equal(claude.version, "2.1.295");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  },
);

test("agent-resolution-C4 nunca chama child_process ao resolver agentes", async () => {
  const tree = buildFsTree();
  const dir = "/path/one";
  addFile(tree, dir, "claude", peBytes(V1));
  const results = await resolveAgents({
    pathDirs: [dir],
    platform: "linux",
    fs: createFakeFsAdapter(tree),
    childProcess: throwingChildProcess(),
  });
  assert.equal(results.length, 3);
});

test("agent-resolution-C3 launcher alheio do Codex com package.json vizinho (não referenciado) continua launcher_not_recognized", async () => {
  const tree = buildFsTree();
  const dir = "/path/foreign-codex";
  // Script sem nenhuma referência a @openai/codex: uma ferramenta qualquer
  // que por acaso se chama "codex" neste PATH.
  addFile(tree, dir, "codex", "#!/bin/sh\necho ferramenta não relacionada\n");
  addFile(
    tree,
    [dir, "node_modules", "@openai", "codex"].join("/"),
    "package.json",
    JSON.stringify({ name: "@openai/codex", version: "9.9.9" }),
  );
  const result = await resolveCodexVersion(dir + "/codex", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "launcher_not_recognized");
});

test("agent-resolution-C3 launcher alheio do Hermes com hermes_cli vizinho (fora do site-packages) continua launcher_not_recognized", async () => {
  const tree = buildFsTree();
  const venvRoot = "/path/foreign-hermes-venv";
  const binDir = venvRoot + "/bin";
  addFile(tree, binDir, "hermes", hermesShimContent(venvRoot));
  // hermes_cli colocado ao lado do launcher, fora de lib/python*/site-packages.
  addFile(tree, binDir + "/hermes_cli", "__init__.py", '__version__ = "9.9.9"\n');
  const result = await resolveHermesVersion(binDir + "/hermes", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "launcher_not_recognized");
});

test("agent-resolution-C2 layout Windows do Hermes (Lib/site-packages) liga a fonte ao launcher", async () => {
  const tree = buildFsTree();
  const venvRoot = "C:\\fixture\\hermes-venv";
  const binDir = venvRoot + "\\Scripts";
  addFile(tree, binDir, "hermes.cmd", hermesShimContent(venvRoot, "win32"));
  addFile(tree, venvRoot + "\\Lib\\site-packages\\hermes_cli", "__init__.py", '__version__ = "0.21.4"\n');
  // `-m hermes_cli` importa primeiro do diretório de trabalho: o teste o
  // informa, sem hermes_cli (correção de vínculo Hermes).
  const result = await resolveHermesVersion(binDir + "\\hermes.cmd", {
    fs: createFakeFsAdapter(tree),
    cwd: "C:\\projeto",
  });
  assert.equal(result.version, "0.21.4");
  assert.equal(result.versionSource, "source_literal");
  assert.equal(result.packageDir, venvRoot + "\\Lib\\site-packages\\hermes_cli");
});

// C3/C14 — os regex de vínculo nunca reconhecem uma referência dentro de um
// comentário (sem nenhuma execução/import real), e o literal de versão nunca
// é aceito como qualquer string não vazia — um canário/credencial ou texto
// ilegível não pode ser exposto verbatim no relatório.
test("agent-resolution-C10 comentário com path/import do Codex não atribui versão (pacote vizinho não referenciado de verdade)", async () => {
  const tree = buildFsTree();
  const dir = "/path/codex-comment-only";
  // As referências aparecem também na forma ancorada que um shim real usa
  // ($basedir/%dp0%), mas só dentro de linhas de comentário (#, REM, ::).
  addFile(
    tree,
    dir,
    "codex",
    "#!/bin/sh\n" +
      "# usa node_modules/@openai/codex/bin/codex.js internamente\n" +
      '# exec node  "$basedir/node_modules/@openai/codex/bin/codex.js" "$@"\n' +
      'REM "%dp0%\\node_modules\\@openai\\codex\\bin\\codex.js"\n' +
      ':: "%dp0%\\node_modules\\@openai\\codex\\bin\\codex.js"\n' +
      "echo noop\n",
  );
  addFile(
    tree,
    [dir, "node_modules", "@openai", "codex"].join("/"),
    "package.json",
    JSON.stringify({ name: "@openai/codex", version: "9.9.9" }),
  );
  const result = await resolveCodexVersion(dir + "/codex", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "launcher_not_recognized");
});

test("agent-resolution-C10 comentário com import do Hermes não atribui versão (pacote vizinho não referenciado de verdade)", async () => {
  const tree = buildFsTree();
  const binDir = "/path/hermes-comment-only/bin";
  addFile(
    tree,
    binDir,
    "hermes",
    "#!/path/hermes-comment-only/bin/python3.12\n# from hermes_cli import main\necho noop\n",
  );
  addDir(tree, "/path/hermes-comment-only/lib", "python3.12");
  addFile(
    tree,
    "/path/hermes-comment-only/lib/python3.12/site-packages/hermes_cli",
    "__init__.py",
    '__version__ = "0.21.4"\n',
  );
  const result = await resolveHermesVersion(binDir + "/hermes", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "launcher_not_recognized");
});

test("agent-resolution-C10 literal de versão do Hermes com formato implausível (canário) vira version_unreadable, nunca exposto", async () => {
  const tree = buildFsTree();
  const binDir = "/path/hermes-canary/bin";
  addFile(tree, binDir, "hermes", hermesShimContent("/path/hermes-canary"));
  addDir(tree, "/path/hermes-canary/lib", "python3.12");
  addFile(
    tree,
    "/path/hermes-canary/lib/python3.12/site-packages/hermes_cli",
    "__init__.py",
    '__version__ = "CANARY-SECRET-37f1c9a2"\n',
  );
  const result = await resolveHermesVersion(binDir + "/hermes", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "version_unreadable");
});

test("agent-resolution-C10 version do package.json do Codex com formato implausível (canário) vira version_unreadable, nunca exposto", async () => {
  const tree = buildFsTree();
  const dir = "/path/codex-canary";
  installCodexShShim(
    tree,
    dir,
    JSON.stringify({ name: "@openai/codex", version: "CANARY-SECRET-37f1c9a2" }),
  );
  const result = await resolveCodexVersion(dir + "/codex", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "version_unreadable");
});

test("agent-resolution-C10 package.json do Codex acima de 1 MiB vira input_too_large, não launcher_not_recognized", async () => {
  const tree = buildFsTree();
  const dir = "/path/codex-oversized";
  const oversized =
    `{"name":"@openai/codex","version":"0.162.1","padding":"` +
    "x".repeat(1024 * 1024 + 1) +
    `"}`;
  installCodexShShim(tree, dir, oversized);
  const result = await resolveCodexVersion(dir + "/codex", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "input_too_large");
});

// Achado P2 da revisão formal3 (.checks/code-review/formal3-fixes.md, item 1):
// `package.json` com JSON válido `null` fazia `parsed.name` lançar TypeError,
// escapando para o catch de `resolveOneAgent` e virando `presence: unknown`
// mesmo com o artefato encontrado e lido com sucesso — contrariando o
// critério 3 (artefato presente com metadado ilegível nunca é confundido com
// presença indeterminável). Primitivos e arrays no mesmo contêiner não
// lançam (acesso a `.name` de string/número/booleano/array não lança), mas
// são provados aqui ao lado do `null` porque nenhum deles tem `name`: todos
// caem na mesma resposta de "não reconhecido", nunca um erro de acesso.
test("agent-resolution-formal3-1 package.json do Codex com JSON null/primitivo/array não lança; vira launcher_not_recognized, nunca unknown_error", async () => {
  const cases = {
    null: "null",
    string: JSON.stringify("@openai/codex"),
    number: "42",
    boolean: "true",
    array: JSON.stringify(["@openai/codex", "0.162.1"]),
  };
  for (const [label, packageJson] of Object.entries(cases)) {
    const tree = buildFsTree();
    const dir = `/path/codex-metadata-${label}`;
    installCodexShShim(tree, dir, packageJson);
    const result = await resolveCodexVersion(dir + "/codex", { fs: createFakeFsAdapter(tree) });
    assert.equal(result.version, null, label);
    assert.equal(result.reasonCode, "launcher_not_recognized", label);
  }
});

test("agent-resolution-formal3-1 package.json do Codex com JSON null preserva presence: present na resolução completa, nunca unknown", async () => {
  const tree = buildFsTree();
  const dir = "/path/codex-metadata-null-full";
  installCodexShShim(tree, dir, "null");
  const results = await resolveAgents({ pathDirs: [dir], platform: "linux", env: {}, fs: createFakeFsAdapter(tree) });
  const codex = results.find((r) => r.id === "codex");
  assert.equal(codex.presence, "present");
  assert.equal(codex.version, null);
  assert.equal(codex.reasonCode, "launcher_not_recognized");
});

// Controle: package.json válido ao lado dos casos acima continua resolvendo
// a versão normalmente (a correção não afeta o caminho feliz).
test("agent-resolution-formal3-1 package.json do Codex válido continua resolvendo a versão normalmente", async () => {
  const tree = buildFsTree();
  const dir = "/path/codex-metadata-valid-control";
  installCodexShShim(tree, dir);
  const result = await resolveCodexVersion(dir + "/codex", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, "0.162.1");
  assert.equal(result.versionSource, "package_metadata");
});

test("agent-resolution-C10 hermes_cli/__init__.py acima de 1 MiB vira input_too_large, não version_unreadable", async () => {
  const tree = buildFsTree();
  const binDir = "/path/hermes-oversized/bin";
  addFile(tree, binDir, "hermes", hermesShimContent("/path/hermes-oversized"));
  addDir(tree, "/path/hermes-oversized/lib", "python3.12");
  const oversized = `__version__ = "0.21.4"\n# ${"x".repeat(1024 * 1024 + 1)}\n`;
  addFile(
    tree,
    "/path/hermes-oversized/lib/python3.12/site-packages/hermes_cli",
    "__init__.py",
    oversized,
  );
  const result = await resolveHermesVersion(binDir + "/hermes", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "input_too_large");
});

// C1/C2/C3 — o launcher real de um console-script do pip no Windows é
// `hermes.exe` (executável compilado), não apenas `hermes.cmd`. Presença de
// um executável pode ser comprovada mesmo quando seu formato de versão não é
// reconhecido — isso é `version: null` + motivo, não "ausente".
test("agent-resolution-C7 Hermes instalado como hermes.exe no Windows é reconhecido como presente (não absent)", async () => {
  const tree = buildFsTree();
  const dir = "C:\\fixture\\hermes-bin";
  // Launcher real do pip no Windows é um executável compilado, não um
  // script de texto (ver docs/agent-compatibility.md); aqui simulamos
  // apenas bytes opacos, o suficiente para provar que a presença é
  // reconhecida mesmo sem conseguir extrair a versão desse conteúdo.
  addFile(tree, dir, "hermes.exe", Buffer.from([0x4d, 0x5a, 0x00, 0x00]));
  const results = await resolveAgents({
    pathDirs: [dir],
    platform: "win32",
    fs: createFakeFsAdapter(tree),
    childProcess: throwingChildProcess(),
  });
  const hermes = results.find((r) => r.id === "hermes");
  assert.equal(hermes.presence, "present");
  assert.equal(hermes.version, null);
  assert.equal(hermes.path, dir + "\\hermes.exe");
});

test("agent-resolution-C7 um diretório com o nome do agente nunca é tratado como launcher válido", async () => {
  const tree = buildFsTree();
  const dirWithAgentName = "/path/one/claude";
  // "claude" existe como diretório (não arquivo) no primeiro PATH dir; o
  // launcher de verdade só aparece no segundo. addDir registra o diretório
  // na listagem do pai E cria a própria entrada de diretório (com um
  // placeholder dentro), para que stat("/path/one/claude") reconheça um
  // diretório de verdade, não ENOENT.
  addDir(tree, "/path/one", "claude");
  addDir(tree, dirWithAgentName, ".placeholder");
  addFile(tree, "/path/two", "claude", peBytes(V1));
  const results = await resolveAgents({
    pathDirs: ["/path/one", "/path/two"],
    platform: "linux",
    fs: createFakeFsAdapter(tree),
    childProcess: throwingChildProcess(),
  });
  const claude = results.find((r) => r.id === "claude");
  assert.equal(claude.presence, "present");
  assert.equal(claude.path, "/path/two/claude");
  assert.notEqual(claude.path, dirWithAgentName);
});

test("agent-resolution-C7 arquivo sem bit de execução no POSIX não é tratado como launcher válido", async () => {
  const tree = buildFsTree();
  addFile(tree, "/path/one", "claude", peBytes(V1));
  const fs = createFakeFsAdapter(tree);
  fs.markNonExecutable("/path/one/claude");
  const results = await resolveAgents({
    pathDirs: ["/path/one"],
    platform: "linux",
    fs,
    childProcess: throwingChildProcess(),
  });
  const claude = results.find((r) => r.id === "claude");
  assert.equal(claude.presence, "absent");
  assert.equal(claude.reasonCode, "executable_not_found");
});

test("agent-resolution-C2 realpath/symlink real liga o launcher do Codex ao pacote (POSIX)", { skip: process.platform === "win32" }, async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "doctor-codex-symlink-"));
  try {
    const pkgDir = path.join(scratch, "lib", "node_modules", "@openai", "codex");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({ name: "@openai/codex", version: "0.162.1" }),
    );
    mkdirSync(path.join(pkgDir, "bin"), { recursive: true });
    writeFileSync(path.join(pkgDir, "bin", "codex.js"), "#!/usr/bin/env node\n");
    const binDir = path.join(scratch, "bin");
    mkdirSync(binDir, { recursive: true });
    const launcherPath = path.join(binDir, "codex");
    symlinkSync(path.join(pkgDir, "bin", "codex.js"), launcherPath);

    const fsAdapter = { stat, readFile, lstat, realpath };
    const result = await resolveCodexVersion(launcherPath, { fs: fsAdapter });
    assert.equal(result.version, "0.162.1");
    assert.equal(result.versionSource, "package_metadata");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// --- Resolução de launcher no Windows por PATHEXT (achado formal 3) ---
// Cada diretório do PATH é examinado com cada extensão de PATHEXT, na ordem,
// como o Windows resolve um comando sem extensão. Um launcher presente de
// formato não reconhecido continua `present` com versão nula; ele nunca é
// ignorado a ponto de declarar ausência ou de deixar vencer uma instalação
// de um diretório posterior.

const OPAQUE_NATIVE_EXE = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(64)]);

function byId(results) {
  return Object.fromEntries(results.map((r) => [r.id, r]));
}

test("agent-resolution-C3 Windows: codex.exe e claude.cmd de formato não reconhecido ficam present/version null, nunca absent", async () => {
  const tree = buildFsTree();
  const dir = "C:\\apps\\agentes";
  addFile(tree, dir, "codex.exe", OPAQUE_NATIVE_EXE);
  addFile(tree, dir, "claude.cmd", '@ECHO off\r\n"%~dp0\\node_modules\\x\\cli.js" %*\r\n');
  const agents = byId(
    await resolveAgents({ pathDirs: [dir], platform: "win32", fs: createFakeFsAdapter(tree), env: {} }),
  );
  assert.equal(agents.codex.presence, "present");
  assert.equal(agents.codex.path, dir + "\\codex.exe");
  assert.equal(agents.codex.version, null);
  assert.equal(agents.codex.reasonCode, "launcher_not_recognized");
  assert.equal(agents.claude.presence, "present");
  assert.equal(agents.claude.path, dir + "\\claude.cmd");
  assert.equal(agents.claude.version, null);
  assert.equal(agents.claude.reasonCode, "launcher_not_recognized");
});

// Achado formal4 P2 (nº1): candidato Claude legível (MZ/PE/COFF presentes)
// com SizeOfOptionalHeader=0 lançava RangeError dentro de pe.mjs; esse erro
// chegava ao catch de resolveOneAgent e virava presence=unknown, como se o
// candidato não tivesse sido encontrado — contrariando C3 (já encontrado e
// lido). Regressão: antes desta correção este teste falhava com
// presence="unknown"/reasonCode="unknown_error"; agora preserva presence
// "present" com o motivo de formato não reconhecido.
test("agent-resolution-formal4-P2 Windows: claude.exe com SizeOfOptionalHeader=0 continua present/launcher_not_recognized, nunca unknown", async () => {
  const tree = buildFsTree();
  const dir = "C:\\apps\\agentes";
  addFile(tree, dir, "claude.exe", corruptSizeOfOptionalHeader(peBytes(V1), 0));
  const agents = byId(
    await resolveAgents({ pathDirs: [dir], platform: "win32", fs: createFakeFsAdapter(tree), env: {} }),
  );
  assert.equal(agents.claude.presence, "present");
  assert.notEqual(agents.claude.presence, "unknown");
  assert.equal(agents.claude.version, null);
  assert.equal(agents.claude.reasonCode, "launcher_not_recognized");
});

test("agent-resolution-C2 Windows: o primeiro diretório do PATH com qualquer candidato vence, mesmo de formato não reconhecido", async () => {
  const tree = buildFsTree();
  const first = "C:\\primeiro";
  const second = "C:\\segundo";
  addFile(tree, first, "codex.exe", OPAQUE_NATIVE_EXE);
  addFile(tree, first, "claude.cmd", "@ECHO off\r\necho launcher alheio\r\n");
  installCodexGlobal(tree, second, "win32");
  addFile(tree, second, "claude.exe", peBytes(V1));
  const agents = byId(
    await resolveAgents({
      pathDirs: [first, second],
      platform: "win32",
      fs: createFakeFsAdapter(tree),
      env: {},
    }),
  );
  assert.equal(agents.codex.path, first + "\\codex.exe");
  assert.equal(agents.codex.version, null, "a versão do segundo diretório não pode ser atribuída");
  assert.equal(agents.claude.path, first + "\\claude.cmd");
  assert.equal(agents.claude.version, null, "a versão do segundo diretório não pode ser atribuída");
});

test("agent-resolution-C2 Windows: no mesmo diretório a ordem de PATHEXT decide; PATHEXT do ambiente é respeitado e entradas inválidas ignoradas", async () => {
  const tree = buildFsTree();
  const dir = "C:\\npm-prefix";
  addFile(tree, dir, "codex.exe", OPAQUE_NATIVE_EXE);
  installCodexGlobal(tree, dir, "win32");
  const fs = createFakeFsAdapter(tree);

  const byDefault = byId(await resolveAgents({ pathDirs: [dir], platform: "win32", fs, env: {} }));
  assert.equal(byDefault.codex.path, dir + "\\codex.exe", "default .COM;.EXE;.BAT;.CMD põe .exe antes de .cmd");

  const cmdFirst = byId(
    await resolveAgents({ pathDirs: [dir], platform: "win32", fs, env: { PATHEXT: ".CMD;.EXE" } }),
  );
  assert.equal(cmdFirst.codex.path, dir + "\\codex.cmd");
  assert.equal(cmdFirst.codex.version, "0.162.1");

  const withInvalid = byId(
    await resolveAgents({
      pathDirs: [dir],
      platform: "win32",
      fs,
      env: { PATHEXT: "\\..\\..\\fora;.CMD;;" },
    }),
  );
  assert.equal(withInvalid.codex.path, dir + "\\codex.cmd", "entrada que não é extensão nunca vira candidato");
});

test("agent-resolution-C14 codex.exe nativo acima de 1 MiB é lido só pelo cabeçalho: launcher_not_recognized, não input_too_large", async () => {
  const tree = buildFsTree();
  const dir = "C:\\Codex\\bin";
  addFile(tree, dir, "codex.exe", Buffer.concat([Buffer.from("MZ"), Buffer.alloc(2 * 1024 * 1024)]));
  const fs = createFakeFsAdapter(tree);
  let bytesRequested = 0;
  fs.open = async (filePath) => {
    const content = await fs.readFile(filePath);
    return {
      async read(buffer, offset, length, position) {
        bytesRequested += length;
        const bytesRead = Math.max(0, Math.min(length, content.length - position));
        if (bytesRead > 0) content.copy(buffer, offset, position, position + bytesRead);
        return { bytesRead };
      },
      async stat() {
        return { size: content.length };
      },
      async close() {},
    };
  };
  const agents = byId(await resolveAgents({ pathDirs: [dir], platform: "win32", fs, env: {} }));
  assert.equal(agents.codex.presence, "present");
  assert.equal(agents.codex.version, null);
  assert.equal(agents.codex.reasonCode, "launcher_not_recognized");
  assert.ok(bytesRequested <= 4096, `só o cabeçalho deve ser lido, pediu ${bytesRequested} bytes`);
});

// --- Shim npm local e referências relativas (achado formal 4) ---

test("agent-resolution-C2 shim local do npm no Windows (node_modules\\.bin\\codex.cmd com %dp0%\\..\\@openai\\codex) resolve o pacote real", async () => {
  const tree = buildFsTree();
  const binDir = "C:\\projeto com espaço\\node_modules\\.bin";
  addFile(tree, binDir, "codex.cmd", npmCmdShim(CODEX_LOCAL_WINDOWS_TARGET));
  addFile(tree, "C:\\projeto com espaço\\node_modules\\@openai\\codex", "package.json", CODEX_PACKAGE_JSON);
  // Um package.json de @openai/codex DENTRO de .bin (o layout fictício
  // anterior) não pode ser o escolhido: a referência real sobe um nível.
  addFile(
    tree,
    binDir + "\\node_modules\\@openai\\codex",
    "package.json",
    JSON.stringify({ name: "@openai/codex", version: "9.9.9" }),
  );
  const fs = createFakeFsAdapter(tree);

  const direct = await resolveCodexVersion(binDir + "\\codex.cmd", { fs });
  assert.equal(direct.version, "0.162.1");
  assert.equal(direct.versionSource, "package_metadata");

  const agents = byId(await resolveAgents({ pathDirs: [binDir], platform: "win32", fs, env: {} }));
  assert.equal(agents.codex.path, binDir + "\\codex.cmd");
  assert.equal(agents.codex.version, "0.162.1");
});

test("agent-resolution-C2 shim sh do cmd-shim ($basedir/../@openai/codex) resolve o pacote real", async () => {
  const tree = buildFsTree();
  const binDir = "/srv/projeto/node_modules/.bin";
  addFile(tree, binDir, "codex", npmShShim(CODEX_LOCAL_SH_TARGET));
  addFile(tree, "/srv/projeto/node_modules/@openai/codex", "package.json", CODEX_PACKAGE_JSON);
  const result = await resolveCodexVersion(binDir + "/codex", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, "0.162.1");
  assert.equal(result.versionSource, "package_metadata");
});

test("agent-resolution-C2 link simbólico local do npm no POSIX (node_modules/.bin/codex -> ../@openai/codex/bin/codex.js) resolve por realpath", async () => {
  const tree = buildFsTree();
  const pkgDir = "/srv/projeto/node_modules/@openai/codex";
  addFile(tree, pkgDir, "package.json", CODEX_PACKAGE_JSON);
  addFile(tree, pkgDir + "/bin", "codex.js", "#!/usr/bin/env node\n");
  addSymlink(tree, "/srv/projeto/node_modules/.bin", "codex", pkgDir + "/bin/codex.js");
  const agents = byId(
    await resolveAgents({
      pathDirs: ["/srv/projeto/node_modules/.bin"],
      platform: "linux",
      fs: createFakeFsAdapter(tree),
      env: {},
    }),
  );
  assert.equal(agents.codex.version, "0.162.1");
  assert.equal(agents.codex.versionSource, "package_metadata");
});

test("agent-resolution-C3 referência relativa que sai de node_modules não é vínculo ao pacote", async () => {
  const tree = buildFsTree();
  const binDir = "C:\\proj\\node_modules\\.bin";
  addFile(tree, binDir, "codex.cmd", npmCmdShim("..\\..\\evil\\@openai\\codex\\bin\\codex.js"));
  addFile(
    tree,
    "C:\\proj\\evil\\@openai\\codex",
    "package.json",
    JSON.stringify({ name: "@openai/codex", version: "9.9.9" }),
  );
  const result = await resolveCodexVersion(binDir + "\\codex.cmd", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "launcher_not_recognized");
});

// --- Hermes com vários pythonX.Y no mesmo prefixo (achado formal 5) ---

function installHermesTwoPythons(tree, root, shebang) {
  addFile(
    tree,
    root + "/bin",
    "hermes",
    `${shebang}\nimport sys\nfrom hermes_cli.main import main\nsys.exit(main())\n`,
  );
  addDir(tree, root + "/lib", "python3.12");
  addDir(tree, root + "/lib", "python3.11");
  addFile(tree, root + "/lib/python3.11/site-packages/hermes_cli", "__init__.py", '__version__ = "0.20.0"\n');
  addFile(tree, root + "/lib/python3.12/site-packages/hermes_cli", "__init__.py", '__version__ = "0.21.4"\n');
  return root + "/bin/hermes";
}

// Até a revisão formal7 este teste também esperava a versão por
// `#!/usr/bin/env python3.11` e `#!/usr/bin/env -S python3.12 -u`: o env
// procura o nome no PATH de quem executa, então o pythonX.Y do PATH não é o
// deste prefixo só porque o launcher mora aqui. Essas formas estão agora na
// matriz negativa formal7; o env com um único caminho absoluto fixa o
// intérprete (POSIX: com <slash>, não há busca no PATH).
test("agent-resolution-C2 Hermes: com python3.11 e python3.12 no prefixo, o pythonX.Y do shebang escolhe a fonte de versão", async () => {
  for (const [shebang, expected, pythonDir] of [
    ["#!/opt/hermes/bin/python3.12", "0.21.4", "python3.12"],
    ["#!/opt/hermes/bin/python3.11", "0.20.0", "python3.11"],
    ["#!/usr/bin/env /opt/hermes/bin/python3.11", "0.20.0", "python3.11"],
  ]) {
    const tree = buildFsTree();
    const launcher = installHermesTwoPythons(tree, "/opt/hermes", shebang);
    const result = await resolveHermesVersion(launcher, { fs: createFakeFsAdapter(tree) });
    assert.equal(result.version, expected, shebang);
    assert.equal(result.versionSource, "source_literal", shebang);
    assert.equal(
      result.packageDir,
      `/opt/hermes/lib/${pythonDir}/site-packages/hermes_cli`,
      `${shebang}: a fonte de contrato precisa ser o mesmo pacote da versão`,
    );
  }
});

// `#!/usr/bin/env python3` e o `#!/bin/sh` sem trampolim também esperavam
// version_source_ambiguous até a revisão formal7, mas nenhum dos dois fixa o
// intérprete: agora param antes, em launcher_not_recognized (matriz negativa
// formal7). Aqui ficam só intérpretes fixados sem X.Y.
test("agent-resolution-C3 Hermes: shebang sem versão e dois pythonX.Y com hermes_cli fica version_source_ambiguous, nunca o primeiro lexical", async () => {
  for (const shebang of ["#!/opt/hermes/bin/python3", "#!/opt/hermes/bin/python", "#!/usr/bin/env /opt/hermes/bin/python3"]) {
    const tree = buildFsTree();
    const launcher = installHermesTwoPythons(tree, "/opt/hermes", shebang);
    const result = await resolveHermesVersion(launcher, { fs: createFakeFsAdapter(tree) });
    assert.equal(result.version, null, shebang);
    assert.equal(result.reasonCode, "version_source_ambiguous", shebang);
  }
});

test("agent-resolution-C3 Hermes: shebang aponta python3.13 sem pacote correspondente — não usa a fonte de outro intérprete", async () => {
  const tree = buildFsTree();
  const launcher = installHermesTwoPythons(tree, "/opt/hermes", "#!/opt/hermes/bin/python3.13");
  const result = await resolveHermesVersion(launcher, { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "launcher_not_recognized");
});

// Achado G4 da rodada 3: launcher em /a/bin/hermes com shebang absoluto para
// um intérprete de OUTRO prefixo (/b/bin/python3.12) não pode publicar a
// versão/fonte do pacote de A só por proximidade de diretório — o intérprete
// de verdade está em B. O vínculo precisa seguir o prefixo do próprio
// shebang (B), nunca o do launcher (A).
test("agent-resolution-C2/C3/C5 Hermes: shebang com caminho absoluto de outro prefixo liga ao pacote desse prefixo, nunca ao do launcher", async () => {
  const tree = buildFsTree();
  addFile(
    tree,
    "/a/bin",
    "hermes",
    "#!/b/bin/python3.12\nimport sys\nfrom hermes_cli.main import main\nsys.exit(main())\n",
  );
  addDir(tree, "/a/lib", "python3.12");
  addFile(tree, "/a/lib/python3.12/site-packages/hermes_cli", "__init__.py", '__version__ = "0.21.4"\n');
  addDir(tree, "/b/lib", "python3.12");
  addFile(tree, "/b/lib/python3.12/site-packages/hermes_cli", "__init__.py", '__version__ = "0.20.0"\n');

  const result = await resolveHermesVersion("/a/bin/hermes", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, "0.20.0", "a fonte precisa ser a do intérprete real (B), não a do launcher (A)");
  assert.notEqual(result.version, "0.21.4");
  assert.equal(result.versionSource, "source_literal");
  assert.equal(result.packageDir, "/b/lib/python3.12/site-packages/hermes_cli");
});

test("agent-resolution-C3 Hermes: shebang de outro prefixo sem pacote correspondente lá fica inconclusivo, nunca cai para o prefixo do launcher", async () => {
  const tree = buildFsTree();
  addFile(
    tree,
    "/a/bin",
    "hermes",
    "#!/b/bin/python3.12\nimport sys\nfrom hermes_cli.main import main\nsys.exit(main())\n",
  );
  addDir(tree, "/a/lib", "python3.12");
  addFile(tree, "/a/lib/python3.12/site-packages/hermes_cli", "__init__.py", '__version__ = "0.21.4"\n');
  // /b existe, mas sem hermes_cli nenhum em python3.12.
  addDir(tree, "/b/lib", "python3.12");

  const result = await resolveHermesVersion("/a/bin/hermes", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "launcher_not_recognized");
});

// Achado G4 da rodada 3, variante residual (.checks/code-review/verifier3-
// fix-residuals.md): a primeira correção só reconhecia um caminho absoluto
// terminado em `pythonX.Y`; `referencesHermesCli` já reconhece `python`/
// `python3` bare (sem versão) como intérprete Python válido para decidir se o
// shim é Python — o vínculo de prefixo precisa cobrir a MESMA família de
// nomes, não só a versionada. Reprodução real em
// `.checks/code-review/probe-verifier3-residual.mjs`.
test("agent-resolution-G4 Hermes: shebang absoluto SEM X.Y (python/python3 bare) de outro prefixo liga ao pacote desse prefixo, nunca ao do launcher", async () => {
  for (const interpreter of ["python", "python3"]) {
    const tree = buildFsTree();
    addFile(tree, "/a/bin", "hermes", `#!/b/bin/${interpreter}\nfrom hermes_cli.main import main\n`);
    addDir(tree, "/a/lib", "python3.12");
    addFile(tree, "/a/lib/python3.12/site-packages/hermes_cli", "__init__.py", '__version__ = "0.21.4"\n');
    addDir(tree, "/b/lib", "python3.12");
    addFile(tree, "/b/lib/python3.12/site-packages/hermes_cli", "__init__.py", '__version__ = "0.20.0"\n');

    const result = await resolveHermesVersion("/a/bin/hermes", { fs: createFakeFsAdapter(tree) });
    assert.equal(result.version, "0.20.0", `${interpreter}: fonte precisa ser a do intérprete real (B)`);
    assert.notEqual(result.version, "0.21.4", interpreter);
    assert.equal(result.versionSource, "source_literal", interpreter);
    assert.equal(result.packageDir, "/b/lib/python3.12/site-packages/hermes_cli", interpreter);
  }
});

test("agent-resolution-G4 Hermes: shebang absoluto SEM X.Y de outro prefixo sem pacote lá fica inconclusivo, nunca cai para o prefixo do launcher", async () => {
  const tree = buildFsTree();
  addFile(tree, "/a/bin", "hermes", "#!/b/bin/python3\nfrom hermes_cli.main import main\n");
  addDir(tree, "/a/lib", "python3.12");
  addFile(tree, "/a/lib/python3.12/site-packages/hermes_cli", "__init__.py", '__version__ = "0.21.4"\n');
  // /b existe, mas sem hermes_cli nenhum em nenhum pythonX.Y.
  addDir(tree, "/b/lib", "python3.12");

  const result = await resolveHermesVersion("/a/bin/hermes", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, null);
  assert.notEqual(result.version, "0.21.4");
  assert.equal(result.reasonCode, "launcher_not_recognized");
});

test("agent-resolution-G4 Hermes: shebang absoluto SEM X.Y de outro prefixo com dois pythonX.Y ambíguos fica version_source_ambiguous, nunca usa o do launcher", async () => {
  const tree = buildFsTree();
  addFile(tree, "/a/bin", "hermes", "#!/b/bin/python\nfrom hermes_cli.main import main\n");
  addDir(tree, "/a/lib", "python3.12");
  addFile(tree, "/a/lib/python3.12/site-packages/hermes_cli", "__init__.py", '__version__ = "0.21.4"\n');
  // /b tem hermes_cli em DOIS pythonX.Y — sem versão no shebang para desempatar.
  addDir(tree, "/b/lib", "python3.11");
  addFile(tree, "/b/lib/python3.11/site-packages/hermes_cli", "__init__.py", '__version__ = "0.19.0"\n');
  addDir(tree, "/b/lib", "python3.12");
  addFile(tree, "/b/lib/python3.12/site-packages/hermes_cli", "__init__.py", '__version__ = "0.20.0"\n');

  const result = await resolveHermesVersion("/a/bin/hermes", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, null);
  assert.notEqual(result.version, "0.21.4");
  assert.equal(result.reasonCode, "version_source_ambiguous");
});

// Variante residual de G4: "caminho absoluto" exige separador NO INÍCIO
// (POSIX "/" ou unidade/UNC do Windows), não qualquer string que contenha uma
// barra. Um intérprete relativo com barra (`venv/bin/python3.12`, sem `/`
// inicial) não liga a um prefixo "venv" inexistente. Até a revisão formal7
// este teste esperava 0.21.4 do prefixo do PRÓPRIO launcher, "igual ao caso
// env" — a mesma presunção do achado: o caminho relativo do shebang é
// resolvido a partir do diretório de trabalho de quem executa, não do
// launcher. Fica inconclusivo, sem nenhum pacote.
test("agent-resolution-G4 Hermes: intérprete relativo com barra (sem caminho absoluto) não inventa prefixo nem presume o do launcher", async () => {
  const tree = buildFsTree();
  const launcher = installHermesTwoPythons(tree, "/opt/hermes", "#!venv/bin/python3.12");

  const result = await resolveHermesVersion(launcher, { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "launcher_not_recognized");
  assert.equal(result.versionSource, undefined);
  assert.equal(result.packageDir, undefined);
});

// --- Vínculo só pela invocação do template npm (pré-revisão formal) ---
// Todo caso traz o pacote real ao lado do shim e a referência certa no texto;
// só a POSIÇÃO da referência muda. Uma menção (echo, here-document, string
// multilinha, continuação de outro comando, linha do outro dialeto) não
// executa o node com o arquivo de entrada do pacote, então não é vínculo. O
// controle positivo usa o mesmo layout com o template nativo.

const SH_INVOCATION_LINE = `  exec node  "$basedir/${CODEX_GLOBAL_SH_TARGET}" "$@"`;
const CMD_INVOCATION_LINE = npmCmdShim(CODEX_GLOBAL_WINDOWS_TARGET).trimEnd().split("\r\n").at(-1);

async function codexVersionNextToPackage(dir, launcherName, content) {
  const sep = dir.includes("\\") ? "\\" : "/";
  const tree = buildFsTree();
  addFile(tree, dir, launcherName, content);
  addFile(tree, [dir, "node_modules", "@openai", "codex"].join(sep), "package.json", CODEX_PACKAGE_JSON);
  return resolveCodexVersion(dir + sep + launcherName, { fs: createFakeFsAdapter(tree) });
}

test("agent-resolution-C3 shim do Codex que só menciona a referência do pacote não é vínculo; o template nativo no mesmo layout é", async () => {
  const shDir = "/srv/menção";
  const cmdDir = "C:\\menção";
  const shNative = await codexVersionNextToPackage(shDir, "codex", npmShShim(CODEX_GLOBAL_SH_TARGET));
  assert.equal(shNative.version, "0.162.1", "controle: template sh nativo");
  const cmdNative = await codexVersionNextToPackage(cmdDir, "codex.cmd", npmCmdShim(CODEX_GLOBAL_WINDOWS_TARGET));
  assert.equal(cmdNative.version, "0.162.1", "controle: template cmd nativo");

  const shCases = {
    "echo da referência (probe da pré-revisão)": `#!/bin/sh\necho "$basedir/${CODEX_GLOBAL_SH_TARGET}"\nexit 0\n`,
    "linha de invocação impressa por echo": `#!/bin/sh\necho ${SH_INVOCATION_LINE.trim()}\n`,
    "linha de invocação dentro de here-document": `#!/bin/sh\ncat <<'EOF'\n${SH_INVOCATION_LINE}\nEOF\n`,
    "linha de invocação dentro de string multilinha": `#!/bin/sh\necho '\n${SH_INVOCATION_LINE}\n'\n`,
    "linha de invocação continuando o echo anterior": `#!/bin/sh\necho \\\n${SH_INVOCATION_LINE}\n`,
    "linha do template .cmd num shim sh": `#!/bin/sh\n${CMD_INVOCATION_LINE}\n`,
  };
  for (const [label, content] of Object.entries(shCases)) {
    const result = await codexVersionNextToPackage(shDir, "codex", content);
    assert.equal(result.version, null, label);
    assert.equal(result.reasonCode, "launcher_not_recognized", label);
  }

  const cmdCases = {
    "echo da referência": `@ECHO off\r\necho "%dp0%\\${CODEX_GLOBAL_WINDOWS_TARGET}" %*\r\n`,
    "invocação sem o início do template, impressa por echo": `@ECHO off\r\necho "%_prog%"  "%dp0%\\${CODEX_GLOBAL_WINDOWS_TARGET}" %*\r\n`,
    "linha do template sh num .cmd": `@ECHO off\r\n${SH_INVOCATION_LINE}\r\n`,
    // Leitura conservadora: a linha que continua outra (^ no fim da anterior)
    // nunca é tratada como início de comando, nem atrás de um REM.
    "linha do template continuando a linha anterior": `@ECHO off\r\nREM ^\r\n${CMD_INVOCATION_LINE}\r\n`,
  };
  for (const [label, content] of Object.entries(cmdCases)) {
    const result = await codexVersionNextToPackage(cmdDir, "codex.cmd", content);
    assert.equal(result.version, null, label);
    assert.equal(result.reasonCode, "launcher_not_recognized", label);
  }
});

// --- Versão e import do Hermes só em código Python real (pré-revisão formal) ---

const HERMES_PY312_LAUNCHER =
  "#!/opt/hermes/bin/python3.12\nimport sys\nfrom hermes_cli.main import main\nsys.exit(main())\n";

async function hermesVersionWith(initSource, launcher = HERMES_PY312_LAUNCHER) {
  const tree = buildFsTree();
  addFile(tree, "/opt/hermes/bin", "hermes", launcher);
  addDir(tree, "/opt/hermes/lib", "python3.12");
  addFile(tree, "/opt/hermes/lib/python3.12/site-packages/hermes_cli", "__init__.py", initSource);
  return resolveHermesVersion("/opt/hermes/bin/hermes", { fs: createFakeFsAdapter(tree) });
}

test("agent-resolution-C3 __version__ só em comentário, docstring ou outra string não é a versão do pacote", async () => {
  const cases = {
    "comentário (probe da pré-revisão)": '# __version__ = "0.21.4"\n',
    "comentário depois de código": 'X = 1  # __version__ = "0.21.4"\n',
    "docstring do módulo": '"""Notas.\n__version__ = "0.21.4"\n"""\n',
    "conteúdo de outra string": "EXEMPLO = '__version__ = \"0.21.4\"'\n",
  };
  for (const [label, initSource] of Object.entries(cases)) {
    const result = await hermesVersionWith(initSource);
    assert.equal(result.version, null, label);
    assert.equal(result.reasonCode, "version_unreadable", label);
    assert.equal(result.versionSource, undefined, label);
    assert.equal(result.packageDir, undefined, `${label}: sem versão, nenhuma fonte de contrato é ligada`);
  }
});

test("agent-resolution-C3 __version__ em código: literal no nível do módulo é a versão; expressão ou outra ligação não", async () => {
  // Forma do __init__.py instalado (docstring, imports, __version__ e
  // __release_date__), com uma docstring de função citando outra versão.
  const installedShape =
    '"""Hermes CLI - interface de linha de comando."""\n\nimport os\nimport sys\n\n' +
    '__version__ = "0.21.4"\n__release_date__ = "2026.9.21"\n\n\n' +
    'def _exemplo():\n    """Cita __version__ = "9.9.9" só como exemplo."""\n    return os, sys\n';
  const recognized = await hermesVersionWith(installedShape);
  assert.equal(recognized.version, "0.21.4");
  assert.equal(recognized.versionSource, "source_literal");
  assert.equal(recognized.packageDir, "/opt/hermes/lib/python3.12/site-packages/hermes_cli");

  const unreadable = {
    "literal seguido de concatenação": '__version__ = "0.21.4" + "-dev"\n',
    "literal seguido de outra instrução": '__version__ = "0.21.4"; __version__ = "0.22.0"\n',
    "valor não literal": "__version__ = _ler_versao()\n",
  };
  for (const [label, initSource] of Object.entries(unreadable)) {
    const result = await hermesVersionWith(initSource);
    assert.equal(result.version, null, label);
    assert.equal(result.reasonCode, "version_unreadable", label);
  }

  const ambiguous = {
    "reatribuição indentada": '__version__ = "0.21.4"\nif DEV:\n    __version__ = "0.22.0"\n',
    "reatribuição não literal": '__version__ = "0.21.4"\n__version__ = _ler_versao()\n',
  };
  for (const [label, initSource] of Object.entries(ambiguous)) {
    const result = await hermesVersionWith(initSource);
    assert.equal(result.version, null, label);
    assert.equal(result.reasonCode, "version_source_ambiguous", label);
  }
});

// Achado formal4 P2 (nº2): `__version__ += "-dev"` não era reconhecida como
// ligação por findAssignments (o tokenizer já reconhecia o operador, mas
// nada marcava a ocorrência como ligação do nome) — a segunda instrução
// ficava invisível para extractSourceLiteralVersion, que publicava o literal
// da primeira atribuição como se fosse o único e, com uma tabela de contrato
// válida ao lado, liberava "verified" para uma versão efetiva diferente da
// publicada. Regressão: antes desta correção os casos abaixo publicavam
// "0.21.4" (o literal da primeira atribuição); agora toda atribuição
// aumentada marca uma ligação ambígua sem avaliar o valor, igual a `:=` e à
// reatribuição indentada já cobertas acima.
test("agent-resolution-formal4-P2 Hermes: __version__ com atribuição aumentada (+=, -=, ...) nunca publica o literal anterior; vira version_source_ambiguous", async () => {
  const AUGMENTED_OPERATORS = ["+=", "-=", "*=", "/=", "//=", "%=", "**=", "&=", "|=", "^=", ">>=", "<<=", "@="];
  for (const op of AUGMENTED_OPERATORS) {
    const result = await hermesVersionWith(`__version__ = "0.21.4"\n__version__ ${op} "-dev"\n`);
    assert.equal(result.version, null, op);
    assert.notEqual(result.version, "0.21.4", op);
    assert.equal(result.reasonCode, "version_source_ambiguous", op);
  }
});

test("agent-resolution-formal4-P2 Hermes: atribuição aumentada em comentário/string/outra variável não afeta __version__; só a ligação real do próprio nome conta", async () => {
  const unaffected = {
    "comentário": '__version__ = "0.21.4"\n# __version__ += "-dev"\n',
    "dentro de string": `__version__ = "0.21.4"\nX = '__version__ += "-dev"'\n`,
    "outra variável": '__version__ = "0.21.4"\nOTHER_VAR += "-dev"\n',
  };
  for (const [label, initSource] of Object.entries(unaffected)) {
    const result = await hermesVersionWith(initSource);
    assert.equal(result.version, "0.21.4", label);
    assert.equal(result.versionSource, "source_literal", label);
  }

  // Esta leitura é léxica, não um parser Python: `obj.__version__` traz o
  // mesmo nome de token que o `__version__` do módulo. Na dúvida, a
  // ocorrência conta como ligação (mesma regra já aplicada a
  // `obj.__version__ = ...` com "=" simples, que também gera ambiguidade) —
  // ambíguo é o resultado seguro, nunca publicar 0.21.4 como se a atribuição
  // ao atributo não existisse.
  const attributeResult = await hermesVersionWith('__version__ = "0.21.4"\nobj.__version__ += "-dev"\n');
  assert.equal(attributeResult.version, null);
  assert.equal(attributeResult.reasonCode, "version_source_ambiguous");

  // Comportamento já existente (independente desta correção): o filtro de
  // literais em extractSourceLiteralVersion só aceita um valor cujo token
  // seguinte seja uma quebra de linha real (endsStatement); encadeado por
  // ";" o próprio literal da primeira atribuição não passa nesse filtro, e
  // a segunda ligação (a atribuição aumentada) nunca chega a ser lida como
  // literal — version_unreadable, não version_source_ambiguous.
  const semicolonResult = await hermesVersionWith('__version__ = "0.21.4"; __version__ += "-dev"\n');
  assert.equal(semicolonResult.version, null);
  assert.equal(semicolonResult.reasonCode, "version_unreadable");

  const indentedResult = await hermesVersionWith('__version__ = "0.21.4"\nif DEV:\n    __version__ += "-dev"\n');
  assert.equal(indentedResult.version, null);
  assert.equal(indentedResult.reasonCode, "version_source_ambiguous");
});

// Verificação independente 9 (.checks/code-review/formal5-grouped-binding-
// fixes.md): `(__version__) += "-dev"` é a mesma atribuição aumentada dos
// testes formal4 acima, só com o alvo agrupado (single_target do CPython, ver
// helpers/grouped-augmented-targets.mjs), e ainda publicava 0.21.4.
test("agent-resolution-formal5-grouped-binding Hermes: __version__ agrupado com atribuição aumentada, em qualquer forma e operador, vira version_source_ambiguous e nunca publica o literal anterior", async () => {
  const published = [];
  let checked = 0;
  for (const [shape, template] of Object.entries(GROUPED_AUGMENTED_TARGETS)) {
    for (const op of AUGMENTED_OPERATORS) {
      checked += 1;
      const statement = groupedAugmentedStatement(template, "__version__", op, '"-dev"');
      const result = await hermesVersionWith(`__version__ = "0.21.4"\n${statement}\n`);
      if (result.version !== null || result.versionSource !== undefined || result.reasonCode !== "version_source_ambiguous") {
        published.push(`${shape}/${op} -> ${JSON.stringify(result)}`);
      }
    }
  }
  assert.equal(checked, 12 * 13);
  assert.deepEqual(published, []);
});

// Controles: `__version__` agrupado sem ligação do próprio nome mantém o
// literal — comparação (operadores que também terminam em "="), argumento,
// subscrito de outro objeto, outra variável agrupada, comentário e string.
test("agent-resolution-formal5-grouped-binding Hermes: __version__ agrupado em leitura, comparação, comentário, string ou outra variável preserva 0.21.4", async () => {
  const unaffected = {
    "argumento agrupado": "registrar((__version__))",
    "comparação ==": 'IGUAL = (__version__) == "0.21.4"',
    "comparação !=": 'DIFERENTE = ((__version__)) != "0.21.4"',
    "comparação <=": 'ANTIGA = (\n    __version__  # agrupado\n) <= "0.22"',
    "comparação >=": 'NOVA = (__version__) >= "0.21"',
    "subscrito de outro objeto": "CONTAGEM[(__version__)] += 1",
    "outra variável agrupada": '(OTHER_VAR) += "-dev"',
    "comentário": '# (__version__) += "-dev"',
    "dentro de string": `X = '(__version__) += "-dev"'`,
  };
  for (const [label, statement] of Object.entries(unaffected)) {
    const result = await hermesVersionWith(`__version__ = "0.21.4"\n${statement}\n`);
    assert.equal(result.version, "0.21.4", label);
    assert.equal(result.versionSource, "source_literal", label);
  }
});

// Revisão formal6 (.checks/code-review/formal6-fixes.md): `case __version__:`
// e `with C() as (__version__, outro):` ligam o nome sem `=` (formas em
// helpers/binding-captures.mjs) e ainda publicavam o literal anterior.
test("agent-resolution-formal6-captures Hermes: __version__ capturado em padrão case ou no alvo de with vira version_source_ambiguous e nunca publica o literal anterior", async () => {
  const published = [];
  let checked = 0;
  for (const [shape, template] of Object.entries({ ...CASE_CAPTURE_PATTERNS, ...WITH_CAPTURE_TARGETS })) {
    checked += 1;
    const statement = captureStatement(template, "__version__", '"0.20.0"');
    const result = await hermesVersionWith(`__version__ = "0.21.4"\n${statement}\n`);
    if (result.version !== null || result.versionSource !== undefined || result.reasonCode !== "version_source_ambiguous") {
      published.push(`${shape} -> ${JSON.stringify(result)}`);
    }
  }
  assert.equal(checked, 20 + 10);
  assert.deepEqual(published, []);
});

test("agent-resolution-formal6-captures Hermes: __version__ em guarda, subject, corpo, valor pontuado, classe, case/match comuns, contexto do with, comentário ou string preserva 0.21.4", async () => {
  for (const [label, template] of Object.entries(CAPTURE_CONTROLS)) {
    const statement = captureStatement(template, "__version__", '"0.20.0"');
    const result = await hermesVersionWith(`__version__ = "0.21.4"\n${statement}\n`);
    assert.equal(result.version, "0.21.4", label);
    assert.equal(result.versionSource, "source_literal", label);
  }
});

// Limites conservadores declarados: sem avaliar Python, um nome dentro de
// subscrito no alvo do with e `case[...]: T` (anotação de `case[...]`, lida
// como case_block) contam como ligação — ambíguo, nunca o literal anterior.
test("agent-resolution-formal6-captures Hermes: subscrito no alvo do with e anotação de case[...] ficam ambíguos", async () => {
  for (const statement of ["with C() as cache[__version__]:\n    pass", "case[__version__]: int = 1"]) {
    const result = await hermesVersionWith(`__version__ = "0.21.4"\n${statement}\n`);
    assert.equal(result.version, null, statement);
    assert.equal(result.reasonCode, "version_source_ambiguous", statement);
  }
});

test("agent-resolution-C3 launcher Python do Hermes que cita o import de hermes_cli só em docstring não é vínculo", async () => {
  const docstringOnly =
    '#!/opt/hermes/bin/python3.12\n"""Uso:\nfrom hermes_cli.main import main\n"""\nimport sys\nsys.exit(0)\n';
  const result = await hermesVersionWith('__version__ = "0.21.4"\n', docstringOnly);
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "launcher_not_recognized");
  const control = await hermesVersionWith('__version__ = "0.21.4"\n');
  assert.equal(control.version, "0.21.4", "controle: import em código no mesmo layout");
});

// --- Intérprete fixado pelo próprio launcher (revisão formal7) ---
// .checks/code-review/formal7-fixes.md: com PATH=/b/bin:/a/bin, só /a/bin tem
// o launcher, e `#!/usr/bin/env python3.12` faz o env procurar python3.12 no
// PATH de quem executa — o de /b, venv com Hermes 0.20.0. O leitor presumia o
// prefixo do launcher e publicava 0.21.4 de /a, cujo catálogo ainda liberava
// verified/configured/trusted. Sem um intérprete fixado pelo texto do
// launcher, nenhum dos dois pacotes pode ser atribuído: versão nula,
// launcher_not_recognized e nenhum packageDir (nenhum catálogo é lido).

const HERMES_IMPORT_BODY = "import sys\nfrom hermes_cli.main import main\nsys.exit(main())\n";

// Corpo que o distlib grava no console-script (SCRIPT_TEMPLATE de
// distlib/scripts.py), com o import dentro do guarda de __main__.
const DISTLIB_SCRIPT_BODY =
  "# -*- coding: utf-8 -*-\nimport re\nimport sys\nif __name__ == '__main__':\n" +
  "    from hermes_cli.main import main\n" +
  "    sys.argv[0] = re.sub(r'(-script\\.pyw|\\.exe)?$', '', sys.argv[0])\n" +
  "    sys.exit(main())\n";

function distlibTrampoline(executable) {
  return `#!/bin/sh\n'''exec' ${executable} "$0" "$@"\n' '''\n${DISTLIB_SCRIPT_BODY}`;
}

// Dois prefixos contraditórios, cada um com seu pacote e catálogo: A é o do
// launcher (0.21.4) e B o de outro Python (0.20.0), que um PATH como B:A
// escolheria em tempo de execução. O intérprete de B é dado de fixture, nunca
// executado nem lido. `.cmd` usa o layout do Windows.
function installContradictoryHermesPrefixes(
  launcherName,
  content,
  { other = "/b", packageInLauncherPrefix = true, packageInOtherPrefix = true } = {},
) {
  const tree = buildFsTree();
  const windows = launcherName.endsWith(".cmd");
  const sep = windows ? "\\" : "/";
  const [a, b] = windows ? ["C:\\a", "C:\\b"] : ["/a", other];
  const binDirOf = (prefix) => prefix + sep + (windows ? "Scripts" : "bin");
  const packageDirOf = (prefix) =>
    windows ? `${prefix}\\Lib\\site-packages\\hermes_cli` : `${prefix}/lib/python3.12/site-packages/hermes_cli`;
  addFile(tree, binDirOf(a), launcherName, content);
  addFile(tree, binDirOf(b), windows ? "python.exe" : "python3.12", "stub de intérprete, nunca executado\n");
  for (const [prefix, version, installed] of [
    [a, "0.21.4", packageInLauncherPrefix],
    [b, "0.20.0", packageInOtherPrefix],
  ]) {
    if (!windows) addDir(tree, `${prefix}/lib`, "python3.12");
    if (!installed) continue;
    addFile(tree, packageDirOf(prefix), "__init__.py", `__version__ = "${version}"\n`);
    addFile(tree, packageDirOf(prefix), "plugins.py", hermesPluginsSource());
  }
  return { tree, launcher: binDirOf(a) + sep + launcherName, packageDirOf };
}

const UNBOUND_HERMES_LAUNCHERS = {
  hermes: {
    "env python3.12 (cenário do achado)": `#!/usr/bin/env python3.12\n${HERMES_IMPORT_BODY}`,
    "env python3": `#!/usr/bin/env python3\n${HERMES_IMPORT_BODY}`,
    "env python": `#!/usr/bin/env python\n${HERMES_IMPORT_BODY}`,
    "env -S com nome bare": `#!/usr/bin/env -S python3.12 -u\n${HERMES_IMPORT_BODY}`,
    "env -S com caminho absoluto": `#!/usr/bin/env -S /b/bin/python3.12 -u\n${HERMES_IMPORT_BODY}`,
    "env -i com caminho absoluto": `#!/usr/bin/env -i /b/bin/python3.12\n${HERMES_IMPORT_BODY}`,
    "env -u PATH com caminho absoluto": `#!/usr/bin/env -u PATH /b/bin/python3.12\n${HERMES_IMPORT_BODY}`,
    "env -C diretório antes do nome bare": `#!/usr/bin/env -C /b/bin python3.12\n${HERMES_IMPORT_BODY}`,
    "env com atribuição antes do nome": `#!/usr/bin/env PYTHONPATH=/b/lib/python3.12/site-packages python3.12\n${HERMES_IMPORT_BODY}`,
    "env com argumento depois do caminho absoluto": `#!/usr/bin/env /b/bin/python3.12 -u\n${HERMES_IMPORT_BODY}`,
    "nome relativo sem barra": `#!python3.12\n${HERMES_IMPORT_BODY}`,
    "caminho relativo com barra": `#!bin/python3.12\n${HERMES_IMPORT_BODY}`,
    "absoluto com opção do intérprete": `#!/b/bin/python3.12 -S\n${HERMES_IMPORT_BODY}`,
    "absoluto na raiz, sem prefixo de venv": `#!/bin/python3\n${HERMES_IMPORT_BODY}`,
    "env com caminho absoluto na raiz": `#!/usr/bin/env /python3.12\n${HERMES_IMPORT_BODY}`,
    "sem shebang": HERMES_IMPORT_BODY,
    "sh que chama python3 pelo PATH": '#!/bin/sh\npython3 -m hermes_cli "$@"\n',
    "trampolim com nome bare": distlibTrampoline("python3.12"),
    "trampolim com variável no caminho": distlibTrampoline('"$HOME/b/bin/python3.12"'),
    "trampolim com env": distlibTrampoline("/usr/bin/env python3.12"),
    "trampolim com opção antes de $0": distlibTrampoline("/b/bin/python3.12 -S"),
    "invocação do .cmd num launcher sem extensão": '"%~dp0python.exe" -m hermes_cli %*\n',
  },
  "hermes.cmd": {
    "python pelo PATH (fixture Windows anterior)": "@ECHO off\r\npython -m hermes_cli %*\r\n",
    "python3.12 pelo PATH": "@ECHO off\r\npython3.12 -m hermes_cli %*\r\n",
    "python.exe entre aspas pelo PATH": '@ECHO off\r\n"python.exe" -m hermes_cli %*\r\n',
    "caminho absoluto (forma não declarada)": '@ECHO off\r\n"C:\\b\\Scripts\\python.exe" -m hermes_cli %*\r\n',
    "código Python com shebang env (fixture anterior)": `#!/usr/bin/env python3\n${HERMES_IMPORT_BODY}`,
    "código Python com shebang absoluto": `#!C:\\a\\Scripts\\python3.12\n${HERMES_IMPORT_BODY}`,
    "irmão só impresso por echo": '@ECHO off\r\necho "%~dp0python.exe" -m hermes_cli %*\r\n',
    "irmão em REM": '@ECHO off\r\nREM "%~dp0python.exe" -m hermes_cli %*\r\n',
    "irmão continuando a linha anterior": '@ECHO off\r\necho ^\r\n"%~dp0python.exe" -m hermes_cli %*\r\n',
    "irmão com opção antes de -m": '@ECHO off\r\n"%~dp0python.exe" -S -m hermes_cli %*\r\n',
    "irmão com outro módulo": '@ECHO off\r\n"%~dp0python.exe" -m outro_cli %*\r\n',
  },
};

test("agent-resolution-formal7-binding Hermes: launcher sem intérprete fixado pelo próprio texto fica launcher_not_recognized, sem versão nem packageDir de nenhum dos dois prefixos", async () => {
  const published = [];
  let checked = 0;
  for (const [launcherName, cases] of Object.entries(UNBOUND_HERMES_LAUNCHERS)) {
    for (const [label, content] of Object.entries(cases)) {
      checked += 1;
      const { tree, launcher } = installContradictoryHermesPrefixes(launcherName, content);
      const result = await resolveHermesVersion(launcher, { fs: createFakeFsAdapter(tree) });
      if (!isDeepStrictEqual(result, { version: null, reasonCode: "launcher_not_recognized" })) {
        published.push(`${launcherName}/${label} -> ${JSON.stringify(result)}`);
      }
    }
  }
  assert.equal(checked, 22 + 11);
  assert.deepEqual(published, []);
});

test("agent-resolution-formal7-binding Hermes: intérprete fixado pelo texto liga ao pacote do PRÓPRIO prefixo do intérprete, com packageDir exato", async () => {
  const cases = {
    "shebang absoluto de B": ["hermes", `#!/b/bin/python3.12\n${HERMES_IMPORT_BODY}`, "/b", "0.20.0"],
    "shebang absoluto do próprio A": ["hermes", `#!/a/bin/python3.12\n${HERMES_IMPORT_BODY}`, "/a", "0.21.4"],
    "env com um único caminho absoluto de B": ["hermes", `#!/usr/bin/env /b/bin/python3.12\n${HERMES_IMPORT_BODY}`, "/b", "0.20.0"],
    "env com caminho absoluto sem X.Y": ["hermes", `#!/usr/bin/env /b/bin/python3\n${HERMES_IMPORT_BODY}`, "/b", "0.20.0"],
    "trampolim do distlib sem aspas (shebang longo)": ["hermes", distlibTrampoline("/b/bin/python3.12"), "/b", "0.20.0"],
    "trampolim do distlib entre aspas (caminho com espaço)": [
      "hermes",
      distlibTrampoline('"/b com espaço/bin/python3.12"'),
      "/b com espaço",
      "0.20.0",
    ],
    ".cmd que executa o python.exe irmão por %~dp0": [
      "hermes.cmd",
      '@ECHO off\r\n"%~dp0python.exe" -m hermes_cli %*\r\n',
      "C:\\a",
      "0.21.4",
    ],
  };
  for (const [label, [launcherName, content, prefix, version]] of Object.entries(cases)) {
    const { tree, launcher, packageDirOf } = installContradictoryHermesPrefixes(launcherName, content, {
      other: prefix.startsWith("/b") ? prefix : "/b",
    });
    // O `.cmd` (`-m hermes_cli`) importa primeiro do diretório de trabalho,
    // aqui sem hermes_cli; nos demais o cwd não entra (correção de vínculo
    // Hermes).
    const result = await resolveHermesVersion(launcher, {
      fs: createFakeFsAdapter(tree),
      cwd: launcherName.endsWith(".cmd") ? "C:\\projeto" : "/projeto",
    });
    assert.deepEqual(
      result,
      { version, versionSource: "source_literal", packageDir: packageDirOf(prefix) },
      label,
    );
  }
});

test("agent-resolution-formal7-binding Hermes: intérprete fixado sem pacote no próprio prefixo, ou com dois pythonX.Y nele, fica inconclusivo e nunca usa o pacote do launcher", async () => {
  const withoutPackage = {
    "env com caminho absoluto de B": ["hermes", `#!/usr/bin/env /b/bin/python3.12\n${HERMES_IMPORT_BODY}`],
    "trampolim do distlib para B": ["hermes", distlibTrampoline("/b/bin/python3.12")],
  };
  for (const [label, [launcherName, content]] of Object.entries(withoutPackage)) {
    const { tree, launcher } = installContradictoryHermesPrefixes(launcherName, content, { packageInOtherPrefix: false });
    const result = await resolveHermesVersion(launcher, { fs: createFakeFsAdapter(tree) });
    assert.deepEqual(result, { version: null, reasonCode: "launcher_not_recognized" }, label);
  }

  // O .cmd fixa o python.exe irmão (prefixo A): o pacote que só B tem não
  // serve. O cwd informado, sem hermes_cli, faz a leitura chegar ao
  // site-packages de A (correção de vínculo Hermes).
  const cmd = installContradictoryHermesPrefixes("hermes.cmd", '@ECHO off\r\n"%~dp0python.exe" -m hermes_cli %*\r\n', {
    packageInLauncherPrefix: false,
  });
  assert.deepEqual(await resolveHermesVersion(cmd.launcher, { fs: createFakeFsAdapter(cmd.tree), cwd: "C:\\projeto" }), {
    version: null,
    reasonCode: "launcher_not_recognized",
  });

  for (const content of [`#!/usr/bin/env /b/bin/python3\n${HERMES_IMPORT_BODY}`, distlibTrampoline("/b/bin/python")]) {
    const { tree, launcher } = installContradictoryHermesPrefixes("hermes", content);
    addDir(tree, "/b/lib", "python3.11");
    addFile(tree, "/b/lib/python3.11/site-packages/hermes_cli", "__init__.py", '__version__ = "0.19.0"\n');
    const result = await resolveHermesVersion(launcher, { fs: createFakeFsAdapter(tree) });
    assert.deepEqual(result, { version: null, reasonCode: "version_source_ambiguous" }, content);
  }
});

// --- hermes_cli importado antes do site-packages (correção de vínculo Hermes) ---
// .checks/code-review/hermes-import-shadow-fixes.md: o launcher fixa o
// intérprete do venv, e o site-packages tem o hermes_cli 0.21.4 com o
// catálogo. O Python 3.13 procura antes no primeiro diretório de sys.path
// (`sys.path`: "python -m module command line: prepend the current working
// directory"; "python script.py command line: prepend the script's
// directory. If it's a symbolic link, resolve symbolic links") e nos caminhos
// de PYTHONPATH; PYTHONHOME muda o prefix (`sys_path_init`). Um hermes_cli
// 9.9.9 nesse primeiro diretório é o importado: o leitor publicava 0.21.4 e o
// packageDir do site-packages. Nenhuma das duas versões pode sair, e o
// vizinho nunca é lido.

const SHADOW_CMD_FORM = ".cmd com -m hermes_cli";

const SHADOW_BOUND_LAUNCHERS = {
  "shebang absoluto": `#!/v/bin/python3.12\n${HERMES_IMPORT_BODY}`,
  "env com caminho absoluto": `#!/usr/bin/env /v/bin/python3.12\n${HERMES_IMPORT_BODY}`,
  "trampolim do distlib": distlibTrampoline("/v/bin/python3.12"),
  [SHADOW_CMD_FORM]: '@ECHO off\r\n"%~dp0python.exe" -m hermes_cli %*\r\n',
};

const SHADOW_UNBOUND = { version: null, reasonCode: "launcher_not_recognized" };

// O primeiro diretório de import é o cwd para o `-m` e o diretório do script
// para os demais; o outro é o que o Python não consulta antes do
// site-packages nessa forma.
function installShadowableHermes(form) {
  const windows = form === SHADOW_CMD_FORM;
  const sep = windows ? "\\" : "/";
  const binDir = windows ? "C:\\v\\Scripts" : "/v/bin";
  const packageDir = windows ? "C:\\v\\Lib\\site-packages\\hermes_cli" : "/v/lib/python3.12/site-packages/hermes_cli";
  const cwd = windows ? "C:\\projeto" : "/projeto";
  const launcherName = windows ? "hermes.cmd" : "hermes";
  const tree = buildFsTree();
  addFile(tree, binDir, launcherName, SHADOW_BOUND_LAUNCHERS[form]);
  if (!windows) addDir(tree, "/v/lib", "python3.12");
  addFile(tree, packageDir, "__init__.py", '__version__ = "0.21.4"\n');
  addFile(tree, packageDir, "plugins.py", hermesPluginsSource());
  const [firstDir, otherDir] = windows ? [cwd, binDir] : [binDir, cwd];
  return {
    tree,
    sep,
    binDir,
    launcher: binDir + sep + launcherName,
    cwd,
    firstDir,
    otherDir,
    bound: { version: "0.21.4", versionSource: "source_literal", packageDir },
  };
}

const SHADOW_NEIGHBORS = {
  "módulo hermes_cli.py": (tree, dir) => addFile(tree, dir, "hermes_cli.py", '__version__ = "9.9.9"\n'),
  "pacote regular hermes_cli/__init__.py": (tree, dir, sep) =>
    addFile(tree, dir + sep + "hermes_cli", "__init__.py", '__version__ = "9.9.9"\n'),
  // Residual da seção 30 (.checks/code-review/hermes-compiled-shadow-fixes.md,
  // seção 31 do build): bytecode solto e extensão nativa, com e sem marcador
  // de ABI, são importados antes do site-packages tanto quanto o módulo/
  // pacote fonte (PEP 420; EXTENSION_SUFFIXES).
  "bytecode solto hermes_cli.pyc": (tree, dir) => addFile(tree, dir, "hermes_cli.pyc", "\0"),
  "bytecode solto hermes_cli/__init__.pyc": (tree, dir, sep) =>
    addFile(tree, dir + sep + "hermes_cli", "__init__.pyc", "\0"),
  "extensão hermes_cli sem marcador de ABI": (tree, dir, sep) =>
    addFile(tree, dir, sep === "\\" ? "hermes_cli.pyd" : "hermes_cli.so", "\0"),
  "extensão hermes_cli com marcador de ABI": (tree, dir, sep) =>
    addFile(
      tree,
      dir,
      sep === "\\" ? "hermes_cli.cp313-win_amd64.pyd" : "hermes_cli.cpython-313-x86_64-linux-gnu.so",
      "\0",
    ),
  "extensão hermes_cli/__init__ sem marcador de ABI": (tree, dir, sep) =>
    addFile(tree, dir + sep + "hermes_cli", sep === "\\" ? "__init__.pyd" : "__init__.so", "\0"),
  "extensão hermes_cli/__init__ com marcador de ABI": (tree, dir, sep) =>
    addFile(
      tree,
      dir + sep + "hermes_cli",
      sep === "\\" ? "__init__.cp313-win_amd64.pyd" : "__init__.cpython-313-x86_64-linux-gnu.so",
      "\0",
    ),
};

// Controles de nome do mesmo residual: um nome parecido, um nome qualquer sem
// relação e o bytecode cacheado em __pycache__ (que depende do .py ao lado
// para ser alcançado pelo import, não de si só) nunca impedem o vínculo.
const SHADOW_NAME_CONTROLS = {
  "nome parecido (hermes_client)": (tree, dir, sep) =>
    addFile(tree, dir, sep === "\\" ? "hermes_client.pyd" : "hermes_client.so", "\0"),
  "nome sem relação (nao_hermes.pyc)": (tree, dir) => addFile(tree, dir, "nao_hermes.pyc", "\0"),
  "__pycache__ sem o .py ao lado": (tree, dir, sep) =>
    addFile(tree, dir + sep + "__pycache__", "hermes_cli.cpython-313.pyc", "\0"),
};

function readRecordingFs(tree) {
  const fs = createFakeFsAdapter(tree);
  const reads = [];
  const readFile = fs.readFile;
  fs.readFile = async (filePath) => {
    reads.push(filePath);
    return readFile(filePath);
  };
  return { fs, reads };
}

test("agent-resolution-hermes-shadow hermes_cli no primeiro diretório de import (script: diretório do launcher; -m: cwd) deixa a versão desconhecida, sem pacote nenhum, e o vizinho nunca é lido", async () => {
  const published = [];
  let checked = 0;
  for (const form of Object.keys(SHADOW_BOUND_LAUNCHERS)) {
    for (const [kind, addNeighbor] of Object.entries(SHADOW_NEIGHBORS)) {
      checked += 1;
      const { tree, sep, launcher, cwd, firstDir } = installShadowableHermes(form);
      addNeighbor(tree, firstDir, sep);
      const { fs, reads } = readRecordingFs(tree);
      const result = await resolveHermesVersion(launcher, { fs, cwd, env: {} });
      const neighborReads = reads.filter((filePath) => filePath.startsWith(firstDir + sep + "hermes_cli"));
      if (!isDeepStrictEqual(result, SHADOW_UNBOUND) || neighborReads.length > 0) {
        published.push(`${form}/${kind} -> ${JSON.stringify(result)}; lidos: ${JSON.stringify(neighborReads)}`);
      }
    }
  }
  assert.equal(checked, 4 * 8);
  assert.deepEqual(published, []);
});

test("agent-resolution-hermes-shadow controles: vizinho só no outro diretório (-m: diretório do launcher; script: cwd), diretório hermes_cli sem __init__.py e cwd ausente no script mantêm o pacote do site-packages", async () => {
  const lost = [];
  let checked = 0;
  async function expectBound(label, installation, options) {
    checked += 1;
    const result = await resolveHermesVersion(installation.launcher, {
      fs: createFakeFsAdapter(installation.tree),
      env: {},
      ...options,
    });
    if (!isDeepStrictEqual(result, installation.bound)) lost.push(`${label} -> ${JSON.stringify(result)}`);
  }
  for (const form of Object.keys(SHADOW_BOUND_LAUNCHERS)) {
    for (const [kind, addNeighbor] of Object.entries(SHADOW_NEIGHBORS)) {
      const installation = installShadowableHermes(form);
      addNeighbor(installation.tree, installation.otherDir, installation.sep);
      await expectBound(`${form}/${kind} no outro diretório`, installation, { cwd: installation.cwd });
    }
    // Sem __init__.py, o diretório é só porção de namespace (PEP 420): a
    // busca continua e o pacote regular do site-packages vence.
    const namespace = installShadowableHermes(form);
    addFile(namespace.tree, namespace.firstDir + namespace.sep + "hermes_cli", "main.py", "def main():\n    pass\n");
    await expectBound(`${form}/diretório hermes_cli sem __init__.py`, namespace, { cwd: namespace.cwd });
  }
  for (const form of Object.keys(SHADOW_BOUND_LAUNCHERS).filter((name) => name !== SHADOW_CMD_FORM)) {
    await expectBound(`${form}/sem cwd`, installShadowableHermes(form), {});
  }
  assert.equal(checked, 4 * 8 + 4 + 3);
  assert.deepEqual(lost, []);
});

test("agent-resolution-hermes-shadow controles de nome: parecido, sem relação e __pycache__ sem o .py ao lado mantêm o pacote do site-packages", async () => {
  const lost = [];
  let checked = 0;
  for (const form of Object.keys(SHADOW_BOUND_LAUNCHERS)) {
    for (const [kind, addControl] of Object.entries(SHADOW_NAME_CONTROLS)) {
      checked += 1;
      const installation = installShadowableHermes(form);
      addControl(installation.tree, installation.firstDir, installation.sep);
      const result = await resolveHermesVersion(installation.launcher, {
        fs: createFakeFsAdapter(installation.tree),
        cwd: installation.cwd,
        env: {},
      });
      if (!isDeepStrictEqual(result, installation.bound)) {
        lost.push(`${form}/${kind} -> ${JSON.stringify(result)}`);
      }
    }
  }
  assert.equal(checked, 4 * 3);
  assert.deepEqual(lost, []);
});

test("agent-resolution-hermes-shadow ausência de contexto: no -m, cwd não informado fica launcher_not_recognized; env não informado vale ambiente sem variáveis", async () => {
  const cmd = installShadowableHermes(SHADOW_CMD_FORM);
  for (const [label, options] of [
    ["cwd omitido", { env: {} }],
    ["cwd null", { env: {}, cwd: null }],
    ["cwd undefined", { env: {}, cwd: undefined }],
  ]) {
    const result = await resolveHermesVersion(cmd.launcher, { fs: createFakeFsAdapter(cmd.tree), ...options });
    assert.deepEqual(result, SHADOW_UNBOUND, label);
  }
  const withCwd = await resolveHermesVersion(cmd.launcher, { fs: createFakeFsAdapter(cmd.tree), cwd: cmd.cwd });
  assert.deepEqual(withCwd, cmd.bound, "env omitido, cwd informado");
  const script = installShadowableHermes("shebang absoluto");
  assert.deepEqual(await resolveHermesVersion(script.launcher, { fs: createFakeFsAdapter(script.tree) }), script.bound);
});

test("agent-resolution-hermes-shadow PYTHONPATH ou PYTHONHOME não vazio deixa a versão desconhecida; vazios ou ausentes mantêm o vínculo", async () => {
  const published = [];
  let checked = 0;
  for (const form of Object.keys(SHADOW_BOUND_LAUNCHERS)) {
    for (const name of ["PYTHONPATH", "PYTHONHOME"]) {
      checked += 1;
      const { tree, launcher, cwd } = installShadowableHermes(form);
      const env = { [name]: form === SHADOW_CMD_FORM ? "C:\\outro" : "/outro" };
      const result = await resolveHermesVersion(launcher, { fs: createFakeFsAdapter(tree), cwd, env });
      if (!isDeepStrictEqual(result, SHADOW_UNBOUND)) published.push(`${form}/${name} -> ${JSON.stringify(result)}`);
    }
  }
  assert.equal(checked, 4 * 2);
  assert.deepEqual(published, []);

  for (const form of Object.keys(SHADOW_BOUND_LAUNCHERS)) {
    const { tree, launcher, cwd, bound } = installShadowableHermes(form);
    for (const env of [{ PYTHONPATH: "", PYTHONHOME: "" }, {}, { PATH: "/usr/bin" }]) {
      const result = await resolveHermesVersion(launcher, { fs: createFakeFsAdapter(tree), cwd, env });
      assert.deepEqual(result, bound, `${form}: ${JSON.stringify(env)}`);
    }
  }
});

test("agent-resolution-hermes-shadow launcher alcançado por link simbólico: decide o diretório real do script, não o do link", async () => {
  for (const [kind, addNeighbor] of Object.entries(SHADOW_NEIGHBORS)) {
    for (const neighborDir of ["/v/bin", "/usr/local/bin"]) {
      const { tree, launcher, bound } = installShadowableHermes("shebang absoluto");
      addSymlink(tree, "/usr/local/bin", "hermes", launcher);
      addNeighbor(tree, neighborDir, "/");
      const result = await resolveHermesVersion("/usr/local/bin/hermes", {
        fs: createFakeFsAdapter(tree),
        cwd: "/projeto",
        env: {},
      });
      assert.deepEqual(result, neighborDir === "/v/bin" ? SHADOW_UNBOUND : bound, `${kind} em ${neighborDir}`);
    }
  }
});

test("agent-resolution-hermes-shadow erro de E/S ao conferir o vizinho sobe como antes: presence unknown com o código, nunca ausência de vizinho", async () => {
  for (const [form, platform, faultedPath] of [
    ["shebang absoluto", "linux", ({ firstDir, sep }) => firstDir + sep + "hermes_cli.py"],
    [SHADOW_CMD_FORM, "win32", ({ firstDir, sep }) => [firstDir, "hermes_cli", "__init__.py"].join(sep)],
  ]) {
    const installation = installShadowableHermes(form);
    const fs = createFakeFsAdapter(installation.tree);
    fs.injectFault(faultedPath(installation), "EACCES");
    const results = await resolveAgents({
      pathDirs: [installation.binDir],
      platform,
      env: {},
      cwd: installation.cwd,
      fs,
    });
    const hermes = results.find((r) => r.id === "hermes");
    assert.deepEqual(
      {
        presence: hermes.presence,
        version: hermes.version,
        path: hermes.path,
        reasonCode: hermes.reasonCode,
        packageDir: hermes.packageDir,
      },
      { presence: "unknown", version: null, path: installation.launcher, reasonCode: "EACCES", packageDir: null },
      form,
    );
  }
});

// --- P2 da verificação12 (.checks/code-review/compiled-suffix-case-fixes.md) ---
// No Windows, o FileFinder do import casefolda tudo a partir do primeiro
// ponto do nome antes de casar contra os sufixos (CPython v3.13.0,
// `_bootstrap_external.py` `_fill_cache`: "Windows users can import modules
// with case-insensitive file suffixes"). Um `hermes_cli.PYD`/`.PyD`, com ou
// sem marcador de ABI maiúsculo, sombreia o site-packages nesse SO tanto
// quanto a forma minúscula já coberta acima; `platform` precisa ser "win32"
// explícito (nunca process.platform implícito) para acionar o casefold.
const WINDOWS_CASE_FOLDED_NEIGHBORS = {
  "extensão hermes_cli maiúscula sem marcador de ABI (.PYD)": (tree, dir) => addFile(tree, dir, "hermes_cli.PYD", "\0"),
  "extensão hermes_cli maiúscula com marcador de ABI (.CP313-WIN_AMD64.PYD)": (tree, dir) =>
    addFile(tree, dir, "hermes_cli.CP313-WIN_AMD64.PYD", "\0"),
  "extensão hermes_cli/__init__ maiúscula sem marcador de ABI (.PYD)": (tree, dir, sep) =>
    addFile(tree, dir + sep + "hermes_cli", "__init__.PYD", "\0"),
  "extensão mista (.PyD)": (tree, dir) => addFile(tree, dir, "hermes_cli.PyD", "\0"),
};

test("agent-resolution-hermes-shadow sufixo compilado maiúsculo no Windows (.PYD/.PyD, com ou sem marcador de ABI) também sombreia quando platform:'win32' é declarado", async () => {
  const published = [];
  let checked = 0;
  for (const [kind, addNeighbor] of Object.entries(WINDOWS_CASE_FOLDED_NEIGHBORS)) {
    checked += 1;
    const { tree, sep, launcher, cwd, firstDir } = installShadowableHermes(SHADOW_CMD_FORM);
    addNeighbor(tree, firstDir, sep);
    const { fs, reads } = readRecordingFs(tree);
    const result = await resolveHermesVersion(launcher, { fs, cwd, env: {}, platform: "win32" });
    const neighborReads = reads.filter((filePath) => filePath.startsWith(firstDir + sep + "hermes_cli"));
    if (!isDeepStrictEqual(result, SHADOW_UNBOUND) || neighborReads.length > 0) {
      published.push(`${kind} -> ${JSON.stringify(result)}; lidos: ${JSON.stringify(neighborReads)}`);
    }
  }
  assert.equal(checked, 4);
  assert.deepEqual(published, []);
});

test("agent-resolution-hermes-shadow controles do casefold Windows: plataforma não declarada como win32 mantém o sufixo maiúsculo exato (POSIX) e a base hermes_cli/__init__ nunca perde caixa", async () => {
  const lost = [];
  let checked = 0;

  // Controle POSIX: mesmo vizinho, mas platform explicitamente não-win32 —
  // o sufixo maiúsculo não é importável nesse SO (sistema de arquivos
  // case-sensitive), então o vínculo continua.
  for (const [kind, addNeighbor] of Object.entries(WINDOWS_CASE_FOLDED_NEIGHBORS)) {
    checked += 1;
    const installation = installShadowableHermes(SHADOW_CMD_FORM);
    addNeighbor(installation.tree, installation.firstDir, installation.sep);
    const result = await resolveHermesVersion(installation.launcher, {
      fs: createFakeFsAdapter(installation.tree),
      cwd: installation.cwd,
      env: {},
      platform: "linux",
    });
    if (!isDeepStrictEqual(result, installation.bound)) lost.push(`linux/${kind} -> ${JSON.stringify(result)}`);
  }

  // Controle de base: no Windows só a extensão perde caixa, nunca o nome
  // antes do primeiro ponto (CPython `_fill_cache`) — uma base maiúscula
  // (HERMES_CLI.pyd) não é o mesmo módulo e não sombreia.
  checked += 1;
  const baseUppercase = installShadowableHermes(SHADOW_CMD_FORM);
  addFile(baseUppercase.tree, baseUppercase.firstDir, "HERMES_CLI.pyd", "\0");
  const baseResult = await resolveHermesVersion(baseUppercase.launcher, {
    fs: createFakeFsAdapter(baseUppercase.tree),
    cwd: baseUppercase.cwd,
    env: {},
    platform: "win32",
  });
  if (!isDeepStrictEqual(baseResult, baseUppercase.bound)) {
    lost.push(`win32/base maiúscula (HERMES_CLI.pyd) -> ${JSON.stringify(baseResult)}`);
  }

  // Controle de ausência: sem platform declarado (nunca process.platform
  // implícito), o mesmo sufixo maiúsculo que sombrearia em win32 explícito
  // não sombreia — o lado conservador do chamador direto.
  checked += 1;
  const noPlatform = installShadowableHermes(SHADOW_CMD_FORM);
  addFile(noPlatform.tree, noPlatform.firstDir, "hermes_cli.PYD", "\0");
  const noPlatformResult = await resolveHermesVersion(noPlatform.launcher, {
    fs: createFakeFsAdapter(noPlatform.tree),
    cwd: noPlatform.cwd,
    env: {},
  });
  if (!isDeepStrictEqual(noPlatformResult, noPlatform.bound)) {
    lost.push(`platform ausente/hermes_cli.PYD -> ${JSON.stringify(noPlatformResult)}`);
  }

  assert.equal(checked, 4 + 1 + 1);
  assert.deepEqual(lost, []);
});

// --- P2 nº1 da revisão formal8 (.checks/code-review/issue-3-formal8-
// response.json): hasCompiledSibling (seções 30-32) só era aplicada ao
// primeiro diretório de import, nunca ao pacote JÁ ENCONTRADO em
// site-packages. O FileFinder do CPython seleciona extensão antes de fonte
// também dentro desse mesmo diretório (`_bootstrap_external.py`,
// `FileFinder.find_spec`): um `__init__[.ABI].so/.pyd` ao lado do
// `__init__.py` do site-packages é o que o Python importaria, nunca o
// literal textual — a versão e o packageDir precisam ficar inconclusivos,
// com a presença preservada, sem ler o vizinho.
const SITE_PACKAGE_INIT_SHADOW_NEIGHBORS = {
  "extensão __init__ sem marcador de ABI": (tree, packageDir, sep) =>
    addFile(tree, packageDir, sep === "\\" ? "__init__.pyd" : "__init__.so", "\0"),
  "extensão __init__ com marcador de ABI": (tree, packageDir, sep) =>
    addFile(
      tree,
      packageDir,
      sep === "\\" ? "__init__.cp313-win_amd64.pyd" : "__init__.cpython-313-x86_64-linux-gnu.so",
      "\0",
    ),
};

test("agent-resolution-formal8-1 __init__[.ABI].so/.pyd no MESMO diretório do site-packages (não só no primeiro diretório de import) deixa versão/packageDir inconclusivos", async () => {
  const published = [];
  let checked = 0;
  for (const form of Object.keys(SHADOW_BOUND_LAUNCHERS)) {
    for (const [kind, addNeighbor] of Object.entries(SITE_PACKAGE_INIT_SHADOW_NEIGHBORS)) {
      checked += 1;
      const { tree, sep, launcher, cwd, bound } = installShadowableHermes(form);
      addNeighbor(tree, bound.packageDir, sep);
      const { fs, reads } = readRecordingFs(tree);
      const result = await resolveHermesVersion(launcher, { fs, cwd, env: {} });
      const initRead = reads.filter((filePath) => filePath === bound.packageDir + sep + "__init__.py");
      if (!isDeepStrictEqual(result, SHADOW_UNBOUND) || initRead.length > 0) {
        published.push(`${form}/${kind} -> ${JSON.stringify(result)}; __init__.py lido: ${JSON.stringify(initRead)}`);
      }
    }
  }
  assert.equal(checked, 4 * 2);
  assert.deepEqual(published, []);
});

test("agent-resolution-formal8-1 controle de nome: extensão com nome diferente no site-packages não sombreia o __init__.py", async () => {
  const { tree, launcher, cwd, bound } = installShadowableHermes("shebang absoluto");
  addFile(tree, bound.packageDir, "outro_modulo.so", "\0");
  addFile(tree, bound.packageDir, "__init__helper.so", "\0");
  const result = await resolveHermesVersion(launcher, { fs: createFakeFsAdapter(tree), cwd, env: {} });
  assert.deepEqual(result, bound);
});

test("agent-resolution-formal8-1 sufixo maiúsculo do __init__ no site-packages também sombreia no Windows com platform:'win32' declarado; sem platform ou em POSIX, mantém o vínculo (lado conservador)", async () => {
  const { tree, launcher, cwd, bound } = installShadowableHermes(SHADOW_CMD_FORM);
  addFile(tree, bound.packageDir, "__init__.PYD", "\0");

  const shadowedWin32 = await resolveHermesVersion(launcher, {
    fs: createFakeFsAdapter(tree),
    cwd,
    env: {},
    platform: "win32",
  });
  assert.deepEqual(shadowedWin32, SHADOW_UNBOUND);

  const conservativePosix = await resolveHermesVersion(launcher, {
    fs: createFakeFsAdapter(tree),
    cwd,
    env: {},
    platform: "linux",
  });
  assert.deepEqual(conservativePosix, bound);

  const conservativeNoPlatform = await resolveHermesVersion(launcher, {
    fs: createFakeFsAdapter(tree),
    cwd,
    env: {},
  });
  assert.deepEqual(conservativeNoPlatform, bound);
});
