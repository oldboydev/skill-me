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

## D1 — incluir conteúdo de resultados — 17/10/2026

Pergunta apresentada ao proprietário:

> Posso seguir com a opção “incluir conteúdo”, desligada por padrão, que quando
> você a ligar grava argumentos e resultados sanitizados, inclusive texto de
> SKILL.md, sem executar nem obedecer às instruções coletadas?

Resposta explícita:

> Sim, seguir com esse comportamento (Recomendado)

Essa resposta autoriza ajustar o critério 3 do plano e o check C7: não se exclui
resultado apenas por ser texto de skill; ele permanece dado sanitizado. A opção
continua desligada por padrão e vale para uma captura, sem consentimento herdado.
Prompts e eventos de raciocínio continuam excluídos; nenhuma instrução coletada
é executada ou adotada. A matriz de campos suportados e os limites continuam
fechados. Não foi autorizada coleta irrestrita ou promessa de detecção universal.
