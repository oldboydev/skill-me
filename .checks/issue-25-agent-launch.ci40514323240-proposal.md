# Proposta concreta após a CI 40514323240 — aprovada em 28/10/2026

O proprietário respondeu “Autorizar diagnóstico e orçamento Windows (recomendado)”. [Registro da aprovação](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6460177952). O AC8 foi acrescentado à issue antes do código. A proposta abaixo fica preservada; implementação e provas serão registradas pelo autor.

Não implementada. Diagnóstico em `8868fe1645dedb6b7d4bf575570a86ce11ece64c`, preservando Verifier11 PASS e formal6 ready. A CI do HEAD d0d5a7f falhou no Windows: dois testes delivery_timeout e limite de dez minutos no pós-job. Ubuntu/macOS passaram. O diagnóstico não demonstrou defeito do produto; os controles de perda zero continuam corretos.

## Escopo proposto

1. Instrumentar somente o diagnóstico do I23-C10 em `tests/integrations/observe/agents.e2e.test.mjs` e apoios de teste necessários. Reutilizar a pré-carga de tempos e o formato sanitizado existentes. Preservar a execução sequencial e simultânea, agentes de fixture, contagens, identidades/chaves, os resultados esperados e todos os prazos. Em falha, incluir operações/tipos/códigos e estado ou indisponibilidade, sem caminhos, conteúdo, chaves ou ambiente. Nenhum retry, aceitação de perdas ou mudança de produto.
2. Dar ao job Windows da matriz `verify` vinte minutos de orçamento total, preservando dez minutos nos outros sistemas e cinco nos demais jobs. Em `.github/workflows/governance.yml`, somente o campo do job `verify` passa de `timeout-minutes: 10` para `timeout-minutes: ${{ matrix.os == 'windows-latest' && 20 || 10 }}`. Nenhum prazo de teste/produto, runner, carga, paralelismo, step, comando ou skip muda.
3. Acrescentar o critério observável do diagnóstico à issue/task/checklist ANTES do código, após aprovação. Autor Claude faz provas discriminantes RED/GREEN da mensagem e não vazamento; não inventa correção para a causa desconhecida.
4. Concluir provas afetadas nos três ambientes e gate completo, depois nova verificação independente e revisão Codex necessárias, registradas sob “Pode fazer quantas precisar” sem apagar histórico. Publicar o novo HEAD só após PASS/ready.
5. Executar uma nova CI desse HEAD alterado e revisado, sem reexecutar o HEAD anterior só para obter verde. Se falhar, preservar a falha e investigar. Fazer o merge já autorizado somente com todos os checks verdes no HEAD validado.

## Critério proposto para aprovação

A prova I23-C10 mantém as sessões intercaladas e simultâneas, as contagens exatas, chaves/identidades isoladas, prazos e asserções; quando falhar, o diagnóstico informa operações/tipos/códigos de E/S e estado ou indisponibilidade, sem expor caminhos, conteúdo, chaves ou ambiente. Provas controladas demonstram que a mensagem preserva a falha e não vaza dados. Somente o orçamento total do job Windows da matriz verify passa de 10 para 20 minutos; limites dos testes/produto, paralelismo, carga, demais jobs e sistemas permanecem iguais.

## Limites

Rodadas necessárias registradas em 28/10/2026 sob a autorização humana “Pode fazer quantas precisar”: [12ª verificação independente e 7ª revisão Codex](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6460630184), após as provas do autor em `a8dabb0` (código `52b22cd`). As onze verificações e seis revisões anteriores permanecem no histórico. Somente o override formal da issue #25 passa de seis para sete; os perfis globais, outras issues e core permanecem iguais. Esta inscrição não declara PASS nem ready das rodadas novas.

O orçamento maior do job evita cancelamento do conjunto pelo limite total; não corrige delivery_timeout e não garante a próxima CI verde. A instrumentação dá evidência para eventual nova ocorrência; não demonstra a causa original. Qualquer mudança de prazo de produto/prova, retry, aceitação de perdas ou carga continua fora desta proposta.

A decisão é necessária porque o plano aprovado preserva workflow/limite do job e o diagnóstico I23-C10 ainda não faz parte dos critérios. Não é pedido de autorização para novas rodadas, já autorizado pelo proprietário.


## Estado da implementação

Registro antes do código em `25f5948` (task 39–40, Landing, S11 com C47–C48); diagnóstico do I23-C10, provas I25-C47 e o `timeout-minutes` do job `verify` em `52b22cd`. Provas, comandos e resultados na seção “Diagnóstico do I23-C10 e orçamento do job Windows” de `.checks/issue-25-agent-launch.build.md`: RED com a mensagem antiga (só `codex A 0`), GREEN, mutações, alvo de 128 testes com 122/0/6 em Windows 24.22.1, Windows 24.13.0 (clone com `core.autocrlf=true`) e WSL isolado, e `npm test` completo com exit 0 (1.006 testes, 986 pass, 0 fail, 20 skip). A causa dos `delivery_timeout` continua desconhecida. Verifier 12, formal 7, push e a CI do novo HEAD ficam com o orquestrador.
