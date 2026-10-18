import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { admitLines, isExpired, PRIVACY_LIMITS, transition } from "../../../src/integrations/privacy/lifecycle.mjs";
import { runPrivacyCommand } from "../../../src/integrations/privacy/command.mjs";
import { createStoreIo } from "../../../src/integrations/privacy/fs.mjs";
import { makeScratch } from "../helpers/cli.mjs";
import { appendSanitized, startIn } from "../helpers/privacy-store.mjs";

const DAY_MS = 86_400_000;
const T0 = "2026-10-01T00:00:00.000Z";
const T1 = "2026-10-02T00:00:00.000Z";

// Captura disabled sempre tem conteúdo desligado (crit. 15); as demais partem
// de opt-in para que o desligamento pelo disable seja observável.
function capture(state, extra = {}) {
  return { id: "0".repeat(32), state, content: state !== "disabled", retentionDays: 7, createdAt: T0, endedAt: state === "active" ? null : T0, ...extra };
}

test("I5-C41 tabela de transições stop/disable", () => {
  const cases = [
    // [estado, ação, ok, próximo estado, changed, código]
    ["active", "stop", true, "stopped", true, null],
    ["stopped", "stop", true, "stopped", false, null],
    ["disabled", "stop", false, null, null, "invalid_transition"],
    ["active", "disable", true, "disabled", true, null],
    ["stopped", "disable", true, "disabled", true, null],
    ["disabled", "disable", true, "disabled", false, null],
  ];
  for (const [from, action, ok, to, changed, code] of cases) {
    const before = capture(from);
    const result = transition(before, action, T1);
    assert.equal(result.ok, ok, `${from} ${action}`);
    if (!ok) {
      assert.deepEqual(result, { ok: false, code }, `${from} ${action}`);
      continue;
    }
    assert.equal(result.capture.state, to, `${from} ${action}`);
    assert.equal(result.changed, changed, `${from} ${action}`);
    if (action === "disable") assert.equal(result.capture.content, false, `${from} ${action} desliga conteúdo`);
    else assert.equal(result.capture.content, before.content, `${from} ${action} mantém conteúdo`);
    // endedAt = primeira saída de active; mantido em stopped→disabled.
    assert.equal(result.capture.endedAt, from === "active" ? T1 : T0, `${from} ${action} endedAt`);
  }
  // Nenhuma ação volta a active; ação desconhecida não é transição.
  for (const from of ["stopped", "disabled"]) {
    for (const action of ["start", "activate", "resume"]) {
      assert.deepEqual(transition(capture(from), action, T1), { ok: false, code: "invalid_transition" });
    }
  }
  // Entrada não é mutada.
  const frozen = Object.freeze(capture("active"));
  transition(frozen, "stop", T1);
});

test("I5-C45 retenção conta do encerramento, igualdade seleciona e active nunca", () => {
  const ended = Date.parse(T0);
  const stopped = capture("stopped", { endedAt: T0, retentionDays: 7 });
  assert.equal(isExpired(stopped, ended + 7 * DAY_MS), true, "idade igual ao prazo");
  assert.equal(isExpired(stopped, ended + 7 * DAY_MS - 1), false, "1 ms a menos");
  assert.equal(isExpired(stopped, ended + 400 * DAY_MS), true);
  assert.equal(isExpired(capture("stopped", { retentionDays: 1 }), ended + DAY_MS), true, "limite inferior 1 dia");
  assert.equal(isExpired(capture("stopped", { retentionDays: 365 }), ended + 365 * DAY_MS - 1), false, "limite superior 365");
  const active = capture("active", { createdAt: "2025-01-01T00:00:00.000Z", retentionDays: 1 });
  assert.equal(isExpired(active, Date.parse("2025-01-01T00:00:00.000Z") + 400 * DAY_MS), false, "active de 400 dias");
  // disabled depois de stop: conta do endedAt do stop original, não do disable.
  const stoppedAt = Date.parse(T0);
  const disabled = transition(transition(capture("active"), "stop", T0).capture, "disable", "2026-10-06T00:00:00.000Z").capture;
  assert.equal(disabled.endedAt, T0);
  assert.equal(isExpired(disabled, stoppedAt + 7 * DAY_MS), true);
  assert.equal(isExpired(disabled, stoppedAt + 7 * DAY_MS - 1), false);
});

