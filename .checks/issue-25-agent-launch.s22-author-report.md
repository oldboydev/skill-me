# S22 — Landing proposta ANTES do código (nenhum código, teste ou comando executado; não é PASS)

Autor Claude S22 (mesma sessão do CLI interrompido pelo Root). Fase: somente leitura + este relatório. Nenhuma edição em Source, nenhum Bash/Write/agente, nenhum teste executado. Nada aqui é RED, GREEN ou PASS.

## 0. Rastro do processo (preservado, sem maquiagem)

- 1ª execução do CLI deste autor: o Root a parou deliberadamente (pid 117548, 17:31:43.779Z → 17:39:02.837Z, exit 4294967295), segundo `read-completion-plan.json`, para evitar a releitura do pacote inteiro. **Não terminou com 0.** Segundo o Root, não havia código nem teste em execução e nenhuma fonte foi alterada; pelo meu lado, só fiz Read/Glob/Grep e nenhum Edit antes deste.
- A brief inicial não dava o diretório do pacote, então li **os originais** no HEAD c074a2d (status limpo): o plano S22 inteiro; `.tasks/issue-25-agent-launch.md:1180-1193`; da unit, `1-80`, `726-755`, `1359-1374`, `1675-1685`, `1940-1964`, `2846-3795` e as linhas avulsas do Grep; `run.mjs` 1-1101 inteiro (em 5 Reads); `io.mjs` 1-124 inteiro. Também usei Grep/Glob para localizar o pacote, o guard e o relatório. Do pacote, antes da interrupção: `3088-3117` e `3253-3379`.
- Depois da retomada li no PACOTE **somente** os 16 pares de `read-completion-plan.json` (1/150, 151/150, 301/33, 367/52, 419/29, 460/1, 516/6, 552/23, 591/53, 655/39, 701/6, 1655/1, 2757/1, 2882/150, 3032/56, 3118/135).
- **Não afirmo que li o pacote inteiro.** As vistas da task/checklist/round28 são vistas, e não li o checklist nem a task inteiros, o feature.diff ou o relatório 28 inteiro. Também não li `ancestorSwapIo:1426+` nem `stagingSwapIo:1805+`, que ficam fora das vistas. Por isso a proposta não depende do interior deles.

## 1. Mecanismo: inferido do código, não observado

`s19PromotionIo` (unit:3093-3101) chama `swap()` **sincronamente** dentro do `rename` instrumentado, antes de `probe.foreign`/`probe.swapped` e antes de `throw simulated(...)`. No K7d, `swap` = `moveStaging` = `renameSync` puro (unit:3130, 3208-3212), sem a política da fixture. Se `renameSync` lançar, o erro **dessa montagem** sai do `io.rename` como se fosse a recusa da promoção. Em `win32`, `run.mjs:903-910` repete EPERM/EACCES/EBUSY; a 2ª tentativa passa da quantidade de `denials` (1), faz o rename real e o resultado é `applied`. Isso bate com FAIL28: attempts 2, exit 0, foreign `—` (`probe.foreign` nunca atribuído), own `ausente` (`ctx.moved` nunca criado). O código exato não aparece no log, e a causa física continua **desconhecida** (não a atribuo a AV, Node ou handle). O mesmo encanamento também tem dois defeitos latentes: (a) uma montagem assíncrona não seria aguardada (`swap() ?? null` guardaria uma Promise); (b) qualquer falha de montagem em K7–K11 vira erro de produto, sem identificação.

## 2. Landing proposta (literal; o Root revisa antes de qualquer escrita)

**L1 — Montagem aguardada e separada do retry do produto em `s19PromotionIo` (encanamento compartilhado K7–K11, trecho delimitado).**
- unit:3081 → `const probe = { attempts: 0, swapped: false, through: [], foreign: null, foreignBefore: null, mountError: null };`
- unit:3096-3100 passam a ser:
  ```js
  if (probe.attempts === 1 && swap) {
    let foreign;
    try {
      foreign = await swap();
    } catch (error) {
      probe.mountError = error;
      throw new Error("fixture: a montagem da troca falhou", { cause: error });
    }
    probe.foreign = foreign ?? null;
    probe.foreignBefore = probe.foreign === null ? null : entrySnapshot(probe.foreign);
    probe.swapped = true;
  }
  ```
