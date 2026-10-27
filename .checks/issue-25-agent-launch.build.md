# Build da issue #25 — `skill-me <agente>`

Implementador: Claude (Opus 5.5), perfil `light`, handoff `on`, um lote (S1–S5,
~98k de leitura mínima, abaixo de 150k). Branch `codex/issue-25-agent-launch`,
base da feature `63621c6`. Verifier, revisão formal, push e PR ficam com o
orquestrador; nada disso foi executado aqui.

## Ordem dos commits

| Commit | Conteúdo |
| --- | --- |
| `4b1ba61` | plano atualizado para a decisão B e checklist com Landing e provas, antes do produto |
| `d818216`, `dd87ecf` | registros do orquestrador: plano completo e aprovação “Aprovar plano completo e implementar” |
| `9385bb8` | Landing: `launchedAt` (risco 1) e ordem/orientação da falha do encerramento (risco 2), C5/C28/C31/C34 reforçados — antes do código |
| `7bb3f45` | store, entrega e vínculo: execução, ponteiro, sucessão comum, `launch_ended` |
| `9ecd8dd` | Landing: variante “resumo ilegível” do encerramento (escrita junto com o código, não antes; ver “Desvios”) |
| `8629415` | launcher, doctor (entrada do shim), `skill-me report`, provas S1–S4 |
| `95ec7bd` | README e guias, prova C37 e o título novo na prova da #23 |
| `dedd5b4` | correção de prova (modo do caso 126 de C30 no POSIX) e diagnóstico explícito da variante de link de C17 |

O WIP de 38 linhas no store preservado pelo orquestrador
(`.checks/code-review/issue-25/product.pending-approval.patch`) foi reaplicado com
`git apply` e completado; nenhum outro trabalho alheio foi revertido.

## Provas por check

Ambientes: Windows 11 (checkout, Node 24.22.1, Python 3.12.10, Hermes 0.21.4
local) e WSL Ubuntu (Node 24.13.0, Python 3, uid 1000) sobre `git archive` de
`dedd5b4` (tar sha256 `2a1a52da…24783e`, `node_modules` copiado do checkout).
Arquivos: `tests/integrations/launch/{command.cli,agent.unit,prepare.cli,session.e2e,store.unit,end.e2e,report.cli,docs}.test.mjs`.

| Check | Testes (`--test-name-pattern`) | Windows | WSL |
| --- | --- | --- | --- |
| C1 | `I25-C1 ` (npm link em prefixo temporário, `--offline`; o link é removido sozinho e o `git status` fica igual) | pass | pass |
| C2 | `I25-C2 ` (3 agentes, 10 argumentos com espaço, aspas, Unicode, `--`, vazio, `%PATH%`, `$HOME`, barra final; stdin, stdout e stderr) | pass | pass |
| C3 | `I25-C3 ` | pass | pass |
| C4 | `I25-C4 ` em command.cli (shim real com sentinela que nascia se o cmd rodasse) | pass | skip (só Windows) |
| C4 | `I25-C4 ` em agent.unit (templates reais do npm; tabela de recusa com platform `win32`) | pass (2) | pass (2) |
| C5 | `I25-C5 ` POSIX: SIGINT, SIGQUIT, SIGHUP ao grupo | skip (só POSIX) | pass |
| C5 | `I25-C5 ` Windows: CTRL_C_EVENT real (`console-ctrl-c.py`) | pass | skip (só Windows) |
| C6 | `I25-C6 ` | skip (só POSIX) | pass |
| C7–C14 | `I25-C7 ` … `I25-C14 ` (C8 tem 2 testes; o de LOCALAPPDATA só no Windows) | pass (9) | pass (8), 1 skip (LOCALAPPDATA) |
| C15 | `I25-C15 ` pty (`pty-session.py`) | skip (só POSIX) | pass |
| C16 | `I25-C16 ` em session.e2e e agent.unit | pass (2) | pass (2) |
| C17 | `I25-C17 ` em store.unit (3) e session.e2e (1) | pass (4; variante link omitida com diagnóstico) | pass (4, com a variante link) |
| C18–C23 | `I25-C18 ` … `I25-C23 ` | pass (6) | pass (6) |
| C24 | `I25-C24 ` | pass | pass |
| C25–C28, C31–C33 | end.e2e (`I25-C25 ` … `I25-C33 `; C27 também em store.unit; C31 com 2 testes) | pass (8 + 2) | pass (8 + 2) |
| C29, C30 | `I25-C29 `, `I25-C30 ` (POSIX: sinal próprio e SIGINT pelo grupo; 126 por EACCES; Windows: código 1 e .exe inválido) | pass | pass |
| C34, C35 | report.cli (`I25-C34 ` 3 testes, `I25-C35 `) | pass (4) | pass (4) |
| C36 | `I25-C36 ` | pass | pass |
| C37 | docs (`I25-C37 ` 3 testes) | pass (3) | pass (3) |

Totais das provas I25: 52 testes; Windows 49 pass, 3 skip (C5/C6 POSIX e C15
pty); WSL 49 pass, 3 skip (C4 shim, C5 console e C8 LOCALAPPDATA, só Windows).
Nenhum check ficou sem execução nos dois lados somados.

Mutações conferidas (a prova falha sem o mecanismo, e passa com ele):
Ctrl+C no Windows sem o ouvinte de SIGINT (launcher morre com 0xC000013A);
escolha da execução por `createdAt` em vez de `launchedAt` (C34 falha).

### Suítes completas

| Execução | Resultado |
| --- | --- |
| WSL, `node --test "tests/integrations/**/*.test.mjs"` (concorrência 4) em `dedd5b4` | 504 testes: 487 pass, 0 fail, 17 skip (10 sem runtime Hermes, 4 DACL do Windows e ACL do macOS, 3 I25 só Windows) |
| WSL, doctor / governança / motor de revisão | 417 (416 pass, 1 skip) / 6 / 16, 0 fail |
| Windows, `npm test` em `dedd5b4` | governança 6/6; motor 16/16; doctor 417 (410 pass, 7 skip POSIX/FIFO); integrações 504 (493 pass, **1 fail**, 10 skip) — a falha é I23-C8 (Hermes nativo, ver abaixo) |
| Windows, integrações com concorrência 4 | 504: 491 pass, **3 fail** (I4-C19, I4-C23, I4-C37, Hermes nativo), 10 skip; as 49 provas I25 passam |
| Windows, `hermes-plugin.native.test.mjs` isolado em `dedd5b4` | 11/11 pass |

As falhas do Windows são todas do `hermes-plugin.native.test.mjs` (runtime real
do Hermes 0.21.4, pulado na CI e no WSL) e mudam de teste a cada execução da
suíte inteira: a harness considera a entrega concluída depois de 300 ms sem
mudança nos contadores (`harness.py`, `settleMaxMs`) e o `before` espera o
destino de captura por 10 s; sob carga, o `Popen` do processo de entrega passa
desses prazos e os testes leem `delivered: 0` ou “destino não recebeu EOF”. Os
caminhos que eles exercitam não mudaram (plugin, instalador, fixture de entrega);
o I23-C8 usa o ingest, cuja entrega automática foi refatorada para o núcleo
comum, e passa isolado e na execução com concorrência 4. O mesmo arquivo passou
11/11 isolado no checkout, no `git archive` de HEAD e na base `63621c6`. As 52
provas novas aumentam a carga paralela da suíte e tornam essa intermitência
mais provável nesta máquina (que tinha outras sessões do Claude abertas). Não é
regressão comprovada do produto, mas é um risco que o Verifier deve conhecer.

## Desvios e decisões do build

- Riscos da conferência do plano, tratados com linha no Landing antes do código:
  1. **Execução iniciada por último**: `launchedAt` (o `createdAt` do segmento 1)
     persistido no ponteiro e em cada captura; a escolha é (`launchedAt`,
     `invocation`). Prova do intercalamento em C34 (segmento 1 da antiga apagado,
     sucessora dela criada depois do início da nova). Mutação conferida: com a
     escolha por `createdAt` a prova falha.
  2. **Falha do encerramento**: o ponteiro sai antes de a corrente parar (sem
     ponteiro nenhum produtor grava, mesmo que parar falhe), e a orientação
     depende do ponteiro: aberta → avisa que `privacy stop` encerra só a captura
     e que um processo ainda vivo abriria a seguinte; ausente → “já não recebe
     registros”. Provas C27 (unidade da ordem) e C31 (lock alheio e E/S).
  3. **Ctrl+C no Windows**: prova nativa, não `emit`: driver Python num console
     próprio e oculto gera `CTRL_C_EVENT` real (`GenerateConsoleCtrlEvent`) para
     launcher e agente. Mutação conferida: sem o ouvinte de SIGINT no launcher, a
     prova falha (o launcher morre com 0xC000013A).
  4. **Hermes em voo**: C28 usa o plugin real (`__init__.py` por `register(ctx)`,
     Python do sistema com `-I -B`) e declara a suposição: o processo de entrega
     já está em execução (primeiro registro já gravado). `observer_stats` prova
     `enqueued` = `delivered` = 3, sem perda de fila escondida; o README e os
     guias declaram que eventos não entregues pelo plugin ao sair se perdem e que
     o processo de entrega só cabe na janela de 750 ms quando já está rodando.
- A variante do resumo ilegível no encerramento foi acrescentada ao Landing no
  mesmo momento do código (commit `9ecd8dd`), não antes: é uma mensagem nova de
  um caminho de erro raro, sem alternativa disputada.
- O título da seção do on/off no README mudou para “Alternativa: observar todas
  as sessões com `on` e `off`”, porque o critério 30 põe o `skill-me` antes como
  uso normal; a prova I23-C18 acompanha só o título (as asserções de conteúdo
  ficaram iguais).
- `observe/command.mjs` exporta `patiently` (paciência de 2 s do lock) para a
  abertura e o encerramento da execução, sem cópia.

## Limitações

- Uso real não comprovado (`Unresolved` 2, `blocks go-live`): nenhuma sessão de
  Claude, Codex ou Hermes reais foi aberta; a confiança nativa é do proprietário.
