# S24 — diagnosticar as falhas Windows do HEAD34b, mantendo os contratos

Plano de investigação dentro do pedido já autorizado de corrigir a CI do PR28 e seguir até verde/merge. Nenhuma causa física, erro de produto, correção ou PASS é declarado pela criação deste plano. S23 (imagem macOS) é uma decisão separada ainda pendente do proprietário.

## Evidências de partida

HEAD34b808977ae81f15df913e4a84668a6c61e83dd9: R29PASS50/9 e Codex15ready/sufficient/9met. Fontes do produto/testes/scripts/workflow idênticas às provas locais de4becf46: A/B774/761/0/13, C774/752/0/22, D1191/1171/0/20, términos naturais0. Isso não substitui os novos gates remotos.

CI PR41111349795, Windowsjob124254210769: integrações642/614/4/24, término1. Log literal ignorado em`.checks/code-review/issue-25/ci34b-windows-pr41111349795.log` (249371caracteres). Ubuntu passou; macOS124254210771 foi cancelado antes de executar pelo brownout oficial, não por estes testes.

Falhas concretas:

1. I25-C32 primeira criação do store pelo launcher, `tests/integrations/launch/end.e2e.test.mjs:404`, assert444: execuçãoA obteve `[[], "stopped", 0]` onde exige1evento. Evidência: nenhum produtor registrado. Causa e operações desconhecidas.
2. I25-C34 ordem do relatório, `launch/report.cli.test.mjs:120/153`: `launchCapturesOnDisk`, `helpers/launch.mjs:275`, encontrou pasta semstate.json (ENOENT). Os quatro marcadores das barreiras foram observados; diagnósticos dos launchers incluem lock_present no encerramento. Não presumir que toda pasta é captura publicada, mas também não ignorar captura incompleta para obterverde. Provar qual estado é legítimo e qual faz o teste falhar corretamente.
3. I23-C6 Claude comon, `observe/agents.e2e.test.mjs:103/116`, subagent_start: producer11delivery_timeout1/0/0/1 emvez1/1/1/0. Trace660ms, sync634ms no total, sync segmento.tmp605ms; última operação statlock.retirado, readlock.retirado pendente na saída. O estado final inspecionado soma11registros, mas isso não prova sozinho a confirmação do produtor. SemfalhaE/Sregistrada. Não confundir timeout/commit/ack nem atribuir AV/Node/causa física por hipótese.
4. I23-C10 sessões intercaladas/simultâneas, `agents.e2e:319/331`: claudeA3/producer10delivery_timeout,675ms, sync346/realpath233/open60ms, últimaclose lock sob2ªtomada e renamelock pendente. Producers11/12lock_present com22/24EEXIST; snapshot3capturasactive com4/3/3registros. Prazos e contagens permanecemexatos.

Medição manual41111491159/job124254505319 no mesmoHEAD: esquema2/A1/B/A2,4500/4500,0erros/incompletos/linhasinválidas,10métricas×1500amostras/fase,6filhos/fase0,3pastasremovidas/0falhas. BRunnerD: nenhumaocorrência>=600/650ms, tomada p99=1.240ms/liberação p99=5.700ms. A1padrãoC: uma tomada máxima6173.684ms e8ocorrências agregadaspor métricas>=600/650 (podemse sobrepor); A2semessasocorrências. Isso mede componente deE/S/lockdurablefalse/namespaceindividual, não a chave, fsyncdurabletrue ou pipeline real; não explica nem anula as4falhas. Artefatos measurement41111491159.json e-validation.json preservados.

Resultado manual posterior, preservado antes da investigação: Windowsjob124254564991 terminou1, integrações642/617/1/24; governança27/27, core105/105, doctor417/410/0/7. Falhou I25-C43controlelaçoparado, `end.e2e:909/911`, dentro deassertFinalHookLost871: o arranjo inicial esperava lock_present e já recebeu delivery_timeout, antes de construir a falha final pretendida. Trace só3operações/648ms, realpathpasta643ms, lstatstore.jsonpendente; atraso de laço24.9ms,42amostras. Não afirmar que o controle final do laço chegou a executar. Log literal217193caracteres emci34b-windows-manual41111491159.log. Esta é a quinta falha a explicar; as quatro doPR não reapareceram nessa execução já exigida, o que não as resolve nem autoriza repetir para pescarverde. macOSmanual também foi cancelado pelo brownout, Ubuntu passou, agregadofalhou. Nenhum novo job foi acionado após essas falhas.

## Investigação autorizada e limite

