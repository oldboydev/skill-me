// Monta um PE32+ mínimo e válido com um recurso RT_VERSION (VS_FIXEDFILEINFO).
// Não é um executável funcional: AddressOfEntryPoint aponta para zero e não há
// seção de código. Serve só para o doctor ler a versão pela estrutura de
// recursos, sem precisar (e sem poder) iniciar o binário.
const FILE_ALIGNMENT = 512;
const HEADERS_SIZE = FILE_ALIGNMENT;
const RSRC_RVA = HEADERS_SIZE;
const RESOURCE_DATA_DIRECTORY_INDEX = 2;

function padTo(buffer, size) {
  if (buffer.length >= size) return buffer;
  const padded = Buffer.alloc(size);
  buffer.copy(padded);
  return padded;
}

function buildFixedFileInfo({ major, minor, build, revision }) {
  const info = Buffer.alloc(52);
  info.writeUInt32LE(0xfeef04bd, 0); // dwSignature
  info.writeUInt32LE(0x00010000, 4); // dwStrucVersion
  info.writeUInt32LE((major << 16) | minor, 8); // dwFileVersionMS
  info.writeUInt32LE((build << 16) | revision, 12); // dwFileVersionLS
  info.writeUInt32LE((major << 16) | minor, 16); // dwProductVersionMS
  info.writeUInt32LE((build << 16) | revision, 20); // dwProductVersionLS
  info.writeUInt32LE(0x3f, 24); // dwFileFlagsMask
  info.writeUInt32LE(0, 28); // dwFileFlags
  info.writeUInt32LE(0x00040004, 32); // dwFileOS = VOS_NT_WINDOWS32
  info.writeUInt32LE(1, 36); // dwFileType = VFT_APP
  info.writeUInt32LE(0, 40); // dwFileSubtype
  info.writeUInt32LE(0, 44); // dwFileDateMS
  info.writeUInt32LE(0, 48); // dwFileDateLS
  return info;
}

function buildVersionInfoBlock(version) {
  const key = Buffer.from("VS_VERSION_INFO\0", "utf16le"); // 32 bytes
  const fixed = buildFixedFileInfo(version);
  const head = Buffer.alloc(2 + 2 + 2); // wLength, wValueLength, wType
  head.writeUInt16LE(0, 0); // wLength patched below
  head.writeUInt16LE(fixed.length, 2); // wValueLength
  head.writeUInt16LE(0, 4); // wType = binary
  let block = Buffer.concat([head, key]);
  block = padTo(block, Math.ceil(block.length / 4) * 4); // align before Value
  block = Buffer.concat([block, fixed]);
  block.writeUInt16LE(block.length, 0); // wLength total, no StringFileInfo children
  return block;
}

function resourceDirectory(entries) {
  const header = Buffer.alloc(16);
  header.writeUInt16LE(entries.length, 14); // NumberOfIdEntries
  const rows = entries.map(({ id, offset, isDirectory }) => {
    const row = Buffer.alloc(8);
    row.writeUInt32LE(id, 0);
    row.writeUInt32LE(isDirectory ? (0x80000000 | offset) >>> 0 : offset, 4);
    return row;
  });
  return Buffer.concat([header, ...rows]);
}

