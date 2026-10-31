import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, relative } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  review,
  check,
  createPr,
  validateReport,
  parseArgs,
  codexInvocation,
  codexEnvironment,
  runProcess,
  authenticateChatGPT,
  extractIssueCriteria,
  readRemoteRefs,
} from "./review.mjs";

const issue = {
  number: 7,
  title: "Entrega",
  body: "## Critérios de aceite\n- Valor deve ser 2.",
  url: "https://github.com/example/project/issues/7",
  comments: [],
};
function ready(meta) {
  return {
    status: "ready",
    base: meta.base,
    head: meta.head,
    contextHash: meta.contextHash,
    summary: "Critério atendido.",
    verification: "sufficient",
    criteria: meta.acceptanceCriteria.map((c) => ({
      criterionId: c.id,
      criterion: c.text,
      status: "met",
      evidence: "value.txt e verificação",
    })),
    findings: [],
    limitations: [],
  };
}
function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), "code-review-test-"));
  t.after(() => {
    const target = resolve(cwd);
    const within = relative(resolve(tmpdir()), target);
    assert.ok(
      within.startsWith("code-review-test-") &&
        !within.includes("..") &&
        !within.includes("/") &&
        !within.includes("\\"),
    );
    rmSync(target, { recursive: true, force: true });
  });
  const git = (...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const put = (path, text) => {
    mkdirSync(join(cwd, path, ".."), { recursive: true });
    writeFileSync(join(cwd, path), text);
  };
  git("init", "-b", "main");
  git("config", "user.email", "test@example.invalid");
  git("config", "user.name", "Test");
  git("remote", "add", "origin", "https://github.com/example/project.git");
  put(".gitignore", ".checks/code-review/\n");
  put("AGENTS.md", "# Regras\nNão altere código na revisão.");
  put("CLAUDE.md", "@AGENTS.md");
  put(
    "code-review.config.json",
    JSON.stringify({
      version: 1,
      base: "origin/main",
      profiles: {
        light: { maxRounds: 2, requireEvidence: true },
        direct: { maxRounds: 2, requireEvidence: false },
      },
    }),
  );
  put(".tasks/issue-7-example.md", "profile: light\nValor 2.");
  put(".checks/issue-7-example.verified.md", "PASS: valor 2 conferido.");
  put("value.txt", "1");
  git("add", ".");
  git("commit", "-m", "base");
  git("update-ref", "refs/remotes/origin/main", git("rev-parse", "HEAD"));
  git("switch", "-c", "feature");
  put("value.txt", "2");
  git("add", ".");
  git("commit", "-m", "entrega");
  const options = { issue: 7, profile: "light" };
  const calls = [];
  const locations = [];
  const deps = {
    fetch: () => {},
    issue: () => issue,
    authenticate: () => {},
    execute: async ({ cwd: location, snapshot, prompt }) => {
      calls.push(prompt);
      locations.push(location);
      assert.equal(
        execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: location,
          encoding: "utf8",
        }).trim(),
        snapshot.head,
      );
      assert.equal(readFileSync(join(location, "value.txt"), "utf8"), "2");
      return ready(snapshot);
    },
    remoteHead: () => git("rev-parse", "HEAD"),
    remoteRefs: () => ({
      head: git("rev-parse", "HEAD"),
      base: git("rev-parse", "origin/main"),
    }),
    publish: ({ args }) => {
      calls.push(args);
      return "https://github.com/example/project/pull/1";
    },
  };
  return { cwd, git, put, options, deps, calls, locations };
}

function leftoverWarning(checkout) {
  return `Aviso: a pasta temporária da revisão não foi removida: ${checkout} (EPERM cleanup). Apague-a à mão; o resultado da revisão não muda.`;
}

test("C10 falha de limpeza devolve o relatório ready, libera lock e preserva aprovação e contador", async (t) => {
  const f = fixture(t);
  const warnings = [];
  let checkout;
  const deps = {
    ...f.deps,
    cleanup: (_cwd, location) => {
      checkout = location;
      throw Object.assign(new Error("EPERM cleanup"), { code: "EPERM" });
    },
    warn: (message) => warnings.push(message),
  };
  try {
    const report = await review(f.cwd, f.options, deps);
    assert.equal(report.status, "ready");
    assert.equal(
      existsSync(join(f.cwd, ".git/code-review/issue-7.lock")),
      false,
    );
    assert.equal(checkout, f.locations[0]);
    assert.deepEqual(warnings, [leftoverWarning(checkout)]);
    const checked = await check(f.cwd, f.options, f.deps);
    assert.deepEqual(checked.report, report);
    assert.deepEqual(await review(f.cwd, f.options, deps), report);
    assert.equal(f.calls.length, 1);
    const state = JSON.parse(
      readFileSync(join(f.cwd, ".git/code-review/issue-7.state.json"), "utf8"),
    );
    assert.equal(state.attempts.length, 1);
    assert.equal(warnings.length, 1);
  } finally {
    if (checkout) f.git("worktree", "remove", "--force", checkout);
  }
});

test("C10 falha de limpeza devolve o relatório changes_requested e avisa a pasta no stderr", async (t) => {
  const f = fixture(t);
  const stderr = t.mock.method(process.stderr, "write", () => true);
  let checkout;
  try {
    const report = await review(f.cwd, f.options, {
      ...f.deps,
      execute: async ({ snapshot }) => ({
        ...ready(snapshot),
        status: "changes_requested",
      }),
      cleanup: (_cwd, location) => {
        checkout = location;
        throw new Error("EPERM cleanup");
      },
    });
    assert.equal(report.status, "changes_requested");
    const state = JSON.parse(
      readFileSync(join(f.cwd, ".git/code-review/issue-7.state.json"), "utf8"),
    );
    assert.deepEqual(report, state.attempts[0].report);
    assert.deepEqual(
      stderr.mock.calls.map((call) => call.arguments[0]),
      [`${leftoverWarning(checkout)}\n`],
    );
    assert.equal(
      existsSync(join(f.cwd, ".git/code-review/issue-7.lock")),
      false,
    );
  } finally {
    if (checkout) f.git("worktree", "remove", "--force", checkout);
  }
});

test("C10 falha de limpeza que não deixa a pasta devolve o relatório e não avisa", async (t) => {
  const f = fixture(t);
  const warnings = [];
  const report = await review(f.cwd, f.options, {
    ...f.deps,
    cleanup: (_cwd, location) => {
      f.git("worktree", "remove", "--force", location);
      throw new Error("Command failed: git worktree remove");
    },
    warn: (message) => warnings.push(message),
  });
  assert.equal(report.status, "ready");
  assert.equal(existsSync(f.locations[0]), false);
  assert.deepEqual(warnings, []);
  assert.equal(existsSync(join(f.cwd, ".git/code-review/issue-7.lock")), false);
});

test("C10 revisão falha seguida de falha de limpeza mostra o erro da revisão e libera lock", async (t) => {
  const f = fixture(t);
  const warnings = [];
  let checkout;
  try {
    await assert.rejects(
      review(f.cwd, f.options, {
        ...f.deps,
        execute: async () => {
          throw new Error("falha de revisão");
        },
        cleanup: (_cwd, location) => {
          checkout = location;
          throw new Error("EPERM cleanup");
        },
        warn: (message) => warnings.push(message),
      }),
      { message: "falha de revisão" },
    );
    assert.equal(
      existsSync(join(f.cwd, ".git/code-review/issue-7.lock")),
      false,
    );
    assert.deepEqual(warnings, [leftoverWarning(checkout)]);
    await assert.rejects(check(f.cwd, f.options, f.deps), {
      message: "Revisão sem relatório concluído.",
    });
    const state = JSON.parse(
      readFileSync(join(f.cwd, ".git/code-review/issue-7.state.json"), "utf8"),
    );
    assert.equal(state.attempts.length, 1);
    assert.equal(state.attempts[0].report, null);
  } finally {
    if (checkout) f.git("worktree", "remove", "--force", checkout);
  }
});

