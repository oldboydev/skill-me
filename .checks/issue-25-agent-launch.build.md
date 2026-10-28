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

## CI 40443538957 (Windows): C1 e C32

Estado de partida: HEAD `3bc40b1`, Verifier 8 PASS 45/45 e revisão formal 5 `ready` (6 AC), ambos
preservados. Na CI 40443538957 (job 121989332792), Ubuntu 22.04 e macOS 14 passaram; o Windows
(Node 24.13.0) falhou nas integrações em I25-C1 (`command.cli.test.mjs:77`, ` M src/integrations/launch/cli.mjs`
depois do `npm link`) e I25-C32 (`end.e2e.test.mjs:272`, `tempo esgotado: eventos intercalados`,
30,5 s). Tetos: 8 Verifiers de 8 e 5 revisões formais de 5, todos usados; nenhum rodou aqui.

| Commit | Conteúdo |
| --- | --- |
| `bcd984e` | Linhas “Bin do launcher em LF em todo checkout” e “Diagnóstico de C32” do Landing, acréscimos em C1 e C32, nota na task (critérios 1 e 25 sem mudança), antes do código |
| `485467c` | C32: esperas pelo apoio `withOverlappingRuns` (mesmo limite de 30 s, falha na hora se uma invocação termina antes, libera barreiras e traz diagnóstico); prova `I25-C32 diagnóstico das invocações simultâneas` |
| `abae80a` | `.gitattributes` com `src/integrations/launch/cli.mjs text eol=lf` |

Logs em `.checks/code-review/issue-25/builder-ci28b/` (pasta ignorada). Clones novos do repositório
local com `git clone --config core.autocrlf=<valor>` (config só no clone; a do sistema, `true`, não foi
tocada), `node_modules` copiado, sem rede.

### C1: causa confirmada e corrigida

- **Causa**: num checkout com `core.autocrlf=true`, `cli.mjs` sai com CRLF; o `npm link` do npm 11.6.2
  chama `bin-links/lib/fix-bin.js` (bin-links 5.0.0), que faz `chmod` e, se a primeira linha termina em
  `\r\n`, reescreve o arquivo com `writeFileAtomic(file, content.replace(/^(#![^\n]+)\r\n/, '$1\n'))`.
  No checkout local deste build o arquivo estava em LF, por isso o C1 passava aqui.
- **RED** (clone novo de `3bc40b1`, Node 24.13.0 oficial, npm 11.6.2, sem `npm_execpath`;
  `red-c1-*`): com `autocrlf=true`, `ls-files --eol` = `i/lf w/crlf`, primeira linha `node\r\n` antes e
  `node\n` depois, 124 CR nas outras linhas, `git status` com ` M src/integrations/launch/cli.mjs` e C1
  **fail** (`npm link não altera o checkout`); com `false`, `w/lf`, 0 CR e C1 pass.
- **GREEN** (clone novo de `abae80a`; `green-c1-*`): com `true` e com `false`, `w/lf attr/text eol=lf`,
  0 CR antes e depois, `git status` vazio, C1 pass. As asserções de C1 não mudaram.

### C32: causa não demonstrada; diagnóstico e ciclo de vida

- **Matriz M2** (`m2/`, finita e planejada): clones novos de `485467c` (já com o diagnóstico, ainda
  sem a correção do C1), 3 com `autocrlf=true` e 3 com `false`, cada um uma vez com `command.cli`,
  `end.e2e` e `prepare.cli` em `--test-concurrency=3`, Node 24.13.0 oficial. Resultado: 50 testes por
  execução; C1 falhou nas 3 com `true` (sempre ` M cli.mjs`) e passou nas 3 com `false`; os dois C32
  passaram nas 6 (8,4–9,7 s e 3,2–3,6 s), inclusive nas execuções em que o C1 reescreveu o `cli.mjs`.
  A falha da CI não se reproduziu; a hipótese de interferência do C1 não ficou demonstrada (e o
  `writeFileAtomic` troca o arquivo por `rename`).
- **O que mudou na prova** (sem mudar contrato, concorrência, limite ou asserções): uma invocação que
  termina antes dos marcadores faz a espera falhar na hora; em qualquer falha, os marcadores de
  barreira são gravados, as duas invocações terminam, e o erro traz marcadores vistos, o ID da
  execução de cada probe, as capturas (segmento, estado, `persisted`) e status, sinal e stderr de cada
  launcher. É diagnóstico para a próxima CI, não a resolução da causa.
- **Prova do apoio** (`I25-C32 diagnóstico das invocações simultâneas`): a segunda invocação sem
  agente no PATH sai com 127; a espera falha com `eventos intercalados: B terminou antes` em 3,2–3,6 s
  (não `tempo esgotado`), `launchers.B` = `{status: 127, signal: null, stderr: "skill-me: claude não
  encontrado no PATH [executable_not_found]\n"}`, `probes.B` nulo, e A, liberada da barreira, termina
  com 0. O RED do C32 antigo não foi reproduzido (limite).

### Provas finais (HEAD `abae80a`)

Uma execução por ambiente, em sequência, sem repetir até passar.

| Execução | Resultado |
| --- | --- |
| Alvo I25 (`launch/*.test.mjs` + `hermes-harness.unit.test.mjs`, `--test-concurrency=4`), Windows Node 24.22.1, checkout principal, 01:12:17–01:14:43 | 101 testes: 95 pass, 0 fail, 6 skip |
| O mesmo, Windows Node 24.13.0 oficial (npm 11.6.2 adjacente, `npm_execpath` ausente), **num clone novo com `core.autocrlf=true`**, 01:14:56–01:17:21 | 101 testes: 95 pass, 0 fail, 6 skip; `git status` do clone vazio depois; 330 scratches removidos |
| O mesmo, WSL Ubuntu uid 1000, Node 24.13.0 copiado num prefixo sem `sh` com npm 11.6.2, `env -i`, PATH sem `/usr/bin`, `git -c core.autocrlf=false archive abae80a` (5.539.840 bytes, sha256 `2d316cad…5c0109f8`, `get-tar-commit-id` = `abae80ac…`, árvore extraída `9b5e3630…` = `HEAD^{tree}`, `cli.mjs` 755), 01:17:42–01:18:47 | **101 testes: 94 pass, 1 fail, 6 skip, exit 1** — `I25-C34 report da execução: escolhe a iniciada por último…` (`report.cli.test.mjs:130`): esperado `[nova, true]`, obtido `[antiga, false]`. Não repetido |
| Windows, Node 24.22.1, `npm test`, checkout principal, 01:19:26–01:27:18 | **exit 0**: governança 6/6; motor 16/16; doctor 417 (410 pass, 7 skip); integrações 554 (541 pass, **0 fail**, 13 skip); total 993: 973 pass, 0 fail, 20 skip; os 12 nativos do Hermes executados e verdes; `git status` sem mudança de fonte depois |

Os 101 nomes I25 são os mesmos nos três TAP. A falha de C34 no WSL: a prova só inicia a execução nova
depois de o agente da antiga estar rodando, então a antiga recebeu o `launchedAt` (`Date.now()`,
`store.mjs:1041/1049`) antes; o report escolher a antiga significa que o relógio de parede voltou entre
as duas aberturas. O journal do WSL registra, dentro da janela, passos para trás de 0,56 s
(01:17:47), **1,24 s** (01:18:15,918 → 01:18:14,677) e ~1,2 s (01:18:43–44)
(`final/wsl-relogio-journal.txt`). É a mesma instabilidade do relógio do WSL registrada antes, agora
sobre a ordem por `launchedAt` do C34; nem o report nem a prova mudaram nesta rodada.

### Limites e pendências

- C32: causa da falha da CI desconhecida; a matriz não reproduziu; a próxima falha vem com diagnóstico.
- C34 no WSL: a escolha da execução mais recente usa o relógio de parede (contrato do Landing); com o
  relógio do WSL voltando mais que o intervalo entre as duas aberturas da prova, ela escolhe a antiga.
  Fica registrada como limite do ambiente; nenhuma mudança de produto ou de prova foi feita.
- C1 continua comparando a árvore compartilhada antes e depois do link; um arquivo não rastreado criado
  por outro teste nesse intervalo apareceria.
- Entrega pendente: o HEAD novo precisa de verificação independente (Verifier 9) e revisão formal
  (6), que exigem nova autorização; nenhum Verifier, revisão, push, edição do PR ou merge foi feito.

### C34 com cronologia explícita (bloqueio do alvo WSL em `abae80a`)

O alvo POSIX completo em `abae80a` terminou FAIL em `I25-C34 … escolhe a iniciada por último`
(`report.cli.test.mjs:130`, `[antiga, false]` no lugar de `[nova, true]`); o log fica em
`builder-ci28b/final/wsl-24.13.0.*` e não foi repetido. Os `launchedAt` da falha não ficaram no log:
o que se sabe é que a prova abria a nova depois de um marcador da antiga e dependia de o relógio do
host crescer entre as duas aberturas, e que o journal do WSL registrou na janela recuos de até 1,24 s.
Não se afirma causa única.

| Commit | Conteúdo |
| --- | --- |
| `f69d05f` | Linha “Cronologia explícita no C34” do Landing e acréscimo em C34, antes do código |
| `6732475` | `report.cli.test.mjs`: aberturas em processo com relógio próprio (`runSkillMeInProcess`, `launchClock` sobre o `deps.now` existente), precondições com tempos, regressão do recuo; `withOverlappingRuns` movido para `helpers/launch.mjs`, com `track` e `launchedAt`/`createdAt` no diagnóstico; C32 passa a importá-lo |

- **Contrato mantido**: `latestLaunch` escolhe o maior (`launchedAt`, `invocation`); nada no produto
  mudou. `deps.now` só carimba abertura e encerramento; prazos, locks e entregas seguem com o tempo
  real.
- **Prova com tempos controlados**: antiga em início − 2 h e nova em início − 1 h, cada relógio
  andando com o tempo monotônico e passando ao do sistema depois da abertura; a sucessora da antiga
  nasce pelo hook, no relógio do sistema. A prova confere `launchedAt` da nova > da antiga e que a
  captura de `createdAt` mais recente das duas execuções é a sucessora da antiga, antes da escolha;
  depois, a escolha aberta e encerrada, o segmento 1 da antiga apagado sem contaminar a nova, e a
  execução mais recente com o segmento 1 apagado e o ausente explícito, como antes.
- **Erro plausível rejeitado** (`builder-c34/mutacao-createdAt-win-24.22.1.spec.txt`): numa cópia
  descartável (árvore do índice temporário), com `latestLaunch` mutado para escolher pela captura de
  `createdAt` mais recente, a prova falha na escolha com `[antiga, false]` contra `[nova, true]` — a
  mesma forma da falha do WSL — e o erro traz o diagnóstico novo: marcadores, probes, capturas com
  `launchedAt` (antiga 02:35:12, nova 03:35:14) e `createdAt` (sucessora 04:35:16), e os dois
  launchers terminados com 0 depois da liberação das barreiras. A cópia foi apagada; o checkout não
  foi tocado.
- **Regressão do recuo** (`I25-C34 recuo do relógio entre as aberturas`): com a segunda abertura
  carimbada 5 s antes da primeira, `skill-me report --format json` escolhe a primeira, aberta, e a
  precondição temporal falha com a mensagem exata contendo os dois `launchedAt`. Mostra que o recuo
  entre as aberturas basta para o sintoma do WSL; não prova que foi a causa daquela falha.
- **`--latest`**: a abertura do launcher é carimbada 60 s depois do `createdAt` da automática; a
  precondição “a do launcher é a mais recente” vale por construção.
- **GREEN Windows 24.22.1** (`builder-c34/green-win-24.22.1.spec.txt`): C32 (2), C34 (4) e C35, 7/7.

| Alvo I25 (`--test-concurrency=4`) em `6732475` | Resultado |
| --- | --- |
| A — Windows Node 24.22.1, checkout principal, 01:35:48–01:38:35 | 102 testes: 96 pass, 0 fail, 6 skip |
| B — Windows Node 24.13.0 oficial (npm 11.6.2 adjacente, `npm_execpath` ausente), clone novo com `core.autocrlf=true`, 01:38:53–01:41:31 | 102 testes: 96 pass, 0 fail, 6 skip; `git status` do clone vazio antes e depois; 337 scratches removidos |
| C — WSL Ubuntu uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, npm 11.6.2, `env -i`, PATH sem `/usr/bin`, `git -c core.autocrlf=false archive 6732475` (5.560.320 bytes, sha256 `c3968f55…828f61`, `get-tar-commit-id` = `6732475b…`, árvore extraída `d82e196f…` = `HEAD^{tree}`, `cli.mjs` 755), 01:41:56–01:43:08 | 102 testes: 96 pass, 0 fail, 6 skip; os 4 C34 passaram; o journal registrou recuos de ~1,27 s às 01:42:18 e 01:42:46 durante o alvo (`C-wsl-relogio-journal.txt`) |

Os 102 nomes I25 são os mesmos nos três TAP, sem `not ok`. O `npm test` completo **não** foi repetido
nesta mudança (só provas do alvo): o último é o de `abae80a`, no checkout principal do Windows com
Node 24.22.1, 01:19:26–01:27:18, exit 0, 993 testes (973 pass, 0 fail, 20 skip), com os 12 nativos
do Hermes (`builder-ci28b/final/npm-test.log`) — anterior à nova prova do C34. O gate D do próximo
Verifier deve rodar no HEAD aprovado.

Limites: a regra do produto continua a de wall clock (`launchedAt` de `Date.now()` no uso real): num
host cujo relógio recua mais que o intervalo entre duas aberturas, “a iniciada por último” segue o
carimbo, como a regressão mostra; isso é comportamento do contrato, não mudado aqui. A entrega
continua pendente de Verifier 9 e revisão formal 6, com os tetos 8/5 consumidos.

## Exceção autorizada: 9ª verificação e 6ª revisão

O proprietário autorizou “Autorizar a 9ª verificação e a 6ª revisão”
([comentário 6434588924](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6434588924);
handoff [6433972110](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6433972110);
contexto em `.checks/code-review/issue-25/context-ci28-verifier9-approved.json`, 16 comentários e 6
ACs), só para a #25, com o histórico preservado.

- Tetos desta entrega: 9 verificações independentes e 6 tentativas formais no total
  (`roundOverrides["25"].maxRounds` de 5 para 6, perfil light, com a resposta, a URL e o teto
  substituído em `approval`). Perfis globais com `maxRounds` 2, outras issues e core vendorizado sem
  mudança.
- As 8 verificações e as 5 revisões anteriores continuam no histórico; o PASS da 8ª e o `ready` da 5ª
  cobrem o conteúdo anterior. O Verifier 9 e a revisão formal 6 são as únicas rodadas novas, sobre o
  conteúdo de `6520599` (último código de prova `6732475`); usar só a necessária e parar no primeiro
  `ready`. Depois do PASS e do `ready`, atualizar o PR #28 e fazer o merge com toda a CI verde segue
  autorizado; nenhuma publicação do pacote.
- Sem mudança de produto ou prova: os alvos I25 em `6732475` (102 testes, 96 pass, 0 fail, 6 skip nos
  três ambientes) e o `npm test` de `abae80a` (993: 973 pass, 0 fail, 20 skip) da seção anterior
  continuam como estão. Nesta mudança, só os gates da configuração: `npm run test:governance` e
  `npm run test:code-review`.

## Diagnóstico do T8-C15 (AC7, autorização 6440482031; S10, C46)

Estado de partida: HEAD `a718865` (proposta), árvore limpa. A 9ª verificação ficou como FAIL em
`4e66de2`: 45/45 checks com prova verde e o alvo de 102 testes verde em A, B e C; o gate D (`npm test`
no Windows, Node 24.22.1, teto 8) teve 994 testes, 973 pass, 1 fail, 20 skip. A falha foi o `T8-C15`
(`concurrency.cli.test.mjs:107`): o produtor `b` com `{bound: true, code: "io_failure", entries: 40,
committed: 20, persisted: 20, lost: 20}`; `a` confirmou 40. **Não se sabe** se as 20 sem confirmação
ficaram no disco, quantos lotes falharam, nem a operação e o código de erro. O caminho de E/S da
captura manual não mudou na #25 (diff complementar fechado pelo orquestrador). O registro de
`io_failure` anterior à #23 não mede taxa nem demonstra a mesma causa. O proprietário respondeu
“Autorizar ajuste pontual e 10ª verificação”
([comentário 6440482031](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6440482031)); o
Verifier 10 é do orquestrador, depois destas provas, e o teto formal continua 6, com 5 consumidas.

