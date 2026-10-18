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
- Nomes (`toolName`, `skillName` e os demais) com caminho, `~` inicial, `@`,
  drive ou segredo são removidos do envelope, com
  `envelope.<campo>:sensitive_removed`, mesmo quando a forma do envelope v1 já
  os recusaria.
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
links e junções são recusados em vez de apagados. Uma exclusão interrompida deixa
`captures/.deleting-<id>`, que um novo `delete --apply` ou `prune --apply`
conclui; se essa pasta existe junto da própria `captures/<id>`, os dois comandos
recusam com `foreign_entry` sem ler nem apagar nenhuma das duas.

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

Em `item.result.content[]`, uma entrada `type` = `text` precisa de `text` string.
Sem `text`, com `null` ou outro tipo, o conteúdo inteiro do evento (inclusive
`item.arguments`) sai com `content:unsupported_content`, mesmo que outras entradas
sejam válidas; `text` vazio continua `""` sem motivo, e entradas de outro `type`
são puladas com `item.result.content[].text:unsupported_content`.

## Sanitização e seus limites

Objetos (argumentos MCP) passam por projeção: chave sensível (`password`,
`token`, `secret`, `api-key`, `authorization`, `cookie` e semelhantes) descarta a
subárvore inteira; chave fora de `[A-Za-z0-9_.-]{1,64}` é omitida; chave com
formato de token conhecido sai com o membro inteiro (`sensitive_removed`), sem ser
reescrita. Uma chave `__proto__`, `constructor` ou `prototype` é um membro comum:
continua no conteúdo como chave própria, sem alterar o objeto. Texto passa por regras fixas: bloco de chave privada removido inteiro;
userinfo e parâmetros sensíveis de URL, com o nome do parâmetro reconhecido também
em codificação percentual (`t%6fken`, uma camada; escape inválido conta como
sensível); valores de `Authorization`, `Cookie`, `Set-Cookie`,
`X-Api-Key`; `Bearer`/`Basic`; atribuições e flags com nome sensível; formatos
conhecidos de token (GitHub, OpenAI, Slack, AWS, GitLab, Google, JWT); prefixo de
diretório pessoal vira `<home>`. Cada valor removido vira `[removido]`.

