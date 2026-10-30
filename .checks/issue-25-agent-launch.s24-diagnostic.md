# S24 — diagnóstico inicial de leitura, não é correção nem PASS

Relatório literal do Claude94a95e95, após Source141454/150000tokens estimados e runtime29093separados. Root leu o relatório inteiro18560bytes e conferiu recebimento exato das4959partes de fontes/vistas e763partes runtime; views de3arquivos/logs não são leitura integral dos originais. CLI0, sem Sourceedição/testes/background.

Qualificação do Root: tempos de APIs assíncronas de E/S são observados; não identificam hardware, antivírus, Node ou causa física. A ausência de defeito demonstrado pela leitura não prova ausência de qualquer otimização válida. PropostasE1/E2/R4 ainda não foram implementadas/executadas e não alteram a barra. Fonte vinculante .tasks/issue-25-ci34b-diagnostic-plan.md; S23imagemmacOS aguarda decisão específica, rodadas necessárias já autorizadas.

Depois desta leitura houve UMA observação limitada emrunnerWindowsnovo do PR, mesmo34b/Node24.13/workflow/testes/prazos/contagens/concorrência: tentativa2job124272776190 passou27/27,105/105,417/410/0/7,642/618/0/24;1191/1160/0/31total/cancel0. C32/C34/C6/C10 passaram por nome, sem patch. A tentativa1 com4falhas e a manual com1 continuam preservadas; este verde não identifica suas causas nem garante ausência futura. Uma recuperação limitada do Windowsmanual foi acionada depois; está emcurso e não é declarada verde aqui. Não se pediu novamente a medição, já4500/4500/zeroerros no mesmo34b. Nada disso libera merge com macOScancelado.

O relatório do autor abaixo antecede essas observações de runner; suas recomendações de decisão são propostas de diagnóstico, não autorização nova nem alteração de contrato.

---

# S24 diagnóstico inicial — HEAD f2ef864 (provas 34b808977), somente leitura

Veredito: nenhuma das cinco falhas demonstra defeito de código de produto. Três (C6, C10, C43 manual) são estouros de prazo físicos observados: uma operação de E/S isolada consumiu a tentativa de 650 ms, e o resultado é o previsto pelo contrato. Duas (C32, C34) têm observação insuficiente; a classe provável é a mesma, mas isso foi inferido e não observado. Não há erro de arranjo comprovado nem teste que contradiga o contrato. Nenhuma alavanca autorizada (retry, tolerância, prazo, durabilidade, concorrência) resolve o estouro físico: é decisão do proprietário. Antes de qualquer código, proponho só observação mínima para C32/C34, reaproveitando os seams existentes.

Status desta etapa: 0 edições em Source/teste/workflow/core/config, 0 execuções, 0 processos em segundo plano, 0 agentes. Não há PASS. Edição: só este relatório. Incidente S14: `C:\Users\paulo\AppData\Local\Temp\x` não foi lido nem tocado; o impacto continua desconhecido. S23/macOS não foi tratado.

## Leitura e orçamento (estimativa chars/2,5, não tokenizer)

- Source: os 34 pares exatos do plano (1–4959), 124.921 estimados, mais o prefixo do Read nativo (cerca de 4.959 linhas × 6 caracteres, ≈ 12k), somando ≈ 137k, abaixo de 150k. Plano e índice: ≈ 5k. As vistas parciais são vistas: end.e2e [1–59, 270–454, 780–985], store [1–593, 681–785, 902–1428] e agents.e2e [1–137, 209–380]. Não afirmo ter lido esses arquivos inteiros nem a task/checklist original 50/9.
- Runtime, contado à parte: 6 pares (1–763), 76.366 caracteres, ≈ 31k mais prefixo ≈ 2k. Vistas literais: log PR 1–100 + 1450–1654, log manual 1–80 + 1427–1496 e a validation.json inteira. Não são os logs inteiros; os brutos ficaram com o Root.
- Leitura extra: este report.md (1 linha). Nenhum Grep, Glob, Bash ou rede.
- Leitura futura necessária e ainda não lida (pedir ao Root): `tests/integrations/fixtures/launch/fake-agent.mjs`, para saber como o passo `hook` herda o env, se registra o relatório e se espera o hook; `src/integrations/observe/command.mjs#patiently`, para orçamento e intervalo; `tests/integrations/helpers/cli.mjs#makeScratch/baseEnv`.

## Mecanismo comum (fontes)

