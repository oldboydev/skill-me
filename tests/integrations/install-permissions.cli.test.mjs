import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, chownSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { pathToFileURL } from "node:url";
import { baseEnv, INTEGRATIONS_CLI, makeScratch, runIntegrationsJson } from "./helpers/cli.mjs";
import { readClaudeHandlers, readCodexHandlers } from "./helpers/installed-hooks.mjs";
import { widenedRecipients } from "./helpers/posix-access.mjs";
import { grantsOf, readAces, setDacl, widenedSids } from "./helpers/windows-acl.mjs";

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});
function scratch(label) {
  const dir = makeScratch(label);
  scratches.push(dir);
  return dir;
}

const PROBE = pathToFileURL(path.join(import.meta.dirname, "helpers", "fs-probe.mjs")).href;
// Valor sintético no lugar de um segredo: o instrumento só informa se ele está
// no temporário, nunca o conteúdo.
const CANARY = "sintetico-f2-canario-nao-e-segredo";
const CONFIG = {
  claude: {
    file: "settings.json",
    text: JSON.stringify({ env: { API_TOKEN: CANARY }, permissions: { allow: ["Bash(npm test)"] } }, null, 2) + "\n",
  },
  codex: {
    file: "hooks.json",
    text:
      JSON.stringify({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: `notify --token ${CANARY}`, timeout: 30 }] }] } }, null, 2) +
      "\n",
  },
};
const octal = (mode) => `0${mode.toString(8)}`;

// CLI real sob `umask 022`, com o instrumento de teste pré-carregado.
function runUnderProbe(args, log, { failChown = false } = {}) {
  const probeEnv = { SKILL_ME_TEST_FS_PROBE_LOG: log, SKILL_ME_TEST_FS_PROBE_CANARY: CANARY, ...(failChown ? { SKILL_ME_TEST_FS_PROBE_FAIL_CHOWN: "1" } : {}) };
  const result = spawnSync("/bin/sh", ["-c", 'umask 022 && exec "$@"', "sh", process.execPath, `--import=${PROBE}`, INTEGRATIONS_CLI, ...args, "--json"], {
    encoding: "utf8",
    env: baseEnv(probeEnv),
    timeout: 30_000,
  });
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (cause) {
    throw new Error(`stdout não é um JSON único: ${JSON.stringify(result.stdout)} stderr=${JSON.stringify(result.stderr)}`, { cause });
  }
  return { status: result.status, report };
}

