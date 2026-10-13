// Achado 2 da conferência root do delta formal8
// (.checks/code-review/formal8-root-feedback.md): createProductionFsAdapter()
// .open() obtinha o handle nativo e só o fechava explicitamente no ramo
// "!stats.isFile()" (revisão formal8, achado 4). Se o PRÓPRIO handle.stat()
// rejeitasse (ex.: EIO), a função inteira rejeitava sem fechar o handle — e
// o try/finally de quem chama (readSnapshot, snapshot-read.mjs) não ajuda
// aqui: ele só recebe um handle depois que este open() resolve, então um
// open() que rejeita nunca entrega nada para esse finally fechar. O vazamento
// era inteiramente interno a esta função.
//
// Handle duplo isolado: só o `open` nativo (node:fs/promises) é substituído,
// pelo parâmetro opcional acrescentado à fábrica já existente — nenhum
// framework de resolução de fs novo, nenhuma dependência de dispositivo
// real ou de permissão de SO. Em produção, createProductionFsAdapter()
// continua usando o `open` de node:fs/promises por padrão.
import assert from "node:assert/strict";
import test from "node:test";
import { createProductionFsAdapter } from "../../src/doctor/fs-adapter.mjs";

function handleDouble({ statResult, statError } = {}) {
  const calls = { stat: 0, close: 0 };
  return {
    calls,
    handle: {
      async stat() {
        calls.stat += 1;
        if (statError) throw statError;
        return statResult;
      },
      async close() {
        calls.close += 1;
      },
      async read() {
        throw new Error("não deveria ler: o handle não é entregue ao caller neste cenário");
      },
    },
  };
}

test("fs-adapter-formal8-root-2 handle.stat() rejeitando fecha o handle exatamente uma vez e preserva o erro original", async () => {
  const statError = new Error("I/O error");
  statError.code = "EIO";
  const { handle, calls } = handleDouble({ statError });
  const fs = createProductionFsAdapter({ openFile: async () => handle });

  await assert.rejects(
    () => fs.open("/fixture/qualquer"),
    (error) => {
      assert.equal(error, statError);
      assert.equal(error.code, "EIO");
      return true;
    },
  );
  assert.equal(calls.stat, 1);
  assert.equal(calls.close, 1);
});

// Controle: o ramo já existente do achado 4 (tipo não regular) continua
// fechando uma vez só — esta correção não pode regredir aquele achado.
test("fs-adapter-formal8-root-2 controle: tipo não regular continua fechando o handle uma vez só (sem regressão do achado 4 do formal8)", async () => {
  const { handle, calls } = handleDouble({ statResult: { isFile: () => false } });
  const fs = createProductionFsAdapter({ openFile: async () => handle });

  await assert.rejects(
    () => fs.open("/fixture/fifo"),
    (error) => {
      assert.equal(error.code, "ERR_NOT_REGULAR_FILE");
      return true;
    },
  );
  assert.equal(calls.stat, 1);
  assert.equal(calls.close, 1);
});

// Controle: arquivo regular não fecha o handle internamente — continua
// entregue ao caller, que é quem fecha (contrato de snapshot-read.mjs).
test("fs-adapter-formal8-root-2 controle: arquivo regular é entregue ao caller sem fechamento interno; caller fecha normalmente", async () => {
  const { handle, calls } = handleDouble({ statResult: { isFile: () => true } });
  const fs = createProductionFsAdapter({ openFile: async () => handle });

  const openable = await fs.open("/fixture/regular");
  assert.equal(calls.stat, 1);
  assert.equal(calls.close, 0);
  await openable.close();
  assert.equal(calls.close, 1);
});
