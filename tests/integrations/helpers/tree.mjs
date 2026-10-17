import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Mapa caminho relativo → {tipo, sha256, bytes, mtimeMs} de toda a árvore.
// Links não são seguidos: um link é registrado como tal.
export function snapshotTree(root, { withMtime = true } = {}) {
  const out = {};
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const rel = path.relative(root, full).split(path.sep).join("/");
      const stat = lstatSync(full);
      if (stat.isSymbolicLink()) out[rel] = { type: "link" };
      else if (stat.isDirectory()) {
        out[rel] = { type: "dir" };
        walk(full);
      } else {
        const content = readFileSync(full);
        out[rel] = {
          type: "file",
          sha256: createHash("sha256").update(content).digest("hex"),
          bytes: content.length,
          ...(withMtime ? { mtimeMs: stat.mtimeMs } : {}),
        };
      }
    }
  };
  walk(root);
  return out;
}

export function sha256File(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

// Skill de terceiro usada nas provas de hash (crit. 11): nomes com espaço e
// Unicode, subpastas e um script; conteúdo sintético.
export function writeThirdPartySkill(skillsDir, name = "third-party-skill") {
  const root = path.join(skillsDir, name);
  mkdirSync(path.join(root, "scripts", "ação útil"), { recursive: true });
  mkdirSync(path.join(root, "references"), { recursive: true });
  writeFileSync(
    path.join(root, "SKILL.md"),
    `---\nname: ${name}\ndescription: Skill sintética de terceiro usada nas provas da issue 4.\n---\n\n# ${name}\n\nPasso único: executar scripts/run.sh.\n`,
  );
  writeFileSync(path.join(root, "scripts", "run.sh"), "#!/bin/sh\necho skill de terceiro\n");
  writeFileSync(path.join(root, "scripts", "ação útil", "dados ção.txt"), "conteúdo de terceiro\n");
  writeFileSync(path.join(root, "references", "guia com espaço.md"), "# Guia\n");
  return root;
}
