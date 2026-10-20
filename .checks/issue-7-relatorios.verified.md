# Issue #7 — verificação independente do relatório

**Verdict**: PASS — 10/10 checks comprovados no HEAD.
**Profile**: light.
**Diff range**: `a1f855b..0548aa9` (entrega completa); correção reavaliada `f61132c..0548aa9`.
**Round**: 2 — scoped.
**Verifier**: subagente independente, sem edição de produto, plano, checklist, testes ou build.

## Escopo e fontes

Li `.checks/issue-7-relatorios.md`, `.tasks/issue-7-relatorios.md`, `.checks/code-review/issue-7/context.json`, `AGENTS.md` e o diff da entrega. O perfil `light` não executa comparação de interface com fonte vinculante, recomputação de `Coverage`/`Test policy` ou injeção de falhas; o checklist não possui seções `Coverage` ou `Test policy`. As asserções de arquivos tocados foram conferidas no HEAD. C1–C3, C8 e C9 preservam o julgamento de conteúdo da rodada anterior em `f61132c`; suas provas foram executadas novamente em `0548aa9`. C4 e C5–C7 foram reavaliados porque `evaluate.mjs` ou `render.mjs` mudou; C10 foi reavaliado pela fixture alterada.

## Provas por check

Um único comando executou os seis arquivos com `--test-name-pattern='T7-C(1|2|3|4|5|6|7|8|9|10)'`: **16 testes, 16 passes, 0 falhas, 0 skips**, exit 0. Cada nome C1–C10 apareceu no resultado. Caminhos abaixo são relativos à raiz do repositório; linhas são do HEAD.

| Check | Julgamento | Asserção que decide o resultado | Proveniência |
| --- | --- | --- | --- |
| C1 | PASS | `tests/integrations/report/skill-source.unit.test.mjs:27–33`: `observed.identification === "observed_name"`, SHA-256 dos bytes, `[[2, "Build"]]`, `["explicit_path", false]`, bytes e `mtimeMs` inalterados. | Carried from `f61132c`; prova reexecutada em `0548aa9`. |
| C2 | PASS | `tests/integrations/report/instructions.unit.test.mjs:14–18`: lista exata de quatro tipos/linhas/heading, comandos literais esperados e `existsSync(marker) === false`. | Carried from `f61132c`; prova reexecutada em `0548aa9`. |
| C3 | PASS | `tests/integrations/report/skill-source.unit.test.mjs:38–53`: `assert.rejects` exige `e.code === code && e.message === code`; casos de ausência, duas ambiguidades, diretório, UTF-8 inválido e 1 MiB + 1. | Carried from `f61132c`; prova reexecutada em `0548aa9`. |
| C4 | PASS | `tests/integrations/report/evaluate.unit.test.mjs:22–26`: estados fechados esperados, linhas `[2,3,4,5,6,7,8,9]`, eventos `[1,2]`, motivo `guidance_not_step` e hash de cada avaliação. | Reavaliado em `0548aa9`; avaliador compartilhado mudou. |
| C5 | PASS | `tests/integrations/report/evaluate.unit.test.mjs:37–39`: sucesso, contradição, parcial e ausência, sem atribuir carregamento a `SKILL.md`; `:69–70`: segundo comando ausente exige `partial`; `:80–82`: dois sucessos exigem `sufficient` e falha em um exige `contradicted`, com sequências de ambos. | Reavaliado em `0548aa9`; lacuna da rodada 1 corrigida. |
| C6 | PASS | `tests/integrations/report/evaluate.unit.test.mjs:49–51`: condição falsa, inconclusiva e correção `{ failed: [3,4], corrected: [5,6] }`; `:61–63`: sessões distintas não são correção; `:92–93`: ação anterior à falha não basta após retry; `:103–104`: ação posterior à falha basta, preservando sequências. | Reavaliado em `0548aa9`; lacuna da rodada 1 corrigida. |
| C7 | PASS | `tests/integrations/report/render.unit.test.mjs:14–21`: texto e Markdown incluem hash, linha, evento, contrato, timeline, avaliações e limites; não contêm `%` nem raciocínio privado; JSON v1 preserva fonte. `:34`: erro, correção com sequências e cobertura parcial aparecem na explicação. | Reavaliado em `0548aa9`; novos motivos de comandos compostos também estão em `src/integrations/report/render.mjs:22–24`. |
| C8 | PASS | `tests/integrations/report/report.cli.test.mjs:30–40`: três formatos retornam 0, prefixos text/Markdown e JSON v1, repetição JSON idêntica, árvore e skill inalteradas. | Carried from `f61132c`; prova reexecutada em `0548aa9`. |
| C9 | PASS | `tests/integrations/report/report.cli.test.mjs:48–71`: helper exige exit exato, erro JSON fechado, stderr vazio e sem eco; casos `:53–65` exercitam 2/3/4, e `:69–71` exercita 5. | Carried from `f61132c`; prova reexecutada em `0548aa9`. |
| C10 | PASS | `tests/integrations/report/report.e2e.test.mjs:40–47`: CLI real retorna 0; vetor exato contém os seis estados, inclusive `contradicted`; correção mantém falha, ausência cita `[]`, limite de `SKILL.md` permanece, entradas da timeline têm evidência. | Reavaliado em `0548aa9`; fixture agora inclui `npm run bad` com falha em `:18,33–34`. |

## Reavaliação da correção

- C5: `evidenceForCommands` avalia todos os literais e agrega contradição antes de suficiência (`src/integrations/report/evaluate.mjs:48–70`); as provas `:69` e `:80` distinguem o comportamento anterior incorreto.
- C6: a condição considera todas as tentativas nativas do gatilho no contexto, exige ação depois do último gatilho verdadeiro e mantém a falha mesmo após retry positivo (`src/integrations/report/evaluate.mjs:73–91`); as provas `:92` e `:103` distinguem ordem e retry.
- C7: o renderizador tem motivos próprios para falha, sucesso e incompletude de comandos compostos (`src/integrations/report/render.mjs:22–24`); o teste de erro/correção/lacuna em `render.unit.test.mjs:34` passou.
- C10: a fixture E2E acrescenta falha terminal e exige explicitamente `contradicted` no vetor (`report.e2e.test.mjs:33–34,42`).
- Superfícies adicionais tocadas: `docs/report.md` descreve a regra alterada; `.checks/issue-7-relatorios.build.md` registra a regressão anterior e os limites. Não houve alteração da fonte vinculante nem do checklist.

## Gates e limites

- `npm test` no HEAD: exit 0; governança **6/6**, motor de revisão **16/16**, doctor **410 passes, 7 skips**, integrações **306 passes, 7 skips**, sem falhas. Os skips declarados são condicionais a plataforma/ambiente; nenhum pertence ao lote C1–C10.
- `git diff --check a1f855b..HEAD`: exit 0. A árvore estava limpa antes da escrita deste relatório.
- Injeção de falhas e juízos de `Coverage`/`Test policy` não se aplicam ao perfil `light`. A prova de regressão red anterior consta do build, mas não foi repetida por este Verifier e não é reivindicada como execução independente.
