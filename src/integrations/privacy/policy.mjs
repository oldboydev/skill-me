import { randomBytes } from "node:crypto";
import { ENVELOPE_LIMITS, buildEnvelope } from "../boundary.mjs";
import { extractContent, pseudonym } from "./content.mjs";
import { isUnsafeName } from "./sanitize.mjs";

// Política única da issue #5: todo consumidor do debugger (relatório dos
// hooks/ingest/wrapper, `privacy ingest` e a futura #8) recebe o registro que
// sai daqui, nunca uma cópia própria da regra. Ordem fixa: envelope v1 →
// pseudônimos e nomes → conteúdo (projeção, sanitização, orçamento) →
// orçamento do envelope sanitizado. Ver Landing em .checks/issue-5-privacidade.md.

export { pseudonym };

export const NAME_FIELDS = Object.freeze([
  "toolName",
  "skillName",
  "commandName",
  "commandSource",
  "agentType",
  "mcpServer",
  "errorType",
  "platform",
  "childRole",
  "childStatus",
  "processSignal",
]);

// Só eventos de ferramenta têm argumentos/resultados a decidir.
export const TOOL_EVENT_KINDS = Object.freeze(["tool_pre", "tool_post", "item", "skill_invocation"]);

// Chave de um processo sem captura (hook, ingest Hermes, wrapper): vive só na
// memória dele, então nada observado ali é correlacionável com outro processo.
export const createEphemeralKey = () => randomBytes(32);

export function checkEnvelopeBudget(envelope) {
  return Buffer.byteLength(JSON.stringify(envelope), "utf8") > ENVELOPE_LIMITS.maxEnvelopeBytes ? "envelope_oversize" : null;
}

function sanitizeEnvelope(envelope, key, note) {
  const ids = {};
  for (const [name, value] of Object.entries(envelope.ids)) ids[name] = pseudonym(key, "id", value);
  const fields = {};
  for (const [name, value] of Object.entries(envelope.fields)) {
    if (NAME_FIELDS.includes(name) && isUnsafeName(value)) note(`envelope.${name}:sensitive_removed`);
    else fields[name] = value;
  }
  return { ...envelope, ids, fields };
}

// -> { ok: false, drop } | { ok: true, record }. `drop` e as entradas de
// `privacy` são códigos fechados; nenhuma mensagem de exceção ou valor sai.
export function applyPolicy({ draft, payload, key, content }) {
  const privacy = [];
  const note = (entry) => {
    if (!privacy.includes(entry)) privacy.push(entry);
  };
  let envelope;
  try {
    const built = buildEnvelope(draft);
    if (!built.ok) return { ok: false, drop: built.reason === "oversize" ? "envelope_oversize" : "invalid_event" };
    envelope = sanitizeEnvelope(built.envelope, key, note);
  } catch {
    return { ok: false, drop: "privacy_failure" };
  }
  const oversize = checkEnvelopeBudget(envelope);
  if (oversize !== null) return { ok: false, drop: oversize };

  let recordContent = null;
  if (TOOL_EVENT_KINDS.includes(envelope.eventKind)) {
    if (content !== true) note("content:content_disabled");
    else {
      try {
        const extracted = extractContent({ contract: envelope.source.contract, nativeEvent: envelope.nativeEvent, payload, key });
        recordContent = extracted.content;
        for (const entry of extracted.privacy) note(entry);
      } catch {
        // Só a parte insegura sai: sem conteúdo parcial, sem nova tentativa.
        recordContent = null;
        note("content:privacy_failure");
      }
    }
  }
  return { ok: true, record: { recordVersion: 1, envelope, privacy, content: recordContent } };
}
