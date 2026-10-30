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

## T8-C16 do gate B final: abandono terminal no prazo da entrega (C46 (o)–(p))

Nova sessão de autor (28/10/2026), a pedido do coordenador, dentro do critério 38 (AC7) e das autorizações
6467154706 e 6442514838. Registro antes do código em `9b39d7e`; código em `322bcad`. Os registros acima,
inclusive a classificação do T8-C16 pelo autor anterior, ficam como estavam.

**Falha de partida, preservada**: gate B final em `cd4afc2` (clone, Windows, Node 24.13.0), 345/332/1/12.
`concurrency.cli.test.mjs:908`, `a repetição estava em curso no prazo`, `4 !== 3` (`final2/g909/B-win-24.13.0.*`).

**Sonda do autor anterior** (`final2/t8c16-probe.mjs`, `final2/t8c16-probe-*.jsonl`), recontada por mim
dos `.jsonl`: 400 rodadas no 24.13.0, 387 com 3 criações e 13 com 4; 400 no 24.22.1, 385 e 15; todas
`lock_present`. A 4ª criação começou 0,672 a 1,584 ms depois de uma marca externa (`readAt` da sonda, antes
do `submit`), e a 3ª, 621,982 a 635,737 ms antes dela. A marca não é o `readAt` interno da entrega: os
números não provam o instante exato do prazo interno. O fato decisivo é a 3ª ainda pendente e uma 4ª.

