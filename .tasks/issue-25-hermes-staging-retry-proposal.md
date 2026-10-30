> **Atualização: S19 APROVADA pelo proprietário.** Resposta na conversa: “Autorizar correção pontual e seguir até merge”. Registro https://github.com/oldboydev/skill-me/issues/25#issuecomment-6520123791. O texto abaixo preserva a proposta anterior à aprovação; o estado pendente nele é histórico. Ainda nenhum código S19 foi escrito.

# S19 — proposta de correção pontual da promoção Hermes no Windows

**Estado: proposta completa do Root, aguardando decisão do proprietário. Nenhum código desta correção foi escrito.** Issue #25/PR #28. Não é PASS, ready ou CI verde. Os pedidos de corrigir a CI, manter testes/prazos e seguir até merge, e as rodadas necessárias, permanecem autorizados. A decisão nova abaixo não é uma rodada adicional.

## Problema medido e limite da conclusão

O experimento S18, HEADf0af0fd03b683b79b8f2b5e2ff0f48e1f78b9288, foi executado uma vez em cada runtime pelo Claude, usando o mesmo gerador4984da3625b156f74799717b1a8a5ab23eccc703910aca6217e60aac0367555b, fixtures e ordem. Cada coleta teve100instalações/50empty+50configured, nenhuma repetição, Node:test1/1/0/0skip natural0. Esse0 comprova coleta, não produto.

- A Node24.22.1:99 instalações0 e1 instalação5, índice5/empty/20,57ms.
- B Node24.13.0:98 instalações0 e2 instalações5, índices15 e99/empty/16,76 e22,73ms.
- As três: status incomplete, errors[{code:EPERM}], steps[{step:artifacts,state:failed}], única rejeição nãoENOENT rename plugins/.skill-me-observer.skill-me-tmp→plugins/skill-me-observer EPERM. São observações naturais, não injeções. A causa física, o dono de eventual handle e a duração da recusa continuam desconhecidos. A diferença1/100×2/100 não demonstra causa no Node; os100configured saudáveis também não demonstram causa no tipo do home.
- As falhas antigas S16D1079/1057/2/20 eS17A40/36/3/1 não tinham operação registrada. A amostra nova não prova retrospectivamente que eram esta mesma operação. S17B/C/D não rodaram. Tudo fica preservado.

O instalador já repete renames de ARQUIVOS recusados por EPERM/EACCES/EBUSY, com seis esperas10/20/40/80/160/320ms (630ms somados), no máximo7tentativas (run.mjs:295–337). A promoção do DIRETÓRIO Hermes, run.mjs:797–803, tenta uma vez, limpa só sobra própria reconhecida e retorna5 se a recusa permanecer e não houver destino alheio.

Claude S18 preparou proposta read-only em builder-s18/report.md; o Root leu a PREPARE, EXEC e a proposta integralmente. CLI de plano33565/PID68776 terminou0/0BG04:02:22.698UTC30/10/2026, sem comando, fonte ou teste alterado. As decisões Root abaixo refinam a proposta, não são aprovação humana.

## Decisão solicitada

Aplicar SOMENTE à promoção do diretório Hermes no WINDOWS a política de recusa já existente do instalador: EPERM/EACCES/EBUSY, até7tentativas, mesmas seis esperas e630ms somados. EIO, ENOSPC e demais códigos continuam com1tentativa. POSIX continua com1tentativa de promoção, sem novas esperas de retry. O rename de arquivos mantém exatamente seus códigos, sequência de conferências, tentativas e esperas atuais, nas plataformas atuais.

**É uma ampliação do comportamento de repetição:** essa etapa da instalação pode esperar até630ms adicionais, mais o custo das conferências, mantendo hermes.lock por mais tempo. Não é um aumento dos prazos de entrega, mas aumenta a janela em que outra instalação recebe lock_present. Não chamar isso de “nenhum retry novo”.

Não alterar750/650ms de entrega, report1000inclsettle650, stdin2000/faixa1900–6000, Hermes5s,500eventos/8MiB/7dias,T8-C15dois×40=80/quatro intercaladas,T8-C16trêscriações, timeoutCLI30s, concorrênciaCPU−1cap8 ou jobs20/10/5/manual10. A instalação não está dentro dos temporizadores de entrega lidos (launch/prepare.mjs:109 é após confirmação interativa); essa é a fronteira da mudança.

