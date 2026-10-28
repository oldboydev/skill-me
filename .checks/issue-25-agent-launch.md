# Iniciar o agente com captura: `skill-me <agente>` — issue #25



## Handoff da sequência de revisão e medição — 28/10/2026

A formal8 foi `blocked` em `bedda5c` pela evidência remota ainda pendente do AC9. A issue agora explicita a sequência já aprovada: provas locais e `ready` autorizam publicar; depois executar/registrar uma medição manual no HEAD publicado; só fazer merge com os resultados registrados e os cinco checks regulares verdes. Os requisitos remotos permanecem obrigatórios, fora do critério de revisão do código, sem alterar C1–C50, produto, testes ou prazos. Registro15/9: https://github.com/oldboydev/skill-me/issues/25#issuecomment-6470507482. Detalhes e histórico no adendo final da task; a verificação15 carregará as provas R14 com SHA explícito, sem afirmar que as reexecutou. Nenhuma medição remota ocorreu neste registro.

Sources:

- Continuação do coordenador para uma nova sessão de autor (28/10/2026), depois dos gates finais de `cd4afc2` (registro `a6a829e`): corrigir só a tentativa repetida depois de abandonada pelo prazo, demonstrada pelo T8-C16 do gate B final (`concurrency.cli.test.mjs:922`, `4 !== 3`; logs `builder-ci93-shared/final2/g909/B-win-24.13.0.*`; sonda do autor anterior `final2/t8c16-probe.mjs`), e reproduzir antes de corrigir o candidato do lock obtido com o prazo esgotado antes de o timer rodar. A regra já está decidida pelo coordenador e pelo contrato (`docs/traces.md`): uma tentativa abandonada não é repetida; o lock obtido depois do prazo não autoriza gravar; só a recusa real/concluída do lock é repetível. Dentro do critério 38 (AC7) e das autorizações 6467154706 (“Pode fazer a medição comparativa. Mantém os testes e prazos e segue até a CI ficar toda verde para fazer o merge do PR #28.”) e 6442514838 (“Pode fazer quantas precisar”); não é autorização para manutenção geral da #8. Linha “Abandono terminal no prazo da entrega” do Landing.

- Continuação do coordenador para a mesma sessão de autor (28/10/2026), depois do D de `60bbda8`: corrigir só a preparação das fixtures Hermes (gate B) e a medição de duração no apoio dos hooks instalados (gate C) que os gates demonstraram, dentro dos contratos existentes; preservar os resultados de `60bbda8` (A 333/321/0/12, B 333/314/7/12, C 333/312/1/20); sem trocar runtime, host, relógio, AV, TEMP global, concorrência, Unicode, asserções, esperas, prazos, contagens ou o motor; gates finais com o temporário isolado por execução (linhas “Preparação da fixture do plugin Hermes no Node 24.13.0” e “Duração monotônica no apoio dos hooks instalados” do Landing). Mesmas autorizações 6467154706 e 6442514838.

- CI 40728221657 do PR #28 e execução manual 40728249484 (Windows, HEAD `93bd1e9`; logs integrais do orquestrador em `.checks/code-review/issue-25/ci93-windows-pr40728221657.log` e `ci93-windows-manual40728249484.log`, medição em `measurement40728249484.*`): o que falhou (I23-C4, T8-C12, T8-C13 e T8-C2) e o que os logs mostram; não dão causa. Pedido do orquestrador nesta sessão: diagnóstico e correção necessários da fronteira comum dos produtores, relatórios e formatter das provas, dentro das autorizações 6467154706 (“Mantém os testes e prazos e segue até a CI ficar toda verde para fazer o merge do PR #28.”) e 6442514838 (“Pode fazer quantas precisar”); produto só com defeito demonstrado (linha “Evidência comum dos produtores e formatter legado” do Landing).

- [Medição comparativa do lock na CI Windows, 28/10/2026](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706): “Pode fazer a medição comparativa. Mantém os testes e prazos e segue até a CI ficar toda verde para fazer o merge do PR #28.”, aprovando `.checks/issue-25-agent-launch.ci-runner-measure-proposal.md` (`b2638db`; AC9, task 41–42, C49–C50; linhas “Medição comparativa do lock na CI Windows” e “Exceção ao C48” do Landing). Contexto em `.checks/code-review/issue-25/context-ci28-verifier13-approved.json` (23 comentários, 9 ACs).

- [Diagnóstico do I23-C10 e orçamento Windows, 28/10/2026](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6460177952): o proprietário respondeu “Autorizar diagnóstico e orçamento Windows (recomendado)” à proposta `.checks/issue-25-agent-launch.ci40514323240-proposal.md` (`df2441f`), só nesta entrega (AC8, task 39–40, C47–C48; linhas “Diagnóstico do I23-C10” e “Orçamento do job Windows” do Landing). Contexto em `.checks/code-review/issue-25/context-ci28-verifier12-approved.json` (20 comentários, 8 ACs).

- [Ajuste pontual do T8-C15 e 10ª verificação, 27/10/2026](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6440482031): o proprietário respondeu “Autorizar ajuste pontual e 10ª verificação”, à proposta do comentário 6435260406 e de `.checks/issue-25-agent-launch.t8c15-handoff.md` (`a718865`), só para a #25. Inclui o diagnóstico pontual do teste antigo T8-C15 e a correção mínima de defeito confirmado dentro dos contratos atuais (AC7, task 38, C46; linha “Diagnóstico do T8-C15” do Landing). Uma 10ª verificação independente depois das provas do autor; teto formal 6, com 5 consumidas. Contexto em `.checks/code-review/issue-25/context-ci28-verifier10-approved.json` (18 comentários, 7 ACs).

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
| Diagnóstico do T8-C15 (Verifier 9 em `dd89179`, gate D: `concurrency.cli.test.mjs:107`, produtor `b` com `io_failure` e 20 de 40 sem confirmação; AC7, autorização 6440482031; task 38, C46) | O que se sabe: o caminho de E/S da captura manual que o T8-C15 exercita não mudou na #25 (comparação `63621c6..dd89179` dos módulos do caminho, fechada pelo orquestrador); há `io_failure` no T8-C15 registrado antes da #23, sem taxa nem causa igual demonstrada. **Não se sabe** a operação, o código de erro, quantos lotes falharam nem se as 20 entradas sem confirmação ficaram no disco. Muda só a prova antiga, `tests/integrations/traces/concurrency.cli.test.mjs`; produto, apoios compartilhados, pré-carga, runner e prazos ficam iguais. (1) **Produtores**: como antes, dois `ingest --agent hermes` iniciados juntos por `Promise.all`, 40 linhas cada com pausas de 4 ms, na mesma captura manual; agora cada um com `timedEnv(<arquivo>)` (a pré-carga existente de `SKILL_ME_TEST_TRACES_TIMING`, por `NODE_OPTIONS`), um arquivo de tempos por produtor numa pasta de scratch própria. A pré-carga só acumula as operações em memória e grava uma linha no `exit` do processo; o custo de carregá-la e de medir cada operação pode mudar um pouco o tempo dos produtores. (2) **Evidência**: depois que os dois saem e antes da primeira asserção, uma inspeção que nunca lança. Por produtor: status, sinal, ms da saída desde o início e o relatório de entrega (`bound`, `code`, contagens); da linha da pré-carga, o `describeTiming` existente sobre `deliveryTiming`, com `falhas` trocadas pelas operações com erro fora o `open lock EEXIST` (lock ocupado, repetido pelo contrato, contado à parte), cada uma como `<operação> <tipo> <código> (<fase>)`. Fase, pelas operações do processo em ordem de início: sob o lock é do `writeFile` do `.lock` que deu certo até o `unlink` do `.lock`; `antes do commit` sob o lock sem `rename` de `state.json.tmp` concluído; `depois do commit` sob o lock depois dele, inclusive a liberação; `tomada do lock` na falha do próprio `.lock` antes de tomá-lo; `fora do lock` no resto. Sem linha da pré-carga: `tempos indisponíveis`. Da captura: o `privacy export` com quantos registros de `a` e de `b` (pelo pseudônimo de cada `tool_call_id`), outros e repetidos; o `privacy status` (`state`, `accepted`, `persisted`); as quantidades de segmentos e temporários na pasta da captura; e se o `.lock` existe. Cada inspeção que falha sai como `indisponível [<código>]` (o código fechado do CLI, o `code` `E…` da E/S ou o nome do erro), sem estado presumido. Nenhum caminho, ID, chave, conteúdo ou variável de ambiente. (3) **Asserções iguais**: status 0 e `{bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0}` por produtor, 80 eventos únicos, segmento coerente, os pares de hooks e a recusa com lock alheio; só a mensagem das duas primeiras passa de `<produtor>` para `<produtor>` seguido da evidência. A instrumentação não corrige a causa. **Controles (C46)**, pela mesma rotina do T8-C15, com uma injeção existente da pré-carga só no produtor `b`: `SKILL_ME_TEST_TRACES_SEGMENT_EIO=1` (falha antes do commit), `SKILL_ME_TEST_TRACES_LOST_CONFIRMATION=2` (confirmação perdida depois do commit) e `SKILL_ME_TEST_TRACES_LOCK_KEPT=2` (lock preso, inspeção indisponível). **Investigação inicial finita**: os controles e uma execução completa instrumentada do `npm test` no Windows, Node 24.22.1, teto 8, com os 12 nativos do Hermes, no HEAD final, sem repetir. Correção de produto só com a causa demonstrada e dentro dos contratos atuais; senão, o caso concreto volta ao proprietário. | Repetir até verde, aumentar prazos ou tolerâncias, reduzir o teto 8, serializar os produtores, aceitar perdas ou pular o teste: proibidos pela autorização. Nova tentativa de E/S no store ou na entrega: política nova, fora do escopo. Instrumentar só um helper isolado que o T8-C15 não usa: não provaria a mensagem da prova real. Ler o `state.json` direto no lugar do `privacy status`: com o lock preso, mostraria um estado que o usuário não consegue consultar. Atribuir a falha da R9 a EPERM, antivírus ou lock: sem evidência. A/B base × HEAD por suítes completas: conjuntos de testes diferentes (450 × 555) e o caminho sem diff. Listar todos os `open lock EEXIST` como falhas: são a disputa normal do lock e esconderiam a falha real. |
| Primeira criação concorrente do store (execução completa instrumentada em `710076e`: I25-C32 em 3,1 s com `eventos intercalados: B terminou antes`; critério 25 e C32 sem mudança) | **Evidência**: A saiu com 0 e 2 eventos, `stopped`; B saiu com 3 e `skill-me: não foi possível abrir a execução [store_invalid]`, sem iniciar o agente. A raiz do C32 só tem o `observe setup` (`preparedLaunch`): a pasta do store nasce na primeira abertura, e as duas invocações a criam juntas. A operação exata do gate não ficou registrada. **Causa demonstrada** (reprodução descartável com o `io` do store injetado, na base `63621c6` e no HEAD, pelo `privacy start` e pelo `startLaunch`): `openStore` confere o marcador antes do lock porque ele é imutável depois de criado, mas durante a criação ele não é. (1) `initStore` cria `store.json` por `writeExclusive`: o arquivo existe vazio até a escrita, e a segunda abertura que o lê nesse intervalo sai com `store_invalid`; (2) a segunda abertura lê o marcador ausente e depois lista a pasta já com o `store.json` da primeira: `store_invalid`; (3) a segunda vê a pasta vazia, decide inicializar antes do lock e toma o lock depois da primeira: a criação exclusiva do marcador falha com `EEXIST`, que sai como `io_failure`. O código é o comum da criação do store (sem diff na #25); o launcher é quem torna duas primeiras aberturas simultâneas um caso de uso (critério 25). **Correção, com os contratos mantidos** (só `privacy/store.mjs`): (a) `initStore` publica o marcador por temporário `store.json.<hex8>.skill-me-tmp` (`wx` 0600 com flush) + `rename`, como o `state.json`: o `store.json` não existe ou está inteiro; falha apaga o temporário; (b) quem cria (`privacy start`, o `on` e a abertura do launcher) lista a pasta do store antes de ler o marcador e só o lê se ele estiver na listagem: listado, tem de ser exato, senão `store_invalid`; não listado, a pasta é adotável como antes — vazia ou só com o `.lock` —, e também com o temporário do marcador quando o `.lock` está junto (criação de outro processo em curso, sob o lock dele); qualquer outra entrada sem marcador → `store_invalid`, antes de qualquer lock; (c) sob o lock, `initStore` relê o marcador: presente e exato, não grava (outro criador publicou primeiro); presente e diferente, `store_invalid`; ausente, a pasta só pode ter o `.lock` desta operação (a regra de adoção de antes) e o marcador é publicado. Quem não cria continua lendo o marcador sem listar. Efeito: a segunda abertura durante uma criação encontra o lock do criador e recebe `lock_present` — a paciência de 2 s que o launcher já tem (o `privacy start` responde 4 e o usuário repete, como antes) — e depois abre normalmente. **Continua recusado**: pasta com entrada alheia, marcador diferente ou vazio, temporário do marcador sem o `.lock` (sobra de criação interrompida) → `store_invalid` sem gravar nada; link/junção → `link_refused`; raiz trocada → `root_changed`; lock alheio → `lock_present`, intacto; os limites das capturas não mudam. **Provas** (C32): pelo `io` injetado do store e do launcher em processo, sem tempo — primeira abertura parada dentro da publicação do marcador, segunda vendo o estado intermediário; segunda decidindo antes do lock; marcador publicado entre a leitura e a listagem; as recusas acima; o C32 de processos reais sem mudança. | Inicializar o store antes da prova ou abrir B depois de A: esconde a corrida real do primeiro uso. Repetir `store_invalid` dentro da paciência: política nova de repetição, e esperaria também diante de um store de fato inválido. Tomar o lock antes de conferir o marcador: grava o nosso lock numa pasta alheia, contra o contrato. Aceitar marcador vazio ou parcial antes do lock: aceita store inválido. Criar a pasta do store já pronta por pasta temporária + `rename`: não cobre a adoção de uma pasta vazia existente e muda o layout durante a criação. Serializar as invocações ou aumentar prazos: proibidos. Tratar como intermitência de carga: a causa foi reproduzida sem carga. |
| Diagnóstico de C32 com captura em construção (Verifier 10 em `df259ed`, ambiente C — WSL isolado: `I25-C32 diagnóstico das invocações simultâneas…`, `end.e2e.test.mjs:320`; refinamento da linha “Diagnóstico de C32”, critério 25 e C32 sem mudança) | **O que se viu**: a primeira linha do erro foi `ENOENT` ao abrir `captures/<id>/state.json`, não `eventos intercalados: B terminou antes`. B termina antes (sem agente no PATH) enquanto A ainda cria a captura da abertura: a pasta da captura existe e o `state.json` ainda não. O `catch` de `withOverlappingRuns` (`helpers/launch.mjs`) lia marcadores, probes (`readJsonLines`, que lança num JSON incompleto) e capturas (`launchCapturesOnDisk`, estrito, que lança `ENOENT`) **antes** de gravar as barreiras: a leitura lançava, o erro dela saía no lugar do original, as barreiras não eram gravadas e as invocações não eram esperadas — A ficava na barreira até o limite de 60 s do `runSkillMe`. Produto e a primeira criação do store (`f734441`) não estão envolvidos. **Contrato do apoio na falha**, só nele: a inspeção é de melhor esforço e nunca substitui o erro inicial nem impede a limpeza. Cada leitura que falha vira `indisponível [<código>]` (o `code` `E…` da E/S ou o nome do erro, nunca a mensagem, que traz caminho): marcadores vistos; o ID da execução de cada probe (probe ausente continua `null`); as capturas por uma leitura própria do diagnóstico, em que uma captura sem `state.json` legível vira a linha `["indisponível", "<código>"]` ao lado das legíveis e a pasta de capturas que não pôde ser listada vira `indisponível [<código>]` — nunca uma lista vazia que diria “zero capturas”. Em seguida, sempre: todos os marcadores de barreira são gravados (uma gravação que falha não impede as outras e vai para `barreirasNaoGravadas` como `[<marcador>, <código>]`), e cada invocação é esperada (uma que rejeita vira `indisponível [<código>]` em `launchers`). O erro relançado mantém a primeira linha do original, o original em `cause` e os status, sinais e stderr dos launchers. Nenhum caminho, chave, conteúdo ou variável de ambiente nos campos novos. `launchCapturesOnDisk` continua estrito para as provas saudáveis. **Prova** (`I25-C32 diagnóstico com captura em construção e probe incompleto`, pela mesma rotina): com A parada na barreira e B já terminada, a árvore parcial é posta pela prova — uma pasta de captura sem `state.json` e, na outra variante, um probe de B com JSON incompleto — e a espera falha: a primeira linha é `eventos intercalados: B terminou antes`, o original está em `cause`, o diagnóstico marca a indisponibilidade com o código, A já terminou com 0 quando o erro sai e B tem o status 127 e o stderr dela; o leitor estrito continua lançando na mesma árvore. Sem tempo de espera: B é aguardada antes da falha. | Tornar `launchCapturesOnDisk` tolerante: as provas saudáveis deixariam de acusar captura sem estado. Liberar as barreiras só no fim do teste: a falha do apoio continuaria escondendo o erro e prendendo A. Engolir a falha da coleta sem dizer: o diagnóstico diria “nenhuma captura” sem saber. Esperar até a captura ficar legível: tempo a mais e nenhuma garantia. Esperar com `sleep` pelo interleaving do Verifier: não determinístico. |
| Diagnóstico do I23-C10 (CI 40514323240 em `d0d5a7f`: “codex A 0” com `delivery_timeout` 1/0/0/1 e nenhuma operação registrada; AC8, autorização 6460177952; task 39, C47) | **Só provas e apoios de prova**; produto, prazos, carga e asserções iguais; a causa continua desconhecida. (1) **Apoio comum**, com dois consumidores reais (T8-C15/C46 em `traces/concurrency.cli.test.mjs` e I23-C10/C47 em `observe/agents.e2e.test.mjs`), sai do arquivo de concorrência para `tests/integrations/helpers/traces.mjs`: `failureCode(error)` (o `code` `E…` ou o nome do erro, nunca a mensagem; `helpers/launch.mjs` passa a importá-lo no lugar da cópia dele), `inspected(read)` (`{unavailable: <código>}` quando a leitura falha) e `diskTrace(ops)`, as operações da linha da pré-carga em ordem de início, cada uma com `held` (sob o lock: do `writeFile` do `.lock` que deu certo até o `unlink` dele), `hold` (a 1ª, 2ª… tomada do lock do processo) e `commits` (os `rename` de `state.json.tmp` concluídos naquela tomada até ali). O T8-C15/C46 formata a fase como antes sobre `diskTrace`, e a saída dele não muda. A pré-carga `traces-probe.mjs` passa a nomear `observe.json` e o temporário `observe.json.tmp`, que saíam como `pasta`. (2) **Rotina do I23-C10**: cada etapa — um hook na fase intercalada, os três juntos na simultânea, o ingest Hermes — inicia os produtores como antes, agora cada um com `timedEnv(<arquivo>)` (um arquivo por processo, num scratch próprio). As asserções são as mesmas: `DELIVERED_AUTO(1)` por hook, `DELIVERED_AUTO(20)` no Hermes, cinco capturas, chaves, isolamento e relatório. Só a mensagem muda, e só numa etapa com alguma entrega fora do esperado: `<rótulo>\n<evidência>`. A evidência é calculada só nesse caso, para não acrescentar chamadas de CLI à execução saudável. (3) **Evidência**, que nunca lança. Por produtor, `produtor <rótulo>: status <n>; entrega <relatório ou "sem relatório">` e `tempos: <describeTiming existente, com as falhas = operações com erro fora o open lock EEXIST e o lstat ENOENT>; lock ocupado (EEXIST, repetido) <n>x; ausências conferidas (lstat ENOENT) <n>x; última concluída: <operação> <tipo> (<lugar>)`, em que `<lugar>` é `fora do lock`, `tomada do lock` ou `sob o lock, <k>ª tomada` (o mesmo lugar acompanha cada falha); sem linha da pré-carga, `tempos indisponíveis [sem linha da pré-carga]`. Da raiz, `capturas automáticas <n> [<estado> accepted <a> persisted <p>; …]` pelo `privacy list`, em ordem e sem ID; `pasta das capturas <s> segmento(s), <t> temporário(s)`; `lock presente` ou `ausente`; cada inspeção que falha sai como `indisponível [<código>]`. Nenhum caminho, conteúdo, ID, chave ou variável de ambiente. (4) **Controles (C47)**, pela mesma rotina, numa raiz observada nova, com uma injeção existente da pré-carga só no hook da sessão Codex A, na primeira entrega dela (o caso “codex A 0” da CI): `SKILL_ME_TEST_TRACES_SEGMENT_EIO=1` (falha de E/S no commit) e `SKILL_ME_TEST_TRACES_STALL_SEGMENT=1` (disco parado, `delivery_timeout`, o sintoma da CI). | Copiar `failuresWithPhase`/`inspected` para o arquivo do I23: duas cópias do mesmo algoritmo que divergiriam. Reaproveitar a fase “antes/depois do commit” do T8: na gravação automática a captura nova já renomeia um `state.json.tmp` antes do commit do lote, e a fase seria falsa. Listar o `lstat ENOENT` como falha: é a conferência normal de ausência da captura nova. Calcular a evidência em toda etapa: três chamadas de CLI a mais por hook saudável, no job que já estava no limite. Ler `observe.json` ou `state.json` direto no lugar do `privacy list`: com o lock preso, mostraria um estado que o usuário não consegue consultar. Retry, prazos maiores, aceitar perdas, serializar ou reduzir a carga: proibidos. Tratar a instrumentação como correção: a causa segue desconhecida. |
| Orçamento do job Windows (CI 40514323240: o passo de integrações terminou junto do limite de 10 min; AC8; task 40, C48) | Em `.github/workflows/governance.yml`, só o campo `timeout-minutes` do job `verify` muda, de `10` para `${{ matrix.os == 'windows-latest' && 20 || 10 }}`: 20 no `windows-latest`, 10 no `ubuntu-22.04` e no `macos-14`. `changes` e `ci` continuam com 5. Passos, `runs-on`, comandos, matriz, `concurrency`, skips e os prazos de teste e de produto não mudam. Sem teste novo que repita o texto: a prova é estrutural (diff de uma linha e valores lidos do YAML por job e por sistema), e a prova de governança existente (`governance-C1 C3`) continua conferindo passos, matriz e runner. A CI real valida a expressão. | 20 minutos em todos os sistemas: não aprovado e desnecessário (Ubuntu e macOS passaram). Separar as integrações num job próprio: muda passos e jobs, fora da proposta. Reduzir provas para caber em 10 minutos: corta cobertura aprovada. Teste que só compara a string da expressão: espelha a mudança sem provar nada além do diff. |
| Exceção ao C48 (AC9, 28/10/2026; autorização 6467154706) | O C48 e o critério 40 dizem que só o `timeout-minutes` do `verify` muda e que o resto do workflow fica igual. O AC9 autoriza **acrescentar** o job `lock_diagnostics`. A partir desta data, a conferência do C48 compara com `d0d5a7f` o topo do workflow (`name`, `on`, `permissions`, `concurrency`) e os três jobs regulares (`changes`, `verify` e `ci`). Fora o `timeout-minutes` do `verify`, eles têm de ser idênticos, e o conjunto de jobs tem de ser exatamente os três regulares mais `lock_diagnostics`. O job novo é provado pelo C49. O registro e a prova de `52b22cd` ficam como estão. | Reescrever o C48 como se o workflow tivesse sempre tido quatro jobs: apaga o histórico da aprovação do AC8. Excluir o arquivo inteiro da conferência: deixaria de vigiar os jobs regulares. |
| Medição comparativa do lock na CI Windows (CI 40636157287: I23-C4 e T8-C11 com `lock_present`; AC9, autorização 6467154706; task 41–42, C49–C50) | **Job** (só `.github/workflows/governance.yml`, depois de `ci`): `lock_diagnostics`, `name: Diagnosticar lock Windows (manual)`, `if: github.event_name == 'workflow_dispatch'`, `runs-on: windows-latest`, `timeout-minutes: 10`, `permissions: {contents: read}`; passos `actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8` com `persist-credentials: false`, `actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444` com `node-version: 24.13.0` e sem cache, `npm ci --ignore-scripts` e `node scripts/ci-lock-latency.mjs`; sem `needs` nem `continue-on-error`; `ci.needs` continua `[changes, verify]`. O workflow já tem `workflow_dispatch` na branch padrão; o orquestrador o aciona na branch do PR com `--ref`, e essa execução também roda a matriz regular. **Script** `scripts/ci-lock-latency.mjs`, sem dependência nova nem cache: (1) **CLI**: `node scripts/ci-lock-latency.mjs`, sem argumentos (outro argumento → exit 2). Os filhos são o próprio script com `--papel produtor <pasta> <ciclos>` e `--papel carga <pasta> <bytes>` — protocolo interno do supervisor, não uma opção de prova; as provas usam a API exportada com valores pequenos. (2) **Constantes vinculantes**: 3 produtores × 500 ciclos (1.500 previstos por fase), 3 cargas de 65.536 bytes com flush, teto de 120.000 ms por fase, faixas de 600 e 650 ms; as mesmas nas fases. (3) **Destinos**: `realpathSync.native` de `os.tmpdir()` e de `RUNNER_TEMP`. Comparação, depois de `path.resolve`, sem separador final; no Windows, sem diferenciar maiúsculas; no POSIX, exata. `RUNNER_TEMP` ausente, vazio, inexistente ou que não é pasta vira `indisponivel` com o motivo. Distintos → fases `A1` (padrão), `B` (`RUNNER_TEMP`), `A2` (padrão); senão uma fase `A` (padrão) e `comparacao: "não aplicável: <motivo>"`, sem fingir duas medições. (4) **Fase**: o supervisor cria no destino uma pasta própria `skill-me-lock-latency-<fase>-` (`mkdtemp`), com o marcador `.skill-me-lock-latency` contendo o nonce da execução, e nela `produtor-<k>` (cada um com o próprio `.lock`) e `carga-<k>`. Inicia as 3 cargas e espera cada uma confirmar a 1ª escrita (linha `pronto`), para a carga já correr durante a medição; inicia os 3 produtores; quando todos fecham, fecha o stdin das cargas, que terminam a escrita em curso e saem. No teto, chama `kill()` só nos filhos que criou e espera o `close` de cada um; nunca lista nem encerra outros processos. Todos os filhos com `windowsHide: true`; o `TEMP`/`TMP` do processo não muda. (5) **Ciclo do produtor**: `holdLockFile({io, lockPath: <pasta>/.lock, lostCode: "lock_lost"}, fn)` com o `createStoreIo()` real, e o `unlink` medido. Tomada = do início do ciclo até a entrada em `fn`; liberação = da saída de `fn` até o retorno. Criação, escrita e fechamento são o `open` exclusivo do `.lock` e o `writeFile` e o `close` desse handle, medidos por uma instrumentação de `node:fs/promises` só no processo do produtor (igual em todas as fases). Remoção = `unlink` do `.lock`. Relógio `performance.now()`. Erros: `lock_present` e `lock_lost` (códigos do store) separados dos de E/S (`code` `E…` ou o nome do erro). (6) **Protocolo**: uma linha JSON por ciclo terminado (com ou sem erro) no stdout do produtor e uma final `{"fim":true,…}`; a carga escreve `{"pronto":true}` e, ao sair, `{"fim":true,"escritas":n,"erros":{…}}`. Linha incompleta ou inválida conta em `linhasInvalidas`, nunca como ciclo. (7) **Métricas** por fase: `ciclos {previstos, concluidos, comErro, incompletos}`, em que `incompletos = previstos − concluidos`; `erros {lockPresent, lockLost, es: {<código>: n}}`; `tomada`, `liberacao` (ciclos sem erro) e `operacoes {criacao, escrita, fechamento, remocao}` (cada operação concluída) como `{amostras, p50, p99, max, ">=600", ">=650"}`. Percentil por posição mais próxima: o valor na posição ⌈p/100 × n⌉ da lista ordenada, sempre um valor observado. Valores em ms com 3 casas; as contagens comparam o valor sem arredondar (600,000 conta, 599,999 não). Sem amostras → `{amostras: 0, indisponivel: "sem amostras"}`, nunca percentil ou contagem zero. Carga: escritas e erros por código, e quantos processos terminaram. (8) **Saída**: um objeto JSON `{"skillMeLockLatency":1,…}` no stdout, só rótulos e números; de cada destino só o volume no Windows (por exemplo `C:`), nenhum caminho completo, conteúdo, chave ou variável de ambiente. Exit 0 com o relatório, também com fases incompletas ou erros, que são dados; 1 se a medição não pôde começar (por exemplo, pasta própria não criada), com o motivo; 2 para uso inválido. [Ajuste da implementação, antes das provas: uma fase cuja pasta própria não pôde ser criada, ou que falhou no supervisor, sai no relatório como `{fase, destino, indisponivel: "<motivo> [<código>]"}`, e as outras fases seguem, para o resultado de uma não se perder pela falha de outra. O exit 1 fica só para o temporário padrão não resolvido ou um erro interno, com `{"skillMeLockLatency":1,"indisponivel":"medição não concluída [<código>]"}`.] (9) **Limpeza**: depois de cada fase, só remove a pasta se ela for absoluta, filha direta do destino resolvido, a mesma criada por esta execução, não for link e tiver o marcador com o nonce; senão recusa e registra o motivo, sem caminho. | Workflow manual novo: o `workflow_dispatch` exige o arquivo na branch padrão (proposta anterior superada). Copiar o algoritmo do lock ou importar `tests/integrations/helpers/traces-probe.mjs`: dois lugares para a mesma regra e dependência de apoio de prova. Mudar `TEMP`/`TMP` do processo ou do job: os destinos são passados explicitamente aos filhos. Um só produtor, ou os três no mesmo lock: mistura disputa intencional com latência de E/S. Percentil interpolado: cria valores que não foram observados. Zeros para fase sem dados ou incompleta: pareceriam medição válida. Encerrar por nome ou pid, ou `taskkill /T`: alcançaria processos alheios. Opção de CLI para ciclos e teto nas provas: o CLI só usa as constantes. Cache no `setup-node` do job manual: desnecessário e fora da proposta. Mitigação automática a partir do resultado: depende de nova decisão. |
| Limpeza e supervisão em toda saída da medição (verificação 13 em `631e281`, achados 2 e 3 de `.checks/issue-25-agent-launch.verified.md:294-295`, relatório em `0e0325f`, preservado; refinamento da task 42 e do C50, sem check novo) | **O que a R13 apontou, por leitura**: (2) `removeOwnDir` chamava `rmSync` sem `try`, dentro do `finally` de `measure`; uma falha da remoção (por exemplo `EBUSY`, `EPERM` ou `ENOTEMPTY` no Windows) saía de `measure`, e o CLI imprimia só `medição não concluída [<código>]` com exit 1, perdendo as fases já medidas e as seguintes. (3) Se `runPhase` lançasse depois de iniciar filhos (por exemplo no `mkdirSync` de `produtor-<k>`), só o ramo do teto encerrava filhos, e os já iniciados seguiam vivos; `track` não ouvia `'error'` dos filhos, e uma falha assíncrona do `spawn` derrubaria o processo sem relatório. **Limpeza** (só `scripts/ci-lock-latency.mjs`): a guarda continua a mesma e estrita — absoluta, a pasta criada por esta execução, filha direta do destino, sem link, marcador com o nonce — e a recusa continua sem tocar em nada. Passada a guarda, a remoção é de melhor esforço: se o `rmSync` lança, `removeOwnDir` devolve `{ok: false, falha: "<código>"}` (o `code` `E…` ou o nome do erro, nunca a mensagem, que traz o caminho), sem nova tentativa; a pasta pode ter ficado inteira ou em parte e nunca é contada como removida. O relatório passa a `limpeza: {removidas: <n>, recusadas: [<motivo>…], falhas: [<código>…]}`, com `falhas: []` quando nenhuma remoção falhou; as fases medidas ficam no relatório, as seguintes rodam, e o exit continua 0 com o relatório. **Supervisão** (`runPhase`): toda saída passa pelo mesmo encerramento — o teto, um erro síncrono no início (`mkdirSync` ou `spawnChild` de um filho, com outros já iniciados) e o `'error'` assíncrono de um filho. `track` registra o filho e ouve `'error'` e `'close'` antes de tocar no stdio (stdio ausente não lança). O primeiro erro interrompe a fase: nenhum filho novo é iniciado, as esperas param, e cada filho registrado que ainda não fechou recebe `kill()`, com `SIGKILL` se o `close` não vier na folga de 5 s; `runPhase` só volta depois do `close` de todos os registrados, e nunca lista nem encerra outros processos. `runPhase` deixa de lançar por esses erros: devolve o que os filhos já escreveram e `interruptedBy` (o código do primeiro erro, ou `null`), e a fase sai como as outras, com `interrompidaPorErro: "<código>"` (`null` quando não houve) ao lado de `encerradaPeloTeto`, `incompletos = previstos − concluidos` e as métricas sem amostras `indisponivel`, nunca zero. A saída por processo continua `{codigo, sinal}`. O `catch` de `measure` (`fase interrompida [<código>]`) fica só para erro interno. Prazos e constantes (3 × 500 ciclos, 3 cargas de 64 KiB, teto de 120 s, folga de 5 s) não mudam. **Provas** (C50 (j)–(l)): a falha da remoção, pela troca do `rmSync` de `node:fs` só na prova (`syncBuiltinESMExports`, a mesma via da instrumentação do produtor), sem erro real do host; o início parcial, por um arquivo `produtor-2` já existente na pasta da fase (`EEXIST` real no `mkdirSync`); o erro assíncrono, pelo `spawn` de um caminho absoluto inexistente — `ENOENT` assíncrono no Windows (Node 24.22.1) e no WSL (24.13.0), medido: `'error'`, depois `'close'`, sem `'exit'`. | Nova tentativa (`maxRetries` do `rmSync`) ou espera antes de remover: política de repetição nova, sem prazo decidido. `force: true` ou engolir o erro: esconderia a pasta que ficou. Contar a falha entre as recusadas: misturaria a guarda (pasta que não é desta execução, nada tocado) com a pasta própria que ficou. Encerrar a medição na primeira falha da limpeza: perde as fases. Seguir a fase depois do erro de um filho: a carga e os produtores mudariam no meio da fase e entre as fases. Lançar de `runPhase` depois de encerrar os filhos: perderia o que eles já escreveram. Ouvinte global de `uncaughtException`: esconderia erros de outra origem. Erro na saída de cada processo: o código na fase basta (não há outro consumidor). Encerrar por pid, nome ou `taskkill /T`: alcançaria processos alheios. |
| Fonte do `RUNNER_TEMP` na medição (CI 40702252461 do PR #28, Ubuntu 22.04, job 122865010604: `C50 caminhos` em `scripts/ci-lock-latency.test.mjs:147` e `C50 relatório` em `:383`; log integral em `.checks/code-review/issue-25/ci40702252461-ubuntu.log`; refinamento do C50 e da task 42, sem check novo) | **O que se viu**: no runner, o processo tem `RUNNER_TEMP`. `resolveDestinations` tinha o padrão `runnerTemp = process.env.RUNNER_TEMP`, e a desestruturação aplica o padrão também quando o valor dado é `undefined`. Na prova de caminhos, `plan(undefined)` leu o `RUNNER_TEMP` do runner, e o `realpath` falso da prova deu `RUNNER_TEMP ilegível [ENOENT]` no lugar de `RUNNER_TEMP ausente`. Na prova do relatório, `measure({env: {}})` passa `runnerTemp: env.RUNNER_TEMP`, que é `undefined`, e mediu A1/B/A2 no `RUNNER_TEMP` do runner no lugar de uma fase `A`. Os alvos locais A/B/C rodaram sem `RUNNER_TEMP` (ausente no Windows desta máquina; `env -i` no WSL) e não exercitaram essa precondição. É determinístico, não intermitente: falha sempre que o processo tem `RUNNER_TEMP`. **Contrato** (só `scripts/ci-lock-latency.mjs`): o ambiente da medição tem uma fonte só, explícita — o `env` de `measure`. `resolveDestinations` usa só a entrada recebida: `runnerTemp` sem a chave, `undefined` ou `""` é `RUNNER_TEMP ausente`, sem ler `process.env`. `measure` continua com `env = process.env` por padrão, a fronteira deliberada da leitura do CLI (`measure()` sem argumentos). Um `env` dado é o único ambiente consultado: `{}` significa `RUNNER_TEMP` ausente, mesmo com a variável no processo. Os demais padrões de `resolveDestinations` (`tmpdir`, `platform`, `realpath`, `isDirectory`) e de `measure` não mudam. Os dois consumidores, `measure` e as provas, já passam `runnerTemp`. Sem flag nem camada nova; prazos, quantidades, formato do relatório e o CLI não mudam. **Provas** (C50 (m)–(n)): o `RUNNER_TEMP` do processo da prova é posto num diretório temporário válido, próprio e distinto do temporário padrão da prova, e volta no `finally` ao valor anterior (ou à ausência); `TEMP`/`TMP` não mudam. Nas execuções A/B/C, o `RUNNER_TEMP` fica presente e válido no ambiente de cada uma. | Limpar `RUNNER_TEMP` no workflow, no job ou no início das provas: esconderia a precondição do runner e mudaria o workflow. Pular ou relaxar as asserções no runner: proibido. Ler `process.env` só quando a chave não foi dada (separar chave ausente de `undefined`): mantém duas fontes de ambiente e a mesma armadilha para quem passa `env.RUNNER_TEMP`. Tirar o padrão `process.env` de `measure`: o CLI deixaria de ler o `RUNNER_TEMP` do runner e mediria sempre uma fase só. Parâmetro novo de ambiente ou opção de prova: camada sem necessidade. |
| Diagnóstico das entregas de um produtor nas provas T8 (CI 40709943742 do PR #28 e execução manual 40710014746, Windows: T8-C3, T8-C8, T8-C14 e T8-C18; logs integrais do orquestrador em `.checks/code-review/issue-25/ci767-windows-pr40709943742.log` e `ci767-windows-manual40710014746.log`; refinamento do C46 e da task 38, sem check novo) | **O que se viu**: no PR (job 122892318605), integrações 567: 540 pass, 3 fail, 24 skip. O T8-C8 falhou em `live-capture.cli.test.mjs:441`, no ingest Hermes de 1 registro (`delivery_timeout` 1/0/0/1). O T8-C14 falhou em `query.cli.test.mjs:217`, no hook Claude (`delivery_timeout`). O T8-C18 falhou em `replay.unit.test.mjs:41`: `privacy stop` com 4 `lock_present` depois dos três produtores, dos quais a prova só confere o status. Na matriz regular da execução manual (job 122892590221), 567: 542 pass, 1 fail, 24 skip; falhou o T8-C3 em `live-capture.cli.test.mjs:198`, no ingest Hermes de 9 (`delivery_timeout` 9/0/0/9). Cada um passou na outra execução. Os quatro arquivos não mudaram na feature. Os logs só mostram os relatórios com `delivery_timeout` (T8-C3, T8-C8, T8-C14) e o `stop` com `lock_present` (T8-C18); o tipo de sintoma é o das CIs anteriores, o que não prova causa comum. A medição do orquestrador no mesmo HEAD (job 122892425130) não teve nenhuma amostra ≥ 600 ms, o que não dá a causa. **Caminho real** (código lido e mapa local `builder-ci767/map-producers-win-24.22.1.txt`): os quatro produtores usam a captura manual (`createCaptureDelivery`). A 1ª tomada do lock é a abertura (`openCaptureForIngest`: lê o estado e a chave, não grava). A 2ª tomada grava o lote: segmento e `state.json` por temporário com flush, e o commit é o `rename` de `state.json.tmp`. O ingest abre antes de ler o stdin, com o prazo da abertura contado da chamada; o hook abre depois de ler, e o prazo de 650 ms conta da leitura. Mecanismos compatíveis com o código e o contrato, não demonstrados nestas falhas: a tentativa que chega ao prazo é abandonada (`delivery_timeout`), e o `process.exit(0)` do CLI (`cli.mjs:24`) encerra o que estava em curso. Se ela tinha o lock, ele fica (`docs/traces.md`), e o comando seguinte sai com `lock_present`. Isso explicaria o T8-C18, assim como as outras vias que o contrato admite; o log não mostra qual. **Não se sabe**: qual operação parou, em que tomada, se o laço de eventos do processo estava livre (compatível com espera de E/S ou do sistema) ou parado (compatível com o processo parado ou sem CPU), nem quem deixou o lock no T8-C18. As quatro provas rodam os produtores sem a pré-carga de tempos, e a pré-carga só registra operações concluídas. **Diagnóstico** (só provas e apoios de prova; produto, prazos, quantidades, ordem, concorrência e asserções iguais): (1) **Pré-carga** `tests/integrations/helpers/traces-probe.mjs`, só com `SKILL_ME_TEST_TRACES_TIMING`: `ops` e `cpuMs` não mudam, e a linha ganha mais cinco campos: `pending` (as operações iniciadas e não concluídas na saída, como `[operação, tipo, início ms, idade ms]`); `exitMs` (a saída no relógio monotônico do processo); `startedAt` (`performance.timeOrigin` em ms de época, só para correlacionar processos); `pid`; e `loop` `{samples, maxMs, p99Ms}`, do `monitorEventLoopDelay` com resolução de 10 ms, ligado na carga, que não mantém o processo vivo (medido). Uma injeção nova serve só à prova do diagnóstico: `SKILL_ME_TEST_TRACES_BLOCK_LOOP=<n>\|<ms>` prende o laço de forma síncrona por `<ms>` antes da n-ésima criação exclusiva do `.lock`. (2) **Apoio** `tests/integrations/helpers/traces.mjs`: `diskTrace` passa a levar também `at` e `ms` em cada entrada (acréscimo; os consumidores C46 e C47 não os leem). Entram `producerTrace(file)`, `captureEvidence(root, id, owners)`, `deliveryEvidence({root, id, produced})`, `describeDeliveryEvidence(evidence)` e `explainedUnless(matches, label, …)`. O lugar no caminho manual é `fora do lock`, `tomada do lock` ou `sob o lock, <k>ª tomada`, com `, depois do commit` quando a tomada já fez o commit. A linha do lock traz o rótulo do produtor cujo `pid` registrado pela pré-carga coincide com o `pid` gravado no `.lock` (o nonce nunca é lido para a saída), `outro processo` ou `ilegível [<código>]`. A coincidência de `pid` não prova sozinha quem deixou o arquivo, porque o `pid` pode ser reutilizado. (3) **Provas**: T8-C3, T8-C8, T8-C14 e T8-C18 iniciam cada produtor com `timedEnv(<arquivo próprio>)`. A evidência só é calculada quando a entrega, ou o `stop` do T8-C18, não vem como esperado. A mensagem é `<rótulo>\n<evidência>`; no T8-C18, `stop: <stdout>\n<evidência>`. As asserções são as mesmas. `run.report.delivery` vira `run.report?.delivery`: sem relatório, a falha é `AssertionError` com a evidência em vez de `TypeError`, e continua vermelha. **Evidência**, uma por produtor: `produtor <rótulo>: status <n>, sinal <s>; entrega <relatório>`; `  tempos: <describeTiming>; lock ocupado (EEXIST, repetido) <n>x; última concluída: <op> <tipo> (<lugar>); pendentes na saída: <op> <tipo> (<lugar>) há <ms> ms, … \| nenhuma`; `  processo: iniciado <ISO>, 1ª operação aos <ms> ms, saída aos <ms> ms; laço de eventos: atraso máximo <ms> ms, p99 <ms> ms (<n> amostras)`. Da captura: `captura: status <estado>, accepted <a>, persisted <p> \| indisponível [<código>]; pasta <s> segmento(s), <t> temporário(s); lock presente, de <rótulo> \| presente, de outro processo \| ausente`. Nenhum caminho, ID, chave, conteúdo, nonce ou variável de ambiente. | Aumentar prazos, repetir a entrega ou a prova, reduzir paralelismo, pular no Windows ou aceitar perdas: proibidos. Atribuir a antivírus, disco, relógio ou host: sem evidência. Instrumentar o produto: a pré-carga de teste já alcança as operações. Mover ou copiar a evidência do C46/C47: ela é dos dois produtores de 40 e das capturas automáticas, e mudaria provas que passaram; fica registrada como dívida. Registrar só as operações concluídas: foi o que deixou as CIs anteriores sem a operação parada. Calcular a evidência sempre: soma chamadas de CLI ao caminho saudável. Ler o nonce do lock ou mostrar o `pid`: dados sem necessidade. Medir o laço com timers próprios: o `monitorEventLoopDelay` já existe no Node. |
| Evidência comum dos produtores e formatter legado (CI 40728221657 do PR #28 e execução manual 40728249484, Windows, HEAD `93bd1e9`: I23-C4, T8-C12, T8-C13 e T8-C2; logs integrais do orquestrador em `.checks/code-review/issue-25/ci93-windows-pr40728221657.log` e `ci93-windows-manual40728249484.log`; refinamento do C46, do C47 e das tasks 38–39, sem check novo) | **O que se viu**: no PR (job 122957292934), integrações 571: 546 pass, 1 fail, 24 skip. O I23-C4 falhou em `control.cli.test.mjs:879`, erro na `:976`: o hook Claude da rota automática, **processo filho** (`runHook`), saiu com `{automatic: true, code: "delivery_timeout", entries: 1, committed: 0, persisted: 0, lost: 1, unrouted: 0}`, sem nenhum dado de E/S. O pedido do orquestrador o descreve como produtor em processo; os produtores em processo do arquivo (`createAutomaticDelivery`, `:557` e `:832`) foram o sintoma da CI 40636157287, e os dois tipos ficam cobertos. Na manual (job 122957402134), 571: 544 pass, 3 fail, 24 skip. T8-C12 (`follow.cli.test.mjs:59`): `0 !== 1` no `persisted` do 1º hook, sem o código da entrega. T8-C13 (`:90`): `stop` com `lock_present` depois de dois hooks e um ingest, dos quais a prova só confere o status. T8-C2 (`live-capture.cli.test.mjs:178`): `delivery_timeout` 1/0/0/1 com a mensagem do formatter legado (`describeTiming`), que conta só as operações concluídas (`359 ms da 1ª à última operação de disco; 72 operações; …; mais lenta open lock 339 ms; falhas nenhuma`) e não mostra os pendentes, a saída, o início e o laço que a pré-carga de `51679df` já grava. Os quatro controles de `51679df` passaram nas duas; as falhas vieram de produtores sem a evidência. A medição do orquestrador no mesmo HEAD (job 122957247705, nenhuma amostra ≥ 600 ms) não é o caminho das entregas e não dá causa. **Causa**: desconhecida; não se presume `delivery_timeout` no T8-C12 nem quem deixou o lock no T8-C13. **Catálogo** (`builder-ci93-shared/consumers-before.txt`, antes do código): 37 arquivos de prova importam os apoios mudados; 30 iniciam produtores (`runHook`, `runHermesIngest`, `runInternal`, `runWrapper`, `runClaudeHandler`, `runCodexHandler` ou `create*Delivery` em processo); só 6 passam a pré-carga de tempos; 5 usam o formatter. **Forma** (só provas e apoios de prova; produto, prazos, quantidades, payloads, ordem, concorrência e asserções iguais): (1) **Formatter** (`helpers/traces.mjs`, API compatível): `deliveryTiming(line)` traz também `pending` (`[{name: "<op> <tipo> (<lugar>)", startMs, ageMs}]`, ou `null` quando a linha não os registra), `process` (`{inProcess, startedAt, firstOpMs, lastEndMs, endMs}`) e `loop`; `ms` é `null` sem operação concluída. `describeTiming(t)` fica `<ms> ms do início da 1ª ao fim da última operação de disco concluída; <n> operações concluídas` (ou `nenhuma operação de disco concluída`); `flush <tipos> = <ms> ms` (ou `flush nenhum`); `por operação …`; `mais lenta concluída …`; `falhas …`; `CPU do processo <n> ms` e, quando `t.process` existe, `; pendentes na saída: <op> <tipo> (<lugar>) há <ms> ms, … \| nenhuma \| não registradas; processo: iniciado <ISO>, 1ª operação aos <a> ms, última conclusão aos <b> ms, saída aos <c> ms (<c−a> ms depois da 1ª operação); laço de eventos: atraso máximo <m> ms, p99 <p> ms (<n> amostras) \| sem amostras \| não registrado`. Em processo: `pendentes no instantâneo`, `processo: o da prova (produtor em processo), …, instantâneo aos <c> ms (…)` e `laço de eventos do processo da prova desde a criação do produtor: …`. Valor ausente sai `?` ou `não registrado`, nunca 0. O `<lugar>` é neutro (`fora do lock`, `tomada do lock`, `sob o lock, <k>ª tomada`), sem afirmar commit; o `producerTrace` do caminho manual continua com `, depois do commit` e a mesma disposição, montado pelas mesmas peças. Os tipos de arquivo (`FILE_KINDS`) saem da pré-carga para `helpers/trace-kinds.mjs`, sem efeito colateral, importado pela pré-carga e pelo apoio. (2) **Produtores registrados** (`helpers/traces.mjs`): `withProducerEvidence(test)` envolve o `test` do `node:test` (uma linha por arquivo: `const test = withProducerEvidence(nodeTest)`), e cada teste roda em `recordingProducers(body)`. Com registro ativo, `runInternal` (e `runHook`/`runHermesIngest`), `runClaudeHandler`, `runCodexHandler` e `runWrapper` passam por `recordedProducer(rótulo, env)`: sem `SKILL_ME_TEST_TRACES_TIMING` no ambiente, acrescentam a pré-carga (`--import=<pré-carga>` somado ao `NODE_OPTIONS` que houver e um arquivo próprio num scratch do registro); com ele, usam o do teste e a linha da saída. Sem registro, o ambiente é o mesmo objeto. `noteProcess(rótulo, filho)` registra um processo que não produz (o `follow`), só para o dono do lock. `inProcessProducer(rótulo, raiz, criar, {base = createStoreIo()})` passa a `criar(io)` um `io` que envolve o `base` pela injeção pública de `io` dos produtores, mede cada operação dele (`lstat`, `stat`, `realpath`, `readdir`, `rename`, `rmdir`, `unlink`, `mkdir`, `readBounded`, `writeExclusive`), as em curso, o laço do processo da prova (`monitorEventLoopDelay`, 10 ms) e a CPU desde a criação, e guarda o `report()` do produtor; a tomada do lock é o `writeExclusive lock` que deu certo, e a disputa, `writeExclusive lock EEXIST`. Rótulos: `hook <agente>`, `ingest hermes`, `hook <agente> instalado`, `wrapper codex`, o do `inProcessProducer` e `follow`. (3) **Evidência na falha**: quando o corpo do teste lança, o **mesmo** erro é relançado — tipo, `actual`, `expected`, `operator` e `code` iguais —, com `\n<evidência>` acrescentado a `message` e ao cabeçalho de `stack`; um valor que não é `Error`, ou cuja mensagem não pode mudar, sai igual. Quando o corpo passa, nada é calculado. A evidência nunca lança (o que falha vira `indisponível [<código>]`): `evidência dos produtores deste teste (<n>):`; por produtor, `produtor <k> <rótulo>[ (em processo)]: status <s>, sinal <sig \| nenhum>; entrega <relatório JSON \| sem relatório>`, `  tempos: <resumo>; lock ocupado (EEXIST, repetido) <n>x; última concluída: <op> <tipo> (<lugar>); pendentes …` e `  processo: …; laço de eventos: …`; por raiz, `raiz <r> (produtores <k>, …): lock presente, de <rótulos> \| presente, de outro processo \| ausente \| indisponível [<código>]; capturas <n> [<origem> <estado> accepted <a> persisted <p>; …] \| indisponível [<código>]; pasta das capturas <s> segmento(s), <t> temporário(s)`. A raiz vem do ambiente do produtor (`SKILL_ME_CAPTURE_ROOT`, `SKILL_ME_LAUNCH_ROOT`) ou, na rota automática, do `rootReal` de `<home>/.skill-me/observe.json`, lido só quando o ambiente foi dado e o home está dentro do temporário do sistema — nunca o perfil real; senão `raiz indisponível [home fora do temporário]`. Em processo, a raiz dada. O dono do lock é todo processo registrado cujo `pid` (da pré-carga, do `follow` ou o da prova, nos em processo) coincide com o gravado no `.lock`; a coincidência não prova sozinha quem deixou o arquivo. Nada de caminho, ID, chave, conteúdo, nonce ou ambiente. (4) **Arquivos que adotam** (os que tiveram produtores vermelhos nas CIs do PR): `observe/control.cli` (com os dois produtores em processo por `inProcessProducer`), `traces/follow.cli` (com o `follow` por `noteProcess`), `traces/live-capture.cli`, `traces/query.cli`, `traces/replay.unit`, `traces/concurrency.cli` e `observe/agents.e2e`. As outras 30 consumidoras não passam pelo registro e rodam como antes; adotar é uma linha. | Instrumentar mais quatro asserções isoladas: cobre só as que já falharam, e as quatro desta CI caíram fora das anteriores. Passar o registro a cada chamada (`trace:` nas 51 chamadas dos três arquivos da CI): uma chamada nova esquecida fica sem evidência. Adotar nas 30 consumidoras com produtores: sem falha registrada, e há provas que comparam o ambiente inteiro do filho (`codex-run.cli.test.mjs:84`, `probe.env` pelo wrapper contra o direto), que a pré-carga acrescentada mudaria. `t.diagnostic` ou um `Error` novo com `cause`: o diagnóstico não sai no resumo de falhas do runner (medido no Node 24.22.1), e o erro novo troca o tipo e os valores que a prova afirma. Patch global de `node:fs` no processo da prova, mock de módulo ou flag no produto para o produtor em processo: proibidos; a injeção pública de `io` já alcança as operações. Decompor `writeExclusive` (`open`/`writeFile`/`sync`/`close`) no apoio: reimplementaria o produto. Ler o home do ambiente herdado: leria o perfil real. Calcular o prazo da entrega a partir da pré-carga: o instante da leitura do evento não está na linha; ela dá a 1ª operação e a saída, e quem lê compara com o prazo. Retry, prazos maiores, menos paralelismo, skip ou aceitar perdas: proibidos. Tratar a instrumentação como correção: a causa segue desconhecida. |
| Adoção pelos hooks do arquivo e registro num módulo leve (descoberta do build, registrada antes do commit do código; refina os itens (2) e (3) da linha “Evidência comum dos produtores e formatter legado”) | **Medido no build**: (a) envolver o `test` (`withProducerEvidence`) muda o local que o runner imprime na falha (`test at …`) do arquivo da prova para `helpers/traces.mjs:380:10`, porque o runner grava como local quem chama o `test` (1ª execução do `control.cli` e sonda `builder-ci93-shared/probes/err-append.test.mjs`); (b) `installed-hooks.mjs` também é carregado pela fixture do launcher (`fixtures/launch/fake-agent.mjs`), e importar dele o `traces.mjs` subiu a carga de 7,9 para 30,4 ms por processo (mediana de 15, `probes/import-cost.mjs`). **Forma**: o arquivo adota com `recordProducersInEachTest()` no topo, sem alias de `test`: o `beforeEach` abre o registro, e o `afterEach(t)`, quando `t.passed` é falso, acrescenta a evidência a `t.error.cause` (o erro original; `t.error` quando não há `cause`) e fecha o registro. `context.error` e `context.passed` existem no Node 24.13.0 e no 24.22.1 (sonda `probes/hook-error.test.mjs` nos dois). `recordingProducers(body)` continua para os controles. O estado do registro (`recordedProducer`, `noteProcess`, `rootOf`, `isTestHome`, `TRACES_PROBE`) fica em `helpers/producer-runs.mjs`, só com builtins e `cli.mjs`; `traces.mjs` reexporta `TRACES_PROBE` e `noteProcess` e monta a evidência; a carga da fixture voltou a 7,8 ms. A raiz da rota automática é lida quando o produtor parte (a configuração que ele lê); o resto só na falha. No lugar neutro, o `lstat ENOENT` sai como `ausências conferidas (lstat ENOENT) <n>x`, como no C47, e não como falha; o caminho manual do C46 (d)–(g) não muda. | Envelope de `test`: troca o arquivo e a linha da falha pelos do apoio. Importar `traces.mjs` em `installed-hooks.mjs`/`wrapper.mjs`: +22 ms na fixture do launcher, fora de qualquer registro. `t.diagnostic` no `afterEach`: não sai no resumo de falhas. `lstat ENOENT` como falha na rota automática: diria falha onde há a conferência normal de ausência. |
| Preparação da fixture do plugin Hermes no Node 24.13.0 do Windows (gate B em `60bbda8`, preservado: 333/314/7/12 — I4-C19, C20, C21, C22, C37 e I23-C8 com `Unknown tool: skillme_fixture_echo` ou `'error' !== 'ok'`, e I4-C35 com `ENOENT` em `skill-tree-hash.cli.test.mjs:101`; refinamento do C40 e da task 32, sem check novo) | **Causa demonstrada** (`builder-ci93-shared/probes/fs-unicode-win.txt`, com a fixture real): no Windows, Node 24.13.0, destino com “ação”, o `cpSync` recursivo não lança e deixa o destino ausente, e o `rmSync` recursivo, com ou sem `force`, não lança e deixa a pasta com o conteúdo; o `cp` e o `rm` de `node:fs/promises` copiam e removem com os sha256 da fonte. No 24.22.1, ou com caminho ASCII, todas funcionam. O I4-C35 isolado falha com o 24.13.0 e passa com o 24.22.1, no checkout e no clone, e falha igual em `93bd1e9` (`final/diag-B/`): não vem desta entrega nem do produto. O repositório já documenta o mesmo defeito do Node e o substituto (`concurrency.cli.test.mjs:54`, nodejs/node#56049). **Forma** (só provas e apoios de prova): `helpers/hermes-runtime.mjs` ganha `installFixturePlugin(home, name)` — `cp` de `node:fs/promises`, recursivo, de `FIXTURE_PLUGINS/<name>` para `<home>/plugins/<name>` — e `removeFixturePlugin(home, name)` — `rm` de `node:fs/promises`, recursivo, sem `force` (um plugin ausente lança `ENOENT`). Consumidores demonstrados: `hermes-plugin.native.test.mjs` (`prepareAndRun`) e `skill-tree-hash.cli.test.mjs` (I4-C35: a cópia e a remoção do plugin); o `after` dessas duas provas remove os próprios scratches por `rm` de `node:fs/promises`, recursivo e sem `force`. Os 12 testes nativos, os plugins versionados, o `HERMES_HOME` temporário, os argumentos, os eventos, o Unicode e as asserções não mudam. **Controle** (`hermes-harness.unit.test.mjs`, `I25-C40 fixture do plugin: …`, sem o Hermes): numa pasta de prova com “ação”, depois de `installFixturePlugin` o destino tem exatamente a árvore da fonte (`snapshotTree` sem mtime: nomes, tipo arquivo regular, bytes e sha256); `removeFixturePlugin` a remove, e de novo lança `ENOENT`. RED: a preparação antiga (`cpSync`/`rmSync`) numa cópia descartável, no 24.13.0 do Windows; GREEN: a nova no 24.13.0 e no 24.22.1. Discrimina só no Windows com o 24.13.0 (gate B); nos outros, a antiga também passa — limite declarado. | Trocar todos os `cpSync`/`rmSync` das provas: as outras provas não falharam nos gates. Atualizar o Node local ou o da CI, tirar “ação” dos scratches ou reduzir a carga: proibidos. `force: true` na remoção: engoliria o `ENOENT` de um plugin que não foi copiado. `copyFileSync` de uma lista de arquivos escrita na prova: duplicaria a fixture; o `cp` é o substituto já documentado. Abstração geral de sistema de arquivos: sem consumidor além destes dois. Nos outros 37 arquivos o `after` com `rmSync` continua deixando os scratches com “ação” no Windows 24.13.0; os gates isolam o temporário por execução. |
| Duração monotônica no apoio dos hooks instalados (gate C em `60bbda8`, preservado: 333/312/1/20 — I4-C36, `failure-matrix.cli.test.mjs:82`, `claude timeout: 209 ms` com `stdinTimeout` 1; refinamento do C46 e da task 38, sem check novo) | **Comparação das mesmas chamadas** (`builder-ci93-shared/clock/`, ambiente do C: WSL uid 1000, Node 24.13.0 copiado, `env -i`, `HOME` e `TMPDIR` no scratch): 349 chamadas do caso de stdin aberto do I4-C36 pelo apoio real, cada uma medida também por `Date.now()` e `performance.now()` em volta dela, com um monitor de 20 ms. O relógio civil recuou 50 vezes (25 pares de cerca de −0,8 s e −1,0 s, a cada ~30 s); as 28 chamadas que atravessaram um recuo deram `elapsedMs` de 53 a 1.499 ms contra 2.053 a 2.090 ms monotônicos, todas com `stdinTimeout` 1; nas outras 321 a diferença foi ≤ 3 ms. O hook mede o prazo de 2.000 ms por `setTimeout` (monotônico); o apoio mede a duração por `Date.now()` (`collect` em `helpers/installed-hooks.mjs`). **Causa demonstrada** da falha do gate C. **Forma**: em `collect`, `started = performance.now()` no mesmo ponto e `elapsedMs = Math.round(performance.now() − started)`; o campo e os consumidores (I4-C36 e I23-C14) são os mesmos. A faixa 1.900 ≤ ms < 6.000 do I4-C36, o `HOOK_STDIN_DEADLINE_MS` 2.000, os 750/650 e o tempo civil do produto (instantes, retenção, execução) não mudam. Precedente: `hermes-harness.unit.test.mjs` já mede a duração por `performance.now()`. **Controle** (`failure-matrix.cli.test.mjs`, `I25-C46 apoio dos hooks instalados: …`): um processo de prova isolado (`node -e`) importa o apoio, recua o `Date.now` só dele em 1.800 ms 200 ms depois de iniciar o caso de stdin aberto do I4-C36 com o hook Claude instalado — o hook, o CLI do produto, roda sem injeção — e imprime o resultado. A prova exige que o relógio civil do processo isolado tenha recuado (delta civil < 1.900 ms), `stdinTimeout` 1 e `elapsedMs` em 1.900 ≤ ms < 6.000, a faixa do I4-C36. RED: o apoio de `60bbda8` (~200 ms); GREEN: o corrigido. | Afrouxar a faixa do I4-C36 ou mudar o prazo de 2.000 ms: proibido. Mexer no relógio do WSL ou do host: proibido. Medir pela duração do teste no runner: mede outra coisa (todas as chamadas do teste). Patch do `Date` no processo do runner ou no CLI do produto: só o processo isolado do controle recebe a injeção. API nova no produto para o teste: o `performance.now()` já é público. |
| Processos da árvore de um produtor e lock ilegível na evidência comum (gate B em `c0d61d7`, preservado: 343/330/1/12 — T8-C4 `com hook do filho`, `live-capture.cli.test.mjs:414`; refinamento do C46, sem check novo) | **O que se viu**: a evidência comum da primeira falha real trouxe o wrapper com `lock_present` (16 entradas, 7 confirmadas, 9 perdidas), 53 disputas do lock, nenhuma operação pendente na saída, 15,2 s de processo e o laço com até 503,6 ms, e da raiz `lock presente, de ilegível [SyntaxError]`. O arquivo da pré-carga do produtor tinha **3 linhas** (o wrapper, o Codex falso e o hook que o Codex falso inicia, todos com a pré-carga herdada), e só a do wrapper foi mostrada. O wrapper saiu sem pendente, e o Codex falso não toca o store: por eliminação, o hook filho é o candidato a ter deixado o lock, mas a linha dele não saiu. **Causa da falha**: desconhecida; é a classe histórica do lock deixado por uma tentativa abandonada (`docs/traces.md`), não demonstrada aqui. A lacuna é da evidência. **Forma**: quando o arquivo da pré-carga é do registro (um por produtor), a evidência mostra cada linha dele, `processo <k> de <n>`, com o resumo, a última concluída, os pendentes, o processo e o laço, e o `pid` de cada linha entra nos donos possíveis do lock (`produtor <i> <rótulo>, processo <k> de <n>`). Com o arquivo do teste (uma linha por processo de vários produtores), só a linha da saída do produtor, como antes. O lock que não se lê como JSON sai `presente, ilegível [<código>; <n> bytes]`; só o tamanho, nunca o conteúdo. | Mostrar só a linha da saída: escondeu o processo que mais provavelmente deixou o lock. Mostrar todas as linhas de um arquivo do teste compartilhado: repetiria em cada produtor as linhas dos outros. Ler o conteúdo do lock ilegível: traria dados do arquivo; o tamanho distingue o lock criado e não gravado (0 bytes) do gravado pela metade. Repetir o gate para ver o T8-C4 passar: proibido. |
| Abandono terminal no prazo da entrega (gate B final em `cd4afc2`, preservado: 345/332/1/12 — T8-C16 `tentativa cortada no prazo antes de obter o lock…`, `concurrency.cli.test.mjs:922`, `4 !== 3`; critério 38, AC7; decisão do coordenador de 28/10/2026) | **Regra** (decidida; `docs/traces.md`, “Falhas de entrega” e tabela de códigos): só a recusa concluída do lock — o `lock_present` que a própria operação devolve — é repetida até o prazo; a tentativa abandonada no prazo é a última da entrada; o lock obtido com o prazo esgotado não autoriza gravar. **Defeito 1** (demonstrado): em `untilDeadline` (`src/integrations/traces/delivery.mjs`; lógica de `d1a5570`/`edd9d69` da #8, exportada à #23 em `fd07b89`, todos na `main`) o timer marca `abandoned` e resolve com o motivo anterior; depois de uma recusa esse motivo é `lock_present`, e o laço, que olha só `outcome.code`, inicia outra tentativa se `clock()` ainda está aquém do prazo, com a abandonada pendente. Sonda do autor anterior: 13/400 rodadas no 24.13.0 e 15/400 no 24.22.1 com 4 criações, todas `lock_present`. **Defeito 2** (candidato, corrigido só se a prova discriminante o reproduzir): `onLock` só testa `abandoned`; o lock que chega com `deadlineAt - clock() <= 0` antes de o callback do timer rodar (laço atrasado) seria aceito e a operação gravaria. **Forma** (só dentro de `untilDeadline`; assinatura, forma do retorno, códigos, `LOCK_RETRY_MS`, timer, prazos e consumidores iguais): (1) `onLock` lança — dentro do store, que devolve o próprio lock sem mutação (`withLock`/`holdLockFile`) — quando a tentativa já foi abandonada ou quando `deadlineAt - clock() <= 0`, e no segundo caso também a marca abandonada; (2) depois da corrida, a tentativa abandonada encerra a entrega com `{ok: false, code: locked ? "delivery_timeout" : <motivo anterior>}` — `delivery_timeout` sem recusa anterior, `lock_present` depois de uma —, nunca com o `io_failure` da rejeição interna; (3) só então vale a repetição do `lock_present` concluído. O commit que obteve o lock antes do prazo continua podendo terminar depois, com a confirmação incerta (`delivery_timeout`). | Arredondar ou adiantar o timer, somar tolerância ao prazo ou comparar o relógio com folga: esconde a corrida sem tornar o abandono terminal. Aceitar `>= 3` ou 4 criações no T8-C16: enfraquece a prova. Repetir depois do abandono cancelando a anterior: o store não cancela, e seriam duas operações em voo. Teto de tentativas, espera extra ou retry novo: política nova. Mapear o abandono interno para `io_failure`: nenhuma E/S falhou, e contradiz a tabela de códigos. Decidir o prazo no store ou criar API: o `onLock` já é o ponto de decisão da entrega, e API só para teste é proibida. Proibir o commit já sob lock antes do prazo de terminar: muda o contrato da confirmação incerta. Patch global de timers, relógio ou `fs` nas provas: o `clock` e o `io` injetáveis de `createCaptureDelivery` já permitem a prova. |

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
Acréscimo (execução completa instrumentada em `710076e`: B saiu com `store_invalid` na primeira criação do store; linha “Primeira criação concorrente do store” do Landing): o C32 de processos reais não muda — raiz sem store, as duas invocações simultâneas e intercaladas, IDs e chaves próprios, 2 e 3 registros exatos. Provas novas, determinísticas pelo `io` injetado, sem esperar tempo:
(a) `I25-C32 primeira criação do store: marcador em publicação` — na raiz sem store, a abertura A para dentro da criação do marcador (arquivo criado, bytes ainda não escritos); nesse instante a pasta do store tem exatamente o `.lock` e o temporário `store.json.<hex8>.skill-me-tmp`, vazio, e nenhum `store.json`; a abertura B sai com `lock_present` e a pasta fica igual; liberada A, ela abre e B abre em seguida; as duas execuções têm `invocation`, captura e chave próprias, segmento 1 `active`, `limits` `{maxEvents: 500, maxBytes: 8388608}`, ponteiro cada uma; `store.json` exato e nenhum temporário; os dois encerramentos deixam as capturas `stopped` e os ponteiros fora.
(b) `I25-C32 primeira criação do store: pasta vazia vista antes do lock` — B confere a pasta vazia e só tenta o lock depois de A abrir: B abre (não `io_failure`), sem regravar o marcador, e as duas encerram.
(c) `I25-C32 primeira criação do store: marcador publicado entre a leitura e a listagem` — B começa antes de A e só lista a pasta depois de A abrir: B abre (não `store_invalid`), e as duas encerram.
(d) `I25-C32 primeira criação do store: recusas mantidas` — pasta com entrada alheia sem marcador, marcador diferente, marcador vazio e temporário do marcador sem `.lock` → `store_invalid`, pasta byte a byte igual e sem `.lock`; `.lock` alheio com o temporário do marcador e `.lock` alheio sozinho → `lock_present`, lock intacto; pasta do store como link/junção → `link_refused`; raiz trocada → `root_changed`; pasta vazia → adotada, com o marcador exato e sem temporário.
(e) `I25-C32 primeira criação do store pelo launcher` — dois launchers em processo na mesma raiz sem store: A parado dentro da publicação do marcador; B tenta o lock pelo menos uma vez (`lock_present` na paciência de sempre) e A é liberada; os dois agentes rodam, gravam 1 evento cada na própria captura (pseudônimo da chave própria) e saem; os dois launchers saem com 0 e o resumo `capturas: 1; eventos gravados: 1.`; capturas `stopped`, ponteiros fora.
Proof: `node --test --test-name-pattern="I25-C32 " tests/integrations/launch/store.unit.test.mjs tests/integrations/launch/end.e2e.test.mjs`
Acréscimo (Verifier 10 em `df259ed`, ambiente C: o diagnóstico de C32 saiu com `ENOENT` de uma captura em construção no lugar de `eventos intercalados: B terminou antes`; linha “Diagnóstico de C32 com captura em construção” do Landing): na falha, `withOverlappingRuns` não deixa a inspeção substituir o erro nem impedir a limpeza. Prova nova, `I25-C32 diagnóstico com captura em construção e probe incompleto`, pela mesma rotina, em duas variantes (pasta de captura sem `state.json`; probe de B com JSON incompleto): com A parada na barreira e B terminada (127, `executable_not_found`), a primeira linha do erro é exatamente `eventos intercalados: B terminou antes`, `cause.message` é a mesma, o diagnóstico tem `["indisponível", "ENOENT"]` entre as capturas (ao lado da captura `active` de A) ou `probes.B` = `indisponível [SyntaxError]`, `launchers.A` com status 0 — A já tinha terminado quando o erro saiu — e `launchers.B` = `{status: 127, signal: null, stderr: "skill-me: claude não encontrado no PATH [executable_not_found]\n"}`; `barreirasNaoGravadas` vazio; e `launchCapturesOnDisk` continua lançando `ENOENT` na mesma árvore.
Proof: `node --test --test-name-pattern="I25-C32 diagnóstico" tests/integrations/launch/end.e2e.test.mjs`

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

Refinamento (gate B em `60bbda8`, Windows, Node 24.13.0; linha “Preparação da fixture do plugin Hermes
no Node 24.13.0” do Landing), antes do código. O C40 continua o mesmo, e as provas nativas continuam
exercitando os plugins de fixture versionados num `HERMES_HOME` temporário, com os mesmos argumentos,
eventos, Unicode e asserções. A preparação delas (e do I4-C35) instala e remove o plugin de fixture por
`installFixturePlugin`/`removeFixturePlugin` de `helpers/hermes-runtime.mjs`.
(a) **Cópia exata em caminho com “ação”** (`I25-C40 fixture do plugin: …`, em
`hermes-harness.unit.test.mjs`, sem o Hermes): o destino tem a árvore da fonte — os mesmos nomes, tipo
arquivo regular, bytes e sha256 (`snapshotTree` sem mtime) — e não fica vazio.
(b) **Remoção que não engole ausência**: `removeFixturePlugin` deixa o plugin ausente, e uma segunda
remoção lança `ENOENT`.
RED: a preparação antiga (`cpSync`/`rmSync`), numa cópia descartável, no Node 24.13.0 do Windows; GREEN: a
nova no 24.13.0 e no 24.22.1. Fora do Windows com o 24.13.0 o controle não discrimina (a antiga também
passa).
Proof: `node --test --test-name-pattern="I25-C40 " tests/integrations/hermes-harness.unit.test.mjs`
Proof: o gate B (Windows, Node 24.13.0) com os 12 testes nativos e o I4-C35

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

### S10 — Diagnóstico pontual do T8-C15 (task 38; AC7)

Escopo da autorização 6440482031; C1–C45 não mudam. Fonte: o FAIL do gate D da 9ª verificação
(`4e66de2`, `concurrency.cli.test.mjs:107`). Linha “Diagnóstico do T8-C15” do Landing.

**C46** — O T8-C15 continua com os dois produtores simultâneos de 40 eventos e as mesmas asserções
(status 0 e `{bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0}` por
produtor, 80 eventos únicos, segmento coerente, pares de hooks, recusa com lock alheio) e passa no
caso saudável. Pela mesma rotina do T8-C15 (produtores, inspeção e asserções), com uma injeção
existente da pré-carga só no produtor `b`:
(a) antes do commit, `SKILL_ME_TEST_TRACES_SEGMENT_EIO=1`: a asserção do T8-C15 falha com a mensagem
`b` seguida da evidência inteira. Na evidência, `a` tem `{bound: true, code: null, entries: 40,
committed: 40, persisted: 40, lost: 0}` e nenhuma operação com erro; `b` tem `code: "io_failure"`,
`committed` = `persisted`, `committed` + `lost` = 40, `lost` > 0 e exatamente uma operação com erro,
`rename segmento.tmp EIO (antes do commit)` — a injeção aconteceu e não houve nova tentativa. O
export tem 40 registros de `a` e, de `b`, só os `committed`, sem outros nem repetidos; o status tem
`accepted` = `persisted` = 40 + `committed`; um segmento, nenhum temporário, lock ausente.
(b) confirmação perdida, `SKILL_ME_TEST_TRACES_LOST_CONFIRMATION=2`: mensagem `b` seguida da
evidência; `b` com `io_failure`, `committed` + `lost` = 40, `lost` > 0 e exatamente `unlink lock EIO
(depois do commit)`; o export tem os 40 de `a` e os 40 de `b` — as entradas dadas como perdidas
estão no disco —, e o status `persisted` 80; um segmento, nenhum temporário, lock ausente.
(c) inspeção indisponível, `SKILL_ME_TEST_TRACES_LOCK_KEPT=2` (a liberação do lock de `b` falha e o
lock fica): a asserção falha com a mensagem do primeiro produtor que não confirmou tudo, seguida da
evidência; `b` tem `io_failure`, nenhuma entrada confirmada e exatamente `unlink lock EIO (depois do
commit)`; o lock aparece presente; export e status saem `indisponível [lock_present]`, sem contagem
presumida; a pasta da captura continua contada (um segmento, nenhum temporário).
Em (a), (b) e (c) a evidência não contém a raiz, o ID da captura, a chave, o conteúdo dos eventos nem
o PATH do ambiente.
Proof: `node --test --test-name-pattern="T8-C15 |I25-C46 " tests/integrations/traces/concurrency.cli.test.mjs`
Refinamento (CI 40709943742 e execução manual 40710014746 no Windows: T8-C3, T8-C8, T8-C14 e T8-C18;
linha “Diagnóstico das entregas de um produtor nas provas T8” do Landing), antes do código.

Continua um só check: (a)–(c) não mudam. T8-C3, T8-C8, T8-C14 e T8-C18 continuam com as mesmas asserções
e passam no caso saudável; cada produtor roda com a pré-carga de tempos, e a mensagem só ganha a
evidência quando a entrega ou o `stop` não vêm como esperado.

As provas novas passam pela rotina do T8-C3 (o ingest Hermes dos 9 registros), com uma injeção da
pré-carga só no ingest, e a asserção do T8-C3 falha com `actual` = `{bound: true, code:
"delivery_timeout", entries: 9, committed: 0, persisted: 0, lost: 9}`, `expected` = `DELIVERED(9)` e a
mensagem iniciada por `ingest hermes\n<evidência>`:
(d) **disco parado sob o lock**, `SKILL_ME_TEST_TRACES_STALL_SEGMENT=1`
(`I25-C46 diagnóstico das entregas de um produtor: disco parado sob o lock …`):
  - nenhuma falha; pendente exatamente `open segmento.tmp (sob o lock, 2ª tomada)`;
  - a idade dela é ≥ 650 − (início dela − fim da 1ª tomada) ms: o lote só é lido depois da abertura e
    espera até o prazo de 650 ms da leitura;
  - última concluída `close state.json (sob o lock, 2ª tomada)`;
  - atraso máximo do laço < 650 ms;
  - captura com status `indisponível [lock_present]`, pasta com 0 segmento e 0 temporário, e lock
    presente, de `ingest hermes`.
(e) **criação do lock parada**, `SKILL_ME_TEST_TRACES_GATE=<pasta>|1`, sem liberar
(`… criação do lock parada …`):
  - pendente exatamente `open lock (tomada do lock)`;
  - última concluída `close store.json (fora do lock)`;
  - atraso máximo do laço < 650 ms;
  - captura com status `active, accepted 0, persisted 0`, pasta com 0 segmento e 0 temporário, e lock
    ausente.
(f) **laço bloqueado**, `SKILL_ME_TEST_TRACES_BLOCK_LOOP=2|900` (`… laço de eventos parado …`): o laço
fica parado 900 ms antes da criação do lock da gravação, e o atraso máximo é ≥ 650 ms. Pendentes e lock
não são afirmados: dependem de a tentativa abandonada terminar antes da saída.
(g) **T8-C18 com o lock deixado** (`I25-C46 diagnóstico do T8-C18: …`): pela rotina do T8-C18, com
`STALL_SEGMENT=1` só no ingest Hermes (o 2º produtor):
  - o `stop` falha com status 4, e a mensagem começa por `stop:
    {"schemaVersion":1,"command":"stop","status":"error","error":{"code":"lock_present"}}\n<evidência>`;
  - `hook claude pre_tool_bash` entrega `DELIVERED(1)`;
  - `ingest hermes` fica com `delivery_timeout` 2/0/0/2 e pendente `open segmento.tmp (sob o lock, 2ª
    tomada)`. São duas entradas porque a rotina do T8-C18 dá ao ingest um registro válido e a linha
    malformada `{quebrado`, e a malformada também conta como entrada; o T8-C18 saudável afirma
    `counters.malformed` 1;
  - `hook claude post_tool_skill` fica com `lock_present` 1/0/0/1 e lock ocupado repetido;
  - captura com status `indisponível [lock_present]` e lock presente, de `ingest hermes`.

Em (d)–(g) a evidência não contém a raiz, o ID da captura, a chave, o PATH nem os canários de conteúdo.

Nos controles, a operação em curso e o processo que segura o lock são conhecidos pela injeção. Numa
falha real, os mesmos campos são evidências: a operação em curso com o laço livre é compatível com uma
espera de E/S ou do sistema, sem identificar o recurso; o `pid` do lock só coincide com o de um
produtor. Retificação documental antes do Verifier 17, sem mudança de critério, valor ou prova.

As provas antigas, numa cópia descartável com a mesma injeção, mostram a mensagem sem nada disso (RED, no
build).
Proof: `node --test tests/integrations/traces/live-capture.cli.test.mjs tests/integrations/traces/query.cli.test.mjs tests/integrations/traces/replay.unit.test.mjs` (T8-C3, T8-C8, T8-C14, T8-C18 e os `I25-C46 diagnóstico …` novos)

Refinamento (CI 40728221657 e execução manual 40728249484 no Windows: T8-C12, T8-C13 e T8-C2; linha
“Evidência comum dos produtores e formatter legado” do Landing), antes do código.

Continua um só check: (a)–(g) não mudam. T8-C2, T8-C12, T8-C13 e os demais testes dos arquivos que adotam o
registro continuam com as mesmas asserções e passam no caso saudável. O texto do formatter comum ganha os
acréscimos do Landing; (a)–(g) comparam com as mesmas funções e com trechos que não mudam.

(h) **Formatter legado com o que a pré-carga grava** — pela rotina do T8-C2 (hook Codex instalado,
`deliveryClock`), com `SKILL_ME_TEST_TRACES_STALL_SEGMENT=1` só no hook do 1º caso
(`I25-C46 diagnóstico do formatter legado: …`):
  - a asserção do T8-C2 falha com `actual` = `{bound: true, code: "delivery_timeout", entries: 1,
    committed: 0, persisted: 0, lost: 1}` e `expected` = `DELIVERED(1)`, e a mensagem começa por
    `<caso>: <describeTiming da linha do hook>`;
  - nessa linha: exatamente um pendente, `open segmento.tmp (sob o lock, 2ª tomada)`, com idade > 0;
    `operações concluídas`; `processo: iniciado <ISO>, 1ª operação aos …, última conclusão aos …, saída
    aos …`; laço com amostras e atraso máximo < 650 ms;
  - depois, a evidência do registro: `produtor 1 hook codex instalado` com o mesmo relatório, e `raiz 1
    (produtores 1): lock presente, de produtor 1 hook codex instalado; capturas indisponível
    [lock_present]`.
(i) **Follow sem o registro** — pela rotina do T8-C12 (`stop`), com `STALL_SEGMENT=1` só no 1º hook
(`I25-C46 diagnóstico do T8-C12: …`):
  - o erro é o da asserção do T8-C12 (`AssertionError`, `actual` 0, `expected` 1, `strictEqual`), com a
    mensagem original no começo e `\nevidência dos produtores deste teste (1):` depois;
  - o hook com `delivery_timeout` 1/0/0/1 e o pendente `open segmento.tmp (sob o lock, 2ª tomada)`;
  - `raiz 1 (produtores 1): lock presente, de produtor 1 hook claude; capturas indisponível
    [lock_present]`.
(j) **Stop com o lock deixado** — pela rotina do T8-C13 (captura já encerrada), com `STALL_SEGMENT=1` só no
ingest (`I25-C46 diagnóstico do T8-C13: …`):
  - o erro é o do `privacyOk` (`actual` 4, `expected` 0), e a mensagem começa por `stop:
    {"schemaVersion":1,"command":"stop","status":"error","error":{"code":"lock_present"}}`;
  - os dois hooks com `DELIVERED(1)`, e o ingest com `delivery_timeout` 1/0/0/1 e o mesmo pendente;
  - `lock presente, de produtor 3 ingest hermes`.
(k) **Apoio comum** (`tests/integrations/traces/evidence.unit.test.mjs`, `I25-C46 evidência comum: …`), com
linhas sintéticas e um corpo que lança:
  - linha válida: o texto exato com o pendente, o processo (`saída aos 700 ms (650 ms depois da 1ª
    operação)`) e o laço;
  - dados ausentes: sem operação concluída, `nenhuma operação de disco concluída` (nunca `0 ms`); laço sem
    amostra, `sem amostras`; linha sem os campos, `não registradas` e `não registrado`;
  - o erro relançado é o mesmo objeto, com `actual`, `expected` e `operator` iguais, a mensagem original
    seguida da evidência e o `stack` com a mensagem nova; uma inspeção que falha sai `indisponível
    [<código>]` sem trocar o erro; um valor que não é `Error` sai igual; sem registro, `recordedProducer`
    devolve o mesmo ambiente;
  - um home fora do temporário não é lido: `raiz indisponível [home fora do temporário]`.

Em (h)–(k) a mensagem não contém a raiz, o home, o ID da captura, a chave, o PATH nem os canários de
conteúdo. As provas antigas (`93bd1e9`), numa cópia descartável com a mesma injeção, mostram a mensagem sem
nada disso (RED, no build). Nos controles, a operação parada e o processo do lock são conhecidos pela
injeção; numa falha real, os mesmos campos são evidências, não a causa.
Proof: `node --test tests/integrations/traces/evidence.unit.test.mjs tests/integrations/traces/live-capture.cli.test.mjs tests/integrations/traces/follow.cli.test.mjs` (T8-C1, T8-C2, T8-C12, T8-C13, os `I25-C46` de antes e os novos)

Refinamento (gate C em `60bbda8`, WSL, Node 24.13.0: I4-C36 com `claude timeout: 209 ms`; linha “Duração
monotônica no apoio dos hooks instalados” do Landing), antes do código. (a)–(k) não mudam.
(l) **Duração do apoio dos hooks instalados** (`I25-C46 apoio dos hooks instalados: …`, em
`failure-matrix.cli.test.mjs`): com o `Date.now` de um processo de prova isolado recuado em 1.800 ms no
meio do caso de stdin aberto do I4-C36 (o hook Claude instalado roda sem injeção), o processo isolado
mostra o recuo (delta civil < 1.900 ms), o hook relata `stdinTimeout` 1, e o `elapsedMs` do apoio fica em
1.900 ≤ ms < 6.000, a faixa do I4-C36. RED: o apoio de `60bbda8`; GREEN: o corrigido. O I4-C36 continua
com a mesma faixa e o mesmo prazo de 2.000 ms.
Proof: `node --test --test-name-pattern="I4-C36 |I25-C46 " tests/integrations/failure-matrix.cli.test.mjs`

Refinamento (gate B em `c0d61d7`: T8-C4 com o lock ilegível e só 1 de 3 linhas da pré-carga mostrada;
linha “Processos da árvore de um produtor e lock ilegível na evidência comum” do Landing), antes do código.
(m) **Árvore do produtor** (`I25-C46 evidência comum: …`, em `evidence.unit.test.mjs`): um produtor com o
arquivo do registro de 3 linhas (como o wrapper, o Codex falso e o hook filho) tem as 3 na evidência, como
`processo 1 de 3` a `processo 3 de 3`, com o pendente da 3ª; o lock com o `pid` da 3ª sai `de produtor 1
<rótulo>, processo 3 de 3`. Um produtor com o arquivo do teste continua com só a linha da saída dele.
(n) **Lock ilegível**: um `.lock` vazio sai `presente, ilegível [SyntaxError; 0 bytes]`, sem o conteúdo.
RED: o apoio de `d317202` (só a última linha; `de ilegível [SyntaxError]`); GREEN: o corrigido.
Proof: `node --test --test-name-pattern="I25-C46 evidência comum" tests/integrations/traces/evidence.unit.test.mjs`

Refinamento (gate B final em `cd4afc2`: T8-C16 `4 !== 3` criações do lock; linha “Abandono terminal no prazo
da entrega” do Landing), antes do código. (a)–(n) não mudam. O T8-C16 original
(`concurrency.cli.test.mjs:908`) não muda: `lock_present` 1/0/0/1, ≤ 750 ms, `lockCreations` **exatamente**
3, a tentativa abandonada devolve o lock sem gravar.
(o) **Decisão do prazo** (`tests/integrations/traces/delivery.unit.test.mjs`, `I25-C46 prazo da entrega: …`),
pelo `untilDeadline` exportado, com relógio injetado e prazo de 30 unidades a partir de 0; o timer é o real.
Operações falsas que devolvem o que o store devolve (`StoreError`):

| Caso | Relógio no `onLock` | Resultado | Chamadas |
| --- | --- | --- | --- |
| sucesso | 0 | `{ok: true, value}` | 1 |
| recusa concluída (`lock_present`) e depois sucesso | 0 | `{ok: true, value}` | 2 |
| falha de E/S (`io_failure`) | — | `{ok: false, code: "io_failure"}` | 1 |
| pendente sem lock; o timer dispara | depois do timer | `delivery_timeout`; o `onLock` tardio lança | 1 |
| lock antes do prazo e operação pendente; o timer dispara | 0 | `delivery_timeout`; o `onLock` não lançou | 1 |
| **defeito 1**: recusa concluída, depois pendente; o timer dispara com o relógio em 29,5 | depois do timer | `lock_present`; a 2ª ainda pendente; o `onLock` dela lança depois | **2** |
| **defeito 2**: lock com o relógio = 30 e = 31, sem recusa anterior, antes do timer | 30 / 31 | `delivery_timeout`, nunca `ok` nem `io_failure` | 1 |
| **defeito 2**: idem depois de uma recusa concluída | 30 / 31 | `lock_present` | 2 |
| válido no limite: lock com o relógio em 29,999 e operação concluída antes do timer | 29,999 | `{ok: true, value}` | 1 |

RED com o `untilDeadline` de `a6a829e`: o defeito 1 dá 3 chamadas; o candidato, se existir, `{ok: true}`.
(p) **Fronteira real do store** (`concurrency.cli.test.mjs`, `I25-C46 prazo da entrega: …`): `createCaptureDelivery`
com o `io` roteirizado do arquivo e o `clock` injetado (o prazo da entrada é o relógio na entrada + 650):
- defeito 1: criação 1 = abertura, 2 = commit `EEXIST`, 3 = repetição parada antes de existir o lock, com o
  relógio em prazo − 0,5 → `lock_present` 1/0/0/1 em ≤ 750 ms e `lockCreations` 3; liberado o disco, a
  tentativa abandonada devolve o lock sem gravar: `lockUnlinks` 2, árvore da captura igual, sem `.lock`,
  `persisted` 0. RED em `a6a829e`: 4 criações.
- defeito 2 (candidato): o relógio vai ao prazo e a prazo + 1 quando a criação real do lock termina, antes do
  `onLock`. Com a criação 2 (commit) real: `delivery_timeout` 1/0/0/1; com a 2 `EEXIST` e a 3 real:
  `lock_present` 1/0/0/1. Em todos: `lockUnlinks` 2 (abertura e a tentativa recusada), árvore da captura
  igual, sem `.lock`, `persisted` 0. RED, se existir: `code: null` com 1/1/1/0 e o evento no export.
- controle válido: com a criação 2 real e o relógio em prazo − 0,001, `code: null` 1/1/1/0 e o evento no
  export, igual antes e depois da correção.
Proof: `node --test tests/integrations/traces/delivery.unit.test.mjs` e `node --test --test-name-pattern="T8-C16 |I25-C46 prazo" tests/integrations/traces/concurrency.cli.test.mjs`

### S11 — Diagnóstico do I23-C10 e orçamento do job Windows (task 39–40; AC8)

Escopo da autorização 6460177952; C1–C46 não mudam. Fonte: a CI 40514323240 em `d0d5a7f`
(`.checks/issue-25-agent-launch.ci40514323240-handoff.md`). Linhas “Diagnóstico do I23-C10” e
“Orçamento do job Windows” do Landing.

**C47** — O I23-C10 continua com as mesmas etapas e asserções: hooks intercalados e simultâneos com
`DELIVERED_AUTO(1)`, o ingest Hermes com `DELIVERED_AUTO(20)`, cinco capturas automáticas com chaves
próprias, uma sessão por captura, os eventos de cada sessão e o relatório de uma sessão sem a outra;
ele passa no caso saudável. Pela mesma rotina, numa raiz observada nova, com uma injeção existente da
pré-carga só no hook da sessão Codex A, na primeira entrega dela:
(a) `SKILL_ME_TEST_TRACES_SEGMENT_EIO=1`: a asserção da etapa falha com `actual` = o relatório e
`expected` = `DELIVERED_AUTO(1)`, e a mensagem começa por `codex A 0` seguido da evidência inteira. O
relatório é `{automatic: true, code: "io_failure", entries: 1, committed: 0, persisted: 0, lost: 1,
unrouted: 0}`. A evidência traz `falhas rename segmento.tmp EIO (sob o lock, 2ª tomada)` — a injeção
aconteceu, sem nova tentativa — e `ausências conferidas (lstat ENOENT) 1x`. Da raiz, `capturas
automáticas 1 [active accepted 0 persisted 0]` (a captura da sessão foi criada antes do segmento),
nenhum segmento, nenhum temporário e lock ausente.
(b) `SKILL_ME_TEST_TRACES_STALL_SEGMENT=1` (disco parado na criação do segmento): o relatório é
`{automatic: true, code: "delivery_timeout", entries: 1, committed: 0, persisted: 0, lost: 1, unrouted:
0}`, o sintoma da CI; nenhuma falha; `última concluída: close key (sob o lock, 2ª tomada)`; capturas
automáticas `indisponível [lock_present]`, lock presente, nenhum segmento e nenhum temporário.
Em (a) e (b), a mensagem não contém a raiz, o home, IDs de captura, chaves, as sessões nativas, os IDs
de chamada, o PATH nem canários de conteúdo.
Proof: `node --test --test-name-pattern="I23-C10 |I25-C47 " tests/integrations/observe/agents.e2e.test.mjs`
Proof: `node --test --test-name-pattern="T8-C15 |I25-C46 " tests/integrations/traces/concurrency.cli.test.mjs` (o apoio comum não muda a saída do T8-C15 nem a dos C46)

Refinamento (CI 40728221657 no Windows: I23-C4; linha “Evidência comum dos produtores e formatter legado”
do Landing), antes do código. (a) e (b) continuam valendo; o texto do formatter comum ganha os acréscimos
do Landing, e elas comparam com as mesmas funções e com trechos que não mudam. Os testes I23-C4 continuam
com as mesmas asserções e passam no caso saudável.
(c) **Hook automático parado** — pela rotina do I23-C4 de conflito (`setup` das duas raízes, `on` e o hook
da `:976`), com `STALL_SEGMENT=1` só no hook (`I25-C47 diagnóstico do I23-C4: hook automático …`):
  - a asserção do hook falha com `actual` = `{automatic: true, code: "delivery_timeout", entries: 1,
    committed: 0, persisted: 0, lost: 1, unrouted: 0}` e `expected` = `DELIVERED_AUTO(1)`, com a evidência
    depois da mensagem original;
  - o pendente `open segmento.tmp (sob o lock, 2ª tomada)`;
  - a raiz lida do home temporário: `raiz 1 (produtores 1): lock presente, de produtor 1 hook claude;
    capturas indisponível [lock_present]`.
(d) **Produtor em processo com o `io` parado** — pela rotina dos produtores em processo do I23-C4 (`open`,
`submit`, `settle`, `report`), com um `io` base que nunca termina a criação do temporário do segmento
(`I25-C47 diagnóstico do I23-C4: produtor em processo …`):
  - `opened` = `{automatic: true, code: "delivery_timeout", entries: 1, committed: 0, persisted: 0, lost: 1,
    unrouted: 0}`, e a asserção dele contra `DELIVERED_AUTO(1)` falha com a evidência;
  - `produtor 1 claude em processo (em processo)` com esse relatório, o pendente `writeExclusive
    segmento.tmp (sob o lock, 2ª tomada)`, `processo: o da prova (produtor em processo)` e o laço do processo
    da prova com amostras;
  - `lock presente, de produtor 1 claude em processo`.
Em (c) e (d) a mensagem não contém a raiz, os homes, IDs de captura, chaves, sessões nativas, IDs de
chamada, o PATH nem canários. Pelas mesmas funções, a saída do T8-C15, dos C46 (a)–(c) e do I23-C10 ganha
os acréscimos do formatter.
Proof: `node --test --test-name-pattern="I23-C4 |I25-C47 " tests/integrations/observe/control.cli.test.mjs`
Proof: `node --test --test-name-pattern="I25-C47 " tests/integrations/traces/evidence.unit.test.mjs` (a raiz da rota automática e o `io` em processo, com dados válidos e ausentes)

**C48** — No workflow, só o `timeout-minutes` do job `verify` muda, para `${{ matrix.os ==
'windows-latest' && 20 || 10 }}`: 20 no `windows-latest`, 10 no `ubuntu-22.04` e no `macos-14`; `changes`
e `ci` continuam com 5; passos, runner, comandos, matriz, concorrência e skips iguais.
Proof: `git diff d0d5a7f -- .github/workflows/governance.yml` (uma linha) e a leitura do YAML com o `yaml` do repositório, com o valor por job e por sistema da matriz (registrada no build)
Proof: `node --test --test-name-pattern="governance-C1 C3" scripts/governance-ci.test.mjs` (passos, matriz e runner do `verify` conferidos pela prova existente)
A CI real do novo HEAD valida a expressão; ela é do orquestrador.
Acréscimo (AC9, 28/10/2026; linha “Exceção ao C48” do Landing): com o job manual autorizado, a
conferência compara com `d0d5a7f` o topo do workflow e os jobs `changes`, `verify` e `ci`. Eles têm
de ser idênticos, fora o `timeout-minutes` do `verify`, e o conjunto de jobs tem de ser exatamente
esses três mais `lock_diagnostics`, provado pelo C49. As asserções da prova de governança sobre os
jobs regulares não mudam.

### S12 — Medição comparativa do lock na CI Windows (task 41–42; AC9)

Escopo da autorização 6467154706; C1–C47 não mudam, e o C48 ganha o acréscimo acima. Linhas
“Medição comparativa do lock na CI Windows” e “Exceção ao C48” do Landing.

**C49** — O job `lock_diagnostics` existe exatamente na forma do Landing:
- nome `Diagnosticar lock Windows (manual)` e `if: github.event_name == 'workflow_dispatch'`;
- `windows-latest`, `timeout-minutes: 10` e `permissions: {contents: read}`;
- os dois passos `uses` com os mesmos hashes do `verify`, `persist-credentials: false`,
  `node-version: 24.13.0` e sem cache;
- os comandos `npm ci --ignore-scripts` e `node scripts/ci-lock-latency.mjs`;
- sem `needs` e sem `continue-on-error`, no job e nos passos.

O conjunto de jobs é exatamente `changes`, `ci`, `lock_diagnostics` e `verify`; `ci.needs` continua
`[changes, verify]`. As asserções existentes sobre gatilhos, permissões, detector, matriz, passos e
runner do `verify`, o agregado `ci`, hashes pinados e a ausência de IA ou publicação continuam
iguais e valem também para o job novo. O alias `test:governance` passa a rodar as duas provas.
Proof: `node --test scripts/governance-ci.test.mjs` (`governance-C1 C3 …` e `governance-C49 …`)
Proof: conferência estrutural do C48 com o acréscimo acima, registrada no build

**C50** — `scripts/ci-lock-latency.mjs`, por provas controladas em `scripts/ci-lock-latency.test.mjs`:
(a) **percentis e faixas exatos**:
  - com `[10, 20, 599.999, 600, 649.999, 650, 700]`: p50 600, p99 700, máximo 700, `>=600` 4 e
    `>=650` 2 (599,999 e 649,999 ficam abaixo das faixas respectivas);
  - com `1…100`: p50 50, p99 99, máximo 100, `>=600` 0 e `>=650` 0 — zero medido, com 100 amostras;
  - sem amostras: `{amostras: 0, indisponivel: "sem amostras"}`, sem nenhum percentil nem contagem.
(b) **caminhos**:
  - `C:\Temp` e `c:\temp\` são o mesmo destino no Windows; `C:\Temp` e `D:\a\_temp` são distintos;
    `/tmp` e `/TMP` são distintos no POSIX;
  - um link ou junção para a mesma pasta resolve para o mesmo destino;
  - `RUNNER_TEMP` ausente, inexistente ou arquivo dá `indisponivel` com o motivo e uma só fase `A`;
  - destinos distintos dão as fases `A1`, `B` e `A2`, nessa ordem, com os destinos padrão, runner e
    padrão.
(c) **E/S**: num produtor com a remoção do lock falhando por EIO, o ciclo sai com `EIO` (em `es`) e
os seguintes com `lock_present` (em `lockPresent`); `tomada` e `liberacao` só contam ciclos sem
erro.
(d) **teto**:
  - produtores de fixture que nunca terminam são encerrados no teto: `encerradaPeloTeto: true`, 0
    concluídos, todos incompletos e métricas `indisponivel`;
  - um produtor que termina 2 de 3 ciclos e para fica com 2 concluídos e 1 incompleto, e as métricas
    têm 2 amostras.
(e) **supervisão só de filhos próprios**: um processo alheio, iniciado pela prova, continua vivo
depois de o supervisor encerrar os seus no teto; os filhos do supervisor fecharam.
(f) **limpeza**: recusa pasta fora do destino, pasta sem o marcador ou com outro nonce, link ou
junção e caminho relativo, sem apagar nada delas; remove a própria.
(g) **protocolo**: linha incompleta ou inválida conta em `linhasInvalidas` e nunca como ciclo.
(h) **fronteira real**: uma fase com os filhos reais do script (3 produtores de 5 ciclos e 3 cargas
de 64 KiB com flush) termina sem teto, com 15 concluídos, 0 incompletos e nenhum erro. Tomada,
liberação e as quatro operações têm 15 amostras e p50 ≤ p99 ≤ máximo; as cargas fizeram ao menos
uma escrita cada.
(i) **relatório e constantes**:
  - o relatório não contém caminho, nonce nem variável de ambiente;
  - o CLI usa 3, 500, 3, 65.536, 120.000 e as faixas 600 e 650.
Nenhum agente real é iniciado.
Proof: `node --test scripts/ci-lock-latency.test.mjs` (testes `C50 …`)
A medição completa (1.500 ciclos por fase, A1/B/A2) é a do job manual no runner, acionado pelo
orquestrador depois de PASS, `ready` e publicação.
Refinamento (verificação 13 em `631e281`, achados 2 e 3 do relatório em `0e0325f`, preservado; linha
“Limpeza e supervisão em toda saída da medição” do Landing), antes do código; continua um só check, e
(a)–(i) não mudam, fora a forma de `limpeza` abaixo:
(j) **limpeza que falha**:
  - com a remoção da pasta própria lançando `EBUSY`, `EPERM` ou `ENOTEMPTY`, ou um erro sem `code`
    (nome `Error`), com o caminho na mensagem, `removeOwnDir` devolve `{ok: false, falha: <o código>}`
    (`"EBUSY"`, `"EPERM"`, `"ENOTEMPTY"`, `"Error"`); a pasta e o marcador continuam, e o resultado
    não tem caminho nem mensagem;
  - pela medição A1/B/A2 (3 produtores de 2 ciclos e 1 carga), com a remoção da pasta de A1 lançando
    `EBUSY` depois dos dados: as três fases saem com 6 ciclos concluídos e `interrompidaPorErro:
    null`; `limpeza` é `{removidas: 2, recusadas: [], falhas: ["EBUSY"]}`; a pasta de A1 continua,
    com o marcador; a do runner fica vazia; o relatório não tem os caminhos nem a mensagem injetada;
  - sem falha, `limpeza` é `{removidas: 3, recusadas: [], falhas: []}`; as recusas de (f) não mudam.
(k) **início parcial**: com um arquivo `produtor-2` já na pasta da fase, a carga e o 1º produtor
(fixtures que nunca terminam) iniciam e o `mkdirSync` do 2º lança `EEXIST`. `runPhase` volta sem
lançar e antes do teto: `timedOut: false`, `interruptedBy: "EEXIST"`, só esses dois filhos (`carga` e
`produtor`), ambos fechados e com o processo já inexistente; o 2º e o 3º produtores não iniciam; um
processo alheio iniciado pela prova continua vivo. A fase: `encerradaPeloTeto: false`,
`interrompidaPorErro: "EEXIST"`, `ciclos {previstos: 6, concluidos: 0, comErro: 0, incompletos: 6}`,
`tomada` `{amostras: 0, indisponivel: "sem amostras"}`.
(l) **erro assíncrono**: com o 2º produtor iniciado por um caminho absoluto inexistente (`ENOENT`
assíncrono) e a carga e os outros produtores como fixtures que nunca terminam, o processo da prova não
cai. `runPhase` volta antes do teto com `timedOut: false` e `interruptedBy: "ENOENT"`; os quatro filhos
registrados (`carga` e três `produtor`) fecharam, os que rodavam já não existem e o alheio continua
vivo. A fase: `encerradaPeloTeto: false`, `interrompidaPorErro: "ENOENT"`, `ciclos {previstos: 6,
concluidos: 0, comErro: 0, incompletos: 6}`.
As provas de (j)–(l) falham no `scripts/ci-lock-latency.mjs` de `3843867` e passam com a correção;
RED e GREEN ficam no build.
Proof: `node --test scripts/ci-lock-latency.test.mjs` (testes `C50 …`)
Refinamento (CI 40702252461 do PR #28, Ubuntu; linha “Fonte do `RUNNER_TEMP` na medição” do
Landing), antes do código. Continua um só check; (a)–(l) não mudam, e os 16 C50 e os 7 de governança
continuam com os mesmos nomes e asserções. Em (m) e (n), o `RUNNER_TEMP` do processo da prova fica
num diretório temporário válido, próprio e distinto do temporário padrão da prova, e volta ao valor
anterior (ou à ausência) no `finally`:
(m) **planejamento sem ambiente implícito**
(`C50 fonte do RUNNER_TEMP: com a variável presente no processo, o planejamento sem valor e a medição
com env {} não a herdam`):
  - `resolveDestinations` com `runnerTemp: undefined`, e sem a chave `runnerTemp`, dá `comparacao:
    "não aplicável: RUNNER_TEMP ausente"`, `destinos.runner` `{indisponivel: "RUNNER_TEMP ausente"}` e
    uma só fase, `A`, no destino padrão;
  - `measure({env: {}})` dá a mesma comparação, o mesmo `destinos.runner` e uma só fase `A`, com os
    ciclos concluídos, e não cria nada no diretório do `RUNNER_TEMP` do processo.
(n) **leitura do CLI** (`C50 fonte do RUNNER_TEMP pelo padrão do CLI: sem env, a medição lê o
RUNNER_TEMP do processo e, distinto, roda A1/B/A2 nele`): `measure` sem `env`, o padrão que o CLI usa,
dá `A1/B/A2`, com a fase `B` no destino `runner`, `limpeza` `{removidas: 3, recusadas: [], falhas:
[]}` e o diretório vazio depois; o relatório não tem o caminho.
As provas de (m) falham no `scripts/ci-lock-latency.mjs` de `41dcf5d` (o mesmo blob de `6a242a2`) e
passam com a correção. (n) passa nos dois: é o controle de que a leitura do CLI continua.
Proof: `node --test scripts/governance-ci.test.mjs scripts/ci-lock-latency.test.mjs`, uma invocação
por ambiente A/B/C, com o `RUNNER_TEMP` presente e válido no ambiente de cada uma

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

Rodada necessária seguinte: **Verifier11**, registrada em https://github.com/oldboydev/skill-me/issues/25#issuecomment-6442514838 usando a autorização humana “Pode fazer quantas precisar”, após o FAIL10 (`788d160`) e a correção/provas concretas (`619c8e0`, registro `9e289f3`). As dez verificações e cinco revisões formais anteriores permanecem no histórico. Formal6 continua disponível; configuração, limites globais, core e outras issues não mudam. Escopo e C1–C46 preservados; contexto atual `context-ci28-verifier11-approved.json`. PASS/ready e CI verde continuam exigidos para a entrega e o merge já autorizado.

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

Ampliação autorizada: diagnóstico do T8-C15 (registros acima preservados):

- O que o proprietário decidiu: “Autorizar ajuste pontual e 10ª verificação”
  ([comentário 6440482031](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6440482031)),
  respondendo à proposta do comentário 6435260406 e de `.checks/issue-25-agent-launch.t8c15-handoff.md`
  (`a718865`), só para a #25 (contexto em
  `.checks/code-review/issue-25/context-ci28-verifier10-approved.json`, 18 comentários e 7 ACs).
  Inclui o diagnóstico pontual do T8-C15 (AC7, task 38, S10, C46) e a correção mínima de defeito
  confirmado dentro dos contratos atuais; sem nova tentativa de E/S, aceitação de perdas, mudança de
  prazos ou tolerâncias, serialização dos produtores ou redução do teto 8. A 9ª verificação continua
  como FAIL em `4e66de2`. Uma 10ª verificação independente, do orquestrador, depois das provas do
  autor; revisão formal com teto 6, 5 consumidas e a 6ª autorizada e não executada. Merge do PR #28
  só depois de PASS, `ready` e toda a CI verde; nenhuma publicação.
- Onde a fronteira caiu: o registro (task 38, Landing, S10/C46, este Handoff e o handoff do T8-C15)
  vem antes do código; provas, comandos e resultados ficam em `.checks/issue-25-agent-launch.build.md`.

Diagnóstico do T8-C15 e primeira criação concorrente do store (registros acima preservados):

- Onde a fronteira caiu agora: C46 em `710076e` (só a prova antiga); a execução completa instrumentada
  nesse HEAD saiu com 1 só pelo I25-C32 (B com `store_invalid` na primeira criação do store), com o
  T8-C15 e os C46 verdes. Causa reproduzida e registrada antes do código em `8e8893b` (linha “Primeira
  criação concorrente do store” e acréscimo em C32); correção em `privacy/store.mjs` e provas em
  `f734441`. Alvo completo da #25 mais concorrência (120 testes) verde nos três ambientes e `npm test`
  com exit 0 em `f734441`, em `.checks/issue-25-agent-launch.build.md`.
- O que o proprietário decidiu: a autorização 6440482031 (diagnóstico do T8-C15 e 10ª verificação). O
  orquestrador pediu corrigir no escopo original da #25 a causa demonstrada do C32, sem retry novo,
  prazo maior, teto menor, serialização ou aceitação de store inválido. Verifier 10 e revisão formal 6
  continuam com o orquestrador; nenhum foi executado aqui.
- O que foi abandonado: inicializar o store antes da prova ou abrir B depois de A; repetir
  `store_invalid` na paciência; tomar o lock antes de conferir o marcador; aceitar marcador vazio ou
  parcial; criar a pasta do store por pasta temporária + `rename`.

Diagnóstico de C32 com captura em construção (registros acima preservados):

- Onde a fronteira caiu agora: o Verifier 10 terminou FAIL em `df259ed` (relatório em `788d160`), só
  no ambiente C e só no diagnóstico de C32, com o gate D não iniciado. Defeito do apoio
  `withOverlappingRuns`, registrado antes do código em `3328317` (linha “Diagnóstico de C32 com
  captura em construção” e acréscimo em C32) e corrigido com a prova nova em `619c8e0`; produto sem
  mudança desde `f734441`. Alvo completo com concorrência (122 testes) verde nos três ambientes e
  `npm test` com exit 0 em `619c8e0`, em `.checks/issue-25-agent-launch.build.md`.
- O que o proprietário decidiu: “Pode fazer quantas precisar”, com o ajuste do T8-C15 e o Verifier 10
  já aprovados; o orquestrador registra as próximas rodadas antes de executá-las. Revisão formal 6
  disponível e não consumida; nenhum teto mudou aqui. Nenhum Verifier, revisão, push ou merge foi
  executado aqui.
- O que foi abandonado: tornar `launchCapturesOnDisk` tolerante; liberar as barreiras só no fim do
  teste; engolir a falha da coleta; esperar a captura ficar legível; `sleep` pelo interleaving.

CI 40514323240 no Windows (registros acima preservados):

- Onde a fronteira caiu agora: só diagnóstico, sem código. O I23-C10 e o primeiro controle do C46
  falharam por `delivery_timeout`; no C46, os dois produtores pararam na criação do `.lock` da
  abertura, demonstrado pela sequência das operações e por um controle local. Causa da parada,
  operação do I23-C10 e taxa não conhecidas; o passo de integrações terminou junto do limite de 10
  min do job. Nenhum check, critério, prazo, workflow ou produto mudou. Detalhes em
  `.checks/issue-25-agent-launch.ci40514323240-handoff.md` e no build.
- O que o proprietário precisa decidir: como tratar paradas além do prazo nas provas com processos
  reais e o limite de 10 min do job Windows (propostas no handoff). Formal 6 `ready` e Verifier 11
  PASS continuam preservados; um Verifier 12 ou uma formal 7 só depois de código, se houver.
- O que foi abandonado: atribuir a parada a antivírus, relógio, disco ou lock sem prova; repetir
  a CI ou o gate inalterados; afrouxar a precondição do C46.

Diagnóstico do I23-C10 e orçamento do job Windows, aprovados (registros acima preservados):

- O que o proprietário decidiu: “Autorizar diagnóstico e orçamento Windows (recomendado)”
  ([comentário 6460177952](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6460177952)),
  exatamente a proposta `.checks/issue-25-agent-launch.ci40514323240-proposal.md` (`df2441f`), com o
  AC8 na issue antes do código. São 11 verificações e 6 revisões preservadas (Verifier 11 PASS,
  formal 6 `ready`); a CI 40514323240 continua registrada como vermelha. As próximas rodadas seguem
  “Pode fazer quantas precisar”, registradas uma a uma pelo orquestrador; depois de PASS e `ready`,
  publicar no PR #28, rodar a CI do novo HEAD e fazer o merge só com todos os checks verdes.
- Onde a fronteira caiu: o registro (task 39–40, Landing, S11/C47–C48, este Handoff e a proposta
  aprovada) vem antes do código; provas, comandos e resultados ficam em
  `.checks/issue-25-agent-launch.build.md`.
- Onde a fronteira caiu agora: registro em `25f5948`; código em `52b22cd`, só provas, apoios de prova
  e o `timeout-minutes` do job `verify`; produto sem mudança desde `f734441`. Alvo de 128 testes
  (122/0/6) nos três ambientes e `npm test` com exit 0 em `52b22cd`. A causa dos `delivery_timeout`
  continua desconhecida.
- O que foi abandonado: copiar `failuresWithPhase`/`inspected` para o arquivo do I23; reaproveitar a
  fase “antes/depois do commit” no caminho automático; listar o `lstat ENOENT` como falha; calcular a
  evidência em toda etapa; teste que só repete a expressão do workflow.

CI 40636157287 no Windows (registros acima preservados):

- Onde a fronteira caiu agora: só diagnóstico, sem código. O I23-C4 e o T8-C11, provas antigas sem
  diff na feature, falharam com `lock_present` num leitor logo depois dos produtores. O lock só podia
  ser de um produtor, por vias que o contrato admite. As operações desses produtores são idênticas na
  base e no HEAD, e as vias reproduzem as mensagens exatas da CI. A causa e a via de cada falha não são
  conhecidas. Nenhum check, critério, prazo, workflow ou produto mudou. Detalhes em
  `.checks/issue-25-agent-launch.ci40636157287-handoff.md` e no build.
- O que o proprietário precisa decidir: uma das opções A–D do handoff (medir antes de mudar o runner,
  mitigação no runner Windows, contrato da liberação do lock ou política de merge). Verifier 12 PASS e
  formal 7 `ready` ficam preservados; Verifier 13 ou formal 8 só depois de código, se houver.
- O que foi abandonado: rodar a CI ou o gate de novo até ficar verde; instrumentar mais provas uma a
  uma; atribuir a parada a antivírus, relógio, disco ou hardware sem prova.

Medição comparativa do lock na CI Windows, aprovada (registros acima preservados):

- O que o proprietário decidiu: “Pode fazer a medição comparativa. Mantém os testes e prazos e segue
  até a CI ficar toda verde para fazer o merge do PR #28.”
  ([comentário 6467154706](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706)),
  exatamente a proposta `.checks/issue-25-agent-launch.ci-runner-measure-proposal.md` (`b2638db`,
  marcada aprovada pelo orquestrador), com o AC9 na issue antes do código. Ficam preservados o
  Verifier 12 PASS, a formal 7 `ready` e as CIs 40514323240 e 40636157287, vermelhas. As próximas
  rodadas seguem “Pode fazer quantas precisar”, registradas uma a uma pelo orquestrador. A medição
  completa no runner é acionada por ele depois de PASS, `ready` e publicação; o merge exige toda a CI
  regular verde.
- Onde a fronteira caiu: o registro (task 41–42 com a exceção datada ao critério 40, Landing com o job,
  o script e a exceção ao C48, S12 com C49–C50, este Handoff e a proposta aprovada) vem antes do
  código; provas, comandos e resultados ficam em `.checks/issue-25-agent-launch.build.md`.
- Onde a fronteira caiu agora: registro em `0362aec` e ajuste do Landing antes das provas em
  `39278dd`; código em `3843867`, só no workflow (job manual), em `scripts/` e no alias
  `test:governance`. Produto sem mudança desde `f734441`. Alvo de 147 testes (141/0/6) nos três
  ambientes e `npm test` com exit 0 em `3843867`. A medição no runner ainda não foi feita, e a causa
  continua desconhecida.
- O que foi abandonado: workflow manual novo; copiar o lock ou importar apoios de prova; mudar
  `TEMP`/`TMP`; um só produtor ou um lock compartilhado; percentil interpolado; zeros para falta de
  dados; encerrar processos por nome ou pid; opção de CLI para as provas; cache no job manual.

Achados 2 e 3 da verificação 13 na ferramenta de medição (registros acima preservados):

- O que se decidiu: a verificação 13 deu PASS 50/50 em `631e281` (relatório em `0e0325f`, não
  alterado aqui), com dois achados concretos na ferramenta: a limpeza que lança perde a medição, e um
  erro no início da fase ou o `'error'` assíncrono de um filho escapam do encerramento dos filhos. O
  orquestrador pediu corrigi-los antes de usar a ferramenta na CI, como correção necessária da
  ferramenta aprovada (autorização 6467154706), sem escopo novo. Fica só em
  `scripts/ci-lock-latency.mjs`, nas provas dele e nos registros. O workflow, os jobs, `src/`, as
  provas funcionais, os prazos, as quantidades, a carga, o core e a configuração não mudam.
- Onde a fronteira caiu: o registro (linha “Limpeza e supervisão em toda saída da medição” do
  Landing, refinamento do C50 com (j)–(l) e do critério 42 da task, este Handoff) vem antes do código.
  Provas, comandos e resultados ficam em `.checks/issue-25-agent-launch.build.md`.
- Onde a fronteira caiu agora: registro em `7198fef`; código em `6a242a2`, só em
  `scripts/ci-lock-latency.mjs` e na prova dele. RED no script de `3843867` com 5 de 16 falhas: as 4
  provas novas, pelo defeito, e o relatório, só pela forma nova de `limpeza`. GREEN com 16/16 e as 6
  mutações detectadas. O alvo de 151 testes deu 145/0/6 nos três ambientes, e o `npm test` saiu com
  exit 0 em `6a242a2` (1.023 testes, 1.003 pass, 0 fail, 20 skip). A medição no runner ainda não foi
  feita, e a causa continua desconhecida.
- O que foi abandonado: nova tentativa ou `force` na remoção; contar a falha como recusa; encerrar a
  medição na falha da limpeza; seguir a fase depois do erro de um filho; relançar o erro de
  `runPhase`; ouvinte global de `uncaughtException`; erro na saída de cada processo; opção de prova
  no script para injetar a falha (a prova troca o `rmSync` de `node:fs`).

CI 40702252461 do PR #28: fonte do `RUNNER_TEMP` na medição (registros acima preservados):

- O que se decidiu:
  - **Histórico do orquestrador, preservado**: a formal 8 `blocked` (`bedda5c`), o R15 documental
    PASS com as provas da R14 e a formal 9 `ready` sem achado em `41dcf5d`, publicado com push
    autorizado. Nada disso foi alterado aqui.
  - **A falha**: na CI 40702252461, o Ubuntu falhou de forma determinística no
    `test:governance` (23 testes, 21 pass, 2 fail: `C50 caminhos` e `C50 relatório`), e o
    `fail-fast` cancelou Windows e macOS.
  - **A medição real**: o job manual 40702384050, sobre `41dcf5d`, terminou com sucesso. São dados
    do orquestrador, em `.checks/code-review/issue-25/measurement40702384050.json`; não foram
    executados aqui.
  - **O pedido**: corrigir a fronteira de ambiente das provas e do planejamento, como correção
    necessária da ferramenta aprovada (autorização 6467154706), sem enfraquecer asserções nem mudar
    o workflow.
- Onde a fronteira caiu: o registro (linha “Fonte do `RUNNER_TEMP` na medição” do Landing,
  refinamento do C50 com (m)–(n) e do critério 42 da task, este Handoff) vem antes do código. Provas,
  comandos e resultados ficam em `.checks/issue-25-agent-launch.build.md` e no handoff pontual
  `.checks/issue-25-agent-launch.ci40702252461-handoff.md`.
- Onde a fronteira caiu agora:
  - **Commits**: registro em `efa56ea`; código em `f133c55`, só em `scripts/ci-lock-latency.mjs`
    (`resolveDestinations` sem padrão do `process.env`) e na prova dele.
  - **RED** no script de `41dcf5d`: sem `RUNNER_TEMP` no ambiente, 24/25, só (m) falha; com ele,
    22/25, as duas da CI e (m) falham.
  - **GREEN e mutações**: 25/25 sem e com `RUNNER_TEMP`; as 3 mutações foram detectadas.
  - **A/B/C**: os dois arquivos do `test:governance` deram 25/25/0/0 em cada ambiente, com
    `RUNNER_TEMP` presente e válido.
  - **Carregado da R14** (`13bb1d4`): fora dos dois arquivos, os blobs não mudaram. C1–C49 ficam com
    as provas dela, A/B/C 151/145/0/6 e D 1.023/1.003/0/20 com os 12 nativos, sem reexecução e sem D
    novo.
  - A medição no runner sobre o código novo e a CI verde continuam com o orquestrador, e a causa
    histórica continua desconhecida.
- O que foi abandonado:
  - limpar o `RUNNER_TEMP` no workflow, no job ou nas provas;
  - pular ou relaxar as asserções;
  - ler o `process.env` só quando falta a chave;
  - tirar o padrão `process.env` de `measure`;
  - parâmetro ou opção de prova novos.

CI 40709943742 e execução manual 40710014746 no Windows: diagnóstico das entregas T8 (registros acima preservados):

- **O que se decidiu**:
  - **Histórico do orquestrador, preservado**: o R16 PASS 50/50 e a formal 10 `ready` (`76705f9`).
  - **RUNNER_TEMP**: a falha do `RUNNER_TEMP` ficou resolvida na CI real (governança 25/25 nos três
    sistemas).
  - **O que sobrou**: no Windows restaram T8-C3, T8-C8, T8-C14 e T8-C18, provas antigas sem diff, com
    `delivery_timeout` ou `lock_present`.
  - **O pedido**: diagnosticar o caminho real dessas entregas nos contratos atuais e corrigir só um
    defeito demonstrado, sem perguntar de novo; nada de repetir a CI inalterada.
- **Onde a fronteira caiu**: o registro vem antes do código: a linha “Diagnóstico das entregas de um
  produtor nas provas T8” do Landing, o refinamento do C46 com (d)–(g), o refinamento do critério 38
  da task e este Handoff.
- **Gate decidido antes de executar**:
  - **RED**: as provas antigas numa cópia descartável, com a injeção, para a mensagem de antes.
  - **GREEN**: os três arquivos T8 tocados.
  - **Mutações** do diagnóstico.
  - **A/B/C**: uma invocação sem filtro por ambiente dos 8 arquivos que carregam a pré-carga ou os
    apoios mudados, com concorrência 4: `launch/command.cli`, `launch/end.e2e`, `observe/agents.e2e`,
    `traces/concurrency.cli`, `traces/follow.cli`, `traces/live-capture.cli`, `traces/query.cli` e
    `traces/replay.unit`.
  - **D**: uma única execução do `npm test` completo no Windows, Node 24.22.1, teto 8 e 12 nativos do
    Hermes, com orçamento de 2 h definido na ferramenta antes do início, porque a pré-carga e
    `helpers/traces.mjs` são apoios comuns (27 arquivos importam o apoio).
  - Nenhum arquivo rastreado muda durante D, e nenhum gate é repetido para obter verde.
- **Onde a fronteira caiu agora**:
  - **Commits**: registro em `4d3b1d9`; código em `51679df`, só em provas e apoios de prova
    (`traces-probe.mjs`, `helpers/traces.mjs` e as provas T8-C3/C8/C14/C18 com quatro controles
    I25-C46 novos). Produto sem mudança.
  - **RED**: as provas antigas dão só as mensagens das CIs.
  - **GREEN e mutações**: os três arquivos T8 deram 18/17/0/1, e as 6 mutações foram detectadas.
  - **A/B/C**: o alvo de 8 arquivos deu 80/74/0/6 em A e B e 80/76/0/4 em C.
  - **D**: o `npm test` completo saiu com exit 0 em `51679df` (1.029/1.009/0/20, com os 12 nativos).
  - **Causa**: continua desconhecida; não há defeito demonstrado, o que não é o mesmo que não haver
    defeito. A próxima CI traz evidências, não um diagnóstico: a operação em curso, a tomada, o laço
    e a coincidência entre o `pid` do lock e o de um produtor. Detalhes no build e em
    `.checks/issue-25-agent-launch.ci40709943742-handoff.md`.
- **O que foi abandonado**:
  - aumentar prazos, repetir, reduzir paralelismo ou pular no Windows;
  - atribuir a antivírus, disco, relógio ou host;
  - instrumentar o produto;
  - mover a evidência do C46/C47;
  - calcular a evidência sempre;
  - ler o nonce do lock ou mostrar o `pid`.

Achado F1 da verificação 17 (registros acima preservados):

- **O que se decidiu**: a verificação 17 deu FAIL em `45b512b` (relatório em `1ef4c72`, não alterado
  aqui), com 49 de 50 checks provados como escritos e um só achado, F1. Os gates frescos da R17
  passaram:
  - A e B: 80 testes, 74 pass, 0 fail, 6 skip;
  - C: 80/76/0/4;
  - D: 1.029/1.009/0/20, com os 12 nativos.
- **O achado**: o item (g) do C46 dava `delivery_timeout` 1/0/0/1 para o ingest Hermes da rotina do
  T8-C18. A prova versionada afirma 2/0/0/2 (`replay.unit.test.mjs:156`, `lost("delivery_timeout",
  2)`), que é o valor certo da rotina, e o controle passou em A, B, C e D.
- **A causa do erro**: o literal foi escrito errado no registro antes do código (`4d3b1d9`). Não é
  mudança de contrato nem rebaixamento.
- **O que mudou**: só o literal do item (g), de 1/0/0/1 para 2/0/0/2, com o motivo (um registro válido
  e a linha malformada `{quebrado`, que também conta como entrada). Entrada, payload, prazos,
  asserções, código, provas, nomes de teste e comentários não mudaram, e nenhum teste foi executado.
- **O que fica igual**: os outros 1/0/0/1 desta página estão certos e ficaram como estavam. São o
  `post_tool_skill` com `lock_present` do mesmo item, que a prova afirma com `lost("lock_present",
  1)`, o T8-C8 da CI, com um registro, e o I23-C10.
- **Pendentes, com o orquestrador**: a próxima verificação e a revisão formal. Nada aqui afirma PASS
  nem `ready`.

CI 40728221657 e execução manual 40728249484 no Windows: evidência comum dos produtores (registros acima
preservados):

- **O que se decidiu**:
  - **Histórico do orquestrador, preservado**: o FAIL 17 (literal 1 vs 2, `1ef4c72`), a correção do
    literal do C46 (g) para 2/0/0/2 com as duas entradas originais (`d8da3c0`), o PASS 18 50/50
    (`93bd1e9`, carregando o código de `51679df`) e a formal 11 `ready`. Nada disso muda aqui.
  - **A falha**: I23-C4 no PR e T8-C12, T8-C13 e T8-C2 na manual, todos de produtores sem a evidência de
    `51679df` (linha “Evidência comum dos produtores e formatter legado” do Landing). Os quatro
    controles de `51679df` passaram nas duas.
  - **O pedido**: parar de instrumentar o último grupo de provas e cobrir a fronteira comum de
    produtores, relatórios e formatter; corrigir o produto só com defeito demonstrado por RED/GREEN.
  - **Autor**: sessão nova, sem herdar a anterior; o Verifier e a formal são do orquestrador.
- **Leitura e fronteira** (antes do código): lote único, ~115k tokens de leitura, abaixo do teto de
  150k. Os arquivos tocados somam ~278 KB, ~70k (`wc -c` ÷ 4): apoios 37 KB, as sete consumidoras que
  adotam o registro 229 KB e a prova nova ~12 KB. Task, checklist, build e logs lidos por seção somam
  ~45k. Superfície única, `tests/integrations/` (apoios e consumidoras); `src/` não muda.
- **Gate decidido antes de executar**:
  - **RED**: as provas antigas (`93bd1e9`) numa cópia descartável, com só a injeção no produtor
    (T8-C2, T8-C12, T8-C13, o hook CLI do I23-C4 e o produtor em processo do I23-C4, pelo `io`), para as
    mensagens de antes.
  - **GREEN**: os arquivos tocados.
  - **Mutações** do formatter, do registro e do `io` em processo.
  - **A/B/C**: uma invocação sem filtro por ambiente das 38 consumidoras dos apoios mudados (as 37 do
    catálogo e a prova nova; antes eram 8), `--test-concurrency=4`, com `RUNNER_TEMP` presente e válido:
    - A: Windows, Node 24.22.1, checkout principal;
    - B: clone git novo, Node 24.13.0 oficial, npm 11.6.2, `npm_execpath` ausente, `core.autocrlf=true`
      só no clone;
    - C: WSL Ubuntu uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, `env -i`, HOME temporário,
      PATH sem `/usr/bin` e sem agentes.
  - **D**: uma única execução do `npm test` completo no Windows (Node 24.22.1, teto 8, os 12 nativos do
    Hermes), com orçamento de 2 h na ferramenta antes do início, sobre o último código commitado; nada
    rastreado muda durante D.
  - Nenhum gate é repetido para obter verde. Uma falha fica registrada, e só um defeito exato, dentro
    dos contratos, é corrigido.
- **Onde a fronteira caiu agora**:
  - **Commits**: registro em `48b191a`; código em `fa2c8eb` (formatter comum, registro por teste em
    `helpers/producer-runs.mjs`, `io` medido em processo, adoção nos sete arquivos, controles C46 (h)–(k) e
    C47 (c)–(d), e a linha “Adoção pelos hooks do arquivo…” do Landing, descoberta no build) e `60bbda8`
    (reforço do controle (h)). Só provas e apoios de prova; `src/` sem mudança desde `f734441`.
  - **RED** (provas de `93bd1e9` com a mesma injeção): só as mensagens das CIs, sem pendente, processo,
    laço nem evidência dos produtores.
  - **Mutações**: as 10 foram detectadas, só por controles I25; a do formatter, depois do reforço, também
    pelo (h).
  - **A**: 333 testes, 321 pass, 0 fail, 12 skip. **B**: 333, 314 pass, **7 fail**, 12 skip. **C**: 333,
    312 pass, **1 fail**, 20 skip. Os 20 I25-C46/C47 passaram nos três.
  - **As falhas de B e C não são desta entrega e ficam registradas, sem correção nem repetição**:
    - as 7 do B (nativas do Hermes e I4-C35) vêm do `fs.cpSync`/`rmSync` do Node 24.13.0 no Windows com
      “ação” no caminho, que não copia nem remove e não dá erro; a mesma falha ocorre em `93bd1e9`;
    - a do C (I4-C36) mediu 209 ms por `Date.now()` onde o runner mediu ≥ 2.358 ms monotônicos, o que é
      compatível com um recuo do relógio de parede do WSL, não demonstrado.
  - **D**: o `npm test` completo saiu com exit 0 em `60bbda8` (1.040 testes, 1.020 pass, 0 fail, 20 skip,
    com os nativos do Hermes).
  - **Causa da CI 93**: continua desconhecida; nenhum defeito do produto demonstrado. A próxima falha de um
    produtor dos sete arquivos traz a evidência de todos os produtores do teste e das raízes. O mapa local
    do `session_end` (a 73ª operação é o 1º flush, `sync segmento.tmp`) é compatível com as 72 concluídas da
    CI, mas não a demonstra. Detalhes no build e em `.checks/issue-25-agent-launch.ci40728221657-handoff.md`.
- **O que foi abandonado**:
  - envolver o `test` (trocava o local da falha pelo do apoio);
  - importar o apoio pesado em `installed-hooks.mjs`/`wrapper.mjs` (+22 ms na fixture do launcher);
  - `t.diagnostic` (não sai no resumo de falhas);
  - instrumentar mais asserções isoladas;
  - passar o registro em cada chamada;
  - adotar nas 30 consumidoras restantes;
  - contar o `lstat ENOENT` da rota automática como falha;
  - calcular o prazo da entrega a partir da pré-carga;
  - corrigir aqui o `cpSync` do 24.13.0 ou a medida por `Date.now()` do I4-C36 (provas da #4, fora do
    escopo).
- **Pendentes, com o orquestrador**: o Verifier 19, a formal 12, a publicação e a próxima CI. Nada aqui
  afirma PASS, `ready`, CI verde nem causa corrigida.

Gates de `60bbda8`: correção da harness nos gates B e C (registros acima preservados):

- **O que se decidiu**:
  - **Resultados preservados**: A 333/321/0/12, B 333/314/7/12 e C 333/312/1/20 continuam os de
    `60bbda8`; B e C não estão aprovados. A primeira tentativa de C, com o caminho convertido pelo MSYS,
    não executou nenhum teste e não é prova.
  - **O pedido do coordenador**: corrigir só a preparação das fixtures Hermes (B) e a medição de duração
    do apoio (C), demonstradas, dentro dos contratos existentes.
  - **B**: causa demonstrada no `cpSync`/`rmSync` do Node 24.13.0 do Windows com “ação” no caminho (linha
    “Preparação da fixture do plugin Hermes no Node 24.13.0” do Landing).
  - **C**: causa demonstrada pela comparação das mesmas chamadas nos dois relógios — o civil recua ~1,8 s
    a cada ~30 s no WSL (linha “Duração monotônica no apoio dos hooks instalados” do Landing).
- **Retificações do registro anterior** (o texto antigo fica no build):
  - “o runner deu 2.358 ms ao teste até ali, o que é incompatível com 209 ms reais”: a duração do teste
    soma as seis chamadas e não era, sozinha, conclusiva. A demonstração é a comparação das mesmas
    chamadas, agora registrada.
  - **Limpeza anterior**: as 1.257 pastas do temporário do Windows e as 107 do `/tmp` do WSL foram
    escolhidas por prefixo, tipo, ausência na linha de base (Windows) ou dono (WSL), e janela de mtime.
    Isso não é prova de proveniência, e não houve auditoria de propriedade; os nomes removidos no Windows
    não ficaram registrados. Não há evidência concreta de pasta alheia atingida, o que não equivale a
    afirmar que nenhuma foi.
- **Leitura e fronteira** (antes do código): ~25k tokens; apoios `hermes-runtime.mjs` (5,6 KB) e
  `installed-hooks.mjs` (5 KB), as provas `hermes-plugin.native` (consumidora), `skill-tree-hash.cli`,
  `failure-matrix.cli` e `hermes-harness.unit`. Superfície única, `tests/integrations/`; `src/` não muda.
- **Gates** (a lista exata é recalculada depois do último código e registrada antes de rodar):
  - **RED/GREEN** dos dois controles novos, com o código de `60bbda8` numa cópia descartável e o novo;
  - **A/B/C**: as consumidoras dos apoios mudados (as 38 de antes e as novas afetadas), uma invocação sem
    filtro por ambiente, concorrência 4, `RUNNER_TEMP` presente e válido, e o temporário dos testes
    isolado por execução numa pasta criada por ela:
    - A e B: `TEMP`/`TMP` só do processo do gate;
    - C: `TMPDIR` dentro do scratch do `env -i`.

    Os scratches continuam com “ação”, e a carga não muda. A limpeza remove só essa pasta, conferida por
    caminho absoluto e tipo.
  - **D**: um único `npm test` completo no Windows (24.22.1, teto 8, 12 nativos), com o mesmo isolamento
    do temporário, orçamento de 2 h na ferramenta antes do início, código commitado e nada rastreado
    editado durante ele.
  - Logs novos em `builder-ci93-shared/final2/`, sem sobrescrever os de `60bbda8`. Nenhum gate repetido
    sem mudança para obter verde.
- **Gates definidos depois do último código (`d317202`) e antes de rodar**:
  - **Lista**: 39 arquivos de prova (`final2/gate-files.txt`, sha256 `f8706add…7986`) — as 38 de antes e
    `hermes-harness.unit.test.mjs`, que passa a importar um apoio mudado (`hermes-runtime.mjs`);
    `failure-matrix.cli`, `hermes-plugin.native` e `skill-tree-hash.cli` já estavam.
  - **A**: o checkout principal, Node 24.22.1, `npm_execpath` ausente.
  - **B**: um clone git novo, `core.autocrlf=true` só no clone, Node 24.13.0 oficial, npm 11.6.2,
    `npm_execpath` ausente.
  - **C**: WSL uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, `env -i`, `HOME`, `RUNNER_TEMP` e
    `TMPDIR` dentro do scratch, PATH sem `/usr/bin` e sem agentes.
  - **Comum a A, B e C**: concorrência 4, uma invocação sem filtro, `RUNNER_TEMP` presente e válido, e o
    temporário isolado numa pasta criada pela execução:
    - A e B: `sm-gate-<rótulo>-…` no temporário do sistema, só no `TEMP`/`TMP` do processo do gate;
    - C: o `TMPDIR` dentro do scratch.

    A limpeza remove só essa pasta, conferida pelo caminho exato e pelo tipo.
  - **D**: um único `npm test` completo, Windows 24.22.1, teto 8, 12 nativos, com o mesmo isolamento,
    orçamento de 2 h na ferramenta e nada rastreado editado durante ele.
  - **Comparação**: os nomes e os motivos dos skips de cada ambiente.
- **Resultado em `c0d61d7`, preservado**:
  - **A**: 343 testes, 331 pass, 0 fail, 12 skip.
  - **B**: 343 testes, 330 pass, **1 fail** (T8-C4 `com hook do filho`, `lock_present`), 12 skip.
  - **C e D não rodaram nesse código**: o B mostrou uma lacuna da evidência comum (só 1 das 3 linhas da
    pré-carga do produtor; o lock ilegível sem tamanho), que é corrigida antes dos gates finais.
  - A causa do T8-C4 continua desconhecida (classe histórica do lock deixado), e a correção da evidência não
    a resolve.
  - Os gates finais rodam no código novo, com a lista recalculada e a mesma forma.
- **Gates finais definidos depois do último código (`909b591`) e antes de rodar**:
  - **Lista**: recalculada sobre `909b591`, os mesmos 39 arquivos, com o mesmo sha256 (`f8706add…7986`).
  - **Forma**: a mesma de A, B, C e D acima, com o temporário isolado por execução.
  - **Logs**: em `builder-ci93-shared/final2/g909/`, sem sobrescrever os de `c0d61d7`.
  - **RED**: as três correções têm RED com o código anterior e o controle novo:
    - C40, com o `cpSync`/`rmSync` no 24.13.0;
    - (l), com o `Date.now()`;
    - (m)–(n), com os apoios de `d317202`.
- **Onde a fronteira caiu agora**:
  - **Commits**:
    - registros em `0eaae31`, `c0d61d7`, `2b3a114` e `cd4afc2`;
    - código em `d317202` (fixture Hermes por `cp`/`rm` de `node:fs/promises`; `collect` por
      `performance.now()`; controles C40 e (l)) e `909b591` (processos da árvore do produtor e lock
      ilegível na evidência; controles (m)–(n)).

    Só provas e apoios de prova; `src/` sem mudança desde `f734441`.
  - **RED**:
    - C40, no 24.13.0: `ENOENT`, o destino ausente. A cópia foi parar num irmão `aÃ§Ã£o`, com o mesmo
      sufixo; removido com prova;
    - (l): `claude timeout: 378 ms`;
    - (m) e (n): falham com os apoios de `d317202`.
  - **Comparação dos relógios no WSL**: 28 de 349 chamadas com `elapsedMs` civil de 53 a 1.499 ms contra
    ~2.060 ms monotônicos.
  - **Gates finais em `cd4afc2`** (temporário isolado):
    - A: 345 testes, 333 pass, 0 fail, 12 skip;
    - B: 345 testes, 332 pass, **1 fail**, 12 skip;
    - C: 345 testes, 325 pass, 0 fail, 20 skip;
    - D: o `npm test` completo saiu com exit 0, 1.044/1.024/0/20.

    As 11 nativas do Hermes e o I4-C35 passaram no B, e o I4-C36 passou no C.
  - **A falha do B final, preservada**: T8-C16 (`4 !== 3` criações do lock).
    - **Reprodução**: 13 em 400 rodadas no 24.13.0 e 15 em 400 no 24.22.1. O timer do prazo de
      `untilDeadline` dispara até ~1 ms antes do `performance.now()` alcançar o prazo, e o laço inicia
      mais uma tentativa, que é abandonada e não grava.
    - **Origem**: pré-existente na main (`fd07b89`, anterior à base); o contrato se mantém.
    - Não foi corrigido nem repetido; fica com o coordenador.
  - **Ciclo de `c0d61d7`, preservado**: A 343/331/0/12 e B 343/330/1/12 (T8-C4). Desse B veio a correção
    da evidência; C e D não rodaram nesse código.
  - **Temporário**: os gates finais e as sondas não deixaram entradas no temporário do sistema. Ficam,
    sem prova de proveniência, cinco pastas da `hermes-harness.unit` de um run diagnóstico meu com o
    24.13.0, listadas no build.
  - **Causa histórica dos `delivery_timeout`/`lock_present` no Windows**: continua desconhecida.
- **O que foi abandonado**:
  - trocar todos os `cpSync`/`rmSync` das provas;
  - `force` na remoção;
  - atualizar o Node;
  - tirar “ação”;
  - afrouxar a faixa do I4-C36;
  - mexer no relógio;
  - patch global do `Date`;
  - mostrar só a linha da saída do produtor;
  - ler o conteúdo do lock;
  - corrigir aqui o T8-C16 (produto ou asserção, fora destes contratos);
  - repetir gates para obter verde.
- **Pendentes, com o coordenador**: o Verifier 19, a formal 12, a publicação, a CI nova, o T8-C16 e as
  cinco pastas não atribuídas. Nada aqui afirma PASS, `ready` nem CI verde.

Abandono terminal no prazo da entrega — nova sessão de autor (registros acima preservados):

- **O que se decidiu** (coordenador, 28/10/2026; linha “Abandono terminal no prazo da entrega” do Landing):
  - incluir só os defeitos concretos de prazo/abandono usados pela entrega da #25; não é manutenção geral
    da #8;
  - a regra já está decidida: a tentativa abandonada não é repetida; o lock obtido depois do prazo não
    autoriza gravar; só a recusa real/concluída do lock é repetível;
  - o defeito 2 é candidato: só é corrigido se a prova discriminante o reproduzir; senão, a prova fica
    registrada e o código não muda por hipótese.
- **Origem, preservada e conferida**: o autor anterior apontou `fd07b89` na `main`. Pelo histórico de
  `untilDeadline`, a decisão do laço vem de `d1a5570`/`edd9d69` (#8); `fd07b89` (#23) a exportou com o
  `codeOfError`. Os três estão na `main` (`63621c6`). Isso não dispensa a correção.
- **Leitura e fronteira** (antes do código): ~45k tokens lidos (`wc -c` ÷ 4) — regras, skill, as seções
  do checklist, task, build e handoff usadas, `traces/delivery.mjs` (8,4 KB), `observe/delivery.mjs`
  (8,6 KB), os trechos de lock do `store.mjs`, os T8-C16 em processo de `concurrency.cli.test.mjs`, os
  apoios, `docs/traces.md` e a sonda —, mais ~30k previstos para provas e gates. Uma fatia, um lote,
  abaixo de 150k. Superfície: `untilDeadline` em `src/integrations/traces/delivery.mjs` e provas em
  `tests/integrations/traces/`. Store, lock, timers, relógios, prazos, consumidores, workflow, core e
  configuração não mudam.
- **Gates** (a lista exata é recalculada depois do último código e registrada antes de rodar):
  - **RED/GREEN**: as provas novas com o `src/` de `a6a829e` e com o corrigido; o T8-C16 original com 3
    criações exatas.
  - **Lista**: os 39 de `909b591` mais os consumidores do produto mudado — os arquivos de prova cuja
    cadeia de imports (estáticos e dinâmicos) alcança `src/integrations/traces/delivery.mjs` e os que
    iniciam um produtor (`hook`, `ingest --agent`, wrapper, launcher) — e a prova nova.
  - **A/B/C**: a mesma forma de antes (A Windows 24.22.1 no checkout; B clone git novo, 24.13.0 oficial,
    npm 11.6.2 ao lado, `core.autocrlf=true` só no clone, `npm_execpath` ausente; C WSL uid 1000, Node
    24.13.0 copiado num prefixo sem `sh`, `env -i`, `HOME` temporário, PATH sem `/usr/bin` e sem agentes),
    concorrência 4, uma invocação sem filtro, `RUNNER_TEMP` presente e válido, `TEMP`/`TMP` (A, B) ou
    `TMPDIR` (C) numa raiz própria criada e registrada pela execução, removida só pelo caminho exato
    registrado na criação, conferido como absoluto, pasta e não link, com o mesmo `ino` da criação (e, no
    C, o uid 1000). No C, nada do perfil WSL nem do `/tmp` global é lido.
  - **D**: um `npm test` completo no Windows 24.22.1 (teto 8, os nativos do Hermes), orçamento de 2 h na
    ferramenta antes do início, código commitado e nada rastreado editado durante ele.
  - Logs novos em `.checks/code-review/issue-25/builder-t8c16-terminal/`; nenhum gate repetido sem
    mudança para obter verde.
