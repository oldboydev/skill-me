# Issue #5 — controles de coleta e privacidade

Perfil `light`, handoff `on` (AGENTS.md). Checklist escrito antes de qualquer
código; nenhum teste abaixo existe ou foi executado ainda. Nomes e arquivos de
testes novos são planejados; "Proof" indica o comando que os executará.

Sources:

- [Issue #5](https://github.com/oldboydev/skill-me/issues/5), corpo e oito AC
  lidos pelo autor em 17/10/2026 via `gh issue view 5`; snapshot do coordenador
  em `.checks/code-review/issue-5/issue-approved.json`: escopo funcional, delegação dos
  detalhes técnicos, "não presumir proteção completa apenas por regex".
- `.tasks/issue-5-privacidade.md` (com a alteração não commitada de 17/10/2026
  que resolve U1): critérios 1–20, rastreabilidade AC1–AC8, Decided, Out of scope.
- `.checks/issue-5-privacidade.approval.md`: aprovação literal do proprietário,
  fronteira com #8, push/PR autorizados, sem merge.
- `.checks/issue-5-privacidade.planning-handoff.md`: histórico de Planning (não editado).
- `AGENTS.md`, `CLAUDE.md`, `package.json`, `.github/workflows/governance.yml`,
  `scripts/ci-change-filter.mjs`: governança, Node >=24, comandos reais de teste
  (`test:integrations` = `node --test "tests/integrations/**/*.test.mjs"` já roda
  em Ubuntu/Windows/macOS na CI).
- Código lido: `src/integrations/{boundary,observation,memory-receiver,hook-command,ingest-command,codex-run,cli,cli-args,line-reader}.mjs`,
  `src/integrations/adapters/*.mjs`, `src/integrations/hermes/plugin/{__init__.py,kwargs.json}`,
  `src/integrations/install/{target,io}.mjs` e o lock de `install/run.mjs` (l. 140–279).
- Fixtures e testes lidos: `tests/integrations/fixtures/*.json` (4 contratos),
  `tests/integrations/{boundary.unit,adapters.unit,claude-hook.cli,codex-hook.cli,codex-run.cli,failure-matrix.cli,fixtures-inventory,docs-matrix,memory-receiver.unit}.test.mjs`
  (nomes e asserções de saída) e `helpers/{cli,fixtures,fs-probe,tree}.mjs`.
- Nenhuma interface vinculante: não há tela; perfil `ui` não se aplica.

## Out of scope

- Transporte das integrações instaladas para a captura, descoberta de coletor,
  follow/list/query e núcleo completo — #8 (aprovação de U1).
- Timeline/atribuição (#6) e relatórios avaliativos (#7).
- Sanitizar stdout/stderr nativos do filho do wrapper: alteraria o contrato do
  repasse byte a byte da #4 (plano, Out of scope).
- Conteúdo opt-in para Hermes: o plugin aprovado na #4 projeta só nomes escalares
  de `kwargs.json`; `args`/`result` nunca saem do processo Hermes (ver Landing D-H).
- Alterar `kwargs.json`, o plugin Python, instalação, políticas de confiança,
  workflow da CI, motor `scripts/code-review/` (core de cinco arquivos) ou o teto
  de revisões.
- Daemon de retenção, cota global de raiz, ACL própria (Windows herda a DACL da
  raiz escolhida pelo usuário; POSIX cria 0700/0600).
- Limpeza de traces pessoais, backups ou histórico de governança; ler configs,
  sessões, transcrições ou secrets pessoais. Provas usam só `makeScratch` e dados sintéticos.
- Repetir a ação bloqueada de preparação do Verifier6 ou o probe residual dela.

## Landing

Toca `src/integrations/` (observação, CLI) e cria `src/integrations/privacy/`
(política pura, matriz de conteúdo, armazenamento, comandos). Reutiliza
`buildEnvelope`/`validateEnvelope`, adaptadores, `createLineReader`
(`STREAM_MAX_LINE_BYTES`), `readBoundedStdin`, `ONE_MIB_BYTES`, `CliUsageError`,
`ConflictError`/`assertContained` de `install/target.mjs` e `writeExclusive`
(`wx`) de `install/io.mjs`. Testes novos ficam em `tests/integrations/privacy/`
para entrar no `test:integrations` existente sem editar a CI.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Política única | `applyPolicy({ draft, payload, key, content }) -> { ok:false, drop } \| { ok:true, record }`, em `src/integrations/privacy/policy.mjs`; `observation.mjs` e `privacy ingest` chamam a mesma função; ordem: `buildEnvelope` → pseudônimos/nomes → projeção de conteúdo → sanitização → orçamento → revalidação `validateEnvelope` + tamanho | sanitizar no exportador/receptor: cada saída teria cópia própria da regra (crit. 4, Decided) |
| Registro sanitizado v1 (disco, export, mesma forma) | `{"recordVersion":1,"envelope":<v1>,"privacy":["<alvo>:<código>",…],"content":null\|<conteúdo v1>}`; `alvo` ∈ `envelope.<campoV1>`, `content`, `<campo da matriz>`; `código` ∈ os seis do crit. 8; nenhum valor descartado no alvo | estender `gaps` do envelope v1 com novos motivos: mudaria a semântica de v1 e de `validateEnvelope` (Decided) |
| Envelope v1 continua formato interno | `ids` substituídos por pseudônimo; campo `name` removido pela política sai de `fields` e vira `envelope.<campo>:sensitive_removed` em `privacy`; o envelope resultante ainda passa em `validateEnvelope` | campo removido com um gap v1 existente (`not_identifier`): mentiria sobre o motivo |
| Pseudônimo | `"h1:" + base64url(HMAC-SHA-256(chave, domínio + "\0" + valor))` sem padding (46 caracteres, nunca truncado); domínio `id` para TODOS os 14 nomes de `ID_NAMES` (igualdade `parentSessionId`↔`sessionId`), domínio `path` para caminhos de conteúdo | hash sem chave (dicionário); domínio por campo (quebra igualdade entre pai/filho) |
| Chave | 32 bytes de `crypto.randomBytes`; captura: arquivo `key` (binário, 0600); hook/ingest/wrapper sem captura: chave efêmera em memória por processo, nunca gravada | chave por env/config herdada (consentimento/correlação implícitos, crit. 10); chave global |
| Nomes v1 (`toolName`, `skillName`, `commandName`, `commandSource`, `agentType`, `mcpServer`, `errorType`, `platform`, `childRole`, `childStatus`, `processSignal`) | removidos com `sensitive_removed` se contêm `/`, começam com `~` ou `X:`, contêm `@`, ou casam um detector de segredo (lista abaixo); enums, inteiros, booleanos e `nativeEvent` (já fechados) passam inalterados | pseudonimizar nomes: destruiria `toolName`/`skillName`, necessários à #6 |
| Matriz de conteúdo (tabela fechada, `CONTENT_TABLE` exportada; o guia é testado contra ela) | ver "Matriz de conteúdo" abaixo; linha ausente, contrato/evento/ferramenta não listados ou tipo diferente do previsto → `content:unsupported_content` sem ler o valor | copiar `tool_input`/`tool_response` genéricos e filtrar por regex (Decided, crit. 2) |
| Tipos de campo de conteúdo | `{"field","role":"args"\|"result","kind":"text","value","truncated":bool}`, `kind:"path"` → `{"ref":"h1:…"}` (sem componente original), `kind:"structured"` → `{"value":<projeção>}`, `kind:"text_list"` → `{"value":[…],"truncated":bool}`; conteúdo = `{"contentVersion":1,"tool":<toolName aceito>,"fields":[…]}` em ordem da tabela | preservar diretório-base/extensão dos caminhos: expõe componentes originais (crit. 4) |
| Projeção `structured` (só `mcp_tool_call.arguments`) | profundidade = contêineres aninhados (`{}` = 1), máximo 8; membros = entradas de objetos/arrays visitadas no evento, máximo 128; excesso → conteúdo inteiro omitido, `content:unsanitizable`; chave fora de `^[A-Za-z0-9_.-]{1,64}$` → membro omitido `unsanitizable`; chave sensível → subárvore descartada `sensitive_removed`; folhas string → sanitizador de texto; número finito/booleano/null mantidos | contar só folhas ou só profundidade de objetos: não limita arrays largos |
| Chaves sensíveis (comparação após minúsculas e remoção de `-`/`_`) | iguais a `auth`, `authorization`, `proxyauthorization`, `cookie`, `setcookie`, `xapikey`, `pwd`, `passwd`; ou contendo `password`, `secret`, `token`, `apikey`, `privatekey`, `credential`, `accesskey` | lista exata sem substring: perde `githubToken`, `dbPassword` |
| Sanitizador de texto (ordem fixa; cada remoção conta `sensitive_removed`) | 1) bloco `-----BEGIN …PRIVATE KEY…-----` até o `END` correspondente, ou até o fim se não fechar → `[removido]`; 2) URL `esquema://userinfo@` → userinfo removido; parâmetros de query com nome sensível → valor removido, demais mantidos; 3) linha/trecho `authorization\|proxy-authorization\|cookie\|set-cookie\|x-api-key: …` até fim de linha/aspas → valor removido; 4) `Bearer\|Basic <valor>`; 5) atribuição/flag `nome sensível` com `=`, `:` ou espaço (`--password x`) → valor removido; 6) formatos `gh[pousr]_…`, `github_pat_…`, `sk-…` (≥20), `xox[abprs]-…`, `AKIA[0-9A-Z]{16}`, `glpat-…`, `AIza…`, JWT `eyJ….….…`; 7) prefixo pessoal `C:\Users\<nome>`, `/home/<nome>`, `/Users/<nome>` → `<home>`. String não bem formada (surrogate isolado) ou com NUL → campo omitido `unsanitizable` | anunciar regex como garantia universal (issue: "não presumir proteção completa"); o guia declara a limitação |
| Orçamento e truncamento | conteúdo ≤ 8192 bytes de `Buffer.byteLength(JSON.stringify(content))`, medido DEPOIS da sanitização; campos `text`/`text_list` cortados em fronteira de code point na ordem da tabela, `truncated:true` e `<campo>:content_truncated`; `path`/IDs nunca cortados — se não cabem, campo omitido com `content_truncated`; envelope sanitizado > 4096 → evento descartado `envelope_oversize` | truncar antes de sanitizar: corta um segredo e deixa prefixo detectável só parcialmente (crit. 7) |
| Instruções de skill e prompts (crit. 3) | conteúdo nunca lido de: ferramenta `Skill` (Claude), `UserPromptExpansion.prompt/command_args`, `SubagentStop.last_assistant_message`, itens `reasoning`/`agent_message`/`collab_tool_call.prompt`/`web_search.query`/`todo_list`, eventos Hermes; e — **pendente D1** — em evento cujo argumento contém caminho com basename `SKILL.md` (sem diferenciar caixa), todos os campos `result` omitidos com `<campo>:unsupported_content` | ver D1 em Handoff/bloqueios |
| D-H Hermes sem conteúdo | `privacy ingest --agent hermes` recebe o registro `{hook,kwargs,nonScalar}` da #4; eventos de ferramenta contam `content:unsupported_content` | alterar `kwargs.json`/plugin para enviar `args`/`result`: muda o contrato aprovado da #4 e a fila de 8192 bytes do plugin (Impact: exige contrato comprovado) |
| Relatório de fixture v2 | `SKILL_ME_OBSERVER_REPORT_FD` passa a `{"skillMeObserverReport":2,"events":[<envelope v1 sanitizado>],"counters":{…existentes, "privacy":{"content_disabled":n,…seis códigos}}}`; `helpers/cli.mjs#parseReport` aceita só `2` | manter `1` com IDs pseudonimizados: um consumidor de v1 compararia IDs nativos sem saber da troca |
| Comando | subcomando `privacy` do CLI existente: `node src/integrations/cli.mjs privacy <start\|ingest\|stop\|disable\|status\|export\|delete\|prune> …`; script `"privacy": "node src/integrations/cli.mjs privacy"` em `package.json`; `--help` em português | novo binário/pacote `src/privacy`: não há consumidor fora das integrações; CI já cobre `tests/integrations/**` |
| Entrada do ingest | somente stdin NDJSON (uma entrada nativa por linha: payload de hook Claude/Codex, evento JSONL do `codex exec`, registro Hermes), linha ≤ 64 KiB pelo `createLineReader`; nunca `--input <arquivo>` | ler arquivo por caminho: abre porta para ler sessões/transcrições (crit. 14) |
| Raiz e layout literal | `--root` existe e é diretório (realpath = referência); `<root>/skill-me-privacy/` (0700) com `store.json` = `{"skillMePrivacyStore":1}`, `.lock`, `captures/<id>/` (0700) contendo `state.json`, `key`, `events-NNNNNN.ndjson` (6 dígitos) e temporários `<nome>.<hex8>.skill-me-tmp`; `captures/.deleting-<id>/` durante exclusão; `<id>` = 32 hex minúsculos de `randomBytes(16)`, validado antes de qualquer `path.join` | default em diretório pessoal/cwd (crit. 13); arquivo único por raiz (contenção entre capturas) |
| `state.json` (controle, sem conteúdo) | `{"captureVersion":1,"id","state":"active"\|"stopped"\|"disabled","content":bool,"retentionDays":1..365,"createdAt":ISO,"endedAt":ISO\|null,"dataFile":"events-NNNNNN.ndjson"\|null,"dataBytes":n,"counters":{"accepted","persisted","malformed","dropped":{motivo:n},"contentOmitted":{código:n}},"limits":{"maxEvents":500,"maxBytes":8388608}}`; `endedAt` = primeira saída de `active`, mantido em `stopped→disabled` | guardar contagens por segmento: status teria de ler dados |
| Atomismo | sob o lock: grava `events-<n+1>.ndjson` completo (anterior + novos) via temporário `wx` + `fsync` + `rename`; depois `state.json` via temporário + `rename` (ponto de commit); depois apaga `events-<n>`. Falha antes do commit: estado anterior intacto, temporário apagado (contém só dados sanitizados), exit 5 | append por evento: crash deixa linha parcial; segmento por ingest sem commit único |
| Lock | `<root>/skill-me-privacy/.lock` criado com `wx`, conteúdo `{"lockVersion":1,"pid":n,"nonce":"<hex16>"}`; TODOS os comandos (inclusive status/export/delete/prune) o tomam; ocupado → exit 4 `lock_present`, sem espera, sem mutação, nunca removido por outro processo; liberado só se ainda tiver os bytes gravados | espera/retry com backoff: produtor atrasado venceria um stop; leitura sem lock: `rename` falha no Windows com handle aberto |
| Ingest em duas fases | fase 1 sem lock: lê `state.json`/`key`, sanitiza linha a linha e guarda só registros sanitizados (≤ orçamento restante); fase 2 com lock: relê estado; não-`active` ou ausente → exit 3, tudo descartado; admite em ordem até o primeiro que ultrapassaria 500 eventos ou 8 MiB — esse e os seguintes viram `capture_event_limit`/`capture_byte_limit` | segurar o lock enquanto o stdin chega: bloquearia stop/delete indefinidamente |
| Barreira de exclusão | sob o lock: confere cada entrada de `captures/<id>` (`lstat`: arquivo regular, nome no conjunto literal; link/junção/diretório/nome alheio → exit 4 `foreign_entry`/`link_refused`, nada apagado); `rename` para `.deleting-<id>`; apaga dados, temporários, `key`, `state.json`; `rmdir`. Falha parcial → exit 5 `partial_delete`, `.deleting-<id>` permanece e novo `delete --apply` retoma. `ingest`/`stop` nunca criam diretórios: só `start` faz `mkdir` não recursivo de um ID novo | `rm -rf` da captura: seguiria/apagaria o inesperado (crit. 18) |
| Retenção | `prune` seleciona `stopped`/`disabled` com `now - endedAt >= retentionDays * 86 400 000 ms`; `active` nunca; `.deleting-*` retomados; prévia por padrão; relógio só injetável na API em processo `runPrivacyCommand({ argv, now })`, nunca por env/flag | variável de ambiente de relógio: superfície de produção para manipular retenção |
| Saída e códigos | stdout JSON `{"schemaVersion":1,"command":…,"status":"ok"\|"error",…}`; erro = `{"schemaVersion":1,"command","status":"error","error":{"code"}}` com código fechado: 2 `unknown_command`,`unknown_flag`,`missing_flag_value`,`missing_root`,`missing_capture`,`invalid_capture_id`,`invalid_agent`,`invalid_retention`,`unexpected_argument`; 3 `root_not_found`,`root_not_directory`,`store_invalid`,`capture_not_found`,`capture_invalid`,`capture_not_active`,`capture_active`,`invalid_transition`; 4 `lock_present`,`link_refused`,`foreign_entry`,`root_changed`; 5 `io_failure`,`partial_delete`; stderr vazio; nenhum caminho, valor de flag, mensagem de exceção ou stack | mensagens livres com `error.message` (crit. 11) |
| Transições | `start`→`active`; `stop`: `active→stopped`, `stopped→stopped` (ok, `changed:false`), `disabled` → 3 `invalid_transition`; `disable`: `active\|stopped→disabled` e `content:false`, `disabled→disabled` ok; `delete --apply`: `stopped\|disabled→`removida, `active` → 3 `capture_active`; nada volta a `active` | `stop` em `disabled` idempotente: esconderia ordem inválida |
| Módulos do lote de armazenamento (registrado antes do código, lote sem D1) | `privacy/lifecycle.mjs` puro: `PRIVACY_LIMITS`, `CAPTURE_ID_PATTERN`, `transition(capture, action, nowIso) -> {ok:true, capture, changed} \| {ok:false, code}`, `admitLines(usage:{events,bytes}, lineBytes[]) -> {admitted, reason\|null, dropped}`, `isExpired(capture, nowMs)`; `privacy/store.mjs` (disco, `io` injetável): `startCapture`, `changeCaptureState`, `readCaptureStatus`, `appendRecords`, `deleteCapture({apply})`, `pruneCaptures({apply, nowMs})`, `StoreError(code)`; `privacy/args.mjs` (flags); `privacy/command.mjs` `runPrivacyCommand({argv, now, io}) -> {exitCode, body}` | decisões e E/S no mesmo módulo: regra de transição/retenção/admissão só testável montando disco (AGENTS) |
| `appendRecords(root, id, batch)` — consumidor futuro: `privacy ingest` e #8 | `batch = {records:[registro v1 produzido por applyPolicy], malformed:n, dropped:{motivo:n}, contentOmitted:{código:n}}`; o storage não sanitiza, não lê `content`/`privacy` e não deriva contadores do conteúdo: recusa só registro que não é objeto com `recordVersion:1` (erro de programação, nunca gravado); `accepted += records.length`; admissão decide `persisted`, limites somam em `dropped`; chaves de `contentOmitted` ∈ seis códigos, de `dropped` casam `^[a-z][a-z_]{0,39}$` | storage contar `contentOmitted` lendo `privacy` dos registros: duplicaria a semântica da política (fonte única) |
| Admissão depois do primeiro recusado | percorre em ordem; o primeiro que ultrapassaria 500 eventos ou 8 388 608 bytes (`dataBytes` = bytes UTF-8 de cada `JSON.stringify(registro) + "\n"`) para a admissão do lote; ele e todos os seguintes contam no motivo desse primeiro | avaliar cada seguinte de novo: um registro menor posterior passaria à frente de um recusado (ordem) |
| Escrita própria (`privacy/fs.mjs`) em vez de `install/io.mjs#writeExclusive` | `open(arquivo, "wx", 0o600)` + escrita + `sync` + `close`; diretórios `mkdir(dir, {mode:0o700})` não recursivo | `writeExclusive` cria com 0666 &~umask e carrega o código de ACL do instalador; mudar `install/io.mjs` é refatoração da #4 fora do escopo |
| Guardas de raiz e links | `--root` resolvido por `realpath` = referência; `skill-me-privacy/`, `captures/` e `captures/<id>/` conferidos por `lstat` como diretório real (link/junção → 4 `link_refused`); depois do lock e antes de cada mutação `realpath(--root)` igual à referência e pasta do store ainda real, senão 4 `root_changed`. Só `start` cria o store; sem `skill-me-privacy/`: stop/disable/status/delete → 3 `capture_not_found`, prune → 0 com seleção vazia, nada criado | seguir o link da pasta do store: exclusão/escrita fora da raiz escolhida (crit. 18) |
| Conjunto literal de entradas da captura (delete/prune) | `state.json`, `key`, `events-\d{6}.ndjson`, `(state.json\|events-\d{6}.ndjson).[0-9a-f]{8}.skill-me-tmp`; ordem de exclusão: temporários, dados, `key`, `state.json`, `rmdir`; a prévia lista esses nomes ordenados (nomes próprios, nunca conteúdo). `.deleting-<id>` é retomado sem exigir `state.json`; nomes alheios em `captures/` são ignorados e preservados pelo prune | apagar por glob/recursão: alcançaria entrada desconhecida |
| Saídas de sucesso do lote | start `capture:{id,state,content,retentionDays,createdAt}`; stop/disable `capture:{id,state,content,endedAt}, changed`; status `capture:{id,state,content,retentionDays,createdAt,endedAt,dataBytes,counters:{accepted,persisted,malformed,dropped,contentOmitted},limits:{maxEvents,maxBytes}}` (conjunto exato, sem campo de cobertura); delete prévia `capture:<id>, applied:false, entries:[…]`; delete aplicado `capture:<id>, applied:true, deleted:true`; prune `applied, selected:[ids], deleted:[ids], failed:[{capture,code}]` — com `failed` não vazio, `status:"error"`, `error.code` e exit do mais grave (5>4>3) e as listas mantidas para a falha parcial ficar visível | prune com só o primeiro erro: esconderia o que já foi apagado |
| Roteamento parcial | `privacy` roteia start/stop/disable/status/delete/prune; `ingest`/`export` saem 2 `unknown_command` e o `--help` não os anuncia até o lote da política (D1) entrar | stub de ingest/export: anunciaria sanitização inexistente |
| Arquivo de dados anterior que não saiu após o commit | `state.json` já aponta para o novo; o antigo, só com registros sanitizados, fica no conjunto literal e sai no delete; comando termina 0 | desfazer o commit: perderia eventos já confirmados |
| Leitura limitada no storage (achado do coordenador em `content-decision.md`; linha escrita junto da correção `af7e16f`, não antes dela) | `state.json` (64 KiB), `store.json` (26 B), `.lock` (bytes gravados) e o segmento anterior (exatamente `dataBytes`) lidos por `doctor/snapshot-read.mjs#readSnapshot`: teto na leitura posicional (`maxBytes + 1`), fd conferido como arquivo regular, mudança durante a leitura recusada; maior/menor → código fechado (`capture_invalid`/`store_invalid`/`root_changed`) | `readFile` seguido de comparação de tamanho: carregava o arquivo inteiro antes do limite (fronteira não confiável) |