**Origem**: o autor anterior apontou `fd07b89`. Pelo `git log -L` de `untilDeadline`, o laço que repete
qualquer `lock_present` vem de `d1a5570` (#8), o `abandoned`/`onLock` de `edd9d69` (#8), e `fd07b89` (#23)
exportou a função com o `codeOfError`. Os três estão na `main` (`63621c6`).

**Defeito 1, demonstrado**: o timer marca `abandoned` e resolvia com o motivo anterior; depois de uma recusa
concluída esse motivo é `lock_present`, e o laço iniciava outra tentativa se `clock()` ainda estava aquém do
prazo, com a abandonada pendente.

**Defeito 2, candidato confirmado**: o `onLock` só olhava `abandoned`. Com o lock obtido com o relógio no
prazo, antes de o callback do timer rodar, a operação gravava e a entrega contava a confirmação.

**Correção** (`src/integrations/traces/delivery.mjs`, só `untilDeadline`, +11/−1 linhas com o comentário):
- o `onLock` marca a tentativa abandonada e lança quando `deadlineAt - clock() <= 0`;
- o timer só marca `abandoned`;
- depois da corrida, uma tentativa abandonada retorna `{ok: false, code: locked ? "delivery_timeout" : code}`,
  antes da repetição do `lock_present` concluído.

Prazos 750/650, `LOCK_RETRY_MS`, store, lock, códigos, contagens e consumidores não mudam.

**Provas** (`322bcad`):
- `tests/integrations/traces/delivery.unit.test.mjs`, 5 testes `I25-C46 prazo da entrega: …`, pela tabela
  do C46 (o), com o `untilDeadline` exportado, relógio injetado e timer real; mais uma linha além da
  tabela: recusa concluída e depois lock antes do prazo com a operação pendente → `delivery_timeout`.
- `tests/integrations/traces/concurrency.cli.test.mjs`, 3 testes `I25-C46 prazo da entrega: …`, pela
  fronteira real do store (`createCaptureDelivery` com o `io` roteirizado do arquivo e o `clock`
  injetado): o defeito 1; o defeito 2 nos quatro casos (sem e com recusa anterior × no prazo e prazo + 1);
  o controle válido no prazo − 0,001.

**RED** (`builder-t8c16-terminal/red-final-*`): as provas de `322bcad` numa cópia descartável (`git archive
322bcad`, provas iguais sem CR) com o `delivery.mjs` de `a6a829e` (sha256 `2f7e230a…`), Windows 24.22.1,
`TEMP`/`TMP` numa pasta isolada registrada e removida pelo caminho e `ino`:
- unit: 5 testes, 3 pass, 2 fail — `3 !== 2`; `{ok: true, value: 'gravado'}` contra `delivery_timeout`;
- store (`--test-name-pattern="T8-C16 |I25-C46 prazo"`): 12 testes, 10 pass, 2 fail — `4 !== 3`;
  `{bound: true, code: null, entries: 1, committed: 1, persisted: 1, lost: 0}` contra `delivery_timeout`
  1/0/0/1.

Uma primeira execução das mesmas provas, antes da linha extra do unit, deu o mesmo RED no checkout
(`red-unit-*`, `red-store-*`).

**GREEN** (`green-unit2-*`, `green-store-*`): unit 5/5; store 12/12, inclusive o T8-C16 original com 3
criações exatas.

**Mutações** do unit (`mutate.mjs`, `mutation-M*-unit.spec.txt`), cada uma detectada:
- M1, sem o prazo pelo relógio no `onLock`: 1 fail, `{ok: true, value: 'gravado'}`;
- M2, sem o abandono terminal: 2 fail, `3 !== 2` e `io_failure` no lugar de `delivery_timeout`;
- M3, abandono terminal que ignora o lock: 1 fail, `lock_present` no lugar de `delivery_timeout`.

O arquivo corrigido foi restaurado e conferido pelo sha256 antes do commit.

**Sonda do autor anterior sobre `322bcad`** (inalterada, 4 processos × 100 rodadas, `probe-*.jsonl`;
observação, não gate): 0 de 400 com 4 criações no 24.13.0 e no 24.22.1, todas `lock_present`.

**Lista dos gates** (`affected-files3.mjs`, `gate-files-322bcad.txt`, sha256 `e26c5163…74d9`, motivos em
`gate-files-322bcad.reasons.txt`): 43 de 67 arquivos de prova:
- os 39 de `909b591`;
- `launch/agent.unit` e `launch/docs`, que importam o produto pela cadeia;
- `privacy/no-network`, que inicia `hook --agent`;
- a prova nova `traces/delivery.unit`.

Nenhum dos 39 saiu da lista.

**Gates em `dc0db9b`** (código de `322bcad`; definidos e registrados antes de rodar; uma execução de cada,
sem filtro, concorrência 4 em A/B/C; logs em `builder-t8c16-terminal/`):

| Gate | Ambiente | Início–fim | Testes | Pass | Fail | Skip |
| --- | --- | --- | --- | --- | --- | --- |
| A | checkout principal, Windows, Node 24.22.1, npm 11.19.1, `npm_execpath` ausente | 17:25:02–17:33:42 | 363 | 351 | 0 | 12 |
| B | clone git novo (`core.autocrlf=true` no `.git/config` dele), Node 24.13.0 oficial, npm 11.6.2 ao lado, `npm_execpath` ausente | 17:34:06–17:44:02 | 363 | 351 | 0 | 12 |
| C | WSL `Ubuntu`, uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, `env -i`, `HOME`/`RUNNER_TEMP`/`TMPDIR` no scratch, PATH sem `/usr/bin` | 17:44:29–17:45:54 | 363 | 343 | 0 | 20 |

- Em todos: a lista de 43 arquivos (sha256 `e26c5163…74d9`, recalculada também no clone do B), `RUNNER_TEMP`
  presente e válido, o temporário dos testes na pasta criada e registrada pela execução, `git status`
  vazio antes e depois. O C extraiu a árvore `693c9385…` do `git archive` de `dc0db9b`, sem CR.
- Os 8 `I25-C46 prazo da entrega` e o T8-C16 original passaram nos três.
- **Nomes e skips** (`*.names`, `*.skips`): os 357 nomes de topo são os mesmos em A, B e C — os de
  `cd4afc2` mais 18: as 8 provas novas e os 10 testes de `launch/agent.unit` (I25-C4 ×2, C16, C42 ×2, C45),
  `launch/docs` (I25-C37 ×3) e `privacy/no-network` (I5-C31); nenhum ausente. Os skips de A, B e C são os
  de `cd4afc2` em nomes e motivos (C: as 11 nativas do Hermes sem runtime, 8 só do Windows e 1 do macOS).
- Primeira conferência da lista dentro do clone: falso negativo (`lista no clone igual: 1`), porque usou o
  caminho da lista anterior dentro do clone, onde `.checks/code-review` não existe; refeita com o caminho
  certo, mesmo sha256 (`B-clone.txt`).

**D, `npm test` completo** (`dc0db9b`, Windows, Node 24.22.1, npm 11.19.1, teto 8, `npm_execpath` ausente,
`RUNNER_TEMP` presente, temporário na pasta isolada `sm-gate-D3-…`, orçamento de 7.200.000 ms na
ferramenta antes do início; esperei o término real): **exit 1**, das 17:46:08 às 18:21:49.
- Governança 25/25; motor 16/16; doctor 417 (410/0/7); integrações 593 (579 pass, **1 fail**, 13 skip).
- A falha é o arquivo `tests/integrations/codex-run.cli.test.mjs` inteiro: `'test failed'` em `:1:1`,
  2.054.779 ms, sem subteste vermelho. Os I4-C10 a C16 dele passaram (o C15 é skip do Windows); o I4-C16c
  (consumidor lento: o teste lê o stdout pausado a cada 50 ms e espera o `exit` e o `end` do wrapper) e o
  I4-C17 não deram resultado. A integração toda durou 2.054.842 ms, contra 572.332 ms no D de `cd4afc2`:
  o resto da suíte esperou esse arquivo.
- O caminho não alcança o produto mudado: no I4-C16c o `baseEnv` não tem par e põe `HOME` num caminho
  inexistente, e o agente `codex-exec` está fora de `AUTOMATIC_AGENTS`; `captureDeliveryFor` devolve `null`
  sem carregar `traces/delivery.mjs`. O arquivo passou em A, B e C neste código (I4-C16c em 1.000, 899 e
  628 ms) e no D de `cd4afc2` (750 ms).
- Depois do D, nenhum processo `node` com o caminho do repositório ficou vivo.
- Passaram as 11 nativas do Hermes (I4-C18 a C23, C37, C44b, I25-C40 e os dois I23-C8 com runtime), a
  observação Hermes do I4-C35 (sem o diagnóstico de não executada), o I23-C8 pelo Python do sistema e as 8
  provas novas. Os 20 skips são os do D de `cd4afc2` em nomes e motivos.
- **Causa da falha do D: desconhecida.** Não repeti o D nem investiguei o `codex-run.cli`: está fora dos
  defeitos de prazo/abandono autorizados nesta sessão. Fica preservada para o coordenador.

**Temporário**: as pastas isoladas do RED, da sonda, de A, B e D foram removidas pelo caminho e `ino`
registrados (110, 1.031 e 135 entradas deixadas pelos testes em A, B e D); a do C, pelo caminho, uid 1000 e
inode. O clone do B e a cópia do RED, pelo caminho exato. Nada do perfil WSL nem do `/tmp` global foi lido.
Exceção: as duas primeiras execuções do subconjunto de `concurrency.cli` no checkout (`red-store-*`,
`green-store-*`) usaram o temporário do sistema, sem a pasta isolada; os scratches delas saem pelo `after()`
do arquivo, e não listei o temporário global para conferir.

**Causa histórica dos `delivery_timeout`/`lock_present` do Windows**: continua desconhecida. Esta correção
fecha o T8-C16 (a tentativa repetida depois do abandono) e o lock tardio, não aquela causa.

Pendentes, com o coordenador:
- o D vermelho (`codex-run.cli`, causa desconhecida, fora deste escopo);
- o Verifier 19 e a formal 12;
- a publicação e a CI nova.

## Retificação do D de `dc0db9b` e consumidor lento do I4-C16c (C46 (q))

**Retificação aditiva da seção anterior** (texto e logs preservados): o D de `dc0db9b` não terminou sozinho.
- O coordenador interrompeu só o processo do `codex-run.cli.test.mjs` (PID 149528, pai 101844, criado às
  17:47:34, sem filhos, 0,30 s de CPU), às 18:21:49, depois de conferir o nome, o pai, a criação, a
  ausência de filhos e a cadeia até o Bash desta sessão, com o stdout no `D-npm-test.log`. O registro
  (`builder-t8c16-terminal/coordinator-D-stall.json`) foi escrito antes do término.
- O `EXIT=1`, o `'test failed'` em `:1:1` e as integrações 593/579/1/13 são efeito desse término. O D está
  **incompleto, interrompido pelo coordenador para diagnóstico**: não é PASS nem prova de defeito do
  produto.
- “Saiu com exit 1”, “a falha é o arquivo inteiro” e “D vermelho”, acima, devem ser lidos assim.
- A/B/C de `dc0db9b` continuam provas daquele HEAD.

**Observação antes do código** (`builder-stdout-eof/pending-probe.test.mjs` e `pending-probe-24.22.1.txt`;
descartável, não é prova). Num arquivo próprio, a lógica anterior do I4-C16c (copiada só ali), com um
filho falso (`EventEmitter`) e um `PassThrough` real, recebeu o EOF antes do `exit`.
- O `exit` saiu aos 76 ms e o processo do arquivo ficou parado até o `timeout 120` terminar o
  `node --test`.
- O relatório foi o do D: `✖ pending-probe.test.mjs (120081 ms)`, `'test failed'` em `:1:1`, sem
  subteste. O runner do Node 24.22.1 não cancela um teste pendente sem handles; o processo fica.
- Nenhum processo da sonda ficou vivo.
- Isso é compatível com o D, mas não demonstra que, naquela execução, o EOF chegou antes do `exit`.

**Harness corrigida** (`68f84c4`, só `tests/integrations/codex-run.cli.test.mjs`). A lógica do consumidor
lento vai para a função privada `readStdoutSlowly(child)`, usada pelo I4-C16c real (mesmo `spawn`, mesmas
3.000 linhas de 200 `z`, 50 ms, status 17, tamanho e Buffer exatos). A função:
- observa o `end` desde o início;
- no `exit`, limpa o intervalo e registra o `data` antes do `resume`;
- resolve `{status, stdout}` quando houver o `exit` e o `end`, em qualquer ordem.

Dois controles `I25-C46 consumidor lento do I4-C16c: …` usam a mesma função com um filho falso
(`EventEmitter`) e um `PassThrough` real. A pendência e a resolução são conferidas depois de voltas de
`setImmediate`. Um `finally` emite o `exit` que faltar (o que limpa o intervalo), destrói o stream e remove
os listeners. A espera do `end` no primeiro controle tem `AbortSignal.timeout(5_000)`, só para a
pré-condição do controle novo; nenhuma espera, prazo ou tolerância existente mudou.

**RED** (`builder-stdout-eof/red-*`, a função com o corpo de `a2ec111` sem mudança —
`red-extraction-check.txt`; a versão usada está em `codex-run.cli.extracted-previous.mjs`, e
`red-vs-commit.diff` mostra que ela difere do commit só no comentário e no corpo da função). Windows
24.22.1, `--test-name-pattern="I4-C16|I25-C46 consumidor lento"`, pasta temporária isolada: 4 testes, 3
pass, 1 fail. EOF antes do `exit`: `AssertionError: o exit depois do EOF resolve`, `false !== true`; o
arquivo terminou normalmente (exit 1), sem travar.

**GREEN** (`green-*`): o alvo deu 4/4; o arquivo inteiro, 11 testes (10 pass, 1 skip, o I4-C15 do POSIX).

**Mutações** (`mutate-eof.mjs`, `mutation-E*.spec.txt`; o arquivo foi restaurado e conferido pelo sha256):
- E2, resolver no `end` sem o `exit`: `pendente sem o exit`;
- E3, resolver no `exit` sem o `end`: `pendente sem o EOF`.

O RED reproduz de forma determinística a lógica anterior na ordem EOF antes do `exit`. Com a observação
descartável, mostra que essa ordem deixa o arquivo parado. **Não** mostra que essa foi a ordem no D de
`dc0db9b`; a causa daquela parada continua não demonstrada.

**Lista dos gates** (`gate-files-68f84c4.txt`): a mesma de `dc0db9b`, 43 arquivos, sha256 `e26c5163…74d9`.
Esperado: 365 testes.

**Gates em `0ae940a`** (código de `68f84c4`; definidos e registrados antes de rodar; uma execução de cada,
sem filtro, concorrência 4 em A/B/C; orçamentos na chamada: 1 h em A, B e C e 2 h no D; logs em
`builder-stdout-eof/`):

| Gate | Ambiente | Início–fim | Testes | Pass | Fail | Skip |
| --- | --- | --- | --- | --- | --- | --- |
| A | checkout principal, Windows, Node 24.22.1, npm 11.19.1, `npm_execpath` ausente | 18:37:27–18:49:17 | 365 | 353 | 0 | 12 |
| B | clone git novo (`core.autocrlf=true` no `.git/config` dele), Node 24.13.0 oficial, npm 11.6.2 ao lado, `npm_execpath` ausente | 18:49:40–18:59:40 | 365 | 353 | 0 | 12 |
| C | WSL `Ubuntu`, uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, `env -i`, `HOME`/`RUNNER_TEMP`/`TMPDIR` no scratch, PATH sem `/usr/bin` | 18:59:57–19:01:13 | 365 | 345 | 0 | 20 |
| D | `npm test` completo, Windows, Node 24.22.1, teto 8, nativos do Hermes | 19:01:27–19:12:10 | 1.054 | 1.034 | 0 | 20 |

- **A/B/C**: a lista `gate-files-68f84c4.txt` (43 arquivos, sha256 `e26c5163…74d9`). No B, ela foi
  recalculada dentro do clone, lendo a lista anterior pelo caminho do checkout principal: mesmo sha256.
- `RUNNER_TEMP` presente e válido. Temporário na pasta criada e registrada pela execução. `git status`
  vazio antes e depois.
- O C extraiu a árvore `4b135e4b…` do `git archive` de `0ae940a`, sem CR.
- Os 359 nomes de topo são iguais em A, B e C: os de `dc0db9b` mais os 2 controles, nenhum ausente. Os
  skips são os de `dc0db9b` em nomes e motivos.
- **D**: exit 0, sem interrupção. Governança 25/25, motor 16/16, doctor 417 (410/0/7), integrações 596
  (583/0/13; 467 s).
  - Passaram as 11 nativas do Hermes com runtime (I4-C18 a C23, C37, C44b, I25-C40 e os dois I23-C8
    com runtime), a observação Hermes do I4-C35 e o I23-C8 pelo Python do sistema.
  - Passaram também o I4-C16c (1.987 ms), o I4-C17, os 2 controles novos, as 8 provas de prazo e os 9
    T8-C16.
  - Os 20 skips são os do D de `cd4afc2`. Depois, nenhum processo `node` do repositório ficou vivo.
- As pastas isoladas foram removidas pelo caminho e `ino` registrados (A 110, B 1.031 e D 128 entradas
  deixadas pelos testes); a do C, pelo caminho, uid e inode; o clone do B, pelo caminho exato.

**O que fica demonstrado e o que não**: o `end` perdido com o EOF antes do `exit` está reproduzido de forma
determinística e corrigido; a observação mostra que, sem a correção, ele deixa o arquivo parado. A ordem
dos eventos no D interrompido de `dc0db9b` não está demonstrada. As causas históricas da CI 93, do I23 e do
T8-C4 continuam desconhecidas.

Pendentes, com o coordenador: o Verifier 19, a formal 12, a publicação, a CI nova e o merge.

## F1 da verificação 19: prova da 3ª linha da árvore no C46 (m)

Novo autor (Claude), handoff do coordenador. O FAIL 19 (`5ee0e0f`, relatório em `67a459b`) e os registros
acima ficam como estão.

**Falha concreta** (R19, F1). O literal do C46 (m) põe o pendente e o `pid` do lock na 3ª linha, com o dono
`processo 3 de 3`. A prova (`evidence.unit.test.mjs:240`, `:246`, `:259`, `:263`) os põe na 1ª e afirma
`processo 1 de 3`. Os gates da R19 passaram (A 365/353/0/12, B 365/353/0/12, C 365/345/0/20, D
1.054/1.034/0/20). É lacuna de prova, não defeito de produto demonstrado.

**Decisão do coordenador**: fortalecer a prova sem trocar o literal. O caso atual fica intacto, como
controle da 1ª linha. Um caso novo cobre a 3ª linha, com valores literais. A retificação documental (3ª →
1ª) foi abandonada: com o `pid` na 1ª, uma montagem que desse sempre `processo 1 de n` passaria.

**Fronteira**: só `tests/integrations/traces/evidence.unit.test.mjs`. Leitura estimada de ~35k tokens, mais
~25k para os gates. Registro, provas e gates: Handoff do checklist, bloco “Prova da 3ª linha do C46 (m)”.

**Proveniência de dois auxiliares do autor anterior** (`coordinator-r19-observations.json`; registro aditivo):
- Depois do D de `0ae940a`, a comparação dos skips gravou `/tmp/d4.skips` e `/tmp/d-old.skips` pelo Git Bash.
  Lá, `/tmp` é o temporário do usuário Windows (`AppData/Local/Temp`).
- O conteúdo, pelo comando, são nomes de testes e motivos de skip.
- Não houve inventário anterior nem criação exclusiva desses dois nomes. Não é possível provar que eram novos
  nem que nenhum conteúdo anterior foi substituído. Não há evidência concreta de arquivo alheio sobrescrito.
- São auxiliares pós-gate, distintos das raízes de cada gate, que foram conferidas e removidas por caminho e
  `ino`. Não são o `/tmp` do WSL nem o perfil, e a auditoria metadata-only do perfil, feita pelo root, não os
  cobre.
- Não foram lidos, limpos nem restaurados, nem o temporário global.
- A frase “Nada do perfil WSL nem do `/tmp` global foi lido”, na seção do T8-C16 acima, vale para a leitura nos
  gates e para o `/tmp` do WSL. Não diz nada sobre esses dois auxiliares.
- Ficam como estão a limpeza de 1.257 pastas no Windows e 107 no WSL (por prefixo, tipo, dono e janela, sem
  prova de proveniência) e o incidente da R5 (`ffc5937`).

**Prova** (`2473632`, só `tests/integrations/traces/evidence.unit.test.mjs`, +34/−0). O caso novo `I25-C46 evidência
comum: com o pendente e o pid do lock na 3ª das 3 linhas…` fica depois do caso da 1ª linha, que não muda. Ele usa
`treeLine` e `storeWithLock` do arquivo e o contrato público dos apoios. O registro tem as linhas 1001, 2002 e 3003
(com o pendente `open lock` de 640 ms), o lock tem o `pid` 3003, e o arquivo do teste é compartilhado, com 2 linhas.
Os esperados são literais: cabeçalhos `processo 1/2/3 de 3` e `tempos` uma vez cada, em ordem; o pendente só no
`processo 3 de 3`; `pendentes na saída: nenhuma` nos processos 1 e 2; `; 2 linhas da pré-carga`; `lock presente, de
produtor 1 wrapper codex, processo 3 de 3`; nada da raiz, dos arquivos de tempos nem do nonce.

**GREEN** (`builder-r19-proof-fix/green-2473632.*`, Windows 24.22.1, pasta isolada): 9 testes, 9 pass.

**Prova discriminante** (cópia própria do `git archive` de `2473632`, `copy-*`, `mutation.txt`):
- sem mutação: 9/9;
- com o único mutante do apoio (`processo ${k + 1} de` → `processo 1 de` no rótulo do dono do lock): 8 pass e 1
  fail. O caso da 1ª linha passou. O novo falhou em `:297`, a asserção de `processo 3 de 3`, com a mensagem `…
  processo 1 de 3`.

A cópia foi removida pelo caminho exato. O checkout não foi mutado. Não há RED do produto.

**Raiz deixada por um erro do meu script** (`green-pre-commit`): a remoção rodou com o `TEMP` do gate, e a guarda
recusou. A raiz foi removida em seguida pelo registro (caminho, nome, pasta não link, `ino`; 0 entradas), e o script
foi corrigido.

**Identidade** (`blob-identity.txt`): em `5ee0e0f..2473632`, fora de `.checks`/`.tasks`, só o arquivo de teste mudou.
`src`, apoios, fixtures, `scripts`, `.github`, `docs`, configuração e `package*` têm a mesma árvore, e 42 dos 43
arquivos da lista do R19 têm o mesmo blob.

**Gates** (`plan.txt`, definidos antes de rodar):
- A/B/C: só `evidence.unit.test.mjs`, inteiro, uma invocação por ambiente, concorrência 4, orçamento de 1 h cada.
  Os outros 42 são carry explícito do Verifier 19.
- D: um `npm test` completo, com orçamento de 2 h.

**Gates em `8dee56d`** (árvore `53b79730…`, código de `2473632`; uma execução de cada, sem filtro; logs em
`builder-r19-proof-fix/`):

| Gate | Ambiente | Início–fim | Testes | Pass | Fail | Skip |
| --- | --- | --- | --- | --- | --- | --- |
| A | checkout principal, Windows, Node 24.22.1, npm 11.19.1, `npm_execpath` ausente | 20:08:40–20:08:47 | 9 | 9 | 0 | 0 |
| B | clone git novo (`core.autocrlf=true` no `.git/config` dele), Node 24.13.0 oficial (`d14ba95c…`, zip conferido), npm 11.6.2 ao lado, `npm_execpath` ausente | 20:09:15–20:09:21 | 9 | 9 | 0 | 0 |
| C | WSL `Ubuntu`, uid 1000, `git archive` de `8dee56d` (árvore = `HEAD^{tree}`, 0 CR), Node 24.13.0 copiado num prefixo sem `sh`, `env -i`, `HOME`/`RUNNER_TEMP`/`TMPDIR` no scratch, PATH sem `/usr/bin` e sem agentes | 20:09:40 | 9 | 9 | 0 | 0 |
| D | `npm test` completo, Windows, Node 24.22.1, teto 8, nativos do Hermes | 20:10:06–20:20:40 | 1.055 | 1.035 | 0 | 20 |

- **A/B/C**: lista `gate-files-2473632.txt` (sha256 `7d64e892…e83b`). `RUNNER_TEMP` presente e válido; temporário na
  raiz criada e registrada pela execução; status vazio antes e depois. Os 9 nomes são iguais nos três
  (`matrix-ABC.txt`).
- **Limite do B**: a conferência de CR do bin depois da execução falhou no meu script (Python do Windows com
  caminho MSYS) e não foi feita. Antes, o bin tinha 0 CR, e o status do clone ficou vazio depois.
- **D**: exit 0, sem interrupção. Governança 25/25, motor 16/16, doctor 417 (410/0/7), integrações 597 (584/0/13).
  - Passaram os 11 nativos do Hermes com runtime, o ramo Hermes do I4-C35 e o I23-C8 pelo Python do sistema.
  - Passaram também os dois casos de (m), os 28 `I25-C46`, os 9 `T8-C16`, o I4-C16c e o I4-C17.
  - Os 20 skips são os da R19 em nomes e motivos (`D-vs-R19.txt`).
  - Nenhum processo `node` do repositório ficou vivo.
- **Limpeza**: as raízes foram removidas pelo registro (A 1, B 20 e D 128 entradas dos testes); a do C, por
  caminho, uid e inode; o clone do B, pelo caminho exato; a cópia da prova discriminante, pelo caminho exato.
  Nenhum auxiliar foi para o `/tmp` nem para o temporário global.

**O que fica demonstrado e o que não**:
- o C46 (m) está provado como escrito, e o mutante “sempre `processo 1 de n`” é recusado só pelo caso novo;
- os A/B/C dos outros 42 arquivos e os skips POSIX do D (que rodaram no C da R19) são carry explícito do Verifier
  19, com os mesmos blobs; não rodaram nesta continuação;
- não há defeito de produto demonstrado, e as causas históricas continuam desconhecidas.

Pendentes, com o coordenador: a verificação 20, a formal 12, a publicação, a CI e o merge. O FAIL 19 fica.

## CI de `86c7677` (PR 40790722204 e manual 40790906319): ambiente do passo de integrações no Windows (C48)

Novo autor (Claude), handoff do coordenador. O PASS 20, a formal 12 `ready` e os registros acima ficam como estão.

**Evidência**. O PR 40790722204 passou nos cinco checks (Windows 1.055/1.024/0/31). A execução manual 40790906319
falhou só no Windows e no agregado, no passo de integrações (597/570/3/24): `control.cli.test.mjs:547` e `:906`
(I23-C4) e `concurrency.cli.test.mjs:1008` (controle positivo do C46, `delivery_timeout`, sem produtor
registrado). Em `:547`, um `writeExclusive segmento.tmp` pendente há 310 ms depois de 424 ms de operações
concluídas, com o lock presente; em `:906`, `open lock` pendente há 651 ms, laço de eventos 25,6 ms, CPU 15 ms e
lock de 0 byte. A medição do mesmo job deu 4.500/4.500 ciclos, sem erro, e tomada p99 de 6,491 ms (A1), 1,629 ms
(B, `RUNNER_TEMP`) e 6,374 ms (A2). Ela mede o componente de E/S, não o pipeline, e não dá causa. Nenhuma causa
física foi demonstrada.

**Decisão do coordenador** (6484289722): `RUNNER_TEMP` como `TEMP`/`TMP` só no passo de integrações da matriz
Windows. Forma literal e alternativas: linhas “Ambiente do passo de integrações no Windows” e “Exceção ao C48
(passo de integrações)” do Landing; provas: acréscimo do C48.

**Fronteira**: só `.github/workflows/governance.yml` e `scripts/governance-ci.test.mjs`. Leitura estimada de ~65k
tokens, mais ~30k para provas e gates. Registro, sondagem, provas e gates: Handoff do checklist, bloco “Ambiente do
passo de integrações no Windows”.

**Sondagem do pwsh antes do código** (`builder-ci86-temp/explore/`): na forma do runner (`pwsh -command ". '{0}'"`),
o `$LASTEXITCODE` 17 do npm chega ao script, mas o processo sai 1; sem `exit $LASTEXITCODE`, sai 0. Com `-File`, 17.
Ausente, vazio, relativo, inexistente e arquivo saíram 1 sem chamar o npm.

**Código** (`169e845`; registro em `c7e8f14`): o workflow (+17/−1) e `governance-ci.test.mjs` (+205/−1). O passo
antigo ganhou `if: matrix.os != 'windows-latest'`; o ramo `if: matrix.os == 'windows-latest'` valida o `RUNNER_TEMP`
(`IsPathFullyQualified` e `Test-Path -PathType Container`, `throw` sem fallback), põe `TEMP`/`TMP` nele, chama `npm run
test:integrations` e termina com `exit $LASTEXITCODE`. `governance-C1 C3` mantém a lista dos cinco comandos, sem o ramo
do Windows; os dois `governance-C48` são novos.

**RED** (workflow de `86c7677` no checkout, prova nova sem commit): 9 testes, 7 pass, 2 fail — os dois
`governance-C48`. **GREEN**: 9/9 antes do commit; no commit, o Proof do C48 3/3 com o pwsh oficial 7.6.9; `I4-C47` 1/1.

**Prova discriminante** (cópia do `git archive` de `169e845`; detalhes e tabela no Handoff do checklist): controle 9/9;
o teste de `86c7677` contra o workflow novo falha no `governance-C1 C3` antigo; os 13 mutantes (roteamento,
propagação, configuração, persistência, argumentos, ambiente, orçamento e shell) são recusados, M3–M6 só pelo pwsh real
e M10–M13 só pela estrutura. A cópia foi restaurada e removida pelo caminho exato; o checkout não foi mutado.

**Identidade** (`blob-identity.txt`): fora de `.checks`/`.tasks`, só os dois arquivos; `src`, `tests`, `docs`, o core,
`ci-lock-latency.*` (C49/C50), `test-integrations.mjs`, `package*` e a configuração iguais a `86c7677`.

**Incidente de rede, meu**: uma chamada de versão do `pwsh` do runtime do Codex (7.6.5), antes da sondagem, rodou sem
`POWERSHELL_TELEMETRY_OPTOUT`; pode ter enviado a telemetria de início do PowerShell. Não verificado; nenhum conteúdo do
repositório foi passado. As demais chamadas usaram o pwsh oficial com telemetria e checagem de versão desligadas.

**Gates** (`plan.txt`, definidos depois de `169e845` e antes de rodar): A/B/C com `npm run test:governance` completo,
uma invocação sem filtro por ambiente, 10 min cada (esperado 27/27/0/0 em A e B, 27/26/0/1 em C); D com um `npm test`
completo, 2 h (esperado 1.057 testes se nada falhar).

**Gates em `a50870f`** (árvore `27d9e5c1…`, código de `169e845`; uma execução de cada, sem filtro; logs em
`builder-ci86-temp/`):

| Gate | Ambiente | Início–fim | Testes | Pass | Fail | Skip |
| --- | --- | --- | --- | --- | --- | --- |
| A | checkout principal, Windows, Node 24.22.1, npm 11.19.1, `npm_execpath` ausente, pwsh oficial 7.6.9 | 21:49:20–21:49:28 | 27 | 27 | 0 | 0 |
| B | clone git novo (`core.autocrlf=true` no `.git/config` dele; workflow em CRLF), Node 24.13.0 oficial (`d14ba95c…`, zip conferido), npm 11.6.2 ao lado, `npm_execpath` ausente | 21:50:02–21:50:38 | 27 | 27 | 0 | 0 |
| C | WSL `Ubuntu`, uid 1000, `git archive` de `a50870f` (árvore = `HEAD^{tree}`, 0 CR), Node 24.13.0 copiado num prefixo sem `sh`, `env -i` com `HOME`/`RUNNER_TEMP`/`TMPDIR` no scratch e `npm_config_update_notifier=false`, PATH sem `/usr/bin`, sem agentes e sem `pwsh` | 21:51:55–21:51:59 | 27 | 26 | 0 | 1 |
| D | `npm test` completo, Windows, Node 24.22.1, teto 8, nativos do Hermes | 21:52:58–22:01:28 | 1.057 | 1.037 | 0 | 20 |

- **A/B/C**: alvo `npm run test:governance` completo. `RUNNER_TEMP` presente e válido; temporário na raiz criada e
  registrada pela execução; status vazio antes e depois. Os 27 nomes são iguais nos três (`matrix-ABC.txt`). O caso
  do pwsh real executou em A e B (`✔` e `ℹ pwsh: C:\Program Files\PowerShell\7\pwsh.exe`) e é o único skip do C, com
  o motivo.
- **D**: exit 0, sem interrupção. Governança 27/27, motor 16/16, doctor 417 (410/0/7), integrações 597 (584/0/13).
  Contra o D da R20, só as duas linhas novas do `governance-C48` (`D-vs-R20.txt`); os 20 skips são os mesmos. Os 11
  nativos do Hermes, o ramo Hermes do I4-C35 e o I23-C8 pelo Python do sistema passaram. Nenhum processo do
  repositório ficou vivo.
- **Limpeza**: as raízes pelo registro; a do C por caminho, uid e inode; o clone do B e a cópia dos mutantes pelo
  caminho exato. Nenhum auxiliar no `/tmp` nem no temporário global.
- **Limites**: o npm de A, B e D usou o cache do usuário, que não li (o aviso de versão do npm só consulta o registro
  com o carimbo vencido); o pwsh pode atualizar os próprios caches no `LocalAppData`; o incidente de telemetria acima.

**O que fica demonstrado e o que não**: o ramo do Windows faz o que o Landing fixa, no pwsh real e na forma do runner,
e os mutantes são recusados; o passo no runner, a causa das falhas da CI de `86c7677` e o efeito da troca do
temporário nelas **não** estão demonstrados. Pendentes, com o coordenador: verificação 21, formal 13, publicação, CI
do novo HEAD e merge.

### Revisão do coordenador: literal do caminho no `-Command` da prova nativa do C48

Mesmo autor, sobre `c68a392`. A revisão (`coordinator-ci-temp-path-review.md`) aponta que `. '${script}'` não escapa
a aspa simples do caminho. Decisões do coordenador: manter o shell padrão, o `-Command` e o 17 → 1 (“não zero
continua falha”). Só `scripts/governance-ci.test.mjs` muda.

**Sondagem** (`path-fix/explore/`): sem escape, `passo ' literal.ps1` sai 1 e o script não roda; com a aspa dobrada,
roda. `‘`, `’`, `‚` e `‛` (U+2018 a U+201B), que o PowerShell lê como aspa simples, também quebram e só funcionam com
todas as cinco dobradas. Forma: `. '${file.replace(/['‘’‚‛]/g, "$&$&")}'`, `step` com o arquivo
como 3º parâmetro (padrão `passo.ps1`) e dois arquivos próprios com o mesmo `run`, `passo ' literal.ps1` e
`passo ‘’‚‛ literal.ps1`, cada um com npm 0 → 0 e npm 17 → 1 (Landing “Literal do caminho no `-Command` da prova
nativa do C48”; 2º acréscimo do C48). RED, GREEN, mutantes e gates novos ficam abaixo, quando rodarem.

**Código** (`0caf9be`; registro em `0ae77b3`): só `governance-ci.test.mjs` (`971e866` → `5313dba`, +29/−4). No
código, as quatro aspas tipográficas estão como escapes Unicode do JavaScript (o mesmo conjunto do Landing).

**RED** (prova com os controles e sem o escape, sem commit; `path-fix/pf-red.*`, `red.patch`): 9 testes, 8 pass,
1 fail — o do pwsh real, em `:560`, no rótulo `passo ' literal.ps1`, com `{status: 1, npm: null}`. Antes dele, os
casos com `passo.ps1` (0, 17 e os cinco inválidos) passaram. **GREEN**: 9/9 antes do commit; Proof do C48 3/3 no
commit.

**Mutantes** (cópia do `git archive` de `0caf9be`): controle 9/9; sem escape, falha o controle `passo ' literal.ps1`;
só a ASCII dobrada, ele passa e falha o `passo ‘’‚‛ literal.ps1`. Nos dois, o pwsh sai 1 e o npm não roda. Cópia
restaurada e removida pelo caminho exato.

**Gates** (`path-fix/plan.txt`, depois de `0caf9be` e antes de rodar): `pf-A`/`pf-B`/`pf-C` com `npm run
test:governance` completo (esperado 27/27/0/0, 27/27/0/0 e 27/26/0/1), 10 min cada; `pf-D` com um `npm test` completo,
2 h (esperado 1.057/1.037/0/20).

**Gates em `9b087dc`** (árvore `b894f255…`, código de `0caf9be`; uma execução de cada, sem filtro; logs em
`builder-ci86-temp/path-fix/`):

| Gate | Ambiente | Início–fim | Testes | Pass | Fail | Skip |
| --- | --- | --- | --- | --- | --- | --- |
| pf-A | checkout principal, Windows, Node 24.22.1, npm 11.19.1, `npm_execpath` ausente, pwsh oficial 7.6.9 | 22:16:24–22:17:07 | 27 | 27 | 0 | 0 |
| pf-B | clone git novo (`core.autocrlf=true` no `.git/config` dele; workflow e teste em CRLF), Node 24.13.0 oficial (`d14ba95c…`, zip conferido), npm 11.6.2 ao lado, `npm_execpath` ausente | 22:17:43–22:18:22 | 27 | 27 | 0 | 0 |
| pf-C | WSL `Ubuntu`, uid 1000, `git archive` de `9b087dc` (árvore = `HEAD^{tree}`, 0 CR), Node 24.13.0 copiado num prefixo sem `sh`, `env -i` com `HOME`/`RUNNER_TEMP`/`TMPDIR` no scratch e `npm_config_update_notifier=false`, PATH sem `/usr/bin`, sem agentes e sem `pwsh` | 22:18:35–22:18:39 | 27 | 26 | 0 | 1 |
| pf-D | `npm test` completo, Windows, Node 24.22.1, teto 8, nativos do Hermes | 22:19:02–22:32:26 | 1.057 | 1.037 | 0 | 20 |

- **pf-A/pf-B/pf-C**: os 27 nomes iguais nos três e aos de `a50870f` (`matrix-pf-ABC.txt`); o caso do pwsh real, agora
  com os controles com aspa, executou em pf-A e pf-B e é o único skip do pf-C, com o motivo.
- **pf-D**: exit 0, sem interrupção; as 1.057 linhas de resultado são as do D de `a50870f` (`pf-D-vs-a50870f.txt`),
  com os 20 skips e os 11 nativos do Hermes. Nenhum processo do repositório ficou vivo.
- **Durações**: pf-A 43 s (8 s em `a50870f`) e pf-D 13 min 24 s (8 min 30 s); a lentidão atinge todos os testes que
  criam processos, inclusive os inalterados. Causa não demonstrada; nenhuma asserção depende de duração.
- **Limpeza**: raízes pelo registro; a do pf-C por caminho, uid e inode; o clone e a cópia dos mutantes pelo caminho
  exato. Nenhum auxiliar no `/tmp` nem no temporário global.

**O que fica demonstrado e o que não**: a prova nativa aceita caminhos próprios com aspas e falha sem o escape; os
casos anteriores, o workflow e o produto não mudaram. O passo no runner e a causa das falhas da CI de `86c7677`
**não** estão demonstrados. Pendentes, com o coordenador: verificação 21, formal 13, publicação, CI, medição e merge.

## T8-C20 do D da verificação 21: diagnóstico do arquivo de diagnóstico ausente (C46 (r))

Novo autor Claude, fatia nova (registro de abertura `648458f`; Landing, C46 (r), Swept e task `22c1161`;
retificação do (r) `fce5c59`; código `cad647a`). Origem: o D da verificação 21 em `5a0f231` (relatório `3a15d79`)
terminou sozinho com 1.057/1.036/1/20; só o `T8-C20 … o exemplo é o que um hook com lock ocupado grava` falhou, com o
hook em `[0, "", ""]` e `ENOENT` ao ler `diagnóstico de entrega.ndjson` (`docs.test.mjs:179`), sem tempos no log.
Autorizações 6467154706 e 6442514838. Logs e scripts desta fatia em `.checks/code-review/issue-25/builder-r21-t8c20/`.

### Diagnóstico (sem tocar em rastreados)

**Leitura**: o hook lê o evento, entrega com `untilDeadline` até 650 ms (`ATTEMPT_MS`) disputando o `.lock` alheio a
cada 10 ms e, no `flush`, chama `publish` com o prazo do relatório (1.000 ms do `flush`). `appendDeliveryReport`
corre `realpath` da pasta, `lstat`, `open`, `stat`, `write` e `close` contra esse prazo e engole qualquer erro; o CLI
sai com `process.exit(0)`, que encerra uma gravação ainda em curso. Isso é o contrato da #8 (C16:
“dentro do prazo do relatório do processo … se o arquivo não puder ser gravado, o diagnóstico se perde”).

