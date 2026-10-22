# skill-me

CLI local para observar eventos de Claude Code, Codex CLI e Hermes, guardar uma
captura sanitizada e comparar os comandos observados com instruções de uma skill.
O pacote é privado: execute os comandos a partir deste checkout, sem instalação
global, aplicativo ou publicação configurada.

## Primeiro uso: capturar e explicar uma sessão

### 1. Preparar o agente

Use Node.js 24 ou mais recente e instale as dependências do checkout com `npm ci`.
Os hooks do agente precisam estar instalados e confiáveis para entregar eventos.
Faça primeiro a prévia e confira as mudanças propostas; substitua o agente por
`claude`, `codex` ou `hermes` e indique a pasta **existente** de configuração
dele em `--target`:

```sh
node src/integrations/cli.mjs plan --agent codex --target "<pasta-de-configuração>"
node src/integrations/cli.mjs install --agent codex --target "<pasta-de-configuração>" --apply
```

Para Codex CLI, a instalação usa `hooks.json`; para Claude Code,
`settings.json`; para Hermes, `plugins/`. A instalação não concede confiança
ao hook: confirme os passos manuais que o comando mostrar (`/hooks` no
Claude/Codex;
`hermes plugins enable skill-me-observer` no Hermes). Veja os alvos, conflitos
e limites em [Instalação das integrações](docs/agent-observation.md).
Como alternativa aos hooks do Codex CLI, `integrations run --agent codex`
observa uma execução de `codex exec --json` sem instalação do hook; ele requer
o launcher Codex acessível e repassa a saída JSONL nativa.

### 2. Criar uma captura e vincular o agente

O fluxo atual exige uma captura explícita **antes** de iniciar o agente. O
`--content` autoriza, apenas nesta captura, guardar argumentos e resultados
suportados depois da sanitização. Sem ele, o relatório tem metadados, mas não
consegue comparar o texto dos comandos. `--root` é uma pasta local absoluta;
os dados ficam em `<root>/skill-me-privacy/`.

No PowerShell, a partir da raiz deste checkout:

```powershell
$root = Join-Path $env:LOCALAPPDATA 'skill-me\capturas'
New-Item -ItemType Directory -Force -Path $root | Out-Null
$started = node src/integrations/cli.mjs privacy start --root $root --content | ConvertFrom-Json
$id = $started.capture.id
$env:SKILL_ME_CAPTURE_ROOT = (Resolve-Path -LiteralPath $root).Path
$env:SKILL_ME_CAPTURE_ID = $id
$id
```

Somente para Hermes, com o plugin habilitado, configure também o destino do
`ingest` antes de iniciá-lo:

```powershell
$env:SKILL_ME_HERMES_DELIVERY = ConvertTo-Json -Compress -InputObject @(
  (Get-Command node).Source,
  (Resolve-Path -LiteralPath 'src/integrations/cli.mjs').Path,
  'ingest', '--agent', 'hermes'
)
```

No bash/zsh, a partir da mesma raiz:

```sh
root="$HOME/.local/share/skill-me/capturas"
mkdir -p "$root"
node src/integrations/cli.mjs privacy start --root "$root" --content
id="<capture.id da resposta acima>"
export SKILL_ME_CAPTURE_ROOT="$root"
export SKILL_ME_CAPTURE_ID="$id"
```

Somente para Hermes, com o plugin habilitado:

```sh
export SKILL_ME_HERMES_DELIVERY="$(node -p 'JSON.stringify([process.execPath, require("node:path").resolve("src/integrations/cli.mjs"), "ingest", "--agent", "hermes"])')"
```

Inicie o agente **nesse mesmo terminal** e use a skill normalmente. Os hooks ou
o plugin herdam as variáveis e entregam eventos à captura. Para usar o wrapper do
Codex CLI em vez dos hooks, um exemplo de início é:

```sh
node src/integrations/cli.mjs run --agent codex -- "<pedido para usar a skill>"
```

O wrapper inicia `codex exec`; ele não escolhe nem executa uma skill por conta
própria. Sem as duas variáveis de captura, Claude/Codex observam só na memória
do processo, e nada é guardado para um relatório posterior. Sem
`SKILL_ME_HERMES_DELIVERY`, o plugin Hermes fica inativo. Uma variável de
captura ausente, raiz relativa ou ID inválido não escolhe outra captura
automaticamente.

### 3. Encerrar e consultar

Depois que o agente terminar, use a **mesma** raiz e ID. Os comandos abaixo
funcionam nos dois exemplos de terminal:

```sh
node src/integrations/cli.mjs privacy status --root "$root" --capture "$id"
node src/integrations/cli.mjs privacy stop --root "$root" --capture "$id"
node src/integrations/cli.mjs report --root "$root" --capture "$id" --skill "<caminho/para/SKILL.md>"
node src/integrations/cli.mjs report --root "$root" --capture "$id" --skill "<caminho/para/SKILL.md>" --format markdown > "$root/relatorio.md"
node src/integrations/cli.mjs report --root "$root" --capture "$id" --skill "<caminho/para/SKILL.md>" --format json > "$root/relatorio.json"
```

`report` escreve em texto no terminal por padrão; Markdown e JSON v1 vão para
stdout e podem ser redirecionados. `--skill` informa o arquivo a comparar sem
alterá-lo. Ele só pode ser omitido quando exatamente um nome de skill foi
observado e existe um único `SKILL.md` correspondente nos diretórios de skills
do diretório atual. Para ver eventos sem escolher uma skill, use
`node src/integrations/cli.mjs privacy timeline --root "$root" --capture "$id"`;
`node src/integrations/cli.mjs privacy list --root "$root"` recupera IDs de
capturas. `report` é uma consulta: não inicia o agente, não executa comandos
do `SKILL.md` e não cria arquivos nem lock da captura.

