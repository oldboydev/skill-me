# Issue #4 — observar execuções em Claude Code, Codex e Hermes

> Plano e recorte U1 aprovados pelo proprietário em 16/10/2026. Implementar com
> **tlc-implement**, perfil `light`. Cada critério vira check com prova pelo número.
> Grok ou Claude implementa e executa as provas; Codex local revisa em processo novo,
> cópia isolada e sandbox somente leitura. Nada em `Unresolved` é autorização para
> decidir escopo durante a implementação.

## Intent

A execução de uma skill ocorre dentro do agente. O usuário não consegue reconstruí-la
apenas lendo `SKILL.md`; o `doctor` existente informa presença, configuração e evidência
estática, mas não recebe eventos. A issue não fornece métricas de impacto.

A entrega observa os mecanismos expostos por versões identificadas de Claude Code,
Codex e Hermes, encaminha eventos ao consumidor do núcleo e permite instalar/remover
as integrações preservando configurações, confiança e arquivos de terceiros. O relatório
da entrega distingue contratos documentados, fixtures e execução real.

14 critérios em 5 fatias observáveis · 2 contratos externos novos ·
0 decisões de escopo bloqueantes; U1 resolvida por aprovação explícita.

Status: **In Progress**. Aprovação do proprietário em 16/10/2026:
“Aprovo o recorte recomendado para a #4. Pode seguir com a fronteira mínima e o
receptor em memória, mantendo privacidade completa e armazenamento nas #5 e #8.”
O pedido autoriza implementação desse recorte e seus detalhes técnicos, sem instalar
nada no perfil pessoal. O builder fecha abaixo o contrato exato antes de código e
registra as decisões em Landing, sem reabrir esta aprovação.
Base: `236e999fddb4c096634284e426d9d4db5ac526fa`.
Branch da entrega: `codex/issue-4-integracoes`.

### Recorte e tamanho

Uma task e uma branch/PR para a issue inteira, conforme AGENTS.md. As fatias são:
observar Claude; observar Codex e supervisionar `exec`; observar Hermes; instalar e
remover com segurança; comprovar tolerância a falhas e cobertura. Nenhuma sub-issue
foi criada. O tamanho vem de três contratos nativos diferentes, um modo supervisionado
e mutações reversíveis em configurações, não da quantidade de arquivos.

A fronteira que exige decisão é anterior às três integrações: hoje não existe
consumidor de eventos nem política compartilhada de sanitização. A issue atribui essas
responsabilidades a #8 e #5. Implementá-las integralmente em #4 ampliaria o escopo;
implementar três substitutos privados duplicaria regras. A recomendação em U1 mantém
esta entrega e torna a limitação verificável, sem prometer o núcleo de traces.

## Criteria

### S1 — observar Claude Code e distinguir caminhos de uso de skill

