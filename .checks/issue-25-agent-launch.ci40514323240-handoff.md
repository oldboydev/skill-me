# CI 40514323240 (Windows): diagnóstico das duas falhas e decisão pendente

Estado em 27/10/2026: **diagnóstico concluído, nenhuma correção implementada.** O que os artefatos
demonstram não é um defeito do produto nem das provas dentro dos contratos aprovados, e cada saída
que tornaria a CI verde mexe em algo declarado vinculante: prazos de produto ou de prova, perdas,
retry, carga, paralelismo, teto 8, workflow ou limite do job. A decisão é do proprietário. HEAD do
diagnóstico: `d0d5a7f` (formal 6 `ready` 7/7 e Verifier 11 PASS 46/46, ambos preservados).

## Evidência

Fonte: `.checks/code-review/issue-25/ci40514323240-windows.tail.txt`, os últimos 120.000
caracteres do log do job Windows (Node 24.13.0, npm 11.6.2).

- **Job**: Ubuntu e macOS passaram. No Windows, o `npm run test:integrations` foi de 13:44:10 a
  13:52:09,9 UTC: 565 testes, 539 pass, **2 fail**, 24 skip, 479.157,9 ms, exit 1. O job começou
  por volta de 13:42 e chegou ao `timeout-minutes: 10` durante o pós-job.
- **I23-C10** (`tests/integrations/observe/agents.e2e.test.mjs:195`, “codex A 0”, fase sequencial,
  um hook de cada vez): `{automatic: true, code: "delivery_timeout", entries: 1, committed: 0,
  persisted: 0, lost: 1, unrouted: 0}` no lugar de 1/1/0. É a primeira entrega da sessão Codex A, que
  cria a captura dela. A prova antiga não instrumenta a entrega: não há operação nem código.
- **I25-C46 (a)** (`tests/integrations/traces/concurrency.cli.test.mjs:311-315`, falha antes do
  commit):
  - **Entrega**: `a` e `b` com `delivery_timeout` 40/0/0/40; saíram aos 974 e 975 ms.
  - **Operações**: 10 em cada produtor, em 28 e 22 ms da primeira à última; as mais lentas foram
    `realpath pasta` (23 ms) e `stat pasta` (19 ms). Nenhum flush, nenhuma falha e nenhum `EEXIST`.
  - **Captura**: lock presente, 0 segmentos, 0 temporários, export e status `lock_present`.
  - **Contexto**: a injeção em `b` (1ª promoção de segmento) não chegou a acontecer. No mesmo
    arquivo, o T8-C15 (3,95 s) e os outros dois C46 passaram.

## O que está demonstrado

1. **C46: onde os dois produtores pararam.**
   - **Sequência**: num produtor saudável com a mesma pré-carga, as 10 primeiras operações são as do
     `openStore` — `stat`, `realpath` e `lstat` da raiz e da pasta do store; `lstat`, `open`, `stat`,
     duas `read`, `stat` e `close` do `store.json`. A 11ª é `open lock`, a criação `wx` do `.lock`
     (`builder-ci40514323240/ops-sequence-win-24.22.1.txt`).
   - **Controle com a criação parada** (`stall-control-win-24.22.1.txt`, pré-carga descartável
     `stall-lock.mjs`):
     - com os dois parados **antes** de criar o lock, o quadro por produtor é o da CI (10
       operações, nenhum `EEXIST`, nenhuma falha, 40/0/0/40), mas o lock fica **ausente**;
     - com `a` criando o lock e a chamada sem voltar, e `b` parado, o quadro inteiro é o da CI,
       com o lock **presente**.
   - **Conclusão**: na CI, ao menos um produtor criou o `.lock` no disco sem que a chamada voltasse
     ao processo antes do prazo, e o outro também não completou a criação (sem sucesso nem
     `EEXIST`). Entre a 10ª operação e a 11ª, o código só gera o nonce do lock (`randomBytes(8)`) e
     chama `open(.lock, "wx", 0o600)`. A CPU de cada processo foi de 31 e 15 ms.
2. **C46: a cronologia é a do contrato da #8.**
   - O `ingest` abre a captura antes de ler o stdin, com prazo de criação + 650 ms
     (`ATTEMPT_MS`).
   - No prazo, a tentativa é abandonada com `delivery_timeout` (o código inicial, sem disputa de
     lock antes); a entrega fecha, e as 40 entradas lidas depois contam como perdidas.
   - O processo sai logo em seguida, com a criação pendente. O `onLock` nunca roda, e o `.lock`
     criado no disco fica.
   - `docs/traces.md:491-495` documenta o disco parado e o lock que pode ficar. O texto fala em
     “durante um commit”; aqui foi na tomada do lock da abertura. É uma imprecisão de documento da
     #8, fora do escopo e não corrigida.
3. **C46: o vermelho está certo.** A precondição do controle — `a` saudável e `b` chegando à
   promoção do segmento — não foi alcançada. O T8-C15 falharia do mesmo jeito nesse instante, e
   nenhuma asserção pode ser afrouxada.
