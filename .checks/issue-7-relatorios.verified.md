# Issue #7 — verificação independente do relatório

**Verdict**: FAIL global por divergência do core vendorizado; C1–C10: 10/10 PASS.
**Profile**: light.
**HEAD**: d7e526fd2cec92603d02f127966ef3719dc683d5.
**Diff range**: a1f855b..d7e526f (entrega); 4f25696..d7e526f (mudança desde a verificação anterior).
**Round**: 13 — scoped; todas as provas de produto repetidas no HEAD.
**Verifier**: subagente independente; somente este arquivo foi editado.

## Fontes e método

Li AGENTS.md, C:\Users\paulo\.agents\skills\tlc-implement\references\verify.md, a issue e suas oito condições de aceite pela cópia em .checks/code-review/issue-7/context.json, a aprovação adicional da issue #7 comentada nesse contexto (issuecomment-6297275855), .tasks/issue-7-relatorios.md, .checks/issue-7-relatorios.md, .checks/issue-7-relatorios.build.md, docs/report.md e a verificação anterior. Examinei a lista e a estatística do diff completo a1f855b..HEAD e o diff integral 4f25696..HEAD. O diff recente altera apenas build, code-review.config.json, README e código/testes do motor de revisão; as fontes, implementação e testes de C1–C10 não mudaram desde 156c20e. As asserções de produto abaixo foram relidas em testes/integrations/report e as provas foram executadas novamente.

O checklist não contém seções Coverage ou Test policy; comparação de design de UI e injeção de falhas do protocolo verify.md não são etapas do perfil light. O guia AGENT_SKILL_DEBUGGER_SPEC citado na issue é expressamente não vinculante. A aprovação posterior autoriza especificamente o aumento do teto para a #7, que substitui a afirmação anterior do plano de que o motor ficaria intocado. O relato de execução no build não foi contado como prova executada por este Verifier.

## Provas de produto no HEAD

