import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parse } from "yaml";
import {
  changedFiles,
  DOCUMENTATION_PATTERNS,
  requiresVerification,
} from "./ci-change-filter.mjs";
import { ciPassed } from "./ci-result.mjs";
const root = path.resolve(import.meta.dirname, "..");

test("governance-C2 filtro de mudanças preserva os caminhos documentais explícitos", () => {
  assert.deepEqual(DOCUMENTATION_PATTERNS, [
    ".checks/**",
    ".tasks/**",
    "docs/**",
    "CLAUDE.md",
    "AGENTS.md",
    "README.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "GROK.md",
    ".github/ISSUE_TEMPLATE/**",
    ".github/pull_request_template.md",
  ]);
  const docs = [
    ".checks/prova.md",
    ".tasks/plano.md",
    "docs/a/b.md",
    "CLAUDE.md",
    "AGENTS.md",
    "README.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "GROK.md",
    ".github/ISSUE_TEMPLATE/bug.yml",
    ".github/pull_request_template.md",
  ];
  assert.equal(requiresVerification(docs), false);
  for (const file of [
    ".github/workflows/ci.yml",
    "scripts/a.mjs",
    "apps/api/a.ts",
    "packages/a.ts",
    "package.json",
    "package-lock.json",
    "compose.yaml",
    "Dockerfile",
    "design-system/mock.html",
    "docs-extra/a.md",
    "AGENTS.md.ts",
  ]) {
    assert.equal(requiresVerification([file]), true, file);
    assert.equal(requiresVerification([...docs, file]), true, file);
  }
  assert.equal(requiresVerification([]), true);
});

test("governance-C2 diff real inclui exclusões, renomes e caminhos com espaços", () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "ci-diff-"));
  const git = (args) =>
    execFileSync("git", args, { cwd: scratch, encoding: "utf8" });
  const put = (file, content) => {
    const target = path.join(scratch, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  };
  try {
    git(["-c", "init.templateDir=", "init", "-q"]);
    git(["config", "core.autocrlf", "false"]);
    git(["config", "core.hooksPath", path.join(scratch, "no-hooks")]);
    git(["config", "user.name", "CI proof"]);
    git(["config", "user.email", "ci@example.invalid"]);
    put("src/code.js", "export const x = 1;\n");
    put("src/deleted.js", "export const y = 2;\n");
    git(["add", "."]);
    git(["commit", "-qm", "base"]);
    const base = git(["rev-parse", "HEAD"]).trim();
    mkdirSync(path.join(scratch, "docs"), { recursive: true });
    git(["mv", "src/code.js", "docs/code.js"]);
    git(["rm", "src/deleted.js"]);
    put("docs/com espaços.md", "Documento.\n");
    for (let index = 0; index < 3100; index++)
      put("docs/item-" + index + ".md", "Documento.\n");
    git(["add", "."]);
    git(["commit", "-qm", "mudanças"]);
    const head = git(["rev-parse", "HEAD"]).trim();
    const files = changedFiles(
      "pull_request",
      { pull_request: { base: { sha: base }, head: { sha: head } } },
      git,
    );
    for (const file of [
      "src/code.js",
      "src/deleted.js",
      "docs/code.js",
      "docs/com espaços.md",
    ])
      assert.ok(
        files.some((entry) => entry.path === file),
        file,
      );
    assert.equal(
      files.filter((entry) => entry.path.startsWith("docs/item-")).length,
      3100,
    );
    assert.equal(requiresVerification(files), true);
    assert.deepEqual(
      changedFiles("push", { before: base, after: head }, git),
      files,
    );
    const eventFile = path.join(scratch, "event.json");
    const outputFile = path.join(scratch, "outputs");
    writeFileSync(eventFile, JSON.stringify({ before: base, after: head }));
    writeFileSync(outputFile, "");
    const cli = spawnSync(
      process.execPath,
      [path.join(root, "scripts/ci-change-filter.mjs")],
      {
        cwd: scratch,
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_EVENT_NAME: "push",
          GITHUB_EVENT_PATH: eventFile,
          GITHUB_OUTPUT: outputFile,
        },
      },
    );
    assert.equal(cli.status, 0, cli.stderr);
    assert.equal(readFileSync(outputFile, "utf8"), "code=true\n");
  } finally {
    assert.equal(path.dirname(scratch), path.resolve(tmpdir()));
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("governance-C2 exclusão e renome apenas documentais exigem validação", () => {
  const event = { before: "a".repeat(40), after: "b".repeat(40) };
  const entries = (raw) => changedFiles("push", event, () => raw);
  assert.equal(requiresVerification(entries("M\0README.md\0")), false);
  assert.equal(requiresVerification(entries("A\0docs/new.md\0")), false);
  assert.equal(requiresVerification(entries("D\0README.md\0")), true);
  assert.equal(
    requiresVerification(entries("D\0.checks/old.md\0A\0.checks/new.md\0")),
    true,
  );
  assert.throws(() => entries("M\0README.md"), /Formato/);
  assert.throws(
    () => entries("R100\0docs/old.md\0docs/new.md\0"),
    /Formato|Operação/,
  );
});

test("governance-C2 eventos manuais e referências inválidas não dispensam verificação", () => {
  assert.equal(
    requiresVerification(changedFiles("workflow_dispatch", {})),
    true,
  );
  assert.equal(
    requiresVerification(
      changedFiles("push", { before: "0".repeat(40), after: "a".repeat(40) }),
    ),
    true,
  );
  assert.throws(
    () => changedFiles("push", { before: "--help", after: "a".repeat(40) }),
    /Referências/,
  );
  assert.throws(() => changedFiles("pull_request", {}), /Referências/);
  assert.throws(() => changedFiles("unknown", {}), /Evento/);
  assert.throws(
    () =>
      changedFiles(
        "push",
        { before: "a".repeat(40), after: "b".repeat(40) },
        () => {
          throw new Error("diff indisponível");
        },
      ),
    /diff indisponível/,
  );
});

test("governance-C4 resultado obrigatório recusa falhas, cancelamento e skip inesperado", () => {
  const accepted = new Set(["success,true,success", "success,false,skipped"]);
  for (const detection of ["success", "failure", "cancelled", "skipped", ""])
    for (const code of ["true", "false", ""])
      for (const verification of [
        "success",
        "failure",
        "cancelled",
        "skipped",
        "",
      ]) {
        const key = [detection, code, verification].join(",");
        assert.equal(
          ciPassed(detection, code, verification),
          accepted.has(key),
          key,
        );
      }
  for (const [detection, code, verification, exit] of [
    ["success", "false", "skipped", 0],
    ["success", "true", "success", 0],
    ["failure", "false", "skipped", 1],
    ["success", "true", "skipped", 1],
    ["success", "true", "failure", 1],
    ["success", "false", "cancelled", 1],
  ]) {
    const result = spawnSync(
      process.execPath,
      [path.join(root, "scripts/ci-result.mjs")],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          DETECTION_RESULT: detection,
          CODE_CHANGED: code,
          VERIFY_RESULT: verification,
        },
      },
    );
    assert.equal(result.status, exit, result.stderr);
    if (code === "false" && exit === 0)
      assert.match(result.stdout, /dispensada intencionalmente/);
  }
});

