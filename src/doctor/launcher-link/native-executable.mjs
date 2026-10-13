import { readHead } from "../snapshot-read.mjs";

// Assinaturas de executável nativo: PE ("MZ"), ELF e Mach-O (32/64 bits, nas
// duas ordens de bytes, e o binário universal). Um launcher assim (ex.: o
// codex.exe que acompanha o pacote npm ou o app do Codex, ou o hermes.exe
// compilado) não é um shim de texto: o doctor não extrai versão dele, e
// lê-lo como texto só esbarraria no limite de 1 MiB.
const NATIVE_EXECUTABLE_MAGICS = [
  [0x4d, 0x5a],
  [0x7f, 0x45, 0x4c, 0x46],
  [0xfe, 0xed, 0xfa, 0xce],
  [0xfe, 0xed, 0xfa, 0xcf],
  [0xce, 0xfa, 0xed, 0xfe],
  [0xcf, 0xfa, 0xed, 0xfe],
  [0xca, 0xfe, 0xba, 0xbe],
];

export async function isNativeExecutable(filePath, { fs }) {
  let head;
  try {
    head = await readHead(filePath, { fs, length: 4 });
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
  return NATIVE_EXECUTABLE_MAGICS.some((magic) => magic.every((byte, i) => head[i] === byte));
}
