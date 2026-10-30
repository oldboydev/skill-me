# Verificação independente 27 — **FAIL** (gate D vermelho; não há PASS global; 0 de 9 ACs atendidos)

**Verdict**: FAIL.
- A, B e C são válidos, com término natural 0 e 0 falhas.
- O **D** saiu com 1 natural e `valid: false`:
  - ✖ `C11 comando com limpeza falha imprime o relatório ready, sai com 0 e avisa a pasta no stderr`;
  - origem: `scripts/code-review/review.test.mjs:339`, `TypeError` em `:349`;
  - o `npm test` parou no motor, então doctor e integrações não rodaram **no D**;
  - em A/B (68 arquivos de integração) passaram os 11 nativos Hermes com runtime, o I4-C35 e o I23-C8 pelo Python do
    sistema; no C os nativos são skips esperados (§10.2, §10.7).

**Profile**: light · **Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..7fac597b1a03671cac5af8a120474943c584a704`
· **Round**: 27 — escopada contra a R26. A identidade foi **provada** pelo meu A: mudaram só os 4 executáveis esperados e
o core é igual à base.

Gates at `7fac597`:
- A: 662/649/0/0/13
- B: 662/649/0/0/13
- C: 662/640/0/0/22
- D: **43/42/1/0/0, parado**

O fechamento está na seção 10. As seções 1–9 abaixo são a análise pré-provas, preservada como foi escrita antes de
qualquer execução.

---

**Status da fase de análise (texto original, preservado): NÃO era PASS nem FAIL.** Nenhum dos 4 comandos tinha sido
executado. Nenhum check C1–C50 nem AC estava provado naquela fase; a tabela da seção 5 dizia o que cada gate teria de
mostrar.

- **Verifier**: Claude novo e independente (rodada 27, perfil `light`, `AGENTS.md:138`). Não sou autor S16–S19,
  Verifier R26 nem revisor formal. Nesta fase usei só Read/Grep/Glob e este Edit. Sem Bash, PowerShell, Write,
  Agent/Task, rede, agente real, commit, push, CI, formal ou merge. Não toquei no `Temp\x` global.
- **Escopo**: a feature inteira `63621c691f132dc8d591414269d36cfa18fca594..7fac597b1a03671cac5af8a120474943c584a704`,
  C1–C50 um por um e os 9 ACs do contexto canônico atual (`independent-27/context-readable.md`, 46 comentários).
- **Round**: 27 — re-verificação **escopada** contra a R26 (PASS 50/9 em `8f393c5`). O carry da R26 só vale se o meu
  comando A provar a identidade Git de **todos** os arquivos de `src tests scripts .github package*` entre `8f393c5`
  e o HEAD, com exatamente 4 executáveis mudados: `src/integrations/install/run.mjs`,
  `tests/integrations/install-apply.unit.test.mjs`, `tests/integrations/install.cli.test.mjs` e
  `tests/integrations/launch/end.e2e.test.mjs`. Até lá, todo carry fica **condicional**.

## 1. Fontes — "li cópia fiel"

Li **inteira** a cópia literal do Root, `independent-27/required-sources-pack.md`: **18.354/18.354 linhas** nos **109
chunks** contíguos de `independent-27/read-plan.json` (offset 1 … 18288+67; sem lacuna nem sobreposição, nenhum Read
truncado). **Li a cópia fiel; não alego ter aberto cada original.** Os hashes SHA256-LF e as faixas abaixo vêm de
`required-sources-index.json` (`head` `7fac597…`, `lossless: true`). Não os recalculei: sem shell nesta fase.

| # | Fonte original | Linhas | SHA256 LF (prefixo) | Faixa no pack |
| --- | --- | --- | --- | --- |
| 1 | `AGENTS.md` | 139 | `d4c2dfcf` | 4–142 |
| 2 | `CLAUDE.md` | 6 | `275a2e76` | 144–149 |
| 3 | `tlc-implement/references/verify.md` | 302 | `476c35ab` | 151–452 |
| 4 | `.tasks/issue-25-agent-launch.md` | 1.081 | `3f255cf7` | 454–1539 |
| 5 | `.tasks/issue-25-lock-release-proposal.md` | 84 | `56aa16a9` | 1541–1624 |
| 6 | `.tasks/issue-25-c43-diagnostic-plan.md` | 76 | `ac0ecedc` | 1626–1701 |
| 7 | `.tasks/issue-25-hermes-install-diagnostic-plan.md` | 53 | `e2d3b92d` | 1703–1755 |
| 8 | `.tasks/issue-25-hermes-install-probe-plan.md` | 37 | `4ad1fb89` | 1757–1793 |
| 9 | `.tasks/issue-25-hermes-staging-retry-proposal.md` (S19, vinculante) | 116 | `62e2cfbb` | 1795–1911 |
| 10 | `.tasks/issue-25-hermes-c34h-diagnostic-plan.md` | 34 | `1da95bb0` | 1913–1948 |
| 11 | `.checks/issue-25-agent-launch.md` (checklist inteiro) | 3.116 | `2b02bb01` | 1950–5193 |
| 12 | `independent-27/context-readable.md` (9 ACs, 46 comentários) | 523 | `c4d64978` | 5195–5721 |
| 13 | `independent-26/report.md` | 520 | `8d07c32b` | 5723–6242 |
| 14 | `independent-27/since-r26.diff` | 2.844 | `68f2b2b5` | 6244–9112 |
| 15 | `src/integrations/install/run.mjs` | 1.101 | `4b63fed3` | 9114–10214 |
| 16 | `src/integrations/install/io.mjs` | 124 | `6c4bd823` | 10216–10339 |
| 17 | `tests/integrations/install-apply.unit.test.mjs` | 3.795 | `da654000` | 10341–14135 |
| 18 | `tests/integrations/install.cli.test.mjs` | 1.634 | `3ab33683` | 14137–15770 |
| 19 | `tests/integrations/launch/end.e2e.test.mjs` | 1.054 | `e5b69e55` | 15772–16825 |
| 20 | `tests/integrations/helpers/producer-runs.mjs` | 97 | `0b147ffd` | 16827–16923 |
| 21 | `tests/integrations/helpers/traces.mjs` | 665 | `1f7ee30b` | 16925–17589 |
| 22 | `src/integrations/traces/delivery.mjs` | 225 | `792f4742` | 17591–17815 |
| 23 | `builder-s19/report.md` | 499 | `8744b090` | 17817–18316 |
| 24 | `author-s19-r4-after/comparison-root.json` | 37 | `00e4b242` | 18318–18354 |

- O diff `since-r26.diff` foi lido **inteiro** (todas as 2.844 linhas, docs inclusive).
- Arquivos citados fora do pack (`command.cli`, `prepare.cli`, `session.e2e`, `store.unit`, `report.cli`,
  `docs.test`, `hermes-harness.unit`, `hermes-plugin.native`, `agent.unit`, `concurrency.cli`, `delivery.unit`,
  `evidence.unit`, `agents.e2e`, `control.cli`, `governance-ci`, `ci-lock-latency.test`, `store.mjs`) **não foram
  relidos**. Para eles as citações são **carry R26** (`independent-26/report.md` §11.2, pack L6146-6197).
- **CONTRIBUTING**: não existe no repositório (Glob). Só há cópias no npm vendorizado do Node da CI
  (`ci-node-24.13.0/…/{node-gyp,diff}/CONTRIBUTING.md`), que não regem o projeto. Vale o `AGENTS.md`.

## 2. Perfil e passos que não rodam

`light`: sem UI, sem `Coverage`, sem `Test policy`, sem fault injection (verify.md:28-31). Não crio mutantes nem
sondas. RED/GREEN, K1–K13, G1–G7, probes, a medição S18 AFTER e os FAILs históricos são **do autor/Root**: só os
atribuo, não são provas minhas. O passo 3 (asserção, precisão, `Swept` existing) foi feito inteiro pela leitura.

## 3. Fontes vinculantes × checklist (Sources, Landing, Handoff, Swept)

- **Sources do checklist** (L14-15 do checklist) apontam a proposta S19 e a aprovação 6520123791. A proposta
  (`staging-retry-proposal` §"Contrato técnico" e "Landing S19 F1") e o AC2 (contexto L16) dizem a mesma política:
  - só Windows;
  - só `EPERM/EACCES/EBUSY`;
  - 7 tentativas, esperas `10/20/40/80/160/320` (630 ms);
  - identidade BigInt de raiz/plugins/staging, 3 artefatos completos e destino ausente antes de cada tentativa;
  - identidade indisponível → exit 5;
  - EIO, outros códigos e POSIX: 1 tentativa.
  Confere com o código: `run.mjs:335-346` (`renameRetrying`), `:909` (`retryable` só `win32` + `RENAME_DENIED`),
  `:889-898` (`promotable`), `:208-214` (`dirIdentity`), `:477-486` + `:48-53` (`step` → `IncompleteError`
  `io_error`). **Sem contradição.**
- **Landing** (checklist L144-149): as linhas S19 declaram "não muda C1–C50". Elas foram lidas por conteúdo, não por
  rótulo:
  - S19 aprovada;
  - F1 (raiz antes de criar plugins, `run.mjs:841` depois de `rootSame` `:828`);
  - C34h (montagem própria aguardada, `unit:1426`, `:1504-1507`);
  - C34i (`unit:1805`, `:1870-1874`).
  As linhas S16 (L141), S17 (L142) e S18 (L143) também foram conferidas contra `end.e2e`, `install-apply.unit`,
  `install.cli` e o experimento. **Sem contradição.**
- **Handoff/encerramento S19** (task L1065ss; checklist L3100ss): o autor fechou a S19 e registrou a verificação 27
  e a revisão 15 como **ainda não executadas**. O R3 A em `8b690bd` (56/53/2/1, C34n 4/[10,20,40] ≠ 3/[10,20]) fica
  preservado como FAIL do autor. `f9039f6` separa a simulação da montagem física.
- **Swept existing** (carry R26, `delivery.mjs` relido no pack):
  - nenhuma entrega é reenviada (`delivery.mjs:54-62`, `:122-123`);
  - falha de entrega não lança (`:155-156`);
  - só `EEXIST`/`lock_present` repete, em 10 ms (`:19`, `:100-102`);
  - o abandono é terminal (`:99`).
  O S19 **não** toca a entrega: o retry novo vive só em `install/run.mjs`, e `delivery.mjs` tem o mesmo blob
  (`792f4742`) da R26.
- **Invariantes preservados (leitura)**:
  - 750/650 ms (`delivery.mjs:12`, `:17-18`) e `waitUntil` 15 s/20 ms;
  - carry R26: relatório 1.000 ms, stdin 2.000 ms (faixa 1.900–6.000), Hermes 5 s, 500/8 MiB/7 dias;
  - T8-C15 2×40=80, T8-C16 3 criações, CPU−1 com teto 8, jobs 20/10/5 e manual 10.
  O `since-r26.diff` não toca nenhum desses arquivos.
  - **C29b** (`unit:610`, `Date.now() - started - accessMs < 1000 + 500`) segue intacto.

## 4. Deltas executáveis desde a R26 — análise fresca (contratos, falhas, guardas S19)

**Produto `run.mjs` (S19):**
- `renameRetrying(io, from, to, {beforeAttempt, retryable, wait = sleep})` (`:335-346`):
  - `beforeAttempt` roda antes de **cada** tentativa, e o erro dele sai cru, sem rename;
  - `retryable(err)` julga também o 7º erro, que é relançado;
  - no máximo 7 tentativas e 6 esperas.
- `writeViaTemp` (`:356-383`) mantém a ordem `dirUnchanged → stillHolds → beforeRename → rename`, com a política de
  arquivo `RENAME_DENIED` igual em todas as plataformas. Não há mudança de política de arquivo.
- `dirIdentity` (`:208-214`):
  - lê `lstat {bigint:true}`;
  - link ou não-pasta → `ConflictError config_changed_during_apply`;
  - `dev`/`ino` não-BigInt, `dev<0n` ou `ino<=0n` → `Error("identity_unavailable")` sem errno, que `step`
    (`:477-486`) mapeia para `IncompleteError io_error`, exit 5 (`:1094-1098`).
  Isso é **falha fechada**, como exige o AC2.
- `sameIdentityGuard`/`rootSame`/`stateDirSame`/`pluginsSame` (`:216-221`, `:828`):
  - a identidade do staging é capturada depois do `mkdir`; a da sobra, à parte;
  - `adoptStateGuard` (`:1009-1023`) compõe `stateDirUnchanged + rootSame + stateDirSame`;
  - `withLock` usa a guarda como 3º argumento na liberação (`:292-306`, `releaseLock` `:226-239`);
  - `writeManifest`/`deleteManifest` usam a mesma guarda.
  O AC2 pede que escrita, limpeza e liberação do lock preservem entradas alheias. **Coberto pela leitura.**
- **F1** (`:841`): `rootSame()` antes de `io.mkdir(pluginsDir)` quando plugins não existe. Fecha a janela que o
  REDm 1/0/1 do autor mostrou.
- Promoção (`:889-918`):
  - `promotable` confere `stagingOwn`, os nomes do `readdir` exatamente iguais aos 3 artefatos, `isOwnStagedFile`
    (bytes/hash) em cada um e destino ausente (senão `foreign_artifact`);
  - guarda que falha: **sem limpeza**;
  - rename que falha: `removeOwnedStaging(...).catch` e depois `foreign_artifact` se o destino existe, senão o erro
    original.
  **Sem CAS**: a janela TOCTOU entre a guarda e o rename é declarada na proposta e não é prometida como atômica.

**Provas (`install-apply.unit`, S19/S17):**
- **C34l G1–G7** (`:2893-3028`): o helper isolado tem esperas literais (`:2899-2913`) e o predicado no 7º erro
  (`:3017-3024`).
- **C34k** (`:3116-3445`): K1–K13 + K12h–j (linhas `:3155-3389`, asserção `:3444`) sobre `s19PromotionIo`
  (`:3079-3114`).
- **C34m** (`:3456-3524`): troca da raiz real dentro do `lstat` BigInt de `.skill-me` (o F1).
- **C34n** (`:3553-3638`): conta simulada exata de 3 tentativas/[10,20] (`:3570-3597`). O EIO dá 1/[] com o mesmo
  objeto de erro (`:3605-3636`).
- **C34o** (`:3703-3795`): idem para o staging via `s19InstallWithObservedMount` (`:3648-3697`). O movimento físico
  em `:3670` usa o `s19MoveFixtureDirectory` padrão (`:3533-3546`, sobre `installModule.renameRetrying`) e fica
  **fora** da contagem. Isso responde ao FAIL R3.
- **C34h/C34i**:
  - `ancestorSwapIo` e `stagingSwapIo` agora fazem `await swap()` (`:1426`, `:1805`);
  - os callbacks usam o montador (`:1504-1507`, `:1870-1874`);
  - cenários, momentos, cargas e expectativas iguais (conferido no diff).
- **S17**: `rejectionTrace`/`homeRelative`/`rejectionCode`/`installEvidence` (uso `:409-411`) e no CLI
  `partialHermesRegistry` (`install.cli:1375-1376`, `:1617-1634`). Em ambos fica `assert.equal(…, 0, msg)`: só a
  mensagem muda, sem tolerar 5.

**`end.e2e` (S16):**
- `recordProducersInEachTest()` (`:36`).
- `c43TransientOpening(prepared, label, lastHookEnv = {})` (`:831-846`), com `LAUNCHED(1)` no último hook (`:845`).
- `hookFor(..., extraEnv = {})`.
- Controles K1 `SEGMENT_EIO=1` (`:890-892`), K2 `STALL_SEGMENT=1` (`:899-904`), K3 `BLOCK_LOOP="1|900"` (`:913`).
  Usam `activeRecording`/`producerTrace` e `ATTEMPT_MS`, sem prazo novo.
- **As linhas de `end.e2e` mudaram**: as citações R26 desse arquivo (`:80-89`, `:101-109`, `:120`, …) **não são
  carregáveis**. Abaixo cito as linhas frescas no HEAD.

## 5. Tabela por check (uma linha por check)

Legenda:
- **Nível**: CLI, e2e, unit, workflow.
- **Amostragem**: 1 execução em cada gate liberado, salvo nota.
- **Origem**:
  - **fresca** = lida por mim no pack, no HEAD;
  - **carry-R26** = citação de `independent-26/report.md` §11.2, válida só se A provar o blob igual;
  - **produto tocado** = a asserção vem de arquivo igual, mas o caminho exercitado passa por `install/run.mjs`, então
    a prova re-roda obrigatoriamente.
- **SHA a confirmar em A**: o blob de cada arquivo citado, `8f393c5` × HEAD.

| Check | Claim | Valor concreto | Asserção localizada (orig. `file:line`) | Prova nomeada | Nível | Amostragem | Tocado / carry | Citação → SHA a confirmar em A |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | `--help` 0/stdout; `private`; checkout intacto | `[0, SKILL_ME_HELP, ""]`; `private:true` | `command.cli:48-49`, `:65`, `:77` | `I25-C1 npm link…` | CLI | A/B/C/D | carry-R26 | `command.cli`, `package.json` |
| C2 | args literais, sem shell | `argv: LITERAL_ARGS` | `command.cli:96-98` | `I25-C2 argumentos literais…` | CLI | A/B/C/D | carry-R26 | `command.cli` |
| C3 | código 0/7 repassado | `{0:0, 7:7}` | `command.cli:105` | `I25-C3 código do agente…` | CLI | A/B/C/D | carry-R26 | `command.cli` |
| C4 | shim `codex.cmd`; outro `.cmd` | 127 `launcher_requires_shell` | `command.cli:130-133`; `agent.unit` I25-C4 | `I25-C4 shim do npm…` (W), `I25-C4 entrada do shim…` | CLI+unit | W em A/B/D; C skip c/ motivo | carry-R26 | `command.cli`, `agent.unit` |
| C5 | sinais do terminal 1× | `CTRL_C_EVENT` → `["SIGINT"]` | `command.cli:228`, `:244-245` | `I25-C5 Ctrl+C no console…` (W), `…POSIX` (P) | CLI | W A/B/D; P C | carry-R26 | `command.cli` |
| C6 | SIGTERM só ao launcher, 1× | `signals: ["SIGTERM"]` | `command.cli:267` | `I25-C6 SIGTERM…` | CLI | só C (P) | carry-R26 | `command.cli` |
| C7 | agente ausente | 127 `executable_not_found`, nada criado | `prepare.cli:93-94` | `I25-C7 agente ausente…` | CLI | A/B/C/D | carry-R26 | `prepare.cli` |
| C8 | prévia antes de escrever | 500 / 8 MiB / 7 dias | `prepare.cli:122-126` | `I25-C8 prévia…`, `…LOCALAPPDATA` (W) | CLI | A/B/C/D | carry-R26 | `prepare.cli` |
| C9 | confirmação aplica (inclui instalação Hermes) e inicia | aplicado + agente iniciado | `prepare.cli:163-168` | `I25-C9 confirmação aplica…` | CLI | A/B/C/D | carry-R26 + **produto tocado** (`run.mjs`) | `prepare.cli`, `run.mjs` (`4b63fed3` no pack) |
| C10 | recusa | 3 `setup_declined` | `prepare.cli:189-191` | `I25-C10 recusa…` | CLI | A/B/C/D | carry-R26 | `prepare.cli` |
| C11 | raiz relativa | 2 `root_not_absolute` | `prepare.cli:200` | `I25-C11 caminho relativo…` | CLI | A/B/C/D | carry-R26 | `prepare.cli` |
| C12 | sem terminal | 3 `setup_required` | `prepare.cli:223` | `I25-C12 sem terminal…` | CLI | A/B/C/D | carry-R26 | `prepare.cli` |
| C13 | preparo concluído não repete | SHA-256 iguais, sem prévia | `prepare.cli:238` | `I25-C13 preparo concluído…` | CLI | A/B/C/D | carry-R26 + **produto tocado** | `prepare.cli`, `run.mjs` |
| C14 | falha do preparo | conflito 4 / inválida 3, mesmo código | `prepare.cli:250` | `I25-C14 falha do preparo…` | CLI | A/B/C/D | carry-R26 + **produto tocado** | `prepare.cli`, `run.mjs` |
| C15 | pty real | prévia, confirmação, recusa | `prepare.cli:408` | `I25-C15 terminal real (pty)…` | CLI | só C (P) | carry-R26 | `prepare.cli` |
| C16 | execução aberta | segmento 1, ponteiro, só o par da execução | `session.e2e:67` | `I25-C16 execução aberta…`, `…ambiente do agente…` | e2e | A/B/C/D | carry-R26 | `session.e2e` |
| C17 | formato persistido e recusas | campos exatos | `store.unit:79` | `I25-C17 …` | unit | A/B/C/D | carry-R26 | `store.unit` |
| C18 | execução indisponível | 3/4/5 sem caminho | `session.e2e:111` | `I25-C18 …` | e2e | A/B/C/D | carry-R26 | `session.e2e` |
| C19 | grava na captura corrente | nada fora | `session.e2e:161` | `I25-C19 …` | e2e | A/B/C/D | carry-R26 | `session.e2e` |
| C20 | par inválido | `binding_invalid`, nada gravado | `session.e2e:190-192` | `I25-C20 …` | e2e | A/B/C/D | carry-R26 | `session.e2e` |
| C21 | autorização global intacta | bytes iguais on/off | `session.e2e:208-211` | `I25-C21 …` | e2e | A/B/C/D | carry-R26 | `session.e2e` |
| C22 | limite de eventos | 503 → 500 + 3, chave nova | `session.e2e:230` | `I25-C22 …` | e2e | A/B/C/D | carry-R26 | `session.e2e` |
| C23 | limite de bytes | 8.388.608 exatos | `session.e2e:282` | `I25-C23 …` | e2e | A/B/C/D | carry-R26 | `session.e2e` |
| C24 | sucessora após stop manual | corrente nova | `store.unit:168` | `I25-C24 …` | unit | A/B/C/D | carry-R26 | `store.unit` |
| C25 | encerramento e resumo | 2 capturas `stopped`, `endedAt` ISO, ponteiro fora, `unknown_event 1`, status 3, stderr literal | `end.e2e:80-97` | `I25-C25 encerramento e resumo…` (`:59`) | e2e | A/B/C/D | **fresca** (arquivo tocado) | `end.e2e` `e5b69e55` |
| C26 | nada gravado + 1º passo manual | stderr literal por agente (3) | `end.e2e:109-117` | `I25-C26 nada gravado…` (`:100`) | e2e | A/B/C/D | **fresca** | `end.e2e` |
| C27 | revogação | `{launch:true, code:"launch_ended", entries:1, committed:0, persisted:0, lost:1}`; árvore igual | `end.e2e:128-129` | `I25-C27 revogação…` (`:120`) + store.unit (carry) | e2e+unit | A/B/C/D | **fresca** + carry | `end.e2e`, `store.unit` |
| C28 | Hermes em voo N=3; 1ª perdida | `persisted 3`, todos `stopped`; perdida `[["stopped",0,0]]`, rename `["EIO"]`, 1 unlink | `end.e2e:163-176`; `:187-203` | `I25-C28 entregas Hermes em voo…` (`:161`), `I25-C28 primeira entrega perdida…` (`:184`) | e2e | A/B/C/D, Python do sistema | **fresca** | `end.e2e` |
| C29 | término por sinal | `stopped`, mesmo sinal/código | `command.cli:278` | `I25-C29 …` | CLI | A/B/C/D | carry-R26 | `command.cli` |
| C30 | falha de início | 127/126, segmento 1 `stopped` 0 eventos | `command.cli:342` | `I25-C30 …` | CLI | A/B/C/D | carry-R26 | `command.cli` |
| C31 | falha do encerramento com orientação | lock alheio: 6, stderr literal, `["active", true]`; E/S: 2, `["active", false]`, `launch_ended` | `end.e2e:213-230`; `:252-266` | `I25-C31 …` (`:206`, `:233`) | e2e | A/B/C/D | **fresca** | `end.e2e` |
| C32 | simultâneas isoladas; 1ª criação do store | marcadores `C32_MARKERS`, nenhum cruzado | `end.e2e:273-403` (corpo), `:404-453`; `store.unit:715` | `I25-C32 …` (`:273`, `:311`, `:348`, `:404`) | e2e+unit | A/B/C/D | **fresca** (linhas) + carry | `end.e2e`, `store.unit` |
| C33 | on/off durante; arranjo `npm run` | corrente `active`; `spawn sh ENOENT` | `end.e2e:454-488`; `:489-515` | `I25-C33 on e off…` (`:454`), arranjo (P) (`:489`) | e2e | A/B/D; arranjo só C | **fresca** | `end.e2e` |
| C34 | `skill-me report` | última execução, recuo de relógio | `report.cli:159` | `I25-C34 …` | CLI | A/B/C/D | carry-R26 | `report.cli` |
| C35 | report sem execução | 3 `no_launch_capture`/`not_configured` | `report.cli:252-259` | `I25-C35 …` | CLI | A/B/C/D | carry-R26 | `report.cli` |
| C36 | ajuda | 0/stdout; 2/stderr | `command.cli:350` | `I25-C36 ajuda…` | CLI | A/B/C/D | carry-R26 | `command.cli` |
| C37 | README/guias | textos exigidos | `launch/docs.test:82` | `I25-C37 documentação…` | unit | A/B/C/D | carry-R26 | `docs.test`, docs |
| C38 | console Windows | acento exato | `prepare.cli:355` | `I25-C38 console real…` (W) | CLI | A/B/D | carry-R26 | `prepare.cli` |
| C39 | não conclui com 300 ms estáveis | pendente após 300 ms | `hermes-harness.unit:90` | `I25-C39 …` | unit | A/B/C/D | carry-R26 | `hermes-harness.unit` |
| C40 | failed/timeout distintos; 5.000 ms; "ação"; nativos | 5.000 ms | `hermes-harness.unit:220`, `:320`, `:324`, `:327`; `hermes-plugin.native:336` | `I25-C40 …`, `I25-C40 harness nativa` (D) | unit+nativo | nativos só no gate full | carry-R26 + **produto tocado** (instalação Hermes dos nativos) | `hermes-*`, `run.mjs` |
| C41 | sucessora não publicada/não lida; vínculo do ponteiro | 2 `stopped`, nenhuma `active` | `end.e2e:516-565`, `:566-629`, `:630-666`, `:667-727`, `:728-739`, `:740-…`; `store.unit:327-523` | `I25-C41 …` (6 em `end.e2e`) | e2e+unit | A/B/C/D | **fresca** (linhas) + carry | `end.e2e`, `store.unit` |
| C42 | cancelamento antes do agente | agente não inicia | `agent.unit` I25-C42; `command.cli:456`, `:424` | `I25-C42 …` | unit+CLI | W console A/B/D; P C | carry-R26 | `agent.unit`, `command.cli` |
| C43 | lock após abertura/encerramento | `{io_failure, opened, lockLeft:true}`; `root_changed`/`lockLeft:false`; S16: `LAUNCHED(1)` no último hook + K1–K3 vermelhos com `io_failure`/`delivery_timeout` | `store.unit:562`, `:580`, `:600` (carry); `end.e2e:831-846`, `:848`, `:886-914`, `:916-1054` | `I25-C43 …` (abertura, 3 diagnósticos, sempre, trocado, processos reais, encerramento) | e2e+unit | A/B/C/D | **fresca** (S16) + carry | `end.e2e`, `producer-runs.mjs` `0b147ffd`, `traces.mjs` `1f7ee30b`, `store.unit` |
| C44 | contagem fechada | `failed`/`timeout`/`inactive` | `hermes-harness.unit:288`, `:291` | `I25-C44 …`, I4-C22 (D) | unit+nativo | A/B/C/D | carry-R26 | `hermes-harness.unit` |
| C45 | PATH vazio | = cwd no POSIX; Windows ignora | `agent.unit:132-146`; `command.cli:166-186` | `I25-C45 …` | unit+CLI | A/B/C/D; processo P em C | carry-R26 | `agent.unit`, `command.cli` |
| C46 | T8-C15 + (a)–(u) + F1 R24/R25 | 2×40 → 80, por produtor 40/40/40/0; T8-C16 3 criações; flush `[2,2,2,2]`; (p) `[creation, 2]` | `concurrency.cli:221-222`, `:233-236`, `:305`, `:333`, `:360`, `:965-969`, `:1007`, `:1013-1019`, `:1031-1033`, `:1094-1098`; `delivery.unit:52-113`; `evidence.unit:241-283`, `:345-373`; `agents.e2e:469-486`, `:504-526` | T8-C15, (a)–(c), T8-C16, (o), (p) `I25-C46 prazo da entrega…`, (u) | CLI+unit+e2e | A/B/C/D; disputa (u) estatística, só discrimina no W | carry-R26 (nenhum arquivo do C46 no diff) | `concurrency.cli`, `delivery.unit`, `evidence.unit`, `agents.e2e`, `traces.mjs`, `delivery.mjs`, `store.mjs` |
| C47 | I23-C10 + (a)–(d) | (a) `io_failure` 1/0/0/1/0, `[["rename segmento.tmp EIO (sob o lock, 2ª tomada)"],0,1]`; (b) `delivery_timeout`, `close key (sob o lock, 2ª tomada)` | `agents.e2e:328-381`, `:428-436`, `:443-449`; `evidence.unit:150-225`; `control.cli:1071-1077`, `:1097-1105` | `I23-C10 …`, (a)/(b), I23-C4 (c)/(d) | e2e+CLI+unit | A/B/C/D | carry-R26 | `agents.e2e`, `evidence.unit`, `control.cli` |
| C48 | workflow: só `timeout-minutes`; pwsh real | 20/10/5, manual 10; pwsh 0/17→1 | `governance-ci:373-433`, `:444-582`, `:511`, `:565-576`; `:271-283` | `governance-C48 …`, `…pwsh real…` (W), `governance-C1 C3` | workflow | A/B/D; C skip pwsh | carry-R26 | `governance-ci.test`, `.github/workflows/*` |
| C49 | job `lock_diagnostics` | campos exatos | `governance-ci:322-362`, `:299-304` | `governance-C49 job manual…` | workflow | A/B/C/D | carry-R26 | `governance-ci.test`, workflow |
| C50 | medição esquema 2 | `[2, "individual: um lock por produtor; não mede disputa entre produtores"]` | `ci-lock-latency.test:146`, `:216-219`, `:231-232`, `:397`, `:399`, `:412` | 18 `C50 …` | unit/script | A/B/C/D, `RUNNER_TEMP` válido | carry-R26 | `scripts/ci-lock-latency*` |

**Provas S19/S17 do gate** (sem check novo, Landing L142-149: "não muda C1–C50"; elas sustentam o **AC2**):

| Prova | Valor | Asserção (`install-apply.unit` salvo nota) |
| --- | --- | --- |
| I4-C34l G1–G7 | 7 tentativas; esperas `[10,20,40,80,160,320]`; predicado no 7º | `:2899-2913`, `:3017-3024` |
| I4-C34k K1–K13, K12h–j | política W, guardas por tentativa, limpeza só do próprio, `foreign_artifact`, EIO/POSIX 1, identidade indisponível 5 | `:3155-3389`, `:3444` |
| I4-C34m | raiz trocada no `lstat` BigInt → sem `mkdir` alheio | `:3456-3524` |
| I4-C34n / I4-C34o | 3 / `[10,20]`; EIO 1 / `[]`, mesmo erro | `:3570-3597`, `:3605-3636`; `:3703-3795` |
| I4-C34h / I4-C34i | cenários/expectativas antigos intactos com montagem aguardada | `:1426`, `:1504-1507`; `:1805`, `:1870-1874` |
| I4-C34g / CLI partial | `assert.equal(…, 0, msg)` com evidência relativa ao home | `:409-411`; `install.cli:1375-1376`, `:1617-1634` |

### Refinamentos C46, C47, C50 (frescos por conteúdo)

- **C46**: os refinamentos F1 R24 (`neutralPlace`, 4 consumidores) e F1 R25 (espera `lockReleases === 2`) não mudam
  desde a R26. Nenhum arquivo do C46 aparece no `since-r26.diff`. `delivery.mjs` (`792f4742`) e `traces.mjs`
  (`1f7ee30b`) estão no pack com os mesmos hashes que a R26 registrou. A nova adoção de
  `recordProducersInEachTest` no `end.e2e` reusa `producer-runs.mjs`/`traces.mjs` sem alterá-los.
- **C47**: sem delta. Os literais (a)/(b) seguem sob o lock.
- **C50**: sem delta. A exceção do AC9 cobre só o job manual e a política S19. O retry S19 não aparece na medição de
  latência (`ci-lock-latency` não usa `install/run.mjs`).

## 6. ACs (9)

| AC | Checks | Delta 27 | Estado |
| --- | --- | --- | --- |
| AC1 | C1–C6, C45 | nenhum | pendente de A/B/C/D |
| AC2 | C7–C15, C38 + **exceção S19** (I4-C34g/h/i/k/l/m/n/o, CLI partial) | `run.mjs`, `install-apply.unit`, `install.cli` | pendente; o texto do AC2 (contexto L16) confere com o código (§4) |
| AC3 | C16–C24 | nenhum | pendente |
| AC4 | C25–C35, C41–C43 | `end.e2e` (S16) | pendente |
| AC5 | C36–C37 | nenhum | pendente |
| AC6 | C39, C40, C44 + nativos | instalação Hermes dos nativos passa por `run.mjs` | pendente; os nativos só no full |
| AC7 | C46 | nenhum | pendente |
| AC8 | C47, C48 | nenhum | pendente |
| AC9 | C49, C50 | ressalva S19 no texto (contexto L27) | pendente; a medição remota, os 5 checks verdes e o formal são **condição de merge**, não deste Verifier |

## 7. Achados pré-provas (por leitura; nenhum é veredito)

Bloqueantes: **nenhum encontrado pela leitura.** Isso **não** é PASS.

1. **R1 — robustez de prova (não bloqueante; não é defeito de produto).**
   - **Cenário**: nas linhas da C34k K7a–e, K10a–c, K11a–c e na C34m, a troca da fixture é montada com
     `renameSync` simples (`install-apply.unit:3130`, `:3304`, `:3316`, `:3330`, `:3347`, `:3359`, `:3472`). Se
     esse movimento receber um EPERM natural do Windows (a mesma classe vista no C34h, 7/200), o erro real sai pelo
     wrapper de rename do `s19PromotionIo`.
   - **Esperado**: a linha prova a guarda (exit 4 / conflito).
   - **Atual possível**: como o erro é EPERM e a plataforma é `win32`, o produto repete; a tentativa seguinte, real,
     promove, e a linha veria exit 0 em vez de 4.
   - **Impacto**: vermelho falso intermitente, só no Windows, nunca verde falso. O produto está correto.
   - **Local**: linhas citadas. O Root decidiu não estender o montador "sem evidência"; registro sem corrigir.
2. **O1 — K11c (observação)**: com `.skill-me` trocado, a promoção conclui e só o manifesto e o lock são recusados.
   Coerente com o AC2, que exige identidade de raiz/plugins/staging, e com `adoptStateGuard`. Não é contradição.
3. **O2 — duplicação menor**: a lista de códigos do predicado `retryable` de `s19MoveFixtureDirectory`
   (`unit:3533-3546`) repete `RENAME_DENIED` em vez de importá-lo. Impacto nulo hoje; deriva possível.
4. **O3 — política histórica**: o controle permanente S17 de 1 tentativa é histórico. A política vigente
   (7 tentativas no W) é provada por K4/K4b, G1 e C34n/o. Não confundir os dois nos logs.
5. **O4 — drift de citação**: as linhas de `end.e2e` citadas pela R26 não valem mais no HEAD. Usei as frescas (§5).
6. **N1/N3/N4 da R26 continuam válidos**:
   - N1: o texto F1 do C46 (u) ainda diz "vermelho na importação";
   - N3: o C46 (p) não tem RED natural;
   - N4: o `unsure` está duplicado em `concurrency.cli:146`.
7. **Desempenho (sem SLO; não esconder)**: no S18 AFTER do Root (`comparison-root.json`), A/B foram 100/100, com p50
   38,03/38,43 ms contra 18,47/16,66 ms antes e p99 142,72/66,73 contra 43,79/23,71 ms. Sem contrato violado, mas é
   aumento registrado.

Lacunas declaradas:
- **G1** a identidade dos blobs `8f393c5` × HEAD (todos os arquivos de `src tests scripts .github package*`) só vem
  do diff do Root. Sem o A, todo carry-R26 é condicional.
- **G2** os arquivos fora do pack não foram relidos.
- **G3** não li `feature.diff`.
- **G4** causas físicas continuam **desconhecidas**: `delivery_timeout` S16 (CI 58), instalações S17, os 3 EPERM do
  S18, os EPERM do C34h/C34i e os históricos da R25/R23/CI 066. Um verde não as resolve.

## 8. Gates pendentes (escritos ANTES de qualquer execução)

- **Exatamente 4 comandos** que o Root liberar nesta mesma sessão, depois de conferir a `ReadExactCoverage`. Uma vez
  cada, sequenciais, em primeiro plano, sem `run_in_background`, sem repetição. Paro na primeira falha, omissão ou
  intervenção e preservo nome, motivo e números.
- **A** precisa trazer a comparação de identidade. Ela só valida o carry se mudaram exatamente os 4 executáveis do
  §4; senão o carry cai e o check vira re-análise.
- Esperados do autor são só referência, não expectativa minha.

## 9. Processo e histórico (preservado, sem reclassificar)

- **Meu processo**: Read, Grep, Glob e este Edit. Nenhum Bash/PowerShell/Write/Agent/Task/rede/agente
  real/teste/sonda. 0 processos em segundo plano. **Incidentes meus: nenhum.**
- **Preservados como registrados** (não toquei nem restaurei):
  - o `Temp\x` global **preexistente sobrescrito na S14**, sem cópia conhecida e com impacto desconhecido; não toco
    de novo;
  - S16 D e S17 A **FAIL**;
  - omissões B/C/D do S17;
  - S19 A em `c94cdab` **FAIL** (C34h índice 8);
  - B R2 **FAIL** (C34i);
  - R3 A em `8b690bd` **FAIL** (C34n 4 vs 3);
  - REDm 1/0/1;
  - 14 formais e 26 independentes consumidos; FAIL 23/24/25; CI 066 vermelha; a cancelada 40814471097;
  - os incidentes S13/S14/S15 listados na R26 §10.
- **Não existe D25 nem final25**, e não os invento. A auditoria de metadados WSL **não é sandbox do SO** e não prova
  impacto global zero.
- Gates do autor/Root (A/B/C/D/AFTER S19, K/G, experimentos) **não são provas minhas**.
- Gates remotos pendentes: PASS 27 → formal 15 `ready` → push → manual com medição → checks verdes no mesmo HEAD →
  merge. Não declaro nenhum deles.

## 10. Fechamento — gates executados e veredito (at `7fac597`)

### 10.1 Execuções

- Antes do A, li `worker-guard/matrix-controller.mjs` inteiro (62 linhas):
  - o ramo de identidade (`:23-33`): `ls-tree -r` de `src tests scripts .github package.json package-lock.json` em
    `8f393c5` × HEAD, os 4 esperados (`:29`) e os 5 do core contra a base (`:30`);
  - `valid` só com igualdade exata (`:31`), gravado com `wx` (`:32`);
  - `check()` de HEAD, status, fontes e drivers antes e depois (`:7`, `:8`, `:49`);
  - a reivindicação `wx` (`:9`);
  - a validade do resultado (`:59`: `EXIT=0`, `tests`/`pass` > 600, `fail` 0, `cancelled` 0).
- Os quatro comandos literais do Root rodaram **uma vez cada, sequenciais**, cada um numa chamada Bash própria em
  primeiro plano com timeout de 600.000 ms. Nenhum usou `run_in_background`, nenhum foi para o fundo sozinho, e cada um
  só rodou depois do resultado real do anterior. **Parei no primeiro FAIL (D), sem repetir.**

| Gate | Ambiente (do driver/controlador) | UTC | Resultado (`ℹ`) | `valid` / término |
| --- | --- | --- | --- | --- |
| A | Windows, checkout, Node 24.22.1, conc 8 | 13:15:22–13:22:01 | **662 / 649 / 0 / 0 / 13** | `true` / 0 |
| B | clone novo `core.autocrlf=true`, Node 24.13.0 oficial, conc 8 | 13:22:14–13:28:10 | **662 / 649 / 0 / 0 / 13** | `true` / 0 |
| C | WSL Ubuntu, archive LF com guarda de árvore, Node 24.13.0, `env -i`, conc 7 | 13:28:13–13:29:49 | **662 / 640 / 0 / 0 / 22** | `true` / 0 |
| D | `npm test` completo, Windows, Node 24.22.1, npm 11.19.1, Python 3.12.10, runner 8; TEMP isolado dentro da pasta-mãe curta própria `.checks/code-review/t-28Rfua` (`D-short-parent.json`: pasta, não link, dev `1358919193`, ino `10977524095363793`, retida); status `[]` antes e depois; HEAD igual | 13:29:52–13:30:57 | governança **27/27/0/0/0**; motor **16/15/1/0/0**; doctor e integrações **não executados** (`&&`) | **`false`** / **1** |

- **Identidade (G1 resolvida)**: `independent-27/identity-comparison.json` com `valid: true`:
  - `changed` = `expectedChanged` = `run.mjs`, `install-apply.unit.test.mjs`, `install.cli.test.mjs`,
    `launch/end.e2e.test.mjs`;
  - os 5 do core iguais à base (`25e52841`, `c6a4abcd`, `b02001e2`, `1bda8e45`, `216125ce`).
  O carry-R26 das citações dos arquivos de blob igual é **válido**.
- **Skips**:
  - A e B: 13, todos com motivo. São I4-C15, I4-C25b/j/k/l/m, I25-C45 POSIX, C5 POSIX, C6, C42 POSIX, C33 arranjo,
    C15 e T8-C4 (`A.log:45,192,214,216,217,255,257,259,263,281,309,394,714`; mesmos números em B).
  - C: 22, todos com motivo. São:
    - 11 `hermes-runtime-ausente` (`C.log:144-153,155`);
    - `governance-C48` pwsh (`:27`);
    - I4-C25g/h/i (DACL) e I4-C25m (macOS);
    - I25-C4 shim, C45 controle W, C5 console, C42 console, C8 LOCALAPPDATA e C38.
  - Os só-POSIX passaram em C; os só-Windows passaram em A/B. O macOS (I4-C25m) não rodou em ambiente nenhum, só na CI
    posterior.
- Nenhum `✖`/`not ok` em A, B ou C.

### 10.2 A falha (FAIL D) — preservada, sem repetição

- **Nome**: `C11 comando com limpeza falha imprime o relatório ready, sai com 0 e avisa a pasta no stderr`
  (`D.log:53`, `:77`). É o C11 **do motor de revisão vendorizado**, não o C11 da #25.
- **Motivo**: `TypeError: Cannot read properties of undefined (reading 'report')` em
  `scripts/code-review/review.test.mjs:349` (`state.attempts[0].report.status`). O `issue-7.state.json` da fixture não
  tinha a 1ª tentativa registrada quando o teste o leu. O stdout/stderr do CLI filho não aparece no log.
- **Números**: motor 16/15/1/0/0 (`D.log:65-72`). A variante `changes_requested` (`:54`) e os demais C10/C11 passaram.
- **Causa**: **desconhecida**. O core tem blob igual à base, e a R26 passou 16/16 no mesmo arquivo. Isso exclui o diff
  da feature no core como alteração, mas não identifica a causa. Não atribuo a TEMP curto, disco, AV, relógio, Node
  ou carga. Não reproduzi nem repeti.
- **Efeito no gate**: o `npm test` encadeia por `&&`, então `test:doctor` e `test:integrations` **não rodaram no D**.
  O que falta é **só a execução no D**:
  - os 11 nativos Hermes com runtime;
  - o I4-C35 de integridade;
  - o `I23-C8 … Python do sistema`;
  - toda a suíte de integrações e o doctor no runner padrão do `npm test`.

  O AC6 exige o gate completo repetido com os nativos, e esse gate ficou FAIL.
- **Retificação factual (§10.7)**: o texto original deste item dizia que esses testes ficavam "sem prova nesta
  rodada". Isso generalizava demais.
  - A e B rodam os 68 arquivos de integração, inclusive `hermes-plugin.native`. Lá passaram com runtime os 11
    nativos: I4-C18–C23 (A:145-150, B:145-150), I4-C37 (A:151, B:151), `I25-C40 harness nativa` (A:152, B:152), os
    dois I23-C8 com runtime (A:153-154, B:153-154) e I4-C44b (A:156, B:156).
  - Passaram também o `I23-C8 … pelo Python do sistema` (A:155, B:155, C:154), que não conta como nativo, e o
    I4-C35 (A:637, B:637, C:611).
  - No C, os 11 nativos são skips esperados `hermes-runtime-ausente` (`C.log:144-153`, `:155`).
- O D removeu a raiz isolada por identidade (1 entrada deixada pelos testes, `D.env.txt:12`) e a `runner-temp-D`
  vazia. A pasta-mãe `t-28Rfua` fica **retida**.

### 10.3 Checks — uma linha por check

Origem da asserção:
- **carry-R26** = citação da R26 num blob **provado igual** pelo meu A;
- **fresca** = lida por mim no HEAD (§4/§5).

Linhas de log em `independent-27/{A,B,C}.log`:
- **B** repete os números de A. Conferi a amostra 24-27, 152, 163, 177-213, 307, 354, 638, 657-670 e 718; nos demais
  nomes conferi só o mesmo nome ✔ e as contagens iguais.
- **C** foi conferido por nome nas linhas citadas.

**Nenhum check é PASS**: o D, exigido por todos, falhou e não executou integrações. "ABC ✔" é evidência parcial
verdadeira, não PASS.

| Check | Claim e valor | Asserção · origem | Prova nomeada (log:linha) | Result |
| --- | --- | --- | --- | --- |
| C1 | `--help` 0/stdout; `private` | `command.cli:48-49`, `:65`, `:77` · carry-R26 | `I25-C1 npm link…` A:251 | ABC ✔; D ausente → **não PASS** |
| C2 | args literais | `command.cli:96-98` · carry-R26 | `I25-C2 …` A:252 | idem |
| C3 | 0/7 | `command.cli:105` · carry-R26 | `I25-C3 …` A:253 | idem |
| C4 | shim; 127 `launcher_requires_shell` | `command.cli:130-133`; `agent.unit` · carry-R26 | `I25-C4 …` A:245-246, 254 (W; C skip `:229`) | idem |
| C5 | sinais 1× | `command.cli:228`, `:244-245` · carry-R26 | `I25-C5 Ctrl+C…` (W) A:258; POSIX (P) C ✔ | idem |
| C6 | SIGTERM 1× | `command.cli:267` · carry-R26 | `I25-C6 SIGTERM…` (P) C:234 | idem |
| C7 | 127 `executable_not_found` | `prepare.cli:93-94` · carry-R26 | `I25-C7 …` A:298 | idem |
| C8 | prévia 500/8 MiB/7 dias | `prepare.cli:122-126` · carry-R26 | `I25-C8 …` A:299-300 | idem |
| C9 | confirmação aplica (instalação Hermes via `run.mjs`) | `prepare.cli:163-168` · carry-R26 + produto tocado | `I25-C9 …` A:301 | idem |
| C10 | 3 `setup_declined` | `prepare.cli:189-191` · carry-R26 | `I25-C10 …` A:302 | idem |
| C11 | 2 `root_not_absolute` | `prepare.cli:200` · carry-R26 | `I25-C11 …` A:303 | idem |
| C12 | 3 `setup_required` | `prepare.cli:223` · carry-R26 | `I25-C12 …` A:304, 308 | idem |
| C13 | SHA-256 iguais, sem prévia | `prepare.cli:238` · carry-R26 + produto tocado | `I25-C13 …` A:305 | idem |
| C14 | conflito 4 / inválida 3 | `prepare.cli:250` · carry-R26 + produto tocado | `I25-C14 …` A:306 | idem |
| C15 | pty | `prepare.cli:408` · carry-R26 | `I25-C15 terminal real (pty)…` (P) C:284 | idem |
| C16 | segmento 1, par da execução | `session.e2e:67` · carry-R26 | `I25-C16 …` A:248, 315 | idem |
| C17 | formato persistido | `store.unit:79` · carry-R26 | `I25-C17 …` A:322-325 | idem |
| C18 | 3/4/5 sem caminho | `session.e2e:111` · carry-R26 | `I25-C18 …` A:316 | idem |
| C19 | só na captura corrente | `session.e2e:161` · carry-R26 | `I25-C19 …` A:317 | idem |
| C20 | `binding_invalid` | `session.e2e:190-192` · carry-R26 | `I25-C20 …` A:318 | idem |
| C21 | bytes iguais on/off | `session.e2e:208-211` · carry-R26 | `I25-C21 …` A:319 | idem |
| C22 | 503 → 500 + 3 | `session.e2e:230` · carry-R26 | `I25-C22 …` A:320 | idem |
| C23 | 8.388.608 bytes | `session.e2e:282` · carry-R26 | `I25-C23 …` A:321 | idem |
| C24 | sucessora após stop | `store.unit:168` · carry-R26 | `I25-C24 …` A:327 | idem |
| C25 | 2 `stopped`, ponteiro fora, status 3, stderr literal | `end.e2e:80-97` · fresca | `I25-C25 …` A:268 | idem |
| C26 | stderr literal × 3 agentes | `end.e2e:109-117` · fresca | `I25-C26 …` A:269 | idem |
| C27 | `launch_ended` 1/0/0/1; árvore igual | `end.e2e:128-129` · fresca | `I25-C27 …` A:270, 328-329 | idem |
| C28 | `persisted 3`; perdida `["EIO"]` | `end.e2e:163-176`, `:187-203` · fresca | `I25-C28 …` A:271-272 | idem |
| C29 | sinal → `stopped` | `command.cli:278` · carry-R26 | `I25-C29 …` A:260 | idem |
| C30 | 127/126, 0 eventos | `command.cli:342` · carry-R26 | `I25-C30 …` A:261 | idem |
| C31 | 6 / 2 com orientação | `end.e2e:213-230`, `:252-266` · fresca | `I25-C31 …` A:273-274 | idem |
| C32 | simultâneas isoladas; 1ª criação | `end.e2e:273-453` · fresca; `store.unit:715` · carry-R26 | `I25-C32 …` A:275-279, 346-349 | idem |
| C33 | on/off; arranjo `npm run` | `end.e2e:454-515` · fresca | `I25-C33 …` A:280; arranjo (P) C:256 | idem |
| C34 | report da última execução | `report.cli:159` · carry-R26 | `I25-C34 …` A:310-313 | idem |
| C35 | `no_launch_capture`/`not_configured` | `report.cli:252-259` · carry-R26 | `I25-C35 …` A:314 | idem |
| C36 | ajuda 0/2 | `command.cli:350` · carry-R26 | `I25-C36 …` A:262 | idem |
| C37 | README/guias | `launch/docs.test:82` · carry-R26 | `I25-C37 …` A:265-267 | idem |
| C38 | console W, acento | `prepare.cli:355` · carry-R26 | `I25-C38 console real…` (W) A:307 B:307 | idem |
| C39 | 300 ms estáveis | `hermes-harness.unit:90` · carry-R26 | `I25-C39 …` A:136-138 | idem |
| C40 | failed/timeout; 5.000 ms; nativos | `hermes-harness.unit:220-327`; `hermes-plugin.native:336` · carry-R26 + produto tocado | `I25-C40 …` A:139-140, 144; `I25-C40 harness nativa` A:152 B:152 (C skip esperado `:151`); I4-C20/C21/C37 com runtime A:147-148, 151 B:147-148, 151; **no D não rodaram (D parado)** | **não PASS** (D ausente) |
| C41 | sucessora não publicada, vínculo | `end.e2e:516-…` · fresca; `store.unit:327-523` · carry-R26 | `I25-C41 …` A:282-287, 330-340 | ABC ✔; D ausente |
| C42 | cancelamento antes do agente | `agent.unit`; `command.cli:424`, `:456` · carry-R26 | `I25-C42 …` A:249-250, 264 (W); POSIX (P) C ✔ | idem |
| C43 | `{io_failure, opened, lockLeft:true}`; S16 K1–K3 | `end.e2e:831-1054` · fresca; `store.unit:562-600` · carry-R26 | `I25-C43 …` A:288-297, 341-345 | idem |
| C44 | `failed`/`timeout`/`inactive` | `hermes-harness.unit:288`, `:291` · carry-R26 | `I25-C44 …` A:141-143; I4-C22 nativo A:149 B:149 (C skip esperado `:148`); **no D não rodou** | **não PASS** (D ausente) |
| C45 | PATH vazio | `agent.unit:132-146`; `command.cli:166-186` · carry-R26 | `I25-C45 …` A:247, 256 (W); POSIX (P) C ✔ | ABC ✔; D ausente |
| C46 | T8-C15 80; (a)–(u); F1 R24/R25 | §5 linha C46 · carry-R26 (blobs iguais) | T8-C15 A:638 B:638 C:613; `I25-C46 prazo da entrega … antes do onLock` A:657 B:657 C:631; demais `I25-C46` A:48-49, 128, 357-358, 404-413, 639-724 | idem |
| C47 | I23-C10; (a)/(b); (c)/(d) | §5 linha C47 · carry-R26 | I23-C10 A:354 B:354 C:328; `I25-C47` A:355-356, 372-373, 690-691 | idem |
| C48 | só `timeout-minutes`; pwsh real | `governance-ci:373-582`, `:271-283` · carry-R26 | `governance-C48` A:26-27 B:26-27 C:26 (pwsh skip C:27); `governance-C1 C3` A:24; **D governança 27/27 ✔** (`D.log:32-35`) | ABC ✔ + D-governança ✔; D global FAIL → **não PASS** |
| C49 | job `lock_diagnostics` | `governance-ci:299-362` · carry-R26 | `governance-C49` A:25 B:25 C:25 D:33 | idem |
| C50 | esquema 2, individual | `ci-lock-latency.test:146-412` · carry-R26 | 18 `C50 …` em A, B e C e D:9-26 | idem |

**Provas S19 (AC2)**: passaram em A, B e C:
- I4-C34g (A:163 B:163 C:161)
- I4-C34h (A:177 B:177 C:170)
- I4-C34i (A:179 B:179 C:172)
- I4-C34j (A:180)
- I4-C34l (A:201 B:201 C:186)
- I4-C34k (A:202 B:202 C:187)
- I4-C34m (A:205 B:205 C:189)
- I4-C34n (A:209 B:209 C:193)
- I4-C34o (A:213 B:213 C:197)

Elas não rodaram no D.

**Outros nomes conferidos**: T8-C8 A:718 B:718 C:692 ✔. A causa histórica do F2 da R25 continua desconhecida.

### 10.4 ACs (texto canônico; nenhum critério criado)

| AC | Estado |
| --- | --- |
| AC1 | **não atendido nesta rodada**: ABC ✔, D ausente |
| AC2 (com a exceção S19) | **não atendido**: ABC ✔ (inclui I4-C34g–o), D ausente |
| AC3 | **não atendido**: D ausente |
| AC4 | **não atendido**: D ausente |
| AC5 | **não atendido**: D ausente |
| AC6 | **não atendido**: o critério exige "o gate completo é repetido com os casos nativos aplicáveis", e o D falhou antes deles |
| AC7 | **não atendido**: D ausente |
| AC8 | **não atendido**: D ausente |
| AC9 | **não atendido**: D ausente; medição remota e CI continuam condição de merge |

### 10.5 Achados finais

1. **F1 (bloqueante para esta verificação) — FAIL do gate D.**
   - **Cenário**: `npm test` completo no Windows, no HEAD `7fac597`.
   - **Esperado**: motor 16/16 e o restante executado.
   - **Atual**: motor 16/15/1, ✖ `C11 … ready …` (`TypeError` em `review.test.mjs:349`), e doctor e integrações não
     executados.
   - **Impacto**: não há PASS 27. Nativos Hermes, I4-C35 e integrações não rodaram **no D**; em A/B passaram
     (§10.2, retificação factual).
   - **Local**: `scripts/code-review/review.test.mjs:339-363`; `independent-27/D.log:53-85`.
   - **Causa desconhecida**: o core é igual à base pela identidade A.
2. R1 (robustez da C34k/C34m sob EPERM natural da fixture) e as observações O1–O4, N1/N3/N4 da §7 continuam como
   escritas. Nenhuma se manifestou em A/B/C.
3. **Limites**:
   - a comparação S18 A/B 100×2 é do Root, não é a medição de 4.500 ciclos nem SLO;
   - as causas físicas históricas (S16 CI 58, S17, os EPERM do S18/C34h/C34i, R25 F2) continuam desconhecidas;
   - os verdes A/B/C são deste computador e não medem o runner da CI;
   - os gates e o AFTER do autor/Root são só atribuídos.

Sem fault injection, `Coverage` ou `Test policy` (perfil light). Não reexecutei controles S17 obsoletos.

### 10.6 Processo da fase de execução

- **Comandos executados**:
  - exatamente os quatro comandos literais, uma vez cada, em primeiro plano;
  - A, B e C com término natural 0; o D terminou natural com 1 (exit 2 do controlador);
  - 0 tarefas em segundo plano.
- **Leituras depois dos gates (só leitura)**: os logs e resultados do controlador e `review.test.mjs:300-369`, para
  registrar a falha. Nenhum outro Bash.
- **Incidentes meus: nenhum.** Não toquei no `Temp\x` global nem no `/tmp`. Não editei `.verified.md`, produto, testes
  ou config.
- **Auditoria externa 27**: do Root, **pendente**. O Root a fecha depois do D27 real; não invento dados dela.
- **Não executei** formal 15, push, manual, CI nem merge. Todo o histórico da §9 fica preservado como estava.

### 10.7 Retificação factual (mesma sessão Verifier27, sem nova rodada)

- **Origem**: o Root leu o relatório inteiro (45.621 bytes, SHA `0212d7bb…`, 5 chunks) e preservou
  `report-before-clarify.bin`. Ele apontou que o §10.2/§10.3 e o fechamento generalizavam a ausência dos nativos
  Hermes/I4-C35 para a rodada inteira. A nota é **do Root**; ela não é execução minha nem substitui o D.
- **Conferência direta minha**, só com Grep nos logs retidos e sem executar nada:
  - `A.log` e `B.log`, linhas 145-156: os 11 nativos com runtime ✔ e o `I23-C8 … Python do sistema` ✔ (`:155`);
  - I4-C35 ✔ em A:637 e B:637;
  - no `C.log`, os 11 nativos são `﹣` `hermes-runtime-ausente` (`:144-153`, `:155`), skips esperados; I23-C8 Python
    do sistema ✔ (`:154`) e I4-C35 ✔ (`:611`).
- **Corrigido**: o §10.2 "Efeito no gate", o cabeçalho, as linhas C40 e C44 do §10.3 e o impacto do F1 no §10.5. A
  ausência é **somente no D**.
- **Não muda**:
  - o veredito FAIL;
  - o D 43/42/1/0/0, término natural 1, com doctor e integrações não executados no D;
  - 0/9 ACs (o AC6 exige o gate completo, que é FAIL);
  - os resultados por check;
  - a análise pré-provas e o histórico.
- **Nesta retificação**: só Read/Grep e Edit neste arquivo. Nenhum teste, retry, Bash, Write, Agent, commit, push ou
  CI. Não toquei no `Temp\x` global.
