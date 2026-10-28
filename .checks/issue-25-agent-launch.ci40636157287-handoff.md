# CI 40636157287 (Windows): diagnóstico das duas falhas e decisão pendente

Estado em 28/10/2026: **diagnóstico concluído, nenhuma correção implementada.**
- **HEAD**: `9244eea`, com o Verifier 12 PASS 48/48 e a formal 7 `ready` 8/8 preservados; merge não
  feito.
- **Causa**: não demonstrada. Duas classes de saída que o contrato admite reproduzem a mensagem
  exata das duas falhas.
- **Produto**: nenhum defeito demonstrado. A #25 não muda as operações dos produtores envolvidos.
- **Decisão pedida**: fechar a CI exige mudar algo fora das autorizações vigentes (ambiente do
  runner, workflow, contrato ou política de merge), e isso cabe ao proprietário.

## Evidência

Fonte: `.checks/code-review/issue-25/ci40636157287-windows.tail.txt`, os últimos 120.000
caracteres do log do job Windows (Node 24.13.0, npm 11.6.2).

- **Job**:
  - Ubuntu e macOS passaram. No Windows, o doctor deu 417 (410/0/7).
  - As integrações, das 05:10 às 05:17:53 UTC, tiveram 567 testes, 541 pass, **2 fail**, 24 skip,
    em 473.250,7 ms, com exit 1.
  - O orçamento de 20 min foi respeitado: o resultado é `failure`, não cancelamento.
  - Arquivos das duas provas: zero diff em `63621c6..9244eea`.
- **I23-C4** (`tests/integrations/observe/control.cli.test.mjs:809`, erro na `:838`, 832 ms):
  - **Sintoma**: `listCaptures` (o `privacy list` de `automaticOf`) respondeu
    `{"…","command":"list","status":"error","error":{"code":"lock_present"}}`, com `4 !== 0`.
  - **Momento**: logo depois de o produtor em processo (`createAutomaticDelivery`) fazer `open`,
    `submit` e `settle`, com um `on` em voo parado.
  - **O que o log não diz**: qual das duas linhas da tabela falhou. O relatório do produtor
    (`opened`) não é impresso, porque a asserção que o compara vem depois.
- **T8-C11** (`tests/integrations/traces/query.cli.test.mjs:167`, erro na `:194`, 3.330 ms):
  - **Sintoma**: `export: {"…","command":"export","status":"error","error":{"code":"lock_present"}}`,
    com `4 !== 0`.
  - **Fase**: a `active`. Na `stopped`, o `privacy stop` da `:192` teria encontrado o lock antes.
  - **O que o log não diz**: antes do export rodaram quatro produtores em processos reais — hook
    Claude, ingest Hermes, wrapper com Codex falso e hook Claude —, e a prova só confere o status 0
    deles, não o relatório de entrega.
- **Nesta mesma CI, passaram**:
  - o I23-C10, os dois C47, o T8-C15 e os três C46;
  - o T8-C2, com a entrega mais lenta em 204 ms e a operação mais lenta `open lock` com 61 ms (uma
    entrega saudável típica leva ~70 ms inteira, `:719-721`);
  - os diagnósticos de prazo do T8-C16 (`:688-701`), com 650 a 705 ms.
- **CI anterior (40514323240)**: no C46, os dois produtores pararam na criação do `.lock` por mais de
  ~620 ms (`.checks/issue-25-agent-launch.ci40514323240-handoff.md`).

## O que está demonstrado

1. **Quem pode ter deixado o lock** (leitura do código e das provas):
   - **T8-C11**: só os quatro produtores. O `privacy start` saiu com 0 antes deles e liberou o
     lock; o export só toma o lock para si.
   - **I23-C4**: só o produtor em processo. Em `pausedAt` (`control.cli.test.mjs:180-203`), a 1ª
     linha para o `on` **antes** de criar o lock da raiz, e a 2ª **depois** de removê-lo; nas duas, o
     `on` em voo não segura o lock da raiz na `:838`.
   - Com uma entrega saudável, o `settle()` só termina depois de a operação liberar o lock.
