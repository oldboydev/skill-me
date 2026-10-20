# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados.
**Profile**: light.
**HEAD**: 7c698fbc93162d160943b3fc5ce8e10e30fe1582.
**Diff range**: a1f855b..HEAD (entrega); decaf63..HEAD (correção recente).
**Round**: 23 — scoped; todas as provas T7 repetidas no HEAD.
**Verifier**: subagente independente; somente este arquivo foi editado.

## Fontes e alcance

Li AGENTS.md, `tlc-implement/references/verify.md`, o contexto exportado da issue #7 com cinco comentários, `.tasks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.md`, o registro de build e a verificação anterior. Examinei o diff `decaf63..HEAD`, o parser, a avaliação e as asserções de renderização tocadas pelos achados da 18ª revisão formal. A issue e o plano continuam como fontes de C1–C10; `AGENT_SKILL_DEBUGGER_SPEC` é guia não vinculante. O checklist não possui seções Coverage ou Test policy. Comparação de UI e injeção de falhas pertencem aos perfis standard/ui, não ao light. Julgamentos fora do diff recente são carregados da rodada 22 em `decaf63` e as provas foram repetidas neste HEAD.

## Provas executadas no HEAD

- `node --test "tests/integrations/report/**/*.test.mjs"`: **exit 0; 72 testes, 72 passaram, 0 falharam, 0 skips**. O runner listou T7-C1 a T7-C10 nominalmente, inclusive as provas novas T7-C2/C5/C7.
- `git diff --check decaf63..HEAD`: exit 0. `git status --porcelain` estava vazio antes da escrita deste relatório.
- O builder registrou em `.checks/issue-7-relatorios.build.md` três falhas de regressão antes da correção e o lote verde; conferi o registro, sem atribuir a mim a execução red. Não repeti a suíte ampla de integrações, doctor ou governança neste HEAD; a mudança de comportamento toca `instructions.mjs` e `evaluate.mjs`, e o lote T7 atravessa parser, avaliação, renderização e CLI.

## Checks

| Check | Asserção decisiva executada | Resultado |
| --- | --- | --- |
| C1 | `skill-source.unit.test.mjs:31–38` exige modo observado/explícito, SHA-256, linha e arquivo inalterado; `report.e2e.test.mjs:67–68` atravessa CLI com nome Unicode. Julgamento carregado da rodada 19 em 0f557ca; prova repetida neste HEAD. | PASS |
| C2 | `instructions.unit.test.mjs:14–18` exige quatro tipos, heading/linha, ignora fence e não executa referência; `:94–103` rejeita referência parentética e conserva comando após ela; `:108–122` exige ambos os literais coordenados, a cláusula `or` depois de mais de 1.000 caracteres e o literal completo acima de 1.000 caracteres. | PASS |
| C3 | `skill-source.unit.test.mjs:74–88` exige erro fechado para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; `report.cli.test.mjs:48–51` proíbe eco. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C4 | `evaluate.unit.test.mjs:22–26` afirma seis estados, linhas, sequências, orientação não executável, motivo e hash. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C5 | `evaluate.unit.test.mjs:258–276` exige resultado nativo `sufficient` com fontes `[1,2]` para literal de 303 caracteres, `unobserved`/`no_matching_observation` e fonte vazia quando nenhuma alternativa aparece; `:239–255` preserva comando coordenado, alternativa longa observada e texto completo; `:228–231` preserva `or`/`ou` e o controle de `and` após aparte parentético. | PASS |
| C6 | `evaluate.unit.test.mjs:269–276` exige condição sem gatilho `inconclusive`, mas condição com gatilho nativo verdadeiro e nenhuma ação `unobserved`/`condition_true_action_unobserved` com fontes `[1,2]`; `:359–366` preserva ações ligadas por `or` versus `and`, seis eventos e gatilho falso; `:347–348` exige `condition_unresolved` para gatilhos alternativos. | PASS |
| C7 | `render.unit.test.mjs:24–44` exige alternativa observada `inconclusive` com explicação em texto/Markdown e motivo JSON, e alternativa sem evento `unobserved` com texto de lacuna e `no_matching_observation` em JSON; `:14–21` preserva fontes, versões, limites, ausência de percentual/raciocínio privado. | PASS |
| C8 | `report.cli.test.mjs:30–40` exige texto, Markdown, JSON v1, repetição idêntica, timeline vazia e captura/skill inalteradas. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C9 | `report.cli.test.mjs:48–72` exige saídas 2/3/4/5, erros fechados, stderr vazio e sem eco. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C10 | `report.e2e.test.mjs:40–48` exige fluxo captura/hook/CLI, seis estados, correção, sequências e ressalva de que ler SKILL.md não prova carregamento. Julgamento carregado da rodada 19; prova repetida. | PASS |

## Achado anterior e correção

A 18ª revisão formal encontrou limite oculto de 300 caracteres no trecho de comando e escolha `inconclusive` quando nenhuma alternativa tinha observação. `instructions.mjs:16` e `:44` retiram ambos os limites locais de literal; o arquivo SKILL.md continua limitado a 1 MiB pela fronteira de leitura. `instructions.unit.test.mjs:120–122` afirma o literal completo acima de 1.000 caracteres; `evaluate.unit.test.mjs:258–264` afirma o resultado nativo positivo para 303 caracteres. `evaluate.mjs:123–126` conserva `unobserved`/`no_matching_observation` sem evento; `:149–153` conserva a fonte `[1,2]` do gatilho verdadeiro e devolve `unobserved`/`condition_true_action_unobserved` quando nenhuma ação alternativa aparece. `evaluate.unit.test.mjs:267–276` distingue ambos. `render.unit.test.mjs:24–44` preserva a explicação de escolha quando há observação e exige texto de lacuna quando não há. O build registra red/green para três regressões; conferi o registro, sem atribuir a mim a execução red. Não encontrei bloqueio remanescente no diff recente.

## Política local e limites

A exceção do core vendorizado foi decidida pelo proprietário no quinto comentário do contexto e está explícita em AGENTS.md. O diff recente não toca core, configuração ou pilotos; carrego o julgamento dessa fronteira da rodada 22. Não executei revisão formal nem injeção de falhas; esta última não é exigida no perfil light.
