# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados.
**Profile**: light.
**HEAD**: 858fed2fe3d7672b3a3cc6d4c3654a2870510360.
**Diff range**: a1f855b..HEAD (entrega); a9e75b3..HEAD (correção recente).
**Round**: 22 — scoped; todas as provas T7 repetidas no HEAD.
**Verifier**: subagente independente; somente este arquivo foi editado.

## Fontes e alcance

Li AGENTS.md, `tlc-implement/references/verify.md`, o contexto exportado da issue #7 com cinco comentários, `.tasks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.md`, o registro de build e a verificação anterior. Examinei o diff `a9e75b3..HEAD`, o parser, a avaliação e as asserções tocadas pelos dois achados da 17ª revisão formal. A issue e o plano continuam como fontes de C1–C10; `AGENT_SKILL_DEBUGGER_SPEC` é guia não vinculante. O checklist não possui seções Coverage ou Test policy. Comparação de UI e injeção de falhas pertencem aos perfis standard/ui, não ao light. Julgamentos fora do diff recente são carregados da rodada 21 em `a9e75b3` e as provas foram repetidas neste HEAD.

## Provas executadas no HEAD

- `node --test "tests/integrations/report/**/*.test.mjs"`: **exit 0; 68 testes, 68 passaram, 0 falharam, 0 skips**. O runner listou T7-C1 a T7-C10 nominalmente, inclusive as quatro provas novas T7-C2/C5.
- `git diff --check a8dd5d6..HEAD`: exit 0. `git status --porcelain` estava vazio antes da escrita deste relatório.
- O builder registrou em `.checks/issue-7-relatorios.build.md` quatro falhas de regressão antes da correção e o lote verde; conferi o registro, sem atribuir a mim a execução red. Não repeti a suíte ampla de integrações, doctor ou governança neste HEAD; a mudança de comportamento toca `instructions.mjs`, e o lote T7 atravessa parser, avaliação, renderização e CLI.

## Checks

| Check | Asserção decisiva executada | Resultado |
| --- | --- | --- |
| C1 | `skill-source.unit.test.mjs:31–38` exige modo observado/explícito, SHA-256, linha e arquivo inalterado; `report.e2e.test.mjs:67–68` atravessa CLI com nome Unicode. Julgamento carregado da rodada 19 em 0f557ca; prova repetida neste HEAD. | PASS |
| C2 | `instructions.unit.test.mjs:14–18` exige quatro tipos, heading/linha, ignora fence e não executa referência; `:94–103` rejeita referência parentética e conserva comando após ela; `:108–117` exige ambos os literais coordenados e a cláusula `or` depois de mais de 1.000 caracteres. | PASS |
| C3 | `skill-source.unit.test.mjs:74–88` exige erro fechado para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; `report.cli.test.mjs:48–51` proíbe eco. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C4 | `evaluate.unit.test.mjs:22–26` afirma seis estados, linhas, sequências, orientação não executável, motivo e hash. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C5 | `evaluate.unit.test.mjs:239–255` exige `contradicted`/`some_commands_failed` para `Run npm test and docker ps` com evento `[1,2,3,4]`, e `inconclusive`/`alternative_commands_unresolved` com os mesmos eventos e texto completo para a alternativa longa; `:228–231` preserva `or`/`ou` e o controle de `and` após aparte parentético; `:37–39` preserva limite de leitura de SKILL.md. | PASS |
| C6 | `evaluate.unit.test.mjs:338–345` exige `inconclusive`/`alternative_commands_unresolved` para ações ligadas por `or`, `contradicted`/`some_commands_failed` para `and`, fontes nas linhas `[1,2]`, seis eventos em ambos os casos e `not_applicable` com `[1,2]` quando o gatilho é falso; `:326–327` exige `condition_unresolved` para gatilhos alternativos. `:136–138` preserva condição falsa/inconclusiva e correção. Julgamento carregado da rodada 21; prova repetida. | PASS |
| C7 | `render.unit.test.mjs:14–21` exige fontes, versões, limites, ausência de percentual/raciocínio privado; `:28–33` exige explicação da alternativa em texto/Markdown e motivo exato no JSON. Julgamento carregado da rodada 20; prova repetida neste HEAD. | PASS |
| C8 | `report.cli.test.mjs:30–40` exige texto, Markdown, JSON v1, repetição idêntica, timeline vazia e captura/skill inalteradas. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C9 | `report.cli.test.mjs:48–72` exige saídas 2/3/4/5, erros fechados, stderr vazio e sem eco. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C10 | `report.e2e.test.mjs:40–48` exige fluxo captura/hook/CLI, seis estados, correção, sequências e ressalva de que ler SKILL.md não prova carregamento. Julgamento carregado da rodada 19; prova repetida. | PASS |

## Achado anterior e correção

A 17ª revisão formal encontrou `Run npm test and docker ps` declarado `sufficient` após sucesso do primeiro comando e falha do segundo, e uma instrução com mais de 1.000 caracteres e `or` declarada `contradicted` após corte do texto. `instructions.mjs:18–20` preserva o texto sanitizado completo; `:23–33` reconhece o segundo literal coordenado sem depender da lista de comandos conhecidos. `instructions.unit.test.mjs:108–117` afirma os comandos e a cláusula final; `evaluate.unit.test.mjs:239–255` afirma os estados, motivos, eventos e texto completo. Os controles em `instructions.unit.test.mjs:94–103` e `evaluate.unit.test.mjs:228–231` preservam referência parentética e a diferença entre `or` e `and`. O build registra red/green para as quatro regressões; conferi o registro, sem atribuir a mim a execução red. Não encontrei bloqueio remanescente no diff recente.

## Política local e limites

A exceção do core vendorizado foi decidida pelo proprietário no quinto comentário do contexto e está explícita em AGENTS.md. O diff recente não toca core, configuração ou pilotos; carrego o julgamento dessa fronteira da rodada 21. Não executei revisão formal nem injeção de falhas; esta última não é exigida no perfil light.
