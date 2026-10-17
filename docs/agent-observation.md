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
| 5 | incompleto — falha de E/S depois de iniciar; o estado de cada passo é reportado. Também o acesso da configuração — DACL no Windows, ACL no Linux e no macOS — que não pôde ser lido nem aplicado (`config_access_unavailable`), recusado antes de gravar qualquer conteúdo |

O wrapper devolve o código do Codex; sinal do Codex é reemitido (POSIX); falha ao
iniciar sai 127 (não encontrado) ou 126.

Reescrita de `settings.json`/`hooks.json` no POSIX: o arquivo novo mantém os bits de
modo e o grupo do original e nunca concede mais acesso do que ele — o temporário nasce
só com os bits de dono e recebe grupo e modo antes do conteúdo; se o grupo original não
puder ser atribuído, grupo e "outros" recebem só o que os dois já concediam no original
(quem pertencia só ao grupo antigo passa a "outros" e não ganha acesso). Esse acesso é
o do arquivo conferido antes de o temporário ser criado — contido no alvo e com o
conteúdo lido sob o lock: trocada a configuração depois da leitura (outro arquivo ou
link), nada é gravado no temporário e o comando sai com 4; mudança de modo, dono,
grupo ou ACL depois da conferência também é 4.

No Linux a ACL POSIX da configuração faz parte desse acesso. O instalador a lê — com
modo, dono e grupo, do mesmo descritor aberto — pelo Python do sistema
(`/usr/bin/python3`, script fixo, só o xattr `system.posix_acl_access` do descritor) e,
antes do conteúdo e antes dos bits finais, dá ao temporário exatamente essa ACL, ou
nenhuma quando a configuração não tem ACL estendida: uma ACL default da pasta, mesmo
posta depois da configuração, não chega ao temporário nem ao arquivo final, e uma ACL
estendida que restringe alguém abaixo de "outros" continua valendo. Se a ACL não puder
ser lida nem aplicada — Python ausente ou bloqueado, sistema de arquivos sem ACL POSIX
(NFSv4, SMB, `/mnt/c` do WSL) ou ACL estendida com o grupo original não atribuível —, o
comando sai com 5 (`config_access_unavailable`, passo `config: failed`) sem gravar
conteúdo, e a configuração fica como estava. No macOS a ACL (ACEs) não é copiada:
configuração com ACE, ou pasta com ACE herdável que chegaria ao temporário, é recusada
da mesma forma (ACE detectada pelo `ls -le` do sistema; caminho não executado
localmente, só pela CI). Configuração criada do zero, registro e lock não têm conteúdo
preexistente e ficam com a ACL herdada da pasta. O dono passa a ser quem executa o
comando; rótulos SELinux/AppArmor, demais atributos estendidos e bits especiais não são
copiados.

No Windows o acesso é a DACL. O instalador a lê pelo PowerShell do Windows
(`%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe`, só tipos .NET, script
fixo com caminho e dados pelo stdin) e confere, junto com o conteúdo lido sob o lock, que
ela continua a mesma antes de criar o temporário e antes de cada tentativa de `rename`;
mudou → 4. O temporário já é criado com essa DACL — as mesmas entradas, na mesma ordem —
e recebe o conteúdo pelo handle da criação: em nenhum instante tem a ACL herdada da pasta,
e o `rename` leva essa DACL para a configuração. As entradas herdadas viram explícitas e a
DACL fica protegida: o acesso efetivo é o mesmo, mas mudanças posteriores nas permissões
da pasta deixam de chegar ao arquivo, também depois da remoção (para voltar a herdar,
reative a herança nas propriedades de segurança do arquivo). O dono passa a ser quem
executa; SACL e rótulo de integridade não são copiados. Se a DACL não puder ser lida nem
aplicada — PowerShell do Windows ausente ou bloqueado (AppLocker/WDAC, modo de linguagem
restrito), ou sem resposta em 20 s —, o comando sai com 5 (`config_access_unavailable`,
passo `config: failed`) sem gravar conteúdo com outro acesso, e a configuração fica como
estava; um prazo esgotado durante a criação pode deixar o temporário, já com a DACL
conferida (sobra reportada como as demais, abaixo). Configuração criada do zero,
registro e lock não têm conteúdo preexistente e ficam com a ACL herdada da pasta.

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
  arbitrários (não há CAS no sistema de arquivos). No Windows o `rename` é negado
  (`EPERM`/`EACCES`/`EBUSY`) enquanto outro processo — o agente, um editor, antivírus —
  mantém o arquivo aberto: até 6 novas tentativas em no máximo 630 ms, refazendo
  antes de cada uma a conferência do temporário e da configuração; persistindo, a
  operação sai com 5 e a configuração fica como estava.