// O cli.mjs chama review() sem dependências, então não há por onde injetar nada nele.
// Para rodá-lo de verdade num processo, um gancho de resolução registrado só aqui troca
// o "./review.mjs" que ele importa por um dublê, que chama o motor real com o revisor
// falso e a limpeza que falha. O cli.mjs e o motor que rodam são os do repositório.
function runCliWithFailingCleanup(f, outcome) {
  const dir = join(f.cwd, ".checks/code-review/cli-doubles");
  mkdirSync(dir, { recursive: true });
  const location = join(dir, "location.txt");
  const put = (name, text) => {
    writeFileSync(join(dir, name), text);
    return pathToFileURL(join(dir, name)).href;
  };
  const double = put(
    "double.mjs",
    `import { writeFileSync } from "node:fs";
import * as engine from ${JSON.stringify(new URL("./review.mjs", import.meta.url).href)};
export const { parseArgs, check, createPr } = engine;
export const review = (cwd, options) =>
  engine.review(cwd, options, {
    fetch: () => {},
    issue: () => (${JSON.stringify(issue)}),
    authenticate: () => {},
    execute: async ({ snapshot }) => {
      if (${JSON.stringify(outcome)} === "failure") throw new Error("falha de revisão");
      return { ...(${ready})(snapshot), status: ${JSON.stringify(outcome)} };
    },
    cleanup: (_cwd, checkout) => {
      writeFileSync(${JSON.stringify(location)}, checkout);
      throw new Error("EPERM cleanup");
    },
  });
`,
  );
  const hooks = put(
    "hooks.mjs",
    `export function resolve(specifier, context, nextResolve) {
  return specifier === "./review.mjs" && context.parentURL?.endsWith("/cli.mjs")
    ? { url: ${JSON.stringify(double)}, shortCircuit: true }
    : nextResolve(specifier, context);
}
`,
  );
  const preload = put(
    "register.mjs",
    `import { register } from "node:module";
register(${JSON.stringify(hooks)});
`,
  );
  const run = spawnSync(
    process.execPath,
    [
      "--import",
      preload,
      fileURLToPath(new URL("./cli.mjs", import.meta.url)),
      "review",
      "--issue",
      "7",
      "--profile",
      "light",
    ],
    { cwd: f.cwd, encoding: "utf8", windowsHide: true },
  );
  return {
    status: run.status,
    stdout: run.stdout,
    stderr: run.stderr,
    checkout: existsSync(location) ? readFileSync(location, "utf8") : undefined,
  };
}

for (const [status, code] of [
  ["ready", 0],
  ["changes_requested", 2],
])
  test(`C11 comando com limpeza falha imprime o relatório ${status}, sai com ${code} e avisa a pasta no stderr`, (t) => {
    const f = fixture(t);
    const run = runCliWithFailingCleanup(f, status);
    try {
      const state = JSON.parse(
        readFileSync(
          join(f.cwd, ".git/code-review/issue-7.state.json"),
          "utf8",
        ),
      );
      assert.equal(state.attempts[0].report.status, status);
      assert.equal(
        run.stdout,
        JSON.stringify(state.attempts[0].report, null, 2) + "\n",
      );
      assert.equal(run.status, code);
      assert.equal(run.stderr, `${leftoverWarning(run.checkout)}\n`);
      assert.equal(
        existsSync(join(f.cwd, ".git/code-review/issue-7.lock")),
        false,
      );
    } finally {
      if (run.checkout) f.git("worktree", "remove", "--force", run.checkout);
    }
  });

test("C11 comando com revisão falha e limpeza falha escreve o erro da revisão e sai com 1", (t) => {
  const f = fixture(t);
  const run = runCliWithFailingCleanup(f, "failure");
  try {
    assert.equal(run.stdout, "");
    assert.equal(
      run.stderr,
      `${leftoverWarning(run.checkout)}\nCode review interrompido: falha de revisão\n`,
    );
    assert.equal(run.status, 1);
    assert.equal(
      existsSync(join(f.cwd, ".git/code-review/issue-7.lock")),
      false,
    );
  } finally {
    if (run.checkout) f.git("worktree", "remove", "--force", run.checkout);
  }
});

async function inContinuedWorktree(f, operation) {
  const next = join(f.cwd, ".checks/code-review/continued");
  f.git("switch", "--detach");
  try {
    f.git("worktree", "add", next, "feature");
    return await operation(next);
  } finally {
    f.git("worktree", "remove", "--force", next);
    f.git("switch", "feature");
  }
}

test("C1 relatório contraditório, incompleto ou não comprovado nunca libera", () => {
  const meta = {
    base: "a".repeat(40),
    head: "b".repeat(40),
    contextHash: "c".repeat(64),
    requireEvidence: true,
    acceptanceCriteria: [
      { id: "AC1", text: "Valor 2" },
      { id: "AC2", text: "Sem regressão" },
    ],
  };
  assert.doesNotThrow(() => validateReport(ready(meta), meta));
  const note = ready(meta);
  note.findings.push({
    priority: "P2",
    blocking: false,
    file: "value.txt",
    line: 1,
    scenario: "nota",
    expected: "melhoria opcional",
    actual: "critério atendido",
    impact: "sem defeito",
  });
  assert.doesNotThrow(() => validateReport(note, meta));
  for (const mutate of [
    (r) =>
      r.findings.push({
        priority: "P1",
        blocking: false,
        file: "value.txt",
        line: 1,
        scenario: "entrada",
        expected: "2",
        actual: "1",
        impact: "erro",
      }),
    (r) => (r.criteria[0].status = "unverified"),
    (r) => (r.verification = "insufficient"),
    (r) => (r.verification = "not_applicable"),
    (r) => (r.head = "d".repeat(40)),
    (r) => (r.criteria = []),
    (r) => r.criteria.pop(),
    (r) => r.criteria.push({ ...r.criteria[0] }),
    (r) => (r.criteria[1] = { ...r.criteria[0] }),
    (r) => (r.criteria[1].criterionId = "AC3"),
    (r) => (r.criteria[1].criterion = "Critério inventado"),
    (r) => delete r.summary,
    (r) => (r.extra = true),
    (r) =>
      r.findings.push({
        priority: "P2",
        blocking: true,
        file: "value.txt",
        line: 1,
        scenario: "entrada",
        expected: "2",
        actual: "1",
        impact: "erro",
      }),
  ]) {
    const report = ready(meta);
    mutate(report);
    assert.throws(() => validateReport(report, meta));
  }
});

test("C2 contexto ausente, árvore suja, caminho externo e issue errada são recusados", async (t) => {
  for (const title of [
    "Critérios de aceite",
    "Critérios de correção",
    "Acceptance criteria",
    "Correction criteria",
  ]) {
    for (let level = 1; level <= 6; level++) {
      const prefix = "#".repeat(level);
      assert.deepEqual(
        extractIssueCriteria(
          `${prefix} ${title}\n- [ ] X\n${prefix} Restrições\n- Fora`,
        ),
        [{ id: "AC1", text: "X" }],
      );
    }
  }
  assert.deepEqual(
    extractIssueCriteria(
      "## Acceptance criteria\n- [ ] X\n  - Y\n- Z\n## Other\n- W",
    ),
    [
      { id: "AC1", text: "X\n- Y" },
      { id: "AC2", text: "Z" },
    ],
  );
  assert.deepEqual(extractIssueCriteria("## Critérios de aceite\n1. X\n2. Y"), [
    { id: "AC1", text: "X" },
    { id: "AC2", text: "Y" },
  ]);
  for (const body of [
    "Sem seção",
    "## Critérios de aceite\n",
    "## Critérios de aceite\nParágrafo sem lista",
    "## Critérios de aceite\n- X\n## Acceptance criteria\n- Y",
  ])
    assert.throws(() => extractIssueCriteria(body), /critério|Critério|seção/);
  const f = fixture(t);
  f.put("untracked.txt", "x");
  await assert.rejects(review(f.cwd, f.options, f.deps), /limpa/);
  rmSync(join(f.cwd, "untracked.txt"));
  await assert.rejects(
    review(f.cwd, { ...f.options, task: "../outside.md" }, f.deps),
    /caminho|versionado/,
  );
  await assert.rejects(
    review(f.cwd, f.options, {
      ...f.deps,
      issue: () => ({ ...issue, number: 8 }),
    }),
    /issue/,
  );
  await assert.rejects(
    review(f.cwd, f.options, {
      ...f.deps,
      issue: () => ({ ...issue, body: "" }),
    }),
    /issue/,
  );
  rmSync(join(f.cwd, ".checks/issue-7-example.verified.md"));
  f.git("add", ".");
  f.git("commit", "-m", "sem verificação");
  await assert.rejects(review(f.cwd, f.options, f.deps), /verifica/);
});

test("C3 revisão isolada entrega contexto e remove checkout sem tocar original", async (t) => {
  const f = fixture(t);
  const before = f.git("rev-parse", "HEAD");
  const warnings = [];
  const result = await review(f.cwd, f.options, {
    ...f.deps,
    warn: (message) => warnings.push(message),
  });
  assert.equal(result.status, "ready");
  assert.deepEqual(warnings, []);
  assert.equal(f.git("rev-parse", "HEAD"), before);
  assert.equal(f.git("status", "--porcelain"), "");
  assert.match(f.calls[0], /Valor deve ser 2/);
  assert.match(f.calls[0], /Valor 2/);
  assert.match(f.calls[0], /PASS/);
  assert.notEqual(f.locations[0], f.cwd);
  assert.equal(existsSync(f.locations[0]), false);
});