1. Em fixture vinculada a uma versão do Claude, a integração encaminha os fatos de
   `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, início/fim de sessão e subagentes
   que o contrato dessa versão expõe, conservando nomes e identificadores nativos;
   campos/eventos ausentes aparecem como lacunas, nunca como valores fabricados (AC1).
2. A prova do Claude contém dois cenários separados: invocação pelo agente através
   da ferramenta `Skill` e invocação direta por `/nome`. Quando o contrato comporta
   `UserPromptExpansion`, o segundo cenário observa esse evento; não depende de
   `PreToolUse` da ferramenta `Skill`. Um caminho não suportado fica explicitamente
   pendente ou indisponível com a fonte que fundamenta a classificação (AC2, AC3).

### S2 — observar Codex e acompanhar uma execução supervisionada

3. Para uma versão contratada do Codex, os hooks locais encaminham ferramentas,
   resultados e ciclo de vida disponíveis sem afirmar cobertura de hosted tools.
   Sem sinal nativo de início de skill, leitura de `SKILL.md` não produz evento
   nativo de execução nem atribuição forte; indicação supervisionada e eventual
   inferência ficam identificadas como tais (AC1, AC2, AC4).
4. No modo supervisionado, `codex exec --json` é iniciado com o vetor de argumentos
   fornecido, acrescido apenas de `--json` quando necessário, sem remontar texto em
   shell. `cwd`, stdin, ambiente de permissões e flags de sandbox/aprovação mantêm
   seus valores; não são acrescentados bypasses ou aprovação automática. Fixtures
   exercitam argumentos com espaços, Unicode e metacaracteres como argumentos literais
   e comprovam que o wrapper não os executa como comandos (AC4, restrições).
5. Com processo filho saindo com 0 ou 17, o wrapper termina respectivamente com 0 ou
   17, inclusive quando o destino de observação falha. A prova cobre também falha de
   spawn e interrupção conforme o contrato da plataforma; eventos `thread.started`,
   `turn.*`, `item.*` e `error` reconhecidos são consumidos incrementalmente.
   Stderr do filho continua separado do canal de eventos; nenhuma mensagem de
   raciocínio é incorporada aos dados do debugger (AC4, AC7, AC9).

### S3 — observar Hermes sem alterar as decisões do agente

6. Um plugin nativo, carregado pelo contrato público `register(ctx)`, recebe
   `pre_tool_call`, `post_tool_call`, `on_skill_lifecycle`, eventos de sessão e
   subagente existentes no perfil validado. Callbacks aceitam campos aditivos,
   preservam os IDs fornecidos e deixam campos ausentes inconclusivos.
   `on_session_end` conserva o significado de fim de run/turno observado, sem
   convertê-lo em fim definitivo da skill ou da identidade de sessão (AC1, AC2, AC5).
7. Callbacks do Hermes devolvem `None`; não modificam argumentos/resultados nem
   retornam diretivas de aprovação, bloqueio ou contexto. Falha, fila cheia ou destino
   travado não propagam exceção nem espera ao callback `pre_tool_call`.
   A prova exercita o dispatch real do perfil em ambiente isolado, com destino que
   não responde e com falha do consumidor, e confirma a execução da ferramenta
   inalterada. Sanitização, persistência e atribuição não são reimplementadas no
   plugin Python (AC5, AC7).

### S4 — instalar e remover preservando o que já existe

8. A prévia de instalação mostra alvos e alterações próprias sem escrever arquivos
   nem iniciar agentes. Aplicação só acontece por operação explícita sobre o alvo
   indicado; políticas gerenciadas, flags de confiança, sandbox e hooks de terceiros
   não são alterados. Configuração ilegível/inválida não é substituída por defaults;
   alvo fora do diretório autorizado ou link que escape dele é recusado (AC6, restrições).
9. Partindo de configurações válidas com entradas de terceiros, instalar duas vezes
   produz uma única instalação própria e mantém os valores alheios. Duas aplicações
   concorrentes não duplicam entradas nem sobrescrevem uma edição externa: uma
   operação conflitante falha explicitamente e deixa os arquivos preexistentes
   preservados (AC6).
10. Remover uma instalação reconhecida exclui somente entradas/artefatos cuja
    identidade e conteúdo correspondem ao registro próprio. Uma alteração posterior
    do usuário na entrada própria é preservada e reportada como conflito; mudanças
    em entradas de terceiros também são preservadas. Remover novamente não apaga
    nada adicional. Uma falha de aplicação/remoção é reportada como incompleta,
    sem declarar sucesso de uma operação parcial (AC6).
11. Em cada agente, o SHA-256 de todos os arquivos da skill de terceiro usada na
    prova é idêntico antes/depois da instalação, observação e remoção. O mecanismo
    instala artefatos próprios fora dessa árvore; não adiciona frontmatter, hooks ou
    marcadores à skill (AC8).

### S5 — observar falhas e limites sem interromper o agente

12. Para cada adaptador, fixtures de consumidor ausente, recusa, desconexão,
    timeout, entrada inválida e limite excedido preservam o fluxo do agente:
    handlers de comando do debugger não emitem decisões e retornam sucesso neutro
    no contrato do evento; callbacks mantêm o retorno neutro do critério 7;
    o wrapper conserva o resultado do filho do critério 5. Conteúdo bruto não é
    despejado em logs, stderr, arquivos temporários ou retries (AC7, AC9, #5).
13. Cada fixture tem origem sintética/sanitizada e referência de versão/contrato,
    incluindo casos válidos e inválidos. Evidências registram separadamente testes
    determinísticos, execução nativa local e E2E real opt-in; agente, credencial,
    confiança ou ambiente ausente gera pendência identificada, nunca pass de E2E.
    A matriz por agente informa o que foi observado e o que continua sem prova
    (AC1, AC9).
14. Dados encaminhados passam pela fronteira compartilhada de #5/#8 aprovada em U1.
    Sem ela disponível, a integração declara observação inativa e deixa o agente
    seguir; um receptor de teste não é anunciado como ingestão real nem como
    sanitização completa. O `doctor` conserva sua interface e
    `runtimeVerification: not_performed`; resultados de execução pertencem à nova
    integração, sem promover a evidência estática anterior (AC1, AC5, AC7, AC9).

## Out of scope

- Implementar a política integral de coleta/retenção da #5 ou o serviço/armazenamento
  de traces da #8 sem nova autorização. U1 trata somente da fronteira mínima.
- Reconstrução de timeline, deduplicação analítica e atribuição de skill (#6);
  comparação de instruções e relatórios de conformidade (#7).
- Pausa/step, dashboard, publicação de pacote, deploy, telemetria remota ou upload.
- Instalação real em perfis pessoais, ligar plugins/hooks no perfil usado pelo
  proprietário, consumir créditos de E2E ou conceder confiança automaticamente.
  Fixtures isoladas não exigem essas ações.
- Monkey patch de agentes, leitura de transcrições pessoais, captura de raciocínio
  privado e alteração de skills de terceiros.
- Refatorar o `doctor`, inventar novos frameworks/pacotes ou modificar o motor
  vendorizado de revisão. Reusar contratos compatíveis pelos exports existentes.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| comandos de integração | ações de prévia, instalação e remoção; defaults seguros | 8–10; "Comandos `integrations`" na assinatura fechada |
| comandos de integração | texto/JSON, códigos de uso/conflito/falha parcial | 8–10; códigos 0/2/3/4/5 na assinatura fechada |
| execução supervisionada | argumentos, stdin, cwd, permissões, saída e interrupção | 4, 5; "Wrapper supervisionado" na assinatura fechada |
| hooks de comando | entrada, saída neutra e falha do consumidor | 1, 3, 12 |
| plugin Hermes | callback público, retorno e falha do destino | 6, 7 |
| fronteira com núcleo | formato, versão, limites e falhas | 14; "Envelope" e "Receptor em memória" na assinatura fechada |
| configuração instalada | identidade própria, conflito, concorrência, remoção | 8–10 |
| guia de uso | instalação isolada, confiança manual, versões e lacunas, próximo passo | 2, 3, 13, 14 |
| telas/HTTP público/agendamento | estados visuais, densidade, autenticação e rate limit | n/a — não há essas superfícies na #4 |

## Swept

- validation: 8, 12, 13, 14; tipos, limites e allowlist do envelope na assinatura fechada.
- failure modes: 5, 7, 10, 12.
- idempotency and retry: 9, 10; não há retry de transporte nesta entrega: falha de
  entrega é contada e a entrega do processo fica desligada (Hermes), sem repetição.
- authorization: 4, 8; confiança continua nativa/manual; instalação pessoal fora do escopo.
- concurrency and ordering: 9 cobre escritores concorrentes e edições externas;
  1, 3, 6 preservam IDs sem reordenar ou correlacionar por conta própria. Ordenação
  da timeline fica em #6; fila e limites de transporte na assinatura fechada.
- data lifecycle: 10, 11, 12, 14; retenção/exclusão de traces ficam em #5/#8.
- external-dependency failure: 5, 7, 12, 13.
- state transitions: 8–10 — ausência → prévia sem mutação → instalação reconhecida
  → remoção reconhecida; edição posterior → conflito preservado, não remoção forçada.
- observability: 2, 3, 12–14; contadores de descarte com vocabulário fechado na
  assinatura fechada.

## Impact

| Front | What changes |
| --- | --- |
| produto existente | `doctor` continua somente leitura e não executa agentes; nenhum campo existente ganha significado de captura real |
| runtime/toolchain | Node >=24, ESM, npm e `node:test` existentes permanecem; plugin Hermes precisa de Python compatível com a instalação testada, sem dependência Python adicional presumida |
| configurações externas | novas entradas/arquivos próprios, acompanhados de registro de instalação; sem migração de configuração alheia |
| dados armazenados | hoje não há traces do produto; #4 não cria banco, retenção ou spool de payloads |
| documentação | nova matriz de execução, separada da matriz estática de `docs/agent-compatibility.md` |
| verificações | novas provas dos adaptadores/instalação; checks existentes de governança, revisão e doctor permanecem; integração à CI no futuro diff deve respeitar a matriz declarada |

### Ancoragem no código

- `src/doctor/agent-resolution.mjs` exporta `resolveAgents`; a descoberta de launchers
  já existe, não deve ser copiada. Perfis/limites do doctor não comprovam execução.
- `src/doctor/config-sources.mjs` exporta os resolvedores de escopo; leitura de caminhos
  pode ser reutilizada, mas os readers atuais não são writers de configuração.
- `src/doctor/fs-adapter.mjs` e `snapshot-read.mjs` já recusam arquivos não regulares
  e limitam leitura; não existe escrita com controle de conflito. Não estender o
  adaptador de leitura apenas para acomodar uma responsabilidade distinta.
- `src/doctor/collector-probe.mjs` prova apenas conectividade TCP loopback e deixa
  `identityVerified: false`; não é protocolo de ingestão nem autentica um coletor.
- `src/doctor/run-diagnostics.mjs` mantém `runtimeVerification` estático. A #4 não
  deve falsificar esse resultado ao usar um consumidor simulado.
- `package.json` é privado; não há servidor, transporte de eventos ou política comum
  de sanitização para reutilizar. `CONTRIBUTING.md` e o guia SPEC citado pela issue
  não foram encontrados no checkout atual; a issue e AGENTS.md vinculam o escopo.

## Decided

As regras de autoria, privacidade, confiança e uma branch/PR já vêm das fontes.
Os dois contratos novos abaixo estão autorizados dentro do recorte aprovado em U1.
O builder registra a assinatura concreta e seus limites antes do código que os utiliza;
essa elaboração técnica não autoriza ampliar coleta, persistência ou transporte remoto.

| Decision | Shape | Alternative rejected |
| --- | --- | --- |
| Fronteira única com #5/#8 | entrada nativa → política comum → entrega ao consumidor; preservação de origem/IDs e descarte explícito; detalhes ainda em U1 | três sanitizadores/coletores privados repetiriam regras das outras issues |
| Propriedade da instalação | registro versionado de alvos e identidade/hash somente de entradas/artefatos próprios; conflito preserva conteúdo editado; nunca backup integral com secrets | restaurar o arquivo inteiro apagaria edições posteriores e copiaria dados alheios |

### Fronteira mínima — assinatura fechada (U1)

Elaboração técnica do recorte aprovado, fechada pelo builder em 16/10/2026 antes de
qualquer teste ou código de produto. Revisa o rascunho anterior desta seção em um
ponto: o plugin Python não monta envelope nem aplica regra da fronteira (exigência
de não duplicar lógica em Python); só projeta nomes de uma lista compartilhada.

Fontes primárias desta assinatura (consulta 16/10/2026, somente leitura):

- Claude: `code.claude.com/docs/en/hooks` (campos comuns, `PreToolUse`, `PostToolUse`,
  `PostToolUseFailure`, `UserPromptExpansion`, `SessionStart`, `SessionEnd`,
  `SubagentStart`, `SubagentStop`, exit codes, forma exec com `args` sem shell,
  timeout em segundos, confiança de workspace) e `/docs/en/permissions` ("Match by
  input parameter": `Skill(skill:<name>)` só existe para campo direto da entrada,
  logo a ferramenta `Skill` recebe `tool_input.skill`). Metadado PE local do launcher:
  `2.1.299.0` (registrado acima); nenhum Claude foi iniciado.
- Codex: tag oficial `openai/codex` `rust-v0.162.1` — `codex-rs/hooks/src/schema.rs`
  (structs `*CommandInput`), `hooks/src/engine/command_runner.rs:384-437` (Windows
  `cmd.exe /C "<linha>"`; POSIX `$SHELL -lc <linha>`), `exec/src/exec_events.rs`
  (eventos JSONL e itens), `exec/src/cli.rs` (`--json`, alias `--experimental-json`)
  e `@openai/codex/bin/codex.js` 0.162.1 local (encaminha SIGINT/SIGTERM/SIGHUP e
  espelha código/sinal do filho). Página `learn.chatgpt.com/docs/hooks`: cobertura
  sem hosted tools, revisão/confiança por hash em `/hooks`.
- Hermes 0.21.4 local (hashes acima): `plugins.py` (`VALID_HOOKS`, `register_hook`,
  `invoke_hook`, opt-in `plugins.enabled`), `plugins_dispatch.py:44-50,209-243`
  (timeout E exceção em `pre_tool_call` viram bloqueio), `model_tools.py:679-1001`
  (`handle_function_call` dispara `pre_tool_call`/`post_tool_call`), locais de disparo
  `tools/skill_usage.py:467-479`, `tools/delegate_tool.py:289-296`,
  `tools/delegate_tool_results.py:364-372`, `agent/conversation_loop.py:770-777`,
  `agent/turn_finalizer.py:707-719`. Sondagem isolada (HERMES_HOME temporário,
  `-I -B`, sem modelos): callback de 3 s com `hook_callback_timeout: 1` bloqueou a
  ferramenta com `pre_tool_call plugin callback timed out or is still running`.

**Fluxo único.** entrada nativa → adaptador do agente (`src/integrations/adapters/`,
só mapeia nomes) → `buildEnvelope` (`src/integrations/boundary.mjs`, única dona de
allowlist, tipos, limites e lacunas) → receptor (`MemoryReceiver`). Claude/Codex
rodam tudo no processo do hook ou do wrapper. Hermes: o callback Python projeta e
enfileira; a fronteira roda no processo Node `ingest`, só quando há entrega
configurada.

**Envelope v1** (objeto JSON, `schemaVersion: 1`):
`{ schemaVersion, source: { agent, mechanism, contract }, signal, eventKind,
nativeEvent, ids, fields, gaps, observedAt }`.

- `source.agent` ∈ `claude|codex|hermes`; `mechanism` ∈ `command_hook|exec_jsonl|
  python_plugin`; `contract` é o contrato contra o qual o adaptador leu, nunca uma
  versão do agente em execução (que nenhum payload fornece): `claude-code-hooks@
  docs-2026-10-16`, `codex-hooks@rust-v0.162.1`, `codex-exec-jsonl@rust-v0.162.1`,
  `hermes-plugin-hooks@0.21.4`.
- `signal` ∈ `native_hook` (hook de comando), `native_plugin` (Hermes),
  `supervised_exec` (wrapper). Nenhuma inferência é produzida nesta entrega; não
  existe valor `inferred`. Atribuição de skill é da #6.
- `nativeEvent`: nome nativo exato (`PreToolUse`, `item.completed`, `pre_tool_call`).
- `ids`: só chaves de `sessionId, promptId, turnId, toolUseId, toolCallId, agentId,
  taskId, threadId, itemId, parentSessionId, parentTurnId, childSessionId,
  subagentId, parentSubagentId`; valor = string nativa inalterada, 1..256 caracteres.
  ID maior, vazio ou não string é omitido com lacuna — truncar fabricaria outro ID.
  Nenhuma correlação entre IDs é calculada.
- `fields`: só nomes permitidos ao `eventKind`; tipos fechados: `name` (regex
  `^[\p{L}\p{N} ._:/@+-]{1,128}$`u, sem truncamento), `enum` (valores listados),
  `integer` (inteiro seguro; `exitCode` com sinal), `boolean`.
- `gaps`: strings `<nome>:<motivo>`, motivo ∈ `absent` (contrato prevê, payload não
  trouxe), `not_in_contract` (o `eventKind` comporta, o contrato do agente não
  fornece), `invalid_type`, `too_long`, `not_identifier`, `unrecognized_value`.
  Valor rejeitado nunca é substituído por default. A fronteira deriva `not_in_contract`
  para todo campo do `eventKind` que o rascunho do adaptador não menciona; o adaptador
  só usa `fieldGaps` quando não consegue traduzir um valor nativo (ex.: `status`
  Hermes desconhecido → `outcome:unrecognized_value`).
- `observedAt`: ISO-8601 do relógio do processo observador no momento do
  processamento, identificado como tal; não é timestamp do agente.
- Envelope serializado > 4096 bytes é descartado (contador `oversize`).
- Fora de toda saída do debugger, sempre: argumentos/entrada de ferramenta
  (`tool_input`, `args`, `command_args`, `arguments`, `command`), resultados
  (`tool_response`, `result`, `aggregated_output`, `content`), prompts (`prompt`,
  `child_goal`), caminhos (`cwd`, `transcript_path`, `file_path`, `changes[].path`),
  raciocínio (itens `reasoning` do `exec --json` são excluídos inteiros, contador
  `reasoningExcluded`; `last_assistant_message`) e textos livres de erro (`error`,
  `error_message`, `message`, `child_summary`). A #5 continua dona da política integral.

`eventKind` → campos permitidos:

| eventKind | campos |
| --- | --- |
| `tool_pre` | `toolName` |
| `tool_post` | `toolName`, `outcome`, `interrupted`, `durationMs`, `errorType` |
| `skill_invocation` | `invocationPath` (`skill_tool`/`direct_command`), `phase` (`pre`/`post`/`expansion`), `skillName`, `commandSource`, `outcome`, `interrupted` |
| `command_expansion` | `expansionType`, `commandName`, `commandSource` |
| `skill_lifecycle` | `action`, `skillName`, `provenance`, `useCount`, `reused`, `reuseAfterPatch` |
| `session_start` | `source`, `platform` |
| `session_end` | `reason` |
| `turn_start` | — |
| `turn_end` | `outcome`, `completed`, `failed`, `interrupted`, `inputTokens`, `cachedInputTokens`, `cacheWriteInputTokens`, `outputTokens`, `reasoningOutputTokens` |
| `subagent_start` | `agentType`, `childRole` |
| `subagent_stop` | `agentType`, `childRole`, `childStatus`, `durationMs` |
| `item` | `phase` (`started`/`updated`/`completed`), `itemType`, `status`, `exitCode`, `toolName`, `mcpServer`, `collabTool` |
| `error` | — |
| `process_exit` | `processExitCode`, `processSignal` |

Enums: `outcome` `success|failure|blocked|completed|failed`; `expansionType`
`slash_command|mcp_prompt`; `source` `startup|resume|clear|compact|fork`; `reason`
`clear|resume|logout|prompt_input_exit|other`; `itemType` `agent_message|
command_execution|file_change|mcp_tool_call|collab_tool_call|web_search|todo_list|
error`; `status` `in_progress|completed|failed|declined`; `collabTool` `spawn_agent|
send_input|wait|close_agent`; `action` `loaded|patched|edited|created|installed|
restored|archived|stale`; `provenance` `installed|agent_created|external|local|unknown`.
Contagens de tokens são números de uso, não conteúdo de raciocínio.

Mapeamento por contrato (qualquer outro evento nativo é recusado e contado em
`unknownEvent`, sem envelope):

- Claude: `PreToolUse`→`tool_pre`; com `tool_name: "Skill"` → `skill_invocation`
  `invocationPath: skill_tool`, `phase: pre`, `skillName` ← `tool_input.skill`.
  `PostToolUse`→`tool_post` `outcome: success` (Skill → `phase: post`);
  `PostToolUseFailure`→`outcome: failure`, `interrupted` ← `is_interrupt` (opcional:
  ausência vira lacuna). `UserPromptExpansion` `slash_command` → `skill_invocation`
  `invocationPath: direct_command`, `phase: expansion`, `skillName` ← `command_name`
  (o próprio Claude trata comandos personalizados como skills; a #6 decide atribuição);
  `mcp_prompt` → `command_expansion`. `SessionStart/End`, `SubagentStart/Stop`
  → `session_*`/`subagent_*`. IDs: `session_id`, `prompt_id`, `tool_use_id`, `agent_id`.
- Codex hooks: `PreToolUse`/`PostToolUse`→`tool_pre`/`tool_post` (`outcome:
  not_in_contract` — `tool_response` é conteúdo; não há evento de falha);
  `SessionStart/End`, `SubagentStart/Stop`. Não existe ferramenta `Skill`: ler
  `SKILL.md` gera só `tool_pre`/`tool_post` com `toolName`, sem caminho nem skill.
  IDs: `session_id`, `turn_id`, `tool_use_id`, `agent_id`. Hosted tools não passam por
  hooks locais (página oficial, "Tool coverage"); nada é afirmado sobre eles.
- Codex exec: `thread.started`→`session_start` (`threadId`); `turn.started`→
  `turn_start`; `turn.completed`→`turn_end` `outcome: completed` + `usage.*`;
  `turn.failed`→`turn_end` `outcome: failed`; `item.started|updated|completed` →
  `item` (`itemId`, `itemType`, `status`, `exitCode`; `mcp_tool_call` → `toolName`
  ← `tool`, `mcpServer` ← `server`; `collab_tool_call` → `collabTool`); `error`→
  `error`. Saída do filho → `process_exit` do wrapper.
- Hermes: `pre_tool_call`→`tool_pre`; `post_tool_call`→`tool_post` (`status`
  `ok|error|blocked` → `success|failure|blocked`, `error_type`, `duration_ms`);
  `on_skill_lifecycle`→`skill_lifecycle`; `on_session_start`→`session_start`;
  `on_session_end`→`turn_end` (fim do run/turno observado, nunca fim da skill nem da
  identidade de sessão); `subagent_start/stop`→`subagent_*`. IDs: `session_id`,
  `task_id`, `tool_call_id`, `turn_id`, `parent_session_id`, `parent_turn_id`,
  `child_session_id`, `child_subagent_id`, `parent_subagent_id`.

**Receptor em memória** (`src/integrations/memory-receiver.mjs`):
`createMemoryReceiver({ capacity = 500 })` → `{ receive(envelope) →
"accepted"|"dropped"|"malformed", snapshot() → { events, counters: { accepted,
dropped, malformed } }, close() }`. Nunca lança; envelope fora do schema →
`malformed`; cheio → descarta o novo e preserva os aceitos; após `close()` tudo é
`dropped`. O módulo não importa `fs`, `net` nem `child_process`: não há persistência.

**O que roda onde, sem consumidor da #8:**

- Hook Claude/Codex instalado: o agente inicia o processo por evento; ele lê o stdin,
  monta o envelope e o entrega a um `MemoryReceiver` que morre com o processo. Nada
  sai do processo, nada é escrito; stdout vazio, exit 0.
- Wrapper Codex: o receptor vive durante o `exec`; nada é escrito pelo debugger.
- Hermes instalado: sem entrega configurada, o callback devolve `None` sem projetar,
  sem fila, sem thread e sem processo — observação inativa, declarada no guia.
- Exportador de fixture: somente com `SKILL_ME_OBSERVER_REPORT_FD=<n>` explícito
  (hook/`ingest`: `n` ∈ 2..9; wrapper: 3..9, porque o stderr pertence ao filho), o
  processo escreve ao sair uma linha `{"skillMeObserverReport":1,"events":[…],
  "counters":{…}}` com envelopes já minimizados, em até 1000 ms; falha ou demora é
  absorvida. Fds 3..9 só aceitam pipe, aberto como handle de pipe do libuv: arquivo
  ou TTY não recebem relatório (nada é persistido por esse caminho) e uma escrita
  bloqueada nunca segura o encerramento — `fs.write` pelo pool de threads travaria
  o `process.exit` no Windows, constatado no build. O fd 2 usa `process.stderr`
  (relatório de um único evento do hook através do shell do Codex). A instalação
  nunca define essa variável. Não é coletor nem ingestão.
- Entrega Hermes: somente com `SKILL_ME_HERMES_DELIVERY` (array JSON de argv); nesta
  entrega só os testes a definem. A #8 definirá o consumidor real.

**Contadores** (vocabulário fechado, só números no relatório): `accepted`,
`dropped`, `malformed`, `oversize`, `unknownEvent`, `invalidInput`, `inputTooLarge`,
`stdinTimeout`, `invalidJson`, `oversizeLine`, `partialTrailingLine`,
`reasoningExcluded`; Hermes `observer_stats()`: `enqueued`, `delivered`,
`droppedQueueFull`, `deliveryFailed`, `oversize`, `serializationFailed`.

**Limites e timeouts:** stdin do hook ≤ 1 MiB (`ONE_MIB_BYTES` do doctor; excedente é
drenado e descartado, sem envelope) com prazo de 2000 ms para EOF; linha JSONL ≤
64 KiB (excedente descartado até o próximo `\n`); fragmento final sem `\n` é
descartado; receptor 500; fila Hermes 256; registro Hermes serializado ≤ 8192 bytes;
relatório de fixture 1000 ms. Entradas instaladas: `timeout: 10` (s), exceto
`SessionEnd`, que mantém o default do agente (Claude 1,5 s; Codex 1 s).

**Hooks Claude/Codex — saída neutra.** O comando `hook` nunca escreve em stdout e
sempre termina com 0, inclusive com argumento inválido, entrada inválida ou falha
interna; nunca usa 2 (bloqueio). Uma quebra do próprio Node (módulo ausente) sai
com 1, que os dois contratos tratam como erro não bloqueante. Entradas instaladas:
Claude em forma exec — `{"type":"command","command":<node absoluto>,"args":[<cli
absoluto>,"hook","--agent","claude"],"timeout":10}`, sem shell e sem `matcher`
(todos), em `PreToolUse`, `PostToolUse`, `PostToolUseFailure`,
`UserPromptExpansion`, `SessionStart`, `SessionEnd`, `SubagentStart`, `SubagentStop`;
Codex em `hooks.json` — `{"type":"command","command":<linha>,"timeout":10}` em
`PreToolUse`, `PostToolUse`, `SessionStart`, `SessionEnd`, `SubagentStart`,
`SubagentStop`, com a linha citada para o shell que o Codex usa (Windows: aspas
duplas, recusando `"`, `%`, CR/LF nos caminhos; POSIX: aspas simples com `'\''`).
`UserPromptSubmit`/`Stop` não são assinados (o payload carrega prompt/mensagem; o
ciclo de turno do Codex fica observável pelo wrapper).

