# S22 — montagem da fixture de promoção Hermes após FAIL28

Decisão técnica dentro do escopo já autorizado da issue25: corrigir a prova criada nesta entrega, preservando os contratos, testes e prazos. Não há nova alteração de comportamento do produto, política de retry, perda, concorrência ou publicação. O proprietário já determinou seguir com as rodadas necessárias até CI verde e merge.

## Evidência e limite da conclusão

Verifier28 terminou FAIL em6477023: A767/754/0/13 natural0; B767/753/1/13 natural1; C e D não executados. Em I4-C34k, somente K7d divergiu: esperado attempts1/exit4/conflict/foreignintacto/owncompleto; atual attempts2/exit0/applied/foreign—/ownausente. A troca não foi registrada e a pasta própria movida não existia na observação. O callback da montagem roda dentro do rename instrumentado, antes de probe.swapped; moveStaging usa renameSync sem a política da fixture. A evidência é compatível com recusa na montagem, tratada como recusa da promoção pelo produto. O código exato e a causa física não foram registrados: não atribuir EPERM específico, antivírus, Node, handle ou causalidade histórica. Provar o mecanismo com controle determinístico antes de corrigir.

Relatório literal74729bytes/SHAf3a900bcb5c7700647beed9f4ad49773adbebd2ab57c8d7790df77e66fdd8521 em `.checks/issue-25-agent-launch.round28-failed.md`. `.verified` anterior495744bytes intacto, sem PASS novo. Auditoria28 fechou depois do B28 parcial: baselineFINAL27parcial→FINAL28parcial,12113/12113metadadosWSL/0diferenças/erros/alvostringigual. Não houve D28; limites de conteúdo/Windows/PS/rede/TEMP/proveniência/impacto permanecem.

## Contrato da correção da prova

- Ownership Claude/Grok: somente `tests/integrations/install-apply.unit.test.mjs` e relatório próprio. Root coordena/revisa; nenhum produto, core, CLI, workflow, dependência, prazo ou teste de outro arquivo será alterado.
- Reutilizar um contrato compatível existente, especialmente `s19MoveFixtureDirectory` e a montagem aguardada de C34n/o. Não duplicar política nem inventar mover genérico para consumidores hipotéticos.
- A intervenção da fixture só termina quando a troca terminou de fato. O instalador não pode continuar a promover ou escrever através da entrada enquanto a montagem está pendente, nem transformar montagem que falhou em cenário saudável sem troca.
- A falha de montagem deve permanecer identificável como falha da fixture, com o erro original disponível e sem mascarar o erro primário. Não alimentar silenciosamente o retry de produto como se a recusa simulada contratada tivesse ocorrido; não marcar probe.swapped ou fotografar entrada alheia antes da conclusão.
- A movimentação física própria usa somente a política de fixture existente: Windows EPERM/EACCES/EBUSY, no máximo7tentativas/esperas10,20,40,80,160,320ms=630; demais códigos/POSIX1; reconferir identidade BigInt da origem e destino ausente antes de cada tentativa. Não mover/remover entrada trocada. Contagem simulada não inclui a movimentação física posterior.
- Preservar TODOS os casos/labels, arrays esperados, asserções de attempts, through, foreign, own, conflitos, manifest, lock e bytes do K1–K13/C34m/n/o; não substituir comparação exata por presença, aumentar limites, pular casos, aceitar erro ou repetir um caso natural malsucedido para concluir a tabela.
- O achado ocorreu no K7d. Se a correção precisar alterar o encanamento compartilhado das intervenções K7/K10/K11 ou C34m, delimitar cada trecho e justificar antes de editá-lo; mudanças só para efetivar a mesma intervenção e separar seu erro. Não refatorar o resto do arquivo nem corrigir notas cosméticas R1/O2/N1/N3/N4.
- A S21 terminou integralmente verde no autor37b8048 (ABC/D e200observações C11). Seus3arquivos e os105testes do core ficam congelados; o prefixo original894linhas deve continuar exato. Este novo batch está em outra superfície, depois do verde do batch anterior, sem handoff no meio de RED.

## Provas antes e depois

1. Autor novo lê o pacote de fontes/vistas declarado, estima leitura com reserva até150k e propõe Landing concreta antes do código. Root mantém a feature inteira50checks/9AC. Sem alegar leitura de documentos recebidos só como vista.
2. Escrever controles de regressão primeiro, a partir deste contrato: recusa síncrona EPERM na montagem não vira applied sem troca; troca adiada impede efeitos do instalador até concluir; transitório controlado2recusas→sucesso com3tentativas/[10,20]; permanenteEIO1/[]/mesmoerro; permanenteWindows7/630 e POSIX1 permanecem falha explícita de montagem. Guardas de origem trocada/destino ocupado continuam recusando sem efeitos. Escolher apenas casos necessários para discriminar o mecanismo; nenhum teste artificial só de encaminhamento.
3. RED deve falhar no comportamento anterior por asserção de contrato, não erro de ligação, TypeError acidental ou configuração inválida. Usar cópias privadas/gerador controlado se necessário, sem mudar a fonte para pescar o erro físico.
4. Após Root revisar os controles e o RED, autor corrige somente o encanamento confirmado. Fonte esperada original será restaurada/comparada integralmente pelo Root, descontando apenas trechos de montagem/novos controles autorizados. Todas as asserções originais devem reaparecer sem alteração.
5. GREEN dos arquivos completos afetados nos3ambientes, depois ABC integrações+governança+core inteiros e Dnpmtestcompleto, concorrência8/8/7 e prazos existentes. Não repetir S20/S18/coletas saudáveis se nenhuma fonte de produto/core mudou; carries exigem identidade e atribuição explícita, sem dizer que executou novamente.
6. Root despacha Verifier29 fresco após a última fatia, todafeature50/9 e ABC/D. Formal15 segue disponível/necessária, não foi consumida. Histórico28independentes/14revisões preservado; tetoformal15/global2 permanece. Primeiro PASS/ready válido, novoHEADCI5PR+5manual e mediçãoesquema2A1/B/A2/4500 antes do merge autorizado.

## Segurança e processo

Leitura/edição Native em arquivos próprios; execução somente por comandos literais Root revisados com HEAD/hashes/assets/claims e raízes privadas/identidades capturadas antes de uso. Nada de shell amplo, agentes reais como fixture, rede ou limpeza global. Auto-background não é conclusão; esperar saída natural e0background antes do próximo gate. GlobalTemp/x preexistente sobrescritoS14/sem cópia conhecida/impacto desconhecido nunca será tocado e continuará no resumo final. Restrições de ferramenta não são sandbox do SO; TEMP privado não remapeia `/tmp` explícito.
