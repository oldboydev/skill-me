import { mkdir } from "node:fs/promises";
import path from "node:path";
import { claudeHome, codexHome, hermesHome } from "../../doctor/config-sources.mjs";
import { renderText } from "../install/render.mjs";
import { runIntegrationCommand } from "../install/run.mjs";
import { runObserveCommand } from "../observe/command.mjs";
import { readObserveConfig } from "../observe/config.mjs";
import { envValue } from "./agent.mjs";
import { exitFor } from "./exit-codes.mjs";

// Primeiro uso conduzido por `skill-me <agente>` (issue #25, crit. 8–14; linha
// "Primeiro uso" do Landing em .checks/issue-25-agent-launch.md). Nada aqui
// grava por conta própria além da pasta das capturas: a raiz vai pelo
// `observe setup` da #23 e a integração pelo `install --apply` existente, os
// dois em processo e só depois da confirmação.

const HOMES = { claude: claudeHome, codex: codexHome, hermes: hermesHome };
const CONFIRMATIONS = new Set(["s", "sim"]);

// Diretório de configuração de usuário do agente, como o doctor o resolve
// (CLAUDE_CONFIG_DIR, CODEX_HOME, HERMES_HOME e o home do SO).
export function agentTarget(agent, env, platform) {
  const view = {};
  for (const name of ["CLAUDE_CONFIG_DIR", "CODEX_HOME", "HERMES_HOME", "HOME", "USERPROFILE", "LOCALAPPDATA"]) {
    const value = envValue(env, name, platform);
    if (value !== undefined) view[name] = value;
  }
  return HOMES[agent]({ env: view, platform });
}

// Pasta proposta para as capturas (as sugeridas pelo README).
export function defaultRoot(env, platform, home) {
  if (platform === "win32") {
    const local = envValue(env, "LOCALAPPDATA", platform)?.trim();
    return path.win32.join(local || path.win32.join(home, "AppData", "Local"), "skill-me", "capturas");
  }
  return path.posix.join(home, ".local", "share", "skill-me", "capturas");
}

function previewLines({ agent, target, config, plan, proposed }) {
  const lines = [`skill-me: primeiro uso de ${agent}; nada foi alterado ainda.`];
  if (config === null) lines.push(`skill-me: pasta proposta para as capturas: ${proposed}`);
  if (plan.changes.length > 0) {
    lines.push(`skill-me: mudanças em ${target}:`);
    for (const change of plan.changes) lines.push(`  ${change.action} ${change.file}${change.event ? ` ${change.event}` : ""}`);
  } else {
    lines.push(`skill-me: integração já instalada em ${target}.`);
  }
  lines.push(
    `skill-me: cada execução de skill-me ${agent} grava localmente, depois da sanitização, os argumentos e resultados suportados, em capturas sucessivas de até 500 eventos ou 8 MiB, mantidas por 7 dias depois de encerradas.`,
  );
  return lines;
}

// { config, manualSteps } quando o agente pode iniciar; senão { exitCode },
// com o motivo já escrito no stderr. `terminal`: stdin e stderr são
// terminais; `readLine()` devolve, ou promete, a próxima linha digitada sem o
// fim de linha, ou null no EOF.
export async function prepareLaunch({ agent, env, platform, home, io, terminal, readLine, writeErr }) {
  const say = (line) => writeErr(line + "\n");
  const read = await readObserveConfig({ home, io });
  if (read.state === "invalid") {
    say(`skill-me: configuração inválida [${read.code}]`);
    return { exitCode: exitFor(read.code) };
  }
  const config = read.state === "ok" ? read.config : null;
  const target = agentTarget(agent, env, platform) ?? "";
  const plan = await runIntegrationCommand({ command: "plan", agent, target, platform });
  if (plan.exitCode !== 0) {
    writeErr(renderText(plan));
    say(`skill-me: a integração de ${agent} não pode ser preparada [${plan.status}]`);
    return { exitCode: plan.exitCode };
  }
  if (config !== null && plan.changes.length === 0) return { config, manualSteps: plan.manualSteps };

  if (!terminal) {
    say(`skill-me: preparação pendente [setup_required]; rode skill-me ${agent} num terminal para revisar e confirmar.`);
    return { exitCode: 3 };
  }
  const proposed = defaultRoot(env, platform, home);
  for (const line of previewLines({ agent, target, config, plan, proposed })) say(line);
  let root = null;
  if (config === null) {
    writeErr("Pasta das capturas (Enter aceita a proposta; ou digite outro caminho absoluto): ");
    const answer = await readLine();
    if (answer === null) return declined(say);
    root = answer === "" ? proposed : answer;
    if (!path.isAbsolute(root)) {
      say("skill-me: caminho não absoluto [root_not_absolute]; nada foi criado.");
      return { exitCode: 2 };
    }
  }
  writeErr("Confirmar? [s/N]: ");
  const confirmation = await readLine();
  if (confirmation === null || !CONFIRMATIONS.has(confirmation.trim().toLowerCase())) return declined(say);

  if (root !== null) {
    // A validação da raiz é a do `observe setup`: uma pasta que não pôde ser
    // criada aparece lá como root_not_found ou root_not_directory.
    await mkdir(root, { recursive: true, mode: 0o700 }).catch(() => {});
    const setup = await runObserveCommand({ argv: ["setup", "--root", root], home, io });
    if (setup.exitCode !== 0) {
      say(`skill-me: não foi possível gravar a raiz [${setup.body.error.code}]`);
      return { exitCode: setup.exitCode };
    }
  }
  let manualSteps = plan.manualSteps;
  if (plan.changes.length > 0) {
    const install = await runIntegrationCommand({ command: "install", agent, target, apply: true, platform });
    if (install.exitCode !== 0) {
      writeErr(renderText(install));
      say(`skill-me: a instalação da integração de ${agent} falhou [${install.status}]`);
      return { exitCode: install.exitCode };
    }
    manualSteps = install.manualSteps;
  }
  say("skill-me: passo manual de confiança:");
  for (const step of manualSteps) say(`  - ${step}`);
  const after = await readObserveConfig({ home, io });
  if (after.state !== "ok") {
    const code = after.state === "invalid" ? after.code : "not_configured";
    say(`skill-me: configuração inválida [${code}]`);
    return { exitCode: exitFor(code) };
  }
  return { config: after.config, manualSteps };
}

function declined(say) {
  say("skill-me: preparação recusada [setup_declined]; nada foi alterado.");
  return { exitCode: 3 };
}