**Wrapper supervisionado** — `integrations run --agent codex [--codex-entry
<arquivo>] -- <argumentos de exec>`: `spawn` sem shell de `[node, <entrada>]` (`.js/
.mjs/.cjs`) ou do executável nativo; `.cmd/.bat` em `--codex-entry` é uso inválido
(2: exigiria shell). Sem `--codex-entry`, usa o caminho do launcher devolvido por
`resolveAgents` do doctor, iniciado sem shell (executável nativo ou launcher POSIX com
shebang); launcher `.cmd/.bat` no Windows (shim npm) → 127 com mensagem fixa pedindo
`--codex-entry` apontando para `@openai/codex/bin/codex.js`. Vetor
do filho: `exec`, `--json` (omitido se `--json` ou `--experimental-json` já aparece
antes de um `--`), depois os argumentos do usuário literalmente. Nenhuma flag de
sandbox, aprovação ou bypass é lida, removida ou acrescentada. `cwd`, ambiente e
stdin são herdados sem alteração; stderr do filho é herdado diretamente (nunca lido);
stdout do filho é repassado byte a byte ao stdout do wrapper (com backpressure;
EPIPE do consumidor é absorvido e a leitura continua) e lido em paralelo pelo parser
incremental. **O que sai:** stdout = JSONL nativo do Codex, inclusive itens de
raciocínio que o próprio Codex emitir — saída do agente pedida pelo usuário, não
telemetria do debugger; stderr = do filho. O debugger não grava nada. Saída: código
do filho (0, 17 ou outro, sem reinterpretação); filho terminado por sinal → o
wrapper reemite o mesmo sinal sobre si (POSIX); SIGINT/SIGTERM/SIGHUP recebidos são
encaminhados ao filho; falha de spawn `ENOENT` → 127, outra falha de spawn → 126,
mensagem fixa no stderr e stdout vazio; uso inválido → 2. Limite de plataforma: no
Windows, terminar o wrapper externamente (TerminateProcess) não executa handlers e o
filho segue — mesmo comportamento do `bin/codex.js` oficial; Ctrl+C de console chega
aos dois processos.