**Sonda** (`probe.mjs`, fora do repositório; cenário exato do T8-C20 com a pré-carga de tempos existente; Windows,
Node 24.22.1, temporário isolado `sm-r21t-probe1-*`, sem outra carga; `probe1.ndjson`):

| Classe | Execuções | Resultado visível | O que a linha da pré-carga mostra |
| --- | --- | --- | --- |
| sem falha | 20 | `[0, "", ""]`, a linha do guia | `open` do arquivo termina 651–665 ms depois da 1ª operação; saída logo depois; margem ~335–349 ms até o prazo |
| `open` do arquivo parado (`fault-preload.mjs`) | 2 | `[0, "", ""]`, `ENOENT` | `open` pendente há ~358 ms; saída ~1.016 ms depois da 1ª operação |
| `open` com EIO | 2 | `[0, "", ""]`, `ENOENT` | `open … EIO`; saída ~660 ms |
| `realpath` da pasta parado | 2 | `[0, "", ""]`, `ENOENT` | `realpath` pendente; saída ~1.015 ms |
| laço parado 1 s (`BLOCK_LOOP=2\|1000`, knob existente) | 5 | 3 `ENOENT`, 1 arquivo sem a linha, 1 a linha | laço máximo ~1.001 ms; corrida do timer de 1 ms contra três operações |

Quatro classes compatíveis com o contrato dão o mesmo sintoma da R21, e só a linha da pré-carga as separa. **A causa
da R21 continua desconhecida**: nenhuma reprodução é a falha histórica, e nenhuma classe foi atribuída. **Defeito
demonstrado**: de observação — o T8-C20 não registrava o hook, e a falha trazia só o `ENOENT` com o caminho.
**Produto**: nenhum defeito demonstrado; nada nele mudou.

### Correção (só a prova e a pré-carga de provas)

- `tests/integrations/traces/docs.test.mjs` (`d52de03` → `852616a`): `recordProducersInEachTest()` no topo; o trecho
  “Seguindo o guia” virou `followGuide(failures, extra = {})`, com as mesmas linhas, literais e mensagens, e o hook
  entra no registro por `recordedProducer("hook claude", env)` + `settle`, com o mesmo `runIntegrations` e a mesma
  entrada; dois controles `I25-C46 diagnóstico do T8-C20: …`.
- `tests/integrations/helpers/traces-probe.mjs` (`a6440dd` → `292c319`): tipo `diagnóstico` para o caminho exato de
  `SKILL_ME_CAPTURE_REPORT`; knobs `SKILL_ME_TEST_TRACES_STALL_REPORT=1` e `SKILL_ME_TEST_TRACES_REPORT_EIO=1`, inertes
  sem a variável.
- **Retificação durante o build** (antes do commit do código; `fce5c59`, aditiva): o GREEN antes do commit
  (`green-pre2.log`) mostrou `pendentes na saída: stat store.json (fora do lock) há 0 ms` no controle de E/S — a
  tentativa da entrega abandonada no prazo continua em segundo plano. Os controles conferem só o diagnóstico nas
  listas de pendentes e de falhas; o literal `pendentes na saída: nenhuma` do (r) não é garantido. Uma 1ª versão do
  controle do prazo também falhou (`green-pre.log`) porque a minha asserção tratava o `lstat diagnóstico ENOENT` da
  “última concluída” como falha; passou a ler só a lista `falhas`.

### RED, GREEN e prova discriminante

- **RED** (`red2-run.txt`; cópia do `git archive` de `22c1161`, antes do código, com a pré-carga própria injetada
  só no ambiente do hook do T8-C20 atual): `open` parado e `open` com EIO falham os dois na mesma leitura com a mesma
  mensagem — `ENOENT: no such file or directory, open '<caminho>'` — e nada mais. Uma 1ª tentativa parou no `tar`
  do meu script, antes de qualquer teste (`red-attempt1-cleanup.txt`).
- **GREEN** antes do commit: `green-pre3.log`, 4/4 (os 2 T8-C20 e os 2 controles).
- **Mutantes** (`mutants.mjs`, `mutation2-cad647a.json`/`-outputs.txt`; cópia do `git archive` de `cad647a` com o
  `node_modules` do checkout, restaurada a cada variante e removida pelo caminho exato, `mutation2-cad647a-cleanup.txt`;
  a 1ª tentativa parou numa âncora com LF numa cópia CRLF, sem resultado, `mutation-attempt1-cleanup.txt`):

| Variante | T8-C20 | Controle do prazo | Controle da E/S |
| --- | --- | --- | --- |
| controle (sem mudança) | ✔ ✔ | ✔ | ✔ |
| M1 hook fora do registro | ✔ ✔ | ✖ | ✖ |
| M2 sem o tipo `diagnóstico` | ✔ ✔ | ✖ | ✖ |
| M3 knobs trocados | ✔ ✔ | ✖ | ✖ |
| A1 `open` parado no próprio T8-C20, com a adoção | ✖, com a evidência e `open diagnóstico (fora do lock) há 357 ms` | ✔ | ✔ |
| A2 o mesmo, sem `recordProducersInEachTest()` | ✖, só o `ENOENT` | ✔ | ✔ |
| A3 `open` com EIO no próprio T8-C20, com a adoção | ✖, com a evidência e `open diagnóstico EIO (fora do lock)` | ✔ | ✔ |
| A4 o mesmo, sem a adoção | ✖, só o `ENOENT` | ✔ | ✔ |

Na A1, a falha do T8-C20 sai como a R21 deveria ter saído: `produtor 1 hook claude: status 0, sinal nenhum; entrega
sem relatório`, `lock ocupado (EEXIST, repetido) 41x`, `pendentes na saída: open diagnóstico (fora do lock) há 357
ms`, `saída aos 1083.5 ms (1008 ms depois da 1ª operação)`, laço máximo 16,2 ms, e `raiz 1 (produtores 1): lock
presente, ilegível [SyntaxError; 12 bytes]; capturas indisponível [lock_present]; …`.

### Gates (`builder-r21-t8c20/plan.txt`, depois de `cad647a` e antes de rodar)

A/B/C: os 11 arquivos que carregam a pré-carga, inteiros, numa invocação `node --test --test-concurrency=4` por
ambiente, 30 min cada (A Windows 24.22.1 no checkout; B clone novo, Node 24.13.0 oficial, npm 11.6.2,
`core.autocrlf=true` só no clone; C WSL uid 1000, `git archive`, Node 24.13.0 copiado, `env -i`, PATH sem `/usr/bin`
nem agentes). A governança não mudou e carrega os A/B/C da R21 por identidade. D: um `npm test` completo, Windows
24.22.1, teto 8, Hermes, 2 h; esperado, se nada falhar, 1.059/1.039/0/20.

### Limites

- Nada aqui prova a causa da R21 nem que o T8-C20 deixa de falhar: a prova positiva continua dependendo do melhor
  esforço do diagnóstico dentro do prazo. Se uma falha futura mostrar, com a evidência, a gravação parada até o prazo
  sob carga, resolver exigiria renegociar prazo, carga ou asserção — decisão do coordenador e do proprietário.
- A sonda e os mutantes são deste computador, sem a carga da suíte; não medem o runner da CI.

### Resultado dos gates em `407edc5` (árvore `6966ff2c…`; código de `cad647a`; uma execução de cada, sem filtro e sem repetição; logs em `builder-r21-t8c20/`)

| Gate | Ambiente | Início–fim | Testes | Pass | Fail | Skip |
| --- | --- | --- | --- | --- | --- | --- |
| A | checkout principal, Windows, Node 24.22.1, npm 11.19.1, `npm_execpath` ausente | 23:35:00–23:38:07 | 116 | 110 | 0 | 6 |
| B | clone git novo (`core.autocrlf=true` no `.git/config` dele; `docs.test` e a pré-carga em CRLF), Node 24.13.0 oficial (`d14ba95c…`, zip `ca274269…` conferido), npm 11.6.2 adjacente, `npm_execpath` ausente | 23:38:36–23:40:49 | 116 | 109 | **1** | 6 |
| C | WSL `Ubuntu`, uid 1000, `git archive` de `407edc5` (árvore = `HEAD^{tree}`, 0 CR, `cli.mjs` 755), Node 24.13.0 copiado (`150946e4…`) num prefixo sem `sh`, npm 11.6.2, `env -i`, PATH sem `/usr/bin` e sem agentes | 23:42:44–23:43:46 | 116 | 112 | 0 | 4 |
| D | `npm test` completo, Windows, Node 24.22.1, teto 8, Hermes pelas provas versionadas | 23:44:07–23:56:51 | 1.059 | 1.039 | 0 | 20 |

- **A/B/C**: os 4 do `docs.test` (os 2 T8-C20 e os 2 controles) rodaram e passaram nos três. Skips: em A e B, os 6
  POSIX (I25-C5, C6, C33, C42, C45 e o sinal do T8-C4), com o motivo; em C, os 4 só do Windows (I25-C4, C5, C42 e o
  controle do C45), com o motivo.
- **B, a falha** (preservada, sem repetição; `B.log`, `B-failure.txt`): `I25-C46 diagnóstico do T8-C15: confirmação
  perdida depois do commit …` (`concurrency.cli.test.mjs:321`, asserção em `:283`). O produtor **a**, sem nenhuma
  injeção, saiu `io_failure` 40/39/39/1 com `falhas open lock EPERM (tomada do lock)` e `lock ocupado (EEXIST,
  repetido) 16x`; o **b** (injeção `LOST_CONFIRMATION=2`) saiu como o controle espera. A prova confere `a` primeiro,
  então o controle, que espera a falha de `b`, ficou vermelho. O store classifica a criação exclusiva do `.lock` com
  EPERM como `io_failure`, sem nova tentativa (contrato: só EEXIST é repetido). **Causa do EPERM: não demonstrada**;
  nada aqui a atribui a antivírus, disco, indexador ou hardware. **Relação com esta fatia: nenhuma demonstrável** — os
  produtores desse teste recebem `boundEnv(root, id, {...timedEnv(timing), ...injected})`, sem
  `SKILL_ME_CAPTURE_REPORT` e sem os knobs novos, então a pré-carga de `292c319` tem nele o mesmo efeito da de
  `a6440dd`; o mesmo arquivo passou inteiro em A e nos D da R20, da R21, do pf-D e no D abaixo. É a 1ª ocorrência de
  `EPERM (tomada do lock)` nos logs de `.checks/code-review/issue-25/`; as falhas antigas do T8-C15 não tinham errno.
  Tratar EPERM na criação do lock como disputa mudaria a política de retry (AC7: sem retry novo): não corrigido, fica
  para decisão do coordenador e do proprietário.
- **C**: archive `b4ac4051…` (6.512.640 bytes), commit conferido pelo `get-tar-commit-id`; HOME do scratch vazio
  depois; `RUNNER_TEMP` com 0 entradas; scratch `/tmp/sm-r21t-C.jfNi6w` removido por caminho, pasta não link, uid
  1000 e inode 1974.
- **D**: terminou sozinho com exit 0. Governança 27/27/0/0, motor 16/16/0/0, doctor 417/410/0/7, integrações
  599/586/0/13. Contra o pf-D de `be29203` (`names-pfD.txt`, `names-D.txt`): as mesmas linhas de resultado, com as
  mesmas marcas e os 20 skips, mais os 2 controles novos `✔`. O `T8-C20 … grava` passou (2.109,6 ms); os controles,
  3.333,6 e 2.869,2 ms. Hermes (`D-hermes.txt`): os 11 nativos com runtime passaram, o I4-C35 passou sem o
  diagnóstico de observação Hermes não executada, e o I23-C8 pelo Python do sistema, que não conta como nativo, passou.
  O hook medido do C16 levou 693 ms do fim do stdin à saída. HEAD e status iguais antes e depois; `RUNNER_TEMP` com 0
  entradas; raiz `sm-r21t-D-tvFHuF` (128 entradas dos testes) removida pelo registro.
- **Processos e temporários**: nenhum `node`, `python`, `pwsh` ou `cmd` com o repositório ou `sm-r21t-` na linha de
  comando ficou vivo (`processes-after-D.txt`; a 1ª contagem achou só o próprio `pwsh` da consulta,
  `processes-after-D-1st.txt`, e o script passou a excluí-lo). Todas as raízes `sm-r21t-*` (sonda, RED, GREEN,
  mutantes, A, B, D) foram removidas pelo registro, e as pastas `runner-temp-*` vazias por `rmdir`; o clone B pelo
  caminho exato depois de conferir toplevel, HEAD e status (`B-clone-cleanup.txt`). Nenhuma seleção por prefixo ou
  mtime; nenhum auxiliar no `/tmp` fora do scratch do C nem no temporário global. Uma 1ª consulta de processos com
  WQL mal citado saiu inválida e não foi usada.
- **O que isso prova e o que não prova**: o T8-C20 e os controles passam nos três ambientes e no D, e a evidência
  distingue o prazo da falha de E/S. Não prova a causa da R21 nem que o T8-C20 não volte a falhar; o D é deste
  computador e não mede o runner da CI. A fatia **não** fecha inteira verde: o gate B tem a falha acima, não
  atribuível a esta mudança e fora do escopo dela.

## Ciclo de vida do `follow` no T8-C19 (CI de `066bd98`; C46 (s))

Novo autor Claude, fatia nova (abertura `46f949d`; Landing, C46 (s), Swept e task `b90abdd`; retificação aditiva do
(s) `1b7b561`; código `19a5a5c`). Origem: na CI do HEAD publicado `066bd98`, o PR 40814315171 falhou só no I23-C6
Claude e a manual 40814471097 teve o Windows cancelado no teto de 20 min, sem totais das integrações, com 39 rótulos
não impressos a partir do `T8-C19 trace walkthrough`. Autorizações 6467154706 e 6442514838. Scripts, logs e saídas
em `.checks/code-review/issue-25/builder-ci066-follow/`.

### Diagnóstico (sem tocar em rastreados)

**Sonda** (`run-probe.mjs`, `instrument.mjs`, `instrument-eio.mjs`; cópia `git archive` de `46f949d` com o T8-C19
instrumentado só na cópia: eventos do processo do arquivo e do follow, falha injetada por variável e um vigia sem
referência de 20 s que só age se o processo do arquivo continuar vivo; uma raiz temporária própria por execução,
registrada e removida pelo registro; Windows, Node 24.22.1; `summary.ndjson`, `*.events.ndjson`, `*.out.ndjson`):

| Variante | Execuções | O que se viu |
| --- | --- | --- |
| sem injeção | 1 | follow sai 0 com as 6 linhas antes do `after`; o processo do arquivo sai logo depois |
| asserção falha logo depois do spawn | 3 | a falha original; follow vivo no início do `after`; sai 3 depois de o `after` apagar a pasta |
| asserção do passo do hook falha (`persisted` 2 em vez de 1) | 3 | idem |
| `SEGMENT_EIO=1` só no hook (injeção existente) | 3 | a falha original `0 !== 1`; idem |
| asserção falha depois dos cinco registros | 3 + 20 | idem; em 1 de 20 o `rmSync` do `after` falhou com `ENOTEMPTY` (2ª falha atribuída ao arquivo, 4 entradas deixadas no temporário), e o follow saiu 3 mesmo assim |
| limpeza desligada só na cópia (sintética), com um 2º arquivo rápido | 2 | o processo do arquivo ficou vivo até o vigia encerrar o follow aos 20 s; o `✖` do T8-C19 saiu na hora, e o `✔` do 2º arquivo (terminado em menos de 1 s) só depois disso |

Nas 32 falhas naturais, o follow estava vivo no início do `after` em 32 e saiu 3 entre 1 e 223 ms depois do fim do
`rmSync`; nenhuma prendeu o processo do arquivo (maior duração 1.937 ms). Um reporter próprio (`events-reporter.mjs`)
mostrou que `test:dequeue` e `test:complete` chegam em tempo real, enquanto os `test:pass`/`test:fail` do arquivo
seguinte ficam retidos até o processo do anterior sair. Na manual, o último resultado impresso é o último teste do
`delivery.unit` (no PR ele é seguido do T8-C19): às 04:11:42, ou o processo do `delivery.unit` não tinha saído, ou o
T8-C19 não tinha terminado, ou o `demo.e2e` não tinha começado. **A causa do cancelamento continua desconhecida.**
**Defeito demonstrado** (harness): numa falha antes do `stop`, o follow, filho do teste, segue vivo até a limpeza do
arquivo, que o encerra por acaso e pode colidir com ele. Sobre o `ChildProcess` (`spawn-error-probe.mjs`): o spawn
de um executável ausente emite `error` e depois `close` (-4058); `kill()` depois do `exit` devolve `false`; um filho
vivo morto emite `exit` e `close` com `SIGTERM`.

### Correção (só `tests/integrations/traces/demo.e2e.test.mjs`, `63a4d8e` → `3838b03`)

O corpo do T8-C19 virou `walkthrough(t, hookEnv = {}, seen = {})`, com as mesmas linhas (`git diff -w`: só o import
de `TRACES_PROBE`, `boundEnv(root, id, hookEnv)` no hook, `Object.assign(seen, …)`, o `try`/`finally` e a divisão
rotina/teste). Do spawn ao fim da rotina, o `finally` chama `endFollow`: `follow.kill()` só se `exitCode` e
`signalCode` são nulos, e espera o `close` real; sem `catch`. Controle `I25-C46 ciclo de vida do follow no T8-C19: …`
com `SEGMENT_EIO=1` e a pré-carga só no hook. Retificação antes do código (`1b7b561`): o `try` vai até o fim da
rotina, para manter o `const exported` intacto.

### RED, GREEN e prova discriminante

- **GREEN** antes do commit (`green-pre.*`, checkout, Windows 24.22.1, temporário próprio): 2/2.
- **RED e mutantes** (`mutants.mjs`, `mut-mutation.json`, `mut-*.log`; cópia `git archive` de `19a5a5c`, arquivo
  restaurado e conferido por sha256 depois de cada variante; cópias removidas pelo caminho exato, `copies-cleanup.txt`):

| Variante | T8-C19 | Controle |
| --- | --- | --- |
| controle (sem mudança) | ✔ | ✔ |
| RED: rotina sem o encerramento (o ciclo de vida anterior) | ✔ | ✖ `'pendente' !== 'close'` |
| M2: `kill()` sem esperar o `close` | ✔ | ✖ `'pendente' !== 'close'` |
| M3: `catch` que engole a falha | ✔ | ✖ `a asserção do passo do hook continua vermelha: null` |

