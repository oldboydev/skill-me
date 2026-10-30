# S21 — leitura concluída; matriz de testes proposta para revisão do Root; nenhum teste/código executado ou escrito

Veredito: o contrato aprovado (Task S21 + Landing L3146–L3149 + tabela P1–P6 L3151) é construível sem renegociar nenhuma decisão aprovada. Restam 6 escolhas menores (D1–D6) que o contrato não fixa e que os testes precisam como valor literal; proponho cada uma abaixo, com a alternativa rejeitada, para o Root aprovar/registrar em Landing ANTES do TEST. Até essa liberação: sem TEST, sem PRODUCT, sem exec.

Autor: CLAUDE AUTOR NOVO S21 (modelo configurado padrão, sem override). Não sou S20 nem Verifier27/28.

## 1. Leitura — o que foi lido, literalmente

Pacote `required-sources-pack.md` (2923 linhas), lido em 20 chamadas exatamente conforme `read-plan.json` (offset/limit):
1/150, 151/150, 301/109, 410/150, 560/150, 710/150, 860/150, 1010/150, 1160/150, 1310/150, 1460/150, 1610/150, 1760/150, 1910/150, 2060/150, 2210/150, 2360/150, 2510/150, 2660/150, 2810/114 → linhas 1–2923 recebidas, sem lacuna nem sobreposição.

Fontes que o pacote contém (conforme índice): AGENTS.md 1–147 inteiro; CLAUDE.md 1–6 inteiro; tlc-implement/SKILL.md 1–174 inteiro; `.tasks/issue-25-core-save-retry-proposal.md` 1–37 inteiro; `.checks/issue-25-agent-launch.md` SOMENTE EXTRATO 3140–3155 (Landing/Swept/Handoff S21); scripts/code-review/README.md 1–48, cli.mjs 1–19, schema.json 1–123, review.mjs 1–825, review.test.mjs 1–894, todos inteiros; tests/integrations/helpers/fs-probe.mjs 1–119 inteiro; s21-context-readable.md 1–57 inteiro (extrato da issue, não o contexto canônico); builder-s20/controlled-probe.mjs 1–363 inteiro; author-s20/comparison-root.json 1–35 e core-five-before-proposal.json 1–37 inteiros.

Lidos fora do pacote (metadados da fase): `read-plan.json`, `required-sources-index.json`, `phase-cap.json`, `agent-manifest.json`, este `report.md` (1 linha original). Globs só para localizar esses arquivos.

NÃO lidos / não alegados: checklist `.checks/issue-25-agent-launch.md` inteiro, task de feature inteira, diff da feature, `context-s21-approved.json`, demais 47 comentários, pilotos, `.verified.md`, relatório FAIL27. Não verifiquei hashes (sem exec); os SHA256 acima são os declarados pelo índice.

Contagem: Source estimado pelo índice = 69 822 tokens (174 553 chars/2,5) + ~3k dos metadados; reserva 20k; total < 150k. Runtime (raciocínio/saída desta sessão) é separado e não medido por mim — não existe medida confiável do próprio contexto. 0 processos em background, 0 Bash/PowerShell/Write/rede; único Edit = este arquivo.

## 2. Fatos do core atual usados no desenho (de review.mjs/review.test.mjs lidos)

- `save(path,value)` L649–653: `writeFileSync(\`${path}.tmp\`, JSON.stringify(value,null,2)+"\n")` e `renameSync(temp,path)`; `saveState` L654–657 grava comum (`<git-common-dir>/code-review/issue-N.state.json`) e depois local (`.checks/code-review/issue-N/state.json`).
- `review()` chama `saveState`: inicial L682; cache L689 (antes de retornar); tentativa L704 (antes de `mkdtempSync`/worktree); relatório L724 (depois do execute). Revisão nova = 3×2 = 6 gravações; cache = 2×2 = 4. Logo 6×630 = 3 780 ms e 4×630 = 2 520 ms de esperas máximas, com o lock `wx` aberto o tempo todo (L670 → finally L737–741).
- `check()` lê só o estado comum (`stateAt(p.state…)` L751): "Revisão ausente ou desatualizada. Execute review:run." quando não há tentativa com o fingerprint; "Revisão sem relatório concluído." quando `report` é null.
- `cli.mjs` imprime `Code review interrompido: ${error.message}\n` e sai 1 em exceção.
- `runCliWithFailingCleanup(f, outcome)` (test L269–333) usa `spawnSync(process.execPath, ["--import", preload, cli.mjs, …], {cwd, encoding, windowsHide})` → herda `process.env`. Não aceita parâmetro extra; não será alterada.
- 16 testes existentes: C10×4, C11×3 (loop ready/changes_requested + failure), C1–C9 → 16. O C11 L349 lê `state.attempts[0].report.status` ANTES de `run.status` — é por isso que o EPERM do S20 virou TypeError.
- fs-probe.mjs: padrão de preload só de teste = `createRequire` + envolver funções de `node:fs` + `syncBuiltinESMExports()`; falha injetada `Object.assign(new Error(…), {code})`.

## 3. Decisões que os testes precisam e o contrato não fixa (para aprovação do Root / linha de Landing antes do TEST)

- **D1 — forma de `io`.** `io = { lstatSync, readFileSync, renameSync }` com as assinaturas do Node (`lstatSync(p,{bigint:true})`, `readFileSync(p)`→Buffer, `renameSync(from,to)`); padrão = as funções de `node:fs`. Objeto completo, sem mescla parcial. Retorno `undefined` em sucesso (síncrono, nunca Promise). `wait(ms)` síncrono; padrão local com `Atomics.wait`. Rejeitado: nomes curtos `lstat/read/rename` (o Landing diz "io padrão lstatSync/readFileSync/renameSync"; reusar os nomes do Node deixa o padrão literalmente as funções nativas).
- **D2 — mensagens próprias das guardas (literais; sem `code`/`errno`, sem "EPERM"):**
  - CHANGED(dest) = `Gravação do estado recusada: o temporário ou o destino mudou antes da promoção (${destination}).`
  - UNAVAILABLE(dest) = `Gravação do estado recusada: identidade do temporário ou do destino indisponível (${destination}).`
  `destination` = o caminho recebido pelo helper (o mesmo `paths().state`/`localState`). Rejeitado: uma mensagem só (perde a distinção mudança × identidade inválida pedida pelo Landing) e mensagens por campo (temp/dest/bytes separados: mais literais sem ganho de decisão).
