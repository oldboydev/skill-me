# CI 40709943742 e execução manual 40710014746 do PR #28 — entregas T8 no Windows (handoff pontual, 28/10/2026)

Escopo: as autorizações 6467154706 (“Pode fazer a medição comparativa. Mantém os testes e prazos e segue
até a CI ficar toda verde para fazer o merge do PR #28.”) e “Pode fazer quantas precisar”. É
diagnóstico necessário do mesmo trabalho de CI, só em provas e apoios de prova. Produto, prazos,
quantidades, ordem, concorrência, workflow, core e configuração não mudam.

## O que falhou

- **PR 40709943742**, Windows, job 122892318605: integrações 567, com 540 pass, 3 fail e 24 skip.
  - **T8-C8** (`live-capture.cli.test.mjs:441`): o ingest Hermes de 1 registro saiu com
    `delivery_timeout` 1/0/0/1.
  - **T8-C14** (`query.cli.test.mjs:217`): o hook Claude saiu com `delivery_timeout`.
  - **T8-C18** (`replay.unit.test.mjs:41`): `privacy stop` saiu com 4 `lock_present`.
- **Manual 40710014746**, matriz regular, job 122892590221: 542 pass e 1 fail.
  - **T8-C3** (`:198`): o ingest Hermes de 9 registros saiu com `delivery_timeout` 9/0/0/9.
- Os logs integrais estão em `.checks/code-review/issue-25/ci767-windows-*.log`. São provas antigas da
  #8, sem diff na feature, e cada uma passou na outra execução.

## O que se sabe e o que não

- **Uma classe só**: os quatro produtores usam a captura manual. A 1ª tomada do lock é a abertura e a
  2ª grava o lote. A primeira tentativa não terminou em 650 ms. Quando ela já tinha o lock, o
  `process.exit(0)` do CLI a encerrou e o lock ficou, como o contrato prevê. É a mesma classe das CIs
  40514323240 e 40636157287.
- **Medição do orquestrador** (job 122892425130): nenhuma operação ≥ 600 ms isolada. Isso não dá a
  causa.
- **Não se sabe**: qual operação parou, em que tomada, se o laço de eventos estava livre ou parado, nem
  quem deixou o lock no T8-C18. As provas rodavam os produtores sem a pré-carga de tempos, e a
  pré-carga só registrava as operações concluídas.
- **Causa**: desconhecida. Nenhum defeito foi demonstrado e nenhuma correção foi feita.

## O que muda para a próxima CI (código `51679df`; registro antes do código em `4d3b1d9`)

- **A pré-carga de teste** passa a registrar:
  - as operações em curso na saída, com a idade;
  - a saída e o início do processo, o `pid`;
  - o atraso do laço de eventos (`monitorEventLoopDelay`).
- **T8-C3, T8-C8, T8-C14 e T8-C18** rodam cada produtor com a pré-carga. As asserções são as mesmas, e
  só na falha a mensagem traz, por produtor:
  - o relatório;
  - as falhas e as operações em curso, com a tomada e a idade;
  - a última concluída;
  - o processo e o laço.

  Da captura, traz o status, os segmentos e temporários, e o lock com o dono pelo `pid`. Nunca traz
  caminho, ID, chave, conteúdo nem ambiente.
- **Como ler** (mensagens reais em `builder-ci767/sample-messages-win-24.22.1.txt`):
  - operação em curso com o laço livre aponta o disco ou o sistema, e a tomada diz se foi a abertura
    ou a gravação;
  - laço com atraso igual ou maior que a operação, e CPU parecida, aponta o processo parado ou sem
    CPU;
  - o `iniciado <ISO>` deixa correlacionar falhas de arquivos diferentes na mesma janela;
  - `lock presente, de <produtor>` diz quem deixou o lock.

## Provas (detalhes no build, seção “CI 40709943742 e execução manual 40710014746”)

- **RED**: as provas antigas, com a mesma injeção, dão só as mensagens das CIs.
- **GREEN**: os três arquivos T8 deram 18/17/0/1.
- **Mutações**: as 6 foram detectadas.
- **A/B/C**: o alvo afetado de 8 arquivos deu 80/74/0/6 (A e B) e 80/76/0/4 (C).
- **D**: o `npm test` completo saiu com exit 0, 1.029/1.009/0/20, com os 12 nativos.

## Pendente, com o orquestrador

- as rodadas 17/11;
- a publicação;
- a próxima CI.

Se um T8 falhar de novo, a mensagem dela traz os dados acima para decidir. Nada aqui afirma CI verde,
medição nova, `ready` nem causa corrigida.
