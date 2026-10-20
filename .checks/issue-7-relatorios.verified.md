# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados.
**Profile**: light.
**HEAD**: 805ab368d5e586f9b0f7dbded1e2b1edc576f3fe.
**Diff range**: a1f855b..HEAD (entrega); 99faca5..HEAD (correção recente).
**Round**: 27 — scoped; provas T7 e unitárias de correlação repetidas no HEAD.
**Verifier**: subagente independente; somente este arquivo foi editado.

## Fontes e alcance

Li AGENTS.md, `tlc-implement/references/verify.md`, `.tasks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.md`, o registro de build, a verificação anterior e o contexto aprovado da issue #7. O [comentário 6300606867](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6300606867) autoriza a extensão mínima de snapshot sem escrita no store e até 25 revisões exclusivas da #7; o [comentário 6297902519](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6297902519) mantém os pilotos fora desta entrega. Examinei o diff `99faca5..HEAD`, a leitura de instruções, a avaliação e as novas regressões dos dois cenários da saída formal inválida. A issue e o plano continuam como fontes de C1–C10; `AGENT_SKILL_DEBUGGER_SPEC` é guia não vinculante. O checklist não possui seções Coverage ou Test policy. Comparação de UI e injeção de falhas pertencem aos perfis standard/ui, não ao light. Julgamentos fora do diff recente são carregados da rodada 26 em `99faca5` e as provas T7 foram repetidas neste HEAD.

## Provas executadas no HEAD

- `node --test "tests/integrations/report/**/*.test.mjs"`: **exit 0; 80 testes, 80 passaram, 0 falharam, 0 skips**. O runner listou T7-C1 a T7-C10 nominalmente, inclusive as duas novas provas T7-C5.
- `node --test` com os cinco arquivos `*.unit.test.mjs` de correlação: **exit 0; 55 testes, 55 passaram, 0 falharam, 0 skips**.
- Smoke somente leitura de `evaluateReport` com duplicata da operação de falha em `sequence` 5, após a ação positiva em 3–4: operações permaneceram `evidence` `[1,2]`/`[3,4]`, duplicata `[5]` na primeira; condição ficou `sufficient`/`matching_command_succeeded`, citando `[1,2,5,3,4]`. A lista de citações agrupa eventos por operação e pode não estar em ordem global; a ordem da operação e a decisão permaneceram corretas.
- `git diff --check 99faca5..HEAD`: exit 0. `git status --porcelain` estava vazio antes da escrita deste relatório.
- A suíte ampla de correlação falhou inicialmente por escrita negada no TEMP do sandbox; repetida com TEMP no workspace, encontrou `EPERM` ao criar symlink em `timeline.cli.test.mjs`, limitação de privilégio no Windows. Ela não é prova verde neste HEAD; os cinco arquivos unitários e o lote T7 foram executados com sucesso. O builder registrou em `.checks/issue-7-relatorios.build.md` duas regressões falhando antes da correção (0/2) e passando depois (2/2), com T7 80/80; conferi esse registro, sem atribuir a mim o red.

## Checks

