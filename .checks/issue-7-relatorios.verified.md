# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados.
**Profile**: light.
**HEAD**: 5b34f968a7bcf6c8e20caba867cdc9d68bd31ab8.
**Diff range**: a1f855b..HEAD (entrega); f4e61b5..HEAD (correção da revisão formal #27).
**Round**: 34 — scoped; provas T7 repetidas no HEAD.
**Verifier**: subagente independente; somente este arquivo foi editado.
**Gate formal**: o proprietário autorizou até 30 tentativas exclusivas da #7; a revisão #27 pediu correções. Ainda falta revisão formal `ready` deste HEAD antes de push, PR e merge.

## Fontes e alcance

Li AGENTS.md, `tlc-implement/references/verify.md`, `.tasks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.md`, o registro de build, a verificação anterior e o contexto salvo da issue #7 com seus sete comentários. O [comentário 6300606867](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6300606867) autoriza a extensão mínima de snapshot sem escrita no store; o [comentário 6297902519](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6297902519) mantém os pilotos fora desta entrega; o [comentário 6331180478](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6331180478) autoriza até 30 revisões exclusivas da #7, com 25 anteriores preservadas. Examinei o diff `f4e61b5..HEAD`, que altera o parser, duas regressões e o registro de build, com foco no achado P1 da revisão formal #27. A issue e o plano continuam como fontes de C1–C10; `AGENT_SKILL_DEBUGGER_SPEC` é guia não vinculante. O checklist não possui seções Coverage ou Test policy. Comparação de UI e injeção de falhas pertencem aos perfis standard/ui, não ao light. Julgamentos e evidências não afetados pelo diff são carregados da rodada 32 em `6cd20d2`; todas as provas T7 foram repetidas neste HEAD. `CONTRIBUTING.md` não existe neste checkout.

## Provas executadas no HEAD e limites

- `node --test tests/integrations/report/*.test.mjs`: **exit 0; 90 testes, 90 passaram, 0 falharam, 0 skips**. O runner listou T7-C1 a T7-C10 nominalmente, inclusive as duas regressões para o bloco sensível, a continuação normal de comandos, plataforma sem prova e comandos enumerados.
- `node --test` com os cinco arquivos `*.unit.test.mjs` de correlação: **55/55**, carregado da rodada 31 em `2232e28`; não repetido, pois o diff recente não altera a correlação.
- `npm run test:code-review`: **16/16**, carregado da rodada 31 em `2232e28`; não repetido. O teste C6 aceitou teto 30, rejeitou 31, manteve o padrão 2 e confirmou que aumentar o teto preserva as tentativas anteriores.
- `npm run test:governance`: **6/6**, carregado da rodada 31 em `2232e28`; não repetido.
- `.checks/code-review/issue-7/state.json` contém **27 tentativas**, a última referente a `f4e61b5` com achado P1; `code-review.config.json` declara `maxRounds: 30` somente para a issue #7; os perfis `light`, `ui` e `direct` permanecem em 2.
- Comparei por conteúdo com CRLF normalizado os cinco arquivos vendorizados locais com o branch padrão de ambos os pilotos via conector GitHub: os pilotos coincidem nos cinco; `cli.mjs` e `schema.json` coincidem também com este repositório; `README.md`, `review.mjs` e `review.test.mjs` divergem conforme a exceção local autorizada. A conferência de SHA-256 desses arquivos foi registrada pelo builder; minha comparação independente foi de conteúdo normalizado, não um novo cálculo de hash. Não editei pilotos.
- Na rodada 27 (`805ab36`), smoke somente leitura de `evaluateReport` com duplicata da operação de falha em `sequence` 5, após a ação positiva em 3–4: operações permaneceram `evidence` `[1,2]`/`[3,4]`, duplicata `[5]` na primeira; condição ficou `sufficient`/`matching_command_succeeded`, citando `[1,2,5,3,4]`. A lista de citações agrupa eventos por operação e pode não estar em ordem global; a ordem da operação e a decisão permaneceram corretas. Não repeti esse smoke no HEAD atual.
- `git diff --check 6cd20d..HEAD`: exit 0. `git status --porcelain` estava vazio antes da escrita deste relatório.
- Na rodada 27, a suíte ampla de correlação falhou inicialmente por escrita negada no TEMP do sandbox; repetida com TEMP no workspace, encontrou `EPERM` ao criar symlink em `timeline.cli.test.mjs`, limitação de privilégio no Windows. Não a repeti nem a considero prova verde neste HEAD. O builder registrou em `.checks/issue-7-relatorios.build.md` a regressão falhando antes da correção (0/1) e passando depois (1/1), com T7 85/85; conferi esse registro, sem atribuir a mim o red.

## Checks

| Check | Asserção decisiva executada | Resultado |
| --- | --- | --- |
| C1 | `skill-source.unit.test.mjs:31–38` exige modo observado/explícito, SHA-256, linha e arquivo inalterado; `report.e2e.test.mjs:67–68` atravessa CLI com nome Unicode. Julgamento carregado da rodada 19 em 0f557ca; prova repetida neste HEAD. | PASS |
| C2 | `instructions.unit.test.mjs:14–18` exige quatro tipos, heading/linha, ignora fence e não executa referência; `:31–36` preserva exatamente dois comandos em continuação comum; os julgamentos de referência parentética e enumeração por vírgulas são carregados da rodada 32. Prova T7 repetida. | PASS |
| C3 | `skill-source.unit.test.mjs:74–88` exige erro fechado para ausência, ambiguidade, arquivo não regular, UTF-8 inválido e 1 MiB + 1; `report.cli.test.mjs:105–110` proíbe eco. Julgamento carregado da rodada 25; prova repetida. | PASS |
| C4 | `evaluate.unit.test.mjs:22–26` afirma seis estados, linhas, sequências, orientação não executável, motivo e hash. Julgamento carregado da rodada 19; prova repetida. | PASS |
| C5 | `evaluate.unit.test.mjs:173–186` exige que só `npm test` positivo renda `partial`/`commands_incomplete` com `[1,2]`, e que os três comandos positivos rendam `sufficient`/`all_commands_succeeded` com `[1,2,3,4,5,6]`. Os demais julgamentos são carregados da rodada 31; a prova T7 foi repetida. | PASS |
| C6 | `evaluate.unit.test.mjs:165–170` exige que `If on Linux` com falha genérica sem prova da plataforma resulte em `inconclusive`/`condition_unresolved` e fontes `[]`; `:157–162` exige o mesmo para código de saída 2 sem prova; `:129–138` preserva `not_applicable` com gatilho simples explicitamente falso e correção `[3,4]`/`[5,6]`. Os demais julgamentos são carregados da rodada 31; a prova T7 foi repetida. | PASS |
| C7 | `render.unit.test.mjs:24–44` exige alternativa observada `inconclusive` com explicação em texto/Markdown e motivo JSON, e alternativa sem evento `unobserved` com texto de lacuna e `no_matching_observation` em JSON; `:14–21` preserva fontes, versões, limites, ausência de percentual/raciocínio privado. | PASS |
| C8 | `instructions.unit.test.mjs:39–44` exige `text: null`, `commandRedacted: true` e nenhum valor sensível no objeto interno para `password: |` em continuação. `report.cli.test.mjs:44–51` exige status 0 e ausência do valor em text, Markdown e JSON, com `evaluations[0].text === null`. O teste `report.cli.test.mjs:29–41` preserva três formatos, repetição e captura/skill; `:55–66` exige zero chamadas a `writeExclusive`. Snapshot e conflito do store carregados da rodada 32. | PASS |
| C9 | `report.cli.test.mjs:90–99` exige `lock_present`/4 para troca concorrente e `capture_invalid`/3 para corrupção estável; `:105–131` exige saídas 2/3/4/5, erros fechados, stderr vazio e sem eco. | PASS |
| C10 | `report.e2e.test.mjs:40–48` exige fluxo captura/hook/CLI, seis estados, correção, sequências e ressalva de que ler SKILL.md não prova carregamento. Julgamento carregado da rodada 19; prova repetida. | PASS |

## Achado P1 da revisão formal #27

O caso vinculante é um item de skill com `password: |` seguido do valor na próxima linha. Em `instructions.mjs:96–104`, `activeRaw` preserva a quebra antes da chamada a `safeText`; a política de privacidade identifica o bloco sem projeção segura e devolve `null`. A normalização com espaços ocorre somente quando há texto sanitizado. `skill-source.mjs:96–105` retorna instruções já processadas, e `evaluate.mjs:206–215` projeta apenas os campos sanitizados; o relatório não carrega a fonte bruta. O teste do parser em `instructions.unit.test.mjs:39–44` procura o valor em todos os campos da instrução serializada, e o teste da CLI em `report.cli.test.mjs:44–51` o procura nas três saídas. Ambos passaram no lote T7 90/90. `instructions.unit.test.mjs:31–36` confirma que uma continuação normal ainda conserva os comandos `npm test` e `npm run build`. O builder documentou duas regressões vermelhas antes da correção; conferi o registro, sem atribuir essa execução a mim. Não encontrei lacuna no cenário P1 corrigido.

## Achados anteriores carregados da rodada 32

A revisão #26 apontou que “If on Linux `npm test` fails, run `npm run fix`” podia usar uma falha genérica como prova de gatilho verdadeiro, embora não houvesse prova de Linux. `evaluate.mjs:134–146` exige que o prefixo contenha só o introdutor condicional e que a ligação entre gatilho e ação seja simples; o caso qualificado retorna `inconclusive`/`condition_unresolved` sem fontes. `evaluate.unit.test.mjs:165–170` exige exatamente isso, enquanto `:129–138` preserva condição simples falsa e correção comprovada.

A mesma revisão apontou que “Run `npm test`, `npm run lint` and `npm run build`” podia virar suficiente com só o primeiro comando. `instructions.mjs:10,31–55` reconhece a vírgula como ligação de comandos; `instructions.unit.test.mjs:121–123` exige os três literais; `evaluate.unit.test.mjs:173–186` exige parcial com só um comando e suficiente apenas com os três resultados positivos. O registro de build informa três regressões falhando antes da correção (63/66); conferi esse registro sem atribuir a mim o red. No HEAD, executei T7 completo 90/90. O teto formal é 30 para a #7; nenhuma revisão formal foi executada neste HEAD.

## Política local e limites

A exceção do core vendorizado foi decidida pelo proprietário no quinto comentário, ampliada a 25 no sexto e a 30 no sétimo; está explícita em AGENTS.md e na configuração. O diff recente altera somente parser, regressões e registro de build, sem tocar pilotos. A regra de igualdade permanece para atualizações comuns. Não executei revisão formal nem injeção de falhas; esta última não é exigida no perfil light. A suíte ampla de integração permanece sem prova verde no sandbox, conforme o registro de build, e não foi necessária para o diff restrito ao parser de relatório.
