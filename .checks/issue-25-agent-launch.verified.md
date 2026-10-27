# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25

**Verdict**: **FAIL**. O gate D (`npm test` completo no Windows, Node 24.22.1) saiu com **1**: 994 testes, 973 pass, **1 fail**, 20 skip. A falha é `T8-C15 concurrent producers` (`tests/integrations/traces/concurrency.cli.test.mjs:107`, issue #8). Pela regra desta rodada, uma falha em D é FAIL, sem correção e sem repetição; não repeti nada. Os 45 checks têm prova verde: o alvo de 102 testes passou em A, B e C (96 pass, 0 fail, 6 skip em cada), e os 97 testes I25 do gate D também passaram. O que bloqueia é o gate, não um check.
**Checks**: 45/45 com nome executado no TAP, asserção citada com `arquivo:linha` e prova verde em A, B, C e D, onde a plataforma se aplica. **Gate D: vermelho** (`T8-C15`).
**C1 / C28 / C32 / C34**: verdes em A, B, C e D. B rodou num **clone git novo com `core.autocrlf=true`**. A causa original da perda do C28 e a da falha de C32 na CI continuam **desconhecidas e não eliminadas**. Para o C34 do WSL, não há causa única demonstrada.
**Profile**: light (sem fault injection, `Coverage` ou `Test policy` próprios; sem fonte vinculante de UI).
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..dd891798d22bcc7fd6ec62f9cdf4f3edb389a953` (feature inteira, 62 commits, checks C1–C45). O produto não muda desde `7ab5dbf`: `src`, `package.json`, `scripts` e `.github` sem diff em `7ab5dbf..HEAD`, e `scripts`/`.github` sem diff na feature inteira. Desde R8 (`3bc40b1`, conteúdo `8c847d0`) mudaram:
- `.gitattributes`, novo (`abae80a`);
- `tests/integrations/helpers/launch.mjs`, `launch/end.e2e.test.mjs` (`485467c`, `6732475`) e `launch/report.cli.test.mjs` (`6732475`);
- `code-review.config.json`, só `roundOverrides["25"]`: `maxRounds` de 5 para 6 e `approval`;
- task, checklist e build, nos três arquivos só com linhas acrescentadas (0 linhas removidas em task e checklist).
**Round**: 9, a **única** nova autorizada. Exceção do proprietário só para a #25: “Autorizar a 9ª verificação e a 6ª revisão” ([comentário 6434588924](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6434588924)). Tetos: 9 Verifiers e 6 revisões formais. As 8 verificações e as 5 revisões anteriores ficam no histórico; o PASS da R8 e o `ready` da formal 5 cobrem o conteúdo anterior (`3bc40b1`). Escopo: todos os C1–C45 na faixa inteira.
**Verifier**: subagente independente novo (Claude Opus 5.5). Não sou o autor nem um Verifier anterior. Código, testes, critérios, checklist e configuração ficaram somente leitura. Nenhum commit, push, PR, merge, `review:run` nem mudança de limite, estado ou histórico. A revisão formal 6 é do orquestrador; com este FAIL, cabe ao orquestrador e ao proprietário decidir o próximo passo.

Data: 27/10/2026, 02:39–02:59 (-03). HEAD `dd89179` (árvore `832b030d…`) do início ao fim. `git status --porcelain=v1 -uall` do checkout principal vazio antes (`verifier-round9/git-status-before.txt`), depois de A, depois de B, antes e depois de D. Ao final, só este arquivo muda. O relatório de R8 foi lido inteiro antes de ser substituído.

## Veredito em uma linha

**FAIL, só pelo gate D.** O alvo de 102 testes rodou uma vez em cada ambiente: **A** 96/0/6; **B**, num clone novo com `core.autocrlf=true`, 96/0/6; **C**, no WSL isolado, 96/0/6. Todos saíram com 0 e têm os mesmos 102 nomes. O `npm test` completo (D, uma execução, 9 min 43 s, orçamento de 2 h configurado antes) saiu com **1**: governança 6/6, motor 16/16, doctor 417 (410/0/7), integrações 555 (541 pass, **1 fail**, 13 skip). Os 12 nativos do Hermes passaram, assim como os 97 I25, os dois C28, o T7-C10 e o I4-C36. **Falhou o `T8-C15`**: o produtor `b` recebeu `io_failure` com 20 das 40 entradas perdidas. A causa não é conhecida.

## Fontes lidas nesta rodada

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `tlc-implement/references/verify.md` | inteiros; perfil `light` |
| `.tasks/issue-25-agent-launch.md` | inteiro (507 linhas): critérios 1–37, as seções “Regressão de fixture da CI do PR #28 (C28…)” e “Regressões da CI do PR #28 no Windows (C1 e C32…)” e as Sources com 6434588924 |
| `.checks/issue-25-agent-launch.md` | inteiro (527 linhas): Landing, inclusive “Cronologia explícita no C34” (`:62`), “Bin do launcher em LF em todo checkout” (`:63`), “Diagnóstico de C32” (`:64`) e “Diagnóstico do C28 na fixture” (`:65`); C1–C45 com os acréscimos de C1 (`:79`), C28 (`:172`), C32 (`:185`), C33 (`:189`) e C34 (`:193`); Swept e Handoff |
| `.checks/issue-25-agent-launch.build.md` | inteiro (1.027 linhas); **relato do autor, não prova minha** |
| `.checks/code-review/issue-25/context-ci28-verifier9-approved.json` | inteiro: corpo da issue com **6 ACs** e **16 comentários**. Os três últimos são a autorização da 8ª, o handoff das correções de C1, C32 e C34 e a autorização “Autorizar a 9ª verificação e a 6ª revisão”. Os comentários não trazem ID; o 6434588924 vem da task, do checklist e do pedido |
| `.checks/issue-25-agent-launch.verified.md` de R8 | inteiro, antes de substituí-lo |
| Diffs `3bc40b1..HEAD` | inteiros: `.gitattributes`, `code-review.config.json`, `helpers/launch.mjs`, `end.e2e.test.mjs` e `report.cli.test.mjs` |
| `src/integrations/launch/command.mjs:135-276` (`launchAgent`, `runSkillMe` com `deps`) e `privacy/store.mjs` por Grep (`nowMs`, `latestLaunch`) | para julgar o isolamento do relógio. **Sem diff desde `7ab5dbf`** |
| Demais arquivos de teste do alvo e o teste nativo | 0 linhas de diff em `a755c37..HEAD` (portanto também em `8c847d0..HEAD`); fixtures, `helpers/observe.mjs`, `helpers/traces-probe.mjs` e `helpers/cli.mjs` sem diff em `8c847d0..HEAD`. Amostra das citações da R8 relida no HEAD, todas conferem: `cmd:48-50, 65, 77, 105, 117, 130, 228, 267, 342, 350, 424, 456`; `prep:93, 189, 223, 238`; `sess:67, 111, 230, 282`; `store:79, 168`; `agent:132, 187`; `docs:82`; `harn:88, 263`; `nat:335`; `hermes-plugin-session.py:25-26, 70-76`; `traces-probe.mjs:95, 101` |
| `tests/integrations/traces/concurrency.cli.test.mjs:97-125` | lido depois de D, para descrever a falha; **sem diff na feature** |

## Ambientes e execuções — verified at `dd89179`

Execuções **em sequência**, uma invocação do alvo por ambiente, sem repetição. Logs em `.checks/code-review/issue-25/verifier-round9/`, pasta ignorada. O alvo de A, B e C foi `node --test --test-concurrency=4 --test-reporter=spec … --test-reporter=tap … tests/integrations/launch/*.test.mjs tests/integrations/hermes-harness.unit.test.mjs`, com 9 arquivos. As quatro execuções rodaram em segundo plano, com o teto de **7.200.000 ms (2 h)** na ferramenta já configurado no início de cada uma. Nenhuma foi interrompida.

| # | Ambiente | Resultado |
| --- | --- | --- |
| A | Windows 11, checkout principal, Node v24.22.1 (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10; `npm_execpath` ausente; `npmCli()` = `C:\nvm4w\nodejs\node_modules\npm\bin\npm-cli.js`; 02:40:21–02:43:04 (`A-win-24.22.1.*`) | **102 testes: 96 pass, 0 fail, 6 skip**, exit 0. Diagnóstico impresso pelo teste: a variante link do C17 não foi executada, por falta de privilégio de symlink de arquivo (`tap:500`) |
| B | Windows 11, Node v24.13.0 oficial (`ci-node-24.13.0/node-v24.13.0-win-x64/node.exe`) no início do `PATH`; npm **11.6.2** adjacente (primeiro `npm` do `PATH`; `npmCli()` = o `node_modules` do zip); `npm_execpath` ausente. **Clone git novo**: `git clone --no-hardlinks --config core.autocrlf=true <checkout> verifier-round9/B-clone`, com a configuração só em `.git/config` do clone; a do sistema continua `true` e não foi tocada. `node_modules` copiado do checkout, sem rede. 02:43:42–02:46:23 (`B-win-24.13.0-clone-autocrlf-true.*`, `B-clone-prepare.txt`, `B-clone-after.txt`) | **102 testes: 96 pass, 0 fail, 6 skip**, exit 0; o mesmo diagnóstico do C17. Antes: HEAD do clone `dd89179…` (= esperado), árvore `832b030d…`, `core.autocrlf` local `true` (efetivo `true`). **A conversão estava ativa**: `package.json` `w/crlf` (34 CRLF). `cli.mjs` `i/lf w/lf attr/text eol=lf`, 0 CR, primeira linha `b'#!/usr/bin/env node\n'`, modo `100755`. `git status` vazio antes e depois de copiar `node_modules`. **Depois de B**: `cli.mjs` com os mesmos bytes (4.257 bytes, 0 CR, 125 LF, mesma primeira linha) e **`git status` vazio**. Clone removido depois da conferência (`B-clone-cleanup.txt`) |
| C | WSL `Ubuntu`, `oldboydev` uid 1000, `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc` só com os meus scripts (`wsl-prepare.sh`, `wsl-run.sh`, `wsl-cleanup.sh`, 0 CR). Cópia: `git -c core.autocrlf=false archive HEAD`, tar de **5.570.560 bytes**, sha256 `33f8d9af…49670c64`, `get-tar-commit-id` = `dd891798…`, árvore extraída `832b030d…` = `HEAD^{tree}` (também depois de copiar `node_modules`, que é ignorado), `cli.mjs` 755 (git `100755`), `#!/usr/bin/env node`, 0 CR. `node_modules` copiado, sem rede (yaml 2.9.0, smol-toml 1.9.1). **Prefixo isolado**: `prefix/bin` = `node npm npx`, **sem `sh`**. O `node` é cópia byte a byte de `/usr/bin/nsolid` (sha256 `150946e4…bb6351`), v24.13.0, `execPath` no prefixo; npm 11.6.2 copiado em `prefix/lib/node_modules/npm`, e `npmCli()` aponta para ele. `env -i`, `HOME=<scratch>/home`, `LANG=C.UTF-8`, **`PATH=<scratch>/prefix/bin:<scratch>/tools`, sem `/usr/bin`**. `tools` só com links a `/usr/bin/{sh (dash), git, python3 (3.12.3), id, grep, mkfifo}`; nenhum agente, `node`, `npm`, `npx` ou `corepack`. 02:47:01–02:48:08 (`C-wsl-24.13.0-isolado.*`, `wsl-prepare.txt`) | **102 testes: 96 pass, 0 fail, 6 skip**, exit 0. Rodaram e passaram os 2 `I25-C33`, inclusive o arranjo, os **4 `I25-C34`**, os 2 `I25-C28` e os 2 `I25-C32`. A variante link do C17 foi executada. Árvore `832b030d…` igual antes e depois; `cli.mjs` 755 e 0 CR depois. `/home/oldboydev/.skill-me` e `.skill-me-authorization.json` ausentes antes e depois (só `test -e`); home do scratch vazio; 0 `skill-me i4 i25 *` em `/tmp` antes e depois |
| D | Windows, checkout principal, Node v24.22.1, npm 11.19.1, Python 3.12.10, `SKILL_ME_HERMES_PYTHON` ausente, `npm_execpath` ausente antes do `npm test`, 32 núcleos lógicos, `testConcurrency()` = 8, `MAX_PARALLEL_FILES` = 8. **Um início, uma execução completa**: 02:48:33–02:58:16 (`D-npm-test.*`) | **exit 1**. Governança 6: 6 pass. Motor de revisão 16: 16 pass. Doctor 417: 410 pass, 0 fail, 7 skip. Integrações 555: **541 pass, 1 fail, 13 skip**. Total **994: 973 pass, 1 fail, 20 skip**. A falha é `T8-C15` (seção “Gate D”). `git status` vazio antes e depois |

Os 102 nomes do TAP são os mesmos em A, B e C (`matrix.txt`). Há nome executado para cada um dos 45 checks, e nenhum filtro rodou com 0 testes. Matriz por check (pass/fail/skip):

| Check | A Win 24.22.1 | B Win 24.13.0, clone `autocrlf=true` | C WSL isolado 24.13.0 |
| --- | --- | --- | --- |
| C1–C3, C7, C9–C11, C13, C14, C18–C26, C29, C30, C35, C36 | 1p cada | 1p cada | 1p cada |
| **C28**, **C32** | **2p** cada | **2p** cada | **2p** cada |
| C4 | 3p | 3p | 2p/1s |
| C5 | 1p/1s | 1p/1s | 1p/1s |
| C6 | 1s | 1s | 1p |
| C8 | 2p | 2p | 1p/1s |
| C12, C16, C31, C40 | 2p cada | 2p cada | 2p cada |
| C15 | 1s | 1s | 1p |
| C17 | 4p (link omitido) | 4p (link omitido) | 4p (link executado) |
| C33 | 1p/1s | 1p/1s | 2p (com o arranjo) |
| **C34** | **4p** | **4p** | **4p** |
| C27, C37, C39, C44 | 3p cada | 3p cada | 3p cada |
| C38 | 1p | 1p | 1s |
| C41 | 17p | 17p | 17p |
| C42 | 3p/1s | 3p/1s | 3p/1s |
| C43 | 12p | 12p | 12p |
| C45 | 2p/1s | 2p/1s | 2p/1s |

Durações dos testes-chave no TAP, em segundos, na ordem A / B / C:
- C1: 2,4 / 2,0 / 0,66.
- C28 saudável: 4,8 / 4,4 / 1,3. C28 regressão: 29,0 / 29,2 / 26,2.
- C32: 10,0 / 10,1 / 2,7. C32 diagnóstico: 3,8 / 3,4 / 1,1.
- C34, os quatro testes:
  - cabeçalho: 14,2 / 12,6 / 2,5;
  - escolha: 18,6 / 16,6 / 4,3;
  - recuo: 6,6 / 5,9 / 1,5;
  - `--latest`: 9,0 / 7,7 / 1,7.

**Skips do alvo, com o motivo impresso pelo próprio teste.**
- A e B têm 6 cada, todos do POSIX:
  - C45 POSIX: “componente vazio do PATH como diretório atual é semântica do POSIX; o Windows tem o controle abaixo”;
  - C5 POSIX, C6 e C42 POSIX: “sinais POSIX: o Windows não tem grupo de processos nem SIGQUIT/SIGHUP/SIGTERM entregáveis”;
  - C33 arranjo: “o npm do Windows roda o script pelo ComSpec, não por um sh do PATH”;
  - C15 pty: “pseudoterminal só no POSIX…”.
- C também tem 6, todos só do Windows: C4 shim, C45 controle, C5 console, C42 console, C8 LOCALAPPDATA e C38 console.
- Todo caso pulado num ambiente rodou e passou no outro.

## Gate D — `npm test` completo (verified at `dd89179`, **vermelho**)

| Item | Situação |
| --- | --- |
| Resultado | **exit 1**. Total 994 (o esperado): 973 pass, **1 fail**, 20 skip. O `npm test` encadeia as suítes por `&&` (`package.json:13`); as integrações são a última, e todas rodaram até o fim |
| Falha | `✖ T8-C15 concurrent producers: dois produtores em paralelo confirmam cada evento uma vez e deixam estado e segmento coerentes` (3.167 ms; `D-npm-test.txt:1041, 1100-1130`). A asserção de `concurrency.cli.test.mjs:107` é `assert.deepEqual(run.report.delivery, {bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0}, name)`. Para o produtor `b`, o valor obtido foi `{bound: true, code: "io_failure", entries: 40, committed: 20, persisted: 20, lost: 20}`. São dois `hermes ingest` simultâneos sobre a mesma captura manual (`concurrency.cli.test.mjs:97-108`) |
| O que se sabe | O arquivo de teste **não tem diff na feature**. Os caminhos que ele exercita (`privacy/store.mjs`, `traces/binding.mjs`, `observe/delivery.mjs`) **mudaram na feature**, no produto, sem mudança desde `7ab5dbf`. O mesmo teste passou no D da R8 em `8c847d0`, com o mesmo produto. Segundo o build, que é relato do autor (`build.md:738-740`), o T8-C15 já falhou sob carga no G1 da #23, junto com o T7-C10 |
| O que **não** se sabe | **A causa.** O log traz só o resumo da entrega (`io_failure`), sem o erro de E/S de origem. Não atribuo a falha à carga, a EPERM/EBUSY do Windows, a um defeito da feature nem a um problema do teste. Não repeti o teste, nem isolado nem no gate, porque a instrução é FAIL sem repetir. Uma execução não mede taxa, e duas passadas anteriores não provam que a falha seja intermitente |
| Nativos do Hermes | os 12 executados e aprovados, nenhum pulado: I4-C18–C23, I4-C37, I25-C40 harness nativa, os três I23-C8 e o I4-C44b (`D-npm-test.txt:596-607`) |
| I25 no gate | 97 pass, 0 fail, 6 skip: o alvo de 96 mais o I25-C40 nativo. Os dois C28 (`:701-702`), os dois C32 (`:705-706`), os quatro C34 (`:734-737`) e o C1 (`:681`) passaram. T7-C10 (`:1033`) e I4-C36 (`:580`) também |
| Skips de D (20) | Doctor, 7: `{ skip: process.platform === "win32" }`, de PATH POSIX, symlink e FIFO. Integrações, 13: I4-C15 e T8-C4 (`posix-signals`), I4-C25b (`posix-modes`), I4-C25j/k/l (`posix-acl`, só Linux), I4-C25m (`macos-acl`) e os 6 I25 de POSIX de A. Todos são de plataforma; nenhum é nativo do Hermes |
| Runner | `scripts/test-integrations.mjs:14` `MAX_PARALLEL_FILES = 8`, `:16` `min(núcleos − 1, 8)`; sem diff na feature. Com 32 núcleos, 8 arquivos. O teto 8 da #23 está preservado |

## C1 — bin em LF em todo checkout (verified at `dd89179`)

| Item | Situação | Evidência |
| --- | --- | --- |
| Correção | `.gitattributes` (`abae80a`): 4 linhas de comentário com o porquê e **uma** regra, `src/integrations/launch/cli.mjs text eol=lf`. Nenhuma outra regra. Blob no índice `i/lf` | `git diff 3bc40b1..HEAD -- .gitattributes`; `cat -A` |
| Asserções de C1 | **sem mudança**: `command.cli.test.mjs` tem 0 linhas de diff em `a755c37..HEAD` | `cmd:48` `pkg.private === true`; `cmd:49` `bin` = `{"skill-me": "src/integrations/launch/cli.mjs"}`; `cmd:50` primeira linha `/^#!\/usr\/bin\/env node\r?$/`; `cmd:59` `npm link` com status 0; `cmd:65` `[0, SKILL_ME_HELP, ""]` de outro diretório; **`cmd:77` `git status` igual antes e depois** (“npm link não altera o checkout”) |
| B: clone novo com conversão | **passou** | Antes: `package.json` `w/crlf`, prova de que a conversão estava ativa; `cli.mjs` `w/lf attr/text eol=lf`, 0 CR; status vazio. Depois: `cli.mjs` com os mesmos 4.257 bytes e 0 CR; status vazio. O C1 do clone compara o `git status` do próprio clone (`REPO_ROOT`) |
| Limite | declarado | `cmd:50` aceita `\r`; a prova do LF é a medida de bytes acima, junto com `cmd:77`. O controle com um **clone novo** `core.autocrlf=false` não foi executado por mim. O C1 passou em C, numa cópia sem conversão (`archive` com `autocrlf=false`, repositório local com tudo no índice), e em A, no checkout principal (`autocrlf=true` do sistema, `cli.mjs` `w/lf`). O controle de clone com `false` é **evidência do autor** (`build.md:899-900`). Não repeti o RED, que é o clone sem `.gitattributes`. Continua o limite registrado pelo autor: o C1 compara a árvore compartilhada |

## C28 — fixture e diagnóstico (verified at `dd89179`; análise carried from R8 at `8c847d0`, sem diff)

`end.e2e.test.mjs:1-257` é igual a `8c847d0`, exceto o import da `:16`. Fixture e pré-carga não têm diff. A análise da R8 vale com as mesmas linhas:
- **Supervisor antes do parse**: `end:148` `signal` nulo; `end:149` a saída existe.
- **Orçamento**: `hermes-plugin-session.py:25-26` 25 s + 25 s; `:70-76` os demais hooks só disparam `if started`, sem reenvio. O supervisor externo continua com 60 s: `helpers/launch.mjs:119` `timeout = 60_000` e `:130` `SIGKILL`, mais 3 linhas pelos imports novos e sem mudança de valor.
- **Saudável EXIGE 3**: `end:157-161` `{started: true, delivered: true, enqueued: 3, sent: 3, queueFull: 0, failed: 0}`; `end:163-167` `{persisted: 3, states: todas "stopped", status: 0}`; `end:168` `eventos gravados: 3.`.
- **Regressão**:
  - `end:179-180` status 0;
  - `end:181-185` a última linha é exatamente `{started: false, delivered: false, stats: {enqueued: 1, delivered: 1, droppedQueueFull: 0, deliveryFailed: 0, oversize: 0, serializationFailed: 0, active: true}}`;
  - `end:187` `[["stopped", 0, 0]]`;
  - `end:188` sem ponteiro;
  - `end:189` `eventos gravados: 0.`.
- **Testemunha**: `end:194` os `rename` de `segmento.tmp` são exatamente `["EIO"]`, isto é, 1 rename com EIO e sem nova tentativa; `end:195` há 1 `unlink`. A injeção está em `traces-probe.mjs:95, 101`.

Os dois testes passaram em A, B, C e D. A injeção reproduz a **classe** da falha (primeira entrega perdida), e **não** a causa da perda original, que continua **desconhecida**. O C33 mantém o PATH isolado `node`/`sh`/fixture: `helpers/launch.mjs:65-72` e `end:380-382`.

## C32 — diagnóstico das invocações simultâneas (verified at `dd89179`)

| Item | Situação | Evidência |
| --- | --- | --- |
| Contrato e asserções | **iguais às de R8**. Os cenários A/B são os mesmos (linhas fora dos hunks), as duas invocações são simultâneas e o limite é o mesmo de 30 s: antes `waitFor(…, timeoutMs = 30_000)` (`end:43`), agora `helpers/launch.mjs:185` `Date.now() + 30_000` | Diff `3bc40b1..HEAD`: dentro do corpo, as asserções são as mesmas linha a linha, e só mudam as esperas e a indentação. `end:277` espera A2 e B2 com `["A","B"]` vivas; `end:280` A sai com 0; `end:283` IDs de execução diferentes; `end:286` `["stopped", "active"]`; `end:288` B3 com B viva; `end:291` B sai com 0; `end:293-294` registros `a-1, a-2` e `b-1, b-2, b-3` com o pseudônimo da chave de cada captura; `end:295` chaves próprias; `end:296` `[1, 1]` captura por execução |
| Apoio `withOverlappingRuns` (`helpers/launch.mjs:176-206`) | conferido | `:188` uma invocação que termina antes lança `<rótulo>: <nome> terminou antes`; `:189` `tempo esgotado: <rótulo>` só no prazo. Na falha: `:196-198` registra marcadores vistos, o ID de execução de cada probe e as capturas com `[invocation, segment, state, persisted, launchedAt, createdAt]`, sem chave; `:199` grava **todas** as barreiras; `:200-204` espera cada invocação e guarda status, sinal e stderr; `:205` relança com o JSON |
| Regressão `I25-C32 diagnóstico…` | **passou em A, B, C e D** | `end:311` B com o PATH de uma pasta vazia; `end:318` a espera falhou; **`end:320` primeira linha exatamente `eventos intercalados: B terminou antes`**, e não `tempo esgotado`; `end:322` `launchers.B` = `{status: 127, signal: null, stderr: "skill-me: claude não encontrado no PATH [executable_not_found]\n"}`; `end:323` `probes.B` nulo; **`end:324` A, liberada da barreira, termina com 0**; `end:325` o agente de A rodou; `end:326` só a captura de A, `stopped` |
| O que **não** está provado | declarado | A causa da falha de C32 na CI 40443538957 (Windows) continua **desconhecida e não eliminada**. A matriz de 3+3 clones é do autor (`build.md:904-910`) e não reproduziu a falha. As minhas passadas verdes, uma por ambiente, também não medem taxa. A correção só torna a falha diagnosticável e libera os agentes |

## C34 — cronologia explícita (verified at `dd89179`)

| Item | Situação | Evidência |
| --- | --- | --- |
| Regra do produto | **intacta**: maior `launchedAt`, depois `invocation`, sem `createdAt` | `privacy/store.mjs:1267` `b.launchedAt > a.launchedAt \|\| (b.launchedAt === a.launchedAt && b.invocation > a.invocation)`; sem diff desde `7ab5dbf` |
| Isolamento do relógio | **só nas aberturas e encerramentos em processo** | `deps.now` é lido em `command.mjs:205` (`startLaunch`, `nowMs`) e `:172` (`endLaunch`), e em nenhum outro ponto (Grep de `now` em `command.mjs`). O padrão do CLI é `Date.now` (`:253`). Prazos (`patiently`), lock, a espera de 750 ms (`settleMs`) e as entregas, que são outros processos com o próprio relógio, seguem com o tempo real. `launchClock` (`helpers/launch.mjs:157-167`) começa na base, anda com `performance.now()` (monotônico) e, depois de `release()`, devolve `Date.now()`. `runSkillMeInProcess` (`:145-153`) chama o mesmo `runSkillMe` exportado que o `cli.mjs` usa, com `env`, `home`, `now`, `proc` (um `EventEmitter`, sem sinais do processo de teste), `terminal: false` e stdout descartado (o launcher não escreve em stdout). `env` é o `launchEnv` (`:87-95`), com HOME, USERPROFILE, LOCALAPPDATA, os três diretórios de configuração e PATH de fixture |
| Cobertura do CLI | **mantida onde a prova afirma** | As consultas continuam pelo CLI real (`rep:45` `skillMe` = `runSkillMe(["report", …])`, um processo de `cli.mjs`). A sucessora da antiga nasce pelo hook real que o agente de fixture executa (`rep:44`). `--latest` e `npm run status` também são processos reais (`rep:235, 238`). Só as aberturas cuja ordem importa são em processo. O launcher pelo CLI real continua em `twoSegments` (`rep:54`, usado no primeiro C34 e no caso “ausente”) e nos demais checks |
| “escolhe a iniciada por último” | **passou em A, B, C e D** | `rep:132-133` relógios em início − 2 h e início − 1 h; `rep:138` e `:141` `release()` depois do marcador de cada abertura. **Precondições antes da escolha**: `rep:145` `assertLaunchedAfter(nova, antiga)`, cuja mensagem traz os dois `launchedAt` e as duas `invocation` (`rep:113`); `rep:155` a captura de `createdAt` mais recente das duas execuções é `[oldInv, 2]`, com todos os `createdAt` na mensagem. Ou seja, escolher por `createdAt` daria a antiga. **Escolha**: `rep:159` aberta `[newInv, true]`; `rep:160` texto `Execução aberta: sim`; `rep:166` segmento 1 da antiga apagado; `rep:169-171` sucessora com `segment` 2, `createdAt` > `launchedAt` da nova e `launchedAt` < o da nova; `rep:173` `{invocation: newInv, open: false, segments: [{segment: 1, capture: newOnly.id}], missing: []}`; `rep:177` precondição para a mais recente; `rep:181` texto exato com `Segmentos ausentes: 1` e só a seção 2 |
| Regressão `I25-C34 recuo do relógio…` | **passou em A, B, C e D** | `rep:198` primeira abertura em `base`; `rep:202` segunda em `base − 5_000`; **`rep:208-211`** `assert.throws(() => assertLaunchedAfter(second, first), error => error.message === "precondição temporal: launchedAt <segunda> (<inv>) não é posterior a <primeira> (<inv>)")`, ou seja, a precondição falha com os dois horários; **`rep:213`** `[chosen.invocation, chosen.open]` = `[firstInv, true]`, a escolha pelo `launchedAt`; `rep:216-217` as duas terminam com 0 |
| `--latest` e `npm run status` | **passou em A, B, C e D** | `rep:229` abertura em `createdAt` da automática + 60 s; `rep:233` precondição; `rep:237` `--latest` devolve a automática; `rep:239` `npm run status` = `[0, 1, [automatic.id]]` com `npmScriptEnv` |
| Cleanup | conferido | Scratches por `scratch()`, removidos no `after` (`rep:20-28`); as três provas rodam dentro de `withOverlappingRuns`, que em falha grava as barreiras e espera cada invocação. A mutação por `createdAt` é do autor (`build.md:975-981`); **não a repeti** |
| Observações (não bloqueantes) | declaradas | (1) Na regressão e no `--latest`, o relógio não recebe `release()`, então o `endedAt` também sai do relógio da prova; nenhuma asserção depende dele. O Landing descreve o `release()` para as aberturas da prova de escolha. (2) As invocações em processo não têm o supervisor de 60 s do `runSkillMe` (`helpers/launch.mjs:119-130`); em falha, dependem das barreiras de `:199`. (3) `whileAlive` mede o prazo com `Date.now()`, que no WSL pode recuar; isso desloca um prazo, mas não muda nenhuma asserção. (4) A falha do WSL em `abae80a` **não tem causa única demonstrada** (`checklist:62`); uma passada verde em C não mede taxa. Com as bases 1 h distantes e o avanço monotônico, um recuo do relógio de parede entre as aberturas não inverte a ordem da prova; isso é análise, não medida |

## Carried / reverified

| Item | Situação nesta rodada |
| --- | --- |
| Execução das provas de C1–C45 | **verified at `dd89179`**: todas rodaram por inteiro em A, B e C e passaram nos 97 I25 de D |
| `end.e2e` | **citações atualizadas**. `:1-257` iguais a `8c847d0`, exceto a `:16`. O C32 está em `:259-327`. Daí em diante, deslocamento exato de **+35** (`diff` vazio entre `8c847d0:295-820` e `HEAD:330-855`) |
| `report.cli` | **verified e citações atualizadas**: `:1-104` iguais, exceto o import da `:7`; o resto foi lido no HEAD |
| `helpers/launch.mjs` | **verified**: diff inteiro lido. Linhas anteriores deslocadas em +3 (`npmScriptEnv` `:65-72`, `runSkillMe` `:119-130`, `readLines` `:215`) |
| Julgamento das asserções em `prepare.cli`, `session.e2e`, `store.unit`, `agent.unit`, `command.cli`, `docs.test`, `hermes-harness.unit` e no teste nativo | **carried from R8 at `8c847d0`**, que o trazia de R7 (`a755c37`), R6 (`ffc5937`) e R4 (`e710dc6`). Esses arquivos têm 0 linhas de diff em `a755c37..HEAD`, e a amostra relida confere |
| Swept existing, core vendorizado | **carried from `ffc5937`**: `src/`, `scripts/` e `.github/` sem diff desde `7ab5dbf` (`scripts/` e `.github/` sem diff na feature inteira) |
| Configuração | `roundOverrides["25"]` = `{profile: "light", maxRounds: 6, approval: …6434588924…}`. Perfis globais com `maxRounds` 2 (`light`, `ui`, `direct`). As demais overrides (3, 4, 5, 6, 7, 8 e 23) não mudaram: o diff da feature só acrescenta o bloco `25`, e `3bc40b1..HEAD` só troca `maxRounds` e `approval` dele |

## Checks

`cmd` = `tests/integrations/launch/command.cli.test.mjs`, `prep` = `prepare.cli`, `sess` = `session.e2e`, `store` = `store.unit`, `end` = `end.e2e`, `rep` = `report.cli`, `agent` = `agent.unit`, `docs` = `docs.test`, `harn` = `tests/integrations/hermes-harness.unit.test.mjs`, `nat` = `tests/integrations/hermes-plugin.native.test.mjs`. "A/B/C" quer dizer que passou nos três ambientes; "D", que passou também no gate. Os nomes executados são os `I25-C<n> …` (os 102 do TAP). Os nativos de C40/C44 são `I25-C40 harness nativa…`, `I4-C20`, `I4-C21`, `I4-C22` e `I4-C37` (`D-npm-test.txt:596-607`).

| Check | Proof run | Evidência (arquivo:linha — valor esperado) | Revisão | Result |
| --- | --- | --- | --- | --- |
| C1 | A/B (clone `autocrlf=true`)/C; D | `cmd:48` `private === true`; `cmd:49` `bin`; `cmd:65` `[0, SKILL_ME_HELP, ""]`; `cmd:77` `git status` igual; bytes de `cli.mjs` no clone (seção C1) | verified (sem diff) | PASS |
| C2 | A/B/C; D | `cmd:96-98` `{status: 0, stdout, stderrFirst, argv: LITERAL_ARGS, stdin}` para os 3 agentes; `LITERAL_ARGS` em `cmd:80` | carried | PASS |
| C3 | A/B/C; D | `cmd:105` `{0: 0, 7: 7}` | carried | PASS |
| C4 | A/B (3), C (2); D | `cmd:117-120` `{status: 0, …, execPath: process.execPath, script: …/@openai/codex/bin/codex.js, sentinel: false}`; `cmd:130-133` `{status: 127, code: [launcher_requires_shell], sentinel: false}`; `agent:80, 91, 96, 102, 107, 114, 117-118` | carried | PASS |
| C5 | POSIX em C; console em A/B; D | `cmd:224` `launcherGone === false`; `cmd:228` `{status: 4, signal: null, signals: ["SIGINT","SIGQUIT","SIGHUP"]}`; `cmd:244-245` `CTRL_C_EVENT` `{…, signals: ["SIGINT"]}` | carried | PASS |
| C6 | C | `cmd:267` `{status: 0, signal: null, signals: ["SIGTERM"]}` | carried | PASS |
| C7 | A/B/C; D | `prep:93-94` `{status: 127, stdout: "", code: true, asked: false}`; `prep:98` árvore igual | carried | PASS |
| C8 | A/B (2), C (1); D | `prep:122-125` texto exato até cada pergunta; `prep:126` árvores iguais; `prep:141-144` LOCALAPPDATA | carried | PASS |
| C9 | A/B/C; D | `prep:163-168` `observe.json` no formato da #23; `prep:169` `plan.changes` = `[]`; `prep:174` `manualSteps`; `prep:176` | carried | PASS |
| C10 | A/B/C; D | `prep:189-191` `{exitCode: 3, code: [setup_declined], trees: before, started: false, root: false}` | carried | PASS |
| C11 | A/B/C; D | `prep:200` `{exitCode: 2, code: [root_not_absolute], …, relative: false, config: false}` | carried | PASS |
| C12 | A/B/C (2); D | `prep:223` `{status: 3, line: "skill-me: preparação pendente [setup_required]; rode skill-me codex num terminal…", trees: before, started: false}`; `prep:387-388` | carried | PASS |
| C13 | A/B/C; D | `prep:238` `{exitCode: 0, asked: 0, preview: false, config: <SHA-256>, settings: <SHA-256>, started: 1}` | carried | PASS |
| C14 | A/B/C; D | `prep:250` `observe_on` 4; `prep:266`; `prep:276`; `prep:290` | carried | PASS |
| C15 | C | `prep:398-403`; `prep:408` `{status: 3, declined: true, trees: before}` | carried | PASS |
| C16 | A/B/C (2); D | `sess:61` par do ambiente; `sess:67` `{origin: "launch", segment: 1, state: "active", content: true, retentionDays: 7, limits: {maxEvents: 500, maxBytes: 8388608}, launchedAt}`; `sess:69` ponteiro; `agent:160, 163, 165` | carried | PASS |
| C17 | A/B (link omitido, diagnóstico), C (link executado); D | `store:54`; `store:79` `["launch", invocation, 1, "2026-10-26T10:00:00.000Z"]`; `store:110`; `store:156`; `sess:300-301` | carried | PASS |
| C18 | A/B/C; D | `sess:111` `{status, stderr: "skill-me: não foi possível abrir a execução [<código>]\n", started: false, waited: true}`; `sess:124` | carried | PASS |
| C19 | A/B/C; D | `sess:147`; `sess:151`; `sess:152-160`; `sess:161` `[0, 0]`; `sess:165-167` | carried | PASS |
| C20 | A/B/C; D | `sess:190-191` `{bound: false, code: "binding_invalid", entries: 1, committed: 0, persisted: 0, lost: 1}`; `sess:192` | carried | PASS |
| C21 | A/B/C; D | `sess:208-211` bytes iguais com off e on | carried | PASS |
| C22 | A/B/C; D | `sess:230` `[1, "stopped", 500, 500, {}]`; `sess:236`; `sess:240-245` | carried | PASS |
| C23 | A/B/C; D | `sess:282` `["active", MAX_BYTES, {}, 1]`; `sess:289`; `sess:291` | carried | PASS |
| C24 | A/B/C; D | `store:168` `[opened.capture, "stopped", 1]`; `store:169` | carried | PASS |
| C25 | A/B/C; D | `end:72-79` 2 capturas `stopped`, `endedAt` ISO, ponteiro ausente, `{unknown_event: 1}`, status 3; `end:80-89` stderr exato | linhas iguais | PASS |
| C26 | A/B/C; D | `end:101-109` `eventos gravados: 0.` e a dica com `manualSteps[0]` | linhas iguais | PASS |
| C27 | A/B/C (3); D | `end:120` `{launch: true, code: "launch_ended", entries: 1, committed: 0, persisted: 0, lost: 1}`; `end:121`; `store:222, 226-228, 234, 236-237, 253, 256-260` | linhas iguais | PASS |
| **C28** | **A/B/C (2 cada)**; D (`:701-702`) | `end:148-149`; `end:155`; `end:157-161`; `end:163-167`; `end:168`; regressão `end:179-189`; `end:194` `["EIO"]`; `end:195` 1 `unlink` | verified (seção C28) | **PASS** |
| C29 | C (POSIX); A/B; D | `cmd:278`; `cmd:295`; `cmd:300` | carried | PASS |
| C30 | A/B/C; D | `cmd:342` `{status: 127/126, startCode: true, captures: [[1, "stopped", 0]]}` | carried | PASS |
| C31 | A/B/C (2); D | `end:205` status 6; `end:206-214` `[lock_present]`, `continua active`, `privacy stop`, `continua aberta`; `end:215` `["active", true]`; `end:222` `stopped`; `end:244-253` `[io_failure]`, `já não recebe registros`; `end:254` `["active", false]`; `end:256` `launch_ended`; `end:257-258` | linhas iguais | PASS |
| **C32** | **A/B/C (2 cada)**; D (`:705-706`) | `end:277, 280, 283, 286` `["stopped","active"]`, `288, 291, 293-296`; diagnóstico `end:320` `eventos intercalados: B terminou antes`, `end:322-326`; apoio `helpers/launch.mjs:185-205` | **verified** | **PASS** |
| C33 | A/B (1 + arranjo pulado), C (2, sem `sh`); D | `end:340` `npmScriptEnv`; `end:342` `[0, "on"]`; `end:343` `active`; `end:347` `[0, "off", []]`; `end:348` `active`; `end:352` 3× `LAUNCHED(1)`; `end:353-356`; `end:357` nenhuma automática; `end:358`. Arranjo: `end:376-377` `≠ 0` e `/spawn sh ENOENT/`; `end:380-382` `["node","sh"]` → `[process.execPath, "/bin/sh"]`; `end:384` `[0, "ok", "off"]` | atualizado (+35) | PASS |
| **C34** | **A/B/C (4 cada)**; D (`:734-737`) | `rep:82` texto; `rep:90-93` `{skillMeLaunchReport: 1, …}`; `rep:95-96` igual ao `report --root --capture`; `rep:104` sem escrita; `rep:145, 155` precondições; `rep:159` `[newInv, true]`; `rep:173` escolha; `rep:181` ausentes; recuo `rep:208-213`; `rep:237` `--latest` = automática; `rep:239` `npm run status` `[0, 1, [automatic.id]]` | **verified** | **PASS** |
| C35 | A/B/C; D | `rep:252-259` `[3, {"schemaVersion":1,"command":"report","status":"error","error":{"code":"not_configured"}}, ""]` e duas vezes `no_launch_capture` | atualizado | PASS |
| C36 | A/B/C; D | `cmd:350` `[0, SKILL_ME_HELP, ""]`; `cmd:354` `[2, "", SKILL_ME_HELP]`; `cmd:356-368` | carried | PASS |
| C37 | A/B/C (3); D | `docs:57`; `docs:60-62`; `docs:82` os 9 limites (`docs:44-54`); `docs:88-89`; `docs:93` | carried | PASS |
| C38 | A/B; D | `prep:355` `["done", 0]`; `prep:361`; `prep:363`; `prep:365` | carried | PASS |
| C39 | A/B/C (3); D | `harn:88` `["concluded", 0, 3]`; `harn:100-102`; `harn:186-188` | carried | PASS |
| C40 | A/B/C (2); nativos em D | `harn:196-198, 201, 207-208, 214-219` (`[2000, "timeout"]`, `[5000, "timeout"]`), `harn:222-225`; `nat:335` `{capture: "concluded", ingest: "concluded", inactive: "inactive", spawnfail: "failed", exit: "failed", disconnect: "failed", stall: "timeout"}`; I4-C20/C21/C37 (`nat:228-231, 238-245, 322-327`) | carried | PASS |
| C41 | A/B/C (17 cada); D | `store:327, 335-340, 357, 360-365, 374-380, 404, 438-448, 456-459, 474-476, 486-487, 505-511, 521-523`; `end:401, 418, 422-434, 464, 484-502, 529-539, 564-575, 605-612, 619-635` | `end` atualizado (+35) | PASS |
| C42 | A/B (2 + console), C (2 + POSIX); D | `agent:187, 196, 206, 211, 214, 231, 236`; `cmd:424` POSIX `{status: null, signal, started: false, …}`; `cmd:456` Windows `status: 130` | carried | PASS |
| C43 | A/B/C (12 cada); D | `store:560-571, 578-581, 598-600, 619, 626-632`; `end:691-696, 706-714, 722-726, 747-750, 760-766, 774-785, 807, 827-837, 849-854`, linhas literais em `end:645-652, 790-797` | `end` atualizado (+35) | PASS |
| C44 | A/B/C (3 cada); nativos em D | `harn:263-271`; `harn:281-283`; `harn:286, 289` `[1000, "timeout"]`, `[5000, "timeout"]`; `harn:300-304`; I4-C22 `nat:251-256` | carried | PASS |
| C45 | A/B (resolução + controle Windows), C (resolução + POSIX real); D | `agent:132-146, 154`; `cmd:166-175, 182, 185-186`; `cmd:198-201` | carried | PASS |

**Checks com prova verde: 45/45.** Isso não basta para PASS: **o gate D, obrigatório nesta rodada, saiu vermelho.**

## Processo desta rodada (o que os meus comandos mostram)

- **Executado**:
  - git: `rev-parse`, `status`, `diff`, `log`, `show`, `ls-files --eol`, `check-ignore`, `config --show-origin/--get` (leitura), `branch --show-current`, `archive`, `get-tar-commit-id`;
  - `clone --no-hardlinks --config core.autocrlf=true`, do repositório local, com a configuração só no clone;
  - versões de node, npm e python;
  - `node -e`/`-p` só de leitura: resumo da configuração de rodadas, contexto JSON, `availableParallelism`, `npmCli()` e `testConcurrency()`;
  - `python -I` para contar CR e bytes;
  - `stat` e `sha256sum`;
  - `wsl.exe -l -q`, a listagem das distros, e `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc` só com os meus scripts;
  - os quatro alvos versionados A–D;
  - os meus scripts: `temp-baseline.mjs`, `run-win-target.sh`, `b-clone-prepare.sh`, `b-clone-after.sh`, `run-d-npm-test.sh`, `matrix.mjs` e `cleanup-temp.mjs`, mais a remoção do clone por Node com o caminho conferido;
  - esperas por arquivo de término (`timeout … until grep`).
- **D**: **um início e uma execução completa**. O teto de 2 h foi configurado antes do início, e a execução levou 9 min 43 s. Não interrompi nem repeti nada. A falha do `T8-C15` **não** foi repetida, nem isolada nem no gate.
- **Não executado**:
  - nenhum `codex`, `claude`, `hermes`, `gemini` ou outro agente real, nem `--version` ou `--help` deles;
  - nenhum `execvp`/`spawn` desses nomes fora dos testes versionados;
  - nenhuma sonda antiga ou nova e nenhuma rede, além de testes locais com `--offline`;
  - nenhuma leitura de credencial, perfil pessoal ou banco;
  - nenhuma listagem ou encerramento de processos;
  - os gates globais antigos do WSL que medem duração com `Date.now()`;
  - nenhuma mutação ou fault injection minha (perfil light);
  - não li `profile-before.json`, `profile-compare.py` nem `profile-metadata-snapshot.py`, que são a auditoria externa do orquestrador. Na minha última listagem da pasta, `profile-comparison-final.json` não existia.
- **Agentes nas provas**: os do alvo são de fixture (`launchEnv`: `PATH: bin`; `helpers/launch.mjs:87-95`). O C1 no POSIX roda só `skill-me --help` com `PATH=<node>:/usr/bin:/bin` (`cmd:64`), e o `--help` não resolve nem inicia agente (`command.mjs:259-261`). O Hermes nativo de D entra pelo runtime dos testes versionados, com HOME temporário. Não auditei o ambiente de cada teste do gate fora do alvo I25; eles rodaram como estão versionados.
- **R5 e R8, preservados e não repetidos**:
  - o incidente de R5 (até 5 inícios do Codex real do WSL numa sonda extra; 12 arquivos de perfil com mtime na janela, sem linha de base de conteúdo) continua registrado em `ffc5937`;
  - os dois inícios de D na R8 continuam como registrados;
  - não editei `verifier-round1/` a `verifier-round8/`.

## Falhas, limitações e o que não está provado

- **T8-C15 em D**: causa desconhecida (seção “Gate D”). O teste não é da feature, mas exercita o store e a entrega que a feature alterou. Não sei se é intermitência de carga, defeito do produto ou do teste.
- **Causas desconhecidas e não eliminadas**: a perda do primeiro registro do C28 (R7, B); a falha de C32 na CI 40443538957; o C34 do WSL em `abae80a` (não há causa única demonstrada). Uma passada verde por ambiente não mede taxa.
- **Evidência do autor, não repetida por mim**: o RED/GREEN do C1 em clones `true`/`false` (`build.md:895-900`); a matriz 3+3 do C32 (`build.md:904-910`); a mutação por `createdAt` do C34 (`build.md:975-981`); o RED do C28 (`build.md:838`).
- **C1, controle com clone novo `core.autocrlf=false`**: não foi executado por mim (seção C1).
- **Continuam das rodadas anteriores**:
  - a variante “lock ausente” de C43 sem teste nomeado;
  - as janelas do plugin em C44;
  - o ramo com várias capturas `active` na falha do encerramento, sem prova;
  - recusa e EOF num console real do Windows, provados só em processo ou por pty;
  - nativos do Hermes pulados na CI;
  - C23 sem asserção de tempo;
  - a variante link do C17 não executada no Windows desta máquina (executada em C);
  - macOS e o runner da CI não executados;
  - o uso real sem sessão de agente (`Unresolved` 2, `blocks go-live`).
- **Precisão do Landing** (nota, não bloqueia): `checklist:63` diz “`.gitattributes` com uma linha só”. O arquivo tem uma regra e 4 linhas de comentário com o porquê, sem efeito sobre atributos.

## Findings (em ordem)

1. **Bloqueante — gate D vermelho**: `npm test` saiu com 1 em `dd89179` por `T8-C15` (`concurrency.cli.test.mjs:107`). O produtor `b` recebeu `{code: "io_failure", committed: 20, persisted: 20, lost: 20}` no lugar de `{code: null, committed: 40, persisted: 40, lost: 0}`. A causa não é conhecida e não repeti. A decisão (diagnóstico, nova rodada ou tratamento como intermitência) é do orquestrador e do proprietário; não cabe a este Verifier.
2. **Os 45 checks estão provados**: A, B e C com 102/96/0/6, e os 97 I25 em D. B rodou num clone novo com `core.autocrlf=true`, com `cli.mjs` em LF e `git status` vazio antes e depois.
3. **C1, C28, C32 e C34 corrigidos na prova** e verdes nos quatro ambientes, sem afirmar causas desconhecidas. Rigor do C34: precondições explícitas antes da escolha, a regressão do recuo e o relógio isolado em `deps.now`; a regra do produto está intacta.
4. Notas não bloqueantes: o `release()` ausente na regressão e no `--latest`; as invocações em processo sem o supervisor de 60 s; o controle C1 com clone `false` não executado por mim; a redação “uma linha só” do Landing.
5. Pendências fora deste Verifier: a revisão formal 6 (orquestrador); a CI real do GitHub depois do push; o uso real (`Unresolved` 2).

## Gate

| Gate | Resultado |
| --- | --- |
| A — alvo completo, Windows, Node 24.22.1, concorrência 4 | 102: 96 pass, 0 fail, 6 skip — exit 0 |
| B — alvo completo, Windows, Node 24.13.0 oficial, npm 11.6.2, clone novo com `core.autocrlf=true`, concorrência 4 | 102: 96 pass, 0 fail, 6 skip — exit 0; `cli.mjs` LF e status vazio antes e depois |
| C — alvo completo, WSL Ubuntu, uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, PATH sem `/usr/bin`, cópia exata | 102: 96 pass, 0 fail, 6 skip — exit 0 |
| D — `npm test`, Windows, Node 24.22.1, runner padrão (8), Hermes real pelos testes, uma execução | **exit 1** — governança 6/6; motor 16/16; doctor 417 (410/0/7); integrações 555 (541 pass, **1 fail: T8-C15**, 13 skip); total 994: 973 pass, 1 fail, 20 skip; os 12 nativos e os 97 I25 aprovados |

## Limpeza

- **`%TEMP%`**: gravei a linha de base antes de A (`temp-baseline.json`, 60.199 nomes, 0 `skill-me i4 i25 *`). Depois de D, `cleanup-temp.mjs` (Node 24.22.1) removeu só diretórios que atendiam a todas estas condições: fora da linha de base; prefixo `skill-me i4 `, `skill-me i5 `, `code-review-test-` ou `codex-code-review-`; não link; filho direto do `%TEMP%`; mtime na janela 05:40:14Z–06:00:00Z. Antes rodei uma simulação. Foram **466 removidos e 0 recusas** (`cleanup-temp.json`), com mtime entre 02:43:44 e 02:58:11 (-03):
  - 337 `skill-me i4 i25 *` de B: o `rmSync` do Node 24.13.0 não apaga caminhos com “ação” no Windows;
  - 128 `skill-me i4 *` e 1 `skill-me i5 *`, de testes de outras issues em D.
  - Restaram 0 `skill-me i4 i25 *`. As 8 entradas novas fora do filtro ficaram; não são minhas.
- **Nove nomes da linha de base sumiram durante a rodada.** O meu script só age sobre nomes fora da linha de base, e a autoria é desconhecida.
- **Clone de B**: removido depois de conferir o caminho absoluto dentro de `verifier-round9/`, o tipo (diretório, não link) e o `HEAD` do clone (`B-clone-cleanup.txt`).
- **WSL**: `wsl-cleanup.sh` removeu o scratch `/tmp/skillme-verifier-r9.FODlro` depois de conferir o padrão absoluto e o tipo. Restaram 0, sem `skill-me i4 i25 *` em `/tmp` (`C-wsl-cleanup.txt`).
- **Mantidos na pasta ignorada `verifier-round9/`**: os logs de A–D, `matrix.txt`, o tar do HEAD, a linha de base do `%TEMP%`, os relatórios de limpeza e os meus scripts. Os arquivos de auditoria do orquestrador ficaram como estavam, sem leitura nem alteração.
- **Estado final**: configuração, estado de review e prefixo npm real não foram tocados. O HEAD continua `dd89179`. O `git status` estava vazio antes de eu gravar este arquivo; depois, só ele aparece modificado.
