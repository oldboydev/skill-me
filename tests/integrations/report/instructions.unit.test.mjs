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

test("T7-C8 bloco sensível em continuação é omitido antes de normalizar linhas", () => {
  const source = "- Run `npm test`.\n  password: |\n    SENHA_INTERNA_EXEMPLO\n";
  const instruction = parseInstructions(source)[0];
  assert.equal(instruction.text, null);
  assert.equal(instruction.commandRedacted, true);
  assert.ok(!JSON.stringify(instruction).includes("SENHA_INTERNA_EXEMPLO"));
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

test("T7-C2 item aninhado recebe tipo e linha próprios", () => {
  const source = "- Run `npm test`.\n    - If `npm test` fails, run `npm run fix`.\n";
  const instructions = parseInstructions(source);
  assert.deepEqual(instructions.map((item) => [item.line, item.kind, item.commands]), [
    [1, "action", ["npm test"]],
    [2, "condition", ["npm test", "npm run fix"]],
  ]);
});

test("T7-C2 linha em branco preserva o contexto de sublista", () => {
  const source = "- Run `npm test`.\n\n    - If `npm test` fails, run `npm run fix`.\n";
  assert.deepEqual(parseInstructions(source).map((item) => [item.line, item.kind, item.commands]), [
    [1, "action", ["npm test"]],
    [3, "condition", ["npm test", "npm run fix"]],
  ]);
  assert.deepEqual(parseInstructions("    - Run `npm run fix`.\n"), []);
  const afterExample = "- Run `npm test`.\n    ```sh\n    echo exemplo\n    ```\n    - If `npm test` fails, run `npm run fix`.\n";
  assert.deepEqual(parseInstructions(afterExample).map((item) => [item.line, item.kind]), [[1, "action"], [5, "condition"]]);
});

test("T7-C2 retorno de sublista profunda preserva item irmão e sua linha", () => {
  const source = "- Run `npm test`.\n    - Verify `npm run lint`.\n      - Run `npm run build`.\n    - Run `npm run deploy`.\n";
  assert.deepEqual(parseInstructions(source).map((item) => [item.line, item.kind, item.commands]), [
    [1, "action", ["npm test"]],
    [2, "validation", ["npm run lint"]],
    [3, "action", ["npm run build"]],
    [4, "action", ["npm run deploy"]],
  ]);
});

test("T7-C2 comando literal com executável fora da lista conhecida é extraído", () => {
  const source = "- Run `curl --version`.\n- Run `docker build .`.\n- Run `curl`.\n- Read `SKILL.md`.\n- If `curl` fails, run `docker build .`.\n";
  assert.deepEqual(parseInstructions(source).map((item) => item.commands), [
    ["curl --version"], ["docker build ."], ["curl"], [], ["curl", "docker build ."],
  ]);
});

test("T7-C2 referência entre crases não vira comando adicional", () => {
  const source = "- Run `curl --version` (see `expected output` for reference).\n- Run `npm test` and `docker build .`.\n- If `curl` fails, run `npm run fix`.\n- Run `curl --version` (see `expected output` and `expected errors`).\n- Verify `expected output`.\n- If `expected output` fails, run `npm run fix`.\n";
  assert.deepEqual(parseInstructions(source).map((item) => item.commands), [
    ["curl --version"], ["npm test", "docker build ."], ["curl", "npm run fix"], ["curl --version"], [], ["npm run fix"],
  ]);
});

test("T7-C2 referência parentética entre comandos não oculta o segundo", () => {
  const source = "- Run `curl --version` (see `expected output`) and\n  `docker build .`.\n";
  assert.deepEqual(parseInstructions(source).map((item) => item.commands), [
    ["curl --version", "docker build ."],
  ]);
});

test("T7-C2 comando coordenado sem opção conhecida preserva ambos os literais", () => {
  const source = "- Run `npm test` and `docker ps`.\n- Run `npm test` or `docker ps`.\n";
  assert.deepEqual(parseInstructions(source).map((item) => item.commands), [
    ["npm test", "docker ps"], ["npm test", "docker ps"],
  ]);
});

test("T7-C2 enumeração por vírgulas preserva todos os comandos", () => {
  const source = "- Run `npm test`, `npm run lint` and `npm run build`.\n";
  assert.deepEqual(parseInstructions(source)[0].commands, ["npm test", "npm run lint", "npm run build"]);
});

test("T7-C2 texto longo preserva a cláusula que liga comandos alternativos", () => {
  const source = `- Run \`npm test\` (${"a".repeat(1000)}) or \`npm run build\`.\n`;
  const instruction = parseInstructions(source)[0];
  assert.deepEqual(instruction.commands, ["npm test", "npm run build"]);
  assert.match(instruction.text, /or `npm run build`\.$/);
});

test("T7-C2 comando literal longo conserva o valor completo para comparação", () => {
  const command = `node ${"x".repeat(1001)}`;
  assert.deepEqual(parseInstructions(`- Run \`${command}\`.\n`)[0].commands, [command]);
});

test("T7-C2 alternativa entre parênteses conserva o segundo comando", () => {
  assert.deepEqual(parseInstructions("- Run `npm test` (or `npm run build`).\n")[0].commands, ["npm test", "npm run build"]);
});