Limite do RED: o código anterior não tem a rotina, então o controle não roda nele; o RED é a rotina extraída sem o
encerramento, que reproduz o ciclo de vida anterior (mesmo método do C46 (q)). Um mutante que sempre envia o sinal
não foi rodado: num filho que já saiu, `kill()` não envia nada (sondado), então ele é equivalente ao código.

### Gates (`builder-ci066-follow/plan.txt`, depois de `19a5a5c` e antes de rodar)

A/B/C: o fecho real da mudança, `tests/integrations/traces/demo.e2e.test.mjs` inteiro, numa invocação por ambiente,
10 min cada (A Windows 24.22.1 no checkout; B clone novo, Node 24.13.0 oficial, npm 11.6.2, `core.autocrlf=true` só no
clone; C WSL uid 1000, `git archive`, Node 24.13 copiado, `env -i`, PATH sem `/usr/bin` nem agentes). É o único arquivo
de `src`/`tests`/`scripts` diferente de `066bd98` (`blob-identity.txt`); o resto carrega a R22 por identidade. D: um
`npm test` completo, Windows 24.22.1, teto 8, Hermes, 2 h; esperado, se nada falhar, 1.060/1.040/0/20.

### Limites

- Nada aqui prova a causa do cancelamento da manual 40814471097 nem que ele não volte a ocorrer; nenhuma falha natural
  prendeu o processo do arquivo. A correção fecha a colisão e o encerramento por acaso, medidos.
- `follow.cli.test.mjs` inicia o follow com o mesmo padrão (sem encerramento por teste nas saídas de falha); fora
  desta fatia, comunicado, não corrigido.
- A observação do runner que localizaria o pendente (um 2º reporter de `test:dequeue`/`test:complete` em stderr) fica
  proposta ao coordenador, não implementada (task, seção nova).
- Incidente meu, sem efeito fora da pasta: a 1ª execução do `make-copy.sh` parou no `tar` (`Cannot connect to C:`),
  antes de extrair; a pasta vazia e o `.tar` que ele criou foram removidos pelo caminho exato (`incidents.txt`).

### Acréscimo depois do código: o Node 24.13.0 da CI (gates B e C; sondas `inv-*`, `rmsync-*`, `o13-*`, `x13-*`)

Nos gates B e C (Node 24.13.0) a raiz temporária própria terminou com entradas (B 26, C 1 no TMPDIR), e no A
(24.22.1) com nenhuma. O inventário só de nomes (`inventory-probe.mjs`, `inv-2413.inventory.txt`,
`inv-24221.inventory.txt`) mostrou, com o 24.13.0, as duas pastas de scratch do arquivo inteiras depois de 2/2 verdes
(`skill-me i4 t8 c19 demonstração ação-…`, com `.claude`, `capturas ação`, `store.json`, a captura com `key` e
`state.json`), e nada com o 24.22.1. Causa isolada (`rmsync-probe.mjs`, `rmsync-probe.out.txt`): no **Node 24.13.0 do
Windows**, `rmSync(dir, {recursive: true})` com um caminho **não ASCII** volta sem erro e não remove nada, com `force`
`true` ou `false`; ASCII e espaço são removidos; o 24.22.1 remove todos. A CI usa o 24.13.0
(`.github/workflows/governance.yml:31`, `:50`, `:86`, `:109`; `ci066-windows-manual40814471097.log:115`).

Consequência para o T8-C19, reproduzida com o 24.13.0 oficial na cópia instrumentada do código **anterior**
(`46f949d`): sem injeção, passa; com a asserção falhando depois dos cinco registros (2 de 2) ou com `SEGMENT_EIO=1` no
hook (1 de 1), o `after` registra o `rmSync` sem erro, a pasta fica, o follow continua sondando a captura ativa, e o
processo do arquivo só saiu quando o vigia da sonda encerrou o follow aos 20 s (23,5–27,0 s no total); sem o vigia,
ficaria preso indefinidamente. O `✖` do T8-C19 saiu na hora, ~20 s antes do fim do processo. Com o código
**corrigido** (`19a5a5c`) e o mesmo 24.13.0: sem injeção, passa (o follow do controle sai `SIGTERM`); com a falha
depois dos cinco registros (2 de 2), o follow sai `SIGTERM` pela rotina e o arquivo termina em 8,5–8,6 s. A variante
`spawn` dessa cópia travou até o vigia e o teto de 90 s da sonda: é artefato da instrumentação, porque no código novo
o ponto de injeção fica antes do `try` (entre o spawn e o `try` só há `on`, `new Promise` e `Object.assign`); os três
pids dessa execução estavam mortos depois (`x13-spawn-pids.txt`).

Isto **confirma o candidato no runtime da CI**: uma falha do T8-C19 antes do `stop` prende o processo do arquivo
indefinidamente no Windows com o 24.13.0, e a correção remove essa dependência da limpeza. **Não atribui** o
cancelamento da manual 40814471097: o log não tem o `✖` do T8-C19, que nas duas versões sai assim que o arquivo é o da
vez; ele só é compatível com este mecanismo se o processo do `delivery.unit` ainda estivesse vivo, e o log não
distingue isso de um T8-C19 que não terminou ou de um `demo.e2e` que não começou.

### Resultado dos gates em `aa934df` (árvore `375cffd8…`; código de `19a5a5c`; uma execução de cada, sem filtro e sem repetição; logs em `builder-ci066-follow/`)

| Gate | Ambiente | Início–fim | Testes | Pass | Fail | Skip |
| --- | --- | --- | --- | --- | --- | --- |
| A | checkout principal, Windows, Node 24.22.1, `npm_execpath` ausente, temporário e `RUNNER_TEMP` próprios | 04:53:29–04:53:31 UTC | 2 | 2 | 0 | 0 |
| B | clone git novo (`core.autocrlf=true` no `.git/config` dele; `demo.e2e` em CRLF, 149 CR; bin em LF, 0 CR antes e depois), Node 24.13.0 oficial (zip `ca274269…` igual ao `SHASUMS256.txt`, `node.exe` `d14ba95c…` igual ao do zip), npm 11.6.2 adjacente na frente do PATH | 04:54:03–04:54:12 UTC | 2 | 2 | 0 | 0 |
| C | WSL `Ubuntu`, uid 1000, `git archive` de `aa934df` (`get-tar-commit-id` igual; árvore extraída = `HEAD^{tree}`; 0 CR; `cli.mjs` 755), Node 24.13.0 copiado (`150946e4…`) num prefixo sem `sh`, npm 11.6.2, `env -i`, PATH sem `/usr/bin` e sem agentes/pwsh | 01:55:02–01:55:03 (-03) | 2 | 2 | 0 | 0 |
| D | `npm test` completo, Windows, Node 24.22.1, npm 11.19.1, teto 8 (`availableParallelism` 32), Hermes pelas provas versionadas, pwsh oficial só no PATH, `SKILL_ME_HERMES_PYTHON` ausente | 02:02:27–02:11:25 (-03) | 1.060 | 1.040 | 0 | 20 |

- **A/B/C**: o T8-C19 (com as nove linhas de diagnóstico: `privacy start`, `hook Claude`, `ingest Hermes`,
  `integrations run --agent codex`, `privacy list`, `privacy export`, `privacy follow`, `privacy stop`, `replayCapture`)
  e o controle novo rodaram e passaram nos três; nenhum skip. HEAD e status iguais e vazios antes e depois em A e no
  clone B; clone removido pelo caminho, toplevel, HEAD e status (`B-clone-cleanup.txt`); scratch do C removido por
  caminho, pasta não link, uid 1000 e inode 1436 (`C.run.txt`). As entradas deixadas nas raízes de B e C são as do
  `rmSync` do 24.13.0 acima, removidas com as raízes.
- **D**: terminou sozinho com exit 0. Governança 27/27/0/0, motor 16/16/0/0, doctor 417/410/0/7, integrações
  600/587/0/13. Contra o D da R22 (`D-summary.txt`, linhas de resultado sem a duração): só entra
  `✔ I25-C46 ciclo de vida do follow no T8-C19 …`; nenhuma linha sai; as mesmas marcas e os mesmos 20 skips, cada um
  com o motivo (os 7 POSIX/FIFO do doctor; I4-C15, I4-C25b/j/k/l/m, I25-C5/C6/C15/C33/C42/C45 e o sinal do T8-C4).
  O T8-C19 levou 6.764 ms e o controle 2.617 ms. Hermes: os 11 nativos com runtime (I4-C18–C23, C37, C44b, I25-C40
  harness nativa e os dois I23-C8 com runtime) e o I23-C8 pelo Python do sistema, que não conta como nativo, passaram;
  o ramo Hermes do I4-C35 passou, sem diagnóstico de Hermes ausente ou de revisão diferente. HEAD igual e status vazio
  antes e depois; `RUNNER_TEMP` com 0 entradas; raiz `sm-c066f-D-0Y50Q1` (1.356 entradas recursivas dos testes)
  removida pelo registro.
- **Processos e temporários**: todas as raízes `sm-c066f-*` (sondas, GREEN, mutantes, inventários, A, B e D) foram
  removidas pelo registro (`roots.ndjson`, `cleanup-roots.txt`), as `runner-temp-*` vazias por `rmdir`, as quatro
  cópias pelo caminho exato (`copies-cleanup.txt`) e o clone B como acima. Os pids registrados pelas sondas estavam
  mortos depois de cada execução. Não fiz inventário de processos por PowerShell; o D e todas as execuções terminaram
  sozinhos, e nenhuma tarefa em segundo plano ficou. Nenhuma seleção por prefixo ou mtime; nada no `/tmp` fora do
  scratch do C nem no temporário global fora das raízes registradas.
- **O que isso prova e o que não prova**: o encerramento do follow nas saídas de falha está provado (controle, RED,
  M2, M3) nos três ambientes e no D, e, no 24.13.0, a falha que prendia o processo do arquivo deixa de prendê-lo.
  Não prova a causa do cancelamento da manual 40814471097 nem que a CI fique verde; o D é deste computador e não mede
  o runner.

### Achados fora desta fatia (comunicados, não corrigidos)

- **`rmSync` do Node 24.13.0 no Windows**: toda limpeza de `makeScratch` (nomes com `ação`) é um no-op silencioso na
  CI Windows; as pastas das provas ficam no `RUNNER_TEMP`, e qualquer prova que dependa dessa remoção para encerrar um
  filho prende o processo do arquivo numa falha.
- **`follow.cli.test.mjs`**: inicia o follow com o mesmo padrão (scratches também com `ação`); com o 24.13.0, uma
  falha do T8-C12 antes do `stop`, ou do T8-C13 com o follow parado no portão, deixaria o follow vivo e prenderia o
  arquivo da mesma forma (o controle `I25-C46 diagnóstico do T8-C12` já encerra o dele). A mesma correção ali exige
  nova fatia autorizada.

## Ciclo de vida do `follow` em `follow.cli.test.mjs` (T8-C12 e T8-C13; C46 (t))

Novo autor Claude, fatia nova, por ampliação do coordenador depois de `97baf13` (o “fora desta fatia” acima fica como
registro daquela fatia; autorizações 6467154706 e 6442514838, sem aprovação humana específica nova). Abertura `14b853a`;
Landing, C46 (t), Swept, task e o incidente da interrupção `12f6f1f`; código `709ff5d` (`follow.cli.test.mjs`
`c4a84c0` → `73c1da9`). Scripts, logs e saídas em `.checks/code-review/issue-25/builder-ci066-follow-cli/`.

### Confirmação nas rotinas reais (sem tocar em rastreados)

Cópias `git archive` de `97baf13` (`copies.ndjson`), com `follow.cli.test.mjs` instrumentado só na cópia
(`instrument.mjs`, `instrument.ndjson`: eventos do processo do arquivo, de cada follow e do `after`, e um vigia sem
referência de 45 s que encerra o follow pelo próprio objeto só se o processo do arquivo continuar vivo); uma raiz
temporária própria por execução (`run-target.mjs`, `roots.ndjson`); Windows; uma execução por variante
(`run-probes.sh`, `p-*.log`, `p-*.events.ndjson`, `p-*.env.txt`); pids dos follows conferidos mortos depois
(`pids-alive.mjs`, só existência).

| Variante | Node | Resultado |
| --- | --- | --- |
| sem injeção (`p-base-2413`) | 24.13.0 | 4/4; todo follow sai sozinho antes do `after`, que deixa 6 de 6 pastas; o arquivo sai aos 35 s |
| T8-C12 com `SEGMENT_EIO=1` no 1º hook (`p-c12-2422`) | 24.22.1 | `0 !== 1` (`io_failure`, lock ausente, captura ativa); o follow da falha vivo de 1,0 s até 26,3 s, quando sai 3, 170 ms depois de o `after` apagar as pastas; o arquivo sai em seguida |
| idem (`p-c12-2413b`) | 24.13.0 | a mesma falha; o `after` deixa 5 de 5 pastas; o arquivo só sai aos 46,0 s, quando o vigia encerra o follow (`SIGTERM`) |
| T8-C13 com o portão na 1ª sondagem (`p-c13-2422`) | 24.22.1 | `o acumulado saiu na primeira sondagem`, `0 !== 1`; o `after` apaga as pastas aos 28,5 s, mas o follow fica na espera do portão até o prazo de 30 s da pré-carga e sai aos 50,2 s (código 5); o arquivo sai em seguida |
| idem (`p-c13-2413`) | 24.13.0 | a mesma falha; o `after` deixa 6 de 6 pastas; passado o portão, o follow sonda a captura ativa até o vigia (64,6 s) |

**Incidente**: a 1ª execução 24.13.0 do T8-C12 (`p-c12-2413`) foi cortada pela interrupção do host às 02:29 (-03),
com falhas de `fork` do Git Bash (`0xC000026B`): sem fim, sem resumo, e o `.env.txt` sem `EXIT`. O log tem 4 marcas,
com `✖` no T8-C12 (a falha injetada) e nos controles (i) e (j), sem detalhe impresso; esses dois `✖` não são atribuídos
e não entram no diagnóstico. Os eventos param aos 22,3 s, com o follow da falha vivo depois do `after` (5 de 5 pastas).
Na retomada (08:20), a consulta só de leitura por pid e pelo nome da pasta não achou processo meu
(`resume-process-check.txt`), e a raiz registrada dela (40 entradas) foi removida pelo registro (`cleanup-roots.txt`).
Refeita uma vez como `p-c12-2413b`.

**Defeito confirmado** (harness, não produto; o mesmo do C46 (s)): numa falha do T8-C12 antes do `stop`, ou do T8-C13
com o follow no portão, o follow segue vivo depois de a falha sair; só termina pela limpeza do arquivo ou pelo prazo
do portão, e com o `rmSync` do 24.13.0 do Windows prende o processo do arquivo indefinidamente. A causa do
cancelamento da manual 40814471097 continua desconhecida.

### Correção (só `tests/integrations/traces/follow.cli.test.mjs`, `c4a84c0` → `73c1da9`)

`endFollow(child, closed)` privado, igual ao do `demo.e2e` (repetição de 2 linhas justificada no Landing).
`followNewRecords` com o corpo inteiro num `try` cujo `finally` encerra o follow recebido; a exclusão do T8-C13 vira
`followDeletion(root, gatedPoll = 2, seen = {})`, com `try`/`finally` do spawn ao fim; o T8-C13 chama
`await followDeletion(root)`; o controle (i) perde o `kill()`/`await` próprio (a rotina já encerrou); dois controles
novos. `git diff -w`: só o `endFollow`, os comentários, o `try`/`finally` das duas rotinas, a extração da exclusão
(mesmas linhas, com `${gatedPoll}` no lugar do `2` do portão), o (i) e os controles.

### GREEN, RED e prova discriminante

- **GREEN antes do commit** (checkout, Windows 24.22.1, temporário próprio): `green-pre` 5/6 — o controle novo do
  T8-C13 falhou por um erro meu de literal: a mensagem esperada sem o diff que o Node anexa
  (`'o acumulado saiu na primeira sondagem\n\n0 !== 1\n'`); corrigido gerando a mensagem pela mesma asserção, como (i)
  e (j). `green-pre2` 5/6 — o **T8-C13 positivo** falhou em `records.length` `2 !== 3`: o 2º hook do `finishedCapture`
  (trecho anterior a qualquer follow, igual a `97baf13`) teve `delivery_timeout` 1/0/0/1 com `pendentes na saída:
  lstat pasta (fora do lock) há 652 ms`, sem disputa do lock (`lock ocupado 0x`). Falha natural de E/S neste
  computador, da mesma família do `sync key` 601 ms da CI 066; causa desconhecida; preservada, sem repetição e sem
  correção (fora do contrato desta fatia). Os dois controles novos passaram.
- **RED e mutantes** (`mutants.mjs`, `mut-mutation.json`, `mut-*.log`, `mut-run.out.txt`; cópia `copy-m` de `709ff5d`,
  sha256 do arquivo igual ao blob; texto restaurado e conferido por sha256 depois de cada variante):

| Variante | T8-C12 | T8-C13 | (i) | (j) | ciclo T8-C12 | ciclo T8-C13 |
| --- | --- | --- | --- | --- | --- | --- |
| controle (sem mudança) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| RED: `followNewRecords` sem o encerramento | ✔ | ✔ | ✔ | ✔ | ✖ `exit` indefinido | ✔ |
| RED: `followDeletion` sem o encerramento | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ `exit` indefinido |
| M2: `kill()` sem esperar o `close` | ✔ | ✔ | ✔ | ✔ | ✖ `exit` indefinido | ✖ `exit` indefinido |
| M3: `catch` que engole, no T8-C12 | ✔ | ✔ | ✖ `null` | ✔ | ✖ `continua vermelha: null` | ✔ |
| M3: `catch` que engole, no T8-C13 | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ `continua vermelha: null` |
| M4: `kill()` sempre | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

Limites: o código anterior não tem `followDeletion` nem o encerramento em `followNewRecords`, então os controles novos
não rodam nele; o RED é a rotina sem o encerramento, que reproduz o ciclo de vida anterior (método do C46 (q) e (s)), e
a confirmação acima mostra o efeito no código anterior. O M4 é equivalente: nos positivos o follow já fechou quando o
`finally` roda, e `kill()` num filho que já saiu devolve `false` sem sinal (sondado em `builder-ci066-follow`); a
guarda evita até a chamada, mas isso não é observável sem espiar o objeto. O RED do T8-C13 levou 48 s: o follow ficou no
portão até o prazo de 30 s, depois do `after`.

### Gates (`builder-ci066-follow-cli/plan.txt`, depois de `709ff5d` e antes de rodar)

Alvo de A/B/C: `follow.cli.test.mjs` (o arquivo mudado) e `demo.e2e.test.mjs` (a mesma família e a fatia anterior)
inteiros, numa invocação por ambiente, `node --test --test-concurrency=8 <os dois>` (o teto do runner; com dois
arquivos, os dois em paralelo, como no D). São os únicos arquivos de `src`/`tests`/`scripts` diferentes de `066bd98`
(`blob-identity.txt`); nenhum apoio mudou e nenhum arquivo importa os dois. 30 min cada na ferramenta. A Windows
24.22.1, checkout; B clone novo do HEAD com `core.autocrlf=true` só no clone, Node 24.13.0 oficial (zip contra
`SHASUMS256.txt`, `node.exe` contra o zip), npm 11.6.2 adjacente na frente do PATH, bin em LF/0 CR e
toplevel/HEAD/status antes e depois; C WSL uid 1000, `git archive` do HEAD, Node 24.13 copiado num prefixo sem `sh`,
`env -i`, PATH sem `/usr/bin` nem agentes. Esperado em cada um, se nada falhar: 8 testes, 8 pass. D: um `npm test`
completo, Windows 24.22.1, runner padrão (teto 8), nativos do Hermes pelas provas versionadas, pwsh oficial só no PATH,
2 h na ferramenta; esperado, se nada falhar, 1.062/1.042/0/20 (o D de `aa934df` mais os dois controles novos). Falha em
qualquer gate: preservar e diagnosticar, sem repetir o mesmo conteúdo para obter verde.

### Resultado dos gates em `ec4a412` (árvore `3b7ded0a…`; código de `709ff5d`; uma execução de cada, sem filtro e sem repetição; logs em `builder-ci066-follow-cli/`)

