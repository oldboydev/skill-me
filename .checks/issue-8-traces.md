# Issue #8 — traces locais

Profile: `light` · plano aprovado para execução pelo pedido do proprietário nesta conversa em 18/10/2026.

Sources:

- [Issue #8](https://github.com/oldboydev/skill-me/issues/8) — oito critérios de aceite e limites.
- `.tasks/issue-8-traces.md` — 13 resultados observáveis em três fatias e decisões técnicas.
- `.tasks/issue-4-integracoes.md`, `src/integrations/boundary.mjs` e `docs/agent-observation.md` — contratos nativos e envelope v1.
- `.tasks/issue-5-privacidade.md`, `docs/privacidade.md` e `src/integrations/privacy/` — política, estado, store e limites existentes.
- `AGENTS.md` e `scripts/code-review/README.md` — rigor e entrega.

## Out of scope

- Timeline, atribuição e deduplicação analítica (#6); parser/avaliação de SKILL.md e relatório (#7).
- Dashboard, serviço remoto, upload, instalação global, publicação e deploy.
- Trocar a persistência da #5 por outro banco ou gerenciador de pacotes.

## Landing

As integrações usam os adaptadores e `applyPolicy` existentes; o disco usa o store da #5. A CLI acrescenta consulta sem criar outro lifecycle. A decisão de um evento chegar a uma captura é separada da observação em memória da #4.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Vínculo explícito entre processos | `SKILL_ME_CAPTURE_ROOT` + `SKILL_ME_CAPTURE_ID` herdados pelo agente; ambos exigidos e captura `active` validada pelo store | Coletor descoberto automaticamente criaria destino implícito e serviço novo. |
| Dados persistidos | `captureVersion: 1`, `recordVersion: 1`, envelope v1 e política da #5; sem segundo formato | Um trace paralelo permitiria contornar a sanitização e migraria dados já gravados. |
| Saída pública nova | `privacy list` JSON v1 em páginas de 100; `privacy follow` NDJSON v1 `record`/`end`/`error` | Alterar `export` ou reter tudo até o fim impediria clientes existentes e acompanhamento. |

- Nenhuma outra decisão desta entrega é difícil de reverter. Valores descobertos que alterem estas linhas precisam ser registrados em Landing antes do código correspondente.

## Checks

### S1 — eventos reais chegam à captura escolhida · 7 arquivos existentes · 50 KB · ~13k de leitura mínima

**C1** — Hook Claude vinculado grava exatamente um registro v1 por evento fixture suportado, com origem e lacunas do envelope; sem payload bruto no disco. Critérios 1–2.
Proof: `node --test --test-name-pattern='T8-C1 Claude live capture' tests/integrations/traces/live-capture.cli.test.mjs`

**C2** — Hook Codex vinculado grava exatamente um registro v1 por evento fixture suportado e sai 0. Critérios 1, 3.
Proof: `node --test --test-name-pattern='T8-C2 Codex hook live capture' tests/integrations/traces/live-capture.cli.test.mjs`

**C3** — Ingest Hermes vinculado grava cada evento fixture suportado uma vez, sem alterar o código de saída do comando interno. Critérios 1, 3.
Proof: `node --test --test-name-pattern='T8-C3 Hermes live capture' tests/integrations/traces/live-capture.cli.test.mjs`

**C4** — Wrapper Codex vinculado grava os eventos fixture de `exec --json` uma vez e preserva bytes, código e sinal do filho; hooks do filho não duplicam o mesmo fluxo. Critérios 1, 3.
Proof: `node --test --test-name-pattern='T8-C4 supervised Codex live capture' tests/integrations/traces/live-capture.cli.test.mjs`

**C5** — ID nativo igual de dois processos da mesma captura produz um `h1:` igual; outra captura produz valor distinto. Critério 2.
Proof: `node --test --test-name-pattern='T8-C5 capture scoped pseudonyms' tests/integrations/traces/live-capture.cli.test.mjs`

**C6** — Sem o par de ambiente completo e válido, hooks não escrevem em captura e mantêm código 0; o wrapper mantém o contrato do filho. Critério 3.
Proof: `node --test --test-name-pattern='T8-C6 no implicit capture' tests/integrations/traces/live-capture.cli.test.mjs`

**C7** — Payload inválido, evento desconhecido, linha nativa acima de 64 KiB, envelope recusado e conteúdo não suportado nunca viram registro; os motivos observáveis são distintos. Critério 4.
Proof: `node --test --test-name-pattern='T8-C7 invalid native input classifications' tests/integrations/traces/live-capture.cli.test.mjs`

**C8** — Captura com conteúdo desligado omite argumentos/resultados; `--content` permite somente campos suportados já sanitizados. Critério 2.
Proof: `node --test --test-name-pattern='T8-C8 live content policy' tests/integrations/traces/live-capture.cli.test.mjs`

### S2 — consulta e acompanhamento pela CLI local · 4 arquivos existentes · 37 KB · ~10k de leitura mínima

**C9** — `list` entrega no máximo 100 capturas na ordem `createdAt,id`; `--after` continua a página sem repetição e expõe estado, limites e contadores. Critério 5.
Proof: `node --test --test-name-pattern='T8-C9 list pages and metadata' tests/integrations/traces/query.cli.test.mjs`

**C10** — `list` recusa raiz ausente, link e estado inválido com formato/código fechado; não cria arquivos. Critério 5.
Proof: `node --test --test-name-pattern='T8-C10 list invalid store' tests/integrations/traces/query.cli.test.mjs`

**C11** — `export` de captura ativa ou encerrada preserva ordem, origem, lacunas e contadores sem modificar bytes locais. Critério 6.
Proof: `node --test --test-name-pattern='T8-C11 export observed capture' tests/integrations/traces/query.cli.test.mjs`

**C12** — `follow` em captura ativa vazia espera; após dois appends distintos emite sequências 1 e 2 uma vez cada e termina com `end` após `stop`/`disable`. Critério 7.
Proof: `node --test --test-name-pattern='T8-C12 follow new records once' tests/integrations/traces/follow.cli.test.mjs`

**C13** — `follow` de captura já encerrada entrega backlog e `end`; exclusão durante o fluxo produz linha `error` e código 3, sem ecoar raiz/payload. Critério 7.
Proof: `node --test --test-name-pattern='T8-C13 follow terminal and deletion' tests/integrations/traces/follow.cli.test.mjs`

**C14** — `stop`/`disable` recusam ingest tardio; `delete`/`prune` exigem `--apply`, preservam captura ativa e removem somente entradas próprias. Critério 8.
Proof: `node --test --test-name-pattern='T8-C14 lifecycle remains authoritative' tests/integrations/traces/query.cli.test.mjs`

### S3 — consistência, limites e reutilização dos dados · 5 arquivos existentes · 69 KB · ~18k de leitura mínima

**C15** — Dois processos enviando eventos distintos em paralelo deixam ambos confirmados exatamente uma vez e `state.json`/segmento coerentes; conflito/falha não aparece como sucesso. Critério 9.
Proof: `node --test --test-name-pattern='T8-C15 concurrent producers' tests/integrations/traces/concurrency.cli.test.mjs`

**C16** — Com lock ocupado ou falha de E/S, o produtor encerra a tentativa em até 750 ms após ler o evento, não bloqueia o agente e emite apenas código diagnóstico fechado; sem retry após confirmação incerta. Critérios 3, 9–10.
Proof: `node --test --test-name-pattern='T8-C16 delivery failure neutrality' tests/integrations/traces/concurrency.cli.test.mjs`

**C17** — Limites de 500 registros, 8 MiB, 64 KiB por linha nativa e 2 s de stdin de hook são conservados; no limite e um passo acima, admissão e motivos de descarte coincidem com a política. Critério 10.
Proof: `node --test --test-name-pattern='T8-C17 capture and input bounds' tests/integrations/traces/limits.cli.test.mjs`

**C18** — Consumidor analítico falso lê somente registros v1 já sanitizados, na ordem armazenada, sem iniciar agente, executar comandos ou reler payload nativo. Critério 11.
Proof: `node --test --test-name-pattern='T8-C18 sanitized replay to consumer' tests/integrations/traces/replay.unit.test.mjs`

**C19** — Demonstração com fixtures percorre `start`, integração, armazenamento, `list`, `export`, `follow`, `stop` e replay, e identifica execução simulada/nativa sem alegar modelo real. Critério 12.
Proof: `node --test --test-name-pattern='T8-C19 trace walkthrough' tests/integrations/traces/demo.e2e.test.mjs`

**C20** — Guia descreve Node >=24, uso local com paths de espaço/Unicode, configuração explícita, limites, códigos, retenção/exclusão e capacidades efetivamente demonstradas. Critério 13.
Proof: `node --test --test-name-pattern='T8-C20 trace documentation contract' tests/integrations/traces/docs.test.mjs`

**C21** — As suítes afetadas executam no Windows e na matriz CI Windows/Ubuntu/macOS; os cinco arquivos do core de revisão mantêm os hashes da base. Critério 13 e governança.
Proof: `npm test` com totais de testes, falhas e skips registrados em `.checks/issue-8-traces.build.md`; comparação de `git diff origin/main -- scripts/code-review/cli.mjs scripts/code-review/review.mjs scripts/code-review/review.test.mjs scripts/code-review/schema.json scripts/code-review/README.md` (vazio).

## Swept

- validation: C6–C7, C10, C17.
- failure modes: C7, C10, C13, C16.
- idempotency and retry: C1–C4, C12, C15–C16; duplicatas analíticas pertencem à #6.
- authorization: C6 e guarda existente da captura explícita/ativa em #5; sem serviço remoto.
- concurrency and ordering: C12, C15–C17.
- data lifecycle: C14.
- external-dependency failure: C16; sem provedor externo durante a captura.
- state transitions: C12–C14.
- observability: C7, C9, C13, C16–C20.

## Handoff

Um lote para S1–S3: ~41k tokens de leitura mínima dos arquivos existentes listados nos três títulos, mais testes e iteração, abaixo do teto de 150k. Não há troca de superfície que justifique cortar uma fatia; o builder fecha as três e o orquestrador aciona um Verifier fresco sobre `origin/main..HEAD`.

O perfil `light` não faz campanha sistemática de fault injection. As provas acima incluem regressões concretas de concorrência, falha e limite por exigência da issue, não uma campanha geral.
