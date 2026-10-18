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
