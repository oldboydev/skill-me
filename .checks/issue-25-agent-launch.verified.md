# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25

**Verdict**: **PASS**. Os 46 checks (C1–C46, 7 ACs) têm prova verde em todos os ambientes aplicáveis, e os quatro gates passaram, cada um numa única execução no HEAD:
- **A**: 122 testes, 116 pass, 0 fail, 6 skip.
- **B**: 122 testes, 116 pass, 0 fail, 6 skip.
- **C**: 122 testes, 116 pass, 0 fail, 6 skip.
- **D** (`npm test` completo): 1.004 testes, 984 pass, 0 fail, 20 skip, exit 0, com os 12 nativos do Hermes.

O FAIL da R10 (diagnóstico de C32 em C) está corrigido no apoio da prova (`619c8e0`): o erro original é preservado e a limpeza sempre roda (seção “C32”).
**Checks**: **46/46**. Nenhum check ficou sem teste executado, e cada skip é de plataforma, com o caso coberto no outro ambiente.
**Profile**: light. Não fiz fault injection, `Coverage` nem `Test policy` próprios, e não há fonte vinculante de UI. Rodei só os controles versionados. As mutações citadas são do autor e não foram repetidas.
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..285638016287f6b9b11b231286c4a5c8ec7e6f2c`, a feature inteira: 74 commits, árvore `c203aaa7…`. Desde a R10 (`df259ed`, relatório em `788d160`) mudaram:
- **provas**: só `tests/integrations/helpers/launch.mjs` (+61/−12 linhas: coleta de melhor esforço em `withOverlappingRuns`) e `tests/integrations/launch/end.e2e.test.mjs` (+63/−1: import e as duas variantes novas de C32);
- **documentos**: task, checklist, build, o handoff do T8-C15 e este relatório.

`src/`, `scripts/`, `.github/`, `code-review.config.json`, `.gitattributes`, `package.json`, fixtures e os demais testes têm 0 linhas de diff em `df259ed..HEAD`. O produto não muda desde `f734441`.
**Round**: **11** (light), usando a autorização humana “Pode fazer quantas precisar”, registrada para esta rodada em [issuecomment-6442514838](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6442514838). As dez anteriores ficam preservadas, inclusive o FAIL10 em `788d160`. A revisão formal 6 é do orquestrador e continua disponível (5 usadas). Não alterei limite, estado nem histórico.
**Verifier**: subagente novo e independente (Claude Opus 5.5). Não sou o autor nem um Verifier anterior. Código, testes, critérios, checklist e configuração ficaram só para leitura. Escrevi apenas este arquivo e logs/scripts em `.checks/code-review/issue-25/verifier-round11/v11/` (ignorada).

Data: 27/10/2026, 10:06–10:30 (-03). HEAD `2856380` do início ao fim. `git status --porcelain=v1 -uall` vazio antes de A (`v11/git-status-before.txt`), antes e depois de A e de D, e no fim, antes de gravar este arquivo.

## Fontes lidas nesta rodada

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `tlc-implement/references/verify.md` | inteiros; perfil `light` |
| `.tasks/issue-25-agent-launch.md` | inteiro (565 linhas): critérios 1–38, “Refinamento do diagnóstico de C32: captura em construção” e Sources com 6442514838 |
| `.checks/issue-25-agent-launch.md` | inteiro (620 linhas): Landing, inclusive “Primeira criação concorrente do store” (`:73`) e “Diagnóstico de C32 com captura em construção” (`:74`); C1–C46 com os acréscimos de C32 (`:190-199`); S10/C46 (`:365-388`); Swept e Handoff (`:404`) |
| `.checks/issue-25-agent-launch.build.md` | inteiro (1.269 linhas). É **relato do autor, não prova minha**. Inclui a seção “Diagnóstico de C32 com captura em construção” (`:1193-1269`) |
| `.checks/issue-25-agent-launch.t8c15-handoff.md` | inteiro (83 linhas) |
| `.checks/code-review/issue-25/context-ci28-verifier11-approved.json` | inteiro: **19 comentários**, **7 ACs**. O último comentário registra “Pode fazer quantas precisar” e a 11ª verificação |
| `.checks/issue-25-agent-launch.verified.md` da R10 | inteiro, antes de substituí-lo |
| Diffs `df259ed..HEAD` | inteiros: `helpers/launch.mjs` e `end.e2e.test.mjs`. Também `63621c6..HEAD` de `.gitattributes`, `package.json` e `code-review.config.json` |
| Auditoria externa do orquestrador | **não lida**. Em `verifier-round11/` só listei os nomes `profile-before.json`, `profile-compare.py` e `profile-metadata-snapshot.py`. Não havia `profile-comparison-final.json` quando listei. Não li perfil pessoal |

## C32: por que o diagnóstico está corrigido (verified at `2856380`)

**Defeito da R10.** O `catch` de `withOverlappingRuns` lia marcadores, probes e capturas antes de gravar as barreiras. Com uma captura sem `state.json`, `launchCapturesOnDisk` lançava `ENOENT`, o erro original sumia, as barreiras não eram gravadas e A ficava presa.

**Correção (`619c8e0`, só no apoio de prova).**

| Exigência | No código | Evidência |
| --- | --- | --- |
| A coleta nunca lança | Cada leitura passa por `orUnavailable`, que devolve `indisponível [<código>]` | `hl:173-179` |
| O código não carrega mensagem nem caminho | `failureCode` usa o `code` `E…` ou o nome do erro | `hl:172` |
| Leitor próprio do diagnóstico | Uma captura ilegível vira `["indisponível", <código>]` ao lado das legíveis. Pasta ausente dá `[]`; outro erro de listagem vira `indisponível [code]` | `hl:185-203`; uso em `hl:237` |
| Leitor saudável continua estrito | `launchCapturesOnDisk` não muda | `hl:271-278`: `JSON.parse(readFileSync(…state.json))` sem `try` |
| Todas as barreiras são tentadas | Uma escrita que falha vai para `barreirasNaoGravadas` sem impedir as outras | `hl:238-245` |
| Todas as invocações são esperadas | Uma rejeição vira `indisponível` | `hl:246-254` |
| O erro original é preservado | Primeira linha do original e original em `cause` | `hl:255-256`: ``new Error(`${error.message}\n${JSON.stringify(diagnosis)}`, { cause: error })`` |

**Prova nova.** `I25-C32 diagnóstico com captura em construção e probe incompleto — captura em construção | probe incompleto` (`end:335-389`). Não usa `sleep`:
- A para na barreira (`end:355`). A prova espera B terminar (`await runB`, `end:356`) e só então põe a árvore parcial (`end:357`, variantes em `end:335-338`).
- A espera de `eventos intercalados` falha na primeira leitura (`hl:227`).
- A prova tem limpeza própria, que grava os marcadores e espera as duas invocações (`end:363-367`).

Asserções decisivas:
- `end:370` primeira linha `=== "eventos intercalados: B terminou antes"`, e `end:371` `cause.message` igual: o erro original é preservado.
- `end:372` `endedAtFailure === true`: A já tinha terminado quando o erro saiu, então o apoio liberou e esperou. Esse valor vem de `runA.then` (`end:349-350`), registrado antes do `track` do apoio.
- `end:376` `marcadores` `["A1"]`; `end:377` `barreirasNaoGravadas` `[]`.
- `end:378-379` A com status 0 e sinal nulo; `end:380` `launchers.B` `{status: 127, signal: null, stderr: "skill-me: claude não encontrado no PATH [executable_not_found]\n"}`.
- `end:382` (variante da captura): `probes` `{A: invA, B: null}`, e as capturas são `[[invA, 1, "active", 0], ["indisponível", "ENOENT"]]`. A captura ilegível aparece ao lado da legível, sem lista vazia nem “zero capturas”.
- `end:383` `launchCapturesOnDisk` ainda lança `ENOENT`.
- `end:385` (variante do probe): `probes.B` `"indisponível [SyntaxError]"` e só a captura de A.
- `end:386` `readJsonLines` ainda lança `SyntaxError`.

**Alcance.** O mesmo apoio atende:
- o C32 de processos reais (`end:265-301`);
- o diagnóstico original (`end:303-327`, que continua com as asserções `:320`, `:322-326`);
- as provas do C34 que usam `withOverlappingRuns`.

Os 9 C32 e os 4 C34 passaram em A, B, C e D.

**Conclusão.** O defeito da R10 está fechado no apoio e provado pelas duas variantes. O apoio de diagnóstico não virou regra de produto: `src/` tem 0 diff desde `f734441`. As durações das duas variantes, em segundos (A / B / C / D), foram 3,0 / 3,1 / 1,0 / 3,4 (captura) e 3,2 / 3,1 / 1,0 / 3,3 (probe). Sem espera longa: B termina antes, e A é liberada.

**Limitações.**
- Três ramos não são exercitados por teste nomeado; o checklist não os reivindica, e conferi só por leitura (`hl:187-192`, `hl:242-243`, `hl:251-252`):
  - listagem de `captures/` falhando com código diferente de `ENOENT`;
  - escrita de barreira falhando (`barreirasNaoGravadas` não vazio);
  - invocação rejeitada.
- O interleaving real da R10 não foi reproduzido com processos: a prova monta a mesma árvore parcial.
- Não repeti as mutações do autor (`build.md:1244-1246`).

## Produto: primeira criação concorrente do store (`f734441`, sem diff desde a R10; verified at `2856380`)

| Ponto | Evidência no HEAD |
| --- | --- |
| Marcador publicado inteiro (temporário + `rename`, temporário apagado na falha) | `store.mjs:42` `MARKER_TEMP_PATTERN = /^store\.json\.[0-9a-f]{8}\.skill-me-tmp$/`; `:371-378` `writeExclusive(tmp)` → `rename(tmp, store.json)`, `catch` com `unlink(tmp)` |
| Quem cria lista antes de ler | `:140` `if (create) needsInit = await needsAdoption(…)`. Em `needsAdoption` (`:162-171`): `store.json` listado tem de ser exato (`:164-166`). Sem ele, a pasta só é adotável com `.lock` ou com o temporário **junto do** `.lock`; qualquer outra entrada dá `store_invalid` antes do lock (`:168-169`) |
| Decisão sob o lock, sem republicar | `initStore` `:366-380`. `:369` `if (await readMarker(io, storeDir)) return;`. `:370` qualquer entrada além do `.lock` dá `store_invalid` |
| Quem não cria | Lê o marcador como antes (`:141`); `readMarker` limitado a `STORE_MARKER.length` (`:146-151`) |
| Consumidores | `privacy start` (`:413` `create: true`), `on` (`:876` `create: action === "on"`) e abertura do launcher (`:1081` `create: true`) |
| Sem retry novo | `observe/command.mjs:94-100` `patiently`: só repete `lock_present` dentro de `OBSERVE_LOCK_PATIENCE_MS = 2000` (`:62`), e relança qualquer outro código |
| Provas (A/B/C/D) | `store:706-721` (marcador em publicação: `:715` `lock_present`); `:723-738` (pasta vazia vista antes do lock, sem regravar); `:740-753` (publicado entre leitura e listagem); `:755-802` (recusas: `store_invalid` para pasta alheia, marcador diferente/vazio e temporário sem lock; `lock_present` para lock alheio com/sem temporário; `:789` `link_refused`; `:793` `root_changed`; pasta vazia adotada). Pelo launcher: `end:396-444`, com `:428` B encontra o lock, `:433` exit 0 nos dois, `:436` `[[], "stopped", 1]`, `:438` `capturas: 1; eventos gravados: 1.`, `:443` marcador exato |
| Contratos antigos do store no gate D | `I5-C32s` (códigos sem eco), `I5-C49`/`I5-C49b` e `I5-S-bounded` (marcador/segmento lido limitado) **passaram em D**, assim como as suítes `privacy`/`observe` inteiras dentro das 565 integrações |

**Mudança de comportamento declarada** (Landing `:73`, aprovada): numa criação concorrente, `privacy start` responde 4 `lock_present` em vez de 3 ou 5. Uma sobra de `.lock` com o temporário dá `lock_present` e, depois da remoção do lock, `store_invalid`. Não é decisão minha.

## C46: contratos e literais (sem diff desde a R10; verified at `2856380`)

O T8-C15 (`conc:241-277`) e os três I25-C46 (`conc:311-385`) usam a **mesma rotina**: `runConcurrentProducers` (`:111-123`), `inspectProducers` e `assertProducersConfirmed` (`:232-239`).

| Exigência | Evidência e valores literais |
| --- | --- |
| Produtores realmente concorrentes, 40+40 | `:117-121` `Promise.all` de dois `runHermesIngest`, `interleaved(hermesLines(name, 40), 4)`, cada um com `timedEnv(timing[name])` (pré-carga existente, um arquivo por produtor, `:114-115`). **Limite**: a sobreposição vem da construção e não é afirmada, como na base |
| Saudável inalterado | `:236` `status === 0`; `:237` `deepEqual(delivery, {bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0})`; `:248` 80; `:249` IDs únicos ordenados = esperados; `:250-251` segmento coerente e `[80, 80]`; `:259` hooks `{…entries: 1, committed: 1, persisted: 1, lost: 0}`; `:263-264`; `:273` lock alheio → `{bound: true, code: "lock_present", entries: 3, committed: 0, persisted: 0, lost: 3}`; `:274` árvore igual |
| A asserção continua vermelha nos injetados | `:299` `AssertionError`; `:300` `[actual, expected]` = `[delivery, {bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0}]`; `:301` a mensagem começa por `${name}\n${evidência}` |
| (a) `SEGMENT_EIO=1` só em `b` (`:312`) | `:317` `a` `{…40/40/40/0/null}` e falhas `[]`; `:319` `code === "io_failure" && lost > 0 && committed + lost === 40 && persisted === committed`; `:320` falhas exatamente `["rename segmento.tmp EIO (antes do commit)"]`; `:326-329` `export {records: 40 + committed, a: 40, b: committed, others: 0, repeated: 0}`, `status {state: "active", accepted: total, persisted: total}`, `files {segments: 1, temporaries: 0}`, `lock {present: false}`; `:333-334` texto da mensagem |
| (b) `LOST_CONFIRMATION=2` (`:339`) | `:344` `a` igual; `:346` mesma regra; `:347` exatamente `["unlink lock EIO (depois do commit)"]`; `:352-355` `export {records: 80, a: 40, b: 40, others: 0, repeated: 0}`, `status {"active", 80, 80}`, `{1, 0}`, `lock {present: false}` (as entradas dadas como perdidas estão no disco); `:359-360` |
| (c) `LOCK_KEPT=2` (`:365`) | `:368-369` mensagem do primeiro produtor que não confirmou tudo; `:371` `b` exatamente `{bound: true, code: "io_failure", entries: 40, committed: 0, persisted: 0, lost: 40}`; `:372` `["unlink lock EIO (depois do commit)"]`; `:376-379` `export {unavailable: "lock_present"}`, `status {unavailable: "lock_present"}`, `files {segments: 1, temporaries: 0}`, `lock {present: true}` (nada inventado); `:383` texto literal |
| Não vazamento | `:304-309` `assertNoLeak`: a mensagem não contém a raiz, o ID, a chave (hex/base64/base64url), `sessao-a`/`sessao-b` nem o `PATH`, e `leaks(text)` = `[]`. A inspeção que falha vira código, nunca mensagem (`:128-134`) |
| Sem retry, prazos e teto | Testemunhas exatas de uma única operação com erro (`:320`, `:347`, `:372`). O runner continua com `MAX_PARALLEL_FILES = 8` (`scripts/test-integrations.mjs:14`, 0 diff na feature; D com 32 núcleos → 8) |

Execuções, em segundos (A / B / C / D):
- T8-C15: 11,6 / 11,3 / 1,6 / 12,9.
- C46 (a): 3,3 / 3,2 / 0,3 / 3,4.
- C46 (b): 3,3 / 3,2 / 0,3 / 3,4.
- C46 (c): 3,4 / 3,3 / 0,3 / 3,6.

**Causa da falha T8-C15 da R9: continua desconhecida.** O diagnóstico não é resolução, e passadas verdes não medem taxa.

## Ambientes e execuções — verified at `2856380`

Execuções **em sequência**, uma invocação por ambiente, sem nenhuma repetição. O alvo de A, B e C é `node --test --test-concurrency=4 --test-reporter=spec … --test-reporter=tap … tests/integrations/launch/*.test.mjs tests/integrations/hermes-harness.unit.test.mjs tests/integrations/traces/concurrency.cli.test.mjs`: **10 arquivos**, com o de concorrência completo (`v11/run-win-target.sh`, `wsl-run.sh`).

| # | Ambiente | Resultado |
| --- | --- | --- |
| A | Windows 11, checkout principal, Node v24.22.1 (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10, `npm_execpath` ausente; `npmCli()` = `C:\nvm4w\nodejs\node_modules\npm\bin\npm-cli.js`. 10:08:46–10:11:20 | **122: 116 pass, 0 fail, 6 skip**, exit 0. Status vazio antes e depois. O teste C17 imprime que a variante link não rodou (sem privilégio de symlink, `A tap:518`) |
| B | Windows 11, Node **v24.13.0 oficial** (`ci-node-24.13.0/node-v24.13.0-win-x64/node.exe`, `execPath` dele) no início do PATH, npm **11.6.2** adjacente (`npmCli()` = o do zip), `npm_execpath` ausente. **Clone git novo**: `git clone --no-hardlinks --config core.autocrlf=true <checkout> v11/B-clone`, com a configuração só em `.git/config` do clone; a do sistema não foi tocada. `node_modules` copiado, sem rede. 10:11:37–10:14:08 | **122: 116 pass, 0 fail, 6 skip**, exit 0 |
| C | WSL `Ubuntu`, `oldboydev` uid 1000, `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc` só com os meus scripts (0 CR). Detalhes da cópia e do ambiente abaixo. 10:14:31–10:15:35 | **122: 116 pass, 0 fail, 6 skip**, exit 0. Árvore `c203aaa7…` igual antes e depois; `cli.mjs` 755 e 0 CR depois. `/home/oldboydev/.skill-me` e `.skill-me-authorization.json` ausentes antes e depois (só `test -e`); home do scratch vazio; 0 `skill-me i4 i25 *` e 0 `skill-me i4 t8 *` em `/tmp` antes e depois |
| D | `npm test` completo, Windows, checkout principal, Node v24.22.1, npm 11.19.1, `npm_execpath` ausente, 32 núcleos, runner `MAX_PARALLEL_FILES = 8`. Rodou **uma vez**, em segundo plano, com orçamento de **2 h na ferramenta configurado antes do início**. 10:16:05–10:25:36 | **exit 0** (`EXIT=0`, `D_rc=0`). governança 6/6/0/0; motor de revisão 16/16/0/0; doctor 417 (410 pass, 0 fail, 7 skip POSIX/FIFO); integrações 565 (552 pass, **0 fail**, 13 skip). **Total 1.004: 984 pass, 0 fail, 20 skip.** `✖` = 0 no log. Status vazio antes e depois |

**B: conversão de fim de linha e estado do checkout.**
- **Antes**: HEAD do clone `2856380…`, igual ao esperado; árvore `c203aaa7…`; `core.autocrlf` local `true` e efetivo `true`.
- **Conversão ativa**: `package.json` `i/lf w/crlf` com 34 CRLF, e `.gitattributes` `w/crlf`. `cli.mjs` `i/lf w/lf attr/text eol=lf`: 4.257 bytes, 0 CR, 125 LF, primeira linha `b'#!/usr/bin/env node\n'`, modo `100755`.
- Status vazio antes e depois de copiar `node_modules`.
- **Depois de B** (C1 fez o `npm link`): `cli.mjs` com os mesmos 4.257 bytes, 0 CR e a mesma primeira linha; **status vazio**.
- O clone foi removido depois de conferir caminho, tipo e HEAD (`B-clone-cleanup.txt`).

**C: cópia exata e ambiente isolado.**
- **Cópia**: `git -c core.autocrlf=false archive HEAD`, tar de **5.662.720 bytes**, sha256 `7fb67810…d3893a3`, `get-tar-commit-id` = `2856380…`. Árvore extraída `c203aaa7…` = `HEAD^{tree}`, igual depois de copiar `node_modules`. `cli.mjs` 755 (git `100755`), primeira linha `#!/usr/bin/env node`, 0 CR. `node_modules` copiado sem rede (yaml 2.9.0, smol-toml 1.9.1).
- **Prefixo sem `sh`**: `prefix/bin` = `node npm npx`. O `node` é cópia byte a byte de `/usr/bin/nsolid` (sha256 `150946e4…bb6351`), v24.13.0, com `execPath` no prefixo. O npm 11.6.2 fica em `prefix/lib/node_modules/npm`, e `npmCli()` aponta para ele. `/usr/bin/node` não foi usado como atalho.
- **Execução**: `env -i`, `HOME=<scratch>/home`, `LANG=C.UTF-8`, `PATH=<scratch>/prefix/bin:<scratch>/tools`, **sem `/usr/bin`**. `tools` tem só links para `/usr/bin/{sh (dash), git, python3 (3.12.3), id, grep, mkfifo}`, sem agentes, `node`, `npm`, `npx` ou `corepack`.

**Skips** (todos de plataforma, com o motivo impresso pelo teste):
- **A e B (6)**: C45 POSIX, C5 POSIX, C6, C42 POSIX, C33 arranjo e C15 pty.
- **C (6)**: C4 shim, C45 controle do Windows, C5 console, C42 console, C8 LOCALAPPDATA e C38 console.
- **D (20)**:
  - doctor (7): `agent-resolution-formal5-2`, `agent-resolution-C2`, 2 `fifo-config-formal8-4` e 3 `fs-adapter-formal8-4`, todos POSIX/FIFO;
  - integrações (13): `I4-C15`, `I4-C25b`, `I4-C25j`, `I4-C25k`, `I4-C25l`, `I4-C25m`, `T8-C4` e os 6 I25 POSIX de A.

Cada caso pulado num ambiente rodou em outro.

**Nomes conferidos.**
- **A, B e C**: os 122 nomes são idênticos nos três TAP (`v11/matrix.txt`: “nomes iguais em todos: sim”).
- **D**:
  - **T8-C15** ✔ (12,9 s);
  - **I25-C46** ✔ ×3;
  - **I25-C32** ✔ ×9: processos reais 8,7 s, diagnóstico original 3,3 s, as duas variantes novas 3,4 s e 3,3 s, launcher 5,0 s e os quatro do store;
  - **12 nativos do Hermes** ✔, pelo runtime real, só pelo teste versionado: `I4-C18`, `C19`, `C20`, `C21`, `C22`, `C23`, `I4-C37`, `I25-C40` nativo, `I23-C8` ×3 e `I4-C44b`;
  - `I25-C*`: 107 ✔ e 6 ﹣. Equivale aos 106 do alvo mais o C40 nativo.

**Durações-chave**, em segundos (A / B / C):
- C32 de processos reais: 8,1 / 8,0 / 2,2.
- C32 pelo launcher: 4,7 / 4,6 / 1,1.
- C28 regressão: 28,2 / 28,2 / 26,0.
- C28 saudável: 3,8 / 3,8 / 1,1.
- C1: 1,8 / 1,6 / 0,3.

## Matriz por check (TAP de A, B e C; `v11/per-check.txt`)

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
| C17 | 4p (link omitido) | 4p (link omitido) | 4p (link executado) |
| **C32** | **9p** | **9p** | **9p** |
| C33 | 1p/1s | 1p/1s | 2p |
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
| Execução de todas as provas C1–C46 | **verified at `2856380`**, em A, B, C e D |
| `command.cli`, `prepare.cli`, `session.e2e`, `store.unit`, `agent.unit`, `docs.test`, `report.cli`, `hermes-harness.unit`, `hermes-plugin.native`, `traces/*`, fixtures, `traces-probe.mjs`, `traces.mjs`, `observe.mjs` e todo `src/` | **0 linhas de diff em `df259ed..HEAD`** (`git diff --quiet` conferido). O julgamento das asserções é **carried from R10 at `df259ed`** (que o trazia de R9/R8/R7/R6/R4). Amostra relida no HEAD, toda conforme: `cmd:48, 49, 65, 77, 105, 342`; `prep:93, 189`; `sess:67, 230`; `rep:159, 213`; `agent:132`; `docs:82`; `harn:88`; `nat:335`; `store:168`; `end:120, 280, 295, 320`. Também foram relidos os literais do C46 (`conc:231-385`) e o store (`store.mjs:128-175, 364-380`) |
| `end.e2e` | **verified, citações atualizadas**: `:1-328` iguais à R10, exceto o import da `:20` (`capturesDir`). As 62 linhas novas estão em `:329-390`. Depois delas, deslocamento exato de **+62** (`diff` vazio entre `df259ed:329-910` e `HEAD:391-972`) |
| `helpers/launch.mjs` | **verified**: `:1-169` iguais à R10; `:170-203` são novas; `withOverlappingRuns` fica em `:215-258`. Depois dela, deslocamento de **+49**: `launchCapturesOnDisk` `:271-278`, `markerPausedIo` `:296`. `npmScriptEnv` `:67` e `runSkillMe` `:121` (SIGKILL em 60 s, `:132`) não mudaram |
| Core, workflows e configuração | `scripts/` e `.github/`: 0 linhas de diff na feature (core vendorizado e workflows intactos). `code-review.config.json`: perfis globais `light`/`ui`/`direct` com `maxRounds` 2; `roundOverrides["25"]` = `{light, 6}` com a aprovação 6434588924; demais overrides intactos (3:9, 4:10, 5:10, 6:3, 7:35, 8:3, 23:4). A feature só acrescenta o bloco `25`, sem diff desde `df259ed` |

## Checks

Abreviações:
- testes de `tests/integrations/launch/`: `cmd` = `command.cli.test.mjs`, `prep` = `prepare.cli`, `sess` = `session.e2e`, `store` = `store.unit`, `end` = `end.e2e`, `rep` = `report.cli`, `agent` = `agent.unit`, `docs` = `docs.test`;
- outros testes: `harn` = `tests/integrations/hermes-harness.unit.test.mjs`, `nat` = `hermes-plugin.native.test.mjs`, `conc` = `traces/concurrency.cli.test.mjs`;
- apoio: `hl` = `helpers/launch.mjs`.

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
| C17 | `I25-C17 …` ×4 A/B/C/D (link executado só em C) | `store:79` `["launch", invocation, 1, "2026-10-26T10:00:00.000Z"]`; `store:54, 110, 156`; `sess:300-301` | carried | PASS |
| C18 | `I25-C18 execução indisponível…` A/B/C/D | `sess:111` `{status, stderr: "skill-me: não foi possível abrir a execução [<código>]\n", started: false, waited: true}`; `sess:124` | carried | PASS |
| C19 | `I25-C19 eventos na captura da execução…` A/B/C/D | `sess:147, 151, 152-160`; `sess:161` `[0, 0]`; `sess:165-167` | carried | PASS |
| C20 | `I25-C20 par inválido…` A/B/C/D | `sess:190-192` `{bound: false, code: "binding_invalid", entries: 1, committed: 0, persisted: 0, lost: 1}` | carried | PASS |
| C21 | `I25-C21 autorização global intacta…` A/B/C/D | `sess:208-211` bytes iguais com off e com on | carried | PASS |
| C22 | `I25-C22 limite de eventos…` A/B/C/D | `sess:230` `[1, "stopped", 500, 500, {}]`; `sess:236, 240-245` | carried | PASS |
| C23 | `I25-C23 limite de 8 MiB…` A/B/C/D | `sess:282` `["active", MAX_BYTES, {}, 1]`; `sess:289, 291` | carried | PASS |
| C24 | `I25-C24 captura corrente encerrada à mão…` A/B/C/D | `store:168` `[opened.capture, "stopped", 1]`; `store:169` | carried | PASS |
| C25 | `I25-C25 encerramento e resumo…` A/B/C/D | `end:72-79` capturas `stopped`, `endedAt` ISO, ponteiro ausente; `end:80-89` stderr exato | linhas iguais | PASS |
| C26 | `I25-C26 nada gravado…` A/B/C/D | `end:101-109` `eventos gravados: 0.` e a dica com `manualSteps[0]` | linhas iguais | PASS |
| C27 | `I25-C27 …` ×3 A/B/C/D | `end:120` `{launch: true, code: "launch_ended", entries: 1, committed: 0, persisted: 0, lost: 1}`; `store:222-260` | linhas iguais | PASS |
| C28 | `I25-C28 entregas Hermes em voo…` e `… primeira entrega perdida…` A/B/C/D | `end:148-149` sinal nulo e saída existente antes do parse; `end:158-159` `{started: true, delivered: true, enqueued: 3, sent: 3, queueFull: 0, failed: 0}`; `end:164-165` `persisted` 3 e `stopped`; `end:168` `eventos gravados: 3.`. Regressão: `end:181-185` `{started: false, delivered: false, stats: {enqueued: 1, delivered: 1, droppedQueueFull: 0, deliveryFailed: 0, oversize: 0, serializationFailed: 0, active: true}}`; `end:187` `[["stopped", 0, 0]]`; `end:188` ponteiro fora; `end:189` `eventos gravados: 0.`; `end:194` `["EIO"]` (1 rename); `end:195` 1 unlink. Fixture 25 s + 25 s (`hermes-plugin-session.py:25-26`) sob o supervisor de 60 s (`hl:121, 132`) | linhas iguais | PASS |
| C29 | `I25-C29 término por sinal…` A/B/C/D | `cmd:278, 295, 300` | carried | PASS |
| C30 | `I25-C30 falha de início…` A/B/C/D | `cmd:342` `{status: 127/126, startCode: true, captures: [[1, "stopped", 0]]}` | carried | PASS |
| C31 | `I25-C31 …` ×2 A/B/C/D | `end:205-215` `[lock_present]`, `continua active`, `privacy stop`, `continua aberta`, `["active", true]`; `end:244-258` `[io_failure]`, `já não recebe registros`, `launch_ended` | linhas iguais | PASS |
| **C32** | `I25-C32 …` ×9, A/B/C/D | **Processos reais**: `end:280` A sai com 0; `end:283` IDs diferentes; `end:286` `["stopped", "active"]`; `end:291` B sai com 0; `end:293-294` `a-1, a-2` / `b-1, b-2, b-3` com o pseudônimo da chave de cada captura; `end:295` chaves próprias; `end:296` `[1, 1]`. **Diagnóstico original**: `end:320` `"eventos intercalados: B terminou antes"`; `end:322` `launchers.B` exato; `end:323-326`. **Diagnóstico parcial** (novo): `end:370-386` (seção “C32”). **Primeira criação**: `store:715-801` e `end:398-443` (seção do produto) | **verified** (end/hl atualizados) | **PASS** |
| C33 | `I25-C33 on e off…` (A/B/C/D) e `… arranjo do npm run (POSIX)` (C) | `end:457` `npmScriptEnv`; `end:459` `[0, "on"]`; `end:460` `active`; `end:464` `[0, "off", []]`; `end:465` `active`; `end:469` 3× `LAUNCHED(1)`; `end:474` nenhuma automática. Arranjo: `end:493-494` `≠ 0` e `/spawn sh ENOENT/`; `end:497` depois da pasta, só o bin de fixture; `end:501` `[0, "ok", "off"]`. PATH com só `node`/`sh`/fixture em `hl:67-74` | atualizado (+62) | PASS |
| C34 | `I25-C34 …` ×4 A/B/C/D | `rep:82` texto; `rep:90-96`; `rep:145, 155` precondições com tempos (`deps.now`); `rep:159` `[newInv, true]`; `rep:173` escolha; `rep:181`; recuo `rep:208-213` `[firstInv, true]` (“segue o launchedAt”); `rep:237` `--latest`; `rep:239` `[0, 1, [automatic.id]]`. Regra do produto (`launchedAt`, `invocation`) sem diff | carried | PASS |
| C35 | `I25-C35 report sem execução…` A/B/C/D | `rep:252-259` `[3, {"schemaVersion":1,"command":"report","status":"error","error":{"code":"not_configured"}}, ""]` e `no_launch_capture` | carried | PASS |
| C36 | `I25-C36 ajuda…` A/B/C/D | `cmd:350` `[0, SKILL_ME_HELP, ""]`; `cmd:354` `[2, "", SKILL_ME_HELP]`; `cmd:356-368` | carried | PASS |
| C37 | `I25-C37 documentação…` ×3 A/B/C/D | `docs:57, 60-62`; `docs:82` os 9 limites (`docs:44-54`); `docs:88-89, 93` | carried | PASS |
| C38 | `I25-C38 console real do Windows…` (A/B/D) | `prep:355` `["done", 0]`; `prep:361, 363, 365` | carried | PASS |
| C39 | `I25-C39 …` ×3 A/B/C/D | `harn:88` `["concluded", 0, 3]`; `harn:100-102, 186-188` | carried | PASS |
| C40 | `I25-C40 …` ×2 A/B/C/D + nativo `I25-C40 harness nativa…` (D) + `I4-C20`, `I4-C21`, `I4-C37` (D) | `harn:196-225` `[2000, "timeout"]`, `[5000, "timeout"]`; nativo `nat:335` `{capture: "concluded", ingest: "concluded", inactive: "inactive", spawnfail: "failed", exit: "failed", disconnect: "failed", …}` | carried; nativo **executado em D** | PASS |
| C41 | `I25-C41 …` ×17 A/B/C/D | `store:327-523`; `end:518, 535, 539-551, 581, 601-619, 646-656, 681-692, 722-729, 736-752` | `end` atualizado (+62) | PASS |
| C42 | `I25-C42 …` A/B/D 3p/1s; C 3p/1s | `agent:187-236`; `cmd:424` POSIX `{status: null, signal, started: false, …}`; `cmd:456` Windows `status: 130` | carried | PASS |
| C43 | `I25-C43 …` ×12 A/B/C/D | `store:560-632` (`:598` `{code: "root_changed", opened: true, …, lockLeft: false}`); `end:808-813, 823-831, 839-843, 864-867, 877-883, 891-902, 924, 944-954, 966-971`; linhas literais `end:762-769, 907-914` | `end` atualizado (+62) | PASS |
| C44 | `I25-C44 …` ×3 A/B/C/D + nativo `I4-C22` e `I25-C40` (D) | `harn:263-271, 281-289` `[1000, "timeout"]`, `[5000, "timeout"]`; `harn:300-304`; nativo `nat:251-256` | carried; nativo **executado em D** | PASS |
| C45 | `I25-C45 …` A/B/D: resolução + controle Windows; C: resolução + POSIX real | `agent:132-146, 154`; `cmd:166-186`; `cmd:198-201` | carried | PASS |
| **C46** | `T8-C15 concurrent producers…` (1) e `I25-C46 diagnóstico do T8-C15…` ×3, A/B/C/D | Seção “C46”. Saudável `conc:236-237, 248-251, 259, 263-264, 273-274`; (a) `conc:312-335`; (b) `conc:339-361`; (c) `conc:365-384`; base comum `conc:298-302`, `:304-309` | verified (literais relidos) | **PASS** |

**Checks com prova verde em todos os ambientes aplicáveis e no gate: 46/46.**

## AC → checks

- **AC1** (comando, argumentos, sinais, código): C1–C6, C42, C45 — verdes.
- **AC2** (primeiro uso): C7–C15, C26, C38 — verdes.
- **AC3** (só a sessão iniciada, capturas sucessivas): C16–C24, C41 — verdes.
- **AC4** (encerramento verificável, concorrência, consulta sem ID): C25, C27–C35, C41, C43 — verdes, com C32 corrigido.
- **AC5** (README e ajuda): C36, C37 — verdes.
- **AC6** (harness do Hermes): C39, C40, C44. Unidade verde em A/B/C; os 12 nativos verdes em D.
- **AC7** (T8-C15): C46 e T8-C15, verdes em A/B/C e no gate D.

## Processo desta rodada (o que os meus comandos mostram)

**Executado.**
- git, só leitura ou com configuração local:
  - `rev-parse`, `status`, `diff`, `log`, `show`, `ls-files --eol/-s`, `config --show-origin/--get`, `branch --show-current`;
  - `archive -c core.autocrlf=false` e `get-tar-commit-id`;
  - `clone --no-hardlinks --config core.autocrlf=true` do repositório local, com a configuração só no clone.
- Versões: `node`, `npm`, `python`.
- `node -e`/`-p` só de leitura (configuração, `npmCli()`); `python -I` para contar bytes e CR.
- WSL:
  - `wsl.exe -l -q`;
  - `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc`, só com os meus scripts.
- Os alvos versionados A, B e C e o `npm test` (D).
- Os meus scripts em `v11/`: `run-win-target.sh`, `b-clone-prepare.sh`, `b-clone-after.sh`, `wsl-prepare.sh`, `wsl-run.sh`, `wsl-cleanup.sh`, `run-d-npm-test.sh`, `temp-baseline.mjs`, `cleanup-temp.mjs`, `matrix.mjs` e `per-check.mjs`. São adaptações dos da R10, só com caminhos e HEAD trocados.
- Uma espera por arquivo de término de D (`timeout 580 … until grep EXIT=`).

**Não executado.**
- Nenhuma repetição de prova ou gate.
- Nenhum `codex`, `claude`, `hermes`, `gemini` ou outro agente real, nem `--version`/`--help`, `execvp` ou `spawn` desses nomes fora dos testes versionados. Os agentes dos alvos são de fixture, e o Hermes real só foi importado como runtime Python pelos 12 testes nativos versionados, em HOME temporário.
- Nenhuma sonda nova, mutação ou fault injection minha.
- Nada de rede, credencial, perfil pessoal ou banco.
- Nenhuma alteração de host, relógio, runtime ou Git global.
- Nenhuma listagem ou encerramento de processos.
- Nenhum gate global antigo do WSL com `Date.now()`.
- Nenhuma mudança de timeout de teste. O orçamento de 2 h foi só o da ferramenta, para D.

**Histórico preservado e não repetido.**
- O incidente da R5 (até 5 inícios do Codex WSL; 12 mtimes sem linha de base de conteúdo) continua registrado em `ffc5937`.
- Os dois inícios de D na R8, o FAIL9 (`4e66de2`) e o FAIL10 (`788d160`) ficam como estão.
- Não editei `verifier-round1/` a `verifier-round10/`; só li os scripts da R10 como método.
- Os arquivos de auditoria do orquestrador em `verifier-round11/` ficaram sem leitura nem alteração.
- O processo do CLI do autor deixado aberto em `710076e` foi encerrado pelo orquestrador depois do gate do autor (`build.md:1100-1104`). O código dele não é resultado de teste. Nesta rodada, os códigos são os dos meus logs: `EXIT=0` em A, B, C e D.

## Falhas, limitações e o que não está provado

- **Causas desconhecidas e não eliminadas**:
  - a falha do T8-C15 da R9;
  - a perda do primeiro registro do C28 (R7);
  - o timeout de C32 na CI 40443538957, que não guardou saídas para uma atribuição exclusiva. A corrida `store_invalid` da primeira criação foi demonstrada e corrigida pelo autor em `f734441`;
  - o C34 do WSL em `abae80a`, sem causa exclusiva demonstrada.

  Uma passada verde por ambiente não mede taxa, e a instrumentação não é resolução.
- **C32 diagnóstico**: três ramos do apoio têm só leitura de código, sem teste (seção “C32”):
  - listagem que falha;
  - barreira não gravada;
  - invocação rejeitada.

  O interleaving real da R10 não foi reproduzido com processos.
- **Evidência do autor, não repetida por mim**:
  - RED e mutações do diagnóstico de C32 (`build.md:1232-1246`);
  - RED 5/5, GREEN 5/5 e três mutações do store (`:1149-1161`);
  - RED e duas mutações do C46 (`:1065-1082`);
  - RED/GREEN do C1 em clones `true`/`false`; a matriz 3+3 do C32; a mutação por `createdAt` do C34; o RED do C28.
- **C46**: a sobreposição dos produtores vem da construção e não é afirmada. Os controles dependem da ordem da n-ésima operação injetada. A pré-carga pode alterar o tempo.
- **Continuam das rodadas anteriores**:
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

1. **Nenhum bloqueante.** 46/46 checks e os gates A, B, C e D verdes no HEAD `2856380`, cada um numa execução única.
2. **O FAIL10 está fechado**: `withOverlappingRuns` (`hl:215-258`) preserva o erro original (primeira linha e `cause`), marca `indisponível [<código>]` sem mensagem nem caminho, nunca diz “zero capturas” por omissão, e sempre tenta gravar as barreiras e esperar as invocações. As duas variantes novas provam isso (`end:370-386`), e os leitores saudáveis continuam estritos.
3. **Nota de cobertura (não bloqueante)**: os ramos de listagem que falha, barreira não gravada e invocação rejeitada do apoio têm só leitura de código. O checklist não os reivindica.
4. **C46 e a criação do store estão íntegros**: literais e testemunhas exatas, nenhuma contagem inventada, não vazamento, sem retry, prazo, teto ou serialização novos. As recusas antigas do store e o `on` passaram no gate D.
5. **Pendências fora deste Verifier**: a revisão formal 6 (orquestrador), a CI real depois do push e o uso real (`Unresolved` 2).

## Gate

| Gate | Resultado |
| --- | --- |
| A — alvo de 10 arquivos, Windows, Node 24.22.1, concorrência 4 | 122: 116 pass, 0 fail, 6 skip — exit 0 |
| B — o mesmo, Windows, Node 24.13.0 oficial, npm 11.6.2 adjacente, `npm_execpath` ausente, clone novo com `core.autocrlf=true` | 122: 116 pass, 0 fail, 6 skip — exit 0; `cli.mjs` LF/0 CR e status vazio antes e depois |
| C — o mesmo, WSL Ubuntu uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, `env -i`, PATH sem `/usr/bin`, cópia exata | 122: 116 pass, 0 fail, 6 skip — exit 0 |
| D — `npm test`, Windows, Node 24.22.1, runner padrão (8), 12 nativos do Hermes | **1.004: 984 pass, 0 fail, 20 skip — exit 0** (6 + 16 + 417 + 565) |

## Limpeza

- **`%TEMP%`**: linha de base antes de A (`temp-baseline.json`: 60.334 nomes, 0 `skill-me i4 i25 *`, 30.083 `skill-me *`). `cleanup-temp.mjs` (Node 24.22.1) removeu só diretórios que atendiam a todas estas condições:
  - fora da linha de base;
  - filho direto do `%TEMP%`;
  - prefixo `skill-me i4 ` ou `skill-me i5 `;
  - não link;
  - mtime dentro da janela.

  Rodei uma simulação antes de cada aplicação:
  - **A–C** (13:08:40Z–13:15:40Z): **387 removidos, 0 recusas** — 371 `i4 i25`, 14 `i4 t8`, 1 `i4 ausente` e 1 `i4 secoes`.
  - **D** (13:16:00Z–13:25:40Z, linha de base `temp-before-D.json`): **127 removidos, 0 recusas** — 124 `i4 i5`, 2 `i4 t7` e 1 `i5 c7`.

  Depois: 0 `skill-me i4 i25 *` e de novo 30.083 `skill-me *`. Os nomes `*.tmp` fora do filtro não são meus e ficaram.
- **Clone de B**: removido depois de conferir que o caminho absoluto é `v11/B-clone`, que é diretório e não link, e que o HEAD é `2856380` (`B-clone-cleanup.txt`).
- **WSL**: `wsl-cleanup.sh` removeu `/tmp/skillme-verifier-r11.UiLTdO` depois de conferir o padrão absoluto e o tipo. Restaram 0 scratches `r11`, 0 `skill-me i4 i25 *` e 0 `skill-me i4 t8 *` (`C-wsl-cleanup.txt`).
- **Mantidos em `v11/`** (pasta ignorada): os logs de A, B, C e D, `matrix.txt`, `per-check.txt`, o tar do HEAD, as linhas de base, os relatórios de limpeza e os meus scripts.
- **Estado final**: configuração, estado de review e prefixo npm real não foram tocados. O HEAD continua `2856380`. O `git status` estava vazio antes de gravar este arquivo; depois, só ele aparece modificado.
