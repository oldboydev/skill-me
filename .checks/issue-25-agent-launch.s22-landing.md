# S22 — decisão Root anterior ao código

Landing L1–L5 abaixo aprovada para a correção da fixture, dentro do plano S22. P1 é o RED determinístico por contrato contra a fixture antiga; P2–P4 e H1–H3 são provas do GREEN, sem exigir RED contaminado por Promise/TypeError. H1–H3 são pertinentes à política física reutilizada. TEST autoriza somente APPEND dos controles; L1–L4 só depois do RED revisado. Nenhuma asserção antiga muda. Autor: arquivo unit inteiro ABC; Verifier29 fresco: ABC globais e npm D.

Root comprovou cobertura exata das vistas recebidas; não presume leitura integral da task/checklist pelo autor. 0 produto/core/workflow alterados.

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
