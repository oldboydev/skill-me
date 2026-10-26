# Planning da issue #25

Data: 26/10/2026. Branch: `codex/issue-25-agent-launch`, base `63621c6`.

O proprietário pediu: “pega a proxima issue planejar e implementar”. A #25 é a
próxima issue aberta do repositório; estava em Backlog e passou para Planning no
Project existente. As #26 (SQLite) e #27 (teach) continuam fora desta entrega.

Claude escreveu `.tasks/issue-25-agent-launch.md`, após ler a issue completa,
as regras locais e os contratos existentes. Codex conferiu o plano. O documento
contém propostas, não uma aprovação do proprietário. Nenhum código de produto
foi alterado; não há implementação, Verifier, revisão formal ou PR nesta etapa.

Decisão pendente: ao atingir 500 eventos ou 8 MiB numa invocação, manter uma
captura com descartes contados (A, proposta do plano) ou continuar em capturas
sucessivas (B, como a observação global atual). A preserva o vínculo manual
existente; B preserva a continuidade da captura até a saída do agente e exige
replanejar o vínculo por invocação e a consulta dos segmentos.

O plano também propõe o executável privado via `npm link`, `skill-me report`,
`origin: "launch"` e a raiz já configurada em `observe.json`. As propostas de
formato e as questões em aberto devem ser resolvidas/aprovadas antes do build.

Verificação desta etapa: `git diff --check` sem erros. Não foram executados
testes de produto; só documentos de planejamento foram criados. O fluxo formal
`review:run` fica para a entrega implementada e verificada, sem consumir uma
tentativa por um plano ainda bloqueado.

## Decisão recebida

Em 26/10/2026, o proprietário respondeu à pergunta de Planning:
“Capturas sucessivas até o agente sair (recomendado)”. A alternativa B passa a
integrar o escopo solicitado para implementação. O AC3 e o
[registro na issue](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6407670364)
foram atualizados. O plano inicial com descarte deve ser substituído antes do
código; o vínculo por invocação e a consulta precisam alcançar todos os segmentos.

O Claude foi iniciado para atualizar plano e checklist antes de implementar,
executar as provas e registrar commits locais. Verifier independente e revisão
formal continuam como etapas posteriores obrigatórias do orquestrador.

## Aprovação do plano completo pendente

A revisão automática de aprovação recusou mover a issue para Ready: considerou
aprovada somente a decisão de rollover, enquanto faltava aprovação explícita do
plano completo. O Project permanece em Planning. O processo Claude foi interrompido.

Nesse intervalo ele havia concluído plano/checklist no commit `4b1ba61` e iniciado
um WIP de 38 linhas em `src/integrations/privacy/store.mjs`, sem commit de produto.
O WIP foi preservado em `.checks/code-review/issue-25/product.pending-approval.patch`
e `store.pending-approval.mjs`, e somente esse arquivo foi restaurado ao HEAD.
Nenhuma implementação de produto permanece na árvore. Não foram executadas provas
de produto, Verifier ou revisão formal desta entrega.

O plano completo e os 37 checks estão concretos para aprovação. Continuar o código
e mudar para Ready/In Progress depende agora da aprovação explícita do proprietário;
nenhum teto de revisão nem histórico foi alterado.
