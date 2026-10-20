import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { parseInstructions } from "../../../src/integrations/report/instructions.mjs";

test("T7-C2 frontmatter e código ignorados; ação, validação, orientação e condição preservam heading e linha sem executar referências", () => {
  const root = mkdtempSync(path.join(tmpdir(), "skill-me-t7-parser-"));
  try {
    const marker = path.join(root, "executed");
    const source = `---\nname: demo\n---\n# Fluxo\n- Run \`npm test\`.\n- Verify \`node --test\`.\n- Prefer checks claros.\n- If \`npm test\` fails, run \`npm run fix\`.\n\`\`\`sh\n- Run \`node -e "require('fs').writeFileSync('${marker}','x')"\`\n\`\`\`\n`;
    const instructions = parseInstructions(source);
    assert.deepEqual(instructions.map((item) => [item.kind, item.line, item.heading]), [
      ["action", 5, "Fluxo"], ["validation", 6, "Fluxo"], ["guidance", 7, "Fluxo"], ["condition", 8, "Fluxo"],
    ]);
    assert.deepEqual(instructions.map((item) => item.commands), [["npm test"], ["node --test"], [], ["npm test", "npm run fix"]]);
    assert.equal(existsSync(marker), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
