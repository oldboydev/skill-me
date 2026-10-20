import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, lstat } from "node:fs/promises";
import path from "node:path";
import { sanitizeText } from "../privacy/sanitize.mjs";
import { parseInstructions } from "./instructions.mjs";

const MAX_SKILL_BYTES = 1024 * 1024;
const INVALID_NAME = /[\\/\u0000-\u001f\u007f<>:"|?*]/u;
const WINDOWS_DEVICE = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;
const LOCAL_DIRS = [".agents/skills", ".claude/skills", ".codex/skills", "skills"];

function validDirectoryName(name) {
  return typeof name === "string" && name.length > 0 && name.length <= 255
    && name !== "." && name !== ".." && !/[. ]$/.test(name)
    && !INVALID_NAME.test(name) && !WINDOWS_DEVICE.test(name);
}

export class SkillSourceError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function observedNames(timeline) {
  return [...new Set(timeline.operations.filter((op) => ["skill_invocation", "skill_evidence"].includes(op.type)).map((op) => op.skillName).filter(Boolean))];
}

async function candidateFile(cwd, name) {
  if (!validDirectoryName(name)) throw new SkillSourceError("skill_name_invalid");
  const candidates = [];
  for (const dir of LOCAL_DIRS) {
    const file = path.join(cwd, dir, name, "SKILL.md");
    try {
      const info = await lstat(file);
      if (info.isFile()) candidates.push(file);
      else throw new SkillSourceError("skill_not_regular");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  if (candidates.length === 0) throw new SkillSourceError("skill_not_found");
  if (candidates.length > 1) throw new SkillSourceError("skill_ambiguous");
  return candidates[0];
}

async function readRegularFile(file) {
  let handle;
  try {
    const before = await lstat(file);
    if (!before.isFile()) throw new SkillSourceError("skill_not_regular");
    handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const info = await handle.stat();
    if (!info.isFile()) throw new SkillSourceError("skill_not_regular");
    if (info.size > MAX_SKILL_BYTES) throw new SkillSourceError("skill_too_large");
    const buffer = Buffer.alloc(MAX_SKILL_BYTES + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const chunk = await handle.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (chunk.bytesRead === 0) break;
      bytesRead += chunk.bytesRead;
    }
    if (bytesRead > MAX_SKILL_BYTES) throw new SkillSourceError("skill_too_large");
    const after = await lstat(file);
    if (!after.isFile() || after.dev !== before.dev || after.ino !== before.ino || after.size !== bytesRead || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) throw new SkillSourceError("skill_changed");
    const bytes = buffer.subarray(0, bytesRead);
    return { bytes, source: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch (error) {
    if (error instanceof SkillSourceError) throw error;
    if (error instanceof TypeError) throw new SkillSourceError("skill_invalid_utf8");
    if (error?.code === "ENOENT") throw new SkillSourceError("skill_not_found");
    if (error?.code === "ELOOP") throw new SkillSourceError("skill_not_regular");
    throw new SkillSourceError("skill_io_failure");
  } finally {
    await handle?.close();
  }
}

export async function readSkillSource({ timeline, explicitPath = null, cwd = process.cwd() }) {
  const names = observedNames(timeline);
  if (explicitPath === null && names.length !== 1) throw new SkillSourceError(names.length ? "skill_ambiguous" : "skill_not_found");
  const file = explicitPath === null ? await candidateFile(cwd, names[0]) : path.resolve(cwd, explicitPath);
  const { bytes, source } = await readRegularFile(file);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const observedName = names.length === 1 ? names[0] : null;
  const observedSources = observedName === null ? [] : timeline.operations
    .filter((op) => ["skill_invocation", "skill_evidence"].includes(op.type) && op.skillName === observedName)
    .map((op) => ({ events: op.evidence ?? [], strength: op.strength }));
  const rawName = path.basename(path.dirname(file));
  const cleanedName = sanitizeText(rawName);
  return {
    name: cleanedName.ok ? cleanedName.text : "[omitido]",
    observedName,
    observedSources,
    identification: explicitPath === null ? "observed_name" : "explicit_path",
    nameMatchesObservation: observedName === null ? null : observedName === rawName,
    sha256,
    instructions: parseInstructions(source),
  };
}
