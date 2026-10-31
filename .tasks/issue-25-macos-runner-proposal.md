# S23 proposta — migrar somente a imagem macOS da CI

Estado: aprovada explicitamente pelo proprietário em 31/10/2026: “Autorizar macOS 15 (recomendado)”, em resposta à pergunta S23 da conversa (call_5d41ef8f22364145a69d485b3f46b7b3). A aprovação autoriza a mudança descrita abaixo; implementação e provas ainda serão executadas. Rodadas necessárias e merge após PASS, ready, medição e CI verde já estavam autorizados.

## Problema demonstrado

O HEAD34b808977ae81f15df913e4a84668a6c61e83dd9 tem Verifier29PASS50/9 e Codex15ready/sufficient/9met, sem achado. A CI PR41111349795 cancelou o jobmacOS124254210771 em30/10/2026 18:58:32–33UTC, antes de qualquer passo: steps=[], runner_id=0. A anotação oficial do check informa interrupção programada da imagem macOS14, retirada em02/11/2026. Não foi uma falha de produto ou teste.

Fontes primárias consultadas em30/10/2026: https://github.com/actions/runner-images/issues/13518 e https://github.com/actions/runner-images/blob/main/README.md. A janela atual termina em31/10 00:00UTC (30/10 21:00BRT); repetir antes disso produz o mesmo cancelamento programado. A imagem será retirada definitivamente em02/11. O GitHub recomenda macos15/macOS26/latest; macos14 e macos15 são ambos arm64 na tabela oficial. Escolha proposta: macos15 fixo, evitando a atualização móvel de latest para26.

## Mudança proposta, somente após autorização

1. `.github/workflows/governance.yml:41`: a matriz exata passa de `[ubuntu-22.04, windows-latest, macos-14]` para `[ubuntu-22.04, windows-latest, macos-15]`.
2. `scripts/governance-ci.test.mjs:268,393`: atualizar somente os dois literais da imagem macOS nos valores esperados e na tabela de ramos, preservando asserções exatas, os mesmos casos e seus nomes. Não trocar igualdade por presença, remover ou pular teste.
3. Refinar C48 e a parte vinculante do AC8 para registrar essa exceção de imagem macOS, se autorizada. C1–C50 continuam50, AC1–AC9 continuam9. Task/checklist/relatórios registram a decisão e o alcance; o histórico macos14 permanece como histórico.
4. Registrar maxRounds16 somente na override25 para a próxima revisão necessária, sob a autorização já existente de quantas rodadas forem necessárias; manter15tentativas anteriores, perfis globais2 e demais issues. Isso não pede nova autorização de rodadas nem altera o motor.

Ficam iguais: Node24.13.0, versão do npm determinada pelo setup existente, arquitetura arm64 do jobmacOS, Ubuntu22.04, windows-latest, cinco checks regulares, job manual adicional, comandos e carga de todos os testes, concorrência min(CPU−1,8), asserções de produto, delivery750/650ms, relatório1000ms, stdin2000ms/faixa1900–6000, Hermes5s, limites500eventos/8MiB/7dias, orçamentosWindows20/outros10/detection+CI5/manual10min, permissões, actions fixadas, cache e política de cancelamento. Não alterar produto, coreS21, CLI, dependências ou publicar o pacote. A prova remota passa a cobrir macOS15; não alegar execução emmacOS14 nesse novoHEAD.

## Provas e responsabilidades definidas antes do código

- Root coordena, mantém a feature inteira e escreve apenas governança documental. Claude ou Grok implementa somente o YAML e os dois literais do teste, com NativeEdit restrito; nenhum shell amplo, agente real, limpeza global ou acesso ao arquivo global do incidenteS14.
- Autor recebe a fatia inteira com leitura estimada abaixo150k e registra Landing literal antes do código. Primeiro atualiza os esperados do teste; prova RED da matriz antiga14 contra a matriz exigida15 deve ser falha de igualdade, sem TypeError/setup/ligação. Depois altera só o YAML e executa `test:governance` inteiro (27testes atuais, incluindo18C50) emAWin24.22.1/BcloneWin24.13/CWSL24.13, concorrência existente e prazos iguais. O Root confere integralmente diff/valores e que nenhuma asserção desapareceu.
- Depois da última fatia verde, Root despacha Verifier30novo, independente do autor, perfil light. Toda a feature50/9 é contabilizada; releitura fresca dos dois arquivos de CI alterados, planos/decisão e diff, carryR29 explícito somente por mapaGit de todas as fontes selecionadas. Provas frescas: governança27ABC e `npm test` completoD, além dos nomes/asserções afetados. O código de produto/testes funcionais é idêntico ao PASS29 e o carry não é declarado como nova execução ABC deles. Este recorte é proporcional à mudança de imagem/literais; a prova macOS15 real permanece obrigatória na CI posterior.
- Formal16 em processo novo/cópia isolada/sandbox read-only, ready/sufficient/9met antes de publicar. Não usar o ready15 para conteúdo novo. Não alterar conteúdo versionado depois do novo ready.
- Após publicar, obter cinco checks regulares verdes no PR e na execução manual, mais medição remota esquema2A1/B/A2/4500ciclos completos no mesmo HEADfinal. Os resultados do34b ficam preservados e atribuídos; não substituem os gates desse novoHEAD. Só depois fazer o merge já autorizado e confirmar issue25fechada/ProjectDone.

## Alternativa sem mudança de contrato

Manter macos14 e aguardar00:00UTC/21:00BRT para executar os jobs cancelados antes de começar. Isso preserva o HEAD34b/ready15, porém deixa a CI dependente de uma imagem retirada em02/11. Não repetir jobs dentro da janela nem converter cancelamento em verde. Não criar agendamento sem pedido do usuário; aguardar nesta execução enquanto houver trabalho útil e disponibilidade.

## Por que a decisão é nova

O AC8 exige que os demais sistemas permaneçam iguais, e C48 confere a matriz literalmacos14. O pedido de rodadas necessárias não altera essa fonte vinculante. O AGENTS.md exige planejamento e aprovação explícita para decisões funcionais bloqueantes. Esta é uma exceção de imagem do runner, sem relaxar os testes ou seus prazos; a alternativa de esperar preserva o contrato atual.

Falhas/rodadas/ready15 preservados. O incidenteS14 permanece: arquivo global preexistente Temp/x sobrescrito, sem cópia conhecida, impacto desconhecido; nunca ler/tocar/remover/restaurar e manter no resumo final. As matrizes e a medição já iniciadas no34b continuam para coletar o que puderem provar; não cancelar os jobs saudáveis para trocar a imagem.


## Encerramento local S23 — 31/10/2026

A aprovação6538188577 foi implementada pelo Claude: teste4581ee4 RED exato contra imagem14; workflow3e4d1ec GREEN com a imagem15. Root conferiu somente três substituições em dois arquivos, preservando os demais bytes. Autor governança27ABC verde; Verifier30 fresco PASS50/9 no5fd685b, governança27ABC e npmD1191/1171/0/20, com carryR29 explicitamente por identidade. Relatório literal e limitações em .checks/issue-25-agent-launch.verified.md. As descrições de implementação/provas pendentes acima são o plano anterior, preservado; o estado local agora é concluído. Formal16, CI/macOS15 real, medição e merge ainda pendem; rodadas necessárias e merge após gates já estão autorizados.
