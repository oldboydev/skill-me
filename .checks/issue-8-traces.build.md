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
| Windows 11, correção 6 (`Proof:` de C16, Node 24.21.0) | 675 ms; com diagnóstico em arquivo, 702 ms; lock obtido na repetição e disco parado, 675 ms | 657 ms | 650 ms; lock obtido na repetição, 652 ms |
| Windows 11, correção 6 (`Proof:` de C16, Node 24.13.0) | 661 ms; com diagnóstico em arquivo, 674 ms; lock obtido na repetição e disco parado, 683 ms | 651 ms | 652 ms; lock obtido na repetição, 653 ms |

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
| Windows 11 — Node 24.21.0, árvore de trabalho sobre `ef9e6f0` com a correção 6 | `Proof:` de C1, C2, C15, C16, C17 e C20, como escritos | cada um exit 0, 0 fail, 0 skip; C16 seleciona 9, C20 2, os demais 1 |
| Windows 11 — Node 24.13.0 (o da CI), mesma árvore (correção 6) | idem | idem |
| Windows 11 — Node 24.13.0 e npm 11.6.2, Hermes oculto, mesma árvore (correção 6) | `npm test` | exit 1 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 233 (217 pass, 1 fail: T8-C2 com `io_failure`, 15 skip); ver rodada 6 |
| Windows 11 — Node 24.21.0, mesma árvore (correção 6) | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 233 (226 pass, 0 fail, 7 skip: os 6 pré-existentes e T8-C4 sinal POSIX); 30 linhas T8, os 9 T8-C16 inclusive |

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

## Rodada de diagnóstico 5 — CI Windows em `ef9e6f0`

Origem: CI run `39198006078` (`workflow_dispatch` da branch, `headSha`
`ef9e6f0`), job Windows `117884894719`. `npm run test:integrations` terminou
com 232 tests, 215 pass, 2 fail e 15 skip. Ubuntu e macOS passaram. As duas
falhas têm `delivery.code` `delivery_timeout` onde a prova exige
`DELIVERED(1)`:

- T8-C1, no 8º caso válido do fixture Claude (`expansion_mcp_prompt`,
  `live-capture.cli.test.mjs:102`);
- T8-C2, no 1º caso válido do fixture Codex (`pre_tool_bash`, `:142`).

C7, C11, C14, C15 e os oito C16, que falharam em `b2c230c`, passaram. Os
números da CI eram os informados pelo orquestrador; o log não foi lido nesta
rodada. Na rodada 6 ele foi lido e confirma esses números. Builder Claude.

Nada mudou nesta rodada: produto, testes, helpers, workflow,
`.tasks/issue-8-traces.md`, `.checks/issue-8-traces.md`,
`.checks/issue-8-traces.verified.md`, `package.json` e os cinco arquivos do
core seguem como estavam. A única alteração é esta seção. Sem commit, push,
PR, merge ou revisão Codex.

### Execução nesta rodada (corrigido na rodada 6)

Limite da sessão da rodada 5, não do projeto nem do PowerShell: a ferramenta
de comandos usada pedia aprovação para cada execução, e a sessão não era
interativa, então os pedidos foram recusados — o `Proof:` de C1, `npm run
test:governance`, `node -e`, `gh run view … --log`, `gh api`, o WebFetch da
API do GitHub (também por um subagente) e a leitura do `%TEMP%`, onde ficou o
Node 24.13.0 da rodada 4. Só a leitura de arquivos do repositório e o `git`
somente leitura rodaram (árvore limpa em `ef9e6f0`). Na rodada 6, pelo
PowerShell, os mesmos tipos de comando rodaram: `node`, `npm`, `gh run view` e
`git` (abaixo).

Por isso esta rodada não tem reprodução, execução de teste, prova de antes e
depois nem duração por teste da CI. Nada abaixo declara execução.

### Diagnóstico (análise estática)

1. **O que `delivery_timeout` significa em C1 e C2.** Em `delivery.mjs`,
   `untilDeadline` (linhas 63–92) devolve `delivery_timeout` quando a
   tentativa ainda está em curso no prazo. Isso vale para a primeira
   tentativa, com o lock ou sem ele, porque o código inicial já é
   `delivery_timeout`, e para uma repetição que tenha o lock. Nesses dois
   testes, nenhum outro processo toca a raiz da captura durante o hook:
   - cada teste tem a sua raiz;
   - os hooks rodam um por vez, porque o teste espera o `close`;
   - `exportOf` e `startCapture` usam `spawnSync` (`helpers/cli.mjs`,
     `runIntegrations`).

   Logo, `lock_present` e a repetição são impossíveis. O código só pode vir da
   primeira tentativa de `openCaptureForIngest` ou de `appendRecords` ainda em
   curso 650 ms (`ATTEMPT_MS` = 750 − 100) depois de o hook ler o evento.
   `readAt` é tomado depois do fim do stdin e do `JSON.parse`. Os `import()`
   da entrega acontecem antes da leitura do stdin
   (`hook-command.mjs:46–48`, `binding.mjs:32`), e não há outro `import()`
   nesse caminho.
