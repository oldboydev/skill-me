# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25

**Verdict**: PASS
**Profile**: light
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..3c11a9b88a8a6037d74e1ba44402547e378233d1` (diff da correção: `da2467d950eb6f7247f52b4234964dc92e25a553..3c11a9b`)
**Round**: 2 - scoped
**Verifier**: subagente independente (Claude Opus 5.5), o mesmo despachado pelo orquestrador na rodada 1, sem contexto do implementador; autor ≠ verificador. Verificação somente leitura: nenhum arquivo de produto, teste ou checklist alterado; nenhum commit, push, PR, merge ou `review:run`.

Data: 26/10/2026, 12:26–12:45 (-03). HEAD `3c11a9b` durante toda a verificação; `git status --porcelain=v1 -uall` vazio antes e depois (ao final, só este arquivo). O relatório da rodada 1 (FAIL, 32/37) foi lido antes de ser substituído e continua no histórico (`7ff3923`) e em `.checks/code-review/issue-25/verifier-round1/`.

## Veredito em uma linha

**40/40 checks comprovados.** O alvo completo (59 testes) passou sem falhas nos três ambientes: Windows Node 24.22.1, Windows Node 24.13.0 da CI e WSL com cópia exata. O gate `npm test` no Windows, com o Hermes real, saiu com **0** e rodou os 12 testes nativos do Hermes (11 anteriores + I25-C40), todos aprovados, na mesma condição de `Popen` lento (453–469 ms) que derrubava a harness antiga. Os sete achados da rodada 1 estão fechados. Nenhum achado novo bloqueia.

## Fontes lidas nesta rodada

| Fonte | Como |
| --- | --- |
| `.checks/issue-25-agent-launch.verified.md` da rodada 1 | inteiro, antes de substituí-lo |
| `.checks/issue-25-agent-launch.md` | diff `da2467d..HEAD` inteiro: linhas novas do Landing ("Console do Windows" e "Espera da harness nativa do Hermes"), C38, S6 com C39/C40 e Handoff. 0 linhas removidas, ou seja, C1–C37 sem mudança de texto |
| `.tasks/issue-25-agent-launch.md` | diff inteiro (critérios 31–32 e Sources com a autorização) |
| `.checks/code-review/issue-25/context-harness-approved.json` | critérios de aceite (seis, com o AC6) e os dois últimos comentários: proposta e autorização "Autorizar ajuste pontual da harness" |
| `.checks/issue-25-agent-launch.build.md` | diff inteiro desde `da2467d`, lido como relato do autor; nenhum número dele foi usado como prova |
| Diff da correção `da2467d..3c11a9b` | `--stat`; produto (`src/integrations/launch/cli.mjs`, `prepare.mjs`) inteiro; testes e fixtures tocados inteiros (`command.cli`, `end.e2e`, `prepare.cli`, `session.e2e`, `store.unit`, `docs`, `fake-agent.mjs`, `pty-session.py`, `harness.py`, `hermes-plugin.native.test.mjs`) |
| Arquivos novos | `tests/integrations/fixtures/launch/console-stdio.py`, `tests/integrations/fixtures/hermes/settle.py` e `tests/integrations/hermes-harness.unit.test.mjs`, inteiros |
| `src/integrations/hermes/plugin/__init__.py` | `observer_stats` (59–64) e os contadores, para interpretar `active`/`delivered`/`oversize`; sem diff na feature inteira |
| `tests/integrations/hermes-plugin.native.test.mjs` 225–247 | I4-C20 e I4-C21, conferidos sem alteração (0 linhas removidas no arquivo) |
| `tests/doctor/agent-resolution.unit.test.mjs`, `fifo-config.cli.test.mjs`, `fs-adapter.posix.test.mjs` | só a condição de skip dos 7 skips do doctor |
| `AGENTS.md`, `verify.md` | já lidos inteiros na rodada 1; `AGENTS.md` sem diff na feature |

Sem fonte vinculante de UI (perfil `light`): o passo 1 do verify não se aplica. Fault injection, `Test policy` e `Coverage` não foram executados, conforme o perfil.

## Ambientes e execuções — verified at `3c11a9b`

Execuções em sequência, uma suíte por vez. Logs em `.checks/code-review/issue-25/verifier-round2/` (pasta ignorada).

| # | Ambiente | Comando | Resultado |
| --- | --- | --- | --- |
| A | Windows 11, Node v24.22.1 (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10, Hermes 0.21.4; 12:28–12:29 | `node --test --test-concurrency=4 --test-reporter=spec … --test-reporter=tap … tests/integrations/launch/*.test.mjs tests/integrations/hermes-harness.unit.test.mjs` (`A-win-24.22.1.*`) | 59 testes: **56 pass, 0 fail, 3 skip** (C5-POSIX, C6, C15 pty), exit 0. Diagnóstico: variante link do C17 omitida (sem privilégio de link de arquivo) |
| B | Windows 11, Node v24.13.0 oficial (zip conferido com `SHASUMS256.txt`), npm 11.6.2 do mesmo zip no início do `PATH`, `npm_execpath` ausente, `npmCli()` = `…\node-v24.13.0-win-x64\node_modules\npm\bin\npm-cli.js`; 12:30–12:31 | o mesmo comando (`B-win-24.13.0.*`) | 59 testes: **56 pass, 0 fail, 3 skip**, exit 0; C14, C18, C30 e C31 passam |
| C | WSL `Ubuntu` (não a padrão), `oldboydev` uid 1000, `/usr/bin/node` v24.13.0 (`process.execPath` `/usr/bin/nsolid`), npm 11.6.2, Python 3.12.3, sem Hermes; 12:32 | cópia por `git -c core.autocrlf=false archive 3c11a9b` (sha256 `7eed27d8…ce9ab64991…2b6c`, `get-tar-commit-id` = `3c11a9b…`, árvore extraída `f2fcbcfb…` = `HEAD^{tree}`, `cli.mjs` 755, shebang LF), `node_modules` copiado (yaml 2.9.0, smol-toml 1.9.1); o mesmo comando (`C-wsl-24.13.0.*`) | 59 testes: **55 pass, 0 fail, 4 skip** (C4 shim, C5 console, C8 LOCALAPPDATA, C38 console — todos só do Windows), exit 0. Rodaram C5-POSIX, C6, C15, o C12 de um lado, a variante link do C17 e o 126 do C30. `~/.skill-me` e `~/.skill-me-authorization.json` ausentes antes e depois; árvore igual depois |
| D | Windows, Node v24.22.1, Hermes 0.21.4 real, `SKILL_ME_HERMES_PYTHON` ausente; `Popen` do `node.exe` medido antes: 453–469 ms (`D-popen-latency-before.txt`); 12:32–12:41 | `npm test` (`D-npm-test.txt`) | **exit 0**. Governança 6/6. Motor 16/16. Doctor 417: 410 pass, 0 fail, 7 skip. Integrações 512: **502 pass, 0 fail**, 10 skip |

Cada um dos 59 nomes do alvo aparece individualmente em cada TAP; nenhum filtro com 0 testes. Matriz por check (`matrix.txt`; p/f/s):

| Check | A Win 24.22.1 | B Win 24.13.0 | C WSL 24.13.0 |
| --- | --- | --- | --- |
| C1–C3, C7, C9–C11, C13, C14, C18–C26, C28–C30, C32, C33, C35, C36 | 1p cada | 1p cada | 1p cada |
| C4 | 3p | 3p | 2p/1s |
| C5 | 1p/1s | 1p/1s | 1p/1s |
| C6 | 1s | 1s | 1p |
| C8 | 2p | 2p | 1p/1s |
| C12 | 2p | 2p | 2p |
| C15 | 1s | 1s | 1p |
| C16 | 2p | 2p | 2p |
| C17 | 4p (link omitido) | 4p (link omitido) | 4p (link executado) |
| C27, C34, C37, C39 | 3p cada | 3p cada | 3p cada |
| C31, C40 | 2p cada | 2p cada | 2p cada |
| C38 | 1p | 1p | 1s |

Os testes nativos do Hermes no gate D (todos executados e aprovados, nenhum pulado): I4-C18, I4-C19, I4-C20, I4-C21, I4-C22, I4-C23, I4-C37, I4-C44b, os três I23-C8 e I25-C40 nativo (`D-npm-test.txt:593-604`). Também passaram, no mesmo gate, os dois I25-C40 de unidade (`:591-592`).

**Skips do gate D, com motivo**: doctor 7, todos com `skip: process.platform === "win32"` (dois de `agent-resolution` POSIX, dois de `fifo-config` FIFO e três de `fs-adapter` FIFO). Integrações 10: I4-C15 e T8-C4 (`posix-signals`), I4-C25b (`posix-modes`), I4-C25j/k/l (`posix-acl`, só Linux), I4-C25m (`macos-acl`), I25-C5 POSIX e I25-C6 (sinais POSIX) e I25-C15 (pty só POSIX). Todos são de plataforma; nenhum é nativo do Hermes.

## Round 1: carried / reverified

| Item | Situação nesta rodada |
| --- | --- |
| Execução das provas de C1–C37 | **verified at `3c11a9b`**: todas rodaram de novo, por inteiro, em A, B, C e D |
| Revisão das asserções de C12, C14, C17, C18, C30, C31 e C37 (não-PASS ou arquivos tocados por correção dirigida a elas) | **verified at `3c11a9b`**: diff lido e asserções citadas abaixo |
| Revisão das asserções de C8–C11 e C13 (o produto mudou em `prepare.mjs`), C15 (a fixture `pty-session.py` mudou) e dos checks que usam `fake-agent.mjs` | **verified at `3c11a9b`** quanto ao diff: `prepare.mjs:85, 94` só passam a fazer `await readLine()`; `pty-session.py` e `fake-agent.mjs` só ganham opções novas, com o comportamento padrão igual. Conteúdo das asserções **carried from `da2467d`**, sem mudança no diff |
| Revisão das asserções de C1–C7, C16, C19–C29 e C32–C36 | **carried from `da2467d`**: o diff da correção não toca o corpo desses testes. As linhas citadas em arquivos tocados foram atualizadas por busca literal em `3c11a9b` (o match confirma o conteúdo da linha); não afirmo releitura do teste inteiro. `agent.unit` e `report.cli` não mudaram, e as citações de lá são as de `da2467d` |
| Swept existing | **carried from `da2467d`**: `privacy/`, `traces/` e `observe/` sem diff desde `da2467d` (verificado) |
| Core vendorizado | **verified at `3c11a9b`**: `scripts/code-review/` com os mesmos 5 blobs da base (`README.md` `25e52841`, `cli.mjs` `c6a4abcd`, `review.mjs` `1bda8e45`, `review.test.mjs` `216125ce`, `schema.json` `b02001e2`); `.github/` sem diff |

### Achados da rodada 1

| Achado | Estado em `3c11a9b` | Evidência |
| --- | --- | --- |
| F1 — `rmSync` em caminho Unicode no Node 24.13.0 (C14, C18, C30, C31) | **fechado** | Arranjos trocados por `unlinkSync`/`rmdirSync`, cada um seguido de asserção de ausência: `command.cli:243`, `end.e2e:177`, `prepare.cli:272` e `session.e2e:84`. B: 56/0/3 com os quatro aprovados. Node, CI e a raiz com "ação" não mudaram |
| F2 — gate nativo Hermes (escopo ampliado pela autorização 6419121665, AC6) | **fechado** | C39/C40 abaixo. Gate D exit 0 com os 12 nativos aprovados, com `Popen` de 453–469 ms medido imediatamente antes |
| F3 — C18 medido com o relógio de parede | **fechado** | `session.e2e:103` `const started = performance.now()`; `:109` `performance.now() - started >= 2000`, limite estrito, igual à paciência do produto (`observe/command.mjs`, `performance.now()`) |
| F4 — C12 não distinguia `&&` de `||` | **fechado** | Novo teste `prepare.cli:368`, com um lado fora do terminal e o outro num terminal real (pty no POSIX, console próprio no Windows) e um `n` já digitado. Ver C12 |
| F5 — WSL do autor sobre bytes CRLF | **fechado** | O relato agora o registra (`build.md`, seção da verificação 1); o ambiente C desta rodada usa cópia exata (`f2fcbcfb…` = `HEAD^{tree}`) |
| F6 — recusas do ponteiro | **fechado** | `store.unit:124-126` `segment` `"1"`, sem `segment`, `launchedAt` sem milissegundos → `:139` `["store_invalid", 0, before]` |
| F7 — esperados de C37 vindos do código | **fechado** | `docs:14` lista literal dos 11 códigos do Landing; `:49` `/500 eventos ou 8 MiB/`; `:51` `/750 ms depois da saída do agente não entram/`; `:93` `assert.deepEqual(codes, LAUNCH_CODES)` |

## Checks

`cmd` = `tests/integrations/launch/command.cli.test.mjs`, `prep` = `prepare.cli`, `sess` = `session.e2e`, `store` = `store.unit`, `end` = `end.e2e`, `rep` = `report.cli`, `agent` = `agent.unit`, `docs` = `docs.test`, `harn` = `tests/integrations/hermes-harness.unit.test.mjs`, `nat` = `tests/integrations/hermes-plugin.native.test.mjs`. Resultado por ambiente na matriz acima; "A/B/C" = aprovado nos três.

| Check | Claim (resumo) | Proof run | Evidência (arquivo:linha — valor) | Revisão | Result |
| --- | --- | --- | --- | --- | --- |
| C1 | `npm link` em prefixo temporário; `--help` sai 0; privado | A/B/C | `cmd:47-48` `pkg.private` = `true`, `pkg.bin` = `{"skill-me": "src/integrations/launch/cli.mjs"}`; `cmd:64` `[0, SKILL_ME_HELP, ""]`; `cmd:76` `git status` igual | carried | PASS |
| C2 | argumentos literais, stdout exato, sem shell | A/B/C | `cmd:79` `LITERAL_ARGS` (`ção ✓ 日本`, `--`, `""`, `%PATH%`, `$HOME`…); `cmd:95` `{status: 0, stdout, stderrFirst, argv: LITERAL_ARGS, stdin}` | carried | PASS |
| C3 | código 0 e 7 | A/B/C | `cmd:104` `{0: 0, 7: 7}` | carried | PASS |
| C4 | shim `codex.cmd` → node + `codex.js`; outro `.cmd` 127 | A/B (cli+unit), C (unit) | `cmd:118` `{status: 0, argv: ["exec", "texto com espaço", "--", "ção"], execPath, script: …codex.js, sentinel: false}`; `cmd:131` `{status: 127, stdout: "", code: true, …, sentinel: false}`; `agent:78`, `agent:94,100,105` | carried | PASS |
| C5 | sinais ao grupo (POSIX) e `CTRL_C_EVENT` real (Windows) | POSIX C; Windows A/B | `cmd:155` `launcherGone` = `false`; `cmd:159` `{status: 4, signal: null, signals: ["SIGINT","SIGQUIT","SIGHUP"]}`; `cmd:176` `{stage: "done", generated: true, seen: true, status: 5, signals: ["SIGINT"]}` | carried | PASS |
| C6 | SIGTERM ao launcher chega 1 vez | C | `cmd:198` `{status: 0, signal: null, signals: ["SIGTERM"]}` | carried | PASS |
| C7 | agente ausente: 127 sem prompt nem escrita | A/B/C | `prep:94` `{status: 127, stdout: "", code: true, asked: false}`; `prep:98` árvore igual | carried | PASS |
| C8 | prévia exata antes de escrever | A/B (2), C (1) | `prep:123` `[1, expectedPreview + ROOT_PROMPT]`; `prep:126` árvores iguais em cada prompt; `prep:142` pasta via `LOCALAPPDATA` | diff do produto lido; asserções carried | PASS |
| C9 | confirmação aplica raiz, integração e confiança | A/B/C | `prep:164` `skillMeObserveConfig: 1` + `root`/`rootReal`/`hermesDelivery`; `prep:169` `changes` = `[]`; `prep:176` `[rootReal, 1]` | idem | PASS |
| C10 | recusa → 3 `setup_declined` | A/B/C | `prep:189` `{exitCode: 3, code: true, trees: before, started: false, root: false}` × 6 | idem | PASS |
| C11 | relativo → 2 `root_not_absolute` | A/B/C | `prep:200` `{exitCode: 2, code: true, asked: 1, trees: before, relative: false, config: false}` | idem | PASS |
| C12 | stdin **ou** stderr fora de terminal → 3 `setup_required`, nada alterado | A/B/C (2 testes) | `prep:223` (os dois em pipe) `{status: 3, line: "skill-me: preparação pendente [setup_required]; rode skill-me codex num terminal para revisar e confirmar.", …}`; `prep:387` cada lado sozinho `{status: 3, required: true, asked: false, trees: before, started: false, root: false}` com `n\n` digitado no terminal real (uma implementação `||` perguntaria e leria a recusa); `prep:388` stderr em arquivo = `SETUP_REQUIRED_LINE + "\n"` exato | verified | PASS |
| C13 | 2ª execução sem prévia, SHA-256 iguais | A/B/C | `prep:238` `{exitCode: 0, asked: 0, preview: false, config: hashes.config, settings: hashes.settings, started: 1}` | idem C8 | PASS |
| C14 | conflitos 4/4 e inválida 3; raiz fica; próxima mostra o que falta | A/B/C | `prep:250` `{exitCode: 4, …, config: false}`; `prep:266` `{exitCode: 4, …, config: true}`; `prep:272` `existsSync(foreignTemp)` = `false`; `prep:276` `{exitCode: 0, asked: 1, rootPrompt: false, changes: true, started: 1}`; `prep:290` `[3, true, 0]` × 2 | verified | PASS |
| C15 | pty real POSIX: prévia, aplica, inicia; recusa sem alteração | C | `prep:398-399` `status` 0, `pending` 0; `prep:400` tela com `primeiro uso de claude`; `prep:403` 1 início; `prep:408` `{status: 3, declined: true, trees: before}` | fixture lida; asserções carried | PASS |
| C16 | execução aberta antes do agente; só o par da execução | A/B/C | `sess:61` `seen.env` = `{SKILL_ME_LAUNCH_ROOT: rootReal, SKILL_ME_LAUNCH_ID: invocation}`; `sess:67` `{origin: "launch", segment: 1, state: "active", content: true, retentionDays: 7, limits: {maxEvents: 500, maxBytes: 8388608}, …}`; `sess:69` ponteiro literal; `agent:122,125,127` | carried | PASS |
| C17 | formatos persistidos e recusas | A/B (link omitido), C (link) | `store:54` ponteiro literal; `store:108-109` 10 variantes → `[3, "capture_invalid"]`, controle `[0, null]`; `store:124-126` variantes novas do ponteiro → `store:139` `["store_invalid", 0, before]`; `store:154` `["link_refused", 0]`; `sess:300-301` | verified | PASS |
| C18 | raiz ausente 3, store inválido 3, lock > 2 s 4, E/S 5 | A/B/C | `sess:84` `existsSync(p.root)` = `false`; `sess:109` `performance.now() - started >= 2000`; `sess:111` `{status: exit, stderr: "skill-me: não foi possível abrir a execução [<código>]\n", started: false, waited: true}`; `sess:124` `io_failure` 5 | verified | PASS |
| C19 | hooks e ingest na corrente, chave dela, conteúdo do ingest | A/B/C | `sess:147` `[LAUNCHED(1), LAUNCHED(1)]`; `sess:151` 4 registros; `sess:155` pseudônimo pela chave da captura; `sess:161` `[0, 0]`; `sess:167` `assertSameAsIngest` | carried | PASS |
| C20 | par inválido: `binding_invalid`, nada gravado | A/B/C | `sess:190` `{bound: false, code: "binding_invalid", entries: 1, committed: 0, persisted: 0, lost: 1}` × 4; `sess:192` árvore igual | carried | PASS |
| C21 | `observe.json` e autorização com os mesmos bytes | A/B/C | `sess:211` antes = depois (on e off) | carried | PASS |
| C22 | 503 eventos: 500 + 3, chave nova, outro produtor no 2 | A/B/C | `sess:230` `[1, "stopped", 500, 500, {}]`; `sess:236` `[2, "stopped", 4, {}, true, 7, {maxEvents: 500, maxBytes: 8388608}, "launch", …]`; `sess:241` `chamada-500..502`; `sess:244` chave própria; `sess:245` `[LAUNCHED(1)]` | carried | PASS |
| C23 | 8 MiB: cabe exato fica; 1 byte a menos abre o seguinte | A/B/C | `sess:282` `["active", 8388608, {}, 1]`; `sess:289` `["stopped", MAX_BYTES ou MAX_BYTES - size + 1, {}]`; `sess:291` `[2, 1, size, {}]` | carried | PASS |
| C24 | corrente parada à mão → próximo segmento | A/B/C | `store:168` `[opened.capture, "stopped", 1]`; `store:169` `[2, "active", 1, first.launchedAt]` | carried | PASS |
| C25 | `stopped` com `endedAt`, ponteiro some, resumo | A/B/C | `end:69-76` 2 capturas `stopped`, `endedAt` ISO, `{unknown_event: 1}`, status 3; `end:82` linha literal do segmento 2 | carried | PASS |
| C26 | nada gravado → 1º `manualStep` | A/B/C | `end:101`, `end:106` stderr literal por agente | carried | PASS |
| C27 | `launch_ended` depois do fim; produtor com o lock termina antes | A/B/C (3 testes) | `end:117` `{launch: true, code: "launch_ended", entries: 1, committed: 0, persisted: 0, lost: 1}`; `store:222` `ended` = `false` durante o commit; `store:234` `{…, entries: 2, committed: 1, persisted: 1, lost: 1}`; `store:253` `["io_failure", true, opened.capture]`; `store:259` `launch_ended` | carried | PASS |
| C28 | plugin real: 3 entregues, nada na fila, soma 3 `stopped` | A/B/C | `end:144` `{started: true, delivered: true, enqueued: 3, sent: 3, queueFull: 0, failed: 0}`; `end:150` `{persisted: 3, …, status: 0}`; `end:153` `eventos gravados: 3.` | carried | PASS |
| C29 | término por sinal | C (POSIX); A/B (código 1) | `cmd:209` POSIX `{status: null, signal, summary: true}`; `cmd:226` `{status: null, signal: "SIGINT", signals: ["SIGINT"]}`; `cmd:231` todas `stopped` | carried | PASS |
| C30 | ENOENT 127, outro 126; segmento 1 `stopped` com 0 | A/B/C (126 por EACCES em C) | `cmd:243` `existsSync(entry)` = `false`; `cmd:273` `{status, startCode: true, captures: [[1, "stopped", 0]]}` | verified | PASS |
| C31 | encerramento falha: código, `active`, `privacy stop` encerra, estado da execução | A/B/C (2 testes) | `end:163` status 6; `end:169` linha "continua aberta" literal; `end:173` `["active", true]`; `end:177` `existsSync(lock)` = `false`; `end:180` `stopped`; `end:208` linha "já não recebe registros"; `end:212` `["active", false]`; `end:214` `launch_ended` | verified | PASS |
| C32 | duas invocações próprias; a saída de uma não encerra a outra | A/B/C | `end:239` `["stopped", "active"]`; `end:248` chaves próprias; `end:249` `[1, 1]` | carried | PASS |
| C33 | `off`/`on` durante: corrente `active` | A/B/C | `end:265` `[0, "on"]`; `end:270` `[0, "off", []]`; `end:271` `active`; `end:275` 3 × `LAUNCHED(1)`; `end:280` automáticas `[]` | carried | PASS |
| C34 | execução iniciada por último; seções = relatório existente | A/B/C (3 testes) | `rep:82`, `rep:90-93` `{skillMeLaunchReport: 1, …}`, `rep:95`, `rep:104`, `rep:140-143`, `rep:150`, `rep:166, 169` (arquivo sem diff) | carried | PASS |
| C35 | 3 `no_launch_capture` / `not_configured` no JSON de erro | A/B/C | `rep:182-189` `[3, {"schemaVersion":1,"command":"report","status":"error","error":{"code":…}}\n, ""]` × 3 | carried | PASS |
| C36 | ajuda: 0 em stdout; 2 em stderr | A/B/C | `cmd:281` `[0, SKILL_ME_HELP, ""]`; `cmd:285` `[2, "", SKILL_ME_HELP]` | carried | PASS |
| C37 | README e guias: preparo, fluxo, limites, par e precedência | A/B/C (3 testes) | `docs:57` ordem; `docs:60-61` blocos literais; `docs:49, 51` `500 eventos ou 8 MiB`, `750 ms…`; `docs:82` 9 padrões × 4 documentos; `docs:89` precedência; `docs:93` `codes` = lista literal `docs:14` | verified | PASS |
| C38 | console real do Windows: prévia legível, raiz com acento exata, linha seguinte intacta ao agente | A/B (só Windows; C skip por desenho) | Driver `console-stdio.py`: console próprio, teclas Unicode por `WriteConsoleInputW`, tela lida por `ReadConsoleOutputCharacterW`. `prep:350` `pretype` = `<home>\minhas capturas ação⏎ s⏎ linha do agente⏎`; `prep:355` `[stage, status]` = `["done", 0]`; `prep:357-359` tela com `primeiro uso de claude; nada foi alterado ainda.`, a frase de gravação (`execução`, `sanitização`) e `passo manual de confiança:`; `prep:363` `root` = `typed` (com "ação"); `prep:365` `[seen.stdin, SKILL_ME_LAUNCH_ROOT]` = `["linha do agente", realpath(typed)]` | verified | PASS |
| C39 | pendência com contadores parados > 300 ms não conclui; atraso só conclui quando a entrega termina, eventos preservados | A/B/C (3 testes); D (nativos) | `harn:88` `["concluded", 0, 3]`; `harn:100-102` com 470 ms parados: `concluded`, termina em [470, 521) ms, `[12, 12]`; `harn:109-110` entrega em partes conclui só em 1900 ms; `harn:186-188` harness real com Hermes simulado e atraso de 700 ms: `[12, 12, 0]`, `concluded`, `waitedMs >= 700`. No gate D, I4-C19, I4-C23 e I23-C8 (eventos preservados) passam com `Popen` de 453–469 ms | verified | PASS |
| C40 | falha e travado distintos de conclusão; `settleMaxMs` (padrão 5000) preservado; callbacks e ferramentas inalterados | A/B/C (2 testes); D (nativos) | `harn:196-198` `failed` em 480 ms, `[false, 5]`; `harn:201` `["inactive", 0]`; `harn:207-208` harness real `["failed", 5, false]`, `waitedMs >= 600`; `harn:214-216` `[2000, "timeout"]`, termina em 2000, `[3, 94]`; `harn:218-219` sem `settleMaxMs`: `[5000, "timeout"]`, termina em 5000; `harn:222-225` harness real `timeout`, `waitedMs >= 1000`. Nativo (D): `nat:335` `{capture: "concluded", ingest: "concluded", inactive: "inactive", spawnfail: "failed", exit: "failed", disconnect: "failed", stall: "timeout"}`; `nat:338` `delivered + oversize = enqueued`; `nat:340` `stall` `waitedMs >= 2000`; I4-C20 (`nat:228-231` callbacks `[]`, `toolCalls` = argumentos), I4-C21 e I4-C37 inalterados e aprovados. Fonte: `settle.py:13` `DEFAULT_SETTLE_MAX_MS = 5000`, `:34`; `harness.py:85` | verified | PASS |

**Checks comprovados: 40/40.**

## Revisão do produto alterado — verified at `3c11a9b`

- `src/integrations/launch/cli.mjs:14` `WINDOWS_CONSOLE = (fd) => process.platform === "win32" && isatty(fd)`. `:32-33` (`writerFor`): fora de console continua `write(fd, …)` síncrono; no console usa `process.stdout`/`process.stderr`, criados só nesse caso (`:115-116`). `:73-108` (`readConsoleLine`): `setEncoding("utf8")`, uma linha por chamada, `pause()` e `unref()` depois de cada linha (`:89-90`), sobra guardada em `pending`, EOF → `null`. `:117` `terminal: isatty(0) && isatty(2)` sem mudança. `:118` `readConsoleLine` só com fd 0 de console. Corresponde à linha "Console do Windows" do Landing, registrada em `3b16e3b`, antes do código em `86e9ba1`. Fora de console e no POSIX, nada muda.
- `src/integrations/launch/prepare.mjs:85, 94`: `await readLine()`. A interface aceita valor ou promessa; os testes em processo (C8–C14) continuam passando com `readLine` síncrono.
- Plugin do produto (`src/integrations/hermes/`): sem diff na feature inteira. O escopo de C39/C40 ficou em `tests/integrations/fixtures/hermes/{settle.py,harness.py}` e nas provas. As asserções antigas do arquivo nativo não mudaram (0 linhas removidas) e os prazos dos cenários também não. A forma de `settle.py` (`:17-53`) é a linha "Espera da harness nativa do Hermes" do Landing (registrada em `c89b8f3`, antes de `9148a5d`).

## Swept existing — carried from `da2467d`

Fontes sem diff desde `da2467d` (`git diff da2467d..HEAD -- src/integrations/{privacy,traces,observe}` vazio): `privacy/lifecycle.mjs:24` (`stopped` não muda), `traces/delivery.mjs:57, 90` (sem reenvio), `:58, 12` (o agente não espera o disco; 750 ms) e `privacy/store.mjs:732` com `lifecycle.mjs:57-60` (`prune` por `endedAt`). As citações são as da rodada 1, válidas porque esses arquivos não mudaram.

## Nível, amostragem e limitações que continuam reais

- Perfil `light`: sem fault injection. O vermelho do C38 (escrita e leitura síncronas no console) é afirmação do autor; não localizei log específico desse vermelho e não o reproduzi. As asserções de C38 são de valor exato (raiz com "ação", linha `linha do agente`), e uma leitura na página OEM não as satisfaria. Para C12 (`||`) e para a harness antiga, os vermelhos do autor existem em log (`builder-fix-round1/wsl-mutation-or.txt`, `builder-harness/native-red-oldharness.spec.txt`); são evidência do autor, não minha.
- Console real do Windows: C38 prova prévia, raiz digitada, confirmação `s` e passagem do terminal ao agente; o C12 de um lado prova a recusa sem pergunta. A recusa (`n`) e o EOF dentro de um console real (`readConsoleLine` com `end`) seguem provados só em processo (C10) e por pty no POSIX (C15).
- Os nativos do Hermes, inclusive o I25-C40 nativo, rodam só com o runtime local; na CI ficam pulados. A decisão da harness também roda na CI, pelo `hermes-harness.unit.test.mjs` com o Python do sistema.
- C23: o "sem espera" no erro de início continua sem asserção de tempo, confirmado só por leitura (`command.mjs:125-127, 131`). Não faz parte do claim de C30.
- O uso real continua sem sessão de agente (`Unresolved` 2, `blocks go-live`). Isso fica fora desta verificação e não é falha dela.
- macOS e o runner da CI não foram executados (sem push). A equivalência de B com `windows-latest` vem da versão fixada e da reprodução local.

## Findings

Nenhum achado bloqueante nesta rodada. Nada novo a registrar além das limitações acima.

## Gate

| Gate | Resultado |
| --- | --- |
| Alvo completo, Windows, Node 24.22.1 | 59: 56 pass, 0 fail, 3 skip — exit 0 |
| Alvo completo, Windows, Node 24.13.0 (CI) | 59: 56 pass, 0 fail, 3 skip — exit 0 |
| Alvo completo, WSL Ubuntu, Node 24.13.0, uid 1000, cópia exata | 59: 55 pass, 0 fail, 4 skip — exit 0 |
| `npm test`, Windows, Node 24.22.1, Hermes real | exit 0 — 6/6; 16/16; doctor 417 (410 pass, 7 skip); integrações 512 (502 pass, 0 fail, 10 skip) |

Cada suíte rodou uma única vez; nenhuma foi repetida até ficar verde.

## Limpeza

- `%TEMP%`: os 232 scratches `skill-me i4 i25 * ação-*` da janela da execução B (o `after` com `rmSync` do 24.13.0 não os apaga; 0 fora da janela) foram removidos por um único processo Node 24.22.1 que confere o caminho resolvido dentro do `%TEMP%` (`cleanup-temp.mjs`/`.txt`), com 0 recusas. As demais entradas do `%TEMP%` não são desta verificação e ficaram.
- WSL: `/tmp/skillme-verifier-r2.02YVKM` removido após a conferência do padrão.
- Nenhum processo de outra sessão foi encerrado. Histórico, estado de review, perfis pessoais e prefixo npm real não foram tocados.