- Temporários de nome fixo: a reescrita usa `<settings.json|hooks.json>.skill-me-tmp`
  e `.skill-me/<agente>-install.json.skill-me-tmp`. Se a operação precisa de um deles
  e o caminho já tem qualquer coisa — arquivo (inclusive sobra de uma execução
  interrompida), diretório ou junção/link —, prévia e aplicação recusam com 4
  (`foreign_artifact` com o caminho do temporário), sem escrever, apagar nem seguir
  nada; mova ou remova esse arquivo e repita. Durante a aplicação, um temporário
  editado ou trocado por outro programa não é renomeado sobre a configuração nem
  apagado (4, `config_changed_during_apply`); numa falha de E/S só sai o temporário
  que ainda tem exatamente os bytes gravados. Um arquivo posto no lugar com bytes
  idênticos não é distinguível, como nos artefatos.
- Registro e lock em `.skill-me/`: só o registro lido sob o lock é substituído ou
  apagado — antes de cada tentativa de `rename` e antes da exclusão ele precisa
  continuar o arquivo regular com os mesmos bytes (ou continuar ausente, numa
  primeira instalação). Editado, trocado por arquivo, diretório ou link, removido ou
  posto por outro programa durante a aplicação, ele fica intacto e o comando sai com
  4 (`config_changed_during_apply` no registro); o que já foi gravado antes (configuração
  ou artefatos) fica como está, com o passo reportado como `done` — nada é desfeito.
  Confira o arquivo e repita o comando. Registro presente que não é arquivo regular
  (link, junção, diretório) é recusado já na prévia (`foreign_artifact`). O lock só é
  apagado enquanto tiver os bytes que a própria execução gravou; ausente ou trocado,
  ele fica e o comando acrescenta 4 (`config_changed_during_apply` em
  `.skill-me/<agente>.lock`) sem esconder o resultado principal — remova-o à mão depois
  de conferir que nenhuma outra execução está ativa. Falha de E/S ao liberá-lo sai
  com 5 (passo `lock: failed`). Trocada a pasta `.skill-me` durante a aplicação (por
  junção/link para fora do alvo ou para outra pasta, ou por arquivo), nada mais é
  lido, gravado ou apagado através dela (4, `target_escape` ou
  `config_changed_during_apply` em `.skill-me`); junção/link para dentro do alvo já
  presente antes do comando continua aceito. Mesmo limite não atômico da escrita da
  configuração; bytes idênticos não se distinguem.
- Raiz do alvo: o caminho real resolvido no início é a referência da aplicação. Antes
  de cada efeito que passa só por ela — temporário da configuração do Claude/Codex, cada
  tentativa de `rename` dele, limpeza dele numa falha, exclusão da configuração e criação
  de `.skill-me` e de `plugins` — ela precisa continuar resolvendo para o mesmo caminho
  real. Trocada a raiz, ou uma pasta acima dela, por junção/link durante a aplicação, o
  comando sai com 4 (`target_escape` em `.`) sem ler, gravar nem apagar nada através da
  troca; o temporário e o lock já criados ficam na pasta movida (confira e remova à mão).
  Antes de cada leitura da configuração sob o lock e da exclusão, o próprio arquivo
  também precisa continuar dentro do alvo: link posto durante a aplicação que leve para
  fora → 4 (`target_escape` no arquivo), sem ler nem apagar através dele. A prévia confere
  a contenção uma vez, antes das leituras. Outro diretório real posto no mesmo caminho
  da raiz não se distingue; mesmo limite não atômico da escrita da configuração.
