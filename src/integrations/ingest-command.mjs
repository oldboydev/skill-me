import { hermesDraft } from "./adapters/hermes.mjs";
import { STREAM_MAX_LINE_BYTES, createLineReader } from "./line-reader.mjs";
import { createObservation } from "./observation.mjs";
import { captureDeliveryFor } from "./traces/binding.mjs";

// Destino da entrega do plugin Hermes: NDJSON `{hook, kwargs, nonScalar}` no
// stdin, um registro por linha, até o EOF (o processo Hermes terminou ou a
// entrega foi desligada). A fronteira roda aqui, em Node — o plugin Python não
// tem cópia de nenhuma regra dela. Sempre termina com 0. Vinculado a uma
// captura, abre a captura antes de ler: as linhas esperam no pipe, não na memória.
export async function runIngestCommand({ agent, stdin, env }) {
  const delivery = await captureDeliveryFor({ env, agent: "hermes" });
  const observation = createObservation({ env, delivery });
  await delivery?.open();
  const reader = createLineReader({
    maxLineBytes: STREAM_MAX_LINE_BYTES,
    onLine(buffer) {
      if (agent !== "hermes") return observation.count("invalidInput");
      let record;
      try {
        record = JSON.parse(buffer.toString("utf8"));
      } catch {
        return observation.count("invalidJson");
      }
      observation.submit(hermesDraft(record), record);
    },
    onOversize: () => observation.count("oversizeLine"),
    onPartialTrailing: () => observation.count("partialTrailingLine"),
  });
  await new Promise((resolve) => {
    stdin.on("data", (chunk) => reader.push(chunk));
    stdin.on("end", resolve);
    stdin.on("error", resolve);
  });
  reader.end();
  await observation.flush();
}
