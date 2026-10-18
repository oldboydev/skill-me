# Issue #8 — verificação independente dos traces locais

**Veredito atual: PASS — 21/21 checks comprovados para o gate pré-PR.**
**Perfil:** `light` · **rodada:** 3, scoped e final · **HEAD:** `06c845ebd9cd736383d770884e56e70623400b65` · **base:** `d7fe3ef` · **correção desta rodada:** `dc8c0fe..06c845e` · **Verifier:** subagente independente, distinto do autor Claude.

## Rodada 3 — 06c845e

Reexecutei **em uma invocação** `node --test tests/integrations/traces/*.test.mjs` no HEAD: exit 0, **24 testes, 23 pass, 0 fail, 1 skip** (prova de sinal POSIX de C4 em Windows). `npm test` no mesmo HEAD: exit 0; governança **6/6**, code-review **16/16**, doctor **417** (410 pass, 7 skip) e integrações **227** (220 pass, 7 skip). Nenhum teste desse lote foi contado apenas pelo código de saída. Li a seção “Rodada de correção 2 — C6” do build, mas o veredito se apoia nessas execuções independentes e nas asserções inspecionadas.

O diff `dc8c0fe..06c845e` altera apenas `.checks/issue-8-traces.build.md` e `tests/integrations/traces/live-capture.cli.test.mjs`. No teste, C6 cria cópias do stderr nativo fora das árvores cuja integridade verifica (`:303–305`); percorre oito variantes (`:306–315`); exige saída neutra dos três hooks, código de entrega e nenhuma captura escolhida (`:321–331`); exige código 17, sinal nulo, stdout integral e `stderrBytes` **idêntico byte a byte** à cópia gravada pelo próprio filho (`:333–340`, helper `:196–199`); e compara as árvores e os contadores antes/depois (`:341–345`). A igualdade cobre prefixos, sufixos e bytes intermediários para vínculo ausente, parcial, inválido, inexistente ou encerrado. A mutação de prefixo exclusivamente em `binding_invalid` relatada pelo builder passou no teste antigo e falhou no novo; a mutação não foi executada pelo Verifier, e a prova própria é a asserção e a execução no HEAD. Não houve alteração de produto, helper ou fixture nesta rodada; `git diff --check dc8c0fe..HEAD` passou.

| Check | Evidência no HEAD e carry-forward | Veredito |
| --- | --- | --- |
| C1 | `live-capture.cli.test.mjs:104,107–110,128`: incremento exato, versão/origem/sinal e nenhum canário no disco. Asserções inalteradas nesta rodada; teste reexecutado. | PASS |
| C2 | `live-capture.cli.test.mjs:139–150,153`: exit 0, incremento exato e origem Codex. Inalterado; reexecutado. | PASS |
| C3 | `live-capture.cli.test.mjs:164–174,185–188`: Hermes persiste o total e observa `capture_not_active` após stop sem interferir no agente. Inalterado; reexecutado. | PASS |
| C4 | `live-capture.cli.test.mjs:196–199,224–226,240–251`: stderr nativo integral, código/sinal/stdout e ausência de duplicidade wrapper/hook. Inalterado; reexecutado, com skip POSIX declarado. | PASS |
| C5 | `live-capture.cli.test.mjs:285–288`: pseudônimo estável na captura e distinto em outra. Inalterado; reexecutado. | PASS |
| C6 | `live-capture.cli.test.mjs:306–345`, sobretudo `:335–338` e `:196–199`: oito variantes, neutralidade, código/sinal/stdout, stderr byte a byte, nenhuma escrita. Corrigido nesta rodada; reexecutado. | PASS |
| C7 | `live-capture.cli.test.mjs:371–390`: razões distintas, apenas três registros válidos e contadores exatos. Inalterado; reexecutado. | PASS |
| C8 | `live-capture.cli.test.mjs:419–425,428–433`: conteúdo opt-in comparado ao ingest, canários ausentes. Inalterado; reexecutado. | PASS |
| C9 | `query.cli.test.mjs:73–86`: página até 100, ordenação e cursor sem repetição. Arquivo e produto inalterados desde a rodada 2; reexecutado. | PASS |
| C10 | `query.cli.test.mjs:103–107,111–148`: estados, limites e contadores, raízes/estados inválidos e códigos de erro. Inalterado; reexecutado. | PASS |
| C11 | `query.cli.test.mjs:195–200`: export usa os dados sanitizados existentes. Inalterado; reexecutado. | PASS |
| C12 | `follow.cli.test.mjs:56–79`: espera, dois appends em ordem uma vez cada e `end` após stop/disable. Inalterado; reexecutado. | PASS |
| C13 | `follow.cli.test.mjs:93–123`: exclusão durante follow e saída sem vazamento. Inalterado; reexecutado. | PASS |
| C14 | `query.cli.test.mjs:229–273`: stop/disable recusam ingest tardio, delete/prune preservam ativa e itens alheios, e produtores não ressuscitam capturas excluídas. Inalterado; reexecutado. | PASS |
| C15 | `concurrency.cli.test.mjs:76–85,106–110`: entregas concorrentes e conflito. Inalterado; reexecutado. | PASS |
| C16 | `concurrency.cli.test.mjs:229–265,270–321,341–389`: diagnóstico observável por hooks reais e wrapper, falha de E/S, silêncio no sucesso, timeout/lock, formatos e exclusão de links/FIFO quando disponíveis. Inalterado; três testes reexecutados. | PASS |
| C17 | `limits.cli.test.mjs:58–119`: 500 eventos, 8 MiB, 64 KiB/linha, 1 MiB/2 s de hook no limite e acima. Inalterado; reexecutado. | PASS |
| C18 | `replay.unit.test.mjs:55–94`: replay só com registros sanitizados. Inalterado; reexecutado. | PASS |
| C19 | `demo.e2e.test.mjs:68–103`: demonstração local do ciclo e distinção entre fixture e execução nativa. Inalterado; reexecutado. | PASS |
| C20 | `docs.test.mjs:130–157,171–184`: configuração nas duas shells, campos e exemplo de diagnóstico exercitado com hook real. Inalterado; dois testes reexecutados. | PASS |
| C21 | `.github/workflows/governance.yml:40–50` configura Ubuntu/Windows/macOS; Windows foi executado nesta rodada; o build registra WSL Ubuntu em `0c108ee` com o mesmo produto, mas antes da nova asserção C6. Os cinco arquivos comuns do core de revisão continuam sem diff contra `origin/main`. macOS aguarda CI do PR, conforme ordem de `AGENTS.md`. | PASS para gate pré-PR |

