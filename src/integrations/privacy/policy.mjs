import { randomBytes } from "node:crypto";
import { ENVELOPE_LIMITS, EVENT_KIND_FIELDS, buildEnvelope } from "../boundary.mjs";
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

// O motivo vem do valor do rascunho, não só do envelope aceito: a forma v1
// recusa alguns nomes inseguros (`~…`, canários com `=`/`?`/quebra de linha)
// como `not_identifier`/`too_long` antes da política, e essa lacuna mentiria
// sobre o motivo. A fronteira da #4 fica intacta; ver Landing "Nome inseguro
// recusado pela forma v1".
// O valor já copiado no envelope decide sozinho, sem nova leitura: um getter
// hostil pode responder outra coisa na releitura do rascunho, e só o motivo
// pode depender dela. Ver Landing "Valor entregue no envelope decide sempre".
const unsafeNameValue = (value) => typeof value === "string" && value !== "" && isUnsafeName(value);

function unsafeNameFields(envelope, draft) {
  return EVENT_KIND_FIELDS[envelope.eventKind].filter((name) => {
    if (!NAME_FIELDS.includes(name)) return false;
    if (Object.hasOwn(envelope.fields, name) && unsafeNameValue(envelope.fields[name])) return true;
    if (draft.fieldGaps?.[name] !== undefined) return false;
    return unsafeNameValue(Object.hasOwn(draft.fields, name) ? draft.fields[name] : undefined);
  });
}

function sanitizeEnvelope(envelope, draft, key, note) {
  const ids = {};
  for (const [name, value] of Object.entries(envelope.ids)) ids[name] = pseudonym(key, "id", value);
  const removed = unsafeNameFields(envelope, draft);
  for (const name of removed) note(`envelope.${name}:sensitive_removed`);
  const fields = Object.fromEntries(Object.entries(envelope.fields).filter(([name]) => !removed.includes(name)));
  const gaps = envelope.gaps.filter((gap) => !removed.includes(gap.slice(0, gap.indexOf(":"))));
  return { ...envelope, ids, fields, gaps };
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
    envelope = sanitizeEnvelope(built.envelope, draft, key, note);
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
