# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados.
**Profile**: light.
**HEAD**: e5fe11e873b867a7565b2c1eeae4c567c735022a.
**Diff range**: a1f855b..HEAD (entrega); 6213661..HEAD (correção recente).
**Round**: 24 — scoped; todas as provas T7 repetidas no HEAD.
**Verifier**: subagente independente; somente este arquivo foi editado.

## Fontes e alcance

Li AGENTS.md, `tlc-implement/references/verify.md`, o contexto exportado da issue #7 com cinco comentários, `.tasks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.md`, o registro de build e a verificação anterior. Examinei o diff `6213661..HEAD`, o parser, a avaliação e as asserções tocadas pelos achados da 19ª revisão formal. A issue e o plano continuam como fontes de C1–C10; `AGENT_SKILL_DEBUGGER_SPEC` é guia não vinculante. O checklist não possui seções Coverage ou Test policy. Comparação de UI e injeção de falhas pertencem aos perfis standard/ui, não ao light. Julgamentos fora do diff recente são carregados da rodada 23 em `6213661` e as provas foram repetidas neste HEAD.

## Provas executadas no HEAD

- `node --test "tests/integrations/report/**/*.test.mjs"`: **exit 0; 75 testes, 75 passaram, 0 falharam, 0 skips**. O runner listou T7-C1 a T7-C10 nominalmente, inclusive as provas novas T7-C2/C5.
- `git diff --check 6213661..HEAD`: exit 0. `git status --porcelain` estava vazio antes da escrita deste relatório.
- O builder registrou em `.checks/issue-7-relatorios.build.md` três falhas de regressão antes da correção e o lote verde; conferi o registro, sem atribuir a mim a execução red. Não repeti a suíte ampla de integrações, doctor ou governança neste HEAD; a mudança de comportamento toca `instructions.mjs` e `evaluate.mjs`, e o lote T7 atravessa parser, avaliação, renderização e CLI.

## Checks

| Check | Asserção decisiva executada | Resultado |
| --- | --- | --- |
| C1 | `skill-source.unit.test.mjs:31–38` exige modo observado/explícito, SHA-256, linha e arquivo inalterado; `report.e2e.test.mjs:67–68` atravessa CLI com nome Unicode. Julgamento carregado da rodada 19 em 0f557ca; prova repetida neste HEAD. | PASS |
| C2 | `instructions.unit.test.mjs:14–18` exige quatro tipos, heading/linha, ignora fence e não executa referência; `:94–103` rejeita referência parentética e conserva comando após ela; `:108–126` exige ambos os literais coordenados, cláusula longa e literal completo, e preserva o segundo comando em `(or ...)`. | PASS |
| C3 | `skill-source.unit.test.mjs:74–88` exige erro fechado para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; `report.cli.test.mjs:48–51` proíbe eco. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C4 | `evaluate.unit.test.mjs:22–26` afirma seis estados, linhas, sequências, orientação não executável, motivo e hash. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C5 | `evaluate.unit.test.mjs:279–303` exige `inconclusive`/`alternative_commands_unresolved` e eventos `[1,2,3,4]` para `(or ...)`; exige `inconclusive`/`command_redacted` e `[1,2]` com alternativa sanitizada depois ou antes do comando visível; o controle `and` permanece `contradicted`/`matching_command_failed`. `:258–276` preserva literal de 303 caracteres e alternativa não observada. | PASS |
| C6 | `evaluate.unit.test.mjs:269–276` exige condição sem gatilho `inconclusive`, mas condição com gatilho nativo verdadeiro e nenhuma ação `unobserved`/`condition_true_action_unobserved` com fontes `[1,2]`; `:386–393` preserva ações ligadas por `or` versus `and`, seis eventos e gatilho falso; `:374–375` exige `condition_unresolved` para gatilhos alternativos. Julgamento carregado da rodada 23; prova repetida. | PASS |
| C7 | `render.unit.test.mjs:24–44` exige alternativa observada `inconclusive` com explicação em texto/Markdown e motivo JSON, e alternativa sem evento `unobserved` com texto de lacuna e `no_matching_observation` em JSON; `:14–21` preserva fontes, versões, limites, ausência de percentual/raciocínio privado. | PASS |
| C8 | `report.cli.test.mjs:30–40` exige texto, Markdown, JSON v1, repetição idêntica, timeline vazia e captura/skill inalteradas. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C9 | `report.cli.test.mjs:48–72` exige saídas 2/3/4/5, erros fechados, stderr vazio e sem eco. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C10 | `report.e2e.test.mjs:40–48` exige fluxo captura/hook/CLI, seis estados, correção, sequências e ressalva de que ler SKILL.md não prova carregamento. Julgamento carregado da rodada 19; prova repetida. | PASS |

## Achado anterior e correção

A 19ª revisão formal encontrou `Run npm test (or npm run build)` tratado só como primeiro comando e uma alternativa sanitizada ignorada, causando contradição indevida pela falha da opção visível. `instructions.mjs:11` aceita o conector parentético; `instructions.unit.test.mjs:125–126` confirma ambos os comandos. `evaluate.mjs:108–121` reconhece trechos de alternativa sanitizados; `:162–168` prioriza `inconclusive`/`command_redacted` quando há `or`, enquanto `:177–189` aplica esse tratamento antes da avaliação de alternativas legíveis. `evaluate.unit.test.mjs:279–303` afirma estados, motivos, eventos exatos, texto sanitizado, controle `and` contradito e opção redigida antes da visível. O build registra red/green para três regressões; conferi o registro, sem atribuir a mim a execução red. Não encontrei bloqueio remanescente no diff recente.

## Política local e limites

A exceção do core vendorizado foi decidida pelo proprietário no quinto comentário do contexto e está explícita em AGENTS.md. O diff recente não toca core, configuração ou pilotos; carrego o julgamento dessa fronteira da rodada 23. Não executei revisão formal nem injeção de falhas; esta última não é exigida no perfil light.