**Limites da conclusão.** A nova asserção C6 foi executada no Windows, não no WSL; o teste de sinal POSIX só rodou no WSL anterior. macOS não foi executado. A ordem de governança exige Verifier e revisão `ready` antes de push/PR, e a matriz macOS só executa depois de abrir o PR; CI é informativa para merge. `SKILL_ME_CAPTURE_REPORT` é um arquivo opcional de diagnóstico por caminho explícito, append-only e sem teto automático (`docs/traces.md:199–208`); falhas repetidas, inclusive hooks após stop, podem fazê-lo crescer até exclusão manual. Isto é um limite operacional declarado, mas não contradiz C17/critério 10, que conservam os tetos da **captura** e dos **inputs** da #5; não o conto como falha do gate. O perfil `light` omite comparação formal de UI, `Coverage`, `Test policy` e fault injection; não havia fonte de UI vinculante no checklist. O histórico das duas rodadas abaixo não substitui este veredito.

## Histórico — rodada 2 em dc8c0fe

As provas C1–C20 foram reexecutadas **em uma invocação** `node --test tests/integrations/traces/*.test.mjs` no HEAD: **24 testes, 23 pass, 0 fail, 1 skip** (C4 sinal POSIX no Windows). `npm test` no mesmo HEAD: exit 0; governança **6/6**, code-review **16/16**, doctor **417** (410 pass, 7 skip), integrações **227** (220 pass, 7 skip). Li a seção “Rodada de correção 1” de `.checks/issue-8-traces.build.md`; as execuções acima são minhas, não inferidas dela. O diff `0c108ee..dc8c0fe` contém somente o registro de build, logo o `npm test` WSL Ubuntu documentado em `0c108ee` abrange o mesmo produto e testes deste HEAD. Os cinco arquivos do core de revisão seguem sem diff contra `origin/main`.

### Checks da correção e do seu raio de impacto

| Check | Evidência em dc8c0fe | Resultado |
| --- | --- | --- |
| C1 | `tests/integrations/traces/live-capture.cli.test.mjs:104,107–110,128`: incremento exato, v1/origem/sinal e nenhum canário no disco; teste passou. Citação atualizada, antes verificada em `53d5e99`. | PASS |
| C2 | `live-capture.cli.test.mjs:139–150,153`: saída 0, incremento exato e origem Codex; teste passou. Citação atualizada. | PASS |
| C3 | `live-capture.cli.test.mjs:164–174,185–188`: Hermes persiste o total e mantém exit 0 mesmo com captura encerrada; teste passou. Citação atualizada. | PASS |
| C4 | `live-capture.cli.test.mjs:198–199` agora afirma `assert.deepEqual(run.stderrBytes, native)` contra bytes copiados pelo filho; `:224–226` afirma exit 17, sinal null e stdout inteiro; `:240–251` afirma exec uma vez e hook uma vez ou nenhum nos dois cenários. Teste passou; sinal POSIX foi skip justificado no Windows e constou como executado no WSL do build. | PASS |
| C5 | `live-capture.cli.test.mjs:285–288`: mesmo pseudônimo entre processos e diferente na outra captura; teste passou. Citação atualizada. | PASS |
| C6 | `live-capture.cli.test.mjs:325–339`: neutralidade dos hooks e ausência de escrita são provadas, mas `:334` ainda só afirma `wrapped.stderr.endsWith("stderr do filho\n")` para vínculo ausente/inválido. C4 novo e C16 novo comparam stderr inteiro apenas com vínculo válido. Um prefixo do debugger emitido exclusivamente no ramo `binding_invalid` passa todas essas provas, embora o critério 3 exija preservar o stderr do filho. `binding.mjs` foi tocado nesta correção, portanto C6 foi reavaliado no raio de impacto. | **FAIL — asserção insuficiente** |
| C7 | `live-capture.cli.test.mjs:371–390`: motivos distintos e só os três registros válidos, com contadores exatos; teste passou. Citação atualizada. | PASS |
| C8 | `live-capture.cli.test.mjs:419–425,428–433`: conteúdo opt-in comparado ao ingest e canários ausentes; teste passou. Citação atualizada. | PASS |
| C15 | `tests/integrations/traces/concurrency.cli.test.mjs:76–85,106–110`: entregas concorrentes e conflito; teste passou. A prova mudou só de posição no arquivo tocado por C16; citação atualizada. | PASS |
| C16 | `concurrency.cli.test.mjs:229–265` executa hooks instalados, ingest e wrapper **sem fd de fixture**, lê uma linha NDJSON exata por produtor e quatro linhas concorrentes; `:270–283` confirma falha de E/S real e que sucesso não escreve; `:285–321` cobre par inválido, sem vínculo, caminho relativo, arquivo impossível, captura encerrada e ausência de vazamento; `:341–389` cobre forma, append, pasta, link/FIFO quando disponíveis. Os três testes C16 passaram; `src/integrations/observation.mjs:116–123` publica após `settle`. | PASS |
| C20 | `tests/integrations/traces/docs.test.mjs:130–157` confere configuração/leitura nas duas shells e a tabela de campos; `:171–184` segue o guia com hook real sem fd de fixture e compara a linha escrita com o exemplo. Dois testes C20 passaram. | PASS |

