import path from "node:path";
import { CAPTURE_ID_PATTERN } from "../privacy/lifecycle.mjs";

// Vínculo explícito de um processo produtor a uma captura (issue #8, Landing
// "Vínculo explícito entre processos" em .checks/issue-8-traces.md): o par
// herdado pelo agente iniciado pelo usuário. Sem nenhuma das duas variáveis o
// processo fica como na #4 — observação só em memória. Com uma só, ou com
// valor inválido, nenhuma captura é escolhida: a entrega só informa o código.

export const CAPTURE_ROOT_ENV = "SKILL_ME_CAPTURE_ROOT";
export const CAPTURE_ID_ENV = "SKILL_ME_CAPTURE_ID";
// Par da execução de `skill-me <agente>` (issue #25, linha "Vínculo da
// execução (ambiente)" do Landing em .checks/issue-25-agent-launch.md): só o
// launcher o define, no ambiente do agente; o ID é o da execução, não o de uma
// captura, e a raiz é o caminho real da configurada.
export const LAUNCH_ROOT_ENV = "SKILL_ME_LAUNCH_ROOT";
export const LAUNCH_ID_ENV = "SKILL_ME_LAUNCH_ID";

const present = (value) => typeof value === "string" && value !== "";

// Raiz relativa é recusada: hooks rodam no diretório do projeto do agente, e
// o mesmo valor apontaria para outra raiz em cada processo, sem o usuário pedir.
function pairBinding(env, rootName, idName) {
  const root = env[rootName];
  const id = env[idName];
  if (!present(root) && !present(id)) return { kind: "none" };
  if (!present(root) || !path.isAbsolute(root) || !present(id) || !CAPTURE_ID_PATTERN.test(id)) return { kind: "invalid", code: "binding_invalid" };
  return { kind: "bound", root, id };
}

export const captureBinding = (env) => pairBinding(env, CAPTURE_ROOT_ENV, CAPTURE_ID_ENV);
export const launchBinding = (env) => pairBinding(env, LAUNCH_ROOT_ENV, LAUNCH_ID_ENV);

// Produtores que, sem nenhuma das duas variáveis, entram na observação
// automática da #23; o wrapper `integrations run` continua só com o vínculo
// explícito (linha "Roteamento" do Landing em .checks/issue-23-observacao-on-off.md).
export const AUTOMATIC_AGENTS = Object.freeze(["claude", "codex-hooks", "hermes"]);

// Sem vínculo: a observação automática, se este usuário fez o setup; sem setup,
// null, e o processo fica como na #4. O par explícito, completo ou não, nunca
// cai na rota automática.
async function automaticDeliveryFor(agent) {
  if (!AUTOMATIC_AGENTS.includes(agent)) return null;
  const { readObserveConfig } = await import("../observe/config.mjs");
  const read = await readObserveConfig();
  if (read.state === "missing") return null;
  const { createAutomaticDelivery } = await import("../observe/delivery.mjs");
  return read.state === "ok" ? createAutomaticDelivery({ config: read.config, agent }) : createAutomaticDelivery({ failure: read.code, agent });
}

// Par da execução, para os mesmos produtores da observação automática: tem
// precedência sobre o par manual e o `on`, e um par incompleto ou inválido não
// grava em lugar nenhum — nunca cai nas outras rotas.
async function launchDeliveryFor(binding, agent) {
  if (binding.kind === "invalid") {
    const { refusedDelivery } = await import("./delivery.mjs");
    return { ...refusedDelivery(binding.code), publish: async () => {} };
  }
  const { createLaunchDelivery } = await import("../observe/delivery.mjs");
  return createLaunchDelivery({ root: binding.root, invocation: binding.id, agent });
}

// Entrega do processo, ou null sem vínculo nem observação automática. O store
// só é carregado quando o ambiente pede uma captura ou o setup existe: o hook de
// cada evento continua carregando o mínimo. `publish`, chamado depois de
// `settle`, leva o resumo final ao arquivo de diagnóstico do usuário
// (delivery-report.mjs), quando houver um.
export async function captureDeliveryFor({ env, agent }) {
  if (AUTOMATIC_AGENTS.includes(agent)) {
    const launch = launchBinding(env);
    if (launch.kind !== "none") return launchDeliveryFor(launch, agent);
  }
  const binding = captureBinding(env);
  if (binding.kind === "none") return automaticDeliveryFor(agent);
  const [{ createCaptureDelivery, refusedDelivery }, report] = await Promise.all([import("./delivery.mjs"), import("./delivery-report.mjs")]);
  const delivery = binding.kind === "invalid" ? refusedDelivery(binding.code) : createCaptureDelivery({ root: binding.root, id: binding.id, agent });
  const file = report.deliveryReportFile(env);
  const publish = async (deadlineAt) => {
    if (file === null) return;
    const line = report.deliveryReportLine({ summary: delivery.report(), capture: binding.id ?? null, agent, at: new Date().toISOString() });
    if (line !== null) await report.appendDeliveryReport(file, line, deadlineAt);
  };
  return { ...delivery, publish };
}