Comando único: node --test tests/integrations/report/*.test.mjs. Exit 0: 50 testes, 50 PASS, 0 FAIL, 0 skips, 0 todo. O runner listou T7-C1 a T7-C10 nominalmente.

| Check | Asserção decisiva localizada | Resultado |
| --- | --- | --- |
| C1 | tests/integrations/report/skill-source.unit.test.mjs:31–38 exige observed_name, SHA-256 dos bytes, linha/heading, explicit_path com divergência e arquivo inalterado; report.e2e.test.mjs:65–68 exige nome observado Unicode e fonte nativa. | PASS, carried from 156c20e; prova repetida |
| C2 | instructions.unit.test.mjs:14–18 exige quatro tipos, linhas, heading, comandos e ausência de execução do marcador; :58–61 exige subitem condicional separado. | PASS, carried from 156c20e; prova repetida |
| C3 | skill-source.unit.test.mjs:74–88 exige código e mensagem fechados para ausência, ambiguidade, arquivo irregular, UTF-8 inválido e 1 MiB + 1; report.cli.test.mjs:48–51 impede eco. | PASS, carried from 156c20e; prova repetida |
| C4 | evaluate.unit.test.mjs:22–26 exige vetor dos seis estados, linhas, eventos, orientação não executável e hash de cada fonte. | PASS, carried from 156c20e; prova repetida |
| C5 | evaluate.unit.test.mjs:37–39 exige positivo, negativo, parcial e ausência; :60–62 exige condição aninhada separada; :120–122 e :148–154 distinguem comandos ausentes, sessões e falha; :172–173 cobre bash literal. | PASS, carried from 156c20e; prova repetida |
| C6 | evaluate.unit.test.mjs:83–85 exige condição falsa, desconhecida e correção com sequências; :204–207 recusa falsa correção sob sobreposição; :262–275 cobre gatilho verdadeiro e tentativa aberta; :284–286 exige correção anterior preservada. | PASS, carried from 156c20e; prova repetida |
| C7 | render.unit.test.mjs:14–21 exige hash, linha, evento, versão, timeline e limites; :92–106 exige causas exatas de cobertura parcial; :121–124 exige correção citada em texto e Markdown. | PASS, carried from 156c20e; prova repetida |
| C8 | report.cli.test.mjs:30–40 exige saídas texto, Markdown e JSON v1, repetição idêntica, timeline vazia, skill e captura inalteradas. | PASS, carried from 156c20e; prova repetida |
| C9 | report.cli.test.mjs:48–51 exige código fechado, exit e ausência de eco; :53–66 cobre 2/3/4; :69–72 cobre E/S 5. | PASS, carried from 156c20e; prova repetida |
| C10 | report.e2e.test.mjs:38,41–48 atravessa hooks, captura, correlação e CLI; exige os seis estados, correção e limite de leitura de SKILL.md. | PASS, carried from 156c20e; prova repetida |

## Mudança de governança da #7

O contexto salvo registra a aprovação específica do proprietário no comentário issuecomment-6297275855 para teto 20 da #7 com dez tentativas preservadas. O arquivo comum .git/code-review/issue-7.state.json contém 10 tentativas no momento desta leitura. code-review.config.json:6–17 conserva light/ui/direct em 2 e :43–47 aplica 20 somente à issue 7. scripts/code-review/review.mjs:483–500 conserva teto de perfil em 10 e aceita override maior que o perfil, até 20, com aprovação. scripts/code-review/review.test.mjs:679–711 rejeita override de outra issue, aprovação vazia, perfil errado, teto 2 e 21; preserva contador 2 → 3 → 4 ao ampliar o teto, mantendo o padrão 2. As asserções dizem 4 porque a fixture cria duas tentativas históricas, uma sob override 3 e uma sob override 20; não afirmam simular literalmente as dez tentativas reais.

git diff --check a1f855b..HEAD e git diff --check 4f25696..HEAD: exit 0. O teste de governança executado inicialmente no sandbox terminou 5 PASS, 1 FAIL ao tentar criar .git/config no Temp restrito do Windows. Repetido com acesso ao Temp: npm run test:governance, exit 0, 6 testes, 6 PASS, 0 FAIL, 0 skips. O teste alterado do motor foi executado isoladamente fora do sandbox: node --test --test-name-pattern="C6 limite de rodadas" scripts/code-review/review.test.mjs, exit 0, 1 teste, 1 PASS, 0 FAIL, 0 skips; duração 179 s. A tentativa inicial da suíte completa do motor no sandbox falhou por restrição ao Temp, e a repetição completa fora do sandbox foi interrompida após vários minutos sem resultado final; não conto essas duas execuções como prova verde. O build relata 16/16, mas é prova do autor, não minha.

## Core vendorizado — achado bloqueante

AGENTS.md exige preservar os cinco arquivos comuns e conferir hashes em atualizações; scripts/code-review/README.md declara que o core é idêntico nos dois consumidores. Calculei SHA-256 dos cinco arquivos em cada repositório, convertendo CRLF e CR para LF antes do hash. stamp-generator e precificadora coincidem entre si em todos os cinco arquivos. O debuguer_skills diverge nos três arquivos alterados nesta entrega:

| Arquivo | debuguer_skills | ambos os consumidores | Resultado |
| --- | --- | --- | --- |
| README.md | 2519aaa90105456bc5b3069474190f4d4c5224dbbc91d15d7b23fb75de632887 | b729b74da75236c2a5127c759d288e0aa76799677e7365955a835d06fbc5965e | DIVERGE |
| cli.mjs | 4ff9a5e7a50950bda2857f6d76f0d7b690630a9feaef5fd7471e7ba1b66dd4a0 | mesmo hash | IGUAL |
| review.mjs | dae814895e7acecdcccd7c28f78ce6576467679e30d52db71bed7b4546351479 | e71fe427d4434e570b3bde731e8e55af22695cb21eb3cdfe75fa50a2db09ba3f | DIVERGE |
| review.test.mjs | 2a1f1c5b5587d4b8c62425e31c5c804e4b32c506e0b81d76095f0d81f6e9ec6a | 7fd05ac419a07982f5588d7157be931cf2df5dbd6992815a7deb38f244da7462 | DIVERGE |
| schema.json | 09381948e36666bd22234eb2ce39c61d7208bbb93a6ffb95861d2d92ea1b983c | mesmo hash | IGUAL |

O diff 4f25696..HEAD confirma que os três arquivos divergentes contêm documentação, validação de teto e teste da mudança. A autorização específica permite alterar o motor da #7, mas não registra uma exceção para manter versões diferentes nos consumidores. Não escrevi fora deste repositório. Enquanto os hashes permanecerem diferentes, a atualização do core vendorizado não satisfaz a regra aplicável, mesmo que a funcionalidade do relatório e os testes locais estejam verdes.

## Gate e limites

G1 C1–C10: PASS, 10/10 comprovados no HEAD.
G2 override #7 e histórico: PASS por C6 executado 1/1, inspeção das asserções, configuração e estado real de dez tentativas.
G3 core vendorizado idêntico: FAIL, 3/5 arquivos diferentes em cada consumidor.
G4 revisão formal: não executada nesta verificação; o novo teto apenas começa após este gate.

Injeção de falhas não se aplica ao perfil light. Não executei novamente npm test completo ou a suíte ampla de integrações, pois o diff recente só afeta o motor de revisão e sua documentação/teste. A verificação anterior registra a suíte ampla da entrega; no HEAD atual, as 50 provas do relatório foram repetidas. Não houve skip nas provas selecionadas.
