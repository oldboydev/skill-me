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
  buildFsTree,
  createFakeFsAdapter,
} from "./helpers/fake-fs-adapter.mjs";

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

function codexShimContent(platform) {
  return platform === "win32"
    ? '@ECHO off\r\nSET "_prog=node"\r\nendLocal & "%_prog%" "%~dp0\\node_modules\\@openai\\codex\\bin\\codex.js" %*\r\n'
    : '#!/usr/bin/env node\nrequire("./node_modules/@openai/codex/bin/codex.js");\n';
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

  const codexName = platform === "win32" ? "codex.cmd" : "codex";
  addFile(tree, dir, codexName, codexShimContent(platform));
  addFile(
    tree,
    [dir, "node_modules", "@openai", "codex"].join(sep),
    "package.json",
    JSON.stringify({ name: "@openai/codex", version: "0.162.1" }),
  );

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

  return { hermesBinDir };
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
  const { hermesBinDir } = installAgentsInTree(tree, dir, "linux");

  const fs = createFakeFsAdapter(tree);
  fs.injectFault(dir + "/node_modules/@openai/codex/package.json", "EACCES");

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
  addFile(
    tree,
    dir,
    "codex",
    "#!/bin/sh\n# usa node_modules/@openai/codex/bin/codex.js internamente\necho noop\n",
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
  addFile(tree, dir, "codex", codexShimContent("linux"));
  addFile(
    tree,
    [dir, "node_modules", "@openai", "codex"].join("/"),
    "package.json",
    JSON.stringify({ name: "@openai/codex", version: "CANARY-SECRET-37f1c9a2" }),
  );
  const result = await resolveCodexVersion(dir + "/codex", { fs: createFakeFsAdapter(tree) });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "version_unreadable");
});

test("agent-resolution-C10 package.json do Codex acima de 1 MiB vira input_too_large, não launcher_not_recognized", async () => {
  const tree = buildFsTree();
  const dir = "/path/codex-oversized";
  addFile(tree, dir, "codex", codexShimContent("linux"));
  const oversized =
    `{"name":"@openai/codex","version":"0.162.1","padding":"` +
    "x".repeat(1024 * 1024 + 1) +
    `"}`;
  addFile(tree, [dir, "node_modules", "@openai", "codex"].join("/"), "package.json", oversized);
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