**Carried forward de `53d5e99`, após reexecução integral no novo HEAD:** C9 (`query.cli.test.mjs:73–86`), C10 (`:103–107,111–148`), C11 (`:195–200`), C12 (`follow.cli.test.mjs:56–79`), C13 (`:93–123`), C14 (`query.cli.test.mjs:229–273`), C17 (`limits.cli.test.mjs:69–119`), C18 (`replay.unit.test.mjs:55–94`) e C19 (`demo.e2e.test.mjs:68–103`) permanecem **PASS**. Produto e arquivos de prova dessas decisões não mudaram em `53d5e99..dc8c0fe`; cada teste foi executado e passou no lote de 24. C1–C3, C5, C7–C8 e C15 foram reavaliados acima porque seus arquivos de prova mudaram ou compartilham a nova fronteira.

### C21 e governança temporal

**PASS para o gate pré-PR, com limite declarado.** `.github/workflows/governance.yml:40–50` configura a matriz Ubuntu/Windows/macOS; executei o lote T8 e `npm test` no Windows em `dc8c0fe`. O build documenta `npm test` no WSL Ubuntu em `0c108ee`, cuja única diferença até este HEAD é o arquivo de evidências. `git diff origin/main --` os cinco arquivos do core é vazio. **macOS não foi executado** nesta verificação. `AGENTS.md` e `scripts/code-review/README.md` colocam Verifier e revisão `ready` antes de push/PR; a CI macOS só pode rodar após abrir o PR e é informativa para merge. Interpretar C21 como execução macOS obrigatória antes do PR cria um impasse com essa ordem. Para este gate, a matriz configurada e as provas locais Windows/WSL satisfazem C21; o resultado macOS fica explicitamente pendente para a CI do PR, sem ser tratado como execução já ocorrida.

### Gap remanescente

**C6, critério 3, prova de stderr nos vínculos inválidos.** Cenário: o wrapper recebe apenas `SKILL_ME_CAPTURE_ROOT` ou um ID inválido, emite uma linha própria antes do stderr do Codex falso, então repassa o final nativo. Esperado: stream de stderr idêntico ao filho, com código/sinal/stdout preservados e nenhuma captura escolhida. Atual: `live-capture.cli.test.mjs:334` aceita esse prefixo; C4 testa igualdade apenas com vínculo válido. A correção deve tornar a asserção integral nesse cenário, sem enfraquecer a prova de ausência de escrita. Nenhuma mudança de produto é inferida por esta lacuna de teste.

O perfil `light` continua omitindo comparação formal de UI, `Coverage`, `Test policy` e fault injection. Este relatório preserva abaixo o veredito da rodada 1 como histórico; as linhas seguintes não são o veredito atual.

## Histórico — rodada 1 em 53d5e99

O relatório inicial concluiu **FAIL, 17/21**: C4 tinha apenas `endsWith` para stderr; C16 expunha código e contagens só pelo fd de fixture; C20 descrevia um diagnóstico inacessível; C21 foi marcado pendente por não haver CI macOS pré-PR. A rodada 2 resolveu C4/C16/C20 com as asserções e a execução acima e reavaliou C21 conforme a ordem de governança. A varredura do arquivo de teste e de `binding.mjs` tocados encontrou a lacuna remanescente de C6. As provas da rodada 1 foram 21 testes T8 (20 pass, 1 skip) e `npm test` verde no Windows (governança 6, revisão 16, doctor 410 pass/7 skip, integrações 217 pass/7 skip); nenhuma correção de produto/testes foi feita pelo Verifier.
