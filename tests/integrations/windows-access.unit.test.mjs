import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire, syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { after, test } from "node:test";
import { isDeepStrictEqual } from "node:util";
import { createWithDacl, readDacl } from "../../src/integrations/install/windows-access.mjs";
import { makeScratch } from "./helpers/cli.mjs";
import { grantsOf, readAces, sddlAces, setDacl } from "./helpers/windows-acl.mjs";

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

// Contrato do acesso da configuração no Windows (achado P1 da revisão formal
// round 4). `readDacl` devolve a DACL do arquivo — conferida ACE por ACE pelo
// helper, sem confiar no módulo. `createWithDacl` cria o arquivo já com a DACL
// recebida: as mesmas ACEs na mesma ordem, explícitas, DACL protegida; criado
// sem conteúdo, esse é o estado anterior a qualquer conteúdo. A pasta da
// fixture concede leitura herdável a "Usuários" (SID conhecido): o que nasce
// dela sem a DACL recebida teria essa leitura. Recusas: caminho ocupado
// (EEXIST, nada muda nele), arquivo ausente (ENOENT), DACL inválida ou fora do
// protocolo de linhas e PowerShell do Windows indisponível
// (`config_access_unavailable`, nada criado). Mensagens não trazem caminho,
// DACL nem conteúdo.
const CANARY = "sintetico-f4-canario-nao-e-segredo";
const HOME_GRANTS = { Usuários: "leitura", "usuário do teste": "controle total" };

async function outcome(promise) {
  try {
    return { resolved: await promise };
  } catch (error) {
    return { code: error.code, message: error.message };
  }
}

// Erro sem dado do chamador: só código e uma mensagem fixa.
function cleanError(result, ...secrets) {
  if (result.code === undefined) return result;
  return { code: result.code, messageLeaks: secrets.filter((secret) => result.message.includes(secret)) };
}

