// C15 — "alterações durante a leitura geram limitação/estado inconclusivo
// quando detectadas, não um reparo". Sincronizar uma mutação real durante a
// leitura de um processo CLI externo não é determinístico; a regra de
// detecção é testada diretamente, injetando um stat() e um readFile() que
// discordam, como aconteceria se o arquivo mudasse entre as duas chamadas.
import assert from "node:assert/strict";
import test from "node:test";
import { readBoundedText, readSnapshot } from "../../src/doctor/snapshot-read.mjs";
import { readAgentConfiguration } from "../../src/doctor/config-reader.mjs";
import { claudeConfigScopes, claudeHome } from "../../src/doctor/config-sources.mjs";
import { resolveCodexVersion } from "../../src/doctor/launcher-link/codex.mjs";
import { resolveHermesVersion } from "../../src/doctor/launcher-link/hermes.mjs";

test("mid-read-mutation-C15 tamanho mudou entre stat e readFile vira limitação, não repete a leitura", async () => {
  let statCalls = 0;
  let readCalls = 0;
  const fs = {
    async stat() {
      statCalls += 1;
      return { size: 10 };
    },
    async readFile() {
      readCalls += 1;
      return Buffer.from("conteúdo bem mais longo que 10 bytes");
    },
  };
  const result = await readSnapshot("/fixture/arquivo.yaml", { fs });
  assert.equal(result.changedDuringRead, true);
  assert.equal(statCalls, 1);
  assert.equal(readCalls, 1);
});

test("mid-read-mutation-C15 tamanho estável não acusa mutação", async () => {
  const content = Buffer.from("conteúdo estável");
  const fs = {
    async stat() {
      return { size: content.length };
    },
    async readFile() {
      return content;
    },
  };
  const result = await readSnapshot("/fixture/arquivo.yaml", { fs });
  assert.equal(result.changedDuringRead, false);
  assert.deepEqual(result.content, content);
});

test("mid-read-mutation-C15 não tenta reparar nem reler automaticamente após detectar mutação", async () => {
  let readCalls = 0;
  const fs = {
    async stat() {
      return { size: 999 };
    },
    async readFile() {
      readCalls += 1;
      return Buffer.from("x");
    },
  };
  await readSnapshot("/fixture/arquivo.yaml", { fs });
  assert.equal(readCalls, 1, "não deve haver segunda tentativa de leitura");
});

// C14/C15 — medir o limite só pelo stat() prévio e depois chamar
// fs.readFile() sem teto permitiria que um arquivo crescido entre as duas
// chamadas (ou um adapter cujo stat esteja simplesmente errado) tivesse o
// conteúdo inteiro, fora do limite, lido e retido mesmo assim. A leitura
// efetiva é limitada por um handle "abrível" (open/read/stat/close), então o
// teto vale mesmo quando o stat() prévio mente sobre o tamanho.
test("mid-read-mutation-C14 limite é aplicado pela leitura efetiva, não apenas pelo stat() prévio", async () => {
  const maxBytes = 10;
  const realContent = Buffer.from("x".repeat(maxBytes + 50));
  let totalRequested = 0;
  const fs = {
    async open() {
      let position = 0;
      return {
        async read(buffer, offset, length, pos) {
          totalRequested += length;
          const start = pos;
          const bytesRead = Math.max(0, Math.min(length, realContent.length - start));
          if (bytesRead > 0) realContent.copy(buffer, offset, start, start + bytesRead);
          position = start + bytesRead;
          return { bytesRead };
        },
        async stat() {
          // Mente deliberadamente: um stat() prévio diria que o arquivo é
          // menor que o limite, mas a leitura real devolve muito mais bytes.
          return { size: maxBytes - 1 };
        },
        async close() {},
      };
    },
  };
  const result = await readSnapshot("/fixture/cresceu-depois-do-stat.yaml", { fs, maxBytes });
  assert.equal(result.tooLarge, true);
  assert.equal(result.content, undefined, "conteúdo além do limite não deve ser retido/copiado");
  assert.ok(
    totalRequested <= maxBytes + 1,
    `a leitura nunca deve pedir mais que maxBytes+1 bytes, pediu ${totalRequested}`,
  );
});

test("mid-read-mutation-C15 readAgentConfiguration propaga mutação detectada durante a leitura como configuration unknown", async () => {
  const home = "/fixture/home";
  const scopes = claudeConfigScopes({ home, cwd: "/fixture/cwd", platform: "linux" });
  const settingsPath = scopes.find((scope) => scope.scope === "project_shared").path;
  const fakeContent = Buffer.from(JSON.stringify({ hooks: { PreToolUse: [] } }));
  const fs = {
    async stat(filePath) {
      if (filePath === settingsPath) return { size: fakeContent.length };
      const error = new Error("ENOENT");
      error.code = "ENOENT";
      throw error;
    },
    async readFile(filePath) {
      if (filePath === settingsPath) {
        // Discorda deliberadamente do stat() acima, como aconteceria se o
        // arquivo mudasse de tamanho entre as duas chamadas.
        return Buffer.concat([fakeContent, Buffer.from("mutado-durante-a-leitura")]);
      }
      const error = new Error("ENOENT");
      error.code = "ENOENT";
      throw error;
    },
  };
  const result = await readAgentConfiguration({
    agentId: "claude",
    env: { HOME: home, USERPROFILE: home },
    platform: "linux",
    cwd: "/fixture/cwd",
    fs,
  });
  assert.equal(result.configuration, "unknown");
  assert.equal(result.configReasonCode, "config_changed_during_read");
});