test("C4 erro técnico, saída inválida e mutação não produzem aprovação", async (t) => {
  await assert.rejects(
    runProcess(process.execPath, ["-e", "process.exit(3)"]),
    /Processo falhou \(3\)/,
  );
  await assert.rejects(
    runProcess(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
      timeout: 500,
    }),
    /Tempo limite/,
  );
  for (const mode of ["failure", "invalid", "mutation"]) {
    const f = fixture(t);
    const execute = async ({ cwd, snapshot }) => {
      if (mode === "failure") throw new Error("Codex falhou");
      if (mode === "invalid") return { status: "ready" };
      writeFileSync(join(cwd, "value.txt"), "3");
      return ready(snapshot);
    };
    await assert.rejects(review(f.cwd, f.options, { ...f.deps, execute }));
    await assert.rejects(check(f.cwd, f.options, f.deps), /relatório|revisão/);
    assert.equal(f.git("status", "--porcelain"), "");
  }
});

test("C5 revisão repetida reutiliza resultado e alterações invalidam o gate", async (t) => {
  const f = fixture(t);
  await review(f.cwd, f.options, f.deps);
  await review(f.cwd, f.options, f.deps);
  assert.equal(f.calls.length, 1);
  rmSync(join(f.cwd, ".git/code-review/issue-7.state.json"));
  await inContinuedWorktree(f, async (next) => {
    await review(next, f.options, f.deps);
    const result = await check(next, f.options, f.deps);
    assert.equal(result.report.status, "ready");
  });
  assert.equal(f.calls.length, 1, "mudar de worktree não repete a revisão");
  await assert.rejects(
    check(f.cwd, f.options, {
      ...f.deps,
      issue: () => ({ ...issue, body: issue.body + "\n- Novo critério" }),
    }),
    /desatualizada/,
  );
  await review(f.cwd, f.options, {
    ...f.deps,
    issue: () => ({ ...issue, body: issue.body + "\n- Novo critério" }),
  });
  await review(f.cwd, f.options, f.deps);
  assert.equal(
    f.calls.length,
    2,
    "retomar contexto anterior reutiliza a prova existente",
  );
  assert.equal((await check(f.cwd, f.options, f.deps)).report.status, "ready");
  f.put("value.txt", "3");
  f.git("add", ".");
  f.git("commit", "-m", "mudança");
  await assert.rejects(check(f.cwd, f.options, f.deps), /desatualizada/);
  f.git("update-ref", "refs/remotes/origin/main", f.git("rev-parse", "HEAD"));
  await assert.rejects(
    check(f.cwd, f.options, f.deps),
    /desatualizada|alterações/,
  );
});

test("C6 limite de rodadas e exclusão mútua impedem chamadas adicionais", async (t) => {
  const f = fixture(t);
  for (let i = 0; i < 2; i++) {
    await assert.rejects(
      review(f.cwd, f.options, {
        ...f.deps,
        execute: async () => {
          throw new Error("falha");
        },
      }),
    );
    f.put("next.txt", String(i));
    f.git("add", ".");
    f.git("commit", "-m", "correção");
  }
  await assert.rejects(review(f.cwd, f.options, f.deps), /rodadas/);
  await inContinuedWorktree(f, (next) =>
    assert.rejects(review(next, f.options, f.deps), /rodadas/),
  );
  const commonState = join(f.cwd, ".git/code-review/issue-7.state.json");
  rmSync(commonState);
  await inContinuedWorktree(f, (next) =>
    assert.rejects(review(next, f.options, f.deps), /rodadas/),
  );
  assert.equal(
    JSON.parse(readFileSync(commonState, "utf8")).attempts.length,
    2,
    "primeira migração em outra worktree preserva o contador legado",
  );
  assert.equal(
    f.calls.length,
    0,
    "migração não autoriza revisão acima do teto",
  );
  const legacy = readFileSync(
    join(f.cwd, ".checks/code-review/issue-7/state.json"),
    "utf8",
  );
  rmSync(commonState);
  await inContinuedWorktree(f, async (next) => {
    mkdirSync(join(next, ".checks/code-review/issue-7"), { recursive: true });
    writeFileSync(join(next, ".checks/code-review/issue-7/state.json"), legacy);
    await assert.rejects(
      review(next, f.options, f.deps),
      /múltiplas worktrees/,
    );
    await assert.rejects(check(next, f.options, f.deps), /múltiplas worktrees/);
    assert.equal(
      existsSync(commonState),
      false,
      "históricos ambíguos não geram estado comum vazio",
    );
  });
  const config = JSON.parse(
    readFileSync(join(f.cwd, "code-review.config.json"), "utf8"),
  );
  const recordOverride = (issueNumber, override) => {
    config.roundOverrides = { [issueNumber]: override };
    f.put("code-review.config.json", JSON.stringify(config));
    f.git("add", ".");
    f.git("commit", "-m", "exceção de rodada");
  };
  const approved = {
    profile: "light",
    maxRounds: 3,
    approval: "Autorização explícita do proprietário para issue 7.",
  };
  recordOverride(8, approved);
  await assert.rejects(review(f.cwd, f.options, f.deps), /rodadas/);
  for (const invalid of [
    { ...approved, approval: "" },
    { ...approved, profile: "direct" },
    { ...approved, maxRounds: 2 },
    { ...approved, maxRounds: 36 },
  ]) {
    recordOverride(7, invalid);
    await assert.rejects(review(f.cwd, f.options, f.deps), /Exceção/);
  }
  recordOverride(7, approved);
  assert.equal((await review(f.cwd, f.options, f.deps)).status, "ready");
  assert.equal(
    JSON.parse(readFileSync(commonState, "utf8")).attempts.length,
    3,
    "exceção preserva as tentativas anteriores",
  );
  assert.equal(
    config.profiles.light.maxRounds,
    2,
    "exceção por issue não muda o padrão",
  );
  f.put("next.txt", "última correção");
  f.git("add", ".");
  f.git("commit", "-m", "nova cabeça");
  await assert.rejects(review(f.cwd, f.options, f.deps), /rodadas/);
  recordOverride(7, { ...approved, maxRounds: 35 });
  assert.equal((await review(f.cwd, f.options, f.deps)).status, "ready");
  assert.equal(
    JSON.parse(readFileSync(commonState, "utf8")).attempts.length,
    4,
    "ampliar o teto preserva as tentativas anteriores",
  );
  const g = fixture(t);
  let release;
  let entered;
  const started = new Promise((resolve) => (entered = resolve));
  const first = review(g.cwd, g.options, {
    ...g.deps,
    execute: async ({ snapshot }) => {
      entered();
      await new Promise((resolve) => (release = resolve));
      return ready(snapshot);
    },
  });
  await started;
  await assert.rejects(review(g.cwd, g.options, g.deps), /andamento/);
  const competing = join(g.cwd, ".checks/code-review/competing");
  g.git("worktree", "add", "--force", competing, "feature");
  try {
    await assert.rejects(review(competing, g.options, g.deps), /andamento/);
  } finally {
    g.git("worktree", "remove", "--force", competing);
    release();
  }
  await first;
});

