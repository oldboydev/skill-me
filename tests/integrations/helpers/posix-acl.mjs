// ACL POSIX de arquivos sintéticos nas provas Linux, definida e lida pela
// libacl do sistema (`libacl.so.1`, API de texto: `acl_from_text`,
// `acl_set_file`, `acl_get_file`, `acl_to_text` — páginas acl_*(3)) pelo
// Python do sistema com `ctypes`: o Ubuntu usado não tem `getfacl`/`setfacl`.
// Independente do produto, que lê e grava o xattr bruto pelo descritor: aqui
// as ACLs vão e voltam pelo caminho, na forma de texto da libacl, e o acesso
// efetivo é calculado por helpers/posix-access.mjs. `rawAcl` lê o xattr
// `system.posix_acl_access` (onde a libacl guarda a ACL de acesso,
// `ACL_EA_ACCESS` em acl_ea.h) só para conferir o que o instalador pediu.
// Nas fixtures só entram UID/GID numéricos sintéticos, sem conta.
import { spawnSync } from "node:child_process";

const PYTHON = "/usr/bin/python3";
// Script fixo; operação, caminho e texto chegam pelo stdin, em JSON.
const SCRIPT = `
import ctypes, errno, json, os, sys
req = json.loads(sys.stdin.read())
lib = ctypes.CDLL("libacl.so.1", use_errno=True)
lib.acl_from_text.restype = ctypes.c_void_p
lib.acl_from_text.argtypes = [ctypes.c_char_p]
lib.acl_set_file.argtypes = [ctypes.c_char_p, ctypes.c_uint, ctypes.c_void_p]
lib.acl_get_file.restype = ctypes.c_void_p
lib.acl_get_file.argtypes = [ctypes.c_char_p, ctypes.c_uint]
lib.acl_to_text.restype = ctypes.c_void_p
lib.acl_to_text.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
lib.acl_free.argtypes = [ctypes.c_void_p]
TYPES = {"access": 0x8000, "default": 0x4000}
path = req["path"].encode()
def fail(what):
    e = ctypes.get_errno()
    sys.exit(what + ": " + errno.errorcode.get(e, str(e)))
if req["op"] == "set":
    acl = lib.acl_from_text(req["text"].encode())
    if not acl:
        fail("acl_from_text")
    ok = lib.acl_set_file(path, TYPES[req["kind"]], acl) == 0
    lib.acl_free(acl)
    if not ok:
        fail("acl_set_file")
elif req["op"] == "read":
    out = {}
    for kind in ["access", "default"] if os.path.isdir(path) else ["access"]:
        acl = lib.acl_get_file(path, TYPES[kind])
        if not acl:
            fail("acl_get_file")
        text = lib.acl_to_text(acl, None)
        out[kind] = ctypes.string_at(text).decode()
        lib.acl_free(text)
        lib.acl_free(acl)
    sys.stdout.write(json.dumps(out))
elif req["op"] == "raw":
    try:
        sys.stdout.write(os.getxattr(path, "system.posix_acl_access").hex())
    except OSError as e:
        if e.errno != errno.ENODATA:
            raise
        sys.stdout.write("none")
elif req["op"] == "remove":
    try:
        os.removexattr(path, "system.posix_acl_access")
    except OSError as e:
        if e.errno != errno.ENODATA:
            raise
`;

function python(request) {
  const result = spawnSync(PYTHON, ["-I", "-S", "-c", SCRIPT], { input: JSON.stringify(request), encoding: "utf8", env: {}, timeout: 30_000 });
  if (result.status !== 0) throw new Error(`Python da prova (${request.op}) terminou com ${result.status ?? result.signal}: ${(result.stderr ?? "").trim().split("\n").pop()}`);
  return result.stdout;
}

// `text` na forma curta de acl(5), ex.: "u::rw-,u:2147400001:---,g::r--,m::r--,o::r--".
export function setAcl(file, text, { kind = "access" } = {}) {
  python({ op: "set", path: file, text, kind });
}

// Remove a ACL estendida de acesso (o arquivo fica só com os bits de modo).
export function removeAcl(file) {
  python({ op: "remove", path: file });
}

// Entradas na forma longa da libacl, sem os comentários `#effective`, na
// ordem dela: ["user::rw-", "user:2147400001:r-x", "group::r--", "mask::r--",
// "other::---"]. Sem ACL estendida são as três entradas do modo.
const entriesOf = (text) =>
  text
    .split("\n")
    .map((line) => line.replace(/\s*#.*$/, ""))
    .filter(Boolean);

export function readAcl(file) {
  const read = JSON.parse(python({ op: "read", path: file }));
  return { access: entriesOf(read.access), default: read.default === undefined ? undefined : entriesOf(read.default) };
}

// Xattr bruto da ACL de acesso em hexadecimal, ou "none".
export const rawAcl = (file) => python({ op: "raw", path: file });