- Windows: o prompt do primeiro uso é provado em processo (respostas injetadas,
  `terminal: true`) e por pipes reais (C12); a leitura síncrona do fd 0 num
  console real do Windows não foi exercitada. No POSIX ela é provada por pty
  (C15, no WSL/CI).
- C17 (variante “link” do ponteiro): sem privilégio de link simbólico de arquivo
  no Windows a variante fica de fora; no POSIX ela roda.
- `npm link` real do proprietário não foi feito; C1 usa prefixo temporário.

- C23 (critério 23, “sem espera”): a ausência da espera de 750 ms depois de um
  erro de início é do código (`launchAgent` só espera depois do `close`), mas
  nenhuma prova mede o tempo; seria uma asserção de relógio frágil.

## Achados fora do escopo

- `tests/integrations/fixtures/home inexistente/AppData/Roaming` (vazio) existia
  no checkout desde 24/10/2026, antes desta sessão, e é recriado durante a
  suíte por provas existentes que iniciam processos com o `NO_HOME` de
  `tests/integrations/helpers/cli.mjs` (bisseção: arquivos do topo de
  `tests/integrations/` e `privacy/demo.e2e`, `privacy/outputs.cli`,
  `privacy/store.cli`; as provas da #25 não o criam). O nome promete um home que
  não existe. Na base e em HEAD a presença dele não mudou o resultado do teste
  nativo do Hermes; não foi corrigido (fora do escopo) e fica como estava.
- A intermitência do `hermes-plugin.native.test.mjs` sob carga (seção anterior)
  é da heurística de espera da harness; também fora do escopo.

## Correções da verificação 1 (FAIL em `da2467d`)

Fonte: `.checks/issue-25-agent-launch.verified.md` (rodada 1, lido inteiro; não
alterado). Autorização: plano completo e implementação da #25 (comentário
6415701125); o orquestrador limitou esta rodada a F1, F3 e F4, com F5–F7 como
notas. F2 (harness nativa antiga do Hermes) ficou fora: nenhuma linha de
`tests/integrations/fixtures/hermes/harness.py`, do plugin, do runtime ou de
prazos foi tocada.

| Commit | Conteúdo |
| --- | --- |
| `3b16e3b` | Landing "Console do Windows" e check C38, antes do código |
| `86e9ba1` | correção do console do Windows (produto) e das provas F1, F3, F4, F6, F7 |

- **F1** (C14, C18, C30, C31 no Node 24.13.0): os quatro arranjos trocaram
  `rmSync` por `unlinkSync` (arquivos: `codex.js`, `.lock`, temporário alheio) ou
  `rmdirSync` (a raiz preparada, ainda vazia), cada um seguido de
  `assert.equal(existsSync(...), false)`. Scratch, mínimo de Node, CI,
  tolerâncias e critérios não mudaram; os `rmSync` de limpeza no `after` ficaram
  (sem refatoração global). O “antes” é o do Verifier (ambiente B: 45 pass,
  4 fail); o “depois” está abaixo.
- **F3** (C18): o intervalo do `lock_present` é medido com `performance.now()`,
  ainda `>= 2000` exatos.
- **F4** (C12): novo teste com a tabela que separa `&&` de `||` — só o stdin fora
  do terminal (stdin `/dev/null` ou nulo, stderr no terminal) e só o stderr fora
  (stdin no terminal, stderr em arquivo), com o outro lado num terminal real
  (pty no POSIX pela `pty-session.py` estendida; console próprio no Windows pela
  nova `console-stdio.py`) e um `n` já digitado no terminal; o caso dos dois em
  pipe continua no teste anterior. As asserções exigem a orientação
  `setup_required` (literal, no arquivo do stderr), nenhuma pergunta nem
  `setup_declined`, árvores iguais, agente não iniciado e pasta padrão ausente.
  Mutação `isatty(0) || isatty(2)` em `cli.mjs`: o teste falha no Windows e no
  WSL; o teste dos dois em pipe continua passando com ela, como o Verifier
  apontou.
