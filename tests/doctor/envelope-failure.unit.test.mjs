// C12 — "erro interno que impossibilite relatório usa exit 1" é a
// fronteira de tratamento de falha do CLI. Não é possível disparar um erro
// interno genuíno de forma determinística via processo real (qualquer
// entrada reconhecida vira um estado tratado, não uma falha); a regra de
// mapeamento erro->envelope->exit code é testada diretamente na função que
// o cli.mjs usa como última barreira, com um erro genérico injetado.
import assert from "node:assert/strict";
import test from "node:test";
import {
  exitCodeForStatus,
  toFailureEnvelope,
} from "../../src/doctor/report-envelope.mjs";

test("envelope-failure-C12 mapeamento de status para exit code", () => {
  assert.equal(exitCodeForStatus("complete"), 0);
  assert.equal(exitCodeForStatus("partial"), 0);
  assert.equal(exitCodeForStatus("failed"), 1);
});

test("envelope-failure-C12 qualquer erro inesperado vira envelope failed sem stack bruta", () => {
  const error = new Error("boom interno inesperado");
  error.stack = "Error: boom interno inesperado\n    at algumaFuncao (arquivo.mjs:10:5)";
  const envelope = toFailureEnvelope(error);
  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.status, "failed");
  assert.ok(Array.isArray(envelope.errors) && envelope.errors.length >= 1);
  const serialized = JSON.stringify(envelope);
  assert.doesNotMatch(serialized, /arquivo\.mjs:10:5/);
  assert.doesNotMatch(serialized, /at algumaFuncao/);
  assert.equal(exitCodeForStatus(envelope.status), 1);
});

test("envelope-failure-C12 erro sem mensagem ainda produz um código de erro próprio, não vazio", () => {
  const envelope = toFailureEnvelope(new Error());
  assert.ok(envelope.errors[0].code.length > 0);
});

// C14 — toFailureEnvelope nunca repassa error.code/error.message brutos: um
// erro com um canário em qualquer um dos dois campos não pode vazar para o
// consumidor de --json. O código/mensagem vêm sempre do vocabulário fechado
// de report-envelope.mjs, nunca do próprio objeto de erro recebido.
test("envelope-failure-C14 canário em message/code do erro nunca é repassado ao envelope", () => {
  const error = new Error("CANARY-REVIEW-SECRET");
  error.code = "CANARY-REVIEW-CODE";
  const envelope = toFailureEnvelope(error);
  const serialized = JSON.stringify(envelope);
  assert.doesNotMatch(serialized, /CANARY-REVIEW-SECRET/);
  assert.doesNotMatch(serialized, /CANARY-REVIEW-CODE/);
  assert.equal(envelope.errors[0].code, "internal_error");
});
