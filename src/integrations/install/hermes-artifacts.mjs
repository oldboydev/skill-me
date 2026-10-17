import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export const PLUGIN_NAME = "skill-me-observer";
export const PLUGIN_REL_DIR = `plugins/${PLUGIN_NAME}`;
const SOURCE_DIR = path.resolve(import.meta.dirname, "..", "hermes", "plugin");
export const ARTIFACT_NAMES = Object.freeze(["__init__.py", "kwargs.json", "plugin.yaml"]);

// Bytecode que o próprio Hermes grava ao importar o plugin
// (`__pycache__/__init__.cpython-311.pyc`) é cache derivado do nosso
// `__init__.py`: a remoção o apaga junto. Qualquer outro arquivo na pasta é
// alheio e fica. O nome é condição necessária, não suficiente: contenção e
// arquivo regular num `__pycache__` real são conferidos em `run.mjs`.
const OWN_CACHE = /^__init__\.cpython-\d+(\.opt-\d+)?\.pyc$/;

export function isOwnCache(name) {
  return OWN_CACHE.test(name);
}

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function loadArtifacts() {
  return ARTIFACT_NAMES.map((name) => {
    const content = readFileSync(path.join(SOURCE_DIR, name));
    return { name, rel: `${PLUGIN_REL_DIR}/${name}`, content, sha256: sha256(content) };
  });
}
