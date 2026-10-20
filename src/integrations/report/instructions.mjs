import { sanitizeText } from "../privacy/sanitize.mjs";

const CONDITIONAL = /^(?:se|caso|quando|if|when)\b/i;
const VALIDATION = /^(?:verifique|confira|valide|teste|check|verify|validate|test|assert)\b/i;
const ACTION = /^(?:execute|rode|run|use|leia|read|crie|create|salve|save|edite|edit|instale|install|faça|do|abra|open|chame|call|aplique|apply)\b/i;
const COMMAND = /^(?:npm|npx|node|pnpm|yarn|git|pytest|python|python3|cargo|make|go|dotnet|bash|sh|zsh|fish|pwsh|powershell|cmd|\.\/[\w./-]+)(?:\s|$)/i;
const EXECUTABLE = /^(?:[a-z_][\w.+-]*|\.\/[\w./-]+)$/i;
const EXECUTABLE_WITH_ARGS = /^(?:[a-z_][\w.+-]*|\.\/[\w./-]+)\s+\S/i;
const LIST_ITEM = /^(\s*)(?:[-*+]|\d+[.)])\s+(.+)$/;
const CHECKBOX = /^\[(?: |x|X)\]\s+/;
const HEADING = /^#{1,6}\s+(.+)$/;
const CODE_SPAN = /`([^`\r\n]{1,300})`/g;

function safeText(raw) {
  const result = sanitizeText(raw);
  return result.ok ? result.text.slice(0, 1000) : null;
}

function isCommandSpan(match, line) {
  const value = match[1].trim();
  if (COMMAND.test(value) || EXECUTABLE_WITH_ARGS.test(value)) return true;
  if (!EXECUTABLE.test(value)) return false;
  const before = line.slice(0, match.index);
  const after = line.slice(match.index + match[0].length);
  return /\b(?:run|execute|rode|executar)\s*$/i.test(before)
    || (CONDITIONAL.test(line.trim()) && /\b(?:fails?|succeeds?|passes?|falha|passa)\b/i.test(after));
}

function commandsIn(line) {
  return [...line.matchAll(CODE_SPAN)]
    .filter((match) => isCommandSpan(match, line))
    .map((match) => match[1].trim())
    .reduce((found, value) => {
      const result = sanitizeText(value);
      if (!result.ok || result.removed || result.text.includes("[removido]")) found.redacted = true;
      else found.commands.push(result.text.slice(0, 1000));
      return found;
    }, { commands: [], redacted: false });
}

export function parseInstructions(source) {
  const lines = source.split(/\r\n|\n|\r/);
  const instructions = [];
  let heading = null;
  let fence = null;
  let frontmatter = lines[0]?.trim() === "---";
  let active = null;
  let activeRaw = "";
  let rootListIndent = null;
  for (const [index, line] of lines.entries()) {
    if (frontmatter) {
      if (index > 0 && line.trim() === "---") frontmatter = false;
      continue;
    }
    const fenceMatch = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
    if (fenceMatch) {
      active = null;
      const marker = fenceMatch[1];
      if (fence === null) {
        if (rootListIndent === null || line.indexOf(marker) <= rootListIndent) rootListIndent = null;
        fence = { character: marker[0], length: marker.length };
      } else if (fence.character === marker[0] && marker.length >= fence.length && fenceMatch[2].trim() === "") fence = null;
      continue;
    }
    if (fence !== null) continue;
    const title = HEADING.exec(line);
    if (title) {
      active = null;
      rootListIndent = null;
      heading = safeText(title[1].trim());
      continue;
    }
    const item = LIST_ITEM.exec(line);
    if (item && (item[1].length <= 3 || rootListIndent !== null)) {
      if (item[1].length <= 3) rootListIndent = item[1].length;
      activeRaw = item[2].trim().replace(CHECKBOX, "");
      const kind = CONDITIONAL.test(activeRaw) ? "condition" : VALIDATION.test(activeRaw) ? "validation" : ACTION.test(activeRaw) ? "action" : "guidance";
      const extracted = commandsIn(activeRaw);
      active = { id: `i-${instructions.length + 1}`, line: index + 1, heading, kind, text: safeText(activeRaw), commands: extracted.commands, commandRedacted: extracted.redacted };
      instructions.push(active);
    } else if (active !== null && /^\s+\S/.test(line)) {
      const continuation = line.trim();
      activeRaw += ` ${continuation}`;
      active.text = safeText(activeRaw);
      const extracted = commandsIn(continuation);
      active.commands.push(...extracted.commands);
      active.commandRedacted ||= extracted.redacted;
    } else {
      active = null;
      // Uma linha vazia pode separar o item pai de um subitem Markdown.
      if (line.trim() !== "") rootListIndent = null;
    }
  }
  return instructions;
}
