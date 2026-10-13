# Issue 3 — Diagnóstico local de agentes e cobertura observável

profile: light

Sources:

- [.tasks/issue-3-agent-diagnostics.md](../.tasks/issue-3-agent-diagnostics.md) - 18 critérios em 3 fatias, Out
  of scope, Decided (envelope JSON e CLI doctor) e execução proposta ao implementador.
- Issue #3 (referenciada na task, seis ACs remotos) - rastreada na tabela "Rastreio do aceite" da task; os ACs
  não trazem detalhe adicional além do já incorporado aos 18 critérios.
- [AGENTS.md](../AGENTS.md) atualizado - regras de teste orientado a comportamento, reúso e revisão aplicadas
  nesta fase.
- Referência de formato da skill `tlc-implement` (`references/checklist-format.md`, fora deste repositório,
  consultada pelo caminho local do executor) - **binding para o formato deste artefato**: seções, Coverage
  como join e fechamento de fronteira. Corrigido nesta rodada (ver `.checks/code-review/preflight-issue-3.md`):
  o caminho absoluto de máquina foi retirado desta entrega pública; o contrato de formato seguido não muda.
- [package.json](../package.json) e scripts atuais - `test:governance`/`test:code-review` existentes a preservar
  intactos (critério 18); nenhum script novo foi adicionado nesta fase.
- [.github/workflows/governance.yml](../.github/workflows/governance.yml) e
  [scripts/governance-ci.test.mjs](../scripts/governance-ci.test.mjs) - forma atual do pipeline (sem matriz de
  SO, sem `test:doctor`); `governance-C1 C3` trava essa forma byte a byte e precisará mudar junto da CI na
  implementação (fora desta fase, ver Handoff).
- Base `origin/main` 4242520, integrada em c43d4ca nesta branch - estado de referência para a comparação
  byte a byte dos cinco arquivos comuns de `scripts/code-review/` (critério 18); confirmado sem diff nesta
  data (ver C18).

## Out of scope

- Instalar, ativar, confiar ou executar hooks/plugins; iniciar agente ou chamada de modelo - issue #4.
- Sanitização/retenção/exclusão de traces reais - issue #5; aqui só se impede vazamento do que é lido.
- Correlacionar eventos, avaliar skills, coletor real, protocolo IPC - issues #6-#8.
- Nome global, monorepo, pnpm, publicação, dashboard, certificação de IDE/desktop/cloud - não fazem parte do
  diagnóstico local mínimo.
- Mudança de CI/package.json (matriz de SO, `test:doctor`) nesta fase - a tarefa recebida é "extrair checklist
  e escrever testes primeiro"; a integração à CI é trabalho da implementação (critério 18), registrada como
  pendência no Handoff, não decidida ou aplicada agora.

## Landing

Esta fase não cria `src/doctor/`; cada teste referencia o caminho onde o módulo deverá existir, e a ausência
desses arquivos é a prova do RED (critério de saída desta fase). `tests/doctor/helpers/` reúne fixtures
sintéticas reutilizáveis (PE mínimo, PATH por SO, configs TOML/YAML, servidor TCP loopback real) para que as
18 provas não dupliquem a mesma construção.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Envelope JSON `schemaVersion: 1` | chaves fixas `schemaVersion, status, environment, agents, collector, limitations, errors`; cada agente com `id, presence, version, versionSource, path, reasonCode, configuration, trust, configReasonCode, capabilities[]` | Um booleano global `supported` ou forma ad-hoc por renderer - quebra a paridade texto/JSON do critério 11 e a comparação de fatos do critério 15 |
| Vocabulário de `reasonCode` por campo | strings estáveis (`executable_not_found`, `version_unreadable`, `launcher_not_recognized`, `version_source_ambiguous`, código de SO para `unknown`, `input_too_large`, `unsafe_yaml_tag`, `config_malformed`, `hooks_disabled`, `policy_precedence_undetermined`, `endpoint_not_provided`, `invalid_endpoint`, `connection_refused`, `connection_timeout`) | Mensagem livre só para humano - não dá para um consumidor programático distinguir os estados exigidos pelos critérios 3, 8, 10, 12, 14 |
| Matriz de capacidades 5 mecanismos × 4 superfícies | `skill_usage_signal, tool_calls, results_and_errors, session_turn, subagents` × `cli_local, ide, desktop, cloud`, total 20 linhas por agente | Lista livre sem enumeração fechada - não permite provar "nada ficou de fora" (critério 7) |
| Descoberta de config por agente | **Corrigido na implementação (ver `.checks/issue-3-agent-diagnostics.build.md`, seções 1 e 6)**: não existe `hooks.yaml` genérico — essa era uma convenção inventada nesta fase. Real: Claude usa `settings.json` (JSON) em `<CLAUDE_CONFIG_DIR>` quando definida (substitui `~/.claude` inteiro, sem sufixo adicional) ou em `<HOME>/.claude/` quando não definida, mais `<cwd>/.claude/settings.json`, `.../settings.local.json` e `managed-settings.json` em caminho fixo do SO; Codex usa `hooks.json`/`[hooks]` em `config.toml` sob `<CODEX_HOME ou HOME>/.codex` e `<cwd>/.codex` — a *lista de handlers* é aditiva entre camadas, mas a própria `features.hooks` não é um OR aditivo de `false`: qualquer valor explícito dela em escopo de projeto (`true` OU `false`) depende de confiança de projeto não determinável por leitura e vira `unknown`, nunca `disabled`/`configured` por suposição; só a ausência da chave em projeto deixa a pergunta em aberto para o escopo de usuário, que resolve `false` como `disabled` de verdade; Hermes usa `config.yaml` (YAML) sob `<HERMES_HOME ou HOME>/.hermes` (POSIX) **ou `<HERMES_HOME ou LOCALAPPDATA>/hermes` no Windows** (`HERMES_HOME` aponta para o home exato, sem sufixo adicional) — a premissa inicial desta fase presumia, pela ausência de menção na documentação pública, que não havia override por `%LOCALAPPDATA%`; essa premissa foi corrigida por inspeção estática da instalação local (ver build, seção 6, achado 8), que confirmou o override como real no Windows —, com `hooks_auto_accept` como único consentimento nativo lido | Varrer catálogo arbitrário de plugins/skills - a própria task marca isso fora de escopo |
| Flags da CLI e exit codes | exatamente `--json, --cwd, --collector, --help`; exit `0` completo/parcial, `1` erro interno, `2` sintaxe/flag inválida; **corrigido na rodada de revisão**: um `--collector` fora da assinatura (não loopback literal, com credenciais/path/query) é erro de uso (exit `2`), não um diagnóstico "completo" com `collector.status: unknown/invalid_endpoint` e exit `0` como esta fase presumiu | Qualquer flag de reparo/instalação/coleta - a task proíbe modo de reparo nesta CLI |
| Dependência nova `smol-toml` (parser TOML de dados, sem execução de código) | Adicionada durante a implementação (não nesta fase de preparação) para o único consumidor real: ler `config.toml`/`hooks.json` do Codex sem interpretar nada executável; registrada em `package.json`/`package-lock.json` | Escrever um parser TOML próprio só para este uso mínimo, ou reaproveitar uma lib de schema mais pesada sem necessidade demonstrada |

- Nada mais nesta fase é difícil de reverter: nenhum arquivo de produto, CI ou npm foi criado ou alterado;
  todo o conteúdo novo é teste e fixture, descartável sem custo caso o formato mude na implementação.

### Landing da rodada formal 1 (achados de `review:run`, registrado antes do código)

