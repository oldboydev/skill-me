import { hermesDraft } from "./adapters/hermes.mjs";
import { createLineReader } from "./line-reader.mjs";
import { createObservation } from "./observation.mjs";

export const STREAM_MAX_LINE_BYTES = 64 * 1024;

// Destino da entrega do plugin Hermes: NDJSON `{hook, kwargs, nonScalar}` no
// stdin, um registro por linha, até o EOF (o processo Hermes terminou ou a
// entrega foi desligada). A fronteira roda aqui, em Node — o plugin Python não
// tem cópia de nenhuma regra dela. Sempre termina com 0.
export async function runIngestCommand({ agent, stdin, env }) {
  const observation = createObservation({ env });
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
      observation.submit(hermesDraft(record));
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