test("C7 abertura exige revisão atual e cabeça remota igual, com resumo no corpo", async (t) => {
  const f = fixture(t);
  f.git("remote", "set-url", "origin", f.cwd);
  try {
    assert.deepEqual(readRemoteRefs(f.cwd, "feature", "origin/main"), {
      head: f.git("rev-parse", "HEAD"),
      base: f.git("rev-parse", "main"),
    });
  } finally {
    f.git(
      "remote",
      "set-url",
      "origin",
      "https://github.com/example/project.git",
    );
  }
  f.put(".checks/code-review/body.md", "Closes #7\nEntrega.");
  const options = {
    ...f.options,
    title: "feat: entrega",
    body: ".checks/code-review/body.md",
  };
  await assert.rejects(createPr(f.cwd, options, f.deps));
  await review(f.cwd, f.options, f.deps);
  await assert.rejects(
    createPr(f.cwd, options, { ...f.deps, remoteHead: () => "a".repeat(40) }),
    /remota/,
  );
  let changed = false;
  let reads = 0;
  let published = false;
  await assert.rejects(
    createPr(f.cwd, options, {
      ...f.deps,
      issue: () => {
        if (++reads === 2) changed = true;
        return issue;
      },
      remoteHead: () => (changed ? "a".repeat(40) : f.git("rev-parse", "HEAD")),
      remoteRefs: () => ({
        head: changed ? "a".repeat(40) : f.git("rev-parse", "HEAD"),
        base: f.git("rev-parse", "origin/main"),
      }),
      publish: () => {
        published = true;
        return "PR";
      },
    }),
    /remota mudou/,
  );
  assert.equal(
    published,
    false,
    "push concorrente na conferência final não publica",
  );
  let baseChanged = false;
  let baseReads = 0;
  await assert.rejects(
    createPr(f.cwd, options, {
      ...f.deps,
      issue: () => {
        if (++baseReads === 2) baseChanged = true;
        return issue;
      },
      remoteRefs: () => ({
        head: f.git("rev-parse", "HEAD"),
        base: baseChanged ? "b".repeat(40) : f.git("rev-parse", "origin/main"),
      }),
      publish: () => {
        published = true;
        return "PR";
      },
    }),
    /Base remota mudou/,
  );
  assert.equal(
    published,
    false,
    "avanço da base durante a leitura final não publica",
  );
  const out = await createPr(f.cwd, options, {
    ...f.deps,
    publish: ({ args, body }) => {
      assert.match(body, /Code review local/);
      assert.match(body, /Closes #7/);
      assert.ok(args.includes("feature"));
      return "PR";
    },
  });
  assert.equal(out, "PR");
  f.put("value.txt", "3");
  await assert.rejects(createPr(f.cwd, options, f.deps), /limpa/);
});

test("C8 raia direta dispensa task e evidência, perfil normal exige ambas", async (t) => {
  const f = fixture(t);
  f.git(
    "rm",
    ".tasks/issue-7-example.md",
    ".checks/issue-7-example.verified.md",
  );
  f.git("commit", "-m", "direta");
  await assert.rejects(review(f.cwd, f.options, f.deps), /task|plano/);
  await review(
    f.cwd,
    { ...f.options, profile: "direct" },
    {
      ...f.deps,
      execute: async ({ snapshot }) => ({
        ...ready(snapshot),
        verification: "not_applicable",
      }),
    },
  );
});

test("C9 argumentos estritos e launcher Windows sem shell ou API key", () => {
  const launcher = (message) => ({
    executable: process.execPath,
    prefix: ["-e", `process.stderr.write(${JSON.stringify(message)})`, "--"],
  });
  assert.doesNotThrow(() =>
    authenticateChatGPT(launcher("Logged in using ChatGPT")),
  );
  assert.throws(
    () => authenticateChatGPT(launcher("Logged in using an API key")),
    /autenticado com ChatGPT/,
  );
  assert.deepEqual(
    parseArgs(["review", "--issue", "7", "--profile", "light"]),
    { command: "review", issue: 7, profile: "light" },
  );
  for (const args of [
    ["review", "--issue", "0"],
    ["review", "--issue", "7", "--issue", "8"],
    ["review", "--unknown", "x"],
    ["merge", "--issue", "7"],
  ])
    assert.throws(() => parseArgs(args));
  assert.deepEqual(
    codexInvocation("win32", ["C:\\tools\\codex.cmd"], (p) =>
      p.endsWith("codex.js"),
    ),
    {
      executable: process.execPath,
      prefix: ["C:\\tools\\node_modules\\@openai\\codex\\bin\\codex.js"],
    },
  );
  const env = codexEnvironment({
    OPENAI_API_KEY: "secret",
    CODEX_API_KEY: "secret",
    PATH: "path",
  });
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.CODEX_API_KEY, undefined);
  assert.equal(env.PATH, "path");
});

// S21 (.tasks/issue-25-core-save-retry-proposal.md): promoção do temporário do estado.
// Import por namespace: no core sem promoteStateTemp o arquivo ainda liga e cada teste
// falha na própria asserção, nunca por erro de ligação.
import * as reviewModule from "./review.mjs";
import { randomUUID } from "node:crypto";
import { lstatSync, realpathSync } from "node:fs";
import { isAbsolute } from "node:path";

const S21_DELAYS = [10, 20, 40, 80, 160, 320];
const S21_CHANGED = (destination) =>
  `Gravação do estado recusada: o temporário ou o destino mudou antes da promoção (${destination}).`;
const S21_UNAVAILABLE = (destination) =>
  `Gravação do estado recusada: identidade do temporário ou do destino indisponível (${destination}).`;
// Caminhos só do sistema de arquivos virtual dos testes unitários: nome único sob o TEMP do
// processo, nunca criado. Se o produto ignorar o io injetado, o efeito real cai numa pasta
// privada inexistente, nunca num caminho compartilhado.
const S21_VIRTUAL_DIR = join(tmpdir(), `code-review-test-s21-${randomUUID()}`);
const S21_TEMP = join(S21_VIRTUAL_DIR, "issue-7.state.json.tmp");
const S21_DEST = join(S21_VIRTUAL_DIR, "issue-7.state.json");
const S21_BYTES = '{\n  "attempts": []\n}\n';
const S21_OLD = "anterior\n";

const s21Error = (code, label) =>
  Object.assign(new Error(`S21 ${code} ${label}`), { code });
const s21File = (ino, text) => ({
  type: "file",
  dev: 7n,
  ino,
  bytes: Buffer.from(text),
});
const s21Dir = (ino) => ({ type: "dir", dev: 7n, ino });
function s21Entries(dest) {
  const entries = new Map([[S21_TEMP, s21File(11n, S21_BYTES)]]);
  if (dest) entries.set(S21_DEST, dest);
  return entries;
}
const s21Snapshot = (entries) =>
  new Map(
    [...entries].map(([path, entry]) => [
      path,
      { ...entry, bytes: entry.bytes && Buffer.from(entry.bytes) },
    ]),
  );

// Dados declarados, não política: cada entrada tem tipo, dev/ino BigInt e bytes; lstat só
// devolve BigInt quando pedido, como o Node; o rename consome os erros roteirizados em ordem
// e, sem roteiro, move a entrada. A mutação entre tentativas acontece dentro do wait.
function s21VirtualIo(entries, renameOutcomes, onWait) {
  const trace = [];
  const waits = [];
  const missing = (path) =>
    Object.assign(new Error(`ENOENT virtual: ${path}`), { code: "ENOENT" });
  const io = {
    lstatSync(path, options) {
      trace.push(["lstatSync", path]);
      const entry = entries.get(path);
      if (!entry) throw missing(path);
      if (entry.lstatError) throw entry.lstatError;
      const big = options?.bigint === true;
      return {
        dev: big ? entry.dev : Number(entry.dev),
        ino: big ? entry.ino : Number(entry.ino),
        isFile: () => entry.type === "file",
        isDirectory: () => entry.type === "dir",
        isSymbolicLink: () => entry.type === "link",
      };
    },
    readFileSync(path) {
      trace.push(["readFileSync", path]);
      const entry = entries.get(path);
      if (!entry) throw missing(path);
      if (entry.readError) throw entry.readError;
      if (entry.type === "dir")
        throw Object.assign(new Error(`EISDIR virtual: ${path}`), {
          code: "EISDIR",
        });
      return Buffer.from(entry.bytes);
    },
    renameSync(from, to) {
      trace.push(["renameSync", from, to]);
      const outcome = renameOutcomes.shift();
      if (outcome) throw outcome;
      if (!entries.has(from)) throw missing(from);
      entries.set(to, entries.get(from));
      entries.delete(from);
    },
  };
  const wait = (ms) => {
    waits.push(ms);
    trace.push(["wait", ms]);
    onWait?.(entries);
  };
  const renames = () => trace.filter(([op]) => op === "renameSync").length;
  return { io, wait, trace, waits, renames };
}

function s21Promote(
  entries,
  renameOutcomes,
  {
    platform = "win32",
    onWait,
    expectedBytes = Buffer.from(S21_BYTES),
    defaultWait = false,
  } = {},
) {
  assert.equal(
    typeof reviewModule.promoteStateTemp,
    "function",
    "S21: review.mjs não exporta promoteStateTemp",
  );
  const virtual = s21VirtualIo(entries, renameOutcomes, onWait);
  const options = defaultWait
    ? { platform, io: virtual.io }
    : { platform, io: virtual.io, wait: virtual.wait };
  const run = { ...virtual, entries };
  try {
    run.result = reviewModule.promoteStateTemp(
      S21_TEMP,
      S21_DEST,
      expectedBytes,
      options,
    );
  } catch (error) {
    run.error = error;
  }
  return run;
}

// Só a ordem do contrato: nenhuma espera antes da 1ª tentativa, uma espera antes de cada
// nova tentativa e, depois dela, as conferências do temporário e do destino antes do rename.
function s21AssertGuardOrder(trace, destIsFile) {
  const segments = [[]];
  for (const call of trace) {
    if (call[0] === "renameSync") segments.push([]);
    else segments.at(-1).push(call);
  }
  segments.pop();
  const required = [
    ["lstatSync", S21_TEMP],
    ["readFileSync", S21_TEMP],
    ["lstatSync", S21_DEST],
  ];
  if (destIsFile) required.push(["readFileSync", S21_DEST]);
  segments.forEach((segment, index) => {
    const waits = segment.filter(([op]) => op === "wait").length;
    assert.equal(waits, index === 0 ? 0 : 1, `S21: esperas antes da tentativa ${index + 1}`);
    const afterWait = segment.slice(segment.findIndex(([op]) => op === "wait") + 1);
    for (const [op, path] of required)
      assert.ok(
        afterWait.some((call) => call[0] === op && call[1] === path),
        `S21: ${op} ${path} antes da tentativa ${index + 1}`,
      );
  });
}