Decisões tomadas para os sete achados bloqueantes da primeira revisão formal. Fontes primárias: instalações
locais desta máquina lidas apenas como texto (sem executar agente, importar Python, rodar hooks ou ler
transcripts) e as páginas oficiais já citadas na task. Nenhum critério da task muda.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Evidência de contrato por mecanismo (C5, achado 2) | `support` da CLI local é decidido nesta ordem: launcher ausente no PATH consultado → `unavailable/executable_not_found` (só `cli_local`; IDE/desktop/cloud continuam `unverified/surface_not_inspected`); presença `unknown` → `unverified/presence_undetermined`; versão `null` → `unverified/version_unresolved`; versão fora do perfil → `unverified/version_profile_incompatible`; depois, a **tabela de contrato instalada e ligada ao launcher**. Única tabela reconhecida nesta entrega: `VALID_HOOKS` (literal de conjunto de strings, atribuição única no nível do módulo; refinado na pré-revisão da rodada 2: só em código, fora de comentário/docstring/string, strings separadas por vírgula, nada depois do `}` e nenhuma outra ligação do nome em código) em `hermes_cli/plugins.py`, irmão do `hermes_cli/__init__.py` de onde a versão foi lida — mesma instalação, mesmo vínculo launcher→intérprete→site-packages. A doc local do Hermes declara: "Runtime event-name validity comes from `hermes_cli.plugins.VALID_HOOKS`" e o parser de shell hooks usa a mesma tabela como allow-list. Mapeamento mecanismo→eventos (catálogo de plugin hooks da doc do Hermes): `skill_usage_signal`→`on_skill_lifecycle`; `tool_calls`→`pre_tool_call`,`post_tool_call`; `results_and_errors`→`post_tool_call`; `session_turn`→`on_session_start`,`on_session_end`; `subagents`→`subagent_start`,`subagent_stop`. Todos listados → `verified/local_contract_lists_events` com `evidence.source: { kind: "hermes_valid_hooks", path }` e `evidence.events`; algum ausente → `unverified/contract_event_not_listed` com `evidence.missingEvents` (ausência na tabela não prova ausência de outro caminho de observação, então nunca vira `unavailable`); arquivo ausente/ilegível/acima de 1 MiB/mutado/forma não reconhecida → `unverified` com `contract_source_not_found`/`contract_source_unreadable`/`input_too_large`/`contract_changed_during_read`/`contract_source_unrecognized`. Claude (`claude.exe` nativo) e Codex (`codex.exe` nativo do pacote npm, sem schema textual) não oferecem artefato textual de contrato dentro do limite de 1 MiB nos layouts inspecionados → `unverified/no_static_contract_source`, lacuna explícita | `hasLocalVerifiedContract` constante; versão compatível tratada como contrato; tabela própria no produto, sidecar/manifest inventado ou campo do config do usuário como "prova" do contrato; varrer binários de centenas de MB atrás de strings |
| Origem da evidência por linha (C5/C16, achado 7) | `evidence.origin: real_environment \| fixture \| documented_contract \| not_inspected`. A CLI declara `real_environment` para `cli_local` (é o ambiente que ela leu, mesmo quando um teste o montou) e `not_inspected` para toda superfície não inspecionada; sem origem informada, o default é `not_inspected`, nunca `fixture`. `fixture` só aparece quando uma prova a passa explicitamente; `documented_contract` só na `exclusion` documentada | Default `fixture`, que fazia o relatório real afirmar 45 linhas de origem sintética |
| Resolução de launcher no Windows (C1-C3, achado 3) | Para cada diretório do PATH, em ordem, testa `<agente><ext>` para cada extensão de `PATHEXT` do ambiente (entradas validadas `^\.[A-Za-z0-9]{1,8}$`, minúsculas; default `.com;.exe;.bat;.cmd`), como o Windows resolve um comando sem extensão. O primeiro candidato existente vence; formato desconhecido (`codex.exe`, `claude.cmd`) fica `present/version null/launcher_not_recognized`, nunca `absent`; binário nativo (cabeçalho MZ/ELF/Mach-O) de Codex/Hermes não é lido como texto. Preferência do PowerShell por `.ps1` não é modelada (lacuna declarada) | Um único sufixo fixo por agente, que declarava ausência falsa ou pulava para outra instalação |
| Vínculo de shim npm (C2, achado 4) | Referência ancorada na base do próprio shim, como o `cmd-shim` do npm gera: `%dp0%`/`%~dp0` (`.cmd`) ou `$basedir` (sh), seguida de caminho relativo (refinado na pré-revisão da rodada 2: só como argumento do node na linha de invocação do template — `"%_prog%"  "%dp0%\…" %*` no `.cmd`, `exec … "$basedir/…" "$@"` no sh —, numa linha que começa um comando, no dialeto da extensão; menção por echo/here-document/string/continuação não é vínculo); resolve `.`/`..` a partir do diretório do launcher e exige `node_modules/@openai/codex` no caminho resolvido. Cobre o global Windows (`%dp0%\node_modules\@openai\codex\bin\codex.js`) e o local (`node_modules\.bin\codex.cmd` → `%dp0%\..\@openai\codex\bin\codex.js`), além do symlink POSIX via `realpath`. Mais de um pacote distinto referenciado → `version_source_ambiguous` | Casar o texto `node_modules\@openai\codex` em qualquer lugar e remontá-lo a partir do diretório do launcher (ignorava `..` e o prefixo real) |
| Vínculo Hermes ↔ intérprete (C2/C3, achado 5) | No layout POSIX, o `pythonX.Y` do shebang do launcher (direto ou via `env`) escolhe `lib/pythonX.Y/site-packages`; sem versão no shebang, um único candidato com `hermes_cli` é usado e dois ou mais viram `version_source_ambiguous`; versão do shebang sem pacote correspondente → `launcher_not_recognized`, nunca a fonte de outro intérprete. Launcher compilado desconhecido continua inconclusivo (C3) | Primeiro diretório em ordem lexical |
| Forma nativa dos hooks por agente (C8/C12, achado 6) | `configuration: invalid/hooks_structure_invalid` quando a seção `hooks` existe, não é nula e não segue a forma nativa: Claude (`settings.json`) e Codex (`hooks.json`/`config.toml`) — objeto evento → lista de grupos `{ matcher?: string, hooks: [handler-objeto] }`, com `type` string obrigatório só no Claude (doc do Claude o declara obrigatório; a do Codex não declara); a chave `state` sob `[hooks]` do Codex (registro de revisão escrito pelo próprio Codex, observado em `config.toml` local — só cabeçalhos lidos) é reservada e não contada como evento. Hermes (`config.yaml`) — mapeamento evento → `null` ou lista de mapeamentos com `command` string não vazia, como `_parse_hooks_block`/`_parse_single_entry` exigem; `output_spill`/`outbound` são subseções reservadas. Comandos nunca são validados nem executados; nomes de evento não são conferidos. Seção vazia válida continua `not_configured` e a regra `configured` (≥1 evento) não muda. **Refinado na pré-revisão da forma nativa (rodada 2, registrado antes do código)**: `configured` passa a exigir ≥1 handler com alvo. Claude (doc "Hook handler fields"): `type` obrigatório; `command`→`command`, `http`→`url`, `mcp_tool`→`server`+`tool`, `prompt`/`agent`→`prompt`, strings; ausente ou de outro tipo → `invalid/hooks_structure_invalid`. Codex (fonte `openai/codex` na tag `rust-v0.162.1`, a versão instalada: `config/src/hook_config.rs`, `hooks/src/engine/discovery.rs`): `type` também obrigatório (enum com etiqueta `type`); `command`→`command` string obrigatório e `command_windows`\|`commandWindows` string opcional (as duas grafias juntas → inválido); `mcp_tool`→`server`+`tool`; `prompt`/`agent` são lidos e pulados pelo Codex (nunca contam); `hooks` do grupo continua exigido (o código o aceitaria ausente, sem registrar nada). Alvo vazio ou só espaços não conta (no Codex, o efetivo da plataforma: `command_windows`, se houver, no Windows). `type` fora desses → `unknown/hooks_handler_type_unrecognized`, nunca `configured`/`trusted`. `managed_dir`/`windows_managed_dir` sob `[hooks]` do Codex são reservados (string; outro tipo → inválido): não são eventos, o diretório não é aberto nem listado e não gera configuração nem confiança — o Codex só os usa como caminho dos hooks gerenciados de `requirements.toml` e não carrega definições dele. Evento sem handler (`PreToolUse: []`, grupo sem handlers, `null` no Hermes) continua válido, mas não conta mais | Schema comum inventado para os três; aceitar qualquer `typeof object`; validar a linguagem do comando, a URL ou o prompt; abrir `managed_dir`; reproduzir o schema inteiro de settings; tipo futuro como inválido ou como `configured` |
| Caminhos por plataforma explícita (C8/C16, achado 1) | `config-sources.mjs` monta caminhos com `path.win32` quando `platform === "win32"` e `path.posix` nos demais, nunca com o `path` nativo do executor; em produção isso coincide com o nativo, e as provas com `platform` simulado ficam determinísticas nos três runners | Ajustar o valor esperado ao separador do executor ou pular o teste fora do Windows |

### Landing da pré-revisão formal da rodada 3 — grupo vazio, nomes de evento e campos opcionais tipados dos hooks (achado 6/C8, registrado antes do código)

