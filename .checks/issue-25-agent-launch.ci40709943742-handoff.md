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

- **O que os logs mostram**:
  - T8-C3, T8-C8 e T8-C14: só os relatórios de entrega, com `delivery_timeout`;
  - T8-C18: só o `privacy stop` com `lock_present`, sem nenhum relatório de entrega anterior, porque a
    prova só confere o status dos produtores.

  Os logs não dizem qual operação ou tomada do lock estava em curso, nem quem deixou o lock.
- **Mecanismos compatíveis** com o código e o contrato, não demonstrados nestas falhas:
  - Os quatro produtores usam a captura manual: a 1ª tomada do lock é a abertura e a 2ª grava o lote.
  - Pelo código, `delivery_timeout` é a tentativa que não terminou até o prazo de 650 ms da entrada.
  - Um lock deixado por uma tentativa abandonada é um caminho previsto pelo contrato: o
    `process.exit(0)` do CLI encerra o que estava em curso, e `docs/traces.md` descreve o lock que fica.
    No T8-C18 isso explicaria o `lock_present`, mas o log não mostra qual produtor nem qual tentativa.
    Outras vias que o contrato admite (por exemplo, uma liberação que falha) também são compatíveis.
  - Os sintomas são do mesmo tipo dos das CIs 40514323240 e 40636157287, o que não prova uma causa
    comum.
- **Medição do orquestrador** (job 122892425130): nenhuma operação ≥ 600 ms numa carga sintética
  isolada. Ela não dá a causa nem aponta um recurso.
- **Não se sabe**: qual operação parou, em que tomada, se o laço de eventos estava livre ou parado,
  nem quem deixou o lock no T8-C18. As provas rodavam os produtores sem a pré-carga de tempos, e a
  pré-carga só registrava as operações concluídas.
- **Causa**: desconhecida. Não há defeito demonstrado, o que não equivale a afirmar que não há
  defeito. Nenhuma correção foi feita.

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

  Da captura, traz o status, os segmentos e temporários, e se o lock está presente. Quando o `pid`
  gravado no lock coincide com o `pid` registrado pela pré-carga de um produtor, traz o rótulo desse
  produtor. Nunca traz caminho, ID, chave, conteúdo nem ambiente.
- **Como ler** (mensagens dos controles em `builder-ci767/sample-messages-win-24.22.1.txt`; são
  evidências a interpretar, não diagnósticos prontos):
  - **Operação em curso com o laço livre**: é compatível com uma espera de E/S ou do sistema, e a
    tomada diz se ela estava na abertura ou na gravação. Isso não identifica disco, antivírus nem
    outro recurso específico, e não é causa.
  - **Atraso do laço igual ou maior que a operação, com CPU parecida**: é evidência compatível com o
    processo parado ou sem CPU. A correlação não prova qual recurso faltou.
  - **`iniciado <ISO>`**: permite comparar no tempo falhas de arquivos diferentes; uma coincidência
    não prova causa comum.
  - **`lock presente, de <produtor>`**: quer dizer só que o `pid` gravado no lock coincide com o
    `pid` registrado daquele produtor. Não prova sozinho que ele deixou o arquivo, porque o sistema
    pode reutilizar `pid`s.
  - **Limite**: a medição sintética do orquestrador (máximos de até cerca de 140 ms, nenhum ≥ 600 ms)
    não nomeia recurso nem causa e não serve de referência para atribuir a próxima falha.

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