- **D3 — mapeamento de observações.** TEMP: `ENOENT` no lstat, não-regular, link ou bytes ≠ esperados → CHANGED (ausência/troca é mudança, não erro de E/S). DEST: `ENOENT` no lstat = estado "ausente" (válido na captura; na reconferência, mudança se antes existia). Identidade com `dev` não-BigInt ou `< 0n`, ou `ino` não-BigInt ou `<= 0n` → UNAVAILABLE. Qualquer outro erro de `lstatSync`/`readFileSync` (EIO, EACCES…) propaga o MESMO objeto, sem rename seguinte. Rejeitado: propagar o ENOENT do temporário (mensagem de E/S para o que é, pelo contrato, "ausente → falha fechada").
- **D4 — guardas só em `win32`.** Com `platform !== "win32"` a única chamada a `io` é `renameSync(temp,destination)`, uma vez (sem lstat/read/wait), como o caminho original.
- **D5 — prova de integração pela fronteira real do CLI.** Os testes novos de fase usam `fixture` + `runCliWithFailingCleanup` originais e carregam um preload próprio pondo, só durante a chamada, `--import=<fileURL>` em `process.env.NODE_OPTIONS` (valor anterior restaurado/apagado em `finally`). Preload e plano/log ficam em `<f.cwd>/.checks/code-review/s21/` (ignorado pelo Git, removido pelo `t.after` da fixture). Rejeitado: injetar `node:fs` dentro do processo de teste depois de `review.mjs` já carregado — só funcionaria se o produto lesse as funções em tempo de chamada, ou seja, o teste dependeria da implementação; e duplicar `runCliWithFailingCleanup`, proibido.
- **D6 — prova do `wait` padrão.** Um único teste unitário mede com `process.hrtime.bigint()` que 7 EPERM sem `wait` injetado levam **≥ 630 ms** (só limite inferior; nenhum teto novo). Na integração, só contagens/ordem, sem tempo. Risco declarado: se o `Atomics.wait` acordar antes do prazo no Windows, este teste falha por causa real (espera menor que a aprovada), não será afrouxado; volta ao Root.

## 4. Matriz de testes (todos APPEND em review.test.mjs; prefixo de 894 linhas intocado)

Imports anexados (hoisted, sem erro de ligação no core atual): `import * as reviewModule from "./review.mjs";` e nomes adicionais de `node:fs` (`lstatSync, renameSync as fsRename, unlinkSync, appendFileSync`) sem colidir com os existentes. Todo teste unitário começa com `assert.equal(typeof reviewModule.promoteStateTemp, "function")` — RED claro por ausência, nunca TypeError. Helpers novos (só nos testes novos): `seamFiles(t)` (mkdtemp `code-review-test-s21-` com a mesma guarda de remoção da fixture), `recordingIo(real, plan)` (log `[op, path, opts]`), `recordingWait()` (array de ms), `stateFaultPreload(f, plan)` (texto do preload) e `withPreload(url, fn)`.

Constantes literais: `DELAYS = [10,20,40,80,160,320]`; soma 630; `MAX_ATTEMPTS = 7`.

### P1 — política Windows (unit, `platform:"win32"`, arquivos reais em `seamFiles`, rename envolvido)
| # | Caso | Asserções locais |
|---|---|---|
| U0 | sucesso na 1ª, `wait` injetado | retorno `undefined`; renames 1; waits `[]`; destino = expectedBytes; temp inexistente; todo `lstatSync` com `{bigint:true}` |
| U1×7 | k = 0…6 EPERM e depois sucesso | renames = k+1; waits = `DELAYS.slice(0,k)` (deepEqual); destino = bytes; temp ausente; entre cada rename: exatamente 1 wait e, DEPOIS dele, lstat+read do temp e lstat do destino (+read só se destino era arquivo) |
| U2 | 7 EPERM distintos e1…e7 | `caught === e7` (identidade); renames 7 (nunca 8); waits deepEqual `DELAYS`; soma 630; temp presente com mesmos bytes e mesmo `ino` (não regravado); destino intacto |
| U3 | 7 EPERM com `wait` padrão | `caught === e7`; tempo ≥ 630 ms (D6) |

### P2 — outros códigos e POSIX (unit)
| # | Caso | Asserções |
|---|---|---|
| U4×6 | win32 com `EACCES`, `EBUSY`, `ENOENT`, `EXDEV`, `EIO`, Error sem `code` | renames 1; waits `[]`; `caught === err` |
| U5 | win32 EPERM e depois EIO | renames 2; waits `[10]`; `caught === eio` |
| U6×2 | `linux`, `darwin` com EPERM | log de io deepEqual `[["renameSync",temp,dest]]`; waits `[]`; `caught === e` |
| U6b | `linux`, sucesso com temp ≠ expectedBytes | log só o rename; destino recebe o conteúdo do temp (prova de que POSIX não tem guarda extra, D4) |

