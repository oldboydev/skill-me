// Modelo de acesso POSIX usado pelas provas de permissão. Para quem não é o
// dono, a classe é decidida pelo grupo do arquivo: membro desse grupo usa os
// bits de grupo — mesmo que os de "outros" sejam mais amplos —, os demais usam
// os de "outros". Quando o grupo do arquivo muda, cada combinação de
// pertencimento muda de classe de um jeito, e todas precisam ser conferidas.
// Devolve os destinatários que ganham algum bit de acesso; vazio = nenhuma
// ampliação. O dono é o mesmo antes e depois nas provas.
const ownerBits = (mode) => (mode >> 6) & 0o7;
const groupBits = (mode) => (mode >> 3) & 0o7;
const otherBits = (mode) => mode & 0o7;

export function widenedRecipients(before, after) {
  const transitions =
    before.gid === after.gid
      ? { grupo: [groupBits(before.mode), groupBits(after.mode)], outros: [otherBits(before.mode), otherBits(after.mode)] }
      : {
          "só do grupo antigo": [groupBits(before.mode), otherBits(after.mode)],
          "só do grupo novo": [otherBits(before.mode), groupBits(after.mode)],
          "dos dois grupos": [groupBits(before.mode), groupBits(after.mode)],
          "de nenhum dos grupos": [otherBits(before.mode), otherBits(after.mode)],
        };
  transitions.dono = [ownerBits(before.mode), ownerBits(after.mode)];
  return Object.entries(transitions)
    .filter(([, [was, now]]) => (now & ~was) !== 0)
    .map(([recipient]) => recipient);
}
