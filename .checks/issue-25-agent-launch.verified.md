# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25

**Verdict**: **PASS**. Os 50 checks (C1–C50, 9 ACs) têm prova verde em todos os ambientes aplicáveis (C48 por prova estrutural autorizada). Os quatro gates passaram, cada um numa única execução no HEAD `631e281`:
- **A**: 147 testes, 141 pass, 0 fail, 6 skip.
- **B**: 147 testes, 141 pass, 0 fail, 6 skip.
- **C**: 147 testes, 141 pass, 0 fail, 6 skip.
- **D** (`npm test` completo): 1.019 testes, 999 pass, 0 fail, 20 skip, exit 0, com os 12 nativos do Hermes.

O AC9 está coberto: o job manual `lock_diagnostics` existe só na forma do Landing (C49), o script de medição tem os valores, guardas e formatos do Landing provados por 12 testes C50, e os jobs regulares continuam idênticos a `d0d5a7f` fora o `timeout-minutes` do `verify` (C48 com a exceção). **Nenhum job do Actions foi medido ou executado aqui**: a medição A1/B/A2 no runner é a execução manual do orquestrador, depois de PASS, `ready` e publicação. A causa dos `lock_present` (CI 40636157287) e dos `delivery_timeout` (CI 40514323240) **continua desconhecida**; nada desta rodada a corrige ou a atribui.
**Checks**: **50/50**. C1–C47 e C49–C50 têm testes nomeados executados; nenhum ficou sem teste. C48 é provado pela leitura estrutural autorizada do YAML e pelo `governance-C1 C3`/`governance-C49`, que rodaram em A/B/C/D; a expressão do GitHub não foi avaliada aqui. Os 6 skips de cada alvo A/B/C são de plataforma e cada um rodou no outro sistema (A/B ↔ C). Dos 20 skips de D, só os 6 I25 POSIX rodaram em outro ambiente (C); os 7 do doctor (POSIX/FIFO) e os 7 I4/T8 (POSIX/macOS) **não foram reexecutados** em nenhum ambiente desta rodada.
**Profile**: light. Sem fault injection, `Coverage` ou `Test policy` próprios; sem fonte vinculante de UI. Rodei só os controles versionados e, para C48, a leitura estrutural autorizada. As mutações (7 do script, 5 do workflow), o RED e o controle do CLI local são do autor e não foram repetidos.
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..631e2819fc1137b83eaafd0e63a6c73fd6246ea6`, a feature inteira: 89 commits, árvore `94224834…`. Desde a R12 (`0f540a0`, relatório em `9244eea`) mudaram:
- **código**: `scripts/ci-lock-latency.mjs` (+415, novo), `scripts/ci-lock-latency.test.mjs` (+239, novo), `scripts/governance-ci.test.mjs` (+53: `lock_diagnostics` no conjunto de jobs do C1 C3 e o teste novo `governance-C49`), `package.json` (alias `test:governance`, 1 linha);
- **workflow**: `.github/workflows/governance.yml`, +19 linhas (o job manual), 0 removidas;
- **configuração**: `code-review.config.json`, override da #25 de 7 para 8;
- **documentos** (só acréscimos: 0 linhas removidas em task, checklist e build): task, checklist, build, handoff da CI 40636157287, proposta da medição e o relatório da R12.

`src/` tem 0 diff desde `f734441`; `tests/` tem 0 diff desde `0f540a0`; `scripts/code-review/` (core), `scripts/test-integrations.mjs`, `ci-change-filter.mjs`, `ci-result.mjs` e `.gitattributes` têm 0 diff na janela da R13 (o core e o runner, 0 na feature inteira).
**Round**: **13** (light), pela autorização humana “Pode fazer quantas precisar”, registrada para esta rodada em [issuecomment-6467998235](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467998235), com o escopo novo aprovado em [issuecomment-6467154706](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706). As 12 verificações e as 7 revisões anteriores ficam preservadas, inclusive o PASS da R12 (`9244eea`). A revisão formal 8 é do orquestrador, depois deste relatório. Não alterei limite, estado nem histórico.
**Verifier**: subagente novo e independente (Claude Opus 5.5). Não sou o autor nem um Verifier anterior, e não herdei sessão. Produto, testes, scripts, workflow, planos, checklist, configuração e estado ficaram só para leitura. Escrevi apenas este arquivo e logs/scripts em `.checks/code-review/issue-25/verifier-round13/v13/` (ignorada).

Data: 28/10/2026, provas das 08:48 às 09:07 (-03). HEAD `631e281` do início ao fim. `git status --porcelain=v1 -uall` vazio antes de A (`v13/git-status-before.txt`), antes e depois de A, B (no clone), D, e no fim, antes de gravar este arquivo.

## Fontes lidas nesta rodada

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md`, `tlc-implement/references/verify.md` | inteiros; perfil `light` (`AGENTS.md:138`) |
| `.tasks/issue-25-agent-launch.md` | inteiro (632 linhas): critérios 1–42, a exceção datada ao critério 40 e a seção “Medição comparativa do lock na CI Windows (AC9)” (`:395-426`); Sources com 6467154706 (`:560`) |
| `.checks/issue-25-agent-launch.md` | inteiro (795 linhas): Landing, inclusive “Exceção ao C48” (`:81`) e “Medição comparativa do lock na CI Windows” (`:82`, com o ajuste de `39278dd`); C1–C50; S12 com C49–C50 (`:437-493`); Swept e Handoff |
| `.checks/issue-25-agent-launch.build.md` | 1.532 linhas: desde `0f540a0` só ganhou acréscimos (139 linhas, 0 removidas), que li inteiros (`:1394-1532`), mais o início (`:1-147`); o resto é o texto que a R12 leu inteiro. É **relato do autor, não prova minha** |
| `.checks/issue-25-agent-launch.ci-runner-measure-proposal.md`, `…ci40636157287-handoff.md`, `…ci40514323240-handoff.md` | inteiros (61, 171 e 134 linhas) |
| `.checks/code-review/issue-25/context-ci28-verifier13-final.json` | **24 comentários**, **9 ACs** (9 linhas `- [ ]` no corpo). O AC9 é o da medição comparativa; o 23º comentário aprova a medição (6467154706) e o 24º registra a 13ª verificação e a 8ª formal (6467998235) |
| `.checks/issue-25-agent-launch.verified.md` da R12 | inteiro, antes de substituí-lo |
| Diffs | inteiros: `0f540a0..HEAD` de `.github/`, `package.json`, `code-review.config.json` e `scripts/governance-ci.test.mjs`; `scripts/ci-lock-latency.mjs` e `.test.mjs` lidos inteiros; `d0d5a7f..HEAD` e `63621c6..HEAD` de `.github/`; `63621c6..HEAD` de `package.json`, `.gitattributes` e `code-review.config.json` |
| `src/integrations/privacy/fs.mjs:1-45`, `store.mjs:185-220` | as APIs públicas que o script reusa (`createStoreIo`, `holdLockFile`) |
| `builder-ci-lock-latency/workflow-regular.mjs` | lido antes de executá-lo (C48) |
| Auditoria externa do orquestrador | **não lida**. Em `verifier-round13/` só vi os nomes `profile-before.json` e `profile-metadata-snapshot.py`; não havia comparação final quando listei. Não li perfil pessoal |