| Commit | Conteúdo |
| --- | --- |
| `b7ad0f3` | Task 38 e Sources, Landing “Diagnóstico do T8-C15”, S10/C46, Handoff e o handoff do T8-C15 marcado como autorizado (texto original preservado), antes do código |
| `710076e` | `concurrency.cli.test.mjs`: rotina comum do T8-C15 e das três provas I25-C46 |

Logs em `.checks/code-review/issue-25/builder-t8c15/` (pasta ignorada).

- **O que mudou (só a prova antiga)**: os dois produtores continuam dois `ingest --agent hermes`
  iniciados juntos por `Promise.all`, 40 linhas cada com pausas de 4 ms, na mesma captura manual; cada
  um carrega a pré-carga de tempos existente por `timedEnv` (`NODE_OPTIONS`), com um arquivo por
  produtor num scratch próprio. Antes das asserções, `inspectProducers` (nunca lança) junta status,
  sinal, ms da saída e relatório de cada produtor; `describeTiming`/`deliveryTiming` com as operações
  com erro e a fase (`antes do commit`, `depois do commit`, `tomada do lock`, `fora do lock`), com o
  `open lock EEXIST` contado à parte; o export por produtor, o status, segmentos, temporários e o
  lock, ou `indisponível [<código>]`. As asserções são as mesmas (status 0, 40/40/40/0/`null` por
  produtor, 80 eventos, segmento coerente, hooks, recusa com lock alheio); só a mensagem das duas
  primeiras ganha a evidência.
- **Pré-carga conferida** (`tests/integrations/helpers/traces-probe.mjs:118-168`): cada operação vai
  para um array em memória (`ops.push`), e o `process.on("exit")` grava uma única linha com
  `appendFileSync`. O custo possível no tempo dos produtores é o carregamento da pré-carga por
  `NODE_OPTIONS` e, por operação, dois `performance.now()` e um `push`. Não foi medido à parte: na
  execução A cada produtor fez de 1.000 a 1.600 operações de disco, com 109 a 187 ms de CPU.
- **RED** (a prova antiga numa cópia descartável de `b7ad0f3`, com só o env do produtor `b` alterado
  por `red-patch.mjs`): `SKILL_ME_TEST_TRACES_SEGMENT_EIO=1` (falha antes do commit) e
  `SKILL_ME_TEST_TRACES_LOST_CONFIRMATION=2` (confirmação perdida depois dele) deram a **mesma**
  mensagem, `AssertionError: b` com `{code: "io_failure", committed: 34, persisted: 34, lost: 6}`: sem
  operação, código nem export, os dois casos eram indistinguíveis
  (`red-old-*-win-24.22.1.spec.txt`).
- **Primeira GREEN, falha da minha comparação** (`green-first-win-24.22.1.spec.txt`): o T8-C15 passou e
  os três controles falharam só porque eu comparava `failure.message` por igualdade; no Node 24 a
  mensagem de um `AssertionError` com texto próprio recebe o diff dos valores no fim. A evidência já
  estava certa: antes do commit, export `b 30/40` e `rename segmento.tmp EIO (antes do commit)`;
  confirmação perdida, `b` com 33 confirmadas e 7 perdidas e export `b 40/40`, com `unlink lock EIO
  (depois do commit)`; lock preso, `a` com `lock_present` (7/33), `b` com `io_failure` (0/40), export e
  status `indisponível [lock_present]`, lock presente. A prova passou a conferir o `actual` e o
  `expected` da asserção original e o início da mensagem (nome e evidência inteira); **GREEN** 4/4
  (`green-second-win-24.22.1.spec.txt`).
- **Mutações** (cópia descartável): fase que ignora o commit → os controles (b) e (c) falham
  (`unlink lock EIO (antes do commit)`); inspeção que inventa contagens zero quando o CLI falha → (c)
  falha (`mutation-*-win-24.22.1.spec.txt`).

| Alvo `concurrency.cli.test.mjs` inteiro em `710076e` | Resultado |
| --- | --- |
| A — Windows, Node 24.22.1, checkout principal, 08:27:29–08:28:01 | 13 testes: 13 pass, 0 fail, 0 skip; T8-C15 3,2 s, C46 1,0/1,0/1,1 s |
| B — Windows, Node 24.13.0 oficial, npm 11.6.2 adjacente, `npm_execpath` ausente, 08:28:12–08:29:37 | 13/13; T8-C15 11,5 s, C46 3,2/3,2/3,6 s; 20 scratches do 24.13.0 removidos, 0 recusas |
| C — WSL Ubuntu uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, npm 11.6.2, `env -i`, `HOME` do scratch, PATH só com o prefixo e `tools` (`sh`, `git`, `python3`, `id`, `grep`, `mkfifo`), `git -c core.autocrlf=false archive 710076e` (5.591.040 bytes, sha256 `f9cfb8af…5af8b24e`, árvore extraída `ff13a1ba…` = `HEAD^{tree}`), 08:30:44–08:31:04 | 13/13; T8-C15 1,6 s, C46 0,3/0,3/0,9 s; `~/.skill-me` ausente antes e depois |

Os 13 nomes são os mesmos nos três TAP (`final/*.names`).

**Execução completa instrumentada em `710076e`** (a única desta investigação; Windows, Node 24.22.1,
runner padrão com 8 arquivos, 32 núcleos, os 12 nativos do Hermes; 08:31:42–08:37:03): **`npm test`
saiu com 1** (`final/npm-test.exit` = 1, `EXIT=1` em `final/npm-test.env.txt`). 997 testes: 976 pass,
**1 fail**, 20 skip — governança 6/6; motor 16/16; doctor 417 (410/0/7); integrações 558 (544/1/13).
O T8-C15 (3,7 s) e os três C46 (1,0/1,0/1,6 s) passaram; a falha de R9 **não se reproduziu** nessa
execução, o que não mede taxa. A única falha foi o I25-C32 (seção seguinte). O processo em segundo
plano que envolvia o `npm test` terminou com 0: esse é o código do script, não o do teste.

**Processo do autor**: o meu processo do CLI desta sessão continuou aberto depois de emitir o relato.
O orquestrador encerrou **só** o PID 117484 (pai 124104, criado às 08:14:31; dados dele em
`builder-t8c15/completed-author-process.json`, não alterado), depois de o gate terminar e do relato
completo; nenhum teste foi interrompido e nenhum log descartado. O código de saída desse processo não
é resultado de teste: o do gate é o `EXIT=1` acima.

Limpeza: as cópias descartáveis (RED, mutações) foram apagadas; 127 pastas de testes de outras issues
criadas na janela do `npm test` (`skill-me i4 i5 …` 124, `skill-me i4 t7 …` 2, `skill-me i5 c7 …` 1)
foram removidas do `%TEMP%` com linha de base, prefixo e janela conferidos (0 recusas); as 3 entradas
fora desses prefixos ficaram.

Limites: a causa da falha da R9 continua **desconhecida**; a instrumentação a torna diagnosticável,
não a corrige. A pré-carga pode mudar um pouco o tempo dos produtores. Os controles dependem da ordem
da n-ésima operação injetada (`rename` de segmento, `unlink` do lock); no do lock preso, o primeiro
produtor que falha pode ser `a` ou `b`, e a prova aceita os dois. A linha de tempos do
`describeTiming` lista um flush por commit e fica longa.

## Primeira criação concorrente do store (I25-C32 da execução completa em `710076e`)

**Evidência** (rodapé de `builder-t8c15/final/npm-test.log`): `eventos intercalados: B terminou antes`
em 3,064 s; no instante, marcadores `[]`, probes de A e B nulos, a captura de A no segmento 1 `active`
com `persisted` 0. Depois de liberar as barreiras: A com status 0, `capturas: 1; eventos gravados: 2.`,
`stopped`; **B com status 3 e `skill-me: não foi possível abrir a execução [store_invalid]`**, sem
iniciar o agente. A raiz do C32 só tem o `observe setup` (`preparedLaunch`); a pasta do store nasce
na primeira abertura, e as duas invocações a criam juntas.