- Efeitos:
  - O produto fica parado dentro do próprio `io.rename` até a montagem terminar, portanto não faz nenhuma operação enquanto ela está pendente.
  - Se a montagem falhar, o produto recebe um Error **sem `code`**: o predicado S19 não o repete e `run.mjs:1097` o transforma em `io_error`. Assim não há segunda tentativa nem promoção depois da falha.
  - `swapped` não é marcado e o foreign não é fotografado antes do fim da troca.
  - O erro original fica preservado como `probe.mountError` (o mesmo objeto) e como `cause`.
  - Swaps síncronos (K8/K9/K10/K11) mantêm a semântica, com apenas um microtask a mais.
- Comentário 3068-3078: acrescento uma frase ("a montagem é aguardada; se falhar, o io recusa sem código e guarda o erro original em `probe.mountError`").
- **Alternativas rejeitadas:**
  - Repassar o erro original ao produto, como C34n/o fazem: aqui o consumidor é o `rename` que repete por código, e um EPERM da montagem voltaria a alimentar o retry.
  - Bloquear todas as operações seguintes do produto: o resultado dependeria de interior do produto (lock fica, passo `lock` falho) sem discriminar nada a mais.
  - Resolver sem rename: seria falso sucesso.
  - Fazer o rename real: seria promoção depois da falha.

**L2 — Falha de montagem explícita na tabela C34k (uma linha nova no laço).** Logo depois de `unit:3419` (`const result = await runIntegrationCommand(...)`):
`if (probe.mountError !== null) throw new Error(`fixture: montagem da troca falhou em "${row.label}"`, { cause: probe.mountError });`
Assim o C34k falha nomeando a linha e com o erro original como causa, nunca como "applied" sem troca. Os labels, `base`, `expect`, `observed` e o `deepEqual` não mudam. Rejeitado: acrescentar um campo `mountError` em `observed`/`base`, porque mudaria a forma esperada da tabela.

**L3 — Movimento físico do staging próprio pela política existente (só a família K7, onde o FAIL ocorreu).**
- unit:3130 → `const moveStaging = (ctx) => s19MoveFixtureDirectory(ctx.staging, ctx.moved);`. A política do auxílio fica intacta: guarda BigInt da origem, destino ausente, Windows 7/630 para EPERM/EACCES/EBUSY, demais códigos e POSIX com 1 tentativa.
- Os consumidores de `moveStaging` passam a `async` + `await`, com os mesmos efeitos e a mesma ordem:
  - `stagingLinkedTo` (3133-3139);
  - K7a swap (3177-3181);
  - K7d swap (3208-3212);
  - K7e swap (3223-3229).
- Nenhum `expect` muda.
- K10/K11 (`renameSync` de plugins/raiz/.skill-me) **ficam como estão**: não há evidência de falha ali, e mexer neles seria corrigir uma omissão hipotética. Pelo L1/L2, uma recusa neles passa a falhar de forma explícita, não mascarada. Rejeitado: migrá-los também, porque amplia o diff sem achado.
- Rejeitado: um segundo mover só para o K7d, porque duplicaria `moveStaging`.

**L4 — `platform` opcional em `s19InstallWithObservedMount` (encanamento C34n/o, 2 trechos).**
- unit:3648 → `{ from, to, linkTarget, fakeRename, platform }`.
- unit:3694 → `runIntegrationCommand({ command: "install", agent: "hermes", target: home, apply: true, platform, io })`.
- C34n/o não passam `platform`. Com `undefined`, vale o default `process.platform` (`run.mjs:1036`), então o comportamento é idêntico ao atual.
- Necessário porque os controles do C34p usam `s19PromotionIo` com recusa EPERM, que só é repetida com `platform: "win32"`.
- Rejeitado: duplicar o observador (cerca de 45 linhas). Também rejeitado: usar recusa EIO para não depender da plataforma, porque não exercitaria o retry → guarda → conflito do K7.

**L5 — Testes novos ANEXADOS depois da unit:3795** (`test("I4-C34p fixture: montagem da troca na promoção Hermes aguardada e separada do retry do produto", ...)`), da seção 3.

**Fica imutável:** todo o resto do arquivo, em particular:
- a tabela K1–K13 (3155-3389, salvo os corpos de swap do L3);
- `base`/`observed`/`deepEqual` (3393-3444);
- C34l (2893-3028);
- C34m (3447-3524);
- `s19MoveFixtureDirectory` (3526-3546);
- C34n (3548-3638);
- o corpo de `s19InstallWithObservedMount`, salvo o L4;
- C34o (3699-3795).

