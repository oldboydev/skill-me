import { createHmac } from "node:crypto";
import { isSensitiveKey, sanitizeText } from "./sanitize.mjs";

// Conteúdo opt-in por contrato (issue #5, crit. 2–3 e 6–7; matriz e formas no
// Landing de .checks/issue-5-privacidade.md). Só os pares contrato/evento/
// ferramenta/campo desta tabela são lidos; todo o resto vira
// `unsupported_content` sem ler o valor. O texto coletado — inclusive de
// SKILL.md (D1) — é só dado: nada aqui o executa, interpreta ou usa como caminho.

const CLAUDE = "claude-code-hooks@docs-2026-10-16";
const CODEX_HOOKS = "codex-hooks@rust-v0.162.1";
const CODEX_EXEC = "codex-exec-jsonl@rust-v0.162.1";
const CLAUDE_TOOL_EVENTS = ["PreToolUse", "PostToolUse", "PostToolUseFailure"];
const ITEM_EVENTS = ["item.started", "item.updated", "item.completed"];

const row = (contract, events, tool, field, role, kind, when = null) => Object.freeze({ contract, events: Object.freeze(events), tool, field, role, kind, when });

export const CONTENT_TABLE = Object.freeze([
  row(CLAUDE, CLAUDE_TOOL_EVENTS, "Bash", "tool_input.command", "args", "text"),
  row(CLAUDE, ["PreToolUse"], "Bash", "tool_input.description", "args", "text"),
  row(CLAUDE, ["PostToolUse"], "Bash", "tool_response.stdout", "result", "text"),
  row(CLAUDE, ["PostToolUse"], "Bash", "tool_response.stderr", "result", "text"),
  row(CLAUDE, CLAUDE_TOOL_EVENTS, "Read", "tool_input.file_path", "args", "path"),
  row(CLAUDE, CLAUDE_TOOL_EVENTS, "Grep", "tool_input.pattern", "args", "text"),
  row(CLAUDE, CLAUDE_TOOL_EVENTS, "Grep", "tool_input.path", "args", "path"),
  row(CODEX_HOOKS, ["PreToolUse", "PostToolUse"], "Bash", "tool_input.command", "args", "text"),
  row(CODEX_HOOKS, ["PostToolUse"], "Bash", "tool_response.output", "result", "text"),
  row(CODEX_HOOKS, ["PreToolUse", "PostToolUse"], "apply_patch", "tool_input.patch", "args", "text"),
  row(CODEX_EXEC, ITEM_EVENTS, "command_execution", "item.command", "args", "text"),
  row(CODEX_EXEC, ITEM_EVENTS, "command_execution", "item.aggregated_output", "result", "text"),
  row(CODEX_EXEC, ITEM_EVENTS, "mcp_tool_call", "item.arguments", "args", "structured"),
  row(CODEX_EXEC, ITEM_EVENTS, "mcp_tool_call", "item.result.content[].text", "result", "text_list", Object.freeze({ type: "text" })),
  row(CODEX_EXEC, ITEM_EVENTS, "file_change", "item.changes[].path", "args", "path_list"),
]);

export const CONTENT_LIMITS = Object.freeze({ maxBytes: 8192, maxDepth: 8, maxMembers: 128 });

const OBJECT_KEY = /^[A-Za-z0-9_.-]{1,64}$/;

export function pseudonym(key, domain, value) {
  return "h1:" + createHmac("sha256", key).update(`${domain}\0${value}`, "utf8").digest("base64url");
}

// Formato fora do contrato: o conteúdo inteiro é descartado (falha fechada).
class Unsupported extends Error {}
// Profundidade ou membros acima do limite: conteúdo inteiro `unsanitizable`.
class OverLimit extends Error {}

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const own = (object, key) => (Object.hasOwn(object, key) ? object[key] : undefined);
const absent = (value) => value === undefined || value === null;