Matriz de conteúdo (contrato da fixture versionada; papel; tipo):

| Agente / contrato | Evento nativo | Ferramenta | Campo | Papel | Tipo |
| --- | --- | --- | --- | --- | --- |
| claude `claude-code-hooks@docs-2026-10-16` | PreToolUse, PostToolUse, PostToolUseFailure | Bash | `tool_input.command` | args | text |
| claude idem | PreToolUse | Bash | `tool_input.description` | args | text |
| claude idem | PostToolUse | Bash | `tool_response.stdout`, `tool_response.stderr` | result | text |
| claude idem | PreToolUse, PostToolUse, PostToolUseFailure | Read | `tool_input.file_path` | args | path |
| claude idem | PreToolUse, PostToolUse, PostToolUseFailure | Grep | `tool_input.pattern` (text), `tool_input.path` (path) | args | text / path |
| codex `codex-hooks@rust-v0.162.1` | PreToolUse, PostToolUse | Bash | `tool_input.command` | args | text |
| codex hooks idem | PostToolUse | Bash | `tool_response.output` (só se `tool_response` é objeto) | result | text |
| codex hooks idem | PreToolUse, PostToolUse | apply_patch | `tool_input.patch` | args | text |
| codex `codex-exec-jsonl@rust-v0.162.1` | item.started/updated/completed | `command_execution` | `item.command` (args), `item.aggregated_output` (result) | args / result | text |
| codex exec idem | item.* | `mcp_tool_call` | `item.arguments` (args, structured); `item.result.content[]` com `type:"text"` → `text` (result, text_list) | args / result | structured / text_list |
| codex exec idem | item.* | `file_change` | `item.changes[].path` | args | path (lista de refs) |
| hermes `hermes-plugin-hooks@0.21.4` | — | — | nenhum (D-H) | — | — |

