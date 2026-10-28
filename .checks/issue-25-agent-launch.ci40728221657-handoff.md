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
