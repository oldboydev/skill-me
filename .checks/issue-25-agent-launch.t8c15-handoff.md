# T8-C15: proposta de ampliação pontual da issue #25

**Atualização em 27/10/2026: proposta autorizada.** O proprietário respondeu “Autorizar ajuste pontual e
10ª verificação” ([comentário 6440482031](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6440482031)),
à proposta do comentário 6435260406 e deste arquivo (`a718865`). A issue ganhou o AC7 (contexto em
`.checks/code-review/issue-25/context-ci28-verifier10-approved.json`, 18 comentários e 7 ACs); a task
ganhou o critério 38 e o checklist o C46 e a linha “Diagnóstico do T8-C15” do Landing, antes do
código. O Verifier 10 é do orquestrador, depois das provas do autor; o teto formal continua 6, com 5
consumidas. O texto abaixo é o da proposta, preservado como foi escrito; o estado da implementação
fica na seção “Estado da implementação”, no fim.

Estado em 27/10/2026: **proposta não autorizada e não implementada**. O PR #28 aguarda.
A nona verificação está preservada como FAIL em `4e66de2`; a sexta revisão ainda não foi executada.

## Evidência

- Em `dd89179`, os 45 checks da #25 passaram; alvo102 em Windows24.22.1, WindowsCI24.13.0 e WSL24.13: 96 pass/0 fail/6 skips cada.
- O gate completo único teve994 testes:973 pass/1 fail/20 skips. Os12 nativos Hermes e os97 casos I25 passaram.
- T8-C15 (`tests/integrations/traces/concurrency.cli.test.mjs:107`): A confirmou40; B informou40 entradas,20 confirmadas/gravadas,20 perdidas e `io_failure`. O export posterior não rodou, portanto não se sabe se as20 sem confirmação ficaram no disco. Não há errno/operação nos artefatos; também não se sabe quantos lotes falharam.
- Comparação `63621c6..dd89179`: o caminho de E/S da captura manual não mudou. As diferenças aplicáveis são seleção de vínculo por variáveis e validação pura de formato, que dão o mesmo resultado nesse caso. Os módulos complementares (CLI, adapter Hermes, line-reader, policy, lifecycle, delivery-report e fs-adapter) também não têm diff. Isso não elimina influência de carga/ambiente nem demonstra a causa.
- `.checks/issue-23-observacao-on-off.build.md:546-572` registra `io_failure` em T8-C15 na base `a2400c3`, anterior à #23. O experimento foi interrompido e não mede taxas nem prova a mesma causa.
- Auditoria externa de metadados do perfil WSL, antes da R9 até o fim das provas:12113 entradas, zero diferenças/erros. Não é auditoria de conteúdo nem reparação do incidente da R5.

## Escopo proposto para decisão do proprietário

Incluir nesta entrega o diagnóstico e, se demonstrado um defeito, sua correção mínima no caminho do T8-C15 **dentro dos contratos existentes**. Não há autorização implícita neste arquivo.

Primeira alteração concreta: só a prova antiga e seus apoios necessários, reaproveitando `timedEnv`, `timingLines`, `deliveryTiming` e `describeTiming`. Um arquivo de tempos por produtor; a pré-carga existente acumula as operações e grava na saída. Antes da asserção, formar evidência sem lançar erro:
- operação, tipo de arquivo e código de erro de cada produtor, sem caminhos, conteúdo, chaves ou ambiente;
- relatórios dos dois produtores; contagens por produtor no export, contadores do status e estado de segmentos/temporários/lock;
- se a própria inspeção falhar, registrar sua indisponibilidade/código, sem inventar estado.

A asserção saudável continua falhando se houver perda:40/40/40/0/null para cada produtor,80 eventos únicos, dois produtores realmente sobrepostos, segmento coerente, os pares de hooks e a recusa com lock alheio. Só a mensagem ganha diagnóstico.

Provas do diagnóstico devem distinguir falha anterior ao commit de confirmação perdida após commit, usando as injeções já existentes e testemunhando que ocorreram; a falha original continua sem causa atribuída. A instrumentação pode alterar ligeiramente o tempo: essa limitação precisa constar.