Falhas de `PostToolUseFailure.error`, `mcp_tool_call.error` e todo o resto ficam fora.

- Atualizações de testes da #4 cujo contrato de saída muda por aprovação
  (crit. 4/8): `helpers/cli.mjs#parseReport` (v2); I4-C1, I4-C2, I4-C4 em
  `claude-hook.cli.test.mjs`, I4-C7 em `codex-hook.cli.test.mjs`, I4-C19 em
  `hermes-plugin.native.test.mjs` deixam de comparar IDs nativos e passam a
  comparar pseudônimo `h1:` + ausência do valor nativo + igualdade dentro do
  mesmo relatório. Todas as outras asserções (eventKind, fields, gaps,
  contadores, stdout vazio, exit 0, repasse) ficam intactas; nenhum teste é
  apagado. `boundary.unit`/`adapters.unit` não mudam: v1 interno continua igual.
- Dívida declarada: o lock da privacidade segue o padrão `wx`+bytes conferidos de
  `install/run.mjs`, cujas funções são privadas daquele módulo; não são
  extraídas aqui porque seria refatoração do instalador fora do escopo.
- Nada mais nesta mudança é difícil de reverter.

## Checks

Comando de cada prova: `node --test --test-name-pattern="^I5-Cn " <arquivo>`.
Todos os testes CLI usam `makeScratch` (caminho com espaço e Unicode) e `baseEnv`.

