# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25

**Verdict**: **FAIL** — em `a755c37`, a prova de **C28** (`I25-C28`, entregas Hermes em voo) **falhou** na execução B (Windows, Node 24.13.0 oficial, o Node da CI). Passou em A, C e D. Os outros 44 checks passaram em todas as execuções em que rodam. A causa não foi determinada e, por instrução, não reexecutei. O **defeito da CI do PR #28 em C33/C34 está fechado**: as provas passaram no layout isolado do WSL (Node 24.13.0 num prefixo sem `sh` ao lado) e os controles do Windows ficaram iguais.
**Checks**: 44/45 com a prova verde nas quatro execuções; C28 vermelho em 1 de 4 (B).
**Conformidade do processo do Verifier nesta rodada**: CONFORME, pelo que os meus comandos mostram (seção "Processo desta rodada", com três observações menores). Nenhum `codex`, `claude`, `hermes` ou outro agente real executado; nenhuma sonda; nenhuma leitura de perfil pessoal ou credencial.
**Profile**: light (sem fault injection, `Coverage` ou `Test policy`; sem fonte vinculante de UI).
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..a755c377148520c1f9ce5a0ac2493bef9d3ff6c2` (feature inteira, 48 commits, checks C1–C45). O produto não muda desde `7ab5dbf`: `src`, `package.json`, `scripts`, `.github` e `code-review.config.json` sem diff desde `ffc5937`. Desde `d11030f` (formal 4 `ready`), só mudam provas e documentação: `helpers/launch.mjs`, `helpers/observe.mjs`, `end.e2e.test.mjs` e `report.cli.test.mjs` (`2dfe676`), além de checklist, task e build.
**Round**: 7 - scoped, a **última** autorizada. Exceção do proprietário só para a #25: “Autorizar a 7ª verificação” ([comentário 6431483843](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6431483843)), que leva o teto do Verifier de 6 para 7. O teto formal continua 5, com 4 consumidas. Escopo: todos os C1–C45, com atenção à correção da CI depois de `d11030f`. As rodadas 1–6 continuam no histórico do git, inclusive o incidente da rodada 5.
**Verifier**: subagente independente novo (Claude Opus 5.5). Não é o autor nem um Verifier anterior; autor ≠ verificador. Código, testes, critérios, checklist e configuração foram tratados como somente leitura. Nenhum commit, push, PR, merge, `review:run` nem mudança de limite ou estado. A revisão formal 5 é do orquestrador.

Data: 26/10/2026, 22:37–22:58 (-03). HEAD `a755c37` (árvore `0efb65f7…`) do início ao fim. `git status --porcelain=v1 -uall` vazio antes (`verifier-round7/git-status-before.txt`), depois de D e antes deste arquivo; ao final, só este arquivo muda. O relatório da rodada 6 (versão de `d11030f`) foi lido inteiro antes de ser substituído.

## Veredito em uma linha

**FAIL por C28 em B.** O alvo de 99 testes rodou uma vez em cada ambiente. Windows Node 24.22.1 (A): 93 pass, 0 fail, 6 skip. **Windows Node 24.13.0 (B): 92 pass, 1 fail (I25-C28), 6 skip, exit 1.** WSL com o Node 24.13.0 copiado num prefixo sem `sh` (C): 93 pass, 0 fail, 6 skip. O `npm test` completo no Windows (D) saiu com **0**: 991 testes, 971 pass, 0 fail, 20 skip, com os 12 nativos do Hermes aprovados, o C28 e o T7-C10 inclusive. A correção da CI (C33/C34, `2dfe676`) está provada no layout que distingue o defeito. A falha de C28 não está na superfície dessa correção, mas é uma prova vermelha no HEAD e não a descarto.

## Fontes lidas nesta rodada

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `tlc-implement/references/verify.md` | inteiros: perfil `light` |
| `.tasks/issue-25-agent-launch.md` | inteiro (critérios 1–37; Sources com 6431483843, 6425235841, 6423912091, 6419121665) |
| `.checks/issue-25-agent-launch.md` | inteiro: Landing, inclusive "Ambiente do npm run nas provas" (`:60`), C1–C45 com o acréscimo de C33 (`:180`), Swept, Handoff |
| `.checks/code-review/issue-25/context-ci28-verifier7-approved.json` | inteiro: 6 ACs e 12 comentários, os dois últimos com o pedido e a autorização 6431483843 |
| `.checks/code-review/issue-25/formal-review4.stdout.txt` | inteiro: `ready` em `d11030f`, 6 ACs `met`, sem achados; não cobre o HEAD atual |
| `.checks/issue-25-agent-launch.verified.md` da rodada 6 | inteiro, antes de substituí-lo |
| `.checks/issue-25-agent-launch.build.md` | a seção "CI do PR #28" e o diagnóstico (`:635-788`); **relato do autor, não prova minha** |
| Diff `d11030f..HEAD -- tests/` | inteiro (4 arquivos) |
| `helpers/launch.mjs` `:1-142`, `helpers/observe.mjs` inteiro, `helpers/cli.mjs` `:1-60`, `fixtures/launch/fake-agent.mjs` `:100-150`, `fixtures/launch/hermes-plugin-session.py` inteiro | para interpretar a correção e a falha de C28 |
| `end.e2e.test.mjs`, `report.cli.test.mjs` | asserções por Grep no HEAD, mais a leitura dos trechos citados (os dois arquivos de teste tocados) |
| Demais testes do alvo | sem diff desde `ffc5937` (`git diff ffc5937..HEAD` com 0 linhas em cada um); amostra de linhas citadas por R6 relida no HEAD: `prep:223`, `sess:67-69`, `store:168-169`, `cmd:48-77, 182-185`, `harn:263-271`, `docs:82` |

## Ambientes e execuções — verified at `a755c37`

Execuções em sequência, uma por ambiente, sem nenhuma repetição. Logs em `.checks/code-review/issue-25/verifier-round7/` (pasta ignorada). Alvo de A, B e C numa invocação só: `node --test --test-concurrency=4 --test-reporter=spec … --test-reporter=tap … tests/integrations/launch/*.test.mjs tests/integrations/hermes-harness.unit.test.mjs`.

| # | Ambiente | Resultado |
| --- | --- | --- |
| A | Windows 11, Node v24.22.1 (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10, `npm_execpath` ausente; `npmCli()` = `C:\nvm4w\nodejs\node_modules\npm\bin\npm-cli.js`; 22:37:33–22:39:53 (`A-win-24.22.1.*`) | 99 testes: **93 pass, 0 fail, 6 skip**, exit 0. Diagnóstico impresso: variante link do C17 não executada (sem privilégio de symlink de arquivo) |
| B | Windows 11, Node v24.13.0 oficial (`ci-node-24.13.0/node-v24.13.0-win-x64/node.exe`) no início do `PATH`, npm 11.6.2 adjacente (`npmCli()` no `node_modules` do zip), `npm_execpath` ausente; 22:40:04–22:43:17 (`B-win-24.13.0.*`) | 99 testes: **92 pass, 1 fail, 6 skip, exit 1**. A falha: **I25-C28** (`end.e2e.test.mjs:143`, `undefined !== 0`, 62.170 ms). O mesmo diagnóstico do C17 |
| C | WSL `Ubuntu`, `oldboydev` uid 1000, `wsl.exe --exec bash --noprofile --norc` com os meus scripts. Cópia: `git -c core.autocrlf=false archive a755c37`, tar de 5.498.880 bytes, sha256 `e3b54433…20fdb98ad0`, `get-tar-commit-id` = `a755c377…`, árvore extraída `0efb65f7…` = `HEAD^{tree}`, `cli.mjs` 755 (git `100755`), `#!/usr/bin/env node`. `node_modules` existente copiado, sem instalação nem rede (yaml 2.9.0, smol-toml 1.9.1). **Prefixo isolado como o `hostedtoolcache`**: `prefix/bin` = `node npm npx`, **sem `sh`** (`sh_beside_node=nao`); `node` é cópia byte a byte de `/usr/bin/nsolid` (sha256 `150946e4…bb6351` igual), v24.13.0, `execPath` = `<scratch>/prefix/bin/node`; npm 11.6.2 copiado em `prefix/lib/node_modules/npm`; `npmCli()` = esse npm. `env -i`, `HOME=<scratch>/home`, `LANG=C.UTF-8`, **`PATH=<scratch>/prefix/bin:<scratch>/tools`, sem `/usr/bin`**. `tools` só com links a `/usr/bin/{sh,git,python3,id,grep,mkfifo}` (Python 3.12.3); nenhum agente, `node`, `npm`, `npx` ou `corepack`. 22:47:13–22:47:51 (`C-wsl-24.13.0-isolado.*`) | 99 testes: **93 pass, 0 fail, 6 skip**, exit 0. Rodaram e passaram: `I25-C33` (os 2, **inclusive a prova nomeada do arranjo**, 259 ms) e os 3 `I25-C34`. A variante link do C17 e o caso 126 do C30 rodaram, sem diagnóstico. Árvore igual antes e depois (`0efb65f7…`). `/home/oldboydev/.skill-me` e `.skill-me-authorization.json` ausentes antes e depois (só `test -e`). O home do scratch ficou vazio |
| D | Windows, Node v24.22.1, npm 11.19.1, Python 3.12.10, `SKILL_ME_HERMES_PYTHON` ausente, 32 núcleos lógicos; 22:48:12–22:55:54 (`D-npm-test.*`) | `npm test`, uma execução: **exit 0**. Governança 6: 6 pass. Motor de revisão 16: 16 pass. Doctor 417: 410 pass, 0 fail, 7 skip. Integrações 552: **539 pass, 0 fail, 13 skip**. Total **991: 971 pass, 0 fail, 20 skip**. I25 no gate: 94 pass, 6 skip (o alvo mais o I25-C40 nativo) |

Os 99 nomes do TAP são os mesmos nos três ambientes (`matrix.txt`), e há um nome por check para os 45 checks. Nenhum filtro rodou com 0 testes. Matriz por check (pass/fail/skip):

| Check | A Win 24.22.1 | B Win 24.13.0 | C WSL isolado 24.13.0 |
| --- | --- | --- | --- |
| C1–C3, C7, C9–C11, C13, C14, C18–C26, C29, C30, C32, C35, C36 | 1p cada | 1p cada | 1p cada |
| **C28** | 1p | **1f** | 1p |
| C4 | 3p | 3p | 2p/1s |
| C5 | 1p/1s | 1p/1s | 1p/1s |
| C6 | 1s | 1s | 1p |
| C8 | 2p | 2p | 1p/1s |
| C12, C16, C31, C40 | 2p cada | 2p cada | 2p cada |
| C15 | 1s | 1s | 1p |
| C17 | 4p (link omitido) | 4p (link omitido) | 4p (link executado) |
| **C33** | **1p/1s** (arranjo POSIX pulado) | **1p/1s** | **2p** (com o arranjo) |
| C27, C34, C37, C39, C44 | 3p cada | 3p cada | 3p cada |
| C38 | 1p | 1p | 1s |
| C41 | 17p | 17p | 17p |
| C42 | 3p/1s | 3p/1s | 3p/1s |
| C43 | 12p | 12p | 12p |
| C45 | 2p/1s | 2p/1s | 2p/1s |

**Skips do alvo, com o motivo impresso pelo próprio teste.** Em A e B são 6: C45 POSIX ("componente vazio do PATH como diretório atual é semântica do POSIX"), C5 POSIX, C6 e C42 POSIX ("sinais POSIX: o Windows não tem grupo de processos…"), **C33 arranjo ("o npm do Windows roda o script pelo ComSpec, não por um sh do PATH")** e C15 ("pseudoterminal só no POSIX"). Em C também são 6, todos só do Windows: C4 shim, C45 controle, C5 console, C42 console, C8 LOCALAPPDATA e C38 console. Todo caso pulado num ambiente rodou e passou no outro.

**Gate D, nativos do Hermes**: executados e aprovados, nenhum pulado (`D-npm-test.txt:596-607`): I4-C18, I4-C19, I4-C20, I4-C21, I4-C22, I4-C23, I4-C37, I25-C40 harness nativa, os três I23-C8 e I4-C44b. No mesmo gate passaram o I25-C28 (`:701`), o T7-C10 (`:1030`), o T8-C15 (`:1038`) e o I4-C36 (`:580`).

**Skips do gate D, com motivo**: doctor 7, `# SKIP` sem texto (`D-npm-test.txt:60, 77, 398, 399, 404-406`: `agent-resolution-formal5-2` e `-C2` POSIX, `fifo-config-formal8-4` ×2, `fs-adapter-formal8-4` ×3; PATH POSIX, symlink, FIFO). R6 os ligou a `skip: process.platform === "win32"`; não reli as linhas, e os arquivos não mudaram na feature. Integrações 13, com o motivo impresso: I4-C15 e T8-C4 (`posix-signals`), I4-C25b (`posix-modes`), I4-C25j/k/l (`posix-acl`, só Linux), I4-C25m (`macos-acl`), I25-C45 POSIX, I25-C5, I25-C6, I25-C42 POSIX, **I25-C33 arranjo** e I25-C15. Todos são de plataforma; nenhum é nativo do Hermes. Runner: `scripts/test-integrations.mjs:14` `MAX_PARALLEL_FILES = 8` e `:16` `min(núcleos − 1, 8)`, sem diff na feature; com 32 núcleos, 8 arquivos. O teto 8 da #23 está preservado.

## Falha de B: I25-C28 — verified at `a755c37` (não reexecutado)

| Item | O que se vê |
| --- | --- |
| Asserção | `end.e2e.test.mjs:143` `assert.equal(run.status, 0, run.out)`: atual `undefined`, esperado `0`, mensagem gerada (sem `run.out`). Duração 62.170 ms; em A 5.747 ms; em C 1.191 ms; em D passou |
| O que o teste leu | `writeScenario(work, "plugin", …)` grava o cenário em `<work>/plugin.json` (`helpers/launch.mjs:138-141`), e o `output` do passo `run` é o mesmo `<work>/plugin.json` (`end:137-139`). O arquivo deixado por B (copiado em `verifier-round7/B-c28-leftover/plugin.json-scenario-not-overwritten.json`) **ainda é o cenário**: o agente de fixture nunca gravou `{status, out}` (`fake-agent.mjs:137-138`) |
| Estado da execução deixado por B | (`B-c28-leftover/capture-state.json`, `launch-pointer.json`): segmento 1 `active`, `endedAt: null`, `counters.accepted` 0 e `persisted` 0; ponteiro da execução presente. Nenhum registro chegou à captura, e a execução não foi encerrada |
| Leitura (sem nova execução) | A fixture Python espera até 60 s pelo primeiro registro gravado (`hermes-plugin-session.py:60`). O `runSkillMe` mata o launcher com `SIGKILL` em 60 s (`helpers/launch.mjs:116, 127`). Os 62 s, o ponteiro presente e a captura `active` batem com um launcher encerrado à força pelo prazo do teste enquanto o primeiro registro do Hermes não tinha chegado ao store. Esse é o comportamento documentado do encerramento forçado (`Unresolved` 5), não um encerramento falho do produto. O `observe.json` da fixture aponta a entrega para o Node 24.13.0 do zip (`B-c28-leftover/home-observe.json`) |
| Causa | **Não determinada.** Hipótese compatível, não confirmada: o primeiro registro se perdeu na entrega (por exemplo, prazo de entrega sob carga, como a classe do T7-C10) ou o processo de entrega não gravou. Não há stderr do launcher nem `observer_stats`: o teste falha antes de imprimir `result.stderr`, e o Python foi encerrado junto. Não abri sondas nem repeti, por instrução |
| Histórico | O C28 passou em todas as rodadas anteriores registradas (R1–R6, inclusive B em R6) e no relato do autor. É a primeira falha registrada deste teste |
| Processos | Depois da falha, nenhum `hermes.exe` de fixture estava rodando (`tasklist`). Havia `python.exe` de outras origens, que não identifiquei como meus e não toquei |

**Observação sobre o teste (não bloqueante, fora do escopo da correção, sem proposta minha de mudança):** o `output` com o mesmo nome do cenário e a espera da fixture igual ao prazo do `runSkillMe` fazem essa falha aparecer como `undefined !== 0`, sem o stderr do launcher nem os contadores do plugin. O teste não passa por engano (o agente não gravar já falha), mas o diagnóstico se perde.

## Correção da CI do PR #28 (C33/C34) — verified at `a755c37`

| Item | Situação | Evidência |
| --- | --- | --- |
| Contrato (Landing `:60`, acréscimo de C33 `:180`) | POSIX: o PATH do `npm run` de C33 e C34 é uma pasta do scratch só com `node` (link ao `process.execPath`) e `sh` (link a `/bin/sh`), seguida do bin de fixture; nenhum diretório real. Windows como antes (diretório do Node + fixture; o npm usa o `ComSpec`). `singleJson` com o `status`. Asserções, skips, prazos, workflow e `fail-fast` sem mudança | — |
| Implementação (só provas) | conferida | `helpers/launch.mjs:62-70`: Windows `dir = path.dirname(process.execPath)` (`:63`); POSIX `dir = scratch(…)` com `symlinkSync(process.execPath, …/node)` e `symlinkSync("/bin/sh", …/sh)` (`:64-68`); `PATH: [dir, env.PATH]` (`:69`). Consumo: `end:266` (C33) e `report.cli:167` (C34). `helpers/observe.mjs:33` traz `status=${result.status}` no erro. O diff de `d11030f..HEAD -- tests/` só faz isso; asserções anteriores de C33 e C34 iguais (`end:268-284`, `report.cli:168`) |
| Prova nomeada `I25-C33 arranjo do npm run (POSIX)` (`end:290-311`), rodou em C | **distingue o defeito** | Lado da CI, com uma pasta só com `node` (`end:294-295`) e o PATH `[nodeOnly, bin]` (`end:300`): `end:302` `assert.notEqual(ciLayout.status, 0)` e `end:303` `assert.match(ciLayout.stderr, /spawn sh ENOENT/)`. PATH das provas: `end:306` `rest` = `[bin]` ("depois da pasta, só o bin de fixture"); `end:307` `readdirSync(dir).sort()` = `["node", "sh"]`; `end:308` links = `[process.execPath, "/bin/sh"]`; `end:310` `npm run status` → `[0, "ok", "off"]`. Os esperados são literais do Landing, sem recompor a regra do helper. Se o helper voltasse a usar o diretório do Node no POSIX, `:307` falharia em qualquer host (na CI `node npm npx corepack`, no WSL o `/usr/bin` inteiro). Se herdasse `/usr/bin`, falharia `:306` |
| C33 e C34 no layout do defeito | **passaram** (C) | Em C, `prefix/bin` não tem `sh` e o PATH não tem `/usr/bin`. É a mesma condição que, com o arranjo anterior (`path.dirname(process.execPath)`), dava `npm run --silent` 254 sem saída na CI. A negativa de `end:302-303` mostra, neste ambiente e no HEAD, que um PATH sem `sh` falha com `spawn sh ENOENT`. Não rodei o código anterior: o RED em `d11030f` (`red-wsl-isolado-24.13.0.spec.txt`) é **evidência do autor** |
| Windows preservado | **passaram** (A, B) | C33 (1p) e os 3 C34 em A e B, com o ramo do Windows inalterado (`helpers/launch.mjs:63`). O arranjo pulado tem motivo impresso. Não há asserção sobre a composição do PATH no Windows: a prova é o comportamento de C33/C34 |
| Defeito da CI | **fechado** no layout isolado do WSL | A CI real (Ubuntu, macOS, Windows) só verifica depois do push; o runner do GitHub e o macOS não foram executados aqui |

## Carried / reverified

| Item | Situação nesta rodada |
| --- | --- |
| Execução das provas de C1–C45 | **verified at `a755c37`**: todas rodaram por inteiro em A, B, C e D. C28 falhou em B |
| C33, C34 e a correção da CI | **verified at `a755c37`**: diff, helper e asserções lidos nesta rodada |
| Citações de `end.e2e` e `report.cli` (os dois testes tocados) | **atualizadas no HEAD**: `end.e2e` desloca +26 linhas depois de `:285`; `report.cli` desloca −1 depois de `:166`. As linhas abaixo saem do Grep no HEAD |
| Citações e julgamento de suficiência de `prepare.cli`, `session.e2e`, `store.unit`, `agent.unit`, `command.cli`, `docs.test`, `hermes-harness.unit` e do teste nativo | **carried from R6 at `ffc5937`**: esses arquivos e `fake-agent.mjs` têm 0 linhas de diff em `ffc5937..HEAD`, então as linhas de R6 continuam valendo; a amostra relida confere. Para os arquivos que R6 já trazia carried, o julgamento original é o da rodada 4 em `e710dc6` (reconfirmado por R5 e R6); `agent.unit` e `command.cli` foram julgados por R6 em `ffc5937` |
| Swept existing, core vendorizado | **carried from `ffc5937`**: `src/`, `scripts/` e `.github/` sem diff desde então (`scripts/` e `.github/` sem diff na feature inteira) |
| Exceção e configuração | `code-review.config.json` sem diff desde `ffc5937`: `roundOverrides["25"]` com `light` e `maxRounds` 5 (6425235841). O teto de 7 Verifiers é registro de processo (task e checklist `:5`, Sources), não configuração |

## Checks

`cmd` = `tests/integrations/launch/command.cli.test.mjs`, `prep` = `prepare.cli`, `sess` = `session.e2e`, `store` = `store.unit`, `end` = `end.e2e`, `rep` = `report.cli`, `agent` = `agent.unit`, `docs` = `docs.test`, `harn` = `tests/integrations/hermes-harness.unit.test.mjs`, `nat` = `tests/integrations/hermes-plugin.native.test.mjs`. "A/B/C" = passou nos três ambientes; "D" = passou também no gate. Os nomes executados são `I25-C<n> …` (os 99 do TAP); os de C40/C44 nativos são `I25-C40 harness nativa…`, `I4-C20`, `I4-C21`, `I4-C22` e `I4-C37`.

| Check | Proof run | Evidência (arquivo:linha — valor esperado) | Revisão | Result |
| --- | --- | --- | --- | --- |
| C1 | A/B/C; D | `cmd:48` `pkg.private === true`; `cmd:49` `bin` = `{"skill-me": "src/integrations/launch/cli.mjs"}`; `cmd:65` `[0, SKILL_ME_HELP, ""]` de outro diretório, depois do `npm link` no prefixo temporário; `cmd:77` `git status` igual | carried (R6) | PASS |
| C2 | A/B/C; D | `cmd:96-98` para codex, claude e hermes: `{status: 0, stdout: <o do agente>, stderrFirst: "erro do <agente>", argv: LITERAL_ARGS, stdin: …}`; `LITERAL_ARGS` com espaço, aspas, Unicode, `--`, `""`, `%PATH%` e `$HOME` (`cmd:80`) | carried (R6) | PASS |
| C3 | A/B/C; D | `cmd:105` `{0: 0, 7: 7}` | carried (R6) | PASS |
| C4 | A/B (3), C (2); D | `cmd:117-120` `{status: 0, argv: [...], execPath: process.execPath, script: …/@openai/codex/bin/codex.js, sentinel: false}`; `cmd:130-133` `{status: 127, code: [launcher_requires_shell], …, sentinel: false}`; `agent:80, 91, 96, 102, 107, 114, 117-118` | carried (R6) | PASS |
| C5 | POSIX em C; Windows em A/B; D | `cmd:224` `launcherGone === false`; `cmd:228` `{status: 4, signal: null, signals: ["SIGINT","SIGQUIT","SIGHUP"]}`; `cmd:244-245` `CTRL_C_EVENT` real `{stage: "done", generated: true, seen: true, status: 5, signals: ["SIGINT"]}` | carried (R6) | PASS |
| C6 | C | `cmd:267` `{status: 0, signal: null, signals: ["SIGTERM"]}` | carried (R6) | PASS |
| C7 | A/B/C; D | `prep:93-94` `{status: 127, stdout: "", code: true ([executable_not_found]), asked: false}`; `prep:98` árvore igual | carried | PASS |
| C8 | A/B (2), C (1); D | `prep:122-125` texto exato até cada pergunta; `prep:126` árvores iguais; `prep:141-144` LOCALAPPDATA e `AppData\Local` | carried | PASS |
| C9 | A/B/C; D | `prep:163-168` `observe.json` = `{skillMeObserveConfig: 1, root, rootReal, hermesDelivery}`; `prep:169` `plan.changes` = `[]`; `prep:174` `manualSteps`; `prep:176` `[rootReal, 1]` | carried | PASS |
| C10 | A/B/C; D | `prep:189-191` `{exitCode: 3, code: [setup_declined], trees: before, started: false, root: false}` para `n`, vazio, `yes`, `não` e EOF | carried | PASS |
| C11 | A/B/C; D | `prep:200` `{exitCode: 2, code: [root_not_absolute], asked: 1, trees: before, relative: false, config: false}` | carried | PASS |
| C12 | A/B/C (2); D | `prep:223` `{status: 3, line: "skill-me: preparação pendente [setup_required]; rode skill-me codex num terminal…", trees: before, started: false}`; `prep:387-388` | carried | PASS |
| C13 | A/B/C; D | `prep:238` `{exitCode: 0, asked: 0, preview: false, config: <SHA-256>, settings: <SHA-256>, started: 1}` | carried | PASS |
| C14 | A/B/C; D | `prep:250` `{exitCode: 4, code: [observe_on], started: false}`; `prep:266` `{exitCode: 4, foreign_artifact, …}`; `prep:276`; `prep:290` `{observeJson: [3, true, 0], settings: [3, true, 0]}` | carried | PASS |
| C15 | C | `prep:398-403`; `prep:408` `{status: 3, declined: true, trees: before}` | carried | PASS |
| C16 | A/B/C (2); D | `sess:61` env `{SKILL_ME_LAUNCH_ROOT: rootReal, SKILL_ME_LAUNCH_ID: invocation}`; `sess:67` `{origin: "launch", segment: 1, state: "active", content: true, retentionDays: 7, limits: {maxEvents: 500, maxBytes: 8388608}, launchedAt}`; `sess:69` ponteiro `{launchVersion: 1, invocation, capture, segment: 1, launchedAt}`; `agent:160, 163, 165` | carried | PASS |
| C17 | A/B (link omitido), C (link executado); D | `store:54`; `store:79` `["launch", invocation, 1, "2026-10-26T10:00:00.000Z"]`; `store:110`; `store:156`; `sess:300-301` | carried | PASS |
| C18 | A/B/C; D | `sess:111` `{status: 3/3/4, stderr: "skill-me: não foi possível abrir a execução [<código>]\n", started: false, waited: true}`; `sess:124` `io_failure` → 5 | carried | PASS |
| C19 | A/B/C; D | `sess:147`; `sess:151`; `sess:152-160` `[1, <agente>, h1 da chave]`; `sess:161` `[0, 0]`; `sess:165-167` igual ao `privacy ingest --content` | carried | PASS |
| C20 | A/B/C; D | `sess:190-191` `{bound: false, code: "binding_invalid", entries: 1, committed: 0, persisted: 0, lost: 1}`; `sess:192` | carried | PASS |
| C21 | A/B/C; D | `sess:211` bytes iguais (`sess:208` off, `sess:209` on) | carried | PASS |
| C22 | A/B/C; D | `sess:230` `[1, "stopped", 500, 500, {}]`; `sess:236`; `sess:240-245` | carried | PASS |
| C23 | A/B/C; D | `sess:282` `["active", MAX_BYTES, {}, 1]`; `sess:289`; `sess:291` | carried | PASS |
| C24 | A/B/C; D | `store:168` `[opened.capture, "stopped", 1]`; `store:169` `[2, "active", 1, first.launchedAt]` | carried | PASS |
| C25 | A/B/C; D | `end:72-79` 2 capturas `stopped`, `endedAt` ISO, ponteiro ausente, `dropped {unknown_event: 1}`, status 3; `end:80-88` stderr exato | carried (linhas iguais no HEAD) | PASS |
| C26 | A/B/C; D | `end:101-109` `… eventos gravados: 0.` e `skill-me: nada foi gravado nesta execução. Confira a confiança do agente: <manualSteps[0]>` | carried (linhas iguais) | PASS |
| C27 | A/B/C (3); D | `end:120` `{launch: true, code: "launch_ended", entries: 1, committed: 0, persisted: 0, lost: 1}`; `end:121`; `store:222, 226-228, 234, 236-237, 253, 256-260` | carried (linhas iguais) | PASS |
| **C28** | **A, C e D pass; B fail** | `end:143` `run.status === 0`; `end:145-149` `{started: true, delivered: true, enqueued: 3, sent: 3, queueFull: 0, failed: 0}`; `end:151-155` `{persisted: 3, states: todos "stopped", status: 0}`; `end:156` `eventos gravados: 3.` | asserções suficientes (carried); **falha em B no HEAD** | **FAIL** (seção própria) |
| C29 | C (POSIX); A/B; D | `cmd:278` POSIX `{status: null, signal}` / Windows `{status: 1, signal: null}`; `cmd:295`; `cmd:300` todas `stopped` | carried (R6) | PASS |
| C30 | A/B/C; D | `cmd:342` `{status: 127 (ENOENT) / 126, startCode: true, captures: [[1, "stopped", 0]]}` | carried (R6) | PASS |
| C31 | A/B/C (2); D | `end:166-175` status 6; stderr com `[lock_present]`, `continua active`, `encerre com: … privacy stop …`, `continua aberta`; `end:176` `["active", true]`; `end:183` o comando encerra; `end:205-215` E/S `["active", false]`; `end:217-219` | carried (linhas iguais) | PASS |
| C32 | A/B/C; D | `end:242` `["stopped", "active"]`; `end:249-252` registros e chaves próprios, uma captura por execução | carried (linhas iguais) | PASS |
| **C33** | A/B (1 + arranjo pulado), **C (2, com o arranjo no layout sem `sh`)**; D | `end:266` `npmScriptEnv`; `end:268` `[0, "on"]`; `end:269` `active`; `end:273` `[0, "off", []]`; `end:274` `active`; `end:278` 3× `LAUNCHED(1)`; `end:279-282` `e-1…e-3` na mesma captura; `end:283` nenhuma automática; `end:284` uma captura. Arranjo: `end:302-303, 306-308, 310` (seção da CI) | **verified** | PASS |
| **C34** | A/B/C (3), **C no layout sem `sh`**; D | `rep:82` texto = cabeçalho (`rep:64-71`) + seções `== Segmento s de 2 ==`; `rep:90-93` `{skillMeLaunchReport: 1, invocation, open: false, segments: [...], missingSegments: [], reports: 2}`; `rep:95` igual ao `report --root --capture`; `rep:104` sem escrita; `rep:130` `[newInv, true]`; `rep:143` a iniciada por último; `rep:150` ausentes; `rep:166` `--latest` só automática; `rep:168` `npm run status` `[0, 1, [automatic.id]]` com `npmScriptEnv` (`rep:167`) | **verified** | PASS |
| C35 | A/B/C; D | `rep:181-188` `[3, {"schemaVersion":1,"command":"report","status":"error","error":{"code":"not_configured"}}, ""]` e duas vezes `no_launch_capture` | verified (−1 linha) | PASS |
| C36 | A/B/C; D | `cmd:350` `[0, SKILL_ME_HELP, ""]`; `cmd:354` `[2, "", SKILL_ME_HELP]`; `cmd:356-368` | carried (R6) | PASS |
| C37 | A/B/C (3); D | `docs:57`; `docs:60-62`; `docs:82` os 9 limites (`docs:44-54`); `docs:88-89`; `docs:93` | carried | PASS |
| C38 | A/B; D | `prep:355` `["done", 0]`; `prep:361`; `prep:363`; `prep:365` | carried | PASS |
| C39 | A/B/C (3); D | `harn:88` `["concluded", 0, 3]`; `harn:100-102`; `harn:186-188` `[12, 12, 0]`, `concluded`, `waitedMs ≥ 700` | carried | PASS |
| C40 | A/B/C (2); D com os nativos | `harn:196-198, 201, 207-208, 214-219` (`[2000, "timeout"]`, `[5000, "timeout"]`), `harn:222-225`; nativos só em D: `nat:335`, `nat:338, 340`, I4-C20 `nat:228-231`, I4-C21 `nat:238-245`, I4-C37 `nat:322-327` | carried | PASS |
| C41 | A/B/C (17 cada); D | `store:327, 335-340, 357, 360-365, 374-380, 404, 438-448, 456-459, 474-476, 486-487, 505-511, 521-523`; `end:327, 344, 348-360, 390, 410-428, 455-465, 490-501, 531-538, 545-561` | carried (`end` +26 linhas) | PASS |
| C42 | A/B (2 + console), C (2 + POSIX); D | `agent:187, 196, 206, 211, 214, 231, 236`; `cmd:424` POSIX `{status: null, signal, started: false, …, firstLine: "skill-me: abertura cancelada por <SINAL>; o agente não foi iniciado."}`; `cmd:456` Windows `status: 130` | carried (R6) | PASS |
| C43 | A/B/C (12 cada); D | `store:560-571, 578-581, 598-600, 619, 626-632`; `end:617-622, 632-640, 648-652, 673-676, 686-692, 700-711, 733, 753-763, 775-780`, com as linhas literais em `end:571-578, 716-723` | carried (`end` +26 linhas) | PASS |
| C44 | A/B/C (3 cada); D | `harn:263-271` (`pending`, `pending`, `failed`, `failed`, `inactive`, `pending`, `concluded`); `harn:281-283`; `harn:286, 289` `[1000, "timeout"]`, `[5000, "timeout"]`; `harn:300-304`; nativos I4-C22 (`nat:251-256`) e I25-C40 em D | carried | PASS |
| C45 | A/B (resolução + controle Windows), C (resolução + POSIX real); D | `agent:132-146, 154`; `cmd:166-175, 182, 185-186` (POSIX real em C: `{status: 7, stdout, agent, argv: ["--","a b","","ç"], cwd, path}`; PATH ausente → 127 `executable_not_found`); `cmd:198-201` (Windows real em A/B) | carried (R6) | PASS |

**Checks com a prova verde em todas as execuções: 44/45.** **C28: vermelho em B no HEAD** (verde em A, C e D). Cada check tem nome executado no TAP e asserção com `arquivo:linha`; nenhum se apoia em filtro com 0 testes.

## Incidente de processo da rodada 5 (preservado; não repetido)

A rodada 5 comprovou 45/45 checks em `d939df8`, mas o processo não foi conforme. Uma sonda extra (`verifier-round5/wsl-path-semantics.sh`), na linha "PATH ausente", iniciou o Codex CLI real do WSL até 5 vezes. A auditoria só de metadados do orquestrador registrou 12 arquivos do perfil `~/.codex` com mtime dentro da janela. Sem linha de base de conteúdo, não se atribui cada escrita à sonda. A rodada 6 foi conforme, e a auditoria externa dela (12.113 entradas) não observou diferenças adicionais. Os relatórios de R5 e R6 e os logs/auditorias de `verifier-round5/` e `verifier-round6/` continuam no histórico e não foram editados por mim. Nesta rodada **não repeti, não conferi e não reproduzi** aquele comando nem qualquer sonda.

## Processo desta rodada (o que os meus comandos mostram)

- **Executado**: git (`rev-parse`, `status`, `diff`, `log`, `ls-files`, `check-ignore`, `archive`, `get-tar-commit-id`, `show` de versões anteriores deste relatório); versões de `node`, `npm` e `python` no Windows; as quatro execuções versionadas A–D, uma por ambiente; no WSL, `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc` com os meus scripts `wsl-prepare.sh`, `wsl-run.sh` e `wsl-cleanup.sh` (nesta pasta), que só copiam arquivos, consultam versões (`node --version`, `npm-cli.js --version`, `python3 --version`) e rodam o alvo versionado; `matrix.mjs`, que só lê os TAP; `cleanup-temp.mjs` e `cleanup-temp-new.mjs`; `tasklist` filtrado por `hermes.exe` e `python.exe` (só listagem, nada encerrado); leitura e cópia dos arquivos de fixture deixados pelo C28 de B no `%TEMP%` (estado da captura, ponteiro, cenário e `observe.json` da home de teste).
- **Três observações menores**: (1) Antes dos scripts, uma consulta inline ao WSL com `--`, em vez de `--exec`, teve o `$t` expandido pelo shell padrão do usuário. Rodou só `id`, `readlink -f /usr/bin/`, `ls -l /usr/bin/node`, `grep` da versão do npm e listagens de `/tmp`. Nenhum agente, nenhum PATH removido. Depois disso, só `--exec` e scripts. (2) A linha de base do `%TEMP%` foi gravada pelo `ls` do Git Bash, que acrescenta `/` aos diretórios, e por isso o filtro "fora da linha de base" de `cleanup-temp.mjs` não casou nada. A limpeza de B continuou restrita ao padrão `skill-me i4 i25 … ação-XXXXXX`, que tinha **0** entradas antes de A, e à janela de B. A segunda passada (`cleanup-temp-new.mjs`) corrige a leitura e exige a linha de base com exatamente 29.451 nomes. (3) A execução B falhou (seção própria) e não foi repetida.
- **Não executado**: nenhum `codex`, `claude`, `hermes`, `gemini` ou outro agente real (nem `--version`/`--help`), nenhum `execvp`/`spawn` desses nomes fora dos testes versionados, nenhuma sonda antiga ou nova, nenhuma remoção do PATH real em diagnóstico, nenhuma chamada de rede fora dos testes locais versionados, nenhuma leitura de credencial, perfil pessoal ou banco. `profile-before.json` e `profile-metadata-snapshot.py` desta pasta não foram lidos nem alterados. Nenhum processo de outra sessão encerrado.
- **Agentes nas provas**: os do alvo são de fixture. `launchEnv` põe `PATH: bin` (`helpers/launch.mjs:92`), e o `npm run` de C33/C34 recebe só `node`, `sh` e o bin de fixture (`:62-70`). O PATH de C não tinha `/usr/bin` nem pasta com agente real. O Hermes nativo de D entra pelo runtime dos testes versionados (`helpers/hermes-runtime.mjs:33-35`), com HOME temporário, como autorizado. Não auditei cada teste do gate fora do alvo I25 quanto ao ambiente; eles rodaram como estão versionados.

## Perfil pessoal

Não medi o perfil e não afirmo que esteja intacto. Nesta pasta há só a linha de base externa do orquestrador (`profile-before.json`, 22:32, não lida). Até o fim deste relatório não havia `profile-comparison-final.json` nem outra comparação para citar.

## Falhas anteriores e limitações (preservadas)

- **Relato do autor, não prova minha** (`build.md:691-763`): o primeiro `npm test` do Windows em `2dfe676` saiu 1 por `T7-C10` sob carga. Isolado, passou; as integrações completas passaram com 8 e com 4 arquivos (552: 539 pass, 13 skip cada). **Essa intermitência não está resolvida**: no meu D o T7-C10 passou, e uma execução não mede taxa. O teto 8 da #23 é vinculante e não mudou.
- **WSL, gates globais (relato do autor)**: no layout isolado, I4-C36 e `collector-probe-C10` falharam em asserções antigas de duração por `Date.now()`, com o journal mostrando o relógio voltando cerca de 0,68 s a cada ~29 s. Esses gates globais não fazem parte do meu alvo WSL e não os executei no WSL. Fica como limitação. A CI real do GitHub ainda vai verificar Ubuntu, macOS e Windows depois do push.
- **C28 intermitente nesta rodada** (seção própria): causa não determinada, sem nova execução.
- C33/C34: o RED com o arranjo anterior é do autor. A minha prova atual é a negativa nomeada (`end:302-303`) mais C33/C34 verdes no layout sem `sh`.
- Continuam das rodadas anteriores: a variante "lock ausente" de C43 sem teste nomeado; as janelas do plugin em C44; o ramo com várias capturas `active` na falha do encerramento sem prova; recusa e EOF num console real do Windows só em processo ou pty; nativos do Hermes pulados na CI; C23 sem asserção de tempo; variante link do C17 não executada no Windows desta máquina (executada em C); macOS e runner da CI não executados.
- Julgamento de suficiência das asserções nos arquivos sem diff: carried from R6 (`ffc5937`), e de R4 (`e710dc6`) onde R6 já o trazia carried.
- Uso real sem sessão de agente: `Unresolved` 2, `blocks go-live`.

## Findings (em ordem)

1. **FAIL — C28 vermelho em B no HEAD** (`end.e2e.test.mjs:143`, Windows Node 24.13.0): o primeiro registro do Hermes não chegou à captura em 60 s, e o launcher foi encerrado pelo prazo do teste. A causa não foi determinada. Passou em A, C e D. Sem nova execução, por instrução. Esta é a última rodada de Verifier autorizada; outra execução ou verificação depende de decisão do proprietário.
2. Observação de teste (não bloqueante): no C28, o `output` do passo tem o mesmo caminho do cenário, e a espera da fixture é igual ao prazo do `runSkillMe`. Na falha se perdem o stderr do launcher e os contadores do plugin.
3. **Correção da CI (C33/C34) fechada**: contrato do Landing cumprido, prova nomeada que distingue o defeito, verde no layout isolado sem `sh` e controles do Windows preservados.
4. Processo: conforme, com as três observações menores acima.

## Gate

| Gate | Resultado |
| --- | --- |
| Alvo completo, Windows, Node 24.22.1, concorrência 4 | 99: 93 pass, 0 fail, 6 skip — exit 0 |
| Alvo completo, Windows, Node 24.13.0 oficial (CI), concorrência 4 | **99: 92 pass, 1 fail (I25-C28), 6 skip — exit 1** |
| Alvo completo, WSL Ubuntu, uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, PATH sem `/usr/bin`, cópia exata | 99: 93 pass, 0 fail, 6 skip — exit 0 |
| `npm test`, Windows, Node 24.22.1, Hermes real pelos testes | exit 0 — governança 6/6; motor 16/16; doctor 417 (410 pass, 0 fail, 7 skip); integrações 552 (539 pass, 0 fail, 13 skip); total 991: 971 pass, 0 fail, 20 skip; 12 nativos do Hermes aprovados |

Cada suíte rodou uma única vez, sem repetição até ficar verde.

## Limpeza

- `%TEMP%`: B (Node 24.13.0, cujo `rmSync` não apaga caminhos com "ação" no Windows) deixou 320 scratches `skill-me i4 i25 *`, todos na janela 22:40–22:45. Removidos com o Node 24.22.1 (`cleanup-temp-B.txt`): 320 removidos, 0 recusas, 0 fora da janela, 0 restantes. Antes, copiei a evidência do C28 para `verifier-round7/B-c28-leftover/`. Depois de D, outros 128 diretórios `skill-me i4 …` (testes `i5`, `t7` e dois sem prefixo, 22:40:16–22:55:50) ficaram fora da linha de base e foram removidos pela segunda passada (`cleanup-temp-new.txt`: 128 removidos, 0 recusas, 29.451 da linha de base intactos). O `%TEMP%` voltou às 29.451 entradas `skill-me i4 *` de antes, que não são minhas e não toquei.
- WSL: `/tmp/skillme-verifier-r7.uEPwqx` removido por `wsl-cleanup.sh`, depois de conferir o padrão absoluto `/tmp/skillme-verifier-r7.??????` e que é diretório e não link. 0 restantes; 0 `skill-me i4 i25 *` em `/tmp` (`C-wsl-cleanup.txt`).
- Mantidos na pasta ignorada `verifier-round7/`: logs A–D, `matrix.txt`, o tar do HEAD, a evidência do C28 e os scripts desta rodada. `profile-before.json` e `profile-metadata-snapshot.py` são do orquestrador e não foram lidos, alterados nem apagados. Nada de `verifier-round5/` nem `verifier-round6/` foi tocado.
- Configuração, estado de review e prefixo npm real não foram tocados. No fim, HEAD `a755c37` e `git status` com só este arquivo modificado.
