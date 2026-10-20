# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados.
**Profile**: light.
**HEAD**: efd56e7bb8ff0929d162faa4f08ba6e3297b66be.
**Diff range**: a1f855b..HEAD (entrega); 7210b19..HEAD (correção recente).
**Round**: 26 — scoped; todas as provas T7 e do store repetidas no HEAD.
**Verifier**: subagente independente; somente este arquivo foi editado.

## Fontes e alcance

Li AGENTS.md, `tlc-implement/references/verify.md`, `.tasks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.md`, o registro de build, a verificação anterior e o contexto aprovado da issue #7. O [comentário 6300606867](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6300606867) autoriza a extensão mínima de snapshot sem escrita no store e até 25 revisões exclusivas da #7; o [comentário 6297902519](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6297902519) mantém os pilotos fora desta entrega. Examinei o diff `7210b19..HEAD`, a API de snapshot e a regressão na fronteira `report`. A issue e o plano continuam como fontes de C1–C10; `AGENT_SKILL_DEBUGGER_SPEC` é guia não vinculante. O checklist não possui seções Coverage ou Test policy. Comparação de UI e injeção de falhas pertencem aos perfis standard/ui, não ao light. Julgamentos fora do diff recente são carregados da rodada 25 em `7210b19`; as provas T7 e do store foram repetidas neste HEAD.

## Provas executadas no HEAD

- `node --test "tests/integrations/report/**/*.test.mjs"`: **exit 0; 78 testes, 78 passaram, 0 falharam, 0 skips**. O runner listou T7-C1 a T7-C10 nominalmente, inclusive o novo T7-C8 de troca concorrente.
- `node --test tests/integrations/privacy/store.unit.test.mjs`: **exit 0; 10 testes, 10 passaram, 0 falharam, 0 skips**, com TEMP/TMP em `.checks` dentro do workspace; os dois testes T7-C8 do store executaram.
- `git diff --check 7210b19..HEAD`: exit 0. `git status --porcelain` estava vazio antes da escrita deste relatório, após remover apenas diretórios temporários gerados pelos testes.
- O builder registrou em `.checks/issue-7-relatorios.build.md` a regressão T7-C8 falhando com código 5 antes da correção, passando com 4 depois, e os lotes finais T7 78/78, store 10/10, governança 6/6 e motor 16/16. Conferi esse registro, sem atribuir a mim a execução red, governança ou motor neste HEAD. A mudança recente toca somente o snapshot do store e a prova da fronteira `report`; os julgamentos de governança/motor da rodada 25 são carregados.

## Checks

| Check | Asserção decisiva executada | Resultado |
| --- | --- | --- |
| C1 | `skill-source.unit.test.mjs:31–38` exige modo observado/explícito, SHA-256, linha e arquivo inalterado; `report.e2e.test.mjs:67–68` atravessa CLI com nome Unicode. Julgamento carregado da rodada 19 em 0f557ca; prova repetida neste HEAD. | PASS |
| C2 | `instructions.unit.test.mjs:14–18` exige quatro tipos, heading/linha, ignora fence e não executa referência; `:94–103` rejeita referência parentética e conserva comando após ela; `:108–126` exige ambos os literais coordenados, cláusula longa e literal completo, e preserva o segundo comando em `(or ...)`. | PASS |
| C3 | `skill-source.unit.test.mjs:74–88` exige erro fechado para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; `report.cli.test.mjs:96–99` proíbe eco. Julgamento carregado da rodada 25; prova repetida. | PASS |
| C4 | `evaluate.unit.test.mjs:22–26` afirma seis estados, linhas, sequências, orientação não executável, motivo e hash. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C5 | `evaluate.unit.test.mjs:306–313` exige `inconclusive`/`command_redacted`, eventos `[1,2]` e texto `null` quando a política omite todo o texto da instrução com alternativa; `:279–303` preserva alternativas parentéticas e parcialmente sanitizadas com controle `and`; `:258–276` preserva literal longo e alternativa não observada. | PASS |
| C6 | `evaluate.unit.test.mjs:269–276` exige condição sem gatilho `inconclusive`, mas condição com gatilho nativo verdadeiro e nenhuma ação `unobserved`/`condition_true_action_unobserved` com fontes `[1,2]`; `:395–402` preserva ações ligadas por `or` versus `and`, seis eventos e gatilho falso; `:383–384` exige `condition_unresolved` para gatilhos alternativos. Julgamento carregado da rodada 24; prova repetida. | PASS |
| C7 | `render.unit.test.mjs:24–44` exige alternativa observada `inconclusive` com explicação em texto/Markdown e motivo JSON, e alternativa sem evento `unobserved` com texto de lacuna e `no_matching_observation` em JSON; `:14–21` preserva fontes, versões, limites, ausência de percentual/raciocínio privado. | PASS |
| C8 | `report.cli.test.mjs:29–55` exige três formatos, repetição, captura/skill inalteradas e zero chamadas a `writeExclusive` quando ela falha; `:58–88` injeta ingestão real na leitura do segmento antigo e distingue corrupção estável. `store.unit.test.mjs:26–36` exige snapshot idêntico sem escrita, e `:39–60` exige conflito quando o estado muda entre leituras. `privacy/store.mjs:392–417` revalida lock e estado também após falha do segmento. | PASS |
| C9 | `report.cli.test.mjs:79–88` exige `lock_present`/4 para troca concorrente e `capture_invalid`/3 para corrupção estável; `:96–120` exige saídas 2/3/4/5, erros fechados, stderr vazio e sem eco. | PASS |
| C10 | `report.e2e.test.mjs:40–48` exige fluxo captura/hook/CLI, seis estados, correção, sequências e ressalva de que ler SKILL.md não prova carregamento. Julgamento carregado da rodada 19; prova repetida. | PASS |

## Achado anterior e correção

A 21ª revisão formal confirmou a ausência de escrita e a prudência para texto omitido, mas encontrou uma corrida no segmento do store: após publicar novo `state.json` e remover o arquivo anterior, `report` devolvia `io_failure`/5. `privacy/store.mjs:392–417` agora verifica lock e estado também se a leitura do segmento falha: mudança concorrente vira `lock_present`, enquanto falha com estado estável conserva sua classificação original. `report.cli.test.mjs:58–88` injeta uma ingestão real nesse intervalo e exige `lock_present`/4; em seguida corrompe o segmento sem mudar o estado e exige `capture_invalid`/3. O build registra red/green para a corrida; conferi o registro, sem atribuir a mim a execução red. Não encontrei bloqueio remanescente no diff recente.

## Política local e limites

A exceção do core vendorizado foi decidida pelo proprietário no quinto comentário e ampliada no sexto; está explícita em AGENTS.md e no comentário 6300606867. O diff recente não altera core, configuração ou pilotos; carrego o julgamento da rodada 25. Não executei revisão formal nem injeção de falhas; esta última não é exigida no perfil light.
