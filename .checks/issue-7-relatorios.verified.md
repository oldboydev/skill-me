# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados.
**Profile**: light.
**HEAD**: 10cf97b36ff94360b52d3930885f1913ad6541a2.
**Diff range**: a1f855b..HEAD (entrega); 4c7b239..HEAD (correção da revisão formal #30).
**Round**: 37 — scoped; todas as provas T7 repetidas no HEAD.
**Verifier**: subagente independente; somente este relatório foi editado.
**Gate formal**: as 30 tentativas autorizadas foram consumidas; a revisão #30 pediu correção. Este PASS não substitui uma revisão formal `ready`.

## Fontes e alcance

Li AGENTS.md, `tlc-implement/references/verify.md`, `.tasks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.md`, o contexto salvo da issue com sete comentários, `docs/report.md` e o diff. A issue e o plano continuam como fontes de C1–C10. O comentário 6300606867 autoriza o snapshot de leitura; 6297902519 exclui alterações nos pilotos; 6331180478 autoriza até 30 tentativas formais exclusivas da #7. Esta rodada examina o achado da revisão #30. Julgamentos não afetados pelo diff são carregados da rodada 36 em 0defb48; suas provas T7 foram repetidas no HEAD. Não há fonte de UI vinculante, seção Coverage ou seção Test policy. Comparação de UI e injeção de falhas pertencem aos perfis ui/standard. `CONTRIBUTING.md` não existe no checkout.

## Provas executadas no HEAD

- `node --test tests/integrations/report/*.test.mjs`: exit 0; 100/100 passaram, 0 falhas, 0 skips. O runner exibiu nominalmente T7-C1 a T7-C10 e as quatro regressões do último diff.
- `node --test tests/integrations/privacy/policy.unit.test.mjs`: exit 0; 37/37 passaram, 0 falhas, 0 skips.
- Unitários de correlação (coverage, operations, skills, subagents, timeline): exit 0; 55/55 passaram, 0 falhas, 0 skips.
- `node --test --test-name-pattern='snapshot' tests/integrations/privacy/store.unit.test.mjs` fora do sandbox: exit 0; 2/2 passaram, 0 falhas, 0 skips. No sandbox, os mesmos dois testes falharam antes de suas asserções, pois `start` devolveu `io_failure` ao preparar a captura. Os testes T7 da CLI, que criam a captura em `.checks`, passaram dentro do sandbox.
- `git diff --check a1f855b..HEAD`: exit 0. `git status --porcelain` estava vazio antes da escrita deste relatório.
- Motor de revisão 16/16 e governança 6/6 são carregados da rodada 31 em 2232e28; o último diff toca somente avaliação, seus testes e registro de build. A tentativa desta rodada de `npm run test:governance` falhou ao criar `.git/config` em temp com `Permission denied`; `npm run test:code-review` foi interrompido após não devolver saída no sandbox. Não atribuo aprovação nova a esses comandos. A suíte ampla de integração também não tem prova verde neste sandbox: a rodada 27 encontrou EPERM ao criar symlink; o builder registrou falha isolada de I4-C38 no sandbox e sucesso fora dele.
- O registro de build documenta regressão vermelha antes da correção e verde depois. Conferi o registro, sem atribuir a mim a execução vermelha. O estado da revisão formal contém 30 tentativas e status `changes_requested` na última; não executei revisão formal.

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

## Limites e política local

A proteção de texto sem projeção sanitizada segura pode omitir outras instruções da mesma skill; o relatório declara essa perda de cobertura sem afirmar omissão de execução. A exceção de core vendorizado permanece exclusiva da #7; não houve edição dos pilotos. Esta verificação usa o perfil light e não inclui injeção de falhas. O teto formal de 30 está esgotado e falta decisão específica do proprietário para nova tentativa, seguida de revisão `ready`, antes de push, PR ou merge.
