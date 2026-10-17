# Observação de execuções — integrações (issue #4)

Este guia descreve as integrações de observação com Claude Code, Codex e Hermes,
separadas do diagnóstico estático do `doctor` (ver `docs/agent-compatibility.md`).
Elas cobrem o recorte aprovado em 16/10/2026: **fronteira mínima e receptor em
memória**. Privacidade completa fica na #5, transporte e armazenamento na #8,
timeline e atribuição de skill na #6.

Não há coletor nem ingestão real. Sem o consumidor da #8, cada observação fica na
memória do processo que a produziu e é descartada quando ele termina: nada é gravado
nem enviado pelo debugger.

## O que roda onde

| Integração | Onde roda | O que acontece com os dados |
| --- | --- | --- |
| Hook Claude (`settings.json`) | processo iniciado pelo Claude a cada evento | stdin → adaptador → fronteira → receptor em memória; stdout vazio, exit 0; descartado ao sair |
| Hook Codex (`hooks.json`) | processo iniciado pelo Codex a cada evento | igual ao Claude |
| Wrapper `integrations run --agent codex` | processo único durante o `codex exec` | stdout = JSONL nativo do Codex, byte a byte (inclusive itens de raciocínio que o próprio Codex emitir — saída do agente, não telemetria do debugger); stderr = do Codex; o receptor vive até o fim do `exec` e é descartado |
| Plugin Hermes `skill-me-observer` | dentro do processo Hermes | sem `SKILL_ME_HERMES_DELIVERY`: inativo (callback devolve `None`, sem fila, thread ou processo); com ele: projeção dos nomes de `kwargs.json`, fila de 256, entrega a um processo `integrations ingest` |
| Exportador de fixture | só com `SKILL_ME_OBSERVER_REPORT_FD` definido pelos testes | uma linha JSON com envelopes minimizados e contadores, num pipe; a instalação nunca define essa variável |

## Envelope v1

`{ schemaVersion: 1, source: { agent, mechanism, contract }, signal, eventKind,
nativeEvent, ids, fields, gaps, observedAt }`. O contrato completo (tipos, enums,
limites, lacunas) está na seção "Fronteira mínima — assinatura fechada (U1)" de
`.tasks/issue-4-integracoes.md`.

- `signal`: `native_hook`, `native_plugin` ou `supervised_exec`. Nenhuma inferência é
  produzida nesta entrega; atribuição de skill é da #6.
- `ids`: IDs nativos inalterados (nunca truncados); nenhuma correlação é calculada.
- `gaps`: `<campo>:absent | not_in_contract | invalid_type | too_long | not_identifier |
  unrecognized_value` — um campo sem valor confiável vira lacuna, nunca default.
- Nunca saem do debugger: argumentos e entrada de ferramenta, resultados, prompts,
  caminhos, raciocínio e textos livres de erro.

## Comandos

```
node src/integrations/cli.mjs plan      --agent <claude|codex|hermes> --target <dir> [--json]
node src/integrations/cli.mjs install   --agent <claude|codex|hermes> --target <dir> [--apply] [--json]
node src/integrations/cli.mjs uninstall --agent <claude|codex|hermes> --target <dir> [--apply] [--json]
node src/integrations/cli.mjs run --agent codex [--codex-entry <arquivo>] -- <argumentos de codex exec>
```

`--target` é obrigatório e não tem default. Sem `--apply` nada é escrito e nenhum
agente é iniciado. Alvos: Claude `<dir>/settings.json`; Codex `<dir>/hooks.json`
(`config.toml` nunca é escrito); Hermes `<dir>/plugins/skill-me-observer/`
(`config.yaml` nunca é escrito). O registro próprio fica em
`<dir>/.skill-me/<agente>-install.json` e guarda só hashes das entradas/artefatos
próprios.