### S1 — observar com uma política explícita · 13 arquivos · 99 KB · ~25k

**C1** - Sem captura (hook/ingest/wrapper), nenhum evento de ferramenta leva `content`; cada um conta `content_disabled`
Proof: `node --test --test-name-pattern="^I5-C1 " tests/integrations/privacy/policy.unit.test.mjs`
Proof: `node --test --test-name-pattern="^I5-C1b " tests/integrations/privacy/outputs.cli.test.mjs`

**C2** - `privacy start` sem `--content` cria captura com `content:false`; nova captura após uma com `--content` (parada ou desabilitada) também nasce `false`
Proof: `node --test --test-name-pattern="^I5-C2 " tests/integrations/privacy/store.cli.test.mjs`

**C3** - Variáveis herdadas (`SKILL_ME_*`, `CLAUDE_*`, `CODEX_*`) e arquivos de configuração de agente no cwd não ativam conteúdo em nenhum caminho
Proof: `node --test --test-name-pattern="^I5-C3 " tests/integrations/privacy/store.cli.test.mjs`

**C4** - Com `--content`, cada linha da matriz produz exatamente o campo previsto, sanitizado, com valor esperado literal (tabela completa, 1 caso por linha)
Proof: `node --test --test-name-pattern="^I5-C4 " tests/integrations/privacy/policy.unit.test.mjs`
Proof: `node --test --test-name-pattern="^I5-C4b " tests/integrations/privacy/store.cli.test.mjs` (args e results gravados pelo CLI real para claude, codex-hooks e codex-exec)