Investigação inicial finita: controles discriminantes e **uma** execução completa instrumentada do gate atual, com Node24.22.1 e teto8, preservando qualquer falha. Sem seis suítes A/B diferentes e sem repetir até verde. Se não reproduzir, registrar o limite; não chamar instrumentação de correção da causa.

Uma correção de produto só poderá seguir se a causa estiver demonstrada e o contrato permanecer intacto. Não autoriza novas tentativas de E/S, ampliar prazos/tolerâncias, aceitar perdas, serializar os produtores, reduzir o teto8, mudar workflows/host/runtimes ou criar issues. Se exigir decisão de produto, retornar ao proprietário com o caso concreto.

## Verificação e entrega propostas

Após mudanças e provas do autor, solicitar nesta mesma decisão **uma10ª verificação independente**, exclusiva da #25, com as nove anteriores preservadas. A sexta revisão formal já está autorizada e disponível; nenhum aumento formal é necessário. Não executar rodada10 antes da autorização humana.

PASS independente e ready do novo conteúdo continuam necessários antes do push. Merge do PR #28 segue a autorização vigente, condicionado a toda a CI verde. Nenhuma publicação do pacote.

## Estado da implementação

Em andamento: registro da decisão no plano e no checklist antes do código. Provas, comandos e a
execução completa instrumentada entram aqui e em `.checks/issue-25-agent-launch.build.md`.

Atualização em 27/10/2026, depois das provas do autor (detalhes, comandos e logs nas seções
“Diagnóstico do T8-C15” e “Primeira criação concorrente do store” do build):

- Registro antes do código em `b7ad0f3`; instrumentação e as três provas I25-C46 em `710076e`, só na
  prova. RED na prova antiga: falha antes do commit e confirmação perdida davam a mesma mensagem.
  GREEN 4/4 (a primeira tentativa falhou só pela minha comparação da mensagem do Node, que anexa o
  diff); duas mutações detectadas; arquivo de concorrência 13/13 em Windows 24.22.1, Windows 24.13.0 e
  WSL isolado.
- Execução completa instrumentada em `710076e` (a única desta investigação): `npm test` com **exit
  1**, 997 testes, 976 pass, 1 fail, 20 skip. O T8-C15 e os C46 passaram; a falha da R9 não se
  reproduziu (limite, sem taxa). A única falha foi o I25-C32: B saiu com `store_invalid` na primeira
  criação do store da raiz. O processo do CLI do autor ficou aberto depois do relato; o orquestrador
  encerrou só o PID 117484, depois do gate e do relato, sem interromper testes nem descartar logs.
- Causa do C32 reproduzida com o io injetado, também na base: o marcador do store, conferido antes do
  lock, era lido no meio da criação por outra abertura. Correção no escopo original da #25, com os
  contratos mantidos: registro em `8e8893b`, correção e provas em `f734441` (RED 5/5, GREEN 5/5, três
  mutações detectadas).
- Alvo completo da #25 mais concorrência em `f734441`: 120 testes, 114 pass, 0 fail, 6 skip de
  plataforma em Windows 24.22.1, Windows 24.13.0 (clone novo com `core.autocrlf=true`) e WSL isolado;
  `npm test` completo: **exit 0**, 1.002 testes, 982 pass, 0 fail, 20 skip, com os 12 nativos do Hermes.
- A causa da falha da R9 continua desconhecida; a instrumentação não a corrige. Pendentes: Verifier 10
  e revisão formal 6, do orquestrador.

Atualização depois do Verifier 10 (FAIL em `df259ed`, relatório em `788d160`; gate D não iniciado):
a única falha foi o diagnóstico de C32 no WSL isolado, por um defeito do apoio de prova
`withOverlappingRuns` — a coleta leu uma captura ainda sem `state.json`, lançou `ENOENT` antes de
liberar as barreiras e mascarou o erro original. O T8-C15, os C46 e o produto não estavam envolvidos.
Registro em `3328317`, correção e prova em `619c8e0` (RED com o mesmo sintoma, GREEN 3/3, duas
mutações detectadas). Alvo completo com concorrência (122 testes) com 116 pass, 0 fail, 6 skip nos três
ambientes; `npm test` completo com **exit 0**, 1.004 testes, 984 pass, 0 fail, 20 skip. Pendentes: o
próximo Verifier e a revisão formal 6, do orquestrador.