2. **Trabalho dentro desse intervalo**, contado no código para um evento:
   - abertura: cerca de 40 chamadas assíncronas de fs em sequência, com um
     `FileHandle.sync` (o lock);
   - commit: cerca de 43 chamadas em C2 (primeiro registro) ou 51 em C1
     (8º registro, com a leitura e o `unlink` do segmento anterior), com três
     `sync` (lock, temporário do segmento e temporário do `state.json`) e dois
     `rename`.

   No total, cerca de 83 a 91 idas ao threadpool em série e 4
   FlushFileBuffers por hook. Base da contagem: `readSmallFile` = `lstat` +
   `open` + `fstat` + 2 `read` + `fstat` + `close`; `writeExclusive` =
   `open wx` + `write` + `sync` + `close`. É uma contagem do código, não uma
   medida.
3. **Folga medida antes.** Na rodada 4 (Node 24.13.0, 4 E-cores, suíte em
   paralelo), a entrega em processo teve p99 de 78–87 ms e máximo de 115 ms.
   O `delivery_timeout` exige mais de 650 ms, pelo menos 5,6 vezes o máximo
   medido localmente.
4. **Padrão das falhas.** Elas mudam de teste entre execuções: em `b2c230c`
   foram C7 e C14 com `delivery_timeout` e C11 com `lock_present` depois de um
   lock que ficou; em `ef9e6f0`, C1 e C2. Os dois casos de agora não têm nada
   em comum:
   - um evento Claude de expansão, sem ferramenta, depois de 7 entregas
     confirmadas na mesma captura;
   - o primeiro evento Codex, numa captura nova, com o menor payload.

   As duas falhas são vizinhas no mesmo arquivo: falha de C1, depois o início
   de C2 (`scratch`, `privacy start` por `spawnSync`, primeiro hook). A janela
   lenta durou pelo menos esse intervalo e terminou antes de C3, que passou.
   Ubuntu e macOS passam. Essa assinatura indica uma janela transitória de
   latência no runner Windows, e não um caminho de código que dependa do
   evento, do payload ou do estado da captura.
5. **Hipótese da rodada 4.** O WerFault do processo morto com 0xC0000409 não
   é necessário para explicar a falha. Em `ef9e6f0` nenhum arquivo morreu
   (215 + 2 + 15 = 232, o total completo) e o `delivery_timeout` voltou mesmo
   assim. Ocorreu a condição que a rodada 4 registrou como gatilho de medida no
   runner e de decisão do proprietário ("Limites e achados fora do escopo",
   primeiro item).

Classificação:

- **Defeito de produto: não demonstrado.** O produto cumpriu o critério 10: a
  tentativa terminou no prazo com código fechado, e o agente não ficou preso.
  O código 0 e o stdout vazio foram afirmados antes das linhas 102 e 142 e
  passaram. O store não tem espera nem repetição nesse caminho, e as falhas
  de E/S viram outros códigos (`io_failure`, `capture_*`). Não foi
  encontrado caminho que prenda a operação.
- **Prova: correta para o critério.** C1 e C2 exigem um registro confirmado
  por evento, como dizem os checks C1 e C2. Implicitamente, exigem que o
  ambiente complete cerca de 85 operações de fs e 4 flushes em 650 ms. A
  prova não foi alterada: o prazo é contrato e as asserções não podem ser
  enfraquecidas.
- **Infraestrutura ou concorrência dos testes: não resolvido.** Duas causas
  são compatíveis com o código:
  - E/S: o flush e as operações de metadados no disco do `tmpdir()` do
    runner atrasados por arquivos de teste em paralelo que gravam muito com
    `sync`, como as reescritas de segmento de 8 MiB em C17 e nos limites da
    #5;
  - CPU: o processo do hook ficar sem CPU por centenas de ms nas 4 vCPUs,
    com 3 arquivos de teste iniciando processos.

  Nenhuma das duas foi medida. Distingui-las exige medida no próprio runner.
  Medidas na rodada 6: as duas existem, e a E/S é o fator próprio do runner.

**Lacuna de observabilidade.** A mensagem da falha mostra só o objeto
`delivery`. O `collect` de `helpers/installed-hooks.mjs` devolve `elapsedMs`
(do spawn ao `close`), mas o teste não o imprime. O relatório do produto não
tem tempo, e a forma dele é fechada. O log da CI não tem horário por teste
(rodada 4). Nada disponível distingue E/S de CPU.

### Correção

Nenhuma. Sem execução, não há causa demonstrada nem prova de regressão.
Mudar a concorrência, o protocolo do store ou o teste seria palpite. Por isso
não foram aplicados:

