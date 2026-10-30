# Diagnóstico do I25-C43 após recuperação — S16

Estado antes do código: plano do coordenador Root para a entrega da issue #25, PR #28. Não é resultado de teste.

## Fonte, autorização e falha

O proprietário autorizou corrigir a CI, manter testes/prazos e seguir até ambas as matrizes verdes e o merge; autorizou as rodadas necessárias. A continuação usa esse escopo, sem nova decisão de domínio: [aprovação6502294779](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6502294779) e os pedidos já registrados na task. A decisão reversível do Root é completar a observabilidade de uma falha real. Não é aprovação humana nova nem autorização para alterar critérios.

HEAD58ffff4537b4280362c1e82073142da68fa324b2 teve Verifier26 PASS50/50, formal14 ready/sufficient/AC1–AC9met e [CI do PR40969777477](https://github.com/oldboydev/skill-me/actions/runs/40969777477) com os cinco checks verdes. A [manual40969866439](https://github.com/oldboydev/skill-me/actions/runs/40969866439) falhou no [Windows123783727441](https://github.com/oldboydev/skill-me/actions/runs/40969866439/job/123783727441) e agregadoCI123787402546. Gov27/27, motor16/16, doctor417/410/0/7; integrações616/591/1/24 naturais. Não houve rerun inalterado.

No teste transitório I25-C43 de launch/end.e2e.test.mjs:817, as asserções até831 passaram: a abertura falhou por EIO controlado, o agente não iniciou, houve recusa enquanto o lock existia, recoverDeclared encerrou a captura e os bytes da outra execução ficaram iguais. O hook posterior da outra execução (:832) devolveu {launch:true,code:"delivery_timeout",entries:1,committed:0,persisted:0,lost:1}; a asserção exige LAUNCHED(1), code:null e1/1/1/0. Essa asserção está correta pelo C43(a) e permanece.

Falta a operação/tempo dessa entrega. Nenhum defeito de produto foi demonstrado. O diagnóstico Claude só leu e escreveu seu relatório; não executou nada nem alterou fonte. O relatório e adenda ficaram em builder-ci26-diagnostic/findings.md. A sessão ultrapassou sua estimativa150k e encerrou sem BUILD; um autor novo recebe esta fatia.

## Decisões e ownership

Claude novo implementa somente tests/integrations/launch/end.e2e.test.mjs. Root mantém docs/controles de execução e revisa; não implementa produto/testes. Não reverter trabalho alheio.

D1. Adotar recordProducersInEachTest() do apoio existente helpers/traces.mjs, com seu import. Ele registra runHook nos C27/C31/C41/C43 e acrescenta evidência ao erro na falha. runSkillMe e produtores em processo não passam a ser instrumentados. Não criar helper, módulo ou dependência nem ampliar a instrumentação sem falha demonstrada.

D2. Extrair o corpo do C43 transitório para c43TransientOpening(prepared,label,lastHookEnv={}), preservando todas as instruções/asserts da rotina original na mesma ordem. O teste original mantém preparedLaunch(...,"i25 c43 transitorio",...), o rótulo e argumentos, sem env adicional, e a última asserção LAUNCHED(1). hookFor recebe extraEnv={} e o aplica só ao último hook dos controles; os demais consumidores continuam com {}. Não duplicar o corpo nem adicionar entrega, espera, aquecimento ou retry.

D3. Os controles usam activeRecording/producerTrace existentes, não um registro independente que tornaria a adoção do arquivo invisível ao RED. Imports adicionais de activeRecording e ATTEMPT_MS são aceitos: são interfaces já consumidas, e o prazo tem fonte única. Não mudar esses módulos.

D4. Um verde posterior não demonstra a correção do timeout físico. A instrumentação corrige a lacuna de evidência; a causa histórica continua desconhecida. Prosseguir após PASS/ready e ambas as CIs verdes com medição, conforme já autorizado; registrar qualquer nova falha sem rerun inalterado.

O observador não é neutro: pré-carga antes da leitura do evento; wrappers de E/S e histograma10ms dentro do prazo. É a forma já usada por oito arquivos. Não há otimização ou SLO novo, nem comparação de desempenho proposta sem necessidade demonstrada.

## Controles K0–K3: contrato antes do código

Nomes prefixados I25-C43, reconhecíveis pelo filtro existente do checklist. K0 é o teste original, não uma entrega adicional.

K1 nome: I25-C43 diagnóstico da abertura com falha transitória: E/S na promoção do segmento na entrega final mantém a asserção vermelha com io_failure e mostra a falha sob o lock, o lock livre e nada persistido
Último hook: SKILL_ME_TEST_TRACES_SEGMENT_EIO="1".
Erro capturado: AssertionError, operator deepStrictEqual, expected LAUNCHED(1), actual {launch:true,code:"io_failure",entries:1,committed:0,persisted:0,lost:1}.
producerTrace(...,{commits:false}): failures exatamente ["rename segmento.tmp EIO (sob o lock, 1ª tomada)"], pending[]; lock ausente. Capturas ordenadas por estado: [["active",0,0,null],["stopped",0,0,null]], campos state/accepted/persisted/dataFile.

K2 nome: I25-C43 diagnóstico da abertura com falha transitória: disco parado na criação do segmento na entrega final mantém a asserção vermelha com delivery_timeout e mostra a operação pendente sob o lock, o laço livre e o lock do hook
Último hook: SKILL_ME_TEST_TRACES_STALL_SEGMENT="1".
Mesmo erro e expected; actual delivery_timeout1/0/0/1. failures[], pending exatamente ["open segmento.tmp (sob o lock, 1ª tomada)"], last "close key (sob o lock, 1ª tomada)". loop.samples>0 e loop.maxMs<ATTEMPT_MS. Lock presente com pid igual ao hook; mesmas capturas0/0/dataFile:null de K1.

K3 nome: I25-C43 diagnóstico da abertura com falha transitória: laço de eventos parado antes da tomada do lock na entrega final mantém a asserção vermelha com delivery_timeout e mostra o atraso do laço maior que o prazo da tentativa
Último hook: SKILL_ME_TEST_TRACES_BLOCK_LOOP="1|900" (ordinal1 desta rota; mesma duração do precedente2|900 em live-capture).
Mesmo erro e expected; actual delivery_timeout1/0/0/1; loop.maxMs>=ATTEMPT_MS. Não se exige max>=900 nem estado do lock/pendentes, pois amostragem e process.exit cortam a operação em ponto variável.

O primeiro append da outra execução passa por commitBatch/writeExclusive do segmento.tmp e rename para events-000001.ndjson; logo K1/K2 atingem essas operações. A tomada é a1ª neste hook, não a2ª da rota automática C47. Flags já existentes; nenhuma mudança no preload.

Se uma expectativa falhar, preservar o resultado e investigar; não alterar a barra silenciosamente. Os controles discriminam classes conhecidas de injeção, não T1/T2/T3 ou causa física histórica.

## RED/GREEN e prova P1 obrigatória

RED da lacuna: cópia owned do mesmo arquivo proposto, removendo somente a chamada recordProducersInEachTest(); os três controles dependem do registro do arquivo, de modo que sem ele a injeção não é carregada e a rotina passa; cada controle deve falhar por não encontrar a falha esperada. Arquivo inteiro, sem filtro: exatamente K1–K3 vermelhos, K0 e demais verdes. GREEN: arquivo proposto inteiro, todos verdes. Uma falha natural adicional fica preservada e não é repetida inalterada.

P1 prova a ANEXAÇÃO ao mesmo erro da rotina natural; os três controles que capturam o erro não exercitam o afterEach vermelho. Em duas cópias owned, somente o último hook do teste original recebe STALL_SEGMENT="1", NODE_OPTIONS com --import=TRACES_PROBE e SKILL_ME_TEST_TRACES_TIMING apontando arquivo exclusivo próprio, criados pelo controlador antes do uso. A pré-carga e injeção ficam efetivas nos DOIS lados; isso corrige a proposta inicial, na qual a injeção seria inerte sem adoção. O recordedProducer respeita esse timing explícito (producer-runs.mjs:43-53).

Nas duas cópias, o teste original termina naturalmente vermelho com o mesmo nome, actual delivery_timeout1/0/0/1, expected LAUNCHED(1) e operator deepStrictEqual. Sem adoção, não há linha de evidência comum. Com adoção, o erro mantém esses campos e a localização do teste, acrescido de "evidência dos produtores deste teste (2):" e do pendente "open segmento.tmp (sob o lock, 1ª tomada)". Os números de linha mudam com a extração; a identidade é nome+campos+test at. A preservação de objeto e privacidade do formatter comum permanece provada por evidence.unit inalterado; P1 confirma o encaminhamento nessa fronteira. Não se exige que todo stdout não contenha caminhos: a stack legítima contém o caminho do teste; a evidência sanitizada não acrescenta IDs/chaves/conteúdo/ambiente.

Provas/controladores somente após revisão do Root, em raízes exclusivas registradas por caminho absoluto/tipo/não-link/dev/ino/realpath antes do uso. Retenção de pais próprios; remoção apenas dentro da raiz e após identidade, sem varredura global/prefixo/mtime. Nenhum agente real como fixture/help/version.

## Gates, handoff e invariantes

Uma fatia S16 inteira: observabilidade do C43, original e três controles, sem cortes no meio do resultado. Autor fresco lê uma vista literal e mapeada desta fatia do checklist canônico e o diff desde o último fechamento, mais fontes completas necessárias; não é um segundo checklist nem autoriza ignorar C1–C50 na verificação final. Estimativa do pacote será registrada antes do BUILD e ficará abaixo150k tokens; leituras adicionais contam. O autor declara o que leu/omitiu; não afirma PASS global. Root mantém a feature inteira.

Autor: RED/GREEN e P1, depois arquivo end.e2e inteiro A(Node24.22.1 Windows), B(clone novo autocrlf=true, Node24.13.0/npm11.6.2), C(WSL uid1000, archiveLF/árvore conferida/env-i/PATHisolado/Node24.13.0, minCPU−1cap8; atual7); D npm test completo com paiTEMPcurto próprio desde o início. Gates sem filtro, uma execução de cada, saída natural e nomes executados, skips com motivo; parar na primeira falha/omissão. Não repetir GREEN independente de A se o mesmo comando/contexto já o comprovar; distinguir cópia experimental de gate. P1 é prova controlada nomeada e pode selecionar o teste original único; não vale como gate completo. Orçamentos locais ABC30min/D2h, ferramenta600000ms primeiro plano, sem segundo plano explícito. Prazos de produto/testes/jobs intactos.

C43 original e todos os demais tests/asserts/payloads/contagens/ordem permanecem. Produto750/650ms; relatório1000ms incluindo settle650; stdin2000/faixa1900–6000; Hermes5s;500eventos/8MiB/7dias; T8-C15 dois×40=80/quatro intercaladas; T8-C16 três criações; repetição10ms sóEEXIST; concorrência minCPU−1cap8; jobs20/10/5 e manual10. Sem tolerância, aquecimento, retry, aceitação de perda, redução de carga ou troca de runtime.

Ordem: plano/Landing antes do código → Claude implementa/provas → commit limpo → Verifier27 fresco independente despachadoRoot sobre base..HEAD/C1–C50 → relatório preservado/commit → formal15 Codex novo RO → ready → push → uma nova manual e PRsync no mesmoHEAD → ambas cinco checks regulares verdes+medição comparativa → merge já autorizado. Exceção específica15/contexto novo sóRootquando necessário; preservar14formais/26verificações, sem reset.

## Swept existing e limites preservados

Validação/autorização: só fixtures e env de teste; produto e confiança nativa iguais. Falhas/observabilidade: mesmo erro preservado e campos ausentes não viram zero. Idempotência/retry/concorrência/ordem: nenhum comportamento novo. Lifecycle/transições: recuperação e capturas com as mesmas asserções. Dependências externas: flags existentes do Node preload, nenhum serviço/modelo. Privacidade: formatter comum inalterado, sem caminhos/IDs/chaves/conteúdo/ambiente na evidência.

Medição real40969866439: schema2 A1/B/A2/4500 completos, dez métricas1500amostras/fase, zeroerro/incompleto; C:/D: distintos. A1teve7 contagens>=650 em métricas sobrepostas (não7ciclos); B/A2nenhuma. Releasep50/p99/maxA1 2.563/9.863/932.634ms, B1.875/6.857/11.168, A2 2.553/9.791/145.993. Componente namespaceindividual, não disputa nem pipeline comchave, sem atribuição do C43 ou causas anteriores.

Histórico preservado: FAILs anteriores, interrupções, omissões, limites de limpeza/auditoria e incidentes; especialmente globalTemp/x PREEXISTENTE sobrescrito naS14, conteúdo anterior sem cópia conhecida e impacto desconhecido. Não ler/tocar/restaurar esse arquivo. Auditoria26 sómetadadosWSL, não Windows/conteúdo/PS/rede/TEMP/proveniência/causa/impactozero. Retomada ampla foi recusada auto-review; fases de edição restrita semshell e execução por literais revisados, não sandboxFSdoSO; TEMPprivado não remapeia /tmp GitBash.
