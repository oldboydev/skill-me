// C14 — "metadado PE é consultado pela estrutura do binário, sem carregar
// o executável inteiro em memória ou iniciá-lo". Provado na própria
// camada: um binário real de 20 MiB em disco, contando bytes efetivamente
// lidos e garantindo que nenhum processo é iniciado.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { open } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readPeVersion } from "../../src/doctor/version-sources/pe.mjs";
import {
  buildMinimalPe,
  corruptResourceSize,
  corruptSizeOfOptionalHeader,
  corruptOptionalHeaderMagic,
  corruptResourceTypeEntryOffset,
  corruptResourceDataEntryPointer,
  corruptVersionDataEntrySize,
} from "./helpers/synthetic-pe.mjs";

const BIG_FILE_SIZE = 20 * 1024 * 1024;
const MAX_ALLOWED_BYTES_READ = 65536; // bem abaixo dos 20 MiB do arquivo

function countingFsAdapter(onBytes) {
  return {
    async open(filePath) {
      const handle = await open(filePath, "r");
      return {
        async read(buffer, offset, length, position) {
          const result = await handle.read(buffer, offset, length, position);
          onBytes(result.bytesRead);
          return result;
        },
        async stat() {
          return handle.stat();
        },
        async close() {
          return handle.close();
        },
      };
    },
  };
}

function throwingChildProcess() {
  return {
    spawn() {
      throw new Error("readPeVersion não deve iniciar processos");
    },
    execFile() {
      throw new Error("readPeVersion não deve iniciar processos");
    },
  };
}

