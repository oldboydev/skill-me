import { deepFreeze } from "../memory-receiver.mjs";
import { createStoreIo } from "../privacy/fs.mjs";
import { exportCapture } from "../privacy/store.mjs";

// Releitura local de uma captura para um consumidor analítico (issue #8,
// crit. 11). Só o store é lido — os mesmos registros sanitizados do
// `privacy export` —, sem executar comando nativo, iniciar agente ou reler
// skill. O consumidor recebe uma cópia congelada com a ordem gravada
// (`sequence`, a partir de 1), a origem de cada registro (envelope v1) e o
// estado, os contadores e os limites da captura; nunca a chave nem caminhos.
// Correlação, timeline e relatório são da #6/#7: nada disso é calculado aqui.

export async function replayCapture({ root, id, consumer, io = createStoreIo() }) {
  const { capture, records } = await exportCapture({ root, id, io });
  const trace = deepFreeze({ capture, records: records.map((record, index) => ({ sequence: index + 1, record })) });
  return consumer(trace);
}
