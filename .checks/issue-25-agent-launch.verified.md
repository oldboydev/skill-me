# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25

**Verdict**: PASS
**Profile**: light
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..e710dc629b4addb790374955792d1babf1be87f2` (diff da correção: `6d57e6e6719425cdf8255d90bd2475b9049893de..e710dc6`; a rodada 3 verificou `9c730e9`, e `6d57e6e` só registrou o relatório)
**Round**: 4 - scoped. Rodada adicional autorizada só para a #25 pelo proprietário: “Autorizar as duas rodadas adicionais” ([comentário 6423912091](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6423912091)). As rodadas 1–3 continuam no histórico; nenhuma quinta foi autorizada.
**Verifier**: subagente independente (Claude Opus 5.5), o mesmo das rodadas 1–3, sem contexto do implementador; autor ≠ verificador. Verificação somente leitura: nenhum arquivo de produto, teste, critério, checklist ou configuração alterado; nenhum commit, push, PR, merge ou `review:run`.

Data: 26/10/2026, 15:21–15:40 (-03). HEAD `e710dc6` do início ao fim; `git status --porcelain=v1 -uall` vazio antes e depois (ao final, só este arquivo). O relatório da rodada 3 (PASS 42/42 em `9c730e9`, registrado em `6d57e6e`) foi lido antes de ser substituído. Ele não validou estas correções: a segunda revisão formal, em `6d57e6e`, pediu mudanças.

## Veredito em uma linha

**44/44 checks comprovados.** Os dois P2 bloqueantes da segunda revisão formal (`store.mjs:1042` e `settle.py:26`) e a variante no encerramento (C43 (e)) estão fechados no código e por provas que executei. O alvo completo (95 testes) passou sem falhas em Windows Node 24.22.1, Windows Node 24.13.0 da CI e WSL com cópia exata. O gate `npm test` no Windows, com o Hermes real, saiu com **0**: integrações 548 testes (537 pass, 0 fail, 11 skip), com os 12 nativos do Hermes, I4-C22 e I25-C40 inclusos, executados e aprovados.

## Fontes lidas nesta rodada

| Fonte | Como |
| --- | --- |
| `.checks/issue-25-agent-launch.verified.md` da rodada 3 | estrutura e conclusões, antes de substituí-lo (texto meu, registrado em `6d57e6e`) |
| `.checks/code-review/issue-25/formal-review2.stdout.txt` | inteiro (78 linhas): `changes_requested`; AC4 e AC6 `unmet`; P2 `store.mjs:1042` e P2 `settle.py:26`; limitações |
| `.checks/issue-25-agent-launch.md` | diff `6d57e6e..HEAD` inteiro: Landing "Lock após a abertura" e "Leitura transitória na espera da harness"; S8 com C43 (a)–(e) e C44; Handoff com a exceção |
| `.tasks/issue-25-agent-launch.md` | diff inteiro (critérios 35–36 e a fonte da exceção) |
| `.checks/code-review/issue-25/context-exception-approved.json` | seis ACs e oito comentários; os dois últimos (o handoff e a autorização 6423912091) lidos inteiros |
| `code-review.config.json` | diff da feature: só `roundOverrides["25"] = {profile: "light", maxRounds: 3, approval: <registro 6423912091>}`, 0 linhas removidas; perfis globais `light`/`ui`/`direct` com `maxRounds` 2; os overrides das outras issues iguais |
| `.checks/issue-25-agent-launch.build.md` | diff inteiro desde `6d57e6e`, lido como relato do autor (RED/GREEN, números, limitações); nenhum número dele foi usado como prova |
| Diff de produto `6d57e6e..e710dc6` | `src/integrations/privacy/store.mjs` e `src/integrations/launch/command.mjs`, inteiros; `store.mjs:60-207` (`storeOp`, `readSmallFile`, `holdLockFile`, `withLock`) para interpretar os erros da liberação. `holdLockFile` não mudou (última mudança `7f671e3`, anterior à base) |
| Diff de provas | `store.unit`, `end.e2e` (C43), `hermes-harness.unit` (C44), `traces-probe.mjs` (`SKILL_ME_TEST_TRACES_LOCK_KEPT`) e `settle.py`, inteiros; `docs/traces.md` |
| Plugin Hermes | `__init__.py:59-64` (`observer_stats`), `:174-208` (`_disable_and_drain`/worker), `:221-235` (callback), para avaliar C44; sem diff na feature inteira. `hermes-plugin.native.test.mjs` I4-C22 lido; sem diff desde `6d57e6e` |
| `AGENTS.md`, `verify.md` e demais drivers | lidos nas rodadas 1–3; sem diff nesta correção |

Sem fonte vinculante de UI (perfil `light`). Fault injection, `Coverage` e `Test policy` não foram executados, conforme o perfil. Os 16 testes do motor no gate são testes unitários, não revisões formais.

## Ambientes e execuções — verified at `e710dc6`

Execuções em sequência, uma por vez. Logs em `.checks/code-review/issue-25/verifier-round4/` (pasta ignorada).

| # | Ambiente | Comando | Resultado |
| --- | --- | --- | --- |
| A | Windows 11, Node v24.22.1 (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10, Hermes 0.21.4; 15:24–15:26 | `node --test --test-concurrency=4 --test-reporter=spec … --test-reporter=tap … tests/integrations/launch/*.test.mjs tests/integrations/hermes-harness.unit.test.mjs` (`A-win-24.22.1.*`) | 95 testes: **91 pass, 0 fail, 4 skip** (C5-POSIX, C6, C42-POSIX e C15 pty, todos só POSIX), exit 0. Diagnóstico: variante link do C17 omitida (sem privilégio de link de arquivo) |
| B | Windows 11, Node v24.13.0 oficial (zip conferido com `SHASUMS256.txt`), npm 11.6.2 do mesmo zip no início do `PATH`, `npm_execpath` ausente, `npmCli()` = `…\node-v24.13.0-win-x64\node_modules\npm\bin\npm-cli.js`; 15:26–15:28 | o mesmo comando (`B-win-24.13.0.*`) | 95 testes: **91 pass, 0 fail, 4 skip**, exit 0 |
| C | WSL `Ubuntu`, `oldboydev` uid 1000, `/usr/bin/node` v24.13.0 (`/usr/bin/nsolid`), npm 11.6.2, Python 3.12.3, sem Hermes; 15:28–15:29 | cópia por `git -c core.autocrlf=false archive e710dc6` (sha256 `f4b6536d…1e61de1ceb`, `get-tar-commit-id` = `e710dc6…`, árvore extraída `ad2d4141…` = `HEAD^{tree}`, `cli.mjs` 755, shebang LF), `node_modules` copiado (yaml 2.9.0, smol-toml 1.9.1); o mesmo comando (`C-wsl-24.13.0.*`) | 95 testes: **90 pass, 0 fail, 5 skip** (C4 shim, C5 console, C42 console, C8 LOCALAPPDATA, C38 console, todos só Windows), exit 0. Rodaram os três C43 de processo real, o C42 POSIX, C5-POSIX, C6, C15, a variante link do C17 e o 126 do C30. `~/.skill-me` e `~/.skill-me-authorization.json` ausentes antes e depois; árvore igual depois |
| D | Windows, Node v24.22.1, Hermes 0.21.4 real, `SKILL_ME_HERMES_PYTHON` ausente; `Popen` do `node.exe` 0–16 ms antes; 15:29–15:37 | `npm test` (`D-npm-test.txt`) | **exit 0**. Governança 6/6. Motor 16/16. Doctor 417: 410 pass, 0 fail, 7 skip. Integrações 548: **537 pass, 0 fail**, 11 skip |
| E | Windows, Node v24.22.1 | sonda própria `probe-lock-absent.mjs` (só API pública e helpers de teste, scratch próprio) para a variante "lock ausente" de C43 | ver C43 abaixo |

Os 95 nomes do alvo aparecem individualmente em cada TAP; nenhum filtro com 0 testes. Matriz (`matrix.txt`; p/f/s), sem nenhuma falha:

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
| C27, C34, C37, C39 | 3p cada | 3p cada | 3p cada |
| C38 | 1p | 1p | 1s |
| C41 | 17p | 17p | 17p |
| C42 | 3p/1s (POSIX) | 3p/1s (POSIX) | 3p/1s (console) |
| **C43** | **12p** | **12p** | **12p** |
| **C44** | **3p** | **3p** | **3p** |

**Gate D, nativos do Hermes** (executados e aprovados, nenhum pulado; `D-npm-test.txt:596-607`): I4-C18, I4-C19, I4-C20, I4-C21, I4-C22, I4-C23, I4-C37, I4-C44b, os três I23-C8 e I25-C40 nativo. No mesmo gate também passaram os 12 I25-C43 e os 3 I25-C44.

**Skips do gate D, com motivo**: doctor 7, todos com `skip: process.platform === "win32"` (POSIX/FIFO). Integrações 11: I4-C15 e T8-C4 (`posix-signals`), I4-C25b (`posix-modes`), I4-C25j/k/l (`posix-acl`, só Linux), I4-C25m (`macos-acl`), I25-C5 POSIX, I25-C6, I25-C42 POSIX (sinais POSIX) e I25-C15 (pty só POSIX). Todos são de plataforma; nenhum é nativo do Hermes.

## Segunda revisão formal — verified at `e710dc6`

| Item | Situação | Código | Prova (arquivo:linha — valor) |
| --- | --- | --- | --- |
| **P2 `store.mjs:1042`** — segmento 1 e ponteiro gravados, `unlink` do lock falha; IDs se perdiam e a raiz ficava com lock e captura `active` sem orientação | **fechado** | `keepingResult` (`store.mjs:1074-1082`) guarda o resultado do callback. Se só a liberação falhar, o erro leva `describe(resultado)`, `lockPath` e `lockLeft: !(error instanceof StoreError)` (`:1080`). Falha do callback sai sem resultado (`:1079`). `startLaunch` descreve `{…opened, opened: true}` (`:1063`). `holdLockFile` não mudou: o erro do callback tem prioridade (`:192`), bytes ausentes ou trocados → `root_changed` (`:189`) e nunca remove lock alheio. No launcher, `unconfirmedOpening` (`command.mjs:190-195`, acionado em `:208`) não inicia o agente, escreve a linha da abertura, chama o encerramento de sempre e, se ele não concluir, `sayLockLeft` (`:159-164`, só com `lockLeft`) | **(a) E/S, lock fica**: `store.unit:560` `{code: "io_failure", opened: true, invocation, capture, launchedAt, lockPath: <raiz>/skill-me-privacy/.lock, lockLeft: true}`; `:561` `[1, "active", null, <capture>]`; `:562` lock com `pid` desta invocação; `:564` nova abertura → `lock_present`; `:565, 570` outra execução byte a byte igual; `:571` depois da recuperação declarada, `LAUNCHED(1)`. Launcher: `end.e2e:606` `[5, false]` (agente não iniciado); `:607` stderr literal = linha da abertura + as três linhas de `lock_present` + a linha do lock com o `pid`; `:610` a outra execução recebe `lock_present` só enquanto o lock existe; `:614` `LAUNCHED(1)` depois. Sempre falhando: `end.e2e:625` `[4, false, "skill-me: não foi possível abrir a execução [lock_present]\n"]`, `:626` nenhuma captura nova. Processo real: `end.e2e:660` `[5, false, result.pid]`; `:661` stderr literal com o `pid` do launcher (já terminado); `:666` nova abertura inicia o agente após a recuperação. **(b) confirmação perdida**: `store.unit:578-581`; processo real `end.e2e:685` `["stopped", false, false]` e stderr sem linha de lock. **(c) lock trocado**: `store.unit:598` `root_changed`, `lockLeft: false`; `:599` lock alheio byte a byte; launcher `end.e2e:647-649` saída 4, stderr sem a linha do lock, lock alheio intacto. **(d) prioridade**: `store.unit:619` `["io_failure", undefined, undefined, "stopped"]`. **Lock ausente** (sonda E): store `root_changed`, `opened: true`, `lockLeft: false`; launcher saída 4, agente não iniciado, encerramento concluído (`stopped`, sem ponteiro) e nenhuma linha de lock (`probe-lock-absent.txt`) |
| **Variante no encerramento (C43 (e), `d71c143`)** — com captura já `stopped` e ponteiro fora, `unlink` do lock com EIO dizia `continua active` | **fechado** | `endLaunch` usa o mesmo `keepingResult` com `(closed) => ({closed})` (`store.mjs:1227`). O `finish` do launcher (`command.mjs:176-181`) escreve o resumo de `closed`, depois `a execução <inv> foi encerrada, mas a liberação do lock da raiz falhou [<código>].` e a linha do lock, e devolve `true` (sem `failedEndLines`) | `store.unit:628` `{code: "io_failure", ended: true, captures: [[<capture>, "stopped"]], lockPath, lockLeft: true}`; `:630` `[[1, "stopped", 0]]`; `:632` lock com o `pid`. Launcher em processo: `end.e2e:727` `[3, true]` (saída do agente); `:728` stderr literal (`endReleaseLines`: resumo com `stopped`, linha da liberação, linha do lock; nenhuma `continua active`); `:707` `skill-me report` → `[4, "lock_present"]` enquanto o lock existe; `:737` `[invocation, false]` depois da recuperação. Processo real: `end.e2e:749` `[0, true, result.pid]`; `:750` stderr literal; `:754` `report` → 0 depois de remover o lock |
| **P2 `settle.py:26`** — `active` falso com `deliveryFailed` 0 e registros pendentes virava `inactive`; perda parcial encerrava | **fechado** | `delivery_state` (`settle.py:32-36`): com `active`, sem mudança; sem `active`, `pending` enquanto `processed + deliveryFailed < enqueued`, depois `failed` se `deliveryFailed > 0`, senão `inactive`. `wait_for_delivery` e o padrão `DEFAULT_SETTLE_MAX_MS = 5000` (`:13`) não mudaram. Plugin, callbacks, `harness.py` e o teste nativo sem diff | `harn:264-268` `"desligada, perda ainda não contada": "pending"`, `"perda contada em parte": "pending"`, `"perda contada inteira": "failed"`, `"sem destino": "inactive"`; `harn:281-283` a sequência ativa → desligada sem perda → parcial → final termina `failed` em [400, 451) ms com os contadores finais; `harn:286` `[1000, "timeout"]`; `harn:289` `[5000, "timeout"]` (padrão); harness real com Hermes simulado: `harn:300-302` `failed`, contadores finais, `waitedMs >= 600`; `harn:304` sem destino `["inactive", 0, 0]`. Nativo (D): I4-C22 (`deliveryFailed >= 1`, `active === false`) e I25-C40 (`spawnfail`/`exit`/`disconnect` → `failed`) aprovados |
| **Exceção e configuração (`e710dc6`)** | **conferido** | Fonte explícita: comentário 6423912091 em `context-exception-approved.json` e na task (Sources). `code-review.config.json` só acrescenta `roundOverrides["25"]`; tetos globais e das outras issues iguais; core vendorizado sem diff | — |

Os ACs da segunda revisão formal dados como `unmet` (AC4 e AC6) dependiam só desses dois P2. A terceira revisão formal cabe ao orquestrador.

## Rodada 3: carried / reverified

| Item | Situação nesta rodada |
| --- | --- |
| Execução das provas de C1–C42 | **verified at `e710dc6`**: todas rodaram de novo, por inteiro, em A, B, C e D |
| C43 e C44 (novos) | **verified at `e710dc6`**: código e todas as provas lidos; asserções citadas acima |
| Revisão das asserções de C1–C42 | **carried from `9c730e9`** (relatório da rodada 3): o diff da correção não toca o corpo desses testes. `store.unit` e `end.e2e` só trocaram imports na mesma linha e acrescentaram testes no fim; `hermes-harness.unit` só acrescentou no fim. Conferi por amostragem que as citações continuam nas mesmas linhas (`store:319, 357, 521`; `end:166, 322, 523`; `harn:100, 218`; `cmd:356`; `agent:194`). Os outros arquivos de teste do alvo não mudaram |
| Caminhos de produto de C25–C33 e C41 (`endLaunch` reestruturado em `keepingResult`) | asserções carried; reexecutadas verdes em A/B/C/D. O corpo do callback do `endLaunch` é o da rodada 3, só reindentado |
| Swept existing | **carried from `9c730e9`**, conferido: `lifecycle.mjs`, `traces/` e `observe/` sem diff desde `6d57e6e`; `pruneCaptures` e `holdLockFile` fora do diff |
| Core vendorizado | **verified at `e710dc6`**: `scripts/` e `.github/` sem diff na feature; os 5 blobs de `scripts/code-review/` iguais aos da base |

## Checks

`cmd` = `tests/integrations/launch/command.cli.test.mjs`, `prep` = `prepare.cli`, `sess` = `session.e2e`, `store` = `store.unit`, `end` = `end.e2e`, `rep` = `report.cli`, `agent` = `agent.unit`, `docs` = `docs.test`, `harn` = `tests/integrations/hermes-harness.unit.test.mjs`, `nat` = `tests/integrations/hermes-plugin.native.test.mjs`. "A/B/C" = aprovado nos três ambientes.

| Check | Proof run | Evidência (arquivo:linha — valor) | Revisão | Result |
| --- | --- | --- | --- | --- |
| C1 | A/B/C | `cmd:48-49` `private: true`, `bin`; `cmd:65` `[0, SKILL_ME_HELP, ""]`; `cmd:77` | carried | PASS |
| C2 | A/B/C | `cmd:80` `LITERAL_ARGS`; `cmd:96` `{status: 0, …, argv: LITERAL_ARGS, stdin}` | carried | PASS |
| C3 | A/B/C | `cmd:105` `{0: 0, 7: 7}` | carried | PASS |
| C4 | A/B, C (unit) | `cmd:119`, `cmd:132` `{status: 127, …}`; `agent:79, 90, 95, 101` | carried | PASS |
| C5 | POSIX C; Windows A/B | `cmd:156`; `cmd:160` `signals: ["SIGINT","SIGQUIT","SIGHUP"]`; `cmd:177` `status: 5, signals: ["SIGINT"]` | carried | PASS |
| C6 | C | `cmd:199` `signals: ["SIGTERM"]` | carried | PASS |
| C7 | A/B/C | `prep:94`, `prep:98` | carried | PASS |
| C8 | A/B (2), C (1) | `prep:123, 126, 142` | carried | PASS |
| C9 | A/B/C | `prep:164, 169, 176` | carried | PASS |
| C10 | A/B/C | `prep:189` | carried | PASS |
| C11 | A/B/C | `prep:200` | carried | PASS |
| C12 | A/B/C (2) | `prep:223`, `prep:387-388` | carried | PASS |
| C13 | A/B/C | `prep:238` | carried | PASS |
| C14 | A/B/C | `prep:250, 266, 272, 276, 290` | carried | PASS |
| C15 | C | `prep:398-400, 403, 408` | carried | PASS |
| C16 | A/B/C (2) | `sess:61, 67, 69`; `agent:123, 126, 128` | carried | PASS |
| C17 | A/B (link omitido), C (link) | `store:54, 109, 139, 154`; `sess:300-301` | carried | PASS |
| C18 | A/B/C | `sess:84, 109, 111, 124` | carried | PASS |
| C19 | A/B/C | `sess:147, 151, 155, 161` | carried | PASS |
| C20 | A/B/C | `sess:190, 192` | carried | PASS |
| C21 | A/B/C | `sess:211` | carried | PASS |
| C22 | A/B/C | `sess:230, 236, 244` | carried | PASS |
| C23 | A/B/C | `sess:282, 289, 291` | carried | PASS |
| C24 | A/B/C | `store:168-169` | carried | PASS |
| C25 | A/B/C | `end:72-79, 85` | carried | PASS |
| C26 | A/B/C | `end:104` | carried | PASS |
| C27 | A/B/C (3) | `end:120`; `store:222, 234, 253, 259` | carried | PASS |
| C28 | A/B/C | `end:147, 153` | carried | PASS |
| C29 | C (POSIX); A/B | `cmd:210, 227, 232` | carried | PASS |
| C30 | A/B/C | `cmd:244, 274` | carried | PASS |
| C31 | A/B/C (2) | `end:166, 172, 176, 180, 211, 215` | carried | PASS |
| C32 | A/B/C | `end:242, 252` | carried | PASS |
| C33 | A/B/C | `end:273, 278, 283` | carried | PASS |
| C34 | A/B/C (3) | `rep:82, 90-93, 95, 104, 140-143, 150, 166, 169` | carried | PASS |
| C35 | A/B/C | `rep:182-189` | carried | PASS |
| C36 | A/B/C | `cmd:282, 286` | carried | PASS |
| C37 | A/B/C (3) | `docs:14, 49, 51, 57, 60-61, 82, 89, 93` (o `docs/traces.md` mudou; a prova reexecutou verde) | carried | PASS |
| C38 | A/B | `prep:350, 355, 357-359, 363, 365` | carried | PASS |
| C39 | A/B/C (3); D | `harn:88, 100-102, 109-110, 186-188` | carried | PASS |
| C40 | A/B/C (2); D | `harn:196-198, 201, 207-208, 214-219, 222-225`; `nat:335, 338, 340` | carried | PASS |
| C41 | A/B/C (17 cada); D | `store:319-323, 335, 338, 357, 363, 365, 378-380, 404, 438, 442, 446, 448, 456, 458, 474, 486-487, 505-510, 521, 523`; `end:322, 329, 390, 395, 402, 434, 439, 464, 469, 506-512, 523, 534-535` | carried | PASS |
| C42 | A/B (unit 2 + console 1), C (unit 2 + POSIX 1); D | `agent:150, 159, 169, 174, 177, 194, 199`; `cmd:356`, `cmd:388` | carried | PASS |
| C43 | A/B/C (12 cada); D (12); sonda E | `store:560-562, 564-565, 570-571, 578-581, 598-599, 619, 628, 630, 632`; `end:606-608, 610, 614, 622-626, 647-649, 660-662, 666, 685, 707, 727-729, 737, 749-751, 754` (valores na seção anterior) | verified | PASS |
| C44 | A/B/C (3 cada); D (3 + nativos I4-C22, I25-C40) | `harn:264-268, 281-283, 286, 289, 300-302, 304`; nativos em `D-npm-test.txt:600, 603` | verified | PASS |

**Checks comprovados: 44/44.**

## Nível, amostragem e limitações que continuam reais

- Perfil `light`: sem fault injection. Os RED das duas correções e de C43 (e) são evidência do autor (`builder-formal2/`), não minha. As provas que executei afirmam valores exatos (`opened`, `lockLeft`, `pid` do lock, stderr literal, `[5, false]`, estados `pending`/`failed`/`timeout`), e o comportamento anterior descrito na revisão formal não as satisfaria.
- **C43, lock ausente**: o claim mapeia `root_changed` para lock "ausente ou com outros bytes", e as provas nomeadas exercitam só o trocado. Os dois caem na mesma condição de `holdLockFile:189`, sem diff, e no mesmo `lockLeft: false` (`store.mjs:1080`). Para não deixar isso só por leitura, rodei a sonda E pela API pública, que confirmou o comportamento (store e launcher). Fica sem teste de regressão no repositório para essa variante; a anoto como nota, não como falha do check.
- **C43, recuperação manual**: com o lock da invocação preso por E/S persistente, a recuperação é manual e depende de a E/S voltar e de o processo do `pid` ter terminado. As provas exercitam exatamente essas condições. Não há nova tentativa nem remoção automática (decisão do Landing; um comando `unlock` está fora do escopo).
- **C44, janelas do plugin** (declaradas pelo autor; o plugin não podia mudar): (1) `deliveryFailed` também conta callbacks recusados depois do desligamento, então a soma pode fechar antes de a perda drenada ser contada. O estado sai `failed`, correto, com `deliveryFailed` menor que o final; as asserções nativas pedem `>= 1` (I4-C22) e o estado (I25-C40), e continuam válidas. (2) Um registro posto na fila depois da drenagem nunca é contado e leva a `timeout`. Isso daria falha visível, nunca falso `concluded`/`failed`, mas é um risco residual de intermitência no I25-C40 nativo que não se manifestou aqui.
- O gate D rodou com `Popen` rápido (0–16 ms). A condição lenta foi provada na rodada 2 e segue coberta pelo `hermes-harness.unit` (atrasos de 470/700 ms).
- Continuam das rodadas anteriores: o ramo de várias capturas `active` na falha do encerramento sem prova (inalcançável por uma falha só); recusa e EOF num console real do Windows só em processo/pty; nativos do Hermes pulados na CI; C23 sem asserção de tempo; uso real sem sessão de agente (`Unresolved` 2, `blocks go-live`); macOS e runner da CI não executados.

## Findings

Nenhum achado bloqueante. Os dois P2 da segunda revisão formal e a variante do encerramento estão fechados. A única nota nova é a variante "lock ausente" de C43 sem teste nomeado no repositório, com o comportamento comprovado pela sonda E.

## Gate

| Gate | Resultado |
| --- | --- |
| Alvo completo, Windows, Node 24.22.1 | 95: 91 pass, 0 fail, 4 skip — exit 0 |
| Alvo completo, Windows, Node 24.13.0 (CI) | 95: 91 pass, 0 fail, 4 skip — exit 0 |
| Alvo completo, WSL Ubuntu, Node 24.13.0, uid 1000, cópia exata | 95: 90 pass, 0 fail, 5 skip — exit 0 |
| `npm test`, Windows, Node 24.22.1, Hermes real | exit 0 — 6/6; 16/16; doctor 417 (410 pass, 7 skip); integrações 548 (537 pass, 0 fail, 11 skip) |

Cada suíte rodou uma única vez; nenhuma foi repetida até ficar verde.

## Limpeza

- `%TEMP%`: os 314 scratches `skill-me i4 i25 * ação-*` da janela da execução B (o `after` com `rmSync` do 24.13.0 não os apaga; 0 fora da janela) foram removidos por um único processo Node 24.22.1 que confere o caminho resolvido dentro do `%TEMP%` (`cleanup-temp.mjs`/`.txt`), com 0 recusas. A sonda E apagou os próprios scratches com o Node 24.22.1.
- WSL: `/tmp/skillme-verifier-r4.TRNt4j` removido após a conferência do padrão.
- Nenhum processo de outra sessão foi encerrado. Histórico, estado de review, configuração, perfis pessoais e prefixo npm real não foram tocados.
