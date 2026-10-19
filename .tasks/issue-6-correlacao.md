# Issue #6 — reconstruir timeline com evidências e lacunas

> Build this with **tlc-implement**. Cada critério vira um check com prova.
> Nada em `Unresolved` é decidido durante a implementação.

## Intent

As capturas da #8 guardam envelopes v1 sanitizados em ordem de gravação, mas ainda
não explicam como eventos de sessão, turno, ferramenta, skill e subagente se
relacionam. Eventos de processos e sessões podem intercalar-se. Uma leitura de
`SKILL.md` não prova execução, e fim de turno não prova conclusão de skill.

O usuário poderá consultar uma timeline local de uma captura e entregar a mesma
estrutura pura à futura análise da #7. Cada vínculo expõe seus registros de
origem e seu grau de evidência; a falta de identidade ou cobertura permanece
visível. A timeline não lê instruções da skill nem executa agentes.

14 critérios em 3 fatias · 2 decisões de contrato · 0 questões abertas,
0 bloqueantes. Base: merge da #8 em `origin/main` (`cc74be7`).

## Criteria

### S1 — ordenar observações e preservar identidades

1. Dado o `{ capture, records: [{ sequence, record }] }` de `replayCapture`,
   `correlateTrace` retorna `timelineVersion: 1`, `capture`, `entries`,
   `operations` e `coverage`; uma entrada por registro, ordenada por
   `sequence` de 1 a N, com `observedAt`, `source`, `eventKind`,
   `nativeEvent`, `ids`, `fields`, `gaps` e `evidence: [sequence]`.
   `observedAt` não reordena a gravação.
2. Identidades fortes usam somente IDs pseudonimizados presentes no envelope:
   `sessionId` ou `threadId` para sessão, `promptId` ou `turnId` para
   turno, `agentId`/`subagentId`/`childSessionId` para subagente, e
   `toolUseId`/`toolCallId`/`itemId` para chamada. A chave inclui captura,
   agente e mecanismo de origem; mesmo texto de ID em sessões, agentes ou
   mecanismos distintos não cria vínculo cruzado. ID ausente continua `null`.
3. Em capturas com duas sessões simultâneas ou registros sem ID de sessão,
   nenhum evento sem esse ID recebe vínculo `native` com uma delas. Um candidato
   contextual, quando exibido, tem `strength: "heuristic"` e os `sequence`
   que o motivaram; ausência ou ambiguidade fica `inconclusive`.
4. Repetições com identidade nativa completa, mesmo `eventKind`, fase,
   `nativeEvent`, campos e lacunas são exibidas como entradas distintas com
   `duplicateOf` apontando à primeira `sequence`; eventos sem identidade
   completa não são deduplicados. A duplicata não cria segunda operação.
5. `observedAt` anterior ao registro precedente gera marca
   `outOfOrder: true` naquela entrada sem deslocá-la. Uma retomada
   (`session_start` com `source: "resume"`) continua a sessão identificada,
   mas abre um segmento novo; sem ID, não junta sessões por proximidade.

### S2 — correlacionar ferramentas, skills e subagentes sem inventar conclusão

6. `tool_pre` e `tool_post` são pareados como `native` somente por identidade
   de chamada completa dentro da mesma sessão, origem e, quando presente,
   turno/subagente. `item.started`/`updated`/`completed` do `codex exec`
   trazem `itemId`, mas não ID de sessão em cada linha: IDs distintos podem
   formar operações separadas como `heuristic`, e colisão/ambiguidade não
   recebe vínculo forte. Chamadas paralelas preservam as `sequence` de
   início, atualizações e resultado. Resultado sem início gera
   `orphan_result`; início sem resultado gera `open`.
7. Uma operação de ferramenta mostra `toolName`, `outcome`, `errorType`,
   `exitCode` e `durationMs` apenas quando observados nos campos v1. Se não
   houver duração nativa e o par possuir instantes válidos em ordem, mostra
   `elapsedMs` calculado e `durationEvidence: "derived"`; se o resultado
   anteceder o início, não calcula duração.
8. `skill_invocation` do Claude com `invocationPath: "skill_tool"`,
   `toolUseId` e fase `pre`/`post` forma uma invocação `native` da skill
   nomeada. `post` encerra a invocação da ferramenta, não afirma conclusão das
   instruções. Um `post` sem `pre` é `orphan_result`; `pre` sem `post`
   é `open`.
9. `UserPromptExpansion` de `direct_command` e
   `skill_lifecycle` do Hermes aparecem como evidência de expansão/ciclo de
   vida com nome e `strength: "heuristic"` para uso da skill: `loaded`,
   `patched`, `edited` e leitura de `SKILL.md` não criam uma invocação
   `native`. O Codex sem evento de skill não ganha uma por nome de arquivo.
10. Eventos de subagente com `parentSessionId`/`childSessionId` ou IDs
    explícitos preservam relação pai-filho e suas `sequence`; `agentType`
    ou `childRole` iguais, sem ID, não unem subagentes nem atribuem
    ferramentas do filho ao pai.
11. `turn_end`, `session_end`, `process_exit`, timeout ou ação manual
    fecham apenas o próprio escopo observado. Uma invocação de skill sem
    `post` continua `open` ou `boundary_only`; nenhum desses eventos
    produz `skill_completed`.

