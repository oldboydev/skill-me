import { open as fsOpen } from "node:fs/promises";

// Leitura estrutural de PE/VS_FIXEDFILEINFO por offsets, nunca pelo
// conteúdo inteiro do arquivo: cada campo é lido por posição fixa do
// formato, então um binário de dezenas de MiB custa algumas leituras
// pequenas, não uma cópia integral em memória. O binário nunca é iniciado;
// childProcess é aceito apenas para provar, em teste, que não é chamado.
const DOS_HEADER_SIZE = 64;
const PE_SIGNATURE_OFFSET_POINTER = 0x3c;
const COFF_HEADER_SIZE = 20;
const RESOURCE_DATA_DIRECTORY_INDEX = 2;
// `resourceSize` vem de um campo de 32 bits não confiável do próprio
// arquivo: sem um teto, um header corrompido anunciando gigabytes de
// recurso tentaria alocar/ler esse tanto, podendo derrubar o processo
// nativamente, não apenas estourar memória. Uma seção .rsrc real contendo
// só VERSIONINFO nunca chega perto disto; qualquer coisa maior é recusada
// de forma conservadora, sem alocar.
const MAX_RESOURCE_SECTION_BYTES = 8 * 1024 * 1024;

async function readExact(handle, length, position) {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await handle.read(buffer, 0, length, position);
  if (bytesRead !== length) {
    const error = new Error("leitura incompleta de metadado PE");
    error.code = "PE_TRUNCATED";
    throw error;
  }
  return buffer;
}

function defaultFsAdapter() {
  return {
    async open(filePath) {
      const handle = await fsOpen(filePath, "r");
      return {
        read: (buffer, offset, length, position) =>
          handle.read(buffer, offset, length, position),
        stat: () => handle.stat(),
        close: () => handle.close(),
      };
    },
  };
}

// Um offset de diretório corrompido (vindo direto do header do PE, não
// confiável) pode apontar além da seção de recursos já lida. Nenhum campo é
// lido antes de confirmar que cabe no buffer; fora do alcance é tratado como
// diretório vazio (nenhuma entrada), nunca como RangeError.
function directoryEntries(view, directoryOffset) {
  if (directoryOffset < 0 || directoryOffset + 16 > view.length) return [];
  const numberOfIdEntries = view.readUInt16LE(directoryOffset + 14);
  const entriesStart = directoryOffset + 16;
  const entries = [];
  for (let index = 0; index < numberOfIdEntries; index += 1) {
    const entryOffset = entriesStart + index * 8;
    if (entryOffset + 8 > view.length) break;
    const rawOffset = view.readUInt32LE(entryOffset + 4);
    entries.push({
      id: view.readUInt32LE(entryOffset),
      isDirectory: (rawOffset & 0x80000000) !== 0,
      // Todo offset de IMAGE_RESOURCE_DIRECTORY_ENTRY é relativo ao início
      // do diretório de recursos raiz (início da seção .rsrc), nunca ao
      // diretório pai.
      offset: rawOffset & 0x7fffffff,
    });
  }
  return entries;
}

// RT_VERSION (16) é a única entrada de interesse no nível de tipo. Os
// níveis de nome e idioma variam por build/locale e não são fixados aqui:
// a primeira entrada de cada um é usada, como o Resource Hacker/binaries
// reais normalmente expõem um único VERSIONINFO por módulo.
function findVersionDataEntryOffset(view) {
  const typeLevel = directoryEntries(view, 0);
  const versionType = typeLevel.find((entry) => entry.id === 16 && entry.isDirectory);
  if (!versionType) return null;
  const nameLevel = directoryEntries(view, versionType.offset);
  const firstName = nameLevel.find((entry) => entry.isDirectory);
  if (!firstName) return null;
  const languageLevel = directoryEntries(view, firstName.offset);
  const firstLanguage = languageLevel.find((entry) => !entry.isDirectory);
  if (!firstLanguage) return null;
  return firstLanguage.offset;
}

