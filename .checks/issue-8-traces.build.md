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
  disputando o lock). Falha depois do commit nunca é reenviada. Refinado na
  rodada de correção 3 (abaixo): a tentativa cortada que já tinha o lock sai
  como `delivery_timeout`, e a cortada antes de obtê-lo não grava mais nada.
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
| Windows 11, correção 3 (`npm test` em `d823c00`) | 679 ms; com diagnóstico em arquivo, 666 ms; lock obtido na repetição e disco parado, 666 ms | 656 ms | 654 ms; lock obtido na repetição, 662 ms |
| WSL Ubuntu, correção 3 (`npm test` em `d823c00`) | 657 ms; com diagnóstico em arquivo, 658 ms; lock obtido na repetição e disco parado, 657 ms | 650 ms | 650 ms; lock obtido na repetição, 650 ms |
| Windows 11, correção 4 (`npm test`, Node 24.21.0) | 667 ms; com diagnóstico em arquivo, 662 ms; lock obtido na repetição e disco parado, 663 ms | 650 ms | 665 ms; lock obtido na repetição, 664 ms |
| Windows 11, correção 4 (`npm test`, Node 24.13.0, o da CI) | 676 ms; com diagnóstico em arquivo, 665 ms; lock obtido na repetição e disco parado, 663 ms | 657 ms | 653 ms; lock obtido na repetição, 657 ms |

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
| Windows 11 — Node 24.21.0, checkout em `e5ebb61` (correção 2) | `Proof:` de C6, como escrito | exit 0; 1 teste selecionado (T8-C6), 1 pass |
| Windows 11 — Node 24.21.0, checkout em `e5ebb61` (correção 2) | `node --test tests/integrations/traces/*.test.mjs` | exit 0; 24 tests, 23 pass, 0 fail, 1 skip (T8-C4 sinal POSIX) |
| Windows 11 — Node 24.21.0, checkout em `e5ebb61` (correção 2) | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 227 (220 pass, 0 fail, 7 skip: os 6 pré-existentes e T8-C4 sinal POSIX), T8-C6 inclusive |
| Windows 11 — Node 24.21.0, checkout em `d823c00` (correção 3) | os 20 comandos `Proof:` de C1–C20, como escritos | cada um exit 0, 0 fail; 29 testes selecionados, 28 pass, 1 skip (T8-C4 sinal POSIX); C16 seleciona 8 |
| Windows 11 — Node 24.21.0, checkout em `d823c00` (correção 3) | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 232 (225 pass, 0 fail, 7 skip: os 6 pré-existentes e T8-C4 sinal POSIX), os 8 T8-C16 inclusive; nome 8.3 exercitado |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i8-hVDkg9` de `git archive d823c00` (sha256 `e17a7ae8…20fb8203` conferido; `git get-tar-commit-id` = `d823c004…`) (correção 3) | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (416 pass, 1 skip); integrações 232 (220 pass, 0 fail, 12 skip pré-existentes: Hermes ausente ×8, DACL Windows ×3, ACL macOS ×1); nenhum T8 pulado, os 8 T8-C16 inclusive |
| Windows 11 — Node 24.21.0, árvore de trabalho sobre `b2c230c` com os dois testes da correção 4 | `node --test tests/integrations/traces/*.test.mjs` | exit 0; 29 tests, 28 pass, 0 fail, 1 skip (T8-C4 sinal POSIX) |
| Windows 11 — Node 24.13.0 (o da CI), mesma árvore (correção 4) | `node --test tests/integrations/traces/*.test.mjs` | exit 0; 29 tests, 28 pass, 0 fail, 1 skip (T8-C4 sinal POSIX) |
| Windows 11 — Node 24.13.0, mesma árvore (correção 4) | `Proof:` de C7, C11, C14, C15 e C16, como escritos | cada um exit 0, 0 fail, 0 skip; C7, C11, C14 e C15 selecionam 1, C16 seleciona 8 |
| Windows 11 — Node 24.21.0, mesma árvore (correção 4) | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 232 (225 pass, 0 fail, 7 skip: os 6 pré-existentes e T8-C4 sinal POSIX); 29 linhas T8, os 8 T8-C16 inclusive |
| Windows 11 — Node 24.13.0 e npm 11.6.2 do pacote oficial, Hermes oculto como na CI, mesma árvore (correção 4) | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 232 (217 pass, 0 fail, 15 skip: os 7 acima e Hermes ausente ×8, o mesmo conjunto da CI); 29 linhas T8 |

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
- ~~Fora do escopo desta rodada: `T8-C6` ainda confere o stderr do wrapper com
  `endsWith("stderr do filho\n")`, a mesma fragilidade apontada em C4. Não foi
  alterado porque a correção autorizada cobre só C4, C16 e C20.~~ — resolvido na
  rodada de correção 2 (abaixo).

## Rodada de correção 2 — C6

Origem: `.checks/issue-8-traces.verified.md` (Verifier, rodada 2 em `dc8c0fe`:
FAIL, 20/21; C6 com asserção insuficiente). Builder Claude, escopo só desse
achado. Só teste mudou: produto, `.tasks/issue-8-traces.md`,
`.checks/issue-8-traces.md` (comando `Proof:` de C6 inclusive), helpers, a
política da #5, `package.json` e os cinco arquivos do core (diff vazio contra
`origin/main`) ficaram como estavam. `.checks/issue-8-traces.verified.md`
pertence ao Verifier: não foi alterado nem entra nos commits. Sem push, PR,
merge, deploy ou revisão Codex.

### Commits

| Commit | Achado | Conteúdo |
| --- | --- | --- |
| `e5ebb61` | C6 | stderr inteiro do wrapper com vínculo ausente ou inválido comparado byte a byte com o do Codex falso |
| commit seguinte | — | este registro |

### C6 — stderr do wrapper sem vínculo válido

Achado: `T8-C6` afirmava só `wrapped.stderr.endsWith("stderr do filho\n")`;
uma linha do debugger emitida apenas no ramo `binding_invalid`, antes do stderr
do filho, passava em C6 e não era vista por C4 nem C16, que usam vínculo válido.

Correção, reaproveitando a fixture e o helper de C4: em cada uma das oito
variantes o wrapper roda com `FAKE_CODEX_STDERR_COPY` e `assertNativeStderr`
exige `stderrBytes` igual à cópia gravada pelo próprio filho (e que a cópia
contenha o probe). As cópias ficam numa pasta temporária própria, fora de `base`
e da raiz, porque a prova de que nada foi criado ou alterado compara as duas
árvores inteiras. Continuam em cada variante: código 17, stdout byte a byte, o
código de vínculo do relatório (ou relatório sem `delivery` sem nenhuma
variável), a árvore da raiz e a lista de `base` inalteradas, os três produtores
com código 0, stdout e stderr vazios, e, no fim, os contadores zerados da captura
ativa. Acrescentada `signal` null do wrapper, que o veredito lista no esperado
(código/sinal/stdout preservados) e C6 não afirmava.

### Mutação

Aplicada a `src/integrations/codex-run.mjs` commitado, logo depois de
`captureDeliveryFor`: `if (delivery?.report().code === "binding_invalid")
process.stderr.write("skill-me integrations run: vínculo de captura inválido;
nada será gravado\n")` — aviso do debugger só no ramo de vínculo inválido,
antes do filho.

| Prova | Resultado com a mutação |
| --- | --- |
| C6 nova (`e5ebb61`), comando `Proof:` | falhou na primeira variante inválida, "só a raiz": `stderrBytes` = 5633 bytes começando por `skill-me integrations run: ví…`, diferente da cópia do filho |
| C6 de `dc8c0fe` (`git show HEAD:…` num arquivo temporário `.tmp.mjs` ao lado do original, fora do glob `*.test.mjs`, rodado pelo caminho explícito) | passou: lacuna confirmada |
| `node --test tests/integrations/traces/*.test.mjs` com a C6 nova | 24 tests, 22 pass, 1 fail, 1 skip; a única falha foi T8-C6 (C4 e os três C16 passaram) |

Restauração: cópia de `codex-run.mjs` feita antes da mutação, numa pasta de
`mktemp -d` fora do repositório, copiada de volta; `git diff --quiet --
src/integrations/codex-run.mjs` vazio; arquivo temporário do teste antigo e
cópia removidos. As execuções abaixo foram feitas depois da restauração.

### Execuções e ausências

Linhas da tabela "Execuções" marcadas "correção 2", todas em `e5ebb61`, cuja
única diferença para o commit deste registro é este arquivo: `Proof:` de C6 no
Windows (selecionou e rodou T8-C6), o lote de traces no Windows e `npm test` no
Windows, com T8-C6 entre os testes executados.

- `T8-C4 … sinal POSIX` continua pulado no Windows (mesmo motivo); não é
  afetado pela mudança.
- WSL Ubuntu e macOS não foram executados nesta rodada. A mudança é só de
  teste, sem ramo por plataforma (escrita do Codex falso por `appendFileSync`,
  comparação de `Buffer`); a última execução WSL é a da correção 1, em
  `0c108ee`, com a C6 anterior.
- Não executados: Claude, Codex ou Hermes reais com modelo.

### Limites desta rodada

- A cópia é escrita pelo próprio Codex falso: a prova compara o stderr do
  wrapper com o que o filho declarou ter escrito, não com uma captura
  independente do fd 2 do filho. É o mesmo limite aceito em C4 e C16.
- A mutação cobre um prefixo; um sufixo ou uma linha no meio no mesmo ramo
  também quebrariam a igualdade, mas não foram aplicados separadamente.

## Rodada de correção 3 — revisão Codex local, P1 e P2

Origem: `.checks/code-review/issue-8/state.json`, última tentativa (HEAD
`7250a69`, `changes_requested`, `verification: insufficient`), com três achados.
Corrigidos aqui os dois de produto: **P1** (`delivery-report.mjs:18`, o
diagnóstico podia corromper o store) e **P2** (`delivery.mjs:73`, código de
prazo herdado de um `lock_present` anterior). O terceiro achado (macOS em
C21/AC8) é uma decisão de ordem pendente do proprietário: nada aqui declara
execução macOS. Builder Claude, escopo só desses dois defeitos. Não mudaram:
`.tasks/issue-8-traces.md`, `.checks/issue-8-traces.md` (21 checks, comandos
`Proof:` e Landing), `.checks/issue-8-traces.verified.md` (do Verifier; não
alterado nem commitado), o histórico do motor em `.checks/code-review/`,
`package.json` e os cinco arquivos do core (diff vazio contra `origin/main`).
Sem push, PR, merge, deploy ou revisão Codex.

### Commits

| Commit | Achado | Conteúdo |
| --- | --- | --- |
| `e175e68` | P1 | `delivery-report.mjs` recusa caminho real dentro de qualquer store e hard link; regressão com 22 grafias no Windows e o cenário da revisão pela CLI |
| `edd9d69` | P2 | `onLock` no store (`appendRecords`, `openCaptureForIngest`); `untilDeadline` distingue corte com e sem o lock e desfaz a tentativa abandonada; quatro regressões e duas variáveis na pré-carga de teste |
| `40290e6` | P1, P2 | guia: recusa do store no diagnóstico; `lock_present` e `delivery_timeout` |
| `d823c00` | P1 | variante do fluxo da pasta do store em maiúsculas (torna observável a comparação sem maiúsculas) |
| commit seguinte | — | este registro |

### P1 — diagnóstico apontado para um arquivo do store

Cenário da revisão: captura encerrada, `SKILL_ME_CAPTURE_REPORT` = caminho
absoluto do `state.json` dela, hook tardio com `capture_not_active`. Antes,
`appendLine` abria qualquer arquivo regular com `O_APPEND`: a linha entrava no
`state.json` e `export`, `follow`, `list`, `delete` e `prune` passavam a
responder `capture_invalid`.

Decisão: o acréscimo não escreve quando o caminho real da pasta do arquivo
(`realpath` de `dirname`) ou o nome final tem um componente
`skill-me-privacy` (comparado sem maiúsculas; no Windows, o nome final sem o
fluxo `:nome`), nem quando o arquivo tem mais de um nome (`nlink > 1`, no
`lstat` antes do `open` e no handle depois). A linha se perde, como nas demais
recusas; o agente não percebe e o código da entrega não muda. `STORE_DIR` vem
de `store.mjs` (fonte única do nome; o módulo já é carregado pela entrega).

Caminhos equivalentes e indiretos considerados. Antes do código, uma sonda
no Windows 11 (scripts em `%TEMP%`, fora do repositório) mostrou que o
`realpath` da pasta-mãe resolve `.`/`..`, separador duplo, barras normais,
prefixo `\\?\`, maiúsculas das pastas, nome curto 8.3 (`SKILL-~1`), junção e
unidade `subst` apontando para o store; que `state.json.` cria no Windows um
arquivo distinto na pasta da captura e `::$DATA` abre o próprio `state.json`
(os dois caem na pasta-mãe dentro do store); que um fluxo nomeado da pasta do
store abre como arquivo regular; e que `lstat` informa `nlink` 2 num hard
link. Na regressão estão todos esses, menos separador duplo e `subst` (só
sonda). Hard link para `state.json` ou `key` fora do store só é visto pelo
`nlink`; o fluxo nomeado da pasta do store (`<raiz>\SKILL-ME-PRIVACY:x`) só
pelo nome final sem o fluxo e sem maiúsculas.

Alternativas descartadas:

- comparação léxica do caminho: não vê junção, link, nome 8.3 nem `subst`
  (mutação M3 abaixo);
- só o store da raiz do vínculo: com o par inválido não há raiz, e o store de
  outra raiz no mesmo disco seria corrompido igual;
- identidade (`dev`/`ino`) dos ancestrais contra a pasta do store vinculado:
  cobriria bind mount, mas não o par inválido nem outras raizes, e acrescenta
  uma varredura por publicação; sem necessidade demonstrada além do nome;
- recusar toda a raiz da captura: o guia já recomenda um arquivo fora dela,
  mas fora do store nada da raiz é lido ou apagado pela #5, e uma raiz como o
  diretório do usuário perderia o diagnóstico sem motivo de integridade.

### P2 — código do prazo depois de um lock ocupado

Cenário da revisão: a primeira tentativa recebe `lock_present`; a repetição
obtém o lock e o disco para. Antes, o timer devolvia o `code` da tentativa
anterior (`lock_present`) e a operação podia ainda gravar. Ao analisar o
achado apareceu um segundo efeito do mesmo defeito, confirmado pela regressão
do caso 3 no produto anterior: uma tentativa cortada **antes** de obter o
lock, se o obtivesse depois do prazo, gravava a entrada que a entrega já
tinha contado perdida com `lock_present`.

Decisão: `withLock` chama `ctx.onLock` assim que o lock é da operação, antes
de qualquer leitura ou mutação, e uma exceção ali libera o lock sem mudar
nada; `appendRecords` e `openCaptureForIngest` aceitam `onLock` (os demais
comandos não mudam). `untilDeadline` marca `locked` nesse aviso; no corte,
`locked` → `delivery_timeout` (confirmação incerta); senão vale o código
anterior, e a tentativa fica `abandoned`: se obtiver o lock depois, `onLock`
lança e o store o devolve. Assim `lock_present` nunca acompanha uma gravação
tardia, e `delivery_timeout` é o único código em que a entrada perdida ainda
pode aparecer na captura.

Alternativas descartadas:

- todo corte vira `delivery_timeout`: com o lock alheio, a última repetição
  pode começar a menos de 1 ms do prazo (a espera de até 10 ms usa timers de
  resolução de milissegundo) e ser cortada antes do `EEXIST`, trocando de
  forma intermitente o diagnóstico de um lock realmente ocupado — raciocínio
  sobre o timer, não medido; as provas de lock alheio de C15/C16 exigem
  `lock_present` exato;
- não começar repetição perto do prazo: limiar heurístico, e um `EEXIST` sob
  carga pode passar dele;
- envolver `io.writeExclusive` na entrega para reconhecer o `.lock`: depende
  do nome interno do arquivo de lock do store.

### Provas novas

Todas em `tests/integrations/traces/concurrency.cli.test.mjs`, com o prefixo
`T8-C16 delivery failure neutrality`, selecionadas pelo `Proof:` de C16
(agora 8 testes: os 3 anteriores e estes 5).

| Teste | Afirma |
| --- | --- |
| `SKILL_ME_CAPTURE_REPORT dentro do store, por qualquer grafia, link ou hard link, …` | por variante, numa cópia nova de uma raiz com uma captura encerrada (1 registro) e uma ativa: hook real com exit 0 e stdout/stderr vazios; código da entrega igual ao esperado (`capture_not_active`, `binding_invalid` com o par inválido, `lock_present` com lock alheio); árvore da raiz idêntica (hash e mtime); o caminho apontado não foi criado; lock alheio intacto; `exportCapture` das duas iguais ao modelo, `listCaptures` e `pruneCaptures` sem `failed`, `deleteCapture --apply` apaga. Variantes: `state.json`, `key`, segmento, `store.json`, `.lock` ausente, nome novo na captura e em `captures`, `.`/`..`, maiúsculas, link da captura, link do store, raiz do vínculo e diagnóstico pelo mesmo link, hard link do `state.json` e da `key`, par inválido, captura ativa com lock; no Windows também barras normais, `\\?\`, ponto final, `::$DATA`, fluxo da pasta do store em maiúsculas e nome 8.3 (pulado com diagnóstico se o volume não gerar nomes curtos). Depois, o cenário da revisão pela CLI: `state.json` intacto; o mesmo hook com arquivo fora do store grava uma linha `capture_not_active` exata, sem raiz nem caminho; `privacy export` igual ao modelo, `list`, `follow` (`record`, `end`, exit 0), `prune` sem `failed` e `delete --apply` |
| `commit cortado no prazo depois de obter o lock na repetição sai como delivery_timeout, …` | em processo, lock 1 (abertura) real, 2 `EEXIST`, 3 obtido e segmento parado: relatório exato com `delivery_timeout`, ≤ 750 ms, 3 criações de lock; liberado o disco, o registro aparece uma vez e o segmento fica coerente (confirmação incerta) |
| `abertura cortada no prazo depois de obter o lock na repetição …` | lock 1 `EEXIST`, 2 obtido, leitura do `state.json` parada: `delivery_timeout`, ≤ 750 ms; captura intacta depois |
| `tentativa cortada no prazo antes de obter o lock sai como lock_present e, obtido o lock depois, não grava nada` | lock 2 `EEXIST`, criação 3 parada até depois do prazo: `lock_present`, ≤ 750 ms; liberada, a tentativa obtém e devolve o lock; captura idêntica, sem `.lock`, `persisted` 0 |
| `no hook real, lock obtido na repetição e disco parado aparecem como delivery_timeout no diagnóstico, …` | hook real com `SKILL_ME_TEST_TRACES_BUSY_LOCK=2` e `SKILL_ME_TEST_TRACES_STALL_SEGMENT=1`: exit 0, stdout/stderr vazios, ≤ 750 + 500 ms do fim do stdin à saída; relatório de fixture e linha única do arquivo de diagnóstico com `delivery_timeout`, sem raiz, canário, ID nativo nem stack; o `.lock` do processo que saiu no meio do commit fica (limite do guia) e, removido, a captura está como antes |

Alterações em testes existentes: nenhuma asserção anterior mudou. A
pré-carga `helpers/traces-probe.mjs` ganhou duas variáveis aditivas
(`SKILL_ME_TEST_TRACES_BUSY_LOCK`, `SKILL_ME_TEST_TRACES_STALL_SEGMENT`); o
produto não as lê.

### Falha no comportamento anterior

Os testes novos foram escritos e executados antes da correção, no produto de
`7250a69` (Windows 11, Node 24.21.0):

- P1: o teste falhou com as **22** variantes do Windows danificando o store —
  90 itens; por exemplo `state.json`: árvore mudou, `export`/`list`/`prune`/
  `delete` com `capture_invalid`; `store.json`: tudo `store_invalid`; `.lock`
  ausente: lock criado e toda operação com `lock_present`; nome novo na
  captura e `state.json.`: `delete` com `foreign_entry`; links, 8.3, `\\?\`,
  `::$DATA` e hard links: `capture_invalid`; fluxo da pasta do store: criado.
  Nessa execução o fluxo ainda estava em minúsculas; a variante em maiúsculas
  de `d823c00` também falhou ("o caminho apontado foi criado") com o
  `delivery-report.mjs` de `7250a69` no lugar, restaurado por `git checkout`.
- P2: com `delivery.mjs` e `store.mjs` de `7250a69` no lugar (cópia de
  segurança fora do repositório, restaurada e conferida com `cmp`), os quatro
  testes falharam — commit, abertura e hook real com `lock_present` em vez de
  `delivery_timeout`; o corte antes do lock com `events-000001.ndjson` e
  `state.json` gravados depois do prazo.

### Mutações

Aplicadas ao produto já commitado (`d823c00`) por um script fora do
repositório, prova rodada e arquivo restaurado com `git checkout --`; árvore
limpa conferida antes e depois.

| Mutação | Prova | Resultado |
| --- | --- | --- |
| M1 sem a recusa do store (`insideStore`) | P1 | falhou: 20 variantes (todas menos os dois hard links) |
| M2 sem a recusa de hard link (`nlink`) | P1 | falhou: hard link do `state.json` e da `key` |
| M3 caminho léxico (`path.resolve`) no lugar do `realpath` | P1 | falhou: link da captura, link do store, nome 8.3 |
| M4 nome final com o fluxo `:nome` | P1 | falhou: fluxo da pasta do store |
| M5 comparação que diferencia maiúsculas | P1 | falhou: fluxo da pasta do store em maiúsculas |
| M6 o timer devolve o código anterior, como antes da correção | P2 | 3 de 4 falharam (commit, abertura, hook); o corte antes do lock passou, como esperado |
| M7 tentativa abandonada ainda grava (sem a exceção de `onLock`) | P2 | falhou: corte antes do lock |
| M8 `withLock` não chama `onLock` | P2 | 4 de 4 falharam |

### Execuções e ausências

Linhas da tabela "Execuções" marcadas "correção 3", todas em `d823c00`, cuja
única diferença para o commit deste registro é este arquivo: os 20 comandos
`Proof:` no Windows (cada um selecionou e rodou os testes nomeados: C4 dois,
C16 oito, C20 dois, os demais um), `npm test` no Windows e `npm test` no WSL
Ubuntu (stage `skill-me-i8-wsl-stage-MlC4S1`, mesmo `run-wsl.sh` da correção 1,
que recusa root, outra distro, hash ou commit diferente). Medições na tabela
de tempo. O pedido desta rodada exigia só Windows; o WSL foi executado para
exercitar os ramos POSIX das provas novas.

- Windows: os links de pasta das variantes de P1 são junções (não exigem
  privilégio); o link de arquivo e o FIFO do teste C16 anterior continuam não
  exercitados, como antes. `T8-C4 … sinal POSIX` pulado (mesmo motivo).
- WSL: as variantes de P1 com link usam symlink de pasta; as grafias só do
  Windows (barras, `\\?\`, ponto final, `::$DATA`, fluxo e 8.3) não se aplicam
  e o teste o registra; "maiúsculas" no Linux é um caminho inexistente. Nenhum
  teste T8 pulado; skips pré-existentes iguais aos da correção 1.
- macOS não foi executado. A ordem entre a revisão `ready` e a CI macOS do PR
  é a decisão pendente do proprietário (terceiro achado da revisão, C21/AC8);
  nada aqui a resolve nem declara execução macOS.
- Não executados: Claude, Codex ou Hermes reais com modelo.

### Limites desta rodada

- O nome é a fronteira: um mecanismo que exponha a pasta do store sob outro
  nome sem que o `realpath` o resolva (bind mount do Linux, por exemplo) não é
  reconhecido. Exige montagem privilegiada; não exercitado.
- Entre o `realpath`/`lstat` e o `open` uma pasta-mãe pode ser trocada por uma
  junção por outro processo do mesmo usuário; a troca não é coberta (o mesmo
  limite do `lstat` antes do `open` no Windows, já registrado).
- A recusa de hard link depende de o sistema de arquivos informar `nlink`; um
  que sempre informe 1 não a teria.
- Um commit que já tinha o lock no prazo continua: num processo longo
  (wrapper, ingest Hermes) ele pode gravar a entrada contada como perdida com
  `delivery_timeout` — por isso o guia o chama de confirmação incerta. Se o
  processo sair no meio dele, o `.lock` fica, como antes.
- O fluxo nomeado da pasta do store só existe no Windows; a recusa de
  `pasta:fluxo` só vale lá.

## Exceções autorizadas pelo proprietário — 18/10/2026

O proprietário autorizou nesta conversa duas exceções pontuais para a issue #8:
uma quarta verificação independente das correções P1/P2 e o push exclusivo da
branch `codex/issue-8-traces`, sem PR ou merge nessa etapa, para executar
`workflow_dispatch` na CI macOS antes da segunda e última revisão formal.
Esta autorização substitui a pendência de ordem registrada acima; não altera
o teto de duas tentativas de revisão nem autoriza outras publicações.

## Rodada de correção 4 — CI Windows em `b2c230c`

Origem: CI run `39191712082` (`workflow_dispatch` da branch, `headSha`
`b2c230c`), job Windows `117865804739`. `npm run test:integrations` saiu 1
com 227 tests, 206 pass, 6 fail, 15 skip: T8-C15, dois T8-C16, T8-C7, T8-C11 e
T8-C14. Ubuntu e macOS passaram. Builder Claude; só testes mudaram. Não
mudaram: produto (`src/`), `.tasks/issue-8-traces.md`,
`.checks/issue-8-traces.md`, `.checks/issue-8-traces.verified.md` (do
Verifier), `package.json`, `.github/workflows/` e os cinco arquivos do core
(diff vazio contra `origin/main`, blobs da tabela de Governança). O prazo de
750 ms, a reserva de 100 ms, as asserções, as tolerâncias e a concorrência do
runner ficaram como estavam. Sem commit, push, PR, merge ou revisão Codex.

### Diagnóstico

A diferença decisiva é a versão do Node, não a carga. A CI fixa
`node-version: 24.13.0`; as execuções locais das rodadas anteriores usaram a
24.21.0. Sondas em `%TEMP%`, fora do repositório, com os binários oficiais
win-x64 da 24.13.0 e da 24.13.1 baixados de nodejs.org e conferidos pelo
`SHASUMS256.txt`; página de código ANSI local 1252, a mesma de um Windows en-US:

| Chamada num caminho com "ação" | 24.13.0 | 24.13.1 | 24.21.0 |
| --- | --- | --- | --- |
| `rmSync(arquivo)` | não apaga e não lança | apaga | apaga |
| `rmSync(pasta, { recursive, force })` | não apaga | — | apaga |
| `cpSync(pasta, destino, { recursive })` | o processo morre com 0xC0000409 e deixa uma pasta com o nome trocado (`aÃ§Ã£o`) | idem | copia |
| `unlinkSync`, `rmdirSync`, `cp`/`rm` de `node:fs/promises` | funcionam | — | funcionam |

O defeito do `rmSync` já estava registrado nos testes da #4
(`tests/integrations/install.cli.test.mjs` e
`install-apply.unit.test.mjs`: nodejs/node#56049, corrigido na 24.13.1), com o
mesmo remédio. Toda pasta de teste tem "ação" no nome (`makeScratch`).

Cada falha da CI, com as linhas de `b2c230c`:

- **`lock_present` depois de remover o lock alheio** — T8-C15 (`export` na
  linha 112), T8-C16 "lock ocupado…" (esperava `io_failure` na linha 149) e
  T8-C16 "no uso normal…" (esperava `io_failure` na linha 282). As três vêm
  logo depois de um `rmSync(lock)` (linhas 111, 140 e 270) do lock alheio que
  o próprio teste gravou. No 24.13.0 o lock ficava, e o passo seguinte o
  disputava até o prazo.
- **Testes que não rodaram** — `concurrency.cli.test.mjs` tem 9 testes, e a CI
  listou 4 (227 contra os 232 locais). O quinto ("`SKILL_ME_CAPTURE_REPORT`
  dentro do store…") abre com `cpSync` para uma raiz com "ação", e o processo
  do arquivo morreu. Como já havia subtestes falhos, o `node --test` não acusou
  o arquivo nem os cinco que faltaram: as regressões de P1 e P2 da rodada 3 não
  rodaram no Windows da CI. Os 15 skips são os esperados.
- **Latente em T8-C14** — o `rmSync` do `alheio.txt` (linha 252) também não
  apaga no 24.13.0, e o `prune --apply` sai com `foreign_entry` (visto
  localmente, linha 256). Na CI, C14 falhou antes, na linha 217.
- **`delivery_timeout` numa entrega normal** — T8-C7 (execução `unknown`,
  linha 372) e T8-C14 (linha 217); em T8-C11, `export` com `lock_present` na
  linha 194, sem nenhum `rmSync` antes. Inferido para C11, que não afirma o
  código dos produtores: uma tentativa passou dos 650 ms com o lock e o
  processo saiu no meio do commit, deixando o `.lock` (limite do guia). Este
  grupo não foi reproduzido localmente (abaixo).

Reproduções locais: Windows 11, i9-14900K, com a afinidade restrita a 4 E-cores
(16–19) para imitar as 4 vCPUs do runner `windows-latest` de repositório
público (imagem `windows-2025-vs2026` no log do job); `--test-concurrency=3`,
que é o padrão `availableParallelism() - 1` em 4 vCPUs; o mesmo glob de
`test:integrations`.

| Execução | Node | Árvore | Resultado |
| --- | --- | --- | --- |
| R1 | 24.21.0 | `b2c230c` | 232 tests, 225 pass, 0 fail, 7 skip (Hermes presente), 388 s: a carga sozinha não reproduz |
| R2 | 24.13.0 | `b2c230c` | 227 tests, 210 pass, 10 fail, 7 skip, 373 s: T8-C15 e os dois T8-C16 com `lock_present` nas mesmas linhas da CI; T8-C14 com `foreign_entry` (linha 256); os mesmos cinco T8-C16 ausentes; I4-C19–C22, I4-C37 e I4-C35 falham porque aqui o Hermes existe e seus testes usam `cpSync`/`rmSync` (fora do escopo; na CI são pulados por Hermes ausente) |
| R3 | 24.13.0 | correção, Hermes oculto (`SKILL_ME_HERMES_PYTHON` inexistente) | 232 tests, 217 pass, 0 fail, 15 skip, 349 s; os 15 skips são os da CI, comparados por nome |
| R4 | 24.13.0 | como R3, com a sonda de entrega rodando ao mesmo tempo nos mesmos núcleos | 232 tests, 217 pass, 0 fail, 15 skip, 365 s |

Folga do prazo, medida por uma sonda em processo: o `createCaptureDelivery`
real abre e grava uma entrada Claude por entrega, numa captura nova com
"ação", com o Node 24.13.0 e 4 E-cores. É o mesmo intervalo da tentativa de
650 ms (da entrada ao fim). A captura enche em 500 registros, e depois só o
`state.json` é regravado.

| Condição | Entregas | p50 | p90 | p99 | máx. | Códigos |
| --- | --- | --- | --- | --- | --- | --- |
| ociosa | 200 | 15 ms | 20 ms | 26 ms | 29 ms | todas confirmadas |
| ociosa | 3000 | 12 ms | 16 ms | 27 ms | 68 ms | todas confirmadas |
| durante R4, amostra 1 | 600 | 17 ms | 36 ms | 78 ms | 107 ms | todas confirmadas |
| durante R4, amostra 2 | 600 | 22 ms | 45 ms | 87 ms | 115 ms | todas confirmadas |

Na mesma execução da CI, os testes de store em processo (`I5-*s`, `I5-S-*`)
levaram 2 a 4 vezes o tempo da R2, e os dominados por processos, de 0,9 a 1,8
vez. Mesmo multiplicado por 4, o máximo medido sob carga fica abaixo dos 650
ms. A carga e a concorrência do runner, sozinhas, não explicam o
`delivery_timeout` e não o reproduziram. Por isso a concorrência não foi
alterada: não há causa demonstrada.

O único evento transitório identificado na execução da CI é o processo de
`concurrency.cli.test.mjs` morto com 0xC0000409. Nos runners, o Windows Error
Reporting continua enfileirando relatórios: o `Configure-Diagnostics.ps1` do
`actions/runner-images` (branch principal, consultada em 19/10/2026) só desliga
a UI e define `ForceQueue=1`. Já o Defender
está com tempo real desligado e `C:\` e `D:\` excluídos
(`Configure-WindowsDefender.ps1`). Que o WerFault desse processo tenha
disputado as 4 vCPUs no momento de C7, C11 e C14 é hipótese, não fato provado:
o log da CI não tem o horário de cada teste, porque o reporter imprime os
arquivos em bloco e todas as linhas T8 têm o carimbo `02:56:27.98`.

### Correção (só testes)

- `tests/integrations/traces/concurrency.cli.test.mjs`: sete `rmSync(lock)`
  viraram `unlinkSync(lock)`; `rmSync(blocker, { recursive: true })` virou
  `rmdirSync(blocker)`, porque a pasta é vazia e a chamada falha se sobrar
  algo; os dois `cpSync(template, …, { recursive: true })` viraram
  `await cp(…)` de `node:fs/promises`, com as mesmas opções (implementação JS
  sobre libuv, que funciona no 24.13.0). Comentário no topo com o porquê.
- `tests/integrations/traces/query.cli.test.mjs` (T8-C14): `rmSync` do
  `alheio.txt` virou `unlinkSync`, com comentário.

Justificativa: o teste não estava errado no que afirma, mas, no Node da CI,
partia de outro estado (o lock alheio e o arquivo alheio continuavam lá) ou
nem rodava. Os substitutos lançam se não conseguirem, então a prova não segue
silenciosamente de um estado diferente do declarado. Nenhuma asserção, prazo,
tolerância, fixture ou helper mudou. O store não confere modos, então `cp` e
`cpSync` dão o mesmo modelo para o produto também no POSIX. Os
`rmSync(dir, { recursive: true, force: true })` de limpeza nos `after` ficaram:
não sustentam nenhuma prova (limite abaixo).

### Falha antes, passa depois

- Antes (R2; Node 24.13.0, `b2c230c`): T8-C15 e dois T8-C16 com
  `lock_present`, como na CI; T8-C14 com `foreign_entry`; cinco T8-C16 não
  executados, como na CI.
- Depois (Node 24.13.0, árvore corrigida): `node --test` dos dois arquivos
  alterados com 13 tests e 13 pass, os cinco T8-C16 de antes inclusive; o lote
  T8, os `Proof:` afetados, R3, R4 e `npm test` com o Hermes oculto (tabela
  "Execuções", linhas "correção 4").
- No 24.21.0 os testes antigos passam (R1 e o `npm test` das rodadas
  anteriores). Por isso o Windows local não via o defeito.
- Não demonstrado: que C7, C11 e C14 (`delivery_timeout`) passem na CI depois
  da correção. Essa é a prova pendente da reexecução da CI.

### Execuções e ausências

Linhas "correção 4" das tabelas "Execuções" e "Medições de tempo", todas na
árvore de trabalho sobre `b2c230c`, com os dois arquivos de teste alterados e
sem commit: lote T8 no 24.21.0 e no 24.13.0; `Proof:` de C7, C11, C14, C15 e
C16 no 24.13.0; `npm test` no 24.21.0 e no 24.13.0 com o Hermes oculto. Os
dois `npm test` rodaram antes desta seção. T8-C20, a única prova que lê este
arquivo, rodou de novo depois dela pelo seu `Proof:`: 2 tests, 2 pass, 0 fail,
no 24.21.0 e no 24.13.0.

- `T8-C4 … sinal POSIX` continua pulado no Windows.
- WSL Ubuntu e macOS não foram executados nesta rodada. A mudança só troca
  chamadas de fs em testes por equivalentes portáveis, e o defeito é do Windows
  com página de código ANSI. Ubuntu e macOS passaram na CI em `b2c230c` com as
  chamadas antigas.
- **CI pendente de reexecução** no HEAD com esta correção. Sem push nesta
  rodada, por instrução. Na reexecução, conferir no job Windows
  `tests 232`, 0 fail e 15 skip (o mesmo conjunto acima), e não só o código de
  saída: um arquivo que morre depois de um subteste falho some do total sem
  ser acusado.
- Não executados: Claude, Codex ou Hermes reais com modelo.

### Limites e achados fora do escopo

- Se o `delivery_timeout` de C7, C11 ou C14 voltar na CI sem o processo
  morto, o prazo no runner Windows precisa de medida no próprio runner e de
  decisão do proprietário. Esta rodada não muda prazo, reserva, asserções nem
  concorrência.
- No Node 24.13.0 no Windows, a limpeza `rmSync(dir, { recursive: true,
  force: true })` dos `after` (todos os arquivos T8 e outros da suíte) não
  apaga as pastas com "ação". Elas ficam no `%TEMP%` do runner, que é
  descartável. Nenhuma prova depende disso.
- Fora do escopo, comunicado sem correção: `hermes-plugin.native.test.mjs`
  (linha 54) e `skill-tree-hash.cli.test.mjs` (linha 88) usam `cpSync` para
  pastas com "ação". No 24.13.0 com o Hermes presente, I4-C19–C22, I4-C37 e
  I4-C35 falham (R2). Na CI eles são pulados por Hermes ausente, e a prova
  nativa do Hermes já está declarada pendente.
- Fora do escopo, comunicado: o `node --test` não acusa os testes de um
  arquivo que morre depois de um subteste falho. Na CI, só o total de testes
  revela a perda.
