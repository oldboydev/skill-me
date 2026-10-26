# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25

**Verdict**: PASS, referente aos checks C1–C45 da entrega (produto e provas). Não é atestado de conformidade do processo desta rodada (linha abaixo).
**Conformidade do processo do Verifier nesta rodada**: NÃO CONFORME. A sonda E executou o Codex CLI real do WSL, contra a instrução explícita de não executar agentes reais. Ver "Desvio de processo do Verifier nesta rodada", corrigido depois da auditoria de metadados do orquestrador.
**Profile**: light
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..d939df84528f6d547cd625544a7b0adeb3565254` (diff da correção: `9cd06d5233a0039fb82dfe9a2f71df2798d471b3..d939df8`; a rodada 4 verificou `e710dc6`, e `9cd06d5` só registrou o relatório)
**Round**: 5 - scoped. Rodada autorizada só para a #25 pelo proprietário: “Autorizar até 2 de cada (tetos 6/5)” ([comentário 6425235841](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6425235841)), com até 6 Verifiers e 5 revisões formais no total, o histórico preservado e parada no primeiro `ready`. As rodadas 1–4 continuam no histórico.
**Verifier**: subagente independente (Claude Opus 5.5), o mesmo das rodadas 1–4, sem contexto do implementador; autor ≠ verificador. Somente leitura sobre código, testes, critérios, checklist e configuração; nenhum commit, push, PR, merge ou `review:run`.

Data: 26/10/2026, 16:25–16:46 (-03). HEAD `d939df8` do início ao fim; `git status --porcelain=v1 -uall` vazio antes e depois (ao final, só este arquivo). O relatório da rodada 4 (PASS 44/44 em `e710dc6`, registrado em `9cd06d5`) foi lido antes de ser substituído. Ele não valida C45: a terceira revisão formal, em `9cd06d5`, apontou um P2 novo e deu os anteriores como fechados.

**Correção factual posterior** (sem nova rodada, sem reexecução de provas, sem executar nenhum programa): a seção do desvio, o veredito em uma linha, os findings e a limpeza foram corrigidos com base na auditoria de metadados do orquestrador (`verifier-round5/process-deviation-audit.json` e `.py`), que eu só li. A afirmação anterior de que o perfil `~/.codex` não teve entradas modificadas foi retirada. Os resultados de produto e provas de C1–C45 não mudam.

## Veredito em uma linha

**45/45 checks comprovados.** O P2 da terceira revisão formal (`agent.mjs:30`, componentes vazios do PATH no POSIX) está fechado no código e por provas que executei. Comparei a escolha esperada pelas provas com bash, dash, `execvp` e `spawn` do Node no WSL, e os quatro concordam em todos os PATHs definidos. O alvo completo (98 testes) passou sem falhas em Windows Node 24.22.1, Windows Node 24.13.0 da CI e WSL com cópia exata. O gate `npm test` no Windows, com o Hermes real, saiu com **0**: integrações 551 testes (539 pass, 0 fail, 12 skip), com os 12 nativos do Hermes aprovados. **Separadamente, o processo desta rodada não foi conforme**: a sonda E iniciou até 5 vezes o Codex CLI real do WSL. Na janela dessas execuções, 12 arquivos do perfil `~/.codex` tiveram mtime alterado, conforme a auditoria do orquestrador. Ver a seção do desvio.

## Fontes lidas nesta rodada

| Fonte | Como |
| --- | --- |
| `.checks/issue-25-agent-launch.verified.md` da rodada 4 | estrutura e conclusões, antes de substituí-lo (texto meu, registrado em `9cd06d5`) |
| `.checks/code-review/issue-25/formal-review3.stdout.txt` | inteiro (68 linhas): `changes_requested`; AC1 `unmet` pelo P2 `agent.mjs:30`; AC2–AC6 `met` (os achados anteriores dados como corrigidos); limitações |
| `.checks/issue-25-agent-launch.md` | diff `9cd06d5..HEAD` inteiro: Landing "Componentes vazios do PATH", S9/C45 e Handoff com a nova exceção |
| `.tasks/issue-25-agent-launch.md` | diff inteiro (critério 37 e a fonte da exceção 6425235841) |
| `.checks/code-review/issue-25/context-bounded65-approved.json` | seis ACs e dez comentários; os dois últimos (handoff e autorização 6425235841) lidos inteiros |
| `code-review.config.json` | diff `9cd06d5..HEAD`: só `roundOverrides["25"].maxRounds` 3 → 5 e o texto de `approval` com 6425235841. Perfis globais `light`/`ui`/`direct` em 2; os overrides das outras issues iguais; 0 linhas removidas em relação à base |
| `.checks/issue-25-agent-launch.build.md` | diff desde `9cd06d5`, lido como relato do autor (medição nativa, RED/GREEN, números); nenhum número dele foi usado como prova |
| Diff de produto e provas `9cd06d5..d939df8` | `src/integrations/launch/agent.mjs` (`launchPathDirs`), `fake-agent.mjs` (campo `path` no probe), `agent.unit` e `command.cli` (C45), inteiros. `command.mjs:251` (`cwd: process.cwd()`) e `agent.mjs:113` (`spawn` sem `cwd`, herda o mesmo diretório) |
| `tests/doctor/helpers/fake-fs-adapter.mjs` | só a confirmação de que é o filesystem em memória existente do doctor, anterior à base (`e0711dc`); `src/doctor/agent-resolution.mjs` sem diff na feature |
| `AGENTS.md`, `verify.md` e demais arquivos | lidos nas rodadas 1–4; sem diff nesta correção |
| Na correção factual: `.checks/code-review/issue-25/verifier-round5/process-deviation-audit.json` e `process-deviation-audit.py` | inteiros. A auditoria é do orquestrador, feita só por metadados; eu não executei nada nesta correção |

Sem fonte vinculante de UI (perfil `light`). Fault injection, `Coverage` e `Test policy` não foram executados. Os 16 testes do motor no gate são testes unitários, não revisões formais.

## Ambientes e execuções — verified at `d939df8`

Execuções em sequência, uma por vez. Logs em `.checks/code-review/issue-25/verifier-round5/` (pasta ignorada).

| # | Ambiente | Comando | Resultado |
| --- | --- | --- | --- |
| A | Windows 11, Node v24.22.1 (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10, Hermes 0.21.4; 16:28–16:30 | `node --test --test-concurrency=4 --test-reporter=spec … --test-reporter=tap … tests/integrations/launch/*.test.mjs tests/integrations/hermes-harness.unit.test.mjs` (`A-win-24.22.1.*`) | 98 testes: **93 pass, 0 fail, 5 skip** (C45-POSIX, C5-POSIX, C6, C42-POSIX e C15 pty, todos só POSIX), exit 0. Diagnóstico: variante link do C17 omitida (sem privilégio de link de arquivo) |
| B | Windows 11, Node v24.13.0 oficial (zip conferido com `SHASUMS256.txt`), npm 11.6.2 do mesmo zip no início do `PATH`, `npm_execpath` ausente, `npmCli()` = `…\node-v24.13.0-win-x64\node_modules\npm\bin\npm-cli.js`; 16:30–16:32 | o mesmo comando (`B-win-24.13.0.*`) | 98 testes: **93 pass, 0 fail, 5 skip**, exit 0 |
| C | WSL `Ubuntu`, `oldboydev` uid 1000, `/usr/bin/node` v24.13.0 (`/usr/bin/nsolid`), npm 11.6.2, Python 3.12.3, sem Hermes; 16:32:50–16:33:27 | cópia por `git -c core.autocrlf=false archive d939df8` (sha256 `8f8ad3a2…0dcd21a`, `get-tar-commit-id` = `d939df8…`, árvore extraída `f0765261…` = `HEAD^{tree}`, `cli.mjs` 755, shebang LF), `node_modules` copiado (yaml 2.9.0, smol-toml 1.9.1); o mesmo comando (`C-wsl-24.13.0.*`) | 98 testes: **92 pass, 0 fail, 6 skip** (C4 shim, C45 controle Windows, C5 console, C42 console, C8 LOCALAPPDATA, C38 console, todos só Windows), exit 0. O C45 POSIX de processo real rodou (7,98 s). `~/.skill-me` e `~/.skill-me-authorization.json` ausentes antes e depois; árvore igual depois |
| D | Windows, Node v24.22.1, Hermes 0.21.4 real, `SKILL_ME_HERMES_PYTHON` ausente; 16:35–16:44 | `npm test` (`D-npm-test.txt`) | **exit 0**. Governança 6/6. Motor 16/16. Doctor 417: 410 pass, 0 fail, 7 skip. Integrações 551: **539 pass, 0 fail**, 12 skip |
| E | WSL `Ubuntu`, uid 1000, logo depois de C (antes de 16:35) | sonda própria `wsl-path-semantics.sh`: fixture com `codex` no diretório atual (`HERE`) e num posterior (`LATER`), executado por bash, dash, `execvp` (GNU `env`) e `spawn` do Node em cada PATH | ver C45. A linha de controle "PATH ausente" executou o Codex CLI real (seção do desvio) |

Os 98 nomes do alvo aparecem individualmente em cada TAP; nenhum filtro com 0 testes. Matriz (`matrix.txt`; p/f/s), sem nenhuma falha:

| Check | A Win 24.22.1 | B Win 24.13.0 | C WSL 24.13.0 |
| --- | --- | --- | --- |
| C1–C3, C7, C9–C11, C13, C14, C18–C26, C28–C30, C32, C33, C35, C36 | 1p cada | 1p cada | 1p cada |
| C4 | 3p | 3p | 2p/1s |
| C5 | 1p/1s | 1p/1s | 1p/1s |
| C6 | 1s | 1s | 1p |
| C8 | 2p | 2p | 1p/1s |
| C12, C16, C31, C40 | 2p cada | 2p cada | 2p cada |
| C15 | 1s | 1s | 1p |
| C17 | 4p (link omitido) | 4p (link omitido) | 4p (link executado) |
| C27, C34, C37, C39, C44 | 3p cada | 3p cada | 3p cada |
| C38 | 1p | 1p | 1s |
| C41 | 17p | 17p | 17p |
| C42 | 3p/1s | 3p/1s | 3p/1s |
| C43 | 12p | 12p | 12p |
| **C45** | **2p/1s** (unidade + controle Windows) | **2p/1s** | **2p/1s** (unidade + POSIX real) |

**Gate D, nativos do Hermes** (executados e aprovados, nenhum pulado; `D-npm-test.txt:596-607`): I4-C18, I4-C19, I4-C20, I4-C21, I4-C22, I4-C23, I4-C37, I4-C44b, os três I23-C8 e I25-C40 nativo. No mesmo gate passaram o C45 de resolução e o controle Windows real.

**Skips do gate D, com motivo**: doctor 7, todos com `skip: process.platform === "win32"` (POSIX/FIFO). Integrações 12: I4-C15 e T8-C4 (`posix-signals`), I4-C25b (`posix-modes`), I4-C25j/k/l (`posix-acl`, só Linux), I4-C25m (`macos-acl`), I25-C45 POSIX (semântica do PATH POSIX), I25-C5 POSIX, I25-C6, I25-C42 POSIX (sinais POSIX) e I25-C15 (pty só POSIX). Todos são de plataforma; nenhum é nativo do Hermes.

## Terceira revisão formal — verified at `d939df8`

| Item | Situação | Código | Prova (arquivo:linha — valor) |
| --- | --- | --- | --- |
| **P2 `agent.mjs:30`** — no POSIX, `split(":").filter(Boolean)` descartava componentes vazios (diretório atual); `:B` recusava o agente do `cwd` ou escolhia uma instalação posterior | **fechado** | `launchPathDirs` (`agent.mjs:30-35`, usado em `:42`): PATH ausente → `[]` (`:32`); Windows `split(";").filter(Boolean)`, igual ao anterior (`:33`); POSIX `split(":")` com cada vazio trocado pelo `cwd`, na mesma posição (`:34`). `resolveAgents` do doctor, PATHEXT e shim não mudaram (`src/doctor/agent-resolution.mjs` sem diff na feature). O `cwd` é o `process.cwd()` do launcher (`command.mjs:251`), o mesmo que o agente herda no `spawn` (`agent.mjs:113`) | **Camada própria** (filesystem em memória do doctor), `agent.unit:126-154`. Com `here` = `{command: "/projeto/codex", prefix: []}` e `later` = `{command: "/depois/bin/codex", prefix: []}`: `"vazio no começo"` `:/depois/bin` → `here` (`:137`); no meio, no fim, repetidos → `here`; `"vazio no fim, depois do agente"` `/depois/bin:` → `later` (`:139`); controles `/depois/bin` e `/vazio:/depois/bin` → `later`; `"PATH explicitamente vazio"` `""` → `here` (`:143`); `"PATH ausente"` → `{failure: "executable_not_found"}` (`:144`); Windows `;C:\depois\bin;` → `C:\depois\bin\codex.exe` mesmo com `C:\projeto\codex.exe` (`:145`); Windows `""` → `executable_not_found` (`:146`); `:154` igualdade de todos. **CLI real POSIX** (ambiente C), `command.cli:157-186`: para cada um dos 9 PATHs, `expected = {status: 7, stdout: "saída do agente ✓\n", agent: <cwd>/codex ou <depois>/codex, argv: ["--", "a b", "", "ç"], cwd, path: <PATH dado>}` (`:182`); PATH ausente → `{status: 127, started: false, stderrFirst: "skill-me: codex não encontrado no PATH [executable_not_found]"}` (`:185`). **Controle real Windows** (A/B), `command.cli:189-201`: `;<bin>;` → `{status: 7, …, agent: <bin>\claude.exe, …, path: ";<bin>;"}` com `claude.exe` também no `cwd` (`:199`); PATH `""` → 127 `executable_not_found` (`:200`) |
| **Semântica nativa** (base da decisão do Landing; sonda E) | **conferida** nas linhas com PATH definido (só a fixture) | — | `wsl-path-semantics.txt`: bash, dash, `execvp` e Node escolhem `HERE` (diretório atual) em `:B`, `X::B`, `X:`, `::B`, `X:::` e `""`, e `LATER` em `B`, `X:B` e `B:`. É exatamente a coluna esperada pelas provas de C45. A linha "PATH ausente" não é prova de nada: executou o Codex CLI real (seção do desvio) |
| **Exceção e configuração (`d939df8`)** | **conferido** | Fonte explícita: comentário 6425235841 em `context-bounded65-approved.json` e na task (Sources); `roundOverrides["25"].maxRounds` 3 → 5 com a referência; globais e outras issues iguais; core vendorizado sem diff | — |

O AC que a terceira revisão formal deu como `unmet` (AC1) dependia só desse P2. A próxima revisão formal cabe ao orquestrador.

## Rodada 4: carried / reverified

| Item | Situação nesta rodada |
| --- | --- |
| Execução das provas de C1–C44 | **verified at `d939df8`**: todas rodaram de novo, por inteiro, em A, B, C e D |
| C45 (novo) | **verified at `d939df8`**: código, provas e semântica nativa (linhas com PATH definido) conferidos |
| Revisão das asserções de C1–C44 | **carried from `e710dc6`** (relatório da rodada 4): o diff não toca o corpo desses testes. `command.cli` (C45 inserido no meio) e `agent.unit` (import + C45) têm as linhas atualizadas por busca nesta rodada; `prepare.cli`, `session.e2e`, `store.unit`, `end.e2e`, `report.cli`, `docs`, `hermes-harness.unit` e o teste nativo não mudaram, e as citações da rodada 4 valem. `fake-agent.mjs` só acrescentou o campo `path` ao probe; todos os testes que o usam reexecutaram verdes |
| Caminho de produto de todos os checks que iniciam o agente (`resolveAgentLaunch`) | asserções carried; reexecutadas verdes. No Windows a lista de diretórios é a mesma de antes; no POSIX difere só com componente vazio, que nenhuma prova anterior usa |
| Swept existing | **carried from `e710dc6`**: `privacy/`, `traces/` e `observe/` sem diff desde `9cd06d5` |
| Core vendorizado | **verified at `d939df8`**: `scripts/` e `.github/` sem diff na feature; os 5 blobs de `scripts/code-review/` iguais aos da base |

## Checks

`cmd` = `tests/integrations/launch/command.cli.test.mjs`, `prep` = `prepare.cli`, `sess` = `session.e2e`, `store` = `store.unit`, `end` = `end.e2e`, `rep` = `report.cli`, `agent` = `agent.unit`, `docs` = `docs.test`, `harn` = `tests/integrations/hermes-harness.unit.test.mjs`, `nat` = `tests/integrations/hermes-plugin.native.test.mjs`. "A/B/C" = aprovado nos três ambientes.

| Check | Proof run | Evidência (arquivo:linha — valor) | Revisão | Result |
| --- | --- | --- | --- | --- |
| C1 | A/B/C | `cmd:48` `private: true`; `cmd:65` `[0, SKILL_ME_HELP, ""]`; `cmd:77` `git status` igual | carried | PASS |
| C2 | A/B/C | `cmd:80` `LITERAL_ARGS`; `cmd:96` `{status: 0, …, argv: LITERAL_ARGS, stdin}` | carried | PASS |
| C3 | A/B/C | `cmd:105` `{0: 0, 7: 7}` | carried | PASS |
| C4 | A/B, C (unit) | `cmd:119`; `cmd:132` `{status: 127, …}`; `agent:80, 91, 96, 102, 118` | carried | PASS |
| C5 | POSIX C; Windows A/B | `cmd:224` `launcherGone` = `false`; `cmd:228` `signals: ["SIGINT","SIGQUIT","SIGHUP"]`; `cmd:245` `status: 5, signals: ["SIGINT"]` | carried | PASS |
| C6 | C | `cmd:267` `signals: ["SIGTERM"]` | carried | PASS |
| C7 | A/B/C | `prep:94, 98` | carried | PASS |
| C8 | A/B (2), C (1) | `prep:123, 126, 142` | carried | PASS |
| C9 | A/B/C | `prep:164, 169, 176` | carried | PASS |
| C10 | A/B/C | `prep:189` | carried | PASS |
| C11 | A/B/C | `prep:200` | carried | PASS |
| C12 | A/B/C (2) | `prep:223`, `prep:387-388` | carried | PASS |
| C13 | A/B/C | `prep:238` | carried | PASS |
| C14 | A/B/C | `prep:250, 266, 272, 276, 290` | carried | PASS |
| C15 | C | `prep:398-400, 403, 408` | carried | PASS |
| C16 | A/B/C (2) | `sess:61, 67, 69`; `agent:160, 163, 165` | carried | PASS |
| C17 | A/B (link omitido), C (link) | `store:54, 109, 139, 154`; `sess:300-301` | carried | PASS |
| C18 | A/B/C | `sess:84, 109, 111, 124` | carried | PASS |
| C19 | A/B/C | `sess:147, 151, 155, 161` | carried | PASS |
| C20 | A/B/C | `sess:190, 192` | carried | PASS |
| C21 | A/B/C | `sess:211` | carried | PASS |
| C22 | A/B/C | `sess:230, 236, 244` | carried | PASS |
| C23 | A/B/C | `sess:282, 289, 291` | carried | PASS |
| C24 | A/B/C | `store:168-169` | carried | PASS |
| C25 | A/B/C | `end:72-79, 85` | carried | PASS |
| C26 | A/B/C | `end:104` | carried | PASS |
| C27 | A/B/C (3) | `end:120`; `store:222, 234, 253, 259` | carried | PASS |
| C28 | A/B/C | `end:147, 153` | carried | PASS |
| C29 | C (POSIX); A/B | `cmd:278, 295, 300` | carried | PASS |
| C30 | A/B/C | `cmd:312, 342` | carried | PASS |
| C31 | A/B/C (2) | `end:166, 172, 176, 180, 211, 215` | carried | PASS |
| C32 | A/B/C | `end:242, 252` | carried | PASS |
| C33 | A/B/C | `end:273, 278, 283` | carried | PASS |
| C34 | A/B/C (3) | `rep:82, 90-93, 95, 104, 140-143, 150, 166, 169` | carried | PASS |
| C35 | A/B/C | `rep:182-189` | carried | PASS |
| C36 | A/B/C | `cmd:350, 354` | carried | PASS |
| C37 | A/B/C (3) | `docs:14, 49, 51, 57, 60-61, 82, 89, 93` | carried | PASS |
| C38 | A/B | `prep:350, 355, 357-359, 363, 365` | carried | PASS |
| C39 | A/B/C (3); D | `harn:88, 100-102, 109-110, 186-188` | carried | PASS |
| C40 | A/B/C (2); D | `harn:196-198, 201, 207-208, 214-219, 222-225`; `nat:335, 338, 340` | carried | PASS |
| C41 | A/B/C (17 cada); D | `store:319-323, 335, 338, 357, 363, 365, 378-380, 404, 438, 442, 446, 448, 456, 458, 474, 486-487, 505-510, 521, 523`; `end:322, 329, 390, 395, 402, 434, 439, 464, 469, 506-512, 523, 534-535` | carried | PASS |
| C42 | A/B (unit 2 + console 1), C (unit 2 + POSIX 1); D | `agent:187, 196, 206, 211, 214, 231, 236`; `cmd:424` (POSIX), `cmd:456` (Windows, 130) | carried | PASS |
| C43 | A/B/C (12 cada); D | `store:560-562, 564-565, 570-571, 578-581, 598-599, 619, 628, 630, 632`; `end:606-608, 610, 614, 622-626, 647-649, 660-662, 666, 685, 707, 727-729, 737, 749-751, 754` | carried | PASS |
| C44 | A/B/C (3 cada); D | `harn:264-268, 281-283, 286, 289, 300-302, 304`; nativos I4-C22 e I25-C40 em D | carried | PASS |
| C45 | A/B (unidade + controle Windows real), C (unidade + POSIX real); D | `agent:137, 139, 143, 144, 145, 146, 154`; `cmd:182, 185, 186` (POSIX), `cmd:199-200` (Windows); sonda E (semântica nativa, só as linhas com PATH definido) — valores na seção anterior | verified | PASS |

**Checks comprovados: 45/45.**

## Desvio de processo do Verifier nesta rodada (corrigido depois da auditoria do orquestrador)

**O que fiz.** Na sonda E, a linha de controle "PATH ausente" executou `codex` com o PATH removido. No WSL existe o Codex CLI real em `/usr/bin/codex` (symlink para `/usr/lib/node_modules/@openai/codex/bin/codex.js`). Com o PATH ausente, bash, dash, `execvp` e o `spawn` do Node usam o caminho padrão do sistema e o encontraram. Ele foi iniciado até 5 vezes: 4 na sonda e 1 numa conferência logo depois, esta com `cwd` `/tmp`. A instrução explícita era não executar agentes reais; a execução a contrariou e fica registrada como desvio meu, sem relação com o produto. O launcher, com PATH ausente, responde 127 sem procurar no caminho padrão (C45, `cmd:185`).

**O que foi observado na hora, e só isso.** As 5 invocações foram síncronas e retornaram. Na conferência, o `spawnSync` devolveu `status: 1` e stderr `Error: stdin is not a terminal`. Nas 4 da sonda, o stderr foi descartado e só ficaram o código não zero (que registrei como `FAIL`) e o stdout vazio do Node. Execução sem TTY e nenhuma sessão ou chamada de modelo observável limitam apenas o que foi visto. Não posso afirmar com certeza que não houve sessão, acesso à rede, chamada de modelo ou uso de credencial, nem afirmar que houve.

**Erro metodológico na minha conferência do perfil.** Escrevi antes que o `~/.codex` não teve entradas modificadas nos 15 minutos seguintes. Essa conclusão foi **retirada**. A conferência foi `find ~/.codex -newermt "-15 minutes"`, com erros descartados (`2>/dev/null`) e sem nenhuma linha de base tirada antes da sonda. Segundo o orquestrador, essa janela não cobriu as escritas, que vieram antes dela. A varredura dele, feita depois, contradiz o resultado 0. Não apurei a causa exata da discrepância (janela, interpretação da data ou erro silenciado), e uma janela relativa sem linha de base anterior não serve para afirmar perfil intacto.

**Fato correto, pela auditoria do orquestrador** (`process-deviation-audit.json`, gerado por `process-deviation-audit.py`; só metadados, sem leitura de conteúdo, sem execução de processo e sem alteração no perfil; eu apenas li os dois arquivos). Janela a partir de `windowStart` 1793043207,86, que é 16:33:27 (-03) e coincide com o fim da execução C, antes da sonda; verificação em 16:54:57. Varredura completa de `/home/oldboydev/.codex` (`scanComplete: true`, 12.113 entradas visitadas, `scanErrors: []`). Doze arquivos têm mtime dentro da janela, todos entre 16:33:56 e 16:34:12:
- `auth.json`;
- `goals_1.sqlite`, `goals_1.sqlite-wal`, `goals_1.sqlite-shm`;
- `memories_1.sqlite`, `memories_1.sqlite-wal`, `memories_1.sqlite-shm`;
- `logs_2.sqlite`, `logs_2.sqlite-wal`, `logs_2.sqlite-shm`;
- `state_5.sqlite-wal`, `state_5.sqlite-shm`.

Esses instantes são compatíveis com as execuções da sonda E e da conferência. Mesmo assim, sem linha de base anterior não se pode provar qual conteúdo mudou, nem atribuir cada escrita exclusivamente à sonda. Nenhum conteúdo de credencial ou do perfil foi lido, e nada foi alterado ou restaurado. A busca de processos da auditoria encontrou zero processos do uid 1000 com `cwd` no scratch da sonda (`/tmp/skillme-verifier-r5*`). Esse filtro não cobre processos com outro `cwd`, como o `/tmp` da quinta execução, que retornou com `status: 1`.

**O log anterior também fica superado.** A nota que acrescentei em `verifier-round5/wsl-path-semantics.txt` diz "sem sessão" e "~/.codex sem nenhuma entrada modificada". Ela está superada por esta seção, que prevalece; o log não foi editado nesta correção.

**Impacto no veredito.** O desvio não altera o resultado dos checks. As provas A–D usaram homes, raízes e prefixos temporários e não dependem do perfil `~/.codex`. As linhas da sonda E usadas como evidência de C45 têm PATH definido e executaram só a fixture. A linha "PATH ausente" não sustenta nenhuma conclusão do relatório. O desvio, porém, torna esta rodada não conforme quanto ao processo e altera metadados de um perfil pessoal com escritas compatíveis com a sonda. O efeito sobre o conteúdo do perfil (inclusive `auth.json`) não pode ser determinado por mim; a decisão sobre qualquer verificação adicional do perfil é do proprietário.

## Nível, amostragem e limitações que continuam reais

- Perfil `light`: sem fault injection. O RED do C45 é evidência do autor (`build.md`), não minha. As provas que executei afirmam valores exatos (o caminho do agente iniciado, `argv`, stdout, código 7, o PATH recebido), e o comportamento anterior, que descartava os vazios, daria `later` ou 127 nos casos `here`.
- **PATH ausente**: o launcher responde 127 `executable_not_found`; a invocação direta usaria o caminho padrão do sistema, como a própria sonda E acabou mostrando ao encontrar `/usr/bin/codex`. É a decisão aprovada do Landing e do critério 37 (sem inventar caminho padrão), não lacuna.
- O stdio do agente no C45 é provado pelo stdout intacto e pelo código; o stdin e o stderr herdados continuam provados pelo C2.
- Continuam das rodadas anteriores:
  - a variante "lock ausente" de C43 sem teste nomeado, com o comportamento comprovado pela minha sonda na rodada 4;
  - as janelas do plugin em C44;
  - o ramo de várias capturas `active` na falha do encerramento sem prova;
  - recusa e EOF num console real do Windows só em processo/pty;
  - nativos do Hermes pulados na CI;
  - C23 sem asserção de tempo;
  - uso real sem sessão de agente (`Unresolved` 2, `blocks go-live`);
  - macOS e runner da CI não executados.

## Findings

Nenhum achado bloqueante sobre a entrega: o P2 da terceira revisão formal está fechado. A ocorrência nova é o desvio de processo do Verifier descrito acima: não conforme. Ele inclui 12 mtimes alterados no perfil `~/.codex` durante a janela da sonda, com efeito sobre o conteúdo não determinável, e a retirada da minha conclusão anterior de perfil intacto.

## Gate

| Gate | Resultado |
| --- | --- |
| Alvo completo, Windows, Node 24.22.1 | 98: 93 pass, 0 fail, 5 skip — exit 0 |
| Alvo completo, Windows, Node 24.13.0 (CI) | 98: 93 pass, 0 fail, 5 skip — exit 0 |
| Alvo completo, WSL Ubuntu, Node 24.13.0, uid 1000, cópia exata | 98: 92 pass, 0 fail, 6 skip — exit 0 |
| `npm test`, Windows, Node 24.22.1, Hermes real | exit 0 — 6/6; 16/16; doctor 417 (410 pass, 7 skip); integrações 551 (539 pass, 0 fail, 12 skip) |

Cada suíte rodou uma única vez; nenhuma foi repetida até ficar verde.

## Limpeza

- `%TEMP%`: os 320 scratches `skill-me i4 i25 * ação-*` da janela da execução B (o `after` com `rmSync` do 24.13.0 não os apaga; 0 fora da janela) foram removidos por um único processo Node 24.22.1 que confere o caminho resolvido dentro do `%TEMP%` (`cleanup-temp.mjs`/`.txt`), com 0 recusas.
- WSL: `/tmp/skillme-verifier-r5.wNEBtg` e o scratch da sonda E (`/tmp/skillme-verifier-r5-path.*`) removidos após a conferência do padrão; nenhum `skillme-verifier-r5*` restante.
- Nenhum processo de outra sessão foi encerrado. Histórico, estado de review, configuração e prefixo npm real não foram tocados. O perfil pessoal `~/.codex` **não** pode ser declarado intocado: a execução do Codex CLI real pela sonda E coincide com 12 mtimes alterados nele (seção do desvio). Não fiz nenhuma limpeza ou restauração no perfil.