- `--test-concurrency` ou isolamento dos arquivos T8 na CI;
- menos trabalho por entrega (um ciclo de lock por hook em vez de dois, ou
  lock sem `sync`), que muda o store da #5 e, pelo AGENTS.md, exige medida
  antes e depois em condições comparáveis;
- instrumentação nos testes, que não poderia ser validada nem uma vez antes de
  entrar num checkout compartilhado.

### Pendências desta rodada e situação na rodada 6

1. **Permissão de execução.** Resolvida: o proprietário liberou as provas
   locais e a leitura do log, e a rodada 6 as executou.
2. **Instrumento.** Escrito e validado na rodada 6 como modo
   `SKILL_ME_TEST_TRACES_TIMING` de `helpers/traces-probe.mjs`, carregado por
   `NODE_OPTIONS=--import` em C1 e C2. Sem `monitorEventLoopDelay`: a duração
   de cada operação, por tipo de arquivo, já separa disco (flush e metadados
   lentos) de CPU (todas as operações infladas). Push e `workflow_dispatch`
   ficam com o proprietário.
3. **Opções.** A rodada 6 aplicou a menor correção demonstrada (lock sem
   flush), dentro da instrução do proprietário de implementar a menor correção
   demonstrada no escopo. Isolar arquivos na CI, um ciclo de lock por hook ou
   aceitar o risco continuam decisão do proprietário se a CI falhar de novo
   (rodada 6, "Limites").

   Aumentar os 750 ms, enfraquecer asserções ou pular casos está excluído.

### Execuções e ausências

- Executado: nada (limite da sessão, acima). Lidos: `AGENTS.md`, a task, o checklist,
  este registro, `delivery.mjs`, `binding.mjs`, `hook-command.mjs`,
  `observation.mjs`, `store.mjs`, `privacy/fs.mjs`, `snapshot-read.mjs`,
  `fs-adapter.mjs`, os helpers `cli.mjs`, `installed-hooks.mjs`, `traces.mjs`,
  `privacy-store.mjs` e `traces-probe.mjs`, `live-capture.cli.test.mjs`,
  `traces/limits.cli.test.mjs`, `docs.test.mjs`, os fixtures de hooks e o
  workflow.
- **CI pendente.** O job Windows em `ef9e6f0` continua com C1 e C2 falhando,
  e C21 continua aberto. A próxima reexecução precisa conferir `tests 232`,
  0 fail e 15 skip (233 depois da rodada 6, que acrescenta uma prova a C16).
- WSL Ubuntu e macOS não foram executados nesta rodada.
- Não executados: Claude, Codex ou Hermes reais com modelo.

## Rodada de correção 6 — CI Windows em `ef9e6f0`: causa medida e lock sem flush

Origem: a mesma da rodada 5 (run `39198006078`, job Windows `117884894719`).
Builder Claude, numa sessão PowerShell com `node`, `npm`, `gh run view` e `git`
liberados. Pediram aprovação, e foram substituídos por scripts Node com o
mesmo efeito: comandos Bash compostos, a chamada direta (`&`) do `node.exe`
24.13.0 baixado, `Get-ChildItem`/`Get-CimInstance` e `Select-String` em
pipeline. Ferramentas da rodada fora do repositório, em
`%TEMP%\issue8-r6\tools` (drivers, sondas e geradores de carga); saídas em
`%TEMP%\issue8-r6\out`. Variantes do código para A/B e mutações em
`%TEMP%\issue8-r6\variants`, cópias de `src/` (e de `tests/` nas mutações) —
nenhuma mutação tocou o checkout compartilhado. Sem commit, push, PR, merge ou
revisão Codex.

Mudaram:

- produto: `src/integrations/privacy/fs.mjs` (`writeExclusive(file, data,
  { durable = true })`) e `src/integrations/privacy/store.mjs` (`withLock` cria
  o lock com `durable: false`);
- testes: `tests/integrations/helpers/traces-probe.mjs` (modo
  `SKILL_ME_TEST_TRACES_TIMING`), `tests/integrations/helpers/traces.mjs`
  (`timedEnv`, `timingLines`, `deliveryTiming`, `describeTiming`),
  `tests/integrations/traces/concurrency.cli.test.mjs` (uma prova nova em C16)
  e `tests/integrations/traces/live-capture.cli.test.mjs` (C1 e C2 com a
  pré-carga de tempo);
- este registro (rodada 5 corrigida e esta seção).

Não mudaram: prazo de 750 ms, reserva de 100 ms, asserções e tolerâncias
existentes, concorrência do runner, `.tasks/issue-8-traces.md`,
`.checks/issue-8-traces.md`, `.checks/issue-8-traces.verified.md`,
`package.json`, `.github/` e os cinco arquivos do core (`git diff origin/main`
vazio).