4. **I23-C10: a #25 não mudou a E/S desse caminho.**
   - `observe/delivery.mjs` passou a ter um núcleo comum com a entrega da execução, com a mesma
     abertura (`openObservation` com prazo de criação + 650 ms) e a mesma gravação por sessão
     (`appendAutomatic`).
   - `appendAutomatic` passou a usar `appendWithSuccession`, com a mesma sequência.
   - `f734441` só trocou, para quem não cria, `readSmallFile` por `readMarker`, com as mesmas
     operações.
   - Diff lido inteiro: `git diff 63621c6 d0d5a7f -- src/integrations/observe/delivery.mjs`.
5. **Tempo do job.** O passo de integrações terminou junto do limite de 10 min do job. Uma
   execução com todos os testes verdes também pode ser cancelada. Na soma das durações dos testes
   da CI (paralelismo 3), as provas da #25 (I25 e T8-C15) são ~202 s de ~1.150 s (17,6%); I4, I5, T8
   e I23 somam o resto. O tempo de parede com e sem elas não foi medido.

## O que não se sabe

- Por que a criação do `.lock` não voltou em ~620 ms nos dois processos ao mesmo tempo. Não atribuo
  a antivírus, relógio, disco ou lock sem prova.
- Qual operação parou no I23-C10, que é de outro arquivo. A saída dele foi impressa às 13:47:49,
  e a do arquivo de concorrência às 13:52:09; o log só traz o horário em que cada arquivo terminou.
- Se as duas paradas têm a mesma causa.
- Qualquer taxa: é uma execução.
- Relação com o `io_failure` do T8-C15 na R9, de outra classe, que não foi demonstrada.

## Por que não há correção

Pelo contrato aprovado da #8 (prazo de 750 ms, tentativa de 650 ms, nenhuma nova tentativa além
do lock ocupado, o agente não espera o disco), uma parada de E/S maior que o prazo perde as entradas.
As provas com processos reais (T8-C15, C46, I23-C10, T7-C10 e outras) exigem perda zero e, portanto,
pressupõem que o ambiente não pare além do prazo. Tornar a CI verde diante dessas paradas exige
alguma destas mudanças, todas declaradas vinculantes ou fora do escopo: prazo maior ou relógio
controlado nos processos reais, nova tentativa, aceitar perdas, menos carga ou paralelismo, outro
teto, mudar o workflow ou o limite do job, ou instrumentar uma prova antiga da #23.

## Decisão pedida ao proprietário (propostas revisáveis, nada implementado)

1. **Paradas além do prazo nas provas com processos reais.**
   - (a) Manter tudo como está e tratar cada vermelho por `delivery_timeout` na CI como ocorrência a
     decidir. Rodar a CI de novo é decisão do orquestrador e do proprietário, não minha.
   - (b) Autorizar a instrumentação de diagnóstico do I23-C10 com a pré-carga de tempos existente,
     como foi feito no T8-C15 (só a mensagem muda). Na próxima ocorrência, ela diz qual operação
     parou.
   - (c) Autorizar uma coleta de ambiente no job Windows que não mude o host (por exemplo, a
     latência de criação de arquivo no workspace). Muda o workflow.
   - Não recomendo mudar prazos de produto ou de prova.
   - **Recomendação**: (b), e decidir (a) para fechar o PR com as asserções intactas.
2. **Limite de 10 min do job Windows.**
   - (a) Aumentar o `timeout-minutes` só da matriz.
   - (b) Separar as integrações num job próprio.
   - (c) Reduzir o tempo de parede das provas mais longas sem mudar prazos, o que exige revisar
     orçamentos aprovados (por exemplo, a regressão do C28 espera os 25 s do primeiro registro).
   - As três mudam o workflow ou provas aprovadas; nenhuma foi feita.

## Comandos e artefatos (pasta ignorada `.checks/code-review/issue-25/builder-ci40514323240/`)

- `node .checks/code-review/issue-25/builder-ci40514323240/ops-sequence.mjs <scratch>`: um produtor
  saudável com a pré-carga de tempos; mostra a ordem das operações. Windows, Node 24.22.1.
- `node .checks/code-review/issue-25/builder-ci40514323240/stall-control.mjs <scratch>`: dois
  produtores de 40 entradas com a criação do `.lock` parada antes ou depois de criar o arquivo.
  Windows, Node 24.22.1. Discrimina as duas localizações pela presença do lock.
- Nenhuma suíte, alvo ou CI foi executado: não houve código novo. Nenhum agente real, modelo ou
  rede.

## Depois da decisão (28/10/2026)

O proprietário aprovou a proposta `.checks/issue-25-agent-launch.ci40514323240-proposal.md` (`df2441f`;
[comentário 6460177952](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6460177952)): a
opção (b) do item 1, instrumentar o I23-C10, e a (a) do item 2, 20 minutos só no job Windows da
matriz `verify`.
- **Registro antes do código**: `25f5948` (task 39–40, C47–C48, Landing).
- **Código**: `52b22cd` (diagnóstico do I23-C10 com as provas I25-C47 e o `timeout-minutes`).
- **Provas e resultados**: na seção “Diagnóstico do I23-C10 e orçamento do job Windows” do build.
  Alvo de 128 testes com 122/0/6 nos três ambientes e `npm test` completo com exit 0.

A causa dos dois `delivery_timeout` continua desconhecida. Pendentes, com o orquestrador: o
Verifier 12, a revisão formal 7, a publicação do HEAD validado no PR #28 e a CI dele.