test(
  "I4-C25i windows-access: lê a DACL do arquivo e cria o temporário já com ela — mesmas ACEs, explícitas e protegidas — antes de qualquer conteúdo; recusa sem criar quando não pode garanti-la",
  { skip: process.platform !== "win32" ? "windows-dacl: o módulo só roda no Windows; no POSIX o acesso vem do stat (I4-C25b/C25f)" : false },
  async () => {
    const dir = makeScratch("f4 windows-access");
    scratches.push(dir);
    const home = path.join(dir, "pasta com herança ampla");
    mkdirSync(home);
    setDacl(home, "D:P(A;OICI;FA;;;{usuario})(A;OI;FR;;;BU)");
    const ownerOnly = path.join(home, "só do usuário.json");
    writeFileSync(ownerOnly, `{"segredo":"${CANARY}"}\n`);
    setDacl(ownerOnly, "D:P(A;;FA;;;{usuario})");
    const inheriting = path.join(home, "herda da pasta.json");
    writeFileSync(inheriting, "{}\n");
    const unordered = path.join(home, "fora da ordem canônica.json");
    writeFileSync(unordered, "{}\n");
    setDacl(unordered, "D:P(A;;FA;;;{usuario})(A;;FR;;;BU)(D;;FR;;;BU)");
    const observed = [];
    const expected = [];
    const sameAces = (sddl, file) => (isDeepStrictEqual(sddlAces(sddl), readAces(file)) ? "a DACL do arquivo, ACE por ACE" : "outra DACL");

    // Leitura: a DACL de cada arquivo.
    for (const [label, file] of [
      ["protegida só do usuário", ownerOnly],
      ["herdada da pasta", inheriting],
      ["fora da ordem canônica", unordered],
    ]) {
      observed.push({ caso: `readDacl — ${label}`, dacl: sameAces(await readDacl(file), file) });
      expected.push({ caso: `readDacl — ${label}`, dacl: "a DACL do arquivo, ACE por ACE" });
    }

    // Criação sem conteúdo: o arquivo já existe com a DACL recebida.
    const empty = path.join(home, "temporário sem conteúdo");
    const inheritedDacl = await readDacl(inheriting);
    observed.push({ caso: "createWithDacl sem conteúdo, DACL herdada de outro arquivo", result: await outcome(createWithDacl(empty, "", inheritedDacl)), size: statSync(empty).size, dacl: grantsOf(readAces(empty)) });
    expected.push({ caso: "createWithDacl sem conteúdo, DACL herdada de outro arquivo", result: { resolved: undefined }, size: 0, dacl: { protegida: true, acessos: HOME_GRANTS, herdadas: 0 } });

    // Com conteúdo e DACL só do usuário, na pasta que daria leitura a "Usuários".
    const full = path.join(home, "temporário ação com conteúdo");
    const content = `{"env":{"API_TOKEN":"${CANARY}"}}\n`;
    observed.push({ caso: "createWithDacl com conteúdo, DACL só do usuário", result: await outcome(createWithDacl(full, content, await readDacl(ownerOnly))), bytes: readFileSync(full, "utf8") === content, dacl: grantsOf(readAces(full)) });
    expected.push({ caso: "createWithDacl com conteúdo, DACL só do usuário", result: { resolved: undefined }, bytes: true, dacl: { protegida: true, acessos: { "usuário do teste": "controle total" }, herdadas: 0 } });

    // Ordem preservada: permissão antes de negação continua nessa ordem.
    const ordered = path.join(home, "temporário na mesma ordem");
    await createWithDacl(ordered, "{}\n", await readDacl(unordered));
    const aces = (file) => readAces(file).aces.map((ace) => `${ace.type} ${ace.who} 0x${ace.mask.toString(16)}${ace.inherited ? " herdada" : ""}`);
    observed.push({ caso: "createWithDacl com ACL fora da ordem canônica", protegida: readAces(ordered).protected, aces: aces(ordered) });
    expected.push({ caso: "createWithDacl com ACL fora da ordem canônica", protegida: true, aces: aces(unordered) });

    // Caminho ocupado: EEXIST e o arquivo que estava lá fica com bytes e DACL.
    const before = { bytes: readFileSync(ownerOnly, "utf8"), dacl: grantsOf(readAces(ownerOnly)) };
    const occupied = cleanError(await outcome(createWithDacl(ownerOnly, "outro conteúdo\n", inheritedDacl)), ownerOnly, CANARY);
    observed.push({ caso: "createWithDacl em caminho ocupado", result: occupied, after: { bytes: readFileSync(ownerOnly, "utf8"), dacl: grantsOf(readAces(ownerOnly)) } });
    expected.push({ caso: "createWithDacl em caminho ocupado", result: { code: "EEXIST", messageLeaks: [] }, after: before });

    const missing = path.join(home, "não existe.json");
    observed.push({ caso: "readDacl de arquivo ausente", result: cleanError(await outcome(readDacl(missing)), missing) });
    expected.push({ caso: "readDacl de arquivo ausente", result: { code: "ENOENT", messageLeaks: [] } });

    // DACL que não é aplicável ou que quebraria o protocolo de linhas.
    for (const [label, dacl] of [
      ["DACL inválida", "D:P(XYZ)"],
      ["DACL com quebra de linha", "D:P(A;;FA;;;BU)\nD:P(A;;FA;;;WD)"],
      ["texto que não é DACL", "O:BAG:BA"],
    ]) {
      const file = path.join(home, `temporário ${label}`);
      observed.push({ caso: `createWithDacl — ${label}`, result: cleanError(await outcome(createWithDacl(file, content, dacl)), file, CANARY), created: existsSync(file) });
      expected.push({ caso: `createWithDacl — ${label}`, result: { code: "config_access_unavailable", messageLeaks: [] }, created: false });
    }

    // PowerShell do Windows indisponível: o `spawn` dele aponta para um
    // executável inexistente ao lado (falha real de criação de processo).
    const childProcess = createRequire(import.meta.url)("node:child_process");
    const realSpawn = childProcess.spawn;
    childProcess.spawn = (command, ...rest) => realSpawn(path.join(path.dirname(command), "powershell-ausente-na-prova.exe"), ...rest);
    syncBuiltinESMExports();
    const absentFile = path.join(home, "temporário sem PowerShell");
    try {
      observed.push({
        caso: "PowerShell do Windows indisponível",
        read: cleanError(await outcome(readDacl(ownerOnly)), ownerOnly),
        create: cleanError(await outcome(createWithDacl(absentFile, content, inheritedDacl)), absentFile, CANARY),
        created: existsSync(absentFile),
      });
    } finally {
      childProcess.spawn = realSpawn;
      syncBuiltinESMExports();
    }
    expected.push({
      caso: "PowerShell do Windows indisponível",
      read: { code: "config_access_unavailable", messageLeaks: [] },
      create: { code: "config_access_unavailable", messageLeaks: [] },
      created: false,
    });

    assert.deepEqual(observed, expected);
  },
);
