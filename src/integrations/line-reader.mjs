// Leitor NDJSON incremental compartilhado pelo wrapper do Codex (stdout do
// filho) e pelo `ingest` do Hermes (stdin). Entrega cada linha assim que o `\n`
// chega, nunca acumula mais que `maxLineBytes` (excedente é descartado até o
// próximo `\n`) e descarta o fragmento final sem `\n`: um processo que morre no
// meio de uma escrita deixa um JSON incompleto que não deve ser interpretado.

// Teto de uma linha NDJSON (stdout do Codex e stdin do ingest).
export const STREAM_MAX_LINE_BYTES = 64 * 1024;

export function createLineReader({ maxLineBytes, onLine, onOversize, onPartialTrailing }) {
  let pending = [];
  let pendingBytes = 0;
  let discarding = false;

  function resetPending() {
    pending = [];
    pendingBytes = 0;
  }

  function emit(lastPiece) {
    const line = pending.length === 0 ? lastPiece : Buffer.concat([...pending, lastPiece]);
    resetPending();
    const end = line.length > 0 && line[line.length - 1] === 0x0d ? line.length - 1 : line.length;
    if (end > 0) onLine(line.subarray(0, end));
  }

  return {
    push(chunk) {
      let start = 0;
      while (start <= chunk.length) {
        const newline = chunk.indexOf(0x0a, start);
        if (newline === -1) {
          const rest = chunk.subarray(start);
          if (discarding || rest.length === 0) return;
          if (pendingBytes + rest.length > maxLineBytes) {
            resetPending();
            discarding = true;
            onOversize();
            return;
          }
          pending.push(rest);
          pendingBytes += rest.length;
          return;
        }
        const piece = chunk.subarray(start, newline);
        if (discarding) {
          discarding = false;
        } else if (pendingBytes + piece.length > maxLineBytes) {
          resetPending();
          onOversize();
        } else {
          emit(piece);
        }
        start = newline + 1;
      }
    },
    end() {
      if (discarding) {
        discarding = false;
        return;
      }
      if (pendingBytes > 0) {
        resetPending();
        onPartialTrailing();
      }
    },
  };
}