- Prazo: `traces/delivery.mjs:12-18`, com 750 − 100 = `ATTEMPT_MS` 650, contado da leitura da entrada (`observe/delivery.mjs:130`). Em `untilDeadline` (`traces/delivery.mjs:72-104`), a tentativa em curso no prazo é abandonada. Com o lock, sai `delivery_timeout`. Sem lock e sem tentativa anterior, sai o código inicial `delivery_timeout` (L73/L99). Só o EEXIST vira `lock_present` e repete a cada 10 ms (L100-102). A confirmação inclui a liberação do lock (`store.mjs:283-305`, `holdLockFile`; `releaseLockFile` em 221-269). Commit no disco sem confirmação no prazo é "confirmação incerta", contado em `lost` (`traces/delivery.mjs:56-62`, 122-123).
- Flush: cada `writeExclusive` durável faz `sync` (`fs.mjs:38-46`), e só o lock usa `durable:false`. Uma gravação automática ou da execução faz sync do segmento e do state (`store.mjs:732-779`). A sucessão soma key + state (`createCapture`, 470-494) + ponteiro (`writeLaunchFile`, 1139-1149) + observe.json na rota automática.
- Abandono: o `process.exit` do CLI encerra a tentativa abandonada (cabeçalho de `traces-probe.mjs:52-54`). Sob o lock, o lock fica, como o próprio controle I25-C43 "disco parado" afirma (`end.e2e:901-903`). `createCapture` não limpa a pasta criada antes do `state.json` (`store.mjs:475-492`).

## Falha 1 — I25-C32 primeira criação do store (`end.e2e:404`, assert `:444`)

- Predicado: as duas invocações saem 0, cada uma com uma captura `stopped` e `persisted` 1, o próprio toolUseId pseudonimizado e o resumo "eventos gravados: 1" (`:440-451`).
- Observado: `a` deu `[[], "stopped", 0]` (R1480-1481). As linhas `:438-443` passaram para A: B encontrou o lock antes de terminar, A saiu com 0 e o probe de A existe (o agente falso de A iniciou). A evidência diz "nenhum produtor registrado" (R1474).
- Inferido: a evidência comum não cobre esta prova por construção. O launcher roda no processo da prova com `io` próprio, e o hook nasce do agente falso, outro processo em que `recording` é null (`producer-runs.mjs:16-18, 45-46`). O hook de A gravou 0, então a entrega dele foi perdida ou não ocorreu.
- Desconhecido: o código da entrega de A (`lock_present`, `delivery_timeout` ou `io_failure`); se o hook rodou e quando; o resultado de B, porque a asserção parou em `a`; o stderr de A depois do resumo.
- Hipóteses discrimináveis: H1a, `lock_present` porque B segurou o lock por mais de 650 ms durante o `startLaunch` dele (3–4 syncs num store novo) ou durante o próprio hook. H1b, `delivery_timeout` por sync do segmento ou do state de A sob o lock, como em C6. H1c, o hook não rodou ou saiu antes.
- Classe: observação insuficiente; a classe física provável está só inferida.
- Teste: não contradiz o contrato. Com E/S saudável, a criação concorrente cabe no prazo.

## Falha 2 — I25-C34 ordem do relatório (`report.cli:120`, falha em `:153` via `helpers/launch.mjs:275`)

- Predicado: depois de a antiga terminar, as capturas das duas execuções são legíveis e a mais nova por createdAt é o segmento 2 da antiga (`:153-155`). O leitor estrito `launchCapturesOnDisk` lança em pasta sem state.json, o que é intencional (`end.e2e:391`).
- Observado (R1488-1508): a pasta `0226a199…` não tinha `state.json`. Os 4 marcadores até `antiga-2` foram vistos. As linhas legíveis são a nova seg1 (active, persisted 1) e a antiga seg1 (stopped, persisted 1). Não há linha legível para a seg2 da antiga. As duas execuções saíram com status 0, e o encerramento das duas falhou com `lock_present`. Os encerramentos ocorreram em momentos distintos: o da antiga antes de `:153`, e o da nova depois de a coleta gravar `nova-fim`.
- Inferido:
  - `0226a…` é a sucessora da antiga, criada pelo hook `antiga-2` e parada entre `mkdir` e o rename do state (`createCapture`). Por isso o ponteiro ainda apontava a seg1: `a2495182…` no stderr é a seg1, via `peekLaunch` ou `fallbackCapture` (`command.mjs:103-118`).
  - O `lock_present` persistente nos dois encerramentos, separados no tempo, combina com um lock deixado por um hook abandonado sob o lock (process.exit no prazo), como no controle "disco parado".
  - A alternativa "falha de E/S na key com o lock liberado" deixaria a mesma pasta parcial, mas encerramentos bem-sucedidos. Ela fica menos compatível, mas não está excluída sem o orçamento de `patiently`.
