# Issue #5 — evidência autoral (lote de armazenamento + lote D1)

Autor: Claude. Perfil `light`. Evidência do autor, não do Verifier: nenhum
Verifier, review:run, push ou PR foi executado por este autor. O lote D1 (seção
final) completa política, integrações, ingest/export, guia e demo; as seções
seguintes até "Lote D1" são o histórico do lote de armazenamento, preservado
como estava (inclusive a afirmação de que D1 estava pendente naquele momento).

## Escopo deste lote

Commits: `48d4643` (Landing do lote, antes do código), `0ab38fb` (código e testes),
`3a78c1e` (evidência) e `af7e16f` (correção da leitura limitada, abaixo).

- `src/integrations/privacy/lifecycle.mjs` — decisões puras: transições,
  admissão (500 eventos / 8 388 608 bytes), retenção.
- `src/integrations/privacy/store.mjs` — layout, lock, escrita atômica,
  barreira de exclusão, prune; `appendRecords` para o futuro ingest e a #8.
- `src/integrations/privacy/fs.mjs`, `args.mjs`, `command.mjs`; rota `privacy`
  em `src/integrations/cli.mjs`, linha no `HELP_TEXT`, script `npm run privacy`.
- Testes: `tests/integrations/privacy/{lifecycle.unit,store.cli,store.unit}.test.mjs`,
  `tests/integrations/helpers/privacy-store.mjs` (registros v1 sintéticos JÁ
  sanitizados, escritos à mão; não provam sanitização).

## RED → GREEN

- RED (Windows, antes do código): `node --test "tests/integrations/privacy/*.test.mjs"`
  → 3 arquivos, 3 falhas `ERR_MODULE_NOT_FOUND` (módulos inexistentes).
- Primeira execução com código: 10 pass / 13 fail. Causas: erro de sintaxe na
  rota do CLI (quebra de linha literal) e fixture de teste inválida em I5-C41
  (captura `disabled` com `content:true`, estado impossível pelo crit. 15 — a
  fixture foi corrigida para `content:false`; nenhuma asserção removida).
- GREEN: 23 pass / 0 fail / 0 skip.

## Execuções (commit `0ab38fb`)