Três lacunas apontadas pelo orquestrador na forma nativa de `hooks-shape.mjs` (seção 11 do build), com fontes
primárias novas consultadas nesta data: `codex-rs/config/src/hook_config.rs` e
`codex-rs/hooks/src/engine/discovery.rs` (e `events/session_end.rs`) na tag `rust-v0.162.1` já usada nas
rodadas anteriores (API pública do GitHub, só texto); [Codex Hooks](https://learn.chatgpt.com/docs/hooks) e
[Claude Hooks](https://code.claude.com/docs/en/hooks) (consultadas nesta data). Nenhum critério da task muda;
nenhum agente é executado, instalado ou importado.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Grupo sem `hooks` no Codex (achado 1) | **Corrige a decisão 6 da seção 11 do build** (registrada como "mais estrito que a fonte", que invertia a fonte de verdade): `MatcherGroup { matcher: Option<String>, #[serde(default)] hooks: Vec<HookHandlerConfig> }` em `hook_config.rs` não tem `deny_unknown_fields`, então um grupo sem a chave `hooks` deserializa como `hooks: []` (válido, zero handlers) e qualquer chave estranha ao lado (ex.: `{ command = "x" }`) é ignorada pelo serde, não rejeitada. `matcherGroupHandlers` passa a aceitar `group.hooks === undefined` como grupo vazio **só para o Codex**; Claude preserva a exigência atual (`hooks` ausente continua `invalid`), pois a doc do Claude não declara um default equivalente para esse campo e não há código acessível que confirme um. `configured` continua exigindo ≥1 handler com alvo (decisão 2 da seção 11): um grupo vazio nunca basta sozinho | Replicar a mesma permissividade no Claude sem fonte que a confirme; manter a forma mais estrita no Codex "para nunca levar a configured" quando a própria fonte mostra que não é inválida |
| Nomes de evento não validados (achado 2) | Cada chave de `hooks` é conferida contra o conjunto nativo de eventos do agente antes de inspecionar o valor: Codex usa os 12 campos renomeados de `HookEventsToml` (`PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, SessionStart, SessionEnd, UserPromptSubmit, SubagentStart, SubagentStop, Stop, Interrupt` — idêntico à doc pública); Claude usa os 33 nomes da seção "Hook Events" da doc (lifecycle completo, de `SessionStart`/`Setup` a `SessionEnd`). Chave fora desse conjunto (e fora das chaves reservadas já existentes) nunca tem seu valor inspecionado — o Codex real também não inspeciona, pois `HookEventsToml`/`HooksToml` não têm `deny_unknown_fields` e não há campo coletor — e o grupo some: `unknown/hooks_event_name_unrecognized`, nunca `configured` só porque o handler dentro tem alvo. Restrição por evento confirmada em código: `mcp_tool` sob `SessionEnd` no Codex é lido e pulado com aviso (`discovery.rs`, antes mesmo de validar `server`/`tool` vazios) — mesmo tratamento que `prompt`/`agent`, então classifica `untargeted` (não inválido, não desconhecido: a fonte mostra exatamente o que acontece). Restrição só documentada (sem código acessível): Claude só suporta `command`/`mcp_tool` em `SessionStart` ("Only `type: "command"` and `type: "mcp_tool"` hooks are supported"); como a doc não diz se um `http`/`prompt`/`agent` ali é ignorado, rejeitado ou simplesmente nunca invocado, um handler desse tipo sob `SessionStart` vira `unknown/hooks_handler_type_unsupported_for_event` (nunca `configured`), só depois de confirmar que o handler já seria válido fora dessa restrição (um handler malformado continua `invalid`, a restrição de evento não mascara um campo obrigatório ausente) | Tratar evento desconhecido como silenciosamente ignorado sem reasonCode (esconderia do usuário uma seção aparentemente válida que não registra nada); inventar `invalid` para uma chave que o Codex de fato apenas ignora; aplicar a mesma restrição de `SessionStart` como `invalid` no Claude sem fonte do efeito real; usar a tabela de mecanismo→evento de `contract-evidence.mjs`/C5 como prova desta validação de schema — são evidências distintas (schema de config local vs. contrato de capacidade) |
| Campos opcionais tipados do Codex (achado 3) | Validados só os campos que `hook_config.rs` tipa e que o Codex 0.162.1 realmente lê: `Command` → `timeout` (renomeado de `timeout_sec: Option<u64>` → inteiro não negativo), `async` (`r#async: bool` → booleano), `statusMessage` (`status_message: Option<String>` → string), `additionalContextLimit` (`Option<usize>` → inteiro não negativo); `McpTool` → `timeout`, `statusMessage` (mesmos tipos) e `input` (`serde_json::Map` → objeto simples, sem reproduzir a checagem extra de representabilidade TOML do deserializer customizado). `null`/ausência contam como `None` (como já ocorre para `command_windows`). Um valor presente de tipo errado em qualquer um desses campos vira `invalid/hooks_structure_invalid` — não um estado novo —, porque é exatamente o que acontece na fonte: sem `deny_unknown_fields` mas com tipo exato por campo, o serde falha a deserializar a struct inteira do handler, o que falha o documento TOML/JSON inteiro (o Codex não carrega nada dele), nunca "esse handler específico" isolado. `Prompt {}`/`Agent {}` não têm campo nenhum na fonte, então não são afetados por este achado. Caso concreto do achado: `{type:"command", command:"echo ok", timeout:{bad:true}}` deixa de ser `configured` e passa a `invalid`. Fora desta validação, por decisão (não por omissão não registrada): comandos/URLs/prompts continuam nunca inspecionados; o Claude fica fora (sem código acessível, a doc não declara o efeito de um tipo errado em `timeout`/`once`/`statusMessage`) | Reproduzir o schema inteiro de settings (todo campo opcional de toda doc); validar o conteúdo de `input`/comando/URL; tratar o tipo errado como `unknown` quando a fonte já confirma que é `invalid` (documento inteiro descartado); estender a mesma validação ao Claude sem fonte de código |

Precedência entre os três eixos (handler malformado, evento não reconhecido, tipo não reconhecido,
restrição por evento): `invalid` (campo obrigatório ausente/tipo errado, em qualquer handler de um evento
reconhecido) decide antes de qualquer forma de "não sei"; entre as formas de "não sei", evento não
reconhecido decide antes de tipo de handler não reconhecido, que decide antes de restrição por evento — a
ordem não muda nenhum resultado hoje coberto por teste (cada caso de prova isola um eixo), só documenta o
desempate para um caso futuro que combine mais de um.

### Landing da rodada de fixes pós-Verifier independente rodada 3 (G1-G4), registrado antes do código

O Verifier independente (`.checks/issue-3-agent-diagnostics.verified.md`, rodada 3, gate FAIL no produto
`46e7c93`) confirmou quatro classes de defeito e seu alcance real (C2/C3/C5/C8/C12), detalhadas no
encaminhamento `.checks/code-review/verifier-round3-fixes.md`. Nenhum critério da task muda; `.verified.md`
não é editado por este autor.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| `async`/`input` do Codex não são `Option<T>` (G1) | **Corrige a linha "Campos opcionais tipados do Codex" acima**, que tratava os quatro campos (`timeout`, `async`, `statusMessage`, `additionalContextLimit`/`input`) como se todos fossem `Option<T>` com `null` válido. `hook_config.rs` (rust-v0.162.1) tipa `async` como `r#async: bool` e `input` (McpTool) como `serde_json::Map`, ambos com `#[serde(default)]` mas SEM `Option` — só a ausência da chave usa o default; um `null` presente falha a deserialização do campo como qualquer outro tipo errado, invalidando o documento inteiro. `timeout`/`statusMessage`/`additionalContextLimit` continuam `Option<T>` de verdade: `null` presente continua válido ali. `isValidDefaultedField` (`hooks-shape.mjs`) decide os dois campos não-Option; `isValidOptionalField` continua para os três Option | Tratar os quatro campos com a mesma regra de "null é None"; inventar um quinto estado em vez de reconhecer que o documento inteiro falha, como qualquer outro tipo errado já tratado |
| `matcher` do Codex é `Option<String>` (G2) | `MatcherGroup.matcher` (`hook_config.rs:154-159`) é `Option<String>` com default: `null` é o `None` válido, distinto de um matcher de outro tipo (número, objeto), que continua `invalid`. `matcherGroupHandlers` ganha `matcherAllowsNull`, `true` só para o Codex — o Claude não tem fonte equivalente confirmada (nem doc nem código acessível) e preserva a exigência atual (`null` continua `invalid` lá) | Propagar a mesma permissividade ao Claude sem fonte; tratar `matcher:null` como forma inválida no Codex quando a própria fonte confirma `Option<String>` |
| Evento Hermes fora do `VALID_HOOKS` instalado não é hook configurado (G3) | A validação estrutural de `hooks-shape.mjs` (mapeamento → lista de `{command}`) permanece — ela decide forma, não catálogo. Quando o pacote ligado ao launcher tem um `plugins.py` com `VALID_HOOKS` lido e reconhecido (`contract-evidence.mjs`, evidência já usada para C5), `config-reader.mjs` cruza os nomes de evento com handler (`hermesTargetedEvents`, projeção segura de só as chaves) contra esse catálogo: se NENHUM evento configurado está na tabela real, `configuration` vira `not_configured/hooks_event_not_in_installed_catalog` em vez de `configured` — o Hermes real (`_parse_hooks_block`) ignora silenciosamente esses nomes, então nenhum hook seria de fato registrado. Sem catálogo lido e linkado (presença ausente, versão fora do perfil, `plugins.py` ilegível/ausente/forma não reconhecida), o resultado estrutural de sempre é preservado — não inventa uma afirmação nova sem a fonte; é o mesmo caso já provado em `hooks_auto_accept` (`configuration-trust.cli.test.mjs`), sem nenhuma instalação real montada | Misturar catálogo e forma estrutural no mesmo validador puro e sem fs (quebraria `hooks-shape.mjs`/`config-projection.mjs` como funções síncronas usadas por dezenas de testes de forma); inventar "unknown sem catálogo" para um caso que já tinha prova aprovada em sentido contrário; usar a lista de 7 nomes mapeados por mecanismo (`HERMES_EVENTS_BY_MECHANISM`, um recorte do doctor) como o catálogo de validade — teria rejeitado eventos reais não mapeados por mecanismo nenhum |
| Shebang do Hermes com intérprete de outro prefixo (G4) | `resolveHermesVersion` (`launcher-link/hermes.mjs`) só extraía a versão X.Y do shebang e presumia que o pacote estava no MESMO prefixo do launcher. Um shebang com caminho absoluto reconhecido (`.../pythonX.Y`, não um nome bare resolvido via `env`) agora define o prefixo de busca do site-packages a partir do PRÓPRIO caminho do intérprete, não do launcher; sem esse caminho absoluto (bare, `env`, não-Python), preserva o prefixo do launcher como sempre. Sem pacote correspondente no prefixo do intérprete → `launcher_not_recognized` (inconclusivo), nunca a fonte do prefixo do launcher | Presumir o mesmo prefixo do launcher sempre; "corrigir" caindo de volta ao pacote do launcher quando o do intérprete não é encontrado (publicaria de novo a fonte errada) |

### Landing da correção residual G3/G4, registrado antes do código

Encaminhamento do orquestrador após a primeira correção (commit `637abc9`), não uma nova rodada
independente: `.checks/code-review/verifier3-fix-residuals.md`. Mesmas quatro classes da rodada 3
(`.checks/code-review/verifier-round3-fixes.md`); só o ALCANCE real de G3 e G4 estava incompleto. Nenhum
critério da task muda; `.verified.md` não é editado por este autor.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Sem catálogo Hermes vinculado, `configured` estrutural vira `unknown` (G3, variante residual) | **Corrige a linha "Evento Hermes fora do `VALID_HOOKS` instalado..." acima**, cuja alternativa rejeitada ("inventar 'unknown sem catálogo'...") estava invertida: preservar `configured` sem fonte vinculada afirma um registro que ninguém comprovou, e o encaminhamento ORIGINAL da rodada 3 já exigia "motivo inconclusivo" nesse caso — não havia prova aprovada em sentido contrário que justificasse a exceção, só um teste (`hooks_auto_accept`) escrito sem nenhuma instalação real. Tests são prova de comportamento, não decisão vinculante quando contradizem o critério/fonte; a aprovação humana foi do escopo (fechar G3/G4), não dessas expectativas antigas. Agora, quando a configuração estrutural decide `configured` para o Hermes E `hermesValidHooks` é `null` (catálogo ausente/ilegível/não reconhecido/perfil fora do exame), `config-reader.mjs` rebaixa para `unknown/hooks_catalog_unavailable` ANTES de `resolveTrust` — `not_configured` (sem handler) e `invalid` (erro nativo de forma) não passam por este ramo, pois só se aplica depois que a forma já decidiu `configured`. O teste `hooks_auto_accept` foi corrigido para instalar um Hermes real com catálogo (`installAllAgents`+`hermesPluginsSource`), isolando o que ele de fato prova (a origem de confiança), não mais dependendo da ausência de catálogo | Preservar a exceção por haver um teste aprovado em sentido contrário (o teste não é a fonte; a fonte é o comportamento real do Hermes); inventar um quinto estado em vez de `unknown`, que já existe no vocabulário |
| Vínculo do intérprete Python do shebang cobre `python`/`python3` bare, e "absoluto" exige separador inicial de verdade (G4, variante residual) | **Corrige a linha "Shebang do Hermes com intérprete de outro prefixo" acima**, que só reconhecia `.../pythonX.Y` como caminho absoluto de intérprete. `referencesHermesCli` já reconhece `python`/`python3` sem X.Y como intérprete Python válido (mesma família `PYTHON_INTERPRETER_NAME`); `shebangPythonInterpreterPath` precisa da MESMA família, não só da variante versionada — do contrário, um shebang absoluto bare (`#!/outro/prefixo/bin/python`) cai de volta ao prefixo do launcher por omissão, publicando a fonte errada (exatamente o defeito que G4 original queria fechar). A checagem de "caminho absoluto" também era frouxa (`/[\\/]/.test(...)`, qualquer string com barra): um intérprete relativo (`venv/bin/python3.12`) era tratado como se definisse um prefixo próprio, inventando um prefixo de outro processo que não existe. `isAbsolutePathGeneric` (`path-helpers.mjs`, novo, POSIX `/...` ou Windows `C:\...`/UNC) substitui essa checagem; sem X.Y no caminho absoluto bare, a versão específica continua indeterminada pelo shebang — `findSitePackagesInitFile` decide por varredura do prefixo já resolvido (achado real: um único candidato ou `version_source_ambiguous`/`launcher_not_recognized`), nunca a fonte do launcher | Tratar só `pythonX.Y` absoluto como reconhecido, deixando bare absoluto cair no launcher por omissão; aceitar qualquer string com barra como "caminho absoluto" |

### Landing da correção residual G3, variante shell (rodada 4), registrado antes do código

Encaminhamento do orquestrador após a quarta verificação independente (gate FAIL 17/18, só C8):
`.checks/code-review/verifier4-g3-shell-fix.md`, referenciando `.checks/issue-3-agent-diagnostics.verified.md`.
Mesma classe G3 de configuração Hermes; nenhum critério da task muda; `.verified.md` não é editado por este
autor.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Pertencer a `VALID_HOOKS` não implica shell hook aceito: `SHELL_UNSUPPORTED_HOOKS` é checada antes, só na confirmação de configuração shell (G3, variante shell) | O Verifier provou com a fonte real (`hermes_cli/plugins.py:208`, `agent/shell_hooks.py:220`-223) que `transform_api_error_classification` pertence a `VALID_HOOKS` (contrato geral de plugin hooks, sustenta `verified` em C5/mechanisms) E a `SHELL_UNSUPPORTED_HOOKS` (recusado pelo parser de shell hooks ANTES de checar `VALID_HOOKS`) — duas superfícies do mesmo agente, nunca a mesma pergunta. `config-reader.mjs` cruzava só contra `VALID_HOOKS`, afirmando `configured` para um shell hook que a instalação real ignora. `contract-evidence.mjs` ganhou `extractHermesShellUnsupportedHooks`, reaproveitando o MESMO extrator léxico de conjunto (`extractTopLevelStringSet`, generalizado por nome) e a MESMA leitura de texto já feita para `VALID_HOOKS` — nenhum parser novo, nenhuma leitura extra, nenhum catálogo de produto inventado. `readAgentConfiguration` só aplica a exclusão depois que ao menos um evento já bate com `VALID_HOOKS` (preserva `hooks_event_not_in_installed_catalog` quando nenhum bate): todos os eventos catalogados sendo também shell-unsupported vira `not_configured/hooks_event_shell_unsupported`; um evento shell aceito ao lado preserva `configured`; tabela de exclusão ausente/ilegível/não reconhecida vira `unknown/hooks_shell_exclusion_unavailable`, nunca presume conjunto vazio. `mechanisms`/`validHooks` (C5) nunca são tocados por este ramo — a exclusão só altera a decisão de `configuration` do Hermes. Fixture positiva (`hermesPluginsSource`) corrigida para listar `transform_api_error_classification` também em `VALID_HOOKS` (já estava em `SHELL_UNSUPPORTED_HOOKS`), reproduzindo a mesma forma do arquivo real — a fixture anterior escondia justamente o caso que a fonte real reproduz | Misturar a exclusão de shell na matriz de capacidades/`mechanisms` (confundiria C5, que mede o contrato de PLUGIN hooks, com a decisão de shell hooks de `config.yaml`); presumir conjunto vazio de exclusões quando a tabela não é reconhecida (afirmaria "nenhuma exclusão" sem prova); escrever um segundo parser de conjunto Python só para esta tabela (o extrator já existente é genérico por nome) |

### Landing da correção dos três achados bloqueantes da segunda revisão formal, registrado antes do código

Segunda revisão formal (`.checks/code-review/issue-3/response.json`, HEAD `fd4258f`, `changes_requested`):
`.checks/code-review/formal2-codex-fixes.md`. Três classes de defeito, todas C8/C12 (configuração anunciada
como `configured`/`complete` quando o Codex real rejeitaria ou já teria desligado hooks). Autor: Claude.
Nenhum critério da task muda; `.verified.md` não é editado por este autor.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| `codex_hooks` é alias depreciado da MESMA feature que `features.hooks`; a canônica decide quando coexistem | `legacy.rs`/`lib.rs` (rust-v0.162.1): `Alias { legacy_key: "codex_hooks", feature: Feature::CodexHooks }`, `Feature::CodexHooks.key() == "hooks"`. As duas chaves achatam num único `BTreeMap<String, bool>` (`FeaturesToml::entries`/`apply_map`); a iteração alfabética aplica "codex_hooks" antes de "hooks", e a canônica, por último, sobrescreve a legada — nunca um OR de "false". `extractSafeFields` (`config-projection.mjs`) agora lê `parsed.features.codex_hooks` como fallback só quando `parsed.features.hooks` não é booleano; a restrição de confiança de projeto em `config-reader.mjs` já operava sobre o campo final (`featuresHooksEnabled`), então passou a cobrir o alias sem alteração própria | Tratar as duas chaves como um OR aditivo de "false" (inventaria uma semântica que a fonte não tem); dar à legada a mesma prioridade da canônica quando ambas presentes (inverteria a ordem real de sobrescrita do BTreeMap) |
| `input` do `mcp_tool` rejeita `null` em QUALQUER profundidade de objeto/array, não só no container externo | `deserialize_mcp_tool_input` (`hook_config.rs`) roda `toml::Value::try_from` sobre o mapa inteiro; TOML não tem `null`. `hooks_tests.rs::hooks_file_rejects_mcp_tool_handler_with_null_input` prova objeto raso (`{"optional": null}`), aninhado em objeto (`{"metadata": {"optional": null}}`) e aninhado em array (`{"values": [null]}`), as três rejeitadas. `hooks-shape.mjs` ganhou `hasNullDeep` (pilha explícita, sem recursão de chamada, para não depender da profundidade de um `input` arbitrário dentro do limite de 1 MiB já aplicado à leitura) e `isTomlRepresentableMcpInput`, substituindo o `isPlainObject` raso usado antes em `isValidDefaultedField(handler, "input", ...)` | Reproduzir um parser de representabilidade TOML completo (escopo maior que o achado, dependência nova); limitar a checagem a um nível fixo de profundidade (não cobriria o terceiro caso do teste nativo) |
| Envelope de `hooks.json` (`HooksFile`): raiz com `deny_unknown_fields`, `description: Option<String>`, `hooks: HookEventsToml` (default só na ausência da chave) | `hook_config.rs`: `#[serde(deny_unknown_fields)] struct HooksFile { description: Option<String>, hooks: HookEventsToml }`. `hooks_tests.rs::hooks_file_rejects_events_outside_hooks_object` prova raiz com campo desconhecido rejeitada. `config-projection.mjs` ganhou `hooksFileEnvelopeReasonCode`, aplicada só quando `agentId === "codex" && format === "json"` (hooks.json; nunca `config.toml`, que tem raiz própria, nem Claude/Hermes, que têm schemas de raiz distintos): raiz fora de objeto, campo desconhecido, `description` de outro tipo que não string/null, ou `hooks` explicitamente `null` (campo não-`Option`) viram `invalid/hooks_file_envelope_invalid`. Um `hooks` presente de outro tipo (array/string/número) continua decidido por `inspectNativeHooks` como antes (`hooks_structure_invalid`), sem duplicar a checagem | Aplicar a mesma whitelist de raiz a `config.toml` ou a outros agentes (misturaria schemas de raiz distintos); tratar `hooks: null` como ausência (contradiria `HookEventsToml` não ser `Option`) |

Regressões RED contra `fd4258f` (produto no estado anterior a esta correção, testes desta rodada já
presentes), saída completa em `.checks/code-review/formal2-codex-fixes-red.txt`:

```
node --test tests/doctor/config-projection.unit.test.mjs tests/doctor/configuration-trust.cli.test.mjs
  -> tests 79, pass 68, fail 11
EXIT_CODE=1
```

As 11 falhas são exatamente os casos novos desta rodada que discriminam os três achados (6 na própria camada
de `config-projection.unit.test.mjs`, 5 na fronteira real da CLI em `configuration-trust.cli.test.mjs`);
os demais 68 casos (antigos e os novos que já valiam sem a correção, ex.: dados válidos preservados)
continuavam verdes. GREEN dos mesmos alvos mais `config-reader`/`scope-merge`/`trust-resolution` (113/113,
`.checks/code-review/formal2-codex-fixes-green-targets.txt`), `test:doctor` completo isolado (271 testes,
270 pass, 1 skip condicional ao executor — o mesmo já registrado desde a rodada 3 —,
`.checks/code-review/formal2-codex-fixes-doctor.txt`) e `npm test` completo uma única execução após as
alterações finais (`test:governance` 6/6, `test:code-review` 10/10, `test:doctor` 271 testes/270 pass/1
skip, `.checks/code-review/formal2-codex-fixes-npm-test.txt`). Delta de `test:doctor` contra a rodada 4
verificada (252 → 271): 19 testes novos (11 em `config-projection.unit.test.mjs`, 8 em
`configuration-trust.cli.test.mjs`). Paridade do motor comum reconfirmada nesta data sem diff: `git diff
--exit-code 4242520 -- scripts/code-review/{cli.mjs,review.mjs,review.test.mjs,schema.json,README.md}`.

## Checks

### S1 - Saber quais agentes foram encontrados sem iniciar os agentes · 6 arquivos · ~26 KB · ~7k

**C1** - PATH vazio e nenhum local reconhecido retorna exatamente três entradas (claude, codex, hermes),
cada uma `presence: absent`, `version: null`, motivo `executable_not_found`, texto informando "não
encontrado" para cada uma, exit `0`.
Proof: `node --test --test-name-pattern="presence-C1" tests/doctor/presence.cli.test.mjs`

**C2** - Fixtures reconhecidas resolvem a primeira entrada válida do PATH, vinculando caminho e versão ao
artefato encontrado (Claude via `binary_metadata`, Codex via `package_metadata`, Hermes via
`source_literal`); caminhos com espaço/Unicode não alteram a resolução; as três convenções de SO
(Windows/Linux/macOS) resolvem da mesma forma. **Corrigido na implementação**: os shims de Codex/Hermes
precisam referenciar de verdade o pacote/fonte (symlink+realpath ou caminho relativo embutido no shim para
Codex; layout padrão de venv/site-packages para Hermes) — um launcher "stub" sem esse vínculo não basta
(ver C3 abaixo e `.checks/issue-3-agent-diagnostics.build.md`).
**Corrigido na rodada formal 1 (achados 3, 4 e 5)**: no Windows a resolução testa cada extensão de
`PATHEXT` por diretório do PATH (o primeiro candidato existente vence, mesmo de formato não
reconhecido); o shim npm é ligado ao pacote pela linha de invocação do template do cmd-shim
(`%dp0%` no `.cmd`, `$basedir` no sh), numa linha que começa um comando, com `..` resolvido (cobre
`node_modules\.bin\codex.cmd` local) — refinado na pré-revisão da rodada 2, ver
`.checks/issue-3-agent-diagnostics.build.md` seção 10; no Hermes POSIX o `pythonX.Y` do
shebang escolhe o `site-packages`. As fixtures usam os templates reais do cmd-shim desta máquina e o
symlink do npm no POSIX — o shim `require("./node_modules/...")` anterior era fictício.
Proof: `node --test --test-name-pattern="presence-C2" tests/doctor/presence.cli.test.mjs`
Proof: `node --test --test-name-pattern="agent-resolution-C2" tests/doctor/agent-resolution.unit.test.mjs`

**C3** - Versão ilegível, launcher não reconhecido e fonte ambígua mantêm `presence: present`,
`version: null` com motivo específico; permissão negada vira `presence: unknown` preservando o código do
SO, sem interromper o diagnóstico dos demais agentes. Inclui regressão de launcher alheio com
package.json/hermes_cli vizinho mas não referenciado, que continua `launcher_not_recognized`.
Proof: `node --test --test-name-pattern="presence-C3" tests/doctor/presence.cli.test.mjs`
**Corrigido na rodada formal 1 (achados 3 e 5)**: `codex.exe`/`claude.cmd` (ou launcher POSIX de
formato desconhecido) no primeiro diretório do PATH ficam `present/version null/launcher_not_recognized`,
nunca `absent` nem com a versão de uma instalação posterior; executável nativo é lido só pelo
cabeçalho (nunca `input_too_large`); Hermes com dois `pythonX.Y` e shebang sem versão fica
`version_source_ambiguous`, e versão do shebang sem pacote correspondente fica `launcher_not_recognized`.
Proof (camada de permissão, simulação cross-SO declarada abaixo, e regressão de launcher alheio):
`node --test --test-name-pattern="agent-resolution-C3" tests/doctor/agent-resolution.unit.test.mjs`
Proof (cabeçalho de executável nativo): `node --test --test-name-pattern="agent-resolution-C14" tests/doctor/agent-resolution.unit.test.mjs`
**Corrigido na revisão formal3 (achado 1)**: `package.json` com JSON válido `null` (ou outro
primitivo/array) no lugar do objeto de metadado fazia `parsed.name` lançar `TypeError`, escapando
para `presence: unknown/unknown_error` mesmo com o artefato encontrado e lido com sucesso — agora cai
na mesma resposta de "não reconhecido" (`present/version null/launcher_not_recognized`) que um `name`
divergente já usava. Ver `.checks/issue-3-agent-diagnostics.build.md` seção 18.
Proof: `node --test --test-name-pattern="agent-resolution-formal3-1" tests/doctor/agent-resolution.unit.test.mjs`

**C4** - Uma fixture com efeitos colaterais simulados não aciona nenhum launcher; inventário de
arquivos/tamanho/mtime antes e depois não muda; nenhuma chamada a `child_process` ocorre na resolução.
Proof: `node --test --test-name-pattern="presence-C4" tests/doctor/presence.cli.test.mjs`
Proof: `node --test --test-name-pattern="agent-resolution-C4" tests/doctor/agent-resolution.unit.test.mjs`

Limitação declarada (C3): simular permissão negada de forma real e portátil entre Windows/Linux/macOS não é
determinístico (chmod não bloqueia o dono no Windows; containers de CI rodam como root). A prova de
`presence: unknown` por permissão é feita na própria camada de resolução, com um adaptador de filesystem
injetado que lança `EACCES`, conforme AGENTS.md ("separe decisões puras de efeitos externos... teste a regra
diretamente"). A fronteira de CLI permanece provada para os demais estados do critério 3.

### S2 - Entender o que pode ser observado e o que permanece incerto · 8 arquivos · ~25 KB · ~6k

**C5** - Cada mecanismo/capacidade tem `support`, `reasonCode` e evidência; `verified` exige evidência local
vinculada à versão identificada; versão sem perfil compatível ou documentação sem vínculo de versão não
chegam a `verified`; fixture validada nunca é marcada como prova do ambiente real.
**Corrigido na rodada formal 1 (achado 2)**: `hasLocalVerifiedContract` constante foi removido. A CLI
lê a tabela de contrato da própria instalação (Hermes: `VALID_HOOKS` em `hermes_cli/plugins.py` do
mesmo pacote da versão, só como texto, até 1 MiB) e decide por mecanismo: `verified/local_contract_lists_events`
com `evidence.source`/`evidence.events`; launcher ausente → `unavailable/executable_not_found` só na CLI
local; versão/fonte inconclusiva → `unverified` com motivo específico. Claude e Codex ficam
`unverified/no_static_contract_source` (sem artefato textual nos layouts inspecionados). Ver Landing da
rodada formal 1.
Proof: `node --test --test-name-pattern="capability-matrix-C5" tests/doctor/capability-matrix.unit.test.mjs`
Proof (leitura da tabela instalada, estados inconclusivos): `node --test tests/doctor/contract-evidence.unit.test.mjs`
Proof (fronteira real da CLI — verified com fonte, evento ausente, versão sem perfil, launcher ausente):
`node --test --test-name-pattern="capability-evidence-C5" tests/doctor/capability-evidence.cli.test.mjs`

**C6** - `support`, `configuration` e `runtimeVerification` são representados separadamente; configuração
existente nunca produz `runtimeVerification: verified`; nesta entrega `runtimeVerification` é sempre
`not_performed`.
Proof: `node --test --test-name-pattern="capability-matrix-C6" tests/doctor/capability-matrix.unit.test.mjs`

**C7** - A matriz cobre os cinco mecanismos (sinais de skill, ferramentas, resultados/erros, sessão/turno,
subagentes) nas quatro superfícies (CLI local, IDE, desktop, cloud); encontrar a CLI local não verifica outra
superfície (`unverified/surface_not_inspected`, nunca `unavailable`); Codex nunca anuncia `SkillStart` nativo
como `verified`. **Corrigido na correção do Verifier (G2)**: esta fase havia equiparado erroneamente hosted
tools do Codex a `unavailable` — equivalência que não vem da task e que o código nunca produziu (a frase
desta linha estava desatualizada frente ao comportamento real, sempre `unverified`). A entrega real comunica
a exclusão de hosted tools dos hooks locais (fonte: "Hooks" em https://learn.chatgpt.com/docs/hooks, seção
"Tool coverage" - hosted tools como busca web/WebSearch não têm cobertura de hook local documentada) como um
fato separado (`exclusion: { reasonCode: "hosted_tools_outside_local_hooks", origin: "documented_contract" }`)
na própria linha `tool_calls`/`cli_local`, sem sobrescrever o `support`/`reasonCode` genérico dessa linha nem
equipará-la à superfície `cloud` inteira não inspecionada (`surface_not_inspected`) - os dois motivos nunca se
confundem e nenhum dos dois é `unavailable`.
Proof: `node --test --test-name-pattern="capability-matrix-C7" tests/doctor/capability-matrix.unit.test.mjs`
Proof (fronteira real da CLI, motivo distinto da superfície cloud, nos dois formatos):
`node --test --test-name-pattern="capability-evidence-C7" tests/doctor/capability-evidence.cli.test.mjs`

**C8** - Configurações reais por agente (JSON do Claude, TOML do Codex, YAML do Hermes)
válidas/inválidas/desabilitadas/bloqueadas por política produzem `configuration` e `trust` corretos com
motivo; ausência de consentimento nunca vira `trusted` por inferência; política/precedência não
determinável por leitura usa `unknown`. **Corrigido na implementação**: um campo `trust`/`trusted`
arbitrário dentro do próprio arquivo de configuração nunca é projetado nem concede confiança — a única
origem nativa de confiança lida nesta entrega é `hooks_auto_accept` do Hermes, validada contra uma lista de
origens reconhecidas em `trust-resolution.mjs` (ver `.checks/issue-3-agent-diagnostics.build.md`).
**Corrigido na rodada formal 1 (achados 1 e 6)**: seção `hooks` fora da forma nativa de cada agente
(Claude/Codex: grupos `{ matcher?, hooks: [...] }`; Hermes: lista de mapeamentos com `command`) vira
`invalid/hooks_structure_invalid` e o relatório `partial`; vazio válido, `[hooks.state]` do Codex e
`outbound`/`output_spill` do Hermes continuam válidos. Caminhos de config seguem `path.win32`/`path.posix`
pela `platform` recebida, determinísticos nos três runners.
**Corrigido na correção residual de G3, variante shell (rodada 4,
`.checks/code-review/verifier4-g3-shell-fix.md`)**: pertencer a `VALID_HOOKS` (catálogo geral de plugin
hooks, usado por C5) não bastava — `agent/shell_hooks.py::_parse_hooks_block` recusa um evento listado em
`SHELL_UNSUPPORTED_HOOKS` ANTES de checar `VALID_HOOKS`, e o cruzamento anterior só olhava `VALID_HOOKS`,
anunciando `configured` para um shell hook que a própria instalação ignora. Agora, quando ao menos um
evento configurado bate com `VALID_HOOKS`, o `doctor` também cruza com `SHELL_UNSUPPORTED_HOOKS` do MESMO
`plugins.py` (mesma leitura, mesmo extrator léxico reaproveitado por nome): todos os eventos catalogados
sendo também Python-plugin-only vira `not_configured/hooks_event_shell_unsupported`; um evento shell aceito
ao lado preserva `configured`; a tabela de exclusão ausente/ilegível/não reconhecida vira
`unknown/hooks_shell_exclusion_unavailable`, nunca um conjunto vazio presumido. `mechanisms`/`validHooks`
(C5) não mudam — é uma superfície de decisão distinta do mesmo contrato.
**Corrigido na correção dos três achados bloqueantes da segunda revisão formal
(`.checks/code-review/formal2-codex-fixes.md`)**: (1) `codex_hooks` (alias depreciado de `features.hooks`,
mesma feature, `legacy.rs`/`lib.rs`) era descartado — um usuário com só o alias em `false` e hooks nativos
válidos aparecia `configured`; agora `featuresHooksEnabled` lê a canônica OU, só na ausência/tipo inválido
dela, o alias, preservando a mesma restrição de confiança de projeto já existente para a feature (qualquer
valor explícito em escopo de PROJETO, por qualquer uma das duas chaves, continua `unknown/policy_precedence_
undetermined`). (2) `input` do `mcp_tool` com `null` aninhado em objeto/array (`{"optional": null}`,
`{"metadata": {"optional": null}}`, `{"values": [null]}`) aparecia `configured`, apesar de
`deserialize_mcp_tool_input` (hook_config.rs) rejeitar `null` em qualquer profundidade (TOML não tem `null`);
`hooks-shape.mjs` ganhou uma checagem iterativa (sem recursão de chamada) que cobre a mesma regra. (3) a raiz
de `hooks.json` (`HooksFile`, `#[serde(deny_unknown_fields)]`, `description: Option<String>`, `hooks:
HookEventsToml` com default só na ausência da chave) não era validada antes da projeção: `description=42` ou
um campo desconhecido na raiz (ex.: um evento fora de `hooks`) aparecia `configured`, embora o Codex real
rejeite o arquivo inteiro; `config-projection.mjs` ganhou `hooksFileEnvelopeReasonCode`, aplicada só a
hooks.json (`agentId === "codex" && format === "json"`), nunca a `config.toml` nem a outros agentes. Ver
Landing da correção dos três achados bloqueantes.
**Complementação residual do mesmo achado 1 (`.checks/code-review/formal2-flag-types-residual.md`)**: a
correção acima só cobria a AUSENCIA da chave canônica como gatilho de fallback para o alias; a fonte real
(`FeaturesToml::entries: BTreeMap<String, bool>`, `lib.rs:869-871`, tag `rust-v0.162.1`) rejeita, na própria
deserialização, qualquer uma das duas chaves conhecidas presente com tipo diferente de bool, antes mesmo de
aplicar a precedência entre canônica e alias. Três casos com handlers nativos válidos ao lado apareciam
`configured` indevidamente: canônica com tipo errado caindo para um alias bool válido
(`hooks="yes"`+`codex_hooks=true`), alias com tipo errado escondido atrás de uma canônica bool válida
(`hooks=true`+`codex_hooks="no"`), e o alias sozinho com tipo errado (`codex_hooks="no"`, sem a canônica).
`config-projection.mjs` agora valida o tipo das duas chaves conhecidas presentes antes de escolher a flag
efetiva: qualquer uma delas presente com tipo diferente de bool vira `invalid/features_hooks_flag_invalid_type`
(sem projetar campos, sem trust concedido), mesmo sozinha; só a ausência de uma das chaves (não um tipo
inválido dela) continua abrindo espaço para a outra decidir, e dois bools válidos continuam decididos pela
canônica (comportamento já provado acima, preservado).
**Corrigido na revisão formal3 (achado 2)**: a restrição acima ainda só cobria `features.hooks`/
`features.codex_hooks`, mas `FeaturesToml::entries` (`lib.rs:838-871`) é o `BTreeMap<String, bool>`
INTEIRO de `[features]` via `#[serde(flatten)]` — uma chave desconhecida do `doctor` (ex.:
`shell_tool = "yes"`) com valor não booleano já derruba a deserialização do mapa inteiro na fonte,
mesmo com `hooks=true` e handlers nativos válidos ao lado. `codexFeaturesEntriesReasonCode`
(`config-projection.mjs`, só para `agentId === "codex"`) agora exige booleano em toda chave que não
seja um dos 13 campos nomeados/tipados de `FeaturesToml` (não reimplementa o schema deles, só a
decisão de exclusão do mapa achatado); Claude não tem essa struct, então a regra não se aplica lá.
**Resíduo do mesmo achado** (`.checks/code-review/formal3-residual-fixes.md`, item 1): `FeaturesToml`
desserializa de uma TABELA — `features = true`/`features = false` soltos (sem `[features]`) falhavam
em silêncio (a checagem antiga era um teste de truthiness: `true` passava sem validação, `false` pulava
o bloco inteiro). O `doctor` agora exige `[features]` como objeto antes de ler qualquer chave interna;
`[features]` vazio continua válido.
**Resíduo final do mesmo achado** (`.checks/code-review/formal3-final-residuals.md`, item 1): a
checagem de objeto também aceitava um `Date`/`TomlDate` solto (`features = 1979-05-27`) — `smol-toml`
devolve esse datetime/date TOML como `TomlDate extends Date`, sem propriedade própria enumerável
(`Object.entries` vazio, indistinguível de `[features]` vazio de verdade). `isPlainObject` agora também
confere o protótipo (`null`, das tabelas reais do `smol-toml`, ou `Object.prototype`, de um objeto de
`JSON.parse` — nunca o protótipo de uma classe como `Date`).
Ver `.checks/issue-3-agent-diagnostics.build.md` seções 18-20.
**Corrigido na revisão formal3 (achado 3)**: `timeout` (`Command`/`McpTool`, `Option<u64>`) e
`additionalContextLimit` (`Command`, `Option<usize>`) tinham sinal e integralidade conferidos, mas
nunca o teto superior (2^64-1) — um `timeout` de `18446744073709551616` (2^64, inválido) em
`hooks.json` aparecia `configured`. Um `Number` do `JSON.parse` não representa 2^64-1 com exatidão
(arredonda para o MESMO double que o primeiro valor inválido acima dele), então a checagem usa o
reviver de três argumentos do `JSON.parse` do Node 24 (`context.source`) para comparar o texto-fonte
exato do inteiro via `BigInt`, só em `hooks.json`.
**Resíduos do mesmo achado** (`.checks/code-review/formal3-residual-fixes.md`, itens 2 e 3): (a)
serde_json roteia um token com ponto decimal/expoente para `ParserNumber::F64`, não para o visitor
inteiro de `u64`/`usize` — `timeout: 1.0`/`1e0` eram aceitos porque `JSON.parse` apaga a distinção
lexical com `1`; o `doctor` agora exige, pelo texto-fonte, um token puramente decimal. (b)
`config.toml` tem seu próprio teto de formato (`i64`, não `u64`) e `smol-toml` com `integersAsBigInt:
true` (opção já existente no pacote) preserva o inteiro TOML exato sem o antigo limite de precisão
de double (que rejeitava um `i64::MAX` legítimo como `config_malformed`) e mantém um FLOAT TOML
(`1.0`) como `Number`, nunca `BigInt` — recusado pelo mesmo motivo do `1.0` em JSON.
**Resíduo final do mesmo achado** (`.checks/code-review/formal3-final-residuals.md`, item 2): um token
puramente decimal ainda deixava passar `timeout: -0` em `hooks.json` — a própria fonte do parser
(`de.rs::parse_number`, `serde_json` 1.0.149, linhas 509-526, baixada do publisher crates.io com
checksum igual ao `Cargo.lock` da tag `rust-v0.162.1`) roteia um token negativo de magnitude zero para
`ParserNumber::F64(-0.0)`, nunca para o inteiro ("Convert into a float if we underflow, or on `-0`");
nem `-0 < 0` (`false` em JS) nem `BigInt("-0")` (`0n`) revelam essa armadilha, só o texto-fonte exato.
`isValidOptionalU64Field` agora recusa especificamente o token `"-0"`. O mesmo valor em `config.toml`
(`BigInt`, sem essa conversão do parser JSON) continua um inteiro válido.
**Regressão global do mesmo achado** (`.checks/code-review/formal3-toml-document-range.md`):
`integersAsBigInt: true` vale para o documento inteiro, mas a faixa `i64` só era conferida em
`timeout`/`additionalContextLimit` — um inteiro fora dela numa chave ignorada, ao lado de hooks válidos,
aparecia `configured`/`complete`. O carregador do Codex 0.162.1 desserializa o arquivo inteiro em
`toml::Value` (`layer_io.rs:154–160`) e o `ValueVisitor` do `toml` 0.9.11 (`value.rs:442–446`) só aceita
inteiro em `i64`; é uma restrição desse pipeline, não de todo deserializer TOML tipado. `parseCodexToml`
agora recusa um inteiro fora de `[-2^63, 2^63-1]` em qualquer posição como `invalid/config_malformed`;
o `timeout` TOML acima de `i64::MAX` passou de `hooks_structure_invalid` para `config_malformed`.
Extremos de `i64`, floats e datetimes continuam válidos; `hooks.json` não muda.
**Regressão compartilhada dos achados 2/3** (`.checks/code-review/formal3-shared-projection-regression.md`,
também C12): a troca de `if (parsed.features)` por `!== undefined` restringiu ao Codex só a checagem de
contêiner, e `features: null` num `settings.json` do Claude (ou `config.yaml` do Hermes) válido chegava a
`Object.hasOwn(null, ...)` fora de qualquer `catch` — relatório inteiro `failed`, `agents: []`, exit 1.
Um mapa `{ hooks: false }`/`{ hooks: "yes" }` nesses agentes ainda virava `disabled/features_hooks_disabled`
ou `invalid/features_hooks_flag_invalid_type`. `features`/`hooks`/`codex_hooks` são contrato só do Codex
(`FeaturesToml`, `lib.rs:838–871`): `extractSafeFields` agora entra no ramo inteiro só com
`agentId === "codex"`. Claude/Hermes ignoram `features` de qualquer tipo e continuam decididos por
`hooks`, `disableAllHooks`, `allowManagedHooksOnly` e `hooks_auto_accept`; a validação do Codex não muda.
Proof: `node --test --test-name-pattern="config-projection-C8" tests/doctor/config-projection.unit.test.mjs`
Proof: `node --test tests/doctor/config-sources.unit.test.mjs`
Proof: `node --test tests/doctor/config-reader.unit.test.mjs`
Proof: `node --test tests/doctor/scope-merge.unit.test.mjs`
Proof: `node --test tests/doctor/trust-resolution.unit.test.mjs`
Proof: `node --test --test-name-pattern="configuration-trust-C8" tests/doctor/configuration-trust.cli.test.mjs`

**C9** - `--collector tcp://127.0.0.1:<porta>` ou `tcp://[::1]:<porta>` tenta só conexão de transporte;
socket disponível retorna `reachable`; recusa retorna `unreachable`; `identityVerified` é sempre `false`.
Proof: `node --test --test-name-pattern="collector-C9" tests/doctor/collector.cli.test.mjs`

**C10** - Sem endpoint, `collector.status: unknown` com `endpoint_not_provided`; endpoint inválido (não
loopback literal, com credenciais/path/query, ou `localhost` não normalizado) é recusado sem conexão;
tentativa que excede 1000 ms retorna `unreachable/connection_timeout` sem travar os demais diagnósticos.
Proof: `node --test --test-name-pattern="collector-C10" tests/doctor/collector.cli.test.mjs`
Proof (timeout real e recusa pré-conexão, limitação declarada abaixo): `node --test --test-name-pattern="collector-probe-C10" tests/doctor/collector-probe.unit.test.mjs`

Limitação declarada (C10): um timeout real de rede (SYN engolido por firewall) não é reproduzível de forma
rápida e portátil em CI sem admin/firewall. A aplicação do teto de 1000 ms é provada na própria função de
probe com uma função `connect` injetada que nunca resolve, medindo tempo de parede real (sem relógio falso).
A recusa pré-conexão de endpoints inválidos também é provada nessa camada, com um `connect` que lança se for
chamado. O status `reachable`/`unreachable` por recusa real de socket cruza a fronteira real da CLI.

### S3 - Consumir o diagnóstico completo e reconhecer suas falhas · 9 arquivos · ~25 KB · ~6k

**C11** - `doctor` e `doctor --json` apresentam os mesmos fatos; o JSON é um objeto único sem
banner/ANSI/log antes ou depois; o texto em português distingue ausente/desconhecido/indisponível/não
verificado; identificadores do JSON são em inglês. **Corrigido na correção do Verifier (G1)**: o renderer de
texto reduzia cada capacidade a uma contagem por estado e nunca imprimia `agent.path` nem o ambiente
(`environment.platform/cwd/generatedAt`), então os dois formatos não apresentavam os mesmos fatos/códigos do
mesmo modelo. `src/doctor/render-text.mjs` agora expõe, por agente, o caminho e, por capacidade, mecanismo ×
superfície, `support`, `reasonCode`, `evidence.origin`, `configuration` e a exclusão documentada quando
presente (ver C7). **Rodada formal 1**: o texto também mostra, por linha, a fonte de contrato, os
eventos e os eventos ausentes que o JSON passou a ter (achado 2), e a paridade CLI usa uma instalação
com linhas `verified` e com evento ausente.
Proof: `node --test --test-name-pattern="envelope-C11" tests/doctor/envelope.cli.test.mjs` (inclui a nova
paridade texto/JSON na fronteira real da CLI, duas invocações de processo distintas sobre a mesma fixture,
com motivos/origens reais e distintos por superfície)
Proof (renderer puro com modelo sintético compartilhado, sem depender de timestamps de processo):
`node --test tests/doctor/render-text.unit.test.mjs`

**C12** - `schemaVersion: 1`, `status: complete|partial|failed`, seções `environment/agents/collector/
limitations/errors`; config inválida de um agente gera `partial` preservando as demais entradas; exit `0`
para completo/parcial; flag desconhecida usa exit `2`; erro com `--json` preserva envelope `failed` sem
stack bruta.
Proof: `node --test --test-name-pattern="envelope-C12" tests/doctor/envelope.cli.test.mjs`
Proof (exit `1`/erro interno, limitação declarada abaixo): `node --test --test-name-pattern="envelope-failure-C12" tests/doctor/envelope-failure.unit.test.mjs`
**Corrigido na revisão formal3 (achado 4)**: `matcherGroupHandlers`/`inspectMatcherGroupHooks`
(`hooks-shape.mjs`) espalhavam a lista de handlers de um grupo como argumentos de
`.push(...)`/`.push(...array.map(...))`; um `hooks.json` sintaticamente válido com um grupo
`PreToolUse` de 300.000 objetos vazios (~900 KB, abaixo do limite de 1 MiB) estourava o limite de
argumentos do V8 (`RangeError`) ANTES de qualquer classificação, e a exceção escapava da leitura de
configuração — a CLI emitia `failed/internal_error`, `agents: []` e exit 1, perdendo o diagnóstico
inteiro por causa de um único agente. Os dois pontos agora usam laço simples, sem teto de argumentos;
`matcherGroupHandlers` é compartilhada por Claude e Codex, então a mesma correção cobre os dois.
Ver `.checks/issue-3-agent-diagnostics.build.md` seção 18.
**Regressão compartilhada dos achados 2/3** (descrita na entrada C8; build seção 22): `features: null` num
`settings.json` do Claude válido também derrubava o relatório inteiro (`failed`, `agents: []`, exit 1).
Agora fica `complete`/exit 0 com os 3 agentes; com um Codex de `features` inválido ao lado, `partial`/exit 0,
Codex `invalid/features_hooks_flag_invalid_type` e Claude/Hermes decididos só pelas próprias chaves.
Proof: `node --test --test-name-pattern="config-projection-C12" tests/doctor/config-projection.unit.test.mjs`
Proof (fronteira real da CLI, 3 agentes e collector preservados): `node --test --test-name-pattern="configuration-trust-C12" tests/doctor/configuration-trust.cli.test.mjs`

**C13** - `--help` lista exatamente `--json, --cwd, --collector, --help` com defaults documentados; diretório
inexistente ou flag desconhecida usa exit `2`; `--help` usa exit `0` sem inspecionar agentes; não existe
flag de reparo/instalação/coleta.
Proof: `node --test --test-name-pattern="envelope-C13" tests/doctor/envelope.cli.test.mjs`

**C14** - Canários em config/erros/comandos de hooks não vazam em stdout/stderr/relatório; a projeção só
permite metadados necessários; config acima de 1 MiB vira `unknown/input_too_large` sem copiar conteúdo nem
executar tags YAML ou interpolação; metadado PE é lido pela estrutura do binário sem carregar o executável
inteiro em memória nem iniciá-lo.
Proof: `node --test --test-name-pattern="leak-C14" tests/doctor/leak-and-limits.cli.test.mjs`
Proof: `node --test --test-name-pattern="config-projection-C14" tests/doctor/config-projection.unit.test.mjs`
Proof: `node --test tests/doctor/version-metadata.unit.test.mjs`

**C15** - Duas execuções simultâneas sobre as mesmas fixtures não criam cache/lock/backup e retornam os
mesmos fatos (descontando timestamp); mutação detectada durante a leitura vira limitação, não reparo.
**Corrigido na correção do Verifier (G3)**: `readBoundedText` (`src/doctor/snapshot-read.mjs`) descartava
`snapshot.changedDuringRead` e devolvia `state: "ok"` com o texto lido durante a mutação, então os
consumidores de `shim`/`package_metadata` (Codex) e `source_literal` (Hermes) nunca recebiam essa
inconclusividade - só `config-reader.mjs` já propagava. Agora `readBoundedText` devolve
`state: "changed_during_read"` e os três consumidores reais (`launcher-link/codex.mjs`,
`launcher-link/hermes.mjs`) retornam `version: null`/`reasonCode: "version_changed_during_read"`,
preservando `presence: present` a montante (a montagem fica em `agent-resolution.mjs`, que só depende de
`launcherPath` ter sido encontrado).
Proof: `node --test tests/doctor/snapshot-concurrency.cli.test.mjs`
Proof (mutação durante a leitura, limitação declarada abaixo, inclui o wrapper `readBoundedText` e os três
consumidores reais de shim/package_metadata/source_literal):
`node --test tests/doctor/mid-read-mutation.unit.test.mjs`

**C16** - Os cenários da suíte comprovam ausente, versão sem perfil, recurso desabilitado, config
malformada/inacessível e coletor inacessível, registrando se a origem é fixture ou ambiente real; há casos
Windows/Linux/macOS nas fixtures; a suíte não alega payload privado nem E2E de captura. **Corrigido na
correção do Verifier (G4)**: faltavam cenários na fronteira real da CLI (processo filho) para uma instalação
RECONHECIDA (vínculo real ao pacote/fonte, não um "launcher alheio") com versão sem perfil compatível, e para
configuração inacessível. Versão sem perfil: `writeCodex` com versão `9.9.0` fora de
`known-version-profiles.mjs`, resolução bem-sucedida (`presence: present`, `version: "9.9.0"`,
`versionSource: "package_metadata"`), e as cinco linhas `cli_local` da matriz ficam
`unverified/version_profile_incompatible`, nunca `verified` nem `launcher_not_recognized`. Config inacessível:
prova portátil entre Windows/Linux/macOS sem depender de permissão de SO (`chmod` não bloqueia o dono no
Windows; CI roda como root) - um diretório real no lugar de `config.yaml` do Hermes produz uma falha de
leitura real (`EISDIR` no Windows/Linux/macOS) capturada por `readScope`, resultando em
`configuration: unknown/policy_precedence_undetermined` e preservando Claude/Codex como `not_configured`.
Proof: `node --test tests/doctor/fixture-suite-inventory.test.mjs`
Proof (versão sem perfil compatível, fronteira real da CLI):
`node --test --test-name-pattern="presence-C16" tests/doctor/presence.cli.test.mjs`
Proof (configuração inacessível, fronteira real da CLI, prova portátil via diretório no lugar do arquivo):
`node --test --test-name-pattern="configuration-trust-C16" tests/doctor/configuration-trust.cli.test.mjs`
**Corrigido na rodada formal 1 (achados 7 e 1)**: o relatório real não atribui mais origem `fixture` às
superfícies não inspecionadas — as 45 linhas de IDE/desktop/cloud declaram `not_inspected`, a CLI local
`real_environment`, e `fixture` só aparece quando uma prova a informa; o registro de cenário segue em
`fixture-manifest.mjs`. O teste de caminhos Windows que falhava em Linux/macOS agora usa semântica
explícita de plataforma. Execução real só em Windows (ver build, seção 9).
Proof (45 linhas não locais nos dois formatos):
`node --test --test-name-pattern="capability-evidence-C16" tests/doctor/capability-evidence.cli.test.mjs`

**C17** - A documentação de compatibilidade registra fonte, data de consulta, versão/superfície aplicável,
evidência obtida e lacunas, separando contrato documentado, inspeção estática e execução real; o README
ensina `npm run --silent doctor -- --json` e a leitura de `partial`, `unverified` e
`identityVerified: false`.
Proof: `node --test tests/doctor/docs-compatibility.test.mjs`

**C18** - `test:governance` e `test:code-review` continuam passando; a suíte nova entra na verificação de
mudanças de código e no `CI` obrigatório; os cinco arquivos comuns de `scripts/code-review/` permanecem byte
a byte iguais à base; sem instalação/publicação de pacote, commit em main ou mudança das regras de merge.
Proof (linha de base confirmada nesta data, 13/10/2026): `npm run test:governance` (6/6 passando) e
`npm run test:code-review` (10/10 passando).
Proof (paridade do motor, confirmada sem diff nesta data): `git diff --exit-code 4242520 -- scripts/code-review/cli.mjs scripts/code-review/review.mjs scripts/code-review/review.test.mjs scripts/code-review/schema.json scripts/code-review/README.md`
Pendente de implementação (não decidido nem aplicado nesta fase, ver Handoff): acrescentar
`node --test "tests/doctor/**/*.test.mjs"` ao job `verify` de `governance.yml`, a matriz Windows/Linux/macOS
e, se necessário, atualizar `governance-C1 C3` em `scripts/governance-ci.test.mjs` para a nova forma do
workflow — sem alterar `package.json`/CI nesta fase, por instrução explícita desta rodada.

Limitação declarada (C12, exit 1): não há como forçar um "erro interno que impossibilite relatório" de forma
determinística via processo real sem um knob de teste na CLI de usuário (o que é proibido) - qualquer entrada
reconhecida vira um estado tratado (exit 0 ou 2), não uma falha genuína. O mapeamento erro→envelope→exit code
é provado diretamente na função que `cli.mjs` deverá usar como barreira final.

Limitação declarada (C15, mutação durante leitura): sincronizar uma escrita real durante a leitura de um
processo CLI externo não é determinístico (depende de timing de SO). A detecção é provada na função de
leitura com snapshot, injetando um `stat()`/`readFile()` que discordam, como aconteceria numa mutação real.

## Swept

- validation: C3, C8, C10, C13, C14 - entradas malformadas, leitura limitada e flags.
- failure modes: C3, C10, C12 - acesso negado, timeout e isolamento da falha parcial.
- idempotency and retry: C4, C15 - sem escrita/cache; nova invocação é nova leitura; mutação detectada não é
  reparada nem relida automaticamente.
- authorization: C4, C8, C10 - permissões do usuário atual; somente leitura; endpoint local explícito.
- concurrency and ordering: C1, C15 - ordem fixa de saída; duas execuções concorrentes sem estado comum.
- data lifecycle: C4, C14, C15 - sem persistência de diagnóstico/config; só fixtures sintéticas e
  documentação são versionadas.
- dependency failure: C3, C5, C10 - artefato inacessível, versão sem perfil e coletor indisponível não viram
  suporte afirmado.
- state transitions: n/a - relatório de snapshot, sem ciclo de vida persistido nesta entrega.
- observability: C5-C12, C17 - motivos e origem de evidência no mesmo relatório; nenhuma captura real.

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| Fonte de versão (3) | `binary_metadata` C2/C14 (PE) · `package_metadata` C2 (Codex) · `source_literal` C2 (Hermes) | - |
| Convenções de SO (3) | `win32` C2 · `linux` C2 · `darwin` C2, parametrizado em `agent-resolution.unit.test.mjs`; caminhos de config por plataforma em `config-sources.unit.test.mjs` | Simulação por `platform` + FS em memória; execução real registrada só em Windows (CI cobre Linux/macOS) |
| Matriz de capacidades (5 mecanismos × 4 superfícies = 20/agente) | C5-C7, tabela única percorre as 20 combinações por agente, tamanho declarado no teste | - |
| `support` produzido pela CLI (3) | `verified` C5 (tabela instalada, CLI) · `unavailable` C5 (launcher ausente, CLI) · `unverified` C5/C7 (motivos de versão, contrato e superfície, CLI e unidade) | - |
| Estado da fonte de contrato (8) | `found` completo/incompleto C5 (CLI) · `no_static_source` C5 (CLI) · `not_found` C5 (CLI) · `unreadable`/`too_large`/`changed_during_read`/`unrecognized` C5 (unidade, `contract-evidence.unit.test.mjs`) | `unreadable`/`too_large`/`changed_during_read` não cruzam a CLI: mesma limitação de permissão/mutação já declarada para C3/C15 |
| `evidence.origin` (4) | `real_environment` C5/C16 (CLI) · `not_inspected` C16 (45 linhas, CLI) · `fixture` C5 (unidade, só explícita) · `documented_contract` C7 (CLI, `exclusion`) | - |
| Forma nativa de hooks (3 agentes) | Claude C8 (unidade + CLI, exemplos formais) · Codex C8 (unidade + CLI) · Hermes C8 (unidade + CLI) | - |
| `configuration` (5) | `configured` C8 · `not_configured` C8 · `disabled` C8 · `invalid` C8 · `unknown` C8/C14 | - |
| `trust` (4) | `trusted` C8 · `untrusted` C8 · `unknown` C8 · `not_applicable` C8 | - |
| `collector.status`/motivo (5) | `reachable` C9 · `unreachable/connection_refused` C9 · `unreachable/connection_timeout` C10 · `unknown/endpoint_not_provided` C10 · `unknown/invalid_endpoint` C10 | - |
| Exit code × status (4 combinações observáveis) | `0/complete` C12 · `0/partial` C12 · `2/sintaxe-flag` C12-C13 · `1/failed` C12 (camada de função, limitação declarada) | - |
| Startup config: descoberta de config por agente (1 montagem) | A CLI é a única montagem desta entrega (sem servidor/outro app); texto e JSON consomem o mesmo relatório interno - nenhuma linha é devida (ver nota do formato de checklist sobre montagem única compartilhada) | - |

- Claims naming a status code, route ou response shape: C9, C10, C12, C13 - cada uma tem ao menos uma prova
  que cruza a fronteira real da CLI, com duas exceções declaradas e justificadas acima: o exit `1`/"erro
  interno" de C12 e o `connection_timeout` de C10, ambos provados na função que a CLI usará como barreira,
  não via processo real, por não serem reproduzíveis de forma determinística nessa fronteira.
- Nenhum outro check afirma mais do que o caso único que sua prova exercita.

## Handoff

Uma única implementação cobrindo as três fatias em um único lote (não há necessidade de produto, outro time
ou decisão de produto que force sub-issues, conforme a própria task). Tamanho estimado pelo que já existe
nesta fase (testes e fixtures reais, `wc -c` dividido por 4): S1 ~7k, S2 ~6k, S3 ~6k, total ~19k de leitura
mínima sobre os arquivos de teste - a implementação ainda vai acrescentar `src/doctor/**`, `docs/agent-
compatibility.md`, trechos de `README.md` e a mudança de CI, cujo tamanho real só é conhecido quando esses
arquivos existirem; esta estimativa é a base mínima declarada nesta fase, não o total final do PR.

Trabalho que esta fase deixou pendente, por instrução explícita de escopo ("não implemente produto, não mude
npm/CI, não instale dependências"):

1. Implementar `src/doctor/**` conforme os contratos fixados pelos testes (nomes de módulos, formas de dados
   e `reasonCode`s já são vinculantes - mudar a forma exige atualizar os 18 checks, não apenas o código).
2. Escrever `docs/agent-compatibility.md` e os trechos do `README.md` exigidos pelo critério 17.
3. Acrescentar a suíte nova (`node --test "tests/doctor/**/*.test.mjs"`) ao job `verify` de
   `governance.yml`, a matriz Windows/Linux/macOS, e atualizar `governance-C1 C3` para a nova forma do
   workflow, preservando os cinco arquivos comuns de `scripts/code-review/` (critério 18).
4. Rodar a suíte completa (`node --test "tests/doctor/**/*.test.mjs"`) e confirmar GREEN antes de acionar o
   Verifier independente e `review:run -- --issue 3 --profile light`, conforme a "Execução proposta" da task.

Verifier independente prova cada critério e salva `.checks/issue-3-agent-diagnostics.verified.md`, conforme
a task; esta fase não afirma nenhum teste como executado além do RED comprovado abaixo.