**Hermes** — plugin `skill-me-observer` (`plugin.yaml`, `__init__.py`,
`kwargs.json`). `register(ctx)` só chama `ctx.register_hook` para `pre_tool_call`,
`post_tool_call`, `on_skill_lifecycle`, `on_session_start`, `on_session_end`,
`subagent_start`, `subagent_stop`; nenhuma ferramenta, middleware, comando ou atributo
do host. Cada callback aceita `**kwargs`, captura `Exception` e devolve `None`. Com
entrega configurada, projeta somente os nomes listados para o hook em `kwargs.json`
(mesmo arquivo importado pelo adaptador JS), mantendo valores escalares inalterados
e marcando os não escalares em `nonScalar` sem copiá-los; `put_nowait` em
`queue.Queue(256)`; cheio → `droppedQueueFull`. Uma thread daemon, criada no primeiro
evento, inicia uma vez o processo de entrega (stdin pipe; stdout/stderr descartados;
sem janela no Windows) e escreve NDJSON; falha de spawn, escrita ou registro >
8192 bytes é contada e, para falhas de entrega, desliga a entrega do processo — sem
retry. Destino travado bloqueia só a thread; os callbacks continuam O(1). Nenhum
tamanho, charset, enum, truncamento, atribuição, envelope ou persistência existe em
Python. `ingest --agent hermes` lê o NDJSON, aplica o adaptador e a fronteira e
termina no EOF com 0.