**C5** - Ferramenta, evento, contrato ou formato fora da matriz (Claude `WebFetch`, Codex `tool_response` string, `tool_input` não objeto, contrato desconhecido) → `content:null` e `content:unsupported_content`, sem nenhum valor nativo no registro
Proof: `node --test --test-name-pattern="^I5-C5 " tests/integrations/privacy/policy.unit.test.mjs`

**C6** - Com opt-in, prompts, raciocínio, mensagem final, ferramenta `Skill`, `collab_tool_call.prompt` e Hermes nunca produzem conteúdo (casos das fixtures com canário)
Proof: `node --test --test-name-pattern="^I5-C6 " tests/integrations/privacy/policy.unit.test.mjs`

**C7** - (pendente D1) Evento com argumento referenciando `SKILL.md` grava os args sanitizados e omite todos os `result` com `unsupported_content`
Proof: `node --test --test-name-pattern="^I5-C7 " tests/integrations/privacy/policy.unit.test.mjs`

**C8** - Ingest com `--content` de payloads que mandam criar arquivo (`touch`, `node -e writeFileSync`, `$(…)`) não cria o arquivo no scratch nem no cwd e não inicia processo
Proof: `node --test --test-name-pattern="^I5-C8 " tests/integrations/privacy/store.cli.test.mjs`

**C9** - Todo ID aceito vira `h1:` + 43 base64url; o mesmo valor na mesma captura dá o mesmo pseudônimo, inclusive entre `sessionId` e `parentSessionId`
Proof: `node --test --test-name-pattern="^I5-C9 " tests/integrations/privacy/policy.unit.test.mjs`

**C10** - O mesmo ID em duas capturas (e em dois processos de hook) dá pseudônimos diferentes
Proof: `node --test --test-name-pattern="^I5-C10 " tests/integrations/privacy/store.cli.test.mjs`
Proof: `node --test --test-name-pattern="^I5-C10b " tests/integrations/privacy/outputs.cli.test.mjs`

**C11** - Cada um dos 11 campos `name` com caminho, `@`, `~`, drive ou segredo é removido com `envelope.<campo>:sensitive_removed`; nome comum (`Bash`, `mcp__docs__search`) passa intacto
Proof: `node --test --test-name-pattern="^I5-C11 " tests/integrations/privacy/policy.unit.test.mjs`

**C12** - Campo `path` de conteúdo vira só `ref`; nenhum componente original (usuário, pasta, arquivo, extensão) aparece no registro
Proof: `node --test --test-name-pattern="^I5-C12 " tests/integrations/privacy/policy.unit.test.mjs`

**C13** - Toda entrada de `privacy` casa `^[A-Za-z_.\[\]]+:(content_disabled|unsupported_content|unsanitizable|sensitive_removed|content_truncated|privacy_failure)$` e nenhuma contém valor descartado
Proof: `node --test --test-name-pattern="^I5-C13 " tests/integrations/privacy/policy.unit.test.mjs`

### S2 — impedir que entradas brutas alcancem saídas persistíveis · 12 arquivos · 83 KB · ~21k

**C14** - Canários das cinco categorias (token, cabeçalho, URL com credencial, password, chave privada) em conteúdo, com e sem opt-in, não aparecem em nenhum canal do debugger: relatório de hook Claude/Codex, relatório do ingest Hermes, relatório do wrapper, stdout/stderr de cada comando `privacy`, arquivos de dados, `state.json`, `.lock`, temporários (observados pelo `fs-probe` antes do rename) e export
Proof: `node --test --test-name-pattern="^I5-C14 " tests/integrations/privacy/outputs.cli.test.mjs`

