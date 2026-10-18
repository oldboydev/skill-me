# Issue #8 — traces locais: registro do build

Profile `light`. Builder: Claude, na branch `codex/issue-8-traces`, a partir de
`origin/main` `d7fe3ef` e do plano `0ff5289` (`.tasks/issue-8-traces.md`,
`.checks/issue-8-traces.md`, critérios inalterados). Sem push, PR, merge, deploy,
instalação em configuração pessoal ou execução de agente/modelo real: todas as
provas usam fixtures sintéticas e diretórios temporários próprios. Verifier e
revisão Codex ficam com o orquestrador.

## Commits

| Commit | Conteúdo |
| --- | --- |
| `d1a5570` | S1 — vínculo por ambiente e entrega dos produtores à captura (C1–C8) |
| `5ec6ed9` | S2 — `privacy list` e `privacy follow` (C9–C14) |
| `89fb6c8` | S3 — `replayCapture`, concorrência, falhas, limites e demonstração (C15–C19) |
| `132cb6e` | guia `docs/traces.md`, guias da #4/#5 e prova da documentação (C20) |
| `bdd70af` | evidências da fase 1 (C21) |
| commit seguinte | fase 2: `npm test` completo em `bdd70af` |

## Decisões de implementação

Nenhuma altera as linhas do Landing; todas cabem nas três decisões registradas.

- **Fonte de verdade reutilizada.** A entrega (`src/integrations/traces/delivery.mjs`)
  usa o lote do `privacy ingest` (`createIngestBatch`, que ganhou `draft` para
  entrada já adaptada e `malformed` para os motivos dos produtores),
  `applyPolicy` com a chave e o opt-in da captura, `openCaptureForIngest` e
  `appendRecords`. Nenhum formato novo: `captureVersion: 1`, `recordVersion: 1`.
  `toStoreBatch` saiu do `ingestCapture` para os dois consumidores.
- **Validade do par.** Ambas as variáveis não vazias, raiz absoluta e ID no
  formato `CAPTURE_ID_PATTERN`; senão `binding_invalid` e nenhuma captura. A raiz
  relativa é recusada porque hooks rodam no diretório do projeto do agente: o
  mesmo valor apontaria para outra raiz em cada processo. A captura `active` é
  validada pelo store (`capture_not_found`, `capture_not_active`).
- **Quando abrir.** Hook: depois de ler o evento. Ingest Hermes: antes de ler o
  stdin (as linhas esperam no pipe). Wrapper: antes de iniciar o Codex, até o
  prazo. Falha ao abrir encerra a entrega daquele processo com o código.
- **Prazo e repetição.** Só `lock_present` é repetido (o store o lança antes de
  qualquer mutação), a cada 10 ms. Cada entrada tem até 750 ms do instante em
  que foi lida; a tentativa desiste 100 ms antes (`DELIVERY_RESERVE_MS`) porque o
  timer do Node atrasa sob carga: sem a reserva, a suíte inteira em paralelo no
  Windows mediu 756 ms (lock) e 764 ms (disco parado). Operação ainda em curso no
  prazo é abandonada (`delivery_timeout`; `lock_present` se o prazo se foi
  disputando o lock). Falha depois do commit nunca é reenviada.
- **Lotes.** Linhas de um mesmo bloco síncrono entram no mesmo commit; as que
  chegam durante um commit vão no seguinte, com o prazo da mais antiga. A
  admissão local usa um limite inferior do uso real; o store continua decidindo.
- **Diagnóstico.** O relatório do observador v2 ganha `delivery`
  (`bound`, `code`, `entries`, `committed`, `persisted`, `lost`) só quando alguma
  variável do vínculo está presente; sem vínculo o relatório é o de antes.
- **`list`.** Cursor excluído entre páginas → 3 `capture_not_found`. Captura
  ilegível → erro com `failed`, como no `prune`. Sem store → lista vazia, nada criado.
- **`follow`.** Sondagem de 200 ms com o lock (regra da #5 para leitura no
  Windows); lock ocupado adia a sondagem e, por 5 s seguidos, vira `error`
  `lock_present` (4) — senão um lock que ficou deixaria o follow mudo para sempre.
  `sequence` é a da linha; num `record`, a posição na captura. Saída fechada
  (consumidor saiu) encerra com 0.