Produto, core105, CLI, workflows, prazos e concorrência ficam congelados.

## 3. Controles (casos nomeados, valores exatos)

Constantes usadas: `S = S19_STAGING_REL`; `OWN = packageDir(OWN_ARTIFACTS)`; `failedIo = { exitCode: 5, status: "incomplete", applied: false, errors: [{ code: "io_error" }], steps: [{ step: "artifacts", state: "failed" }] }`.

**P1 — EPERM síncrono na montagem não vira applied sem troca (o RED principal).**
- Montagem: `s19Target`, `s19PromotionIo(ctx, { denials: ["EPERM"], watched: [{ entry: ctx.staging, strict: true }], swap: () => { throw eperm; } })` com `eperm = simulated("EPERM")`, executado com `platform: "win32"`.
- Esperado: `{ attempts: 1, sameMountError: true, swapped: false, foreign: null, ...failedIo, conflicts: [], through: [], atStaging: "ausente", atPluginDir: "ausente", manifest: "ausente", lock: "ausente" }`.
- Comportamento anterior: attempts 2, exit 0, `applied`, `sameMountError: false` (`undefined === eperm`), atPluginDir OWN e manifest do pacote, que é a assinatura do FAIL28. Falha por valor de contrato, **sem TypeError**: o `swap` síncrono lança antes de qualquer `entrySnapshot`.

**P2 — Troca aguardada: 2 EPERM simulados → 3 tentativas/[10,20], e só depois o produto segue.**
- Montagem: `s19InstallWithObservedMount(ctx.home, (swap) => s19PromotionIo(ctx, { denials: ["EPERM"], watched: [{ entry: ctx.staging, strict: true }], swap }), { from: ctx.staging, to: ctx.moved, linkTarget: dest, fakeRename: (n) => { if (n <= 2) throw simulated("EPERM"); }, platform: "win32" })`, com `dest = ctx.home/"outra pasta"` e `copyPackageArtifacts(dest)`.
- Esperado: `{ fixtureAttempts: 3, waits: [10, 20], fixtureError: null, realpathDuringFixture: false, installerOpsDuringFixture: [], attempts: 1, mountError: null, exitCode: 4, status: "conflict", applied: false, conflicts: [s19Changed(S)], errors: [], steps: [], through: [], atStaging: "link → outra pasta", atPluginDir: "ausente", own: OWN, manifest: "ausente", lock: "ausente" }`.

**P3 — EIO permanente na montagem: 1 tentativa, [], mesmo objeto, falha explícita.**
- Mesmo arranjo do P2, com `fakeRename: () => { throw eio; }`.
- Esperado: `{ fixtureAttempts: 1, waits: [], fixtureErrorSame: true, mountErrorSame: true, installerOpsDuringFixture: [], realpathDuringFixture: false, attempts: 1, swapped: false, ...failedIo, through: [], atStaging: "ausente", own: "ausente", atPluginDir: "ausente", manifest: "ausente", lock: "ausente" }`.

**P4 — EPERM permanente no Windows: 7 tentativas e 630 ms, e o EPERM final não alimenta o retry do produto.**
- `fakeRename` lança `errors[n-1]`, com 7 erros `simulated("EPERM")`.
- Esperado: igual ao P3, mas com `fixtureAttempts: 7`, `waits: [10, 20, 40, 80, 160, 320]`, soma 630, e o mesmo objeto `errors[6]` em `state.error` e em `probe.mountError`.
- É o caso que discrimina a separação: sem o L1, um EPERM cru seria repetido pelo produto.

**H1–H3 — guardas e política do auxílio, chamada direta com `rename`/`wait` injetados; o auxílio não muda (verde antes e depois, não é RED).**
- **H1 POSIX:** `platform: "linux"`, EPERM → 1 tentativa, `waits: []`, o mesmo objeto, origem intacta, destino ausente.
- **H2 destino ocupado:** `to` pré-criado → rejeita "fixture: o destino está ocupado", 0 renames, `waits: []`.
- **H3 origem trocada:** `platform: "win32"`; a 1ª tentativa move a origem para o lado, recria uma pasta e lança EPERM; a guarda 2 rejeita "fixture: a origem foi trocada". Resultado: 1 rename, `waits: [10]`, a pasta substituta e a original movida ficam intactas, o destino continua ausente.
- Justificativa: o caminho físico do K7 passa a depender dessas guardas e o ramo POSIX do auxílio não tem prova direta hoje (C34n/o só usam `win32`). Se o Root julgar H1–H3 excedentes, podem sair, porque não sustentam o RED.

