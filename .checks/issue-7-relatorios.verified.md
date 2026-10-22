# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados.
**Profile**: light.
**HEAD**: 60589a8513e6c8e9f7083b7a9ead7a6aa77c4b5a.
**Diff range**: a1f855b..HEAD (entrega); 10cf97b..HEAD (extensão autorizada do teto após a revisão formal #30).
**Round**: 38 — scoped; todas as provas T7 repetidas no HEAD.
**Verifier**: subagente independente; somente este relatório foi editado.
**Gate formal**: 30 tentativas consumidas e preservadas; o proprietário autorizou até 35 somente para a #7. A revisão #30 pediu correção. Este PASS não substitui uma revisão formal `ready`.

## Fontes e alcance

Li AGENTS.md, `tlc-implement/references/verify.md`, `.tasks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.md`, o contexto salvo da issue com oito comentários, `docs/report.md` e o diff. A issue e o plano continuam como fontes de C1–C10. O comentário 6300606867 autoriza o snapshot de leitura; 6297902519 exclui alterações nos pilotos; 6342492981 autoriza até 35 tentativas formais exclusivas da #7. Esta rodada examina a mudança do teto. O diff desde 10cf97b não toca produto nem testes T7; os julgamentos C1–C10 são carregados da rodada 37 naquele commit, e todas as provas T7 foram repetidas no HEAD. Não há fonte de UI vinculante, seção Coverage ou seção Test policy. Comparação de UI e injeção de falhas pertencem aos perfis ui/standard. `CONTRIBUTING.md` não existe no checkout.

## Provas executadas no HEAD

- `node --test tests/integrations/report/*.test.mjs`: exit 0; 100/100 passaram, 0 falhas, 0 skips. O runner exibiu nominalmente T7-C1 a T7-C10 e as quatro regressões da correção funcional anterior.
- `npm run test:code-review` fora do sandbox: exit 0; 16/16 passaram, 0 falhas, 0 skips. Inclui C6 de limite, override e preservação do histórico.
- `npm run test:governance` fora do sandbox: exit 0; 6/6 passaram, 0 falhas, 0 skips.
- Privacidade 37/37, correlação unitária 55/55 e snapshot do store 2/2 fora do sandbox são carregados da rodada 37 em 10cf97b, não executados novamente: o diff atual não toca essas superfícies. Naquela rodada, o snapshot falhou dentro do sandbox antes das asserções porque `start` devolveu `io_failure`, e passou fora dele.
- `git diff --check a1f855b..HEAD`: exit 0. `git status --porcelain` estava vazio antes da escrita deste relatório.
- A suíte ampla de integração não tem prova verde neste sandbox: a rodada 27 encontrou EPERM ao criar symlink; o builder registrou falha isolada de I4-C38 no sandbox e sucesso fora dele. Não atribuo aprovação ampla a esses resultados.
- O registro de build documenta o C6 novo falhando 0/1 antes da mudança do motor e passando 1/1 depois. Conferi o registro, sem atribuir a mim a execução vermelha. O estado da revisão formal contém 30 tentativas e status `changes_requested` na última; não executei revisão formal.

## Checks

| Check | Asserção decisiva no HEAD | Resultado |
| --- | --- | --- |
| C1 | `skill-source.unit.test.mjs:31–38` afirma identificação `observed_name`/`explicit_path`, SHA-256 dos bytes, linha 2 e arquivo inalterado; `report.e2e.test.mjs:67–68` atravessa a CLI com nome Unicode. | PASS |
| C2 | `instructions.unit.test.mjs:14–18` compara exatamente os quatro tipos, linhas e heading, ignora fence e proíbe execução da referência; `:32–36` exige os dois comandos de continuação. | PASS |
| C3 | `skill-source.unit.test.mjs:74–88` exige códigos fechados para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; `report.cli.test.mjs:132–135` exige erro fechado sem eco. | PASS |
| C4 | `evaluate.unit.test.mjs:22–26` compara os seis estados, linhas, sequências, motivo, hash e orientação não executável. | PASS |
| C5 | `evaluate.unit.test.mjs:328–331` exige `inconclusive`/`alternative_commands_unresolved`, correção `[1,2]→[3,4]` e todos os eventos para `npm test` ou `npm run build`; `:341–343` conserva o par com alternativa redigida; `:173–186` exige prova positiva de todos os comandos coordenados. | PASS |
| C6 | `evaluate.unit.test.mjs:537–540` conserva a correção `[3,4]→[5,6]` após gatilho em ação alternativa sem afirmar escolha; `:475–478` rejeita correção de tentativas simultâneas; `:135–138` exige condição falsa só com prova explícita. | PASS |
| C7 | `render.unit.test.mjs:49–54` exige que texto e Markdown digam que a escolha não foi avaliada, citem a correção `[1,2]→[3,4]`, e que JSON carregue o mesmo par; `:14–21` exige fontes, versões e limites, sem percentual nem raciocínio privado. | PASS |
| C8 | `report.cli.test.mjs:30–41` exige três formatos, repetição idêntica e captura/skill inalteradas; `:80–92` exige zero chamadas a `writeExclusive`. `store.unit.test.mjs:26–36` verifica snapshot sem escrita e `:39–53` conflito, ambos passaram fora do sandbox. `report.cli.test.mjs:70–77` impede vazamento entre subitens. | PASS |
| C9 | `report.cli.test.mjs:115–124` exige lock/4 e captura inválida/3; `:127–156` exige saídas 2/3/4/5, código fechado, stderr vazio e sem eco. | PASS |
| C10 | `report.e2e.test.mjs:40–48` atravessa captura, hook e CLI; exige seis estados, correção, sequências e ressalva de que ler SKILL.md não comprova carregamento. | PASS |

## Achado da revisão formal #30

O cenário de duas operações nativas sucessivas para `npm test`, uma falha em eventos 1–2 e outra bem-sucedida em 3–4, com a instrução `Run npm test or npm run build`, está em `evaluate.unit.test.mjs:322–331`. A avaliação permanece `inconclusive`/`alternative_commands_unresolved`, conserva `corrections: [{failed:[1,2], corrected:[3,4]}]` e cita os quatro eventos. `evaluate.mjs:138–142` propaga o par já calculado sem escolher entre as alternativas. `render.unit.test.mjs:39–54` confirma a explicação e o par em texto, Markdown e JSON. Os ramos também apontados pela revisão têm provas próprias: `evaluate.unit.test.mjs:334–343` conserva a correção de uma opção quando há conteúdo redigido, com `command_redacted`; `:530–540` conserva a correção da ação após gatilho sem afirmar qual alternativa foi escolhida. Não encontrei perda do par no cenário apontado.

## Exceção de revisão 30→35

O contexto salvo da issue contém oito comentários; o último registra literalmente a autorização "Sim, até 35 tentativas", preservando as 30 anteriores e os pilotos intocados. `code-review.config.json:43–48` mantém somente a #7 em `maxRounds: 35` com URL do comentário; `profiles.light/ui/direct` permanecem em 2. `review.mjs:490–501` valida perfil, aprovação, inteiro maior que o padrão e teto 35. `review.test.mjs:674–711` rejeita override de outra issue e 36, aceita 35 após esgotar o teto anterior, mantém o padrão em 2 e verifica o contador de 3 para 4. O teste C6 executou e passou na suíte 16/16. O registro do builder documenta red 0/1 com motor antigo e green 1/1 com o novo, que não repeti por exigir modificar uma cópia do motor. A documentação local em AGENTS.md, README.md e `scripts/code-review/README.md` aponta a autorização e a exceção; as outras atualizações do core permanecem sob regra de igualdade. O estado de revisão ainda contém exatamente 30 tentativas, sem reinício nem nova revisão formal nesta verificação.

## Limites e política local

A proteção de texto sem projeção sanitizada segura pode omitir outras instruções da mesma skill; o relatório declara essa perda de cobertura sem afirmar omissão de execução. A exceção de core vendorizado permanece exclusiva da #7; não houve edição dos pilotos por esta verificação. A comparação de hashes com os pilotos foi registrada pelo builder, mas não foi repetida aqui; entre os cinco arquivos do core, o diff atual altera somente os três cobertos pela exceção. Esta verificação usa o perfil light e não inclui injeção de falhas. Há autorização para até cinco novas tentativas formais, porém ainda falta uma revisão `ready` do novo HEAD antes de push, PR ou merge.