**C15** - Os mesmos canários colocados em IDs, nomes (`toolName`, `skillName`) e caminhos (`cwd`, `file_path`, `transcript_path`) também não aparecem em nenhum desses canais
Proof: `node --test --test-name-pattern="^I5-C15 " tests/integrations/privacy/outputs.cli.test.mjs`

**C16** - Subárvore sob chave sensível (aninhada a profundidade 3, variações `API-Key`, `db_password`, `Set-Cookie`) é descartada inteira com `sensitive_removed`
Proof: `node --test --test-name-pattern="^I5-C16 " tests/integrations/privacy/policy.unit.test.mjs`

**C17** - `https://user:pw@host/p?token=x&page=2` sai como `https://host/p?token=[removido]&page=2` (literal)
Proof: `node --test --test-name-pattern="^I5-C17 " tests/integrations/privacy/policy.unit.test.mjs`

**C18** - Bloco de chave privada multilinha (fechado e não fechado) é descartado inteiro; o texto antes dele permanece (literal)
Proof: `node --test --test-name-pattern="^I5-C18 " tests/integrations/privacy/policy.unit.test.mjs`

**C19** - String com surrogate isolado ou NUL e chave de objeto fora do padrão são omitidas com `unsanitizable`
Proof: `node --test --test-name-pattern="^I5-C19 " tests/integrations/privacy/policy.unit.test.mjs`

**C20** - Hook: entrada de exatamente 1 MiB é lida; 1 MiB + 1 byte conta `inputTooLarge`. `privacy ingest`: linha de exatamente 64 KiB é lida; 64 KiB + 1 conta como malformada (`oversize_line`)
Proof: `node --test --test-name-pattern="^I5-C20 " tests/integrations/privacy/limits.cli.test.mjs`

**C21** - Envelope sanitizado de exatamente 4096 bytes é aceito; 4097 descarta o evento com `envelope_oversize`
Proof: `node --test --test-name-pattern="^I5-C21 " tests/integrations/privacy/policy.unit.test.mjs`

**C22** - Conteúdo de exatamente 8192 bytes não é truncado; 8193 é truncado em UTF-8 válido (corte sobre emoji de 4 bytes e `ç`), `truncated:true` e `content_truncated`
Proof: `node --test --test-name-pattern="^I5-C22 " tests/integrations/privacy/policy.unit.test.mjs`

**C23** - Profundidade 8 e 128 membros são aceitos; profundidade 9 ou 129 membros omitem o conteúdo inteiro com `content:unsanitizable`
Proof: `node --test --test-name-pattern="^I5-C23 " tests/integrations/privacy/policy.unit.test.mjs`

**C24** - Segredo que atravessa a posição de corte de 8192 bytes não deixa nenhum prefixo dele no resultado (sanitização antes do truncamento)
Proof: `node --test --test-name-pattern="^I5-C24 " tests/integrations/privacy/policy.unit.test.mjs`

**C25** - Com orçamento esgotado, `ref` de caminho e IDs nunca são cortados: o campo é omitido com `content_truncated`, e os IDs mantêm 46 caracteres
Proof: `node --test --test-name-pattern="^I5-C25 " tests/integrations/privacy/policy.unit.test.mjs`

**C26** - Para um lote misto conhecido, o relatório v2 e o `status` trazem a contagem exata de cada um dos seis códigos
Proof: `node --test --test-name-pattern="^I5-C26 " tests/integrations/privacy/outputs.cli.test.mjs`
Proof: `node --test --test-name-pattern="^I5-C26b " tests/integrations/privacy/store.cli.test.mjs`

**C27** - `contentOmitted` (conteúdo omitido) e `dropped` (evento descartado) são contadores separados; o `status` tem conjunto de chaves exato e nenhum campo de cobertura/completude
Proof: `node --test --test-name-pattern="^I5-C27 " tests/integrations/privacy/store.cli.test.mjs`

**C28** - Exceção na sanitização (Proxy/getter que lança no payload) descarta só a parte insegura com `privacy_failure`, sem mensagem, stack ou valor, e sem nova tentativa
Proof: `node --test --test-name-pattern="^I5-C28 " tests/integrations/privacy/policy.unit.test.mjs`