2. **Como um produtor deixa ou segura o lock depois de dar a entrega por encerrada.** Pelo código,
   o contrato admite três vias:
   - (a) **tentativa abandonada no prazo de 650 ms** com o lock tomado ou em criação
     (`delivery_timeout`). Num processo filho, o lock fica depois da saída
     (`docs/traces.md:491-495`); em processo, fica até a operação abandonada terminar.
   - (b) **liberação do lock que falha** (`io_failure`; o `unlink` não remove). A nova tentativa
     automática foi rejeitada na C43.
   - (c) **falha ao gravar os bytes do lock depois de criá-lo**: `writeExclusive` abre com `wx` e
     depois escreve, e o arquivo fica. É uma via só por leitura, do código da base (#5), sem
     controle.
3. **A #25 não mudou as operações desses produtores** (`ops-compare.mjs`, base `63621c6` × HEAD
   `9244eea`, com a pré-carga de tempos de cada um). Os resultados são idênticos:
   - hook vinculado, 2ª entrega (o caminho do T8-C11): 89 operações, 2 flushes, tomadas do lock com
     28 e 39 operações;
   - hook automático, 1ª entrega da sessão (o do I23-C4): 103 operações, 5 flushes, tomadas de 19 e
     53, e o mesmo `lstat ENOENT` esperado.

   O comando que falhou (`privacy list`, `privacy export`) usa a abertura de quem não cria, que em
   `f734441` manteve as mesmas operações.
4. **As vias (a) e (b), aplicadas a um único produtor, reproduzem as mensagens exatas da CI**
   (`symptom-controls.mjs`, cópia descartável do HEAD, só o ambiente ou o io de um produtor muda):
   - **T8-C11**, último hook com a pré-carga:
     - só a pré-carga: passa;
     - `STALL_SEGMENT=1` (via a): `export: {…lock_present}` na `:194`;
     - `LOCK_KEPT=2` (via b): a mesma mensagem na `:194`.
   - **I23-C4**, produtor em processo:
     - `createStoreIo()` puro: passa;
     - escrita do segmento atrasada 2 s, além do prazo (via a): `{…"command":"list"…lock_present}`
       na `:838`;
     - 2º `unlink` do `.lock` com EIO (via b): a mesma mensagem na `:838`.
5. **As duas provas não distinguem as vias.** Elas não conferem o relatório de entrega dos
   produtores, então o primeiro sintoma é o `lock_present` do leitor seguinte. O log não diz qual
   produtor nem qual via.
6. **O quadro das duas CIs.** Quatro falhas, só no Windows, todas em provas com produtores reais,
   lock e o prazo de 650 ms: I23-C10, C46 (a), I23-C4 e T8-C11. As duas primeiras são da CI anterior;
   as provas instrumentadas passaram nesta. Há evidência instrumentada de criação lenta do lock no
   runner: mais de 620 ms em dois processos na CI anterior, e 61 ms numa entrega saudável nesta.

## O que não se sabe

- Qual via, (a), (b) ou (c), e qual produtor, em cada uma das duas falhas. A duração de 832 ms do
  I23-C4 fica perto da via (b) nesta máquina (0,84 s, contra 1,5 s da via a), mas os tempos da
  máquina e do runner não são comparáveis; não é conclusão.
- Por que as operações de lock param ou falham no runner Windows. Não atribuo a antivírus, relógio,
  disco ou hardware.
- Onde ficam os scratches das provas no runner: o log não registra caminhos.
- A taxa, e se a suíte maior da #25 aumenta a frequência. Duas execuções não medem isso.

## Por que não há correção

Nenhum defeito do produto foi demonstrado. As três vias são o comportamento do contrato aprovado:
- #8: prazo de 750 ms e tentativa de 650 ms; nada além do lock ocupado é repetido; o agente não
  espera o disco; o lock pode ficar quando o processo sai durante a operação;
- C43: sem nova tentativa automática nem remoção automática do lock.