test("governance-C1 C3 workflow sempre publica CI sem IA nem release", () => {
  const workflow = parse(
    readFileSync(path.join(root, ".github/workflows/governance.yml"), "utf8"),
  );
  assert.deepEqual(Object.keys(workflow.on).sort(), [
    "pull_request",
    "push",
    "workflow_dispatch",
  ]);
  assert.deepEqual(workflow.on.pull_request, { branches: ["main"] });
  assert.deepEqual(workflow.on.push, { branches: ["main"] });
  assert.deepEqual(workflow.permissions, { contents: "read" });
  const detector = workflow.jobs.changes;
  assert.equal(detector.outputs.code, "$" + "{{ steps.filter.outputs.code }}");
  assert.equal(detector.steps[0].with["fetch-depth"], 0);
  assert.equal(detector.steps[0].with["persist-credentials"], false);
  assert.equal(
    detector.steps.find((step) => step.id === "filter").run,
    "node scripts/ci-change-filter.mjs",
  );
  const tools = workflow.jobs.verify;
  assert.equal(tools.needs, "changes");
  assert.equal(tools.if, "needs.changes.outputs.code == 'true'");
  assert.deepEqual(tools.strategy.matrix.os, [
    "ubuntu-22.04",
    "windows-latest",
    "macos-14",
  ]);
  assert.equal(tools["runs-on"], "$" + "{{ matrix.os }}");
  // O ramo de integrações do Windows (governance-C48) é o único passo fora desta lista.
  assert.deepEqual(
    tools.steps
      .filter((step) => step.run && step.if !== "matrix.os == 'windows-latest'")
      .map((step) => step.run),
    [
      "npm ci --ignore-scripts",
      "npm run test:governance",
      "npm run test:code-review",
      "npm run test:doctor",
      "npm run test:integrations",
    ],
  );
  const ci = workflow.jobs.ci;
  assert.equal(ci.name, "CI");
  assert.equal(ci.if, "always()");
  assert.deepEqual(ci.needs, ["changes", "verify"]);
  const result = ci.steps.find((step) => step.run);
  assert.equal(result.run, "node scripts/ci-result.mjs");
  assert.deepEqual(result.env, {
    DETECTION_RESULT: "$" + "{{ needs.changes.result }}",
    CODE_CHANGED: "$" + "{{ needs.changes.outputs.code }}",
    VERIFY_RESULT: "$" + "{{ needs.verify.result }}",
  });
  assert.equal(ci["continue-on-error"], undefined);
  assert.equal(result["continue-on-error"], undefined);
  // `lock_diagnostics`: job manual autorizado pelo AC9 da issue #25, com as
  // restrições conferidas em governance-C49; os regulares continuam estes três.
  assert.deepEqual(Object.keys(workflow.jobs).sort(), [
    "changes",
    "ci",
    "lock_diagnostics",
    "verify",
  ]);
  for (const job of Object.values(workflow.jobs))
    for (const step of job.steps ?? []) {
      if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/);
      if (step.run)
        assert.doesNotMatch(
          step.run,
          /codex|grok|claude|npm publish|deploy|git push/i,
        );
    }
});

