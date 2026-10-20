# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10 comprovados no HEAD `156c20e3abcf2544fcce630085b56805fe9553f6`.
**Profile**: light.
**Diff range**: `a1f855b..156c20e` (entrega); `8b31e41..156c20e` (correções da décima revisão).
**Round**: 12 — scoped; todas as provas repetidas no HEAD.
**Verifier**: subagente independente; somente este arquivo foi editado.

## Fontes, escopo e método

Li `AGENTS.md`, `C:\Users\paulo\.agents\skills\tlc-implement\references\verify.md`, checklist, plano, build, `docs/report.md`, os dois achados em `.checks/code-review/issue-7/response.json`, a lista e estatística do diff `a1f855b..HEAD` e o conteúdo do diff recente `8b31e41..HEAD`. A verificação anterior aprovou `7fdde43` e foi registrada em `8b31e41`. O diff recente muda o leitor de instruções e o avaliador, quatro testes, documentação e build. Rejulguei C2, C5, C6 e C7 e carreguei as conclusões das superfícies não alteradas de `7fdde43`; executei novamente todas as provas C1–C10 no HEAD.

O checklist não contém seções `Coverage` nem `Test policy`: `rg -n 'Coverage|Test policy' .checks/issue-7-relatorios.md .tasks/issue-7-relatorios.md` não encontrou linhas. Comparação de fonte vinculante de UI e injeção de falhas pertencem aos perfis `standard`/`ui`; não se aplicam a `light`. Os números de `.build.md` são relato do autor, não prova executada por este Verifier.

## Provas no HEAD

Uma invocação: `node --test tests/integrations/report/*.test.mjs`. Exit 0: **50 testes, 50 passes, 0 falhas, 0 skips, 0 todo**. O runner listou cada teste C1–C10 nominalmente. Localizei as asserções com `rg -n -C`; cada linha abaixo aponta a expressão que decide o critério.

| Check | Asserção decisiva no HEAD | Resultado |
| --- | --- | --- |
| C1 | `tests/integrations/report/skill-source.unit.test.mjs:31–38`: `assert.equal(observed.identification, "observed_name")`, fonte nativa `[1]`, hash SHA-256 dos bytes, linha/heading `[2,"Build"]`, `explicit_path` com divergência e bytes/mtime inalterados; `report.e2e.test.mjs:65–68`: modo automático Unicode. | PASS (carried from `7fdde43`; prova repetida) |
| C2 | `tests/integrations/report/instructions.unit.test.mjs:14–18`: vetor dos quatro tipos/linhas/headings/comandos e `assert.equal(existsSync(marker), false)`; `:58–61`: `assert.deepEqual(instructions.map((item) => [item.line, item.kind, item.commands]), [[1, "action", ["npm test"]], [2, "condition", ["npm test", "npm run fix"]]])`. | PASS (refreshed at `156c20e`) |
| C3 | `tests/integrations/report/skill-source.unit.test.mjs:74–88`: `assert.rejects` exige `e.code === code && e.message === code` para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; `report.cli.test.mjs:48–51`: erro sem eco. | PASS (carried from `7fdde43`; prova repetida) |
| C4 | `tests/integrations/report/evaluate.unit.test.mjs:22–26`: `assert.deepEqual(states(report), ["sufficient", "contradicted", "partial", "partial", "unobserved", "not_applicable", "inconclusive", "not_applicable"])`, linhas `[2,3,4,5,6,7,8,9]`, eventos `[1,2]`, `guidance_not_step` e SHA-256 em cada fonte. | PASS (carried from `7fdde43`; prova repetida) |
| C5 | `tests/integrations/report/evaluate.unit.test.mjs:37–39`: estados `["sufficient", "contradicted", "partial", "unobserved", "unobserved"]`; `:60–62`: `assert.deepEqual(states(report), ["sufficient", "not_applicable"])`, linhas `[1,2]`, eventos `[[1,2],[1,2]]` para condição aninhada falsa; `:71–73`: vínculo heurístico parcial; `:120–122`, `:148–154`, `:164–166`: conflitos, sessões e falha em comando composto. | PASS (refreshed at `156c20e`) |
| C6 | `tests/integrations/report/evaluate.unit.test.mjs:83–85`: condição falsa explícita, desconhecida e correção `{failed:[3,4],corrected:[5,6]}`; `:204–207`: sobreposição sem correção; `:262–275`: último gatilho verdadeiro e tentativa aberta; `:284–286`: `assert.deepEqual(report.evaluations[0].corrections, [{ failed: [1, 2], corrected: [3, 4] }])` apesar do evento aberto #5 e estado `partial`. | PASS (refreshed at `156c20e`) |
| C7 | `tests/integrations/report/render.unit.test.mjs:14–21`: hash/linha/evento/versão/timeline/limites, `json.reportVersion === 1`; `:92–93`: causas exatas de cobertura parcial em texto e Markdown; `:104–106`: lacuna #1 e operação aberta; `:121–124`: `assert.match(output, /Correção observada: evento #1, evento #2.*evento #3, evento #4/)` nos dois formatos após tentativa aberta. | PASS (refreshed at `156c20e`) |
| C8 | `tests/integrations/report/report.cli.test.mjs:30–40`: três formatos saem 0, JSON exige `[1,"explicit_path","unobserved"]`, timeline vazia, repetição idêntica, árvore da captura e bytes da skill inalterados. | PASS (carried from `7fdde43`; prova repetida) |
| C9 | `tests/integrations/report/report.cli.test.mjs:48–51`: exit e JSON fechado exatos, sem stderr/eco; `:53–66`: saídas 2/3/4, inclusive flag sem valor → `missing_flag_value`/2; `:69–72`: E/S → 5. | PASS (carried from `7fdde43`; prova repetida) |
| C10 | `tests/integrations/report/report.e2e.test.mjs:38,41–48`: hooks, captura, correlação e CLI; vetor exato dos seis estados em oito avaliações, correção, sequência e limite de leitura de `SKILL.md`. C8 prova os três formatos da CLI. | PASS (carried from `7fdde43`; prova repetida) |