- Desconhecido: o lock no momento da coleta e o pid dele; o conteúdo da pasta parcial (só key? key + state.tmp?); o código e os tempos do hook `antiga-2`; se o agente falso espera o hook.
- Estado legítimo × falha correta: uma pasta sem state.json é legítima só enquanto a criação está em curso sob o lock. Em `:153` a antiga já terminou e a nova está parada na barreira, sem produtor em voo. Uma pasta parcial ali é resíduo de tentativa abandonada ou falha, e o teste falha corretamente. Não proponho tornar o leitor tolerante. Falta a mensagem dizer a causa (lock, hook) em vez de só ENOENT.
- Classe: observação insuficiente, com causa provável no mesmo estouro físico sob o lock, inferido.

## Falha 3 — I23-C6 Claude com on (`agents.e2e:103`, assert `:116`, subagent_start)

- Predicado: cada hook entrega `DELIVERED_AUTO(1)`.
- Observado (R1562-1565): o produtor 11 deu `delivery_timeout` com 1/0/0/1. Foram 122 operações (as saudáveis têm 129). `sync segmento.tmp` levou 605 ms, e o sync total foi 634 ms. A última operação concluída foi `stat lock.retirado` (fora do lock) e `read lock.retirado` ficou pendente na saída. CPU 31 ms, laço máximo 24,6 ms. A raiz tinha 9 + 2 = 11 registros, lock ausente, 0 temporários.
- Inferido:
  - Como 10 produtores confirmaram 1 cada e o disco tem 11, o commit do 11º ocorreu e o ack não saiu no prazo. O rename do lock também saiu, porque a operação pendente é posterior a ele no `releaseLockFile`.
  - É "confirmação incerta" conforme o contrato.
  - CPU e laço baixos com uma única operação de 605 ms indicam um processo esperando o SO. Isso não diz se a causa é disco, antivírus ou Node.
- Desconhecido: o instante da leitura da entrada (a linha não registra, `traces.mjs:177-178`) e, portanto, a folga exata no commit.
- Classe: E/S real estourando o prazo legitimamente, observado. Não há defeito evitável: tirar sync, mudar a confirmação ou mudar o prazo é proibido.

## Falha 4 — I23-C10 sessões simultâneas (`agents.e2e:319`, assert `:316` chamada em `:331`)

- Predicado: em cada rodada simultânea, os três produtores entregam `DELIVERED_AUTO(1)`.
- Observado (R1632-1641):
  - Rodada 3 = produtores 10–12; a rodada 2 (7–9) passou com 3x/1x EEXIST.
  - Produtor 10, "claude A 3": `delivery_timeout`, 675 ms. Sync 346 ms (segmento 332), realpath 233 ms, open 60 ms. A última concluída foi `close lock` (2ª tomada) e `rename lock` (2ª tomada) ficou pendente na saída.
  - Produtores 11 e 12: `lock_present`, com 22 e 24 EEXIST, ≈ 650 ms disputando. O 11 também gastou 113 + 119 ms na liberação da 1ª tomada.
  - Raiz: 4/3/3 registros, lock ausente.
- Inferido: depois das rodadas 0–2 seria 3/3/3, então o 4 é o commit do A3 sem ack. Os contendores perderam corretamente pelo contrato, porque o prazo se foi disputando. O lock saiu depois da saída do processo, pelo rename já submetido. Isso é inferido: só a ausência posterior foi observada.
- Desconhecido: qual dos realpath (`resolveRoot`/`assertUnchanged`, `store.mjs:95-104/175-183`) levou os 233 ms.
- Classe: E/S real estourando o prazo no detentor, observado; as perdas dos contendores são consequência contratual. Realpath e sync são validação de integridade e durabilidade e não podem sair.

## Falha 5 — I25-C43 controle do laço parado (manual, `end.e2e:909`, `:911` → `assertFinalHookLost:871`)

- Predicado: o arranjo `c43TransientOpening` exige que, com o lock mantido, o hook da outra execução receba `lock_present` (`:841`). Só depois vem a recuperação e o último hook com `BLOCK_LOOP 1|900`.
- Observado (R1446-1495):
  - `failure.actual/expected/operator` = `delivery_timeout`/`lock_present`/`strictEqual`. Quem falhou foi o assert de `:841`, não o último hook.
  - Um único produtor registrado, com 3 operações. O `realpath` da pasta levou 643 ms. `lstat store.json` ficou pendente na saída, ainda fora do lock. CPU 0 ms, laço máximo 24,9 ms.
  - A raiz tinha o lock presente, de outro processo (o lock mantido pela abertura em processo).