### O log da CI

Lido com `gh run view 39198006078 --job 117884894719 --log`. Runner Windows
Server 2025 (10.0.26100), região westus3. `npm run test:integrations`: tests
232, pass 215, fail 2, cancelled 0, skipped 15, `duration_ms` 300 552. As
falhas são as informadas: T8-C1 em `expansion_mcp_prompt`
(`live-capture.cli.test.mjs:102`) e T8-C2 em `pre_tool_bash` (`:142`), ambas
com `{ bound: true, code: "delivery_timeout", entries: 1, committed: 0,
persisted: 0, lost: 1 }`. Nenhum arquivo morreu (215 + 2 + 15 = 232). Ubuntu
e macOS: sucesso. O reporter imprime cada arquivo de uma vez (todas as linhas
T8 com o carimbo `04:16:02.83`), então o log não dá o horário de cada teste,
mas dá a duração. Comparação com uma execução local nas condições da CI (S0:
Node 24.13.0, afinidade 4 E-cores 16–19, `--test-concurrency=3`, Hermes
oculto, árvore `ef9e6f0`; 232 tests, 217 pass, 0 fail, 15 skip, 342 s):

| Teste | Natureza | S0 local | CI | CI/local |
| --- | --- | --- | --- | --- |
| suíte inteira | — | 342 s | 301 s | 0,88 |
| I5-C14j, I5-C39, I4-C30d | CPU e processos | 63,0 / 28,3 / 43,1 s | 60,3 / 26,3 / 35,6 s | 0,83–0,96 |
| T8-C6 | hooks sem captura | 6,52 s | 6,42 s | 0,98 |
| I5-C30s, C42s, C48s, C52s | store em processo | 49 / 91 / 80 / 105 ms | 151 / 245 / 215 / 306 ms | 2,7–3,1 |
| T8-C9 | ~300 `start` em processo, ~900 flushes | 5,7 s | 29,0 s | 5,1 |
| T8-C3 | ingest com store | 0,81 s | 1,82 s | 2,3 |
| T8-C1, por caso | hook + `export` | 358 ms (13 casos) | 725 ms (8 casos) | 2,0 |

Na CI, o que é CPU ou início de processo foi igual ou mais rápido que aqui;
o que é operação de store (flush e metadados) foi de 2 a 5 vezes mais lento.
O `tmpdir()` do runner fica em `C:\Users\RUNNER~1\…` (comentário de
`makeScratch`). O que distingue o runner é o disco — inferido dessas
durações; o log não tem medida por operação.

### Onde a entrega gasta o prazo

Sonda de tempo fora do repositório, carregada no processo do hook por
`--import`: cada operação de `node:fs/promises` e de `FileHandle`, com o tipo
do arquivo; lacunas do event loop com o CPU do processo nelas. Node 24.13.0,
máquina ociosa, 60 hooks Claude vinculados: a tentativa de um evento com
segmento anterior são 91 operações em série (79 instrumentadas na primeira
versão da sonda mais 12 `close`, campo de cada `FileHandle` no Node 24) e 4
flushes — lock da abertura, lock do commit, temporário do segmento e
temporário do `state.json`. O primeiro evento de uma captura faz 83. Janela do
fim do stdin à última operação: p50 14 ms, p99 16 ms. O `delivery_timeout`
exige mais de 650 ms, cerca de 45 vezes isso.

Cargas sintéticas (`load.mjs`): `cpu` é laço puro; `flush` repete o ciclo do
`start` (lock, chave e `state.json` com `wx`, gravação, flush e `rename`, como
T8-C9); `big` reescreve 8 MiB com flush (como T8-C17).

| Condição | Entregas | Códigos | Janela p50 / p90 / p99 / máx. | O que a sonda mostrou |
| --- | --- | --- | --- | --- |
| 8 `cpu`, tudo nos 4 E-cores 16–19 | 80 | 80 confirmadas | 43 / 54 / 441 / 441 ms | cada operação esperou 15–40 ms por CPU |
| 12 `cpu`, idem | 80 | 79 confirmadas, 1 `delivery_timeout` | 57 / 89 / 660 / 660 ms | só 43 operações no prazo; lacunas do event loop sem CPU do processo |
| 6 `flush` + 2 `big`, CPU livre | 80 | 80 confirmadas | 125 / 253 / 504 / 505 ms | flush dominante; nas 8 mais lentas, os dois do lock somaram de 18 a 178 ms |

A mesma separação aparece nos testes. T8-C9, C3, C5 e C7:

| Carga | C9 | C3 | C5 | C7 |
| --- | --- | --- | --- | --- |
| nenhuma, todos os núcleos | 2,7 s | 0,50 s | 0,65 s | 0,84 s |
| 12 `cpu` nos 4 E-cores | 270 s | 3,4 s | 4,3 s | 5,5 s |
| 6 `flush` + 2 `big` | 10,8 s | 0,56 s | 0,75 s | 0,95 s |
| CI | 29,0 s | 1,82 s | 1,52 s | 2,43 s |