## AC9 — C49: job manual `lock_diagnostics` (verified at `631e281`)

Abreviação: `gov` = `scripts/governance-ci.test.mjs`.

| Exigência (C49 / Landing `:82`) | Asserção decisiva (valor literal) |
| --- | --- |
| Chaves do job exatamente `if, name, permissions, runs-on, steps, timeout-minutes`: sem `needs`, `continue-on-error`, `strategy` ou outra | `gov:317-324` `deepEqual(Object.keys(job).sort(), [...])` |
| Nome e gatilho | `gov:325` `"Diagnosticar lock Windows (manual)"`; `gov:326` `"github.event_name == 'workflow_dispatch'"` |
| Runner, teto e permissão | `gov:327` `"windows-latest"`; `gov:328` `10`; `gov:329` `{contents: "read"}` |
| Mesmas ações pinadas do `verify`, `persist-credentials: false`, Node 24.13.0 e **sem cache** | `gov:332-335` checkout = `{uses: verify.steps[0].uses, with: {"persist-credentials": false}}`; `gov:336-339` setup = `{uses: verify.steps[1].uses, with: {"node-version": "24.13.0"}}` (igualdade exata: `cache` faria falhar) |
| Só os dois comandos, sem `continue-on-error` nos passos | `gov:340-343` `[{run: "npm ci --ignore-scripts"}, {run: "node scripts/ci-lock-latency.mjs"}]` (igualdade exata dos objetos) |
| Fora do agregado e de qualquer dependência; nada tolera falha | `gov:345` `ci.needs` = `["changes", "verify"]`; `gov:346-351` nenhum job tem `lock_diagnostics` em `needs`, nenhum job nem passo tem `continue-on-error` |
| Alias e pacote privado | `gov:354-357` `test:governance` = `"node --test scripts/governance-ci.test.mjs scripts/ci-lock-latency.test.mjs"`; `gov:358` `private === true` |
| Conjunto de jobs e asserções antigas | `gov:294-299` `["changes", "ci", "lock_diagnostics", "verify"]` (única mudança no `governance-C1 C3`, com o comentário `:292-293`); `gov:244-291` gatilhos, permissões, detector, matriz, `runs-on`, os cinco `run` do `verify` e o agregado iguais; `gov:300-308` hash de 40 hex e ausência de IA/publicação valem para todos os jobs, inclusive o novo |

As asserções são literais e de igualdade exata, então distinguem o inválido do válido por construção: acrescentar `needs`, `continue-on-error`, `cache` ou outro passo, tirar o `if` ou mudar o teto falha uma delas. As cinco mutações do workflow que mostram isso são do autor (`build.md:1472-1479`); não as repeti. Executei o caso válido: `governance-C49` passou em A, B, C e D. Um `pull_request`/`push` pula o job pelo `if`; esse skip não substitui nenhum check regular (`ci.needs` intacto).

## AC9 — C48 com a exceção: leitura estrutural autorizada (verified at `631e281`)

Prova **estrutural** autorizada pelo checklist (`checklist:428`, `:431-435`; Landing `:81`), não teste espelho e não avaliação do GitHub.
- **Diff textual**: `git diff d0d5a7f HEAD -- .github/` = 20 inserções, 1 remoção: `governance.yml:43` (`timeout-minutes: 10` → `${{ matrix.os == 'windows-latest' && 20 || 10 }}`, a linha do AC8) e o bloco `@@ -76,0 +77,19 @@` (comentário e job `lock_diagnostics`, `:78-95`). Desde a R12 (`0f540a0..HEAD`): 19 inserções, 0 remoções.
- **Leitura estrutural própria** (`v13/c48-structural.mjs`, com o `yaml` do repositório, sobre os blobs extraídos por `git show` de HEAD, `d0d5a7f` e `63621c6`; `v13/C48-structural.txt`):
  - documento **inteiro** do HEAD, sem `jobs.lock_diagnostics` e sem `jobs.verify.timeout-minutes`, `deepStrictEqual` ao de `d0d5a7f` sem `verify.timeout-minutes`: **true**; idem contra a base: **true**; `d0d5a7f` idêntico à base: true. Isso cobre topo (`name`, `on`, `permissions`, `concurrency`) e qualquer outra chave;
  - topo e cada job regular (`changes`, `verify`, `ci`) iguais a `d0d5a7f`: true em cada um;
  - jobs: `changes, verify, ci, lock_diagnostics`; conjunto exato = `changes, ci, lock_diagnostics, verify`: true;
  - tetos: `changes` 5, `verify` a expressão aprovada (antes 10), `ci` 5, `lock_diagnostics` 10;
  - `verify`: matriz `["ubuntu-22.04","windows-latest","macos-14"]`, `runs-on: ${{ matrix.os }}`, `needs: changes`, mesmos sete passos; `ci.needs` `["changes","verify"]`, `if: always()`;
  - hashes do job novo iguais aos do `verify`; nenhum job depende dele; nenhum `continue-on-error`.
- **Apoio do autor** (`builder-ci-lock-latency/workflow-regular.mjs`, lido antes): os mesmos resultados (`v13/C48-author-helper.txt`). Ele compara só as quatro chaves de topo; a minha leitura compara o documento inteiro.
- **Provas versionadas**: `governance-C1 C3` e `governance-C49` passaram em A/B/C/D.
- **Limite**: a expressão `${{ … }}` e o `if` do job manual não foram avaliados pelo GitHub aqui. Nenhum job do Actions rodou. A cópia de trabalho do workflow tem CRLF pelo `core.autocrlf=true` do sistema (blob LF; status limpo); a leitura usou os blobs.

## AC9 — C50: `scripts/ci-lock-latency.mjs` (verified at `631e281`)

Abreviações: `lat` = `scripts/ci-lock-latency.mjs`; `t` = `scripts/ci-lock-latency.test.mjs`. Os 12 testes têm nome iniciado por `C50 ` e passaram em A, B, C e D.

**Reúso e fronteiras (leitura).** `lat:9-10` importa `createStoreIo` (`privacy/fs.mjs:11`) e `holdLockFile`/`StoreError` (`privacy/store.mjs:196`, `:23`), públicos; o ciclo é `holdLockFile({io, lockPath, lostCode: "lock_lost"}, fn)` (`lat:138`) sobre `createStoreIo()` real (`lat:181`). Nenhum algoritmo de lock copiado: o script não cria, confere nem remove `.lock` por conta própria; só envolve `unlink` (`lat:124-129`) e instrumenta `open` exclusivo/`writeFile`/`close` do `.lock` em `node:fs/promises` **só no processo do produtor** (`lat:153-176`, chamado em `lat:180`), igual em todas as fases. Nenhuma importação de `tests/` nem dependência nova.