### S3 — consulta local e cobertura para o relatório

12. `privacy timeline --root R --capture ID` devolve um JSON por execução
    com `schemaVersion: 1`, `command: "timeline"`, `status: "ok"` e o
    resultado de `correlateTrace`. Captura ativa, parada ou desabilitada
    pode ser lida sem modificar arquivos. Falta de flags sai com 2; captura
    ausente/inválida com 3; lock/conflito com 4; E/S com 5, usando o envelope
    fechado de erro da CLI existente.
13. `coverage` entrega `capture.counters` e `limits` da #8,
    `eventGaps` com `sequence` e motivos do envelope, e totais de
    `inconclusive`, `orphan_result`, `open`, duplicatas e fora de ordem.
    `partial: true` quando há registro malformado/descartado, lacuna de
    envelope, evento inconclusivo ou operação aberta/órfã; nenhum percentual
    de cumprimento é calculado.
14. Um teste de fluxo inicia captura, entrega fixtures de Claude, Codex e
    Hermes pelos caminhos locais da #8, chama `privacy timeline` e compara
    a API pura com a resposta CLI: mesmos registros sanitizados, ordem,
    vínculos e cobertura. A demonstração identifica as fixtures e não afirma
    execução de modelo real.

## Out of scope

- Interpretar `SKILL.md`, julgar instruções e gerar relatório Markdown — #7.
- Alterar schema de captura/envelope, adaptadores, hooks ou política — #4/#5/#8
  são as fontes de verdade; IDs ausentes continuam ausentes.
- Percentual de conformidade, telemetria, serviço remoto, dashboard, deploy,
  publicação ou execução real de modelo — a issue não os autoriza.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| CLI `privacy timeline` | flags e defaults | 12 — `--root` e `--capture` obrigatórios |
| CLI `privacy timeline` | resposta vazia | 1, 12 — `entries: []`, `operations: []` |
| CLI `privacy timeline` | erro e códigos | 12 — envelope existente da CLI |
| API `correlateTrace` | formato e versão | 1, 13 |
| API `correlateTrace` | IDs ambíguos, duplicatas, ordem | 2–5 |
| guia de uso | interpretar evidência e lacunas | 8–13 |

## Swept

- validation: 1, 2, 12; entrada CLI e leitura do store continuam validadas pela #8.
- failure modes: 3, 6–8, 12–13.
- idempotency and retry: 4; a correlação não grava nem reenvia registros.
- authorization: existing — raiz e captura explícitas da #5/#8, sem novo destino.
- concurrency and ordering: 3–6, 12; snapshot sob lock do store, ordem por sequência.
- data lifecycle: existing — consulta não altera stop/disable/delete/prune da #5/#8.
- external-dependency failure: 12; nenhuma dependência externa nova.
- state transitions: 5–6, 8, 11; fechamento não inventa fim de skill.
- observability: 1, 7–9, 13–14.

## Impact

| Front | What changes |
| --- | --- |
| domain | `timeline` distingue registro observado, operação correlacionada e candidato heurístico; `replayCapture` continua a fonte dos registros. |
| integrations | nenhuma mudança no payload nativo ou no armazenamento; CLI acrescenta consulta derivada. |
| stored data | nenhum novo arquivo ou migração; resultado é calculado a cada leitura de até 500 registros. |
| report | #7 recebe estrutura v1 e cobertura sem refazer pseudonimização ou atribuição. |
| governance | pacote permanece privado; core de revisão vendorizado fica intocado. |

## Decided

| Decision | Shape | Alternative rejected |
| --- | --- | --- |
| Contrato público da timeline | `correlateTrace(trace)` puro e `privacy timeline` JSON v1 com entradas 1:1, operações derivadas e cobertura; `sequence` é a ordem canônica | Reordenar por `observedAt` esconderia interleaving e tornaria evidências instáveis. |
| Força da atribuição | `native`, `heuristic`, `inconclusive` e referências a `sequence`; ausência de ID não vira vínculo forte | Associar por nome de skill, arquivo ou proximidade afirmaria uso sem evento nativo. |

## Surface

| Command | Input | Success | Failure | Criteria |
| --- | --- | --- | --- | --- |
| `privacy timeline` | `--root R --capture ID` | JSON v1 com `timelineVersion: 1`, `capture`, `entries`, `operations`, `coverage` | JSON v1 com `error.code`, exit 2/3/4/5 | 1, 12–13 |

## Sources

- [Issue #6](https://github.com/oldboydev/skill-me/issues/6) — intenção, critérios e delegação dos detalhes técnicos.
- `src/integrations/boundary.mjs` e `src/integrations/adapters/*.mjs` — contratos de evento e lacunas.
- `src/integrations/privacy/store.mjs`, `src/integrations/traces/replay.mjs` — leitura e ordem dos registros sanitizados.
- `docs/agent-observation.md`, `docs/traces.md` — cobertura nativa e uso local.

## Unresolved

Nenhuma questão aberta: o proprietário delegou os detalhes técnicos da
entrega funcional na issue e pediu explicitamente planejar e implementar.