Se a recusa persistir, terminar com5 e o último código real, artifacts failed, registro não gravado e lock liberado. Nunca tratar EPERM como sucesso ou repetir a instalação inteira. Não aumentar630ms, tentativas ou lista de códigos.

## Guardas e erros — decisões Root antes do código

1. Reutilizar guardas de contenção/caminho real existentes de root/plugins/staging. Capturar referência dev/ino BigInt do staging logo após o mkdir próprio; conservar referências de identidade dos ancestrais relevantes para detectar também substituição real de root/plugins durante a nova janela. As capturas e comparações precisam manter os contratos do io existente; sem estatística arredondada que deixe de distinguir identidade.
2. Antes de CADA tentativa, inclusive a primeira e depois de cada espera: mesmo root/plugins/staging real, não link/junção/arquivo; mesma identidade capturada; nomes exatamente os3artefatos esperados, todos regulares/contidos e com bytes/hash exatos do pacote; destino ainda ausente, mesmo se o alheio que apareceu for diretório vazio.
3. Reutilizar isOwnStagedFile/holdsExactly e as guardas compatíveis. readStaging sozinho não basta: owned:true admite vazio/incompleto. Não duplicar regra de propriedade nem promover diretório alheio com cópias idênticas.
4. A mesma identidade protege gravações no staging e limpeza depois de erro. Se uma guarda indicar troca/edição/conteúdo extra/destino aparecido: conflito4 adequado, sem segundo rename e sem limpar o caminho que pode ser alheio. Se não houver como observar identidade confiável: falhar fechado com5 e diagnóstico existente de E/S, sem errno inventado, sem promoção ou limpeza por suposição. O Root rejeita o fallback sugerido de promover uma vez sem identidade observável.
5. Só na falha de rename com propriedade ainda comprovada, a limpeza remove a sobra própria conforme o contrato existente. Preservar prioridade de erro/withLockKept, applied, steps e a proveniência do registro. Nenhum rmdir recursivo, rollback ou GC novo.
6. Permanece a janela não atômica entre conferência e rename perante editores arbitrários; não prometer CAS ou isolamento do SO. As guardas são refeitas, não uma transação com outros processos.

O pseudofluxo é guarda→rename→(se código permitido e orçamento ainda disponível)espera→guarda novamente. Dois consumidores reais (writeViaTemp e promoção Hermes) podem justificar helper mínimo compartilhado; o consumidor mantém as suas guardas e limpeza. Evitar copiar o loop ou refatorar módulos fora desse encontro. Arquivos comuns do core vendorizado permanecem idênticos.

## Implementação e provas se a decisão for aprovada

Claude novo S19 implementa apenas src/integrations/install/run.mjs e provas em tests/integrations/install-apply.unit.test.mjs; Root mantém plano/checklist/evidências e a linha de documentação necessária em docs/agent-observation.md. Sem helpers globais, dependência, cache, nova paralelização, publicação ou alteração de workflow. Se surgir necessidade real de outro arquivo ou mudança incompatível, registrar antes e avaliar a autorização; não expandir silenciosamente.

Nenhum teste existente é removido ou enfraquecido. Manter I4-C29b/C34i/C34j/C27d/C25f/C30d/C34f/g e o CLI inteiro. Retificação documental do Root: o campo antigo chamado waitedUnderOneSecond verifica Date.now()-started-accessMs < 1000+500, isto é1500ms ajustados por accessMs; preservar a expressão exata. O nome não autoriza alegar limite real de1s nem mudar1500.

Provas propostas, com tabela de valores definida antes de editar:

| Cenário | Tentativas / resultado esperado |
|---|---|
| Windows EPERMduas depois sucesso | 3;0 applied;3artefatos bytes/hash exatos, registro3hashes, staging ausente/lock liberado |
| Windows EACCESuma / EBUSYuma depois sucesso | 2;mesmo resultado exato |
| Windows EPERM permanente | 7;5 incomplete/EPERM/artifacts failed;somente sobra própria limpa, destino/registro ausentes, lock liberado |
| EIO ou outro código não permitido | 1;mesmo erro5/limpeza/contagens atuais, sem nova espera |
| POSIX EPERM | 1;5, nenhuma espera de retry nova |
| staging vira arquivo/link/junção/outro diretório real com cópias exatas durante espera | nenhuma2ªpromoção;4;alheios e arquivos movidos intactos, registro ausente, lock liberado |
| artefato editado/removido/arquivo extra ou destino alheio aparece (vazio/com arquivo/link/arquivo) | nenhuma2ªpromoção;4;bytes alheios preservados, nenhum acesso através do trocado |
| root/plugins trocado por link/junção ou diretório real durante espera | nenhuma2ªpromoção/operação através do caminho alheio;4;bytes alheios intactos |
| identidade ausente/não confiável | 5;nenhuma promoção/limpeza alheia/espera |
| saudável sem recusa | 1;mesmo resultado exato atual |

