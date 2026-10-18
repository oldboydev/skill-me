import assert from "node:assert/strict";
import { runPrivacyCommand } from "../../../src/integrations/privacy/command.mjs";
import { appendRecords } from "../../../src/integrations/privacy/store.mjs";
import { runIntegrations } from "./cli.mjs";

// Registro v1 JÁ sanitizado, escrito à mão para a camada de armazenamento:
// não é saída de applyPolicy e não prova sanitização (as provas da política
// usam o `privacy ingest` real). Só a forma externa do registro do Landing;
// `pad` controla o tamanho serializado.
export function sanitizedRecord(index, pad = "") {
  return {
    recordVersion: 1,
    envelope: { schemaVersion: 1, eventKind: "tool_end", ids: { sessionId: `h1:${"A".repeat(42)}${index % 10}` }, pad },
    privacy: ["content:content_disabled"],
    content: null,
  };
}

export function recordLineBytes(record) {
  return Buffer.byteLength(JSON.stringify(record) + "\n");
}

export async function startIn(root, extra = [], now) {
  const result = await runPrivacyCommand({ argv: ["start", "--root", root, ...extra], now });
  assert.equal(result.exitCode, 0, JSON.stringify(result.body));
  return result.body.capture.id;
}

export async function appendSanitized(root, id, count, batch = {}) {
  const records = Array.from({ length: count }, (_, i) => sanitizedRecord(i));
  return appendRecords({ root, id, batch: { records, malformed: 0, dropped: {}, contentOmitted: {}, ...batch } });
}

// `privacy` pelo processo real do CLI; stdout é sempre um único JSON.
export function runPrivacy(args, options) {
  const result = runIntegrations(["privacy", ...args], options);
  let body;
  try {
    body = JSON.parse(result.stdout);
  } catch (cause) {
    throw new Error(`stdout não é um JSON único: ${JSON.stringify(result.stdout)} stderr=${JSON.stringify(result.stderr)}`, { cause });
  }
  return { ...result, body };
}