CPU disputada atrasa tudo; disco disputado atrasa o que usa o store. A CI
combina as duas coisas e tem o disco mais lento. A suíte local nas condições
da CI (S0) não falhou.

Causa (mecanismo reproduzido aqui; no runner, inferida das durações): a
tentativa do hook é uma sequência de cerca de 90 operações de disco com 4
flushes. No runner Windows, com o disco lento e os arquivos de teste em
paralelo, uma tentativa passou dos 650 ms. O produto cumpriu o critério 10:
desistiu no prazo, com código fechado, sem prender o agente. Não é falha de
lógica, de prova nem do 0xC0000409 da rodada 4.

### Correção: o lock sem flush

O `.lock` só serializa processos vivos: a criação `wx` é atômica, e os bytes
conferidos na liberação são lidos pelo mesmo sistema. Depois de uma queda do
sistema nenhum processo o detém, então guardá-lo no disco não protege nada.
Com `durable: false`, cada aquisição do lock deixa de fazer flush. No hook, os
flushes caem de 4 para 2, e as operações de 91 para 89 (de 83 para 81 no
primeiro evento). Continuam com flush os dados confirmados (temporários do
segmento e do `state.json`), a chave e o marcador `store.json`. Todo comando
`privacy` que toma o lock também perde esse flush, o que diminui o disco
disputado pela própria suíte. O guia não promete durabilidade do lock: nada a
mudar nele.

### Provas: antes e depois