- Root mantém a featureinteira50/9 e coordena. Claude/Grok novo recebe fontes/vistas declaradas, diffs pertinentes e logs, calcula Sourcecomreserva<=150ktokens/runtime separado. O batchS22 terminouinteiroverde antes deste handoff; nada foi repartido no meio deRED.
- Fase inicial: somente leitura e relatório próprio. Ler os contratos e os caminhos reais das4falhas, separar observação/inferência/desconhecido, propor tabela de decisão e o menor diagnóstico/reprodutor que discrimine as hipóteses. Identificar o que a evidência atual já prova; não coletar centenas de amostras iguais sem pergunta.
- Examinar os auxiliares existentes producer-runs/traces-probe/traces e launch. Se faltar observação emC32/C34, reutilizar o registro existente; não inventar loggerduplicado. Antes de instrumentar, Root revisa a Landing literal, controles, ownership e o orçamento de leitura.
- Execuções futuras somente por comandos literais Root revisados, HEAD/hashes/runtimes fixados, cópiasoffline/raízespróprias com identidades e registros exclusivos, semshellamplo/rede/agentesreais/limpezaglobal. Aguardarfechamento real/0background; não mascararassertcomlimpeza/setup/TypeError.
- Preservar testes, nomes, casos, asserções, contagens, concorrência/carga e prazos. Nãoaceitarperdas, repetir caso saudável até passar, descartar evidência indisponível como saudável ou usar medição do lock como garantia do pipeline. Prazos delivery750/650ms, relatório1000inclsettle650, stdin2000/faixa1900–6000, Hermes5s,500eventos/8MiB/7dias; T8-C15dois40=80/quatrolinhas; T8-C16exato3; retry10ms apenasEEXIST. CI20/10/5/manual10min.
- Nenhumretry/cache/paralelismonovo, mudança dedurabilidade/fsync, prazo, tolerância, identidade/isolamento ou política de confirmação/perdas está autorizado por este diagnóstico. Otimização exige antes/depois em condições comparáveis e prova da necessidade; não reduzir validação de segurança/integridade para economizarE/S. Se surgir decisão contrária à fonte vinculante, propor antes de implementar.
- Corrigir somente defeito demonstrado dentro dos contratos, depois de Landing antes do código e de controles RED de comportamento. Se o teste estiver errado, apresentar o conflito com o contrato e a prova, sem enfraquecimento silencioso. Falha física de prazo legitimamenteobservada não é por si defeito de produto.
- Ainda não há ownership de produto/testes para editar; só o relatório do diagnóstico. Root delimita arquivos e provas após a leitura. Não tocar no coreS21 ou instaladorS19 para hipótese sem relação demonstrada.

## Encerramento e gates

Primeiro produto deste diagnóstico é um relatório localizado: para cada falha, o que se sabe, o que falta, hipótese discriminável, proposta exata de controle/arranjo/observação, efeitos e alternativas rejeitadas. Não declarar PASSglobal.

Qualquer implementação necessária tem suas provas e revisão proporcionais definidas antes do código. Após todas as fatias da entrega, Root despacha Verifierfresco sobre os50checks/9AC, com carryexplicitamenteporidentidade e provasnovasnas superfícies afetadas. S23, se aprovada, não basta para corrigir Windows. Ready15 só vale para34b; conteúdo novo exige revisão nova, usando as rodadas já autorizadas e preservandoas15anteriores. ApósPASS/ready, novoHEAD exige5checksPR+5manualverdes e mediçãoesquema2no mesmoHEAD antes do mergejáautorizado. Nãoabrir novaissue/PR, não publicarpacote/deploy/mainpush.

Histórico, falhas e omissões ficam preservados. IncidenteS14: globalTemp/xpreexistente sobrescrito, semcópiaconhecida/impactodesconhecido; nunca ler/tocar/mover/remover/restaurar e manter no resumofinal. Auditorias de metadadosWSL não provam impactoglobalzero.


## Fechamento da recuperação limitada (Root, posterior ao diagnóstico acima)

O Windows passou na tentativa 2 do PR (execução 41111349795, job 124272776190) e na tentativa 2 manual (execução 41111491159, job 124279286363). Em cada uma: governança 27/27; core 105/105; doctor 417 testes, 410 aprovados e 7 skips; integrações 642 testes, 618 aprovados e 24 skips. Total por execução: 1191 testes, 1160 aprovados, zero falhas, 31 skips e zero cancelamentos. Os 89 testes novos do core, os 16 originais e os sete S22 foram conferidos por nome nos dois logs. As quatro falhas anteriores do PR e o controle C43 manual passaram. Houve uma recuperação por job, preservando as tentativas anteriores, sem alteração de código, asserções, prazos, contagens, concorrência ou durabilidade. O resultado não identifica a causa física nem garante ausência futura.

Detecção e Ubuntu passaram nas duas execuções. A medição manual original do mesmo HEAD 34b foi validada: A1/B/A2, 4500/4500 ciclos, zero erros ou ciclos incompletos e três limpezas. Ela não foi solicitada novamente. IDs novos atribuídos pelo GitHub a resultados carregados não comprovam nova execução desses jobs. O macOS continua cancelado antes dos testes pela interrupção programada oficial; os dois agregados CI continuam falhando. Não houve merge, Done ou CI inteiramente verde.

A proposta S23 de macOS 15 continua aguardando decisão do proprietário, conforme a pergunta da conversa e `.tasks/issue-25-macos-runner-proposal.md`. A alternativa original é aguardar a retomada da imagem 14 em 31/10 às 00:00 UTC (30/10 às 21:00 BRT); a retirada definitiva será em 02/11. Nenhuma mudança de workflow, teste ou produto S23/S24 foi implementada. Os planos e as evidências locais novos ainda não foram publicados. O ready 15 refere-se somente ao HEAD publicado 34b8089; conteúdo novo exige revisão válida antes de novo push, com as rodadas já autorizadas.
