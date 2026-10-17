import { ONE_MIB_BYTES } from "../doctor/config-projection.mjs";
import { claudeHookDraft } from "./adapters/claude.mjs";
import { codexHookDraft } from "./adapters/codex-hooks.mjs";
import { createObservation } from "./observation.mjs";

export const HOOK_STDIN_DEADLINE_MS = 2000;

const ADAPTERS = { claude: claudeHookDraft, codex: codexHookDraft };

// Lê o stdin até o EOF, guardando no máximo `maxBytes`. O excedente continua
// sendo drenado (e descartado) para que o agente nunca receba erro de escrita
// no pipe; o prazo garante que um stdin que nunca fecha não prenda o hook.
export function readBoundedStdin(stream, { maxBytes, deadlineMs }) {
  return new Promise((resolve) => {
    const chunks = [];
    let total = 0;
    let settled = false;
    const finish = (state) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stream.removeAllListeners("data");
      if (state === "ok" && total > maxBytes) state = "too_large";
      resolve(state === "ok" ? { state, text: Buffer.concat(chunks).toString("utf8") } : { state });
    };
    const timer = setTimeout(() => finish("timeout"), deadlineMs);
    stream.on("data", (chunk) => {
      total += chunk.length;
      if (total <= maxBytes) chunks.push(chunk);
      else chunks.length = 0;
    });
    stream.on("end", () => finish("ok"));
    stream.on("error", () => finish("timeout"));
  });
}

// Um evento por processo, como os dois agentes iniciam hooks de comando. Nunca
// escreve em stdout (no Claude e no Codex isso vira contexto ou decisão) e
// quem chama sempre termina com 0 — nunca 2, que bloquearia a ação.
export async function runHookCommand({ agent, stdin, env }) {
  const observation = createObservation({ env });
  const adapter = Object.prototype.hasOwnProperty.call(ADAPTERS, agent) ? ADAPTERS[agent] : null;
  const input = await readBoundedStdin(stdin, { maxBytes: ONE_MIB_BYTES, deadlineMs: HOOK_STDIN_DEADLINE_MS });
  if (input.state === "too_large") observation.count("inputTooLarge");
  else if (input.state === "timeout") observation.count("stdinTimeout");
  else if (adapter === null) observation.count("invalidInput");
  else {
    let payload;
    try {
      payload = JSON.parse(input.text);
    } catch {
      payload = undefined;
    }
    if (payload === undefined) observation.count("invalidInput");
    else observation.submit(adapter(payload));
  }
  await observation.flush();
}
