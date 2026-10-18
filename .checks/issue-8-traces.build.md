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

Em processo a asserção é ≤ 750 ms exatos. No processo real a medida inclui o
encerramento depois da tentativa; a asserção admite 750 + 500 ms.

## Execuções

| Plataforma | Comando | Resultado |
| --- | --- | --- |
| Windows 11 — Node 24.21.0, checkout em `132cb6e` | `node --test` dos sete arquivos de `tests/integrations/traces/` exceto `docs.test.mjs` | 20 tests, 19 pass, 0 fail, 1 skip (T8-C4 sinal POSIX) |
| WSL Ubuntu — Node 24.13.0, uid 1000, distro `Ubuntu`, `/tmp/skill-me-i8-YgTUkP` de `git archive 132cb6e` (sha256 `c0b8dfdb…7c7525` conferido; `git get-tar-commit-id` = `132cb6e4…`), `node_modules` copiado do checkout | mesmo alvo | 20 tests, 20 pass, 0 fail, 0 skip |
| Windows 11 — Node 24.21.0, checkout em `bdd70af` | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 224 (217 pass, 0 fail, 7 skip: os 6 pré-existentes e T8-C4 sinal POSIX), T8-C20 inclusive |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i8-LhxqxN` de `git archive bdd70af` (sha256 `dfbd41ee…1e80c483` conferido; `git get-tar-commit-id` = `bdd70af0…`) | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (416 pass, 1 skip); integrações 224 (212 pass, 0 fail, 12 skip pré-existentes: Hermes ausente ×8, DACL Windows ×3, ACL macOS ×1), T8-C20 inclusive |

Preparação WSL: tar e `run-wsl.sh` num diretório de `mktemp -d` do `%TEMP%`
(`skill-me-i8-wsl-stage-n0fAaX` na fase 1, `skill-me-i8-wsl-stage-71TySJ` na 2), chamados com `MSYS_NO_PATHCONV=1 wsl.exe -d
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
- O resumo `delivery` só sai no relatório de fixture; para o usuário, a cobertura
  aparece nos contadores de `status`/`list`.
- E2E real com agentes e modelos continua pendente.