function toolOf(contract, payload) {
  if (contract === CODEX_EXEC) return isPlainObject(payload.item) ? own(payload.item, "type") : undefined;
  return own(payload, "tool_name");
}

// Estado de um evento: entradas `privacy` e orçamento de membros.
function createTally() {
  const privacy = [];
  let members = 0;
  return {
    privacy,
    note(target, code) {
      const entry = `${target}:${code}`;
      if (!privacy.includes(entry)) privacy.push(entry);
    },
    visit() {
      members += 1;
      if (members > CONTENT_LIMITS.maxMembers) throw new OverLimit();
    },
  };
}

function cleanText(value, target, tally) {
  const sanitized = sanitizeText(value);
  if (!sanitized.ok) {
    tally.note(target, "unsanitizable");
    return null;
  }
  if (sanitized.removed) tally.note(target, "sensitive_removed");
  return sanitized.text;
}

// Projeção tipada de `structured`: chave sensível descarta a subárvore,
// chave fora do padrão omite o membro, folha string passa pelo sanitizador.
const OMIT = Symbol("omit");
function project(value, depth, target, tally) {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : OMIT;
  if (typeof value === "string") return cleanText(value, target, tally) ?? OMIT;
  const isArray = Array.isArray(value);
  if (!isArray && !isPlainObject(value)) {
    tally.note(target, "unsanitizable");
    return OMIT;
  }
  if (depth + 1 > CONTENT_LIMITS.maxDepth) throw new OverLimit();
  if (isArray) {
    const out = [];
    for (const element of value) {
      tally.visit();
      const projected = project(element, depth + 1, target, tally);
      if (projected !== OMIT) out.push(projected);
    }
    return out;
  }
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    tally.visit();
    if (isSensitiveKey(key)) {
      tally.note(target, "sensitive_removed");
      continue;
    }
    if (!OBJECT_KEY.test(key)) {
      tally.note(target, "unsanitizable");
      continue;
    }
    const projected = project(child, depth + 1, target, tally);
    if (projected !== OMIT) out[key] = projected;
  }
  return out;
}

// Valor nativo do campo da linha: `undefined` = ausente; contêiner ou valor
// de tipo diferente do contrato lança Unsupported.
function container(payload, name) {
  const value = own(payload, name);
  if (absent(value)) return undefined;
  if (!isPlainObject(value)) throw new Unsupported();
  return value;
}

function leaf(object, key, type) {
  if (object === undefined) return undefined;
  const value = own(object, key);
  if (absent(value)) return undefined;
  if (type === "string" && typeof value !== "string") throw new Unsupported();
  return value;
}

function list(object, key) {
  if (object === undefined) return undefined;
  const value = own(object, key);
  if (absent(value)) return undefined;
  if (!Array.isArray(value)) throw new Unsupported();
  return value;
}

function readField(rowSpec, payload, key, tally) {
  const { field, kind } = rowSpec;
  const base = { field, role: rowSpec.role, kind };
  if (field === "item.arguments") {
    const value = own(container(payload, "item") ?? {}, "arguments");
    if (absent(value)) return null;
    if (!isPlainObject(value) && !Array.isArray(value)) throw new Unsupported();
    return { ...base, value: project(value, 0, field, tally) };
  }
  if (field === "item.result.content[].text") {
    const result = container(container(payload, "item") ?? {}, "result");
    const entries = list(result, "content");
    if (entries === undefined) return null;
    const values = [];
    for (const entry of entries) {
      tally.visit();
      if (!isPlainObject(entry)) throw new Unsupported();
      if (own(entry, "type") !== rowSpec.when.type) {
        tally.note(field, "unsupported_content");
        continue;
      }
      const text = cleanText(leaf(entry, "text", "string") ?? "", field, tally);
      if (text !== null) values.push(text);
    }
    return { ...base, value: values, truncated: false };
  }
  if (field === "item.changes[].path") {
    const changes = list(container(payload, "item"), "changes");
    if (changes === undefined) return null;
    const refs = [];
    for (const change of changes) {
      tally.visit();
      if (!isPlainObject(change)) throw new Unsupported();
      const value = leaf(change, "path", "string");
      if (value !== undefined && value !== "") refs.push(pseudonym(key, "path", value));
    }
    return { ...base, refs };
  }
  const [parent, name] = field.split(".");
  const value = leaf(container(payload, parent), name, "string");
  if (value === undefined) return null;
  if (kind === "path") return value === "" ? null : { ...base, ref: pseudonym(key, "path", value) };
  const text = cleanText(value, field, tally);
  return text === null ? null : { ...base, value: text, truncated: false };
}