function s21AssertRefusal(error, message) {
  assert.ok(error instanceof Error, "S21: a guarda deveria recusar a promoção");
  assert.equal(error.message, message);
  assert.equal(error.code, undefined);
  assert.equal(error.errno, undefined);
  assert.doesNotMatch(error.message, /EPERM/);
}

function s21RefusedAfterWait(dest, mutate, message = S21_CHANGED) {
  const expectedBytes = Buffer.from(S21_BYTES);
  let mutated;
  const run = s21Promote(s21Entries(dest), [s21Error("EPERM", 1)], {
    expectedBytes,
    onWait: (entries) => {
      mutate(entries, expectedBytes);
      mutated = s21Snapshot(entries);
    },
  });
  s21AssertRefusal(run.error, message(S21_DEST));
  assert.equal(run.renames(), 1);
  assert.deepEqual(run.waits, [10]);
  assert.deepEqual(
    s21Snapshot(run.entries),
    mutated,
    "S21: a entrada alterada não pode ser regravada, promovida ou apagada",
  );
  return run;
}

function s21RefusedBeforeFirst(entries, message) {
  const before = s21Snapshot(entries);
  const run = s21Promote(entries, []);
  s21AssertRefusal(run.error, message(S21_DEST));
  assert.equal(run.renames(), 0);
  assert.deepEqual(run.waits, []);
  assert.deepEqual(s21Snapshot(run.entries), before);
}

const s21ReadsDest = (trace) =>
  trace.some(([op, path]) => op === "readFileSync" && path === S21_DEST);

test("S21 P1 Windows promove na primeira tentativa sem esperar", () => {
  const run = s21Promote(s21Entries(), []);
  assert.equal(run.error, undefined);
  assert.equal(run.result, undefined);
  assert.equal(run.renames(), 1);
  assert.deepEqual(run.waits, []);
  assert.deepEqual(run.entries.get(S21_DEST).bytes, Buffer.from(S21_BYTES));
  assert.equal(run.entries.has(S21_TEMP), false);
  s21AssertGuardOrder(run.trace, false);
});

for (let failures = 0; failures <= 6; failures++)
  test(`S21 P1 Windows promove depois de ${failures} EPERM com as esperas exatas`, () => {
    const errors = Array.from({ length: failures }, (_, i) =>
      s21Error("EPERM", i + 1),
    );
    const run = s21Promote(s21Entries(), [...errors]);
    assert.equal(run.error, undefined);
    assert.equal(run.result, undefined);
    assert.equal(run.renames(), failures + 1);
    assert.deepEqual(run.waits, S21_DELAYS.slice(0, failures));
    assert.deepEqual(run.entries.get(S21_DEST).bytes, Buffer.from(S21_BYTES));
    assert.equal(run.entries.has(S21_TEMP), false);
    s21AssertGuardOrder(run.trace, false);
  });

test("S21 P1 sete EPERM esgotam as esperas e relançam o último objeto original", () => {
  const errors = Array.from({ length: 7 }, (_, i) => s21Error("EPERM", i + 1));
  const entries = s21Entries(s21File(20n, S21_OLD));
  const before = s21Snapshot(entries);
  const run = s21Promote(entries, [...errors]);
  assert.equal(run.error, errors[6]);
  assert.equal(run.renames(), 7);
  assert.deepEqual(run.waits, S21_DELAYS);
  assert.equal(
    run.waits.reduce((total, ms) => total + ms, 0),
    630,
  );
  assert.deepEqual(s21Snapshot(run.entries), before);
  s21AssertGuardOrder(run.trace, true);
});

test("S21 P1 espera padrão bloqueia ao menos 630 ms antes de relançar o sétimo EPERM", () => {
  const errors = Array.from({ length: 7 }, (_, i) => s21Error("EPERM", i + 1));
  const started = process.hrtime.bigint();
  const run = s21Promote(s21Entries(), [...errors], { defaultWait: true });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  assert.equal(run.error, errors[6]);
  assert.equal(run.renames(), 7);
  assert.ok(elapsedMs >= 630, `S21: esperou ${elapsedMs} ms`);
});

for (const code of ["EACCES", "EBUSY", "ENOENT", "EXDEV", "EIO", undefined])
  test(`S21 P2 Windows ${code ?? "erro sem código"} tenta uma vez sem esperar`, () => {
    const error =
      code === undefined ? new Error("S21 sem código") : s21Error(code, 1);
    const run = s21Promote(s21Entries(), [error]);
    assert.equal(run.error, error);
    assert.equal(run.renames(), 1);
    assert.deepEqual(run.waits, []);
    assert.equal(run.entries.has(S21_TEMP), true);
  });

test("S21 P2 Windows EPERM seguido de EIO para e relança o EIO", () => {
  const eio = s21Error("EIO", 2);
  const run = s21Promote(s21Entries(), [s21Error("EPERM", 1), eio]);
  assert.equal(run.error, eio);
  assert.equal(run.renames(), 2);
  assert.deepEqual(run.waits, [10]);
});

for (const platform of ["linux", "darwin"])
  test(`S21 P2 ${platform} EPERM tenta uma vez pelo caminho direto`, () => {
    const eperm = s21Error("EPERM", 1);
    const run = s21Promote(s21Entries(), [eperm], { platform });
    assert.equal(run.error, eperm);
    assert.deepEqual(run.trace, [["renameSync", S21_TEMP, S21_DEST]]);
    assert.deepEqual(run.waits, []);
  });

test("S21 P2 linux promove sem conferir bytes nem identidade", () => {
  const entries = new Map([[S21_TEMP, s21File(11n, S21_OLD)]]);
  const run = s21Promote(entries, [], { platform: "linux" });
  assert.equal(run.error, undefined);
  assert.deepEqual(run.trace, [["renameSync", S21_TEMP, S21_DEST]]);
  assert.deepEqual(run.entries.get(S21_DEST).bytes, Buffer.from(S21_OLD));
});

test("S21 P3 temporário editado no mesmo inode durante a espera é recusado", () => {
  s21RefusedAfterWait(null, (entries) => {
    entries.get(S21_TEMP).bytes = Buffer.from(S21_BYTES.replace("[]", "{}"));
  });
});

test("S21 P3 temporário trocado por cópia idêntica com outro inode é recusado", () => {
  s21RefusedAfterWait(null, (entries) => {
    entries.set(S21_TEMP, s21File(12n, S21_BYTES));
  });
});

test("S21 P3 temporário removido durante a espera é recusado", () => {
  s21RefusedAfterWait(null, (entries) => {
    entries.delete(S21_TEMP);
  });
});

test("S21 P3 temporário trocado por diretório é recusado", () => {
  s21RefusedAfterWait(null, (entries) => {
    entries.set(S21_TEMP, s21Dir(13n));
  });
});

test("S21 P3 destino ausente criado com os bytes esperados é recusado", () => {
  s21RefusedAfterWait(null, (entries) => {
    entries.set(S21_DEST, s21File(21n, S21_BYTES));
  });
});

test("S21 P3 destino editado no mesmo inode é recusado", () => {
  s21RefusedAfterWait(s21File(20n, S21_OLD), (entries) => {
    entries.get(S21_DEST).bytes = Buffer.from("Anterior\n");
  });
});

test("S21 P3 destino trocado por cópia idêntica com outro inode é recusado", () => {
  s21RefusedAfterWait(s21File(20n, S21_OLD), (entries) => {
    entries.set(S21_DEST, s21File(22n, S21_OLD));
  });
});

test("S21 P3 destino removido durante a espera é recusado", () => {
  s21RefusedAfterWait(s21File(20n, S21_OLD), (entries) => {
    entries.delete(S21_DEST);
  });
});

test("S21 P3 destino diretório trocado por outro diretório é recusado sem ler o diretório", () => {
  const run = s21RefusedAfterWait(s21Dir(30n), (entries) => {
    entries.set(S21_DEST, s21Dir(31n));
  });
  assert.equal(s21ReadsDest(run.trace), false);
});

test("S21 P3 bytes esperados são copiados: mutar o Buffer do chamador não aceita o temporário editado", () => {
  s21RefusedAfterWait(null, (entries, expectedBytes) => {
    const edited = Buffer.from(S21_BYTES.replace("[]", "{}"));
    entries.get(S21_TEMP).bytes = edited;
    edited.copy(expectedBytes);
  });
});

test("S21 P3 destino diretório estável: duas esperas e o EISDIR do rename propaga", () => {
  const eisdir = s21Error("EISDIR", 3);
  const entries = s21Entries(s21Dir(30n));
  const before = s21Snapshot(entries);
  const run = s21Promote(entries, [
    s21Error("EPERM", 1),
    s21Error("EPERM", 2),
    eisdir,
  ]);
  assert.equal(run.error, eisdir);
  assert.equal(run.renames(), 3);
  assert.deepEqual(run.waits, [10, 20]);
  assert.equal(s21ReadsDest(run.trace), false);
  assert.deepEqual(s21Snapshot(run.entries), before);
  s21AssertGuardOrder(run.trace, false);
});

