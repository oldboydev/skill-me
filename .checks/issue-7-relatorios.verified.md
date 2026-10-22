# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados.
**Profile**: light.
**HEAD**: 0defb48e5fa5d2e02dc34ea1859fa03e1e75b443.
**Diff range**: a1f855b..HEAD (entrega); 8545ebf..HEAD (correção da revisão formal #29).
**Round**: 36 — scoped; todas as provas T7 repetidas no HEAD.
**Verifier**: subagente independente; somente este relatório foi editado.
**Gate formal**: a revisão #29 pediu correções. Ainda falta revisão formal ready deste HEAD antes de push, PR e merge.

## Fontes e alcance

Li AGENTS.md, tlc-implement/references/verify.md, .tasks/issue-7-relatorios.md, .checks/issue-7-relatorios.md, o contexto salvo da issue com sete comentários, docs/report.md, docs/privacidade.md e o diff da correção. A issue e o plano continuam como fontes de C1–C10. O comentário 6300606867 autoriza o snapshot de leitura; 6297902519 exclui alterações nos pilotos; 6331180478 autoriza até 30 tentativas formais exclusivas da #7. Esta rodada examina os dois achados da revisão #29. Julgamentos não afetados pelo diff são carregados da rodada 35 em 8545ebf; suas provas T7 foram repetidas no HEAD. Não há fonte de UI vinculante, seção Coverage ou seção Test policy. Comparação de UI e injeção de falhas pertencem aos perfis ui/standard. CONTRIBUTING.md não existe no checkout.

## Provas executadas no HEAD

- node --test tests/integrations/report/*.test.mjs: exit 0; 96/96 testes passaram, 0 falhas, 0 skips. O runner exibiu nominalmente T7-C1 a T7-C10 e as três regressões desta correção.
- node --test tests/integrations/privacy/policy.unit.test.mjs: exit 0; 37/37 passaram, 0 falhas, 0 skips. Inclui I5-C14i, que exige omissão de bloco sensível multilinha pela política compartilhada.
- Smoke somente leitura de parseInstructions/sanitizeText: `password: "` seguido de subitem sensível retorna sanitizeText ok:true/removed:true, mas parseInstructions devolve um único item com text:null e commands:[], sem o valor; `node /home/alice/check.js` continua redigido como `node <home>/check.js`, com o segundo item preservado.
- git diff --check a1f855b..HEAD: exit 0. git status --porcelain estava vazio antes da escrita deste relatório.
- Correlação unitária 55/55, motor de revisão 16/16 e governança 6/6 são carregados da rodada 31 em 2232e28; não foram repetidos, pois o diff desta rodada toca somente parser e avaliação do relatório, regressões e registro de build. A suíte ampla de integração não tem prova verde neste sandbox: a rodada 27 encontrou EPERM ao criar symlink; o builder registrou falha isolada de I4-C38 no sandbox e sucesso fora dele. Não atribuo aprovação ampla a esses resultados.
- O builder registrou regressões vermelhas antes da correção e verdes depois. Conferi o registro, sem atribuir a mim a execução vermelha. O state da revisão formal contém 29 tentativas; o teto local da #7 é 30. Não executei revisão formal.

## Checks

| Check | Asserção decisiva no HEAD | Resultado |
| --- | --- | --- |
| C1 | skill-source.unit.test.mjs:31–38 afirma identificação observed_name/explicit_path, SHA-256 dos bytes, linha 2 e arquivo inalterado; report.e2e.test.mjs:67–68 atravessa a CLI com nome Unicode. | PASS |
| C2 | instructions.unit.test.mjs:14–18 compara exatamente os quatro tipos, linhas e heading, ignora fence e proíbe execução da referência; :32–36 exige os dois comandos de continuação. A fonte sem projeção segura recebe item omitido, conforme a política. | PASS |
| C3 | skill-source.unit.test.mjs:74–88 exige códigos fechados para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; report.cli.test.mjs:132–135 exige erro fechado sem eco. | PASS |
| C4 | evaluate.unit.test.mjs:22–26 compara os seis estados, linhas, sequências, motivo, hash e orientação não executável. | PASS |
| C5 | evaluate.unit.test.mjs:561–564 exige partial/overlapping_attempts, preserva a correção [1,2]→[3,4] e cita [1,2,3,4,5,6]; :574–578 exige a mesma correção quando há observação em s2; :173–186 exige prova positiva de todos os comandos enumerados. | PASS |
| C6 | evaluate.unit.test.mjs:451–454 exige que tentativas simultâneas não sejam declaradas correção; :549–551 preserva a correção antes de tentativa aberta; :135–138 exige condição falsa só com prova explícita e correção com ambas as sequências. | PASS |
| C7 | render.unit.test.mjs:14–21 exige fontes, versões e limites em texto/Markdown e JSON v1, sem percentual nem raciocínio privado; render.mjs:49 imprime cada par de corrections com eventos. O smoke da rodada 35 confirmou a correção sob sobreposição nos três formatos; nesta rodada a saída do parser foi conferida diretamente. | PASS |
| C8 | instructions.unit.test.mjs:55–61 exige que valor entre aspas atravessando subitem não reapareça no objeto; report.cli.test.mjs:70–77 exige status 0 e ausência do valor em text/markdown/json. Os cenários anteriores de bloco sensível seguem em :39–52 e report.cli.test.mjs:44–68. :30–41 exige repetição idêntica e captura/skill inalteradas; :80–92 exige zero chamadas a writeExclusive. | PASS |
| C9 | report.cli.test.mjs:115–124 exige lock_present/4 e capture_invalid/3; :127–156 exige saídas 2/3/4/5, código fechado, stderr vazio e sem eco. | PASS |
| C10 | report.e2e.test.mjs:40–48 atravessa captura, hook e CLI; exige seis estados, correção, sequências e ressalva de que ler SKILL.md não comprova carregamento. | PASS |

## Achados da revisão formal #29

**Valor entre aspas com subitem Markdown.** A política omite o valor multilinha de `password: "` e devolve ok:true/removed:true com linhas condensadas. A guarda em instructions.mjs:54–67 compara a projeção sanitizada da fonte inteira com as linhas isoladas antes de dividir itens; a diferença torna todo o texto de instruções indisponível, com commands vazios. instructions.unit.test.mjs:55–61 impede o valor de reaparecer no objeto do parser. report.cli.test.mjs:70–77 atravessa texto, Markdown e JSON e impede a exposição na saída. O smoke direto confirmou essa forma exata e confirmou que caminhos `/home/...` ainda são representados por `<home>` nas instruções seguras. Não encontrei vazamento no cenário apontado.

**Correção comprovada em s1 com observação posterior em s2.** evaluate.mjs:74–83 forma pares somente dentro do mesmo contexto de origem, sessão e subagente e conserva os pares ao marcar o conjunto como ambiguous_context. evaluate.unit.test.mjs:567–578 exige partial, reasonCode, correção [1,2]→[3,4] e seis sequências; :189–212 e :445–454 continuam impedindo pares entre sessões/subagentes e entre tentativas sobrepostas. A regressão do cenário apontado passou no lote T7. Não encontrei pareamento entre contextos nem perda da correção anterior.

## Limites e política local

A proteção do bloco sem projeção segura omite também outras instruções desse arquivo nessa consulta, pois a política compartilhada não determina onde o valor termina; o relatório declara a limitação em vez de expor conteúdo. Essa é uma perda conservadora de cobertura, não prova de que as demais instruções não foram executadas. A exceção de core vendorizado permanece exclusiva da #7 e não houve edição dos pilotos. Esta verificação é do perfil light e não incluiu injeção de falhas. Uma revisão formal ready do HEAD atual ainda é necessária.