Depois de `Bearer` ou `Basic`, em qualquer caixa (`basic`, `BEARER`, `bAsIc`), e
de espaço, tab ou quebra de linha (inclusive `\r\n` e linha em branco), qualquer
valor não vazio no alfabeto de token (letras, dígitos, `._~+/=-`, padding
incluído) é removido, por mais curto que seja: `Basic YTpi` vira
`Basic [removido]` e `BASIC\r\n  YTpi` vira `BASIC\r\n  [removido]`; o esquema e
os separadores ficam como vieram. Isso também remove a palavra seguinte em prosa
(`Basic auth`, `basic idea`, inclusive a primeira palavra da linha depois de um
`Basic` no fim de linha), e uma palavra que para antes de `(` (`Bearer tokens(s)`)
omite o campo inteiro com `unsanitizable`. Um cabeçalho sem aspas cuja linha
termina no esquema, com a credencial na linha seguinte (`Authorization: Basic`
seguido de quebra e `YTpi`), também é omitido inteiro com `unsanitizable`.
Em texto serializado de novo (JSON dentro de um resultado), o separador escrito
como escape também vale, sem decodificar nada: um ou mais `\` seguidos de `n`,
`r`, `t` ou `u000a`, `u000d`, `u0009`, `u0020`, entre o esquema e a credencial ou
logo antes do esquema. `{\"Authorization\":\"Basic\nYTpi\"}` vira
`{\"Authorization\":\"Basic\n[removido]` e `"Basic\nYTpi"` vira
`"Basic\n[removido]"`; o resto da palavra colada à credencial sai junto. Isso
também remove a palavra depois de um escape que segue o esquema em prosa ou
caminho (`C:\Basic\new`) e aceita `\N`, `\R`, `\T` como escape. Outros esquemas e
outros separadores ou codificações (NBSP, `\x0a`, `%0A`, entidades HTML) não são
reconhecidos, nem um nome de cabeçalho ou atribuição colado depois de um escape
(`x\nCookie: s=…`).

O valor de um parâmetro de URL também é examinado com uma camada de codificação
percentual: se `?q=ghp%5F…` (ou o valor inteiro codificado) contém um formato de
token da lista acima, o valor inteiro vira `[removido]`; o nome e os demais
parâmetros ficam como vieram. Valor com escape inválido (`%zz`, `%` no fim)
também é removido, por não ser classificável. Valor sem token continua na forma
codificada original. Antes desta correção, um token assim codificado no valor
passava (limitação registrada na revisão formal, tentativa 1, e corrigida na
mesma entrega).

Depois de um nome sensível (`DB_PASSWORD=`, `"password":`, `--password`), o valor
removido é a palavra inteira, como o shell a lê na mesma linha: vírgulas, `}`, `-`
inicial, trechos entre aspas colados e separadores escapados (`\,`, `\;`, `\ `)
fazem parte dela; espaço, `;`, `&`, `|`, `<`, `>`, `(` e `)` sem escape a
encerram. Aspa sem fechamento na linha (ou `\` no fim da linha) logo depois do
nome ou do valor torna o fim incerto, e então o resto do texto também é removido.
Isso pode remover mais que o segredo: em JSON compacto, o que vem colado depois do
valor (`,"user":"u"}`); depois de `--password` sem valor, a opção seguinte; em
`bash -lc 'TOKEN=x'`, a aspa final. Na URL, tudo até o último `@` da autoridade é
userinfo (`https://u:a@b@host` vira `https://host`); `@` no caminho, na query ou no
fragmento fica.

Só espaço, tab e quebra de linha separam palavras: um espaço não ASCII (NBSP) ou
um CR isolado dentro do valor não o encerra. O mesmo vale para o valor de um
parâmetro de URL sensível, de um cabeçalho sensível e de `Bearer`/`Basic`: o que a
palavra concatena colado a ele (`?password=abc'…'`, `Bearer abc…,resto`) sai
junto, e só a aspa que fecha o texto ao redor permanece. Um cabeçalho escrito
dentro de aspas (`-H 'Authorization: Digest username="…", …'`) tem como valor tudo
até o fecho dessa aspa; sem aspas, até o fim da linha. O debugger nunca executa
nem expande o texto: quando o valor depois de um nome sensível usa uma composição
do shell que não se delimita só lendo o texto — substituição `$(…)` ou crase,
`${…}` com espaço, `$'…'`, array `NOME=(…)`, `<(…)` — ou a URL tem aspa ou `\`
que atravessa um espaço antes do `@`, o campo inteiro é omitido com
`unsanitizable`. Isso perde comandos comuns, como `export TOKEN=$(gh auth token)`
ou `--password $(cat arquivo)`, mesmo quando o texto não contém o segredo. Em JSON
compacto, o que vem colado depois do valor sai junto, e uma URL sem caminho
seguida de aspas e `@` perde o texto até esse `@`. A contagem de aspas é feita na
linha, sem um parser de shell: um apóstrofo anterior pode inverter a leitura.

Um nome sensível seguido de um indicador de bloco no fim da linha (`secret: |`,
`password: >-`, `token: |2 # comentário`), com texto nas linhas seguintes, também
omite o campo inteiro com `unsanitizable`: o valor estaria nessas linhas e o
debugger não interpreta YAML para saber onde ele acaba. O campo sai mesmo quando a
linha seguinte não pertence ao bloco. `|` ou `>` seguidos de texto na mesma linha
(`--token | cat`) seguem a regra anterior. O mesmo vale quando o nome sensível
termina a linha sem valor (`secret:` e o valor abaixo, também `PASSWORD=` no
fim da linha) e quando até duas tags ou âncoras vêm antes do indicador
ou do fim da linha (`secret: !!str |`, `token: &a >-`, `secret: !!str`). Também
omite o campo inteiro um valor que começa em tag ou âncora seguida de outro texto
na mesma linha (`secret: !!str valor`, `secret: &a valor`, `password: !x | cat`,
inclusive depois de `=` e de flag: `PASSWORD=!x ls`) e um comentário depois de
espaço que termina a linha com texto abaixo (`secret: # c` e o valor abaixo,
`--password # c` e outra linha). Nome sensível sem valor no fim do texto, tag no
fim do texto, `&` sozinho (`--token & ls`) e `#` colado ao separador
(`PASSWORD=#x`) não mudam. Não é reconhecido `--password` seguido de NBSP.

A detecção por padrões não é garantia universal: um segredo em texto livre, de
formato desconhecido ou sem nome que o identifique pode passar. A decodificação
de URL tem uma camada só (`%255F` não vira `_`) e vale só para valores de
parâmetros de query; fora deles, texto codificado não é decodificado. Por isso o
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
