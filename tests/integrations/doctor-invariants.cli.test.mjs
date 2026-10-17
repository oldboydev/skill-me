import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { runDoctor, runDoctorJson } from "../doctor/helpers/spawn-doctor.mjs";
import { baseEnv, makeScratch, runIntegrationsJson } from "./helpers/cli.mjs";

const scratches = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

test("I4-C45 doctor continua estático com integrações instaladas e sem interface nova", () => {
  const home = makeScratch("doctor-home");
  scratches.push(home);
  const project = path.join(home, "projeto");
  mkdirSync(project);
  for (const [agent, dir] of [["claude", ".claude"], ["codex", ".codex"]]) {
    mkdirSync(path.join(home, dir));
    assert.equal(runIntegrationsJson(["install", "--agent", agent, "--target", path.join(home, dir), "--apply"], { env: baseEnv() }).status, 0);
  }
  const { status, report } = runDoctorJson(["--cwd", project], { env: { HOME: home, USERPROFILE: home } });
  assert.equal(status, 0);
  const claude = report.agents.find((agent) => agent.id === "claude");
  // A configuração instalada é vista como evidência estática…
  assert.equal(claude.configuration, "configured");
  // …e nenhuma linha passa a afirmar execução real.
  const rows = report.agents.flatMap((agent) => agent.capabilities);
  assert.ok(rows.length > 0);
  for (const row of rows) assert.equal(row.runtimeVerification, "not_performed", `${row.mechanism}/${row.surface}`);
  assert.ok(!JSON.stringify(report).includes("skill-me-observer"));

  const help = runDoctor(["--help"]);
  assert.equal(help.status, 0);
  assert.ok(!/integrations|install|uninstall|run --agent/.test(help.stdout));
  for (const args of [["install"], ["integrations", "plan"], ["--apply"]]) assert.equal(runDoctor(args).status, 2, args.join(" "));
});