test("governance-C49 job manual de diagnóstico do lock: só em workflow_dispatch, Windows, 10 min, leitura, mesmas ações pinadas, fora do agregado e sem tolerar falha", () => {
  const workflow = parse(
    readFileSync(path.join(root, ".github/workflows/governance.yml"), "utf8"),
  );
  const job = workflow.jobs.lock_diagnostics;
  const verify = workflow.jobs.verify;
  assert.deepEqual(Object.keys(job).sort(), [
    "if",
    "name",
    "permissions",
    "runs-on",
    "steps",
    "timeout-minutes",
  ]);
  assert.equal(job.name, "Diagnosticar lock Windows (manual)");
  assert.equal(job.if, "github.event_name == 'workflow_dispatch'");
  assert.equal(job["runs-on"], "windows-latest");
  assert.equal(job["timeout-minutes"], 10);
  assert.deepEqual(job.permissions, { contents: "read" });
  // As mesmas ações do `verify`, nos mesmos hashes; sem cache no setup-node.
  const [checkout, setup, ...commands] = job.steps;
  assert.deepEqual(checkout, {
    uses: verify.steps[0].uses,
    with: { "persist-credentials": false },
  });
  assert.deepEqual(setup, {
    uses: verify.steps[1].uses,
    with: { "node-version": "24.13.0" },
  });
  assert.deepEqual(commands, [
    { run: "npm ci --ignore-scripts" },
    { run: "node scripts/ci-lock-latency.mjs" },
  ]);
  // Nem o agregado nem outro job dependem dele, e nada nele tolera falha.
  assert.deepEqual(workflow.jobs.ci.needs, ["changes", "verify"]);
  for (const other of Object.values(workflow.jobs)) {
    assert.ok(![other.needs].flat().includes("lock_diagnostics"));
    assert.equal(other["continue-on-error"], undefined);
    for (const step of other.steps ?? [])
      assert.equal(step["continue-on-error"], undefined);
  }
  // A ferramenta roda junto das provas de governança da CI regular.
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(
    pkg.scripts["test:governance"],
    "node --test scripts/governance-ci.test.mjs scripts/ci-lock-latency.test.mjs",
  );
  assert.equal(pkg.private, true);
});

