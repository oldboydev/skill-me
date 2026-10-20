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

test("T7-C2 fence de quatro crases não fecha com três nem com abertura interna", () => {
  const source = "# Fluxo\n````md\n```\n- Run `npm run bad`.\n```sh\n- Run `npm run still-bad`.\n````\n- Run `npm test`.\n";
  assert.deepEqual(parseInstructions(source).map((item) => [item.line, item.commands]), [[8, ["npm test"]]]);
});

test("T7-C2 continuação indentada pertence ao mesmo item e preserva todos os comandos", () => {
  const source = "- Run `npm test` and\n  `npm run build`.\n- Verify `npm run lint`.\n";
  const instructions = parseInstructions(source);
  assert.deepEqual(instructions.map((item) => [item.line, item.kind, item.commands]), [
    [1, "action", ["npm test", "npm run build"]],
    [3, "validation", ["npm run lint"]],
  ]);
  assert.match(instructions[0].text, /npm test.*npm run build/);
});

test("T7-C2 marcador de checklist não altera o tipo nem o texto da instrução", () => {
  const instructions = parseInstructions("- [ ] Run `npm test`.\n- [x] Verify `npm run lint`.\n");
  assert.deepEqual(instructions.map((item) => [item.kind, item.text, item.commands]), [
    ["action", "Run `npm test`.", ["npm test"]],
    ["validation", "Verify `npm run lint`.", ["npm run lint"]],
  ]);
});

test("T7-C2 bloco cercado aninhado não vira continuação executável da lista", () => {
  const source = "- Run `npm test`.\n    ```sh\n    - Run `npm run deploy`.\n    ```\n";
  const instructions = parseInstructions(source);
  assert.deepEqual(instructions.map((item) => [item.line, item.kind, item.text, item.commands]), [
    [1, "action", "Run `npm test`.", ["npm test"]],
  ]);
});
