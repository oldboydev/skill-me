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
