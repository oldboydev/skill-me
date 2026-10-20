# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10 comprovados no HEAD `be7c8bae662571242427e9b26a936d00da922790`.
**Profile**: light.
**Diff range**: `a1f855b..be7c8ba` (entrega); `e958d04..be7c8ba` (correção da sexta revisão).
**Round**: 8 — scoped, com todas as provas repetidas no HEAD.
**Verifier**: subagente independente; somente este arquivo foi editado.

## Fontes e alcance

Li `AGENTS.md`, `tlc-implement/references/verify.md`, `.checks/issue-7-relatorios.md`, `.tasks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.build.md`, a issue exportada em `.checks/code-review/issue-7/context.json`, os dois achados em `.checks/code-review/issue-7/response.json`, o diff completo `a1f855b..HEAD` e o diff recente `e958d04..HEAD`. Conferi implementação, documentação e asserções dos testes, além dos contratos existentes de snapshot e ciclo de vida. `rg --files` encontrou apenas o `AGENTS.md` da raiz e nenhum `CONTRIBUTING.md`.

A issue exportada contém oito critérios de aceite, decompostos em C1–C10. O checklist não contém `Coverage` nem `Test policy`; a busca por ambos os títulos retornou zero ocorrência. A comparação estrutural de fonte de UI e a injeção de falhas pertencem a `standard`/`ui`, portanto não foram executadas sob `light`. O documento `AGENT_SKILL_DEBUGGER_SPEC (1).md` é descrito pela issue como guia não vinculante. O relato do autor em `.build.md` não foi usado como prova independente.

## Provas executadas no HEAD

Uma única invocação: `node --test --test-name-pattern=T7-C tests/integrations/report/*.test.mjs`. Exit 0: **37 testes, 37 passes, 0 falhas, 0 skips, 0 todo**. O runner listou individualmente testes de T7-C1 a T7-C10, inclusive as duas regressões novas. As localizações abaixo foram conferidas com `rg -n` no HEAD. C1–C4 e C7–C10 carregam as conclusões independentes de `eed4eba`, após repetição das provas; as citações de C5/C6 foram atualizadas para o arquivo alterado.

| Check | Asserção que decide o critério | Resultado |
| --- | --- | --- |
| C1 | `tests/integrations/report/skill-source.unit.test.mjs:31–38`: `assert.equal(observed.identification, "observed_name")`, fonte com evento 1/vínculo nativo, SHA-256 dos bytes, linha/heading `[2,"Build"]`, `explicit_path` com nome divergente, bytes e mtime preservados. `:46–49` aceita Unicode e recusa travessia; `report.e2e.test.mjs:67–68` prova identificação pela captura na CLI. | PASS |
| C2 | `tests/integrations/report/instructions.unit.test.mjs:14–18`: vetor exato de `action`, `validation`, `guidance`, `condition`, linhas/headings/comandos e `assert.equal(existsSync(marker), false)`; `:26` exclui itens dentro do fence; `:32–36` conserva dois comandos na continuação. | PASS |
| C3 | `tests/integrations/report/skill-source.unit.test.mjs:74–88`: `assert.rejects` exige `e.code === code && e.message === code` para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1. `report.cli.test.mjs:48–51` exige envelope de erro fechado e sem eco. | PASS |
| C4 | `tests/integrations/report/evaluate.unit.test.mjs:22–26`: `assert.deepEqual(states(report), ["sufficient", "contradicted", "partial", "partial", "unobserved", "not_applicable", "inconclusive", "not_applicable"])`, linhas `[2,3,4,5,6,7,8,9]`, eventos `[1,2]`, motivo `guidance_not_step` e hash em cada fonte. | PASS |
| C5 | `tests/integrations/report/evaluate.unit.test.mjs:37–39` exige sucesso, falha nativa, parcial, silêncio e limite de leitura; **`:48–50` exige `["partial"]`, `heuristic_operation` e eventos `[1,2]` para falha heurística**. `:106–109`, `:115–117`, `:125–131` e `:141–143` exigem limites de privacidade, comando omitido, contexto coerente e todos os comandos comprovados. | PASS |
| C6 | `tests/integrations/report/evaluate.unit.test.mjs:60–62` exige falso explícito/inconclusivo/correção com ambas as sequências; `:160–172` exige ação posterior à falha e preserva o gatilho após retry; `:181–184` recusa correção simultânea; `:214–215` deixa condição composta inconclusiva. **`:221–223` exige `["inconclusive"]`, `command_redacted` e eventos `[]` para gatilho removido e ação isolada negativa.** | PASS |
| C7 | `tests/integrations/report/render.unit.test.mjs:14–21` exige hash, linha, eventos, versão/contrato, timeline, avaliações, limites e JSON v1, sem percentual; `:34` exige erro/correção/lacuna; `:41–44` rotula hipótese; `:55–59`, `:69–71` e `:80–82` exigem exit 1 e limitações de conteúdo com fonte. `skill-source.unit.test.mjs:63,67–68` cita nomes ambíguos. | PASS |
| C8 | `tests/integrations/report/report.cli.test.mjs:30–40`: os três formatos saem 0; JSON exige `[1,"explicit_path","unobserved"]`, timeline vazia, repetição idêntica, árvore da captura e bytes da skill inalterados. | PASS |
| C9 | `tests/integrations/report/report.cli.test.mjs:48–51` exige exit exato, JSON `{schemaVersion:1,command:"report",status:"error",error:{code}}`, stderr vazio e nenhum eco; `:53–65` exercita códigos 2/3/4; `:69–71`, código 5 para E/S. | PASS |
| C10 | `tests/integrations/report/report.e2e.test.mjs:38,41–48` atravessa ingestão, captura, correlação e CLI; exige os seis estados no vetor de oito avaliações, correção, eventos e limite de leitura de `SKILL.md`. Os três formatos da mesma CLI são provados por C8; `:65–68` prova resolução de nome observado Unicode. | PASS |

