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
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { lstat, readFile, realpath, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveAgents } from "../../src/doctor/agent-resolution.mjs";
import { resolveCodexVersion } from "../../src/doctor/launcher-link/codex.mjs";
import { resolveHermesVersion } from "../../src/doctor/launcher-link/hermes.mjs";
import { buildMinimalPe } from "./helpers/synthetic-pe.mjs";
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

function hermesShimContent() {
  // O launcher real (console-script do pip) importa hermes_cli; o conteúdo
  // exato do shim do Windows é uma simplificação declarada (ver
  // src/doctor/launcher-link/hermes.mjs), mas ainda precisa referenciar
  // hermes_cli para ser reconhecido.
  return "#!/usr/bin/env python3\nfrom hermes_cli import main\nimport sys\nsys.exit(main())\n";
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
  addFile(tree, hermesBinDir, hermesName, hermesShimContent());
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

    const results = await resolveAgents({
      pathDirs: [dir, hermesBinDir],
      platform,
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
  addFile(tree, binDir, "hermes", hermesShimContent());
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
  addFile(tree, binDir, "hermes.cmd", hermesShimContent());
  addFile(tree, venvRoot + "\\Lib\\site-packages\\hermes_cli", "__init__.py", '__version__ = "0.21.4"\n');
  const result = await resolveHermesVersion(binDir + "\\hermes.cmd", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, "0.21.4");
  assert.equal(result.versionSource, "source_literal");
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
    "#!/usr/bin/env python3\n# from hermes_cli import main\necho noop\n",
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
  addFile(tree, binDir, "hermes", hermesShimContent());
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

test("agent-resolution-C10 hermes_cli/__init__.py acima de 1 MiB vira input_too_large, não version_unreadable", async () => {
  const tree = buildFsTree();
  const binDir = "/path/hermes-oversized/bin";
  addFile(tree, binDir, "hermes", hermesShimContent());
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

test("agent-resolution-C2 Hermes: com python3.11 e python3.12 no prefixo, o pythonX.Y do shebang escolhe a fonte de versão", async () => {
  for (const [shebang, expected, pythonDir] of [
    ["#!/opt/hermes/bin/python3.12", "0.21.4", "python3.12"],
    ["#!/usr/bin/env python3.11", "0.20.0", "python3.11"],
    ["#!/usr/bin/env -S python3.12 -u", "0.21.4", "python3.12"],
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

test("agent-resolution-C3 Hermes: shebang sem versão e dois pythonX.Y com hermes_cli fica version_source_ambiguous, nunca o primeiro lexical", async () => {
  for (const shebang of ["#!/usr/bin/env python3", "#!/opt/hermes/bin/python", "#!/bin/sh"]) {
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

test("agent-resolution-C3 launcher Python do Hermes que cita o import de hermes_cli só em docstring não é vínculo", async () => {
  const docstringOnly =
    '#!/opt/hermes/bin/python3.12\n"""Uso:\nfrom hermes_cli.main import main\n"""\nimport sys\nsys.exit(0)\n';
  const result = await hermesVersionWith('__version__ = "0.21.4"\n', docstringOnly);
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "launcher_not_recognized");
  const control = await hermesVersionWith('__version__ = "0.21.4"\n');
  assert.equal(control.version, "0.21.4", "controle: import em código no mesmo layout");
});
