// C15 — "alterações durante a leitura geram limitação/estado inconclusivo
// quando detectadas, não um reparo". Sincronizar uma mutação real durante a
// leitura de um processo CLI externo não é determinístico; a regra de
// detecção é testada diretamente, injetando um stat() e um readFile() que
// discordam, como aconteceria se o arquivo mudasse entre as duas chamadas.
import assert from "node:assert/strict";
import test from "node:test";
import { readSnapshot } from "../../src/doctor/snapshot-read.mjs";
import { readAgentConfiguration } from "../../src/doctor/config-reader.mjs";
import { claudeConfigScopes, claudeHome } from "../../src/doctor/config-sources.mjs";

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
