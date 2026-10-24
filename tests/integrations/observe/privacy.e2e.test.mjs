import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { after, test } from "node:test";
import { REPO_ROOT, makeScratch, runIntegrations } from "../helpers/cli.mjs";
import { COMPOSED_COMMAND, MARKER, SECRET_TEXT, claudePayload, codexHookPayload, hermesRecord, leaks } from "../helpers/privacy-canaries.mjs";
import { DELIVERED_AUTO, assertSameAsIngest, authorizationFile, automaticOf, configFile, controlLockFile, homeEnv } from "../helpers/observe.mjs";
import { exportOf, filesUnder, runHermesIngest, runHook, storeDir } from "../helpers/traces.mjs";

// Prova C17 da issue #23: com a observação ligada, cada evento passa pela
// política da #5 com o opt-in que o `on` concede (conteúdo sanitizado), igual ao
// `privacy ingest` numa captura com --content; sem `on`, nada é gravado; e nenhum
// processo do fluxo (setup, on, hooks, ingest, off, status, report) abre conexão
// de rede ou escreve fora do store e da configuração. A sonda de teste da #5
// (privacy-probe.mjs) registra arquivos e recusa e registra qualquer rede.

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
const scratch = (label) => {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
};

const PROBE = pathToFileURL(path.join(REPO_ROOT, "tests", "integrations", "helpers", "privacy-probe.mjs")).href;
const NETWORK_MODULES = ["net", "http", "https", "http2", "dns", "dgram", "tls"];