**Limite declarado do RED (decisão do Root):** P2–P4 dependem de montagem assíncrona. No encanamento antigo, `swap()` devolve uma Promise e `entrySnapshot(Promise)` gera `ERR_INVALID_ARG_TYPE` dentro do wrapper, que o produto engole como erro não repetível. Isso não escapa do teste: o `settled` do observador sempre trata e aguarda a montagem, sem rejeição pendente. Mesmo assim, o RED deles passaria por esse TypeError interno, além de uma corrida entre a limpeza do produto e a montagem no scratch próprio, com valores observados não determinísticos. **Proposta:** o RED do mecanismo é o **P1**, limpo. P2–P4 são controles de contrato do GREEN; no RED podem rodar, mas não contam como prova "sem TypeError". Não proponho seam extra só para fabricar esse RED (seria um teste artificial de encaminhamento).

## 4. Asserções antigas a proteger e matriz de ramos

- **Proteger literalmente:**
  - K1–K13: rows, labels, `denials`, `expect`, `base`, `observed`, `deepEqual`;
  - C34l G1–G7;
  - C34m: o `deepEqual` inteiro;
  - C34n/o: dois subtestes cada, valores `3/[10,20]`, `1/[]`, `sameError`, `installerOps []`, `exitCode`, `errors`, `staging`, `promotions`;
  - prefixo e ordem dos testes; ausência de prazos novos.
- **Ramos do `rename` staging→pluginDir em `s19PromotionIo`:**

  | Ramo | Situação | Quem cobre |
  |---|---|---|
  | (i) | attempts > denials → rename real | K1–K3, K13, inalterado |
  | (ii) | recusa sem swap ou tentativa > 1 | K1–K6, inalterado |
  | (iii) | swap síncrono com valor ou `undefined` | K8–K11 |
  | (iv) | swap assíncrono resolvido | K7a–e, P2 |
  | (v) | swap síncrono lança | P1 |
  | (vi) | swap assíncrono rejeita (código do auxílio, guarda) | P3, P4; H2/H3 no nível do auxílio |

  O laço C34k com `mountError` cobre o L2, que se manifesta só se houver falha real.
- Contagens simuladas (`state.attempts`/`waits`) e físicas ficam separadas, como no precedente C34n/o: a movimentação física não entra nas contagens.

## 5. Próximos passos (depende do Root)

O Root revisa esta Landing. Depois: APPEND de P1–P4 (+H1–H3 se aprovados) → RED controlado do P1 contra o encanamento atual (cópia privada, se o Root decidir) → L1–L4 → GREEN do **arquivo inteiro** nos 3 ambientes (8/8/7), seguido do Verifier29 fresco com ABC/D global. Nenhuma alegação de PASS.

## 6. Encerramento desta fase

0 background, 0 execução, 0 edição de Source; único Edit: este relatório. Leitura estimada desta sessão: ~120k tokens (originais + resíduos do pacote), dentro do teto de 150k, que não foi ampliado. Runtime separado não foi consumido.

## 7. Fase TEST: controles ANEXADOS, sem execução

**Falha preservada:** o CLI de TEST anterior terminou com exit 1 (ENOTFOUND) antes de qualquer ferramenta, edição ou teste. Nenhuma prova foi consumida por ele. Esta retomada faz a mesma tarefa.

**O que mudou:**
- Um único Edit em `tests/integrations/install-apply.unit.test.mjs`: APPEND logo depois do `});` final do I4-C34o, que era a linha 3795.
- As 3795 linhas originais não mudaram, nem texto nem ordem.
- O APPEND não contém L1–L4: `s19PromotionIo`, `moveStaging`, os swaps K7 e `s19InstallWithObservedMount` estão intactos.
- Nenhum outro arquivo foi tocado.
- Leitura nesta fase: só `unit:3786-3795`, a âncora do Edit.

