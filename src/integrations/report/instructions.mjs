import { sanitizeText } from "../privacy/sanitize.mjs";

const CONDITIONAL = /^(?:se|caso|quando|if|when)\b/i;
const VALIDATION = /^(?:verifique|confira|valide|teste|check|verify|validate|test|assert)\b/i;
const ACTION = /^(?:execute|rode|run|use|leia|read|crie|create|salve|save|edite|edit|instale|install|faça|do|abra|open|chame|call|aplique|apply)\b/i;
const COMMAND = /^(?:npm|npx|node|pnpm|yarn|git|pytest|python|python3|cargo|make|go|dotnet|bash|sh|zsh|fish|pwsh|powershell|cmd|\.\/[\w./-]+)(?:\s|$)/i;
const LIST_ITEM = /^\s{0,3}(?:[-*+]|\d+[.)])\s+(.+)$/;
const HEADING = /^#{1,6}\s+(.+)$/;
const CODE_SPAN = /`([^`\r\n]{1,300})`/g;

function safeText(raw) {
  const result = sanitizeText(raw);
  return result.ok ? result.text.slice(0, 1000) : null;
}

function commandsIn(line) {
  return [...line.matchAll(CODE_SPAN)]
    .map((match) => match[1].trim())
    .filter((value) => COMMAND.test(value))
    .map(safeText)
    .filter((value) => value !== null && !value.includes("[removido]"));
}

export function parseInstructions(source) {
  const lines = source.split(/\r\n|\n|\r/);
  const instructions = [];
  let heading = null;
  let fence = null;
  let frontmatter = lines[0]?.trim() === "---";
  for (const [index, line] of lines.entries()) {
    if (frontmatter) {
      if (index > 0 && line.trim() === "---") frontmatter = false;
      continue;
    }
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (fence === null) fence = { character: marker[0], length: marker.length };
      else if (fence.character === marker[0] && marker.length >= fence.length && fenceMatch[2].trim() === "") fence = null;
      continue;
    }
    if (fence !== null) continue;
    const title = HEADING.exec(line);
    if (title) {
      heading = safeText(title[1].trim());
      continue;
    }
    const item = LIST_ITEM.exec(line);
    if (!item) continue;
    const raw = item[1].trim();
    const text = safeText(raw);
    const kind = CONDITIONAL.test(raw) ? "condition" : VALIDATION.test(raw) ? "validation" : ACTION.test(raw) ? "action" : "guidance";
    instructions.push({ id: `i-${instructions.length + 1}`, line: index + 1, heading, kind, text, commands: commandsIn(raw) });
  }
  return instructions;
}
