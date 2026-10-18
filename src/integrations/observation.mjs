import net from "node:net";
import { createMemoryReceiver } from "./memory-receiver.mjs";
import { applyPolicy, createEphemeralKey } from "./privacy/policy.mjs";

// Sessão de observação de um processo (hook, ingest ou wrapper): rascunho →
// política de privacidade da #5 (fronteira, pseudônimos, nomes) → receptor em
// memória. Sem captura não há opt-in: conteúdo sempre desligado e chave
// efêmera do processo. Nada sai do processo, exceto pelo exportador de
// fixture abaixo, que só existe quando os testes definem
// SKILL_ME_OBSERVER_REPORT_FD — a instalação nunca define essa variável.

const COUNTER_NAMES = [
  "oversize",
  "unknownEvent",
  "invalidInput",
  "inputTooLarge",
  "stdinTimeout",
  "invalidJson",
  "oversizeLine",
  "partialTrailingLine",
  "reasoningExcluded",
];

export const REPORT_DEADLINE_MS = 1000;

// Hook e ingest aceitam 2..9; o wrapper só 3..9, porque o stderr dele é o do
// filho e não pode receber uma linha do debugger. Valor fora disso: sem relatório.
function reportFd(env, allowStderr) {
  const raw = env.SKILL_ME_OBSERVER_REPORT_FD;
  if (typeof raw !== "string" || !/^[2-9]$/.test(raw)) return null;
  const fd = Number(raw);
  return fd === 2 && !allowStderr ? null : fd;
}

// Escreve tudo ou desiste no prazo: um consumidor que não drena o pipe nunca
// prende o processo observado. Fds 3..9 são abertos como pipe pelo próprio
// handle do libuv (escrita assíncrona): uma escrita pelo pool de threads
// (fs.write) travaria o encerramento do processo no Windows enquanto o pipe
// estiver cheio. Arquivo, TTY ou fd fechado não são pipe: sem relatório. O fd 2
// usa o process.stderr (relatório pequeno do hook através do shell do Codex).
// Erro (EPIPE, EBADF) é absorvido.
function writeWithDeadline(fd, buffer, deadlineMs) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, deadlineMs);
    try {
      const stream = fd === 2 ? process.stderr : new net.Socket({ fd, readable: false, writable: true });
      stream.on("error", finish);
      stream.write(buffer, finish);
    } catch {
      finish();
    }
  });
}

const PRIVACY_CODES = ["content_disabled", "unsupported_content", "unsanitizable", "sensitive_removed", "content_truncated", "privacy_failure"];

export function createObservation({ env = process.env, allowStderrReport = true, capacity } = {}) {
  const receiver = createMemoryReceiver(capacity === undefined ? {} : { capacity });
  const counters = Object.fromEntries(COUNTER_NAMES.map((name) => [name, 0]));
  const privacy = Object.fromEntries(PRIVACY_CODES.map((code) => [code, 0]));
  const key = createEphemeralKey();
  // v2: IDs pseudonimizados pela chave do processo e contagem dos códigos da
  // política; um consumidor de v1 compararia IDs nativos sem saber da troca.
  const report = () => {
    const snap = receiver.snapshot();
    return { skillMeObserverReport: 2, events: snap.events, counters: { ...snap.counters, ...counters, privacy: { ...privacy } } };
  };

  return {
    count(name) {
      counters[name] += 1;
    },
    // Evento recusado pela política conta como descarte; nunca lança.
    submit(adapted, payload) {
      try {
        if (adapted.kind === "unknown") return counters.unknownEvent++;
        if (adapted.kind === "excluded") return counters.reasoningExcluded++;
        if (adapted.kind !== "draft") return counters.invalidInput++;
        const result = applyPolicy({ draft: adapted.draft, payload, key, content: false });
        if (!result.ok) return result.drop === "envelope_oversize" ? counters.oversize++ : counters.invalidInput++;
        for (const entry of result.record.privacy) privacy[entry.slice(entry.lastIndexOf(":") + 1)] += 1;
        receiver.receive(result.record.envelope);
      } catch {
        counters.invalidInput += 1;
      }
    },
    report,
    // `deadlineAt` (relógio monotônico de `performance.now()`) permite a quem
    // chama contar o prazo de um instante anterior — o wrapper conta do fim do
    // filho. A serialização entra no prazo.
    async flush({ deadlineAt = performance.now() + REPORT_DEADLINE_MS } = {}) {
      receiver.close();
      const fd = reportFd(env, allowStderrReport);
      if (fd === null) return;
      let line;
      try {
        line = Buffer.from(JSON.stringify(report()) + "\n", "utf8");
      } catch {
        return;
      }
      await writeWithDeadline(fd, line, Math.max(0, deadlineAt - performance.now()));
    },
  };
}
