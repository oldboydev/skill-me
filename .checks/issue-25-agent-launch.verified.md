# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25

**Verdict**: **PASS**. Em `8c847d0`, as provas dos 45 checks passaram em todas as execuções aplicáveis: o alvo de 100 testes em A (Windows, Node 24.22.1), em B (Windows, Node 24.13.0 oficial da CI, o ambiente da falha de R7) e em C (WSL, Node 24.13.0 num prefixo sem `sh`), e o `npm test` completo em D (Windows, Node 24.22.1, exit 0, com os 12 nativos do Hermes). Nenhuma falha, nenhum filtro vazio e nenhuma repetição até ficar verde.
**Checks**: 45/45 com a prova verde em A, B, C e D, onde a plataforma se aplica. Cada check tem nome executado no TAP e asserção citada com `arquivo:linha`.
**C28**: **corrigido na prova e na fixture**, sem afirmar a causa original. Os dois testes `I25-C28` rodaram e passaram em A, B e C, inclusive em B (Windows, Node 24.13.0, o ambiente da falha de R7), e também no gate D. A regressão `I25-C28 primeira entrega perdida` comprova que a injeção aconteceu: exatamente um `rename` de `segmento.tmp`, com `EIO`, e um `unlink`. Ela reproduz a **classe** da falha, primeira entrega perdida, e **não** a causa da perda de R7, que continua **desconhecida** e **não foi eliminada**. Se a perda voltar, o C28 saudável falha com o diagnóstico (`started: false` e os contadores) e nunca dá 3 gravados.
**C33/C34**: **continuam fechados**. Passaram no layout isolado do WSL (Node 24.13.0 num prefixo sem `sh`), inclusive a prova nomeada do arranjo. Os controles do Windows ficaram verdes em A e B.
**Conformidade do processo do Verifier nesta rodada**: CONFORME, pelo que os meus comandos mostram, com uma observação: D teve dois inícios. O primeiro foi interrompido por mim antes de um resultado completo do gate; o segundo é a única execução completa (seção "Processo desta rodada"). Não executei nenhum `codex`, `claude`, `hermes` ou outro agente real, nenhuma sonda, nenhuma leitura de perfil pessoal ou credencial.
**Profile**: light (sem fault injection, `Coverage` ou `Test policy` próprios; sem fonte vinculante de UI).
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..8c847d0b6d72c8ce66eb746bc7e91768946d4a78` (feature inteira, 53 commits, 44 arquivos, checks C1–C45). O produto não muda desde `7ab5dbf`: `src`, `package.json`, `scripts`, `.github` e `code-review.config.json` sem diff desde `ffc5937`, e `scripts`/`.github` sem diff na feature inteira. Desde R7 (`a755c37`) só mudaram `tests/integrations/fixtures/launch/hermes-plugin-session.py`, `tests/integrations/helpers/traces-probe.mjs` e `tests/integrations/launch/end.e2e.test.mjs` (`8eafa11`), além de task, checklist (só linhas acrescentadas, nenhuma removida), build e este relatório.
**Round**: 8 - scoped, a **última** autorizada. Exceção do proprietário só para a #25: “Autorizar a 8ª verificação” ([comentário 6432258457](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6432258457)), que leva o teto do Verifier de 7 para 8. O teto formal continua 5, com 4 consumidas. Escopo: todos os C1–C45, com atenção à correção da CI (`2dfe676`) e do C28 (`8eafa11`, documentos em `22e8fc5`). As rodadas 1–7 continuam no histórico do git: o FAIL de R7 está em `1a44ef1`, e o incidente de R5 também está preservado.
**Verifier**: subagente independente novo (Claude Opus 5.5). Não sou o autor nem um Verifier anterior; autor ≠ verificador. Tratei código, testes, critérios, checklist e configuração como somente leitura. Nenhum commit, push, PR, merge, `review:run` nem mudança de limite ou estado. A revisão formal 5 é do orquestrador.

Data: 26/10/2026, 23:36–23:57 (-03). Retificação só de redação em 27/10/2026, sem novas execuções (seção final). HEAD `8c847d0` (árvore `d49da260…`) do início ao fim. `git status --porcelain=v1 -uall` vazio antes (`verifier-round8/git-status-before.txt`), entre os dois inícios de D e depois de D; ao final, só este arquivo muda. O relatório de R7 (versão de `1a44ef1`) foi lido inteiro antes de ser substituído.

## Veredito em uma linha

**PASS.** O alvo de 100 testes rodou uma vez em cada ambiente: A 94 pass, 0 fail, 6 skip; **B, o ambiente da falha de R7, 94 pass, 0 fail, 6 skip**; C 94 pass, 0 fail, 6 skip. O `npm test` completo no Windows (D, segundo início e única execução completa) saiu com **0**: 992 testes, 972 pass, 0 fail, 20 skip. Passaram os 12 nativos do Hermes, os dois C28, o T7-C10 e o I4-C36. A correção do C28 está provada no que pode ser provado: fixture limitada ao prazo, diagnóstico na falha, regressão com injeção comprovada e asserções saudáveis intactas. A causa da perda original continua desconhecida.

## Fontes lidas nesta rodada

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `tlc-implement/references/verify.md` | inteiros; perfil `light` |
| `.tasks/issue-25-agent-launch.md` | inteiro: critérios 1–37, a seção “Regressão de fixture da CI do PR #28 (C28; critério 21 sem mudança)” e as Sources com 6432258457, 6431483843, 6425235841, 6423912091 e 6419121665 |
| `.checks/issue-25-agent-launch.md` | inteiro: Landing, inclusive “Diagnóstico do C28 na fixture” (`:62`) e “Ambiente do npm run nas provas” (`:63`), C1–C45 com os acréscimos de C28 (`:168`) e C33 (`:184`), Swept e Handoff |
| `.checks/code-review/issue-25/context-ci28-verifier8-approved.json` | inteiro: corpo da issue com os 6 ACs e 14 comentários. Os dois últimos são o handoff da correção do C28 e a autorização “Autorizar a 8ª verificação”. Os comentários do contexto não trazem URL nem ID. O ID 6432258457 vem das Sources da task e do checklist e do pedido do orquestrador |
| `.checks/issue-25-agent-launch.verified.md` de R7 (`1a44ef1`) | inteiro, antes de substituí-lo |
| `.checks/issue-25-agent-launch.build.md` | inteiro (869 linhas); **relato do autor, não prova minha** |
| `.checks/code-review/issue-25/formal-review4.stdout.txt` | inteiro: `ready` em `d11030f`, 6 ACs `met`, sem achados; não cobre o HEAD atual |
| Diff `a755c37..HEAD -- tests/` | inteiro (3 arquivos, `8eafa11`) |
| `fixtures/launch/hermes-plugin-session.py`, `helpers/traces-probe.mjs` | inteiros no HEAD |
| `launch/end.e2e.test.mjs` | `:1-355` lidos no HEAD. O resto foi conferido por diff: as linhas 1–126 são iguais às de `a755c37`, exceto o import da `:16` (acrescenta `readLines`), e as linhas `:198-820` são iguais byte a byte às `:159-781` de `a755c37` (`diff` vazio, deslocamento exato de +39) |
| `helpers/launch.mjs` (`runSkillMe` `:116`, `SIGKILL` `:127`, `readLines` `:144`), `helpers/traces.mjs:15` (`TRACES_PROBE`), `fixtures/launch/fake-agent.mjs:130-138`, `helpers/cli.mjs:18-19` (`makeScratch`) | por Grep, para interpretar a correção do C28 e a limpeza |
| Demais testes do alvo e o nativo | 0 linhas de diff em `a755c37..HEAD` (e em `ffc5937..HEAD`, exceto `report.cli`, que R7 verificou em `a755c37`). Amostra das linhas citadas por R7, relidas no HEAD: `cmd:48, 65, 105, 182`, `prep:223`, `sess:67, 230`, `store:168`, `rep:90, 168, 181`, `harn:263`, `docs:82`, `agent:132`, `nat:335`, todas conferem |
| Retificação de 27/10, sem execução | `verifier-round8/D-aborted-timeout-config.npm-test.txt` (o meu log do primeiro início de D), `D-interrupted-attempt-audit.json` e `profile-comparison-final.json` (os dois do orquestrador), lidos inteiros |

## Ambientes e execuções — verified at `8c847d0`

Execuções em sequência. A, B e C rodaram uma vez cada, sem repetição. D teve **dois inícios**: o primeiro, que interrompi antes de um resultado completo do gate (seção "Processo"), e o segundo, a única execução completa. Logs em `.checks/code-review/issue-25/verifier-round8/` (pasta ignorada). Alvo de A, B e C numa invocação só: `node --test --test-concurrency=4 --test-reporter=spec … --test-reporter=tap … tests/integrations/launch/*.test.mjs tests/integrations/hermes-harness.unit.test.mjs` (9 arquivos).

| # | Ambiente | Resultado |
| --- | --- | --- |
| A | Windows 11, Node v24.22.1 (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10, `npm_execpath` ausente; `npmCli()` = `C:\nvm4w\nodejs\node_modules\npm\bin\npm-cli.js`; 23:36:13–23:38:44 (`A-win-24.22.1.*`) | 100 testes: **94 pass, 0 fail, 6 skip**, exit 0. Diagnóstico impresso pelo teste: a variante link do C17 não foi executada (sem privilégio de symlink de arquivo) |
| B | Windows 11, Node v24.13.0 oficial (`ci-node-24.13.0/node-v24.13.0-win-x64/node.exe`) no início do `PATH`; npm 11.6.2 adjacente (primeiro `npm` do `PATH` e `npmCli()` = o `node_modules` do zip); `npm_execpath` ausente; 23:38:56–23:41:42 (`B-win-24.13.0.*`) | 100 testes: **94 pass, 0 fail, 6 skip**, exit 0. O mesmo diagnóstico do C17 |
| C | WSL `Ubuntu`, `oldboydev` uid 1000, `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc` com os meus scripts (`wsl-prepare.sh`, `wsl-run.sh`, `wsl-cleanup.sh`, sem CR). Cópia: `git -c core.autocrlf=false archive HEAD`, tar de 5.519.360 bytes, sha256 `983219a2…aea5a9`, `get-tar-commit-id` = `8c847d0b…`, árvore extraída `d49da260…` = `HEAD^{tree}` (também depois de copiar `node_modules`, que é ignorado), `cli.mjs` 755 (git `100755`), `#!/usr/bin/env node`. `node_modules` existente copiado, sem instalação nem rede (yaml 2.9.0, smol-toml 1.9.1). **Prefixo isolado**: `prefix/bin` = `node npm npx`, **sem `sh`** (`sh_beside_node=nao`). O `node` é cópia byte a byte de `/usr/bin/nsolid` (sha256 `150946e4…bb6351`), v24.13.0, com `execPath` = `<scratch>/prefix/bin/node`. O npm 11.6.2 foi copiado em `prefix/lib/node_modules/npm`, e `npmCli()` aponta para ele. `env -i`, `HOME=<scratch>/home`, `LANG=C.UTF-8`, **`PATH=<scratch>/prefix/bin:<scratch>/tools`, sem `/usr/bin`**. `tools` só com links a `/usr/bin/{sh (dash), git, python3 (3.12.3), id, grep, mkfifo}`; nenhum agente, `node`, `npm`, `npx` ou `corepack`. 23:42:57–23:44:05 (`C-wsl-24.13.0-isolado.*`, `wsl-prepare.txt`) | 100 testes: **94 pass, 0 fail, 6 skip**, exit 0. Rodaram e passaram os 2 `I25-C33`, **inclusive a prova nomeada do arranjo**, os 3 `I25-C34` e os 2 `I25-C28`. Árvore `d49da260…` igual antes e depois. `/home/oldboydev/.skill-me` e `.skill-me-authorization.json` ausentes antes e depois (só `test -e`). O home do scratch ficou vazio |
| D | Windows, Node v24.22.1, npm 11.19.1, Python 3.12.10, `SKILL_ME_HERMES_PYTHON` ausente, `npm_execpath` ausente antes do `npm test`, 32 núcleos lógicos, `testConcurrency()` = 8 (`MAX_PARALLEL_FILES` 8). Segundo início, 23:45:41–23:55:14 (`D-npm-test.*`) | `npm test`, **segundo início e única execução completa**: **exit 0**. Governança 6: 6 pass. Motor de revisão 16: 16 pass. Doctor 417: 410 pass, 0 fail, 7 skip. Integrações 553: **540 pass, 0 fail, 13 skip**. Total **992: 972 pass, 0 fail, 20 skip**. I25 no gate: 95 pass, 6 skip (o alvo de 100 mais o I25-C40 nativo). O primeiro início (23:44:19), interrompido por mim antes de um resultado completo do gate, registrou a governança completa (6/6) e 10 testes nomeados do motor aprovados até `C3`. Nele, `C4`, o resumo do motor, o doctor e as integrações não chegaram a reportar (`D-aborted-timeout-config.*`). Não há asserção vermelha nesses fragmentos, mas o primeiro início não conta como gate verde |

Os 100 nomes do TAP são os mesmos nos três ambientes (`matrix.txt`), e há nome executado para cada um dos 45 checks. Nenhum filtro rodou com 0 testes. Matriz por check (pass/fail/skip):

| Check | A Win 24.22.1 | B Win 24.13.0 | C WSL isolado 24.13.0 |
| --- | --- | --- | --- |
| C1–C3, C7, C9–C11, C13, C14, C18–C26, C29, C30, C32, C35, C36 | 1p cada | 1p cada | 1p cada |
| **C28** | **2p** | **2p** | **2p** |
| C4 | 3p | 3p | 2p/1s |
| C5 | 1p/1s | 1p/1s | 1p/1s |
| C6 | 1s | 1s | 1p |
| C8 | 2p | 2p | 1p/1s |
| C12, C16, C31, C40 | 2p cada | 2p cada | 2p cada |
| C15 | 1s | 1s | 1p |
| C17 | 4p (link omitido) | 4p (link omitido) | 4p (link executado) |
| **C33** | 1p/1s (arranjo POSIX pulado) | 1p/1s | **2p** (com o arranjo) |
| C27, C34, C37, C39, C44 | 3p cada | 3p cada | 3p cada |
| C38 | 1p | 1p | 1s |
| C41 | 17p | 17p | 17p |
| C42 | 3p/1s | 3p/1s | 3p/1s |
| C43 | 12p | 12p | 12p |
| C45 | 2p/1s | 2p/1s | 2p/1s |

Durações dos dois C28 (TAP): o saudável levou 4.184 ms em A, 4.525 ms em B e 1.388 ms em C. A regressão levou 28.798 ms, 28.732 ms e 26.365 ms: o orçamento de 25 s da fixture mais o encerramento, bem abaixo dos 60 s do `runSkillMe`.

**Skips do alvo, com o motivo impresso pelo próprio teste.** A e B têm 6 cada: C45 POSIX (“componente vazio do PATH como diretório atual é semântica do POSIX; o Windows tem o controle abaixo”), C5 POSIX, C6 e C42 POSIX (“sinais POSIX: o Windows não tem grupo de processos nem SIGQUIT/SIGHUP/SIGTERM entregáveis”), C33 arranjo (“o npm do Windows roda o script pelo ComSpec, não por um sh do PATH”) e C15 (“pseudoterminal só no POSIX…”). C também tem 6, todos só do Windows: C4 shim, C45 controle, C5 console, C42 console, C8 LOCALAPPDATA e C38 console. Todo caso pulado num ambiente rodou e passou no outro.

**Gate D, nativos do Hermes**: executados e aprovados, nenhum pulado (`D-npm-test.txt:596-607`): I4-C18, I4-C19, I4-C20, I4-C21, I4-C22, I4-C23, I4-C37, a harness nativa do I25-C40, os três I23-C8 e o I4-C44b. No mesmo gate passaram os dois I25-C28 (`:701-702`), o T7-C10 (`:1031`), o T8-C15 (`:1039`) e o I4-C36 (`:580`).

**Skips do gate D, com motivo (20).** Doctor, 7, marcados `# SKIP` sem texto (`D-npm-test.txt:60, 77, 398, 399, 404-406`). Vêm de `{ skip: process.platform === "win32" }` em `tests/doctor/agent-resolution.unit.test.mjs:279, 589`, `fifo-config.cli.test.mjs:30, 75` e `fs-adapter.posix.test.mjs:36, 53, 75` (PATH POSIX, symlink, FIFO). Integrações, 13, com o motivo impresso: I4-C15 e T8-C4 (`posix-signals`), I4-C25b (`posix-modes`), I4-C25j/k/l (`posix-acl`, só Linux), I4-C25m (`macos-acl`), I25-C45 POSIX, I25-C5, I25-C6, I25-C42 POSIX, o arranjo do I25-C33 e o I25-C15. Todos são de plataforma, e nenhum é nativo do Hermes. Runner: `scripts/test-integrations.mjs:14` `MAX_PARALLEL_FILES = 8` e `:16` `min(núcleos − 1, 8)`, sem diff na feature; com 32 núcleos, 8 arquivos. O teto 8 da #23 está preservado.

## C28 — correção da prova e da fixture (verified at `8c847d0`)

| Item | Situação | Evidência |
| --- | --- | --- |
| Contrato | Landing “Diagnóstico do C28 na fixture” (`checklist:62`) e acréscimo de C28 (`checklist:168`), em `c94a7e2`, **antes** da correção (`8eafa11`). Critério 21 sem mudança; task e checklist só ganharam linhas desde R7 | `git log a755c37..HEAD`; `git diff … \| grep '^-'` vazio nos dois arquivos |
| Cenário ≠ saída e supervisor antes do parse | conferido | `end:142` saída `plugin.json`; `end:143` cenário `writeScenario(work, "cenario", …)`; `end:147` mensagem com `status`, `sinal` e `stderr` do launcher; `end:148` `assert.equal(result.signal, null, "o launcher não terminou sozinho; …")`; `end:149` `assert.ok(existsSync(output), "a fixture não gravou a saída; …")`; só então `end:150` faz o `JSON.parse`. Vale para os dois testes (helper `hermesSession`, `end:132-151`) |
| Orçamento da fixture | 25 s + 25 s sob o supervisor de 60 s | `hermes-plugin-session.py:25-26` `FIRST_PERSISTED_SECONDS = 25`, `DELIVERED_SECONDS = 25`; `:70` espera o primeiro registro gravado; `:71-75` os demais hooks só disparam `if started`, sem reenvio; `:76` imprime `{"started", "delivered", "stats": observer_stats()}` em qualquer caso. Supervisor: `helpers/launch.mjs:116` `timeout = 60_000`, `:127` `child.kill("SIGKILL")`, sem diff na rodada |
| C28 saudável: asserções iguais às de R7 | **sem enfraquecimento** | `end:155` `run.status === 0`; `end:157-161` `{started: true, delivered: true, enqueued: 3, sent: 3, queueFull: 0, failed: 0}`; `end:163-167` `{persisted: 3, states: todas "stopped", status: 0}`; `end:168` `eventos gravados: 3.`. São os mesmos valores de `a755c37:143-156`, e o diff só troca a preparação pelo helper |
| Regressão `I25-C28 primeira entrega perdida` | **passou em A, B, C** e em D | `end:178` `NODE_OPTIONS=--import=<traces-probe>`, `SKILL_ME_TEST_TRACES_SEGMENT_EIO: "1"`, `SKILL_ME_TEST_TRACES_TIMING`. `end:179` `result.status === 0`, depois de `signal` nulo em `end:148`. `end:180` `run.status === 0`. `end:181-185` a última linha é exatamente `{started: false, delivered: false, stats: {enqueued: 1, delivered: 1, droppedQueueFull: 0, deliveryFailed: 0, oversize: 0, serializationFailed: 0, active: true}}`. `end:187` capturas = `[["stopped", 0, 0]]`, uma só, com `accepted` e `persisted` 0. `end:188` ponteiro ausente. `end:189` `eventos gravados: 0.` |
| A injeção aconteceu (não só faltou evento) | **comprovado pela testemunha** | `end:192-194` soma as `ops` de todos os processos Node e exige que os `rename` de `segmento.tmp` tenham códigos exatamente `["EIO"]`, ou seja, uma promoção, com `EIO` e sem nova tentativa. `end:195` exige um `unlink` de `segmento.tmp`. Na pré-carga, `traces-probe.mjs:95-104` lança `EIO` na n-ésima promoção (`rename` para `events-NNNNNN.ndjson`), sem tocar no disco. `:113` classifica o temporário como `segmento.tmp`. `:124` e `:131` registram o código do erro. O invólucro de tempo (`:136-140`) envolve o da injeção, então o código registrado é o da chamada que falhou. Sem a injeção, o `rename` teria sucesso (`[undefined]`) e o primeiro registro seria gravado (`started: true`), e as duas asserções falhariam. Sem o arquivo de tempos, `readLines` dá `[]` (`helpers/launch.mjs:144`), e `end:194` também falharia |
| Poder discriminante (análise; não repeti o RED) | **distingue** | (1) Fixture antiga (60 s pelo primeiro registro, depois 30 s): com a perda, o `runSkillMe` mata o launcher aos 60 s, e `end:148` falha com `sinal SIGKILL` e o stderr. É o RED do autor (`build.md:838`, 61.706 ms), **evidência do autor**. (2) Fixture que disparasse os demais hooks sem o primeiro: `enqueued` 3, e `end:181-185` falha. (3) Fixture ou store com nova tentativa: mais de um `rename` de `segmento.tmp`, `end:194` falha; ou `enqueued` > 1, `end:181-185` falha. (4) Launcher que não encerrasse a execução: captura `active` ou ponteiro presente, `end:187-188` falham. (5) Injeção que não ocorresse: `end:181-185` e `end:194` falham |
| Se a perda original voltar no C28 saudável | **falha com diagnóstico** | A fixture imprime `started: false` com os contadores e não dispara os outros hooks. `end:157-161` falha mostrando esse objeto (`started`, `enqueued`, `sent`), em ~25–30 s, com o launcher terminado sozinho. Nunca “3 gravados”: `end:163-167` exige `persisted: 3` |
| O que **não** está provado | declarado | A causa da perda do primeiro registro em B de R7 é **desconhecida**. Não a atribuo a EIO, EPERM ou carga. A injeção reproduz só a classe (primeira entrega perdida com gravação desfeita). Uma passada verde de B não mede a taxa de recorrência. A perda pode voltar, e então o C28 saudável fica vermelho com diagnóstico. A regressão acrescenta ~26–29 s ao alvo |

## C33 e C34 — continuam fechados (verified at `8c847d0`)

| Item | Situação | Evidência |
| --- | --- | --- |
| Implementação (só provas, `2dfe676`) | sem diff desde R7 | `helpers/launch.mjs` e `helpers/observe.mjs` com 0 linhas em `a755c37..HEAD`. R7 citou `helpers/launch.mjs:62-70` (`npmScriptEnv`: Windows `path.dirname(process.execPath)`; POSIX pasta com `node` → `process.execPath` e `sh` → `/bin/sh`, seguida do bin de fixture). Linhas inalteradas |
| Prova nomeada `I25-C33 arranjo do npm run (POSIX)` | **passou em C** (layout sem `sh`) | Lado da CI: `end:341` `assert.notEqual(ciLayout.status, 0)`; `end:342` `assert.match(ciLayout.stderr, /spawn sh ENOENT/)`, com o PATH `[nodeOnly, bin]` (`end:339`). PATH das provas: `end:345` `rest` = `[bin]`; `end:346` `readdirSync(dir).sort()` = `["node", "sh"]`; `end:347` links = `[process.execPath, "/bin/sh"]`; `end:349` `npm run status` → `[0, "ok", "off"]` |
| C33 e C34 no layout isolado | **passaram (C)** | C33 `end:305` `npmScriptEnv`; `end:307` `[0, "on"]`; `end:312` `[0, "off", []]`; `end:308, 313` `active`; `end:317` 3× `LAUNCHED(1)`; `end:318-321` `e-1…e-3` na mesma captura; `end:322` nenhuma automática; `end:323` uma captura. C34 `rep:168` `npm run status` `[0, 1, [automatic.id]]` com `npmScriptEnv` (`rep:167`) |
| Controles do Windows | **passaram (A, B)** | C33 (1p) e os 3 C34 em A e B; arranjo pulado com motivo impresso |
| Defeito da CI | **fechado** no layout isolado do WSL | A CI real (Ubuntu, macOS, Windows) só verifica depois do push |

## Carried / reverified

| Item | Situação nesta rodada |
| --- | --- |
| Execução das provas de C1–C45 | **verified at `8c847d0`**: todas rodaram por inteiro em A, B, C e na execução completa de D |
| C28 (fixture, pré-carga, `end.e2e`) | **verified at `8c847d0`**: diff inteiro lido e asserções citadas acima |
| Citações de `end.e2e` (único arquivo de teste tocado) | **atualizadas no HEAD**. `end:1-126` iguais a `a755c37`, exceto o import da `:16`. O bloco de C28 está em `:124-196`. Depois dele, deslocamento exato de **+39** (`diff` vazio entre `a755c37:159-781` e `HEAD:198-820`). Amostra relida: `end:366, 383, 429, 494, 570, 584, 610, 656, 712, 755, 772, 792, 814` |
| C33, C34 | **verified at `8c847d0`** (execução); julgamento das asserções **carried from R7 at `a755c37`**, porque `report.cli` e os helpers têm 0 linhas de diff em `a755c37..HEAD`. As linhas de `end` foram atualizadas acima |
| Citações e julgamento de suficiência de `prepare.cli`, `session.e2e`, `store.unit`, `agent.unit`, `command.cli`, `docs.test`, `report.cli`, `hermes-harness.unit` e do teste nativo | **carried from R7 at `a755c37`**: 0 linhas de diff em `a755c37..HEAD`, e a amostra relida confere. R7 já as trazia carried de R6 em `ffc5937`, exceto `report.cli`, verificado por R7. O julgamento original é o de R4 em `e710dc6` nos arquivos que R6 trazia carried, e o de R6 para `agent.unit` e `command.cli` |
| Swept existing, core vendorizado | **carried from `ffc5937`**: `src/`, `scripts/` e `.github/` sem diff desde então (`scripts/` e `.github/` sem diff na feature inteira) |
| Exceção e configuração | `code-review.config.json` sem diff desde `ffc5937`: `roundOverrides["25"]` = `{profile: "light", maxRounds: 5, approval: …6425235841…}`. O teto de 8 Verifiers é registro de processo (task e checklist, Sources, `:5`), não configuração. O texto `approval` da configuração é anterior às autorizações de merge e às 7ª/8ª verificações; não o altero e não é achado desta rodada |

## Checks

`cmd` = `tests/integrations/launch/command.cli.test.mjs`, `prep` = `prepare.cli`, `sess` = `session.e2e`, `store` = `store.unit`, `end` = `end.e2e`, `rep` = `report.cli`, `agent` = `agent.unit`, `docs` = `docs.test`, `harn` = `tests/integrations/hermes-harness.unit.test.mjs`, `nat` = `tests/integrations/hermes-plugin.native.test.mjs`. "A/B/C" = passou nos três ambientes; "D" = passou também na execução completa do gate. Os nomes executados são os `I25-C<n> …` (os 100 do TAP); os nativos de C40/C44 são `I25-C40 harness nativa…` (`nat:332`), `I4-C20` (`nat:225`), `I4-C21` (`nat:236`), `I4-C22` (`nat:248`) e `I4-C37` (`nat:311`).

| Check | Proof run | Evidência (arquivo:linha — valor esperado) | Revisão | Result |
| --- | --- | --- | --- | --- |
| C1 | A/B/C; D | `cmd:48` `pkg.private === true`; `cmd:49` `bin` = `{"skill-me": "src/integrations/launch/cli.mjs"}`; `cmd:65` `[0, SKILL_ME_HELP, ""]` de outro diretório, depois do `npm link` no prefixo temporário; `cmd:77` `git status` igual | carried (R7/R6) | PASS |
| C2 | A/B/C; D | `cmd:96-98` para codex, claude e hermes: `{status: 0, stdout: <o do agente>, stderrFirst: "erro do <agente>", argv: LITERAL_ARGS, stdin: …}`; `LITERAL_ARGS` com espaço, aspas, Unicode, `--`, `""`, `%PATH%` e `$HOME` (`cmd:80`) | carried | PASS |
| C3 | A/B/C; D | `cmd:105` `{0: 0, 7: 7}` | carried | PASS |
| C4 | A/B (3), C (2); D | `cmd:117-120` `{status: 0, argv: [...], execPath: process.execPath, script: …/@openai/codex/bin/codex.js, sentinel: false}`; `cmd:130-133` `{status: 127, code: [launcher_requires_shell], …, sentinel: false}`; `agent:80, 91, 96, 102, 107, 114, 117-118` | carried | PASS |
| C5 | POSIX em C; Windows em A/B; D | `cmd:224` `launcherGone === false`; `cmd:228` `{status: 4, signal: null, signals: ["SIGINT","SIGQUIT","SIGHUP"]}`; `cmd:244-245` `CTRL_C_EVENT` real `{stage: "done", generated: true, seen: true, status: 5, signals: ["SIGINT"]}` | carried | PASS |
| C6 | C | `cmd:267` `{status: 0, signal: null, signals: ["SIGTERM"]}` | carried | PASS |
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
| C17 | A/B (link omitido, diagnóstico impresso), C (link executado); D | `store:54`; `store:79` `["launch", invocation, 1, "2026-10-26T10:00:00.000Z"]`; `store:110`; `store:156`; `sess:300-301` | carried | PASS |
| C18 | A/B/C; D | `sess:111` `{status: 3/3/4, stderr: "skill-me: não foi possível abrir a execução [<código>]\n", started: false, waited: true}`; `sess:124` `io_failure` → 5 | carried | PASS |
| C19 | A/B/C; D | `sess:147`; `sess:151`; `sess:152-160` `[1, <agente>, h1 da chave]`; `sess:161` `[0, 0]`; `sess:165-167` igual ao `privacy ingest --content` | carried | PASS |
| C20 | A/B/C; D | `sess:190-191` `{bound: false, code: "binding_invalid", entries: 1, committed: 0, persisted: 0, lost: 1}`; `sess:192` | carried | PASS |
| C21 | A/B/C; D | `sess:211` bytes iguais (`sess:208` off, `sess:209` on) | carried | PASS |
| C22 | A/B/C; D | `sess:230` `[1, "stopped", 500, 500, {}]`; `sess:236`; `sess:240-245` | carried | PASS |
| C23 | A/B/C; D | `sess:282` `["active", MAX_BYTES, {}, 1]`; `sess:289`; `sess:291` | carried | PASS |
| C24 | A/B/C; D | `store:168` `[opened.capture, "stopped", 1]`; `store:169` `[2, "active", 1, first.launchedAt]` | carried | PASS |
| C25 | A/B/C; D | `end:72-79` 2 capturas `stopped`, `endedAt` ISO, ponteiro ausente, `dropped {unknown_event: 1}`, status 3; `end:80-89` stderr exato | linhas iguais no HEAD | PASS |
| C26 | A/B/C; D | `end:101-109` `… eventos gravados: 0.` e `skill-me: nada foi gravado nesta execução. Confira a confiança do agente: <manualSteps[0]>` | linhas iguais | PASS |
| C27 | A/B/C (3); D | `end:120` `{launch: true, code: "launch_ended", entries: 1, committed: 0, persisted: 0, lost: 1}`; `end:121` árvore igual; `store:222, 226-228, 234, 236-237, 253, 256-260` | linhas iguais | PASS |
| **C28** | **A/B/C (2 cada)**; D (os 2, `D-npm-test.txt:701-702`) | Saudável: `end:148-149` supervisor (`signal` nulo, saída existe); `end:155` `run.status === 0`; `end:157-161` `{started: true, delivered: true, enqueued: 3, sent: 3, queueFull: 0, failed: 0}`; `end:163-167` `{persisted: 3, states: todos "stopped", status: 0}`; `end:168` `eventos gravados: 3.`. Regressão: `end:179-180` status 0; `end:181-185` `{started: false, delivered: false, stats: {enqueued: 1, delivered: 1, …0…, active: true}}`; `end:187` `[["stopped", 0, 0]]`; `end:188` sem ponteiro; `end:189` `eventos gravados: 0.`; `end:194` `["EIO"]`; `end:195` 1 `unlink` | **verified** (seção própria) | **PASS** |
| C29 | C (POSIX); A/B; D | `cmd:278` POSIX `{status: null, signal}` / Windows `{status: 1, signal: null}`; `cmd:295`; `cmd:300` todas `stopped` | carried | PASS |
| C30 | A/B/C; D | `cmd:342` `{status: 127 (ENOENT) / 126, startCode: true, captures: [[1, "stopped", 0]]}` | carried | PASS |
| C31 | A/B/C (2); D | `end:205` status 6; `end:206-214` stderr com `[lock_present]`, `continua active`, `encerre com: … privacy stop …`, `continua aberta`; `end:215` `["active", true]`; `end:222` o comando encerra (`stopped`); `end:244-253` E/S: `[io_failure]` e `já não recebe registros`; `end:254` `["active", false]`; `end:256` `launch_ended`; `end:257-258` o comando encerra | atualizado (+39) | PASS |
| C32 | A/B/C; D | `end:281` `["stopped", "active"]`; `end:288-291` registros e chaves próprios, uma captura por execução | atualizado (+39) | PASS |
| **C33** | A/B (1 + arranjo pulado), **C (2, com o arranjo, no layout sem `sh`)**; D | `end:305` `npmScriptEnv`; `end:307` `[0, "on"]`; `end:308` `active`; `end:312` `[0, "off", []]`; `end:313` `active`; `end:317` 3× `LAUNCHED(1)`; `end:318-321` `e-1…e-3` na mesma captura; `end:322` nenhuma automática; `end:323` uma captura. Arranjo: `end:341-342, 345-347, 349` | **verified** (+39) | PASS |
| **C34** | A/B/C (3), **C no layout sem `sh`**; D | `rep:82` texto = cabeçalho (`rep:64-71`) + seções `== Segmento s de 2 ==`; `rep:90-93` `{skillMeLaunchReport: 1, invocation, open: false, segments: [...], missingSegments: [], reports: 2}`; `rep:95` igual ao `report --root --capture`; `rep:104` sem escrita; `rep:130` `[newInv, true]`; `rep:143` a iniciada por último; `rep:150` ausentes; `rep:166` `--latest` só automática; `rep:168` `npm run status` `[0, 1, [automatic.id]]` com `npmScriptEnv` (`rep:167`) | carried (R7, sem diff) | PASS |
| C35 | A/B/C; D | `rep:181-188` `[3, {"schemaVersion":1,"command":"report","status":"error","error":{"code":"not_configured"}}, ""]` e duas vezes `no_launch_capture` | carried (R7) | PASS |
| C36 | A/B/C; D | `cmd:350` `[0, SKILL_ME_HELP, ""]`; `cmd:354` `[2, "", SKILL_ME_HELP]`; `cmd:356-368` | carried | PASS |
| C37 | A/B/C (3); D | `docs:57`; `docs:60-62`; `docs:82` os 9 limites (`docs:44-54`); `docs:88-89`; `docs:93` | carried | PASS |
| C38 | A/B; D | `prep:355` `["done", 0]`; `prep:361`; `prep:363`; `prep:365` | carried | PASS |
| C39 | A/B/C (3); D | `harn:88` `["concluded", 0, 3]`; `harn:100-102`; `harn:186-188` `[12, 12, 0]`, `concluded`, `waitedMs ≥ 700` | carried | PASS |
| C40 | A/B/C (2); D com os nativos | `harn:196-198, 201, 207-208, 214-219` (`[2000, "timeout"]`, `[5000, "timeout"]`), `harn:222-225`; nativos só em D: `nat:335`, `nat:338, 340`, I4-C20 `nat:228-231`, I4-C21 `nat:238-245`, I4-C37 `nat:322-327` | carried | PASS |
| C41 | A/B/C (17 cada); D | `store:327, 335-340, 357, 360-365, 374-380, 404, 438-448, 456-459, 474-476, 486-487, 505-511, 521-523`; `end:366, 383, 387-399, 429, 449-467, 494-504, 529-540, 570-577, 584-600` | `end` atualizado (+39) | PASS |
| C42 | A/B (2 + console), C (2 + POSIX); D | `agent:187, 196, 206, 211, 214, 231, 236`; `cmd:424` POSIX `{status: null, signal, started: false, …, firstLine: "skill-me: abertura cancelada por <SINAL>; o agente não foi iniciado."}`; `cmd:456` Windows `status: 130` | carried | PASS |
| C43 | A/B/C (12 cada); D | `store:560-571, 578-581, 598-600, 619, 626-632`; `end:656-661, 671-679, 687-691, 712-715, 725-731, 739-750, 772, 792-802, 814-819`, com as linhas literais em `end:610-617, 755-762` | `end` atualizado (+39) | PASS |
| C44 | A/B/C (3 cada); D | `harn:263-271` (`pending`, `pending`, `failed`, `failed`, `inactive`, `pending`, `concluded`); `harn:281-283`; `harn:286, 289` `[1000, "timeout"]`, `[5000, "timeout"]`; `harn:300-304`; nativos I4-C22 (`nat:251-256`) e I25-C40 em D | carried | PASS |
| C45 | A/B (resolução + controle Windows), C (resolução + POSIX real); D | `agent:132-146, 154`; `cmd:166-175, 182, 185-186` (POSIX real em C: `{status: 7, stdout, agent, argv: ["--","a b","","ç"], cwd, path}`; PATH ausente → 127 `executable_not_found`); `cmd:198-201` (Windows real em A/B) | carried | PASS |

**Checks com a prova verde em todas as execuções aplicáveis: 45/45.** Cada check tem nome executado no TAP e asserção com `arquivo:linha` e valor legível; nenhum depende de filtro com 0 testes. O C28 passa de FAIL em R7 para PASS nesta rodada, com a ressalva declarada sobre a causa original.

## FAIL de R7 e incidente de R5 (preservados; não repetidos)

- **R7** (`1a44ef1`, em `a755c37`): FAIL 44/45, só por C28 em B (`undefined !== 0` em 62.170 ms, launcher encerrado pelo prazo de 60 s do teste, cenário e saída no mesmo `plugin.json`). C33/C34 fechados. Esse relatório está no histórico do git e foi a origem desta correção. Esta rodada não reabriu nem reproduziu a falha de R7. B passou agora, numa execução só, o que não mede a taxa da perda original.
- **R5**: comprovou 45/45 checks em `d939df8`, mas o processo não foi conforme. Uma sonda extra (`verifier-round5/wsl-path-semantics.sh`), na linha "PATH ausente", iniciou o Codex CLI real do WSL até 5 vezes. A auditoria de metadados registrou 12 arquivos do perfil `~/.codex` com mtime na janela, sem linha de base de conteúdo para atribuir cada escrita. R6 e R7 foram conformes; as auditorias externas (12.113 entradas) não observaram diferenças adicionais nas janelas delas. Os relatórios e as pastas `verifier-round5/` a `verifier-round7/` não foram editados por mim. Nesta rodada **não repeti, não conferi e não reproduzi** aquele comando nem qualquer sonda.

## Processo desta rodada (o que os meus comandos mostram)

- **Executado**:
  - git: `rev-parse`, `status`, `diff`, `log`, `show`, `ls-files`, `check-ignore`, `archive`, `get-tar-commit-id`, `worktree list`;
  - versões de `node`, `npm` e `python` no Windows;
  - as execuções versionadas A–D;
  - no WSL, a listagem das distros (`wsl.exe -l -q`) e `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc` só com os meus scripts (`wsl-prepare.sh`, `wsl-run.sh`, `wsl-cleanup.sh`). Eles copiam arquivos, consultam versões (`node --version`, `npm-cli.js --version`, `python3 --version`) e rodam o alvo versionado;
  - `stat` e `sha256sum` do tar; contagem de CR por `python -I` e `od` nos meus scripts;
  - consultas `node -e` só de leitura: configuração de rodadas, `npmCli()`, `testConcurrency()` e linha de base do `%TEMP%`;
  - `Get-CimInstance Win32_Process`, só leitura, e `taskkill` na minha árvore do primeiro início de D (item seguinte), com `iconv` para ler a saída;
  - `matrix.mjs`, que lê os TAP; `cleanup-temp.mjs`, que só mexe no `%TEMP%` (seção "Limpeza"); `fill-report.mjs`, que gerou a primeira versão deste relatório a partir do rascunho.
- **Observação: D teve dois inícios, e eu interrompi o primeiro.**
  - **Por que interrompi.** Lancei o `npm test` em segundo plano com o teto da minha ferramenta em 600.000 ms (10 min). Isso fica abaixo das durações já medidas desse gate nesta máquina, de 7,7 a 12,8 min. Para a ferramenta não encerrar a suíte no meio, interrompi esse primeiro início por volta de 1 min, **antes de um resultado completo do gate**.
  - **O que rodou.** Está preservado em `D-aborted-timeout-config.npm-test.txt`. A governança rodou completa, 6/6. O motor de revisão teve 10 testes nomeados aprovados (`C10` ×4, `C11` ×3, `C1`, `C2`, `C3`). `C4` não tinha reportado, e o resumo do motor, o doctor e as integrações não chegaram a reportar. Não há asserção vermelha nesses fragmentos, mas não conto o primeiro início como gate verde.
  - **Como identifiquei a árvore.** Pela listagem de processos do Windows (`Get-CimInstance Win32_Process`, só leitura): `node npm-cli.js test`, PID 134172, criado às 23:44:19, o `start` gravado.
  - **O que o `taskkill` fez.** Encerrei só essa árvore, com `taskkill /T /F /PID 134172`. Ele informou a finalização de 49840, 126728, 127344, 97112, 111328 e 134172. Para o PID 140136, filho de 49840, respondeu que não podia finalizá-lo (“não há suporte para a operação tentada”). Não encerrei o 140136 e não sei o que ele era.
  - **Conferência depois.** A minha consulta seguinte, filtrada por esses PIDs e pelos filhos deles, não devolveu nenhuma linha. A auditoria posterior do orquestrador (`D-interrupted-attempt-audit.json`) confirma 134172 e os descendentes 111328, 97112, 127344, 126728 e 49840 como a árvore própria do `npm test`. Registra também que a consulta dele não encontrou o 140136.
  - **Segundo início.** Entre os dois inícios, o HEAD continuou `8c847d0` e o `git status` estava vazio; nenhuma fonte mudou. Iniciei D de novo com o teto da ferramenta em 7.200.000 ms (2 h), e essa é a **única execução completa** do gate. Mudou só o teto da minha ferramenta; nenhum prazo de teste mudou.
  - **Não foi repetição para ficar verde**: o primeiro início não chegou a um resultado completo do gate. Ele deixou um `code-review-test-*` no `%TEMP%`, que removi na limpeza.
- **Carga alheia na máquina**: durante A–D rodavam processos de outros projetos e sessões, que não são meus e que não encerrei. Eram uma suíte de testes de ponta a ponta de outro projeto (desde 23:36:19), workers de navegador automatizado, scripts Python de outra tarefa e outras sessões de agente. Apareceram na listagem de processos, só leitura. Os identificadores ficam só nos registros brutos, e este relatório não os reproduz. B e D passaram sob essa carga.
- **Outras observações menores**: (1) um `grep -c $'\r'` no Git Bash reportou CR nos meus scripts. Os bytes conferidos pelo Python deram 0 CR, e os scripts rodaram com `set -euo pipefail`. Foi artefato de medida. (2) Um worktree git no `%TEMP%`, já presente na linha de base, não é meu, e não o toquei.
- **Não executado**:
  - nenhum `codex`, `claude`, `hermes`, `gemini` ou outro agente real, nem `--version` ou `--help`;
  - nenhum `execvp`/`spawn` desses nomes fora dos testes versionados;
  - nenhuma sonda antiga ou nova, nenhuma remoção do PATH real em diagnóstico e nenhuma chamada de rede fora dos testes locais versionados;
  - nenhuma leitura de credencial, perfil pessoal ou banco;
  - os gates globais antigos do WSL, que medem duração por `Date.now()`;
  - nenhum processo de outra sessão foi encerrado.

  Não li nem alterei `profile-before.json`, `profile-final.json`, `profile-metadata-snapshot.py` e `profile-compare.py`. Na retificação li só a comparação externa, como autorizado (seção "Perfil pessoal").
- **Agentes nas provas**: os do alvo são de fixture. `launchEnv` põe `PATH: bin` (`helpers/launch.mjs`, sem diff), e o `npm run` de C33/C34 recebe só `node`, `sh` e o bin de fixture. O PATH de C não tinha `/usr/bin` nem pasta com agente real. O Hermes nativo de D entra pelo runtime dos testes versionados, com HOME temporário, como autorizado. Não auditei o ambiente de cada teste do gate fora do alvo I25; eles rodaram como estão versionados.

## Perfil pessoal

Não medi o perfil e, por medida minha, não afirmo que esteja intacto.

- **A auditoria é do orquestrador, não minha.** A linha de base (`profile-before.json`, 23:31) e a comparação final (`profile-comparison-final.json`) são externas. Não li a linha de base, o `profile-final.json` nem os scripts.
- **Correção desta versão.** A primeira versão dizia, de forma absoluta, que até o fim do relatório a pasta não tinha comparação. Isso valia só para a minha conferência da pasta, pouco antes de gravar a primeira versão. O arquivo existe agora, e nesta retificação li só ele, como autorizado.
- **O que a comparação registra.** Escopo só de metadados, de antes da rodada 8 até o fim das provas; 12.113 entradas na linha de base e no fim; 0 erros; 0 adicionadas, 0 removidas e 0 modificadas.
- **Limites.** Por ser de metadados, não prova conteúdo intacto. Também não desfaz nem esclarece o incidente de R5.

## Falhas anteriores e limitações (preservadas)

- **Causa da perda do primeiro registro (R7, B)**: desconhecida e não eliminada. A correção torna a falha diagnosticável e limitada ao prazo. Uma passada verde não mede a taxa (seção do C28).
- **Relato do autor, não prova minha** (`build.md:691`, `:734-763`): o primeiro `npm test` do Windows em `2dfe676` saiu 1 por `T7-C10` sob carga. Isolado, passou; as integrações completas passaram com 8 e com 4 arquivos. **Essa intermitência não está resolvida.** Na execução completa do meu D, o T7-C10 passou (`D-npm-test.txt:1031`); uma execução não mede taxa. O teto 8 da #23 é vinculante e não mudou (`scripts/test-integrations.mjs:14` `MAX_PARALLEL_FILES = 8`, sem diff na feature; `testConcurrency()` = 8 com 32 núcleos).
- **WSL, gates globais (relato do autor)**: no layout isolado, I4-C36 e `collector-probe-C10` falharam em asserções antigas de duração por `Date.now()`. O journal mostra o relógio voltando ~0,68 s a cada ~29 s (`build.md:718-732`). Não executei esses gates no WSL: não são válidos nesse host para asserções antigas de duração. No meu C, o relógio de parede mediu 68 s (23:42:57–23:44:05) para `duration_ms` 70.877 do runner, compatível com esses passos. Nenhuma asserção do alvo depende disso. A CI real do GitHub ainda vai verificar Ubuntu, macOS e Windows depois do push.
- C33/C34: o RED com o arranjo anterior é do autor (`build.md:661`). A minha prova atual é a negativa nomeada (`end:341-342`) mais C33/C34 verdes no layout sem `sh`. O RED do C28 com a fixture antiga também é do autor (`build.md:838`). Não o repeti; a análise do poder discriminante está acima.
- Continuam das rodadas anteriores: a variante “lock ausente” de C43 sem teste nomeado; as janelas do plugin em C44; o ramo com várias capturas `active` na falha do encerramento sem prova; recusa e EOF num console real do Windows só em processo ou pty; nativos do Hermes pulados na CI; C23 sem asserção de tempo; variante link do C17 não executada no Windows desta máquina (executada em C); macOS e runner da CI não executados.
- Julgamento de suficiência das asserções nos arquivos sem diff: carried from R7 (`a755c37`), que o trazia de R6 (`ffc5937`) e de R4 (`e710dc6`).
- Uso real sem sessão de agente: `Unresolved` 2, `blocks go-live`.

## Findings (em ordem)

1. **Nenhum achado bloqueante.** O C28 está corrigido na prova e na fixture. Os 2 testes passaram em A, B, C e D. A regressão comprova a injeção e a ausência de nova tentativa, e as asserções do caso saudável não mudaram.
2. **Limitação declarada** (não bloqueante, fora da correção): a causa da perda original do primeiro registro em B de R7 é desconhecida e pode voltar. Se voltar, a prova falha em ~25–30 s com `started: false` e os contadores, sem fingir 3 gravados. Uma execução verde de B não mede taxa.
3. **C33/C34 continuam fechados**: passaram no layout isolado sem `sh`, inclusive a prova nomeada do arranjo, e os controles do Windows ficaram verdes.
4. **Processo conforme**, com uma observação: D teve dois inícios. O primeiro foi interrompido por mim antes de um resultado completo do gate, por causa do teto da minha ferramenta; o segundo é a única execução completa. A listagem de processos foi só de leitura. Nenhuma sonda, nenhum agente real.
5. Pendências fora deste Verifier: a revisão formal 5 (orquestrador), a CI real do GitHub depois do push e o uso real (`Unresolved` 2, `blocks go-live`).

## Gate

| Gate | Resultado |
| --- | --- |
| Alvo completo, Windows, Node 24.22.1, concorrência 4 | 100: 94 pass, 0 fail, 6 skip — exit 0 |
| Alvo completo, Windows, Node 24.13.0 oficial (CI), concorrência 4 | 100: 94 pass, 0 fail, 6 skip — exit 0 |
| Alvo completo, WSL Ubuntu, uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, PATH sem `/usr/bin`, cópia exata | 100: 94 pass, 0 fail, 6 skip — exit 0 |
| `npm test`, Windows, Node 24.22.1, Hermes real pelos testes (segundo início; única execução completa) | exit 0 — governança 6/6; motor 16/16; doctor 417 (410 pass, 0 fail, 7 skip); integrações 553 (540 pass, 0 fail, 13 skip); total 992: 972 pass, 0 fail, 20 skip; 12 nativos do Hermes e os dois I25-C28 aprovados |

A, B e C rodaram uma vez cada. Em D, a governança rodou completa nos dois inícios (6/6 nos dois). O motor de revisão rodou em parte no primeiro (10 testes nomeados aprovados) e completo no segundo. Doctor e integrações rodaram só no segundo. Nada foi repetido para ficar verde.

## Limpeza

- **`%TEMP%`**: gravei a linha de base antes de A (`temp-baseline.json`, 60.014 nomes, 0 `skill-me i4 i25 *`). Depois de D, `cleanup-temp.mjs` (Node 24.22.1) removeu só entradas que atendiam a todas estas condições: fora da linha de base; prefixo `skill-me i4 `, `code-review-test-` ou `codex-code-review-`; diretório e não link; filho direto do `%TEMP%`; mtime na janela 23:36:13–23:55:30. Foram **454 removidas e 0 recusas** (`cleanup-temp.txt`, `cleanup-temp-breakdown.txt`), todas com mtime entre 23:38:58 e 23:55:07:
  - 325 `skill-me i4 i25 *` de B: o `rmSync` do Node 24.13.0 não apaga caminhos com "ação" no Windows;
  - 124 `i5`, 2 `t7`, 1 `secoes` e 1 `ausente`, de testes de outras issues que só rodam em D;
  - o `code-review-test-*` do primeiro início de D.
- Também apaguei com `rmdir`, sob as mesmas conferências, um `skill-me i5 c7 *` vazio (23:49:50). Ele foi criado em D por `policy.unit.test.mjs:207`, que não remove o próprio diretório. Restaram 0 `skill-me i4 i25 *`. As 12 entradas novas fora do filtro ficaram; são diretórios e arquivos temporários de outros aplicativos e sessões, não meus.
- **Cinco nomes da linha de base sumiram durante a rodada**: quatro arquivos temporários de outros aplicativos e um diretório `code-review-test-*` anterior à rodada. A remoção não foi minha. O meu script só age sobre nomes fora da linha de base (`fresh = now.filter((name) => !known.has(name))`), e o teste do motor só apaga o próprio diretório (`scripts/code-review/review.test.mjs:55-65`). A autoria é desconhecida. Outro `code-review-test-*` da linha de base continua lá.
- **WSL**: `wsl-cleanup.sh` removeu o scratch `/tmp/skillme-verifier-r8.??????` desta rodada depois de conferir esse padrão absoluto e que era diretório, não link. Restaram 0, e não há `skill-me i4 i25 *` em `/tmp` (`C-wsl-cleanup.txt`).
- **Processos**: depois de D, a listagem (só leitura) não mostrou nenhum `node.exe` com `debuguer_skills` na linha de comando nem nenhum `hermes.exe`.
- **Mantidos na pasta ignorada `verifier-round8/`**: os logs de A–D, inclusive os do primeiro início de D, `matrix.txt`, o tar do HEAD, a linha de base do `%TEMP%`, os relatórios da limpeza, o rascunho e o gerador da primeira versão deste relatório e os scripts desta rodada. Os registros brutos ficam como estão, para auditoria. Os arquivos de auditoria do orquestrador ficaram como estavam: não os alterei nem apaguei, e só li a comparação final e a auditoria do D. Não toquei em nada de `verifier-round5/` a `verifier-round7/`. O worktree da linha de base ficou como estava.
- Configuração, estado de review e prefixo npm real não foram tocados. No fim, o HEAD continua `8c847d0`. O `git status` estava vazio antes de eu gravar este arquivo, e depois só ele aparece modificado.

## Retificação factual (mesma rodada 8, 27/10/2026, sem novas execuções)

Depois da conferência dos registros pelo orquestrador, corrigi só a redação deste relatório. Não executei nada, não mudei resultados e não mudei o veredito:

1. **Primeiro início de D.** A primeira versão dizia que ele foi interrompido “antes de qualquer resultado” e que “nenhum resultado tinha sido observado”. É impreciso: rodaram a governança completa (6/6) e 10 testes nomeados do motor até `C3`, sem resultado completo do gate. Todas as ocorrências agora dizem “antes de um resultado completo do gate”, e o relatório registra dois inícios e uma execução completa.
2. **Contradição real que encontrei**: a frase “cada suíte rodou uma única vez com resultado” era falsa, porque a governança rodou completa nos dois inícios de D. Corrigi na seção "Gate".
3. **PID 140136.** A frase “um neto já tinha saído” era inferência minha. Agora o relatório traz a resposta do `taskkill`, a minha consulta seguinte e a do orquestrador, sem afirmar o que aconteceu com o 140136 nem que eu o encerrei.
4. **Comparação do perfil.** A comparação externa existe agora. Corrigi a afirmação absoluta e separei a auditoria do orquestrador da minha medida (seção "Perfil pessoal").
5. **Identificadores de terceiros.** Nomes e caminhos de outros projetos, sessões, temporários e do worktree alheio viraram categorias e contagens. Os registros brutos ignorados não mudaram.
6. **Lista do executado.** Ficou completa: listagem das distros WSL, `stat`/`sha256sum`, contagem de CR, consultas `node -e` de leitura, `Get-CimInstance`, `taskkill`, `iconv` e `fill-report.mjs`.
