# Issue #7 — verificação independente do relatório

**Verdict**: FAIL — C1–C10: 8/10 comprovados; continuação coordenada após referência perde o segundo comando.
**Profile**: light.
**HEAD**: aee4f830b35535856f764ac8cdf409c42403be93.
**Diff range**: a1f855b..aee4f83 (entrega); 7b208ec..aee4f83 (correção recente).
**Round**: 18 — scoped; todas as provas T7 repetidas no HEAD.
**Verifier**: subagente independente; somente este arquivo foi editado.

## Fontes e alcance

Li AGENTS.md, tlc-implement/references/verify.md, a issue exportada em .checks/code-review/issue-7/context.json com cinco comentários, .tasks/issue-7-relatorios.md, .checks/issue-7-relatorios.md, o registro de build, a verificação anterior e o achado da 14ª revisão em .checks/code-review/issue-7/response.json. Examinei o diff 7b208ec..HEAD, o parser e as asserções tocadas. A issue e o plano permanecem as fontes dos critérios C1–C10; o guia AGENT_SKILL_DEBUGGER_SPEC não é vinculante. Os critérios não mudaram. O checklist não possui seções Coverage ou Test policy; comparação de UI e injeção de falhas pertencem aos perfis standard/ui, não ao light.

## Provas executadas no HEAD

- node --test "tests/integrations/report/*.test.mjs": **exit 0; 59 testes, 59 passes, 0 falhas, 0 skips**. O runner listou T7-C1 a T7-C10 nominalmente, incluindo os dois novos casos da referência textual.
- git diff --check 7b208ec..HEAD: exit 0. git status --porcelain estava vazio antes da escrita deste relatório.
- Smoke read-only via node --input-type=module: a instrução com curl, referência expected output e docker na continuação extraiu apenas ["curl --version"]; com só curl nativo positivo, evaluateReport retornou sufficient, matching_command_succeeded e eventos [1,2]. Era esperado extrair também docker build . e retornar partial sem a segunda operação.
- O builder registrou em .checks/issue-7-relatorios.build.md a prova red dos dois testes novos (0/2) e a prova green após a correção. Conferi esse registro, mas não executei nem atribuo a mim a prova red. A suíte ampla anterior pertence a outro commit; não é evidência deste HEAD.

## Checks

| Check | Asserção decisiva executada | Resultado |
| --- | --- | --- |
| C1 | tests/integrations/report/skill-source.unit.test.mjs:31–38 exige identificação observada/explícita, SHA-256, linha e arquivo inalterado; report.e2e.test.mjs:67–68 atravessa CLI com nome Unicode. Julgamento carregado da rodada 17 em ab1fe8b; prova repetida neste HEAD. | PASS |
| C2 | instructions.unit.test.mjs:94–96 cobre as referências simples e :30–35 cobre a continuação sem referência. Falta a combinação: referência textual entre dois comandos coordenados em linhas distintas. O smoke acima mostra que docker build . é omitido; src/integrations/report/instructions.mjs:40–48 mantém a referência rejeitada no texto intermediário e não reconhece a coordenação. | FAIL |
| C3 | skill-source.unit.test.mjs:74–88 exige erros fechados para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; report.cli.test.mjs:48–51 proíbe eco. Julgamento carregado da rodada 17; prova repetida. | PASS |
| C4 | evaluate.unit.test.mjs:22–26 exige vetor dos seis estados, linhas, sequências, guidance_not_step, motivo e hash. Julgamento carregado da rodada 17; prova repetida. | PASS |
| C5 | evaluate.unit.test.mjs:97–99 prova o caso de um comando com referência. O smoke com docker build . não observado retorna sufficient, matching_command_succeeded e fontes [1,2], mas a instrução contém dois comandos executáveis; deveria ser partial. A prova existente não distingue esse erro. | FAIL |
| C6 | evaluate.unit.test.mjs:120–122 exige condição falsa/inconclusiva e correção com sequências [3,4] e [5,6]; os cenários de ordem e sessão foram reexecutados. Julgamento carregado da rodada 17; prova repetida. | PASS |
| C7 | render.unit.test.mjs:14–21 exige fontes, versões, limites, ausência de percentual/raciocínio privado; :32–41 separa plataformas e fontes. Julgamento carregado da rodada 17; prova repetida. | PASS |
| C8 | report.cli.test.mjs:30–40 exige texto, Markdown, JSON v1, saída repetida idêntica, timeline vazia e captura/skill inalteradas. Julgamento carregado da rodada 17; prova repetida. | PASS |
| C9 | report.cli.test.mjs:48–72 exige saídas 2/3/4/5, erros fechados, stderr vazio e sem eco. Julgamento carregado da rodada 17; prova repetida. | PASS |
| C10 | report.e2e.test.mjs:38–48 exige fluxo captura/hook/CLI, seis estados, correção, sequências e limite de leitura de SKILL.md. Julgamento carregado da rodada 17; prova repetida. | PASS |

## Achado da décima quarta revisão

**Referência textual interpretada como segundo comando: corrigido.** Em 7b208ec, Run `curl --version` (see `expected output` for reference) extraía os dois trechos entre crases. A avaliação exigia execução de expected output e retornava partial. Em src/integrations/report/instructions.mjs:23–49, cada trecho agora precisa de contexto de execução: comando conhecido ou formato forte após verbo de verificação/coordenação, ou literal após verbo de execução. O contexto da coordenação é calculado a partir do último comando aceito. A extração em linhas de continuação recebe o texto anterior e o trecho intermediário. O teste instructions.unit.test.mjs:92–96 distingue a referência após curl, referências após and, validação e condição de comandos coordenados reais; :29–36 cobre a continuação. O teste evaluate.unit.test.mjs:94–100 confirma sufficient, motivo e sequências para curl com referência. Todos passaram nesta verificação, mas não cobrem a combinação abaixo.

## Achado bloqueante desta rodada

Na instrução que pede executar curl --version, menciona expected output como referência e continua na linha seguinte com docker build ., apenas curl foi capturado como comando. Uma operação nativa positiva de curl, sem operação docker, produziu `sufficient` e motivo `matching_command_succeeded`. O resultado esperado é capturar ambos os comandos e avaliar `partial` até haver evidência positiva de docker na mesma origem/sessão. Localização: src/integrations/report/instructions.mjs:40–48 e :96; a avaliação em src/integrations/report/evaluate.mjs consome a lista incompleta. Impacto: o relatório afirma comprovação completa de uma instrução que não foi completamente observada. É necessário um teste de regressão com essa combinação no parser e na avaliação.

## Política local e limites

A exceção do core vendorizado foi decidida pelo proprietário no quinto comentário do contexto e está explícita em AGENTS.md. O diff recente não toca core, configuração ou pilotos; carrego o julgamento dessa fronteira da rodada 17. Não executei revisão formal, doctor, governança nem a suíte ampla de integrações: a mudança recente alcança parser, testes T7, documentação e registro de build. Não fiz injeção de falhas porque o perfil light não a exige.