### P3 — guardas (unit win32, arquivos reais; a mutação é feita DENTRO do `wait` gravado, logo após o 1º EPERM → prova a reconferência depois da espera)
Cada linha: erro `message === CHANGED(dest)` (ou UNAVAILABLE), `code === undefined`, `errno === undefined`, mensagem sem `/EPERM/`; renames 1; waits `[10]`; nenhuma chamada a io depois da falha; temp e destino ficam exatamente no estado mutado (existência/tipo/bytes) — nada regravado, promovido ou apagado.
| # | Mutação | Esperado |
|---|---|---|
| G1 | temp editado no mesmo inode, mesmo tamanho | CHANGED |
| G2 | temp trocado por cópia idêntica com outro inode (cria cópia, depois rename sobre o temp) | CHANGED |
| G3 | temp removido | CHANGED (D3) |
| G4 | temp trocado por diretório | CHANGED |
| G5 | destino ausente na captura, criado com os MESMOS bytes esperados | CHANGED |
| G6 | destino arquivo, editado no mesmo inode | CHANGED |
| G7 | destino arquivo trocado por cópia idêntica com outro inode | CHANGED |
| G8 | destino arquivo removido | CHANGED |
| G9 | destino diretório trocado por outro diretório | CHANGED; e nenhum `readFileSync(dest)` no log |
| G10 | temp editado E o Buffer do chamador mutado para coincidir | CHANGED (prova cópia de expectedBytes) |
| G11×2 | estável: destino arquivo / destino diretório, 2 EPERM e sucesso | renames 3, waits `[10,20]`; destino-diretório nunca lido |
Antes da 1ª tentativa (captura) — renames 0, waits `[]`:
| G12 | temp com bytes ≠ expectedBytes | CHANGED |
| G13 | temp diretório; temp link (io falso com `isSymbolicLink()` true; sem privilégio de symlink) | CHANGED (2 casos) |
| G14 | temp ausente | CHANGED |
| G15×5 | io falso: temp `dev:-1n`; temp `ino:0n`; temp `dev` Number; destino `dev:-1n`; destino `ino:0n` | UNAVAILABLE |
| G16 | `ino:0n` só na reconferência | UNAVAILABLE; renames 1; waits `[10]` |
E/S real das guardas propaga o mesmo objeto:
| G17 | `lstatSync(temp)` EIO na captura | `caught === eio`; renames 0 |
| G18 | `readFileSync(dest)` EIO na reconferência | `caught === eio`; renames 1; waits `[10]` |
| G19 | `lstatSync(dest)` EACCES na captura | `caught === eacces`; renames 0 |

### P4 — TMP gravado uma vez
- Unit (em U2/G*): `ino` e bytes do temp inalterados após 7 tentativas; `io` não tem escrita.
- I-W×2 (CLI): `writeFileSync` do temp alvo (comum/local, fase inicial) lança `S21 EIO write` → status 1, stdout `""`, stderr `Code review interrompido: S21 EIO write\n`, writes do alvo 1, renames do alvo 0, lock ausente.
- Em toda linha transitória de P5/P6: writes do alvo nessa gravação = 1 com 3–6 renames.

### P5 — C11 real original (CLI via `runCliWithFailingCleanup`, preload D5)
Ordem de asserção: `run.status`, `run.stderr`, `run.stdout` PRIMEIRO; só depois ler/`JSON.parse` do estado (sem TypeError mascarando a causa).
| # | Caso | win32 | POSIX |
|---|---|---|---|
| I1×4 | `ready`/0 e `changes_requested`/2 × alvo comum/local; 3 EPERM no rename inicial (a forma do S20) | status = code; stderr === `${leftoverWarning(run.checkout)}\n`; stdout === JSON do `attempts[0].report` comum, `report.status` = outcome; comum deepEqual local; renames do alvo 4; sem `.tmp`; lock ausente; log: lock presente em cada EPERM | status 1; stdout `""`; stderr `Code review interrompido: S21 EPERM 1\n`; `run.checkout` undefined; renames 1; lock ausente |
| I2×2 | EPERM permanente no rename inicial × comum/local | status 1; stdout `""`; stderr `…: S21 EPERM 7\n` (último); renames 7; checkout undefined; temp do alvo = `{\n  "attempts": []\n}\n`; lock ausente | igual com `S21 EPERM 1`, renames 1 |

### P6 — fases × alvo × tipo (CLI, outcome ready, 32 testes + 3)
Fases: inicial = gravação 1; tentativa = 2; relatório = 3 (run nova); cache = gravação 2 de uma 2ª run após uma run limpa. Tipos: T = 3 EPERM e sucesso; P = EPERM permanente; E = EIO; G = no 1º EPERM o preload troca o último byte do temp (`0x0a`→`0x0d`, mesmo inode/tamanho) e lança EPERM.
Mensagem esperada: P win32 `S21 EPERM 7` / POSIX `S21 EPERM 1`; E `S21 EIO 1`; G win32 `CHANGED(alvo)` / POSIX `S21 EPERM 1`; T POSIX `S21 EPERM 1`. Renames do alvo nessa gravação: P 7 (POSIX 1), E 1, G 1, T 4 (POSIX 1); nenhum rename do alvo depois.
Falha (P, E, G; e T em POSIX): status 1, stdout `""`, lock ausente; stderr = `Code review interrompido: <msg>\n` nas fases inicial/tentativa/cache e `${leftoverWarning(run.checkout)}\nCode review interrompido: <msg>\n` na de relatório (prioridade erro da gravação > limpeza preservada). Estado em disco e recuperação (run seguinte sem falha):
| fase/alvo | comum | local | temp do alvo | `check()` | run de recuperação |
|---|---|---|---|---|---|
| inicial/comum | ausente | ausente | attempts `[]` (G: byte trocado) | rejeita `Revisão ausente ou desatualizada. Execute review:run.` | ready, attempts 1 |
| inicial/local | `[]` | ausente | attempts `[]` | idem | ready, 1 |
| tentativa/comum | `[]` | `[]` | 1 tentativa, report null | idem | ready, 1 |
| tentativa/local | 1 tentativa null | `[]` | 1 null | rejeita `Revisão sem relatório concluído.` | ready, attempts 2 (consumida) |
| relatório/comum | 1 null | 1 null | 1 ready | `Revisão sem relatório concluído.` | ready, attempts 2 |
| relatório/local | 1 ready | 1 null | 1 ready | ready (comum autoritativo) | cache: stdout = report comum, attempts 1 |
| cache/comum | 1 ready | 1 ready | = bytes do comum | ready | cache ready, attempts 1 |
| cache/local | 1 ready | 1 ready | = bytes do local | ready | cache ready, attempts 1 |
O temp do outro alvo nunca sobra. Sucesso (T win32): status 0; stdout = JSON do report comum; stderr = aviso de checkout (run nova) ou `""` (cache, retorna antes do checkout); comum deepEqual local; attempts 1; sem `.tmp`.
Extras: I-D (win32) destino comum ausente na 1ª gravação, criado pelo preload com os bytes esperados no 1º EPERM → `CHANGED(comum)`, destino criado preservado; I-B 6 gravações novas e depois 4 do cache, cada uma com 6 EPERM → ambas ready, renames 42 e 28, writes 6 e 4 (win32; POSIX: falha na 1ª, `S21 EPERM 1`).