**Comandos `integrations`** (`src/integrations/cli.mjs`, script npm
`integrations`; o doctor não muda): `plan|install|uninstall --agent
<claude|codex|hermes> --target <diretório> [--apply] [--json]`. `--target` é
obrigatório e não tem default; `plan` e qualquer comando sem `--apply` só leem e
nunca iniciam agentes. Alvos: Claude `<target>/settings.json`; Codex
`<target>/hooks.json` (`config.toml` nunca é escrito); Hermes
`<target>/plugins/skill-me-observer/` (`config.yaml` nunca é escrito: habilitar é
`hermes plugins enable skill-me-observer`, manual). Registro próprio em
`<target>/.skill-me/<agente>-install.json`: versão, arquivo, SHA-256 do JSON canônico
de cada grupo próprio (ou de cada artefato Hermes) e o que a instalação criou
(arquivo, objeto `hooks`, chaves de evento) — nunca cópia de conteúdo alheio.
Validação: JSON lido pelo `readBoundedText`/`projectConfig` do doctor (≤ 1 MiB,
arquivo regular, forma de hooks nativa); raiz não objeto, JSON malformado, `hooks`
inválido ou arquivo grande demais → 3 sem escrita. Reescrita preserva valores
alheios, ordem de chaves, indentação detectada, newline final e o texto exato de
números (`JSON.rawJSON`). Escrita: lock exclusivo `<target>/.skill-me/<agente>.lock`
(`wx`), conteúdo novo em temporário no mesmo diretório, releitura e comparação do
SHA-256 com a leitura inicial e `rename`; divergência → 4 sem escrita. Limite
registrado: a janela entre essa última comparação e o `rename` não é atômica contra
editores arbitrários (não há CAS no sistema de arquivos); lock só exclui outros
processos do skill-me. Contenção: `realpath` do alvo; todo arquivo tocado precisa
resolver dentro dele (link para fora → 4); alvo igual ao diretório de política
gerenciada do Claude (`CLAUDE_MANAGED_SETTINGS_PATH`) → 4. Ordem de aplicação:
configuração, depois registro; falha posterior à primeira mutação → 5 com o estado
de cada passo. Reinstalar reconcilia: grupo idêntico ao canônico sem registro é
adotado. Remoção só apaga grupos/artefatos cujo hash confere com o registro; grupo
próprio alterado ou arquivo alheio na pasta do plugin → preservado e 4.
Códigos: `0` concluído ou nada a fazer; `2` uso inválido ou alvo inexistente; `3`
configuração inválida/ilegível, não substituída; `4` conflito (lock, mudança durante
a aplicação, alvo fora/link, artefato alheio, entrada própria alterada preservada);
`5` incompleto (falha de E/S depois de iniciar, estado reportado). Saída texto por
padrão; `--json` emite `{schemaVersion:1, command, agent, target, applied, status,
changes:[{file, action, event?}], conflicts:[{code, file, event?}], manualSteps:[…]}`
com códigos fechados, sem conteúdo de configuração.

