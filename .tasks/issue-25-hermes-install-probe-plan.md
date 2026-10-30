# S18 — experimento comparativo da instalação Hermes, antes de qualquer execução

Continuação do diagnóstico da issue #25/PR #28 sob a autorização do proprietário para manter testes/prazos, aplicar o plano nas três plataformas e seguir até ambas as CIs verdes e merge, com as rodadas necessárias ([6502294779](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6502294779)). Este plano Root autoriza somente um experimento local controlado. Não muda produto, teste versionado, helper, runtime instalado, CI ou critério; não é aprovação humana nova.

## Fato e intenção

S17 códigoClaude7e82e3b, controles03:17:46–03:18:50UTC30/10/2026: RED-unit/K1/K2/K3/RED-cli/K4 naturais2testes/1pass/1fail/0skip, testemunha prova injeção efetiva/exact1disparo; RED-N1fail natural por TypeError substituindo erro quando coletor congelado; Ncorrigido1pass natural. O diagnóstico preserva scalar5/0/strictEqual e discrimina operação/fase/código. Isso não é correção causal histórica.

A inteiro03:19:20–03:21:17UTC foi FAIL natural:40/36/3/1, cancel0. I4-C30d unit:793 installedTarget(Hermes), I4-C27 CLI:552 e I4-C34f CLI:1593 (partial-orphan), todos instalação5vs0 antes do cenário, sem detalhe. O Root confirmou que CLI:552 também é Hermes. Os pontos instrumentados C34g e partialHermesRegistry não foram os que falharam. B/C/D não executados; S16/S17 abertas, sem Verifier27/formal15/push/novoCI/merge. CLI autora89756 fechou0/0BG03:22:22.554UTC, sourceclean7e82e3b; rootleu relatórioEXEC inteiro. A frase autoral “a falha só fica visível depois” significa aqui a EVIDÊNCIA da operação: a falha já era vermelha nos dois lados. Texto original preservado, sem falso verde.

Falta a classe de erro real. Todos passaram por installHermesArtifacts/withLock/writeManifest no mesmo produto, mas isso não identifica a operação. Ampliar mensagens em mais chamadas é opção demonstrada pela migração; primeiro faremos um experimento com o registro existente em alvos novos para obter código/operação, sem mudar as fontes versionadas nem repetir o gate inalterado.

## Forma, ownership e amostra

Claude novo S18 lê o plano e fontes necessárias, escreve somente relatório e módulo de transformação PURA próprios. Root mantém docs/controle de execução e revisa; não implementa o experimento nem produto/testes. Sem agentes-filhos do autor. Uma fatia S18 inteira, estimativa prévia de leitura abaixo150k tokens com ranges/hashes registrados e reserva; não fingir checklist/task completos, Root/Verifier27 conservam C1–C50/9AC.

O módulo puro recebe texto atual do install-apply.unit.test.mjs e caminho absoluto do relatório exclusivo criado pelo Root dentro da raiz owned. Devolve cópia do mesmo arquivo, SOMENTE anexando um teste diagnóstico nomeado. Nenhum import/E/S/env/process/spawn/eval executado no módulo de transformação. O teste anexado reutiliza createNodeIo, runIntegrationCommand, rejectionTrace, installEvidence, makeScratch, scratches e os imports já existentes. Nada dos testes antigos é selecionado ou alterado.

Uma invocação por runtime, sequenciais: A Node24.22.1 e B officialNode24.13.0 pinados por hash. Mesma fonte/gitHEAD/árvore, mesmo comando Node:test com defaultmin(CPU−1,8)=8, mesmo formato de pais temporários curtos registrados, mesmas entradas/ordem, nenhum modelo ou agente como fixture/help/version. Não trocar runtime do projeto/CI.

