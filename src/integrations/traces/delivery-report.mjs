import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { STORE_DIR } from "../privacy/store.mjs";

// Diagnóstico de entrega para o usuário (issue #8, crit. 3 e 9;
// docs/traces.md, "Falhas de entrega"). Hooks, ingest e wrapper não podem usar
// stdout/stderr, que são do agente, e o relatório de fixture só sai num pipe
// aberto pelos testes. Por isso o mesmo resumo `delivery` daquele relatório vai,
// numa linha NDJSON, para o arquivo que o usuário indica. O arquivo fica fora
// do store: com lock ocupado ou falha de E/S a captura não pode registrar a
// perda, e uma captura não escolhida (par inválido, encerrada, excluída) nunca
// recebe escrita.

export const CAPTURE_REPORT_ENV = "SKILL_ME_CAPTURE_REPORT";

// Caminho relativo é ignorado pela mesma razão da raiz do vínculo: hooks rodam
// no diretório do projeto do agente e cada processo apontaria para outro arquivo.
export function deliveryReportFile(env) {
  const file = env[CAPTURE_REPORT_ENV];
  return typeof file === "string" && file !== "" && path.isAbsolute(file) ? file : null;
}

// Só o processo que perdeu entregas ou não abriu a captura escreve: arquivo sem
// linhas quer dizer nenhuma falha registrada, sem crescer a cada evento.
// `capture` é o ID já validado pelo vínculo (null com o par inválido); nenhum
// valor de variável, caminho, payload ou mensagem de erro entra na linha.
export function deliveryReportLine({ summary, capture, agent, at }) {
  if (summary.code === null && summary.lost === 0) return null;
  return JSON.stringify({ skillMeDeliveryReport: 1, at, agent, capture, delivery: summary }) + "\n";
}

// Melhor esforço até `deadlineAt` (relógio de `performance.now()`): nunca lança
// e não há outro canal para avisar que o diagnóstico se perdeu.
export async function appendDeliveryReport(file, line, deadlineAt) {
  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(resolve, Math.max(0, deadlineAt - performance.now()));
  });
  try {
    await Promise.race([appendLine(file, line), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

// O store nunca recebe a linha: no state.json, na key, num segmento ou no
// marcador ela torna a captura ilegível; um `.lock` criado bloqueia a raiz; um
// nome novo na captura impede o delete. Vale o caminho real da pasta (links,
// junções, nomes 8.3, `..` e `\\?\` resolvidos), sem diferenciar maiúsculas, e
// o store de qualquer raiz, inclusive com o par inválido. No Windows o nome
// final conta sem o fluxo: `pasta:fluxo` é um fluxo de dados da própria pasta.
function insideStore(realDir, file) {
  const name = path.basename(file);
  const names = [...realDir.split(path.sep), process.platform === "win32" ? name.split(":")[0] : name];
  return names.some((part) => part.toLowerCase() === STORE_DIR);
}

// Um hard link é outro nome do mesmo arquivo, talvez o state.json ou a key de
// uma captura: arquivo com mais de um nome não é tocado.
const isOwnFile = (stats) => stats.isFile() && stats.nlink <= 1;

// Só arquivo regular, criado se faltar; link, pasta, FIFO ou dispositivo ficam
// intocados. O_NONBLOCK impede que um FIFO sem leitor prenda o `open` no POSIX
// (o Windows não tem FIFO nem O_NOFOLLOW; lá vale o `lstat`). A linha é uma
// única escrita com O_APPEND: com vários produtores ao mesmo tempo, cada uma
// entra inteira.
async function appendLine(file, line) {
  try {
    if (insideStore(await realpath(path.dirname(file)), file)) return;
    const existing = await lstat(file).catch((error) => (error.code === "ENOENT" ? null : Promise.reject(error)));
    if (existing !== null && !isOwnFile(existing)) return;
    const flags = constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0);
    const handle = await open(file, flags, 0o600);
    try {
      if (isOwnFile(await handle.stat())) await handle.write(line);
    } finally {
      await handle.close();
    }
  } catch {
    // Pasta inexistente, sem permissão ou disco cheio: o agente não percebe.
  }
}
