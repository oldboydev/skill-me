# CI 40728221657 e execução manual 40728249484 do PR #28 — evidência comum dos produtores (handoff pontual, 28/10/2026)

Escopo: as autorizações 6467154706 (“Mantém os testes e prazos e segue até a CI ficar toda verde para
fazer o merge do PR #28.”) e 6442514838 (“Pode fazer quantas precisar”). É diagnóstico necessário do mesmo
trabalho de CI, só em provas e apoios de prova. Produto, prazos, quantidades, ordem, concorrência,
workflow, core e configuração não mudam.

## O que falhou (HEAD `93bd1e9`)

- **PR**, job 122957292934: integrações 571, com 546 pass, 1 fail e 24 skip.
  - **I23-C4** (`control.cli.test.mjs:976`): o hook Claude **CLI** da rota automática saiu com
    `delivery_timeout` 1/0/0/1, sem dado de E/S. É processo filho; os produtores em processo do mesmo
    arquivo foram o sintoma da CI 40636157287.
- **Manual**, job 122957402134: integrações 571, com 544 pass, 3 fail e 24 skip.
  - **T8-C12** (`follow.cli.test.mjs:59`): `0 !== 1`, sem o código da entrega.
  - **T8-C13** (`:90`): `stop` com `lock_present`.
  - **T8-C2** (`live-capture.cli.test.mjs:178`): `delivery_timeout`, com a mensagem do formatter legado,
    que contava só as concluídas (72, `open lock` de 339 ms, “flush nenhum”).
- Os quatro controles de `51679df` passaram nas duas: as falhas vieram de produtores sem a evidência.

## O que se sabe e o que não

- **Causa**: desconhecida. Nenhum defeito do produto demonstrado, o que não equivale a afirmar que não há.
- **Mapa local** do T8-C2 saudável: no `session_end`, a 73ª operação por início é o 1º flush (`sync
  segmento.tmp`, 2ª tomada). Isso é compatível com as 72 concluídas e “flush nenhum” da CI, mas não mostra
  a operação em curso.
- **Medição do orquestrador** (job 122957247705): nenhuma amostra ≥ 600 ms. Não é o caminho das entregas e
  não dá causa.

## O que muda para a próxima CI (registro `48b191a`; código `fa2c8eb` e `60bbda8`)

- **Formatter comum** (`describeTiming`), usado pelo T8-C1/C2, T8-C15/C16 e I23-C10, passa a mostrar o que a
  pré-carga já grava:
  - as operações em curso na saída, com o lugar e a idade;
  - o início, a 1ª operação, a última conclusão e a saída;
  - o laço de eventos.

  As concluídas ficam separadas do total, e dado ausente sai “não registrado”, nunca 0.
- **Registro por teste** nos sete arquivos com produtores vermelhos nas CIs do PR (`control.cli`,
  `follow.cli`, `live-capture.cli`, `query.cli`, `replay.unit`, `concurrency.cli`, `agents.e2e`):
  - todo produtor iniciado pelos apoios leva a pré-carga;
  - o produtor em processo é medido pela injeção pública de `io`;
  - quando um teste falha, o **mesmo** erro sai com a evidência de todos os produtores (relatório, tempos,
    pendentes, processo, laço) e das raízes deles (lock com o `pid` coincidente, capturas, pasta).

  Não traz caminho, ID, chave, conteúdo nem ambiente. As outras 30 consumidoras rodam como antes.
- **Como ler**: uma operação em curso com o laço livre é compatível com uma espera de E/S ou do sistema; o
  laço parado, com o processo parado ou sem CPU. A coincidência de `pid` no lock não prova quem o deixou.
  São evidências, não a causa.

## Provas (detalhes no build, seção “CI 40728221657 e execução manual 40728249484”)

- **RED**: as provas de `93bd1e9`, com a mesma injeção, dão só as mensagens das CIs.
- **Mutações**: as 10 foram detectadas.
- **A/B/C**: o alvo de 38 arquivos deu:
  - A: 333/321/0/12;
  - B: 333/314/**7**/12;
  - C: 333/312/**1**/20.

  Os 20 I25-C46/C47 passaram nos três.
- **Falhas do B e do C**, de provas da #4 e não desta entrega; registradas, sem correção nem repetição:
  - **B**: as nativas do Hermes e o I4-C35. O `fs.cpSync`/`rmSync` do Node 24.13.0 no Windows, com “ação” no
    caminho, não copia nem remove e não dá erro. Reproduz em `93bd1e9`; na CI as nativas são puladas.
  - **C**: o I4-C36 mediu 209 ms por `Date.now()`, contra ≥ 2.358 ms monotônicos. É compatível com um recuo
    do relógio do WSL, não demonstrado.
- **D**: o `npm test` completo saiu com exit 0, 1.040/1.020/0/20, com os nativos do Hermes.

## Pendente, com o orquestrador

- o Verifier 19 e a formal 12;
- a publicação;
- a próxima CI;
- decidir se as falhas pré-existentes do B (Node 24.13.0 local) e do C (I4-C36 no WSL) pedem trabalho
  próprio.

Nada aqui afirma CI verde, `ready` nem causa corrigida.

## Continuação: correções da harness dos gates B e C (mesma sessão de autor)

- **Preservado**: os gates de `60bbda8` (A 333/321/0/12, B 333/314/7/12, C 333/312/1/20) e o ciclo de
  `c0d61d7` (A 343/331/0/12, B 343/330/1/12 com o T8-C4). C e D não rodaram em `c0d61d7`.
- **B**, causa demonstrada: no Windows, com o Node 24.13.0 e “ação” no caminho:
  - o `cpSync` grava a cópia num irmão `aÃ§Ã£o` e deixa o destino pedido ausente;
  - o `rmSync` não remove.

  Nenhum dos dois lança. A preparação da fixture Hermes passa ao `cp`/`rm` de `node:fs/promises`, o
  substituto já documentado no repositório, sem `force`, nas duas provas demonstradas. Controle C40 com
  bytes exatos.
- **C**, causa demonstrada pela comparação das mesmas chamadas: o relógio civil do WSL recua ~1,8 s a cada
  ~30 s, e 28 de 349 chamadas mediram 53–1.499 ms contra ~2.060 ms monotônicos. O `collect` passa ao
  `performance.now()`; a faixa 1.900/6.000 e o prazo de 2.000 ms não mudam. Controle (l).
- **Evidência**: o B de `c0d61d7` mostrou que só 1 das 3 linhas da pré-carga de um produtor saía. Agora
  saem os processos da árvore, e o lock ilegível vem com o tamanho. Controles (m)–(n).
- **Gates finais em `cd4afc2`**, com o temporário isolado por execução:
  - A: 345 testes, 333 pass, 0 fail, 12 skip;
  - B: 345 testes, 332 pass, **1 fail**, 12 skip;
  - C: 345 testes, 325 pass, 0 fail, 20 skip;
  - D: exit 0, 1.044/1.024/0/20.
- **A falha do B final** é o T8-C16, pré-existente na main. O timer do prazo de `untilDeadline` dispara até
  ~1 ms antes do `performance.now()`, e uma 4ª tentativa começa e é abandonada sem gravar. Foi reproduzido
  em 13 de 400 rodadas no 24.13.0 e em 15 de 400 no 24.22.1. Não foi corrigido nem repetido; decisão do
  coordenador.
- **Limpeza**: por caminho exato. A limpeza anterior (1.257 + 107 pastas, por janela) não teve auditoria de
  propriedade. Cinco pastas sem prova de proveniência ficaram, listadas no build.
- A causa histórica dos `delivery_timeout` no Windows continua desconhecida.

## Continuação: abandono terminal no prazo da entrega (nova sessão de autor)

- **Escopo**: só os defeitos de prazo/abandono de `untilDeadline`, decididos pelo coordenador; não é
  manutenção geral da #8. Registro antes do código em `9b39d7e`; código em `322bcad`; registro dos gates
  em `dc0db9b`.
- **Defeito 1, demonstrado** (o T8-C16 do B final, `4 !== 3`): depois de uma recusa concluída do lock, o
  timer abandonava a repetição com o motivo `lock_present`, e o laço iniciava outra tentativa enquanto o
  relógio ainda estava aquém do prazo.
- **Defeito 2, candidato confirmado antes da correção**: o lock obtido com o relógio já no prazo, antes de
  o callback do timer rodar, era aceito e a entrada era gravada e confirmada.
- **Correção**: o `onLock` recusa o lock com o prazo esgotado, e a tentativa abandonada encerra a entrega
  com o motivo do prazo — nunca `io_failure` nem uma nova tentativa. Prazos, store e códigos iguais.
- **Provas**:
  - RED com o produto de `a6a829e`: `3 !== 2` e `{ok: true}` no unit; `4 !== 3` e o commit 1/1/1/0 no
    store;
  - GREEN; 3 mutações detectadas;
  - a sonda do autor anterior sobre o código novo deu 0/400 com 4 criações (observação).
- **Gates**: A 363/351/0/12, B 363/351/0/12, C 363/343/0/20.
- **D vermelho e preservado**: exit 1. O arquivo `codex-run.cli.test.mjs` parou depois do I4-C16 por
  ~34 min e falhou inteiro, sem resultado do I4-C16c e do I4-C17. Esse caminho não carrega o produto
  mudado, e a causa é desconhecida. Não foi repetido nem corrigido.
- A causa histórica dos `delivery_timeout` no Windows continua desconhecida. Nada aqui afirma PASS,
  `ready` nem CI verde.

### Retificação do D desta continuação (aditiva)

O D de `dc0db9b` não terminou sozinho. O coordenador interrompeu só o processo parado do
`codex-run.cli.test.mjs` (PID 149528, 18:21:49; `builder-t8c16-terminal/coordinator-D-stall.json`, escrito
antes). O D fica **incompleto, interrompido para diagnóstico**: não é PASS nem falha do produto. Onde se lê
“D vermelho” acima, leia D interrompido. O candidato, na harness do I4-C16c, é o `end` do stdout perdido
quando o EOF chega antes do `exit`. Ele é reproduzido e corrigido na continuação seguinte, sem ser
chamado de causa confirmada da parada.

### Consumidor lento do I4-C16c (continuação do mesmo autor)

- **D de `dc0db9b`**: incompleto, interrompido pelo coordenador; não é PASS nem falha do produto.
- **Harness**: o consumidor lento do I4-C16c passa a esperar o `exit` e o fim do stdout em qualquer
  ordem. Registro antes do código em `fc5155b`, harness em `68f84c4` e gates em `0ae940a`. Produto,
  carga, prazos e asserções não mudaram.
- **Provas**:
  - RED determinístico com a lógica anterior extraída sem mudança: pendente depois do `exit`;
  - GREEN; 2 mutações detectadas;
  - uma observação descartável mostrou que o `end` perdido deixa o processo do arquivo parado, com o
    mesmo relatório do D quando terminado de fora.
- **Gates em `0ae940a`**: A 365/353/0/12, B 365/353/0/12, C 365/345/0/20 e D com exit 0,
  1.054/1.034/0/20, com os nativos do Hermes.
- A ordem dos eventos no D interrompido não está demonstrada, e as causas históricas continuam
  desconhecidas. Próximos passos com o coordenador: Verifier 19, formal 12, CI e merge.

### Prova da 3ª linha do C46 (m) (novo autor, depois do FAIL 19)

- **FAIL 19 preservado** (`5ee0e0f`, relatório em `67a459b`): 49/50, só o C46 (m). O literal põe o pendente e o
  `pid` do lock na 3ª linha (`processo 3 de 3`); a prova os punha na 1ª. Os gates da R19 passaram, sem teste
  vermelho.
- **Decisão do coordenador**: fortalecer a prova. O caso da 1ª linha fica intacto, e um caso novo cobre a 3ª,
  com valores literais. A retificação documental (3ª → 1ª) foi abandonada, porque deixaria passar uma montagem
  que desse sempre `processo 1 de n`.
- **Fronteira**: só `tests/integrations/traces/evidence.unit.test.mjs`. Produto, apoios, workflow e prazos não
  mudam.
- **Proveniência** (`coordinator-r19-observations.json`): depois do D de `0ae940a`, a comparação de skips gravou
  `/tmp/d4.skips` e `/tmp/d-old.skips` pelo Git Bash, isto é, no temporário do usuário Windows.
  - Não há inventário anterior: não se prova que eram nomes novos nem que nada foi substituído. Também não há
    evidência de arquivo alheio sobrescrito.
  - Não são o `/tmp` do WSL nem o perfil, e a auditoria metadata-only do root não os cobre.
  - Não foram lidos, limpos nem restaurados.
  - As raízes por gate são outra coisa: foram conferidas e removidas por caminho e `ino`.
- **Prova** (registro `0954d3e`, código `2473632`, só o arquivo de teste, +34/−0):
  - GREEN 9/9;
  - numa cópia própria, sem mutação, 9/9;
  - com um único mutante do apoio, que dá sempre `processo 1 de n` ao dono do lock, 8/1: o caso da 1ª passou e o
    novo falhou na asserção de `processo 3 de 3`.
- **Identidade**: fora de `.checks`/`.tasks`, só esse arquivo mudou desde `5ee0e0f`; 42 dos 43 da lista do R19
  ficam como carry do Verifier 19.
- **Gates**: A/B/C só nesse arquivo e um D completo, definidos antes de rodar.