function readFixedFileInfo(versionInfoBuffer) {
  // VS_VERSION_INFO: wLength, wValueLength, wType, 32 bytes de chave UTF-16,
  // alinhamento até múltiplo de 4, então VS_FIXEDFILEINFO.
  const keyEnd = 6 + 32;
  const valueOffset = Math.ceil(keyEnd / 4) * 4;
  // `Size` do IMAGE_RESOURCE_DATA_ENTRY vem do próprio header, não confiável:
  // um VS_FIXEDFILEINFO anunciado mais curto que os 16 bytes lidos abaixo
  // (dwSignature + dwStrucVersion + dwFileVersionMS/LS) é malformado, nunca
  // um RangeError.
  if (versionInfoBuffer.length < valueOffset + 16) return null;
  const signature = versionInfoBuffer.readUInt32LE(valueOffset);
  if (signature !== 0xfeef04bd) return null;
  const fileVersionMs = versionInfoBuffer.readUInt32LE(valueOffset + 8);
  const fileVersionLs = versionInfoBuffer.readUInt32LE(valueOffset + 12);
  return {
    major: fileVersionMs >>> 16,
    minor: fileVersionMs & 0xffff,
    build: fileVersionLs >>> 16,
    revision: fileVersionLs & 0xffff,
  };
}

export async function readPeVersion(filePath, { fs = defaultFsAdapter() } = {}) {
  const handle = await fs.open(filePath);
  try {
    return await readPeVersionFromHandle(handle);
  } catch (error) {
    if (error.code === "PE_TRUNCATED") {
      return { version: null, reasonCode: "launcher_not_recognized" };
    }
    throw error;
  } finally {
    await handle.close();
  }
}