**Reprodução e causa** (descartável, `builder-t8c15/repro-*.mjs`, io do store injetado, sem carga):
com A parada dentro da criação exclusiva do `store.json` (arquivo criado pelo `wx`, bytes ainda não
escritos), B sai com `store_invalid` e, depois, abre — no `privacy start` da base `63621c6`, no do HEAD
e no `startLaunch`. Com B decidindo inicializar antes do lock e tomando-o depois de A, B sai com
`io_failure` (`EEXIST` no marcador), nos mesmos três. O `openStore` confere o marcador antes do lock
por ele ser imutável depois de criado, mas não durante a criação: (1) marcador vazio lido no meio do
`writeExclusive`; (2) marcador ausente na leitura e presente na listagem; (3) `needsInit` decidido
antes do lock. Código comum da criação (sem diff na #25 até aqui). A operação exata do gate não ficou
registrada: o `store_invalid` dele é a janela 1 ou 2.

| Commit | Conteúdo |
| --- | --- |
| `8e8893b` | Landing “Primeira criação concorrente do store”, nota na task e acréscimo no C32, antes do código |
| `f734441` | `privacy/store.mjs` (`openStore`, `needsAdoption`, `readMarker`, `initStore`), `markerPausedIo` em `helpers/launch.mjs`, quatro provas em `store.unit` e uma em `end.e2e` |

Logs em `.checks/code-review/issue-25/builder-store-creation/` (pasta ignorada).

- **Correção**: o marcador é publicado por temporário `store.json.<hex8>.skill-me-tmp` + `rename`; quem
  cria lista a pasta antes de ler o marcador e só o lê se listado (exato, senão `store_invalid`); sem
  ele, adota a pasta vazia ou só com o `.lock`, e aceita o temporário do marcador só junto do `.lock`;
  sob o lock, `initStore` relê o marcador (presente e exato, não regrava) e só publica com a pasta
  contendo apenas o `.lock` da operação. Quem não cria lê o marcador como antes. A segunda abertura
  durante uma criação recebe `lock_present` — a paciência de 2 s do launcher, sem retry novo.
- **RED** (provas novas no produto de `8e8893b`, igual a `710076e`; `red-win-24.22.1.spec.txt`): 5/5
  falham. Pelo launcher, `B terminou antes de encontrar o lock: skill-me: não foi possível abrir a
  execução [store_invalid]` (o sintoma do gate); marcador em publicação, B com `store_invalid` e a
  pasta em `[[".lock",57],["store.json",0]]`; pasta vazia vista antes do lock, `io_failure`; marcador
  publicado entre a leitura e a listagem, `store_invalid`; nas recusas, só o caso novo (lock alheio
  com o temporário do marcador) muda — `store_invalid` no código anterior; os demais já valiam.
- **GREEN** (`green-win-24.22.1.spec.txt`, `green2-win-24.22.1.spec.txt`, este com as provas
  reforçadas: a segunda abertura não regrava o marcador e as recusas `store_invalid` não gravam nada,
  nem o `.lock`): 5/5.
- **Mutações da correção** (cópia descartável, `mutation-*-win-24.22.1.spec.txt`): marcador de novo
  por `writeExclusive` direto → o launcher e o marcador em publicação voltam ao `store_invalid`;
  publicar sob o lock sem reler → `a segunda não regravou o marcador` falha; temporário adotável sem o
  `.lock` → a recusa `temporário do marcador sem lock` falha.
- **Regressão rápida antes do commit**: `tests/integrations/privacy/*.test.mjs`,
  `tests/integrations/observe/*.test.mjs` e `launch/store.unit`, uma vez: 179/179
  (`regression-privacy-observe-win-24.22.1.spec.txt`).

| Alvo da #25 completo (`launch/*.test.mjs`, `hermes-harness.unit.test.mjs` e `traces/concurrency.cli.test.mjs`, `--test-concurrency=4`) em `f734441` | Resultado |
| --- | --- |
| A — Windows, Node 24.22.1, checkout principal, 08:56:01–08:58:12 | 120 testes: 114 pass, 0 fail, 6 skip; `git status` vazio antes e depois |
| B — Windows, Node 24.13.0 oficial, npm 11.6.2 adjacente, `npm_execpath` ausente, **clone novo com `core.autocrlf=true`** (`package.json` `w/crlf`, `cli.mjs` `w/lf attr/text eol=lf`), 08:58:31–09:01:00 | 120: 114 pass, 0 fail, 6 skip; `git status` do clone vazio antes e depois; clone removido; 375 scratches do 24.13.0 removidos, 0 recusas |
| C — WSL Ubuntu uid 1000, o mesmo prefixo isolado sem `sh`, `env -i`, `HOME` do scratch, PATH sem `/usr/bin`, `git -c core.autocrlf=false archive f734441` (5.621.760 bytes, sha256 `1e9ad157…98fcecf8`, árvore extraída `023bc9af…` = `HEAD^{tree}`, `cli.mjs` 755), 09:01:37–09:02:39 | 120: 114 pass, 0 fail, 6 skip; `~/.skill-me` e a autorização ausentes antes e depois |

Os 120 nomes são os mesmos nos três TAP: os 102 de antes, os 5 novos I25-C32 e os 13 do arquivo de
concorrência. Os 7 I25-C32, o T8-C15 e os três C46 passaram nos três. Skips, todos de plataforma: em A
e B, C45 POSIX, C5, C6, C42 POSIX, C33 arranjo e C15 pty; em C, C4 shim, C45 controle, C5 console, C42
console, C8 LOCALAPPDATA e C38 console.

**`npm test` completo em `f734441`** (Windows, Node 24.22.1, runner padrão com 8 arquivos, 12 nativos do
Hermes; 09:02:58–09:11:01; `builder-store-creation/final/npm-test.*`): **exit 0**. 1.002 testes: 982
pass, 0 fail, 20 skip — governança 6/6; motor 16/16; doctor 417 (410/0/7); integrações 563 (550/0/13).
Os 12 nativos do Hermes passaram; os 7 I25-C32 (inclusive o de processos reais, 8,9 s), o T8-C15
(12,5 s) e os três C46 também; `git status` vazio antes e depois. 127 pastas de testes de outras
issues da janela removidas do `%TEMP%` como na execução anterior.

Limites: o código mudado é o comum da criação do store, também do `privacy start` (#5) e do `on`
(#23). Numa criação concorrente, o `privacy start` passa a responder 4 `lock_present` (o usuário
repete, como já documentado) em vez de 3 `store_invalid`, e o `on` espera na paciência dele. Um
criador que morre com o `.lock` e o temporário do marcador deixa `lock_present` até o usuário remover
o lock (recuperação já documentada) e, depois, `store_invalid` pelo temporário — a mesma rigidez de um
marcador pela metade antes. A falha de C32 na CI 40443538957 (tempo esgotado, sem saídas) continua sem
causa demonstrada; esta correção cobre a classe observada agora (`store_invalid` na abertura). Uma
execução completa verde não mede taxa. Pendentes: Verifier 10 e revisão formal 6, do orquestrador.

## Diagnóstico de C32 com captura em construção (Verifier 10 em `df259ed`)

O Verifier 10 terminou **FAIL** em `df259ed` (relatório preservado pelo orquestrador em `788d160`,
não alterado aqui): A e B com 120 testes, 114 pass, 0 fail, 6 skip; **C (WSL isolado) com 120, 113
pass, 1 fail, 6 skip**; o gate **D não foi iniciado**. A falha foi `I25-C32 diagnóstico das invocações
simultâneas…` (`end.e2e.test.mjs:320`), com a primeira linha do erro `ENOENT: … open
'…/skill-me-privacy/captures/26c46f13…/state.json'` no lugar de `eventos intercalados: B terminou
antes` (`verifier-round10/v10/C-wsl-24.13.0-isolado.spec.txt:137-156`). Os outros seis C32, o produto e
a primeira criação do store (`f734441`) passaram. Os resultados das seções anteriores continuam como
estão.

**Causa** (leitura do apoio e reprodução abaixo): B termina antes (sem agente no PATH) enquanto A
ainda cria a captura da abertura — a pasta existe, o `state.json` ainda não. O `catch` de
`withOverlappingRuns` (`helpers/launch.mjs`) lia marcadores, probes e capturas antes de gravar as
barreiras; `launchCapturesOnDisk` (estrito) lançou `ENOENT`, e um probe com JSON incompleto faria o
`readJsonLines` lançar `SyntaxError`. O erro da leitura saía no lugar do original, as barreiras não
eram gravadas e as invocações não eram esperadas: A ficaria na barreira até o limite de 60 s do
`runSkillMe`. Defeito do apoio de prova; o produto não muda.

| Commit | Conteúdo |
| --- | --- |
| `3328317` | Landing “Diagnóstico de C32 com captura em construção”, acréscimo no C32 e nota na task, antes do código |
| `619c8e0` | `withOverlappingRuns` com coleta de melhor esforço (`capturesForDiagnosis`, `orUnavailable`, `barreirasNaoGravadas`) e a prova `I25-C32 diagnóstico com captura em construção e probe incompleto` em duas variantes |

Logs em `.checks/code-review/issue-25/builder-c32-diagnostico/` (pasta ignorada).

- **Correção**: cada leitura do diagnóstico que falha vira `indisponível [<código>]` (o `code` `E…` ou
  o nome do erro, sem mensagem nem caminho); as capturas passam por um leitor só do diagnóstico, em que
  uma sem `state.json` legível vira `["indisponível", "<código>"]` ao lado das legíveis e a pasta que
  não pôde ser listada vira `indisponível [<código>]` (pasta ausente continua `[]`). Depois, sempre,
  todos os marcadores de barreira são gravados (falha de um vai para `barreirasNaoGravadas`) e cada
  invocação é esperada (rejeição vira `indisponível`). O erro relançado começa pela primeira linha do
  original, com ele em `cause`, e traz os status, sinais e stderr dos launchers. `launchCapturesOnDisk`
  e `readJsonLines` continuam estritos para as provas saudáveis.
- **Prova** (mesma rotina, sem tempo de espera): A para na barreira (marcador `A1`), a prova espera B
  terminar (127), põe a árvore parcial — uma pasta de captura `fff…f` sem `state.json`, ou o probe de B
  com `{"env":{"SKILL_ME_LAUNCH_ID":"` — e a espera de `eventos intercalados` falha. A prova tem limpeza
  própria (grava as barreiras e espera as invocações no `finally`) para o código anterior não deixar A
  presa.
- **RED** (apoio de `3328317`; `red-win-24.22.1.spec.txt`): as duas variantes falham com o erro
  mascarado — `ENOENT: no such file or directory, open '…\captures\ffff…\state.json'` e `Unterminated
  string in JSON at position 30` no lugar de `eventos intercalados: B terminou antes`, o mesmo sintoma
  do Verifier 10; a limpeza da prova soltou A (3,1 s cada, não os 60 s do supervisor). O diagnóstico
  existente passou.
- **GREEN** (`green-win-24.22.1.spec.txt`): 3/3. Primeira linha e `cause.message` exatas; `marcadores`
  `["A1"]`; `barreirasNaoGravadas` `[]`; A já tinha terminado quando o erro saiu, com `launchers.A`
  status 0 e sinal nulo; `launchers.B` = `{status: 127, signal: null, stderr: "skill-me: claude não
  encontrado no PATH [executable_not_found]\n"}`; na variante da captura, `probes` `{A: <invocation>,
  B: null}` e as capturas `[<A, 1, active, 0>, ["indisponível", "ENOENT"]]`, com `launchCapturesOnDisk`
  ainda lançando `ENOENT`; na do probe, `probes.B` = `indisponível [SyntaxError]`, só a captura de A, e
  `readJsonLines` ainda lançando `SyntaxError`.
- **Mutações** (cópia descartável, `mutation-*-win-24.22.1.spec.txt`): captura ilegível omitida (o
  diagnóstico diria “zero capturas”) → a variante da captura falha; barreiras gravadas sem esperar as
  invocações → as três provas de diagnóstico falham (`A já tinha terminado quando o erro saiu`).

| Alvo da #25 completo com concorrência (`launch/*.test.mjs`, `hermes-harness.unit.test.mjs`, `traces/concurrency.cli.test.mjs`, `--test-concurrency=4`) em `619c8e0` | Resultado |
| --- | --- |
| A — Windows, Node 24.22.1, checkout principal, 09:42:40–09:45:15 | 122 testes: 116 pass, 0 fail, 6 skip; `git status` vazio antes e depois |
| B — Windows, Node 24.13.0 oficial, npm 11.6.2 adjacente, `npm_execpath` ausente, clone novo com `core.autocrlf=true` (`package.json` `w/crlf`, `cli.mjs` `w/lf attr/text eol=lf`), 09:45:32–09:48:06 | 122: 116 pass, 0 fail, 6 skip; `git status` do clone vazio antes e depois; clone removido; 385 scratches do 24.13.0 removidos, 0 recusas |
| C — WSL Ubuntu uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, npm 11.6.2, `env -i`, `HOME` do scratch, PATH sem `/usr/bin`, `git -c core.autocrlf=false archive 619c8e0` (5.652.480 bytes, sha256 `475ce73d…3b60f6b2`, árvore extraída `7c4102d2…` = `HEAD^{tree}`, `cli.mjs` 755), 09:48:23–09:49:27 | 122: 116 pass, 0 fail, 6 skip; `~/.skill-me` e a autorização ausentes antes e depois |

O alvo inteiro, e não só `end.e2e` e `report.cli`, porque `helpers/launch.mjs` é importado por todos os
arquivos `launch/*`. Os 122 nomes são os mesmos nos três TAP (os 120 de antes e as duas variantes
novas); em cada ambiente passaram os 9 I25-C32, os 4 I25-C34, o T8-C15 e os três C46. Skips, todos de
plataforma, os mesmos da seção anterior.

**`npm test` completo em `619c8e0`** (Windows, Node 24.22.1, runner padrão com 8 arquivos, 12 nativos do
Hermes; 09:49:47–09:59:13; `builder-c32-diagnostico/final/npm-test.*`): **exit 0**. 1.004 testes: 984
pass, 0 fail, 20 skip — governança 6/6; motor 16/16; doctor 417 (410/0/7); integrações 565 (552/0/13).
Passaram os 12 nativos, os 9 I25-C32, os 4 I25-C34, o T8-C15 e os três C46; `git status` vazio antes e
depois; 127 pastas de testes de outras issues da janela removidas do `%TEMP%`, 0 recusas.

Limites: o interleaving exato do Verifier 10 (A no meio da criação da captura quando B terminou) não
foi reproduzido com o processo real; a prova põe a mesma árvore parcial que a coleta encontrou. O
diagnóstico mostra o código da falha de leitura, não o motivo. A falha original de C32 na CI
40443538957 continua sem causa demonstrada. Pendentes: o próximo Verifier e a revisão formal 6, do
orquestrador.

## CI 40514323240 (Windows): I23-C10 e I25-C46 com `delivery_timeout`, diagnóstico sem correção

Estado de partida: HEAD `d0d5a7f`, com a revisão formal 6 `ready` 7/7 e o Verifier 11 PASS 46/46
(A, B e C com 122/116/0/6; D com 1.004/984/0/20), ambos preservados. Na CI real nova, Ubuntu e macOS
passaram. No Windows (Node 24.13.0, npm 11.6.2), as integrações tiveram 565 testes, 539 pass, **2
fail**, 24 skip, em 479.157,9 ms, com exit 1 às 13:52:09,9 UTC, e o job chegou ao limite de 10 min no
pós-job. Log preservado pelo orquestrador: `.checks/code-review/issue-25/ci40514323240-windows.tail.txt`
(os últimos 120.000 caracteres). Diagnóstico, propostas e comandos completos ficam em
`.checks/issue-25-agent-launch.ci40514323240-handoff.md`; os logs, em
`.checks/code-review/issue-25/builder-ci40514323240/` (pasta ignorada).

- **I23-C10** (`observe/agents.e2e.test.mjs:195`, “codex A 0”, fase sequencial):
  `delivery_timeout` 1/0/0/1, sem operação nem código, porque a prova antiga não instrumenta a
  entrega. O diff da #25 nesse caminho (`observe/delivery.mjs` com núcleo comum, `appendAutomatic`
  sobre `appendWithSuccession`, `readMarker` para quem não cria) foi lido inteiro e mantém a mesma
  sequência de E/S. Causa não demonstrada.
- **I25-C46 (a)** (`traces/concurrency.cli.test.mjs:311-315`): `a` e `b` com `delivery_timeout`
  40/0/0/40, 10 operações cada, nenhum flush, nenhuma falha, nenhum `EEXIST`; lock presente e 0
  segmentos. A injeção em `b` não chegou a acontecer.
  - **Controle 1** (`ops-sequence.mjs`, produtor saudável com a pré-carga de tempos, Windows Node
    24.22.1): as 10 primeiras operações são as do `openStore` até o `close` do `store.json`; a 11ª é
    `open lock`, a criação `wx` do `.lock`.
  - **Controle 2** (`stall-control.mjs` com a pré-carga descartável `stall-lock.mjs`, dois
    produtores de 40 entradas): os dois parados antes de criar o lock dão o quadro por produtor da
    CI com o lock **ausente**; `a` criando o lock sem a chamada voltar dá o quadro inteiro da CI, com
    o lock **presente**.
  - **Conclusão**: ao menos um produtor criou o `.lock` no disco sem que a chamada voltasse antes
    do prazo de 650 ms, e o outro também não completou a criação. Entre a 10ª e a 11ª operação, o
    código só gera o nonce do lock (`randomBytes(8)`) e chama `open`. A cronologia é a do contrato
    da #8: abandono no prazo, `close`, entradas perdidas, saída com a criação pendente e o lock que
    fica (`docs/traces.md:491-495`, que fala em commit). O vermelho está certo: a precondição do
    controle não foi alcançada. Por que a criação parou ~620 ms nos dois processos não se sabe.
- **Tempo do job**: o passo de integrações terminou junto do limite de 10 min. Na soma das durações
  dos testes da CI, as provas da #25 são ~202 s de ~1.150 s; o tempo de parede com e sem elas não foi
  medido.

Nenhum produto, prova, workflow ou configuração mudou. Nenhuma suíte, alvo ou CI foi executado,
porque não houve código novo; os dois controles são locais e finitos. Decisões pedidas ao
proprietário, no handoff: como tratar paradas além do prazo nas provas com processos reais (a
recomendação é instrumentar o I23-C10 com a pré-carga existente e decidir sobre a CI com as
asserções intactas) e o que fazer com o limite de 10 min do job Windows. Prazos, retry, perdas,
carga, paralelismo, teto 8 e o limite do job continuam sem mudança.

## Diagnóstico do I23-C10 e orçamento do job Windows (AC8, autorização 6460177952; S11, C47–C48)

O proprietário aprovou “Autorizar diagnóstico e orçamento Windows (recomendado)”
([comentário 6460177952](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6460177952)),
exatamente a proposta `.checks/issue-25-agent-launch.ci40514323240-proposal.md` (`df2441f`), com o AC8
na issue antes do código. A CI 40514323240 em `d0d5a7f` continua registrada como vermelha (seção
anterior), e o Verifier 11 PASS e a formal 6 `ready` ficam no histórico. A causa dos dois
`delivery_timeout` continua **desconhecida**: nada aqui a corrige.

| Commit | Conteúdo |
| --- | --- |
| `25f5948` | Task 39–40 e Sources, Landing “Diagnóstico do I23-C10” e “Orçamento do job Windows”, S11/C47–C48, Handoff e a marcação de aprovação da proposta feita pelo orquestrador, antes do código |
| `52b22cd` | Rotina em etapas e evidência do I23-C10 e as duas provas I25-C47 (`observe/agents.e2e.test.mjs`); apoio comum em `helpers/traces.mjs`; `observe.json` nomeado na pré-carga; `failureCode` importado em `helpers/launch.mjs`; o `timeout-minutes` do job `verify` |

Logs em `.checks/code-review/issue-25/builder-ci40514323240-approved/` (pasta ignorada).

- **Sequência do hook automático** (`auto-ops-sequence.mjs`, hook Codex na primeira entrega de uma
  sessão, com a pré-carga de tempos e só o comando interno com fixture): leitura da configuração no
  home fora do lock; 1ª tomada do lock (`openObservation`); 2ª tomada (`appendAutomatic`): leitura do
  estado da observação, um `lstat` com `ENOENT` (a captura nova ainda não existe), pasta, chave,
  `state.json.tmp` renomeado, `observe.json.tmp` renomeado, chave lida, segmento, `state.json.tmp`
  renomeado de novo (o commit) e a liberação. Daí as escolhas da evidência: o `lstat ENOENT` é
  contado como ausência conferida, o lugar é a tomada do lock (a fase “antes/depois do commit” do T8
  seria falsa com dois `rename` de `state.json.tmp` na mesma tomada), e o `observe.json`, que saía
  como `pasta`, passa a ter nome.
- **O que mudou**: as asserções do I23-C10 são as mesmas; só a mensagem ganha a evidência, e só
  numa etapa com alguma entrega fora do esperado. Fora a mensagem, a única diferença é o
  `run.report?.delivery` na asserção: sem relatório, a falha vira `AssertionError` com a evidência,
  em vez de `TypeError`, e continua vermelha. `failureCode`, `inspected`, `privacyBody`, `shown` e
  `diskTrace` foram para `helpers/traces.mjs`, com dois consumidores. O T8-C15/C46 formata a fase
  sobre `diskTrace`, com a mesma saída; os quatro passaram de novo (`green-c46-win-24.22.1.spec.txt`).
- **RED** (o I23-C10 de `25f5948`, numa cópia descartável, com só o hook “codex A” da rodada 0
  carregando a pré-carga e a injeção, por `red-patch.mjs`): com `SEGMENT_EIO=1`, a mensagem foi só
  `codex A 0` e o diff `io_failure` 1/0/0/1; com `STALL_SEGMENT=1`, só `codex A 0` e
  `delivery_timeout` 1/0/0/1 — a mesma mensagem da CI 40514323240, sem operação nem estado
  (`red-old-*-win-24.22.1.spec.txt`).
- **GREEN** (`green-c47-win-24.22.1.spec.txt`): o I23-C10 e os dois C47 passaram na primeira
  execução, 3/3. Mensagens reais, obtidas numa cópia em que o texto esperado de um `includes` de cada
  controle foi trocado, para a prova falhar e imprimi-las (`sample-messages-win-24.22.1.spec.txt`):
  - falha de E/S: `codex A 0`, `produtor codex A 0: status 0; entrega
    {"automatic":true,"code":"io_failure",…}`, `tempos: … falhas rename segmento.tmp EIO (sob o lock,
    2ª tomada); … lock ocupado (EEXIST, repetido) 0x; ausências conferidas (lstat ENOENT) 1x; última
    concluída: unlink lock (sob o lock, 2ª tomada)` e `raiz: capturas automáticas 1 [active accepted 0
    persisted 0]; pasta das capturas 0 segmento(s), 0 temporário(s); lock ausente`;
  - disco parado: `… code":"delivery_timeout" …`, `falhas nenhuma`, `última concluída: close key (sob
    o lock, 2ª tomada)` e `raiz: capturas automáticas indisponível [lock_present]; pasta das capturas 0
    segmento(s), 0 temporário(s); lock presente`.
- **Mutações** (cópia descartável, `mutation-*-win-24.22.1.spec.txt`): sem a última operação
  concluída → o controle de disco parado falha; o CLI que falha virando “zero capturas” → o mesmo
  controle falha; o `lstat ENOENT` contado como falha → os dois controles falham.
- **Orçamento do job** (C48; `workflow-values.txt`): `git diff` com uma linha (`timeout-minutes: 10`
  → `${{ matrix.os == 'windows-latest' && 20 || 10 }}`); pelo YAML lido com o `yaml` do repositório,
  `changes` e `ci` com 5 e `verify` com 20 no `windows-latest` e 10 no `ubuntu-22.04` e no
  `macos-14`; o resto do workflow é idêntico ao de `d0d5a7f`; `governance-C1 C3` passou. Nenhum teste
  novo repete o texto da expressão; a CI real a valida.

| Alvo em `52b22cd`: `launch/*.test.mjs`, `hermes-harness.unit.test.mjs`, `traces/concurrency.cli.test.mjs` e `observe/agents.e2e.test.mjs` inteiro, `--test-concurrency=4` | Resultado |
| --- | --- |
| A — Windows, Node 24.22.1, Python 3.12.10, checkout principal, 01:04:14–01:07:03 | 128 testes: 122 pass, 0 fail, 6 skip; `git status` vazio antes e depois; I23-C10 15,1 s, C47 3,7 e 4,4 s |
| B — Windows, Node 24.13.0 oficial, npm 11.6.2 adjacente, `npm_execpath` ausente, clone novo com `core.autocrlf=true` (`package.json` `w/crlf`, `cli.mjs` `w/lf attr/text eol=lf`), 01:07:19–01:10:02 | 128: 122 pass, 0 fail, 6 skip; `git status` do clone vazio antes e depois; clone removido; 403 scratches do 24.13.0 removidos, 0 recusas; I23-C10 13,2 s |
| C — WSL Ubuntu uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, npm 11.6.2, `env -i`, `HOME` do scratch, PATH sem `/usr/bin`, `git -c core.autocrlf=false archive 52b22cd` (5.703.680 bytes, sha256 `e5d12769…8c64f6c3`, árvore extraída `e18ff990…` = `HEAD^{tree}`, `cli.mjs` 755), 01:10:31–01:11:37 | 128: 122 pass, 0 fail, 6 skip; `~/.skill-me` e a autorização ausentes antes e depois; I23-C10 1,2 s |

Os 128 nomes são os mesmos nos três TAP: os 122 de antes e os 6 de `observe/agents.e2e`. Em cada
ambiente passaram os 4 I23 do arquivo, os 2 C47, o T8-C15, os 3 C46 e os 9 C32. Skips, todos de
plataforma, os mesmos de antes; o arquivo `observe/agents.e2e` não tem skip.

**`npm test` completo em `52b22cd`** (Windows, Node 24.22.1, runner padrão com 8 arquivos, 12 nativos do
Hermes; 01:12:09–01:22:29; `builder-ci40514323240-approved/final/npm-test.*`): **exit 0**. 1.006 testes:
986 pass, 0 fail, 20 skip — governança 6/6; motor 16/16; doctor 417 (410/0/7); integrações 567
(554/0/13). Passaram os 12 nativos, o I23-C10 (15,7 s), os dois C47, o T8-C15 e os três C46; `git
status` vazio antes e depois. Removidas do `%TEMP%` 127 pastas de testes de outras issues da janela,
com 0 recusas; outras 38 entradas novas não são desta execução e ficaram.

Limites: a causa dos dois `delivery_timeout` da CI 40514323240 continua desconhecida, e o I23-C10
instrumentado só a mostra numa nova ocorrência. A pré-carga custa um pouco em cada processo; sem ela,
o I23-C10 levou 6,9, 13,4 e 14,1 s nos três `npm test` anteriores desta máquina, e com ela 15,1 s no
alvo A e 15,7 s no `npm test`, com cargas diferentes, então o custo não foi medido à parte. Uma
operação que nunca termina não aparece na linha da pré-carga: a evidência diz a última concluída. Os
20 minutos do job evitam o cancelamento pelo limite total e não garantem a próxima CI verde. Nenhum
CI, push, Verifier ou revisão rodou aqui: o Verifier 12 e a formal 7 são do orquestrador.

## CI 40636157287 (Windows): I23-C4 e T8-C11 com `lock_present`, diagnóstico sem correção

Estado de partida: HEAD `9244eea`. O Verifier 12 deu PASS 48/48 (relatório em `9244eea`) e a formal 7
`ready` 8/8, ambos preservados. O orquestrador publicou a branch e atualizou o PR #28. Na CI nova,
Ubuntu e macOS passaram; o Windows (Node 24.13.0, npm 11.6.2) terminou em `failure` dentro do
orçamento de 20 min: integrações com 567 testes, 541 pass, **2 fail**, 24 skip, em 473.250,7 ms.
Passaram nela o I23-C10, os C47, o T8-C15 e os C46. Log preservado pelo orquestrador:
`.checks/code-review/issue-25/ci40636157287-windows.tail.txt`. O diagnóstico completo, com as propostas
para decisão, está em `.checks/issue-25-agent-launch.ci40636157287-handoff.md`; os logs, em
`.checks/code-review/issue-25/builder-ci40636157287/` (pasta ignorada).

- **I23-C4** (`observe/control.cli.test.mjs:838`): o `privacy list` de `automaticOf` encontrou o lock
  (`4 !== 0`) logo depois do produtor em processo. **T8-C11** (`traces/query.cli.test.mjs:194`, fase
  `active`): o `privacy export` encontrou o lock depois dos quatro produtores reais. As duas provas são
  antigas, sem diff na feature, e não conferem o relatório de entrega dos produtores.
- **Quem segurava o lock**: pelo código e pelas pausas da prova (`pausedAt`), só os produtores, em
  três vias que o contrato admite: tentativa abandonada no prazo com o lock, liberação que falha, e
  falha ao gravar os bytes do lock depois de criá-lo (esta só por leitura, código da #5).
- **Base × HEAD** (`ops-compare.mjs`): as operações do hook vinculado (89, 2 flushes, tomadas de 28 e
  39) e do hook automático na 1ª entrega (103, 5 flushes, tomadas de 19 e 53) são idênticas em `63621c6`
  e `9244eea`.
- **Controles de sintoma** (`symptom-controls.mjs`, cópia descartável do HEAD, um produtor alterado):
  - os controles saudáveis passam;
  - a tentativa parada além do prazo e a liberação que falha reproduzem a mensagem exata da CI nas
    duas provas (`:194` e `:838`).
- **Não se sabe**: qual via e qual produtor; por que as operações de lock param ou falham no runner;
  a taxa.

Nenhum produto, prova, workflow ou configuração mudou, e nenhuma CI, gate, Verifier ou revisão foi
executado. A decisão pedida ao proprietário, no handoff, tem quatro opções:
- A (recomendada): medir a latência do lock no runner Windows com e sem a mitigação, num job só de
  `workflow_dispatch`, com a regra de decisão declarada antes;
- B: adotar a mitigação no `verify` Windows;
- C: nova tentativa limitada na liberação do lock (contrato; reverte a C43);
- D: integrações do Windows informativas para o merge (política).

Prazos, retry, perdas, carga, paralelismo, teto 8 e os orçamentos 20/10/5 continuam sem mudança.

## Medição comparativa do lock na CI Windows (AC9, autorização 6467154706; S12, C49–C50)

O proprietário aprovou “Pode fazer a medição comparativa. Mantém os testes e prazos e segue até a CI
ficar toda verde para fazer o merge do PR #28.”
([comentário 6467154706](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706)),
exatamente a proposta `.checks/issue-25-agent-launch.ci-runner-measure-proposal.md` (`b2638db`), com o
AC9 na issue antes do código. Continuam preservados:
- o Verifier 12 PASS e a formal 7 `ready`;
- as CIs 40514323240 e 40636157287, vermelhas;
- os diagnósticos `8868fe1` e `d2d54cf`.

A causa dos `lock_present` e dos `delivery_timeout` continua desconhecida. **A medição no runner ainda
não foi feita**: ela é a do job manual, acionado pelo orquestrador depois de PASS, `ready` e
publicação.

| Commit | Conteúdo |
| --- | --- |
| `0362aec` | Critérios 41–42 e a exceção datada ao critério 40 na task; linhas do Landing com o job, o script e as escolhas de formato, a exceção ao C48, S12 com C49–C50 e o Handoff; a marcação de aprovação da proposta feita pelo orquestrador; antes do código |
| `39278dd` | Ajuste do Landing antes das provas: uma fase sem pasta própria ou que falhou no supervisor fica indisponível, e as outras seguem |
| `3843867` | `scripts/ci-lock-latency.mjs` e `scripts/ci-lock-latency.test.mjs`; o job `lock_diagnostics` em `.github/workflows/governance.yml`; `governance-C49` e a expectativa do conjunto de jobs em `scripts/governance-ci.test.mjs`; o alias `test:governance` no `package.json` |

Logs em `.checks/code-review/issue-25/builder-ci-lock-latency/` (pasta ignorada). `src/`, as provas
funcionais existentes, o core de revisão e a configuração não mudaram.

- **Ferramenta nova, sem RED funcional**: não havia comportamento anterior a reproduzir. A
  discriminação vem de controles e mutações.
  - **Primeira execução** (`first-win-24.22.1.spec.txt`): os 12 C50 passaram.
  - **Um defeito encontrado relendo a prova**: o caso “caminho relativo” usava
    `path.relative(process.cwd(), …)`, que no Windows devolve um caminho absoluto quando o cwd está
    em outro volume, como no runner. A prova passou a usar um caminho relativo literal antes do
    commit.
- **Mutações do script** (cópia descartável, `mutation-*-win-24.22.1.spec.txt`), todas detectadas:
  - percentil pelo piso da posição: falham os percentis e o término parcial;
  - zeros sem amostras: falham “sem amostras”, E/S e teto;
  - faixa estrita (`>` no lugar de `>=`): falham percentis e faixas;
  - destinos sensíveis a maiúsculas no Windows: falha caminhos;
  - limpeza sem conferir o marcador: falha limpeza;
  - `lock_present` contado como E/S: falha E/S;
  - incompletos zerados: falham teto, término parcial e protocolo.
- **Mutações do workflow** (`mutation-workflow-*.spec.txt`), todas detectadas pelo `governance-C49`:
  - sem o `if`;
  - teto de 20 min;
  - `cache: npm` no `setup-node`;
  - `lock_diagnostics` em `ci.needs`, também detectado pela asserção antiga do C1/C3;
  - `continue-on-error`.

  Com o workflow original, a cópia passou.
- **C48 com a exceção** (`workflow-regular.txt`, `workflow-regular.mjs`):
  - o topo do workflow e os jobs `changes`, `verify` e `ci` são idênticos aos de `d0d5a7f`, fora o
    `timeout-minutes` do `verify`;
  - os jobs são `changes`, `verify`, `ci` e `lock_diagnostics`, com tetos 5, a expressão 20/10, 5 e
    10;
  - o diff do workflow só acrescenta 19 linhas.
- **Controle local do CLI real** (`cli-local-control-win-24.22.1.json`): as constantes vinculantes, com
  o `RUNNER_TEMP` apontado só no ambiente desse processo para um scratch próprio.
  - **Resultado**: A1/B/A2, cada fase com 1.500 ciclos previstos e concluídos, 0 incompletos, sem
    erro; cargas com 1.200 a 1.340 escritas; limpeza 3/0; cerca de 2 s no total; a pasta do scratch
    vazia depois.
  - **Limite**: aqui os dois destinos ficam no mesmo volume `C:`, então isto é controle de formato e
    de ponta a ponta. Não é a medição do runner e não diz nada sobre ele.

| Alvo em `3843867`: os 128 de antes (`launch/*.test.mjs`, `hermes-harness.unit.test.mjs`, `traces/concurrency.cli.test.mjs`, `observe/agents.e2e.test.mjs`) mais `scripts/governance-ci.test.mjs` e `scripts/ci-lock-latency.test.mjs`, `--test-concurrency=4` | Resultado |
| --- | --- |
| A — Windows, Node 24.22.1, Python 3.12.10, checkout principal, 08:13:23–08:16:03 | 147 testes: 141 pass, 0 fail, 6 skip; `git status` vazio antes e depois |
| B — Windows, Node 24.13.0 oficial, npm 11.6.2 adjacente, `npm_execpath` ausente, clone novo com `core.autocrlf=true` (workflow, `package.json` e o script novo em `w/crlf`; `cli.mjs` `w/lf attr/text eol=lf`), 08:16:30–08:19:11 | 147: 141 pass, 0 fail, 6 skip; `git status` do clone vazio antes e depois; clone removido; 405 scratches do 24.13.0 removidos, 0 recusas |
| C — WSL Ubuntu uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, npm 11.6.2, `env -i`, `HOME` do scratch, PATH sem `/usr/bin`, `git -c core.autocrlf=false archive 3843867` (5.795.840 bytes, sha256 `11817e0a…7f3f66`, árvore extraída `621ce915…` = `HEAD^{tree}`, `cli.mjs` 755), 08:19:46–08:20:52 | 147: 141 pass, 0 fail, 6 skip; `~/.skill-me` e a autorização ausentes antes e depois |

Os 147 nomes são os mesmos nos três TAP. Em cada ambiente passaram:
- os 12 C50 e os 7 testes de governança, entre eles o `governance-C49`;
- os 114 I25, os 4 I23 e os 10 T8.

As provas novas não têm skip. Os 6 skips de A e B são os I25 só do POSIX, e os 6 de C são os I25 só
do Windows; cada um rodou no outro sistema.

**`npm test` completo em `3843867`** (Windows, Node 24.22.1, runner padrão com 8 arquivos, 12 nativos do
Hermes; 08:21:13–08:32:05; `builder-ci-lock-latency/final/npm-test.*`): **exit 0**. 1.019 testes: 999
pass, 0 fail, 20 skip.
- **Por suíte**: governança 19/19 (os 7 de governança e os 12 C50); motor 16/16; doctor 417
  (410/0/7); integrações 567 (554/0/13).
- **Passaram**: os 12 nativos, o I23-C4 (as 7 provas dele) e o T8-C11.
- **Skips, todos de plataforma**:
  - os 7 do doctor (`agent-resolution-formal5-2`, `agent-resolution-C2`, dois `fifo-config-formal8-4`
    e três `fs-adapter-formal8-4`), marcados `skip` no Windows, sem texto de motivo;
  - os 13 das integrações: `I4-C15` e `T8-C4` (`posix-signals`), `I4-C25b` (`posix-modes`), `I4-C25j`,
    `I4-C25k` e `I4-C25l` (`posix-acl`), `I4-C25m` (`macos-acl`) e os 6 I25 só do POSIX.

  Desses, só os 6 I25 rodaram em outro ambiente (no C). Os do doctor e os I4/T8 não rodaram em
  nenhum ambiente desta rodada.

Removidas do `%TEMP%` 127 pastas de testes de outras issues da janela, com 0 recusas; as 8 entradas sem
prefixo `skill-me` ficaram.

Limites:
- A medição no runner não foi feita. Nada aqui mede o runner, dá taxa ou demonstra causa.
- A instrumentação do produtor custa um pouco por operação, igual em todas as fases.
- A carga é sintética, não a suíte.
- As faixas de 600 e 650 ms não são prazos.
- O job manual roda também a matriz regular, e não substitui nenhum check.
- Pendentes, com o orquestrador: o Verifier 13, a formal 8, a publicação, a execução manual (com o
  registro dos resultados) e a CI regular verde para o merge.

## Achados 2 e 3 da verificação 13 na ferramenta de medição (C50 (j)–(l))

Estado de partida: HEAD `0e0325f`. A verificação 13 deu PASS 50/50 em `631e281`:
- A, B e C com 147 testes, 141 pass, 0 fail e 6 skip;
- D com 1.019 testes, 999 pass, 0 fail e 20 skip, com os 12 nativos.

O relatório está em `0e0325f`; não foi alterado aqui. Ele traz dois achados concretos na ferramenta
(`.checks/issue-25-agent-launch.verified.md:294-295`):
- (2) a limpeza que lança (`rmSync` sem `try` no `finally` de `measure`) perde a medição inteira;
- (3) um erro no início da fase, depois de filhos iniciados, só tinha encerramento no ramo do teto, e
  o `'error'` assíncrono de um filho não tinha ouvinte.

O orquestrador pediu a correção antes de usar a ferramenta na CI, como correção necessária da
ferramenta aprovada (autorização 6467154706), sem escopo novo. **A medição no runner ainda não foi
feita**, e a causa dos `lock_present` e dos `delivery_timeout` continua desconhecida.

| Commit | Conteúdo |
| --- | --- |
| `7198fef` | Antes do código: linha “Limpeza e supervisão em toda saída da medição” do Landing; refinamento do C50 com (j)–(l); refinamento do critério 42 da task; Handoff |
| `6a242a2` | `scripts/ci-lock-latency.mjs`: em `removeOwnDir`, remoção de melhor esforço depois da guarda, com `limpeza.falhas`; em `runPhase`, um só encerramento para o teto, o erro no início e o `'error'` de um filho, com `interrompidaPorErro`. `scripts/ci-lock-latency.test.mjs`: 4 provas novas, a forma de `limpeza` no relatório e o encerramento, no `after`, dos processos das provas de interrupção |

Logs em `.checks/code-review/issue-25/builder-r13-fix/` (pasta ignorada). Não mudaram:
- o workflow, os jobs, `package.json`, `src/` e as provas funcionais;
- os prazos, as quantidades (3 × 500 ciclos, 3 cargas de 64 KiB, 120 s, folga de 5 s), a carga e os
  retries;
- o core e a configuração.

- **Sondas antes do registro** (`probe-node-behavior.mjs` e `probe-absolute-missing.mjs`, Windows
  24.22.1 e WSL 24.13.0):
  - um spawn que falha emite `'error'` e depois `'close'`, sem `'exit'`, com o stdio criado; o
    código do `close` é -4058 no Windows e -2 no Linux;
  - o `rmSync` trocado por `syncBuiltinESMExports` alcança o import nomeado de outro módulo;
  - pelo nome procurado no PATH do WSL, o código foi `EACCES`, e não `ENOENT`. Por isso a prova
    inicia um caminho absoluto inexistente, que dá `ENOENT` nos dois sistemas.
- **Correção**:
  - **Limpeza**: a guarda de `removeOwnDir` não mudou. Passada ela, o `rmSync` fica num `try`, e
    a falha devolve `{ok: false, falha: <código>}`, sem nova tentativa. `measure` a põe em
    `limpeza.falhas` e segue para a fase seguinte.
  - **Supervisão**: em `runPhase`, `track` registra o filho e ouve `'close'` e `'error'` antes do
    stdio. O primeiro erro, síncrono no início ou `'error'` de filho, acorda as esperas como o
    teto. `stopOwnChildren` encerra os registrados que não fecharam (`kill()`, folga de 5 s,
    `SIGKILL`) e espera o `close` de todos. `runPhase` devolve `interruptedBy`, que
    `aggregatePhase` publica como `interrompidaPorErro`.
- **RED** (`red-win-24.22.1.spec.txt`): as provas novas rodaram sobre o script de `3843867`, sem
  mudança, no checkout. Só nesta execução usei `--test-timeout=90000`, para limitar o caso que
  podia ficar pendurado no código anterior. Resultado: 16 testes, 11 pass, 5 fail.
  - **limpeza que falha**: `removeOwnDir` lançou o `EBUSY` injetado, com o caminho na mensagem;
  - **limpeza que falha depois dos dados**: `measure` rejeitou com `EBUSY` e perdeu as três fases,
    o sintoma do achado 2;
  - **início parcial**: `runPhase` rejeitou com o `EEXIST` do `mkdir` de `produtor-2`; a carga e o
    1º produtor ficaram vivos e foram encerrados pela limpeza da prova;
  - **erro assíncrono**: o `'error'` do spawn, sem ouvinte, virou exceção não tratada
    (`spawn … ENOENT`), atribuída ao teste pelo `node:test`;
  - **relatório**: falhou só pela forma nova (sem `falhas: []`), não pelo defeito.

  As outras 11 passaram, entre elas o teto, o término parcial e a fronteira real. O arquivo terminou
  com exit 1 em 45 s, depois de o `after` esperar o `close` de cada processo registrado pelas provas.
- **GREEN** (`green-win-24.22.1.spec.txt`): 16/16. O início parcial levou 1,8 s e o erro
  assíncrono 2,4 s, antes do teto de 30 s da prova.
- **Mutações** (cópia descartável; só as 4 provas novas, `--test-timeout=120000`;
  `mutation-*-win-24.22.1.spec.txt`). Todas foram detectadas, e as cópias foram removidas:
  - sem o ouvinte de `'error'`: o erro assíncrono falha;
  - `'error'` ouvido sem interromper: o erro assíncrono falha no teto (30,6 s, `timedOut: true`);
  - erro do início relançado depois de encerrar os filhos: o início parcial falha;
  - falha da remoção contada como removida: as duas provas de limpeza falham;
  - falha posta entre as recusas: a limpeza depois dos dados falha;
  - falha com a mensagem do erro: as duas provas de limpeza falham.
- **Controle local do CLI real** (`final/cli-local-control-win-24.22.1.json`): as constantes
  vinculantes, com o `RUNNER_TEMP` apontado só no ambiente desse processo para um scratch próprio.
  - **Resultado**: A1, B e A2 com 1.500 ciclos concluídos cada, 0 erros, `encerradaPeloTeto:
    false` e `interrompidaPorErro: null`; cargas com 3.486 a 6.374 escritas; `limpeza
    {removidas: 3, recusadas: [], falhas: []}`; cerca de 3,5 s por fase; o scratch ficou vazio
    depois.
  - **Limite**: os dois destinos estão no volume `C:`. É controle de formato, não a medição do
    runner.

| Alvo em `6a242a2`: os mesmos 13 arquivos (`launch/*.test.mjs`, `hermes-harness.unit.test.mjs`, `traces/concurrency.cli.test.mjs`, `observe/agents.e2e.test.mjs`, `scripts/governance-ci.test.mjs`, `scripts/ci-lock-latency.test.mjs`), `--test-concurrency=4`, uma invocação por ambiente | Resultado |
| --- | --- |
| A — Windows, Node 24.22.1, npm 11.19.1, Python 3.12.10, checkout principal, `npm_execpath` ausente, 09:37:14–09:40:00 | 151 testes: 145 pass, 0 fail, 6 skip; `git status` vazio antes e depois |
| B — Windows, Node 24.13.0 oficial, npm 11.6.2 adjacente, `npm_execpath` ausente, clone git novo com `core.autocrlf=true` (só em `.git/config` do clone; workflow, `package.json`, o script e a prova em `w/crlf`; `cli.mjs` `w/lf attr/text eol=lf`), 09:40:14–09:42:56 | 151: 145 pass, 0 fail, 6 skip; `git status` do clone vazio antes e depois; clone removido depois de conferir caminho, tipo e HEAD; 403 scratches da janela A–B removidos, 0 recusas |
| C — WSL Ubuntu `oldboydev` uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, npm 11.6.2, `env -i`, `HOME` do scratch, PATH só com o prefixo e `tools` (`sh`, `git`, `python3`, `id`, `grep`, `mkfifo`), sem `/usr/bin`; `git -c core.autocrlf=false archive 6a242a2` (5.826.560 bytes, sha256 `41e36d2d…3da2ea1`, `get-tar-commit-id` = `6a242a25…`, árvore extraída `804aa716…` = `HEAD^{tree}`, `cli.mjs` 755), 09:43:32–09:44:38 | 151: 145 pass, 0 fail, 6 skip; `~/.skill-me` e a autorização ausentes antes e depois; scratch removido |

Os 151 nomes são os mesmos nos três TAP: os 147 de antes e as 4 provas novas. Em cada ambiente
passaram os 16 C50 e os 7 testes de governança, sem nenhum `not ok`.

Skips, todos de plataforma, com o motivo impresso pelo teste, e cada um rodou no outro sistema:
- **A e B (6)**:
  - `I25-C45` (vazio do PATH como diretório atual é semântica do POSIX);
  - `I25-C5`, `I25-C6` e `I25-C42` (sinais POSIX);
  - `I25-C33` (o npm do Windows usa o `ComSpec`);
  - `I25-C15` (pseudoterminal só no POSIX).
- **C (6)**:
  - `I25-C4`, `I25-C5` e `I25-C42` (PATHEXT, `.cmd` e console do Windows);
  - `I25-C45` (controle do PATH do Windows);
  - `I25-C8` (LOCALAPPDATA);
  - `I25-C38` (console do Windows).

**`npm test` completo em `6a242a2`**: Windows, Node 24.22.1, npm 11.19.1, `npm_execpath` ausente, runner
padrão com 8 arquivos (32 núcleos) e os 12 nativos do Hermes. Rodou uma vez, sem repetir, das 09:45:19 às
09:55:45, com orçamento de 2 h definido na ferramenta antes do início, e esperei o término real
(`builder-r13-fix/final/npm-test.*`). **Exit 0**: 1.023 testes, 1.003 pass, 0 fail e 20 skip; nenhum `✖` no
log; `git status` vazio antes e depois.
- **Por suíte**: governança 23/23 (os 7 de governança e os 16 C50); motor 16/16; doctor 417 (410/0/7);
  integrações 567 (554/0/13).
- **Passaram**: os 12 nativos (`I4-C18` a `I4-C23`, `I4-C37`, o `I25-C40` nativo, `I23-C8` ×3 e `I4-C44b`); o
  I23-C4 (7); o T8-C11; o I23-C10; o T8-C15.
- **Skips, todos de plataforma**:
  - os 7 do doctor, marcados `{skip: process.platform === "win32"}` em provas só do POSIX, sem texto de
    motivo no relatório: `agent-resolution-formal5-2` (arquivo regular real no PATH), `agent-resolution-C2`
    (realpath e symlink reais), dois `fifo-config-formal8-4` e três `fs-adapter-formal8-4` (FIFO);
  - os 13 das integrações, com o motivo impresso: `I4-C15` e `T8-C4` (`posix-signals`), `I4-C25b`
    (`posix-modes`), `I4-C25j`, `I4-C25k` e `I4-C25l` (`posix-acl`), `I4-C25m` (`macos-acl`) e os 6 I25 só do
    POSIX de A.

  Desses, só os 6 I25 rodaram em outro ambiente desta rodada (no C). Os 7 do doctor e os 7 I4/T8 não
  rodaram em nenhum ambiente desta rodada.

Limpeza do `%TEMP%`: removidas 127 pastas de testes de outras issues criadas na janela do D, com 0 recusas.
A conferência foi pela linha de base, pelos prefixos `skill-me i4 ` e `skill-me i5 `, pelo mtime na janela e
por não ser link. Uma entrada nova fora desses prefixos ficou, e nenhuma `skill-me-lock-latency-*` restou.

Limites:
- **Runner**: a medição no runner não foi feita, e nada aqui mede o runner, dá taxa ou demonstra
  causa.
- **Falha da remoção**: é injetada pela troca do `rmSync` na prova; nenhum `EBUSY` real do host foi
  produzido. Uma remoção que apaga parte da pasta e depois falha não foi simulada; o contrato é o
  mesmo (código em `falhas`, pasta não contada), mas o conteúdo que resta nesse caso não é afirmado.
- **Processos**:
  - um filho que não fecha nem depois do `SIGKILL` mantém `runPhase` esperando, como antes, até o
    limite de 10 min do job;
  - se um `kill()` falhar com `'error'` depois do teto, a fase sai com `encerradaPeloTeto: true` e
    esse código em `interrompidaPorErro`, porque vale o primeiro erro.
- **RED**: o `--test-timeout` do RED e das mutações é só da linha de comando; a prova versionada não
  tem prazo novo.
- **Carga numa fase interrompida**: `carga.escritas` continua sendo a soma do que as cargas
  relataram (a nota 5 da R13, informativa, sem mudança). Deve ser lida com `carga.terminaram`,
  `ciclos` e `interrompidaPorErro`.
- **Pendentes, com o orquestrador**: o Verifier 14 independente, a formal 8, a publicação, a
  execução manual com o registro dos resultados e a CI regular verde para o merge.

## CI 40702252461 (Ubuntu): fonte do `RUNNER_TEMP` na medição (C50 (m)–(n))

Estado de partida: HEAD `41dcf5d`, publicado pelo orquestrador. Antes dele vieram a formal 8
`blocked` (`bedda5c`), o R15 documental PASS (com as provas executadas da R14 em `13bb1d4`) e a
formal 9 `ready` (9 ACs, `sufficient`, sem achado). Esse histórico não foi alterado aqui.

- **A falha**: CI 40702252461 do PR #28, Ubuntu 22.04, job 122865010604; log integral do
  orquestrador em `.checks/code-review/issue-25/ci40702252461-ubuntu.log`.
  - `npm run test:governance`: 23 testes, 21 pass, 2 fail;
  - `C50 caminhos` (`ci-lock-latency.test.mjs:147`): `RUNNER_TEMP ilegível [ENOENT]` no lugar de
    `RUNNER_TEMP ausente`;
  - `C50 relatório` (`:383`): `A1/B/A2` e `{volume: undefined}` no lugar de uma fase `A`;
  - o `fail-fast` cancelou Windows e macOS. Pelo relato do orquestrador, a execução manual
    40702384050 também rodou a matriz regular, e o C50 falhou do mesmo jeito no Ubuntu.
- **Causa demonstrada**: `resolveDestinations` tinha o padrão `runnerTemp = process.env.RUNNER_TEMP`,
  e a desestruturação aplica o padrão também a um `undefined` dado. No runner o processo tem
  `RUNNER_TEMP`, então as duas provas, que davam `undefined` (`plan(undefined)`) ou `env: {}`,
  recebiam o valor do runner. A falha é determinística. Os alvos locais rodaram sem `RUNNER_TEMP` e
  não exercitaram esse caso: no Windows desta máquina a variável não existe, e no WSL o ambiente é
  `env -i`.
- **Medição real** (dados do orquestrador, não executados aqui): execução manual 40702384050, job
  122865354493, sobre `41dcf5d`; arquivos `.checks/code-review/issue-25/measurement40702384050.json`
  e `.log`.
  - **Fases e ciclos**: A1 no `C:`, B no `D:`, A2 no `C:`; 4.500 de 4.500 ciclos; zero erros,
    incompletos, linhas inválidas e falhas de limpeza; nenhuma amostra ≥ 600 ou ≥ 650 ms.
  - **Tomada, p99/máximo em ms**: A1 5,622/33,979; B 1,740/16,559; A2 5,853/14,672.
  - **Liberação, p99/máximo em ms**: A1 4,695/16,127; B 2,321/14,721; A2 6,268/19,204.
  - **Cargas**: as 3 terminaram, com 164, 223 e 127 escritas.
  - **Limite**: os números não demonstram a causa das falhas históricas nem justificam mudar
    `TEMP`, antivírus ou prazos.

| Commit | Conteúdo |
| --- | --- |
| `efa56ea` | Antes do código: linha “Fonte do `RUNNER_TEMP` na medição” do Landing, refinamento do C50 com (m)–(n), refinamento do critério 42 e Handoff |
| `f133c55` | `resolveDestinations` sem o padrão `process.env.RUNNER_TEMP`, e os comentários dele e de `measure`; as provas `C50 fonte do RUNNER_TEMP: …` e `C50 fonte do RUNNER_TEMP pelo padrão do CLI: …`, com o apoio `withProcessRunnerTemp` |

Logs em `.checks/code-review/issue-25/builder-ci40702252461/` (pasta ignorada). Os caminhos do
`RUNNER_TEMP` ficam só ali.

- **Consumidores conferidos antes da mudança**:
  - `resolveDestinations` só é chamado por `measure` (`runnerTemp: env.RUNNER_TEMP`) e pelas
    provas, que sempre passam `runnerTemp`;
  - o script só é importado pela própria prova, o workflow roda o CLI, e `governance-ci.test.mjs` só
    confere o texto do comando e do alias;
  - o CLI chama `measure()` sem argumentos, ou seja `env = process.env` e `runnerTemp:
    env.RUNNER_TEMP`. O padrão removido nunca agia nesse caminho, então a saída do CLI é a mesma
    antes e depois da correção.
- **RED**: os testes novos sobre o script de `41dcf5d` (blob `cf29122e`, o mesmo de `6a242a2`), em
  Windows 24.22.1, com os dois arquivos do `test:governance` (`red-*-runner-temp-win-24.22.1.*`).
  - **Sem `RUNNER_TEMP` no ambiente**: 25 testes, 24 pass, 1 fail. Só (m) falha, em `runnerTemp
    undefined é ausente`: o `RUNNER_TEMP` que a prova pôs no processo deu `A1/B/A2`. As duas provas
    antigas passam, e por isso A/B/C não pegaram o caso.
  - **Com um `RUNNER_TEMP` próprio e válido no ambiente**: 25, 22 pass, 3 fail. É a reprodução
    local da CI: `C50 caminhos` sai com `RUNNER_TEMP ilegível [ENOENT]`, `C50 relatório` com
    `['A1/B/A2', {volume: 'C:'}, ['A1', 'B', 'A2']]`, e (m) falha também.
  - **(n) passou nas duas**: o CLI já lia o `RUNNER_TEMP`.
- **GREEN** (`green-*-runner-temp-win-24.22.1.*`): 25/25, sem e com `RUNNER_TEMP` no ambiente; o
  `RUNNER_TEMP` próprio ficou vazio.
- **Mutações** (cópia descartável; os 4 testes de caminhos, relatório e fonte;
  `mutation-*-win-24.22.1.spec.txt`), todas detectadas:
  - o padrão `process.env.RUNNER_TEMP` de volta: (m) falha em `runnerTemp undefined é ausente`;
  - `measure` com `env = {}` por padrão: (n) falha, porque o CLI deixaria de ler o `RUNNER_TEMP`;
  - a alternativa rejeitada, `process.env` só sem a chave `runnerTemp` (o `undefined` dado
    respeitado): (m) falha em `sem a chave runnerTemp é ausente`. A primeira versão dessa mutação
    restaurava o padrão da desestruturação e caía na primeira asserção; foi refeita para modelar a
    alternativa.

| `node --test scripts/governance-ci.test.mjs scripts/ci-lock-latency.test.mjs` (o alias `test:governance`, sem filtro), uma invocação por ambiente em `f133c55`, com `RUNNER_TEMP` presente, pasta real, distinta do `os.tmpdir()` e dos temporários das provas | Resultado |
| --- | --- |
| A — Windows, Node 24.22.1, npm 11.19.1, checkout principal, `npm_execpath` ausente, `RUNNER_TEMP` numa pasta própria do `%TEMP%`, 11:18:37–11:19:19 | 25 testes: 25 pass, 0 fail, 0 skip; `git status` vazio antes e depois; `RUNNER_TEMP` vazio antes e depois |
| B — Windows, Node 24.13.0 oficial, npm 11.6.2 adjacente, `npm_execpath` ausente, clone git novo com `core.autocrlf=true` (só no `.git/config` do clone; os dois arquivos de prova, o script, o workflow e `package.json` em `w/crlf`), o mesmo `RUNNER_TEMP`, 11:19:42–11:20:27 | 25: 25/0/0; status do clone vazio antes e depois; clone removido depois de conferir caminho, tipo e HEAD |
| C — WSL Ubuntu `oldboydev` uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, npm 11.6.2, `env -i`, `HOME` do scratch, PATH só com o prefixo e `tools` (`sh`, `git`, `python3`, `id`, `grep`, `mkfifo`), sem `/usr/bin`, e `RUNNER_TEMP` explícito numa pasta do scratch, distinta do `/tmp`; `git -c core.autocrlf=false archive f133c55` (5.877.760 bytes, sha256 `2083f660…de62543`, `get-tar-commit-id` = `f133c55e…`, árvore extraída `19401d0b…` = `HEAD^{tree}`, 0 CR), 11:20:57–11:21:02 | 25: 25/0/0; `RUNNER_TEMP` vazio depois; `~/.skill-me` e a autorização ausentes antes e depois; scratch removido |

Os 25 nomes são os mesmos nos três TAP:
- os 23 da CI (16 C50 e 7 de governança), todos presentes, sem nenhuma linha removida das asserções
  desde `41dcf5d`;
- as 2 provas novas.

Em cada ambiente passaram os 18 C50 e os 7 de governança, sem nenhum skip.

**O que não foi rodado de novo, e por quê** (`final/blob-identity.txt`):
- **O que mudou** entre `13bb1d4` (a R14, executada sobre o código `6a242a2`) e `f133c55`: só
  `scripts/ci-lock-latency.mjs`, `scripts/ci-lock-latency.test.mjs` e `code-review.config.json`. A
  configuração é do orquestrador (`68e96d8`), e nenhum teste a lê: `review.test.mjs` grava a
  própria num repositório de fixture.
- **Mesmos blobs**: `src/`, `tests/`, `.github/`, `scripts/code-review/`, `package.json`,
  `.gitattributes`, `governance-ci.test.mjs`, `test-integrations.mjs`, `ci-change-filter.mjs` e
  `ci-result.mjs`. O script só é importado pela própria prova.
- **O que fica carregado**: não rodei o `npm test` nem o alvo de 151. C1–C49 e as camadas sem
  mudança ficam com as provas executadas da R14 em `13bb1d4`, carregadas e não reexecutadas: A/B/C
  com 151/145/0/6 e D com 1.023/1.003/0/20, com os 12 nativos.
- **O que é novo**: o C50 novo está provado nos A/B/C frescos acima; não há D novo. A CI regular roda
  tudo, sem corte nem prorrogação.

Limpeza:
- os dois `RUNNER_TEMP` próprios do `%TEMP%` (o do RED/GREEN e o de A/B) estavam vazios e foram
  removidos depois de conferir o caminho absoluto e o prefixo;
- não ficou nenhuma `skill-me lock latency *` nem `skill-me-lock-latency-*`;
- as 9 entradas novas do `%TEMP%` fora da linha de base são de outras sessões (UUIDs e
  `playwright_*`) e ficaram;
- as cópias das mutações foram removidas.

Limites:
- **Medição no runner**: a medição sobre o código novo é do orquestrador; os números acima são de
  `41dcf5d`. A saída do CLI é a mesma antes e depois, pela leitura do caminho, mas isso não substitui
  a nova execução que o orquestrador decidiu fazer.
- **Causa e CI**: nada aqui demonstra a causa dos `lock_present` e `delivery_timeout` históricos,
  nem que a CI ficará verde.
- **`RUNNER_TEMP` das provas**: em (m) e (n) ele é posto no `process.env` do próprio processo da
  prova e restaurado no `finally`. Os filhos iniciados nesse intervalo o herdam, sem efeito, porque
  não o leem.
- **Pendentes, com o orquestrador**: as rodadas 16/10, a publicação, a nova medição única no HEAD
  revisto e a CI regular verde para o merge.

## CI 40709943742 e execução manual 40710014746 (Windows): diagnóstico das entregas T8 (C46 (d)–(g))

Estado de partida: HEAD `76705f9`, publicado.
- **Histórico do orquestrador, preservado**: a formal 10 `ready` (9 ACs, `sufficient`, sem achado) e o
  R16 PASS 50/50, com o relatório em `76705f9`.
- **`RUNNER_TEMP`**: a correção (`f133c55`) ficou resolvida na CI real, com governança 25/25 nos três
  sistemas. Ubuntu e macOS passaram nas duas execuções.
- **Windows**: as duas execuções ficaram vermelhas por provas antigas da #8, sem diff na feature. A CI
  e o agregado deram FAIL.

- **As falhas** (logs integrais do orquestrador em `.checks/code-review/issue-25/`):
  - **PR 40709943742**, Windows, job 122892318605 (`ci767-windows-pr40709943742.log`): governança
    25/25, motor 16/16, doctor 417 (410/0/7), integrações 567 (540 pass, **3 fail**, 24 skip).
    - **T8-C8** (`live-capture.cli.test.mjs:441`): o ingest Hermes de 1 registro saiu com
      `delivery_timeout` 1/0/0/1.
    - **T8-C14** (`query.cli.test.mjs:217`): o hook Claude saiu com `delivery_timeout`.
    - **T8-C18** (`replay.unit.test.mjs:41`): `privacy stop` saiu com 4 `lock_present` depois dos três
      produtores, dos quais a prova só confere o status.
  - **Execução manual 40710014746**, matriz regular do Windows, job 122892590221
    (`ci767-windows-manual40710014746.log`): governança, motor e doctor iguais; integrações 567 (542
    pass, **1 fail**, 24 skip).
    - **T8-C3** (`live-capture.cli.test.mjs:198`): o ingest Hermes de 9 registros saiu com
      `delivery_timeout` 9/0/0/9.
  - Cada uma passou na outra execução. O I23-C4 e o T8-C11, que falharam na CI anterior, passaram, e
    os instrumentados C47/I23-C10 e C46/T8-C15 também.
- **Medição real** (dados do orquestrador, não executados aqui): job 122892425130 sobre `76705f9`,
  arquivos `measurement40710014746.json` e `.log`.
  - **Fases e ciclos**: A1 no `C:`, B no `D:`, A2 no `C:`; 4.500 de 4.500 ciclos; nenhum erro,
    incompleto ou linha inválida; todos os filhos saíram com 0; limpeza 3.
  - **Faixas**: nenhuma amostra ≥ 600 ou ≥ 650 ms em nenhuma operação.
  - **Tomada, p99/máximo em ms**: A1 3,682/53,370; B 0,747/16,765; A2 3,721/139,837.
  - **Liberação, p99/máximo em ms**: A1 3,478/4,804; B 1,090/13,752; A2 3,887/139,402.
  - **Limite**: não prova causa, não permite atribuir nada a antivírus, host, disco ou relógio, e não
    justifica otimizar `TEMP`, concorrência ou prazos.

| Commit | Conteúdo |
| --- | --- |
| `4d3b1d9` | Antes do código: linha “Diagnóstico das entregas de um produtor nas provas T8” do Landing (caminho real, o que não se sabe, forma literal e alternativas), refinamento do C46 com os controles (d)–(g), refinamento do critério 38 e Handoff com o gate exato |
| `51679df` | A pré-carga com pendentes, saída, início, `pid` e atraso do laço, e a injeção `BLOCK_LOOP`; `helpers/traces.mjs` com `at`/`ms` no `diskTrace` e os apoios novos; T8-C3, T8-C8, T8-C14 e T8-C18 com a pré-carga e a evidência na falha; os quatro controles I25-C46 novos |

Logs em `.checks/code-review/issue-25/builder-ci767/` (pasta ignorada).

- **Comparação das variantes** (código lido):
  - **T8-C1 e T8-C2** já rodavam os hooks com a pré-carga, desde a #8. Passaram nas duas execuções; a
    entrega mais lenta levou 76 a 107 ms.
  - **T8-C3, T8-C8, T8-C14 e T8-C18** rodavam os produtores sem ela. Os quatro usam a captura manual
    (`createCaptureDelivery`). O ingest abre antes de ler o stdin, com o prazo da abertura contado da
    chamada (`delivery.mjs:180`, `ingest-command.mjs:13`); o hook abre depois de ler, e o prazo de
    650 ms conta da leitura.
  - **Os produtores que falharam**: dois ingests (T8-C3 e T8-C8) e um hook (T8-C14), todos com
    `delivery_timeout` no relatório. No T8-C18, o `privacy stop` saiu com `lock_present`, sem
    relatório de entrega anterior nem indicação de quem tinha o lock.
  - **Nas CIs anteriores**: o C46 teve dois ingests parados na criação do lock da abertura (CI
    40514323240); o I23-C10, um hook automático; o I23-C4 e o T8-C11, `lock_present` (CI 40636157287).
  - **Mecanismos compatíveis com o código e o contrato**, não demonstrados nestas falhas:
    - Pelo código, `delivery_timeout` é a tentativa que não terminou até o prazo de 650 ms da
      entrada.
    - Um lock deixado por uma tentativa abandonada é um caminho previsto: o `process.exit(0)` do CLI
      (`cli.mjs:24`) encerra o que estava em curso, e `docs/traces.md` descreve o lock que fica.
      Ele explicaria o `lock_present` do T8-C18, assim como as outras vias que o contrato admite.
    - Os logs não mostram qual operação ou tomada, nem qual produtor tinha o lock.
    - O tipo de sintoma é o das CIs anteriores, o que não prova causa comum.
- **Caminho mapeado** (`map-producers-win-24.22.1.txt`):
  - **Ingest Hermes de 9**: 81 operações, 24 fora do lock, 27 na 1ª tomada (abertura: estado e chave)
    e 30 na 2ª (segmento e `state.json` por temporário com flush; commit pelo `rename` de
    `state.json.tmp`), em 23 ms.
  - **Hook Claude**: 89 operações, em 17 ms.
- **Sondas antes do plano** (`probe-eld-*`):
  - o `monitorEventLoopDelay` não mantém o processo vivo;
  - uma operação em curso no `process.exit` fica visível no `'exit'`;
  - um bloqueio de 700 ms depois de o laço rodar aparece como 700 ms. Um bloqueio antes do primeiro
    tique (logo na carga) não aparece, o que fica como limite.
- **RED** (a prova antiga numa cópia descartável de `4d3b1d9`, que tem as mesmas provas de `76705f9`,
  com só o env do ingest alterado por `red-patch.mjs`, que acrescenta a pré-carga e
  `STALL_SEGMENT=1`; `red-old-win-24.22.1.spec.txt`):
  - **T8-C3**: falhou com só o diff `delivery_timeout` 9/0/0/9;
  - **T8-C18**: falhou com só `stop: {"…","error":{"code":"lock_present"}}` e `4 !== 0`.

  São as mensagens das CIs, sem operação, tomada, estado do laço nem indicação de quem tinha o lock. Reproduzir a
  mensagem não mostra a causa da CI.
- **GREEN** (`green-first-win-24.22.1.spec.txt`; os três arquivos tocados): 18 testes, 17 pass, 1 skip
  (T8-C4 POSIX). As quatro provas novas passaram na primeira execução, com os valores registrados.
- **Mensagens dos controles** (`sample-messages-win-24.22.1.txt`, pelos apoios versionados, com as
  injeções da pré-carga; não são falhas da CI):
  - **(d) disco parado sob o lock**: `pendentes na saída: open segmento.tmp (sob o lock, 2ª tomada) há
    654 ms`; laço com atraso máximo de 18,3 ms (43 amostras); `lock presente, de ingest hermes`.
  - **(e) criação do lock parada**: `pendentes na saída: open lock (tomada do lock) há 659 ms`; laço
    com 16,3 ms; lock ausente; status `active, accepted 0, persisted 0`.
  - **(f) laço parado**: `mais lenta open lock 901 ms`; laço com atraso máximo de 901,8 ms; CPU do
    processo 922 ms.

  Nos controles, os três casos injetados se distinguem pela operação, pela tomada, pela idade, pelo
  laço e pela CPU. Numa falha real, esses campos são evidências compatíveis com um tipo de espera, e
  não identificam o recurso nem a causa.
- **Mutações** (cópia descartável; as 4 provas saudáveis e os 4 controles;
  `mutation-*-win-24.22.1.spec.txt`). Todas foram detectadas, as provas saudáveis passaram em cada
  uma, e as cópias foram removidas:
  - pré-carga só com concluídas: (d), (e) e (g) falham;
  - laço não medido: (d), (e) e (f) falham;
  - dono do lock presumido: (g) falha;
  - lugar sem a tomada: (d) e (g) falham;
  - mensagem sem evidência: as quatro falham;
  - em curso contada como concluída: (d) e (e) falham.

| Alvo afetado em `51679df`: os 8 arquivos que carregam a pré-carga ou os apoios mudados (`launch/command.cli`, `launch/end.e2e`, `observe/agents.e2e`, `traces/concurrency.cli`, `traces/follow.cli`, `traces/live-capture.cli`, `traces/query.cli`, `traces/replay.unit`), `--test-concurrency=4`, uma invocação sem filtro por ambiente | Resultado |
| --- | --- |
| A — Windows, Node 24.22.1, npm 11.19.1, Python 3.12.10, checkout principal, `npm_execpath` ausente, 12:24:10–12:26:56 | 80 testes: 74 pass, 0 fail, 6 skip; `git status` vazio antes e depois |
| B — Windows, Node 24.13.0 oficial, npm 11.6.2 adjacente, `npm_execpath` ausente, clone git novo com `core.autocrlf=true` (só no `.git/config` do clone; a pré-carga, o apoio e as provas em `w/crlf`; `cli.mjs` `w/lf attr/text eol=lf`), 12:27:11–12:29:56 | 80: 74 pass, 0 fail, 6 skip; status do clone vazio antes e depois; clone removido depois de conferir caminho, tipo e HEAD |
| C — WSL Ubuntu `oldboydev` uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, npm 11.6.2, `env -i`, `HOME` do scratch, PATH só com o prefixo e `tools` (`sh`, `git`, `python3`, `id`, `grep`, `mkfifo`), sem `/usr/bin`; `git -c core.autocrlf=false archive 51679df` (5.949.440 bytes, sha256 `4b1af460…cab5dfc`, `get-tar-commit-id` = `51679dfc…`, árvore extraída `e7ce68d4…` = `HEAD^{tree}`, `cli.mjs` 755, 0 CR), 12:30:20–12:31:26 | 80: 76 pass, 0 fail, 4 skip; `~/.skill-me` e a autorização ausentes antes e depois; scratch removido |

Os 80 nomes são os mesmos nos três TAP. Em cada ambiente passaram os 7 `I25-C46` (os 3 de antes e os
4 novos) e 26 testes T8, sem nenhum `not ok`.

Skips, todos de plataforma, com o motivo impresso, e cada um rodou no outro sistema:
- **A e B (6)**:
  - `I25-C45` POSIX (vazio do PATH);
  - `I25-C5`, `I25-C6` e `I25-C42` POSIX (sinais);
  - `I25-C33` arranjo (`ComSpec`);
  - `T8-C4` sinal POSIX (`posix-signals`).
- **C (4)**: `I25-C4` shim, `I25-C45` controle do Windows, e o `I25-C5` e o `I25-C42` do console.

**`npm test` completo em `51679df`**: Windows, Node 24.22.1, npm 11.19.1, `npm_execpath` ausente, runner
padrão com 8 arquivos (32 núcleos) e os 12 nativos do Hermes. Rodou uma vez, sem repetir, das 12:31:53 às
12:41:12, com orçamento de 2 h definido na ferramenta antes do início, e esperei o término real
(`builder-ci767/final/npm-test.*`). **Exit 0**: 1.029 testes, 1.009 pass, 0 fail e 20 skip; nenhum `✖` no
log; `git status` vazio antes e depois.
- **Por suíte**: governança 25/25; motor 16/16; doctor 417 (410/0/7); integrações 571 (558/0/13).
  Integrações eram 567 e ganharam as 4 provas novas.
- **Passaram**: os 12 nativos; T8-C3, T8-C8, T8-C14 e T8-C18; os 7 `I25-C46`; T8-C15; I23-C10; os 18
  C50.
- **Skips, todos de plataforma**:
  - os 7 do doctor, `{skip: process.platform === "win32"}` em provas só do POSIX, sem texto de motivo;
  - os 13 das integrações, com o motivo impresso: `I4-C15` e `T8-C4` (`posix-signals`), `I4-C25b`
    (`posix-modes`), `I4-C25j`, `I4-C25k` e `I4-C25l` (`posix-acl`), `I4-C25m` (`macos-acl`), e os I25
    só do POSIX (`C45`, `C5`, `C6`, `C42`, `C33` arranjo, `C15`).

  Rodaram em outro ambiente desta rodada os I25 POSIX `C45`, `C5`, `C6`, `C42` e `C33` e o `T8-C4`
  POSIX, todos no C. O `I25-C15` (`prepare.cli`) não está no alvo afetado. Os 7 do doctor e os I4 não
  rodaram em nenhum ambiente desta rodada.

Limpeza do `%TEMP%`: 236 pastas na janela A–B e 127 na janela do D foram removidas, com 0 recusas. A
conferência foi pela linha de base, pelos prefixos `skill-me i4 `, `skill-me i5 ` e `skill-me lock latency `,
pelo mtime na janela e por não ser link. Nenhuma entrada `skill-me` nova ficou; as outras são de outras
sessões. A cópia do RED, as cópias das mutações e o clone de B foram removidos, todos com o caminho
absoluto e o tipo conferidos antes.

**Causa**: continua **desconhecida**. Não há defeito do produto ou das provas demonstrado, o que não
equivale a afirmar que não há defeito.
- As quatro falhas são vermelhas pelo que as asserções medem: uma entrada não confirmada no prazo, ou
  o `stop` recusado com `lock_present`. Os logs não mostram o mecanismo.
- O código do caminho não mudou na feature.
- A medição sintética isolada do orquestrador não teve operação ≥ 600 ms, com máximos de até cerca de
  140 ms. Ela não nomeia recurso nem causa.

Não há correção. O que muda é a observabilidade da próxima CI. Se um desses produtores falhar, a
mensagem trará:
- qual operação estava em curso, em que tomada e há quanto tempo;
- o atraso do laço e a CPU do processo. Com a operação em curso e o laço livre, isso é compatível com
  uma espera de E/S ou do sistema, sem identificar disco, antivírus ou outro recurso. Com o laço
  atrasado tanto quanto a operação, é compatível com o processo parado ou sem CPU. É evidência, não
  prova do recurso;
- quando o processo começou, para comparar no tempo falhas de arquivos diferentes; uma coincidência
  não prova causa comum;
- se o `pid` gravado no lock coincide com o `pid` registrado de algum produtor. Isso não prova sozinho
  quem deixou o arquivo, porque o `pid` pode ser reutilizado.

Retificação documental antes do Verifier 17 (sem mudança de código, prova ou valor):
- **O que foi corrigido**: as primeiras versões deste texto, do handoff pontual e dos adendos do
  checklist e da task davam como fato, para as quatro falhas, a tentativa que não termina e o lock
  deixado pelo `process.exit`, e liam o `pid` como dono do lock e o laço livre como disco. Agora
  constam como mecanismos compatíveis e evidências.
- **Texto que fica como está em `51679df`**: os comentários `traces-probe.mjs:45` (“laço livre com a
  operação parada aponta o disco; laço parado, o processo”) e `traces.mjs:244` (“O dono do lock é o
  produtor cujo `pid`…”), e o nome do controle em `replay.unit.test.mjs:143` (“mostra quem deixou o
  lock”). Nos controles o produtor que deixa o lock é conhecido pela injeção; fora deles, essa
  leitura vale com as ressalvas acima.

Limites:
- **Laço de eventos**: o histograma não vê um bloqueio antes do primeiro tique dele, logo na carga do
  processo.
- **Operações cobertas**: os pendentes e os tempos cobrem só as operações de `node:fs/promises` que a
  pré-carga envolve; E/S síncrona ou outra fila do libuv ficam fora.
- **`startedAt`**: é do relógio de parede e serve só para correlacionar.
- **Lock e `pid`**: o rótulo na linha do lock só diz que o `pid` gravado nele coincide com o `pid`
  registrado pela pré-carga daquele produtor. O sistema pode reutilizar `pid`s; com dois produtores
  de mesmo `pid`, a evidência lista os dois. Não prova sozinho quem deixou o arquivo.
- **Custo da pré-carga**: cada operação ganha uma entrada num `Set` e dois `performance.now()`, e o
  histograma soma um timer de 10 ms ao processo. Nas quatro provas os produtores passam a carregar a
  pré-carga por `NODE_OPTIONS`; o custo não foi medido à parte.
- **Dívida**: a evidência do C46/T8-C15 e do C47/I23-C10 continua local àqueles arquivos, sem os
  campos novos; consolidar mudaria provas que passaram.
- **Pendentes, com o orquestrador**: as rodadas 17/11, a publicação e a próxima CI. Nada aqui afirma
  CI verde, medição nova ou `ready`.

## CI 40728221657 e execução manual 40728249484 (Windows): evidência comum dos produtores (C46 (h)–(k), C47 (c)–(d))

Estado de partida: HEAD `93bd1e9`, publicado. Sessão nova de autor, sem herdar a anterior.
- **Histórico do orquestrador, preservado**: FAIL 17 (literal 1 vs 2, `1ef4c72`), correção do literal do
  C46 (g) para 2/0/0/2 (`d8da3c0`), PASS 18 50/50 (`93bd1e9`, código de `51679df`) e formal 11 `ready`.
- **As falhas** (logs integrais do orquestrador em `.checks/code-review/issue-25/ci93-windows-*.log`):
  - **PR 40728221657**, job 122957292934: governança 25/25, motor 16/16, doctor 417 (410/0/7),
    integrações 571 (546 pass, **1 fail**, 24 skip).
    - **I23-C4** (`control.cli.test.mjs:879`, erro na `:976`): o hook Claude da rota automática saiu com
      `delivery_timeout` 1/0/0/1 (`unrouted` 0), sem dado de E/S. É **processo filho** (`runHook`), não o
      produtor em processo; os dois produtores em processo do arquivo (`:557`, `:832`) foram o sintoma da
      CI 40636157287.
  - **Manual 40728249484**, matriz regular, job 122957402134: integrações 571 (544 pass, **3 fail**, 24 skip).
    - **T8-C12** (`follow.cli.test.mjs:59`): `0 !== 1` no `persisted` do 1º hook; o código da entrega não
      aparece.
    - **T8-C13** (`:90`): `stop` com `lock_present` depois de dois hooks e um ingest, só com o status deles.
    - **T8-C2** (`live-capture.cli.test.mjs:178`): `delivery_timeout` 1/0/0/1 no `session_end`, com a
      mensagem do formatter legado: `359 ms da 1ª à última operação de disco; 72 operações; flush nenhum =
      0 ms; por operação open 340, stat 5, lstat 2, read 2 ms; mais lenta open lock 339 ms; falhas nenhuma;
      CPU do processo 15 ms`. Ela só conta as concluídas; os pendentes, a saída, o início e o laço que a
      pré-carga de `51679df` grava não eram mostrados.
  - Os quatro controles T8 de `51679df` passaram nas duas.
- **Medição real** (dados do orquestrador, job 122957247705 sobre `93bd1e9`, `measurement40728249484.*`):
  4.500/4.500 ciclos, nenhum erro, nenhuma amostra ≥ 600 ms. Não é o caminho das entregas, não dá causa
  nem justifica otimizar.

| Commit | Conteúdo |
| --- | --- |
| `48b191a` | Antes do código: Sources, linha “Evidência comum dos produtores e formatter legado” do Landing, refinamentos do C46 (h)–(k), do C47 (c)–(d) e das tasks 38–39, Handoff com leitura, fronteira e gates |
| `fa2c8eb` | Formatter comum, registro por teste, `io` medido em processo, adoção nos 7 arquivos, controles; linha “Adoção pelos hooks do arquivo e registro num módulo leve” do Landing (descoberta do build) |
| `60bbda8` | Reforço do controle (h): os trechos do formatter legado conferidos só na mensagem de sempre |

Pasta de trabalho: `.checks/code-review/issue-25/builder-ci93-shared/` (ignorada).

- **Catálogo antes do código** (`consumers-before.txt`): 37 arquivos de prova importam os apoios mudados;
  30 iniciam produtores; só 6 passavam a pré-carga; 5 usavam o formatter. Com a prova nova, o gate tem 38.
- **RED** (provas de `93bd1e9` numa cópia descartável; `red-patch.mjs` muda só o ambiente ou o `io` do
  produtor; `red-old-win-24.22.1.spec.txt` e `red-old-inprocess-win-24.22.1.spec.txt`):
  - T8-C2: `pre_tool_bash: 11 ms da 1ª à última operação de disco; 63 operações; flush nenhum = 0 ms; …;
    falhas nenhuma; CPU do processo 16 ms` e o diff — com uma operação parada ~640 ms, a mensagem não a
    mostra;
  - T8-C12: só `0 !== 1`; T8-C13: só `stop: {…lock_present}` e `4 !== 0`; I23-C4 hook: só o diff;
  - I23-C4 em processo (`io` com o temporário do segmento parado): o primeiro sintoma é o `privacy list` com
    `lock_present` (`:564`), como na CI 40636157287, sem dado do produtor.
  - Um erro meu no 1º patch (barras da regex perdidas) deixou a injeção em processo sem efeito; corrigido
    sem regex e reexecutado só esse caso.
- **Descobertas do build** (linha nova do Landing, antes do commit do código):
  - envelopar o `test` trocava o local da falha para `helpers/traces.mjs:380:10`; a adoção passou a ser
    pelos hooks do arquivo (`context.error`/`context.passed`, conferidos no Node 24.13.0 e 24.22.1);
  - importar `traces.mjs` em `installed-hooks.mjs` subia a carga da fixture do launcher de 7,9 para 30,4 ms;
    o estado foi para `helpers/producer-runs.mjs`, e a carga voltou a 7,8 ms;
  - na rota automática o `lstat ENOENT` é a conferência normal de ausência; no lugar neutro sai como
    `ausências conferidas`, não como falha.
- **GREEN** (antes desses dois últimos ajustes): os 10 arquivos tocados e do alvo anterior, 106 testes,
  100 pass, 0 fail, 6 skip; depois dos ajustes, os 20 controles I25 passaram. A prova final é o A/B/C/D
  em `60bbda8`.
- **Mensagens dos controles** (`sample-messages-win-24.22.1.txt`, pelos apoios versionados):
  - T8-C13 com o ingest parado: os três produtores com relatório, tempos, processo e laço; o ingest com
    `pendentes na saída: open segmento.tmp (sob o lock, 2ª tomada) há 645 ms`, `saída aos 703 ms (658 ms
    depois da 1ª operação)`, laço com 11,1 ms; `raiz 1 (produtores 1, 2, 3): lock presente, de produtor 3
    ingest hermes; capturas indisponível [lock_present]`;
  - hook automático parado: a raiz lida do home da prova, o pendente e o lock do hook;
  - em processo: `pendentes no instantâneo: writeExclusive segmento.tmp (sob o lock, 2ª tomada)`, o laço do
    processo da prova e `lock presente, de produtor 1 claude em processo`.
- **Mutações** (cópias descartáveis de `fa2c8eb`; os 24 testes T8-C2, T8-C12, T8-C13, I23-C4 e I25-C46/C47
  dos 4 arquivos; `mutations/`): as 10 foram detectadas, e só controles I25 falharam em cada uma:
  formatter sem pendentes/processo/laço (2); pendente como concluída (2); registro sem evidência (8); erro
  novo no lugar do original (8); hook Codex instalado fora do registro (1); home lido fora do temporário
  (1); laço sem amostra como zero (1); `io` em processo sem medida (3); dono do lock presumido (1); ausência
  como falha (2). Na 1ª, o controle (h) passava porque os trechos também saíam na evidência anexada:
  reforçado em `60bbda8`, a mutação reexecutada falhou também no (h) (`mutations-60bbda8/`).
- **Mapa do T8-C2** (`map-codex-hooks-win-24.22.1.txt`, execução saudável local): o `session_end` (7º caso)
  conclui 89 operações; por início, a 72ª é `writeFile segmento.tmp` e a 73ª o 1º flush, `sync
  segmento.tmp` (2ª tomada). Isso é **compatível** com as 72 concluídas e “flush nenhum” da CI, e com a
  `open lock` de 339 ms, mas não demonstra a operação em curso: o formatter legado não a mostrava.

| Alvo afetado em `60bbda8`: as 38 consumidoras dos apoios mudados (as 37 do catálogo e a prova nova; lista `final/gate-files.txt`, sha256 `0ab90cdf…1754`), `--test-concurrency=4`, uma invocação sem filtro por ambiente, `RUNNER_TEMP` presente e válido | Resultado |
| --- | --- |
| A — Windows, Node 24.22.1, npm 11.19.1, Python 3.12.10, checkout principal, `npm_execpath` ausente, 14:52:12–14:59:26 | 333 testes: 321 pass, 0 fail, 12 skip; exit 0; `git status` vazio antes e depois |
| B — clone git novo de `60bbda8`, `core.autocrlf=true` só no `.git/config` do clone (`traces.mjs`, `producer-runs.mjs` e a prova nova em `w/crlf`; `cli.mjs` `w/lf attr/text eol=lf`), Node 24.13.0 oficial, npm 11.6.2 adjacente, `npm_execpath` ausente, 14:59:57–15:10:56 | 333: 314 pass, **7 fail**, 12 skip; exit 1; status do clone vazio antes e depois; clone removido depois de conferir caminho, tipo e HEAD |
| C — WSL Ubuntu `oldboydev` uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, npm 11.6.2, `env -i`, `HOME` e `RUNNER_TEMP` do scratch, PATH só com o prefixo e `tools` (`sh`, `git`, `python3`, `id`, `grep`, `mkfifo`), sem `/usr/bin`; `git -c core.autocrlf=false archive 60bbda8` (6.113.280 bytes, sha256 `622d8a52…2559`, `get-tar-commit-id` = `60bbda8e…`, árvore extraída `21865e82…` = `HEAD^{tree}`, `cli.mjs` 755, 0 CR no apoio), 15:14:35–15:15:48 | 333: 312 pass, **1 fail**, 20 skip; exit 1; `~/.skill-me` e a autorização ausentes antes e depois; scratch removido |

Os 327 nomes de teste do TAP são os mesmos nos três. Em cada ambiente passaram os 20 `I25-C46`/`I25-C47`
(os 9 de antes e os 11 novos), os T8 e os I23-C4; nenhuma falha é de prova tocada nesta entrega.

- **As 7 do B** (`final/B-win-24.13.0.spec.txt`): I4-C19, I4-C20, I4-C21, I4-C22, I4-C37 e I23-C8, nativas
  do Hermes (`Unknown tool: skillme_fixture_echo` ou `'error' !== 'ok'`), e I4-C35 (`ENOENT` no `rmSync` do
  plugin de fixture, `skill-tree-hash.cli.test.mjs:101`).
  - **Causa demonstrada, fora desta entrega**: no Node 24.13.0 do Windows, `fs.cpSync` recursivo para um
    destino com “ação” no caminho termina sem erro e não copia nada (a pasta-mãe fica vazia), e o `rmSync`
    recursivo deixa a pasta; com caminho ASCII, ou no 24.22.1, os dois funcionam (`probes/cpsync.mjs`). As
    provas copiam o plugin de fixture para o `HERMES_HOME` de um scratch `skill-me i4 … ação-…`; sem ele o
    Hermes não conhece a ferramenta.
  - **Discriminação** (`final/diag-B/`): o I4-C35 isolado falha com o 24.13.0 e passa com o 24.22.1, no
    checkout e no clone, e falha igual em `93bd1e9`, antes desta entrega, com o 24.13.0.
  - **Na CI** as nativas são puladas (sem o Hermes) e, no D com o 24.22.1, passam. Não é defeito do produto
    nem desta mudança. Não foi corrigido nem repetido: são provas da #4 e do runtime local, fora do escopo
    deste lote; fica com o orquestrador.
- **A do C** (`final/C-wsl-24.13.0.spec.txt`): I4-C36 (`failure-matrix.cli.test.mjs:82`), `claude timeout: 209
  ms`, quando a prova exige ≥ 1.900 ms para o stdin que nunca fecha.
  - O hook relatou `stdinTimeout` 1 (a asserção anterior passou), e o runner, pelo relógio monotônico, deu
    2.358 ms ao teste até ali, o que é incompatível com 209 ms reais. A prova mede com `Date.now()`
    (`collect` de `installed-hooks.mjs`), e o relógio de parede do WSL já recuou antes (linha “Cronologia
    explícita no C34” do Landing). Compatível com um recuo do relógio de parede; não demonstrado.
  - O caminho dessa prova não mudou de comportamento: `failure-matrix` não adota o registro, e fora dele
    `recordedProducer` devolve o mesmo ambiente (prova unitária). Prova da #4, fora do escopo: não
    corrigida nem repetida.
- **Skips**, todos de plataforma, com o motivo impresso, e cada um rodou no outro sistema quando o alvo o
  tem:
  - **A e B (12)**: I4-C15 e T8-C4 (`posix-signals`); I4-C25b, C25j, C25k (POSIX/Linux) e C25m (macOS);
    I25-C45, C5, C6, C42, C33 e C15 (POSIX).
  - **C (20)**: as 11 nativas do Hermes (sem o runtime no `HOME` do scratch); I4-C25g e C25h (Windows) e
    C25m (macOS); I25-C4, C45 (controle do Windows), C5, C42, C8 e C38 (Windows).

**`npm test` completo em `60bbda8`**: Windows, Node 24.22.1, npm 11.19.1, `npm_execpath` ausente,
`RUNNER_TEMP` presente, runner padrão com 8 arquivos (32 núcleos) e os nativos do Hermes. Uma vez, sem
repetir, das 15:16:48 às 15:24:17, com orçamento de 2 h na ferramenta antes do início; esperei o término
real (`final/npm-test.*`). **Exit 0**: 1.040 testes, 1.020 pass, 0 fail, 20 skip; nenhum `✖`; `git status`
vazio antes e depois.
- **Por suíte**: governança 25/25; motor 16/16; doctor 417 (410/0/7); integrações 582 (569/0/13). Eram 571 e
  ganharam as 11 provas novas (6 da prova unitária, 2 do `control.cli`, 2 do `follow.cli`, 1 do
  `live-capture.cli`).
- **Passaram**: as nativas do Hermes (I4-C18 a C23, I4-C37, I4-C44b, as 3 do I25-C40 e as 3 do I23-C8); os
  20 I25-C46/C47; T8-C2, T8-C12, T8-C13 e os outros T8; os I23-C4 e o I23-C10.
- **Skips, todos de plataforma**: os 7 do doctor (POSIX, sem texto de motivo) e os 13 das integrações com o
  motivo: I4-C15 e T8-C4 (`posix-signals`), I4-C25b (`posix-modes`), I4-C25j, C25k e C25l (`posix-acl`),
  I4-C25m (`macos-acl`) e os I25 só do POSIX (C45, C5, C6, C42, C33 arranjo e C15).

**Limpeza**: no temporário do Windows, as 1.257 pastas `skill-me i4`/`i5` novas na janela A–D (a maioria
do B, pelo `rmSync` do 24.13.0) foram removidas, com 0 recusas e as 30.087 da linha de base intactas
(`final/temp-*.json`); no `/tmp` do WSL, as 107 da janela do C, de volta a 381 (`final/C-tmp-cleanup.txt`).
As cópias do RED e das mutações e o clone B foram removidos com caminho e tipo conferidos.

**Causa**: continua **desconhecida**. Não há defeito do produto ou das provas demonstrado, o que não é o
mesmo que afirmar que não há defeito. O que mudou é a observabilidade: na próxima falha de um produtor
dos sete arquivos, a mensagem traz, para todo produtor do teste, o relatório, as operações concluídas, a
em curso com o lugar e a idade, o processo e o laço, e de cada raiz o lock (com o `pid` coincidente), as
capturas e a pasta. Nenhuma mitigação é proposta: não há evidência comparável que a sustente; a próxima
CI decide se cabe uma proposta.

Limites:
- **Adoção**: sete arquivos (os com produtores vermelhos nas CIs do PR). As outras 30 consumidoras rodam
  como antes; `codex-run.cli.test.mjs:84` compara o ambiente inteiro do filho, que a pré-carga mudaria.
- **Pré-carga**: cobre só `node:fs/promises`; E/S síncrona ou outra fila do libuv ficam fora. O laço não
  vê um bloqueio antes do primeiro tique. `startedAt` é relógio de parede, só para correlacionar.
- **Em processo**: o laço e a CPU são os do processo da prova desde a criação do produtor, com o que mais a
  prova fizer nesse tempo; `writeExclusive` aparece inteiro, sem as etapas internas.
- **Lock e `pid`**: coincidência, não prova de quem deixou o arquivo.
- **Raiz automática**: só de um home `skill-me …` dentro do temporário; fora dele, `indisponível`.
- **Custo**: nos sete arquivos todo produtor carrega a pré-carga; o custo não foi medido à parte.
- **Dívida**: a evidência local do C46/T8-C15 e do C47/I23-C10 e o `rootEvidence` do I23-C10 continuam
  nos arquivos deles; consolidar mudaria provas que passaram.
- **Pendentes, com o orquestrador**: Verifier 19, formal 12, publicação e a próxima CI. Nada aqui afirma CI
  verde, `ready` nem causa corrigida.

## Gates de `60bbda8`: correção da harness nos gates B e C (C40 (a)–(b), C46 (l))

Continuação do mesmo lote e da mesma sessão de autor, depois do D de `60bbda8`. Os resultados de
`60bbda8` ficam como foram: A 333/321/0/12, B 333/314/7/12 e C 333/312/1/20. B e C não foram aprovados, e
a primeira tentativa de C, com o caminho convertido pelo MSYS, não executou nenhum teste.

| Commit | Conteúdo |
| --- | --- |
| `0eaae31` | Antes do código: Sources, linhas “Preparação da fixture do plugin Hermes no Node 24.13.0” e “Duração monotônica no apoio dos hooks instalados” do Landing, C40 (a)–(b), C46 (l), tasks 32 e 38, Handoff com as retificações |
| `d317202` | `installFixturePlugin`/`removeFixturePlugin` em `hermes-runtime.mjs` e o uso nas duas provas demonstradas; `collect` por `performance.now()`; os controles I25-C40 e I25-C46 (l) |
| `c0d61d7` | Gates definidos depois do último código: lista de 39 arquivos, ambientes e isolamento do temporário |

Pasta de trabalho: `builder-ci93-shared/final2/`, `probes/` e `clock/` (ignoradas).

- **B — causa demonstrada** (`probes/fs-unicode-win.txt`, com a fixture real):
  - No Windows, com o Node 24.13.0 e “ação” no destino, o `cpSync` recursivo não lança e o destino pedido
    fica ausente. A cópia vai para um irmão com o nome convertido pela página de código ANSI: o RED abaixo
    deixou `skill-me i4 i25 c40 fixture aÃ§Ã£o aÃ§Ã£o-D8YJUv`, com o mesmo sufixo aleatório do scratch do
    teste e os dois arquivos da fixture.
  - O `rmSync` recursivo, com ou sem `force`, não lança e deixa a pasta com o conteúdo.
  - O `cp` e o `rm` de `node:fs/promises` copiam e removem com os sha256 da fonte.
  - No 24.22.1, ou com caminho ASCII, as quatro operações funcionam.
  - O I4-C35 isolado falha igual em `93bd1e9` com o 24.13.0 (`final/diag-B/`).
  - O repositório já documentava o defeito e o substituto (`concurrency.cli.test.mjs:54`,
    nodejs/node#56049).
- **C — comparação das mesmas chamadas** (`clock/wsl-clock-compare.jsonl` e `wsl-clock-summary.txt`; WSL
  uid 1000, Node 24.13.0 copiado, `env -i`, `HOME` e `TMPDIR` no scratch, 15:32–15:43):
  - 349 chamadas do caso de stdin aberto do I4-C36, pelo `runClaudeHandler` real, medidas também em volta
    de cada chamada pelos dois relógios;
  - o relógio civil recuou 50 vezes, em 25 pares de cerca de −0,8 s e −1,0 s, a cada ~30 s (−44,4 s ao
    todo);
  - as 28 chamadas que atravessaram um recuo deram `elapsedMs` de 53 a 1.499 ms contra 2.053 a 2.090 ms
    monotônicos, todas com `stdinTimeout` 1; nas outras 321, a diferença foi ≤ 3 ms.

  O hook mede o prazo por `setTimeout` (monotônico); a falha do gate C (`claude timeout: 209 ms`) é a
  medida civil do apoio.
- **RED** (cópias descartáveis de `d317202` com só o código antigo, `final2/red2-patch.mjs`):
  - **(l)**, com o `Date.now()` no `collect`, Windows 24.22.1: `claude timeout: 378 ms` (falha);
  - **C40**, com o `cpSync`/`rmSync` na preparação:
    - no 24.13.0: `ENOENT: … scandir …\plugins\skillme-fixture-tool` (falha);
    - no 24.22.1: passa, o que confirma que o controle só discrimina no Windows com o 24.13.0.
- **GREEN antes dos gates**:
  - o controle do C40 passa no 24.13.0 e no 24.22.1;
  - o I4-C36 e o (l) passam no 24.22.1;
  - as nativas do Hermes, o I4-C35 e a harness (22 testes) passam no 24.13.0 e no 24.22.1
    (`final2/green-B-set-*.spec.txt`).
- **Limpeza com proveniência**: os scratches do RED B (o pedido, pelo caminho exato da saída do teste, e o
  irmão `aÃ§Ã£o`, pelo sufixo e pelo conteúdo) foram removidos (`red2-b-cleanup.txt`,
  `red2-b-mojibake-cleanup.txt`).
  - Cinco pastas da `hermes-harness.unit` (`i25 c39 harness`, `i25 c40 falha`, `i25 c40 travado`,
    `i25 c44 harness`, `i25 c44 sem destino`) apareceram no temporário às 18:47 UTC, durante o meu run
    diagnóstico com o 24.13.0, cujo `after` usa `rmSync`.
  - Só a janela e os rótulos as ligam a ele, sem prova de proveniência; por isso ficaram, listadas em
    `final2/temp-new-since-cleanup.txt`.
- **Retificações do registro anterior** (no Handoff do checklist):
  - a inferência pela duração do teste (2.358 ms) não era conclusiva sozinha;
  - a limpeza de 1.257 + 107 pastas foi por prefixo, tipo, dono e janela, sem auditoria de propriedade e
    sem os nomes removidos no Windows.

**Primeiro ciclo de gates, em `c0d61d7`** (código de `d317202`; 39 arquivos; logs em `final2/`):
- **A**: 343 testes, 331 pass, 0 fail, 12 skip, exit 0.
- **B**: 343 testes, 330 pass, **1 fail**, 12 skip, exit 1 — preservado.
  - **A falha**: T8-C4 `com hook do filho` (`live-capture.cli.test.mjs:414`), com o wrapper em
    `lock_present` 16/7/6/9.
  - **O que a evidência comum trouxe** (primeira falha real com ela): 53 disputas do lock, nenhuma
    operação pendente na saída do wrapper, 15,2 s de processo, laço com até 503,6 ms, e o lock deixado
    ilegível (`SyntaxError`).
  - **A lacuna**: só a linha do wrapper, de 3 (wrapper, Codex falso e o hook filho).
  - **Por eliminação**: o wrapper saiu sem pendente, e o Codex falso não toca o store. O hook filho é o
    candidato, mas a linha dele não saiu, e por isso não é demonstrado. A causa continua desconhecida
    (classe histórica do lock deixado por uma tentativa abandonada).
- **C e D não rodaram nesse código**: a lacuna foi corrigida antes. Linha “Processos da árvore de um
  produtor e lock ilegível na evidência comum” do Landing, C46 (m)–(n), registro `2b3a114`.

| Commit | Conteúdo |
| --- | --- |
| `2b3a114` | Antes do código: a lacuna da evidência mostrada pelo B de `c0d61d7` (Landing, C46 (m)–(n), Handoff) |
| `909b591` | Com o arquivo do registro, cada linha da pré-carga sai como `processo k de n`, e o `pid` dela entra nos donos do lock; o lock ilegível sai com o código e o tamanho; corrigido também o `pid` ausente num JSON de lock (`pid?.unavailable`); controles (m)–(n) |
| `cd4afc2` | Gates finais definidos sobre `909b591`: a mesma lista de 39 (sha256 `f8706add…7986`), logs em `final2/g909/` |

- **RED (m)–(n)**: com os apoios de `d317202` e os controles novos, (m) e (n) falham e os outros 4 da prova
  passam (`final2/red-mn-win-24.22.1.spec.txt`).

| Gates finais em `cd4afc2` (código de `909b591`): 39 arquivos, `--test-concurrency=4`, uma invocação sem filtro por ambiente, `RUNNER_TEMP` presente e válido, temporário isolado por execução | Resultado |
| --- | --- |
| A — Windows, Node 24.22.1, npm 11.19.1, checkout principal, `npm_execpath` ausente; `TEMP`/`TMP` do processo em `sm-gate-A2-…`, 16:19:47–16:28:20 | 345 testes: 333 pass, 0 fail, 12 skip; exit 0; `git status` vazio antes e depois; a pasta isolada (108 entradas deixadas pelos testes) removida pelo caminho exato |
| B — clone git novo de `cd4afc2`, `core.autocrlf=true` só no clone, Node 24.13.0 oficial, npm 11.6.2, `npm_execpath` ausente; `TEMP`/`TMP` em `sm-gate-B2-…`, 16:28:49–16:36:15 | 345: 332 pass, **1 fail**, 12 skip; exit 1; status do clone vazio antes e depois; a pasta isolada (1.008 entradas, as do `rmSync` do 24.13.0) removida; o clone removido depois de conferir caminho, tipo e HEAD |
| C — WSL uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, npm 11.6.2, `env -i`, `HOME`, `RUNNER_TEMP` e `TMPDIR` dentro do scratch, PATH sem `/usr/bin`; `git archive cd4afc2` (sha256 `51717807…c28a`, árvore `89f696b3…` = `HEAD^{tree}`, 0 CR), 16:37:55–16:39:16 | 345: 325 pass, 0 fail, 20 skip; exit 0; `/tmp` com 381 `skill-me` antes e depois; as 108 entradas dos testes ficaram no `TMPDIR` do scratch, removido com ele |

- **Nomes e skips**:
  - Os 339 nomes do TAP são os mesmos nos três.
  - Os 12 skips de A e B são idênticos em nomes e motivos, e iguais aos do A de `60bbda8`.
  - Os 20 do C: as 11 nativas do Hermes (sem o runtime no `HOME` do scratch), as de Windows e a de macOS.
  - Em cada ambiente passaram os 23 I25-C46/C47 (9 de antes e 14 novos), o I4-C36, o I4-C35 e os I25-C40.
  - No B passaram as 11 nativas do Hermes, que falharam em `60bbda8`.
- **A falha do B final, preservada**: T8-C16 `tentativa cortada no prazo antes de obter o lock…`
  (`concurrency.cli.test.mjs:908`), `a repetição estava em curso no prazo`, `4 !== 3`.
  - É um teste em processo, com `io` roteirizado e sem produtor registrado. Passou em todos os outros
    gates desta rodada.
  - **Reprodução** (`final2/t8c16-probe.mjs`, o mesmo cenário pela entrega real do produto, 4 em
    paralelo × 100):
    - no Node 24.13.0, 13 de 400 rodadas tiveram uma 4ª criação do lock; no 24.22.1, 15 de 400;
    - todas saíram `lock_present`;
    - a 4ª criação começa 0,67 a 1,58 ms depois do prazo pelo `performance.now()`.
  - **O que isso mostra**: o timer do prazo de `untilDeadline` (`src/integrations/traces/delivery.mjs`,
    `fd07b89`, anterior à base `63621c6`) dispara até ~1 ms antes de o relógio da entrega chegar ao
    prazo. O laço ainda vê tempo restante e inicia mais uma tentativa. Ela é abandonada, e o lock
    obtido depois é devolvido sem gravar: o resultado do contrato (`lock_present`, nada gravado) se
    mantém, e só a contagem exata de criações da prova muda.
  - **Classificação**: pré-existente na main, sem relação com esta entrega e sem violar o contrato
    documentado. Não foi corrigido: mudar o produto ou a asserção está fora destes contratos. Fica com o
    coordenador e o proprietário.

**`npm test` completo final em `cd4afc2`**: Windows, Node 24.22.1, npm 11.19.1, `npm_execpath` ausente,
`RUNNER_TEMP` presente, `TEMP`/`TMP` do processo em `sm-gate-D2-…`, runner padrão com 8 arquivos e os
nativos do Hermes. Uma vez, das 16:39:26 às 16:50:21, com orçamento de 2 h na ferramenta antes do início, e
esperei o término real (`final2/g909/npm-test.*`). **Exit 0**: 1.044 testes, 1.024 pass, 0 fail, 20 skip;
nenhum `✖`; `git status` vazio antes e depois. A pasta isolada (128 entradas) foi removida.
- **Por suíte**: governança 25/25; motor 16/16; doctor 417 (410/0/7); integrações 586 (573/0/13), +4 provas
  novas.
- **Skips**: os mesmos 20 de plataforma do D de `60bbda8`.

**Limpeza**: as pastas isoladas dos gates e as cópias e os clones desta rodada foram removidos pelo caminho
exato. O temporário do sistema não ganhou nenhuma entrada durante os gates finais nem as sondas
(`final2/temp-gates-compare.txt`).

**Causa histórica dos `delivery_timeout`/`lock_present` no Windows**: continua desconhecida. Estas
correções são da harness dos gates (preparação da fixture e medida de duração) e da evidência comum, e não
a resolvem.

Pendentes, com o coordenador:
- o Verifier 19 e a formal 12;
- a publicação e a CI nova;
- o T8-C16 (corrida de ~1 ms entre o timer e o `performance.now()` no `untilDeadline`, pré-existente);
- as cinco pastas não atribuídas no temporário.