export function buildMinimalPe({
  version,
  machine = 0x8664,
  overlayBytes = 0,
  // Idioma do recurso de versão: o código de produção nunca presume
  // especificamente 0x0409 (en-US) — usa a primeira entrada de idioma que
  // encontrar. Testes podem passar outro valor para provar isso de verdade
  // (ver version-metadata.unit.test.mjs).
  languageId = 0x0409,
}) {
  const versionInfo = buildVersionInfoBlock(version);
  const dataEntryOffset = 24 + 24 + 24; // level0 + level1 + level2
  const versionInfoOffset = dataEntryOffset + 16;

  const level2 = resourceDirectory([
    { id: languageId, offset: dataEntryOffset, isDirectory: false },
  ]);
  const level1 = resourceDirectory([{ id: 1, offset: 48, isDirectory: true }]);
  const level0 = resourceDirectory([{ id: 16, offset: 24, isDirectory: true }]);

  const dataEntry = Buffer.alloc(16);
  dataEntry.writeUInt32LE(RSRC_RVA + versionInfoOffset, 0); // OffsetToData (RVA)
  dataEntry.writeUInt32LE(versionInfo.length, 4); // Size
  dataEntry.writeUInt32LE(0, 8); // CodePage
  dataEntry.writeUInt32LE(0, 12); // Reserved

  const rsrcContent = Buffer.concat([
    level0,
    level1,
    level2,
    dataEntry,
    versionInfo,
  ]);
  const rsrcVirtualSize = rsrcContent.length;
  const rsrcRaw = padTo(rsrcContent, FILE_ALIGNMENT);

  const dosHeader = Buffer.alloc(64);
  dosHeader.write("MZ", 0, "ascii");
  dosHeader.writeUInt32LE(64, 0x3c); // e_lfanew

  const peSignature = Buffer.from("PE\0\0", "ascii");

  const coff = Buffer.alloc(20);
  coff.writeUInt16LE(machine, 0);
  coff.writeUInt16LE(1, 2); // NumberOfSections
  coff.writeUInt32LE(0, 4); // TimeDateStamp
  coff.writeUInt32LE(0, 8); // PointerToSymbolTable
  coff.writeUInt32LE(0, 12); // NumberOfSymbols
  coff.writeUInt16LE(240, 16); // SizeOfOptionalHeader (PE32+, 16 data dirs)
  coff.writeUInt16LE(0x0022, 18); // Characteristics

  const optional = Buffer.alloc(240);
  optional.writeUInt16LE(0x020b, 0); // Magic: PE32+
  optional.writeUInt8(14, 2); // MajorLinkerVersion
  optional.writeUInt8(0, 3); // MinorLinkerVersion
  optional.writeUInt32LE(0, 4); // SizeOfCode
  optional.writeUInt32LE(0, 8); // SizeOfInitializedData
  optional.writeUInt32LE(0, 12); // SizeOfUninitializedData
  optional.writeUInt32LE(0, 16); // AddressOfEntryPoint (não iniciável)
  optional.writeUInt32LE(0, 20); // BaseOfCode
  optional.writeBigUInt64LE(0x140000000n, 24); // ImageBase
  optional.writeUInt32LE(FILE_ALIGNMENT, 32); // SectionAlignment
  optional.writeUInt32LE(FILE_ALIGNMENT, 36); // FileAlignment
  optional.writeUInt32LE(HEADERS_SIZE + rsrcRaw.length, 56); // SizeOfImage
  optional.writeUInt32LE(HEADERS_SIZE, 60); // SizeOfHeaders
  optional.writeUInt16LE(3, 68); // Subsystem: console
  optional.writeUInt32LE(16, 108); // NumberOfRvaAndSizes
  const dataDirOffset = 112;
  // DataDirectory[2] = Resource Table
  optional.writeUInt32LE(RSRC_RVA, dataDirOffset + 2 * 8);
  optional.writeUInt32LE(rsrcVirtualSize, dataDirOffset + 2 * 8 + 4);

  const section = Buffer.alloc(40);
  section.write(".rsrc\0\0\0", 0, "ascii");
  section.writeUInt32LE(rsrcVirtualSize, 8); // VirtualSize
  section.writeUInt32LE(RSRC_RVA, 12); // VirtualAddress
  section.writeUInt32LE(rsrcRaw.length, 16); // SizeOfRawData
  section.writeUInt32LE(HEADERS_SIZE, 20); // PointerToRawData
  section.writeUInt32LE(0x40000040, 36); // INITIALIZED_DATA | READABLE

  const headerBlock = padTo(
    Buffer.concat([dosHeader, peSignature, coff, optional, section]),
    HEADERS_SIZE,
  );

  const overlay =
    overlayBytes > 0 ? Buffer.alloc(overlayBytes, 0x00) : Buffer.alloc(0);

  return Buffer.concat([headerBlock, rsrcRaw, overlay]);
}

export const RESOURCE_SECTION_FILE_OFFSET = HEADERS_SIZE;

// Offsets absolutos (dado o layout fixo desta função) dos campos
// IMAGE_DATA_DIRECTORY do diretório de recursos no optional header PE32+:
// dosHeader(64) + peSignature(4) + coff(20) = 88 até o início do optional
// header; dataDirOffset(112) + índice 2 (recursos) * 8 = RVA, +4 = Size.
const OPTIONAL_HEADER_FILE_OFFSET = 64 + 4 + 20;
const RESOURCE_DATA_DIRECTORY_OFFSET_IN_OPTIONAL = 112 + RESOURCE_DATA_DIRECTORY_INDEX * 8;
export const RESOURCE_DATA_DIRECTORY_RVA_FILE_OFFSET =
  OPTIONAL_HEADER_FILE_OFFSET + RESOURCE_DATA_DIRECTORY_OFFSET_IN_OPTIONAL;
export const RESOURCE_DATA_DIRECTORY_SIZE_FILE_OFFSET =
  RESOURCE_DATA_DIRECTORY_RVA_FILE_OFFSET + 4;

export function corruptResourceSize(buffer, size) {
  const corrupted = Buffer.from(buffer);
  corrupted.writeUInt32LE(size >>> 0, RESOURCE_DATA_DIRECTORY_SIZE_FILE_OFFSET);
  return corrupted;
}

// Offset absoluto do campo dwSignature do VS_FIXEDFILEINFO, dada a
// disposição fixa desta função (nenhum StringFileInfo, um único recurso).
// 24 (dirs) + 24 + 24 + 16 (data entry) = 88 até o início do VS_VERSIONINFO;
// +40 até o Value (6 do cabeçalho + 32 da chave + 2 de alinhamento).
export const FIXEDFILEINFO_SIGNATURE_FILE_OFFSET =
  RESOURCE_SECTION_FILE_OFFSET + 88 + 40;

export function corruptFixedFileInfoSignature(buffer) {
  const corrupted = Buffer.from(buffer);
  corrupted.writeUInt32LE(0, FIXEDFILEINFO_SIGNATURE_FILE_OFFSET);
  return corrupted;
}