| Check | Asserção decisiva executada | Resultado |
| --- | --- | --- |
| C1 | `skill-source.unit.test.mjs:31–38` exige modo observado/explícito, SHA-256, linha e arquivo inalterado; `report.e2e.test.mjs:67–68` atravessa CLI com nome Unicode. Julgamento carregado da rodada 19 em 0f557ca; prova repetida neste HEAD. | PASS |
| C2 | `instructions.unit.test.mjs:14–18` exige quatro tipos, heading/linha, ignora fence e não executa referência; `:94–103` rejeita referência parentética e conserva comando após ela; `:108–126` exige comandos coordenados e literal longo. O texto integralmente omitido por referência parentética é marcado `commandRedacted` em `instructions.mjs:90–103` e avaliado em C5. | PASS |
| C3 | `skill-source.unit.test.mjs:74–88` exige erro fechado para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; `report.cli.test.mjs:96–99` proíbe eco. Julgamento carregado da rodada 25; prova repetida. | PASS |
| C4 | `evaluate.unit.test.mjs:22–26` afirma seis estados, linhas, sequências, orientação não executável, motivo e hash. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C5 | `evaluate.unit.test.mjs:185–188` exige `partial`/`command_conflict` e fontes `[1,2,3]` quando a duplicata tem argumento divergente; `:335–338` exige `inconclusive`/`command_redacted`, texto `null` e fontes `[1,2,3,4]` com referência parentética que omite o texto integral; `:319–325` preserva o caso anterior de opção omitida. O smoke confirmou que a duplicata tardia não desloca a ordem lógica das operações. | PASS |
| C6 | `evaluate.unit.test.mjs:282–289` exige condição sem gatilho `inconclusive`, mas condição com gatilho nativo verdadeiro e nenhuma ação `unobserved`/`condition_true_action_unobserved` com fontes `[1,2]`; `:421–428` preserva ações ligadas por `or` versus `and`, seis eventos e gatilho falso; `:409–410` exige `condition_unresolved` para gatilhos alternativos. Julgamento carregado da rodada 26; prova repetida. | PASS |
| C7 | `render.unit.test.mjs:24–44` exige alternativa observada `inconclusive` com explicação em texto/Markdown e motivo JSON, e alternativa sem evento `unobserved` com texto de lacuna e `no_matching_observation` em JSON; `:14–21` preserva fontes, versões, limites, ausência de percentual/raciocínio privado. | PASS |
| C8 | `report.cli.test.mjs:29–55` exige três formatos, repetição, captura/skill inalteradas e zero chamadas a `writeExclusive` quando ela falha; `:58–88` injeta ingestão real na leitura do segmento antigo e distingue corrupção estável. `store.unit.test.mjs:26–36` exige snapshot idêntico sem escrita, e `:39–60` exige conflito quando o estado muda entre leituras. `privacy/store.mjs:392–417` revalida lock e estado também após falha do segmento. | PASS |
| C9 | `report.cli.test.mjs:79–88` exige `lock_present`/4 para troca concorrente e `capture_invalid`/3 para corrupção estável; `:96–120` exige saídas 2/3/4/5, erros fechados, stderr vazio e sem eco. | PASS |
| C10 | `report.e2e.test.mjs:40–48` exige fluxo captura/hook/CLI, seis estados, correção, sequências e ressalva de que ler SKILL.md não prova carregamento. Julgamento carregado da rodada 19; prova repetida. | PASS |

## Achado anterior e correção

A tentativa formal seguinte à 21ª revisão foi inválida porque o JSON do revisor não preservou o SHA base solicitado; não produziu `ready`. Ela trouxe dois cenários reproduzidos em T7-C5. `instructions.mjs:90–103` marca como redigida a instrução cujo texto inteiro foi omitido, inclusive quando a referência sensível é parentética; `evaluate.unit.test.mjs:328–339` exige `inconclusive`/`command_redacted` e cita as quatro sequências visíveis. `evaluate.mjs:29–44` inclui conteúdo das duplicatas na decisão de conflito, mas retém `op.evidence` para a ordem; `:50–55`, `:73–83` e `:149–153` continuam usando essa ordem para sobreposição, condição e ação posterior. `evaluate.unit.test.mjs:178–189` exige `partial`/`command_conflict` com a duplicata citada. O smoke com duplicata tardia confirmou a decisão cronológica. O build registra red/green para os dois casos; conferi o registro, sem atribuir a mim a execução red. Não encontrei bloqueio remanescente no diff recente.

## Política local e limites

A exceção do core vendorizado foi decidida pelo proprietário no quinto comentário e ampliada no sexto; está explícita em AGENTS.md e no comentário 6300606867. O diff recente não altera core, configuração ou pilotos; carrego o julgamento da rodada 26. Não executei revisão formal nem injeção de falhas; esta última não é exigida no perfil light.
