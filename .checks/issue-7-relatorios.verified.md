# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados.
**Profile**: light.
**HEAD**: 2232e287808dd0c5cd699f4f683f4ada266897b9.
**Diff range**: a1f855b..HEAD (entrega); 88065d6..HEAD (ampliação recente do teto).
**Round**: 31 — scoped; provas T7, correlação, governança e motor de revisão repetidas no HEAD.
**Verifier**: subagente independente; somente este arquivo foi editado.
**Gate formal**: o proprietário autorizou até 30 tentativas exclusivas da #7 após a revisão #25; ainda falta revisão formal `ready` deste HEAD antes de push, PR e merge.

## Fontes e alcance

Li AGENTS.md, `tlc-implement/references/verify.md`, `.tasks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.md`, o registro de build, a verificação anterior e a issue #7 com seus sete comentários pelo conector GitHub. O [comentário 6300606867](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6300606867) autoriza a extensão mínima de snapshot sem escrita no store; o [comentário 6297902519](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6297902519) mantém os pilotos fora desta entrega; o [comentário 6331180478](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6331180478) autoriza até 30 revisões exclusivas da #7, com 25 anteriores preservadas. Examinei o diff `88065d6..HEAD`, que altera somente evidências, documentação e teto de revisão, e reconferi a regressão da revisão formal #25. A issue e o plano continuam como fontes de C1–C10; `AGENT_SKILL_DEBUGGER_SPEC` é guia não vinculante. O checklist não possui seções Coverage ou Test policy. Comparação de UI e injeção de falhas pertencem aos perfis standard/ui, não ao light. Julgamentos de produto fora do diff recente são carregados da rodada 30 em `88065d6`; todas as provas foram repetidas neste HEAD. `CONTRIBUTING.md` não existe neste checkout.

## Provas executadas no HEAD e limites

- `node --test "tests/integrations/report/**/*.test.mjs"`: **exit 0; 85 testes, 85 passaram, 0 falharam, 0 skips**. O runner listou T7-C1 a T7-C10 nominalmente, inclusive a nova regressão T7-C6 e os controles simples.
- `node --test` com os cinco arquivos `*.unit.test.mjs` de correlação: **exit 0; 55 testes, 55 passaram, 0 falharam, 0 skips**.
- `npm run test:code-review`: **exit 0; 16 testes, 16 passaram, 0 falharam, 0 skips**. O teste C6 aceitou teto 30, rejeitou 31, manteve o padrão 2 e confirmou que aumentar o teto preserva as tentativas anteriores.
- `npm run test:governance`: **exit 0; 6 testes, 6 passaram, 0 falharam, 0 skips**.
- `.checks/code-review/issue-7/state.json` continha **25 tentativas** antes da nova revisão formal. `code-review.config.json` declara `maxRounds: 30` somente para a issue #7; os perfis `light`, `ui` e `direct` permanecem em 2.
- Comparei por conteúdo com CRLF normalizado os cinco arquivos vendorizados locais com o branch padrão de ambos os pilotos via conector GitHub: os pilotos coincidem nos cinco; `cli.mjs` e `schema.json` coincidem também com este repositório; `README.md`, `review.mjs` e `review.test.mjs` divergem conforme a exceção local autorizada. A conferência de SHA-256 desses arquivos foi registrada pelo builder; minha comparação independente foi de conteúdo normalizado, não um novo cálculo de hash. Não editei pilotos.
- Na rodada 27 (`805ab36`), smoke somente leitura de `evaluateReport` com duplicata da operação de falha em `sequence` 5, após a ação positiva em 3–4: operações permaneceram `evidence` `[1,2]`/`[3,4]`, duplicata `[5]` na primeira; condição ficou `sufficient`/`matching_command_succeeded`, citando `[1,2,5,3,4]`. A lista de citações agrupa eventos por operação e pode não estar em ordem global; a ordem da operação e a decisão permaneceram corretas. Não repeti esse smoke no HEAD atual.
- `git diff --check 88065d6..HEAD`: exit 0. `git status --porcelain` estava vazio antes da escrita deste relatório.
- Na rodada 27, a suíte ampla de correlação falhou inicialmente por escrita negada no TEMP do sandbox; repetida com TEMP no workspace, encontrou `EPERM` ao criar symlink em `timeline.cli.test.mjs`, limitação de privilégio no Windows. Não a repeti nem a considero prova verde neste HEAD. O builder registrou em `.checks/issue-7-relatorios.build.md` a regressão falhando antes da correção (0/1) e passando depois (1/1), com T7 85/85; conferi esse registro, sem atribuir a mim o red.

## Checks