### Ordem e opções técnicas para implementação após aprovação

1. Fechar U1 e congelar o contrato mínimo aprovado, com fixtures de sucesso e falha.
2. Claude: separar as duas invocações de skill antes de tratar o restante do ciclo.
3. Codex: hooks locais e wrapper de `exec --json`, provados como superfícies distintas.
4. Hermes: plugin público com callback sem espera por I/O; não registrar wrappers
   modificadores. A fila não bloqueante é justificada pelo timeout observado no host,
   não por uma meta inventada de desempenho. Overflow é perda declarada.
5. Instalação/remoção: plano de mutações próprio, leitura validada, lock por alvo,
   conferência da revisão lida antes de escrever e atualização recuperável. O teste
   deve comprovar conflito sem perda; lock só entre processos do skill-me não resolve
   edição por um terceiro. A estratégia concreta fica no diff, subordinada ao critério 9.
6. Provas de fronteira, documentação e verificação independente; revisão formal só
   depois da implementação completa, evidências e commit limpo.

A assinatura candidata do planejamento (comando separado de `doctor`, prévia como
default, wrapper `integrations run --agent codex -- …`) foi mantida e fechada, com
formato, limites, saída e códigos, em "Fronteira mínima — assinatura fechada (U1)".

## Contratos examinados e provas previstas

