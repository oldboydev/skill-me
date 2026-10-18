## Aprovação e fronteira de execução — 17/10/2026

O proprietário aprovou nesta conversa:

> Aprovado esse recorte. Pode incluir o armazenamento local mínimo na #5,
> reutilizável pela #8, e seguir o loop de desenvolvimento com as verificações e o PR.

U1 está resolvida. A #5 inclui política de coleta/sanitização, captura de entrada
local explícita, armazenamento mínimo sanitizado e retenção/exclusão reais. A #8
reutilizará esse ciclo de vida e mantém transporte das integrações, consulta e
acompanhamento. O plano `.tasks/issue-5-privacidade.md` fecha defaults, limites,
estados e assinaturas; os oito critérios originais da issue permanecem.

Execução autorizada: Claude/Grok implementa e prova, Verifier independente,
Codex formal em cópia isolada/somente leitura, push da branch e PR pelo comando
de entrega após ready. Sem autorização de merge, publicação, instalação pessoal,
E2E com modelos, novos issues ou aumento do teto de revisões. A #4 não é reaberta.