function observations(log, tempName) {
  return readFileSync(log, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((entry) => entry.file === tempName);
}

// Em nenhum instante observado o temporário concede a algum destinatário mais
// do que o original concedia (modelo POSIX em helpers/posix-access.mjs, que
// confere cada classe também quando o grupo do temporário é outro).
function assertTempNeverWider(seen, original, label, { preserved = true } = {}) {
  assert.deepEqual(
    seen.map((o) => o.moment),
    ["created", "before_content", "after_content", "before_rename"],
    `${label}: instantes observados do temporário`,
  );
  for (const o of seen) {
    assert.deepEqual(widenedRecipients(original, o), [], `${label} ${o.moment}: ${octal(o.mode)} gid ${o.gid === original.gid ? "igual" : "outro"} sobre ${octal(original.mode)}`);
  }
  const [created, beforeContent, afterContent, beforeRename] = seen;
  assert.equal(created.size, 0, `${label}: criado vazio`);
  assert.equal(beforeContent.size, 0, `${label}: proteção antes do conteúdo`);
  assert.equal(afterContent.containsCanary, true, `${label}: o temporário contém a configuração`);
  assert.equal(beforeRename.containsCanary, true, label);
  if (preserved) {
    // Grupo atribuível: no rename, com o conteúdo, modo e grupo são os do original.
    assert.equal(beforeRename.mode, original.mode, `${label}: modo do original antes do rename`);
    assert.equal(beforeRename.gid, original.gid, `${label}: grupo do original antes do rename`);
  }
}

function assertFinal(file, original, label) {
  const stats = statSync(file);
  assert.equal(stats.mode & 0o7777, original.mode, `${label}: modo final ${octal(stats.mode & 0o7777)}, original ${octal(original.mode)}`);
  assert.equal(stats.gid, original.gid, `${label}: grupo final`);
}

// Instala e remove sobre um arquivo com o modo/grupo indicados; o temporário é
// observado nas duas reescritas e o arquivo final mantém modo e grupo.
function installAndRemove(agent, mode, label, gid) {
  const target = scratch(`perm-${agent}-${octal(mode)}`);
  const file = path.join(target, CONFIG[agent].file);
  writeFileSync(file, CONFIG[agent].text);
  if (gid !== undefined) chownSync(file, process.geteuid(), gid);
  chmodSync(file, mode);
  const original = { mode, gid: statSync(file).gid };
  for (const command of ["install", "uninstall"]) {
    const log = path.join(scratch(`probe-${agent}-${command}`), "probe.jsonl");
    writeFileSync(log, "");
    const run = runUnderProbe([command, "--agent", agent, "--target", target, "--apply"], log);
    assert.equal(run.status, 0, `${label} ${command}: ${JSON.stringify(run.report)}`);
    assert.equal(run.report.status, "applied", `${label} ${command}`);
    assertTempNeverWider(observations(log, `${CONFIG[agent].file}.skill-me-tmp`), original, `${label} ${command}`);
    assertFinal(file, original, `${label} ${command}`);
  }
  assert.equal(readFileSync(file, "utf8"), CONFIG[agent].text, `${label}: remoção restaura o conteúdo`);
}

test(
  "I4-C25b POSIX: instalar e remover preservam modo e grupo restritos; o temporário nunca amplia o acesso",
  { skip: process.platform === "win32" ? "posix-modes: no Windows o acesso é decidido pela DACL, provada em I4-C25g; modo e grupo POSIX não se aplicam" : false },
  (t) => {
    for (const [agent, mode] of [
      ["claude", 0o600],
      ["claude", 0o640],
      ["claude", 0o660],
      ["codex", 0o600],
      ["codex", 0o640],
    ]) {
      installAndRemove(agent, mode, `${agent} ${octal(mode)}`);
    }
    // Arquivo com grupo suplementar do usuário (compartilhado com o grupo): o
    // grupo e o modo continuam os do original.
    const supplementary = process.getgroups().find((gid) => gid !== process.getegid());
    if (supplementary === undefined) {
      t.diagnostic("subcasos de grupo suplementar não executados: o usuário do teste não tem grupo suplementar");
      return;
    }
    installAndRemove("claude", 0o640, "claude 0640 grupo suplementar", supplementary);

    // O grupo original não pode ser atribuído (EPERM injetado no `chown` do
    // handle): o arquivo fica com outro grupo e nenhum destinatário ganha
    // acesso em nenhum instante. Em 0604 os membros do grupo antigo não liam e
    // passam à classe "outros" (contraexemplo do coordenador); em 0640 o grupo
    // novo não pode receber a leitura do antigo. Nos dois, o resultado é 0600.
    for (const mode of [0o640, 0o604]) {
      const label = `claude ${octal(mode)} grupo não atribuível`;
      const target = scratch(`perm-chown-eperm-${octal(mode)}`);
      const file = path.join(target, CONFIG.claude.file);
      writeFileSync(file, CONFIG.claude.text);
      chownSync(file, process.geteuid(), supplementary);
      chmodSync(file, mode);
      const original = { mode, gid: supplementary };
      const log = path.join(scratch("probe-chown-eperm"), "probe.jsonl");
      writeFileSync(log, "");
      const run = runUnderProbe(["install", "--agent", "claude", "--target", target, "--apply"], log, { failChown: true });
      assert.equal(run.status, 0, `${label}: ${JSON.stringify(run.report)}`);
      const seen = observations(log, "settings.json.skill-me-tmp");
      assertTempNeverWider(seen, original, label, { preserved: false });
      for (const o of seen) assert.notEqual(o.gid, supplementary, `${label} ${o.moment}: grupo original não atribuído`);
      const final = statSync(file);
      assert.notEqual(final.gid, supplementary, label);
      assert.deepEqual(widenedRecipients(original, { mode: final.mode & 0o7777, gid: final.gid }), [], `${label}: arquivo final`);
      assert.equal(final.mode & 0o7777, 0o600, `${label}: modo final`);
    }
  },
);

// Windows: configuração com DACL protegida mais restritiva que a pasta —
// achado P1 da revisão formal round 4 (`io.mjs:71`). A pasta do alvo é fixture
// sintética com DACL protegida: controle total ao usuário do teste e leitura
// herdável por arquivos a "Usuários" (SID conhecido) — um arquivo criado nela
// recebe essa leitura, conferido como controle da fixture. A configuração tem
// o canário sintético no lugar de um segredo e DACL protegida só com o usuário
// do teste. Instalar, instalar de novo e remover (Claude e Codex) não concedem
// a nenhum SID mais do que a configuração concedia: nem o temporário em nenhum
// instante observado — o instrumento registra a DACL dele em cada instante,
// com o conteúdo antes do rename —, nem o arquivo final. Controles:
// configuração que herda da pasta (as entradas herdadas viram explícitas, com
// o mesmo acesso), configuração ausente (criada do zero só com conteúdo
// próprio, com a ACL herdada) e PowerShell do Windows indisponível — recusa
// com 5 antes de qualquer conteúdo, na instalação e numa remoção que
// reescreveria o arquivo.
const WINDOWS_HOME_DACL = "D:P(A;OICI;FA;;;{usuario})(A;OI;FR;;;BU)";
const OWNER_ONLY_DACL = "D:P(A;;FA;;;{usuario})";
const OWNER_FULL = { "usuário do teste": "controle total" };
const HOME_GRANTS = { Usuários: "leitura", "usuário do teste": "controle total" };
const DONE_STEPS = [
  { step: "config", state: "done" },
  { step: "manifest", state: "done" },
];

function runWindowsUnderProbe(args, log, { noPowerShell = false } = {}) {
  const env = baseEnv({ SKILL_ME_TEST_FS_PROBE_LOG: log, SKILL_ME_TEST_FS_PROBE_CANARY: CANARY, ...(noPowerShell ? { SKILL_ME_TEST_FS_PROBE_NO_POWERSHELL: "1" } : {}) });
  const run = runIntegrationsJson(args, { env, nodeArgs: [`--import=${PROBE}`], timeout: 120_000 });
  return { status: run.status, report: run.report };
}

// Temporário da configuração nos instantes observados: quais instantes, quem
// ganhou acesso sobre a configuração lida (sem original não há o que comparar)
// e se o canário — o conteúdo preexistente — esteve nele.
function tempSeen(seen, original) {
  return {
    instantes: [...new Set(seen.map((o) => o.moment))],
    ampliados: original === null ? "sem conteúdo preexistente" : [...new Set(seen.flatMap((o) => widenedSids(original, o.dacl)))].sort(),
    canário: seen.some((o) => o.containsCanary),
  };
}

function configState(agent, home) {
  const file = path.join(home, CONFIG[agent].file);
  if (!existsSync(file)) return "ausente";
  const text = readFileSync(file, "utf8");
  if (text === CONFIG[agent].text) return "configuração lida";
  const events = Object.keys(agent === "claude" ? readClaudeHandlers(home) : readCodexHandlers(home)).length;
  return `${events} eventos próprios${text.includes(CANARY) ? " + valores alheios com o canário" : ""}`;
}

test(
  "I4-C25g Windows: instalar e remover preservam a DACL protegida da configuração; o temporário nunca concede acesso a outro SID",
  { skip: process.platform !== "win32" ? "windows-dacl: DACL do Windows; no POSIX o acesso é provado por I4-C25b" : false },
  () => {
    const observed = [];
    const expected = [];
    let logs = 0;
    const fixture = (agent, label, configDacl) => {
      const dir = scratch(`dacl ${agent} ${label}`);
      const home = path.join(dir, "perfil", agent === "claude" ? ".claude" : ".codex");
      mkdirSync(home, { recursive: true });
      setDacl(home, WINDOWS_HOME_DACL);
      const control = path.join(home, "arquivo novo da pasta.json");
      writeFileSync(control, "{}\n");
      observed.push({ caso: `${agent} ${label}: fixture — arquivo novo herda da pasta`, dacl: grantsOf(readAces(control)) });
      expected.push({ caso: `${agent} ${label}: fixture — arquivo novo herda da pasta`, dacl: { protegida: false, acessos: HOME_GRANTS, herdadas: 2 } });
      rmSync(control);
      const file = path.join(home, CONFIG[agent].file);
      if (configDacl !== null) writeFileSync(file, CONFIG[agent].text);
      if (configDacl !== null && configDacl !== "herdada") setDacl(file, configDacl);
      return { dir, home, agent, label, original: configDacl === null ? null : readAces(file) };
    };
    // Executa um comando com o instrumento e registra o observado ao lado do esperado.
    const step = (target, command, want, { noPowerShell = false } = {}) => {
      const { dir, home, agent, label, original } = target;
      const caso = `${agent} ${label}: ${command}${noPowerShell ? " sem PowerShell do Windows" : ""}`;
      const log = path.join(dir, `probe ${++logs}.jsonl`);
      writeFileSync(log, "");
      const run = runWindowsUnderProbe([command, "--agent", agent, "--target", home, "--apply"], log, { noPowerShell });
      const file = path.join(home, CONFIG[agent].file);
      const final = existsSync(file) ? readAces(file) : null;
      observed.push({
        caso,
        exit: run.status,
        status: run.report.status,
        errors: run.report.errors,
        steps: run.report.steps,
        temporário: tempSeen(observations(log, `${CONFIG[agent].file}.skill-me-tmp`), original),
        final: final === null ? "ausente" : grantsOf(final),
        ampliadosNoFinal: final === null || original === null ? "sem comparação" : widenedSids(original, final),
        configuração: configState(agent, home),
        registro: existsSync(path.join(home, ".skill-me", `${agent}-install.json`)),
        lockLiberado: !existsSync(path.join(home, ".skill-me", `${agent}.lock`)),
        temporárioDeixado: readdirSync(home).filter((name) => name.endsWith(".skill-me-tmp")),
      });
      expected.push({ caso, errors: [], ampliadosNoFinal: [], lockLiberado: true, temporárioDeixado: [], ...want });
    };
    const written = (canário = true) => ({ instantes: ["before_rename"], ampliados: [], canário });
    const untouched = { instantes: [], ampliados: [], canário: false };
    const protectedFinal = { protegida: true, acessos: OWNER_FULL, herdadas: 0 };

    // DACL protegida só com o usuário do teste: instalar, instalar de novo, remover.
    for (const agent of ["claude", "codex"]) {
      const installed = `${agent === "claude" ? 8 : 6} eventos próprios + valores alheios com o canário`;
      const target = fixture(agent, "protegida", OWNER_ONLY_DACL);
      step(target, "install", { exit: 0, status: "applied", steps: DONE_STEPS, temporário: written(), final: protectedFinal, configuração: installed, registro: true });
      step(target, "install", { exit: 0, status: "unchanged", steps: [], temporário: untouched, final: protectedFinal, configuração: installed, registro: true });
      step(target, "uninstall", { exit: 0, status: "applied", steps: DONE_STEPS, temporário: written(), final: protectedFinal, configuração: "configuração lida", registro: false });
    }

    // Controle: configuração que herda da pasta — o mesmo acesso, com as
    // entradas herdadas tornadas explícitas numa DACL protegida.
    {
      const target = fixture("claude", "herdada", "herdada");
      const explicitFinal = { protegida: true, acessos: HOME_GRANTS, herdadas: 0 };
      step(target, "install", { exit: 0, status: "applied", steps: DONE_STEPS, temporário: written(), final: explicitFinal, configuração: "8 eventos próprios + valores alheios com o canário", registro: true });
      step(target, "uninstall", { exit: 0, status: "applied", steps: DONE_STEPS, temporário: written(), final: explicitFinal, configuração: "configuração lida", registro: false });
    }

    // Controle: configuração ausente — criada do zero só com conteúdo próprio
    // (nada preexistente a proteger), com a ACL herdada; a remoção a apaga.
    {
      const target = fixture("claude", "ausente", null);
      const fresh = { instantes: ["created", "before_content", "after_content", "before_rename"], ampliados: "sem conteúdo preexistente", canário: false };
      step(target, "install", {
        exit: 0,
        status: "applied",
        steps: DONE_STEPS,
        temporário: fresh,
        final: { protegida: false, acessos: HOME_GRANTS, herdadas: 2 },
        ampliadosNoFinal: "sem comparação",
        configuração: "8 eventos próprios",
        registro: true,
      });
      step(target, "uninstall", {
        exit: 0,
        status: "applied",
        steps: DONE_STEPS,
        temporário: { ...untouched, ampliados: "sem conteúdo preexistente" },
        final: "ausente",
        ampliadosNoFinal: "sem comparação",
        configuração: "ausente",
        registro: false,
      });
    }

    // PowerShell do Windows indisponível: nada é gravado — a configuração fica
    // com bytes e DACL, sem temporário, o registro como estava e o lock liberado.
    {
      const refused = { exit: 5, status: "incomplete", errors: [{ code: "config_access_unavailable" }], steps: [{ step: "config", state: "failed" }], temporário: untouched, final: protectedFinal };
      step(fixture("claude", "sem powershell", OWNER_ONLY_DACL), "install", { ...refused, configuração: "configuração lida", registro: false }, { noPowerShell: true });
      const codex = fixture("codex", "sem powershell", OWNER_ONLY_DACL);
      const installed = "6 eventos próprios + valores alheios com o canário";
      step(codex, "install", { exit: 0, status: "applied", steps: DONE_STEPS, temporário: written(), final: protectedFinal, configuração: installed, registro: true });
      step(codex, "uninstall", { ...refused, configuração: installed, registro: true }, { noPowerShell: true });
    }

    assert.deepEqual(observed, expected);
  },
);
