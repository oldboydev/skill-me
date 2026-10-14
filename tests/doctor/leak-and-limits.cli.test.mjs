// C14 — fronteira externa real: canários em config/erros/comandos de hooks
// não podem vazar em stdout/stderr nem em arquivos do diagnóstico.
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { makeScratch } from "./helpers/fixture-agents.mjs";
import { writeAgentConfig } from "./helpers/fixture-agent-config.mjs";
import { CANARY, ONE_MIB_BYTES } from "./helpers/fixture-configs.mjs";
import { runDoctor, runDoctorJson } from "./helpers/spawn-doctor.mjs";

function homeWithClaudeConfig(scratch, content) {
  const home = path.join(scratch, "home");
  writeAgentConfig(home, "claude", content);
  return home;
}

test("leak-C14 canário de credencial/comando/prompt não aparece em stdout, stderr ou no relatório", () => {
  const scratch = makeScratch("doctor-leak-");
  try {
    const home = homeWithClaudeConfig(
      scratch,
      JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              matcher: "Bash",
              hooks: [
                {
                  type: "command",
                  command: `curl -H 'Authorization: ${CANARY}' https://example.invalid`,
                },
              ],
            },
          ],
        },
        credential: CANARY,
        prompt: CANARY,
      }),
    );
    const env = {
      HOME: home,
      USERPROFILE: home,
      LOCALAPPDATA: path.join(scratch, "localappdata-vazio"),
    };
    const jsonRun = runDoctorJson([], { env });
    assert.equal(jsonRun.status, 0);
    assert.doesNotMatch(jsonRun.stdout, new RegExp(CANARY));
    assert.doesNotMatch(jsonRun.stderr, new RegExp(CANARY));
    assert.doesNotMatch(JSON.stringify(jsonRun.report), new RegExp(CANARY));

    const textRun = runDoctor([], { env });
    assert.doesNotMatch(textRun.stdout, new RegExp(CANARY));
    assert.doesNotMatch(textRun.stderr, new RegExp(CANARY));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Flag e --cwd desconhecidos/inexistentes nunca embutem o valor bruto
// recebido na mensagem de erro (ecoada em stderr e no envelope JSON): usam
// um vocabulário fechado de código/mensagem (ver report-envelope.mjs), então
// um canário na própria flag ou no caminho nunca aparece na saída.
test("leak-C14 canário embutido no nome de uma flag desconhecida não aparece em stdout/stderr/JSON", () => {
  const jsonRun = runDoctorJson([`--${CANARY}`], {});
  assert.equal(jsonRun.status, 2);
  assert.doesNotMatch(jsonRun.stdout, new RegExp(CANARY));
  assert.doesNotMatch(jsonRun.stderr, new RegExp(CANARY));
  assert.doesNotMatch(JSON.stringify(jsonRun.report), new RegExp(CANARY));

  const textRun = runDoctor([`--${CANARY}`], {});
  assert.equal(textRun.status, 2);
  assert.doesNotMatch(textRun.stdout, new RegExp(CANARY));
  assert.doesNotMatch(textRun.stderr, new RegExp(CANARY));
});

test("leak-C14 canário embutido no caminho de --cwd inexistente não aparece em stdout/stderr/JSON", () => {
  const scratch = makeScratch("doctor-leak-cwd-");
  try {
    const missingDir = path.join(scratch, `nao-existe-${CANARY}`);
    const jsonRun = runDoctorJson(["--cwd", missingDir], {});
    assert.equal(jsonRun.status, 2);
    assert.doesNotMatch(jsonRun.stdout, new RegExp(CANARY));
    assert.doesNotMatch(jsonRun.stderr, new RegExp(CANARY));
    assert.doesNotMatch(JSON.stringify(jsonRun.report), new RegExp(CANARY));

    const textRun = runDoctor(["--cwd", missingDir], {});
    assert.equal(textRun.status, 2);
    assert.doesNotMatch(textRun.stdout, new RegExp(CANARY));
    assert.doesNotMatch(textRun.stderr, new RegExp(CANARY));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("leak-C14 config acima de 1 MiB vira unknown/input_too_large sem copiar o conteúdo no relatório", () => {
  const scratch = makeScratch("doctor-leak-oversized-");
  try {
    const marker = "CANARY-OVERSIZED-MARKER-9f21";
    const body = `{"hooks":{"PreToolUse":[]},"marker":"${marker}"` + " ".repeat(ONE_MIB_BYTES) + "}";
    const home = homeWithClaudeConfig(scratch, body);
    const { status, report } = runDoctorJson([], {
      env: {
        HOME: home,
        USERPROFILE: home,
        LOCALAPPDATA: path.join(scratch, "localappdata-vazio"),
      },
    });
    assert.equal(status, 0);
    const claude = report.agents.find((a) => a.id === "claude");
    assert.equal(claude.configuration, "unknown");
    assert.equal(claude.configReasonCode, "input_too_large");
    assert.doesNotMatch(JSON.stringify(report), new RegExp(marker));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
