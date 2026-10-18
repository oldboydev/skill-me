# Privacidade: coleta, sanitização e ciclo de vida (issue #5)

Este guia descreve o que o debugger guarda, o que descarta e como você controla
as capturas locais. Vale para as integrações da #4 (hooks Claude/Codex, ingest
Hermes, wrapper `integrations run`) e para o comando `privacy`. Não há envio
pela rede: nenhum evento inicia telemetria, DNS ou upload, e não existe destino
remoto nem consentimento implícito em variável de ambiente ou configuração de
agente.

## Padrões

- O conteúdo começa desligado em cada captura. Argumentos e resultados de
  ferramenta só entram quando você liga `--content` no `privacy start` daquela
  captura; uma captura nova nunca herda o opt-in de outra, e `disable` desliga.
- Retenção padrão de 7 dias, contada do encerramento (`stop` ou `disable`).
  `--retention-days` aceita inteiros de 1 a 365.
- Hooks, ingest Hermes e wrapper não têm captura: neles o conteúdo está sempre
  desligado e cada processo usa uma chave própria em memória, nunca gravada.
- IDs viram pseudônimos `h1:` (HMAC-SHA-256 com chave aleatória da captura):
  iguais dentro da captura, diferentes entre capturas. A chave fica só em
  `captures/<id>/key`, nunca aparece em `status` ou `export` e sai com a captura.
- Nomes (`toolName`, `skillName` e os demais) com caminho, `@`, drive ou segredo
  são removidos do envelope, com `envelope.<campo>:sensitive_removed`.
- Prompts, raciocínio privado, mensagens finais de assistente, a ferramenta
  `Skill`, `collab_tool_call` e os eventos Hermes nunca produzem conteúdo, mesmo
  com `--content`. Os resultados suportados podem conter texto de `SKILL.md`:
  ele é guardado sanitizado e tratado só como dado — nada coletado é executado,
  interpretado como instrução ou usado como caminho.

## Comandos

```
node src/integrations/cli.mjs privacy start   --root <diretório> [--content] [--retention-days <1-365>]
node src/integrations/cli.mjs privacy ingest  --root <diretório> --capture <id> --agent <claude|codex-hooks|codex-exec|hermes>
node src/integrations/cli.mjs privacy stop    --root <diretório> --capture <id>
node src/integrations/cli.mjs privacy disable --root <diretório> --capture <id>
node src/integrations/cli.mjs privacy status  --root <diretório> --capture <id>
node src/integrations/cli.mjs privacy export  --root <diretório> --capture <id>
node src/integrations/cli.mjs privacy delete  --root <diretório> --capture <id> [--apply]
node src/integrations/cli.mjs privacy prune   --root <diretório> [--apply]
```

`--root` é obrigatório e não tem default: tudo fica em
`<diretório>/skill-me-privacy/`. `ingest` lê do stdin entradas nativas NDJSON que
você fornece (payload de hook, evento do `codex exec --json` ou registro Hermes),
uma por linha; não lê sessões, transcrições nem arquivos de skills e não inicia
agentes. `stop` encerra; `disable` encerra e desliga o conteúdo; nenhuma
captura volta a ativa e uma captura encerrada recusa novos eventos.

Retenção: não há daemon. Rode `privacy prune --root <diretório>` para ver a
prévia e `privacy prune --root <diretório> --apply` para remover as capturas
encerradas cuja idade alcançou o prazo; capturas ativas nunca são removidas.
`delete` também mostra uma prévia e só apaga com `--apply`; arquivos alheios,
links e junções são recusados em vez de apagados.

Saída: um JSON por execução em stdout, stderr vazio. Códigos: 0 concluído;
2 uso inválido; 3 estado ou formato inválido ou ausente; 4 conflito, lock ocupado
ou isolamento; 5 falha de E/S. Nenhuma resposta ecoa caminho, valor de flag,
payload ou mensagem de exceção.

## Matriz de conteúdo

Com `--content`, só estes campos podem produzir conteúdo sanitizado. Qualquer
outra ferramenta, evento, contrato ou formato — inclusive um tipo diferente do
previsto — gera `content:unsupported_content` sem ler o valor. `path` e
`path_list` guardam só pseudônimos do caminho, nunca seus componentes.