| Código | Significado |
| --- | --- |
| 0 | concluído ou nada a fazer |
| 2 | uso inválido ou alvo inexistente |
| 3 | configuração inválida/ilegível — não é substituída; também quando a mudança deixaria o arquivo acima de 1 MiB, o teto de leitura do próprio instalador (`output_too_large`, recusado antes de escrever, inclusive na prévia) |
| 4 | conflito — lock, mudança durante a aplicação, link para fora do alvo, política gerenciada, artefato alheio ou entrada própria editada (preservada) |
| 5 | incompleto — falha de E/S depois de iniciar; o estado de cada passo é reportado |

O wrapper devolve o código do Codex; sinal do Codex é reemitido (POSIX); falha ao
iniciar sai 127 (não encontrado) ou 126.

Reescrita de `settings.json`/`hooks.json` no POSIX: o arquivo novo mantém os bits de
modo e o grupo do original e nunca concede mais acesso do que ele — o temporário nasce
só com os bits de dono e recebe grupo e modo antes do conteúdo; se o grupo original não
puder ser atribuído, grupo e "outros" recebem só o que os dois já concediam no original
(quem pertencia só ao grupo antigo passa a "outros" e não ganha acesso). O dono passa a
ser quem executa o comando; ACL (POSIX ou Windows), atributos estendidos e bits
especiais não são preservados nem detectados. No Windows nada disso é aplicado.

### Confiança continua manual

| Agente | Passo manual |
| --- | --- |
| Claude | hooks de settings só rodam depois da confiança do workspace; revise em `/hooks` |
| Codex | revise e confie nas entradas novas em `/hooks`; hooks de projeto exigem projeto confiável |
| Hermes | `hermes plugins enable skill-me-observer` (o instalador não altera `plugins.enabled`) |

## Caminhos de uso de skill

| Agente | Caminho | Classificação | Fonte |
| --- | --- | --- | --- |
| Claude | agente — ferramenta `Skill` (`PreToolUse`/`PostToolUse`, `tool_input.skill`) | contrato+fixture | https://code.claude.com/docs/en/hooks e https://code.claude.com/docs/en/permissions#match-by-input-parameter (16/10/2026) |
| Claude | direto — `/nome` (`UserPromptExpansion` `slash_command`) | contrato+fixture | https://code.claude.com/docs/en/hooks, seção UserPromptExpansion (16/10/2026) |
| Codex | início de skill | indisponível | openai/codex `rust-v0.162.1`, `codex-rs/hooks/src/schema.rs`: nenhum evento de skill; ler `SKILL.md` é só `tool_pre`/`tool_post` |
| Hermes | `on_skill_lifecycle` (`action: loaded` etc.) | nativo local | Hermes 0.21.4, `tools/skill_usage.py:467-479`, disparado pelo `invoke_hook` real no teste nativo |

## Cobertura por mecanismo