// C15/G3 — readBoundedText (usado por launcher-link/codex.mjs e
// launcher-link/hermes.mjs, não só por config-reader.mjs) descartava
// snapshot.changedDuringRead e devolvia state "ok" com o texto lido durante
// a mutação, como se a leitura fosse estável. Prova direta do wrapper, antes
// de qualquer consumidor: a detecção precisa chegar como um state distinto
// de "ok", "missing" e "too_large".
test("mid-read-mutation-C15/G3 readBoundedText propaga mutação detectada como state changed_during_read, nunca ok", async () => {
  const stableContent = Buffer.from("conteudo-que-mudou-de-tamanho-durante-a-leitura");
  const fs = {
    async open() {
      let served = false;
      return {
        async read(buffer, offset, length, position) {
          if (served) return { bytesRead: 0 };
          served = true;
          stableContent.copy(buffer, offset, 0, stableContent.length);
          return { bytesRead: stableContent.length };
        },
        async stat() {
          // Mente deliberadamente: diz um tamanho diferente do que a leitura
          // real devolveu, como numa mutação real durante a leitura.
          return { size: stableContent.length + 5 };
        },
        async close() {},
      };
    },
  };
  const result = await readBoundedText("/fixture/metadata.json", { fs, maxBytes: 1024 * 1024 });
  assert.equal(result.state, "changed_during_read");
  assert.notEqual(result.state, "ok");
  assert.equal(result.text, undefined, "conteúdo mutado não deve ser exposto como texto estável");
});

// C15/G3 — consumidor real de package_metadata (Codex): o package.json muda
// de tamanho entre o stat() e a leitura efetiva. version deve ficar null com
// motivo específico, nunca a versão lida durante a mutação nem confundido
// com launcher_not_recognized; o shim em si (primeira leitura) permanece
// estável neste teste para isolar o consumidor de package_metadata.
test("mid-read-mutation-C15/G3 resolveCodexVersion: package.json mutado durante a leitura fica version null/version_changed_during_read", async () => {
  const launcherPath = "/fixture/bin/codex";
  const pkgJsonPath = "/fixture/bin/node_modules/@openai/codex/package.json";
  const shimContent = Buffer.from(
    '#!/usr/bin/env node\nrequire("./node_modules/@openai/codex/bin/codex.js");\n',
  );
  const pkgContent = Buffer.from(JSON.stringify({ name: "@openai/codex", version: "0.162.1" }));
  const fs = {
    async stat(filePath) {
      if (filePath === launcherPath) return { size: shimContent.length };
      if (filePath === pkgJsonPath) return { size: pkgContent.length + 1 };
      const error = new Error("ENOENT");
      error.code = "ENOENT";
      throw error;
    },
    async readFile(filePath) {
      if (filePath === launcherPath) return shimContent;
      if (filePath === pkgJsonPath) return pkgContent;
      const error = new Error("ENOENT");
      error.code = "ENOENT";
      throw error;
    },
  };
  const result = await resolveCodexVersion(launcherPath, { fs });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "version_changed_during_read");
  assert.notEqual(result.reasonCode, "launcher_not_recognized");
});

// C15/G3 — consumidor real de shim (Codex): o próprio launcher muda de
// tamanho durante a leitura, antes de qualquer tentativa de vincular ao
// pacote.
test("mid-read-mutation-C15/G3 resolveCodexVersion: shim do launcher mutado durante a leitura fica version null/version_changed_during_read", async () => {
  const launcherPath = "/fixture/bin/codex";
  const shimContent = Buffer.from(
    '#!/usr/bin/env node\nrequire("./node_modules/@openai/codex/bin/codex.js");\n',
  );
  const fs = {
    async stat(filePath) {
      if (filePath === launcherPath) return { size: shimContent.length + 3 };
      const error = new Error("ENOENT");
      error.code = "ENOENT";
      throw error;
    },
    async readFile(filePath) {
      if (filePath === launcherPath) return shimContent;
      const error = new Error("ENOENT");
      error.code = "ENOENT";
      throw error;
    },
  };
  const result = await resolveCodexVersion(launcherPath, { fs });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "version_changed_during_read");
});

// C15/G3 — consumidor real de source_literal (Hermes): __init__.py muda de
// tamanho entre o stat() e a leitura efetiva. O shim/launcher permanece
// estável neste teste para isolar o consumidor de source_literal.
test("mid-read-mutation-C15/G3 resolveHermesVersion: __init__.py mutado durante a leitura fica version null/version_changed_during_read (source_literal)", async () => {
  const launcherPath = "/fixture/hermes-venv/bin/hermes";
  const libDir = "/fixture/hermes-venv/lib";
  const initPath = "/fixture/hermes-venv/lib/python3.12/site-packages/hermes_cli/__init__.py";
  const shimContent = Buffer.from(
    "#!/usr/bin/env python3\nfrom hermes_cli import main\nimport sys\nsys.exit(main())\n",
  );
  const initContent = Buffer.from('__version__ = "0.21.4"\n');
  const fs = {
    async stat(filePath) {
      if (filePath === launcherPath) return { size: shimContent.length };
      if (filePath === initPath) return { size: initContent.length + 7 };
      const error = new Error("ENOENT");
      error.code = "ENOENT";
      throw error;
    },
    async readFile(filePath) {
      if (filePath === launcherPath) return shimContent;
      if (filePath === initPath) return initContent;
      const error = new Error("ENOENT");
      error.code = "ENOENT";
      throw error;
    },
    async listDir(dirPath) {
      if (dirPath === libDir) return ["python3.12"];
      const error = new Error("ENOENT");
      error.code = "ENOENT";
      throw error;
    },
  };
  const result = await resolveHermesVersion(launcherPath, { fs });
  assert.equal(result.version, null);
  assert.equal(result.reasonCode, "version_changed_during_read");
  assert.notEqual(result.reasonCode, "version_unreadable");
});