Total novo: 45 unit + 6 P5 + 36 P6/P4 (32 fases + I-D + I-B + I-W×2) = 87. Os 16 existentes continuam com as mesmas funções, chamadas, asserções, env e prazos.

## 5. RED controlado esperado no core atual (419c348)
- A/B (Windows): unit 45 RED pela asserção de export ausente; I1×4, I2×2, T×8, P×8, G×8, I-D, I-B RED de comportamento (status 1 com `S21 EPERM 1`, renames 1 em vez de 4/7, ou EPERM em vez de CHANGED); E×8 e I-W×2 verdes antes e depois (preservação). 16 existentes verdes.
- C (POSIX): unit RED por ausência; todas as linhas de integração são verdes antes e depois (contrato POSIX inalterado). Limitação: o RED comportamental do C11 só é demonstrável no Windows, o único lugar onde o produto muda.

## 6. Riscos para o Root decidir (não são mudança de contrato)
- R1: ~100 spawns CLI + git e ~6,5 s de esperas reais aumentam o tempo de `test:code-review`. Nenhum prazo de job/teste muda; precisa medir em A/B/C no GREEN. Se estourar um job regular, volta ao proprietário, sem cortar casos.
- R2: D6 (tempo ≥ 630 ms) pode falhar por acordar cedo — causa real, não flaky; não será afrouxado.
- R3: D5 altera `process.env.NODE_OPTIONS` só durante a chamada do teste novo; os testes rodam em sequência dentro do arquivo (padrão do node:test), e o valor anterior é restaurado.

Fim da fase de leitura/desenho. Aguardo revisão do Root e liberação de TEST (APPEND em review.test.mjs). Não há PASS nem código.

## 7. TESTONLY S21 — testes acrescentados (não executados; sem PASS)

Root liberou TEST com D1–D6 aprovadas (005ec55) e correções obrigatórias. Uma única edição nativa em `scripts/code-review/review.test.mjs`: o `old_string` foram as 3 últimas linhas originais (`  assert.equal(env.CODEX_API_KEY, undefined);` / `  assert.equal(env.PATH, "path");` / `});`) e o `new_string` repete essas mesmas linhas e acrescenta o bloco S21 depois delas. Prefixo de 894 linhas pensado byte a byte idêntico; o Root confere o LF/SHA. review.mjs, README, cli.mjs, schema.json: não tocados. Sem exec, sintaxe não verificada por mim.

Source extra: Read de review.test.mjs 880–895 (16 linhas, ≈0,3k tokens) só para ancorar a edição. Source total ≈ 69,8k + 3k + 0,3k < 150k. Runtime separado, não medido. 0 background, 0 Bash/Write/rede.

Correções do Root aplicadas: P1–P4 unitários com io VIRTUAL determinístico (Map de entradas com tipo/dev/ino BigInt/Buffer, lstat devolve BigInt só com `{bigint:true}` como o Node, rename consome erros roteirizados e senão move a entrada; mutações feitas DENTRO do `wait` gravado), sem arquivo real nem política no fake. G11 diretório = 2 EPERM + EISDIR mesmo objeto, 3 renames, `[10,20]`, nunca lê o diretório, estado intacto; G11 arquivo = sucesso. Dois casos novos de EPERM na guarda. D3: ENOENT na leitura depois do lstat = CHANGED; demais erros de E/S (inclusive EPERM) propagam o mesmo objeto. Ordem verificada só como contrato (sem espera antes da 1ª; 1 espera antes de cada nova tentativa; depois dela lstat+read do temp e lstat do destino, + read se destino arquivo, antes do rename). P5 injeta na 2ª gravação (tentativa). location.txt/log apagados antes de cada chamada. Recuperação = nova chamada sem falha.

Nomes (todos com prefixo `S21 `), 89 testes = 47 unit + 6 P5 + 36 P6/P4:
- P1: `S21 P1 Windows promove na primeira tentativa sem esperar`; `S21 P1 Windows promove depois de ${0..6} EPERM com as esperas exatas` (×7: renames k+1, waits `[10,20,40,80,160,320].slice(0,k)`); `S21 P1 sete EPERM esgotam as esperas e relançam o último objeto original` (`error === errors[6]`, 7 renames, waits = DELAYS, soma 630, entradas intactas); `S21 P1 espera padrão bloqueia ao menos 630 ms antes de relançar o sétimo EPERM` (D6, só limite inferior).
- P2: `S21 P2 Windows ${EACCES|EBUSY|ENOENT|EXDEV|EIO|erro sem código} tenta uma vez sem esperar` (×6); `S21 P2 Windows EPERM seguido de EIO para e relança o EIO` (2 renames, `[10]`); `S21 P2 ${linux|darwin} EPERM tenta uma vez pelo caminho direto` (trace exato `[["renameSync",temp,dest]]`); `S21 P2 linux promove sem conferir bytes nem identidade`.
- P3 após a espera (CHANGED, 1 rename, `[10]`, snapshot = estado mutado): temp editado mesmo inode; temp cópia idêntica outro inode; temp removido; temp→diretório; destino ausente criado com bytes esperados; destino editado mesmo inode; destino cópia idêntica outro inode; destino removido; destino dir→outro dir (sem ler o dir); Buffer do chamador mutado (prova a cópia). G11 dir/arquivo como acima. Antes da 1ª (0 rename, `[]`): bytes ≠ esperados; temp diretório; temp link; ENOENT na leitura do temp → CHANGED; `identidade indisponível: …` ×5 (temp dev -1n, temp ino 0n, temp dev Number, destino dev -1n, destino ino 0n) → UNAVAILABLE; ino 0n na reconferência → UNAVAILABLE com 1 rename. Propagação do mesmo objeto: EIO lstat temp (captura), EIO read destino (pós-espera, 1 rename, `[10]`), EACCES lstat destino (captura), `S21 P3 EPERM na conferência da captura propaga sem tentativa nem espera`, `S21 P3 EPERM na leitura depois da espera propaga sem espera extra`. Mensagens literais D2; `code`/`errno` undefined; sem "EPERM".
- P5 (CLI real via `fixture`/`runCliWithFailingCleanup` originais + pré-carga por NODE_OPTIONS): `S21 P5 C11 ${ready|changes_requested} com 3 EPERM na gravação ${common|local} da tentativa` (×4; win32: status 0/2 e stderr = aviso ANTES de ler o estado, stdout = report comum, comum deepEqual local, tentativas do rename `[1,2,3,4]`, writes `common1,local1,common2,local2,common3,local3`, lock presente em cada rename, sem `.tmp`; POSIX: falha `S21 EPERM 1`). `S21 P5 C11 EPERM permanente na gravação ${target} da tentativa preserva o último erro e a ordem comum→local` (×2; `S21 EPERM 7`/POSIX 1; writes param em `${target}2`; temp = 1 tentativa com chaves `fingerprint,snapshot,startedAt,report`, report null; local: temp = estado comum; `check()` → ausente/sem relatório).
- P6: `S21 P6 ${transient|permanent|eio|guard} na gravação ${common|local} da fase ${initial|attempt|report|cache}` (×32) com a tabela S21_AFTER_FAILURE do §4, ordem de writes, tentativas do rename, lock, `check()` e recuperação (attempts 1/1/1/2/2/1/1/1). Mais `S21 P6 destino comum criado com os bytes esperados durante a espera é recusado e preservado`, `S21 P6 seis gravações novas e quatro do cache com seis EPERM cada concluem` (42/28 renames) e `S21 P4 falha ao gravar o temporário ${common|local} não tenta promover` (×2, `S21 EIO write`, 0 renames, temp inexistente).

