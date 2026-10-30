# Verificação independente 28 — **FAIL** (gate B vermelho; não há PASS global; 0 de 50 checks e 0 de 9 ACs atendidos)

Títulos anteriores (preservados): "Verificação28 — fontes ainda não lidas, provas não executadas" → "Verificação28 — ANÁLISE PRÉ-PROVAS (fontes lidas; provas NÃO executadas; nenhum PASS, nenhum FAIL)". A análise pré-provas está preservada a partir de "## ANÁLISE PRÉ-PROVAS", como foi escrita antes de qualquer execução; o Root a revisou inteira (SHA256 `ae82aa47…1563`, 25188/25188 linhas, 148 Reads, 0 erros).

**Verdict: FAIL.**
- **A**: válido; término natural 0; identidade válida.
- **B**: término natural 1, `valid: false`.
  - ✖ `I4-C34k Hermes: promoção Windows repete só recusas com guardas, preserva alheios e mantém falhas permanentes` (`B.log:307`, `:843`);
  - asserção `assert.deepEqual(observed, expected)` em `tests/integrations/install-apply.unit.test.mjs:3444`; só a linha **K7d** diverge.
- **C** e **D**: **NÃO executados**, por parar na primeira falha. Sem repetir e sem corrigir nada.

**Profile**: light · **Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..6477023ed854ecbf95673b8f5b7da792f7745254` · **Round**: 28, feature inteira, C1–C50 e os 9 ACs, re-verificação escopada contra a R26 com carry analítico condicionado à identidade do A.

## F. FECHAMENTO — gates executados (at `6477023`)

### F.1 Execuções

- **Antes do A**, li só o ramo de identidade de `worker-guard/v28-matrix-controller.mjs` (62 linhas, Read inteiro, conferência read-only):
  - `ls-tree -r` de `src tests scripts .github package.json package-lock.json` em `8f393c5ff6353f56886c3de574e9e4ddd3a4281c` × HEAD, comparado com os 7 `expectedChanged` (`:28-29`);
  - o mapa dos 5 arquivos do core contra a base e contra os blobs aprovados de `product-approved-core-root.json` (`:24-26`);
  - os 4 S19/S16 iguais a `f9039f6` (`:27`);
  - o prefixo `git show base:review.test.mjs` comparado byte a byte com o do HEAD, exigindo 894 linhas e SHA `a48aff48…e108` (`:30-31`);
  - `check()` de assets, HEAD, status, fontes e drivers antes e depois (`:7`, `:49`); `valid` só com EXIT=0, `tests`/`pass` > 600, `fail` 0 e `cancelled` 0 (`:59`).
- **Comandos executados**: os dois primeiros comandos literais do Root, **uma vez cada, sequenciais**, cada um numa chamada Bash própria em primeiro plano com timeout de 600000.
  - Nenhum usou `run_in_background` e nenhum foi destacado sozinho.
  - O B só rodou depois do resultado `valid: true` do A.
  - **Parei no FAIL do B. C e D não foram executados.** 0 tarefas em segundo plano.
- **Bash extra**: tentei uma chamada Bash fora dos 4 comandos (um `node -e` para resumir o `identity-comparison.json`). O hook `verifier28-guard.mjs` a **recusou antes de executar** ("Somente quatro comandos literais do Verifier"). Nada rodou; li o JSON com Read/Grep.

| Gate | Ambiente (do controlador) | UTC | Resultado (`ℹ`) | `valid` / término |
|---|---|---|---|---|
| A | Windows, checkout, Node 24.22.1, conc 8, TMP curto privado | 17:02:09.402–17:10:17.496 | **767 / 754 / 0 / 0 / 13** (tests/pass/fail/cancelled/skipped), 477846 ms | `true` / 0 |
| B | clone novo `core.autocrlf=true`, Node 24.13.0, conc 8, TMP curto privado | 17:10:47.793–17:18:54.152 | **767 / 753 / 1 / 0 / 13**, 469017 ms | **`false`** / **1** |
| C | WSL 24.13 LF `env -i` | — | **não executado** | — |
| D | `npm test` completo | — | **não executado** | — |

### F.2 Identidade (comando A) — `independent-28/identity-comparison.json`, `valid: true`

- **`changed` = `expectedChanged`**, exatamente 7:
  - os 3 do core S21: `scripts/code-review/README.md` (`25e52841→89869e47`), `review.mjs` (`1bda8e45→eb6b927c`) e `review.test.mjs` (`216125ce→3b6b4540`);
  - os 4 S19/S16: `src/integrations/install/run.mjs` (`fa23ace5→12c422a6`), `tests/integrations/install-apply.unit.test.mjs` (`fa29c196→3a8bb726`), `install.cli.test.mjs` (`8b3919ab→df8b91b2`) e `launch/end.e2e.test.mjs` (`1912fe9d→315252e5`).
  - Todos os demais arquivos de `src tests scripts .github package*` têm `same: true`.
- **Core 5**:
  - README, review.mjs e review.test.mjs diferem da base 636 e são `approved: true` (iguais aos blobs aprovados);
  - `cli.mjs` `c6a4abcd` e `schema.json` `b02001e2` são iguais à base (`same: true`, `approved: true`).
  - Não alego que os 5 sejam iguais à base. Pilotos não conferidos.
- **Os 4 S19/S16 iguais a `f9039f6`**: `same: true` para os quatro.
- **Prefixo de `review.test.mjs`**: `originalBytes 27839`, `originalLines 894`, `sha256 a48aff48c96c77fbc5d6254b09b39a9aa59fac510d94d86af00de1dc8134e108`, **`exact: true`**, comparando o arquivo da base `63621c6` com o do HEAD `6477023` byte a byte.
- **Consequência**: o carry-R26 das citações em arquivos de blob igual é **válido**, mas não muda o veredito (o B falhou).

### F.3 A falha (FAIL B) — preservada, sem repetição

- **Nome**: `I4-C34k Hermes: promoção Windows repete só recusas com guardas, preserva alheios e mantém falhas permanentes`, `test at tests\integrations\install-apply.unit.test.mjs:3116:1` (`B.log:842-843`), asserção em `:3444:10` (`B.log:921`), `deepStrictEqual`.
- **Divergência** (`B.log:854-915`), linha `K7d staging trocado por diretório real com cópias exatas` (definida em `unit:3204-3215`):

  | Campo | Atual | Esperado |
  |---|---|---|
  | attempts | 2 | 1 |
  | exitCode | 0 | 4 |
  | status | `applied` | `conflict` |
  | applied | `true` | `false` |
  | conflicts | `[]` | `[{config_changed_during_apply, "plugins/.skill-me-observer.skill-me-tmp"}]` |
  | steps | `[artifacts done, manifest done]` | `[]` |
  | atStaging | `ausente` | os 3 artefatos |
  | atPluginDir | os 3 artefatos | `ausente` |
  | manifest | o do pacote | `ausente` |
  | foreign | `—` | `intacto` |
  | own | `ausente` | os 3 artefatos |
  | through | `[]` | `[]` |

  Todas as outras linhas K1–K13 (incluindo K12h–j) são iguais ao esperado no `actual`/`expected` impresso (`B.log:926-927`).
- **Mecanismo pela evidência** (inferência a partir do código lido e dos valores; a causa física NÃO foi observada):
  - em `s19PromotionIo` (`unit:3093-3101`), na 1ª tentativa negada a montagem `swap()` roda **antes** de `probe.swapped = true` e antes do `throw simulated(...)`. A montagem do K7d é `moveStaging(ctx)` = `renameSync(ctx.staging, ctx.moved)` puro (`unit:3130`, `:3208-3212`);
  - `foreign: "—"` (`probe.foreign` continuou `null`) e `own: "ausente"` (`ctx.moved` nunca foi criado) mostram que **a troca não aconteceu** e que o `renameSync` da fixture lançou dentro do rename instrumentado;
  - o produto, em `win32`, repetiu a promoção (`attempts: 2`). Pelo código (`run.mjs:903-910`) ele só repete EPERM, EACCES ou EBUSY, então o erro da fixture tinha um desses códigos. O código exato não aparece no log;
  - na 2ª tentativa a guarda viu o staging próprio intacto e o rename real promoveu: exit 0, `through: []`, nada alheio tocado.
  - É exatamente o risco **R1** declarado na pré-análise (§7, carry R27): vermelho falso intermitente da prova no Windows, **nunca verde falso**. Pela leitura, o produto agiu conforme o contrato S19 para o que observou.
- **Causa física**: **desconhecida** (handle, AV, indexador, Node). Não atribuo. A mesma linha passou no A (`A.log:307` ✔ C34k, 3662 ms) e falhou no B (Node 24.13.0, clone `autocrlf`).
- **Efeito no gate**: B `valid: false`. C e D não rodaram, então faltam o WSL/POSIX (C) e o `npm test` completo (D, com doctor e integrações no runner padrão e o D com nativos).

### F.4 Evidência parcial verdadeira de A e B (NÃO é PASS)

- **A** (`A.log`), sem nenhum `✖`/`not ok`:
  - `^✔ S21 ` = **89**; os 16 originais `^✔ C1…C11 ` = **16** (core 105/105, sem skip no core);
  - 13 skips, todos com motivo POSIX/Linux/macOS: I4-C15 `:150`, I4-C25k `:297`, I4-C25b `:319`, I4-C25j `:321`, I4-C25m `:322` (macOS só na CI posterior), I25-C45 POSIX `:360`, I25-C5 POSIX `:362`, I25-C6 `:364`, I25-C42 POSIX `:368`, I25-C33 arranjo `:386`, I25-C15 pty `:414`, I4-C25l `:499`, T8-C4 `:819`;
  - nativos Hermes com runtime ✔: I4-C18–C23 `:250-255`, I4-C37 `:256`, `I25-C40 harness nativa` `:257`, I23-C8 ×2 `:258-259`, I4-C44b `:261`;
  - `I23-C8 … pelo Python do sistema` ✔ `:260`; I4-C35 ✔ `:742`.
- **B** (`B.log`):
  - 767/753/1/0/13; `^✔ S21 ` = **89**; 16 originais ✔; 13 skips (`^﹣`);
  - um único `✖` (C34k `:307`);
  - I4-C34g `:268`, C34h `:282`, C34i `:284`, C34j `:285`, C34l `:306`, C34m `:310`, C34n `:314`, C34o `:318` ✔;
  - nativa `:257`, I23-C8 `:258-260`, I4-C35 `:742`, T8-C15 `:743`, I23-C10 `:459` ✔.
  - Fora desses e das contagens, não conferi nome a nome no B.

### F.5 Checks — uma linha por check

A asserção, o valor concreto, o nível, a amostragem, o tocado/carry e a identidade de cada check estão na tabela pré-provas §5, intacta abaixo. Aqui acrescento a prova nomeada no log e o resultado.
- **Origem**: carry-R26 agora com blob **provado igual** pelo A (`identity-comparison.json`); "fresca" = lida por mim no HEAD.
- **Nenhum check é PASS**: o B falhou, e C e D (exigidos por todos) não rodaram.
- "A ✔" é evidência parcial verdadeira; B repete as contagens de A menos o C34k.

| Check | Asserção (orig. file:line) · origem | Prova nomeada (A.log:linha) | Resultado |
|---|---|---|---|
| C1 | `command.cli:48-49`, `:65`, `:77` · carry (blob igual) | `I25-C1 npm link…` A:356 | A ✔; B sem ✖; C/D ausentes → **não PASS** |
| C2 | `command.cli:96-98` · carry | `I25-C2 argumentos literais…` A:357 | idem |
| C3 | `command.cli:105` `{0:0,7:7}` · carry | `I25-C3 código do agente…` A:358 | idem |
| C4 | `command.cli:130-133`; `agent.unit` · carry | `I25-C4 shim do npm…` A:359; `I25-C4 entrada do shim` A:350-351 | idem |
| C5 | `command.cli:228`, `:244-245` · carry | `I25-C5 Ctrl+C…` (W) A:363; POSIX A:362 skip (só C, não executado) | idem; o ramo POSIX não foi provado |
| C6 | `command.cli:267` · carry | `I25-C6 SIGTERM…` A:364 skip (só C) | **sem execução** (C ausente) |
| C7 | `prepare.cli:93-94` · carry | `I25-C7 agente ausente…` A:403 | A ✔ → não PASS |
| C8 | `prepare.cli:122-126` · carry | `I25-C8 prévia…` A:404-405 | idem |
| C9 | `prepare.cli:163-168` · carry + produto tocado | `I25-C9 confirmação aplica…` A:406 | idem |
| C10 | `prepare.cli:189-191` · carry | `I25-C10 recusa…` A:407 | idem |
| C11 | `prepare.cli:200` · carry | `I25-C11 caminho relativo…` A:408 | idem |
| C12 | `prepare.cli:223` · carry | `I25-C12 sem terminal…` A:409, :413 | idem |
| C13 | `prepare.cli:238` · carry + produto tocado | `I25-C13 preparo concluído…` A:410 | idem |
| C14 | `prepare.cli:250` · carry + produto tocado | `I25-C14 falha do preparo…` A:411 | idem |
| C15 | `prepare.cli:408` · carry | `I25-C15 terminal real (pty)…` A:414 skip (só C) | **sem execução** |
| C16 | `session.e2e:67` · carry | `I25-C16 …` A:420, :353 | A ✔ → não PASS |
| C17 | `store.unit:79` · carry | `I25-C17 …` A:427-430 | idem |
| C18 | `session.e2e:111` · carry | `I25-C18 …` A:421 | idem |
| C19 | `session.e2e:161` · carry | `I25-C19 …` A:422 | idem |
| C20 | `session.e2e:190-192` · carry | `I25-C20 …` A:423 | idem |
| C21 | `session.e2e:208-211` · carry | `I25-C21 …` A:424 | idem |
| C22 | `session.e2e:230` (503 → 500+3) · carry | `I25-C22 …` A:425 | idem |
| C23 | `session.e2e:282` (8.388.608) · carry | `I25-C23 …` A:426 | idem |
| C24 | `store.unit:168` · carry | `I25-C24 …` A:432 | idem |
| C25 | `end.e2e:80-97` · fresca | `I25-C25 encerramento e resumo…` A:373 | idem |
| C26 | `end.e2e:109-117` · fresca | `I25-C26 nada gravado…` A:374 | idem |
| C27 | `end.e2e:128-129` · fresca; `store.unit` · carry | `I25-C27 …` A:375, :433-434 | idem |
| C28 | `end.e2e:165-176`, `:195-203` · fresca | `I25-C28 …` A:376-377 | idem |
| C29 | `command.cli:278` · carry | `I25-C29 …` A:365 | idem |
| C30 | `command.cli:342` · carry | `I25-C30 …` A:366 | idem |
| C31 | `end.e2e:213-223`, `:252-264` · fresca | `I25-C31 …` A:378-379 | idem |
| C32 | `end.e2e:294-451` · fresca; `store.unit:715` · carry | `I25-C32 …` A:380-384, :451-454 | idem |
| C33 | `end.e2e:477-483`, `:501-509` · fresca | `I25-C33 on e off…` A:385; arranjo A:386 skip (só C) | idem; o arranjo POSIX não foi provado |
| C34 | `report.cli:159` · carry | `I25-C34 …` A:415-418 | idem |
| C35 | `report.cli:252-259` · carry | `I25-C35 …` A:419 | idem |
| C36 | `command.cli:350` · carry | `I25-C36 ajuda…` A:367 | idem |
| C37 | `launch/docs.test:82` · carry | `I25-C37 documentação…` A:370-372 | idem |
| C38 | `prepare.cli:355` · carry | `I25-C38 console real…` (W) A:412 | idem |
| C39 | `hermes-harness.unit:90` · carry | `I25-C39 …` A:241-243 | idem |
| C40 | `hermes-harness.unit:220-327`; `hermes-plugin.native:336` · carry + produto tocado | `I25-C40 …` A:244-245, :249; `I25-C40 harness nativa` A:257 B:257; nativos A:250-256 | idem; o D com nativos não rodou |
| C41 | `end.e2e:547-760` · fresca; `store.unit:327-523` · carry | `I25-C41 …` A:387-392, :435-445 | idem |
| C42 | `agent.unit`; `command.cli:424`, `:456` · carry | `I25-C42 …` A:354-355, :369 (W); POSIX A:368 skip | idem |
| C43 | `end.e2e:837-1053` · fresca; `store.unit:562-600` · carry | `I25-C43 …` A:393-402, :446-450 | idem |
| C44 | `hermes-harness.unit:288`, `:291` · carry | `I25-C44 …` A:246-248; I4-C22 nativo A:254 | idem |
| C45 | `agent.unit:132-146`; `command.cli:166-186` · carry | `I25-C45 …` A:352, :361 (W); POSIX A:360 skip | idem |
| C46 | §5 (T8-C15 2×40=80; T8-C16 3 criações; (a)–(u); F1 R24/R25) · carry (blobs iguais) | T8-C15 A:743 B:743; T8-C16 A:747-770; `I25-C46 prazo da entrega…` A:761-775; liberação (u) A:509-518; evidência/diagnósticos A:153-154, :233, :462-463, :744-746, :786-829 | idem |
| C47 | §5 (I23-C10; (a)/(b); (c)/(d)) · carry | I23-C10 A:459 B:459; `I25-C47` A:460-461, :477-478, :795-796; I23-C4 A:470-480 | idem |
| C48 | `governance-ci:373-582`, `:271-283` · carry | `governance-C48` A:131-132; `governance-C1 C3` A:129 | idem |
| C49 | `governance-ci:299-362` · carry | `governance-C49` A:130 | idem |
| C50 | `ci-lock-latency.test:146-412` · carry | 18 `C50 …` A:1-18 | idem |

**Provas S19 (AC2)**:
- A ✔: C34g A:268, C34h A:282, C34i A:284, C34j A:285, C34l A:306, **C34k A:307**, C34m A:310, C34n A:314, C34o A:318.
- B ✔ em todas **menos C34k ✖ (B:307)**.

**Provas S21 (AC9)**: 89 ✔ + 16 originais ✔ em A e em B.

**C/D**: nada.

### F.6 ACs (texto canônico completo do `context-readable.md` L14–27; nenhum critério criado)

| AC | Texto canônico | Estado |
|---|---|---|
| AC1 | "Um executável local `skill-me` pode ser disponibilizado sem publicar o pacote; `skill-me codex`, `skill-me claude` e `skill-me hermes` iniciam o respectivo agente em modo interativo, preservando argumentos, entrada/saída, sinais e código de saída aplicáveis." | **unverified**: A ✔; C/D ausentes |
| AC2 | "No primeiro uso, o comando conduz a escolha/preparação do destino local e a instalação necessária da integração, apresenta as alterações antes de aplicá-las e indica a etapa de confiança nativa que o usuário precisa confirmar. Sem agente ou confiança/captura disponível, informa o impedimento sem fingir que gravou a sessão. Exceção S19 aprovada em 30/10/2026: somente a promoção do diretório temporário da instalação Hermes no Windows repete EPERM/EACCES/EBUSY, até sete tentativas e seis esperas de 10/20/40/80/160/320 ms (630 ms adicionais). Antes de cada tentativa, reconfere identidade BigInt da raiz/plugins/staging, os três artefatos completos com bytes do pacote e destino ausente; escrita, limpeza e liberação do lock preservam entradas alheias, incluindo pastas reais substitutas com cópias idênticas. Identidade indisponível falha fechada com 5; EIO/outros códigos e promoção POSIX mantêm uma tentativa. Política de arquivos, prazos de produto/testes, asserções e concorrência permanecem. Plano vinculante: `.tasks/issue-25-hermes-staging-retry-proposal.md`; aprovação: https://github.com/oldboydev/skill-me/issues/25#issuecomment-6520123791." | **unmet nesta rodada**: a prova I4-C34k falhou no B (linha K7d). C/D ausentes |
| AC3 | "A invocação autoriza somente a sessão iniciada por ela: eventos suportados são sanitizados e gravados localmente, com identidade/chave isoladas e limites e retenção da política existente; não exige `SKILL_ME_CAPTURE_ROOT`, `SKILL_ME_CAPTURE_ID`, ID copiado, `npm run on` ou `npm run off`. Ao atingir 500 eventos ou 8 MiB, a invocação continua em capturas sucessivas até o agente sair, preservando os limites e a chave própria de cada captura." | **unverified** |
| AC4 | "Ao sair, falhar ou receber interrupção, o agente e a captura dessa invocação terminam de forma verificável; execuções concorrentes não misturam eventos nem desligam uma à outra. O comando oferece uma forma de consultar a captura resultante sem copiar ID." | **unverified** |
| AC5 | "README e ajuda mostram o preparo único e o fluxo diário de uma linha, além dos limites reais: confiança manual, ausência de sinal nativo de ativação de skill no Codex e cobertura apenas de ferramentas locais quando essa for a fonte." | **unverified** |
| AC6 | "A harness nativa do Hermes não declara concluída uma entrega ainda pendente após 300 ms de contadores estáveis; provas cobrem inicialização atrasada, conclusão e falha/destino travado, preservando o prazo máximo existente, callbacks neutros e as asserções. O gate completo é repetido com os casos nativos aplicáveis." | **unverified**: o gate completo (D) não rodou |
| AC7 | "A prova antiga T8-C15 preserva os dois produtores concorrentes de 40 eventos, os 80 eventos únicos e todas as asserções e prazos; quando falhar, informa operações/tipos/códigos de E/S e o estado/export da captura, ou a indisponibilidade dessa inspeção, sem expor caminhos, conteúdo, chaves ou ambiente. Provas discriminam falha anterior ao commit e confirmação perdida após commit. Eventual correção exige defeito demonstrado e preserva os contratos atuais, sem retry novo, aceitação de perdas ou redução de concorrência." | **unverified** |
| AC8 | "A prova I23-C10 mantém as sessões intercaladas e simultâneas, as contagens exatas, chaves/identidades isoladas, prazos e asserções; quando falhar, o diagnóstico informa operações/tipos/códigos de E/S e estado ou indisponibilidade, sem expor caminhos, conteúdo, chaves ou ambiente. Provas controladas demonstram que a mensagem preserva a falha e não vaza dados. Somente o orçamento total do job Windows da matriz verify passa de 10 para 20 minutos; limites dos testes/produto, paralelismo, carga, demais jobs e sistemas permanecem iguais." | **unverified** |
| AC9 | "A medição comparativa usa o workflow existente, com um job Windows executado somente por workflow_dispatch e limitado a 10 minutos, sem substituir os cinco checks regulares. O script reutiliza createStoreIo/holdLockFile, compara os caminhos reais do temporário padrão e RUNNER_TEMP e identifica quando são equivalentes; quando distintos, executa A1/B/A2 no mesmo runner, cada fase com três produtores de 500 ciclos e três processos de carga de 64 KiB com flush, sob teto de 120 segundos. Registra quantidades previstas/concluídas/incompletas, erros por código e métricas p50/p99/máximo e contagens >=600/650 ms, sem transformar erro, ausência de dados ou término parcial em zero ocorrências. Provas controladas verificam valores exatos, caminhos equivalentes, E/S, prazo, proteção da limpeza e supervisão somente de filhos próprios. Produto, testes funcionais existentes, prazos750/650ms, contagens, perdas/retry, carga da suíte e jobs regulares20/10/5 permanecem iguais, ressalvadas a política de promoção da instalação Hermes Windows da S19 descrita no segundo critério e a exceção local S21 do core vendorizado, aprovada em https://github.com/oldboydev/skill-me/issues/25#issuecomment-6525782289: somente o rename do temporário do estado repete EPERM no Windows, até sete tentativas e seis esperas de 10/20/40/80/160/320 ms (630 ms por gravação; até 3.780 ms de esperas numa revisão nova e 2.520 ms no cache, sem teto novo para E/S). Guardas conferem identidade/tipo/bytes do temporário e do destino ou sua ausência, inclusive edições no mesmo inode; indisponibilidade ou mudança falha fechada, e esgotamento preserva o último erro original. Outros códigos e POSIX mantêm uma tentativa sem espera. Ordem comum→local, autoridade do estado comum, histórico/contadores, cache, locks, cleanup e recusa de ready pela chamada que falhou permanecem. Os 16 testes existentes e seus prazos ficam intactos; a divergência nova de review.mjs/review.test.mjs/README é explícita somente neste repositório, com hashes dos cinco arquivos antes/depois, cli.mjs/schema.json e os dois pilotos intocados; plano vinculante `.tasks/issue-25-core-save-retry-proposal.md`; o novo job manual é a exceção adicional autorizada ao conjunto de jobs, não uma dispensa da CI. Este critério da revisão do código exige a ferramenta, sua integração e suas provas locais descritas acima. A execução remota ocorre após PASS, ready e publicação da branch, conforme a proposta aprovada; seu resultado e a CI regular verde são condições adicionais obrigatórias de merge, na seção seguinte." | **unverified**: S21 core 105/105 em A e B e identidade S21 válida, mas C/D ausentes. A medição remota e a CI continuam condição de merge |

**0 de 9 atendidos.** Nenhum é `met`.

### F.7 Achados finais

1. **F1 (bloqueante para esta verificação) — FAIL do gate B.**
   - **Cenário**: gate B (clone `core.autocrlf=true`, Windows, Node 24.13.0, conc 8, TMP curto privado) no HEAD `6477023`.
   - **Esperado**: 767 testes, fail 0; I4-C34k K7d com 1 tentativa, exit 4 `conflict`, `config_changed_during_apply` no staging, staging alheio `intacto`, pasta própria movida intacta.
   - **Atual**: 767/753/1; K7d com 2 tentativas, exit 0 `applied`, troca da fixture não realizada (`foreign "—"`, `own "ausente"`).
   - **Impacto**: não há PASS 28. A prova da guarda K7d não foi demonstrada no B. C (WSL/POSIX) e D (`npm test` completo com nativos) não rodaram.
   - **Local**: `tests/integrations/install-apply.unit.test.mjs:3444` (asserção), `:3093-3101` e `:3130` (montagem dentro do rename instrumentado); `independent-28/B.log:842-930`.
   - **Classe**: compatível com o **R1** declarado antes das provas, isto é, robustez da prova sob recusa natural do Windows ao renomear o staging recém-gravado. Pela evidência, não é defeito de produto: a guarda e o retry agiram conforme a S19 sobre o que viram. Não proponho nem faço correção. A decisão é do Root.
2. **Observações pré-provas preservadas**: S21-O1…O5, R1, O2, N1, N3, N4, o aumento de DURAÇÃO S19 AFTER (p50 de 18 para 38 ms; é aumento de duração, sem nenhuma alegação de melhoria de desempenho) e a precisão "30 critérios". Nenhuma pede correção cosmética de Source.
3. **Precisão retificada (§4.2/§5 pré-provas)**: lá eu disse que o D "começa pelo motor do core". **Errado**: o D encadeia governança → core → doctor → integrações. Não muda nenhuma conclusão; o D não rodou.
4. **Limites**:
   - os verdes do A e as partes verdes do B são deste computador e não medem o runner da CI;
   - o AFTER S20 r1 100/100×2 e o AFTER S18 são do Root/autor, não a medição de 4500 ciclos, e não dão garantia futura;
   - as causas físicas históricas (D27, S20 18/43, S16 CI58, S17, S18/C34h/C34i e o EPERM K7d do B28) continuam **desconhecidas**.

Sem fault injection, Coverage ou Test policy (perfil light). Não reexecutei nenhum controle.

### F.8 Processo da fase de execução

- **Comandos**: 2 dos 4 comandos literais (A, B), uma vez cada, em primeiro plano. A com término natural 0; B com término natural 1 (exit 2 do controlador). C e D **não executados** por parar na primeira falha. 1 Bash extra recusado pelo hook antes de iniciar (F.1).
- **Leituras desta fase (só leitura)**:
  - Read de `v28-matrix-controller.mjs` (62 linhas), `identity-comparison.json` (`:1-12`, `:1540-1625`) e `B.log:836-930`;
  - Read de `tests/integrations/install-apply.unit.test.mjs:3079-3134`, para localizar a montagem;
  - Read do pack `:5424-5441` (texto canônico dos ACs; leitura extra, contada);
  - Grep em `A.log`/`B.log`/`identity-comparison.json`/`install-apply.unit` (`K7d`).
- **0 processos em segundo plano. Incidentes meus: nenhum.** Não toquei no `Temp\x` global, no `/tmp` nem em TEMP global. Não editei `.verified.md`, produto, testes, config ou controladores. O único Edit foi este `report.md`. Não executei formal 15, push, manual, CI nem merge.
- **Auditoria 28**: do Root, **pendente/externa**. Ela fecha depois do D28 real, e o D28 **não ocorreu** nesta rodada. Não invento dados dela, nem final25/D25.
- **Literal PASS/histórico**: o Root preserva o histórico de 495744 bytes. Como não há PASS, nada deste relatório autoriza prepend de PASS, formal, push, CI ou merge.

---

Título anterior (preservado): "Verificação28 — ANÁLISE PRÉ-PROVAS (fontes lidas; provas NÃO executadas; nenhum PASS, nenhum FAIL)".

## ANÁLISE PRÉ-PROVAS (notas escritas durante a leitura; nenhum PASS; nenhuma prova executada)

Verifier: CLAUDE VERIFIER28 NOVO (Opus 5.5), independente; perfil light/handoff:on (AGENTS.md L146–147). HEAD alvo 6477023ed854ecbf95673b8f5b7da792f7745254, base 63621c691f132dc8d591414269d36cfa18fca594.

### Registro de leitura (cópia fiel do required-sources-pack.md por read-plan.json)
- Chunks lidos (offset/limit exatos do plano): 1/200, 201/200, 401/200, 601/200, 801/200, 1001/130, 1131/200, 1331/173, 1504/76, 1580/109, 1689/137, 1826/113, 1939/105, 2044/61, 2105/69, 2174/28, 2202/26, 2228/25, 2253/23, 2276/27, 2303/25, 2328/130, 2458/183, 2641/200 → linhas 1–2840 sem truncamento.
- Read extra: read-plan.json (747 linhas), required-sources-index.json (253 linhas), report.md (este, 1 linha). CONTRIBUTING: não incluído no pack; ausência a confirmar por Glob (contabilizado como busca extra).

### Notas de análise acumuladas
- AGENTS L135–142: exceção S21 só EPERM ≤7 tentativas/630 ms por gravação + guardas identidade/bytes; 16 testes/prazos intactos; hashes 5 arquivos antes/depois; cli.mjs/schema.json/pilotos/teto35 não mudam.
- Task L1142–1150 (pack 1610–1618): hashes antes/depois — README 0bfcbd…→8d5bfe…, cli 4ff9a5… igual, schema 093819… igual, review.mjs 499891…→fdf8dc…, review.test a48aff…→ec6743…. Index do pack confirma review.mjs fdf8dc…, review.test ec6743…, README 8d5bfe… (coerente).
- Checklist inteiro lido (pack 2063–5411): C1–C50 com todos os refinamentos C46 (a)–(u)+F1 R24/R25, C47 (a)–(d), C48 (a)–(c)+2º acréscimo, C49, C50 (a)–(o); Swept, Handoff S1–S21 completos.
- Chunks adicionais lidos: 2841/200, 3041/200, 3241/200, 3441/200, 3641/200, 3841/200, 4041/200, 4241/200, 4441/200, 4641/197, 4838/197, 5035/195, 5230/80, 5310/86, 5396/123, 5519/165 → linhas 1–5683.
- 9 AC canônicos (context-readable L14–27): AC1 executável/args/sinais/código; AC2 primeiro uso + exceção S19 (7/630 só promoção DIR Hermes Windows EPERM/EACCES/EBUSY; EIO/POSIX 1); AC3 só a sessão, capturas sucessivas 500/8MiB; AC4 encerramento verificável/concorrência/consulta; AC5 README/ajuda; AC6 harness Hermes 300 ms/settleMaxMs; AC7 T8-C15; AC8 I23-C10 + orçamento Windows 20; AC9 medição manual + ressalvas S19/S21 (S21: só rename do TMP do estado, só EPERM Windows, 7/630 por gravação, 3780/2520 ms, guardas identidade/tipo/bytes, último erro original, 16 testes intactos, cli/schema/pilotos intocados).
- Chunks 5684/106, 5790/90, 5880/141, 6021/200, 6221/200, 6421/128 lidos → linhas 1–6548. Contexto da issue (49 comentários) e R26 (520 linhas) inteiros.
- R26 (carry analítico): PASS 50/50 em 8f393c5, árvore b1529db2; A/B 643/630/0/13, C 643/621/0/22, D 1076/1056/0/20; identidade 34466ab→HEAD só 4 arquivos de teste; core 5 = base. Tabela §11.2 com citações por check (maioria "R24" carry). Carry só vale para blobs iguais entre 8f393c5 e 6477023 — exigir comando A com exatamente 7 deltas (4 S19/S16 + 3 core S21).
- Chunks 6549/79, 6628/72, 6700/59, 6759/78, 6837/87, 6924/200, 7124/191, 7315/200, 7515/200, 7715/189, 7904/126, 8030/200 lidos → linhas 1–8229. since-r26.diff: hunks de build.md, checklist, round27-failed.md (novo, 572 linhas: R27 FAIL; D 43/42/1 C11 TypeError :349), s20-diagnostic.md (novo; B 18/43 EPERM rename comum, proposta S21 §6), s21-author-report.md (novo; matriz P1–P6, RED 89/10/79, PRODUCT review.mjs, GREEN A/B 767/754/0/13, C 767/745/0/22, D 1184/1164/0/20, AFTER_A inválido por âncoras duplicadas, AFTER r1 100/100×2), início do hunk .verified.md (prepend R26).
- Notas S21 do relatório autoral §10: `promoteStateTemp` export; tentativa 0 sem wait; n>0: wait(DELAYS[n-1]) e reconferências fora do try; catch só `code==="EPERM" && attempt<6` continua; POSIX direto. A conferir no código fonte atual (pack 21300–22225).
- Chunks 8230/200, 8430/172, 8602/120, 8722/81, 8803/119, 8922/96, 9018/103, 9121/124, 9245/186, 9431/200, 9631/200, 9831/200, 10031/200, 10231/200, 10431/200 lidos → linhas 1–10630.
- Análise fresca S21 (hunk review.mjs, pack 9384–9507): `promoteStateTemp` — POSIX `io.renameSync` 1× e return (9461–9464); Windows `expected=Buffer.from(expectedBytes)` (9465); captura temp+`requireThat(intactTemp)` (9473–9474) e destino (9475); laço `attempt>0`: `wait(DELAYS[attempt-1])` e reconferência fora do try (9479–9488); catch `error?.code!=="EPERM" || attempt===6` → throw mesmo objeto (9492–9494) ⇒ máx. 7 renames/6 esperas; `observeStateEntry`: ENOENT lstat→absent, outro erro propaga; dev/ino BigInt `dev>=0n`/`ino>0n` senão UNAVAILABLE (9417–9423); tipo sem seguir link; lê só arquivo; ENOENT na leitura→CHANGED, demais propaga (9431–9441); `save` escreve 1× e promove (9498–9505). Conforme Landing S21 pela leitura.
- Testes S21 (hunk review.test.mjs 9508–10455): P1 U0/k=0..6/7 permanentes `run.error===errors[6]`, waits `S21_DELAYS` literal, soma 630; D6 `elapsedMs>=630` só inferior; P2 ×6 + EPERM→EIO + linux/darwin trace exato; P3 G1–G16 + EPERM guardas; P5 ×6; P6 32+2; P4 ×2. Asserções literais localizadas.
- run.mjs S19 (hunk 10456+): `dirIdentity` BigInt `dev<0n||ino<=0n`→`Error("identity_unavailable")`; `renameRetrying` `!retryable(error)||retry===6` throw; `withLock` aceita `adoptStateGuard`; `installHermesArtifacts` captura rootSame/stateDirSame, `rootSame()` antes de `mkdir(plugins)` (F1).
- Chunks 10631/200, 10831/200, 11031/200, 11231/200, 11431/200, 11631/200, 11831/200 lidos → linhas 1–12030. since-r26.diff lido inteiro (pack 6481–12018).
- Arquivos do since-r26.diff: build.md, checklist, round27-failed.md, s20-diagnostic.md, s21-author-report.md, .verified.md, task, 7 planos .tasks, AGENTS.md, code-review.config.json, docs/agent-observation.md, e executáveis em src/tests/scripts: scripts/code-review/{README.md,review.mjs,review.test.mjs}, src/integrations/install/run.mjs, tests/integrations/{install-apply.unit,install.cli,launch/end.e2e}.test.mjs = exatamente 7 (4 S19/S16 + 3 core S21) pela leitura do diff exportado; identidade Git a confirmar no comando A.
- code-review.config.json: só reordenação de overrides 3/4/5/8 (conteúdo igual) e "25" maxRounds 14→15 com approval novo; teto ≤35, global inalterado pela leitura.
- Observação de precisão (não defeito): Sources do checklist L55 diz "os 30 critérios" da task, que hoje tem 42; texto histórico, sem contradição de check.
- Chunks 12031/200, 12231/200, 12431/200, 12631/200, 12831/200, 13031/200, 13231/200, 13431/200, 13631/200, 13831/200, 14031/200, 14231/200, 14431/200, 14631/200, 14831/200, 15031/200, 15231/200, 15431/200, 15631/200, 15831/200, 16031/200, 16231/200, 16431/200, 16631/200, 16831/200, 17031/200 lidos → linhas 1–17230. run.mjs (1101), io.mjs (124), install-apply.unit (3795) inteiros.
- install-apply.unit fonte atual: C34k tabela + `assert.deepEqual(observed, expected)` :3444 (K12g dev 0n válido, K13a win32 1 tentativa, K13b nativo plugins criada); C34m :3456–3524 (raiz real substituta dentro do lstat BigInt do stateDir; esperado attempts 0, exit 4, conflicts `[s19Changed("."), S19_LOCK_KEPT]`, through [], raiz alheia intacta) — a troca da fixture usa `renameSync` puro (:3472) = nota R27 R1 (falso vermelho possível no Windows; não é produto); s19MoveFixtureDirectory :3533–3546 (BigInt dev/ino da origem + destino ausente antes de cada tentativa; retryable win32 EPERM/EACCES/EBUSY); C34n :3553–3638 (transitório attempts 3, waits [10,20], fixtureError null, installerOpsDuringFixture []; EIO attempts 1, waits [], `sameError: state.error === eio`, exit 5 incomplete, staging própria mantida); s19InstallWithObservedMount :3648–3697 (montagem simulada primeiro, física depois `await s19MoveFixtureDirectory(from,to)` :3670, registro de ops enquanto pending, `await settled` :3695); C34o :3703–3795 (mesmos valores; promotions 0).
- Chunks 17231/200, 17431/200, 17631/200, 17831/200, 18031/200, 18231/200, 18431/200, 18631/200, 18831/200, 19031/200, 19231/200, 19431/200, 19631/200, 19831/200, 20031/200, 20231/200, 20431/200, 20631/200, 20831/148, 20979/141, 21120/148, 21268/200, 21468/200, 21668/200, 21868/200, 22068/200, 22268/200, 22468/200, 22668/200, 22868/200, 23068/200, 23268/200, 23468/200, 23668/200, 23868/200, 24068/122, 24190/131, 24321/200, 24521/196, 24717/200, 24917/200, 25117/72 lidos → linhas 1–25188. **Pack inteiro lido: 148/148 chunks do plano, offsets/limits exatos, nenhum truncado** (nenhuma linha `.1/2` sem a `.2/2` seguinte; as partidas, por exemplo `L759.1/2`/`L759.2/2` de review.mjs, vieram inteiras no mesmo chunk).

---

## 1. Recibo de leitura (final)

**Li a cópia fiel** `independent-28/required-sources-pack.md`, com 25188/25188 linhas em 148 chunks contíguos de `read-plan.json`, sem lacuna nem sobreposição. **Não alego ter aberto cada original.** Os SHA256-LF abaixo vêm de `required-sources-index.json` (`head` 6477023…, `lossless: true`). Não os recalculei: não tenho shell nesta fase.

| # | Fonte | Linhas | SHA256LF (prefixo) | Pack |
|---|---|---|---|---|
| 1 | AGENTS.md | 147 | 52808eaa | 4–150 |
| 2 | CLAUDE.md | 6 | 275a2e76 | 152–157 |
| 3 | tlc-implement/references/verify.md | 302 | 476c35ab | 159–460 |
| 4 | .tasks/issue-25-agent-launch.md | 1184 | 787b8cbd | 462–1652 |
| 5 | .tasks/issue-25-lock-release-proposal.md | 84 | 56aa16a9 | 1654–1737 |
| 6 | .tasks/issue-25-c43-diagnostic-plan.md | 76 | ac0ecedc | 1739–1814 |
| 7 | .tasks/issue-25-hermes-install-diagnostic-plan.md | 53 | e2d3b92d | 1816–1868 |
| 8 | .tasks/issue-25-hermes-install-probe-plan.md | 37 | 4ad1fb89 | 1870–1906 |
| 9 | .tasks/issue-25-hermes-staging-retry-proposal.md (S19) | 116 | 62e2cfbb | 1908–2024 |
| 10 | .tasks/issue-25-hermes-c34h-diagnostic-plan.md | 34 | 1da95bb0 | 2026–2061 |
| 11 | .checks/issue-25-agent-launch.md (checklist inteiro) | 3219 | 6ecc147c | 2063–5411 |
| 12 | independent-28/context-readable.md (9 ACs, 49 comentários) | 541 | 6a0a24a2 | 5413–5958 |
| 13 | independent-26/report.md (R26) | 520 | 8d07c32b | 5960–6479 |
| 14 | independent-28/since-r26.diff | 5505 | 2a034980 | 6481–12018 |
| 15 | src/integrations/install/run.mjs | 1101 | 4b63fed3 | 12020–13120 |
| 16 | src/integrations/install/io.mjs | 124 | 6c4bd823 | 13122–13245 |
| 17 | tests/integrations/install-apply.unit.test.mjs | 3795 | da654000 | 13247–17041 |
| 18 | tests/integrations/install.cli.test.mjs | 1634 | 3ab33683 | 17043–18676 |
| 19 | tests/integrations/launch/end.e2e.test.mjs | 1054 | e5b69e55 | 18678–19731 |
| 20 | tests/integrations/helpers/producer-runs.mjs | 97 | 0b147ffd | 19733–19829 |
| 21 | tests/integrations/helpers/traces.mjs | 665 | 1f7ee30b | 19831–20495 |
| 22 | src/integrations/traces/delivery.mjs | 225 | 792f4742 | 20497–20721 |
| 23 | builder-s19/report.md | 499 | 8744b090 | 20723–21222 |
| 24 | author-s19-r4-after/comparison-root.json | 37 | 00e4b242 | 21224–21260 |
| 25 | .tasks/issue-25-core-save-retry-proposal.md (S21) | 37 | 0aa1f5c6 | 21262–21298 |
| 26 | scripts/code-review/review.mjs | 925 | fdf8dc66 | 21300–22225 |
| 27 | scripts/code-review/review.test.mjs | 1834 | ec6743f2 | 22227–24060 |
| 28 | scripts/code-review/README.md | 50 | 8d5bfec2 | 24062–24114 |
| 29 | builder-s21/report.md | 283 | 3ed430e4 | 24116–24399 |
| 30 | author-s21-after-r1/comparison-root.json | 57 | 98e3c11c | 24401–24457 |
| 31 | .checks/issue-25-agent-launch.round27-failed.md (R27) | 572 | 6c5d1344 | 24459–25030 |
| 32 | builder-s21/product-approved-core-root.json | 63 | 555d7709 | 25032–25094 |
| 33 | code-review.config.json | 60 | cfaad75a | 25096–25155 |
| 34 | .tasks/issue-25-core-c11-diagnostic-plan.md (S20) | 22 | 011b5d14 | 25157–25178 |
| 35 | builder-s21/after-preparation-decision-root.md | 9 | e2552e94 | 25180–25188 |

Notas da leitura:
- **Leituras extras** (contadas): Read de `read-plan.json` (747 linhas), `required-sources-index.json` (253 linhas) e deste `report.md` (1 linha, antes da 1ª edição). Glob(s) de localização dos arquivos da fase, feitos antes da compactação de contexto; a contagem exata está no transcript. Mais **1 Glob `CONTRIBUTING*`** nesta etapa.
- **CONTRIBUTING**: ausente no repositório. O Glob achou só as cópias vendorizadas do npm do Node da CI (`.checks/code-review/issue-25/ci-node-24.13.0/…/{node-gyp,diff}/CONTRIBUTING.md`), que não regem o projeto. Vale o AGENTS.md.
- **Compactação de contexto (honestidade)**: a leitura integral foi feita nesta sessão, mas houve um resumo automático de contexto depois do chunk 16431. O que li antes dele está nas notas acima, escritas durante a leitura, e no resumo. Não reli esses chunks; a análise abaixo se apoia nessas notas e na leitura fresca de 16631–25188.
- **feature.diff**: exportado só para consulta e **não lido**. Não alego ter lido o diff inteiro da feature. O que vale aqui é o carry analítico R26 (`independent-26/report.md` §11.2) mais o delta `since-r26.diff`, lido inteiro, e as fontes atuais S19/S16/S21, lidas inteiras no pack.
- **Fora do pack, não relidos**: `command.cli`, `prepare.cli`, `session.e2e`, `store.unit`, `report.cli`, `docs.test`, `hermes-harness.unit`, `hermes-plugin.native`, `agent.unit`, `concurrency.cli`, `delivery.unit`, `evidence.unit`, `agents.e2e`, `control.cli`, `governance-ci.test`, `ci-lock-latency.test`, `store.mjs`, `cli.mjs`, `schema.json` e workflows. As citações deles são **carry-R26**, válidas só se o comando A provar o blob igual.

## 2. Perfil e passos que não rodam

Perfil `light`, handoff:on (AGENTS.md L146–147). Pelo verify.md, não há passo de UI, nem `Coverage`, nem `Test policy`, nem fault injection. Não crio mutantes nem sondas.

RED/GREEN, K1–K13, G1–G7, P1–P6, as coletas S18/S20 AFTER, os controladores e os FAILs históricos são **do autor/Root**: eu só os atribuo, não são provas minhas.

O passo 3 (asserção, precisão, Swept existing) foi feito pela leitura. Os gates A/B/C/D ainda **não rodaram**.

## 3. Fontes vinculantes × checklist (Sources, Landing, Handoff, Swept)

- **Sources**: a proposta S19 (pack 1908–2024) e a S21 aprovada (pack 21262–21298, comentário 6525782289) dizem a mesma política que o AC2/AC9 do contexto (L14–27) e o código.
  - **S19**: `run.mjs:335-346` `renameRetrying`, `:903-910` `retryable` só `win32` com EPERM/EACCES/EBUSY, `:889-898` `promotable`, `:208-214` `dirIdentity`.
  - **S21**: `review.mjs:650-656` (`STATE_RENAME_DELAYS_MS` e `waitSync`), `:658-698` (`observeStateEntry`/`sameStateEntry`), `:701-747` (`promoteStateTemp`), `:748-753` (`save`).
  - **Sem contradição.**
  - Precisão: o Sources do checklist fala em "os 30 critérios" da task, que hoje tem 42. É texto histórico e não contradiz nenhum check.
- **Landing**: li por conteúdo, não por rótulo.
  - Linhas S19 (F1 `run.mjs:841` depois de `rootSame` `:828`; C34h `unit:1426`, `:1504-1507`; C34i `unit:1805`, `:1870-1874`) e S16/S17/S18.
  - Linhas S21: helper síncrono `promoteStateTemp(temp, dest, expected, {platform, io, wait})`; TMP escrito uma vez; POSIX direto; só EPERM no Windows, 7 tentativas e 630 ms; guardas fora do catch; mensagens D2 sem code/errno; sem CAS.
  - Batem com o código lido. **Sem contradição.**
- **Handoff**: S1–S21 estão no checklist. A S21 fechou com GREEN do autor em `37b8048` e AFTER r1 100/100×2, e isso fica **atribuído**. A R27 é FAIL (0/50, 0/9), preservada no `.round27-failed.md`.
- **Swept existing** (`delivery.mjs` relido no pack, blob `792f4742` igual ao da R26/R27):
  - nenhuma entrega é reenviada (`delivery.mjs:54-62`, `:122-123`);
  - a entrega nunca lança para a observação (`:155-156`);
  - só `lock_present` repete, com espera de 10 ms (`:19` `LOCK_RETRY_MS = 10`; `:100-102`);
  - o abandono é terminal (`:99`);
  - 750/650 ms (`:12` `DELIVERY_DEADLINE_MS = 750`, `:17-18` `ATTEMPT_MS = 750 − 100`);
  - `waitUntil` de 15 s/20 ms (`traces.mjs:657-663`).

  A S21 não toca a entrega, o store nem os prazos. O retry novo vive só em `review.mjs` (core) e `install/run.mjs` (S19). C29b (`unit:610`, `Date.now() - started - accessMs < 1000 + 500`) segue intacto, e eu não invento um limite de 1 s.

## 4. Análise fresca dos deltas desde a R26

### 4.1 S19/S16/S17 (`run.mjs`, `install-apply.unit`, `install.cli`, `end.e2e`)

Os 4 arquivos têm os mesmos SHA256LF que a R27 registrou em `7fac597` (pack R27 L65–69): `4b63fed3`, `da654000`, `3ab33683`, `e5b69e55`. Pela leitura não há mudança S19/S16 depois da R27. A análise da R27 §4 continua válida pelo conteúdo, e eu a confirmei nas linhas lidas:

- **Helper isolado**: `renameRetrying` julga também o 7º erro e relança o original. `beforeAttempt` fica antes de cada tentativa e o erro dele não é repetido.
- **Identidade**: `dirIdentity` exige BigInt, `dev ≥ 0n` e `ino > 0n`, senão `Error("identity_unavailable")` sem code, que vira `io_error` e exit 5. `adoptStateGuard` está no `withLock`.
- **F1**: `rootSame()` vem antes de `mkdir(plugins)`.
- **Falhas na promoção**: guarda que falha não limpa; rename que falha limpa só o staging próprio.
- **Provas**:
  - C34m usa a troca no `lstat` BigInt do stateDir (`unit:3471-3478`);
  - C34n/C34o simulam exatamente 3 tentativas com esperas `[10,20]`, ou EIO com 1 tentativa, `[]` e `sameError: state.error === eio` (`unit:3585-3586`, `:3622-3624`, `:3738-3739`, `:3778-3780`);
  - a movimentação física vem depois, separada, enquanto `pending` (`unit:3670`), e fica fora das contagens;
  - `installerOpsDuringFixture: []` e `await settled` (`:3695`).
- **S16 (`end.e2e`)**:
  - `recordProducersInEachTest()` (`:36`);
  - `c43TransientOpening(…, lastHookEnv = {})` (`:831-846`) com `LAUNCHED(1)` no último hook (`:845`);
  - controles K1 `SEGMENT_EIO` (`:887-892`), K2 `STALL_SEGMENT` (`:896-904`) e K3 `BLOCK_LOOP "1|900"` (`:910-913`);
  - `assertFinalHookLost` (`:868-876`) exige que a asserção original continue a vermelha;
  - nenhum prazo novo: usa `ATTEMPT_MS`.
- **S17 (`install.cli`)**: `partialHermesRegistry` continua `assert.equal(installed.status, 0, …)`, e só a mensagem usa `installEvidence` (`install.cli:1376`, `:1617-1634`). Não tolera 5.
- **Histórico**: o controle S17 de 1 tentativa é HISTÓRICO, não PASS atual da política de 7. O observador S16 não identificou a causa do timeout da CI58.

### 4.2 S21 — `review.mjs` (produto do core), decisão por decisão

- **POSIX** (`:711-714`): com `platform !== "win32"`, a única chamada a `io` é `io.renameSync(temp, destination)`, uma vez, sem lstat, read ou wait. Retorna `undefined`. É o caminho original.
- **Windows: captura antes da 1ª tentativa**.
  - `expected = Buffer.from(expectedBytes)` (`:715`) copia o Buffer, então mutar o do chamador não altera a referência.
  - `observe(temp)` + `requireThat(intactTemp(...), changed)` (`:723-724`): o TMP precisa existir, ser `file` sem link e ter bytes iguais aos esperados.
  - `observe(destination)` (`:725`) guarda ausência ou tipo/dev/ino, mais bytes só para arquivo regular.
  - Antes da 1ª tentativa não há espera.
- **Laço** (`:726-746`):
  - na tentativa n > 0 há `wait(DELAYS[n−1])` (`:730`) e, depois, a reconferência do TMP (intacto e `sameStateEntry` com a captura) e do destino (`sameStateEntry` com a captura) (`:731-737`);
  - tudo isso fica **fora** do `try` do rename, então falha de guarda ou erro de E/S nelas não é repetido e chega como foi lançado;
  - o `catch` só continua com `error?.code === "EPERM"` e `attempt < 6` (`:743`); caso contrário faz `throw error`, o mesmo objeto;
  - logo: no máximo 7 renames e 6 esperas `10,20,40,80,160,320` (soma 630). No esgotamento sai o 7º erro, que é o último ORIGINAL;
  - EACCES, EBUSY, ENOENT, EXDEV, EIO e erro sem code: 1 tentativa.
- **`observeStateEntry`** (`:658-692`):
  - `lstatSync(path, {bigint:true})`; ENOENT vira `absent`; outros erros (EIO, EACCES, **inclusive EPERM**) propagam como o mesmo objeto;
  - a identidade é checada **antes** do tipo: `typeof dev === "bigint" && dev >= 0n && typeof ino === "bigint" && ino > 0n`, senão UNAVAILABLE (`:667-673`);
  - o tipo é `link | file | directory | other`, sem seguir link;
  - **só arquivo regular é lido** (`:682-690`), então diretórios nunca são lidos;
  - ENOENT na leitura depois do lstat vira CHANGED (`:687`); outros erros de leitura propagam.
- **`sameStateEntry`** (`:693-698`) compara `absent`, `type`, `dev`, `ino` e bytes (`Buffer.equals`, ou ambos null).
  - Edição no mesmo inode muda os bytes; troca por cópia idêntica muda o ino; entrada criada ou sumida muda `absent`.
  - Todos esses casos falham fechado: CHANGED sem regravar, promover ou apagar.
- **Mensagens D2** (`:716-718`) são literais, passam por `requireThat` (`:32-34`, `throw new Error(message)`) e por isso não têm `code` nem `errno` nem "EPERM".
- **`save`** (`:748-753`): `bytes = Buffer.from(JSON.stringify(value, null, 2) + "\n")`, depois `writeFileSync(temp, bytes)` **uma vez**, depois `promoteStateTemp(temp, path, bytes)`. Os bytes são os mesmos do `save` antigo (string UTF-8 → Buffer UTF-8).
- **`waitSync`** (`:654-656`) é `Atomics.wait` síncrono. No thread principal do Node isso bloqueia, sem timer nem async.
  - A prova D6 exige só o **limite inferior** `elapsedMs >= 630` (`review.test.mjs:1142`). Não há teto; eu não fabrico um.
- **CLI: ordem, cache e fases** (`review()` `:762-844`, só o `save` mudou):
  - lock `openSync(p.lock, "wx")` (`:770`), depois `stateAt`;
  - `saveState` inicial (`:782`): 2 gravações;
  - cache: `saveState` (`:789`), mais 2, e return. **Total 4** gravações; máximo de ESPERA 4 × 630 = 2520 ms;
  - revisão nova: `saveState` da tentativa (`:804`) e do relatório (`:824`). **Total 6** gravações; 6 × 630 = 3780 ms;
  - `saveState` (`:754-757`) grava sempre comum → local; não é transação nem rollback;
  - `finally` (`:826-843`): limpeza com aviso, depois `closeSync` e `unlinkSync(p.lock)`. Lock, contadores, `maxRounds`, teto ≤ 35 (`:501`) e prioridade da limpeza não mudaram;
  - a E/S em si não tem teto novo.
- **Sem CAS nem sandbox**: o comentário em `:699-700` aponta o lock como a proteção entre escritores legítimos.

### 4.3 S21 — `review.test.mjs` (89 testes novos, APPEND)

- **Prefixo**: `:1-894` contém os 16 originais, e o C9 termina em `:894`. São C10×4 (`:142`, `:177`, `:211`, `:228`), C11×3 (`:335-363` laço ready/changes_requested e `:365`) e C1–C9 (`:396`…`:854`).
  - A identidade byte a byte do prefixo (894 linhas, LF, SHA `a48aff48…`) é afirmação do Root (`product-approved-core-root.json:9`) e **fica a confirmar no A**.
- **Bloco S21** a partir de `:896`.
  - Import por namespace `import * as reviewModule` (`:899`). As declarações são içadas no ESM, então não há erro de ligação no core antigo.
  - Toda prova unitária começa com `assert.equal(typeof reviewModule.promoteStateTemp, "function", …)` (`:1002-1006`).
- **P1**:
  - U0 (`:1093-1102`);
  - k = 0…6 EPERM (`:1104-1117`), com `waits` deepEqual `S21_DELAYS.slice(0,k)`;
  - 7 permanentes (`:1119-1133`), com `run.error === errors[6]`, `waits` = `[10,20,40,80,160,320]` e soma 630;
  - D6 (`:1135-1143`), com `elapsedMs >= 630`.
- **P2**:
  - EACCES, EBUSY, ENOENT, EXDEV, EIO e erro sem code dão 1 tentativa e `[]` (`:1145-1154`);
  - EPERM seguido de EIO dá 2 tentativas e `[10]` (`:1156-1162`);
  - linux/darwin: trace exato `[["renameSync",S21_TEMP,S21_DEST]]` (`:1164-1179`).
- **P3**:
  - guardas depois da espera (`:1181-1242`); destino diretório e arquivo estáveis (`:1244-1272`);
  - recusas antes da 1ª tentativa (`:1274-1296`); identidade indisponível ×5 e na reconferência (`:1298-1319`);
  - propagação do mesmo objeto: EIO, EACCES e EPERM na guarda (`:1321-1373`);
  - `s21AssertRefusal` (`:1052-1058`) confere a mensagem literal, `code`/`errno` `undefined` e que a mensagem não contém "EPERM";
  - `s21AssertGuardOrder` (`:1027-1050`) confere a ordem: nenhuma espera antes da 1ª tentativa e, depois de cada espera, lstat+read do TMP e lstat (+read se for arquivo) do destino;
  - `s21VirtualIo` (`:943-990`) é dado declarado, não política. O lstat devolve BigInt só com `{bigint:true}`, como o Node.
- **F1** (fechado antes do RED): o TMP virtual fica num caminho privado inexistente, `join(tmpdir(), "code-review-test-s21-"+randomUUID())` (`:912-914`).
- **F2** (fechado antes do RED): `s21CaptureCheckout`/`s21RemoveOwnCheckout` (`:1455-1485`) exigem identidade dev/ino, caminho lexical e caminho real no TEMP. `s21WithCheckouts` (`:1489-1514`) usa `AggregateError([erroDoCorpo, …cleanup])`, que preserva a asserção.
- **P5** e **P6** (CLI real por `runCliWithFailingCleanup` original + pré-carga em NODE_OPTIONS restaurada no `finally` (`:1540-1550`)):
  - a pré-carga (`:1380-1436`) envolve só `writeFileSync`/`renameSync` do TMP/estado da issue 7; `lstatSync`/`readFileSync` ficam reais;
  - **P5** ×6 (`:1647-1709`): Windows `[1,2,3,4]`, ou `[1..7]` com `S21 EPERM 7`; POSIX `S21 EPERM 1`. Status e stderr são conferidos antes de ler o estado (`s21AssertSucceeded` `:1596-1610`), então um TypeError não mascara a causa. **O EPERM real do CLI, 1 × 7, é exercido**, não só a ausência de export;
  - **P6** ×32 (`:1731-1770`) cobre fases × alvo × tipo com a tabela `S21_AFTER_FAILURE` (`:1613-1622`). Conferi as 8 linhas contra o `review()` lido; por exemplo `attempt/local` leva a `check` "sem relatório" e a 2 tentativas na recuperação, porque a tentativa foi consumida;
  - mais `dest-create` (`:1772-1792`) e 6 gravações novas + 4 de cache com 6 EPERM cada, que dão 42/28 renames (`:1794-1816`);
  - **P4** ×2, `S21 EIO write` com 0 renames (`:1818-1834`).
  - Total 47 + 6 + 36 = 89.
- **RED** do autor (atribuído, builder-s21 §9): 89/10/79, término natural 1, sem TypeError, módulo, AggregateError ou mensagens de limpeza. 47 unitários falham pela ausência do export; 32 falham por comportamento do CLI; 10 de preservação (P6 eio ×8 e P4 ×2). Não é prova minha.
- **GREEN e AFTER** do autor (atribuídos):
  - A/B 767/754/0/13, C 767/745/0/22, D 1184/1164/0/20 em `37b8048`;
  - AFTER r1: mesmo gerador `0bb54a2b…`, input das 894 linhas originais, A 100/100 e B 100/100, contra o BEFORE B 98 + 2 EPERM (casos 18/43);
  - carga e timing do SO não controlados; sem garantia futura; **não é a medição de 4500 ciclos**. A causa do D27 continua DESCONHECIDA (o stderr não foi retido).

### 4.4 README e config

- O README (`:29`) descreve exatamente a política: temporário escrito uma vez, só EPERM no Windows, 7 tentativas e 630 ms, 3780/2520 ms, lock retido, E/S sem teto, último erro original, guardas, sem CAS, comum/local sem transação.
- O README (`:50`) restringe a exceção da #25 aos 3 arquivos (pilotos intocados; `cli.mjs`/`schema.json` iguais).
- Em `code-review.config.json` mudou `"25"`, `maxRounds` 14 → 15, com aprovação nova. As demais issues e o padrão (2) ficaram iguais. O motor aceita, porque exige `> policy.maxRounds` e `<= 35` (`review.mjs:499-501`).

## 5. Tabela por check (uma linha por check; NENHUM é PASS)

Legenda:
- **Nível**: CLI, e2e, unit, workflow.
- **Amostragem**: 1 execução por gate liberado.
- **fresca** = lida por mim no HEAD;
- **carry-R26** = citação de `independent-26/report.md` §11.2, válida só se A provar blob 8f393c5 = HEAD;
- **produto tocado** = o caminho exercitado passa por `install/run.mjs` (S19), então a prova re-roda obrigatoriamente;
- **Identidade A** = o blob a confirmar no comando A (8f393c5 × HEAD). Para os arquivos frescos, também o SHA256LF do pack.
- **Gate D**: todos os checks dependem do D completo (`npm test` encadeado por `&&`, começando pelo motor do core S21). **Um D vermelho derruba todos.**

| Check | Claim | Valor concreto | Asserção localizada (orig. file:line · expressão) | Prova nomeada | Nível | Amostragem | Tocado/carry | Identidade A |
|---|---|---|---|---|---|---|---|---|
| C1 | `--help` 0/stdout; `private`; checkout intacto | `[0, SKILL_ME_HELP, ""]`; `private:true` | `command.cli:48-49`, `:65`, `:77` · carry | `I25-C1 npm link…` | CLI | A/B/C/D | carry-R26 | `command.cli`, `package.json` iguais |
| C2 | args literais, sem shell | `argv: LITERAL_ARGS` | `command.cli:96-98` · carry | `I25-C2 argumentos literais…` | CLI | A/B/C/D | carry-R26 | `command.cli` |
| C3 | código repassado | `{0:0, 7:7}` | `command.cli:105` · carry | `I25-C3 código do agente…` | CLI | A/B/C/D | carry-R26 | `command.cli` |
| C4 | shim `codex.cmd`; outro `.cmd` recusado | 127 `launcher_requires_shell` | `command.cli:130-133`; `agent.unit` I25-C4 · carry | `I25-C4 shim do npm…` (W), `…entrada do shim…` | CLI+unit | W A/B/D; C skip com motivo | carry-R26 | `command.cli`, `agent.unit` |
| C5 | sinais do terminal 1× | `CTRL_C_EVENT → ["SIGINT"]` | `command.cli:228`, `:244-245` · carry | `I25-C5 Ctrl+C…` (W), `…POSIX` (P) | CLI | W A/B/D; P C | carry-R26 | `command.cli` |
| C6 | SIGTERM só ao launcher, 1× | `signals: ["SIGTERM"]` | `command.cli:267` · carry | `I25-C6 SIGTERM…` | CLI | só C (P) | carry-R26 | `command.cli` |
| C7 | agente ausente | 127 `executable_not_found`, nada criado | `prepare.cli:93-94` · carry | `I25-C7 agente ausente…` | CLI | A/B/C/D | carry-R26 | `prepare.cli` |
| C8 | prévia antes de escrever | 500 / 8 MiB / 7 dias | `prepare.cli:122-126` · carry | `I25-C8 prévia…`, `…LOCALAPPDATA` (W) | CLI | A/B/C/D | carry-R26 | `prepare.cli` |
| C9 | confirmação aplica (inclui instalação Hermes) e inicia | aplicado + agente iniciado | `prepare.cli:163-168` · carry | `I25-C9 confirmação aplica…` | CLI | A/B/C/D | carry-R26 + **produto tocado** | `prepare.cli`; `run.mjs` SHA256LF `4b63fed3` |
| C10 | recusa | 3 `setup_declined` | `prepare.cli:189-191` · carry | `I25-C10 recusa…` | CLI | A/B/C/D | carry-R26 | `prepare.cli` |
| C11 | raiz relativa | 2 `root_not_absolute` | `prepare.cli:200` · carry | `I25-C11 caminho relativo…` | CLI | A/B/C/D | carry-R26 | `prepare.cli` |
| C12 | sem terminal | 3 `setup_required` | `prepare.cli:223` · carry | `I25-C12 sem terminal…` | CLI | A/B/C/D | carry-R26 | `prepare.cli` |
| C13 | preparo concluído não repete | SHA-256 iguais, sem prévia | `prepare.cli:238` · carry | `I25-C13 preparo concluído…` | CLI | A/B/C/D | carry-R26 + **produto tocado** | `prepare.cli`, `run.mjs` |
| C14 | falha do preparo | conflito 4 / inválida 3, mesmo código | `prepare.cli:250` · carry | `I25-C14 falha do preparo…` | CLI | A/B/C/D | carry-R26 + **produto tocado** | `prepare.cli`, `run.mjs` |
| C15 | pty real | prévia, confirmação, recusa | `prepare.cli:408` · carry | `I25-C15 terminal real (pty)…` | CLI | só C (P) | carry-R26 | `prepare.cli` |
| C16 | execução aberta | segmento 1, ponteiro, só o par da execução | `session.e2e:67` · carry | `I25-C16 execução aberta…` | e2e | A/B/C/D | carry-R26 | `session.e2e` |
| C17 | formato persistido e recusas | campos exatos | `store.unit:79` · carry | `I25-C17 …` | unit | A/B/C/D | carry-R26 | `store.unit` |
| C18 | execução indisponível | 3/4/5 sem caminho | `session.e2e:111` · carry | `I25-C18 …` | e2e | A/B/C/D | carry-R26 | `session.e2e` |
| C19 | grava na captura corrente | nada fora | `session.e2e:161` · carry | `I25-C19 …` | e2e | A/B/C/D | carry-R26 | `session.e2e` |
| C20 | par inválido | `binding_invalid`, nada gravado | `session.e2e:190-192` · carry | `I25-C20 …` | e2e | A/B/C/D | carry-R26 | `session.e2e` |
| C21 | autorização global intacta | bytes iguais on/off | `session.e2e:208-211` · carry | `I25-C21 …` | e2e | A/B/C/D | carry-R26 | `session.e2e` |
| C22 | limite de eventos (contrato 500) | 503 → 500 + 3, chave nova | `session.e2e:230` · carry | `I25-C22 …` | e2e | A/B/C/D | carry-R26 | `session.e2e` |
| C23 | limite de bytes (8 MiB) | 8.388.608 exatos | `session.e2e:282` · carry | `I25-C23 …` | e2e | A/B/C/D | carry-R26 | `session.e2e` |
| C24 | sucessora após stop manual | corrente nova | `store.unit:168` · carry | `I25-C24 …` | unit | A/B/C/D | carry-R26 | `store.unit` |
| C25 | encerramento e resumo | 2 `stopped`, `endedAt` ISO_MS, ponteiro fora, `{unknown_event:1}`, status 3, stderr de 5 linhas literal | `end.e2e:80-97` · `assert.equal(captures.length, 2)`; `assert.equal(result.status, 3, …)`; `assert.equal(result.stderr, [...].join("\n"))` | `I25-C25 encerramento e resumo…` (`:59`) | e2e | A/B/C/D | **fresca** | `end.e2e` `e5b69e55` |
| C26 | nada gravado + 1º passo manual | stderr literal por agente ×3 | `end.e2e:109-117` · `assert.deepEqual(observed, expected)` | `I25-C26 nada gravado…` (`:100`) | e2e | A/B/C/D | **fresca** | `end.e2e` |
| C27 | revogação | `{launch:true, code:"launch_ended", entries:1, committed:0, persisted:0, lost:1}`; árvore igual | `end.e2e:128-129` · `assert.deepEqual(late.report.delivery, {...})`; `assert.deepEqual(snapshotTree(prepared.root), before)` | `I25-C27 revogação…` (`:120`) + `store.unit` (carry) | e2e+unit | A/B/C/D | **fresca** + carry | `end.e2e`, `store.unit` |
| C28 | Hermes em voo N=3; 1ª perdida | persisted 3, todos `stopped`; perdida `[["stopped",0,0]]`, `rename` `["EIO"]`, 1 unlink | `end.e2e:165-176` · `{persisted:3, states:…"stopped", status:0}`; `:195`, `:202-203` · `assert.deepEqual(ofSegment("rename").map(...), ["EIO"])` | `I25-C28 entregas Hermes em voo…` (`:161`), `…primeira entrega perdida…` (`:184`) | e2e | A/B/C/D; Python do sistema | **fresca** | `end.e2e` |
| C29 | término por sinal | `stopped`, mesmo sinal/código | `command.cli:278` · carry | `I25-C29 …` | CLI | A/B/C/D | carry-R26 | `command.cli` |
| C30 | falha de início | 127/126, segmento 1 `stopped`, 0 eventos | `command.cli:342` · carry | `I25-C30 …` | CLI | A/B/C/D | carry-R26 | `command.cli` |
| C31 | falha do encerramento com orientação | lock alheio: 6 + stderr literal, `["active", true]`; E/S: 2, `["active", false]`, depois `launch_ended` | `end.e2e:213-223` · `assert.deepEqual([capture.state, existsSync(pointerFile(...))], ["active", true])`; `:252-264` | `I25-C31 …` (`:206`, `:233`) | e2e | A/B/C/D | **fresca** | `end.e2e` |
| C32 | simultâneas isoladas; 1ª criação do store | `["stopped","active"]`; pseudônimos próprios; `[1,1]`; store `{"skillMePrivacyStore":1}` | `end.e2e:294`, `:301-304`; `:326-334`; `:376-395`; `:438-451`; `store.unit:715` (carry) | `I25-C32 …` (`:273`, `:311`, `:348`, `:404`) | e2e+unit | A/B/C/D | **fresca** + carry | `end.e2e`, `store.unit` |
| C33 | on/off durante; arranjo `npm run` | `LAUNCHED(1)` ×3, `automaticOf = []`; `spawn sh ENOENT` | `end.e2e:477-483` · `assert.deepEqual(readJsonLines(reports).map(...), [LAUNCHED(1)×3])`; `:501-509` | `I25-C33 on e off…` (`:454`), arranjo (P) (`:489`) | e2e | A/B/D; arranjo só C | **fresca** | `end.e2e` |
| C34 | `skill-me report` | última execução, recuo de relógio | `report.cli:159` · carry | `I25-C34 …` | CLI | A/B/C/D | carry-R26 | `report.cli` |
| C35 | report sem execução | 3 `no_launch_capture`/`not_configured` | `report.cli:252-259` · carry | `I25-C35 …` | CLI | A/B/C/D | carry-R26 | `report.cli` |
| C36 | ajuda | 0/stdout; 2/stderr | `command.cli:350` · carry | `I25-C36 ajuda…` | CLI | A/B/C/D | carry-R26 | `command.cli` |
| C37 | README/guias | textos exigidos | `launch/docs.test:82` · carry | `I25-C37 documentação…` | unit | A/B/C/D | carry-R26 | `docs.test`, docs |
| C38 | console Windows | acento exato | `prepare.cli:355` · carry | `I25-C38 console real…` (W) | CLI | A/B/D | carry-R26 | `prepare.cli` |
| C39 | não conclui com 300 ms estáveis | pendente após 300 ms | `hermes-harness.unit:90` · carry | `I25-C39 …` | unit | A/B/C/D | carry-R26 | `hermes-harness.unit` |
| C40 | failed/timeout distintos; Hermes 5 s; "ação"; nativos | 5.000 ms | `hermes-harness.unit:220`, `:320`, `:324`, `:327`; `hermes-plugin.native:336` · carry | `I25-C40 …`, `I25-C40 harness nativa` | unit+nativo | nativos em A/B e no D completo; C skip `hermes-runtime-ausente` | carry-R26 + **produto tocado** | `hermes-*`, `run.mjs` |
| C41 | sucessora não publicada/não lida; vínculo do ponteiro | `[[1,"stopped",500],[2,"stopped",0]]`; `[[1,"stopped",500],[2,"active",0]]` e depois stop; `LAUNCHED(1)` da outra | `end.e2e:547`, `:620`, `:627`, `:664`, `:689`, `:733-737`, `:754-760` · `assert.deepEqual(captures.map(...), [[1,"stopped",500],[2,"stopped",0]])`; `store.unit:327-523` (carry) | `I25-C41 …` ×6 (`:516`, `:566`, `:630`, `:667`, `:728`, `:740`) | e2e+unit | A/B/C/D | **fresca** + carry | `end.e2e`, `store.unit` |
| C42 | cancelamento antes do agente | agente não inicia | `agent.unit` I25-C42; `command.cli:424`, `:456` · carry | `I25-C42 …` | unit+CLI | W console A/B/D; P C | carry-R26 | `agent.unit`, `command.cli` |
| C43 | lock após abertura/encerramento + S16 | `[5,false]`, stderr literal com `lockLine`; `LAUNCHED(1)` no último hook; K1–K3 continuam vermelhos com `io_failure`/`delivery_timeout`; `NOTHING_PERSISTED`; `[4,false]` `root_changed`; `endReleaseLines` | `end.e2e:837-845` · `assert.deepEqual((await hookFor(...)).report.delivery, LAUNCHED(1))`; `:868-876` `assertFinalHookLost`; `:888-892`, `:897-904`, `:911-913`; `:921-926`, `:946-949`, `:959-962`, `:973-984`, `:1026-1036`, `:1048-1053`; `store.unit:562`, `:580`, `:600` (carry) | `I25-C43 …` (abertura `:848`, 3 diagnósticos `:886`/`:895`/`:909`, sempre `:916`, trocado `:929`, processos reais `:952`/`:968`, encerramento `:1010`/`:1039`) | e2e+unit | A/B/C/D | **fresca** (S16) + carry | `end.e2e`, `producer-runs.mjs` `0b147ffd`, `traces.mjs` `1f7ee30b`, `store.unit` |
| C44 | contagem fechada | `failed`/`timeout`/`inactive` | `hermes-harness.unit:288`, `:291` · carry | `I25-C44 …`, I4-C22 nativo | unit+nativo | A/B/C/D; nativo em A/B/D | carry-R26 | `hermes-harness.unit` |
| C45 | PATH vazio | = cwd no POSIX; Windows ignora | `agent.unit:132-146`; `command.cli:166-186` · carry | `I25-C45 …` | unit+CLI | A/B/C/D; processo P em C | carry-R26 | `agent.unit`, `command.cli` |
| C46 | T8-C15 + (a)–(u) + F1 R24/R25 (todos os refinamentos do checklist) | 2 produtores × 40 = 80, 4 linhas intercaladas, por produtor 40/40/40/0; **T8-C16 exatamente 3 criações do lock**; retry só `EEXIST` em 10 ms; flush `[2,2,2,2]`; (p) `[creation, 2]`; (u) liberação por rename do `.lock`, `unsure` = posse indeterminada (`traces.mjs:233-249`, fresco); concorrência min(CPU−1, 8) = 8 W / 7 WSL | `concurrency.cli:221-222`, `:233-236`, `:305`, `:333`, `:360`, `:965-969`, `:1007`, `:1013-1019`, `:1031-1033`, `:1094-1098`; `delivery.unit:52-113`; `evidence.unit:241-283`, `:345-373`; `agents.e2e:469-486`, `:504-526` · carry; `delivery.mjs:68-104` `untilDeadline` · fresco | T8-C15, (a)–(c), T8-C16, (o), (p) `I25-C46 prazo da entrega…`, (u) | CLI+unit+e2e | A/B/C/D; disputa (u) estatística, só discrimina no W | carry-R26 (nenhum arquivo do C46 no `since-r26.diff`); `delivery.mjs`/`traces.mjs` frescos, mesmos SHA | `concurrency.cli`, `delivery.unit`, `evidence.unit`, `agents.e2e`, `store.mjs`; `traces.mjs`, `delivery.mjs` |
| C47 | I23-C10 + (a)–(d) | (a) `io_failure` 1/0/0/1/0, `[["rename segmento.tmp EIO (sob o lock, 2ª tomada)"],0,1]`; (b) `delivery_timeout`, `close key (sob o lock, 2ª tomada)`; (c)/(d) I23-C4 | `agents.e2e:328-381`, `:428-436`, `:443-449`; `evidence.unit:150-225`; `control.cli:1071-1077`, `:1097-1105` · carry; `traces.mjs:267` `neutralPlace` · fresco | `I23-C10 …`, (a)/(b), I23-C4 (c)/(d) | e2e+CLI+unit | A/B/C/D | carry-R26 | `agents.e2e`, `evidence.unit`, `control.cli` |
| C48 | (a)–(c) + 2º acréscimo: workflow muda só `timeout-minutes`; pwsh real | jobs 20/10/5, manual 10; pwsh 0/17 → 1 | `governance-ci:373-433`, `:444-582`, `:511`, `:565-576`; `:271-283` · carry | `governance-C48 …`, `…pwsh real…` (W), `governance-C1 C3` | workflow | A/B/D; C skip pwsh | carry-R26 | `governance-ci.test`, `.github/workflows/*` |
| C49 | job manual `lock_diagnostics` | campos exatos | `governance-ci:322-362`, `:299-304` · carry | `governance-C49 job manual…` | workflow | A/B/C/D | carry-R26 | `governance-ci.test`, workflow |
| C50 | (a)–(o): medição esquema 2 | `[2, "individual: um lock por produtor; não mede disputa entre produtores"]` | `ci-lock-latency.test:146`, `:216-219`, `:231-232`, `:397`, `:399`, `:412` · carry | 18 testes `C50 …` | unit/script | A/B/C/D, `RUNNER_TEMP` válido | carry-R26 | `scripts/ci-lock-latency*` |

Notas da tabela:
- **Contratos que não mudam** (pela leitura, nenhum arquivo deles no delta):
  - delivery 750/650 ms, report 1000 ms incluindo settle 650;
  - stdin 2000 ms, faixa 1900–6000; Hermes 5 s; 500 eventos / 8 MiB / 7 dias;
  - T8-C15 80 e T8-C16 3; CI 20/10/5, manual 10;
  - I4-C29b `< 1000 + 500 − accessMs`.
  - Nenhuma asserção ou prazo foi relaxado pelo delta lido.
- **Provas do AC2 (S19/S17)**: I4-C34g (`unit:409-411`), C34h (`:1426`, `:1504-1507`), C34i (`:1805`, `:1870-1874`), C34j, C34l G1–G7 (`:2893-3028`), C34k K1–K13 + K12h–j (`:3155-3389`, `assert.deepEqual(observed, expected)` `:3444`), C34m (`:3456-3524`), C34n (`:3553-3638`), C34o (`:3703-3795`) e CLI partial (`install.cli:1376`, `:1617-1634`).
- **Provas do AC9/S21**: os 89 testes `S21 …` (`review.test.mjs:896-1834`) e os 16 originais intactos (`:1-894`). Elas rodam em A/B/C (arquivo incluído no comando A/B do autor) e no D (`test:code-review`).

## 6. ACs (texto canônico do contexto L14–27; sem critério extra)

| AC | Checks | Delta desde R26 | Estado |
|---|---|---|---|
| AC1 executável/args/sinais/código | C1–C6, C45 | nenhum | pendente A/B/C/D |
| AC2 primeiro uso + exceção S19 | C7–C15, C38 + S19 (I4-C34g–o, CLI partial) | `run.mjs`, `install-apply.unit`, `install.cli` | pendente; texto × código sem contradição (§4.1) |
| AC3 só a sessão, capturas sucessivas 500/8 MiB | C16–C24 | nenhum | pendente |
| AC4 encerramento verificável/concorrência/consulta | C25–C35, C41–C43 | `end.e2e` (S16) | pendente |
| AC5 README/ajuda | C36–C37 | nenhum | pendente |
| AC6 harness Hermes 300 ms/settleMaxMs + gate completo com nativos | C39, C40, C44 + nativos | instalação Hermes dos nativos passa por `run.mjs` | pendente; exige D completo com nativos |
| AC7 T8-C15 | C46 | nenhum | pendente |
| AC8 I23-C10 + orçamento Windows 20 | C47, C48 | nenhum | pendente |
| AC9 medição manual + ressalvas S19/S21 | C49, C50 + S21 | 3 arquivos do core (README, review.mjs, review.test.mjs) | pendente. Texto S21 × código sem contradição (§4.2). Medição remota, CI e formal são condição de merge, não deste Verifier |

## 7. Achados pré-provas (pela leitura; nenhum é veredito)

**Bloqueantes: nenhum encontrado pela leitura.** Isto **não** é PASS.

Observações S21 (não são defeitos; nenhuma pede correção):
1. **S21-O1 — destino diretório no Windows**: se o rename de um arquivo sobre um diretório devolver EPERM no Windows (não verificado; o teste virtual usa EISDIR), as guardas ficam estáveis e o produto repete até 7× com 630 ms antes de relançar o mesmo último EPERM. Isso cabe no contrato (só EPERM, limitado, último erro original); é só espera extra num caso patológico. Local: `review.mjs:739-745`.
2. **S21-O2 — volumes sem `ino > 0n`**: no Windows a gravação do estado falha fechada com UNAVAILABLE onde antes promovia. É consequência aprovada e declarada pelo autor (builder-s21 §10), não verificada em execução. Local: `review.mjs:667-673`.
3. **S21-O3 — formato do caminho na mensagem CHANGED**: P6 guard e `dest-create` comparam `join(f.cwd, …)` com o caminho que o produto resolve por `git rev-parse --git-common-dir`. Uma forma diferente do mesmo caminho no Windows falharia por formatação, não por política. O autor declarou o risco; os gates do autor passaram (atribuído). Os meus gates mostram. Local: `review.test.mjs:1727`, `:1776-1777`.
4. **S21-O4 — sem CAS**: há uma janela TOCTOU entre a última conferência e o rename. Está declarada (`review.mjs:699-700`, README `:29`) e não é prometida.
5. **S21-O5 — custo de tempo**: P1 D6, P5/P6 permanentes e o teste 42/28 fazem esperas reais (por exemplo 3780 + 2520 ms num único teste). Nenhum prazo de teste ou job muda, e eu não fabrico teto; o D mostra a duração.

Carry e notas anteriores, preservados:
- **R1 (R27) — robustez de prova, não bloqueante**: C34k K7/K10/K11 e C34m montam a troca com `renameSync` puro (por exemplo `unit:3472`). Um EPERM natural do Windows pode produzir vermelho falso intermitente, nunca verde falso. O produto está correto.
- **O2 (R27)**: o `retryable` de `s19MoveFixtureDirectory` (`unit:3542`) repete a lista `RENAME_DENIED` em vez de importá-la.
- **N1**: o texto F1 do C46 (u) ainda diz "vermelho na importação".
- **N3**: o C46 (p) não tem RED natural.
- **N4**: o `unsure` está duplicado em `concurrency.cli`.
- **Desempenho S19 AFTER** (sem SLO): p50 subiu de 18 para 38 ms (`author-s19-r4-after/comparison-root.json:18`, `:30`).
- **Precisão**: "os 30 critérios" no Sources do checklist.

Lacunas declaradas:
- **G1**: a identidade dos blobs 8f393c5 × HEAD e o mapa do core só virão do comando A. Até lá, todo carry é condicional.
- **G2**: os arquivos fora do pack não foram relidos.
- **G3**: `feature.diff` não foi lido.
- **G4**: as causas físicas continuam DESCONHECIDAS: o D27 (stderr não retido), o EPERM do S20 (casos 18/43), a CI58 do S16, o S17, os EPERM do S18/C34h/C34i e os históricos R25/R23/CI066. Um verde não as resolve.
- **G5**: os pilotos não foram lidos nem conferidos. Não alego hash atual deles nem que os 5 arquivos do core sejam iguais à base: 3 diferem, por exceção aprovada.

## 8. Gates pendentes (escritos ANTES de qualquer execução)

- **Exatamente 4 comandos** que o Root liberar nesta mesma sessão, depois de conferir a ReadExact e este relatório revisado.
  - Uma vez cada, sequenciais, em primeiro plano, sem `run_in_background` e sem repetição.
  - Paro na primeira falha, omissão ou intervenção e preservo nome, motivo e números.
- **A** precisa trazer a comparação de identidade de **todos** os arquivos de `src tests scripts .github package*`, 8f393c5 × HEAD. O carry só vale se mudaram exatamente **7** arquivos:
  - os 4 S19/S16: `src/integrations/install/run.mjs`, `tests/integrations/install-apply.unit.test.mjs`, `tests/integrations/install.cli.test.mjs`, `tests/integrations/launch/end.e2e.test.mjs`;
  - os 3 core S21: `scripts/code-review/README.md`, `review.mjs`, `review.test.mjs`.

  O mapa do core, contra a base 636, precisa ser:
  - README `25e52841` → `89869e47`;
  - review.mjs `1bda8e45` → `eb6b927c`;
  - review.test.mjs `216125ce` → `3b6b4540`;
  - cli.mjs `c6a4abcd` e schema.json `b02001e2` iguais.

  Os blobs vêm de `product-approved-core-root.json` e devem ser confirmados pelo A. Qualquer outro delta derruba o carry, e o check afetado vira re-análise.
- **B**, **C** e **D**: o D é o `npm test` completo, com motor, governança, doctor e integrações, incluindo os nativos Hermes, o I4-C35 e o I23-C8 pelo Python do sistema.
- Os números do autor (767/754/0/13, …, 1184/1164/0/20) são só referência, não expectativa minha.

## 9. Processo, histórico e incidentes (preservados, sem reclassificar)

- **Meu processo nesta fase**: Read, Glob e Edit deste `report.md`. Nenhum Bash, PowerShell, Write, Agent, Task, rede, agente real, teste, sonda, commit, push, CI, formal ou merge. Nenhuma edição em fonte, produto, teste, config ou `.verified`. Ao fim, **0 processos em segundo plano**. **Incidentes meus: nenhum.**
- **Incidente S14**: o `Temp\x` global PREEXISTENTE foi sobrescrito, SEM cópia conhecida e com impacto desconhecido. **Não li, toquei, removi nem restaurei.** Não toquei em nenhum TEMP global nem no `/tmp`.
- **Preservados como registrados**:
  - R27 FAIL 0/50, 0/9: A/B/C 662/649/0/13, 662/649/0/13, 662/640/0/22; D 43/42/1, término natural 1, C11 ready com TypeError `attempts[0]` ausente, doctor e integrações NÃO executados no D (os nativos passaram em A/B). Os parciais da R27 não viram PASS;
  - S16 D e S17 A FAIL; omissões B/C/D do S17;
  - S19 A em `c94cdab` FAIL; B R2 FAIL; R3 A em `8b690bd` FAIL; REDm 1/0/1;
  - S20 BEFORE (B 98 + 2 EPERM); AFTER_A inválido por âncoras duplicadas (AFTER_B não iniciado) e AFTER r1 100/100×2 (Root/autor, atribuído);
  - formais e independentes consumidos; FAIL 23/24/25; CI 066; cancelada 40814471097; incidentes S13/S14/S15.
- **Não existe final25 nem D25**, e não os invento.
- **Auditoria 28** é do Root e fecha só depois do D28 real. Baseline FINAL27 parcial de 30 Out 13:39:20 UTC, 12113 caminhos, incluindo S20/S21. É só metadado WSL com alvo string.
  - NativeEdit e controladores fixos **não são sandbox do SO**, e o TEMP não remapeia o `/tmp` absoluto.
  - Não alego conteúdo, Windows, PowerShell, rede, TEMP, proveniência nem impacto zero.
  - O resume amplo foi recusado pelo auto-review antes de iniciar.
- **Autoria**: não sou autor S19/S20/S21, nem Verifier R26/R27, nem revisor formal. O autor da S21 não pode ser o Verifier.