## Dois achados da sexta revisão

| Cenário anterior | Mudança no HEAD | Prova independente no HEAD |
| --- | --- | --- |
| Resultado negativo ligado por `itemId` heurístico era chamado de contradição. | `src/integrations/report/evaluate.mjs:69` agora exige `last.strength === "native"` para `contradicted`; resultado heurístico cai em `partial`. | `evaluate.unit.test.mjs:42–50` executou e exigiu `partial`, `heuristic_operation`, eventos `[1,2]`. |
| Condição com gatilho removido pela política era julgada pela falha da ação restante. | `src/integrations/report/evaluate.mjs:128` retorna `inconclusive/command_redacted` antes de avaliar a ação quando a instrução é condição. | `evaluate.unit.test.mjs:218–223` executou e exigiu `inconclusive`, `command_redacted`, eventos `[]`. |

O `.build.md` relata lote red de duas falhas no código anterior; não o reexecutei e não o conto como prova minha. Os dois testes novos discriminam diretamente os estados incorretos descritos na revisão.

## Swept existing e limites

- Authorization: `report/command.mjs:28–50` exige `--root` e `--capture` pelo parser comum e aceita skill explícita ou candidato local; C1/C3/C9 provam resolução e erros.
- Concurrency/ordering: `privacy/store.mjs:379–385` exporta estado e registros sob lock; `traces/replay.mjs:13–16` congela o snapshot e numera registros a partir de 1. C6 prova a ordem da correção. Esses contratos não mudaram no diff da entrega.
- Data lifecycle: `privacy/lifecycle.mjs:20–30` decide stop/disable; `privacy/store.mjs:596–605,614–650` contém delete/prune. C8 prova que a consulta não altera captura ou skill. Não reexecutei testes de #5/#8.
- Dependência externa: `report/command.mjs:53–77` apenas encadeia replay, leitura local, avaliação e renderização; C8/C10 atravessam a CLI. Não há prova dinâmica universal de ausência de rede, e o checklist não a exige como teste separado.
- Os seis estados exigidos aparecem em asserções exatas de C4 e C10. Não há conjunto `Coverage` nem política de teste específica a reconciliar.

`git diff --check a1f855b..HEAD` e `git diff --check e958d04..HEAD`: exit 0. A árvore estava limpa antes da escrita deste relatório. Não executei `npm test` completo nem a revisão formal; os números correspondentes em `.build.md` permanecem relato do autor. Nenhuma prova selecionada teve skip ou omissão.
