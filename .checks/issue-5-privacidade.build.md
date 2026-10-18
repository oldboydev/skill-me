# Issue #5 — evidência autoral PARCIAL (lote de armazenamento, sem D1)

Autor: Claude. Perfil `light`. **Não é PASS da feature**: a política de
conteúdo, `privacy ingest`/`export`, a integração às saídas do debugger, o guia
e a demo dependem de D1 (pendente com o proprietário) e não foram implementados.
Nenhum Verifier, review:run, push ou PR foi executado por este autor.

## Escopo deste lote

Commits: `48d4643` (Landing do lote, antes do código) e `0ab38fb` (código e testes).

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
