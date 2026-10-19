# Issue #6 — timeline de execução

Sources:

- [Issue #6](https://github.com/oldboydev/skill-me/issues/6) — sete critérios funcionais e limites.
- [.tasks/issue-6-correlacao.md](../.tasks/issue-6-correlacao.md) — 14 critérios observáveis, superfície, contratos e decisões.
- `src/integrations/boundary.mjs`, adaptadores e `traces/replay.mjs` — schema v1 realmente disponível.

Perfil: `light`. Base: `cc74be7` (merge da #8).

## Out of scope

- Ler ou avaliar instruções da skill e produzir relatórios — #7.
- Alterar schema v1, captura, instalação ou hooks — #4/#5/#8.
- Serviço, telemetria, dashboard, execução de modelo e publicação — não autorizados.

## Landing

Consumir a cópia sanitizada de `replayCapture` por uma correlação pura. Reusar
`privacy export` e a estrutura de erros da CLI; não abrir caminho alternativo
para o store. Testes de decisões ficam no consumidor puro e testes de fronteira
atravessam a CLI.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Timeline v1 | `{ timelineVersion: 1, capture, entries, operations, coverage }`; `entries` 1:1 em `sequence` | ordenar por instante alteraria a posição canônica da evidência |
| Força do vínculo | `native`, `heuristic`, `inconclusive`, sempre com `sequence` de origem | inferir uso por leitura de arquivo ou proximidade esconderia ambiguidade |

- Nada mais nesta entrega é difícil de reverter.

## Checks

### S1 — ordem, identidade e duplicatas · 3 arquivos lidos · 41 KB · ~10,3k tokens

**C1** — a API pura conserva uma entrada por registro na ordem 1..N, com campos v1 e evidência, mesmo quando `observedAt` decresce; vazio retorna listas vazias.
Proof: `node --test --test-name-pattern=T6-C1 tests/integrations/correlation/timeline.unit.test.mjs`

**C2** — IDs pseudonimizados separam captura, agente, mecanismo, sessão, turno, chamada e subagente; ID ausente fica `null`.
Proof: `node --test --test-name-pattern=T6-C2 tests/integrations/correlation/timeline.unit.test.mjs`

**C3** — duas sessões intercaladas e evento sem ID não produzem vínculo nativo cruzado; candidato contextual é heurístico com origem ou inconclusivo.
Proof: `node --test --test-name-pattern=T6-C3 tests/integrations/correlation/timeline.unit.test.mjs`

**C4** — duplicata com identidade completa aponta `duplicateOf` à primeira sequência e não duplica operação; sem identidade completa, cada evento permanece independente.
Proof: `node --test --test-name-pattern=T6-C4 tests/integrations/correlation/timeline.unit.test.mjs`

**C5** — `outOfOrder` marca instante regressivo sem reordenar; `resume` com ID mantém sessão em segmento distinto, sem ID não junta.
Proof: `node --test --test-name-pattern=T6-C5 tests/integrations/correlation/timeline.unit.test.mjs`

### S2 — operações e limites de atribuição · 5 arquivos lidos · 38 KB · ~9,5k tokens

**C6** — ferramentas com IDs completos são pareadas por escopo, inclusive paralelas e fora de ordem; itens Codex sem sessão só formam candidato heurístico não ambíguo; resultado órfão e início aberto têm estados próprios.
Proof: `node --test --test-name-pattern=T6-C6 tests/integrations/correlation/operations.unit.test.mjs`

**C7** — resultado, erro e duração nativos aparecem só quando observados; intervalo calculado válido é `derived`, resultado anterior ao início não tem duração calculada.
Proof: `node --test --test-name-pattern=T6-C7 tests/integrations/correlation/operations.unit.test.mjs`

**C8** — Claude Skill pre/post com `toolUseId` forma invocação nativa, com `open`/`orphan_result` nas metades ausentes; post não vira conclusão de instruções.
Proof: `node --test --test-name-pattern=T6-C8 tests/integrations/correlation/skills.unit.test.mjs`

**C9** — expansão direta, lifecycle Hermes, leitura `SKILL.md` e tool Codex preservam evidência observada sem criar invocação nativa de skill.
Proof: `node --test --test-name-pattern=T6-C9 tests/integrations/correlation/skills.unit.test.mjs`

**C10** — subagente só se liga a pai/filho com IDs explícitos e não captura chamadas do pai por igualdade de nome ou papel.
Proof: `node --test --test-name-pattern=T6-C10 tests/integrations/correlation/subagents.unit.test.mjs`

**C11** — fim de turno/sessão/processo e fronteira manual/timeout não emitem `skill_completed` nem fecham nativamente skill aberta.
Proof: `node --test --test-name-pattern=T6-C11 tests/integrations/correlation/skills.unit.test.mjs`

### S3 — consulta, cobertura e fluxo · 3 arquivos lidos · 25 KB · ~6,2k tokens

**C12** — `privacy timeline` lê ativa/encerrada sem escrita e responde JSON v1; faltas, captura inválida, lock e E/S usam códigos 2/3/4/5 e erro fechado.
Proof: `node --test --test-name-pattern=T6-C12 tests/integrations/correlation/timeline.cli.test.mjs`

**C13** — cobertura traz contadores/limites da captura, motivos com sequência, totais de ambiguidade/órfãos/abertos/duplicatas/ordem e `partial` sem percentual.
Proof: `node --test --test-name-pattern=T6-C13 tests/integrations/correlation/coverage.unit.test.mjs`

**C14** — fluxo de fixtures Claude/Codex/Hermes via captura local entrega a mesma timeline na API e CLI; identifica fixtures e não declara modelo real.
Proof: `node --test --test-name-pattern=T6-C14 tests/integrations/correlation/timeline.e2e.test.mjs`

## Swept

- validation: C1, C2, C12; revalidar que a leitura continua pelo store da #8.
- failure modes: C3, C6–C8, C12, C13.
- idempotency and retry: C4; correlação não grava nem reenvia.
- authorization: existing — raiz/captura explícitas em `privacy/args.mjs` e store.
- concurrency and ordering: C3–C6, C12; snapshot do store e sequência.
- data lifecycle: existing — stop/disable/delete/prune do store não mudam.
- external-dependency failure: C12; sem serviço ou dependência nova.
- state transitions: C5, C6, C8, C11.
- observability: C1, C7–C9, C13, C14.

## Handoff

Um lote: S1 ~10,3k + S2 ~9,5k + S3 ~6,2k = piso ~26k tokens
de leitura, abaixo de 150k. As três fatias consomem o mesmo envelope e o
mesmo consumidor puro; a mudança de superfície para CLI só ocorre em S3,
sem justificar um segundo autor. O implementador não dispara seu próprio
Verifier; o coordenador o chama após o último commit.