As provas antigas (#8 e #23) pressupõem que o runner não pare nem falhe nessas operações. Fechar a
CI exige uma destas mudanças, todas fora das autorizações vigentes: ambiente do runner, workflow
além dos orçamentos 20/10/5, contrato do produto (prazo, retry, perdas) ou política de merge. Mais
instrumentação por prova não fecha a CI e foi descartada pelo pedido.

## Proposta concreta (decisão bloqueante do proprietário; nada implementado)

**A — Medir antes de mudar o runner (recomendada).**
- **Onde**: um workflow novo, só por `workflow_dispatch`, sem rodar em PR ou push e sem entrar no
  `ci`, com um job `windows-latest` de `timeout-minutes: 10`.
- **O que roda**: um script versionado novo, `scripts/ci-lock-latency.mjs`. Ele usa o caminho real
  do lock do store (`holdLockFile` com `createStoreIo`, sem cópia de algoritmo) numa pasta de
  trabalho dada, com:
  - 3 processos de 2.000 ciclos cada, de tomada e liberação do lock;
  - 3 processos de carga gravando arquivos de 64 KiB com flush.

  Mede, por ciclo, a criação e a liberação, e os erros por código. Imprime a contagem acima de 600
  ms, p50, p99, máximo e os códigos.
- **Duas passadas no mesmo runner**: (1) com o `TEMP` padrão; (2) com a pasta em
  `${{ runner.temp }}`. Uma terceira, com exclusão do Defender só para essa pasta, entra só se o
  proprietário aceitar mexer no Defender do runner efêmero.
- **Regra de decisão, declarada antes**:
  - a passada (2) ou (3) zera as ocorrências acima de 600 ms que a (1) teve: adotar a opção B com
    ela;
  - as duas zeram: a carga sintética não reproduz, e a medida é inconclusiva; decidir entre B sem
    prova e D;
  - as duas têm ocorrências: a mitigação não ajuda; decidir C ou D.
- **Limites**: carga sintética não é a suíte; é uma execução, mas com milhares de amostras. Muda o
  workflow (arquivo novo) e acrescenta um script; a prova de governança pode precisar conhecer o
  arquivo novo.

**B — Adotar a mitigação direto no `verify` Windows.**
- **O que muda**: `TEMP` e `TMP` em `${{ runner.temp }}` no passo `npm run test:integrations`, e,
  se aprovado, a exclusão do Defender para essa pasta. Orçamentos, passos, comandos, matriz, prazos
  e carga iguais.
- **Efeito esperado**: na próxima CI, nenhum `lock_present` ou `delivery_timeout` nas provas com
  produtores reais. Se voltar a ocorrer, as provas instrumentadas dizem a operação.
- **Limites**: a hipótese não é demonstrada, e uma CI não mede taxa.

**C — Contrato: nova tentativa limitada na liberação do lock.**
- **O que muda**: repetir o `unlink` do próprio lock dentro do prazo da tentativa, só para `EBUSY`
  e `EPERM`.
- **Alcance**: só cobre a via (b), cuja ocorrência não está demonstrada. Reverte uma rejeição da C43
  e muda o produto, com provas novas.
- Não recomendada sem evidência da via (b).

**D — Política: integrações do Windows informativas para o merge.**
- Muda a regra “merge só com todos os checks verdes”. Não recomendada.

**Descartadas**: rodar a CI ou o gate de novo até ficar verde; prazos maiores; menos paralelismo ou
carga; aceitar perdas; instrumentar mais provas uma a uma; atribuir a causa sem prova.

## Provas e limites

- **Comparação base × HEAD** (`ops-compare.mjs`, Windows, Node 24.22.1): resultados idênticos
  (`ops-compare-win-24.22.1.txt`).
- **Controles de sintoma** (`symptom-controls.mjs`, Windows, Node 24.22.1): seis execuções, uma por
  variante; os controles saudáveis passam, e as vias (a) e (b) reproduzem as duas mensagens
  (`symptom-controls-win-24.22.1.txt` e um `.spec.txt` por variante).
- **Limites**: os controles mostram que as vias bastam para o sintoma, não que ocorreram na CI. A via
  (c) não foi exercitada. Nenhuma CI, gate, Verifier, revisão, push ou merge foi executado.
- **Artefatos**: em `.checks/code-review/issue-25/builder-ci40636157287/` (pasta ignorada), sem
  caminhos pessoais nos documentos.
