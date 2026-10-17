import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { open } from "node:fs/promises";
import path from "node:path";
import { after, test } from "node:test";
import { aclOf, matchAcl } from "../../src/integrations/install/posix-acl.mjs";
import { makeScratch } from "./helpers/cli.mjs";
import { rawAcl, readAcl, setAcl } from "./helpers/posix-acl.mjs";

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

// Contrato do módulo no Linux: a ACL de acesso é lida e gravada pelo
// descritor recebido — nunca pelo caminho —, conferida depois de gravada, e
// qualquer falha vira `config_access_unavailable` com mensagem fixa (sem
// caminho nem conteúdo). Fixtures sintéticas: uid/gid numéricos sem conta.
const SYN_UID = 2147400001;
const SYN_GID = 2147400002;
const CANARY = "sintetico-f5-canario-nao-e-segredo";
const RESTRICTED = `u::rw-,u:${SYN_UID}:---,g::r--,m::r--,o::r--`;
const RESTRICTED_ENTRIES = ["user::rw-", `user:${SYN_UID}:---`, "group::r--", "mask::r--", "other::r--"];
const INHERITED_MASKED = ["user::rw-", `user:${SYN_UID}:r-x`, "group::r-x", `group:${SYN_GID}:r--`, "mask::---", "other::---"];

async function outcome(promise) {
  try {
    return { value: await promise };
  } catch (error) {
    return { code: error.code, message: error.message };
  }
}

test(
  "I4-C25l Linux: contrato do módulo de ACL POSIX — leitura e cópia exatas pelo descritor, conferidas; recusa sem como garantir",
  { skip: process.platform !== "linux" ? "posix-acl: ACL POSIX (xattr) só no Linux; no Windows o contrato equivalente é I4-C25i" : false },
  async () => {
    const dir = makeScratch("f5 posix-acl");
    scratches.push(dir);
    const home = path.join(dir, "pasta");
    mkdirSync(home);
    const plain = path.join(dir, "sem acl.json");
    writeFileSync(plain, `{"segredo":"${CANARY}"}\n`, { mode: 0o640 });
    const restricted = path.join(dir, "acl restrita.json");
    writeFileSync(restricted, `{"segredo":"${CANARY}"}\n`);
    setAcl(restricted, RESTRICTED);
    setAcl(home, `u::rwx,u:${SYN_UID}:r-x,g::r-x,g:${SYN_GID}:r--,m::r-x,o::---`, { kind: "default" });
    const restrictedRaw = rawAcl(restricted);
    const observed = [];
    const expected = [];
    const read = async (label, file, want) => {
      const handle = await open(file, "r");
      try {
        observed.push({ label, ...(await outcome(aclOf(handle, file))) });
      } finally {
        await handle.close();
      }
      expected.push({ label, ...want });
    };
    const unavailable = { code: "config_access_unavailable", message: "ACL da configuração indisponível" };

    await read("leitura: arquivo sem ACL estendida", plain, { value: null });
    await read("leitura: ACL estendida (xattr exato)", restricted, { value: restrictedRaw });
    await read("leitura: procfs, sem ACL POSIX (ENOTSUP)", "/proc/self/status", unavailable);

    // Temporário recém-criado 0600 na pasta com ACL default: as entradas
    // herdadas nascem sob a máscara fechada (estado anterior a qualquer
    // conteúdo, conferido abaixo como fixture).
    let count = 0;
    const apply = async (label, acl, sameGroup, want) => {
      const file = path.join(home, `temporário ${++count}`);
      const handle = await open(file, "wx", 0o600);
      try {
        const created = readAcl(file).access;
        const result = await outcome(matchAcl(handle, file, acl, sameGroup));
        observed.push({ label, criado: created, ...result, depois: readAcl(file).access, xattr: rawAcl(file) === restrictedRaw ? "o da configuração" : rawAcl(file) === "none" ? "nenhum" : "outro" });
      } finally {
        await handle.close();
      }
      expected.push({ label, criado: INHERITED_MASKED, ...want });
    };
    await apply("cópia exata da ACL estendida", restrictedRaw, true, { value: undefined, depois: RESTRICTED_ENTRIES, xattr: "o da configuração" });
    await apply("original sem ACL: a herdada é removida", null, true, { value: undefined, depois: ["user::rw-", "group::---", "other::---"], xattr: "nenhum" });
    await apply("ACL estendida com o grupo dono não atribuível", restrictedRaw, false, { ...unavailable, depois: INHERITED_MASKED, xattr: "outro" });
    await apply("ACL fora do formato", "zz", true, { ...unavailable, depois: INHERITED_MASKED, xattr: "outro" });
    // Versão 2 com uma entrada de marca inexistente (0x40): o kernel recusa.
    await apply("ACL que o kernel recusa", "0200000040000400ffffffff", true, { ...unavailable, depois: INHERITED_MASKED, xattr: "outro" });
    // Só as três entradas do modo (u::rw-, g::r--, o::---): o kernel aceita,
    // mas a converte em bits sem guardar xattr — a releitura não é o pedido.
    await apply("ACL aceita mas relida diferente do pedido", "0200000001000600ffffffff04000400ffffffff20000000ffffffff", true, { ...unavailable, depois: ["user::rw-", "group::r--", "other::---"], xattr: "nenhum" });

    assert.deepEqual(observed, expected);
  },
);
