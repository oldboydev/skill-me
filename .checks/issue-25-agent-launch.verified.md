# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25

**Verdict**: FAIL
**Profile**: light
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..da2467d950eb6f7247f52b4234964dc92e25a553`
**Round**: 1 - full
**Verifier**: subagente independente (Claude Opus 5.5, processo novo despachado pelo orquestrador, sem contexto do implementador; autor ≠ verificador). Verificação somente leitura: nenhum arquivo de produto, teste ou checklist foi alterado; nenhum commit, push, PR, merge ou `review:run`.

Data: 26/10/2026, 11:06–11:35 (-03). HEAD `da2467d` durante toda a verificação, árvore limpa antes e depois (`git status --porcelain=v1 -uall` vazio; ao final aparece só este arquivo).

## Veredito em uma linha

Os 37 checks têm teste nomeado, executado e com asserção localizada, e o comportamento do produto foi confirmado em pelo menos um ambiente para cada um. A entrega não passa: as provas de **C14, C18, C30 e C31 falham com o Node 24.13.0 fixado na CI** (`windows-latest`) por um arranjo de prova com `rmSync`, a prova de **C18 também falhou no WSL** por medir 2 s com o relógio de parede, e o **gate local `npm test` no Windows sai com 1** por falhas nativas do Hermes que se reproduzem idênticas na base. Checks comprovados sem ressalva: **32/37**.

## Fontes lidas

| Fonte | Como |
| --- | --- |
| `AGENTS.md` | inteiro |
| `.tasks/issue-25-agent-launch.md` | inteiro |
| `.checks/issue-25-agent-launch.md` (Landing, C1–C37, Swept, Handoff) | inteiro |
| `.checks/code-review/issue-25/context-approved.json` | corpo da issue e os 4 comentários, inclusive a aprovação [6415701125](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6415701125) |
| `C:/Users/paulo/.agents/skills/tlc-implement/references/verify.md` | inteiro |
| `.checks/issue-25-agent-launch.build.md` (relato do autor) | inteiro, lido criticamente; nenhuma conclusão dele foi aceita sem execução própria |
| Diff completo `63621c6..da2467d` | `--stat`; diffs de `package.json`, `src/doctor/launcher-link/codex.mjs`, `src/integrations/{observe,traces,report,privacy/store}.mjs` alterados; arquivos novos de `src/integrations/launch/` (os 5) lidos inteiros |
| Testes novos `tests/integrations/launch/*.test.mjs` (8) e `tests/integrations/helpers/launch.mjs` | inteiros |
| Drivers de prova `fake-agent.mjs`, `console-ctrl-c.py`, `pty-session.py`, `hermes-plugin-session.py` | inteiros, para interpretar `generated`/`seen`/`pending`/`delivered` |
| Gate: `tests/integrations/fixtures/hermes/harness.py` (55–100), `hermes-plugin.native.test.mjs` (60–160, 311–400), `src/integrations/hermes/plugin/__init__.py` (150–235), `scripts/test-integrations.mjs`, `.github/workflows/governance.yml` | trechos indicados |
| `.checks/issue-23-observacao-on-off.build.md` 1560–1760 (defeito do `rmSync` do Node 24.13.0 e a convenção adotada) | trecho indicado |
| Swept existing: `privacy/lifecycle.mjs` 1–60, `traces/delivery.mjs` 1–100, `privacy/store.mjs` 728–760 | trechos indicados |

Sem fonte vinculante de UI (perfil `light`): o passo 1 do verify não se aplica. Fault injection, `Test policy` e `Coverage` são de `standard`/`ui` e não foram executados.

## Ambientes e execuções

Logs em `.checks/code-review/issue-25/verifier-round1/` (pasta ignorada pelo git).

| # | Ambiente | Comando | Resultado |
| --- | --- | --- | --- |
| A | Windows 11, Node v24.22.1 (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10, Hermes 0.21.4 | `node --test --test-concurrency=4 --test-reporter=spec … --test-reporter=tap … tests/integrations/launch/*.test.mjs` (`win-24.22.1.*`) | 52 testes: **49 pass, 0 fail, 3 skip** (C5-POSIX, C6, C15), exit 0. Diagnóstico: variante link do C17 não executada (sem privilégio de link de arquivo). |
| B | Windows 11, Node v24.13.0 oficial (zip sha256 `ca274269…ce091cb88`, igual ao `SHASUMS256.txt`), npm 11.6.2 do mesmo zip, no início do `PATH`, sem `npm_execpath` | o mesmo comando (`win-24.13.0.*`); `npmCli()` do helper resolvido para `…\node-v24.13.0-win-x64\node_modules\npm\bin\npm-cli.js` | 52 testes: **45 pass, 4 fail (C14, C18, C30, C31), 3 skip**, exit 1 |
| C | WSL `Ubuntu` (não a padrão), `oldboydev` uid 1000, `/usr/bin/node` v24.13.0 (`process.execPath` = `/usr/bin/nsolid`), npm 11.6.2, Python 3.12.3, sem Hermes | cópia por `git -c core.autocrlf=false archive da2467d` (sha256 `f306a51b…3f7e8`, `get-tar-commit-id` = `da2467d…`, árvore extraída `099e70eb…` = `HEAD^{tree}`, `cli.mjs` modo 755), `node_modules` copiado do checkout (yaml 2.9.0, smol-toml 1.9.1); o mesmo comando (`wsl-24.13.0.*`) | 52 testes: **48 pass, 1 fail (C18), 3 skip** (C4 shim, C5 console, C8 LOCALAPPDATA), exit 1. `~/.skill-me` e `~/.skill-me-authorization.json` ausentes antes e depois. |
| D | Windows, Node v24.22.1, HEAD | `npm test` (`npm-test-win-head.txt`, 11:18–11:27) | governança 6/6; motor 16/16; doctor 417 (410 pass, 0 fail, 7 skip); integrações 504 (**490 pass, 4 fail**, 10 skip) — **exit 1**. As 4 falhas: I4-C19, I4-C23, I4-C37, I23-C8 (`hermes-plugin.native.test.mjs`); os 52 I25 passaram ou pularam. |
| E | Windows, Node v24.22.1 | `hermes-plugin.native.test.mjs` isolado em HEAD (`native-isolated-head.txt`) e na base `63621c6` (cópia LF exata, árvore `d2909bbd…` = `63621c6^{tree}`, `native-isolated-base.txt`), em sequência | HEAD: 11 testes, 7 pass, 4 fail; base: 11 testes, 7 pass, 4 fail — os mesmos 4 e os mesmos valores |

Cada nome I25 aparece individualmente nos TAPs (52 linhas `ok`/`not ok` por ambiente); nenhum filtro com 0 testes. Matriz por check (`matrix.txt`; p/f/s = pass/fail/skip):

| Check | A Win 24.22.1 | B Win 24.13.0 | C WSL 24.13.0 |
| --- | --- | --- | --- |
| C1, C2, C3, C7, C9–C13, C19–C26, C28, C29, C32, C33, C35, C36 | 1p cada | 1p cada | 1p cada |
| C4 | 3p | 3p | 2p/1s (shim só Windows) |
| C5 | 1p/1s | 1p/1s | 1p/1s (POSIX roda no WSL; console no Windows) |
| C6 | 1s | 1s | 1p |
| C8 | 2p | 2p | 1p/1s (LOCALAPPDATA só Windows) |
| C14 | 1p | **1f** | 1p |
| C15 | 1s | 1s | 1p |
| C16 | 2p | 2p | 2p |
| C17 | 4p (link omitido) | 4p (link omitido) | 4p (link executado) |
| C18 | 1p | **1f** | **1f** |
| C27 | 3p | 3p | 3p |
| C30 | 1p | **1f** | 1p (126 por EACCES executado, uid ≠ 0) |
| C31 | 2p | **1p/1f** | 2p |
| C34 | 3p | 3p | 3p |
| C37 | 3p | 3p | 3p |

## Checks

`cmd` = `tests/integrations/launch/command.cli.test.mjs`, `prep` = `prepare.cli`, `sess` = `session.e2e`, `store` = `store.unit`, `end` = `end.e2e`, `rep` = `report.cli`, `agent` = `agent.unit`, `docs` = `docs.test`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `npm link` em prefixo temporário; `--help` de outro diretório sai 0 com a ajuda; `private` e `bin` | A, B, C pass | `cmd:47-48` `assert.equal(pkg.private, true)`; `assert.deepEqual(pkg.bin, {"skill-me": "src/integrations/launch/cli.mjs"})`; `cmd:64` `[run.status, run.stdout, run.stderr]` = `[0, SKILL_ME_HELP, ""]`; `cmd:76` `git status` igual | PASS |
| C2 | 3 agentes, sem shell, argumentos literais na ordem, stdout exato, stderr chega | A, B, C pass | `cmd:79` `LITERAL_ARGS` (espaço, aspas, `ção ✓ 日本`, `--`, `""`, `%PATH%`, `$HOME`…); `cmd:95-97` `expected[agent] = {status: 0, stdout, stderrFirst: "erro do <agente>", argv: LITERAL_ARGS, stdin}` | PASS |
| C3 | código 0 e 7 | A, B, C pass | `cmd:104` `assert.deepEqual(observed, {0: 0, 7: 7})` | PASS |
| C4 | `codex.cmd` reconhecido → `node <bin/codex.js>`; outro `.cmd` → 127 sem criar nada; entrada só da linha de invocação | A, B pass (cli+unit); C pass (unit) | `cmd:116-119` `{status: 0, argv: [...], execPath: process.execPath, script: …/@openai/codex/bin/codex.js, sentinel: false}`; `cmd:129-132` `{status: 127, stdout: "", code: true, home/root iguais, sentinel: false}`; `agent:78` eco/pacote alheio/versão ilegível/ausente → `null`; `agent:94,100,105` → `{failure: "launcher_requires_shell"}` | PASS |
| C5 | POSIX: SIGINT/SIGQUIT/SIGHUP ao grupo, 1 vez cada, launcher sai depois com o código; Windows: `CTRL_C_EVENT` real | POSIX: C pass; Windows: A, B pass | `cmd:155` `launcherGone === false` após cada sinal; `cmd:159` `{status: 4, signal: null, signals: ["SIGINT","SIGQUIT","SIGHUP"]}`; `cmd:174-177` `{stage: "done", generated: true, seen: true, status: 5, signals: ["SIGINT"]}` (status 5 = código do agente; o launcher morto daria 0xC000013A) | PASS |
| C6 | SIGTERM só ao launcher chega ao agente 1 vez (POSIX) | C pass | `cmd:198` `{status: 0, signal: null, signals: ["SIGTERM"]}` | PASS |
| C7 | fora do PATH: 127, `executable_not_found`, sem prompt, árvore igual | A, B, C pass | `prep:92-95` `{status: 127, stdout: "", code: true, asked: false}` (3 agentes); `prep:98` `snapshotTree(home)` igual | PASS |
| C8 | prévia completa antes da 1ª resposta, sem escrita | A, B (2 testes), C (1, LOCALAPPDATA só Windows) | `prep:122-125` texto exato da prévia + `ROOT_PROMPT` e + `CONFIRM_PROMPT` nos dois instantes; `prep:126` árvores iguais em cada prompt; `prep:141-144` `…\Dados Locais\skill-me\capturas` e `<home>\AppData\Local\skill-me\capturas` | PASS (nível: terminal injetado em processo; ver Nível) |
| C9 | confirmação aplica raiz, `observe.json` da #23, handlers, `manualSteps`, agente inicia | A, B, C pass | `prep:163-168` `{skillMeObserveConfig: 1, root, rootReal, hermesDelivery: [execPath, INTEGRATIONS_CLI, "ingest", "--agent", "hermes"]}`; `prep:169` `plan.changes` = `[]`; `prep:174` linhas de confiança; `prep:176` `[SKILL_ME_LAUNCH_ROOT, capturas]` = `[rootReal, 1]`; confirmações `s`, `" SIM "`, `S` | PASS |
| C10 | `n`, vazio, `yes`, `não`, EOF → 3 `setup_declined`, nada criado | A, B, C pass | `prep:189` `{exitCode: 3, code: true, trees: before, started: false, root: false}` para as 6 variantes | PASS |
| C11 | caminho relativo → 2 `root_not_absolute` | A, B, C pass | `prep:198-201` `{exitCode: 2, code: true, asked: 1, trees: before, relative: false, config: false}` | PASS |
| C12 | preparo pendente com stdin **ou** stderr fora de terminal → 3 `setup_required`, nada alterado | A, B, C pass | `prep:223` `{status: 3, line: "skill-me: preparação pendente [setup_required]; rode skill-me codex num terminal para revisar e confirmar.", trees: before, started: false}` | **PARCIAL** — F4: só o caso com os dois em pipe |
| C13 | 2ª execução sem prévia, SHA-256 iguais, agente inicia | A, B, C pass | `prep:236-239` `{exitCode: 0, asked: 0, preview: false, config: hashes.config, settings: hashes.settings, started: 1}` | PASS |
| C14 | `observe_on` (4), instalador em conflito (4), configuração inválida (3); raiz fica; próxima mostra só o que falta | A, C pass; **B fail** | `prep:248-251` `{exitCode: 4, code: true, started: false, config: false}`; `prep:264-268` `{exitCode: 4, code: true, started: false, config: true}`; `prep:271-275` `{exitCode: 0, asked: 1, rootPrompt: false, changes: true, started: 1}`; `prep:285-289` `[3, true, 0]` × 2. Em B, `rmSync(foreignTemp)` (`prep:269`) não removeu; a 3ª asserção leu `exitCode: 4, changes: false` | **FAIL na CI Windows** — F1 |
| C15 | pty real POSIX: prévia, confirmação aplica, agente inicia; recusa sem alteração | C pass | `prep:310-315` `status 0`, `pending 0`, tela com `primeiro uso de claude` e `passo manual de confiança`, `observe.json` existe, 1 início; `prep:320` `{status: 3, declined: true, trees: before}` | PASS |
| C16 | segmento 1 e ponteiro antes do agente; o agente vê só o par da execução | A, B, C pass (2 testes) | `sess:61` `seen.env` = `{SKILL_ME_LAUNCH_ROOT: rootReal, SKILL_ME_LAUNCH_ID: invocation}` com herdados completos e incompletos (e `skill_me_launch_root` no Windows); `sess:65-68` `{origin: "launch", segment: 1, state: "active", content: true, retentionDays: 7, limits: {maxEvents: 500, maxBytes: 8388608}, launchedAt: createdAt}`; `sess:69` ponteiro literal; `agent:122,125,127` | PASS |
| C17 | captura e ponteiro só na forma do Landing; recusas; `privacy list` mostra os 4 campos | A, B pass (link omitido); C pass (link executado) | `store:54` ponteiro literal `{launchVersion: 1, …, segment: 1, launchedAt: "2026-10-26T10:00:00.000Z"}`; `store:56-72` chaves exatas do `state.json`; `store:108-110` 10 variantes → `[3, "capture_invalid"]`, controle `[0, null]`; `store:136` 7 variantes do ponteiro → `["store_invalid", 0, árvore igual]`; `store:151` link → `["link_refused", 0]`; `store:79`, `sess:289-290` | PASS (nota F6) |
| C18 | raiz ausente 3, store inválido 3, lock alheio > 2 s 4, E/S 5; só o código | A pass; **B fail; C fail** | `sess:100` `{status: exit, stderr: "skill-me: não foi possível abrir a execução [<código>]\n", started: false, waited: true}`; `sess:98` `waited` = `Date.now() - started >= 2000`; `sess:113` `io_failure` 5. B: `rmSync(p.root)` (`sess:77`) não removeu a raiz e o agente iniciou (status 0). C: `lock_present` com `waited: false` (relógio de parede, F3) | **FAIL** — F1, F3 |
| C19 | hooks Claude/Codex pela linha instalada e ingest Hermes gravam 1 vez na corrente, chave dela, conteúdo do `privacy ingest --content`; nada em manual/automática com `on` e par manual | A, B, C pass | `sess:136` relatórios dos hooks `[LAUNCHED(1), LAUNCHED(1)]`; `sess:140` 4 registros; `sess:141-149` `[1, agente, expectedPseudonym(root, capture.id, sessão)]`; `sess:150` `[0, 0]`; `sess:154-156` `assertSameAsIngest` | PASS |
| C20 | par incompleto/inválido: `binding_invalid`, nada gravado, com `on` e par manual | A, B, C pass | `sess:179-180` 4 variantes = `{bound: false, code: "binding_invalid", entries: 1, committed: 0, persisted: 0, lost: 1}`; `sess:181` árvore da raiz igual | PASS |
| C21 | `observe.json` e autorização com os mesmos bytes, com `on` e `off` | A, B, C pass | `sess:197-200` base64 antes = depois; `off` → `[null, null]` | PASS |
| C22 | 503 eventos: seg. 1 com 500 `stopped` sem descarte, seg. 2 com os 3 (o 501º primeiro), chave nova; outro produtor no 2 | A, B, C pass | `sess:217-221` `[1, "stopped", 500, 500, {}]`; `sess:223-226` `[2, "stopped", 4, {}, true, 7, {maxEvents: 500, maxBytes: 8388608}, "launch", launchedAt igual]`; `sess:229-232` `chamada-500,501,502` + `depois-do-limite` pela chave da sucessora; `sess:233` pseudônimos diferentes; `sess:234` hook `[LAUNCHED(1)]` | PASS |
| C23 | registro que cabe exatamente fica; 1 byte a menos abre o seguinte | A, B, C pass | `sess:271` `["active", 8388608, {}, 1]`; `sess:278` `["stopped", gap === 0 ? MAX_BYTES : MAX_BYTES - size + 1, {}]`; `sess:280` `[2, 1, size, {}]` | PASS |
| C24 | corrente parada à mão → próximo evento abre o seguinte | A, B, C pass | `store:165-168` `[opened.capture, "stopped", 1]`, `[2, "active", 1, launchedAt igual]`, pseudônimo pela chave nova, ponteiro → sucessora | PASS |
| C25 | após a saída: `stopped` com `endedAt`, ponteiro some, resumo por captura | A, B, C pass | `end:70-76` `state === "stopped"`, `endedAt` ISO, ponteiro ausente, `{unknown_event: 1}`, status 3; `end:77-86` stderr literal (execução, 2 segmentos, `descartados: nenhum`/`unknown_event 1`, `consulte com`) | PASS |
| C26 | nada gravado → aviso com o 1º `manualStep` | A, B, C pass | `end:98-106` stderr literal por agente com `manualSteps[0]` do `plan` | PASS |
| C27 | depois do encerramento `launch_ended` sem gravar; produtor com o lock termina antes, o seguinte não | A, B, C pass (3 testes) | `end:117-118` `{launch: true, code: "launch_ended", entries: 1, committed: 0, persisted: 0, lost: 1}` e árvore igual; `store:219` `ended === false` com o commit preso; `store:223-225`; `store:231` `{…, entries: 2, committed: 1, persisted: 1, lost: 1}`; `store:250, 253-256` ponteiro sai antes, falha ao parar não reabre | PASS |
| C28 | plugin real; 3 entregues e nada na fila; capturas somam 3 e `stopped` | A, B, C pass | `end:142-145` `{started: true, delivered: true, enqueued: 3, sent: 3, queueFull: 0, failed: 0}`; `end:148-153` `{persisted: 3, states: todos "stopped", status: 0}` e `eventos gravados: 3.` | PASS |
| C29 | término por sinal: `stopped` e mesmo sinal (POSIX) | C (SIGTERM, SIGINT, SIGHUP e SIGINT pelo grupo); A, B (Windows: código 1) | `cmd:209` POSIX `{status: null, signal, summary: true}`; `cmd:226` `{status: null, signal: "SIGINT", signals: ["SIGINT"]}`; `cmd:228-231` todas `stopped` | PASS |
| C30 | ENOENT → 127, outro → 126; segmento 1 `stopped` com 0 | A, C pass; **B fail** | `cmd:269-271` `{status, startCode: true, captures: [[1, "stopped", 0]]}`. B: `rmSync(codex.js)` (`cmd:239`) não removeu; o caso ENOENT iniciou o agente (status 0) | **FAIL na CI Windows** — F1 |
| C31 | encerramento falha: código, `active`, comando `privacy stop` que encerra, linha do estado; código do agente | A, C pass; **B 1 fail** (lock) | `end:163-173` stderr literal das 3 linhas e `["active", ponteiro true]`; `end:176-177` `stop.status 0` → `stopped`; `end:199-213` (E/S) linha "já não recebe registros", `["active", false]`, `launch_ended`. B: `rmSync(lock)` (`end:174`) não removeu; `privacy stop` → 4 `lock_present` (as asserções até `end:173` passaram) | **FAIL na CI Windows** — F1 |
| C32 | duas invocações intercaladas, próprias, a saída de uma não encerra a outra | A, B, C pass | `end:233` IDs diferentes; `end:236` `["stopped", "active"]`; `end:243-246` registros por chave própria, chaves diferentes, 1 captura cada | PASS |
| C33 | `npm run off/on` durante: corrente `active`, eventos nela, sem automática | A, B, C pass | `end:262-263`, `end:267-268` `off.body.stopped` = `[]` e `active`; `end:272` 3 × `LAUNCHED(1)`; `end:273-278` `e-1..e-3` na corrente, `automaticOf` = `[]` | PASS |
| C34 | execução iniciada por último, mesmo com seg. 1 antigo apagado; seções = relatório existente; `--latest`/`status` só automáticas | A, B, C pass (3 testes) | `rep:82` texto = cabeçalho + `== Segmento s de 2 ==` + saída de `integrations report --root --capture`; `rep:90-93` JSON `{skillMeLaunchReport: 1, …, missingSegments: [], reports: 2}`; `rep:95` cada relatório igual ao explícito; `rep:104` sem escrita; `rep:130-131` aberta; `rep:140-143` escolhe a nova com `oldSecond.createdAt > newOnly.launchedAt`; `rep:150` ausente `[1]`; `rep:166, 169` | PASS |
| C35 | 3 `no_launch_capture` e 3 `not_configured` no JSON de erro | A, B, C pass | `rep:182-189` `[3, {"schemaVersion":1,"command":"report","status":"error","error":{"code":…}}\n, ""]` × 3 | PASS |
| C36 | `--help`/`help` stdout 0; sem argumento/desconhecido 2 com ajuda no stderr | A, B, C pass | `cmd:277` `[0, SKILL_ME_HELP, ""]`; `cmd:281` `[2, "", SKILL_ME_HELP]` para `[]`, `gemini`, `--versao`; `cmd:283-296` 10 trechos literais (preparo, fluxo, `skill-me report`, limites) | PASS |
| C37 | README antes do on/off; README e 3 guias com os 7 limites; guias com o par e a precedência | A, B, C pass (3 testes) | `docs:56` ordem; `docs:59-61` blocos `["npm ci","npm link"]`, os 3 comandos, `skill-me report --skill …`; `docs:78-81` 9 padrões × 4 documentos; `docs:87-88` par e precedência; `docs:92` tabela = `LAUNCH_DELIVERY_CODES` | PASS (nota F7) |

**Checks comprovados sem ressalva: 32/37.** Com ressalva: C12 (cobertura parcial), C14, C18, C30, C31 (prova vermelha no Node da CI do Windows; C18 também no WSL). O comportamento do produto nesses quatro foi confirmado no ambiente A e, exceto C18, no C.

## Swept existing, reaberto no código

| Linha do Swept | Restrição citada | Onde está | Confere |
| --- | --- | --- | --- |
| idempotency and retry | `transition` não muda captura já `stopped` | `src/integrations/privacy/lifecycle.mjs:24` `if (capture.state === "stopped") return { ok: true, capture, changed: false }` | sim |
| idempotency and retry | nenhuma entrega é reenviada (#8) | `src/integrations/traces/delivery.mjs:57` "encerra a tentativa sem reenviar"; `:90` só `lock_present` antes do commit repete; a rota da execução usa o mesmo `untilDeadline` (`observe/delivery.mjs:97`, prazo por entrada `:130` = `ATTEMPT_MS` 650, `traces/delivery.mjs:18`) | sim |
| external-dependency failure | falha de entrega nunca bloqueia o agente (#8) | `traces/delivery.mjs:58` "o agente não espera o disco"; `:12` `DELIVERY_DEADLINE_MS = 750` | sim |
| data lifecycle | `privacy prune` existente | `privacy/store.mjs:732` `pruneCaptures` por `isExpired` (`lifecycle.mjs:57-60`, conta de `endedAt`); a captura `launch` recebe `endedAt` pelo `stopCapture` → `transition` (`store.mjs:823`); `launches/` só é tocada pelas funções da execução (`store.mjs:972-1160`) | sim |

## Nível e amostragem

- Perfil `light`: sem fault injection, sem linhas de `Test policy`, sem fonte vinculante de UI.
- C8–C11, C13 e C14 decidem a prévia e as respostas em processo, com `terminal: true` e `readLine` injetados. A fronteira real é provada por pipes (C12) e por pty no POSIX (C15). A leitura síncrona do fd 0 num console real do Windows (incluindo o ramo `EOF` de `cli.mjs:40`) não foi exercitada. É limitação declarada e está dentro do escopo aprovado do checklist (C15 é só POSIX); não a conto como falha.
- C18 (`io_failure`) e C31 (E/S) usam `io` instrumentado em processo, como o checklist descreve.
- O critério 23 da task pede encerramento "sem espera" no erro de início; o claim de C30 não inclui isso. Confirmado só por leitura: `src/integrations/launch/command.mjs:125-127` (ramo `spawnError`, sem espera) e `:131` (`sleep(settleMs)` só no ramo do `close`).
- Valores esperados opacos: C1/C36 comparam com `SKILL_ME_HELP` importado do produto (C36 completa com 10 trechos literais em `cmd:283-296`). C22 usa `PRIVACY_LIMITS` para 500, mas `sess:225` e `store:75` afirmam `{maxEvents: 500, maxBytes: 8388608}` literal. C37: ver F7.
- Para C5, C15 e C28 li os drivers só até onde precisei para saber o que `generated`/`seen`/`pending`/`delivered` medem; não percorri o resto do mundo de fixtures.

## Gate

| Gate | Resultado | O que impede |
| --- | --- | --- |
| Alvo novo, Windows, Node 24.22.1 | 49 pass, 0 fail, 3 skip | — |
| Alvo novo, Windows, Node 24.13.0 (o da CI `windows-latest`) | 45 pass, **4 fail**, 3 skip | F1 (arranjo de prova) |
| Alvo novo, WSL Ubuntu, Node 24.13.0, uid 1000 | 48 pass, **1 fail**, 3 skip | F3 (prova sensível ao relógio de parede; ambiente) |
| `npm test`, Windows, Node 24.22.1, HEAD | **exit 1**: integrações 490 pass, 4 fail, 10 skip | F2 (pré-existente, reproduz na base) |

Nenhuma suíte foi repetida até ficar verde. As execuções extras (arquivo nativo isolado em HEAD e na base, sondas) foram controles sequenciais, não substitutos do gate.

## Findings, por prioridade

### F1 — P1 — As provas de C14, C18, C30 e C31 falham no Node 24.13.0 que a CI do Windows fixa (arranjo de prova)

- **Cenário**: o job `verify` da CI (`.github/workflows/governance.yml`, matriz com `windows-latest`, `node-version: 24.13.0`) roda `npm run test:integrations`, que inclui `tests/integrations/launch/`. Reproduzido no ambiente B com o zip oficial do 24.13.0.
- **Esperado**: as provas novas passam na versão fixada da CI. A #23 já registrou o defeito (`rmSync` do Node 24.13.0 no Windows não remove caminho não-ASCII e não lança; nodejs/node#56049, corrigido no 24.13.1) e adotou `unlinkSync`/`rmdirSync` nos arranjos (`.checks/issue-23-observacao-on-off.build.md:1591-1655`; comentários em `tests/integrations/traces/query.cli.test.mjs:252` e `tests/integrations/traces/concurrency.cli.test.mjs:44`).
- **Atual**: 45 pass, 4 fail. Cada falha vem logo depois de um `rmSync` num scratch com "ação" (`makeScratch`): `command.cli.test.mjs:239` (o `codex.js` continua lá: o caso ENOENT inicia o agente e sai 0), `end.e2e.test.mjs:174` (o `.lock` continua lá: `privacy stop` sai 4 `lock_present`), `prepare.cli.test.mjs:269` (o temporário alheio continua lá: a próxima execução sai 4 `conflict`) e `session.e2e.test.mjs:77` (a raiz continua lá: a execução abre e o agente sai 0). Sonda independente (`rmsync-probe-trace-*.txt`): no 24.13.0, `rmSync` de arquivo e de pasta com "ação" retorna sem erro e o alvo continua existindo; com caminho ASCII remove; no 24.22.1 remove nos dois casos. `cpSync` recursivo com "ação" encerra o 24.13.0 com código 127, sem saída (`cpsync-probe-24.13.0.txt`).
- **Classificação**: arranjo de prova, não comportamento. `src/` não usa `rmSync`, `cpSync`, `rm` nem `cp` (busca: só `io.rmdir` de `fs/promises` em `install/run.mjs:79,758` e `privacy/store.mjs:707`). As asserções de produto antes do arranjo passaram em B (por exemplo, `end:163-173` e `prep:248-268`).
- **Impacto**: CI vermelha no Windows para a entrega. Nesses quatro casos, as asserções depois do arranjo não testam o que o claim descreve. Os `after` com `rmSync` também deixam os scratches no `%TEMP%` com o 24.13.0 (removi os 216 desta verificação).
- **Local**: as 4 linhas acima.

### F2 — P2 — Gate local `npm test` no Windows sai com 1 por `hermes-plugin.native.test.mjs` (pré-existente, não é regressão da #25)

- **Cenário**: `npm test` em HEAD (ambiente D) e o arquivo nativo isolado em HEAD e na base `63621c6` (ambiente E), em sequência, Node 24.22.1, Hermes 0.21.4 local.
- **Esperado**: suíte verde no Windows com o runtime Hermes.
- **Atual**: os mesmos 4 testes falham nas três execuções, inclusive **isolado na base**. I4-C19: `destino de captura recebeu EOF` falso. I4-C23: `captured.ndjson` não existe. I4-C37 (`:327`): `stats.oversize` 0, esperado 1. I23-C8 (`:388`): `[active, enqueued, delivered, deliveryFailed]` = `[true, 12, 0, 0]`, esperado `[true, 12, 12, 0]`. O relato do autor de "isolado 11/11" não se reproduziu agora.
- **Evidência do mecanismo, sem inferir além dela**: no plugin, `delivered` só sobe depois do `Popen` e da escrita no pipe (`src/integrations/hermes/plugin/__init__.py:202-206`). Antes disso o produto (`ingest`) nem foi iniciado. A harness encerra a espera quando os contadores ficam 300 ms sem mudar (`tests/integrations/fixtures/hermes/harness.py:82`, `> 0.3`), sem exigir `delivered + deliveryFailed = enqueued`. Medido agora nesta máquina: `subprocess.Popen` do `node.exe` como o `_spawn` do plugin leva 453–469 ms (5/5, `popen-latency.txt`), mais que a janela de 300 ms. O estado lido (`enqueued` completo, `delivered` 0, `deliveryFailed` 0) é o de uma thread ainda no primeiro `Popen` quando a harness terminou. Plugin, harness e o arquivo de teste não mudam no diff (últimas mudanças `a892ab1` e `1b6685f`, ancestrais da base; diff vazio nesses caminhos). Não determinei por que o `Popen` está lento nesta máquina (havia outras sessões ativas: 26 `node.exe`, 20 `claude.exe`).
- **Classificação**: harness e ambiente, anterior à #25. A falha também aparece na base sem as 52 provas novas. Não é comportamento do produto alterado por esta entrega. Na CI esses testes ficam `skipped` (runner sem Hermes).
- **Impacto**: o gate local exigido (`npm test` no Windows) está vermelho e continua impedindo o PASS. A correção fica fora do escopo da #25 (harness da #4/#23); a decisão é do proprietário.
- **Local**: `tests/integrations/fixtures/hermes/harness.py:73-84`; `tests/integrations/hermes-plugin.native.test.mjs:155-157, 261-263, 327, 388`.

### F3 — P2 — A prova de C18 mede os 2 s com o relógio de parede e falhou no WSL

- **Cenário**: WSL `Ubuntu`, suíte I25 (ambiente C).
- **Esperado**: `lock_present` só depois de 2 s de paciência (Landing, linha "Códigos de saída"; `patiently` com `OBSERVE_LOCK_PATIENCE_MS = 2000` em `src/integrations/observe/command.mjs:62, 94-103`, sobre `performance.now()`).
- **Atual**: `waited: false` no caso `lock_present` (`session.e2e.test.mjs:92, 98`: `Date.now() - started >= 2000`). O produto esperou: com o mesmo arranjo, 3/3 execuções isoladas levaram 2068–2075 ms nos dois relógios (`wsl-c18-lock-diag.txt`). Nessa distro o relógio de parede recua cerca de 90 ms a cada 30 s em relação ao monotônico (`wsl-clock-probe.txt`: −93 ms às 14:17:11Z e −90 ms às 14:17:41Z). O `systemd-resolved` registrou `Clock change detected` às 11:15:11, dentro da janela da suíte (11:15:02–11:15:22), e o journald registra `Time jumped backwards`. Com folga de cerca de 70 ms, um recuo durante a espera deixa a diferença abaixo de 2000.
- **Classificação**: prova sensível ao relógio de parede, disparada pelo ambiente. Não é comportamento.
- **Impacto**: C18 fica intermitente em hosts com ajuste de relógio. A medida monotônica (`performance.now()`) não teria essa sensibilidade.
- **Local**: `tests/integrations/launch/session.e2e.test.mjs:92, 98`.

### F4 — P3 — C12 não distingue "stdin **ou** stderr" de "os dois"

- **Cenário**: `runSkillMe` cria stdin, stdout e stderr em pipe (`tests/integrations/helpers/launch.mjs:100`); C12 roda só esse arranjo (`prepare.cli.test.mjs:216`).
- **Esperado** (claim e critério 12): `setup_required` quando stdin **ou** stderr não é terminal.
- **Atual**: com os dois fora de terminal, uma implementação errada plausível (`isatty(0) || isatty(2)`) também passa. A implementação lida está correta (`src/integrations/launch/cli.mjs:54`, `isatty(0) && isatty(2)`), mas a prova não a distingue. O pty do C15 permitiria, no POSIX, um caso só com stderr em pipe.
- **Impacto**: uma regressão que perguntasse com o stderr redirecionado passaria despercebida.
- **Local**: `tests/integrations/launch/prepare.cli.test.mjs:204-226`.

### F5 — P3 — As provas WSL do relato do autor não rodaram sobre os bytes commitados

- **Cenário**: o build declara WSL sobre `git archive` de `dedd5b4`, tar sha256 `2a1a52da…24783e` (`.checks/issue-25-agent-launch.build.md:28-29`).
- **Atual**: esse hash é o de `git archive dedd5b4` com o `core.autocrlf=true` do gitconfig do sistema (`C:/Program Files/Git/etc/gitconfig`), que converte para CRLF. A variante exata (`-c core.autocrlf=false`) tem sha256 `f624c954…ce30`. Reproduzi o mesmo efeito e descartei meu primeiro tar (blobs divergentes em todos os 305 arquivos). A cópia usada aqui tem a árvore `099e70eb…` = `HEAD^{tree}`.
- **Impacto**: o resultado WSL do relato não é evidência do conteúdo commitado. Por exemplo, a asserção do shebang tolera `\r` (`command.cli.test.mjs:49`). Esta verificação substitui aquela evidência no ambiente C.
- **Local**: `.checks/issue-25-agent-launch.build.md:27-30`.

### F6 — P3 — Ponteiro do C17: parte das recusas só é exercitada no `state.json`

- `segment` em texto ou ausente e `launchedAt` fora de ISO aparecem só nas variantes do `state.json` (`store.unit.test.mjs:88-95`). As do ponteiro (`:119-127`) cobrem JSON quebrado, versão, `invocation` de outra execução, `segment` 0, sem `launchedAt`, chave extra e mais de 1 KiB. O código usa os mesmos predicados (`isSegment` e `isIso` em `privacy/store.mjs`, `isValidLaunch`), e por isso o risco é baixo. A variante link só roda no POSIX (executada no ambiente C).

### F7 — P3 — Esperados de C37 vêm de constantes do código

- `docs.test.mjs:48, 50, 92` montam "500 eventos ou 8 MiB", "750 ms" e a tabela de códigos a partir de `PRIVACY_LIMITS`, `DELIVERY_DEADLINE_MS` e `LAUNCH_DELIVERY_CODES`. Conferi à parte que `LAUNCH_DELIVERY_CODES` (`observe/delivery.mjs:16-29, 35-38`) é exatamente a lista literal do Landing (`launch_ended`, `root_not_found`, `root_not_directory`, `store_invalid`, `capture_invalid`, `lock_present`, `link_refused`, `foreign_entry`, `root_changed`, `io_failure`, `delivery_timeout`). Os limites literais estão afirmados em C17 e C22. Nota de legibilidade, sem divergência.

## Limitações desta verificação

- Nenhum agente real, perfil pessoal, `npm link` no prefixo real nem `npm run on` real. Os homes, raízes e prefixos foram os temporários das provas, e o home real do uid 1000 no WSL continuou sem `.skill-me`.
- macOS não foi executado.
- O runner da CI não foi executado (sem push). A equivalência de B com `windows-latest` se apoia na mesma versão fixada, no mesmo defeito documentado na #23 e na reprodução local.
- Não rodei o `npm test` completo com o 24.13.0. Ele deixaria centenas de scratches no `%TEMP%`, e as falhas do alvo novo já estão isoladas em B.

## Limpeza

- Removidos só os resíduos desta verificação, num processo Node 24.22.1 que confere o caminho resolvido dentro do `%TEMP%` (`cleanup-temp.mjs`/`.txt`): 12 pastas `verifier probe *` (3 com o nome corrompido `aÃ§Ã£o` criado pelo `cpSync` do 24.13.0), 216 scratches `skill-me i4 i25 * ação-*` da janela da execução B (0 fora dela) e a cópia da base. Nenhuma recusa.
- WSL: removido `/tmp/skillme-verifier-r1.LhT2GK` após a conferência do padrão. Os `/tmp/skill-me i4 i5 …` existentes não são desta verificação e ficaram.
- Nenhum processo de outra sessão foi encerrado. Histórico e estado de review não foram tocados.