**Nomes novos.** Os testes são de topo e independentes, para que o P1 rode sozinho pelo nome:
- `I4-C34p P1 montagem: EPERM síncrono da troca não vira promoção sem troca`
- `I4-C34p P2 montagem aguardada: 2 EPERM e depois a troca; o instalador só segue depois dela`
- `I4-C34p P3 montagem com EIO permanente: uma tentativa, nenhuma espera, o mesmo erro e falha explícita`
- `I4-C34p P4 montagem com EPERM permanente no Windows: 7 tentativas, 630 ms, o 7º erro sem retry do produto`
- `I4-C34p H1 auxílio da montagem no POSIX: EPERM não é repetido — uma tentativa, nenhuma espera, o mesmo erro`
- `I4-C34p H2 auxílio da montagem: destino ocupado recusa antes de qualquer rename`
- `I4-C34p H3 auxílio da montagem: origem trocada na espera recusa sem nova tentativa`

Auxiliares de arranjo, só deste bloco:
- `c34pMountedPromotion(label, fakeRename)` reutiliza `s19Target`, `copyPackageArtifacts`, `s19InstallWithObservedMount` e `s19PromotionIo`.
- `c34pFailedMount(ctx, state, probe, result)` e `C34P_FAILED_MOUNT` contêm a projeção e o esperado comuns de P3/P4.
- `c34pMoveDirs(label, { marked })` cria a origem própria e o destino ausente; `C34P_MARKED` é a descrição da origem marcada.

Não há retry, mover ou observador novo: H1–H3 chamam `s19MoveFixtureDirectory` direto, com `rename`/`wait` injetados, e usam `s19Settle`.

**Valores esperados exatos:**

- **P1.** Arranjo: `s19PromotionIo(ctx, { denials: ["EPERM"], watched: strict(staging), swap: () => { throw eperm } })`, executado com `platform: "win32"`.
  - Esperado: `{ attempts: 1, sameMountError: true, swapped: false, foreign: null, exitCode: 5, status: "incomplete", applied: false, conflicts: [], errors: [{ code: "io_error" }], steps: [{ step: "artifacts", state: "failed" }], through: [], atStaging: "ausente", atPluginDir: "ausente", manifest: "ausente", lock: "ausente" }`.
  - **RED previsto, pelo código; não executado.** O `swap` lança antes de `entrySnapshot`, então não há TypeError. `probe.mountError` não existe (`undefined === eperm` → `false`). O produto vê EPERM e repete, o que leva a `attempts: 2`, `exitCode: 0`, `status: "applied"`, `applied: true`, `errors: []`, `steps: [artifacts done, manifest done]`, `atPluginDir` com os 3 artefatos e o manifest do pacote.
- **P2.** Esperado: `{ fixtureAttempts: 3, waits: [10, 20], fixtureError: null, realpathDuringFixture: false, installerOpsDuringFixture: [], attempts: 1, mountError: null, exitCode: 4, status: "conflict", applied: false, conflicts: [s19Changed(S19_STAGING_REL)], errors: [], steps: [], through: [], atStaging: "link → outra pasta", atPluginDir: "ausente", own: packageDir(OWN_ARTIFACTS), manifest: "ausente", lock: "ausente" }`.
- **P3.** Esperado: `{ fixtureAttempts: 1, waits: [], sameFixtureError: true, sameMountError: true, ...C34P_FAILED_MOUNT }`.
- **P4.** Esperado: `{ fixtureAttempts: 7, waits: [10, 20, 40, 80, 160, 320], waited: 630, sameFixtureError: true, sameMountError: true, ...C34P_FAILED_MOUNT }`, com o mesmo `errors[6]` no observador e em `probe.mountError`.
- **`C34P_FAILED_MOUNT`** = `{ realpathDuringFixture: false, installerOpsDuringFixture: [], attempts: 1, swapped: false, exitCode: 5, status: "incomplete", applied: false, conflicts: [], errors: [{ code: "io_error" }], steps: [{ step: "artifacts", state: "failed" }], through: [], atStaging: "ausente", atPluginDir: "ausente", own: "ausente", manifest: "ausente", lock: "ausente" }`.
- **H1.** `{ sameError: true, renames: [[from, to]], waits: [], from: C34P_MARKED, to: "ausente" }`.
- **H2.** `{ error: "fixture: o destino está ocupado", renames: [], waits: [], from: C34P_MARKED, to: "diretório []" }`.
- **H3.** `{ error: "fixture: a origem foi trocada", renames: [[from, to]], waits: [10], from: "diretório []", aside: "diretório []", to: "ausente" }`.

