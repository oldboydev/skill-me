# Issue #11 — preservar o resultado quando a limpeza da revisão falha

> Build this with **tlc-implement**. Cada critério vira um check com prova.
> Nada em `Unresolved` é decidido durante a implementação.

## Intent

No Windows, uma pasta temporária ocupada faz a revisão local sair com erro de limpeza,
mesmo depois de validar e guardar um relatório `ready`. O usuário não recebe o relatório
no terminal e entende que a revisão falhou. A issue #11 documenta esse comportamento.

A atualização traz a correção aprovada no ERP: a limpeza preserva o resultado ou erro
original da revisão, libera o lock e avisa no stderr somente quando uma pasta sobra.

7 critérios em 1 slice · 0 novas decisões irreversíveis · 0 perguntas abertas.
Perfil: `light`. Base: `3b6387615aa9233fe89771782fd8e0948042cdac`.

## Criteria

### S1 — receber o resultado da revisão mesmo com a limpeza falha

1. Com relatório validado e limpeza falha, `cli.mjs review` imprime o relatório no stdout
   e sai com 0 para `ready`, 2 para `changes_requested` e 2 para `blocked` (AC1).
2. Com revisão e limpeza falhas, o comando escreve `Code review interrompido: ` seguido
   do erro da revisão e sai com 1 (AC2).
3. A pasta que sobra é avisada no stderr com o caminho; sem pasta restante não há aviso (AC3).
4. O lock da issue não existe ao fim dos processos dos casos acima (AC4).
5. Os cinco arquivos comuns correspondem aos blobs aprovados no ERP (AC5):
   `review.mjs=c51cff675f6472b9e2ffa02eaa03cd80f3d48dad`,
   `review.test.mjs=6495b4d3d61db91c5896e7efc919880237f4b572`,
   `README.md=711a7161c58ea65dd8dd6a6148d8ef3948d4f2eb`,
   `cli.mjs=c6a4abcd52cf140f64b596136080f36d066b1ee8`,
   `schema.json=b02001e2b10df2e46b244490ee3cf5ae1b410694`.
6. `npm run test:code-review` executa 16 casos, com 16 passes, 0 falhas e 0 skips,
   incluindo quatro C10 e três C11 (AC6).
7. Workflow de governança, `code-review.config.json` e código do produto permanecem
   idênticos à base; apenas três arquivos do motor e artefatos da entrega mudam (AC7).

## Out of scope

- Alterar ou adaptar o core do ERP: os hashes definidos pela issue vinculam a entrega.
- Alterar produto, configuração, workflows ou outros repositórios.
- Remover automaticamente pastas de outras revisões, mudar histórico, teto ou locks.
- Merge, deploy ou publicação: exigem autorização específica posterior.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| `cli.mjs review` | stdout e códigos de saída | 1, 2 |
| `cli.mjs review` | falha parcial e stderr | 2, 3 |
| `cli.mjs review` | flags e defaults | existing — `parseArgs` e configuração, inalterados |
| README do motor | explicar resultado, lock e pasta remanescente | 3, 4, 5 |
| outras interfaces | APIs, telas, collections | n/a — não existem nesta entrega |

## Swept

- validation: existing — `validateReport` continua validando o relatório antes de guardá-lo.
- failure modes: 1, 2, 3.
- idempotency and retry: existing — fingerprint e histórico reutilizam resultado; C10 ready prova contador preservado.
- authorization: existing — autenticação e perfil não mudam; execução desta issue autorizada pelo proprietário.
- concurrency and ordering: existing — lock exclusivo no Git comum; 4 verifica sua liberação, sem alterar exclusão mútua.
- data lifecycle: 3, 4; histórico existente permanece, sem migração.
- external-dependency failure: 2, 3; outras falhas de Git/gh/Codex preservam os contratos existentes.
- state transitions: 1, 2; cleanup não substitui resultado aprovado/rejeitado ou erro.
- observability: 1, 2, 3.

## Impact

| Front | What changes |
| --- | --- |
| domínio | Nenhum termo ou regra de produto muda. |
| revisão local | Limpeza passa a preservar relatório/erro; CLI e consumers mantêm os mesmos status. |
| dados guardados | Nenhuma migração; relatório, contador e lock seguem o contrato existente. |
| testes | Testes C10/C11 aprovados no ERP acompanham a cópia. |

## Decided

Nenhuma nova decisão irreversível. A fonte impõe cópia exata do commit
`781ca4c5b357c6798e50a2956e61b3c7d6c7d43d` de `oldboydev/3dprintingerp`.
Uma adaptação local foi descartada porque criaria um fork silencioso do core.

## Execução e provas

Claude implementa e executa as provas; Codex coordena e revisa sem implementar correções.
Antes da troca do motor, executar os sete C10/C11 novos contra o motor anterior em cópia
temporária isolada, demonstrando RED sem tocar no checkout principal. Copiar então os
três arquivos exatos da referência e executar a suíte de 16 testes e governança.

O core aprovado prova `ready` e `changes_requested` na CLI; `blocked` deve receber prova
complementar reproduzível em `.checks/`, sem mudar os arquivos vendorizados: uma cópia
temporária do teste C11 inclui `blocked, 2`, usando CLI/motor/schema com bytes idênticos
ao checkout. A prova também confere os cinco hashes e o diff de escopo. Não acrescenta
funcionalidade e não altera a suíte contratada de 16 casos.

Não repetir testes do doctor: AC7 prova que produto e montagem não mudam. CI existente
confere as plataformas declaradas. Falha de infraestrutura é registrada, nunca chamada de pass.
Após commit da implementação, Verifier novo comprova todos os checks. Depois do seu
relatório, commit limpo e revisão formal automática, com teto padrão de duas tentativas.
Com `ready`, push e PR pelo comando obrigatório; nenhum merge automático.

## Sources

- https://github.com/oldboydev/skill-me/issues/11 — problema, sete critérios e hashes.
- https://github.com/oldboydev/3dprintingerp/commit/781ca4c5b357c6798e50a2956e61b3c7d6c7d43d — fonte exata da correção; arquivos obtidos pela API e hashes conferidos no planejamento.
- `AGENTS.md`, `scripts/code-review/README.md`, `package.json` — autoria, perfil, provas e entrega.
- Conversa: proprietário autorizou `pode puxar a 11 planejar e implementar` em 13/10/2026;
  pedido de execução do escopo decidido autoriza este plano sem nova decisão bloqueante.
- `CONTRIBUTING.md` não existe neste repositório.

## Unresolved

| # | Kind | Question | Until answered |
| --- | --- | --- | --- |
| | | None | |
