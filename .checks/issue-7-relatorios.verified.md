# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados.
**Profile**: light.
**HEAD**: 2c39b23638f64704a57089498b9b21201a7855fa.
**Diff range**: a1f855b..HEAD (entrega); b9dceb7..HEAD (correção da revisão formal #32).
**Round**: 40 — scoped; todas as provas T7 repetidas no HEAD.
**Verifier**: subagente independente; somente este relatório foi editado.
**Gate formal**: 32 tentativas consumidas e preservadas; o proprietário autorizou até 35 somente para a #7. A revisão #32 pediu correções. Este PASS não substitui uma revisão formal `ready`.

## Fontes e alcance

Li AGENTS.md, `tlc-implement/references/verify.md`, `.tasks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.md`, o contexto salvo da issue com oito comentários, `docs/report.md` e o diff. A issue e o plano continuam como fontes de C1–C10. O comentário 6300606867 autoriza o snapshot de leitura; 6297902519 exclui alterações nos pilotos; 6342492981 autoriza até 35 tentativas formais exclusivas da #7. Esta rodada examina o achado da revisão #32 e o alcance do diff em avaliação, testes e documentação. C1–C3 e C8–C10 não tiveram suas superfícies alteradas; seus julgamentos são carregados da rodada 39 em b9dceb7. C4–C7 compartilham a avaliação alterada e tiveram as provas T7 repetidas no HEAD. Não há fonte de UI vinculante, seção Coverage ou seção Test policy. Comparação de UI e injeção de falhas pertencem aos perfis ui/standard. `CONTRIBUTING.md` não existe no checkout.

## Provas executadas no HEAD

- `node --test tests/integrations/report/*.test.mjs`: exit 0; 107/107 passaram, 0 falhas, 0 skips. O runner exibiu nominalmente T7-C1 a T7-C10, inclusive os três testes novos para a revisão #32 e os controles de ação ausente e alternativa condicional.
- Motor de revisão 16/16 e governança 6/6 são carregados da rodada 38 em 60589a8, não executados novamente: o diff atual não toca essas superfícies.
- Privacidade 37/37, correlação unitária 55/55 e snapshot do store 2/2 fora do sandbox são carregados da rodada 37 em 10cf97b, não executados novamente: o diff atual não toca essas superfícies. Naquela rodada, o snapshot falhou dentro do sandbox antes das asserções porque `start` devolveu `io_failure`, e passou fora dele.
- `git diff --check a1f855b..HEAD`: exit 0. `git status --porcelain` estava vazio antes da escrita deste relatório.
- A suíte ampla de integração não tem prova verde neste sandbox: a rodada 27 encontrou EPERM ao criar symlink; o builder registrou falha isolada de I4-C38 no sandbox e sucesso fora dele. Não atribuo aprovação ampla a esses resultados.
- O registro de build documenta três regressões falhando 0/3 antes da correção e passando 3/3 depois. Conferi o registro, sem atribuir a mim a execução vermelha. O estado da revisão formal contém 32 tentativas e status `changes_requested` na última; não executei revisão formal.

## Checks

| Check | Asserção decisiva no HEAD | Resultado |
| --- | --- | --- |
| C1 | `skill-source.unit.test.mjs:31–38` afirma identificação `observed_name`/`explicit_path`, SHA-256 dos bytes, linha 2 e arquivo inalterado; `report.e2e.test.mjs:67–68` atravessa a CLI com nome Unicode. | PASS |
| C2 | `instructions.unit.test.mjs:14–18` compara exatamente os quatro tipos, linhas e heading, ignora fence e proíbe execução da referência; `:32–36` exige os dois comandos de continuação. | PASS |
| C3 | `skill-source.unit.test.mjs:74–88` exige códigos fechados para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; `report.cli.test.mjs:132–135` exige erro fechado sem eco. | PASS |
| C4 | `evaluate.unit.test.mjs:22–26` compara os seis estados, linhas, sequências, motivo, hash e orientação não executável. | PASS |
| C5 | `evaluate.unit.test.mjs:293–296` exige `partial`/`commands_different_contexts` e eventos 1–6 para chamadas sobrepostas em s1 combinadas com falha em s2; `:342–345` preserva correção de uma alternativa sem afirmar escolha; `:173–186` exige prova positiva de todos os comandos coordenados. | PASS |
| C6 | `evaluate.unit.test.mjs:516–520` exige `inconclusive`/`condition_unresolved`, correção `[1,2]→[3,4]` e eventos 1–5 após tentativa aberta; `:532–536` exige o par e eventos 1–6 com outra sessão; `:491–494` e `:504–507` cobrem ação ausente e alternativa; `:135–138` exige condição falsa só com prova explícita. | PASS |
| C7 | `render.unit.test.mjs:88–96` exige correção anterior em texto, Markdown e JSON com tentativa aberta e fontes 1–5; `:71–78` preserva correção do gatilho com ação suficiente, com fontes 1–6; `:14–21` exige fontes, versões e limites. | PASS |
| C8 | `report.cli.test.mjs:30–41` exige três formatos, repetição idêntica e captura/skill inalteradas; `:80–92` exige zero chamadas a `writeExclusive`. `store.unit.test.mjs:26–36` verifica snapshot sem escrita e `:39–53` conflito, ambos passaram fora do sandbox. `report.cli.test.mjs:70–77` impede vazamento entre subitens. | PASS |
| C9 | `report.cli.test.mjs:115–124` exige lock/4 e captura inválida/3; `:127–156` exige saídas 2/3/4/5, código fechado, stderr vazio e sem eco. | PASS |
| C10 | `report.e2e.test.mjs:40–48` atravessa captura, hook e CLI; exige seis estados, correção, sequências e ressalva de que ler SKILL.md não comprova carregamento. | PASS |

## Achado da revisão formal #30

O cenário de duas operações nativas sucessivas para `npm test`, uma falha em eventos 1–2 e outra bem-sucedida em 3–4, com a instrução `Run npm test or npm run build`, está em `evaluate.unit.test.mjs:336–345`. A avaliação permanece `inconclusive`/`alternative_commands_unresolved`, conserva `corrections: [{failed:[1,2], corrected:[3,4]}]` e cita os quatro eventos. `evaluate.mjs:138–142` propaga o par já calculado sem escolher entre as alternativas. `render.unit.test.mjs:39–54` confirma a explicação e o par em texto, Markdown e JSON. Os ramos também apontados pela revisão têm provas próprias: `evaluate.unit.test.mjs:348–357` conserva a correção de uma opção quando há conteúdo redigido, com `command_redacted`; `:599–609` conserva a correção da ação após gatilho sem afirmar qual alternativa foi escolhida. Não encontrei perda do par no cenário apontado.

## Achados da revisão formal #31

**Comandos em sessões distintas.** O cenário exato da revisão combina duas operações sobrepostas de `npm test` na sessão s1, positivas nos eventos 3–4, com uma falha de `npm run build` em s2 nos eventos 5–6. `evaluate.mjs:87–93` conserva o contexto único no retorno `overlapping_attempts`; `evaluate.unit.test.mjs:285–296` exige `partial`/`commands_different_contexts` e fontes 1–6, sem falsa contradição. O teste passou no lote T7.

**Correção do gatilho condicional.** `evaluate.mjs:177–184` junta a correção comprovada do gatilho com a da ação e inclui seus eventos nas fontes, sem alterar o estado da ação. `evaluate.unit.test.mjs:473–482` exige `sufficient`, correção `[1,2]→[3,4]` e fontes 1–6 quando `npm run fix` sucede. Os ramos `:485–494` e `:497–507` exigem o mesmo par quando a ação está ausente ou é alternativa inconclusiva. `render.unit.test.mjs:57–78` exige a correção em texto, Markdown e JSON. Os quatro testes novos, junto das asserções reforçadas de um teste anterior, passaram no lote T7.

## Achado da revisão formal #32

**Tentativa aberta após correção.** A skill condicional e as observações `npm test` falha em eventos 1–2, sucesso em 3–4 e início sem resultado em 5 produzem `inconclusive`/`condition_unresolved`, sem apagar a correção `[1,2]→[3,4]`. `evaluate.mjs:164–172` calcula pares por contexto antes do retorno antecipado e inclui todas as sequências do gatilho. `evaluate.unit.test.mjs:510–520` afirma estado, motivo, par e eventos 1–5. `render.unit.test.mjs:81–95` confirma que texto e Markdown mostram a correção e JSON contém par e fontes 1–5.

**Observação posterior em outra sessão.** `evaluate.unit.test.mjs:523–535` afirma `inconclusive`/`condition_unresolved`, o mesmo par da sessão s1 e eventos 1–6 após observação na sessão s2, sem par entre sessões. O retorno `multipleContexts` em `evaluate.mjs:167` usa os pares agrupados por origem, sessão e subagente. Os testes já existentes `evaluate.unit.test.mjs:485–507` continuam cobrindo ação ausente e escolha alternativa inconclusiva. Os três testes novos passaram no lote T7; o red 0/3 anterior é evidência registrada pelo builder, não execução minha.

## Exceção de revisão 30→35

O contexto salvo da issue contém oito comentários; o último registra literalmente a autorização "Sim, até 35 tentativas", preservando as 30 anteriores e os pilotos intocados. `code-review.config.json:43–48` mantém somente a #7 em `maxRounds: 35` com URL do comentário; `profiles.light/ui/direct` permanecem em 2. `review.mjs:490–501` valida perfil, aprovação, inteiro maior que o padrão e teto 35. `review.test.mjs:674–711` rejeita override de outra issue e 36, aceita 35 após esgotar o teto anterior, mantém o padrão em 2 e verifica o contador de 3 para 4. O teste C6 passou na suíte 16/16 da rodada 38. O registro do builder documenta red 0/1 com motor antigo e green 1/1 com o novo, que não repeti por exigir modificar uma cópia do motor. A documentação local em AGENTS.md, README.md e `scripts/code-review/README.md` aponta a autorização e a exceção; as outras atualizações do core permanecem sob regra de igualdade. O estado de revisão contém agora exatamente 32 tentativas, preservando o histórico.

## Limites e política local

A proteção de texto sem projeção sanitizada segura pode omitir outras instruções da mesma skill; o relatório declara essa perda de cobertura sem afirmar omissão de execução. A exceção de core vendorizado permanece exclusiva da #7; não houve edição dos pilotos por esta verificação. A comparação de hashes com os pilotos foi registrada pelo builder na mudança do teto, mas não foi repetida aqui; o diff desde b9dceb7 não altera os arquivos do core. Esta verificação usa o perfil light e não inclui injeção de falhas. Restam até três tentativas formais autorizadas, mas ainda falta uma revisão `ready` do novo HEAD antes de push, PR ou merge.
