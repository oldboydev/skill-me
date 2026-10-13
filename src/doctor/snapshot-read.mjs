import { toOpenableFsAdapter } from "./fs-openable.mjs";

// Lê no máximo `maxBytes + 1` bytes de verdade, nunca mais, não importa o
// que um stat() anterior tenha dito: um arquivo que cresça entre um stat()
// e a leitura (ou um stat() simplesmente incorreto) não produz alocação
// arbitrária, porque o teto é aplicado pela própria operação de leitura
// posicional, não por uma checagem de tamanho prévia. Sem segunda tentativa:
// para no primeiro `bytesRead === 0` (EOF) ou ao preencher o buffer
// (tooLarge).
async function readBounded(handle, maxBytes) {
  const capacity = maxBytes + 1;
  const buffer = Buffer.alloc(capacity);
  let total = 0;
  while (total < capacity) {
    const { bytesRead } = await handle.read(buffer, total, capacity - total, total);
    if (bytesRead === 0) break;
    total += bytesRead;
  }
  if (total > maxBytes) return { tooLarge: true };
  const stats = await handle.stat();
  return {
    tooLarge: false,
    content: buffer.subarray(0, total),
    changedDuringRead: total !== stats.size,
  };
}

// Leitura de snapshot: sem segunda tentativa. Se o tamanho mudar durante a
// leitura, o diagnóstico registra a mutação como limitação em vez de repetir
// a leitura ou "consertar" o dado. Sem `maxBytes`, mantém o contrato simples
// de stat()+readFile() (único chamador hoje: callers com `maxBytes` sempre
// usam a leitura limitada acima).
export async function readSnapshot(filePath, { fs, maxBytes } = {}) {
  if (typeof maxBytes !== "number") {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath);
    return {
      tooLarge: false,
      content,
      changedDuringRead: content.length !== stats.size,
    };
  }

  const handle = await toOpenableFsAdapter(fs).open(filePath);
  try {
    return await readBounded(handle, maxBytes);
  } finally {
    await handle.close();
  }
}

// Lê só os primeiros `length` bytes: basta para reconhecer o cabeçalho de um
// executável nativo sem ler um binário de centenas de MB.
export async function readHead(filePath, { fs, length }) {
  const handle = await toOpenableFsAdapter(fs).open(filePath);
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

// Leitor de texto limitado compartilhado por codex.mjs/hermes.mjs, com teto
// real aplicado pela leitura posicional (ver readBounded acima), não por um
// stat() prévio. ENOENT vira "missing" (resultado normal: artefato ausente);
// exceder `maxBytes` vira "too_large", distinto de "não reconhecido", para
// que o chamador possa reportar `input_too_large` em vez de confundir isso
// com ausência de vínculo. Uma mutação detectada durante a leitura
// (`changedDuringRead`) vira "changed_during_read": o texto lido pode
// corresponder a um estado que já não existe mais (metade antes, metade
// depois de uma escrita real), então nunca é devolvido como "ok" — mesmo
// tratamento que `config-reader.mjs` já dá à mesma condição (critério 15).
export async function readBoundedText(filePath, { fs, maxBytes }) {
  let snapshot;
  try {
    snapshot = await readSnapshot(filePath, { fs, maxBytes });
  } catch (error) {
    if (error.code === "ENOENT") return { state: "missing" };
    throw error;
  }
  if (snapshot.tooLarge) return { state: "too_large" };
  if (snapshot.changedDuringRead) return { state: "changed_during_read" };
  return { state: "ok", text: snapshot.content.toString("utf8") };
}
