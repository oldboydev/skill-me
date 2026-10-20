# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados.
**Profile**: light.
**HEAD**: 0f557ca2c4dd9d5c2a2945ee606aca0ada4d4a2f.
**Diff range**: a1f855b..HEAD (entrega); aee4f83..HEAD (correção recente, com FAIL anterior preservado em b654b9e).
**Round**: 19 — scoped; todas as provas T7 repetidas no HEAD.
**Verifier**: subagente independente; somente este arquivo foi editado.

## Fontes e alcance

Li AGENTS.md, `tlc-implement/references/verify.md`, o contexto exportado da issue #7 com cinco comentários, `.tasks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.md`, o registro de build, a verificação anterior e o achado da revisão formal em `.checks/code-review/issue-7/response.json`. Comparei o diff `aee4f83..HEAD`, o parser, a avaliação e as asserções tocadas. A issue e o plano continuam como fontes dos critérios C1–C10; `AGENT_SKILL_DEBUGGER_SPEC` é guia não vinculante. O checklist não possui seções Coverage ou Test policy. Comparação de UI e injeção de falhas pertencem aos perfis standard/ui, não ao light.

## Provas executadas no HEAD

- `node --test "tests/integrations/report/**/*.test.mjs"`: **exit 0; 61 testes, 61 passaram, 0 falharam, 0 skips**. O runner listou T7-C1 a T7-C10 nominalmente, inclusive os dois testes novos.
- Smoke read-only do parser via `node --input-type=module`: a instrução `Run curl --version (see expected output) and`, continuada por `docker build .`, extraiu `[["curl --version","docker build ."]]`; sem o segundo comando, a referência simples extraiu apenas `[["curl --version"]]`.
- `git diff --check aee4f83..HEAD`: exit 0. `git status --porcelain` estava vazio antes da escrita deste relatório.
- O builder registrou em `.checks/issue-7-relatorios.build.md` o red dos dois testes novos (0/2) no código anterior e o green (2/2) após a correção. Conferi o registro, sem atribuir a mim a execução red. Não repeti a suíte ampla de integrações nem testes de doctor ou governança neste HEAD; a mudança de comportamento alcança o parser e o lote T7 atravessa avaliação e CLI.

## Checks

| Check | Asserção decisiva executada | Resultado |
| --- | --- | --- |
| C1 | `skill-source.unit.test.mjs:31–38` exige identificação observada/explícita, SHA-256, linha e arquivo inalterado; `report.e2e.test.mjs:67–68` atravessa a CLI com nome Unicode. Julgamento carregado da rodada 17 em ab1fe8b; prova repetida neste HEAD. | PASS |
| C2 | `instructions.unit.test.mjs:14–18` exige quatro tipos, heading/linha, ignora fence e não executa o script; `:94–96` recusa `expected output` como comando; `:101–103` exige exatamente `["curl --version", "docker build ."]` na continuação após a referência. O smoke independente confirmou as duas extrações. | PASS |
| C3 | `skill-source.unit.test.mjs:74–88` exige erro fechado para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; `report.cli.test.mjs:48–51` proíbe eco. Julgamento carregado da rodada 17; prova repetida. | PASS |
| C4 | `evaluate.unit.test.mjs:22–26` afirma os seis estados, linhas, sequências, orientação não executável, motivo e hash. Julgamento carregado da rodada 17; prova repetida. | PASS |
| C5 | `evaluate.unit.test.mjs:105–115` exige `partial`/`commands_incomplete` e fontes `[1,2]` com só curl, `sufficient` e `[1,2,3,4]` com ambos; `:97–99` garante que a referência sem segundo comando não rebaixe a prova de curl. | PASS |
| C6 | `evaluate.unit.test.mjs:136–138` exige condição falsa/inconclusiva e correção com sequências `[3,4]` e `[5,6]`; cenários adicionais de ordem/sessão foram reexecutados. Julgamento carregado da rodada 17. | PASS |
| C7 | `render.unit.test.mjs:14–21` exige fontes, versões, limites, ausência de percentual/raciocínio privado; `:32–41` separa plataformas e fontes. Julgamento carregado da rodada 17; prova repetida. | PASS |
| C8 | `report.cli.test.mjs:30–40` exige texto, Markdown, JSON v1, repetição idêntica, timeline vazia e captura/skill inalteradas. Julgamento carregado da rodada 17; prova repetida. | PASS |
| C9 | `report.cli.test.mjs:48–72` exige saídas 2/3/4/5, erros fechados, stderr vazio e sem eco. Julgamento carregado da rodada 17; prova repetida. | PASS |
| C10 | `report.e2e.test.mjs:38–48` exige fluxo captura/hook/CLI, seis estados, correção, sequências e ressalva de que ler SKILL.md não prova carregamento. Julgamento carregado da rodada 17; prova repetida. | PASS |

## Achado anterior e correção

A rodada 18 havia encontrado que a referência parentética entre dois comandos ocultava `docker build .`, e a avaliação declarava `sufficient` com só curl. Em `src/integrations/report/instructions.mjs:32`, a regra de coordenação remove o aparte parentético apenas do texto de ligação, conservando a exigência do segundo comando. `instructions.unit.test.mjs:99–103` distingue a extração correta. `evaluate.unit.test.mjs:102–115` distingue prova incompleta, prova completa e sequências exatas. A referência `expected output` não vira comando, confirmado também por `instructions.unit.test.mjs:92–96` e `evaluate.unit.test.mjs:94–99`. Não encontrei bloqueio remanescente no diff recente.

## Política local e limites

A exceção do core vendorizado foi decidida pelo proprietário no quinto comentário do contexto e está explícita em AGENTS.md. O diff recente não toca core, configuração ou pilotos; carrego o julgamento dessa fronteira da rodada 17. Não executei revisão formal nem injeção de falhas; esta última não é exigida no perfil light.