## Dois achados da décima revisão

| Achado | Código no HEAD | Asserção no HEAD | Veredicto |
| --- | --- | --- | --- |
| Item aninhado entrava na ação anterior. | `src/integrations/report/instructions.mjs:7,58–64` reconhece item com quatro espaços quando há lista ativa e cria entrada com linha/tipo próprios. | `instructions.unit.test.mjs:55–61` exige ação na linha 1 e condição na linha 2; `evaluate.unit.test.mjs:57–62` exige `sufficient` para ação e `not_applicable` para condição, com fontes separadas. | Resolvido |
| Tentativa aberta ocultava correção concluída. | `src/integrations/report/evaluate.mjs:57–69,78` calcula pares nativos de falha/sucesso antes de julgar a última tentativa aberta. | `evaluate.unit.test.mjs:278–286` exige `partial`, correção `[1,2] → [3,4]` e fonte incluindo #5; `render.unit.test.mjs:110–124` exige a correção em texto e Markdown. | Resolvido |

O `.build.md` relata quatro testes vermelhos antes da correção; não executei o código anterior e não conto esse relato como prova minha. As quatro regressões novas passaram no HEAD e suas asserções distinguem os resultados incorretos apontados.

## Swept existing e limites

- Authorization: `src/integrations/report/command.mjs:28–46` reaproveita a validação de `--root`/`--capture` e seleciona `--skill` explícito ou candidato local; C1/C3/C9 provam as fronteiras relevantes.
- Concurrency/ordering: `src/integrations/privacy/store.mjs:379–385` exporta estado e registros sob lock; `src/integrations/traces/replay.mjs:13–16` congela o snapshot e numera registros desde 1. C6 prova a ordem de resultados sobrepostos no relatório.
- Data lifecycle: `src/integrations/privacy/lifecycle.mjs:20–32` contém stop/disable; `src/integrations/privacy/store.mjs:596–605,614–650` contém delete/prune. C8 comprova que a consulta não altera captura ou skill. A suíte ampla de integrações repetiu também os testes da #5/#8.
- Dependência externa: `src/integrations/report/command.mjs:53–77` encadeia replay, leitura local, avaliação e renderização; C8/C10 atravessam a CLI. Ausência universal de rede não foi provada dinamicamente; não há provedor externo nessa implementação.
- O conjunto dos seis estados é afirmado exatamente em C4 e C10. Nenhum conjunto `Coverage` ou política de teste própria exige reconciliação adicional no perfil `light`.

`npm run test:integrations` passou fora do sandbox: 347 testes, 340 passes, 0 falhas e 7 skips condicionais de plataforma/ambiente. A primeira execução da suíte ampla dentro do sandbox falhou com `EPERM` ao escrever no Temp isolado do Windows, inclusive em fixtures antigas da #4/#8; a repetição fora do sandbox passou sem alteração de código ou asserções. `git diff --check a1f855b..HEAD` e `git diff --check 8b31e41..HEAD`: exit 0. A árvore estava limpa antes desta escrita e as provas não deixaram arquivos no workspace. Não executei `npm test` completo nem outra revisão formal; o teto de dez revisões formais foi atingido. Nenhuma prova T7 selecionada teve skip ou omissão.