| C50 | Asserção decisiva (valor literal) | Leitura do código |
| --- | --- | --- |
| (a) percentis e faixas | `t:48` `summarize([700, 10, 650, 599.999, 20, 649.999, 600])` = `{amostras: 7, p50: 600, p99: 700, max: 700, ">=600": 4, ">=650": 2}`; `t:49-53` `1…100` = `{amostras: 100, p50: 50, p99: 99, max: 100, ">=600": 0, ">=650": 0}` (zero medido com amostras); `t:54` 3 casas e contagem sobre o valor sem arredondar; `t:55` `BANDS_MS` = `[600, 650]`; `t:59` `summarize([])` = `{amostras: 0, indisponivel: "sem amostras"}` | `lat:36-47`: posição ⌈p·n/100⌉, valor observado; faixas com `>=` sobre o valor cru |
| (a) sem amostras numa fase só de erros | `t:62` `ciclos` `{previstos: 2, concluidos: 2, comErro: 2, incompletos: 0}`; `t:63` `tomada`, `liberacao` e as quatro operações = `indisponivel`; `t:64` `erros` `{lockPresent: 0, lockLost: 0, es: {EIO: 2}}` | `lat:309-322` |
| (b) caminhos | `t:68` `samePlace("C:\\Temp", "c:\\temp\\", "win32")` true; `t:69` volumes distintos false; `t:70` `/tmp` = `/tmp/`; `t:71` `/tmp` ≠ `/TMP` no POSIX; `t:81-85` `RUNNER_TEMP` ausente, vazio, inexistente (`ilegível [ENOENT]`), arquivo (`não é pasta`) e o mesmo destino → `comparacao: "não aplicável: <motivo>"`, `runner: {indisponivel: <motivo>}` e uma só fase `["A", "padrao", "C:\\Temp"]`; `t:86-94` `C:\Temp` × `D:\a\_temp` → `"A1/B/A2"`, `runner: {volume: "D:"}`, fases `A1` padrão, `B` runner, `A2` padrão nessa ordem; `t:95` `padrao: {volume: "C:"}`; `t:105` junção real para o padrão → `["não aplicável: RUNNER_TEMP é o mesmo destino do temporário padrão", ["A"]]`; `t:108` pasta distinta → `["A1", "B", "A2"]` | `lat:51-55` (`resolve`, minúsculas só no `win32`); `lat:68-92` (`realpathSync.native` dos dois; destinos só com o volume, `lat:59-63`) |
| (c) E/S | `t:127` erros `["EIO", "lock_present", "lock_present"]` (o lock preso faz os seguintes saírem com `lock_present`); `t:128` nenhum desses ciclos tem `tomada`, `liberacao` ou `remocao`; `t:130` `erros` `{lockPresent: 2, lockLost: 0, es: {EIO: 1}}` e `tomada`/`liberacao` indisponíveis; controle `t:135` o mesmo io sem falha dá 3 ciclos limpos com os três tempos numéricos | `lat:143` `StoreError` → código do store, senão `code` `E…`/nome; `lat:146` tempos só sem erro; `lat:304-308` `lock_present` e `lock_lost` fora de `es` |
| (d) teto | `t:144` `timedOut` true; `t:148` `[true, {previstos: 12, concluidos: 0, comErro: 0, incompletos: 12}, indisponível, indisponível]`; `t:149` carga `[processos 1, terminaram 0]`; término parcial `t:160` `[true, {previstos: 3, concluidos: 2, comErro: 0, incompletos: 1}]`; `t:161` `tomada` `{amostras: 2, p50: 1.5, p99: 700, max: 700, ">=600": 1, ">=650": 1}` | `lat:248-283`: teto por fase, `kill()` só em `children` ainda abertos, espera do `close` (5 s e depois `SIGKILL`, também só nos próprios), e `await` de todos os `close`; `lat:318` `incompletos = previstos − concluidos` |
| (e) supervisão | `t:146` `process.kill(foreign.pid, 0) === true`: o processo alheio iniciado pela prova continua vivo; `t:145` todos os filhos do supervisor têm `exit` (fecharam) | `lat:225-247` só rastreia o que `spawnChild` devolveu; nenhuma listagem de processos, nome ou `taskkill` |
| (f) limpeza | `t:180` fora do destino → `"fora da árvore própria"`; `t:186` sem marcador e `t:188` outro nonce → `"sem o marcador desta execução"`; `t:192` junção → `"não é uma pasta real"`; `t:194` relativo literal → `"caminho relativo"`; `t:195` outra pasta → `"não é a pasta criada por esta execução"`; `t:196` nada apagado nas recusas; `t:198-199` a própria sai (`{ok: true}`); `t:200` as recusadas continuam | `lat:339-360`; motivos sem caminho |
| (g) protocolo | `t:165` `parseLines` com linha incompleta e JSON inválido = `{records: [ok(1)], invalid: 2}`; `t:168` objeto fora da forma, “não é json” e linha pela metade → `{previstos: 3, concluidos: 1, comErro: 0, incompletos: 2}`, `linhasInvalidas` 3, 1 amostra | `lat:97-114`, `lat:295-301` |
| (h) fronteira real | `t:206` `[false, {previstos: 15, concluidos: 15, comErro: 0, incompletos: 0}, {lockPresent: 0, lockLost: 0, es: {}}, 0]`; `t:207-210` `tomada`, `liberacao` e as quatro operações com 15 amostras e `p50 <= p99 <= max`; `t:211` cargas `[3, 3, {}]`; `t:212` `escritas >= 3`; `t:213` produtores `{codigo: 0, sinal: null}` ×3 | filhos reais `spawnWorker` (`lat:216-217`, `windowsHide: true`, ambiente herdado sem mudar `TEMP`/`TMP`); as 15 amostras de criação/escrita/fechamento mostram que a instrumentação alcança o `writeExclusive` real (`fs.mjs:35-40`) |
| (i) relatório e constantes | `t:221` `"A1/B/A2"` e fases `[A1 padrão 6, B runner 6, A2 padrão 6]`; `t:222` limpeza `{removidas: 3, recusadas: []}`; `t:223` pastas vazias depois; `t:225` sem `RUNNER_TEMP`: `"não aplicável: RUNNER_TEMP ausente"`, uma fase `A`; `t:226-232` o JSON não contém os caminhos, `os.tmpdir()`, o `PATH` (também escapado) nem `/[0-9a-f]{16}/` (nonce); `t:236` `PHASE` = `{producers: 3, cycles: 500, loaders: 3, loadBytes: 65_536, limitMs: 120_000}`; `t:238` argumento desconhecido → `[2, "", "uso: node scripts/ci-lock-latency.mjs\n"]` | o CLI chama `measure()` sem argumentos (`lat:408`), cujo padrão é `PHASE` (`lat:366`); exit 1 só no `catch` (`lat:409-413`) |

