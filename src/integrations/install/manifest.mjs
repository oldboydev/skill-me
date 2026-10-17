import path from "node:path";
import { InvalidConfigError } from "./json-hooks.mjs";

export const STATE_DIR = ".skill-me";
const SHA256 = /^[0-9a-f]{64}$/;

export function manifestRelPath(agent) {
  return `${STATE_DIR}/${agent}-install.json`;
}

export function manifestPath(root, agent) {
  return path.join(root, STATE_DIR, `${agent}-install.json`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validJsonEntries(body) {
  return (
    typeof body.file === "string" &&
    Array.isArray(body.entries) &&
    body.entries.every(
      (entry) => isPlainObject(entry) && typeof entry.event === "string" && SHA256.test(entry.sha256) && typeof entry.adopted === "boolean",
    ) &&
    isPlainObject(body.created) &&
    typeof body.created.file === "boolean" &&
    typeof body.created.hooksObject === "boolean" &&
    Array.isArray(body.created.eventKeys) &&
    body.created.eventKeys.every((key) => typeof key === "string")
  );
}

function validArtifacts(body) {
  return (
    Array.isArray(body.artifacts) &&
    body.artifacts.every((artifact) => isPlainObject(artifact) && typeof artifact.path === "string" && SHA256.test(artifact.sha256)) &&
    isPlainObject(body.created) &&
    typeof body.created.pluginsDir === "boolean"
  );
}

// O registro guarda só identidade/hash do que é próprio — nunca cópia de
// conteúdo alheio. Registro ilegível não é recriado por default: é estado
// inválido no alvo (código 3), como uma configuração inválida.
export function parseManifest(agent, text) {
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new InvalidConfigError("manifest_invalid", manifestRelPath(agent));
  }
  const valid =
    isPlainObject(body) &&
    body.schemaVersion === 1 &&
    body.tool === "skill-me" &&
    body.agent === agent &&
    (agent === "hermes" ? validArtifacts(body) : validJsonEntries(body));
  if (!valid) throw new InvalidConfigError("manifest_invalid", manifestRelPath(agent));
  return body;
}

export function serializeManifest(agent, body) {
  return JSON.stringify({ schemaVersion: 1, tool: "skill-me", agent, ...body }, null, 2) + "\n";
}