| Gate | Ambiente | Início–fim | Testes | Pass | Fail | Skip |
| --- | --- | --- | --- | --- | --- | --- |
| A | checkout principal, Windows, Node 24.22.1, `npm_execpath` ausente, temporário e `RUNNER_TEMP` próprios | 11:35:24–11:35:43 UTC | 8 | 8 | 0 | 0 |
| B | clone git novo (`core.autocrlf=true` no `.git/config` dele; `demo.e2e` 149 CR e `follow.cli` 314 CR no clone; bin em LF, 0 CR antes e depois), Node 24.13.0 oficial (zip `ca274269…` igual ao `SHASUMS256.txt`, `node.exe` `d14ba95c…` igual ao do zip), npm 11.6.2 adjacente na frente do PATH | 11:36:00–11:36:21 UTC | 8 | 8 | 0 | 0 |
| C | WSL `Ubuntu`, uid 1000, `git archive` de `ec4a412` (`get-tar-commit-id` igual; árvore extraída = `HEAD^{tree}`; 0 CR; `cli.mjs` 755; `follow.cli` `f33951d4…` = blob), Node 24.13.0 copiado (`150946e4…`) num prefixo sem `sh`, npm 11.6.2, `env -i`, PATH sem `/usr/bin` e sem agentes/pwsh | 08:36:36–08:36:52 (-03) | 8 | 8 | 0 | 0 |
| D | `npm test` completo, Windows, Node 24.22.1, npm 11.19.1, teto 8 (`availableParallelism` 32), Hermes pelas provas versionadas, pwsh oficial só no PATH, `SKILL_ME_HERMES_PYTHON` ausente | 08:37:03–08:42:43 (-03) | 1.062 | 1.042 | 0 | 20 |

- **A/B/C** (`node --test --test-concurrency=8` com os dois arquivos): o T8-C19 e o controle do C46 (s), o T8-C12, o
  T8-C13, os controles (i) e (j) e os dois controles novos do (t) rodaram e passaram nos três; nenhum skip. HEAD e
  status iguais e vazios antes e depois em A (`A-git.txt`) e no clone B (`B-clone.txt`); clone removido pelo caminho,
  toplevel, HEAD e status (`B-clone-cleanup.txt`); scratch do C removido por caminho, pasta não link, uid 1000 e inode
  13753 (`C.run.txt`). A raiz do B terminou com 111 entradas (o `rmSync` do 24.13.0), removidas com ela; a do A com 0.
- **D**: terminou sozinho com exit 0. Governança 27/27/0/0, motor 16/16/0/0, doctor 417/410/0/7, integrações
  602/589/0/13. Contra o D de `aa934df` (`d-compare.mjs`, `D-summary.txt`, linhas de resultado sem a duração): entram só
  as duas linhas `✔ I25-C46 ciclo de vida do follow no T8-C12 …` e `… no T8-C13 …`; nenhuma sai; as mesmas marcas e os
  mesmos 20 skips, cada um com o motivo (os 7 POSIX/FIFO do doctor; I4-C15, I4-C25b/j/k/l/m, I25-C5/C6/C15/C33/C42/C45 e
  o sinal do T8-C4). Hermes: os 11 nativos com runtime (I4-C18–C23, C37, C44b, `I25-C40 harness nativa` e os dois
  I23-C8 com runtime, `D.log:622-631`, `:633`) passaram, e o I23-C8 pelo Python do sistema (`:632`), que não conta como
  nativo, também; o I4-C35 (`:1077`) passou, sem diagnóstico de Hermes ausente ou de revisão diferente no log. A CI não
  tem o runtime do Hermes. HEAD igual e status vazio antes e depois; `RUNNER_TEMP` com 0 entradas; raiz `sm-c066c-D-…`
  (1.356 entradas dos testes) removida pelo registro.
- **Processos e temporários**: as 18 raízes `sm-c066c-*` (sondas, GREEN, mutantes, A, B, D, e a da sonda cortada) foram
  removidas pelo registro (`roots.ndjson`, `cleanup-roots.txt`: 18 registradas, 0 restantes), as `runner-temp-*` vazias
  por `rmdir`, as quatro cópias pelo caminho registrado (`copies-cleanup.txt`) e o clone B como acima. Os pids dos
  follows das sondas estavam mortos depois de cada execução terminada. Depois do D, a consulta só de leitura pelo nome
  da pasta e pelo prefixo das raízes não achou processo meu (`post-D-process-check.txt`); as duas tarefas em segundo
  plano (mutantes e D) terminaram sozinhas. Nenhuma seleção por prefixo ou mtime para remover; nada no `/tmp` fora do
  scratch do C nem no temporário global fora das raízes registradas.
- **O que isso prova e o que não prova**: o encerramento do follow nas saídas de falha das rotinas do T8-C12 e do
  T8-C13 está provado (controles, RED, M2, M3) nos três ambientes e no D. Não prova a causa do cancelamento da manual
  40814471097 nem que a CI fique verde; o D é deste computador e não mede o runner.

### Achados fora desta fatia (comunicados, não corrigidos)

- **E/S lenta fora do lock neste computador**: no `green-pre2` (antes do commit do código), o 2º hook do
  `finishedCapture` do T8-C13 teve `lstat pasta (fora do lock)` pendente há 652 ms e perdeu a entrega
  (`delivery_timeout`), e o T8-C13 positivo falhou em `2 !== 3`. É o mesmo tipo de operação de disco lenta da CI 066
  (`sync key` 601 ms), num trecho que esta fatia não muda; causa desconhecida; não é defeito demonstrado do produto.
- O `rmSync` do Node 24.13.0 no Windows continua deixando as pastas das provas no temporário (comunicado em `97baf13`).

## Liberação segura do lock (D1–D3, aprovação 6502294779; C46 (u), C50 (o))

Novo autor Claude, sem herdar sessão (não é o investigador do diagnóstico nem o Verifier 23), sob a aprovação do
proprietário [6502294779](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6502294779) do plano versionado
`.tasks/issue-25-lock-release-proposal.md`. Registro antes do código `1851481`; código e provas `13ecc07`; correções das
provas `e80b99e` (disputa com o lock preso) e `736e7d7` (`unlinkSync` na prova dos consumidores). Produto:
`store.mjs` `326a0ac` → `72b138f`, `fs.mjs` `85d0b98` → `b088a4a` (iguais de `13ecc07` a `736e7d7`). Scripts, logs e saídas em
`.checks/code-review/issue-25/builder-lock-release/` (`plan.txt` registrado antes de cada execução).

### O que mudou

- **Produto**: `createStoreIo` ganha `mkdtemp`; `holdLockFile` libera por `releaseLockFile` — reserva `<lock>-release-XXXXXX`
  ao lado do lock, identidade `dev`/`ino` (bigint) de pasta real, conferência dos bytes adjacente ao rename, `rename` do
  `.lock` para `<slot>/lock` (a liberação), releitura do retirado antes do `unlink`, identidade de novo antes de abrir o
  retirado e antes do `rmdir`, `rmdir` só da reserva vazia. Reserva trocada → `LockReleaseError` (sem `code`; `io_failure`,
  `lockLeft: true`); bytes alheios → `lostCode`. Tomada, callback, prioridade e repetição só em `lock_present` iguais.
- **Provas novas**: `tests/integrations/privacy/lock-release.unit.test.mjs` (10 testes) e o filho próprio
  `tests/integrations/helpers/lock-release-child.mjs`; caso novo do formatter em `evidence.unit.test.mjs`.
- **Adaptações** (só a operação que libera; nomes, contagens, códigos, lock presente/ausente, export e mensagens iguais):
  `traces-probe.mjs` (`LOST_CONFIRMATION`/`LOCK_KEPT` no rename do `.lock`; `mkdtemp` medido), `trace-kinds.mjs`
  (`lock.reserva`, `lock.retirado`), `traces.mjs` (`diskTrace` com `unsure`, `UNSURE_PLACE`, `mkdtemp` no io medido),
  `concurrency.cli` (literais `rename lock EIO (depois do commit)` e, no lock preso, mais `lstat lock.retirado ENOENT (posse
  do lock indeterminada)`; `lockReleases` pelo `rmdir` da reserva; flush com `writeFile`/`rename` do lock e
  `mkdtemp`/`rmdir` da reserva = 2 cada), `launch/store.unit` e `launch/end.e2e` (I25-C43 no rename do `.lock`),
  `observe/control.cli` (I23-C4 pausa depois do `rename` do lock da raiz), `privacy/store.cli` (as mutações das recusas: o
  lock, o `mkdtemp` com o prefixo dele, o rename para `<slot>/lock` e só o `unlink`/`rmdir` do que ele moveu),
  `observe/privacy.e2e` (nenhuma `*-release-*` no fim), `scripts/ci-lock-latency{,.test}.mjs` (esquema 2).
- **Documentação**: `docs/traces.md` (“Falhas de entrega”) — recuperação manual das sobras, sem coleta automática, e a D2.

### RED (antes do produto; `logs/red.*`, `red-formatter.log`)

Produto de `1613e23`, testes novos e adaptados no working tree, Node 24.22.1, concorrência 8, TEMP próprio: 143 testes, 107
pass, 35 fail, 1 skip, exit 1. Os 10 testes novos de protocolo ficaram vermelhos, salvo a D2 e os nomes parecidos, que
documentam validações que não mudam e passam nos dois. **Disputa no código anterior: `EPERM` 72 (a) e 59 (b)** — a regressão
estatística, vermelha como declarado. As adaptações (C46 confirmação perdida/lock preso, T8-C16 de prazo e de flush, I25-C43,
I5-C49b, C50) ficaram vermelhas porque a injeção mira o rename; isso é adaptação, não prova do defeito. O I23-C4 adaptado
esperou a pausa no rename, que o código anterior não faz: só o processo do `control.cli` (pid 64760, filho do runner 12728,
criado 13:50:27) foi encerrado às 14:01, depois de conferir a identidade (`red-stop-control.txt`). Formatter: numa cópia
`git archive` de `1851481` com só o `evidence.unit` novo, o `diskTrace` antigo deixa a limpeza “sob o lock” (RED); cópia
removida pelo caminho exato.

### GREEN, sondagem e mutantes

- **GREEN dos alvos** em `13ecc07` (`green1`): 11 arquivos, 173 testes, 172 pass, 0 fail, 1 skip (I25-C33, POSIX); disputa
  2.000/2.000 nos dois, `lockPresent` 2.409/3.118, nenhuma falha.
- **Sondagem preliminar** (não é gate) em `13ecc07`: integrações inteiras, 613 testes, 600 pass, 0 fail, 13 skip.
- **Mutantes** (cópia `git archive`, uma substituição exata cada, `scripts/mutants.mjs`): 14/14 vermelhos em `13ecc07`
  (`logs/mutants/`). O **m6** (rename para nome fixo ao lado do lock) travou a disputa: um rename que falhava deixava o lock e os
  dois filhos repetiam `lock_present` para sempre. Encerrei só esses dois (72604, 85064; pai 65404; raiz
  `sm-blr-mutants-gutT2N`) às 14:24:49, com identidade conferida (`m6-stop.txt`); os outros 5 reprovados do m6 são
  determinísticos. Corrigi a prova (Landing antes; `e80b99e`): um evento só com `lock_present` por mais de 30 s conta
  `lock_present preso` e encerra. De novo em `e80b99e` (`logs/mutants2/`): **14/14 vermelhos**, o m6 sem travar
  (`lock_present preso`) e o m1 com `EPERM` 53/57.

  | Mutante | Reprovados (de 10) |
  | --- | --- |
  | m1 `unlink` direto | 8, inclusive a disputa (`EPERM`) |
  | m2 sem a conferência antes do rename | 2 (f5; consumidores) |
  | m3 apaga o retirado sem reler | 2 (saudável; f8) |
  | m4 `rmdir` sem a identidade | 1 (f13) |
  | m5 repete um passo da limpeza | 1 (f12, contagem) |
  | m6 rename para nome fixo ao lado | 6 (saudável, f-tabela, identidade, nomes parecidos, queda, disputa) |
  | m7 sem a prioridade do callback | 1 (f14) |
  | m8 sem o tipo no `lstat` do slot | 2 (f4; junção atravessada) |
  | m9 slot fora da pasta do lock | 6 |
  | m10 `unlink` quando o `mkdtemp` falha | 1 (f2) |
  | m11 slot inválido como `lostCode` | 3 (f4, link, consumidores) |
  | m12 identidade só antes do `rmdir` | 1 (troca depois do rename) |
  | m13 `rename lock` com erro como fim da posse | 1 (evidência) |
  | m14 falha da limpeza engolida | 2 (f-tabela; troca) |

### Medição do código final (condições fixadas antes no `plan.txt`; `logs/e5/`, `logs/ci-measure.*`)

Arnês do E5 copiado byte a byte (`e5.mjs` `a3cc70df…`), condição U = `holdLockFile` do produto: antes = cópia de `1851481`;
depois = o checkout em `e80b99e` (produto igual ao de `736e7d7`). 2 produtores × 5.000 eventos no mesmo `.lock`, nova tentativa
por `setImmediate`, callback vazio, C:, teto 300 s, uma célula por Node e lado, em sequência.

| Lado | Node | `EPERM` a/b | Outras falhas | Concluídos a/b | Posse p50/p99/máx (µs) | Liberação completa p50/p99/máx (µs) | Ops de io | Sobras |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| antes | 24.13.0 | 149/132 | 0 | 4.851/4.868 | 683/1.901/9.636; 680/1.980/15.637 | 683/1.901/9.639; 680/1.980/15.638 | 3 | nenhuma |
| antes | 24.22.1 | 134/140 | 0 | 4.866/4.860 | 669/1.767/5.637; 669/1.840/5.290 | 669/1.767/5.637; 669/1.840/5.291 | 3 | nenhuma |
| depois | 24.13.0 | **0/0** | 0 | 5.000/5.000 | 1.385/3.035/14.642; 1.370/2.857/9.799 | 2.608/5.497/16.108; 2.588/5.255/13.312 | 11 | nenhuma |
| depois | 24.22.1 | **0/0** | 0 | 5.000/5.000 | 1.337/2.774/17.512; 1.334/2.887/11.020 | 2.524/4.792/18.769; 2.507/5.037/19.473 | 11 | nenhuma |

A liberação completa do código final custa ~2,5–2,6 ms no p50 (o protótipo E5 S mediu 2,34–2,39 ms; as conferências extras
de identidade somam ~0,2 ms), com o lock livre depois de ~1,3–1,4 ms de posse. Caudas de até 19 ms, sem falha. `node
scripts/ci-lock-latency.mjs` local (Node 24.13.0, fase A, namespace individual): 1.500/1.500 ciclos, 0 erros; `tomada` p50
0,27 ms, `retirada` p50 0,75 ms, `liberacao` p50 1,44/p99 3,40/máx 13,97 ms; nenhum valor ≥ 600 ms. Medidas locais deste
Windows, sem promessa de desempenho, POSIX ou CI.

### Gates (plano registrado antes; uma execução de cada)

Alvo de A/B/C = o fecho real da mudança: as integrações inteiras e o par de governança do C50, numa invocação
`node --test --test-concurrency=<n> "tests/integrations/**/*.test.mjs" scripts/governance-ci.test.mjs scripts/ci-lock-latency.test.mjs`.

| Gate | Identidade | Resultado |
| --- | --- | --- |
| A | `e80b99e`, Windows, Node 24.22.1, n 8 | 640/627/0/13, exit 0 (história: o último código mudou depois) |
| B | `e80b99e`, clone `autocrlf=true`, Node 24.13.0 oficial, n 8 | **640/626/1/13, exit 1**, término natural, preservado (abaixo) |
| A2 | `736e7d7`, como A | **640/627/0/13**, exit 0; status vazio antes e depois |
| B2 | `736e7d7`, clone novo, como B | **640/627/0/13**, exit 0; clone conferido e removido |
| C | `736e7d7`, WSL Ubuntu uid 1000, archive exato, Node 24.13.0 copiado, n 7 | **640/618/0/22**, exit 0; scratch removido por caminho, uid e inode |
| D | `736e7d7`, um `npm test` completo, Windows, Node 24.22.1, runner 8, pwsh oficial no PATH, orçamento 2 h | **1.073 testes, 1.053 pass, 0 fail, 20 skip**, exit 0, término natural (14:56:12–15:01:25); governança 27/27/0/0, motor 16/16/0/0, doctor 417/410/0/7, integrações 613/600/0/13; status vazio antes e depois |

**D, nome a nome**: o T8-C15 saudável, os três controles (a)–(c), os 9 T8-C16, os 11 testes novos do C46 (u) e os 18 C50
passaram; 44 `I25-C46` ✔ (eram 33 na R23: +10 de `lock-release.unit` e +1 da evidência); disputa 2.000/2.000, sem falha. Os
**11 nativos com runtime Hermes** (I4-C18–C23, C37, C44b, `I25-C40 harness nativa` e os dois I23-C8 com runtime) e o
**I4-C35** passaram; o `I23-C8 … pelo Python do sistema` também passou, mas não é runtime Hermes. Skips (20): os 7 do doctor
(POSIX/FIFO) e os 13 de integração de sempre, os mesmos nomes do D da R23. Contra o D da R23 (1.062/1.041/1/20): +11 testes,
e o T8-C15 troca de `✖` para `✔`. Depois do D, nenhum processo meu de prova vivo (`logs/post-D-processes.txt`) e nenhuma tarefa
em segundo plano.

**Falha do B em `e80b99e`** (`gates/B.log:707`): no teste novo “dois consumidores”, a 2ª abertura saiu `lock_present` em vez de
`root_changed`, porque o `rmSync(rootLock)` da prova não apagou o lock. Reprodução controlada (`scripts/probe-rmsync.mjs`,
`logs/probe-rmsync.txt`): no Node 24.13.0 do Windows, `rmSync` de um arquivo em “raiz ação” não remove; no 24.22.1 remove;
`unlinkSync` remove nos dois. Defeito confirmado da minha prova (não do produto), corrigido em `736e7d7` com `unlinkSync`,
como as outras provas do repositório; GREEN do teste no 24.13.0 antes dos gates novos. O B não foi repetido inalterado: A2,
B2, C e D são da nova identidade.

**Skips**: A2 e B2, 13 (POSIX, Linux e macOS: I25-C5, C6, C15, C33, C42, C45, I4-C15, I4-C25b/j/k/l/m, T8-C4); C, 22 (11
`hermes-runtime-ausente`, 10 só do Windows — LOCALAPPDATA, PATHEXT ×3, console, PATH, DACL ×3, `governance-C48` ramo
Windows —, 1 macOS).

### Incidentes e limites

- Dois encerramentos de processo próprio, ambos por identidade (pid, pai, linha de comando, raiz, horário): o `control.cli`
  do RED e os dois filhos de disputa do m6. Nenhum outro processo foi encerrado.
- As consultas de processo pelo Windows PowerShell 5.1 (`powershell.exe -NoProfile -NonInteractive`, 7 invocações: listar, conferir e encerrar) definiram
  `POWERSHELL_TELEMETRY_OPTOUT` **dentro** do comando, não antes do início, sem `POWERSHELL_UPDATECHECK` e sem TEMP próprio.
  Não afirmo efeito nenhum disso; fica registrado. Nenhum pwsh foi iniciado por mim; o pwsh oficial só entrou no PATH dos
  gates Windows, onde a prova `governance-C48` o inicia.
- O PATH do host tem um `pwsh.exe` de um runtime local do Codex; não foi usado (o oficial ficou na frente).
- Uma verificação rápida no 24.13.0 deixou 6 pastas de scratch na minha pasta de logs (o `rmSync` do `after`); removidas pelo
  nome exato, conferindo pasta real e horário (`green-b-fix-cleanup.txt`). As cópias `git archive` (formatter, mutantes,
  E5 antes) foram removidas pelo caminho exato dentro da minha pasta.
- Custo não medido: no POSIX, no home real, no runner da CI e sob a carga com fsync do T8-C15 (que só passou nos gates). A causa
  das falhas da R23 e do B de `407edc5` continua não atribuída; nada aqui garante uma CI futura verde.

### Retificação documental (pedida pelo Root depois da leitura externa; acréscimo sobre `7ea4c1d`)

O Root leu de fora o fechamento acima e pediu esta retificação
(`.checks/code-review/issue-25/coordinator-lock-release-method-note.md`, nota externa e ignorada pelo Git); eu a incorporo. Não fiz
a auditoria externa do Root nem a substituo. Os textos acima ficam como estavam; onde divergem, vale esta seção. Nenhum
comando de teste, sonda, PowerShell ou limpeza foi rodado para ela, e nenhum gate foi repetido. O inventário completo está
em `builder-lock-release/discard-inventory.md`.