**Formatos do Landing conferidos por leitura** (sem teste nomeado; o C50 não os reivindica): fase sem pasta própria → `{fase, destino, indisponivel: "pasta própria não criada [<código>]"}` (`lat:381-383`); falha no supervisor → `"fase interrompida [<código>]"` (`lat:388-389`), e as outras fases seguem; exit 1 com `{"skillMeLockLatency":1,"indisponivel":"medição não concluída [<código>]"}` (`lat:411`); protocolo dos filhos (`lat:181-182`, `:210`, `:212`); carga com `pronto` depois da 1ª tentativa e saída ao fechar o stdin (`lat:188-213`, `:273-274`).

**Limites da medição (não são defeitos):** a carga é sintética, não a suíte; a instrumentação custa um pouco por operação, igual nas fases; 600 e 650 ms são faixas, não prazos; zero ocorrência na medição não provaria CI estável, taxa ou causa. O controle local do CLI do autor (A1/B/A2 com 1.500 ciclos cada, ~2 s) teve os dois destinos no mesmo volume `C:`: é controle de formato, não medição do runner; não o repeti. A minha fronteira real é a do teste versionado (3 produtores × 5 ciclos + 3 cargas de 64 KiB).

## Carregado da R12 (verified at `0f540a0`) e reconferido

- **Asserções de C1–C47**: `tests/` tem 0 diff em `0f540a0..HEAD` e `src/` 0 desde `f734441`. O julgamento das asserções é **carried from R12 at `0f540a0`** (que trazia C1–C45 de R11…R4), com as mesmas linhas. Amostra relida no HEAD, toda conforme: `cmd:48, 49, 65, 77`; `prep:93`; `sess:67`; `store:715`; `end:194, 320, 438`; `hl:255`; `ag:310, 402, 403, 422, 424, 437, 441`; `conc:214, 298, 325, 349`.
- **C1 / `package.json`** (refresh): só a linha do alias mudou desde a R12; `private: true` e `bin.skill-me` iguais (`cmd:48-49`, `gov:358`). Em B, clone novo com `core.autocrlf=true`: `package.json` `w/crlf` (34 CRLF), `cli.mjs` `w/lf attr/text eol=lf`, 4.257 bytes, 0 CR, primeira linha `#!/usr/bin/env node\n`, modo `100755`, antes e depois do `npm link` do C1; status do clone vazio antes e depois.
- **Marcos preservados** (sem diff na janela): `f734441` (store relê sob lock e publica o marcador completo; os 5 controles de intercalação no C32); `619c8e0` (diagnóstico do C32 com indisponibilidade, erro original preservado, B 127, liberação de todas as barreiras e espera de A; leitor saudável estrito; 9 C32); C28 com fixture 25 s + 25 s sob o supervisor de 60 s e a primeira perda diagnosticada sem retry; C33 com Node/`sh` isolados; C34 com `deps.now` e o recuo de 5 s; C46 (T8 40+40, 80 IDs, 3 controles); C47 (I23-C10 com etapas iguais e os 2 controles). Todos executados de novo em A/B/C/D.
- **Core e configuração**: os 5 arquivos do core sem diff na feature; perfis globais `light`/`ui`/`direct` com `maxRounds` 2; overrides 3:9, 4:10, 5:10, 6:3, 7:35, 8:3, 23:4 intactos; `25` = `{light, 8}`, com a aprovação 6467998235/6467154706 (só `maxRounds` e o texto mudaram desde a R12). As 7 tentativas do motor ficam preservadas; não rodei `review:run`.

## Ambientes e execuções — verified at `631e281`

Execuções **em sequência**, uma invocação por ambiente, sem nenhuma repetição. O alvo de A, B e C é `node --test --test-concurrency=4 --test-reporter=spec … --test-reporter=tap … tests/integrations/launch/*.test.mjs tests/integrations/hermes-harness.unit.test.mjs tests/integrations/traces/concurrency.cli.test.mjs tests/integrations/observe/agents.e2e.test.mjs scripts/governance-ci.test.mjs scripts/ci-lock-latency.test.mjs` — **13 arquivos**, com concorrência e `observe/agents.e2e` completos (`v13/run-win-target.sh`, `wsl-run.sh`).

