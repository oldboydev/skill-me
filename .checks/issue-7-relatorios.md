# Issue #7 — relatório de execução e instruções

Sources:

- [Issue #7](https://github.com/oldboydev/skill-me/issues/7) — resultado, critérios e limites.
- [.tasks/issue-7-relatorios.md](../.tasks/issue-7-relatorios.md) — dez critérios observáveis, superfície e decisões.
- `src/integrations/correlation/`, `src/integrations/privacy/`, `docs/traces.md` — contratos de evidência sanitizada e leitura.

Perfil: `light`. Base: `a1f855b` (merge da #6).

## Out of scope

- LLM, dashboard, `step`, serviço, publicação e execução real de agente.
- Alterar schema de captura, política sanitizada, store, timeline ou atribuição da #6.
- Afirmar omissão a partir de silêncio, carregamento a partir de leitura ou percentual de cumprimento.

## Landing

Reusar `replayCapture`/`correlateTrace`, `sanitizeText` e o vocabulário de falhas do store. A classificação e avaliação são funções puras; leitura de skill e CLI fazem apenas os efeitos de fronteira. O relatório não grava arquivo.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Relatório v1 | `reportVersion: 1`, skill identificada com SHA-256, timeline v1 e `evaluations[]` com fonte/`sequence` | formatos com análises próprias divergiriam silenciosamente. |
| Evidência de comando | comparação literal com conteúdo sanitizado, resultado e força da operação da #6 | nome de ferramenta, leitura de arquivo ou proximidade não demonstram instrução executada. |

- Nenhuma outra decisão desta entrega é difícil de reverter.

## Checks

### S1 — resolver e ler instruções · 4 arquivos lidos · 42 KB · ~10,5k tokens

**C1** — nome observado resolve candidato único; caminho explícito identifica a skill mesmo com nome divergente; ambos registram SHA-256, linhas e não alteram o arquivo.
Proof: `node --test --test-name-pattern=T7-C1 tests/integrations/report/skill-source.unit.test.mjs`

**C2** — frontmatter e fences não viram instruções; listas distinguem ação, validação, orientação e condição com heading/linha; nenhum comando referenciado é executado.
Proof: `node --test --test-name-pattern=T7-C2 tests/integrations/report/instructions.unit.test.mjs`

**C3** — nomes ambíguos/ausentes, arquivo não regular, UTF-8 inválido e acima de 1 MiB falham fechados sem conteúdo/caminho na resposta.
Proof: `node --test --test-name-pattern=T7-C3 tests/integrations/report/skill-source.unit.test.mjs`

### S2 — julgar e explicar · 5 arquivos lidos · 44 KB · ~11k tokens

**C4** — cada avaliação traz um estado da lista fechada, motivo e fonte linha/hash; observações citam sequências; orientação não conta como tarefa executável.
Proof: `node --test --test-name-pattern=T7-C4 tests/integrations/report/evaluate.unit.test.mjs`

**C5** — comando literal com par nativo positivo é suficiente, início isolado ou vínculo heurístico parcial, resultado negativo contradição, sem evento ausência de observação; leitura de SKILL.md não comprova carregamento.
Proof: `node --test --test-name-pattern=T7-C5 tests/integrations/report/evaluate.unit.test.mjs`

**C6** — condição explicitamente falsa é não aplicável; sem prova fica inconclusiva; erro depois corrigido para o mesmo comando é relatado com ambas as sequências.
Proof: `node --test --test-name-pattern=T7-C6 tests/integrations/report/evaluate.unit.test.mjs`

**C7** — explicação cita fatos, marca hipóteses, informa ambiente/versões disponíveis, revisão, modo, timeline, avaliações e limites; não contém raciocínio privado nem percentual.
Proof: `node --test --test-name-pattern=T7-C7 tests/integrations/report/render.unit.test.mjs`

### S3 — CLI e demonstração · 4 arquivos lidos · 32 KB · ~8k tokens

**C8** — comando local devolve texto, Markdown e JSON v1 da mesma análise sanitizada; repetição preserva output e não modifica captura/skill.
Proof: `node --test --test-name-pattern=T7-C8 tests/integrations/report/report.cli.test.mjs`

**C9** — flags/formatos/ID malformado saem 2, skill/estado de captura inválidos ou ausentes 3, conflito 4, E/S 5, com código fechado e sem eco.
Proof: `node --test --test-name-pattern=T7-C9 tests/integrations/report/report.cli.test.mjs`

**C10** — fixtures normal, erro/correção e condicional atravessam captura, correlação e relatório, demonstram seis estados e não atribuem leitura de SKILL.md como carregamento.
Proof: `node --test --test-name-pattern=T7-C10 tests/integrations/report/report.e2e.test.mjs`

## Swept

- validation: C1–C3, C9.
- failure modes: C3–C6, C9.
- idempotency and retry: C8; consulta não persiste.
- authorization: existing — raiz/captura explícitas; caminho de skill informado ou candidato local.
- concurrency and ordering: C6, C8; snapshot e `sequence` vêm da #6/#8.
- data lifecycle: existing — store da #5/#8; C8 não grava relatório.
- external-dependency failure: C7, C8; nenhuma dependência externa.
- state transitions: C4–C6.
- observability: C4, C7, C10.

## Handoff

Um lote: S1 ~10,5k + S2 ~11k + S3 ~8k = piso ~29,5k tokens de leitura, abaixo de 150k. A consulta usa a mesma timeline e a mesma regra de avaliação nas três superfícies; não há mudança de domínio que justifique troca de autor. O coordenador chama o Verifier após o último commit.