const sizeOf = (content) => Buffer.byteLength(JSON.stringify(content), "utf8");

// Maior prefixo estrito de code points que mantém o conteúdo no orçamento.
function longestPrefix(codePoints, fits) {
  let low = 1;
  let high = codePoints.length - 1;
  if (high < 1 || !fits(codePoints.slice(0, 1).join(""))) return null;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (fits(codePoints.slice(0, mid).join(""))) low = mid;
    else high = mid - 1;
  }
  return codePoints.slice(0, low).join("");
}

// Orçamento medido depois da sanitização, na ordem da tabela: o campo entra
// inteiro se cabe; texto é cortado em fronteira de code point; ref, lista de
// refs e estrutura nunca são cortados — saem com `content_truncated`.
function fitBudget(tool, fields, tally) {
  const kept = [];
  const content = () => ({ contentVersion: 1, tool, fields: kept });
  const fitsWith = (candidate) => {
    kept.push(candidate);
    const ok = sizeOf(content()) <= CONTENT_LIMITS.maxBytes;
    kept.pop();
    return ok;
  };
  for (const field of fields) {
    if (fitsWith(field)) {
      kept.push(field);
      continue;
    }
    let cut = null;
    if (field.kind === "text") {
      const prefix = longestPrefix([...field.value], (value) => fitsWith({ ...field, value, truncated: true }));
      if (prefix !== null) cut = { ...field, value: prefix, truncated: true };
    } else if (field.kind === "text_list") {
      const items = [];
      for (const item of field.value) {
        if (fitsWith({ ...field, value: [...items, item], truncated: true })) {
          items.push(item);
          continue;
        }
        const prefix = longestPrefix([...item], (value) => fitsWith({ ...field, value: [...items, value], truncated: true }));
        if (prefix !== null) items.push(prefix);
        break;
      }
      if (items.length > 0) cut = { ...field, value: items, truncated: true };
    }
    if (cut !== null) kept.push(cut);
    tally.note(field.field, "content_truncated");
  }
  return content();
}

// `payload` é a entrada nativa inteira; só os campos das linhas que casam com
// contrato, evento e ferramenta são lidos. Exceção de leitura (getter, Proxy)
// sobe para applyPolicy, que descarta o conteúdo com `privacy_failure`.
export function extractContent({ contract, nativeEvent, payload, key }) {
  const tally = createTally();
  const unsupported = () => ({ content: null, privacy: ["content:unsupported_content"] });
  if (!isPlainObject(payload)) return unsupported();
  const tool = toolOf(contract, payload);
  const rows = CONTENT_TABLE.filter((r) => r.contract === contract && r.tool === tool && r.events.includes(nativeEvent));
  if (rows.length === 0) return unsupported();
  const fields = [];
  try {
    for (const rowSpec of rows) {
      const field = readField(rowSpec, payload, key, tally);
      if (field !== null) fields.push(field);
    }
  } catch (error) {
    if (error instanceof Unsupported) return unsupported();
    if (error instanceof OverLimit) return { content: null, privacy: ["content:unsanitizable"] };
    throw error;
  }
  return { content: fitBudget(rows[0].tool, fields, tally), privacy: tally.privacy };
}
