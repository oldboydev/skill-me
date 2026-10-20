import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { readSkillSource } from "../../../src/integrations/report/skill-source.mjs";

const roots = [];
after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));
const scratch = () => { const root = mkdtempSync(path.join(tmpdir(), "skill-me-t7-")); roots.push(root); return root; };
const timeline = (names) => ({ operations: names.map((skillName, index) => ({ type: "skill_invocation", skillName, evidence: [index + 1], strength: "native" })) });
const writeSkill = (root, dir, name, bytes) => {
  const parent = path.join(root, dir, name);
  mkdirSync(parent, { recursive: true });
  const file = path.join(parent, "SKILL.md");
  writeFileSync(file, bytes);
  return file;
};

test("T7-C1 skill observada e caminho explícito: SHA-256, linha, modo e arquivo inalterado", async () => {
  const root = scratch();
  const bytes = Buffer.from("# Build\n- Run `npm test`.\n");
  const file = writeSkill(root, ".agents/skills", "build", bytes);
  const before = statSync(file);
  const observed = await readSkillSource({ timeline: timeline(["build"]), cwd: root });
  assert.equal(observed.identification, "observed_name");
  assert.deepEqual(observed.observedSources, [{ events: [1], strength: "native" }]);
  assert.equal(observed.sha256, createHash("sha256").update(bytes).digest("hex"));
  assert.deepEqual(observed.instructions.map((i) => [i.line, i.heading]), [[2, "Build"]]);
  const explicit = await readSkillSource({ timeline: timeline(["other"]), explicitPath: file, cwd: root });
  assert.deepEqual([explicit.identification, explicit.nameMatchesObservation], ["explicit_path", false]);
  assert.deepEqual(readFileSync(file), bytes);
  assert.equal(statSync(file).mtimeMs, before.mtimeMs);
});

test("T7-C1 nome observado Unicode resolve candidato único e ainda recusa travessia", async () => {
  const root = scratch();
  const bytes = Buffer.from("# Revisão\n- Run `npm test`.\n");
  writeSkill(root, ".agents/skills", "revisão", bytes);
  const observed = await readSkillSource({ timeline: timeline(["revisão"]), cwd: root });
  assert.deepEqual([observed.name, observed.observedName, observed.identification], ["revisão", "revisão", "observed_name"]);
  assert.equal(observed.sha256, createHash("sha256").update(bytes).digest("hex"));
  for (const name of ["..", "../revisão", "revisão\\outra"]) {
    await assert.rejects(readSkillSource({ timeline: timeline([name]), cwd: root }), (error) => error.code === "skill_name_invalid");
  }
});

test("T7-C3 skill inválida: ausência, ambiguidade, arquivo não regular, UTF-8 e teto 1 MiB", async () => {
  const root = scratch();
  const error = async (options, code) => assert.rejects(readSkillSource(options), (e) => e.code === code && e.message === code);
  await error({ timeline: timeline([]), cwd: root }, "skill_not_found");
  await error({ timeline: timeline(["one", "two"]), cwd: root }, "skill_ambiguous");
  writeSkill(root, ".agents/skills", "one", "- Run `npm test`\n");
  writeSkill(root, ".claude/skills", "one", "- Run `npm test`\n");
  await error({ timeline: timeline(["one"]), cwd: root }, "skill_ambiguous");
  const directory = path.join(root, "directory");
  mkdirSync(directory);
  await error({ timeline: timeline([]), explicitPath: directory, cwd: root }, "skill_not_regular");
  const invalid = path.join(root, "invalid.md");
  writeFileSync(invalid, Buffer.from([0xff]));
  await error({ timeline: timeline([]), explicitPath: invalid, cwd: root }, "skill_invalid_utf8");
  const large = path.join(root, "large.md");
  writeFileSync(large, Buffer.alloc(1024 * 1024 + 1, 65));
  await error({ timeline: timeline([]), explicitPath: large, cwd: root }, "skill_too_large");
});