async function readPeVersionFromHandle(handle) {
  {
    const dosHeader = await readExact(handle, DOS_HEADER_SIZE, 0);
    if (dosHeader.toString("ascii", 0, 2) !== "MZ") {
      return { version: null, reasonCode: "launcher_not_recognized" };
    }
    const peHeaderOffset = dosHeader.readUInt32LE(PE_SIGNATURE_OFFSET_POINTER);
    const peSignature = await readExact(handle, 4, peHeaderOffset);
    if (peSignature.toString("ascii") !== "PE\0\0") {
      return { version: null, reasonCode: "launcher_not_recognized" };
    }
    const coff = await readExact(
      handle,
      COFF_HEADER_SIZE,
      peHeaderOffset + 4,
    );
    const sizeOfOptionalHeader = coff.readUInt16LE(16);
    const numberOfSections = coff.readUInt16LE(2);
    const optionalHeaderOffset = peHeaderOffset + 4 + COFF_HEADER_SIZE;
    const optional = await readExact(
      handle,
      sizeOfOptionalHeader,
      optionalHeaderOffset,
    );
    // SizeOfOptionalHeader vem do COFF, não confiável: um valor zero ou
    // curto demais para o Magic (PE32/PE32+) não é um PE lido pela metade,
    // é um formato que esta leitura não reconhece.
    if (optional.length < 2) {
      return { version: null, reasonCode: "launcher_not_recognized" };
    }
    const magic = optional.readUInt16LE(0);
    if (magic !== 0x010b && magic !== 0x020b) {
      return { version: null, reasonCode: "launcher_not_recognized" };
    }
    const isPe32Plus = magic === 0x020b;
    const dataDirOffset = isPe32Plus ? 112 : 96;
    const numberOfRvaAndSizesOffset = isPe32Plus ? 108 : 92;
    // Mesmo com Magic reconhecido, um optional header mais curto que os
    // campos usados abaixo (NumberOfRvaAndSizes e o DataDirectory de
    // recursos) é a mesma situação: formato não reconhecido, não RangeError.
    if (optional.length < numberOfRvaAndSizesOffset + 4) {
      return { version: null, reasonCode: "launcher_not_recognized" };
    }
    const numberOfRvaAndSizes = optional.readUInt32LE(numberOfRvaAndSizesOffset);
    if (numberOfRvaAndSizes <= RESOURCE_DATA_DIRECTORY_INDEX) {
      return { version: null, reasonCode: "launcher_not_recognized" };
    }
    if (optional.length < dataDirOffset + RESOURCE_DATA_DIRECTORY_INDEX * 8 + 8) {
      return { version: null, reasonCode: "launcher_not_recognized" };
    }
    const resourceRva = optional.readUInt32LE(
      dataDirOffset + RESOURCE_DATA_DIRECTORY_INDEX * 8,
    );
    const resourceSize = optional.readUInt32LE(
      dataDirOffset + RESOURCE_DATA_DIRECTORY_INDEX * 8 + 4,
    );
    if (resourceSize === 0) {
      return { version: null, reasonCode: "launcher_not_recognized" };
    }

    const sectionTableOffset = optionalHeaderOffset + sizeOfOptionalHeader;
    const sections = await readExact(
      handle,
      numberOfSections * 40,
      sectionTableOffset,
    );
    let resourceFileOffset = null;
    for (let index = 0; index < numberOfSections; index += 1) {
      const base = index * 40;
      const virtualAddress = sections.readUInt32LE(base + 12);
      const virtualSize = sections.readUInt32LE(base + 8);
      const pointerToRawData = sections.readUInt32LE(base + 20);
      if (resourceRva >= virtualAddress && resourceRva < virtualAddress + virtualSize) {
        resourceFileOffset = pointerToRawData + (resourceRva - virtualAddress);
        break;
      }
    }
    if (resourceFileOffset === null) {
      return { version: null, reasonCode: "launcher_not_recognized" };
    }
    // Valida o tamanho/alcance do recurso ANTES de alocar/ler: um
    // resourceSize corrompido (maior que o teto ou maior que o próprio
    // arquivo) é recusado aqui, nunca repassado a readExact.
    if (resourceSize > MAX_RESOURCE_SECTION_BYTES) {
      return { version: null, reasonCode: "version_unreadable" };
    }
    const { size: fileSize } = await handle.stat();
    if (resourceFileOffset + resourceSize > fileSize) {
      return { version: null, reasonCode: "version_unreadable" };
    }

    const resourceSection = await readExact(handle, resourceSize, resourceFileOffset);
    const dataEntryOffset = findVersionDataEntryOffset(resourceSection);
    if (dataEntryOffset === null) {
      return { version: null, reasonCode: "launcher_not_recognized" };
    }
    // `dataEntryOffset` vem do offset de uma entrada de idioma na própria
    // tabela de recursos (não confiável): a estrutura foi encontrada, mas o
    // ponteiro para o IMAGE_RESOURCE_DATA_ENTRY pode apontar além da seção
    // já lida.
    if (dataEntryOffset < 0 || dataEntryOffset + 8 > resourceSection.length) {
      return { version: null, reasonCode: "version_unreadable" };
    }
    const resourceDataRva = resourceSection.readUInt32LE(dataEntryOffset);
    const resourceDataSize = resourceSection.readUInt32LE(dataEntryOffset + 4);
    const versionInfoOffsetInSection = resourceDataRva - resourceRva;
    if (
      versionInfoOffsetInSection < 0 ||
      versionInfoOffsetInSection + resourceDataSize > resourceSection.length
    ) {
      return { version: null, reasonCode: "version_unreadable" };
    }
    const versionInfo = resourceSection.subarray(
      versionInfoOffsetInSection,
      versionInfoOffsetInSection + resourceDataSize,
    );
    const fixedFileInfo = readFixedFileInfo(versionInfo);
    if (!fixedFileInfo) {
      return { version: null, reasonCode: "version_unreadable" };
    }
    const version = `${fixedFileInfo.major}.${fixedFileInfo.minor}.${fixedFileInfo.build}`;
    return { version, versionSource: "binary_metadata" };
  }
}
