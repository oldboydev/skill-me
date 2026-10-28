# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25

**Verdict**: **PASS**. Os 48 checks (C1–C48, 8 ACs) têm prova verde em todos os ambientes aplicáveis (C48 por prova estrutural autorizada). Os quatro gates passaram, cada um numa única execução no HEAD:
- **A**: 128 testes, 122 pass, 0 fail, 6 skip.
- **B**: 128 testes, 122 pass, 0 fail, 6 skip.
- **C**: 128 testes, 122 pass, 0 fail, 6 skip.
- **D** (`npm test` completo): 1.006 testes, 986 pass, 0 fail, 20 skip, exit 0, com os 12 nativos do Hermes.

O AC8 está coberto: o I23-C10 manteve etapas, contagens e asserções e ganhou a evidência sanitizada (C47); o `timeout-minutes` do job `verify` é a única mudança do workflow (C48). A causa dos `delivery_timeout` da CI 40514323240 **continua desconhecida**: a instrumentação não a corrige, e os 20 minutos não garantem CI verde.
**Checks**: **48/48**. C1–C47 têm testes nomeados executados, e nenhum ficou sem teste. C48 é provado pela prova estrutural autorizada e pelo `governance-C1 C3` existente, que rodou em D; a expressão do GitHub não foi avaliada aqui. Os seis skips de cada alvo A/B/C são de plataforma, e cada um tem a execução correspondente no outro ambiente da matriz (A/B ↔ C). Os 20 skips de D são declarações de plataforma dos próprios testes; os casos globais antigos POSIX/FIFO/macOS não foram reexecutados em outro ambiente nesta rodada.
**Profile**: light. Não fiz fault injection, `Coverage` nem `Test policy` próprios, e não há fonte vinculante de UI. Rodei só os controles versionados e, para C48, a prova estrutural autorizada pelo checklist. As mutações e os RED citados são do autor e não foram repetidos.
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..0f540a026efa3543a5ab7b81465b6922530f35bc`, a feature inteira: 81 commits, árvore `636b219a…`. Desde a R11 (`2856380`, relatório em `d0d5a7f`) mudaram:
- **provas e apoios**:
  - `tests/integrations/observe/agents.e2e.test.mjs` (+208/−13): rotina em etapas do I23-C10 e as duas provas I25-C47;
  - `tests/integrations/helpers/traces.mjs` (+48): apoio comum;
  - `tests/integrations/traces/concurrency.cli.test.mjs` (+12/−34): passa a consumir o apoio;
  - `tests/integrations/helpers/launch.mjs` (+3/−4): importa `failureCode`;
  - `tests/integrations/helpers/traces-probe.mjs` (+3): nomeia `observe.json`;
- **workflow**: `.github/workflows/governance.yml`, uma linha;
- **configuração**: `code-review.config.json`, override da #25 de 6 para 7;
- **documentos**: task, checklist, build, handoff e proposta da CI 40514323240, e este relatório.

`src/`, `scripts/`, `tests/integrations/launch/`, fixtures, `hermes-harness.unit`, `hermes-plugin.native`, `package.json` e `.gitattributes` têm 0 linhas de diff em `2856380..HEAD`. O produto não muda desde `f734441`.
**Round**: **12** (light), pela autorização humana “Pode fazer quantas precisar”, registrada para esta rodada em [issuecomment-6460630184](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6460630184), com o escopo novo aprovado em [issuecomment-6460177952](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6460177952). As onze verificações e as seis revisões anteriores ficam preservadas, inclusive o PASS da R11 (`d0d5a7f`). A revisão formal 7 é do orquestrador, depois deste relatório. Não alterei limite, estado nem histórico.
**Verifier**: subagente novo e independente (Claude Opus 5.5). Não sou o autor nem um Verifier anterior, e não herdei sessão. Produto, testes, checklist, task, configuração e workflow ficaram só para leitura. Escrevi apenas este arquivo e logs/scripts em `.checks/code-review/issue-25/verifier-round12/v12/` (ignorada).

Data: 28/10/2026, 01:28–01:55 (-03). HEAD `0f540a0` do início ao fim. `git status --porcelain=v1 -uall` vazio antes de A (`v12/git-status-before.txt`), antes e depois de A e de D, e no fim, antes de gravar este arquivo.

## Fontes lidas nesta rodada

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `tlc-implement/references/verify.md` | inteiros; perfil `light` |
| `.tasks/issue-25-agent-launch.md` | inteiro (597 linhas): critérios 1–40; “CI 40514323240 no Windows” e “Diagnóstico do I23-C10 e orçamento do job Windows (AC8)” (`:364-393`); Sources com 6460177952 (`:527`) |
| `.checks/issue-25-agent-launch.md` | inteiro (691 linhas): Landing, inclusive “Diagnóstico do I23-C10” (`:77`) e “Orçamento do job Windows” (`:78`); C1–C48; S11 com C47–C48 (`:394-426`); Swept e Handoff |
| `.checks/issue-25-agent-launch.build.md` | inteiro (1.393 linhas). É **relato do autor, não prova minha**. Inclui “CI 40514323240” (`:1271-1312`) e “Diagnóstico do I23-C10 e orçamento do job Windows” (`:1314-1393`) |
| `.checks/issue-25-agent-launch.ci40514323240-handoff.md` e `…-proposal.md` | inteiros (134 e 30 linhas) |
| `.checks/code-review/issue-25/context-ci28-verifier12-approved.json` | inteiro: **21 comentários**, **8 ACs**. O 20º aprova o AC8 (6460177952) e o 21º registra a 12ª verificação e a 7ª formal (6460630184) |
| `.checks/issue-25-agent-launch.verified.md` da R11 | inteiro, antes de substituí-lo |
| Diffs | inteiros: `2856380..HEAD` dos 7 arquivos de código/configuração acima; `d0d5a7f..HEAD` e `63621c6..HEAD` de `.github/`; `63621c6..HEAD` de `code-review.config.json` |
| `builder-ci40514323240-approved/workflow-values.mjs` | lido antes de executá-lo (C48) |
| Auditoria externa do orquestrador | **não lida**. Em `verifier-round12/` só listei os nomes `profile-before.json` e `profile-metadata-snapshot.py`. Não havia `profile-comparison-final.json` quando listei. Não li perfil pessoal |

## AC8 — C47: diagnóstico do I23-C10 (verified at `0f540a0`)

Abreviações: `ag` = `tests/integrations/observe/agents.e2e.test.mjs`; `tr` = `tests/integrations/helpers/traces.mjs`.

**O I23-C10 continua o mesmo teste.**
- **Etapas**: as rodadas 0–1 rodam um hook de cada vez (`ag:321-323`, `runStep([s.step(round)])`). As rodadas 2–3 rodam os três hooks juntos (`ag:324-326`, `Promise.all` em `runStep`, `ag:222-229`). O Hermes é um processo com duas sessões e 20 linhas (`ag:328-329`).
- **Asserções**: `DELIVERED_AUTO(1)` por hook e `DELIVERED_AUTO(20)` no Hermes, pela mesma `assert.deepEqual(run.report?.delivery, expected, …)` (`ag:310`). `DELIVERED_AUTO` não muda (`helpers/observe.mjs:23`).
- **Cauda**: de `const captures = automaticOf(root)` até o fim do teste (`ag:331-377`), as asserções são **byte a byte iguais** às de `d0d5a7f:205-251`. Isso cobre cinco capturas, cinco chaves, um agente e uma sessão por captura, os eventos de cada sessão e o relatório de uma sessão sem a outra (`diff` vazio, conferido).
- **Precisão vs. a forma antiga**: a única diferença semântica é o `?.`, sem relatório.
- **Evidência só na falha**: `ag:308-309` calcula `healthy` e só então a evidência. A execução saudável não ganha chamadas de CLI.
- **Pré-carga existente**: cada processo ganha `timedEnv(<arquivo próprio>)` (`tr:111`; `ag:222-229`).

**Controles (mesma rotina, raiz observada nova, injeção só em `"codex A 0"`, `ag:383-398`).**
- **Onde a injeção entra**: o rótulo `codex A 0` vem de `codexA.step(0)` (`ag:387`).
- **Injeções existentes**:
  - `STALL_SEGMENT` está na pré-carga desde a base (`63621c6:traces-probe.mjs:54`).
  - `SEGMENT_EIO` existe desde `8eafa11`.
  - `52b22cd` só acrescentou os nomes `observe.json`/`observe.json.tmp` em `FILE_KINDS` (`traces-probe.mjs:115-117`).

| Exigência (C47) | Evidência e valor literal |
| --- | --- |
| A asserção original continua vermelha | `ag:401` `failure instanceof assert.AssertionError`; `ag:402` `[failure.actual, failure.expected]` = `[relatório, DELIVERED_AUTO(1)]`; `ag:403` a mensagem começa por `` `codex A 0\n${describeStep(evidence)}` `` |
| (a) `SEGMENT_EIO=1` | `ag:422` relatório exato `{automatic: true, code: "io_failure", entries: 1, committed: 0, persisted: 0, lost: 1, unrouted: 0}`; `ag:424` `[["rename segmento.tmp EIO (sob o lock, 2ª tomada)"], 0, 1]` (uma falha, 0 `EEXIST`, 1 ausência conferida): a injeção aconteceu, sem nova tentativa; `ag:426` raiz `{captures: {rows: ["active accepted 0 persisted 0"]}, files: {segments: 0, temporaries: 0}, lock: {present: false}}`; `ag:427-429` os três trechos literais na mensagem |
| (b) `STALL_SEGMENT=1` | `ag:437` `{…code: "delivery_timeout", entries: 1, committed: 0, persisted: 0, lost: 1, unrouted: 0}` (o sintoma da CI); `ag:439` `[[], "close key (sob o lock, 2ª tomada)"]` (nenhuma falha; última operação concluída); `ag:441` `{captures: {unavailable: "lock_present"}, files: {segments: 0, temporaries: 0}, lock: {present: true}}` (nada inventado); `ag:442-443` literais |
| Não vazamento | `ag:406-416` `assertNoLeak`: a mensagem não contém raiz, home, IDs das capturas, chave (hex/base64/base64url), `SESSION_A`, `chamada-x-0`, `env.PATH` nem `process.env.PATH` (`ag:412`), e `leaks(text)` = `[]` (`ag:415`). Usado em `ag:430` e `ag:444` |
| Lugar, não “antes/depois do commit” | `ag:234` `placeOf`: `sob o lock, <k>ª tomada` / `tomada do lock` / `fora do lock`. Com dois `rename` de `state.json.tmp` na mesma tomada, a fase do T8 seria falsa (Landing `:77`) |
| `EEXIST` = disputa; `lstat ENOENT` = ausência conferida | `ag:235-236`; fora das falhas em `ag:245`; contados à parte (`describeStep`, `ag:292`) |
| Última operação concluída | `ag:246` `trace.at(-1)`: uma operação que nunca termina não entra na linha da pré-carga |
| Indisponível com código, nunca zero inventado | `privacy list` por `privacyBody` (`tr:164-167`) devolve o código fechado do CLI (`lock_present`). `inspected` (`tr:154-160`) devolve `{unavailable: failureCode(error)}`. `ag:271` só dá 0 segmento quando a pasta `captures` está ausente (`ENOENT`, ausência conferida). Outro erro de listagem lança e vira `indisponível [<código>]` |

**Resultados.** As duas provas C47 passaram em A/B/C/D: 3,6 / 3,1 / 0,4 / 4,8 s (E/S) e 4,1 / 3,7 / 1,0 / 4,5 s (disco parado). O I23-C10 passou em 16,1 / 13,1 / 1,7 / 16,7 s.

**Lidos sem teste nomeado** (o checklist não os reivindica):
- relatório ausente: `ag:284`, `delivery: null` → `sem relatório`; a asserção de `ag:310` fica vermelha com `actual` `undefined`;
- linha da pré-carga ausente: `ag:243`;
- listagem da raiz com erro diferente de `ENOENT`: `ag:272`.

A “mensagem de antes” (só `codex A 0`) do critério 39 é o RED do autor (`build.md:1345-1349`), que não repeti.

## Apoio comum `helpers/traces.mjs` (verified at `0f540a0`)

| Ponto | Evidência |
| --- | --- |
| Dois consumidores reais | `concurrency.cli.test.mjs:17-40` importa `diskTrace` (`:25`), `inspected` (`:28`), `privacyBody` (`:29`) e `shown` (`:33`); `agents.e2e:13-33` importa esses e `describeTiming`, `deliveryTiming`, `timedEnv` e `timingLines`. `helpers/launch.mjs:15` importa `failureCode` no lugar da cópia local, removida (`launch.mjs:170-171`) |
| Sem cópia silenciosa | `rg '\^E\[A-Z\]\+\$' tests/`: só `tr:151` e `traces-probe.mjs:134`. Esta é a extração própria da pré-carga, já existente na base (`63621c6:traces-probe.mjs:103`), com outro contrato (`"erro"` sem nome) |
| `diskTrace` (`tr:177-190`) | `held` do `writeFile` do `.lock` bem-sucedido até o `unlink` dele, inclusive (`tr:184-187`); `hold` numera as tomadas; `commits` conta os `rename` de `state.json.tmp` concluídos naquela tomada. É a mesma máquina de estados do `failuresWithPhase` antigo (`held`/`committed`), lida lado a lado |
| T8-C15/C46 com a mesma saída | `concurrency:133-142`: `commits > 0` ⇒ `depois do commit`. De `inspectCapture` ao fim do arquivo, a única diferença para `2856380` é a remoção do `shown` local (`diff` conferido; deslocamento −20/−22 linhas). As testemunhas literais `rename segmento.tmp EIO (antes do commit)` (`:298`, `:311`) e `unlink lock EIO (depois do commit)` (`:325`, `:337`, `:350`) passaram em A/B/C/D |

## AC8 — C48: orçamento do job Windows (prova estrutural, verified at `0f540a0`)

C48 é uma prova **estrutural** autorizada pelo checklist (`checklist:424-425`), não um teste espelho.
- **Diff**: `git diff d0d5a7f HEAD -- .github/` tem uma linha: `governance.yml:43` `timeout-minutes: 10` → `${{ matrix.os == 'windows-latest' && 20 || 10 }}`. Na feature inteira (`63621c6..HEAD`) é a mesma linha, e só `52b22cd` toca `.github/`. O workflow de `d0d5a7f` é idêntico ao da base (`cmp`).
- **Leitura do YAML no HEAD** (`governance.yml`, lido inteiro):
  - `changes` `:21` 5;
  - `verify` `:43` a expressão, matriz `:41` `[ubuntu-22.04, windows-latest, macos-14]`, `runs-on` `:42` `${{ matrix.os }}`, passos `:52-56` iguais;
  - `ci` `:63` 5;
  - `concurrency` `:13-15` igual.
- **Script do autor** (`builder-ci40514323240-approved/workflow-values.mjs`, lido antes): rodei-o contra o workflow de `d0d5a7f` e contra o da base, ambos extraídos por mim com `git show` (`v12/C48-workflow-values.txt`). Resultado: `changes` 5, `ci` 5, `verify` com a expressão aprovada, e “resto do workflow igual ao anterior (fora o timeout-minutes do verify): true” nas duas comparações. O script compara o YAML inteiro parseado, sem o campo.
  - **Limite**: as linhas “verify em <os>: 20/10 min” são o ternário do próprio script. Não avaliam a expressão do GitHub. Quem valida a expressão é a CI real do novo HEAD, do orquestrador, e ela não é prova minha.
- **Prova existente**: `governance-C1 C3 workflow sempre publica CI sem IA nem release` passou em D (`D-npm-test.txt`, 6/6 da governança). Asserções em `scripts/governance-ci.test.mjs`:
  - `:263-267` matriz;
  - `:268` `runs-on`;
  - `:269-278` os cinco `run` do `verify`;
  - `:261-262` `needs`/`if`.

## Carregado de rodadas anteriores (arquivos sem diff ou sem mudança de asserção)

- **C32 — diagnóstico com captura em construção.** Carried from R11 at `2856380`, citações atualizadas. O apoio continua o mesmo, com deslocamento de −1 linha depois de `launch.mjs:170`:
  - `orUnavailable` `:172-178`;
  - `capturesForDiagnosis` `:184-202`;
  - `withOverlappingRuns` `:214-257`, com o erro original preservado em `:255` (``new Error(`${error.message}\n…`, { cause: error })``);
  - `launchCapturesOnDisk` estrito `:270-277`.

  As asserções `end:370-386` não mudaram (0 diff em `launch/`). Os 9 C32 passaram em A/B/C/D.
- **Primeira criação concorrente do store.** Carried from R11 at `2856380`: `src/` tem 0 diff desde `f734441`. As citações `store.mjs:42`, `:140`, `:162-171`, `:366-380` e `observe/command.mjs:94-100` continuam válidas.
- **C46.** Verified at `0f540a0`, citações atualizadas:
  - saudável `conc:214-215`, `:226-229`, `:237`, `:241`, `:250-252`;
  - (a) `conc:289-313`;
  - (b) `conc:316-339`;
  - (c) `conc:342-362`;
  - base comum `:276-280` (`actual`/`expected` e prefixo da mensagem) e `:282-287` (não vazamento).

  Os literais são os mesmos da R11.

## Ambientes e execuções — verified at `0f540a0`

Execuções **em sequência**, uma invocação por ambiente, sem nenhuma repetição. O alvo de A, B e C é `node --test --test-concurrency=4 --test-reporter=spec … --test-reporter=tap … tests/integrations/launch/*.test.mjs tests/integrations/hermes-harness.unit.test.mjs tests/integrations/traces/concurrency.cli.test.mjs tests/integrations/observe/agents.e2e.test.mjs`. São **11 arquivos**, com os de concorrência e de `observe/agents.e2e` completos (`v12/run-win-target.sh`, `wsl-run.sh`).

| # | Ambiente | Resultado |
| --- | --- | --- |
| A | Windows 11, checkout principal, Node v24.22.1 (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10, `npm_execpath` ausente; `npmCli()` = `C:\nvm4w\nodejs\node_modules\npm\bin\npm-cli.js`. 01:32:01–01:35:02 | **128: 122 pass, 0 fail, 6 skip**, exit 0. Status vazio antes e depois |
| B | Windows 11, Node **v24.13.0 oficial** (`ci-node-24.13.0/node-v24.13.0-win-x64/node.exe`, `execPath` dele) no início do PATH, npm **11.6.2** adjacente (`npmCli()` = o do zip), `npm_execpath` ausente. **Clone git novo**: `git clone --no-hardlinks --config core.autocrlf=true <checkout> v12/B-clone`, com a configuração só em `.git/config` do clone; a do sistema não foi tocada. `node_modules` copiado, sem rede. 01:35:17–01:38:00 | **128: 122 pass, 0 fail, 6 skip**, exit 0 |
| C | WSL `Ubuntu`, `oldboydev` uid 1000, `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc`, só com os meus scripts (0 CR). Detalhes abaixo. 01:38:28–01:39:36 | **128: 122 pass, 0 fail, 6 skip**, exit 0. Árvore `636b219a…` igual antes e depois; `cli.mjs` 755 e 0 CR depois. `/home/oldboydev/.skill-me` e `.skill-me-authorization.json` ausentes antes e depois (só `test -e`); home do scratch vazio; 0 `skill-me i4 i25|t8|i23 *` em `/tmp` antes e depois |
| D | `npm test` completo, Windows, checkout principal, Node v24.22.1, npm 11.19.1, `npm_execpath` ausente, 32 núcleos, runner `MAX_PARALLEL_FILES = 8` (`scripts/test-integrations.mjs:14`). Rodou **uma vez**, em segundo plano, com orçamento de **2 h configurado na ferramenta antes do início**, sem abortar nem repetir. 01:40:30–01:51:46 | **exit 0** (`EXIT=0`, `D_rc=0`, notificação da ferramenta com exit 0). governança 6/6/0/0; motor de revisão 16/16/0/0; doctor 417 (410 pass, 0 fail, 7 skip POSIX/FIFO); integrações 567 (554 pass, **0 fail**, 13 skip). **Total 1.006: 986 pass, 0 fail, 20 skip.** `✖` = 0 no log. Status vazio antes e depois |

**B: conversão de fim de linha e estado do checkout.**
- **Antes**: HEAD do clone `0f540a0…`, igual ao esperado; árvore `636b219a…`; `core.autocrlf` local `true` (`.git/config`) e efetivo `true`.
- **Conversão ativa**: `package.json` `i/lf w/crlf` com 34 CRLF, e `.gitattributes` `w/crlf`. `cli.mjs` `i/lf w/lf attr/text eol=lf`: 4.257 bytes, 0 CR, 125 LF, primeira linha `b'#!/usr/bin/env node\n'`, modo `100755`.
- Status vazio antes e depois de copiar `node_modules`.
- **Depois de B** (o C1 fez o `npm link` com o npm 11.6.2 do zip): `cli.mjs` com os mesmos 4.257 bytes, 0 CR e a mesma primeira linha; **status vazio** (`B-clone-after.txt`).
- O clone foi removido depois de conferir caminho absoluto, tipo (diretório, não link) e HEAD (`B-clone-cleanup.txt`).

**C: cópia exata e ambiente isolado.**
- **Cópia**: `git -c core.autocrlf=false archive HEAD`, tar de **5.713.920 bytes**, sha256 `86a19a8b…a85b4e7`, `get-tar-commit-id` = `0f540a0…`. Árvore extraída `636b219a…` = `HEAD^{tree}`, igual depois de copiar `node_modules`. `cli.mjs` 755 (git `100755`), primeira linha `#!/usr/bin/env node`, 0 CR. `node_modules` copiado sem rede (yaml 2.9.0, smol-toml 1.9.1).
- **Prefixo sem `sh`**: `prefix/bin` = `node npm npx`. O `node` é cópia byte a byte de `/usr/bin/nsolid` (sha256 `150946e4…bb6351`), v24.13.0, com `execPath` no prefixo. O npm 11.6.2 fica em `prefix/lib/node_modules/npm`, e `npmCli()` aponta para ele. `/usr/bin/node` não foi usado como atalho.
- **Execução**: `env -i`, `HOME=<scratch>/home`, `LANG=C.UTF-8`, `PATH=<scratch>/prefix/bin:<scratch>/tools`, **sem `/usr/bin`**. `tools` tem só links para `/usr/bin/{sh (dash), git, python3 (3.12.3), id, grep, mkfifo}`, sem agentes, `node`, `npm`, `npx` ou `corepack`.
- A primeira tentativa de chamar o preparo não chegou ao WSL: o Git Bash converteu `/mnt/c/…` num caminho do Windows, e o bash saiu com 127 (“No such file”). Nada rodou nem foi criado. Repeti a **chamada** com `MSYS_NO_PATHCONV=1`. Não é repetição de prova.

**Skips** (todos de plataforma, com o motivo impresso pelo teste):
- **A e B (6)**: C45 POSIX, C5 POSIX, C6, C42 POSIX, C33 arranjo e C15 pty.
- **C (6)**: C4 shim, C45 controle do Windows, C5 console, C42 console, C8 LOCALAPPDATA e C38 console.
- **D (20)**:
  - doctor (7): `agent-resolution-formal5-2`, `agent-resolution-C2`, 2 `fifo-config-formal8-4` e 3 `fs-adapter-formal8-4`, todos POSIX/FIFO;
  - integrações (13): `I4-C15`, `I4-C25b`, `I4-C25j`, `I4-C25k`, `I4-C25l`, `I4-C25m`, `T8-C4` e os 6 I25 POSIX de A.

Cada um dos seis skips de A/B/C tem a execução correspondente no outro ambiente da matriz: os de A/B rodaram em C, e os de C rodaram em A/B. Os 20 skips de D ficam como declaração de plataforma: os 6 I25 POSIX rodaram em C; os 7 do doctor (POSIX/FIFO) e `I4-C15`, `I4-C25b`, `I4-C25j`, `I4-C25k`, `I4-C25l`, `I4-C25m` (macOS) e `T8-C4` não foram reexecutados em outro ambiente nesta rodada (ver Limitações: macOS e o runner da CI não executados). O arquivo `observe/agents.e2e` não tem skip.

**Nomes conferidos.**
- **A, B e C**: os 128 nomes são idênticos nos três TAP (`v12/matrix.txt`: “nomes iguais em todos: sim (união 128)”). São os 122 da R11 mais os 6 de `observe/agents.e2e`: I23-C6, C7, C10 e C14, e os 2 I25-C47.
- **D** (`v12/D-summary.txt`):
  - **I23-C10** ✔ (16,7 s);
  - **I25-C47** ✔ ×2;
  - **T8-C15** ✔ (14,2 s);
  - **I25-C46** ✔ ×3;
  - **I25-C32** ✔ ×9;
  - **`governance-C1 C3`** ✔;
  - **12 nativos do Hermes** ✔, pelo runtime real, só pelo teste versionado: `I4-C18`, `C19`, `C20`, `C21`, `C22`, `C23`, `I4-C37`, `I25-C40` nativo, `I23-C8` ×3 e `I4-C44b`;
  - `I25-C*` de 1º nível: 109 ✔ e 6 ﹣, que são os 114 do alvo mais o C40 nativo.

**Durações-chave**, em segundos (A / B / C / D):
- I23-C10: 16,1 / 13,1 / 1,7 / 16,7.
- C47 (E/S): 3,6 / 3,1 / 0,4 / 4,8.
- C47 (disco parado): 4,1 / 3,7 / 1,0 / 4,5.
- T8-C15: 14,9 / 12,1 / 1,9 / 14,2.
- C46: (a) 3,9 / 3,4 / 0,4 / 4,0; (b) 4,2 / 3,4 / 0,4 / 3,8; (c) 4,2 / 3,5 / 0,9 / 4,1.
- C32 de processos reais: 10,7 / 8,8 / 2,4 / 10,2.
- C28 regressão: 29,0 / 28,5 / 26,2 / 28,9.
- C1: 2,8 / 2,0 / 0,5 / 2,9.

## Matriz por check (TAP de A, B e C; `v12/per-check.txt`)

Contagem dos testes executados por prefixo, em pass/skip/fail. **Nenhum check teve 0 testes, e não houve fail.**

| Check | A Win 24.22.1 | B Win 24.13.0 (clone `autocrlf=true`) | C WSL isolado 24.13.0 |
| --- | --- | --- | --- |
| C1–C3, C7, C9–C11, C13, C14, C18–C26, C29, C30, C35, C36 | 1p cada | 1p cada | 1p cada |
| C4 | 3p | 3p | 2p/1s |
| C5 | 1p/1s | 1p/1s | 1p/1s |
| C6 | 1s | 1s | 1p |
| C8 | 2p | 2p | 1p/1s |
| C12, C16, C28, C31, C40 | 2p cada | 2p cada | 2p cada |
| C15 | 1s | 1s | 1p |
| C17 | 4p | 4p | 4p |
| C27, C37, C39, C44 | 3p cada | 3p cada | 3p cada |
| C32 | 9p | 9p | 9p |
| C33 | 1p/1s | 1p/1s | 2p |
| C34 | 4p | 4p | 4p |
| C38 | 1p | 1p | 1s |
| C41 | 17p | 17p | 17p |
| C42 | 3p/1s | 3p/1s | 3p/1s |
| C43 | 12p | 12p | 12p |
| C45 | 2p/1s | 2p/1s | 2p/1s |
| C46 | 3p | 3p | 3p |
| **C47** | **2p** | **2p** | **2p** |
| T8-C15 / T8-C16 | 1p / 9p | 1p / 9p | 1p / 9p |
| **I23-C10** / I23 do arquivo | **1p** / 4p | **1p** / 4p | **1p** / 4p |

C48 não tem teste por check: é prova estrutural mais `governance-C1 C3`, que rodou em D.

## Carried / reverified

| Item | Situação |
| --- | --- |
| Execução de todas as provas C1–C47 | **verified at `0f540a0`**, em A, B, C e D |
| C48 | **verified at `0f540a0`**: diff, YAML, script estrutural e `governance-C1 C3` em D |
| `launch/*.test.mjs`, `hermes-harness.unit`, `hermes-plugin.native`, fixtures, `helpers/observe.mjs`, `helpers/cli.mjs`, todo `src/`, `scripts/`, `package.json`, `.gitattributes` | **0 linhas de diff em `2856380..HEAD`** (`git diff --quiet` conferido). O julgamento das asserções de C1–C45 é **carried from R11 at `2856380`**, que o trazia de R10…R4. Amostra relida no HEAD, toda conforme: `cmd:48, 49, 65, 77, 105, 342`; `prep:93, 189`; `sess:67, 230`; `rep:159`; `agent:132`; `docs:82`; `harn:88`; `nat:335`; `store:715`; `end:120, 194, 280, 320, 370, 382, 438` |
| `helpers/launch.mjs` | **verified**: só o import de `failureCode` (`:15`) e o comentário (`:170-171`). Deslocamento −1 depois de `:170`. `npmScriptEnv` `:67` e `runSkillMe` `:121` (SIGKILL em 60 s, `:132`) não mudaram |
| `concurrency.cli.test.mjs` | **verified**, citações atualizadas (seção “Carregado”) |
| `agents.e2e`, `helpers/traces.mjs`, `traces-probe.mjs` | **verified** (seções C47 e apoio comum) |
| Core, workflows e configuração | `scripts/`: 0 diff na feature (core vendorizado e runner intactos). `.github/`: só a linha do C48. `code-review.config.json`: perfis globais `light`/`ui`/`direct` com `maxRounds` 2; `roundOverrides["25"]` = `{light, 7}` com a aprovação 6460630184/6460177952; demais overrides intactos (3:9, 4:10, 5:10, 6:3, 7:35, 8:3, 23:4). A feature só acrescenta o bloco `25` |

## Checks

Abreviações:
- testes de `tests/integrations/launch/`: `cmd` = `command.cli.test.mjs`, `prep` = `prepare.cli`, `sess` = `session.e2e`, `store` = `store.unit`, `end` = `end.e2e`, `rep` = `report.cli`, `agent` = `agent.unit`, `docs` = `docs.test`;
- outros testes: `harn` = `tests/integrations/hermes-harness.unit.test.mjs`, `nat` = `hermes-plugin.native.test.mjs`, `conc` = `traces/concurrency.cli.test.mjs`, `ag` = `observe/agents.e2e.test.mjs`, `gov` = `scripts/governance-ci.test.mjs`;
- apoios: `hl` = `helpers/launch.mjs`, `tr` = `helpers/traces.mjs`.

“A/B/C/D” quer dizer que passou nesses ambientes. D roda todos os arquivos, inclusive os de A–C.

| Check | Nome no TAP (prefixo, contagem) | Evidência (arquivo:linha — valor) | Revisão | Result |
| --- | --- | --- | --- | --- |
| C1 | `I25-C1 npm link num prefixo temporário…` (1) A/B/C/D | `cmd:48` `private === true`; `cmd:49` `bin` = `{"skill-me": "src/integrations/launch/cli.mjs"}`; `cmd:65` `[0, SKILL_ME_HELP, ""]` de outro cwd; `cmd:77` `git status` igual (“npm link não altera o checkout”). B num clone novo `autocrlf=true`: `cli.mjs` LF, 0 CR e status vazio antes e depois | carried + medida B | PASS |
| C2 | `I25-C2 argumentos literais…` A/B/C/D | `cmd:96-98` `{status: 0, stdout, stderrFirst, argv: LITERAL_ARGS, stdin}` para os 3 agentes; `LITERAL_ARGS` em `cmd:80` | carried | PASS |
| C3 | `I25-C3 código do agente…` A/B/C/D | `cmd:105` `{0: 0, 7: 7}` | carried | PASS |
| C4 | `I25-C4 shim…` + `entrada do shim…` ×2: A/B 3, C 2 | `cmd:117-120` `{status: 0, execPath: process.execPath, script: …/@openai/codex/bin/codex.js, sentinel: false}`; `cmd:130-133` `{status: 127, [launcher_requires_shell], sentinel: false}`; `agent:80-118` | carried | PASS |
| C5 | `I25-C5 Ctrl+C no console…` (A/B/D), `sinais do terminal no POSIX` (C) | `cmd:228` `{status: 4, signal: null, signals: ["SIGINT","SIGQUIT","SIGHUP"]}`; `cmd:244-245` `CTRL_C_EVENT` → `["SIGINT"]` | carried | PASS |
| C6 | `I25-C6 SIGTERM só ao launcher…` (C) | `cmd:267` `{status: 0, signal: null, signals: ["SIGTERM"]}` | carried | PASS |
| C7 | `I25-C7 agente ausente…` A/B/C/D | `prep:93-94` `{status: 127, stdout: "", code: true, asked: false}`; `prep:98` árvore igual | carried | PASS |
| C8 | `I25-C8 prévia…` ×2 (A/B/D 2, C 1) | `prep:122-126` texto exato até cada pergunta, árvores iguais; `prep:141-144` LOCALAPPDATA | carried | PASS |
| C9 | `I25-C9 confirmação aplica…` A/B/C/D | `prep:163-168` `observe.json` da #23; `prep:169` `plan.changes` `[]`; `prep:174` `manualSteps` | carried | PASS |
| C10 | `I25-C10 recusa…` A/B/C/D | `prep:189-191` `{exitCode: 3, code: true, trees: before, started: false, root: false}` | carried | PASS |
| C11 | `I25-C11 caminho relativo…` A/B/C/D | `prep:200` `{exitCode: 2, [root_not_absolute], relative: false, config: false}` | carried | PASS |
| C12 | `I25-C12 sem terminal…` ×2 A/B/C/D | `prep:223` `{status: 3, line: "skill-me: preparação pendente [setup_required]; rode skill-me codex num terminal…", trees: before, started: false}`; `prep:387-388` | carried | PASS |
| C13 | `I25-C13 preparo concluído…` A/B/C/D | `prep:238` `{exitCode: 0, asked: 0, preview: false, config: <SHA-256>, settings: <SHA-256>, started: 1}` | carried | PASS |
| C14 | `I25-C14 falha do preparo…` A/B/C/D | `prep:250` `observe_on` 4; `prep:266, 276, 290` | carried | PASS |
| C15 | `I25-C15 terminal real (pty)…` (C) | `prep:398-403`; `prep:408` `{status: 3, declined: true, trees: before}` | carried | PASS |
| C16 | `I25-C16 …` ×2 A/B/C/D | `sess:67` `{origin: "launch", invocation, segment: 1, state: "active", content: true, retentionDays: 7, limits: {maxEvents: 500, maxBytes: 8388608}, launchedAt}`; `sess:61, 69`; `agent:160-165` | carried | PASS |
| C17 | `I25-C17 …` ×4 A/B/C/D | `store:79` `["launch", invocation, 1, "2026-10-26T10:00:00.000Z"]`; `store:54, 110, 156`; `sess:300-301` | carried | PASS |
| C18 | `I25-C18 execução indisponível…` A/B/C/D | `sess:111` `{status, stderr: "skill-me: não foi possível abrir a execução [<código>]\n", started: false, waited: true}`; `sess:124` | carried | PASS |
| C19 | `I25-C19 eventos na captura da execução…` A/B/C/D | `sess:147, 151, 152-160`; `sess:161` `[0, 0]`; `sess:165-167` | carried | PASS |
| C20 | `I25-C20 par inválido…` A/B/C/D | `sess:190-192` `{bound: false, code: "binding_invalid", entries: 1, committed: 0, persisted: 0, lost: 1}` | carried | PASS |
| C21 | `I25-C21 autorização global intacta…` A/B/C/D | `sess:208-211` bytes iguais com off e com on | carried | PASS |
| C22 | `I25-C22 limite de eventos…` A/B/C/D | `sess:230` `[1, "stopped", 500, 500, {}]`; `sess:236, 240-245` | carried | PASS |
| C23 | `I25-C23 limite de 8 MiB…` A/B/C/D | `sess:282` `["active", MAX_BYTES, {}, 1]`; `sess:289, 291` | carried | PASS |
| C24 | `I25-C24 captura corrente encerrada à mão…` A/B/C/D | `store:168` `[opened.capture, "stopped", 1]`; `store:169` | carried | PASS |
| C25 | `I25-C25 encerramento e resumo…` A/B/C/D | `end:72-79` capturas `stopped`, `endedAt` ISO, ponteiro ausente; `end:80-89` stderr exato | carried | PASS |
| C26 | `I25-C26 nada gravado…` A/B/C/D | `end:101-109` `eventos gravados: 0.` e a dica com `manualSteps[0]` | carried | PASS |
| C27 | `I25-C27 …` ×3 A/B/C/D | `end:120` `{launch: true, code: "launch_ended", entries: 1, committed: 0, persisted: 0, lost: 1}`; `store:222-260` | carried | PASS |
| C28 | `I25-C28 entregas Hermes em voo…` e `… primeira entrega perdida…` A/B/C/D | `end:148-149` sinal nulo e saída existente antes do parse; `end:158-159` `{started: true, delivered: true, enqueued: 3, sent: 3, queueFull: 0, failed: 0}`; `end:164-165` `persisted` 3 e `stopped`; `end:168` `eventos gravados: 3.`. Regressão: `end:181-185` `{started: false, delivered: false, stats: {enqueued: 1, delivered: 1, …, active: true}}`; `end:187` `[["stopped", 0, 0]]`; `end:188` ponteiro fora; `end:189` `eventos gravados: 0.`; `end:194` `["EIO"]` (1 rename); `end:195` 1 unlink. Fixture 25 s + 25 s (`hermes-plugin-session.py:25-26`) sob o supervisor de 60 s (`hl:121, 132`) | carried | PASS |
| C29 | `I25-C29 término por sinal…` A/B/C/D | `cmd:278, 295, 300` | carried | PASS |
| C30 | `I25-C30 falha de início…` A/B/C/D | `cmd:342` `{status: 127/126, startCode: true, captures: [[1, "stopped", 0]]}` | carried | PASS |
| C31 | `I25-C31 …` ×2 A/B/C/D | `end:205-215` `[lock_present]`, `continua active`, `privacy stop`, `continua aberta`, `["active", true]`; `end:244-258` `[io_failure]`, `já não recebe registros`, `launch_ended` | carried | PASS |
| C32 | `I25-C32 …` ×9, A/B/C/D | **Processos reais**: `end:280` A sai com 0; `end:283` IDs diferentes; `end:286` `["stopped", "active"]`; `end:291` B sai com 0; `end:293-294` `a-1, a-2` / `b-1, b-2, b-3` com o pseudônimo da chave de cada captura; `end:295` chaves próprias; `end:296` `[1, 1]`. **Diagnóstico original**: `end:320` `"eventos intercalados: B terminou antes"`; `end:322-326`. **Diagnóstico parcial**: `end:370-386`; apoio `hl:214-257` (`:255` erro original em `cause`), `failureCode` agora em `tr:151`. **Primeira criação**: `store:706-802` (`:715` `lock_present`) e `end:396-444` (`:438` `capturas: 1; eventos gravados: 1.`) | carried (asserções) + `hl` atualizado | PASS |
| C33 | `I25-C33 on e off…` (A/B/C/D) e `… arranjo do npm run (POSIX)` (C) | `end:457` `npmScriptEnv`; `end:459` `[0, "on"]`; `end:460` `active`; `end:464` `[0, "off", []]`; `end:465` `active`; `end:469` 3× `LAUNCHED(1)`; `end:474` nenhuma automática. Arranjo: `end:493-494` `≠ 0` e `/spawn sh ENOENT/`; `end:497`; `end:501` `[0, "ok", "off"]`. PATH com só `node`/`sh`/fixture em `hl:67-74` | carried | PASS |
| C34 | `I25-C34 …` ×4 A/B/C/D | `rep:82` texto; `rep:90-96`; `rep:145, 155` precondições com tempos (`deps.now`); `rep:159` `[newInv, true]`; `rep:173`; `rep:181`; recuo `rep:208-213`; `rep:237` `--latest`; `rep:239` `[0, 1, [automatic.id]]` | carried | PASS |
| C35 | `I25-C35 report sem execução…` A/B/C/D | `rep:252-259` `[3, {"schemaVersion":1,"command":"report","status":"error","error":{"code":"not_configured"}}, ""]` e `no_launch_capture` | carried | PASS |
| C36 | `I25-C36 ajuda…` A/B/C/D | `cmd:350` `[0, SKILL_ME_HELP, ""]`; `cmd:354` `[2, "", SKILL_ME_HELP]`; `cmd:356-368` | carried | PASS |
| C37 | `I25-C37 documentação…` ×3 A/B/C/D | `docs:57, 60-62`; `docs:82` os 9 limites (`docs:44-54`); `docs:88-89, 93` | carried | PASS |
| C38 | `I25-C38 console real do Windows…` (A/B/D) | `prep:355` `["done", 0]`; `prep:361, 363, 365` | carried | PASS |
| C39 | `I25-C39 …` ×3 A/B/C/D | `harn:88` `["concluded", 0, 3]`; `harn:100-102, 186-188` | carried | PASS |
| C40 | `I25-C40 …` ×2 A/B/C/D + nativo `I25-C40 harness nativa…` (D) + `I4-C20`, `I4-C21`, `I4-C37` (D) | `harn:196-225` `[2000, "timeout"]`, `[5000, "timeout"]`; nativo `nat:335` `{capture: "concluded", ingest: "concluded", inactive: "inactive", spawnfail: "failed", exit: "failed", disconnect: "failed", stall: "timeout"…}` | carried; nativo **executado em D** | PASS |
| C41 | `I25-C41 …` ×17 A/B/C/D | `store:327-523`; `end:518, 535, 539-551, 581, 601-619, 646-656, 681-692, 722-729, 736-752` | carried | PASS |
| C42 | `I25-C42 …` A/B/D 3p/1s; C 3p/1s | `agent:187-236`; `cmd:424` POSIX `{status: null, signal, started: false, …}`; `cmd:456` Windows `status: 130` | carried | PASS |
| C43 | `I25-C43 …` ×12 A/B/C/D | `store:560-632` (`:598` `{code: "root_changed", opened: true, …, lockLeft: false}`); `end:808-813, 823-831, 839-843, 864-867, 877-883, 891-902, 924, 944-954, 966-971`; linhas literais `end:762-769, 907-914` | carried | PASS |
| C44 | `I25-C44 …` ×3 A/B/C/D + nativo `I4-C22` e `I25-C40` (D) | `harn:263-271, 281-289` `[1000, "timeout"]`, `[5000, "timeout"]`; `harn:300-304`; nativo `nat:251-256` | carried; nativo **executado em D** | PASS |
| C45 | `I25-C45 …` A/B/D: resolução + controle Windows; C: resolução + POSIX real | `agent:132-146, 154`; `cmd:166-186`; `cmd:198-201` | carried | PASS |
| C46 | `T8-C15 concurrent producers…` (1) e `I25-C46 diagnóstico do T8-C15…` ×3, A/B/C/D | Saudável `conc:214-215` `{bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0}`, `:226` 80, `:227` IDs únicos, `:229` `[80, 80]`, `:237` hooks, `:251` `{…code: "lock_present", entries: 3, committed: 0, persisted: 0, lost: 3}`, `:252` árvore igual. (a) `:297` `io_failure`, `lost > 0`, `committed + lost === 40`; `:298` `["rename segmento.tmp EIO (antes do commit)"]`; `:301-310` export `{records: 40 + committed, a: 40, b: committed, others: 0, repeated: 0}`, lock ausente. (b) `:325` `["unlink lock EIO (depois do commit)"]`; `:327-336` export `{80, 40, 40, 0, 0}`. (c) `:349` `{…io_failure, entries: 40, committed: 0, persisted: 0, lost: 40}`; `:351-360` `{unavailable: "lock_present"}` ×2, `{segments: 1, temporaries: 0}`, `lock {present: true}`. Base `:276-280`, `:282-287` | **verified** (citações atualizadas; corpo idêntico à R11) | PASS |
| **C47** | `I23-C10 sessões concorrentes…` (1) e `I25-C47 diagnóstico do I23-C10…` ×2, A/B/C/D; mais `T8-C15`/`I25-C46` (apoio comum) | Seção “AC8 — C47”. I23-C10: `ag:310` `deepEqual(run.report?.delivery, DELIVERED_AUTO(1|20))` nas etapas `ag:321-329`; cauda `ag:331-377` igual a `d0d5a7f`. (a) `ag:402` `[actual, expected]`, `ag:403` prefixo `codex A 0\n<evidência>`, `ag:422` `io_failure` 1/0/0/1, `ag:424` `[["rename segmento.tmp EIO (sob o lock, 2ª tomada)"], 0, 1]`, `ag:426` `active accepted 0 persisted 0`, 0 segmento, 0 temporário, lock ausente. (b) `ag:437` `delivery_timeout` 1/0/0/1, `ag:439` `[[], "close key (sob o lock, 2ª tomada)"]`, `ag:441` `{unavailable: "lock_present"}`, lock presente. Não vazamento `ag:406-416`, `ag:430`, `ag:444` | **verified at `0f540a0`** | **PASS** |
| **C48** | prova estrutural + `governance-C1 C3 workflow sempre publica CI…` (D) | `governance.yml:43` única linha diferente de `d0d5a7f` e da base; `:21` e `:63` 5; `:41-42` e `:52-56` iguais; script estrutural com “resto … igual: true” (`v12/C48-workflow-values.txt`); `gov:263-278` matriz, `runs-on` e passos | **verified at `0f540a0`** (estrutural; a CI real é do orquestrador) | **PASS** |

**Checks com prova verde em todos os ambientes aplicáveis e no gate: 48/48.**

## AC → checks

- **AC1** (comando, argumentos, sinais, código): C1–C6, C42, C45. Verdes.
- **AC2** (primeiro uso): C7–C15, C26, C38. Verdes.
- **AC3** (só a sessão iniciada, capturas sucessivas): C16–C24, C41. Verdes.
- **AC4** (encerramento verificável, concorrência, consulta sem ID): C25, C27–C35, C41, C43. Verdes.
- **AC5** (README e ajuda): C36, C37. Verdes.
- **AC6** (harness do Hermes): C39, C40, C44. Unidade verde em A/B/C; os 12 nativos verdes em D.
- **AC7** (T8-C15): C46 e T8-C15, verdes em A/B/C e no gate D.
- **AC8** (I23-C10 e orçamento Windows): C47 verde em A/B/C/D, com o I23-C10 inalterado nas asserções; C48 pela prova estrutural e pelo `governance-C1 C3` em D.

## Processo desta rodada (o que os meus comandos mostram)

**Executado.**
- git, só leitura ou com configuração local:
  - `rev-parse`, `status`, `diff`, `log`, `show`, `ls-files --eol/-s`, `config --show-origin/--get`, `branch --show-current`, `check-ignore`;
  - `archive -c core.autocrlf=false` e `get-tar-commit-id`;
  - `clone --no-hardlinks --config core.autocrlf=true` do repositório local, com a configuração só no clone.
- Versões: `node`, `npm`, `python`.
- `node -e`/`-p` só de leitura (configuração, `npmCli()`); `python -I` para contar bytes e CR.
- WSL:
  - `wsl.exe -l -q`;
  - `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc`, só com os meus scripts.
- Os alvos versionados A, B e C e o `npm test` (D).
- `builder-ci40514323240-approved/workflow-values.mjs` (do autor, lido antes), só para a leitura estrutural do YAML de C48.
- Os meus scripts em `v12/`: `run-win-target.sh`, `b-clone-prepare.sh`, `b-clone-after.sh`, `wsl-prepare.sh`, `wsl-run.sh`, `wsl-cleanup.sh`, `run-d-npm-test.sh`, `temp-baseline.mjs`, `cleanup-temp.mjs`, `matrix.mjs`, `per-check.mjs` e `d-summary.mjs`. São adaptações dos da R11, com HEAD, rodada e o 11º arquivo do alvo trocados.
- Uma espera limitada pelo arquivo de término de D (`timeout 570 … until grep EXIT=`).

**Não executado.**
- Nenhuma repetição de prova ou gate.
- Nenhum `codex`, `claude`, `hermes`, `gemini` ou outro agente real, nem `--version`/`--help`, `execvp` ou `spawn` desses nomes fora dos testes versionados. Os agentes dos alvos são de fixture. O Hermes real só foi importado como runtime Python pelos 12 testes nativos versionados, em HOME temporário.
- Nenhuma sonda nova, teste novo, mutação ou fault injection minha.
- Nada de rede, credencial, perfil pessoal ou banco.
- Nenhuma alteração de host, relógio, runtime ou Git global.
- Nenhuma listagem ou encerramento de processos.
- Nenhum gate global antigo do WSL com `Date.now()`.
- Nenhuma mudança de timeout de teste. O orçamento de 2 h foi só o da ferramenta, para D.
- Nenhum commit, push, PR, merge, `review:run`, revisão formal ou CI.

**Histórico preservado e não repetido.**
- O incidente da R5 (até 5 inícios do Codex WSL; 12 mtimes sem linha de base de conteúdo) continua registrado em `ffc5937`.
- Os dois inícios de D na R8, o FAIL9 (`4e66de2`), o FAIL10 (`788d160`) e o PASS11 (`d0d5a7f`) ficam como estão.
- A CI 40514323240 vermelha continua registrada (`8868fe1`).
- Não editei `verifier-round1/` a `verifier-round11/`; só li os scripts da R11 como método.
- Os arquivos de auditoria do orquestrador em `verifier-round12/` ficaram sem leitura nem alteração.

## Falhas, limitações e o que não está provado

- **Causas desconhecidas e não eliminadas**:
  - os dois `delivery_timeout` da CI 40514323240 (I23-C10 e o primeiro C46). A instrumentação só os mostra numa nova ocorrência, e os 20 minutos não garantem a próxima CI verde;
  - a falha do T8-C15 da R9;
  - a perda do primeiro registro do C28 (R7);
  - o timeout de C32 na CI 40443538957;
  - o C34 do WSL em `abae80a`.

  Uma passada verde por ambiente não mede taxa.
- **C48**: a expressão `${{ … }}` não foi avaliada pelo GitHub aqui. Os valores por sistema são do ternário do script estrutural. A CI real do novo HEAD é do orquestrador.
- **C47**: ramos só lidos, sem teste nomeado (o checklist não os reivindica):
  - entrega sem relatório;
  - pré-carga sem linha;
  - listagem da raiz com erro diferente de `ENOENT`.

  A mensagem antiga (só o rótulo) é o RED do autor. A pré-carga pode alterar um pouco o tempo dos produtores, e esse custo não foi medido à parte.
- **Evidência do autor, não repetida por mim**:
  - RED, GREEN e as três mutações do C47 (`build.md:1345-1363`);
  - RED e mutações do diagnóstico de C32, do store e do C46;
  - RED/GREEN do C1 em clones `true`/`false`; a matriz 3+3 do C32; a mutação por `createdAt` do C34; o RED do C28.
- **C46**: a sobreposição dos produtores vem da construção e não é afirmada. Os controles dependem da ordem da n-ésima operação injetada.
- **Continuam das rodadas anteriores**:
  - os três ramos do apoio de C32 só lidos;
  - a variante “lock ausente” de C43 sem teste nomeado;
  - as janelas do plugin em C44;
  - o ramo com várias capturas `active` na falha do encerramento, sem prova;
  - recusa e EOF num console real do Windows;
  - os nativos do Hermes pulados na CI (executados aqui em D);
  - C23 sem asserção de tempo;
  - a variante link do C17 não executada no Windows desta máquina (executada em C);
  - macOS e o runner da CI não executados;
  - o uso real sem sessão de agente (`Unresolved` 2, `blocks go-live`).

## Findings (em ordem)

1. **Nenhum bloqueante.** 48/48 checks e os gates A, B, C e D verdes no HEAD `0f540a0`, cada um numa execução única.
2. **AC8/C47 íntegro.** O I23-C10 manteve etapas, contagens, chaves, isolamento, prazos e asserções (cauda byte a byte igual a `d0d5a7f`). As duas provas C47 têm valores exatos:
   - a asserção original vermelha, com `actual`/`expected`;
   - a testemunha única da injeção;
   - o lugar no lock;
   - a última operação concluída;
   - `indisponível [lock_present]` sem zero inventado;
   - o não vazamento.
3. **Apoio comum sem regressão.** `diskTrace` reproduz a máquina de fases do T8. O T8-C15 e os três C46 passaram com os mesmos literais em A/B/C/D. Há dois consumidores reais, e `failureCode` não é mais copiado.
4. **C48 estrutural.** Uma linha no workflow, `changes`/`ci` com 5, e passos, matriz, runner e concorrência iguais a `d0d5a7f` e à base. O `governance-C1 C3` passou em D.
5. **Nota (não bloqueante)**: `traces-probe.mjs:134` mantém a extração própria do código de erro, anterior à feature e com outro contrato. Não é cópia introduzida aqui.
6. **Pendências fora deste Verifier**: a revisão formal 7, a CI real do novo HEAD e o merge (orquestrador), e o uso real (`Unresolved` 2).

## Gate

| Gate | Resultado |
| --- | --- |
| A — alvo de 11 arquivos, Windows, Node 24.22.1, concorrência 4 | 128: 122 pass, 0 fail, 6 skip — exit 0 |
| B — o mesmo, Windows, Node 24.13.0 oficial, npm 11.6.2 adjacente, `npm_execpath` ausente, clone novo com `core.autocrlf=true` | 128: 122 pass, 0 fail, 6 skip — exit 0; `cli.mjs` LF/0 CR e status vazio antes e depois |
| C — o mesmo, WSL Ubuntu uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, `env -i`, PATH sem `/usr/bin`, cópia exata | 128: 122 pass, 0 fail, 6 skip — exit 0 |
| C48 — diff de uma linha, YAML por job/sistema, script estrutural, `governance-C1 C3` | conforme; `governance-C1 C3` ✔ em D |
| D — `npm test`, Windows, Node 24.22.1, runner padrão (8), 12 nativos do Hermes | **1.006: 986 pass, 0 fail, 20 skip — exit 0** (6 + 16 + 417 + 567) |

## Limpeza

- **`%TEMP%`**: linha de base antes de A (`temp-baseline.json`: 60.414 nomes, 0 `skill-me i4 i25 *`, 30.085 `skill-me *`). `cleanup-temp.mjs` (Node 24.22.1) removeu só diretórios que atendiam a todas estas condições:
  - fora da linha de base;
  - filho direto do `%TEMP%`;
  - prefixo `skill-me i4 ` ou `skill-me i5 `;
  - não link;
  - mtime dentro da janela.

  Rodei uma simulação antes de cada aplicação:
  - **A–B** (04:31:50Z–04:38:30Z): **405 removidos, 0 recusas** — 377 `i4 i25`, 14 `i4 t8`, 12 `i4 i23`, 1 `i4 ausente` e 1 `i4 secoes`.
  - **D** (04:40:20Z–04:52:00Z, linha de base `temp-before-D.json`): **127 removidos, 0 recusas** — 124 `i4 i5`, 2 `i4 t7` e 1 `i5 c7`.

  Depois: 0 `skill-me i4 i25 *` e de novo 30.085 `skill-me *`. Os 3 e 29 nomes fora do filtro não foram tocados.
- **Clone de B**: removido depois de conferir que o caminho absoluto é `v12/B-clone`, que é diretório e não link, e que o HEAD é `0f540a0` (`B-clone-cleanup.txt`).
- **WSL**: `wsl-cleanup.sh` removeu `/tmp/skillme-verifier-r12.hZNDDP` depois de conferir o padrão absoluto e o tipo. Restaram 0 scratches `r12` e 0 `skill-me i4 i25|t8|i23 *` (`C-wsl-cleanup.txt`).
- **Mantidos em `v12/`** (pasta ignorada): os logs de A, B, C e D, `matrix.txt`, `per-check.txt`, `D-summary.txt`, `C48-workflow-values.txt`, os workflows extraídos, o tar do HEAD, as linhas de base, os relatórios de limpeza e os meus scripts.
- **Estado final**: configuração, estado de review e prefixo npm real não foram tocados. O HEAD continua `0f540a0`. O `git status` estava vazio antes de gravar este arquivo; depois, só ele aparece modificado.