**Previsões, nada executado:**
- P2–P4 dependem de L1 (`await swap()` e `probe.mountError`) e de L4 (`platform`, hoje ignorado pelo observador, o que deixa a plataforma nativa).
- Antes do L1–L4, P2–P4 **não** são RED válido: no código antigo, a Promise da montagem chega a `entrySnapshot` e gera `ERR_INVALID_ARG_TYPE`, que o produto engole, além da corrida descrita na seção 3. Por isso o RED controlado deve filtrar **só** `I4-C34p P1`.
- H1–H3 não dependem de L1–L4. Devem passar antes e depois: são caracterização, não RED.

**Risco declarado de H3:**
- A troca da origem usa um `renameSync` físico de uma pasta vazia recém-criada no scratch próprio. Escolhi assim porque, no ext4, `rmdir`+`mkdir` pode reutilizar o inode e a troca não seria detectada.
- Se o Windows recusar esse rename físico, o H3 falha em vermelho, nunca em verde falso. Nesse caso o erro sai da `rename` injetada e o auxílio o trata como uma recusa da tentativa. Não acrescentei retry.

**Encerramento:** 0 execuções, 0 processos em segundo plano. Edits: o APPEND na unit e esta seção. Asserções, prazos e concorrência antigos não foram tocados. O Root revisa o APPEND e o prefixo antes do commit e do RED do P1.

## 8. RED controlado só do P1, no encanamento antigo (HEAD 6581f3d) — RED válido, não é GREEN

**Execução:**
- Rodei uma única vez, em primeiro plano, com timeout de 600000 ms e sem segundo plano, o comando literal do Root: `C:/nvm4w/nodejs/node.exe C:/Users/paulo/projects/debuguer_skills/.checks/code-review/issue-25/worker-guard/author-s22-red-controller.mjs author-s22-red A`. A chamada voltou sem erro de ferramenta. Não houve outro Bash.
- Comando do filho (registrado em `A.env.txt:9`): `node --test --test-name-pattern='I4-C34p P1 ' --test-concurrency=8 tests/integrations/install-apply.unit.test.mjs`.
- Ambiente (`A.env.txt`): Node v24.22.1, `autocrlf=true`, HEAD 6581f3dfbebd8e48c24237a9be32066a065415e1 antes e depois, tree 0e86a6a3133976e4f622f6e875fff9164649c62c, status vazio antes e depois.
- TEMP privado isolado foi conferido e removido; o controlador registrou "1 entradas deixadas pelos testes".

**Resultado (`A-result.json`):** `valid: true`, `naturalExit: 1`, `error: null`, contagens tests 1 / pass 0 / fail 1 / cancelled 0 / skipped 0, `duration_ms 640.7272`, intervalo 17:58:42.620Z–17:58:52.637Z.

**Falha (`A.log`):**
- Um único `✖`: `I4-C34p P1 montagem: EPERM síncrono da troca não vira promoção sem troca`, teste em `:3803`, asserção `deepStrictEqual` em `:3814:10`, `AssertionError [ERR_ASSERTION]`.
- Não há TypeError, erro de módulo, de setup ou de limpeza, nem outro teste executado.

| Campo | Atual (antigo) | Esperado (contrato) |
|---|---|---|
| attempts | 2 | 1 |
| sameMountError | false | true |
| exitCode | 0 | 5 |
| status | `applied` | `incomplete` |
| applied | true | false |
| errors | `[]` | `[{ code: "io_error" }]` |
| steps | `[artifacts done, manifest done]` | `[artifacts failed]` |
| atPluginDir | diretório real com os 3 artefatos do pacote | `ausente` |
| manifest | do pacote (`created.pluginsDir: false`, 3 artefatos com sha256) | `ausente` |

Campos iguais nos dois lados: `swapped: false`, `foreign: null`, `conflicts: []`, `through: []`, `atStaging: "ausente"`, `lock: "ausente"`.

**Leitura:** o resultado reproduz de forma determinística a assinatura do K7d do FAIL28 (2 tentativas, exit 0, `applied`, troca não registrada). O EPERM síncrono lançado pela montagem foi tratado pelo produto como recusa da promoção e repetido. A causa física do FAIL28 continua **desconhecida**: este controle só prova o mecanismo do encanamento.

**Não foi feito:** P2–P4 e H1–H3 não rodaram. Não houve L1–L4, edição de Source, commit nem limpeza. Só editei este relatório. O GREEN do arquivo inteiro nos 3 ambientes fica pendente da revisão do Root. 0 processos em segundo plano.