### Como interpretar e resolver problemas

O relatório cita linhas e hash da skill, eventos e lacunas da timeline. Seus
estados (`sufficient`, `partial`, `contradicted`, `unobserved`, `not_applicable`,
`inconclusive`) avaliam evidências dos comandos **literais** das instruções;
silêncio não comprova que o agente omitiu uma etapa. Ele não registra o
raciocínio interno nem prova o cumprimento integral da skill. Claude e Hermes
fornecem sinais de skill; nos hooks atuais do Codex não existe evento nativo
de início de skill, e ler `SKILL.md` é apenas evidência heurística, não prova
de carregamento. Mesmo com `--content`, os eventos Hermes não incluem conteúdo
de comandos pela política de privacidade; esse canal não comprova comandos
literais do relatório.

Se o relatório vier sem eventos, confira `privacy status`, o ID, as duas
variáveis no ambiente do processo do agente e a confiança da integração. Se
faltarem comandos, confira se a captura começou com `--content` e se o texto
literal do comando aparece no `SKILL.md` e nos argumentos sanitizados dos
eventos. Uma disputa momentânea do lock retorna código 4; repita a consulta.
`privacy stop` encerra a captura, mas não a apaga. A retenção padrão é de sete
dias após o encerramento; quando vencer, execute a limpeza:

```sh
node src/integrations/cli.mjs privacy prune --root "$root" --apply
```

Se precisar encerrar e desligar a coleta de conteúdo ao mesmo tempo, use
`node src/integrations/cli.mjs privacy disable --root "$root" --capture "$id"`
no lugar de `stop`.
Trate relatórios exportados com o mesmo cuidado dos dados locais. A captura
automática de qualquer skill após uma única ativação ainda não está
implementada; hoje o vínculo acima é manual.

Detalhes: [capturas e traces](docs/traces.md),
[política de privacidade](docs/privacidade.md) e
[contrato do relatório](docs/report.md).

## Governança e agentes

Tracking no [OldBoyDev — Engineering](https://github.com/users/oldboydev/projects/3).
Regras compartilhadas em [AGENTS.md](AGENTS.md); Claude usa [CLAUDE.md](CLAUDE.md)
que importa esse arquivo. Grok lê AGENTS.md nativamente, conforme a
[documentação oficial](https://docs.x.ai/build/features/skills-plugins-marketplaces).
Você pode escolher Grok ou Claude para implementar uma entrega; Codex local revisa.
Isso não muda agentes configurados no produto ou na máquina.

Fluxo: issue → plano/aprovação quando exigidos → implementação e provas →
Codex local → PR → In Review → merge humano. Uma revisão aprovada é suficiente;
o teto de duas tentativas serve somente para correções necessárias.

Comandos novos: `npm run review:run -- --issue N --profile light`,
`npm run review:check -- --issue N --profile light` e `npm run pr:create --
--issue N --profile light --title "tipo: descrição" --body-file caminho.md`.
Perfis light/ui exigem plano e verificação; direct mantém checks aplicáveis sem
esses artefatos. [Guia completo e adoção em outros projetos](scripts/code-review/README.md).
O motor é vendorizado nos pilotos. Na issue #7, o proprietário [autorizou manter apenas neste repositório](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6297902519) a ampliação do teto de overrides, agora [até 35](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6342492981); três arquivos do core divergem nessa exceção. Outras atualizações devem preservar a igualdade dos cinco arquivos.

Relatórios de runtime ficam ignorados em .checks/code-review; histórico/lock ficam
no Git comum, compartilhados entre worktrees. Não publique relatórios depois da
revisão em novo commit: use o resumo gerado no PR. Conteúdo ou contexto alterado
exige revisão válida novamente. Login Codex por ChatGPT; nenhuma IA executa na CI.

A CI valida as ferramentas de governança. package.json é privado e contém apenas esses comandos.

## Diagnóstico local de agentes (doctor)

`npm run --silent doctor -- --json` lê, de forma somente leitura, quais agentes
(`claude`, `codex`, `hermes`) estão instalados no PATH local, qual versão foi
encontrada e qual evidência a sustenta, e qual configuração/confiança de hooks
foi lida. O comando nunca inicia um agente, não instala hooks e não corrige
configuração — ver [docs/agent-compatibility.md](docs/agent-compatibility.md)
para o contrato completo e as lacunas conhecidas.

Sem `--json`, a mesma informação sai em texto português. Flags: `--json`,
`--cwd <diretório>`, `--collector <endpoint>` (tenta só uma conexão de
transporte a `tcp://127.0.0.1:<porta>` ou `tcp://[::1]:<porta>`, nunca envia
payload) e `--help`.

Três estados aparecem em todo relatório e não devem ser confundidos:

- `status: partial` no envelope — alguma configuração de agente não pôde ser
  lida (inválida, acima do limite de tamanho ou com permissão negada); as
  demais entradas continuam presentes. O comando ainda sai com exit `0`.
- `support: unverified` numa capacidade — não há evidência local vinculada à
  versão encontrada que comprove aquele mecanismo; não significa "não
  suportado", significa "não comprovado por esta leitura". O `reasonCode`
  diz o porquê (ex.: `no_static_contract_source`, `version_unresolved`,
  `surface_not_inspected`). `verified` exige a tabela de contrato que a
  própria instalação traz; `unavailable` só aparece na CLI local quando o
  launcher do agente não está no PATH consultado.
- `collector.identityVerified: false` — mesmo quando `collector.status` é
  `reachable`, um socket aceitar a conexão não comprova que o processo do
  outro lado é o coletor nem que a captura funciona.