Pontos para o Root conferir antes do commit RED:
- A mensagem CHANGED no P6/I-D compara o caminho `join(f.cwd, …)` com o que o produto resolve a partir de `process.cwd()` do CLI; se o Windows devolver outra forma do mesmo caminho, falha por formatação, não por política.
- Os writes/renames são observados pelo `writeFileSync`/`renameSync` de `node:fs` (a forma atual do `save` e o io padrão D1); outra API de escrita no produto quebraria a observação.
- Depende de `--import=<fileURL>` ser aceito em NODE_OPTIONS (Node ≥22 do README).
- RED esperado no core atual: os 47 unit pela asserção `S21: review.mjs não exporta promoteStateTemp`; no Windows, P5 ×6, P6 transient/permanent/guard ×24, I-D e I-B pelo comportamento; P6 eio ×8 e P4 ×2 verdes antes e depois; no POSIX só os unit ficam vermelhos.

Encerrado: sem exec, sem PASS, sem código de produto.

## 8. TESTFIX1 — F1/F2 do Root sobre 0970800 (não executado; sem PASS)

Só a região anexada de review.test.mjs foi editada (prefixo de 894 linhas intocado, a conferir pelo Root). Os 89 casos, nomes, asserções e prazos são os mesmos; mudou apenas o encanamento.

- **F1:** `S21_TEMP`/`S21_DEST` deixaram de ser `C:\s21-virtual\…`. Agora `S21_VIRTUAL_DIR = join(tmpdir(), \`code-review-test-s21-${randomUUID()}\`)` e os dois ficam dentro dela (`issue-7.state.json.tmp`/`issue-7.state.json`). A pasta nunca é criada; o io dos 47 unitários continua todo virtual. Se um produto quebrado ignorar o io injetado, o efeito real cai num caminho privado e inexistente. Import novo anexado: `randomUUID` de `node:crypto`.
- **F2:** `s21RemoveCheckouts` foi removida. Novos helpers anexados:
  - `s21DirectCheckoutChild(root, target)` / `s21LexicallyOwned(checkout)`: absoluto, filho direto de `resolve(tmpdir())`, prefixo `codex-code-review-`, sem `..` nem separadores.
  - `s21CaptureCheckout(checkout)`: chamada em `s21RunCli` logo que o CLI retorna, e só depois da conferência lexical; `lstatSync(…,{bigint:true})` → `{dev, ino}` se for pasta real sem link, senão `{refused}`. O resultado é registrado (`register`) ANTES da captura e da leitura do log, para nenhum checkout ficar sem dono.
  - `s21RemoveOwnCheckout(f, run)`: sem identidade, recusada ou ausente → lança sem remover. Exige de novo a conferência lexical, pasta real sem link, `dev`/`ino` iguais aos capturados e a mesma confinação em `realpathSync(tmpdir())`/`realpathSync(checkout)`. Só então chama `f.git("worktree","remove","--force",…)`, uma vez, sem nova tentativa.
  - `s21WithCheckouts(f, body)`: wrapper central. Roda o corpo com `runCli(outcome, faults)` e depois tenta remover cada checkout registrado. Falha do corpo + falha de remoção → `AggregateError([erroDoCorpo, ...erros], "S21: o teste falhou e a remoção do checkout também")`; só o corpo → o erro original; só a remoção → `AggregateError(erros, "S21: remoção do checkout recusada ou falhou")`.
  - Imports novos anexados: `lstatSync`, `realpathSync` de `node:fs`; `isAbsolute` de `node:path`. Os helpers dos 16 originais não mudaram.
- Testes reestruturados (mesmos nomes e asserções; o corpo passou para dentro de `s21WithCheckouts`, `s21RunCli(f, …)` virou `runCli(…)`, o `try/finally` saiu): `S21 P5 C11 ${status} com 3 EPERM na gravação ${target} da tentativa` ×4, `S21 P5 C11 EPERM permanente na gravação ${target} da tentativa preserva o último erro e a ordem comum→local` ×2, `S21 P6 ${kind} na gravação ${target} da fase ${phase}` ×32, `S21 P6 destino comum criado com os bytes esperados durante a espera é recusado e preservado`, `S21 P6 seis gravações novas e quatro do cache com seis EPERM cada concluem`, `S21 P4 falha ao gravar o temporário ${target} não tenta promover` ×2. Os 47 unitários não mudaram, exceto as duas constantes de caminho.

[TESTFIX1, continuação] Leitura extra de Source nesta etapa: Grep de 6 âncoras, Read de review.test.mjs 895–910 e 1430–1772 (≈360 linhas, ≈5k tokens) e 1648–1835 para conferir o resultado (≈190 linhas, ≈2,5k). Source acumulado ≈ 73k + 7,5k ≈ 80,5k < 150k. Runtime separado, não medido. Nada executado; 0 background; sem Bash/Write/PowerShell/rede/commit.