- Inferido: a tentativa nunca chegou à tomada. Sem tentativa anterior, o contrato dá `delivery_timeout`, não `lock_present` (`traces/delivery.mjs:73, 99`). O controle final (`BLOCK_LOOP`) não executou: não afirmo que tenha rodado.
- Teste: a asserção `:841` está correta pelo contrato sob E/S saudável. Ela é mais estrita que o invariante "não grava", mas não o contradiz, e o C43 natural (`:848`) tem a mesma exposição. Não proponho mudá-la.
- Classe: E/S real estourando o prazo no arranjo, observado. O controle de diagnóstico ficou inconclusivo, e isso não é erro do controle.

## Medição 41111491159

A medição foi válida: 4500/4500, 0 erros, 10 métricas × 1500 por fase. Ela mede o lock com `durable:false` em namespace individual, sem fsync e sem o pipeline. As provas rodam em `D:\a\_temp` (O, R1488). A fase B no D: não teve ocorrências ≥ 600 ms, mas, na suíte, o mesmo D: teve `mkdtemp lock.reserva` de 536 ms (C6 p7). As condições não são comparáveis (concorrência da suíte, fsync, metadados), então a medição não confirma nem refuta as falhas. O pico de 6173 ms em A1 fica no C: e não se transfere.

## Tabela de classes

| Falha | Erro de arranjo/teste | Observação insuficiente | E/S real estoura prazo | Defeito evitável |
|---|---|---|---|---|
| C32 | não demonstrado | **sim** (sem produtor registrado) | provável (I) | não demonstrado |
| C34 | não; falha correta | **sim** (sem lock/hook) | provável (I) | não demonstrado* |
| C6 | não | não para classificar | **sim** (O) | não |
| C10 | não | não para classificar | **sim** (O) | não |
| C43 manual | não; arranjo exposto ao prazo | não | **sim** (O) | não |

\* Achado fora do escopo, a conferir no Landing antes de qualquer decisão. Um hook abandonado durante a sucessão deixa uma pasta sem state.json que o produto nunca limpa (`createCapture`). Pelo desenho, ela faz `latestLaunch`/report falhar com `capture_invalid` (`store.mjs:1385-1386`). Também pode deixar um lock sem orientação de remoção para o usuário: `sayLockLeft` só cobre o lock do próprio launcher. Não proponho correção aqui.

## Propostas (nada executado; Landing literal antes do código e revisão do Root)

### E1 — evidência dos hooks no C32 (observação)

- Ownership: `tests/integrations/launch/end.e2e.test.mjs`, só a prova `:404`; em `helpers/traces.mjs`, uma exportação.
- Assinatura: `export function describeTimingFile(file): string`, que nunca lança. Reusa `timingLines` + `lineTrace(line, {lines:1, ...NEUTRAL})` + `describeProducerTrace`, como o `treeOf` interno faz, com um processo por linha (o agente falso e o hook).
- Na prova: `env` de cada launch recebe `...timedEnv(f(\`tempos-${name}.ndjson\`))`. A asserção `:444` fica idêntica; só a mensagem ganha a evidência, calculada apenas quando o valor diverge (padrão de `assertStepDelivered`, `agents.e2e:313-317`).
- Sem logger novo e sem preload duplicado.
- Landing: "Evidência dos hooks do C32 criação". Alternativa rejeitada: registrar produtores dentro do agente falso, que mudaria a fixture e a dependência leve de `producer-runs`.

### E2 — diagnóstico do `withOverlappingRuns` (observação, C34 e C32 sobrepostas)

- Ownership: `tests/integrations/helpers/launch.mjs:214-257`, mais a exportação de `lockEvidence` em `helpers/traces.mjs`.
- Assinatura: `withOverlappingRuns({ root, work, runs, probes, markers, timings = {} }, body)`. A coleta ganha:
  - `lock`: presente/ausente, dono por pid entre as linhas de `timings`, e "outro processo".
  - Em cada linha `["indisponível", código]`, um 3º elemento com os tipos (`fileKind`) das entradas da pasta, sem nomes.
  - `hooks`: `describeTimingFile` de cada arquivo de `timings`.
