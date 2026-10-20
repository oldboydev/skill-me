# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados.
**Profile**: light.
**HEAD**: a8dd5d681c75c44bc26469d0358bec30e72bee6f.
**Diff range**: a1f855b..HEAD (entrega); d8c51a0..HEAD (correção recente).
**Round**: 21 — scoped; todas as provas T7 repetidas no HEAD.
**Verifier**: subagente independente; somente este arquivo foi editado.

## Fontes e alcance

Li AGENTS.md, `tlc-implement/references/verify.md`, o contexto exportado da issue #7 com cinco comentários, `.tasks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.md`, o registro de build e a verificação anterior. Examinei o diff `d8c51a0..HEAD`, a avaliação, a documentação e as asserções tocadas pelo achado da 16ª revisão formal. A issue e o plano continuam como fontes de C1–C10; `AGENT_SKILL_DEBUGGER_SPEC` é guia não vinculante. O checklist não possui seções Coverage ou Test policy. Comparação de UI e injeção de falhas pertencem aos perfis standard/ui, não ao light. Julgamentos fora do diff recente são carregados da rodada 20 em `d8c51a0` e as provas foram repetidas neste HEAD.

## Provas executadas no HEAD

- `node --test "tests/integrations/report/**/*.test.mjs"`: **exit 0; 64 testes, 64 passaram, 0 falharam, 0 skips**. O runner listou T7-C1 a T7-C10 nominalmente, inclusive a prova nova T7-C6.
- `git diff --check d8c51a0..HEAD`: exit 0. `git status --porcelain` estava vazio antes da escrita deste relatório.
- O builder registrou em `.checks/issue-7-relatorios.build.md` o caso anterior `contradicted` e a correção; conferi o registro, sem atribuir a mim o red. Não repeti a suíte ampla de integrações, doctor ou governança neste HEAD; a mudança de comportamento toca `evaluate.mjs`, e o lote T7 atravessa avaliação, renderização e CLI.

## Checks

| Check | Asserção decisiva executada | Resultado |
| --- | --- | --- |
| C1 | `skill-source.unit.test.mjs:31–38` exige modo observado/explícito, SHA-256, linha e arquivo inalterado; `report.e2e.test.mjs:67–68` atravessa CLI com nome Unicode. Julgamento carregado da rodada 19 em 0f557ca; prova repetida neste HEAD. | PASS |
| C2 | `instructions.unit.test.mjs:14–18` exige quatro tipos, heading/linha, ignora fence e não executa referência; `:101–103` conserva dois comandos separados por aparte. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C3 | `skill-source.unit.test.mjs:74–88` exige erro fechado para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; `report.cli.test.mjs:48–51` proíbe eco. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C4 | `evaluate.unit.test.mjs:22–26` afirma seis estados, linhas, sequências, orientação não executável, motivo e hash. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C5 | `evaluate.unit.test.mjs:228–231` exige `inconclusive`/`alternative_commands_unresolved` para `or` e `ou`, `contradicted`/`some_commands_failed` para `or` parentético seguido de `and`, fontes `[1,2,3,4]` e linhas `[1,2,3]`. `:37–39` preserva limite de leitura de SKILL.md. | PASS |
| C6 | `evaluate.unit.test.mjs:314–321` exige `inconclusive`/`alternative_commands_unresolved` para ações ligadas por `or`, `contradicted`/`some_commands_failed` para `and`, fontes nas linhas `[1,2]`, seis eventos em ambos os casos e `not_applicable` com `[1,2]` quando o gatilho é falso; `:302–303` exige `condition_unresolved` para gatilhos alternativos. `:136–138` preserva condição falsa/inconclusiva e correção. | PASS |
| C7 | `render.unit.test.mjs:14–21` exige fontes, versões, limites, ausência de percentual/raciocínio privado; `:28–33` exige explicação da alternativa em texto/Markdown e motivo exato no JSON. Julgamento carregado da rodada 20; prova repetida neste HEAD. | PASS |
| C8 | `report.cli.test.mjs:30–40` exige texto, Markdown, JSON v1, repetição idêntica, timeline vazia e captura/skill inalteradas. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C9 | `report.cli.test.mjs:48–72` exige saídas 2/3/4/5, erros fechados, stderr vazio e sem eco. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C10 | `report.e2e.test.mjs:40–48` exige fluxo captura/hook/CLI, seis estados, correção, sequências e ressalva de que ler SKILL.md não prova carregamento. Julgamento carregado da rodada 19; prova repetida. | PASS |

## Achado anterior e correção

A 16ª revisão formal encontrou `If npm test fails, run npm run fix or npm run retry` declarado `contradicted` quando o gatilho falhou, a primeira ação falhou e a segunda teve sucesso. `evaluate.mjs:108–120` agora distingue o par de ações do par gatilho/primeira ação; `:148–151` só aplica a escolha inconclusiva depois de comprovar o gatilho, preservando as seis sequências observadas. A asserção em `evaluate.unit.test.mjs:314–321` afirma estado, motivo, linhas e eventos exatos, compara `and`, e cobre o gatilho falso. `:302–303` mantém `condition_unresolved` para gatilhos alternativos. O build registra red/green para o caso novo; eu conferi o registro, sem atribuir a mim a execução red. Não encontrei bloqueio remanescente no diff recente.

## Política local e limites

A exceção do core vendorizado foi decidida pelo proprietário no quinto comentário do contexto e está explícita em AGENTS.md. O diff recente não toca core, configuração ou pilotos; carrego o julgamento dessa fronteira da rodada 20. Não executei revisão formal nem injeção de falhas; esta última não é exigida no perfil light.