Provar também a sequência exata de esperas pedidas10/20/40/80/160/320 e soma630 na camada do helper/efeito controlado, sem assert de relógio suscetível à carga. Não alterar I4-C29b para acomodar a correção. A técnica de observação de esperas e as âncoras de testes precisam estar concretas no pacote do autor antes do BUILD; não basta inferir o número de ms apenas de7tentativas.

RED/GREEN com fonte anterior e nova: sucesso após recusa e esgotamento7 discriminam o comportamento anterior, enquanto EIO/POSIX já devem passar antes e depois. Guardas de trocas devem provar ausência de acesso/promoção/limpeza alheia, não só presença de conflito. Controles S17 permanentes com testemunha1tentativa pertencem ao contrato ANTERIOR; preservar literal seu módulo/resultados. Criar controles novos com valores do novo contrato (7renames na recusa permanente); não apagar ou reescrever o histórico para aparentar que os antigos foram executados no novo comportamento.

Medição posterior UMAvez de cada runtime com o mesmo experimento S18/mesmo gerador/fixtures/ordem/contagens/TEMPcurto/concurrency8, registrando falhas e durações antes/depois, sem SLO e sem atribuir causa pelo verde. A evidência rejected pode registrar tentativas recusadas recuperadas; se algum dado de tentativas não for observado, declarar ausência e não inventar0.

Depois: autorABCdois arquivos inteiros eDnpmtest completo, Verifier27 fresco do Root sobre todafeature/C1–C50/9AC com ABC68integrações+governança eDfull, auditoria de metadadosWSL com limites declarados, formal15novoCodexRO, primeiroreadyválido, push, umanova manual ePR no mesmoHEAD, ambos cinco checks regulares verdes e medição remota schema2A1/B/A2/4500. Só então merge já autorizado. Preservar14formais/26verificações e registrar a exceção específica15/contexto novo antes de usar.

Uma fatia S19 inteira, autor novo: estimativa inicial≈93ktokens+20kreserva=113k<150k; Root medirá pacote literal/ranges/hashes antes de editar, leituras adicionais contam. Task/checklist completos seguem com Root/Verifier, não falsa alegação de leitura integral por extrato.

## Por que esta decisão está separada

AGENTS.md exige: “Planeje mudanças funcionais antes de implementar; aprovação explícita do proprietário autoriza escopo e decisões bloqueantes.” Os planos de diagnóstico S17/S18 mantiveram mudança de produto/retry fora dessas fatias. A autorização para rodadas não aprova automaticamente esta ampliação de comportamento. A conclusão de que D1 precisa de decisão humana é do Root, apoiada nessa regra e na mudança concreta; não é rejeição automática da ferramenta nem pedido para repetir autorização de testes/revisões.

Alternativas rejeitadas: repetir gate inalterado até passar, tolerar5, ignorarEPERM, esperar mais do que630, repetir instalação inteira, copiar arquivos diretamente no destino perdendo a promoção atômica, ou repetir rename sem guardas de identidade/bytes/destino. Só ampliar mensagens é alternativa menor ainda autorizada, mas não corrige a operação recusada observada.

## Histórico e incidentes

S16/S17 continuam vermelhas; S18 é diagnóstico, não gate. Sem Source nova desta correção, Verifier27, formal15, push, nova CI ou merge. Todos FAILs/omissões/interrupções/limites preservados. GlobalTemp/x PREEXISTENTE sobrescrito naS14, conteúdo anterior sem cópia conhecida e impacto desconhecido: nunca ler/tocar/restaurar. Retomada ampla foi recusada automaticamente antes do início; guardas NativeEdit/literais não são sandboxFSdoSO/TEMPprivado não remapeia/tmpGitBash. MetadadosWSL não demonstram conteúdo/Windows/PS/rede/TEMP/proveniência/causa/impactoglobalzero. Nenhum agente real como fixture/help/version, package privado.


## Contrato técnico S19 fechado antes do BUILD — Root, após aprovação

