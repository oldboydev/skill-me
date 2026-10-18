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
caminhos não fazem parte da cópia. Correlação, timeline e relatório ficam para
as issues #6 e #7.

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
parado não prende o agente: no prazo a tentativa é abandonada; se o processo
sair durante um commit, o `.lock` pode ficar, e as operações seguintes saem com
4 (`lock_present`) até você conferir que nenhum processo está ativo e removê-lo.

Para conferir a cobertura, use `status` ou `list`: os contadores separam aceitos,
persistidos, malformados, descartados por motivo e conteúdo omitido. Uma entrega
que falhou não aparece neles. Cada processo produtor resume a entrega só com um
código fechado e contagens, sem caminho, argumento, resultado ou stack:

| Código | Significado |
| --- | --- |
| `binding_invalid` | par de variáveis incompleto, raiz relativa ou ID fora do formato |
| `root_not_found` | a raiz não existe |
| `root_not_directory` | a raiz não é diretório |
| `store_invalid` | a pasta do store não é nossa |
| `capture_not_found` | a captura não existe (ou foi excluída) |
| `capture_invalid` | o estado da captura é ilegível |
| `capture_not_active` | a captura foi encerrada |
| `lock_present` | o lock continuou ocupado até o prazo (inclusive quando a última tentativa foi cortada nele) |
| `link_refused` | link ou junção no caminho do store |
| `foreign_entry` | entrada alheia no caminho do store |
| `root_changed` | a raiz foi trocada durante a operação |
| `io_failure` | falha de E/S, inclusive com a confirmação perdida |
| `delivery_timeout` | a operação ainda não tinha terminado no prazo, sem disputa de lock (disco parado) |

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
  ocupado, falha de E/S, confirmação perdida e disco parado; os limites acima;
- a demonstração de ponta a ponta `tests/integrations/traces/demo.e2e.test.mjs`,
  que rotula cada passo como fixture ou comando do usuário.

Não demonstrado: sessões reais do Claude, do Codex ou do Hermes com modelo (E2E
pendente, não autorizado nesta entrega) e o plugin Hermes rodando dentro do
Hermes com a captura vinculada. Nenhuma prova executa um modelo.

## Plataformas comprovadas

Comprovadas por execução real registrada em `.checks/issue-8-traces.build.md`:

- Windows 11
- WSL Ubuntu

macOS não foi executado localmente nesta entrega; a CI do PR o executa.