Consulta em 16/10/2026, somente leitura. Documentação corrente não é prova de execução
nem estabelece sozinha o perfil de uma versão. No planejamento não foram iniciados
agentes/modelos, importados módulos Hermes, executadas skills ou instalados hooks.
Na implementação, o builder importou módulos Hermes 0.21.4 apenas em sondagem e
testes isolados (HERMES_HOME temporário, `python -I -B`, plugins empacotados
desviados para diretório vazio, sem modelos e sem configuração pessoal).

| Agente | Fato conferido | Consequência para as provas |
| --- | --- | --- |
| Claude | documentação distingue `UserPromptExpansion` de chamadas à ferramenta `Skill`; metadado PE local agora é `2.1.299.0`, diferente do perfil estático `2.1.295` do doctor | fixtures devem declarar a versão real que representam; presença/versão não basta para comprovar dispatch |
| Codex | pacote local `@openai/codex` informa `0.162.1`; docs separam hooks locais, confiança por definição e fluxo `exec --json` | duas suítes de fronteira e lacunas explícitas; não passar bypass de confiança para facilitar E2E |
| Hermes | fonte local declara `0.21.4`; `plugins.py` registra callbacks; `plugins_dispatch.py` distingue o timeout de `pre_tool_call` dos observers | provar caminho de falha usando o dispatch dessa revisão, sem presumir fail-open universal |

