# Iniciar o agente com captura: `skill-me <agente>` — issue #25



## Handoff da sequência de revisão e medição — 28/10/2026

A formal8 foi `blocked` em `bedda5c` pela evidência remota ainda pendente do AC9. A issue agora explicita a sequência já aprovada: provas locais e `ready` autorizam publicar; depois executar/registrar uma medição manual no HEAD publicado; só fazer merge com os resultados registrados e os cinco checks regulares verdes. Os requisitos remotos permanecem obrigatórios, fora do critério de revisão do código, sem alterar C1–C50, produto, testes ou prazos. Registro15/9: https://github.com/oldboydev/skill-me/issues/25#issuecomment-6470507482. Detalhes e histórico no adendo final da task; a verificação15 carregará as provas R14 com SHA explícito, sem afirmar que as reexecutou. Nenhuma medição remota ocorreu neste registro.

Sources:

- Continuação do coordenador para um novo autor Claude (29/10/2026), depois da CI do HEAD publicado `066bd98` (Verifier 22 PASS 50/50, formal 13 `ready`): o PR 40814315171 falhou só no Windows e no agregado, no I23-C6 Claude (`agents.e2e.test.mjs:102`, asserção `:115`; produtor 7 com `delivery_timeout` 1/0/0/1, `sync key` 601 ms e `close key` ainda pendente na saída), e a execução manual 40814471097 teve o Windows cancelado no teto de 20 min (anotação do GitHub), com as integrações incompletas: último resultado 04:02:02 UTC, cancelamento 04:11:42, 39 rótulos não impressos a partir do `T8-C19 trace walkthrough` (`ci066-manual-result-name-diff.json`; observação de saída, não prova de qual teste executava). A medição do mesmo job deu 4.500/4.500 ciclos, sem erros; mede o lock `durable:false`, não a chave nem o pipeline. Logs integrais `.checks/code-review/issue-25/ci066-windows-pr40814315171.log` e `ci066-windows-manual40814471097.log`; handoff técnico `.checks/issue-25-agent-launch.ci40814315171-handoff.md` (`3d50ced`); [registro da investigação](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6487953025); contexto `context-ci066-fail.json` (36 comentários, 9 ACs). Pedido: provar ou descartar, por reprodução controlada com filhos e raízes próprios, o candidato de ciclo de vida da harness do T8-C19 — o `privacy follow` iniciado em `tests/integrations/traces/demo.e2e.test.mjs:42` não tem finalizador por teste para as saídas de falha anteriores ao `stop` (`:85`); se confirmado, a menor correção do encerramento dos filhos próprios em todas as saídas, preservando a falha original, os nove passos, os cinco registros, o `end` 6, as origens, os payloads e as asserções, com regressão e controle saudável; sem timeout ou abort novo, retry, mudança de produto, prazos, carga, paralelismo, runtime ou infraestrutura. Se não confirmado: registrar a ausência de reprodução e propor a menor observação de início/fim que localize o pendente, com Landing e prova antes do código. Nenhum defeito do produto foi demonstrado pelo `sync key` de 601 ms. Mesmas autorizações 6467154706 (“Pode fazer a medição comparativa. Mantém os testes e prazos e segue até a CI ficar toda verde para fazer o merge do PR #28.”) e 6442514838 (“Pode fazer quantas precisar”). Registro de abertura no bloco “Ciclo de vida do `follow` no T8-C19” do `## Handoff`.

- Continuação do coordenador para um novo autor Claude (28/10/2026), depois do FAIL da verificação 21 (HEAD verificado `5a0f231`, relatório preservado em `3a15d79`): todas as provas nomeadas e a governança A 27/27/0/0, B 27/27/0/0 e C 27/26/0/1 passaram, mas o D completo terminou sozinho com exit 1, 1.057/1.036/1/20. Falhou só o teste antigo `T8-C20 … o exemplo é o que um hook com lock ocupado grava` (`tests/integrations/traces/docs.test.mjs:134-184`): o hook Claude real saiu `[0, "", ""]` (`:178`), e o `readFileSync` do arquivo `diagnóstico de entrega.ndjson` deu `ENOENT` (`:179`); log integral em `.checks/code-review/issue-25/verifier-round21/r21/D.log:1118` e `:1164-1185`, sem tempos nem dados do hook. [Handoff do bloqueio](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6485905666); contexto em `.checks/code-review/issue-25/context-round21-fail.json` (34 comentários, 9 ACs). Pedido: diagnóstico pontual do T8-C20 e a menor correção comprovada dentro dos contratos atuais, sem atribuir causa por hipótese, sem mudar o guia para aceitar a perda do caso positivo, sem tornar o melhor esforço do diagnóstico promessa de persistência e sem mudar prazos (relatório 1.000 ms, entrega 750/650 ms), cargas, contagens ou paralelismo. Mesmas autorizações 6467154706 (“Pode fazer a medição comparativa. Mantém os testes e prazos e segue até a CI ficar toda verde para fazer o merge do PR #28.”) e 6442514838 (“Pode fazer quantas precisar”). Registro de abertura no bloco “T8-C20 do D da verificação 21” do `## Handoff`.

- Revisão pontual do coordenador para o mesmo autor (28/10/2026), dentro da fatia do C48 e antes da verificação 21 e da formal 13, que não estão registradas: `.checks/code-review/issue-25/coordinator-ci-temp-path-review.md`. A expressão `. '${script}'` da prova nativa nova (`governance-C48 ramo Windows das integrações no pwsh real`) não escapa a aspa simples do caminho: um caminho Windows válido com `'` fecha o literal e quebra o `-Command`. É defeito candidato da harness, não do produto nem da guarda do `RUNNER_TEMP` do workflow. O coordenador confirmou o registro do 17 → 1 sob o `-Command` e mandou manter o shell padrão e o sentido “não zero continua falha”, sem `-File` nem `[Environment]::Exit`. Só `scripts/governance-ci.test.mjs` muda; o workflow de `169e845`, o produto, os testes funcionais, os scripts, a configuração, o core e o `.verified.md` ficam só para leitura. Mesmas autorizações 6467154706 e 6442514838. Linha “Literal do caminho no `-Command` da prova nativa do C48” do Landing; 2º acréscimo do C48.

- Continuação do coordenador para um novo autor Claude (28/10/2026), depois da CI do HEAD publicado `86c7677` (Verifier 20 PASS 50/50, formal 12 `ready`). O PR 40790722204 passou nos cinco checks (Windows 1.055/1.024/0/31). A execução manual 40790906319 falhou só no Windows e no agregado, no passo de integrações (597/570/3/24): `control.cli.test.mjs:547` e `:906` (I23-C4) e `concurrency.cli.test.mjs:1008` (controle positivo do C46), sem causa física demonstrada; log integral em `.checks/code-review/issue-25/ci86-windows-manual40790906319.log`. A medição A1/B/A2 do mesmo job (`measurement40790906319.json`, `-validation.json` e `.log`) completou 4.500/4.500 ciclos, com tomada p99 de 6,491, 1,629 e 6,374 ms; mede o componente de E/S, não o pipeline. [Decisão de implementação do coordenador](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6484289722), reversível e restrita à CI, da qual o usuário foi informado: `RUNNER_TEMP` como `TEMP`/`TMP` só no passo de integrações da matriz Windows; produto, testes funcionais, prazos, carga, paralelismo, retry, perdas, orçamentos, outros sistemas, jobs e a medição ficam como estão. Só `.github/workflows/governance.yml` e `scripts/governance-ci.test.mjs` mudam. Mesmas autorizações 6467154706 (“Pode fazer a medição comparativa. Mantém os testes e prazos e segue até a CI ficar toda verde para fazer o merge do PR #28.”) e 6442514838 (“Pode fazer quantas precisar”). Linhas “Ambiente do passo de integrações no Windows” e “Exceção ao C48 (passo de integrações)” do Landing; acréscimo do C48; seção da task de mesmo nome.

- Continuação do coordenador para um novo autor (28/10/2026), depois do FAIL da verificação 19 (HEAD verificado `5ee0e0f`, relatório preservado em `67a459b`; gates frescos A 365/353/0/12, B 365/353/0/12, C 365/345/0/20 e D 1.054/1.034/0/20, sem teste vermelho). O único achado é o F1 do C46 (m): o literal fixa o pendente e o `pid` do lock na 3ª linha e `processo 3 de 3`; a prova versionada os põe na 1ª e afirma `processo 1 de 3` (`evidence.unit.test.mjs:246`, `:259`, `:263`). Decisão do coordenador: fortalecer a prova sem trocar o literal, mantendo o caso da 1ª linha e acrescentando o da 3ª. A retificação documental (3ª → 1ª) foi abandonada porque uma montagem que desse sempre `processo 1 de n` ao dono do lock passaria hoje. Só `tests/integrations/traces/evidence.unit.test.mjs` muda. Registrar também, de forma aditiva, a nota de proveniência `.checks/code-review/issue-25/coordinator-r19-observations.json`: dois auxiliares da comparação de skips gravados pelo Git Bash em `/tmp` depois do D de `0ae940a`. Mesmas autorizações 6467154706 (“Pode fazer a medição comparativa. Mantém os testes e prazos e segue até a CI ficar toda verde para fazer o merge do PR #28.”) e 6442514838 (“Pode fazer quantas precisar”). Linha “Prova da 3ª linha da árvore no C46 (m)” do Landing.

- Continuação do coordenador para o mesmo autor (28/10/2026), depois do D de `dc0db9b`. O coordenador interrompeu só o processo de teste parado (PID 149528, às 18:21:49), registrado antes em `builder-t8c16-terminal/coordinator-D-stall.json`; por isso o D 593/579/1/13 está incompleto, não é PASS nem defeito do produto. Pedidos: corrigir de forma aditiva a atribuição de `a2ec111`; reproduzir por RED determinístico e então corrigir só a harness do I4-C16c (candidato: EOF do stdout antes do `exit`), sem mudar produto, carga, prazos ou critérios; rodar de novo os gates finais. Mesma autorização 6467154706 (“Pode fazer a medição comparativa. Mantém os testes e prazos e segue até a CI ficar toda verde para fazer o merge do PR #28.”). Linha “Consumidor lento do I4-C16c” do Landing.

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
| Consumidor lento do I4-C16c (gate D em `dc0db9b`: `codex-run.cli.test.mjs` parado depois do I4-C16 e interrompido pelo coordenador às 18:21:49, PID 149528, `builder-t8c16-terminal/coordinator-D-stall.json`; refinamento do critério 38, sem check novo) | **O que se sabe**: o processo do arquivo ficou ~34 min sem filhos e com 0,30 s de CPU; o último teste concluído foi o I4-C16; o I4-C16c e o I4-C17 não deram resultado. O `'test failed'` do arquivo é efeito do término externo. **Candidato** (leitura da fonte; reproduzido antes da correção): o I4-C16c pausa o stdout do wrapper, lê a cada 50 ms e só registra o `end` dentro do `exit`. Com o stream pausado, o `end` sai na leitura que esvazia o buffer depois do EOF, o que pode ocorrer antes do `exit`; o evento não se repete e a promessa fica pendente, sem filho. Numa observação descartável (`builder-stdout-eof/pending-probe.test.mjs`, Node 24.22.1), um teste pendente assim deixou o processo do arquivo parado até o término externo, com o mesmo relatório do D. É compatível com o D, mas não demonstra a ordem dos eventos naquela execução. **Forma** (só a prova; produto, wrapper, fixture e asserções iguais): a lógica do consumidor vai para uma função privada no mesmo arquivo, usada pelo I4-C16c real e pelos controles. Ela pausa o stdout e observa o `end` desde o início; lê a cada 50 ms até o `exit`; no `exit`, limpa o intervalo e registra o `data` antes do `resume`; e resolve `{status, stdout}` quando houver o `exit` e o `end`, em qualquer ordem. O I4-C16c continua com 3.000 linhas de 200 `z`, o intervalo de 50 ms, o Codex falso versionado, o wrapper real, o status 17 e o tamanho e o Buffer exatos. | Esperar o `close` do filho: muda o que o caso afirma e continua dependendo da ordem dos eventos. Ler em fluxo desde o início: elimina o consumidor lento que o caso existe para provar. Timeout, `--test-force-exit` ou menos linhas: escondem a corrida ou reduzem a carga. Controles sobre uma cópia corrigida da lógica: provariam uma lógica que o I4-C16c não usa. Utilitário ou biblioteca de streams novos: dependência sem necessidade. |
| Prova da 3ª linha da árvore no C46 (m) (F1 da verificação 19 em `5ee0e0f`, relatório em `67a459b`: o literal pede o pendente e o `pid` do lock na 3ª linha e `processo 3 de 3`, e a prova afirmava a 1ª; refinamento do C46, sem check novo) | **Só a prova** (`tests/integrations/traces/evidence.unit.test.mjs`). O produto, o apoio `helpers/traces.mjs` e o literal do (m) não mudam. **Caso atual** (`I25-C46 evidência comum: com o arquivo do registro, os 3 processos…`): mesmo nome, entrada e asserções. O hook filho sai primeiro, com o pendente e o `pid` 3003 na 1ª linha, e o dono é `processo 1 de 3`. Fica como **controle da 1ª linha**. **Caso novo**, de nome próprio `I25-C46 evidência comum: …`, selecionado pelo mesmo `--test-name-pattern` do Proof. Usa os apoios privados do arquivo (`treeLine`, `storeWithLock`) e o contrato público (`recordingProducers`, `recordedProducer`, `settle`). O arquivo do registro tem 3 linhas, `pid` 1001, 2002 e 3003, nessa ordem de saída. O pendente `open lock` de 640 ms e o `pid` do lock ficam só na 3ª. O arquivo do teste é compartilhado e separado, com 2 linhas. Asserções com valores literais: os cabeçalhos são exatamente `processo 1 de 3`, `processo 2 de 3`, `processo 3 de 3` e `tempos`, uma vez cada e nessa ordem. `open lock (tomada do lock) há 640 ms` aparece no `processo 3 de 3`, e `pendentes na saída: nenhuma` nos processos 1 e 2. `tempos` traz `; 2 linhas da pré-carga`. A raiz sai `raiz 1 (produtores 1, 2): lock presente, de produtor 1 wrapper codex, processo 3 de 3;`. A mensagem não tem a raiz, os arquivos de tempos nem o nonce. | Retificar o literal para `1ª`/`processo 1 de 3` (template documental do root, abandonado): uma montagem que desse sempre `processo 1 de n` ao dono do lock passaria. Mover a entrada do caso atual para a 3ª linha: perderia o controle da 1ª, que é a ordem de saída que motivou o (m) (hook filho primeiro). Calcular o esperado pela posição do `pid` (o mesmo índice do apoio): reproduziria a lógica e passaria junto com ela. Função ou módulo de apoio novo para os dois casos: abstração sem consumidor fora deste arquivo. |
| Ambiente do passo de integrações no Windows (CI de `86c7677`: PR 40790722204 com os cinco checks verdes; manual 40790906319 vermelha no Windows só nas integrações, `control.cli.test.mjs:547` e `:906` e `concurrency.cli.test.mjs:1008`; medição A1/B/A2 do mesmo job em `measurement40790906319.*`; decisão do coordenador no handoff 6484289722; refinamento do C48, sem check nem critério novo) | **Só `.github/workflows/governance.yml` e `scripts/governance-ci.test.mjs`.** No job `verify`, o passo `npm run test:integrations` vira dois ramos exclusivos por `matrix.os`, o vocabulário do `timeout-minutes` do mesmo job: (1) `{if: "matrix.os != 'windows-latest'", run: "npm run test:integrations"}` — o passo de antes, sem `env` nem `shell`, no `ubuntu-22.04` e no `macos-14`; (2) `if: matrix.os == 'windows-latest'`, só com `if` e `run`, no shell padrão do runner Windows (pwsh; sem `shell:` nem `env:`). O `run` do (2) lê `$env:RUNNER_TEMP`; se ele estiver ausente, vazio, não for um caminho totalmente qualificado (`[IO.Path]::IsPathFullyQualified`) ou não for uma pasta existente (`Test-Path -LiteralPath … -PathType Container`), faz `throw 'RUNNER_TEMP precisa ser o caminho absoluto de uma pasta existente'` antes do npm (exit 1, sem fallback). Senão, `$env:TEMP` e `$env:TMP` recebem esse valor exato, só no processo do passo e nos filhos dele; chama `npm run test:integrations`, sem argumento a mais; termina com `exit $LASTEXITCODE`. Um comentário no YAML diz o porquê e o limite da medição. Nada vai a `GITHUB_ENV`, `GITHUB_PATH`, registro, perfil ou ambiente do job ou do workflow, e nada do `RUNNER_TEMP` é apagado. Ficam iguais: produto, testes funcionais e apoios, `scripts/test-integrations.mjs` (teto 8), prazos 750/650 ms, stdin 2.000 ms, faixa 1.900–6.000 ms, Hermes 5 s, carga, contagens, retry e perdas, orçamentos 20/10/5 e 10, matriz, `ci.needs`, o job `lock_diagnostics` e a medição, com os dois destinos originais. **Código de saída** (sondagem antes do código, em `.checks/code-review/issue-25/builder-ci86-temp/explore/`): o runner roda o passo como `pwsh -command ". '{0}'"` (log da 40790906319). Nessa forma, o `$LASTEXITCODE` do npm (17 na sonda) chega ao fim do script, mas o processo do pwsh sai 1 para todo código de saída do script diferente de 0. É a conversão documentada do `-Command` e vale hoje para todos os passos Windows. Sem o `exit $LASTEXITCODE`, a mesma forma saiu 0 com o npm em 17: a falha só voltaria pelo sufixo que o runner acrescenta. O passo, então, sai 0 quando o npm sai 0 e falha com 1 quando o npm falha. **Provas** (acréscimo do C48): `governance-C48 integrações: …`, estrutural, em todo sistema; `governance-C48 ramo Windows das integrações no pwsh real: …`, só no Windows (skip com o motivo fora dele), com o `run` lido do YAML e um `npm.cmd` falso num `bin` próprio, único `npm` no PATH do pwsh; telemetria e checagem de versão do pwsh desligadas no ambiente do filho, sem perfil. | Aumentar prazos ou orçamento, reduzir carga, ciclos ou paralelismo, repetir tentativas ou aceitar perda: vetados pelo proprietário (“Mantém os testes e prazos”). `TEMP`/`TMP` no `env` do job ou do workflow, em `GITHUB_ENV` ou no registro: alcançaria os outros passos e sistemas e persistiria fora do passo. Escolher o temporário no produto ou nos testes funcionais: muda contrato sem defeito demonstrado. Cair em silêncio no `TEMP` padrão quando o `RUNNER_TEMP` falta: esconderia que o destino medido não foi o usado. `shell: pwsh -File {0}` ou `[Environment]::Exit($LASTEXITCODE)` para o passo devolver 17: troca o shell padrão pedido ou encerra o processo por fora do pwsh, e daria a este passo uma semântica de saída diferente da dos outros passos Windows; o runner só distingue 0 de não zero. Validar só com `Test-Path`: aceitaria um caminho relativo, resolvido pela pasta de trabalho. Um passo ou job novo para o Windows, ou `--test-concurrency`/filtros no comando: fora da decisão. Repetir no teste o texto do script do YAML: espelharia a implementação; a prova roda o próprio `run`. |
| Exceção ao C48 (passo de integrações; mesma decisão, 28/10/2026) | O C48, o critério 40 e o acréscimo do AC9 dizem que, fora o `timeout-minutes` do `verify`, o topo do workflow e os jobs `changes`, `verify` e `ci` ficam idênticos a `d0d5a7f`. A partir desta data, a conferência do C48 aceita também, só no `verify`, a troca do passo `run: npm run test:integrations` pelos dois ramos da linha acima: o primeiro é o passo antigo com `if: matrix.os != 'windows-latest'`; o segundo, só no Windows, é provado pelos `governance-C48 …`. Todo o resto continua idêntico a `d0d5a7f`, e o conjunto de jobs continua o do C49. Em `governance-C1 C3`, a lista exata dos cinco comandos, na mesma ordem, continua a mesma; dela sai só o ramo do Windows, identificado pelo `if` literal. As demais asserções desse teste e do `governance-C49` não mudam. O registro de `52b22cd` e o acréscimo do AC9 ficam como estão. | Reescrever o C48 como se o passo sempre tivesse dois ramos: apagaria o histórico da decisão do AC8. Excluir o `verify` da conferência: deixaria de vigiar passos e orçamento. Apagar a lista de `governance-C1 C3` ou trocá-la por presença de chaves: enfraqueceria a prova existente. |
| Literal do caminho no `-Command` da prova nativa do C48 (revisão do coordenador em `coordinator-ci-temp-path-review.md`, sobre `c68a392`; sondagem em `.checks/code-review/issue-25/builder-ci86-temp/path-fix/explore/`; refinamento do C48, sem check novo) | **Só `scripts/governance-ci.test.mjs`, no teste `governance-C48 ramo Windows das integrações no pwsh real: …`** (mesmo nome; a contagem de 27 da governança não muda). **Evidência da sondagem** (pwsh 7.6.9, `-NoProfile -NonInteractive -Command ". '<arquivo>'"`, script próprio que só escreve uma linha): sem escape, o arquivo `passo ' literal.ps1` sai 1 e o script não roda; com a aspa dobrada, sai 0 e roda. Os nomes com `‘` (U+2018), `’` (U+2019), `‚` (U+201A) ou `‛` (U+201B), que o PowerShell também lê como aspa simples, saem 1 sem escape **e** com só a aspa ASCII dobrada; com todas as cinco dobradas, saem 0. **Forma**: `step(runnerTempValue, npmCode, file = script)`; o argumento do `-Command` passa a ser ``. '${file.replace(/['‘’‚‛]/g, "$&$&")}'`` — o literal de aspas simples do PowerShell, com cada aspa simples dobrada; o modelo `pwsh -NoProfile -NonInteractive -Command ". '<arquivo>'"` não muda. O `passo.ps1` e todas as entradas e asserções de hoje ficam como estão. Dois arquivos próprios a mais, no mesmo scratch e com o **mesmo** `run` lido do YAML: `passo ' literal.ps1` e `passo ‘’‚‛ literal.ps1`. Para cada um, depois dos casos inválidos e antes das conferências finais: `step(runnerTemp, 0, arquivo)` → `{status: 0, npm: <o mesmo recebido>}` e `step(runnerTemp, 17, arquivo)` → `{status: 1, npm: <o mesmo recebido>}`, com o nome do arquivo como rótulo. As conferências finais (`GITHUB_ENV`/`GITHUB_PATH` vazios, `RUNNER_TEMP` só com a sentinela, `TEMP`/`TMP` do processo da prova) passam a cobrir também essas execuções. **RED**: as provas com os dois arquivos, sem o escape, falham no 1º controle com aspa, e os 7 casos sem aspa passam antes dele; depois, sem o escape e com só a ASCII dobrada, numa cópia descartável. | Dobrar só a aspa ASCII: a sondagem mostra que as quatro aspas tipográficas continuam fechando o literal. `-File`, `-EncodedCommand` ou passar o caminho como argumento à parte: troca a forma `-Command ". '{0}'"` que a prova representa. Manter nomes sem aspa: esconde o defeito. Afirmar só que a string tem as aspas dobradas: não executa o pwsh nem o npm falso. Testar as cinco aspas em cinco arquivos: o mesmo dado com o dobro de execuções do pwsh; os dois arquivos cobrem a ASCII pedida e as quatro tipográficas. Função, módulo ou CLI de escape: abstração sem outro consumidor. |
| Diagnóstico do T8-C20 (D da verificação 21 em `5a0f231`, relatório em `3a15d79`: `docs.test.mjs:179`, `ENOENT` ao ler `diagnóstico de entrega.ndjson` depois de o hook sair `[0, "", ""]`; refinamento do C46, sem check novo) | **O que se mediu** (sonda própria `builder-r21-t8c20/probe.mjs`, fora do repositório, com o cenário exato do T8-C20 — mesmo scratch, raiz, captura, `.lock` alheio, arquivo e payload — e a pré-carga de tempos existente; resultado em `probe1.ndjson`, Windows, Node 24.22.1, sem outra carga): sem falha injetada, 20 de 20 gravaram a linha do guia, com o `open` do arquivo terminando 651–665 ms depois da 1ª operação de disco do hook e a saída logo depois; o prazo do relatório (1.000 ms do `flush`, chamado logo depois de ler o evento, quando a entrega também começa) deixou ~335–349 ms de margem, aproximada pela 1ª operação. Com a pré-carga própria `fault-preload.mjs`, quatro classes compatíveis com o contrato deram **o mesmo** resultado visível da R21 (`[0, "", ""]` e o arquivo ausente): `open` do arquivo parado (2/2, saída ~1.016 ms depois da 1ª operação, com o `open` pendente), `open` com EIO (2/2, saída ~660 ms, `open … EIO`), `realpath` da pasta parado (2/2, ~1.015 ms, pendente) e o laço de eventos parado 1 s pelo knob existente `SKILL_ME_TEST_TRACES_BLOCK_LOOP=2|1000` (3 de 5 sem o arquivo, 1 com o arquivo sem a linha, 1 com a linha: corrida do timer de 1 ms contra as três operações da gravação). **Causa da R21**: desconhecida; nenhuma classe foi atribuída, e nenhuma reprodução é a falha histórica. **Defeito demonstrado**: de observação da prova — o T8-C20 não registra o hook, e a falha traz só o `ENOENT` com o caminho, igual nas quatro classes, enquanto a linha da pré-carga as distingue (pendente na saída, falha com código, laço parado, nenhuma operação). Nenhum defeito do produto foi demonstrado: perder a linha no prazo ou numa falha de E/S é o melhor esforço do contrato (`issue-8-traces.build.md`, C16: “dentro do prazo do relatório do processo (`deadlineAt` do `flush`); nunca lança — se o arquivo não puder ser gravado, o diagnóstico se perde”). **Forma** (só a prova e a pré-carga de provas; produto, guia, prazos 1.000/750/650 ms, payload, contagens, carga e paralelismo iguais): (1) `tests/integrations/traces/docs.test.mjs` adota a evidência comum com `recordProducersInEachTest()` no topo; o hook do T8-C20 continua por `runIntegrations`, com a mesma entrada, e entra no registro por `recordedProducer("hook claude", env)` e `settle(run)` (`helpers/producer-runs.mjs`), que num registro só acrescenta a pré-carga de tempos ao `NODE_OPTIONS` e o arquivo dela, e fora de um registro devolve o mesmo ambiente; o trecho “Seguindo o guia” (`:166-183`) vira a função `followGuide(failures, extra = {})` do próprio arquivo, chamada pelo T8-C20 sem `extra`, com as mesmas linhas, literais e mensagens. (2) `tests/integrations/helpers/traces-probe.mjs`: as operações sobre o caminho exato de `SKILL_ME_CAPTURE_REPORT` (o `lstat`, o `open` e as do handle) saem com o tipo `diagnóstico`, e a pasta dele continua `pasta`; dois knobs novos, só de prova e inertes sem a variável: `SKILL_ME_TEST_TRACES_STALL_REPORT=1` (o `open` desse arquivo nunca termina) e `SKILL_ME_TEST_TRACES_REPORT_EIO=1` (o `open` falha com EIO sem tocar no disco). (3) Dois controles no `docs.test.mjs` (`I25-C46 diagnóstico do T8-C20: …`) com `recordingProducers(() => followGuide(failures, knob))`: o mesmo erro do `readFileSync` (`code` `ENOENT`, `syscall` `open`), com a mensagem original seguida da evidência, `produtor 1 hook claude: status 0, sinal nenhum; entrega sem relatório` e a disputa do lock vista (`lock ocupado (EEXIST, repetido) <n>x`, n ≥ 1); no prazo, `pendentes na saída: open diagnóstico (fora do lock) há ` e nenhuma falha do diagnóstico; na E/S, `open diagnóstico EIO (fora do lock)` nas falhas e `pendentes na saída: nenhuma`; nos dois, `raiz 1 (produtores 1): lock presente, ilegível [SyntaxError; 12 bytes]; capturas indisponível [lock_present]`, e nada de caminho, nome do arquivo, ID, chave, conteúdo do lock ou ambiente. | Corrigir o produto (reservar parte do prazo para o diagnóstico, esperar a gravação além do prazo, repetir a gravação, gravar antes do `settle`): nenhum defeito demonstrado, e o prazo de 1.000 ms e o melhor esforço são contrato; esperar além dele seria promessa nova de persistência. Aumentar o prazo, aceitar a perda no guia ou na prova, pular, repetir ou reduzir carga: vetados. Usar nos controles o knob `BLOCK_LOOP` existente: corrida medida (1 de 5 gravou a linha), não determinística. Trocar `runIntegrations` por `runHook` (spawn assíncrono, outro `stdio`): muda a forma de iniciar o hook. Passar o fd do relatório de fixture para ter o resumo da entrega na evidência: muda o ambiente do hook e põe uma segunda escrita no mesmo prazo. Tipo pelo nome do arquivo em `trace-kinds.mjs`: o nome é escolhido por cada prova, e um padrão como `*.ndjson` rotularia outros arquivos; o valor exato da variável é o arquivo que o produtor grava. Deixar o tipo `pasta` para o arquivo: a evidência diria `open pasta` para um arquivo. Copiar no `docs.test.mjs` a montagem da evidência: duplicaria o apoio comum. Tratar a instrumentação como correção da R21: a causa segue desconhecida. |
| Ciclo de vida do `follow` no T8-C19 (CI de `066bd98`: manual 40814471097 com o Windows cancelado no teto de 20 min e 39 rótulos não impressos a partir do `T8-C19 trace walkthrough`; refinamento do C46, sem check novo) | **O que se mediu** (sondas próprias em `.checks/code-review/issue-25/builder-ci066-follow/`: cópia `git archive` de `46f949d` com o T8-C19 instrumentado só na cópia, raiz temporária própria por execução, Windows, Node 24.22.1, sem outra carga): sem injeção, o follow sai 0 com as 6 linhas antes do `after`. Com uma asserção do próprio T8-C19 falhando depois do spawn — logo depois, no passo do hook (também pela injeção existente `SKILL_ME_TEST_TRACES_SEGMENT_EIO=1` só no hook: `0 !== 1`) e depois dos cinco registros —, as 32 falhas saíram como a asserção original, e em 32 de 32 o follow estava **vivo** no início do `after` do arquivo; só terminou porque o `after` apagou a pasta (sai 3, 1–223 ms depois do fim do `rmSync`), e o processo do arquivo saiu logo em seguida. Em 1 de 20 o `rmSync` do `after` colidiu com o follow (`ENOTEMPTY`): uma 2ª falha atribuída ao arquivo e 4 entradas deixadas no temporário. Com a limpeza desligada só na cópia (variante sintética, 2 de 2), o processo do arquivo ficou vivo até o vigia da sonda encerrar o follow aos 20 s, e o resultado de um 2º arquivo, terminado em menos de 1 s, só foi impresso depois disso. O reporter imprime na hora os resultados do arquivo da vez, mas retém os do seguinte até o **processo** do anterior sair; `test:dequeue` e `test:complete` chegam a um reporter em tempo real. **Causa do cancelamento**: desconhecida. Às 04:11:42, ou o processo do `delivery.unit` (último arquivo impresso, completo) não tinha saído, ou o T8-C19 não tinha terminado, ou o `demo.e2e` não tinha começado; o log não distingue, e nenhuma falha natural prendeu o processo. **Defeito demonstrado** (da harness, não do produto): o follow é filho do teste e, numa saída de falha antes do `stop`, segue vivo até a limpeza do arquivo, que o encerra por acaso ao apagar a pasta e pode colidir com ele; se a limpeza não o alcança, ele prende o processo do arquivo. **Forma** (só `tests/integrations/traces/demo.e2e.test.mjs`): o corpo do T8-C19 vira a função `walkthrough(t, hookEnv = {}, seen = {})` do próprio arquivo, com as mesmas linhas, passos, rótulos, payloads, comandos, ordem e asserções; `hookEnv` só acrescenta ao ambiente do hook Claude, e `seen` recebe o follow e a promessa do `close`. Do spawn até `assert.equal(await followDone, 0)`, o corpo fica num `try` cujo `finally` chama `endFollow(follow, followDone)`: se o follow não saiu (`exitCode` e `signalCode` nulos), `follow.kill()` pelo próprio objeto; em todo caso, espera o `close` real. Sem `catch`: a falha original segue intacta. O spawn que falha emite `error` e depois `close`, e o `kill()` depois do `exit` devolve `false` sem sinal (sondado). O T8-C19 chama a rotina sem `hookEnv`. Controle novo no mesmo arquivo (`I25-C46 ciclo de vida do follow no T8-C19: …`), pela mesma rotina, com `SKILL_ME_TEST_TRACES_SEGMENT_EIO=1` e a pré-carga de provas só no hook: o mesmo `AssertionError` do passo do hook (`0`, `1`, `strictEqual`); quando a falha sai da rotina, o `close` do follow já ocorreu (antes de uma volta de `setImmediate`), com `exitCode` nulo e `signalCode` `SIGTERM` — terminado pela rotina com a captura ativa, não pela limpeza. | `t.after` no teste: roda só depois do corpo, e o controle não veria o encerramento antes de a falha sair. Encerrar no `after` do arquivo: continua dependendo da limpeza e não serve a uma rotina usada por dois testes. Só `kill()`, sem esperar o `close`: sinal enviado não prova término. `catch` sem relançar, na rotina ou no controle: transformaria a falha em sucesso. Encerrar pelo pid, pela árvore ou por prefixo do comando: não é o objeto criado pelo teste e poderia alcançar processo alheio. `--test-force-exit`, timeout do teste ou do runner: prazos novos que esconderiam o pendente. Apoio comum com o `follow()` de `follow.cli.test.mjs`: o 2º consumidor fica fora desta fatia; aqui a função é privada do arquivo, e o mesmo padrão naquele arquivo é comunicado, não corrigido. Apagar a pasta antes de encerrar o follow: é a colisão medida. Tratar esta correção como a causa do cancelamento: não demonstrada. |

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

Refinamento (gate D em `dc0db9b`, interrompido pelo coordenador; linha “Consumidor lento do I4-C16c” do
Landing), antes do código. (a)–(p) não mudam.
(q) **Consumidor lento do I4-C16c** (`codex-run.cli.test.mjs`, `I25-C46 consumidor lento do I4-C16c: …`).
Os controles usam a mesma função privada que o I4-C16c usa, com um filho falso (`EventEmitter`) e um
`PassThrough` real como stdout:
- **EOF antes do `exit`**: depois de o `end` sair (o intervalo esvaziou o buffer), a promessa continua
  pendente sem o `exit`. Emitido o `exit` 17, ela resolve com `{status: 17, stdout: <os bytes exatos>}`.
  RED com a lógica de `a2ec111` extraída sem mudança: continua pendente depois do `exit`.
- **`exit` antes do EOF**: com parte dos bytes escritos e o `exit` 17 emitido, a promessa continua pendente.
  Escrito o resto e o fim, ela resolve com `{status: 17, stdout: <todos os bytes, em ordem>}`. Passa antes
  e depois.
- A pendência e a resolução são conferidas depois de voltas de `setImmediate`. O intervalo, os listeners e
  o stream do controle são liberados também no RED.
- O I4-C16c continua igual: 3.000 linhas de 200 `z`, 50 ms, wrapper real, status 17, tamanho e Buffer
  exatos.

Proof: `node --test --test-name-pattern="I4-C16|I25-C46 consumidor lento" tests/integrations/codex-run.cli.test.mjs`

Refinamento (F1 da verificação 19 em `5ee0e0f`, relatório em `67a459b`; linha “Prova da 3ª linha da árvore no C46
(m)” do Landing), antes do código. (a)–(q) e o literal de (m) não mudam. É ampliação da cobertura do mesmo
contrato, não critério novo.
- **Controle da 1ª linha**: o caso atual de (m) fica com o mesmo nome, entrada e asserções (pendente e `pid` do
  lock na 1ª, `processo 1 de 3`).
- **Caso novo**, que prova o (m) como escrito. O arquivo do registro tem 3 linhas, e o pendente e o `pid` do
  lock ficam só na 3ª:
  - as 3 linhas saem uma vez cada, na ordem do arquivo, como `processo 1 de 3` a `processo 3 de 3`;
  - `open lock (tomada do lock) há 640 ms` aparece só no `processo 3 de 3`; os outros dois têm `pendentes na
    saída: nenhuma`;
  - o lock sai `lock presente, de produtor 1 wrapper codex, processo 3 de 3`;
  - o produtor com o arquivo do teste compartilhado (2 linhas) continua só com a linha da saída (`; 2 linhas da
    pré-carga`);
  - a mensagem não tem a raiz, os arquivos de tempos nem o nonce.
- **Prova discriminante**, numa cópia descartável própria, com um único mutante do apoio que dá sempre
  `processo 1 de n` ao dono do lock: o caso atual passa e o novo falha.
- Não é defeito de produto demonstrado. É lacuna de prova, corrigida só na prova.

Proof: `node --test --test-name-pattern="I25-C46 evidência comum" tests/integrations/traces/evidence.unit.test.mjs`

Refinamento (D da verificação 21 em `5a0f231`, relatório em `3a15d79`: `T8-C20 … o exemplo é o que um hook com lock
ocupado grava`, `docs.test.mjs:179`, `ENOENT`; linha “Diagnóstico do T8-C20” do Landing), antes do código. (a)–(q)
e o literal de (m) não mudam, e o T8-C20 continua com o mesmo nome, entrada e asserções.
(r) **Diagnóstico do T8-C20** (`tests/integrations/traces/docs.test.mjs`, `I25-C46 diagnóstico do T8-C20: …`):
- o arquivo adota a evidência comum, e o hook do T8-C20 entra no registro com o mesmo `runIntegrations`, a mesma
  entrada e o mesmo ambiente, mais só a pré-carga de tempos; o T8-C20 mantém scratch, raiz, captura, `.lock` alheio,
  arquivo `diagnóstico de entrega.ndjson`, payload e as asserções de `:178-183`, com os mesmos literais e mensagens;
- **controle do prazo**: com `SKILL_ME_TEST_TRACES_STALL_REPORT=1`, o mesmo corpo falha na mesma leitura, com o
  mesmo erro (`code` `ENOENT`, `syscall` `open`); a mensagem é a original seguida da evidência, com
  `produtor 1 hook claude: status 0, sinal nenhum; entrega sem relatório`, a disputa do lock vista
  (`lock ocupado (EEXIST, repetido) <n>x`, n ≥ 1), `pendentes na saída: open diagnóstico (fora do lock) há ` e
  nenhuma falha do diagnóstico;
- **controle da E/S**: com `SKILL_ME_TEST_TRACES_REPORT_EIO=1`, a mesma falha, com `open diagnóstico EIO (fora do
  lock)` nas falhas e `pendentes na saída: nenhuma`; os dois controles se distinguem pelo pendente e pela falha;
- nos dois, `raiz 1 (produtores 1): lock presente, ilegível [SyntaxError; 12 bytes]; capturas indisponível
  [lock_present]`, e a evidência não traz caminho, nome do arquivo, ID, chave, conteúdo do lock nem ambiente;
- **RED**: numa cópia descartável, o `docs.test.mjs` atual com as mesmas falhas injetadas no hook sai só com o
  `ENOENT` e o caminho, igual nas classes; **GREEN** com a adoção; mutantes (sem o registro do hook, sem o tipo
  `diagnóstico`, knobs trocados) recusados numa cópia descartável.
- **Retificação do autor durante o build, antes do commit do código** (o texto acima fica como estava): na E/S, o
  literal `pendentes na saída: nenhuma` não é garantido. A tentativa da entrega abandonada no prazo continua em
  segundo plano e pode estar em curso na saída (GREEN antes do commit, `builder-r21-t8c20/green-pre2.log`:
  `pendentes na saída: stat store.json (fora do lock) há 0 ms`). O que separa os controles passa a ser só o
  diagnóstico: no prazo, a lista de pendentes contém `open diagnóstico (fora do lock) há ` (talvez depois do pendente
  da entrega) e a lista de falhas não tem o diagnóstico; na E/S, a lista de falhas contém `open diagnóstico EIO (fora
  do lock)` e a de pendentes não tem o diagnóstico. A ausência do `lstat ENOENT` do arquivo ainda não criado é a
  conferência normal (`ausências conferidas`), não falha.
- Não é defeito de produto demonstrado nem correção da causa da R21, que continua desconhecida.

Proof: `node --test tests/integrations/traces/docs.test.mjs`

Refinamento (CI de `066bd98`: manual 40814471097 com o Windows cancelado no teto de 20 min; linha “Ciclo de vida do
`follow` no T8-C19” do Landing), antes do código. (a)–(r) e o literal de (m) não mudam, e o T8-C19 continua com o
mesmo nome, os nove passos, os cinco registros, o `end` 6, as origens, os payloads, os comandos, a ordem e as asserções.
(s) **Ciclo de vida do follow no T8-C19** (`tests/integrations/traces/demo.e2e.test.mjs`, `I25-C46 ciclo de vida do
follow no T8-C19: …`):
- o T8-C19 passa pela rotina `walkthrough` sem `hookEnv`, e o follow sai 0 com as 6 linhas, como antes;
- **controle da falha**: pela mesma rotina, com `SKILL_ME_TEST_TRACES_SEGMENT_EIO=1` e a pré-carga de provas só no
  hook Claude, a rotina rejeita com o mesmo `AssertionError` do passo do hook (`actual` 0, `expected` 1, `operator`
  `strictEqual`); quando a rejeição chega ao controle, o `close` do follow já ocorreu (antes de uma volta de
  `setImmediate`), com `exitCode` nulo e `signalCode` `SIGTERM`;
- **RED**: numa cópia descartável, a mesma rotina sem o `finally` (o ciclo de vida anterior) deixa o controle vermelho,
  com o `close` pendente; **GREEN** com o `finally`; mutantes recusados numa cópia descartável: sem o `finally`, `kill()`
  sem esperar o `close` e `catch` que engole a falha;
- não demonstra a causa do cancelamento da manual 40814471097 nem que ele não volte a ocorrer; não é defeito do produto.

Proof: `node --test tests/integrations/traces/demo.e2e.test.mjs`

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
Acréscimo (CI de `86c7677`, 28/10/2026; linhas “Ambiente do passo de integrações no Windows” e “Exceção
ao C48 (passo de integrações)” do Landing; antes do código; continua um só check, sem critério novo). No
`verify`, o passo de integrações tem dois ramos exclusivos por `matrix.os`:
(a) **estrutura**, em todo sistema (`governance-C48 integrações: …`):
  - depois do `checkout` e do `setup-node`, os passos são exatamente `{run: "npm ci --ignore-scripts"}`,
    `{run: "npm run test:governance"}`, `{run: "npm run test:code-review"}`, `{run: "npm run test:doctor"}`,
    `{if: "matrix.os != 'windows-latest'", run: "npm run test:integrations"}` e, por último, o ramo do
    Windows, só com as chaves `if` e `run` e `if: matrix.os == 'windows-latest'`;
  - por sistema da matriz, um só dos dois ramos se aplica: o primeiro no `ubuntu-22.04` e no `macos-14`, o
    segundo no `windows-latest`;
  - no ramo do Windows, a única linha `npm` é `npm run test:integrations`; as variáveis de ambiente do
    script são só `RUNNER_TEMP`, `TEMP` e `TMP`; não há `GITHUB_ENV`, `GITHUB_PATH`,
    `SetEnvironmentVariable` nem `setx`;
  - o workflow e o `verify` não têm `env` nem `defaults`;
  - `timeout-minutes`: `verify` `${{ matrix.os == 'windows-latest' && 20 || 10 }}`, `changes` e `ci` 5,
    `lock_diagnostics` 10.
(b) **fronteira real no pwsh**, só no Windows (`governance-C48 ramo Windows das integrações no pwsh real:
…`); fora dele, skip com o motivo. O `run` lido do YAML vai, sem mudança, para um `.ps1` e roda pelo
`pwsh.exe` do PATH na forma do runner, `-Command ". '<arquivo>'"`, com `-NoProfile -NonInteractive`. O
PATH do pwsh tem só um `bin` próprio, onde o único `npm` é um `npm.cmd` falso que grava o que recebeu e sai
com o código pedido, e o `System32`. O `TEMP` e o `TMP` dados ao pwsh são pastas distintas entre si e do
`RUNNER_TEMP`, que é uma pasta própria com um arquivo `sentinela.txt`:
  - `RUNNER_TEMP` válido e npm saindo 0: o pwsh sai 0; o npm recebeu `["run", "test:integrations"]`, `TEMP`
    e `TMP` iguais ao `RUNNER_TEMP`, o mesmo `RUNNER_TEMP` e uma variável sentinela intacta;
  - o mesmo com o npm saindo 17: o npm recebeu o mesmo, e o pwsh sai 1 (a conversão do `-Command` do
    Landing);
  - `RUNNER_TEMP` ausente, vazio, relativo (`runner-temp`, uma pasta que existe na pasta de trabalho do
    pwsh), inexistente ou um arquivo: o pwsh sai 1, e o npm não roda;
  - depois de todos: `GITHUB_ENV` e `GITHUB_PATH` vazios, o `RUNNER_TEMP` só com `sentinela.txt`, e `TEMP`
    e `TMP` do processo da prova iguais aos de antes.
(c) As provas de (a) e (b) falham com o workflow de `86c7677`, e os mutantes de configuração, roteamento e
propagação são recusados, numa cópia descartável; RED, GREEN e mutantes ficam no build, sem mutação no
checkout. No C49, “as asserções sobre os passos do `verify` continuam iguais” vale com a adaptação da linha
“Exceção ao C48 (passo de integrações)”.
Proof: `node --test --test-name-pattern="governance-C48 |governance-C1 C3" scripts/governance-ci.test.mjs`
Proof: `npm run test:governance`, uma invocação sem filtro por ambiente A/B/C, com `RUNNER_TEMP` presente e
válido; o (b) roda em A e B e é skip em C
A CI do novo HEAD prova o passo no runner; ela é do coordenador. Este acréscimo não afirma causa física nem
que as falhas da CI de `86c7677` deixam de ocorrer.
2º acréscimo (revisão do coordenador sobre `c68a392`, 28/10/2026; linha “Literal do caminho no `-Command` da
prova nativa do C48” do Landing; antes do código; continua um só check e o mesmo teste). Em (b), o `-Command` leva
o caminho do arquivo como literal de aspas simples do PowerShell, com cada aspa simples (`'`, `‘`, `’`, `‚`, `‛`)
dobrada, e o mesmo `run` lido do YAML roda também de dois arquivos próprios com aspas no nome, `passo ' literal.ps1`
e `passo ‘’‚‛ literal.ps1`:
  - para cada um, com `RUNNER_TEMP` válido: npm saindo 0 → pwsh 0, e npm saindo 17 → pwsh 1; nos dois, o npm
    recebeu `["run", "test:integrations"]`, `TEMP` e `TMP` iguais ao `RUNNER_TEMP`, o mesmo `RUNNER_TEMP` e a
    sentinela intacta;
  - os casos de hoje com `passo.ps1` (0, 17 e os cinco inválidos) não mudam; as conferências finais vêm depois de
    todas as execuções;
  - sem o escape, o 1º controle com aspa falha (o pwsh sai 1 e o npm não roda), e os casos sem aspa continuam
    passando; com só a aspa ASCII dobrada, falha o controle com as tipográficas. RED e mutantes no build.
O modelo `pwsh -NoProfile -NonInteractive -Command ". '<arquivo>'"`, o 17 → 1 e o workflow não mudam.
Proof: o mesmo `node --test --test-name-pattern="governance-C48 |governance-C1 C3" scripts/governance-ci.test.mjs`
Proof: `npm run test:governance`, uma invocação sem filtro por ambiente A/B/C, depois do último código; o (b), com os
controles com aspa, roda em A e B e é skip em C

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
- observability (acréscimo da fatia do T8-C20, sem check novo): C46 (r) — na falha do T8-C20, a evidência diz se a gravação do diagnóstico ficou pendente no prazo, falhou com código ou nem começou, e o estado do lock e das capturas.
- data lifecycle (acréscimo da fatia do T8-C19, sem check novo): C46 (s) — numa falha antes do `stop`, o filho `privacy follow` do T8-C19 é encerrado pelo próprio objeto e tem o `close` esperado antes da limpeza do arquivo, com a falha original intacta.

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
- **Onde a fronteira caiu**: registro em `9b39d7e`; código em `322bcad` (`untilDeadline` e as provas
  C46 (o)–(p)). Os dois defeitos foram reproduzidos antes da correção; o candidato 2 se confirmou.
  - **RED** (as provas de `322bcad` numa cópia descartável com o `delivery.mjs` de `a6a829e`, Windows
    24.22.1): unit 5 testes, 3 pass, 2 fail — defeito 1 `3 !== 2` chamadas; defeito 2 `{ok: true, value:
    "gravado"}` com o lock obtido no prazo. Store 12 testes, 10 pass, 2 fail — defeito 1 `4 !== 3`
    criações; defeito 2 `{code: null, committed: 1, persisted: 1, lost: 0}`, o evento gravado com o lock
    obtido no prazo. Os 7 T8-C16 antigos e o controle válido passaram.
  - **GREEN** (`322bcad`): unit 5/5; store 12/12, com o T8-C16 original em 3 criações exatas.
  - **Mutações** do unit, cada uma detectada: sem o prazo pelo relógio no `onLock` → `{ok: true}`; sem o
    abandono terminal → `3 !== 2` e `io_failure` no lugar de `delivery_timeout`; abandono terminal que
    ignora o lock obtido → `lock_present` no lugar de `delivery_timeout`.
  - **Sonda do autor anterior**, inalterada, sobre `322bcad` (observação, não gate): 0 de 400 rodadas com
    4 criações no 24.13.0 e no 24.22.1, todas `lock_present` (antes: 13/400 e 15/400).
- **Gates definidos depois do último código (`322bcad`) e antes de rodar**:
  - **Lista**: 43 arquivos de prova (`builder-t8c16-terminal/gate-files-322bcad.txt`, sha256
    `e26c5163…74d9`) — os 39 de `909b591`, `launch/agent.unit` e `launch/docs` (importam o produto),
    `privacy/no-network` (inicia `hook`) e a prova nova `traces/delivery.unit`. Os outros 24 não importam o
    produto nem iniciam produtor.
  - **Forma**: a registrada acima; scripts `run-target3.sh`, `make-clone-B3.sh`, `wsl-run3.sh`,
    `run-npm-test3.sh` e `isolated-temp.mjs` na pasta dos logs. O C não lê o perfil WSL nem o `/tmp`
    global; a pasta temporária de cada gate é a registrada na criação.
  - **Nativos do Hermes**: “12” são os 11 casos com o runtime do Hermes em `hermes-plugin.native` (os de
    `skip: SKIP`) mais a observação Hermes do I4-C35 (`skill-tree-hash.cli`); o caso pelo Python do
    sistema, sem runtime, não conta como nativo.
- **Resultado dos gates em `dc0db9b`** (código de `322bcad`; logs em `builder-t8c16-terminal/`):
  - **A**: 363 testes, 351 pass, 0 fail, 12 skip.
  - **B**: 363 testes, 351 pass, 0 fail, 12 skip; o T8-C16 original passou com 3 criações.
  - **C**: 363 testes, 343 pass, 0 fail, 20 skip.
  - Os 8 `I25-C46 prazo da entrega` passaram nos três. Os 357 nomes de topo são os mesmos em A, B e C —
    os de `cd4afc2` mais 18 (as 8 provas novas e os 10 testes dos três arquivos acrescentados), nenhum
    ausente —, e os skips são os de `cd4afc2` em nomes e motivos.
  - **D, vermelho e preservado**: o `npm test` saiu com **exit 1** depois de 35 min (17:46–18:21):
    governança 25/25, motor 16/16, doctor 417 (410/0/7), integrações 593 (579/**1**/13). A falha é o arquivo
    `tests/integrations/codex-run.cli.test.mjs` inteiro (`'test failed'` em `:1:1`, 2.054.779 ms): o último
    teste concluído dele foi o I4-C16; o I4-C16c (consumidor lento) e o I4-C17 não deram resultado. O
    resto da suíte, inclusive as 11 nativas do Hermes, a observação Hermes do I4-C35, o caso do Python do
    sistema e as 8 provas novas, passou; os 20 skips são os do D de `cd4afc2`.
    - O caminho não alcança o produto mudado: no I4-C16c o wrapper é `codex-exec`, sem par no ambiente e
      com `HOME` inexistente, e `captureDeliveryFor` devolve `null` sem carregar `traces/delivery.mjs`.
      O mesmo arquivo passou em A, B e C neste código (I4-C16c em 1.000, 899 e 628 ms) e no D de
      `cd4afc2` (750 ms). Nenhum processo da execução ficou vivo.
    - **Causa: desconhecida.** Não foi repetido nem corrigido: está fora dos defeitos de prazo/abandono
      autorizados, e o log só mostra que o arquivo parou depois do I4-C16.
- **Temporário**: cada pasta isolada (RED, sonda, A, B, D) foi criada e registrada pela execução e removida
  pelo caminho e `ino` registrados; a do C foi o `TMPDIR` dentro do scratch, removido pelo caminho, pasta,
  uid 1000 e inode. O clone do B e a cópia do RED foram removidos pelo caminho exato. Nada do perfil WSL nem
  do `/tmp` global foi lido. Exceção: as duas primeiras execuções do subconjunto de `concurrency.cli` no
  checkout (`red-store-*` e `green-store-*`) usaram o temporário do sistema, sem a pasta isolada; os
  scratches delas são removidos pelo `after()` do próprio arquivo, e não listei o temporário global para
  conferir. As do unit não criam temporário.
- **O que foi abandonado**: arredondar ou adiantar o timer; tolerância ou folga no prazo; aceitar 4 ou `>= 3`
  criações; teto de tentativas ou espera nova; mapear o abandono para `io_failure`; decidir o prazo no store;
  patch global de timers ou relógio; repetir o D ou investigar o `codex-run.cli` fora do escopo autorizado.
- **Pendentes, com o coordenador**: o D vermelho (`codex-run.cli`, causa desconhecida, fora deste
  escopo), o Verifier 19, a formal 12, a publicação e a CI nova. A causa histórica dos `delivery_timeout`
  e `lock_present` do Windows continua desconhecida: a correção do T8-C16 não a resolve. Nada aqui afirma
  PASS, `ready` nem CI verde.

Consumidor lento do I4-C16c — mesma sessão de autor, continuação (registros acima preservados):

- **Retificação aditiva de `a2ec111`** (o texto acima e os logs ficam como estão):
  - O D de `dc0db9b` não terminou sozinho. O coordenador interrompeu só o processo do
    `codex-run.cli.test.mjs` (PID 149528, criado às 17:47:34, sem filhos, 0,30 s de CPU), às 18:21:49,
    depois de conferir a identidade. O registro foi escrito antes do término:
    `builder-t8c16-terminal/coordinator-D-stall.json`.
  - O `exit 1` e o `593/579/1/13` são efeito desse término. O D está **incompleto, interrompido pelo
    coordenador para diagnóstico**: não é PASS nem demonstra defeito do produto.
  - Onde `a2ec111` diz “o `npm test` saiu com exit 1”, “D vermelho” e “a falha é o arquivo… inteiro”,
    leia D interrompido.
  - A, B e C de `dc0db9b` (363 testes cada) continuam provas daquele HEAD.
- **O que se decidiu** (coordenador): corrigir só a harness do I4-C16c, prova da #4 usada na regressão
  da #25, sem mudar produto, carga, intervalo, asserções, prazos, concorrência ou critérios. O candidato
  (EOF antes do `exit`) é reproduzido por RED determinístico antes da correção e não é chamado de causa
  histórica confirmada.
- **Leitura e fronteira** (antes do código): ~15k tokens (`codex-run.cli.test.mjs` 15 KB,
  `helpers/wrapper.mjs` 3 KB, o registro do coordenador e as seções usadas do checklist, build e
  handoff), mais ~25k previstos para gates. Uma fatia. Superfície: só
  `tests/integrations/codex-run.cli.test.mjs`. Produto, apoios, fixtures, workflow e prazos não mudam.
- **Observação antes do código** (não é prova; `builder-stdout-eof/pending-probe*`): a lógica anterior,
  copiada num arquivo descartável com um filho falso e o EOF antes do `exit`, deixou o processo do
  arquivo parado até o término externo, aos 120 s. O relatório saiu igual ao do D: `'test failed'` em
  `:1:1`, sem subteste. Isso é compatível com o D, mas não demonstra a ordem dos eventos naquela
  execução; o runner não cancela o teste pendente.
- **Gates** (a lista exata é recalculada depois do último código e registrada antes de rodar):
  - **RED/GREEN**: os controles com a lógica anterior extraída sem mudança e com a corrigida.
  - **A/B/C**: os 43 arquivos completos, com os controles novos no `codex-run.cli`, na mesma forma de
    antes. A pasta temporária de cada gate é criada e registrada pela execução e removida só pelo
    caminho, tipo e `ino` (no C, também o uid).
  - **D**: um único `npm test` completo no Windows 24.22.1 (teto 8, os nativos do Hermes), com orçamento
    de 2 h na chamada, definido antes; nada rastreado é editado durante ele.
  - Logs em `.checks/code-review/issue-25/builder-stdout-eof/`. Se algo travar de novo: registrar e
    investigar, sem timeout relaxado nem repetição sem mudança.
- **Onde a fronteira caiu**: registro em `fc5155b`; harness em `68f84c4` (só
  `tests/integrations/codex-run.cli.test.mjs`: a função privada `readStdoutSlowly`, usada pelo I4-C16c real,
  e os dois controles C46 (q)). Produto sem mudança desde `322bcad`.
  - **RED** (a função com a lógica de `a2ec111` extraída sem mudança — corpo de 13 linhas idêntico fora a
    indentação —, Windows 24.22.1, pasta temporária isolada): 4 testes, 3 pass, 1 fail. EOF antes do
    `exit`: `o exit depois do EOF resolve`, `false !== true`, e o arquivo terminou sem travar. O `exit`
    antes do EOF, o I4-C16 e o I4-C16c passaram.
  - **GREEN** (`68f84c4`): alvo 4/4; o arquivo inteiro deu 11 testes, 10 pass e 1 skip (I4-C15, POSIX).
  - **Mutações**, cada uma detectada: resolver só no `end` → `pendente sem o exit`; resolver só no `exit`
    → `pendente sem o EOF`.
- **Gates definidos depois do último código (`68f84c4`) e antes de rodar**:
  - **Lista**: os mesmos 43 arquivos de `dc0db9b` (`builder-stdout-eof/gate-files-68f84c4.txt`, sha256
    `e26c5163…74d9`, recalculada no HEAD). Só o `codex-run.cli`, que já está na lista, mudou; o esperado
    é 365 testes (363 mais os 2 controles).
  - **Forma**: a de `dc0db9b`, com os scripts `run-target4.sh`, `make-clone-B4.sh`, `wsl-run4.sh`,
    `run-npm-test4.sh` e `isolated-temp.mjs` em `builder-stdout-eof/`, um clone novo e roots novas.
  - **Orçamentos na chamada, definidos antes**: 1 h para cada um de A, B e C; 2 h para o D.
- **Resultado dos gates em `0ae940a`** (código de `68f84c4`, produto de `322bcad`; logs em `builder-stdout-eof/`):
  - **A**: 365 testes, 353 pass, 0 fail, 12 skip.
  - **B**: 365 testes, 353 pass, 0 fail, 12 skip.
  - **C**: 365 testes, 345 pass, 0 fail, 20 skip.
  - Em A, B e C passaram os 2 controles novos, o I4-C16c, as 8 provas de prazo e o T8-C16 original (3
    criações exatas). Os 359 nomes de topo são os mesmos nos três (os de `dc0db9b` mais os 2 controles,
    nenhum ausente), e os skips são os de `dc0db9b` em nomes e motivos.
  - **D**: o `npm test` completo terminou sozinho com **exit 0** (19:01:27–19:12:10). Resultado: 1.054
    testes, 1.034 pass, 0 fail, 20 skip — governança 25/25, motor 16/16, doctor 417 (410/0/7) e
    integrações 596 (583/0/13).
    - Passaram as 11 nativas do Hermes com runtime, a observação Hermes do I4-C35 (sem o diagnóstico
      de não executada), o I23-C8 pelo Python do sistema, o I4-C16c, o I4-C17, as 10 provas novas
      desta continuação e da anterior e os 9 T8-C16.
    - Os 20 skips são os do D de `cd4afc2`.
  - Depois de cada gate, `git status` vazio e nenhum processo `node` do repositório vivo.
- **Temporário**: as pastas isoladas do RED, do GREEN, de A, B e D foram removidas pelo caminho e pelo `ino`
  registrados; a do C, pelo caminho, uid 1000 e inode; o clone do B, pelo caminho exato. Nada do perfil
  WSL nem do `/tmp` global foi lido. A observação descartável e as mutações não criaram temporário.
- **O que isso prova e o que não prova**:
  - O RED reproduz de forma determinística o `end` perdido com o EOF antes do `exit`; a observação mostra
    que isso deixa o arquivo parado. A harness corrigida espera as duas ordens.
  - Não demonstra a ordem dos eventos no D interrompido de `dc0db9b`: a causa daquela parada continua não
    demonstrada.
  - As causas históricas da CI 93, do I23 e do T8-C4 continuam desconhecidas; a medição sintética
    4.500/4.500 não substitui o pipeline.
- **O que foi abandonado**: esperar o `close`; ler em fluxo desde o início; timeout, `--test-force-exit`
  ou menos linhas; controles sobre uma cópia corrigida da lógica; utilitário de streams novo; repetir o D
  de `dc0db9b` sem mudança.
- **Pendentes, com o coordenador**: o Verifier 19, a formal 12, a publicação, a CI nova e o merge, já
  autorizados. Nada aqui afirma PASS do Verifier, `ready` nem CI verde.

Prova da 3ª linha do C46 (m) — novo autor Claude, handoff do coordenador depois do FAIL da verificação 19
(registros acima preservados):

- **Falha concreta** (`.checks/issue-25-agent-launch.verified.md`, R19, F1; HEAD verificado `5ee0e0f`, relatório
  em `67a459b`):
  - o C46 (m) diz “com o pendente da 3ª; o lock com o `pid` da 3ª sai `de produtor 1 <rótulo>, processo 3 de 3`”;
  - a prova põe o pendente e o `pid` 3003 na 1ª linha (`evidence.unit.test.mjs:240`, `:246`) e afirma
    `processo 1 de 3` (`:259`, `:263`);
  - nenhuma asserção do repositório fixa `processo 3 de 3` como dono do lock.

  Os gates da R19 passaram (A 365/353/0/12, B 365/353/0/12, C 365/345/0/20, D 1.054/1.034/0/20). Não há teste
  vermelho nem defeito de produto demonstrado. O FAIL 19 fica como está.
- **O que se decidiu** (coordenador, depois do FAIL 19): fortalecer a prova sem trocar o literal.
  - O caso atual fica com o mesmo nome, entrada e asserções, como controle da 1ª linha.
  - Um caso novo põe o pendente e o `pid` do lock na 3ª linha, com valores literais.
  - A exigência original da 3ª linha permanece.
- **Alternativa abandonada**: a retificação documental (`3ª` → `1ª`, `processo 3 de 3` → `processo 1 de 3`). O
  root a preparou num template (`author-r19-doc-fix-template.txt`) antes de ler a razão inteira do FINAL e a
  abandonou. Com o `pid` na 1ª linha, uma montagem que desse sempre `processo 1 de n` ao dono do lock passaria
  na prova; o texto ficaria coerente e a lacuna, escondida.
- **Leitura e fronteira** (antes do código): ~35k tokens.
  - Lidos: `evidence.unit.test.mjs` (17,5 KB); as seções usadas de `helpers/traces.mjs` (`lockEvidence`,
    `treeOf`, `describeRecording`, `recordingProducers`; ~10 KB dos 34,6 KB); `helpers/producer-runs.mjs`
    (4,8 KB); o topo do relatório R19; o C46, o Landing e o Handoff do checklist; o fim do build e do handoff.
  - Previstos mais ~25k para os gates.
  - Uma fatia e uma superfície de código: só `tests/integrations/traces/evidence.unit.test.mjs`. Produto,
    apoios, scripts versionados, workflow, `package.json`, configuração, core, estado da revisão e
    `.verified.md` ficam só para leitura.
  - Nenhum consumidor importa o arquivo de teste: `git grep "traces/evidence.unit"` fora de `.checks` e `.tasks`
    não dá nada.
- **Provas** (executadas e registradas depois do código):
  - **GREEN**: o arquivo inteiro no checkout, Windows 24.22.1, com pasta temporária isolada; os dois casos de
    (m) passam.
  - **Prova discriminante** numa cópia descartável própria (`builder-r19-proof-fix/`), com um único mutante do
    apoio `helpers/traces.mjs`: o rótulo do dono do lock sai sempre `processo 1 de <n>`. Esperado: o caso atual
    passa, e o novo falha na asserção de `processo 3 de 3`. Sem mutação no checkout nem `stash`.
  - Não há RED do produto: o formatter correto deve passar os dois casos.
- **Gates** (a lista e os orçamentos são registrados depois do último código e antes de rodar):
  - **A/B/C**: o arquivo `evidence.unit.test.mjs` inteiro, sem filtro, numa invocação por ambiente, com
    concorrência 4, nas formas do R19:
    - A: Windows 24.22.1, no checkout;
    - B: clone git novo, Node 24.13.0 oficial, npm 11.6.2 adjacente, `npm_execpath` ausente, `core.autocrlf=true`
      só no clone, bin LF;
    - C: WSL uid 1000, `env -i`, `HOME`/`TMPDIR`/`RUNNER_TEMP` próprios, Node 24.13.0 copiado num prefixo sem
      `sh`, PATH sem `/usr/bin` e sem agentes, árvore do `git archive` do HEAD exato.

    `RUNNER_TEMP` presente e válido nos três. Orçamento de 1 h por gate na ferramenta.
  - **Os outros 42 arquivos** da lista de 43 não rodam de novo em A/B/C. Os resultados deles são **carry
    explícito** do Verifier 19 (`5ee0e0f`), condicionado à identidade dos blobs, demonstrada antes dos gates.
  - **D**: um `npm test` completo, Windows 24.22.1, runner padrão (teto 8), runtime Hermes versionado com o
    `HERMES_HOME` temporário das provas. Orçamento de 2 h na ferramenta, definido antes. Nada rastreado é editado
    durante ele; espero o término real.
  - Logs e auxiliares ficam em `.checks/code-review/issue-25/builder-r19-proof-fix/`. Nenhum auxiliar vai para o
    `/tmp` (Git Bash ou WSL) nem para o temporário global.
  - A pasta temporária de cada gate é criada e registrada pela execução. Ela é removida só pelo caminho exato,
    tipo, não link e `ino` (no C, também o uid 1000).
- **Proveniência de dois auxiliares do autor anterior** (`coordinator-r19-observations.json`; registro aditivo):
  - **O que houve**: depois do D de `0ae940a`, a comparação dos skips gravou `/tmp/d4.skips` e
    `/tmp/d-old.skips` pelo Git Bash (`grep … > /tmp/d4.skips; grep … > /tmp/d-old.skips; cmp -s …`).
  - **Onde**: no Git Bash, `/tmp` resolve para o temporário do usuário Windows (`AppData/Local/Temp`).
  - **Conteúdo**, pelo comando: nomes de testes e motivos de skip.
  - **Limite**: não houve inventário anterior nem criação exclusiva desses dois nomes. Não é possível provar que
    eram novos nem que nenhum conteúdo anterior foi substituído. Também não há evidência concreta de arquivo
    alheio sobrescrito.
  - **Escopo**: são auxiliares pós-gate, distintos das raízes de cada gate, que foram conferidas e removidas por
    caminho e `ino`. Não são o `/tmp` do WSL nem o perfil, e a auditoria metadata-only do perfil, feita pelo
    root, não os cobre.
  - Não li, não limpei nem restaurei esses arquivos nem o temporário global.
  - **Esclarecimento**: a frase “Nada do perfil WSL nem do `/tmp` global foi lido” aparece nos registros dos
    gates de `dc0db9b` (escrito em `a2ec111`, acima e no build) e de `0ae940a` (escrito em `10dfbe8`, acima). As
    formas do C dizem que o C não lê o `/tmp` global. Essas frases valem para a leitura nos gates e para o `/tmp`
    do WSL no C. Não dizem nada sobre esses dois auxiliares gravados no temporário do Windows.
  - **Preservados como estão**: a limpeza de 1.257 pastas no Windows e 107 no WSL (por prefixo, tipo, dono e
    janela de mtime, sem prova de proveniência nem auditoria de propriedade) e o incidente da R5 (`ffc5937`).
    Nada aqui afirma impacto zero.
- **Onde a fronteira caiu**: registro em `0954d3e`; código em `2473632`. Só
  `tests/integrations/traces/evidence.unit.test.mjs` mudou, com 34 linhas acrescentadas e nenhuma removida: o
  caso novo, depois do caso da 1ª linha. O caso da 1ª linha não mudou em nome, entrada nem asserções.
- **GREEN** (`builder-r19-proof-fix/green-2473632.*`; Windows 24.22.1, checkout, pasta temporária isolada): o
  arquivo inteiro deu 9 testes, 9 pass. Passaram os dois casos de (m) e os outros 7 do arquivo.
- **Prova discriminante** (`copy-*`, `mutation.txt`, `mutate-owner.mjs`):
  - Cópia descartável própria: `git archive` de `2473632` (sha256 `e3cb3ece…f75f`) extraído em
    `builder-r19-proof-fix/copy/`.
  - **Controle saudável na cópia**: 9 testes, 9 pass.
  - **Um único mutante** no `helpers/traces.mjs` da cópia: o rótulo do dono possível do lock passa de
    `processo ${k + 1} de ${tree.length}` a `processo 1 de ${tree.length}`. O cabeçalho das linhas da árvore não
    muda. O sha256 do arquivo passa de `eb2dd806…` a `efa3fa12…`.
  - **Com o mutante**: 9 testes, 8 pass, 1 fail.
    - O caso da 1ª linha **passou** (aceita a montagem errada).
    - O caso novo **falhou** em `evidence.unit.test.mjs:297`, a asserção `includes("raiz 1 (produtores 1, 2):
      lock presente, de produtor 1 wrapper codex, processo 3 de 3;")`. A mensagem trouxe `… processo 1 de 3`.
    - As asserções de ordem, dos pendentes e de `tempos`, que vêm antes dela, passaram. A de ausência de
      caminho e nonce (`:298`) vem depois e não chegou a rodar.
  - A cópia foi removida pelo caminho exato, depois de conferir pasta, não link e sem `.git`
    (`copy-cleanup.txt`).
  - Nada foi mutado no checkout, e não houve `stash`: o `git status` ficou vazio.
  - Não houve RED do produto, porque não há defeito de produto: o formatter correto passa os dois casos.
- **Raiz temporária deixada por um erro do meu script**: na 1ª execução do GREEN (`green-pre-commit`, antes do
  commit do código), a remoção rodou com o `TEMP` do gate, e a raiz pareceu não ser filha do temporário. A guarda
  recusou, e a raiz ficou. Logo depois, numa invocação com o `TEMP` original, ela foi removida pelo registro:
  caminho, nome, pasta não link e `ino` conferidos, 0 entradas. O script foi corrigido antes das outras execuções.
- **Identidade dos blobs** (`builder-r19-proof-fix/blob-identity.txt`, `5ee0e0f` × `2473632`):
  - fora de `.checks` e `.tasks`, só `tests/integrations/traces/evidence.unit.test.mjs` mudou (`26b8410` →
    `6ccbf48`);
  - têm a mesma árvore `src` (`51f0c98`), `tests/integrations/helpers` (`7931703`), `tests/integrations/fixtures`
    (`6591970`), `scripts` (`05923f9`, com o core), `.github` (`d9ee0d8`), `docs`, `tests/doctor`,
    `code-review.config.json`, `package.json`, `package-lock.json`, `.gitattributes` e `.gitignore`;
  - dos 43 arquivos da lista do R19 (`gate-files-r19.txt`, sha256 `e26c5163…74d9`), 42 têm o mesmo blob.
- **Gates definidos depois do último código (`2473632`) e antes de rodar** (`builder-r19-proof-fix/plan.txt`):
  - **Lista A/B/C**: `gate-files-2473632.txt` (sha256 `7d64e892…e83b`), um arquivo,
    `tests/integrations/traces/evidence.unit.test.mjs`, inteiro e sem filtro. Esperado: 9 testes, sem skip.
  - **Carry**: os outros 42 arquivos são carry explícito do Verifier 19 em `5ee0e0f`, condicionado à identidade
    acima. Não foram reexecutados em A/B/C, e não se alega rerun deles.
  - **Forma**: a do R19, com os scripts `run-target.sh`, `make-clone-B.sh`, `remove-clone-B.sh`, `wsl-run.sh`,
    `run-npm-test.sh` e `isolated-root.mjs` (prefixo `sm-b19p-`), um clone novo e raízes novas.
  - **Orçamentos na chamada, definidos antes**: 1 h para cada um de A, B e C; 2 h para o D.
  - **D**: esperado 1.055 testes (1.054 + 1).
  - Os gates rodam no HEAD deste registro, que só acrescenta docs a `2473632`.
- **Resultado dos gates em `8dee56d`** (árvore `53b79730…`; código de `2473632`; logs em `builder-r19-proof-fix/`):
  - **A** (20:08:40–20:08:47; Windows, Node 24.22.1, checkout): **9 testes, 9 pass, 0 fail, 0 skip**, exit 0.
    - `npm_execpath` ausente, `RUNNER_TEMP` presente (0 entradas antes e depois), temporário isolado.
    - Status vazio antes e depois.
  - **B** (20:09:15–20:09:21): **9/9/0/0**, exit 0.
    - Clone novo em `8dee56d`, com a árvore conferida e `core.autocrlf=true` no `.git/config` dele (o `gitconfig`
      do sistema do Git for Windows já tem `true`; nada global mudou).
    - Node 24.13.0 oficial: o `node.exe` (`d14ba95c…`) é o de dentro do zip, e o zip (`ca274269…`) confere com o
      `SHASUMS256.txt` local. npm 11.6.2 adjacente, `npm_execpath` ausente.
    - `cli.mjs` com `i/lf w/lf attr/text eol=lf` e 0 CR antes da execução.
    - Status do clone vazio antes e depois do `node_modules` e depois da execução.
    - O clone foi removido pelo caminho exato, depois de conferir toplevel, HEAD e status.
    - **Limite**: a conferência de CR do bin **depois** da execução falhou no meu script (o Python do Windows
      recebeu um caminho MSYS) e não foi feita. Este gate não roda o `npm link`.
  - **C** (20:09:40; WSL `Ubuntu`, uid 1000): **9/9/0/0**, exit 0.
    - `git archive` de `8dee56d` (6.318.080 bytes, `e560e5f2…`), com a árvore extraída igual a `HEAD^{tree}`, 0 CR
      e `cli.mjs` 755.
    - Node 24.13.0 copiado de `/usr/bin/nsolid` (`150946e4…`), num prefixo sem `sh`; npm 11.6.2.
    - `env -i` só com `HOME`, `LANG`, `PATH`, `RUNNER_TEMP` e `TMPDIR`; PATH sem `/usr/bin` e sem agentes.
    - O scratch `/tmp/sm-b19p-C.cKPLVV`, criado por `mktemp`, foi removido por caminho, pasta não link, uid 1000 e
      inode 2575.
  - **Nomes** (`matrix-ABC.txt`): os 9 nomes são iguais em A, B e C, todos `ok`, sem skip nem duplicado. Inclui os
    dois casos de (m).
  - **D** (20:10:06–20:20:40; `npm test` completo, Windows, Node 24.22.1, teto 8): terminou sozinho com **exit 0**.
    - **1.055 testes, 1.035 pass, 0 fail, 20 skip**: governança 25/25, motor 16/16, doctor 417 (410/0/7) e
      integrações 597 (584/0/13). É o D da R19 mais o caso novo, nas integrações.
    - Nenhum `✖`. Passaram os 11 nativos do Hermes com runtime, o ramo Hermes do I4-C35 (sem o diagnóstico de
      observação não executada) e o I23-C8 pelo Python do sistema, que não conta como nativo.
    - Passaram também os dois casos de (m), os 28 `I25-C46`, os 6 `I25-C47`, os 9 `T8-C16`, o I4-C16c, o I4-C17 e
      os `C50`.
    - Os 20 skips são iguais aos do D da R19 em nomes e motivos (`D-vs-R19.txt`).
    - `RUNNER_TEMP` com 0 entradas depois; HEAD e status iguais antes e depois. Nenhum processo `node` do
      repositório ficou vivo (`processes-after.txt`).
  - **Temporário**: as raízes `sm-b19p-*` de A, B e D (1, 20 e 128 entradas dos testes) e as do GREEN e da cópia
    foram removidas pelo registro. A do C foi removida pelo caminho, uid e inode. As pastas `runner-temp-*`
    vazias saíram por `rmdir`.
    - Nenhum auxiliar foi para o `/tmp` (Git Bash ou WSL) nem para o temporário global: logs, listas,
      comparações, o tar e a cópia ficaram em `builder-r19-proof-fix/`.
    - Nada do perfil foi lido, e nenhuma seleção foi feita por prefixo ou mtime.
- **O que isso prova e o que não prova**:
  - O (m) está provado como escrito pelo caso novo: pendente e dono do lock na 3ª linha, `processo 3 de 3`. O caso
    da 1ª linha continua como controle.
  - O mutante “sempre `processo 1 de n`” é aceito só pelo caso da 1ª e recusado pelo novo.
  - **Carry explícito do Verifier 19** (`5ee0e0f`), com os blobs iguais: os resultados A/B/C dos outros 42
    arquivos não foram reexecutados nesta continuação.
  - Os skips de integração do D que só rodam no POSIX (I4-C15, I4-C25b/j/k, I25-C5/C6/C15/C33/C42/C45, T8-C4)
    **não rodaram nesta continuação**: o C aqui só tinha o arquivo de teste. Ficam como carry do C da R19, com os
    mesmos blobs.
  - O I4-C25m e o I4-C25l e os 7 do doctor não rodaram em ambiente nenhum, como na R19.
  - Não é defeito de produto, e as causas históricas (CI 93, T8-C4, D interrompido de `dc0db9b`) continuam
    desconhecidas.
- **O que se decidiu no caminho** (além do Landing): nada novo com o coordenador nem com o usuário.
- **O que foi abandonado**:
  - retificar o literal (3ª → 1ª);
  - mover a entrada do caso da 1ª linha;
  - calcular o esperado pela posição do `pid`;
  - função ou módulo comum para os dois casos;
  - reexecutar os 42 arquivos inalterados em A/B/C;
  - ler, limpar ou restaurar `/tmp/d4.skips`, `/tmp/d-old.skips` ou o temporário global.
- **Pendentes, com o coordenador**: o registro da verificação 20 e o despacho dela, sobre a feature inteira, com
  carry explícito da 19 para o que não mudou e as provas novas de A/B/C (o arquivo) e do D inteiro. Depois, a
  formal 12, já autorizada, a publicação, a CI e o merge. O FAIL 19 fica como está. Nada aqui afirma PASS, `ready`
  nem CI verde.

Ambiente do passo de integrações no Windows — novo autor Claude, depois da CI de `86c7677` (registros acima
preservados):

- **Evidência** (HEAD publicado `86c7677`, com o Verifier 20 PASS 50/50 e a formal 12 `ready`):
  - **PR 40790722204**: os cinco checks verdes; Windows 1.055/1.024/0/31. O caso novo da 3ª linha do C46 (m)
    passou nos três sistemas, e o I4-C25m passou de fato no macOS. A CI não tem o runtime do Hermes: os nativos
    não rodaram lá. Localmente, o D da R20 passou os 11 nativos e o ramo Hermes do I4-C35.
  - **Manual 40790906319**: diagnóstico, Ubuntu e macOS verdes; Windows e agregado vermelhos. No Windows,
    governança 25/25, motor 16/16, doctor 410/0/7 e integrações 597/570/3/24. Falharam:
    - `control.cli.test.mjs:547` (I23-C4): `listCaptures` com `lock_present`; um `writeExclusive segmento.tmp`
      estava pendente há 310 ms, depois de 424 ms de operações concluídas, e o lock continuava presente;
    - `control.cli.test.mjs:906` (I23-C4): um hook com `open lock` pendente há 651 ms, laço de eventos 25,6 ms,
      CPU 15 ms e lock de 0 byte;
    - `concurrency.cli.test.mjs:1008`: o controle positivo do C46 (relógio aquém do prazo) com
      `delivery_timeout` e nenhum produtor registrado.
  - Log integral em `.checks/code-review/issue-25/ci86-windows-manual40790906319.log` (sha256 `1013b30f…974b`).
  - **Medição do mesmo job** (`measurement40790906319.json`, `-validation.json` e `.log`): mesmo runner, A1 (`C:`),
    B (`D:`, `RUNNER_TEMP`) e A2 (`C:`); 3 produtores × 500 ciclos e 3 cargas de 64 KiB com flush por fase, teto
    120 s; 4.500/4.500 ciclos, 0 erro, 0 incompleto, 0 amostra ≥ 600/650 ms, filhos com exit 0, 3 pastas
    removidas. Tomada p50/p99/máximo: A1 0,832/6,491/46,601; B 0,539/1,629/4,262; A2 0,834/6,374/17,222 ms.
    Liberação: A1 1,043/5,765/14,875; B 0,912/3,003/10,243; A2 1,069/5,149/7,703 ms.
  - **Limite**: a medição compara o componente de E/S do lock sob carga comparável no mesmo runner. Não reproduz o
    pipeline das provas, não demonstra a causa das falhas e não prova que elas deixam de ocorrer. Nenhuma causa
    física (antivírus, disco, hardware) foi demonstrada, e nada aqui afirma produto corrigido.
- **Decisão do coordenador** ([6484289722](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6484289722);
  reversível, só na CI; o usuário foi informado): `RUNNER_TEMP` como `TEMP`/`TMP` só no passo de integrações da
  matriz Windows. A forma literal e as alternativas rejeitadas estão nas linhas “Ambiente do passo de integrações no
  Windows” e “Exceção ao C48 (passo de integrações)” do Landing; as provas, no acréscimo do C48; a evidência, na
  seção de mesmo nome da task.
- **Leitura e fronteira** (antes do código): ~65k tokens lidos (`AGENTS.md`, `CLAUDE.md`, o `SKILL.md` e o formato
  do checklist do tlc-implement, o workflow, `governance-ci.test.mjs`, `fixtures-inventory.test.mjs`,
  `test-integrations.mjs`, `package.json`, `Sources`/`Landing`/S11/S12/o fim do `Handoff` deste checklist, a task
  das linhas 432 a 728, o topo R20 do `.verified.md`, o fim do build e do handoff `ci40728221657`, os comentários
  6467154706 e 6484289722, os trechos das falhas no log e os scripts dos gates da R20). Mais ~30k previstos para
  provas e gates.
  - Uma fatia, uma superfície: `.github/workflows/governance.yml` e `scripts/governance-ci.test.mjs`. Produto,
    testes funcionais, apoios, fixtures, `package.json`, os outros scripts, core, configuração, estado da revisão e
    `.verified.md` ficam só para leitura.
  - Consumidores do workflow fora da governança: `I4-C47` (`fixtures-inventory.test.mjs:57`) exige um passo do
    `verify` com `run === "npm run test:integrations"`. O ramo dos outros sistemas mantém esse `run` exato; não há
    impedimento.
- **Sondagem antes do código** (`.checks/code-review/issue-25/builder-ci86-temp/explore/`: `probe.mjs`,
  `probe2.mjs` e as saídas; descartável, fora do checkout): `C:\Program Files\PowerShell\7\pwsh.exe`, env mínimo
  com telemetria e checagem de versão desligadas, `npm.cmd` falso num `bin` próprio.
  - Na forma do runner (`-Command ". '<arquivo>'"`): npm 0 → pwsh 0; npm 17 → `$LASTEXITCODE` 17 dentro do script
    e pwsh 1; sem o `exit $LASTEXITCODE`, npm 17 → pwsh 0. Com `-File`, npm 17 → 17.
  - O `throw` sai 1, com a mensagem no stderr; ausente, vazio, relativo, inexistente e arquivo saíram 1 sem chamar
    o npm. Com o prefixo e o sufixo documentados do runner, os códigos foram os mesmos (1 com npm 17; 1 com
    relativo).
- **Provas planejadas** (acréscimo do C48): a estrutural em todo sistema e a do pwsh real no Windows, com RED contra
  o workflow de `86c7677` e mutantes de configuração, roteamento e propagação numa cópia descartável
  (`builder-ci86-temp/`), sem mutação no checkout.
- **Gates**: a lista e os orçamentos ficam registrados depois do último código e antes de rodar.
- **Onde a fronteira caiu**: registro em `c7e8f14`; código em `169e845`. Só `.github/workflows/governance.yml`
  (+17/−1: o `if` do ramo dos outros sistemas, o comentário e o ramo do Windows) e `scripts/governance-ci.test.mjs`
  (+205/−1: dois imports, a lista de `governance-C1 C3` sem o ramo do Windows e os dois `governance-C48`).
  Nenhum outro arquivo executável mudou.
- **RED** (`builder-ci86-temp/red-86-workflow.*`; Windows 24.22.1, checkout, temporário isolado): o arquivo de prova
  novo, ainda sem commit, contra o workflow de `86c7677` (blob `474a87b`, o mesmo do HEAD daquele momento): 9 testes,
  7 pass, 2 fail. Falharam os dois `governance-C48`: o estrutural na lista dos passos (sem o `if` no passo de
  integrações) e o do pwsh em `ramo Windows das integrações` (nenhum ramo). O `governance-C1 C3` adaptado passou
  nele: a lista dos cinco comandos é a mesma decisão de antes.
- **GREEN**: antes do commit (`green-pre-commit.*`), 9/9; no commit (`green-169e845.*`), o comando do Proof do C48,
  3/3 (`governance-C1 C3` e os dois `governance-C48`), com `ℹ pwsh: C:\Program Files\PowerShell\7\pwsh.exe` (pwsh
  7.6.9). O comentário do YAML mudou entre os dois (só texto de comentário). O consumidor `I4-C47` passou 1/1 no
  commit (`i4c47-169e845.*`).
- **Prova discriminante** (`mutants.mjs`, `mutation.json`, `mutants2-169e845.*`; cópia do `git archive` de
  `169e845`, sha256 `4d2c7d55…5ce0`, em `builder-ci86-temp/copy/`, com o `node_modules` do checkout):
  - controle saudável: 9/9;
  - o `governance-ci.test.mjs` de `86c7677` contra o workflow novo: 7 testes, 1 fail, o `governance-C1 C3` antigo
    (a lista com seis `run`). A adaptação era necessária;
  - um mutante do workflow por vez, sempre recusado (9 testes em cada):

    | Mutante | Falhou | Onde |
    | --- | --- | --- |
    | M1 roteamento: ramo Windows com `matrix.os == 'windows-2022'` | `C1 C3`, os dois `C48` | lista; `if`; ramo ausente |
    | M2 roteamento: ramo dos outros com `matrix.os == 'ubuntu-22.04'` (macOS sem integrações) | `C48` estrutural | lista dos passos |
    | M3 propagação: sem `exit $LASTEXITCODE` | `C48` pwsh | npm 17 → `status` 0, esperado 1 |
    | M4 propagação: `exit 0` | `C48` pwsh | npm 17 → `status` 0, esperado 1 |
    | M5 configuração: `$destino = $env:TEMP` no lugar do `throw` (fallback) | `C48` pwsh | `ausente`: npm chamado, `status` 0 |
    | M6 configuração: sem `IsPathFullyQualified` | `C48` pwsh | `relativo`: npm chamado, `status` 0 |
    | M7 configuração: sem `$env:TMP = $destino` | os dois `C48` | variáveis; `TMP` do npm |
    | M8 persistência: `Add-Content` no `$env:GITHUB_ENV` | os dois `C48` | variáveis; `GITHUB_ENV` não vazio |
    | M9 argumentos: `-- --test-concurrency=1` | os dois `C48` | linha `npm`; `argv` |
    | M10 `env` no ramo dos outros sistemas | `C48` estrutural | lista dos passos |
    | M11 `env` no job `verify` | `C48` estrutural | `env` do job |
    | M12 orçamento 30 no Windows | `C48` estrutural | `timeout-minutes` |
    | M13 `shell: pwsh -File {0}` no ramo Windows | `C48` estrutural | chaves do passo |

  - M3–M6 passam no estrutural e só o pwsh real os recusa; M10–M13 só o estrutural os recusa.
  - A cópia foi restaurada depois de cada mutante (o workflow e o teste dela tinham, no fim, os blobs `f24e82d` e
    `971e866`, os do HEAD) e removida pelo caminho exato, depois de conferir pasta, não link e sem `.git`
    (`copy-cleanup.txt`). Nada foi mutado no checkout, e não houve `stash`.
  - A 1ª série (`mutants-169e845-1.log`, `mutation-1.json`) deu os mesmos resultados, sem o detalhe das asserções;
    a 2ª só acrescentou esse detalhe.
- **Identidade** (`builder-ci86-temp/blob-identity.txt`, `86c7677` × `169e845`): fora de `.checks` e `.tasks`, só o
  workflow (`474a87b` → `f24e82d`) e `governance-ci.test.mjs` (`bfe5a0c` → `971e866`). Iguais: `src` (`51f0c98`),
  `tests` (`e77a618`, com `helpers` `7931703` e `fixtures` `6591970`), `tests/doctor` (`bcedb83`), `docs`
  (`d9f546f`), `scripts/code-review` (`6b98d7c`, os cinco blobs do core), `ci-lock-latency.mjs` (`8c12894`) e
  `ci-lock-latency.test.mjs` (`75eeadd`) — o C49/C50 byte a byte —, `test-integrations.mjs`, `package.json`,
  `package-lock.json`, `code-review.config.json`, `.gitattributes` e `.gitignore`. Dos 247 arquivos rastreados em
  `src`, `tests` e `scripts`, 246 têm o mesmo blob; o outro é `governance-ci.test.mjs`.
- **Incidente meu, de rede** (antes da sondagem): para ver a versão, rodei uma vez `pwsh -NoProfile -NonInteractive
  -Command '$PSVersionTable.PSVersion.ToString()'` com o `pwsh` do PATH da sessão (o do runtime do Codex, 7.6.5), sem
  `POWERSHELL_TELEMETRY_OPTOUT`. Pelo comportamento documentado do PowerShell 7, essa inicialização pode ter enviado a
  telemetria de início (versão, sistema, identificador anônimo). Não verifiquei se houve envio; nenhum conteúdo do
  repositório foi passado ao pwsh. Todas as outras chamadas de pwsh (sondas, provas e linhas de versão dos meus
  scripts) usaram o pwsh oficial com a telemetria e a checagem de versão desligadas.
- **Limite do pwsh nas provas**: o pwsh roda sem perfil, mas, como em qualquer uso, pode atualizar os próprios caches
  de execução no `LocalAppData` do usuário Windows e procurar módulos nos caminhos padrão. Não li nem limpei nada disso.
- **Gates definidos depois do último código (`169e845`) e antes de rodar** (`builder-ci86-temp/plan.txt`):
  - **A/B/C**: `npm run test:governance` completo (os dois arquivos, todos os casos), uma invocação sem filtro por
    ambiente, com `RUNNER_TEMP` presente e válido e o temporário numa raiz própria registrada:
    - A: Windows 24.22.1, checkout, `C:\Program Files\PowerShell\7` primeiro no PATH. Esperado 27/27/0/0, com o caso
      do pwsh real executado;
    - B: clone git novo, Node 24.13.0 oficial, npm 11.6.2 adjacente, `npm_execpath` ausente, `core.autocrlf=true` só
      no clone (o workflow em CRLF), bin LF; mesmo PATH do pwsh. Esperado 27/27/0/0, com o caso do pwsh executado;
    - C: WSL uid 1000, `env -i`, `HOME`/`TMPDIR`/`RUNNER_TEMP` próprios, Node 24.13.0 copiado num prefixo sem `sh`,
      PATH sem `/usr/bin` e sem agentes, árvore do `git archive` do HEAD exato. Esperado 27 testes, 26 pass, 1 skip
      (o caso do pwsh, com o motivo).

    Orçamento de 10 min por gate na ferramenta.
  - **D**: um `npm test` completo, Windows 24.22.1, runner padrão (teto 8), runtime Hermes das provas versionadas,
    orçamento de 2 h na ferramenta, definido antes. Nada rastreado é editado durante ele; espero o término real.
    Esperado, se nada falhar: 1.057 testes (1.055 + 2), governança 27/27, os mesmos 20 skips da R20. O D não mede o
    runner da CI: o passo novo só é provado no runner pela CI do novo HEAD.
  - Logs e auxiliares em `builder-ci86-temp/`; nenhum no `/tmp` (Git Bash ou WSL) nem no temporário global.
- **Resultado dos gates em `a50870f`** (árvore `27d9e5c1…`; código de `169e845`; uma execução de cada, sem filtro e sem
  repetição; logs em `builder-ci86-temp/`):
  - **A** (21:49:20–21:49:28; Windows, Node 24.22.1, npm 11.19.1, checkout): `npm run test:governance`, **27 testes,
    27 pass, 0 fail, 0 skip**, exit 0.
    - `npm_execpath` ausente; `RUNNER_TEMP` numa pasta própria, 0 entradas depois; temporário na raiz isolada.
    - O caso do pwsh real **executou**: `✔` e `ℹ pwsh: C:\Program Files\PowerShell\7\pwsh.exe` (7.6.9).
    - Status vazio antes e depois.
  - **B** (21:50:02–21:50:38): **27/27/0/0**, exit 0.
    - Clone novo em `a50870f`, com a árvore conferida e `core.autocrlf=true` no `.git/config` dele (o `gitconfig` do
      sistema do Git for Windows já tem `true`; nada global mudou). O workflow saiu em CRLF (111 CR) e foi lido igual.
    - Node 24.13.0 oficial: o `node.exe` (`d14ba95c…`) é o de dentro do zip, e o zip (`ca274269…`) confere com o
      `SHASUMS256.txt` local. npm 11.6.2 adjacente, `npm_execpath` ausente.
    - O caso do pwsh real **executou**, com o mesmo pwsh, e o npm falso chamou o Node 24.13.0 do clone.
    - `cli.mjs` com `i/lf w/lf attr/text eol=lf` e 0 CR antes e depois; status do clone vazio antes e depois do
      `node_modules` e depois da execução. O clone foi removido pelo caminho exato, depois de conferir toplevel, HEAD
      e status (`B-clone-cleanup.txt`).
  - **C** (21:51:55–21:51:59; WSL `Ubuntu`, uid 1000): **27 testes, 26 pass, 0 fail, 1 skip**, exit 0.
    - `git archive` de `a50870f` (6.410.240 bytes, `ae8ee253…`), com a árvore extraída igual a `HEAD^{tree}`, 0 CR
      em `src/`, `tests/`, `scripts/` e `.github/`, e `cli.mjs` 755.
    - Node 24.13.0 copiado de `/usr/bin/nsolid` (`150946e4…`), num prefixo sem `sh`; npm 11.6.2.
    - `env -i` só com `HOME`, `LANG`, `PATH`, `RUNNER_TEMP`, `TMPDIR` e `npm_config_update_notifier=false`. A última
      é a única diferença para a forma do R19/R20: o alvo agora é `npm run`, e o npm, com o `HOME` novo, consultaria o
      registro na rede para avisar de versão. PATH sem `/usr/bin`, sem agentes e sem `pwsh`.
    - O skip é o caso do pwsh real, com o motivo `o ramo roda no pwsh do runner Windows; fora dele, só a estrutura
      (governance-C48 integrações)`. O `governance-C48` estrutural passou.
    - O scratch `/tmp/sm-b86t-C.NILZGJ`, criado por `mktemp`, foi removido por caminho, pasta não link, uid 1000 e
      inode 11548.
  - **Nomes** (`matrix-ABC.txt`): os 27 nomes são iguais em A, B e C; 26 `pass` nos três; o do pwsh real `pass` em
    A e B e `skip` em C. Sem duplicado.
  - **D** (21:52:58–22:01:28; `npm test` completo, Windows, Node 24.22.1, teto 8; orçamento de 2 h na ferramenta,
    em segundo plano só por isso, com espera em primeiro plano lendo só o registro): terminou sozinho com **exit 0**.
    - **1.057 testes, 1.037 pass, 0 fail, 20 skip**: governança 27/27, motor 16/16, doctor 417 (410/0/7) e
      integrações 597 (584/0/13). Nenhum `✖` nem `not ok`.
    - Contra o D da R20 (`D-vs-R20.txt`): as únicas linhas de resultado novas são os dois `governance-C48`, `✔`;
      nenhuma linha da R20 sumiu ou mudou de marca. Os 20 skips são os mesmos, em nomes e motivos.
    - O caso do pwsh real rodou no D (`ℹ pwsh: C:\Program Files\PowerShell\7\pwsh.exe`).
    - Passaram os 11 nativos do Hermes com runtime (`I4-C18` a `C23`, `C37`, `C44b`, `I25-C40 harness nativa` e os
      dois `I23-C8` com runtime), o I4-C35 sem o diagnóstico de observação Hermes não executada e o I23-C8 pelo
      Python do sistema, que não conta como nativo (`D-hermes.txt`).
    - HEAD e status iguais antes e depois; `RUNNER_TEMP` com 0 entradas depois. Nenhum processo `node`, `pwsh`,
      `python` ou `cmd` com o repositório ou as minhas raízes na linha de comando ficou vivo (`processes-after-D.txt`).
  - **Temporário**: as raízes `sm-b86t-*` de A, B, D, do RED, dos GREEN, do I4-C47 e das duas séries de mutantes
    foram removidas pelo registro (caminho real, filha direta do temporário, nome, pasta não link, `dev`/`ino`; o D
    deixou 128 entradas dos testes). A do C, por caminho, uid e inode. As pastas `runner-temp-*`, vazias, saíram por
    `rmdir`. Nenhuma seleção por prefixo ou mtime; nenhum auxiliar no `/tmp` (Git Bash ou WSL) nem no temporário
    global. A ferramenta guardou a própria cópia da saída do D (`AppData\Local\Temp\claude\…\tasks\b1pwobpq8.output`);
    não é auxiliar meu, e não a li nem apaguei.
- **O que isso prova e o que não prova**:
  - O ramo do Windows, na forma do runner e no pwsh real, põe `TEMP`/`TMP` no `RUNNER_TEMP` só no processo do passo,
    chama o npm com os mesmos argumentos, sai 0 com o npm em 0 e falha (1) com o npm em 17, e para antes do npm com
    `RUNNER_TEMP` ausente, vazio, relativo, inexistente ou arquivo, sem `GITHUB_ENV`/`GITHUB_PATH` e sem apagar o
    `RUNNER_TEMP`. Os outros sistemas ficam com o passo de antes. Os 13 mutantes são recusados.
  - **Não** prova o passo no runner da CI nem que as falhas da CI de `86c7677` deixam de ocorrer: isso é da CI do
    novo HEAD, do coordenador. Nenhuma causa física foi demonstrada, e o produto não mudou.
  - O D é deste computador, com a raiz própria; não mede o runner.
  - O `I4-C25m` (macOS), o `I4-C25l` e os 7 skips do doctor não rodaram aqui; os skips POSIX do D continuam como
    carry do C da R19, com os mesmos blobs.
  - **Limites de ambiente**: em A, B e D o npm usou o cache do usuário, que não li; pelo código do npm 11, ele só
    consulta o registro (`npm@latest`) se o carimbo do aviso de versão tiver mais de 7 dias, sem CI detectada nem
    `update-notifier=false` — a mesma condição dos D anteriores. O pwsh pode ter atualizado os próprios caches no
    `LocalAppData`. O incidente de telemetria acima continua registrado.
- **O que se decidiu no caminho** (além do Landing): o código de saída 1 do pwsh para o npm em 17, descoberto na
  sondagem e registrado no Landing antes do código; `npm_config_update_notifier=false` no `env -i` do C. Nada novo
  com o coordenador nem com o usuário.
- **O que foi abandonado**:
  - devolver 17 literal (`shell: pwsh -File {0}` ou `[Environment]::Exit`);
  - conferir o texto do `stderr` do `throw` na prova (a visão concisa do pwsh corta e colore a linha conforme a
    largura; o código 1 e o npm não chamado decidem);
  - comparar o ambiente inteiro recebido pelo npm falso (o pwsh e o `cmd` acrescentam variáveis próprias; a prova
    usa as variáveis do contrato e uma sentinela);
  - um avaliador geral de expressões do GitHub (a prova só aceita as duas formas de `if` do workflow).
- **Pendentes, com o coordenador**: o registro e o despacho da verificação 21 e da formal 13 sobre o conteúdo novo,
  a publicação, a CI do novo HEAD (a prova do passo no runner) e o merge, já autorizado só com toda a CI verde. Nada
  aqui afirma PASS, `ready`, CI verde nem causa física demonstrada. Preservados como estão: o incidente da R5
  (`ffc5937`), a limpeza de 1.257 pastas no Windows e 107 no WSL sem prova de proveniência e os dois auxiliares
  pós-D do Windows em `/tmp` do Git Bash; nada aqui afirma impacto zero.

Literal do caminho no `-Command` da prova nativa do C48 — mesmo autor Claude, revisão pontual do coordenador sobre
`c68a392` (registros e gates acima preservados; os gates de `a50870f` são anteriores e não provam esta correção):

- **Achado** (`.checks/code-review/issue-25/coordinator-ci-temp-path-review.md`): `governance-ci.test.mjs` passa ao
  `-Command` a expressão `. '${script}'` sem escapar a aspa simples do caminho. Um caminho Windows válido com `'`
  fecha o literal e quebra o comando. Defeito candidato da harness, não do produto nem da guarda do `RUNNER_TEMP`.
- **Decisões do coordenador nesta revisão**: o 17 → 1 sob o `-Command` está documentado como deve; manter o shell
  padrão e o sentido “não zero continua falha”, sem `-File`, sem `[Environment]::Exit` e sem pedir decisão nova. A CI
  não precisa preservar o número 17; precisa não virar sucesso. Os códigos dos agentes e do produto não mudam.
- **Sondagem** (`builder-ci86-temp/path-fix/explore/probe-quote.mjs` e a saída; pwsh oficial 7.6.9 com telemetria e
  checagem de versão desligadas; script próprio que só escreve uma linha): o candidato se confirma com o nome
  `passo ' literal.ps1` (sem escape: status 1, nada roda; com a aspa dobrada: status 0, roda). As quatro aspas
  tipográficas também fecham o literal e só deixam de quebrar com todas as cinco dobradas. Forma e alternativas:
  linha “Literal do caminho no `-Command` da prova nativa do C48” do Landing; provas: 2º acréscimo do C48.
- **Leitura e fronteira** (antes da correção): ~10k tokens novos (a revisão, o trecho da prova nativa e os registros
  desta fatia); mais ~30k para RED, mutantes e gates. A mesma fatia e a mesma superfície: só
  `scripts/governance-ci.test.mjs`. O workflow de `169e845`, o produto, os testes funcionais, os apoios, os outros
  scripts, a configuração, o core e o `.verified.md` ficam só para leitura.
- **Provas planejadas**: RED no checkout com os controles com aspa e sem o escape (sem commit; a falha e o diff
  ficam em `path-fix/`); GREEN com o escape; depois do commit, numa cópia descartável, os mutantes “sem escape” e
  “só a ASCII dobrada”. Gates A/B/C/D novos, com rótulos, raízes e scripts novos em `path-fix/`, definidos depois do
  último código e antes de rodar.
- **Onde a fronteira caiu**: registro em `0ae77b3`; código em `0caf9be`. Só `scripts/governance-ci.test.mjs` (blob
  `971e866` → `5313dba`, +29/−4), no teste `governance-C48 ramo Windows das integrações no pwsh real: …`: a lista
  `quoted` com os dois arquivos, o 3º parâmetro `file = script` de `step`, o literal com as aspas dobradas e os
  controles depois dos casos inválidos. No código, as quatro aspas tipográficas aparecem como sequências de escape
  Unicode do JavaScript (barra invertida, `u` e o código, de 2018 a 201B), no nome do arquivo e no regex: o mesmo
  conjunto que a linha do Landing mostra com os caracteres. O workflow continua `f24e82d`.
- **RED** (`path-fix/pf-red.*`, `red.patch` com sha256 `1ec6a548…18d3`; Windows 24.22.1, checkout, temporário
  isolado; a prova com os controles e **sem** o escape, sem commit): 9 testes, 8 pass, 1 fail — o do pwsh real, em
  `governance-ci.test.mjs:560`, com o rótulo `passo ' literal.ps1`: `{status: 1, npm: null}` no lugar de
  `{status: 0, npm: <o recebido>}`. As asserções vêm em sequência, então rodaram e passaram antes dela: npm 0 → 0 e
  npm 17 → 1 com `passo.ps1` e os cinco inválidos. As conferências finais não chegaram a rodar.
- **GREEN**: com o escape, antes do commit, 9/9 (`pf-green-pre-commit.*`; de novo depois de trocar os caracteres pelas
  escapes, `pf-green-pre-commit2.*`, 9/9); no commit, o Proof do C48 deu 3/3 (`pf-green-0caf9be.*`), com
  `ℹ pwsh: C:\Program Files\PowerShell\7\pwsh.exe`. Os 9 testes e os nomes não mudaram.
- **Prova discriminante** (`path-fix/mutants.mjs`, `mutation.json`, `pf-mutants-0caf9be.*`; cópia do `git archive` de
  `0caf9be`, sha256 `168c8e04…1ac6`, com o `node_modules` do checkout):
  - controle: 9/9;
  - **sem escape** (o literal com o caminho como está): 1 fail, o do pwsh real, no rótulo `passo ' literal.ps1`, com
    `status: 1` e `npm: ~` (não chamado) no lugar de `status: 0` e o recebido. Os casos sem aspa passaram antes;
  - **só a ASCII dobrada**: 1 fail, o do pwsh real, no rótulo `passo ‘’‚‛ literal.ps1`, também com `status: 1` e o npm
    não chamado. O arquivo `passo ' literal.ps1` (0 e 17) e os casos sem aspa passaram antes.
  - A cópia foi restaurada depois de cada mutante (o teste dela voltou ao blob `5313dba`) e removida pelo caminho
    exato, depois de conferir pasta, não link e sem `.git` (`path-fix/copy-cleanup.txt`). O checkout não foi mutado.
- **Identidade** (`path-fix/blob-identity.txt`): de `169e845` a `0caf9be`, fora de `.checks`/`.tasks`, só
  `governance-ci.test.mjs`; contra `86c7677`, só ele e o workflow `f24e82d`. `src`, `tests`, `docs`, o core,
  `ci-lock-latency.*`, `test-integrations.mjs`, `package*`, configuração, `.gitattributes` e `.gitignore` iguais; 246
  dos 247 arquivos rastreados em `src`, `tests` e `scripts` com o mesmo blob de `86c7677`.
- **Gates definidos depois do último código (`0caf9be`) e antes de rodar** (`path-fix/plan.txt`): rótulos `pf-A`,
  `pf-B`, `pf-C` e `pf-D`, raízes `sm-b86p-*` e scripts novos em `path-fix/`, derivados dos de `builder-ci86-temp/` só
  nos caminhos, prefixos e rótulos. A repetição se justifica pela mudança da harness; os gates de `a50870f` ficam como
  estão e não provam esta correção.
  - **pf-A/pf-B/pf-C**: `npm run test:governance` completo, uma invocação sem filtro por ambiente, nas formas de A, B
    e C acima (C com `npm_config_update_notifier=false` no `env -i`). Esperado 27/27/0/0 em A e B, com o caso do pwsh
    real executado, e 27/26/0/1 em C (o skip é esse caso). Orçamento de 10 min por gate na ferramenta.
  - **pf-D**: um `npm test` completo, Windows 24.22.1, teto 8, nativos do Hermes, orçamento de 2 h na ferramenta,
    sem editar nada rastreado durante ele. Esperado, se nada falhar: 1.057/1.037/0/20, com as mesmas linhas de
    resultado do D de `a50870f`.
- **Resultado dos gates em `9b087dc`** (árvore `b894f255…`; código de `0caf9be`; uma execução de cada, sem filtro e
  sem repetição; logs em `builder-ci86-temp/path-fix/`):
  - **pf-A** (22:16:24–22:17:07; Windows, Node 24.22.1, npm 11.19.1, checkout): `npm run test:governance`, **27
    testes, 27 pass, 0 fail, 0 skip**, exit 0. O caso do pwsh real **executou**, com os controles com aspa (`✔` e
    `ℹ pwsh: C:\Program Files\PowerShell\7\pwsh.exe`, 7.6.9). `npm_execpath` ausente; `RUNNER_TEMP` com 0 entradas
    depois; status vazio antes e depois.
  - **pf-B** (22:17:43–22:18:22): **27/27/0/0**, exit 0. Clone novo em `9b087dc`, árvore conferida,
    `core.autocrlf=true` no `.git/config` dele; o workflow e o teste saíram em CRLF. Node 24.13.0 oficial
    (`d14ba95c…`, zip `ca274269…` conferido), npm 11.6.2 adjacente, `npm_execpath` ausente. O caso do pwsh real
    **executou**. `cli.mjs` com 0 CR antes e depois; status do clone vazio; clone removido pelo caminho exato, depois
    de conferir toplevel, HEAD e status (`pf-B-clone-cleanup.txt`).
  - **pf-C** (22:18:35–22:18:39; WSL `Ubuntu`, uid 1000): **27 testes, 26 pass, 0 fail, 1 skip**, exit 0. `git
    archive` de `9b087dc` (6.440.960 bytes, `560874c3…`), árvore = `HEAD^{tree}`, 0 CR, `cli.mjs` 755. Node 24.13.0
    copiado (`150946e4…`) num prefixo sem `sh`, npm 11.6.2. `env -i` com `HOME`, `LANG`, `PATH`, `RUNNER_TEMP`, `TMPDIR`
    e `npm_config_update_notifier=false`; PATH sem `/usr/bin`, sem agentes e sem `pwsh`. O skip é o caso do pwsh real,
    com o motivo de sempre. O scratch `/tmp/sm-b86p-C.qP2w0y` foi removido por caminho, pasta não link, uid 1000 e
    inode 9361.
  - **Nomes** (`path-fix/matrix-pf-ABC.txt`): os 27 nomes são iguais em pf-A, pf-B, pf-C e no A de `a50870f`; 26
    `pass` nos três; o do pwsh real `pass` em pf-A e pf-B e `skip` em pf-C.
  - **pf-D** (22:19:02–22:32:26; `npm test` completo, Windows, Node 24.22.1, teto 8; orçamento de 2 h na ferramenta,
    em segundo plano só por isso, com espera em primeiro plano lendo só o registro): terminou sozinho com **exit 0**.
    - **1.057 testes, 1.037 pass, 0 fail, 20 skip**: governança 27/27, motor 16/16, doctor 417 (410/0/7) e
      integrações 597 (584/0/13). Nenhum `✖` nem `not ok`.
    - Contra o D de `a50870f` (`pf-D-vs-a50870f.txt`): as 1.057 linhas de resultado são as mesmas, com as mesmas
      marcas e os mesmos 20 skips e motivos.
    - O caso do pwsh real rodou no D. Passaram os 11 nativos do Hermes com runtime, o I4-C35 sem o diagnóstico de
      observação Hermes não executada e o I23-C8 pelo Python do sistema, que não conta como nativo
      (`pf-D-hermes.txt`).
    - HEAD e status iguais antes e depois; `RUNNER_TEMP` com 0 entradas depois; nenhum processo `node`, `pwsh`,
      `python` ou `cmd` com o repositório ou as minhas raízes na linha de comando ficou vivo
      (`processes-after-pf-D.txt`; também depois do pf-A, `processes-after-pf-A.txt`).
  - **Durações** (observação, sem asserção que dependa delas): o pf-A levou 43 s contra 8 s do A de `a50870f`, e o
    pf-D 13 min 24 s contra 8 min 30 s. A diferença está em todos os testes que criam processos, inclusive os `C50` e o
    `governance-C4`, que não mudaram (413 → 3.306 ms), e já aparecia no RED. É do ambiente naquele momento; a causa
    não foi demonstrada.
  - **Temporário**: as raízes `sm-b86p-*` de pf-A, pf-B, pf-D, do RED, dos GREEN e dos mutantes foram removidas pelo
    registro (o pf-D deixou 128 entradas dos testes); a do pf-C, por caminho, uid e inode. As pastas `runner-temp-*`
    vazias saíram por `rmdir`. Nenhuma seleção por prefixo ou mtime; nenhum auxiliar no `/tmp` (Git Bash ou WSL) nem no
    temporário global. A ferramenta guardou a própria cópia da saída do pf-D (`…\tasks\b02tsdmw7.output`); não é
    auxiliar meu, e não a li nem apaguei.
- **O que isso prova e o que não prova**:
  - A prova nativa roda o mesmo `run` também de arquivos próprios com `'` e com `‘’‚‛` no nome, na forma
    `-Command ". '<arquivo>'"`, com npm 0 → 0 e npm 17 → 1 e os mesmos `argv`/`env`. Sem o escape, ou com só a ASCII
    dobrada, ela falha, e os casos sem aspa continuam passando.
  - Os casos, entradas e asserções anteriores não mudaram; o workflow, o produto e os testes funcionais também não.
  - Não prova o passo no runner da CI nem causa física; o D é deste computador. O `I4-C25m`, o `I4-C25l` e os 7 skips
    do doctor não rodaram aqui; os skips POSIX do D continuam como carry do C da R19.
  - **Limites de ambiente**, como antes: o npm de pf-A, pf-B e pf-D usou o cache do usuário, que não li (o aviso de
    versão só consulta o registro com o carimbo vencido); o pwsh pode atualizar os próprios caches no `LocalAppData`.
    Nesta revisão, todas as chamadas de pwsh tiveram a telemetria e a checagem de versão desligadas; o incidente de
    telemetria registrado acima continua como está.
- **O que se decidiu no caminho**: dobrar também as quatro aspas tipográficas, pela sondagem (Landing); escrever as
  tipográficas no código como escapes Unicode do JavaScript, para não se confundirem com a aspa ASCII nem com a
  vírgula. Nada novo com o coordenador nem com o usuário.
- **O que foi abandonado**: dobrar só a aspa ASCII; um arquivo por aspa tipográfica; `-File`, `-EncodedCommand` ou o
  caminho como argumento à parte; afirmar só o texto da string.
- **Pendentes, com o coordenador**: o registro e o despacho da verificação 21 e da formal 13 sobre o conteúdo novo,
  a publicação, a CI do novo HEAD, a medição e o merge, já autorizado só com toda a CI verde. Nada aqui afirma PASS,
  `ready`, CI verde, causa física nem impacto zero. Preservados como estão: os gates de `a50870f`, o incidente da R5,
  a limpeza de 1.257/107 pastas e os dois auxiliares pós-D em `/tmp` do Git Bash.

T8-C20 do D da verificação 21 — novo autor Claude, fatia nova (registros e gates acima preservados; aberto antes de
qualquer sondagem ou código):

- **Origem**: FAIL da verificação 21 (`3a15d79`), D em `5a0f231` com término natural e exit 1, 1.057/1.036/1/20; só o
  `T8-C20 … o exemplo é o que um hook com lock ocupado grava` (`docs.test.mjs:179`, `ENOENT`), verde na R20, no pf-D
  de `be29203` e na manual 40790906319. O log não diz se a gravação do diagnóstico perdeu a corrida com o prazo, se
  falhou em silêncio ou se houve outra coisa; nada aqui atribui causa antes de evidência.
- **Fronteira da fatia** (superfície nova, só o T8-C20): o diagnóstico de entrega do T8-C20 em
  `tests/integrations/traces/docs.test.mjs` e, se a evidência pedir, a pré-carga de tempos
  (`tests/integrations/helpers/traces-probe.mjs`). Produto (`traces/delivery-report.mjs`, `observation.mjs`,
  `traces/binding.mjs`, `traces/delivery.mjs`) só com defeito demonstrado dentro do contrato, com RED/GREEN. Workflow,
  governança, benchmark, core, `package*`, `AGENTS.md`/`CLAUDE.md`, configuração de revisão e `.verified.md` ficam só
  para leitura. O caso real (hook Claude, `.lock` alheio, arquivo `diagnóstico de entrega.ndjson` com espaço e acento)
  e as asserções literais de `:178-183` continuam como estão.
- **Gates anteriores**: os de `9b087dc`/`be29203` (pf-A/B/C/D) são do autor anterior, e A/B/C verdes e D vermelho são
  da verificação 21; nenhum prova esta fatia. Os gates desta fatia serão definidos depois do último código e antes de
  rodar, numa pasta própria (`.checks/code-review/issue-25/builder-r21-t8c20/`).
- **Leitura**: ~75k tokens lidos (34 comentários; Sources, Landing e Handoff do checklist, por trechos; topo do R21;
  build/handoff da CI86; `binding`, `delivery`, `delivery-report`, `observation`, `hook-command` e `cli`; os apoios
  `traces`, `producer-runs`, `traces-probe` e `trace-kinds`; `docs.test`, o C16 de `concurrency.cli` e o controle do
  T8-C12 em `follow.cli`). Estimados mais ~35k para sondagens, provas e gates: ~110k, abaixo de 150k; uma fatia, um
  lote, sem fronteira interna.
- **Decisões humanas já tomadas**: 6467154706 e 6442514838 (citadas em Sources); manter testes, prazos, cargas,
  contagens, paralelismo, retry e perdas; nenhuma rodada nova registrada por este autor.
- **Plano**: (1) diagnóstico sem tocar em rastreados — reproduções controladas, numa pasta própria e com pré-carga
  própria fora do repositório, das classes compatíveis com o sintoma, com o mesmo hook e o mesmo arquivo Unicode, e o
  confronto com o código e o contrato; (2) Landing, refinamento do check e task antes de qualquer código; (3) código e
  provas (RED/GREEN e controles discriminantes); (4) gates afetados depois do último código e um D completo.
- **Onde a fronteira caiu**: abertura `648458f`; Landing “Diagnóstico do T8-C20”, C46 (r), Swept e task `22c1161`;
  retificação aditiva do (r) `fce5c59`; código `cad647a` (`docs.test.mjs` `d52de03` → `852616a`,
  `traces-probe.mjs` `a6440dd` → `292c319`); diagnóstico, RED, GREEN, mutantes e gates declarados `407edc5`;
  resultados no commit seguinte, só docs. Produto, guia, workflow, governança, core, `package*` e configuração iguais
  a `5a0f231`.
- **Diagnóstico**: sem falha injetada, a linha do T8-C20 sai ~335–349 ms antes do prazo de 1.000 ms; quatro classes
  compatíveis com o contrato (gravação parada no `open` ou no `realpath`, `open` com EIO, laço parado) dão o mesmo
  sintoma da R21, e só a linha da pré-carga as separa. A causa da R21 continua desconhecida; nenhum defeito do
  produto foi demonstrado. O defeito demonstrado é de observação da prova, corrigido com a evidência comum e dois
  controles (RED `red2-run.txt`; mutantes M1–M3 recusados; A1/A3 com a evidência e A2/A4 sem ela).
- **Gates em `407edc5`**: A 116/110/0/6, B 116/109/**1**/6, C 116/112/0/4, D 1.059/1.039/0/20 (exit 0, linhas do
  pf-D de `be29203` mais os 2 controles, 11 nativos do Hermes). A falha do B é o controle `I25-C46 diagnóstico do
  T8-C15: confirmação perdida…`: o produtor `a`, sem injeção, teve `open lock EPERM (tomada do lock)` → `io_failure`
  39/1; preservada, sem repetição, sem correção e sem relação demonstrável com esta fatia (`B-failure.txt`).
- **O que se decidiu no caminho**: a forma da evidência e dos controles (Landing); a retificação do literal
  `pendentes na saída: nenhuma`, porque a tentativa da entrega abandonada no prazo pode estar em curso na saída. Nada
  novo com o coordenador nem com o usuário.
- **O que foi abandonado**: corrigir o produto (prazo, espera, reserva, nova tentativa); o knob `BLOCK_LOOP` como
  controle (corrida medida); `runHook` no lugar de `runIntegrations`; o fd do relatório de fixture; tipo pelo nome do
  arquivo; o literal `pendentes na saída: nenhuma`.
- **Pendente, com o coordenador — decisão concreta**: a fatia não fecha inteira verde por causa do B. Opções: (1)
  aceitar a falha do B como preservada e não atribuível a esta fatia e seguir para a verificação 22, que roda os
  gates de novo; ou (2) abrir, com autorização, o diagnóstico do `open lock EPERM` na criação do `.lock` (1º errno de
  uma falha desse tipo nos logs da #25), sabendo que tratar EPERM como disputa mudaria a política de retry do AC7.
  Nada aqui afirma PASS, `ready`, CI verde, causa física ou impacto zero. Preservados: os gates de `be29203`, o FAIL21,
  os incidentes da R5 e da R21, a limpeza de 1.257/107 pastas e os auxiliares antigos em `/tmp`.

Ciclo de vida do `follow` no T8-C19 (CI de `066bd98`) — novo autor Claude, fatia nova (registros e gates acima
preservados; aberto antes de qualquer sonda ou código):

- **Origem**: CI do HEAD publicado `066bd98`, depois do PASS 22 e da formal 13 `ready`. PR 40814315171: Windows e
  agregado vermelhos só no I23-C6 Claude (produtor 7, `delivery_timeout`, `sync key` 601 ms, `close key` pendente na
  saída; operação localizada, causa física desconhecida, não é defeito do produto demonstrado). Manual 40814471097:
  Windows cancelado no teto de 20 min, integrações sem totais, último resultado 04:02:02 e cancelamento 04:11:42; dos
  1.059 rótulos do PR, 39 não saíram, a partir do `T8-C19 trace walkthrough`. O reporter do Node pode reter resultados,
  então a ausência não diz qual teste executava. Nada aqui atribui o cancelamento antes de evidência.
- **Fronteira da fatia** (superfície nova, só o T8-C19): a harness em `tests/integrations/traces/demo.e2e.test.mjs` e
  apoios estritamente necessários de `tests/integrations/helpers/`, regressões e evidências. Produto, guia, cripto,
  chave, estado, formato, durabilidade, workflow, benchmark, governança, core, `package*`, configuração,
  `AGENTS.md`/`CLAUDE.md` e `.verified.md` ficam só para leitura. O EOF de `68f84c4` e o produto de `322bcad` não são
  tocados sem prova nova. `follow.cli.test.mjs` inicia `follow` com o mesmo padrão; fica fora desta fatia e, se a prova
  o mostrar relevante, é comunicado, não corrigido aqui.
- **Gates anteriores**: os de `407edc5` (autor anterior) e os da R22 (`2383c52`) não provam esta fatia. Os desta fatia
  serão definidos depois do último código e antes de rodar, em `.checks/code-review/issue-25/builder-ci066-follow/`
  (caminho absoluto, criação exclusiva, raízes por `mkdtemp` com registro e limpeza exata).
- **Leitura**: ~70k tokens lidos (o handoff técnico inteiro, o contexto com 36 comentários, `AGENTS.md`, `CLAUDE.md`, o
  `SKILL.md`; do checklist, Sources, Landing — linhas “Consumidor lento do I4-C16c”, “Processos da árvore” e
  “Diagnóstico do T8-C20” inteiras —, o C46 (q)–(r), Swept e o bloco do T8-C20 do Handoff; o topo da R22; a seção do
  T8-C20 do build; os logs CI 066 em trechos e a comparação de rótulos; `demo.e2e.test.mjs`, `follow.cli.test.mjs`,
  `traces.mjs`, `producer-runs.mjs`, `privacy/follow.mjs` e o `privacy` do `cli.mjs`). Estimados mais ~50k para sondas,
  código, provas e gates: ~120k, abaixo de 150k; uma fatia, um lote, sem fronteira interna.
- **Decisões humanas já tomadas**: 6467154706 e 6442514838 (Sources). Ficam: prazos 1.000/750/650 ms, stdin 2.000 ms
  (faixa 1.900–6.000), Hermes 5 s e os prazos existentes dos testes; 500 eventos/8 MiB/7 dias, 80 eventos/dois
  produtores; cargas, contagens, payloads, ordem, retry e perdas; runner padrão (teto 8, CPU−1); jobs 20/10/5 e manual
  10. Nenhum rerun dos 066 e nenhuma rodada nova registrada por este autor.
- **Plano**: (1) diagnóstico sem tocar em rastreados — numa cópia `git archive` do HEAD, numa raiz própria, falhas
  injetadas só na cópia do T8-C19 depois do spawn do `follow` (logo depois, no meio e depois dos cinco registros) e o
  controle sem injeção; registrar a falha impressa, o estado do `follow` (pid, `exit`/`close`) e do processo do arquivo
  antes e depois, o resultado do `after`, e quando o reporter imprime o resultado de um arquivo cujo processo continua
  vivo; (2) se confirmado, Landing, refinamento do C46 e task antes do código, e a correção só do encerramento dos
  filhos próprios; (3) RED na cópia do código anterior e GREEN no corrigido, com regressão e controle saudável; (4) alvos
  A/B/C pelo fecho real da mudança e um D completo, depois do último código. Se não confirmado: registrar a ausência de
  reprodução e propor a menor observação de início/fim do runner, com Landing e prova antes de qualquer código.
