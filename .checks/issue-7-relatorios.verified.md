# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados.
**Profile**: light.
**HEAD**: 0eea1f0dfff704323889490fab40b93b0bdf8706.
**Diff range**: a1f855b..HEAD (entrega); b32b29c..HEAD (correção da revisão formal #34).
**Round**: 42 — scoped; todas as provas T7 repetidas no HEAD.
**Verifier**: subagente independente; somente este relatório foi editado.
**Gate formal**: 34 tentativas consumidas e preservadas; o proprietário autorizou até 35 somente para a #7. A revisão #34 pediu correção. Este PASS não substitui uma revisão formal `ready`.

## Fontes e alcance

Li AGENTS.md, `tlc-implement/references/verify.md`, `.tasks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.md`, o contexto salvo da issue com oito comentários, `docs/report.md`, o estado da revisão e o diff. A issue e o plano continuam como fontes de C1–C10. O comentário 6300606867 autoriza o snapshot de leitura; 6297902519 exclui alterações nos pilotos; 6342492981 autoriza até 35 tentativas formais exclusivas da #7. Esta rodada examina o achado da revisão #34 e o alcance do diff em avaliação, testes, documentação e evidências. C1–C6 e C8–C10 não tiveram suas regras de produto alteradas; seus julgamentos anteriores foram confrontados com os testes repetidos no HEAD. C7, ligado diretamente ao texto alterado, foi reavaliado também no fluxo real de captura. Não há fonte de UI vinculante, seção Coverage ou seção Test policy. Comparação de UI e injeção de falhas pertencem aos perfis ui/standard. `CONTRIBUTING.md` não existe no checkout.

## Provas executadas no HEAD

- `node --test tests/integrations/report/*.test.mjs`: exit 0; 113/113 passaram, 0 falhas, 0 skips. O runner exibiu nominalmente T7-C1 a T7-C10, inclusive as duas regressões da revisão #34, os controles de contexto e os formatos.
- Motor de revisão 16/16 e governança 6/6 são carregados da rodada 38 em 60589a8, não executados novamente: o diff atual não toca essas superfícies.
- Privacidade 37/37, correlação unitária 55/55 e snapshot do store 2/2 fora do sandbox são carregados da rodada 37 em 10cf97b, não executados novamente: o diff atual não toca essas superfícies. Naquela rodada, o snapshot falhou dentro do sandbox antes das asserções porque `start` devolveu `io_failure`, e passou fora dele.
- `git diff --check a1f855b..HEAD`: exit 0. `git status --porcelain` estava vazio antes da escrita deste relatório.
- A suíte ampla de integração não tem prova verde neste sandbox: a rodada 27 encontrou EPERM ao criar symlink; o builder registrou falha isolada de I4-C38 no sandbox e sucesso fora dele. Não atribuo aprovação ampla a esses resultados.
- O registro de build documenta red 0/2 e green 2/2 para as duas regressões da revisão #34. Conferi o registro, sem atribuir a mim a execução red ou green. Um teste legado foi atualizado porque esperava a afirmação factual antiga e agora exige o texto correto e sua ausência. O estado da revisão formal contém 34 tentativas preservadas, com a última ainda sem `ready`; não executei revisão formal.

## Checks

| Check | Asserção decisiva no HEAD | Resultado |
| --- | --- | --- |
| C1 | `skill-source.unit.test.mjs:31–38` afirma identificação `observed_name`/`explicit_path`, SHA-256 dos bytes, linha 2 e arquivo inalterado; `report.e2e.test.mjs:100–101` atravessa a CLI com nome Unicode. | PASS |
| C2 | `instructions.unit.test.mjs:14–18` compara exatamente os quatro tipos, linhas e heading, ignora fence e proíbe execução da referência; `:32–36` exige os dois comandos de continuação. | PASS |
| C3 | `skill-source.unit.test.mjs:74–88` exige códigos fechados para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; `report.cli.test.mjs:132–135` exige erro fechado sem eco. | PASS |
| C4 | `evaluate.unit.test.mjs:22–26` compara os seis estados, linhas, sequências, motivo, hash e orientação não executável. | PASS |
| C5 | `evaluate.unit.test.mjs:305–308` exige `partial`/`commands_different_contexts` e eventos 1–6 para chamadas sobrepostas em s1 combinadas com falha em s2; `:354–357` preserva correção de uma alternativa sem afirmar escolha; `:185–198` exige prova positiva de todos os comandos coordenados. | PASS |
| C6 | `evaluate.unit.test.mjs:557–561` exige `unobserved`/`condition_true_action_unobserved`, correção da ação `[3,4]→[5,6]` e fontes 3–8 após novo gatilho; `:573–577` preserva o par com gatilho em outra sessão; `:594–598` recusa par anterior ao gatilho ou em outra sessão. `:528–547` mantém os controles de correção do gatilho. | PASS |
| C7 | `evaluate.unit.test.mjs:94–103` exige `sufficient`, eventos `[1,2]` e a limitação factual para captura desabilitada; `report.e2e.test.mjs:51–82` atravessa `--content`, hook Bash, `privacy disable` e três formatos; `render.unit.test.mjs:171–184` cobre captura sem opt-in e proíbe a frase falsa. `:14–21` exige fontes, versões e limites. | PASS |
| C8 | `report.cli.test.mjs:30–41` exige três formatos, repetição idêntica e captura/skill inalteradas; `:80–92` exige zero chamadas a `writeExclusive`. `store.unit.test.mjs:26–36` verifica snapshot sem escrita e `:39–53` conflito, ambos passaram fora do sandbox. `report.cli.test.mjs:70–77` impede vazamento entre subitens. | PASS |
| C9 | `report.cli.test.mjs:115–124` exige lock/4 e captura inválida/3; `:127–156` exige saídas 2/3/4/5, código fechado, stderr vazio e sem eco. | PASS |
| C10 | `report.e2e.test.mjs:40–48` atravessa captura, hook e CLI; exige seis estados, correção, sequências e ressalva de que ler SKILL.md não comprova carregamento. | PASS |

## Achado da revisão formal #30

O cenário de duas operações nativas sucessivas para `npm test`, uma falha em eventos 1–2 e outra bem-sucedida em 3–4, com a instrução `Run npm test or npm run build`, está em `evaluate.unit.test.mjs:348–357`. A avaliação permanece `inconclusive`/`alternative_commands_unresolved`, conserva `corrections: [{failed:[1,2], corrected:[3,4]}]` e cita os quatro eventos. `evaluate.mjs:155–159` propaga o par já calculado sem escolher entre as alternativas. `render.unit.test.mjs:39–54` confirma a explicação e o par em texto, Markdown e JSON. Os ramos também apontados pela revisão têm provas próprias: `evaluate.unit.test.mjs:360–369` conserva a correção de uma opção quando há conteúdo redigido, com `command_redacted`; `:663–673` conserva a correção da ação após gatilho sem afirmar qual alternativa foi escolhida. Não encontrei perda do par no cenário apontado.

## Achados da revisão formal #31

**Comandos em sessões distintas.** O cenário exato da revisão combina duas operações sobrepostas de `npm test` na sessão s1, positivas nos eventos 3–4, com uma falha de `npm run build` em s2 nos eventos 5–6. `evaluate.mjs:104–110` conserva o contexto único no retorno `overlapping_attempts`; `evaluate.unit.test.mjs:297–308` exige `partial`/`commands_different_contexts` e fontes 1–6, sem falsa contradição. O teste passou no lote T7.

**Correção do gatilho condicional.** `evaluate.mjs:198–205` junta a correção comprovada do gatilho com a da ação e inclui seus eventos nas fontes, sem alterar o estado da ação. `evaluate.unit.test.mjs:485–494` exige `sufficient`, correção `[1,2]→[3,4]` e fontes 1–6 quando `npm run fix` sucede. Os ramos `:497–506` e `:509–519` exigem o mesmo par quando a ação está ausente ou é alternativa inconclusiva. `render.unit.test.mjs:57–78` exige a correção em texto, Markdown e JSON. Os quatro testes novos, junto das asserções reforçadas de um teste anterior, passaram no lote T7.

## Achado da revisão formal #32

**Tentativa aberta após correção.** A skill condicional e as observações `npm test` falha em eventos 1–2, sucesso em 3–4 e início sem resultado em 5 produzem `inconclusive`/`condition_unresolved`, sem apagar a correção `[1,2]→[3,4]`. `evaluate.mjs:181–193` calcula pares por contexto antes do retorno antecipado e inclui todas as sequências do gatilho. `evaluate.unit.test.mjs:522–532` afirma estado, motivo, par e eventos 1–5. `render.unit.test.mjs:81–95` confirma que texto e Markdown mostram a correção e JSON contém par e fontes 1–5.

**Observação posterior em outra sessão.** `evaluate.unit.test.mjs:535–547` afirma `inconclusive`/`condition_unresolved`, o mesmo par da sessão s1 e eventos 1–6 após observação na sessão s2, sem par entre sessões. O retorno `multipleContexts` em `evaluate.mjs:188` usa os pares agrupados por origem, sessão e subagente. Os testes já existentes `evaluate.unit.test.mjs:497–519` continuam cobrindo ação ausente e escolha alternativa inconclusiva. Os três testes novos passaram no lote T7; o red 0/3 anterior é evidência registrada pelo builder, não execução minha.

## Achado da revisão formal #33

**Correção entre gatilhos.** O cenário exato usa falha de `npm test` em #1–#2, falha de `npm run fix` em #3–#4, sucesso de `npm run fix` em #5–#6 e nova falha de `npm test` em #7–#8. `evaluate.unit.test.mjs:550–561` exige `unobserved`/`condition_true_action_unobserved` para a ação após o último gatilho, conserva a correção histórica `[3,4]→[5,6]` e cita fontes 3–8. `evaluate.mjs:84–99` seleciona correções da ação somente após o primeiro gatilho nativo verdadeiro do mesmo contexto; `:198–205` mantém a avaliação da ação atual após o último gatilho e junta os pares históricos.

**Contexto, ordem e formatos.** `evaluate.unit.test.mjs:564–577` preserva o mesmo par quando o novo gatilho está em outra sessão, mantendo o julgamento inconclusivo; `:580–599` recusa atribuir correção anterior ao gatilho ou de outra sessão. `render.unit.test.mjs:98–116` exige a correção e as fontes 3–8 em texto, Markdown e JSON. As quatro provas novas passaram no lote T7. O registro do builder mostra três falhas esperadas e um controle verde antes da correção; não reproduzi o red.

## Achado da revisão formal #34

**Coleta desativada após evidência positiva.** O diff muda apenas a limitação factual em `evaluate.mjs:273`: `timeline.capture.content === false` descreve a coleta **atual** como desativada e reconhece que argumentos sanitizados já preservados podem provar comandos. A regra pura em `evaluate.unit.test.mjs:94–103` confirma `sufficient`, `sources.events: [1,2]` e a fonte `timeline.capture.content` mesmo após `state: disabled`. O fluxo real em `report.e2e.test.mjs:51–82` executa `start --content`, hook Bash nativo de `npm test` com resultado positivo, `privacy disable` e `report` em texto, Markdown e JSON. Exige estado da captura `disabled`, `content:false`, avaliação `sufficient`, eventos `[1,2]` e a mesma limitação nos três formatos.

**Texto anterior e opt-in.** `render.unit.test.mjs:171–184` mantém a explicação quando a captura começa sem opt-in de conteúdo e exige que a frase antiga “Conteúdo dos argumentos não foi coletado” não apareça em texto ou Markdown. A busca em `src/` encontrou apenas a nova frase; `docs/report.md:17` explica o efeito de `privacy disable` sobre argumentos anteriores. O teste legado mudou porque sua antiga asserção exigia a frase factualmente falsa. O builder documentou red 0/2, green 2/2; eu repeti o lote T7 completo e observei 113/113. A prova do red é somente o registro do builder.

## Exceção de revisão 30→35

O contexto salvo da issue contém oito comentários; o último registra literalmente a autorização "Sim, até 35 tentativas", preservando as 30 anteriores e os pilotos intocados. `code-review.config.json:43–48` mantém somente a #7 em `maxRounds: 35` com URL do comentário; `profiles.light/ui/direct` permanecem em 2. `review.mjs:490–501` valida perfil, aprovação, inteiro maior que o padrão e teto 35. `review.test.mjs:674–711` rejeita override de outra issue e 36, aceita 35 após esgotar o teto anterior, mantém o padrão em 2 e verifica o contador de 3 para 4. O teste C6 passou na suíte 16/16 da rodada 38. O registro do builder documenta red 0/1 com motor antigo e green 1/1 com o novo, que não repeti por exigir modificar uma cópia do motor. A documentação local em AGENTS.md, README.md e `scripts/code-review/README.md` aponta a autorização e a exceção; as outras atualizações do core permanecem sob regra de igualdade. O estado de revisão contém agora exatamente 34 tentativas, preservando o histórico.

## Limites e política local

A proteção de texto sem projeção sanitizada segura pode omitir outras instruções da mesma skill; o relatório declara essa perda de cobertura sem afirmar omissão de execução. A exceção de core vendorizado permanece exclusiva da #7; não houve edição dos pilotos por esta verificação. A comparação de hashes com os pilotos foi registrada pelo builder na mudança do teto, mas não foi repetida aqui; o diff desde 2c39b23 não altera os arquivos do core. Esta verificação usa o perfil light e não inclui injeção de falhas. Resta uma tentativa formal autorizada; ainda falta uma revisão `ready` do novo HEAD antes de push, PR ou merge.
