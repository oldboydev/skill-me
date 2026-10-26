# Iniciar o agente com captura: `skill-me <agente>` — issue #25

Sources:

- [Issue #25](https://github.com/oldboydev/skill-me/issues/25), com o AC3 atualizado — problema, resultado e critérios de aceite.
- [Decisão do proprietário](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6407670364): “Capturas sucessivas até o agente sair (recomendado)” — alternativa B.
- `.tasks/issue-25-agent-launch.md` — os 30 critérios, estados, decisões e questões abertas deste checklist.
- `.tasks/issue-23-observacao-on-off.md` e o Landing de `.checks/issue-23-observacao-on-off.md` — configuração única, sucessão por limite, barreira do lock, paciência de 2 s, códigos.
- `.tasks/issue-8-traces.md`, `docs/traces.md` — par manual, precedência, prazo de entrega de 750 ms, códigos de entrega.
- `.tasks/issue-5-privacidade.md`, `docs/privacidade.md` — política, chave por captura, limites 500 eventos/8 MiB, retenção.
- `docs/agent-observation.md`, `src/integrations/install/run.mjs` — `plan`, `install --apply`, `manualSteps`.
- `src/doctor/agent-resolution.mjs`, `src/doctor/config-sources.mjs`, `src/doctor/launcher-link/codex.mjs` — resolução no PATH, diretórios de configuração, shim do npm.
- Pedido do proprietário (conversa): “pega a proxima issue planejar e implementar” e aprovação explícita em 26/10/2026: “Aprovar plano completo e implementar” — autoriza a entrega conforme plano completo e este checklist, mantendo a decisão B.

## Out of scope

- SQLite, `skill-me teach`, publicação do pacote, rede, merge — a issue não autoriza.
- Mudar `observe setup/on/off/status`, `integrations report --latest` e `integrations run` — a invocação autoriza só a própria sessão.
- Encerrar numa execução seguinte uma execução deixada aberta por encerramento forçado — `Unresolved` 5.
- Avaliar a skill sobre a execução inteira — motor novo; o relatório projeta o existente, uma seção por captura.
- Conceder ou ler a confiança nativa de Claude/Codex/Hermes — sem fonte estática; o uso real depende da confiança manual (`Unresolved` 2).
- `--yes`, flags próprias do launcher, iniciar `.cmd`/`.bat` por shell — não pedidos; quebrariam os argumentos literais.
- Agente real, hooks/perfis pessoais, `npm link` no prefixo real, `npm run on` real nas provas — tudo temporário, agentes de fixture.
- Pilotos e motor vendorizado de revisão.

## Landing

O launcher novo (`src/integrations/launch/`) só coordena peças que já existem: resolução do
doctor, `observe setup`, instalador (`plan`/`install --apply`), store e política. O store ganha a
execução ao lado da observação automática e reusa a rotina de sucessão de `appendAutomatic`
(extraída, não copiada); a entrega dos produtores reusa a da observação automática (prazo,
`untilDeadline`, lote com `rollover`); o relatório reusa o pipeline e o renderer da #7 por captura.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Executável local | `package.json`: `"bin": {"skill-me": "src/integrations/launch/cli.mjs"}`, `"private": true` mantido; o arquivo começa com `#!/usr/bin/env node` e fica com modo git `100755`. Instalado por `npm link` no checkout. | Instalador próprio de shims: padrão de escrita fora do checkout sem consumidor. Publicar: não autorizado. |
| Vínculo da execução (ambiente) | O launcher põe no ambiente do agente `SKILL_ME_LAUNCH_ROOT=<rootReal da configuração>` e `SKILL_ME_LAUNCH_ID=<ID da execução, 32 hex minúsculos>`; antes, remove do ambiente copiado toda variável cujo nome (sem diferenciar maiúsculas no Windows) seja `SKILL_ME_LAUNCH_ROOT`, `SKILL_ME_LAUNCH_ID`, `SKILL_ME_CAPTURE_ROOT` ou `SKILL_ME_CAPTURE_ID`. Em `captureDeliveryFor`, para os produtores `claude`, `codex-hooks` e `hermes`: qualquer das duas `SKILL_ME_LAUNCH_*` presente decide a rota da execução; raiz não absoluta, ID fora de `^[0-9a-f]{32}$` ou par incompleto → `refusedDelivery("binding_invalid")`, sem cair no par manual nem no `on`. Sem elas, o par manual e depois o `on`, como hoje. `integrations run` (`codex-exec`) ignora o par novo. | Par manual com ID fixo: o produtor fica preso à captura do início e não troca no limite. Reusar `SKILL_ME_CAPTURE_ID` com o ID da execução: checkout anterior o leria como ID de captura (`capture_not_found`) e o par manual perderia o significado. Ligar o `on` global: autoriza toda sessão e o `off` de uma invocação cortaria outra. |
| Ponteiro da execução aberta | `<rootReal>/skill-me-privacy/launches/<invocation>.json` = `{"launchVersion":1,"invocation":"<32 hex>","capture":"<32 hex>","segment":<inteiro ≥ 1>}`, gravado só sob o `.lock` do store por temporário `wx` 0600 + `rename` (pasta `launches` 0700, criada sob o lock). Nasce com a execução (`segment: 1`), é trocado a cada sucessora e é apagado no encerramento. Leitura limitada a 1 KiB: link → `link_refused`; outra entrada, ilegível ou fora da forma → `store_invalid`; ausente → `launch_ended`. `list`, `prune`, `delete` e o `observe.json` não o tocam. | Lista de todos os segmentos no ponteiro: cresce sem limite e duplica o `state.json`. Ponteiro mantido depois do fim com estado `ended`: precisaria de retenção e limpeza próprias. Achar a corrente varrendo `captures/` a cada evento: custo O(capturas) sob o lock em todo hook. |
| Captura da execução | `state.json` com `captureVersion: 1` e, só nas capturas do launcher, `"origin":"launch"`, `"invocation":"<32 hex>"` e `"segment":<inteiro ≥ 1>`; `content: true`, `retentionDays: 7`, chave e limites próprios como toda captura. `privacy list/status/export` e `timeline.capture` mostram os três campos. Manuais e automáticas não mudam; um checkout anterior responde `capture_invalid` para ela. | `origin: "automatic"`: o `off` a encerraria e `status`/`--latest` a misturariam. Marcador num arquivo da captura: fora do conjunto literal da exclusão. |
| Sucessão | A laçada de `appendAutomatic` vira uma rotina interna do store usada pelas duas rotas: numa só tomada do lock, escolhe a corrente (ponteiro; captura `stopped`, `disabled` ou apagada à mão também é sucedida), aplica `produce` com a chave dela, grava, e o que não coube vai para a sucessora — a cheia vira `stopped`, a nova nasce com `segment` seguinte e chave nova, o ponteiro passa a ela, a política é reaplicada. Numa captura recém-criada o limite continua descarte contado (herdado; inalcançável pela política, que recusa o envelope antes). | Copiar a laçada: duas regras de sucessão divergindo em silêncio. |
| Entrega da execução | Rota de entrega própria sobre o mesmo núcleo da observação automática (`observe/delivery.mjs`): toda entrada — também sem `sessionId` e as malformadas, que somam em `counters.malformed` — vai à execução, na ordem de chegada, com o prazo de 650 ms por entrada (`ATTEMPT_MS`); o lote usa `createIngestBatch({rollover: true})`. Resumo `{"launch":true,"code":<código|null>,"entries":n,"committed":n,"persisted":n,"lost":n}`. Códigos: `launch_ended`, `root_not_found`, `root_not_directory`, `store_invalid`, `capture_invalid`, `lock_present`, `link_refused`, `foreign_entry`, `root_changed`, `io_failure`, `delivery_timeout`; finais: os da automática sem `observe_off`, mais `launch_ended`. Nada vai para `SKILL_ME_CAPTURE_REPORT`. | Roteamento por sessão como no `on`: a execução já isola; perderia eventos sem `sessionId`. Abrir (ler o ponteiro) antes do primeiro evento: mais uma tomada de lock por hook sem barreira nova — o ponteiro só some no encerramento. |
| Encerramento | Depois do `close` do agente (não depois de um erro de início), espera fixa `LAUNCH_SETTLE_MS = DELIVERY_DEADLINE_MS` (750 ms); então, sob o `.lock` com paciência de 2 s: a corrente vira `stopped` se ativa, o ponteiro é apagado, e as capturas da execução (varridas por `invocation`) voltam para o resumo. Gravação posterior: `launch_ended`, nada gravado. Erro de início: encerra sem espera. | Sem espera: o `ingest` Hermes lê o pipe depois da saída do agente e perderia os últimos eventos. Registro persistido de produtores vivos ou IPC: o processo de entrega que ainda está iniciando fica fora dele de qualquer forma, e soma estado em disco e limpeza de órfãos. |
| Primeiro uso | Pendente quando `observe.json` falta ou o `plan` do agente (alvo = `claudeHome`/`codexHome`/`hermesHome` do doctor sobre o ambiente do launcher) lista mudanças. Sem `isatty(0)` e `isatty(2)`: 3 `setup_required`. Prévia no stderr, nesta ordem: `skill-me: primeiro uso de <agente>; nada foi alterado ainda.`; `skill-me: pasta proposta para as capturas: <padrão>` (só sem configuração; padrão `%LOCALAPPDATA%\skill-me\capturas`, sem `LOCALAPPDATA` `<home>\AppData\Local\skill-me\capturas`; POSIX `<home>/.local/share/skill-me/capturas`); `skill-me: mudanças em <alvo>:` + `  <action> <file>[ <event>]` por mudança (ou `skill-me: integração já instalada em <alvo>.`); `skill-me: cada execução de skill-me <agente> grava localmente, depois da sanitização, os argumentos e resultados suportados, em capturas sucessivas de até 500 eventos ou 8 MiB, mantidas por 7 dias depois de encerradas.`; prompts `Pasta das capturas (Enter aceita a proposta; ou digite outro caminho absoluto): ` (só sem configuração) e `Confirmar? [s/N]: `. Resposta lida linha a linha por leitura síncrona do fd 0. Confirmação: `s` ou `sim`, sem diferenciar maiúsculas, depois de aparar espaços; qualquer outra, linha vazia ou EOF → 3 `setup_declined`. Caminho relativo → 2 `root_not_absolute`. Ao confirmar: `mkdir -p` 0700 da raiz, `observe setup --root` em processo, `install --apply` em processo, `skill-me: passo manual de confiança:` + `  - <manualStep>`. | Leitura por `readline` no `process.stdin`: uma leitura pendente do launcher no terminal disputaria a entrada com o agente. Prévia em stdout: o stdout é do agente. |
| Início do agente | Resolução por `resolveAgents` do doctor sobre `PATH`/`PATHEXT` do ambiente. `absent` → 127 `executable_not_found` antes de qualquer pergunta. No Windows, `.cmd`/`.bat`: só o `codex` com `versionSource: "package_metadata"` cuja linha de invocação do shim referencia uma única entrada do pacote `@openai/codex` é iniciado, como `process.execPath <entrada> <args…>`; outro → 127 `launcher_requires_shell`, antes da preparação. Depois de abrir a execução: `spawn(comando, args, {stdio: "inherit", env, windowsHide: false})`, sem shell; entrada do shim ausente ou `ENOENT` → 127, outro erro de início → 126. | Shell para `.cmd`: argumentos deixam de ser literais. Repetir a leitura do shim no launcher: segunda regra do formato do npm (fica uma exportação de `launcher-link/codex.mjs`). |
| Sinais | Do início da execução até o fim do resumo, o launcher escuta `SIGINT` e `SIGHUP` (e `SIGQUIT` fora do Windows) sem agir — o terminal já os entregou ao grupo, e o agente os recebe uma vez; `SIGTERM` é repassado uma vez ao agente vivo (`child.kill("SIGTERM")`). Fim por sinal no POSIX: depois do resumo, os ouvintes saem e o launcher reemite o mesmo sinal sobre si; no Windows, sai com o código do agente (ou 1). | Repassar também os sinais do terminal: o agente os receberia duas vezes. Remover os ouvintes logo após o agente sair: um Ctrl+C durante os 750 ms deixaria a captura `active`. |
| Mensagens do launcher | Só stderr, por escrita síncrona, prefixo `skill-me: `. Resumo: `skill-me: execução <invocation> encerrada; capturas: <n>; eventos gravados: <soma>.`; por captura `skill-me: segmento <s>: captura <id> <estado>; gravados <persisted>; descartados: <motivo> <n>, …` (ou `descartados: nenhum`); com soma 0, `skill-me: nada foi gravado nesta execução. Confira a confiança do agente: <manualSteps[0]>`; por fim `skill-me: consulte com: skill-me report`. Falha do encerramento: `skill-me: não foi possível encerrar a execução <invocation> [<código>]; a captura <id> continua active.` e `skill-me: encerre com: "<node>" "<cli.mjs>" privacy stop --root "<root>" --capture <id>`. Erros de início sem caminho: `skill-me: não foi possível abrir a execução [<código>]`. | Saída em JSON: o stderr é do terminal e do agente; o usuário lê o resumo. |
| Códigos de saída | Código do agente ou o mesmo sinal; 127/126 de início; 2 `root_not_absolute` ou uso; 3 `setup_declined`, `setup_required`, `root_not_found`, `root_not_directory`, `store_invalid`, `config_invalid`, `capture_invalid`; 4 `observe_on`, `lock_present`, `link_refused`, `foreign_entry`, `root_changed`; 5 `io_failure`; do instalador, o `exitCode` dele (2 `target_not_found` quando o diretório do agente não existe). | — |
| Consulta | `skill-me report [--skill <SKILL.md>] [--format text\|markdown\|json]`, sem lock: varre `captures/` como o `--latest` (lock ausente antes e depois; ilegível → código dela), agrupa `origin: "launch"` por `invocation`, escolhe a de maior (`createdAt` do menor segmento encontrado, `invocation`). `missingSegments` = números de 1 ao maior encontrado que faltam; `open` = ponteiro presente. Cada captura passa pelo pipeline atual (`replayCaptureReadOnly` → `correlateTrace` → `readSkillSource` com o mesmo `--skill`/cwd → `evaluateReport`); a falha de uma seção falha o comando com o JSON de erro atual. JSON: `{"skillMeLaunchReport":1,"invocation":"<32 hex>","open":<bool>,"segments":[{"segment":<n>,"capture":"<id>"}],"missingSegments":[<n>],"reports":[<relatório existente por captura>]}`. Texto: `Execução skill-me: <invocation>; fonte: launch.invocation.`, `Capturas da execução: <n> (segmentos <s>, …); fonte: launch.segments.`, `Segmentos ausentes: <s, …\|nenhum>; fonte: launch.missingSegments.`, `Execução aberta: <sim\|não>; fonte: launch.open.`, `Cada seção avalia só a própria captura.`, e para cada uma `== Segmento <s> de <maior> ==` seguido do relatório existente; Markdown com `# Execução skill-me`, as mesmas linhas como itens e `## Segmento <s> de <maior>`. Erros: 3 `not_configured`, 3 `no_launch_capture`, demais do store como no `report`. | Só a última captura: fingiria ser a execução inteira. Juntar os registros num traço único: motor de avaliação novo. |
| Início da execução (acréscimo do build; risco 1 da conferência do plano) | O ponteiro e cada captura `launch` ganham `"launchedAt":"<ISO>"`, o `createdAt` do segmento 1, copiado do ponteiro para cada sucessora. Ponteiro: `{"launchVersion":1,"invocation":"<32 hex>","capture":"<32 hex>","segment":<n>,"launchedAt":"<ISO>"}`; `state.json` da captura `launch`: as chaves da linha "Captura da execução" mais `launchedAt`, que `privacy list/status/export` e `timeline.capture` também mostram. O `skill-me report` escolhe a execução de maior (`launchedAt`, `invocation`); isto substitui o “`createdAt` do menor segmento encontrado” da linha "Consulta". | `createdAt` do menor segmento restante: com o segmento 1 de uma execução antiga apagado e uma sucessora dela criada depois do início de outra execução, a antiga seria escolhida. ID de execução ordenado pelo tempo: ordem escondida num identificador, com empate no mesmo milissegundo. |
| Console do Windows (acréscimo da correção dos achados; defeito revelado pela prova F4) | No Windows, quando o fd é um console (`isatty`), as mensagens do launcher saem pelo stream tty do Node (`process.stderr`/`process.stdout`, que escrevem por `WriteConsoleW`), e cada resposta do primeiro uso é uma linha lida de `process.stdin` (tty, `ReadConsoleW`, UTF-8), que é pausado e solto do laço de eventos assim que a linha chega; linhas a mais ficam guardadas para a pergunta seguinte. Fora de console (pipe, arquivo) e no POSIX, nada muda: escrita síncrona dos bytes UTF-8 e leitura síncrona do fd 0. Prova: no console real, a prévia aparece legível, um caminho digitado com acento vira exatamente a raiz gravada e a linha digitada depois das respostas chega intacta ao agente. | Escrita síncrona dos bytes UTF-8 num console: o console os lê pela página de código OEM e mostra `prepara├º├úo` (medido). Leitura síncrona do fd 0 num console: chega na página de código OEM, e um caminho com acento digitado virou outra pasta, criada com `�` no nome (medido). Trocar a página de código do console (`chcp 65001`): muda o estado do terminal do usuário. |
| Ordem e falha do encerramento (acréscimo do build; risco 2 da conferência do plano) | Sob o lock, o encerramento apaga o ponteiro antes de parar a corrente: sem ponteiro nenhum produtor grava (`launch_ended`), mesmo que parar a captura falhe depois. Se o encerramento falhar, o launcher confere o ponteiro sem lock e, depois das duas linhas de falha da linha "Mensagens do launcher", escreve: com o ponteiro ausente, `skill-me: a execução <invocation> já não recebe registros; o comando acima só encerra a captura.`; com o ponteiro presente, `skill-me: a execução <invocation> continua aberta: o comando acima encerra só a captura <id>, e um processo do agente que ainda grave abre a captura seguinte; rode-o depois que o agente e os processos dele terminarem.` Nesse caso `skill-me report` mostra `Execução aberta: sim`. Encerrada a execução mas sem conseguir ler as capturas para o resumo: `skill-me: execução <invocation> encerrada; o resumo das capturas não pôde ser lido [<código>].` e a linha `consulte com`. | Parar a corrente antes de apagar o ponteiro: uma falha no meio deixava a execução recebendo registros. Apagar o ponteiro sem o lock: corre com uma sucessora em criação, que o regravaria. Encerramento automático numa execução seguinte ou comando novo para fechar a execução: fora do escopo (`Unresolved` 5). |

- Nada mais nesta mudança é difícil de reverter: a divisão em módulos de `src/integrations/launch/` segue as convenções do repositório e é refatorável.

## Checks

### S1 — Comando e abertura do agente · 9 arquivos · 44 KB · ~11k

**C1** — Com `npm link` num prefixo temporário, `skill-me --help` executado de outro diretório sai com 0 e a ajuda em stdout; `package.json` continua `"private": true`, com `bin.skill-me` apontando a entrada.
Proof: `node --test --test-name-pattern="I25-C1 " tests/integrations/launch/command.cli.test.mjs`

**C2** — `skill-me <agente> <args…>` inicia, para `codex`, `claude` e `hermes`, o executável do PATH sem shell, com os argumentos literais (espaço, aspas, Unicode, `--`, vazio) na ordem; o stdout do launcher é exatamente o do agente e o stderr dele chega ao terminal.
Proof: `node --test --test-name-pattern="I25-C2 " tests/integrations/launch/command.cli.test.mjs`

**C3** — O código de saída do agente (0 e 7) é o código do `skill-me`.
Proof: `node --test --test-name-pattern="I25-C3 " tests/integrations/launch/command.cli.test.mjs`

**C4** — No Windows, o shim `codex.cmd` reconhecido inicia `node <@openai/codex/bin/codex.js> <args>` intactos; outro `.cmd` sai com 127 `launcher_requires_shell` sem criar captura nem pasta. A entrada do shim vem da linha de invocação do template do npm, e só dela.
Proof: `node --test --test-name-pattern="I25-C4 " tests/integrations/launch/command.cli.test.mjs`
Proof: `node --test --test-name-pattern="I25-C4 " tests/integrations/launch/agent.unit.test.mjs`

**C5** — Com o terminal entregando SIGINT, SIGQUIT e SIGHUP ao grupo de processos (POSIX), o agente recebe cada um exatamente uma vez e o launcher só sai depois dele, com o código dele; no Windows, com um Ctrl+C real gerado no console do launcher (`GenerateConsoleCtrlEvent(CTRL_C_EVENT)`, por um driver Python num console próprio), o agente recebe SIGINT uma vez e o launcher só sai depois dele, com o código dele.
Proof: `node --test --test-name-pattern="I25-C5 " tests/integrations/launch/command.cli.test.mjs`

**C6** — SIGTERM enviado só ao launcher (POSIX) chega ao agente exatamente uma vez.
Proof: `node --test --test-name-pattern="I25-C6 " tests/integrations/launch/command.cli.test.mjs`

### S2 — Primeiro uso conduzido pelo comando · 6 arquivos · 85 KB · ~21k

**C7** — Agente fora do PATH: 127, stderr com `executable_not_found`, sem prompt, e home, raiz e diretório do agente idênticos (árvore inteira).
Proof: `node --test --test-name-pattern="I25-C7 " tests/integrations/launch/prepare.cli.test.mjs`

**C8** — Sem configuração, num terminal, antes da primeira resposta o stderr traz a pasta padrão da plataforma, as mudanças do `plan` com o alvo do agente, a frase de gravação com 500 eventos/8 MiB e 7 dias e a pergunta; até ali nenhuma escrita (árvores iguais).
Proof: `node --test --test-name-pattern="I25-C8 " tests/integrations/launch/prepare.cli.test.mjs`

**C9** — Confirmado (Enter na pasta e `s`), a pasta é criada, `observe.json` tem o formato da #23 com a raiz, os handlers do agente aparecem no alvo, os `manualSteps` saem no stderr e o agente inicia.
Proof: `node --test --test-name-pattern="I25-C9 " tests/integrations/launch/prepare.cli.test.mjs`

**C10** — Recusa (`n`, vazio, `yes`, EOF): 3 `setup_declined`, nada criado ou alterado, agente não inicia.
Proof: `node --test --test-name-pattern="I25-C10 " tests/integrations/launch/prepare.cli.test.mjs`

**C11** — Caminho relativo: 2 `root_not_absolute`, nenhuma pasta criada, `observe.json` ausente.
Proof: `node --test --test-name-pattern="I25-C11 " tests/integrations/launch/prepare.cli.test.mjs`

**C12** — Preparo pendente com stdin ou stderr fora de terminal (processos reais com pipe): 3 `setup_required`, orientação de rodar num terminal, nada alterado.
Proof: `node --test --test-name-pattern="I25-C12 " tests/integrations/launch/prepare.cli.test.mjs`

**C13** — Preparo concluído: nova execução sem prévia nem pergunta, SHA-256 de `observe.json` e da configuração do agente iguais, agente inicia.
Proof: `node --test --test-name-pattern="I25-C13 " tests/integrations/launch/prepare.cli.test.mjs`

**C14** — `setup` em conflito (4 `observe_on`), instalador em conflito (4) e configuração inválida (3): stderr com o código e os itens, agente não inicia, mesmo código de saída; a raiz já gravada fica e a próxima execução mostra só o que falta.
Proof: `node --test --test-name-pattern="I25-C14 " tests/integrations/launch/prepare.cli.test.mjs`

**C15** — Num terminal real (pty, POSIX), a prévia aparece, a confirmação aplica e o agente inicia; a recusa não altera nada.
Proof: `node --test --test-name-pattern="I25-C15 " tests/integrations/launch/prepare.cli.test.mjs`

**C38** (acréscimo da correção dos achados; critérios 2, 8 e 9 no console do Windows, linha "Console do Windows" do Landing) — Num console real do Windows, a prévia sai legível, um caminho digitado com acento vira exatamente a raiz gravada, e a linha digitada depois das respostas chega intacta ao agente.
Proof: `node --test --test-name-pattern="I25-C38 " tests/integrations/launch/prepare.cli.test.mjs`

### S3 — Execução isolada em capturas sucessivas · 13 arquivos · 107 KB · ~27k

**C16** — Antes do agente, a execução existe: captura `origin: "launch"`, `invocation` = `SKILL_ME_LAUNCH_ID` visto pelo agente, `segment: 1`, `content: true`, `retentionDays: 7`, `limits` exatos, ponteiro no formato do Landing; o agente vê `SKILL_ME_LAUNCH_ROOT` = raiz real e nenhum valor herdado de `SKILL_ME_CAPTURE_*`/`SKILL_ME_LAUNCH_*`, completo ou incompleto.
Proof: `node --test --test-name-pattern="I25-C16 " tests/integrations/launch/session.e2e.test.mjs`

**C17** — Formatos persistidos: o store aceita a captura `launch` e o ponteiro só na forma do Landing (recusa `segment` 0, texto ou ausente, `invocation` inválida, `launchedAt` fora de ISO, chave extra, ponteiro ilegível ou link) e `privacy list` mostra `origin`, `invocation`, `segment` e `launchedAt`.
Proof: `node --test --test-name-pattern="I25-C17 " tests/integrations/launch/store.unit.test.mjs`

**C18** — Execução indisponível: raiz ausente (3 `root_not_found`), store inválido (3 `store_invalid`), lock alheio por mais de 2 s (4 `lock_present`) e E/S (5 `io_failure`): agente não inicia, stderr só com o código, sem caminho.
Proof: `node --test --test-name-pattern="I25-C18 " tests/integrations/launch/session.e2e.test.mjs`

**C19** — Hooks Claude e Codex pela linha instalada e o ingest Hermes gravam cada evento suportado uma vez na captura corrente, com pseudônimos da chave dela e o mesmo conteúdo do `privacy ingest --content`; com `on` ligado e um par manual válido no ambiente do usuário, nada vai para captura automática ou manual.
Proof: `node --test --test-name-pattern="I25-C19 " tests/integrations/launch/session.e2e.test.mjs`

**C20** — Par `SKILL_ME_LAUNCH_*` incompleto ou inválido: `binding_invalid`, nada gravado em captura nenhuma, também com `on` e com par manual válido.
Proof: `node --test --test-name-pattern="I25-C20 " tests/integrations/launch/session.e2e.test.mjs`

**C21** — `<raiz>/skill-me-privacy/observe.json` e `<home>/.skill-me-authorization.json` com os mesmos bytes (ou ausentes) depois de uma invocação, com `on` e com `off`.
Proof: `node --test --test-name-pattern="I25-C21 " tests/integrations/launch/session.e2e.test.mjs`

**C22** — 503 eventos Hermes numa execução: segmento 1 com 500 e `stopped` sem descarte, segmento 2 com os 3 seguintes (o 501º primeiro), chaves diferentes, mesma `invocation`, mesmos limites/conteúdo/retenção; outro processo produtor continua no segmento 2.
Proof: `node --test --test-name-pattern="I25-C22 " tests/integrations/launch/session.e2e.test.mjs`

**C23** — Limite de 8 MiB: o registro que cabe exatamente fica na corrente; com um byte a menos de espaço, ele abre o segmento seguinte, sem descarte e sem passar de 8388608 bytes.
Proof: `node --test --test-name-pattern="I25-C23 " tests/integrations/launch/session.e2e.test.mjs`

**C24** — Captura corrente encerrada à mão (`privacy stop`) durante a execução: o próximo evento abre o segmento seguinte da mesma execução (sucessão herdada da rotina comum).
Proof: `node --test --test-name-pattern="I25-C24 " tests/integrations/launch/store.unit.test.mjs`

### S4 — Encerramento verificável e consulta sem ID · 5 arquivos · 32 KB · ~8k

**C25** — Saída do agente: depois do launcher sair, a corrente está `stopped` com `endedAt`, o ponteiro sumiu, e o stderr traz o ID da execução e, por captura, segmento, ID, `stopped`, `persisted` e descartes, e `skill-me report`.
Proof: `node --test --test-name-pattern="I25-C25 " tests/integrations/launch/end.e2e.test.mjs`

**C26** — Execução sem nenhum evento gravado: o resumo diz que nada foi gravado e repete o primeiro `manualStep` do agente.
Proof: `node --test --test-name-pattern="I25-C26 " tests/integrations/launch/end.e2e.test.mjs`

**C27** — Revogação: depois do encerramento, um hook com o par da execução recebe `launch_ended` e nada é gravado; um produtor que obteve o lock antes do encerramento grava, o que chega depois não.
Proof: `node --test --test-name-pattern="I25-C27 " tests/integrations/launch/end.e2e.test.mjs`
Proof: `node --test --test-name-pattern="I25-C27 " tests/integrations/launch/store.unit.test.mjs`

**C28** — Hermes de fixture com o plugin real (`src/integrations/hermes/plugin/__init__.py`, carregado pelo Python do sistema com `register(ctx)`) e o processo de entrega já em execução (o primeiro registro já gravado) entrega mais 2 — `observer_stats()` com `enqueued` = `delivered` = 3, nada retido na fila — e sai logo depois do último: as capturas da execução somam `persisted` 3 e estão `stopped`.
Proof: `node --test --test-name-pattern="I25-C28 " tests/integrations/launch/end.e2e.test.mjs`

**C29** — Agente terminado por sinal (POSIX): execução encerrada (`stopped`) e o launcher termina pelo mesmo sinal.
Proof: `node --test --test-name-pattern="I25-C29 " tests/integrations/launch/command.cli.test.mjs`

**C30** — Falha de início (`ENOENT` → 127; outro erro → 126): segmento 1 `stopped` com 0 eventos, stderr com o código de início.
Proof: `node --test --test-name-pattern="I25-C30 " tests/integrations/launch/command.cli.test.mjs`

**C31** — Encerramento falha (lock alheio por mais de 2 s; E/S): stderr com o código, a captura `active`, o ID e o comando `privacy stop`, que a encerra quando executado, e a linha do estado da execução conforme o ponteiro (aberta com o lock alheio; já sem registros quando a E/S falha depois de apagar o ponteiro); o código de saída é o do agente.
Proof: `node --test --test-name-pattern="I25-C31 " tests/integrations/launch/end.e2e.test.mjs`

**C32** — Duas invocações simultâneas intercaladas: IDs de execução, capturas e chaves próprios, nenhum registro cruzado; a saída da primeira não encerra a outra, que segue gravando.
Proof: `node --test --test-name-pattern="I25-C32 " tests/integrations/launch/end.e2e.test.mjs`

**C33** — `npm run off` e `npm run on` durante a invocação: a corrente continua `active` e o próximo evento entra nela; nenhuma captura automática nasce da sessão.
Proof: `node --test --test-name-pattern="I25-C33 " tests/integrations/launch/end.e2e.test.mjs`

**C34** — `skill-me report` relata a execução iniciada por último — também quando o segmento 1 de uma execução mais antiga foi apagado e ela tem sucessora criada depois do início da mais recente: cabeçalho, seções na ordem dos segmentos com `Captura: <id>`, segmentos ausentes e execução aberta; JSON `skillMeLaunchReport` com cada relatório igual ao de `integrations report --root --capture`; `report --latest` e `npm run status` continuam só com automáticas.
Proof: `node --test --test-name-pattern="I25-C34 " tests/integrations/launch/report.cli.test.mjs`

**C35** — Sem captura `launch`: 3 `no_launch_capture`; sem configuração: 3 `not_configured`; ambos no JSON de erro `schemaVersion: 1`.
Proof: `node --test --test-name-pattern="I25-C35 " tests/integrations/launch/report.cli.test.mjs`

### S5 — Ajuda e documentação · 8 arquivos · 126 KB · ~31k

**C36** — `skill-me --help`/`help`: stdout, 0, com preparo único, fluxo diário, consulta e limites; sem argumento ou com subcomando desconhecido: 2 e a ajuda no stderr.
Proof: `node --test --test-name-pattern="I25-C36 " tests/integrations/launch/command.cli.test.mjs`

**C37** — README apresenta preparo e fluxo diário antes do `on`/`off`; README e os três guias declaram confiança manual, ausência de evento de skill no Codex, cobertura só de ferramentas locais, capturas sucessivas de 500 eventos/8 MiB com chave própria, a janela de 750 ms, o encerramento forçado e `skill-me report`; os guias citam o par `SKILL_ME_LAUNCH_*` e a precedência dele.
Proof: `node --test --test-name-pattern="I25-C37 " tests/integrations/launch/docs.test.mjs`

## Swept

- validation: C4, C7, C11, C17, C20; C2 (argumentos sem interpretação).
- failure modes: C14, C18, C30, C31.
- idempotency and retry: C13; existing — `transition` não muda captura já `stopped`, e nenhuma entrega é reenviada (#8).
- authorization: C9, C10, C12 (consentimento); C16 (vínculo só no ambiente do agente); C21 (autorização global intacta); C27 (nada entra depois do encerramento).
- concurrency and ordering: C22 (sucessão sob o lock, entre produtores), C27 (produtor em voo × encerramento), C28 (Hermes em voo), C32, C33.
- data lifecycle: C16 e C22 (retenção de 7 dias por captura); C25 (`endedAt`); `privacy prune` existente; encerramento forçado é `Unresolved` 5.
- external-dependency failure: C7 (agente ausente); C26 (sem confiança, nada gravado); existing — falha de entrega nunca bloqueia o agente (#8).
- state transitions: C22, C24, C25, C29, C30, C31, C33.
- observability: C25, C26 (resumo), C34, C35 (consulta com segmentos e lacunas).

## Handoff

Um lote: S1 ~11k + S2 ~21k + S3 ~27k + S4 ~8k + S5 ~31k = ~98k tokens de leitura mínima
(`wc -c` dos arquivos tocados ÷ 4), abaixo do teto de 150k; nenhuma fronteira de entrega é
necessária. Boa parte de S1–S4 já foi lida no planejamento. O Verifier e a revisão formal ficam
com o orquestrador depois do último commit; este agente não os convoca.

- Onde a fronteira caiu: lote único, C1–C37 fechados; produto em `7bb3f45` (store e entrega),
  `8629415` (launcher, consulta e provas S1–S4), `95ec7bd` (documentação) e `dedd5b4` (correção de
  prova). Provas e totais em `.checks/issue-25-agent-launch.build.md`.
- O que o proprietário decidiu durante o build: aprovação do plano completo e do checklist
  (“Aprovar plano completo e implementar”, issue #25, comentário 6415701125), mantida a decisão B.
  Os riscos 1–4 da conferência do plano viraram as linhas “Início da execução” e “Ordem e falha do
  encerramento” do Landing e o reforço das provas de C5, C28, C31 e C34, antes do código.
- O que foi abandonado: prova do Ctrl+C do Windows por `emit("SIGINT")` em processo — não exercita
  o console; substituída pelo `CTRL_C_EVENT` real. Escolha da execução pelo `createdAt` do menor
  segmento restante — escolhe a execução errada com o segmento 1 apagado.