A aprovação cobre a política Windows7tentativas/630ms e as guardas da proposta. Decisões reversíveis do Root: helper renameRetrying compartilhado pelos dois consumidores reais, com efeito de espera parametrizável interno (default sleep existente) para provar a sequência pedida sem relógio. Se necessário, um named export desse contrato no módulo privado run.mjs permite a prova de camada; NÃO alterar assinatura/opções de runIntegrationCommand nem CLI, package ou dependências. Os consumidores de produção usam a espera real padrão. A prova espera literalmente [10,20,40,80,160,320], soma630, ordem guarda→rename→espera, máximo7, sem importar a mesma lista para calcular o esperado. Não criar parâmetro público de teste nem mock global de timers.

Diretório: referências BigInt de root/plugins/staging capturadas no ponto próprio antes de usar a nova janela, staging logo apósmkdir; checar tipo/não-link/identidade/completude/exatos3bytes/destinoausente em cada promoção, inclusive apósespera. Reusar as mesmas referências na gravação e limpeza. Identidade não observável: erro existente io_error/5, sem errno inventado, sem promoção ou limpeza por suposição; NÃO fallback de1tentativa sem identidade. Erro real de lstat mantém seu código. POSIX sem nova espera de retry; validações adicionais podem chamarE/S (não alegar “nenhum await novo”).

Raiz trocada: não forçar liberação do lock por um caminho que passou a alcançar pasta alheia. Manter a prioridade e os conflitos/lockLeft já praticados por withLock/withLockKept; os testes de root/plugins conferem ausência de acesso alheio e o estado do lock no local realmente comprovado. “Lock liberado” aplica-se aos cenários com raiz/pasta de estado estáveis, não autoriza seguir um alias depois da troca.

Ownership: Claude novo implementa SOMENTE src/integrations/install/run.mjs e APENDA provas novas em tests/integrations/install-apply.unit.test.mjs (import adicional do contrato de espera, se necessário), mais relatório/transformações puras próprios. Root faz docs/checklist/controle/revisão, não produto/testes. Testes antigos permanecem byte a byte (LF) após remover apenas import/testes novos; nenhum ajuste de asserção/limite/skip. Se um detalhe exigir correção pontual indispensável, autor relata cenário e Root resolve no escopo, sem rebaixar teste.

Nomes propostos de prova: I4-C34k Hermes: promoção Windows repete só recusas com guardas, preserva alheios e mantém falhas permanentes; I4-C34l rename: orçamento de repetição, ordem das conferências e identidade dos erros. O autor pode separar subtestes nomeados para cada linha da tabela, conservando todos os casos. Os testes de política semfilesystem cobrem códigos/plataformas/limites por valores literais; os casos de fronteira usam io real instrumentado e verificam bytes/hash/registro/lock e operações que atravessariam caminhos trocados. Não inferir630ms de7tentativas.

TDD: autor escreve APENAS testes e transformações puras primeiro; Root revisa e executores controlados permitem RED no produto anterior, com casos discriminantes e positivos preservados. Depois autor altera run.mjs; mesmos novos testes GREEN. Sem control opcional/quota de mutantes, sem executar agente real. Scope de batch: uma S19 inteira≤150ktokens de leitura medida, sem fatiar o resultado no meio. Autor não dispara Verifier; Root despacha Verifier27 fresco após a última fatia/provas globais.


### S19 — orçamento e TDD concretos antes de editar

Pacote preliminar:18fontes/vistas,3660linhas,239592caracteres; ceil(239592/2,5)=95837tokens estimados (não tokenizer), reserva20000,≈115837<150000. Uma S19 inteira, sem cortar guardas da política ou suas provas; o índice final registra a pequena diferença após este texto. Teto do pacote130000+reserva20000=150000; leituras extras contabilizadas. Inclui plano/contrato aprovados inteiros, run/io/target/manifest/artifacts e fontes necessárias, vistasunitcomcasesexistentes/helpers e task/checklistS19explicitamenteparciais. Root/Verifier27mantêm50checks/9ACinteiros.

