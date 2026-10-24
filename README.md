# skill-me

CLI local para observar eventos de Claude Code, Codex CLI e Hermes, guardar uma
captura sanitizada e comparar os comandos observados com instruções de uma skill.
O pacote é privado: execute os comandos a partir deste checkout, sem instalação
global, aplicativo ou publicação configurada.

## Primeiro uso: observar sessões com `on` e `off`

O uso normal tem uma linha por ação: ligar a observação, usar o agente como
sempre, desligar e consultar. A preparação do passo 1 é feita uma vez.

### 1. Preparar uma vez

Use Node.js 24 ou mais recente e instale as dependências do checkout com `npm ci`.
Os comandos abaixo rodam a partir da raiz deste checkout.

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

Depois, escolha uma pasta local **absoluta e existente** para as capturas e
registre-a com `observe setup`. No PowerShell:

```powershell
$root = Join-Path $env:LOCALAPPDATA 'skill-me\capturas'
New-Item -ItemType Directory -Force -Path $root | Out-Null
node src/integrations/cli.mjs observe setup --root $root
```

No bash/zsh:

```sh
mkdir -p "$HOME/.local/share/skill-me/capturas"
node src/integrations/cli.mjs observe setup --root "$HOME/.local/share/skill-me/capturas"
```

O `setup` guarda a raiz em `.skill-me/observe.json`, no home do seu usuário
(`%USERPROFILE%` no Windows, `$HOME` no POSIX), com o comando de entrega do
plugin Hermes: o Hermes deixa de precisar de `SKILL_ME_HERMES_DELIVERY`. Os
dados ficam em `<raiz>/skill-me-privacy/`. Raiz relativa, inexistente ou que
não seja pasta é recusada. Para trocar de raiz, rode `npm run off` antes e
repita o `setup`. Se a pasta for trocada depois por um link ou junção, nada é
gravado no outro destino: os comandos respondem `root_changed` até um novo
`setup`. A própria `.skill-me` também precisa continuar uma pasta comum: com um
link ou junção no lugar dela, `setup`, `on`, `off`, `status` e `report --latest`
respondem 4 (`link_refused`), e hooks e plugin não gravam nem entregam nada.

### 2. Uso normal

```sh
npm run on
# use Claude Code, Codex CLI ou Hermes normalmente, com a skill
npm run off
node src/integrations/cli.mjs report --latest --skill "<caminho/para/SKILL.md>"
```

- `npm run on` é o seu consentimento: até `npm run off`, os hooks e o plugin
  instalados gravam cada sessão do agente numa captura local própria, com
  argumentos e resultados suportados **depois da sanitização** (como o
  `--content` da captura manual). Não há variável de ambiente, ID nem terminal
  especial; repetir `on` não muda nada.
- Ao chegar a 500 eventos ou 8 MiB, a captura daquela sessão é encerrada e a
  sessão continua numa nova, com chave própria; nenhuma captura passa do limite.
- `npm run off` desliga a observação, inclusive para hooks ou plugin já em
  execução, e encerra as capturas automáticas abertas. Elas continuam
  disponíveis para consulta e, como toda captura encerrada, ficam retidas por
  7 dias; a limpeza é `node src/integrations/cli.mjs privacy prune --root "<raiz>" --apply`.
  Repetir `off` não muda nada.
- `npm run status` mostra a qualquer momento se a observação está `on` ou `off`
  e as 10 capturas automáticas mais recentes, com estado e contadores. `on` não
  quer dizer que algo foi gravado: confira os contadores.
- `report --latest` relata a captura automática mais recente da raiz
  configurada, sem `--root` nem `--capture`, e nunca escolhe uma captura manual.
  A linha `Captura:` no início diz qual foi escolhida. Para outra sessão, copie
  o ID do `npm run status` e use
  `node src/integrations/cli.mjs report --root "<raiz>" --capture <id> --skill "<caminho/para/SKILL.md>"`.

`report` escreve em texto no terminal por padrão; `--format markdown` e
`--format json` vão para stdout e podem ser redirecionados para um arquivo.
`--skill` informa o arquivo a comparar sem alterá-lo. Ele só pode ser omitido
quando exatamente um nome de skill foi observado e existe um único `SKILL.md`
correspondente nos diretórios de skills do diretório atual. `report` é uma
consulta: não inicia o agente, não executa comandos do `SKILL.md` e não cria
arquivos nem lock da captura.

`observe setup` e `npm run on|off|status` respondem um JSON (`schemaVersion: 1`)
com os códigos 0 concluído, 2 uso inválido, 3 sem `setup` ou estado inválido,
4 conflito, lock ocupado ou raiz trocada, 5 falha de E/S. Um lock ocupado por um
hook que está gravando é esperado por até 2 s antes de responder 4. `setup`,
`on` e `off` também se revezam pelo lock `.skill-me/observe.lock` do home, com o
mesmo prazo. Se um deles for interrompido no meio, esse arquivo pode ficar, e os
três respondem 4 (`lock_present`) até você conferir que nenhum está em execução
e removê-lo.

`npm run on` também registra a raiz ligada em `.skill-me-authorization.json`,
direto no home e fora da `.skill-me`, e `npm run off` desliga a raiz por esse
registro e o apaga, mesmo que a pasta `.skill-me` tenha sido trocada ou apagada
depois do `on`; isso vale até quando o `off` responde um erro da configuração.
Enquanto o registro apontar outra raiz, `on` responde 4 (`observe_on`): rode
`npm run off`. Se ele estiver ilegível (3, `config_invalid`), como depois de uma
queda no meio do `on`, esse `on` não chegou a ligar a raiz: confira o arquivo e
remova-o.