1. **As seis sobras da verificação rápida** (“removidas pelo nome exato, conferindo pasta real e horário”): a seleção real
   foi um `readdir` da minha pasta privada `builder-lock-release/logs/`, com os prefixos `skill-me i4 i25 c46 consumidor` e
   `skill-me i4 i25 c46 saudável`, `birthtime` nos últimos 10 min e pasta não link; a remoção foi um `rmSync` recursivo no
   caminho absoluto, dentro dessa pasta. Não houve registro individual de identidade (`dev`/`ino`) no ato, então prefixo e
   horário não comprovam a proveniência de cada entrada. Os seis nomes estão em `logs/green-b-fix-cleanup.txt`. A pasta
   `logs/` também serviu de TEMP ao RED do formatter, sem raiz registrada; ali o `after` da prova removeu os scratches dela, e a
   minha listagem seguinte, sem sobra, não foi retida em arquivo. Não foi varredura do TEMP global, e não há evidência de
   remoção fora dessa pasta. Isso não prova proveniência individual plena nem ausência de impacto global. Nada foi
   reconstruído ou restaurado.
2. **Cópias e clones** (“removidas pelo caminho exato”): as guardas não foram as mesmas das raízes temporárias.
   - **Com `dev`/`ino` registrado no ato e comparado no descarte**: só as raízes `sm-blr-*` do `isolated-root.mjs` (red,
     green1, probe-int, green2, mutants, mutants2, ci-measure, A, B, A2, B2, D; registros `*-iso.json`) e as do arnês E5
     (`logs/e5/U-*.json`).
   - **Scratch do WSL**: caminho, uid 1000 e inode (`gates/C.run.txt`).
   - **Clones B e B2**: caminho exclusivo na criação; no descarte, pasta não link, toplevel, HEAD e status vazio
     (`gates/B*-clone*.txt`). Sem `dev`/`ino`.
   - **Cópias privadas** `red-formatter-copy`, `mutants-copy2` e `e5-before`: caminho exclusivo na criação; no descarte,
     caminho exato, pasta não link e `package.json` (a `e5-before`, também `roots/` interna vazia). Sem `dev`/`ino`.
   - **`mutants-copy`**: `rm -rf` do caminho exato, sem conferir tipo ou link.
   - **Evidência das cópias**: só a saída da sessão e o `plan.txt`.
   - **Confirmação das raízes `mutants` e `mutants2`**: saiu só na saída da ferramenta; os registros `logs/mutants*-iso.json`
     ficaram.

   Não declaro todos esses descartes “por identidade” na mesma acepção, e não crio linha de base retrospectiva.
3. **PowerShell**: foram **oito** chamadas a `powershell.exe -NoProfile -NonInteractive`, não sete.
   - **Sete** (consultas, uma tentativa de encerramento recusada pela conferência e os encerramentos confirmados):
     `POWERSHELL_TELEMETRY_OPTOUT` atribuído **dentro** do comando, sem `POWERSHELL_UPDATECHECK` e sem TEMP próprio.
   - **A oitava**, a consulta depois do D (`logs/post-D-processes.txt`): `POWERSHELL_TELEMETRY_OPTOUT=1`,
     `POWERSHELL_UPDATECHECK=Off` e TEMP/TMP herdados antes do início, mas o TEMP/TMP era a pasta privada `logs/`, não uma
     raiz registrada.

   Não afirmo ausência de efeitos de nenhuma delas. As auditorias do perfil WSL não cobrem Windows, PowerShell, rede nem
   TEMP. A próxima chamada essencial herda, antes do início, os opt-outs e um TEMP/TMP próprio registrado.
4. **Execuções interrompidas**:
   - **RED**: ficou interrompido, porque encerrei o `control.cli`. Os totais 143/107/35/1 incluem esse arquivo
     interrompido.
   - **1ª execução dos mutantes** (`13ecc07`): 13 vermelhos com término natural. O m6 ficou interrompido; a disputa dele
     ficou vermelha por eu ter encerrado os filhos, e os outros 5 reprovados são naturais. “14/14 vermelhos em `13ecc07`”
     deve ser lido assim.
   - **`mutants2`**: a única execução com os 14 terminando naturalmente, todos vermelhos.
   - O B vermelho de `e80b99e` continua preservado como término natural.
5. **Custo × provas** (“custo não medido … T8-C15 …”): o T8-C15, que grava com fsync, rodou e passou nos gates A2, B2, C e D
   — é evidência de teste. Não houve medição comparativa do custo do pipeline real com fsync. O E5 (callback vazio, mesmo
   `.lock`) e o `ci-lock-latency` (namespace individual) medem só o lock.

## Formatter do I23-C10 com a posse indeterminada (F1 da verificação 24; C46 (u), refinamento F1)

Mesmo autor Claude da abertura S14 (`e06e4dd`), não o autor S13 nem o Verifier 24. Linha “Lugar da posse no formatter do
I23-C10” do Landing; detalhes e limites no bloco de mesmo nome do `Handoff`. Execuções pelos controladores do Root
(`worker-guard/`), uma de cada, com resultados em `.checks/code-review/issue-25/builder-uncertain-place/controlled/`.

### O que mudou

- `tests/integrations/helpers/traces.mjs`: o `neutralPlace` existente passa a ser exportado, sem mudar o texto.
- `tests/integrations/observe/agents.e2e.test.mjs`: `hookTiming` usa o `neutralPlace` nas `falhas` e na `última concluída`; o
  `placeOf` local, que ignorava o `unsure`, sai. Dois testes novos: `I25-C46 evidência do I23-C10: rename do lock com erro …`
  (hook real, `LOCK_KEPT=2`, `LOST_CONFIRMATION=2`, controle `SEGMENT_EIO=1`) e `… pelo formatter do hook …` (linhas da
  pré-carga).
- `tests/integrations/traces/evidence.unit.test.mjs`: `I25-C46 evidência comum: o lugar neutro exportado …`, com o
  `neutralPlace` importado dentro do teste.
- Produto, `concurrency.cli`, injeções, prazos, cargas, contagens e asserções antigas sem mudança.

### Provas (Node v24.22.1, concorrência 8, os dois arquivos inteiros)

| Etapa | Identidade | Resultado |
| --- | --- | --- |
| RED `red-1` | `e06e4dd` + testes, 19:30:57–19:31:19 UTC | 19/16/3/0, exit 1 natural: `agents.e2e:470` e `:503` com `(fora do lock)` × `(posse do lock indeterminada)` (comportamentais); `evidence.unit:266`, export ausente (estrutural). Cada teste parou na 1ª asserção falsa |
| GREEN `green-1` | `e06e4dd` + testes + correção, 19:39:32–19:39:55 UTC | **19/19/0/0**, exit 0 natural; os três novos com todas as asserções |
| K1 | `placeOf` antigo nos dois usos | 8/6/2/0, exit 1 natural: os dois testes novos do `agents.e2e` |
| K2 | `unheldPlace` sem `unsure` | 11/9/2/0, exit 1 natural: o teste novo do lugar neutro e o da S13 (`:231`) |
| K3 | indeterminada para tudo fora do lock, mantendo a tomada | 11/8/3/0, exit 1 natural: o teste novo (`rmdir lock.reserva` depois do rename concluído), o `:231` e o `:184` (C47 em processo) |

Todas com `checkoutSame`. O primeiro K3 (`() => UNSURE_PLACE`) foi recusado por mim antes de qualquer execução, porque o
teste cairia no rótulo da tomada, sem alcançar o ramo do rename concluído. O Root o preservou como
`controls-1-manifest.json.rejected-before-execution` e corrigiu só o K3 no manifesto. Os 14 mutantes e o E5 não se repetem:
o produto `13ecc07` e as provas da S13 são os mesmos, por identidade.

### Processo, incidentes e limites

- **Incidente**: antes do registro, `… | tee /tmp/x` no Git Bash sobrescreveu `C:\Users\paulo\AppData\Local\Temp\x`, que já
  existia (birth 26/09/2026), sem cópia. Impacto desconhecido; o arquivo não foi tocado de novo
  (`builder-uncertain-place/incident-tmp-x.md`).
- **Interrupção**: o Root encerrou só a minha CLI (pid 91848), e a sessão 83978 terminou com exit −1, sem nenhum teste ou
  gate iniciado. A retomada ampla seguinte foi recusada pela revisão automática.
- **Fases restritas**: a edição sem shell, PowerShell nem Write; a execução só por comando literal, com hashes, HEAD e
  status fixados e claim contra repetição. É controle de ferramentas do Root, não sandbox de sistema de arquivos do SO. O
  `TEMP` do processo foi preparado como privado, mas o `/tmp` explícito do Git Bash continua global.
- **Atribuição**: as mutações e as provas de comportamento são minhas; o controlador, os manifestos, as raízes registradas e
  retidas e os hashes são do Root.
- **Pendente**: o commit do código e dos registros (Root), os gates A/B/C/D do novo HEAD por comandos fixos, a verificação
  independente 25 (não iniciada) e a formal 14 (sem uso). Nada aqui é PASS global, `ready`, CI ou merge, nem afirma impacto
  global zero.

### Gates no último código (`a1156da`, árvore `bdd35fe2…`; `author-s14/`, controlador do Root; uma execução de cada)

| Gate | Ambiente | Período (UTC) | Resultado |
| --- | --- | --- | --- |
| A | Windows, Node 24.22.1, npm 11.19.1, concorrência 8 | 20:04:51–20:12:09 | **643/630/0/13**, exit 0 natural; status vazio antes e depois; raiz removida por `dev`/`ino` |
| B | clone novo `autocrlf=true`, Node 24.13.0 oficial (zip = SHASUMS256), npm 11.6.2, concorrência 8 | 20:12:20–20:19:17 | **643/630/0/13**, exit 0 natural; clone conferido e removido por caminho real, `dev`/`ino`, toplevel e HEAD |
| C (inicial) | WSL | 20:19:37–20:19:40 | **não iniciado**, 0 testes (wrapper 1, controlador 2). Erro de infraestrutura do Root: archive com CRLF (árvore `f0fda628…`) e concorrência 8 declarada contra 7 |
| C2 | WSL, uid 1000, `env -i`, Node 24.13.0 copiado, PATH sem `/usr/bin`, sem agentes nem pwsh, concorrência 7 | 20:22:01–20:23:18 | **643/621/0/22**, exit 0 natural; árvore `bdd35fe2…`, 0 CR; scratch removido por uid, dev e inode (`C2/C.log`, `C2/C.run.txt`) |
| D | `npm test` completo, Windows, Node 24.22.1, runner 8 | 20:23:30–20:31:55 | **1.076/1.056/0/20**, exit 0 natural: governança 27/27/0/0, motor 16/16/0/0, doctor 417/410/0/7, integrações 616/603/0/13 |

- A concorrência sai do mesmo contrato, min(CPU−1, 8): 8 no Windows e 7 no WSL.
- Os três testes novos passaram em A, B, C2 e D.
- No D, passaram os 11 nativos com runtime Hermes e o I4-C35; o caso pelo Python do sistema também passou, sem ser runtime
  Hermes.
- Skips: os mesmos IDs e motivos do bloco S14 do `Handoff`.
- O C2 mudou só a infraestrutura do Root (archive com `core.autocrlf=false`, guarda de árvore igual e concorrência 7); o C
  original fica preservado. Os `budgetMs: 1200000` dos manifestos e claims de A/B/C eram metadado obsoleto; os limites
  efetivos são 30 min em A/B/C e 2 h no D.
- Produto `13ecc07` sem mudança, e as provas da S13 valem por identidade.
- Nada disto é PASS global, `ready` ou CI verde.

## Lock tardio na prova do C46 (p) (F1 da verificação 25; refinamento do C46 (p)) — diagnóstico e probe, antes do código

Autor/diagnosticador Claude novo (S15), não o autor S13/S14 nem o Verifier 25. Linha “Fim da liberação esperado na prova do lock
tardio” do Landing; detalhes no bloco “Lock tardio na prova do C46 (p)” do `Handoff`. Arquivos em
`.checks/code-review/issue-25/builder-round25-diagnostic/`: `findings.md` (hipóteses, método e retificação 1), `probe.mjs`
(SHA `8e8f31ac…`), `probe-{A,B}.log`, `probe-{A,B}-result.json`, `-claimed.json`, `-identity.json` e o resumo de metadados do
Root `probe-summary-root.json` (não é prova nova).

### Execuções (controlador do Root `worker-guard/diagnostic25-controller.mjs`, manifesto `diagnostic25-probe-manifest.json`)

| Etapa | Node | Período (UTC) | Resultado |
| --- | --- | --- | --- |
| A | Windows v24.22.1 | 21:18:10–21:18:48 | `--check` 0; exit 0 natural; 117 entregas; 0 divergências |
| B | Windows v24.13.0 (zip conferido) | 21:18:51–21:19:31 | `--check` 0; exit 0 natural; 117 entregas; 0 divergências |

Iguais nas duas versões:

| Caso | Entregas | Estado no retorno de `settle()` | Relatório | Liberações no retorno → depois | Tempo da entrada ao retorno | Atual × nova |
| --- | --- | --- | --- | --- | --- | --- |
| K0 sem intervenção, as 4 iterações | 100 | 2 liberações concluídas, nada em voo (sem vencedor) | o código de cada iteração, 1/0/0/1 | 2 → 2 | A 4–48,2 ms; B 5,3–45,3 ms | passa × passa |
| K1 `rmdir` da reserva parado | 8 | em voo: `rmdir` da reserva | `lock_present` ou `delivery_timeout`, 1/0/0/1 | 1 → 2 (espera 30–31 ms) | A 660,5–687,3; B 658,0–688,3 ms; **≤ 750 nas 16** | falha × passa |
| K2 criação do lock parada | 4 | em voo: `writeExclusive` do lock | `lock_present` 1/0/0/1 | 1 → 2 | A 679,1–693,5; B 678,7–686,1 ms (só registrado) | falha × passa |
| K3 laço bloqueado 700 ms, sem disco lento | 4 | em voo: `mkdtemp` da reserva | `lock_present` 1/0/0/1 | 1 → 2 | A 720,9–733; B 722–738 ms (só registrado) | falha × passa |
| K4 `rmdir` da reserva com EPERM simulado | 1 | passo do lock com erro, nada em voo | `lock_present` 1/0/0/1 | 1 → 1 (espera esgotou: 15.014 / 15.019 ms) | A 39,3; B 35,4 ms | falha × **falha** |

Em todas: nenhuma criação a mais, nenhum `.lock` no fim, árvore da captura igual, `persisted` 0, export vazio; a única sobra
é a reserva vazia do K4, efeito esperado da falha.

### Leitura e limites

- Demonstrado só em reprodução controlada: o timer real que resolve a corrida com a operação em voo produz o `[3, 1]` do B,
  e a tentativa devolve o lock depois, sem gravar nem repetir (classe H1a/H1b). O B não está discriminado entre H1 e H3
  (liberação que falhou); não guardou o estado do io.
- O K0 (200 entregas) não reproduz o B e, com 2 liberações no retorno, não diz quem resolveu a corrida.
- O ≤ 750 ms do K1 vem com o relógio injetado parado em 0, em que o produto não garante esse limite; a menor folga foi
  ~62 ms. K2 e K3 não têm limite: são experimentos controlados.
- O RED é comportamental, do probe (forma síncrona × forma sincronizada); não há RED natural do teste versionado.
- Processo: só os dois comandos do controlador foram executados. Uma tentativa minha de `node -e` para resumir os logs foi
  bloqueada pelo guard antes de executar. O controlador confere o SHA do Node antes do spawn (não depois) e as fontes, HEAD e
  status antes e depois; raízes retidas, sem limpeza; não é controle de sistema de arquivos do SO.
- F2 (T8-C8): FAIL com causa física desconhecida, fora do probe, sem nenhuma mudança.
- Nenhum produto, teste, apoio ou prazo mudou nesta etapa. Pendentes: a edição de `concurrency.cli.test.mjs` e os gates do
  autor (bloco do `Handoff`), a verificação independente 26, a formal 14 sem uso. Nada é PASS, `ready` ou CI.

### Correção e gates do autor (`eb6999e`, árvore `e90e0d65…`; `author-s15/`, controlador do Root, execução minha)

- **O que mudou**: só o teste `I25-C46 prazo da entrega: lock obtido … antes do onLock …` e o comentário de `lockTakenAt`, em
  `tests/integrations/traces/concurrency.cli.test.mjs`. A mudança espera as 2 liberações com o `waitUntil` existente e
  registra o estado observado no retorno; as asserções exatas ficam como estavam.

| Gate | Ambiente | Período (UTC) | Resultado |
| --- | --- | --- | --- |
| A | Windows, Node 24.22.1, npm 11.19.1, concorrência 8; os 3 arquivos inteiros | 21:36:50–21:37:30 | **34/33/0/1**, exit 0 natural |
| B | clone novo `autocrlf=true`, Node 24.13.0 oficial, npm 11.6.2, concorrência 8 | 21:37:33–21:39:21 | **34/33/0/1**, exit 0 natural |
| C | WSL uid 1000, `env -i`, Node 24.13.0 copiado, 0 CR, concorrência 7 | 21:39:24–21:39:52 | **34/34/0/0**, exit 0 natural |
| D | `npm test` completo, Windows 24.22.1, runner 8, TEMP de 130 caracteres | 21:39:55–21:40:32 | **FAIL**, exit 1 natural: 43/41/2; motor C5/C6 `Filename too long`; doctor e integrações não rodaram |
| Comparação | os mesmos C5/C6, Node, argumentos e fixtures; só o comprimento do TEMP | 21:48:12–21:48:29 | 130 → 2/0/2; 68 → 2/2/0 |
| D2 | igual ao D, com TEMP sob o pai curto `t-cC8CC0` (68; efetivo 92) | 21:52:18–22:00:22 | **1.076/1.056/0/20**, exit 0 natural: governança 27/27/0/0, motor 16/16/0/0, doctor 417/410/0/7, integrações 616/603/0/13 |

- **Skips do D2**: os 7 do doctor são `{ skip: process.platform === "win32" }` na fonte, sem texto de motivo. Os 13 das
  integrações têm motivo de plataforma e estão listados no `Handoff`. O skip de A/B é o `T8-C4 … sinal POSIX`.
- **No D2 passaram**: os 11 nativos do Hermes, o I4-C35 e o `I23-C8 … pelo Python do sistema`, que não é runtime Hermes.
  Nenhum modelo real foi chamado.
- **C46 (p)**: 16 iterações (A, B, C e D2), todas com 2 de 2 liberações concluídas no retorno; isso não indica vencedor.
- **T8-C8 positivo**: passou em A, B, C e D2, o que não resolve o F2 histórico.
- **Limites**: a comparação 68 × 130 e o efetivo de 92 não são limite universal nem mostram qual camada do Git falha. O
  core é igual à base, sem `longpaths` nem config global.
- **Desvio de método**: o D2 foi chamado em segundo plano (`timeout` 7.200.000) em vez de em primeiro plano com 900.000;
  esperei o fim real. A justificativa dos 600.000 ms era leitura da ferramenta, não limite demonstrado.
- **Pendentes**: verificação independente 26, formal 14 sem uso (13 tentativas, teto 14), publicação, medição manual e cinco
  checks. Não é PASS global.


## Abertura S16 — I25-C43 da manual40969866439 (antes do código)

HEAD58ffff4: Verifier26PASS50/50, formal14ready, CI do PR40969777477 cinco success. Manual40969866439: Windows123783727441 e CI123787402546 failure, demais success. Windows gov27/27,motor16/16,doctor417/410/0/7,integrações616/591/1/24 naturais; PRWindows616/592/0/24. Ubuntu em ambas1076/1053/0/23, macOS1076/1051/0/25, ACLnativaMac passada; T8-C15/C16/C8/I23-C10 e8casos de prazo executados nesses logs.

Falha única: I25-C43 transitório end.e2e:832, após recuperação/isolamento já afirmados. Actual launch:true/code:delivery_timeout/entries1/committed0/persisted0/lost1; esperado LAUNCHED(1). Sem operação específica no log desse caminho; causa física desconhecida. Logs integrais próprios remote26-{pr,manual}-{windows,macos,ubuntu}-decoded.json, metadados remote26-results-final.json. Sem rerun inalterado nem merge.