test("I23-C17 modo automático respeita privacidade: conteúdo sensível, não suportado ou sem opt-in continua omitido e nenhum processo usa rede", async () => {
  // Os módulos da observação automática não importam rede nem usam fetch.
  const observeDir = path.join(REPO_ROOT, "src", "integrations", "observe");
  const imports = new RegExp(`(from\\s+|import\\s*\\(\\s*|require\\s*\\(\\s*)["'](node:)?(${NETWORK_MODULES.join("|")})(/[^"']*)?["']`);
  const modules = readdirSync(observeDir).filter((name) => name.endsWith(".mjs"));
  assert.ok(modules.length >= 5, modules.join(", "));
  for (const name of modules) {
    const source = readFileSync(path.join(observeDir, name), "utf8");
    assert.ok(!imports.test(source), `${name} importa módulo de rede`);
    assert.ok(!/\bfetch\s*\(/.test(source), `${name} usa fetch`);
  }

  const home = scratch("i23 c17 home");
  const root = path.join(scratch("i23 c17 raiz"), "capturas ação");
  mkdirSync(root);
  const project = scratch("i23 c17 projeto");
  const log = path.join(scratch("i23 c17 sonda"), "sonda.jsonl");
  const env = homeEnv(home, { SKILL_ME_TEST_PRIVACY_PROBE_LOG: log });
  const nodeArgs = ["--import", PROBE];
  const cli = (args) => {
    const run = runIntegrations(args, { env, nodeArgs, cwd: project });
    assert.equal(run.status, 0, `${args.join(" ")}: ${run.stdout}`);
    return run;
  };

  const claude = [
    claudePayload("pre_tool_bash", { tool_use_id: "chamada-segredo", tool_input: { command: SECRET_TEXT, description: "listar ação" } }),
    claudePayload("pre_tool_bash", { tool_use_id: "chamada-write", tool_name: "Write", tool_input: { file_path: "C:\\x\\a.txt", content: `texto ${MARKER}` } }),
    claudePayload("pre_tool_bash", { tool_use_id: "chamada-composta", tool_input: { command: COMPOSED_COMMAND } }),
  ];
  const codex = [codexHookPayload("pre_tool_bash", { tool_input: { command: SECRET_TEXT } })];
  const hermes = [hermesRecord("post_tool_call")];
  const produce = async () => {
    const runs = [];
    for (const payload of claude) runs.push(await runHook("claude", payload, { env, cwd: project, nodeArgs }));
    for (const payload of codex) runs.push(await runHook("codex", payload, { env, cwd: project, nodeArgs }));
    runs.push(await runHermesIngest(hermes, { env, cwd: project, nodeArgs }));
    for (const run of runs) assert.deepEqual([run.status, run.stdout, run.stderr], [0, "", ""]);
    return runs;
  };

  // Sem opt-in (configurado, sem on): nada é gravado.
  cli(["observe", "setup", "--root", root]);
  for (const run of await produce()) assert.equal(run.report.delivery.code, "observe_off");
  assert.ok(!existsSync(storeDir(root)), "sem on, nenhum store");

  // Com on: cada evento passa pela política com conteúdo sanitizado.
  cli(["observe", "on"]);
  const runs = await produce();
  for (const run of runs.slice(0, 4)) assert.deepEqual(run.report.delivery, DELIVERED_AUTO(1));
  assert.deepEqual(runs[4].report.delivery, DELIVERED_AUTO(1));
  // A observação em memória do processo continua sem conteúdo (#4/#5).
  assert.equal(runs[0].report.counters.privacy.content_disabled, 1);

  const captures = automaticOf(root);
  assert.equal(captures.length, 3, "uma sessão por agente");
  const byAgent = Object.fromEntries(captures.map((c) => {
    const { records } = exportOf(root, c.id);
    return [records[0].envelope.source.agent, records];
  }));
  assertSameAsIngest(root, "claude", claude, byAgent.claude, "Claude");
  assertSameAsIngest(root, "codex-hooks", codex, byAgent.codex, "Codex");
  assertSameAsIngest(root, "hermes", hermes, byAgent.hermes, "Hermes");
  const [secret, unsupported, composed] = byAgent.claude;
  const command = secret.content.fields.find((f) => f.field === "tool_input.command");
  assert.ok(command.value.includes("[removido]") && command.value.includes("início seguro"), "sensível removido, resto sanitizado");
  assert.deepEqual([unsupported.content, unsupported.privacy], [null, ["content:unsupported_content"]], "conteúdo não suportado omitido");
  assert.ok(!JSON.stringify(composed.content ?? {}).includes("SKILLMECANARY"), "valor composto sem projeção segura não vai ao disco");
  assert.ok(composed.privacy.some((entry) => entry.endsWith(":unsanitizable")), composed.privacy.join(", "));
  assert.equal(byAgent.hermes[0].content, null, "Hermes não tem linha na matriz de conteúdo");
  for (const file of filesUnder(storeDir(root))) {
    if (path.basename(file) === "key") continue;
    assert.deepEqual(leaks(readFileSync(file, "utf8")), [], path.relative(root, file));
  }

  // Consulta e desligamento pelo mesmo caminho do usuário.
  const skill = path.join(project, "SKILL.md");
  writeFileSync(skill, "---\nname: demo\n---\n\n- Run `npm test`.\n");
  cli(["observe", "status"]);
  const report = cli(["report", "--latest", "--skill", skill]);
  assert.deepEqual(leaks(report.stdout), []);
  cli(["observe", "off"]);
  assert.ok(!existsSync(authorizationFile(home)), "o off apagou o registro");

  // Nenhuma rede, e só o store, a configuração, o registro da autorização (só a
  // raiz, sem conteúdo; linha "Registro da autorização") e o lock de setup/on/off
  // (pid e nonce; linha "Barreira da configuração") recebem escrita.
  const entries = readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  assert.ok(entries.length > 0, "a sonda registrou a execução");
  assert.deepEqual(entries.filter((e) => e.op === "network"), [], "nenhuma chamada de rede");
  const allowed = [storeDir(root) + path.sep, path.dirname(configFile(home)) + path.sep];
  const homeFiles = [authorizationFile(home), controlLockFile(home)];
  const written = [...new Set(entries.filter((e) => e.op === "closed_written").map((e) => e.file))];
  assert.ok(written.length > 0);
  for (const file of written) assert.ok(homeFiles.includes(file) || allowed.some((dir) => file.startsWith(dir)), `escrita fora do store: ${file}`);
  assert.ok(written.includes(authorizationFile(home)), "o on gravou o registro");
  assert.ok(written.includes(controlLockFile(home)), "setup, on e off tomaram o lock do home");
  assert.ok(!existsSync(controlLockFile(home)), "o lock do home não sobra");
});