test("S21 P3 destino arquivo estável: duas esperas e a promoção substitui o destino", () => {
  const run = s21Promote(s21Entries(s21File(20n, S21_OLD)), [
    s21Error("EPERM", 1),
    s21Error("EPERM", 2),
  ]);
  assert.equal(run.error, undefined);
  assert.equal(run.renames(), 3);
  assert.deepEqual(run.waits, [10, 20]);
  assert.deepEqual(run.entries.get(S21_DEST).bytes, Buffer.from(S21_BYTES));
  assert.equal(run.entries.has(S21_TEMP), false);
  s21AssertGuardOrder(run.trace, true);
});

test("S21 P3 temporário com bytes diferentes dos esperados é recusado antes da primeira tentativa", () => {
  const entries = s21Entries();
  entries.get(S21_TEMP).bytes = Buffer.from(S21_BYTES.replace("[]", "{}"));
  s21RefusedBeforeFirst(entries, S21_CHANGED);
});

test("S21 P3 temporário diretório é recusado antes da primeira tentativa", () => {
  const entries = s21Entries();
  entries.set(S21_TEMP, s21Dir(13n));
  s21RefusedBeforeFirst(entries, S21_CHANGED);
});

test("S21 P3 temporário link é recusado antes da primeira tentativa", () => {
  const entries = s21Entries();
  entries.set(S21_TEMP, { ...s21File(14n, S21_BYTES), type: "link" });
  s21RefusedBeforeFirst(entries, S21_CHANGED);
});

test("S21 P3 ENOENT ao ler o temporário depois do lstat é mudança, não erro de E/S", () => {
  const entries = s21Entries();
  entries.get(S21_TEMP).readError = s21Error("ENOENT", "read");
  s21RefusedBeforeFirst(entries, S21_CHANGED);
});

for (const [label, invalidate] of [
  ["temporário com dev negativo", (entries) => (entries.get(S21_TEMP).dev = -1n)],
  ["temporário com ino zero", (entries) => (entries.get(S21_TEMP).ino = 0n)],
  ["temporário com dev Number", (entries) => (entries.get(S21_TEMP).dev = 7)],
  ["destino com dev negativo", (entries) => (entries.get(S21_DEST).dev = -1n)],
  ["destino com ino zero", (entries) => (entries.get(S21_DEST).ino = 0n)],
])
  test(`S21 P3 identidade indisponível: ${label} falha fechada antes da primeira tentativa`, () => {
    const entries = s21Entries(s21File(20n, S21_OLD));
    invalidate(entries);
    s21RefusedBeforeFirst(entries, S21_UNAVAILABLE);
  });

test("S21 P3 identidade indisponível na reconferência falha fechada", () => {
  s21RefusedAfterWait(
    null,
    (entries) => {
      entries.get(S21_TEMP).ino = 0n;
    },
    S21_UNAVAILABLE,
  );
});

test("S21 P3 EIO no lstat do temporário na captura propaga o mesmo objeto", () => {
  const eio = s21Error("EIO", "lstat");
  const entries = s21Entries();
  entries.get(S21_TEMP).lstatError = eio;
  const run = s21Promote(entries, []);
  assert.equal(run.error, eio);
  assert.equal(run.renames(), 0);
  assert.deepEqual(run.waits, []);
});

test("S21 P3 EIO na leitura do destino depois da espera propaga o mesmo objeto", () => {
  const eio = s21Error("EIO", "read");
  const run = s21Promote(s21Entries(s21File(20n, S21_OLD)), [s21Error("EPERM", 1)], {
    onWait: (entries) => {
      entries.get(S21_DEST).readError = eio;
    },
  });
  assert.equal(run.error, eio);
  assert.equal(run.renames(), 1);
  assert.deepEqual(run.waits, [10]);
});

test("S21 P3 EACCES no lstat do destino na captura propaga o mesmo objeto", () => {
  const eacces = s21Error("EACCES", "lstat");
  const dest = s21File(20n, S21_OLD);
  dest.lstatError = eacces;
  const run = s21Promote(s21Entries(dest), []);
  assert.equal(run.error, eacces);
  assert.equal(run.renames(), 0);
  assert.deepEqual(run.waits, []);
});

test("S21 P3 EPERM na conferência da captura propaga sem tentativa nem espera", () => {
  const eperm = s21Error("EPERM", "lstat");
  const entries = s21Entries();
  entries.get(S21_TEMP).lstatError = eperm;
  const run = s21Promote(entries, []);
  assert.equal(run.error, eperm);
  assert.equal(run.renames(), 0);
  assert.deepEqual(run.waits, []);
});

test("S21 P3 EPERM na leitura depois da espera propaga sem espera extra", () => {
  const eperm = s21Error("EPERM", "read");
  const run = s21Promote(s21Entries(), [s21Error("EPERM", 1)], {
    onWait: (entries) => {
      entries.get(S21_TEMP).readError = eperm;
    },
  });
  assert.equal(run.error, eperm);
  assert.equal(run.renames(), 1);
  assert.deepEqual(run.waits, [10]);
});

// Pré-carga só destes testes S21 (padrão de tests/integrations/helpers/fs-probe.mjs): entra
// por NODE_OPTIONS no processo do cli.mjs antes de review.mjs carregar e envolve
// writeFileSync/renameSync de node:fs somente para o temporário/estado da issue 7,
// registrando cada chamada em JSONL. lstatSync/readFileSync ficam reais: as guardas do
// produto observam o disco da fixture.
function s21Preload(planFile) {
  return `import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { createRequire, syncBuiltinESMExports } from "node:module";
const fs = createRequire(import.meta.url)("node:fs");
const plan = JSON.parse(readFileSync(${JSON.stringify(planFile)}, "utf8"));
const suffixes = {
  common: ".git/code-review/issue-7.state.json",
  local: ".checks/code-review/issue-7/state.json",
};
const targetOf = (file, tail) =>
  typeof file === "string"
    ? Object.keys(suffixes).find((target) =>
        file.split(String.fromCharCode(92)).join("/").toLowerCase().endsWith(suffixes[target] + tail),
      )
    : undefined;
const saves = { common: 0, local: 0 };
const attempts = { common: 0, local: 0 };
const log = (entry) => appendFileSync(plan.log, JSON.stringify(entry) + String.fromCharCode(10));
const faultOf = (target) =>
  plan.faults.find((fault) => fault.target === target && fault.save === saves[target]);
const injected = (code, label) => Object.assign(new Error("S21 " + code + " " + label), { code });
const realWrite = fs.writeFileSync;
const realRename = fs.renameSync;
fs.writeFileSync = function s21WriteFileSync(file, ...rest) {
  const target = targetOf(file, ".tmp");
  if (target !== undefined) {
    saves[target] += 1;
    attempts[target] = 0;
    log({ op: "write", target, save: saves[target] });
    if (faultOf(target)?.kind === "write-eio") throw injected("EIO", "write");
  }
  return realWrite.call(this, file, ...rest);
};
fs.renameSync = function s21RenameSync(from, to) {
  const target = targetOf(to, "");
  if (target !== undefined) {
    const attempt = (attempts[target] += 1);
    log({ op: "rename", target, save: saves[target], attempt, lock: existsSync(plan.lock) });
    const fault = faultOf(target);
    if (fault?.kind === "eperm" && attempt <= fault.count) throw injected("EPERM", attempt);
    if (fault?.kind === "eio" && attempt === 1) throw injected("EIO", attempt);
    if (fault?.kind === "guard" && attempt === 1) {
      const bytes = readFileSync(from);
      bytes[bytes.length - 1] = 0x0d;
      realWrite(from, bytes);
      throw injected("EPERM", attempt);
    }
    if (fault?.kind === "dest-create" && attempt === 1) {
      realWrite(to, readFileSync(from));
      throw injected("EPERM", attempt);
    }
  }
  return realRename.call(this, from, to);
};
syncBuiltinESMExports();
`;
}

const S21_CHECKOUT_PREFIX = "codex-code-review-";
// Filho direto da raiz com o prefixo do motor: sem "..", sem separadores.
function s21DirectCheckoutChild(root, target) {
  const within = relative(root, target);
  return (
    within.startsWith(S21_CHECKOUT_PREFIX) &&
    !within.includes("..") &&
    !within.includes("/") &&
    !within.includes("\\")
  );
}
const s21LexicallyOwned = (checkout) =>
  isAbsolute(checkout) &&
  s21DirectCheckoutChild(resolve(tmpdir()), resolve(checkout));

