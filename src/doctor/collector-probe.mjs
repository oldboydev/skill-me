import net from "node:net";

// Loopback literal e estrito: só os dois endereços exatos abaixo são aceitos.
// Nenhuma normalização (localhost, 127.1, hex/octal, resolução de DNS) passa
// por este regex — texto que não bate exatamente é tratado como inválido
// antes de qualquer tentativa de conexão.
const LOOPBACK_ENDPOINT_PATTERN = /^tcp:\/\/(127\.0\.0\.1|\[::1\]):(\d{1,5})$/;

// Único reconhecedor da assinatura de endpoint aceita pela CLI (critério 9):
// reusado por cli-args.mjs para recusar um endpoint fora da assinatura como
// entrada inválida antes mesmo de chegar aqui (ver cli-args.mjs).
export function parseLoopbackEndpoint(endpoint) {
  if (typeof endpoint !== "string") return null;
  const match = LOOPBACK_ENDPOINT_PATTERN.exec(endpoint);
  if (!match) return null;
  const port = Number(match[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  const host = match[1] === "[::1]" ? "::1" : match[1];
  return { host, port };
}

function abortError() {
  const error = new Error("conexão cancelada: teto de tempo atingido");
  error.code = "ABORT_ERR";
  return error;
}

// Conexão de transporte real, sem enviar bytes de evento/payload: resolve
// assim que o socket conecta e encerra imediatamente. Aceita um AbortSignal
// para que o chamador possa cancelar uma tentativa ainda pendente (ver
// probeCollector): sem isso, um timeout "vencia a corrida" mas deixava o
// socket real tentando conectar indefinidamente em segundo plano.
export function defaultConnect(host, port, { signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const socket = net.createConnection({ host, port });
    const onAbort = () => {
      socket.destroy();
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    socket.once("connect", () => {
      signal?.removeEventListener("abort", onAbort);
      socket.destroy();
      resolve();
    });
    socket.once("error", (error) => {
      signal?.removeEventListener("abort", onAbort);
      socket.destroy();
      reject(error);
    });
  });
}

export async function probeCollector(
  endpoint,
  { connect = defaultConnect, timeoutMs = 1000 } = {},
) {
  const parsed = parseLoopbackEndpoint(endpoint);
  if (!parsed) {
    return {
      status: "unknown",
      reasonCode: "invalid_endpoint",
      identityVerified: false,
    };
  }

  const controller = new AbortController();
  let timeoutHandle;
  const timeoutPromise = new Promise((resolve) => {
    timeoutHandle = setTimeout(() => resolve({ outcome: "timeout" }), timeoutMs);
  });
  // O lado "perdedor" da corrida nunca fica sem handler de rejeição: o
  // connect injetado é sempre resolvido para um objeto de resultado, mesmo
  // quando a rejeição vem do cancelamento abaixo.
  const connectPromise = connect(parsed.host, parsed.port, { signal: controller.signal }).then(
    () => ({ outcome: "connected" }),
    (error) => ({ outcome: "error", error }),
  );

  const result = await Promise.race([connectPromise, timeoutPromise]);
  clearTimeout(timeoutHandle);

  if (result.outcome === "timeout") {
    // O timeout "vence a corrida", mas a tentativa de conexão real ainda
    // pode estar pendente: cancela e aguarda o handle real se liberar antes
    // de retornar, para nunca deixar um socket/timer esquecido vivo.
    controller.abort();
    await connectPromise;
    return {
      status: "unreachable",
      reasonCode: "connection_timeout",
      identityVerified: false,
    };
  }
  if (result.outcome === "error") {
    return {
      status: "unreachable",
      reasonCode:
        result.error?.code === "ECONNREFUSED"
          ? "connection_refused"
          : "connection_failed",
      identityVerified: false,
    };
  }
  return { status: "reachable", reasonCode: null, identityVerified: false };
}