TDD executável: READ de Claude novo → TEST escreve só novas provas APPEND+importnovo e relatório → Rootrevisatabela/cases/ausênciadealteraçõesantigas ecommitclean de testes comprodutoanterior → RED seleciona novosC34k/C34l emcópiaowned/hash/head/treeconferidos, testesexecutados(nãoSyntaxError/0tests) → PRODUCT autor altera só run.mjs → commitclean → A(dosdoisarquivosinteiros) serve GREEN, semnarrowGREENredundante → B/C/D eS18AFTER nosdoisNodes. SemnecessidadedePuresourceTransformS19: os próprios commits limpos de TESTePRODUCT dão antes/depois; RootcontrolaCLI, autorinvocaexatoscomandos. PreservarSourceS17/S18evidências/hashhistóricos.

Namespaceimport adicional do módulo no teste evita namedimport inexistente abortar o RED. C34l afirma contrato renameRetrying existe no corpo do teste antes de chamar; C34k discrimina a recuperação real5→0 e guardas com os critérios já decididos. O helper compartilhado interno recebe beforeAttempt/retryable/wait(defaultsleep); eventual namedexportécontrato do módulo privado usado pelas provas, semnovaopçãoCLI/runIntegrationCommand. Testes de camada verificam callbacks/erro/ordem/delays literais; testes de fronteira verificamfilesystem/foreignbytes/hashes/manifest/lock. Não escrever expectativa derivando da mesma constante de implementação. Nenhum teste antigo removido/relaxado, nenhuma pausa nova de produto foraWindowsDirpolicy, nada rebaixado paraaprovar.

### Landing S19 após READ, antes de TEST/PRODUCT

Root leu integralmente o relatório READ do autor. D1–D7 aceitos, com duas precisões: o predicado retryable é avaliado também no sétimo erro pelo laço existente (`!retryable(error) || retry === length`); G1 espera E1–E7, não E1–E6. Isso preserva a ordem atual, sem alterar a política. dev e ino precisam ser BigInt válidos (dev não negativo, ino positivo); testar ausência/tipo inválido além de ino zero, sem exigir dev positivo (zero pode ser válido).

K11a deve substituir a raiz por diretório REAL que contenha também `.skill-me/hermes.lock` com bytes idênticos ao lock movido. A liberação atual compara caminho real e bytes, não identidade, portanto NÃO basta declarar withLock inalterado como garantia. O autor decide a menor composição interna para estender a guarda de identidade da promoção à liberação do lock e aos efeitos da pasta de estado, exclusivamente quando Hermes promove artefatos; os consumidores de arquivos mantêm a sequência de operações antiga. Prova adicional: pasta `.skill-me` real substituída com lock idêntico durante a recusa; nenhum unlink/leitura por alias da pasta alheia, lock próprio preservado no local movido, conflito do lock segundo prioridade existente. Alternativa rejeitada: remover o lock alheio de bytes idênticos ou alterar todas as rotas de arquivos. Não expor nova opção pública. Limite TOCTOU permanece declarado.

### Landing S19 F1 — raiz reconferida antes de criar plugins

Revisão Root do primeiro produto S19, antes de GREEN: rootSame é capturada, mas o ramo plugins ausente chama apenas rootUnchanged (realpath) antes de mkdir. Cenário controlável: o lstat BigInt de .skill-me devolve os metadados próprios e troca a raiz por outra pasta REAL com lock idêntico; realpath mantém a mesma string e o mkdir cria plugins alheia antes da guarda de identidade posterior recusar. Corrigir a conferência de identidade antes desse efeito, preservando a ordem dos conflitos legados. Prova nova I4-C34m com troca dentro do retorno de lstat, raiz substituta sem plugins, fotografia alheia intacta, nenhum mkdir/leitura/unlink por alias e locks próprios/alheios preservados. Autor escreve a prova primeiro; RED em P0 (primeiro produto, ainda com F1) e depois correção pontual, GREEN no A completo. Não é CAS nem garantia contra troca posterior à última guarda. Alternativa rejeitada: aceitar a pasta alheia criada, testar apenas a troca na espera de retry ou enfraquecer a fotografia. Testes anteriores e C1–C50 intactos.

Orçamento retificado por medida Root de todos os tool_result públicos e prompts até RED:317528chars/2,5=127012tokens estimados, incluindo saídas de execução e prefixos; escrita própria não é leitura. A estimativa autoral150k fica no histórico. Produto acrescentou leituras pontuais explicitadas no relatório (a frase final “nenhum Read/Grep de Source” contradiz as próprias linhas que as listam e será retificada). Teto150k de leitura mantido; reserva20k era previsão, não autorização de ultrapassar o teto. Recontar fases adicionais antes de liberar execução; mesma S19 inteira com autor atual.