## 9. RED controlado S21 no core ANTIGO (HEAD 4953c5f) — RED válido, NÃO é PASS de produto

Comando executado UMA vez, literal: `C:/nvm4w/nodejs/node.exe C:/Users/paulo/projects/debuguer_skills/.checks/code-review/issue-25/worker-guard/s21-core-controller.mjs R`. Pedido: timeout 900000 em primeiro plano; o máximo da ferramenta em primeiro plano é 600000. A primeira tentativa em background (900000) foi recusada pelo hook `builder-s21-guard.mjs` ("Foreground and bounded tool budget required") antes de iniciar o processo; a única execução real foi em primeiro plano com 600000 e terminou naturalmente em ~2 min 12 s. 0 background em execução.

Resultado do controlador (`author-s21-red/R-result.json`): `valid:true`, `error:null`, `naturalExit:1`, Node v24.22.1, `cloneHeadTreeUnchanged:true`, `SourceHeadHashesUnchanged:true`, `notGreen:true`. Filho (`R-execution.json`): `node --test --test-concurrency=1 --test-reporter=spec --test-name-pattern=^S21 scripts/code-review/review.test.mjs`, status 1, signal null, das 15:47:26.114Z às 15:49:30.667Z. Resumo do `R.log`: tests 89, pass 10, fail 79, cancelled 0, skipped 0, duration_ms 124433.

O que o R.log mostra (lido nele, não inferido):
- Nenhuma ocorrência de `TypeError`, `Cannot find module`, `ERR_MODULE`, `AggregateError` ou das mensagens de remoção de checkout `S21: checkout…`/`S21: remoção…` → sem falha de setup, de módulo ou de limpeza mascarando a causa.
- 47 ocorrências de `S21: review.mjs não exporta promoteStateTemp` = os 47 unitários P1–P3, que falham na asserção de export ausente planejada (sem erro de ligação).
- Regressão real do CLI com EPERM injetado (32 falhas):
  - P5 3 EPERM na tentativa: ready comum/local `actual 1 / expected 0`; changes_requested comum/local `actual 1 / expected 2` (o CLI saiu 1 na gravação da tentativa; a asserção de status vem antes da leitura do estado, então não houve TypeError).
  - P5 EPERM permanente comum/local: stderr `actual 'Code review interrompido: S21 EPERM 1\n'` × `expected '…S21 EPERM 7\n'` (o core antigo para na 1ª tentativa).
  - P6 transient ×8 (todas as fases/alvos): `actual 1 / expected 0`.
  - P6 permanent ×8: `actual …S21 EPERM 1` × `expected …S21 EPERM 7`; na fase report o stderr real traz o aviso de checkout + `S21 EPERM 1` (prioridade da limpeza preservada).
  - P6 guard ×8: `actual …S21 EPERM 1` × `expected …Gravação do estado recusada: o temporário ou o destino mudou antes da promoção (<fixture>\.git\code-review\issue-7.state.json | …\.checks\code-review\issue-7\state.json).`
  - P6 destino criado: `actual …S21 EPERM 1` × CHANGED(comum).
  - P6 seis+quatro gravações: `actual 1 / expected 0`.
- 10 aprovados, exatamente os previstos como preservação (verdes antes e depois): `S21 P6 eio na gravação {common,local} da fase {initial,attempt,report,cache}` ×8 e `S21 P4 falha ao gravar o temporário {common,local} não tenta promover` ×2.

Isso corresponde ao mapa do §5/§7: 47 por ausência + 32 por comportamento = 79 RED; 10 de preservação. Limitação: um só ambiente (Windows, Node 24.22.1); B e C não foram executados nesta etapa. Exit 0 do controlador = RED válido, nunca GREEN.

Source desta etapa: R-execution.json (52 linhas), ~40 linhas do R.log e Greps pontuais no R.log/controlador (≈4k tokens). Acumulado ≈ 84,5k < 150k; runtime separado. Nenhum arquivo de fonte/produto/teste/README editado; só este relatório. Sem commit.

## 10. PRODUCT S21 (sobre 4953c5f) — implementado, NÃO executado; sem GREEN alegado

Editados somente `scripts/code-review/review.mjs` e `scripts/code-review/README.md` (e este relatório). review.test.mjs, cli.mjs, schema.json, AGENTS, config: intocados.

### review.mjs
- Import: `lstatSync` acrescentado à lista de `node:fs`.
- `STATE_RENAME_DELAYS_MS = [10, 20, 40, 80, 160, 320]`; `waitSync(ms)` = `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)` (síncrono, sem timers/async/dependência nova).
- `observeStateEntry(io, path, messages)`: `io.lstatSync(path, { bigint: true })`. ENOENT → `{absent:true, type:null, dev:null, ino:null, bytes:null}`; qualquer outro erro sai como o mesmo objeto. Identidade com `dev` não-BigInt ou `< 0n`, ou `ino` não-BigInt ou `<= 0n` → UNAVAILABLE. Tipo `link|file|directory|other` pelo lstat (sem seguir link). Só arquivo regular é lido (`io.readFileSync`); ENOENT na leitura → CHANGED (D3); outros erros de leitura, inclusive EPERM, saem como o mesmo objeto.
- `sameStateEntry(a,b)`: ausência, tipo, dev, ino iguais e bytes iguais (`Buffer.equals`) ou ambos null.
- `export function promoteStateTemp(temp, destination, expectedBytes, { platform = process.platform, io = { lstatSync, readFileSync, renameSync }, wait = waitSync } = {})` (D1; io padrão avaliado por chamada com as funções nativas):
  - `platform !== "win32"` → `io.renameSync(temp, destination)` uma vez e retorna (D4; sem lstat/read/wait).
  - Windows: `expected = Buffer.from(expectedBytes)` (cópia). Captura: temp tem de existir como arquivo regular com bytes = esperados, senão CHANGED; depois o retrato do destino (ausente ou tipo/id/bytes se arquivo).
  - Laço: tentativa 0 chama o rename direto. Na tentativa `n>0`: `wait(DELAYS[n-1])` e só então reconferências do temp (regular, bytes esperados, mesmo retrato) e do destino (mesmo retrato) → CHANGED se divergir. Estão fora do `try` do rename, então falha de guarda/E/S nunca é repetida.
  - `catch` do rename: só `code === "EPERM"` e `attempt < 6` continua; caso contrário relança o próprio objeto (no esgotamento, o 7º, que é o último original).
  - Retorno `undefined`. Mensagens D2 literais via `requireThat` (Error simples, sem code/errno). Sem CAS; comentário aponta o lock como proteção.