// Identidade do checkout deixado pela limpeza falsa, lida logo que o CLI retorna e só depois
// das conferências de caminho. Só ela autoriza a remoção no fim do teste.
function s21CaptureCheckout(checkout) {
  if (typeof checkout !== "string") return null;
  if (!s21LexicallyOwned(checkout)) return { refused: "fora do TEMP próprio" };
  const stat = lstatSync(checkout, { bigint: true, throwIfNoEntry: false });
  if (!stat || stat.isSymbolicLink() || !stat.isDirectory())
    return { refused: "não é pasta real" };
  return { dev: stat.dev, ino: stat.ino };
}

// Remove só o checkout com a identidade capturada: mesmo caminho lexical e real, pasta real
// sem link, mesmos dev/ino. Qualquer divergência lança e nada é removido; sem nova tentativa.
function s21RemoveOwnCheckout(f, run) {
  if (typeof run.checkout !== "string") return;
  const { checkout, checkoutIdentity: identity } = run;
  if (!identity || identity.refused)
    throw new Error(
      `S21: checkout não removido (${identity?.refused ?? "identidade não capturada"}): ${checkout}`,
    );
  const stat = lstatSync(checkout, { bigint: true, throwIfNoEntry: false });
  if (!stat) throw new Error(`S21: checkout ausente antes da remoção: ${checkout}`);
  if (
    !s21LexicallyOwned(checkout) ||
    stat.isSymbolicLink() ||
    !stat.isDirectory() ||
    stat.dev !== identity.dev ||
    stat.ino !== identity.ino ||
    !s21DirectCheckoutChild(realpathSync(tmpdir()), realpathSync(checkout))
  )
    throw new Error(`S21: checkout trocado ou fora do TEMP próprio, não removido: ${checkout}`);
  f.git("worktree", "remove", "--force", checkout);
}

// Corpo de teste de CLI com remoção dos checkouts próprios no fim. Falha do corpo e da
// remoção aparecem juntas num AggregateError; nenhuma esconde a outra.
async function s21WithCheckouts(f, body) {
  const runs = [];
  const runCli = (outcome, faults) =>
    s21RunCli(f, outcome, faults, (run) => runs.push(run));
  let failure = null;
  try {
    await body(runCli);
  } catch (error) {
    failure = { error };
  }
  const cleanup = [];
  for (const run of runs)
    try {
      s21RemoveOwnCheckout(f, run);
    } catch (error) {
      cleanup.push(error);
    }
  if (failure && cleanup.length)
    throw new AggregateError(
      [failure.error, ...cleanup],
      "S21: o teste falhou e a remoção do checkout também",
    );
  if (failure) throw failure.error;
  if (cleanup.length)
    throw new AggregateError(cleanup, "S21: remoção do checkout recusada ou falhou");
}

// Chama o runCliWithFailingCleanup original com a pré-carga; NODE_OPTIONS volta ao valor
// anterior mesmo se a chamada lançar. O resultado é registrado antes de qualquer outra
// leitura, para que o checkout criado nunca fique sem dono.
function s21RunCli(f, outcome, faults, register) {
  const dir = join(f.cwd, ".checks/code-review/s21");
  mkdirSync(dir, { recursive: true });
  const log = join(dir, "events.jsonl");
  const planFile = join(dir, "plan.json");
  const preload = join(dir, "preload.mjs");
  // A limpeza falsa só grava location.txt quando há checkout: sem apagar, uma chamada que
  // não cria checkout leria o da anterior.
  rmSync(join(f.cwd, ".checks/code-review/cli-doubles/location.txt"), {
    force: true,
  });
  rmSync(log, { force: true });
  writeFileSync(
    planFile,
    JSON.stringify({
      log,
      lock: join(f.cwd, ".git/code-review/issue-7.lock"),
      faults,
    }),
  );
  writeFileSync(preload, s21Preload(planFile));
  const previous = process.env.NODE_OPTIONS;
  process.env.NODE_OPTIONS = [previous, `--import=${pathToFileURL(preload).href}`]
    .filter(Boolean)
    .join(" ");
  let run;
  try {
    run = runCliWithFailingCleanup(f, outcome);
  } finally {
    if (previous === undefined) delete process.env.NODE_OPTIONS;
    else process.env.NODE_OPTIONS = previous;
  }
  const result = { ...run };
  register(result);
  result.checkoutIdentity = s21CaptureCheckout(run.checkout);
  result.events = existsSync(log)
    ? readFileSync(log, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];
  return result;
}

const S21_PATHS = {
  common: [".git", "code-review", "issue-7.state.json"],
  local: [".checks", "code-review", "issue-7", "state.json"],
};
const s21Path = (f, target) => join(f.cwd, ...S21_PATHS[target]);
const s21Lock = (f) => join(f.cwd, ".git/code-review/issue-7.lock");
const s21Reports = (file) =>
  existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8")).attempts.map((attempt) =>
        attempt.report === null ? null : attempt.report.status,
      )
    : null;
const s21Writes = (events) =>
  events.filter((e) => e.op === "write").map((e) => `${e.target}${e.save}`);
const s21Attempts = (events, target, save) =>
  events
    .filter((e) => e.op === "rename" && e.target === target && e.save === save)
    .map((e) => e.attempt);
const s21LockHeld = (events) =>
  events.filter((e) => e.op === "rename").every((e) => e.lock === true);
function s21WriteOrder(lastSave, stopAt) {
  const order = [];
  for (let save = 1; save <= lastSave; save++)
    for (const target of ["common", "local"]) {
      order.push(`${target}${save}`);
      if (stopAt === `${target}${save}`) return order;
    }
  return order;
}
const S21_CHECK_ABSENT = "Revisão ausente ou desatualizada. Execute review:run.";
const S21_CHECK_NO_REPORT = "Revisão sem relatório concluído.";

// Status e stderr antes de ler o estado: uma falha mostra a causa, não um TypeError.
function s21AssertSucceeded(f, run, cached, attempts = 1) {
  assert.equal(run.status, 0);
  assert.equal(run.stderr, cached ? "" : `${leftoverWarning(run.checkout)}\n`);
  const common = JSON.parse(readFileSync(s21Path(f, "common"), "utf8"));
  assert.equal(common.attempts.length, attempts);
  assert.equal(
    run.stdout,
    JSON.stringify(common.attempts.at(-1).report, null, 2) + "\n",
  );
  assert.equal(common.attempts.at(-1).report.status, "ready");
  assert.deepEqual(JSON.parse(readFileSync(s21Path(f, "local"), "utf8")), common);
  for (const target of ["common", "local"])
    assert.equal(existsSync(`${s21Path(f, target)}.tmp`), false);
  assert.equal(existsSync(s21Lock(f)), false);
}

// Estado deixado pela gravação que falhou, como antes da S21: comum primeiro, sem rollback.
const S21_AFTER_FAILURE = {
  "initial/common": { common: null, local: null, temp: [], check: S21_CHECK_ABSENT, recovered: 1 },
  "initial/local": { common: [], local: null, temp: [], check: S21_CHECK_ABSENT, recovered: 1 },
  "attempt/common": { common: [], local: [], temp: [null], check: S21_CHECK_ABSENT, recovered: 1 },
  "attempt/local": { common: [null], local: [], temp: [null], check: S21_CHECK_NO_REPORT, recovered: 2 },
  "report/common": { common: [null], local: [null], temp: ["ready"], check: S21_CHECK_NO_REPORT, recovered: 2 },
  "report/local": { common: ["ready"], local: [null], temp: ["ready"], check: null, recovered: 1 },
  "cache/common": { common: ["ready"], local: ["ready"], temp: ["ready"], check: null, recovered: 1 },
  "cache/local": { common: ["ready"], local: ["ready"], temp: ["ready"], check: null, recovered: 1 },
};

function s21AssertFailed(f, run, phase, target, message, guard) {
  assert.equal(run.status, 1);
  assert.equal(run.stdout, "");
  assert.equal(
    run.stderr,
    phase === "report"
      ? `${leftoverWarning(run.checkout)}\nCode review interrompido: ${message}\n`
      : `Code review interrompido: ${message}\n`,
  );
  if (phase !== "report") assert.equal(run.checkout, undefined);
  assert.equal(existsSync(s21Lock(f)), false);
  const expected = S21_AFTER_FAILURE[`${phase}/${target}`];
  assert.deepEqual(s21Reports(s21Path(f, "common")), expected.common);
  assert.deepEqual(s21Reports(s21Path(f, "local")), expected.local);
  const temp = `${s21Path(f, target)}.tmp`;
  assert.deepEqual(s21Reports(temp), expected.temp);
  assert.equal(readFileSync(temp).at(-1), guard ? 0x0d : 0x0a);
  if (phase === "cache" && !guard)
    assert.deepEqual(readFileSync(temp), readFileSync(s21Path(f, target)));
  const other = target === "common" ? "local" : "common";
  assert.equal(existsSync(`${s21Path(f, other)}.tmp`), false);
}

