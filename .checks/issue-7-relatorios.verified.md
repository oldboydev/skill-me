# Issue #7 — verificação independente do relatório

**Verdict**: PASS — 10/10 checks comprovados em `3bb71cf`.
**Profile**: light.
**Diff range**: `a1f855b..3bb71cf` (entrega completa); `d031673..3bb71cf` (correção reavaliada).
**Round**: 3 — scoped.
**Verifier**: subagente independente; não editou produto, testes, plano, checklist ou build.

## Escopo e proveniência

Li `AGENTS.md`, `.checks/issue-7-relatorios.md`, `.tasks/issue-7-relatorios.md`, `.checks/code-review/issue-7/context.json`, os três achados de `.checks/code-review/issue-7/response.json`, o relatório da rodada 2 (`0548aa9`) e o diff `d031673..3bb71cf`. O checklist não contém `Coverage` ou `Test policy` e o perfil `light` não pede comparação `ui` nem injeção de falhas. Reavaliei C1–C2, C4–C8 e C10 por tocarem as fontes, o parser, o avaliador, a renderização ou seus consumidores; C3 foi auditado na fonte tocada. O julgamento das asserções de C9 foi carregado da rodada 2 (`0548aa9`), pois sua fronteira de erros não mudou. **Todas** as provas C1–C10 foram reexecutadas em `3bb71cf`.

## Provas por check

Uma única invocação de `node --test --test-name-pattern='T7-C(1|2|3|4|5|6|7|8|9|10)'` com os seis arquivos de `tests/integrations/report/` executou **19 testes, 19 passes, 0 falhas, 0 skips**, exit 0. Cada nome C1–C10 apareceu no resultado. Caminhos e linhas abaixo são relativos à raiz do repositório e correspondem a `3bb71cf`.

| Check | Resultado | Asserção decisiva no HEAD | Proveniência |
| --- | --- | --- | --- |
| C1 | PASS | `tests/integrations/report/skill-source.unit.test.mjs:27–34`: `observed.identification === "observed_name"`, `observedSources === [{ events: [1], strength: "native" }]`, hash dos bytes, linha/heading `[[2, "Build"]]`, modo explícito divergente, bytes e mtime inalterados. | Reavaliado em `3bb71cf`; `skill-source.mjs` e teste tocados. |
| C2 | PASS | `tests/integrations/report/instructions.unit.test.mjs:14–18`: quatro tipos/linhas/heading, comandos literais e marcador de execução ausente; `:26`: fence de quatro crases com três crases internas produz somente `[[8, ["npm test"]]]`. | Reavaliado em `3bb71cf`; regressão nova. |
| C3 | PASS | `tests/integrations/report/skill-source.unit.test.mjs:39–53`: `assert.rejects` exige código e mensagem fechados; casos de ausência, duas ambiguidades, diretório, UTF-8 inválido e 1 MiB + 1. | Asserções carregadas de `0548aa9`, auditadas na fonte tocada e prova reexecutada em `3bb71cf`. |
| C4 | PASS | `tests/integrations/report/evaluate.unit.test.mjs:22–26`: vetor fechado de estados, linhas exatas, sequência `[1, 2]`, `guidance_not_step` e hash/motivo de toda avaliação. | Reavaliado em `3bb71cf`; avaliador tocado. |
| C5 | PASS | `tests/integrations/report/evaluate.unit.test.mjs:37–39`: sucesso, falha, parcial, ausência e leitura sem atribuição de carregamento; `:69–70`: comando faltante é parcial; `:80–82`: dois sucessos são suficientes e um comando falho contradiz, com sequências. | Reavaliado em `3bb71cf`; avaliador tocado. |
| C6 | PASS | `tests/integrations/report/evaluate.unit.test.mjs:49–51`: condição falsa/inconclusiva e correção com sequências de falha/sucesso; `:61–63`: sessões distintas; `:92–104`: ordem e retry; `:113–114`: proibição condicional e direta ficam `inconclusive` com `prohibition_uninterpreted`. | Reavaliado em `3bb71cf`; regressão nova. |
| C7 | PASS | `tests/integrations/report/render.unit.test.mjs:14–21`: texto/Markdown citam hash, linha, evento, contrato, timeline e limites, sem percentual ou raciocínio privado; JSON v1 preserva fonte; `:34`: erro/correção/lacuna; `:41–44`: fonte `[1]` heurística é preservada e `nome observado.*evento #1.*hipótese` aparece nos dois formatos. | Reavaliado em `3bb71cf`; regressão nova. |
| C8 | PASS | `tests/integrations/report/report.cli.test.mjs:30–40`: três formatos retornam 0, JSON v1, repetição idêntica e captura/skill inalteradas. | Reavaliado pelo consumidor de renderização tocada; asserções carregadas de `0548aa9`, prova reexecutada em `3bb71cf`. |
| C9 | PASS | `tests/integrations/report/report.cli.test.mjs:48–51`: exit exato, erro JSON fechado, stderr vazio e ausência de eco; `:53–65` cobrem 2/3/4; `:69–71` cobrem 5. | Julgamento carregado de `0548aa9`; prova reexecutada em `3bb71cf`. |
| C10 | PASS | `tests/integrations/report/report.e2e.test.mjs:40–47`: CLI real retorna 0, vetor exato contém os seis estados, correção mantém falha, ausência cita `[]`, limite de `SKILL.md` permanece e timeline traz evidência. | Reavaliado pelo pipeline compartilhado tocado; prova reexecutada em `3bb71cf`. |

## Três achados da revisão formal

| Cenário | Esperado | Atual em `3bb71cf` | Resultado |
| --- | --- | --- | --- |
| Fence de quatro crases contém linha de três crases e item `- Run ...` ainda no bloco. | O item interno não vira instrução. | `instructions.mjs:35–41` guarda marcador/comprimento e só fecha com comprimento suficiente, mesmo caractere e sufixo vazio; `instructions.unit.test.mjs:24–26` exige só a instrução fora do bloco. | Resolvido; C2 PASS. |
| `npm test` falha e `npm deploy` executa apesar de `do not run`. | Não declarar `sufficient`; se negação não for interpretada, ficar inconclusivo. | `evaluate.mjs:5,91–103` reconhece a proibição antes de avaliar ações e retorna `inconclusive`; `evaluate.unit.test.mjs:107–114` exige isso para condição e proibição direta. `render.mjs:25` explicita o motivo. | Resolvido; C6 PASS. |
| Nome observado da skill aparece em texto/Markdown. | Citar sequência de origem e força heurística quando aplicável. | `skill-source.mjs:80–88` leva `evidence`/`strength` das operações; `evaluate.mjs:130` preserva; `render.mjs:71–79` cita evento e força na linha Skill. `skill-source.unit.test.mjs:28` e `render.unit.test.mjs:41–44` comprovam os elos. | Resolvido; C1/C7 PASS. |

## Superfícies adicionais e limites

`docs/report.md` descreve as três regras novas e `.checks/issue-7-relatorios.build.md` registra as provas do autor; não alteram fonte vinculante nem checklist. `git diff --check a1f855b..3bb71cf` passou. A árvore estava limpa antes da escrita deste relatório. Não repeti `npm test` completo nesta rodada; o lote C1–C10 e a auditoria do diff cobrem as superfícies alteradas. A execução completa informada no build é prova do autor, não execução independente desta rodada. Injeção de falhas e juízos de `Coverage`/`Test policy` não se aplicam ao perfil `light`.
