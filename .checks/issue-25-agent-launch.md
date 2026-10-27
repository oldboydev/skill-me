# Iniciar o agente com captura: `skill-me <agente>` — issue #25

Sources:

- [Exceção para C28, 26/10/2026](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6432258457): o proprietário respondeu “Autorizar a 8ª verificação”, somente para a #25 e com histórico preservado. O teto do Verifier passa de 7 para 8; o formal permanece 5 (quatro consumidas). A correção da fixture estava pronta em `22e8fc5`, com regressão e provas do autor verdes. PASS e `ready` exigidos antes da atualização do PR #28; merge autorizado quando a CI estiver toda verde. Contexto em `.checks/code-review/issue-25/context-ci28-verifier8-approved.json`.

- [Exceção para a correção da CI do PR #28, 26/10/2026](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6431483843): o proprietário autorizou “Autorizar a 7ª verificação”, exclusivamente para a #25, com histórico preservado. O teto do Verifier passa de 6 para 7; o de revisões formais permanece 5 (quatro consumidas). A correção e o merge após CI verde foram autorizados no pedido atual. O pacote continua privado. Contexto em `.checks/code-review/issue-25/context-ci28-verifier7-approved.json`.

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
| Espera da harness nativa do Hermes (S6, autorização 6419121665, AC6) | A decisão sai do laço de `tests/integrations/fixtures/hermes/harness.py` para `tests/integrations/fixtures/hermes/settle.py` (Python só com a biblioteca padrão, carregado pelo caminho, porque `-I` não põe a pasta do script no `sys.path`), usado pela harness e pela prova `hermes-harness.unit.test.mjs`. `delivery_state(stats)` lê só os contadores de `observer_stats()`: com `active` falso, `"failed"` se `deliveryFailed > 0`, senão `"inactive"`; com `active`, `"concluded"` quando `delivered + oversize + serializationFailed >= enqueued` (todo registro posto na fila saiu dela), senão `"pending"`. `wait_for_delivery(read_stats, max_ms, clock, sleep)` relê a cada 50 ms (relógio monotônico injetável) e devolve `{state, waitedMs, stats}` no primeiro estado que não é `"pending"`, ou `state: "timeout"` ao chegar a `max_ms`. `settle_max_ms(scenario)` = `settleMaxMs` do cenário, ou 5000 — o teto não muda. A harness grava `settle: {state, waitedMs}` no resultado (ou `null` sem o plugin), ao lado dos `stats` de sempre. Plugin, callbacks, prazos dos cenários e asserções existentes não mudam. | Manter “300 ms sem mudança nos contadores”: encerra com eventos ainda na fila enquanto o `Popen` do processo de entrega leva 453–469 ms (medido pelo Verifier), e o resultado lido é `delivered: 0`. Janela de estabilidade maior: continua um palpite sobre a máquina, só desloca a intermitência. Esperar o processo de entrega terminar ou o EOF dele: um destino travado nunca termina, e a harness não tem esse processo. Manter a decisão dentro da harness: sem Hermes instalado (CI) nada a exercita. |

| Sucessora não publicada (regressão da revisão formal em `2fd858a`, P2 de `store.mjs:1071`; task 33, C41) | Na sucessão de `appendLaunch`, sob o mesmo lock: quando a captura do ponteiro não está `active`, as capturas da execução (mesma `invocation`, lidas como no resumo do encerramento) são consultadas. Havendo uma `active` com `segment` maior que o do ponteiro — uma sucessora criada cuja publicação falhou —, ela é incorporada: o ponteiro é regravado para ela (mesmo `id` e `segment`) e o lote vai para ela. Senão, a sucessora nova recebe `segment` = maior número já visto na execução (ponteiro ou capturas) + 1. A falha de publicação não tem compensação no ato: a entrega sai com `io_failure` e as entradas contam como perdidas. `endLaunch`, depois de apagar o ponteiro, para toda captura `active` da execução (a do ponteiro primeiro); se alguma não parar, o erro leva `revoked: true`, `capture` (a primeira) e `captures` (todas as que ficaram `active`), e o launcher escreve uma linha `skill-me: encerre com: "<node>" "<cli.mjs>" privacy stop --root "<root>" --capture <id>` por captura, depois da linha de falha. Na abertura (`startLaunch`), a falha ao parar o segmento 1 depois da falha do ponteiro deixa de ser engolida: o erro leva `capture` e `orphan: true`, e o launcher acrescenta `skill-me: a captura <id> ficou active; encerre com: "<node>" "<cli.mjs>" privacy stop --root "<root>" --capture <id>`. Sem ponteiro, nenhuma entrega reabre a captura (`launch_ended`). | Compensar no ato (parar ou remover a sucessora): a compensação também pode falhar, e uma sucessora parada ainda deixava a próxima entrega criar outra com o mesmo N+1. Gravar o ponteiro antes da captura: exige outro contrato de `createCapture` (receber o id) e cria ponteiro para captura inexistente. Consultar as capturas a cada evento: custo O(capturas) sob o lock em todo hook; a consulta só ocorre quando a corrente não está ativa. Diário ou transação de sucessão: camada nova sem outro consumidor. |
| Descoberta das capturas no encerramento (refinamento de C41, observação do orquestrador sobre `eb8cdd7`) | `endLaunch` deixa de descobrir as capturas da execução por `launchCaptures` (que perde a varredura inteira num erro de E/S cru e devolvia `captures: null`). Lê cada nome de `captures/` com `readCapture`: `StoreError` (formato inválido, link, entrada alheia) fica fora, como no contrato aprovado de “uma ilegível de qualquer origem não impede o resumo”; erro de E/S cru põe o nome em `unreadable`; falha ao listar `captures/` torna a descoberta inteira não lida. Para cada captura lida desta execução que está `active`, a parada é a de sempre; o resumo sai dos estados já lidos e parados, sem reler. Se houver `unreadable` (ou a listagem falhou), o erro leva `revoked: true`, `unverified: true`, `unreadable` (nomes, ou `[]` quando a pasta não foi lida) e o código da falha; o launcher escreve `skill-me: a execução <invocation> já não recebe registros, mas não foi possível conferir se todas as capturas dela pararam [<código>].`, depois `skill-me: capturas que não puderam ser lidas: <id>, ….` (ou `skill-me: a pasta das capturas não pôde ser lida.`) e, por captura, `skill-me: quando a leitura voltar, confira com "<node>" "<cli.mjs>" privacy status --root "<root>" --capture <id>; se mostrar "invocation":"<invocation>" e "state":"active", encerre com "<node>" "<cli.mjs>" privacy stop --root "<root>" --capture <id>` (sem nomes: `… privacy list --root "<root>"` e o mesmo critério). Falha ao parar e captura não lida podem vir juntas: as duas partes saem. A variante “resumo das capturas não pôde ser lido” da linha anterior deixa de existir: o resumo não é relido. | Repetir a varredura até ler tudo: uma falha persistente prenderia o launcher e o prazo seria um palpite. Parar ou listar capturas de outras execuções pelo nome não lido: alteraria captura alheia sem saber a quem pertence. Tratar `StoreError` como não conferido: quebraria o contrato aprovado sobre capturas alheias de formato inválido, que bloqueariam todo encerramento da raiz. Diário de sucessões para saber o id da sucessora sem ler as capturas: camada nova sem outro consumidor. |
| Vínculo do ponteiro no encerramento (refinamento de C41 e task 33, observação do orquestrador sobre `e238cc0`) | `readLaunchFile` confere só a forma do ponteiro; o vínculo dele com a captura é conferido pelo `state.json` da captura, como `appendLaunch` já faz (`store_invalid` quando a corrente tem outra `invocation`). No encerramento, a captura nomeada pelo ponteiro é lida e só é parada se o estado tiver `origin: "launch"` e a mesma `invocation`; a de outra execução não é tocada, e o encerramento segue pela descoberta, que só para capturas da execução. A captura do ponteiro que não pôde ser lida segue o contrato da descoberta — erro de E/S cru: entra em `unreadable`, com o critério de `invocation`, se continuar ilegível na descoberta; `StoreError`: fica de fora — em vez de virar uma falha ao parar, que a daria como captura da execução que ficou `active`. Na falha do encerramento com o ponteiro presente, `peekLaunch` (sem lock) lê também a captura do ponteiro e só a devolve se o estado dela for desta execução: de outra execução, o ponteiro é inválido (`store_invalid`); ilegível, o vínculo não pôde ser conferido (o erro da leitura). Nos dois casos vale a orientação já existente para ponteiro ilegível — execução aberta, com a captura que a própria invocação abriu. | Recusar o encerramento inteiro com `store_invalid`: as capturas da execução ficariam `active` sem orientação. Parar a captura apontada e só avisar: altera captura de outra execução. Regravar o ponteiro com a captura certa: escreve um estado que ninguém pediu, e o ponteiro sai no encerramento. Ler a captura do ponteiro sem ligar para o vínculo no diagnóstico: manda parar a captura alheia como se fosse desta execução. |
| Lock após a abertura (segunda revisão formal em `6d57e6e`, P2 de `store.mjs:1042`; task 35, C43) | `holdLockFile` continua como está (prioridade do erro do callback, conferência dos bytes, nunca remove lock alheio). `startLaunch` guarda a identidade da execução quando o callback termina; se a liberação falhar depois disso, o erro leva o código (StoreError preservado; E/S crua vira `io_failure`), `opened: true`, `invocation`, `capture`, `launchedAt`, `lockPath` (o `.lock` do store) e `lockLeft` (`true` só na falha de E/S: o lock gravado pela invocação pode ter ficado; `false` para lock ausente ou trocado, que não é dela). O launcher não inicia o agente, escreve `skill-me: a execução <invocation> foi aberta com a captura <id>, mas a liberação do lock da raiz falhou [<código>]; o agente não foi iniciado.` e chama o encerramento de sempre (`endLaunch` com a paciência de 2 s): concluído, o resumo de sempre; senão as linhas de falha de sempre e, com `lockLeft`, `skill-me: o lock "<lockPath>" desta invocação pode ter ficado na raiz; enquanto existir, gravações e comandos nela saem com lock_present. Quando a E/S voltar, se ele ainda contiver "pid":<pid> e esse processo tiver terminado, remova-o e só então rode o comando acima.` (`<pid>` é o do launcher, gravado no lock). Saída pelo código da abertura. A recuperação manual repete o contrato já documentado para lock que fica (`docs/traces.md`: conferir que nenhum processo está ativo e removê-lo), agora com o arquivo, o `pid` e os IDs. No encerramento, pela mesma regra: `endLaunch` guarda o resultado (`{ended, captures}`, já parados) quando o callback termina; se a liberação falhar, o erro leva `closed`, `lockPath` e `lockLeft`, e o launcher escreve o resumo de sempre, `skill-me: a execução <invocation> foi encerrada, mas a liberação do lock da raiz falhou [<código>].` e, com `lockLeft`, a mesma linha do lock; a saída continua a do agente. | Nova tentativa automática de liberar o próprio lock: política nova de repetição sem prazo decidido. Remover o lock no encerramento seguinte ou por um comando `unlock`/`--force`: remove lock que pode ser de outro processo e cria comando público sem decisão. Mudar `holdLockFile` para devolver o resultado com o erro: muda o helper comum ao lock da raiz e ao da configuração da observação, sem necessidade — a identidade é da abertura. Iniciar o agente mesmo assim: com o lock preso nenhuma entrega grava. |
| Cronologia explícita no C34 (alvo WSL em `abae80a`: `report.cli.test.mjs:130`, `[antiga, false]` no lugar de `[nova, true]`) | O contrato de `latestLaunch` fica: a mais recente é a de maior (`launchedAt`, `invocation`), sem `createdAt` de segmento. O que se sabe: a prova abria a nova depois de um marcador da antiga e dependia de o relógio de parede do host crescer entre as duas aberturas; o journal do WSL registrou, na janela, recuos de até 1,24 s; os `launchedAt` da falha não ficaram no log, então não se afirma causa única. Arranjo só na prova (`report.cli.test.mjs`): as aberturas cuja ordem importa rodam o launcher em processo, como em C41/C43, com o `deps.now` que `runSkillMe({argv, deps})` já recebe — um relógio por abertura que começa numa base fixa, anda com `performance.now()` (nunca recua) e, depois de a abertura estar confirmada pelo marcador do agente, passa ao relógio do sistema. `deps.now` só carimba a abertura e o encerramento (`command.mjs`); prazos, locks, paciência e entregas seguem com o tempo real. Bases: antiga início − 2 h, nova início − 1 h; no `--latest`, a abertura 60 s depois do `createdAt` da automática. A sucessora da antiga continua criada pelo hook real (relógio do sistema). A prova confere as precondições antes da escolha, com os tempos, e confere que escolher pelo `createdAt` daria a antiga. O apoio de falha de C32 vai para `helpers/launch.mjs` e passa a trazer `launchedAt` e `createdAt` das capturas. Regressão nova: a segunda abertura carimbada 5 s antes da primeira (o recuo do host, simulado só no `deps.now` desta prova) faz a escolha apontar a primeira, e a precondição falha com os dois tempos. | Esperar ou repetir até o relógio avançar, tolerância ou skip no WSL: proibidos. Reescrever o `launchedAt` das capturas depois de abertas: fabrica a escolha. Pré-carga trocando o `Date.now` nos processos: alcançaria tudo o que mede tempo neles; o `deps.now` já existe e só carimba abertura e encerramento. Escolher pelo `createdAt` ou pela ordem de início: mudança de regra do produto, fora do escopo. |
| Bin do launcher em LF em todo checkout (CI do PR #28, run 40443538957, Windows: I25-C1 com ` M src/integrations/launch/cli.mjs` depois do `npm link`) | Causa confirmada: o checkout do Windows usa `core.autocrlf=true` e põe CRLF em `cli.mjs`; o `npm link` do npm 11.6.2 passa o bin por `bin-links/lib/fix-bin.js` (bin-links 5.0.0), que, se a primeira linha termina em `\r\n`, reescreve o arquivo com `writeFileAtomic` trocando só essa linha para LF. Reproduzido num clone novo com `core.autocrlf=true` só na config do clone (primeira linha CRLF antes, LF depois, as outras 124 linhas com CRLF, `git status` com ` M`); controle com `false` sem mudança. Correção: `.gitattributes` com uma linha só, `src/integrations/launch/cli.mjs text eol=lf`; o checkout sai em LF com qualquer `core.autocrlf` e o `npm link` só faz o `chmod`. O blob no índice já é LF; nenhum outro arquivo muda. C1 não muda. | Aceitar a mudança no C1 ou comparar só arquivos rastreados: enfraquece a prova de que o link não altera o checkout. Restaurar os bytes depois do link: esconde a alteração. `.gitattributes` para o repositório inteiro ou mudança no npm/core: fora do achado. Isolar o C1 num clone próprio: o link do usuário é no checkout dele, e um clone do HEAD não vê o estado da árvore numa execução local; com a correção o link não escreve na árvore, e fica como limite que o C1 compara a árvore compartilhada antes e depois (um arquivo não rastreado criado por outro teste nesse intervalo apareceria). |
| Diagnóstico de C32 (CI do PR #28, run 40443538957, Windows: `tempo esgotado: eventos intercalados` em 30,5 s, `end.e2e.test.mjs:272`) | Causa **não conhecida**: o runner não deixou artefatos além do log, e a prova só esperava os marcadores, sem o stderr dos launchers. Não há evidência de que a reescrita do `cli.mjs` pelo C1 tenha interferido: o `writeFileAtomic` troca o arquivo por `rename`. Correção só de diagnóstico e ciclo de vida, na prova: as esperas de C32 passam por um apoio que, a cada leitura, confere se as invocações que precisam estar vivas ainda estão (uma que termina antes falha a espera na hora) e mantém o limite de 30 s; em qualquer falha, grava todos os marcadores de barreira (para os agentes de fixture saírem), espera as duas invocações (pelo limite de 60 s do `runSkillMe`) e lança o erro com marcadores vistos, probes presentes (só o ID da execução), capturas por execução (segmento, estado, `persisted`; sem chave) e status, sinal e stderr de cada launcher. A concorrência, as esperas e as asserções de C32 não mudam. Matriz finita planejada para a hipótese de interferência: clones novos com `core.autocrlf=true` (sem a correção do C1) e `false`, 3 execuções de cada com `command.cli`, `end.e2e` e `prepare.cli` em `--test-concurrency=3` (como os 4 vCPU da CI), Node 24.13.0 oficial. | Aumentar o limite de 30 s ou serializar os agentes: muda a prova. Repetir a espera: esconde a falha. Atribuir a falha ao C1 sem evidência. |
| Diagnóstico do C28 na fixture (Verifier 7 em `a755c37`, execução B: Windows Node 24.13.0, `end.e2e.test.mjs:143` com `undefined !== 0` em 62 s) | O que os artefatos de B mostram, sem causa original: o primeiro registro do Hermes não chegou à captura (`accepted` e `persisted` 0, sem segmento, `state.json` intocado; diretório da captura e do store modificados juntos ~1,5 s depois da abertura, compatível com uma gravação desfeita), a fixture esperou os 60 s dela por ele, o `runSkillMe` encerrou o launcher no limite de 60 s (captura `active`, ponteiro presente), e o teste leu o próprio cenário, porque cenário e saída eram o mesmo `plugin.json`. A causa da perda **não é conhecida**: a entrega da execução não publica relatório e a saída do processo de entrega é descartada pelo plugin. Correção só na prova e na fixture: (1) cenário `cenario.json` e saída `plugin.json`; a prova confere `signal` nulo e a existência da saída, com status e stderr do launcher na mensagem, antes do parse; (2) `hermes-plugin-session.py` com orçamento explícito abaixo do supervisor: até 25 s pelo primeiro registro gravado e até 25 s pela entrega dos demais (50 s, com 10 s de margem até os 60 s do `runSkillMe`); se o primeiro não for gravado no prazo, não dispara os demais, imprime `{"started": false, "delivered": false, "stats": observer_stats()}` e sai com 0; nunca reenvia nem repete; (3) regressão determinística com uma variável nova da pré-carga de teste já existente, `SKILL_ME_TEST_TRACES_SEGMENT_EIO=<n>` (a n-ésima promoção `rename` → `events-NNNNNN.ndjson` lança EIO sem tocar no disco), propagada por `NODE_OPTIONS` como nas provas de C42/C43, e a evidência pelo `SKILL_ME_TEST_TRACES_TIMING` existente (operação, tipo de arquivo e código; sem caminho nem conteúdo). A injeção reproduz só a classe observada (primeira entrega perdida com gravação desfeita), não a causa original. Prazos do produto (750 ms, 5000 ms), o limite de 60 s do `runSkillMe`, tolerâncias, skips e as asserções saudáveis não mudam. | Aumentar o limite do `runSkillMe` ou manter os 60 + 30 s da fixture: a fixture continuaria sobrevivendo ao supervisor e o diagnóstico se perderia. Reenviar ou repetir a entrega na fixture: mascara a perda. Repetir o `rename` no store ou publicar o relatório da entrega da execução em `SKILL_ME_CAPTURE_REPORT`: mudança de produto, fora desta correção. Atribuir a perda a EPERM/EIO: sem evidência. |
| Ambiente do npm run nas provas (CI do PR #28, run 40397022558, Ubuntu 22.04: I25-C33 e I25-C34 com stdout e stderr vazios) | Causa medida, não produto: no POSIX o npm roda o script por `sh` procurado no PATH (`@npmcli/promise-spawn`: `'sh'`; no Windows, `ComSpec`), e não acrescenta o diretório do Node (`set-path.js`: só `node_modules/.bin` e `node-gyp-bin`). O PATH que C33 e C34 montavam era o diretório do `process.execPath` mais o bin de fixture; na CI o Node fica em `/opt/hostedtoolcache/…/bin`, sem `sh`, e o `npm run --silent` saía com 254 sem saída (`spawn sh ENOENT`, visível sem `--silent`). No WSL passava porque o Node está em `/usr/bin`, que tem `sh` — e também os `claude`/`codex` reais. Correção só nas provas: no POSIX, o PATH do `npm run` desses dois testes é uma pasta do scratch só com `node` (ligado ao `process.execPath`) e `sh` (ligado a `/bin/sh`), seguida do bin de fixture; nenhum diretório real entra. No Windows fica como antes (diretório do Node e bin de fixture; o npm usa o `ComSpec`). O texto de erro de `singleJson` passa a trazer o `status` do processo. Asserções, skips, prazos, workflow e `fail-fast` não mudam. | Herdar o PATH real (como `baseEnv`): no WSL traria `/usr/bin` com agentes reais. Acrescentar `/bin` ou `/usr/bin`: o mesmo, e mais qualquer programa. `npm_config_script_shell=/bin/sh`: muda a configuração do npm em vez do PATH que o usuário tem, e valeria para todo `runNpmScript`. Pular os testes sem `sh`: esconde a prova. |
| Componentes vazios do PATH (terceira revisão formal em `9cd06d5`, P2 de `agent.mjs:30`; task 37, C45) | Só `resolveAgentLaunch` muda; `resolveAgents` do doctor recebe a lista pronta, como antes. No POSIX, o PATH é dividido em `:` e cada componente vazio — no começo, no meio, no fim, repetido, ou o PATH inteiro `""` — vira o `cwd` da resolução (o diretório em que `skill-me` roda e que o agente herda), na mesma posição; os demais componentes seguem como vieram, na ordem. O candidato é `<cwd>/<agente>`, absoluto, e o spawn continua por caminho, sem shell. A semântica é a medida no WSL Ubuntu com uma fixture sintética (dois executáveis de mesmo nome, no diretório atual e num diretório posterior): bash, dash, `execvp` (GNU `env`) e `spawn` do Node escolhem o do diretório atual em `:B`, `X::B`, `X:`, `::B`, `X:::` e `""`, e o de `B` em `B:`, `B` e `X:B`. PATH ausente continua sem diretórios (`executable_not_found`): os runtimes usam um caminho padrão do sistema, sem o diretório atual, e o launcher não inventa esse padrão. O PATH entregue ao agente não muda. No Windows nada muda: `;`, vazios ignorados, PATHEXT e o shim do npm. `runDiagnostics` do doctor e `integrations run` mantêm a política deles. | Mudar `resolveAgents` ou `runDiagnostics`: muda a política global do doctor, fora deste achado. Usar `.` no lugar do vazio: o candidato `./codex` seria relativo ao diretório do processo, não ao `cwd` recebido pela resolução. Iniciar pelo nome e deixar o runtime procurar: perde a resolução do doctor (shim do npm, `launcher_requires_shell`, C4). Caminho padrão para PATH ausente: política nova. Remover duplicatas de vazios repetidos: muda a composição do PATH sem efeito na escolha. |
| Leitura transitória na espera da harness (segunda revisão formal em `6d57e6e`, P2 de `settle.py:26`; task 36, C44) | Só `tests/integrations/fixtures/hermes/settle.py` e as provas mudam. `delivery_state` com `active` falso passa a exigir a contagem fechada antes de terminar: `pending` enquanto `delivered + oversize + serializationFailed + deliveryFailed < enqueued`; depois `failed` se `deliveryFailed > 0`, senão `inactive`. Com `active`, nada muda. `wait_for_delivery`, a leitura a cada 50 ms e `settleMaxMs` (5000 por padrão) não mudam: uma contagem que não fecha termina `timeout` no prazo. O plugin desliga a entrega (`disabled`) antes de contar a perda e `observer_stats` lê `active` fora do lock dos contadores; as duas janelas dão `active` falso com a perda ainda não contada, e essa leitura deixa de terminar a espera. Sem destino, nada vai à fila e a leitura `active` falso com tudo 0 continua `inactive` na hora. | Janela de contadores parados antes de aceitar a falha: palpite de tempo, recusado em C39/C40 e pelo pedido. Ler o estado interno do plugin (thread de entrega viva): acopla a harness a nomes privados; os contadores públicos bastam para a contagem fechar. Aumentar `settleMaxMs`: proibido e não resolve a leitura errada. Limitação que fica: `deliveryFailed` também conta callbacks recusados depois do desligamento; se callbacks rodarem durante a drenagem, a soma pode fechar antes da perda drenada ser contada — o estado sai `failed` (correto), com `deliveryFailed` ainda menor que o final. Um registro posto na fila depois da drenagem nunca é contado pelo plugin e leva a `timeout`. |
| Cancelamento antes do agente (regressão da revisão formal em `2fd858a`, P2 de `agent.mjs:61`; task 34, C42) | `guardSignals` guarda em `cancelled` o primeiro sinal recebido antes de `attach` (SIGINT, SIGHUP, SIGTERM e, fora do Windows, SIGQUIT); depois de `attach` vale a linha "Sinais" sem mudança (terminal ignorado, SIGTERM repassado ao agente vivo um para um, nada depois que ele sai). O launcher confere `cancelled` antes de cada tentativa de abertura dentro de `patiently` (cancelado, para de tentar), logo depois da abertura, e `runAgent` confere depois do `await` da entrada do shim, imediatamente antes do `spawn`, que é síncrono com o `attach`. Cancelado sem captura: só `skill-me: abertura cancelada por <SINAL>; o agente não foi iniciado.`. Com captura: a mesma linha, o encerramento sem a espera de 750 ms (`endLaunch`) e o resumo sem a dica de confiança. Resultado `{exitCode: 128 + n, signal}` com n de `os.constants.signals` (SIGHUP 1, SIGINT 2, SIGQUIT 3, SIGTERM 15): no POSIX o launcher reemite o sinal; no Windows sai com 128 + n (130 para Ctrl+C). | Deixar o sinal matar o launcher (padrão): a captura já criada ficaria `active`. Interromper a operação do store em curso: ela está sob o lock, no meio de uma criação. Repassar ao agente os sinais do terminal: ele os receberia duas vezes (linha "Sinais"). |

- Nada mais nesta mudança é difícil de reverter: a divisão em módulos de `src/integrations/launch/` segue as convenções do repositório e é refatorável.

## Checks

### S1 — Comando e abertura do agente · 9 arquivos · 44 KB · ~11k

**C1** — Com `npm link` num prefixo temporário, `skill-me --help` executado de outro diretório sai com 0 e a ajuda em stdout; `package.json` continua `"private": true`, com `bin.skill-me` apontando a entrada.
Proof: `node --test --test-name-pattern="I25-C1 " tests/integrations/launch/command.cli.test.mjs`
Acréscimo da CI do PR #28 (run 40443538957, Windows; linha “Bin do launcher em LF em todo checkout” do Landing): o mesmo C1, sem mudança de asserção, passa também num clone novo com `core.autocrlf=true` (o padrão do Git no Windows e o do runner), em que `src/integrations/launch/cli.mjs` sai em LF e `git status` fica igual antes e depois do `npm link`; e no controle com `core.autocrlf=false`.

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
Acréscimo da CI do PR #28 (R7 em `a755c37`, falha em B; linha “Diagnóstico do C28 na fixture” do Landing): a prova confere primeiro que o launcher terminou sozinho (`signal` nulo) e que a saída da fixture existe — com o status e o stderr do launcher na mensagem — e só depois a lê; cenário e saída são arquivos diferentes. As asserções do caso saudável não mudam. Prova nova, `I25-C28 primeira entrega perdida`: com a pré-carga de teste fazendo a 1ª promoção de segmento (`rename` para `events-NNNNNN.ndjson`) lançar EIO no processo de entrega, o launcher sai com 0 e `signal` nulo, a saída existe com `status` 0 e a última linha `{"started": false, "delivered": false, "stats": {"enqueued": 1, "delivered": 1, "droppedQueueFull": 0, "deliveryFailed": 0, "oversize": 0, "serializationFailed": 0, "active": true}}` (só o primeiro hook disparou; o plugin passou o registro ao processo de entrega), a captura única fica `stopped` com `accepted` 0 e `persisted` 0, o ponteiro sai e o stderr traz `eventos gravados: 0.`; o registro de tempos da pré-carga (`SKILL_ME_TEST_TRACES_TIMING`) mostra, somando todos os processos, exatamente um `rename` de `segmento.tmp`, com `EIO`, e um `unlink` de `segmento.tmp` — a injeção aconteceu e não houve nova tentativa.

**C29** — Agente terminado por sinal (POSIX): execução encerrada (`stopped`) e o launcher termina pelo mesmo sinal.
Proof: `node --test --test-name-pattern="I25-C29 " tests/integrations/launch/command.cli.test.mjs`

**C30** — Falha de início (`ENOENT` → 127; outro erro → 126): segmento 1 `stopped` com 0 eventos, stderr com o código de início.
Proof: `node --test --test-name-pattern="I25-C30 " tests/integrations/launch/command.cli.test.mjs`

**C31** — Encerramento falha (lock alheio por mais de 2 s; E/S): stderr com o código, a captura `active`, o ID e o comando `privacy stop`, que a encerra quando executado, e a linha do estado da execução conforme o ponteiro (aberta com o lock alheio; já sem registros quando a E/S falha depois de apagar o ponteiro); o código de saída é o do agente.
Proof: `node --test --test-name-pattern="I25-C31 " tests/integrations/launch/end.e2e.test.mjs`

**C32** — Duas invocações simultâneas intercaladas: IDs de execução, capturas e chaves próprios, nenhum registro cruzado; a saída da primeira não encerra a outra, que segue gravando.
Proof: `node --test --test-name-pattern="I25-C32 " tests/integrations/launch/end.e2e.test.mjs`
Acréscimo da CI do PR #28 (run 40443538957, Windows; linha “Diagnóstico de C32” do Landing): o contrato e as asserções de C32 não mudam. As esperas pelos marcadores continuam com o limite de 30 s, mas só enquanto as invocações que precisam estar vivas estão vivas: se uma termina antes, a espera falha na hora. Em qualquer falha, as barreiras dos agentes de fixture são liberadas, as duas invocações terminam, e o erro traz os marcadores vistos, os probes presentes, as capturas por execução (segmento, estado, `persisted`) e status, sinal e stderr de cada launcher. Prova nova, `I25-C32 diagnóstico das invocações simultâneas`: com a segunda invocação sem agente no PATH (127, `executable_not_found`), a espera falha com `B terminou antes` — não `tempo esgotado` —, o erro traz `skill-me: claude não encontrado no PATH [executable_not_found]`, e a primeira invocação, liberada da barreira, termina com 0.

**C33** — `npm run off` e `npm run on` durante a invocação: a corrente continua `active` e o próximo evento entra nela; nenhuma captura automática nasce da sessão.
Proof: `node --test --test-name-pattern="I25-C33 " tests/integrations/launch/end.e2e.test.mjs`
Acréscimo da CI do PR #28 (run 40397022558, Ubuntu 22.04; linha “Ambiente do npm run nas provas” do Landing): C33 e o `npm run status` de C34 rodam com o PATH das provas também quando o Node da suíte está num diretório sem `sh` ao lado, como o da CI. A prova nomeada `I25-C33 arranjo do npm run …` (POSIX) mostra a falha observável desse layout — `npm run status` sem `--silent`, com só o `node` ao lado, sai com código diferente de 0 e `spawn sh ENOENT` no stderr — e que o PATH das provas tem só `node`, `sh` (ligado a `/bin/sh`) e o bin de fixture, com `npm run status` respondendo JSON. Gate: C33 e C34 também passam no layout isolado do WSL (Node e npm copiados num prefixo sem `sh`, PATH explícito sem `/usr/bin`).

**C34** — `skill-me report` relata a execução iniciada por último — também quando o segmento 1 de uma execução mais antiga foi apagado e ela tem sucessora criada depois do início da mais recente: cabeçalho, seções na ordem dos segmentos com `Captura: <id>`, segmentos ausentes e execução aberta; JSON `skillMeLaunchReport` com cada relatório igual ao de `integrations report --root --capture`; `report --latest` e `npm run status` continuam só com automáticas.
Proof: `node --test --test-name-pattern="I25-C34 " tests/integrations/launch/report.cli.test.mjs`
Acréscimo (alvo WSL em `abae80a`, `report.cli.test.mjs:130` com `[antiga, false]`; linha “Cronologia explícita no C34” do Landing): as aberturas cuja ordem a prova depende têm o `launchedAt` fixado pelo relógio da própria abertura (`deps.now` do launcher em processo), não pelo relógio do host. Na prova “escolhe a iniciada por último”: a antiga abre em início − 2 h e a nova em início − 1 h (cada uma andando com o tempo monotônico e depois com o do sistema); a prova confere antes da escolha que `launchedAt` da nova > da antiga e que o `createdAt` da sucessora da antiga é o maior das capturas das duas execuções (escolher pelo `createdAt` daria a antiga), com os tempos na mensagem; a escolha, as seções, os ausentes e a execução aberta são os de antes. Na prova do `--latest`, a abertura do launcher é carimbada 60 s depois do `createdAt` da captura automática, e a precondição “a do launcher é a mais recente” vale por construção. Em falha, as barreiras são liberadas e o erro traz marcadores, probes, capturas com `launchedAt`/`createdAt` e o stderr dos launchers. Prova nova, `I25-C34 recuo do relógio entre as aberturas`: com a segunda abertura carimbada 5 s antes da primeira, `skill-me report --format json` escolhe a primeira (o sintoma do WSL), e a precondição temporal falha com os dois `launchedAt` na mensagem.

**C35** — Sem captura `launch`: 3 `no_launch_capture`; sem configuração: 3 `not_configured`; ambos no JSON de erro `schemaVersion: 1`.
Proof: `node --test --test-name-pattern="I25-C35 " tests/integrations/launch/report.cli.test.mjs`

### S5 — Ajuda e documentação · 8 arquivos · 126 KB · ~31k

**C36** — `skill-me --help`/`help`: stdout, 0, com preparo único, fluxo diário, consulta e limites; sem argumento ou com subcomando desconhecido: 2 e a ajuda no stderr.
Proof: `node --test --test-name-pattern="I25-C36 " tests/integrations/launch/command.cli.test.mjs`

**C37** — README apresenta preparo e fluxo diário antes do `on`/`off`; README e os três guias declaram confiança manual, ausência de evento de skill no Codex, cobertura só de ferramentas locais, capturas sucessivas de 500 eventos/8 MiB com chave própria, a janela de 750 ms, o encerramento forçado e `skill-me report`; os guias citam o par `SKILL_ME_LAUNCH_*` e a precedência dele.
Proof: `node --test --test-name-pattern="I25-C37 " tests/integrations/launch/docs.test.mjs`

### S6 — Conclusão da harness Hermes autorizada · 3 arquivos existentes · 46 KB · ~12k

**C39** — A harness não considera concluída uma entrega pendente só porque os contadores
ficaram estáveis por 300 ms; inicialização atrasada além desse intervalo só conclui quando
a entrega efetivamente termina, com os eventos esperados preservados (task 31, AC6).
Proof: `node --test --test-name-pattern="I25-C39 " tests/integrations/hermes-harness.unit.test.mjs`

**C40** — Falha terminal e destino travado são diferenciados de conclusão bem-sucedida;
o prazo `settleMaxMs` existente, inclusive o padrão 5000 ms, permanece e as provas nativas
mantêm callbacks e ferramentas inalterados (task 32, AC6).
Proof: `node --test --test-name-pattern="I25-C40 " tests/integrations/hermes-harness.unit.test.mjs`
Proof: `node --test --test-name-pattern="I4-C20 |I4-C21 |I4-C37 " tests/integrations/hermes-plugin.native.test.mjs`
Proof: `node --test --test-name-pattern="I25-C40 " tests/integrations/hermes-plugin.native.test.mjs` (acréscimo do build: com o runtime local, a harness real reporta `concluded`, `inactive`, `failed` e `timeout` nos destinos de captura, ingest, sem destino, falha e travado)

O gate `npm test` completo continua obrigatório e deve executar os casos nativos aplicáveis.
A autorização está em issuecomment-6419121665. Não altera C1–C37, tolerâncias, plugin do produto
ou runtimes pessoais. A implementação registra no Landing, antes do código, a forma da espera.

### S7 — Regressões da revisão formal em `2fd858a` (task 33–34; dentro de AC1, AC3, AC4)

Escopo do build inalterado; C1–C40 não mudam. Linhas “Sucessora não publicada” e “Cancelamento
antes do agente” do Landing.

**C41** — Falha ao publicar o ponteiro da sucessora (temporário ou `rename`), com a sucessora já
criada: a entrega do lote sai com `io_failure` e conta as entradas como perdidas; a entrega
seguinte da mesma execução grava na mesma sucessora (mesmo `id`, `segment` 2), e nenhuma outra
captura da execução tem `segment` 2; o encerramento normal deixa `stopped`, com `endedAt`, toda
captura da execução — também a sucessora nunca publicada — e o resumo não lista captura `active`;
se parar uma delas falhar, o encerramento sai com o código, uma linha `privacy stop` por captura
que ficou `active` (o comando a encerra) e entregas posteriores recebem `launch_ended`; outra
execução da mesma raiz não muda. Na abertura, falha do ponteiro seguida de falha ao parar o
segmento 1: o stderr diz que a captura ficou `active` e dá o comando que a encerra.
Refinamento (observação do orquestrador sobre `eb8cdd7`, antes do código que o fecha): se, no
encerramento, alguma captura da raiz não puder ser lida por falha de E/S (não por formato
inválido) — inclusive a sucessora nunca publicada, ou uma captura de outra execução —, o
encerramento não se declara conferido: a execução já não recebe registros (`launch_ended`), toda
captura legível da execução fica `stopped`, nenhuma captura de outra execução é alterada, e o
stderr diz que não foi possível conferir se todas pararam, lista as capturas não lidas e dá,
para cada uma, o `privacy status` que mostra `invocation` e `state` e o `privacy stop` para quando
ela for desta execução e estiver `active`; com a leitura de volta, esses comandos encerram a
sucessora. Captura de formato inválido continua fora do resumo, como antes.
Refinamento (observação do orquestrador sobre o vínculo do ponteiro em `e238cc0`, antes do código
que o fecha): com o ponteiro da execução A nomeando a captura `active` de B, outra execução da
mesma raiz, e os demais campos válidos, a entrega de A continua recusada (`store_invalid`, como
já era) e o encerramento de A para só as capturas de A; o `state.json` e o ponteiro de B ficam
byte a byte iguais e B continua gravando. Se B não puder ser lida nesse encerramento, ela aparece
só entre as não lidas, com o critério de `invocation`, nunca como captura de A que ficou `active`.
Com o encerramento falhando antes de começar (lock alheio) e esse ponteiro, o stderr indica a
captura aberta pela invocação de A e nunca o `privacy stop` de B; o comando indicado não toca B.
Proof: `node --test --test-name-pattern="I25-C41 " tests/integrations/launch/store.unit.test.mjs`
Proof: `node --test --test-name-pattern="I25-C41 " tests/integrations/launch/end.e2e.test.mjs`

**C42** — SIGINT, SIGQUIT ou SIGHUP do terminal, ou SIGTERM, recebido depois do preparo e antes de
o agente iniciar (espera do lock da abertura, abertura em curso, conferência da entrada do shim):
o agente não inicia; captura já criada fica `stopped` com 0 eventos e sem ponteiro; o stderr traz
`skill-me: abertura cancelada por <SINAL>; o agente não foi iniciado.`; no POSIX o launcher
termina pelo mesmo sinal, no Windows sai com 130 no Ctrl+C. Depois de o agente iniciar, nada muda:
os sinais do terminal não são repassados nem cancelam, SIGTERM chega ao agente uma vez por sinal e
sinais durante o encerramento não o interrompem.
Proof: `node --test --test-name-pattern="I25-C42 " tests/integrations/launch/agent.unit.test.mjs`
Proof: `node --test --test-name-pattern="I25-C42 " tests/integrations/launch/command.cli.test.mjs` (POSIX: processo real com o lock da abertura ocupado, SIGINT ao grupo e SIGTERM ao launcher; Windows: Ctrl+C real no console pelo `console-ctrl-c.py`)

### S8 — Regressões da segunda revisão formal em `6d57e6e` (task 35–36; dentro de AC4 e AC6)

Escopo do build inalterado; C1–C42 não mudam. Fontes: os dois P2 de
`.checks/code-review/issue-25/formal-review2.stdout.txt` (`store.mjs:1042` e `settle.py:26`).
Linhas “Lock após a abertura” e “Leitura transitória na espera da harness” do Landing.

**C43** — Na abertura, com o segmento 1 e o ponteiro já gravados, a liberação do lock da raiz
falha (task 35, AC4). `startLaunch` rejeita com o código (`io_failure` para E/S, `root_changed`
para lock ausente ou com outros bytes) e `opened: true`, `invocation`, `capture`, `launchedAt`,
`lockPath` e `lockLeft` (`true` só na falha de E/S). O agente não inicia (sem probe) e a primeira
linha do stderr é `skill-me: a execução <invocation> foi aberta com a captura <id>, mas a
liberação do lock da raiz falhou [<código>]; o agente não foi iniciado.`; saída 5 (`io_failure`)
ou 4 (`root_changed`). Casos:
(a) `unlink` do `.lock` falha com EIO (uma vez ou sempre): segmento 1 `active`, `endedAt: null`,
ponteiro com a captura e `.lock` com os bytes da invocação (`"pid":<pid>`); o encerramento de
sempre sai com `lock_present` e as três linhas dele (código, `encerre com: … privacy stop …`,
execução aberta), seguidas de `skill-me: o lock "<lockPath>" desta invocação pode ter ficado na
raiz; enquanto existir, gravações e comandos nela saem com lock_present. Quando a E/S voltar, se
ele ainda contiver "pid":<pid> e esse processo tiver terminado, remova-o e só então rode o comando
acima.` Nessas condições, removê-lo e rodar o comando deixa a captura `stopped`, e a raiz volta a
aceitar entregas e uma nova abertura. Outra execução da mesma raiz fica byte a byte igual
(captura e ponteiro), e as entregas dela saem com `lock_present` só enquanto o lock existe.
(b) Confirmação perdida — o `unlink` remove o lock e reporta EIO: o encerramento conclui e o resumo
de sempre mostra `capturas: 1; eventos gravados: 0` e o segmento 1 `stopped`; ponteiro e lock
ausentes; sem a linha do lock.
(c) Lock trocado por bytes de outro processo depois do callback: `root_changed`, `lockLeft:
false`; o lock alheio fica byte a byte e não é citado como desta invocação; o encerramento sai
com `lock_present`.
(d) Prioridade: falha ao gravar o ponteiro e falha da liberação juntas devolvem o erro do
callback, sem `opened`, como em C41.
(e) Encerramento (acréscimo do autor: sonda `builder-formal2/probe-end-release.txt` em `dd18af0`
mostrou `não foi possível encerrar …; a captura <id> continua active` com a captura já `stopped`,
o ponteiro fora e o lock preso): com as capturas paradas e o ponteiro apagado, a liberação falha.
`endLaunch` rejeita com o código e `closed` (`{ended, captures}` já parados), `lockPath` e
`lockLeft`. O launcher escreve o resumo de sempre, depois `skill-me: a execução <invocation> foi
encerrada, mas a liberação do lock da raiz falhou [<código>].` e, com `lockLeft`, a mesma linha do
lock de (a) (“o comando acima” é o `skill-me report`, que também espera o lock sair); saída do
agente; nenhuma linha diz `continua active`. Pelo launcher em processo e em processo real (pré-carga,
`SKILL_ME_TEST_TRACES_LOCK_KEPT=2`): captura `stopped`, ponteiro e agente como no encerramento
normal, lock com o `pid`; removido nas condições declaradas, `skill-me report` volta a responder.
Proof: `node --test --test-name-pattern="I25-C43 " tests/integrations/launch/store.unit.test.mjs`
Proof: `node --test --test-name-pattern="I25-C43 " tests/integrations/launch/end.e2e.test.mjs` (em processo, com o io de `createStoreIo` instrumentado; e processo real com a pré-carga de teste `traces-probe.mjs`, `pid` do launcher já terminado)

**C44** — A espera da harness só termina como falha terminal com a contagem fechada (task 36,
AC6). `delivery_state`: com `active`, `concluded` quando `delivered + oversize +
serializationFailed >= enqueued`, senão `pending` (inalterado); sem `active`, `pending` enquanto
`delivered + oversize + serializationFailed + deliveryFailed < enqueued`, depois `failed` se
`deliveryFailed > 0`, senão `inactive`. Leituras: `active` falso com `deliveryFailed` 0 e
registros sem destino → `pending`; perda contada só em parte → `pending`; perda inteira →
`failed`; nada na fila → `inactive`. Pela espera, a sequência ativa → desligada sem perda contada
→ perda parcial → perda final termina `failed` na leitura da perda final, com esses contadores; a
leitura transitória que não fecha termina `timeout` no `settleMaxMs` do cenário ou em 5000 ms.
Pela harness real com o Hermes simulado, o resultado gravado traz `settle.state` `failed`, os
contadores finais (`deliveryFailed` > 0, `active` falso) e `waitedMs` depois da contagem;
sem destino, `inactive`.
Proof: `node --test --test-name-pattern="I25-C44 " tests/integrations/hermes-harness.unit.test.mjs`
Proof: `node --test --test-name-pattern="I25-C40 |I4-C22 " tests/integrations/hermes-plugin.native.test.mjs` (com o runtime local)

### S9 — Regressão da terceira revisão formal em `9cd06d5` (task 37; dentro de AC1)

Escopo do build inalterado; C1–C44 não mudam. Fonte: o P2 de
`.checks/code-review/issue-25/formal-review3.stdout.txt` (`agent.mjs:30`). Linha “Componentes vazios
do PATH” do Landing.

**C45** — Resolução do agente com componentes vazios do PATH (task 37, AC1). Com `codex`
executável no diretório atual (`<cwd>`) e outro em `<depois>`, e `<vazio>` um diretório sem agente:
no POSIX, `:<depois>`, `<vazio>::<depois>`, `<vazio>:`, `::<depois>`, `<vazio>:::` e o PATH `""`
resolvem `<cwd>/codex`; `<depois>:` e os controles `<depois>` e `<vazio>:<depois>` resolvem
`<depois>/codex`; PATH ausente → `{failure: "executable_not_found"}` (127). No Windows, `;<depois>;`
resolve `<depois>\codex.exe` mesmo com `<cwd>\codex.exe`, e o PATH `""` → `executable_not_found`,
como antes. Pelo launcher real no POSIX, nos mesmos PATHs, o agente iniciado é o resolvido (o
`argv[1]` registrado pelo agente falso), com os argumentos literais `--`, `a b`, `""`, `ç` na ordem,
o stdout dele intacto, o código 7 dele e o PATH recebido igual ao dado; PATH ausente → 127 com
`executable_not_found`, sem iniciar o agente. Pelo launcher real no Windows, o controle `;<depois>;`
inicia o de `<depois>`.
Proof: `node --test --test-name-pattern="I25-C45 " tests/integrations/launch/agent.unit.test.mjs` (decisão do resolver, filesystem em memória do doctor, POSIX e Windows)
Proof: `node --test --test-name-pattern="I25-C45 " tests/integrations/launch/command.cli.test.mjs` (processo real: POSIX nos casos acima; Windows no controle)

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

Ampliação autorizada em 26/10/2026: S6 lê 46.018 bytes existentes (harness,
prova nativa e plugin para interpretar os contadores), ~12k. Total mínimo
~110k, ainda no mesmo lote abaixo de 150k; C39/C40 são acrescidos sem alterar
C1–C37 e serão verificados no diff completo.

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

Fechamento do escopo final, C1–C40 (registros acima preservados; o lote inicial fechou C1–C37):

- Onde a fronteira caiu agora: lote único, C1–C40 fechados. Correções da verificação 1 e C38 em
  `3b16e3b` (Landing) e `86e9ba1`; harness do Hermes (C39, C40) em `c89b8f3` (Landing) e `9148a5d`.
  Execuções finais do alvo I25 (59 testes) em Windows Node 24.22.1, Windows Node 24.13.0 e WSL
  Node 24.13.0, e o `npm test` inteiro no Windows, em `.checks/issue-25-agent-launch.build.md`.
- O que o proprietário decidiu depois do lote inicial: “Autorizar ajuste pontual da harness”
  (comentário 6419121665, AC6), limitado à espera da harness antiga e às provas, sem mudar plugin,
  callbacks, runtimes pessoais, tolerâncias ou prazo máximo. O orquestrador fixou C38 = console do
  Windows e C39/C40 = harness (`af3c7b7`).
- O que foi abandonado: escrita e leitura síncronas no console do Windows (mojibake e caminho com
  acento trocado, medidos); a espera por 300 ms de contadores parados (encerra com a fila cheia
  enquanto o `Popen` leva 454–469 ms).

Fechamento das regressões da revisão formal, C1–C42 (registros acima preservados):

- Onde a fronteira caiu agora: lote único, C1–C42 fechados. Achados e checks em `fb99b58`; correção
  em `e238cc0` e `docs/traces.md` em `eb8cdd7`; refinamento da descoberta no encerramento em
  `e07ce47` (Landing) e `82837eb`; refinamento do vínculo do ponteiro em `53de34f` (Landing) e
  `f0d5238`. RED/GREEN de cada um e as execuções finais do alvo I25 (80 testes) em Windows Node
  24.22.1, Windows Node 24.13.0 e WSL Node 24.13.0, mais o `npm test` inteiro no Windows, em
  `.checks/issue-25-agent-launch.build.md`.
- O que o proprietário decidiu depois do C1–C40: a revisão formal em `2fd858a` pediu mudanças (dois
  P2, `store.mjs:1071` e `agent.mjs:61`); o orquestrador acrescentou duas observações dentro de
  AC3/AC4 — leitura transitória no encerramento e vínculo do ponteiro com a captura —, ambas
  confirmadas com prova antes da correção.
- O que foi abandonado: compensar a sucessora no ato da falha de publicação; repetir a varredura do
  encerramento até ler tudo; diário de sucessões; recusar o encerramento inteiro com `store_invalid`
  quando o ponteiro nomeia captura alheia; regravar o ponteiro com a captura certa.

Fechamento das regressões da segunda revisão formal, C1–C44 (registros acima preservados):

- Onde a fronteira caiu agora: lote único, C1–C44 fechados pelo autor. Achados, task 35–36, S8 e
  Landing em `57e031c`; correção e provas em `dd18af0`; C43 (e), a mesma regra no encerramento, em
  `858b583` (Landing) e `d71c143`. RED/GREEN, execuções finais do alvo I25 (95 testes) em Windows
  Node 24.22.1, Windows Node 24.13.0 e WSL Node 24.13.0 e o `npm test` inteiro no Windows com o
  Hermes real em `.checks/issue-25-agent-launch.build.md`.
- O que o proprietário decidiu depois do C1–C42: nada novo. A rodada 3 do Verifier aprovou 42/42
  (`6d57e6e`) e a segunda revisão formal pediu mudanças (dois P2, `store.mjs:1042` e
  `settle.py:26`), dentro de AC4 e AC6. Os tetos de 2 revisões formais e 3 Verifiers foram
  atingidos: estas provas são do autor e não autorizam entrega nem `ready`; verificação ou
  revisão adicionais dependem de exceção do proprietário, pedida pelo orquestrador.
- O que foi abandonado: mudar `holdLockFile` para devolver o resultado com o erro; repetir a
  liberação do próprio lock automaticamente; remover lock no encerramento seguinte ou por comando
  `unlock`/`--force`; janela de contadores parados ou leitura do estado interno do plugin na
  harness.

Exceção autorizada depois de C1–C44 (registros acima preservados):

- O que o proprietário decidiu: “Autorizar as duas rodadas adicionais”
  ([comentário 6423912091](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6423912091)),
  respondendo à pergunta sobre uma 4ª verificação independente e uma 3ª revisão Codex, só para a
  #25. Novos tetos desta entrega: Verifier, 4 rodadas no total; revisão formal (perfil light), 3
  tentativas no total, registradas em `roundOverrides["25"]` de `code-review.config.json`. As três
  verificações e as duas revisões `changes_requested` anteriores continuam no histórico; nenhuma
  outra rodada foi autorizada. A verificação precisa passar antes da revisão; push e PR só com
  `ready`; merge e publicação não autorizados.
- Onde a fronteira caiu: só configuração e documentação; produto em `d71c143`, C1–C44 e os
  critérios da issue sem mudança.

Fechamento da regressão da terceira revisão formal, C1–C45 (registros acima preservados):

- Onde a fronteira caiu agora: lote único, C1–C45 fechados pelo autor. Achado, task 37, S9 e
  Landing em `9922e63`; correção e provas em `7ab5dbf`. RED/GREEN, execuções finais do alvo I25
  (98 testes) em Windows Node 24.22.1, Windows Node 24.13.0 e WSL Node 24.13.0 e o `npm test`
  inteiro no Windows com o Hermes real em `.checks/issue-25-agent-launch.build.md`.
- O que o proprietário decidiu depois do C1–C44: nada novo. A quarta verificação aprovou 44/44
  (`9cd06d5`) e a terceira revisão formal pediu mudanças com um P2 em AC1 (`agent.mjs:30`). Os
  tetos da exceção (4 Verifiers e 3 revisões formais) foram consumidos: estas provas são do autor
  e não autorizam entrega nem `ready`; outra rodada depende de nova exceção específica.
- O que foi abandonado: mudar `resolveAgents` ou `runDiagnostics`; usar `.` no lugar do componente
  vazio; deixar o runtime procurar pelo nome; caminho padrão para PATH ausente.

Nova exceção autorizada depois de C1–C45 (registros acima preservados):

- O que o proprietário decidiu: “Autorizar até 2 de cada (tetos 6/5)”
  ([comentário 6425235841](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6425235841)),
  respondendo à pergunta que limitou a até mais 2 verificações independentes e 2 revisões Codex, só
  para a #25. Substitui só o teto da exceção anterior (comentário 6423912091, registro acima mantido):
  Verifier, até 6 rodadas no total; revisão formal (perfil light), até 5 tentativas no total, em
  `roundOverrides["25"]` de `code-review.config.json`. As 4 verificações e as 3 revisões
  `changes_requested` anteriores continuam no histórico. Usar só as rodadas necessárias; o primeiro
  `ready` encerra a etapa. Push e PR só com verificação aprovada e revisão `ready` do conteúdo atual;
  merge e publicação não autorizados.
- Onde a fronteira caiu: só configuração e documentação; produto em `7ab5dbf`, C1–C45 e os
  critérios da issue sem mudança.

Correção da CI do PR #28 (registros acima preservados):

- Onde a fronteira caiu agora: só provas e documentação. Causa e arranjo em `cee3de8`; correção em
  `2dfe676` (`npmScriptEnv` e a prova nomeada do layout da CI). Produto sem mudança desde
  `7ab5dbf`. RED/GREEN no layout isolado do WSL, alvos nos três ambientes, `npm test` do Windows e
  gate das quatro suítes da CI no layout isolado em `.checks/issue-25-agent-launch.build.md`, com as
  falhas de outras issues registradas sem repetição.
- O que o proprietário decidiu: corrigir as falhas da CI do PR #28 e, verde, fazer o merge (merge
  com o orquestrador, depois da verificação e revisão do novo HEAD). Os tetos da exceção 6425235841
  continuam valendo: 6 Verifiers e 4 revisões formais usados.
- O que foi abandonado: herdar o PATH real no `npm run` das provas; acrescentar `/bin` ou
  `/usr/bin`; `npm_config_script_shell`; pular os testes sem `sh`.

Correção do C28 na fixture (CI do PR #28; registros acima preservados):

- Onde a fronteira caiu agora: só prova, fixture e documentação. Contrato em `c94a7e2`; correção em
  `8eafa11` (fixture com orçamento 25 s + 25 s e saída de diagnóstico, C28 com cenário e saída
  separados, regressão `I25-C28 primeira entrega perdida`). Produto sem mudança desde `7ab5dbf`.
  RED/GREEN e provas nos três ambientes e o `npm test` em `.checks/issue-25-agent-launch.build.md`.
- O que o proprietário decidiu: corrigir as falhas da CI do PR #28 e, verde, o merge; o orquestrador
  permitiu reduzir as esperas internas da fixture abaixo do supervisor de 60 s. Tetos: 7 Verifiers
  usados de 7 e 4 revisões formais de 5; um Verifier 8 depende de nova autorização.
- O que foi abandonado: aumentar o limite do `runSkillMe`; reenviar ou repetir na fixture; repetir o
  `rename` no store ou publicar o relatório da entrega da execução (produto); atribuir a perda a um
  código de erro sem evidência.

Correção da CI 40443538957 no Windows (C1 e C32; registros acima preservados):

- Onde a fronteira caiu agora: `.gitattributes` só para o bin, prova e documentação. Contratos em
  `bcd984e`; diagnóstico de C32 em `485467c`; correção de C1 em `abae80a`. RED/GREEN em clones novos
  com `core.autocrlf=true` e `false`, matriz M2, provas nos três ambientes e o `npm test` em
  `.checks/issue-25-agent-launch.build.md`.
- O que o proprietário decidiu: corrigir a CI do PR #28 e fazer o merge com tudo verde. Tetos: 8
  Verifiers e 5 revisões formais usados; Verifier 9 e revisão 6 dependem de nova autorização.
- O que foi abandonado: aceitar a mudança do link no C1, restaurar bytes, `.gitattributes` geral,
  isolar o C1 num clone; aumentar o limite de C32, serializar os agentes ou repetir a espera.

Correção da cronologia do C34 (bloqueio do alvo WSL em `abae80a`; registros acima preservados):

- Onde a fronteira caiu agora: só prova e documentação. Contrato em `f69d05f`; prova em `6732475`
  (aberturas com relógio próprio pelo `deps.now`, precondições com tempos, regressão do recuo,
  diagnóstico de falha compartilhado com C32). Alvos A/B/C em `6732475` verdes; o `npm test` mais
  recente é o de `abae80a`, anterior a esta prova.
- O que o proprietário decidiu: nada novo; tetos 8 Verifiers e 5 revisões formais consumidos.
- O que foi abandonado: espera, repetição, tolerância ou skip no WSL; reescrever `launchedAt` das
  capturas; pré-carga trocando `Date.now`; mudar a regra de escolha.

Exceção para a 9ª verificação e a 6ª revisão (registros acima preservados):

- O que o proprietário decidiu: “Autorizar a 9ª verificação e a 6ª revisão”
  ([comentário 6434588924](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6434588924);
  contexto em `.checks/code-review/issue-25/context-ci28-verifier9-approved.json`, 16 comentários e 6
  ACs), só para a #25. Tetos: 9 verificações e 6 revisões formais no total; `roundOverrides["25"]`
  com `maxRounds` 6. O PASS da 8ª verificação e o `ready` da 5ª revisão cobrem o conteúdo anterior;
  o Verifier 9 e a revisão 6 são as únicas rodadas novas. Depois do PASS e do `ready` do conteúdo
  novo, atualizar o PR #28 e fazer o merge com toda a CI verde segue autorizado; o pacote continua
  privado.
- Onde a fronteira caiu: só configuração e documentação; o conteúdo a verificar é o de `6520599`
  (último código de prova `6732475`).
