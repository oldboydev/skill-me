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

// Acesso efetivo pela ACL POSIX de quem não é o dono, pelo algoritmo de acl(5)
// ("ACCESS CHECK ALGORITHM"): entrada nomeada do uid, limitada pela máscara;
// senão, se algum grupo do destinatário casa com o grupo dono (`group::`) ou
// com uma entrada `group:<gid>`, o bit vale se alguma dessas entradas o tem e
// a máscara também — e, casando grupo, "outros" não é consultado; senão,
// `other::`. `acl` = `{ gid, entries }` com as entradas na forma longa da
// libacl (helpers/posix-acl.mjs); sem ACL estendida são as três do modo.
const PERM_BITS = { r: 4, w: 2, x: 1 };
const permBits = (text) => [...text].reduce((bits, ch) => bits | (PERM_BITS[ch] ?? 0), 0);

function parseEntry(line) {
  const [tag, qualifier, perms] = line.split(":");
  return { tag, id: qualifier === "" ? null : Number(qualifier), bits: permBits(perms) };
}

function aclBits(acl, who) {
  const entries = acl.entries.map(parseEntry);
  const mask = entries.find((e) => e.tag === "mask")?.bits ?? 0o7;
  const named = entries.find((e) => e.tag === "user" && e.id === who.uid);
  if (named) return named.bits & mask;
  const groups = entries.filter((e) => e.tag === "group" && who.groups.includes(e.id ?? acl.gid));
  if (groups.length > 0) return groups.reduce((bits, e) => bits | (e.bits & mask), 0);
  return entries.find((e) => e.tag === "other").bits;
}

// Nomes dos destinatários (`{ nome: { uid, groups } }`, nenhum deles o dono)
// que ganham algum bit de `before` para `after`; vazio = nenhuma ampliação.
export function widenedAclRecipients(before, after, recipients) {
  return Object.entries(recipients)
    .filter(([, who]) => (aclBits(after, who) & ~aclBits(before, who)) !== 0)
    .map(([name]) => name);
}