Diagnóstico123783649555 success no mesmoHEAD: 4500/4500, schema2individual, A1/B/A2C:/D:, zeroerro/incompleto/linhainválida,10métricas1500amostras/fase; filhos0/semsinal e limpeza3zeroerros. Releasep50/p99/maxA1 2.563/9.863/932.634,B1.875/6.857/11.168,A2 2.553/9.791/145.993ms. A1contagens>=600/650:take1/retire1/release2/write1/rename1/removeRetired1, sobrepostasnão7ciclos; B/A2zero. Cargasescritas245/1434/270. ValidadoRoot em manual26-measurement.json/-validation.json e log preservado. Não atribui causa da entrega; não é SLO nem disputa/pipelinecomchave.

Claude diagnóstico readonly40292 e plano82720 terminaram0/0BG e source58ffffclean. Report builder-ci26-diagnostic/findings.md lido integralmente peloRoot; fontes/omissões anteriores preservadas e adenda concreta. Sessão declarou≈170ktokens de leitura e encerrou semBUILD. Root anotou D1/D2/D3 e P1corrigido no plano .tasks/issue-25-c43-diagnostic-plan.md antes de qualquer código. Autor novo sóend.e2e/artefatospróprios; leitura mapeada da fatia com estimativa≤150k, semclaimdefeatureinteira. Ainda nenhum teste/sonda foi executado para S16.

Preservar globalTemp/xpreexistente sobrescrito, semcópia conhecida/impactodesconhecido; nunca tocar. Guardas restringem ferramentas, não são sandboxFSdoSO; sem retomada ampla rejeitada, shell geral ou limpeza global. Auditoria26 terminaantesformal14; futuraauditoria deve declarar janela incluindoformal14/CI/S16, sem causalidade/impactozero.


## S16 — provas executadas e D vermelho; abertura S17

AutorClaude S16/read38713/code97193/exec12025, UUID4429ddaa-304d-4267-8fd2-e608cc49e201. Exec02:11:49.509–02:32:39.811UTC30/10/2026 terminou0/0BG, HEADceb46931fd0cc682bc93560f80d7f1e3e205c5c5 limpo/tree7a4512b0049532f44f69212e2f1910b674047549. Root leu relatório literal inteiro builder-s16/report.md. Código sóend.e2e:89add8remove, originalC43corpo/asserçõesconferidosliterais. Leitura4085/4085exatas/23chunks/semomissão de pacote; task/checklist sóvistasmapeadas, estimativaREAD127845tokens/2.5chars+reserv20k, finaldeclarado≈142k, nãoTokenizer.

RED02:12:16–02:15:07 natural1:30/26/3/1, exatamenteK1–K3vermelhospelomotivo“a rotina passou”,K0verde. P1duascópias02:15:31–02:15:54 naturais1,cada1/0/1/0:mesmoK0nome/testAt848/actualdelivery_timeout1/0/0/1/expectedLAUNCHED(1)/deepStrictEqual; timingpreload/pendenteefetivonosdois, sócomadoção evidênciacomumdos2produtores+open segmento.tmpsob1ºlock. Sãovermelhoscontroladosválidos, nãogateverde/causafísica.

A02:16:05–02:19:06 Win24.22.1:30/29/0/1; B02:19:11–02:22:08 cloneautocrlftrue/Node24.13.0:30/29/0/1; C02:22:13–02:23:38 WSLuid1000Node24.13.0:30/30/0/0. Arquivoendinteiro, K0/K1/K2/K3verdes; únicoskipAB C33POSIXporComSpecWindows. Conc8/8/7. D02:23:43–02:31:39 natural1,total1079/1057/2/20,cancel0. Gov27/27,motor16/16,doctor417/410/0/7,integs619/604/2/13; K0/K1/K2/K3PASSD. Todos6comandosforeground600000/run_in_backgroundnão, umaexecuçãocada;parounoD, semrerun. Logs/resultados/identidadesauthor-s16retidos. CLIexit0nãofoiPASSproduto; S16aberta.

D.log1191–1231: I4-C34g unit:409 label“fonte registrada já ausente” instalaçãoexitCode5vs0; I4-C34f partialHermesRegistryCLI:1375/caller1465 labelpartial-empty-cache-alone instalaçãostatus5vs0. Antesdosrespectivostestesremoção/parcial; causa/operationausente. ArquivosforadiffS16não provamindependência causal. NãoatribuiraAV/disco/loop/Node/EPERMsemprova.

DiagnósticoS17frescoClaudeUUIDbf1d494e-f889-4bd4-b894-37574b62ea52/PID70744/CLI73564,02:34:52.240–02:41:30.196UTC, natural0/0BG/HEADcebclean. NativeReadGlobGrep+Editownfindings, semBash/Write/PS/Agent/Web/código/provas. Root leu findingsinteiro; read-coverage-rootconfereunit2756/run978/io124 e fontes/rangesdeclarados, não cognição. FindingsnãoalegafullCLI/task/checklist; estimativa115kdeclaredchars/4. Nenhumdefeitoprodutoconfirmado, reportdescartadonasasserções; 5podeincluirio_errornãoE/S. PlanoRootS17vinculante eLandingantescódigo: doisarquivosde testes, evidênciaresultadosexistentes+wrapperlocalneutroFS_OPS sóunitinitialinstall, nãoproduto/helper/preload/workflow/core. Pathsrelativoshome/fora neutralizado, nenhumbytes/stack/env/target. Mesmosassert0/args/this/erro/ordem, controlesemcópias+neutralidade antesABC/D. Novoautor inteirobatch≤150kmedidoantesescrita. Nãoformal/Verifier27/push/CI/mergeainda.

Rootpreparouprepare-verifier27/launch-verifier27masNÃOinvocou; esperadodeltaidentityprecisaráincluir2novosarquivosS17+end, e fontes/planoS17antesdespacho. Nãoéverificaçãoexecutada. HistóricoFAILs/omissões/incidentes/Temp/xsobrescrito semcópiaconhecida/impactodesconhecidointacto. NuncatocarTemp/x; ferramentasrestritasnãoOSsandbox; auditoriaWSLnãoimpactglobalzero.


## S17 A vermelho e experimento S18 antes de executar

S17 fonte7e82e3b: oito controles válidos, naturais, REDunit/K1/K2/K3/REDcli/K4 cada2/1/1/0skip, REDN1/0/1 eNcorrigido1/1/0. F1loggerpushmascaravaerrocomarrayfrozen; snapshotpre-fix1autoralnãoGit, mesmaNantes/depois comprova regressão. A40/36/3/1naturalFAIL03:19:20–03:21:17UTC30/10, cancel0, três instalaçõesHermes5vs0: unitinstalledTarget793/C30d,CLIC27:552,CLIC34f:1593partial-orphan, fora dos pontos instrumentados. B/C/DNÃOexecutados. AutoraCLI89756terminou0/0BG03:22:22.554UTC/sourceclean, RootleuEXECinteiro; nãoéPASS nemcausa. “Falha sóvisíveldepois”retificadopeloRoot: evidênciadeoperaçãoapenasdepois, errojávermelhoantes/depois. Débitoprojeçãoduplicada2consumidoreslocaisaceito/semrefactorforaescopo. Tudoanteriorpreservado.

Plano técnico vinculante Root [.tasks/issue-25-hermes-install-probe-plan.md](../.tasks/issue-25-hermes-install-probe-plan.md), antes do experimento. FatiaS18 inteira: Claude novo escreve sópuretransform+relatório próprios, nenhumSourceversionado; cópiaownedunitapenda1testediagnóstico selecionadosozinho. DuasinvocaçõessequenciaisNode24.22.1/24.13.0, cada100instalaçõesHermes/50homesvazios+50fixtureCLI/mesmaordem/Source/concurrency8/TEMPprivado. Reusetrace/projectionexistentes, guardarcódigo/fase/rejeições/duração semSLO. Contagem100medeCOLETA,nãoexige100sucessos: experimentoexit0NÃOgateverde. NãoéT8-80nemmedição4500. Source/tests/helpers/core/workflow/package/retries/prazos/contagensoriginaisintactos. Autor≤150ktokensmedidoantesescrita,vistasdeclaradas, RootmantémC1–C50/9ACeVerifier27finalcompleto. Semrerungateinalterado, semprodutofixporhipótese, semnovoheadCIantesready.

Abandonado: ampliaràscegasimplantação/retry/aquecer/tolerar5/ignorarerroouvalidargateporcontrole. Ampliar mensagens dos demais setups é opção agora demonstrada pela migração, a ser concretizada após dados sem nova pergunta de rodadas. Próximocódigoexigeplano/Landingantescomoantes. AindaNÃOindep27/formal15/push/CI/merge;14formais/26indepconsumidos,histórico/auto-review/Temp/xglobalpreexistentesobrescritoSEMknowncopy/unknownimpactjamais tocar, controlesferramentanãoOSsandbox/auditoriametadadoslimitadapreservados.


### S18 concluída e proposta S19 aguardando decisão (sem código novo)

S18ClaudeD381PREPARE78650/PID95220 natural0/0BG03:42:16.507UTC eEXEC86045/PID20472 natural0/0BG03:50:04.719UTC30/10, FonteHEADf0af0fd clean. Pacote2054/2054linhasexatas/14Reads, zeroerro/mismatch,10fontes/vistas; estimativaRoot54750+20kreserva eautor≈73k+20k=93k. RootleuReport/módulopuro4984da36inteiros; verificaçãoPURAdeliterais/prefixo/fixtures/newlinerealpassou, nãoNodeProduct. Somenteownartefatoseditados.SourceHashmanifestworkingCRLFvsGitLFseparados/pinned; RootSourceguardsexigiramamboscorretos.

Duascoletas umaexecuçãocada,default8/sótestediagnóstico100instalaçõesseq/50empty+50configured/cada, natural0/tests1/1/0/0skip/cancel0. A24.22.1 03:48:25.044–03:48:31.436,99exit0+1exit5(index5empty20.57ms); B24.13.0 03:48:36.130–03:48:41.995,98exit0+2exit5(indices15/99empty16.76/22.73ms). MesmagráficaSource; diferença deFonteapendadaesperadapelo reportPathliteralpróprio, nãoalteraProduct. Todos3incomplete/errorsEPERM/artifactsfailed/únicarejeição≠ENOENTrenameplugins/.skill-me-observer.skill-me-tmp→plugins/skill-me-observerEPERM,29ENOENTnormaisantes/statdestinoENOENTdepois. Arquivos/relatóriosRootwxvazioanteschild/appendapenas/identidadedevinotypeigualdepois,raízesclonesretidos/childscratchcleanup. Nenhumretry/Sourcefix/novoagentecomoFixture. Zero da coleta NÃOproduto verde;3/200NÃOatribuiçãoaNode/caso/AV/handle; nãoexplicaautomaticamenteS16/S17semoperaçãohistórica.

PropostaS18readonlyCLI33565/PID68776 03:58:21.549–04:02:22.698UTC natural0/0BG/clean, SourceReading≈103ktokens, SEMBash/código; RootleuFULLPREPARE/EXEC/PROPOSTA. FontepropostaS19Root .tasks/issue-25-hermes-staging-retry-proposal.md prontaANTEScódigo, PENDENTEproprietário. Novo comportamento até630msadicionaisnaetapaDIR/mesmos6delays7attemptsEPERM/EACCES/EBUSYWindows, EIO/POSIX1; nãoaumentalimitesentrega/testes/jobs, masjanela de hermes.lockmaior.GuardasidentidadeBigInt/completude3bytes/destinoausente/ancestraiscadavez e limpeza; Rootrejeitafallbacksemidentidade →5fechado,semerrnoinventado; corrigeafirmaçãoerrada“POSIXsemnovoawait”parasemnovaesperaderetry.RetificaçãoRoot: C29bwaitedUnderOneSecondfazDate.now()-started-accessMs<1000+500, manterexpressãoexata1500ajustados,não1s.

Justificativadadecisão: AGENTSaprovaçãoexplícitaparaescopo/decisõesbloqueantes; planosdiagnósticosS17/S18deixaramprodutoretryfora. Autorizaçãoderodadasnãoaprovaessaampliaçãoautomaticamente.InterpretaçãoéRoot, não rejeiçãoautomáticanova. NenhumCodeS19foiescrito; apenasplano.Provasnovastransiente0/permanente7→5/EIO1/POSIX1/guardssemacessoalheio/delays630exatos, existingtestsalldoNotChange; compararS18AFTERmesmogerador100x2semSLOdepoisAPROVAÇÃO/correção.PropostaTECHcompleta,exceçãodecontrolesS17antigos1attemptpermanentesNÃOreescrevehistórico, novosS19seguem7.No Source/helper/core/workflow/packagechangeagora.

S16D/S17AcontinuamFAIL; BCDS17omissõesdeclaradas. Aindasemindep27/formal15/push/novoCI/merge.14formais/26indepconsumidospreservados. Pacoteprivado/HandoffnovoautorS19estimado93k+20kmedirantesBUILD; RootmantémfeatureC1–C50/9AC. Auditoria27futurapartirFINAL26incluiS18atéD27real, sómetadadosWSLnãoimpactozero. Histórico/incidentes/limitesAutoReview/GlobalTemp/xPREEXISTENTEsobrescritoSEMknowncopy/unknownimpactsemnovotoqueinalterados.


### S19 aprovada — início antes do BUILD

Proprietário respondeu “Autorizar correção pontual e seguir até merge”, registrado em https://github.com/oldboydev/skill-me/issues/25#issuecomment-6520123791. A decisão pendente dos blocos anteriores foi resolvida; preservar esses registros como história. Plano .tasks/issue-25-hermes-staging-retry-proposal.md agora tem atualização e contrato técnico Root antes do código. Autorizados7attempts/630msDirectoryWindows, guardasBigInt/bytes/ancestrais/destino e falhafechada; EIO/POSIX1/erropermanente5/testesprzosintactos. Ainda nenhum códigoS19/prova nova foi escrito/executado neste registro.

Root concretiza prova determinística das esperas: helper interno com efeito wait(defaultsleep) compartilhado por2consumidoresreais e provaC34l com lista literal10/20/40/80/160/320+ordem/soma630; sem nova opção em runIntegrationCommand/CLI ou mockglobal. FonteS19run.mjs e APPENDnovoC34k/C34l naunit; importcontratosepreciso. Doisarquivos existentes+docsRoot, semnovohelper global. GuardasBigIntantescadauso/cleanup; identidadeindisponívelio_error5, nuncafallback; rootstate trocado preserva política de lock existente e não autoriza acessoatravésalheio.

TDD antesproduto: autor novo recebe pacote literal com plano/contrato/tabela/Sourceviews, orçamento medido≤150k; lê e desenha, escreve testesprimeiro, REDcontroladoRoot, alteraSource, GREEN/ABC/D e comparaçãoS18AFTERmesmascondições. DepoisRootwholeVerifier27fresh50/9/fullABCD, histórico/auditoria, formal15ready, contexto/refsfrescos, push e PR+manualtodos5checks+schema2A1/B/A24500green, merge jáautorizado. Sem pedirnovasautorizaçõesrotineiras/rodadas. TodosFAILs/omissões/incidentes/Temp/xsobrescritoPREEXISTENTEsemknowncopy/unknownimpactsemnovotoque preservados. Pacoteprivado.

### S19 encerrada pelo autor — próxima verificação27/revisão15 registradas

Cabeça executada f9039f6f64a4f23d93c0f1ba307407f03586d952, autorClaude sessão2e16a68e-ddc7-4a1d-b7e7-b2ee4265680f. R4 A56/55/0/1, B56/55/0/1, C56/55/0/1, D1095/1075/0/20, todos naturais0/zero cancelamentos/sem mudança de Source durante gates. A/B dois arquivos completos de instalação, C mesmos dois emWSLNode24.13LF/conc7, DnpmtestcompletoWindowsNode24.22.1/conc8/TEMPcurtoOWNdesdeinício; WindowsNode24.13cloneautocrlftrue emB. Controles nomeados C34k/l/m/n/o e consumidores reais executados; n/o provam as contagens simuladas EXATAS3/[10,20] eEIO1/[]/mesmoerro, sem operação do instalador enquanto montagem pendente. A simulação não inclui rename físico; montagem posterior usa política/guards existentes e propaga falhas. Relatório autoral ignorado builder-s19/report.md SHA2568744b090e85c5ed3d7b95b10f357c0ef975f2a6f09d5733cdec0e5485e012640; unitrawSHA9ccb19219057ea32672b722f21d154611bb2960e999d0b00ffe45098168c509f. Root leu diff inteiro de cada correção, conferiu restauração literal de todas as asserções e fez somente revisão estática/sintaxe, não se atribui execução autoral.

Produto S19 c94cdab (P0fb88ac5/F1rootbeforemkdir corrigido) mantém helper único renameRetrying; DIRWindows só3códigos7attempts/630ms, FILEsequência existente preservada, EIO/POSIX1. Captura devBigInt>=0/ino>0/dirrealroot/plugins/staging; revalida identidade/completude3bytes/destino antescadaattempt/limpeza e protege manifest/lock pela identidade adotada. Sem identidade falha5semfallback/errnoinventado. Não é CAS; janelas concorrentes e mesmoarquivo combytesiguais dentroMESMAdir não distinguíveis pelo contrato. Única ampliação autorizada6520123791 incorporadaAC2/AC9 mantendo9AC/50checks e prazos.

Falhas preservadas: S19Aoriginal50/48/1/1FAILC34híndice8/ENOENTlisting semoperação anterior registrada; BCD/AFTER não rodaram. ProbeC34h100x2 identificou7renameSyncEPERMdaFIXTURE, não erro físico de write; não prova causa histórica específica. Correção awaitswap e mover na montagemC34h (14cenários/assertsintactos), REDn3/0/3 natural1; R2A53/52/0/1PASS, B53/51/1/1FAILC34i/artifact1/swapfalse/EPERM5, operação físicaB desconhecida; C/D/AFTER omitidos. Extração do runner existente deN paraN+O mantém assertions; REDn/o6/3/3natural1 (N3PASS/O3FAIL). Correção awaitswap/mover noC34i (13cenários/assertsintactos) em8b690bd. R3A56/53/2/1FAIL: Ncontava4/[10,20,40] ao misturar3ºrenameREAL comfakes, outros camposiguais; BCD/AFTER omitidos. Decisão Rootb2f583e antesfix f9039f6 separaE/Sfísica econtagemcontrolada, SEM relaxarasserts, novoR4 inteiro verde. Históricos REDk/l9/1/8 eREDm1/0/1 também preservados. Prefixoantigo2838exato era fato pré-fixfixtures; finalnãoalega prefixointeiroigual, e simasserts/expected/payloads/ordem/casos/prazos preservados por restauração inteira dos trechospermitidos.

ComparaçãoS18antes/AFTERmesmogerador100x2/50empty+50configured/Nodes24.22.1+24.13/mesmaordem+conc8+TEMPcurto: antes99/100e98/100saídas0,3EPERM promoçãoDIR; depois100/100cadaNode,0saídasnãozero. Coletaexit0sozinha não é produtoPASS; Root conferiu todosregistros/fontes/hashes/arithmetic, comparison-root.json. Durações observadas semSLO/AV/Node/handleowner/causalidade histórica; sistema/tempo não são controlados. Não substitui esquema2A1/B/A2/4500 remoto FINALHEAD.

Orçamento S19fontes teto150k mantido/sameautor/mesmafatia inteira; medidaRoot130186SOURCE+19131RUNTIME emreading-classified-root.json corrigecontagem148810all-output antesR2, originalhandoffdistinguiaruntime e TLCreserva restantejanela para failingtests/runner. Prompts/metadados/packimutável conservadoramenteSource, sómesmobatchBash/TaskOutput/logs classificadoRuntime; estimativasautorações subsequentes declaradas, não tokenizer. Histórico dos contadores antigos preservado; nenhuma ampliação deperfil/tetoaprovada porsilêncio. Root/Verifier mantêm50/9fontesinteiras, autorrecebeuvistasdeclaradas; sematribuirleitura canônica inteira aoautor.

Registro específico https://github.com/oldboydev/skill-me/issues/25#issuecomment-6523482087, sob6502294779/6442514838 e6520123791: próxima independente27 fresca sobre featureinteira50/9 e formal15 necessária, histórico26/14preservado, sóissue25/lightmax15/global2/core5mesmos. AindaNÃOexecutadas/PASS/ready/CI. Auditoria27baselineFINAL26(29Oct22:41:56UTC12113) inclui formal14/CI58/S16/17/18/S19atéD27real; fecha sódepoisD27, nãoinventaD25/final25. TodosFAILs/incidentes/skips/omissões anteriores mantidos. GlobalTemp/x PREEXISTENTE sobrescrito S14, SEMcópiaconhecida/impactodesconhecido/nunca mais tocar; broadresume auto-review recusadoantesstart, alternativa restrita não é sandboxSO/TEMPnão remapeia/tmp. Auditoria metadadosWSL/stringtarget não prova conteúdos/Windows/PS/rede/TEMP/proveniência/impactozero.