### 3. Limites reais

- Hooks só rodam depois da confiança nativa: workspace confiável e `/hooks` no
  Claude Code, `/hooks` e projeto confiável no Codex CLI, `hermes plugins enable
  skill-me-observer` no Hermes. Sem essa confiança o agente segue normalmente e
  nada é gravado.
- Codex CLI: os hooks cobrem ferramentas executadas localmente; ferramentas
  hospedadas (como a busca na web) ficam fora da cobertura dos hooks. O
  contrato de hooks consultado não tem evento de ativação de skill: ler um
  `SKILL.md` aparece só como operação de ferramenta, nunca como prova de que a
  skill foi carregada. O wrapper `integrations run --agent codex` continua só
  com a captura manual.
- Hermes: o plugin lê o destino da entrega ao carregar; inicie o Hermes depois
  do `setup` (o `on`/`off` vale sem reiniciar). Os eventos Hermes não incluem
  conteúdo de comandos pela política de privacidade e não comprovam comandos
  literais no relatório.
- Claude Code e Hermes fornecem sinais nativos de skill. O raciocínio interno do
  agente nunca é capturado, e o relatório não prova o cumprimento integral da
  skill.
- Um evento sem identidade de sessão aceita pela fronteira não é gravado nem
  atribuído a outra sessão.
- Uma falha de entrega (lock ocupado, disco, raiz ausente) nunca bloqueia o
  agente nem muda o que ele vê, mas também não fica registrada: o que chegou
  aparece nos contadores do `npm run status`.
- Encerrar, desabilitar ou excluir à mão uma captura automática não desliga a
  observação: o próximo evento da sessão abre outra captura. Para parar, use
  `npm run off`.

### Como interpretar e resolver problemas

O relatório cita linhas e hash da skill, eventos e lacunas da timeline. Seus
estados (`sufficient`, `partial`, `contradicted`, `unobserved`, `not_applicable`,
`inconclusive`) avaliam evidências dos comandos **literais** das instruções;
silêncio não comprova que o agente omitiu uma etapa.

Se `report --latest` responder `no_automatic_capture` ou vier sem eventos,
confira com `npm run status` se a observação estava `on` durante a sessão e se
os contadores cresceram, e confira a confiança da integração no agente. Se
faltarem comandos, confira se o texto literal do comando aparece no `SKILL.md`
e nos argumentos sanitizados dos eventos. Uma disputa momentânea do lock
retorna código 4; repita a consulta. Para ver eventos sem escolher uma skill,
use `node src/integrations/cli.mjs privacy timeline --root "<raiz>" --capture <id>`.
Trate relatórios exportados com o mesmo cuidado dos dados locais.

### Avançado: captura manual

Os comandos manuais continuam valendo e têm precedência: com o par
`SKILL_ME_CAPTURE_ROOT`/`SKILL_ME_CAPTURE_ID` no ambiente do agente, os hooks
gravam **só** nessa captura, com ou sem `on`, e `npm run off` não a encerra. Um
par incompleto, raiz relativa ou ID inválido é recusado, nunca convertido em
captura automática. O `--content` autoriza, apenas nesta captura, guardar
argumentos e resultados suportados depois da sanitização.

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

No bash/zsh:

```sh
root="$HOME/.local/share/skill-me/capturas"
mkdir -p "$root"
node src/integrations/cli.mjs privacy start --root "$root" --content
id="<capture.id da resposta acima>"
export SKILL_ME_CAPTURE_ROOT="$root"
export SKILL_ME_CAPTURE_ID="$id"
```

Inicie o agente **nesse mesmo terminal**. Sem o `setup`, o Hermes precisa
também de `SKILL_ME_HERMES_DELIVERY` (quando definida, ela tem precedência sobre
a configuração):

```sh
export SKILL_ME_HERMES_DELIVERY="$(node -p 'JSON.stringify([process.execPath, require("node:path").resolve("src/integrations/cli.mjs"), "ingest", "--agent", "hermes"])')"
```

O wrapper do Codex CLI observa uma execução de `codex exec --json` sem o hook
instalado e só grava com o par manual. No PowerShell/Windows, a instalação npm
pode expor `codex.cmd`; o wrapper não inicia arquivos `.cmd`/`.bat` por shell,
então aponte `--codex-entry` para o `codex.js` da instalação:

```powershell
$codexEntry = Join-Path (npm root -g) '@openai/codex/bin/codex.js'
if (-not (Test-Path -LiteralPath $codexEntry)) { throw 'Ajuste $codexEntry para o codex.js instalado.' }
node src/integrations/cli.mjs run --agent codex --codex-entry $codexEntry -- '<pedido para usar a skill>'
```

No bash/zsh, quando `codex` resolve para um launcher executável sem shell:

```sh
node src/integrations/cli.mjs run --agent codex -- "<pedido para usar a skill>"
```

Depois que o agente terminar, use a **mesma** raiz e ID:

```sh
node src/integrations/cli.mjs privacy status --root "$root" --capture "$id"
node src/integrations/cli.mjs privacy stop --root "$root" --capture "$id"
node src/integrations/cli.mjs report --root "$root" --capture "$id" --skill "<caminho/para/SKILL.md>"
```

`privacy disable` encerra e desliga a coleta de conteúdo ao mesmo tempo;
`privacy list --root "$root"` recupera IDs de capturas.

Detalhes: [capturas, traces e observação automática](docs/traces.md),
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