for (const [status, code] of [
  ["ready", 0],
  ["changes_requested", 2],
])
  for (const target of ["common", "local"])
    test(`S21 P5 C11 ${status} com 3 EPERM na gravação ${target} da tentativa`, (t) => {
      const f = fixture(t);
      return s21WithCheckouts(f, (runCli) => {
        const run = runCli(status, [{ target, save: 2, kind: "eperm", count: 3 }]);
        if (process.platform !== "win32") {
          s21AssertFailed(f, run, "attempt", target, "S21 EPERM 1", false);
          assert.deepEqual(s21Attempts(run.events, target, 2), [1]);
          assert.deepEqual(s21Writes(run.events), s21WriteOrder(3, `${target}2`));
          return;
        }
        assert.equal(run.status, code);
        assert.equal(run.stderr, `${leftoverWarning(run.checkout)}\n`);
        const state = JSON.parse(readFileSync(s21Path(f, "common"), "utf8"));
        assert.equal(
          run.stdout,
          JSON.stringify(state.attempts[0].report, null, 2) + "\n",
        );
        assert.equal(state.attempts.length, 1);
        assert.equal(state.attempts[0].report.status, status);
        assert.deepEqual(JSON.parse(readFileSync(s21Path(f, "local"), "utf8")), state);
        assert.deepEqual(s21Attempts(run.events, target, 2), [1, 2, 3, 4]);
        assert.deepEqual(s21Writes(run.events), s21WriteOrder(3));
        assert.equal(s21LockHeld(run.events), true);
        for (const each of ["common", "local"])
          assert.equal(existsSync(`${s21Path(f, each)}.tmp`), false);
        assert.equal(existsSync(s21Lock(f)), false);
      });
    });

for (const target of ["common", "local"])
  test(`S21 P5 C11 EPERM permanente na gravação ${target} da tentativa preserva o último erro e a ordem comum→local`, (t) => {
    const f = fixture(t);
    return s21WithCheckouts(f, async (runCli) => {
      const run = runCli("ready", [{ target, save: 2, kind: "eperm", count: 99 }]);
      const windows = process.platform === "win32";
      s21AssertFailed(f, run, "attempt", target, windows ? "S21 EPERM 7" : "S21 EPERM 1", false);
      assert.deepEqual(
        s21Attempts(run.events, target, 2),
        windows ? [1, 2, 3, 4, 5, 6, 7] : [1],
      );
      assert.deepEqual(s21Writes(run.events), s21WriteOrder(3, `${target}2`));
      assert.equal(s21LockHeld(run.events), true);
      const temp = JSON.parse(readFileSync(`${s21Path(f, target)}.tmp`, "utf8"));
      assert.equal(temp.attempts.length, 1);
      assert.deepEqual(Object.keys(temp.attempts[0]), [
        "fingerprint",
        "snapshot",
        "startedAt",
        "report",
      ]);
      assert.equal(temp.attempts[0].report, null);
      if (target === "local")
        assert.deepEqual(temp, JSON.parse(readFileSync(s21Path(f, "common"), "utf8")));
      await assert.rejects(check(f.cwd, f.options, f.deps), {
        message: target === "common" ? S21_CHECK_ABSENT : S21_CHECK_NO_REPORT,
      });
    });
  });

const S21_SAVE = { initial: 1, attempt: 2, report: 3, cache: 2 };
const S21_FAULT = {
  transient: { kind: "eperm", count: 3 },
  permanent: { kind: "eperm", count: 99 },
  eio: { kind: "eio" },
  guard: { kind: "guard" },
};
function s21ExpectedAttempts(kind) {
  if (process.platform !== "win32" || kind === "eio" || kind === "guard") return [1];
  return kind === "transient" ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6, 7];
}
// null: a gravação deve concluir.
function s21FailureMessage(f, kind, target) {
  if (kind === "eio") return "S21 EIO 1";
  if (process.platform !== "win32") return "S21 EPERM 1";
  if (kind === "permanent") return "S21 EPERM 7";
  if (kind === "guard") return S21_CHANGED(s21Path(f, target));
  return null;
}

for (const phase of ["initial", "attempt", "report", "cache"])
  for (const target of ["common", "local"])
    for (const kind of ["transient", "permanent", "eio", "guard"])
      test(`S21 P6 ${kind} na gravação ${target} da fase ${phase}`, (t) => {
        const f = fixture(t);
        return s21WithCheckouts(f, async (runCli) => {
          if (phase === "cache") s21AssertSucceeded(f, runCli("ready", []), false);
          const save = S21_SAVE[phase];
          const lastSave = phase === "cache" ? 2 : 3;
          const run = runCli("ready", [{ target, save, ...S21_FAULT[kind] }]);
          const message = s21FailureMessage(f, kind, target);
          if (message === null) {
            s21AssertSucceeded(f, run, phase === "cache");
            assert.deepEqual(s21Writes(run.events), s21WriteOrder(lastSave));
          } else {
            s21AssertFailed(f, run, phase, target, message, kind === "guard");
            assert.deepEqual(
              s21Writes(run.events),
              s21WriteOrder(lastSave, `${target}${save}`),
            );
          }
          assert.deepEqual(s21Attempts(run.events, target, save), s21ExpectedAttempts(kind));
          assert.equal(s21LockHeld(run.events), true);
          if (message === null) return;
          const expected = S21_AFTER_FAILURE[`${phase}/${target}`];
          if (expected.check === null)
            assert.equal((await check(f.cwd, f.options, f.deps)).report.status, "ready");
          else
            await assert.rejects(check(f.cwd, f.options, f.deps), {
              message: expected.check,
            });
          // Nova chamada sem falha injetada: a recuperação que já existia, com o contador real.
          s21AssertSucceeded(
            f,
            runCli("ready", []),
            phase === "cache" || `${phase}/${target}` === "report/local",
            expected.recovered,
          );
        });
      });

test("S21 P6 destino comum criado com os bytes esperados durante a espera é recusado e preservado", (t) => {
  const f = fixture(t);
  return s21WithCheckouts(f, (runCli) => {
    const run = runCli("ready", [{ target: "common", save: 1, kind: "dest-create" }]);
    const message =
      process.platform === "win32" ? S21_CHANGED(s21Path(f, "common")) : "S21 EPERM 1";
    assert.equal(run.status, 1);
    assert.equal(run.stdout, "");
    assert.equal(run.stderr, `Code review interrompido: ${message}\n`);
    assert.equal(run.checkout, undefined);
    assert.equal(existsSync(s21Lock(f)), false);
    assert.deepEqual(s21Attempts(run.events, "common", 1), [1]);
    assert.deepEqual(s21Writes(run.events), ["common1"]);
    assert.deepEqual(
      readFileSync(s21Path(f, "common")),
      readFileSync(`${s21Path(f, "common")}.tmp`),
    );
    assert.deepEqual(s21Reports(s21Path(f, "common")), []);
    assert.equal(existsSync(s21Path(f, "local")), false);
  });
});

test("S21 P6 seis gravações novas e quatro do cache com seis EPERM cada concluem", (t) => {
  const f = fixture(t);
  const everySave = (saves) =>
    saves.flatMap((save) =>
      ["common", "local"].map((target) => ({ target, save, kind: "eperm", count: 6 })),
    );
  return s21WithCheckouts(f, (runCli) => {
    const first = runCli("ready", everySave([1, 2, 3]));
    if (process.platform !== "win32") {
      s21AssertFailed(f, first, "initial", "common", "S21 EPERM 1", false);
      return;
    }
    s21AssertSucceeded(f, first, false);
    assert.deepEqual(s21Writes(first.events), s21WriteOrder(3));
    assert.equal(first.events.filter((e) => e.op === "rename").length, 42);
    const cached = runCli("ready", everySave([1, 2]));
    s21AssertSucceeded(f, cached, true);
    assert.equal(cached.stdout, first.stdout);
    assert.deepEqual(s21Writes(cached.events), s21WriteOrder(2));
    assert.equal(cached.events.filter((e) => e.op === "rename").length, 28);
    assert.equal(s21LockHeld(first.events) && s21LockHeld(cached.events), true);
  });
});

for (const target of ["common", "local"])
  test(`S21 P4 falha ao gravar o temporário ${target} não tenta promover`, (t) => {
    const f = fixture(t);
    return s21WithCheckouts(f, (runCli) => {
      const run = runCli("ready", [{ target, save: 1, kind: "write-eio" }]);
      assert.equal(run.status, 1);
      assert.equal(run.stdout, "");
      assert.equal(run.stderr, "Code review interrompido: S21 EIO write\n");
      assert.equal(run.checkout, undefined);
      assert.deepEqual(s21Writes(run.events), s21WriteOrder(1, `${target}1`));
      assert.deepEqual(s21Attempts(run.events, target, 1), []);
      assert.equal(existsSync(s21Lock(f)), false);
      assert.equal(existsSync(`${s21Path(f, target)}.tmp`), false);
      assert.deepEqual(s21Reports(s21Path(f, "common")), target === "common" ? null : []);
      assert.equal(existsSync(s21Path(f, "local")), false);
    });
  });
