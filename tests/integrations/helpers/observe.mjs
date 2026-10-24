import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PSEUDONYM, REPO_ROOT, baseEnv, makeScratch, runIntegrations } from "./cli.mjs";
import { ndjson } from "./privacy-canaries.mjs";
import { runPrivacy } from "./privacy-store.mjs";
import { exportOf, startCapture, storeDir } from "./traces.mjs";

// Apoio das provas da issue #23: home e raiz temporários (nunca os do usuário
// que roda os testes), o CLI `observe` e os scripts `npm run on/off/status` como
// o usuário os chama. O esperado vem do contrato publicado no Landing de
// .checks/issue-23-observacao-on-off.md, não do código.

export const configFile = (home) => path.join(home, ".skill-me", "observe.json");
// Registro da raiz autorizada, direto no home (linha "Registro da autorização").
export const authorizationFile = (home) => path.join(home, ".skill-me-authorization.json");
export const observeFile = (root) => path.join(storeDir(root), "observe.json");
export const HEX32 = /^[0-9a-f]{32}$/;
export const HEX64 = /^[0-9a-f]{64}$/;
export const DELIVERED_AUTO = (n) => ({ automatic: true, code: null, entries: n, committed: n, persisted: n, lost: 0, unrouted: 0 });

// O home é o do processo: USERPROFILE no Windows, HOME no POSIX (os dois
// apontam para o mesmo diretório temporário).
export const homeEnv = (home, extra = {}) => baseEnv({ HOME: home, USERPROFILE: home, ...extra });

function singleJson(result) {
  try {
    return JSON.parse(result.stdout);
  } catch (cause) {
    throw new Error(`stdout não é um JSON único: ${JSON.stringify(result.stdout)} stderr=${JSON.stringify(result.stderr)}`, { cause });
  }
}

export function runObserve(args, { env, ...options }) {
  const result = runIntegrations(["observe", ...args], { env, ...options });
  return { ...result, body: singleJson(result) };
}

// O npm do próprio Node em execução (o que `npm run` usaria): ao lado do
// executável no Windows, em ../lib no POSIX; `npm_execpath` quando a suíte roda
// por `npm test`.
function npmCli() {
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(path.dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ];
  const found = candidates.find((file) => typeof file === "string" && file.endsWith(".js") && existsSync(file));
  assert.ok(found, "npm-cli.js do Node em execução não encontrado");
  return found;
}

// `npm run --silent <script>` na raiz do checkout, como o README manda. O cache
// e os logs do npm ficam no home temporário; o aviso de versão (que consultaria
// o registro) fica desligado.
export function runNpmScript(script, { env }) {
  const result = spawnSync(process.execPath, [npmCli(), "run", "--silent", script], {
    cwd: REPO_ROOT,
    env: { ...env, npm_config_update_notifier: "false", npm_config_cache: path.join(env.HOME, "npm cache") },
    encoding: "utf8",
    timeout: 60_000,
  });
  const out = { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  return { ...out, body: singleJson(out) };
}

// Home e raiz novos, com espaço e Unicode no caminho, e a configuração única
// feita pelo CLI real. A raiz fica numa pasta própria dentro do scratch.
export function prepareObservation(scratch, label) {
  const home = scratch(`${label} home`);
  const root = path.join(scratch(`${label} raiz`), "capturas automáticas ação");
  mkdirSync(root);
  const env = homeEnv(home);
  const setup = runObserve(["setup", "--root", root], { env });
  assert.equal(setup.status, 0, setup.stdout);
  return { home, root, env };
}

export function observeOk(args, env) {
  const result = runObserve(args, { env });
  assert.equal(result.status, 0, `${args[0]}: ${result.stdout}`);
  assert.equal(result.stderr, "", args[0]);
  return result.body;
}

// Todas as capturas da raiz pelo `privacy list` (uma página basta nas provas).
export function listCaptures(root) {
  const result = runPrivacy(["list", "--root", root]);
  assert.equal(result.status, 0, result.stdout);
  assert.equal(result.body.nextAfter, null, "uma página");
  return result.body.captures;
}

export const automaticOf = (root) => listCaptures(root).filter((capture) => capture.origin === "automatic");

// Caminhos viram `ref`/`refs` pseudonimizados com a chave de cada captura, como
// os IDs: na comparação entre capturas cada um vira um marcador depois de
// conferido o formato `h1:`.
function withoutRefs(content) {
  if (content === null) return null;
  const fields = content.fields.map((field) => {
    const out = { ...field };
    if ("ref" in out) {
      assert.match(out.ref, PSEUDONYM);
      out.ref = "<ref>";
    }
    if ("refs" in out) {
      for (const ref of out.refs) assert.match(ref, PSEUDONYM);
      out.refs = out.refs.map(() => "<ref>");
    }
    return out;
  });
  return { ...content, fields };
}

// Conteúdo e marcas de privacidade iguais aos que o `privacy ingest` da #5
// grava numa captura manual com --content (a referência), na mesma ordem.
export function assertSameAsIngest(root, agent, entries, stored, label) {
  const reference = startCapture(root, ["--content"]);
  assert.equal(runPrivacy(["ingest", "--root", root, "--capture", reference, "--agent", agent], { input: ndjson(entries) }).status, 0, label);
  const expected = exportOf(root, reference).records;
  assert.equal(stored.length, expected.length, label);
  for (const [index, record] of stored.entries()) {
    assert.deepEqual(withoutRefs(record.content), withoutRefs(expected[index].content), `${label} #${index}`);
    assert.deepEqual(record.privacy, expected[index].privacy, `${label} #${index}`);
  }
}

export const readObserveState = (root) => JSON.parse(readFileSync(observeFile(root), "utf8"));

export { makeScratch };