- **Lock do CLI.** Os comandos da #5 continuam sem esperar o lock (mudar isso
  alteraria o contrato aprovado). Com `follow` ou produtores ativos, um comando do
  usuário pode responder 4 `lock_present`; o guia diz para repetir. Nas provas, só
  comandos do usuário concorrentes a um `follow` repetem, e só nesse código
  (`privacyRetrying`, como o `retryOnLock` da demonstração da #5). Achado durante
  o build: C12 falhou uma vez assim antes da regra existir.

## Alterações em testes existentes

- `I5-C32s` (`tests/integrations/privacy/store.cli.test.mjs`) esperava
  `unknown_command` para `list`/`follow` ("comandos da #8 continuam
  desconhecidos"). Agora existem: o caso de `list` virou cursor fora do formato
  (`invalid_capture_id`, sem eco do canário) e o erro de uso do `follow` é
  conferido na forma NDJSON (`unknown_flag`, sem eco). Mesmas propriedades
  (código fechado, exit 2, nada ecoado), aplicadas aos comandos novos.
- `I4-C44c` (`tests/integrations/docs-matrix.test.mjs`) exigia a frase "Não há
  coletor nem ingestão real.", que deixou de ser verdadeira (Impact da task:
  atualizar guias que dizem não existir consumidor real). Continua exigindo "Não
  há coletor" e "nada é gravado nem enviado pelo debugger", acrescenta que sem
  vínculo a observação fica em memória, e mantém os padrões proibidos.
- `fake-codex.mjs` ganhou o passo `hook` (aditivo), para o Codex falso iniciar um
  hook com o ambiente herdado, como o Codex real faz.

## Provas por check

Todas executadas e verdes nas duas linhas da fase 1 (abaixo), exceto C20, que lê
este arquivo; C20 e todas as demais passaram no `npm test` completo da fase 2, no
Windows e no WSL (o sinal POSIX de C4 só no WSL).

| Check | Teste | Arquivo |
| --- | --- | --- |
| C1 | `T8-C1 Claude live capture` | `tests/integrations/traces/live-capture.cli.test.mjs` |
| C2 | `T8-C2 Codex hook live capture` | idem |
| C3 | `T8-C3 Hermes live capture` | idem |
| C4 | `T8-C4 supervised Codex live capture` (dois testes: fluxo e sinal POSIX) | idem |
| C5 | `T8-C5 capture scoped pseudonyms` | idem |
| C6 | `T8-C6 no implicit capture` | idem |
| C7 | `T8-C7 invalid native input classifications` | idem |
| C8 | `T8-C8 live content policy` | idem |
| C9 | `T8-C9 list pages and metadata` | `tests/integrations/traces/query.cli.test.mjs` |
| C10 | `T8-C10 list invalid store` | idem |
| C11 | `T8-C11 export observed capture` | idem |
| C12 | `T8-C12 follow new records once` | `tests/integrations/traces/follow.cli.test.mjs` |
| C13 | `T8-C13 follow terminal and deletion` | idem |
| C14 | `T8-C14 lifecycle remains authoritative` | `tests/integrations/traces/query.cli.test.mjs` |
| C15 | `T8-C15 concurrent producers` | `tests/integrations/traces/concurrency.cli.test.mjs` |
| C16 | `T8-C16 delivery failure neutrality` | idem |
| C17 | `T8-C17 capture and input bounds` | `tests/integrations/traces/limits.cli.test.mjs` |
| C18 | `T8-C18 sanitized replay to consumer` | `tests/integrations/traces/replay.unit.test.mjs` |
| C19 | `T8-C19 trace walkthrough` | `tests/integrations/traces/demo.e2e.test.mjs` |
| C20 | `T8-C20 trace documentation contract` | `tests/integrations/traces/docs.test.mjs` |
| C21 | `npm test` e hashes do core | este registro |

O que cada prova afirma, em resumo: o esperado vem do relatório em memória da
#4/#5 (envelope igual a menos de IDs e instante), do `privacy ingest` da #5
(conteúdo e `privacy` iguais) ou da definição publicada do pseudônimo (HMAC
calculado no teste com a chave lida do disco); valores exatos de contadores,
códigos e `delivery`; nenhum ID nativo, `cwd`, `transcript_path` ou canário no
disco; árvore da raiz idêntica (com mtimes) quando nada deve ser gravado.

Cada comando `Proof:` de `.checks/issue-8-traces.md` (C1–C20), executado como
escrito no Windows em `ed83bf1`, selecionou e rodou exatamente o teste nomeado:
um teste por check, todos com exit 0, `pass 1`, `fail 0`; C4 seleciona dois
(fluxo, pass; sinal POSIX, skip no Windows).

## Mutações

Cada mutação foi aplicada ao produto já commitado, a prova correspondente rodou
e o arquivo foi restaurado com `git checkout` (árvore limpa ao fim):

| Mutação | Prova | Resultado |
| --- | --- | --- |
| raiz relativa aceita no vínculo | C6 | falhou (detectada) |
| chave fixa em vez da chave da captura | C1, C5 | 2 falhas |
| entrega repete qualquer falha | C16 | falhou |
| `follow` não avança o já entregue | C12 | falhou |
| `list` ordenada só por `id` | C9 | falhou |
| entrega ignora o opt-in | C8 | falhou |
| replay sem congelar | C18 | falhou |
| `list` cria a pasta do store | C10 | falhou |
| malformado não chega à captura | C7 | falhou |
| wrapper tira o vínculo do filho | C4 | falhou |
| prazo da entrega de 5 s | C16 | falhou |
| `follow` sem linha `end` | C12, C13 | 2 falhas |
| sondagem devolve registros já entregues | C12 | falhou |

## Medições de tempo (C16)

| Plataforma | Hook com lock ocupado (fim do stdin → saída do processo) | Em processo, lock ocupado | Em processo, disco parado |
| --- | --- | --- | --- |
| Windows 11, fase 1 | 662 ms | 663 ms | 651 ms |
| WSL Ubuntu, fase 1 | 654 ms | 651 ms | 649 ms |
| Windows 11, fase 2 (`npm test`) | 665 ms | 651 ms | 653 ms |
| WSL Ubuntu, fase 2 (`npm test`) | 657 ms | 651 ms | 650 ms |
| Windows 11, correção 1 (`npm test` em `0c108ee`) | 663 ms; com diagnóstico em arquivo, 665 ms | 651 ms | 652 ms |
| WSL Ubuntu, correção 1 (`npm test` em `0c108ee`) | 655 ms; com diagnóstico em arquivo, 656 ms | 651 ms | 649 ms |

Em processo a asserção é ≤ 750 ms exatos. No processo real a medida inclui o
encerramento depois da tentativa; a asserção admite 750 + 500 ms. "Com
diagnóstico em arquivo" é o hook sem relatório de fixture e com
`SKILL_ME_CAPTURE_REPORT` (rodada de correção 1, abaixo), mesma asserção.

## Execuções

| Plataforma | Comando | Resultado |
| --- | --- | --- |
| Windows 11 — Node 24.21.0, checkout em `132cb6e` | `node --test` dos sete arquivos de `tests/integrations/traces/` exceto `docs.test.mjs` | 20 tests, 19 pass, 0 fail, 1 skip (T8-C4 sinal POSIX) |
| WSL Ubuntu — Node 24.13.0, uid 1000, distro `Ubuntu`, `/tmp/skill-me-i8-YgTUkP` de `git archive 132cb6e` (sha256 `c0b8dfdb…7c7525` conferido; `git get-tar-commit-id` = `132cb6e4…`), `node_modules` copiado do checkout | mesmo alvo | 20 tests, 20 pass, 0 fail, 0 skip |
| Windows 11 — Node 24.21.0, checkout em `bdd70af` | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 224 (217 pass, 0 fail, 7 skip: os 6 pré-existentes e T8-C4 sinal POSIX), T8-C20 inclusive |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i8-LhxqxN` de `git archive bdd70af` (sha256 `dfbd41ee…1e80c483` conferido; `git get-tar-commit-id` = `bdd70af0…`) | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (416 pass, 1 skip); integrações 224 (212 pass, 0 fail, 12 skip pré-existentes: Hermes ausente ×8, DACL Windows ×3, ACL macOS ×1), T8-C20 inclusive |
| Windows 11 — Node 24.21.0, checkout em `0c108ee` (correção 1) | os 20 comandos `Proof:` de C1–C20, como escritos | cada um exit 0, 0 fail; 24 testes selecionados, 23 pass, 1 skip (T8-C4 sinal POSIX) |
| Windows 11 — Node 24.21.0, checkout em `0c108ee` (correção 1) | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 227 (220 pass, 0 fail, 7 skip: os 6 pré-existentes e T8-C4 sinal POSIX) |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i8-gKUfgu` de `git archive 0c108ee` (sha256 `4aed4efe…fd674272` conferido; `git get-tar-commit-id` = `0c108eec…`) (correção 1) | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (416 pass, 1 skip); integrações 227 (215 pass, 0 fail, 12 skip pré-existentes: Hermes ausente ×8, DACL Windows ×3, ACL macOS ×1); nenhum T8 pulado |

Preparação WSL: tar e `run-wsl.sh` num diretório de `mktemp -d` do `%TEMP%`
(`skill-me-i8-wsl-stage-n0fAaX` na fase 1, `skill-me-i8-wsl-stage-71TySJ` na 2,
`skill-me-i8-wsl-stage-Bm0Csq` na correção 1), chamados com `MSYS_NO_PATHCONV=1 wsl.exe -d
Ubuntu -- bash -l <script> <tar> <sha> <node_modules> <commit> <saída> <modo>`.
O script recusa root, outra distro, origem ausente, hash ou commit diferente e
destino fora de `/tmp/skill-me-i8-??????` antes de extrair; logs ficam no stage.

## Skips e ausências

- `T8-C4 … sinal POSIX` é pulado no Windows: sinal programático vira
  TerminateProcess sem handler (mesmo limite do I4-C15). Executado no WSL.
- Pré-existentes no Windows (linha de base `npm test` antes da mudança: doctor
  410 pass + 7 skip; integrações 197 pass + 6 skip): FIFO/symlink POSIX do doctor
  e I4-C15, I4-C25b/j/k/l/m (modos e ACL POSIX/macOS). No WSL: hermes_cli.PYD do
  doctor, I4-C18–C23, I4-C37, I4-C44b (Hermes ausente), I4-C25g/h/i (DACL
  Windows) e I4-C25m (ACL macOS). Nenhum teste T8 é pulado no WSL.
- macOS não foi executado localmente; a CI do PR o executa.
- Não executados por não estarem autorizados: Claude, Codex ou Hermes reais com
  modelo; o plugin Hermes dentro do Hermes com a captura vinculada (o ingest
  Hermes é exercitado pelo comando real com fixtures).

## Governança

Cinco arquivos do core de revisão iguais a `origin/main` (`git diff
origin/main -- …` vazio; blobs idênticos):

| Arquivo | Blob |
| --- | --- |
| `scripts/code-review/cli.mjs` | `c6a4abcd52cf140f64b596136080f36d066b1ee8` |
| `scripts/code-review/review.mjs` | `c51cff675f6472b9e2ffa02eaa03cd80f3d48dad` |
| `scripts/code-review/review.test.mjs` | `6495b4d3d61db91c5896e7efc919880237f4b572` |
| `scripts/code-review/schema.json` | `b02001e2b10df2e46b244490ee3cf5ae1b410694` |
| `scripts/code-review/README.md` | `711a7161c58ea65dd8dd6a6148d8ef3948d4f2eb` |

`package.json` não mudou (privado, mesmas dependências).

## Limites conhecidos e pendências

- Disco parado durante um commit: a tentativa é abandonada no prazo e o processo
  do hook sai; se isso ocorrer com o lock tomado, o `.lock` fica e as operações
  seguintes saem com 4 até remoção manual (documentado no guia).
- O commit do store da #5 reescreve o segmento inteiro (anterior + novos); cada
  entrega paga essa cópia, limitada pelos 8 MiB da captura. Não medido como
  problema e fora do escopo (trocar a persistência está fora do plano).
- `accepted` não conta o registro recusado pela admissão local do lote (mesmo
  comportamento do `privacy ingest` da #5).
- ~~O resumo `delivery` só sai no relatório de fixture~~ — resolvido na rodada de
  correção 1: o resumo vai ao arquivo de `SKILL_ME_CAPTURE_REPORT` (abaixo).
- E2E real com agentes e modelos continua pendente.

## Rodada de correção 1 — C4, C16 e C20

Origem: `.checks/issue-8-traces.verified.md` (Verifier, rodada 1: FAIL; C4, C16
e C20 falharam; C21 pendente da CI macOS). Builder Claude, escopo só desses três
achados. Não mudaram: `.tasks/issue-8-traces.md`, `.checks/issue-8-traces.md`
(21 checks, comandos `Proof:` e Landing), a política da #5, `package.json` e os
cinco arquivos do core (diff vazio contra `origin/main`, blobs acima).
`.checks/issue-8-traces.verified.md` pertence ao Verifier: não foi alterado nem
entra nos commits. Sem push, PR, merge, deploy ou revisão Codex.

### Commits

| Commit | Achado | Conteúdo |
| --- | --- | --- |
| `cefc629` | C4 | stderr inteiro do wrapper comparado byte a byte com o do Codex falso, com e sem hook do filho |
| `34cde1a` | C16 | arquivo de diagnóstico `SKILL_ME_CAPTURE_REPORT` e provas na fronteira |
| `b9ec5e9` | C16 | diagnóstico impossível de gravar não muda o agente |
| `0c108ee` | C20 | seção "Falhas de entrega" do guia e prova que segue o guia |
| commit seguinte | — | este registro |

### C4 — stderr do wrapper

Achado: `endsWith` aceitaria uma linha do debugger antes do stderr nativo. Só
teste mudou. O Codex falso grava em `FAKE_CODEX_STDERR_COPY` cada byte que
escreve no stderr (probe inclusive); `runWrapper` devolve `stderrBytes` sem
decodificar. T8-C4 roda dois cenários vinculados, com e sem o hook do filho, e
exige em cada um `stderrBytes` igual à cópia, stdout byte a byte, código 17 e
`signal` null, além das asserções de captura de antes. O teste de sinal POSIX
passou a exigir também stdout e stderr inteiros.

### C16 — diagnóstico acessível no uso normal

Decisão: reaproveitar o resumo `delivery` do relatório existente (`bound`,
`code`, `entries`, `committed`, `persisted`, `lost`) e gravá-lo, numa linha
NDJSON por processo, no arquivo de caminho absoluto que o usuário indica em
`SKILL_ME_CAPTURE_REPORT` (`src/integrations/traces/delivery-report.mjs`;
`captureDeliveryFor` acrescenta `publish`, chamado por `flush` depois de
`settle`). A linha só sai quando o processo perdeu entregas ou não abriu a
captura (`code !== null || lost > 0`) e tem exatamente `skillMeDeliveryReport: 1`,
`at`, `agent` (nome do lote do `privacy ingest`, ou null), `capture` (ID já
validado, ou null com `binding_invalid`) e `delivery`. Alternativas descartadas:

- tornar o fd do relatório de fixture uma interface: hooks são iniciados pelo
  Claude/Codex e o ingest pelo plugin Hermes, sem fd aberto pelo usuário; o
  PowerShell não abre fd 3 para o filho; e o relatório traz os eventos em
  memória, que não devem ser persistidos fora da captura;
- contar a perda em `status`/`list`: com lock ocupado ou falha de E/S o store não
  pode gravar, e o `state.json` tem a forma fechada da #5 (`captureVersion: 1`,
  sem migração);
- arquivo dentro da raiz ou do store: escreveria em captura não escolhida (C6 e
  C14 exigem a árvore intacta) e entraria no conjunto que `delete`/`prune` apagam;
- stderr do produtor: pertence ao agente (crit. 3).

Landing: o par `SKILL_ME_CAPTURE_ROOT`/`SKILL_ME_CAPTURE_ID` continua o único
seletor de captura e o formato persistido não muda; a variável nova só escolhe o
destino opcional do diagnóstico, sem dado de evento. Por isso o Landing do
checklist não foi editado; a decisão fica registrada aqui para o Verifier e o
proprietário.

Comportamento: só caminho absoluto (relativo ignorado, como a raiz); só arquivo
regular, criado com modo 0o600 se faltar; link, pasta e FIFO não são tocados
(`lstat`; no POSIX também `O_NOFOLLOW` e `O_NONBLOCK`); uma escrita `O_APPEND`
por linha; dentro do prazo do relatório do processo (`deadlineAt` do `flush`);
nunca lança — se o arquivo não puder ser gravado, o diagnóstico se perde sem
mudar o agente. Sem o par do vínculo a variável não escreve.

Incidente do build: na primeira bateria de mutações, a restauração por
`git checkout` reverteu também as edições ainda não commitadas de
`observation.mjs`, `binding.mjs` e `delivery.mjs`, e duas mutações ficaram no
arquivo novo, ainda não rastreado. Os resultados dessa bateria foram
descartados. As edições foram reaplicadas e o diff conferido (as mesmas 17, 14
e 3 linhas); a prova C16 e a suíte T8 rodaram verdes; as mutações foram
refeitas depois do commit `34cde1a`, restaurando só arquivos commitados.

### C20 — guia

`docs/traces.md`, "Falhas de entrega": como definir `SKILL_ME_CAPTURE_REPORT`
(PowerShell e bash, caminho com espaço e acento), como ler (`Get-Content`/`cat`),
exemplo de linha, tabela de campos e regras (só falhas; sem caminho, valor de
variável, payload, erro ou stack; sem vínculo não escreve; relativo ignorado; só
arquivo regular; perda silenciosa se o arquivo não puder ser gravado;
`delete`/`prune` não o apagam; cresce uma linha por processo com falha).
"Configuração explícita" aponta a variável; "Capacidades demonstradas" separa o
que foi lido do arquivo do disco parado, provado só em processo.
`docs/agent-observation.md` cita o arquivo.

### Alterações em testes existentes

- `T8-C4` (fluxo): `endsWith` virou igualdade byte a byte; dois cenários; as
  asserções de stdout, código e captura continuam em cada cenário (o registro do
  hook do filho só no cenário com hook). `T8-C4` (sinal): mais stdout e stderr
  inteiros.
- `T8-C16` (existente): a confirmação perdida também precisa aparecer no arquivo
  de diagnóstico; as demais asserções ficaram como estavam.
- `T8-C20` (existente): a tabela de códigos é escolhida pelo cabeçalho
  (`tableByHeader`), porque a seção ganhou a tabela de campos; a asserção (igual a
  `DELIVERY_CODES`) é a mesma.
- Helpers, aditivos: `FAKE_CODEX_STDERR_COPY` no Codex falso; `stderrBytes` em
  `runWrapper`; `fixtureReport: false` em `runInternal` (sem
  `SKILL_ME_OBSERVER_REPORT_FD` nem fd 3).

### Provas novas

| Check | Teste | Afirma |
| --- | --- | --- |
| C4 | `T8-C4 supervised Codex live capture: … preserva stdout, stderr e código …` | por cenário (com e sem hook): exit 17, signal null, stdout = linhas do exec, `stderrBytes` = cópia do filho; cada evento do exec uma vez na captura; hook do filho com 1 registro ou nenhum |
| C16 | `T8-C16 … no uso normal, sem o relatório de fixture …` | hooks Claude e Codex pela linha instalada, ingest e wrapper sem fd de fixture: exit 0 e stdout/stderr vazios (wrapper: 9, stdout e stderr inteiros); uma linha exata por produtor com `lock_present` (1, 1, 2, 1 e 2 entradas); 4 hooks simultâneos com 4 linhas inteiras; `io_failure` real (pasta no nome do próximo segmento, rename falha no SO); `binding_invalid` com `capture: null` sem ecoar o ID; `capture_not_active`; entrega confirmada, variável sem vínculo, caminho relativo e arquivo impossível não escrevem nem mudam o agente; captura intacta; texto sem raiz, canário, ID nativo nem stack; POSIX: sem bits de grupo e outros; hook com diagnóstico ≤ 750 + 500 ms |
| C16 | `T8-C16 … o diagnóstico só recebe linha de falha …` | caminho ausente, vazio, relativo e absoluto; linha só com falha e forma exata; acréscimo sem sobrescrever; pasta e pasta-mãe ausente sem mudança nem exceção; link (POSIX) e FIFO sem leitor (POSIX) intocados e sem prender |
| C20 | `T8-C20 … o guia diz onde o usuário lê o diagnóstico …` | variável igual à do código nas duas seções; caminhos absolutos com espaço e acento; leitura aponta o mesmo arquivo; regras do texto; tabela de campos = chaves reais da linha; `agent` lista os produtores do lote; seguindo o guia (captura, três variáveis, lock ocupado, hook real) a linha gravada é o exemplo do guia a menos do ID e do instante |

### Mutações

Aplicadas ao produto commitado (ou ao guia), prova rodada e arquivo restaurado:

| Mutação | Prova | Resultado |
| --- | --- | --- |
| wrapper escreve uma linha no stderr antes do filho | C4 nova; C4 de `53d5e99` | nova falhou na igualdade byte a byte; a anterior passou (lacuna confirmada) |
| `flush` não chama `publish` | C16 | 2 falhas |
| linha também sem falha | C16 | 2 falhas |
| caminho relativo resolvido no cwd | C16 | 2 falhas |
| raiz do vínculo dentro da linha | C16 | 2 falhas |
| `O_TRUNC` no lugar de `O_APPEND` | C16 | 2 falhas |
| falha ao gravar escapa do acréscimo | C16 | 2 falhas (em processo e, pelo código do wrapper, na fronteira) |
| prazo do diagnóstico ignorado (espera 2 s) | C16 | 1 falha (teste de uso normal) |
| segue link (sem `lstat` nem `O_NOFOLLOW`), no WSL, cópia do tar de `0c108ee` | C16 | falhou: o alvo do link recebeu a linha; restaurado do tar, passou |
| campos da linha em outra ordem | C20 | falhou (exemplo do guia) |
| outro nome de variável | C20 | falhou |
| guia de `53d5e99` com a prova nova | C20 | falhou ("configuração aponta o diagnóstico"); a prova anterior passa com esse guia |
| `throw` dentro do `try` do acréscimo | C16 | sobreviveu: equivalente, o próprio `catch` absorve; trocada pela "falha ao gravar escapa" |

### Execuções e ausências

Linhas da tabela "Execuções" marcadas "correção 1", todas em `0c108ee`: os 20
comandos `Proof:` no Windows (cada um selecionou e rodou o teste nomeado: C4 dois,
C16 três, C20 dois, os demais um), `npm test` no Windows e `npm test` no WSL
Ubuntu. Medições na tabela de tempo.

- Windows: o caso de link do C16 não foi exercitado (criar link de arquivo exige
  privilégio; o teste registra o motivo) e FIFO não existe; os dois rodaram no
  WSL. `T8-C4 … sinal POSIX` pulado no Windows e executado no WSL.
- WSL: nenhum teste T8 pulado; skips pré-existentes iguais aos da fase 2.
- macOS não foi executado localmente. C21 continua dependente da CI do PR, que
  ainda não existe; nada aqui declara execução macOS.
- Não executados: Claude, Codex ou Hermes reais com modelo.

### Limites conhecidos desta rodada

- O arquivo de diagnóstico não tem teto: cresce uma linha por processo com
  falha, por exemplo a cada hook enquanto as variáveis apontarem para uma
  captura encerrada. Documentado; o usuário o apaga.
- No Windows a recusa de link depende do `lstat` antes do `open` (não há
  `O_NOFOLLOW`); uma troca entre os dois não é coberta.
- Fora do escopo desta rodada: `T8-C6` ainda confere o stderr do wrapper com
  `endsWith("stderr do filho\n")`, a mesma fragilidade apontada em C4. Não foi
  alterado porque a correção autorizada cobre só C4, C16 e C20.