test("version-metadata-C14 lê a versão sem carregar o executável inteiro em memória", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "doctor-pe-"));
  try {
    const file = path.join(scratch, "claude.exe");
    const pe = buildMinimalPe({
      version: { major: 2, minor: 1, build: 295, revision: 0 },
      overlayBytes: BIG_FILE_SIZE,
    });
    writeFileSync(file, pe);

    let totalBytesRead = 0;
    const result = await readPeVersion(file, {
      fs: countingFsAdapter((n) => {
        totalBytesRead += n;
      }),
      childProcess: throwingChildProcess(),
    });

    assert.equal(result.version, "2.1.295");
    assert.ok(
      totalBytesRead < MAX_ALLOWED_BYTES_READ,
      `leu ${totalBytesRead} bytes de um arquivo de ${pe.length}`,
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// C3/C14 — `resourceSize` vem direto do header do PE (não confiável); sem
// validação, um header corrompido anunciando gigabytes de recurso derrubaria
// o diagnóstico dos demais agentes. O tamanho é validado contra o arquivo
// real e um teto conservador antes de qualquer alocação/leitura da seção.
test("version-metadata-C3 header com resourceSize corrompido (maior que o arquivo inteiro) não aloca nem derruba o diagnóstico", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "doctor-pe-corrupt-size-"));
  try {
    const file = path.join(scratch, "claude.exe");
    const pe = buildMinimalPe({ version: { major: 2, minor: 1, build: 295, revision: 0 } });
    const corrupted = corruptResourceSize(pe, 0xffffffff);
    writeFileSync(file, corrupted);

    let totalBytesRead = 0;
    const result = await readPeVersion(file, {
      fs: countingFsAdapter((n) => {
        totalBytesRead += n;
      }),
      childProcess: throwingChildProcess(),
    });

    assert.equal(result.version, null);
    assert.ok(
      totalBytesRead < MAX_ALLOWED_BYTES_READ,
      `leu ${totalBytesRead} bytes para um resourceSize corrompido`,
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("version-metadata-C3 resourceSize maior que o teto conservador (mas ainda cabendo no arquivo) é recusado sem alocar a seção inteira", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "doctor-pe-huge-rsrc-"));
  try {
    const file = path.join(scratch, "claude.exe");
    const pe = buildMinimalPe({
      version: { major: 2, minor: 1, build: 295, revision: 0 },
      overlayBytes: 9 * 1024 * 1024, // arquivo grande o bastante para "caber" um resourceSize inflado
    });
    // Mente um resourceSize de 8.5 MiB: cabe no arquivo (por causa do
    // overlay acima), mas excede o teto conservador para uma seção de
    // VERSIONINFO real.
    const corrupted = corruptResourceSize(pe, 8.5 * 1024 * 1024);
    writeFileSync(file, corrupted);

    let totalBytesRead = 0;
    const result = await readPeVersion(file, {
      fs: countingFsAdapter((n) => {
        totalBytesRead += n;
      }),
      childProcess: throwingChildProcess(),
    });

    assert.equal(result.version, null);
    assert.ok(
      totalBytesRead < MAX_ALLOWED_BYTES_READ,
      `leu ${totalBytesRead} bytes para um resourceSize acima do teto`,
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("version-metadata-C3 recurso de versão com idioma diferente de 0x0409 ainda é reconhecido (nenhum ID fixo de idioma)", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "doctor-pe-lang-"));
  try {
    const file = path.join(scratch, "claude.exe");
    writeFileSync(
      file,
      buildMinimalPe({
        version: { major: 2, minor: 1, build: 295, revision: 0 },
        languageId: 0x0416, // pt-BR, não o 0x0409 (en-US) de todas as outras fixtures
      }),
    );
    const result = await readPeVersion(file, {
      fs: countingFsAdapter(() => {}),
      childProcess: throwingChildProcess(),
    });
    assert.equal(result.version, "2.1.295");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("version-metadata-C14 nunca inicia o binário para ler metadados", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "doctor-pe-exec-"));
  try {
    const file = path.join(scratch, "claude.exe");
    writeFileSync(
      file,
      buildMinimalPe({
        version: { major: 2, minor: 1, build: 295, revision: 0 },
      }),
    );
    const result = await readPeVersion(file, {
      fs: countingFsAdapter(() => {}),
      childProcess: throwingChildProcess(),
    });
    assert.equal(result.version, "2.1.295");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// --- formal4 P2 (achado 1): metadado PE malformado nunca lança RangeError ---
// Um candidato encontrado e legível (MZ/PE/COFF presentes) com um campo além
// do COFF corrompido precisa continuar `version: null` com um motivo de
// formato não reconhecido/versão ilegível — nunca propagar uma exceção que o
// chamador (agent-resolution.mjs) traduziria em presence=unknown, como se o
// candidato não tivesse sido encontrado.
async function readCorruptedPe(scratch, name, buildCorrupted) {
  const file = path.join(scratch, name);
  const pe = buildMinimalPe({ version: { major: 2, minor: 1, build: 295, revision: 0 } });
  writeFileSync(file, buildCorrupted(pe));
  return readPeVersion(file, { fs: countingFsAdapter(() => {}), childProcess: throwingChildProcess() });
}

test("version-metadata-formal4-P2 SizeOfOptionalHeader zero não lança RangeError; version null/launcher_not_recognized", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "doctor-pe-optheader-zero-"));
  try {
    const result = await readCorruptedPe(scratch, "claude.exe", (pe) => corruptSizeOfOptionalHeader(pe, 0));
    assert.equal(result.version, null);
    assert.equal(result.reasonCode, "launcher_not_recognized");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("version-metadata-formal4-P2 SizeOfOptionalHeader curto demais para os campos usados (mas não zero) vira launcher_not_recognized", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "doctor-pe-optheader-curto-"));
  try {
    // 20 bytes bastam para o Magic (offset 0) mas não para NumberOfRvaAndSizes
    // (offset 108 do PE32+): o optional header real do arquivo é maior, mas
    // o campo declarado no COFF manda ler só os 20 primeiros bytes dele.
    const result = await readCorruptedPe(scratch, "claude.exe", (pe) => corruptSizeOfOptionalHeader(pe, 20));
    assert.equal(result.version, null);
    assert.equal(result.reasonCode, "launcher_not_recognized");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("version-metadata-formal4-P2 Magic desconhecido (nem PE32 nem PE32+) vira launcher_not_recognized, nunca interpretado como PE32", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "doctor-pe-magic-"));
  try {
    const result = await readCorruptedPe(scratch, "claude.exe", (pe) => corruptOptionalHeaderMagic(pe, 0x4d5a));
    assert.equal(result.version, null);
    assert.equal(result.reasonCode, "launcher_not_recognized");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("version-metadata-formal4-P2 offset do diretório de tipo de recurso apontando além da seção lida vira launcher_not_recognized", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "doctor-pe-dir-offset-"));
  try {
    const result = await readCorruptedPe(scratch, "claude.exe", (pe) =>
      corruptResourceTypeEntryOffset(pe, 0x7fffffff),
    );
    assert.equal(result.version, null);
    assert.equal(result.reasonCode, "launcher_not_recognized");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("version-metadata-formal4-P2 ponteiro do IMAGE_RESOURCE_DATA_ENTRY além da seção lida vira version_unreadable", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "doctor-pe-data-entry-"));
  try {
    const result = await readCorruptedPe(scratch, "claude.exe", (pe) =>
      corruptResourceDataEntryPointer(pe, 0x7fffffff),
    );
    assert.equal(result.version, null);
    assert.equal(result.reasonCode, "version_unreadable");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("version-metadata-formal4-P2 VS_FIXEDFILEINFO anunciado mais curto que o necessário vira version_unreadable", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "doctor-pe-fixedfileinfo-curto-"));
  try {
    const result = await readCorruptedPe(scratch, "claude.exe", (pe) => corruptVersionDataEntrySize(pe, 8));
    assert.equal(result.version, null);
    assert.equal(result.reasonCode, "version_unreadable");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Controle: o ramo PE32 (Magic 0x010b, ImageBase de 4 bytes, DataDirectory a
// partir de 96/92) já era suportado por pe.mjs antes desta correção, mas só
// era exercido por PE32+ nas fixtures existentes. Prova que os bounds checks
// novos não recusam um PE32 válido nem mudam seu resultado.
test("version-metadata-formal4-P2 controle: PE32 (Magic 0x010b) válido continua lendo a versão normalmente", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "doctor-pe-pe32-"));
  try {
    const file = path.join(scratch, "claude.exe");
    writeFileSync(
      file,
      buildMinimalPe({ version: { major: 2, minor: 1, build: 295, revision: 0 }, pe32: true }),
    );
    const result = await readPeVersion(file, {
      fs: countingFsAdapter(() => {}),
      childProcess: throwingChildProcess(),
    });
    assert.equal(result.version, "2.1.295");
    assert.equal(result.versionSource, "binary_metadata");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
