# Issue #6 — verificação independente da timeline

**Veredito atual: PASS — C1–C14 (14/14)** no HEAD de produto `c731d05`. A verificação atual está ao fim deste documento. As rodadas anteriores abaixo são mantidas como histórico. A quarta foi autorizada pelo proprietário nesta conversa em 19/10/2026, após três rodadas com achados corrigidos. Perfil `light`; Verifier independente do autor Claude. Diff da quarta rodada de `cc74be7952e28bc6427450beb88e1adb0907df5e` a `a1365b9ab8a0e1d331646a1986c535fc8a8c659b`.

O Verifier leu a [issue #6](https://github.com/oldboydev/skill-me/issues/6), seus sete critérios de aceite, `AGENTS.md`, o plano, a checklist, o registro do build e o diff. Os sete critérios estão cobertos por C1–C14, sem contradição encontrada. `CONTRIBUTING.md` não existe neste checkout. A árvore estava limpa; `git diff --check` saiu 0. `package.json` continua `private: true`, e o core vendorizado de revisão não mudou.

## Provas da quarta rodada

O Verifier executou, em uma chamada, `node --test "tests/integrations/correlation/*.test.mjs"`: **55 testes, 55 pass, 0 fail, 0 skip**. Desses, 53 são provas C1–C14 e dois cobrem o guia. Conferiu a execução e as asserções de cada check:

| Check | Testes | Asserção decisiva no HEAD | Resultado |
| --- | ---: | --- | --- |
| C1 | 2 | `timeline.unit.test.mjs:21,31,36` — sequência `[1,2,3]`, evidência por registro e listas vazias | PASS |
| C2 | 7 | `timeline.unit.test.mjs:271–279,302–310,331–338` — chaves públicas distintas entre sessões, pares da mesma sessão alinhados e `itemId` do exec heurístico | PASS |
| C3 | 3 | `timeline.unit.test.mjs:112,127–135,147–149` — ausência de ID inconclusiva ou heurística com sequências | PASS |
| C4 | 4 | `timeline.unit.test.mjs:208–211,220` — duplicata aponta à primeira entrada e não cria operação | PASS |
| C5 | 2 | `timeline.unit.test.mjs:233–256` — instante regressivo marcado e retomada segmentada | PASS |
| C6 | 5 | `operations.unit.test.mjs:22–23,39–44,60–68,101–105,125` — chamadas paralelas, órfãs, escopos e ambiguidade do exec | PASS |
| C7 | 3 | `operations.unit.test.mjs:156–161,173–184,190–192` — duração nativa ou derivada; cálculo inválido ausente | PASS |
| C8 | 2 | `skills.unit.test.mjs:32–39,45–50` — invocação nativa e conclusão das instruções `unobserved` | PASS |
| C9 | 2 | `skills.unit.test.mjs:63–72,84–87` — expansão/ciclo heurísticos; leitura de `SKILL.md` não cria invocação | PASS |
| C10 | 9 | `subagents.unit.test.mjs:31–34,54–57,110–116,168–172,189–194` — relação pai-filho, isolamento por sessão e pais conflitantes | PASS |
| C11 | 2 | `skills.unit.test.mjs:102–103,121–129` — fronteiras deixam skill `open` ou `boundary_only`, sem `skill_completed` | PASS |
| C12 | 6 | `timeline.cli.test.mjs:46–56,92–93,104–107,157–159` — consulta sem alteração, JSON e códigos 2/3/4/5 | PASS |
| C13 | 5 | `coverage.unit.test.mjs:20–25,42–52,63–64,68–91` — contadores, lacunas, totais exatos e `partial` sem percentual | PASS |
| C14 | 1 | `timeline.e2e.test.mjs:68–80,83–107` — CLI e API idênticas sobre fixtures rotuladas | PASS |

Em execução separada pelo coordenador no mesmo commit, `npm test` saiu 0: governança **6/6**, code review **16/16** e integrações **288 testes: 281 pass, 0 fail, 7 skips de plataforma**. Reexecutei `test:doctor` para capturar seu resumo: **417 testes, 410 pass, 0 fail, 7 skips** de FIFO/links POSIX no Windows. Os skips de integrações são os casos POSIX/ACL preexistentes listados em `.checks/issue-6-correlacao.build.md`; nenhum teste da #6 foi pulado. O Verifier não atribuiu a si esses comandos.

## Histórico e limites

As três rodadas anteriores apontaram vínculos entre subagentes de sessões diferentes, chaves públicas de subagente sem escopo, pais Hermes contraditórios e chaves públicas de turno/chamada sem escopo. Os commits `2c22d3f`, `9315253`, `5da7b1a` e `a1365b9` corrigiram os casos com regressões. A quarta rodada julgou completo o HEAD então avaliado.

O `turn_end` de Claude em C11 é sintético, pois o adaptador não o emite. O código 5 de E/S em C12 foi injetado em `runPrivacyCommand`, sem processo CLI. `timeout` e ação manual não têm evento próprio no envelope v1; a prova cobre as fronteiras observáveis. O fluxo C14 usa fixtures, sem execução de agente ou modelo real.

Um início Hermes com `subagentId` e `childSessionId` expõe a chave do primeiro em `entries.identity.subagent`, enquanto o fim e a operação usam a do segundo. Ambos os IDs permanecem em `entries.ids`; a operação usa o `childSessionId` explícito, cita início/fim em `evidence` e só atribui ferramentas da sessão filha. O Verifier registrou isso como alias observado, sem quebra demonstrada de C2/C10.

## Verificação independente após a primeira revisão formal

**Veredito: PASS — C1–C14 (14/14).** Perfil `light`; Verifier independente do autor Claude; HEAD `65d6c5c353e00b0abee433594e2d3e81c92bd12d`; diff `cc74be7952e28bc6427450beb88e1adb0907df5e..HEAD`. A issue #6 e os dois comentários OWNER foram lidos no GitHub: os sete critérios de aceite seguem o escopo do plano, e o proprietário autorizou as rodadas adicionais de Verifier após a primeira revisão formal. Foram lidos `AGENTS.md`, `verify.md`, plano, checklist, evidência de build, verificação anterior como histórico, contratos v1, fontes alteradas e diff. `CONTRIBUTING.md` não existe neste checkout.

**Prova executada no HEAD:** `node --test "tests/integrations/correlation/*.test.mjs"` em uma invocação com sandbox escalado: **61 testes, 61 pass, 0 fail, 0 cancelled, 0 skipped**. Foram 59 testes nomeados C1–C14 e dois `T6-docs`; cada nome apareceu como executado e aprovado. `git status --porcelain` vazio e `git diff --check cc74be7 HEAD` exit 0. `package.json` mantém `"private": true`; nenhum arquivo de `scripts/code-review` nem `package.json` aparece no diff. O guia alterado está em `docs/traces.md:137–207`.

| Check | Testes | Asserção decisiva no HEAD | Resultado |
| --- | ---: | --- | --- |
| C1 | 2 | `tests/integrations/correlation/timeline.unit.test.mjs:18–21,25–31,36,46` exige shape v1, sequência `[1,2,3]`, evidência `[sequence]`, vazio `[]` e ordem por sequência | PASS |
| C2 | 7 | `timeline.unit.test.mjs:85–96,271–279,302–310,331–338` exige chaves distintas por origem/captura/sessão e `null` sem sessão; o `itemId` sem sessão só agrupa operação heurística | PASS |
| C3 | 3 | `timeline.unit.test.mjs:109–112,127–135,147–149` exige sessões com ID `native`, evento sem ID `inconclusive` com duas sessões, e candidato único `heuristic` com sequências de apoio | PASS |
| C4 | 6 | `timeline.unit.test.mjs:161–163,208–211,350–357,362–369` exige `duplicateOf` primeira sequência; início/fim Hermes repetidos geram uma operação `closed` com `duplicates [2,4]`; sem ID/pai diferente seguem separados | PASS |
| C5 | 2 | `timeline.unit.test.mjs:233–234,250–256` exige instante regressivo marcado sem reordenação e segmentos de `resume` separados por ID | PASS |
| C6 | 9 | `tests/integrations/correlation/operations.unit.test.mjs:22–23,39–44,101–105,258–265,279–293` exige pares nativos paralelos/órfãos, e itens Codex intercalados com `itemId` distintos como dois `heuristic closed`, sequências `[2,5]`/`[4,6]`, `exitCode` 3/0, status, duração derivada 4000/1000 ms, `session:null`; fase repetida e tipo misto ficam `ambiguous` (`:234–241,291–293`) | PASS |
| C7 | 3 | `operations.unit.test.mjs:156–161,173–184,190–192` exige duração nativa inclusive zero, derivada em 2500 ms/zero, `exitCode:0`, e duração ausente quando resultado precede início | PASS |
| C8 | 2 | `tests/integrations/correlation/skills.unit.test.mjs:32–39,45–50` exige invocação Claude `native` pre/post, metades `open`/`orphan_result`, e `instructionCompletion:"unobserved"` | PASS |
| C9 | 2 | `skills.unit.test.mjs:63–72,84–87` exige expansão/lifecycle `heuristic` e nenhuma invocação produzida pela leitura de `SKILL.md` no Codex | PASS |
| C10 | 9 | `tests/integrations/correlation/subagents.unit.test.mjs:26–34,49–57,72–80,168–172,179–194` exige IDs pai/filho explícitos, operações do filho isoladas, pais conflitantes separados e sem atribuição | PASS |
| C11 | 2 | `skills.unit.test.mjs:102–103,121–129` exige `open`/`boundary_only` por fronteira do próprio escopo, ferramenta aberta permanece aberta e ausência de `skill_completed` | PASS |
| C12 | 6 | `tests/integrations/correlation/timeline.cli.test.mjs:46–56,64–66,92–93,104–107,157–159` exige JSON v1 e snapshot sem escrita nas capturas ativa/parada/desabilitada; códigos 2/3/4/5 com envelope fechado | PASS |
| C13 | 5 | `tests/integrations/correlation/coverage.unit.test.mjs:20–25,42–52,64–65,69–81,84–92` exige contadores/limites, lacunas por sequência, totais exatos, `partial` por causa e sem percentual | PASS |
| C14 | 1 | `tests/integrations/correlation/timeline.e2e.test.mjs:63–80,84–107` exige CLI igual à API pura sobre 17 registros sanitizados de fixtures Claude/Codex/Hermes, vínculos/cobertura e rótulo de modelo não executado | PASS |

**Revisão dos dois achados formais:** C6 preserva início, resultado, status, `exitCode` e `elapsedMs` quando duas sessões Codex têm `itemId` distintos mesmo com vidas sobrepostas (`operations.unit.test.mjs:245–265`), sem atribuir sessão nativa. Um início/fim únicos atravessando `session_start` fica heurístico (`:268–279`); fase repetida ou tipo misto ficam ambíguos (`:219–241,281–293`). C4 reconhece duplicata Hermes com `childSessionId` explícito sem `sessionId`, aponta `duplicateOf` e não cria segunda operação (`timeline.unit.test.mjs:348–357`); sem ID e com pais diferentes não deduplica (`:360–369`). C13 e `T6-docs` agora simulam ambiguidade por início repetido do mesmo `itemId`, não apenas abertura de outra sessão (`coverage.unit.test.mjs:55–65`, `docs.test.mjs:32–44`); `docs/traces.md:165–167` descreve a mesma regra.

**Limites:** esta rodada `light` não requer injeção independente de falhas; as mutações RED/GREEN e a suíte de integração ampla em `.checks/issue-6-correlacao.build.md` são evidência do autor, não comandos atribuídos ao Verifier. O `turn_end` Claude de C11 é sintético; E/S de C12 foi injetada em `runPrivacyCommand`; C14 usa fixtures e não executa modelo real. Sem ID de sessão nas linhas Codex, o reuso de `itemId` que só apresenta um início e um fim não pode ser distinguido de uma chamada longa e permanece `heuristic`; a atribuição de sessão nunca vira nativa. O alias Hermes `subagentId`/`childSessionId` no início, já registrado na seção histórica, permanece observável nos IDs originais e não mostrou quebra de C2/C10.

## Verificação independente após a segunda revisão formal

**Veredito: PASS — C1–C14 (14/14), sete critérios de aceite.** Verifier independente em leitura, perfil `light`, HEAD de produto `c731d05`, diff `cc74be7..HEAD`. O Verifier leu issue #6 e comentários, `AGENTS.md`, plano, checklist, evidência de build, contratos e diff; não editou arquivos. A árvore estava limpa e `git diff --check` passou.

**Prova executada:** `node --test "tests/integrations/correlation/*.test.mjs"` em uma chamada com permissão para as fixtures temporárias: **64 testes, 64 pass, 0 fail, 0 skip**. Uma primeira chamada em sandbox restrito teve 58 passes e seis falhas em `startCapture` com `io_failure`, antes das asserções C12/C14; com acesso ao diretório temporário, a repetição passou integralmente. Os testes do autor em `.checks/issue-6-correlacao.build.md`, inclusive a suíte ampla, não são atribuídos ao Verifier.

| Check | Testes | Asserção decisiva no HEAD | Resultado |
| --- | ---: | --- | --- |
| C1 | 2 | `timeline.unit.test.mjs:19` exige versão 1, ordem `[1,2,3]`, evidência por sequência e vazio | PASS |
| C2 | 7 | `timeline.unit.test.mjs:304` exige chaves distintas de turno e chamada entre sessões | PASS |
| C3 | 3 | `timeline.unit.test.mjs:112,129` exige ausência de sessão inconclusiva e candidato heurístico com evidência `[2,4]` | PASS |
| C4 | 6 | `timeline.unit.test.mjs:208,350–357` preserva duplicatas numa operação e deduplica Hermes por filho explícito | PASS |
| C5 | 3 | `timeline.unit.test.mjs:384,397–398` exige segmentos `[1,2,2,2]` com cópia de `resume` e `[1,2,3,3]` com retomada distinta | PASS |
| C6 | 11 | `operations.unit.test.mjs:257,304,323–333` exige itens Codex distintos intercalados, resultado sem ID `inconclusive/orphan_result` com campos observados e itens sem ID sem pareamento | PASS |
| C7 | 3 | `operations.unit.test.mjs:181` exige `exitCode:0`, `elapsedMs:2500` e duração derivada | PASS |
| C8 | 2 | `skills.unit.test.mjs:45` exige `post` fechando invocação com `instructionCompletion:"unobserved"` | PASS |
| C9 | 2 | `skills.unit.test.mjs:63,84–87` exige expansão/lifecycle heurísticos e leitura de `SKILL.md` sem invocação | PASS |
| C10 | 9 | `subagents.unit.test.mjs:169` exige pais divergentes sem pareamento ou atribuição de ferramenta | PASS |
| C11 | 2 | `skills.unit.test.mjs:121` exige fronteira `boundary_only` sem `skill_completed` | PASS |
| C12 | 6 | `timeline.cli.test.mjs:46,92–105,157–159` exige JSON v1 sem escrita e erros 2/3/4/5 | PASS |
| C13 | 5 | `coverage.unit.test.mjs:42` exige contadores, lacunas, totais e `partial` exatos | PASS |
| C14 | 1 | `timeline.e2e.test.mjs:68,84–100` exige CLI igual à API sobre 17 registros de fixtures | PASS |

**Quatro achados das revisões formais:** itens Codex de IDs distintos em sessões sobrepostas preservam operação, campos e duração (C6); duplicata Hermes por `childSessionId` não cria operação extra (C4); `item.completed` sem `itemId` preserva `status`, `exitCode`, evidência e contagem de órfãos, sem pareamento inventado (C6); cópia idêntica de `resume` não abre segmento e `resume` diferente abre (C5).

**Limites:** C11 usa `turn_end` Claude sintético; a E/S de C12 é injetada em `runPrivacyCommand`; C14 usa fixtures, sem agente ou modelo real. O Verifier não executou testes no commit anterior nem a suíte ampla relatada pelo autor. O limite de duas tentativas de revisão formal foi atingido com `changes_requested`; este PASS independente não equivale a revisão formal aprovada.
