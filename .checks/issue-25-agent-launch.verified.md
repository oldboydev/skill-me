# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25

**Verdict**: **FAIL**. A prova **C** (WSL Ubuntu isolado, Node 24.13.0 sem `sh` ao lado) saiu com **1**: 120 testes, 113 pass, **1 fail**, 6 skip. Falhou `I25-C32 diagnóstico das invocações simultâneas…` (`tests/integrations/launch/end.e2e.test.mjs:320`): a primeira linha do erro foi um `ENOENT` ao abrir o `state.json` de uma captura, e não `eventos intercalados: B terminou antes`. A regra desta rodada é: falhou uma prova, então FAIL e parar, sem repetir e sem corrigir. Por isso **o gate D (`npm test` completo) não foi iniciado**. Não repeti nada.
**Checks**: **45/46** com prova verde em todos os ambientes aplicáveis (A, B e C). **C32 está vermelho em C**: 6 dos 7 testes passaram, e falhou o do diagnóstico. Os 7 testes de C32 passaram em A e B. **Gate D: não executado.**
**Profile**: light (sem fault injection, `Coverage` ou `Test policy` próprios, e sem fonte vinculante de UI). Rodei os controles e as mutações já versionados nos testes; não fiz nenhum meu.
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..df259ed00c02f4426713b130cab5ff3d6331ac1d`, a feature inteira (69 commits, checks C1–C46, 7 ACs). Desde a R9 (`dd89179`, relatório em `4e66de2`) mudaram:
- **produto**: `src/integrations/privacy/store.mjs` (`f734441`, +55/−17);
- **provas**: `tests/integrations/traces/concurrency.cli.test.mjs` (`710076e`, +256/−11), `launch/store.unit.test.mjs` (+171/−2), `launch/end.e2e.test.mjs` (+56/−1) e `helpers/launch.mjs` (+33);
- **documentos**: task, checklist, build e o handoff do T8-C15, só com linhas acrescentadas (0 removidas).
Em toda a feature, `scripts/`, `.github/` e o core vendorizado estão sem diff, e `code-review.config.json` sem diff desde a R9.
**Round**: **10**, a única nova, autorizada só para a #25 pelo proprietário com “Autorizar ajuste pontual e 10ª verificação” ([comentário 6440482031](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6440482031)). As nove anteriores ficam preservadas, inclusive o FAIL da 9ª em `4e66de2`. A revisão formal 6 é do orquestrador e continua disponível. Não alterei nenhum limite.
**Verifier**: subagente independente novo (Claude Opus 5.5). Não sou o autor nem um Verifier anterior. Código, testes, critérios, checklist e configuração ficaram só para leitura. Não fiz commit, push, PR, merge, `review:run` nem mudança de estado, limite ou histórico.

Data: 27/10/2026, 09:19–09:30 (-03). HEAD `df259ed` (árvore `88f3a4a4…`) do início ao fim. O `git status --porcelain=v1 -uall` do checkout principal estava vazio antes (`verifier-round10/v10/git-status-before.txt`), antes e depois de A e no fim. Logs e scripts estão em `.checks/code-review/issue-25/verifier-round10/v10/` (pasta ignorada).

## Veredito em uma linha

**FAIL por C32 em C.** Cada alvo, de 10 arquivos e 120 testes, rodou **uma vez** por ambiente:
- **A** (Windows, Node 24.22.1): 114 pass, 0 fail, 6 skip, exit 0.
- **B** (Windows, Node 24.13.0 oficial, clone novo com `core.autocrlf=true`): 114 pass, 0 fail, 6 skip, exit 0.
- **C** (WSL isolado): 113 pass, **1 fail**, 6 skip, exit 1.

Os 120 nomes são idênticos nos três TAP. O T8-C15, os três I25-C46 e os cinco I25-C32 novos (store e launcher) passaram nos três ambientes. A falha de C é do **apoio de diagnóstico da prova** (`withOverlappingRuns`). Em vez de trazer o erro original, ele lançou o próprio `ENOENT`, contra o contrato do acréscimo de C32 no checklist. O produto não falhou nessa prova. Por causa da regra de parada, D não rodou, então o gate completo não está confirmado por mim nesta rodada.

## Fontes lidas nesta rodada

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `tlc-implement/references/verify.md` | inteiros; perfil `light` |
| `.tasks/issue-25-agent-launch.md` | inteiro (553 linhas): critérios 1–38, as seções “Diagnóstico pontual da prova antiga T8-C15 (AC7…)” e “Regressão da execução completa instrumentada: primeira criação concorrente do store (C32…)”, e as Sources com 6440482031 |
| `.checks/issue-25-agent-launch.md` | inteiro (600 linhas): Landing, inclusive “Diagnóstico do T8-C15” (`:72`) e “Primeira criação concorrente do store” (`:73`); C1–C46 com os acréscimos de C32 (`:189-196`) e S10/C46 (`:357-385`); Swept e Handoff |
| `.checks/issue-25-agent-launch.build.md` | inteiro (1.191 linhas). É **relato do autor, não prova minha**. Inclui RED/GREEN e mutações do C46 (`:1065-1082`), a execução instrumentada vermelha em `710076e` (`:1092-1098`), a causa e a correção do C32 (`:1117-1164`) e os alvos e o `npm test` do autor em `f734441` (`:1166-1182`) |
| `.checks/issue-25-agent-launch.t8c15-handoff.md` | inteiro (74 linhas): proposta preservada e “Estado da implementação” |
| `.checks/code-review/issue-25/context-ci28-verifier10-approved.json` | inteiro. O corpo da issue tem **7 ACs** (o 7º é o T8-C15) e há **18 comentários**. O último é a autorização “Autorizar ajuste pontual e 10ª verificação” |
| `.checks/issue-25-agent-launch.verified.md` da R9 | inteiro, antes de substituí-lo |
| Diffs `dd89179..df259ed` | inteiros: `store.mjs`, `concurrency.cli.test.mjs` (também `63621c6..HEAD`), `store.unit`, `end.e2e` e `helpers/launch.mjs` |
| Apoios do C46 sem diff na rodada | `helpers/traces-probe.mjs` inteiro (pré-carga), `helpers/traces.mjs:63-150` (`runInternal` com `closedAt`, `timedEnv`, `timingLines`, `deliveryTiming`, `describeTiming`). Ambos com 0 linhas de diff em `dd89179..HEAD` |
| Auditoria externa do orquestrador | **não lida**. Em `verifier-round10/` só listei os nomes: `profile-before.json`, `profile-compare.py`, `profile-metadata-snapshot.py`. Não há `profile-comparison-final.json`. Os meus arquivos ficam na subpasta `v10/` |

## O que mudou no produto: primeira criação do store (`f734441`, verified at `df259ed`)

| Ponto | Situação | Evidência |
| --- | --- | --- |
| Marcador publicado inteiro | temporário `store.json.<hex8>.skill-me-tmp` + `rename`; uma falha apaga o temporário | `store.mjs:42` `MARKER_TEMP_PATTERN`; `:371-377` `writeExclusive(tmp)` → `rename(tmp, store.json)`, `catch` com `unlink(tmp)` |
| Quem cria lista antes de ler | `needsAdoption`: `store.json` listado tem de ser exato, senão `store_invalid`. Sem ele, a pasta é adotável vazia, só com `.lock`, ou com o temporário do marcador **junto do** `.lock`. Qualquer outra entrada dá `store_invalid` antes do lock | `:140` `if (create) needsInit = await needsAdoption(…)`; `:162-171` |
| Decisão final sob o lock | `initStore` relê. Marcador exato: não grava. Diferente: `store_invalid`. Ausente: a pasta só pode ter o `.lock`, e então o marcador é publicado | `:366-380`; `:369` `if (await readMarker(io, storeDir)) return;`; `:370` `some((name) => name !== LOCK_FILE)` → `store_invalid` |
| Quem não cria | lê o marcador como antes, sem listar | `:141` `else if (!(await readMarker(io, storeDir))) throw new StoreError("store_invalid")`; `readMarker` `:146-151` usa a mesma leitura limitada de antes (`readSmallFile`, `STORE_MARKER.length`) |
| Consumidores (código comum) | `privacy start` (`startCapture` `:413-415`), `on` (`changeObservation` `:876-879`, `create: action === "on"`) e a abertura do launcher (`startLaunch` `:1081-1085`). `holdLockFile`/`withLock` sem mudança (`:196-231`) | Grep de `initStore(`/`create: true` |
| Sem retry novo | A segunda abertura durante uma criação recebe `lock_present` e cai na paciência que já existia. Ela só repete `lock_present`; `store_invalid` nunca é repetido | `observe/command.mjs:94-104` `patiently`: `error.code !== "lock_present"` → relança; sem diff nesta rodada |
| Mudança de comportamento declarada | Numa criação concorrente, o `privacy start` passa a responder 4 `lock_present` em vez de 3 `store_invalid` ou 5 `io_failure`. Uma sobra de `.lock` + temporário dá `lock_present`, e depois do lock removido dá `store_invalid` | Landing “Primeira criação concorrente do store” (`checklist:73`) e `build.md:1184-1188`. Está dentro da linha aprovada; não é uma decisão nova minha |
| Recusas preservadas | provadas pelo `I25-C32 … recusas mantidas` em A, B e C (abaixo) | Não executei as recusas pré-existentes do `privacy start` (`I5-C32s` `privacy/store.cli.test.mjs:637-647` com marcador diferente; `I5-C49` `:364` com raiz por link; `I5-S-bounded` `privacy/store.unit.test.mjs:220-228`, marcador lido em no máximo 26 bytes). Elas só rodam no gate D, que não rodou. A regressão de 179 testes de privacidade/observe é do autor (`build.md:1162-1164`) |

## C46: rigor e contratos preservados (verified at `df259ed`)

`concurrency.cli.test.mjs`: o T8-C15 (`:241-277`) e os três I25-C46 (`:311-385`) usam a **mesma rotina**:
- `runConcurrentProducers` (`:111-123`);
- `inspectProducers` (`:199-208`);
- `assertProducersConfirmed` (`:232-239`).

| Exigência | Situação | Evidência |
| --- | --- | --- |
| Saudável igual ao da base | **igual**. O `diff` do corpo base `63621c6:97-141` contra `HEAD:241-277` só troca a criação dos produtores e a mensagem; as demais linhas são idênticas | `:236` `status === 0`; `:237` `deepEqual(delivery, {bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0}, \`${name}\n${diagnosis}\`)`; `:248` 80; `:249` IDs únicos; `:250-251` segmento coerente e `[80, 80]`; `:255-264` pares de hooks; `:269-276` lock alheio → `{code: "lock_present", entries: 3, …, lost: 3}`, árvore igual |
| Produtores simultâneos, sem serialização | dois `ingest --agent hermes` por `Promise.all`, 40 linhas cada com pausas de 4 ms, na mesma captura | `:117-121`. **Limite**: a sobreposição vem da construção e não é afirmada (também não era na base) |
| Pré-carga existente, um arquivo por produtor | `timedEnv(timing[name])` por produtor. As operações vão para a memória (`ops.push`) e uma linha é gravada no `exit` | `:114-115, 119`; `traces-probe.mjs:118-124, 165-168`; `helpers/traces.mjs:111` (`NODE_OPTIONS=--import=…`) |
| Evidência antes da asserção, sem caminho, ID, chave, conteúdo ou ambiente | por produtor: status, sinal, ms, relatório e falhas `<op> <tipo> <código> (<fase>)`, com o `open lock EEXIST` contado à parte. Da captura: export por produtor (pelo pseudônimo), status, segmentos, temporários e lock | `:146-162` fases; `:174-197` captura (export e status pelo CLI); `:212-229` texto |
| A inspeção não mascara a falha original | **conferido**. `inspected` converte qualquer exceção em `{unavailable: <código E… ou nome>}` (`:128-134`); a linha de tempos (`:203`), a captura inteira (`:207`) e cada parte (`:175-197`) passam por ele. `describeProducers` só lê campos já normalizados (`:210`, `shown`) | — |
| Asserção saudável vermelha nos injetados | `assertFailedWithEvidence`: a falha é `AssertionError`, com `[actual, expected]` = `[delivery do produtor, {bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0}]`, e a mensagem começa por `${name}\n${describeProducers(evidence)}` | `:298-302` |
| (a) `SEGMENT_EIO=1` só em `b` | `a`: `{…40/40/40/0/null}` e falhas `[]` (`:317`). `b`: `code === "io_failure" && lost > 0 && committed + lost === 40 && persisted === committed` (`:319`). A quantidade perdida não é fixa, conforme o contrato. Falhas exatamente `["rename segmento.tmp EIO (antes do commit)"]` (`:320`). Captura `{export: {records: 40 + committed, a: 40, b: committed, others: 0, repeated: 0}, status: {state: "active", accepted: total, persisted: total}, files: {segments: 1, temporaries: 0}, lock: {present: false}}` (`:323-332`). Mensagem com a operação e o export (`:333-334`) | não vazamento `:335` |
| (b) `LOST_CONFIRMATION=2` | `a` igual (`:344`); `b` com a mesma regra (`:346`); falhas exatamente `["unlink lock EIO (depois do commit)"]` (`:347`). Captura `{export: {records: 80, a: 40, b: 40, others: 0, repeated: 0}, status: {state: "active", accepted: 80, persisted: 80}, files: {1, 0}, lock: {present: false}}` (`:349-358`): as entradas dadas como perdidas estão no disco. Mensagem (`:359-360`) | `:361` |
| (c) `LOCK_KEPT=2` | a mensagem é a do primeiro produtor que não confirmou tudo (`:366, 369`). `b` exatamente `{bound: true, code: "io_failure", entries: 40, committed: 0, persisted: 0, lost: 40}` (`:371`); falhas `["unlink lock EIO (depois do commit)"]` (`:372`). Captura `{export: {unavailable: "lock_present"}, status: {unavailable: "lock_present"}, files: {segments: 1, temporaries: 0}, lock: {present: true}}` (`:373-382`): nenhuma contagem presumida. Mensagem literal (`:383`) | `:384` |
| Não vazamento | a mensagem não contém a raiz, o ID, a chave em hex/base64/base64url, `sessao-a`, `sessao-b` nem o `PATH` do processo de teste, e `leaks(text)` = `[]` | `:304-309` |
| Prazos, teto 8, retry, perdas | inalterados. O caminho de entrega do produto não tem diff (só `store.mjs` mudou, na criação). O runner continua com `scripts/test-integrations.mjs:14` `MAX_PARALLEL_FILES = 8` e `:16`, sem diff na feature | — |
| Histórico do autor | o RED antigo (as duas injeções davam a mesma mensagem `b` 34/6) e as duas mutações estão no build (`:1065-1082`); **não as repeti**. A primeira GREEN falhou por comparar `failure.message` por igualdade, porque o Node anexa o diff dos valores. Isso foi corrigido **na prova** (`:300-301`) e **não resolve a causa original** |

**Causa da falha da R9 (T8-C15, `b` com 20 perdidas e `io_failure`)**: continua **desconhecida**. A instrumentação torna uma nova falha diagnosticável, mas não a corrige nem elimina perdas. O T8-C15 passou nas minhas três execuções (A 11,6 s, B 11,3 s, C 1,7 s), uma por ambiente, o que não mede taxa. Pelo relato do autor, a execução instrumentada em `710076e` não reproduziu a falha. O registro de `io_failure` anterior à #23 não demonstra taxa nem a mesma causa. A pré-carga pode mudar um pouco o tempo dos produtores (declarado no Landing).

## Ambientes e execuções — verified at `df259ed`

Execuções **em sequência**, uma invocação por alvo, sem repetição. O alvo de A, B e C é `node --test --test-concurrency=4 --test-reporter=spec … --test-reporter=tap … tests/integrations/launch/*.test.mjs tests/integrations/hermes-harness.unit.test.mjs tests/integrations/traces/concurrency.cli.test.mjs`, com **10 arquivos**: os 8 do `launch`, a harness e o arquivo **completo** de concorrência. Cada execução rodou em segundo plano com um teto de 7.200.000 ms na ferramenta.

| # | Ambiente | Resultado |
| --- | --- | --- |
| A | Windows 11, checkout principal, Node v24.22.1 (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10; `npm_execpath` ausente; `npmCli()` = `C:\nvm4w\nodejs\node_modules\npm\bin\npm-cli.js`. 09:19:40–09:22:07 (`A-win-24.22.1.*`) | **120 testes: 114 pass, 0 fail, 6 skip**, exit 0; `git status` vazio antes e depois. Diagnóstico impresso pelo teste: variante link do C17 não executada (falta de privilégio de symlink de arquivo, `tap:506`) |
| B | Windows 11, Node v24.13.0 oficial (`ci-node-24.13.0/node-v24.13.0-win-x64/node.exe`) no início do `PATH`, npm **11.6.2** adjacente (`npmCli()` = o `node_modules` do zip), `npm_execpath` ausente. **Clone git novo**: `git clone --no-hardlinks --config core.autocrlf=true <checkout> v10/B-clone`, com a configuração só em `.git/config` do clone; a do sistema (`true`) não foi tocada. `node_modules` copiado, sem rede. 09:22:29–09:24:55 (`B-*`) | **120 testes: 114 pass, 0 fail, 6 skip**, exit 0. **Antes**: HEAD do clone `df259ed…` (= esperado), árvore `88f3a4a4…`, `core.autocrlf` local `true` e efetivo `true`. **Conversão ativa**: `package.json` `i/lf w/crlf` com 34 CRLF. `cli.mjs` `i/lf w/lf attr/text eol=lf`, 4.257 bytes, 0 CR, 125 LF, primeira linha `b'#!/usr/bin/env node\n'`, modo `100755`. Status vazio antes e depois de copiar `node_modules`. **Depois de B**: `cli.mjs` com os mesmos 4.257 bytes, 0 CR e mesma primeira linha; **status vazio**. Clone removido depois de conferir caminho, tipo e HEAD (`B-clone-cleanup.txt`) |
| C | WSL `Ubuntu`, `oldboydev` uid 1000, `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc`, só com os meus scripts (0 CR). Cópia: `git -c core.autocrlf=false archive HEAD`, tar de **5.642.240 bytes**, sha256 `a961b6e7…2b60f73591`, `get-tar-commit-id` = `df259ed0…`. Árvore extraída `88f3a4a4…` = `HEAD^{tree}`, a mesma depois de copiar `node_modules` (ignorado). `cli.mjs` 755 (git `100755`), `#!/usr/bin/env node`, 0 CR. `node_modules` copiado sem rede (yaml 2.9.0, smol-toml 1.9.1). **Prefixo isolado**: `prefix/bin` = `node npm npx`, **sem `sh`**. O `node` é cópia byte a byte de `/usr/bin/nsolid` (sha256 `150946e4…bb6351`), v24.13.0, com `execPath` no prefixo; npm 11.6.2 em `prefix/lib/node_modules/npm`, e `npmCli()` aponta para ele. Execução com `env -i`, `HOME=<scratch>/home`, `LANG=C.UTF-8` e **`PATH=<scratch>/prefix/bin:<scratch>/tools`, sem `/usr/bin`**. `tools` só tem links a `/usr/bin/{sh (dash), git, python3 (3.12.3), id, grep, mkfifo}`, sem agentes, `node`, `npm`, `npx` ou `corepack`. 09:25:30–09:27:09 (`C-wsl-24.13.0-isolado.*`, `wsl-prepare.txt`) | **120 testes: 113 pass, 1 fail, 6 skip, exit 1** — falha na seção seguinte. Árvore `88f3a4a4…` igual antes e depois; `cli.mjs` 755 e 0 CR depois. `/home/oldboydev/.skill-me` e `.skill-me-authorization.json` ausentes antes e depois (só `test -e`); home do scratch vazio; 0 `skill-me i4 i25 *` e 0 `skill-me i4 t8 *` em `/tmp` antes e depois |
| D | `npm test` completo, Windows, Node 24.22.1, runner padrão (8). O script `v10/run-d-npm-test.sh` foi preparado para rodar em segundo plano com teto de 2 h | **NÃO INICIADO.** Pela regra “se alguma prova ou gate falhar, FAIL e pare sem repetir até verde”, parei depois de C. Não houve nenhum início parcial |

**Skips (6 por ambiente, todos de plataforma, com o motivo impresso pelo próprio teste)**:
- A e B: C45 POSIX, C5 POSIX, C6 e C42 POSIX (“sinais POSIX…”), C33 arranjo (“o npm do Windows roda o script pelo ComSpec…”) e C15 pty.
- C: C4 shim, C45 controle, C5 console, C42 console, C8 LOCALAPPDATA e C38 console.
- Todo caso pulado num ambiente rodou no outro.

**Durações-chave**, em segundos, na ordem A / B / C:
- T8-C15: 11,6 / 11,3 / 1,7.
- C46 (a, b, c): 3,3 / 3,2 / 0,4; 3,3 / 3,2 / 0,4; 3,4 / 3,3 / 1,0.
- C32 de processos reais: 8,1 / 6,9 / 2,3.
- C32 pelo launcher: 4,7 / 4,7 / 1,1.
- C32 diagnóstico: 3,1 / 3,1 / **0,2 (FAIL)**.
- C28 regressão: 28,2 / 28,3 / 26,1.
- C1: 1,8 / 1,6 / 0,4.

## A falha de C — `I25-C32 diagnóstico das invocações simultâneas` (verified at `df259ed`)

| Item | Situação |
| --- | --- |
| Asserção que falhou | `end.e2e.test.mjs:320`, `assert.equal(first, "eventos intercalados: B terminou antes")`. O valor obtido foi `"ENOENT: no such file or directory, open '/tmp/skill-me i4 i25 c32 diagnostico raiz ação-…/capturas ação/skill-me-privacy/captures/26c46f13…/state.json'"`, em 221 ms (`C-wsl-24.13.0-isolado.tap.txt:237-255`). As asserções `:321-326` não rodaram |
| O que o código mostra | O `catch` de `withOverlappingRuns` (`helpers/launch.mjs:197-207`) monta o diagnóstico nesta ordem: marcadores (`:198`), probes (`:199`), **capturas** (`:200`), depois grava as barreiras (`:201`) e espera as invocações (`:203-206`). As capturas são lidas por `launchCapturesOnDisk` (`:222-229`), que lista `captures/` e faz `readFileSync(<id>/state.json)` em cada nome (`:227`), sem tratar a ausência. Um diretório de captura listado sem `state.json` faz `:200` lançar. Com isso: (1) o erro original some, porque o lançado não carrega `cause` nem o JSON; (2) as barreiras dos agentes de fixture não são gravadas; (3) as invocações não são esperadas. Isso **contraria o acréscimo de C32** no checklist (`checklist:189`): “em qualquer falha, as barreiras … são liberadas, as duas invocações terminam, e o erro traz …”. É o mesmo tipo de defeito que o C46 evita com `inspected` |
| Origem plausível, **não medida** | `createCapture` cria a pasta (`store.mjs:390`) e a chave (`:391`) antes de publicar o `state.json` por `rename` (`:407`). Um `readdir` de `captures/` nessa janela vê a pasta sem `state.json`. B sai com 127 sem agente, antes de tocar o store, então ao detectar a saída de B a abertura de A podia estar nessa janela. É compatível, mas não registrei o instante, e o erro não traz o estado de A. **Não atribuo** a falha a `f734441`: `withOverlappingRuns` não muda desde `6732475` (`git log -L178,209`), o teste `:303-327` está igual à R9, e na R9 ele passou em C (1,1 s). Uma execução não mede taxa |
| Efeito colateral | Pela leitura do código, sem a barreira o agente de A desiste sozinho em 30 s (`fixtures/launch/fake-agent.mjs:104-108`, `process.exit(98)`), e o `runSkillMe` tem SIGKILL em 60 s (`helpers/launch.mjs:121, 132`). Não observei os processos; não listei nem encerrei processos. O `node --test` terminou e o script saiu |
| Alcance | É o apoio da prova, não o produto: os outros 6 testes de C32 passaram em C. O mesmo `catch` atende o C32 de processos reais e as três provas do C34 que usam `withOverlappingRuns`. Elas têm o mesmo risco de mascarar uma falha (leitura de código, não observado) |
| Repetição | **nenhuma**. Não repeti o teste, nem isolado nem no alvo, e não corrigi nada |

## Matriz por check (TAP de A, B e C; `per-check.txt`, `matrix.txt`)

Contagem dos nomes executados por prefixo (`I25-C<n> `, `T8-C15 `, `T8-C16 `), em pass/skip/fail. Nenhum check teve 0 testes.

| Check | A Win 24.22.1 | B Win 24.13.0 (clone `autocrlf=true`) | C WSL isolado 24.13.0 |
| --- | --- | --- | --- |
| C1–C3, C7, C9–C11, C13, C14, C18–C26, C29, C30, C35, C36 | 1p cada | 1p cada | 1p cada |
| C4 | 3p | 3p | 2p/1s |
| C5 | 1p/1s | 1p/1s | 1p/1s |
| C6 | 1s | 1s | 1p |
| C8 | 2p | 2p | 1p/1s |
| C12, C16, C28, C31, C40 | 2p cada | 2p cada | 2p cada |
| C15 | 1s | 1s | 1p |
| C17 | 4p (link omitido) | 4p (link omitido) | 4p (link executado) |
| **C32** | **7p** | **7p** | **6p/1F** |
| C33 | 1p/1s | 1p/1s | 2p (com o arranjo) |
| C34 | 4p | 4p | 4p |
| C27, C37, C39, C44 | 3p cada | 3p cada | 3p cada |
| C38 | 1p | 1p | 1s |
| C41 | 17p | 17p | 17p |
| C42 | 3p/1s | 3p/1s | 3p/1s |
| C43 | 12p | 12p | 12p |
| C45 | 2p/1s | 2p/1s | 2p/1s |
| **C46** | **3p** | **3p** | **3p** |
| T8-C15 / T8-C16 | 1p / 9p | 1p / 9p | 1p / 9p |

## Carried / reverified

| Item | Situação |
| --- | --- |
| Execução das provas C1–C46 | **verified at `df259ed`**: todas rodaram por inteiro em A, B e C. C32 falhou em C. O gate D não rodou |
| `command.cli`, `prepare.cli`, `session.e2e`, `agent.unit`, `docs.test`, `report.cli`, `hermes-harness.unit`, `hermes-plugin.native`, fixtures, `traces-probe.mjs`, `traces.mjs`, `observe.mjs`, `cli.mjs`, `privacy-canaries.mjs`, `privacy-store.mjs` e `scripts/test-integrations.mjs` | **0 linhas de diff em `dd89179..df259ed`**. O julgamento das asserções é **carried from R9 at `dd89179`** (que o trazia de R8/R7/R6/R4). Amostra relida no HEAD, toda conforme: `cmd:48, 49, 65, 77, 105, 228, 267, 342, 424, 456`; `prep:93, 189, 223, 238`; `sess:67, 111, 190, 230, 282`; `rep:159, 173, 213, 239`; `agent:132, 187`; `docs:82`; `harn:88, 263`; `nat:335` |
| `end.e2e` | **verified, citações atualizadas**: `:1-328` iguais à R9, exceto o import da `:16`. Os 55 linhas novas estão em `:329-383` (C32 pelo launcher em `:334-382`). Depois delas, deslocamento exato de **+55** (`diff` vazio entre `dd89179:329-855` e `HEAD:384-910`) |
| `store.unit` | **verified**: `:1-633` iguais à R9, exceto os imports `:2` e `:11`; os C32 novos em `:635-802` |
| `helpers/launch.mjs` | **verified**: +2 imports (`:5`, `:10`) e `markerPausedIo` (`:242-271`). As linhas antigas a partir da `:9` da R9 deslocam **+2**: `npmScriptEnv` `:67-74`, `runSkillMe` `:121-132`, `withOverlappingRuns` `:178-208` |
| `concurrency.cli` | **verified**: a rotina e o T8-C15 em `:99-277`, o C46 em `:279-385`, e o T8-C16 deslocado em **+245** (`diff` vazio entre `dd89179:142-fim` e `HEAD:387-fim`) |
| Swept existing, core vendorizado | `scripts/` e `.github/` sem diff na feature. O produto só muda em `store.mjs` desde `7ab5dbf` |
| Configuração | `roundOverrides["25"]` = `{profile: "light", maxRounds: 6, approval: …6434588924…}`. Perfis globais `light`, `ui` e `direct` com `maxRounds` 2. As demais overrides (3, 4, 5, 6, 7, 8 e 23) não mudaram: a feature só acrescenta o bloco `25`, sem diff em `dd89179..HEAD` |

## Checks

Abreviações: `cmd` = `tests/integrations/launch/command.cli.test.mjs`, `prep` = `prepare.cli`, `sess` = `session.e2e`, `store` = `launch/store.unit`, `end` = `end.e2e`, `rep` = `report.cli`, `agent` = `agent.unit`, `docs` = `docs.test`, `harn` = `tests/integrations/hermes-harness.unit.test.mjs`, `nat` = `hermes-plugin.native.test.mjs`, `conc` = `traces/concurrency.cli.test.mjs`, `hl` = `helpers/launch.mjs`.

Os nomes executados são os `I25-C<n> …`, `T8-C15 …` e `T8-C16 …` dos 120 do TAP, com o texto completo em `v10/matrix.txt`. “A/B/C” quer dizer que passou nos três ambientes. **Nenhum check tem confirmação no gate D nesta rodada.**

| Check | Nome no TAP (prefixo, contagem) | Evidência (arquivo:linha — valor) | Revisão | Result |
| --- | --- | --- | --- | --- |
| C1 | `I25-C1 npm link num prefixo temporário…` (1) A/B/C | `cmd:48` `private === true`; `cmd:49` `bin` = `{"skill-me": "src/integrations/launch/cli.mjs"}`; `cmd:65` `[0, SKILL_ME_HELP, ""]`; `cmd:77` `git status` igual (“npm link não altera o checkout”); B no clone `autocrlf=true`: `cli.mjs` com 0 CR e status vazio antes e depois | carried + medida em B | PASS |
| C2 | `I25-C2 argumentos literais…` (1) A/B/C | `cmd:96-98` `{status: 0, stdout, stderrFirst, argv: LITERAL_ARGS, stdin}` para os 3 agentes; `LITERAL_ARGS` `cmd:80` | carried | PASS |
| C3 | `I25-C3 código do agente…` (1) A/B/C | `cmd:105` `{0: 0, 7: 7}` | carried | PASS |
| C4 | `I25-C4 shim do npm…`, `entrada do shim…` ×2: A/B 3, C 2 | `cmd:117-120` `{status: 0, execPath: process.execPath, script: …/@openai/codex/bin/codex.js, sentinel: false}`; `cmd:130-133` `{status: 127, [launcher_requires_shell], sentinel: false}`; `agent:80-118` | carried | PASS |
| C5 | `I25-C5 Ctrl+C no console…` (A/B) e `sinais do terminal no POSIX` (C) | `cmd:228` `{status: 4, signal: null, signals: ["SIGINT","SIGQUIT","SIGHUP"]}`; `cmd:244-245` `CTRL_C_EVENT` `{…, signals: ["SIGINT"]}` | carried | PASS |
| C6 | `I25-C6 SIGTERM só ao launcher…` (C) | `cmd:267` `{status: 0, signal: null, signals: ["SIGTERM"]}` | carried | PASS |
| C7 | `I25-C7 agente ausente…` A/B/C | `prep:93-94` `{status: 127, stdout: "", code: true, asked: false}`; `prep:98` árvore igual | carried | PASS |
| C8 | `I25-C8 prévia…` ×2 (A/B 2, C 1) | `prep:122-126` texto exato até cada pergunta e árvores iguais; `prep:141-144` LOCALAPPDATA | carried | PASS |
| C9 | `I25-C9 confirmação aplica…` A/B/C | `prep:163-168` `observe.json` da #23; `prep:169` `plan.changes` `[]`; `prep:174` `manualSteps` | carried | PASS |
| C10 | `I25-C10 recusa…` A/B/C | `prep:189-191` `{exitCode: 3, code: [setup_declined], trees: before, started: false, root: false}` | carried | PASS |
| C11 | `I25-C11 caminho relativo…` A/B/C | `prep:200` `{exitCode: 2, [root_not_absolute], relative: false, config: false}` | carried | PASS |
| C12 | `I25-C12 sem terminal…` ×2 A/B/C | `prep:223` `{status: 3, line: "skill-me: preparação pendente [setup_required]; rode skill-me codex num terminal…", trees: before, started: false}`; `prep:387-388` | carried | PASS |
| C13 | `I25-C13 preparo concluído…` A/B/C | `prep:238` `{exitCode: 0, asked: 0, preview: false, config: <SHA-256>, settings: <SHA-256>, started: 1}` | carried | PASS |
| C14 | `I25-C14 falha do preparo…` A/B/C | `prep:250` `observe_on` 4; `prep:266, 276, 290` | carried | PASS |
| C15 | `I25-C15 terminal real (pty)…` (C) | `prep:398-403`; `prep:408` `{status: 3, declined: true, trees: before}` | carried | PASS |
| C16 | `I25-C16 …` ×2 A/B/C | `sess:67` `{origin: "launch", segment: 1, state: "active", content: true, retentionDays: 7, limits: {maxEvents: 500, maxBytes: 8388608}, launchedAt}`; `sess:61, 69`; `agent:160-165` | carried | PASS |
| C17 | `I25-C17 …` ×4 A/B/C (link executado só em C) | `store:79` `["launch", invocation, 1, "2026-10-26T10:00:00.000Z"]`; `store:54, 110, 156`; `sess:300-301` | carried | PASS |
| C18 | `I25-C18 execução indisponível…` A/B/C | `sess:111` `{status, stderr: "skill-me: não foi possível abrir a execução [<código>]\n", started: false, waited: true}`; `sess:124` | carried | PASS |
| C19 | `I25-C19 eventos na captura da execução…` A/B/C | `sess:147, 151, 152-160`; `sess:161` `[0, 0]`; `sess:165-167` | carried | PASS |
| C20 | `I25-C20 par inválido…` A/B/C | `sess:190-192` `{bound: false, code: "binding_invalid", entries: 1, committed: 0, persisted: 0, lost: 1}` | carried | PASS |
| C21 | `I25-C21 autorização global intacta…` A/B/C | `sess:208-211` bytes iguais com off e on | carried | PASS |
| C22 | `I25-C22 limite de eventos…` A/B/C | `sess:230` `[1, "stopped", 500, 500, {}]`; `sess:236, 240-245` | carried | PASS |
| C23 | `I25-C23 limite de 8 MiB…` A/B/C | `sess:282` `["active", MAX_BYTES, {}, 1]`; `sess:289, 291` | carried | PASS |
| C24 | `I25-C24 captura corrente encerrada à mão…` A/B/C | `store:168` `[opened.capture, "stopped", 1]`; `store:169` | carried | PASS |
| C25 | `I25-C25 encerramento e resumo…` A/B/C | `end:72-79` capturas `stopped`, `endedAt` ISO, ponteiro ausente; `end:80-89` stderr exato | linhas iguais | PASS |
| C26 | `I25-C26 nada gravado…` A/B/C | `end:101-109` `eventos gravados: 0.` e a dica com `manualSteps[0]` | linhas iguais | PASS |
| C27 | `I25-C27 …` ×3 A/B/C | `end:120` `{launch: true, code: "launch_ended", entries: 1, committed: 0, persisted: 0, lost: 1}`; `store:222-260` | linhas iguais | PASS |
| C28 | `I25-C28 entregas Hermes em voo…` e `… primeira entrega perdida…` A/B/C | `end:148-149` sinal nulo e saída existente; `end:157-161` `{started: true, delivered: true, enqueued: 3, sent: 3, queueFull: 0, failed: 0}`; `end:163-168` `persisted` 3, `stopped`, `eventos gravados: 3.`; regressão `end:179-189`; `end:194` `["EIO"]`; `end:195` um `unlink`; fixture 25 s + 25 s (`hermes-plugin-session.py:25-26`) sob o supervisor de 60 s (`hl:121, 132`) | linhas iguais (fixture sem diff) | PASS |
| C29 | `I25-C29 término por sinal…` A/B/C | `cmd:278, 295, 300` | carried | PASS |
| C30 | `I25-C30 falha de início…` A/B/C | `cmd:342` `{status: 127/126, startCode: true, captures: [[1, "stopped", 0]]}` | carried | PASS |
| C31 | `I25-C31 …` ×2 A/B/C | `end:205-215` `[lock_present]`, `continua active`, `privacy stop`, `continua aberta`, `["active", true]`; `end:244-258` `[io_failure]`, `já não recebe registros`, `launch_ended` | linhas iguais | PASS |
| **C32** | `I25-C32 …` ×7. A/B: 7p. **C: 6p e 1F** (`diagnóstico das invocações simultâneas`) | **Processos reais** (iguais à R9): `end:280` A sai com 0; `end:283` IDs diferentes; `end:286` `["stopped", "active"]`; `end:291` B sai com 0; `end:293-294` `a-1, a-2` e `b-1, b-2, b-3` com o pseudônimo da chave de cada captura; `end:295` chaves próprias; `end:296` `[1, 1]`. **Diagnóstico**: `end:320` `"eventos intercalados: B terminou antes"` — **vermelho em C** (seção “A falha de C”); `end:322-326`; apoio `hl:178-208`. **Primeira criação (novos, verdes em A/B/C)**: (a) `store:715` `lock_present`; `store:716` `[[".lock", n], ["<temporário do marcador>", 0]]`; `store:717` pasta igual; `store:720` com `assertTwoOpenings` (`store:685-686` IDs diferentes; `:690-693` `[id, "launch", 1, "active", {maxEvents: 500, maxBytes: 8388608}, ponteiro]`; `:696` chaves diferentes; `:697` `store.json` = `'{"skillMePrivacyStore":1}'`; `:698` sem temporário; `:701-702` `stopped` e ponteiros fora). (b) `store:731` pasta vazia vista; `store:735` B abre; `store:736` B não regravou `store.json*`. (c) `store:751-752`. (d) `store:779-783` 4× `store_invalid`, 2× `lock_present`, árvore byte a byte igual, escritas `[]` ou só `[".lock"]`; `store:789-790` `link_refused`; `store:793-794` `root_changed`, sem store; `store:799-801` pasta vazia adotada com marcador exato e só `captures`, `launches`, `store.json`. (e) `end:336` raiz sem store; `end:366-368` B encontrou o lock (`refusedLocks > 0`) sem terminar; `end:371` exit 0 nos dois; `end:374` `[[], "stopped", 1]`; `end:375` pseudônimo da chave própria; `end:376` `capturas: 1; eventos gravados: 1.`; `end:377` sem ponteiro; `end:380` invocações diferentes; `end:381` marcador exato | **verified** | **FAIL** (C) |
| C33 | `I25-C33 on e off…` (A/B/C) e `… arranjo do npm run (POSIX)` (C) | `end:395` `npmScriptEnv`; `end:397` `[0, "on"]`; `end:398` `active`; `end:402` `[0, "off", []]`; `end:403` `active`; `end:407` 3× `LAUNCHED(1)`; `end:412` nenhuma automática. Arranjo: `end:431-432` `≠ 0` e `/spawn sh ENOENT/`; `end:435-437` `node`/`sh`; `end:439` `[0, "ok", "off"]` | atualizado (+55) | PASS |
| C34 | `I25-C34 …` ×4 A/B/C | `rep:82` texto; `rep:90-96`; `rep:145, 155` precondições; `rep:159` `[newInv, true]`; `rep:173` escolha; `rep:181`; recuo `rep:208-213` `[firstInv, true]`; `rep:237` `--latest`; `rep:239` `[0, 1, [automatic.id]]`; regra do produto intacta (`latestLaunch` por `launchedAt`, `invocation`; `store.mjs` só mudou na criação) | carried | PASS |
| C35 | `I25-C35 report sem execução…` A/B/C | `rep:252-259` `[3, {"schemaVersion":1,"command":"report","status":"error","error":{"code":"not_configured"}}, ""]` e `no_launch_capture` | carried | PASS |
| C36 | `I25-C36 ajuda…` A/B/C | `cmd:350` `[0, SKILL_ME_HELP, ""]`; `cmd:354` `[2, "", SKILL_ME_HELP]`; `cmd:356-368` | carried | PASS |
| C37 | `I25-C37 documentação…` ×3 A/B/C | `docs:57, 60-62`; `docs:82` os 9 limites (`docs:44-54`); `docs:88-89, 93` | carried | PASS |
| C38 | `I25-C38 console real do Windows…` (A/B) | `prep:355` `["done", 0]`; `prep:361, 363, 365` | carried | PASS |
| C39 | `I25-C39 …` ×3 A/B/C | `harn:88` `["concluded", 0, 3]`; `harn:100-102, 186-188` | carried | PASS |
| C40 | `I25-C40 …` ×2 A/B/C (o nativo só roda no gate D) | `harn:196-225` `[2000, "timeout"]`, `[5000, "timeout"]`. O nativo `nat:335` `{capture: "concluded", …, stall: "timeout"}` **não foi executado nesta rodada** (D parado) | carried | PASS (unidade); nativo não reexecutado |
| C41 | `I25-C41 …` ×17 A/B/C | `store:327-523` (iguais à R9); `end:456, 473, 477-489, 519, 539-557, 584-594, 619-630, 660-667, 674-690` | `end` atualizado (+55) | PASS |
| C42 | `I25-C42 …` A/B: 3p/1s; C: 3p/1s | `agent:187-236`; `cmd:424` POSIX `{status: null, signal, started: false, …}`; `cmd:456` Windows `status: 130` | carried | PASS |
| C43 | `I25-C43 …` ×12 A/B/C | `store:560-632`; `end:746-751, 761-769, 777-781, 802-805, 815-821, 829-840, 862, 882-892, 904-909`; linhas literais `end:700-707, 845-852` | `end` atualizado (+55) | PASS |
| C44 | `I25-C44 …` ×3 A/B/C (nativo I4-C22 só no D) | `harn:263-271, 281-289` `[1000, "timeout"]`, `[5000, "timeout"]`, `harn:300-304`. O nativo `nat:251-256` não foi reexecutado | carried | PASS (unidade); nativo não reexecutado |
| C45 | `I25-C45 …` A/B: resolução + controle Windows; C: resolução + POSIX real | `agent:132-146, 154`; `cmd:166-186`; `cmd:198-201` | carried | PASS |
| **C46** | `T8-C15 concurrent producers…` (1) e `I25-C46 diagnóstico do T8-C15…` ×3, A/B/C | seção “C46: rigor”. Saudável `conc:236-237, 248-251, 259, 263-264, 272-276`; (a) `conc:315-335`; (b) `conc:342-361`; (c) `conc:366-384`; base comum `conc:298-302` e `:304-309` | **verified** | **PASS** (A/B/C; gate não confirmado) |

**Checks com prova verde em todos os ambientes aplicáveis: 45/46.** C32 vermelho em C. Gate D não executado. **PASS exige todos os checks e todos os gates verdes; não é o caso.**

## AC → checks

- **AC1**: C1–C6, C42, C45 (verdes).
- **AC2**: C7–C15, C26, C38 (verdes).
- **AC3**: C16–C24, C41 (verdes).
- **AC4**: C25, C27–C35, C41, C43. **C32 vermelho em C**.
- **AC5**: C36, C37 (verdes).
- **AC6**: C39, C40, C44. A unidade está verde nos três; os nativos (12) não rodaram nesta rodada porque D foi parado.
- **AC7**: C46 e T8-C15, verdes nos três, **sem a confirmação do gate**.

## Processo desta rodada (o que os meus comandos mostram)

- **Executado**:
  - git: `rev-parse`, `status`, `diff`, `log`, `show`, `ls-files --eol/-s`, `config --show-origin/--get` (leitura), `branch --show-current`, `archive`, `get-tar-commit-id`;
  - `clone --no-hardlinks --config core.autocrlf=true` do repositório local, com a configuração só no clone;
  - versões de node, npm e python;
  - `node -e`/`-p` só de leitura (configuração de rodadas, `npmCli()`);
  - `python -I` para contar bytes e CR;
  - `wsl.exe -l -q` e `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc` só com os meus scripts;
  - os alvos versionados A, B e C;
  - os meus scripts (`temp-baseline.mjs`, `run-win-target.sh`, `b-clone-prepare.sh`, `b-clone-after.sh`, `wsl-prepare.sh`, `wsl-run.sh`, `wsl-cleanup.sh`, `matrix.mjs`, `per-check.mjs`, `cleanup-temp.mjs`) e a remoção do clone por Node, com caminho, tipo e HEAD conferidos;
  - esperas por arquivo de término (`timeout … until grep`).
- **Não executado**:
  - o gate D (parado pela regra; `run-d-npm-test.sh` preparado e nunca iniciado);
  - nenhuma repetição de prova;
  - nenhum `codex`, `claude`, `hermes`, `gemini` ou outro agente real, nem `--version`/`--help`, `execvp` ou `spawn` desses nomes fora dos testes versionados. Os agentes do alvo são de fixture (`launchEnv`, `hl:89-97`);
  - nenhuma sonda nova, rede, credencial, perfil pessoal ou banco;
  - nenhuma alteração de host, relógio, runtime ou Git global;
  - nenhuma listagem ou encerramento de processos;
  - os gates globais antigos do WSL com `Date.now()`;
  - nenhuma mutação ou fault injection minha.
- **R5, R8 e R9 preservados, não repetidos**:
  - o incidente da R5 (até 5 inícios do Codex real numa sonda de PATH; 12 mtimes sem linha de base de conteúdo) continua registrado em `ffc5937`;
  - os dois inícios de D na R8 e o FAIL da R9 em `4e66de2` ficam como estão;
  - não editei `verifier-round1/` a `verifier-round9/`, só li os scripts da R9 como referência de método;
  - os arquivos de auditoria do orquestrador em `verifier-round10/` ficaram sem leitura nem alteração.

## Falhas, limitações e o que não está provado

- **C32 em C**: a falha da prova de diagnóstico (seção acima). A origem do diretório de captura sem `state.json` é plausível, mas não foi medida.
- **Gate D não executado**: nesta rodada, não confirmei por execução própria o `npm test` completo, os 12 nativos do Hermes, o T8-C15 e os C46 sob o teto 8, nem as recusas antigas do `privacy start` (I5-C32s, I5-C49, I5-S-bounded) e as provas do `on` com a criação do store mudada. O relato do autor (`build.md:1177-1182`: 1.002 testes, 982 pass, 0 fail, 20 skip em `f734441`) **não é prova minha**.
- **Causas desconhecidas e não eliminadas**:
  - a falha do T8-C15 da R9;
  - a perda do primeiro registro do C28 (R7);
  - o timeout de C32 na CI 40443538957. A corrida `store_invalid` da primeira criação foi demonstrada e corrigida pelo autor, mas não cobre esse timeout, que não deixou saídas para uma atribuição exclusiva;
  - o C34 do WSL em `abae80a`, sem causa única demonstrada.
  Uma passada verde por ambiente não mede taxa, e a instrumentação do T8-C15 não elimina perdas.
- **Evidência do autor, não repetida por mim**:
  - o RED antigo e as duas mutações do C46 (`build.md:1065-1082`);
  - RED 5/5, GREEN 5/5 e as três mutações do store (`:1149-1161`);
  - a regressão de 179 testes de privacidade/observe (`:1162-1164`);
  - o RED/GREEN do C1 em clones `true`/`false`; a matriz 3+3 do C32; a mutação por `createdAt` do C34; o RED do C28.
- **C46**: a sobreposição dos produtores vem da construção e não é afirmada (igual à base). Os controles dependem da ordem da n-ésima operação injetada. A pré-carga pode alterar o tempo.
- **Continuam das rodadas anteriores**:
  - a variante “lock ausente” de C43 sem teste nomeado;
  - as janelas do plugin em C44;
  - o ramo com várias capturas `active` na falha do encerramento, sem prova;
  - recusa e EOF num console real do Windows;
  - os nativos do Hermes pulados na CI;
  - C23 sem asserção de tempo;
  - a variante link do C17 não executada no Windows desta máquina (executada em C);
  - macOS e o runner da CI não executados;
  - o uso real sem sessão de agente (`Unresolved` 2, `blocks go-live`).

## Findings (em ordem)

1. **Bloqueante — C32 vermelho em C** (`I25-C32 diagnóstico das invocações simultâneas`, `end.e2e.test.mjs:320`, exit 1 no alvo WSL isolado). O `catch` de `withOverlappingRuns` (`helpers/launch.mjs:197-207`) lê as capturas (`:200` → `:227`) antes de liberar as barreiras (`:201`) e de esperar as invocações (`:203-206`). Um `ENOENT` nessa leitura substituiu `eventos intercalados: B terminou antes`, sem o JSON de diagnóstico, contra o acréscimo de C32 do checklist (`:189`). É defeito do apoio da prova, não do produto. Não repeti nem corrigi. A decisão sobre correção e nova rodada é do orquestrador e do proprietário.
2. **Gate D não executado** pela regra de parada. O gate completo, os nativos e as recusas antigas do store continuam sem execução minha nesta rodada.
3. **C46 está bem construído e verde em A, B e C**:
   - a mesma rotina do T8-C15;
   - a asserção saudável inalterada e vermelha nos injetados;
   - testemunhas exatas `rename segmento.tmp EIO (antes do commit)` e `unlink lock EIO (depois do commit)`;
   - o export distingue antes e depois do commit;
   - `indisponível [lock_present]` sem contagem inventada;
   - não vazamento afirmado;
   - uma inspeção que falha não mascara a falha original.
4. **Correção do store (`f734441`) coerente com o Landing e verde em A, B e C**: publicação por `rename`, decisão sob o lock, recusas preservadas, sem retry novo, prazo, teto ou serialização.
5. Pendências fora deste Verifier: a revisão formal 6 (orquestrador); a CI real depois do push; o uso real (`Unresolved` 2).

## Gate

| Gate | Resultado |
| --- | --- |
| A — alvo de 10 arquivos, Windows, Node 24.22.1, concorrência 4 | 120: 114 pass, 0 fail, 6 skip — exit 0 |
| B — o mesmo, Windows, Node 24.13.0 oficial, npm 11.6.2, clone novo com `core.autocrlf=true` | 120: 114 pass, 0 fail, 6 skip — exit 0; `cli.mjs` em LF e status vazio antes e depois |
| C — o mesmo, WSL Ubuntu, uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, PATH sem `/usr/bin`, cópia exata | **120: 113 pass, 1 fail (`I25-C32 diagnóstico…`), 6 skip — exit 1** |
| D — `npm test`, Windows, Node 24.22.1, runner padrão (8) | **não executado** (parado depois do FAIL em C) |

## Limpeza

- **`%TEMP%`**: gravei a linha de base antes de A (`temp-baseline.json`: 60.322 nomes, 0 `skill-me i4 i25 *`, 30.081 `skill-me *`). Primeiro rodei uma simulação (`cleanup-temp-dryrun.json`). Depois, `cleanup-temp.mjs` (Node 24.22.1) removeu só diretórios que atendiam a todas estas condições:
  - fora da linha de base;
  - filho direto do `%TEMP%`;
  - prefixo `skill-me i4 ` ou `skill-me i5 `;
  - não link;
  - mtime em 12:19:15Z–12:26:00Z.

  Foram **377 removidos e 0 recusas** (`cleanup-temp.json`): 361 `skill-me i4 i25 *`, 14 `skill-me i4 t8 *`, 1 `skill-me i4 ausente provas *` e 1 `skill-me i4 secoes provas *`. Os dois últimos vêm de `report.cli` (`twoSegments`), criados durante B. São os que o `rmSync` do Node 24.13.0 não apaga, porque os caminhos têm “ação”. Depois: 0 `skill-me i4 i25 *` e de novo 30.081 `skill-me *`. Os 6 nomes novos fora do filtro (`*.tmp`, `playwright_*`) não são meus e ficaram.
- **Clone de B**: removido depois de conferir que o caminho absoluto está dentro de `v10/`, que é diretório e não link, e que o HEAD é `df259ed` (`B-clone-cleanup.txt`).
- **WSL**: `wsl-cleanup.sh` removeu o scratch `/tmp/skillme-verifier-r10.s9X1bf` depois de conferir o padrão absoluto e o tipo. Restaram 0 scratches `r10`, e há 0 `skill-me i4 i25 *` e 0 `skill-me i4 t8 *` em `/tmp` (`C-wsl-cleanup.txt`).
- **Mantidos em `v10/`** (pasta ignorada): os logs de A, B e C, `matrix.txt`, `per-check.txt`, o tar do HEAD, a linha de base e os relatórios de limpeza, e os meus scripts (inclusive o `run-d-npm-test.sh` nunca executado).
- **Estado final**: configuração, estado de review e prefixo npm real não foram tocados. O HEAD continua `df259ed`. O `git status` estava vazio antes de gravar este arquivo; depois, só ele aparece modificado.