Cada invocação executa EXATAMENTE100 instalações, alternando50 homes Hermes novos vazios e50 homes novos com config.yaml/plugins/other-plugin iguais à fixture hermesTarget do CLI. Cada home tem createNodeIo novo e é envolvido pelo rejectionTrace existente. Instalação via runIntegrationCommand com command install/agent hermes/apply true; nenhuma remoção nem repetição sobre o mesmo home, nenhum retry/aquecimento/espera extra. A coleta não corrige nem reenvia uma instalação5. A limpeza after já existente remove apenas os scratches desse child sob TEMPprivado. O diretório pai e o relatório ficam retidos.

Guardar por instalação índice/caso/exitCode e installEvidence projetado (status/errors/steps/conflicts/rejected), duração observada sem SLO, sem target/absolutos/bytes/stack/env/mensagens. Resultado agregado deve mostrar100 tentativas e50 de cada caso, contagens por exitCode, falhas com as observações, sem transformar campo ausente em zero. Se resultado inesperado/sem projeção, marcar indisponível e não inventar fase. Informações pessoais e caminhos fora do home neutralizados pelo apoio existente.

O teste diagnóstico afirma a integridade DA COLETA (100 registros/50+50/índices sem repetição), NÃO exige100 sucessos e NÃO serve como gate verde de produto. Deve escrever relatório mesmo com instalações5; código0 significa experimento completo, não instalação saudável. Toda falha é mantida. Se o próprio experimento/limpeza for interrompido ou falhar, registrar incompleto, não repetir para obter resultado desejado.

## Execução e decisões posteriores

Root revisa módulo/relatório/transformação antes de executar; literais exatos, hashes, claim uma vez, clones offline semhardlinks e fonte imutável conferida antes/depois. Raiz, clone e TEMP registrados por caminho/tipo/não-link/dev/ino/realpath ANTES do uso, sem namespaceglobal. Relatório exclusivo wx sob a raiz; schema, contagens e saídas naturais conferidos. Bash da autora somente dois literais revisados; sem shell livre/Write/PS/Agent/Web/edição de fontes na execução. Ferramenta600000 primeiro plano, orçamento por experimento30min; APIautoBG exige aguardar fim real, nenhum BG explícito.

Sem causa demonstrada pelo verde, nem AV/disco/Node/loop por hipótese. Se surgir código/operação, localizar contrato e defeito antes de propor correção; retry ou mudança de comportamento não estão autorizados por ESTE experimento. Se tudo passar, registrar amostra saudável sem inventar causa ou chamar os gates de verdes; ampliar evidência das instalações versionadas pode ser decidido no escopo já autorizado e registrado antes de código. Nada disso dispensa novo autor/provas onde necessário, Verifier27, formal15ready, push e ambas CIs com cinco checks verdes+medição schema2 A1/B/A2/4500 no novoHEAD antes do merge já autorizado.

## Invariantes e histórico

Produto750/650ms, relatório1000inclsettle650, stdin2000/faixa1900–6000, Hermes5s,500/8MiB/7dias,T8-C15dois×40=80/quatro intercaladas,T8-C16trêscriações, retries existentes, concorrência/jobs20/10/5/manual10/asserções/contagens originais intactos. As100 instalações são amostra adicional deste experimento, não a contagem do T8 nem da medição4500.

TodosFAILs/omissões/interrupções/incidentes/limites preservados. S17F1corrigiu logger, não produto. GlobalTemp/x PREEXISTENTE sobrescrito sem cópia conhecida e impacto desconhecido: NUNCA ler/tocar/restaurar; sem perfis/credenciais/tmpglobal. Retomada ampla foi recusada automaticamente antes de iniciar; fases NativeEdit específicas/literais revisados não são sandboxFSdoSO/TEMPprivado não remapeia/tmpGitBash. Auditoria26 sómetadadosWSL; futura27 inclui formal14/CI58/S16/S17/S18 atéD27 real, sem impacto globalzero/conteúdo/Windows/PS/rede/TEMP/proveniência/causalidade.