- **Defeito revelado pela prova de F4** (produto, dentro do escopo da #25): num
  console real do Windows, a escrita síncrona dos bytes UTF-8 aparecia como
  `prepara├º├úo`, e a leitura síncrona do fd 0 chegava na página de código OEM:
  um caminho digitado com acento virou outra pasta, criada com `�` no nome
  (medido; os resíduos dessas medições foram removidos do `%TEMP%`, conferidos
  um a um). Correção registrada no Landing antes do código: no console do
  Windows, saída pelo stream tty e respostas pelo stdin tty, pausado e solto do
  laço de eventos a cada linha; fora de console e no POSIX nada muda. Prova
  C38 (console real): prévia legível, raiz digitada com acento exata e a linha
  digitada depois das respostas chega intacta ao agente. Mutações conferidas
  no Windows: escrita síncrona no console derruba C38 e o C12 de um lado;
  leitura síncrona no console derruba C38.
- **F6**: o ponteiro do C17 recusa também `segment` em texto, ausente e
  `launchedAt` fora de ISO. **F7**: o C37 compara com `500 eventos ou 8 MiB`,
  `750 ms` e a lista de códigos do Landing, literais.
- **F5 (proveniência)**: a linha “WSL … sobre `git archive` de `dedd5b4`, tar
  sha256 `2a1a52da…24783e`” desta mesma página foi gerada com o
  `core.autocrlf=true` do gitconfig do sistema e não corresponde aos bytes
  commitados; os números WSL daquela seção ficam como histórico e foram
  substituídos pela execução exata do Verifier (ambiente C). Também não se
  reproduziu, na verificação, o “`hermes-plugin.native.test.mjs` isolado
  11/11” daquela seção: o Verifier obteve 7 pass e 4 fail isolado em HEAD e na
  base. As execuções WSL abaixo usam `git -c core.autocrlf=false archive`.

### Execuções desta rodada (alvo I25 inteiro, uma vez por ambiente, em sequência)

Logs spec e TAP em `.checks/code-review/issue-25/builder-fix-round1/` (pasta
ignorada). HEAD `86e9ba1`.

| Ambiente | Comando | Resultado |
| --- | --- | --- |
| Windows, Node 24.22.1 (`C:\nvm4w\nodejs\node.exe`), 11:56 | `node --test --test-concurrency=4 … "tests/integrations/launch/*.test.mjs"` | 54 testes: 51 pass, 0 fail, 3 skip (C5 POSIX, C6, C15 pty) |
| Windows, Node 24.13.0 oficial (`.checks/code-review/issue-25/ci-node-24.13.0/…/node.exe`, npm 11.6.2 do mesmo zip, no início do PATH, `process.execPath` dele, sem `npm_execpath`), 11:58–11:59 | o mesmo | 54 testes: 51 pass, 0 fail, 3 skip; C14, C18, C30 e os dois C31 passam |
| WSL `Ubuntu`, Node 24.13.0 (`/usr/bin/nsolid`), npm 11.6.2, Python 3.12.3, uid 1000, 12:00 | o mesmo, sobre `git -c core.autocrlf=false archive 86e9ba1` (sha256 `ab121ca3…be23c16e`; `get-tar-commit-id` = `86e9ba13…`; árvore extraída `dec71e45…` = `HEAD^{tree}`; `cli.mjs` 755) com `node_modules` copiado | 54 testes: 50 pass, 0 fail, 4 skip (C4 shim, C5 console, C8 LOCALAPPDATA, C38 console); C12 de um lado e C15 rodam pelo pty; C18 com o relógio monotônico |

Os 54 nomes I25 aparecem um a um em cada TAP (52 anteriores + o C12 de um lado
+ C38). `~/.skill-me` e `~/.skill-me-authorization.json` do uid 1000 ausentes
antes e depois. Com o 24.13.0, o `after` (`rmSync`) não apagou os scratches:
229 pastas `skill-me i4 i25 *` criadas na janela dessa execução foram removidas
por um script do Node 24.22.1 que confere o caminho dentro do `%TEMP%` (arquivos
por `unlink`, pastas por `rmdir`), 0 recusas. A cópia do WSL e os temporários
desta rodada foram removidos; a pasta `skill-me i4 dbg c15 ação-*` do `%TEMP%`
não é desta rodada e ficou.

`npm test` não foi repetido nesta rodada, por instrução: só provas foram
corrigidas, e o gate nativo antigo (F2) depende da decisão do proprietário.

### O que resta

- F2 continua aberto e bloqueia o gate local `npm test` no Windows. Uma edição
  não commitada do orquestrador em `.checks/issue-25-agent-launch.planning-handoff.md`
  (e em `.tasks/` e no checklist) registra a resposta “Autorizar ajuste pontual
  da harness”; esta rodada recebeu a instrução de não editar a harness e não o
  fez. Os arquivos dessa edição não foram tocados nem commitados aqui.
- Limitações anteriores continuam: uso real sem sessão de agente (`Unresolved`
  2); C23 sem asserção de tempo para o “sem espera”.

## Ajuste autorizado da harness Hermes (S6, C39–C40)

Autorização do proprietário: “Autorizar ajuste pontual da harness”
([comentário 6419121665](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6419121665)),
registrada na issue como AC6 (`.checks/code-review/issue-25/context-harness-approved.json`).
Mudança de escopo: a entrega passa a incluir a espera da harness nativa antiga do Hermes
(`tests/integrations/fixtures/hermes/harness.py`) e as provas dela; continua fora mudar o plugin
do produto, os callbacks, os runtimes pessoais, as tolerâncias ou o prazo máximo. O orquestrador
registrou critérios 31–32, S6 e a numeração C38 (console) / C39–C40 (harness) em `c4a3927` e
`af3c7b7`; nenhum outro arquivo dele foi alterado aqui. Isto encerra o F2 da verificação 1, que a
seção anterior deixava bloqueado.

| Commit | Conteúdo |
| --- | --- |
| `c89b8f3` | Landing “Espera da harness nativa do Hermes”, antes do código |
| `9148a5d` | `fixtures/hermes/settle.py`, a harness usando-o, `hermes-harness.unit.test.mjs` (I25-C39/C40) e a prova nativa I25-C40 |

- **Forma**: `delivery_state(stats)` → `concluded` quando `delivered + oversize +
  serializationFailed >= enqueued` com a entrega ativa; `failed` desligada com `deliveryFailed > 0`;
  `inactive` desligada sem perdas; senão `pending`. `wait_for_delivery` relê a cada 50 ms (relógio
  injetável) até sair de `pending` ou chegar a `settleMaxMs` (`timeout`); o padrão continua 5000 ms.
  A harness grava `settle: {state, waitedMs}` ao lado dos `stats` de sempre.
- **RED da espera antiga** (`builder-harness/red.spec.txt`, `c89b8f3`): com um `settle.py`
  provisório que transcrevia a regra antiga (300 ms parados, linhas 73–84 da harness em
  `c89b8f3`) e a harness ainda sem mudança, as 5 provas I25-C39/C40 falharam: a harness real
  gravou `[enqueued, delivered, deliveryFailed] = [12, 0, 0]` (o mesmo sintoma nativo), a
  pendência encerrou aos 350 ms, a falha terminal e o destino travado saíram como `concluded`. A
  transcrição não foi commitada. **GREEN** (`green.spec.txt`): 5/5.
- **Nativo, mesmas condições da máquina** (`Popen` do `node.exe` como o plugin: 469, 468, 469, 469 e
  454 ms; `popen-latency.txt`): com a harness antiga de `c89b8f3`, o arquivo nativo teve 12 testes,
  8 pass e 4 fail (I4-C19, I4-C23, I4-C37 e o novo I25-C40; o I23-C8 passou nessa vez); com a nova,
  12/12 (`native-red-oldharness.spec.txt`, `native-green-isolated.spec.txt`).
- As asserções nativas antigas (I4-C18 a I4-C23, I4-C37, I4-C44b, I23-C8) não mudaram. O destino
  travado agora espera o `settleMaxMs` inteiro do cenário (2000 ms) em vez de ~300 ms.

### Gate e execuções finais (HEAD `9148a5d`)

Logs em `.checks/code-review/issue-25/builder-harness/` (pasta ignorada). Uma execução por vez,
sem suítes concorrentes.

| Execução | Resultado |
| --- | --- |
| Windows, Node 24.22.1, `npm test` (12:13–12:21) | **exit 0**: governança 6/6; motor 16/16; doctor 417 (410 pass, 7 skip POSIX/FIFO); integrações 512 (502 pass, **0 fail**, 10 skip), com I4-C18–C23, I4-C37, I4-C44b, os três I23-C8 e o I25-C40 nativo executados e verdes |
| Windows, Node 24.22.1, alvo I25 (`launch/*.test.mjs` + `hermes-harness.unit.test.mjs`) | 59 testes: 56 pass, 0 fail, 3 skip (C5 POSIX, C6, C15 pty) |
| Windows, Node 24.13.0 oficial (PATH e `execPath` dele, npm 11.6.2 do zip, sem `npm_execpath`), 12:22–12:24 | 59 testes: 56 pass, 0 fail, 3 skip |
| WSL `Ubuntu`, Node 24.13.0, npm 11.6.2, Python 3.12.3, uid 1000, sobre `git -c core.autocrlf=false archive 9148a5d` (sha256 `4de22298…71702362`; `get-tar-commit-id` = `9148a5da…`; árvore extraída `4752eb20…` = `HEAD^{tree}`; `cli.mjs` 755) | 59 testes: 55 pass, 0 fail, 4 skip (C4 shim, C5 console, C8 LOCALAPPDATA, C38 console) |

As 5 provas I25-C39/C40 rodaram nos três ambientes (nenhuma pulada); os 59 nomes I25 aparecem um a um
em cada TAP. `~/.skill-me` e `~/.skill-me-authorization.json` do uid 1000 ausentes antes e depois. Os
232 scratches `skill-me i4 i25 *` da janela do 24.13.0 (o `after` com `rmSync` não os apaga) foram
removidos por script do 24.22.1 com caminho conferido no `%TEMP%`, 0 recusas; a cópia do WSL e os
temporários desta rodada também.

### Riscos e limitações que continuam

- Uso real sem sessão de agente (`Unresolved` 2, `blocks go-live`).
- A prova pelo console real do Windows (C38, C5) e pelo pty (C15, C12 de um lado) dependem do Python
  do sistema; sem ele ficam puladas com motivo. C39/C40 também, mas a CI tem Python nos três runners.
- A espera nativa ainda depende dos contadores do plugin: um registro posto na fila e perdido sem
  contagem (por exemplo, o processo do Hermes morto no meio) deixaria a espera em `pending` até o
  `settleMaxMs`, como `timeout` — não como conclusão.
- C23 continua sem asserção de tempo para o “sem espera”.

## Regressões da revisão formal em `2fd858a` (S7, C41–C42) e dois refinamentos de C41

A revisão formal (`.checks/code-review/issue-25/formal-review.stdout.txt`) pediu mudanças com dois
P2: a sucessora criada cuja publicação do ponteiro falha ficava órfã e repetia o segmento
(`store.mjs:1071`), e um sinal antes de o agente iniciar não cancelava a abertura
(`agent.mjs:61`). Depois, o orquestrador fez duas observações concretas sobre a correção, dentro de
AC3/AC4 e C17/C41. Cada forma foi registrada no Landing, na task 33/34 e no checklist antes do
código. C1–C40 não mudaram.

| Commit | Conteúdo |
| --- | --- |
| `fb99b58` | Achados da revisão formal; task 33–34, S7, C41–C42; Landing “Sucessora não publicada” e “Cancelamento antes do agente” |
| `e238cc0` | Sucessora não publicada adotada (`nextLaunchSegment`), encerramento de toda `active` da execução, órfã da abertura nomeada, cancelamento por sinal antes do agente; provas |
| `eb8cdd7` | `docs/traces.md` |
| `e07ce47` | Refinamento 1 (Landing “Descoberta das capturas no encerramento”, task 33, C41) |
| `82837eb` | Descoberta lida captura a captura; encerramento não conferido; provas e `docs/traces.md` |
| `53de34f` | Refinamento 2 (Landing “Vínculo do ponteiro no encerramento”, task 33, C41) |
| `f0d5238` | Vínculo do ponteiro conferido antes de parar e no diagnóstico; provas |

Logs em `.checks/code-review/issue-25/builder-formal-fix/` e `builder-final-refine/` (pastas
ignoradas).

### C41–C42 (achados da revisão formal)

- **RED** (produto de `2fd858a` com as provas novas; `red-win-24.22.1.spec.txt`,
  `red-wsl-24.13.0.spec.txt`): 11 testes, 9 fail, 1 pass (a outra execução da mesma raiz, que já
  não mudava), 1 skip de plataforma (a variante C42 do outro sistema), em Windows Node 24.22.1 e WSL
  Node 24.13.0.
- **GREEN** em `e238cc0`: 10 pass, 1 skip nos dois. C42 pelo processo real no POSIX (lock da
  abertura ocupado, SIGINT ao grupo, SIGTERM ao launcher) e pelo `CTRL_C_EVENT` real no console do
  Windows (`console-ctrl-c.py`), saída 130.

### Refinamento 1 — leitura transitória no encerramento (observação sobre `eb8cdd7`)

- **Hipótese confirmada.** Sonda com a injeção de E/S existente (`readBounded` lança `EIO` só para o
  `state.json` da sucessora não publicada, arquivo íntegro; `refine-probe-win-24.22.1.txt`):
  `endLaunch` resolvia `{ended: true, captures: null, summaryCode: "io_failure"}`, o ponteiro saía e
  a sucessora ficava `active` com `endedAt: null`; o launcher escrevia “execução … encerrada; o
  resumo das capturas não pôde ser lido” sem nenhum comando que a encerrasse. Uma captura de outra
  execução ilegível tinha o mesmo efeito.
- **Correção**: a descoberta lê cada nome de `captures/` com `readCapture`; `StoreError` fica de
  fora (contrato aprovado); erro de E/S cru → `unreadable`; listagem falha → não conferida. O resumo
  sai dos estados já parados, sem reler. Sem conferência, o erro leva `revoked`, `unverified`,
  `unreadable`, e o launcher lista as não lidas com `privacy status` + critério de `invocation` e
  `state` + `privacy stop` (sem nomes, `privacy list`). Nada é feito numa captura não lida.
- **RED** (6 provas novas: 4 no store, 2 pelo launcher; `refine-red-*.spec.txt`): Windows 24.22.1 e
  WSL 24.13.0 (árvore do índice temporário `2b73d736…`, archive LF `26f531a2…`), 5 fail e 1 pass —
  o controle de formato inválido, que já passava e continua igual.
- **GREEN** em `82837eb`: 6/6 (`refine-green-win-24.22.1.spec.txt`); sonda depois: erro
  `io_failure` com `revoked`, `unverified` e `unreadable: [sucessora]`, e a prova roda o `privacy
  status` e o `privacy stop` mostrados e a sucessora fica `stopped`. Arquivos `store.unit`,
  `end.e2e` e `command.cli`: 39 testes, 36 pass, 3 skip.

### Refinamento 2 — vínculo do ponteiro (observação sobre `e238cc0`)

- **Hipótese confirmada, nos dois pontos.** Com o ponteiro de A nomeando a captura `active` de B
  (outra execução da mesma raiz, demais campos válidos): (1) o encerramento de A parava B
  (`state` `stopped`, `endedAt` gravado), no store e pelo launcher real; (2) com o encerramento
  falhando antes de começar (lock alheio), o stderr dizia “a captura <B> continua active” e
  mandava rodar `privacy stop` de B. Caso combinado: com B ilegível por um instante, o erro dava B
  em `captures`, como captura de A que ficou `active`. A entrega de A já era recusada
  (`store_invalid`), e a prova confere isso.
- **Correção**: a captura do ponteiro só para se o `state.json` dela tiver `origin: "launch"` e a
  `invocation` da execução; a que não pôde ser lida segue o contrato da descoberta (não vira falha
  ao parar). `peekLaunch` só devolve o ponteiro cuja captura se confere desta execução; senão vale a
  orientação conservadora já existente, com a captura que a invocação abriu.
- **RED** (4 provas novas: 2 no store, 2 pelo launcher; `ownership-red-*.spec.txt`): Windows
  24.22.1 e WSL 24.13.0 (árvore `a649e736…`, archive LF `478366c6…`), 4/4 fail.
- **GREEN** em `f0d5238`: os 17 `I25-C41` passam (`ownership-green-win-24.22.1.spec.txt`); B fica
  byte a byte igual (`state.json` e ponteiro), continua gravando (`LAUNCHED(1)`), e o comando
  mostrado no diagnóstico encerra a captura de A sem tocar B.

### Gate e execuções finais (HEAD `f0d5238`)

Uma execução por vez, sem suítes concorrentes; logs em `builder-final-refine/`.

| Execução | Resultado |
| --- | --- |
| Windows, Node 24.22.1, alvo I25 (`launch/*.test.mjs` + `hermes-harness.unit.test.mjs`), 13:32–13:34 | 80 testes: 76 pass, 0 fail, 4 skip (C5 e C6 POSIX, C42 POSIX, C15 pty) |
| Windows, Node 24.13.0 oficial (PATH e `execPath` dele, npm 11.6.2 do zip, sem `npm_execpath`), 13:34–13:36 | 80 testes: 76 pass, 0 fail, 4 skip |
| WSL `Ubuntu`, Node 24.13.0, npm 11.6.2, Python 3.12.3, uid 1000, sobre `git -c core.autocrlf=false archive f0d5238` (sha256 `7d37ac59…a914d16c4`; `get-tar-commit-id` = `f0d52384…`; árvore extraída `f68f4c9a…` = `HEAD^{tree}`; `cli.mjs` 755) | 80 testes: 75 pass, 0 fail, 5 skip (C4 shim, C5 console, C42 console, C8 LOCALAPPDATA, C38 console) |
| Windows, Node 24.22.1, `npm test` (13:37–13:45) | **exit 0**: governança 6/6; motor 16/16; doctor 417 (410 pass, 7 skip POSIX/FIFO); integrações 533 (522 pass, **0 fail**, 11 skip, todos POSIX, Linux ou macOS), com I4-C18–C23, I4-C37, I4-C44b, os três I23-C8 e o I25-C40 nativo executados e verdes |

Os 80 nomes I25 aparecem um a um nos três TAP, iguais entre eles; nenhum `not ok`.
`~/.skill-me` e `~/.skill-me-authorization.json` do uid 1000 ausentes antes e depois. Os 273
scratches `skill-me i4 i25 *` da janela do 24.13.0 foram removidos por script do 24.22.1 com o
caminho conferido no `%TEMP%`, 0 recusas; as cópias do WSL e os temporários desta rodada também.

### Limitações desta rodada

- Uma captura de outra execução ilegível por E/S também impede o encerramento conferido: sem lê-la
  não há como saber de quem é. O launcher dá o critério; não há nova tentativa automática.
- Com uma falha de leitura persistente, a recuperação depende de o usuário rodar o `privacy status`
  e o `privacy stop` mostrados quando a leitura voltar.
- A captura do ponteiro com formato inválido (`StoreError`) agora segue o contrato da descoberta:
  fica fora do resumo, em vez de sair como falha ao parar.
- No diagnóstico de um encerramento que não começou, um ponteiro cuja captura não se confere (de
  outra execução ou ilegível) leva à orientação conservadora com a captura que a invocação abriu (o
  segmento 1); se a execução já tinha passado a outro segmento, essa pode estar `stopped`, e
  `privacy stop` nela não muda nada.
- Continuam: uso real sem sessão de agente (`Unresolved` 2, `blocks go-live`); console real e pty
  dependem do Python do sistema; C23 sem asserção de tempo para o “sem espera”.

## Regressões da segunda revisão formal em `6d57e6e` (S8, C43–C44)

A rodada 3 do Verifier deu PASS 42/42 (`6d57e6e`, só `.verified.md`, intacto aqui). A segunda
revisão formal (`.checks/code-review/issue-25/formal-review2.stdout.txt`) pediu mudanças com dois
P2 bloqueantes, um em AC4 e um em AC6. **Tetos atingidos: 2 revisões formais e 3 Verifiers.** Nada
aqui roda revisão, Verifier, push, PR ou merge; estas provas são do autor e não autorizam entrega
nem `ready`. Verificação ou revisão adicionais dependem de exceção pedida pelo orquestrador ao
proprietário.

| Commit | Conteúdo |
| --- | --- |
| `57e031c` | Task 35–36, S8 com C43–C44 e as linhas “Lock após a abertura” e “Leitura transitória na espera da harness” do Landing, antes do código |
| `dd18af0` | `startLaunch` e o launcher (C43), `settle.py` (C44), provas, variável de teste `SKILL_ME_TEST_TRACES_LOCK_KEPT` na pré-carga e `docs/traces.md` |
| `858b583` | C43 (e), task 35 e Landing: a mesma regra no encerramento, antes do código (achado do autor pela sonda `probe-end-release.txt` em `dd18af0`) |
| `d71c143` | `keepingResult` comum a `startLaunch` e `endLaunch`, resumo mantido no launcher, provas de (e) e `docs/traces.md` |

Logs em `.checks/code-review/issue-25/builder-formal2/` (pasta ignorada).

### C43 — liberação do lock depois da abertura gravada (P2 de `store.mjs:1042`)

- **Reprodução** (RED abaixo, em processo e em processo real): com o `unlink` do `.lock` falhando
  por EIO na liberação da abertura, o launcher escrevia só `skill-me: não foi possível abrir a
  execução [io_failure]`, sem IDs, e saía com 5; o segmento 1 ficava `active` com `endedAt: null`,
  o ponteiro ficava e o lock também, e a abertura seguinte na raiz saía com `lock_present`. Com a
  confirmação perdida (o `unlink` apaga e lança), a captura ficava `active` sem lock e sem orientação.
  Com o lock trocado por outro processo, `[root_changed]`, também sem IDs.
- **Correção**: `holdLockFile` não mudou (prioridade do erro do callback, bytes conferidos, lock
  alheio nunca removido), então nenhum consumidor dele muda. `startLaunch` guarda a identidade quando
  o callback termina e, se a liberação falhar, o erro leva `opened`, `invocation`, `capture`,
  `launchedAt`, `lockPath` e `lockLeft`. O launcher não inicia o agente, escreve a linha da abertura,
  chama o encerramento de sempre e, se ele não concluir e `lockLeft`, a linha do lock com o `pid`
  dele e a condição de remoção. Nenhum comando novo, nenhuma remoção automática.
- **Provas** (4 no store, 3 pelo launcher em processo e 2 pelo launcher em processo real):
  liberação falhando uma vez e sempre (`io_failure`, lock com o `pid`, outra execução byte a byte
  igual, entregas dela com `lock_present` só enquanto o lock existe, nova abertura com
  `lock_present` sem captura nem agente), confirmação perdida (encerramento conclui, resumo com a
  captura `stopped`, sem linha de lock), lock trocado (`root_changed`, lock alheio intacto e não
  citado), prioridade do callback (controle). A recuperação declarada — conferir o `pid` no lock com
  o processo terminado, removê-lo, rodar o `privacy stop` mostrado — deixa a captura `stopped`, e a
  raiz volta a aceitar entregas e uma nova abertura que inicia o agente.
- **(e) No encerramento** (achado do autor depois de `dd18af0`, mesma classe — liberação que falha
  depois de um callback bem-sucedido): a sonda `probe-end-release.txt` mostrou, com a captura já
  `stopped`, o ponteiro fora e o lock preso, `skill-me: não foi possível encerrar a execução …
  [io_failure]; a captura <id> continua active.` e o `privacy stop`, sem falar do lock. Agora
  `startLaunch` e `endLaunch` passam pelo mesmo `keepingResult` (só em `store.mjs`, sobre `withLock`):
  `endLaunch` devolve `closed`, `lockPath` e `lockLeft`; o launcher escreve o resumo de sempre, a
  linha `skill-me: a execução <invocation> foi encerrada, mas a liberação do lock da raiz falhou
  [<código>].` e a linha do lock; a saída é a do agente. 3 provas (store, launcher em processo e em
  processo real com `SKILL_ME_TEST_TRACES_LOCK_KEPT=2`): captura `stopped` com o evento gravado,
  ponteiro fora, lock com o `pid`; `skill-me report` sai com 4 (`lock_present`) enquanto o lock
  existe e responde depois da remoção declarada.

### C44 — leitura transitória na espera da harness (P2 de `settle.py:26`)

- **Reprodução**: a leitura `active: false`, `deliveryFailed: 0`, `enqueued: 5`, `delivered: 2`
  virava `inactive` na hora, e a com a perda contada em parte (`deliveryFailed: 1`) virava `failed`;
  pela harness real com o Hermes simulado, o resultado gravava `settle.state: "inactive"` e
  `deliveryFailed: 0` aos ~300 ms.
- **Correção**: só `settle.py` e as provas mudam. Com `active` falso, `pending` enquanto
  `delivered + oversize + serializationFailed + deliveryFailed < enqueued`; depois `failed` se houve
  perda, senão `inactive`. Plugin, callbacks, leitura a cada 50 ms e `settleMaxMs` (5000 por
  padrão) não mudam; uma contagem que não fecha termina `timeout` no prazo.
- **Provas**: 7 leituras puras (desligada sem perda contada, perda parcial, perda inteira, fechada
  com grande demais e não serializável, sem destino, ativa pendente, ativa concluída); a espera com
  relógio controlado (sequência ativa → desligada sem perda → parcial → final termina `failed` aos
  400 ms com os contadores finais; leitura que não fecha → `timeout` aos 1000 ms do cenário e aos
  5000 ms do padrão); a `harness.py` real com o Hermes simulado (`failed`, contadores finais,
  `waitedMs` ≥ 600; sem destino, `inactive`).

### RED e GREEN

| Execução | Resultado |
| --- | --- |
| RED, Windows Node 24.22.1, produto de `57e031c` (= `6d57e6e`) com as provas novas (`red-win-24.22.1.spec.txt`) | 12 testes: 11 fail (todos `AssertionError` com o comportamento acima), 1 pass (o controle de prioridade, que já valia) |
| RED, WSL Ubuntu Node 24.13.0, árvore do índice temporário `643eaa09…`, archive LF `1984df24…` (`red-wsl-24.13.0.spec.txt`) | 12 testes: 11 fail, 1 pass, os mesmos |
| GREEN, Windows Node 24.22.1, com a correção (`green-win-24.22.1.spec.txt`) | 12/12; o arquivo da harness inteiro 8/8 (C39 e C40 inalterados) |
| Nativo, Windows, Hermes real, `hermes-plugin.native.test.mjs` sozinho (14:34:31–14:34:51; `native-green-win-24.22.1.spec.txt`) | 12/12, com I4-C22 e I25-C40 (`spawnfail`, `exit`, `disconnect` → `failed`) |
| RED de (e), Windows Node 24.22.1, produto de `858b583` (= `dd18af0`) (`red-e-win-24.22.1.spec.txt`) | 3 testes: 3 fail (`continua active` com a captura `stopped`; o `skill-me report` da prova ganhou `--skill` depois, sem mudar o que falhou) |
| RED de (e), WSL Node 24.13.0, árvore `4d052f48…`, archive LF `fa01015b…` (`red-e-wsl-24.13.0.spec.txt`) | 3 testes: 3 fail, os mesmos |
| GREEN de (e), Windows Node 24.22.1 (`green-e-win-24.22.1.spec.txt`) | C41, C43 e C44: 32/32 |

### Execuções intermediárias (HEAD `dd18af0`, antes de (e); logs em `builder-formal2/`)

Windows 24.22.1 e 24.13.0: 92 testes, 88 pass, 4 skip; WSL (archive `b37f49ff…`, árvore `42c4fc7f…`):
92 testes, 87 pass, 5 skip; `npm test` (14:39–14:47): exit 0, integrações 545 (534 pass, 0 fail, 11
skip). Superadas pelas execuções abaixo, porque (e) mudou o produto.

### Gate e execuções finais (HEAD `d71c143`)

Uma execução por vez, sem suítes concorrentes e sem repetir até passar; logs em
`builder-formal2/final/`.

| Execução | Resultado |
| --- | --- |
| Windows, Node 24.22.1, alvo I25 (`launch/*.test.mjs` + `hermes-harness.unit.test.mjs`), 14:53:57–14:55:48 | 95 testes: 91 pass, 0 fail, 4 skip (C5 e C6 POSIX, C42 POSIX, C15 pty) |
| Windows, Node 24.13.0 oficial (PATH e `execPath` dele, npm 11.6.2 do zip, sem `npm_execpath`), 14:55:56–14:57:50 | 95 testes: 91 pass, 0 fail, 4 skip |
| WSL `Ubuntu`, Node 24.13.0, npm 11.6.2, Python 3.12.3, uid 1000, 14:58:01–14:58:38, sobre `git -c core.autocrlf=false archive d71c143` (sha256 `f10f78cb…12589b18c2`; `get-tar-commit-id` = `d71c143b…`; árvore extraída `89f2d839…` = `HEAD^{tree}`; `cli.mjs` 755) | 95 testes: 90 pass, 0 fail, 5 skip (C4 shim, C5 console, C42 console, C8 LOCALAPPDATA, C38 console) |
| Windows, Node 24.22.1, `npm test` (14:58:44–15:09:16) | **exit 0**: governança 6/6; motor 16/16; doctor 417 (410 pass, 7 skip POSIX/FIFO); integrações 548 (537 pass, **0 fail**, 11 skip, todos POSIX, Linux ou macOS), com I4-C18–C23, I4-C37, I4-C44b, os três I23-C8 e o I25-C40 nativo executados e verdes no Hermes real |

Os 95 nomes I25 são os mesmos nos três TAP, sem `not ok`; os 15 C43/C44 rodaram (nenhum pulado) nos
três. `~/.skill-me` e `~/.skill-me-authorization.json` do uid 1000 ausentes antes e depois. Os
scratches `skill-me i4 i25 *` das janelas do 24.13.0 (302 em `dd18af0`, 314 em `d71c143`) foram
removidos por script do 24.22.1 com o caminho conferido no `%TEMP%`, 0 recusas; as cópias do WSL e
os temporários também.

### Recuperação manual que continua necessária e limitações

- **C43, lock que ficou**: quando a liberação falha por E/S e o lock da invocação continua no
  disco, só o usuário o remove, nas condições declaradas pelo launcher (E/S de volta, lock ainda
  com o `pid` do launcher, processo terminado); depois disso, o `privacy stop` mostrado encerra a
  captura. O ponteiro da execução continua, como no contrato de C31: `skill-me report` mostra a
  execução aberta, sem agente que grave nela. Não há repetição automática nem remoção do lock.
- **C43 (e)**: com o lock preso no fim, a recuperação é a mesma (remover o lock nas condições
  declaradas); as capturas já estão `stopped` e o ponteiro saiu, então não há `privacy stop` a rodar.
- **C44**: `deliveryFailed` do plugin também conta callbacks recusados depois do desligamento; se
  eles rodarem durante a drenagem, a soma pode fechar antes de a perda drenada ser contada — o estado
  sai `failed` (correto), com `deliveryFailed` menor que o final. Um registro posto na fila depois da
  drenagem nunca é contado pelo plugin e leva a `timeout` no `settleMaxMs`. As duas janelas são do
  plugin, fora do escopo.
- Continuam: uso real sem sessão de agente (`Unresolved` 2, `blocks go-live`); console real e pty
  dependem do Python do sistema; C23 sem asserção de tempo para o “sem espera”.

## Exceção autorizada: rodadas adicionais de verificação e revisão

O proprietário autorizou, depois das correções prontas em `e22b52a`, “Autorizar as duas rodadas
adicionais” ([comentário 6423912091](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6423912091);
contexto em `.checks/code-review/issue-25/context-exception-approved.json`): uma 4ª verificação
independente e uma 3ª revisão formal Codex, só para a #25, preservando o histórico.

- Tetos desta entrega: Verifier, 4 rodadas no total; revisão formal, 3 tentativas no total
  (`roundOverrides["25"] = {profile: "light", maxRounds: 3}` em `code-review.config.json`, com a
  autorização e a URL em `approval`). Os perfis globais continuam com `maxRounds` 2, as outras
  issues e o core vendorizado não mudam.
- As três verificações e as duas revisões `changes_requested` anteriores continuam no histórico.
  Nenhuma outra rodada foi autorizada; a verificação precisa passar antes da revisão; push e PR só
  com `ready`; merge e publicação não autorizados.
- Fonte do produto sem mudança (`d71c143`): o alvo I25 de 95 testes nos três ambientes e o
  `npm test` (987 testes: 969 pass, 0 fail, 18 skip de plataforma) da seção anterior continuam
  valendo. Nesta mudança, só os gates da configuração: `npm run test:governance` e
  `npm run test:code-review`.

## Regressão da terceira revisão formal em `9cd06d5` (S9, C45)

A quarta verificação independente deu PASS 44/44 (`9cd06d5`, só `.verified.md`, intacto aqui). A
terceira revisão formal, autorizada pela exceção do comentário 6423912091
(`.checks/code-review/issue-25/formal-review3.stdout.txt`), confirmou os achados anteriores como
corrigidos e pediu mudanças com um único P2 novo, em AC1. **Tetos da exceção consumidos: 4
Verifiers e 3 revisões formais.** Nada aqui roda revisão, Verifier, push, PR ou merge, nem muda
limites, configuração ou estado de review; estas provas são do autor e não autorizam entrega nem
`ready`. Outra rodada depende de nova exceção específica, pedida pelo orquestrador.

| Commit | Conteúdo |
| --- | --- |
| `9922e63` | Task 37, S9 com C45 e a linha “Componentes vazios do PATH” do Landing, antes do código |
| `7ab5dbf` | `launchPathDirs` em `agent.mjs`, provas de C45 e o campo `path` (PATH recebido) no registro do agente falso |

Logs em `.checks/code-review/issue-25/builder-formal3/` (pasta ignorada).

- **Semântica do runtime** (`posix-path-semantics-wsl.txt`, fixture sintética
  `posix-path-semantics.sh`: dois `skillme-probe` executáveis, no diretório atual e num `B`
  posterior, programas do sistema por caminho absoluto, nenhum agente): bash, dash, `execvp` (GNU
  `env`) e `spawn` do Node 24.13 escolhem o do diretório atual em `:B`, `X::B`, `X:`, `::B`,
  `X:::` e `PATH=""`, e o de `B` em `B`, `X:B` e `B:`; com o PATH ausente nenhum deles procura no
  diretório atual (todos “not found”).
- **Reprodução** (RED): `resolveAgentLaunch` dava `executable_not_found` para `/vazio:`,
  `/vazio:::` e `""`, e escolhia `/depois/bin/codex` em `:/depois/bin`, `/vazio::/depois/bin` e
  `::/depois/bin`, com `codex` no diretório atual; pelo launcher real no WSL, os mesmos PATHs
  saíam com 127 (`skill-me: codex não encontrado no PATH [executable_not_found]`) ou iniciavam o
  agente de `<depois>`.
- **Correção**: só `resolveAgentLaunch` muda. No POSIX, `launchPathDirs` divide o PATH em `:` e
  troca cada componente vazio pelo `cwd` da resolução, na posição dele; os demais seguem na ordem.
  O PATH entregue ao agente, os argumentos, o stdio e o código de saída não mudam. PATH ausente
  continua sem diretórios. Windows (`;`, vazios ignorados, PATHEXT, shim), `resolveAgents`,
  `runDiagnostics` e `integrations run` não mudam.

| Execução | Resultado |
| --- | --- |
| RED, Windows Node 24.22.1, produto de `9922e63` (= `9cd06d5`) com as provas novas (`red-win-24.22.1.spec.txt`) | 3 testes: a decisão do resolver falha (os 6 casos POSIX com vazio), o controle do Windows em processo real passa (como antes), o caso POSIX em processo real é pulado |
| RED, WSL Node 24.13.0, árvore `3f9473fe…`, archive LF `e0cc62ab…` (`red-wsl-24.13.0.spec.txt`) | 3 testes: decisão e processo real falham (127 ou o agente de `<depois>`), controle do Windows pulado |
| GREEN, Windows Node 24.22.1 (`green-win-24.22.1.spec.txt`) | C45, C4 e C7: 7 testes, 6 pass, 1 skip (o caso POSIX em processo real) |
| GREEN, WSL Node 24.13.0, no alvo final abaixo (`green-wsl-24.13.0-c45.txt`) | decisão e processo real POSIX passam; o controle do Windows é pulado |

### Gate e execuções finais (HEAD `7ab5dbf`)

Uma execução por vez, sem suítes concorrentes e sem repetir até passar; logs em
`builder-formal3/final/`.

| Execução | Resultado |
| --- | --- |
| Windows, Node 24.22.1, alvo I25 (`launch/*.test.mjs` + `hermes-harness.unit.test.mjs`), 15:57:10–15:58:53 | 98 testes: 93 pass, 0 fail, 5 skip (C45 POSIX, C5 e C6 POSIX, C42 POSIX, C15 pty) |
| Windows, Node 24.13.0 oficial (PATH e `execPath` dele, npm 11.6.2 do zip, sem `npm_execpath`), 15:59:04–16:00:58 | 98 testes: 93 pass, 0 fail, 5 skip |
| WSL `Ubuntu`, Node 24.13.0, npm 11.6.2, Python 3.12.3, uid 1000, 16:01:14–16:01:52, sobre `git -c core.autocrlf=false archive 7ab5dbf` (sha256 `828122a9…48eda9f1f2308`; `get-tar-commit-id` = `7ab5dbf6…`; árvore extraída `43773e12…` = `HEAD^{tree}`; `cli.mjs` 755) | 98 testes: 92 pass, 0 fail, 6 skip (C4 shim, C45 controle do Windows, C5 console, C42 console, C8 LOCALAPPDATA, C38 console) |
| Windows, Node 24.22.1, `npm test` (16:01:58–16:12:48) | **exit 0**: 990 testes, 971 pass, 0 fail, 19 skip de plataforma — governança 6/6; motor 16/16; doctor 417 (410 pass, 7 skip POSIX/FIFO); integrações 551 (539 pass, **0 fail**, 12 skip, todos POSIX, Linux ou macOS), com I4-C18–C23, I4-C37, I4-C44b, os três I23-C8 e o I25-C40 nativo executados e verdes no Hermes real |

Os 98 nomes I25 são os mesmos nos três TAP, sem `not ok`; em cada ambiente rodaram os dois C45
aplicáveis. `~/.skill-me` e `~/.skill-me-authorization.json` do uid 1000 ausentes antes e depois. Os
320 scratches `skill-me i4 i25 *` da janela do 24.13.0 foram removidos por script do 24.22.1 com o
caminho conferido no `%TEMP%`, 0 recusas; as cópias do WSL e os temporários também.

### Limites e declarações desta rodada

- PATH ausente continua `executable_not_found`: os runtimes usam um caminho padrão do sistema (sem o
  diretório atual), e o launcher não inventa esse padrão.
- `runDiagnostics` do doctor e `integrations run` continuam descartando componentes vazios: é a
  política deles, fora deste achado e não alterada.
- No Windows, o `cmd.exe` procura no diretório atual antes do PATH; isso é do shell e continua não
  modelado, como antes.
- Continuam: uso real sem sessão de agente (`Unresolved` 2, `blocks go-live`); console real e pty
  dependem do Python do sistema; C23 sem asserção de tempo para o “sem espera”.

## Nova exceção autorizada: tetos 6/5

O proprietário autorizou “Autorizar até 2 de cada (tetos 6/5)”
([comentário 6425235841](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6425235841);
contexto em `.checks/code-review/issue-25/context-bounded65-approved.json`), respondendo à pergunta
que limitou a até mais 2 verificações independentes e 2 revisões Codex, só para a #25, com o
histórico preservado e parada no primeiro `ready`.

- Tetos desta entrega: Verifier, até 6 rodadas no total; revisão formal, até 5 tentativas no total
  (`roundOverrides["25"].maxRounds` de 3 para 5, perfil light, com a resposta, a URL e a exceção
  substituída em `approval`). Substitui só o teto da exceção anterior (comentário 6423912091), cujo
  registro continua acima. Perfis globais com `maxRounds` 2, outras issues e core vendorizado sem
  mudança.
- As 4 verificações e as 3 revisões `changes_requested` anteriores continuam no histórico. Usar só
  as rodadas necessárias; o primeiro `ready` encerra a etapa. Push e PR só com verificação aprovada
  e revisão `ready` do conteúdo atual; merge e publicação não autorizados.
- Produto sem mudança (`7ab5dbf`): continuam valendo o alvo I25 de 98 testes nos três ambientes e o
  `npm test` (990 testes: 971 pass, 0 fail, 19 skip de plataforma) da seção anterior. Nesta mudança,
  só os gates da configuração: `npm run test:governance` e `npm run test:code-review`.

## CI do PR #28: `npm run` das provas sem `sh` (run 40397022558)

Estado de partida: HEAD `d11030f`, formal 4 `ready` (6 AC), Verifier 6 PASS (45 checks; o relatório R5
do incidente e o R6 ficam no histórico de `.verified.md`, intacto). A CI do PR no mesmo HEAD falhou
no Ubuntu 22.04 (integrações 551: 528 pass, 2 fail, 21 skip); Windows e macOS foram cancelados pelo
`fail-fast`. Falharam I25-C33 (`end.e2e.test.mjs:255`, `npm run on`) e I25-C34
(`report.cli.test.mjs:153`, `npm run status`), em `runNpmScript`/`singleJson`
(`helpers/observe.mjs`) com stdout e stderr vazios. O usuário autorizou corrigir as falhas da CI do
PR #28 e, verde, o merge; push, edição do PR e merge ficam com o orquestrador depois da revisão do
novo HEAD.

| Commit | Conteúdo |
| --- | --- |
| `cee3de8` | Causa e arranjo no checklist (linha “Ambiente do npm run nas provas” do Landing e acréscimo em C33), antes da correção |
| `2dfe676` | `npmScriptEnv` em `helpers/launch.mjs`, uso em C33 e C34, prova nomeada `I25-C33 arranjo do npm run`, `status` no erro de `singleJson` |

Logs em `.checks/code-review/issue-25/builder-ci28/` (pasta ignorada).

### Causa medida

- **Layout como o da CI no WSL** (`layout.sh`): o binário do Node 24.13.0 do sistema copiado para
  `/tmp/sm-ci28-wsl-*/node/bin/node`, o npm 11.6.2 em `node/lib/node_modules/npm` (como no
  `hostedtoolcache`), nenhum `sh` ao lado; checkout pelo `git -c core.autocrlf=false archive` exato
  (árvore conferida, `cli.mjs` 755); `env -i`, `HOME` do scratch e PATH explícito: o bin desse Node
  e uma pasta `tools` só com `sh`, `git`, `mkfifo` e `python3` — sem `/usr/bin`, que no WSL tem
  `claude`, `codex` e `gemini` reais. Nenhum agente real foi executado.
- **RED** (`red-wsl-isolado-24.13.0.spec.txt`, HEAD `d11030f`): I25-C33 e I25-C34 (`npm run status`)
  falham com `stdout não é um JSON único: "" stderr=""`, como na CI; os outros dois I25-C34 passam.
- **Causa** (`causa-npm-wsl-isolado.txt`, o mesmo spawn de `runNpmScript`): com o PATH dos dois
  testes (bin do Node + bin de fixture), `npm run --silent status` sai com 254, sem sinal nem erro de
  spawn, stdout e stderr vazios; sem `--silent`, o stderr é `npm error code ENOENT` / `npm error
  syscall spawn sh` / `npm error enoent spawn sh ENOENT`. Com uma pasta só com `sh` no meio, o mesmo
  comando sai com 0 e o JSON do `status`. O npm procura `sh` no PATH (`@npmcli/promise-spawn`; no
  Windows, `ComSpec`) e não acrescenta o diretório do Node (`@npmcli/run-script/lib/set-path.js`).
  No WSL de antes passava porque o Node está em `/usr/bin`, que tem `sh`.

### Correção (só provas)

`npmScriptEnv(scratch, env)`: no POSIX, uma pasta do scratch só com `node` (link para o
`process.execPath`) e `sh` (link para `/bin/sh`), seguida do PATH de fixture; no Windows, o diretório
do Node e a fixture, como antes. Asserções, skips, prazos, workflow e `fail-fast` não mudam; o PATH
real não é herdado. A prova `I25-C33 arranjo do npm run (POSIX)` reproduz o layout da CI com uma
pasta só com o `node`: `npm run status` sai com código diferente de 0 e `spawn sh ENOENT`, e com o
PATH das provas (só `node`, `sh` e fixture, conferidos pelos links) responde o JSON.

### RED, GREEN e gates (HEAD `2dfe676`)

Uma execução por vez, sem repetir até passar.

| Execução | Resultado |
| --- | --- |
| GREEN, layout isolado do WSL, `I25-C3[34]` (`green-wsl-isolado-24.13.0.spec.txt`; árvore `ab177034…`) | 5/5, com a prova nomeada |
| GREEN, Windows Node 24.22.1, `I25-C3[34]` (`green-win-24.22.1.spec.txt`) | 5 testes: 4 pass, 1 skip (a prova nomeada é POSIX) |
| Windows, Node 24.22.1, alvo I25 (`launch/*.test.mjs` + `hermes-harness.unit.test.mjs`), 18:01:57–18:03:55 | 99 testes: 93 pass, 0 fail, 6 skip (C45 POSIX, C5, C6, C42 POSIX, C33 arranjo, C15 pty) |
| Windows, Node 24.13.0 oficial (PATH e `execPath` dele, npm 11.6.2 do zip, sem `npm_execpath`), 18:04:06–18:06:34 | 99 testes: 93 pass, 0 fail, 6 skip; 320 scratches do 24.13.0 removidos por script do 24.22.1, 0 recusas |
| WSL Ubuntu, Node 24.13.0 do sistema, uid 1000, 18:06:51–18:07:39, sobre `git -c core.autocrlf=false archive 2dfe676` (sha256 `e32cd799…3125c75f`; `get-tar-commit-id` = `2dfe6761…`; árvore extraída `ab177034…` = `HEAD^{tree}`; `cli.mjs` 755) | 99 testes: 93 pass, 0 fail, 6 skip (só Windows); `~/.skill-me*` ausentes antes e depois |
| Windows, Node 24.22.1, `npm test`, 18:07:44–18:20:32 | **exit 1**: governança 6/6; motor 16/16; doctor 417 (410 pass, 7 skip); integrações 552 (538 pass, **1 fail**, 13 skip), com os 12 nativos do Hermes executados e verdes. A falha: `T7-C10` (`report/report.e2e.test.mjs`, issue #7) com `partial` no lugar de `sufficient` — o teste só confere `status 0` das entregas, e uma perdida sob carga dá esse resultado; sozinho, uma vez, passou (`t7-c10-isolado-win-24.22.1.spec.txt`, 7,3 s contra 12,3 s no lote). Não repetido |
| WSL, layout isolado, as quatro suítes da CI uma a uma, 1ª vez (`tools` mínima), 18:21:15–18:22:13 | governança 6/6; motor 16/16; doctor 417: 415 pass, 1 fail (`collector-probe-C10`, “retornou cedo demais: 280ms”), 1 skip; integrações 552: 527 pass, 4 fail, 21 skip — I25-C33 e C34 passam. Três falhas (I4-C44, I23-C14, T8-C16) são do ambiente montado: o runner de hooks do Codex nas provas usa `/bin/sh -lc`, o `/etc/profile` do WSL chama `id` e `grep`, ausentes na `tools` mínima, e o stderr esperado vazio recebeu os erros. A quarta, I4-C36, foi `codex/desconexao: null !== 0` (status `null`, processo terminado por sinal), no caso em que a prova destrói o canal de relatório do Codex — o fd 2, o mesmo stderr onde o `/etc/profile` escreveu `id: not found`; consistente com a mesma causa do ambiente (com `id` e `grep` presentes, esse caso passou na execução seguinte) |
| WSL, layout isolado corrigido (`tools` com os 990 executáveis de `/usr/bin` menos `claude`, `codex`, `gemini`, `hermes`, `node`, `nodejs`, `nsolid`, `npm`, `npx`, `corepack`…; `gate2/`), 18:23:29–18:24:32 | governança 6/6; motor 16/16; doctor 417: 416 pass, 1 skip (o `collector-probe-C10` passou); integrações 552: 530 pass, **1 fail**, 21 skip. A falha é `I4-C36` (issue #4) num caso diferente do da 1ª vez: `claude timeout: 900 ms`, a asserção `elapsedMs >= 1900 && < 6000` da linha 82 de `failure-matrix.cli.test.mjs`, que mede com `Date.now()` o hook que desiste do stdin em 2000 ms (`setTimeout`, relógio monotônico). [Correção factual posterior: a primeira versão desta linha atribuiu a esta execução o `codex/desconexao` da 1ª vez; o log `gate2/gate-wsl-isolado-test:integrations.log` mostra o timeout do Claude.] I4-C36 sozinho passou no layout isolado e com o Node do sistema (`gate2/i4-c36-*.spec.txt`). Não repetido |

### Limites e estado

- As falhas restantes nos gates completos (`T7-C10` no Windows, `I4-C36` e, na 1ª vez,
  `collector-probe-C10` no WSL) são de testes de outras issues, fora dos arquivos tocados, e
  passaram isoladas; não foram repetidas até passar. A CI do PR é a referência para elas.
  [Revisto na seção seguinte: passar isolado não resolve a falha do gate, e a CI não substitui o
  gate local; o diagnóstico de cada uma está em “Diagnóstico das falhas dos gates completos”.]
- A execução isolada de I4-C36 com o Node do sistema usou o PATH `/usr/local/bin:/usr/bin:/bin`,
  que no WSL tem agentes reais; o teste só roda os hooks instalados, por caminho absoluto do Node, e
  nenhum agente foi iniciado.
- O layout isolado reproduz o diretório do Node da CI, não o runner inteiro: macOS e o runner do
  GitHub não foram executados aqui. No Windows o arranjo não mudou (o npm usa o `ComSpec`).
- **Entrega pendente**: o HEAD novo precisa de verificação independente e de revisão formal. Os
  tetos da exceção do comentário 6425235841 (6 Verifiers e 5 revisões formais) estão com 6 Verifiers
  e 4 revisões usados; um Verifier 7 depende de nova exceção, que o orquestrador trata. Nenhum
  Verifier, revisão, push, edição do PR ou merge foi feito aqui.

### Diagnóstico das falhas dos gates completos (depois de `7e46de1`)

Correção factual feita acima, sem apagar o texto: a 1ª execução isolada teve I4-C36 em
`codex/desconexao` (`null !== 0`) e a 2ª (`gate2`) em `claude timeout: 900 ms`; são casos diferentes.
Nada abaixo muda fonte, prazos, asserções, skips, o runner ou testes de outras issues.

**WSL: relógio de parede com passos para trás** (`builder-ci28/final/wsl-relogio-journal.txt`,
leitura do journal do sistema). Durante as duas execuções isoladas, o `systemd-journald` registrou
`Time jumped backwards` a cada ~29 s, e o `systemd-resolved` registrou pares de `Clock change detected`
com o segundo carimbo até 0,68 s antes do primeiro (por exemplo 18:21:49,304 → 18:21:48,626 e
18:24:13,233 → 18:24:12,548); o mesmo padrão aparece desde 18:00. As duas falhas de tempo medem
duração com `Date.now()` e o código medido usa timer monotônico:
- `I4-C36` (2ª vez): `elapsedMs` com `Date.now()` em `installed-hooks.mjs` contra o `setTimeout` de
  2000 ms (`HOOK_STDIN_DEADLINE_MS`) do hook; 900 ms medidos para um prazo de 2000 ms só acontecem com
  o relógio de parede voltando no meio.
- `collector-probe-C10` (1ª vez, doctor): `elapsed = Date.now() - start` contra o prazo de 1000 ms;
  280 ms medidos. Passou na 2ª execução.
Conclusão: o ambiente WSL desta máquina não é suficiente para asserções de duração por `Date.now()`
de testes antigos (#4 e doctor); o runner da CI do GitHub não tem esse ajuste (lá elas passaram).
Corrigir esses testes exigiria um contrato de regressão próprio (relógio monotônico na medida) e
fica fora deste pedido; tolerâncias não foram tocadas.

**Windows: T7-C10 sob carga, não resolvido.** No `npm test` em `2dfe676` (integrações com 8
arquivos em paralelo nesta máquina de 32 núcleos), `T7-C10` (#7) deu `partial` no primeiro item e
`inconclusive` no sexto, o que corresponde a uma entrega perdida (o `post_tool_bash` de `npm test`):
o teste confere só `status 0` dos hooks, e uma entrega que estoura o prazo de 750 ms não aparece na
captura. É a mesma classe do G1 da #23, onde o `T7-C10` já tinha falhado junto com o `T8-C15` sob
carga (`.checks/issue-23-observacao-on-off.build.md`, seção “G1: confiabilidade do gate no
Windows”). Sozinho, passou.

**Fontes do teto de 8 arquivos.** `scripts/test-integrations.mjs` roda
`--test-concurrency=min(núcleos lógicos − 1, 8)` (no mínimo 1); entrou em `a3a76d8` pela decisão do
G1 da #23 (3 rodadas de cada lado nesta máquina: padrão de 31 arquivos com 7 `delivery_timeout` numa
delas, 8 arquivos com 0 nas três). O valor é **vinculante**: `tests/integrations/fixtures-inventory.test.mjs`
fixa `MAX_PARALLEL_FILES === 8` e a tabela `1→1, 2→1, 3→2, 4→3, 9→8, 10→8, 32→8, 128→8`, e o Verifier
da #23 registrou o gate verde com esse teto. Nos runners da CI (4 vCPU no Ubuntu e no Windows, 3 no
macOS) a fórmula já dá 3 e 2 arquivos; o teto de 8 só age em máquinas com mais de 8 núcleos.

**Medida 8 contra 4, mesmas condições** (`builder-ci28/medida/`, HEAD `7e46de1`, Windows 11, Node
24.22.1, 32 núcleos lógicos, `node --test --test-concurrency=<n> "tests/integrations/**/*.test.mjs"`,
uma execução de cada, em sequência, sem outra suíte minha):

| Paralelismo | Resultado | Duração |
| --- | --- | --- |
| 8 (18:32:08–18:40:29) | 552 testes, 539 pass, 0 fail, 13 skip; 12 nativos do Hermes | 501 s |
| 4 (18:40:29–18:49:59) | 552 testes, 539 pass, 0 fail, 13 skip; 12 nativos do Hermes | 569 s |

Uma execução de cada não mede taxa: o 8 também passou, e a falha do `T7-C10` não se repetiu. Não
há medida que justifique trocar o teto, e trocá-lo mudaria um valor aprovado e fixado por um teste
da #23. **O runner não foi alterado**; a decisão volta ao orquestrador, com as opções medidas:
manter o teto (a CI usa 3/2 arquivos de qualquer forma) ou abrir uma mudança própria do teto, com a
#23 como dona do contrato.

### Estado ao final desta rodada

- C33/C34: causa da CI resolvida e provada (RED/GREEN no layout isolado, alvos I25 verdes nos três
  ambientes).
- Gates completos locais: o `npm test` do Windows em `2dfe676` saiu 1 (`T7-C10`, carga, não
  resolvido); as integrações completas depois passaram com 8 e com 4 arquivos. No WSL isolado, as
  falhas restantes são de medida por `Date.now()` com o relógio do WSL voltando (evidência acima).
- O relatório do Verifier 6 (PASS de 45 checks em `d11030f`) está desatualizado para o HEAD novo.
  Entrega pendente de verificação independente e de revisão formal do HEAD novo; tetos da exceção
  6425235841 com 6 Verifiers e 4 revisões usados. Nenhum Verifier, revisão, push, edição do PR ou
  merge foi feito.

## Exceção autorizada para a verificação da correção da CI

O proprietário respondeu “Autorizar a 7ª verificação” à pergunta que explicitou uma sétima
verificação independente, exclusiva da #25 e com histórico preservado ([registro](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6431483843)).
A correção estava pronta em `0f2e069`, com alvo de 99 testes verde nos três ambientes e as
falhas antigas registradas. O teto do Verifier passa somente de 6 para 7; o de revisões formais
continua 5, com quatro consumidas. A quinta é necessária para o conteúdo alterado depois do
`ready` da quarta. Configuração do motor, perfis globais, core e outras issues permanecem iguais.

O pedido atual autoriza corrigir a CI do PR #28 e fazer o merge quando tudo estiver verde.
Atualização da branch exige Verifier e revisão `ready` do novo conteúdo; merge aguarda CI verde.
Nenhuma publicação foi autorizada. Os relatórios e falhas anteriores ficam no histórico.

## C28 na fixture: primeira entrega perdida (Verifier 7, `a755c37`)

O Verifier 7 deu FAIL 44/45 só por C28 na execução B (Windows, Node 24.13.0 oficial): `end.e2e.test.mjs:143`
com `undefined !== 0` em 62.170 ms; A, C e D verdes (relatório em `1a44ef1`, com R5 e R6 no histórico).
Tetos: 7 Verifiers usados de 7; 4 revisões formais de 5. Nenhum Verifier ou revisão rodou aqui.

| Commit | Conteúdo |
| --- | --- |
| `c94a7e2` | Linha “Diagnóstico do C28 na fixture” do Landing, acréscimo em C28 e nota na task (critério 21 sem mudança), antes do código |
| `8eafa11` | `hermes-plugin-session.py` com orçamento 25 s + 25 s e saída de diagnóstico; C28 com cenário e saída separados e conferência do supervisor antes do parse; regressão `I25-C28 primeira entrega perdida`; `SKILL_ME_TEST_TRACES_SEGMENT_EIO` na pré-carga de teste |

Logs em `.checks/code-review/issue-25/builder-c28/` (pasta ignorada).

### O que está provado e o que não

- **Provado pelos artefatos de B** (`verifier-round7/B-c28-leftover/`): o arquivo de saída ainda era o
  cenário (os dois eram `plugin.json`), a captura ficou `active` com `accepted` e `persisted` 0 e sem
  segmento, o ponteiro ficou, e os 62 s batem com o limite de 60 s do `runSkillMe`. A fixture esperava
  até 60 s pelo primeiro registro e mais 30 s pelos outros, acima do limite do supervisor.
- **Inferido** (mtimes): uma operação sob o lock criou e removeu uma entrada no diretório da captura
  ~1,5 s depois da abertura, compatível com uma gravação de segmento desfeita.
- **Desconhecido**: a causa da perda do primeiro registro em B. A entrega da execução não publica
  relatório e o plugin descarta a saída do processo de entrega. A regressão reproduz a **classe**
  (primeira entrega perdida com gravação desfeita), não a causa; esta correção torna a falha
  diagnosticável e limitada ao prazo, e não elimina a causa.

### Correção (só prova e fixture)

- C28 grava o cenário em `cenario.json` e a saída em `plugin.json`; antes do parse, confere `signal`
  nulo e a existência da saída, com status e stderr do launcher na mensagem. As asserções do caso
  saudável são as mesmas (`started`/`delivered` verdadeiros, `enqueued` 3, `sent` 3, fila e falhas 0,
  `persisted` 3, todas `stopped`, status 0, `eventos gravados: 3.`).
- `hermes-plugin-session.py`: até 25 s pelo primeiro registro gravado e até 25 s pela entrega dos
  demais (10 s de margem até os 60 s do `runSkillMe`). Se o primeiro não é gravado, os outros hooks não
  são disparados e a saída é `{"started": false, "delivered": false, "stats": …}`; nada é reenviado.
- Regressão determinística: `SKILL_ME_TEST_TRACES_SEGMENT_EIO=1` faz a 1ª promoção de segmento lançar
  EIO no processo de entrega (único processo que promove segmento nesta prova), propagada por
  `NODE_OPTIONS`, e `SKILL_ME_TEST_TRACES_TIMING` registra operação, tipo e código, sem caminho nem
  conteúdo. Esperado e obtido: launcher com status 0 e `signal` nulo; saída com `status` 0 e
  `{"started": false, "delivered": false, "stats": {"enqueued": 1, "delivered": 1, "droppedQueueFull": 0,
  "deliveryFailed": 0, "oversize": 0, "serializationFailed": 0, "active": true}}`; captura única
  `stopped` com `accepted` 0 e `persisted` 0; ponteiro ausente; `eventos gravados: 0.`; um só `rename`
  de `segmento.tmp` (com `EIO`) e um `unlink` de `segmento.tmp` somando todos os processos.

### RED, GREEN e provas finais (HEAD `8eafa11`)

| Execução | Resultado |
| --- | --- |
| RED, Windows Node 24.22.1, provas novas com a fixture antiga (`red-win-24.22.1.spec.txt`, HEAD `c94a7e2` com o diff dos testes e da pré-carga) | 2 testes: C28 saudável pass; `I25-C28 primeira entrega perdida` **fail** em 61.706 ms: `o launcher não terminou sozinho; launcher: status null, sinal SIGKILL; stderr: ` — o sintoma do Verifier 7 (limite de 60 s, sem saída da fixture) |
| GREEN, Windows Node 24.22.1 (`green-win-24.22.1.spec.txt`) | 2/2; a regressão em 28.187 ms |
| Alvo I25 (`launch/*.test.mjs` + `hermes-harness.unit.test.mjs`, `--test-concurrency=4`), Windows Node 24.22.1, 23:09:18–23:11:37 | 100 testes: 94 pass, 0 fail, 6 skip (C45 POSIX, C5, C6, C42 POSIX, C33 arranjo, C15 pty) |
| O mesmo, Windows Node 24.13.0 oficial (PATH e `execPath` dele, npm 11.6.2 adjacente, `npm_execpath` ausente), 23:11:50–23:14:10 | 100 testes: 94 pass, 0 fail, 6 skip; 325 scratches do 24.13.0 removidos por script do 24.22.1, 0 recusas |
| O mesmo, WSL Ubuntu uid 1000, Node 24.13.0 copiado num prefixo sem `sh` com npm 11.6.2, `env -i`, PATH sem `/usr/bin` (`tools`: `sh`, `git`, `mkfifo`, `python3`, `id`, `grep`), `git -c core.autocrlf=false archive 8eafa11` (5.509.120 bytes, sha256 `b5e416ee…5d996b25`, `get-tar-commit-id` = `8eafa11d…`, árvore extraída `347c3cf4…` = `HEAD^{tree}`, `cli.mjs` 755), 23:14:32–23:15:33 | 100 testes: 94 pass, 0 fail, 6 skip (só Windows); `~/.skill-me` ausente antes e depois |
| Windows, Node 24.22.1, `npm test`, 23:15:38–23:24:48 | **exit 0**: governança 6/6; motor 16/16; doctor 417 (410 pass, 7 skip); integrações 553 (540 pass, **0 fail**, 13 skip); total 992: 972 pass, 0 fail, 20 skip; os 12 nativos do Hermes executados e verdes; os dois C28 verdes |

Os 100 nomes I25 são os mesmos nos três TAP, sem `not ok`; os dois C28 rodaram nos três. A regressão
levou 28,2 s, 28,2 s e 26,1 s; o C28 saudável 3,9 s, 4,1 s e 1,1 s. Os gates globais do WSL com medidas
por `Date.now()` não foram repetidos (relógio do WSL comprovadamente instável, seção anterior).

### Limites e pendências

- A causa da perda do primeiro registro em B continua desconhecida; se ela se repetir, o C28 agora
  falha em até ~50 s com `started: false` e os contadores do plugin, e a execução termina `stopped`.
- A regressão acrescenta ~28 s ao alvo (o orçamento de 25 s do primeiro registro).
- Entrega pendente: o HEAD novo precisa de verificação independente (Verifier 8, que exige nova
  autorização do proprietário) e da revisão formal 5. Nenhum Verifier, revisão, push, edição do PR ou
  merge foi feito aqui.

## Exceção autorizada para a verificação da fixture C28

O proprietário respondeu “Autorizar a 8ª verificação” à pergunta que explicitou uma oitava
verificação independente, exclusiva da #25, com histórico preservado ([registro](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6432258457)).
O teto do Verifier passa somente de 7 para 8. A sétima rodada FAIL fica preservada em `1a44ef1`.
O teto formal permanece 5, com quatro consumidas; configuração do motor e limites globais não mudam.

A correção estava pronta em `22e8fc5`, com alvo100 verde nos três ambientes e `npm test` com
972 pass, zero falhas e 20 skips. A perda original segue com causa desconhecida; a fixture agora
informa e encerra a execução no cenário reproduzido, mantendo as asserções saudáveis.
PASS independente e `ready` do conteúdo novo precedem a atualização do PR #28; o merge está
autorizado quando a CI estiver toda verde. Publicação não foi autorizada.
