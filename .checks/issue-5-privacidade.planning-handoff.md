## Planning — decisão de fronteira com #8

Selecionada a #5 após ler integralmente #5/#6/#7/#8 e o Project existente. Não há
issue aberta Ready nem prioridade definida; #8 depende expressamente da política
da #5. A #4 permanece encerrada, sem nova revisão.

Plano local: `.tasks/issue-5-privacidade.md`, branch
`codex/issue-5-privacidade`, base `1b6685fe97862ac1a2d2cff1e4d9f0e1f09a6a27`.
A branch ainda não foi publicada e não há PR de plano. São 12 critérios
desdobrados, rastreabilidade para os 8 AC e uma decisão bloqueante, U1.

**Decisão solicitada ao proprietário:** permitir na #5 a parcela mínima de
captura local e armazenamento sanitizado para comprovar start/stop/disable e
retenção/exclusão reais, reutilizável pela #8 (recomendado), ou entregar só a
política agora e manter AC1/AC5 e a própria #5 abertos até a #8.

O receptor atual vive somente em memória. Testar retenção num mock não satisfaz
AC5. A proposta não traz daemon, transporte entre produtores, follow/list/query,
instalação pessoal, E2E com modelos, publicação ou merge. A fronteira aprovada
será incorporada à issue antes do build, sem remover critérios silenciosamente.

Planejamento e inspeção por Codex; nenhum produto/teste implementado, nenhuma
suíte executada, nenhum Verifier ou revisão formal consumido. Após a decisão:
Claude/Grok implementa e prova; Verifier independente; Codex formal isolado,
somente leitura, perfil light com teto de 2. Overrides e merge da #4 não foram
estendidos para esta issue. Status permanece Planning, sem aprovação presumida.