## 9. Encanamento L1–L4 aplicado na unit (sem execução; GREEN pendente)

Depois da revisão do Root ao RED do P1, editei só `tests/integrations/install-apply.unit.test.mjs` e este relatório. Fiz 12 Edits nativos na unit: um deles não casou com a âncora e foi refeito, então 11 foram aplicados. Leitura adicional: 1 Grep de conferência na unit. Nada mudou em produto, core, CLI, workflow ou helpers externos.

**L1 — `s19PromotionIo`:**
- O comentário de cabeçalho ganhou duas linhas: "A troca é aguardada até o fim; se falhar, o io recusa sem código e guarda o erro original em `probe.mountError` (I4-C34p)."
- O `probe` ganhou `mountError: null`.
- O bloco `if (probe.attempts === 1 && swap)` agora faz `foreign = await swap()` dentro de `try`. No `catch`, guarda o mesmo objeto em `probe.mountError` e lança `new Error("fixture: a montagem da troca falhou", { cause: error })`, sem `code`. Um comentário de duas linhas explica que a falha da montagem não deve alimentar o retry do produto.
- `probe.foreign`, `probe.foreignBefore` (`entrySnapshot`) e `probe.swapped = true` só são definidos depois do `await` bem-sucedido.
- O restante não mudou: o `throw simulated(...)` das recusas, `identity`, `through` e o rename real.

**L2 — laço do I4-C34k (unit:3431):** logo depois do `runIntegrationCommand` e antes de `observed.push`, entrou a linha `if (probe.mountError !== null) throw new Error(`fixture: montagem da troca falhou em "${row.label}"`, { cause: probe.mountError });`. `base`, `observed`, `expected` e o `deepEqual` não mudaram.

**L3 — família K7:**
- `moveStaging` passou a ser `(ctx) => s19MoveFixtureDirectory(ctx.staging, ctx.moved)`, que reutiliza o mover S19 existente com a política padrão e `process.platform`.
- Viraram `async` + `await moveStaging(ctx)`: `stagingLinkedTo` (K7b/K7c), K7a, K7d e K7e. Os demais passos e os retornos são os mesmos.
- K10, K11, K8, K9, C34m e todos os `expect` não mudaram.

**L4 — `s19InstallWithObservedMount`:** a assinatura ganhou `platform` opcional, repassado a `runIntegrationCommand({ ..., platform, io })`. C34n/o não passam esse argumento; com `undefined`, vale o default `process.platform` (`run.mjs:1036`), então o comportamento deles fica igual.

**Conferido por Grep, sem execução:**
- Não sobrou `moveStaging(` sem `await`.
- O único `probe.mountError` do C34k é o do L2.
- O APPEND I4-C34p continua igual: os 7 testes, nomes e valores esperados da seção 7.

**Pendente:**
- Revisão integral e commit pelo Root.
- Depois, o GREEN do **arquivo inteiro**, uma invocação por ambiente A/B/C com concorrência 8/8/7, incluindo K1–K13, C34l/m/n/o e os 7 I4-C34p. Nada disso foi executado nesta fase.
- Não declaro GREEN nem PASS.

**Encerramento:** CLI desta fase sem comandos (Bash indisponível e não usado), 0 processos em segundo plano.

## 10. GREEN do arquivo inteiro em A/B/C no commit 098544d (só esta superfície; não é PASS global)

**Rastro preservado:**
- Os registros anteriores do relatório continuam como estavam, incluindo a interrupção da 1ª leitura pelo Root (pid 117548).
- O 1º CLI de TEST terminou com exit 1 por ENOTFOUND (rede) antes de qualquer ferramenta, edição ou teste. Nenhuma prova foi consumida por ele.

**Execução:**
- Rodei os 3 comandos literais do Root, um de cada vez, sequenciais e em primeiro plano, com timeout de 600000 ms.
- Nenhum foi para segundo plano e nenhum foi repetido. Não houve outro Bash.
- Os três terminaram com controlador `valid: true`, `naturalExit: 0` e `error: null`.