test("I5-C52 admissão: 500 eventos e 8 388 608 bytes exatos; o seguinte e os demais recusados", () => {
  assert.deepEqual(PRIVACY_LIMITS, { maxEvents: 500, maxBytes: 8_388_608 });
  const ones = (n) => Array.from({ length: n }, () => 10);
  assert.deepEqual(admitLines({ events: 0, bytes: 0 }, ones(500)), { admitted: 500, reason: null, dropped: {} });
  assert.deepEqual(admitLines({ events: 0, bytes: 0 }, ones(510)), {
    admitted: 500,
    reason: "capture_event_limit",
    dropped: { capture_event_limit: 10 },
  });
  assert.deepEqual(admitLines({ events: 499, bytes: 0 }, ones(2)), {
    admitted: 1,
    reason: "capture_event_limit",
    dropped: { capture_event_limit: 1 },
  });
  assert.deepEqual(admitLines({ events: 500, bytes: 0 }, [1]), {
    admitted: 0,
    reason: "capture_event_limit",
    dropped: { capture_event_limit: 1 },
  });
  // Exatamente no limite de bytes aceita; 1 byte acima recusa.
  assert.deepEqual(admitLines({ events: 0, bytes: 8_388_600 }, [8]), { admitted: 1, reason: null, dropped: {} });
  assert.deepEqual(admitLines({ events: 0, bytes: 8_388_600 }, [9]), {
    admitted: 0,
    reason: "capture_byte_limit",
    dropped: { capture_byte_limit: 1 },
  });
  // Ordem preservada: depois do primeiro recusado, um menor não passa à frente.
  assert.deepEqual(admitLines({ events: 0, bytes: 8_388_600 }, [4, 9, 1, 1]), {
    admitted: 1,
    reason: "capture_byte_limit",
    dropped: { capture_byte_limit: 3 },
  });
  assert.deepEqual(admitLines({ events: 0, bytes: 0 }, []), { admitted: 0, reason: null, dropped: {} });
});

test("I5-C51 falha de unlink no meio da exclusão sai 5 partial_delete e novo delete --apply conclui", async () => {
  const root = makeScratch("i5 c51");
  const id = await startIn(root);
  await appendSanitized(root, id, 3);
  assert.equal((await runPrivacyCommand({ argv: ["stop", "--root", root, "--capture", id] })).exitCode, 0);

  const real = createStoreIo();
  const failing = {
    ...real,
    async unlink(file) {
      if (path.basename(file) === "key") throw Object.assign(new Error("EIO injetado"), { code: "EIO" });
      return real.unlink(file);
    },
  };
  const partial = await runPrivacyCommand({ argv: ["delete", "--root", root, "--capture", id, "--apply"], io: failing });
  assert.equal(partial.exitCode, 5);
  assert.deepEqual(partial.body, { schemaVersion: 1, command: "delete", status: "error", error: { code: "partial_delete" } });
  const captures = path.join(root, "skill-me-privacy", "captures");
  assert.deepEqual(readdirSync(captures), [`.deleting-${id}`], "a falha deixa só a pasta em exclusão, visível");
  assert.ok(existsSync(path.join(captures, `.deleting-${id}`, "key")), "a chave que falhou continua lá, sem relato de exclusão");

  // Produtor/consulta atrasados não enxergam mais a captura.
  const status = await runPrivacyCommand({ argv: ["status", "--root", root, "--capture", id] });
  assert.equal(status.exitCode, 3);
  assert.equal(status.body.error.code, "capture_not_found");

  const resumed = await runPrivacyCommand({ argv: ["delete", "--root", root, "--capture", id, "--apply"] });
  assert.equal(resumed.exitCode, 0);
  assert.deepEqual(resumed.body, { schemaVersion: 1, command: "delete", status: "ok", capture: id, applied: true, deleted: true });
  assert.deepEqual(readdirSync(captures), []);
});