- `save(path, value)`: `bytes = Buffer.from(JSON.stringify(value, null, 2) + "\n")`, `writeFileSync(temp, bytes)` uma vez, depois `promoteStateTemp(temp, path, bytes)`. `saveState` (comum→local), lock, cache, fingerprint, contadores, cleanup, prioridade de erros e as 6/4 gravações não mudaram.

### README.md
- Novo parágrafo em "Relatórios e falhas": o temporário é escrito uma vez e promovido comum→local; só EPERM do Windows repete, até 7 tentativas com esperas 10/20/40/80/160/320 (máx. 630 ms por gravação, 3.780 ms numa revisão nova / 2.520 ms no cache), lock retido, E/S sem teto novo; EPERM persistente lança o último erro original sem regravar nem copiar; outros códigos/sistemas mantêm uma tentativa sem conferência; guardas de identidade/tipo/bytes do temporário e do destino, sem seguir links nem ler diretórios, falha fechada com mensagem própria; sem garantia atômica/CAS nem isolamento contra quem controla o repositório; comum/local não é transação.
- Parágrafo do core vendorizado: mantém o histórico da exceção #7 (teto 35) e acrescenta a exceção LOCAL da #25 aprovada pelo proprietário (link 6525782289), com só os três arquivos (`README.md`, `review.mjs`, `review.test.mjs`) divergindo, pilotos intocados, `cli.mjs`/`schema.json` iguais.

### Decisões e limites
- Escolhi uma checagem de identidade única para temp e destino (UNAVAILABLE antes do tipo) para que identidade inválida nunca seja confundida com mudança. Rejeitado: checar o tipo primeiro (um link com dev inválido viraria CHANGED).
- Em volumes Windows que não fornecem `ino > 0n` (ex.: alguns FS de rede/FAT), a gravação agora falha fechada com UNAVAILABLE, que é o comportamento aprovado para identidade indisponível; antes ela promovia direto. Fica registrado como consequência conhecida, não verificada aqui.
- Nada executado: sem teste, sem sintaxe conferida por mim, sem GREEN. Root confere sintaxe/diff inteiro e commita antes das provas A/B/C, ABC/D e S20AFTER.

Source desta etapa: review.mjs 1–34, 645–660 e 648–752 (≈150 linhas, ≈2,5k tokens) e README 25–48 (≈2k). Acumulado ≈ 84,5k + 4,5k ≈ 89k < 150k; runtime separado, não medido. 0 background; sem Bash/Write/PowerShell/rede/commit.

## 11. GREEN S21 sobre 37b8048 — A/B/C/D verdes; AFTER_A INVÁLIDO (parado); AFTER_B NÃO executado

Seis comandos autorizados, em sequência, cada um no máximo uma vez, em primeiro plano com timeout 600000. A/B/C terminaram em primeiro plano. D passou de 600 s e a ferramenta o destacou sozinha (sem `run_in_background` meu); esperei a notificação natural (exit 0) antes do próximo. AFTER_A falhou → parei; AFTER_B não foi executado. 0 background no fim.

| Etapa | Início–fim (UTC) | Saída | tests/pass/fail/cancelled/skipped |
|---|---|---|---|
| A (Win, Node 24.22.1, concorrência 8) | 15:54:48.746–16:03:55.419 | natural 0, valid | 767/754/0/0/13 |
| B (Win, Node 24.13.0, 8) | 16:04:04.481–16:11:25.506 | natural 0, valid | 767/754/0/0/13 |
| C (POSIX/WSL, 7) | 16:11:31.824–16:13:08.446 | natural 0, valid | 767/745/0/0/22 |
| D (npm test completo, Node 24.22.1) | 16:13:14.800–16:26:39.388 | natural 0, valid | 1184/1164/0/0/20 |
| AFTER_A | 16:26:50.075–16:26:54.697 | status 2, signal null, valid false | — (nenhum caso) |

Comando A/B (de `A.env.txt`/`B.env.txt`): `node --test --test-concurrency=8 "tests/integrations/**/*.test.mjs" scripts/governance-ci.test.mjs scripts/ci-lock-latency.test.mjs scripts/code-review/review.test.mjs`; TEMP e RUNNER_TEMP privados (`tmpdir_isolado=true`); depois `HEAD_depois=37b8048…`, `status_depois=[]`, `RUNNER_TEMP_entradas_depois=0`. D: Python 3.12.10, `SKILL_ME_HERMES_PYTHON=ausente`, mesmas conferências depois.

Evidência por linha nomeada (Grep nos logs, não inferida das contagens):
- `^✔ S21 ` = 89 em A, B, C e D; `^✖`/`not ok` = 0 nos quatro logs.
- Os 16 originais (`^✔ C1 … C11 `) = 16 em A, B, C e D.
- D: sub-execuções do resumo 27/27/0 skip, **105/105/0 skip (core inteiro = 16 + 89)**, 417/410/7 skip, 635/622/13 skip → 1184 = 1095 anterior + 89.
- Hermes nativo/Python/I4-C35 em A (mesmas 16 linhas em B e D): I4-C18, C19, C20, C21, C22, C23, C37, I25-C40 harness nativa, I23-C8 ×2, I4-C44b (os 11 nativos), I23-C8 "pelo Python do sistema", I4-C35 (hash da árvore da skill de terceiro) e mais 3 variantes de I25-C40, todos `✔`.
- Skips A/B = 13, todos POSIX/Linux/macOS-only com motivo na linha (I4-C15, I4-C25k/b/j/m/l, I25-C45, I25-C5, I25-C6, I25-C42, I25-C33, I25-C15, T8-C4).
- Skips C = 22: 11 `hermes-runtime-ausente` (os mesmos 11 nativos acima), governance-C48 (só pwsh do runner Windows), I4-C25h/g/i (DACL Windows), I4-C25m (macOS), I25-C4/C45-controle/C5/C42/C8/C38 (Windows-only).