Próximo: Verifier27 lê cópia fiel de todasfontes exigidas, carryR26 sócomGitblobidentity de4deltas executáveis, atualS19fresh e ABCall68integrações+2governança/Dfull. LiteralPASS prepend.verified495744bytesanteriores exatos, formal15ready/sufficient/9met; parar primeiroreadyválido. Contexto/refsfrescos/pushbranch, umanovaCI manual ePR mesmoHEAD, ambos5regularesverdes e esquema2A1/B/A2/4500novo antesexpectedSHAmergejáautorizado; issue25fechada/Project3Done. SemnovoPR,mainpush,publicação ou novosprzos. S17controlepermanente1attempt histórico nãoalega policyatual7PASS.

Conferência final Root: leituraSource136947tokens estimados/150000, runtime20761separados, saldoSource13053; reading-final-r4-root.json preserva classificador anterior. AutorCLI13:00:12.304UTC encerrou0/0BG, Sourceclean. Rootconferiu5nomesnovos/G1–G7emABC; noD11HermesnativossemSKIP(622–633exceto632), PythonSistemaseparado632, I4C35linha1114;20skipscomnomes/motivosretidos, A/BLinuxACL1cada, CWindowsDACL1. Nos200registrosAFTERtodosstatusapplied/2stepsdone/errors[]/conflicts[], índices1–100alternandoempty/configured50+50, nenhumrejectednãoENOENT; sempromessaestatística. P50antesA18,4699/B16,6571ms→depoisA38,0345/B38,4269ms; p99antes43,7895/23,7143→depois142,7235/66,7284ms; máximos65,8561/24,0123→145,6040/84,2245ms. A duração aumentou nesta amostra; não é SLO nemprova de causa, tempo/cargadoSO não controlados. Nãoocultar essetroco por sórecontarsaídas0. Rootretificouguardadeinfraíndice0pararelatório1–100ANTESdeemitirreceipt, nãofoirerundetest/produto.

### Verifier27 FAIL preservado; S20 diagnóstico antes de qualquer mudança

Relatório literal .checks/issue-25-agent-launch.round27-failed.md (48087bytes/SHA2566c5d1344f8f757a32b456b800fe84145ee4ce2bd701a448601f604d0df69719c). Root leu relatório original45621bytes inteiro5chunks e toda retificação factualdiff; CLIexec0terminou13:33:09.420UTC, mesma sessãoClarify0terminou13:36:47.093, zero tarefas pendentes/semrerun. ABC662/649/0/13,662/649/0/13,662/640/0/22naturais0; D43/42/1/0natural1, governança27/27+motor16/15/1/C11readyTypeError349/attempts[0]undefined, doctor+integraçõesD nãoexecutados. Causa DESCONHECIDA; stdout/stderrCLI nãoobservados. Core5samebase636; nãoatribuir à feature, caminho/TEMP/AV/Node semdados. O FAIL é global, nenhum dos50checks éPASS/0dos9AC, nãoexisteformal15/push/CI/merge novos. Verified495744bytes anteriores intactos, nenhumprependPASS.

Retificação27: nativosHermes11+PythonSistema+I4C35 passaramA/B (145–156/637); C11nativesskipruntimeausente, PythonSistema154/I4C35611PASS. SóDfaltou; AC6exigegatecompleto econtinuaFAIL. R1potencialfixtureK7/K10/K11/m não se manifestouABC, fica dívida semfixcosmético. Fontes recebidas18354/18354/24/117Reads exactnoerrors, não prova de cognição; RootmantémC1–C50/9AC e limitaçõescarryR26 explícitas.

Auditoria27Root apósD27PARCIAL real: 2026-10-29T22:41:56.814Z→2026-10-30T13:39:20.800Z,12113antes/depois/zero differences+errors/mesmoalvoporstring; inclui formal14/CI58/S16S17S18S19atéD27parcial, nãoinventarD25/final25/D27completo. Primeira chamadaWSLsandboxnegouE_ACCESSDENIEDantescoleta, escaladareadonlycompletou; nãonovarejeiçãoauto-review. SómetadadosWSL, nãoconteúdos/Windows/PS/rede/TEMP/proveniência/causalidade/impactozero. Todosincidentes/FAILs preservados; globalTemp/x PREEXISTENTEsobrescritoS14/semcópiaconhecida/impactodesconhecido/nunca mais tocar.

Precisão documentalS19 (retifica abreviação anterior, semSource/testesalterados): completudeEXATA3artefatos/bytes e destinoausente antesdecadaPROMOÇÃO. Limpeza reconfere identidadeancestrais/staging e cadaarquivo ainda presente/propriedadebytes antesdeunlink; stagingparcial/sobra própria é permitido e nãoexige3apósunlink. Guarda de promoção recusada não limpa; falha do rename tenta limpeza conferida/preservaerro. Códigoaprovado794–805/889–918, não é novo contrato.

S20plano .tasks/issue-25-core-c11-diagnostic-plan.md: coletar100casosporNode comhelpersC11originais emcópiasowned/prefixo literal+APPENDdiagnóstico; registrarCLIestado+stderr sanitizado, semalterarcore/gate/prazos/asserts e semretry/nova formal/publicação. AmbienteGitsemconfigreal/transporte ePATHsóGit, nenhumagentereal. Coleta0prova100registros, nãoprodutoPASS; nãoatribuircausa histórica poramostragem. AutorClaude novo prepara móduloPURE/Rootrevisaantes2comandosliterais, leitura medidateto150k+runtime separado/vistasdeclaradas/Rootwholefeature. Rodadasnecessárias jáautorizadas; próximaVerifier28fresh/fullgatesapósresolução, formal15aindasemuso/teto15/global2inalterados, pararprimeiroPASS/readyválido, PR/manual5green+schema2A1/B/A24500noHEADnovo antesmergejáautorizado.

### S20 diagnóstico concluído; proposta S21 pendente de exceção vendorizada

AutorClaude novo1a024862-cd9a-47a0-9a08-8f3d8f855f27: PREPARE0encerrou13:49:28.432UTC, EXEC0encerrou14:01:50.278, PLANreadonly0encerrou14:09:05.997, 0tarefasBG. Rootleu móduloPUREinteiro/reportinteiro+toda§6, comprovou2501/2501linhaspacoteexatas/noerrors, prefixoLFcopiainteiro+APPEND/sintaxe/core5samebase; nãoexecutou testesdeproduto. SourceprepRoot73750tokensconservadores, upperboundfinalFONTES+TODOSoutputs78142/150000 (inclui runtimeaqui por conservadorismo, não redefineteto). Task/checklist/difffeaturenãolidosinteirospeloautor, vistasdeclaradas; Rootmantém50/9. LiteralS20 .checks/issue-25-agent-launch.s20-diagnostic.md (24843bytes/SHA256380f262dbe14dd2f716feb5f8c0769204ce149ed160f791d46ba31a14933a99d) preservado.

Uma coletaA24.22.1(13:54:01–13:57:12),umaB24.13.0(13:57:15–14:01:02),100casoscada/concurrency1, doiscoletores1/1natural0/0cancel/0skip. Issoéintegridadedos200registros, NÃOgreenC11/core/produto. A100normais/B98normais+2CLIfalhos18/43: status1 eEPERMrealrenamecommon.state.json.tmp→common.state.json; comum/local0attempts/tempcomumtrue/templocalfalse/lockausente/semcheckout, fórmulasC11null/null/false/false/true. CLIerro,nãoerrodecoleta; byErrorCodenone100noBsignificaapenascoletor. Rootconferiu todos200registros e fontesgeradasexatas, única diferençaliteralreportabsolutoowned, comparaçãoRootretidaSHAdataA97bed969.../B0990cc55...;198normaiscleanupremoved/2semcheckoutnotapplicable. Prefixotesteoriginalintacto, corecanonical5semalteração. CLIhelpersinais/errorindisponíveisdeclarados.

ObservadoB:falhano2ºsaveStatecomumdepoisdo push emmemória, antescheckout; formatoigualaTypeErrorD27, NÃOprovaqualoperaçãofalhouhistoricamenteali(stdoutstderrnãoobservados). GIT/PATH/TEMPisoladosdiferemD27/semcredenciais/transporte/modelosreais. A0/B2nãoidentificacausaAV/Node/handleowner/carga nemprovaestatística. Pais/cópias/logs/resultados/identidadesretidos; nenhumretry/rerungateinalterado/push/CI/merge. TodosFAILs/incidentes/nativosretificados/auditoria27parcial/verif495744intactos preservados; globalTemp/xPREEXISTENTEsobrescritoS14/NOknowncopy/impactodesconhecido/nunca mais tocar.

PropostaRootconcreta .tasks/issue-25-core-save-retry-proposal.md(S21) PENDENTE: sóEPERMWindowsno renameestado,7attempts/6esperas10..320=630msporsave/até3.780msesperasreviewnovoou2.520mscache, guardasidentidade+bytesTMP/DESTincluindoediçãomesmoinode, falhafechada/últimoerrooriginal/comumautoridade/nenhumrollback/falsoReady, POSIX/outros1semwait; exportinternaltestseamsemAPIdeCLI,16testesexistentesintactos/novosREDGREEN/ABCD/Verifier28/formal15/PR+manual5green/esquema2A1B A24500antesmerge. Issoalteraria3corefiles(review.mjs/test/README), cli/schemaintactos; exceçãoLOCALexplícitaAGENTS/hashes5antes/depois, nãoaltera2pilotos/teto35. RegraAGENTS127–128eexceção7nãoautorizamnovodrift; ownerprecisadecidir essaexceção/escopo novo, não outra rodada. Nenhumcódigo/protótipodafiximplementado. Formal15continuaSEMUSO/teto15/global2; futuroVerifier28depoisresolução, jáautorizadorodadas.

### S21 aprovada — contrato e Landing antes do código

Proprietário respondeu “Autorizar correção local e seguir”, registro https://github.com/oldboydev/skill-me/issues/25#issuecomment-6525782289. Exceção LOCAL explicitada emAGENTS e plano .tasks/issue-25-core-save-retry-proposal.md agoraAPROVADO; issue mantém9AC com ressalvaS21 noAC9 para remover contradição com “somenteS19”. Preservados50checks,16testescoreatuais/todosprzos/pilotos/teto35/filas/contadores/erros. NenhumSourceS21foiescrito neste registro. Configmax15da25 continuausada14, formal15aindasemuso; rodadas necessárias não exigem nova autorização rotineira.

| Landing | Decisão concreta antes da implementação | Alternativas rejeitadas / prova |
| --- | --- | --- |
| S21 persistência do estado do core | Helper síncrono de módulo interno exportado promoteStateTemp(temp,destination,expectedBytes,{platform=process.platform,io,wait}), io padrão lstatSync/readFileSync/renameSync e wait síncrono local; save escreve UMA vez e chama-o para os consumidores comum/local. Sem novas chaves deps/CLI/config, sem importar src do motor vendorizado. | Reutilizar helperasyncproduto alteraria assinatura/fronteira e portabilidade; duplicar saveState ou retryreview muda histórico. Export é seam interno de testes, não nova API daCLI. |
| Política S21 | SóEPERMWindows7attempts/6wait10,20,40,80,160,320=630; sucesso0wait; outroscódigos/semcódigo/POSIX1semwait. POSIX permanece caminho direto sem guardas/esperas extras; Windows recebe conferências aprovadas. | NãoEACCES/EBUSY por hipótese, não fallbackescrita direta/revisãorepetida. P1unitvaloresliterais/erroúltimoobjeto/order e P2C11real. |
| Guardas S21 | expectedBytes é Buffer serializado/copiadocomo referência imutável. Windows captura tempregularsemLink/devBigInt>=0n/inoBigInt>0n+bytesesperados e destino com lstat semseguirlink (ausente ou tipo+identidade; bytes searquivo). Antes de cada repetição exige mesmosIDs/tipos/bytes/ausência; rechecagem rejeitaediçãoMESMOinode. Ausência/identidadeindisponível/mudança falha fechada; semregravar/promover/limpar o alterado. NãoCAS. | Só identidade não pega ediçãoinplace; só bytes não pega cópiaidêntica emoutraentrada. Não seguirlinkspara conferir conteúdo de nãoarquivo. Não inventar isolamento contra proprietário arbitrário de repo. Guarda fora do catch derename: nãoretrydefalhadeguarda; errorealdeE/Spropaga, mudanças/identidadeinválidamensagemprópriasemerrnoinventado. |
| Estado e limites S21 | Últimoerrooriginal noesgotamento, guardascomdiagnósticopróprio; comum→local/autoridadecomum/cache/counter/lock/finallyiguais. Até6savesnew/4cache, máximoSÓDEESPERAS3780/2520ms comlockretido, E/Snão temteto; não muda prazoscontratuais. | Não transação/rollback/pairmirrorcritérionovo; chamada que falha não emite ready. Secommonrelatório válido/local falhou, próxima chamada podeusarcachecomum comoantes. |

Tabela de decisões/provas S21 obrigatórias (refina ferramentasC48, não cria C51): P1(0…6EPERM e sucesso/7permanentes, deltasexatos/soma630/semwaitapossucesso/mesmoúltimoerro); P2EACCES/EBUSY/ENOENT/EXDEV/EIO/semcódigoWindows+EPERMPOSIX1/semwait; P3guardasTMP+DESTtipo/ID/bytes/ausência, cópiasidênticas/trocadas/mesmoinodeeditado/inválidodevino semrenameindevido; P4writeTMPfalha1/nãoretry,nãoreescritaTMPentretries; P5realC11original viaI/Ocontrolado transitório/permanente; P6ordemcommonlocal/proprioredonativeError/contador/lock/cleanup/cache porfaseinitial/attempt/relatório/cache. Teste que sóasserte exportausente não substitui RED nafronteiraC11; namespaceimport evita REDporlinkagem. Os16existentes preservados bytea byte; appendnovosimports/tests sepreciso. SourceTDDTESTantesPRODUCT, Rootrevisanovostestes/commitclean → REDcontrolado → Claudeimplementa → GREENarquivoCOREinteiro nos3ambientes, semnarrowGREENredundante → ABCintegrações+governança/Dfull+S20AFTER100x2; RootSource/no testexecautoral.

Swept S21: validação=IDs/tipos/bytes/ausência; falhas=EPERMboundedoutros1/guardafailclosed; idempotência=cachefingerprintinalterado; autorização=exceção6525782289somente25/local; concorrência=lockwx e waitretémposse/sem escritornovolegítimo; lifecycle=temporáriofalhoficacomoantes/históricopreservado/semnovogc; externaE/S=renameSyncúltimoerro/semredes/modelosnasfixtures; estados=commonprimeiro/mirrorlocal/copiacomumautoritativa/semrollback; observabilidade=CLIerrooriginal/guardasclaras/semerrnoinventado. Não surgem UI/Coverage/Testpolicy/faultinjection extra deperfil.

Handoff S21: umafatia inteira nova de persistênciacore, authorClaude novo(defaultmodel) com pacoteCore/contrato/provas/Fontesvistasdeclaradas≤130ktokensestimados+20kreserva=150k; mediríndicefinalANTESBUILD, runtime àparte. RootmantémfeatureC1–C50/9AC, autora nãoseráVerifier. NãohaveráhandoffmidRED ou releitura dehistóricosinteiros mascaradacomocompleta. S20diagnósticoanteriorfechoucoletaintegra, evidenciou2CLI1em200, nãoPASSdecore; SourceRootfixdocnãoapagaFAIL27. NovoVerifier28fresco/50&9/gatesfull/auditoriaBaselineFINAL27parcialD27/formal15ready/novoHEADPR+manual5green+schema2A1/B/A24500antesexpectedSHAmergejáautorizado. Pacoteprivado/pilotosintactos; globalTemp/xPREEXISTENTEsobrescrito/NOknowncopy/impactodesconhecido/nunca mais tocar preservado.

### Landing S21 — revisão do desenho, antes do TEST

Root leu relatórioREAD inteiro/recepção2923linhas20Reads exatas/noerrors/CLI0/0BG. AprovaD1io completo NodeSync/retornoundefined/D2mensagensCHANGED eUNAVAILABLEliteraisdo report comdestination/semerrno/D3ausênciaTEMPchanged/DESTabsentvalid/invalidBigIntunavailable/outrosE/Smesmoobjeto/D4POSIXdireto/D5preloadsomenteNodeOptionsdosnovostestesrestauradofinally/originalhelpersintactos/D6uma prova defaultwait comhrtimemonotônico>=630somenteinferior/sem teto novo. ComplementoD3: ENOENT da leitura após lstat de arquivo existente é mudança; demaisIOerrors, inclusiveEPERM, propagammesmoobjetoSEMretryguarda.

Ajustes Root antes dos testes (não renegociam barra): unitP1–P4 usaIOvirtualdeterminístico como dado decontratofs(ID/tipo/Buffer), waits injetados e tracedechamadas, sem modelar políticaemfake; hardware real fica P5/P6/C11/S20AFTER. Isso evita repetir falsoRED de fixturesrenamejáobservadoS19; não usar renameSync de montagem susceptível aEPERM nos unitários. G11diretório não pode exigir sucesso nativo file→dir: 2EPERM e depoisEISDIR, últimoobjetoEISDIR/3rename/[10,20]/diretório nãolido/estado preservado, emIOvirtual. G11arquivo permanece sucesso. Acrescentar2guardcasesEPERM: capturaeapóswait, mesmoobjeto/0renameou1respectivamente/semwaitextra; EIO/EACCESsozinhosnão discriminamcatcherradoguardaEPERM. P5C11usar segunda gravação(attempt) comum/local para reproduzirformaS20, nãoprimeira(inicial), jácobertaP6; permaTMPtem1attempt/reportnull, comum/local conformeordem, semTypeErrorantesstatus. Totalplanejado89novos(47unit/6P5/36P6P4), nãoquotaobrigatória; reportcontagensREAIS. Traceapenasordemcontratual(wait→guardas→rename), não impor númerosdeleiturasinventados/encurtarvalidação. 16testes/prefixo894linhasexatos: sóAPPENDimports/helpers/novostestes, namespaceevitaREDlinkagem.

### S21 TEST revisão Root — antes do ajuste pontual (sem execução)

AutorTEST0encerrou15:32:01.923UTC/0BG, sócoretest+ownreport;878linhasAPPEND. Rootleu4chunkscontíguos34253chars/SHA774aa8fa366274d65adc84e808611fd7caeece8d523c947f759f70f1d3914367+report§7/sintaxe; prefixo894linhas/16testesoriginaisEXATOLF. Produto/README/cli/schemaintactos. AindaSEMRED/PASS. TestesderivamP1–P6, contagensplanned89; corrigirANTESRED F1nomesvirtuaisCglobalpara namespacealeatório sobTMPprivado(continuamsemI/Oreal); F2novohelpercleanupcapturaidentidadequandoCLIretornacheckout e confereabsoluto/diretóriorealsemlink/lexical+realpathdirectchildTMPprefixcodex-code-review-/mesmoBigIntdevino antesf.gitworktreeremoveforce. Recusa/falhacleanupdeveaparecerjuntocomerrooriginal(aggregateharness), nuncamascararasserção/nãofingirremovido/retry. Helpers e16testesoriginaisnãoalterar. Não novos critérios/prazos: isolamento/limpeza dentrocontratoAGENTS eWindows. Registarajustes/novohashantesexec.


### S21 — revisão Root dos testes antes do RED

Autor Claude encerrou TESTFIX1 naturalmente em 2026-10-30T15:46:02.613Z, exit0/sem sinal/0background. Root leu todo o diff dos ajustes e §8: caminhos unitários virtuais únicos sob TMP privado; remoção do checkout condicionada a caminho lexical/real, tipo e identidade BigInt capturada; falha primária preservada junto da falha de limpeza. Prefixo original de894linhas/16testes exato LF, sintaxe válida e mesmos89casos/asserts/prazos. Nenhum teste executado ainda; produto/README intactos. Liberação somente para RED controlado no core antigo, não PASS.