No Hermes, `plugins.py:1747` documenta que timeout de `pre_tool_call` devolve bloqueio;
`plugins_dispatch.py:49` o classifica entre hooks fail-closed. Isso é mais específico
que a generalização fail-open da documentação. O plano não altera o host nem suas
políticas para esconder essa diferença. O nome de versão sozinho também não fixa
a revisão de uma instalação editável.

Hashes SHA-256 lidos das fontes locais em `hermes-agent/hermes_cli/`:

- `__init__.py`: `401221c84bca43ca48a51484b761c7aafa67fad6f6549f8df6d2444babcdaeb7`.
- `plugins.py`: `51c7fdd506b187c8713e706a7b264614902b28039e79875770e4b120180b423c`.
- `plugins_dispatch.py`: `fd1185e23edb80234e3f816a2fbbf990cdab37a3bf5c3d98b38337c7dd50e330`.

Estes hashes documentam a inspeção; não demonstram que o launcher importaria esse
checkout nem autorizam copiar configurações pessoais para fixtures. Antes de declarar
suporte, o builder vincula revisão/versão e congela os payloads sanitizados com origem.

Provas derivadas dos critérios: eventos válidos/ausentes/malformados; duas invocações
Claude; erro de ferramenta; execução Codex 0/17, spawn, interrupção e fluxo incremental;
Hermes com destino travado; consumidor ausente/desconectado; instalação repetida e
concorrente; edição externa entre prévia e aplicação; remoção com conflito; rollback
de falha parcial; SHA-256 da árvore de skill; caminhos com espaços/Unicode; canaries
sintéticos em payloads e mensagens de erro. Asserções verificam decisões exatas,
não apenas presença de saída. Windows local e matriz já declarada em CI têm evidências
separadas; plataforma não exercitada fica pendente, nunca aprovada por simulação de path.

Evidências de implementação ficam em `.checks/issue-4-integracoes*`, com contagem
real de testes, falhas/skips e cobertura por critério. Não criar `.verified.md` de
aprovação nesta etapa: a implementação ainda não existe. Verifier independente
posterior precede `npm run review:run -- --issue 4 --profile light`; teto de duas
tentativas, sem consumir rodada apenas para revisar este rascunho. Com `ready`, push
e PR pelo `npm run pr:create`, incluindo `Closes #4` apenas quando todos os critérios
estiverem atendidos. Merge continua humano.

## Sources

- [Issue #4](https://github.com/oldboydev/skill-me/issues/4): texto e 9 AC lidos integralmente
  em 16/10/2026, sem comentários naquele momento; AC1–AC9 acima seguem a ordem da lista.
- Issues [#5](https://github.com/oldboydev/skill-me/issues/5),
  [#8](https://github.com/oldboydev/skill-me/issues/8) e
  [#6](https://github.com/oldboydev/skill-me/issues/6): fronteiras citadas pela #4;
  #5/#8 foram relidas integralmente em 16/10/2026: #5 exige minimização por padrão
  e sanitização antes de persistir; #8 é dona do contrato versionado, transporte e
  armazenamento. Não há contrato concreto nessas issues que possa ser copiado hoje.
- Conversa de 16/10/2026: `Ready` exige plano aprovado; #4 estava em `Ready for Agent`;
  proprietário autorizou “pode puxar e seguir”. Detalhes de planejamento delegados
  ao agente conforme a própria issue; escopo adicional exige decisão explícita.
- `AGENTS.md`, `package.json`, `.github/workflows/governance.yml`,
  `scripts/code-review/README.md` e fontes citadas em Impact, na base acima:
  autoria, rigor, runtime, limites e comportamento existente.
- [Hooks Claude Code](https://code.claude.com/docs/en/hooks): caminhos de skill e eventos;
  documentação corrente consultada, sem prova de runtime.
- [Hooks Codex](https://learn.chatgpt.com/docs/hooks): confiança, superfície local e saída neutra;
  [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode): JSONL supervisionado.
- [Hermes Event Hooks](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks),
  [Plugins](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins) e
  [Observer Hooks](https://hermes-agent.nousresearch.com/docs/developer-guide/observer-hooks):
  interfaces públicas e significado dos eventos; ressalva de timeout conferida nas fontes locais.

## Unresolved

| # | Kind | Question | Until answered |
| --- | --- | --- | --- |
| U1 | resolved — 16/10/2026 | Fronteira mínima compartilhada e receptor em memória na #4 | Aprovado explicitamente pelo proprietário, conforme citação em Intent. Não entrega servidor, armazenamento, retenção nem coleta opt-in de conteúdo: #5/#8 permanecem donas dessas capacidades. Antes de código, o builder registra assinatura/envelope, campos permitidos, stdout do wrapper, limites/timeouts e códigos exatos; isso é elaboração técnica delegada. Receptor de fixture não é anunciado como núcleo de traces real. |

Nenhuma instalação pessoal nem E2E com consumo externo foi solicitada. Não há
pergunta de escopo pendente; surgindo ampliação real, registrá-la sem executá-la.