test("governance-C48 integrações: um só passo por sistema da matriz, com o mesmo comando; só o do Windows põe TEMP e TMP no RUNNER_TEMP, no próprio passo; orçamentos 20/10/5 e 10 iguais", () => {
  const workflow = parse(
    readFileSync(path.join(root, ".github/workflows/governance.yml"), "utf8"),
  );
  const verify = workflow.jobs.verify;
  const [, , ...commands] = verify.steps;
  const windows = commands.at(-1);
  assert.deepEqual(commands.slice(0, -1), [
    { run: "npm ci --ignore-scripts" },
    { run: "npm run test:governance" },
    { run: "npm run test:code-review" },
    { run: "npm run test:doctor" },
    { if: "matrix.os != 'windows-latest'", run: "npm run test:integrations" },
  ]);
  // Só `if` e `run`: o shell padrão do runner Windows (pwsh), sem `env` nem `shell`.
  assert.deepEqual(Object.keys(windows).sort(), ["if", "run"]);
  assert.equal(windows.if, "matrix.os == 'windows-latest'");
  // Um ramo por sistema. Só as duas formas de `if` do workflow são interpretadas;
  // outra condição falha a prova.
  const runsOn = (step, os) => {
    const condition = /^matrix\.os (==|!=) '([^']+)'$/.exec(step.if);
    assert.ok(condition, `condição não prevista: ${step.if}`);
    return (condition[1] === "==") === (condition[2] === os);
  };
  for (const [os, branches] of [
    ["ubuntu-22.04", [true, false]],
    ["windows-latest", [false, true]],
    ["macos-14", [true, false]],
  ])
    assert.deepEqual(
      commands.slice(-2).map((step) => runsOn(step, os)),
      branches,
      os,
    );
  // O mesmo comando, sem argumento a mais; só RUNNER_TEMP, TEMP e TMP, e nada
  // que sobreviva ao passo.
  assert.deepEqual(
    windows.run
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^npm\b/.test(line)),
    ["npm run test:integrations"],
  );
  assert.deepEqual(
    [
      ...new Set(
        [...windows.run.matchAll(/\$env:(\w+)/gi)].map(([, name]) =>
          name.toUpperCase(),
        ),
      ),
    ].sort(),
    ["RUNNER_TEMP", "TEMP", "TMP"],
  );
  assert.doesNotMatch(
    windows.run,
    /GITHUB_ENV|GITHUB_PATH|SetEnvironmentVariable|setx/i,
  );
  for (const scope of [workflow, verify]) {
    assert.equal(scope.env, undefined);
    assert.equal(scope.defaults, undefined);
  }
  assert.equal(
    verify["timeout-minutes"],
    "$" + "{{ matrix.os == 'windows-latest' && 20 || 10 }}",
  );
  assert.equal(workflow.jobs.changes["timeout-minutes"], 5);
  assert.equal(workflow.jobs.ci["timeout-minutes"], 5);
  assert.equal(workflow.jobs.lock_diagnostics["timeout-minutes"], 10);
});

