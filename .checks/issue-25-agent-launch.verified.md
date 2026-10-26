# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25

**Verdict**: PASS
**Profile**: light
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..9c730e98f748eddb4788533de9734e02042e2c6f` (diff da correção: `2fd858a2a056e768a2a743e9117baef2a1650941..9c730e9`)
**Round**: 3 - scoped
**Verifier**: subagente independente (Claude Opus 5.5), o mesmo das rodadas 1 e 2, sem contexto do implementador; autor ≠ verificador. Verificação somente leitura: nenhum arquivo de produto, teste, critério ou checklist alterado; nenhum commit, push, PR, merge ou `review:run`.

Data: 26/10/2026, 13:48–14:05 (-03). HEAD `9c730e9` do início ao fim; `git status --porcelain=v1 -uall` vazio antes e depois (ao final, só este arquivo). O relatório da rodada 2 (PASS 40/40 em `3c11a9b`, registrado em `2fd858a`) foi lido antes de ser substituído; esse PASS não liberou a entrega, porque a revisão formal em `2fd858a` pediu mudanças. O histórico das rodadas 1 e 2 continua no Git e em `.checks/code-review/issue-25/verifier-round{1,2}/`.

## Veredito em uma linha

**42/42 checks comprovados.** Os dois P2 bloqueantes da revisão formal e os dois refinamentos de C41 estão fechados no código e por provas executadas por mim. O alvo completo (80 testes) passou sem falhas em Windows Node 24.22.1, Windows Node 24.13.0 da CI e WSL com cópia exata. O gate `npm test` no Windows, com o Hermes real, saiu com **0**: integrações 533 testes (522 pass, 0 fail, 11 skip), com os 12 nativos do Hermes executados e aprovados.

## Fontes lidas nesta rodada

| Fonte | Como |
| --- | --- |
| `.checks/issue-25-agent-launch.verified.md` da rodada 2 | inteiro, antes de substituí-lo |
| `.checks/code-review/issue-25/formal-review.stdout.txt` | inteiro (78 linhas): `changes_requested`; AC1, AC3 e AC4 `unmet`; P2 `store.mjs:1071` e P2 `agent.mjs:61`; limitações |
| `.checks/issue-25-agent-launch.md` | diff `2fd858a..HEAD` inteiro: quatro linhas novas do Landing ("Sucessora não publicada", "Descoberta das capturas no encerramento", "Vínculo do ponteiro no encerramento", "Cancelamento antes do agente"), S7 com C41 (e os dois refinamentos) e C42, Handoff. 0 linhas removidas em C1–C40 |
| `.tasks/issue-25-agent-launch.md` | diff inteiro (critérios 33–34 e o resumo) |
| `.checks/code-review/issue-25/context-final.json` | os seis ACs, as seções de escopo e os seis comentários (aprovação completa 6415701125 e autorização da harness 6419121665); idêntico a `context-harness-approved.json` |
| `.checks/issue-25-agent-launch.build.md` | diff inteiro desde `2fd858a`, lido como relato do autor (RED/GREEN, totais, limitações); nenhum número dele foi usado como prova |
| Diff de produto `2fd858a..9c730e9` | `src/integrations/privacy/store.mjs`, `src/integrations/launch/agent.mjs` e `command.mjs`, inteiros; `store.mjs:295-309` (`readCapture`) e `:805-821` (`capturesOfOrigin`) para interpretar erros |
| Diff de provas | `store.unit`, `end.e2e`, `agent.unit` e `command.cli` (C41/C42), inteiros; `docs/traces.md` |
| `tests/integrations/helpers/traces-probe.mjs` | só o portão `SKILL_ME_TEST_TRACES_GATE` usado pelo C42; anterior à base (`bfc6301`, #8) |
| `AGENTS.md`, `verify.md`, drivers `console-ctrl-c.py`/`console-stdio.py`/`pty-session.py` | lidos nas rodadas 1–2; sem diff nesta correção |

Sem fonte vinculante de UI (perfil `light`). Fault injection, `Coverage` e `Test policy` não foram executados, conforme o perfil.

## Ambientes e execuções — verified at `9c730e9`

Execuções em sequência, uma por vez. Logs em `.checks/code-review/issue-25/verifier-round3/` (pasta ignorada).

| # | Ambiente | Comando | Resultado |
| --- | --- | --- | --- |
| A | Windows 11, Node v24.22.1 (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10, Hermes 0.21.4; 13:51–13:52 | `node --test --test-concurrency=4 --test-reporter=spec … --test-reporter=tap … tests/integrations/launch/*.test.mjs tests/integrations/hermes-harness.unit.test.mjs` (`A-win-24.22.1.*`) | 80 testes: **76 pass, 0 fail, 4 skip** (C5-POSIX, C6, C42-POSIX e C15 pty, todos só POSIX), exit 0. Diagnóstico: variante link do C17 omitida (sem privilégio de link de arquivo) |
| B | Windows 11, Node v24.13.0 oficial (zip conferido com `SHASUMS256.txt`), npm 11.6.2 do mesmo zip no início do `PATH`, `npm_execpath` ausente, `npmCli()` = `…\node-v24.13.0-win-x64\node_modules\npm\bin\npm-cli.js`; 13:53–13:54 | o mesmo comando (`B-win-24.13.0.*`) | 80 testes: **76 pass, 0 fail, 4 skip**, exit 0 |
| C | WSL `Ubuntu`, `oldboydev` uid 1000, `/usr/bin/node` v24.13.0 (`/usr/bin/nsolid`), npm 11.6.2, Python 3.12.3, sem Hermes; 13:54–13:55 | cópia por `git -c core.autocrlf=false archive 9c730e9` (sha256 `318b61a1…aef5566d`, `get-tar-commit-id` = `9c730e9…`, árvore extraída `3192b3e9…` = `HEAD^{tree}`, `cli.mjs` 755, shebang LF), `node_modules` copiado (yaml 2.9.0, smol-toml 1.9.1); o mesmo comando (`C-wsl-24.13.0.*`) | 80 testes: **75 pass, 0 fail, 5 skip** (C4 shim, C5 console, C42 console, C8 LOCALAPPDATA, C38 console, todos só Windows), exit 0. Rodaram o C42 POSIX (845 ms), C5-POSIX, C6, C15, C12 de um lado, a variante link do C17 e o 126 do C30. `~/.skill-me` e `~/.skill-me-authorization.json` ausentes antes e depois; árvore igual depois |
| D | Windows, Node v24.22.1, Hermes 0.21.4 real, `SKILL_ME_HERMES_PYTHON` ausente; 13:55–14:03 | `npm test` (`D-npm-test.txt`) | **exit 0**. Governança 6/6. Motor 16/16. Doctor 417: 410 pass, 0 fail, 7 skip. Integrações 533: **522 pass, 0 fail**, 11 skip |

Os 80 nomes do alvo aparecem individualmente em cada TAP; nenhum filtro com 0 testes. Matriz (`matrix.txt`; p/f/s), com cada check aprovado em todo ambiente aplicável:

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
| **C41** | **17p** | **17p** | **17p** |
| **C42** | 3p/1s (POSIX) | 3p/1s (POSIX) | 3p/1s (console) |

**Gate D, nativos do Hermes** (executados e aprovados, nenhum pulado; `D-npm-test.txt:593-604`): I4-C18, I4-C19, I4-C20, I4-C21, I4-C22, I4-C23, I4-C37, I4-C44b, os três I23-C8 e I25-C40 nativo. No mesmo gate também passaram os 17 I25-C41 e os três I25-C42 do Windows.

**Skips do gate D, com motivo**: doctor 7, todos com `skip: process.platform === "win32"` (dois de `agent-resolution`, dois de `fifo-config`, três de `fs-adapter`). Integrações 11: I4-C15 e T8-C4 (`posix-signals`), I4-C25b (`posix-modes`), I4-C25j/k/l (`posix-acl`, só Linux), I4-C25m (`macos-acl`), I25-C5 POSIX, I25-C6, I25-C42 POSIX (sinais POSIX) e I25-C15 (pty só POSIX). Todos são de plataforma; nenhum é nativo do Hermes.

## Achados da revisão formal e refinamentos — verified at `9c730e9`

| Item | Situação | Código | Prova (arquivo:linha — valor) |
| --- | --- | --- | --- |
| **P2 `store.mjs:1071`** — sucessora criada `active` antes do ponteiro; falha no temporário ou no `rename` deixava órfã, repetia o número e escapava do `endLaunch` | **fechado** | `nextLaunchSegment` (`store.mjs:1068-1076`) adota a `active` com `segment` maior que o do ponteiro; senão usa o maior visto + 1. O ponteiro só avança depois de gravado (`:1101-1103`). `capturesOfOrigin:815` relança erro de E/S cru, então uma leitura transitória aborta a sucessão (`io_failure`) em vez de numerar errado. `endLaunch` (`:1163-1203`) apaga o ponteiro e para toda `active` da execução | **Recuperação, número, id e chave**: `store.unit:319-323`, para `temporário` e `rename`: `failed: {code: "io_failure", …, lost: 1}`, `next: LAUNCHED(1)`, `segments: [[1, "stopped", 500], [2, "active", 1]]` (um só segmento 2), `sameSuccessor: true`, ponteiro = `{…, capture: successor.id, segment: 2, …}`, registro pela chave da sucessora. **Fim, retenção e `endedAt`**: `store.unit:335` `[[1, "stopped"], [2, "stopped"]]`; `:338` `endedAt` ISO; `end.e2e:322` `[[1, "stopped", 500], [2, "stopped", 0]]` e `:329` resumo literal sem `active`. **Erro de parada**: `store.unit:357` `["io_failure", true, orphan.id, [orphan.id]]`; `:363` `launch_ended`; `:365` `privacy stop` → `stopped`. **Outra invocação preservada**: `store.unit:378-380`. **Órfã na abertura**: `store.unit:404` `["io_failure", true, only.id, "active"]`; `end.e2e:464` `[5, false, "active"]`, `:469` linha `a captura <id> ficou active; encerre com: … privacy stop …` e o comando a encerra |
| **P2 `agent.mjs:61`** — SIGINT/QUIT/HUP/TERM com `child` null eram descartados e o agente iniciava depois | **fechado** | `guardSignals` (`agent.mjs:60-86`) guarda o primeiro sinal antes do `attach` em `cancelled`; depois do `attach`, o terminal é ignorado e o SIGTERM é repassado ao agente vivo. `launchAgent` confere antes de cada tentativa em `patiently` e depois da abertura (`command.mjs`); `runAgent` confere depois do `await stat` (`agent.mjs:97`) e faz `spawn` + `attach` de forma síncrona | **Cancela, impede o spawn e fecha a captura**: `command.cli:356` POSIX (processo real, lock da abertura ocupado), SIGINT ao grupo com abertura em curso → `{status: null, signal: "SIGINT", started: false, captures: [[1, "stopped", 0]], pointers: [], firstLine: "skill-me: abertura cancelada por SIGINT; o agente não foi iniciado."}`; SIGTERM com o lock mantido → `captures: []`. `command.cli:388`, Windows com `CTRL_C_EVENT` real: `{stage: "done", generated: true, status: 130, started: false, captures: [[1, "stopped", 0]], pointers: [], firstLine: …SIGINT…}`. `agent.unit:194` sinal na conferência do shim → `[{cancelled: "SIGINT"}, false]`, com controle `:199` `[{code: 0, signal: null}, true]`. **Depois do agente vivo**: `agent.unit:150` cancela com o 1º sinal em linux e win32; `:159` win32 sem SIGQUIT `[null, 0]`; `:169` vivo `[null, ["SIGTERM", "SIGTERM"]]` (um por sinal, terminal ignorado); `:174` depois da saída, nada repassado; `:177` ouvintes liberados `[0, 0, 0, 0]`. C5 (`command.cli:160` uma vez cada) e C6 (`:199` SIGTERM uma vez) seguem aprovados |
| **Refinamento 1 (`82837eb`)** — E/S transitória na sucessora não publicada devolvia `ended: true`/`captures: null` e deixava `active` | **fechado** | `discoverLaunch` (`store.mjs:1130-1153`): `StoreError` fica fora, erro de E/S cru vai para `unreadable`, listagem falha → não conferida. `endLaunch` lança `revoked` + `unverified` + `unreadable`. `uncheckedLines` (`command.mjs`) orienta `privacy status`/`stop` (ou `privacy list`) | `store.unit:438` `{rejected: {code: "io_failure", revoked: true, unverified: true, unreadable: [orphan.id], captures: []}}`; `:442` `endedAt` `null` (não tocada); `:446` `privacy status` → `[invocation, "active"]`; `:448` depois do `stop`, `stopped`. Alheia ilegível: `store.unit:456` com `unreadable: [a.capture]`; `:458` a alheia não mudou. Listagem: `store.unit:474` `unreadable: []`; `end.e2e:434` linha da pasta e `privacy list`. Formato inválido alheio fora do resumo: `store.unit:486` `[[opened.capture, 1, "stopped"]]`; `:487` arquivo intocado. Launcher: `end.e2e:390` linha literal das não lidas; `:395` `[2, "active", 0]`; `:402` `["stopped", "stopped"]` depois dos comandos mostrados |
| **Refinamento 2 (`f0d5238`)** — ponteiro de A com `capture` = B parava B ou mandava `privacy stop` de B; com B ilegível, B aparecia como captura de A | **fechado** | `ofLaunch` (`store.mjs:1113`): o `stop` do `endLaunch` só para captura com `origin: "launch"` e a mesma `invocation`; a captura do ponteiro que não pôde ser lida fica para a descoberta. `peekLaunch` (`:1209-1219`, `:1216`) lança `store_invalid` se a captura do ponteiro não for da execução, e o launcher cai na orientação conservadora com a captura que a invocação abriu | `store.unit:505` entrega de A → `store_invalid`; `:507` encerramento de A → `[[a.capture, a.invocation, "stopped"]]`; `:508` bytes de B iguais; `:510` B grava `LAUNCHED(1)`. B ilegível: `store.unit:521` `unreadable: [b.capture], captures: []`; `:523` B intacta. Launcher: `end.e2e:507` o stderr não cita B; `:511-512` B continua gravando `[[1, "active", 1]]`. Diagnóstico com lock alheio: `end.e2e:523` só `a captura <own.id> continua active`; `:534` `["stopped", "active"]` depois do comando mostrado; `:535` B intacta |

Os ACs que a revisão formal deu como `unmet` (AC1, AC3 e AC4) dependiam só desses dois P2. As provas acima cobrem os caminhos apontados. A nova revisão formal cabe ao orquestrador.

## Round 2: carried / reverified

| Item | Situação nesta rodada |
| --- | --- |
| Execução das provas de C1–C40 | **verified at `9c730e9`**: todas rodaram de novo, por inteiro, em A, B, C e D |
| C41 e C42 (novos) | **verified at `9c730e9`**: código e todas as provas lidos; asserções citadas acima e abaixo |
| C5, C6, C25, C26, C27, C29, C30 e C31, que passam por funções de produto mudadas (`guardSignals`, `launchAgent`/`finish`, `summaryLines`, `endLaunch`, `failedEndLines`) | **verified at `9c730e9`**: o conteúdo das asserções não mudou. Conferi que o código novo ainda as satisfaz: `summaryLines` mantém a dica de confiança com `agentRan` verdadeiro (C26) e o erro do `endLaunch` mantém `capture`/`revoked` (C27 `store.unit:253`, C31). Linhas atualizadas por busca literal |
| C16–C24 e C28 (abertura e sucessão: `startLaunch`/`appendLaunch` mudaram) | asserções **carried from `3c11a9b`** (corpo dos testes sem diff); o caminho do produto mudou e as provas reexecutaram verdes |
| C1–C4, C7–C15, C32–C40 | **carried from `3c11a9b`** (relatório da rodada 2). Linhas atualizadas por busca literal em `command.cli` (+1), `agent.unit` (+1) e `end.e2e` (+3). `prepare.cli`, `session.e2e`, `report.cli`, `docs`, `hermes-harness.unit` e o teste nativo não mudaram, e as citações da rodada 2 valem; não afirmo releitura desses testes |
| Swept existing | **carried from `3c11a9b`**, conferido: `lifecycle.mjs`, `traces/` e `observe/` sem diff desde `2fd858a`; `pruneCaptures` (`store.mjs:732`) fora do diff; `stopCapture` (`store.mjs:824-828`) continua por `transition` (`lifecycle.mjs:24`: `stopped` não muda) e agora devolve o estado gravado |
| Core vendorizado | **verified at `9c730e9`**: `scripts/code-review/` e `.github/` sem diff na feature; os 5 blobs iguais aos da base (`25e52841`, `c6a4abcd`, `1bda8e45`, `216125ce`, `b02001e2`) |

## Checks

`cmd` = `tests/integrations/launch/command.cli.test.mjs`, `prep` = `prepare.cli`, `sess` = `session.e2e`, `store` = `store.unit`, `end` = `end.e2e`, `rep` = `report.cli`, `agent` = `agent.unit`, `docs` = `docs.test`, `harn` = `tests/integrations/hermes-harness.unit.test.mjs`, `nat` = `tests/integrations/hermes-plugin.native.test.mjs`. "A/B/C" = aprovado nos três ambientes; o resultado por ambiente está na matriz.

| Check | Proof run | Evidência (arquivo:linha — valor) | Revisão | Result |
| --- | --- | --- | --- | --- |
| C1 | A/B/C | `cmd:48-49` `private: true`, `bin` = `{"skill-me": "src/integrations/launch/cli.mjs"}`; `cmd:65` `[0, SKILL_ME_HELP, ""]`; `cmd:77` `git status` igual | carried | PASS |
| C2 | A/B/C | `cmd:80` `LITERAL_ARGS`; `cmd:96` `{status: 0, stdout, stderrFirst, argv: LITERAL_ARGS, stdin}` | carried | PASS |
| C3 | A/B/C | `cmd:105` `{0: 0, 7: 7}` | carried | PASS |
| C4 | A/B (cli+unit), C (unit) | `cmd:119` `{status: 0, argv: ["exec", "texto com espaço", "--", "ção"], …, sentinel: false}`; `cmd:132` `{status: 127, …}`; `agent:79`, `agent:90, 95, 101` | carried | PASS |
| C5 | POSIX C; Windows A/B | `cmd:156` `launcherGone` = `false`; `cmd:160` `{status: 4, signal: null, signals: ["SIGINT","SIGQUIT","SIGHUP"]}`; `cmd:177` `{stage: "done", generated: true, seen: true, status: 5, signals: ["SIGINT"]}` | verified | PASS |
| C6 | C | `cmd:199` `{status: 0, signal: null, signals: ["SIGTERM"]}` | verified | PASS |
| C7 | A/B/C | `prep:94` `{status: 127, stdout: "", code: true, asked: false}`; `prep:98` | carried | PASS |
| C8 | A/B (2), C (1) | `prep:123`, `prep:126`, `prep:142` | carried | PASS |
| C9 | A/B/C | `prep:164`, `prep:169` `changes` = `[]`, `prep:176` `[rootReal, 1]` | carried | PASS |
| C10 | A/B/C | `prep:189` `{exitCode: 3, code: true, trees: before, started: false, root: false}` | carried | PASS |
| C11 | A/B/C | `prep:200` `{exitCode: 2, code: true, asked: 1, …, config: false}` | carried | PASS |
| C12 | A/B/C (2) | `prep:223` (dois em pipe); `prep:387` cada lado sozinho `{status: 3, required: true, asked: false, …}`; `prep:388` | carried | PASS |
| C13 | A/B/C | `prep:238` `{exitCode: 0, asked: 0, preview: false, …, started: 1}` | carried | PASS |
| C14 | A/B/C | `prep:250`, `prep:266`, `prep:272` ausência, `prep:276`, `prep:290` | carried | PASS |
| C15 | C | `prep:398-400, 403, 408` | carried | PASS |
| C16 | A/B/C (2) | `sess:61` só o par da execução; `sess:67` `{origin: "launch", segment: 1, state: "active", content: true, retentionDays: 7, limits: {maxEvents: 500, maxBytes: 8388608}, …}`; `sess:69`; `agent:123, 126, 128` | carried (produto mudou; reexecutado) | PASS |
| C17 | A/B (link omitido), C (link) | `store:54` ponteiro literal; `store:109` controle `[0, null]`; `store:139` `["store_invalid", 0, before]`; `store:154` `["link_refused", 0]`; `sess:300-301` | carried | PASS |
| C18 | A/B/C | `sess:84` ausência; `sess:109` `performance.now() - started >= 2000`; `sess:111`, `sess:124` | carried | PASS |
| C19 | A/B/C | `sess:147` `[LAUNCHED(1), LAUNCHED(1)]`; `sess:151` 4 registros; `sess:155`; `sess:161` `[0, 0]` | carried | PASS |
| C20 | A/B/C | `sess:190` `binding_invalid` × 4; `sess:192` | carried | PASS |
| C21 | A/B/C | `sess:211` bytes iguais | carried | PASS |
| C22 | A/B/C | `sess:230` `[1, "stopped", 500, 500, {}]`; `sess:236` `[2, "stopped", 4, {}, true, 7, {…}, "launch", …]`; `sess:244` chave própria | carried (sucessão mudou; reexecutado) | PASS |
| C23 | A/B/C | `sess:282` `["active", 8388608, {}, 1]`; `sess:289`; `sess:291` `[2, 1, size, {}]` | carried (idem) | PASS |
| C24 | A/B/C | `store:168` `[opened.capture, "stopped", 1]`; `store:169` `[2, "active", 1, first.launchedAt]` | carried (idem) | PASS |
| C25 | A/B/C | `end:72-79` 2 capturas `stopped`, `endedAt` ISO, `{unknown_event: 1}`, status 3; `end:85` linha literal | verified | PASS |
| C26 | A/B/C | `end:104` `nada foi gravado nesta execução. Confira a confiança do agente: <step>` (com `agentRan` verdadeiro) | verified | PASS |
| C27 | A/B/C (3) | `end:120` `{launch: true, code: "launch_ended", entries: 1, committed: 0, persisted: 0, lost: 1}`; `store:222` `ended` = `false`; `store:234`; `store:253` `["io_failure", true, opened.capture]`; `store:259` | verified | PASS |
| C28 | A/B/C | `end:147` `{started: true, delivered: true, enqueued: 3, sent: 3, queueFull: 0, failed: 0}`; `end:153` `{persisted: 3, …, status: 0}` | carried (encerramento mudou; reexecutado) | PASS |
| C29 | C (POSIX); A/B | `cmd:210` `{status: null, signal, summary: true}`; `cmd:227`; `cmd:232` todas `stopped` | verified | PASS |
| C30 | A/B/C | `cmd:244` ausência; `cmd:274` `{status, startCode: true, captures: [[1, "stopped", 0]]}` | verified | PASS |
| C31 | A/B/C (2) | `end:166` status 6; `end:172` linha "continua aberta"; `end:176` `["active", true]`; `end:180` ausência do lock; `end:211` "já não recebe registros"; `end:215` `["active", false]` | verified | PASS |
| C32 | A/B/C | `end:242` `["stopped", "active"]`; `end:252` `[1, 1]` | carried | PASS |
| C33 | A/B/C | `end:273` `[0, "off", []]`; `end:278` 3 × `LAUNCHED(1)`; `end:283` automáticas `[]` | carried | PASS |
| C34 | A/B/C (3) | `rep:82`, `rep:90-93`, `rep:95`, `rep:104`, `rep:140-143`, `rep:150`, `rep:166, 169` | carried | PASS |
| C35 | A/B/C | `rep:182-189` `[3, {"schemaVersion":1,…}\n, ""]` × 3 | carried | PASS |
| C36 | A/B/C | `cmd:282` `[0, SKILL_ME_HELP, ""]`; `cmd:286` `[2, "", SKILL_ME_HELP]` | carried | PASS |
| C37 | A/B/C (3) | `docs:14, 49, 51, 57, 60-61, 82, 89, 93` (o `docs/traces.md` mudou; a prova reexecutou verde) | carried | PASS |
| C38 | A/B | `prep:350, 355, 357-359, 363, 365` | carried | PASS |
| C39 | A/B/C (3); D | `harn:88, 100-102, 109-110, 186-188`; nativos no gate D | carried | PASS |
| C40 | A/B/C (2); D | `harn:196-198, 201, 207-208, 214-219, 222-225`; `nat:335, 338, 340`; I4-C20/C21/C37 aprovados em D | carried | PASS |
| C41 | A/B/C (17 cada); D (17) | `store:319-323`, `store:335, 338`, `store:357, 363, 365`, `store:378-380`, `store:404`, `store:438, 442, 446, 448`, `store:456, 458`, `store:474`, `store:486-487`, `store:505-510`, `store:521, 523`; `end:322, 329`, `end:390, 395, 402`, `end:434, 439`, `end:464, 469`, `end:506-512`, `end:523, 534-535` (valores na seção anterior) | verified | PASS |
| C42 | A/B (unit 2 + console 1), C (unit 2 + POSIX 1); D | `agent:150, 159, 169, 174, 177, 194, 199`; `cmd:356` (POSIX) e `cmd:388` (Windows, 130) — valores na seção anterior | verified | PASS |

**Checks comprovados: 42/42.**

## Nível, amostragem e limitações que continuam reais

- Perfil `light`: sem fault injection. Os RED dos dois P2 e dos dois refinamentos são evidência do autor (`builder-formal-fix/`, `builder-final-refine/`), não minha. As provas que executei afirmam valores exatos (`segments`, `unreadable`, bytes de B, `status: 130`, primeira linha literal), e o comportamento anterior descrito na revisão formal não as satisfaria.
- Ramo de várias capturas na falha do encerramento (`as capturas X, Y continuam active`, várias linhas `encerre com`): nenhuma prova o exercita com duas capturas. Pela leitura, uma falha só deixa no máximo uma captura `active` por execução (a do ponteiro, ou a sucessora não publicada com a do ponteiro já `stopped`); o caso de uma captura é provado (`store:357`; C31 `end:166-215`). Isto não reduz o claim de C41 nos estados alcançáveis.
- C42: o claim (primeira linha, sem agente, captura `stopped`, sinal/130) é provado. Dois detalhes do Landing fora do claim não têm asserção: o resumo sem a dica de confiança (por leitura: `summaryLines` com `agentRan: false`) e a ausência dos 750 ms (por leitura: `finish` não chama `sleep`). A janela da conferência do shim é provada em processo (`agent:194`), não pelo processo real.
- O diagnóstico com ponteiro de outra execução (ou ilegível) e encerramento que nem começou orienta `privacy stop` da captura que a invocação abriu (segmento 1). Se a execução já tinha passado a outro segmento, essa captura pode estar `stopped`. É o comportamento do Landing "Vínculo do ponteiro no encerramento", declarado pelo autor; não é lacuna do claim.
- O gate D desta rodada rodou com `Popen` rápido (0–16 ms, `D-popen-latency-before.txt`), não com os 453–469 ms da rodada 2; a condição lenta foi provada na rodada 2 e continua coberta pelo `hermes-harness.unit` (atraso de 470/700 ms).
- Continuam da rodada 2: recusa e EOF num console real do Windows só em processo/pty; nativos do Hermes pulados na CI; C23 sem asserção de tempo; uso real sem sessão de agente (`Unresolved` 2, `blocks go-live`); macOS e runner da CI não executados.

## Findings

Nenhum achado bloqueante. Os dois P2 da revisão formal e os dois refinamentos de C41 estão fechados; não há achado novo além das notas acima.

## Gate

| Gate | Resultado |
| --- | --- |
| Alvo completo, Windows, Node 24.22.1 | 80: 76 pass, 0 fail, 4 skip — exit 0 |
| Alvo completo, Windows, Node 24.13.0 (CI) | 80: 76 pass, 0 fail, 4 skip — exit 0 |
| Alvo completo, WSL Ubuntu, Node 24.13.0, uid 1000, cópia exata | 80: 75 pass, 0 fail, 5 skip — exit 0 |
| `npm test`, Windows, Node 24.22.1, Hermes real | exit 0 — 6/6; 16/16; doctor 417 (410 pass, 7 skip); integrações 533 (522 pass, 0 fail, 11 skip) |

Cada suíte rodou uma única vez; nenhuma foi repetida até ficar verde.

## Limpeza

- `%TEMP%`: os 273 scratches `skill-me i4 i25 * ação-*` da janela da execução B (o `after` com `rmSync` do 24.13.0 não os apaga; 0 fora da janela) foram removidos por um único processo Node 24.22.1 que confere o caminho resolvido dentro do `%TEMP%` (`cleanup-temp.mjs`/`.txt`), com 0 recusas.
- WSL: `/tmp/skillme-verifier-r3.Bk1uoF` removido após a conferência do padrão.
- Nenhum processo de outra sessão foi encerrado. Histórico, estado de review, perfis pessoais e prefixo npm real não foram tocados.