- A prova C34 passa `timedEnv` nas aberturas em processo (`launchWithClock`).
- Compatibilidade: a prova `end.e2e:348-396` usa `row.slice(0,4)` e compara campos um a um, então não muda.

### Controles RED (antes de considerar E1/E2 prontos)

| ID | Input | Esperado | Errado plausível antigo |
|---|---|---|---|
| R1 | Arranjo C32 criação com `SKILL_ME_TEST_TRACES_SEGMENT_EIO:"1"` só no env de A | `:444` continua falhando com `[[], "stopped", 0]` em `a`; a mensagem traz `rename segmento.tmp EIO (sob o lock, 1ª tomada)` da linha do hook de A | "nenhum produtor registrado" ou "sem linha da pré-carga", e o controle falha na conferência da evidência |
| R2 | Arranjo C32 criação sem injeção | Passa sem calcular evidência (nenhuma chamada de CLI a mais) | A evidência calculada no caminho saudável |
| R3 | Variante "captura em construção" existente (`end.e2e:343-396`) com E2 | Os asserts atuais iguais, mais `seen.lock` = ausente e o 3º elemento = `[]` (pasta vazia) | E2 lança na coleta e mascara o erro original (o caso do Verifier 10) |
| R4 (opcional, reprodutor de forma) | `createLaunchDelivery` em processo, com io pausado no `writeExclusive` da `key` da sucessora, liberado no fim pela prova | `delivery_timeout`; pasta sem state.json; `launchCapturesOnDisk` lança ENOENT; `endLaunch` dá `lock_present` enquanto pausado | Variante R4b, `key` com EIO: `io_failure`, lock ausente, `endLaunch` ok, pasta parcial. Discrimina as duas formas do histórico do C34 |

- Para R1 e R2, a rotina vira `c32Creation(prepared, label, envOf)` com as mesmas asserções, como `c43TransientOpening`, e o controle segue `transientFailure`/`assertFinalHookLost`.
- R4 generaliza `markerPausedIo` em `pausedIo(matches)` sem mudar o uso atual. Só entra se o Root aceitar adicionar a prova; não cria injeção nova na pré-carga.
- Erros de ligação e setup a evitar: o env do hook só recebe a injeção se o agente falso herdar o env (ler `fake-agent.mjs` antes). `timedEnv` sobrescreve `NODE_OPTIONS`, então é preciso conferir que `prepared.env` não traz nenhum. `lineTrace`, `NEUTRAL` e `lockEvidence` hoje são internos: exportar com Landing, sem cópia. Nenhum controle pode passar por TypeError (`report` ausente, `undefined.env`), e cada um deve conferir o tipo do erro antes da mensagem, como `assertFinalHookLost:869-870`.

### C6, C10 e C43 — nada a codificar

A evidência existente já discrimina a classe: uma operação ≥ 233–643 ms, laço ≤ 25 ms e CPU ≤ 62 ms. Os controles existentes (`end.e2e:886-914`) já provam as classes da evidência. Decisão do proprietário: como tratar estouros físicos de 650 ms no runner Windows sem retry, tolerância, prazo, durabilidade ou concorrência novos. Repetir até ficar verde não é opção.

Observação opcional, só se ajudar a decisão: o instante absoluto da operação mais lenta (`startedAt + at`) em `describeDiskOps`. Ela separaria um travamento simultâneo em vários processos (C10 começou com 3 processos dentro de 10 ms) de uma operação local. Ganho de decisão baixo; não proponho por padrão.

## Condições comparáveis e dados ainda necessários

- Mesmo HEAD, hashes e runtime (Node 24.13.0 da CI), raízes próprias em scratch, sem shell amplo, rede ou agentes reais. Prazos, contagens e concorrência intactos.
- Dados para fechar C32/C34: código e linha de tempo dos hooks, lock e pid na coleta, tipos na pasta parcial. Saem de E1/E2 numa próxima execução já exigida pelos gates, não de repetição para pescar.

## Estimativa para a próxima etapa

- Source a ler: `fake-agent.mjs`, `observe/command.mjs` (patiently) e `helpers/cli.mjs`. Ordem de 10–20k mais o diff próprio.
- Edição: cerca de 3 arquivos de teste ou apoio (end.e2e, helpers/launch, helpers/traces), mais Landing.
- Runtime local: as provas `end.e2e` C32 (4) + R1/R2/R3 (+ R4) e `report.cli` C34, cada uma em segundos, sem carga nova.
- Provas afetadas a rodar depois: os arquivos `end.e2e`, `report.cli` e `agents.e2e` inteiros, mais os consumidores de `helpers/traces.mjs`.
