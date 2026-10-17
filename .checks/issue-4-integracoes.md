# Issue #4 — observar execuções em Claude Code, Codex e Hermes

Perfil `light`, handoff `on`. Checklist escrito antes de qualquer teste ou código de
produto; é a barra da implementação e não muda para acomodá-la.

Sources:

- [Issue #4](https://github.com/oldboydev/skill-me/issues/4) e
  `.checks/code-review/issue-4/issue-body-approved.md` — problema, 9 AC (AC1 já com o
  recorte aprovado), restrições.
- Conversa de 16/10/2026 — aprovação humana do recorte: fronteira mínima e receptor em
  memória; privacidade completa e armazenamento nas #5/#8; sem instalação pessoal,
  E2E com modelos, coleta bruta, servidor, armazenamento, push ou PR.
- Conversa de 16/10/2026 — renegociação explícita de C39 após F5 do Verifier:
  à pergunta "Confirma ajustar C39 para proibir conteúdo bruto nas saídas e registros
  próprios do debugger, preservando byte a byte a saída original do Codex, como já
  previsto no plano?", o proprietário respondeu "Confirmo o ajuste ao plano".
  O texto anterior de C39 e o FAIL da primeira rodada permanecem no histórico Git;
  não houve alteração do comportamento ou das asserções para obter aprovação.
- `.tasks/issue-4-integracoes.md` — 14 critérios em 5 fatias e a seção "Fronteira
  mínima — assinatura fechada (U1)", que fixa envelope, limites, comandos e códigos.
- `AGENTS.md` — regras de teste, reúso, governança; `package.json` privado.
- `docs/agent-compatibility.md` e `src/doctor/*` — evidência estática existente e
  exports reutilizados (`projectConfig`, `readBoundedText`, `resolveAgents`,
  `createProductionFsAdapter`, `CLAUDE_MANAGED_SETTINGS_PATH`, `ONE_MIB_BYTES`,
  `CliUsageError`).
- Contratos nativos (16/10/2026): `code.claude.com/docs/en/hooks` e
  `/docs/en/permissions`; `openai/codex` tag `rust-v0.162.1` (`hooks/src/schema.rs`,
  `hooks/src/engine/command_runner.rs`, `exec/src/exec_events.rs`, `exec/src/cli.rs`)
  e `learn.chatgpt.com/docs/hooks`; Hermes 0.21.4 local (`hermes_cli/plugins.py`,
  `plugins_dispatch.py`, `model_tools.py`, locais de disparo citados no plano).

## Out of scope

- Política integral de coleta/retenção (#5), transporte/armazenamento/consumidor real
  (#8), timeline e atribuição de skill (#6), conformidade (#7) — o recorte aprovado
  entrega só a fronteira mínima e o receptor em memória.
- Instalação em perfil pessoal, habilitar plugin/hook no perfil do proprietário,
  conceder confiança nativa, E2E com modelos reais — sem autorização; ficam pendentes.
- Hooks `UserPromptSubmit`/`Stop`/`PreCompact`/`PostCompact`/`Interrupt` — existem nos
  contratos, mas o payload traz prompt/mensagem e nenhum critério os exige; listados
  como não assinados na matriz.
- Edição de `config.toml` do Codex ou `config.yaml` do Hermes — o instalador escreve só
  `hooks.json`, `settings.json` e a pasta própria do plugin.
- Alterar `doctor`, `AGENTS.md`, motor `scripts/code-review` ou outras issues.

## Landing

Novo módulo `src/integrations/` (CLI separada do doctor, fronteira, receptor,
adaptadores, wrapper, instalador) e plugin Python em `src/integrations/hermes/plugin/`.
Reutiliza do doctor, por import: validação/leitura de configuração (`projectConfig`,
`readBoundedText`, `createProductionFsAdapter`), resolução do pacote Codex
(`resolveAgents`), caminho de política gerenciada, `ONE_MIB_BYTES` e `CliUsageError`.
Nenhuma dependência nova; `yaml`/`smol-toml` já existentes só pelo doctor.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Envelope v1 consumido por #5/#6/#8 | `{schemaVersion:1, source:{agent,mechanism,contract}, signal, eventKind, nativeEvent, ids, fields, gaps, observedAt}`; tabelas de `eventKind`/campos/enums do plano | envelope por agente — #6 teria três formatos para correlacionar; payload nativo filtrado em vez de normalizado — vazaria nomes e formas específicos para cada consumidor |
| IDs nativos nunca truncados | ID > 256 caracteres, vazio ou não string → omitido + `id:too_long`/`invalid_type` | truncar com marca — produziria um ID que o agente nunca emitiu |
| Campos `name` sem truncamento | regex `^[\p{L}\p{N} ._:/@+-]{1,128}$`u; fora disso → omitido + lacuna | truncar com "…" (rascunho anterior) — fabricaria um nome e deixaria texto livre passar |
| Python só projeta nomes de `kwargs.json` | `{hook, kwargs:{<nome listado>: escalar inalterado}, nonScalar:[…]}`; fronteira roda no `ingest` Node | rascunho anterior com envelope montado em Python pela mesma especificação — duplicaria tipos/limites/lacunas em duas linguagens; repassar `kwargs` brutos ao Node — tiraria argumentos/resultados do processo do agente |
| Hermes sem entrega = inativo | sem `SKILL_ME_HERMES_DELIVERY`, callback devolve `None` sem fila/thread/processo | iniciar sempre um `ingest` Node por processo Hermes — custo sem consumidor real |
| Exportador de relatório só por variável explícita | `SKILL_ME_OBSERVER_REPORT_FD` (hook/ingest 2..9; wrapper 3..9), uma linha JSON ao sair, ≤ 1000 ms | arquivo de relatório — seria persistência (#5/#8); stdout — no Claude/Codex vira contexto/decisão |
| Entrada Claude em forma exec | `{"type":"command","command":<node>,"args":[<cli>,"hook","--agent","claude"],"timeout":10}` sem `matcher` | forma shell — citação diferente entre Git Bash e PowerShell no Windows, quebra com espaços/Unicode |
| Entrada Codex em `hooks.json` com linha citada | Windows `"<node>" "<cli>" hook --agent codex` (recusa `"`, `%`, CR/LF); POSIX aspas simples | editar `[hooks]` de `config.toml` — reescrita TOML perderia comentários/formatação do usuário |
| Registro de propriedade | `<target>/.skill-me/<agente>-install.json`: versão, arquivo, SHA-256 do JSON canônico de cada grupo/artefato próprio e o que foi criado | backup integral do arquivo — copiaria segredos e apagaria edições posteriores ao restaurar |
| Escrita com lock + comparação + rename | lock `wx`, temporário no mesmo diretório, releitura e SHA-256 igual à leitura inicial, `rename`; divergência → 4 | escrita direta — perde edição concorrente; CAS com editores arbitrários — não existe no sistema de arquivos |
| CLI `integrations` e códigos | `plan|install|uninstall --agent … --target … [--apply] [--json]`, `run`, `hook`, `ingest`; códigos 0/2/3/4/5; wrapper 127/126/código do filho | subcomando do doctor — doctor é somente leitura e sem execução por contrato da #3 |
| Suite nova na CI | script `test:integrations`, incluído em `npm test` e como passo do job `verify` | rodar só localmente — a matriz de três SO declarada não exercitaria a #4 |
| Resolução padrão do Codex no wrapper (acrescentado no build, antes do código) | sem `--codex-entry`: `resolveAgents` (export existente do doctor) → caminho do launcher; executável nativo ou launcher POSIX (link/script com shebang) é iniciado sem shell; launcher `.cmd`/`.bat` no Windows → 127 com mensagem fixa pedindo `--codex-entry <…/@openai/codex/bin/codex.js>` | acrescentar `packageDir` ao retorno do Codex no doctor — mudaria um export do doctor, fora do recorte ("reusar pelos exports existentes"); reinterpretar o shim npm aqui — duplicaria o parser do doctor; iniciar o `.cmd` com shell — reinterpretaria os argumentos |
| `not_in_contract` derivado pela fronteira (acrescentado no build, antes do código) | chave presente em `draft.fields` = o contrato fornece (valor ausente → `absent`); campo do `eventKind` sem chave → `<campo>:not_in_contract`; tradução impossível no adaptador → `draft.fieldGaps: {campo: motivo}` com motivo do vocabulário fechado | lista `notInContract` mantida à mão por adaptador — esquece campo em silêncio quando um `eventKind` ganha campo novo |
| Reescrita não amplia o acesso POSIX (acrescentado na correção formal F2, antes do código) | POSIX: modo/dono/grupo do arquivo substituído (`stat`); temporário criado (`wx`) só com os bits de dono do original; grupo do temporário diferente → `fchown(-1, grupo original)`; sem permissão para isso, bits de grupo limitados aos de "outros"; `fchmod` aos bits finais (iguais aos do original quando o grupo confere) antes de escrever o conteúdo; modo/dono/grupo reconferidos junto com o hash antes do `rename` (mudou → 4). Dono do arquivo novo é o processo (sem privilégio não há `chown` de dono); ACL POSIX/Windows, xattr e bits especiais não são preservados nem detectados. Windows: inalterado (acesso por ACL; modo do `stat` não a representa) | `chmod` depois de escrever — janela com o conteúdo sob o modo amplo, e quem abrir o arquivo nessa janela continua lendo; criar já com o modo final — com o grupo errado concederia acesso a outro grupo antes do `fchown`; reescrever o próprio arquivo (preservaria inode e ACL) — perde a troca única e a comparação de hash antes do `rename` da linha "Escrita com lock + comparação + rename" |
| Grupo não atribuível: interseção de grupo e "outros" (acrescentado na correção formal F2 após o contraexemplo do coordenador, antes do código que o fecha; substitui só a regra de grupo da linha anterior) | grupo do temporário diferente do original e `fchown` negado → bits de grupo **e** de "outros" = interseção dos dois no original; bits de dono intactos (0640 → 0600, 0604 → 0600, 0664 → 0644) | limitar só o grupo novo aos bits de "outros" (linha anterior) — em 0604 quem pertencia só ao grupo antigo não lia, passa a "outros" e ganharia leitura; recusar a substituição — a interseção já impede ampliação nos quatro casos de pertencimento sem impedir a instalação |
| Reinstalação sobre grupo próprio editado (acrescentado na correção formal F3, antes do código) | `install`: evento sem o grupo registrado e sem grupo idêntico ao canônico, mas com grupo de assinatura própria → conflito `owned_entry_modified` (há registro; a entrada registrada permanece nele) ou `owned_entry_unrecorded` (sem registro); nada é acrescentado nem adotado nesse evento; os demais eventos seguem e o código é 4, como na remoção com conflito. `uninstall`: grupo de assinatura própria que resta depois da remoção, sem conflito já reportado no evento → `owned_entry_unrecorded`, 4 | acrescentar o canônico ao lado (comportamento anterior) — dois observers no evento e remoção seguinte com sucesso falso e registro apagado; adotar o grupo editado pela assinatura — tomaria como próprio o conteúdo alterado pelo usuário e o apagaria na remoção; recusar a instalação inteira — impediria completar os eventos intactos, ao contrário da remoção, que aplica o resto e reporta 4 |
| Escrita acima do teto de leitura (acrescentado na correção formal F4, antes do código) | os planos puros de instalação e remoção medem `Buffer.byteLength(texto novo, "utf8")`; acima de `ONE_MIB_BYTES` (mesmo teto, inclusivo, de `readBoundedText`/`projectConfig`) → 3 `invalid_config` com erro `{code: "output_too_large", file}`, sem escrita nem registro, também na prévia; até o teto, inclusive, segue | gravar e deixar a leitura seguinte falhar (comportamento anterior) — instalação "concluída" que depois não reinstala nem remove; aumentar o teto ou encurtar valores do usuário — muda o contrato ou perde dados; conflito 4 ou incompleto 5 — não há conflito nem mutação iniciada, e o 3 já significa "configuração não substituída", inclusive por tamanho |

- Nada mais nesta entrega é difícil de reverter.

## Checks

Contrato de saída de toda prova: o comando termina com exit 0 e o resumo TAP traz
`# tests N`, `# pass N`, `# fail 0`, `# skipped 0`, com N indicado na própria prova.
Exceções declaradas na prova: testes nativos do Hermes (sem o runtime local 0.21.4 o
teste fica `# skipped 1` com motivo `hermes-runtime-ausente` e o check fica
**pendente**, nunca pass) e o teste de sinais POSIX (no Windows `# skipped 1` com
motivo `posix-signals`; a prova vale no Linux/WSL e na CI POSIX).
Comando-base: `node --test --test-reporter=tap --test-name-pattern="^<ID> " <arquivo>`.

### S1 — observar Claude Code e distinguir caminhos · 6 arquivos novos + leitura · ~60 KB · ~15k

**C1** — `PreToolUse`, `PostToolUse` e `PostToolUseFailure` de fixture `claude-code-hooks@docs-2026-10-16`, executados pelo comando exec gravado em `settings.json` instalado, geram `tool_pre`/`tool_post` com `ids.sessionId`, `ids.toolUseId`, `ids.agentId` e `ids.promptId` iguais aos nativos, `outcome` `success`/`failure`, stdout vazio e exit 0 (crit. 1, AC1).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C1 " tests/integrations/claude-hook.cli.test.mjs` — N=1

**C2** — `SessionStart`, `SessionEnd`, `SubagentStart` e `SubagentStop` pelo mesmo comando instalado geram `session_start{source}`, `session_end{reason}`, `subagent_start{agentType}` e `subagent_stop{agentType}` com `ids.agentId` nativo (crit. 1).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C2 " tests/integrations/claude-hook.cli.test.mjs` — N=1

**C3** — Campo previsto ausente (`is_interrupt`, `duration_ms`, `agent_id` fora de subagente) vira lacuna `<nome>:absent`; tipo errado vira `invalid_type`; valor fora do enum vira `unrecognized_value`; nenhum desses produz valor no envelope (crit. 1, AC1).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C3 " tests/integrations/claude-hook.cli.test.mjs` — N=1
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C3b " tests/integrations/boundary.unit.test.mjs` — N=1

**C4** — Caminho pelo agente: `PreToolUse` com `tool_name: "Skill"` e `tool_input.skill` gera `skill_invocation` com `invocationPath: "skill_tool"`, `phase: "pre"` e `skillName` igual ao nativo; `tool_input.args` não aparece no envelope (crit. 2, AC3).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C4 " tests/integrations/claude-hook.cli.test.mjs` — N=1

**C5** — Caminho direto: cenário só com `UserPromptExpansion` `slash_command` (sem nenhum `PreToolUse`) gera `skill_invocation` `invocationPath: "direct_command"`, `phase: "expansion"`, `skillName` = `command_name`; `prompt`/`command_args` ausentes do envelope; `mcp_prompt` gera `command_expansion`, nunca `skill_invocation` (crit. 2, AC3).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C5 " tests/integrations/claude-hook.cli.test.mjs` — N=1

**C6** — `docs/agent-observation.md` classifica cada caminho de skill por agente (Claude agente/direto, Codex, Hermes) como contrato+fixture, nativo local ou pendente/indisponível, com a fonte de cada classificação (crit. 2).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C6 " tests/integrations/docs-matrix.test.mjs` — N=1

### S2 — observar Codex e supervisionar `exec` · 8 arquivos novos + leitura · ~90 KB · ~23k

**C7** — `PreToolUse`, `PostToolUse`, `SessionStart`, `SessionEnd`, `SubagentStart` e `SubagentStop` de fixture `codex-hooks@rust-v0.162.1`, executados pela linha gravada em `hooks.json` através do shell que o Codex usa (`cmd.exe /C "<linha>"` no Windows, `sh -lc` no POSIX), geram os `eventKind` do plano com `sessionId`, `turnId`, `toolUseId`, `agentId` nativos; `tool_post` traz `outcome:not_in_contract` (crit. 3, AC1).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C7 " tests/integrations/codex-hook.cli.test.mjs` — N=1

**C8** — `PreToolUse`/`PostToolUse` que leem `.../SKILL.md` geram só `tool_pre`/`tool_post` com `signal: "native_hook"`, sem `skill_invocation`, sem `skillName` e sem o caminho em nenhum byte do relatório (crit. 3, AC2).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C8 " tests/integrations/codex-hook.cli.test.mjs` — N=1

**C9** — O guia declara que hooks locais do Codex não cobrem hosted tools e não afirma cobertura deles; a matriz do Codex não tem linha "observado" para hosted tools (crit. 3).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C9 " tests/integrations/docs-matrix.test.mjs` — N=1

**C10** — O filho recebe exatamente `["exec","--json",...argv]`, com argumentos contendo espaços, Unicode, `&&`, `|`, `;`, `$()`, crases, `%PATH%`, `>` e aspas, todos literais; nenhum arquivo-sentinela é criado e nenhum comando embutido executa (crit. 4, AC4).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C10 " tests/integrations/codex-run.cli.test.mjs` — N=1

**C11** — `--json` ou `--experimental-json` antes de `--` não é duplicado; `--json` só depois de `--` é texto literal e o wrapper insere o seu `--json` após `exec` (crit. 4).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C11 " tests/integrations/codex-run.cli.test.mjs` — N=1

**C12** — `cwd` (caminho com espaço e Unicode), bytes do stdin, ambiente inteiro e flags `--sandbox`/`--ask-for-approval`/`-c` do usuário chegam inalterados; o filho não recebe flag de bypass/aprovação que o usuário não passou (crit. 4, restrições).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C12 " tests/integrations/codex-run.cli.test.mjs` — N=1

**C13** — Filho que sai com 0 e com 17 faz o wrapper sair com 0 e 17, também com o destino de observação falhando (fd de relatório fechado e mais de 500 eventos estourando o receptor) (crit. 5, AC4, AC7).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C13 " tests/integrations/codex-run.cli.test.mjs` — N=1

**C14** — Entrada do Codex inexistente → exit 127, stderr com mensagem fixa sem o caminho, stdout vazio, nenhum relatório de eventos (crit. 5).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C14 " tests/integrations/codex-run.cli.test.mjs` — N=1

**C15** — POSIX: SIGINT/SIGTERM enviados ao wrapper chegam ao filho; filho que termina por sinal faz o wrapper terminar pelo mesmo sinal; filho que trata SIGINT e sai 130 faz o wrapper sair 130; eventos anteriores constam do relatório (crit. 5). No Windows o teste fica `skipped` com motivo `posix-signals` e o limite de TerminateProcess fica declarado no guia.
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C15 " tests/integrations/codex-run.cli.test.mjs` — N=1 (Linux/WSL: skipped 0; Windows: skipped 1)

**C16** — Stdout do wrapper é byte a byte igual ao do filho e incremental (primeira linha lida antes de o filho emitir a segunda); o leitor incremental junta linha partida entre chunks, descarta e conta linha > 64 KiB (`oversizeLine`), fragmento final sem `\n` (`partialTrailingLine`), JSON inválido (`invalidJson`) e tipo desconhecido (`unknownEvent`) (crit. 5).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C16 " tests/integrations/codex-run.cli.test.mjs` — N=1
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C16b " tests/integrations/line-reader.unit.test.mjs` — N=1

**C17** — Stderr do filho (inclusive linhas com forma de JSONL) chega inalterado ao stderr do wrapper e não gera envelope; itens `reasoning` não geram envelope, o canário do texto de raciocínio não aparece no relatório e `reasoningExcluded` conta cada item (crit. 5, AC4).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C17 " tests/integrations/codex-run.cli.test.mjs` — N=1

### S3 — observar Hermes sem alterar decisões · 5 arquivos novos + fonte Hermes · ~70 KB · ~18k

**C18** — No `PluginManager` real do Hermes 0.21.4 (HERMES_HOME temporário, `python -I -B`), o plugin instalado carrega por `register(ctx)` e registra exatamente os 7 hooks, sem ferramentas, middleware ou comandos; `invoke_hook`, `handle_function_call` e `_dispatch_pre_tool_call_hooks` mantêm a identidade (sem monkey patch) (crit. 6, AC5).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C18 " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)

**C19** — Os 7 hooks disparados (ferramentas por `handle_function_call`; demais por `invoke_hook` com os kwargs dos locais de disparo citados) com kwargs extras e ausentes chegam ao `ingest` real e geram envelopes com `sessionId`, `taskId`, `toolCallId`, `turnId`, `parentSessionId`, `childSessionId`, `subagentId` nativos; `on_session_end` vira `turn_end`, nunca `session_end` nem fim de skill (crit. 6, AC5).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C19 " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)

**C20** — Os callbacks do plugin não contribuem resultado para `invoke_hook` em nenhum dos 7 hooks; `handle_function_call` executa a ferramenta fixture com argumentos idênticos e devolve o resultado dela; nenhuma mensagem de bloqueio é produzida (crit. 7, AC7).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C20 " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)

**C21** — Com `plugins.hook_callback_timeout: 1` e destino que nunca lê o stdin, 300 chamadas por `handle_function_call` executam todas sem bloqueio, cada callback do plugin retorna em < 1 s e `droppedQueueFull` > 0; controle RED: plugin fixture que escreve de forma síncrona no mesmo destino faz o host bloquear a ferramenta (crit. 7).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C21 " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)

**C22** — Destino inexistente (falha de spawn), destino que sai imediatamente e destino que desconecta após uma linha: ferramenta executa inalterada, `deliveryFailed` ≥ 1, nenhuma exceção chega ao host e não há nova tentativa de spawn (crit. 7, Swept retry).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C22 " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)

**C23** — Python não sanitiza, não atribui e não persiste: o registro enviado contém só nomes de `kwargs.json`, valores escalares idênticos (inclusive string de 300 caracteres, recusada depois pela fronteira JS como `too_long`) e `nonScalar` para dict/list; a pasta do plugin e o HERMES_HOME não ganham arquivo do plugin; canários de `args`/`result`/`error_message`/`child_goal` não aparecem no registro (crit. 7).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C23 " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)

### S4 — instalar e remover preservando o que existe · 10 arquivos novos + leitura doctor · ~110 KB · ~28k

**C24** — `plan` e `install`/`uninstall` sem `--apply` não alteram nenhum byte, mtime ou entrada do alvo e não executam agentes-sentinela presentes no PATH; a saída JSON lista as mudanças próprias por arquivo/evento, nos três agentes (crit. 8, AC6).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C24 " tests/integrations/install.cli.test.mjs` — N=1

**C25** — `install --apply` altera só o alvo indicado; chaves alheias (`permissions`, `env`, `disableAllHooks`, `allowManagedHooksOnly`, hooks de terceiros) ficam deep-equal; `config.toml` do Codex (com `[hooks.state]`) e `config.yaml` do Hermes (com `plugins.enabled`) ficam byte a byte iguais (crit. 8, restrições).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C25 " tests/integrations/install.cli.test.mjs` — N=1

**C26** — JSON malformado, raiz não objeto, `hooks` com forma inválida e arquivo > 1 MiB → exit 3, arquivo inalterado, nenhum registro criado, para Claude e Codex (crit. 8).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C26 " tests/integrations/install.cli.test.mjs` — N=1

**C27** — Arquivo de configuração ou `.skill-me` que resolve para fora do alvo (link/junção) → exit 4 sem escrita fora nem dentro; alvo igual ao diretório de política gerenciada do Claude → 4; `--target` ausente ou inexistente → 2 (crit. 8). Link de arquivo sem privilégio no Windows: subcaso `skip` com motivo, junção de diretório obrigatória.
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C27 " tests/integrations/install.cli.test.mjs` — N=1

**C28** — Instalar duas vezes deixa exatamente um grupo próprio por evento e valores alheios preservados; a segunda execução sai 0 sem mudança de bytes (crit. 9, AC6).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C28 " tests/integrations/install.cli.test.mjs` — N=1

**C29** — Concorrência: lock presente → exit 4 com arquivos inalterados; 6 `install --apply` paralelos → um grupo próprio por evento, cada código ∈ {0,4}, ao menos um 0; edição externa entre `plan` e `install --apply` é preservada (crit. 9).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C29 " tests/integrations/install.cli.test.mjs` — N=1

**C30** — Edição externa entre a leitura e o `rename` (sistema de arquivos com mutação na releitura) → resultado `conflict`/4, nenhuma escrita sobre o arquivo e conteúdo externo preservado (crit. 9).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C30 " tests/integrations/install-apply.unit.test.mjs` — N=1

**C31** — `uninstall --apply` remove só grupos cujo hash confere com o registro; grupos/valores alheios ficam deep-equal ao original; arquivo, objeto `hooks` e chaves que a instalação criou somem só quando ficam vazios (crit. 10, AC6).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C31 " tests/integrations/install.cli.test.mjs` — N=1

**C32** — Grupo próprio editado pelo usuário é preservado e reportado como conflito (exit 4); segunda remoção não muda nenhum byte e continua reportando o conflito (crit. 10).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C32 " tests/integrations/install.cli.test.mjs` — N=1

**C33** — Registro impossível de gravar depois de a configuração ser escrita → exit 5 com `status: "incomplete"` e estado por passo, nunca 0; depois de corrigir, reinstalar sai 0 adotando o grupo e a remoção funciona (crit. 10).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C33 " tests/integrations/install.cli.test.mjs` — N=1
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C33b " tests/integrations/install-apply.unit.test.mjs` — N=1

**C34** — Hermes: install grava os 3 artefatos com hash no registro e não habilita o plugin; pasta `skill-me-observer` alheia → 4 sem escrita; artefato editado é preservado na remoção com 4; arquivo extra do usuário na pasta é preservado (crit. 8–10).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C34 " tests/integrations/install.cli.test.mjs` — N=1

**C35** — Em cada agente, o mapa caminho→SHA-256 de todos os arquivos da skill de terceiro (caminhos com espaço e Unicode) é idêntico antes/depois de instalar, observar e remover, e nenhum arquivo é acrescentado à árvore (crit. 11, AC8).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C35 " tests/integrations/skill-tree-hash.cli.test.mjs` — N=1 (observação Hermes: subcaso skip com motivo se runtime ausente)

### S5 — falhas, limites, fixtures e fronteira · 8 arquivos novos · ~80 KB · ~20k

**C36** — Hook Claude e hook Codex: consumidor ausente, recusa (evento fora da allowlist), desconexão (fd de relatório fechado), timeout (stdin aberto além de 2000 ms), entrada inválida e entrada > 1 MiB → exit 0, stdout vazio e nenhum campo de decisão, nos 12 casos (crit. 12, AC7).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C36 " tests/integrations/failure-matrix.cli.test.mjs` — N=1

**C37** — Hermes: os mesmos seis casos (sem entrega, recusa, desconexão, travado, kwargs inválidos, fila/registro acima do limite) → callbacks `None`, ferramenta inalterada (crit. 12).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C37 " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)

**C38** — Wrapper: sem relatório, eventos recusados, consumidor do stdout desconectado (EPIPE), relatório não drenado (sai em ≤ 1000 ms além do filho), JSONL inválido e linha/receptor acima do limite → código do filho preservado nos seis (crit. 12).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C38 " tests/integrations/failure-matrix.cli.test.mjs` — N=1

**C39** — Canários sintéticos em entrada de ferramenta, resultado, prompt, caminho, erro e raciocínio não aparecem nas saídas e registros próprios do debugger nem em arquivo criado por ele no alvo ou no TEMP dedicado, para hook Claude, hook Codex e wrapper. Nos hooks, stdout e stderr próprios ficam sem canários; no wrapper, o relatório e qualquer conteúdo acrescentado pelo debugger ficam sem canários. O stdout nativo do Codex é repassado byte a byte e seu stderr é preservado conforme C16/C17 e o plano; a prova distingue esse repasse das saídas próprias do debugger (crit. 12, #5).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C39 " tests/integrations/failure-matrix.cli.test.mjs` — N=1

**C40** — Toda fixture em `tests/integrations/fixtures/` declara `origin: "synthetic"`, `contract` e `source`, e cada contrato tem ao menos um caso válido e um inválido (crit. 13, AC9).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C40 " tests/integrations/fixtures-inventory.test.mjs` — N=1

**C41** — A matriz do guia separa determinístico, nativo local e E2E real opt-in por agente; toda linha E2E está `pendente` com motivo, nenhuma `pass` (crit. 13, AC9).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C41 " tests/integrations/docs-matrix.test.mjs` — N=1

**C42** — `buildEnvelope` só emite chaves da allowlist; tabela com as seis categorias excluídas (argumentos, resultados, prompts, caminhos, raciocínio, erro livre) em cada `eventKind` mostra o canário ausente; ID > 256 é omitido, nome fora da regex é omitido, envelope > 4096 bytes é recusado (crit. 14, AC1).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C42 " tests/integrations/boundary.unit.test.mjs` — N=1

**C43** — `MemoryReceiver`: capacidade exata (o 501º é `dropped`), `malformed` para envelope fora do schema, `close()` faz tudo virar `dropped`, `receive` nunca lança, snapshot imutável; o módulo não importa `fs`/`net`/`child_process` (crit. 14).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C43 " tests/integrations/memory-receiver.unit.test.mjs` — N=1

**C44** — Sem consumidor: hook instalado sem variável de relatório não escreve nada (stdout/stderr vazios, nenhum arquivo novo no alvo/TEMP); Hermes sem entrega fica inativo (`enqueued` 0, nenhum processo); o guia não anuncia coletor/ingestão real (crit. 14).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C44 " tests/integrations/failure-matrix.cli.test.mjs` — N=1
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C44b " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C44c " tests/integrations/docs-matrix.test.mjs` — N=1

**C45** — Com integrações instaladas nas fixtures lidas pelo doctor, `doctor --json` continua com `runtimeVerification: "not_performed"` e sua ajuda não ganha flag nem subcomando de integração (crit. 14).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C45 " tests/integrations/doctor-invariants.cli.test.mjs` — N=1

**C46** — Todo envelope dos adaptadores traz `signal` coerente com a origem (`native_hook` hooks, `native_plugin` Hermes, `supervised_exec` wrapper); nenhum adaptador produz outro valor, inclusive `inferred` (AC2).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C46 " tests/integrations/adapters.unit.test.mjs` — N=1

**C47** — `npm test` executa `test:integrations` e o job `verify` da CI roda `npm run test:integrations` nos três SO (Swept observability da entrega; integração declarada no plano).
Proof: `node --test --test-reporter=tap --test-name-pattern="^governance-C1 C3 " scripts/governance-ci.test.mjs` — N=1
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C47 " tests/integrations/fixtures-inventory.test.mjs` — N=1

**C48** — Mapas de cada adaptador cobrem o conjunto inteiro do contrato: Claude 8 eventos, Codex hooks 6, `exec` 8 tipos + desconhecido, 9 tipos de item (incluindo `reasoning` excluído) e Hermes 7 hooks, com `eventKind`, IDs e lacunas esperados por linha (crit. 1, 3, 6).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C48 " tests/integrations/adapters.unit.test.mjs` — N=1

## Swept

- validation: C3, C16, C26, C42, C48.
- failure modes: C13, C14, C21, C22, C33, C36, C37, C38.
- idempotency and retry: C28 (instalar 2×), C32 (remover 2×), C33 (reinstalar adota); C22 — sem retry de transporte, falha é contada e desliga a entrega.
- authorization: C12 (nenhum bypass acrescentado), C25 (confiança, política e sandbox intactos), C27 (política gerenciada recusada), C34 (habilitação Hermes manual).
- concurrency and ordering: C29, C30; IDs nativos sem reordenação/correlação em C1, C7, C19; ordem incremental em C16.
- data lifecycle: C31, C35, C39, C43, C44 — nada persistido; retenção/exclusão de traces na #5/#8.
- external-dependency failure: C14, C21, C22, C38; runtime Hermes ausente → pendente (C18–C23, C37).
- state transitions: ausência → prévia sem mutação (C24) → instalada (C28) → removida (C31); edição posterior → conflito preservado (C32); falha parcial → incompleta → reconciliada (C33).
- observability: C16 e C43 (contadores), C21/C22 (`observer_stats`), C46 (sinal), C41 (matriz de evidências).

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| eventos Claude assinados (8) | `PreToolUse` C1 C4 · `PostToolUse` C1 · `PostToolUseFailure` C1 · `UserPromptExpansion` C5 · `SessionStart` C2 · `SessionEnd` C2 · `SubagentStart` C2 · `SubagentStop` C2; tabela C48 | - |
| eventos Codex hooks assinados (6) | C7 tabela sobre os 6; C48 | - |
| tipos `exec --json` (8 + desconhecido) | `thread.started` `turn.started` `turn.completed` `turn.failed` `item.started` `item.updated` `item.completed` `error` C48; desconhecido C16 | - |
| tipos de item `exec` (9) | 8 mapeados C48 · `reasoning` excluído C17 C48 | - |
| hooks Hermes (7) | C18 registro dos 7 · C19 disparo dos 7 · C20 retorno dos 7 · C48 mapa dos 7 | - |
| caminhos de skill Claude (2) | agente C4 · direto C5 | - |
| categorias excluídas (6) | argumentos · resultados · prompts · caminhos · raciocínio · erro livre — C42 tabela, C39 processos | - |
| motivos de lacuna (6) | `absent` C3 · `not_in_contract` C7 · `invalid_type` C3 · `too_long` C23 C42 · `not_identifier` C42 · `unrecognized_value` C3 | - |
| códigos do instalador (5) | 0 C28 · 2 C27 · 3 C26 · 4 C27 C29 C32 C34 · 5 C33 | - |
| saídas do wrapper (5) | 0 C13 · 17 C13 · 127 C14 · sinal C15 (POSIX) · 130 C15 (POSIX) | Windows: sinal/130 — limite de plataforma declarado |
| casos de falha por adaptador (6 × 4) | hook Claude C36 · hook Codex C36 · Hermes C37 · wrapper C38 | - |
| agentes no hash da skill (3) | Claude · Codex · Hermes — C35 | observação Hermes sem runtime → pendente |
| montagens do comando instalado (3) | Claude forma exec C1 · Codex `cmd /C`/`sh -lc` C7 · Hermes `PluginManager` C18 | E2E com agente real — pendente (AC9) |

- Claims que nomeiam código de saída/forma de resposta: C1, C7, C10–C15, C24–C34, C36, C38 — cada um com prova que atravessa a CLI/processo real.
- Nenhum outro check afirma mais do que o caso que sua prova exercita.

## Handoff

Um batch com todas as fatias. Leitura existente: task 41 KB, `docs/agent-compatibility.md` 40 KB,
módulos do doctor reutilizados (~70 KB: `config-projection`, `hooks-shape` parcial, `agent-resolution`,
`config-sources`, `snapshot-read`, `fs-adapter`, `cli-args`), CI/governança 13 KB e fonte Hermes lida
~40 KB ≈ 204 KB → ~51k. Novos arquivos estimados: fonte JS ~100 KB, Python ~10 KB, testes ~130 KB,
fixtures ~25 KB, guia ~25 KB ≈ 290 KB → ~73k. Total ≈ 124k < 150k: S1–S5 cabem num batch; nenhuma
fronteira de handoff dentro da entrega. Verifier é do orquestrador, depois do último commit.

Fechamento do batch único (16/10/2026):

- **Fronteira:** C1–C48 fechados em `e60b5e0` (evidência em `.checks/issue-4-integracoes.build.md`); C15 provado no WSL; C18–C23, C37 e C44b nativos só no Windows local, pendentes nas demais plataformas.
- **Decidido durante o build:** nenhuma decisão nova do proprietário; a nota do coordenador (`.checks/issue-4-integracoes.coordinator.md`) levou às correções de `5612060` e `9b433b5`. Ponto aberto para o orquestrador: redação de C39 para o stdout nativo do wrapper (ver build).
- **Abandonado:** envelope montado em Python (rascunho anterior: duplicaria a fronteira); `fs.write` no exportador (trava o encerramento no Windows com pipe cheio); espera por `drain` no fim do wrapper (`drain` só existe após backpressure); acrescentar `packageDir` ao retorno do Codex no doctor (mudaria um export fora do recorte).

Correções do round 1 da verificação independente (16/10/2026):

- **Fronteira:** F1–F4 fechados em `5521819`..`7de3bc2` (evidência em `.checks/issue-4-integracoes.build.md`, "Correções da verificação independente — round 1"); Checks e Landing inalterados.
- **Decidido durante o build:** nada novo do proprietário. F5/C39 aguarda resposta humana à pergunta do orquestrador; texto, prova e comportamento preservados.
- **Abandonado:** prazo do relatório contado do `flush` (excedia 1000 ms além do filho); reserva 0 (custo medido de 23–63 ms fora do timer); comparar só caminhos do HERMES_HOME (não detecta acréscimo a arquivo do host); comparar com a execução `inactive` (cenário diferente); tratar todo link em `__pycache__` como `target_escape` (link dentro do alvo não escapa: é alheio).

### Coordenação durante F2 — 17/10/2026

O coordenador encontrou um contraexemplo no fallback de grupo ainda em implementação:
`replacementMode({mode: 0o604}, false)` mantinha `0604`; um membro somente do grupo
antigo, antes sem leitura, vira "outros" e ganha leitura após mudar o gid. Isso é
ampliação dentro de F2/AC6. Detalhes e sonda somente leitura em
`.checks/code-review/issue-4/coordinator-f2-group-feedback.md`. Conferir antes de
fechar F2, sem alterar a barra dos checks. Nenhum código/teste foi corrigido pelo
coordenador; esta nota é evidência de coordenação e deve ser preservada/encerrada
com a prova correspondente pelo builder.

Encerramento pelo builder (17/10/2026): contraexemplo confirmado — RED na regra de
`4f2932a`: `I4-C25c` (`0604` sem grupo atribuível → `0604`) e `I4-C25b` com EPERM
injetado no `chown` (`before_content`: o destinatário "só do grupo antigo" ganha
leitura). A regra passou à interseção de grupo e "outros" (linha correspondente em
Landing). As provas conferem as quatro classes de pertencimento pelo modelo POSIX de
`tests/integrations/helpers/posix-access.mjs`, na regra pura (512 modos) e no CLI real
POSIX (0640 e 0604 com grupo não atribuível); a barra dos checks não mudou. Evidência
em `.checks/issue-4-integracoes.build.md`.

Correções da revisão formal round 1 (17/10/2026):

- **Fronteira:** F1–F4 fechados em `bdc1969`..`bb05bcc` (F2 em `4f2932a` + `38bc660`), evidência em `.checks/issue-4-integracoes.build.md`, "Correções da revisão formal — round 1"; Checks inalterados; Landing +4 linhas (F2, regra de grupo corrigida, F3, F4). Achado irmão de F1 (pasta própria do plugin como junção → remoção apaga bytecode de outro plugin) só reportado: aguarda decisão.
- **Decidido durante o build:** nada novo do proprietário; o coordenador apontou o contraexemplo 0604 da regra de grupo (nota acima, encerrada em `38bc660`).
- **Abandonado:** limpar o staging pelos nomes de `ARTIFACT_NAMES` (era o defeito F1); `chmod` depois do conteúdo (janela legível; mutação detectada); limitar só o grupo novo aos bits de "outros" (contraexemplo 0604); adotar grupo editado pela assinatura (apagaria a edição na remoção); medir caracteres em vez de bytes UTF-8 e conferir o tamanho só na instalação (mutações detectadas).

### Conferência de coordenação — container `plugins`

Antes de fechar a remoção, conferir também o cleanup do container: instalar sem
`plugins`, mover o container para `plugin-store`, ligar `plugins` por junction e
remover o observer. `created.pluginsDir` descreve o passado; `removeDirIfEmpty`
não deve apagar o link posterior do usuário quando o destino fica vazio. A
observação ainda é por leitura, sem prova executada pelo coordenador. Cenário e
esperado em `.checks/code-review/issue-4/coordinator-container-link-feedback.md`;
fechar se confirmado dentro de AC6/C34, preservando a barra existente.

Encerramento pelo builder (17/10/2026): confirmado no Windows — com `created.pluginsDir`
true e `plugins` trocado por junção para `plugin-store`, a remoção saía `0 applied` e o
`rmdir` final apagava a junção quando o destino ficava vazio; o mesmo helper apagava uma
junção posta no lugar de `.skill-me` (irmão, comum aos três agentes). No POSIX o `rmdir` em
symlink já falhava (`ENOTDIR`) e o link ficava: lá a regressão é guarda. Corrigido em
`043f287` (`removeDirIfEmpty` só remove diretório real); `I4-C34d` confere o link mantido, o
destino vazio, as mudanças exatas e, como controle, a saída do diretório real criado pela
instalação. A barra dos checks não mudou. Evidência em `.checks/issue-4-integracoes.build.md`,
"Continuidade AC6 — pasta própria do plugin Hermes".

Continuidade AC6 — pasta própria do plugin Hermes (17/10/2026):

- **Fronteira:** o achado irmão de F1 acima ("só reportado: aguarda decisão") foi classificado pelo orquestrador como continuidade do AC6 já aprovado e da fronteira de propriedade de F1 — não é nova feature, issue nem decisão de produto; nenhuma autorização humana nova foi pedida ou presumida, e a formulação anterior fica como histórico. Fechado em `42516ad`: pasta própria como junção/link (dentro ou fora do alvo) ou arquivo → 4 na prévia e na aplicação de install e uninstall, nada lido nem apagado através dela, reconferência antes de cada exclusão. Defeitos adjacentes do mesmo AC6/C34, encontrados durante a correção e tratados pelo builder dentro do escopo (sujeitos à conferência do orquestrador/Verifier): `01faaac` (remoção sem registro apagava bytecode), `043f287` (nota do coordenador e irmão `.skill-me`), `6df4d4c` (artefato trocado por link de arquivo; bytecode ao lado de fonte preservada). Checks e Landing inalterados; regressões `I4-C34b`..`I4-C34e`; evidência em `.checks/issue-4-integracoes.build.md`, "Continuidade AC6 — pasta própria do plugin Hermes".
- **Decidido durante o build:** nada novo do proprietário. A classificação de continuidade é do orquestrador; a nota do coordenador (container `plugins`) foi confirmada e encerrada acima.
- **Abandonado:** tratar `ENOTDIR` como ausente em `assertContained` (mudaria Claude/Codex com `.skill-me` arquivo; a pasta do plugin passou a ser conferida antes dos caminhos dos artefatos); recusar só `isSymbolicLink` (o arquivo regular no lugar da pasta continuaria substituído pelo rename do staging no Windows); reconferir só no início da remoção (troca entre exclusões passa — M-PDb); manter o cache pela lista lida do estado (aplicação apagava o que a prévia não listava — M-PDc); reter também o bytecode com o `__init__.py` já ausente (deixaria cache órfão da nossa fonte e mudaria o código de saída sem necessidade demonstrada).

### Verificação independente round 3 — registro parcial (17/10/2026)

O Verifier encerrou `7083702` com FAIL, 47/48 claims: C34/AC6 continua
incompleto. Instalar Hermes, editar apenas `kwargs.json` e remover produz registro
parcial só desse arquivo; uma fonte `__init__.py` alheia e seu bytecode criados
depois ficam fora do registro. Nova remoção preserva a fonte, mas apaga o bytecode
mesmo retornando conflito 4. Reproduzido com dados sintéticos no Windows e WSL;
nenhum arquivo pessoal afetado. Relatório autêntico em
`.checks/issue-4-integracoes.verified.md`; histórico PASS round2 preservado no Git.
Os lotes de 68 testes passaram (Windows 66/2 skips, WSL 60/8 skips), mas não
cobriam essa transição. F2/F3/F4 e os cenários nomeados de F1 passaram.

A correção desta perda e suas provas continuam dentro de AC6 já aprovado; o
orquestrador encaminha ao Claude sem alterar os Checks. O limite de três rodadas
independentes de `tlc-implement/references/verify.md` foi atingido. Não existe
exceção humana específica para round4: preparar primeiro correção/provas/commits
e então solicitar uma rodada independente adicional. Nenhum contador/histórico
foi alterado. O motor formal segue em uma tentativa consumida de duas e não deve
iniciar a segunda antes de nova verificação independente válida.

### Conferência de coordenação — cache vazio no registro parcial

Durante a correção, a leitura do coordenador apontou que `cacheDirOwned` ainda
descreve apenas um `__pycache__` real. Conferir o cleanup do diretório vazio
criado pelo usuário depois da remoção parcial: com `kwargs.json` restaurado e
fonte alheia presente, a aplicação pode conservar fonte/bytecode mas remover
esse diretório. Ainda não reproduzido pelo coordenador; cenário/esperado em
`.checks/code-review/issue-4/coordinator-partial-cache-directory.md`. Confirmar
ou refutar dentro de AC6/C34, sem alterar os Checks nem limites; registrar o
resultado aditivamente. O coordenador não editou produto/testes.

Encerramento pelo builder (17/10/2026): confirmado em `7083702` e em `c066a5f` (primeiro
commit desta correção) — o `__pycache__` vazio do usuário saía com fonte alheia ou sem fonte
no registro parcial (sem fonte, a pasta inteira e `0 applied`) e ao lado da fonte registrada
editada. Corrigido em `6f1740d`: o plano decide a remoção do `__pycache__` pela mesma regra do
bytecode, o diretório sem fonte registrada é reportado e a fonte é reconferida antes do
`rmdir`; linhas novas em `I4-C34f`/`I4-C34g` com controle normal. A barra dos checks não mudou.
Evidência em `.checks/issue-4-integracoes.build.md`, "Correção pós-verificação round 3 —
registro parcial Hermes".

Correção pós-verificação round 3 — registro parcial (17/10/2026):

- **Fronteira:** achado do Verifier (bytecode de fonte nova apagado com 4 após registro parcial)
  fechado em `c066a5f`..`6f1740d`, com RED no produto `7083702` em cópias isoladas (Windows e
  WSL) e GREEN nos dois batches de 70 testes. Defeitos da mesma raiz no mesmo AC6/C34,
  encontrados pela sonda RED e tratados no escopo, comunicados no retorno: remoção com
  `kwargs.json` restaurado (`0 applied` apagando bytecode alheio), bytecode sem fonte,
  reinstalação sobre a sobra registrando os três artefatos, fonte posta durante a remoção, e a
  nota do coordenador acima. Checks e Landing inalterados; regressões `I4-C34f`, `I4-C34g`.
  Correção aditiva explícita das duas afirmações anteriores sobre o cache órfão na evidência build.
  Nenhuma rodada independente nova foi pedida ou executada; limite de três rodadas e estado
  formal intactos.
- **Decidido durante o build:** nada novo do proprietário. A classificação de continuidade é do
  orquestrador; a nota do coordenador foi confirmada e encerrada acima.
- **Abandonado:** decidir pelo conteúdo atual do `__init__.py` (cópia exata do pacote posta pelo
  usuário seria tomada por nossa, como as cópias de `I4-C34b`); confiar no código 4 (o conflito
  não impedia a exclusão); recusar toda reinstalação sobre registro parcial (perderia a
  reconciliação por conteúdo exato); reconferir a fonte antes da pasta e do `__pycache__` (através
  de uma pasta trocada por junção leria a fonte de outro plugin e apontaria o arquivo errado,
  contra `I4-C34c`); ler o cabeçalho do `.pyc` (não comprova origem; a decisão vem do registro).

### Autorização do proprietário para concluir — 17/10/2026

Após as correções/provas em `cba2752`, o proprietário autorizou nesta conversa:
"use quantas rodadas precisar. após terminar pode fazer o merge e finalizar.
depois em uma nova sessão pode pegar uma nova issues e planejar e fazer o loop
de desenvolvimento." Registro completo e limites em
`.tasks/issue-4-integracoes.md`, seção "Autorização de continuidade". As notas
anteriores de ausência de exceção ficam como histórico; as rodadas necessárias
agora estão autorizadas, sem apagar relatórios nem enfraquecer Checks. O teto
formal exclusivo da #4 foi registrado como 10 (máximo do motor), sem mudar o
core ou o limite de outras issues. Merge autorizado após verificações aprovadas;
nova sessão somente depois da conclusão confirmada da #4.