### AFTER_A — falha de preparação, não de produto, e não é dado de coleta
`author-s21-after/A-result.json`: `valid:false`, `error: "âncora ausente ou repetida na fonte: assert.equal(state.attempts[0].report.status, status);"`, 16:26:50.896–16:26:54.355; `A-setup.log` vazio; nenhum caso rodou, nenhum dado A-data.json.
Causa localizada (Grep em review.test.mjs): o `createProbe` do S20 (mesmo gerador, sem mudança) exige que cada âncora ocorra uma vez. O meu teste anexado `S21 P5 C11 … com 3 EPERM na gravação … da tentativa` repete três âncoras do C11 original:
- `assert.equal(state.attempts[0].report.status, status);` nas linhas 349 (original) e 1670 (S21);
- `JSON.stringify(state.attempts[0].report, null, 2) + "\n",` nas linhas 352 e 1667;
- `` assert.equal(run.stderr, `${leftoverWarning(run.checkout)}\n`); `` nas linhas 355 e 1663.
É um defeito de compatibilidade do meu teste com o gerador S20, que o desenho não previu. Não é falha do produto nem dos 105 casos. Não editei nada, não tentei de novo e não alterei o gerador.

Comparação antes/depois do S20: **não há dado AFTER**. Antes: A 100/100 normais; B 98 normais + 2 EPERM (casos 18/43). Depois: inexistente. Nenhuma alegação sobre ausência futura de EPERM.

Decisão para o Root (não tomada por mim): (a) mudar só a redação das três expressões do teste S21 P5 (por exemplo, outro nome de variável que não `state`/`run.stderr` literal), sem mudar asserções nem valores, o que exige nova revisão e rodar de novo A/B/C/D antes do AFTER; ou (b) outra saída que preserve "mesmo gerador/hash". Mudar as âncoras do gerador violaria o "mesmo gerador".

Source desta etapa: resultados/envs/wrapper (≈200 linhas JSON/texto) e Greps pontuais (≈4k tokens). Acumulado ≈ 93k < 150k; logs de runtime à parte. Nada editado além deste relatório.

## 12. S20 AFTER r1 — coleta completa 100+100 (integridade diagnóstica; NÃO é PASS de produto)

Falha de preparação anterior preservada como está (§11): AFTER_A inválido com 0 casos, motivo `âncora ausente ou repetida na fonte: assert.equal(state.attempts[0].report.status, status);`, causado por três âncoras do C11 repetidas pelos meus testes S21 P5. AFTER_B não foi executado. Os controladores e saídas originais continuam onde estavam.

Decisão do Root, lida antes de executar (`builder-s21/after-preparation-decision-root.md`): numa cópia privada, só para este diagnóstico, o gerador S20 imutável (`controlled-probe.mjs`, SHA256 `0bb54a2b…275`) recebe exatamente as 894 linhas/16 testes originais, o mesmo input do BEFORE. O arquivo atual inteiro é conferido pelo hash do HEAD antes da extração. O produto importado é o S21 do HEAD atual. Nenhuma fonte versionada nem teste mudou; os 89 testes novos não fazem parte deste experimento e já passaram em A/B/C/D no mesmo HEAD, então não precisam ser rodados de novo. Rejeitados pelo Root: renomear as asserções e alterar as âncoras do gerador. No `author-s21-after-r1/manifest.json` constam `originalPrefixSha256: a48aff48…e108` (igual ao SHA256LF do review.test.mjs anterior, índice S21) e o hash do gerador `0bb54a2b…275`.

Execução: cada comando literal uma vez, em primeiro plano com timeout 600000; nenhum foi destacado; 0 background.

| Run | Node | Início–fim (UTC) | Controlador | Testes do coletor | Casos |
|---|---|---|---|---|---|
| A | v24.22.1 | 16:31:14.249–16:35:45.021 | valid, natural 0 | 1/1/0/0/0 | 100 |
| B | v24.13.0 (ci-node) | 16:35:49.636–16:39:37.817 | valid, natural 0 | 1/1/0/0/0 | 100 |

Conferi nos `{A,B}-data.json` (`complete: true`), registro por registro e não só pelo resumo:
- 100 linhas `"index"` em cada arquivo.
- 600 ocorrências em cada um das 6 linhas por registro: `phase completed`, `error null`, `status 0`, `commonTmpPresent false`, `localTmpPresent false`, `lockPresent false` → 100 registros × 6.
- 500 em cada para os 5 booleanos `originalC11` (`reportReady`, `stdoutLiteral`, `statusZero`, `stderrWarning`, `lockAbsent`) iguais a `true` → 100 × 5; 0 ocorrências de algum deles `false`/`null` e 0 de `Code review interrompido`.
- As 100 ocorrências de "EPERM" em cada arquivo são o texto esperado do aviso `(EPERM cleanup)` da limpeza falsa original, não falha de rename.
- Resumo: byStatus `{0:100}`, byErrorCode `{none:100}`, byCommonFirstReportStatus `{ready:100}`, attempts comum/local `{1:100}`, byCleanup `{removed:100}`, `originalC11NotAllTrue: []`, `reportIdentityUnchanged: true`. reportSha256 A `c4a579bf…b4ec`, B `e620e499…bb9d`.

Antes × depois, com o mesmo gerador/input/ordem/ambiente:
- Antes: A 100/100 normais; B 98 normais + 2 falhas, casos 18 e 43, CLI status 1 com EPERM no rename do estado comum.
- Depois (S21): A 100/100; B 100/100, 0 falha.

Limites: são duas amostras saudáveis com o core S21 e não provam ausência futura de EPERM. O ambiente não é o do D27 e não identifica a causa do EPERM (nenhuma atribuição a AV, Node ou handle). O coletor 1/1 comprova só a integridade da coleta. Esta etapa não muda produto nem testes, e o Verifier28 fresco continua com o Root.

Source desta etapa: decisão do Root (10 linhas), A-result.json, as primeiras 60 linhas de A-data.json e Greps de contagem (≈5k tokens). Acumulado ≈ 98k < 150k; runtime à parte. Nenhum arquivo editado além deste relatório; sem commit.
