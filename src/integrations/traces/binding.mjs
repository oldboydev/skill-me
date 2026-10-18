import path from "node:path";
import { CAPTURE_ID_PATTERN } from "../privacy/lifecycle.mjs";

// Vínculo explícito de um processo produtor a uma captura (issue #8, Landing
// "Vínculo explícito entre processos" em .checks/issue-8-traces.md): o par
// herdado pelo agente iniciado pelo usuário. Sem nenhuma das duas variáveis o
// processo fica como na #4 — observação só em memória. Com uma só, ou com
// valor inválido, nenhuma captura é escolhida: a entrega só informa o código.

export const CAPTURE_ROOT_ENV = "SKILL_ME_CAPTURE_ROOT";
export const CAPTURE_ID_ENV = "SKILL_ME_CAPTURE_ID";

const present = (value) => typeof value === "string" && value !== "";

// Raiz relativa é recusada: hooks rodam no diretório do projeto do agente, e
// o mesmo valor apontaria para outra raiz em cada processo, sem o usuário pedir.
export function captureBinding(env) {
  const root = env[CAPTURE_ROOT_ENV];
  const id = env[CAPTURE_ID_ENV];
  if (!present(root) && !present(id)) return { kind: "none" };
  if (!present(root) || !path.isAbsolute(root) || !present(id) || !CAPTURE_ID_PATTERN.test(id)) return { kind: "invalid", code: "binding_invalid" };
  return { kind: "bound", root, id };
}

// Entrega do processo, ou null sem vínculo. O store só é carregado quando o
// ambiente pede uma captura: o hook de cada evento continua carregando o mínimo.
export async function captureDeliveryFor({ env, agent }) {
  const binding = captureBinding(env);
  if (binding.kind === "none") return null;
  const { createCaptureDelivery, refusedDelivery } = await import("./delivery.mjs");
  if (binding.kind === "invalid") return refusedDelivery(binding.code);
  return createCaptureDelivery({ root: binding.root, id: binding.id, agent });
}