| Plataforma | Comando | Resultado |
| --- | --- | --- |
| Windows 11, Node 24.21.0, checkout local | `node --test "tests/integrations/privacy/*.test.mjs"` | 23 tests, 23 pass, 0 fail, 0 skip |
| Windows | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip POSIX pré-existentes); integrações 111 (105 pass, 6 skip de plataforma pré-existentes da #4) |
| WSL Ubuntu, Node 24.13.0, usuário não root, cópia nativa `/tmp/skill-me-i5-storage-RLPgp1` de `git archive 0ab38fb` (sha256 do tar `d4ea9da5…3107d` igual nos dois lados), `node_modules` copiado do checkout, sem rede | `node --test "tests/integrations/privacy/*.test.mjs"` | 23 tests, 23 pass, 0 fail, 0 skip |
| WSL Ubuntu | `npm test` | exit 0 — 6/6; 16/16; doctor 417 (416 pass, 1 skip); integrações 111 (99 pass, 12 skip pré-existentes: Hermes ausente ×8, DACL Windows ×3, ACL macOS ×1) |

Skips Linux, todos da #4 e anteriores a este lote: I4-C18–C23, I4-C37, I4-C44b
(`hermes-runtime-ausente`), I4-C25g/h/i (`windows-dacl`), I4-C25m (`macos-acl`),
`configuration-trust … hermes_cli.PYD` (doctor). macOS não executado localmente.

Incidente de execução (WSL, Ubuntu-22.04): a primeira tentativa passou o script
inline ao `wsl.exe`, que expandiu `$D` vazio e criou `/src.tar`, `/repo` e uma
pasta vazia em `/tmp` como root. Os três foram conferidos (hash do tar,
conteúdo do archive, horário da criação) e removidos; nenhum outro caminho foi
tocado. As execuções válidas usam script em arquivo no distro `Ubuntu`.

## Correção — leitura limitada (observação do coordenador)

Origem: `.checks/code-review/issue-5/content-decision.md` (observação de código,
não teste nem Verifier; D1 continua sem resposta e o arquivo não amplia escopo).
Confirmado por leitura: `readSmallFile` fazia `io.readFile` e só depois comparava
o tamanho; o segmento anterior em `appendRecords` também era lido inteiro.

Método: teste `I5-S-bounded` (store.unit) com `createStoreIo({ openFile })`
instrumentado que soma os bytes lidos pelo handle; arquivos crescidos por
`truncateSync` para 4 MiB (sem conteúdo real, sem risco à máquina).
- RED em `3a78c1e` (Windows): `not ok — Missing expected rejection.` — o
  segmento de 4 MiB foi lido inteiro e aceito.
- GREEN em `af7e16f`: segmento maior que `dataBytes` → `capture_invalid` lendo
  ≤ `dataBytes + 1`; `state.json` de 4 MiB → exit 3 `capture_invalid` lendo
  ≤ 65 537 bytes; `store.json` de 4 MiB → exit 3 `store_invalid` lendo ≤ 26 bytes.
  Recusa de links e não regulares preservada (`lstat` antes; fd conferido pelo
  adaptador do doctor). Nenhuma camada nova: reúso de `readSnapshot`.

| Plataforma (`af7e16f`) | Comando | Resultado |
| --- | --- | --- |
| Windows | `node --test "tests/integrations/privacy/*.test.mjs"` | 24/24 pass |
| Windows | `npm test` | exit 0 — 6/6; 16/16; doctor 417 (410 + 7 skip); integrações 112 (106 + 6 skip) |
| WSL Ubuntu, `/tmp/skill-me-i5-storage-AIWjks`, tar `502cf42f…7950` igual | privacy | 24/24 pass |
| WSL Ubuntu | `npm test` | exit 0 — 6/6; 16/16; doctor 417 (416 + 1 skip); integrações 112 (100 + 12 skip, os mesmos da #4) |

## Provas por check

Fechados por este lote (nome exato do teste, pattern `^I5-Cn `):

| Check | Teste | Arquivo |
| --- | --- | --- |
| C2 | I5-C2 | store.cli |
| C36 | I5-C36 | store.cli |
| C37 | I5-C37 | store.cli |
| C38 | I5-C38 | store.cli |
| C41 | I5-C41 (puro) e I5-C41b (CLI) | lifecycle.unit / store.cli |
| C44 | I5-C44 | store.cli |
| C45 | I5-C45 | lifecycle.unit |
| C46 | I5-C46 | store.cli |
| C49 | I5-C49 (junção; no Linux o mesmo `symlinkSync` cria link simbólico) | store.cli |
| C51 | I5-C51 | lifecycle.unit |
| C52 | I5-C52 (puro); C52b pendente | lifecycle.unit |

Parciais, com sufixo `s` para não casar o pattern do check (camada de
armazenamento ou subconjunto do CLI):

| Check | Teste parcial | O que falta |
| --- | --- | --- |
| C30 | I5-C30s (rename injetado no `appendRecords`) | prova pelo `privacy ingest` com `SKILL_ME_TEST_FS_PROBE_FAIL_RENAME_TO` |
| C32 | I5-C32s (códigos de uso, `capture_not_found`, `capture_invalid`, `store_invalid`) | tabela inteira pelo CLI (`capture_not_active`, `invalid_agent`, `root_changed`, `io_failure` etc.) e canários do ingest |
| C42 | I5-C42s (storage recusa stopped/disabled) | recusa pelo `privacy ingest` |
| C43 | I5-C43s (status isolado, `--help` pt) | `export` |
| C47 | I5-C47s (start/stop/disable/status/delete/prune) | ingest e export |
| C48 | I5-C48s (storage após stop/disable/delete) | ingest atrasado pelo CLI |
| C50 | I5-C50s (status e remoção da `key`) | export |
| C52b | I5-C52s (storage, 510 registros e 8 MiB exatos) | 510 linhas pelo CLI |
| C53 | I5-C53s (storage, lote misto) | lote misto pelo `privacy ingest` |
| C54 | I5-C54s (chaves exatas de `state.json` e `.lock`) | ausência de canário com ingest real |

Pendentes (dependem de D1/política, ingest, export, guia ou demo): C1, C3–C35,
C39, C40, C55, C56. C57–C59 não avaliados como entrega final.

## Limites conhecidos deste lote

- `privacy ingest`/`export` saem 2 `unknown_command` e não aparecem no `--help`.
- `root_changed` e `io_failure` no CLI não têm cenário próprio ainda; `io_failure`
  do storage está provado em I5-C30s e `partial_delete` em I5-C51.
- Concorrência produtor × stop/delete pelo CLI (C56) depende do ingest.
- Perfil `light`: um membro de conjunto pode ficar sem prova e um teste pode
  passar com implementação errada; nenhuma falha foi injetada sistematicamente.

# Lote D1 — política, integrações, ingest/export, guia e demo

D1 aprovada em 17/10/2026 (`.checks/issue-5-privacidade.approval.md`). Commits:
`99df1c9` (Landing do lote e forma vigente de D1, antes do código), `7da1ada`
(código e testes), `0f7f91b` (guia), e o commit desta evidência.

## Escopo

- Novos: `src/integrations/privacy/{sanitize,content,policy,ingest}.mjs`.
- Alterados: `observation.mjs` (política + relatório v2), `hook-command.mjs`,
  `ingest-command.mjs`, `codex-run.mjs` (passam o payload à política),
  `privacy/{store,args,command}.mjs` (fase 1 do ingest, export, rotas),
  `cli.mjs`/`cli-args.mjs` (stdin e ajuda).
- Testes novos: `tests/integrations/privacy/{policy.unit,outputs.cli,limits.cli,no-network,docs-privacy,demo.e2e}.test.mjs`
  e casos D1 em `store.cli.test.mjs`; helpers `privacy-canaries.mjs` (fixture
  sintética) e `privacy-probe.mjs` (sonda só de teste).
- Guia novo `docs/privacidade.md`; `docs/agent-observation.md` só troca as linhas
  de `ids` e do exportador.
- Sem dependência nova, sem rede, sem mudança em `scripts/code-review/`, CI,
  `package.json`, AGENTS/CLAUDE, plugin Hermes ou `kwargs.json`.

## RED → GREEN

- RED (Windows, antes do código da política): `policy.unit` e `docs-privacy`
  falharam ao carregar (`ERR_MODULE_NOT_FOUND` de `content.mjs`); suítes CLI
  (`outputs.cli`, `limits.cli`, `no-network`, `demo.e2e`, `store.cli`): 42 testes,
  15 pass, 27 fail. Passaram já no RED: os 13 testes do lote de armazenamento,
  I5-C29 e I5-C33 (repasse do wrapper e saída neutra dos hooks já eram
  contrato da #4) e I5-C50 — este por asserção fraca (não exigia ingest/export
  com sucesso); o teste foi reforçado antes do código e passou a exigir ingest 0
  e export com 2 registros.
- Correções de teste durante o build, todas sem enfraquecer o contrato:
  - I5-C13: a linha de sanidade `entradas > registros` era errada (registro
    opt-in limpo não tem entrada); trocada por asserção de que a amostra
    exercita `content_disabled`, `sensitive_removed`, `unsanitizable` e
    `unsupported_content`. As asserções de formato e ausência de valor ficaram.
  - I5-C28: o Proxy hostil só tinha `get`/`ownKeys`; `Object.hasOwn` não passa
    por elas e o objeto não era hostil para a leitura real. Agora toda armadilha
    lança. A prova do getter que lança (lido uma vez) não mudou.
  - I5-C40: o carregador ESM do Node lê o código do próprio CLI por
    `fs.readFileSync`/`fs.openSync`; só `src/**/*.mjs|json` é aceito fora do store,
    e o teste exige que a sonda tenha visto essas leituras e as do store.
  - Sondas passadas a `--import` como URL `file://` (Windows); log da sonda por
    fd próprio (o `appendFileSync` do Node chamava o `writeFileSync` envolvido).
  - Testes da #4: I4-C1, I4-C2, I4-C4, I4-C7 e I4-C19 trocam a comparação de IDs
    nativos por `assertPseudonymIds` (mesmos nomes de ID, `h1:` + 43, nenhum
    valor nativo) e, no I4-C19, igualdade entre eventos do mesmo relatório
    (pre/post da mesma chamada, sessão do subagente = sessão observada, turno).
    Todas as outras asserções ficaram; nenhum teste apagado. I5-C32s: `ingest`/
    `export` deixam de ser `unknown_command` (linha "Roteamento parcial" do
    lote anterior) e passam a `missing_capture`; `unknown_command` continua
    provado por `follow`/`list`.
- GREEN Windows: `tests/integrations/privacy/*.test.mjs` 74 testes (73 com
  I5-C35 excluído pelo motivo abaixo), 0 fail, 0 skip.

I5-C35 lê esta própria seção: no commit `0f7f91b` ela não existia e o teste
falhou com "seção ausente: Execuções do lote D1" nas duas plataformas — falha
esperada, registrada aqui, e o motivo de a linha do alvo de privacidade abaixo
excluí-lo. A execução de I5-C34/I5-C35 depois deste registro está em
"Conferência do guia".

## Execuções do lote D1

| Plataforma | Comando | Resultado |
| --- | --- | --- |
| Windows 11 — Node 24.21.0, checkout local em `0f7f91b`, logs em `%TEMP%\skill-me-i5-d1-win-NiR1qS` | `node --test --test-skip-pattern="^I5-C35 " "tests/integrations/privacy/*.test.mjs"` | 73 tests, 73 pass, 0 fail, 0 skip |
| Windows 11 | `npm test` | exit 1 por I5-C35 (seção ausente) — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip POSIX pré-existentes); integrações 162 (155 pass, 6 skip pré-existentes, 1 fail I5-C35) |
| WSL Ubuntu — Node 24.13.0, uid 1000, distro `Ubuntu`, cópia nativa `/tmp/skill-me-i5-d1-83T0PO` de `git archive 0f7f91b` (sha256 do tar `992dd676…6733e92` igual nos dois lados), `node_modules` copiado do checkout, script em arquivo com guardas | `node --test --test-skip-pattern="^I5-C35 " "tests/integrations/privacy/*.test.mjs"` | 73 tests, 73 pass, 0 fail, 0 skip |
| WSL Ubuntu | `npm test` | exit 1 por I5-C35 (seção ausente) — governança 6/6; code-review 16/16; doctor 417 (416 pass, 1 skip); integrações 162 (149 pass, 12 skip pré-existentes, 1 fail I5-C35) |

Skips, todos anteriores à #5: Windows — I4-C15 (sinais POSIX), I4-C25b/j/k/l/m
(modos/ACL POSIX/macOS) e 7 do doctor (FIFO/symlink POSIX). WSL — I4-C18–C23,
I4-C37, I4-C44b (`hermes-runtime-ausente`), I4-C25g/h/i (DACL Windows), I4-C25m
(ACL macOS), `configuration-trust … hermes_cli.PYD`. Hermes nativo existe no
Windows: I4-C18–C23 (inclusive I4-C19 alterado) rodaram e passaram lá.
macOS não executado localmente.

Preparação WSL: `git archive` do commit exato num diretório de `mktemp -d` do
Windows; `run-wsl.sh` em arquivo, chamado com `MSYS_NO_PATHCONV=1 wsl.exe -d
Ubuntu -- bash -l <script> <tar> <sha> <node_modules> <commit>`; o script recusa
root, outra distro, origem ausente e destino fora de `/tmp/skill-me-i5-d1-??????`
antes de copiar ou extrair; o hash é conferido antes da extração. Nenhum
`/repo` ou `/src.tar` criado; cópia e logs preservados. Não foi tocada a
preparação antiga do Verifier6 nem seu probe residual.

## Provas por check

Nome exato do teste (pattern `^I5-Cn `), arquivo e situação. "Executado" =
rodou e passou nas duas linhas do alvo de privacidade acima (Windows e WSL).

| Check | Teste(s) | Arquivo | Situação |
| --- | --- | --- | --- |
| C1 | I5-C1; I5-C1b | policy.unit; outputs.cli | executado |
| C2 | I5-C2 | store.cli | executado (lote anterior, reexecutado) |
| C3 | I5-C3 | store.cli | executado |
| C4 | I5-C4 (15 linhas da matriz, 1 caso cada); I5-C4b | policy.unit; store.cli | executado |
| C5 | I5-C5 | policy.unit | executado |
| C6 | I5-C6 | policy.unit | executado |
| C7 | I5-C7 (forma D1 aprovada) | policy.unit | executado |
| C8 | I5-C8 | store.cli | executado |
| C9 | I5-C9 | policy.unit | executado |
| C10 | I5-C10; I5-C10b | store.cli; outputs.cli | executado |
| C11 | I5-C11 (11 campos × 7 valores inseguros + 4 nomes comuns) | policy.unit | executado |
| C12 | I5-C12 | policy.unit | executado |
| C13 | I5-C13 | policy.unit | executado |
| C14 | I5-C14 | outputs.cli | executado |
| C15 | I5-C15 | outputs.cli | executado |
| C16 | I5-C16 | policy.unit | executado |
| C17 | I5-C17 | policy.unit | executado |
| C18 | I5-C18 | policy.unit | executado |
| C19 | I5-C19 | policy.unit | executado |
| C20 | I5-C20 | limits.cli | executado |
| C21 | I5-C21 | policy.unit | executado — ver limite abaixo |
| C22 | I5-C22 | policy.unit | executado |
| C23 | I5-C23 | policy.unit | executado |
| C24 | I5-C24 | policy.unit | executado |
| C25 | I5-C25 | policy.unit | executado |
| C26 | I5-C26; I5-C26b | outputs.cli; store.cli | executado — `privacy_failure` 0 nos lotes do CLI, ver limite |
| C27 | I5-C27 | store.cli | executado |
| C28 | I5-C28 | policy.unit | executado |
| C29 | I5-C29; regressões I4-C36, I4-C13, I4-C16 | outputs.cli; failure-matrix.cli, codex-run.cli | executado (as da #4 dentro do `npm test`) |
| C30 | I5-C30 | store.cli | executado |
| C31 | I5-C31 | no-network | executado |
| C32 | I5-C32 (os 23 códigos por cenário real) | store.cli | executado |
| C33 | I5-C33 | outputs.cli | executado |
| C34 | I5-C34 | docs-privacy | executado |
| C35 | I5-C35 | docs-privacy | executado em `eed5658` nas duas plataformas (ver "Conferência do guia") |
| C36 | I5-C36 | store.cli | executado |
| C37 | I5-C37 | store.cli | executado |
| C38 | I5-C38 | store.cli | executado |
| C39 | I5-C39 (4 agentes × sem/com opt-in, fs-probe e sonda) | store.cli | executado |
| C40 | I5-C40 | store.cli | executado |
| C41 | I5-C41; I5-C41b | lifecycle.unit; store.cli | executado |
| C42 | I5-C42 | store.cli | executado |
| C43 | I5-C43 | store.cli | executado |
| C44 | I5-C44 | store.cli | executado |
| C45 | I5-C45 | lifecycle.unit | executado |
| C46 | I5-C46 | store.cli | executado |
| C47 | I5-C47 (ingest/export) e I5-C47s (demais comandos) | store.cli | executado |
| C48 | I5-C48 | store.cli | executado |
| C49 | I5-C49 | store.cli | executado (no Linux o `symlinkSync` cria link simbólico) |
| C50 | I5-C50 | store.cli | executado |
| C51 | I5-C51; `partial_delete` também pelo CLI em I5-C32 | lifecycle.unit; store.cli | executado |
| C52 | I5-C52; I5-C52b | lifecycle.unit; store.cli | executado |
| C53 | I5-C53 | store.cli | executado |
| C54 | I5-C54 | store.cli | executado |
| C55 | I5-C55 | demo.e2e | executado |
| C56 | I5-C56 (2 rodadas: stop no meio; stop+delete com produtores em voo) | demo.e2e | executado |
| C57 | `git diff --exit-code 1b6685f… -- scripts/code-review` | — | exit 0 (Windows, em `0f7f91b`) |
| C58 | I4-C47 | fixtures-inventory | executado no `npm test` das duas plataformas |
| C59 | `npm test` | — | exit 0 em `eed5658` nas duas plataformas (ver "Conferência do guia"); em `0f7f91b` saiu 1 só por I5-C35 |

Os testes parciais `I5-Cns` do lote anterior continuam na suíte; os checks
são fechados pelos nomes sem sufixo acima.

## Conferência do guia (commit `eed5658`, com esta evidência registrada)

| Plataforma | Comando | Resultado |
| --- | --- | --- |
| Windows 11 — Node 24.21.0, checkout local em `eed5658`, log em `%TEMP%\skill-me-i5-d1-win2-J3tIbf` | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 162 (156 pass, 6 skip, 0 fail), I5-C34 e I5-C35 inclusive |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i5-d1-xUhv4b` de `git archive eed5658` (sha256 `13e36b89…2243bfd2` igual nos dois lados) | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (416 pass, 1 skip); integrações 162 (150 pass, 12 skip, 0 fail), I5-C34 e I5-C35 inclusive |
| WSL Ubuntu | `node --test --test-skip-pattern="^I5-C35 " "tests/integrations/privacy/*.test.mjs"` | 73 tests, 73 pass, 0 fail, 0 skip |

Os skips são os mesmos listados acima. `git diff --exit-code 1b6685f… --
scripts/code-review` saiu 0 em `eed5658` (C57). O commit seguinte só acrescenta
esta seção ao registro.

## Limites honestos

- C21: pela política, o envelope sanitizado de um rascunho estruturalmente válido
  não passa de 4096 bytes (IDs viram 46 caracteres; no máximo 3 nomes por kind;
  o maior caso medido no teste fica abaixo do limite). A regra exata
  (`checkEnvelopeBudget`) é provada na camada que decide com envelopes válidos
  de 4096 (aceito, `validateEnvelope` verdadeiro) e 4097 (`envelope_oversize`);
  o caminho real `applyPolicy` é provado com rascunho válido cujo envelope
  minimizado tem 4096 (aceito) e 4097 bytes (`envelope_oversize`). A ramificação
  "sanitizado > 4096" não é alcançável por entrada válida hoje.
- C26/C28: `privacy_failure` só ocorre com objeto hostil em processo (getter ou
  Proxy), impossível a partir de JSON do stdin; está provado na camada (I5-C28) e
  vale 0 nos lotes mistos do CLI.
- C20: o limite de 64 KiB conta o `\r` de uma linha CRLF (comportamento do
  `createLineReader` da #4, não alterado).
- Regra 5 do sanitizador remove também valores após nomes como `tokenizer=`
  (falha fechada) e `Basic <8+ caracteres>` em prosa; o guia declara que a
  detecção por padrões não é universal.
- macOS fica para a CI do PR; nenhuma afirmação de execução local.
- Perfil `light`: um membro de conjunto pode ficar sem prova e um teste pode
  passar com implementação errada; nenhuma falha foi injetada sistematicamente.

# Correção dos achados do Verifier — rodada 1 (18/10/2026)

Evidência autoral, não verificação independente: não conta como nova rodada do
Verifier nem da revisão formal e não mexe nos tetos (Verifier 3, formal 2). O
relatório `.checks/issue-5-privacidade.verified.md` (FAIL, 56/59) não foi
editado. Escopo: só os três achados concretos (C11, C15, C3); nenhum check ou
critério foi alterado. Commits: `81cf3f8` (linha nova do Landing, antes do
código), `0292e67` (correção e provas) e o commit desta evidência (registro e
uma frase do guia).

## Natureza de cada achado

| Achado | Lacuna | Correção |
| --- | --- | --- |
| 1 — C11 `~` | **produto**: a forma v1 (`NAME_PATTERN`) recusava `~segredo` como `not_identifier` antes da política, e o motivo publicado divergia de `sensitive_removed`. Valia também para canários com `=`, `?` ou quebra de linha (URL, password, chave privada) e para nome inseguro acima de 128 caracteres (`too_long`) | `applyPolicy` decide o motivo dos 11 `NAME_FIELDS` pelo valor do rascunho (Landing "Nome inseguro recusado pela forma v1"): campo fora de `fields`, lacuna v1 dele retirada, `envelope.<campo>:sensitive_removed`. `boundary.mjs` inalterado; nome recusado só pela forma (`Bash;echo`) continua `not_identifier` sem entrada `privacy` |
| 2 — C15 | **prova**: chave privada ausente dos metadados, subconjunto de categorias por papel e nenhuma sonda de lock/temporário no lote de metadados. Ao completar a prova, o motivo dos nomes com URL/password/chave privada também caiu no achado 1 | I5-C15 reescrito: as cinco categorias, cada uma em todo papel de ID, nome e caminho dos quatro contratos (por categoria: Claude 6 entradas, Codex hooks 1, exec 3, Hermes 2) |
| 3 — C3 | **prova**: ambiente/configuração herdados só no ingest e hook Claude | I5-C3 estendido ao hook Codex, ingest Hermes da #4, wrapper Codex e aos quatro `--agent` do `privacy ingest`, mesmo `env`/`cwd` |

## O que cada prova agora afirma

- **I5-C11** (policy.unit): lista insegura com `~segredo`, `C:segredo`, `C:/x`,
  `dir/arquivo`, `alice@example.test`, token, cabeçalho, `sk-…`, password e chave
  privada dos canários e um nome de 129 caracteres com `/`, nos 11 campos (121
  casos): campo ausente, entradas `envelope.*` exatamente
  `[envelope.<campo>:sensitive_removed]`, nenhuma lacuna v1 do campo,
  `validateEnvelope` verdadeiro, sem canário nem valor. Controle por campo:
  `Bash;echo` → `<campo>:not_identifier` e nenhuma entrada `envelope.*` (distingue
  a correção de uma que trocasse todo `not_identifier`). Nomes comuns continuam
  intactos. Mensagens de falha usam `<campo>#<índice>`, sem ecoar canário.
- **I5-C15** (outputs.cli): cada entrada declara os IDs que devem sair como
  `h1:`+43, os nomes que devem pertencer ao `eventKind` e sair removidos sem
  lacuna v1, e o caminho que vira `ref`/`refs` com opt-in — prova de que a
  entrada chegou ao papel, não só de que o canário sumiu. `cwd` e
  `transcript_path` (não lidos pelos adaptadores) são entrada presente e ausente
  das saídas, sem afirmação além disso. Canais: stdout/stderr/fd3 de cada hook
  (30 processos) com `sensitive_removed` exato por processo; stdout/stderr/fd3 do
  ingest Hermes; relatório e stderr do wrapper (o filho não escreve stderr; o
  stdout nativo é repasse, C33); `privacy` start/ingest/export/status/stop/
  disable/delete/prune/delete --apply com e sem `--content`: stdout sem canário,
  stderr vazio, árvore final sem canário, export com IDs pseudonimizados, nomes
  `sensitive_removed` e refs. Sondas da C14 reutilizadas: `fs-probe` em todo
  ingest, stop e disable (≥ 8 temporários de dados e ≥ 8 de estado observados
  em `before_rename`, `containsCanary:false` em toda observação) e
  `privacy-probe` em todo comando (`.lock` escrito e fechado ao menos uma vez por
  comando, `containsMarker:false` em toda escrita, temporários inclusive). Os
  dois logs das sondas também são varridos e não contêm canário.
- **I5-C3** (store.cli): mesmas oito variáveis e três arquivos sintéticos.
  `privacy ingest` claude 2, codex-hooks 2, codex-exec 3, hermes 2 →
  `contentOmitted` `{content_disabled:n}` exato por lote; export com 9
  registros, `content:null` e `privacy` exatamente `["content:content_disabled"]`;
  `status` `{content_disabled:9}` e `content:false`. Hooks Claude e Codex,
  ingest Hermes (3 eventos) e wrapper (5 eventos + `process_exit`): eventos só
  com as chaves do envelope e `counters.privacy` exatamente 1, 1, 2 e 3 de
  `content_disabled`, os outros cinco códigos 0.

## RED → GREEN (Windows, Node 24.21.0)

Logs em `%TEMP%\skill-me-i5-fix1-win-rtrVsT\` (preservados; nenhum contém o
marcador `SKILLMECANARY`: `grep -c` = 0 em cada um). Comando: `node --test
--test-reporter=tap --test-name-pattern="^I5-C11 |^I5-C15 |^I5-C3 "` sobre
policy.unit, outputs.cli e store.cli.

| Log | Produto | Resultado |
| --- | --- | --- |
| `red.tap.log` | `81cf3f8` (antigo), testes novos | C11 `not ok` em `toolName#4` (`~segredo`: `[]` em vez de `[envelope.toolName:sensitive_removed]`); C15 `not ok` em `claude PreToolUse url nome sem lacuna v1`; C3 `ok` |
| `green-named.tap.log` | corrigido | C11 e C3 `ok`; C15 `not ok` — erro do próprio teste novo, abaixo |
| `green-named-2.tap.log` | corrigido | 3 `ok` |
| `red-2.tap.log` | `policy.mjs` do HEAD antigo restaurado temporariamente, testes já corrigidos | mesmo RED (C11 em `toolName#4`, C15 no nome `url`, C3 `ok`); o `policy.mjs` corrigido voltou em seguida, diff conferido |

- Erro de expectativa no teste novo, corrigido sem enfraquecer: o caso
  `expansion_slash_command` vira `skill_invocation` (`skillName`/`commandSource`),
  não `command_expansion`. A expectativa passou a esses nomes, entrou o caso
  `expansion_mcp_prompt` para exercitar `commandName` de fato, e a asserção
  passou a exigir que cada nome esperado pertença ao `eventKind` — uma lista
  errada não pode mais passar em silêncio.
- C3 verde no produto antigo: lacuna de prova, sem ativação indevida — o
  `content:false` explícito de `createObservation` já valia.

## Execuções no commit `0292e67`

| Plataforma | Comando | Resultado |
| --- | --- | --- |
| Windows 11 — Node 24.21.0, checkout local, árvore limpa, logs `win-privacy.tap.log`/`win-npm-test.log` no diretório acima | `node --test --test-reporter=tap "tests/integrations/privacy/*.test.mjs"` | 74 tests, 74 pass, 0 fail, 0 skip (C35 incluído) |
| Windows 11 | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 162 (156 pass, 6 skip, 0 fail) |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i5-fix1-Ce6R9L` de `git archive 0292e67` (sha256 `946f4f34…a3ece898633b` igual nos dois lados; `git get-tar-commit-id` = `0292e677…`), logs copiados para `%TEMP%\skill-me-i5-fix1-wsl-stage-DlxizN\` | mesmo alvo de privacidade | 74 tests, 74 pass, 0 fail, 0 skip (C35 incluído) |
| WSL Ubuntu | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (416 pass, 1 skip); integrações 162 (150 pass, 12 skip, 0 fail) |

Skips idênticos aos das execuções anteriores (lista em "Execuções do lote D1").
I5-C3, I5-C11 e I5-C15 aparecem `ok` nos dois logs do alvo de privacidade.

Preparação WSL: `run-wsl.sh` em arquivo no stage, chamado com
`MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash -l <script> <tar> <sha> <node_modules> <commit> <saída>`;
o script recusa root, outra distro, origem ausente, saída e destino fora de
`/tmp/skill-me-i5-fix1-??????` antes de copiar/extrair, e confere o hash antes
da extração. Antes dele, um preflight só de leitura (`id -u`, distro, versão do
node; resultado em `preflight.txt`) foi passado inline entre aspas simples —
sem mutação, mas fora da regra de script em arquivo; não foi repetido. Nenhum
`/repo` ou `/src.tar`; preparação antiga do Verifier6 e seu probe não tocados.
Nenhuma rejeição de política nem falha de capacidade ocorreu.

Durante o `npm test` do Windows editei e desfiz o guia em seguida; o log mostra
que a suíte de integrações (única que lê o guia e este arquivo) ainda não tinha
começado, então o gate exercitou o conteúdo de `0292e67`. A frase do guia
(`~` inicial) entra no commit desta evidência e o alvo de privacidade é
reexecutado nessa cabeça nas duas plataformas; o resultado fica no relatório
ao coordenador (registrá-lo aqui mudaria a cabeça de novo).

## Limites honestos

- `isUnsafeName` trata como sensível valor que o sanitizador não examina (NUL,
  surrogate isolado): um nome com NUL passa a `sensitive_removed`, não
  `not_identifier` — falha fechada registrada no Landing.
- C15 continua amostral dentro de cada papel: um caso por papel e categoria,
  não todas as combinações de campos; detecção por padrões não é universal.
- A ordem dos registros do export é a da ingestão; o teste a usa para casar
  cada entrada com seu registro.
- Perfil `light`: nenhuma falha injetada sistematicamente; um teste ainda pode
  passar com implementação errada fora dos casos enumerados.

# Correção da regressão do Verifier — rodada 2 (18/10/2026)

Evidência autoral, não verificação independente: não conta como rodada do
Verifier nem da revisão formal e não mexe nos tetos. O relatório
`.checks/issue-5-privacidade.verified.md` (FAIL, 58/59, Round 2) não foi
editado. Escopo: só o achado P2 da rodada 2 em `policy.mjs` e sua prova; C3,
C11 (valores estáveis, `~`, nomes recusados pela forma v1) e C15 preservados
sem mudança de asserção. Commits: `db1b6d0` (linha nova do Landing "Valor
entregue no envelope decide sempre", antes do código), `ff466e5` (correção e
prova) e o commit desta evidência (registro e comando de prova do C11 no
checklist, que passa a incluir `I5-C11b`).

## Natureza do achado e correção

- **Produto**, regressão introduzida em `0292e67`: `unsafeNameFields` relia
  `draft.fields[name]` e decidia só por essa releitura. Um getter que responde
  `CANARIES.token` na cópia de `buildEnvelope` (aceito por `NAME_PATTERN`, menos
  de 128 caracteres) e `Bash` na releitura deixava o token em
  `envelope.fields`, com `removed=[]` e `ok:true`. O mesmo valia para
  `fieldGaps` com getter que some na leitura de `buildEnvelope` e reaparece na
  releitura. JSON do stdin não produz getters; o contrato da API em processo
  cobre objetos hostis.
- **Correção**: o campo sai quando o valor efetivamente copiado em
  `envelope.fields` é inseguro, sem consultar o rascunho (o comportamento de
  `d936fc7`), **ou** quando o valor do rascunho é inseguro pela linha anterior
  do Landing (motivo do nome recusado pela forma v1). Mesmo predicado
  `isUnsafeName`; nenhuma regex nova, nenhum fallback bruto. `boundary.mjs`,
  core e configuração inalterados.

## O que a prova nova afirma

**I5-C11b** (policy.unit), nos 11 `NAME_FIELDS`:

- pré-condição: `buildEnvelope` com o getter token→`Bash` é aceito e o
  envelope contém o marcador (o cenário não é vazio);
- token→`Bash`, `Bash`→token e `fieldGaps` alternante (`absent`, ausente,
  `absent`) com token em `fields`: `ok:true`, campo fora de `fields`, entradas
  `envelope.*` exatamente `[envelope.<campo>:sensitive_removed]`,
  `validateEnvelope` verdadeiro e `leaks(...)` = `[]`;
- releitura que lança: `Bash`→erro → `{ok:false, drop:"privacy_failure"}`
  exato; token→erro → campo removido com o mesmo motivo, sem vazar (a remoção
  não depende da releitura).
- Mensagens `<campo> <cenário>`, sem eco de canário; os logs abaixo têm
  `grep -c SKILLMECANARY` = 0.

## RED → GREEN (Windows, Node 24.21.0)

Logs em `%TEMP%\skill-me-i5-fix2-win-FGsNfs\` (preservados).

| Log | Produto | Resultado |
| --- | --- | --- |
| `red.tap.log` | `policy.mjs` de `f8300cc` | I5-C11b `not ok` em `toolName token→Bash removido`; I5-C11 e I5-C28 `ok` |
| `red-scenarios.log` | idem, scratch do autor fora do repo (`scenarios.mjs`, só booleanos) | token→Bash `leak:true, reason:[]`; fieldGaps `leak:true, reason:[]`; Bash→token removido; token→erro `privacy_failure` |
| `green-scenarios.log` | corrigido | os quatro cenários sem vazamento, `sensitive_removed`; token→erro passa a remover sem reler (ver abaixo) |
| `green-named.tap.log` | corrigido | I5-C11b `not ok` — expectativa do próprio teste novo, abaixo; C3/C11/C15/C28 `ok` |
| `red-2.tap.log` | `policy.mjs` de `f8300cc` restaurado temporariamente, teste final | I5-C11b `not ok` em `toolName token→Bash removido`; o corrigido voltou em seguida (`cmp` igual à cópia `policy.fixed.mjs`) |
| `green-named-2.tap.log` | corrigido, teste final | I5-C3, I5-C11, I5-C11b, I5-C15, I5-C28: 5 `ok` |

Expectativa corrigida no teste novo, ainda não commitado, sem enfraquecer: o
primeiro texto esperava `privacy_failure` para token→erro, mas a correção
decide pelo valor entregue antes de reler, então o token é removido sem a
releitura. O caso passou a duas asserções exatas: `Bash`→erro (releitura
necessária) → `privacy_failure`; token→erro → removido sem vazar.

## Execuções no commit `ff466e5`

| Plataforma | Comando | Resultado |
| --- | --- | --- |
| Windows 11 — Node 24.21.0, checkout local, árvore limpa, logs `win-privacy.tap.log`/`win-npm-test.log` no diretório acima | `node --test --test-reporter=tap "tests/integrations/privacy/*.test.mjs"` | 75 tests, 75 pass, 0 fail, 0 skip (C35 e C11b incluídos) |
| Windows 11 | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 163 (157 pass, 6 skip, 0 fail) |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i5-fix2-xwO3AE` de `git archive ff466e5` (sha256 `45159b6a…7d2d5489` igual nos dois lados; `git get-tar-commit-id` = `ff466e5d…` conferido dentro do script antes da extração), logs em `%TEMP%\skill-me-i5-fix2-wsl-stage-SWY4yO\` | mesmo alvo de privacidade | 75 tests, 75 pass, 0 fail, 0 skip (C35 e C11b incluídos) |
| WSL Ubuntu | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (416 pass, 1 skip); integrações 163 (151 pass, 12 skip, 0 fail) |

Skips idênticos aos anteriores, conferidos nos logs: Windows doctor 7 (POSIX
symlink/FIFO), integrações 6 (I4-C15, I4-C25b/j/k/l/m); WSL doctor 1
(`hermes_cli.PYD`), integrações 12 (I4-C18–23/C37/C44b Hermes ausente,
I4-C25g/h/i DACL Windows, I4-C25m macOS). Integrações passam de 162 para 163
só pelo I5-C11b.

Preparação WSL: `run-wsl.sh` em arquivo no stage (derivado do da rodada 1, só
prefixos trocados e a guarda do commit do tar acrescentada), chamado com
`MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash -l <script> <tar> <sha> <node_modules> <commit> <saída>`;
recusa root, outra distro, origem ausente, saída e destino fora do padrão antes
de copiar/extrair. Sem preflight inline nesta rodada. Nenhum `/repo` ou
`/src.tar`; preparação antiga do Verifier6, seu probe, sessões ou
configurações pessoais não tocados; nenhum modelo chamado. Nenhum arquivo do
repositório editado durante os gates; WSL só iniciou depois do fim do gate
Windows.

## Limites honestos

- Getter que muda entre leituras pode remover um nome comum (`Bash`→token)
  com `sensitive_removed`: falha fechada declarada no Landing.
- O motivo do nome recusado pela forma v1 ainda depende da releitura do
  rascunho; um getter hostil pode fazê-lo cair como lacuna v1
  (`not_identifier`) em vez de `sensitive_removed`. Nesse caso nenhum valor sai
  no envelope (a forma já o recusou); só o motivo pode divergir.
- Os cenários hostis são de API em processo; não houve vazamento observado por
  CLI/JSON nem antes nem depois.
- Esta evidência muda o conteúdo lido por C34/C35; o alvo de privacidade é
  reexecutado na cabeça desta evidência nas duas plataformas e o resultado vai
  ao coordenador (registrá-lo aqui mudaria a cabeça de novo).
- Perfil `light`: nenhuma falha injetada sistematicamente fora dos cenários
  enumerados.

# Correção dos achados da revisão formal — tentativa 1 (18/10/2026)

Evidência autoral, não verificação independente nem revisão formal: não conta
como rodada do Verifier nem tentativa da revisão e não altera tetos. O relatório
`.checks/code-review/issue-5/formal-round1-report.json` (`changes_requested`) e o
`.verified.md` não foram editados. Escopo: os três achados bloqueantes do
relatório e suas provas; nenhuma decisão de produto nova. Commits: `4864e77`
(três linhas novas do Landing, antes do código), `204d201` (correção, provas,
guia e comandos de prova no checklist) e o commit desta evidência.

## Natureza de cada achado e correção

- **P1 `content.mjs`** (produto): na projeção `structured`, só o valor passava
  pelo sanitizador; uma chave como `ghp_…` (cabe em `^[A-Za-z0-9_.-]{1,64}$`, sem
  palavra de `isSensitiveKey`) era copiada literal para o registro, temporários,
  segmento e export. Correção: depois das duas checagens existentes, a chave
  aceita passa pelo próprio `sanitizeText`; se ele remove algo, o membro sai
  inteiro com `sensitive_removed`, conta como membro visitado e a subárvore não é
  descida. Nenhuma regex nova; a chave nunca é reescrita (sem colisão em
  `[removido]`).
- **P1 `sanitize.mjs`** (produto): a regra 2 classificava o nome de query bruto;
  `?t%6fken=…` mantinha o valor. Correção: `isSensitiveQueryName` aceita o nome
  como veio ou `decodeURIComponent(nome)` (uma camada); escape inválido conta
  como sensível (falha fechada). O nome continua como veio; só o valor vira
  `[removido]`. A exceção de decodificação é engolida e vira a decisão fechada:
  nenhuma cópia bruta vai a erro ou log.
- **P2 `store.mjs`** (produto): `isValidState` aceitava `dataBytes` acima de
  8 MiB e o export o usava como teto de `readSnapshot` (`Buffer.alloc(max + 1)`).
  Correção: `dataBytes <= PRIVACY_LIMITS.maxBytes` na validação do estado, então
  status, ingest, export, append, stop/disable, delete e prune recusam com
  `capture_invalid` antes de abrir ou alocar o segmento.

## O que cada prova nova afirma

- **I5-C16b** (policy.unit, decisão de `extractContent`): pré-condição de que as
  oito chaves de `KEY_CANARIES` (GitHub, GitHub PAT, OpenAI, Slack, AWS, GitLab,
  Google, JWT) cabem no padrão de chave, não são `isSensitiveKey` e são
  reconhecidas pelo sanitizador; para cada uma, no topo, aninhada em objeto e em
  objeto dentro de array, com subárvores que estourariam profundidade (10) ou
  membros (138) se descidas: conteúdo mantido, `privacy` exatamente
  `["item.arguments:sensitive_removed"]`, projeção exata com os irmãos (`q`,
  `ghp_curto`, `keep`) e sem chave `[removido]`. Limite: 127 membros + chave
  descartada cabem em 128; 128 + chave → `content:unsanitizable`.
- **I5-C17b** (policy.unit): valores exatos de `sanitizeText` para `t%6fken`,
  `%74%6F%6B%65%6E`, `to%4Ben`, `to%E2%84%AAen` (K Kelvin), parâmetros mistos
  (`api%5Fkey`, `Pass%77ord`, `client%2Dsecret` removidos; `page`, `q`, `p%61ge`
  mantidos), escape inválido `t%zzoken` e UTF-8 incompleto `a%E0` (valor removido);
  controles inalterados com `removed:false` (nome comum codificado, palavra
  sensível só no valor, `%25`, valor já `[removido]`); comando Bash Claude pela
  política com só o valor removido e `sensitive_removed`.
- **I5-C14b** (outputs.cli, CLI real com `fs-probe` + sonda de privacidade):
  `start --content`, ingest codex-exec (`mcp_tool_call` com as oito chaves-token
  no topo, aninhadas e em array; `command_execution` com a URL codificada),
  Claude (pre/post Bash) e Codex hooks (pre Bash); nenhum arquivo da árvore,
  stdout, log de sonda, temporário observado antes do rename (≥ 3 de dados) ou
  arquivo escrito (lock de cada comando, temporários) contém o marcador; export
  com projeção exata, os sete campos de texto esperados e cada URL só com o valor
  removido; `stderr` vazio em todos os comandos; delete aplicado.
- **I5-S-databytes** (store.unit, IO injetável que registra aberturas e tetos de
  `readBounded` e nunca repassa teto acima de 8 MiB ao leitor real): 8 388 608 →
  status 0 e export abre o segmento com teto 8 388 608 (recusa depois pelo tamanho
  real menor); 8 388 609 e 1 073 741 824 → export, status, stop e `delete --apply`
  saem 3 `capture_invalid`, sem abrir o segmento e com todo teto ≤ 64 KiB;
  `appendRecords` recusa `capture_invalid` sem abrir; árvore idêntica; estado
  restaurado volta a valer.
- **I5-S-databytes-cli** (store.cli, sonda de privacidade no processo real):
  mesmos três valores; export/status/ingest com 8 388 609 e 1 GiB saem 3 com o
  corpo de erro exato, stdout sem raiz/`Error`/`at `, stderr vazio, nenhuma
  abertura do segmento e árvore idêntica; no limite o segmento é aberto; estado
  restaurado exporta os 2 registros.
- I5-S-bounded, C13, C16, C17, C19, C52/C53 e os contadores permanecem sem
  mudança de asserção. As falhas usam rótulos sem eco de canário (`assert.ok`
  sem diff onde o valor real pode conter o marcador).

## RED → GREEN (Windows, Node 24.21.0)

Logs em `%TEMP%\skill-me-i5-formal1-win-0RR1XS\` (preservados).

| Log | Produto | Resultado |
| --- | --- | --- |
| `red.tap.log` | `4864e77` (antes da correção), primeira versão dos testes | 5 `not ok` (C14b, C16b, C17b, S-databytes, S-databytes-cli), S-bounded `ok`; 2 linhas ecoavam a palavra-marcador por `deepEqual(leaks…)` — trocado por `assert.ok` sem diff |
| `red-2.tap.log` | idem | mesmos 5 `not ok`; 0 ocorrências do marcador |
| `green.tap.log` | corrigido | S-databytes `not ok` por expectativa errada do próprio teste (abaixo); os outros 9 `ok` |
| `red-final.tap.log` | três módulos de `HEAD` restaurados temporariamente, testes finais | 5 `not ok`: C14b (arquivo de dados), C16b (`github conteúdo mantido`), C17b (`?t%6fken=`), S-databytes (teto 8 388 609 pedido para o segmento), S-databytes-cli (segmento aberto em 8 388 609 — antes de chegar a 1 GiB, sem alocação gigante); módulos corrigidos devolvidos e conferidos por `cmp` |
| `red-only-content.tap.log`, `red-only-sanitize.tap.log`, `red-only-store.tap.log` | um módulo antigo por vez | cada regressão é detectada isoladamente: content → C14b e C16b; sanitize → C14b e C17b; store → S-databytes e S-databytes-cli |
| `green-2.tap.log` | corrigido, testes finais | 10/10 `ok` (novos + C13, C16, C17, C19, S-bounded) |

Todos os logs acima, exceto `red.tap.log`, têm `grep -c SKILLMECANARY` = 0.

Expectativa corrigida sem enfraquecer: o I5-S-databytes esperava exportar os
registros manuais de `appendSanitized` depois de restaurar o estado, mas esses
registros não têm envelope v1 (o helper declara isso), então o export é
`capture_invalid` por desenho. O controle do estado restaurado passou a ser
`status` com o `dataBytes` original; o export restaurado é provado no
I5-S-databytes-cli com registros do ingest real.

## Execuções no commit `204d201`

| Plataforma | Comando | Resultado |
| --- | --- | --- |
| Windows 11 — Node 24.21.0, checkout local, árvore limpa, logs `win-privacy.tap.log`/`win-npm-test.log` no diretório acima | `node --test --test-reporter=tap "tests/integrations/privacy/*.test.mjs"` | 80 tests, 80 pass, 0 fail, 0 skip (C35 e os 5 novos incluídos) |
| Windows 11 | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 168 (162 pass, 6 skip, 0 fail) |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i5-formal1-yOn8BA` de `git archive 204d201` (sha256 `b7d05782…6d305a46` igual nos dois lados; `git get-tar-commit-id` = `204d2011…` conferido no script antes da extração), logs em `%TEMP%\skill-me-i5-formal1-wsl-stage-H5wmIm\` | mesmo alvo de privacidade | 80 tests, 80 pass, 0 fail, 0 skip (C35 e os 5 novos incluídos) |
| WSL Ubuntu | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (416 pass, 1 skip); integrações 168 (156 pass, 12 skip, 0 fail) |

Skips idênticos aos anteriores, conferidos nos logs: Windows doctor 7 (POSIX
symlink/FIFO), integrações 6 (I4-C15, I4-C25b/j/k/l/m); WSL doctor 1
(`hermes_cli.PYD`), integrações 12 (I4-C18–23/C37/C44b Hermes ausente,
I4-C25g/h/i DACL Windows, I4-C25m macOS). Integrações passam de 163 para 168 só
pelos cinco testes novos.

Preparação WSL: `run-wsl.sh` em arquivo no stage, derivado do da rodada 2 só
com prefixos trocados (diff conferido), chamado com
`MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash -l <script> <tar> <sha> <node_modules> <commit> <saída>`;
recusa root, outra distro, origem ausente, saída e destino fora do padrão antes
de copiar/extrair. Nenhum comando inline no WSL. Nenhum `/repo` ou `/src.tar`;
preparação antiga do Verifier6, seu probe, sessões ou configurações pessoais não
tocados; nenhum modelo chamado, nenhuma rede de produto. Nenhum arquivo do
repositório editado durante os gates; o WSL só começou depois do fim do gate
Windows. Nenhuma rejeição de política nem falha de capacidade.

## Limites honestos

- Uma camada de decodificação: `t%256fken` (codificação dupla) não é tratado
  como `token` — limite declarado no Landing e no guia.
- Valor de query codificado com formato de token (`?q=ghp%5F…`) não é
  decodificado antes das regras de formato; fora dos três achados, registrado
  aqui sem correção.
- Nome com escape inválido perde o valor mesmo sem palavra sensível (falha
  fechada).
- Chave de `structured` com formato de token é omitida com o membro; o valor
  útil sob ela se perde por desenho.
- Esta evidência muda o conteúdo lido por C34/C35; o alvo de privacidade é
  reexecutado na cabeça desta evidência e o resultado vai ao coordenador
  (registrá-lo aqui mudaria a cabeça de novo).
- Perfil `light`: nenhuma falha injetada sistematicamente fora dos cenários
  enumerados. Este verde é autoral; uma nova rodada independente depende de
  decisão humana específica.

# Variante: token codificado em valor de query (18/10/2026)

Evidência autoral, não verificação independente nem revisão formal: não conta
como rodada do Verifier nem tentativa da revisão e não altera tetos. Relatórios
formais e `.verified.md` não foram editados. Origem: o lote formal1 registrou
como limite que `?q=ghp%5F…` guardava um token codificado em valor de query; o
coordenador comunicou o risco e decidiu corrigir a variante na mesma entrega,
dentro da sanitização de URL/token já aprovada (critérios 5/6, S2, AC2/AC3).
Commits: `eaf78ea` (linha do Landing, antes do código), `2a8760d` (correção,
provas, guia e comandos de prova) e o commit desta evidência.

## Correção

`sanitize.mjs`, regra 2: com nome não sensível, valor não vazio, ainda não
`[removido]` e contendo `%`, `isUnsafeQueryValue` decodifica uma camada
(`decodeURIComponent`) só para decidir e aplica `hasTokenFormat`, que percorre o
próprio `TOKEN_FORMATS` da regra 6 (sem regex paralela; `search` não altera o
`lastIndex` usado depois pelo `replace`). Formato encontrado → o valor inteiro
vira `[removido]`, o nome fica como veio. Escape inválido → valor removido
(falha fechada; a exceção é engolida, sem cópia em erro/log). Valor sem `%` não é
decodificado; valor bem formado sem token fica literal na forma codificada. Sem
nova decodificação, sem regras 3–5 sobre o decodificado e sem alcance fora dos
pares `[?&]nome=valor` que a regra 2 já casa. As três correções formais e as
anteriores ficam intactas (C14b, C16b, C17b, S-databytes no verde abaixo).

## O que cada prova nova afirma

- **I5-C17c** (policy.unit, `sanitizeText` exato): `ghp` com `_` como `%5F` e
  `%5f`; valor inteiro codificado; prefixo `ghp_` codificado; texto útil com
  `%20` antes do token; token entre `%22`; cada formato de `KEY_CANARIES`
  (GitHub, GitHub PAT, OpenAI, Slack, AWS, GitLab, Google, JWT) com um separador
  ou letra codificado entre `page=2` e `sort=asc`; `q` genérico entre `page`,
  `sort`, `redirect=https%3A%2F%2F…` e `lang=pt%2Dbr` com um segundo valor
  inteiro codificado; nome e valor codificados; malformados (`…%zz`, `100%`,
  `%E0abc`) → `{ok:true, text:<exato>, removed:true}`. Controles com
  `removed:false` e texto idêntico: `100%25`, `caf%C3%A9` + redirect codificado,
  `ghp%5Fcurto`, `+` como espaço e valor vazio, valor já `[removido]`, limite de
  uma camada `ghp%255F…` e prefixo colado `abcghp%5F…` (mesmo lookbehind do
  literal, conferido). Fronteira da política: comando Bash Claude com
  `ENCODED_VALUE_URL` sai exatamente com os dois valores removidos, com
  `tool_input.command:sensitive_removed`, sem marcador literal nem codificado.
- **I5-C14c** (outputs.cli, CLI real com `fs-probe` + sonda de privacidade):
  duas passadas, uma com as sondas procurando `SKILLMECANARY` e outra
  procurando sua forma inteira em `%XX` (as sondas aceitam um marcador por vez);
  `start --content`, ingest codex-exec (`command_execution` com comando e saída),
  Claude (pre/post Bash) e Codex hooks (pre Bash) com a URL de valores
  codificados; nenhum arquivo da árvore, stdout, log de sonda, temporário antes
  do rename (≥ 3 de dados) ou arquivo escrito (lock de cada comando,
  temporários) contém o marcador literal ou codificado; export com os sete
  campos de texto exatos (`page`, `sort`, `lang` literais) e `sensitive_removed`
  em cada registro com conteúdo; `stderr` vazio; delete aplicado.
- Nenhuma asserção, limite ou critério existente foi alterado; controles sem
  segredo e truncamento após sanitização (C24) continuam no verde.

## RED → GREEN (Windows, Node 24.21.0)

Logs em `%TEMP%\skill-me-i5-encval-win-iDx8aU\` (preservados).

| Log | Produto | Resultado |
| --- | --- | --- |
| `red.tap.log` | `eaf78ea` (antes da correção), testes finais (não mudaram depois) | 2/2 `not ok`: C14c no primeiro arquivo de dados após o ingest (`events-000003.ndjson`), C17c no primeiro caso (`ghp com _ codificado`); 0 ocorrências do marcador |
| `green.tap.log` | `2a8760d` | 7/7 `ok` (C14b, C14c, C16b, C17, C17b, C17c, C24); 0 ocorrências do marcador |

## Execuções no commit `2a8760d`

| Plataforma | Comando | Resultado |
| --- | --- | --- |
| Windows 11 — Node 24.21.0, checkout local, árvore limpa antes e depois, HEAD conferido antes e depois, logs `win-privacy.tap.log`/`win-npm-test.log` no diretório acima | `node --test --test-reporter=tap "tests/integrations/privacy/*.test.mjs"` | 82 tests, 82 pass, 0 fail, 0 skip (C35 e os 2 novos incluídos) |
| Windows 11 | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 170 (164 pass, 6 skip, 0 fail) |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i5-encval-ethT23` de `git archive 2a8760d` (sha256 `9b097c95…84ded0e9e` igual nos dois lados; `git get-tar-commit-id` = `2a8760d8…` conferido no script antes da extração), logs em `%TEMP%\skill-me-i5-encval-wsl-stage-FDADlF\` | mesmo alvo de privacidade | 82 tests, 82 pass, 0 fail, 0 skip (C35 e os 2 novos incluídos) |
| WSL Ubuntu | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (416 pass, 1 skip); integrações 170 (158 pass, 12 skip, 0 fail) |

Skips idênticos aos do lote formal1 (linhas `﹣` comparadas por `diff` no WSL;
Windows conferido pelos nomes): Windows doctor 7 (POSIX symlink/FIFO),
integrações 6 (I4-C15, I4-C25b/j/k/l/m); WSL doctor 1 (`hermes_cli.PYD`),
integrações 12 (I4-C18–23/C37/C44b Hermes ausente, I4-C25g/h/i DACL Windows,
I4-C25m macOS). Integrações passam de 168 para 170 só pelos dois testes novos.
Nenhum log contém `SKILLMECANARY`.

Preparação WSL: `run-wsl.sh` em arquivo no stage, derivado do lote formal1 só
com prefixos e comentário trocados (diff conferido), chamado com
`MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash -l <script> <tar> <sha> <node_modules> <commit> <saída>`;
recusa root, outra distro, origem ausente, saída e destino fora do padrão antes
de copiar/extrair. Nenhum comando inline no WSL; nenhum `/repo` ou `/src.tar`;
preparação antiga do Verifier6, seu probe, sessões ou configurações pessoais não
tocados; nenhum modelo, rede de produto, subagente ou `review:run`. Nenhum
arquivo do repositório editado durante os gates; o WSL começou depois do fim do
gate Windows. Nenhuma rejeição de política nem falha de capacidade.

## Limites honestos

- Supersede o segundo item dos limites do lote formal1 ("valor de query
  codificado com formato de token não é decodificado"), que fica como histórico:
  agora uma camada é examinada nos valores de query.
- Uma camada só: `%255F` não vira `_` (controle em C17c). Sem decodificação de
  texto codificado fora dos pares da regra 2, e sem as regras 3–5 (cabeçalho,
  `Bearer`, atribuição) sobre o valor decodificado: só os formatos da regra 6.
- Valor removido inteiro, inclusive o texto útil ao redor do token; valor
  malformado sem segredo (`q=100%`) também é perdido (falha fechada).
- Prefixo colado sem separador (`abcghp%5F…`) não é reconhecido, como no texto
  literal. Detecção por padrões continua sem garantia universal.
- Esta evidência muda o conteúdo lido por C34/C35; o alvo de privacidade e o
  `npm test` são reexecutados na cabeça desta evidência nas duas plataformas e o
  resultado vai ao coordenador (registrá-lo aqui mudaria a cabeça de novo).
- Perfil `light`: nenhuma falha injetada fora dos cenários enumerados. Este
  verde é autoral; nova rodada independente depende de decisão do proprietário.

# Correção dos dois P1 da revisão formal — tentativa 2 (18/10/2026)

Evidência autoral, não verificação independente nem revisão formal: não conta
como rodada do Verifier nem tentativa da revisão e não altera tetos. O relatório
`.checks/code-review/issue-5/formal-round2-report.json` (`changes_requested`), o
`.verified.md` e os relatórios anteriores não foram editados. As duas tentativas
formais e as quatro rodadas independentes estão consumidas; uma nova
verificação depende de decisão específica do proprietário. Commits: `7a32af6`
(linha nova do Landing "Delimitação do valor da regra 5 e do userinfo de URL",
antes do código), `1dbbb3e` (correção, provas, guia e comandos de prova no
checklist) e o commit desta evidência.

## Natureza de cada achado e correção

- **P1 regra 5** (produto): `ASSIGNMENT_VALUE`/`FLAG_VALUE` paravam em `,`, `;`,
  `&`, `}` e aspas; `DB_PASSWORD=prefix,SKILLMECANARYdbpass` e `--password
  prefix,…` saíam `[removido],<sufixo>` com `sensitive_removed`. A mesma
  delimitação deixava parte do valor com aspas coladas (`a"b"`), separador
  escapado (`a\,b`, `a\;b`, `a\ b`), `-` inicial em flag e aspa multilinha ou não
  fechada. Correção: um padrão único `SENSITIVE_VALUE` (substitui os dois) toma a
  palavra de shell inteira na mesma linha; aspa sem fecho na linha ou `\` no fim
  dela levam o valor até o fim do texto (falha fechada). Para não reprocessar o
  texto ao redor das remoções das regras 1–4 (`-H 'Authorization: …' -H …`,
  `?token=…#frag`), elas gravam um marcador interno NUL — impossível na entrada,
  que é recusada antes — trocado por `[removido]` logo depois da regra 5. O texto
  literal `[removido]` da entrada só isenta o valor quando é ele inteiro.
- **P1 userinfo** (produto): `URL_USERINFO` excluía `@` e parava no primeiro.
  Correção: a classe da autoridade aceita `@` e o greedy recua até o último `@`
  antes de `/?#`, espaço, aspa ou `<>`. Nenhuma regex paralela; ordem das regras,
  nomes sensíveis, `TOKEN_FORMATS`, decodificação de query, chaves de
  `structured`, `dataBytes`, getters e ciclo de vida inalterados.

## O que cada prova nova afirma

- **I5-C14d** (policy.unit, `sanitizeText` exato, 36 casos `removed:true` + 4
  controles `removed:false`): os dois cenários do achado; vírgula no início, no fim
  e várias, em atribuição, flag e `--password=`; valores entre aspas com vírgula e
  concatenados com aspas; `\,`, `\;`, `\ `; `}`, `]`, `#`; `-`/`--` inicial em
  flag; JSON compacto e espaçado (perda declarada); aspa não fechada, aspa
  multilinha na palavra e depois dela, `\` de continuação, aspa de fecho em
  `bash -lc '…'`; `[removido]` literal seguido de aspa ou vírgula; separadores que
  delimitam (`;`, `&&`, `|`, `>`, `<`, `()`, tab, quebra de linha, `&`) com o resto
  intacto; remoções das regras 2–4 com o texto ao redor intacto. Controles:
  vírgulas e `;` sem nome sensível, aspas e escape sem segredo, valor já
  `[removido]`. Fronteira da política: comando Bash Claude `DELIMITED_COMMAND` sai
  exatamente `DELIMITED_COMMAND_OUT` com `sensitive_removed` e sem vazamento.
- **I5-C17d** (policy.unit, 12 casos + 4 controles): o cenário do achado; vários
  `@`; usuário vazio, senha vazia e ambos; `%40` no usuário e na senha; URL entre
  aspas; várias URLs separadas por espaço e coladas por vírgula; `@` no caminho, na
  query e no fragmento preservado; `ssh://`. Controles: `@` fora da autoridade,
  `%40` no caminho, `mailto:`, `git@host:`, porta, `https://@host` (userinfo
  vazio, nada a remover). Fronteira da política com `git clone`.
- **I5-C14e** (outputs.cli, CLI real com `fs-probe` + sonda de privacidade):
  `start --content`, ingest codex-exec (comando e saída), Claude (pre/post Bash) e
  Codex hooks (pre Bash) com `DELIMITED_COMMAND`/`DELIMITED_OUTPUT`; nenhum arquivo
  da árvore após o ingest, stdout, log de sonda, temporário antes do rename (≥ 3 de
  dados) ou arquivo escrito (lock de cada comando, temporários) contém o marcador;
  export com os sete campos de texto exatos e `sensitive_removed` em cada registro
  com conteúdo; `stderr` vazio; delete aplicado e `captures/` vazio.
- Rótulos por índice (`caso n`, `controle n`) e comparação sem diff: nenhuma
  mensagem ecoa canário. Nenhuma asserção, limite ou critério existente mudou.

## RED → GREEN (Windows, Node 24.21.0)

Logs em `%TEMP%\skill-me-i5-formal2-win-ZhWDQ4\` (preservados; todos com
`grep -c SKILLMECANARY` = 0).

| Log | Produto | Resultado |
| --- | --- | --- |
| `red.tap.log` | `7a32af6` (antes da correção), testes finais | 3/3 `not ok`: C14e no primeiro arquivo de dados após o ingest (`events-000003.ndjson`), C14d e C17d no `caso 0` (os cenários do achado) |
| `green.tap.log` | corrigido | 12/12 `ok`: os 3 novos e C4, C14, C14b, C14c, C16b, C17, C17b, C17c, C24 |
| `red-2.tap.log` | `sanitize.mjs` de `7a32af6` restaurado temporariamente | os mesmos 3 `not ok`; o corrigido voltou em seguida (`cmp` igual a `sanitize.fixed.mjs`) |
| `red-cases.log` | scratch do autor fora do repo (`scratch/compare.mjs`, só booleanos) | antigo deixa o marcador em 32 dos 36 casos do C14d e 8 dos 12 do C17d; corrigido em 0. Os casos sem marcador no antigo (vírgula final, aspas inteiras, `#`, JSON, e no C17d vazios/`%40` com o marcador antes do primeiro `@`) ficam como cobertura; as saídas exatas do teste também detectam o resto do userinfo que o antigo deixava |

## Execuções no commit `1dbbb3e`

| Plataforma | Comando | Resultado |
| --- | --- | --- |
| Windows 11 — Node 24.21.0, checkout local, árvore limpa e HEAD `1dbbb3e` conferidos antes e depois (`win-head-before.txt`/`win-head-after.txt`), logs `win-privacy.tap.log`/`win-npm-test.log` no diretório acima | `node --test --test-reporter=tap "tests/integrations/privacy/*.test.mjs"` | 85 tests, 85 pass, 0 fail, 0 skip (C35 e os 3 novos incluídos) |
| Windows 11 | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (410 pass, 7 skip); integrações 173 (167 pass, 6 skip, 0 fail) |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i5-formal2-FH6KWm` de `git archive 1dbbb3e` (sha256 `1b994ca3…f108fe0e9` igual nos dois lados; `git get-tar-commit-id` = `1dbbb3ef…` conferido no script antes da extração), logs em `%TEMP%\skill-me-i5-formal2-wsl-stage-8OoqPO\` | mesmo alvo de privacidade | 85 tests, 85 pass, 0 fail, 0 skip (C35 e os 3 novos incluídos) |
| WSL Ubuntu | `npm test` | exit 0 — governança 6/6; code-review 16/16; doctor 417 (416 pass, 1 skip); integrações 173 (161 pass, 12 skip, 0 fail) |

Skips idênticos aos anteriores, conferidos pelos nomes nos logs: Windows doctor 7
(POSIX symlink/FIFO), integrações 6 (I4-C15, I4-C25b/j/k/l/m); WSL doctor 1
(`hermes_cli.PYD`), integrações 12 (I4-C18–23/C37/C44b Hermes ausente,
I4-C25g/h/i DACL Windows, I4-C25m macOS). Integrações passam de 170 para 173 só
pelos três testes novos. Nenhum log contém `SKILLMECANARY`.

Preparação WSL: `run-wsl.sh` em arquivo no stage, derivado do da variante de
query só com prefixos e comentário trocados (`diff` conferido), chamado com
`MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash -l <script> <tar> <sha> <node_modules> <commit> <saída>`;
recusa root, outra distro, origem ausente, saída e destino fora do padrão antes
de copiar/extrair. Nenhum comando inline no WSL; nenhum `/repo` ou `/src.tar` fora
do `mktemp`; preparação antiga do Verifier6, seu probe, sessões ou configurações
pessoais não tocados; nenhum modelo, rede de produto, instalação, subagente ou
`review:run`. Nenhum arquivo do repositório editado durante os gates; o WSL só
começou depois do fim do gate Windows. Nenhuma rejeição de política nem falha de
capacidade.

## Riscos vizinhos comunicados (não corrigidos)

Mesma família de delimitação, fora dos dois achados e das regras alteradas;
reproduzidos por `scratch/neighbors.mjs` (só booleanos, `neighbors-old.log` e
`neighbors-fixed.log`), iguais antes e depois desta correção:

- Regra 4: `Bearer abcdefgh12,<sufixo>` sem nome de cabeçalho remove só até a
  vírgula (a classe de `AUTH_SCHEME` segue o alfabeto de token da RFC 6750).
- Regra 2: `?password=abc'<sufixo>'` remove o valor da query só até a aspa (a
  query termina em aspa por desenho, para URLs entre aspas).
- Regra 3: cabeçalho escrito com espaços escapados e aspa colada
  (`Authorization:\ Bearer\ abc'<sufixo>'`) remove só até a aspa.

Nos três o valor é delimitado como aspa de fecho, por desenho das regras 2–4;
mudar isso é decisão nova do coordenador/proprietário.

## Limites honestos

- Perdas da falha fechada (Landing e guia): JSON compacto perde o que segue o
  valor sem espaço; opção depois de flag sensível sem valor é removida como valor;
  depois de aspa ambígua o resto do texto sai.
- Não é parser de shell: sem expansões, heredoc, `$'…'` ou aninhamento de
  substituições; uma aspa que fecha numa linha seguinte encerra o texto (removido
  até o fim), não é reconstruída.
- Userinfo com `/`, `?` ou `#` sem codificação não é reconhecido como userinfo (a
  autoridade termina neles, como no WHATWG URL).