| Check | Asserção decisiva executada | Resultado |
| --- | --- | --- |
| C1 | `skill-source.unit.test.mjs:31–38` exige modo observado/explícito, SHA-256, linha e arquivo inalterado; `report.e2e.test.mjs:67–68` atravessa CLI com nome Unicode. Julgamento carregado da rodada 19 em 0f557ca; prova repetida neste HEAD. | PASS |
| C2 | `instructions.unit.test.mjs:14–18` exige quatro tipos, heading/linha, ignora fence e não executa referência; `:94–103` rejeita referência parentética e conserva comando após ela; `:108–126` exige comandos coordenados e literal longo. O texto integralmente omitido por referência parentética é marcado `commandRedacted` em `instructions.mjs:90–103` e avaliado em C5. | PASS |
| C3 | `skill-source.unit.test.mjs:74–88` exige erro fechado para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; `report.cli.test.mjs:96–99` proíbe eco. Julgamento carregado da rodada 25; prova repetida. | PASS |
| C4 | `evaluate.unit.test.mjs:22–26` afirma seis estados, linhas, sequências, orientação não executável, motivo e hash. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C5 | `evaluate.unit.test.mjs:184–188` exige `partial`/`ambiguous_context`, fontes `[1,2,3,4]` e nenhuma correção para subagentes distintos; `:269–271` exige `partial`/`ambiguous_context` e fontes `[1,2,3,4,5,6]` para comando em s1/s2 e falha em s3. `:223–226` preserva conflito de duplicata; `:386–389` preserva limitação de referência parentética. O smoke da rodada 27 confirmou que a duplicata tardia não desloca a ordem lógica das operações; a prova T7 foi repetida. | PASS |
| C6 | `evaluate.unit.test.mjs:157–162` exige que `fails with exit code 2` com falha genérica sem `exitCode` resulte em `inconclusive`/`condition_unresolved` e fontes `[]`; `:149–154` preserva condição em prosa sem gatilho, e `:141–146` referência textual; `:129–138` preserva `not_applicable` com gatilho real explicitamente falso e correção `[3,4]`/`[5,6]`; `:337–340` exige gatilho real verdadeiro e ação não observada com fonte `[1,2]`; `:472–479` distingue `or` de `and`, seis eventos e gatilho falso; `:460–461` mantém gatilhos alternativos inconclusivos. | PASS |
| C7 | `render.unit.test.mjs:24–44` exige alternativa observada `inconclusive` com explicação em texto/Markdown e motivo JSON, e alternativa sem evento `unobserved` com texto de lacuna e `no_matching_observation` em JSON; `:14–21` preserva fontes, versões, limites, ausência de percentual/raciocínio privado. | PASS |
| C8 | `report.cli.test.mjs:29–55` exige três formatos, repetição, captura/skill inalteradas e zero chamadas a `writeExclusive` quando ela falha; `:58–88` injeta ingestão real na leitura do segmento antigo e distingue corrupção estável. `store.unit.test.mjs:26–36` exige snapshot idêntico sem escrita, e `:39–60` exige conflito quando o estado muda entre leituras. `privacy/store.mjs:392–417` revalida lock e estado também após falha do segmento. | PASS |
| C9 | `report.cli.test.mjs:79–88` exige `lock_present`/4 para troca concorrente e `capture_invalid`/3 para corrupção estável; `:96–120` exige saídas 2/3/4/5, erros fechados, stderr vazio e sem eco. | PASS |
| C10 | `report.e2e.test.mjs:40–48` exige fluxo captura/hook/CLI, seis estados, correção, sequências e ressalva de que ler SKILL.md não prova carregamento. Julgamento carregado da rodada 19; prova repetida. | PASS |

## Achado anterior e correção

A revisão formal #25 apontou que “If `npm test` fails with exit code 2, run `npm run fix`” podia tratar uma falha genérica como gatilho verdadeiro e relatar a ação ausente. `evaluate.mjs:142–147` agora só interpreta a ligação simples entre resultado e ação; qualificador não comprovado retorna `inconclusive`/`condition_unresolved` com fontes vazias. A regressão `evaluate.unit.test.mjs:157–162` exige esses valores exatos. Os controles `:129–138` preservam condição simples falsa e correção, e `:337–340` preserva condição simples verdadeira sem ação. O build registra red 0/1 e green 1/1 para a regressão; conferi o registro, sem atribuir a mim a execução red. Não encontrei defeito concreto no diff recente. O teto formal agora é 30 para a #7 e nenhuma revisão formal foi executada neste HEAD.

## Política local e limites

A exceção do core vendorizado foi decidida pelo proprietário no quinto comentário, ampliada a 25 no sexto e a 30 no sétimo; está explícita em AGENTS.md e na configuração. O diff recente altera somente o teto local, sua prova e documentação, sem alterar produto ou pilotos. A regra de igualdade permanece para atualizações comuns. Não executei revisão formal nem injeção de falhas; esta última não é exigida no perfil light.