| # | Ambiente | Resultado |
| --- | --- | --- |
| A | Windows 11, checkout principal, Node v24.22.1 (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10, `npm_execpath` e `RUNNER_TEMP` ausentes; `npmCli()` = o npm do nvm4w. 08:48:07–08:50:51 | **147: 141 pass, 0 fail, 6 skip**, exit 0. Status vazio antes e depois |
| B | Windows 11, Node **v24.13.0 oficial** (`ci-node-24.13.0/node-v24.13.0-win-x64/node.exe`, `execPath` dele) no início do PATH, npm **11.6.2** adjacente (`npmCli()` = o do zip), `npm_execpath` ausente. **Clone git novo**: `git clone --no-hardlinks --config core.autocrlf=true <checkout> v13/B-clone` (configuração só em `.git/config` do clone; HEAD e árvore conferidos). `node_modules` copiado, sem rede. 08:51:19–08:53:59 | **147: 141 pass, 0 fail, 6 skip**, exit 0 |
| C | WSL `Ubuntu`, `oldboydev` uid 1000, `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc`, só com os meus scripts (0 CR). 08:55:02–08:56:10 | **147: 141 pass, 0 fail, 6 skip**, exit 0. Árvore `94224834…` igual antes e depois; `cli.mjs` 755 e 0 CR depois. `/home/oldboydev/.skill-me` e `.skill-me-authorization.json` ausentes antes e depois (só `test -e`); home do scratch vazio; 0 `skill-me i4 i25|t8|i23 *` e 0 `skill-me lock latency *` em `/tmp` antes e depois |
| D | `npm test` completo, Windows, checkout principal, Node v24.22.1, npm 11.19.1, `npm_execpath` ausente, 32 núcleos, runner `MAX_PARALLEL_FILES = 8` (`scripts/test-integrations.mjs:14`). Rodou **uma vez**, em segundo plano, com orçamento de **2 h configurado na ferramenta antes do início**, sem abortar nem repetir; esperei a notificação de término da ferramenta. 08:56:32–09:07:14 | **exit 0** (`EXIT=0`, `D_rc=0`, notificação com exit 0). Governança 19 (19/0/0: os 7 `governance-` e os 12 C50); motor de revisão 16/16/0/0; doctor 417 (410 pass, 0 fail, 7 skip); integrações 567 (554 pass, **0 fail**, 13 skip). **Total 1.019: 999 pass, 0 fail, 20 skip.** `✖` = 0 no log. Status vazio antes e depois |

**B: conversão de fim de linha e estado do checkout.**
- **Antes**: HEAD do clone `631e281…` e árvore `94224834…`, iguais ao esperado; `core.autocrlf` local `true` (`.git/config`) e efetivo `true`.
- **Conversão ativa**: `package.json` `i/lf w/crlf` (34 CRLF); `governance.yml`, `ci-lock-latency.mjs` (415 CRLF), `ci-lock-latency.test.mjs`, `governance-ci.test.mjs` e `.gitattributes` `w/crlf`. `cli.mjs` `i/lf w/lf attr/text eol=lf`: 4.257 bytes, 0 CR, 125 LF, primeira linha `b'#!/usr/bin/env node\n'`, modo `100755`.
- Status vazio antes e depois de copiar `node_modules`.
- **Depois de B** (o C1 fez o `npm link` com o npm 11.6.2 do zip): `cli.mjs` com os mesmos 4.257 bytes, 0 CR e a mesma primeira linha; **status vazio** (`B-clone-after.txt`).
- O clone foi removido depois de conferir caminho absoluto, tipo (diretório, não link) e HEAD (`B-clone-cleanup.txt`).

**C: cópia exata e ambiente isolado.**
- **Cópia**: `git -c core.autocrlf=false archive HEAD`, tar de **5.806.080 bytes**, sha256 `db18d81f…1fb26121`, `get-tar-commit-id` = `631e281…`. Árvore extraída `94224834…` = `HEAD^{tree}`, igual depois de copiar `node_modules`. `cli.mjs` 755 (git `100755`), primeira linha `#!/usr/bin/env node`, 0 CR; 0 CR no script, no teste novo e no workflow. `node_modules` copiado sem rede (yaml 2.9.0, smol-toml 1.9.1).
- **Prefixo sem `sh`**: `prefix/bin` = `node npm npx`. O `node` é cópia byte a byte de `/usr/bin/nsolid` (sha256 `150946e4…bb6351`), v24.13.0, com `execPath` no prefixo. O npm 11.6.2 fica em `prefix/lib/node_modules/npm`, e `npmCli()` aponta para ele. `/usr/bin/node` não foi usado como atalho.
- **Execução**: `env -i`, `HOME=<scratch>/home`, `LANG=C.UTF-8`, `PATH=<scratch>/prefix/bin:<scratch>/tools`, **sem `/usr/bin`**. `tools` tem só links para `/usr/bin/{sh (dash), git, python3 (3.12.3), id, grep, mkfifo}`, sem agentes, `node`, `npm`, `npx` ou `corepack`. As chamadas ao WSL usaram `MSYS_NO_PATHCONV=1` desde a primeira.

**Skips** (todos de plataforma, com o motivo impresso pelo teste):
- **A e B (6)**: C45 POSIX, C5 POSIX, C6, C42 POSIX, C33 arranjo e C15 pty.
- **C (6)**: C4 shim, C45 controle do Windows, C5 console, C42 console, C8 LOCALAPPDATA e C38 console.
- **D (20)**:
  - doctor (7): `agent-resolution-formal5-2`, `agent-resolution-C2`, 2 `fifo-config-formal8-4` e 3 `fs-adapter-formal8-4`, todos POSIX/FIFO;
  - integrações (13): `I4-C15`, `I4-C25b`, `I4-C25j`, `I4-C25k`, `I4-C25l`, `I4-C25m`, `T8-C4` e os 6 I25 POSIX de A.

Cada um dos 6 skips de A/B/C rodou no outro ambiente da matriz (os de A/B em C; os de C em A/B). Dos 20 de D, só os 6 I25 POSIX rodaram em outro ambiente (C). Os 7 do doctor (POSIX/FIFO), `I4-C15`, `I4-C25b`, `I4-C25j`, `I4-C25k`, `I4-C25l`, `I4-C25m` (Linux/macOS) e `T8-C4` são provas globais antigas que **não foram reexecutadas** em nenhum ambiente desta rodada. As provas novas (`governance-C49` e os 12 C50) não têm skip.

**Nomes conferidos.**
- **A, B e C**: os 147 nomes são idênticos nos três TAP (`v13/matrix.txt`: “nomes iguais em todos: sim (união 147)”). São os 128 da R12 mais os 7 `governance-` (com o `governance-C49` novo) e os 12 `C50 `.
- **D** (`v13/D-summary.txt` e busca no log):
  - **I23-C4** ✔ ×7 e **T8-C11** ✔ (7,3 s): as duas provas que falharam na CI 40636157287 passaram aqui, o que não diz nada sobre o runner;
  - **I23-C10** ✔ (14,6 s), **I25-C47** ✔ ×2, **T8-C15** ✔ (13,9 s), **I25-C46** ✔ ×3, **I25-C32** ✔ ×9;
  - **`governance-C1 C3`** ✔, **`governance-C49`** ✔ e **`C50 `** ✔ ×12, na suíte de governança, como o alias novo manda;
  - **12 nativos do Hermes** ✔, pelo runtime real, só pelo teste versionado: `I4-C18`, `C19`, `C20`, `C21`, `C22`, `C23`, `I4-C37`, `I25-C40` nativo, `I23-C8` ×3 e `I4-C44b`;
  - `I25-C*` de 1º nível: 109 ✔ e 6 ﹣.

**Durações-chave**, em segundos (A / B / C / D):
- I23-C10: 12,9 / 12,5 / 1,4 / 14,6.
- C47 (E/S): 3,0 / 3,0 / 0,3 / 3,5. C47 (disco parado): 3,7 / 3,7 / 1,0 / 4,0.
- T8-C15: 12,1 / 11,6 / 1,8 / 13,9. C46: 3,4–3,5 / 3,2–3,4 / 0,3–0,9 / 4,0–4,2.
- C32 de processos reais: 8,6 / 8,4 / 2,4 / 9,3. C28 regressão: 28,4 / 28,2 / 26,1 / 28,6. C1: 2,0 / 1,7 / 0,4 / 2,6.
- C50 fronteira real: 3,4 / 3,1 / 0,1 / 3,1. C50 relatório: 8,8 / 8,2 / 0,3 / 8,6. C50 teto: 2,8 / 2,5 / 1,5 / 2,6.

## Matriz por check (TAP de A, B e C; `v13/per-check.txt`)

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
| C47 | 2p | 2p | 2p |
| T8-C15 / T8-C16 | 1p / 9p | 1p / 9p | 1p / 9p |
| I23-C10 / I23 do arquivo | 1p / 4p | 1p / 4p | 1p / 4p |
| **`governance-C1 C3`** / **`governance-C49`** / todos `governance-` | **1p / 1p** / 7p | **1p / 1p** / 7p | **1p / 1p** / 7p |
| **C50** | **12p** | **12p** | **12p** |

C48 não tem teste próprio: é a leitura estrutural mais `governance-C1 C3` e `governance-C49`.

## Checks

Abreviações:
- testes de `tests/integrations/launch/`: `cmd` = `command.cli.test.mjs`, `prep` = `prepare.cli`, `sess` = `session.e2e`, `store` = `store.unit`, `end` = `end.e2e`, `rep` = `report.cli`, `agent` = `agent.unit`, `docs` = `docs.test`;
- outros testes: `harn` = `tests/integrations/hermes-harness.unit.test.mjs`, `nat` = `hermes-plugin.native.test.mjs`, `conc` = `traces/concurrency.cli.test.mjs`, `ag` = `observe/agents.e2e.test.mjs`, `gov` = `scripts/governance-ci.test.mjs`, `t` = `scripts/ci-lock-latency.test.mjs`;
- apoios: `hl` = `helpers/launch.mjs`, `tr` = `helpers/traces.mjs`; script `lat` = `scripts/ci-lock-latency.mjs`.

“A/B/C/D” = passou nesses ambientes, nesta rodada, no HEAD `631e281`. As linhas de C1–C47 são as da R12 (0 diff em `tests/` desde `0f540a0`).

| Check | Nome no TAP (prefixo, contagem) | Evidência (arquivo:linha — valor) | Revisão | Result |
| --- | --- | --- | --- | --- |
| C1 | `I25-C1 npm link num prefixo temporário…` (1) A/B/C/D | `cmd:48` `private === true`; `cmd:49` `bin` = `{"skill-me": "src/integrations/launch/cli.mjs"}`; `cmd:65` `[0, SKILL_ME_HELP, ""]` de outro cwd; `cmd:77` `git status` igual (“npm link não altera o checkout”). B num clone novo `autocrlf=true`: `cli.mjs` LF/0 CR e status vazio antes e depois | carried + refresh do `package.json` e medida B | PASS |
| C2 | `I25-C2 argumentos literais…` A/B/C/D | `cmd:96-98` `{status: 0, stdout, stderrFirst, argv: LITERAL_ARGS, stdin}` para os 3 agentes; `LITERAL_ARGS` em `cmd:80` | carried | PASS |
| C3 | `I25-C3 código do agente…` A/B/C/D | `cmd:105` `{0: 0, 7: 7}` | carried | PASS |
| C4 | `I25-C4 shim…` + `entrada do shim…` ×2: A/B 3p, C 2p/1s | `cmd:117-120` `{status: 0, execPath: process.execPath, script: …/@openai/codex/bin/codex.js, sentinel: false}`; `cmd:130-133` `{status: 127, [launcher_requires_shell], sentinel: false}`; `agent:80-118` | carried | PASS |
| C5 | `I25-C5 Ctrl+C no console…` (A/B/D), `sinais do terminal no POSIX` (C) | `cmd:228` `{status: 4, signal: null, signals: ["SIGINT","SIGQUIT","SIGHUP"]}`; `cmd:244-245` `CTRL_C_EVENT` → `["SIGINT"]` | carried | PASS |
| C6 | `I25-C6 SIGTERM só ao launcher…` (C) | `cmd:267` `{status: 0, signal: null, signals: ["SIGTERM"]}` | carried | PASS |
| C7 | `I25-C7 agente ausente…` A/B/C/D | `prep:93-94` `{status: 127, stdout: "", code: true, asked: false}`; `prep:98` árvore igual | carried | PASS |
| C8 | `I25-C8 prévia…` ×2 (A/B/D 2, C 1p/1s) | `prep:122-126` texto exato até cada pergunta, árvores iguais; `prep:141-144` LOCALAPPDATA | carried | PASS |
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
| C32 | `I25-C32 …` ×9, A/B/C/D | **Processos reais**: `end:280` A sai com 0; `end:283` IDs diferentes; `end:286` `["stopped", "active"]`; `end:291` B sai com 0; `end:293-294` `a-1, a-2` / `b-1, b-2, b-3` com o pseudônimo da chave de cada captura; `end:295` chaves próprias; `end:296` `[1, 1]`. **Diagnóstico original**: `end:320` `"eventos intercalados: B terminou antes"`; `end:322-326`. **Diagnóstico parcial**: `end:370-386`; apoio `hl:214-257` (`:255` erro original em `cause`), `failureCode` em `tr:151`. **Primeira criação**: `store:706-802` (`:715` `lock_present`) e `end:396-444` (`:438` `capturas: 1; eventos gravados: 1.`) | carried | PASS |
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
| C46 | `T8-C15 concurrent producers…` (1) e `I25-C46 diagnóstico do T8-C15…` ×3, A/B/C/D | Saudável `conc:214-215` `{bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0}`, `:226` 80, `:227` IDs únicos, `:229` `[80, 80]`, `:237` hooks, `:251` `{…code: "lock_present", entries: 3, committed: 0, persisted: 0, lost: 3}`, `:252` árvore igual. (a) `:297` `io_failure`, `lost > 0`, `committed + lost === 40`; `:298` `["rename segmento.tmp EIO (antes do commit)"]`; `:301-310` export `{records: 40 + committed, a: 40, b: committed, others: 0, repeated: 0}`, lock ausente. (b) `:325` `["unlink lock EIO (depois do commit)"]`; `:327-336` export `{80, 40, 40, 0, 0}`. (c) `:349` `{…io_failure, entries: 40, committed: 0, persisted: 0, lost: 40}`; `:351-360` `{unavailable: "lock_present"}` ×2, `{segments: 1, temporaries: 0}`, `lock {present: true}`. Base `:276-280`, `:282-287` | carried | PASS |
| C47 | `I23-C10 sessões concorrentes…` (1) e `I25-C47 diagnóstico do I23-C10…` ×2, A/B/C/D; mais `T8-C15`/`I25-C46` (apoio comum) | I23-C10: `ag:310` `deepEqual(run.report?.delivery, DELIVERED_AUTO(1|20))` nas etapas `ag:321-329`; cauda `ag:331-377`. (a) `ag:402` `[actual, expected]`, `ag:403` prefixo `codex A 0\n<evidência>`, `ag:422` `io_failure` 1/0/0/1, `ag:424` `[["rename segmento.tmp EIO (sob o lock, 2ª tomada)"], 0, 1]`, `ag:426` `active accepted 0 persisted 0`, 0 segmento, 0 temporário, lock ausente. (b) `ag:437` `delivery_timeout` 1/0/0/1, `ag:439` `[[], "close key (sob o lock, 2ª tomada)"]`, `ag:441` `{unavailable: "lock_present"}`, lock presente. Não vazamento `ag:406-416`, `ag:430`, `ag:444` | carried | PASS |
| **C48** | prova estrutural + `governance-C1 C3 workflow sempre publica CI…` e `governance-C49 …` (A/B/C/D) | Seção “C48 com a exceção”: documento inteiro do HEAD sem `lock_diagnostics` e sem `verify.timeout-minutes` = `d0d5a7f` (true) e = base (true); `governance.yml:43` a expressão; `:21`, `:63` 5; `:84` 10; diff `d0d5a7f..HEAD` 20/1, `0f540a0..HEAD` 19/0; `gov:263-278` matriz, `runs-on` e passos; `gov:294-299` conjunto de jobs | **verified at `631e281`** (estrutural; a CI real é do orquestrador) | **PASS** |
| **C49** | `governance-C49 job manual de diagnóstico do lock…` (1) A/B/C/D | Seção “C49”: `gov:317-324` chaves exatas (sem `needs`/`continue-on-error`); `gov:325-329` nome, `if`, `windows-latest`, 10, `{contents: "read"}`; `gov:332-339` mesmos hashes do `verify`, `persist-credentials: false`, `node-version: "24.13.0"` sem cache; `gov:340-343` os dois comandos; `gov:345-351` `ci.needs` `["changes","verify"]`, ninguém depende dele, nenhum `continue-on-error`; `gov:354-358` alias e `private` | **verified at `631e281`** | **PASS** |
| **C50** | `C50 …` ×12, A/B/C/D | Seção “C50”: (a) `t:48`, `t:49-53`, `t:55`, `t:59`, `t:62-64`; (b) `t:68-71`, `t:81-95`, `t:105`, `t:108`; (c) `t:127-130`, `t:135`; (d) `t:144-149`, `t:160-161`; (e) `t:145-146`; (f) `t:180-200`; (g) `t:165`, `t:168`; (h) `t:206-213`; (i) `t:221-232`, `t:236`, `t:238` | **verified at `631e281`** | **PASS** |

**Checks com prova verde em todos os ambientes aplicáveis e no gate: 50/50.**

## AC → checks

- **AC1** (comando, argumentos, sinais, código): C1–C6, C42, C45. Verdes.
- **AC2** (primeiro uso): C7–C15, C26, C38. Verdes.
- **AC3** (só a sessão iniciada, capturas sucessivas): C16–C24, C41. Verdes.
- **AC4** (encerramento verificável, concorrência, consulta sem ID): C25, C27–C35, C41, C43. Verdes.
- **AC5** (README e ajuda): C36, C37. Verdes.
- **AC6** (harness do Hermes): C39, C40, C44. Unidade verde em A/B/C/D; os 12 nativos verdes em D.
- **AC7** (T8-C15): C46 e T8-C15, verdes em A/B/C/D.
- **AC8** (I23-C10 e orçamento Windows): C47 verde em A/B/C/D; C48 pela leitura estrutural e pelas provas de governança.
- **AC9** (medição comparativa): C49 e C50 verdes em A/B/C/D; C48 com a exceção. A medição no runner não foi feita aqui.

## Processo desta rodada (o que os meus comandos mostram)

**Executado.**
- git, só leitura ou com configuração local: `rev-parse`, `status`, `diff`, `log`, `show`, `ls-files --eol/-s`, `config --show-origin/--get`, `branch --show-current`, `check-ignore`, `rev-list --count`; `archive -c core.autocrlf=false` e `get-tar-commit-id`; `clone --no-hardlinks --config core.autocrlf=true` do repositório local, com a configuração só no clone.
- Versões: `node`, `npm`, `python`; `wsl.exe -l -q`.
- `node -e` só de leitura (contexto da issue, configuração, linha de base do `%TEMP%`); `python -I` para contar bytes e CR.
- WSL: `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc`, só com os meus scripts.
- Os alvos versionados A, B e C e o `npm test` (D), cada um uma vez.
- C48: a minha leitura estrutural (`v13/c48-structural.mjs`) e o apoio do autor `builder-ci-lock-latency/workflow-regular.mjs`, lido antes de executá-lo.
- Os meus scripts em `v13/`: `run-win-target.sh`, `b-clone-prepare.sh`, `b-clone-after.sh`, `wsl-prepare.sh`, `wsl-run.sh`, `wsl-cleanup.sh`, `run-d-npm-test.sh`, `temp-baseline.mjs`, `cleanup-temp.mjs`, `matrix.mjs`, `per-check.mjs`, `d-summary.mjs` e `c48-structural.mjs` — adaptações dos da R12 com HEAD, rodada e os 13 arquivos do alvo trocados, mais a leitura do C48.

**Não executado.**
- Nenhuma repetição de prova ou gate; nenhuma espera curta em D (esperei a notificação de término).
- Nenhum `codex`, `claude`, `hermes`, `gemini` ou outro agente real, nem `--version`/`--help`, `execvp` ou `spawn` desses nomes fora dos testes versionados. Os agentes dos alvos são de fixture; o C50 usa `node -e` e os próprios filhos do script. O Hermes real só foi importado como runtime Python pelos 12 testes nativos versionados, em HOME temporário.
- Nenhuma sonda nova, teste novo, mutação ou fault injection minha; as 7 mutações do script e as 5 do workflow, o RED e o controle do CLI local (constantes de 500 ciclos) são relato do autor.
- O script `scripts/ci-lock-latency.mjs` pelo CLI completo (1.500 ciclos por fase) e qualquer job do Actions: **nenhum job medido ou executado aqui**.
- Nada de rede, credencial, perfil pessoal ou banco; nenhuma alteração de host, relógio, runtime, Git global ou proteção do sistema.
- Nenhuma listagem ou encerramento de processos; nenhum gate global antigo do WSL com `Date.now()`; nenhuma mudança de timeout de teste (o orçamento de 2 h foi só o da ferramenta, para D).
- Nenhum commit, push, PR, merge, `review:run`, revisão formal ou CI.

**Histórico preservado e não repetido.**
- O incidente da R5 (até 5 inícios do Codex WSL; 12 mtimes sem linha de base de conteúdo) continua registrado em `ffc5937`; não repeti sondas nem restaurei ou apaguei perfil. Os mesmos dados não o desfazem.
- FAIL9 (`4e66de2`), FAIL10 (`788d160`), PASS11 (`d0d5a7f`) e PASS12 (`9244eea`) ficam como estão; as CIs 40514323240 e 40636157287, vermelhas, continuam registradas (`8868fe1`, `d2d54cf`).
- Não editei `verifier-round1/` a `verifier-round12/`; só li os scripts da R12 como método. Os arquivos da auditoria do orquestrador em `verifier-round13/` ficaram sem leitura nem alteração.

## Falhas, limitações e o que não está provado

- **Nenhuma medição do runner.** A comparação A1/B/A2 com 3 × 500 ciclos e 120 s por fase é a execução manual do orquestrador. Nada aqui mede o runner, dá taxa ou demonstra causa; zero ocorrência numa medição sintética não provaria CI estável nem causa. Não atribuo nada a runner, Defender, relógio, disco ou hardware.
- **Causas desconhecidas e não eliminadas**: os `lock_present` do I23-C4 e do T8-C11 (CI 40636157287); os `delivery_timeout` do I23-C10 e do primeiro C46 (CI 40514323240); a falha do T8-C15 da R9; a perda do primeiro registro do C28 (R7); o timeout de C32 na CI 40443538957; o C34 do WSL em `abae80a`. Uma passada verde por ambiente não mede taxa, e a instrumentação/execução verde não é causa corrigida.
- **C48/C49**: a expressão `${{ … }}` e o `if` do job manual não foram avaliados pelo GitHub aqui; a execução manual também roda a matriz regular, e isso é do orquestrador depois de PASS, `ready` e publicação.
- **C50, ramos só lidos** (o checklist não os reivindica): fase sem pasta própria, fase interrompida no supervisor e o exit 1 do CLI; o CLI com as constantes reais.
- **Continuam das rodadas anteriores**: os ramos do C47 sem relatório, sem linha da pré-carga e com listagem ≠ `ENOENT`; os três ramos do apoio de C32 só lidos; a variante “lock ausente” de C43 sem teste nomeado; as janelas do plugin em C44; o ramo com várias capturas `active` na falha do encerramento; recusa e EOF num console real do Windows; os nativos do Hermes pulados na CI (executados aqui em D); C23 sem asserção de tempo; a variante link do C17 não executada no Windows desta máquina (executada em C); macOS e o runner da CI não executados; o uso real sem sessão de agente (`Unresolved` 2, `blocks go-live`).

## Findings (em ordem)

1. **Nenhum bloqueante.** 50/50 checks e os gates A, B, C e D verdes no HEAD `631e281`, cada um numa execução única; C48 conforme pela leitura estrutural autorizada.
2. **Risco do diagnóstico (lido, não exercitado; não bloqueante para os checks).** A remoção da pasta da fase não é protegida: `removeOwnDir` chama `rmSync` sem `try` (`lat:358`) dentro do `finally` de `measure` (`lat:390-394`). Se a remoção lançar (por exemplo `EBUSY`, `EPERM` ou `ENOTEMPTY` no Windows), a exceção sai de `measure`, e o CLI imprime só `{"skillMeLockLatency":1,"indisponivel":"medição não concluída [<código>]"}` com exit 1 (`lat:409-413`), perdendo as fases já medidas. O ajuste de `39278dd` diz que as outras fases seguem e que o exit 1 fica para o temporário padrão não resolvido ou erro interno; ele não decide a falha da limpeza, e nenhum C50 a cobre — lacuna de precisão no Landing. Como a execução manual está prevista uma vez, o orquestrador decide se isso importa antes de acioná-la. Não afirmo que ocorra no runner.
3. **Risco do diagnóstico (lido, não exercitado).** Se `runPhase` lançar depois de iniciar filhos (por exemplo `mkdirSync` de `produtor-<k>`, `lat:265-268`), só o ramo do teto encerra filhos (`lat:277-282`): os já iniciados seguem vivos e a fase sai como `fase interrompida`. `track` também não registra `'error'` nos filhos (`lat:226-247`), então uma falha assíncrona do `spawn` derrubaria o processo sem relatório. Nenhum check cobre esses caminhos.
4. **Precisão do C50 (h).** “As cargas fizeram ao menos uma escrita cada” é afirmada como soma: `t:212` `escritas >= 3`, com `t:211` `terminaram: 3` e `erros: {}`. O “cada” decorre do laço da carga (`lat:197-210`: toda carga que relata fez ao menos uma tentativa, e sem erros cada tentativa gravou), não de uma asserção por processo; o relatório só expõe a soma por contrato.
5. **Leitura dos contadores (nota).** Com nada relatado, `carga.escritas` sai 0 (teto: `terminaram: 0`) e `erros` sai `{lockPresent: 0, lockLost: 0, es: {}}` (0 ciclos concluídos). É a forma literal do Landing (7), qualificada por `carga.terminaram`/`processos`, `ciclos.concluidos`/`incompletos` e `encerradaPeloTeto`; as métricas de latência nunca viram zero (`indisponivel`). Quem ler o resultado do runner deve ler esses números juntos.
6. **AC9 íntegro no que é verificável aqui.** Job manual só na forma do Landing (C49); jobs regulares e topo idênticos a `d0d5a7f` fora a linha do AC8 (C48); script com reúso das APIs públicas, valores exatos, guardas de limpeza e supervisão, sem caminho, nonce ou ambiente na saída (C50); `src/`, provas funcionais, prazos, retry, perdas, carga, core e orçamentos 20/10/5 sem mudança.
7. **Pendências fora deste Verifier**: a revisão formal 8, a publicação, a execução manual com o registro dos resultados, a CI regular verde e o merge (orquestrador); o uso real (`Unresolved` 2).

## Gate

| Gate | Resultado |
| --- | --- |
| A — alvo de 13 arquivos, Windows, Node 24.22.1, concorrência 4 | 147: 141 pass, 0 fail, 6 skip — exit 0 |
| B — o mesmo, Windows, Node 24.13.0 oficial, npm 11.6.2 adjacente, `npm_execpath` ausente, clone novo com `core.autocrlf=true` | 147: 141 pass, 0 fail, 6 skip — exit 0; `cli.mjs` LF/0 CR e status vazio antes e depois |
| C — o mesmo, WSL Ubuntu uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, `env -i`, PATH sem `/usr/bin`, cópia exata | 147: 141 pass, 0 fail, 6 skip — exit 0 |
| C48 — diff, leitura estrutural do documento inteiro contra `d0d5a7f` e a base, apoio do autor, `governance-C1 C3`/`governance-C49` | conforme; as duas provas ✔ em A/B/C/D |
| D — `npm test`, Windows, Node 24.22.1, runner padrão (8), 12 nativos do Hermes | **1.019: 999 pass, 0 fail, 20 skip — exit 0** (19 + 16 + 417 + 567) |

## Limpeza

- **`%TEMP%`**: linha de base antes de A (`temp-baseline.json`: 60.495 nomes, 0 `skill-me i4 i25 *`, 30.085 `skill-me *`, 0 `skill-me lock latency *`). `cleanup-temp.mjs` removeu só diretórios fora da linha de base, filhos diretos do `%TEMP%`, com prefixo `skill-me i4 ` ou `skill-me i5 `, não links e com mtime na janela; simulação antes de cada aplicação:
  - **A–B** (11:48:04Z–11:54:09Z): **405 removidos, 0 recusas** — 377 `i4 i25`, 14 `i4 t8`, 12 `i4 i23`, 1 `i4 ausente`, 1 `i4 secoes`;
  - **D** (11:56:24Z–12:07:34Z, linha de base `temp-before-D.json`): **127 removidos, 0 recusas** — 124 `i4 i5`, 2 `i4 t7`, 1 `i5 c7`.

  Depois: 0 `skill-me i4 i25 *`, 30.085 `skill-me *` e 0 pastas `skill-me lock latency *`/`skill-me-lock-latency-*` (o `after` do C50 removeu as dele). Os 6 e 8 nomes fora do filtro não foram tocados.
- **Clone de B**: removido depois de conferir que o caminho absoluto é `v13/B-clone`, que é diretório e não link, e que o HEAD é `631e281`.
- **WSL**: `wsl-cleanup.sh` removeu `/tmp/skillme-verifier-r13.KaHeCp` depois de conferir o padrão absoluto e o tipo; restaram 0 scratches `r13`, 0 `skill-me i4 i25|t8|i23 *` e 0 `skill-me lock latency *`.
- **Mantidos em `v13/`** (pasta ignorada): os logs de A, B, C e D, `matrix.txt`, `per-check.txt`, `D-summary.txt`, `C48-structural.txt`, `C48-author-helper.txt`, os workflows extraídos, o tar do HEAD, as linhas de base, os relatórios de limpeza, os rascunhos deste relatório e os meus scripts.
- **Estado final**: configuração, estado de review e prefixo npm real não foram tocados. O HEAD continua `631e281`. O `git status` estava vazio depois de D e antes de gravar este arquivo; depois, só ele aparece modificado.