- Esta evidência muda o conteúdo lido por C34/C35; o alvo de privacidade e o
  `npm test` são reexecutados na cabeça desta evidência nas duas plataformas e o
  resultado vai ao coordenador (registrá-lo aqui mudaria a cabeça de novo).
- Perfil `light`: nenhuma falha injetada fora dos cenários enumerados. Este verde
  é autoral; não é aprovação independente nem formal.

# Valor sensível composto ou de delimitação ambígua (18/10/2026)

Evidência autoral, não verificação independente nem revisão formal: não conta
como rodada do Verifier nem tentativa da revisão e não altera tetos. Nenhum
relatório anterior, `.verified.md`, incidente ou aprovação foi editado. As duas
tentativas formais e as quatro rodadas independentes estão consumidas; nova
verificação depende de extensão humana pedida pelo coordenador. Escopo: cenário
comunicado pelo coordenador depois do lote formal2 (`prefix$(printf …)`, crases
e `${…}` com espaço) e os três riscos vizinhos daquele lote, autorizados no mesmo
S2/crit. 6. Commits: `f744162` (Landing "Valor sensível composto…", antes do
código), `2dd410d` (Landing: userinfo fechado com aspas removido, aberto omitido —
escolha surgida ao trabalhar os casos, registrada antes do código), `53f3f00`
(correção, provas, guia, comandos de prova e a linha "Tempo linear do
sanitizador", escrita depois da primeira versão do código e rotulada assim),
`7b3ebf4` (correção de um defeito do próprio teste I5-C14g, abaixo) e o commit
desta evidência.

## Natureza de cada problema e correção

- **Composição aberta** (produto): `SENSITIVE_VALUE` parava em `(` e em espaço;
  `DB_PASSWORD=prefix$(printf …)` removia `prefix$` e entregava
  `(printf <marcador>)` com `sensitive_removed`; o mesmo com crase com espaço,
  `${x:-a b}`, `$'…\'…'`, `<(…)`, extglob, `$[…]` e array `NOME=(…)` (valor
  vazio: nada era removido). Correção: decisão pura `leavesWordOpen` sobre o
  trecho removido (só lê o texto; nada é expandido nem executado); trecho aberto
  que não vai até o fim do texto faz `sanitizeText` devolver `{ok:false}` e o
  chamador existente omite o campo com `unsanitizable` (nenhum tipo novo).
- **NBSP e CR isolado** (produto): `\s` encerrava a palavra em NBSP e outros
  espaços Unicode, o Bash não. A palavra termina só em espaço, tab, `\n`/`\r\n`
  e operadores.
- **Regras 2–4 completadas até o fim da palavra** (os três riscos vizinhos): a
  query parava na aspa e o marcador interno fazia a regra 5 pular o resto
  (`?password=abc'<sufixo>'`); `Bearer abcdefgh12,<sufixo>`; cabeçalho com aspas
  internas (`Digest username="…"`) e `Authorization:\ Bearer\ abc'…'`.
  Correção: `completeWord` completa a palavra com o mesmo `SENSITIVE_VALUE`
  (aspa de abertura ou de fecho pela contagem na linha, `\` final, caractere
  colado); cabeçalho com aspa antes do nome vai até o fecho dela, sem aspa até o
  fim da linha. Uma gramática só para a palavra: `QUOTED` é compartilhado por
  `SENSITIVE_VALUE` e `QUOTED_AT`.
- **Userinfo** (risco vizinho): a autoridade excluía aspas e `\`, e com elas
  antes do `@` nada saía. Agora fazem parte dela: fechada, tudo até o último `@`
  sai; aberta no fim (aspa ímpar na linha, `\` final, composição) → omitido.
- **Marcador interno**: só evita reprocessar uma palavra já completada; nunca
  sai de `sanitizeText` (trocado antes das regras 6–7; a recusa não devolve
  texto). NUL da entrada continua recusado antes de qualquer regra.
- **Custo quadrático** (achado por medida durante o lote): a primeira versão
  desta correção recontava a linha a cada valor e usava `/\\*$/`; `644544f` já
  levava 93 s em `?password=x#a` × 1 MiB, porque a regra 5 relia a palavra a
  partir do marcador a cada nome. A correção está nas mesmas linhas
  reestruturadas: contagem incremental por passada, `\` final contado de trás
  para frente e a regra 5 pulando o marcador antes de varrer a palavra.
- **Defeito do teste I5-C14g** (`7b3ebf4`): a busca do NUL também varria o
  arquivo `key` (32 bytes aleatórios, ~12% de chance de ter 0x00). Falhou uma vez
  no gate WSL de `53f3f00` (`após ingest: …/key`); 40 execuções locais do teste
  daquele commit: 5 falhas, todas em `key`; 40 do corrigido: 40 aprovações. O
  NUL passa a ser procurado só nos arquivos de texto; o marcador continua
  procurado em todos, `key` inclusive. Nenhuma asserção sobre saída foi relaxada.

## O que cada prova nova afirma

- **I5-C14f** (policy.unit): 17 entradas recusadas exatamente `{ok:false}` — o
  cenário do coordenador em atribuição e flag, `$(cat …)`, crase com espaço,
  `${…}` com espaço, aninhadas entre aspas, JSON com `$(…)`, `$'…\'…'`, array,
  `<(…)`, extglob, `$[…]`, query e cabeçalho entre aspas com `$(…)`, heredoc;
  33 saídas exatas com `removed:true` — NBSP, U+3000/U+2007, CR isolado e `\r\n`
  preservado, composição fechada (`${…}`, `"$(…)"`, crases pares), aspa sem fecho
  até o fim do texto, regra 2 (aspa de abertura, fecho com concatenação, nome
  codificado, valor vazio, `[removido]` literal seguido de texto, NBSP, `\`,
  token codificado, JSON), regra 3 (Digest em comando e em resultado, escapes,
  espaço escapado, concatenação, `$(gh auth token)` fechado, aspa ímpar, aspa sem
  fecho), regra 4 (vírgula, NBSP, aspa de abertura, aspa de fecho, prosa, JSON
  com e sem nome sensível); 6 controles idênticos com `removed:false`. Fronteira
  da política: comando composto ausente do registro com
  `tool_input.command:unsanitizable`, Digest do stdout removido inteiro, sem
  canário e sem `\u0000`.
- **I5-C17e** (policy.unit): 5 autoridades abertas recusadas (aspa com espaço,
  inclusive com `@` antes, `\ `, `$(…)`, crase); 8 saídas exatas (cenário do
  coordenador `u:abc'…'@`, vários `@` com aspas, `\@`, URL entre aspas, `$VAR`,
  NBSP, JSON compacto com perda declarada); 2 controles; fronteira da política
  para removido e para omitido.
- **I5-C14h** (policy.unit): seis entradas de 1 MiB numa linha terminam abaixo de
  5 s cada, com o `ok` esperado (teto largo; não é meta de desempenho).
- **I5-C14g** (outputs.cli, CLI real com `fs-probe` e sonda de privacidade):
  ingest codex-exec, Claude pre/post e Codex hooks com comando composto e saída
  com NBSP, Digest, query com aspa e `Bearer` com vírgula; os quatro comandos
  ausentes do export com `…command:unsanitizable` e
  `status.counters.contentOmitted.unsanitizable = 4`; saídas exatamente
  `COMPOSED_OUTPUT_OUT`; nenhum arquivo, stdout, log de sonda, temporário antes do
  rename ou arquivo escrito com o marcador (nem NUL nos de texto); `stderr` vazio;
  delete aplicado.
- Nenhuma asserção, limite ou critério existente mudou; as 85 provas anteriores
  do alvo de privacidade passam sem edição.

## RED → GREEN (Windows, Node 24.21.0)

Logs em `%TEMP%\skill-me-i5-composed-win-zsA1PE\`; scratch do autor fora do
repositório em `%TEMP%\skill-me-i5-composed-scratch-Ofh9C6\` (só booleanos e
tempos). Nenhum log contém `SKILLMECANARY`.

| Log | Produto | Resultado |
| --- | --- | --- |
| `red.tap.log` | `src/` intacto (cabeça `2dd410d`) | C14f, C17e, C14g 3/3 `not ok`: `recusado 0` (cenário do coordenador), `recusado 0` (userinfo aberto), primeiro arquivo de dados após o ingest |
| `red-2.tap.log` | `sanitize.mjs` de `644544f` restaurado temporariamente (`cmp` igual ao corrigido depois) | C14f, C17e, C14g, C14h 4/4 `not ok`; C14h `caso 0: 91700 ms` |
| `green.tap.log` | corrigido | alvo de privacidade 89/89 |
| `compare2.log`/`compare3.log` (scratch) | `644544f` × corrigido nos casos das provas e 15 sondas | antigo deixa o marcador em 16/17 recusados, 22/29 removidos, 5/5 e 4/8 do C17e; corrigido em 0, recusa exatamente os casos previstos, nunca devolve NUL. `cases.mjs`/`compare.log` ficaram preservados mas são inválidos: o heredoc do shell perdeu os `\\`; `cases2.mjs`, escrito sem shell, é o válido |
| `timing-naive.log`, `timing-linear-new.log`, `timing-old.log` (scratch) | 1 MiB numa linha | `644544f`: `?password=x#a` 93 s; primeira versão: `?token=a' ` 125 s, `Bearer …' ` 25 s, `\` longo sem término no tempo; final: ≤ 80 ms em todos |
| `flake-old.log`/`flake-fixed.log` | I5-C14g × 40 | teste de `53f3f00`: 5 falhas em `key`; corrigido: 0 |

## Execuções

| Plataforma | Cabeça | Comando | Resultado |
| --- | --- | --- | --- |
| Windows 11 — Node 24.21.0, árvore limpa e HEAD conferidos antes e depois | `53f3f00` | alvo de privacidade / `npm test` | 89/89; exit 0 — governança 6/6, code-review 16/16, doctor 417 (410, 7 skip), integrações 177 (171, 6 skip) |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i5-composed-TLHGzB`, tar sha256 `def5b3c7…c4fa1badb` e `get-tar-commit-id` conferidos no script; stage `skill-me-i5-composed-wsl-stage-MTBt1B` | `53f3f00` | idem | 89/89; `npm test` exit 1 — integrações 177 (164, **1 fail: I5-C14g em `key`**, 12 skip); demais iguais à linha abaixo. Levou ao `7b3ebf4` |
| Windows 11, idem | `7b3ebf4` | idem | 89/89; exit 0 — 6/6, 16/16, doctor 417 (410, 7 skip), integrações 177 (171, 6 skip) |
| WSL Ubuntu — uid 1000, `/tmp/skill-me-i5-composed-clniSu`, sha256 `aac06a47…69cf15cc`, commit conferido; stage `skill-me-i5-composed-wsl-stage-wMXlRh` | `7b3ebf4` | idem | 89/89; exit 0 — 6/6, 16/16, doctor 417 (416, 1 skip), integrações 177 (165, 12 skip) |

Skips idênticos aos do lote anterior, conferidos pelos nomes: Windows doctor 7
(POSIX symlink/FIFO), integrações 6 (I4-C15, I4-C25b/j/k/l/m); WSL doctor 1
(`hermes_cli.PYD`), integrações 12 (I4-C18–23/C37/C44b, I4-C25g/h/i/m).
Integrações passam de 173 para 177 só pelos quatro testes novos.

Preparação WSL: `run-wsl.sh` copiado do stage formal2 trocando só o comentário e
os dois prefixos (`diff` conferido; o segundo stage recebeu cópia `cmp`-igual),
chamado com `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash -l <script> <tar> <sha> <node_modules> <commit> <saída>`;
o script recusa root, outra distro, origem ausente e saída/destino fora do
padrão antes de copiar ou extrair. Nenhum comando inline no WSL, nada em `/repo`
ou `/src.tar`; preparação antiga do Verifier6, seu probe, sessões ou
configurações pessoais não tocados; nenhum modelo, rede de produto, instalação,
subagente, push ou `review:run`. Nenhum arquivo do repositório editado durante
os gates; o WSL só começou depois do fim do gate Windows de cada cabeça. Os
dois retornos temporários de arquivo do repositório (RED com o sanitizador de
`644544f` e o teste de `53f3f00` para o experimento de 40 execuções) ocorreram
fora de gates e foram conferidos com `cmp`. Nenhuma rejeição de política nem
falha de capacidade.

## Riscos e perdas comunicados

- Perdas declaradas no Landing e no guia: campo inteiro omitido em composição
  aberta — inclusive comandos comuns sem o segredo no texto, como
  `export TOKEN=$(gh auth token)` e `--password $(cat arquivo)`, e `'…$(…)…'`
  literal entre aspas simples; JSON compacto perde o que segue a aspa de fecho;
  URL sem caminho seguida de aspas e `@` perde o texto até esse `@`; prosa com
  vírgula colada ao token perde a vírgula; cabeçalho sem aspa antes do nome perde
  o resto da linha; apóstrofo colado ao host omite o campo.
- A contagem de aspas na linha não é parser: um apóstrofo anterior pode ler uma
  aspa de abertura como fecho e deixar o texto depois do próximo espaço; URL
  dentro de aspas abertas antes dela, com espaço e outro `@` adiante, não é
  reconhecida como aberta.
- Fora do escopo, não corrigido, igual antes e depois: bloco YAML
  (`secret: |` com o valor nas linhas seguintes) passa, porque o `|` depois de
  espaço é ausência de valor na gramática da palavra; `--password<NBSP>valor`
  não é uma flag para o Bash nem para a regra 5 e passa sem detecção.
- `keyCarriesSecret` (chaves de `structured`) lê só `removed`; uma chave nunca
  chega a `{ok:false}`, porque o padrão `^[A-Za-z0-9_.-]{1,64}$` exclui todo
  caractere que cria ambiguidade. Não alterado.
- Esta evidência muda o conteúdo lido por C34/C35; o alvo de privacidade e o
  `npm test` são reexecutados na cabeça desta evidência nas duas plataformas e o
  resultado vai ao coordenador.
- Perfil `light`: nenhuma falha injetada fora dos cenários enumerados. Este verde
  é autoral; não é aprovação independente nem formal.

# Valor sensível em bloco multilinha (18/10/2026)

Evidência autoral, não verificação independente nem revisão formal: não conta
como rodada do Verifier nem tentativa da revisão e não altera tetos. Nenhum
relatório anterior, `.verified.md`, incidente ou aprovação foi editado. As duas
tentativas formais e as quatro rodadas independentes estão consumidas; nova
verificação depende de extensão humana pedida pelo coordenador. Escopo: risco
relatado pelo autor no lote anterior (`secret: |` com o valor nas linhas
seguintes passava), que o coordenador autorizou corrigir por omissão no mesmo
S2/crit. 6. Commits: `f331fb6` (Landing "Valor sensível em bloco multilinha…",
antes do código), `94493c8` (correção, provas, guia e comandos de prova) e o
commit desta evidência.

## Natureza do problema e correção

- **Produto**: depois de nome sensível e espaço, `|`/`>` não pertencem à palavra
  de shell; o valor vazio era tratado como ausência de valor e as linhas
  seguintes persistiam (`secret: |\n  <valor>`). Com cabeçalho
  (`Authorization: |`) só o `|` saía. Correção: decisão pura `blockOpener`
  (indicador `|`/`>` com até dois de dígito/`+`/`-`, espaços e comentário `#`
  opcionais, terminando a linha, com texto depois da quebra), consultada pelas
  regras 3 e 5 no início do valor; positiva, `removeValues` devolve `null` pelo
  mesmo caminho da composição aberta e `sanitizeText` devolve `{ok:false}`; o
  chamador existente omite o campo com `unsanitizable` (nenhum tipo novo). Só lê
  o texto já coletado: nenhum YAML interpretado, nenhuma linha seguinte extraída,
  nenhum arquivo ou caminho aberto. Nomes, separadores e a gramática da palavra
  não mudaram (mesmos `HEADER_NAME`, `ASSIGNMENT_NAME`, `FLAG_NAME`,
  `isSensitiveKey`).
- **Custo**: a última quebra com texto depois é calculada uma vez por passada;
  procurar o fim da linha a cada nome seria quadrático numa linha longa de
  `secret: | # …`. Dois casos novos no I5-C14h cobrem isso.

## O que cada prova nova afirma

- **I5-C14i** (policy.unit): 15 entradas recusadas exatamente `{ok:false}` —
  `secret: |`, `password: >`, aninhado/indentado, alias (`api-key`,
  `client_secret` entre aspas, `DB_PASSWORD`), `|-`, `>2-`, `|2`, `|+` com
  comentário, `>-` com tab e comentário, `\r\n`, CR, sem espaço no separador,
  tab depois do indicador, cabeçalho (`Authorization`, `cookie`) e flag
  (`--password |`); 7 controles idênticos com `removed:false` (indicador sem
  linha seguinte, só com a quebra final, nome comum com bloco, `--token | cat`,
  `password: > /dev/null`, `secret: |x`, pipe/redirecionamento sem nome); 2
  saídas exatas com `removed:true` (valor na mesma linha seguido de `|` na linha
  de baixo, `'a|…'`). Fronteira da política: `post_tool_bash` com o bloco no
  stdout → `tool_response.stdout` ausente, `tool_response.stdout:unsanitizable`,
  comando preservado, sem canário nem `\u0000`.
- **I5-C14j** (outputs.cli, CLI real com `fs-probe` e sonda de privacidade):
  ingest codex-exec e Claude post com `cat config.yml` e saída contendo
  `password: |` e `token: >- # …` aninhados; os dois eventos persistidos, export
  só com os dois comandos e o stderr, as duas saídas omitidas com
  `…:unsanitizable` e `status.counters.contentOmitted.unsanitizable = 2`; nenhum
  arquivo, stdout, log de sonda, temporário antes do rename ou arquivo escrito
  com o marcador (nem NUL nos de texto); `stderr` vazio; lock de cada comando;
  delete aplicado.
- **I5-C14h**: dois casos novos de 1 MiB numa linha (`secret: |x # ` repetido →
  `ok:true`; `password: > ` repetido com `\nfim` → `ok:false`, só o último
  indicador termina a linha). A primeira versão do teste esperava `true` no
  segundo; o erro era do teste (o último `password: > ` é seguido de quebra e
  texto, recusa prevista no Landing) e foi corrigido antes do commit `94493c8`.
- Nenhuma asserção, limite ou critério existente mudou; as 89 provas anteriores
  do alvo de privacidade passam sem edição (91 com as duas novas).

## RED → GREEN (Windows, Node 24.21.0)

Logs em `%TEMP%\skill-me-i5-block-win-7Fzfys\`; scratch fora do repositório em
`%TEMP%\skill-me-i5-block-scratch-NVT0YB\` (só booleanos). Nenhum log contém
`SKILLMECANARY`.

| Log | Produto | Resultado |
| --- | --- | --- |
| `red.tap.log` | `src/` intacto (cabeça `f331fb6`) | C14i, C14j 2/2 falham: `recusado 0`; marcador no `events-000002.ndjson` após o ingest |
| `green-new.tap.log` | corrigido, antes da correção do caso do C14h | C14i, C14j passam; C14h `caso 7` (erro do teste, acima) |
| `compare.log` (scratch) | `sanitize.mjs` de `f331fb6` × corrigido | 18 casos de bloco: antigo `ok:true` com o marcador em 16 (os outros 2 removidos só em parte), corrigido recusa 18/18; 9 controles idênticos ao antigo; 3 limites declarados (`!!str \|`, `secret:` + linha seguinte, `--password<NBSP>`) passam igual nos dois |

## Execuções no commit `94493c8`

| Plataforma | Comando | Resultado |
| --- | --- | --- |
| Windows 11 — Node 24.21.0, HEAD e árvore limpa conferidos antes e depois (`gate-94493c8/gate.meta`) | `node --test tests/integrations/privacy/*.test.mjs` / `npm test` | 91/91, 0 skip (C34/C35 incluídos); exit 0 — governança 6/6, code-review 16/16, doctor 417 (410, 7 skip), integrações 179 (173, 6 skip) |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i5-block-W9KURB`, tar sha256 `8db4123e…efba5951f` e `get-tar-commit-id` = `94493c85…` conferidos no script; stage `skill-me-i5-block-wsl-stage-zNjuZi` | idem | 91/91, 0 skip; exit 0 — 6/6, 16/16, doctor 417 (416, 1 skip), integrações 179 (167, 12 skip) |

Skips iguais aos do lote anterior, conferidos pelos nomes: Windows doctor 7
(POSIX symlink/FIFO), integrações 6 (I4-C15, I4-C25b/j/k/l/m); WSL doctor 1
(`hermes_cli.PYD`), integrações 12 (I4-C18–23/C37/C44b, I4-C25g/h/i/m).
Integrações passam de 177 para 179 só pelos dois testes novos.

Preparação WSL: `run-wsl.sh` copiado do stage anterior trocando só o comentário
e os prefixos (`diff` conferido), chamado com
`MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash -l <script> <tar> <sha> <node_modules> <commit> <saída>`;
o script recusa root, outra distro, origem ausente e saída/destino fora do
padrão antes de copiar ou extrair. Nenhum comando inline no WSL, nada em `/repo`
ou `/src.tar`; preparação antiga do Verifier6, seu probe, sessões ou
configurações pessoais não tocados; nenhum modelo, rede de produto, instalação,
subagente, push ou `review:run`. Nenhum arquivo do repositório editado durante
os gates; o WSL começou depois do fim do gate Windows. Nenhuma rejeição de
política nem falha de capacidade.

**Diferença de SHA**: os gates acima rodaram em `94493c8`. O commit desta
evidência só acrescenta esta seção (`.checks/`); código, testes, guia e checklist
são idênticos aos do gate. Nele rodaram só I5-C34 e I5-C35, numa invocação com
seletor (Windows); `npm test` e o alvo completo não foram repetidos nele. A
futura verificação independente, se autorizada, roda todas as provas na cabeça
final.

## Riscos e perdas comunicados

- Perdas declaradas no Landing e no guia: o campo inteiro sai também quando a
  linha seguinte não pertence ao bloco (`password: |\nuser: u`), quando é pipe
  de shell continuado na linha seguinte e no cabeçalho entre aspas
  (`'Authorization: |\n…'`, que antes removia até o fecho).
- Limites declarados, não corrigidos e confirmados iguais antes e depois: tag ou
  âncora antes do indicador (`secret: !!str |`), valor YAML simples continuado
  na linha seguinte sem indicador (`secret:` e o valor abaixo — mesmo contrato,
  vizinho ao corrigido; não ampliado por estar fora do escopo autorizado),
  `--password<NBSP>valor` (não é separação de argumento para o Bash nem para a
  regra 5) e nomes que as regras atuais não reconhecem.
- Perfil `light`: nenhuma falha injetada fora dos cenários enumerados. Este verde
  é autoral; não é aprovação independente nem formal.

# Valor sensível na linha seguinte ou depois de tag/âncora (18/10/2026)

Evidência autoral, não verificação independente nem revisão formal: não conta
como rodada do Verifier nem tentativa da revisão e não altera tetos. Nenhum
relatório anterior, `.verified.md`, incidente ou aprovação foi editado. As duas
tentativas formais e as quatro rodadas independentes continuam consumidas; nova
verificação depende de extensão humana pedida pelo coordenador. Escopo: decisão
do coordenador de que `secret:` com o valor na linha seguinte e `secret: !!str |`
(ou âncora antes do indicador) são o mesmo risco S2/crit. 6 da seção anterior;
a indicação anterior do autor de que eram limites fora do escopo fica histórica e
superada. Commits: `13a0752` (Landing "Valor sensível na linha seguinte ou
depois de tag/âncora", antes do código), `e8444f2` (correção no Landing, antes
do código: a primeira redação dizia que `secret: &a valor` tinha a palavra
removida; o controle escrito para isso mostrou que o valor persiste — vira
limite declarado e comunicado), `7168e4d` (correção, provas, guia e comandos de
prova) e o commit desta evidência.

## Natureza do problema e correção

- **Produto**: o guard `blockOpener` da seção anterior só reconhecia o indicador
  `|`/`>` logo no início do valor. Com o valor ausente na linha
  (`secret:\n  <valor>`, também `PASSWORD=`, cabeçalho e flag), o valor vazio era
  ausência de valor e a linha seguinte persistia; com tag/âncora
  (`secret: !!str |\n  <valor>`) só a palavra `!!str` saía (com `&a` nada saía,
  `&` encerra a palavra) e o bloco persistia. Correção cirúrgica no mesmo guard:
  a expressão (`NEXT_LINE_VALUE`, antes `BLOCK_INDICATOR`) aceita até duas
  propriedades `!…`/`&…` antes do indicador e também o fim da linha sem
  indicador; como o valor ausente começa na própria quebra, a comparação com a
  última quebra com texto depois passou de `<` para `<=`. Mesmo caminho
  `NO_SAFE_PROJECTION` → `{ok:false}` → `unsanitizable`; mesmos `HEADER_NAME`,
  `ASSIGNMENT_NAME`, `FLAG_NAME` e `isSensitiveKey`. Nenhum YAML interpretado,
  nenhuma tag ou âncora resolvida, nenhuma linha seguinte extraída, nenhum
  caminho aberto.
- **Custo**: a última quebra continua calculada uma vez por passada; o limite de
  duas propriedades impede que nomes dentro de `!…` releiam a linha. Dois casos
  novos no I5-C14h.

## O que cada prova nova afirma

- **I5-C14i** (policy.unit, título ampliado; as asserções anteriores ficam):
  17 entradas novas recusadas exatamente `{ok:false}` — valor ausente com e sem
  espaços/tab antes da quebra, `\r\n`, CR, nome entre aspas, `DB_PASSWORD=`,
  `Authorization:`, `set-cookie:`, `--password ` no fim da linha; `!!str |`,
  `&a >-`, `!!str &a | # c`, `&k !<tag:x> |2` com `\r\n`, `!secret` e `!!str  `
  no fim da linha, cabeçalho e flag com tag; 4 controles idênticos com
  `removed:false` (`secret:`, `secret:\n`, `password:   \r\n` sem linha depois,
  nome comum com valor abaixo e tag+bloco); 4 saídas exatas com `removed:true`
  (`!!str` e `!!str &a |\n` no fim do texto só com a palavra removida, como antes;
  `password: !… | cat`; valor na mesma linha seguido de `user:` com valor
  abaixo). Fronteira da política para as duas famílias: `post_tool_bash` →
  `tool_response.stdout` ausente, `tool_response.stdout:unsanitizable`, comando
  preservado, sem canário nem `\u0000`.
- **I5-C14j** (outputs.cli, CLI real com `fs-probe` e sonda de privacidade): o
  corpo existente passou a rodar uma captura por família (`bloco`,
  `linha-seguinte`, `tag-ancora`) com as mesmas asserções, cada mensagem com o
  nome da família; em cada uma: os dois eventos persistidos, export só com os
  dois comandos e o stderr, as duas saídas omitidas com `…:unsanitizable`,
  `status.counters.contentOmitted.unsanitizable = 2` exato, nenhum arquivo,
  stdout, log de sonda, temporário antes do rename ou arquivo escrito com o
  marcador (nem NUL nos de texto), `stderr` vazio, lock de cada comando, delete
  aplicado.
- **I5-C14h**: `password: !password: !x ` repetido em 1 MiB → `ok:true`;
  `secret: !a &b ` repetido com `\nfim` → `ok:false`. Gate Windows: 647 ms para
  o teste inteiro (dez entradas).
- Nenhuma asserção, limite ou critério existente removido ou enfraquecido; a
  contagem do alvo de privacidade continua 91 (provas novas dentro de C14h/i/j).
- **Erro de teste corrigido antes do commit `7168e4d`**: a primeira versão
  esperava `x\nsecret: !!str` e `x\nsecret: !!str &a |\n` intactos; sem linha
  depois, a regra anterior (inalterada) remove a palavra `!!str`. Passaram para
  as saídas exatas com `removed:true`. O código não mudou por isso.

## RED → GREEN (Windows, Node 24.21.0)

Logs em `%TEMP%\skill-me-i5-nextline-win-UAEsdl\`; scratch fora do repositório
em `%TEMP%\skill-me-i5-nextline-scratch-2eI6za\`; ferramentas em
`%TEMP%\skill-me-i5-nextline-tools\` (`compare.mjs`, `gate-win.sh`). Nenhum log
contém `SKILLMECANARY`.

| Log | Produto | Resultado |
| --- | --- | --- |
| `red.tap.log` | `src/` intacto (cabeça `e8444f2`, testes novos) | C14h `caso 9`, C14i `recusado 0` (primeiro caso novo), C14j família `linha-seguinte`: marcador em `events-000002.ndjson` após o ingest |
| `red-c14j-linha-seguinte.tap.log`, `red-c14j-tag-ancora.tap.log` (scratch) | cópia do tar de `7168e4d` com o `sanitize.mjs` antigo e o laço do C14j reduzido a uma família | as duas falham: marcador em `events-000002.ndjson` após o ingest |
| `compare.log` (scratch) | `sanitize.mjs` antigo × corrigido | 17 casos das duas famílias: antigo `ok:true` em 17 (marcador no texto em 14; nos outros 3 outra regra já removia), corrigido recusa 17/17; 8 controles idênticos; 4 limites declarados idênticos nos dois |
| `green-full*.tap.log` | versões intermediárias | `green-full.tap.log`: C14i `recusado 0` (comparação `<` com a quebra, corrigida para `<=`); `green-full-2`: C14i `controle 3` (erro do teste, acima); `green-full-3/4`: 91/91 |

## Execuções no commit `7168e4d`

| Plataforma | Comando | Resultado |
| --- | --- | --- |
| Windows 11 — Node 24.21.0, HEAD e árvore limpa conferidos antes e depois (`gate-7168e4d/gate.meta`) | `node --test tests/integrations/privacy/*.test.mjs` / `npm test` | 91/91, 0 skip (C34/C35 incluídos); exit 0 — governança 6/6, code-review 16/16, doctor 417 (410, 7 skip), integrações 179 (173, 6 skip) |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i5-nextline-pOMTNq`, tar sha256 `1c62732b…ae7351314` e `get-tar-commit-id` = `7168e4d4…` conferidos no script; stage `skill-me-i5-nextline-wsl-stage-PrV2G2` | idem | 91/91, 0 skip; exit 0 — 6/6, 16/16, doctor 417 (416, 1 skip), integrações 179 (167, 12 skip) |

Skips iguais aos do lote anterior, conferidos pelos nomes: Windows doctor 7
(POSIX symlink/FIFO), integrações 6 (I4-C15, I4-C25b/j/k/l/m); WSL doctor 1
(`hermes_cli.PYD`), integrações 12 (I4-C18–23/C37/C44b, I4-C25g/h/i/m).

Preparação WSL: `run-wsl.sh` copiado do stage anterior trocando só o comentário
e os prefixos (`diff` conferido: linhas 2, 22, 27 e 29), chamado com
`MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash -l <script> <tar> <sha> <node_modules> <commit> <saída>`;
o script recusa root, outra distro, origem ausente e saída/destino fora do
padrão antes de copiar ou extrair. Nenhum comando inline no WSL, nada em `/repo`
ou `/src.tar`; preparação antiga do Verifier6, seu probe, sessões ou
configurações pessoais não tocados; nenhum modelo, rede de produto, instalação,
subagente, push ou `review:run`. Nenhum arquivo do repositório editado durante
os gates; o WSL começou depois do fim do gate Windows. Nenhuma rejeição de
política nem falha de capacidade.

**Diferença de SHA**: os gates acima rodaram em `7168e4d`. O commit desta
evidência só acrescenta esta seção (`.checks/`); código, testes, guia e checklist
são idênticos aos do gate. Nele rodaram só I5-C34 e I5-C35, numa invocação com
seletor sobre `docs-privacy.test.mjs` (Windows); `npm test` e o alvo completo não
foram repetidos nele.

## Riscos e perdas comunicados

- Perdas declaradas no Landing e no guia (falha fechada): o campo inteiro sai
  também quando a linha seguinte não é o valor (`password:\nuser: u`), em
  atribuição de shell vazia (`PASSWORD=\nls`), flag sensível com espaço no fim da
  linha e `&`/`!` de shell logo depois do nome no fim da linha; três casos que
  outra regra já removia sem vazar passaram a omitir o campo.
- **Risco observado, fora deste reparo, comunicado ao coordenador**: tag ou
  âncora seguida do valor na mesma linha — `secret: !!str <valor>` remove só a
  tag; `secret: &a <valor>` não remove nada (o `&` encerra a palavra). O valor
  persiste nos dois, igual antes e depois (`compare.log`, limites 0 e 1).
  Declarado no Landing e no guia; não corrigido por não estar entre as duas
  variantes autorizadas.
- Outros limites declarados, iguais antes e depois: comentário sem indicador
  (`secret: # c` com o valor abaixo), mais de duas propriedades, nomes que as
  regras atuais não reconhecem, `--password<NBSP>valor` (limite da gramática de
  flag do Bash).
- Perfil `light`: nenhuma falha injetada fora dos cenários enumerados. Este verde
  é autoral; não é aprovação independente nem formal.

# Tag/âncora seguida de valor na mesma linha e comentário antes da quebra (18/10/2026)

Evidência autoral, não verificação independente nem revisão formal: não conta
como rodada do Verifier nem tentativa da revisão e não altera tetos. Nenhum
relatório anterior, `.verified.md`, incidente, aprovação, task ou configuração
foi editado. Autorização vigente: "autorizo quantos precisaram para resolver"
(registro `157add2`); o Verifier depois deste lote fica a cargo do coordenador;
nenhum `review:run`, subagente, push, PR ou merge neste lote. Escopo: decisão do
coordenador de que os limites declarados pelo autor na seção anterior (tag ou
âncora seguida do valor na mesma linha, comentário sem indicador, mais de duas
propriedades) não estão aceitos por estarem documentados — mesmo AC2/crit. 6/S2.
Commits: `54325a2` (Landing "Tag/âncora seguida de texto na mesma linha e
comentário antes da quebra", antes do código), `d4fe7d3` (correção, provas,
guia e comandos de prova do checklist) e o commit desta evidência.

## Natureza do problema e correção

- **Produto**: o guard `blockOpener` só recusava tag/âncora seguidas do
  indicador ou do fim da linha. Com o valor na mesma linha
  (`secret: !!str <valor>`) só a palavra `!!str` saía; com `&a <valor>` nada saía
  (o `&` encerra a palavra); com `secret: # c` e o valor abaixo, só a palavra `#`
  saía. Correção no mesmo guard, mesmo caminho `NO_SAFE_PROJECTION` →
  `{ok:false}` → `unsanitizable`, mesmos `HEADER_NAME`, `ASSIGNMENT_NAME`,
  `FLAG_NAME` e `isSensitiveKey`: (3) valor que começa em `!…` ou em `&` seguido
  de caractere sem espaço, seguido de espaços/tabs e de qualquer caractere na
  mesma linha, recusa, com ou sem linha depois (fecha também mais de duas
  propriedades); (4) `NEXT_LINE_VALUE` aceita, como fim da linha, comentário `#…`
  precedido de espaço/tab. Nada é interpretado como YAML, nenhuma tag, âncora,
  alias ou comentário é resolvido, nada é extraído, nenhum caminho aberto ou
  executado.
- **Custo**: a sequência da propriedade é varrida uma vez por passada; nome
  dentro dela (`&secret:&secret:…`) reusa o resultado (consultas crescentes, como
  `quoteCounter`). O comentário só é lido com `at <= lastBreak`, quando há quebra
  depois, e então recusa. Medida em scratch (`cost.log`): `&secret:` repetido —
  com o reuso 5/7/13 ms em 32/64/128 KiB; sem ele 28/105/396 ms (quadrático,
  ≈25 s estimados em 1 MiB, acima do teto de 5 s do C14h). Nenhum SLA novo.
- **Mudança de controles anteriores (registrada no Landing antes do código)**:
  `password: !… | cat\nfim` e `x\nsecret: !!str &a |\n` deixavam só a palavra da
  tag removida e agora são recusas exatas no C14i; o caso de custo
  `password: !password: !x ` em 1 MiB passou de `ok:true` a `ok:false` no C14h.
  Nenhuma asserção foi apagada: as entradas mudaram de expectativa conforme a
  decisão e são provadas como `{ok:false}` exato.

## O que cada prova nova afirma

- **I5-C14i** (policy.unit, título ampliado): 14 entradas da família (3) e 7 da
  (4) recusadas exatamente `{ok:false}` — tag e âncora com e sem linha depois,
  as duas propriedades nas duas ordens, tab, nome entre aspas, alias de nome,
  `\r\n`, mais de duas propriedades antes da quebra, `!` sozinho, depois de `=`,
  cabeçalho e flag; comentário com `\n`, `\r\n`, CR, nome entre aspas,
  cabeçalho, flag e depois de tag. Os 2 controles mudados recusados
  exatamente. Controles exatos: `x\nsecret: !!str   ` → só a palavra sai;
  `PASSWORD=#x\nls` → `PASSWORD=[removido]\nls`; `secret: # c` →
  `secret: [removido] c` (regra anterior, sem linha depois); `secret: *a\nfim`
  → `secret: [removido]\nfim`; `--token & ls`, `secret: &a` e nome comum com tag
  e comentário intactos com `removed:false`; valor ausente no fim do texto
  intacto como antes. Fronteira da política: 3 saídas novas (tag, âncora,
  comentário) → `tool_response.stdout` ausente,
  `tool_response.stdout:unsanitizable`, comando preservado, sem canário nem
  `\u0000`.
- **I5-C14j** (outputs.cli, CLI real com `fs-probe` e sonda de privacidade):
  cada família virou um subteste (`t.test`), para que uma família que falha não
  esconda as outras; as asserções de cada uma são as mesmas da seção anterior.
  Famílias novas `tag-mesma-linha`, `ancora-mesma-linha`, `comentario`: os dois
  eventos persistidos, export só com os dois comandos e o stderr, as duas saídas
  omitidas com `…:unsanitizable`, `contentOmitted.unsanitizable = 2` exato,
  nenhum arquivo/stdout/log de sonda/temporário antes do rename/arquivo escrito
  com o marcador, `stderr` vazio, lock de cada comando, delete aplicado.
- **I5-C14h**: `password: !password: !x ` → `ok:false`; `&secret:` em 1 MiB →
  `ok:true`; com `\nfim` → `ok:false`; `secret: # ` com `\nfim` → `ok:false`.
  Gate Windows: 474 ms para o teste inteiro (treze entradas).
- Contagem do alvo de privacidade: 91 → 97 (os seis subtestes do C14j contam
  como testes; nenhum teste de topo novo); `test:integrations` 179 → 185.

## RED → GREEN (Windows, Node 24.21.0)

Logs em `%TEMP%\skill-me-i5-tagcomment-win-dPVO5j\`; scratch em
`%TEMP%\skill-me-i5-tagcomment-scratch-ufvlUY\` (`sanitize-old.mjs` de `54325a2`,
`sanitize-new.mjs`, `sanitize-nomemo.mjs`, `compare.log`, `cost.log`);
ferramentas em `%TEMP%\skill-me-i5-tagcomment-tools\` (`compare.mjs`,
`cost.mjs`, `gate-win.sh`). Nenhum log contém `SKILLMECANARY`.

| Log | Produto | Resultado |
| --- | --- | --- |
| `red-policy.tap.log` | `src/` intacto (`git diff --exit-code HEAD -- src`, cabeça `54325a2`, testes novos) | C14i `recusado 0` (primeira entrada nova), C14h `caso 8` (`password: !password: !x ` ainda `ok:true`); exit 1 |
| `red-cli.tap.log` | idem | C14j: `bloco`, `linha-seguinte`, `tag-ancora` passam; `tag-mesma-linha`, `ancora-mesma-linha`, `comentario` falham, cada uma com o marcador em `events-000002.ndjson` após o ingest; 7 testes, 3 pass, 4 fail (a falha do pai conta) |
| `compare.log` (scratch, só booleanos) | `sanitize.mjs` antigo × corrigido | 21 entradas das famílias (3) e (4): antigo `ok:true` em 21 (marcador no texto em 19; nos 2 cabeçalhos a regra 3 já removia a linha), corrigido recusa 21/21; 2 controles mudados: antigo `ok:true` sem vazamento, novo `ok:false`; 16 controles idênticos |
| `green-policy.tap.log`, `green-cli.tap.log` | correção, antes do commit | 2/2 e 7/7 (6 subtestes), exit 0 |

## Execuções no commit `d4fe7d3`

| Plataforma | Comando | Resultado |
| --- | --- | --- |
| Windows 11 — Node 24.21.0, HEAD e árvore limpa conferidos antes e depois (`gate-d4fe7d3/gate.meta`) | `node --test tests/integrations/privacy/*.test.mjs` / `npm test` | 97/97, 0 skip (C34/C35 incluídos); exit 0 — governança 6/6, code-review 16/16, doctor 417 (410, 7 skip), integrações 185 (179, 6 skip) |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i5-tagcomment-l5JVoY`, tar sha256 `e411490f…e80158f` e `get-tar-commit-id` = `d4fe7d3b…` conferidos no script; stage `skill-me-i5-tagcomment-wsl-stage-37fSHb` | idem | 97/97, 0 skip; exit 0 — 6/6, 16/16, doctor 417 (416, 1 skip), integrações 185 (173, 12 skip) |

Skips iguais aos do lote anterior, conferidos pelos nomes: Windows doctor 7
(POSIX symlink/FIFO), integrações 6 (I4-C15, I4-C25b/j/k/l/m); WSL doctor 1
(`hermes_cli.PYD`), integrações 12 (I4-C18–23/C37/C44b, I4-C25g/h/i/m). Os seis
subtestes do C14j aparecem como `ok` nos dois logs de privacidade.

Preparação WSL: `run-wsl.sh` copiado do stage anterior trocando só o comentário
e os prefixos (`diff` conferido: linhas 2, 22, 27 e 29), chamado com
`MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash -l <script> <tar> <sha> <node_modules> <commit> <saída>`;
o script recusa root, outra distro, origem ausente e saída/destino fora do
padrão antes de copiar ou extrair. Nenhum comando inline no WSL, nada em `/repo`
ou `/src.tar`; preparação antiga do Verifier6, seu probe, sessões ou
configurações pessoais não tocados; nenhum modelo, rede de produto, instalação,
subagente, push ou `review:run`. Nenhum arquivo do repositório editado durante
os gates; o WSL começou depois do fim do gate Windows. Nenhuma rejeição de
política nem falha de capacidade.

**Diferença de SHA**: os gates acima rodaram em `d4fe7d3`. O commit desta
evidência só acrescenta esta seção (`.checks/`); código, testes, guia e checklist
são idênticos aos do gate. Nele rodaram só I5-C34 e I5-C35, numa invocação com
seletor sobre `docs-privacy.test.mjs` (Windows); `npm test` e o alvo completo não
foram repetidos nele.

## Riscos e perdas comunicados

- Perdas declaradas no Landing e no guia (falha fechada): o campo inteiro sai
  também em palavra de shell que começa com `!`/`&…` seguida de outra palavra
  (`PASSWORD=!x ls`, `--password !x -v`, `--token &>/dev/null ls`), em cabeçalho
  cuja linha começa com propriedade (`Authorization: !x y`, antes removido até o
  fim da linha) e em comentário de shell depois do nome no fim da linha.
- Os limites "tag/âncora seguida do valor na mesma linha", "comentário sem
  indicador" e "mais de duas propriedades" da seção anterior estão superados.
  Limites restantes, iguais antes e depois: nomes que as regras atuais não
  reconhecem, `--password<NBSP>valor` e formato de segredo desconhecido.
- Perfil `light`: nenhuma falha injetada fora dos cenários enumerados. Este verde
  é autoral; não é aprovação independente nem formal.

# Credencial curta, chave própria `__proto__` e pasta em exclusão coexistente (revisão formal, tentativa 3; 18/10/2026)

Evidência autoral, não verificação independente nem revisão formal: não conta
como rodada do Verifier nem tentativa da revisão e não altera tetos. Nenhum
relatório anterior, `.verified.md`, incidente, aprovação, task, configuração ou
core foi editado. Autorização vigente: "autorizo quantos precisaram para
resolver" (registro `157add2`); Verifier e revisão formal depois deste lote ficam
com o coordenador; nenhum `review:run`, subagente, push, PR ou merge. Escopo: os
três achados de `.checks/code-review/issue-5/formal-round3-report.json`.
Commits: `9b85652` (três linhas do Landing, antes do código), `fecbea5`
(correções, provas, guia e comandos de prova do checklist) e o commit desta
evidência.

## Natureza de cada achado e correção

- **F1 P1 `sanitize.mjs`** — `AUTH_SCHEME` exigia ≥ 8 caracteres e deixava
  `Basic YTpi` (`a:b`) no conteúdo, chegando a temporário, segmento e export.
  Correção: `{8,}` → `+` no mesmo alfabeto token68 e nas mesmas três grafias
  (`Bearer`, `bearer`, `Basic`); completamento da palavra, contagem e caminho de
  recusa inalterados. Sem esquema novo, caixa nova ou decodificação.
- **F2 P2 `content.mjs`** — a projeção `structured` atribuía `out[key] = …` num
  objeto comum: a chave própria `__proto__` vinda de `JSON.parse` acionava o
  setter herdado, o membro sumia sem motivo nem contagem e, com valor objeto ou
  `null`, trocava o protótipo do resultado. Correção: membros coletados e
  montados por `Object.fromEntries` (mesma solução de
  `install/json-hooks.mjs#cloneDoc`); classificação de chave, contagem de membros
  e limites inalterados; nenhum classificador novo.
- **F3 P1 `store.mjs`** — `deletionTarget` preferia `captures/.deleting-<id>` sem
  olhar `captures/<id>`: com captura ativa e uma pasta inesperada
  `.deleting-<id>/key`, `delete --apply` apagava o arquivo alheio e respondia
  `deleted:true` com a captura e a chave intactas. Correção: com
  `.deleting-<id>` diretório, `lstat(captures/<id>)`; o nome existindo com
  qualquer tipo → 4 `foreign_entry` antes de escolher, listar, ler ou mutar.
  Retomada só com a pasta em exclusão, `capture_active` e `link_refused`
  inalterados. Sem journal, marcador de posse ou formato novo.
- **Mudança de controle anterior (registrada no Landing antes do código)**:
  `Bearer curto, Bearer é prosa` era controle intacto no I5-C14f; saiu de lá com
  comentário e é provado no I5-C14k como `Bearer [removido] Bearer é prosa`.
  Nenhuma asserção apagada.

## O que cada prova nova afirma

- **I5-C14k** (policy.unit): 22 entradas removidas exatamente — comprimentos 1
  a 8 nas três grafias, padding (`YQ==`, `Og==`, `=`), alfabeto token68 inteiro,
  tab, texto ao redor, duas credenciais, vírgula colada, quebra, JSON compacto,
  o controle mudado e os falsos positivos `Basic auth`/`Bearer token`; 2
  recusas exatas `{ok:false}` (palavra antes de `(`); 13 controles intactos com
  `removed:false` (esquema sem valor, só espaços, quebra logo depois, `é`, `(`,
  aspa, `basic`, `BASIC`, `BEARER`, `xBasic`, `Token`, `Digest`). Fronteira da
  política: stdout exato, stderr omitido, `privacy` exata
  `["tool_response.stdout:sensitive_removed","tool_response.stderr:unsanitizable"]`.
- **I5-C14l** (outputs.cli, CLI real com `fs-probe` e sonda procurando
  `Basic YTpi`): resultados de codex-exec, claude e codex-hooks; textos exatos
  (só as credenciais saem, comandos intactos), um motivo exato por registro,
  `contentOmitted` de cada lote `{sensitive_removed:1}` e do `status`
  `{sensitive_removed:3}`; nenhum arquivo, stdout, log de sonda, temporário antes
  do rename ou arquivo escrito com a credencial; stderr vazio; delete aplicado.
- **I5-C16c** (policy.unit): seis entradas reais (`JSON.parse` da linha JSONL,
  pré-condição de chave própria conferida) — raiz string/objeto, aninhada, em
  array, com `password` descartado e `DB_PASSWORD=` mascarado dentro, e
  `constructor`/`prototype`/`__proto__:null`: serialização e releitura exatas,
  `privacy` exata, protótipos comuns em todo objeto, valor não vira protótipo,
  `Object.prototype` intacto; 128 membros com `__proto__` cabem, 129 →
  `content:unsanitizable`.
- **I5-C16d** (outputs.cli): a mesma chave na raiz, aninhada e em array pelo
  ingest/export real: stdout do export com o valor serializado, chaves próprias
  depois do `JSON.parse`, valor exato, motivo exato, `contentOmitted` do lote e
  do `status` `{sensitive_removed:1}`, sondas sem marcador.
- **I5-C49b** (store.cli): `.deleting-<id>/key` alheio junto da captura ativa e
  da parada; delete prévia/`--apply` (CLI) e prune prévia/`--apply` (CLI com
  relógio real e `runPrivacyCommand` com relógio 30 dias à frente) → 4 com corpo
  exato (`delete` sem `entries`/`deleted`; `prune` com `selected` = os dois,
  `deleted:[]`, `failed` = os dois `foreign_entry`); árvore idêntica inclusive
  mtime e arquivo alheio byte a byte; `io` registrador: nenhuma operação dentro
  das duas pastas, só `lstat` dos dois nomes, `unlink`/`rename`/`rmdir`/`mkdir`/
  `writeExclusive` só no `.lock`. Controles: sem a pasta inesperada, a ativa volta
  a `capture_active` e a parada é apagada; `.deleting-<id>` como junção ao lado
  da captura continua `link_refused` sem atravessar.
- **I5-C51b** (store.cli, controle): retomadas legítimas só com a pasta em
  exclusão — só `state.json` (falha no unlink dele), vazia (falha no `rmdir`,
  prévia `entries:[]`) e chave+estado pelo `prune --apply` — concluídas com corpo
  exato; ativa normal continua `capture_active`.
- Contagem do alvo de privacidade: 97 → 103 (seis testes de topo novos);
  `test:integrations` 185 → 191.

## RED → GREEN (Windows, Node 24.21.0)

Logs em `%TEMP%\skill-me-i5-formal3-win-dd9qIH\`; scratch em
`%TEMP%\skill-me-i5-formal3-scratch-ePO5us\` (`old/` = `sanitize.mjs`/`content.mjs`
de `9b85652`, `new/` corrigidos, `compare-*.json`, `compare.log`, `f3-old.json`,
`f3-new.json`); ferramentas em `%TEMP%\skill-me-i5-formal3-tools\`
(`compare.mjs`, `f3probe.mjs`, `gate-win.sh`). Nenhum log contém `SKILLMECANARY`
nem `YTpi`.

| Log | Produto | Resultado |
| --- | --- | --- |
| `red-policy.tap.log` | `src/` intacto (`git diff --exit-code HEAD -- src`, cabeça `9b85652`) | C14k `caso 0` (`Basic YTpi`), C16c `raiz string: serialização exata`; C14f passa (controle só retirado); 3 testes, 1 pass, 2 fail |
| `red-outputs.tap.log` | idem | C14l `codex-exec: contagem do lote` (nada removido), C16d `export serializa o membro`; 2 fail |
| `red-store.tap.log`, `red-store-2-finaltest.tap.log` | idem; o segundo com o teste final e só `store.mjs` voltado a `HEAD` por `git stash` (restaurado, lista de stash vazia) | C49b falha em `delete` (prévia saiu 0); C51b passa (controle); 2 testes, 1 pass, 1 fail |
| `green-store-1-testfix.tap.log` | correção | C49b falhou por erro do próprio teste: conferia o `lstat` do ID da ativa também nas execuções da parada; corrigido para o ID de cada execução e para os dois nomes |
| `compare.log` (scratch, só booleanos) | antigo × corrigido | F1: 33 casos (11 valores × 3 grafias) — antigo removia 3 (só os de 8), 30 com a credencial no texto; corrigido 33/33. F2: 5 entradas — antigo perde `__proto__` nas 5, troca o protótipo da raiz em 2 (objeto, `null`), nenhuma perda contada; corrigido preserva as 5 com protótipo comum |
| `f3-old.json` / `f3-new.json` (scratch) | sonda F3 no store antigo × corrigido | antigo: prévia 0 com `entries:["key"]`, apply 0 `deleted:true`, arquivo alheio apagado, captura ativa com chave e `state:"active"`; corrigido: prévia e apply 4 `foreign_entry`, arquivo alheio intacto |
| `green-policy.tap.log`, `green-outputs.tap.log`, `green-store.tap.log` | correção, antes do commit | 3/3, 2/2, 2/2, exit 0 |

## Execuções no commit `fecbea5`

| Plataforma | Comando | Resultado |
| --- | --- | --- |
| Windows 11 — Node 24.21.0, HEAD e árvore limpa conferidos antes e depois (`gate-fecbea5/gate.meta`) | `node --test tests/integrations/privacy/*.test.mjs` / `npm test` | 103/103, 0 skip (C34/C35 incluídos); exit 0 — governança 6/6, code-review 16/16, doctor 417 (410, 7 skip), integrações 191 (185, 6 skip) |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i5-formal3-y4ypww`, tar sha256 `2ab639b4…4ba9ac` e `get-tar-commit-id` = `fecbea52…` conferidos no script; stage `skill-me-i5-formal3-wsl-stage-V9F6Mp` | idem | 103/103, 0 skip; exit 0 — 6/6, 16/16, doctor 417 (416, 1 skip), integrações 191 (179, 12 skip) |

Skips iguais aos do lote anterior, conferidos pelos nomes: Windows doctor 7
(POSIX symlink/FIFO), integrações 6 (I4-C15, I4-C25b/j/k/l/m); WSL doctor 1
(`hermes_cli.PYD`), integrações 12 (I4-C18–23/C37/C44b, I4-C25g/h/i/m). Os seis
testes novos aparecem como `ok` nos dois logs de privacidade.

Preparação WSL: `run-wsl.sh` copiado do stage anterior trocando só o comentário
e os prefixos (`diff` conferido: linhas 2, 22, 27 e 29), chamado com
`MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash -l <script> <tar> <sha> <node_modules> <commit> <saída>`;
o script recusa root, outra distro, origem ausente e saída/destino fora do
padrão antes de copiar ou extrair. Nenhum comando inline no WSL, nada em `/repo`
ou `/src.tar`; preparação antiga do Verifier6, seu probe, sessões ou
configurações pessoais não tocados; nenhum modelo, rede de produto, instalação,
subagente, push ou `review:run`. Nenhum arquivo do repositório editado durante
os gates; o WSL começou depois do fim do gate Windows. Nenhuma rejeição de
política nem falha de capacidade.

**Diferença de SHA**: os gates acima rodaram em `fecbea5`. O commit desta
evidência só acrescenta esta seção (`.checks/`); código, testes, guia e checklist
são idênticos aos do gate. Nele rodaram só I5-C34 e I5-C35, numa invocação com
seletor sobre `docs-privacy.test.mjs` (Windows); `npm test` e o alvo completo não
foram repetidos nele.

## Riscos e perdas comunicados

- F1, perdas declaradas (falsos positivos, falha fechada): a palavra depois de
  `Bearer`/`Basic` em prosa sai (`Basic auth`, `Bearer token`); palavra que para
  antes de `(` (`Bearer tokens(s)`) omite o campo inteiro com `unsanitizable`.
- F1, limites mantidos e comunicados (não aceitos como vazamento): grafias
  `basic`/`BASIC`/`BEARER` (o esquema HTTP não diferencia caixa), credencial na
  linha seguinte ao esquema e esquemas não listados continuam não reconhecidos
  fora de um cabeçalho `Authorization:`; ampliar exige decisão do coordenador.
- F2: nenhuma perda nova; `__proto__` passa a ocupar orçamento e membros como
  qualquer chave.
- F3: a recusa vale para coexistência criada fora do produto; não é proteção
  contra falsificação arbitrária do disco (uma pasta `.deleting-<id>` sozinha e
  forjada continua tratada como retomada, como antes).
- Perfil `light`: nenhuma falha injetada fora dos cenários enumerados. Este verde
  é autoral; não é aprovação independente nem formal.