test(
  "governance-C48 ramo Windows das integrações no pwsh real: com RUNNER_TEMP válido, o npm recebe os mesmos argumentos e TEMP/TMP nele, e o passo sai 0 ou falha com ele; ausente, vazio, relativo, inexistente ou arquivo param antes do npm; nada muda fora do passo",
  {
    skip:
      process.platform !== "win32" &&
      "o ramo roda no pwsh do runner Windows; fora dele, só a estrutura (governance-C48 integrações)",
  },
  (t) => {
    const workflow = parse(
      readFileSync(path.join(root, ".github/workflows/governance.yml"), "utf8"),
    );
    const windows = workflow.jobs.verify.steps.find(
      (step) => step.if === "matrix.os == 'windows-latest'",
    );
    assert.ok(windows, "ramo Windows das integrações");
    // O runner acha o `pwsh` pelo PATH; a prova usa o mesmo, e o npm real fica
    // fora do PATH dado ao pwsh.
    const pwsh = process.env.PATH.split(path.delimiter)
      .map((dir) => path.join(dir, "pwsh.exe"))
      .find((file) => existsSync(file));
    assert.ok(pwsh, "pwsh.exe no PATH: o shell padrão dos passos Windows");
    t.diagnostic(`pwsh: ${pwsh}`);
    const scratch = mkdtempSync(path.join(tmpdir(), "ci-pwsh-"));
    const folder = (name) => {
      const target = path.join(scratch, name);
      mkdirSync(target);
      return target;
    };
    try {
      const bin = folder("bin");
      const runnerTemp = folder("runner-temp");
      const parentTemp = folder("temp-do-pai");
      const parentTmp = folder("tmp-do-pai");
      const sentinel = path.join(runnerTemp, "sentinela.txt");
      writeFileSync(sentinel, "do runner\n");
      const githubEnv = path.join(scratch, "github-env");
      const githubPath = path.join(scratch, "github-path");
      writeFileSync(githubEnv, "");
      writeFileSync(githubPath, "");
      // npm falso: grava o que recebeu e sai com o código pedido.
      const record = path.join(scratch, "npm-recebeu.json");
      const fakeNpm = path.join(scratch, "npm-falso.mjs");
      writeFileSync(
        fakeNpm,
        [
          'import { writeFileSync } from "node:fs";',
          "const { TEMP, TMP, RUNNER_TEMP, SKILL_ME_SENTINELA } = process.env;",
          "writeFileSync(process.env.NPM_FALSO_REGISTRO, JSON.stringify({ argv: process.argv.slice(2), TEMP, TMP, RUNNER_TEMP, SKILL_ME_SENTINELA }));",
          "process.exitCode = Number(process.env.NPM_FALSO_CODIGO);",
        ].join("\n"),
      );
      writeFileSync(
        path.join(bin, "npm.cmd"),
        `@"${process.execPath}" "${fakeNpm}" %*\r\n`,
      );
      const script = path.join(scratch, "passo.ps1");
      // Um caminho Windows válido pode ter aspa simples, inclusive as tipográficas
      // que o PowerShell também lê como aspa; os casos válidos rodam o mesmo `run`
      // também de arquivos assim.
      const quoted = [
        "passo ' literal.ps1",
        "passo \u2018\u2019\u201A\u201B literal.ps1",
      ].map((name) => path.join(scratch, name));
      for (const file of [script, ...quoted]) writeFileSync(file, windows.run);
      const parent = { TEMP: process.env.TEMP, TMP: process.env.TMP };
      const step = (runnerTempValue, npmCode, file = script) => {
        rmSync(record, { force: true });
        const result = spawnSync(
          pwsh,
          // A forma do runner, `pwsh -command ". '{0}'"`, sem perfil. No literal
          // de aspas simples, cada aspa simples que o PowerShell reconhece vai dobrada.
          [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            `. '${file.replace(/['\u2018\u2019\u201A\u201B]/g, "$&$&")}'`,
          ],
          {
            cwd: scratch,
            encoding: "utf8",
            timeout: 60_000,
            env: {
              SystemRoot: process.env.SystemRoot,
              PATH: [bin, path.join(process.env.SystemRoot, "System32")].join(
                path.delimiter,
              ),
              PATHEXT: ".COM;.EXE;.BAT;.CMD",
              // Sem rede: telemetria e checagem de versão do pwsh desligadas.
              POWERSHELL_TELEMETRY_OPTOUT: "1",
              POWERSHELL_UPDATECHECK: "Off",
              TEMP: parentTemp,
              TMP: parentTmp,
              GITHUB_ENV: githubEnv,
              GITHUB_PATH: githubPath,
              SKILL_ME_SENTINELA: "inalterada",
              NPM_FALSO_REGISTRO: record,
              NPM_FALSO_CODIGO: String(npmCode),
              ...(runnerTempValue === undefined
                ? {}
                : { RUNNER_TEMP: runnerTempValue }),
            },
          },
        );
        return {
          status: result.status,
          npm: existsSync(record)
            ? JSON.parse(readFileSync(record, "utf8"))
            : null,
        };
      };
      const received = {
        argv: ["run", "test:integrations"],
        TEMP: runnerTemp,
        TMP: runnerTemp,
        RUNNER_TEMP: runnerTemp,
        SKILL_ME_SENTINELA: "inalterada",
      };
      assert.deepEqual(step(runnerTemp, 0), { status: 0, npm: received });
      // O `-Command` do pwsh sai 1 para todo código do script diferente de 0,
      // como nos outros passos Windows; o npm recebeu o mesmo.
      assert.deepEqual(step(runnerTemp, 17), { status: 1, npm: received });
      for (const [label, value] of [
        ["ausente", undefined],
        ["vazio", ""],
        ["relativo", "runner-temp"],
        ["inexistente", path.join(scratch, "nao-existe")],
        ["arquivo", sentinel],
      ])
        assert.deepEqual(step(value, 0), { status: 1, npm: null }, label);
      for (const file of quoted) {
        assert.deepEqual(
          step(runnerTemp, 0, file),
          { status: 0, npm: received },
          path.basename(file),
        );
        assert.deepEqual(
          step(runnerTemp, 17, file),
          { status: 1, npm: received },
          path.basename(file),
        );
      }
      assert.deepEqual(
        [readFileSync(githubEnv, "utf8"), readFileSync(githubPath, "utf8")],
        ["", ""],
      );
      assert.deepEqual(readdirSync(runnerTemp), ["sentinela.txt"]);
      assert.deepEqual({ TEMP: process.env.TEMP, TMP: process.env.TMP }, parent);
    } finally {
      assert.equal(path.dirname(scratch), path.resolve(tmpdir()));
      rmSync(scratch, { recursive: true, force: true });
    }
  },
);