**C29** - Hooks Claude/Codex com entrada hostil contendo canários mantêm stdout vazio e exit 0; wrapper mantém stdout do filho byte a byte e o código 17
Proof: `node --test --test-name-pattern="^I5-C29 " tests/integrations/privacy/outputs.cli.test.mjs`
Proof: `node --test --test-name-pattern="^I4-C36 |^I4-C13 |^I4-C16 " tests/integrations/failure-matrix.cli.test.mjs tests/integrations/codex-run.cli.test.mjs` (regressões da #4 preservadas)

**C30** - Falha de rename na gravação (`SKILL_ME_TEST_FS_PROBE_FAIL_RENAME_TO`) faz `privacy ingest` sair 5 `io_failure`, deixa `state.json` e dados anteriores idênticos e nenhum temporário
Proof: `node --test --test-name-pattern="^I5-C30 " tests/integrations/privacy/store.cli.test.mjs`

### S3 — reconhecer limites e manter o uso local · 6 arquivos · 36 KB · ~9k

**C31** - Nenhum módulo de `src/integrations/privacy/` importa `net`, `http`, `https`, `http2`, `dns`, `dgram`, `tls` ou usa `fetch`; com sonda que faz `net.connect`/`dns.lookup`/`fetch` lançarem, o demo completo e os hooks terminam sem nenhuma chamada registrada
Proof: `node --test --test-name-pattern="^I5-C31 " tests/integrations/privacy/no-network.test.mjs`

**C32** - Cada código de erro do `privacy` (tabela dos códigos 2/3/4/5 do Landing) é produzido por um cenário real com a forma JSON exata; stdout não contém caminho da raiz, valor de flag, `Error`, `at ` nem canário; stderr vazio
Proof: `node --test --test-name-pattern="^I5-C32 " tests/integrations/privacy/store.cli.test.mjs`

**C33** - O wrapper repassa canário emitido pelo filho em stdout/stderr nativos sem alteração, enquanto o relatório do debugger do mesmo run não o contém
Proof: `node --test --test-name-pattern="^I5-C33 " tests/integrations/privacy/outputs.cli.test.mjs`

**C34** - `docs/privacidade.md` tem a tabela da matriz idêntica a `CONTENT_TABLE`, os defaults (off, 7 dias, 1–365), os limites (1 MiB, 64 KiB, 4096, 8192, 8, 128, 500, 8 MiB), os seis códigos, o `prune` manual, a separação stdout/stderr nativos e a frase de que a detecção por padrões não é garantia universal
Proof: `node --test --test-name-pattern="^I5-C34 " tests/integrations/privacy/docs-privacy.test.mjs`

**C35** - O guia lista como comprovadas somente as plataformas registradas em `.checks/issue-5-privacidade.build.md` com execução real
Proof: `node --test --test-name-pattern="^I5-C35 " tests/integrations/privacy/docs-privacy.test.mjs`

### S4 — controlar e eliminar traces sanitizados no disco local · 8 arquivos · 70 KB · ~17k

**C36** - `privacy start --root R` sai 0 com `{state:"active",content:false,retentionDays:7}`, ID de 32 hex e cria o layout literal; dois starts dão IDs e chaves diferentes
Proof: `node --test --test-name-pattern="^I5-C36 " tests/integrations/privacy/store.cli.test.mjs`

**C37** - `--retention-days` aceita 1 e 365; rejeita 0, 366, 1.5, `7d`, `-1` e ausência de valor com exit 2 `invalid_retention`/`missing_flag_value`
Proof: `node --test --test-name-pattern="^I5-C37 " tests/integrations/privacy/store.cli.test.mjs`

**C38** - Sem `--root` → 2 `missing_root` e nada criado no cwd; raiz inexistente → 3 `root_not_found`; arquivo → 3 `root_not_directory`
Proof: `node --test --test-name-pattern="^I5-C38 " tests/integrations/privacy/store.cli.test.mjs`

**C39** - `privacy ingest` para cada um dos quatro `--agent` grava só registros que passam em `validateEnvelope` + forma v1, e nenhum arquivo/temporário/lock contém canário (fs-probe)
Proof: `node --test --test-name-pattern="^I5-C39 " tests/integrations/privacy/store.cli.test.mjs`

**C40** - `privacy ingest` não inicia processo nem abre arquivo fora de `<root>/skill-me-privacy/` (sonda de `spawn`/`open`)
Proof: `node --test --test-name-pattern="^I5-C40 " tests/integrations/privacy/store.cli.test.mjs`

**C41** - Tabela de transições: `stop` active→stopped e repetido idempotente; `disable` de active e de stopped → disabled com `content:false`, repetido idempotente; `stop` em disabled → 3 `invalid_transition`
Proof: `node --test --test-name-pattern="^I5-C41 " tests/integrations/privacy/lifecycle.unit.test.mjs`
Proof: `node --test --test-name-pattern="^I5-C41b " tests/integrations/privacy/store.cli.test.mjs`

**C42** - Captura stopped ou disabled recusa ingest com 3 `capture_not_active` e a árvore fica idêntica (`snapshotTree`)
Proof: `node --test --test-name-pattern="^I5-C42 " tests/integrations/privacy/store.cli.test.mjs`

**C43** - `status`/`export` de uma captura não contêm registros, pseudônimos nem contadores de outra captura da mesma raiz; JSON `schemaVersion:1`; `privacy --help` sai 0 em português
Proof: `node --test --test-name-pattern="^I5-C43 " tests/integrations/privacy/store.cli.test.mjs`

**C44** - `delete` sem `--apply` não muda a árvore e lista a prévia; `--apply` em stopped e em disabled remove `captures/<id>`; em active → 3 `capture_active`
Proof: `node --test --test-name-pattern="^I5-C44 " tests/integrations/privacy/store.cli.test.mjs`

**C45** - Retenção: idade igual ao prazo é selecionada, 1 ms a menos não; active de 400 dias nunca; `disabled` conta de `endedAt` do stop original
Proof: `node --test --test-name-pattern="^I5-C45 " tests/integrations/privacy/lifecycle.unit.test.mjs`

**C46** - `prune` sem `--apply` não muda nada; com `--apply` e `now` injetado remove só as selecionadas; pelo CLI com relógio real nenhuma captura recém-parada é removida
Proof: `node --test --test-name-pattern="^I5-C46 " tests/integrations/privacy/store.cli.test.mjs`

**C47** - Com `.lock` presente, ingest/stop/disable/delete/prune/status/export saem 4 `lock_present`, árvore idêntica e o lock alheio continua lá
Proof: `node --test --test-name-pattern="^I5-C47 " tests/integrations/privacy/store.cli.test.mjs`

**C48** - Depois de stop/disable/delete confirmados, um ingest atrasado com o mesmo ID sai 3 e não grava nem recria `captures/<id>`
Proof: `node --test --test-name-pattern="^I5-C48 " tests/integrations/privacy/store.cli.test.mjs`

**C49** - `delete --apply` com link/junção, subdiretório ou arquivo alheio dentro da captura sai 4 sem apagar nada; arquivos alheios na raiz e em `skill-me-privacy/` permanecem
Proof: `node --test --test-name-pattern="^I5-C49 " tests/integrations/privacy/store.cli.test.mjs`

**C50** - A chave (bytes, hex e base64) nunca aparece em `export`/`status`; após `delete --apply` o arquivo `key` não existe
Proof: `node --test --test-name-pattern="^I5-C50 " tests/integrations/privacy/store.cli.test.mjs`

**C51** - Falha de `unlink` injetada no meio da exclusão sai 5 `partial_delete`, sem relatar exclusão completa; novo `delete --apply` conclui
Proof: `node --test --test-name-pattern="^I5-C51 " tests/integrations/privacy/lifecycle.unit.test.mjs`

**C52** - Decisão de admissão: 500 eventos aceitos, o 501º e os seguintes `capture_event_limit`; exatamente 8 388 608 bytes aceito, 1 byte acima `capture_byte_limit`
Proof: `node --test --test-name-pattern="^I5-C52 " tests/integrations/privacy/lifecycle.unit.test.mjs`
Proof: `node --test --test-name-pattern="^I5-C52b " tests/integrations/privacy/store.cli.test.mjs` (510 linhas pelo CLI: persisted 500, dropped 10)

**C53** - Para um lote misto conhecido, `status` traz `accepted`, `persisted`, `malformed` e `dropped` por motivo com valores exatos, e `accepted ≥ persisted`
Proof: `node --test --test-name-pattern="^I5-C53 " tests/integrations/privacy/store.cli.test.mjs`

**C54** - `state.json` e `.lock` têm exatamente as chaves do Landing e nenhum canário
Proof: `node --test --test-name-pattern="^I5-C54 " tests/integrations/privacy/store.cli.test.mjs`

**C55** - Demo versionada em scratch próprio: start → ingest → stop → export → delete; captura `--content` separada; disable; prune com `now` controlado; varredura de canários em todo arquivo criado; após exclusão, dados e `key` ausentes
Proof: `node --test --test-name-pattern="^I5-C55 " tests/integrations/privacy/demo.e2e.test.mjs`

**C56** - 8 ingests concorrentes com stop e depois delete: cada produtor sai 0 (eventos contados) ou 4/3 (nada gravado); `persisted` final = soma dos sucessos; nenhum dado reaparece após o delete e o fim de todos os produtores
Proof: `node --test --test-name-pattern="^I5-C56 " tests/integrations/privacy/demo.e2e.test.mjs`

### Governança (transversal)

**C57** - Core `scripts/code-review/` sem alteração em relação à base
Proof: `git diff --exit-code 1b6685fe97862ac1a2d2cff1e4d9f0e1f09a6a27 -- scripts/code-review`

**C58** - Pacote privado, sem nova dependência, suíte de integrações no `npm test` e na CI
Proof: `node --test --test-name-pattern="^I4-C47 " tests/integrations/fixtures-inventory.test.mjs`

**C59** - Suítes afetadas verdes: governança, code-review, doctor e integrações
Proof: `npm test` (complementar; não substitui as provas nomeadas)

## Swept

- validation: C4–C5, C11, C16–C23, C37–C38
- failure modes: C26–C30, C32, C51
- idempotency and retry: C41 (stop/disable repetidos), C44 (prévia), C28/C30 (sem retry com payload); `start` nunca é idempotente — sempre gera ID novo (C36)
- authorization: C2–C3 (consentimento explícito por captura), C38 (raiz explícita), C49 (contenção na raiz)
- concurrency and ordering: C47, C48, C56; ordem de admissão em C52
- data lifecycle: C36, C41–C46, C50–C52, C55
- external-dependency failure: C30 (E/S), C31 (sem rede); provas não dependem de modelos nem de Hermes instalado, exceto I4-C19 (skip declarado sem runtime Hermes)
- state transitions: C41, C42, C44, C48
- observability: C26–C27, C32, C53

Coverage join e Test policy não são exigidos no perfil `light`; os conjuntos
(matriz, 11 nomes, 6 códigos, 5 categorias × canais, códigos de erro, transições)
são enumerados dentro dos testes tabelados citados.

## Handoff

Leitura por fatia (`wc -c` dos arquivos que cada fatia toca ÷ 4, piso):
S1 = 98 826 B ≈ 25k (boundary, observation, memory-receiver, 5 adaptadores,
kwargs.json, 4 fixtures, boundary.unit, adapters.unit, helpers/fixtures);
S2 = 82 623 B ≈ 21k (hook-command, ingest-command, codex-run, line-reader,
5 testes CLI da #4, helpers/cli, helpers/wrapper, memory-receiver.unit);
S3 = 36 424 B ≈ 9k (agent-observation.md, README, cli.mjs, cli-args.mjs, docs-matrix);
S4 = 69 897 B ≈ 17k (install/target, install/io, install/run, doctor/cli-args,
helpers/tree, helpers/fs-probe). Plano + AGENTS + package.json ≈ 8k; este
checklist = 38 489 B ≈ 10k.

Total ≈ 25 + 21 + 9 + 17 + 8 + 10 = 90k < 150k: **um lote com S1–S4**. Se o
build estourar mesmo assim, a fronteira é depois de S2 (≈ 65k): S3/S4 entram
em CLI, guia e disco, superfície diferente das saídas existentes.

Bloqueios e pontos para o coordenador/proprietário antes do build:

- **D1 (bloqueia C7 e as linhas `result` da matriz):** o crit. 3 diz que
  instruções de arquivos de skill ficam fora "inclusive com opt-in", mas qualquer
  saída de shell/MCP pode imprimir um SKILL.md sem nomeá-lo. Sem regex universal
  (issue), as opções são: (a) recomendada — capturar `result` da matriz, omitir
  results de eventos cujo argumento referencia `SKILL.md` e declarar no guia que
  texto não reconhecível como vindo de skill não é distinguido; (b) não capturar
  nenhum `result` textual — cumpre o crit. 3 literalmente, mas esvazia "resultados"
  do AC1. Escolher (a) estreita a redação do crit. 3; precisa de confirmação.
- D-H (Hermes sem conteúdo) e o relatório v2 são decisões técnicas dentro da
  delegação, registradas acima; contestáveis antes do código.
- Limitações do `light`: um membro de conjunto pode ficar sem prova e um teste
  pode passar com implementação errada; nenhuma falha é injetada sistematicamente.
  Plataformas: só as executadas entram em `.checks/issue-5-privacidade.build.md`;
  WSL em cópia `/tmp` com identidade conferida; I4-C19 depende de Hermes local.

Lote de armazenamento (Claude, sem D1), fronteira traçada pelo coordenador e
não pela fatia: dentro de S4, antes do ingest.

- **Onde a fronteira caiu:** commits `48d4643` (Landing) e `0ab38fb` (código).
  Fechados: C2, C36, C37, C38, C41, C44, C45, C46, C49, C51, C52 (puro). Parciais
  na camada de armazenamento (`I5-Cns`): C30, C32, C42, C43, C47, C48, C50,
  C52b, C53, C54. Todo o resto pendente; detalhe em `.checks/issue-5-privacidade.build.md`.
- **Decidido no meio do build:** nada novo do proprietário; D1 continua aberta.
  O coordenador restringiu este lote ao storage/lifecycle, sem política,
  ingest, export, guia ou demo. Escolhas técnicas viraram linhas do Landing.
- **Abandonado:** reutilizar `install/io.mjs#writeExclusive` (modo 0666 e ACL do
  instalador; ver Landing). Nenhum stub de ingest/export: o próximo lote deve
  chamar `appendRecords` com a saída de `applyPolicy` e acrescentar as rotas.
