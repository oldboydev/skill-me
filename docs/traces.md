# Traces locais: capturar, consultar e reutilizar (issue #8)

Este guia mostra como ligar uma execução de agente a uma captura local, ver os
registros enquanto chegam, recuperar a captura e reutilizar os registros numa
análise. Tudo roda na sua máquina, a partir do checkout: não há servidor,
daemon, upload nem descoberta automática de captura. A política de privacidade,
os limites e a exclusão são os da #5 ([docs/privacidade.md](privacidade.md)); os
contratos nativos e a instalação das integrações são os da #4
([docs/agent-observation.md](agent-observation.md)).

## Requisitos

- Node.js >= 24 (campo `engines` do `package.json`).
- O pacote é privado (`"private": true`): não é publicado nem instalado
  globalmente. Os comandos rodam do checkout, com `node src/integrations/cli.mjs …`
  ou `npm run --silent privacy -- …`.
- Hooks do Claude e do Codex e o plugin Hermes instalados com
  `integrations install` (guia da #4), ou o wrapper `integrations run --agent codex`,
  que não precisa de instalação.

## Configuração explícita da captura

1. Crie a captura e anote o `id` da resposta. `--root` não tem default; use aspas
   quando o caminho tiver espaço ou acento:

   ```
   node src/integrations/cli.mjs privacy start --root "C:\Users\você\capturas ação"
   ```

   `--content` liga argumentos e resultados só para essa captura (matriz do guia
   da #5); sem ele, só metadados sanitizados são gravados.

2. No terminal de onde o agente será iniciado, defina as duas variáveis. A raiz
   precisa ser absoluta — a mesma pasta dada ao `start`:

   ```
   # PowerShell
   $env:SKILL_ME_CAPTURE_ROOT = "C:\Users\você\capturas ação"
   $env:SKILL_ME_CAPTURE_ID = "<id>"
   # bash/zsh
   export SKILL_ME_CAPTURE_ROOT="/home/você/capturas ação"
   export SKILL_ME_CAPTURE_ID="<id>"
   ```

   Para ver as entregas que falharem, defina também `SKILL_ME_CAPTURE_REPORT`
   com o caminho absoluto de um arquivo de diagnóstico (seção "Falhas de
   entrega").

3. Inicie o agente desse terminal (Claude, Codex com hooks, `integrations run
   --agent codex -- …` ou Hermes com `SKILL_ME_HERMES_DELIVERY`). Os hooks, o
   ingest e o wrapper herdam as variáveis e gravam na captura.

Só o par completo escolhe uma captura. Sem nenhuma das duas variáveis, as
integrações ficam como na #4: observação em memória, descartada ao fim do
processo. Com uma só, raiz relativa ou ID fora do formato, nenhuma captura é
escolhida (`binding_invalid`) — nem a única ativa da raiz, nem uma achada pelo
diretório atual. As variáveis não criam captura nem ligam conteúdo: o
consentimento continua sendo o `privacy start` daquela captura, e uma captura
encerrada (`stop`/`disable`) recusa novos registros.

## O que cada integração grava

| Integração | Quando abre a captura | O que grava |
| --- | --- | --- |
| Hook Claude ou Codex | depois de ler o evento (um por processo) | um registro por evento suportado |
| Ingest Hermes | ao iniciar, antes de ler o stdin | um registro por linha suportada |
| Wrapper `integrations run --agent codex` | antes de iniciar o Codex (até 750 ms) | um registro por linha suportada do `exec --json` e o `process.exit` |

Cada registro passa pela mesma política do `privacy ingest`: envelope v1,
pseudônimos `h1:` com a chave da captura (o mesmo ID nativo dá o mesmo
pseudônimo em qualquer processo da captura, e outro em outra captura) e conteúdo
só com o opt-in dela. O formato gravado é o da #5 (`recordVersion: 1`); o payload
nativo bruto nunca é gravado.

O wrapper repassa stdout, stderr, código e sinal do Codex sem mudança e não
altera o ambiente dele: os hooks do próprio Codex recebem o mesmo vínculo e
gravam os eventos deles (contrato `codex-hooks`), enquanto o fluxo do
`exec --json` é gravado só pelo wrapper.

## Consultar

```
node src/integrations/cli.mjs privacy list   --root <diretório> [--after <id>]
node src/integrations/cli.mjs privacy export --root <diretório> --capture <id>
node src/integrations/cli.mjs privacy follow --root <diretório> --capture <id>
node src/integrations/cli.mjs privacy status --root <diretório> --capture <id>
node src/integrations/cli.mjs privacy timeline --root <diretório> --capture <id>
```

- `list` responde um JSON v1 (`schemaVersion`, `command`, `status`, `captures`,
  `nextAfter`) com até 100 capturas por página, ordenadas por `createdAt` e, no
  empate, por `id`. Cada captura traz `id`, `state`, `content`, `retentionDays`,
  `createdAt`, `endedAt`, `dataBytes`, `counters` e `limits`, como o `status`.
  Quando há mais, `nextAfter` é o `id` a passar em `--after`; ao fim, `null`. Se a
  captura usada como cursor foi excluída entre as páginas, a resposta é 3
  (`capture_not_found`): recomece sem `--after`. Sem a pasta do store, a lista é
  vazia e nada é criado. Uma captura ilegível impede a página e aparece em
  `failed`, com o código.
- `export` devolve a captura ativa ou encerrada e os registros na ordem gravada,
  com origem (`envelope.source` e `signal`) e os contadores de cobertura. Ler não
  altera nenhum arquivo da captura.
- `follow` escreve NDJSON v1, uma linha por evento: `record` para cada registro
  já gravado e para cada novo, `end` quando a captura é encerrada (`stop` ou
  `disable`, com o estado final) e `error` com um código fechado. `sequence`
  cresce a partir de 1 e, num `record`, é a posição dele na captura; nenhum
  registro se repete. A captura é sondada a cada 200 ms; numa captura ativa o
  comando continua até o fim dela (ou Ctrl+C).

```
{"schemaVersion":1,"command":"follow","type":"record","sequence":1,"record":{…}}
{"schemaVersion":1,"command":"follow","type":"end","sequence":2,"capture":{…}}
```

Os comandos `privacy` não esperam o lock da raiz (regra da #5): se um produtor
estiver gravando ou o `follow` sondando naquele instante, o comando responde 4
(`lock_present`) sem mudar nada — repita-o. Os produtores, ao contrário, esperam
o lock até o prazo da entrega.

## Reutilizar em análises

`replayCapture({ root, id, consumer })`, de `src/integrations/traces/replay.mjs`,
lê a captura pelo store e chama `consumer` com uma cópia congelada
`{ capture, records: [{ sequence, record }] }`: os mesmos registros do `export`,
na ordem gravada, com origem, estado, contadores e limites da captura. Nada é
executado, nenhum agente é iniciado e nenhuma skill é relida; a chave e os
caminhos não fazem parte da cópia. A timeline (issue #6, próxima
seção) é calculada sobre essa mesma cópia; o relatório fica para a #7.

## Timeline e cobertura (issue #6)

```
node src/integrations/cli.mjs privacy timeline --root <diretório> --capture <id>
```

Responde um JSON v1 (`schemaVersion`, `command: "timeline"`, `status: "ok"`) com
`timelineVersion: 1`, `capture`, `entries`, `operations` e `coverage`. Funciona
em captura ativa, encerrada ou desabilitada, não escreve nada e é recalculada a
cada leitura (até 500 registros); não executa agente, não lê skill e não usa o
conteúdo coletado. A mesma estrutura sai da API pura `correlateTrace(trace)`, de
`src/integrations/correlation/timeline.mjs`, que recebe a cópia de `replayCapture`.
Faltas de flag saem com 2; captura ausente ou inválida com 3; lock ou conflito
com 4; falha de E/S com 5, no envelope de erro dos demais comandos `privacy`.

**Entradas.** Uma por registro, na ordem gravada (`sequence`, a partir de 1), com
`observedAt`, `source`, `eventKind`, `nativeEvent`, `ids`, `fields`, `gaps` e
`evidence: [sequence]`. `observedAt` nunca reordena: um instante anterior ao do
registro precedente só marca `outOfOrder: true`. Uma repetição com identidade
nativa completa e conteúdo igual continua como entrada própria, com `duplicateOf`
apontando para a primeira `sequence`, e não cria outra operação. `session` diz a
qual sessão a entrada pertence e `segment` conta as retomadas (`resume`) da mesma
sessão.

**Força do vínculo.** Todo vínculo traz as `sequence` que o sustentam:

| Força | Significa |
| --- | --- |
| `native` | o próprio registro traz o ID (sessão, chamada, subagente) e ele foi pareado dentro da mesma captura, agente e mecanismo |
| `heuristic` | candidato sem ID no registro (evento sem sessão com uma única sessão da mesma origem; itens do `codex exec`, que não trazem sessão); nunca afirma |
| `inconclusive` | sem ID ou com ambiguidade (duas sessões, colisão de `itemId`); nada é ligado |

**Operações** (`operations`): `tool` (par `tool_pre`/`tool_post`, ou os itens do
`codex exec`), `skill_invocation` (só a ferramenta `Skill` do Claude, com
`toolUseId`), `skill_evidence` e `subagent`. O estado diz o que foi observado:
`closed` (início e resultado), `open` (início sem resultado), `orphan_result`
(resultado sem início), `ambiguous` (itens cujo `itemId` se repete, inclusive
atravessando a abertura de outra sessão; `itemId` distintos em várias sessões seguem como operações
`heuristic` separadas, sem sessão atribuída) e `boundary_only` (invocação de skill sem `post`, depois de um fim do
próprio turno, sessão ou subagente).

- `outcome`, `errorType`, `exitCode` e `durationMs` só aparecem quando o contrato
  v1 os traz; sem eles ficam `null`. Sem duração nativa, e com início e resultado
  em ordem, `elapsedMs` é o intervalo entre os instantes e `durationEvidence` é
  `"derived"`; resultado anterior ao início não gera duração.
- Um `post` de `Skill` encerra a chamada da ferramenta, não prova que as
  instruções foram seguidas (`instructionCompletion: "unobserved"`). Nenhum fim de
  turno, sessão, processo ou subagente produz conclusão de skill.
- Expansão direta (`/nome`) e o ciclo de vida do Hermes (`loaded`, `patched`,
  `edited`…) são `skill_evidence` com `strength: "heuristic"`: mostram que a skill
  apareceu, não que foi usada. Ler um `SKILL.md` com uma ferramenta, no Codex ou
  em qualquer agente, é só uma operação de ferramenta; o Codex não ganha skill pelo
  nome de arquivo.
- `agentType` e `childRole` iguais não unem subagentes; só IDs explícitos ligam
  pai, filho e as ferramentas do filho (`operations` do subagente).

**Cobertura** (`coverage`): `capture.counters` e `capture.limits` são os da captura;
`eventGaps` lista, por `sequence`, os motivos de lacuna do envelope; `totals` conta
entradas e operações inconclusivas, `orphanResult`, `open`, `boundaryOnly`,
`duplicates` e `outOfOrder`. `partial: true` quando há registro malformado ou
descartado, lacuna de envelope, entrada ou operação inconclusiva, ou operação
aberta, órfã ou só com fronteira. Quase toda captura real é parcial: o contrato v1
declara lacunas em quase todo evento. Nenhum percentual de cumprimento é calculado.

Demonstrado com fixtures sintéticas em `tests/integrations/correlation/`:
a prova de ponta a ponta `timeline.e2e.test.mjs` grava eventos de Claude, Codex e
Hermes pelos caminhos locais desta seção e compara a API com o CLI. Nenhuma prova
inicia um agente real nem executa um modelo.

## Limites

| Limite | Valor | Efeito |
| --- | --- | --- |
| registros por captura | 500 | o que passaria do limite e os seguintes saem como `capture_event_limit` |
| dados por captura | 8 MiB | idem, `capture_byte_limit` |
| linha nativa do ingest e do wrapper | 64 KiB | linha maior é malformada (`oversize_line`) |
| entrada de hook | 1 MiB | acima disso o evento não é lido (malformado) |
| stdin de hook | 2 s | sem fim do stdin no prazo, nada é gravado além da contagem de malformado |
| entrega de um evento | 750 ms depois de lido | a tentativa termina no prazo, gravada ou não |
| página do `list` | 100 capturas | `nextAfter` continua |
| sondagem do `follow` | 200 ms | — |
| lock ocupado no `follow` | 5 s seguidos | `error` com `lock_present` e código 4 |

## Falhas de entrega

Uma entrega nunca muda o que o agente vê: hooks e ingest saem com 0 e stdout
vazio; o wrapper devolve o código do Codex. Lock ocupado é tentado de novo até o
prazo de 750 ms; nenhuma outra falha é repetida. Quando a falha chega depois de
gravar (a confirmação se perdeu), o evento pode estar na captura mas conta como
não confirmado — ele nunca é reenviado, então não aparece duas vezes. Um disco
parado não prende o agente: no prazo a tentativa é abandonada. Se ela já tinha
o lock, ainda pode gravar depois (`delivery_timeout`, confirmação incerta); se
não tinha, não grava mais. Se o processo sair durante um commit, o `.lock` pode
ficar, e as operações seguintes saem com 4 (`lock_present`) até você conferir
que nenhum processo está ativo e removê-lo.

`status` e `list` mostram o que chegou à captura: os contadores separam aceitos,
persistidos, malformados, descartados por motivo e conteúdo omitido. Uma entrega
que falhou não chega lá — com o lock ocupado ou o disco falhando, a captura não
pode registrar a perda. Para ver as falhas, defina, no mesmo terminal das duas
variáveis do vínculo, o caminho absoluto de um arquivo de diagnóstico fora da
raiz da captura:

```
# PowerShell
$env:SKILL_ME_CAPTURE_REPORT = "C:\Users\você\diagnóstico de entrega.ndjson"
# bash/zsh
export SKILL_ME_CAPTURE_REPORT="/home/você/diagnóstico de entrega.ndjson"
```

Cada processo produtor vinculado (hook, ingest ou wrapper) que perde ao menos uma
entrega, ou que não consegue abrir a captura, acrescenta uma linha JSON a esse
arquivo ao terminar. Uma entrega confirmada não escreve nada: arquivo ausente ou
sem linhas quer dizer nenhuma falha registrada. Para ler, durante ou depois da
sessão:

```
# PowerShell
Get-Content "C:\Users\você\diagnóstico de entrega.ndjson"
# bash/zsh
cat "/home/você/diagnóstico de entrega.ndjson"
```

Um hook do Claude que encontrou o lock ocupado até o prazo escreve:

```
{"skillMeDeliveryReport":1,"at":"2026-10-18T12:00:00.000Z","agent":"claude","capture":"<id>","delivery":{"bound":true,"code":"lock_present","entries":1,"committed":0,"persisted":0,"lost":1}}
```

| Campo | Conteúdo |
| --- | --- |
| `skillMeDeliveryReport` | versão do formato: 1 |
| `at` | instante (UTC) em que o processo encerrou a entrega |
| `agent` | produtor: `claude`, `codex-hooks`, `codex-exec` (wrapper) ou `hermes`; `null` num hook com agente desconhecido |
| `capture` | ID da captura do vínculo; `null` com `binding_invalid` (o valor inválido não é copiado) |
| `delivery.bound` | `false` só com `binding_invalid` |
| `delivery.code` | o primeiro código da tabela abaixo que encerrou uma tentativa do processo |
| `delivery.entries` | entradas lidas pelo processo |
| `delivery.committed` | entradas confirmadas na captura |
| `delivery.persisted` | registros gravados por elas; o resto está nos contadores de descarte ou malformado |
| `delivery.lost` | entradas não confirmadas, inclusive as de confirmação perdida |

A linha não traz caminho, valor de variável, payload, mensagem de erro nem
stack. Sem o par do vínculo, `SKILL_ME_CAPTURE_REPORT` sozinha não escreve, e um
caminho relativo é ignorado (os hooks rodam no diretório do projeto do agente).
O arquivo é criado se faltar — no POSIX, só com permissão do dono — e só recebe
linhas acrescentadas; um link, uma pasta ou outro tipo de entrada naquele
caminho não é tocado. Também não é tocado um caminho que, resolvido, passa por
uma pasta `skill-me-privacy` — o store de qualquer raiz, por qualquer grafia,
link, junção ou nome curto —, nem um arquivo com mais de um nome (hard link):
a linha se perde, e o diagnóstico nunca altera uma captura nem impede `export`,
`follow`, `delete` ou `prune`. Se o arquivo não puder ser gravado (pasta
inexistente, sem permissão, disco cheio), o diagnóstico se perde e nada muda
para o agente. O arquivo é seu: `delete` e `prune` não o apagam, e ele cresce
uma linha por processo com falha — por exemplo, a cada hook enquanto as
variáveis apontarem para uma captura encerrada. Apague-o quando quiser.

| Código | Significado |
| --- | --- |
| `binding_invalid` | par de variáveis incompleto, raiz relativa ou ID fora do formato |
| `root_not_found` | a raiz não existe |
| `root_not_directory` | a raiz não é diretório |
| `store_invalid` | a pasta do store não é nossa |
| `capture_not_found` | a captura não existe (ou foi excluída) |
| `capture_invalid` | o estado da captura é ilegível |
| `capture_not_active` | a captura foi encerrada |
| `lock_present` | o lock estava ocupado na última resposta e nenhuma tentativa o obteve até o prazo; as entradas perdidas não são gravadas depois |
| `link_refused` | link ou junção no caminho do store |
| `foreign_entry` | entrada alheia no caminho do store |
| `root_changed` | a raiz foi trocada durante a operação |
| `io_failure` | falha de E/S, inclusive com a confirmação perdida |
| `delivery_timeout` | a operação ainda não tinha terminado no prazo (disco parado); se ela já tinha o lock, a confirmação é incerta — a entrada pode ser gravada depois |

## Códigos de saída

Os comandos `privacy` respondem 0 concluído; 2 uso inválido; 3 estado ou formato
inválido ou ausente; 4 conflito, lock ocupado ou isolamento; 5 falha de E/S —
inclusive `list` e `follow`. Nenhuma resposta ecoa caminho, valor de flag ou
payload. Os comandos internos `hook` e `ingest` sempre saem com 0; o wrapper sai
com o código do Codex, reemite o sinal dele (POSIX) e sai com 127/126 se ele não
iniciar.

## Retenção e exclusão

Valem as regras da #5: `stop` encerra; `disable` encerra e desliga o conteúdo;
`delete` e `prune` mostram uma prévia e só apagam com `--apply`; uma captura
ativa nunca é apagada pela retenção; não há daemon — rode `privacy prune --root
<diretório> --apply` quando quiser aplicar a retenção. Depois de apagada, a
captura não volta: `list` não a mostra, `export` e `follow` saem com 3, e um
produtor ainda vinculado a ela não recria nada.

## Capacidades demonstradas

Com fixtures sintéticas, pelas provas de `tests/integrations/traces/`:

- hooks do Claude e do Codex pela linha que o instalador grava, com a captura
  vinculada; ingest Hermes; wrapper supervisionando um Codex falso;
- `list`, `export`, `follow` e `replayCapture`; produtores concorrentes; lock
  ocupado, falha de E/S e confirmação perdida, com o diagnóstico lido do arquivo
  de `SKILL_ME_CAPTURE_REPORT`; disco parado (em processo, e num hook real com
  uma pré-carga de teste depois de obter o lock); diagnóstico apontado para
  arquivos do store por grafias equivalentes, links e hard links; os limites acima;
- a demonstração de ponta a ponta `tests/integrations/traces/demo.e2e.test.mjs`,
  que rotula cada passo como fixture ou comando do usuário;
- a timeline (`privacy timeline` e `correlateTrace`) sobre fixtures de Claude, Codex e
  Hermes, em `tests/integrations/correlation/`, com a mesma estrutura pela API e pelo CLI.

Não demonstrado: sessões reais do Claude, do Codex ou do Hermes com modelo (E2E
pendente, não autorizado nesta entrega) e o plugin Hermes rodando dentro do
Hermes com a captura vinculada. Nenhuma prova executa um modelo.

## Plataformas comprovadas

Comprovadas por execução real registrada em `.checks/issue-8-traces.build.md`:

- Windows 11
- WSL Ubuntu

macOS não foi executado localmente nesta entrega; a CI do PR o executa.
