# Issue #7 — explicar a execução com evidências da skill

Autorização adicional do proprietário em 20/10/2026: quarta verificação independente, terceira revisão formal e merge após os gates da entrega, registrada na [issue #7](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6289269096). O teto formal passa a 3 somente para esta issue, com histórico preservado.

> Build this with **tlc-implement**. Cada critério vira um check com prova.
> Nada em `Unresolved` é decidido durante a implementação.

## Intent

A timeline da #6 mostra eventos e vínculos, mas quem investiga uma execução ainda precisa ler cada registro e comparar manualmente as instruções da skill. Isso dificulta distinguir processo observado, resultado, hipótese e falta de cobertura. A issue não fornece medida de uso; nenhuma é presumida.

O usuário consulta uma captura local com uma skill identificada pelo nome observado ou por caminho explícito. A resposta explica o fluxo, avalia instruções selecionadas com citações e deixa visíveis erros, correções e limites. A mesma análise sai em texto, Markdown ou JSON, sem provedor externo.

10 critérios em 3 fatias · 2 decisões de contrato · 0 questões abertas, 0 bloqueantes. Base: `origin/main` após merge da #6.

## Criteria

### S1 — resolver e ler instruções sem executá-las

1. Dada uma captura com nome de skill observado e exatamente um `SKILL.md` regular correspondente em diretório local conhecido, a consulta registra identificação `observed_name`, SHA-256 dos bytes e linhas das instruções; `--skill` aceita um arquivo regular explícito e registra `explicit_path`. Não modifica a skill.
2. A leitura ignora frontmatter e blocos de código como instruções; classifica itens de lista em `action`, `validation`, `guidance` ou `condition`, retendo heading e linha. Referências a comandos permanecem dados e não são executadas.
3. Nome observado ambíguo, skill ausente, arquivo não regular, leitura inválida ou acima de 1 MiB retorna erro fechado sem ecoar caminho ou conteúdo; `--skill` explícito não precisa coincidir com nome observado e a divergência é informada.

### S2 — avaliar e explicar a evidência

4. Cada instrução avaliada retorna exatamente um de `sufficient`, `partial`, `contradicted`, `unobserved`, `not_applicable`, `inconclusive`, com motivo e fonte `skill` (linha, hash); observações citam `sequence`. `guidance` não vira etapa executável.
5. Um comando literal da instrução só tem evidência suficiente se o conteúdo sanitizado identificar o mesmo comando e a operação correlacionada tiver resultado positivo; início sem resultado ou vínculo heurístico gera parcial, resultado negativo gera contradição, e sem correspondência gera ausência de observação. Leitura de `SKILL.md` nunca comprova que o agente carregou as instruções.
6. Uma condição só vira não aplicável diante de evidência explícita que a torne falsa; condição sem essa evidência fica inconclusiva. Erro seguido de sucesso comprovado para o mesmo comando aparece como correção citando ambas as sequências, sem apagar o erro.
7. Explicação determinística cita a origem de cada afirmação factual, inclui ambiente/versões quando presentes, revisão da skill, modo de identificação, timeline, avaliações e limites de captura/correlação. Hipóteses são rotuladas como hipóteses; não expõe raciocínio privado nem percentual de cumprimento.

### S3 — consultar e exportar

8. `integrations report --root R --capture ID [--skill ARQUIVO] [--format text|markdown|json]` devolve texto por padrão, Markdown ou JSON v1 em stdout, sem escrever arquivos, iniciar agentes ou acessar rede; a saída estruturada contém apenas timeline sanitizada e instruções sanitizadas/derivadas.
9. Falta de flag, ID de captura malformado e formato desconhecido saem com 2; arquivo de skill ou estado da captura inválido/ausente com 3; conflito do store com 4; E/S com 5. Erros usam código fechado e não ecoam entradas.
10. Fixtures de fluxo normal, erro/correção e condição demonstram as seis avaliações, citações, três formatos e o limite de que referência a `SKILL.md` sem invocação comprovada não vira fato de carregamento.

## Out of scope

- LLM, dashboard, `step`, telemetria, instalação global, publicação e merge — entregas posteriores ou não autorizadas.
- Alterar envelope, política de privacidade ou correlação da #6 — contratos existentes são fonte única. A [exceção aprovada após a 20ª revisão](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6300606867) permite somente acrescentar ao store uma API de snapshot sem escrita para o relatório, preservando os comandos e contratos existentes.
- Interpretar Markdown arbitrário ou provar semântica de texto livre — a leitura de listas é conservadora.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| CLI `integrations report` | flags e defaults | 8, 9 |
| CLI `integrations report` | captura vazia | 4, 7, 8 |
| CLI `integrations report` | erros e códigos | 3, 9 |
| CLI `integrations report` | formatos, estrutura e tom | 7, 8 |
| API pura de análise | estados, fontes e referências | 2, 4–7 |

## Swept

- validation: 1–3, 9.
- failure modes: 3–6, 9.
- idempotency and retry: 8 — consulta somente leitura; chamadas repetidas sobre o mesmo snapshot produzem a mesma análise.
- authorization: existing — `--root` e `--capture` explícitos, `--skill` fornecido pelo usuário ou candidato local; nenhum serviço multiusuário.
- concurrency and ordering: existing — snapshot do store e `sequence` da #6; 6 conserva a ordem de erro/correção.
- data lifecycle: existing — stop/disable/delete/prune da #5/#8; 8 não persiste relatório.
- external-dependency failure: 7, 8 — análise determinística sem provedor externo.
- state transitions: 4–6 — estados de evidência, sem alterar estado da captura.
- observability: 4, 7, 10 — citações e limites explícitos.

## Impact

| Front | What changes |
| --- | --- |
| domain | `evaluation` significa julgamento de uma instrução com fonte e evidência, distinto de operação e de invocação da #6. |
| integrations | novo comando de leitura; `privacy timeline` e schemas existentes mantêm significado. A API adicional de snapshot sem lock atende ao check 8 sem mudar exportações existentes. |
| stored data | nenhuma migração nem arquivo novo por execução; Markdown/JSON saem em stdout. |
| governance | `package.json` continua privado; motor de revisão vendorizado intocado. |

## Decided

| Decision | Shape | Alternative rejected |
| --- | --- | --- |
| Contrato de relatório | `reportVersion: 1`, skill com `sha256`/identificação, timeline v1 e avaliações com fontes `skill`/`events`; formato `text|markdown|json` | três comandos distintos duplicariam a regra de avaliação. |
| Fonte da evidência | comandos literais em instruções só são comparados a conteúdo já sanitizado e operações da #6, citados por `sequence` | leitura de arquivo, nome ou proximidade como prova de execução confundiria observação e inferência. |

## Surface

| Command | Input | Success | Failure | Criteria |
| --- | --- | --- | --- | --- |
| `integrations report` | `--root R --capture ID [--skill ARQUIVO] [--format text|markdown|json]` | texto/Markdown ou JSON com `reportVersion: 1` | erro fechado, exit 2/3/4/5 | 1–10 |

## Sources

- [Issue #7](https://github.com/oldboydev/skill-me/issues/7) — intenção, oito critérios de aceite e delegação do planejamento técnico.
- `src/integrations/correlation/` e `.tasks/issue-6-correlacao.md` — atribuição, sequência e cobertura existentes.
- `src/integrations/privacy/` e `docs/privacidade.md` — snapshot, política sanitizada e limite de conteúdo.
- `docs/traces.md` — consulta local da captura.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| — | — | None — detalhes técnicos delegados pelo proprietário na issue e pedido atual de implementação | — |
