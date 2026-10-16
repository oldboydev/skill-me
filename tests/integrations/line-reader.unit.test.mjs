import assert from "node:assert/strict";
import test from "node:test";
import { createLineReader } from "../../src/integrations/line-reader.mjs";

function recorder(maxLineBytes = 64 * 1024) {
  const events = [];
  const reader = createLineReader({
    maxLineBytes,
    onLine: (buffer) => events.push(["line", buffer.toString("utf8")]),
    onOversize: () => events.push(["oversize"]),
    onPartialTrailing: () => events.push(["partial"]),
  });
  return { reader, events };
}

test("I4-C16b leitor incremental: linha partida, limite, fragmento final e CRLF", () => {
  // Linha partida entre chunks (inclusive no meio de um caractere UTF-8)
  // só é entregue quando o \n chega — nem antes, nem duas vezes.
  const { reader, events } = recorder();
  const line = Buffer.from('{"type":"turn.started","x":"ção"}\n');
  reader.push(line.subarray(0, 10));
  assert.deepEqual(events, []);
  reader.push(line.subarray(10, 28));
  assert.deepEqual(events, []);
  reader.push(line.subarray(28));
  assert.deepEqual(events, [["line", '{"type":"turn.started","x":"ção"}']]);

  // Várias linhas num chunk, CRLF normalizado, linha vazia ignorada.
  reader.push(Buffer.from('{"a":1}\r\n\n{"b":2}\n{"c"'));
  assert.deepEqual(events.slice(1), [["line", '{"a":1}'], ["line", '{"b":2}']]);
  // Fragmento final sem \n no EOF é descartado e contado, nunca interpretado.
  reader.end();
  assert.deepEqual(events.slice(3), [["partial"]]);

  // Linha acima do limite: descartada até o próximo \n, contada uma vez,
  // e a linha seguinte volta a ser lida normalmente.
  const limited = recorder(16);
  limited.reader.push(Buffer.from("0123456789"));
  limited.reader.push(Buffer.from("0123456789")); // passa de 16 sem \n
  limited.reader.push(Buffer.from("abcdef\n"));
  limited.reader.push(Buffer.from('{"ok":true}\n'));
  assert.deepEqual(limited.events, [["oversize"], ["line", '{"ok":true}']]);
  // Exatamente no limite ainda é aceita; um byte a mais não.
  limited.reader.push(Buffer.from("x".repeat(16) + "\n" + "y".repeat(17) + "\n"));
  assert.deepEqual(limited.events.slice(2), [["line", "x".repeat(16)], ["oversize"]]);
  limited.reader.end();
  assert.equal(limited.events.length, 4);
});
