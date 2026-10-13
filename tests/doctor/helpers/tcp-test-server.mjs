import net from "node:net";

// Sobe um servidor TCP real em loopback para provar "reachable" sem simular
// a resposta esperada: o teste só controla se há (ou não) um listener.
export function startLoopbackServer(host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => socket.end());
    server.on("error", reject);
    server.listen(0, host, () => {
      const { port } = server.address();
      resolve({
        port,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

// Reserva uma porta efêmera em loopback e libera imediatamente, para um
// teste de "unreachable" com recusa real de conexão (ECONNREFUSED).
export async function reserveClosedPort(host = "127.0.0.1") {
  const server = await startLoopbackServer(host);
  const port = server.port;
  await server.close();
  return port;
}
