import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, chownSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { pathToFileURL } from "node:url";
import { baseEnv, INTEGRATIONS_CLI, makeScratch } from "./helpers/cli.mjs";
import { widenedRecipients } from "./helpers/posix-access.mjs";

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
  { skip: process.platform === "win32" ? "posix-modes: no Windows o acesso é decidido por ACL; modo e grupo POSIX não se aplicam (limite declarado)" : false },
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
