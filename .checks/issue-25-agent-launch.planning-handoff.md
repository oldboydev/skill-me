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
