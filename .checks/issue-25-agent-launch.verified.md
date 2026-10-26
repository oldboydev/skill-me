# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25

**Verdict**: PASS — 45/45 checks (C1–C45) comprovados em `ffc5937`, com as provas versionadas reexecutadas por inteiro em quatro ambientes (A, B, C e D), sem nenhuma falha.
**Conformidade do processo do Verifier nesta rodada**: CONFORME, pelo que os meus comandos mostram (seção "Processo desta rodada"). Só executei as provas versionadas A–D, a preparação da cópia do HEAD, a análise dos logs e a limpeza dos meus scratches. Nenhum comando direto `codex`, `claude` ou `hermes`, nenhuma sonda e nenhuma leitura de perfil pessoal ou credencial.
**Profile**: light
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..ffc593729a024a2110997d9c7e14d9351e75dc75`. A correção do P2 está em `9cd06d5..7ab5dbf`; `7ab5dbf..ffc5937` só muda documentação, configuração e o relatório. Desde `d939df8` só mudou este relatório.
**Round**: 6 - scoped, a última dentro da exceção do proprietário só para a #25: “Autorizar até 2 de cada (tetos 6/5)” ([comentário 6425235841](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6425235841)). A exceção permite até 6 Verifiers e 5 revisões formais no total, com o histórico preservado e parada no primeiro `ready`. As rodadas 1–5 continuam no histórico, inclusive o incidente de processo da rodada 5 (seção própria abaixo).
**Verifier**: subagente independente novo (Claude Opus 5.5). Não é o autor nem o Verifier da rodada 5, e não herdou o contexto de nenhum dos dois; autor ≠ verificador. Código, testes, critérios, checklist e configuração foram tratados como somente leitura. Nenhum commit, push, PR, merge ou `review:run`.

Data: 26/10/2026, 17:08–17:27 (-03). HEAD `ffc5937` (árvore `8b7d5fd8…`) do início ao fim; `git status --porcelain=v1 -uall` vazio antes (`verifier-round6/git-status-before.txt`) e, ao final, só este arquivo. O relatório da rodada 5 (em `ffc5937`) foi lido inteiro antes de ser substituído e continua no histórico do git.

## Veredito em uma linha

**45/45 checks comprovados.** O P2 da terceira revisão formal (`agent.mjs:30`, componentes vazios do PATH no POSIX) está **fechado** no código e pelas provas que executei. A decisão do resolver foi provada com o FS em memória do doctor. No POSIX, o launcher real com o agente de fixture (`fake-agent`, não o Codex real) iniciou o executável certo nos 9 PATHs e saiu com 127 `executable_not_found` com o PATH ausente. No Windows, o controle real seguiu inalterado. O alvo completo de 98 testes passou sem falhas em Windows Node 24.22.1 (93/0/5), Windows Node 24.13.0 da CI (93/0/5) e WSL com cópia exata (92/0/6). O gate `npm test` no Windows saiu com **0**: 990 testes, 971 pass, **0 fail**, 19 skip de plataforma, com os 12 nativos do Hermes aprovados. O processo desta rodada foi conforme; o incidente da rodada 5 continua registrado e não foi repetido.

## Fontes lidas nesta rodada

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `tlc-implement/references/verify.md` | inteiros: perfil `light`, sem fault injection, `Coverage` ou `Test policy` |
| `.tasks/issue-25-agent-launch.md` | inteiro (critérios 1–37 e Sources com as exceções 6423912091 e 6425235841) |
| `.checks/issue-25-agent-launch.md` | inteiro: Sources, Landing (inclusive "Componentes vazios do PATH"), C1–C45 com os comandos de prova, Swept, Handoff |
| `.checks/code-review/issue-25/context-bounded65-approved.json` | inteiro: 6 ACs e 10 comentários, os dois últimos com o pedido e a autorização 6425235841 |
| `.checks/code-review/issue-25/formal-review3.stdout.txt` | inteiro (68 linhas): `changes_requested` em `9cd06d5`; AC1 `unmet` só pelo P2 `agent.mjs:30`; AC2–AC6 `met`; limitações |
| `.checks/issue-25-agent-launch.verified.md` da rodada 5 | inteiro, antes de substituí-lo (inclusive a seção do desvio corrigida depois da auditoria) |
| `src/integrations/launch/agent.mjs` | linhas 1–125 (`launchPathDirs`, `resolveAgentLaunch`, `runAgent`); `command.mjs:146, 251` por busca |
| Testes do alvo | `agent.unit` e `command.cli` inteiros (os únicos com diff desde `e710dc6`); demais por um Grep de asserções por arquivo, mais leitura dos trechos citados abaixo |
| `tests/integrations/helpers/launch.mjs` e `cli.mjs` | trechos: o PATH dos agentes de fixture (`launchEnv`, `PATH: bin`) e o `baseEnv` |
| `code-review.config.json` | diff da feature: só o acréscimo de `roundOverrides["25"]` (`light`, `maxRounds` 5, com 6425235841); globais e outras issues iguais |
| `verifier-round6/profile-comparison.json` | lido como auditoria **externa** do orquestrador (não a executei; ver "Perfil pessoal") |
| `.checks/issue-25-agent-launch.build.md` | não usado como prova; os números do autor não entram neste relatório |

Sem fonte vinculante de UI (perfil `light`). Fault injection, `Coverage` e `Test policy` não foram executados.

## Ambientes e execuções — verified at `ffc5937`

As execuções foram feitas em sequência, uma por vez, sem cópias concorrentes. Os logs estão em `.checks/code-review/issue-25/verifier-round6/` (pasta ignorada). Alvo de A, B e C, numa invocação só por ambiente: `node --test --test-concurrency=4 --test-reporter=spec --test-reporter-destination=<spec> --test-reporter=tap --test-reporter-destination=<tap> tests/integrations/launch/*.test.mjs tests/integrations/hermes-harness.unit.test.mjs`.

| # | Ambiente | Execução | Resultado |
| --- | --- | --- | --- |
| A | Windows 11, Node v24.22.1 (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10, `npm_execpath` ausente; 17:08:49–17:10:39 | alvo (`A-win-24.22.1.*`) | 98 testes: **93 pass, 0 fail, 5 skip**, exit 0. Diagnóstico: variante link do C17 não executada (sem privilégio de symlink de arquivo) |
| B | Windows 11, Node v24.13.0 oficial (`ci-node-24.13.0/node-v24.13.0-win-x64/node.exe`) no início do `PATH`, npm 11.6.2 adjacente, `npmCli()` = `…\node-v24.13.0-win-x64\node_modules\npm\bin\npm-cli.js`, `npm_execpath` ausente; 17:10:50–17:12:14 | alvo (`B-win-24.13.0.*`) | 98 testes: **93 pass, 0 fail, 5 skip**, exit 0. O mesmo diagnóstico do C17 |
| C | WSL `Ubuntu`, `oldboydev` uid 1000, `bash --noprofile --norc`, `/usr/bin/node` v24.13.0 (`execPath` `/usr/bin/nsolid`), npm 11.6.2, Python 3.12.3, `hermes` ausente (consulta `command -v`, sem execução); 17:13:09–17:13:46 | cópia por `git -c core.autocrlf=false archive ffc5937`: tar de 5.468.160 bytes, sha256 `c4e57405…bb6d4e5`, `get-tar-commit-id` = `ffc5937…`, árvore extraída `8b7d5fd8…` = `HEAD^{tree}`, `cli.mjs` 755 (git `100755`), shebang `#!/usr/bin/env node`; `node_modules` existente copiado sem instalar (yaml 2.9.0, smol-toml 1.9.1). Alvo com `/usr/bin/node` (`C-wsl-24.13.0.*`) | 98 testes: **92 pass, 0 fail, 6 skip**, exit 0. O C45 POSIX de processo real rodou (7,96 s). Sem diagnósticos: a variante link do C17 e o caso 126 do C30 rodaram. Árvore igual depois; `~/.skill-me` e `~/.skill-me-authorization.json` ausentes antes e depois |
| D | Windows, Node v24.22.1, npm 11.19.1, Python 3.12.10, `SKILL_ME_HERMES_PYTHON` ausente; Hermes real só pelos testes versionados (versão 0.21.4 carregada do relatório 5, sem consulta à CLI); 17:14:03–17:23:51 | `npm test` (`D-npm-test.txt`), uma execução | **exit 0**. Governança 6: 6 pass. Motor de revisão 16: 16 pass. Doctor 417: 410 pass, 0 fail, 7 skip. Integrações 551: **539 pass, 0 fail**, 12 skip. Total 990: **971 pass, 0 fail, 19 skip** |

Os 98 nomes do alvo aparecem individualmente em cada TAP, os mesmos nos três ambientes (`matrix.txt`), e nenhum filtro rodou com 0 testes. Matriz por check (p/f/s), sem nenhuma falha:

| Check | A Win 24.22.1 | B Win 24.13.0 | C WSL 24.13.0 |
| --- | --- | --- | --- |
| C1–C3, C7, C9–C11, C13, C14, C18–C26, C28–C30, C32, C33, C35, C36 | 1p cada | 1p cada | 1p cada |
| C4 | 3p | 3p | 2p/1s |
| C5 | 1p/1s | 1p/1s | 1p/1s |
| C6 | 1s | 1s | 1p |
| C8 | 2p | 2p | 1p/1s |
| C12, C16, C31, C40 | 2p cada | 2p cada | 2p cada |
| C15 | 1s | 1s | 1p |
| C17 | 4p (link omitido) | 4p (link omitido) | 4p (link executado) |
| C27, C34, C37, C39, C44 | 3p cada | 3p cada | 3p cada |
| C38 | 1p | 1p | 1s |
| C41 | 17p | 17p | 17p |
| C42 | 3p/1s | 3p/1s | 3p/1s |
| C43 | 12p | 12p | 12p |
| **C45** | **2p/1s** (resolução + controle Windows real) | **2p/1s** | **2p/1s** (resolução + POSIX real) |

**Skips do alvo, com o motivo impresso pelo próprio teste.** Em A e B são 5: C45 POSIX (semântica do PATH POSIX), C5 POSIX, C6 e C42 POSIX (sinais POSIX) e C15 (pty só no POSIX). Em C são 6: C4 shim, C45 controle Windows, C5 console, C42 console, C8 LOCALAPPDATA e C38 console, todos só do Windows. Todo caso pulado num ambiente rodou e passou no outro.

**Gate D, nativos do Hermes**: executados e aprovados, nenhum pulado (`D-npm-test.txt:596-607`): I4-C18, I4-C19, I4-C20, I4-C21, I4-C22, I4-C23, I4-C37, I25-C40 harness nativa, os três I23-C8 e I4-C44b. No mesmo gate, os I25 deram 94 pass e 5 skip: os 93 do alvo mais o I25-C40 nativo, e os mesmos 5 skips de plataforma de A. O C45 de resolução passou (`:677`) e o controle Windows real também (`:686`); o C45 POSIX foi pulado no Windows (`:685`).

**Skips do gate D, com motivo**: doctor 7, todos com `skip: process.platform === "win32"` (`tests/doctor/agent-resolution.unit.test.mjs:279, 589`, `fifo-config.cli.test.mjs:30, 75`, `fs-adapter.posix.test.mjs:36, 53, 75`; PATH POSIX, symlink, FIFO). Integrações 12, com o motivo impresso: I4-C15 e T8-C4 (`posix-signals`), I4-C25b (`posix-modes`), I4-C25j/k/l (`posix-acl`, só Linux), I4-C25m (`macos-acl`), I25-C45 POSIX (semântica do PATH POSIX), I25-C5 POSIX, I25-C6 e I25-C42 POSIX (sinais POSIX) e I25-C15 (pty só POSIX). Todos são de plataforma; nenhum é nativo do Hermes nem do alvo sem cobertura em outro ambiente.

## Terceira revisão formal (P2 `agent.mjs:30`) — verified at `ffc5937`

| Item | Situação | Código | Prova (arquivo:linha — valor esperado) |
| --- | --- | --- | --- |
| **P2**: no POSIX, `split(":").filter(Boolean)` descartava os componentes vazios (diretório atual). Com `:B`, o launcher recusava o agente do `cwd` ou escolhia outra instalação | **fechado** | `launchPathDirs` (`agent.mjs:30-35`, chamado em `:42`): PATH ausente → `[]` (`:32`); Windows `split(";").filter(Boolean)`, como antes (`:33`); POSIX `split(":")`, com cada vazio trocado pelo `cwd` na mesma posição (`:34`). O `cwd` é o `process.cwd()` do launcher (`command.mjs:251`, passado em `:146`), o mesmo que o agente herda no `spawn` sem `cwd` (`agent.mjs:113`). `resolveAgents`/`fs-adapter` do doctor sem diff na feature; `src/doctor` e `codex-run.mjs` sem diff desde `9cd06d5`; desde `9cd06d5`, o único arquivo de `src/` alterado é `agent.mjs` | **Decisão do resolver, FS em memória do doctor** (`tests/doctor/helpers/fake-fs-adapter.mjs`, sem diff na feature), `agent:126-155`: `here` = `{command: "/projeto/codex", prefix: []}`, `later` = `{command: "/depois/bin/codex", prefix: []}` (`:132-133`). `:/depois/bin` → `here` (`:137`); `/vazio::/depois/bin` → `here` (`:138`); `/depois/bin:` → `later` (`:139`); `/vazio:` → `here` (`:140`); `::/depois/bin` → `here` (`:141`); `/vazio:::` → `here` (`:142`); `""` → `here` (`:143`); ausente → `{failure: "executable_not_found"}` (`:144`); controles `/depois/bin` e `/vazio:/depois/bin` → `later` (`:135-136`); Windows `;C:\depois\bin;` → `C:\depois\bin\codex.exe` mesmo com `C:\projeto\codex.exe` (`:145`); Windows `""` → `executable_not_found` (`:146`); `assert.deepEqual(observed, expected)` (`:154`). **CLI real POSIX, fixture `fake-agent` (não o Codex real)**, `cmd:157-187`, rodado em C: nos 9 PATHs (`:166-175`), `expected = {status: 7, stdout: "saída do agente ✓\n", agent: <cwd>/codex ou <depois>/codex, argv: ["--", "a b", "", "ç"], cwd, path: <PATH dado>}` (`:182`); PATH ausente → `{status: 127, started: false, stderrFirst: "skill-me: codex não encontrado no PATH [executable_not_found]"}` (`:185`); `:186`. **Controle real Windows** (A/B), `cmd:189-202`: `;<bin>;` → `{status: 7, …, agent: <bin>\claude.exe, argv: C45_ARGS, cwd, path: ";<bin>;"}` com `claude.exe` também no `cwd` (`:199`); PATH `""` → 127 `executable_not_found` (`:200`) |
| **As asserções distinguem a escolha?** | sim (análise; sem fault injection no `light`) | — | Com o código anterior, `:B` e `::B` dariam `later`, e `X:`, `X:::` e `""` dariam 127 com `executable_not_found`. Nos dois casos o objeto observado diverge de `{status: 7, agent: <cwd>/codex, …}` (`cmd:182`) e de `here` (`agent:137-143`). Os controles `B`, `X:B` e `B:` fixam a outra direção. O RED com o código anterior é evidência do autor (`build.md`), não minha |
| **PATH ausente** | política explícita do Landing e do critério 37 | `agent.mjs:32` | `agent:144` e `cmd:185`: 127 `executable_not_found`, sem iniciar o agente. O launcher não inventa caminho padrão. **Não executei, não repeti e não conferi a invocação direta com PATH ausente** |
| Exceção e configuração (`d939df8`) | conferido | `roundOverrides["25"]`: `light`, `maxRounds` 5, `approval` com 6425235841, substituindo o teto de 3 (6423912091); 0 linhas removidas na feature; `scripts/` e `.github/` sem diff na feature | fonte da exceção em `context-bounded65-approved.json` (último comentário) e nas Sources da task |

O AC1 dado como `unmet` pela terceira revisão formal dependia só desse P2. A próxima revisão formal (a 4ª) cabe ao orquestrador.

## Carried / reverified

| Item | Situação nesta rodada |
| --- | --- |
| Execução das provas de C1–C45 | **verified at `ffc5937`**: todas rodaram por inteiro em A, B, C e D |
| C45 (código, provas, distinção da escolha) | **verified at `ffc5937`**, lido nesta rodada |
| Citações de `agent.unit` e `command.cli` (os dois testes com diff desde `e710dc6`) | **verified at `ffc5937`**: os dois lidos inteiros nesta rodada; as linhas abaixo saem da leitura |
| Citações de `prepare.cli`, `session.e2e`, `store.unit`, `end.e2e`, `report.cli`, `docs`, `hermes-harness.unit` e do teste nativo | **revisão de asserções carried from `e710dc6`** (rodada 4, reconfirmada pela rodada 5 em `d939df8`). Conferi que esses arquivos não mudaram desde `e710dc6` (`git diff e710dc6..HEAD -- tests src` só toca `agent.mjs`, `fake-agent.mjs`, `agent.unit` e `command.cli`). Fiz um Grep de asserções por arquivo e li os trechos citados: cada linha abaixo contém a asserção indicada, no HEAD |
| `fake-agent.mjs` | o diff só acrescenta `path` ao probe; todos os testes que o usam reexecutaram verdes |
| Swept existing | **carried from `e710dc6`**: `privacy/`, `traces/` e `observe/` sem diff desde `9cd06d5` |
| Core vendorizado | **verified at `ffc5937`**: `scripts/` e `.github/` sem diff na feature |

## Checks

`cmd` = `tests/integrations/launch/command.cli.test.mjs`, `prep` = `prepare.cli`, `sess` = `session.e2e`, `store` = `store.unit`, `end` = `end.e2e`, `rep` = `report.cli`, `agent` = `agent.unit`, `docs` = `docs.test`, `harn` = `tests/integrations/hermes-harness.unit.test.mjs`, `nat` = `tests/integrations/hermes-plugin.native.test.mjs`. "A/B/C" = passou nos três ambientes desta rodada; "D" = passou também no gate. Os nomes executados são `I25-C<n> …` (os 98 do TAP); os de C40/C44 nativos, `I25-C40 harness nativa…`, `I4-C20`, `I4-C21`, `I4-C22` e `I4-C37`.

| Check | Proof run | Evidência (arquivo:linha — valor esperado) | Revisão | Result |
| --- | --- | --- | --- | --- |
| C1 | A/B/C; D | `cmd:48` `pkg.private === true`; `cmd:49` `bin` = `{"skill-me": "src/integrations/launch/cli.mjs"}`; `cmd:65` `[0, SKILL_ME_HELP, ""]` de outro diretório, depois do `npm link` no prefixo temporário; `cmd:77` `git status` igual | verified | PASS |
| C2 | A/B/C; D | `cmd:96-98` para codex, claude e hermes: `{status: 0, stdout: <o do agente>, stderrFirst: "erro do <agente>", argv: LITERAL_ARGS, stdin: "entrada do <agente> ✓\n"}`; `LITERAL_ARGS` com espaço, aspas, Unicode, `--`, `""`, `%PATH%` e `$HOME` (`cmd:80`) | verified | PASS |
| C3 | A/B/C; D | `cmd:105` `{0: 0, 7: 7}` | verified | PASS |
| C4 | A/B (3), C (2 de unidade); D | `cmd:117-120` `{status: 0, argv: ["exec","texto com espaço","--","ção"], execPath: process.execPath, script: …/@openai/codex/bin/codex.js, sentinel: false}`; `cmd:130-133` `{status: 127, stdout: "", code: true ([launcher_requires_shell]), home/root iguais, sentinel: false}`; `agent:80` (só a linha de invocação do template: eco, pacote alheio, versão ilegível e ausente → `null`); `agent:91, 96, 102, 107, 114, 117-118` | verified | PASS |
| C5 | POSIX em C; Windows em A/B; D | `cmd:224` `launcherGone === false` depois de cada sinal; `cmd:228` `{status: 4, signal: null, signals: ["SIGINT","SIGQUIT","SIGHUP"]}`; `cmd:244-245` (`CTRL_C_EVENT` real) `{stage: "done", generated: true, seen: true, status: 5, signals: ["SIGINT"]}` | verified | PASS |
| C6 | C | `cmd:267` `{status: 0, signal: null, signals: ["SIGTERM"]}` | verified | PASS |
| C7 | A/B/C; D | `prep:93-94` por agente `{status: 127, stdout: "", code: true ([executable_not_found]), asked: false}`; `prep:98` árvore do home igual | carried | PASS |
| C8 | A/B (2), C (1); D | `prep:122-125` texto exato até cada pergunta (`[1, prévia + ROOT_PROMPT]`, `[2, … + CONFIRM_PROMPT]`, `prep:115-121`); `prep:126` árvores iguais até cada resposta; `prep:141-144` LOCALAPPDATA e `AppData\Local` | carried | PASS |
| C9 | A/B/C; D | `prep:163-168` `observe.json` = `{skillMeObserveConfig: 1, root, rootReal, hermesDelivery: [...]}`; `prep:169` `plan.changes` = `[]`; `prep:174` `manualSteps` no stderr; `prep:176` `[SKILL_ME_LAUNCH_ROOT, capturas]` = `[rootReal, 1]` | carried | PASS |
| C10 | A/B/C; D | `prep:189-191` para `n`, vazio, `yes`, `não` e os dois EOF: `{exitCode: 3, code: true ([setup_declined]), trees: before, started: false, root: false}` | carried | PASS |
| C11 | A/B/C; D | `prep:200` `{exitCode: 2, code: true ([root_not_absolute]), asked: 1, trees: before, relative: false, config: false}` | carried | PASS |
| C12 | A/B/C (2); D | `prep:223` `{status: 3, line: "skill-me: preparação pendente [setup_required]; rode skill-me codex num terminal para revisar e confirmar.", trees: before, started: false}`; `prep:387-388` um lado fora do terminal `{status: 3, required: true, asked: false, …}` | carried | PASS |
| C13 | A/B/C; D | `prep:238` `{exitCode: 0, asked: 0, preview: false, config: <SHA-256 anterior>, settings: <SHA-256 anterior>, started: 1}` | carried | PASS |
| C14 | A/B/C; D | `prep:250` `{exitCode: 4, code: [observe_on], started: false, config: false}`; `prep:266` `{exitCode: 4, foreign_artifact, started: false, config: true}`; `prep:276` próxima `{exitCode: 0, asked: 1, rootPrompt: false, changes: true, started: 1}`; `prep:290` `{observeJson: [3, true, 0], settings: [3, true, 0]}` | carried | PASS |
| C15 | C | `prep:398-403` (status 0, prévia e passo de confiança na tela do pty, agente iniciado uma vez); `prep:408` `{status: 3, declined: true, trees: before}` | carried | PASS |
| C16 | A/B/C (2); D | `sess:61` `seen.env` = `{SKILL_ME_LAUNCH_ROOT: rootReal, SKILL_ME_LAUNCH_ID: invocation}`; `sess:67` `{origin: "launch", segment: 1, state: "active", content: true, retentionDays: 7, limits: {maxEvents: 500, maxBytes: 8388608}, launchedAt}`; `sess:69` ponteiro `{launchVersion: 1, invocation, capture, segment: 1, launchedAt}`; `agent:160, 163, 165` | verified (agent) / carried (sess) | PASS |
| C17 | A/B (link omitido), C (link executado); D | `store:54` ponteiro literal; `store:79` `["launch", invocation, 1, "2026-10-26T10:00:00.000Z"]`; `store:110` (fora da forma → `capture_invalid`); `store:156` (ponteiro ilegível, fora da forma ou link → recusado); `sess:300-301` | carried | PASS |
| C18 | A/B/C; D | `sess:111` `{status: 3/3/4, stderr: "skill-me: não foi possível abrir a execução [<código>]\n", started: false, waited: true}` (lock ≥ 2000 ms, `sess:109`); `sess:124` `io_failure` → 5 | carried | PASS |
| C19 | A/B/C; D | `sess:147` `[LAUNCHED(1), LAUNCHED(1)]`; `sess:151` 4 registros; `sess:152-160` `[1, <agente>, h1 da chave da captura]`; `sess:161` manual/automática `[0, 0]`; `sess:165-167` igual ao `privacy ingest --content` | carried | PASS |
| C20 | A/B/C; D | `sess:190-191` só ID, só raiz, raiz relativa e ID inválido → `{bound: false, code: "binding_invalid", entries: 1, committed: 0, persisted: 0, lost: 1}`; `sess:192` árvore igual | carried | PASS |
| C21 | A/B/C; D | `sess:211` bytes iguais (`off`: ausentes, `sess:208`; `on`: presentes, `sess:209`) | carried | PASS |
| C22 | A/B/C; D | `sess:230` `[1, "stopped", 500, 500, {}]`; `sess:236` `[2, "stopped", 4, {}, true, 7, {maxEvents: 500, maxBytes: 8388608}, "launch", …]`; `sess:240-243` o segmento 2 começa no 501º; `sess:244` chave própria; `sess:245` outro produtor no 2 | carried | PASS |
| C23 | A/B/C; D | `sess:282` cabe exatamente `["active", MAX_BYTES, {}, 1]`; `sess:289` `["stopped", ≤ MAX_BYTES, {}]`; `sess:291` `[2, 1, size, {}]` | carried | PASS |
| C24 | A/B/C; D | `store:168` `[opened.capture, "stopped", 1]`; `store:169` `[2, "active", 1, first.launchedAt]` | carried | PASS |
| C25 | A/B/C; D | `end:72-79` 2 capturas `stopped` com `endedAt` ISO, ponteiro ausente, `dropped {unknown_event: 1}`, status 3; `end:80-88` stderr exato (`… encerrada; capturas: 2; eventos gravados: 2.`, segmentos 1 e 2, `consulte com: skill-me report`) | carried | PASS |
| C26 | A/B/C; D | `end:101-109` por agente: `… eventos gravados: 0.`, `skill-me: nada foi gravado nesta execução. Confira a confiança do agente: <manualSteps[0]>` | carried | PASS |
| C27 | A/B/C (3); D | `end:120` `{launch: true, code: "launch_ended", entries: 1, committed: 0, persisted: 0, lost: 1}`; `store:222, 226-228, 234, 236-237, 253, 256-260` | carried | PASS |
| C28 | A/B/C; D | `end:145-147` `{started: true, delivered: true, enqueued: 3, sent: 3, queueFull: 0, failed: 0}`; `end:151-153` `{persisted: 3, states: todos "stopped", status: 0}` | carried | PASS |
| C29 | C (POSIX); A/B; D | `cmd:278` POSIX `{status: null, signal: <o mesmo>}` / Windows `{status: 1, signal: null}`, com resumo; `cmd:295` terminal `{status: null, signal: "SIGINT", signals: ["SIGINT"]}`; `cmd:300` todas `stopped` | verified | PASS |
| C30 | A/B/C; D | `cmd:342` `{status: 127 (ENOENT) / 126, startCode: true, captures: [[1, "stopped", 0]]}` | verified | PASS |
| C31 | A/B/C (2); D | `end:166-175` status 6 do agente; stderr com `[lock_present]`, `continua active`, `encerre com: … privacy stop …` e `continua aberta`; `end:176` `["active", true]`; `end:183` o comando encerra; `end:205-215` E/S: `já não recebe registros`, `["active", false]`; `end:217-219` | carried | PASS |
| C32 | A/B/C; D | `end:242` `["stopped", "active"]`; `end:249-252` registros próprios, chaves diferentes, uma captura por execução | carried | PASS |
| C33 | A/B/C; D | `end:268` `[0, "on"]`; `end:273` `[0, "off", []]`; `end:274` `active`; `end:278` 3× `LAUNCHED(1)`; `end:283` nenhuma automática | carried | PASS |
| C34 | A/B/C (3); D | `rep:82` texto = cabeçalho (`rep:64-71`) + seções `== Segmento s de 2 ==`; `rep:92` `{skillMeLaunchReport: 1, invocation, open: false, segments: [...], missingSegments: [], reports: 2}`; `rep:95` igual ao `report --root --capture`; `rep:104` sem escrita; `rep:130` `[newInv, true]`; `rep:143` a iniciada por último, com o segmento 1 da antiga apagado; `rep:150` ausente `[1]`; `rep:166, 169` `--latest` e `status` só com automáticas | carried | PASS |
| C35 | A/B/C; D | `rep:182-189` `[3, {"schemaVersion":1,"command":"report","status":"error","error":{"code":"not_configured"}}, ""]` e duas vezes `no_launch_capture` | carried | PASS |
| C36 | A/B/C; D | `cmd:350` `--help`/`help` → `[0, SKILL_ME_HELP, ""]`; `cmd:354` sem argumento, `gemini`, `--versao` → `[2, "", SKILL_ME_HELP]`; `cmd:356-368` conteúdo | verified | PASS |
| C37 | A/B/C (3); D | `docs:57` diário antes do on/off; `docs:60-62` blocos `["npm ci","npm link"]`, os três comandos, `skill-me report`; `docs:82` os 9 limites (`docs:44-54`) em README e nos três guias; `docs:88-89` par e precedência; `docs:93` códigos (`docs:14`) | carried | PASS |
| C38 | A/B; D | `prep:355` `["done", 0]`; `prep:361` prévia legível; `prep:363` raiz = caminho digitado com acento; `prep:365` `["linha do agente", realpath(typed)]` | carried | PASS |
| C39 | A/B/C (3); D | `harn:88` `["concluded", 0, 3]`; `harn:100-102` `concluded`, perto de 470 ms, `[12, 12]`; `harn:186-188` harness real `[12, 12, 0]`, `concluded`, `waitedMs ≥ 700` | carried | PASS |
| C40 | A/B/C (2); D com os nativos | `harn:196-198` `failed`, `[false, 5]`; `harn:201` `["inactive", 0]`; `harn:207-208`; `harn:214-219` `[2000, "timeout"]`, `[5000, "timeout"]`; `harn:222-225`. Nativos, só em D: `nat:335` `{capture: "concluded", ingest: "concluded", inactive: "inactive", spawnfail/exit/disconnect: "failed", stall: "timeout"}`, `nat:338, 340`; I4-C20 `nat:228-231`; I4-C21 `nat:238-245`; I4-C37 `nat:322-327` | carried | PASS |
| C41 | A/B/C (17 cada); D | `store:327, 335-340, 357, 360-365, 374-380, 404, 438-448, 456-459, 474-476, 486-487, 505-511, 521-523`; `end:318, 322-334, 384-402, 429-439, 464-475, 505-512, 519-535` | carried | PASS |
| C42 | A/B (unidade 2 + console 1), C (unidade 2 + POSIX 1); D | `agent:187, 196, 206, 211, 214` (guard), `agent:231, 236` (runAgent); `cmd:424` POSIX `{status: null, signal, started: false, captures: [[1,"stopped",0]] ou [], pointers: [], firstLine: "skill-me: abertura cancelada por <SINAL>; o agente não foi iniciado."}`; `cmd:456` Windows `status: 130` | verified | PASS |
| C43 | A/B/C (12 cada); D | `store:560-571, 578-581, 598-600, 619, 626-632`; `end:606-614, 622-626, 647-650, 660-666, 674-685, 707, 727-737, 749-754`, com as linhas literais em `end:545-552, 690-695` | carried | PASS |
| C44 | A/B/C (3 cada); D | `harn:263-271` (desligada sem perda contada e perda parcial → `pending`; perda inteira → `failed`; sem destino → `inactive`); `harn:281-283` `failed` na contagem final; `harn:286, 289` `[1000, "timeout"]`, `[5000, "timeout"]`; `harn:300-304` harness real `failed` com os contadores finais e `["inactive", 0, 0]`; nativos I4-C22 (`nat:251-256`) e I25-C40 em D | carried | PASS |
| C45 | A/B (resolução + controle Windows real), C (resolução + POSIX real); D | `agent:132-146, 154`; `cmd:166-175, 182, 185, 186` (POSIX real em C); `cmd:198-201` (Windows real em A/B) — valores na seção da terceira revisão formal | verified | PASS |

**Checks comprovados: 45/45.** Cada check tem nome executado no TAP e asserção com `arquivo:linha`; nenhum se apoia em filtro com 0 testes.

## Incidente de processo da rodada 5 (preservado; não repetido)

A rodada 5 comprovou 45/45 checks em `d939df8`, mas o processo não foi conforme. Uma sonda extra (`verifier-round5/wsl-path-semantics.sh`), na linha "PATH ausente", iniciou o Codex CLI real do WSL (`/usr/bin/codex`) até 5 vezes, contra a instrução de não executar agentes reais. A auditoria só de metadados do orquestrador (`verifier-round5/process-deviation-audit.json`/`.py`) registrou 12 arquivos do perfil `~/.codex` com mtime dentro da janela. Sem linha de base de conteúdo, não se atribui cada escrita à sonda. Os programas retornaram e não havia processo no scratch da sonda. O relato completo e corrigido é o `.verified.md` da rodada 5, versionado no commit `ffc5937`. Ele e os logs/auditorias de `verifier-round5/` continuam no histórico e não foram editados nem apagados por mim.

Nesta rodada **não repeti, não conferi e não reproduzi** aquele comando nem qualquer sonda. A conclusão sobre PATH ausente vem só das provas versionadas (`agent:144`, `cmd:185`) e da política do Landing.

## Processo desta rodada (o que os meus comandos mostram)

- **Executado**: git (`rev-parse`, `status`, `diff`, `log`, `ls-files`, `check-ignore`, `archive`, `get-tar-commit-id`); versões de `node`, `npm` e `python` no Windows; no WSL, `/usr/bin/node --version`, `npm-cli.js --version`, `python3 --version` e `command -v hermes`, que é só uma consulta ao PATH, sem execução (resultado: ausente); `wsl.exe -l -v`; `wsl.exe -d Ubuntu -u oldboydev -- bash --noprofile --norc` com os meus três scripts (`wsl-prepare.sh`, `wsl-run.sh`, `wsl-cleanup.sh`, nesta pasta); as quatro execuções versionadas A–D, uma por ambiente; `matrix.mjs`, que só lê os TAP; `cleanup-temp.mjs`. No `wsl-run.sh`, `test -e` conferiu só a existência de `~/.skill-me` e `~/.skill-me-authorization.json` (arquivos do skill-me, não de perfil de agente).
- **Não executado**: nenhum `codex`, `claude` ou `hermes` direto (nem `--version`/`--help`) e nenhum `execvp`/`spawn`/`env` com esses nomes fora dos testes versionados; nenhuma sonda antiga ou nova; nenhuma remoção de PATH nem alteração de `HOME`/`CODEX_HOME`/`HERMES_HOME` em comando de diagnóstico; nenhuma leitura de credencial ou de perfil pessoal (`profile-before.json` e `profile-after.json` não foram lidos); nenhum processo de outra sessão encerrado.
- **Agentes nas provas**: por leitura, os agentes iniciados pelo alvo são de fixture. `launchEnv` põe `PATH: bin` (`helpers/launch.mjs:74`), e o C45 usa só diretórios de scratch e vazios (`cmd:166-175`). PATH ausente sai com 127 sem iniciar nada (`cmd:185`). Nenhum teste em `tests/` chama `spawn`/`execFile` com `codex`, `claude` ou `hermes` (Grep sem ocorrência). O Hermes nativo de D entra pelo Python do runtime (`helpers/hermes-runtime.mjs:23-25`, `locateHermesRuntime`), como autorizado. Não auditei cada teste do gate fora do alvo I25 quanto ao ambiente; eles rodaram como estão versionados.

## Perfil pessoal

Não medi o perfil e não afirmo que esteja intacto. Há uma auditoria **externa** do orquestrador, que eu não executei e só li: `verifier-round6/profile-comparison.json`. Escopo declarado: "baseline before Round6 through end of WSL versioned proofs". Linha de base em 1793045069,91 (17:04:29 -03), conferência em 1793045782,42 (17:16:22 -03). 12.113 entradas antes e depois, `errors`, `added`, `removed` e `modified` vazios. A janela cobre as minhas execuções A, B e C (C terminou às 17:13:46) e a limpeza do WSL, mas não o gate D (Windows), que começou às 17:14:03. `profile-before.json` e `profile-metadata-snapshot.py` não foram lidos nem alterados por mim.

## Nível, amostragem e limitações

- Perfil `light`: sem fault injection, `Coverage` ou `Test policy`. A distinção da escolha no C45 é análise das asserções; o RED com o código anterior é evidência do autor.
- PATH ausente: o launcher sai com 127 `executable_not_found` e não usa o caminho padrão do sistema. É a decisão aprovada (Landing e critério 37), não lacuna. Nesta rodada não houve comparação nativa com PATH ausente.
- C45 prova o stdout intacto e o código do agente; stdin e stderr herdados continuam provados pelo C2.
- A semântica nativa (bash, dash, `execvp`, Node) que fundamentou o Landing não foi reexecutada nesta rodada, por instrução. O Landing a registra como medida do autor, e a rodada 5 a conferiu nas linhas com PATH definido. As provas desta rodada fixam o comportamento do launcher, não o dos shells.
- Revisão das asserções carried de `e710dc6` nos arquivos de teste sem diff desde então. As linhas foram reconferidas por Grep no HEAD, mas o julgamento de suficiência de cada asserção desses checks é o da rodada 4.
- Continuam das rodadas anteriores: a variante "lock ausente" de C43 sem teste nomeado; as janelas do plugin em C44; o ramo com várias capturas `active` na falha do encerramento sem prova; recusa e EOF num console real do Windows só em processo/pty; nativos do Hermes pulados na CI; C23 sem asserção de tempo; macOS e o runner da CI não executados.
- Uso real sem sessão de agente: `Unresolved` 2, `blocks go-live`.

## Findings

- **Nenhum achado bloqueante.** O P2 da terceira revisão formal (`agent.mjs:30`) está fechado: código em `agent.mjs:30-35`, provas `agent:126-155` e `cmd:157-202`, verdes no HEAD.
- Nenhuma lacuna de prova: os 45 checks têm teste nomeado executado e asserção localizada. Os skips são de plataforma, e cada caso pulado rodou no outro ambiente.
- Processo desta rodada: conforme (seção própria). O incidente da rodada 5 continua citado e preservado; esta rodada não o repetiu.
- Observação não bloqueante: a auditoria externa do perfil (`profile-comparison.json`) termina às 17:16:22 e não cobre o gate D (Windows). Não há medida minha do perfil em nenhum momento.

## Gate

| Gate | Resultado |
| --- | --- |
| Alvo completo, Windows, Node 24.22.1, concorrência 4 | 98: 93 pass, 0 fail, 5 skip — exit 0 |
| Alvo completo, Windows, Node 24.13.0 oficial (CI) | 98: 93 pass, 0 fail, 5 skip — exit 0 |
| Alvo completo, WSL Ubuntu, `/usr/bin/node` 24.13.0, uid 1000, cópia exata | 98: 92 pass, 0 fail, 6 skip — exit 0 |
| `npm test`, Windows, Node 24.22.1, Hermes real pelos testes | exit 0 — governança 6/6; motor 16/16; doctor 417 (410 pass, 0 fail, 7 skip); integrações 551 (539 pass, 0 fail, 12 skip); total 990: 971 pass, 0 fail, 19 skip; 12 nativos do Hermes aprovados |

Cada suíte rodou uma única vez, sem repetição até ficar verde.

## Limpeza

- `%TEMP%`: a execução B (Node 24.13.0, cujo `rmSync` não apaga caminhos com "ação" no Windows) deixou 320 scratches `skill-me i4 i25 * ação-*`, todos dentro da janela dela (17:10:45–17:12:20). Um único processo Node 24.22.1 os removeu (`cleanup-temp.mjs`/`cleanup-temp.txt`), conferindo que o caminho resolvido é filho direto do `%TEMP%`, é diretório e não é link. Resultado: 320 removidos, 0 recusas, 0 fora da janela; uma nova listagem deu 0.
- WSL: `/tmp/skillme-verifier-r6.wIq1hQ` foi removido por `wsl-cleanup.sh`, depois de conferir o padrão absoluto `/tmp/skillme-verifier-r6.??????`. Nenhum `skillme-verifier-r6*` restante (`C-wsl-cleanup.txt`). Os scratches dos testes foram removidos pelos próprios testes.
- Mantidos na pasta ignorada `verifier-round6/`: logs A–D, `matrix.txt`, o tar do HEAD e os scripts desta rodada. `profile-before.json`, `profile-after.json`, `profile-metadata-snapshot.py` e `profile-comparison.json` são do orquestrador e não foram alterados nem apagados (só o último foi lido). Nada de `verifier-round5/` nem do histórico foi tocado.
- Nenhum processo de outra sessão encerrado. Configuração, estado de review e prefixo npm real não foram tocados. No fim, HEAD `ffc5937` e `git status` com só este arquivo modificado.