| Agente | Mecanismo | Situação | Fonte |
| --- | --- | --- | --- |
| Claude | `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `SessionStart`, `SessionEnd`, `SubagentStart`, `SubagentStop`, `UserPromptExpansion` | assinados | code.claude.com/docs/en/hooks |
| Claude | `UserPromptSubmit`, `Stop` e demais eventos | não assinados (payload traz prompt/mensagem; nenhum critério os exige) | code.claude.com/docs/en/hooks |
| Codex | hooks locais `PreToolUse`, `PostToolUse`, `SessionStart`, `SessionEnd`, `SubagentStart`, `SubagentStop` | assinados; `PostToolUse` sem sucesso/falha no contrato (`outcome:not_in_contract`) | `rust-v0.162.1` `hooks/src/schema.rs` |
| Codex | hosted tools (ex.: WebSearch) | sem cobertura — não passam por hooks locais | https://learn.chatgpt.com/docs/hooks, "Tool coverage" |
| Codex | `exec --json` (`thread.*`, `turn.*`, `item.*`, `error`) | wrapper supervisionado | `rust-v0.162.1` `exec/src/exec_events.rs` |
| Hermes | `pre_tool_call`, `post_tool_call`, `on_skill_lifecycle`, `on_session_start`, `on_session_end`, `subagent_start`, `subagent_stop` | registrados por `register(ctx)`; `on_session_end` = fim de run/turno (`turn_end`) | Hermes 0.21.4 `hermes_cli/plugins.py` |

## Evidências por agente

| Agente | Determinístico | Nativo local | E2E real opt-in |
| --- | --- | --- | --- |
| Claude | fixtures `claude-code-hooks@docs-2026-10-16` pelo comando exec gravado em `settings.json` | não executado: o Claude não foi iniciado (metadado local do launcher 2.1.299.0, sem verificação de runtime) | pendente: exige sessão real com confiança de workspace e modelo; não autorizado nesta entrega |
| Codex | fixtures `codex-hooks@rust-v0.162.1` pela linha gravada em `hooks.json`, executada como o `command_runner.rs` faz; wrapper com Codex falso | não executado: o Codex não foi iniciado | pendente: exige `codex exec` real com credencial; não autorizado nesta entrega |
| Hermes | fixtures `hermes-plugin-hooks@0.21.4` pelo adaptador e pelo `ingest` | executado: `PluginManager`, `invoke_hook` e `handle_function_call` reais do Hermes 0.21.4 local, HERMES_HOME temporário, `python -I -B`, sem modelo (Windows) | pendente: exige sessão Hermes com modelo; não autorizado nesta entrega |

Plataformas: Windows local executado; Linux por WSL quando registrado em
`.checks/issue-4-integracoes.build.md`; macOS só pela CI declarada, nunca por
simulação de caminho.

## Limites conhecidos

- Windows: terminar o wrapper externamente (TerminateProcess) não executa handlers e
  o Codex segue — mesmo comportamento do `@openai/codex/bin/codex.js` oficial;
  Ctrl+C de console chega aos dois processos.
- Windows: o shim npm `codex.cmd` exige shell; sem `--codex-entry` o wrapper recusa
  com 127. Use `--codex-entry <prefixo npm>\node_modules\@openai\codex\bin\codex.js`.
- Codex no Windows roda hooks por `cmd.exe /C`: caminhos do node ou do CLI com `"`,
  `%`, `!` ou quebra de linha são recusados na instalação (código 2).
- Escrita da configuração: lock exclusivo, releitura e comparação de SHA-256 antes do
  `rename`. A janela entre essa comparação e o `rename` não é atômica contra editores
  arbitrários (não há CAS no sistema de arquivos).
- Remoção Hermes apaga também o bytecode que o próprio Hermes grava para o nosso
  `__init__.py` (`__pycache__/__init__.cpython-*.pyc`), só quando é arquivo regular
  num `__pycache__` real dentro do alvo; qualquer outro arquivo na pasta do plugin é
  preservado e reportado. Se o `__init__.py` é preservado — editado, trocado por link
  ou de outro plugin de mesmo nome —, o bytecode dele também fica; artefato que não
  é arquivo regular (link de arquivo) é tratado como alteração preservada. `__pycache__` ou bytecode que é junção/link para fora do
  alvo faz a remoção inteira ser recusada (código 4), sem seguir o link; link que
  fica dentro do alvo é tratado como alheio e preservado. A própria pasta
  `plugins/skill-me-observer` só é nossa como diretório real: trocada por
  junção/link (para dentro ou para fora do alvo) ou por um arquivo, instalação e
  remoção recusam com 4, também na prévia, sem ler, apagar ou registrar nada através
  dela. Sem registro de instalação nada da pasta é removido, nem o bytecode. Antes de
  cada exclusão a remoção reconfere que a pasta e o `__pycache__` continuam
  diretórios reais (janela não atômica, como na escrita da configuração). Ponto de
  montagem de volume (Windows) ou bind mount (POSIX) aparece como diretório real e
  não é distinguido; criá-lo exige privilégio.
- Diretórios que a instalação criou (`plugins` do Hermes, `.skill-me` dos três
  agentes) saem na remoção só quando vazios e ainda diretórios reais: se o usuário
  os trocou por junção/link, a remoção conclui o que é nosso e o link fica.
- Os comandos instalados apontam para o node e para este checkout por caminho
  absoluto: mover o repositório exige reinstalar.