- Hermes: um artefato alterado por outro programa na pasta temporária
  `plugins/.skill-me-observer.skill-me-tmp` depois de gravado e antes de ela virar a
  pasta do plugin é promovido (instalação 0). O registro guarda o hash do pacote, então
  a remoção seguinte preserva o arquivo como alteração (4); a instalação não garante
  fonte byte a byte igual à do pacote diante de um editor arbitrário nesse intervalo.
  A pasta temporária em si só é nossa como diretório real: trocada durante a instalação
  — depois de criada, de um artefato gravado ou de uma exclusão da sobra própria,
  inclusive na limpeza depois de um `rename` falho — por junção/link (para dentro ou
  para fora do alvo) ou por um arquivo, nada mais é gravado, apagado nem promovido
  através dela (4, `config_changed_during_apply` na pasta temporária); o link fica e o
  que já foi gravado fica onde estiver. Uma entrada que apareça em
  `plugins/skill-me-observer` depois da prévia — mesmo um diretório vazio, que o
  `rename` do POSIX substituiria — é alheia: a instalação sai com 4 (`foreign_artifact`)
  sem renomear nada sobre ela, a pasta temporária completa fica e a instalação seguinte,
  com o caminho livre, a limpa como sobra própria. Outro diretório real posto no lugar da
  pasta temporária não se distingue.
- Remoção Hermes apaga também o bytecode que o próprio Hermes grava para o nosso
  `__init__.py` (`__pycache__/__init__.cpython-*.pyc`), só quando é arquivo regular
  num `__pycache__` real dentro do alvo; qualquer outro arquivo na pasta do plugin é
  preservado e reportado. Se o `__init__.py` é preservado — editado, trocado por link
  ou de outro plugin de mesmo nome —, o bytecode dele também fica; artefato que não
  é arquivo regular (link de arquivo) é tratado como alteração preservada. O bytecode
  só sai com a fonte comprovada pelo registro: `__init__.py` registrado e removido
  agora como nosso, ou já ausente (órfão da nossa fonte). Depois de uma remoção com
  conflito o registro guarda só o que ficou; um `__init__.py` posto depois na pasta —
  mesmo cópia exata do pacote —, o bytecode ao lado e o `__pycache__` (mesmo vazio,
  com ou sem fonte) e qualquer arquivo com nome de artefato fora do registro são
  alheios: ficam e a remoção sai com 4. Ao lado de fonte registrada preservada o
  `__pycache__` vazio também fica. Reinstalar sobre essa sobra só registra artefato
  fora do registro que tenha o conteúdo exato do pacote; ausente ou diferente, recusa
  com 4 sem registrar nada. Antes de apagar cada bytecode e o `__pycache__` a remoção
  reconfere que a fonte continua ausente; uma fonte posta durante a remoção conserva
  o bytecode e o diretório (código 4). Bytecode da nossa
  fonte que o Hermes grave depois da leitura feita pela remoção não está no plano e
  fica; sem a fonte no registro, as remoções seguintes não o tomam por nosso (limpeza
  manual). `__pycache__` ou bytecode que é junção/link para fora do
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
- Hermes, pasta `plugins`: o caminho real dela, lido sob o lock (ou logo depois de a
  instalação criá-la), precisa continuar o mesmo antes de cada leitura, gravação e
  exclusão que passa por ela — artefatos, bytecode, `__pycache__`, pasta do plugin e
  staging. Trocada durante a aplicação por junção/link para fora do alvo, para outra
  pasta do alvo (mesmo com cópias exatas dos artefatos) ou por arquivo, nada mais é
  lido, gravado ou apagado através dela: 4, `target_escape` ou
  `config_changed_during_apply` em `plugins`. O que já saiu ou foi gravado fica como
  está (o passo não é desfeito), o staging já gravado fica onde estiver e o registro
  não muda; confira e repita o comando. Junção/link para dentro do alvo já presente
  antes do comando continua aceito.
- Claude, política gerenciada: `--target` igual ao diretório de
  `managed-settings.json` ou dentro dele é recusado com 4 (`managed_policy_target`)
  pelo caminho escrito, sem nenhum acesso, e também pelo caminho real logo depois de
  resolver o alvo — um alias (junção/link) não contorna a recusa, e nada é lido nem
  gravado nele. O diretório gerenciado em si não é resolvido nem acessado: se ele
  próprio for um link, o destino desse link não é reconhecido como gerenciado.
- Diretórios que a instalação criou (`plugins` do Hermes, `.skill-me` dos três
  agentes) saem na remoção só quando vazios e ainda diretórios reais: se o usuário
  os trocou por junção/link, a remoção conclui o que é nosso e o link fica.
- Os comandos instalados apontam para o node e para este checkout por caminho
  absoluto: mover o repositório exige reinstalar.
