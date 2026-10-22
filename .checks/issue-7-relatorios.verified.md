# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados.
**Profile**: light.
**HEAD**: 8545ebf56876ce35d1721b1c0c9dfecc65d390ec.
**Diff range**: a1f855b..HEAD (entrega); b473d9e..HEAD (correção da revisão formal #28).
**Round**: 35 — scoped; todas as provas T7 repetidas no HEAD.
**Verifier**: subagente independente; somente este relatório foi editado.
**Gate formal**: a revisão #28 pediu correções. Ainda falta revisão formal ready deste HEAD antes de push, PR e merge.

## Fontes e alcance

Li AGENTS.md, tlc-implement/references/verify.md, .tasks/issue-7-relatorios.md, .checks/issue-7-relatorios.md, o contexto salvo da issue com sete comentários, docs/report.md, docs/privacidade.md e o diff da correção. A issue e o plano continuam como fontes de C1–C10. O comentário 6300606867 autoriza o snapshot de leitura; 6297902519 exclui alterações nos pilotos; 6331180478 autoriza até 30 tentativas formais exclusivas da #7. Esta rodada examina os dois achados da revisão #28. Julgamentos não afetados pelo diff são carregados da rodada 34 em 5b34f96; suas provas T7 foram repetidas no HEAD. Não há fonte de UI vinculante, seção Coverage ou seção Test policy. Comparação de UI e injeção de falhas pertencem aos perfis ui/standard. CONTRIBUTING.md não existe no checkout.

## Provas executadas no HEAD

- node --test tests/integrations/report/*.test.mjs: exit 0; 93/93 testes passaram, 0 falhas, 0 skips. O runner exibiu nominalmente T7-C1 a T7-C10 e as três regressões novas.
- node --test tests/integrations/privacy/policy.unit.test.mjs: exit 0; 37/37 passaram, 0 falhas, 0 skips. Inclui I5-C14i, que exige omissão de bloco sensível multilinha pela política compartilhada.
- Smoke somente leitura da API evaluateReport/renderReport para quatro chamadas nativas do mesmo comando — falha em [1,2], sucesso em [3,4], duas abertas em [5] e [6]: exit 0; corrections permaneceu [{failed:[1,2], corrected:[3,4]}] na avaliação e em JSON; texto e Markdown incluíram Correção observada.
- git diff --check a1f855b..HEAD: exit 0. git status --porcelain estava vazio antes da escrita deste relatório.
- Correlação unitária 55/55, motor de revisão 16/16 e governança 6/6 são carregados da rodada 31 em 2232e28; não foram repetidos, pois o diff desta rodada toca somente parser e avaliação do relatório, regressões e registro de build. A suíte ampla de integração não tem prova verde neste sandbox: a rodada 27 encontrou EPERM ao criar symlink; o builder registrou falha isolada de I4-C38 no sandbox e sucesso fora dele. Não atribuo aprovação ampla a esses resultados.
- O builder registrou três regressões vermelhas antes da correção e verdes depois. Conferi o registro, sem atribuir a mim a execução vermelha. O state da revisão formal contém 28 tentativas; o teto local da #7 é 30. Não executei revisão formal.

## Checks

| Check | Asserção decisiva no HEAD | Resultado |
| --- | --- | --- |
| C1 | skill-source.unit.test.mjs:31–38 afirma identificação observed_name/explicit_path, SHA-256 dos bytes, linha 2 e arquivo inalterado; report.e2e.test.mjs:67–68 atravessa a CLI com nome Unicode. | PASS |
| C2 | instructions.unit.test.mjs:14–18 compara exatamente os quatro tipos, linhas e heading, ignora fence e proíbe execução da referência; :32–36 exige os dois comandos de continuação. A fonte sem projeção segura recebe item omitido, conforme a política. | PASS |
| C3 | skill-source.unit.test.mjs:74–88 exige códigos fechados para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; report.cli.test.mjs:122–125 exige erro fechado sem eco. | PASS |
| C4 | evaluate.unit.test.mjs:22–26 compara os seis estados, linhas, sequências, motivo, hash e orientação não executável. | PASS |
| C5 | evaluate.unit.test.mjs:561–564 exige partial/overlapping_attempts, preserva a correção [1,2]→[3,4] e cita [1,2,3,4,5,6]; :173–186 exige prova positiva de todos os comandos enumerados. | PASS |
| C6 | evaluate.unit.test.mjs:451–454 exige que tentativas simultâneas não sejam declaradas correção; :549–551 preserva a correção antes de tentativa aberta; :135–138 exige condição falsa só com prova explícita e correção com ambas as sequências. | PASS |
| C7 | render.unit.test.mjs:14–21 exige fontes, versões e limites em texto/Markdown e JSON v1, sem percentual nem raciocínio privado; render.mjs:49 imprime cada par de corrections com eventos. O smoke confirmou a correção sob sobreposição nos três formatos. | PASS |
| C8 | instructions.unit.test.mjs:47–52 exige um item com texto omitido e nenhum valor do subitem sensível; report.cli.test.mjs:55–65 exige status 0, ausência de SENHA_INTERNA_EXEMPLO em text/markdown/json e avaliação inconclusive/command_redacted/null. :30–41 exige repetição idêntica e captura/skill inalteradas; :77–81 exige zero chamadas a writeExclusive. | PASS |
| C9 | report.cli.test.mjs:105–114 exige lock_present/4 e capture_invalid/3; :122–146 exige saídas 2/3/4/5, código fechado, stderr vazio e sem eco. | PASS |
| C10 | report.e2e.test.mjs:40–48 atravessa captura, hook e CLI; exige seis estados, correção, sequências e ressalva de que ler SKILL.md não comprova carregamento. | PASS |

## Achados da revisão formal #28

**Bloco sensível com marcador de lista.** A política em docs/privacidade.md:206–210 omite o campo inteiro quando password: | tem texto nas linhas seguintes, sem interpretar YAML para achar o fim. Antes de separar itens Markdown, instructions.mjs:54–59 verifica a fonte multilinha com sanitizeText; quando não há projeção segura, produz um item com text null, commands vazios e commandRedacted true. A regressão do parser em instructions.unit.test.mjs:47–52 impede o valor de reaparecer em qualquer instrução. A regressão da CLI em report.cli.test.mjs:55–65 atravessa os três formatos e exige a mesma omissão. Ambas passaram no lote T7. Não encontrei vazamento no cenário apontado.

**Correção seguida de duas tentativas abertas sobrepostas.** evaluate.mjs:64–72 só forma um par quando o início do sucesso ocorre depois do fim da falha. Em :78–80, o caminho partial/overlapping_attempts conserva esses pares já formados. evaluate.unit.test.mjs:554–564 exige explicitamente partial, reasonCode, correção anterior e seis sequências. O controle de simultaneidade em :445–454 continua exigindo corrections vazias quando falha e sucesso se sobrepõem. O smoke de renderização confirmou que texto, Markdown e JSON apresentam o par histórico. Não encontrei perda da correção nem falsa correção no cenário apontado.

## Limites e política local

A proteção do bloco sem projeção segura omite também outras instruções desse arquivo nessa consulta, pois a política compartilhada não determina onde o valor termina; o relatório declara a limitação em vez de expor conteúdo. Essa é uma perda conservadora de cobertura, não prova de que as demais instruções não foram executadas. A exceção de core vendorizado permanece exclusiva da #7 e não houve edição dos pilotos. Esta verificação é do perfil light e não incluiu injeção de falhas. Uma revisão formal ready do HEAD atual ainda é necessária.