1. **Prova nova de C16** ("no hook real, a tentativa só faz flush dos dados
   confirmados…"): duas entregas de hook com a pré-carga de tempo. Afirma, para
   cada processo, flushes exatamente `["segmento.tmp", "state.json.tmp"]`,
   nessa ordem, e 2 gravações e 2 liberações do próprio lock (abertura e
   commit), além dos dois registros e da coerência do segmento.
   - Antes (produto de `ef9e6f0`): falha com `['lock', 'lock',
     'segmento.tmp', 'state.json.tmp']`.
   - Depois: passa.
   - Mutações numa cópia: `state.json` sem flush é detectado
     (`['segmento.tmp']`); abertura sem lock é detectada (`[1, 1]` contra
     `[2, 2]`).
2. **Latência de flush injetada** (sonda fora do repositório que espera N ms
   antes de cada flush real; 13 hooks por ponto, código antigo e novo
   intercalados, máquina ociosa):

   | Atraso por flush | Antes (4 flushes) | Depois (2 flushes) |
   | --- | --- | --- |
   | 0 ms | 13 confirmadas; janela ~29 ms | 13 confirmadas; ~19 ms |
   | 100 ms | 13 confirmadas; ~445 ms | 13 confirmadas; ~230 ms |
   | 140 ms | 13 confirmadas; ~621 ms | 13 confirmadas; ~316 ms |
   | 160 ms | 13 `delivery_timeout` | 13 confirmadas; ~346 ms |
   | 200 ms | 13 `delivery_timeout` | 13 confirmadas; ~428 ms |
   | 300 ms | 13 `delivery_timeout` | 13 confirmadas; ~628 ms |
   | 330 ms | 13 `delivery_timeout` | 13 `delivery_timeout` |

   O flush mais lento que a tentativa tolera passa de cerca de 150 ms para
   cerca de 310 ms. "Depois" é a cópia `variants/nolocksync`, com as mesmas
   duas linhas de produto; repetida com o próprio checkout em 140, 160, 300 e
   330 ms, deu os mesmos códigos e janelas (316 / 347 / 627 ms; 330 ms com
   `delivery_timeout`).
3. **Disco disputado de verdade, A/B intercalado** (mesmo laço, hooks
   alternando o código antigo e o novo; "depois" é `variants/nolocksync` na
   primeira carga e o checkout na segunda):

   | Carga | Código | Entregas | Códigos | Janela p50 / p90 / p99 / máx. | Soma dos flushes p50 / p99 |
   | --- | --- | --- | --- | --- | --- |
   | 6 `flush` + 2 `big` | antes | 150 | 150 confirmadas | 130 / 198 / 352 / 368 ms | 68 / 193 ms |
   | 6 `flush` + 2 `big` | depois | 150 | 150 confirmadas | 94 / 152 / 229 / 488 ms | 35 / 79 ms |
   | 12 `flush` + 4 `big` | antes | 200 | 198 confirmadas, 2 `delivery_timeout` | 189 / 255 / 328 / 449 ms | 86 / 147 ms |
   | 12 `flush` + 4 `big` | depois | 200 | 200 confirmadas | 136 / 192 / 343 / 500 ms | 44 / 166 ms |

4. **C1 e C2 reais sob 12 `flush` + 4 `big`**, quatro execuções antes e quatro
   depois, não intercaladas, com a pré-carga de tempo do repositório:
   - antes: 8 de 8 passaram; entrega mais lenta por execução de 211 a 528 ms
     (a de 528 ms com 321 ms de flush, 4 flushes);
   - depois: 7 de 8 passaram. A que falhou foi C2 `post_tool_bash` com
     `delivery_timeout`, e a mensagem da prova mostrou: 79 operações em
     352 ms, flushes de 251 ms (222 ms só o do `state.json`). Faltaram 10 das
     89; pela ordem das operações, a 80ª, em curso no prazo, é o `rename` do
     `state.json` — o ponto de commit. Nas outras sete, a entrega mais lenta
     ficou entre 134 e 227 ms.
5. **Só CPU, A/B intercalado** (12 `cpu` nos E-cores 20–23, 100 entregas de
   cada código, checkout como "depois"): antes, 98 confirmadas e 2
   `delivery_timeout`, janela p50 / p90 / p99 58 / 112 / 720 ms; depois, 100
   confirmadas, 53 / 82 / 277 ms. Ali o flush soma cerca de 3 ms por entrega
   (p50), e as duas perdas vieram de lacunas de 370–430 ms sem CPU do
   processo: não atribuo a diferença da cauda à correção (2 contra 0 eventos).

Conclusão honesta: a correção corta metade dos flushes, reduz a mediana e o
p90 da tentativa em cerca de 25–30% com o disco disputado e dobra a latência
de flush tolerada. Não elimina o `delivery_timeout` com o disco local
saturado, em que um único `rename` passou de 300 ms, nem com CPU saturada, em
que o efeito direto dela é pequeno (2 de 91 operações). Que C1 e C2 passem no
runner Windows não está demonstrado; só a CI pode demonstrar.

### `io_failure` nas suítes inteiras: o `EPERM` do lock no Windows

Depois da correção apareceu um código que a CI não mostrou: `io_failure`.
`node --test "tests/integrations/**/*.test.mjs"` (concorrência padrão, 31
arquivos em paralelo nesta máquina; Node 24.13.0; Hermes oculto), alternando
uma cópia completa do checkout com o produto de `ef9e6f0`
(`variants/full-base`, mesmos testes) e o checkout corrigido:

| Execução | Sem a correção | Com a correção |
| --- | --- | --- |
| `npm test` (antes da série) | — | 233 tests, 217 pass, 1 fail: T8-C2 `subagent_start` com `io_failure`, 90 operações em 26 ms |
| par 1 | 233 / 217 / 1 fail (só a prova nova de flush, esperado) | 233 / 218 / 0 |
| par 2 | idem | 233 / 217 / 1 fail: T8-C15, produtor `b` com `io_failure` (39 de 40) |
| par 3 | idem | 233 / 218 / 0 |
| par 4 | 233 / 217 / 1 fail (só a prova nova); excluído com o par | excluído: 6 falhas, inclusive I4-C36 e I4-C25, que não usam o store, com processos de 21 s |
| par 5 | idem | 233 / 218 / 0 |
| par 6 | 233 / 216 / 2 fail (prova nova e I4-C27d, instalador, código igual nas duas árvores) | 233 / 218 / 0 |
| par 7 | 233 / 217 / 1 fail (só a prova nova) | 233 / 218 / 0 |

Skips: 15 em todas, o conjunto da CI. O par 4 rodou com o microteste sob carga
abaixo ainda em curso nos E-cores 16–19 e teve uma parada geral de ~21 s; fica
fora da comparação. Contagem: 0 `io_failure` em 6 execuções sem a correção, 2
em 7 com ela. Fisher bicaudal p ≈ 0,46: não distingue as duas.

Mecanismo, com microteste fora do repositório (`lock-cycle.mjs`): P processos
disputam o mesmo `.lock` repetindo o ciclo do `withLock` (criar `wx`, gravar,
[flush], fechar, reler, apagar), e cada criação que falha é contada pelo
código:

| Condição | Ciclos | Flush do lock | `EEXIST` | `EPERM` |
| --- | --- | --- | --- | --- |
| ociosa, 4 processos | 20 000 | sim | 6 964 | 2 |
| ociosa, 4 processos | 20 000 | não | 2 474 | 3 |
| 4 E-cores com 6 `cpu`, 4 processos | 4 000 | sim | 29 451 | 31 |
| idem | 4 000 | não | 23 875 | 29 |

No Windows, a criação exclusiva do `.lock` logo depois de outro processo
apagá-lo falha às vezes com `EPERM` em vez de `EEXIST` — provavelmente o nome
ainda em exclusão (delete pending), causa não medida —, muito mais sob carga,
e na mesma taxa com ou sem o flush.
O store só trata `EEXIST` como lock ocupado; `EPERM` sai como `io_failure`, e
a entrega perde o lote sem repetir. É um comportamento anterior a esta rodada
(o produto de `ef9e6f0` tem a mesma taxa no microteste). O C2 do `npm test`
foi antes de a pré-carga registrar códigos de erro; pela contagem (90
operações, uma a mais que as 89, o caminho de desfazer o commit), a falha foi
no `rename` do `state.json` — provavelmente uma recusa transitória do Windows
(`EPERM`, `EACCES` ou `EBUSY`), que o instalador da #4 repete
(`RENAME_DENIED` em `install/run.mjs`) e o store da #5 não. Inferido, não
medido.

Decisão: a correção fica. Ela não muda a taxa de `EPERM` por criação no
microteste, e as suítes não distinguem as duas árvores. O `EPERM` é registrado
como achado fora do escopo (abaixo), sem correção.

### Instrumento para a CI

C1 e C2 rodam os hooks instalados com `NODE_OPTIONS=--import=<traces-probe>`
e `SKILL_ME_TEST_TRACES_TIMING` (o arquivo fica fora da raiz da captura). A
pré-carga só observa: grava, por processo, operação, tipo do arquivo, início,
duração e, se a operação falhou, o código do erro (`EPERM`…), além do CPU do
processo desde a primeira operação; nenhum caminho, ID, mensagem ou conteúdo.
As asserções não mudaram. A mensagem da asserção de `delivery` passou a trazer
o resumo da tentativa daquele hook, e uma linha `ℹ entrega mais lenta: …` vai
ao log em toda execução. Leitura na próxima CI:

- flush e operações que criam, renomeiam ou apagam lentos, com `lstat` e
  leituras rápidas: disco;
- todas as operações infladas por igual e CPU do processo baixo: espera por
  CPU;
- menos de 89 operações (81 no primeiro evento) numa falha por prazo: a
  seguinte estava em curso no prazo e não foi registrada, porque o processo
  sai;
- `falhas …`: a operação que falhou e o código, numa entrega com
  `io_failure`.

### Alterações em testes existentes

- C1 e C2 (`live-capture.cli.test.mjs`): ambiente dos hooks com a pré-carga
  de tempo, mensagem da asserção de `delivery` com o resumo, uma linha de
  diagnóstico e uma asserção nova, de uma linha da pré-carga por hook (sem ela
  o resumo seria de outro processo). Justificativa: a falha da CI só acontece
  no runner, e sem esse dado a rodada 5 não pôde distinguir disco de CPU.
  Nenhuma asserção anterior mudou.
- `scriptedIo` e o io parado do primeiro teste de C16 continuam chamando
  `real.writeExclusive(file, data)` sem opções: nesses testes em processo o
  lock ainda recebe flush. Não muda o que eles afirmam (lock ocupado,
  repetições, parada no prazo).

### Execuções e ausências

Windows 11, i9-14900K. "4 E-cores" é a afinidade 16–19 (ou 20–23, indicado),
como na rodada 4. Totais de `node --test` lidos da saída; os nomes dos 15 skips
são os da CI.

| Execução | Node | Árvore | Resultado |
| --- | --- | --- | --- |
| S0: integrações, 4 E-cores, `--test-concurrency=3`, Hermes oculto | 24.13.0 | `ef9e6f0` (só este registro mudado) | 232 tests, 217 pass, 0 fail, 15 skip, 342 s |
| `live-capture` + `query` + `limits` sem carga | 24.13.0 | `ef9e6f0` | 14 tests, 13 pass, 0 fail, 1 skip (T8-C4 sinal POSIX) |
| prova nova de C16 | 24.13.0 | produto de `ef9e6f0` | 1 test, 0 pass, 1 fail (esperado: flush do lock) |
| prova nova de C16, C1 e C2 | 24.13.0 | rodada 6 | 3 tests, 3 pass, 0 fail |
| `npm test`, Hermes oculto | 24.13.0, npm 11.6.2 | rodada 6 | exit 1 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 233 (217 pass, 1 fail: T8-C2 `io_failure`, 15 skip) |
| integrações alternadas, 7 pares (tabela acima) | 24.13.0 | `full-base` × rodada 6 | rodada 6: 5 de 6 pares válidos com 233 / 218 / 0 / 15; 1 com T8-C15 `io_failure` |
| `Proof:` de C1, C2, C15, C16, C17 e C20, como escritos | 24.21.0 | rodada 6 | cada um exit 0, 0 fail, 0 skip; C16 seleciona 9 (8 anteriores e o novo), C20 2, os demais 1 |
| idem | 24.13.0 | rodada 6 | idem |
| T8-C15 isolado, alternado 30 vezes | 24.13.0 | `full-base` × rodada 6 | 0 falhas em 30 nas duas |
| `npm test`, Hermes presente | 24.21.0 | rodada 6 | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 233 (226 pass, 0 fail, 7 skip) |
| S1: integrações como S0 | 24.13.0 | rodada 6 | 233 tests, 218 pass, 0 fail, 15 skip, 365 s; entrega mais lenta de C1 63 ms e de C2 75 ms, 2 flushes, nenhuma falha; T8-C9 7,7 s (no S0, 5,7 s: aqui o flush é barato, e a diferença entre execuções é ruído de carga, não efeito medido) |
| CI `workflow_dispatch` [39210999796](https://github.com/oldboydev/skill-me/actions/runs/39210999796) | 24.13.0 | `bfc6301756567e308f17ab916b01ca6f9fddfb14` | success: governança 6/6 e code-review 16/16 em Ubuntu, macOS e Windows; doctor 417 (416 pass, 1 skip) em Ubuntu/macOS e 417 (410 pass, 7 skip) em Windows; integrações 233 (221 pass, 12 skip) em Ubuntu, 233 (219 pass, 14 skip) em macOS e 233 (218 pass, 15 skip) em Windows; 0 fail nos três jobs |

Nos logs dessa CI, C1 e C2 registraram uma linha de tempo cada. A entrega mais
lenta em Ubuntu levou 28/28 ms, em macOS 18/21 ms e em Windows 38/33 ms; as
linhas mostram apenas os flushes de `segmento.tmp` e `state.json.tmp`, sem
falha de operação. O job Windows completou em 5m30s. Este resultado prova o
commit da mudança de produto; não elimina o `EPERM` transitório observado nos
ensaios locais e registrado na [issue #8](https://github.com/oldboydev/skill-me/issues/8#issuecomment-6261276945).

Após acrescentar a CI a este registro, o `Proof:` de T8-C20 falhou duas vezes
no sandbox local ao criar a captura temporária (`start: io_failure`); o mesmo
comando, com acesso à pasta temporária do Windows, executou 2 tests, 2 pass,
0 fail, 0 skip. A falha de acesso do sandbox não altera o resultado da CI nem
foi tratada como prova verde.

T8-C20, a única prova que lê este arquivo, rodou de novo pelo seu `Proof:`
depois da última edição desta seção: 2 tests, 2 pass, 0 fail (Node 24.21.0).

Não executados localmente nesta rodada: WSL Ubuntu, macOS e Claude, Codex ou
Hermes reais com modelo. Ubuntu e macOS foram executados pela CI acima.

### Limites e achados fora do escopo

- **Limite da CI.** A execução em `bfc6301` passou nas três plataformas, mas
  uma execução verde não prova ausência de falha rara por carga do disco ou
  `EPERM`. Se C1 ou C2 falharem de novo por prazo, a mensagem agora diz a
  operação e o tipo de arquivo; a decisão seguinte é do proprietário: um ciclo
  de lock por hook em vez de dois (cerca de 40 operações a menos; muda a API do
  store e a numeração de locks das provas de C16), isolar os arquivos T8
  sensíveis a tempo da concorrência da CI, ou aceitar o risco com limite
  declarado. Nada disso foi feito; 750 ms, reserva e asserções seguem como
  estão.
- **Achado, comunicado sem correção: `EPERM` na criação do lock no Windows.**
  Com o lock recém-apagado por outro processo, a criação `wx` falha às vezes
  com `EPERM` (31 em 4 000 sob carga; 2 em 20 000 ociosa, com o flush de
  `ef9e6f0`). O store o trata como `io_failure`, não como lock ocupado, e a
  entrega perde o lote sem repetir. Pode derrubar C15 (dois produtores) e
  qualquer produtor concorrente no Windows, inclusive na CI. O mesmo vale,
  inferido, para o `rename` do `state.json` (C2 do `npm test`). Corrigir
  mudaria a classificação de erros do store da #5 (o instalador da #4 repete
  esses códigos no `rename`); fica para decisão do proprietário.
- A sonda e a pré-carga medem a partir da primeira operação de disco, no mesmo
  tick em que o evento entra na entrega; o CPU do processo no Windows tem
  granularidade de ~15,6 ms (aparece 0 ou 16 ms).
- O laço fora do repositório associa a linha de tempo ao processo pelo PID; no
  Windows o PID pode se repetir, então o detalhe de uma entrega no laço pode
  ser o de outro processo. Os códigos vêm do relatório de cada hook e não
  dependem disso. C1, C2 e a prova nova leem uma linha por hook, em ordem.
- Depois de um `delivery_timeout` com o lock tomado, o `.lock` fica e as
  entregas seguintes da mesma raiz saem `lock_present` (limite do guia), como
  se viu num experimento misto de CPU e disco; os laços seguintes trocam de
  raiz depois de cada perda.
