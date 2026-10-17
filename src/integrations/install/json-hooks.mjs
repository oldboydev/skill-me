import { createHash } from "node:crypto";
import { CliUsageError } from "../../doctor/cli-args.mjs";
import { ONE_MIB_BYTES, projectConfig } from "../../doctor/config-projection.mjs";

export const CLAUDE_EVENTS = Object.freeze([
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "UserPromptExpansion",
  "SessionStart",
  "SessionEnd",
  "SubagentStart",
  "SubagentStop",
]);
export const CODEX_EVENTS = Object.freeze(["PreToolUse", "PostToolUse", "SessionStart", "SessionEnd", "SubagentStart", "SubagentStop"]);

export const CONFIG_FILE = Object.freeze({ claude: "settings.json", codex: "hooks.json" });
const EVENTS = { claude: CLAUDE_EVENTS, codex: CODEX_EVENTS };
const HOOK_TIMEOUT_SECONDS = 10;

export class InvalidConfigError extends Error {
  constructor(code, file) {
    super(code);
    this.error = { code, file };
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

// Linha para o shell que o Codex 0.162.1 usa (command_runner.rs:384-437):
// Windows `cmd.exe /C "<linha>"`, POSIX `$SHELL -lc <linha>`. No cmd.exe,
// `%` e `!` expandem mesmo entre aspas e `"` fecharia a citação: caminhos com
// esses caracteres são recusados em vez de arriscar uma linha reinterpretada.
export function codexCommandLine({ nodePath, cliPath, platform }) {
  if (platform === "win32") {
    for (const value of [nodePath, cliPath]) {
      if (/["%!\r\n]/.test(value)) {
        throw new CliUsageError("caminho do node ou do CLI não pode ser citado com segurança para o cmd.exe", {
          code: "unsafe_command_path",
        });
      }
    }
    return `"${nodePath}" "${cliPath}" hook --agent codex`;
  }
  const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  return `${quote(nodePath)} ${quote(cliPath)} hook --agent codex`;
}

// Grupo próprio canônico: sem `matcher` (todos os eventos/ferramentas). Claude
// em forma exec (`command` + `args`, sem shell — code.claude.com/docs/en/hooks).
// `SessionEnd` mantém o timeout default do agente (Claude 1,5 s; Codex 1 s).
export function ownedGroup(agent, event, { nodePath, cliPath, platform }) {
  const handler =
    agent === "claude"
      ? { type: "command", command: nodePath, args: [cliPath, "hook", "--agent", "claude"] }
      : { type: "command", command: codexCommandLine({ nodePath, cliPath, platform }) };
  if (event !== "SessionEnd") handler.timeout = HOOK_TIMEOUT_SECONDS;
  return { hooks: [handler] };
}

function stableStringify(value) {
  if (JSON.isRawJSON?.(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function groupHash(group) {
  return createHash("sha256").update(stableStringify(group)).digest("hex");
}

// Reconhece um grupo do skill-me cujo hash não confere mais (o usuário o
// editou), para reportar conflito em vez de tratá-lo como ausente.
function looksOwned(agent, group, cliPath) {
  if (!isPlainObject(group) || !Array.isArray(group.hooks)) return false;
  return group.hooks.some((handler) =>
    agent === "claude"
      ? isPlainObject(handler) && Array.isArray(handler.args) && handler.args.includes(cliPath) && handler.args.includes("hook")
      : isPlainObject(handler) && typeof handler.command === "string" && handler.command.includes(cliPath) && handler.command.includes(" hook --agent codex"),
  );
}

// Números cujo texto não é a forma canônica do double (inteiro > 2^53, `1.50`,
// `1e3`, `-0`) voltam como `JSON.rawJSON`: a reescrita devolve o token exato.
function parseLossless(text) {
  return JSON.parse(text, (key, value, context) =>
    typeof value === "number" && context && String(value) !== context.source ? JSON.rawJSON(context.source) : value,
  );
}

// Cópia profunda que mantém os valores `JSON.rawJSON` (imutáveis) por
// referência; `structuredClone` os transformaria em objetos `{rawJSON: …}`.
function cloneDoc(value) {
  if (JSON.isRawJSON(value)) return value;
  if (Array.isArray(value)) return value.map(cloneDoc);
  if (value !== null && typeof value === "object") {
    const copy = {};
    for (const key of Object.keys(value)) copy[key] = cloneDoc(value[key]);
    return copy;
  }
  return value;
}

function formatOf(text) {
  const indent = /\n([ \t]+)"/.exec(text)?.[1] ?? "  ";
  return { indent, newline: text.includes("\r\n") ? "\r\n" : "\n", trailing: /\r?\n$/.test(text) };
}

export function serializeConfig(doc, format) {
  const body = JSON.stringify(doc, null, format.indent).replaceAll("\n", format.newline);
  return format.trailing ? body + format.newline : body;
}

// Texto que será gravado precisa continuar legível pelo próprio instalador
// (mesmo teto, em bytes UTF-8, de `readBoundedText`/`projectConfig`); acima
// dele, a operação é recusada antes de qualquer escrita, inclusive na prévia.
function administrableText(text, file) {
  if (Buffer.byteLength(text, "utf8") > ONE_MIB_BYTES) throw new InvalidConfigError("output_too_large", file);
  return text;
}

// Leitura validada: o projetor do doctor decide a forma nativa (JSON válido,
// envelope do hooks.json do Codex, forma de `hooks`); por cima, a raiz precisa
// ser objeto e `hooks`, se presente, objeto — nunca substituídos por default.
export function parseConfig(agent, text, platform) {
  const file = CONFIG_FILE[agent];
  const projected = projectConfig({ rawText: text, format: "json", agentId: agent, platform });
  if (projected.configuration === "invalid") throw new InvalidConfigError(projected.reasonCode, file);
  if (projected.reasonCode === "input_too_large") throw new InvalidConfigError("input_too_large", file);
  let doc;
  try {
    doc = parseLossless(text);
  } catch {
    throw new InvalidConfigError("config_malformed", file);
  }
  if (!isPlainObject(doc)) throw new InvalidConfigError("root_not_object", file);
  if (Object.prototype.hasOwnProperty.call(doc, "hooks") && !isPlainObject(doc.hooks)) {
    throw new InvalidConfigError("hooks_structure_invalid", file);
  }
  for (const event of EVENTS[agent]) {
    if (doc.hooks && Object.prototype.hasOwnProperty.call(doc.hooks, event) && !Array.isArray(doc.hooks[event])) {
      throw new InvalidConfigError("hooks_structure_invalid", file);
    }
  }
  return { doc, format: formatOf(text) };
}

const DEFAULT_FORMAT = Object.freeze({ indent: "  ", newline: "\n", trailing: true });

// Plano puro de instalação sobre o documento lido (ou `null`, arquivo ausente).
// Grupo idêntico ao canônico já presente: registrado (`adopt_group`) se o
// registro não o conhecia — reconcilia uma falha anterior entre configuração
// e registro. Grupo registrado com outro hash (ex.: node atualizado) conta como
// instalado: nunca há dois grupos próprios no mesmo evento. Grupo com a
// assinatura própria que não é o registrado nem o canônico foi editado pelo
// usuário: conflito, sem acrescentar outro grupo ao lado nem adotá-lo pela
// assinatura; a entrada registrada continua no registro.
export function planJsonInstall({ agent, parsed, manifest, ctx }) {
  const file = CONFIG_FILE[agent];
  const doc = parsed ? cloneDoc(parsed.doc) : {};
  const created = manifest?.created ?? { file: parsed === null, hooksObject: false, eventKeys: [] };
  const changes = [];
  const conflicts = [];
  const entries = [];
  if (parsed === null) changes.push({ file, action: "create_file" });
  if (doc.hooks === undefined) {
    doc.hooks = {};
    if (!manifest) created.hooksObject = true;
  }
  for (const event of EVENTS[agent]) {
    const canonical = ownedGroup(agent, event, ctx);
    const hash = groupHash(canonical);
    const recorded = manifest?.entries.find((entry) => entry.event === event);
    const groups = doc.hooks[event] ?? [];
    const hashes = groups.map(groupHash);
    if (recorded && hashes.includes(recorded.sha256)) {
      entries.push(recorded);
    } else if (hashes.includes(hash)) {
      entries.push({ event, sha256: hash, adopted: true });
      changes.push({ file, action: "adopt_group", event });
    } else if (groups.some((group) => looksOwned(agent, group, ctx.cliPath))) {
      conflicts.push({ code: recorded ? "owned_entry_modified" : "owned_entry_unrecorded", file, event });
      if (recorded) entries.push(recorded);
    } else {
      if (doc.hooks[event] === undefined && !manifest) created.eventKeys.push(event);
      doc.hooks[event] = [...groups, canonical];
      entries.push({ event, sha256: hash, adopted: false });
      changes.push({ file, action: "add_group", event });
    }
  }
  const configChanged = changes.some((change) => change.action === "add_group");
  return {
    changes,
    conflicts,
    configChanged,
    newText: configChanged ? administrableText(serializeConfig(doc, parsed?.format ?? DEFAULT_FORMAT), file) : null,
    manifestBody: { file, entries, created },
  };
}

// Plano puro de remoção: só sai o grupo cujo hash confere com o registro. Grupo
// próprio editado fica e vira conflito (permanece no registro). Grupo com a
// assinatura própria que resta sem registro (cópia editada pelo usuário) também
// fica e é reportado: a remoção não declara sucesso com um observer próprio
// ativo. Chave de evento vazia sai só se a instalação a criou ou adotou o
// grupo; o objeto `hooks` e o arquivo, só se criados pela instalação e vazios.
export function planJsonUninstall({ agent, parsed, manifest, ctx }) {
  const file = CONFIG_FILE[agent];
  const changes = [];
  const conflicts = [];
  const remaining = [];
  if (parsed === null) {
    return { changes, conflicts, configChanged: false, deleteFile: false, newText: null, remaining };
  }
  const doc = cloneDoc(parsed.doc);
  for (const entry of manifest.entries) {
    const groups = doc.hooks?.[entry.event];
    const index = Array.isArray(groups) ? groups.findIndex((group) => groupHash(group) === entry.sha256) : -1;
    if (index >= 0) {
      groups.splice(index, 1);
      changes.push({ file, action: "remove_group", event: entry.event });
      if (groups.length === 0 && (manifest.created.eventKeys.includes(entry.event) || entry.adopted)) {
        delete doc.hooks[entry.event];
        changes.push({ file, action: "remove_event_key", event: entry.event });
      }
    } else if (Array.isArray(groups) && groups.some((group) => looksOwned(agent, group, ctx.cliPath))) {
      conflicts.push({ code: "owned_entry_modified", file, event: entry.event });
      remaining.push(entry);
    } else {
      changes.push({ file, action: "already_absent", event: entry.event });
    }
  }
  const reported = new Set(conflicts.map((conflict) => conflict.event));
  for (const event of EVENTS[agent]) {
    if (!reported.has(event) && (doc.hooks?.[event] ?? []).some((group) => looksOwned(agent, group, ctx.cliPath))) {
      conflicts.push({ code: "owned_entry_unrecorded", file, event });
    }
  }
  if (manifest.created.hooksObject && doc.hooks && Object.keys(doc.hooks).length === 0) {
    delete doc.hooks;
    changes.push({ file, action: "remove_hooks_object" });
  }
  const configChanged = changes.some((change) => change.action.startsWith("remove_"));
  const deleteFile = configChanged && manifest.created.file && Object.keys(doc).length === 0;
  if (deleteFile) changes.push({ file, action: "delete_file" });
  return {
    changes,
    conflicts,
    configChanged,
    deleteFile,
    newText: configChanged && !deleteFile ? administrableText(serializeConfig(doc, parsed.format), file) : null,
    remaining,
  };
}

// Grupos com a assinatura do skill-me que nenhum registro conhece: a remoção
// não os toca (não há prova de propriedade) e avisa como conflito.
export function unrecordedOwnedEvents(agent, parsed, ctx) {
  if (!parsed?.doc.hooks) return [];
  return EVENTS[agent].filter((event) =>
    (parsed.doc.hooks[event] ?? []).some((group) => looksOwned(agent, group, ctx.cliPath)),
  );
}