| Gate | Ambiente (metadados do controlador) | Comando do filho | UTC (controlador) | tests/pass/fail/cancelled/skipped | duration_ms |
|---|---|---|---|---|---|
| A | Windows, checkout, Node v24.22.1, npm 11.19.1, `autocrlf=true`, conc 8, TEMP privado | `node --test --test-concurrency=8 tests/integrations/install-apply.unit.test.mjs` | 18:02:50.073Z–18:04:56.423Z | 45/44/0/0/1 | 123791.749 |
| B | clone novo `B-clone`, Node v24.13.0, npm 11.6.2, `autocrlf=true`, conc 8, TEMP privado | o mesmo, com conc 8 | 18:04:59.595Z–18:07:17.617Z | 45/44/0/0/1 | 123840.5492 |
| C | WSL, arquivo do commit (sha256 f84f4f1a…0741, 7557120 bytes), tree conferida, CR=0, Node v24.13.0, npm 11.6.2, `env` mínimo, conc 7 | `node --test --test-concurrency=7 …install-apply.unit.test.mjs` | 18:07:20.838Z–18:07:34.873Z | 45/44/0/0/1 | 10540.641408 |

**Identidade:**
- HEAD 098544dd868ac55bc881bf566174e74fe334345a e tree 2a680ed9ca0d13efa0f12c08dd7fd3f9fadb7dd1 em A e B, iguais antes e depois, com `status` vazio antes e depois.
- No C, a árvore extraída é a mesma tree esperada.
- Nenhum filtro de nome foi usado: é o arquivo inteiro.

**Skips (1 por gate, com motivo):**
- A e B: `I4-C25k Linux … # posix-acl: ACL POSIX (xattr) só no Linux` (A.log:36, B.log:36).
- C: `I4-C25h Windows … # windows-dacl` (C.log:21).
- Diagnósticos de sub-casos limitados já existentes:
  - A/B: K6 POSIX só em POSIX nativo e K7e não executado (symlink de arquivo exige privilégio no Windows) — A/B.log:47-48.
  - C: K6 e K7e rodam; o aviso "linhas win32 … não é execução Windows" está em C.log:33.

**Nomeados com ✔ nos três gates (linhas A / B / C):**
- I4-C34l: 45 / 45 / 31.
- I4-C34k (tabela K1–K13 inteira, inclusive K7a–e com o mover aguardado): 46 / 46 / 32.
- I4-C34m: 49 / 49 / 34.
- I4-C34n: 53 / 53 / 38.
- I4-C34o: 57 / 57 / 42.
- Os 7 novos I4-C34p:
  - P1: 58 / 58 / 43;
  - P2: 59 / 59 / 44;
  - P3: 60 / 60 / 45;
  - P4: 61 / 61 / 46;
  - H1: 62 / 62 / 47;
  - H2: 63 / 63 / 48;
  - H3: 64 / 64 / 49.
- Nenhum `✖` em nenhum log.
- O lançamento explícito do L2 (falha de montagem no C34k) não ocorreu: o C34k passou.
- O H3 (rename físico de pasta vazia) passou nos três gates; não houve recusa física.

**Asserções:** as asserções e os valores esperados antigos (K1–K13, C34l/m/n/o) são os revisados pelo Root no commit, sem alteração. Não alterei prazos nem concorrência.

**Limpeza (do controlador; não fiz limpeza):**
- A: TEMP isolado conferido, "1 entradas deixadas pelos testes", removido; `RUNNER_TEMP` com 0 entradas, removido.
- B: o mesmo, com "223 entradas deixadas pelos testes", removido; `RUNNER_TEMP` com 0 entradas, removido. Registro o número literal e não infiro causa.
- C: scratch `/tmp/sm-author-s22-C.SL3WZA` criado por `mktemp` nesta execução, `RUNNER_TEMP` 0, `TMPDIR` 1, `HOME` 0 entradas, removido (pasta, não link, mesmo dev/inode).

**Conclusão e limites:**
- O arquivo afetado está GREEN em A/B/C (`valid`, término natural 0, 0 fail, 0 cancelled). Isso prova só esta superfície.
- **Não** é PASS de 50 checks / 9 ACs. Não reexecutei S20, S18, o core nem o global; esses resultados chegam por carry de identidade, que fica com o Root.
- O Verifier29 fresco precisa rodar ABC/D completos.
- A causa física do FAIL28 continua desconhecida; estes verdes não dão garantia futura.

**Encerramento:** 3 comandos, cada um com término natural 0. 0 processos em segundo plano. Nenhuma edição de Source nesta fase; único Edit: este relatório. Sem commit, push, CI ou formal.