| Contrato | Eventos | Ferramenta | Campo | Papel | Tipo | Condição |
| --- | --- | --- | --- | --- | --- | --- |
| `claude-code-hooks@docs-2026-10-16` | `PreToolUse`, `PostToolUse`, `PostToolUseFailure` | `Bash` | `tool_input.command` | args | text | — |
| `claude-code-hooks@docs-2026-10-16` | `PreToolUse` | `Bash` | `tool_input.description` | args | text | — |
| `claude-code-hooks@docs-2026-10-16` | `PostToolUse` | `Bash` | `tool_response.stdout` | result | text | — |
| `claude-code-hooks@docs-2026-10-16` | `PostToolUse` | `Bash` | `tool_response.stderr` | result | text | — |
| `claude-code-hooks@docs-2026-10-16` | `PreToolUse`, `PostToolUse`, `PostToolUseFailure` | `Read` | `tool_input.file_path` | args | path | — |
| `claude-code-hooks@docs-2026-10-16` | `PreToolUse`, `PostToolUse`, `PostToolUseFailure` | `Grep` | `tool_input.pattern` | args | text | — |
| `claude-code-hooks@docs-2026-10-16` | `PreToolUse`, `PostToolUse`, `PostToolUseFailure` | `Grep` | `tool_input.path` | args | path | — |
| `codex-hooks@rust-v0.162.1` | `PreToolUse`, `PostToolUse` | `Bash` | `tool_input.command` | args | text | — |
| `codex-hooks@rust-v0.162.1` | `PostToolUse` | `Bash` | `tool_response.output` | result | text | — |
| `codex-hooks@rust-v0.162.1` | `PreToolUse`, `PostToolUse` | `apply_patch` | `tool_input.patch` | args | text | — |
| `codex-exec-jsonl@rust-v0.162.1` | `item.started`, `item.updated`, `item.completed` | `command_execution` | `item.command` | args | text | — |
| `codex-exec-jsonl@rust-v0.162.1` | `item.started`, `item.updated`, `item.completed` | `command_execution` | `item.aggregated_output` | result | text | — |
| `codex-exec-jsonl@rust-v0.162.1` | `item.started`, `item.updated`, `item.completed` | `mcp_tool_call` | `item.arguments` | args | structured | — |
| `codex-exec-jsonl@rust-v0.162.1` | `item.started`, `item.updated`, `item.completed` | `mcp_tool_call` | `item.result.content[].text` | result | text_list | `type` = `text` |
| `codex-exec-jsonl@rust-v0.162.1` | `item.started`, `item.updated`, `item.completed` | `file_change` | `item.changes[].path` | args | path_list | — |

Hermes não tem linha: o plugin aprovado na #4 envia só nomes escalares, nunca
argumentos ou resultados.

## Sanitização e seus limites

Objetos (argumentos MCP) passam por projeção: chave sensível (`password`,
`token`, `secret`, `api-key`, `authorization`, `cookie` e semelhantes) descarta a
subárvore inteira; chave fora de `[A-Za-z0-9_.-]{1,64}` é omitida. Texto passa
por regras fixas: bloco de chave privada removido inteiro; userinfo e parâmetros
sensíveis de URL; valores de `Authorization`, `Cookie`, `Set-Cookie`,
`X-Api-Key`; `Bearer`/`Basic`; atribuições e flags com nome sensível; formatos
conhecidos de token (GitHub, OpenAI, Slack, AWS, GitLab, Google, JWT); prefixo de
diretório pessoal vira `<home>`. Cada valor removido vira `[removido]`.

A detecção por padrões não é garantia universal: um segredo em texto livre, de
formato desconhecido ou sem nome que o identifique pode passar. Por isso o
conteúdo é opt-in, por captura, e restrito à matriz acima.

## Limites e perdas

| Limite | Valor | Efeito |
| --- | --- | --- |
| entrada nativa de hook | 1 MiB | acima disso o evento não é lido (`inputTooLarge`) |
| linha do `ingest` e do wrapper | 64 KiB | linha maior é contada como malformada (`oversize_line`) |
| envelope sanitizado | 4096 bytes | acima disso o evento é descartado (`envelope_oversize`) |
| conteúdo por evento | 8192 bytes UTF-8 | texto é cortado em fronteira de caractere com `truncated: true`; caminho e estrutura que não cabem são omitidos |
| estrutura de conteúdo | profundidade máxima 8 e 128 membros por evento | acima disso o conteúdo inteiro é omitido (`unsanitizable`) |
| captura | 500 eventos e 8 MiB de dados | o evento que ultrapassaria o limite e os seguintes são descartados (`capture_event_limit`, `capture_byte_limit`) |

A sanitização vem antes do truncamento. IDs nunca são truncados. Toda omissão
de conteúdo informa um destes códigos, com contagem em `status`
(`contentOmitted`) e no relatório dos hooks (`counters.privacy`):

- `content_disabled` — conteúdo desligado nesta captura ou processo;
- `unsupported_content` — fora da matriz;
- `unsanitizable` — texto malformado, chave inválida ou estrutura acima do limite;
- `sensitive_removed` — um valor sensível foi removido;
- `content_truncated` — corte por orçamento;
- `privacy_failure` — falha ao ler o payload; a parte insegura é descartada sem retry.

`status` separa eventos aceitos, persistidos, malformados e descartados (por
motivo) de conteúdo omitido; nenhum número de eventos representa a cobertura
completa da execução observada: perdas por limite, linha malformada ou evento
desconhecido ficam visíveis nos contadores.

## Canais nativos do agente

No wrapper `integrations run --agent codex`, o stdout e stderr nativos do agente
supervisionado são repassados ao usuário byte a byte e não são exportação
sanitizada do debugger: se o Codex imprime um segredo, ele aparece ali como
apareceria sem o wrapper. A política vale para o que o debugger produz —
relatórios, `status`, `export` e arquivos em `skill-me-privacy/`.

## Plataformas comprovadas

Comprovadas por execução real registrada em `.checks/issue-5-privacidade.build.md`:

- Windows 11
- WSL Ubuntu

macOS não foi executado localmente nesta entrega; a CI do PR o executa.
