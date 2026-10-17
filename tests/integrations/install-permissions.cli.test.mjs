import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, chownSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { pathToFileURL } from "node:url";
import { baseEnv, INTEGRATIONS_CLI, makeScratch } from "./helpers/cli.mjs";

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

// Em nenhum instante observado o temporário concede mais que o original: nenhum
// bit fora do modo original e, se o grupo do temporário for outro, o grupo não
// recebe mais do que "outros" recebiam. No rename, com o conteúdo, modo e grupo
// são os do original.
function assertTempNeverWider(seen, original, label) {
  assert.deepEqual(
    seen.map((o) => o.moment),
    ["created", "before_content", "after_content", "before_rename"],
    `${label}: instantes observados do temporário`,
  );
  for (const o of seen) {
    assert.equal(o.mode & ~original.mode, 0, `${label} ${o.moment}: modo ${octal(o.mode)} amplia o original ${octal(original.mode)}`);
    if (o.gid !== original.gid) {
      assert.equal(((o.mode >> 3) & 0o7) & ~(original.mode & 0o7), 0, `${label} ${o.moment}: outro grupo com acesso além de "outros"`);
    }
  }
  const [created, beforeContent, afterContent, beforeRename] = seen;
  assert.equal(created.size, 0, `${label}: criado vazio`);
  assert.equal(beforeContent.size, 0, `${label}: proteção antes do conteúdo`);
  assert.equal(afterContent.containsCanary, true, `${label}: o temporário contém a configuração`);
  assert.equal(beforeRename.containsCanary, true, label);
  assert.equal(beforeRename.mode, original.mode, `${label}: modo do original antes do rename`);
  assert.equal(beforeRename.gid, original.gid, `${label}: grupo do original antes do rename`);
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
    // handle): o arquivo fica com outro grupo, que não recebe mais do que
    // "outros" recebiam (nada, em 0640) — 0600 —, em nenhum instante.
    const target = scratch("perm-chown-eperm");
    const file = path.join(target, CONFIG.claude.file);
    writeFileSync(file, CONFIG.claude.text);
    chownSync(file, process.geteuid(), supplementary);
    chmodSync(file, 0o640);
    const log = path.join(scratch("probe-chown-eperm"), "probe.jsonl");
    writeFileSync(log, "");
    const run = runUnderProbe(["install", "--agent", "claude", "--target", target, "--apply"], log, { failChown: true });
    assert.equal(run.status, 0, JSON.stringify(run.report));
    const seen = observations(log, "settings.json.skill-me-tmp");
    assert.deepEqual(seen.map((o) => o.moment), ["created", "before_content", "after_content", "before_rename"]);
    for (const o of seen) {
      assert.notEqual(o.gid, supplementary, `${o.moment}: grupo original não atribuído`);
      assert.equal(o.mode & ~0o600, 0, `${o.moment}: modo ${octal(o.mode)} com grupo/outros acima do que "outros" tinham`);
    }
    assert.equal(seen[2].containsCanary, true);
    assert.equal(statSync(file).mode & 0o7777, 0o600, "modo final sem os bits do grupo original");
    assert.notEqual(statSync(file).gid, supplementary);
  },
);
