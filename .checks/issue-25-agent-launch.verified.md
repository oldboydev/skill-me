# Verificação independente 25 — **FAIL**

**Veredito: FAIL.** O gate B fresco (clone novo `autocrlf=true`, Node 24.13.0 oficial) terminou naturalmente com
**643/628/2/0 cancelados/13 skips, EXIT=1**. Pela regra da rodada, parei: C e D **não foram executados** (o controlador
do Root também exige `B-result.valid`). Por isso nenhum check C1–C50 é declarado PASS global nesta rodada. O F1 da R24 está
corrigido pela leitura e as três regressões novas passaram em A e em B, mas isso não supre um gate vermelho.

- Escopo: feature inteira `63621c691f132dc8d591414269d36cfa18fca594..80cfccf3eb36d04be02ea41e74548c38d0fd3bbd`
  (árvore `eebb633b2bd6bd7e5defefaf23e90b317a0fd654`). Diffs exportados pelo Root: `independent-25/feature.diff` e
  `independent-25/s14.diff` (desde `34466ab`), lidos como dados.
- Verifier Claude novo (rodada 25), sem herdar sessão; não sou o autor S13/S14 nem um Verifier anterior. Perfil light,
  handoff on. Não fiz fault injection, mutantes, sondas, commits, push, Actions nem rede.
- Leitura (Read/Grep/Glob): `AGENTS.md`; `context-round25.json` inteiro (9 ACs, comentários 1–41); checklist
  (`Sources` S14, Landing “Lugar da posse no formatter do I23-C10”, refinamento F1 do C46 (u), `Swept`
  `.checks/issue-25-agent-launch.md:1103-1122`); o bloco S14 do build e do `Handoff` por `s14.diff`; manifesto e drivers
  do Root; fontes dos consumidores tocados. **Limite de leitura**: não li inteiros o task, o plano vinculante, CLAUDE.md,
  `verify.md`, o relatório R24 nem os ~23 mil linhas do `feature.diff`; li o `s14.diff` só até a linha 244 de 969. Os
  pontos abaixo que dependem dessas fontes estão marcados como carry atribuído, não como conferência minha.

## Achados

### F1 (gate B) — `I25-C46 prazo da entrega: lock obtido com o relógio no prazo ou depois…` vermelho natural

- **Cenário**: B, `tests/integrations/traces/concurrency.cli.test.mjs:992`, iteração `depois de uma recusa, depois do prazo`
  (`busy [2]`, `creation 3`, `at = LOCK_DEADLINE + 1`).
- **Esperado** (`:1007`): `[lockCreations, lockReleases]` = `[3, 2]` logo depois de `deliverOne`.
- **Atual** (`B.log:710-730`): `[3, 1]`. A asserção anterior (`:1006`, relatório `lock_present` 1/0/0/1) passou.
  `:1008-1011` não foram alcançadas. Evidência dos produtores: “nenhum produtor registrado”.
- **Leitura (não provada por execução minha)**: `untilDeadline` (`src/integrations/traces/delivery.mjs:85-99`) corre a
  operação contra um `setTimeout(remaining)` **real**. O relógio do teste é injetado, mas o timer não. Se esse timer
  disparar antes de a liberação da tentativa recusada terminar, `settle()` resolve com o mesmo código esperado e o `rmdir`
  da reserva (o contador `lockReleases`, `:851-854`) ainda não ocorreu. A liberação S13 tem mais passos (mkdtemp, lstat,
  leitura, rename, lstat, leitura, unlink, lstat, rmdir). Diferente de `:933` e `:968`, que esperam com
  `waitUntil(... lockReleases === 2)`, a linha `:1007` confere **de forma síncrona**. O código `lock_present`/
  `delivery_timeout` é o mesmo nos dois caminhos, então o teste não distingue “antes de o timer rodar” (premissa do nome)
  de “timer já rodou”. É um defeito plausível da prova (premissa sem controle e sem espera), não um defeito demonstrado do
  produto. Não demonstrei a causa.
- **Coincidência observada, não causa**: o teste seguinte do mesmo arquivo (`:1016`) levou 26.356 ms (`B.log:634`). No
  mesmo minuto, o T8-C8 teve um `open lock` de 26.713 ms e laço de eventos com atraso máximo de 10.016 ms (abaixo).
- **Impacto**: o gate B fica vermelho, C e D não rodam e não há PASS.
- **Onde foi introduzido**: este teste e `lockTakenAt` entraram na feature (`feature.diff:23555-23584`); a contagem por
  `rmdir` da reserva entrou com a S13 (`feature.diff:23483`).

### F2 (gate B) — T8-C8 antigo, `delivery_timeout` do wrapper Codex

- **Cenário**: `tests/integrations/traces/live-capture.cli.test.mjs:576`, B.
- **Esperado**: `{bound:true, code:null, entries:2, committed:2, persisted:2, lost:0}`.
- **Atual** (`B.log:733-776`): `{code:"delivery_timeout", committed:0, persisted:0, lost:2}`. O produtor 3 teve um único
  `open lock` concluído em 26.713 ms, “falhas nenhuma”, “lock ocupado 0x”, laço com atraso máximo de 10.016 ms (p99 18,1 ms,
  1.080 amostras), 26.779 ms da 1ª operação à saída. Os produtores 1 e 2 entregaram 1/1 cada. A captura ficou com
  `accepted 2 persisted 2` e lock ausente.
- **Leitura**: o produto cumpriu o prazo e informou a perda com código fechado; a política de perdas não mudou. A causa
  física de um `open` de ~26,7 s no host é **desconhecida**. Não atribuo a antivírus, disco ou à S13, e não reclassifico como
  verde.
- **Impacto**: segunda falha natural do B.

Nenhum dos dois foi repetido, contornado ou corrigido por mim.

## Gates (execução minha; infraestrutura do Root)

| Gate | Comando exato (1×) | Ambiente observado | Resultado |
| --- | --- | --- | --- |
| A | `matrix-controller.mjs independent-25 A` | Windows, Node v24.22.1, npm 11.19.1; HEAD/árvore iguais; `autocrlf=true`; pwsh `C:\Program Files\PowerShell\7\pwsh.exe` + opt-outs; 32 CPUs → 8; 68 + 2 arquivos; TEMP isolado (`tmpdir_isolado=true`); RUNNER_TEMP vazio | **643/630/0/0/13**, EXIT=0 natural, 20:38:21–20:46:05 UTC; status antes/depois vazio; raiz removida pelo registro (dev/ino) |
| B | `… B` | clone novo (dev/ino registrados), `core.autocrlf` em `.git/config` = true; `cli.mjs` `i/lf w/lf`, store `w/crlf`; zip `ca274269…` = SHASUMS256; node.exe igual ao zip; npm 11.6.2; Node v24.13.0; 8 | **643/628/2/0/13**, EXIT=1 natural, 20:46:33–20:53:00 UTC; HEAD/árvore/status iguais depois; clone conferido e removido |
| C | não executado | — | parado por regra após o FAIL do B (o controlador exige B válido) |
| D | não executado | — | idem |

- **Skips do A** (`A.log:45,192,193,195,196,234,236,238,242,260,285,370,686`): 13, todos de plataforma com motivo —
  sinais POSIX (I4-C15, I25-C5 POSIX, I25-C6, I25-C42 POSIX, T8-C4), ACL POSIX/macOS (I4-C25j/k/l/m), modos POSIX
  (I4-C25b), PATH vazio POSIX (I25-C45), arranjo `npm run` POSIX (I25-C33) e pty (I25-C15). O B tem o mesmo total de 13.
- **Testes novos da S14**: passaram em A (`A.log:333,334,665`) e em B (`B.log:333,334,665`). T8-C15 e os três
  diagnósticos dele passaram em B (`B.log:614-617`).
- Os 750/650 ms e o relatório de 1.000 ms aparecem só como resultado dos testes. Observados no B: 652–668 ms
  (`B.log:619-636`). Não medi nem mudei prazos.
- **Não observado por mim**: 643/621/0/22 no WSL, 1.076/1.056/0/20 no D, governança 27/27, motor 16/16, doctor 417/410/0/7,
  integrações 616, os 11 nativos com runtime Hermes, o I4-C35 pelo runtime Hermes e o caso do Python do sistema.
  Esses números são do autor e continuam atribuídos a ele.
- Processo: sem execução em segundo plano; 0 tarefas de fundo pendentes. Uma chamada `echo noop`, fora da allowlist, foi
  recusada pelo hook antes de executar (registrada na declaração).

## F1 da R24 / C46 (u) / C47 — análise fresca

- `helpers/traces.mjs:267`: `neutralPlace` exportado com o mesmo texto; `unheldPlace` (`:260`) dá `UNSURE_PLACE` quando
  `unsure`. `diskTrace` (`:243-246`): a tomada zera `unsure`; um `rename lock` com código → `unsure`; um `rename lock`
  concluído → fora; `unlink lock` legado → fora.
- `observe/agents.e2e.test.mjs:251,258`: as `falhas` e a `última concluída` de `hookTiming` usam `neutralPlace`, e o
  `placeOf` local não existe mais. Os pendentes já vinham de `pendingOf(line, neutralPlace)` (`helpers/traces.mjs:127`).
  O quarto consumidor está corrigido.
- `concurrency.cli.test.mjs:146` ainda tem a decisão própria, com `UNSURE_PLACE`. É a dívida registrada no Landing; a
  regra está correta.
- **Alcance das provas novas** (não é só `typeof`):
  - `agents.e2e:461-487`, hook real com `LOCK_KEPT=2` / `LOST_CONFIRMATION=2`: relatório exato, falhas e última
    concluída indeterminadas, mensagem sem `(fora do lock)`, `assertNoLeak`, efeito real (lock presente/ausente,
    `absences` +1) e controle `SEGMENT_EIO=1` concluído → `(fora do lock)`.
  - `agents.e2e:492-527`: `rmdir` EIO sem mover, `unlink` EIO depois de mover, `rmdir` pendente na saída, retomada →
    `2ª tomada` com a disputa contada, rename concluído e linha legada fora do lock.
  - `evidence.unit:264-283`: sequência completa por operação, rename pendente e legado.
  - O RED estrutural (`typeof`) é só a 1ª linha; a discriminação comportamental vem dos dois testes do `agents.e2e`.
- C47 (`agents.e2e:424,439`; `control.cli:1065,1081`; `evidence.unit:150,184`) passou em A e B; não li os literais
  linha a linha.
- **RED, GREEN e controles** (RED 19/16/3/0, GREEN 19/19/0/0, K1 8/6/2/0, K2 11/9/2/0, K3 11/8/3/0; o K3 recusado
  antes de executar): provas do autor Claude com infraestrutura do Root, **atribuídas**, não refeitas por mim.

## C1–C50 (status desta rodada)

Legenda: **A✔B✔** = provas nomeadas passaram nos dois gates frescos. **A✔B✖** = falha no B. **POSIX não fresco** = a
parte POSIX só rodaria no C, que não foi executado; o carry do autor (C2 643/621/0/22 em `a1156da`) fica atribuído.
Nenhum é PASS global, porque o veredito da rodada é FAIL.

| Check | Provas (arquivo:linha) | Status |
| --- | --- | --- |
| C1 | launch/command.cli:46 | A✔B✔ |
| C2 | command.cli:82 | A✔B✔ |
| C3 | command.cli:101 | A✔B✔ |
| C4 | agent.unit:39,83; command.cli:108 | A✔B✔ |
| C5 | command.cli:204 (POSIX, skip), :232 (Windows) | Windows A✔B✔; POSIX não fresco |
| C6 | command.cli:251 (POSIX, skip) | não fresco nesta rodada |
| C7 | prepare.cli:86 | A✔B✔ |
| C8 | prepare.cli:101,131 | A✔B✔ |
| C9 | prepare.cli:147 | A✔B✔ |
| C10 | prepare.cli:180 | A✔B✔ |
| C11 | prepare.cli:194 | A✔B✔ |
| C12 | prepare.cli:204,368 | A✔B✔ |
| C13 | prepare.cli:228 | A✔B✔ |
| C14 | prepare.cli:242 | A✔B✔ |
| C15 | prepare.cli:393 (pty POSIX, skip) | não fresco |
| C16 | agent.unit:157; session.e2e:48 | A✔B✔ |
| C17 | store.unit:49,82,113; session.e2e:295 | A✔B✔ |
| C18 | session.e2e:73 | A✔B✔ |
| C19 | session.e2e:128 | A✔B✔ |
| C20 | session.e2e:170 | A✔B✔ |
| C21 | session.e2e:195 | A✔B✔ |
| C22 | session.e2e:214 | A✔B✔ |
| C23 | session.e2e:259 | A✔B✔ |
| C24 | store.unit:159 | A✔B✔ |
| C25 | end.e2e:51 | A✔B✔ |
| C26 | end.e2e:92 | A✔B✔ |
| C27 | end.e2e:112; store.unit:207,241 | A✔B✔ |
| C28 | end.e2e:153,176 | A✔B✔ |
| C29 | command.cli:270 | A✔B✔ (Windows) |
| C30 | command.cli:303 | A✔B✔ |
| C31 | end.e2e:198,225 | A✔B✔ |
| C32 | end.e2e:265,303,396; store.unit:706,723,740,755 | A✔B✔ |
| C33 | end.e2e:446,481; arranjo `npm run` POSIX (skip) | Windows A✔B✔; POSIX não fresco |
| C34 | report.cli:73,120,189,221 | A✔B✔ |
| C35 | report.cli:242 | A✔B✔ |
| C36 | command.cli:347 | A✔B✔ |
| C37 | launch/docs:56,74,85 | A✔B✔ |
| C38 | prepare.cli:337 (console Windows) | A✔B✔ |
| C39 | hermes-harness.unit:88,96,183 | A✔B✔; nativos com runtime Hermes (D) não frescos |
| C40 | hermes-harness.unit:193,213,315; hermes-plugin.native:333 | idem |
| C41 | end.e2e:508–732; store.unit:301–514 | A✔B✔ |
| C42 | agent.unit:177,218; command.cli:390 (POSIX, skip), :429 | Windows A✔B✔; POSIX não fresco |
| C43 | end.e2e:817–958; store.unit:556–622 | A✔B✔ |
| C44 | hermes-harness.unit:252,276,295 | A✔B✔ |
| C45 | agent.unit:126; command.cli:157 (POSIX, skip), :189 | Windows A✔B✔; POSIX não fresco |
| C46 | lock-release.unit:105–462; concurrency.cli:296,323,350,945,**992**,1016; evidence.unit; delivery.unit; agents.e2e:461,492; follow/demo/docs/replay/live-capture/codex-run/failure-matrix | **A✔B✖** (F1) |
| C47 | agents.e2e:424,439; control.cli:1065,1081; evidence.unit:150,184 | A✔B✔ |
| C48 | scripts/governance-ci.test.mjs | A✔B✔ (C não fresco) |
| C49 | governance-ci.test.mjs | A✔B✔ |
| C50 | scripts/ci-lock-latency.test.mjs | A✔B✔ |

Além disso, o T8-C8 antigo (F2) falhou no B. Ele é consumidor da evidência do C46.

**Por AC**:

- AC1 (C1–C4, C45): Windows ✔; POSIX pendente.
- AC2 (C7–C15, C38): ✔ exceto C15 (pty).
- AC3 (C16–C24): ✔.
- AC4 (C25–C35, C41–C43): ✔ no Windows; C33/C42 POSIX pendentes.
- AC5 (C36–C37): ✔.
- AC6 (C39, C40, C44): unit ✔; o gate completo com os nativos não foi executado.
- AC7 (C46/T8-C15): T8-C15 ✔ em B, mas o C46 tem o F1.
- AC8 (C47, C48): ✔ em A/B; o D completo não foi executado.
- AC9 (C49, C50): ✔ local; a medição remota continua sendo condição de merge, não executada.

Conclusão: **o AC7 não está atendido nesta rodada, e AC1/AC2/AC4/AC6/AC8 estão sem prova fresca completa.**

## Limites, incidentes e atribuições

- **Produto**: não reavaliei integralmente o `13ecc07` (D1–D3, E5, 14 mutantes). Continua por identidade do autor S13 e
  da R24. Os blobs do HEAD que conferi no `A.env.txt:7` são `store.mjs` `72b138fc…`, `fs.mjs` `b088a4ab…`,
  `traces.mjs` `dc2668d9…` e `concurrency.cli` `cadb0571…`.
- **Incidente S14 `/tmp/x`** (o autor sobrescreveu `C:\Users\paulo\AppData\Local\Temp\x`, preexistente desde 26/09):
  só pelos registros (`s14.diff:44-46,181-184`). Não li nem toquei o arquivo global; impacto desconhecido. O mesmo vale
  para o C inicial recusado pelo Root (CRLF/8), `budgetMs` obsoletos, o K3 recusado, R5, cleanup 1.257/107, auxiliares
  globais, D interrompido pelo Root, R21, as seis sobras e as oito chamadas PowerShell da S13. Estão preservados nos
  registros. Não alego proveniência plena nem impacto global zero.
- **Raízes desta rodada**: as raízes isoladas A/B foram removidas pelo registro com dev/ino (`A.env.txt:12`,
  `B.env.txt:12`; 128 e 1.108 entradas deixadas pelos testes). O clone B foi removido depois da conferência
  (`B-controller.log:42-43`). Os PowerShell iniciados foram só os da prova governance-C48, com os opt-outs herdados.
- **Auditoria externa 25 (Root)**: `verifier-round25/profile-comparison-final.json` e `profile-target-check.json` **não
  existem**. Fica pendente do Root, sem atribuição a mim e sem baseline inventado. Metadados WSL não auditam conteúdo,
  Windows, PowerShell, rede, TEMP ou causalidade.
- **Histórico preservado**: PR40814315171 e manual40814471097 vermelhos/cancelados, R23 e R24 FAIL, CI066 não
  integrado. Não declaro CI verde, execução remota, `ready` nem formal 14. A formal 14 continua sem uso e não deve rodar
  sobre este FAIL.

## Declaração dos gates (escrita ANTES de qualquer execução)

- HEAD `80cfccf3eb36d04be02ea41e74548c38d0fd3bbd`, árvore `eebb633b…` (manifesto Root `worker-guard/independent-25-manifest.json`).
- A: Windows Node 24.22.1, `node --test --test-concurrency=8` sobre as integrações inteiras (`tests/integrations/**/*.test.mjs`, 68 arquivos) + `scripts/governance-ci.test.mjs` + `scripts/ci-lock-latency.test.mjs`, uma invocação, sem filtro; pwsh oficial e opt-outs no PATH/ambiente antes das fixtures; TEMP/TMP em raiz própria registrada; orçamento local 30 min.
- B: clone NOVO `core.autocrlf=true`, Node 24.13.0 oficial (zip conferido contra SHASUMS256) / npm 11.6.2, mesmo alvo, concorrência 8; toplevel/HEAD/eol/status antes e depois; orçamento 30 min.
- C: WSL Ubuntu uid 1000 (oldboydev), `git archive` com `core.autocrlf=false`, árvore igual obrigatória antes dos testes, Node 24.13 copiado num prefixo sem sh, `env -i`, PATH sem `/usr/bin`, sem agentes/pwsh, HOME/TMPDIR/RUNNER_TEMP próprios, concorrência 7 = min(8 CPUs−1, 8); orçamento 30 min.
- D: um `npm test` completo, Windows Node 24.22.1, runner padrão min(CPU−1, 8), nativos Hermes pelas fixtures versionadas; orçamento local 2 h.
- Cada comando exato executado uma vez, sequencialmente; qualquer falha/omissão/intervenção é preservada, sem repetição inalterada. Os orçamentos são locais, não prazos de produto/CI.
- Esperado pelo autor (não afirmado até observar): 643 em A/B/C, 1.076 em D.
- Observação de processo: antes desta declaração, uma chamada Bash `echo noop` foi recusada pelo hook `verifier-guard.mjs` (fora da allowlist) sem executar nada; registrada aqui.


### Adenda do coordenador Root — alcance da rodada25

A CLI do Verifier36486 terminou com exit0 e zero tarefas pendentes; o veredito foi FAIL, não aprovação. O contexto exportado contém42 comentários, incluindo o registro6507736435; o relatório acima diz1–41, e essa omissão de leitura fica preservada, junto com as demais fontes declaradas não lidas. Nenhum desses carries vale como verificação independente completa. O I4-C35 é a prova de integridade da árvore, não uma execução de runtimeHermes. Não foram executados C nem D.

A auditoria25 conserva apenas o baseline copiado do final24 (12113 entradas,18:39:10UTC). Não foi coletado final nem comparação: a condição de encerrar depois do D independente não aconteceu. A próxima janela deve manter esse baseline e declarar que inclui as provas parciais25; não inventar um D25 nem um baseline posterior. A auditoria é de metadados WSL, sem conteúdo/Windows/PowerShell/rede/TEMP/proveniência ou atribuição causal. O incidente do arquivo global Temp/x preexistente sobrescrito continua com conteúdo anterior sem cópia conhecida e impacto desconhecido.

A formal14 continua sem uso(13 anteriores preservadas, teto14). Não houve push, nova Action ou merge. As duas falhas naturais B ficam bloqueantes até diagnóstico, correção necessária comprovada e nova verificação; não serão repetidas inalteradas para procurar verde.

---

# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25 (rodada 24)

**Verdict (R24)**: **FAIL — 49/50 checks provados; todos os gates frescos passaram.** HEAD `34466ab`, produto `13ecc07`, último código de prova `736e7d7`, 9 ACs. É a primeira verificação independente da liberação do lock por reserva exclusiva (D1–D3) e do esquema 2 da medição.
- **Gates frescos (verified at `34466ab`)**, uma vez cada, sem filtro e sem repetição:
  - **A** Windows, Node 24.22.1: 640 testes, 627 pass, 0 fail, 13 skip, exit 0;
  - **B** clone novo com `autocrlf=true`, Node 24.13.0 oficial: 640/627/0/13, exit 0;
  - **C** WSL isolado, Node 24.13.0: 640/618/0/22, exit 0;
  - **D** `npm test` completo: **1.073 testes, 1.053 pass, 0 fail, 20 skip**, exit 0, término natural.
- **O protocolo novo está correto pela leitura e pelas provas.** A disputa real passou nos quatro ambientes: 2.000/2.000 eventos por processo, sem nenhum erro além de `lock_present`. O T8-C15 saudável, os controles (a)–(c), as 3 criações do T8-C16, os follows (T8-C12/C13/C19) e o I23-C6 passaram em A/B/C e no D.
- **O que falha (F1)**: um formatter de evidência ficou sem a adaptação que o plano vinculante exige.
  - `tests/integrations/observe/agents.e2e.test.mjs:239` (`placeOf`, diagnóstico I23-C10/C47) consome o `diskTrace` novo e ignora `unsure`.
  - Depois de um `rename lock` com erro, ele marca as operações seguintes como “fora do lock”.
  - O ajuste do Root (`.tasks/issue-25-lock-release-proposal.md:53`), o item 4 do refinamento do critério 38 (task) e o `Sources` (checklist `:11`) proíbem exatamente isso.
  - O C46 (u) diz “nas três funções de lugar” (Landing `:128`); há quatro, e a quarta não é coberta.
  - Não muda o produto nem faz nenhuma prova falhar.
- **O que isto não é**:
  - não é PASS;
  - não demonstra a causa do `EPERM` da R23, do B de `407edc5`, do `sync key` de 601 ms do I23-C6 da CI 066 nem do cancelamento da manual 40814471097;
  - não declara verde nenhuma CI futura.

  Não corrigi nada e não repeti nenhum gate.
- **Gates remotos**: pendentes e bloqueados por este FAIL. Não executei Action, CI, `review:run`, commit, push nem merge.

**Profile**: light (`AGENTS.md:138`). Por isso não há fault injection, `Coverage`, `Test policy` nem fonte de UI. Não criei mutantes, sondas, testes nem correções. RED, GREEN preliminares, mutantes, sondas `rmSync` e medições E5/`ci-lock-latency` são **provas do autor**, só atribuídas (`builder-lock-release/`).

**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..34466ab6e68e60179d0db765dd425a092cb276ed`, a feature inteira: 177 commits, árvore `09ceee25…`. Desde a R23 (`6204613`, relatório em `d80b246`), entraram 9 commits:
- `2c276d5` (proposta), `1613e23` (aprovação) e `1851481` (forma e provas, antes do código);
- **`13ecc07` (produto)**, `e80b99e` (disputa com o lock preso) e **`736e7d7` (último código de prova)**;
- `7ea4c1d` e `5a94042` (fechamento e retificação, só docs);
- `34466ab` (só o `approval` do override 25).

**Round**: **24** (light). Autorizações: “Pode fazer quantas precisar” e “Pode aplicar o plano completo nas três plataformas, mantendo os testes e prazos, e seguir até a CI ficar toda verde para fazer o merge e finalizar” ([6502294779](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6502294779)). Registro 24: [6504633472](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6504633472).
- `context-round24.json` (sha256 `4e40426c…`) tem 41 comentários e 9 ACs. O corpo e os comentários 1–37 são iguais aos de `context-round23.json`. Os novos são o 38 (FAIL 23), o 39 (diagnóstico), o 40 (aprovação) e o 41 (registro 24). O `round24-registration.md` é igual ao comentário 41, sem placeholders.
- `roundOverrides["25"]` = `{profile: "light", maxRounds: 14}`. Os perfis globais continuam com 2. De `736e7d7` ao HEAD, só a linha `approval` mudou.
- O `state.json` da revisão tem 13 tentativas (sha256 `6cf84579…`). A formal 14 está autorizada, **não foi usada e não deve rodar sobre este FAIL**.

**Verifier**: subagente novo e independente (Claude Opus 5.5). Não sou o autor nem os Verifiers anteriores, e não herdei sessão.
- Produto, testes, apoios, scripts, workflow, planos, configuração e estado ficaram só para leitura.
- Escrevi este arquivo e as evidências em `.checks/code-review/issue-25/verifier-round24/r24/`, pasta ignorada (`.gitignore:4`). Fora dela, só as raízes próprias dos gates, o clone B dentro de `r24/` e o scratch do C.
- Não li `profile-before.json`, `profile-final.json` nem os scripts do Root. Li só os agregados finais (abaixo).

Data: 29/10/2026 (-03).
- **Plano**: a identidade (`r24/blob-identity.txt`, 15:18), os processos de base (`r24/processes-before.txt`) e o alvo com orçamentos e concorrências (`r24/plan.txt`) foram gravados antes de qualquer gate. O F1 já estava no plano, achado por leitura antes dos gates.
- **Horários**: A 15:20:38–15:25:46; B 15:26:00 (clone), 15:26:07–15:30:56; C 15:31:18–15:32:32; D 15:32:43–15:38:27 (5 min 44 s).
- **Estado**: o HEAD foi `34466ab` do início ao fim. O `git status` ficou vazio antes e depois de A e do D. Em B, o status do clone ficou vazio. Em C, a árvore extraída é igual ao `HEAD^{tree}`.

## Fontes lidas (R24)

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md`, `tlc-implement/SKILL.md` e `references/verify.md` | inteiros. **Não há `CONTRIBUTING`** no repositório (busca: só dentro de `ci-node-24.13.0/…/node_modules`) |
| `.tasks/issue-25-lock-release-proposal.md` (plano aprovado, fonte vinculante) | inteiro |
| `context-round24.json`, `round24-registration.md`, `verifier-round24-dispatch.txt` | inteiros (o corpo e os 41 comentários) |
| `.checks/issue-25-agent-launch.md` | `Sources` (`:9-13`), a linha do Landing “Liberação do lock por reserva exclusiva” (`:128`) inteira, o C46 (u) (`:737-810`), o refinamento (o) do C50 (`:1036-1063`), `Swept` (`:1065-1083`) e o bloco do `Handoff` “Liberação segura do lock” (`:2586-2647`), com a retificação. O resto é histórico, carry da R23 |
| `.tasks/issue-25-agent-launch.md` | a seção nova (`git diff d80b246..HEAD`) |
| build | as seções novas (`git diff 736e7d7..HEAD`): mudança, RED, GREEN, mutantes, medição, gates, incidentes e a “Retificação documental” |
| `builder-lock-release/` | `plan.txt`, `discard-inventory.md`, os totais e `env` dos gates, `green-b-fix-cleanup.txt`, `probe-rmsync.txt`, `red-stop-control.txt`, `mutants2/result.json` e o m13 de `scripts/mutants.mjs`. São **relato do autor**, só atribuição |
| nota externa do Root | `coordinator-lock-release-method-note.md`, inteira, **atribuída ao Root** |
| relatório 23 | o topo R23 do `.verified.md` (`:1-357`) inteiro; o resto é histórico, atribuído sem nova execução |
| código | `store.mjs:55-320`, `:425-460`, `fs.mjs` inteiro, o diff de `d80b246..HEAD` de `src`, `scripts`, `docs` e de todas as provas e apoios mudados, `lock-release.unit.test.mjs` e `lock-release-child.mjs` inteiros, `trace-kinds.mjs`, `agents.e2e:225-300`, `launch/command.mjs:130-175`, `observe/command.mjs:120-175`, `governance-ci.test.mjs:437-560`, `scripts/test-integrations.mjs` |

## Prova Git (verified at `34466ab`; `r24/blob-identity.txt`)

- **Alterados de `d80b246` ao HEAD, fora de `.checks`/`.tasks`** (blob em `d80b246` → HEAD; o HEAD é igual ao de `736e7d7` em todos, salvo a configuração):
  - produto: `store.mjs` `326a0ac` → `72b138f` e `fs.mjs` `85d0b98` → `b088a4a`;
  - medição: `ci-lock-latency.mjs` `8c12894` → `3e00581` e o `.test` `75eeadd` → `955668e`;
  - apoios: `traces.mjs` `b71938f` → `88d3a6d`, `traces-probe.mjs` `292c319` → `ebcac0e`, `trace-kinds.mjs` `96a67e9` → `70817ec` e `lock-release-child.mjs` (novo, `0449e6d`);
  - provas: `lock-release.unit` (novo, `ed76ae0`), `concurrency.cli` `3d507e0` → `cadb057`, `evidence.unit` `6ccbf48` → `2e5ee18`, `launch/store.unit` `791770c` → `d0a9087`, `launch/end.e2e` `cd2dc94` → `1912fe9`, `observe/control.cli` `cc37712` → `8f1f811`, `observe/privacy.e2e` `ec11620` → `40bdf8e` e `privacy/store.cli` `b9b62cd` → `21ed9e6`;
  - `docs/traces.md` `b5baff6` → `4a63422`;
  - `code-review.config.json` `897a480` → `c1caab8` (`736e7d7` ainda `897a480`; só o `approval`).
- **Depois de `736e7d7`**: só `.checks/issue-25-agent-launch{,.build}.md`, `.tasks/issue-25-lock-release-proposal.md` e a linha do `approval`. Produto, provas, workflow, package e core sem mudança.
- **Iguais a `d80b246`**: `.github` `6a0b533`, `scripts/code-review` `6b98d7c`, `tests/doctor` `bcedb83`, `tests/integrations/fixtures` `6591970`, `package.json` `8fd02fa`, `package-lock.json` `9ec32e0`, `test-integrations.mjs` `22824c4`, `governance-ci.test.mjs` `5313dba`, `delivery.mjs` `e1cf25a`, `observe/command.mjs` `e0bd660`, `launch/command.mjs` `ca44a9d`, `agents.e2e` `eb23d7b`, `follow.cli` `73c1da9`, `demo.e2e` `3838b03` e `delivery.unit` `ee11376`.
- **Core vendorizado**: os 5 arquivos de `scripts/code-review/` têm o blob da base (`25e5284`, `c6a4abc`, `1bda8e4`, `216125c`, `b02001e`).
- **Alcance** (por busca):
  - `holdLockFile` serve `withLock` (toda operação do store) e `withControlLock` (setup/on/off no home). Os consumidores em `src` são `launch/command`, `observe/{authorization,command,config,delivery}`, `report/command` e `traces/{delivery-report,delivery,replay}`;
  - os apoios mudados são importados por 31 arquivos de prova;
  - os **68** arquivos `tests/integrations/**/*.test.mjs` importam `src/integrations` ou `helpers/`, e nenhum fica de fora;
  - `tests/doctor`, `src/doctor` e `scripts/code-review` não importam `integrations`.

  Por isso o alvo de A/B/C é o fecho real: as integrações inteiras, mais o par de governança que é o Proof do C50. São os mesmos 640 testes do autor, mas derivados por mim. Os não PASS remotos e históricos estão dentro dele: I23-C6 (`agents.e2e`), T8-C15 e controles (`concurrency.cli`), T8-C12/C13 (`follow.cli`), T8-C19 (`demo.e2e`) e `delivery.unit`. O motor e o doctor rodaram só no D.

## Análise da mudança (verified at `34466ab`, por leitura; as provas estão nos gates)

**1. Protocolo** (`store.mjs:185-269`, `releaseLockFile`, chamado de `holdLockFile:298-302`), contra o plano aprovado e os ajustes do Root:
- **Tomada intacta**: `wx` com `{lockVersion, pid, nonce}`, sem flush (`:284-286`). Só `EEXIST` vira `lock_present` (`:288`). O callback e a prioridade do erro dele (`:293-303`, `failure ??=`) não mudaram.
- **Reserva**: `io.mkdtemp(lockPath + "-release-")` (`:222`), ao lado do lock. `fs.mjs:31-34` usa o `mkdtemp` de `node:fs/promises`: 0700 no POSIX (mkdtemp(3)) e a DACL herdada no Windows. O nome nunca é reutilizado.
- **Identidade**: `lstat(slot, {bigint: true})`, pasta e não link, com `dev`/`ino` (`:207-210`). O `lstat` de `createStoreIo` é o de `node:fs/promises` e recebe a opção. Sem identidade, `LockReleaseError` sem `code` (`:199-204`, `:224`), e a reserva não é limpa.
- **Conferência adjacente**: `readSmallFile(lockPath)` e a comparação dos bytes (`:230-231`) logo antes de `rename(lockPath, <slot>/lock)` (`:233`). O destino fica dentro da pasta recém-criada.
- **Limpeza só do comprovado**:
  - com o rename tentado, `assertSameSlot` (`:242`) vem antes de abrir o retirado; depois, a releitura e a comparação (`:243-244`) e o `unlink` só com os nossos bytes (`:245-247`);
  - um `unlink` que lança libera o `rmdir` só com a ausência conferida (`:251`, `lstat` com `catch → null`), e a falha que sai é a dele;
  - o `rmdir` exige a identidade de novo (`:262-263`);
  - sem `readdir`, sem remoção recursiva, sem rollback e sem escolha por nome, prefixo, idade ou pid. Cada efeito roda no máximo uma vez, e vale a primeira falha (`failure ??=`, `:257`, `:265`, `:268`).
- **Caminhos de falha** (todos pela leitura, todos com uma prova na tabela f1–f14):
  - `mkdtemp` ou `lstat` que falham: erro cru, lock fica;
  - bytes alheios antes: `lostCode`, reserva vazia removida;
  - rename sem mover: o retirado ausente (`null`) libera o `rmdir`, erro do rename, lock fica;
  - rename que move e lança: o retirado com os nossos bytes é apagado, erro do rename;
  - retirado alheio: `lostCode`, nada apagado;
  - troca do slot antes ou depois do rename: `LockReleaseError`, nada atravessado.
- **Leitura auxiliar depois do `unlink` que lança** (`:251`): é só um `lstat` do retirado, sem reconferir o slot. Ele decide apenas se o `rmdir` é tentado, e o `rmdir` reconfere a identidade. Fica dentro do limite de ameaça aprovado (sem promessa contra a mesma autoridade entre conferência e efeito). Não é achado.
- **Retirado ausente depois de um rename confirmado**: a chamada sai sem erro e remove a reserva vazia. O rename é a liberação (`proposal:44`), e o sumiço só ocorre com interferência da mesma autoridade. Nenhum requisito aprovado pede falha aqui; não invento um.
- **Fronteira**: `lockLeft: !(error instanceof StoreError)` (`store.mjs:1203`). Então:
  - `LockReleaseError` e os erros crus dão `io_failure` com `lockLeft: true`;
  - `lostCode` dá `lockLeft: false`.

  Nenhum errno é inventado, e a recomendação antiga `lockLeft: false` não voltou. No home, `withControlLock` usa `foreign_entry` (`observe/command.mjs:146-149`).
- **D2**: `needsAdoption` e `initStore` sem diff. Com o marcador, uma sobra é inerte (`initStore` volta ao ler o marcador, `:454`). Sem ele, a entrada desconhecida dá `store_invalid` (`:169`, `:455`). Numa primeira criação normal, a reserva só nasce depois do marcador publicado.
- **Política**: só `EEXIST` é repetido (10 ms, `delivery.mjs:19`); `EPERM` real continua `io_failure`. Não há fallback para o `unlink` nem nova tentativa.

**2. Injeções reapontadas** (`traces-probe.mjs:105-124`; I25-C43 em `launch/store.unit:534-545` e `launch/end.e2e:781-796`, `:933-941`):
- `LOST_CONFIRMATION` renomeia e lança. Pela leitura do produto, o lock sai, a limpeza termina e quem chama vê o EIO, como o antigo `unlink` que apagava e lançava;
- `LOCK_KEPT` lança sem mover: o lock fica, e a reserva vazia sai.

Os efeitos para quem chama e no disco são os mesmos. A única diferença visível é o `lstat lock.retirado ENOENT` na evidência do lock preso, que o C46 (u) e o Landing exigem. **As adaptações não são prova causal**: o autor declarou que ficam vermelhas no código anterior porque a injeção mira o rename.

**3. Evidência** (`traces.mjs:222-248`, `:256-264`):
- `rename lock` concluído encerra a posse. Com erro ou pendente, `unsure` vale até a tomada seguinte. As linhas legadas com `unlink lock` encerram a posse como antes.
- `placeInCapture`, `neutralPlace` (por `unheldPlace`) e a função do `concurrency.cli:146` dizem “posse do lock indeterminada”.
- `trace-kinds.mjs:12-13` classifica a reserva e o retirado só pelo tipo. O fallback é “pasta”, sem caminho.
- **A quarta função de lugar, `agents.e2e:239`, não foi adaptada (F1).**

**4. Medição, esquema 2** (`ci-lock-latency.mjs:28-32`, `:131-171`, `:368`, `:428-429`):
- `skillMeLockLatency: 2` e o `namespace` individual;
- `retirada` vai até o fim do rename; `liberacao` é a completa;
- as sete operações: `reserva`, `renomeacao`, `remocaoRetirado` e `pasta`, sem a antiga `remocao`;
- `isCycle` exige as dez chaves (`:105-106`), e a ausência nunca vira 0;
- `PHASE` 3×500, 3 cargas de 64 KiB, 120 s e as faixas 600/650 (`:21-22`) sem diff.

**5. Docs**: `docs/traces.md:498-507` traz os nomes das reservas, as sobras sem chave nem conteúdo, nenhuma coleta, a retenção de 7 dias que não as alcança, a remoção manual e o `store_invalid` sem `store.json` (D2).

## F1 — formatter do I23-C10 sem a posse indeterminada (bloqueante)

- **Cenário**: num processo de hook do I23-C10 (`agents.e2e`, com a pré-carga de tempos), a liberação do `.lock` falha no rename, por exemplo `EPERM`/`EIO` real do Windows, antes ou depois do movimento. A limpeza continua (`lstat` do slot e do retirado, `rmdir lock.reserva`).
- **Esperado** (plano aprovado `:53`): “O formatter deve representar posse indeterminada quando não houver confirmação do efeito, em vez de marcar automaticamente as operações seguintes como ‘fora do lock’.” Dizem o mesmo:
  - o item 4 do refinamento do critério 38 (task): “depois de um rename com erro, a posse indeterminada em vez de ‘fora do lock’”;
  - o `Sources` (`:11`), que dá a regra antiga como superada.

  O formatter comum faz isso (`evidence.unit:246-248`: `rmdir lock.reserva (posse do lock indeterminada)`).
- **Atual** (pela leitura; a função é pura):
  - `placeOf = ({ held, hold, kind }) => (held ? … : kind === "lock" ? "tomada do lock" : "fora do lock")` (`agents.e2e:239`);
  - o `diskTrace` devolve `held: false, unsure: true` depois do `rename lock` com código (`traces.mjs:245`), mas `placeOf` descarta o `unsure`;
  - `hookTiming` (`:246-262`) produz `última concluída: rmdir lock.reserva (fora do lock)`, e qualquer falha seguinte, como um `rmdir lock.reserva EIO`, sai “(fora do lock)” nas `falhas`, pelo `describeTiming` (`traces.mjs:192-193`, que usa `describeDiskOps`, `:165-168`).
- **Cobertura**:
  - o Landing (`:128`) enumera “três funções de lugar, inclusive a do `concurrency.cli`”, mas há quatro consumidores de `diskTrace` com rótulo de lugar (busca por `fora do lock` em `tests/integrations`: `traces.mjs:260`, `concurrency.cli:146` e `agents.e2e:239`);
  - o `agents.e2e` tem o mesmo blob desde antes da R23 (`eb23d7b`), então a fatia não o tocou;
  - os controles do I23-C10 injetam `SEGMENT_EIO` e disco parado (`agents.e2e:424`, `:438`), nunca uma falha do rename;
  - o m13 do autor muda só o `traces.mjs` e é morto só pelo `evidence.unit` (`scripts/mutants.mjs:28`).

  Nenhuma prova afirma o lugar nesse formatter.
- **Impacto**:
  - nenhum no produto, e nenhuma prova falha;
  - mas a evidência do I23-C10, a prova cujo diagnóstico motivou o AC8, afirmaria uma liberação não confirmada justamente na classe de falha desta entrega (a liberação do lock). Isso induz a investigação a erro.
  - é o requisito vinculante do Root, não uma preferência minha.
- **Localização**: `tests/integrations/observe/agents.e2e.test.mjs:239` (função) e `:249-257` (uso). A lacuna da enumeração está no checklist, `:128`, “três funções de lugar”.
- **Decisão**: com o coordenador. Não proponho código nem corrijo nada.

## Histórico do autor — preservado e analisado (não são resultados meus)

- **RED** (`1613e23` + provas): 143/107/35/1. A disputa teve `EPERM` 72 (a) e 59 (b), a regressão estatística vermelha declarada.
  - **Execução interrompida**: o autor encerrou o processo do `control.cli` (pid 64760, pai 12728) por identidade (`red-stop-control.txt`). Os totais incluem esse arquivo interrompido. **Não é término natural completo.**
  - As adaptações vermelhas eram esperadas e não são prova do defeito.
  - O RED do formatter usou `TEMP` = `logs/` privada, sem raiz registrada; a listagem sem sobras não foi retida.
- **GREEN e sondagem**: `green1` 173/172/0/1, `green2` 10/10/0/0 e `probe-int` 613/600/0/13. Não são gates.
- **Mutantes**:
  - a 1ª bateria, em `13ecc07`, teve 13 términos naturais vermelhos. O **m6 ficou interrompido**: o autor encerrou os filhos 72604 e 85064 por identidade (`m6-stop.txt`);
  - a 2ª bateria (`mutants2`, `e80b99e`) é a única com os **14 términos naturais**, todos vermelhos (`result.json`).
- **B de `e80b99e`**: 640/626/1/13, **exit 1, término natural, preservado**. O `rmSync` do Node 24.13.0 não apagava um arquivo em “raiz ação”. O autor confirmou com a sonda ASCII/Unicode nos dois Nodes (`probe-rmsync.txt`: 24.13.0 `rmSync raiz ação` “ficou”; 24.22.1 removido; `unlinkSync` removido nos dois). A correção `736e7d7` trocou só as duas remoções da prova por `unlinkSync`, com as asserções intactas.
- **Gates finais do autor em `736e7d7`**: A2 e B2 640/627/0/13, C 640/618/0/22 e D 1.073/1.053/0/20, exit 0. O meu D tem as **mesmas 1.073 linhas, nome a nome e marca a marca** (`r24/D-summary.txt`).
- **Medição do autor (E5 copiado, callback vazio, 2×5.000 no mesmo `.lock`, C:)**:
  - antes: 555 `EPERM` em 20.000 (149/132 e 134/140);
  - depois: 0, com 20.000 concluídos e sem sobras;
  - liberação completa p50 de 0,67–0,68 ms para 2,51–2,61 ms.

  É uma medida do lock, não do pipeline com fsync. A medição local do `ci-lock-latency` foi só a fase A, 1.500 ciclos, sem `RUNNER_TEMP`, e não há 4.500 comparativos novos. Nada disso substitui POSIX, CI ou a medição remota.
- **Retificação `5a94042`**, que prevalece sobre os trechos antigos:
  - **descartes**: as seis sobras foram escolhidas por prefixo/`birthtime` dentro de `logs/`, sem `dev`/`ino` individual. As guardas das cópias e dos clones são distintas das raízes `sm-blr-*` e do E5, que tiveram `dev`/`ino`. A `mutants-copy` saiu sem conferir tipo;
  - **PowerShell**: **8** chamadas, todas atribuídas ao autor:
    - **7** com o opt-out só dentro do comando, sem `UPDATECHECK` nem TEMP próprio;
    - **1** depois do D, com os opt-outs herdados antes, mas TEMP/TMP = `logs/` sem raiz registrada.

    A `sed` documental que menciona `powershell.exe` não conta como execução.

  O alcance e os limites ficam como o autor e o Root os registraram: sem proveniência individual plena, sem impacto global zero e sem efeitos auditados das inicializações.

## Execuções — verified at `34466ab`

A ordem foi A, B, C e D, em sequência, uma vez cada, sem filtro e sem repetição (`r24/plan.txt`).
- **Alvo de A/B/C**: `node --test --test-concurrency=<n> "tests/integrations/**/*.test.mjs" scripts/governance-ci.test.mjs scripts/ci-lock-latency.test.mjs`, ou seja, 68 + 2 arquivos.
- **Concorrência**: `<n>` é o contrato do runner (`max(1, min(CPU−1, 8))`), calculado no ambiente e conferido com o declarado: A e B, 8 (32 CPUs); C, 7 (8 CPUs).
- **Orçamentos**, passados à ferramenta: 30 min em A, B e C; 2 h no D. Esperei o término real de cada um.
- **Forma comum**:
  - `RUNNER_TEMP` numa pasta própria, vazia antes e com 0 entradas depois;
  - TEMP/TMP numa raiz própria `sm-v24-<rótulo>-…` (mkdtemp; caminho real, tipo, `dev`, `ino` registrados);
  - `npm_execpath` ausente e `npm_config_update_notifier=false`;
  - em A, B e D, `POWERSHELL_TELEMETRY_OPTOUT=1`, `POWERSHELL_UPDATECHECK=Off`, TEMP/TMP próprios e o pwsh oficial `C:\Program Files\PowerShell\7` na frente do PATH, **exportados antes do node**. Só a prova `governance-C48` iniciou o pwsh, por `spawnSync` com timeout (`governance-ci.test.mjs:503-515`).
- **Scripts** (meus, em `r24/`): `isolated-root.mjs`, `run-target.sh`, `make-clone-B.sh`, `remove-clone-B.sh`, `wsl-run.sh`, `run-npm-test.sh`, `matrix.mjs` e `d-summary.mjs`.

| # | Ambiente | Resultado |
| --- | --- | --- |
| A | Windows 11, checkout principal, Node **v24.22.1** (`C:\nvm4w\nodejs`), npm 11.19.1. Blobs de `store.mjs`, `fs.mjs`, `lock-release.unit`, `concurrency.cli`, `traces.mjs` e `ci-lock-latency.test` iguais aos do HEAD; concorrência 8 | **640: 627 pass, 0 fail, 13 skip**, exit 0. Status vazio antes e depois. Raiz `sm-v24-A-iDZhjO` (128 entradas) conferida e removida pelo registro |
| B | **Clone git novo** em `r24/B-clone` (`--no-hardlinks --no-checkout --config core.autocrlf=true`, sem rede; nada global mudou), com `dev`/`ino` registrados. HEAD, árvore e toplevel conferidos. Node **v24.13.0 oficial**: o zip `ca274269…` é igual ao `SHASUMS256.txt`, o `node.exe` `d14ba95c…` é igual ao do zip e o npm **11.6.2** fica adjacente. `cli.mjs` `i/lf w/lf`, **0 CR antes e depois**; `store.mjs` com 1.428 CR e `lock-release.unit` com 475 CR no clone (o autocrlf agiu). Status vazio antes e depois do `node_modules`; concorrência 8 | **640: 627 pass, 0 fail, 13 skip**, exit 0. Depois: HEAD, árvore e toplevel iguais, bin LF/0 CR e status vazio. Raiz `sm-v24-B-dXovgS` (1.099 entradas, o `rmSync` do 24.13.0) removida pelo registro. Clone removido depois de conferir o caminho real, pasta não link, o mesmo `dev`/`ino`, toplevel, HEAD e status vazio (`B-clone-cleanup.txt`) |
| C | WSL `Ubuntu`, `oldboydev`, uid 1000. `git -c core.autocrlf=false archive` do HEAD: 6.799.360 bytes, sha256 `3ed61674…`, `get-tar-commit-id` = `34466ab…`. Árvore extraída `09ceee25…` = `HEAD^{tree}`; 0 CR; `cli.mjs` 755. Node **v24.13.0** copiado de `/usr/bin/nsolid` (`150946e4…`, igual) num prefixo `node npm npx`, **sem `sh`**; npm 11.6.2. `env -i` só com `HOME`, `LANG`, `PATH`, `RUNNER_TEMP`, `TMPDIR` e `npm_config_update_notifier`. `PATH` = prefixo + `tools` (links para `/usr/bin/{sh,git,python3,id,grep,mkfifo}`), **sem `/usr/bin`**, sem agentes nem `pwsh`; concorrência 7 | **640: 618 pass, 0 fail, 22 skip**, exit 0. `RUNNER_TEMP` e `HOME` com 0 entradas; `TMPDIR` com 128. Scratch `/tmp/sm-v24-C.EnwwMV` removido pelo caminho exato, pasta não link, uid 1000, dev 2096 e inode 1474 |
| D | `npm test`, sem argumentos, no checkout principal: Windows, Node v24.22.1, npm 11.19.1, `SKILL_ME_HERMES_PYTHON` ausente, `availableParallelism` 32 → runner 8. O pwsh oficial na frente do PATH (só o caminho). Orçamento de **2 h** (7.200.000 ms). Checkout commitado e limpo | **1.073 testes: 1.053 pass, 0 fail, 20 skip**, **exit 0**, término natural (`D.env.txt`). Por suíte: governança 27/27/0/0, motor 16/16/0/0, doctor 417/410/0/7 e integrações 613/600/0/13. HEAD igual e status vazio antes e depois; `RUNNER_TEMP` com 0 entradas. Raiz `sm-v24-D-dS86YW` (128 entradas) removida pelo registro |

**Nomes de A/B/C** (`r24/matrix-ABC.txt`): as 640 linhas (634 de topo) têm os **mesmos nomes, com subtestes, nos três ambientes**, sem duplicado e sem falha.
- `I25-C46 liberação do lock` teve 10/10 em A, B e C.
- `I25-C46 evidência comum` 8, `diagnóstico do T8-C15` 3, `prazo da entrega` 8, T8-C15 1, T8-C16 9, I25-C43 12 e I23-C4 7 também passaram nos três, assim como I23-C6, I23-C10, I23-C17, I5-C49b, T8-C12, T8-C13, T8-C19 e os 18 C50.
- Governança: 9 em A e B; 8 + 1 skip em C (o ramo Windows do `governance-C48`).
- **Disputa real** (`ℹ disputa`): sempre `ok` 2.000/2.000 e `falhas {}`. Os `lockPresent` foram A 2.249/5.591, B 2.205/2.637, C 7.748/7.646 e D 2.476/2.924.

**Skips**:
- **A e B (13)**: I4-C15, I4-C25b/j/k/l/m, I25-C5, C6, C15, C33 (arranjo POSIX), C42, C45 e T8-C4 (sinal POSIX). Todos com motivo de plataforma, e **todos passaram em C, salvo o I4-C25m** (macOS).
- **C (22)**:
  - 11 `hermes-runtime-ausente`;
  - o `governance-C48` Windows;
  - I4-C25g/h/i (DACL);
  - I4-C25m (macOS);
  - I25-C4, C5 (console), C8 (LOCALAPPDATA), C38, C42 (console) e C45 (controle do Windows).

  Todos com motivo, e os do Windows passaram em A e B.

**D** (`r24/D-summary.txt`, comparado nome a nome):
- **Contra o D do autor (`736e7d7`)**: idêntico, com as mesmas 1.073 linhas, marcas e motivos.
- **Contra o D da R23 (`6204613`)**:
  - entram os 10 `I25-C46 liberação do lock` e 1 `evidência comum`;
  - o T8-C15 saudável troca de `✖` para `✔`;
  - os skips são os mesmos 20, em nome e motivo.
- **Nomes por check**: cada prefixo de `I25-C1 ` a `I25-C47 ` tem ao menos um `✔`, salvo `I25-C6` e `I25-C15`, que no Windows só têm skip e passaram em C.
  - O `I25-C46` soma 44 `✔`, `I25-C43` 12 e `I25-C47` 6.
  - Também passaram os 9 T8-C16, T8-C15, T8-C19, T8-C12, T8-C13, os 2 T8-C20, os 7 I23-C4, I23-C6, I23-C10, I23-C17, I5-C49b, I4-C16 (3), I4-C17, I4-C35, I4-C36, I4-C47 e T8-C2/C3/C8/C14/C18.
  - Os 9 `governance-` (os dois `governance-C48` com o pwsh oficial) e os 18 `C50` também, com `RUNNER_TEMP` presente.
- **Hermes**:
  - os **11 nativos com runtime** passaram: I4-C18–C23 (`D.log:622-627`), I4-C37 (`:628`), `I25-C40 harness nativa` (`:629`), os dois I23-C8 com runtime (`:630-631`) e I4-C44b (`:633`), pelo runtime local das provas versionadas e o `HERMES_HOME` temporário delas;
  - o **ramo Hermes do I4-C35** passou (`:1088`);
  - o `I23-C8 … pelo Python do sistema` (`:632`) passou, mas não é runtime do Hermes.

  A CI não tem o runtime do Hermes; lá os nativos não rodam.
- **Skips (20)**:
  - doctor (7): POSIX/FIFO (`# SKIP`). Não rodaram em ambiente nenhum desta rodada;
  - integrações (13): os mesmos de A, todos rodados em C salvo o I4-C25m.

## Checks — 49/50 provados; C46 não provado contra a fonte vinculante

Fontes da prova:
- **A/B/C24**: as integrações inteiras e o par de governança, frescos nos três ambientes, com os mesmos nomes. Não há mais carry de A/B/C por blob.
- **D24**: o nome real passou no D fresco.
- **G21**: só a análise estrutural do workflow (blob `f24e82d` igual).

As citações dos arquivos mudados foram renovadas no HEAD. As dos demais são as da R23 (blobs iguais).

| Check | Asserção decisiva (`file:line` no HEAD) | Prova | Result |
| --- | --- | --- | --- |
| C1 | `command.cli:48-49` `private`/`bin`; `:65` `[0, SKILL_ME_HELP, ""]`; `:77` `gitStatus() === before` | A/B/C24; D24 | provado |
| C2 | `command.cli:96-98` `argv: LITERAL_ARGS` | A/B/C24; D24 | provado |
| C3 | `command.cli:105` `{0: 0, 7: 7}` | A/B/C24; D24 | provado |
| C4 | `command.cli:130-133` 127 `launcher_requires_shell`; `agent.unit` `I25-C4` | A/B (shim só Windows), C (skip com motivo); D24 (3 `✔`) | provado |
| C5 | `command.cli:228` POSIX; `:244-245` `CTRL_C_EVENT` → `["SIGINT"]` | console em A/B/D24; POSIX em C24 | provado |
| C6 | `command.cli:267` `signals: ["SIGTERM"]` | **C24** (skip no Windows, com motivo) | provado (fresco) |
| C7–C14 | `prepare.cli:93-94`, `:122-126`, `:163-168`, `:189-191`, `:200`, `:223`, `:238`, `:250` | A/B/C24; D24 | provado |
| C15 | `prepare.cli:408` (pty) | **C24** (skip no Windows, com motivo) | provado (fresco) |
| C16–C23 | `session.e2e:67`, `store.unit:79`, `session.e2e:111`, `:161`, `:190-192`, `:208-211`, `:230`, `:282` | A/B/C24; D24 | provado |
| C24 | `store.unit:168` | A/B/C24; D24 | provado |
| C25–C28 | `end.e2e:80-89`, `:101-109`, `:120`, `:164-165` e `:194` `["EIO"]` | A/B/C24; D24 | provado |
| C29–C31 | `command.cli:278`, `:342`; `end.e2e:205-215` | A/B/C24; D24 | provado |
| C32 | `end.e2e:320`; `store.unit:715` | A/B/C24; D24 (9 `✔`) | provado |
| C33 | `end.e2e:460`; `:493-494` (arranjo POSIX) | A/B/C24 (arranjo em C); D24 | provado |
| C34–C35 | `report.cli:159`, `:252-259` | A/B/C24; D24 | provado |
| C36–C38 | `command.cli:350`; `launch/docs.test:82`; `prepare.cli:355` | A/B/C24 (C38 em A/B); D24 | provado |
| C39–C40 | `hermes-harness.unit:90`; `:220`, `:320`, `:324`, `:327`; nativo `hermes-plugin.native:336` | A/B/C24 (harness); **D24**: os 11 nativos | provado |
| C41–C45 | `store.unit:327-523`, `end.e2e:518`; `agent.unit` `I25-C42`, `command.cli:456`/`:424`; **`store.unit:562`, `:580` `{code: "io_failure", …, lockLeft: true}`, `:600` `root_changed`/`lockLeft: false`** (I25-C43 reapontado ao rename, `:534-545`); `end.e2e:817-958` (I25-C43, `lockKeptIo` `:781-796`, `:933-941`); `hermes-harness.unit:288`, `:291`; `agent.unit:132-146`, `command.cli:166-186` | A/B/C24 (I25-C43 12/12 nos três; POSIX C42/C45 em C); D24 (17, 4, 12, 3 e 3) | provado |
| **C46** | **(u)**: saudável `lock-release.unit:107` `{value: "resultado"}`, `:108` `[1, 1, 1, 1]`, `:110` prefixo `` `${lockPath}-release-` ``, `:117` `["readBounded", lockPath]` adjacente ao rename, `:118` releitura antes do `unlink`, `:120` `["ausente", []]`; **f1–f14** `:127-235` com `:239-245` (erro `LockReleaseError` sem `code` `:99-103`, cru ou `lostCode`; `[lockState, leftovers, counts]`); link `:261-263`; f13 e troca depois do rename `:282-303`; nomes parecidos `:316-317` (bytes e `ino`); quedas `:341-351`; D2 `:367-376`; dois consumidores `:398-401` `{io_failure, opened: true, lockLeft: true}`, `:420` `{root_changed, lockLeft: false}`, `:429` `[5, "io_failure"]`, `:441` `[4, "foreign_entry"]`; saudável nos dois `:452-459`; disputa `:468` `[0, null, ""]`, `:472` `{ok: 2000, falhas: {}}` ×2, `:474` pasta vazia. Evidência `evidence.unit:242`, `:246-248` (posse indeterminada), `:251`, `:254`, `:257`; `concurrency.cli:333`, `:345`, `:360` (os literais do C46 (u)); `lockReleases` `:891`, `:912`, `:933`, `:968`, `:1007`, `:1024`; flush `[2, 2, 2, 2]` `:1086-1089`; `control.cli:827`; `store.cli:439-447`; `privacy.e2e:130-131`. **T8-C15 saudável** `concurrency.cli:222` `{bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0}` (teste `:226`; 2×40 intercalados por 4 `:128`; `:233` 80; `:235-236` `[80, 80]`); (a)–(c) `:296-372`; T8-C16 3 criações `:887`, `:930`, `:966`; (d)–(t) com as citações da R23 nos blobs iguais, renovadas onde mudaram: (k) `evidence.unit:54-148`, (m) `:287-296`, `:320-331`, (n) `:336-338`, `:345`, (p) `concurrency.cli:945-1024`, T8-C16 `:916-933` | **A/B/C24** (10 + 8 + 3 + 8 nos três; T8-C15/C16 nos três); **D24**: 44 `I25-C46` `✔` | **não provado contra a fonte vinculante** (F1). Todas as provas nomeadas de (a)–(u) passaram em A/B/C/D; a exigência do Root sobre o formatter não vale no `agents.e2e:239`, e o (u) a enumera de forma incompleta |
| C47 | I23-C10 `agents.e2e:315`; (a) `:427`, `:429`; (b) `:442`, `:444`; (c) `control.cli:1071-1077`; (d) `:1097-1105`; `evidence.unit:150-225` | A/B/C24; D24 (6 `✔`, 7 `I23-C4`) | provado como escrito. É a localização do F1 (`:239`), cujos controles não exercitam um rename com erro |
| C48 | estrutura contra `d0d5a7f` (R21, workflow `f24e82d` igual); `governance-ci:373-433`, `:444-582`, `:511`, `:565-576`; `governance-C1 C3` `:271-283` | **A/B24** e **D24** (os dois `governance-C48` com o pwsh oficial); C24 com o ramo Windows em skip e motivo | provado |
| C49 | `governance-ci:322-329`, `:330-334`, `:337-348`, `:350-356`, `:359-362`; `:299-304` | A/B/C24; D24 | provado |
| C50 | (a)–(n) com as citações da R23 nos trechos sem diff; **(o)**: `ci-lock-latency.test:146` tudo `UNAVAILABLE` com `retirada` e as 7 operações; `:216-219` EIO no rename, com só `reserva` e `pasta` numéricas no 1º; `:231-232` 3 × `[null, …7 × "number"]`; `:397` as 7 operações em ordem; `:399` `amostras` 15; `:412` `[2, "individual: um lock por produtor; não mede disputa entre produtores"]` | **A/B/C24** (18 `C50` nos três, `RUNNER_TEMP` presente); D24 (18) | provado |

- **Critérios não reduzidos** (`src` fora de `store`/`fs` sem diff desde a R23):
  - `DELIVERY_DEADLINE_MS = 750`, `ATTEMPT_MS = 750 − 100` e `LOCK_RETRY_MS = 10` (`traces/delivery.mjs:12`, `:18`, `:19`);
  - `REPORT_DEADLINE_MS = 1000` (`observation.mjs:39`);
  - `HOOK_STDIN_DEADLINE_MS = 2000` (`hook-command.mjs:7`);
  - a faixa 1.900–6.000 (`failure-matrix.cli:83`, `:119`);
  - `DEFAULT_SETTLE_MAX_MS = 5000` (`settle.py:13`, `:41`);
  - `PRIVACY_LIMITS` 500/8 MiB (`lifecycle.mjs:5`) e retenção de 7 dias (`:7`);
  - `MAX_PARALLEL_FILES = 8` (`test-integrations.mjs:14`);
  - o workflow, com o mesmo blob: detecção 5 (`:21`), verify 20 no Windows e 10 nos demais (`:43`), CI 5 (`:79`) e o manual 10 só por `workflow_dispatch` (`:98-100`).

  O T8-C15 mantém 80 eventos, 40 por produtor, 2 produtores, 4 linhas intercaladas, payloads e export 80. O T8-C16 mantém 3 criações. Nenhuma asserção, contagem, carga, concorrência, retry ou política de perda mudou: as adaptações só trocam a operação que libera, e o único literal novo é o exigido no C46 (u).
- **AC → checks** (9 ACs): AC1–AC6 com C1–C45, provados, e o gate completo do AC6/S6 verde. **AC7 com C46, não provado contra a fonte vinculante (F1).** AC8 com C47 e C48, provados como escritos; o F1 está no diagnóstico do C47. AC9 com C49 e C50, provados.

## Swept `existing` (carry R23; `src` igual fora de `store`/`fs`)

- idempotência: `privacy/lifecycle.mjs:23-24`;
- sem reenvio: `traces/delivery.mjs:57`, `:123`;
- falha de entrega não bloqueia: `traces/delivery.mjs:156`;
- `privacy prune`: `privacy/command.mjs:56-57`;
- acréscimos da liberação segura do lock: são refinamentos do C46 (u) e do C50 (o), sem check novo.
  - **failure modes, idempotency and retry**: f1–f14;
  - **concurrency and ordering**: a disputa;
  - **data lifecycle**: quedas, D2 e docs;
  - **authorization**: nomes parecidos, troca, link e alheio;
  - **observability**: a evidência e o esquema 2.

  Todos estão provados acima, salvo a observabilidade no formatter do I23-C10 (F1).

## Observações (não bloqueantes; nada corrigido)

- **O1 — mensagem do launcher depois do movimento.** Com `lockLeft: true` também depois do rename, o launcher diz que o lock “pode ter ficado” e manda conferir o `pid` (`launch/command.mjs:159-164`). Isso segue o Landing (“confirmação incerta do contrato vigente”). A mensagem não cita a reserva que pode sobrar; `docs/traces.md:498-507` cobre a recuperação.
- **O2 — sobras do `rmSync` do 24.13.0.** O B deixou 1.099 entradas na raiz própria (A e D, 128; C, 128 no `TMPDIR`). Todas foram removidas com a raiz pelo registro. É fora da fatia, como o autor comunicou.
- **O3 — disputa estatística.** No Windows, o RED é só do autor (72/59 e o m1 53/57). Nos outros sistemas a prova passa antes e depois, sem servir de RED, como o C46 (u) declara.

## Gates remotos — pendentes e bloqueados

A ordem aprovada é esta: PASS independente → formal 14 `ready` → publicação → **uma** execução manual com a medição (esquema 2) → **cinco checks regulares verdes** nas matrizes PR e manual do HEAD aprovado → merge já autorizado. **Este FAIL bloqueia o primeiro passo.** A formal 14 não deve rodar sobre ele.

O HEAD publicado continua `066bd98`. O PR 40814315171 e a manual 40814471097, vermelhos, e a medição 4.500/4.500 de `066bd98` ficam **como história**: medida individual, que não cumpre o novo HEAD nem substitui a CI. Não disparei nada e não declaro verde nenhuma CI futura.

## Processo, limites e limpeza da R24

**Executado.**
- **git**, só de leitura: `rev-parse`, `status`, `log`, `diff`, `show`, `ls-files --eol`, `ls-tree`, `hash-object`, `check-ignore`, `config --show-origin` e `get-tar-commit-id`. Também:
  - `git -c core.autocrlf=false archive` do HEAD para `r24/head.tar`;
  - um `git clone --no-hardlinks --no-checkout --config core.autocrlf=true` do repositório local, sem rede, com a configuração só no clone.
- **Leitura**: `node` (contexto, config, `state.json` só com a contagem, logs), `sha256sum`, `python -I` (sha do zip e CR) e `stat`.
- **Gates**: A, B, C e D, uma vez cada, sem repetição. O WSL foi chamado com `wsl.exe -d Ubuntu -u oldboydev --exec /bin/bash --noprofile --norc` e `MSYS_NO_PATHCONV=1`. Fora do gate, rodei uma checagem de leitura do WSL (`id`, `nproc`, `nsolid --version`, o `package.json` do npm).
- **Modo**: `run_in_background` com os orçamentos do plano. Esperei o término real pelas notificações da ferramenta: **4 tarefas, todas concluídas com exit 0; 0 em segundo plano**. Durante o D, só leitura (logs do autor e arquivos de prova).
- **A ferramenta** guardou cópias das saídas em `AppData\Local\Temp\claude\…\tasks\*.output`. Não são auxiliares meus, e não as apaguei.
- **PowerShell**: **não iniciei nenhum** (nem `powershell.exe`, nem `pwsh`, nem `-?`/`help`/`version`). O pwsh oficial só foi iniciado pela prova versionada `governance-C48` em A, B e D, com os opt-outs e o TEMP próprio herdados antes.
- **Processos depois do D** (`r24/processes-before.txt`, `processes-after.txt`, por `ps -W` do Git Bash, sem linha de comando):
  - 16 processos `node`/`pwsh` com início depois de 15:20 estavam vivos na 1ª leitura. Os 7 de 15:38:28–15:38:45 já tinham saído na 2ª;
  - ficaram 9: três `pwsh` (15:24:43, 15:35:59, 15:36:23) e seis `node` v24.22.1, no mesmo padrão `pwsh` → 2 `node` da linha de base de 08:43–08:44, de outra sessão do host. Dois `node` (15:26:56–57) nasceram durante o B, cujo Node era o 24.13.0;
  - **nenhum é atribuível a mim pelo que se vê**: o pwsh das provas roda por `spawnSync` e é esperado, nenhuma prova de integração usa pwsh, e nenhum processo novo usa o Node 24.13.0 do B ou do C;
  - **limite**: sem linha de comando (não há `wmic`, e não iniciei PowerShell só para isso), a atribuição não é plena.

**Incidentes meus**: nenhum. Não iniciei agente real nem rede.

**Não executado.**
- RED, mutantes, sondas, testes novos, fault injection e as reproduções e medições do autor.
- Uma prova para o F1: o achado é por leitura de uma função pura, e o despacho proíbe sonda.
- Agentes reais, `--help`/`--version` de agente, perfis, credenciais, banco, modelo, rede, relógio do host, antivírus, Git global, TEMP global e runtimes fora das provas. O Hermes real rodou só pelas provas nativas versionadas do D, com o `HERMES_HOME` temporário delas.
- Actions, CI, `review:run`, commit, push, PR, merge, alteração de limites e subagentes.
- **Incidentes anteriores**, preservados sem leitura, remoção nem restauração:
  - a R5 (`ffc5937`: até 5 inícios do Codex no WSL e 12 mtimes, sem linha de base de conteúdo);
  - a limpeza de 1.257 pastas no Windows e 107 no WSL, sem proveniência e sem os nomes do Windows;
  - os auxiliares `/tmp/d4.skips` e `/tmp/d-old.skips` no TEMP global, sem inventário nem criação exclusiva;
  - o D de `dc0db9b`, **interrompido pelo root** (não é falha natural);
  - os dois incidentes da R21 (`pwsh -?` sem opt-outs, com efeitos não auditados; o `post-D-checks.txt` ~9 s na raiz depois do D);
  - a interrupção do host na sonda `p-c12-2413`;
  - o B vermelho de `407edc5` (`EPERM`) e o T8-C13 positivo vermelho do autor anterior;
  - o RED e o m6 interrompidos, as seis sobras por prefixo/`birthtime` e as 8 chamadas de PowerShell do autor desta fatia, com os limites que o autor e o Root registraram.

  Não afirmo impacto global zero.

**Auditoria externa 24 (do Root).** Às 15:39:59, depois do fim real do meu D (15:38:27), existiam `profile-comparison-final.json` e `profile-target-check.json` (15:39). Li **só esses agregados**:
- 12.113 entradas antes e depois;
- `added`, `removed`, `modified` e `errors` vazios;
- `sameProfileTarget: true`;
- linha de base de 12:08:40 UTC (o final da R23) e o depois em 18:39:10 UTC.

O resultado e o método são **do Root**; não li os snapshots nem os scripts. O escopo é o declarado nos próprios arquivos: só metadados do perfil WSL e igualdade do alvo. Não cobre conteúdo, temporários, Windows, PowerShell, rede, proveniência ou causalidade, e não desfaz a R5. As auditorias 19–23 (12.113/12.113, zero diferenças), a recusa pré-coleta do método 20 e a inclusão da formal 13 na janela da 23 ficam como estão.

**Limites.**
- **macOS**: o I4-C25m não rodou em ambiente nenhum.
- **Doctor**: os 7 skips POSIX/FIFO não rodaram (o doctor só rodou no D, Windows).
- **Runtime do Hermes**: só no D (Windows). O caso pelo Python do sistema não é runtime do Hermes.
- **Causas**: continuam desconhecidas as do `EPERM` da R23 e do B de `407edc5` (o diagnóstico mostrou a classe, não a causa daquelas execuções), do `green-pre2`, do I23-C6 da CI 066, do cancelamento da manual 40814471097 e as históricas.
- **Abrangência**: os verdes A/B/C/D são deste computador. O POSIX real da mudança só tem o C (WSL) e a CI futura. O custo com fsync não foi medido comparativamente; o T8-C15 com fsync é prova de teste, não de custo.

**Limpeza** (`A.env.txt`, `B.env.txt`, `B-clone-cleanup.txt`, `C.run.txt`, `D.env.txt`):
- as raízes `sm-v24-A`/`B`/`D` foram removidas só pelo registro (caminho real absoluto, filha direta do temporário, nome, pasta não link, mesmo `dev`/`ino`);
- o scratch do C, por caminho exato, uid 1000, dev e inode;
- o clone do B, por caminho real, pasta não link, mesmo `dev`/`ino` registrado na criação, toplevel, HEAD e status vazio;
- `runner-temp-A`/`B`/`D`, vazias, por `rmdir`;
- nenhuma seleção por prefixo ou mtime, e nenhum auxiliar meu no `/tmp` (Git Bash ou WSL) nem no TEMP global.

Logs, tar, scripts e matrizes ficam em `r24/`.

**Integridade do histórico abaixo.** O texto depois da linha `---` que fecha esta rodada (e da linha em branco seguinte) é, byte a byte, o `.verified.md` do HEAD: 378.751 bytes, sha256 `8cbbf2f1…`, 0 CR. É igual ao `verified-before.bin` guardado pelo Root (`r24/verified-integrity.txt`). Nele estão o **FAIL 23**, o **PASS 22**, o **FAIL 21**, o **PASS 20**, o **FAIL 19** e os relatórios anteriores, sem rebatizar nenhum resultado.
- O FAIL 23 estava certo para `6204613`, e a correção nova não o desfaz retroativamente.
- Este FAIL 24 é do conteúdo de `34466ab`. Todos os gates passaram, e o F1 é a cobertura incompleta de uma exigência vinculante.

---

# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25 (rodada 23)

**Verdict (R23)**: **FAIL — 49/50 checks provados; o gate D completo terminou naturalmente com exit 1.** HEAD `6204613`, último código `709ff5d`, 9 ACs. É a primeira verificação independente do código de `19a5a5c` (C46 (s)) e de `709ff5d` (C46 (t)).
- **Gates frescos (verified at `6204613`)**, uma vez cada, sem filtro e sem repetição:
  - **A** Windows Node 24.22.1: 19/19/0/0;
  - **B** clone novo com `autocrlf=true`, Node 24.13.0 oficial: 19/19/0/0;
  - **C** WSL isolado, Node 24.13: 19/19/0/0;
  - **D** `npm test` completo: **1.062 testes, 1.041 pass, 1 fail, 20 skip**, exit 1, término natural.
- **A falha (F1)**: o T8-C15 **saudável**, sem injeção (`concurrency.cli.test.mjs:224`, asserção `:220`). O produtor `b` recebeu `open lock EPERM (tomada do lock)`, que não foi injetado. Ele saiu `io_failure` 40/39/39/1, e a captura ficou com 79 de 80. O C46 exige que o T8-C15 “passa no caso saudável” (checklist `:432-435`). Por isso o C46 não está provado neste HEAD.
- **A mudança nova está correta pela leitura e pelas provas.** O T8-C19, o T8-C12, o T8-C13 e os três controles do ciclo de vida, (s) e (t), passaram em A/B/C e no D. A falha está num arquivo sem diff desde a R22 (`concurrency.cli` com o blob `3d507e0`). Ela é a mesma classe de erro do B vermelho do autor em `407edc5`. Não há relação demonstrável com `19a5a5c`/`709ff5d`, e eu também não demonstro que não haja (F1).
- **O que isto não é**:
  - não é PASS;
  - não demonstra a causa do `EPERM`, do `sync key` de 601 ms do I23-C6 na CI 066 ou do cancelamento da manual 40814471097;
  - não declara verde nenhuma CI futura.

  Não corrigi nada nem repeti o D.
- **Gates remotos**: pendentes e bloqueados por este FAIL. Não executei Action, CI, `review:run`, commit, push nem merge.

**Profile**: light (`AGENTS.md:138`). Por isso não há fault injection, `Coverage`, `Test policy` nem fonte de UI. Não criei mutantes, sondas, testes nem correções. As sondas, os RED, os GREEN preliminares e os mutantes de (s) e (t) são **provas do autor**, só atribuídas (`builder-ci066-follow/`, `builder-ci066-follow-cli/`).

**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..6204613cecaf32e19c2ae8a3cfe2b62243d75a5d`, a feature inteira: 167 commits, árvore `c59da561…`. Desde a R22 (`2383c52`, relatório em `066bd98`), entraram 15 commits:
- `3d50ced` (CI 066);
- a fatia (s): `46f949d`, `b90abdd`, `1b7b561`, **`19a5a5c` (código)**, `aa934df` e `97baf13`;
- a fatia (t): `14b853a`, `12f6f1f`, **`709ff5d` (último código)**, `ec4a412` e `d4f304a`;
- `9c02c05` e `6204613` (override 25: `maxRounds` 13 → 14 e o `approval`).

**Round**: **23** (light). Autorizações: “Pode fazer quantas precisar” e “Pode fazer a medição comparativa. Mantém os testes e prazos e segue até a CI ficar toda verde para fazer o merge do PR #28”. Escopo [6467154706](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706) e registro 23 [6495770228](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6495770228).
- `context-round23.json` (sha256 `9466ebef…`) tem 37 comentários e 9 ACs. O corpo e os comentários 1–35 são iguais aos de `context-round22.json`. Os novos são o 36 (CI 066) e o 37 (registro 23). O `round23-registration.md` é igual ao comentário 37, sem placeholders (`r23/context-config.txt`).
- `roundOverrides["25"]` = `{profile: "light", maxRounds: 14}`. Os perfis globais continuam com 2.
- O `state.json` da revisão tem 13 tentativas (sha256 `6cf84579…`). A formal 14 está autorizada e **não deve ser usada sobre este FAIL**.

**Verifier**: subagente novo e independente (Claude Opus 5.5). Não sou o autor nem o Verifier 22, e não herdei sessão.
- Produto, testes, apoios, scripts, workflow, planos, configuração e estado ficaram só para leitura.
- Escrevi este arquivo e as evidências em `.checks/code-review/issue-25/verifier-round23/r23/`, pasta ignorada (`.gitignore:4`). Fora dela, só as raízes próprias dos gates e o scratch do C.
- Não li `profile-before.json`, os scripts de perfil do root nem nenhum snapshot.

Data: 29/10/2026 (-03).
- **Plano**: a identidade (`r23/blob-identity.txt`, 08:52) e o alvo com os orçamentos e as concorrências (`r23/plan.txt`) foram gravados antes de qualquer gate.
- **Horários**: A 08:56:12–08:56:31; B 08:56:57–08:57:17; C 08:58:06–08:58:24; D 08:58:37–09:06:54 (8 min 17 s).
- **Estado**: o HEAD foi `6204613` do início ao fim. O `git status` ficou vazio antes e depois de A e do D. Em B, o status do clone ficou vazio. Em C, a árvore extraída é igual ao `HEAD^{tree}`.

## Fontes lidas (R23)

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md`, `tlc-implement/references/verify.md` | inteiros |
| `context-round23.json`, `round23-registration.md`, `round23-values.json`, `verifier-round23-dispatch.txt` | inteiros (o corpo e os 37 comentários) |
| `.checks/issue-25-agent-launch.md` (2.477 linhas) | `Sources` (`:9-49`, com as duas entradas novas `:11`, `:13`), `Out of scope`, as linhas do Landing “Ciclo de vida do `follow` no T8-C19” (`:124`) e “… em `follow.cli.test.mjs`” (`:125`) inteiras, o enunciado do C46 (`:432-435`), o (r) e os refinamentos (s) e (t) (`:652-732`), `Swept` (com os dois acréscimos) e os dois blocos novos do `Handoff` (`:2327-2477`). Os demais blocos são histórico, carry da R22 |
| `.tasks/issue-25-agent-launch.md` | as duas seções novas (`git diff 066bd98..HEAD`) |
| build | as duas seções novas (`git diff 066bd98..HEAD`): diagnóstico, correção, RED/GREEN, mutantes, gates e achados fora da fatia |
| `.checks/issue-25-agent-launch.ci40814315171-handoff.md` | inteiro |
| `.checks/issue-25-agent-launch.verified.md` | o topo R22 inteiro (`:1-355`). O resto é histórico, atribuído sem nova execução |
| evidências do autor | `builder-ci066-follow-cli/{plan.txt, green-pre2.log, mut-run.out.txt}` e `builder-ci066-follow/{mut-*.log, spawn-error-probe.out.txt}`. São **relato do autor**, só atribuição |
| CI 066 | `ci066-windows-pr40814315171.log` (a falha do I23-C6, `:1322-1345`), o fim da `ci066-windows-manual40814471097.log` e `ci066-manual-result-name-diff.json` |
| código | `demo.e2e.test.mjs` e `follow.cli.test.mjs` inteiros, com `git diff` e `git diff -w` desde `066bd98`; `traces-probe.mjs:1-40`, `:115-135`; `traces.mjs:11-31`, `:116`; `producer-runs.mjs:14`; `scripts/test-integrations.mjs`; `agents.e2e:95-120`, `:315`, `:427-444`; `delivery.unit:50-116`; `concurrency.cli:205-230`; `store.mjs:194-205`; `delivery.mjs:49-53`, `:98-104`; `privacy/fs.mjs:34-36` |

## Prova Git (verified at `6204613`; `r23/blob-identity.txt`, `r23/context-config.txt`)

- **Alterados de `2383c52` (R22) ao HEAD, fora de `.checks`/`.tasks`**:
  - `tests/integrations/traces/demo.e2e.test.mjs`: `63a4d8e` → `3838b03` (`19a5a5c`);
  - `tests/integrations/traces/follow.cli.test.mjs`: `c4a84c0` → `73c1da9` (`709ff5d`);
  - `code-review.config.json`: `40f9fd8` → `897a480`, só o override 25 (`maxRounds` 13 → 14 e o `approval`).

  De `066bd98` ao HEAD é o mesmo conjunto. Depois de `709ff5d`, mudou só a configuração.
- **Iguais a `2383c52`**:
  - árvores: `src` `51f0c98`, `docs` `d9f546f`, `scripts` `ab2df5a`, `scripts/code-review` `6b98d7c`, `.github` `6a0b533`, `tests/integrations/fixtures` `6591970`, `tests/integrations/helpers` `18782eb` e `tests/doctor` `bcedb83`;
  - arquivos: `package.json` `8fd02fa`, `package-lock.json` `9ec32e0`, `.gitattributes`, `.gitignore`, `README.md`, `AGENTS.md`, `CLAUDE.md`, o workflow `f24e82d`, `test-integrations.mjs` `22824c4`, `governance-ci.test.mjs` `5313dba` e `ci-lock-latency{,.test}.mjs` (`8c12894`/`75eeadd`);
  - apoios: `traces.mjs` `b71938f`, `producer-runs.mjs` `13cd7c6`, `traces-probe.mjs` `292c319`, `trace-kinds.mjs` `96a67e9` e `cli.mjs` `59923fc`;
  - `agents.e2e` `eb23d7b`, `delivery.unit` `ee11376`, `docs.test` `852616a` e `concurrency.cli` `3d507e0`.

  Dos 247 rastreados de `src`/`tests`/`scripts`, 245 têm o blob de `2383c52`, e também o de `066bd98`.
- **Permanecem**:
  - **`cad647a`**: `docs.test` `852616a` e `traces-probe` `292c319`;
  - o **produto `322bcad`**: `git diff 322bcad HEAD -- src` vazio, com `delivery.mjs` `e1cf25a`;
  - o **EOF `68f84c4`**: `codex-run.cli` `ff47369`;
  - o **terceiro produtor `2473632`**: `evidence.unit` `6ccbf48`;
  - o **workflow Windows `169e845`/`0caf9be`**: o workflow `f24e82d` e `governance-ci.test` `5313dba`.
- **Core vendorizado**: os 5 arquivos de `scripts/code-review/` têm o blob da base no HEAD (`25e5284`, `c6a4abc`, `1bda8e4`, `216125c`, `b02001e`).
- **Alcance** (por busca):
  - nenhum arquivo importa `demo.e2e` ou `follow.cli`. Só `docs.test.mjs:121` confere, por `existsSync`, que o `demo.e2e` existe;
  - nenhum apoio mudou. Os outros `privacy follow` das provas são síncronos (`query.cli:300`, `concurrency.cli:814`, `store.cli:627`);
  - o alvo de A/B/C é o fecho mínimo, `demo.e2e` e `follow.cli`, mais o `agents.e2e` (I23-C6 remoto não PASS) e o `delivery.unit` (último arquivo impresso na manual cancelada). Nenhum outro arquivo é afetado. O restante vem do D e do carry por blob.

## Análise da mudança (verified at `6204613`, por leitura; as provas estão nos gates)

**1. O T8-C19 continua o mesmo** (`r23/demo-e2e-diff-w.txt`). O `git diff -w` e o corpo normalizado de `066bd98` contra o de `walkthrough` mostram mudança em uma só linha: `boundEnv(root, id)` virou `boundEnv(root, id, hookEnv)` (`demo.e2e:67`).
- Com o padrão `hookEnv = {}`, o `...extra` de `boundEnv` (`traces.mjs:25`) dá o mesmo ambiente.
- Ficaram iguais: os comandos, as entradas, os nove passos (`:120`), os cinco registros com as origens (`:88-97`), as seis linhas com o `end` 6 (`:105`), `lines.slice(0, 5)` igual a `exported.records` (`:106`), o replay (`:110`), os literais, os status e a ordem.
- O resto é a extração para a rotina, o `Object.assign(seen, …)` (`:61`), o `try`/`finally` (`:63`, `:122-124`) e o import de `TRACES_PROBE`, um export que já existia (`traces.mjs:19`). Nenhum critério foi reduzido.

**2. O `try`/`finally` e o `endFollow`** (`demo.e2e:37-40`, `follow.cli:64-67`, as mesmas duas linhas):
- **Alcance do `try`**: no demo, entre o spawn (`:57`) e o `try` (`:63`) só há `on("data")`, `new Promise(on("close"))` e `Object.assign`. A retificação aditiva `1b7b561`, anterior ao código, leva o `try` até o fim da rotina. Toda asserção e todo `await` depois do spawn estão dentro dele.
- **Close observado cedo**: a promessa do `close` é criada no mesmo tick do spawn (demo `:60`; `follow()` `:46`). Nenhum `close` se perde.
- **Sinal só a filho vivo**: `kill()` só vai se `exitCode` e `signalCode` são nulos. Um filho que já saiu (`exit` antes do `close`, ou fechado) não recebe sinal. Em todos os casos, espera-se o `close` real.
- **Sem `catch`**: o erro original atravessa o `finally`.
- **Spawn com erro**: emite `error` e depois `close`, e `kill()` depois do `exit` devolve `false` sem sinal. É sonda do autor (`spawn-error-probe.out.txt`), atribuição.
- **Caminho positivo**: o follow já fechou (`await followDone`, `:103`; `await followed.done`, `follow.cli:90`; `deletedExit`, `:141`) antes do `finally`. Então não há sinal, só a espera já resolvida.

**3. Os controles e as asserções decisivas**:
- **(s)** `demo.e2e:138-149`, pela mesma rotina, com `SEGMENT_EIO=1` e a pré-carga só no hook:
  - `:144` `failure instanceof assert.AssertionError`;
  - `:145` `[actual, expected, operator]` = `[0, 1, "strictEqual"]`;
  - `:146-147` corrida do `close` com uma volta de `setImmediate`, que precisa dar `"close"`;
  - `:148` `[exitCode, signalCode]` = `[null, "SIGTERM"]`.
- **(t)** `follow.cli:269-314`:
  - `closedByRoutine` (`:278-282`) exige `[exit?.status, exit?.signal, exitCode, signalCode]` = `[null, "SIGTERM", null, "SIGTERM"]`. O `exit` é gravado no `close` (`:46`), e entre o `kill()` e a conferência só há microtarefas, então um sinal sem a espera deixa `exit` nulo de forma determinística;
  - T8-C12: `:293` `instanceof`, `:294` `[0, 1, "strictEqual"]` e `:295`;
  - T8-C13: `:305` `instanceof`, `:312` `[0, 1, "strictEqual", original]`, com a mensagem gerada pela mesma asserção (`:306-311`), e `:313`.
- **O que cada asserção pega**:

  | Erro plausível | Asserção que reprova |
  | --- | --- |
  | sem `finally` | `:147` no demo, `closedByRoutine` no follow |
  | `kill()` sem esperar o `close` | `:147` no demo; `exit` nulo no follow |
  | `catch` que engole | `failure` nulo e `instanceof` falso: `:144`, `:293`, `:305` |

  Os mutantes do autor confirmam esse quadro: RED, M2 e M3 de (s) (`builder-ci066-follow/mut-*.log`); RED de cada rotina, M2 e M3 de cada rotina de (t) (`builder-ci066-follow-cli/mut-run.out.txt`). É atribuição, não execução minha.
- **M4 (`kill()` sempre)**: **equivalente**, não morto. Depois do `close`, `kill()` devolve `false` sem enviar sinal (`spawn-error-probe.out.txt`: `sentAfterExit: false`), e o M4 do autor ficou 6/6. Não inventei um mutante morto.
- Os positivos estão no alvo inteiro: T8-C19, T8-C12 e T8-C13 rodaram e passaram em A/B/C e no D.

**4. A fatia T8-C12/T8-C13** (`r23/follow-cli-diff-w.txt`):
- **`followNewRecords`** (`:72-103`): o corpo normalizado é idêntico ao de `066bd98` fora do `try`/`finally`. Ficam iguais `QUIET_MS` (`:30`, de `FOLLOW_POLL_MS`), os dois produtores, os literais, o `[0, null, ""]` (`:91`) e as três linhas com o `end` 3 (`:94-99`).
- **`followDeletion`** (`:128-150`): o corpo é idêntico ao trecho antigo do T8-C13, salvo `${gate}|2` → `${gate}|${gatedPoll}`, com o padrão 2. Ficam iguais:
  - o payload secreto com `MARKER`;
  - o `stop` e o `delete --apply`;
  - o `go`;
  - o status 3 e o `capture_not_found` (`:142-143`);
  - o stderr vazio, a ausência de eco (`:144-145`) e a captura não recriada (`:146`).

  O T8-C13 chama `await followDeletion(root)` no mesmo ponto (`:172`).
- **Os outros follows**: `finished`, `missing` e `blocked`, com `FOLLOW_LOCK_PATIENCE_MS` e o `.lock` alheio intacto (`:181-184`), não mudaram. O `close` deles é esperado logo depois do spawn.
- **Controles anteriores**: no (i), saíram só o `kill()`/`await` e o comentário; as asserções `:223`, `:230-234` ficam. O (j) (`:237-266`) não mudou.
- **Encerramento**: todos os filhos que as rotinas iniciam ou recebem têm o `close` real esperado antes de a falha sair, sem depender do `after` nem da limpeza.

**5. Riscos remotos não PASS, reexaminados** (nenhum é declarado corrigido):
- **I23-C6 do PR 40814315171**: o produtor 7 saiu `delivery_timeout` com `sync key` 601 ms (`ci066-windows-pr40814315171.log:1322-1345`; asserção `agents.e2e:115`).
  - O arquivo e o produto são os mesmos blobs. A mudança não toca esse caminho, e o I23-C6 roda em outro processo.
  - Ele passou aqui (A/B/C e D), o que não explica nem elimina a lentidão do runner.
- **Manual 40814471097 cancelada**: o defeito de ciclo de vida demonstrado pelo autor está fechado nas duas harnesses e provado pelos controles.
  - O cancelamento continua **sem causa atribuída**. O log não distingue o processo do `delivery.unit` vivo, um T8-C19 sem terminar ou um `demo.e2e` sem começar.
  - O `delivery.unit` (5 testes unitários, sem filhos) passou em A/B/C e no D.
- **`rmSync` do Node 24.13.0 no Windows**: o B desta rodada deixou 39 entradas na raiz própria (o A, 1). É coerente com o achado do autor, fora da fatia, e as entradas foram removidas com a raiz.
- **Carry por blob**: `cad647a`, o produto `322bcad`, o EOF `68f84c4`, o terceiro produtor `2473632` e o workflow `169e845`/`0caf9be`, todos com os mesmos blobs (acima).

## Histórico do autor — preservado e analisado (não são resultados meus)

- **`green-pre` (5/6)**: o controle novo do T8-C13 tinha um literal errado, sem o diff que o Node anexa à mensagem. O autor o corrigiu antes do commit, gerando a mensagem pela mesma asserção (`:306-311`).
- **`green-pre2` (5/6)**: o **T8-C13 positivo** falhou em `records.length` `2 !== 3` (`green-pre2.log:22-32`).
  - O 2º hook do `finishedCapture` (`:118`), trecho anterior a qualquer follow e sem diff, saiu `delivery_timeout` 1/0/0/1, com `pendentes na saída: lstat pasta (fora do lock) há 652 ms`, `lock ocupado (EEXIST, repetido) 0x` e 2 operações concluídas.
  - É uma falha natural de E/S fora do lock, da mesma família do `sync key` 601 ms da CI 066. A causa é desconhecida; não houve correção nem repetição preliminar inalterada.
  - O verde posterior do autor e o meu não a apagam.
- **Interrupção do host** (Handoff `:2437-2447`): a sonda `p-c12-2413` foi cortada às 02:29, sem fim nem resumo. Ela **não tem PASS/FAIL natural**, e os dois `✖` sem detalhe não são atribuídos. Foi refeita uma vez (`p-c12-2413b`), depois da consulta de processos e da limpeza registradas. Nenhum gate final ocorreu durante a interrupção.
- **Gates finais do autor em `ec4a412`**: A/B/C 8/8 e D 1.062/1.042/0/20, atribuídos. Neste HEAD, o meu D teve uma falha natural que o do autor não teve (F1).

## F1 — o T8-C15 saudável falhou no D (bloqueante)

- **Cenário**: `npm test` completo, Windows, Node 24.22.1, runner padrão (8 arquivos), checkout limpo em `6204613`. No T8-C15, os dois produtores `ingest hermes` de 40 eventos rodam em paralelo na mesma captura, **sem injeção**.
- **Esperado**: cada produtor com status 0 e `{bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0}` (`concurrency.cli.test.mjs:219-220`), e 80 eventos únicos. É o “passa no caso saudável” do C46 (checklist `:432-435`, AC7).
- **Atual** (`r23/D.log:1078`, `:1169-1235`; `r23/D-failure.txt`):
  - `a`: 40/40/40/0;
  - `b`: `io_failure` 40/39/39/1, com `falhas open lock EPERM (tomada do lock)`, `lock ocupado (EEXIST, repetido) 21x`, `última concluída: unlink lock (sob o lock, 16ª tomada)` e `pendentes na saída: nenhuma`;
  - captura: export 79 (`a` 40/40, `b` 39/40, sem outros nem repetidos), `active accepted 79 persisted 79`, 1 segmento, 0 temporário, lock ausente;
  - os três controles do C46 do T8-C15 passaram no mesmo D (`:1079-1081`).

  A evidência do C46 (a)–(c) cumpriu o papel dela numa falha real: operação, código e fase, mais o export que mostra a entrada perdida antes do commit, sem caminho nem chave.
- **Política do produto**, por leitura e sem diff:
  - `holdLockFile` só converte o `EEXIST` da criação exclusiva do `.lock` (`open(file, "wx")`, `privacy/fs.mjs:35`) em `lock_present` e relança qualquer outro erro (`store.mjs:196-203`);
  - `codeOf` dá `io_failure` a todo erro que não é `StoreError` (`delivery.mjs:51`), e só `lock_present` é repetido (`:100-102`).

  Então um `EPERM` na tomada vira perda sem nova tentativa, como o AC7 manda (“sem retry novo”).
- **Ocorrências** (busca por `open lock EPERM` nos `.log`/`.txt` de `.checks/code-review/issue-25/`): só o B do autor em `407edc5` (Node 24.13.0, controle (b), produtor `a` sem injeção) e este D (Node 24.22.1, caso saudável, produtor `b`). As falhas antigas do T8-C15 não tinham errno.
- **Causa**: **não demonstrada**. Um `EPERM` na criação exclusiva no Windows é compatível com o nome do `.lock` ainda pendente de remoção, logo depois do `unlink` do outro produtor (houve 21 disputas). Mas o log não distingue essa classe de outra, como outro processo do sistema ou o disco. Não atribuo a antivírus, indexador ou hardware.
- **Relação com a mudança**: não demonstrável. O `concurrency.cli` tem o mesmo blob desde antes da R22; a raiz do T8-C15 é própria; e nenhum caminho dos arquivos mudados chega a ela. O runner já rodava esses arquivos em paralelo antes. Também não demonstro que não haja relação, por exemplo pela carga dos controles novos.
- **Impacto**:
  - o gate D desta rodada é vermelho, então a rodada é FAIL;
  - a mesma classe já apareceu duas vezes neste computador e pode aparecer na matriz Windows da CI, em que o T8-C15 roda, deixando o PR vermelho;
  - pela política atual, cada ocorrência perde a entrada. A prova está certa em ficar vermelha.
- **Localização**:
  - prova: `tests/integrations/traces/concurrency.cli.test.mjs:220` (asserção) e `:224-226` (teste);
  - política: `src/integrations/privacy/store.mjs:196-203`, `src/integrations/traces/delivery.mjs:51`, `:100-102` e `src/integrations/privacy/fs.mjs:35`.
- **Decisão**: com o coordenador e o proprietário. Pelo AC7, a correção exige defeito demonstrado e não admite retry novo, aceitação de perdas ou redução de concorrência. Tratar `EPERM` como disputa seria mudança de política. Não proponho código.

## Execuções — verified at `6204613`

A ordem foi A, B, C e D, em sequência, uma vez cada, sem filtro e sem repetição. O alvo, as concorrências e os orçamentos foram registrados antes (`r23/plan.txt`).
- **Alvo de A/B/C**: os 4 arquivos inteiros, numa invocação: `node --test --test-concurrency=<n>` + `observe/agents.e2e`, `traces/delivery.unit`, `traces/demo.e2e` e `traces/follow.cli`.
- **Concorrência**: `<n>` é o contrato do runner (`test-integrations.mjs:14-16`, `max(1, min(CPU−1, 8))`), conferido no próprio ambiente antes de rodar. A e B (32 CPUs) usaram 8; C (8 CPUs), 7. Com 4 arquivos, os 4 rodaram em paralelo nos três. Não reduzi a carga nem a concorrência interna.
- **Forma comum**:
  - `RUNNER_TEMP` numa pasta própria, vazia antes e com 0 entradas depois;
  - temporário dos testes numa raiz própria `sm-v23-<rótulo>-…`, criada por `mkdtemp` e registrada (caminho real, `dev`, `ino`), só no `TEMP`/`TMP` do processo do gate (A, B, D) ou no `TMPDIR` do scratch (C);
  - `npm_execpath` ausente e `npm_config_update_notifier=false`;
  - em A, B e D, `POWERSHELL_TELEMETRY_OPTOUT=1` e `POWERSHELL_UPDATECHECK=Off` só no processo.
- **Scripts** (escritos por mim, em `r23/`): `isolated-root.mjs`, `run-target.sh`, `make-clone-B.sh`, `remove-clone-B.sh`, `wsl-run.sh`, `run-npm-test.sh`, `matrix.mjs` e `d-summary.mjs`.

| # | Ambiente | Resultado |
| --- | --- | --- |
| A | Windows 11, checkout principal, Node **v24.22.1** (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1; os 4 blobs iguais aos do HEAD; concorrência 8 | **19 testes, 19 pass, 0 fail, 0 skip**, exit 0. Status vazio antes e depois; `RUNNER_TEMP` com 0 entradas. Raiz `sm-v23-A-aweQwN` (1 entrada) conferida e removida pelo registro |
| B | **Clone git novo** em `r23/B-clone` (`--no-hardlinks --no-checkout --config core.autocrlf=true`, sem rede; o `gitconfig` do sistema já tinha `true`; nada global mudou). HEAD `6204613`, árvore `c59da561…` e toplevel conferidos. Node **v24.13.0 oficial**: zip `ca274269…` igual à linha do `SHASUMS256.txt`, `node.exe` `d14ba95c…` igual ao do zip, npm **11.6.2** adjacente, na frente do PATH. `cli.mjs` `i/lf w/lf attr/text eol=lf`, **0 CR antes e depois**; `demo.e2e` 149 CR e `follow.cli` 314 CR no clone. Status vazio antes e depois do `node_modules` copiado; concorrência 8 | **19: 19 pass, 0 fail, 0 skip**, exit 0. Depois: HEAD, árvore e toplevel iguais, bin LF/0 CR, status vazio. Raiz `sm-v23-B-3QfAc3` (39 entradas, o `rmSync` do 24.13.0) removida pelo registro. Clone removido pelo caminho exato, depois de conferir pasta não link, toplevel, HEAD e status vazio (`B-clone-cleanup.txt`) |
| C | WSL `Ubuntu`, `oldboydev`, uid 1000. `git -c core.autocrlf=false archive` do HEAD: 6.645.760 bytes, sha256 `3b243441…`, `get-tar-commit-id` = `6204613…`. Árvore extraída `c59da561…` = `HEAD^{tree}`; 0 CR; `cli.mjs` 755; `follow.cli` `f33951d4…` (o mesmo da cópia do autor). Node **v24.13.0** copiado de `/usr/bin/nsolid` (`150946e4…`, igual) num prefixo `node npm npx`, **sem `sh`**; npm 11.6.2. `env -i` só com `HOME`, `LANG`, `PATH`, `RUNNER_TEMP`, `TMPDIR` e `npm_config_update_notifier`. `PATH` = prefixo + `tools` (links para `/usr/bin/{sh,git,python3,id,grep,mkfifo}`), **sem `/usr/bin`**, sem agentes nem `pwsh`; concorrência 7 | **19: 19 pass, 0 fail, 0 skip**, exit 0. `RUNNER_TEMP` 0 entradas, `HOME` 0. Scratch `/tmp/sm-v23-C.JaKqqd` removido pelo caminho exato, pasta não link, uid 1000 e inode 2237 |
| D | `npm test`, sem argumentos, no checkout principal: Windows, Node v24.22.1, npm 11.19.1, `SKILL_ME_HERMES_PYTHON` ausente, `availableParallelism` 32 → runner 8. `C:\Program Files\PowerShell\7` na frente do PATH: é o pwsh oficial já instalado, só o caminho, sem iniciá-lo para inspeção. Orçamento de **2 h** (7.200.000 ms), definido no plano e passado à ferramenta. Checkout commitado e limpo | **1.062 testes: 1.041 pass, 1 fail, 20 skip**, **exit 1**, término natural (`D.env.txt`). Por suíte: governança 27/27/0/0, motor 16/16/0/0, doctor 417/410/0/7, integrações **602/588/1/13**. HEAD igual e status vazio antes e depois; `RUNNER_TEMP` com 0 entradas. Raiz `sm-v23-D-FS2d1J` (128 entradas) removida pelo registro |

**Nomes de A/B/C** (`r23/matrix-ABC.txt`): os 19 nomes de topo são iguais nos três ambientes, sem duplicado e sem skip. Os seis de `agents.e2e`, os cinco de `delivery.unit`, os dois de `demo.e2e` (com as nove linhas de diagnóstico do T8-C19 em A) e os seis de `follow.cli` passaram nos três.

**D** (`r23/D-summary.txt`, comparado nome a nome):
- **Contra o D do autor (`ec4a412`)**: as mesmas linhas, salvo a marca do T8-C15, `✖` aqui e `✔` lá. O `✖ 2` do resumo é o mesmo teste listado de novo em “failing tests”.
- **Contra o D da R22 (`2383c52`)**: entram os três controles do ciclo de vida, (s) e os dois de (t), e o T8-C15 troca de marca.
- **Nomes por check**: cada prefixo de `I25-C1 ` a `I25-C47 ` tem ao menos um `✔`, salvo `I25-C6` e `I25-C15`, que no Windows só têm skip.
  - O `I25-C46` soma 33 `✔`: 3 do ciclo de vida, 3 dos controles do T8-C15, 2 do T8-C20, 7 de `evidência comum`, 8 de `prazo da entrega`, os diagnósticos do T8-C12/C13, entre outros.
  - Também passaram: 6 `I25-C47`, 9 `T8-C16`, `T8-C19`, `T8-C12`, `T8-C13`, 2 `T8-C20`, 7 `I23-C4`, `I23-C6`, `I23-C10`, `I4-C16` (3), `I4-C17`, `I4-C35`, `I4-C36`, `I4-C47` e `T8-C2`/`C3`/`C8`/`C14`/`C18`.
  - Os 9 `governance-…` (os dois `governance-C48` com o pwsh oficial do PATH) e os 18 `C50` também, com `RUNNER_TEMP` presente.
- **Falha**: só o `T8-C15` saudável (F1).
- **Hermes** (`r23/D-hermes.txt`):
  - os **11 nativos com runtime** passaram: `I4-C18`–`C23`, `C37`, `C44b`, `I25-C40 harness nativa` e os dois `I23-C8` com runtime (`D.log:622-631`, `:633`), com o runtime local de `hermes-runtime.mjs` e `HERMES_HOME` temporário;
  - o **ramo Hermes do `I4-C35`** passou (`:1077`), sem diagnóstico de Hermes ausente ou de revisão diferente;
  - o `I23-C8 … pelo Python do sistema` (`:632`) passou, mas não é runtime do Hermes. Os `I25-C40` de `hermes-harness.unit` (`:616-621`) são da harness.

  A CI não tem o runtime do Hermes; lá os nativos não rodam.
- **Skips (20)**: os mesmos do D do autor e da R22, em nome e motivo.
  - **Doctor (7)**: POSIX/FIFO (`# SKIP`). Não rodaram em ambiente nenhum desta rodada.
  - **Integrações (13)**:
    - `I25-C5`/`C6`/`C33`/`C42`/`C45` e `T8-C4` são POSIX: carry do C da R22 (`2383c52`), com os blobs iguais;
    - `I4-C15`, `I4-C25b`/`j`/`k` e `I25-C15` são carry do C da R19;
    - `I4-C25m` (macOS) e `I4-C25l` não rodaram em ambiente nenhum.

## Checks — 49/50 provados; C46 não provado neste HEAD

Fontes da prova:
- **A/B/C23**: os 4 arquivos inteiros, frescos nos três ambientes;
- **D23**: o nome real passou no D fresco;
- **R22**: o A/B/C dos 11 arquivos em `2383c52`, carregado por blob igual (nenhum deles mudou, salvo `follow.cli`, rodado de novo aqui);
- **G21**: a governança A/B/C da R21, carregada por identidade;
- **R19/R20**: o A/B/C cross-platform dos demais arquivos, carregado por blob igual.

As citações dos arquivos sem diff são as da R22, com as mesmas linhas (blobs iguais). As de `demo.e2e` e `follow.cli` foram renovadas no HEAD.

| Check | Asserção decisiva (`file:line` no HEAD) | Prova | Result |
| --- | --- | --- | --- |
| C1 | `command.cli:48-49` `private`/`bin`; `:65` `[0, SKILL_ME_HELP, ""]`; `:77` `gitStatus() === before` | D23; A/B/C R22 (B em clone `autocrlf=true`) | provado |
| C2 | `command.cli:96-98` `argv: LITERAL_ARGS` | D23; A/B/C R22 | provado |
| C3 | `command.cli:105` `{0: 0, 7: 7}` | D23; A/B/C R22 | provado |
| C4 | `command.cli:130-133` 127 `launcher_requires_shell`; `agent.unit` `I25-C4` | D23 (3 `✔`); A/B R22 | provado |
| C5 | `command.cli:228` POSIX; `:244-245` `CTRL_C_EVENT` → `["SIGINT"]` | console em D23; POSIX em C R22 | provado |
| C6 | `command.cli:267` `signals: ["SIGTERM"]` | C R22 (skip POSIX no D23, com motivo) | provado (carry) |
| C7–C14 | `prepare.cli:93-94`, `:122-126`, `:163-168`, `:189-191`, `:200`, `:223`, `:238`, `:250` | D23; ABC R19 | provado |
| C15 | `prepare.cli:408` (pty) | C R19 (skip no D23, com motivo) | provado (carry) |
| C16–C23 | `session.e2e:67`, `store.unit:79`, `session.e2e:111`, `:161`, `:190-192`, `:208-211`, `:230`, `:282` | D23; ABC R19 | provado |
| C24 | `store.unit:168` | D23; ABC R19 | provado |
| C25–C28 | `end.e2e:80-89`, `:101-109`, `:120`, `:164-165` e `:194` `["EIO"]` | D23; A/B/C R22 | provado |
| C29–C31 | `command.cli:278`, `:342`; `end.e2e:205-215` | D23; A/B/C R22 | provado |
| C32 | `end.e2e:320`; `store.unit:715` | D23 (9 `✔`); A/B/C R22 | provado |
| C33 | `end.e2e:460`; `:493-494` (arranjo POSIX) | D23; arranjo em C R22 | provado |
| C34–C35 | `report.cli:159`, `:252-259` | D23; ABC R19 | provado |
| C36–C38 | `command.cli:350`; `launch/docs.test:82`; `prepare.cli:355` | D23; A/B/C R22 | provado |
| C39–C40 | `hermes-harness.unit:90`; `:220`, `:320`, `:324`, `:327`; nativo `hermes-plugin.native:336` | D23 (os 11 nativos, `harness nativa`, `fixture do plugin`); ABC R19 | provado |
| C41–C45 | `store.unit:327-523`, `end.e2e:518`; `agent.unit` `I25-C42`, `command.cli:456`/`:424`; `store.unit:598`; `hermes-harness.unit:288`, `:291`; `agent.unit:132-146`, `command.cli:166-186` | D23 (17, 4, 12, 3 e 3 resultados); POSIX em C R22 | provado |
| **C46** | **T8-C15 saudável `concurrency.cli:220`** (e `:234`, `:256`); (a)–(c) `:283`–`:360`; (d)–(g) `live-capture:341`, `:348`, `:356`, `:367`, `replay.unit:161`, `:100`; (h) `live-capture:227-248`; **(i) `follow.cli:223`, `:230-233`**; **(j) `:243`, `:253-264`**; (k) `evidence.unit:54-148`; (l) `failure-matrix.cli:116-119`; (m) `evidence.unit:254-263`, `:287-298`; (n) `:303-305`, `:312`; (o) `delivery.unit:52-113`; (p) `concurrency.cli:956-1018`, T8-C16 `:920-928`; (q) `codex-run.cli:289-348`; (r) `docs.test:162-167`, `:218`, `:225-226`, `:254-258`, `:264`, `:266`, `:272-273`; **(s) `demo.e2e:144`, `:145`, `:146-147`, `:148`** (T8-C19 `:103`, `:105-106`, `:110`, `:120`); **(t) `follow.cli:278-282`, `:293-295`, `:305`, `:312-313`** (T8-C12 `:91`, `:94-99`; T8-C13 `:142-146`, `:158-164`, `:181-184`) | **A/B/C23** ((i), (j), (o), (s), (t), T8-C19/C12/C13); **D23**: 33 `I25-C46` `✔`, mas **o T8-C15 saudável `✖`** (`D.log:1078`); A/B/C R22 com o T8-C15 verde em `2383c52` (mesmo blob) | **não provado neste HEAD** (F1). Todas as provas nomeadas (a)–(t) passaram; o caso saudável que o C46 exige falhou no D fresco |
| C47 | I23-C10 `agents.e2e:315`; (a) `:427`, `:429`; (b) `:442`, `:444`; (c) `control.cli:1071-1077`; (d) `:1097-1105`; `evidence.unit:150-225` | **A/B/C23** (`agents.e2e` inteiro); D23 (6 `✔`, 7 `I23-C4`); `control.cli`/`evidence.unit` A/B/C R22 | provado (fresco) |
| C48 | estrutura contra `d0d5a7f` (R21); `governance-ci:373-433`, `:444-582`, `:511`, `:565-576`; `governance-C1 C3` `:271-283` | **G21** (A/B 27/27/0/0, C 27/26/0/1); **D23**: os dois `governance-C48` `✔`, nativo no pwsh oficial | provado |
| C49 | `governance-ci:322-329`, `:330-334`, `:337-348`, `:350-356`, `:359-362`; `:299-304` | G21; D23 | provado |
| C50 | `ci-lock-latency.test:127`, `:68`, `:137`, `:160-161`, `:187`, `:190-215`, `:217-240`, `:247`, `:250-303`, `:315-373`, `:377`, `:393-396`, `:406-434`, `:443` | G21; D23 (18 `C50`, `RUNNER_TEMP` presente) | provado |

- **Critérios não reduzidos**: as constantes do contrato estão em `src` sem diff desde `2383c52`:
  - `DELIVERY_DEADLINE_MS = 750`, `ATTEMPT_MS = 750 − 100` e `LOCK_RETRY_MS = 10` (`traces/delivery.mjs:12`, `:18`, `:19`);
  - `REPORT_DEADLINE_MS = 1000` (`observation.mjs:39`);
  - `HOOK_STDIN_DEADLINE_MS = 2000` (`hook-command.mjs:7`);
  - a faixa 1.900–6.000 do I4-C36 (`failure-matrix.cli:83`, `:119`);
  - `settleMaxMs` com padrão 5.000 (`settle.py:41`);
  - `PRIVACY_LIMITS` 500 eventos/8 MiB (`privacy/lifecycle.mjs:5`);
  - `MAX_PARALLEL_FILES = 8` (`test-integrations.mjs:14`).

  O workflow tem o mesmo blob (jobs 20/10/5, manual 10 e `RUNNER_TEMP` só no passo Windows das integrações). Os 80 eventos de dois produtores, os payloads, as contagens, as perdas, o retry, a carga e a concorrência estão nos blobs iguais. Os diffs de `demo.e2e` e `follow.cli` só extraem as rotinas, acrescentam o encerramento e os controles, e tiram o `kill()` do (i).
- **AC → checks** (9 ACs): AC1–AC6 com C1–C45; **AC7 com C46, não provado neste HEAD** (F1); AC8 com C47 e C48; AC9 com C49 e C50. O gate completo exigido no AC6/S6 e no despacho **falhou** neste HEAD.

## Swept `existing` (carry R22; `src` igual)

- idempotência: `privacy/lifecycle.mjs:23-24`;
- sem reenvio: `traces/delivery.mjs:57`, `:123`;
- falha de entrega não bloqueia: `traces/delivery.mjs:156`;
- `privacy prune`: `privacy/command.mjs:56-57`;
- acréscimos das fatias do T8-C19 e do `follow.cli`: C46 (s) e (t), provados acima. São refinamentos sem check novo.

## Observações (não bloqueantes; nada corrigido)

- **O1 — `kill()` com erro do sistema.** Se o `kill()` falhasse com `EPERM`, o `ChildProcess` emitiria `error` sem ouvinte, a exceção substituiria a original e o `close` não seria esperado. O autor declara isso como consequência conhecida, não observada (Landing `:125`). O sinal vai a um filho próprio, e o caso é improvável.
- **O2 — conferências diferentes nos controles.** O controle (s) confere por uma volta de `setImmediate` (`demo.e2e:146`). Com a rotina correta, o `close` já resolveu antes da rejeição, então o resultado é sempre `"close"`, sem falso vermelho. Já a detecção do M2 depende de o `close` não chegar na mesma volta do laço: o M2 do autor foi recusado, mas ali a detecção não é determinística como no `follow.cli` (`:278-282`).
- **O3 — o Landing tem textos anteriores às retificações.** A linha do T8-C19 (`:124`) ainda diz que o `try` vai até `assert.equal(await followDone, 0)`. A retificação `1b7b561` está só no C46 (s) (`:697-701`), como texto aditivo. O O1 da R22 (o literal do T8-C20 no Landing) continua igual.
- **O4 — sobras do `rmSync` do 24.13.0.** O B deixou 39 entradas na raiz própria, e as do D e do A foram 128 e 1. Fora da fatia, como o autor comunicou.
- **O5 — outros filhos assíncronos não foram auditados.** O levantamento por busca achou os outros `spawn` assíncronos de `tests/integrations` em apoios de produtores, ingest, wrapper e fake agents, que terminam sozinhos. Não auditei todas as saídas de falha deles.

## Gates remotos — pendentes e bloqueados

A ordem aprovada é esta: PASS independente → formal 14 `ready` → publicação → **uma** execução manual com a medição nos destinos originais → **cinco checks regulares verdes** nas matrizes PR e manual do HEAD aprovado → merge já autorizado. **Este FAIL bloqueia o primeiro passo.** A formal 14 não deve rodar sobre ele.

O HEAD publicado continua `066bd98`. O PR 40814315171 e a manual 40814471097, vermelhos, e a medição 4.500/4.500 ficam **como história** e não cumprem o novo HEAD. Não disparei nada e não declaro verde nenhuma CI futura.

## Processo, limites e limpeza da R23

**Executado.**
- **git**, só de leitura: `rev-parse`, `status`, `log`, `diff`, `show`, `ls-files --eol`, `ls-tree`, `hash-object`, `check-ignore`, `config --show-origin` e `get-tar-commit-id`. Também:
  - `git -c core.autocrlf=false archive` do HEAD para `r23/head.tar`;
  - um `git clone --no-hardlinks --no-checkout --config core.autocrlf=true` do repositório local, sem rede, com a configuração só no clone.
- **Leitura**: `node` só de leitura (contexto, config, `state.json` só com contagem e campos escalares das duas últimas tentativas, logs), `sha256sum`, `python -I` (sha do zip oficial e CR) e `stat`.
- **Gates**: A, B, C e D, uma vez cada, sem repetição. O WSL foi chamado com `wsl.exe -d Ubuntu -u oldboydev --exec /bin/bash --noprofile --norc` e `MSYS_NO_PATHCONV=1`. Fora do gate, só versões, `id`, `nproc` e caminhos de sistema.
- **Modo dos gates**: A, B e C usaram `run_in_background` só para passar o orçamento de 30 min (1.800.000 ms), e o D, o de 2 h (7.200.000 ms). Esperei o término real de cada um pela notificação da ferramenta.
- **Durante o D**:
  - li arquivos de `r23/`, das evidências do autor e do `.verified.md`;
  - rodei **um** `git log -1` só de leitura (o último commit do `.verified.md`), além de `sha256sum`, `wc` e `ls`;
  - não escrevi nada no checkout nem no `r23/`.
- **A ferramenta** guardou cópias das saídas em `AppData\Local\Temp\claude\…\tasks\*.output`. Não são auxiliares meus, e não as apaguei.
- **Depois do D**, uma consulta `Get-CimInstance Win32_Process` pelo Windows PowerShell 5.1 (`powershell.exe -NoProfile -NonInteractive`, com os dois opt-outs no processo), filtrada por `node`/`python`/`pwsh`/`powershell`/`cmd`/`bash`/`wsl` com `sm-v23` ou o repositório na linha de comando, excluindo o próprio processo:
  - listou só os três `bash.exe` da própria invocação, criados no mesmo segundo (`r23/post-D-checks.txt`);
  - **nenhum processo meu ficou vivo**, e nenhuma tarefa em segundo plano minha está ativa;
  - o arquivo foi gravado por caminho absoluto em `r23/`, depois de conferir o diretório atual. A raiz do checkout ficou sem arquivo novo.

**Incidentes meus**: nenhum. Não iniciei pwsh (nem `-?`, `help` ou `version`), agente real nem rede.

**Não executado.**
- RED, mutantes, sondas, testes novos e as reproduções do autor.
- Uma nova execução do D ou do T8-C15 depois da falha, porque o despacho proíbe rerun inalterado.
- Agentes reais, `--help`/`--version` de agente, perfis, credenciais, banco, modelo, rede, relógio do host, antivírus, Git global, TEMP global e runtimes fora das provas. O Hermes real rodou só pelas provas nativas versionadas do D, com o `HERMES_HOME` temporário delas.
- Actions, CI, `review:run`, commit, push, PR, merge, alteração de limites e subagentes.
- **Arquivos fora do alvo em A/B/C**: os outros arquivos da lista da R22 (incluindo `concurrency.cli`) e os demais de integração são carry por blob (R22 `2383c52`; R19/R20) e rodaram só no D. A governança em A/B/C é carry da R21 (G21).
- **Incidentes anteriores**, preservados sem leitura, remoção nem restauração:
  - o incidente da R5 (`ffc5937`: até 5 inícios do Codex no WSL e 12 mtimes, sem linha de base de conteúdo);
  - a limpeza antiga de 1.257 pastas no Windows e 107 no WSL, sem prova de proveniência e sem os nomes do Windows;
  - os auxiliares `/tmp/d4.skips`/`/tmp/d-old.skips` no temporário global, sem inventário anterior;
  - o D de `dc0db9b`, **interrompido pelo root** (não é falha natural);
  - o incidente 1 da R21 (`pwsh -?` sem opt-outs; afirmação errada corrigida; efeitos não auditados);
  - o incidente 2 da R21 (`post-D-checks.txt` ~9 s na raiz depois do D);
  - a interrupção do host na sonda do autor (`p-c12-2413`).

  Não afirmo impacto global zero.

**Auditoria externa 23 (do root) — pendente.** Às 09:08:02, depois do fim real do meu D (09:06:54), `verifier-round23/profile-comparison-final.json` **não existia**. Pela pasta, a linha de base do root é de 00:35–00:36. Não li `profile-before.json` nem os scripts dele.
- **Pendência**: o root fecha a auditoria depois deste D. Peço um complemento documental com o nível superior e o `sameProfileTarget` agregado, atribuído ao root.
- Pelo escopo das anteriores, ela audita só metadados do perfil WSL. Não audita conteúdo, temporários, Windows, PowerShell, rede nem causalidade, e não desfaz a R5. As auditorias 19–22 tiveram 12.113/12.113 e zero diferenças, no escopo delas, e a recusa pré-coleta corrigida do método 20 permanece.

**Complemento externo do coordenador (Root), depois do relatório do Verifier.** A auditoria 23 foi fechada às 09:08:40 (-03), depois do término real do D: 12.113 entradas antes e depois; zero adições, remoções, alterações e erros; `sameProfileTarget=true`. Fonte: agregados de `verifier-round23/profile-comparison-final.json` e `profile-target-check.json`, produzidos pelo Root, sem leitura de conteúdo. A janela vai do final da R22 (00:35:59) até este D e inclui a revisão formal Codex13 intencional anterior aos autores. As limitações acima permanecem; este complemento fecha só a pendência da auditoria externa e não altera o **FAIL23**, a falha F1 ou os gates. O Verifier não executou nem afirmou ter lido esta auditoria.

**Limites.**
- **macOS**: o `I4-C25m` não rodou em ambiente nenhum.
- **Windows**: os 7 skips do doctor e o `I4-C25l` não rodaram em ambiente nenhum desta rodada.
- **Runtime do Hermes**: só no D (Windows). O caso pelo Python do sistema não é runtime do Hermes.
- **Causas**: continuam desconhecidas as do `EPERM` (F1 e B do autor), do `green-pre2`, do I23-C6 da CI 066, do cancelamento da manual 40814471097 e as históricas. Os verdes A/B/C desta rodada são deste computador e não medem o runner da CI.

**Limpeza** (`A.env.txt`, `B.env.txt`, `B-clone-cleanup.txt`, `C.run.txt`, `D.env.txt`, `post-D-checks.txt`):
- as raízes `sm-v23-A`/`B`/`D` foram removidas só pelo registro (caminho real absoluto, filha direta do temporário, nome, pasta não link, mesmo `dev`/`ino`);
- o scratch do C, por caminho exato, uid 1000 e inode;
- o clone do B, por caminho, toplevel, HEAD e status;
- `runner-temp-A`/`B`/`D`, vazias, por `rmdir`;
- nenhuma seleção por prefixo ou mtime, e nenhum auxiliar meu no `/tmp` (Git Bash ou WSL) nem no temporário global. Logs, tar, scripts e a cópia do `.verified.md` anterior ficam em `r23/`.

**Integridade do histórico abaixo.** O texto depois da linha `---` que fecha esta rodada (e da linha em branco seguinte) é, byte a byte, o `.verified.md` do HEAD: blob `df42fe3`, de `066bd98`, com 335.766 bytes, sha256 `1b528f80…` e 0 CR (`r23/verified-integrity.txt`). Nele estão o **PASS 22**, o **FAIL 21**, o **PASS 20**, o **FAIL 19** e os relatórios anteriores, sem rebatizar nenhum resultado.
- O PASS 22 estava certo para `2383c52`, e a CI de `066bd98` não o desfaz retroativamente.
- Este FAIL 23 é do conteúdo de `6204613`. A mudança nova passou, mas o D fresco teve a falha natural F1.

---

# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25 (rodada 22)

**Verdict (R22)**: **PASS — 50/50 checks considerados e provados; gates frescos sem falha.** HEAD `2383c52`, último código `cad647a`, 9 ACs. Primeira verificação independente do código novo do T8-C20.
- **Gates frescos (verified at `2383c52`)**, uma vez cada, sem filtro e sem repetição:
  - **A** Windows Node 24.22.1: 116/110/0/6;
  - **B** clone novo com `autocrlf=true`, Node 24.13.0 oficial: 116/110/0/6;
  - **C** WSL isolado, Node 24.13: 116/112/0/4;
  - **D** `npm test` completo: **1.059 testes, 1.039 pass, 0 fail, 20 skip**, exit 0, término natural.

  Em todos, os 4 testes do `docs.test` (os dois T8-C20 e os dois controles do C46 (r)) e o T8-C15 com os 3 controles rodaram e passaram. No D, os 11 nativos do Hermes com runtime passaram, e a governança deu 27/27 com o caso nativo do pwsh executado.
- **O que isto não é**:
  - não desfaz o **FAIL 21** (`3a15d79`, D de `5a0f231` com o T8-C20 vermelho), que fica como está;
  - não transforma em PASS o **B vermelho do autor** em `407edc5` (`open lock EPERM` não injetado no T8-C15), analisado e preservado abaixo;
  - não demonstra a causa de nenhum dos dois, nem que deixem de ocorrer. Este verde é uma execução deste computador neste HEAD.
- **Mudança nova**: só prova e pré-carga de provas (`docs.test.mjs`, `traces-probe.mjs`). Produto, guia, workflow, governança, core e `package*` são iguais a `5a0f231`. Ela confere com o C46 (r) e com a retificação aditiva `fce5c59`. O T8-C20 positivo manteve o hook real, o arquivo Unicode e as asserções literais.
- **Carry por identidade**: 245 dos 247 arquivos rastreados de `src`/`tests`/`scripts` têm o blob de `5a0f231`. As análises de C1–C47 sem diff vêm da R21, da R20 e da R19. A governança (C48–C50) traz o A/B/C da R21, e o D desta rodada a executa de novo.
- **Gates remotos**: pendentes e obrigatórios. Não executei Action, CI, `review:run`, commit, push nem merge.

**Profile**: light (`AGENTS.md:138`). Por isso não há fault injection, `Coverage`, `Test policy` nem fonte de UI. Não criei mutantes, sondas, testes nem correções. O diagnóstico, as sondas, o RED (`red2-run.txt`), o GREEN e os mutantes M1–M3 do T8-C20 são **provas do autor**, só atribuídas (`builder-r21-t8c20/`; checklist `:646-675`; build, seção nova).

**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..2383c52a79627e80621fcd9a49d61f970dde9b06`, a feature inteira: 152 commits, árvore `790bdac3…`. Desde a R21 (`5a0f231`, relatório em `3a15d79`), entraram:
- `648458f` (abertura) e `22c1161` (Landing, C46 (r), Swept e task);
- `fce5c59` (retificação aditiva do (r));
- `cad647a` (**último código**);
- `407edc5`/`46a5b35` (gates do autor);
- `2383c52` (`approval` do override 25; `maxRounds` continua 13).

**Round**: **22** (light). Autorizações: “Pode fazer quantas precisar” e “Pode fazer a medição comparativa. Mantém os testes e prazos e segue até a CI ficar toda verde para fazer o merge do PR #28”. Escopo [6467154706](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706), [bloqueio T8-C20](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6485905666) e registro 22 [6486798702](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6486798702).
- `context-round22.json` (sha256 `580d6970…`) tem 35 comentários e 9 ACs. O corpo e os comentários 1–33 são iguais aos de `context-round21.json`. Os novos são o 34 (FAIL 21) e o 35 (registro 22). O `round22-registration.md` é igual ao comentário 35, sem placeholders (`r22/context-config.txt`).
- `roundOverrides["25"]` = `{profile: "light", maxRounds: 13}`, igual à R21. O diff desde `5a0f231` só troca o texto `approval`.
- O `state.json` da revisão tem 12 tentativas, sha256 `7acee6b7…`, o mesmo da R21. A formal 13 continua sem uso e é do root, depois deste resultado.

**Verifier**: subagente novo e independente (Claude Opus 5.5). Não sou o autor nem o Verifier 21, e não herdei sessão.
- Produto, testes, apoios, scripts, workflow, planos, configuração e estado ficaram só para leitura.
- Escrevi este arquivo e as evidências em `.checks/code-review/issue-25/verifier-round22/r22/`, pasta ignorada (`.gitignore:4`). Fora dela, só as raízes próprias dos gates.
- Não li `profile-before.json`, `profile-final.json` nem o resto de `profile-target-check.json`.

Data: 29/10/2026 (-03).
- **Plano**: a identidade (`r22/blob-identity.txt`, 00:15–00:16) e o alvo com os orçamentos (`r22/plan.txt`, 00:17:04) foram gravados antes de qualquer gate.
- **Horários**: A 00:17:32–00:20:39; B 00:21:09–00:23:33; C 00:23:56–00:25:09; D 00:25:36–00:35:06 (9 min 30 s).
- **Estado**: o HEAD foi `2383c52` do início ao fim. O `git status` ficou vazio antes e depois de A e do D, e às 00:35:38. Em B, o status do clone ficou vazio. Em C, a árvore extraída é igual ao `HEAD^{tree}`.

## Fontes lidas (R22)

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md`, `tlc-implement/references/verify.md` | inteiros |
| `.tasks/issue-25-agent-launch.md` | inteiro (805 linhas): critérios 1–42 e refinamentos, `Sources`, `Unresolved`, a ordem remota, “Ambiente do passo de integrações no Windows” e a seção nova “Diagnóstico do T8-C20 do D da verificação 21” (`:773-805`) |
| `.checks/issue-25-agent-launch.md` (2.266 linhas) | `Sources` (`:9-45`, com a entrada nova `:11`), `Out of scope`, `Landing` (`:58-121`, com a linha nova “Diagnóstico do T8-C20” `:119`), o C46 inteiro (`:426-675`, com o (r) `:646-675` e a retificação `:665-672`), os cabeçalhos de C47–C50, `Swept` (`:906-917`, com o acréscimo `:917`) e o bloco novo do `Handoff` (`:2213-2266`). Os demais blocos do `Handoff` são histórico e ficam como carry da R21 |
| `.checks/issue-25-agent-launch.verified.md` | o topo R21 inteiro (`:1-275`) e o processo da R20 (`:496-543`). O resto é histórico, atribuído sem nova execução |
| build (seção nova, `git diff 3a15d79..HEAD`), `builder-r21-t8c20/{plan.txt, build-results.md, B-failure.txt}`, `B.log` (só a falha), `D-hermes.txt` e `coordinator-t8c20-retification-note.md` | **relato do autor e do coordenador**, só atribuição |
| `git diff 5a0f231..HEAD` | inteiro no código: `docs.test.mjs` (+107/−23), `traces-probe.mjs` (+28/−3) e a configuração |
| código lido para a análise | `traces-probe.mjs:1-60`, `:140-210`; `producer-runs.mjs:1-80`; `traces.mjs:150-199`, `:280-309`, `:380-440`; `trace-kinds.mjs`; `concurrency.cli.test.mjs:120-160`, `:180-335`, `:395-430`; `delivery.mjs:51-104`; `store.mjs:190-209`; `privacy/fs.mjs:34-42`; `docs/traces.md:548-556`; `hermes-runtime.mjs:1-60` |

## Prova Git (verified at `2383c52`; `r22/blob-identity.txt`, `r22/context-config.txt`)

- **Alterados de `5a0f231` ao HEAD, fora de `.checks`/`.tasks`**:
  - `tests/integrations/traces/docs.test.mjs`: `d52de03` → `852616a`;
  - `tests/integrations/helpers/traces-probe.mjs`: `a6440dd` → `292c319`;
  - `code-review.config.json`: `8c9ada6` → `40f9fd8`, só o `approval`.

  `cad647a` tocou só os dois arquivos de teste. Desde ele, mudou só a configuração.
- **Iguais a `5a0f231`**:
  - árvores: `src` `51f0c98`, `docs` `d9f546f`, `scripts` `ab2df5a`, `scripts/code-review` `6b98d7c`, `.github` `6a0b533`, `tests/integrations/fixtures` `6591970`, `tests/doctor` `bcedb83`;
  - arquivos: `package.json` `8fd02fa`, `package-lock.json` `9ec32e0`, `.gitattributes`, `.gitignore`, `README.md`, `AGENTS.md`, `CLAUDE.md`, o workflow `f24e82d`, `test-integrations.mjs` `22824c4`, `governance-ci.test.mjs` `5313dba` e `ci-lock-latency{,.test}.mjs` (`8c12894`/`75eeadd`);
  - apoios: `trace-kinds.mjs` `96a67e9`, `producer-runs.mjs` `13cd7c6`, `traces.mjs` `b71938f`;
  - dez dos onze arquivos do alvo têm o mesmo blob. O outro é `docs.test`.

  Dos 247 rastreados de `src`/`tests`/`scripts`, 245 têm o blob de `5a0f231`.
- **Permanecem**:
  - o **produto `322bcad`**: `git diff 322bcad HEAD -- src` vazio, `delivery.mjs` `e1cf25a` nos dois;
  - o **EOF `68f84c4`**: `codex-run.cli.test.mjs` `ff47369` nos dois;
  - o **terceiro produtor `2473632`**: `evidence.unit.test.mjs` `6ccbf48` nos dois.
- **Core vendorizado**: os 5 arquivos de `scripts/code-review/` têm o blob da base no HEAD (`25e5284`, `c6a4abc`, `1bda8e4`, `216125c`, `b02001e`).
- **Alcance** (por busca, não pela lista do autor):
  - `traces-probe.mjs` só é carregado por `--import`, pelo `TRACES_PROBE` de `producer-runs.mjs:14`;
  - os consumidores são o `recordedProducer` num registro (`:37-58`), o `timedEnv` (`traces.mjs:116`) ou o `--import` direto;
  - os arquivos de teste que o carregam são **exatamente os 11 do alvo** (busca por `recordProducersInEachTest`, `recordingProducers`, `recordedProducer`, `timedEnv`, `TRACES_PROBE`, `traces-probe`, `SKILL_ME_TEST_TRACES_` e `NODE_OPTIONS` em `tests`/`scripts`/`src`);
  - nenhum outro teste lê `traces-probe.mjs` ou `docs.test.mjs`. O `fixtures-inventory` lê só `tests/integrations/fixtures`;
  - a governança (`test:governance`) importa só `scripts/*.mjs`, `src` e `yaml`, todos iguais. O C48–C50 pode, então, carregar a R21 (abaixo).

## Análise da mudança `cad647a` contra o C46 (r) e a retificação (verified at `2383c52`, por leitura; as provas estão nos gates)

**1. O T8-C20 positivo continua o mesmo** (`docs.test.mjs`):
- O trecho “Seguindo o guia” virou `followGuide` (`:146-168`), chamado sem `extra` (`:202`). Mantém:
  - o mesmo scratch `t8 c20 guia`, a raiz `capturas ação`, `startCapture`, o arquivo `diagnóstico de entrega.ndjson` e o `.lock` alheio `"lock alheio\n"` (`:148-154`);
  - o mesmo `runIntegrations(["hook", "--agent", "claude"])` síncrono, com `claudePayload("pre_tool_bash")` (`:156-161`).
- **Ambiente**: `recordedProducer("hook claude", baseEnv({ROOT, ID, REPORT, ...extra}))` (`:155`). Sem `extra`, são as mesmas três variáveis.
  - Num registro, só entram `NODE_OPTIONS=--import=<traces-probe>` e `SKILL_ME_TEST_TRACES_TIMING=<arquivo próprio>` (`producer-runs.mjs:37-58`). O `settle` só guarda o `run` e o devolve (`:52-56`).
  - Não há fd extra (é `runIntegrations`, não `runInternal`; a evidência diz `entrega sem relatório`). Não há outra escrita no prazo do hook: a linha de tempos é gravada na saída do processo.
- **Asserções literais**, as mesmas, nas linhas novas:
  - `:162` `[run.status, run.stdout, run.stderr]` = `[0, "", ""]`;
  - `:163` `readFileSync(file, "utf8")`;
  - `:164` uma linha;
  - `:166` `ISO_MS`;
  - `:167` o exemplo do guia, a menos do ID e do instante.

  As de prosa e tabela (`:170-200`) não mudaram, e `exampleLine` (`:141`) é a mesma busca.

**2. A pré-carga** (`traces-probe.mjs`):
- `isReport` compara o caminho **exato** com `SKILL_ME_CAPTURE_REPORT` não vazio (`:147-148`). `kindOf` dá `diagnóstico` só nele e `fileKind` nos outros (`:159`). A pasta continua `pasta`.
- Os knobs só trocam o `fsp.open` com o valor `"1"` (`:149-157`):
  - `STALL_REPORT` devolve uma promessa que nunca resolve;
  - `REPORT_EIO` lança `EIO` sem chamar o `open` real.

  O `timedOpen` (`:200`) envolve esse wrapper e mede a operação parada ou com erro.
- Sem as duas variáveis, o `fsp.open` não é trocado e `kindOf(file) === fileKind(file)` fora do valor exato de `SKILL_ME_CAPTURE_REPORT`. Nos produtores sem essa variável, a linha da pré-carga é a de `a6440dd`. É o caso do T8-C15 (`boundEnv(root, id, {...timedEnv, ...injected})`, `concurrency.cli.test.mjs:127`).
- Os produtores com `SKILL_ME_CAPTURE_REPORT` dentro de um registro (os T8-C16 de `concurrency.cli`) passam a rotular esse arquivo `diagnóstico`, em vez de `pasta`. Nenhuma asserção dependia do rótulo antigo: busca por `<op> pasta` nos 11 arquivos; o `evidence.unit:57` usa uma linha sintética.

**3. Os controles do C46 (r)** (`docs.test.mjs:205-274`):
- **Mesmo erro**: `guideFailure` roda `followGuide` com o knob dentro de `recordingProducers`.
  - `:218` `[code, syscall]` = `["ENOENT", "open"]`;
  - `:225` a mensagem começa pela original (relida do mesmo caminho, `:219-224`) seguida de `\nevidência dos produtores deste teste (`;
  - `:226` o `stack` traz a mensagem nova.
- **Privacidade** (`:228-235`). A evidência não traz:
  - a base, a raiz, o nome do scratch, `capturas ação`, `diagnóstico de entrega` nem `lock alheio`;
  - o ID nem a chave (hex/base64/base64url);
  - o `tmpdir()` nem o `PATH`;
  - nenhum `[0-9a-f]{32}`.
- **Nos dois** (`assertHookAndRoot`, `:253-259`):
  - `:254` `evidência dos produtores deste teste (1):`;
  - `:255` `produtor 1 hook claude: status 0, sinal nenhum; entrega sem relatório`;
  - `:256` `lock ocupado \(EEXIST, repetido\) [1-9]\d*x` (n ≥ 1);
  - `:257` `processo: iniciado `;
  - `:258` a linha da raiz **inteira**: `raiz 1 (produtores 1): lock presente, ilegível [SyntaxError; 12 bytes]; capturas indisponível [lock_present]; pasta das capturas 0 segmento(s), 0 temporário(s)`. É mais que o literal do (r), que não fixa a pasta.
- **Prazo** (`:261-267`): `:264` os pendentes na saída contêm `open diagnóstico (fora do lock) há `; `:266` a lista `falhas` não tem `diagnóstico`.
- **E/S** (`:269-274`): `:272` as `falhas` contêm `open diagnóstico EIO (fora do lock)`; `:273` os pendentes não têm `diagnóstico`.
- **Leitura das listas** (`failuresOf`/`pendingOf`, `:240-251`), pelo formato do apoio (`traces.mjs:165-171`, `:306-309`):
  - `falhas` vai de `; falhas ` a `; CPU do processo `;
  - os pendentes vão até o fim da linha;
  - `última concluída` e `ausências conferidas` ficam fora das duas listas.

  Um knob trocado, o tipo `pasta` no lugar de `diagnóstico` ou o hook fora do registro reprovam essas asserções. É o que os mutantes M1–M3 do autor mostram (atribuição, não execução minha).

**4. A retificação `fce5c59`** é aditiva e veio antes do commit de código `cad647a`. O texto original do (r) fica.
- **O que mudou**: o (r) inicial exigia `pendentes na saída: nenhuma` no controle de E/S. O GREEN anterior ao commit (`builder-r21-t8c20/green-pre2.log`) mostrou `stat store.json (fora do lock)` ainda pendente na saída.
- **Por que a suposição era errada**: a tentativa da entrega abandonada no prazo continua em segundo plano. O `untilDeadline` não cancela a operação (`delivery.mjs:57-62`, `:85-99`), e uma E/S já iniciada não é cancelável.
- **O que a correção confere**: só o objeto que separa os controles, o diagnóstico pendente × o diagnóstico com falha. `pendingOf`/`failuresOf` leem cada lista inteira e só testam a presença ou a ausência de `diagnóstico`. Nenhuma outra operação é filtrada, descartada ou escondida.
- **O que não mudou**: nenhuma asserção do T8-C20 original foi reduzida. O prazo de 1.000 ms (`REPORT_DEADLINE_MS`, `observation.mjs:39`, `:118`; blob `45192e7` igual) e o melhor esforço (`delivery-report.mjs` `42b759b` igual; `docs/traces.md:553-555`) também não.
- **Atribuição**: a justificativa é do autor e do coordenador (`coordinator-t8c20-retification-note.md`). Não é autorização humana nova. Eu a aceito como correção de uma suposição nova e errada do próprio controle, sem efeito no contrato (`AGENTS.md:73-74`).

**5. Prazo**: `REPORT_DEADLINE_MS` conta do `flush` e já inclui a espera da entrega (650 ms por entrada, disputando o lock alheio). Não são 1.000 ms novos depois do `settle`.
- A sonda do autor (20/20 com ~335–349 ms de margem; quatro classes com o mesmo sintoma da R21) é atribuição. Mostra classes compatíveis, não a causa da R21.
- Nenhum defeito do produto foi demonstrado, e não alego que a intermitência acabou.
- No D desta rodada, o T8-C20 levou 2.218,9 ms. O apoio do C16 mediu 696 ms do fim do stdin à saída do hook (`D.log:1087`, 1118).

## O B vermelho do autor em `407edc5` — analisado e preservado (não é resultado meu)

- **O que o log mostra** (`builder-r21-t8c20/B.log:67`, `:139-175`; `B-failure.txt`):
  - clone novo, Node 24.13.0 oficial, 116/109/1/6;
  - falhou só `I25-C46 diagnóstico do T8-C15: confirmação perdida depois do commit …` (`concurrency.cli.test.mjs:321`, asserção `:283`);
  - o produtor `a`, **sem injeção**, saiu `io_failure` 40/39/39/1, com `falhas open lock EPERM (tomada do lock)` e `lock ocupado (EEXIST, repetido) 16x`;
  - o `b` (injeção `LOST_CONFIRMATION=2`) saiu `io_failure` 40/33/33/7 com `unlink lock EIO`, como o controle espera;
  - a captura ficou `manual active accepted 79 persisted 79`, com lock ausente, 1 segmento e 0 temporário;
  - o controle confere `a` primeiro (`assertProducersConfirmed`, `:215-222`), por isso o `actual` em `:283` é o de `a`.
- **Política do produto, por leitura**:
  - `holdLockFile` só converte o `EEXIST` da criação exclusiva do `.lock` em `lock_present`, e relança qualquer outro erro (`store.mjs:196-203`). A criação é `writeExclusive` = `open(file, "wx", 0o600)` (`privacy/fs.mjs:34-35`);
  - `codeOf` dá `io_failure` a todo erro que não é `StoreError` (`delivery.mjs:51`), e só `lock_present` é repetido até o prazo (`:100-102`);
  - a base `63621c6` tem a mesma regra (`store.mjs:169`; `delivery.mjs:51`, `:90`).

  Então um `EPERM` na tomada do lock vira `io_failure` sem nova tentativa, como manda o AC7 (“sem retry novo”). Não proponho mudança dessa política.
- **Relação com `cad647a`**: nenhuma demonstrável, e eu também não demonstro que não haja relação. Pela leitura, os produtores do T8-C15 não recebem `SKILL_ME_CAPTURE_REPORT` nem os knobs novos (`concurrency.cli.test.mjs:127`). Então a pré-carga de `292c319` não troca o `fsp.open` deles e dá a mesma linha de `a6440dd` (item 2 acima).
- **Ocorrência**: procurei `lock EPERM` em todos os `.log`/`.txt` de `.checks/code-review/issue-25/`. Só aparecem o `B.log`/`B-failure.txt` do autor e os textos de despacho da R22. As falhas antigas do T8-C15 (R9) não tinham errno. Nos meus A/B/C/D não houve `EPERM`.
- **Causa**: **não demonstrada**. Um `EPERM` do `open` exclusivo no Windows é compatível, por exemplo, com o nome do `.lock` ainda pendente de remoção depois da liberação do outro produtor. Mas nada no log distingue essa classe de outras (outro processo do sistema, disco). Não atribuo a antivírus, indexador, disco ou hardware.
- **O que esta rodada fez**: rodou o alvo inteiro de novo, uma vez por ambiente, sem filtro e sem repetição. O B desta rodada (mesmo Node, clone novo) passou, inclusive esse controle (`B.log:67`).
  - Esse verde **não** apaga, não explica e não corrige o B do autor.
  - O risco de nova ocorrência, no local ou na CI, continua aberto. A decisão fica com o coordenador e o proprietário, com as opções registradas pelo autor (checklist `:2261-2264`).

## Execuções — verified at `2383c52`

A ordem foi A, B, C e D, em sequência, uma vez cada, sem filtro e sem repetição. O alvo e os orçamentos foram registrados antes (`r22/plan.txt`).
- **Alvo de A/B/C**: os 11 arquivos inteiros, numa invocação: `node --test --test-concurrency=4` + `launch/command.cli`, `launch/end.e2e`, `observe/agents.e2e`, `observe/control.cli`, `traces/concurrency.cli`, `traces/docs`, `traces/evidence.unit`, `traces/follow.cli`, `traces/live-capture.cli`, `traces/query.cli` e `traces/replay.unit`.
- **Forma comum**:
  - `RUNNER_TEMP` numa pasta própria, vazia antes e com 0 entradas depois;
  - temporário dos testes numa raiz própria `sm-v22-<rótulo>-…`, criada por `mkdtemp` e registrada (caminho real, `dev`, `ino`), só no `TEMP`/`TMP` do processo do gate (A, B, D) ou no `TMPDIR` do scratch (C);
  - `npm_execpath` ausente e `npm_config_update_notifier=false`;
  - em A, B e D, `POWERSHELL_TELEMETRY_OPTOUT=1` e `POWERSHELL_UPDATECHECK=Off` só no processo. Nenhum muda asserção.
- **Scripts** (escritos por mim, em `r22/`): `isolated-root.mjs`, `run-target.sh`, `make-clone-B.sh`, `remove-clone-B.sh`, `wsl-run.sh`, `run-npm-test.sh`, `matrix.mjs` e `d-summary.mjs`.

| # | Ambiente | Resultado |
| --- | --- | --- |
| A | Windows 11, checkout principal, Node **v24.22.1** (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1; `docs.test`/`traces-probe` iguais aos blobs do HEAD. 00:17:32–00:20:39 | **116 testes, 110 pass, 0 fail, 6 skip**, 0 cancelled, exit 0. Status vazio antes e depois; `RUNNER_TEMP` com 0 entradas. Raiz `sm-v22-A-gs8fJf` (1 entrada dos testes) conferida e removida pelo registro |
| B | **Clone git novo** em `r22/B-clone` (`--no-hardlinks --no-checkout --config core.autocrlf=true`, sem rede; o `gitconfig` do sistema já tinha `true`; nada global mudou). HEAD `2383c52`, árvore `790bdac3…` e toplevel conferidos. Node **v24.13.0 oficial**: zip `ca274269…` igual à linha do `SHASUMS256.txt`, `node.exe` `d14ba95c…` igual ao do zip, npm **11.6.2** adjacente, na frente do PATH. `cli.mjs` `i/lf w/lf attr/text eol=lf`, **0 CR antes e depois**; `docs.test` e `traces-probe` `i/lf w/crlf` (274 CR no `docs.test`). Status vazio antes e depois do `node_modules` copiado. 00:21:09–00:23:33 | **116: 110 pass, 0 fail, 6 skip**, exit 0. Depois: HEAD, árvore e toplevel iguais, bin LF/0 CR, status vazio. Raiz `sm-v22-B-RoZOXx` (362 entradas dos testes, o mesmo número do B do autor) removida pelo registro. Clone removido pelo caminho exato, depois de conferir pasta não link, toplevel, HEAD e status vazio (`B-clone-cleanup.txt`) |
| C | WSL `Ubuntu`, `oldboydev`, uid 1000. `git -c core.autocrlf=false archive` do HEAD: 6.522.880 bytes, sha256 `c451ac8f…`, `get-tar-commit-id` = `2383c52…`. Árvore extraída `790bdac3…` = `HEAD^{tree}` (git com `HOME` do scratch e `GIT_CONFIG_NOSYSTEM`); 0 CR; `cli.mjs` 755; sha256 de `docs.test` `a0f60c5d…` e de `traces-probe` `6ee19269…`, iguais aos blobs. Node **v24.13.0** copiado de `/usr/bin/nsolid` (`150946e4…`, igual) num prefixo `node npm npx`, **sem `sh`**; npm 11.6.2. `env -i` só com `HOME`, `LANG`, `PATH`, `RUNNER_TEMP`, `TMPDIR` e `npm_config_update_notifier`. `PATH` = prefixo + `tools` (links para `/usr/bin/{sh,git,python3,id,grep,mkfifo}`), **sem `/usr/bin`**, sem `codex`/`claude`/`hermes`/`gemini`/`pwsh`. 00:23:56–00:25:09 | **116: 112 pass, 0 fail, 4 skip**, exit 0. `RUNNER_TEMP` 0 entradas, `HOME` 0. Scratch `/tmp/sm-v22-C.BwwGqd` removido pelo caminho exato, pasta não link, uid 1000 e inode 1712 |
| D | `npm test`, sem argumentos, no checkout principal: Windows, Node v24.22.1, npm 11.19.1, `SKILL_ME_HERMES_PYTHON` ausente, `availableParallelism` 32 → `MAX_PARALLEL_FILES = 8`. `C:\Program Files\PowerShell\7` na frente do PATH: é o pwsh oficial já instalado, só o caminho, sem iniciá-lo para inspeção. Orçamento de **2 h** (7.200.000 ms), definido no plano e passado à ferramenta. Checkout commitado e limpo. 00:25:36–00:35:06 | **1.059 testes: 1.039 pass, 0 fail, 20 skip**, **exit 0**, término natural. Por suíte: governança 27/27/0/0, motor 16/16/0/0, doctor 417/410/0/7, integrações 599/586/0/13. HEAD igual e status vazio antes e depois; `RUNNER_TEMP` com 0 entradas. Raiz `sm-v22-D-sr1ywn` (128 entradas dos testes) removida pelo registro |

**Nomes de A/B/C** (`r22/matrix-ABC.txt`):
- os 116 nomes de topo são iguais nos três ambientes, sem duplicado, e iguais aos do A, do B e do C do autor. O B do autor tem 117 linhas porque repete o `✖` no resumo; são 116 nomes únicos;
- os 4 do `docs.test` (`A.log:89-92`, `B.log:89-92`, `C.log:88-91`) e o T8-C15 com os 3 controles (`:65-68` nos três) passaram;
- **skips com motivo**:
  - em A e B, os 6 POSIX: `I25-C45` (componente vazio do PATH é semântica POSIX), `I25-C5`, `I25-C6` e `I25-C42` (sinais POSIX), `I25-C33` (o npm do Windows usa o `ComSpec`) e `T8-C4` (sinal POSIX do filho);
  - em C, os 4 só do Windows: `I25-C4`, `I25-C5` console, `I25-C42` console (`PATHEXT`, `.cmd` e o console só existem no Windows) e o controle do `I25-C45` no Windows;
  - cada caso de plataforma rodou no outro ambiente.

**D** (`r22/D-summary.txt`, comparado nome a nome):
- **Contra o D do autor (`407edc5`)**: as mesmas 1.059 linhas de resultado, com as mesmas marcas. Nenhuma linha só de um lado.
- **Contra o D da R21 (`5a0f231`)**: entram os dois controles `I25-C46 diagnóstico do T8-C20`. O `T8-C20 … grava`, que era `✖`, agora é `✔`.
- **Nomes por check**: cada prefixo de `I25-C1 ` a `I25-C47 ` tem ao menos um `✔`, salvo `I25-C6` e `I25-C15`, que no Windows só têm skip.
  - O `I25-C46` soma 30 `✔`: 2 do T8-C20, 3 do T8-C15, 7 de `evidência comum` e 8 de `prazo da entrega`, entre outros.
  - Também passaram: 6 `I25-C47`, 9 `T8-C16`, 3 `I4-C16`, `I4-C17`, `I4-C35`, `I4-C36`, `I4-C47`, 7 `I23-C4`, `I23-C10` e `T8-C2`/`C3`/`C8`/`C12`/`C13`/`C14`/`C15`/`C18`/`C20`.
  - Os 9 `governance-…` (os dois `governance-C48` em `D.log:34-35`, com `ℹ pwsh: C:\Program Files\PowerShell\7\pwsh.exe` em `:36`) e os 18 `C50` também, com `RUNNER_TEMP` presente.
- **Hermes** (`r22/D-hermes.txt`):
  - os **11 nativos com runtime** passaram: `I4-C18`–`C23`, `C37`, `C44b`, `I25-C40 harness nativa` e os dois `I23-C8` com runtime (`D.log:622-631`, `:633`). O runtime é o venv local 0.21.4, conferido por hash (`hermes-runtime.mjs:30-56`), com `HERMES_HOME` temporário;
  - o **ramo Hermes do `I4-C35`** passou (`:1077`), sem nenhum diagnóstico de Hermes ausente ou de revisão diferente no log;
  - o `I23-C8 … pelo Python do sistema` (`:632`) passou, mas não é runtime do Hermes. Os `I25-C40` de `hermes-harness.unit` (`:616-621`) são da harness.

  A CI não tem o runtime do Hermes; lá os nativos não rodam.
- **Skips (20)**: os mesmos do D do autor, em nome e motivo.
  - **Doctor (7)**: `{ skip: process.platform === "win32" }` (POSIX/FIFO; o reporter mostra `# SKIP`). Não rodaram em ambiente nenhum desta rodada.
  - **Integrações (13)**:
    - `I25-C5`/`C6`/`C33`/`C42`/`C45` POSIX e `T8-C4` rodaram no meu C;
    - `I4-C15`, `I4-C25b`/`j`/`k` e `I25-C15` são carry do C da R19 (`5ee0e0f`), com os blobs iguais;
    - `I4-C25m` (macOS) e `I4-C25l` não rodaram em ambiente nenhum.

## Checks — 50/50

Fontes da prova:
- **A/B/C22**: os 11 arquivos inteiros, frescos nos três ambientes;
- **D22**: o nome real passou no D fresco;
- **G21**: a governança A/B/C da R21, carregada por identidade (workflow, teste, scripts, `package.json` e `src` com os mesmos blobs; mesmos comandos e orçamentos);
- **R19/R20**: o A/B/C cross-platform dos demais arquivos, carregado por blob igual.

As citações dos arquivos sem diff são as da R21, com as mesmas linhas. As do `docs.test` foram renovadas no HEAD.

| Check | Asserção decisiva (`file:line` no HEAD) | Prova | Result |
| --- | --- | --- | --- |
| C1 | `command.cli:48-49` `private`/`bin`; `:65` `[0, SKILL_ME_HELP, ""]`; `:77` `gitStatus() === before` | **A/B/C22** (B em clone `autocrlf=true`, bin LF/0 CR antes e depois); D22 | provado (fresco) |
| C2 | `command.cli:96-98` `argv: LITERAL_ARGS` | A/B/C22; D22 | provado (fresco) |
| C3 | `command.cli:105` `{0: 0, 7: 7}` | A/B/C22; D22 | provado (fresco) |
| C4 | `command.cli:130-133` 127 `launcher_requires_shell`; `agent.unit` `I25-C4` | A/B22 e D22 (3 `✔`); `agent.unit` carry | provado |
| C5 | `command.cli:228` POSIX; `:244-245` `CTRL_C_EVENT` → `["SIGINT"]` | POSIX em C22; console em A/B22 e D22 | provado (fresco) |
| C6 | `command.cli:267` `signals: ["SIGTERM"]` | C22 (skip POSIX em A/B/D, com motivo) | provado (fresco) |
| C7–C14 | `prepare.cli:93-94`, `:122-126`, `:163-168`, `:189-191`, `:200`, `:223`, `:238`, `:250` | D22; ABC R19 | provado |
| C15 | `prepare.cli:408` (pty) | C R19 (skip no D, com motivo) | provado (carry) |
| C16–C23 | `session.e2e:67`, `store.unit:79`, `session.e2e:111`, `:161`, `:190-192`, `:208-211`, `:230`, `:282` | D22; ABC R19 | provado |
| C24 | `store.unit:168` | D22; ABC R19 | provado |
| C25–C28 | `end.e2e:80-89`, `:101-109`, `:120` (e `store.unit` `I25-C27`), `:164-165` e `:194` `["EIO"]` | A/B/C22 (`end.e2e`); D22 | provado (fresco) |
| C29–C31 | `command.cli:278`, `:342`; `end.e2e:205-215` | A/B/C22; D22 | provado (fresco) |
| C32 | `end.e2e:320`; `store.unit:715` | A/B/C22 (`end.e2e`); D22 (9 `✔`); `store.unit` carry | provado |
| C33 | `end.e2e:460`; `:493-494` (arranjo POSIX) | A/B/C22 (arranjo em C22); D22 | provado (fresco) |
| C34–C35 | `report.cli:159`, `:252-259` | D22; ABC R19 | provado |
| C36–C38 | `command.cli:350`; `launch/docs.test:82` (os limites); `prepare.cli:355` | A/B/C22 (`command.cli`); D22; os outros carry | provado |
| C39–C40 | `hermes-harness.unit:90`; `:220`, `:320`, `:324`, `:327`; nativo `hermes-plugin.native:336` | D22 (os 11 nativos, `harness nativa`, `fixture do plugin`); ABC R19 | provado |
| C41–C45 | `store.unit:327-523`, `end.e2e:518`; `agent.unit` `I25-C42`, `command.cli:456`/`:424`; `store.unit:598`; `hermes-harness.unit:288`, `:291`; `agent.unit:132-146`, `command.cli:166-186` | A/B/C22 (`command.cli`, `end.e2e`; POSIX em C22); D22 (17, 3, 12, 3 e 2 `✔`) | provado |
| C46 | T8-C15 `concurrency.cli:220`, `:234`, `:256`; (a)–(c) `:283`–`:360`; (d)–(g) `live-capture:341`, `:348`, `:356`, `:367`, `replay.unit:161`, `:100`; (h) `live-capture:227-248`; (i) `follow.cli:195`, `:203-206`; (j) `:215`, `:225-236`; (k) `evidence.unit:54-148`; (l) `failure-matrix.cli:116-119`; (m) `evidence.unit:254-263` e `:287-298`; (n) `:303-305`, `:312`; (o) `delivery.unit:52-113`; (p) `concurrency.cli:956-1018`, T8-C16 `:920-928`; (q) `codex-run.cli:289-348`; **(r)** `docs.test:162-167` (T8-C20 inalterado), `:218`, `:225-226`, `:232-235`, `:254-258`, `:264`, `:266`, `:272`, `:273` | **A/B/C22** ((a)–(k), (m), (n), (p) e (r), nos arquivos inteiros); **D22** (todos; 30 `I25-C46`, 9 `T8-C16`); (l), (o) e (q) no D22 e carry | **provado (fresco)** |
| C47 | I23-C10 `agents.e2e:315`; (a) `:427`, `:429`; (b) `:442`, `:444`; (c) `control.cli:1071-1077`; (d) `:1097-1105`; `evidence.unit:150-225` | **A/B/C22** (`agents.e2e`, `control.cli`, `evidence.unit` inteiros); D22 (6 `✔`, 7 `I23-C4`) | provado (fresco) |
| C48 | estrutura contra `d0d5a7f` (R21); `governance-ci:373-433` (estrutural), `:444-582` (nativo), `:511` (escape), `:565-576` (aspas); `governance-C1 C3` `:271-283` | **G21** (A/B 27/27/0/0, C 27/26/0/1); **D22**: os dois `governance-C48` `✔`, nativo no pwsh oficial | provado |
| C49 | `governance-ci:322-329`, `:330-334`, `:337-348`, `:350-356`, `:359-362`; `:299-304` | G21; D22 | provado |
| C50 | `ci-lock-latency.test:127`, `:68`, `:137`, `:160-161`, `:187`, `:190-215`, `:217-240`, `:247`, `:250-303`, `:315-373`, `:377`, `:393-396`, `:406-434`, `:443` | G21; D22 (18 `C50`, `RUNNER_TEMP` presente) | provado |

- **Critérios não reduzidos**: as constantes do contrato estão no código sem diff:
  - `DELIVERY_DEADLINE_MS = 750`, `ATTEMPT_MS = 750 − 100` e `LOCK_RETRY_MS = 10` (`traces/delivery.mjs:12`, `:18`, `:19`);
  - `REPORT_DEADLINE_MS = 1000` (`observation.mjs:39`);
  - `HOOK_STDIN_DEADLINE_MS = 2000` (`hook-command.mjs:7`);
  - a faixa 1.900 ≤ ms < 6.000 do I4-C36 (`failure-matrix.cli:83`, `:119`);
  - `settleMaxMs`, com padrão 5.000 (`settle.py:41`);
  - `PRIVACY_LIMITS` 500 eventos/8 MiB (`privacy/lifecycle.mjs:5`);
  - `LAUNCH_SETTLE_MS = DELIVERY_DEADLINE_MS` (`launch/command.mjs:53`);
  - `MAX_PARALLEL_FILES = 8` (`test-integrations.mjs:14`).

  O workflow tem o mesmo blob da R21: jobs 20/10/5, o manual 10 e o `RUNNER_TEMP` só no passo Windows das integrações. Os 80 eventos de dois produtores, os payloads, as contagens, as perdas, o retry, a carga e a concorrência estão nos blobs iguais. O diff do `docs.test` só move o corpo e acrescenta os controles.
- **AC → checks** (9 ACs): AC1–AC6 com C1–C45; AC7 com C46; AC8 com C47 e C48; AC9 com C49 e C50. O gate completo exigido no AC6/S6 e no despacho passou neste HEAD. A execução remota da medição e os cinco checks regulares continuam como condição de merge.

## Swept `existing` (carry R21/R20; `src` igual, linhas conferidas no HEAD)

- idempotência: `privacy/lifecycle.mjs:23-24`;
- sem reenvio: `traces/delivery.mjs:57`, `:123`;
- falha de entrega não bloqueia: `traces/delivery.mjs:156`;
- `privacy prune`: `privacy/command.mjs:56-57`;
- acréscimo da fatia do T8-C20 (`:917`): o C46 (r) é observabilidade, provada acima.

## Observações (não bloqueantes; nada corrigido)

- **O1 — o literal antigo continua no Landing.** A linha “Diagnóstico do T8-C20” do Landing (`:119`) ainda diz, para o controle de E/S, `pendentes na saída: nenhuma`.
  - A retificação está só no C46 (r) (`:665-672`) e no `Handoff` (`:2255-2260`), como texto aditivo que declara o literal não garantido.
  - O check verificado é o (r) com a retificação, e a prova o cumpre.
  - Quem ler só o Landing vê a forma antiga. Fica como nota documental para o root, sem pedido de mudança: o contrato e o produto não mudam por isso.
- **O2 — sobras do Node 24.13.0 no temporário.** Sob o Node 24.13.0 do Windows, os testes do alvo deixaram 362 entradas na raiz própria do B, contra 1 no A. O B do autor deixou o mesmo número.
  - As entradas saíram com a raiz registrada. Não investiguei a causa e não a atribuo.
  - Na CI Windows, o temporário das integrações é o `RUNNER_TEMP`.
- **O3 — anteriores**: as O1–O2 da R21 e as observações anteriores continuam como estão. O código delas não mudou.

## Gates remotos — pendentes e obrigatórios (nenhum ocorreu aqui)

A ordem aprovada segue daqui:
1. este PASS;
2. a formal 13, já autorizada e sem uso, parando no primeiro `ready` válido;
3. a publicação;
4. **uma** execução manual com a medição nos destinos originais;
5. os **cinco checks regulares verdes** nas matrizes PR e manual do HEAD aprovado;
6. o merge, já autorizado só com tudo isso.

O HEAD publicado continua `86c7677`. O PR 40790722204 verde e a manual 40790906319 vermelha no Windows e no agregado ficam **como história**. A CI e o benchmark de `86c7677` não cumprem o novo HEAD. Não disparei nada, não declaro verde nenhuma CI futura e não crio exigência de CI antes da publicação.

## Processo, limites e limpeza da R22

**Executado.**
- **git**, só de leitura: `rev-parse`, `status`, `log`, `diff`, `show`, `ls-files --eol`, `ls-tree`, `merge-base`, `hash-object`, `check-ignore`, `config --show-origin` e `get-tar-commit-id`. Também:
  - `git -c core.autocrlf=false archive` do HEAD para `r22/head.tar`;
  - um `git clone --no-hardlinks --no-checkout --config core.autocrlf=true` do repositório local, sem rede, com a configuração só no clone.
- **Leitura**: `node` só de leitura (contexto, config, `state.json`, logs, nível superior da auditoria), `sha256sum`, `python -I` (sha do zip oficial e CR do bin) e `stat`.
- **Depois do D**, duas consultas `Get-CimInstance Win32_Process` pelo Windows PowerShell 5.1 (`powershell.exe -NoProfile -NonInteractive`, com os dois opt-outs no processo), filtradas por `node`/`python`/`pwsh`/`cmd`/`bash`/`wsl` com `sm-v22` ou o repositório na linha de comando (`r22/post-D-checks.txt`):
  - a 1ª listou só os `bash.exe` da própria invocação;
  - a 2ª, que exclui a cadeia de ancestrais da consulta, listou um `pwsh.exe` do runtime do Codex (`…\codex-runtimes\…\pwsh.exe`, pai na cadeia do host). Ele já não existia 15 s depois;
  - não o iniciei nem o encerrei, e não li mais nada dele. **Nenhum processo meu ficou vivo**.
- **Gates**: A, B, C e D, uma vez cada, sem repetição. O WSL foi chamado com `wsl.exe -d Ubuntu -u oldboydev --exec /bin/bash --noprofile --norc` e `MSYS_NO_PATHCONV=1`. Fora do gate, só versões, caminhos de sistema e um `ls -d` do scratch depois do D; nada do perfil.
- **Modo dos gates**: A, B e C usaram `run_in_background` só para passar o orçamento de 30 min (`timeout` 1.800.000 ms), e o D, o de 2 h (7.200.000 ms).
  - Esperei o término real de cada um. No D, usei um `tail -f` limitado a 570 s que lia só `r22/D.env.txt` até a linha `EXIT=`.
  - Durante o D não rodei git nem escrevi nada no checkout; só li arquivos de `r22/` e fontes.
  - A ferramenta guardou cópias das saídas em `AppData\Local\Temp\claude\…\tasks\*.output`. Não são auxiliares meus, e não as li nem apaguei.
- **Git Bash**: o here-doc do `python -I` e a substituição de processo usaram pipe/`/proc/self/fd` (bash 5.2.37). Nenhum arquivo nomeado meu ficou no `/tmp`.

**Incidentes meus**: nenhum. Não iniciei pwsh (nem `-?`, `help` ou `version`), agente real nem rede. Nenhum arquivo foi gravado na raiz do checkout: o `post-D-checks.txt` foi gravado por caminho absoluto em `r22/`, depois de conferir o diretório atual.

**Não executado.**
- RED, mutantes, sondas, testes novos e as reproduções do autor.
- Agentes reais, `--help`/`--version` de agente, perfis, credenciais, banco, modelo, rede, relógio do host, antivírus, Git global, TEMP global e runtimes fora das provas. O Hermes real rodou só pelas provas nativas versionadas do D, com o `HERMES_HOME` temporário delas.
- Actions, CI, `review:run`, commit, push, PR, merge, alteração de limites e subagentes.
- **Arquivos fora do alvo em A/B/C**: os outros arquivos de integração da lista da R19 não rodaram aqui. São carry com os blobs iguais (R19 `5ee0e0f`/R20 `6eb09ef`), e o D desta rodada os rodou no Windows. A governança em A/B/C é carry da R21 (G21).
- **Incidentes anteriores**, preservados sem leitura, remoção nem restauração:
  - o incidente da R5 (`ffc5937`: até 5 inícios do Codex no WSL e 12 mtimes, sem linha de base de conteúdo);
  - a limpeza antiga de 1.257 pastas no Windows e 107 no WSL, sem prova de proveniência e sem os nomes do Windows;
  - os auxiliares `/tmp/d4.skips`/`/tmp/d-old.skips` no temporário global, sem inventário anterior;
  - o D de `dc0db9b`, **interrompido pelo root** (não é falha natural);
  - o incidente 1 da R21 (`pwsh -?` sem opt-outs; a afirmação errada foi corrigida no relatório; efeitos não auditados);
  - o incidente 2 da R21 (`post-D-checks.txt` ~9 s na raiz depois do D, antes de ser movido);
  - o incidente de telemetria do autor.

  Não afirmo impacto global zero.

**Auditoria externa 22 (do root, só metadados do perfil WSL).** O root gravou `../profile-comparison-final.json` às 00:36:01, depois do fim real do meu D (00:35:06). Eu o li às 00:36:30, só no nível superior. De `profile-target-check.json`, li só o agregado `sameProfileTarget` (`r22/profile-summary-external.txt`). Não abri `profile-before.json`, `profile-final.json` nem listas de entradas.
- **escopo declarado**: “External metadata-only audit from the Round21 final snapshot before the T8-C20 author through completion of independent Round22 proofs; not a content audit, not temporary-file provenance, or undo for Round5”;
- **janela**: a linha de base é 28/10 22:56:55 (-03), a cópia do snapshot final da R21; o fechamento é 29/10 00:35:59 (-03);
- **resultado**: `baselineEntries` 12.113 e `afterEntries` 12.113; `errors`, `added`, `removed` e `modified` vazios; `sameProfileTarget` `true`.

É resultado externo do root, não meu. Pelo escopo que ele declara, não audita conteúdo, temporários, Windows, PowerShell, rede, configuração global nem causalidade, e não desfaz a R5. As auditorias 19, 20 e 21 tiveram 12.113/12.113 e zero diferenças, no escopo delas.

**Limites.**
- **macOS**: o `I4-C25m` não rodou em ambiente nenhum.
- **Windows**: os 7 skips do doctor e o `I4-C25l` não rodaram em ambiente nenhum desta rodada. `I4-C15`, `I4-C25b`/`j`/`k` e `I25-C15` são carry do C da R19.
- **Runtime do Hermes**: só no D (Windows). O caso pelo Python do sistema não é runtime do Hermes.
- **Causas**: continuam desconhecidas a do T8-C20 da R21, a do `EPERM` do B do autor e as históricas (CI 93, CI86, T8-C4, o D interrompido de `dc0db9b`). O verde desta rodada é deste computador e não mede o runner da CI.

**Limpeza** (`A.env.txt`, `B.env.txt`, `B-clone-cleanup.txt`, `C.run.txt`, `D.env.txt`, `post-D-checks.txt`):
- as raízes `sm-v22-A`/`B`/`D` foram removidas só pelo registro (caminho real absoluto, filha direta do temporário, nome, pasta não link, mesmo `dev`/`ino`) e estavam ausentes na conferência pós-D;
- o scratch do C foi removido por caminho exato, uid 1000 e inode, e estava ausente depois do D;
- o clone do B, por caminho, toplevel, HEAD e status;
- `runner-temp-A`/`B`/`D`, vazias, por `rmdir`;
- nenhuma seleção por prefixo ou mtime, nenhum auxiliar meu no `/tmp` (Git Bash ou WSL) nem no temporário global. Nada no `RUNNER_TEMP` foi limpo além das minhas pastas vazias. Logs, tar, scripts e a cópia do `.verified.md` anterior ficam em `r22/`.

**Integridade do histórico abaixo.** O texto depois da linha `---` que fecha esta rodada (e da linha em branco seguinte) é, byte a byte, o `.verified.md` do HEAD: blob `2279964`, de `3a15d79`, com 294.533 bytes, sha256 `f9eed58e…` e 0 CR (`r22/verified-integrity.txt`). Nele estão o **FAIL 21**, o **PASS 20**, o **FAIL 19** e os relatórios anteriores, sem rebatizar nenhum resultado.
- O FAIL 21 estava certo para `5a0f231`: o D teve uma falha natural.
- Este PASS 22 é do conteúdo de `2383c52`, que acrescenta a evidência do T8-C20. O D fresco passou, mas isso não muda o FAIL 21 nem o B vermelho do autor em `407edc5`.

---

# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25 (rodada 21)

**Verdict (R21)**: **FAIL — o gate completo D falhou: 1.057 testes, 1.036 pass, 1 fail, 20 skip** (exit 1, término natural). HEAD `5a0f231`, 9 ACs. A falha é o teste antigo `T8-C20 … o exemplo é o que um hook com lock ocupado grava` (`tests/integrations/traces/docs.test.mjs:179`, `ENOENT` ao ler o arquivo de diagnóstico de entrega), sem diff na feature e verde na R20, no pf-D do autor e na CI86. O despacho e o S6/AC6 exigem o gate completo fresco sem falhas, então não há PASS. Não repeti nem corrigi.
- **O que passou (verified at `5a0f231`)**: os 50 checks têm as provas nomeadas verdes. A mudança nova (C48: ramo Windows das integrações com `TEMP`/`TMP` no `RUNNER_TEMP`) confere com a decisão, com o Landing e com as asserções. `npm run test:governance` completo deu **A 27/27/0/0**, **B 27/27/0/0** e **C 27/26/0/1**. Em A e B, o caso nativo do pwsh executou, com os controles de aspas. Em C, o único skip é esse caso, com o motivo do próprio teste. No D, governança 27/27, com os dois `governance-C48` `✔`; motor 16/16; doctor 410/0/7; integrações 583/**1**/13.
- **A falha (T8-C20)**: o hook Claude saiu com 0 e sem saída (`:178` passou), mas o arquivo indicado em `SKILL_ME_CAPTURE_REPORT` não existia na leitura (`:179`). O que **não** se sabe: se a gravação do diagnóstico perdeu a corrida com o prazo, se falhou em silêncio ou se houve outra coisa. A gravação é de melhor esforço até o prazo e engole erros (`delivery-report.mjs:33-45`, `:80`). O log não tem tempos desse hook. **Causa não demonstrada.** Detalhe abaixo.
- **Carry por identidade**: fora de `.checks`/`.tasks`, de `6eb09ef` (R20) ao HEAD só mudaram `.github/workflows/governance.yml`, `scripts/governance-ci.test.mjs` e `code-review.config.json` (override). 246 dos 247 arquivos rastreados em `src`/`tests`/`scripts` têm o mesmo blob. As análises de C1–C47 e o A/B/C cross-platform deles vêm da R20 (`6eb09ef`) e da R19 (`5ee0e0f`), com a identidade registrada. O D desta rodada é novo e rodou tudo no Windows.
- **Gates remotos**: pendentes e obrigatórios. Não executei Action, CI, `review:run`, commit, push nem merge.

**Profile**: light (`AGENTS.md:138`). Rodada 21 sobre a faixa inteira e os 50 checks, com análise nova do C48, da governança e do diff desde a R20. Pelo perfil, não há fault injection, `Coverage`, `Test policy` nem fonte de UI. Não criei mutantes, sondas, testes nem correções. RED, GREEN, sondagens e os mutantes M1–M13, “sem escape” e “só a ASCII dobrada” são **provas do autor** (checklist `:1895-1948` e `:2067-2102`; build, seção nova). Li esses registros, mas não os reexecutei.

**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..5a0f231c854c98cbb535f9f24a5637ddecb3fcf8`, a feature inteira: 144 commits, árvore `1e28decc…`. Desde a R20 (`6eb09ef`, relatório em `86c7677`), entraram:
- `c7e8f14` (registro), `169e845` (workflow + prova), `a50870f`/`c68a392` (gates do autor);
- `0ae77b3` (registro), `0caf9be` (**último código**: só `governance-ci.test.mjs`, o escape do caminho), `9b087dc`/`be29203` (gates do autor);
- `5a0f231` (override 25/light 12 → 13).

**Round**: **21** (light). Base: “Pode fazer quantas precisar” e “Pode fazer a medição comparativa. Mantém os testes e prazos e segue até a CI ficar toda verde para fazer o merge do PR #28”, com o escopo [6467154706](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706), a decisão operacional [6484289722](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6484289722) e o registro 21/13 [6485418583](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6485418583).
- `context-round21.json` (sha256 `868aca78…`): 33 comentários e 9 ACs. O corpo e os comentários 1–31 são idênticos aos de `context-round20.json`. Os novos são o 32 (handoff da CI86) e o 33 (registro 21/13) (`r21/context-config.txt`).
- `roundOverrides["25"]` = `{profile: "light", maxRounds: 13}`. O diff da configuração desde `86c7677` só toca `maxRounds` e `approval` do `25`. Os outros overrides e os perfis globais ficam iguais.
- O `state.json` da revisão tem 12 tentativas (sha256 `7acee6b7…`). A formal 13 é do root, depois deste resultado. Não rodei `review:run`.

**Verifier**: subagente novo e independente (Claude Opus 5.5). Não sou o autor nem o Verifier 20, e não herdei sessão. Produto, testes, apoios, scripts, workflow, planos, configuração e estado ficaram só para leitura. Escrevi este arquivo e os logs/scripts em `.checks/code-review/issue-25/verifier-round21/r21/`, pasta ignorada (`.gitignore:4`). Fora dela, só as raízes próprias dos gates e um arquivo meu na raiz por ~9 s, depois do D (incidente 2, abaixo). Não li `profile-before.json`, `profile-final.json` nem `profile-target-check.json`. De `profile-comparison-final.json`, li só o nível superior.

Data: 28/10/2026 (-03).
- **Plano**: alvo e orçamentos registrados às 22:41–22:43 (`r21/plan.txt`, mais os scripts), antes de qualquer gate.
- **Horários**: A 22:43:11–22:43:26; B 22:43:56–22:44:41; C 22:45:00–22:45:05; D 22:45:29–22:55:59 (10 min 30 s).
- **Estado**: o HEAD foi `5a0f231` do início ao fim. `git status` ficou vazio antes e depois de A e de D, e às 22:57:53. Às 22:57:44–22:57:53, depois do D, apareceu o meu `post-D-checks.txt` não rastreado na raiz (incidente 2). Em B, o status do clone ficou vazio. Em C, a árvore extraída é igual ao `HEAD^{tree}`.

## Fontes lidas (R21)

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md`, `tlc-implement/references/verify.md` | inteiros |
| `.tasks/issue-25-agent-launch.md` | inteiro (771 linhas): critérios 1–42 e refinamentos, a exceção datada ao 40 do AC9 e a nova (`:760-766`), `Sources`, `Unresolved`, a ordem remota e a seção “Ambiente do passo de integrações no Windows” (`:730-771`) |
| `.checks/issue-25-agent-launch.md` | inteiro (2.176 linhas): `Sources` (`:9-43`, com as duas entradas novas `:11`, `:13`), `Out of scope`, `Landing` (`:56-118`, com as linhas novas `:114`, `:115`, `:116`), C1–C50 (C48 `:697-762`), `Swept` (`:872-882`) e `Handoff` (`:884-2176`, com os blocos novos `:1854-2176`) |
| `.checks/issue-25-agent-launch.verified.md` | o topo R20 inteiro (`:1-267`). O resto é histórico, atribuição sem nova execução |
| build (seção nova, `git diff 86c7677..HEAD`), `ci40790722204-handoff.md` (inteiro), `coordinator-ci-temp-path-review.md` (inteiro) | **relato do autor e do coordenador** |
| `context-round21.json` | 33 comentários e 9 ACs, comparado ao contexto 20 por `node -e` |
| `git diff 86c7677..HEAD` | inteiro no código: o workflow (+17/−1) e `governance-ci.test.mjs` (+230/−1). Nos docs, só acréscimos |
| `.github/workflows/governance.yml` e `scripts/governance-ci.test.mjs` | inteiros, no HEAD |
| log da CI86 (`ci86-windows-manual40790906319.log`) | só as linhas `shell:` do runner e o T8-C20 |
| `traces/docs.test.mjs:120-184`, `traces/delivery-report.mjs:1-80`, `traces/binding.mjs:60-84`, `observation.mjs:95-130`, `traces/delivery.mjs:62-104` | depois da falha do D, para o T8-C20 |

## Prova Git (verified at `5a0f231`; `r21/blob-identity.txt`, `r21/c48-structure.txt`)

- **Alterados de `6eb09ef` (R20) e de `86c7677` ao HEAD, fora de `.checks`/`.tasks`**:
  - `.github/workflows/governance.yml`: `474a87b` → `f24e82d`;
  - `scripts/governance-ci.test.mjs`: `bfe5a0c` → `5313dba`;
  - `code-review.config.json`: `e334dc3` → `8c9ada6`, só o override.

  Desde `0caf9be` (último código), só a configuração.
- **Iguais a `6eb09ef` e a `86c7677`**:
  - árvores: `src` `51f0c98`, `tests` `e77a618` (helpers `7931703`, fixtures `6591970`, doctor `bcedb83`), `docs` `d9f546f`, `scripts/code-review` `6b98d7c`;
  - arquivos: `ci-lock-latency.mjs` `8c12894`, `ci-lock-latency.test.mjs` `75eeadd`, `test-integrations.mjs` `22824c4`, `ci-change-filter.mjs`, `ci-result.mjs`, `package.json` `8fd02fa`, `package-lock.json` `9ec32e0`, `.gitattributes`, `.gitignore`, `README.md`, `AGENTS.md` e `CLAUDE.md`.

  Dos 247 arquivos rastreados em `src`/`tests`/`scripts`, 246 têm o mesmo blob de `86c7677`. O outro é `governance-ci.test.mjs`.
- **Core vendorizado**: os 5 arquivos de `scripts/code-review/` têm os mesmos blobs na base e no HEAD (`25e5284`, `c6a4abc`, `1bda8e4`, `216125c`, `b02001e`).
- **Alcance**: o workflow só é lido por `governance-ci.test.mjs` (`:244`, `:318`, `:368`, `:445`) e por `tests/integrations/fixtures-inventory.test.mjs:56-57`. O I4-C47 exige um passo do `verify` com `run === "npm run test:integrations"`, e o ramo dos outros sistemas o mantém literal. O I4-C47 passou no D (`D.log:611`). Nenhum outro executável mudou, então o alvo de A/B/C (governança) e o D completo cobrem o alcance.
- **C48 contra `d0d5a7f`** (`git diff d0d5a7f HEAD -- .github/workflows/governance.yml`). O topo do workflow e os jobs `changes` e `ci` são idênticos. No `verify`, só mudam o `timeout-minutes` (`10` → `${{ matrix.os == 'windows-latest' && 20 || 10 }}`) e a troca do passo de integrações pelos dois ramos. O `lock_diagnostics` entra no fim, inteiro. O workflow só foi tocado por `52b22cd`, `3843867` e `169e845`.

## C48 — análise fresca do workflow e das provas (verified at `5a0f231`)

**Workflow contra a decisão e o Landing `:114`** (`governance.yml:56-72`):

| Exigência | Código | Confere |
| --- | --- | --- |
| outros sistemas: o passo de antes, sem `env`/`shell` | `:56-57` `- if: matrix.os != 'windows-latest'` / `run: npm run test:integrations` | sim |
| Windows: só `if` e `run`, shell padrão (pwsh) | `:63-64`, sem `shell:` nem `env:` | sim |
| `RUNNER_TEMP` ausente, vazio, não totalmente qualificado ou que não é pasta → `throw` antes do npm, sem fallback | `:65-68`: `-not $destino -or -not [IO.Path]::IsPathFullyQualified($destino) -or -not (Test-Path -LiteralPath $destino -PathType Container)` e `throw 'RUNNER_TEMP precisa ser o caminho absoluto de uma pasta existente'` (texto literal do Landing) | sim |
| `TEMP`/`TMP` = esse valor, só no processo do passo e nos filhos | `:69-70` `$env:TEMP = $destino`, `$env:TMP = $destino` | sim |
| o mesmo comando, sem argumento a mais; exit propagado | `:71` `npm run test:integrations`, `:72` `exit $LASTEXITCODE` | sim |
| nada em `GITHUB_ENV`/`GITHUB_PATH`/registro; nada apagado do `RUNNER_TEMP` | nenhuma ocorrência no `run` | sim |
| comentário com o porquê e o limite da medição | `:58-62` | sim |
| orçamentos 20/10/5 e 10, matriz, `ci.needs`, `lock_diagnostics` iguais | `:43`, `:21`, `:79`, `:100`, `:41`, `:76`, `:96-111` | sim |

O runner da CI86 roda os passos Windows como `C:\Program Files\PowerShell\7\pwsh.EXE -command ". '{0}'"` (log `:130`, `:141`, `:182`, `:214`, `:647`). É a forma que o Landing registra e a prova nativa usa.

**Asserções** (`scripts/governance-ci.test.mjs`, blob `5313dba`):

| Exigência do C48 | Asserção (`file:line`) | Erro plausível que ela distingue |
| --- | --- | --- |
| (a) passos depois de `checkout`/`setup-node`, exatos | `:373-379`: `deepEqual(commands.slice(0, -1), [{run: "npm ci --ignore-scripts"}, …, {if: "matrix.os != 'windows-latest'", run: "npm run test:integrations"}])` | `env` nos outros sistemas; passo a mais ou a menos |
| (a) ramo Windows só com `if`/`run` | `:381` `deepEqual(Object.keys(windows).sort(), ["if", "run"])`; `:382` `if` literal | `shell: pwsh -File {0}` ou `env:` |
| (a) um só ramo por sistema da matriz | `:385-399`: só as formas `matrix.os ==/!= '<x>'`, com `[true, false]` em ubuntu/macOS e `[false, true]` no windows | sistema sem integrações ou com as duas |
| (a) a única linha `npm` | `:402-408` `["npm run test:integrations"]` | argumento a mais (`--test-concurrency`, filtro) |
| (a) só `RUNNER_TEMP`/`TEMP`/`TMP`; sem persistência | `:409-418` o conjunto exato; `:419-422` sem `GITHUB_ENV`, `GITHUB_PATH`, `SetEnvironmentVariable`, `setx` | variável extra ou escrita persistente |
| (a) sem `env`/`defaults` no workflow e no `verify` | `:423-426` | `TEMP` no job ou no workflow |
| (a) orçamentos | `:427-433`: `verify` `${{ matrix.os == 'windows-latest' && 20 \|\| 10 }}`, `changes` 5, `ci` 5, `lock_diagnostics` 10 | orçamento alterado |
| (b) o `run` real do YAML, não uma cópia | `:444-450` lê `governance.yml` e acha o ramo pelo `if`; `:499` grava esse `windows.run` em `passo.ps1` e nos dois arquivos com aspas | teste que espelha um script copiado |
| (b) pwsh do PATH, forma do runner, sem perfil | `:453-457` (o 1º `pwsh.exe` do PATH; `t.diagnostic`); `:507-512` `-NoProfile -NonInteractive -Command ". '<arquivo>'"` | outro shell |
| (b) nunca o npm real | `:487-490` `npm.cmd` falso que chama o Node da prova; `:519-522` PATH = `bin` próprio + `System32` | npm real executado |
| (b) válido + npm 0 | `:546-553` `{status: 0, npm: {argv: ["run", "test:integrations"], TEMP: runnerTemp, TMP: runnerTemp, RUNNER_TEMP: runnerTemp, SKILL_ME_SENTINELA: "inalterada"}}`; `TEMP`/`TMP` do pai são pastas distintas (`:466-468`, `:526-527`) | `TEMP` não trocado; argumentos alterados; variável alheia perdida |
| (b) npm 17 → falha 1 | `:556` `{status: 1, npm: received}` | CI verde com falha do npm (M3/M4 do autor) |
| (b) ausente, vazio, relativo, inexistente, arquivo → 1 sem npm | `:557-564` `{status: 1, npm: null}`, com rótulo; o relativo `"runner-temp"` existe no `cwd` do pwsh (`:514`, `:560`) | fallback; validar só com `Test-Path` |
| (b) nada sobrevive ao passo | `:577-580` `GITHUB_ENV`/`GITHUB_PATH` vazios; `:581` `RUNNER_TEMP` só com `sentinela.txt`; `:582` `TEMP`/`TMP` do processo da prova iguais | persistência ou limpeza do `RUNNER_TEMP` |
| 2º acréscimo: literal escapado | `:511` `` `. '${file.replace(/['\u2018\u2019\u201A\u201B]/g, "$&$&")}'` `` | caminho com aspa que fecha o literal |
| 2º acréscimo: dois arquivos com aspas, 0 → 0 e 17 → 1 | `:495-498` `passo ' literal.ps1` e `passo \u2018\u2019\u201A\u201B literal.ps1`; `:565-576` `{status: 0, npm: received}` e `{status: 1, npm: received}` por arquivo, com o nome como rótulo | escape só da ASCII; nomes sem aspa |
| exceção ao C48 no `governance-C1 C3` | `:271-283`: a mesma lista dos cinco `run`, na ordem, sem o ramo identificado pelo `if` literal (`:274`). Fora isso, o diff só acrescenta os dois testes novos no fim; o C49 (`:316-364`) não mudou | lista enfraquecida |

- **Executou**: em A e B, `✔ governance-C48 ramo Windows … no pwsh real` (`A.log:31`, 8,2 s; `B.log:31`) com `ℹ pwsh: C:\Program Files\PowerShell\7\pwsh.exe` (`:32`). As asserções são sequenciais, então todas, inclusive as dos dois arquivos com aspas, rodaram. Em C, `﹣ … # o ramo roda no pwsh do runner Windows; fora dele, só a estrutura (governance-C48 integrações)` (`C.log:31`), e o estrutural `✔`. No D, os dois `✔` (`D.log:34-36`).
- **B com CRLF**: no clone com `core.autocrlf=true`, o workflow saiu `w/crlf` (111 CR) e foi lido e executado igual.
- **O que não provo**: o passo no runner da CI (é da CI do novo HEAD), a causa física das falhas da CI86 e que elas deixam de ocorrer. O D é deste computador. Não alego prova física a partir do C local.

## A falha do gate D — T8-C20 (verified at `5a0f231`; `r21/D.log:1118`, `:1164-1185`)

- **Teste**: `tests/integrations/traces/docs.test.mjs:134-184`, da #8. Blob `d52de03` na base e no HEAD, sem diff na feature.
  - Com o par manual e `SKILL_ME_CAPTURE_REPORT` num arquivo com espaço e acento, um `.lock` alheio (`:173`) e o hook Claude real (`:174-177`), a prova exige o hook com `[0, "", ""]` (`:178`) e depois a linha do diagnóstico igual ao exemplo do guia (`:179-183`).
- **O que saiu**: `:178` passou. Em `:179`, `ENOENT: no such file or directory, open '…\sm-v21-D-9tan2b\skill-me i4 t8 c20 guia ação-JeYAtg\diagnóstico de entrega.ndjson'`. O teste levou 2,90 s; na R20, 1,94 s; no pf-D do autor, 2,33 s. Isso é observação, não causa.
- **Caminho, por leitura**:
  - `captureDeliveryFor` (`binding.mjs:68-84`) entrega pela captura manual e depois `publish` (`:78-82`).
  - `appendDeliveryReport` corre a gravação contra o prazo (`delivery-report.mjs:35-45`), e `appendLine` engole qualquer erro (`:68-80`).
  - O prazo do `flush` é a chamada + `REPORT_DEADLINE_MS` 1.000 ms (`observation.mjs:39`, `:118-122`), e o `settle` da entrega vem antes (prazo de 650 ms com o lock alheio).
  - `delivery-report.mjs` (`42b759b`) e `observation.mjs` (`45192e7`) não mudaram na feature.
  - No caminho, a feature mudou só `binding.mjs` (`7bb3f45`: a leitura do par `SKILL_ME_LAUNCH_*` antes do manual, ausente aqui) e `untilDeadline` (`322bcad`, `delivery.mjs:72-104`). Com o lock alheio o prazo inteiro, antes e depois de `322bcad` a entrega termina no prazo com `lock_present`, e eu não vejo mudança de duração. Isso é leitura, não medição.
- **Não se sabe**: se a gravação perdeu a corrida com o prazo, se falhou em silêncio (código de E/S) ou se algo diferente ocorreu. A prova não usa a pré-carga de tempos, e o log não traz dados do hook. Os dois mecanismos são compatíveis com o código e com o contrato documentado (“o diagnóstico se perde e nada muda para o agente”, que a própria prova cita em `:153`), e nenhum foi demonstrado. Não atribuo a carga, antivírus, disco nem relógio.
- **Histórico**: verde no D da R20 (`verifier-round20/r20/D.log:1115`), no pf-D do autor (`builder-ci86-temp/path-fix/pf-D.log:1118`) e na manual 40790906319 do Windows (`ci86-windows-manual40790906319.log:1243`). Não há `✖ T8-C20` em outro log de `.checks/code-review/issue-25/` (busca por `✖ T8-C20`). O único registro anterior de falha dele é da #8 (`issue-8-traces.build.md:1337-1341`): duas falhas do `Proof:` num sandbox local, com **outro sintoma** (`start: io_failure` na criação da captura), atribuídas pelo autor da #8 ao acesso do sandbox. Não é o sintoma desta rodada.
- **Tratamento**: FAIL registrado, sem repetição, sem correção e sem reclassificação. A decisão do que fazer é do root e do proprietário.

## Execuções — verified at `5a0f231`

A ordem foi A, B, C e D, em sequência, cada um uma vez, sem filtro e sem repetição. O alvo e os orçamentos foram registrados antes (`r21/plan.txt`).
- **Forma comum**:
  - `RUNNER_TEMP` numa pasta própria, vazia antes e com 0 entradas depois;
  - temporário dos testes numa raiz própria `sm-v21-<rótulo>-…`, criada por `mkdtemp` e registrada (caminho real, `dev`, `ino`), só no `TEMP`/`TMP` do processo do gate (A, B, D) ou no `TMPDIR` do scratch (C);
  - `npm_execpath` ausente;
  - `npm_config_update_notifier=false` no processo do gate, para o npm não consultar a rede. Isso não muda nenhuma asserção.
- **PATH de A, B e D**: `C:\Program Files\PowerShell\7` na frente. É o pwsh oficial, o mesmo caminho do runner. Sem isso, o 1º `pwsh.exe` do PATH da sessão seria o do runtime do Codex.
- **Scripts** (escritos por mim): `isolated-root.mjs`, `run-gov.sh`, `make-clone-B.sh`, `remove-clone-B.sh`, `wsl-run.sh`, `run-npm-test.sh`, `matrix.mjs` e `d-summary.mjs`.

| # | Ambiente | Resultado |
| --- | --- | --- |
| A | Windows 11, checkout principal, Node **v24.22.1** (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1; workflow e teste iguais aos blobs do HEAD. 22:43:11–22:43:26 | `npm run test:governance`: **27 testes, 27 pass, 0 fail, 0 skip**, exit 0. O caso nativo **executou** (`A.log:31-32`). Status vazio antes e depois; `RUNNER_TEMP` com 0 entradas. Raiz `sm-v21-A-uF9C8U` (1 entrada dos testes) conferida e removida pelo registro |
| B | **Clone git novo** em `r21/B-clone` (`--no-hardlinks --no-checkout --config core.autocrlf=true`, sem rede; o `gitconfig` do sistema já tinha `true`; nada global mudou), HEAD `5a0f231`, árvore `1e28decc…` conferidos. Node **v24.13.0 oficial**: zip `ca274269…` igual à linha do `SHASUMS256.txt`, `node.exe` `d14ba95c…` igual ao do zip; npm **11.6.2** adjacente. `cli.mjs` `i/lf w/lf attr/text eol=lf`, **0 CR antes e depois**; workflow, `governance-ci.test` e `ci-lock-latency.test` `i/lf w/crlf`. Status vazio antes e depois do `node_modules` copiado. 22:43:56–22:44:41 | **27: 27 pass, 0 fail, 0 skip**, exit 0. O caso nativo **executou** (`B.log:31-32`). Status do clone vazio depois. Raiz `sm-v21-B-6q6vzu` (1 entrada) removida pelo registro. O clone foi removido pelo caminho exato, depois de conferir pasta não link, toplevel, HEAD e status vazio (`B-clone-cleanup.txt`) |
| C | WSL `Ubuntu`, `oldboydev`, uid 1000. `git -c core.autocrlf=false archive` do HEAD: 6.451.200 bytes, sha256 `ad854885…`, `get-tar-commit-id` = `5a0f231…`. Árvore extraída `1e28decc…` = `HEAD^{tree}` (git com `HOME` do scratch e `GIT_CONFIG_NOSYSTEM`); 0 CR em `src/`, `tests/`, `scripts/` e `.github/`; `cli.mjs` 755. Node **v24.13.0** copiado de `/usr/bin/nsolid` (`150946e4…`, igual) num prefixo `node npm npx`, **sem `sh`**; npm 11.6.2. `env -i` só com `HOME`, `LANG`, `PATH`, `RUNNER_TEMP`, `TMPDIR` e `npm_config_update_notifier`. `PATH` = prefixo + `tools` (links para `/usr/bin/{sh,git,python3,id,grep,mkfifo}`), **sem `/usr/bin`**, sem `codex`/`claude`/`hermes`/`gemini`/`pwsh`. 22:45:00–22:45:05 | **27: 26 pass, 0 fail, 1 skip**, exit 0. O skip é o caso nativo, com o motivo do teste. Os 18 `C50` (inclusive a supervisão real de filhos) e o `governance-C49` rodaram. `RUNNER_TEMP` com 0 entradas. Scratch `/tmp/sm-v21-C.sEvW3y` removido pelo caminho exato, pasta não link, uid 1000 e inode 11462 |
| D | `npm test`, sem argumentos, no checkout principal: Windows, Node v24.22.1, npm 11.19.1, Python 3.12.10, `SKILL_ME_HERMES_PYTHON` ausente, `availableParallelism` 32 → `MAX_PARALLEL_FILES = 8`. O script recusa começar com o checkout sujo; estava limpo. Orçamento de **2 h** (7.200.000 ms), definido no plano e passado à ferramenta. 22:45:29–22:55:59 | **1.057 testes: 1.036 pass, 1 fail, 20 skip**, **exit 1**, terminado sozinho. Por suíte: governança 27/27/0/0, motor 16/16/0/0, doctor 417/410/0/7, integrações 597/583/**1**/13. HEAD igual e status vazio antes e depois; `RUNNER_TEMP` com 0 entradas. Raiz `sm-v21-D-9tan2b` (128 entradas dos testes) removida pelo registro |

**Nomes de A/B/C** (`r21/matrix-ABC.txt`): os 27 nomes de topo são iguais nos três e sem duplicado. São 9 `governance-…` e 18 `C50 …`. Há 26 `pass` em cada; o caso nativo é `pass` em A e B e `skip` em C.

**D** (`r21/D-summary.txt`, comparado nome a nome com `verifier-round20/r20/D.log`):
- **Contra a R20**: as linhas novas são os dois `governance-C48` `✔`. A única linha da R20 que não se repete é `✔ T8-C20 … o exemplo é o que um hook com lock ocupado grava`, que agora é `✖`. Nenhuma outra mudou de marca nem sumiu.
- **Nomes por check**: cada prefixo de `I25-C1 ` a `I25-C47 ` tem ao menos um `✔`, salvo `I25-C6` e `I25-C15`, que no Windows só têm skip.
  - Somam 28 `I25-C46` (7 `evidência comum`, 8 `prazo da entrega`), 6 `I25-C47`, 9 `T8-C16`, 3 `I4-C16`, `I4-C17`, `I4-C35`, `I4-C36`, `I4-C47`, 7 `I23-C4`, `I23-C10` e `T8-C2`/`C3`/`C8`/`C12`/`C13`/`C14`/`C15`/`C18`, todos `✔`.
  - Os 9 `governance-…` e os 18 `C50` também passaram, com `RUNNER_TEMP` presente.
- **Hermes** (`r21/D-hermes.txt`):
  - os **11 nativos com runtime** passaram: `I4-C18`–`C23`, `C37`, `C44b`, `I25-C40 harness nativa` e os dois `I23-C8` com runtime (`D.log:622-631`, `:633`);
  - o **ramo Hermes do `I4-C35`** passou (`:1077`), sem `observação Hermes não executada` nem `hermes-runtime-ausente` no log;
  - o `I23-C8 … pelo Python do sistema` (`:632`) passou, mas não é runtime do Hermes.

  A CI não tem o runtime do Hermes; lá os nativos não rodam.
- **Skips (20)**: os mesmos da R20 em nomes e motivos.
  - **Doctor (7)**, POSIX/FIFO: não rodaram em ambiente nenhum.
  - **Integrações (13)**: `I4-C15`, `I4-C25b`/`j`/`k`, `I25-C5`/`C6`/`C15`/`C33`/`C42`/`C45` POSIX e `T8-C4` são **carry do C da R19** (`5ee0e0f`), com os blobs iguais. `I4-C25m` (macOS) e `I4-C25l` não rodaram em ambiente nenhum.
- O D é Windows. Não o chamo de POSIX nem de macOS porque o C passou.

## Checks — provas nomeadas: 50/50; gate completo: FAIL

Fonte da prova:
- **D21**: o nome real passou no D fresco desta rodada.
- **G21**: fresco em A, B, C e D (governança).
- **R19/R20**: A/B/C cross-platform carregados por identidade de blob (`5ee0e0f`/`6eb09ef`).

As citações dos arquivos sem diff são as da R20, com as mesmas linhas, porque os blobs são iguais. As de `governance-ci.test.mjs` foram renovadas no HEAD.

| Check | Asserção decisiva (`file:line` no HEAD) | Prova | Result |
| --- | --- | --- | --- |
| C1 | `command.cli:48-49` `private`/`bin`; `:65` `[0, SKILL_ME_HELP, ""]`; `:77` `gitStatus() === before` | D21; ABC R19 (B em clone `autocrlf=true`). O B desta rodada conferiu de novo o bin LF/0 CR antes e depois | provado |
| C2 | `command.cli:96-98` `argv: LITERAL_ARGS` | D21; ABC R19 | provado |
| C3 | `command.cli:105` `{0: 0, 7: 7}` | D21; ABC R19 | provado |
| C4 | `command.cli:130-133` 127 `launcher_requires_shell`; `agent.unit` `I25-C4` | D21 (3 `✔`); ABC R19 | provado |
| C5 | `command.cli:228` POSIX; `:244-245` `CTRL_C_EVENT` → `["SIGINT"]` | console em D21; POSIX em C R19 | provado |
| C6 | `command.cli:267` `signals: ["SIGTERM"]` | C R19 (skip POSIX no D) | provado |
| C7–C14 | `prepare.cli:93-94`, `:122-126`, `:163-168`, `:189-191`, `:200`, `:223`, `:238`, `:250` | D21; ABC R19 | provado |
| C15 | `prepare.cli:408` (pty) | C R19 (skip no D) | provado |
| C16–C23 | `session.e2e:67`, `store.unit:79`, `session.e2e:111`, `:161`, `:190-192`, `:208-211`, `:230`, `:282` | D21; ABC R19 | provado |
| C24 | `store.unit:168` | D21; ABC R19 | provado |
| C25–C28 | `end.e2e:80-89`, `:101-109`, `:120` (e `store.unit` `I25-C27`), `:164-165` e `:194` `["EIO"]` | D21; ABC R19 | provado |
| C29–C31 | `command.cli:278`, `:342`; `end.e2e:205-215` | D21; ABC R19 | provado |
| C32 | `end.e2e:320`; `store.unit:715` | D21 (9 `✔`); ABC R19 | provado |
| C33 | `end.e2e:460`; `:493-494` (arranjo POSIX) | D21; arranjo em C R19 | provado |
| C34–C35 | `report.cli:159`, `:252-259` | D21; ABC R19 | provado |
| C36–C38 | `command.cli:350`; `docs.test:82` (os limites); `prepare.cli:355` | D21; ABC R19 | provado |
| C39–C40 | `hermes-harness.unit:90`; `:220`, `:320`, `:324`, `:327`; nativo `hermes-plugin.native:336` | D21 (os 11 nativos, `harness nativa`, `fixture do plugin`); ABC R19 | provado |
| C41–C45 | `store.unit:327-523`, `end.e2e:518`; `agent.unit` `I25-C42`, `command.cli:456`/`:424`; `store.unit:598`; `hermes-harness.unit:288`, `:291`; `agent.unit:132-146`, `command.cli:166-186` | D21 (17, 3, 12, 3, 2 `✔`); POSIX em C R19 | provado |
| C46 | T8-C15 `concurrency.cli:220`, `:234`, `:256`; (a)–(c) `:283`–`:360`; (d)–(g) `live-capture:341`, `:348`, `:356`, `:367`, `replay.unit:161`, `:100`; (h) `live-capture:227-248`; (i) `follow.cli:195`, `:203-206`; (j) `:215`, `:225-236`; (k) `evidence.unit:54-148`; (l) `failure-matrix.cli:116-119`; (m) `evidence.unit:254-263` e `:287-298` (`:297` `processo 3 de 3`); (n) `:303-305`, `:312`; (o) `delivery.unit:52-113`; (p) `concurrency.cli:956-1018`, T8-C16 `:920-928`; (q) `codex-run.cli:289-348` | D21 (28 `I25-C46`, 9 `T8-C16`, T8-C2/C3/C8/C12/C13/C14/C15/C18 e o controle positivo do C46 em `concurrency.cli:1008`); ABC R19/R20 | provado |
| C47 | I23-C10 `agents.e2e:315`; (a) `:427`, `:429`; (b) `:442`, `:444`; (c) `control.cli:1071-1077`; (d) `:1097-1105`; `evidence.unit:150-225` | D21 (6 `✔`, 7 `I23-C4` incluindo `:547` e `:906`); ABC R19/R20 | provado |
| **C48** | estrutura contra `d0d5a7f` (acima); `governance-ci:373-433` (estrutural), `:444-582` (nativo), `:511` (escape), `:565-576` (aspas); `governance-C1 C3` `:271-283` | **G21**: A/B executado, C estrutural + skip com motivo, D os dois `✔` | **provado (fresco)** |
| C49 | `governance-ci:322-329` (chaves do job), `:330-334`, `:337-348` (mesmos `uses`, `persist-credentials: false`, Node 24.13.0 sem cache, os dois comandos), `:350-356` (`ci.needs`, sem `needs`/`continue-on-error`), `:359-362` (`test:governance`); `:299-304` (jobs = os quatro) | **G21** | **provado (fresco)** |
| C50 | `ci-lock-latency.test:127` (percentis/faixas exatos), `:68` e `:137` (sem amostras), `:160-161`, `:187` (caminhos/fases), `:190-215` (E/S), `:217-240` (teto, término parcial), `:247` (protocolo), `:250-303` (limpeza; `:303` `{removidas: 2, recusadas: [], falhas: ["EBUSY"]}`), `:315-373` (início parcial `EEXIST`, erro assíncrono `ENOENT`), `:377` (fronteira real 15/15), `:393-396` (relatório), `:406-434` (fonte do `RUNNER_TEMP`), `:443` (constantes 3/500/3/65.536/120.000) | **G21**: 18 `✔` em A, B, C e D, com `RUNNER_TEMP` presente | **provado (fresco)** |

- **Critérios não reduzidos**: as constantes do contrato estão no código sem diff:
  - `DELIVERY_DEADLINE_MS = 750` e `ATTEMPT_MS = 750 − 100` (`traces/delivery.mjs:12`, `:17-18`);
  - `HOOK_STDIN_DEADLINE_MS = 2000` (`hook-command.mjs:7`);
  - a faixa 1.900 ≤ ms < 6.000 do I4-C36 (`failure-matrix.cli:83`, `:119`);
  - `settleMaxMs`, com padrão 5.000 (`settle.py:41`; `hermes-harness.unit:213`);
  - `PRIVACY_LIMITS` 500 eventos/8 MiB (`privacy/lifecycle.mjs:5`);
  - `MAX_PARALLEL_FILES = 8` (`test-integrations.mjs:14`).

  Testes funcionais, eventos, payloads, contagens, argumentos, perdas, retry e concorrência estão nos blobs iguais. O diff de `governance-ci.test` só acrescenta testes e adapta o filtro da lista do C1 C3, como a exceção fixa. Os jobs 20/10/5 e o manual 10 são afirmados em `:427-433`.
- **AC → checks** (9 ACs): AC1–AC6 com C1–C45; AC7 com C46; AC8 com C47 e C48; AC9 com C49 e C50. **O gate completo exigido no AC6/S6 e no despacho falhou** (T8-C20). A execução remota da medição e os cinco checks regulares continuam como condição de merge.

## Swept `existing` (carry R20/R19; `src` igual)

As linhas são as da R19 e da R20, com os blobs iguais:
- idempotência: `privacy/lifecycle.mjs:23-24`;
- sem reenvio: `traces/delivery.mjs:57`, `:123`;
- falha de entrega não bloqueia: `traces/delivery.mjs:156`;
- `privacy prune`: `privacy/command.mjs:56-57`.

## Observações (não bloqueantes; nada corrigido)

- **O1 — prefixo e sufixo do runner fora da prova nativa.** O runner acrescenta `$ErrorActionPreference = 'stop'` antes e `if ((Test-Path -LiteralPath variable:\LASTEXITCODE)) { exit $LASTEXITCODE }` depois de cada script `pwsh`. A prova (`:499`, `:507-512`) roda só o `run` pela forma `-Command ". '<arquivo>'"`, que é a que o C48 (b) fixa.
  - Pela leitura, nos casos afirmados o resultado não muda. O `throw` já encerra o script, e o `exit $LASTEXITCODE` encerra antes do sufixo. Com a preferência `stop`, um npm 17 que virasse erro terminante sairia 1 do mesmo jeito.
  - A sondagem do autor com o prefixo e o sufixo deu os mesmos códigos (checklist `:1901-1902`). Isso é atribuído ao autor, não executado por mim.
  - Um caso fora do contrato (npm ausente no PATH) daria 1 no runner por causa do `stop` e não é exercitado pela prova. É só nota.
- **O2 — anteriores**: as observações O1–O2 da R20, as O1–O3 da R19 e as O2–O5 da R17 continuam como estão. O código delas não mudou.

## Gates remotos — pendentes e obrigatórios (nenhum ocorreu aqui)

Com este FAIL, a ordem aprovada não avança daqui:
1. PASS de uma verificação independente;
2. formal 13;
3. publicação;
4. **uma** execução manual com a medição nos padrões originais;
5. os **cinco checks regulares verdes** nas matrizes PR e manual do HEAD aprovado;
6. o merge, já autorizado só com tudo isso.

Pelo registro 21/13, o HEAD publicado continua `86c7677`. O PR 40790722204 verde e a manual 40790906319 vermelha no Windows e no agregado ficam **como história**. A medição saudável de `86c7677` não cumpre a do novo HEAD. Não disparei nada e não declaro verde nenhuma CI futura.

## Processo, limites e limpeza da R21

**Executado.**
- **git**, só de leitura: `rev-parse`, `status`, `log`, `diff`, `ls-files --eol`, `grep`, `check-ignore`, `merge-base`, `hash-object` e `get-tar-commit-id`. Também:
  - `git -c core.autocrlf=false archive` do HEAD para `r21/head.tar`;
  - um `git clone --no-hardlinks --no-checkout --config core.autocrlf=true` do repositório local, sem rede, com a configuração só no clone.
- **Leitura**: `node` só de leitura (contexto, config, logs, auditoria), `sha256sum`, `python -I` (sha do zip oficial e CR) e `stat`. Depois do D, uma consulta `Get-CimInstance Win32_Process` pelo Windows PowerShell 5.1 (`powershell.exe -NoProfile`, com `POWERSHELL_TELEMETRY_OPTOUT=1`), filtrada por `node`/`pwsh`/`python`/`cmd` com o repositório ou `sm-v21` na linha de comando: nenhum processo.
- **Gates**: A, B, C e D, uma vez cada, sem repetição. O WSL foi chamado com `wsl.exe -d Ubuntu -u oldboydev --exec /bin/bash --noprofile --norc` e `MSYS_NO_PATHCONV=1`. Fora do gate, só versões e caminhos de sistema, nada do perfil.
- **Modo do D**: o orçamento de 2 h só é aceito com `run_in_background`, e usei esse modo só por isso. Esperei o término real com um laço em primeiro plano que lia só `r21/D-run.txt`. Durante o D não rodei nada que tocasse o checkout. A ferramenta guardou a própria cópia da saída (`…\tasks\buct0y8ha.output`); não a li nem apaguei.

**Incidentes meus** (`r21/incidents.txt`):
1. **pwsh sem opt-out (22:41)**. Numa listagem de ferramentas, antes dos gates, o comando incluiu por engano `"/c/Program Files/PowerShell/7/pwsh.exe" -? >/dev/null 2>&1`. Isso iniciou uma vez o pwsh oficial com o ambiente da sessão, sem `POWERSHELL_TELEMETRY_OPTOUT`/`POWERSHELL_UPDATECHECK`. O eco seguinte (“não executei pwsh”) estava errado. Nenhum conteúdo do repositório foi passado. Não verifiquei se houve telemetria ou checagem de versão e não afirmo que não houve. Foi o único pwsh fora das provas versionadas, cujo filho desliga as duas coisas.
2. **Arquivo na raiz do checkout (22:57:44–22:57:53)**. Depois do fim real do D (22:55:59), a conferência pós-D gravou `post-D-checks.txt` na raiz do checkout em vez de `r21/` (diretório atual errado). Conferi que era o meu (regular, não link, carimbo meu) e o movi para `r21/`. O status voltou a vazio. Não alcançou nenhum gate, e nenhum rastreado mudou.

**Não executado.**
- RED, mutantes, sondas, testes novos e a sondagem do pwsh do autor (com o prefixo e o sufixo).
- Agentes reais, `--help`/`--version` de agente, perfis, credenciais, banco, modelo, rede (salvo o incidente 1), relógio do host, antivírus, Git global, TEMP global e runtimes fora das provas. O Hermes real rodou só pelas provas nativas versionadas do D.
- Actions, CI, `review:run`, commit, push, PR, merge, alteração de limites e subagentes.
- **Os 43 arquivos de integração da lista da R19 em A/B/C** não rodaram aqui. São carry com os blobs iguais: 42 da R19 (`5ee0e0f`) e `evidence.unit` da R20 (`6eb09ef`). O D desta rodada os rodou no Windows. Os skips POSIX do D também não rodaram aqui; são carry do C da R19.
- **Incidentes anteriores**: o incidente da R5 (`ffc5937`: até 5 inícios do Codex no WSL e 12 mtimes sem linha de base de conteúdo) não foi desfeito nem repetido. A limpeza antiga (1.257 pastas no Windows e 107 no WSL, por prefixo/tipo/janela, sem prova de proveniência, sem os nomes do Windows) e os dois auxiliares `/tmp/d4.skips`/`/tmp/d-old.skips` no temporário global do Windows, sem inventário anterior, ficam como estão. Também fica o incidente de telemetria do autor (checklist `:1956-1961`). Não li, apaguei nem restaurei nada disso, e não afirmo impacto zero.

**Auditoria externa 21 (do root, só metadados do perfil WSL).** `../profile-comparison-final.json` foi gravado pelo root às 22:56:56, depois do fim do meu D (22:55:59). Eu o li às 22:58:06, só no nível superior (`r21/profile-summary-external.txt`), sem abrir `profile-before.json`, `profile-final.json`, `profile-target-check.json` nem listas de entradas:
- **escopo declarado**: “External metadata-only audit from the Round20 final snapshot before the CI-temp author through completion of independent Round21 proofs; not a content audit, not temporary-file provenance, or undo for Round5”;
- **janela**: linha de base às 20:41:38 (-03), o fechamento da R20, que inclui a formal 12 e todo o autor; fechamento às 22:56:55 (-03);
- **resultado**: `baselineEntries` 12.113, `afterEntries` 12.113, e `errors`, `added`, `removed` e `modified` vazios.

É resultado externo do root, não meu. Pelo escopo que ele declara, não é auditoria de conteúdo, de temporários, do Windows nem de configuração global, e não desfaz a R5.

**Limites.**
- **macOS**: o `I4-C25m` não rodou em ambiente nenhum.
- **D no Windows**: os 7 skips do doctor e o `I4-C25l` não rodaram em ambiente nenhum.
- **Runtime do Hermes**: só no D.
- **C desta rodada**: só a governança.
- **Causas**: as históricas (CI 93, CI86, T8-C4, o D interrompido de `dc0db9b`) e a do T8-C20 deste D continuam desconhecidas.

**Limpeza** (`A-run.txt`, `B-run.txt`, `B-clone-cleanup.txt`, `C.run.txt`, `D-run.txt`, `post-D-checks.txt`):
- as raízes `sm-v21-A`/`B`/`D` foram removidas só pelo registro (caminho real absoluto, filha direta do temporário, nome, pasta não link, mesmo `dev`/`ino`), e estavam ausentes na conferência pós-D;
- o scratch do C foi removido por caminho exato, uid 1000 e inode;
- o clone do B, por caminho, toplevel, HEAD e status;
- `runner-temp-A`/`B`/`D`, vazias, por `rmdir`;
- nenhuma seleção por prefixo ou mtime, e nenhum auxiliar no `/tmp` (Git Bash ou WSL) nem no temporário global. Logs, tar, scripts e a cópia do `.verified.md` anterior ficam em `r21/`;
- nenhum processo meu ficou vivo, e nenhum alheio foi encerrado.

**Integridade do histórico abaixo.** O texto depois da linha `---` que fecha esta rodada (e da linha em branco seguinte) é, byte a byte, o `.verified.md` de `86c7677`, o mesmo no HEAD: blob `444a2e2`, 256.130 bytes, sha256 `e8708e83…`, 0 CR (`r21/verified-integrity.txt`). Nele estão o **PASS 20** (50/50 em `6eb09ef`), o **FAIL 19** e os relatórios anteriores, sem rebatizar nenhum resultado.
- O PASS 20 estava certo para `6eb09ef`.
- Este FAIL 21 é do conteúdo de `5a0f231`. A mudança nova (C48) está provada, mas o gate completo fresco teve uma falha.

---

# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25 (rodada 20)

**Verdict (R20)**: **PASS — 50/50 checks provados como escritos**, 9 ACs, HEAD `6eb09ef`. O F1 da R19 (C46 (m)) está resolvido pela prova nova da 3ª linha, com valores literais. O caso da 1ª linha continua intacto, como controle. Nenhum gate fresco falhou, e o produto não mudou desde `322bcad`.
- **F1 da R19 resolvido (verified at `6eb09ef`)**: o teste novo `I25-C46 evidência comum: com o pendente e o pid do lock na 3ª das 3 linhas do arquivo do registro, …` (`tests/integrations/traces/evidence.unit.test.mjs:270`) grava o pendente e o `pid` 3003 só na 3ª linha (`:279`). A asserção decisiva é literal: `assert.ok(failure.message.includes("raiz 1 (produtores 1, 2): lock presente, de produtor 1 wrapper codex, processo 3 de 3;"), failure.message)` (`:297`). As outras exigências do (m) estão em `:287-291`, `:293`, `:294`, `:296` e `:298` (tabela F1). O teste rodou e passou em A, B, C (`ok 8`, TAP `:45`) e em D (`D.log:1123`, `✔`).
- **Gates frescos (verified at `6eb09ef`)**, um de cada, em sequência, sem filtro e sem repetição:
  - **A** (Windows, Node 24.22.1, checkout principal): `evidence.unit.test.mjs` inteiro, **9 testes, 9 pass, 0 fail, 0 skip**, exit 0;
  - **B** (clone git novo, Node 24.13.0 oficial, npm 11.6.2 adjacente, `core.autocrlf=true` só no clone): **9/9/0/0**, exit 0;
  - **C** (WSL isolado, Node 24.13.0 copiado, `env -i`, sem `/usr/bin` no PATH, árvore exata do HEAD): **9/9/0/0**, exit 0;
  - **D** (`npm test` completo, Windows, Node 24.22.1, runner padrão com teto 8): **1.055 testes, 1.035 pass, 0 fail, 20 skip**, exit 0. Por suíte: governança 25/25, motor 16/16, doctor 417 (410/0/7) e integrações 597 (584/0/13). Os 11 nativos do Hermes com runtime e o ramo Hermes do I4-C35 passaram; o caso pelo Python do sistema também passou, mas não conta como nativo.
- **Carry explícito da R19 (carried from `5ee0e0f`; produto `322bcad`, harness `68f84c4`)**: os outros 42 arquivos da lista independente de 43 (sha256 `e26c5163d3eb1364852fbcbca381bb4ede3cefac3a0501f71347f07e66ad74d9`) têm o mesmo blob no HEAD. Lá, A e B deram 365/353/0/12 cada e C deu 365/345/0/20. **Não reexecutei esses 42 em A/B/C** e não afirmo que rodaram de novo. O D desta rodada é novo e roda tudo, inclusive esses 42, no Windows.
- **Carry cross-platform da governança (carried from `8f045c2`, R16)**: os 13 arquivos do fecho de imports de `governance-ci.test`/`ci-lock-latency.test` são iguais desde a R16, que rodou a governança em A/B/C com `RUNNER_TEMP` presente (25/25/0/0 em cada). Governança, C49 e C50 rodaram frescos aqui só em D.
- **Causas** das falhas da CI 93 (I23-C4, T8-C12, T8-C13, T8-C2), do T8-C4 e do D de `dc0db9b`, **interrompido pelo coordenador**: **continuam desconhecidas**. Esta rodada não as demonstra.
- **Gates remotos**: pendentes e obrigatórios. Não executei nenhuma Action, CI, `review:run`, commit, push ou merge.

**Profile**: light (`AGENTS.md:138`). Rodada 20 sobre a faixa inteira e os 50 checks, com foco novo em F1 e no diff desde a R19. Pelo perfil, não há fault injection, `Coverage`, `Test policy` nem fonte de UI. Não criei mutantes, sondas, testes nem correções. A prova discriminante (cópia própria com o mutante “sempre `processo 1 de n`”: 8 pass/1 fail) e o GREEN são **prova do autor** (`.checks/issue-25-agent-launch.md:1688-1706`; build `:2536-2544`). Li os registros, mas não reexecutei. Esse mutante não é defeito de produto nem execução minha.
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..6eb09ef3be1788742a901db99d9ab4420a8fcb06`, a feature inteira: 134 commits, árvore `662f1a7f…`. Desde a R19 (`5ee0e0f`), entraram 5 commits:
- `67a459b`: relatório R19 preservado;
- `0954d3e`: plano e proveniência, antes do código;
- `2473632`: a prova. É o **único commit executável**: só `tests/integrations/traces/evidence.unit.test.mjs`, +34/−0;
- `8dee56d` e `6eb09ef`: registros dos gates do autor.

**Round**: **20** (light). Base: as autorizações “Pode fazer quantas precisar” e “Pode fazer a medição comparativa. Mantém os testes e prazos e segue até a CI ficar toda verde para fazer o merge do PR #28”, com o escopo [6467154706](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706) e o registro 20 em [6483312198](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6483312198).
- O registro 20 é o 31º comentário de `context-round20.json` (sha256 `4a0eec1d…`). O corpo e os comentários 1–30 são idênticos aos de `context-round19.json`, e o corpo tem 9 ACs (`r20/context-check.txt`). A exportação não traz as URLs; o número vem do despacho.
- As 19 verificações e as 11 tentativas formais ficam preservadas. O `state.json` da revisão teve sha256 `60c8e429…` antes e depois das execuções.
- `roundOverrides["25"].maxRounds` continua 12. O blob da configuração, `e334dc3`, é o mesmo de `5ee0e0f`. A formal 12 já está autorizada, não foi usada e é do root, depois deste resultado. Não rodei `review:run`.

**Verifier**: subagente novo e independente (Claude Opus 5.5). Não sou o autor nem o Verifier 19, e não herdei sessão. Produto, testes, apoios, scripts, workflow, planos, configuração e estado ficaram só para leitura. Escrevi apenas este arquivo e os logs/scratches em `.checks/code-review/issue-25/verifier-round20/r20/`, uma pasta ignorada (`.gitignore:4`). Fora dela, só as raízes próprias dos gates (seção Processo). Não li `profile-before.json` nem `profile-final.json`. Não toquei nos `profile-*` do root. De `profile-comparison-final.json`, li só o resumo de nível superior.

Data: 28/10/2026 (-03).
- **Plano**: lista e orçamentos registrados às 20:27:22 (`r20/plan.txt`, `gate-files-r20.txt`), antes de qualquer gate.
- **Horários**: A 20:28:34–20:28:40; B 20:28:59–20:29:05; C 20:29:19, com início e fim no mesmo segundo pelo relógio do WSL; D 20:29:43–20:40:11.
- **Estado**: o HEAD foi `6eb09ef` do início ao fim. `git status --porcelain=v1 -uall` ficou vazio no início, antes e depois de A, antes e depois de D e no fim, antes de gravar este arquivo. Em B, o status do clone ficou vazio; em C, a árvore extraída é igual ao `HEAD^{tree}`.

## Fontes lidas (R20)

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md`, `tlc-implement/references/verify.md` | inteiros. Não há `CONTRIBUTING` fora de `node_modules`/runtime vendorizado (R19) |
| `.tasks/issue-25-agent-launch.md` | inteiro (728 linhas): critérios 1–42, os refinamentos do 32, 38 (com o novo, `:392-397`), 39 e 42, a exceção datada ao 40, `Sources`, `Unresolved` e o registro da ordem remota |
| `.checks/issue-25-agent-launch.md` | inteiro (1.790 linhas): `Sources` (`:9-39`), `Landing` (`:52-111`, com a linha nova `:109`), C1–C50 (C46 `:416-634`, com (m) em `:555-558` e o refinamento F1 em `:616-634`), `Swept` (`:810-820`) e `Handoff` (`:822-1790`, com o bloco novo `:1610-1790`) |
| `.checks/issue-25-agent-launch.verified.md` (blob `2e48980`, de `67a459b`) | o relatório R19 inteiro (topo, 378 linhas). O histórico anexado (blob `1dd923d`, 164.557 bytes) entra como atribuição, sem nova execução |
| build e handoff `ci40728221657` | só os blocos novos: build `:2496-2589`, handoff `:156-187`. São **relato do autor** |
| `coordinator-r19-observations.json` | inteiro (nota de proveniência) |
| `context-round20.json` | 31 comentários e 9 ACs; comparado ao contexto 19 por `node -e` |
| `git diff 5ee0e0f..HEAD` | inteiro no código: a prova nova. Nos docs, contagem de linhas e trechos; só acréscimos (0 linhas removidas em checklist, task, build, handoff e `.verified.md`) |
| apoio `helpers/traces.mjs` (sem diff) | `treeOf` e `describeRecording` (`:548-580`), para conferir que a expectativa não repete o cálculo |
| scripts e logs da R19 (`verifier-round19/r19/`) | só como referência de método e fonte do carry. **Não** são prova desta rodada |

## Prova Git (verified at `6eb09ef`; `r20/blob-identity.txt`)

- **Único arquivo executável alterado desde a R19**: `tests/integrations/traces/evidence.unit.test.mjs`, `26b8410` → `6ccbf48`, +34/−0. O teste novo entra depois do caso da 1ª linha, e nenhuma linha antiga muda.
- **Iguais a `5ee0e0f`**:
  - as árvores `src` (`51f0c98`), `tests/integrations/helpers` (`7931703`), `tests/integrations/fixtures` (`6591970`), `tests/doctor` (`bcedb83`), `scripts` (`05923f9`, com o core), `.github` (`d9ee0d8`) e `docs` (`d9f546f`);
  - os arquivos `package.json` (`8fd02fa`), `package-lock.json` (`9ec32e0`), `code-review.config.json` (`e334dc3`), `.gitattributes` (`7772ad3`), `.gitignore` (`ef05461`), `README.md`, `AGENTS.md` e `CLAUDE.md`.
- **Lista da R19** (`verifier-round19/r19/gate-files.txt`, sha256 `e26c5163…74d9`, 43 arquivos): **42 com o mesmo blob**; só `evidence.unit` difere.
- **Core vendorizado**: os 5 arquivos de `scripts/code-review/` têm os mesmos blobs na base e no HEAD (`25e5284`, `c6a4abc`, `1bda8e4`, `216125c`, `b02001e`).
- **Alcance**: nenhum arquivo importa a prova alterada. `git grep "evidence.unit"` fora de `.checks`/`.tasks` só acha `contract-evidence.unit.test.mjs`, outro arquivo, citado no manifesto de fixtures do doctor. A prova não é apoio nem fixture: é uma folha que já estava na lista de 43.
  - As condições do catálogo independente da R19 (fecho até `traces/delivery.mjs`, arquivo ou apoio alterado desde `d8da3c0`, produtor real) não mudam com ela. A lista continua com os mesmos 43 arquivos.
  - Não há outra alteração executável, então não houve alcance a recalcular. O alvo de A/B/C (só o arquivo alterado) segue a própria identidade, não um alvo reduzido aceito às cegas.

## F1 da R19 — a prova nova contra o C46 (m) (verified at `6eb09ef`)

O literal do (m) não mudou (`.checks/issue-25-agent-launch.md:555-558`): “um produtor com o arquivo do registro de 3 linhas … tem as 3 na evidência, como `processo 1 de 3` a `processo 3 de 3`, com o pendente da 3ª; o lock com o `pid` da 3ª sai `de produtor 1 <rótulo>, processo 3 de 3`. Um produtor com o arquivo do teste continua com só a linha da saída dele.” O refinamento `:616-634`, a linha do Landing `:109` e a task `:392-397` acrescentam o caso novo sem trocar o literal.

| Exigência | Entrada do caso novo (`evidence.unit.test.mjs`) | Asserção (`file:line`) | Conferência |
| --- | --- | --- | --- |
| 3 linhas do arquivo do registro, uma vez cada, na ordem de saída | `:279`: `treeLine(1001)`, `treeLine(2002)`, `treeLine(3003, [["open", "lock", 5, 640]])`, nessa ordem, no arquivo próprio do wrapper | `:287-291`: `deepEqual` dos cabeçalhos filtrados com `["  processo 1 de 3:", "  processo 2 de 3:", "  processo 3 de 3:", "  tempos:"]` (exatamente esses, uma vez cada e nessa ordem) | confere |
| o processo certo traz os próprios dados: o pendente só na 3ª | `:279`: o pendente só em `pid` 3003 | `:292` localiza cada linha pelo cabeçalho literal; `:293` `third.includes("pendentes na saída: open lock (tomada do lock) há 640 ms")`; `:294` `pendentes na saída: nenhuma` nas linhas 1 e 2 | confere |
| cada processo é uma linha, não uma contagem | — | `:295` nenhuma linha `processo k de 3` com `linhas da pré-carga` | confere |
| o lock corresponde ao ordinal certo: `pid` da 3ª → `processo 3 de 3` | `:271`: lock com `pid` 3003 | `:297` (literal acima) | confere; é a asserção que faltava na R19 |
| arquivo do teste compartilhado: só a linha da saída | `:281`: 2 linhas (`4004`, `5005`) no arquivo compartilhado do hook | `:289`: um único `tempos:` e nenhum `processo` para esse produtor; `:296` `tempos:` com `; 2 linhas da pré-carga` | confere |
| sem raiz, arquivos de tempos nem nonce | — | `:298`: `[root, shared, own, "8899aabbccddeeff"]` ausentes | confere |

- **As expectativas não repetem o cálculo do matcher.** Todos os esperados são literais: os cabeçalhos, `há 640 ms`, `processo 3 de 3` e `; 2 linhas da pré-carga`. Nenhum índice ou ordinal é calculado na prova. O apoio, sem diff, monta o rótulo do dono pela posição `k + 1` da linha cujo `pid` coincide com o do lock (`helpers/traces.mjs:563-566`) e os cabeçalhos pela mesma posição (`:577`). A prova fixa o resultado esperado, não essa conta.
- **O controle da 1ª linha continua intacto** (`:239-265`, mesmo nome e mesmas asserções, porque o diff só acrescenta). O pendente e o `pid` 3003 estão na 1ª linha (`:246`, `:240`), e o caso afirma `processo 1 de 3` (`:259`, `:263`), `; 2 linhas da pré-carga` (`:262`) e a ausência da raiz e do nonce (`:264`). Com os dois casos juntos, uma montagem que desse sempre `processo 1 de n`, e também uma que desse sempre `processo n de n`, falharia em um deles. Isso é leitura minha das asserções. A execução do mutante “sempre 1” é do autor.
- **Executou**: em A, B e C, o TAP tem `ok 7` (controle da 1ª) e `ok 8` (caso novo) (`A.tap:39`, `:45`, igual em B e C). Em D, `D.log:1122` e `:1123`, os dois `✔`. Nenhum dos dois foi pulado.
- O C46 (n) também foi renovado: `evidence.unit:301-315`, com os literais em `:303-305` e a asserção em `:312`. Antes estava em `:267-281`; o conteúdo é o mesmo.

## Proveniência dos dois auxiliares em `/tmp` (registro documental conferido)

- `coordinator-r19-observations.json` registra, como nota de proveniência e não como falha ou veredito, que depois do D de `0ae940a` a comparação de skips gravou `/tmp/d4.skips` e `/tmp/d-old.skips` pelo Git Bash, isto é, no temporário do usuário Windows.
- Os três registros novos repetem o limite sem afirmar zero impacto: checklist `:1666-1684` (“Nada aqui afirma impacto zero.”), build `:2513-2526` e handoff `:166-172`. Em todos:
  - não houve inventário anterior nem criação exclusiva;
  - não se prova que os nomes eram novos nem que nada foi substituído;
  - não há evidência concreta de arquivo alheio sobrescrito;
  - os arquivos não foram lidos, limpos nem restaurados.
- Os mesmos registros os separam das raízes próprias dos gates, do `/tmp` do WSL e da auditoria metadata-only do perfil, que “não os cobre”. Busquei `impacto zero`, `zero impacto`, `nenhum impacto` e `auditoria de/dos temporários` em `.checks/*.md` e `.tasks/*.md`. A única ocorrência é a negação acima.
- Eu não li, não listei, não apaguei nem restaurei esses arquivos nem o temporário global.

## Execuções — verified at `6eb09ef`

A ordem foi A, B, C e D, em sequência, cada um uma vez, sem filtro e sem repetição. A lista e os orçamentos foram registrados antes (`r20/plan.txt`).
- **Forma de A/B/C**: `node --test --test-concurrency=4`, com reporters spec e TAP em `r20/`. `RUNNER_TEMP` ficou numa pasta própria e vazia, criada por mim e removida vazia depois.
- **Temporário dos testes**: numa raiz própria. Em A, B e D, `sm-v20-<rótulo>-…`, criada por `mkdtemp` no temporário do sistema, só no `TEMP`/`TMP` do processo do gate, com o registro do caminho real, `dev` e `ino`. Em C, o `TMPDIR` dentro do scratch.
- **Scripts**: `isolated-root.mjs`, `run-target.sh`, `make-clone-B.sh`, `remove-clone-B.sh`, `wsl-run.sh`, `run-npm-test.sh`, `matrix.mjs` e `d-summary.mjs`, escritos por mim depois de ler o método da R19.

| # | Ambiente | Resultado |
| --- | --- | --- |
| A | Windows 11, checkout principal, Node **v24.22.1** (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10, `npm_execpath` ausente, `RUNNER_TEMP` presente, `os.tmpdir()` = raiz isolada. Arquivo igual ao blob `6ccbf48`. 20:28:34–20:28:40 | **9 testes: 9 pass, 0 fail, 0 skip**, exit 0. Status vazio antes e depois; `RUNNER_TEMP` com 0 entradas depois. A raiz isolada `sm-v20-A-QCJdDT` (1 entrada dos testes) foi conferida (absoluta, filha direta do temporário, nome, pasta não link, mesmo `dev`/`ino`) e removida |
| B | Windows 11, Node **v24.13.0 oficial**: zip `ca274269…` igual à linha do `SHASUMS256.txt` local; `node.exe` extraído `d14ba95c…` igual ao de dentro do zip. npm **11.6.2** adjacente; `npm_execpath` ausente. **Clone git novo** em `r20/B-clone` com `--no-hardlinks --no-checkout --config core.autocrlf=true` (o `.git/config` do clone tem `true`; o `gitconfig` do sistema do Git for Windows já tinha `true`; nada global mudou). HEAD `6eb09ef` e árvore `662f1a7f…` conferidos. `cli.mjs` `i/lf w/lf attr/text eol=lf`, **0 CR antes e depois** da execução; a prova, `i/lf w/crlf`. `node_modules` copiado, status vazio antes e depois da cópia. 20:28:59–20:29:05 | **9: 9 pass, 0 fail, 0 skip**, exit 0. Status do clone vazio depois. A raiz isolada `sm-v20-B-orsGb1` (20 entradas) foi removida pelo registro. O clone foi removido pelo caminho exato, depois de conferir pasta não link, toplevel, HEAD e status vazio |
| C | WSL `Ubuntu`, `oldboydev`, uid 1000. `git -c core.autocrlf=false archive 6eb09ef` em `r20/head.tar`: 6.328.320 bytes, sha256 `86c36acb…`, `get-tar-commit-id` = `6eb09ef…`. A árvore extraída (`git write-tree` com `HOME` do scratch e `GIT_CONFIG_NOSYSTEM`) é `662f1a7f…` = `HEAD^{tree}`; 0 CR em `src/`, `tests/` e `scripts/`; `cli.mjs` 755. Scratch `/tmp/sm-v20-C.enBuQw` criado por `mktemp` (uid 1000, inode 1436). Node **v24.13.0** copiado de `/usr/bin/nsolid` (sha256 `150946e4…`, igual) num prefixo `bin = node npm npx`, **sem `sh`**; npm 11.6.2. `env -i` só com `HOME`, `LANG`, `PATH`, `RUNNER_TEMP` e `TMPDIR`. `PATH` = prefixo + `tools` com links para `/usr/bin/{sh,git,python3,id,grep,mkfifo}`, **sem `/usr/bin`**, e nenhum de `codex`/`claude`/`hermes`/`gemini`. 20:29:19 | **9: 9 pass, 0 fail, 0 skip**, exit 0. `RUNNER_TEMP` e `HOME` do scratch com 0 entradas depois; 1 entrada no `TMPDIR`. O scratch foi removido pelo caminho exato, depois de conferir pasta não link, uid 1000 e inode 1436 |
| D | `npm test`, sem argumentos, no checkout principal: Windows, Node v24.22.1, npm 11.19.1, `npm_execpath` ausente, `availableParallelism` 32 → integrações com `MAX_PARALLEL_FILES = 8` (as outras suítes com o padrão do Node), Python 3.12.10, `SKILL_ME_HERMES_PYTHON` ausente, `RUNNER_TEMP` presente, `TEMP`/`TMP` na raiz isolada. O script recusava começar com o checkout sujo; estava limpo. Orçamento de **2 h** (7.200.000 ms) definido no plano e passado à ferramenta. 20:29:43–20:40:11 (10 min 28 s) | **1.055 testes: 1.035 pass, 0 fail, 20 skip**, exit 0, terminado sozinho; nenhum `✖` e nenhum `not ok` no log. Por suíte: governança 25/25/0/0, motor 16/16/0/0, doctor 417/410/0/7 e integrações 597/584/0/13. HEAD igual e status vazio antes e depois; `RUNNER_TEMP` com 0 entradas depois. A raiz isolada `sm-v20-D-Qvoy68` (128 entradas dos testes) foi conferida e removida pelo registro |

**Nomes de A/B/C** (`r20/matrix-ABC.txt`): os 9 nomes de topo são iguais nos três, todos `ok`, sem skip nem duplicado. São os 7 `I25-C46 evidência comum` (formatter legado, dados ausentes, o mesmo erro, ambiente dentro e fora do registro, os dois casos de (m) e (n)) e os 2 `I25-C47 evidência comum`.

**D** (`r20/D-summary.txt`, comparado nome a nome com `verifier-round19/r19/D.log`):
- **Comparação com a R19**: a única linha de resultado nova é o caso novo de (m), `✔`. Nenhum nome da R19 sumiu, e nenhum resultado mudou de marca.
- **Nomes por check**: cada prefixo de `I25-C1 ` a `I25-C47 ` tem ao menos um nome real com `✔`, salvo `I25-C6` e `I25-C15`, que no Windows só têm skip. Somam 28 `I25-C46` (7 `evidência comum` e 8 `prazo da entrega`), 6 `I25-C47`, 9 `T8-C16`, 3 `I4-C16`, `I4-C17`, `I4-C35`, `I4-C36`, 7 `I23-C4`, `I23-C10` e `T8-C2`/`C3`/`C8`/`C12`/`C13`/`C14`/`C15`/`C18`, todos `✔`. Na governança, 7 `governance-…` (com `governance-C1 C3` e `governance-C49`) e 18 `C50 …` passaram, todos `✔`, com `RUNNER_TEMP` presente.
- **Hermes**, separando os casos:
  - **os 11 nativos com runtime** de `hermes-plugin.native` passaram: `I4-C18`, `C19`, `C20`, `C21`, `C22`, `C23`, `C37`, `C44b`, `I25-C40 harness nativa` e os dois `I23-C8` com runtime (`D.log:619-628`, `:630`);
  - **o ramo Hermes do `I4-C35`** rodou: o teste passou (`:1074`), e o log não tem o diagnóstico `observação Hermes não executada` nem `hermes-runtime-ausente`;
  - o `I23-C8 … pelo Python do sistema, sem o runtime do Hermes` (`:629`) também passou, mas **não é runtime do Hermes** e não conta entre os nativos.
- **Skips do D (20)**: os mesmos da R19 em nomes e motivos (`D-summary.txt`). Todos são de plataforma:
  - **doctor (7)**, `# SKIP` sem texto, `{skip: process.platform === "win32"}`, sem diff na feature: dois `agent-resolution` (POSIX), dois `fifo-config-formal8-4` e três `fs-adapter-formal8-4` (FIFO). **Não rodaram em ambiente nenhum** desta rodada nem da R19.
  - **integrações (13)**, com o motivo impresso. Onze rodaram e passaram no C da R19, em `5ee0e0f`, com os mesmos blobs; é **carry, não execução desta rodada**, porque o meu C rodou só o arquivo alterado. São `I4-C15`, `I4-C25b`, `I4-C25j`, `I4-C25k`, `I25-C5`, `C6`, `C15`, `C33`, `C42` e `C45` POSIX e `T8-C4`. **Não rodaram em ambiente nenhum**: `I4-C25m` (macOS) e `I4-C25l` (`posix-acl.unit`, fora da lista de 43).
- O D é **Windows**. Não o chamo de POSIX nem de macOS porque o C passou.

## Checks — 50/50 provados como escritos

Fonte da prova:
- **D**: o nome real passou no D fresco desta rodada, salvo os skips de plataforma marcados.
- **ABC/R19**: o A/B/C da R19 em `5ee0e0f`, carregado com os blobs iguais (carried from `5ee0e0f`).
- **ABCD**: fresco em A, B, C e D nesta rodada. Só vale para `evidence.unit`.
- **Citações**: as dos arquivos sem diff desde a R19 são as dela. Os blobs são iguais, então as linhas também. As de `evidence.unit` foram renovadas no HEAD.

| Check | Asserção decisiva (`file:line` no HEAD) | Erro plausível que ela distingue | Prova | Result |
| --- | --- | --- | --- | --- |
| C1 | `command.cli:48-49` `private === true`, `bin` = `{"skill-me": "src/integrations/launch/cli.mjs"}`; `:65` `[0, SKILL_ME_HELP, ""]`; `:77` `gitStatus() === before` | bin ausente/errado; `npm link` reescrevendo o checkout | D; ABC/R19 (B em clone `autocrlf=true`). O B desta rodada conferiu de novo o bin LF/0 CR antes e depois, sem `npm link` | PASS |
| C2 | `command.cli:96-98` `argv: LITERAL_ARGS` nos 3 agentes | shell, reordenação ou perda de `--`/Unicode/vazio | D; ABC/R19 | PASS |
| C3 | `command.cli:105` `{0: 0, 7: 7}` | código fixo | D; ABC/R19 | PASS |
| C4 | `command.cli:130-133` `{status: 127, [launcher_requires_shell], sentinel: false}`; `agent.unit` `I25-C4` | `.cmd` iniciado por shell | D (3 `✔`); A/B/R19 | PASS |
| C5 | `command.cli:228` POSIX `["SIGINT","SIGQUIT","SIGHUP"]`; `:244-245` `CTRL_C_EVENT` → `["SIGINT"]` | sinal repassado duas vezes | console em D; POSIX em C/R19 | PASS |
| C6 | `command.cli:267` `signals: ["SIGTERM"]` | SIGTERM perdido ou duplicado | C/R19 (skip POSIX no D) | PASS |
| C7 | `prepare.cli:93-94` `{status: 127, stdout: "", code: true, asked: false}` | pergunta ou escrita antes de recusar | D; ABC/R19 | PASS |
| C8 | `prepare.cli:122-126` texto exato até cada pergunta, árvores iguais | escrita antes da confirmação | D (com a variante `LOCALAPPDATA`); ABC/R19 | PASS |
| C9 | `prepare.cli:163-168` `observe.json` da #23 | formato diferente | D; ABC/R19 | PASS |
| C10 | `prepare.cli:189-191` `{exitCode: 3, …, started: false, root: false}` | recusa que cria algo | D; ABC/R19 | PASS |
| C11 | `prepare.cli:200` `{exitCode: 2, code: true, …, relative: false, config: false}` | raiz relativa aceita | D; ABC/R19 | PASS |
| C12 | `prepare.cli:223` `status: 3`, linha `setup_required` | pergunta sem terminal | D; ABC/R19 | PASS |
| C13 | `prepare.cli:238` SHA-256 iguais, `started: 1` | reaplicar o preparo | D; ABC/R19 | PASS |
| C14 | `prepare.cli:250` `observe_on` 4 | agente iniciado depois de conflito | D; ABC/R19 | PASS |
| C15 | `prepare.cli:408` `{status: 3, declined: true, trees: before}` (pty) | recusa que altera | C/R19 (skip “pseudoterminal só no POSIX…” no D) | PASS |
| C16 | `session.e2e:67` `{origin: "launch", …, limits: {maxEvents: 500, maxBytes: 8388608}}` | limites ou origem errados | D; ABC/R19 | PASS |
| C17 | `store.unit:79` `["launch", invocation, 1, "2026-10-26T10:00:00.000Z"]` | campo ausente no `list` | D; ABC/R19 | PASS |
| C18 | `session.e2e:111` `stderr: "skill-me: não foi possível abrir a execução [<código>]\n"` | caminho no stderr | D; ABC/R19 | PASS |
| C19 | `session.e2e:161` `[0, 0]` | evento na captura manual/automática | D; ABC/R19 | PASS |
| C20 | `session.e2e:190-192` `code: "binding_invalid"` | cair no par manual ou no `on` | D; ABC/R19 | PASS |
| C21 | `session.e2e:208-211` bytes iguais | autorização global mudada | D; ABC/R19 | PASS |
| C22 | `session.e2e:230` `[1, "stopped", 500, 500, {}]` | descarte no limite | D; ABC/R19 | PASS |
| C23 | `session.e2e:282` `["active", MAX_BYTES, {}, 1]` | passar de 8 MiB | D; ABC/R19 | PASS |
| C24 | `store.unit:168` `[opened.capture, "stopped", 1]` | sucessão perdida | D; ABC/R19 | PASS |
| C25 | `end.e2e:80-89` stderr exato do resumo | resumo incompleto | D; ABC/R19 | PASS |
| C26 | `end.e2e:101-109` `eventos gravados: 0.` e a dica | dica ausente | D; ABC/R19 | PASS |
| C27 | `end.e2e:120` `{launch: true, code: "launch_ended", …, lost: 1}`; `store.unit` `I25-C27` | gravar depois do encerramento | D; ABC/R19 | PASS |
| C28 | `end.e2e:164-165` `persisted` 3 e `stopped`; regressão `end.e2e:194` `["EIO"]` | perder entrega em voo | D; ABC/R19 | PASS |
| C29 | `command.cli:278` término pelo sinal | código no lugar do sinal | D; ABC/R19 | PASS |
| C30 | `command.cli:342` `captures: [[1, "stopped", 0]]` | captura `active` órfã | D; ABC/R19 | PASS |
| C31 | `end.e2e:205-215` `[lock_present]`, `continua active`, `privacy stop` | falha muda | D; ABC/R19 | PASS |
| C32 | `end.e2e:320` `"eventos intercalados: B terminou antes"`; `store.unit:715` `lock_present` | `store_invalid`/`io_failure` na 1ª criação | D (9 `✔`); ABC/R19 | PASS |
| C33 | `end.e2e:460` `active`; `:493-494` `spawn sh ENOENT` (arranjo POSIX) | `off` corta a invocação | D; arranjo POSIX em C/R19 | PASS |
| C34 | `report.cli:159` `[newInv, true]` | escolha pelo `createdAt` | D; ABC/R19 | PASS |
| C35 | `report.cli:252-259` `not_configured`/`no_launch_capture`, `schemaVersion: 1` | código diferente | D; ABC/R19 | PASS |
| C36 | `command.cli:350` `[0, SKILL_ME_HELP, ""]` | ajuda no stream errado | D; ABC/R19 | PASS |
| C37 | `docs.test:82` `deepEqual(observed, expected)` (os 9 limites) | limite não documentado | D; ABC/R19 | PASS |
| C38 | `prepare.cli:355` `["done", 0]` | mojibake no console | D; A/B/R19 (Windows) | PASS |
| C39 | `hermes-harness.unit:90` `["concluded", 0, 3]` | concluir por 300 ms parados | D; ABC/R19 | PASS |
| C40 | `hermes-harness.unit:220` `[5000, "timeout"]`; nativo `hermes-plugin.native:336`; fixture `hermes-harness.unit:320`, `:324`, `:327` | timeout no lugar de falha; cópia vazia ou remoção que engole ausência | D (4 `✔`, com a `harness nativa` e a `fixture do plugin`); ABC/R19 (só discrimina em B) | PASS |
| C41 | `store.unit:327-523`; `end.e2e:518` | sucessora com N+1 duplicado | D (17 `✔`); ABC/R19 | PASS |
| C42 | `agent.unit` `I25-C42`; `command.cli:456` Windows `status: 130`; `:424` POSIX | agente iniciado depois do sinal | D (3 `✔`, console); POSIX em C/R19 | PASS |
| C43 | `store.unit:598` `{code: "root_changed", opened: true, …, lockLeft: false}`; `end.e2e` `I25-C43` | perder a identidade da abertura | D (12 `✔`); ABC/R19 | PASS |
| C44 | `hermes-harness.unit:288` `[1000, "timeout"]`, `:291` `[5000, "timeout"]`; nativo `I25-C40`/`I4-C22` | `failed` com a contagem aberta | D; ABC/R19 | PASS |
| C45 | `agent.unit:132-146`; `command.cli:166-186` | vazio ignorado no POSIX | D (2 `✔`, com o controle do Windows); POSIX em C/R19 | PASS |
| **C46** | T8-C15 `concurrency.cli:220`, `:234`, `:256`; (a)–(c) `:283`, `:300`, `:303`, `:330`, `:355`, `:359-360`; T8-C3/C8/C14/C18 e (d)–(g) `live-capture:341`, `:348`, `:356`, `:367`, `replay.unit:161`, `:100`; (h) `live-capture:227`, `:229-234`, `:242-248`; (i) `follow.cli:195`, `:203-206`; (j) `:215`, `:225-236`; (k) `evidence.unit:54-60`, `:65-83`, `:85-131`, `:133-148`; (l) `failure-matrix.cli:116-119`; **(m) `evidence.unit:254-263` (1ª linha) e `:287-298` (3ª linha; `:297` `processo 3 de 3`)**; (n) `:303-305`, `:312`; (o) `delivery.unit:52-113`; (p) `concurrency.cli:956-964`, `:998-1004`, `:1015-1018`, T8-C16 `:920-928`; (q) `codex-run.cli:289-291`, `:329`, `:332-333`, `:344`, `:347-348` | ver a seção F1 e a análise da R19 abaixo | (k), (m), (n): ABCD; o resto: D (28 `I25-C46`, 9 `T8-C16`) e ABC/R19 | **PASS** (F1 resolvido) |
| C47 | I23-C10 `agents.e2e:315`; (a) `:427`, `:429`; (b) `:442`, `:444`; (c) `control.cli:1071`, `:1073-1077`; (d) `:1097-1098`, `:1100-1105`; evidência comum `evidence.unit:150-182`, `:184-225` | evidência que troca o erro ou vaza dado | evidência comum: ABCD; o resto: D (6 `✔`) e ABC/R19 | PASS |
| C48 | estrutural da R19 (`verifier-round19/r19/c48-c49-structure.txt`), carregado com a árvore `.github` `d9ee0d8` e o workflow `474a87b` iguais. Contra `d0d5a7f`: topo e `changes`/`verify`/`ci` iguais fora do `timeout-minutes` do `verify` (10 → `${{ matrix.os == 'windows-latest' && 20 \|\| 10 }}`); jobs = `changes`, `ci`, `lock_diagnostics`, `verify`; `governance-C1 C3` (`governance-ci:263-278`) | outro campo do workflow mudado | estrutura: carry R19 por blob; `governance-C1 C3` fresco em D | PASS |
| C49 | `governance-ci:317-358`; estrutura da R19 (`workflow_dispatch`, `windows-latest`, 10 min, `contents: read`, `uses` pinados, `persist-credentials: false`, Node 24.13.0 sem cache, os dois comandos, sem `needs`/`continue-on-error`, `ci.needs` = `[changes, verify]`) | job manual entrando no agregado | `governance-C49` fresco em D; A/B/C carry R16 (`8f045c2`); estrutura carry R19 | PASS |
| C50 | (a)–(n), as citações da R16 (`ci-lock-latency.test` blob `75eeadd`, script `8c12894`, iguais) | percentil interpolado, zero para dado ausente, `RUNNER_TEMP` herdado | 18 `C50` frescos em D com `RUNNER_TEMP` presente; A/B/C carry R16, com o mesmo `RUNNER_TEMP` presente e os blobs iguais (`r20/governance-carry.txt`) | PASS |

**Carry da governança (R16)**:
- **Blobs**: `governance-ci.test` `bfe5a0c`, `ci-lock-latency.mjs` `8c12894`, `ci-lock-latency.test` `75eeadd`, o workflow `474a87b`, `package.json` e `package-lock.json` são iguais de `8f045c2` ao HEAD.
- **Fecho**: o fecho de imports dos três arquivos tem 13 arquivos, todos iguais. Desde `8f045c2`, `src/` só mudou em `traces/delivery.mjs`, que fica fora do fecho.
- **Escopo**: a R16 rodou os dois arquivos do `test:governance` numa invocação por ambiente, A/B/C, com `RUNNER_TEMP` presente: 25/25/0/0 em cada. Desta rodada, o resultado é o D no Windows.

**Análise do resto, carregada da R19 com identidade** (texto abaixo, relatório R19): a análise de produto do `untilDeadline` (C46 (o)–(p)), a evidência comum dos produtores (C46 (h)–(k), C47 (c)–(d)), a harness (C40 e C46 (l)), a árvore e o lock ilegível (C46 (n)) e o consumidor lento do I4-C16c (C46 (q)) ficam como lá. Todos esses arquivos têm o mesmo blob. O único trecho da análise que muda é o F1, resolvido acima.

**AC → checks** (9 ACs de `context-round20.json`, o mesmo corpo do contexto 19):
- AC1–AC6: C1–C45, todos provados;
- AC7: C46, provado como escrito, com (m) agora coberto também na 3ª linha;
- AC8: C47 e C48;
- AC9: C49 e C50. A execução remota da medição e os cinco checks regulares continuam como condição de merge, não de revisão de código.

## Swept `existing` (carry R19; `src` igual)

Os blobs de `src/` são iguais aos de `5ee0e0f`, então as linhas da R19 valem:
- **idempotência**: `privacy/lifecycle.mjs:23-24`;
- **sem reenvio**: `traces/delivery.mjs:57` e `:123`;
- **falha de entrega não bloqueia**: `traces/delivery.mjs:156`;
- **`privacy prune` existente**: `privacy/command.mjs:56-57`.

## Observações (não bloqueantes; nada corrigido)

- **O1 — pendente e `pid` na mesma linha nos dois casos de (m).** Nos dois casos, o pendente e o `pid` do lock ficam na mesma linha: na 1ª no controle, na 3ª no caso novo. Uma montagem que escolhesse o dono do lock pela linha com o pendente, e não pelo `pid`, não seria distinguida por esses dois casos. As linhas 1 e 2 do caso novo também saem iguais, porque o `pid` não é impresso; a ordem relativa entre elas não é observável. O checklist não pede nenhuma das duas coisas: o (m) fixa o pendente e o `pid` na 3ª, e o apoio decide o dono pelo `pid` (`traces.mjs:563-566`). Por isso não é lacuna contra o literal. Fica só como nota.
- **O2 — observações anteriores mantidas.** As observações O1–O3 da R19 (linha do arquivo do teste por contagem, limpeza do registro no 24.13.0, nome forte remanescente em `replay.unit:143`/`:148`) e as O2–O5 da R17 continuam como estão no texto abaixo. O código delas não mudou.

## Gates remotos — pendentes e obrigatórios (nenhum ocorreu aqui)

1. A formal 12 do root, sobre o conteúdo deste PASS. Já está autorizada e não foi usada; o override continua 12, só para #25/light.
2. Com `ready`, a publicação do novo HEAD no PR #28.
3. **Uma** execução manual do `lock_diagnostics` sobre o HEAD aprovado e publicado, com o registro dos resultados.
4. Os **cinco checks regulares verdes** nesse HEAD, conferidos pelo root nas matrizes do PR e da execução manual, com o diagnóstico aplicável e a reconferência das fontes.
5. O merge, já autorizado, só com 3 e 4 cumpridos. Nenhum gate remoto foi dispensado, e não declaro verde nenhuma CI pendente.

O HEAD publicado continua `93bd1e9`, base `63621c6`.
- **CI do PR e execução manual**: a 40728221657 e a 40728249484 ficam **vermelhas** no Windows e no agregado, preservadas no histórico.
- **Medição**: 4.500/4.500 ciclos sem erros, sintética. Não substitui a CI.
- **Causas históricas** (CI 93, T8-C4 e o D de `dc0db9b`): continuam desconhecidas. O D de `dc0db9b` foi **interrompido pelo coordenador** depois de validar o processo próprio 149528. Não é falha natural do produto nem PASS.
- O FAIL 19 e os gates verdes dele ficam preservados, sem rebatizar resultado.
- O uso real continua no `Unresolved` 2.

## Processo, limites e limpeza da R20

**Executado.**
- **git**, só de leitura: `rev-parse`, `status`, `log`, `diff`, `ls-files --eol`, `ls-tree`, `grep`, `check-ignore` e `get-tar-commit-id`. Também:
  - `git -c core.autocrlf=false archive` do HEAD para `r20/head.tar`;
  - `git clone --no-hardlinks --no-checkout --config core.autocrlf=true` do repositório local, sem rede, com a configuração só no clone.
- **Leitura**: `node` só de leitura (contexto, TAP, log, fecho de imports), `sha256sum`, `python -I` (sha do zip oficial e CR do bin) e `stat`. Uma consulta `Get-CimInstance` de processos `node.exe` com o repositório na linha de comando, depois do D: nenhum.
- **Gates**: A, B, C e D, uma vez cada, sem repetição. O WSL foi chamado com `wsl.exe -d Ubuntu -u oldboydev --exec /bin/bash --noprofile --norc` e `MSYS_NO_PATHCONV=1`. Fora do gate, li só versões e caminhos de sistema (`/usr/bin/nsolid`, npm, links das ferramentas), nada do perfil.
- **Modo do D**: a ferramenta Bash limita o primeiro plano a 10 min e só aceita o orçamento de 2 h com `run_in_background`. Usei esse modo só para passar o orçamento definido antes. Esperei o término real com um laço em primeiro plano que só lia `r20/D-run.txt`. Não rodei nada que tocasse o checkout enquanto D rodava, e não declarei nada antes do fim. O D levou 10 min 28 s: teria sido cortado pelo teto do primeiro plano. A ferramenta guardou uma cópia de `D-run.txt` no arquivo de saída dela (`AppData\Local\Temp\claude\…\tasks\bx6gvfb8c.output`). Não é auxiliar meu, e não o li nem apaguei.

**Não executado.**
- RED, mutantes e sondas, inclusive a prova discriminante do autor (o mutante “sempre `processo 1 de n`” numa cópia própria). Ela é relato do autor e não foi reexecutada, conforme o perfil light e o despacho.
- Agentes reais, `--help`/`--version` de agente, sondas de PATH, perfis, credenciais, banco, modelo, rede, relógio do host, antivírus, Git global, TEMP global e runtimes fora das provas. O Hermes real rodou só pelas provas nativas versionadas do D, com o runtime local e o `HERMES_HOME` temporário delas.
- Actions, CI, `review:run`, commit, push, PR, merge, alteração de limites e subagentes.
- **Os outros 42 arquivos em A/B/C**: não rodaram nesta rodada; ficam como carry da R19. Os skips POSIX do D também não rodaram aqui; ficam como carry do C da R19.
- **Incidentes anteriores**: o incidente da R5 (`ffc5937`: até 5 inícios do Codex no WSL e 12 mtimes, sem linha de base de conteúdo) não foi desfeito nem repetido. A limpeza antiga (1.257 pastas no Windows e 107 no WSL, por prefixo/tipo/janela, sem prova de proveniência, sem os nomes do Windows) fica como está. Não auditei nem li conteúdo alheio, e não afirmo impacto zero.

**Auditoria externa 20 (do root, só metadados do perfil WSL).** `verifier-round20/profile-comparison-final.json` não existia às 20:40:59, depois do meu D. O root o gravou às 20:41:38 (414 bytes). Li só o resumo de nível superior (`r20/profile-summary-external.txt`), sem abrir `profile-before.json`, `profile-final.json` nem listas de entradas:
- **escopo declarado**: “External metadata-only audit from the Round19 final snapshot before the proof-fix author through completion of independent Round20 proofs; not a content audit, not temporary-file provenance, or undo for Round5”;
- **janela**: linha de base às 19:51:46 (-03), o fechamento da R19, e fechamento às 20:41:38 (-03), depois do fim do meu D (20:40:11);
- **resultado**: `baselineEntries` 12.113, `afterEntries` 12.113, e `errors`, `added`, `removed` e `modified` vazios.

É **resultado externo do root**: não a executei e não a conto como minha. Pelo escopo que ela mesma declara, não é auditoria de conteúdo, de temporários (inclusive `/tmp/d4.skips`/`/tmp/d-old.skips`), do Windows nem de configuração global, e não desfaz o incidente da R5.

**Limites.**
- **macOS**: o `I4-C25m` não rodou em ambiente nenhum; só a CI macOS o executa.
- **D no Windows**: os 7 skips do doctor (POSIX/FIFO) e o `I4-C25l` não rodaram em ambiente nenhum desta rodada nem da R19. ACL POSIX, PTY e sinais POSIX são carry do C da R19.
- **Runtime do Hermes**: só no Windows (D). O caso pelo Python do sistema não é runtime do Hermes.
- **C desta rodada**: só `evidence.unit` (9 testes), sem os casos POSIX dos outros arquivos.
- **Causas**: as causas históricas continuam desconhecidas.

**Limpeza** (`A-run.txt`, `B-run.txt`, `B-clone-cleanup.txt`, `C.run.txt`, `D-run.txt`, `post-D-checks.txt`):
- as raízes isoladas de A, B e D, no temporário do sistema, foram removidas só pelo registro da criação: caminho real absoluto, filha direta do temporário, nome `sm-v20-<rótulo>-`, pasta não link e mesmo `dev`/`ino`. As três estavam ausentes na conferência pós-D;
- o scratch de C foi removido pelo caminho exato, pasta não link, uid 1000 e inode 1436; a conferência pós-D confirmou a ausência;
- o clone de B foi removido pelo caminho exato, depois de conferir toplevel, HEAD e status;
- as pastas `runner-temp-A`/`-B`/`-D`, vazias, foram removidas por `rmdir`;
- nenhuma seleção por prefixo ou mtime em pasta global, e nenhum auxiliar meu no `/tmp` (Git Bash ou WSL) nem no temporário global. Logs, listas, matrizes, o tar e os scripts ficam em `verifier-round20/r20/`;
- nenhum processo meu ficou vivo, e nenhum processo alheio foi encerrado.

**Integridade do histórico abaixo.** O texto depois da linha `---` que fecha esta rodada (e da linha em branco seguinte) é, byte a byte, o blob `2e48980`: o `.verified.md` de `67a459b`, o mesmo no HEAD, com 215.351 bytes, sha256 `78dc39a7…` e 0 CR. Nele estão o relatório **FAIL 19** (49/50, só o C46 (m), com os gates verdes em `5ee0e0f`) e, abaixo dele, o blob `1dd923d`: o adendo R18, o FAIL 17, os adendos R16 e R15 e o relatório R14. Fica como histórico, sem rebatizar nenhum resultado.
- O FAIL 19 estava certo para `5ee0e0f`. Este PASS 20 é do conteúdo de `6eb09ef`, que acrescenta a prova da 3ª linha.
- Para o HEAD atual:
  - o D desta rodada substitui o D da R19;
  - o A/B/C da R19 continua valendo para os 42 arquivos de mesmo blob;
  - o A/B/C desta rodada vale para `evidence.unit`.
- Os resultados intermediários do autor ficam como estão nos registros, sem virar aprovação: `60bbda8` (B com 7 fail, C com 1 fail), `c0d61d7` (B com 1 fail), `cd4afc2` (B com 1 fail) e o D interrompido de `dc0db9b`.

---

# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25 (rodada 19)

**Verdict (R19)**: **FAIL — 49 de 50 checks provados como escritos; o C46 não, só pelo item (m).** 9 ACs, HEAD `5ee0e0f`. Os quatro gates frescos passaram (abaixo). O FAIL vem de um único achado de conferência entre o literal do checklist e a asserção da prova (F1). Não há teste vermelho nem defeito de produto demonstrado.
- **F1 (bloqueante; C46 (m), checklist × prova)**: o checklist (`.checks/issue-25-agent-launch.md:552-555`) fixa que, com o arquivo do registro de 3 linhas, o pendente é “da 3ª” e “o lock com o `pid` da 3ª sai `de produtor 1 <rótulo>, processo 3 de 3`”. A prova versionada afirma outro valor: põe o pendente e o `pid` do lock na **1ª** linha do arquivo e afirma `lock presente, de produtor 1 wrapper codex, processo 1 de 3` (`tests/integrations/traces/evidence.unit.test.mjs:246`, `:259`, `:263`). Nenhuma asserção do repositório fixa `processo 3 de 3` para o dono do lock (busca na seção F1). Detalhes, impacto e opções na seção F1.
- **Gates frescos (verified at `5ee0e0f`)**, cada um numa única invocação, sem filtro e sem repetição, sobre os 43 arquivos da lista reconferida:
  - **A** (Windows, Node 24.22.1, checkout principal): **365 testes, 353 pass, 0 fail, 12 skip**, exit 0.
  - **B** (Windows, Node 24.13.0 oficial, npm 11.6.2 adjacente, clone git novo com `core.autocrlf=true`): **365/353/0/12**, exit 0.
  - **C** (WSL isolado, Node 24.13.0 copiado, `env -i`, sem `/usr/bin` no PATH, árvore exata do HEAD): **365/345/0/20**, exit 0.
  - **D** (`npm test` completo, Windows, Node 24.22.1, runner padrão com teto 8): **1.054 testes, 1.034 pass, 0 fail, 20 skip**, exit 0. Por suíte: governança 25/25, motor 16/16, doctor 417 (410/0/7) e integrações 596 (583/0/13). Passaram os 11 nativos do Hermes com runtime, o ramo Hermes do I4-C35 e o caso pelo Python do sistema.
  - Os 359 nomes de topo de A, B e C são idênticos. Todo skip de A/B rodou e passou em C, e todo skip de C rodou e passou em A/B, exceto o `I4-C25m` (macOS), que não rodou em ambiente nenhum.
- **Produto (`322bcad`)**: a análise do `untilDeadline` confere com a regra do Landing e de `docs/traces.md` (seção “Produto” abaixo). As 8 provas `I25-C46 prazo da entrega` e os 9 `T8-C16` passaram em A, B, C e D.
- **Causa** das falhas da CI 93 (I23-C4, T8-C12, T8-C13, T8-C2) e do D interrompido de `dc0db9b`: **continua desconhecida**. As correções desta faixa não a demonstram.
- **Gates remotos**: pendentes e obrigatórios. Nenhuma execução de Actions, CI, `review:run`, commit, push ou merge ocorreu aqui.

**Profile**: light (`AGENTS.md:138`). Rodada 19 com a faixa inteira e os 50 checks. Pelo perfil, não há fault injection, `Coverage`, `Test policy` nem fonte de UI. Não fiz mutantes, sondas nem correções. RED, GREEN, mutações e sondas do autor (`.checks/issue-25-agent-launch.md:1449-1459`, `:1542-1548`; build) são **relato do autor**: li, não reexecutei.
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..5ee0e0f1a48b66dbf0a691bfe6d013a77332fdd6`, a feature inteira: 129 commits, árvore `a5a316c9…`. Desde a R18 (`d8da3c0`, relatório em `93bd1e9`) entraram 21 commits. Os que mudam conteúdo executável são:
- `fa2c8eb` e `60bbda8`: evidência comum dos produtores e formatter legado (só provas e apoios de prova);
- `d317202`: fixture Hermes por `cp`/`rm` de `node:fs/promises` e `collect` por `performance.now()` (provas e apoios);
- `909b591`: processos da árvore do produtor e lock ilegível na evidência (provas e apoios);
- `322bcad`: **produto**, `untilDeadline` em `src/integrations/traces/delivery.mjs`, e as provas C46 (o)–(p);
- `68f84c4`: harness do I4-C16c (só `codex-run.cli.test.mjs`);
- `5ee0e0f`: override `25` da configuração, `maxRounds` 11 → 12.

Os outros 14 são registros (`48b191a`, `97aa924`, `0eaae31`, `c0d61d7`, `2b3a114`, `cd4afc2`, `a6a829e`, `9b39d7e`, `dc0db9b`, `a2ec111`, `fc5155b`, `0ae940a`, `10dfbe8`) e o relatório R18 (`93bd1e9`).

**Round**: **19** (light). Base: “Pode fazer quantas precisar” e o escopo [6467154706](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706), com o registro 19/12 em [6482026695](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6482026695). Esse registro é o 30º comentário de `context-round19.json`. O corpo e os comentários 1–29 são idênticos aos de `context-ci28-verifier18-final.json`, e o corpo tem 9 ACs (`- [ ]`). A exportação não traz as URLs; o número vem do despacho. As 18 verificações e as 11 tentativas formais ficam preservadas. O `state.json` da revisão tinha sha256 `60c8e429…` antes das execuções e o mesmo `60c8e429…` depois. `roundOverrides["25"].maxRounds` é 12 desde `5ee0e0f`. A formal 12 é do root, depois deste resultado; não rodei `review:run`.
**Verifier**: subagente novo e independente (Claude Opus 5.5). Não sou o autor nem um Verifier anterior e não herdei sessão. Produto, testes, apoios, scripts, workflow, planos, configuração e estado ficaram só para leitura. Escrevi apenas este arquivo e logs/scratches em `.checks/code-review/issue-25/verifier-round19/r19/`, uma pasta ignorada (`.gitignore:4`). Não toquei os arquivos `profile-*` do root na pasta-mãe; de `profile-comparison-final.json` li só o resumo (Processo).

Data: 28/10/2026 (-03). Plano e orçamentos registrados às 19:21:38 (`r19/plan.txt`), antes de qualquer gate; A 19:22:05–19:30:05; B 19:30:33–19:40:12; C 19:40:38–19:41:54; D 19:42:22–19:50:55. O HEAD foi `5ee0e0f` do início ao fim. `git status --porcelain=v1 -uall` estava vazio no início, antes e depois de A, de B (no clone), antes e depois de D, e no fim, antes de gravar este arquivo. Em C, a árvore extraída é igual ao `HEAD^{tree}`.

## Fontes lidas (R19)

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md`, `tlc-implement/references/verify.md` | inteiros. Não há `CONTRIBUTING` no repositório fora de `node_modules`/runtime vendorizado |
| `.tasks/issue-25-agent-launch.md` | inteiro (721 linhas): critérios 1–42, os refinamentos do 32, 38, 39 e 42, a exceção datada ao 40, `Sources`, `Unresolved` e o registro da ordem remota |
| `.checks/issue-25-agent-launch.md` | inteiro (1.585 linhas): `Sources`, `Landing` (`:58-106`, com as linhas novas `:100-106`), C1–C50 (C46 `:413-611`, com (h)–(q) em `:490-611`), `Swept` (`:787-797`) e `Handoff` (`:799-1585`, com os blocos novos `:1218-1585`) |
| `.checks/issue-25-agent-launch.ci40728221657-handoff.md` | inteiro (154 linhas): evidência comum, harness, abandono terminal, retificação do D e consumidor lento |
| build | só as seções usadas (`:2195-2234`), **relato do autor** |
| `.verified.md` atual (blob `1dd923d`, de `93bd1e9`: R18, R17, R16, R15 e R14) | R18 e R17 inteiros; o resto pela integridade de bytes |
| `context-round19.json` | 30 comentários e 9 ACs; comparado ao contexto 18 por `node -e` |
| `git diff d8da3c0..HEAD` do produto, dos apoios e das provas | inteiro; consumidores do produto mudado (`observe/delivery.mjs`, `withLock`/`holdLockFile` do store) relidos no HEAD |
| logs do autor (`builder-stdout-eof/`) | só os scripts e os registros de execução, como referência de método; **não** são prova desta rodada |
| auditoria do root (`verifier-round19/profile-*`) | `profile-before.json` e os scripts do root **não lidos**; de `profile-comparison-final.json` (gravado pelo root às 19:51:45, depois do meu D), só o resumo de nível superior (Processo) |

## Prova Git (verified at `5ee0e0f`; `r19/blob-identity.txt`)

- **Produto**: em `src/`, só `src/integrations/traces/delivery.mjs` mudou desde a R18: `2517a97` (o mesmo blob da base `63621c6`) → `e1cf25a`, 12 linhas, só em `untilDeadline`. Nenhum outro arquivo de `src/` mudou desde `f734441`.
- **Executáveis desde `d8da3c0`** (23 arquivos): `code-review.config.json`, `delivery.mjs`, os apoios `helpers/{hermes-runtime,installed-hooks,producer-runs (novo),trace-kinds (novo),traces-probe,traces,wrapper}.mjs` e as provas `codex-run.cli`, `failure-matrix.cli`, `hermes-harness.unit`, `hermes-plugin.native`, `observe/agents.e2e`, `observe/control.cli`, `skill-tree-hash.cli`, `traces/{concurrency.cli,delivery.unit (nova),evidence.unit (nova),follow.cli,live-capture.cli,query.cli,replay.unit}`.
- **Sem diff desde a R17** (`45b512b`; mesmo blob): as provas do launcher (`command.cli` `e0bbbc7`, `prepare.cli` `8d0a49d`, `session.e2e` `3f2c593`, `store.unit` `791770c`, `end.e2e` `cd2dc94`, `report.cli` `d76e9cd`, `docs.test` `68b4186`, `agent.unit` `498fa5b`), `helpers/launch.mjs` `45c1c7d`, `governance-ci.test` `bfe5a0c`, `ci-lock-latency.mjs` `8c12894` e a prova dele `75eeadd`, o workflow `474a87b`, `package.json` `8fd02fa`, `.gitattributes` `7772ad3` e `cli.mjs` do launcher `c33d82f`. As citações delas são as da R17, reconferidas por amostra no HEAD (`command.cli:48`, `:105`, `:131`; `prepare.cli:93`, `:408`; `session.e2e:67`, `:230`; `store.unit:79`, `:598`; `end.e2e:120`, `:320`; `report.cli:159`; `docs.test:82`; `governance-ci:317`). Como o produto e os apoios mudaram, todas rodaram de novo (abaixo).
- **Core**: os 5 arquivos de `scripts/code-review/` têm os mesmos blobs na base e no HEAD (`25e5284`, `c6a4abc`, `1bda8e4`, `216125c`, `b02001e`).
- **Configuração**: `45b512b..HEAD` muda só `roundOverrides["25"]`: `maxRounds` 11 → 12 e o `approval` (registro 6482026695 e escopo 6467154706, preservar as 11 tentativas formais e as 18 verificações, nenhum relaxamento). Perfis globais e os outros overrides não mudam.

## Catálogo e lista dos gates (verified at `5ee0e0f`; `r19/catalog.mjs`, `catalog.txt`, `catalog.selected.txt`)

Recalculei o catálogo sem usar a lista do autor. Para cada um dos 96 arquivos `*.test.mjs` versionados, montei o fecho de imports estáticos e dinâmicos (`from`, `import()`, `import "…"`). Um arquivo entra se cumpre uma destas condições:
- o fecho alcança `src/integrations/traces/delivery.mjs`;
- o arquivo mudou desde `d8da3c0`;
- o fecho inclui um apoio que mudou desde `d8da3c0`;
- o arquivo inicia um produtor real: `runHook`, `runHermesIngest`, `runInternal`, `runWrapper`, `runClaudeHandler`, `runCodexHandler`, `runSkillMe`, `withOverlappingRuns`, `create*Delivery`, `inProcessProducer` ou a linha `hook`/`ingest`/`run --agent` do CLI.

O resultado tem **43 arquivos, idênticos à lista do autor** (`gate-files-68f84c4.txt`, sha256 `e26c5163…74d9`; o `diff` saiu vazio).
- Entre os 53 de fora, o único com indício de produtor é `privacy/demo.e2e`. Ele usa `privacy ingest --root --capture` (`ingestCapture` de `privacy/ingest.mjs`), que não passa por `untilDeadline`.
- Em `src/`, só `observe/delivery.mjs` e o próprio `traces/delivery.mjs` chamam `untilDeadline`. O `launch/command.mjs` importa só a constante `DELIVERY_DEADLINE_MS`.

## Análise do código mudado (verified at `5ee0e0f`, por leitura; as provas estão nos gates)

### Produto — abandono terminal no prazo (C46 (o)–(p); critério 38; AC7; Landing `:105`)

`untilDeadline` (`src/integrations/traces/delivery.mjs:72-104`):
- **`onLock`** (`:80-84`) põe `abandoned = true` quando `deadlineAt - clock() <= 0` e lança se `abandoned`. A comparação inclui a igualdade e vale antes de o callback do timer rodar, que é o candidato 2.
- **O timer** (`:91-94`) só marca `abandoned` e resolve sem valor.
- **Depois da corrida** (`:99`), qualquer tentativa abandonada encerra a entrega com `{ok: false, code: locked ? "delivery_timeout" : code}`, sem repetir. Isso vale também quando a rejeição interna do `onLock` virou `io_failure` no `.then` (`:88`). Então a recusa da guarda devolve `delivery_timeout`, ou `lock_present` depois de uma recusa real, nunca `io_failure` (defeitos 1 e 2).
- **Só** o `lock_present` concluído e não abandonado chega à repetição (`:100-102`), com a mesma espera de até 10 ms (`LOCK_RETRY_MS`).

O resto não muda:
- os 750/650 ms (`:12-18`), os códigos (`:21-35`) e a assinatura;
- os dois consumidores do store (`createCaptureDelivery` `:173`/`:191` e `observe/delivery.mjs:97`/`:170`, este com `codeOf` próprio).

Na fronteira do store:
- `withLock` chama `ctx.onLock?.()` dentro de `holdLockFile`, antes de qualquer leitura ou mutação (`store.mjs:225-230`);
- se o `onLock` lança, `holdLockFile` guarda o erro, confere os próprios bytes, apaga o próprio lock e relança (`:204-218`). Assim, a tentativa recusada não muda a captura e libera o lock.

O lock obtido antes do prazo continua podendo terminar o commit depois (`locked = true` → `delivery_timeout`, confirmação incerta). Isso é o que `docs/traces.md:492-494` declara (sem diff na faixa recente).

Cada linha da tabela (o) do checklist (`:568-578`) tem asserção em `delivery.unit.test.mjs`:

| Linha | Asserção |
| --- | --- |
| sucesso | `:52-53` |
| recusa concluída e depois sucesso | `:56-57` |
| `io_failure` | `:60-61` |
| pendente e timer | `:66-68` |
| lock antes do prazo | `:72-73` |
| defeito 1 | `:93-95`, `{ok: false, code: "lock_present"}` com **2** chamadas, e o `onLock` tardio lança |
| defeito 2 sem recusa | `:101-102`, relógio 30 e 31, `delivery_timeout` e 1 chamada |
| defeito 2 depois de uma recusa | `:105-106`, `lock_present` e 2 chamadas |
| válido no limite | `:112-113`, 29,999 → `{ok: true}` |

As asserções são exatas (`deepEqual`, `equal`).

(p), em `concurrency.cli.test.mjs`:
- **Defeito 1**: `:956-964`. A entrega fica em `lock_present` 1/0/0/1 em no máximo 750 ms, `lockCreations` 3 antes e depois de liberar o disco, `lockUnlinks` 2, árvore igual, sem `.lock` e `persisted` 0.
- **Defeito 2**: `:998-1004`. Para o código esperado, `[creation, 2]`, árvore igual, sem `.lock`, `persisted` 0 e export vazio, nos quatro casos (sem recusa ou depois de uma, no prazo ou depois dele).
- **Controle válido**: `:1015-1018`. `code: null` 1/1/1/0, o evento no export e o segmento coerente.
- **T8-C16 original**: `:920-928`. Continua `lock_present` 1/0/0/1, no máximo 750 ms e `lockCreations` **exatamente** 3 (`:922`); a abandonada devolve o lock sem gravar.

O que isso **não** diz:
- não demonstra que esses defeitos expliquem as falhas da CI 93 ou do T8-C4;
- a origem do código na `main` (`d1a5570`/`edd9d69`/`fd07b89`) é história de commits, e eu não executei nada na `main`;
- a sonda de 400 rodadas e o RED/GREEN são do autor.

### Evidência comum dos produtores (C46 (h)–(k); C47 (c)–(d); Landing `:100-101`)

- **O mesmo erro**. `recordProducersInEachTest` (`helpers/traces.mjs:393-407`) só age com `t.passed` falso e entrega `t.error.cause ?? t.error`, o erro original, a `withEvidence` (`:426-444`). Ela muda `message` e o cabeçalho do `stack` do próprio objeto. Tipo, `actual`, `expected`, `operator` e `code` não são tocados. Um valor que não é `Error` volta igual, e uma mensagem congelada fica intacta. Controles: `evidence.unit:85-131` (mesmo objeto, valores iguais, `stack` com a mensagem nova, inspeção que falha vira `indisponível [TypeError]` sem a mensagem com caminho), `follow.cli:170-175` e `control.cli:1041-1051` (o erro é `AssertionError`, a mensagem original vem primeiro e o `stack` a contém).
- **Dados por invocação**. Num registro, `recordedProducer` (`helpers/producer-runs.mjs:37-58`) dá a cada produtor sem pré-carga um arquivo próprio (`<n>.ndjson` no scratch do registro). Com o arquivo do teste, a linha é a contagem de linhas no `close` menos 1. Nos 7 arquivos que adotam, os produtores que compartilham um arquivo do teste rodam um depois do outro (`live-capture` T8-C1/C2). T8-C15 e I23-C10 dão um arquivo por produtor (`concurrency.cli:127`, `agents.e2e:226-233`). Ver O1.
- **Indisponível nunca vira 0**. Sem operação concluída, sai `ms: null` e `nenhuma operação de disco concluída`; o que falta sai `?`, `não registrado` ou `não registradas`; laço sem amostra sai `sem amostras` (`traces.mjs:125-193`). Prova: `evidence.unit:65-83`.
- **Sem caminho, ID, chave, conteúdo ou ambiente**:
  - `failureCode` dá só o `code` `E…` ou o nome do erro (`:202`);
  - o lock dá só o rótulo pela coincidência de `pid` e, se ilegível, o código e o tamanho (`:316-328`);
  - capturas saem sem ID (`:519`);
  - a raiz da rota automática só é lida de um home de prova no temporário (`producer-runs.mjs:76-97`).

  Provas: `evidence.unit:150-182`, `live-capture:244-248`, `follow.cli:177-182`, `control.cli:1056-1063`.
- **Custo e recursos**:
  - num arquivo que adota, todo produtor iniciado pelos apoios carrega a pré-carga (`--import` em `NODE_OPTIONS`);
  - a evidência só é calculada na falha;
  - o `monitorEventLoopDelay` do produtor em processo é desligado no fim do registro (`traces.mjs:508`, `producer-runs.mjs:28`);
  - o scratch do registro sai por `rmSync(force)` no fim de cada teste (`producer-runs.mjs:29`);
  - o estado do registro fica no módulo leve `producer-runs.mjs`, só com builtins e `cli.mjs`. `installed-hooks.mjs`, que a fixture do launcher carrega, importa só esse módulo (`installed-hooks.mjs:5`).

  O custo da pré-carga por processo não foi medido à parte (relato do autor). Os gates desta rodada rodaram com ele.
- **Registro e limpeza**: o registro abre no `beforeEach` e fecha no `finally` do `afterEach`, com o `previous` restaurado (`producer-runs.mjs:20-30`). Nenhum dos 7 arquivos usa `t.test`, `describe` ou concorrência de testes (`grep`). `recordingProducers` aninha corretamente dentro do registro do arquivo.
- **Consumidoras que não adotam o registro**: fora de um registro, `recordedProducer` devolve **o mesmo objeto** de ambiente (`producer-runs.mjs:38`; prova `evidence.unit:135` e `:147`). `runInternal` monta `{...env, SKILL_ME_OBSERVER_REPORT_FD: "3"}` como em `d8da3c0` (`traces.mjs:77`; antes `:72`). `runWrapper` e os dois handlers instalados passam o mesmo `env` (diff de `wrapper.mjs` e `installed-hooks.mjs`). Os 7 que adotam são exatamente os do Landing (`grep -l "recordProducersInEachTest()"`). O `codex-run.cli` (`probe.env` comparado) não adota.

### Harness: fixture Hermes e relógio dos hooks (refinamento do C40; C46 (l))

- **`installFixturePlugin`/`removeFixturePlugin`** (`helpers/hermes-runtime.mjs:27-28`) usam o `cp`/`rm` de `node:fs/promises`, recursivo e sem `force`. Os consumidores são `hermes-plugin.native` (`prepareAndRun` `:60` e o `after` `:137-139`) e `skill-tree-hash.cli` (I4-C35 `:91`, `:104`; `after` `:16-18`). Os plugins, os argumentos, o `HERMES_HOME` temporário e as asserções não mudaram (diff).
- **Controle C40** (`hermes-harness.unit:315-329`):
  - a fonte versionada tem exatamente `["__init__.py", "plugin.yaml"]` (`:320`);
  - a cópia num `HERMES_HOME` com “ação” é igual à fonte em nomes, tipo, bytes e sha256 (`snapshotTree` sem mtime; `helpers/tree.mjs:14-23`, sem seguir links) (`:324`);
  - a remoção tira o plugin (`:326`), e uma segunda remoção rejeita com `ENOENT` (`:327`).
  - O controle só discrimina no Windows com 24.13.0 (limite declarado). Ele passou em A, B e C.
- **`collect`** (`helpers/installed-hooks.mjs:55-58`) mede por `performance.now()` e arredonda. O campo e os consumidores (I4-C36, I23-C14) são os mesmos.
- **Controle (l)** (`failure-matrix.cli:95-120`):
  - o recuo de 1.800 ms do `Date.now` acontece só no processo isolado `node -e`;
  - o hook instalado roda sem injeção: fora de um registro, o mesmo ambiente;
  - a prova exige `civilMs < 1900` (`:116`), `[status, stdinTimeout] = [0, 1]` (`:117`) e a faixa `1900 ≤ elapsedMs < 6000` (`:119`), a mesma do I4-C36 (`:83`).
  - O prazo de 2.000 ms do hook e a faixa não mudaram.
  - A comparação de 349 chamadas (28 civis fora da faixa, nenhuma monotônica) é relato do autor; não a refiz.

### Árvore do produtor e lock ilegível (C46 (m)–(n))

- **`treeOf`** (`traces.mjs:548-552`) mostra cada linha do arquivo **próprio** do produtor como `processo k de n`, na ordem do arquivo, que é a ordem de saída. Com o arquivo do teste (`!producer.own`), só a linha da saída do produtor. O `pid` de cada linha da árvore entra nos donos possíveis do lock, com o rótulo `produtor i <rótulo>, processo k de n` (`:562-571`).
- **Coincidência de `pid` não prova o autor do lock.** O código e o Landing (`:104`) dizem isso, e a saída só diz `lock presente, de <rótulo>`.
- **0 bytes** só constata o conteúdo vazio naquele instante. **ELD/CPU** não identificam recurso, antivírus nem hardware.
- **Os controles (m)–(n) são de renderização**, com linhas sintéticas. Não reproduzem a causa histórica do T8-C4.
- **(n)**: `evidence.unit:267-281` afirma `lock presente, ilegível [SyntaxError; 0 bytes]` para o lock vazio, `[sem pid; 17 bytes]` e `[SyntaxError; 12 bytes]`. Afirma também que o conteúdo não aparece. **Confere** com o checklist `:556`.
- **(m)**: ver F1.

### Consumidor lento do I4-C16c (C46 (q))

`readStdoutSlowly` (`codex-run.cli:247-273`):
- pausa o stdout e ouve o `end` desde o início (`:255-259`);
- lê a cada 50 ms (`:261-264`);
- no `exit` limpa o intervalo, registra o `data` antes do `resume` e confere (`:265-271`);
- resolve só com o `exit` e o `end`, em qualquer ordem (`:252-254`).

O I4-C16c real (`:278-292`) continua com 3.000 linhas de 200 `z`, o wrapper real, `FAKE_CODEX_EXIT` 17, `status` 17 (`:289`), o tamanho (`:290`) e o Buffer exato (`:291`).

Os controles usam a **mesma** função com um filho falso e um `PassThrough` real:
- **EOF antes do `exit`**: fica pendente depois do `end` (`:329`) e resolve com `{status: 17, stdout: bytes}` (`:332-333`);
- **`exit` antes do EOF**: fica pendente sem o EOF (`:344`) e resolve com os bytes em ordem (`:347-348`);
- o filho falso e o stream são liberados no `finally` (`:314-318`).

Uma lógica que resolvesse só no `end` ou só no `exit` falharia num dos dois controles. Isso é leitura minha das asserções; as mutações são do autor. **A correção da harness não demonstra a ordem dos eventos no D interrompido de `dc0db9b`.** Aquele D fica **incompleto, interrompido pelo coordenador** (PID 149528, 18:21:49, `coordinator-D-stall.json`): não é PASS, nem falha natural do produto.

## F1 — o literal do C46 (m) diverge da prova

| Item do C46 (m) (`.checks/issue-25-agent-launch.md:552-555`) | Prova (`evidence.unit.test.mjs`, blob de `909b591`, igual no HEAD) | Conferência |
| --- | --- | --- |
| registro de 3 linhas; as 3 aparecem como `processo 1 de 3` a `processo 3 de 3` | `:254-257` `["  processo 1 de 3:", "  processo 2 de 3:", "  processo 3 de 3:", "  tempos:"]` | igual |
| **“com o pendente da 3ª”** | `:246` grava o pendente na **1ª** linha (`treeLine(3003, [["open", "lock", 5, 640]])`); `:259` afirma o pendente em `processo 1 de 3` | **diverge** |
| **“o lock com o `pid` da 3ª sai `de produtor 1 <rótulo>, processo 3 de 3`”** | `:240` lock com `pid` 3003, a 1ª linha; `:263` `includes("raiz 1 (produtores 1, 2): lock presente, de produtor 1 wrapper codex, processo 1 de 3;")` | **diverge** |
| com o arquivo do teste, só a linha da saída | `:262` `; 2 linhas da pré-carga` na linha `tempos:` | igual |

**Busca**: `rg "processo [0-9] de [0-9]|processo \$\{" tests` dá 3 asserções, todas em `evidence.unit` (`:256`, `:259`, `:263`), e as duas linhas do apoio que montam o texto (`traces.mjs:565`, `:577`). Nenhuma afirma `processo 3 de 3` como dono do lock, nem um pendente fora da 1ª linha.
- O literal veio de `2b3a114` (registro antes do código; `git log -S "processo 3 de 3"` dá só esse commit).
- A prova de `909b591` escolheu a ordem de saída: o hook filho, que tinha o pendente, sai primeiro.
- Build, task e handoff não reconciliam as duas formas.

**Impacto**:
- O texto do check e a asserção dizem coisas diferentes sobre o mesmo rótulo. Pela regra “evidence or zero” do `verify.md` (passo 3) e pela regra do `AGENTS.md` de que valores exatos do contrato exigem asserção correspondente, o item (m) não está provado como escrito. É a mesma classe do F1 da R17.
- Não é só forma. Com o `pid` na 1ª linha, uma montagem que desse sempre `processo 1 de n` ao dono do lock passaria na prova. Com o `pid` na 3ª, como o check diz, ela falharia. Não executei essa mutação; é leitura.
- O controle passou em A, B, C e D. O apoio, pela leitura, numera pela posição na ordem do arquivo (`traces.mjs:565`).

**Não é defeito de produto.** É uma divergência entre o checklist e a prova. As opções são decisão do orquestrador e do autor, e não corrigi nada:
- retificar o literal para a ordem de saída que a prova usa: pendente e `pid` do lock em `processo 1 de 3`;
- fortalecer a prova para que o pendente e o `pid` fiquem na 3ª linha, como o check está escrito.

## Execuções — verified at `5ee0e0f`

A ordem foi A, B, C e D, em sequência, cada um uma vez, sem filtro e sem repetição. A lista e os orçamentos foram registrados antes (`r19/plan.txt`). A/B/C usaram `node --test --test-concurrency=4` com reporters spec e TAP. O `RUNNER_TEMP` ficou numa pasta própria e vazia, criada por mim e removida vazia depois. O temporário dos testes ficou numa raiz própria: em A, B e D, `sm-v19-<rótulo>-…` no temporário do sistema, só no `TEMP`/`TMP` do processo do gate, registrada com caminho real, `dev` e `ino`; em C, o `TMPDIR` dentro do scratch. Scripts: `isolated-root.mjs`, `run-target.sh`, `make-clone-B.sh`, `remove-clone-B.sh`, `wsl-run.sh`, `run-npm-test.sh`, `matrix.mjs` e `d-summary.mjs`, escritos por mim depois de ler o método do autor e da R17.

| # | Ambiente | Resultado |
| --- | --- | --- |
| A | Windows 11, checkout principal, Node **v24.22.1** (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10, `npm_execpath` ausente, `RUNNER_TEMP` presente, `os.tmpdir()` = raiz isolada. 19:22:05–19:30:05 | **365 testes: 353 pass, 0 fail, 12 skip**, exit 0. Status vazio antes e depois; `RUNNER_TEMP` com 0 entradas depois. A raiz isolada (110 entradas dos testes) foi conferida (absoluta, filha direta do temporário, nome, pasta não link, mesmo `dev`/`ino`) e removida |
| B | Windows 11, Node **v24.13.0 oficial**: `node.exe` com o sha256 `d14ba95c…` dentro do zip (`ca274269…`, igual ao `SHASUMS256.txt` local); npm **11.6.2** adjacente; Python 3.12.10; `npm_execpath` ausente. **Clone git novo** com `--no-hardlinks --no-checkout --config core.autocrlf=true`, só no `.git/config` do clone (o `gitconfig` do sistema do Git for Windows já tem `true`; nada global foi mudado). HEAD `5ee0e0f` e árvore `a5a316c9…` conferidos. `cli.mjs` `i/lf w/lf attr/text eol=lf`, **0 CR** antes e depois; o produto e as provas novas `i/lf w/crlf`. `node_modules` copiado. 19:30:33–19:40:12 | **365: 353 pass, 0 fail, 12 skip**, exit 0. Status do clone vazio antes e depois de copiar `node_modules` e depois da execução. A raiz isolada (1.031 entradas, deixadas pelo `rmSync` do 24.13.0 em caminhos com “ação”) foi removida pelo registro. O clone foi removido pelo caminho exato, depois de conferir pasta não link, toplevel, HEAD e status |
| C | WSL `Ubuntu`, `oldboydev`, uid 1000. `git -c core.autocrlf=false archive 5ee0e0f`: 6.246.400 bytes, sha256 `cce4b84a…`, `get-tar-commit-id` = `5ee0e0f…`. A árvore extraída (`git write-tree` com `HOME` do scratch e `GIT_CONFIG_NOSYSTEM`) é `a5a316c9…` = `HEAD^{tree}`; 0 CR em `src/`, `tests/` e `scripts/`; `cli.mjs` 755. Scratch `/tmp/sm-v19-C.KAe30v` criado por `mktemp` (uid 1000, inode 6738). Node **v24.13.0** copiado de `/usr/bin/nsolid` (sha256 `150946e4…`, igual) num prefixo `bin = node npm npx`, **sem `sh`**; npm 11.6.2. `env -i` com só `HOME`, `LANG`, `PATH`, `RUNNER_TEMP` e `TMPDIR`. `PATH` = prefixo + `tools` com links para `/usr/bin/{sh,git,python3,id,grep,mkfifo}`, **sem `/usr/bin`**, e nenhum de `codex`/`claude`/`hermes`/`gemini` no PATH. 19:40:38–19:41:54 | **365: 345 pass, 0 fail, 20 skip**, exit 0. `RUNNER_TEMP` e `HOME` do scratch com 0 entradas depois; 110 entradas no `TMPDIR` do scratch. O scratch foi removido pelo caminho exato, depois de conferir pasta não link, uid 1000 e inode 6738 |
| D | `npm test`, sem argumentos, no checkout principal: Windows, Node v24.22.1, npm 11.19.1, `npm_execpath` ausente, `availableParallelism` 32 → integrações com `--test-concurrency=8` (`MAX_PARALLEL_FILES = 8`; as outras suítes com o padrão do Node), Python 3.12.10, `RUNNER_TEMP` presente, `TEMP`/`TMP` na raiz isolada. Orçamento de **2 h** definido no plano antes de A e passado à ferramenta; esperei o término real. 19:42:22–19:50:55 | **1.054 testes: 1.034 pass, 0 fail, 20 skip**, exit 0; nenhum `✖` no log. Por suíte: governança 25/25/0/0, motor 16/16/0/0, doctor 417/410/0/7 e integrações 596/583/0/13. Status vazio antes e depois; HEAD igual; `RUNNER_TEMP` com 0 entradas depois. A raiz isolada (128 entradas dos testes) foi conferida e removida pelo registro |

**Nomes** (`r19/matrix-ABC.txt`): são 359 nomes de topo (365 testes contando os subtestes), **iguais em A, B e C**, sem duplicados. Em cada ambiente passaram, pelo nome real:
- as 8 `I25-C46 prazo da entrega` (5 do unit e 3 do store) e os 9 `T8-C16`, com o original `tentativa cortada no prazo antes de obter o lock…`;
- os 2 `I25-C46 consumidor lento do I4-C16c`, o `I4-C16`, o `I4-C16c` e o `I4-C17`;
- os 6 `I25-C46 evidência comum`, `diagnóstico do formatter legado`, `diagnóstico do T8-C12`, `diagnóstico do T8-C13`, os 3 do T8-C15, os 3 das entregas de um produtor, o do T8-C18 e `apoio dos hooks instalados`;
- os 4 `I25-C47`, mais os 2 `I25-C47 evidência comum`;
- `T8-C2`, `T8-C3`, `T8-C8`, `T8-C12`, `T8-C13`, `T8-C14`, `T8-C15`, `T8-C18`, os `I23-C4`, `I23-C10` e `I4-C36`;
- os 4 `I25-C40`, inclusive `fixture do plugin` (o `harness nativa` passou em A e B; em C, skip pelo runtime);
- `I4-C35`.

Nenhum `not ok` em nível nenhum.

**Skips de A/B/C** (motivo impresso; `r19/matrix-ABC.txt`):
- **A e B (12, iguais em nomes e motivos)**: `I25-C15` pty, `I25-C33` arranjo, `I25-C42` POSIX, `I25-C45` POSIX, `I25-C5` POSIX, `I25-C6`, `I4-C15`, `I4-C25b`, `I4-C25j`, `I4-C25k`, `I4-C25m` e `T8-C4` sinal. **Todos rodaram e passaram em C**, exceto o `I4-C25m` (macOS). O `I25-C15` (pty), que nas R17/R18 vinha da R14, rodou fresco em C nesta rodada.
- **C (20)**: os 11 nativos do Hermes (`hermes-runtime-ausente`): `I4-C18`, `C19`, `C20`, `C21`, `C22`, `C23`, `C37`, `C44b`, `I25-C40 harness nativa` e os dois `I23-C8` com runtime. Os Windows: `I25-C4`, `I25-C5` console, `I25-C8` LOCALAPPDATA, `I25-C38`, `I25-C42` console, `I25-C45` controle, `I4-C25g` e `I4-C25h`. E o `I4-C25m`. **Todos rodaram e passaram em A e B**, exceto o `I4-C25m`.
- **Ramo Hermes do I4-C35**: rodou em A e B, onde o diagnóstico `observação Hermes não executada` está ausente do spec e do TAP. Em C o teste passou **sem** esse ramo (`C.spec.txt:319`: `observação Hermes não executada: hermes-runtime-ausente…`).

**D** (`r19/D-summary.txt`):
- **Nomes por check**: cada prefixo de `I25-C1 ` a `I25-C47 ` tem ao menos um nome real com `✔`, salvo `I25-C6` e `I25-C15`, que só têm skip no Windows e passaram em C. São 27 `I25-C46`, 6 `I25-C47`, 9 `T8-C16`, e `T8-C2`/`C3`/`C8`/`C12`/`C13`/`C14`/`C15`/`C18`, `I23-C4`/`C10`, `I4-C16c`, `I4-C17` e `I4-C36`, todos `✔`. Na governança, 7 `governance-…` (com `governance-C1 C3` e `governance-C49`) e 18 `C50 …`, todos `✔`, com `RUNNER_TEMP` presente.
- **Hermes**: os 11 nativos com runtime de `hermes-plugin.native` passaram (`I4-C18`, `C19`, `C20`, `C21`, `C22`, `C23`, `C37`, `C44b`, `I25-C40 harness nativa` e os dois `I23-C8` com runtime). O ramo Hermes do `I4-C35` rodou: o log não tem o diagnóstico `observação Hermes não executada`. O `I23-C8 … pelo Python do sistema` também passou, mas **não é runtime do Hermes** e não conta entre os nativos.
- **Skips do D (20), todos de plataforma, com o motivo**:
  - **doctor (7)**, `{skip: process.platform === "win32"}` (`tests/doctor/agent-resolution.unit.test.mjs:279`, `:589`; `fifo-config.cli.test.mjs:30`, `:75`; `fs-adapter.posix.test.mjs:36`, `:53`, `:75`; sem diff na feature). No log, só `# SKIP`, sem texto: dois `agent-resolution` (POSIX), dois `fifo-config-formal8-4` e três `fs-adapter-formal8-4` (FIFO). **Não rodaram em ambiente nenhum desta rodada.**
  - **integrações (13)**, com o motivo impresso. Rodaram e passaram em C: `I4-C15` (`posix-signals`), `I4-C25b` (`posix-modes`), `I4-C25j`/`I4-C25k` (`posix-acl`), `I25-C45`/`C5`/`C6`/`C42` POSIX, `I25-C33` arranjo, `I25-C15` pty e `T8-C4` sinal. **Não rodaram em ambiente nenhum**: `I4-C25m` (`macos-acl`) e `I4-C25l` (`posix-acl`, em `posix-acl.unit.test.mjs`, fora da lista de 43).

Isso não autoriza dizer que todos os skips do D rodaram em outro lugar.

## Checks — 49/50 provados como escritos

Fonte da prova:
- **ABCD**: o nome real passou em A, B, C e D nesta rodada, salvo os skips de plataforma marcados.
- **D**: só no D. São os arquivos fora da lista de 43: `governance-ci.test` e `ci-lock-latency.test`.
- As citações dos arquivos sem diff desde a R17 são as dela, reconferidas por amostra (Prova Git). As dos arquivos mudados foram renovadas no HEAD.

| Check | Asserção decisiva (`file:line` no HEAD) | Erro plausível que ela distingue | Prova nesta rodada | Result |
| --- | --- | --- | --- | --- |
| C1 | `command.cli:48-49` `private === true`, `bin` = `{"skill-me": "src/integrations/launch/cli.mjs"}`; `:65` `[0, SKILL_ME_HELP, ""]`; `:77` `gitStatus() === before` | bin ausente/errado; `npm link` reescrevendo o checkout | ABCD; B em clone novo com `autocrlf=true`, `cli.mjs` LF e 0 CR antes e depois | PASS |
| C2 | `command.cli:96-98` `argv: LITERAL_ARGS` nos 3 agentes | shell, reordenação ou perda de `--`/Unicode/vazio | ABCD | PASS |
| C3 | `command.cli:105` `{0: 0, 7: 7}` | código fixo | ABCD | PASS |
| C4 | `command.cli:130-133` `{status: 127, [launcher_requires_shell], sentinel: false}`; `agent.unit` `I25-C4` | `.cmd` iniciado por shell | A/B/D (C: skip, só Windows); `agent.unit` ABCD | PASS |
| C5 | `command.cli:228` POSIX `["SIGINT","SIGQUIT","SIGHUP"]`; `:244-245` `CTRL_C_EVENT` → `["SIGINT"]` | sinal repassado duas vezes | POSIX em C; console em A/B/D | PASS |
| C6 | `command.cli:267` `signals: ["SIGTERM"]` | SIGTERM perdido ou duplicado | C (A/B/D: skip, sinais POSIX) | PASS |
| C7 | `prepare.cli:93-94` `{status: 127, stdout: "", code: true, asked: false}` | pergunta ou escrita antes de recusar | ABCD | PASS |
| C8 | `prepare.cli:122-126` texto exato até cada pergunta, árvores iguais | escrita antes da confirmação | ABCD (variante LOCALAPPDATA em A/B/D) | PASS |
| C9 | `prepare.cli:163-168` `observe.json` da #23 | formato diferente | ABCD | PASS |
| C10 | `prepare.cli:189-191` `{exitCode: 3, …, started: false, root: false}` | recusa que cria algo | ABCD | PASS |
| C11 | `prepare.cli:200` `{exitCode: 2, code: true, …, relative: false, config: false}` | raiz relativa aceita | ABCD | PASS |
| C12 | `prepare.cli:223` `status: 3`, linha `setup_required` | pergunta sem terminal | ABCD | PASS |
| C13 | `prepare.cli:238` SHA-256 iguais, `started: 1` | reaplicar o preparo | ABCD | PASS |
| C14 | `prepare.cli:250` `observe_on` 4 | agente iniciado depois de conflito | ABCD | PASS |
| C15 | `prepare.cli:408` `{status: 3, declined: true, trees: before}` (pty) | recusa que altera | **C, fresco** (A/B/D: skip, “pseudoterminal só no POSIX…”) | PASS |
| C16 | `session.e2e:67` `{origin: "launch", …, limits: {maxEvents: 500, maxBytes: 8388608}}` | limites ou origem errados | ABCD | PASS |
| C17 | `store.unit:79` `["launch", invocation, 1, "2026-10-26T10:00:00.000Z"]` | campo ausente no `list` | ABCD | PASS |
| C18 | `session.e2e:111` `stderr: "skill-me: não foi possível abrir a execução [<código>]\n"` | caminho no stderr | ABCD | PASS |
| C19 | `session.e2e:161` `[0, 0]` | evento na captura manual/automática | ABCD | PASS |
| C20 | `session.e2e:190-192` `code: "binding_invalid"` | cair no par manual ou no `on` | ABCD | PASS |
| C21 | `session.e2e:208-211` bytes iguais | autorização global mudada | ABCD | PASS |
| C22 | `session.e2e:230` `[1, "stopped", 500, 500, {}]` | descarte no limite | ABCD | PASS |
| C23 | `session.e2e:282` `["active", MAX_BYTES, {}, 1]` | passar de 8 MiB | ABCD | PASS |
| C24 | `store.unit:168` `[opened.capture, "stopped", 1]` | sucessão perdida | ABCD | PASS |
| C25 | `end.e2e:80-89` stderr exato do resumo | resumo incompleto | ABCD | PASS |
| C26 | `end.e2e:101-109` `eventos gravados: 0.` e a dica | dica ausente | ABCD | PASS |
| C27 | `end.e2e:120` `{launch: true, code: "launch_ended", …, lost: 1}`; `store.unit` `I25-C27` | gravar depois do encerramento | ABCD | PASS |
| C28 | `end.e2e:164-165` `persisted` 3 e `stopped`; regressão `end.e2e:194` `["EIO"]` | perder entrega em voo | ABCD | PASS |
| C29 | `command.cli:278` término pelo sinal | código no lugar do sinal | ABCD | PASS |
| C30 | `command.cli:342` `captures: [[1, "stopped", 0]]` | captura `active` órfã | ABCD | PASS |
| C31 | `end.e2e:205-215` `[lock_present]`, `continua active`, `privacy stop` | falha muda | ABCD | PASS |
| C32 | `end.e2e:320` `"eventos intercalados: B terminou antes"`; `store.unit:715` `lock_present` | `store_invalid`/`io_failure` na 1ª criação | ABCD | PASS |
| C33 | `end.e2e:460` `active`; `:493-494` `spawn sh ENOENT` (arranjo POSIX) | `off` corta a invocação | ABCD; arranjo POSIX em C | PASS |
| C34 | `report.cli:159` `[newInv, true]` | escolha pelo `createdAt` | ABCD | PASS |
| C35 | `report.cli:252-259` `not_configured` / `no_launch_capture`, `schemaVersion: 1` | código diferente | ABCD | PASS |
| C36 | `command.cli:350` `[0, SKILL_ME_HELP, ""]` | ajuda no stream errado | ABCD | PASS |
| C37 | `docs.test:82` `deepEqual(observed, expected)` (os 9 limites) | limite não documentado | ABCD | PASS |
| C38 | `prepare.cli:355` `["done", 0]` | mojibake no console | A/B/D (C: skip, só Windows) | PASS |
| C39 | `hermes-harness.unit:90` `["concluded", 0, 3]` | concluir por 300 ms parados | ABCD | PASS |
| C40 | `hermes-harness.unit:220` `[5000, "timeout"]`; nativo `hermes-plugin.native:336` (`concluded`/`inactive`/`failed`/`timeout`); fixture `hermes-harness.unit:320`, `:324`, `:327` | timeout no lugar de falha; cópia vazia ou remoção que engole ausência | ABCD; nativo em A/B/D; o controle da fixture em ABCD (só discrimina no Windows 24.13.0, isto é, em B) | PASS |
| C41 | `store.unit:327-523`; `end.e2e:518` | sucessora com N+1 duplicado | ABCD | PASS |
| C42 | `agent.unit` `I25-C42`; `command.cli:456` Windows `status: 130`; `:424` POSIX | agente iniciado depois do sinal | `agent.unit` ABCD; console em A/B/D; POSIX em C | PASS |
| C43 | `store.unit:598` `{code: "root_changed", opened: true, …, lockLeft: false}`; `end.e2e` `I25-C43` | perder a identidade da abertura | ABCD | PASS |
| C44 | `hermes-harness.unit:288` `[1000, "timeout"]`, `:291` `[5000, "timeout"]`; nativo `I25-C40`/`I4-C22` | `failed` com a contagem aberta | ABCD; nativo em A/B/D | PASS |
| C45 | `agent.unit:132-146`; `command.cli:166-186` | vazio ignorado no POSIX | `agent.unit` ABCD; POSIX em C; controle do Windows em A/B/D | PASS |
| **C46** | T8-C15 `concurrency.cli:220`, `:234`, `:256`; (a)–(c) `:283`, `:300`, `:303`, `:330`, `:355`, `:359-360`; T8-C3/C8/C14/C18 e (d)–(g) `live-capture:341`, `:348`, `:356`, `:367`, `replay.unit:161`, `:100`; (h) `live-capture:227`, `:229-234`, `:242-248`; (i) `follow.cli:195`, `:203-206`; (j) `:215`, `:225-236`; (k) `evidence.unit:54-60`, `:65-83`, `:85-131`, `:133-148`; (l) `failure-matrix.cli:116-119`; **(m) `evidence.unit:254-263`**; (n) `:267-281`; (o) `delivery.unit:52-113`; (p) `concurrency.cli:956-964`, `:998-1004`, `:1015-1018`, T8-C16 `:920-928`; (q) `codex-run.cli:289-291`, `:329`, `:332-333`, `:344`, `:347-348` | ver as seções acima | ABCD | **FAIL como escrito (F1, item (m))** |
| C47 | I23-C10 `agents.e2e:315` (`deepEqual(run.report?.delivery, expected, …)`); (a) `:427`, `:429`; (b) `:442`, `:444`; (c) `control.cli:1071`, `:1073-1077`; (d) `:1097-1098`, `:1100-1105`; evidência comum `evidence.unit:150-182`, `:184-225` | evidência que troca o erro ou vaza dado | ABCD | PASS |
| C48 | estrutural, refeito nesta rodada (`r19/c48-c49-structure.txt`): contra `d0d5a7f`, topo (`name`, `on`, `permissions`, `concurrency`) e `changes`/`verify`/`ci` iguais fora do `timeout-minutes` do `verify` (10 → `${{ matrix.os == 'windows-latest' && 20 \|\| 10 }}`); jobs = `changes`, `ci`, `lock_diagnostics`, `verify`; `governance-C1 C3` (`governance-ci:263-278`) | outro campo do workflow mudado | estrutura fresca + `governance-C1 C3` em D | PASS |
| C49 | `governance-ci:317-358`; estrutura: `if` de `workflow_dispatch`, `windows-latest`, timeout 10, `contents: read`, os dois `uses` pinados, `persist-credentials: false`, `node-version: 24.13.0` sem cache, `npm ci --ignore-scripts`, `node scripts/ci-lock-latency.mjs`, sem `needs`/`continue-on-error`, `ci.needs` = `[changes, verify]` | job manual entrando no agregado | D + estrutura fresca | PASS |
| C50 | (a)–(n), as citações da R16 (`ci-lock-latency.test` blob `75eeadd`, script `8c12894`, iguais) | percentil interpolado, zero para dado ausente, `RUNNER_TEMP` herdado | D, com os `C50` e `RUNNER_TEMP` presente | PASS |

**AC → checks** (9 ACs de `context-round19.json`, o mesmo corpo do contexto 18):
- AC1–AC6: C1–C45, todos provados;
- AC7: C46, **não provado como escrito (F1, item (m))**; todo o resto do C46 está provado;
- AC8: C47 e C48;
- AC9: C49 e C50. A execução remota da medição e os cinco checks regulares continuam como condição de merge, não de revisão de código.

## Swept `existing` (relido no HEAD)

- **Idempotência**: `privacy/lifecycle.mjs:23-24` (`stop` sobre `stopped` → `changed: false`), sem diff desde `63621c6`.
- **Sem reenvio**: `traces/delivery.mjs:57` (“encerra a tentativa sem reenviar”) e `:123` (“nunca é reenviada”). As linhas mudaram com `322bcad` (antes `:55-57`/`:111-113`), e o texto é o mesmo. O abandono terminal reforça essa regra.
- **Falha de entrega não bloqueia**: `traces/delivery.mjs:156` (“a entrega nunca lança para a observação”).
- **`privacy prune` existente**: `privacy/command.mjs:56-57`, sem diff.

## Observações (não bloqueantes; nada corrigido)

- **O1 — linha do arquivo do teste por contagem.** Com o arquivo do teste, `recordedProducer` toma como linha do produtor a contagem de linhas no `close` menos 1 (`producer-runs.mjs:54`). Isso está certo para produtores em sequência, que é o caso de todos os usos atuais nos 7 arquivos (Análise acima). Dois produtores simultâneos no **mesmo** arquivo do teste poderiam trocar as linhas. Nenhum caso atual faz isso.
- **O2 — limpeza do registro no 24.13.0.** `finishRecording` remove o scratch do registro por `rmSync(force)` (`producer-runs.mjs:29`). No Windows com o 24.13.0 e “ação” no caminho, esse `rmSync` não remove nem lança; é o defeito do Node registrado no Landing `:102`, mantido nas outras 37 consumidoras. Em B, 1.031 entradas ficaram na raiz isolada e foram removidas com ela. Não é falha de prova, mas o temporário cresce fora de um gate isolado.
- **O3 — nome forte remanescente** (resto do O1 da R17). Os comentários da pré-carga (`traces-probe.mjs:44-49`) e do apoio (`traces.mjs:311-315`) agora dizem “compatível” e “coincidência”. O nome e o comentário do controle `replay.unit:143`/`:148` ainda dizem “mostra quem deixou o lock”. As saídas não afirmam causa.
- As observações O2–O5 da R17 continuam como estão no texto abaixo. A O4 está em parte coberta: (n) cobre o lock ilegível e (k) cobre `sem amostras`. O ramo `presente, de outro processo` continua sem controle, e o C46 não o exige.

## Gates remotos — pendentes e obrigatórios (nenhum ocorreu aqui)

1. Decidir e corrigir o F1, que é documental ou de prova. Depois, a verificação do conteúdo novo, se o root assim registrar. Este relatório **não** autoriza a formal 12 sobre `5ee0e0f` como se tivesse PASS.
2. A formal do root, com PASS antes.
3. Com PASS e `ready`, a publicação no PR #28. A governança só permite a execução remota depois de `ready`; ela não é impossível, está pendente.
4. **Uma** execução manual do `lock_diagnostics` sobre o HEAD aprovado e publicado, com o registro dos resultados.
5. Os **cinco checks regulares verdes** nesse HEAD, conferidos na matriz do PR e na manual, e a reconferência das fontes.
6. O merge, só com 4 e 5 cumpridos. Nenhuma condição foi dispensada.

O HEAD publicado continua `93bd1e9`. A CI do PR 40728221657 e a execução manual 40728249484 ficam **vermelhas** no Windows e preservadas no histórico, com Ubuntu e macOS `SUCCESS`. As falhas foram:
- **I23-C4**: o hook Claude CLI da rota automática. É processo filho, não produtor em processo; um briefing anterior disse “em processo”, incorretamente.
- **T8-C12**: `0 !== 1`, sem relatório.
- **T8-C13**: `lock_present`.
- **T8-C2**: `delivery_timeout`.

A causa histórica é desconhecida. A medição 122957247705 (4.500/4.500 ciclos, relato do root/autor) é sintética e não substitui a CI regular vermelha. Nenhum resultado local desta rodada substitui a CI do Windows. O uso real continua no `Unresolved` 2.

## Processo, limites e limpeza da R19

**Executado.**
- git só de leitura: `rev-parse`, `status`, `log` (também `-S`), `show`, `diff`, `ls-tree`, `ls-files --eol`, `cat-file`, `check-ignore`, `get-tar-commit-id`. Também `git -c core.autocrlf=false archive` do HEAD para a minha pasta e `git clone --no-hardlinks --no-checkout --config core.autocrlf=true` do repositório local, sem rede, com a configuração só no clone.
- `node` só de leitura: catálogo, contexto, YAML do workflow, TAP e log. Também `sha256sum`, `python -I` (sha do zip oficial e CR do bin) e `stat`.
- A, B, C e D, uma vez cada, sem repetição. O WSL foi chamado com `wsl.exe -d Ubuntu -u oldboydev --exec /bin/bash --noprofile --norc` e `MSYS_NO_PATHCONV=1`. Fora do gate, li só versões e caminhos de sistema (`/usr/bin/nsolid`, npm, links das ferramentas), nada do perfil.

**Não executado.**
- RED, mutações e sondas, inclusive as do autor (sonda de 400 rodadas, controles RED de (o)–(q), comparação dos relógios).
- Agentes reais, `--help`/`--version` de agente, sondas de PATH, perfis, credenciais, banco, modelo, rede, relógio do host, antivírus, Git global e runtimes fora das provas. O Hermes real rodou só pelas provas nativas versionadas de A, B e D, com o runtime local e o `HERMES_HOME` temporário delas.
- Actions, CI, `review:run`, commit, push, PR, merge, alteração de limites e subagentes.
- O incidente da R5 (`ffc5937`) não foi desfeito nem repetido. A retificação de `0eaae31` (1.257 pastas no Windows e 107 no WSL removidas por prefixo/tipo/janela, sem prova de proveniência) fica como está: não repeti, não auditei e não li conteúdo alheio. A auditoria externa 17 (perfil WSL do Codex, 12.113 entradas, zero alterações) não desfaz isso.
- **Auditoria externa 19 (do root, só metadados do perfil)**: às 19:51:10, logo depois do meu D, `verifier-round19/profile-comparison-final.json` ainda não existia. O root o gravou às 19:51:45 (376 bytes). Li só o resumo de nível superior, sem abrir `profile-before.json` nem listas de entradas:
  - escopo declarado: “External metadata-only audit from before the ci93 shared diagnostics author proofs through completion of independent Round19 proofs; not a content audit or undo for Round5”;
  - linha de base às 14:01:56 (-03) e fechamento às 19:51:46 (-03), depois do fim do meu D (19:50:55);
  - `baselineEntries` 12.113, `afterEntries` 12.113, e `errors`, `added`, `removed` e `modified` vazios.

  É **resultado externo do root**. Não a executei e não a conto como minha. Pelo escopo que ela mesma declara, não é auditoria de conteúdo, de temporários nem de configuração global, e não desfaz o incidente da R5.

**Limites.**
- **macOS**: o `I4-C25m` não rodou em ambiente nenhum desta rodada; só a CI macOS o executa.
- **D no Windows**: o D roda no Windows e não vira POSIX porque C passou.
  - Os 7 skips do doctor (POSIX/FIFO, `tests/doctor/*`, fora da lista de 43) **não rodaram em ambiente nenhum** desta rodada.
  - O `I4-C25l` (contrato do módulo de ACL POSIX, `posix-acl.unit`, fora da lista) também não rodou.
  - Os outros skips de integração do D rodaram e passaram em C (Execuções).
- **ACL, PTY e FIFO**: ACL POSIX rodou só no WSL (I4-C25b/j/k); PTY só em C (I25-C15); FIFO do doctor em lugar nenhum.
- **Runtime do Hermes**: ausente em C. O ramo Hermes do I4-C35 e os 11 nativos rodaram só no Windows (A, B, D). O caso pelo Python do sistema (`I23-C8 … pelo Python do sistema`) não é runtime do Hermes.
- **Comportamento sem comparação**: o “custo da pré-carga” não foi medido por mim, e a comparação de relógios é do autor.
- **Causas**: as causas históricas (CI 93, T8-C4, D interrompido de `dc0db9b`) continuam desconhecidas.

**Limpeza** (`A-run.txt`, `B-run.txt`, `B-clone-cleanup.txt`, `C.run.txt`, `D-run.txt`):
- as raízes isoladas de A, B e D foram removidas só pelo registro da criação: caminho real absoluto, filha direta do temporário, nome `sm-v19-<rótulo>-`, pasta não link e mesmo `dev`/`ino`;
- o scratch de C foi removido pelo caminho exato, pasta não link, uid 1000 e inode;
- o clone de B foi removido pelo caminho exato, depois de conferir toplevel, HEAD e status;
- as pastas `runner-temp-A`/`-B`/`-D`, vazias, foram removidas por `rmdir`;
- nenhuma seleção por prefixo ou mtime em pasta global;
- nenhum processo meu ficou em segundo plano, e nenhum processo alheio foi encerrado.

Ficam em `verifier-round19/r19/`: logs, TAP/spec, matrizes, o tar do HEAD, a cópia do blob do relatório R18 para a comparação de bytes e os meus scripts. Os `profile-*` do root, na pasta-mãe, não foram tocados.

**Integridade do histórico abaixo.** O texto depois da linha `---` final deste relatório é, byte a byte, o blob `1dd923d` (`.verified.md` de `93bd1e9`, o mesmo no HEAD; 164.557 bytes, sha256 `5b3270b6…`, 0 CR): o adendo R18 (PASS 50/50 em `d8da3c0`), o relatório FAIL 17 e, abaixo dele, os adendos R16 e R15 e o relatório R14. Fica como histórico, sem rebatizar nenhum resultado.
- O PASS 18 foi dado a `d8da3c0`, antes de `48b191a`…`68f84c4`. Ele não cobre o código desta faixa.
- Os gates frescos desta rodada substituem o carry de A/B/C/D da R17 para o HEAD atual.
- Os resultados intermediários do autor também ficam preservados como estão nos registros, sem virar aprovação: `60bbda8` (B 7 fail, C 1 fail), `c0d61d7` (B 1 fail) e `cd4afc2` (B 1 fail), além do D interrompido de `dc0db9b`.

---

# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25 (rodada 18, adendo documental)

**Verdict (R18)**: **PASS — 50/50 checks provados como escritos**, 9 ACs, HEAD `d8da3c0`. O F1 da R17 está resolvido: o C46 (g) agora diz `delivery_timeout` 2/0/0/2, que é exatamente o valor que a prova versionada afirma. Nenhum critério saiu, nenhum valor ficou mais frouxo, e nenhum arquivo executável mudou desde `45b512b`.
- **Não executei testes.** Esta rodada é só documental, por instrução do despacho (registro 18). Os resultados de A, B, C e D são **da R17 em `45b512b`** (carried from `45b512b`; relatório FAIL 17 preservado em `1ef4c72`). Valem para `d8da3c0` só porque o conteúdo executável é idêntico (prova Git abaixo). Nada aqui é uma execução nova no HEAD, e não há D novo.
- **F1 resolvido (verified at `d8da3c0`, por leitura)**: o checklist `:441` diz `delivery_timeout` 2/0/0/2, e `replay.unit.test.mjs:156` afirma `lost("delivery_timeout", 2)`, isto é, `{bound: true, code: "delivery_timeout", entries: 2, committed: 0, persisted: 0, lost: 2}` (`:141`), num `deepEqual` estrito. O motivo escrito em `:442-444` confere com o código:
  - o ingest recebe um registro válido e `{quebrado` (`replay.unit:65`; já era assim na base, `63621c6:…:39`);
  - a linha malformada entra pela entrega (`observation.mjs:95` → `traces/delivery.mjs:208` → `:193` `counts.entries += 1`);
  - o T8-C18 saudável afirma `counters.malformed` 1 (`replay.unit:95`).
- **Gates da R17 carregados** (amostrados nos logs, não reexecutados): A 80/74/0/6; B 80/74/0/6; C 80/76/0/4; D 1.029/1.009/0/20, com os 12 nativos. O controle do (g) aparece como `ok 80` em A, B e C e como `✔` no D.
- **Causa** das falhas T8 da CI 767 do Windows: **continua desconhecida.** Os campos do laço de eventos e a coincidência de `pid` são correlação compatível, não causa comprovada.
- **Gates remotos: pendentes e obrigatórios.** Nenhuma CI, Actions, medição, `review:run`, commit, push ou merge ocorreu aqui.

**Profile**: light (`AGENTS.md:138`). Rodada 18, **documental e escopada**: o diff da correção e o único verdict não-PASS da R17 (C46). Pelo perfil, não há fault injection, `Coverage`, `Test policy` nem fonte de UI. Não fiz execuções, mutantes, sondas nem correções.
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..d8da3c0408296f54cf555df8375a639efcd122b1`, a feature inteira: 108 commits, árvore `fb547514…`. Desde a R17 (`45b512b`) entraram 2 commits:
- `1ef4c72`: o relatório FAIL 17 (só `.verified.md`);
- `d8da3c0`: o literal do C46 (g) e o bloco “Achado F1” do Handoff (só o checklist).

**Round**: **18** (light). Base: “Pode fazer quantas precisar” e o escopo [6467154706](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706), com o registro 18 em [6474389408](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6474389408). Esse registro é o 29º comentário de `context-ci28-verifier18-final.json`. O corpo e os comentários 1–28 são idênticos aos do contexto 17, e o corpo tem 9 ACs (`- [ ]`). A exportação não traz as URLs; o número vem do despacho. As 17 verificações e as 10 revisões formais ficam preservadas. O `state.json` tem 10 tentativas: 1–3 `changes_requested`, 4–7 `ready`, 8 `blocked`, 9 e 10 `ready`. O sha256 é `13b4df49…`, o mesmo antes e depois deste relatório. `roundOverrides["25"].maxRounds` continua 11, e nada aqui pede 12. A formal 11, já registrada, é do orquestrador depois deste PASS; não rodei `review:run`.
**Verifier**: subagente novo e independente (Claude Opus 5.5). Não sou o autor nem o Verifier 17 e não herdei sessão. Produto, testes, apoios, scripts, workflow, task, checklist, configuração e estado ficaram só para leitura. Escrevi apenas este arquivo e logs em `.checks/code-review/issue-25/verifier-round18/`, uma pasta ignorada (`.gitignore:4`).

Data: 28/10/2026, das 13:21 às 13:29 (-03). O HEAD foi `d8da3c0` do início ao fim. `git status --porcelain=v1 -uall` estava vazio no início; no fim, só este arquivo aparece modificado.

## Fontes lidas (R18)

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md`, `tlc-implement/references/verify.md` | inteiros |
| relatório FAIL 17 (blob `2671bc9`, de `1ef4c72`, igual no HEAD) | cabeçalho, F1, prova Git, execuções, C46, tabela dos 50, gates e limites; o histórico abaixo dele só pela integridade de bytes |
| `git diff 45b512b..HEAD` | inteiro: 2 arquivos, os dois em `.checks/` |
| `.checks/issue-25-agent-launch.md` no HEAD | C46 inteiro (`:382-457`), o bloco “Achado F1” (`:1015-1035`) e todas as linhas com `N/0/0/N` |
| `.tasks/issue-25-agent-launch.md` (blob `275f6bb`, sem diff) | refinamento T8 do critério 38 (`:331-348`); busca por `T8-C18`, `quebrado`, `delivery_timeout` e `N/0/0/N` |
| build (`f465b84`) e handoff `ci40709943742` (`5fa6d75`), sem diff | só a busca por `N/0/0/N` e `T8-C18` |
| `replay.unit.test.mjs` | `:43-166`: a rotina, o T8-C18 e o controle do (g) |
| `traces/delivery.mjs:140-215`, `observation.mjs:70-100` | só o caminho da entrada malformada |
| `live-capture:536-544`, `agents.e2e:433-441` | só as asserções dos outros `1/0/0/1` |
| `context-ci28-verifier18-final.json` | comparado ao contexto 17 por `node -e` |
| logs da R17 | amostra (abaixo). Não li `profile-*` |

## F1 — resolução (verified at `d8da3c0`, por leitura)

| Item do C46 (g) | Checklist no HEAD | Prova (`replay.unit.test.mjs`, blob `810489a`, o mesmo da R17) | Conferência |
| --- | --- | --- | --- |
| `stop` 4 e mensagem `stop: {…lock_present…}\n<evidência>` | `:438-439` | `:151-152`; `:154` `startsWith` | igual (sem diff) |
| `hook claude pre_tool_bash` `DELIVERED(1)` | `:440` | `:156` `DELIVERED_ONE` (`:140`) | igual |
| **`ingest hermes` `delivery_timeout`** | **`:441` 2/0/0/2** | **`:156` `lost("delivery_timeout", 2)`** (`:141`) | **igual (era o F1)** |
| pendente `open segmento.tmp (sob o lock, 2ª tomada)` | `:441-442` | `:157` | igual |
| motivo: um válido mais `{quebrado`; a malformada conta; o saudável afirma `counters.malformed` 1 | `:442-444` | `:65` (stdin); `:95` `deepEqual(received.capture.counters.malformed, 1, …)` | confere |
| `post_tool_skill` `lock_present` 1/0/0/1 e disputa repetida | `:445` (era `:443`) | `:156` `lost("lock_present", 1)`; `:158` | igual |
| captura `indisponível [lock_present]`, lock de `ingest hermes` | `:446` | `:159` | igual |
| sem raiz, ID, chave, PATH nem canários | `:448` | `:160-164` | igual |

**Equivalência, sem perda de contrato** (`c46g-literals.txt`, `c18-original-input.txt`, `task-handoff-c18.txt`, `build-handoff-literals.txt`, `other-1001.txt`):
- **O diff do checklist tem dois trechos** (`@@ -441,2 +441,4 @@` e `@@ -1011,0 +1014,22 @@`): o item (g), em que só mudam o literal e o motivo, e o bloco novo no fim do Handoff. Os outros itens de (g), os itens (a)–(f), os outros 49 checks, o Landing e os Swept não mudaram.
- **O valor novo é exato** e é o de uma asserção exata. Nada foi trocado por presença, intervalo ou `> 0`.
- **O 2 vem da entrada original do T8-C18**, que o pedido humano manda manter. Na base `63621c6`, `replay.unit:39` já mandava `pre_tool_call` mais `{quebrado`, e `:56` já afirmava `counters.malformed` 1. `traces/delivery.mjs` e `observation.mjs` não têm diff desde a base. Um 1/0/0/1 exigiria mudar a entrada; com a rotina e os prazos mantidos, 2/0/0/2 é o único valor compatível.
- **O erro era documental.** `git log -S` do texto antigo dá só `4d3b1d9`, onde ele entrou (registro antes do código), e `d8da3c0`, onde saiu. Task, build e handoff não têm diff e não fixam número para esse ingest; não há requisito humano de 1.
- **Os outros `1/0/0/1` ficaram iguais**, cada um com a sua base:
  - (g) `post_tool_skill` (`:445`): `lost("lock_present", 1)`;
  - Landing `:91`, T8-C8 da CI: observação de log de um ingest de 1 registro, e a prova afirma `DELIVERED(1)` nesse ingest (`live-capture:543`);
  - Landing `:85`, I23-C10 da CI: o controle C47 (b) afirma `{automatic: true, code: "delivery_timeout", entries: 1, committed: 0, persisted: 0, lost: 1, unrouted: 0}` (`agents.e2e:437`).
- **O bloco “Achado F1” do Handoff** (`:1015-1035`) confere com os fatos: os números da R17 batem com os logs (abaixo); os outros `1/0/0/1` que ele nomeia são exatamente esses três; “nenhum teste foi executado” refere-se ao autor e é coerente com o diff; e ele não afirma PASS nem `ready`.

## Prova Git (verified at `d8da3c0`; `verifier-round18/blob-identity.txt`, `key-blobs.txt`, `r17-report-integrity.txt`)

- **Árvore inteira**: `git ls-tree -r` dá 319 caminhos em `45b512b` e no HEAD, e só 2 linhas diferem:
  - `.checks/issue-25-agent-launch.md`: `eb6f6f8` → `91c76d3`;
  - `.checks/issue-25-agent-launch.verified.md`: `c3db7e2` → `2671bc9` (o relatório R17).

  Os outros 317 caminhos têm o mesmo modo e o mesmo blob.
- **Executáveis**: `git diff --stat 45b512b HEAD -- src tests scripts .github package.json package-lock.json .gitattributes docs README.md code-review.config.json .tasks` sai vazio. O último commit que toca executáveis continua `51679df`.
- **Blobs**, os mesmos da R17:
  - provas `replay.unit` `810489a`, `live-capture` `56cf953`, `query.cli` `0fee8d0`, `concurrency.cli` `a078c1e` e `agents.e2e` `669e9a4`;
  - apoios `helpers/traces.mjs` `18f4c82` e `traces-probe.mjs` `e6bd5bd`;
  - produto `traces/delivery.mjs` `2517a97` e `observation.mjs` `45192e7`;
  - `package.json` `8fd02fa`, `package-lock.json` `9ec32e0` e `.gitattributes` `7772ad3`;
  - workflow `governance.yml` `474a87b`;
  - script do C50 `8c12894` e a prova dele `75eeadd`.
- **Core**: os 5 arquivos de `scripts/code-review/` têm os mesmos blobs na base e no HEAD (`25e5284`, `c6a4abc`, `1bda8e4`, `216125c`, `b02001e`).
- **Configuração**: `code-review.config.json` `57d88b5`, sem diff desde `45b512b`. O override `25` é `{profile: "light", maxRounds: 11}`, e os outros overrides são 3:9, 4:10, 5:10, 6:3, 7:35, 8:3 e 23:4.
- **Nenhum leitor dos arquivos que mudaram** (`changed-doc-readers.txt`). Em `src`, `tests`, `scripts`, `.github` e `package.json`, as menções a `issue-25-agent-launch.md` são todas comentários, e nenhum `readFile*` lê `.checks/`. O `docs.test` lê `README.md` e `docs/*.md`. As duas mudanças não podem alterar o resultado de nenhuma prova.
- **Relatório R17 íntegro**: o blob em `1ef4c72` e no HEAD é `2671bc9…` (sha256 `7896bc76…`, 141.401 bytes, 0 CR), e o blob R16 `c3db7e2` (101.477 bytes) é exatamente o sufixo dele, como a R17 declarou.

## Carry das provas da R17 (carried from `45b512b`; `r17-carry-sample.txt`, `r17-carry-names.txt`)

Logs em `verifier-round17/`. Li os logs e recalculei as contagens; não reexecutei nada.

| Item | Amostra | Confere com a R17 |
| --- | --- | --- |
| env de A, B e D | `HEAD=45b512b13eee…` e `tree=01a96202…`; o `HEAD_depois` do D é o mesmo; C tem `tree` e `tree_depois` `01a96202…` | sim |
| Node | A e D `v24.22.1`; B `v24.13.0`, npm 11.6.2, `npm_execpath=ausente`; C `v24.13.0`, `sh_beside_node=nao` | sim |
| tar de C | `get-tar-commit-id` recalculado: `45b512b…`; 5.980.160 bytes; sha256 `cd6bb2b2…` | sim |
| TAP de A (`ec4074e4…`) | `# tests 80`, `pass 74`, `fail 0`, `skipped 6`; 0 `not ok` | sim |
| TAP de B (`8ccc22bf…`) | 80/74/0/6; 0 `not ok` | sim |
| TAP de C (`e23827d1…`) | 80/76/0/4; 0 `not ok` | sim |
| log do D (`9760e607…`) | governança 25/25/0/0, motor 16/16/0/0, doctor 417/410/0/7 e integrações 571/558/0/13, somando 1.029/1.009/0/20; nenhum `✖`. `D-natives.txt`: 12 de 12, sem o texto de skip do runtime | sim |
| nomes | 80 nomes únicos em cada TAP; A = B = C (recalculado) | sim |
| controle do (g) | `ok 80 - I25-C46 diagnóstico do T8-C18: …` em A, B e C; `✔` no D (`:1124`); o nome está em `replay.unit:143` | sim |
| C46, C47 e T8 | em A, B e C, todos `ok` e 0 `not ok`: os 7 `I25-C46`, os 2 `I25-C47`, `T8-C3`, `T8-C8`, `T8-C14`, `T8-C15`, `T8-C18` e `I23-C10` | sim |

Os skips, os motivos e onde cada um rodou são os da R17, sem mudança: 6 em A e B, 4 em C e 20 no D. Os 7 do doctor, os 6 do I4 e o `I25-C15` (pty) não rodaram em ambiente nenhum da R17. O C15 é carregado da R14 pela identidade do blob.

## Checks — 50/50 (R18)

As citações são as da tabela da R17 abaixo, copiadas linha a linha. Valem no HEAD porque nenhum arquivo citado mudou: os blobs e as linhas são os mesmos. Só a linha do C46 muda, pelo (g). Na coluna “Prova”, “nesta rodada” é a R17.

| Check | Asserção decisiva (citação da R17; mesmo blob no HEAD) | Prova (R17, `45b512b`) | R18 |
| --- | --- | --- | --- |
| C1 | `command.cli:48-49` `private === true`, `bin` = `{"skill-me": "src/integrations/launch/cli.mjs"}`; `:65` `[0, SKILL_ME_HELP, ""]`; `:77` `gitStatus() === before` | ABCD; B em clone novo `autocrlf=true` com `cli.mjs` `i/lf w/lf attr/text eol=lf`, 0 CR antes e depois | PASS (carry `45b512b`) |
| C2 | `command.cli:96-98` `argv: LITERAL_ARGS` para os 3 agentes | ABCD | PASS (carry `45b512b`) |
| C3 | `command.cli:105` `{0: 0, 7: 7}` | ABCD | PASS (carry `45b512b`) |
| C4 | `command.cli:130-133` `{status: 127, [launcher_requires_shell], sentinel: false}`; `agent.unit` `I25-C4` | A/B/D (C: skip, só Windows) + D | PASS (carry `45b512b`) |
| C5 | `command.cli:228` POSIX `["SIGINT","SIGQUIT","SIGHUP"]`; `:244-245` `CTRL_C_EVENT` → `["SIGINT"]` | POSIX em C; console em A/B/D | PASS (carry `45b512b`) |
| C6 | `command.cli:267` `signals: ["SIGTERM"]` | C (A/B/D: skip, sinais POSIX) | PASS (carry `45b512b`) |
| C7 | `prepare.cli:93-94` `{status: 127, stdout: "", code: true, asked: false}` | D | PASS (carry `45b512b`) |
| C8 | `prepare.cli:122-126` texto exato até cada pergunta, árvores iguais | D | PASS (carry `45b512b`) |
| C9 | `prepare.cli:163-168` `observe.json` da #23 | D | PASS (carry `45b512b`) |
| C10 | `prepare.cli:189-191` `{exitCode: 3, …, started: false, root: false}` | D | PASS (carry `45b512b`) |
| C11 | `prepare.cli:200` `{exitCode: 2, code: true, …, relative: false, config: false}` | D | PASS (carry `45b512b`) |
| C12 | `prepare.cli:223` `status: 3`, linha `setup_required` | D | PASS (carry `45b512b`) |
| C13 | `prepare.cli:238` SHA-256 iguais, `started: 1` | D | PASS (carry `45b512b`) |
| C14 | `prepare.cli:250` `observe_on` 4 | D | PASS (carry `45b512b`) |
| C15 | `prepare.cli:408` `{status: 3, declined: true, trees: before}` (pty) | **não rodou nesta rodada**: só POSIX, e `prepare.cli` não está no alvo C. No D do Windows, skip (“pseudoterminal só no POSIX; no Windows o primeiro uso é provado em processo (C8–C14)”). **Carregado da R14** (C em `13bb1d4`; blob `8d0a49d` igual) | PASS (carry da R14, via R17) |
| C16 | `session.e2e:67` `{origin: "launch", …, limits: {maxEvents: 500, maxBytes: 8388608}}` | D | PASS (carry `45b512b`) |
| C17 | `store.unit:79` `["launch", invocation, 1, "2026-10-26T10:00:00.000Z"]` | D | PASS (carry `45b512b`) |
| C18 | `session.e2e:111` `stderr: "skill-me: não foi possível abrir a execução [<código>]\n"` | D | PASS (carry `45b512b`) |
| C19 | `session.e2e:161` `[0, 0]` | D | PASS (carry `45b512b`) |
| C20 | `session.e2e:190-192` `code: "binding_invalid"` | D | PASS (carry `45b512b`) |
| C21 | `session.e2e:208-211` bytes iguais | D | PASS (carry `45b512b`) |
| C22 | `session.e2e:230` `[1, "stopped", 500, 500, {}]` | D | PASS (carry `45b512b`) |
| C23 | `session.e2e:282` `["active", MAX_BYTES, {}, 1]` | D | PASS (carry `45b512b`) |
| C24 | `store.unit:168` `[opened.capture, "stopped", 1]` | D | PASS (carry `45b512b`) |
| C25 | `end.e2e:80-89` stderr exato do resumo | ABCD | PASS (carry `45b512b`) |
| C26 | `end.e2e:101-109` `eventos gravados: 0.` e a dica | ABCD | PASS (carry `45b512b`) |
| C27 | `end.e2e:120` `{launch: true, code: "launch_ended", …, lost: 1}`; `store.unit` `I25-C27` | ABCD + D | PASS (carry `45b512b`) |
| C28 | `end.e2e:164-165` `persisted` 3 e `stopped`; regressão `end.e2e:194` `["EIO"]` | ABCD | PASS (carry `45b512b`) |
| C29 | `command.cli:278` término pelo sinal | ABCD | PASS (carry `45b512b`) |
| C30 | `command.cli:342` `captures: [[1, "stopped", 0]]` | ABCD | PASS (carry `45b512b`) |
| C31 | `end.e2e:205-215` `[lock_present]`, `continua active`, `privacy stop` | ABCD | PASS (carry `45b512b`) |
| C32 | `end.e2e:320` `"eventos intercalados: B terminou antes"`; `store.unit:715` `lock_present` | ABCD + D | PASS (carry `45b512b`) |
| C33 | `end.e2e:460` `active`; `:493-494` `spawn sh ENOENT` (arranjo POSIX) | ABCD; o arranjo POSIX em C | PASS (carry `45b512b`) |
| C34 | `report.cli:159` `[newInv, true]` | D | PASS (carry `45b512b`) |
| C35 | `report.cli:252-259` `not_configured` / `no_launch_capture`, `schemaVersion: 1` | D | PASS (carry `45b512b`) |
| C36 | `command.cli:350` `[0, SKILL_ME_HELP, ""]` | ABCD | PASS (carry `45b512b`) |
| C37 | `docs.test:82` `deepEqual(observed, expected)` (os 9 limites) | D | PASS (carry `45b512b`) |
| C38 | `prepare.cli:355` `["done", 0]` | D (console do Windows) | PASS (carry `45b512b`) |
| C39 | `hermes-harness.unit:88` `["concluded", 0, 3]` | D | PASS (carry `45b512b`) |
| C40 | `hermes-harness.unit:196-225` `[5000, "timeout"]`; nativo `hermes-plugin.native:335` (`concluded`/`inactive`/`failed`/`timeout`) | D, com os 12 nativos | PASS (carry `45b512b`) |
| C41 | `store.unit:327-523`; `end.e2e:518` | ABCD (`end.e2e`) + D (`store.unit`) | PASS (carry `45b512b`) |
| C42 | `agent.unit` `I25-C42`; `command.cli:456` Windows `status: 130`; `:424` POSIX | D; console em A/B/D; POSIX em C | PASS (carry `45b512b`) |
| C43 | `store.unit:598` `{code: "root_changed", opened: true, …, lockLeft: false}`; `end.e2e` `I25-C43` | D + ABCD | PASS (carry `45b512b`) |
| C44 | `hermes-harness.unit:263-271` `[1000, "timeout"]`; nativo `I25-C40 \|I4-C22` | D, com os nativos | PASS (carry `45b512b`) |
| C45 | `agent.unit:132-146`; `command.cli:166-186` | D; POSIX em C; controle do Windows em A/B/D | PASS (carry `45b512b`) |
| C46 | (a)–(f), T8-C15 e T8-C3/C8/C14/C18: tabela “C46 — citações renovadas” da R17, sem diff. **(g)**: `replay.unit:156` `deepEqual([first.delivery, ingest.delivery, second.delivery], [DELIVERED_ONE, lost("delivery_timeout", 2), lost("lock_present", 1)], …)` (`:140-141`), igual ao checklist `:441`, agora 2/0/0/2; `:151-152`, `:154` e `:157-164` como na R17 | ABCD (os 7 `I25-C46`, o `T8-C15` e os 4 T8) | **PASS** (F1 resolvido; leitura em `d8da3c0`, provas carregadas) |
| C47 | tabela “C47” (`agents.e2e:307-311`, `:401-403`, `:422-444`) | ABCD | PASS (carry `45b512b`) |
| C48 | estrutural: workflow com o blob `474a87b` da R14/R16 (conferência da R14 contra `d0d5a7f` carregada); `governance-C1 C3` (`governance-ci:263-278`) | estrutura carregada por blob + `governance-C1 C3` em D | PASS (carry `45b512b`) |
| C49 | `governance-ci:317-358` | D | PASS (carry `45b512b`) |
| C50 | (a)–(n), citações da R16 (`ci-lock-latency.test` blob `75eeadd`, script `8c12894`, iguais aos da R16) | D, com os 18 `C50` e `RUNNER_TEMP` presente | PASS (carry `45b512b`) |

**AC → checks** (9 ACs do contexto 18, o mesmo corpo do 17):
- AC1–AC6: C1–C45;
- AC7: C46, agora provado como escrito;
- AC8: C47 e C48;
- AC9: C49 e C50. A execução remota e os resultados continuam como condição de merge, não de revisão de código.

## Observações (não bloqueantes; carregadas da R17; nada corrigido)

As observações O1–O5 da R17 continuam como estão no texto abaixo, porque nenhum dos arquivos que elas citam mudou. Não exigem correção cosmética nem nova rodada, e esta rodada não acrescenta nenhuma.

## Gates remotos — pendentes e obrigatórios (nenhum ocorreu aqui)

1. A formal 11 do orquestrador sobre o HEAD verificado. Há 10 tentativas usadas e o teto é 11, sem aumentar para 12.
2. Com `ready`, a publicação no PR #28.
3. **Uma** execução manual da medição (`lock_diagnostics`) sobre o HEAD aprovado e publicado, com o registro dos resultados.
4. Os **cinco checks regulares verdes** nesse HEAD e a reconferência das fontes.
5. O merge humano, só com 3 e 4 cumpridos, sem exceção.

A CI 767 do Windows (run 40709943742 e execução manual 40710014746) continua FAIL no histórico e fica preservada. A medição manual histórica (job 122892425130; 4.500 de 4.500 ciclos sem erro, segundo o build `:1815`, que é relato do autor) é do orquestrador sobre `76705f9`. Ela não é medição deste HEAD, e nenhum resultado local substitui a CI do Windows. A causa histórica das falhas T8, do I23-C10 e dos `lock_present` continua **desconhecida**. Os campos do laço de eventos e a coincidência de `pid` são evidência compatível, uma correlação, não causa comprovada.

## Processo, limites e limpeza da R18

**Executado.**
- git só de leitura: `rev-parse`, `status`, `log` (também `-S`), `diff`, `ls-tree`, `grep`, `show`, `cat-file`, `hash-object`, `check-ignore`, e `get-tar-commit-id` sobre o tar já existente da R17.
- `sha256sum`, `cmp`, `diff`, `grep` e `sed` sobre arquivos versionados, logs da R17 e cópias minhas.
- `node -e` só de leitura (configuração, `state.json` e os contextos 17 e 18) e `node` com o meu gerador da tabela (`r18-checks-table.mjs`), que só lê a cópia do relatório R17 e escreve na minha pasta.

**Não executado.**
- Nenhuma prova: nem A, B, C ou D, nem `npm test` ou `node --test`. Também nenhum RED, mutação ou sonda.
- Agentes reais, perfis, credenciais, banco, modelo, rede, host, WSL, runtimes e Git global.
- Actions, CI, `review:run`, commit, push, PR, merge, alteração de limites e subagentes.
- A auditoria externa de metadados da R17 (raiz com 12.113 entradas, zero mudanças e zero erros antes e depois, segundo o despacho) é do orquestrador. Não a executei, não li `profile-*` e não a conto como minha.
- O incidente da R5 (`ffc5937`) e o seu histórico (até 5 Codex no WSL, 12 mtimes sem linha de base) ficam preservados; não desfiz nem sondei nada.

**Limites.**
- O `verify.md` pede que as provas rodem de novo, inteiras, no HEAD novo. Aqui não rodaram, por instrução explícita do despacho, que proíbe repetir sem necessidade. A regra foi substituída pela identidade dos 317 caminhos e pela ausência de leitores dos 2 documentos que mudaram. Isso é carry: **não é verde fresco de `d8da3c0`**.
- Os limites da R17 continuam: POSIX, FIFO e macOS do D, macOS e o runner não foram executados, e as causas continuam desconhecidas.

**Limpeza.** Não há o que limpar: não criei temporário, clone, scratch nem processo fora de `verifier-round18/`. Lá ficam os logs, as listas de árvore, as cópias dos blobs dos relatórios R17 e R16 para a comparação de bytes e os meus scripts. Nenhum processo meu ficou em segundo plano.

**Integridade do histórico abaixo.** O texto depois da linha `---` final deste adendo é, byte a byte, o blob `2671bc9` (`.verified.md` de `1ef4c72`, o mesmo no HEAD): o relatório FAIL 17 e, abaixo dele, os adendos R16 e R15 e o relatório R14. Fica como histórico. O FAIL 17 estava certo para `45b512b`; esta R18 resolve o achado dele em `d8da3c0`, sem reescrevê-lo.

---

# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25 (rodada 17)

**Verdict (R17)**: **FAIL — 49 de 50 checks provados como escritos; o C46 não.** 9 ACs, HEAD `45b512b`. Os gates frescos passaram todos (abaixo); o FAIL vem de um único achado de conferência entre o checklist e a prova, não de teste vermelho nem de defeito de produto.
- **F1 (bloqueante; C46 (g), checklist × prova)**: o checklist (`.checks/issue-25-agent-launch.md:441`) fixa que, na rotina do T8-C18 com `STALL_SEGMENT=1` só no ingest, “`ingest hermes` fica com `delivery_timeout` **1/0/0/1**”. A prova versionada afirma outro valor: `replay.unit.test.mjs:156` `lost("delivery_timeout", 2)`, que é `{bound: true, code: "delivery_timeout", entries: 2, committed: 0, persisted: 0, lost: 2}` (`:141`).
  - A prova está certa sobre o produto: o ingest dessa rotina recebe um registro válido e a linha `{quebrado` (`replay.unit:65`). A entrada malformada também entra na contagem (`src/integrations/traces/delivery.mjs:193` `counts.entries += 1`, por `malformed` em `:208`), e o T8-C18 saudável afirma `counters.malformed` 1 (`replay.unit:95`).
  - O controle passou em A, B, C e D com `deepEqual` estrito; logo o relatório real é 2/0/0/2.
  - **Nenhuma asserção fixa 1/0/0/1** para o ingest dessa rotina (busca na seção F1). Pela regra “evidence or zero” do `verify.md` (passo 3) e pela regra do `AGENTS.md` de que valores exatos do contrato exigem asserção correspondente, o item (g) do C46 **não está provado como escrito**.
  - O literal veio de `4d3b1d9` (registro antes do código) e ficou igual em `9a633af`, `f715bee` e no HEAD. O build e o handoff não o reconciliam.
  - **Não é defeito do produto nem da prova.** O checklist diverge da prova. Retificar o literal (por exemplo, 2/0/0/2, com o motivo: uma entrada válida e uma malformada) é decisão do orquestrador e do autor. Não muda teste, prazo nem asserção. Não corrigi nada.
- **Gates frescos (verified at `45b512b`)**, cada um numa única invocação, sem filtro e sem repetição:
  - **A** (Windows, Node 24.22.1, Python 3.12.10, checkout principal): **80 testes, 74 pass, 0 fail, 6 skip**, exit 0.
  - **B** (Windows, Node 24.13.0 oficial, npm 11.6.2 adjacente, clone git novo com `core.autocrlf=true`): **80/74/0/6**, exit 0.
  - **C** (WSL isolado, Node 24.13.0 copiado, `env -i`, sem `/usr/bin` no PATH, árvore exata do HEAD): **80/76/0/4**, exit 0.
  - **D** (`npm test` completo, Windows, Node 24.22.1, teto 8, 12 nativos do Hermes): **1.029 testes, 1.009 pass, 0 fail, 20 skip**, exit 0. Por suíte: governança 25/25, motor 16/16, doctor 417 (410/0/7) e integrações 571 (558/0/13), com os **12 nativos** do Hermes.
  - Os 80 nomes de A, B e C são idênticos. Os 10 skips de plataforma rodaram no outro sistema.
- **Causa** das falhas T8 da CI 40709943742 e da execução manual 40710014746: **continua desconhecida.** O código `51679df` é observabilidade (só provas e apoios de prova), não correção, e não há defeito demonstrado. Isso não equivale a dizer que não há defeito.
- **Gates remotos**: pendentes e obrigatórios. Nenhuma execução manual, Actions, CI, `review:run`, push ou merge ocorreu aqui.

**Profile**: light (`AGENTS.md:138`). Rodada 17 com a faixa inteira e os 50 checks. Pelo perfil, não há fault injection, `Coverage`, `Test policy` nem fonte de UI. Não fiz mutantes, sondas nem correções. RED, GREEN, as 6 mutações e as mensagens dos controles do autor (`build:1860-1907`) são **relato do autor**: li, não reexecutei.
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..45b512b13eee51e0fa4749d4d58764a327f12dee`, a feature inteira: 106 commits, árvore `01a96202…`. Desde a R16 (`8f045c2`, relatório em `76705f9`) entraram 5 commits:
- `4d3b1d9`: registro antes do código (Landing `:91`, C46 (d)–(g), critério 38 da task e Handoff);
- `51679df`: **o último código**, só provas e apoios de prova (5 arquivos, abaixo);
- `9a633af`: build, handoff `ci40709943742-handoff.md` e checklist;
- `f715bee`: retificação documental (“compatível, não demonstrada”);
- `45b512b`: override `25` da configuração, de 10 para 11.

**Round**: **17** (light). Base: “Pode fazer quantas precisar” e o escopo [6467154706](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706), com o registro 17/11 em [6473286292](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6473286292). Esse registro é o 28º comentário do contexto 17. A exportação não traz as URLs dos comentários; o número vem da configuração e do despacho. As 16 verificações e as 10 revisões formais ficam preservadas. O `state.json` da revisão tem 10 tentativas: 1–3 `changes_requested`, 4–7 `ready`, 8 `blocked` (`bedda5c`), 9 `ready` (`41dcf5d`) e 10 `ready` (`76705f9`). O sha256 é `13b4df49…`, o mesmo antes e depois deste relatório. A formal 11 é do orquestrador; não rodei `review:run`.
**Verifier**: subagente novo e independente (Claude Opus 5.5). Não sou o autor nem um Verifier anterior e não herdei sessão. Produto, testes, apoios, scripts, workflow, planos, configuração e estado ficaram só para leitura. Escrevi apenas este arquivo e logs/scripts em `.checks/code-review/issue-25/verifier-round17/`, uma pasta ignorada (`.gitignore:4`).

Data: 28/10/2026, das 12:55 às 13:15 (-03). O HEAD foi `45b512b` do início ao fim. `git status --porcelain=v1 -uall` estava vazio antes de A, antes e depois de A, de B (no clone) e de D, e no fim, antes de gravar este arquivo. Em C, a árvore extraída é igual ao `HEAD^{tree}` antes e depois.

## Fontes lidas

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md`, `tlc-implement/references/verify.md` | inteiros |
| `.tasks/issue-25-agent-launch.md` | inteiro (675 linhas): critérios 1–42, o refinamento T8 do critério 38 (`:331-348`), as exceções e refinamentos dos critérios 40 e 42 e o registro da ordem remota (`:670-675`) |
| `.checks/issue-25-agent-launch.md` | inteiro (1.011 linhas): Landing `:42-93`, inclusive a linha nova `:91` “Diagnóstico das entregas de um produtor nas provas T8”; C1–C50, com o C46 em `:382-455` e (d)–(g) em `:406-455`; Swept em `:604-614`; Handoff em `:616-1011`, com o bloco novo em `:968-1011` |
| build `:1788-1980` | a seção nova, **relato do autor** |
| proposta da medição (71 linhas); handoff `ci40709943742-handoff.md` (91 linhas) | inteiros |
| `context-ci28-verifier17-final.json` | 28 comentários e 9 ACs (`- [ ]`). Corpo e comentários 1–27 iguais aos do contexto 16 (`r17-context17.txt`); o 28º registra as rodadas 17/11 |
| `.verified.md` atual (blob `c3db7e2`, de `76705f9`: adendos R16 e R15 e relatório R14) | inteiro, antes de substituí-lo |
| `git diff 8f045c2..HEAD` dos 5 arquivos de código | inteiro; consumidores do apoio (C46 `concurrency.cli`, C47 `agents.e2e`) relidos no HEAD |
| logs `ci767-windows-*.log` e `measurement40710014746.json` | não reli; uso só como relato do orquestrador/autor |
| auditoria externa (`verifier-round17/profile-*`) | **não lida**; vi só os nomes. Não li perfil pessoal |

## Prova Git (verified at `45b512b`; `verifier-round17/blob-identity.txt`, `r17-pre-state.txt`)

- **Código desde a R16** (`git diff --name-only 8f045c2..HEAD -- src scripts tests .github package.json package-lock.json .gitattributes`): só os 5 arquivos de `51679df`.
  - `tests/integrations/helpers/traces-probe.mjs`: `ac159e8` → `e6bd5bd`.
  - `tests/integrations/helpers/traces.mjs`: `de67a57` → `18f4c82`.
  - `tests/integrations/traces/live-capture.cli.test.mjs`: `86f9d0d` → `56cf953`.
  - `tests/integrations/traces/query.cli.test.mjs`: `2761ad6` → `0fee8d0`.
  - `tests/integrations/traces/replay.unit.test.mjs`: `40d80b3` → `810489a`.
- **Desde a R14** (`13bb1d4`): esses 5, mais `scripts/ci-lock-latency.mjs` e `.test.mjs`, a mudança da R16. Todos os outros caminhos de `src/`, `tests/`, `scripts/`, `.github/`, `package*.json` e `.gitattributes` têm o mesmo modo e o mesmo blob. Entre eles estão os 5 arquivos do alvo sem diff (`command.cli` `e0bbbc7`, `end.e2e` `cd2dc94`, `agents.e2e` `669e9a4`, `concurrency.cli` `a078c1e`, `follow.cli` `433545b`), `helpers/launch.mjs` `45c1c7d`, os 9 arquivos de prova fora do alvo e o workflow `474a87b`.
- **Produto**: `src/` tem 0 diff desde `f734441`.
- **Core**: os 5 arquivos (`README.md`, `cli.mjs`, `review.mjs`, `review.test.mjs`, `schema.json`) têm o mesmo blob na base e no HEAD.
- **Configuração**: `8f045c2..HEAD` muda só `roundOverrides["25"]` (2/2 linhas): `maxRounds` 10 → 11, e o `approval` cita 6473286292 e 6467154706 e diz “Preservar as 10 tentativas anteriores”. Os perfis globais e os overrides de 3, 4, 5, 6, 7, 8 e 23 não mudam.
- **Raio do apoio**: 27 arquivos importam `helpers/traces.mjs`. Os 8 que carregam a pré-carga são exatamente o alvo A/B/C (`r17-helper-consumers.txt`).
- **Nenhum consumidor depende da forma antiga da linha da pré-carga.** O C46/T8-C15 desestrutura `{op, kind, code, held, commits}` do `diskTrace` (`concurrency.cli:136`). O C47 lê `.op/.kind/.code/held/hold` (`agents.e2e:234-252`). `T8-C1/C2` (`live-capture:98-100`), `T8-C16` (`concurrency.cli:971-985`) e `I25-C28` (`end.e2e:192-194`) leem só `ops` e `cpuMs`. Nenhum compara as chaves da linha.

## Contrato antes do código × implementação (verified at `45b512b`)

`4d3b1d9` vem antes de `51679df`. O Landing `:91` e o C46 (d)–(g) estavam escritos antes do código. `f715bee` só qualifica o texto.

| Contrato (Landing `:91`; task `:331-348`) | Código no HEAD |
| --- | --- |
| Pré-carga: `ops` e `cpuMs` iguais; mais `pending` `[op, tipo, início, idade]`, `exitMs`, `startedAt` (`timeOrigin`), `pid` e `loop {samples, maxMs, p99Ms}` do `monitorEventLoopDelay` (10 ms) | `traces-probe.mjs:153-154` (histograma de 10 ms, ligado na carga); `:152-164` (em curso num `Set` até concluir); `:205-212` (linha na saída: `pending` com a idade em `exitAt`, `loop` ou `{samples: 0, maxMs: null, p99Ms: null}`). `ops` com a mesma forma (`tenth`) |
| Injeção nova só para a prova: `BLOCK_LOOP=<n>\|<ms>` antes da n-ésima criação exclusiva do `.lock` | `traces-probe.mjs:120-131`; só existe com a variável |
| `diskTrace` ganha `at` e `ms` (acréscimo) | `traces.mjs:185` |
| Lugar: `fora do lock` / `tomada do lock` / `sob o lock, <k>ª tomada[, depois do commit]` | `traces.mjs:201-202` |
| Evidência por produtor (relatório; falhas fora do `open lock EEXIST`; disputa; última concluída; pendentes com a idade; processo; laço) | `producerTrace` `traces.mjs:209-231`; `describeProducerTrace` `:237-240`; `describeProcess` `:233-235` |
| Captura: status pelo CLI (indisponível com o código), segmentos e temporários, lock `presente, de <rótulo>` / `de outro processo` / `ilegível [<código>]` / `ausente`, pela coincidência de `pid`; nonce nunca na saída | `captureEvidence` `traces.mjs:246-264`. O `pid` é lido do `.lock` (`:259`), e só o rótulo sai (`:261-262`). O `pid` não é impresso |
| Evidência só na falha | `explainedUnless` `traces.mjs:298`. Com `matches` verdadeiro, devolve só o rótulo, sem chamar o CLI |
| `run.report.delivery` → `run.report?.delivery` | `live-capture:219`, `:247`, `:539-540`; `query.cli:242-243`, `:257` |

**Asserções originais preservadas** (`git diff 8f045c2..HEAD`, conferido linha a linha):
- **T8-C3**: status 0, stdout vazio, `events.length` e `DELIVERED(n)` (`live-capture:215-219`); o ingest depois do `stop` com `capture_not_active` (`:244-247`).
- **T8-C8**: hook `DELIVERED(1)`, ingest `DELIVERED(1)` e wrapper `DELIVERED(2)`, na mesma ordem e com conteúdo ligado e desligado (`:536-544`).
- **T8-C14**: `code === null` nos três (`query.cli:241-243`); `capture_not_active` 1/0/0/1 nos atrasados (`:252-258`).
- **T8-C18**: os três status 0 (`replay.unit:64-66`); o `stop` com status 0 e stderr vazio (`:73-74`, as asserções do `privacyOk`).

Produtores, payloads, eventos, ordem, concorrência e prazos são os mesmos. Só o ambiente ganha `timedEnv` e só a mensagem ganha a evidência.

## F1 — o literal do C46 (g) diverge da prova

| Item | Checklist (`:436-444`) | Prova (`replay.unit.test.mjs`) | Conferência |
| --- | --- | --- | --- |
| `stop` 4 e mensagem `stop: {…lock_present…}\n<evidência>` | sim | `:152` `[4, 0, {schemaVersion: 1, command: "stop", status: "error", error: {code: "lock_present"}}]`; `:154` `startsWith` | igual |
| `hook claude pre_tool_bash` `DELIVERED(1)` | sim | `:156` `DELIVERED_ONE` (`:140`) | igual |
| **`ingest hermes` `delivery_timeout` 1/0/0/1** | **1/0/0/1** | **`:156` `lost("delivery_timeout", 2)`** (`:141`) → 2/0/0/2 | **diverge** |
| pendente `open segmento.tmp (sob o lock, 2ª tomada)` | sim | `:157` | igual |
| `post_tool_skill` `lock_present` 1/0/0/1 e disputa repetida | sim | `:156` `lost("lock_present", 1)`; `:158` `contention > 0 && failures.length === 0` | igual |
| captura `indisponível [lock_present]`, lock de `ingest hermes` | sim | `:159` | igual |
| sem raiz, ID, chave, PATH nem canários | sim | `:160-164` | igual |

**Busca:** `rg -n "delivery_timeout|lost\(" tests/integrations/traces/replay.unit.test.mjs` dá uma só linha, `:156`, com `2`. Nenhuma outra prova cobre o T8-C18 com `STALL_SEGMENT`. O 2 é o valor certo da rotina (`:65`, `delivery.mjs:193`/`:208`, `replay.unit:95`), e o nome real `I25-C46 diagnóstico do T8-C18: …` passou em A, B, C e D. Então o item (g) está provado com outro valor, e o valor escrito no check não tem prova. O mesmo literal aparece só no checklist (`:441`); task, Landing e handoff não o repetem.

## Observações (não bloqueantes; nada corrigido)

- **O1 — comentários com a leitura forte.** `traces-probe.mjs:44-47` diz “laço livre com a operação parada aponta o disco; laço parado, o processo”. `traces.mjs:244-245` diz “O dono do lock é o produtor cujo `pid`…”. O nome do controle `replay.unit:143` diz “mostra quem deixou o lock”. Isso contradiz a leitura qualificada de `f715bee` (Landing `:91`, C46 `:448-451`): compatível, não demonstrado; coincidência de `pid`, não dono. O autor declarou isso no build (`:1954-1963`). As **saídas** não afirmam causa (`lock presente, de <rótulo>`), e, nos controles, quem segura o lock é conhecido pela injeção. Fica a incoerência de comentários com o registro (`AGENTS.md`, “Mantenha a explicação coerente”). Nenhum check depende disso.
- **O2 — folga de 0,2 ms no (d).** `live-capture:290` usa `ageMs >= ATTEMPT_MS - (startMs - holdEnds[1]) - 0.2`. O checklist (`:420`) não cita a folga. Ela vem do arredondamento a 0,1 ms de três valores da linha: idade ±0,05, início ±0,05 e fim da tomada (início + duração) ±0,1, no máximo 0,2. O comentário em `:287-288` a explica. Não afrouxa o prazo de 650 ms (`ATTEMPT_MS = 750 − 100`, `delivery.mjs:12-18`), só a resolução da medida.
- **O3 — T8-C3 sem relatório.** `assertHermesDelivered` lê `run.report.events.length` (`live-capture:217`, asserção original) antes da asserção de entrega. Sem relatório no fd 3, o T8-C3 continuaria vermelho, mas com `TypeError`, sem a evidência que o Landing `:91` descreve para `run.report?.delivery`. T8-C8, T8-C14 e T8-C18 não têm esse caminho.
- **O4 — ramos sem controle.** Nenhum controle exercita `presente, de outro processo`, `ilegível [<código>]`, `laço de eventos: sem amostras` ou `tempos: indisponível [sem linha da pré-carga]` da evidência nova. O C46 (d)–(g) não os exige (sem `Coverage` no perfil `light`).
- **O5 — limites do diagnóstico** (do autor, `build:1965-1980`, conferidos no código). O histograma não vê um bloqueio antes do primeiro tique. Os pendentes cobrem só as operações de `node:fs/promises` envolvidas pela pré-carga. `startedAt` é do relógio de parede. O custo da pré-carga não foi medido à parte.

## Execuções — verified at `45b512b`

Ordem: A, B e C em sequência, depois D; cada uma uma vez, sem filtro e sem repetição. O alvo A/B/C são os 8 arquivos do gate pré-definido no Handoff (`.checks/issue-25-agent-launch.md:981-992`), com `node --test --test-concurrency=4`, reporters spec e TAP. O `RUNNER_TEMP` foi posto só no ambiente do processo filho, numa pasta própria vazia (nenhum dos 8 arquivos o lê; só `scripts/ci-lock-latency*`), e a precondição foi conferida pelo node de cada ambiente. Scripts: `r17-run-win.sh`, `r17-b-clone-prepare.sh`, `r17-wsl-prepare.sh`, `r17-wsl-run.sh`, `r17-wsl-cleanup.sh`, `r17-run-d.sh`, `r17-matrix.mjs` e `r17-d-summary.mjs`, adaptados do método da R16 depois de lê-lo.

| # | Ambiente | Resultado |
| --- | --- | --- |
| A | Windows 11, checkout principal, Node **v24.22.1** (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10 (`python -I`, como `locateSystemPython`), `npm_execpath` ausente; `RUNNER_TEMP` = `verifier-round17\runner-temp-A` (presente, pasta, não link, 0 entradas, fora do `%TEMP%`). 12:56:44–12:59:28 | **80 testes: 74 pass, 0 fail, 6 skip**, exit 0. Status vazio antes e depois |
| B | Windows 11, Node **v24.13.0 oficial** (zip sha256 `ca274269…` igual ao `SHASUMS256.txt` local), npm **11.6.2** adjacente, Python 3.12.10, `npm_execpath` ausente. **Clone git novo** `--no-hardlinks --config core.autocrlf=true` (só no `.git/config` do clone): HEAD `45b512b` e árvore `01a96202…` conferidos. `cli.mjs` `i/lf w/lf attr/text eol=lf`, **0 CR** antes e depois; os 8 arquivos e os apoios `i/lf w/crlf`. `node_modules` copiado. `RUNNER_TEMP` = `runner-temp-B`. 13:00:08–13:02:38 | **80: 74 pass, 0 fail, 6 skip**, exit 0. Status do clone vazio antes e depois de copiar `node_modules`, antes e depois da execução |
| C | WSL `Ubuntu`, `oldboydev` uid 1000. `git -c core.autocrlf=false archive HEAD`: 5.980.160 bytes, sha256 `cd6bb2b2…`, `get-tar-commit-id` = `45b512b…`. Árvore extraída `01a96202…` = `HEAD^{tree}`, antes e depois; 0 CR nos arquivos exercidos; `cli.mjs` 755 / `100755`. Node **v24.13.0** copiado byte a byte de `/usr/bin/nsolid` (sha256 `150946e4…`) num prefixo `bin = node npm npx`, **sem `sh`**; npm 11.6.2. `env -i` com só `HOME` (scratch), `LANG`, `PATH=<prefixo>/bin:<tools>` sem `/usr/bin` e `RUNNER_TEMP` (scratch, distinto do `/tmp`). `tools` só com links para `sh` (dash), `git`, `python3` (3.12), `id`, `grep` e `mkfifo`. 13:02:57–13:04:02 | **80: 76 pass, 0 fail, 4 skip**, exit 0. `~/.skill-me` e a autorização reais ausentes antes e depois; `HOME` do scratch vazio depois |
| D | `npm test`, sem argumentos, no checkout principal: Windows, Node v24.22.1, npm 11.19.1, `npm_execpath` ausente, `availableParallelism` 32 → `testConcurrency` **8**, Python 3.12.10, `RUNNER_TEMP` = `runner-temp-D`. Orçamento de **2 h** definido na ferramenta antes do início; esperei o término real. 13:04:59–13:11:55 | **1.029 testes: 1.009 pass, 0 fail, 20 skip**, exit 0; nenhum `✖` no log. Por suíte: governança 25/25/0/0, motor 16/16/0/0, doctor 417/410/0/7 e integrações 571/558/0/13. Os 12 nativos passaram. Status vazio antes e depois; HEAD igual; `RUNNER_TEMP` com 0 entradas depois |

**Nomes** (`matrix.txt`): 80 nomes únicos, **iguais em A, B e C**, nenhum duplicado e nenhum com 0 execuções. Em cada ambiente passaram os 7 `I25-C46`, os 2 `I25-C47`, o `T8-C15`, o `I23-C10` e os T8 afetados (`T8-C3`, `T8-C8`, `T8-C14`, `T8-C18`). Nenhum `not ok`.

**Skips de A/B/C** (motivo impresso; cada um rodou no outro sistema desta rodada):
- A e B (6), todos `pass` em C: `I25-C45` POSIX (“componente vazio do PATH como diretório atual é semântica do POSIX…”), `I25-C5` POSIX, `I25-C6` e `I25-C42` POSIX (“sinais POSIX: o Windows não tem grupo de processos nem SIGQUIT/SIGHUP/SIGTERM entregáveis”), `I25-C33` arranjo (“o npm do Windows roda o script pelo ComSpec…”) e `T8-C4` sinal (“posix-signals: …”).
- C (4), todos `pass` em A e B: `I25-C4` shim, `I25-C5` Ctrl+C e `I25-C42` Ctrl+C (“PATHEXT, .cmd e o console do Windows só existem no Windows”), e `I25-C45` controle do Windows (“controle do PATH do Windows; o POSIX tem o…”).

**Nomes no D** (`D-summary.txt`): cada prefixo de check tem ao menos um nome real no log. São eles: `I25-C1 ` a `I25-C47 `, `governance-C1 C3`, `governance-C49`, os 18 `C50 `, `I4-C20`/`C21`/`C22`/`C37`, os T8 afetados e `I23-C10`. Passaram os 7 `I25-C46`, os 2 `I25-C47`, `T8-C3`, `T8-C8`, `T8-C14`, `T8-C15`, `T8-C18` e `I23-C10`. Os 12 testes de `hermes-plugin.native.test.mjs` passaram (`D-natives.txt`), sem o texto de skip do runtime.

**Skips do D (20), todos de plataforma, com o motivo:**
- **doctor (7)**, `{skip: process.platform === "win32"}` (`tests/doctor/agent-resolution.unit.test.mjs:279`, `:589`; `fifo-config.cli.test.mjs:30`, `:75`; `fs-adapter.posix.test.mjs:36`, `:53`, `:75`). No log, só `# SKIP`, sem texto: `agent-resolution-formal5-2 …` e `agent-resolution-C2 realpath/symlink …` (POSIX), dois `fifo-config-formal8-4` (FIFO) e três `fs-adapter-formal8-4` (FIFO). **Não rodaram em ambiente nenhum desta rodada.**
- **integrações (13)**, com o motivo impresso:
  - `I4-C15` (`posix-signals`), `I4-C25b` (`posix-modes`), `I4-C25j`, `I4-C25k` e `I4-C25l` (`posix-acl`, só Linux) e `I4-C25m` (`macos-acl`). **Não rodaram em ambiente nenhum desta rodada.**
  - `I25-C15` pty (“pseudoterminal só no POSIX; no Windows o primeiro uso é provado em processo (C8–C14)”). **Não rodou nesta rodada**, porque `prepare.cli` está fora do alvo C; vem da R14.
  - `I25-C45` POSIX, `I25-C5` POSIX, `I25-C6`, `I25-C42` POSIX, `I25-C33` arranjo e `T8-C4` sinal **rodaram e passaram em C**, porque estão nos 8 arquivos.

Isso não autoriza dizer que todos os skips do D rodaram em outro lugar.

## C46 — citações renovadas (verified at `45b512b`)

Arquivos: `conc` = `traces/concurrency.cli.test.mjs` (blob `a078c1e`, igual ao da R14/R16, que agora importa o apoio novo); `live` = `traces/live-capture.cli.test.mjs` (`56cf953`); `q` = `traces/query.cli.test.mjs` (`0fee8d0`); `rep` = `traces/replay.unit.test.mjs` (`810489a`). Cada nome abaixo existe no arquivo e passou em A, B, C e D (`matrix.txt`, `D-summary.txt`).

| Item do C46 | Teste nomeado (TAP) | Asserção decisiva no HEAD | Resultado |
| --- | --- | --- | --- |
| T8-C15 saudável: status 0 e `{bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0}` por produtor, 80 únicos, segmento coerente, pares de hooks, recusa com lock alheio | `T8-C15 concurrent producers: …` | `conc:214-215`; `:226-229` (`80`, `[80, 80]`); `:237`; `:241`; `:251` (`lock_present` 3/0/0/3) | PASS |
| (a) falha antes do commit | `I25-C46 diagnóstico do T8-C15: falha antes do commit …` | `conc:278-279` (`actual` = relatório de `b`, `expected` = 40/40/40/0; mensagem `b\n<evidência>`); `:295` (`a` 40 e `[]`); `:297` (`io_failure`, `lost > 0`, `committed + lost === 40`, `persisted === committed`); `:298` `["rename segmento.tmp EIO (antes do commit)"]`; `:301-310` export `{records: 40 + committed, a: 40, b: committed, others: 0, repeated: 0}`, status `accepted = persisted = total`, 1 segmento, 0 temporário, lock ausente; `:313` sem vazamento | PASS |
| (b) confirmação perdida | `… confirmação perdida depois do commit …` | `conc:324`; `:325` `["unlink lock EIO (depois do commit)"]`; `:327-336` export 80 (`a: 40, b: 40`), `persisted` 80, 1 segmento, 0 temporário, lock ausente | PASS |
| (c) inspeção indisponível | `… com o lock preso, export e status saem indisponíveis …` | `conc:346-347` (primeiro produtor que não confirmou); `:349` `b` `io_failure` 40/0/0/40; `:350` `["unlink lock EIO (depois do commit)"]`; `:351-360` export e status `{unavailable: "lock_present"}`, 1 segmento, 0 temporário, lock presente; `:361` | PASS |
| T8-C3, T8-C8, T8-C14 e T8-C18 com as mesmas asserções, a pré-carga e a evidência só na falha | `T8-C3 …`, `T8-C8 …`, `T8-C14 …`, `T8-C18 …` | `live:215-219`, `:244-247`; `live:540`, `:542-544`; `q:243`, `:256-257`; `rep:64-66`, `:73-74`. Evidência só com `matches` falso (`traces.mjs:298`) | PASS |
| comum a (d)–(f): `actual` = `{bound: true, code: "delivery_timeout", entries: 9, committed: 0, persisted: 0, lost: 9}`, `expected` = `DELIVERED(9)`, mensagem `ingest hermes\n<evidência>`, sem raiz, ID, chave, PATH nem canários | os três `I25-C46 diagnóstico das entregas de um produtor: …` | `live:270` `AssertionError`; `:271` `[LOST_BY_TIMEOUT(n), DELIVERED(n)]` (`:256`; n = 9 casos válidos de `hermes-hooks.json`, contados no HEAD); `:273` `startsWith`; `:274-278` | PASS |
| (d) disco parado sob o lock | `… disco parado sob o lock mantém o T8-C3 vermelho …` | `live:286` `[[], ["open segmento.tmp (sob o lock, 2ª tomada)"], "close state.json (sob o lock, 2ª tomada)"]`; `:290` idade ≥ 650 − (início − fim da 1ª tomada) − 0,2 (O2); `:291` `samples > 0 && maxMs < 650`; `:293` `{status: {unavailable: "lock_present"}, files: {segments: 0, temporaries: 0}, lock: {present: true, owner: "ingest hermes"}}` | PASS |
| (e) criação do lock parada | `… criação do lock parada …` | `live:301` `[[], ["open lock (tomada do lock)"], "close store.json (fora do lock)", {}]`; `:302` laço < 650; `:304` `{status: {state: "active", accepted: 0, persisted: 0}, files: {0, 0}, lock: {present: false}}` | PASS |
| (f) laço bloqueado (`BLOCK_LOOP=2\|900`) | `… laço de eventos parado …` | `live:311` a abertura terminou (`holdEnds[1]`); `:312` `loop.maxMs >= 650`. Pendentes e lock não afirmados, como o check diz | PASS |
| **(g) T8-C18 com o lock deixado** | `I25-C46 diagnóstico do T8-C18: …` | `rep:151-152`, `:154`, `:156-164` (tabela F1). **O ingest é afirmado como 2/0/0/2, não como o 1/0/0/1 do checklist** | **FAIL como escrito (F1)** |

Distinções revistas:
- **Erro original preservado**: em todos, `actual` e `expected` são os da asserção antiga, e a mensagem começa pelo rótulo antigo.
- **Pendente × concluída**: (d) e (e) afirmam a pendente e a última concluída separadamente; `producerTrace` separa por `code === "pendente"` (`traces.mjs:213-223`).
- **Código indisponível**: (d), (g) e (c) afirmam `{unavailable: "lock_present"}`, sem contagem presumida.
- **Dono não presumido**: o rótulo só sai pela coincidência de `pid` (`traces.mjs:259-262`). Em (g), quem segura o lock é o 2º produtor, e não o 1º; essa é a mutação “dono presumido” do autor (relato). O ramo `outro processo` não tem controle (O4).
- **Laço medido**: (d) e (e) exigem amostras e < 650 ms; (f) exige ≥ 650 ms. O ramo `sem amostras` não tem controle (O4).
- **Sem atribuição de causa**: nos 4 controles, a operação e o produtor são conhecidos pela injeção. Os nomes fortes (“mostra quem deixou o lock”) são contexto de controle (O1), não diagnóstico da CI real.

## C47 — I23-C10 e o apoio comum (verified at `45b512b`; `agents.e2e` blob `669e9a4`, sem diff, com o apoio novo)

| Item | Teste nomeado | Asserção decisiva no HEAD | Resultado |
| --- | --- | --- | --- |
| I23-C10 saudável: `DELIVERED_AUTO(1)` por hook (intercalados e simultâneos), `DELIVERED_AUTO(20)` no Hermes, 5 capturas com chaves próprias, uma sessão por captura, eventos e relatório isolados | `I23-C10 sessões concorrentes ficam isoladas: …` | `agents.e2e:307-311` (`deepEqual(run.report?.delivery, expected, …)`, evidência só fora do esperado); `:322`, `:325`, `:329`; `:332-333` (`5`, `5`); `:345`; `:349`; `:353`; `:369-374` | PASS |
| (a) `SEGMENT_EIO=1` | `I25-C47 diagnóstico do I23-C10: falha de E/S …` | `:401-403` (`actual` = relatório, `expected` = `DELIVERED_AUTO(1)`, mensagem `codex A 0\n<evidência>`); `:422` `io_failure` 1/0/0/1 `unrouted: 0`; `:424` `[["rename segmento.tmp EIO (sob o lock, 2ª tomada)"], 0, 1]`; `:426` `active accepted 0 persisted 0`, 0/0, lock ausente; `:427-430` | PASS |
| (b) `STALL_SEGMENT=1` | `… disco parado no hook (delivery_timeout …)` | `:437` `delivery_timeout` 1/0/0/1; `:439` `[[], "close key (sob o lock, 2ª tomada)"]`; `:441` `{captures: {unavailable: "lock_present"}, files: {0, 0}, lock: {present: true}}`; `:442-444` | PASS |
| o apoio comum não muda a saída do C46/C47 | os 7 `I25-C46`, `T8-C15`, os 2 `I25-C47` | `diskTrace` só acrescenta `at`/`ms` (`traces.mjs:185`). `failuresWithPhase` (`conc:133-142`) e `hookTiming` (`agents.e2e:241-255`) não leem os campos novos, e as mensagens afirmadas por `startsWith`/`includes` continuaram iguais e verdes | PASS |

## Checks — 49/50 provados como escritos

Fonte da prova:
- **ABCD**: o nome real passou em A, B, C e D nesta rodada, salvo os skips de plataforma marcados.
- **D**: o arquivo não é do alvo de 8; o nome real passou no D desta rodada.
- **Carregadas por blob**: as citações dos arquivos sem diff são as da R14 (`13bb1d4`, relatório em `bedda5c`) e da R16 (C50, `8f045c2`), válidas no HEAD porque os blobs são os mesmos (`blob-identity.txt`). Reli no HEAD `command.cli:48-49`, `:65`, `:77`; `prepare.cli:93-94`, `:200`, `:355`, `:408`; `session.e2e:67`, `:230`; `store.unit:79`, `:168`, `:598`; `report.cli:159`; `docs.test:82`; `hermes-harness.unit:88`; `agent.unit:132-134`; `hermes-plugin.native:335`; e `governance-ci:317-319`. Todas conferem.

| Check | Asserção decisiva (`file:line` no HEAD) | Prova nesta rodada | Result |
| --- | --- | --- | --- |
| C1 | `command.cli:48-49` `private === true`, `bin` = `{"skill-me": "src/integrations/launch/cli.mjs"}`; `:65` `[0, SKILL_ME_HELP, ""]`; `:77` `gitStatus() === before` | ABCD; B em clone novo `autocrlf=true` com `cli.mjs` `i/lf w/lf attr/text eol=lf`, 0 CR antes e depois | PASS |
| C2 | `command.cli:96-98` `argv: LITERAL_ARGS` para os 3 agentes | ABCD | PASS |
| C3 | `command.cli:105` `{0: 0, 7: 7}` | ABCD | PASS |
| C4 | `command.cli:130-133` `{status: 127, [launcher_requires_shell], sentinel: false}`; `agent.unit` `I25-C4` | A/B/D (C: skip, só Windows) + D | PASS |
| C5 | `command.cli:228` POSIX `["SIGINT","SIGQUIT","SIGHUP"]`; `:244-245` `CTRL_C_EVENT` → `["SIGINT"]` | POSIX em C; console em A/B/D | PASS |
| C6 | `command.cli:267` `signals: ["SIGTERM"]` | C (A/B/D: skip, sinais POSIX) | PASS |
| C7 | `prepare.cli:93-94` `{status: 127, stdout: "", code: true, asked: false}` | D | PASS |
| C8 | `prepare.cli:122-126` texto exato até cada pergunta, árvores iguais | D | PASS |
| C9 | `prepare.cli:163-168` `observe.json` da #23 | D | PASS |
| C10 | `prepare.cli:189-191` `{exitCode: 3, …, started: false, root: false}` | D | PASS |
| C11 | `prepare.cli:200` `{exitCode: 2, code: true, …, relative: false, config: false}` | D | PASS |
| C12 | `prepare.cli:223` `status: 3`, linha `setup_required` | D | PASS |
| C13 | `prepare.cli:238` SHA-256 iguais, `started: 1` | D | PASS |
| C14 | `prepare.cli:250` `observe_on` 4 | D | PASS |
| C15 | `prepare.cli:408` `{status: 3, declined: true, trees: before}` (pty) | **não rodou nesta rodada**: só POSIX, e `prepare.cli` não está no alvo C. No D do Windows, skip (“pseudoterminal só no POSIX; no Windows o primeiro uso é provado em processo (C8–C14)”). **Carregado da R14** (C em `13bb1d4`; blob `8d0a49d` igual) | PASS (carry) |
| C16 | `session.e2e:67` `{origin: "launch", …, limits: {maxEvents: 500, maxBytes: 8388608}}` | D | PASS |
| C17 | `store.unit:79` `["launch", invocation, 1, "2026-10-26T10:00:00.000Z"]` | D | PASS |
| C18 | `session.e2e:111` `stderr: "skill-me: não foi possível abrir a execução [<código>]\n"` | D | PASS |
| C19 | `session.e2e:161` `[0, 0]` | D | PASS |
| C20 | `session.e2e:190-192` `code: "binding_invalid"` | D | PASS |
| C21 | `session.e2e:208-211` bytes iguais | D | PASS |
| C22 | `session.e2e:230` `[1, "stopped", 500, 500, {}]` | D | PASS |
| C23 | `session.e2e:282` `["active", MAX_BYTES, {}, 1]` | D | PASS |
| C24 | `store.unit:168` `[opened.capture, "stopped", 1]` | D | PASS |
| C25 | `end.e2e:80-89` stderr exato do resumo | ABCD | PASS |
| C26 | `end.e2e:101-109` `eventos gravados: 0.` e a dica | ABCD | PASS |
| C27 | `end.e2e:120` `{launch: true, code: "launch_ended", …, lost: 1}`; `store.unit` `I25-C27` | ABCD + D | PASS |
| C28 | `end.e2e:164-165` `persisted` 3 e `stopped`; regressão `end.e2e:194` `["EIO"]` | ABCD | PASS |
| C29 | `command.cli:278` término pelo sinal | ABCD | PASS |
| C30 | `command.cli:342` `captures: [[1, "stopped", 0]]` | ABCD | PASS |
| C31 | `end.e2e:205-215` `[lock_present]`, `continua active`, `privacy stop` | ABCD | PASS |
| C32 | `end.e2e:320` `"eventos intercalados: B terminou antes"`; `store.unit:715` `lock_present` | ABCD + D | PASS |
| C33 | `end.e2e:460` `active`; `:493-494` `spawn sh ENOENT` (arranjo POSIX) | ABCD; o arranjo POSIX em C | PASS |
| C34 | `report.cli:159` `[newInv, true]` | D | PASS |
| C35 | `report.cli:252-259` `not_configured` / `no_launch_capture`, `schemaVersion: 1` | D | PASS |
| C36 | `command.cli:350` `[0, SKILL_ME_HELP, ""]` | ABCD | PASS |
| C37 | `docs.test:82` `deepEqual(observed, expected)` (os 9 limites) | D | PASS |
| C38 | `prepare.cli:355` `["done", 0]` | D (console do Windows) | PASS |
| C39 | `hermes-harness.unit:88` `["concluded", 0, 3]` | D | PASS |
| C40 | `hermes-harness.unit:196-225` `[5000, "timeout"]`; nativo `hermes-plugin.native:335` (`concluded`/`inactive`/`failed`/`timeout`) | D, com os 12 nativos | PASS |
| C41 | `store.unit:327-523`; `end.e2e:518` | ABCD (`end.e2e`) + D (`store.unit`) | PASS |
| C42 | `agent.unit` `I25-C42`; `command.cli:456` Windows `status: 130`; `:424` POSIX | D; console em A/B/D; POSIX em C | PASS |
| C43 | `store.unit:598` `{code: "root_changed", opened: true, …, lockLeft: false}`; `end.e2e` `I25-C43` | D + ABCD | PASS |
| C44 | `hermes-harness.unit:263-271` `[1000, "timeout"]`; nativo `I25-C40 \|I4-C22` | D, com os nativos | PASS |
| C45 | `agent.unit:132-146`; `command.cli:166-186` | D; POSIX em C; controle do Windows em A/B/D | PASS |
| **C46** | tabela “C46 — citações renovadas” | ABCD (os 7 `I25-C46` e os 5 T8) | **FAIL como escrito (F1, item (g))** |
| C47 | tabela “C47” (`agents.e2e:307-311`, `:401-403`, `:422-444`) | ABCD | PASS |
| C48 | estrutural: workflow com o blob `474a87b` da R14/R16 (conferência da R14 contra `d0d5a7f` carregada); `governance-C1 C3` (`governance-ci:263-278`) | estrutura carregada por blob + `governance-C1 C3` em D | PASS |
| C49 | `governance-ci:317-358` | D | PASS |
| C50 | (a)–(n), citações da R16 (`ci-lock-latency.test` blob `75eeadd`, script `8c12894`, iguais aos da R16) | D, com os 18 `C50` e `RUNNER_TEMP` presente | PASS |

**AC → checks** (9 ACs do contexto 17, corpo igual ao do 16):
- AC1–AC6: C1–C45;
- AC7: C46, **não provado como escrito (F1)**;
- AC8: C47 e C48;
- AC9: C49 e C50. A execução remota e os resultados continuam como condição de merge, não de revisão de código.

## Swept `existing` (relido no HEAD; sem diff na feature)

- **Idempotência**: `privacy/lifecycle.mjs:23-24`: `stop` sobre `stopped` → `changed: false`.
- **Sem reenvio**: `traces/delivery.mjs:55-57` (“encerra a tentativa sem reenviar”) e `:111-113` (“nunca é reenviada”).
- **Falha de entrega não bloqueia**: `traces/delivery.mjs:145-146` (“a entrega nunca lança para a observação”).
- **`privacy prune` existente**: `privacy/command.mjs:56-57`.

`lifecycle.mjs`, `delivery.mjs`, `command.mjs` e `src/integrations/cli.mjs` têm 0 diff desde `63621c6`.

## Gates remotos — pendentes e obrigatórios (nenhum ocorreu aqui)

1. Corrigir ou decidir o F1. Depois, uma verificação do conteúdo novo, se o orquestrador assim registrar. Este relatório **não** autoriza a formal 11 sobre `45b512b` como se tivesse PASS.
2. A revisão formal do orquestrador, com PASS antes.
3. Com PASS e `ready`, a publicação no PR #28.
4. **Uma** execução manual do `lock_diagnostics` sobre o HEAD aprovado e publicado, com o registro dos resultados.
5. Os **cinco checks regulares verdes** nesse HEAD e a reconferência das fontes.
6. O merge humano, só com 4 e 5 cumpridos.

Nenhuma execução manual do Actions sobre um HEAD novo foi feita aqui. Os runs 40709943742, 40710014746 e a medição 122892425130 são histórico do orquestrador sobre `76705f9`. Não são dados deste HEAD, e nenhum resultado local aqui substitui a CI do Windows. O uso real continua no `Unresolved` 2.

## Processo, limites e limpeza da R17

**Executado.**
- git só de leitura: `rev-parse`, `status`, `log`, `show`, `diff`, `ls-tree`, `ls-files --eol`, `grep`, `check-ignore` e `get-tar-commit-id`.
- `git -c core.autocrlf=false archive`.
- `git clone --no-hardlinks --config core.autocrlf=true` do repositório local, sem rede, com a configuração só no clone.
- `node -e` só de leitura (contexto, estado da revisão, fixture contada), `sha256sum` e `python -I` (versão e contagem de bytes).
- A, B, C e D, uma vez cada, sem repetição. O WSL foi chamado com `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc` e `MSYS_NO_PATHCONV=1`.

**Não executado.**
- RED, mutações e sondas novas, inclusive as do autor.
- Agentes reais, `--help`/`--version` de agente, sondas de PATH, perfis, credenciais, banco, modelo, rede, host, relógio, antivírus, Git global e runtimes. O Hermes real rodou só pelos 12 nativos versionados do D, com o runtime local e o `HERMES_HOME` temporário das provas.
- Actions, CI, `review:run`, commit, push, PR, merge e alteração de limites.
- O incidente da R5 (`ffc5937`) não foi desfeito nem repetido. A auditoria externa de metadados (linha de base pré-autor com 12.113 entradas e zero erros, segundo o despacho) é do orquestrador e será fechada por ele depois do D. Não a executei nem li o perfil.

**Limites.**
- **POSIX/FIFO/macOS do D não reexecutados.** Os skips do D (lista acima) não rodaram por causa do alvo C. Só rodaram em C os que estão nos 8 arquivos: `I25-C45`, `C5`, `C6`, `C42` e `C33` POSIX, e `T8-C4` sinal. Os 7 do doctor, os 6 do I4 e o `I25-C15` (pty) **não rodaram em ambiente nenhum desta rodada**. O C15 é carregado da R14 pela identidade do blob.
- macOS e o runner não foram executados.
- As causas históricas das falhas T8, do I23-C10 e dos `lock_present` continuam desconhecidas. Os campos novos são evidência compatível, não identificação de recurso nem de dono do lock.

**Limpeza** (`cleanup.txt`, `C-wsl-cleanup.txt`, `B-clone-cleanup.txt`):
- o clone de B foi removido depois de conferir o caminho absoluto, o tipo (diretório, não link), o HEAD `45b512b` e o status vazio;
- `runner-temp-A`/`-B`/`-D` foram removidas depois de conferir 0 entradas;
- o scratch do WSL `/tmp/skillme-verifier-r17.cXTJUq` foi removido pelo padrão absoluto, pelo dono uid 1000 e pelo tipo (restam 0);
- no `%TEMP%`, as 363 pastas de scratch das provas desta rodada (`skill-me i4 …`/`skill-me i5 …`) foram removidas, com 0 recusas. Cada uma era nova em relação à linha de base de 12:56:38, diretório comum (não link), filha direta do `%TEMP%` e com mtime na janela. As 15 entradas novas de outra origem não foram tocadas. No `/tmp` do WSL, nenhuma `skill-me*` na janela de C;
- o host continua sem `RUNNER_TEMP`;
- nenhum processo meu ficou em segundo plano, e nenhum processo alheio foi encerrado.

Ficam em `verifier-round17/`: logs, TAP/spec, `matrix.txt`, `D-summary.txt`, o tar do HEAD e os meus scripts. Os arquivos `profile-*` da auditoria do orquestrador não foram tocados.

**Integridade do histórico abaixo.** O texto depois da linha `---` final deste adendo é, byte a byte, o blob `c3db7e2` (`.verified.md` de `76705f9`, igual no HEAD): os adendos R16 e R15 e o relatório R14. Fica como histórico.
- **Substituído por esta R17**: o C46 e o C47 (citações e provas), e a hierarquia dos gates. A/B/C e D frescos de `45b512b` substituem o carry de C1–C47 da R14/R16 e o D da R14. As citações carregadas valem só onde o blob é o mesmo.
- O PASS 50/50 da R16 foi dado a `8f045c2`, antes de `4d3b1d9`/`51679df`, e não cobre o C46 (d)–(g).

---

# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25 (rodada 16, adendo)

**Verdict (R16)**: **PASS — 50/50 checks**, 9 ACs, HEAD `8f045c2`. Nenhum fail, skip, carry inválido ou alteração fora da fronteira.
- **Fresco nesta rodada (verified at `8f045c2`)**: C50 inteiro (18 testes `C50 …`, inclusive (m) e (n)) e C49 (`governance-C49`), mais os outros 6 `governance-`. Os dois arquivos do `test:governance` rodaram numa invocação por ambiente, sem filtro, com `RUNNER_TEMP` **presente** e válido no processo do teste:
  - A: 25 testes, 25 pass, 0 fail, 0 skip;
  - B: 25/25/0/0;
  - C: 25/25/0/0.

  Os nomes são idênticos nos três TAP. Os 23 nomes da CI 40702252461 estão presentes, inclusive as duas provas que falharam lá (`C50 caminhos` e `C50 relatório`), agora verdes com a mesma precondição. Os 2 nomes novos são (m) e (n).
- **Carregado da R14 (carried from `13bb1d4`, código `6a242a2`, relatório em `bedda5c`)**: C1–C47, a leitura estrutural do C48 e as camadas inalteradas de D. A prova Git está abaixo. **Não há D novo.** Não afirmo que os 1.023 testes de D estão inalterados: os 16 C50 de D rodaram sobre o script antigo (`cf29122`) e foram **substituídos** pelos 18 C50 frescos desta rodada.
- **Gates remotos: pendentes e obrigatórios.** Nenhuma medição, job do Actions ou CI ocorreu aqui. A medição 40702384050 é dado histórico do orquestrador, sobre `41dcf5d`. Não é dado deste HEAD nem execução minha.

**Profile**: light. Rodada 16, **escopada**. Sem fault injection, `Coverage`, `Test policy` ou fonte de UI (perfil). Sem mutantes nem sondas minhas. O RED, as 3 mutações e o GREEN do autor são **evidência do autor** (`build:1721-1739`), não execuções minhas.
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..8f045c2dde08a58ef2ff1c65223994e1b316a9f2`, a feature inteira: 100 commits, árvore `a3b3b630…`. Desde a R15 (`41dcf5d`), há 4 commits:
- `efa56ea`: task e checklist;
- `f133c55`: o script e a prova dele, o último código;
- `38b336c`: build, proposta, handoff novo e checklist;
- `8f045c2`: o override `25` da configuração.

**Round**: **16** (light). Base: “Pode fazer quantas precisar” e o escopo [6467154706](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706), com o registro 16/10 em [6471545504](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6471545504), o 27º comentário do contexto. As 15 verificações e as 9 revisões formais ficam preservadas. A formal 10 é do orquestrador, depois deste relatório.
**Verifier**: subagente novo e independente (Claude Opus 5.5). Não sou o autor nem um Verifier anterior, e não herdei sessão. Produto, testes, scripts, workflow, planos, configuração e estado ficaram só para leitura. Escrevi só este arquivo e logs/scripts em `.checks/code-review/issue-25/verifier-round16/`, uma pasta ignorada (`.gitignore:4`).

Data: 28/10/2026, provas das 11:30 às 11:33 (-03). HEAD `8f045c2` do início ao fim. O `git status --porcelain=v1 -uall` estava vazio às 11:30:01 e às 11:36:07, antes de gravar este arquivo.

## Fontes lidas

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md`, `tlc-implement/references/verify.md` | inteiros; perfil `light` (`AGENTS.md:138`) |
| `.tasks/issue-25-agent-launch.md` | inteiro (655 linhas): critérios 1–42, a exceção ao 40, os dois refinamentos do 42 (`:428-443`) e o registro da ordem remota (`:651-655`) |
| `.checks/issue-25-agent-launch.md` | inteiro (915 linhas): Landing `:50-90`, inclusive a linha nova `:90` “Fonte do `RUNNER_TEMP` na medição”; C1–C50, inclusive o refinamento (m)–(n) em `:531-551`; Swept `:553-563`; Handoff `:878-915` |
| proposta, handoff `ci40702252461-handoff.md` (59 linhas) | inteiros |
| build `:1674-1787` | a seção nova. É **relato do autor**, não prova minha |
| `context-ci28-verifier16-final.json` | 27 comentários e 9 ACs (`- [ ]`). Corpo e comentários 1–26 são **idênticos** ao contexto 15. O 27º registra as rodadas 16/10 (`verifier-round16/context16-ac9.txt`) |
| relatório R15/R14 (`f468f6e`) | inteiro, antes de substituí-lo |
| diff `41dcf5d..HEAD` | inteiro; script e prova lidos inteiros no HEAD |
| log `ci40702252461-ubuntu.log` | as linhas de falha (`:179`, `:191`, `:218-248`) e o resumo `tests 23 / pass 21 / fail 2` (`:200-203`) |

## Prova Git: só o C50 mudou de conteúdo executável (verified at `8f045c2`; `verifier-round16/blob-identity.txt`)

- **Árvore inteira**: `git ls-tree -r` dá 317 caminhos em `13bb1d4` e 318 no HEAD.
  - Mudaram 8 caminhos: build, proposta, checklist, `.verified.md`, task, `code-review.config.json`, `scripts/ci-lock-latency.mjs` (`cf29122` → `8c12894`) e `scripts/ci-lock-latency.test.mjs` (`a829110` → `75eeadd`).
  - Entrou 1: o handoff `ci40702252461-handoff.md`.
  - Os outros **309 caminhos têm o mesmo modo e o mesmo blob**: `src/`, `tests/`, `.github/`, `package.json`, `package-lock.json`, `.gitattributes`, `scripts/governance-ci.test.mjs` (`bfe5a0c`), `test-integrations.mjs`, os filtros de CI, o README e os guias.
- **Executável diferente**: `git diff --stat 13bb1d4 HEAD -- src tests scripts .github package.json package-lock.json .gitattributes docs README.md` lista só o script (+7/−3) e a prova (+49). O último commit de código é `f133c55`.
- **Core**: os 5 arquivos (`README.md`, `cli.mjs`, `review.mjs`, `review.test.mjs`, `schema.json`) têm o mesmo blob na base, em `13bb1d4` e no HEAD (`25e5284`, `c6a4abc`, `1bda8e4`, `216125c`, `b02001e`).
- **Configuração** (`core-config.txt`): fora de `roundOverrides["25"]`, o documento é `deepStrictEqual` ao de `13bb1d4`.
  - Perfis globais `light`/`ui`/`direct` com `maxRounds` 2; overrides 3:9, 4:10, 5:10, 6:3, 7:35, 8:3 e 23:4 intactos.
  - O `25` é `{profile: "light", maxRounds: 10, approval}`. O `approval` cita 6471545504 e 6467154706 e diz “Preservar as 9 tentativas anteriores”.
  - O `state.json` tem **9 tentativas**: 1–3 `changes_requested`, 4–7 `ready`, 8 `blocked` (`bedda5c`) e 9 `ready` (`41dcf5d`). O sha256 `3276a6b8…` é o mesmo antes e depois deste relatório. Não rodei `review:run`.
- **Nenhum teste lê o que mudou fora do C50**:
  - os testes que leem `.checks/` leem os builds das issues 5, 6 e 8, sem diff;
  - as menções à #25 em `src/` e `tests/` são comentários;
  - a suíte do motor usa configuração própria num repositório de fixture (`review.test.mjs:666-670`);
  - **nenhum código fora do script lê `RUNNER_TEMP`** (`runner-temp-readers.txt`: 0 linhas em `src`, `tests`, `scripts`, `.github` e `package.json`). Então a ausência de `RUNNER_TEMP` nas execuções da R14 não afeta C1–C47.
- **Evidência da R14 ligada ao commit** (`r14-carry-evidence.txt`): o `get-tar-commit-id` do tar da R14 é `13bb1d4f…`; o env de A registra `HEAD=13bb1d4…`. Os TAP de A/B/C dão `tests 151, pass 145, fail 0, skipped 6`, e o `D-summary` dá `tests 1023 pass 1003 fail 0 skipped 20`. Os sha256 dos logs estão no arquivo. Li os logs; não os reexecutei.

## Correção contra o contrato refinado antes do código (verified at `8f045c2`)

`efa56ea` (antes do código) acrescenta a linha `:90` do Landing, o C50 (m)–(n) e o refinamento do critério 42, só com acréscimos. `f133c55` toca só `scripts/ci-lock-latency.mjs` (`lat`) e `scripts/ci-lock-latency.test.mjs` (`t`).

| Contrato (Landing `:90`, C50 (m)–(n), task `:440-443`) | Código no HEAD |
| --- | --- |
| `resolveDestinations` usa só a entrada recebida; sem a chave, `undefined` ou `""` → `RUNNER_TEMP ausente`, sem ler `process.env` | `lat:71`: `runnerTemp` sem padrão (os outros padrões, `tmpdir`, `platform`, `realpath` e `isDirectory`, iguais); `lat:74` `undefined \|\| ""` → `{indisponivel: "RUNNER_TEMP ausente"}` |
| `measure` mantém `env = process.env` (a leitura do CLI); um `env` dado é o único ambiente | `lat:402` `env = process.env`; `lat:403` `runnerTemp: env.RUNNER_TEMP` |
| CLI, prazos, quantidades e formato iguais | `lat:445` `measure()` sem argumentos; `PHASE` (`lat:21`) sem diff |
| Filhos não leem a variável | `producerProcess`/`loadProcess` (`lat:181-216`) não leem `RUNNER_TEMP` |
| Provas: `RUNNER_TEMP` do processo numa pasta própria, distinta do temporário da prova, e restaurado no `finally`; `TEMP`/`TMP` intactos | `t:102-111` `withProcessRunnerTemp` (restaura o valor anterior ou apaga, `:108-109`); só `RUNNER_TEMP` é tocado |

Sem flag, camada ou opção de prova nova. O workflow não mudou (blob igual), e nenhum skip nem asserção antiga foi relaxado: `git diff 41dcf5d f133c55 -- scripts/ci-lock-latency.test.mjs` só acrescenta linhas.

## Execuções — verified at `8f045c2`

O comando é o do alias e o do C50: `node --test scripts/governance-ci.test.mjs scripts/ci-lock-latency.test.mjs`, uma invocação por ambiente, sem filtro, com reporters spec e TAP.
- O `RUNNER_TEMP` foi posto **só no ambiente do processo filho**, no prefixo da linha de comando ou no `env -i`. O shell pai e o host continuaram sem ele, antes e depois.
- A precondição foi conferida pelo node de cada ambiente, com o mesmo ambiente do filho (`*.env.txt`).
- Scripts: `run-win.sh`, `b-clone-prepare.sh`, `wsl-prepare.sh`, `wsl-run.sh`, `wsl-cleanup.sh` e `matrix.mjs`, adaptados do método da R14 depois de lê-lo.

| # | Ambiente | `RUNNER_TEMP` (precondição) | Resultado |
| --- | --- | --- | --- |
| A | Windows 11, checkout principal, Node **v24.22.1** (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, `npm_execpath` ausente. 11:30:12–11:31:00 | `verifier-round16\runner-temp-A`: presente, pasta real, não link, 0 entradas, fora do `%TEMP%`, distinto do `os.tmpdir()`, sem prefixo de prova; `TEMP`/`TMP` intactos | **25: 25 pass, 0 fail, 0 skip**, exit 0. Status vazio antes e depois; `RUNNER_TEMP` com 0 entradas depois |
| B | Windows 11, Node **v24.13.0 oficial** (zip com sha256 `ca274269…` igual ao `SHASUMS256.txt`; `node.exe` igual ao do zip), npm **11.6.2** adjacente (primeiro `npm` do PATH), `npm_execpath` ausente. **Clone git novo** `--no-hardlinks --config core.autocrlf=true`, com HEAD e árvore esperados e `node_modules` copiado. 11:31:29–11:32:12 | `runner-temp-B`, com as mesmas condições | **25/25/0/0**, exit 0. No clone (`B-clone-prepare.txt`): `i/lf w/crlf` no script (452 CRLF), na prova (446), em `governance-ci.test.mjs` (359), no workflow (95) e no `package.json` (34). Status do clone vazio antes e depois |
| C | WSL `Ubuntu`, `oldboydev` uid 1000. `git -c core.autocrlf=false archive HEAD`: 5.888.000 bytes, sha256 `87835d5d…`, `get-tar-commit-id` = `8f045c2…`. Árvore extraída `a3b3b630…` = `HEAD^{tree}`, antes e depois; 0 CR; `cli.mjs` 755. Node **v24.13.0** copiado byte a byte de `/usr/bin/nsolid` (sha256 `150946e4…`) num prefixo `bin = node npm npx`, **sem `sh`**; npm 11.6.2. `env -i`, com `HOME` do scratch, `LANG=C.UTF-8` e `PATH=<prefix>/bin:<tools>` sem `/usr/bin`. `tools` só com links para `sh` (dash), `git`, `python3`, `id`, `grep` e `mkfifo`. 11:33:06–11:33:10 | Variáveis do filho: só `HOME,LANG,PATH,RUNNER_TEMP`. `RUNNER_TEMP=<scratch>/runner-temp`: presente, pasta, 0 entradas, distinto de `/tmp` | **25/25/0/0**, exit 0. `~/.skill-me` e a autorização reais ausentes antes e depois; home do scratch vazio depois; `RUNNER_TEMP` com 0 entradas depois |

**Nomes** (`matrix.txt`): 25 nomes únicos, iguais em A, B e C: 18 `C50 …` e 7 `governance-`, nenhum outro e nenhum com 0 execuções.
- Os 23 nomes da CI 40702252461 estão todos aqui (“ausentes aqui: nenhum”).
- Os 2 novos: `C50 fonte do RUNNER_TEMP: com a variável presente no processo, o planejamento sem valor e a medição com env {} não a herdam` (m) e `C50 fonte do RUNNER_TEMP pelo padrão do CLI: sem env, a medição lê o RUNNER_TEMP do processo e, distinto, roda A1/B/A2 nele` (n).

**A precondição da CI foi reproduzida.** Na CI, com `RUNNER_TEMP` no processo, `C50 caminhos` saiu `RUNNER_TEMP ilegível [ENOENT]` (log `:218`) e `C50 relatório` saiu `A1/B/A2` (`:248`). Aqui, com `RUNNER_TEMP` presente em A, B e C:
- `C50 caminhos` passou: `t:160` `plan(undefined)` = `RUNNER_TEMP ausente`;
- `C50 relatório` passou: `t:395-396` `measure({env: {}})` dá uma fase `A`.

**Durações** em ms (A / B / C):
- (m): 2.757 / 2.225 / 88;
- (n): 8.120 / 7.479 / 274;
- `C50 relatório`: 11.307 / 10.728 / 379;
- `C50 limpeza que falha depois dos dados`: 8.879 / 7.624 / 295;
- `C50 teto`: 3.589 / 2.968 / 1.509.

## C50 — citações renovadas para o arquivo testado (verified at `8f045c2`; `t` blob `75eeadd`, `lat` blob `8c12894`)

| C50 | Asserção decisiva (valor literal) | Código |
| --- | --- | --- |
| (a) percentis e faixas | `t:127` `summarize([700,10,650,599.999,20,649.999,600])` = `{amostras: 7, p50: 600, p99: 700, max: 700, ">=600": 4, ">=650": 2}`; `t:128-132` `1…100` = `{100, 50, 99, 100, 0, 0}`; `t:133` 3 casas, contagem sobre o valor cru; `t:134` `BANDS_MS` `[600, 650]`; `t:138` `summarize([])` = `{amostras: 0, indisponivel: "sem amostras"}` (`t:68`); `t:141-143` fase só de erros `{2, 2, 2, 0}`, métricas indisponíveis, `es: {EIO: 2}` | `lat:37-48` |
| (b) caminhos | `t:147-150` `C:\Temp` = `c:\temp\`, volumes distintos, `/tmp` = `/tmp/`, `/tmp` ≠ `/TMP`; `t:160-163` ausente (`undefined`), vazio, `ilegível [ENOENT]`, `não é pasta` → `não aplicável: <motivo>` e uma fase `A`; `t:164` mesmo destino; `t:165-173` `A1/B/A2`, `runner: {volume: "D:"}`, fases A1 padrão, B runner, A2 padrão; `t:174` `padrao: {volume: "C:"}`; `t:184` junção real → uma fase; `t:187` pasta distinta → `["A1","B","A2"]` | `lat:52-56`, `:71-95` |
| (c) E/S | `t:206` `["EIO","lock_present","lock_present"]`; `t:207` sem tomada, liberação nem remoção; `t:209` `{3,3,3,0}`, `{lockPresent: 2, lockLost: 0, es: {EIO: 1}}` e indisponíveis; controle `t:214` | `lat:141-149`, `:329-333` |
| (d) teto | `t:223` `timedOut` true; `t:227` `[true, {12, 0, 0, 12}, indisponível, indisponível]`; `t:228` carga `[1, 0]`; término parcial `t:239` `[true, {3, 2, 0, 1}]` e `t:240` `{amostras: 2, p50: 1.5, p99: 700, max: 700, ">=600": 1, ">=650": 1}` | `lat:257-260`, `:225-235` |
| (e) só filhos próprios | `t:225` `process.kill(foreign.pid, 0) === true`; `t:224` filhos com `exit`; também `t:330` e `t:365` | `lat:263-285` |
| (f) limpeza | `t:259` `fora da árvore própria`; `t:265`/`t:267` `sem o marcador desta execução`; `t:271` junção → `não é uma pasta real`; `t:273` `caminho relativo`; `t:274` `não é a pasta criada por esta execução`; `t:275` nada apagado; `t:277-278` a própria sai; `t:279` as recusadas continuam | `lat:368-393` |
| (g) protocolo | `t:244` `{records: [ok(1)], invalid: 2}`; `t:247` `[{3, 1, 0, 2}, 3, 1]` | `lat:104-117`, `:319-326` |
| (h) fronteira real | `t:377` `[false, {15, 15, 0, 0}, {0, 0, {}}, 0]`; `t:378-381` 15 amostras e `p50 ≤ p99 ≤ max` em tomada, liberação e nas 4 operações; `t:382` `[3, 3, {}]`; `t:383` `escritas >= 3`; `t:384` `{codigo: 0, sinal: null}` ×3 | `lat:219-220`, filhos reais |
| (i) relatório e constantes | `t:392` `A1/B/A2`, 6 por fase; `t:393` `{removidas: 3, recusadas: [], falhas: []}`; `t:394` pastas vazias; `t:395-396` `env: {}` → `["não aplicável: RUNNER_TEMP ausente", {indisponivel: "RUNNER_TEMP ausente"}, ["A"]]`, **agora com `RUNNER_TEMP` no processo**; `t:397-403` sem destinos, `os.tmpdir()`, `PATH` (também escapado) nem nonce; `t:443` `PHASE` = `{3, 500, 3, 65_536, 120_000}`; `t:445` `[2, "", "uso: node scripts/ci-lock-latency.mjs\n"]` | `lat:21`, `:402-434`, `:436-452` |
| (j) limpeza que falha | `t:288` `{ok: false, falha: code ?? "Error"}` para `EBUSY`/`EPERM`/`ENOTEMPTY`/sem código; `t:289` pasta e marcador ficam; `t:299-302` `[["A1","padrao",6,null],["B","runner",6,null],["A2","padrao",6,null]]`; `t:303` `{removidas: 2, recusadas: [], falhas: ["EBUSY"]}`; `t:304-307` só A1 ficou, com marcador; `t:308` runner vazio; `t:309-312` sem caminhos nem `injetada` | `lat:387-391`, `:426-431` |
| (k) início parcial | `t:327` `[false, "EEXIST", ["carga","produtor"]]`; `t:328` fecharam; `t:329` `[false, false]`; `t:330` alheio vivo; `t:332-335` `[false, "EEXIST", {6, 0, 0, 6}, {amostras: 0, indisponivel: "sem amostras"}]` | `lat:286-305` |
| (l) erro assíncrono | `t:358-361` `[false, "ENOENT", ["carga","produtor","produtor","produtor"]]`; `t:362` fecharam; `t:364` `[false, false, false]`; `t:365` alheio vivo; `t:367` `[false, "ENOENT", {6, 0, 0, 6}]` | `lat:276`, `:303-308` |
| **(m)** sem ambiente implícito | `t:413` a variável está no processo; `t:414` `resolveDestinations({tmpdir, runnerTemp: undefined})` e `t:415` sem a chave = `absent` (`t:411`: `{comparacao: "não aplicável: RUNNER_TEMP ausente", runner: {indisponivel: "RUNNER_TEMP ausente"}, phases: [["A","padrao",standard]]}`); `t:417-420` `measure({env: {}})` = `["não aplicável: RUNNER_TEMP ausente", {indisponivel: "RUNNER_TEMP ausente"}, [["A","padrao",6]]]`; `t:421` nada no `RUNNER_TEMP` do processo | `lat:71`, `:74`, `:403` |
| **(n)** leitura do CLI | `t:429` `measure({phase, tmpdir})`, sem `env`; `t:430-433` `["A1/B/A2", [["A1","padrao",6],["B","runner",6],["A2","padrao",6]]]`; `t:434` `{removidas: 3, recusadas: [], falhas: []}`; `t:435` as duas pastas vazias; `t:436-439` sem os caminhos | `lat:402-403`, `:445` |

Achados de precisão no C50, não bloqueantes:
- **(m) discrimina o defeito.** Durante (m), `process.env.RUNNER_TEMP` é a pasta que a prova criou. Com o padrão antigo, `t:414` e `t:417-420` dariam `A1/B/A2`, como no RED do autor (`build:1723-1728`).
- **`t:421` não decide sozinha.** A limpeza esvaziaria a pasta de qualquer forma; quem decide é `t:417-420`.
- **(n) não fixa em qual pasta a fase B rodou.** Ela prova que, sem `env`, `measure` lê um `RUNNER_TEMP` do processo, válido e distinto (`A1/B/A2` e B com destino `runner`). Não distingue a leitura no momento da chamada de uma cópia do ambiente feita no carregamento do módulo. Nos meus A/B/C, o `RUNNER_TEMP` de fora também era válido, e as duas pastas terminaram vazias.
  - Para o CLI, as duas leituras são o mesmo ambiente do processo. O contrato não pede a distinção.
  - Registro como precisão do teste, não como defeito.
- **A restauração do `finally` foi lida (`t:102-111`), não observada.** Nenhum teste posterior do arquivo a afirma, e eu não acrescento sondas (LIGHT). Nos meus três ambientes, o shell pai continuou sem `RUNNER_TEMP`, e cada `RUNNER_TEMP` controlado terminou com 0 entradas.

## C49 e C48 (C49 verified at `8f045c2`; C48 estrutural carried from `13bb1d4`)

- **C49**: `governance-C49 …` passou em A, B e C. A prova tem o mesmo blob (`bfe5a0c`), e as citações são as da R14, relidas no HEAD:
  - `gov:317-324`: as chaves exatas do job;
  - `gov:325-329`: `"Diagnosticar lock Windows (manual)"`, `"github.event_name == 'workflow_dispatch'"`, `"windows-latest"`, `10` e `{contents: "read"}`;
  - `gov:332-339`: os mesmos `uses` do `verify`, com `{"persist-credentials": false}` e `{"node-version": "24.13.0"}`, por igualdade exata;
  - `gov:341`: `npm ci --ignore-scripts`; `gov:345`: `ci.needs` `["changes","verify"]`; `gov:348-350`: nenhum `continue-on-error`;
  - `gov:355`: o alias com os dois arquivos; `gov:358`: `private === true`;
  - `gov:294-299`: os jobs `["changes","ci","lock_diagnostics","verify"]`.
- **C48**: `governance.yml` tem o mesmo blob de `13bb1d4`. A leitura estrutural da R14 continua válida (`verifier-round14/v14/C48-structural.txt`, sha256 `603dc3cd…`): o documento inteiro sem `lock_diagnostics` e sem `verify.timeout-minutes` é igual a `d0d5a7f` e à base. A parte executável (`governance-C1 C3`, `gov:240-291`) rodou **fresca** em A/B/C.
- A expressão `${{ … }}` e o `if` do job manual não foram avaliados pelo GitHub aqui.

## Checks — 50/50

“CARRY14” quer dizer: executado pela R14 em `13bb1d4` (A/B/C 151/145/0/6; D com os 12 nativos), sobre blobs iguais aos do HEAD. As citações são as do corpo R14 abaixo, válidas no HEAD pelo blob. Reli no HEAD uma amostra (`carry-citation-sample.txt`), toda conforme: `cmd:48-49`, `cmd:105`, `prep:93-94`, `sess:67`, `store:168`, `end:120`, `end:320`, `rep:159`, `harn:88`, `conc:214-215`, `ag:310` e `docs:82`.

| Check | Asserção decisiva (`file:line` no HEAD) | Fonte da prova | Result |
| --- | --- | --- | --- |
| C1 | `command.cli:48-49` `private === true`, `bin` = `{"skill-me": "src/integrations/launch/cli.mjs"}` | CARRY14 (A/B/C/D; B em clone `autocrlf=true`) | PASS |
| C2 | `command.cli:96-98` `argv: LITERAL_ARGS` para os 3 agentes | CARRY14 | PASS |
| C3 | `command.cli:105` `{0: 0, 7: 7}` | CARRY14 | PASS |
| C4 | `command.cli:130-133` `{status: 127, [launcher_requires_shell], sentinel: false}` | CARRY14 | PASS |
| C5 | `command.cli:228` `signals: ["SIGINT","SIGQUIT","SIGHUP"]`; `:244-245` `CTRL_C_EVENT` → `["SIGINT"]` | CARRY14 | PASS |
| C6 | `command.cli:267` `signals: ["SIGTERM"]` | CARRY14 (C) | PASS |
| C7 | `prepare.cli:93-94` `{status: 127, stdout: "", code: true, asked: false}` | CARRY14 | PASS |
| C8 | `prepare.cli:122-126` texto exato até cada pergunta, árvores iguais | CARRY14 | PASS |
| C9 | `prepare.cli:163-168` `observe.json` da #23 | CARRY14 | PASS |
| C10 | `prepare.cli:189-191` `{exitCode: 3, …, started: false, root: false}` | CARRY14 | PASS |
| C11 | `prepare.cli:200` `{exitCode: 2, [root_not_absolute], …}` | CARRY14 | PASS |
| C12 | `prepare.cli:223` `status: 3`, linha `setup_required` | CARRY14 | PASS |
| C13 | `prepare.cli:238` SHA-256 iguais, `started: 1` | CARRY14 | PASS |
| C14 | `prepare.cli:250` `observe_on` 4 | CARRY14 | PASS |
| C15 | `prepare.cli:408` `{status: 3, declined: true, trees: before}` | CARRY14 (C, pty) | PASS |
| C16 | `session.e2e:67` `{origin: "launch", …, limits: {maxEvents: 500, maxBytes: 8388608}}` | CARRY14 | PASS |
| C17 | `store.unit:79` `["launch", invocation, 1, "2026-10-26T10:00:00.000Z"]` | CARRY14 | PASS |
| C18 | `session.e2e:111` `stderr: "skill-me: não foi possível abrir a execução [<código>]\n"` | CARRY14 | PASS |
| C19 | `session.e2e:161` `[0, 0]` (nada em automática nem manual) | CARRY14 | PASS |
| C20 | `session.e2e:190-192` `code: "binding_invalid"` | CARRY14 | PASS |
| C21 | `session.e2e:208-211` bytes iguais | CARRY14 | PASS |
| C22 | `session.e2e:230` `[1, "stopped", 500, 500, {}]` | CARRY14 | PASS |
| C23 | `session.e2e:282` `["active", MAX_BYTES, {}, 1]` | CARRY14 | PASS |
| C24 | `store.unit:168` `[opened.capture, "stopped", 1]` | CARRY14 | PASS |
| C25 | `end.e2e:80-89` stderr exato do resumo | CARRY14 | PASS |
| C26 | `end.e2e:101-109` `eventos gravados: 0.` e a dica | CARRY14 | PASS |
| C27 | `end.e2e:120` `{launch: true, code: "launch_ended", …, lost: 1}` | CARRY14 | PASS |
| C28 | `end.e2e:164-165` `persisted` 3 e `stopped`; regressão `end.e2e:194` `["EIO"]` | CARRY14 | PASS |
| C29 | `command.cli:278` término pelo sinal | CARRY14 | PASS |
| C30 | `command.cli:342` `captures: [[1, "stopped", 0]]` | CARRY14 | PASS |
| C31 | `end.e2e:205-215` `[lock_present]`, `continua active`, `privacy stop` | CARRY14 | PASS |
| C32 | `end.e2e:320` `"eventos intercalados: B terminou antes"`; `store.unit:715` `lock_present` | CARRY14 (9 testes) | PASS |
| C33 | `end.e2e:460` `active`; `:493-494` `spawn sh ENOENT` | CARRY14 | PASS |
| C34 | `report.cli:159` `[newInv, true]` | CARRY14 | PASS |
| C35 | `report.cli:252-259` `not_configured` / `no_launch_capture`, `schemaVersion: 1` | CARRY14 | PASS |
| C36 | `command.cli:350` `[0, SKILL_ME_HELP, ""]` | CARRY14 | PASS |
| C37 | `docs.test:82` `deepEqual(observed, expected)` (os 9 limites) | CARRY14 | PASS |
| C38 | `prepare.cli:355` `["done", 0]` | CARRY14 (A/B/D) | PASS |
| C39 | `hermes-harness.unit:88` `["concluded", 0, 3]` | CARRY14 | PASS |
| C40 | `hermes-harness.unit:196-225` `[5000, "timeout"]`; nativo `hermes-plugin.native:335` | CARRY14 (nativo em D) | PASS |
| C41 | `store.unit:327-523`; `end.e2e:518` | CARRY14 (17) | PASS |
| C42 | `command.cli:456` Windows `status: 130`; `:424` POSIX | CARRY14 | PASS |
| C43 | `store.unit:598` `{code: "root_changed", opened: true, …, lockLeft: false}` | CARRY14 (12) | PASS |
| C44 | `hermes-harness.unit:263-271` `[1000, "timeout"]` | CARRY14 (nativo em D) | PASS |
| C45 | `agent.unit:132-146`; `command.cli:166-186` | CARRY14 | PASS |
| C46 | `concurrency.cli:214-215` `{bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0}` | CARRY14 | PASS |
| C47 | `agents.e2e:310` `deepEqual(run.report?.delivery, expected, …)` | CARRY14 | PASS |
| C48 | estrutural: documento sem o job manual = `d0d5a7f`; `governance-C1 C3` (`gov:263-278`) | estrutural CARRY14 (workflow com o mesmo blob) + `governance-C1 C3` **fresco** em A/B/C | PASS |
| **C49** | `gov:317-358` (ver acima) | **fresco** em A/B/C | **PASS** |
| **C50** | (a)–(n), tabela acima; (m) `t:414-420`, (n) `t:430-434` | **fresco** em A/B/C, 18/18, com `RUNNER_TEMP` presente | **PASS** |

**AC → checks**:
- AC1–AC8: C1–C48, como na R14 (carry);
- AC9: C49 e C50 frescos e C48 com a exceção. O AC9 do contexto 16 é idêntico ao do 15.

## Swept `existing` (lido no HEAD; sem diff na feature)

- **Idempotência**: `privacy/lifecycle.mjs:24` `stopped` + `stop` → `changed: false`.
- **Sem reenvio**: `traces/delivery.mjs:57` (“encerra a tentativa sem reenviar”) e `:113` (“nunca é reenviada”).
- **Falha de entrega não bloqueia**: `traces/delivery.mjs:146` (“a entrega nunca lança para a observação”).
- **`privacy prune` existente**: `privacy/command.mjs:56-57`.

Os dois arquivos citados acima (`lifecycle.mjs` e `delivery.mjs`) têm 0 diff desde `63621c6`.

## Gates remotos — pendentes e obrigatórios (nenhum ocorreu aqui)

1. A revisão formal 10 do orquestrador sobre este HEAD.
2. Com PASS e `ready`, a publicação no PR #28.
3. **Uma** execução manual do `lock_diagnostics` sobre o HEAD aprovado e publicado, com o registro dos resultados A1/B/A2 (ou da equivalência), dos erros e das amostras incompletas.
4. Os **cinco checks regulares verdes** nesse HEAD e a reconferência das fontes.
5. O merge humano, só com 3 e 4 cumpridos.

O `ready` autoriza publicar, não declara a medição nem a CI e não libera o merge. A execução 40702384050 (sobre `41dcf5d`) é histórico: não demonstra a causa dos `lock_present`/`delivery_timeout` do Windows nem cobre este HEAD. O uso real continua no `Unresolved` 2.

## Processo, limites e limpeza da R16

**Executado.**
- git só de leitura: `rev-parse`, `status`, `log`, `show`, `diff`, `ls-tree`, `merge-base --is-ancestor`, `check-ignore`, `get-tar-commit-id`.
- `git archive -c core.autocrlf=false`.
- `git clone --no-hardlinks --config core.autocrlf=true`, com a configuração só no clone.
- `node -e` só de leitura (contexto, configuração e estado), `sha256sum` e `python -I` para contar bytes.
- As três invocações A, B e C, uma vez cada, sem repetição. O WSL foi chamado com `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc` e `MSYS_NO_PATHCONV=1`.

**Não executado.**
- `npm test` (D), o alvo de 151, mutações, sondas e o CLI da medição.
- Agentes reais, modelos, perfis, credenciais, banco, alterações de host, relógio, antivírus, Git global ou runtime.
- Actions, CI, `review:run`, commit, push, PR ou merge.
- O incidente da R5 (`ffc5937`) não é desfeito nem repetido. As auditorias externas anteriores não são minhas e não as li.

**Limites.**
- C1–C47 e as camadas de D são da R14, não desta rodada. O que vale é a identidade dos blobs, não uma execução em `8f045c2`.
- Os skips da R14 continuam: os 7 do doctor, 6 do I4 e o do T8-C4 não foram executados em ambiente nenhum da R14.
- macOS e o runner não foram executados.
- A restauração do `RUNNER_TEMP` nas provas foi lida, não observada por asserção.
- As causas históricas continuam desconhecidas.

**Limpeza** (`cleanup.txt`, `C-wsl-cleanup.txt`):
- o clone de B foi removido depois de conferir o caminho absoluto, o tipo (diretório, não link), o HEAD `8f045c2` e o status vazio;
- `runner-temp-A`/`-B` foram removidas depois de conferir 0 entradas;
- o scratch do WSL `/tmp/skillme-verifier-r16.pRQbOZ` foi removido pelo padrão absoluto (restam 0);
- não sobrou nenhuma `skill-me lock latency *` nem `skill-me-lock-latency-*` no `%TEMP%` ou no `/tmp`;
- o host continua sem `RUNNER_TEMP`;
- nenhum processo ficou em segundo plano.

Ficam em `verifier-round16/`: logs, TAP/spec, `matrix.txt`, o tar do HEAD e os meus scripts.

**Integridade do histórico abaixo**: o texto depois da linha `---` final deste adendo é, byte a byte, o blob `f468f6e` (`.verified.md` de `41dcf5d`, igual no HEAD): o adendo R15 e o relatório R14.
- Fica como histórico.
- As seções C50 do corpo R14 (“Achados 2 e 3” e “AC9 — C50”, citações `t:` e `lat:` de `13bb1d4`) estão **substituídas** pela tabela C50 deste adendo: a prova é a fresca da R16, e as linhas citadas são as do arquivo atual.
- Os números de D da R14 não são reivindicados como D deste HEAD.

---

# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25 (rodada 15, adendo)

**Verdict (R15)**: **PASS** da correção documental da ordem revisão → publicação → medição → CI → merge, em `68e96d8`. Não há contradição com a fonte aprovada, critério ou exigência removidos, alteração funcional nem carry inválido.
- **Escopo**: `bedda5c..68e96d8` mudou só prosa (task, checklist e proposta, só com acréscimos) e o override `25` da configuração (`maxRounds` 8 → 9 e o texto `approval`). `src/`, `tests/`, `scripts/` (inclusive o core), `.github/`, `package.json` e `.gitattributes` têm 0 diff desde `13bb1d4`. O último commit de código continua `6a242a2`.
- **Provas executáveis: CARRY da R14, não suíte nova.** Os 50 checks e os gates A/B/C/D foram executados pela R14 em `13bb1d4` (relatório em `bedda5c`, preservado abaixo). Não executei nenhum teste nesta rodada e não afirmo ter testado `68e96d8`. O carry vale porque o conteúdo executável é byte a byte o mesmo (prova Git abaixo).
- **Gates remotos: pendentes e obrigatórios.** Nenhuma medição, job do Actions ou CI ocorreu. São condições de merge, não foram dispensados e não são dados como ocorridos aqui.

**Checks**: **50/50, carried from `13bb1d4`** (R14), sem nenhum resultado alterado:
- A, B e C: 151 testes cada, 145 pass, 0 fail, 6 skip, com nomes idênticos;
- D (`npm test`): 1.023 testes, 1.003 pass, 0 fail, 20 skip, exit 0, com os 12 nativos do Hermes;
- os 16 C50 (4 novos), `governance-C1 C3` e `governance-C49` verdes em A/B/C/D; I23-C4 ×7 e T8-C11 verdes em D.

**Profile**: light. Rodada 15 **escopada e documental**. Sem fault injection, `Coverage` ou `Test policy` (perfil) e sem fonte de UI. Nenhuma execução de produto, teste, agente, host, modelo ou WSL, nem auditoria de metadados.
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..68e96d89c95a8c43ba6779b9b125f4ed6a21f068`, a feature inteira: 95 commits, árvore `6f624ed3…`. Desde a R14, `13bb1d4..68e96d8` tem dois commits: `bedda5c` (o relatório da R14) e `68e96d8` (a correção documental).
**Round**: **15** (light, escopada). Base: a autorização humana “Pode fazer quantas precisar” e a ordem medição → CI verde → merge ([issuecomment-6467154706](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706)), com o registro específico 15/9 em [issuecomment-6470507482](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6470507482) (26º comentário). Ficam preservadas as 14 verificações e as 8 revisões formais. A revisão formal 9 é do orquestrador, depois deste relatório.
**Verifier**: subagente novo e independente (Claude Opus 5.5). Não sou o autor nem o Verifier 14, e não herdei sessão. Produto, testes, scripts, workflow, planos, checklist, configuração e estado ficaram só para leitura. Escrevi apenas este adendo, no começo do arquivo, e logs em `.checks/code-review/issue-25/verifier-round15/`, pasta ignorada. O relatório da R14 segue abaixo **byte a byte igual** ao blob `a203fbf6…` de `bedda5c`.

Data: 28/10/2026. HEAD `68e96d8` do início ao fim. O `git status --porcelain=v1 -uall` estava vazio às 10:46:56 (-03), antes de gravar este arquivo.

## R15 — o que mudou desde a R14 (verified at `68e96d8`)

| Commit | Arquivo | +/− | Conteúdo |
| --- | --- | --- | --- |
| `bedda5c` | `.checks/issue-25-agent-launch.verified.md` | +317/−160 | relatório da R14 (o corpo abaixo) |
| `68e96d8` | `.checks/issue-25-agent-launch.ci-runner-measure-proposal.md` | +6/−0 | “Handoff da sequência de revisão e medição” (`:5-7`) |
| `68e96d8` | `.checks/issue-25-agent-launch.md` | +6/−0 | o mesmo handoff (`:5-7`), antes de `Sources` |
| `68e96d8` | `.tasks/issue-25-agent-launch.md` | +7/−0 | “Registro da ordem das provas remotas”, no fim (`:646-650`) |
| `68e96d8` | `code-review.config.json` | +2/−2 | só `roundOverrides["25"]` (`:54-58`): `maxRounds` 8 → 9 e `approval` |

## Prova Git: o conteúdo executável é o que a R14 executou (verified at `68e96d8`)

Logs: `verifier-round15/full-tree-compare.txt`, `blob-identity.txt` e `core-blobs.txt`.
- **Árvore inteira**: `git ls-tree -r` de `13bb1d4` e de `HEAD` tem 317 caminhos em cada um. Só os 5 da tabela acima diferem; os outros 312 têm o mesmo modo e o mesmo blob.
- **Arquivos não documentais da feature** (`63621c6..HEAD`, fora de `.checks/` e `.tasks/`): 47. Entre `13bb1d4` e `HEAD`, 46 têm o mesmo blob:
  - `src/` (12) e `tests/` (24);
  - `scripts/ci-lock-latency.mjs`, `ci-lock-latency.test.mjs` e `governance-ci.test.mjs`;
  - `.github/workflows/governance.yml`, `package.json` e `.gitattributes`;
  - o README e os três guias.

  Só `code-review.config.json` difere (`e199744` → `8bd0031`).
- **Core** (`scripts/code-review/README.md`, `cli.mjs`, `review.mjs`, `review.test.mjs` e `schema.json`): o mesmo blob na base, em `13bb1d4` e no HEAD (`25e5284`, `c6a4abc`, `1bda8e4`, `216125c`, `b02001e`). 0 diff na feature.
- **Último código**: `git log -1 -- src tests scripts .github package.json .gitattributes` = `6a242a2`. `6a242a2..13bb1d4` só toca o build, a proposta e o checklist.
- **Nenhum teste lê os arquivos que mudaram**:
  - `docs.test.mjs:16-19` lê o README e os três guias. `governance-ci.test.mjs:242`, `:313` e `:353` leem o workflow e o `package.json`. Todos têm o mesmo blob.
  - A suíte do motor monta um repositório temporário com configuração própria (`review.test.mjs:84-94`). `review.mjs:474` lê a configuração do `cwd` desse repositório, e a do checkout não entra.
  - As menções a `.checks/issue-25-agent-launch.md` em `src/` e `tests/` são comentários.
- **Evidência da R14 ligada ao commit**: o `get-tar-commit-id` de `verifier-round14/v14/head-13bb1d4-lf.tar` é `13bb1d4f44d2…`. `matrix.txt`, `D-summary.txt` e os logs de A, B, C e D existem; os sha256 estão em `verifier-round15/r14-carry-evidence.txt`. Li esses logs e não os reexecutei.

**Limite do carry.** O `verify.md` manda rodar as provas no HEAD novo, porque verde é propriedade de um commit. Aqui segui a instrução do desenvolvedor e o `AGENTS.md:76-78`: documentação pura e encaminhamento sem comportamento novo não exigem testes artificiais. O argumento é a identidade do conteúdo executável, não uma execução em `68e96d8`. O estado do host e dos runtimes depois das 10:21 não foi medido de novo.

## Ordem contra a fonte aprovada (verified at `68e96d8`)

Fontes vinculantes:
- a proposta aprovada em `b2638db`. As regras não mudaram depois: `b2638db..bedda5c` só mudou o título e acrescentou o registro da aprovação, o das rodadas e o estado da implementação;
- a aprovação [6467154706](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706): “Publicar somente após PASS/ready do novo HEAD. O merge do PR28 com CI toda verde continua explicitamente autorizado”.

| Exigência aprovada | Onde foi aprovada | Texto novo | Resultado |
| --- | --- | --- | --- |
| Publicar só depois de PASS e `ready` | proposta `b2638db:41` (no HEAD, `:51`); 6467154706 | issue, “Condições obrigatórias para o merge”: “Após PASS da verificação independente, ready da revisão local e publicação do HEAD aprovado”; task `:648`; `approval` da configuração | igual |
| Uma só execução manual, sobre o HEAD aprovado e publicado | proposta `b2638db:19` e `:42` (no HEAD, `:29` e `:52`) | issue: “executar uma vez a medição manual do workflow existente nessa branch” | igual |
| Registrar a execução e os resultados | frase 6 do AC9 anterior; proposta, passos 1 e 5 | issue: “registrar a execução, os resultados A1/B/A2 (ou equivalência dos destinos), erros e amostras incompletas” | mantido e mais específico |
| Merge só com os checks regulares verdes no HEAD aprovado; o diagnóstico não os substitui | proposta `b2638db:44` e `:29` (no HEAD, `:54` e `:29`); 6467154706 | issue: “Só fazer o merge do PR #28 com essa medição registrada e todos os cinco checks regulares verdes no HEAD aprovado”; AC9: “não uma dispensa da CI” | mantido |
| `ready` não é merge | `AGENTS.md:97-98` (merge humano) | issue: “Ready permite publicar…; não declara que a medição ou a CI já ocorreram e não autoriza merge enquanto estiverem pendentes” | explícito |

Também conferi dois pontos:
- O checklist já dizia que a medição é a do job manual, depois de PASS, `ready` e publicação: C50 (`:499-500`) e Handoff (`:818-820`).
- Nenhum texto novo afirma medição, job ou CI realizados. A proposta e o checklist dizem “Nenhuma medição remota ocorreu neste registro” (`:7` em cada um), e a task diz “Nenhuma execução remota foi feita até este registro” (`:650`).

## Exigências preservadas (verified at `68e96d8`; log `verifier-round15/ac9-preservation.txt`)

- **Issue** (`context-ci28-verifier15-final.json`, 26 comentários). Conferi só por leitura, com `gh issue view 25`, que a issue publicada é igual: título, corpo e os 26 comentários (`verifier-round15/issue25-live.json`).
  - **Inalterado**: os 9 ACs continuam; AC1–AC8 e os comentários 1–25 são idênticos ao contexto da R14, assim como o corpo fora do AC9 e da seção nova.
  - **AC9**: as frases 1–5 continuam literais. Só a 6ª (“A execução manual e os resultados são registrados, e o merge exige os checks regulares verdes no HEAD aprovado.”) saiu do critério de revisão. Ela foi para a seção “Condições obrigatórias para o merge”, que acrescenta “uma vez”, A1/B/A2 ou a equivalência, os erros, as incompletas, “todos os cinco” e a reconferência das fontes.
  - **Termos presentes no AC9**:
    - o job: `workflow_dispatch`, 10 minutos e os cinco checks regulares;
    - o script: `createStoreIo/holdLockFile`, `RUNNER_TEMP` e A1/B/A2;
    - a carga: 3 produtores de 500 ciclos e 3 cargas de 64 KiB com flush, sob teto de 120 s;
    - os resultados: previstas/concluídas/incompletas, erros por código, p50/p99/máximo e ≥ 600/650 ms. Erro, ausência de dados ou término parcial nunca viram zero; os valores são exatos;
    - o que não muda: 750/650 ms, contagens, perdas/retry, carga da suíte e 20/10/5.
  - **Seção de merge**: “Os testes, prazos, contagens, carga, retry e perdas permanecem vinculantes”.
- **Task, checklist e proposta**: só acréscimos (`git diff --numstat bedda5c HEAD`: 7/0, 6/0 e 6/0). Ficam iguais:
  - os critérios 1–42, a exceção datada ao critério 40 e o refinamento do 42;
  - o Landing, C1–C50, Swept e Handoff;
  - as constantes do script (`PHASE`, sem diff).
- **Configuração**: fora de `roundOverrides["25"]`, o documento é igual ao de `13bb1d4` (comparação JSON).
  - Ficam iguais os perfis globais `light`/`ui`/`direct`, com `maxRounds` 2, e os overrides 3:9, 4:10, 5:10, 6:3, 7:35, 8:3 e 23:4.
  - O `25` é `{profile: "light", maxRounds: 9, approval}`. O motor admite essa forma (`review.mjs:490-502`): chaves exatas, o mesmo perfil, `approval` com texto, 9 > 2 e 9 ≤ 35.
  - Com 8 tentativas no estado, resta exatamente a formal 9 (`review.mjs:693`).
  - O `approval` repete as condições: publicar só com PASS/ready; merge só depois da medição registrada e dos cinco checks regulares verdes no HEAD aprovado; sem publicação do pacote.

## Histórico preservado (lido; nada alterado)

- **`state.json` da #25**: 8 tentativas (1–3 `changes_requested`, 4–7 `ready`, 8 `blocked`). Li só o `report` e o `snapshot` da 8ª:
  - HEAD `bedda5c`, `maxRounds` 8, `status: blocked`, `verification: insufficient`;
  - AC1–AC8 `met` e AC9 `unverified`;
  - um achado P2 bloqueante, sobre `.verified.md:405` da R14: a medição remota ainda não feita. Nenhum defeito de código.

  O sha256 do estado, antes de gravar, está em `verifier-round15/pre-write-state.txt`.
- **14 verificações**: FAIL9 (`4e66de2`), FAIL10 (`788d160`), PASS11 (`d0d5a7f`), PASS12 (`9244eea`), PASS13 (`0e0325f`) e PASS14 (`bedda5c`, abaixo). O incidente da R5 continua em `ffc5937`. Não editei `verifier-round1/` a `verifier-round14/`.
- **CIs vermelhas**: 40514323240 e 40636157287 continuam registradas, com as causas desconhecidas.

## Gates remotos pendentes — nenhum ocorreu

1. A revisão formal 9, do orquestrador, depois deste relatório.
2. Com PASS e `ready`, a publicação do HEAD aprovado no PR #28.
3. Uma execução manual (`workflow_dispatch`) do job `lock_diagnostics` sobre esse HEAD, com o registro da execução, de A1/B/A2 ou da equivalência dos destinos, dos erros e das amostras incompletas.
4. Os cinco checks regulares verdes nesse HEAD e a reconferência das fontes.
5. O merge humano, só com 3 e 4 cumpridos.

O `ready`, se vier, autoriza publicar para obter 3 e 4. Não autoriza merge com gate pendente. O uso real continua no `Unresolved` 2 (`blocks go-live`).

## Observações (não bloqueantes; nada corrigido)

- **N1 — referência de linha desatualizada.** `.tasks/issue-25-agent-launch.md:648` cita “(proposta, linhas23 e45–46)”. Essa numeração vale para a proposta de `bedda5c` e para o 26º comentário, publicado às 13:38:13Z, antes do commit das 13:40:36Z.
  - O próprio `68e96d8` inseriu 6 linhas no topo da proposta. No HEAD, as linhas citadas são `:29` e `:51-52`; em `b2638db`, são `:19` e `:41-42`.
  - Hoje, `:23` é `runs-on: windows-latest`, `:45` é vazia e `:46` é o título “Critérios propostos antes do código”.
  - O conteúdo citado existe e sustenta a afirmação, sem contradição. Sugestão: fixar a referência num commit ou atualizar os números.
- **N2 — resumo dos handoffs.** Os handoffs novos (checklist `:7` e proposta `:7`) dizem “provas locais e `ready` autorizam publicar”, sem nomear o PASS. A issue (seção de merge), a proposta (`:51`), a task (`:648`) e a configuração exigem PASS e `ready`. O texto vinculante prevalece, sem afrouxamento.

## Processo da R15

**Executado.**
- git só de leitura: `rev-parse`, `status`, `log`, `show`, `diff` (`--stat`, `--numstat` e `--name-status`), `ls-tree -r`, `cat-file`, `merge-base --is-ancestor`, `check-ignore` e `get-tar-commit-id` no tar da R14.
- `node -e` só de leitura (contexto, configuração e `state.json`) e `sha256sum`.
- `gh issue view 25 --json title,body,comments`: leitura de rede, sem publicar nada.

**Não executado.**
- Nenhum teste, gate, alvo, `npm`, agente, WSL, auditoria de metadados, mutação, sonda ou medição.
- Nenhum `review:run`, Actions, CI, commit, push, PR ou merge.
- Nenhuma alteração em produto, testes, scripts, workflow, planos, checklist, configuração ou estado.

**Logs** em `verifier-round15/`: `blob-identity.txt`, `full-tree-compare.txt`, `core-blobs.txt`, `ac9-preservation.txt`, `r14-carry-evidence.txt`, `pre-write-state.txt`, `issue25-live.json`, `addendum-r15.md` (este adendo) e `post-write-check.txt`.

## Limitações da R15

- Nenhuma prova foi executada em `68e96d8`. O PASS dos 50 checks é da R14, em `13bb1d4`. A R15 só prova que o conteúdo executável é o mesmo e que nenhum teste lê o que mudou.
- As limitações da R14 continuam (seção “Falhas, limitações e o que não está provado”, abaixo):
  - os 7 skips do doctor, os 6 do I4 e o do T8-C4 não foram reexecutados;
  - macOS e o runner não foram executados;
  - o GitHub não avaliou a expressão `${{ … }}` nem o `if` do job manual;
  - as causas dos `lock_present` e dos `delivery_timeout` continuam desconhecidas.
- Fonte remota: só a issue foi lida no GitHub. Nenhum PR, check ou execução do Actions foi consultado.

---

## Relatório da rodada 14 — preservado como histórico (carried from `13bb1d4`; relatório em `bedda5c`)

Segue, sem nenhuma alteração, o relatório da R14 (blob `a203fbf6…`). As citações `file:line` dele valem para `13bb1d4`. Nos arquivos de código e de teste continuam válidas no HEAD, porque os blobs são os mesmos. As linhas citadas do checklist e da proposta estão 6 linhas abaixo no HEAD, por causa dos acréscimos no topo em `68e96d8`; as da task não mudaram.

# Iniciar o agente com captura: `skill-me <agente>` — verificação da issue #25

**Verdict**: **PASS**. Os 50 checks (C1–C50, 9 ACs) têm prova verde em todos os ambientes aplicáveis; o C48 tem prova estrutural autorizada. Os quatro gates passaram no HEAD `13bb1d4`, cada um numa única execução:
- **A**: 151 testes, 145 pass, 0 fail, 6 skip.
- **B**: 151 testes, 145 pass, 0 fail, 6 skip.
- **C**: 151 testes, 145 pass, 0 fail, 6 skip.
- **D** (`npm test` completo): 1.023 testes, 1.003 pass, 0 fail, 20 skip, exit 0, com os 12 nativos do Hermes.

Os dois achados de risco da R13 (2: limpeza que lança; 3: erro no início da fase e `'error'` assíncrono de um filho) estão corrigidos dentro do contrato refinado antes do código (Landing “Limpeza e supervisão em toda saída da medição”, C50 (j)–(l), refinamento do critério 42). As 4 provas versionadas novas passaram em A, B, C e D. **Nenhum job do Actions foi medido ou executado aqui.** A causa dos `lock_present` (CI 40636157287) e dos `delivery_timeout` (CI 40514323240) **continua desconhecida**; nada desta rodada a corrige ou a atribui.
**Checks**: **50/50**. C1–C47, C49 e C50 têm testes nomeados executados; nenhum check ficou com 0 testes. O C48 é provado pela leitura estrutural autorizada do YAML e pelo `governance-C1 C3`/`governance-C49`, que rodaram em A/B/C/D; a expressão do GitHub não foi avaliada aqui. Os 6 skips de cada alvo A/B/C são de plataforma, e cada um rodou no outro sistema (A/B ↔ C). Dos 20 skips de D, só os 6 I25 POSIX rodaram em outro ambiente (C); os 7 do doctor (POSIX/FIFO) e os 7 I4/T8 (POSIX/macOS) **não foram reexecutados** em nenhum ambiente desta rodada.
**Profile**: light. Sem fault injection, `Coverage` ou `Test policy` próprios; sem fonte vinculante de UI. Rodei só os controles versionados e, para o C48, a leitura estrutural autorizada. O RED, as 6 mutações da correção, as 7 mutações do script e as 5 do workflow de `3843867` e os controles do CLI local são do autor e não foram repetidos.
**Diff range**: `63621c691f132dc8d591414269d36cfa18fca594..13bb1d4f44d27a9bee16eccad8d776b149efb4d1`, a feature inteira: 93 commits, árvore `9d5ce9ec…`. Desde a R13 (`631e281`, relatório em `0e0325f`) mudaram:
- **código** (decisões antes do código em `7198fef`, correção em `6a242a2`): `scripts/ci-lock-latency.mjs` (+84/−51) e `scripts/ci-lock-latency.test.mjs` (+160/−2);
- **documentos**: só acréscimos na task (+12), no checklist (+53), no build (+140) e na proposta (+2), mais o relatório da R13 (`0e0325f`).

`.github/`, `package.json`, `code-review.config.json`, `scripts/governance-ci.test.mjs`, `scripts/code-review/` (core), `.gitattributes`, `src/` e `tests/` têm 0 diff em `631e281..HEAD`. `src/` tem 0 diff desde `f734441`, `tests/` desde `0f540a0`, e o core e `scripts/test-integrations.mjs`, `ci-change-filter.mjs` e `ci-result.mjs` na feature inteira.
**Round**: **14** (light), pela autorização humana “Pode fazer quantas precisar”, registrada para esta rodada em [issuecomment-6469551217](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6469551217) (o 25º comentário do contexto), com o escopo aprovado em [issuecomment-6467154706](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706). Ficam preservadas as 13 verificações e as 7 revisões anteriores, inclusive o PASS da R13 (`0e0325f`). A revisão formal 8 é do orquestrador, depois deste relatório. Não alterei limite, estado nem histórico.
**Verifier**: subagente novo e independente (Claude Opus 5.5). Não sou o autor nem um Verifier anterior, e não herdei sessão. Produto, testes, scripts, workflow, planos, checklist, configuração e estado ficaram só para leitura. Escrevi apenas este arquivo e logs/scripts em `.checks/code-review/issue-25/verifier-round14/v14/`, uma pasta ignorada.

Data: 28/10/2026, provas das 10:01 às 10:21 (-03). O HEAD `13bb1d4` ficou o mesmo do início ao fim. `git status --porcelain=v1 -uall` estava vazio:
- antes de A (`v14/git-status-before.txt`);
- antes e depois de A, B (no clone) e D;
- no fim, antes de gravar este arquivo.

## Fontes lidas nesta rodada

| Fonte | Como |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md`, `tlc-implement/references/verify.md` | inteiros; perfil `light` (`AGENTS.md:138`) |
| `.tasks/issue-25-agent-launch.md` | inteiro (644 linhas): critérios 1–42, a exceção datada ao critério 40, o refinamento do critério 42 (`:428-438`) e Sources (`:572`) |
| `.checks/issue-25-agent-launch.md` | inteiro (848 linhas): Landing (inclusive `:81` “Exceção ao C48”, `:82` “Medição comparativa…” e `:83` “Limpeza e supervisão em toda saída da medição”), C1–C50, o refinamento do C50 (`:495-523`), Swept e Handoff (`:827-848`) |
| `.checks/issue-25-agent-launch.build.md` | inteiro (1.672 linhas), inclusive a seção nova “Achados 2 e 3 da verificação 13…” (`:1534-1672`). É **relato do autor, não prova minha** |
| `…ci-runner-measure-proposal.md`, `…ci40636157287-handoff.md`, `…ci40514323240-handoff.md` | inteiros (63, 171 e 134 linhas) |
| `.checks/code-review/issue-25/context-ci28-verifier14-final.json` | **25 comentários** e **9 ACs** (9 linhas `- [ ]`); o AC9 é o da medição comparativa; o 25º comentário registra só a 14ª verificação, com a formal 8 disponível e sem aumento de teto |
| `.checks/issue-25-agent-launch.verified.md` da R13 | inteiro, antes de substituí-lo, inclusive os achados 2 e 3 (`:294-295`) |
| Diffs | `631e281..HEAD` inteiros do script e da prova; `scripts/ci-lock-latency.mjs` e `.test.mjs` lidos inteiros no HEAD; `d0d5a7f..HEAD` de `.github/`; `63621c6..HEAD` de `code-review.config.json`, `.gitattributes` e do core |
| Método da R13 (`verifier-round13/v13/*.sh`, `*.mjs`) | lido antes de adaptar (HEAD, árvore, pasta e rodada trocados) |
| Auditoria externa do orquestrador | **não lida**. Em `verifier-round14/` só vi os nomes `profile-before.json`, `profile-compare.py` e `profile-metadata-snapshot.py`, sem comparação final quando listei. Não li perfil pessoal |

## Achados 2 e 3 da R13: contrato e prova (verified at `13bb1d4`)

Abreviações: `lat` = `scripts/ci-lock-latency.mjs`; `t` = `scripts/ci-lock-latency.test.mjs`.

**Registro antes do código.** `7198fef` acrescenta a linha `:83` do Landing, o C50 (j)–(l) e o refinamento do critério 42. Tudo só acrescenta: 0 linhas removidas na task e no checklist. A correção `6a242a2` toca só o script e a prova dele. O diff que li:

- **Limpeza** (`lat:366-391`):
  - a guarda não mudou (`:368-384`): absoluta, a pasta criada, filha direta do destino com o prefixo, sem link, marcador com o nonce;
  - só o `rmSync` ganhou um `try` (`:385-389`), que devolve `{ok: false, falha: codeOf(error)}` sem nova tentativa;
  - `codeOf` (`:31`) devolve o `code` `E…` ou o nome, nunca a mensagem;
  - `measure` põe a falha em `limpeza.falhas` (`:425`), separada de `recusadas` (`:426`), e segue para a fase seguinte;
  - `limpeza` nasce `{removidas: 0, recusadas: [], falhas: []}` (`:407`).
- **Supervisão** (`lat:242-307`):
  - `track` registra o filho e ouve `'close'` e `'error'` (`:263`, `:266-274`) antes do stdio, que é opcional (`:275-281`);
  - `launch` faz o `mkdirSync` da pasta do filho e o `spawnChild` (`:284-288`) dentro do `try` (`:290-303`), e o `catch` chama `interrupt` (`:301-302`);
  - o primeiro erro fixa `interruptedBy` e acorda as esperas (`:249-254`); `halted()` impede filhos novos (`:293`, `:297`);
  - `stopOwnChildren` (`:223-233`) é o caminho único do teto, do erro síncrono e do `'error'` assíncrono: `kill()` só nos registrados abertos, folga de 5 s (`KILL_GRACE_MS`, `:27`), `SIGKILL` só neles e `await` do `close` de todos (`:232`);
  - `runPhase` não lança por esses erros e devolve `interruptedBy` (`:306`); a fase o publica como `interrompidaPorErro` (`:341`);
  - nenhuma listagem de processos, nome, pid alheio ou `taskkill`.
- **Constantes**: `PHASE` (`:21`) e a folga de 5 s (`:27`) sem diff. Prazos, quantidades, carga e retries iguais.
- **Provas antigas**: só o `after` virou assíncrono (encerra os processos das provas de interrupção, `t:44-56`). O relatório passou a esperar `falhas: []` (`t:380`), como o (j) exige. Nenhuma asserção antiga foi afrouxada.

| Contrato (C50 / Landing `:83`) | Asserção decisiva (valor literal) |
| --- | --- |
| (j) remoção que lança, 4 formas | `t:272-277`, com `EBUSY`, `EPERM`, `ENOTEMPTY` e um `Error` sem `code`, com o caminho na mensagem injetada (`t:88-89`): `t:275` `deepEqual(outcome, {ok: false, falha: code ?? "Error"})` — igualdade exata, então sem caminho nem mensagem; `t:276` `readdirSync(dir)` = `[".skill-me-lock-latency"]` (pasta e marcador continuam) |
| (j) falha depois dos dados, pela medição A1/B/A2 (3 produtores de 2 ciclos, 1 carga) | `t:286-289` `["A1/B/A2", [["A1","padrao",6,null],["B","runner",6,null],["A2","padrao",6,null]]]`; `t:290` `limpeza` = `{removidas: 2, recusadas: [], falhas: ["EBUSY"]}`; `t:292-294` só a pasta de A1 ficou, com o marcador; `t:295` a do runner `[]`; `t:297-299` o JSON não tem os dois destinos (nem escapados) nem `"injetada"` |
| (j) sem falha, e as recusas de (f) iguais | `t:380` `{removidas: 3, recusadas: [], falhas: []}`; `t:246-266` (ver (f)) |
| (k) início parcial (`produtor-2` já é arquivo, `EEXIST` real no `mkdirSync`) | `t:314` `[timedOut, interruptedBy, papéis]` = `[false, "EEXIST", ["carga", "produtor"]]` (antes do teto de 30 s, sem lançar: o `await` de `t:313` não está num `try`); `t:315` todos com `exit`; `t:316` os dois processos iniciados já não existem (`[false, false]`); `t:317` processo alheio vivo; `t:319-322` `[false, "EEXIST", {previstos: 6, concluidos: 0, comErro: 0, incompletos: 6}, {amostras: 0, indisponivel: "sem amostras"}]` |
| (l) `ENOENT` assíncrono (spawn de caminho absoluto inexistente, `t:338`) | `t:345-348` `[false, "ENOENT", ["carga","produtor","produtor","produtor"]]`; `t:349` os quatro registrados fecharam; `t:351` os três que rodavam já não existem (`[false, false, false]`); `t:352` alheio vivo; `t:354` `[false, "ENOENT", {previstos: 6, concluidos: 0, comErro: 0, incompletos: 6}]`. O processo da prova não caiu: um `'error'` sem ouvinte viraria exceção atribuída ao teste (RED do autor, `build:1584-1586`) |

As provas distinguem o inválido do válido. Os caminhos de falha têm controles saudáveis no mesmo arquivo: `t:380` (limpeza sem falha), `t:364` (fase sem interrupção, `encerradaPeloTeto: false`, 15 ciclos) e `t:264` (remoção própria). O RED de `3843867` (5 de 16 falhas) e as 6 mutações detectadas são relato do autor (`build:1577-1600`), não minhas execuções.

**“A medição segue” depois de uma interrupção (lido).** As provas (k)/(l) ficam na camada que decide (`runPhase` + `aggregatePhase`), como o checklist define. Em `measure` (`lat:417-427`), um `runPhase` que volta sem lançar leva a `aggregatePhase`, à limpeza no `finally` e à fase seguinte: é encaminhamento sem decisão. O mesmo laço seguindo depois de uma falha da fase anterior está provado pelo (j) (`t:286-290`).

## AC9 — C50: `scripts/ci-lock-latency.mjs` (verified at `13bb1d4`; citações renovadas)

Os 16 testes têm nome iniciado por `C50 ` e passaram em A, B, C e D: os 12 de antes mais os 4 de (j)–(l).

**Reúso e fronteiras (leitura).**
- `lat:9-10` importa `createStoreIo` (`privacy/fs.mjs`) e `holdLockFile`/`StoreError` (`privacy/store.mjs`), APIs públicas. O ciclo é `holdLockFile({io: measured, lockPath, lostCode: "lock_lost"}, …)` (`lat:139`) sobre `createStoreIo()` real (`lat:182`).
- Nenhum algoritmo de lock copiado. O script só envolve o `unlink` (`lat:125-129`) e instrumenta `open` exclusivo, `writeFile` e `close` do `.lock` **só no processo do produtor** (`lat:154-177`, chamado em `lat:181`), igual em todas as fases.
- Sem importação de `tests/` e sem dependência nova.

| C50 | Asserção decisiva (valor literal) | Leitura do código |
| --- | --- | --- |
| (a) percentis e faixas | `t:114` `summarize([700, 10, 650, 599.999, 20, 649.999, 600])` = `{amostras: 7, p50: 600, p99: 700, max: 700, ">=600": 4, ">=650": 2}`; `t:115-119` `1…100` = `{100, 50, 99, 100, 0, 0}` (zero medido, com amostras); `t:120` 3 casas e contagem sobre o valor cru; `t:121` `BANDS_MS` `[600, 650]`; `t:125` `summarize([])` = `{amostras: 0, indisponivel: "sem amostras"}`; `t:128-130` fase só de erros: `{previstos: 2, concluidos: 2, comErro: 2, incompletos: 0}`, métricas indisponíveis, `es: {EIO: 2}` | `lat:37-48`: posição ⌈p·n/100⌉, valor observado; `>=` sobre o valor cru |
| (b) caminhos | `t:134-137` `C:\Temp` = `c:\temp\`, volumes distintos, `/tmp` = `/tmp/`, `/tmp` ≠ `/TMP`; `t:147-151` `RUNNER_TEMP` ausente, vazio, inexistente (`ilegível [ENOENT]`), arquivo (`não é pasta`) e o mesmo destino dão `não aplicável: <motivo>` e uma só fase `A`; `t:152-160` `"A1/B/A2"`, `runner: {volume: "D:"}`, fases `A1` padrão, `B` runner e `A2` padrão, nessa ordem; `t:161` `padrao: {volume: "C:"}`; `t:171` junção real → uma fase; `t:174` pasta distinta → `["A1","B","A2"]` | `lat:52-56`, `lat:60-64`, `lat:69-93` (`realpathSync.native`) |
| (c) E/S | `t:193` erros `["EIO", "lock_present", "lock_present"]`; `t:194` sem tomada, liberação nem remoção nesses ciclos; `t:196` `{lockPresent: 2, lockLost: 0, es: {EIO: 1}}` e tomada/liberação indisponíveis; controle `t:201`: 3 ciclos limpos com os três tempos | `lat:144`, `lat:147`, `lat:326-331` |
| (d) teto | `t:210` `timedOut` true; `t:214` `[true, {previstos: 12, concluidos: 0, comErro: 0, incompletos: 12}, indisponível, indisponível]`; `t:215` carga `[1, 0]`; término parcial: `t:226` `[true, {3, 2, 0, 1}]` e `t:227` tomada `{amostras: 2, p50: 1.5, p99: 700, max: 700, ">=600": 1, ">=650": 1}` | `lat:255-258`, `lat:223-233`, `lat:342` |
| (e) supervisão só de filhos próprios | `t:212` `process.kill(foreign.pid, 0) === true`; `t:211` filhos com `exit`; também `t:317` e `t:352` em (k)/(l) | `lat:261-283` só registra o que `spawnChild` devolveu |
| (f) limpeza | `t:246` `"fora da árvore própria"`; `t:252` e `t:254` `"sem o marcador desta execução"`; `t:258` junção → `"não é uma pasta real"`; `t:260` relativo literal → `"caminho relativo"`; `t:261` `"não é a pasta criada por esta execução"`; `t:262` nada apagado; `t:264-265` a própria sai; `t:266` as recusadas continuam | `lat:366-384`, motivos sem caminho |
| (g) protocolo | `t:231` `{records: [ok(1)], invalid: 2}`; `t:234` `[{previstos: 3, concluidos: 1, comErro: 0, incompletos: 2}, 3, 1]` | `lat:98-115`, `lat:318-324` |
| (h) fronteira real | `t:364` `[false, {15, 15, 0, 0}, {lockPresent: 0, lockLost: 0, es: {}}, 0]`; `t:365-368` tomada, liberação e as quatro operações com 15 amostras e `p50 ≤ p99 ≤ max`; `t:369` `[3, 3, {}]`; `t:370` `escritas >= 3`; `t:371` produtores `{codigo: 0, sinal: null}` ×3 | filhos reais `spawnWorker` (`lat:217-218`, `windowsHide: true`, `TEMP`/`TMP` não mudam) |
| (i) relatório e constantes | `t:379` `"A1/B/A2"`, 6 por fase; `t:380` limpeza 3/[]/[]; `t:381` pastas vazias; `t:383` sem `RUNNER_TEMP`: uma fase `A`; `t:386-389` sem destinos, `os.tmpdir()`, `PATH` (também escapado) nem `/[0-9a-f]{16}/`; `t:394` `PHASE` = `{producers: 3, cycles: 500, loaders: 3, loadBytes: 65_536, limitMs: 120_000}`; `t:396` argumento desconhecido → `[2, "", "uso: node scripts/ci-lock-latency.mjs\n"]` | CLI sem argumentos → `measure()` com `PHASE` (`lat:398`, `lat:441`); exit 1 só no `catch` (`lat:442-446`) |
| (j) limpeza que falha | seção anterior | `lat:385-389`, `lat:423-426` |
| (k) início parcial | seção anterior | `lat:284-305` |
| (l) erro assíncrono | seção anterior | `lat:274`, `lat:305` |

**Formatos do Landing conferidos por leitura** (sem teste nomeado; o C50 não os reivindica):
- fase sem pasta própria → `{fase, destino, indisponivel: "pasta própria não criada [<código>]"}` (`lat:414`);
- erro interno da fase → `"fase interrompida [<código>]"` (`lat:421`);
- exit 1 → `{"skillMeLockLatency":1,"indisponivel":"medição não concluída [<código>]"}` (`lat:444-445`);
- protocolo dos filhos (`lat:182-183`, `lat:211`, `lat:213`);
- folga de 5 s (`lat:27`).

**Limites da medição (não são defeitos).**
- A carga é sintética, não a suíte. A instrumentação custa um pouco por operação, igual nas fases.
- 600 e 650 ms são faixas, não prazos.
- Zero ocorrência numa medição não provaria CI estável, taxa nem causa.
- O controle local do CLI do autor (A1/B/A2 com 1.500 ciclos cada, `build:1601-1608`) teve os dois destinos no mesmo volume `C:`. É controle de formato, não medição do runner, e não o repeti.
- A minha fronteira real é a do teste versionado: 3 produtores × 5 ciclos e 3 cargas de 64 KiB.

## AC9 — C49: job manual `lock_diagnostics` (verified at `13bb1d4`)

`scripts/governance-ci.test.mjs` (`gov`), `package.json` e o workflow têm 0 diff desde `631e281`; as linhas abaixo foram relidas no HEAD.

| Exigência (C49 / Landing `:82`) | Asserção decisiva (valor literal) |
| --- | --- |
| Chaves do job exatamente `if, name, permissions, runs-on, steps, timeout-minutes`: sem `needs`, `continue-on-error`, `strategy` ou outra | `gov:317-324` `deepEqual(Object.keys(job).sort(), [...])` |
| Nome e gatilho | `gov:325` `"Diagnosticar lock Windows (manual)"`; `gov:326` `"github.event_name == 'workflow_dispatch'"` |
| Runner, teto e permissão | `gov:327` `"windows-latest"`; `gov:328` `10`; `gov:329` `{contents: "read"}` |
| Mesmas ações pinadas do `verify`, `persist-credentials: false`, Node 24.13.0 e sem cache | `gov:332-335` checkout = `{uses: verify.steps[0].uses, with: {"persist-credentials": false}}`; `gov:336-339` setup = `{uses: verify.steps[1].uses, with: {"node-version": "24.13.0"}}` (igualdade exata: um `cache` faria falhar) |
| Só os dois comandos | `gov:340-343` `[{run: "npm ci --ignore-scripts"}, {run: "node scripts/ci-lock-latency.mjs"}]` |
| Fora do agregado; nada tolera falha | `gov:345` `ci.needs` = `["changes", "verify"]`; `gov:346-351` nenhum job depende dele; nenhum job nem passo tem `continue-on-error` |
| Alias e pacote privado | `gov:354-357` `test:governance` = `"node --test scripts/governance-ci.test.mjs scripts/ci-lock-latency.test.mjs"`; `gov:358` `private === true` |
| Conjunto de jobs e asserções antigas | `gov:294-299` `["changes", "ci", "lock_diagnostics", "verify"]`; `gov:244-291` gatilhos, permissões, detector, matriz, `runs-on`, os cinco `run` do `verify` e o agregado; `gov:300-308` hash de 40 hex e ausência de IA/publicação em todos os jobs |

As asserções são de igualdade exata. As 5 mutações do workflow que mostram isso são do autor (`build:1472-1479`) e não as repeti. O caso válido passou em A, B, C e D. Em `pull_request`/`push` o `if` pula o job; esse skip não substitui nenhum check regular, porque `ci.needs` está intacto.

## AC9 — C48 com a exceção: leitura estrutural autorizada (verified at `13bb1d4`)

É a prova **estrutural** autorizada pelo checklist (`checklist:426-436`; Landing `:81`). Não é teste espelho nem avaliação do GitHub.
- **Diff textual**: `git diff d0d5a7f HEAD -- .github/` tem 20 inserções e 1 remoção: `governance.yml:43` (`timeout-minutes: 10` → `${{ matrix.os == 'windows-latest' && 20 || 10 }}`) e o bloco do job manual (`:77-95`). Desde a R13 (`631e281..HEAD`): 0.
- **Leitura estrutural** (`v14/c48-structural.mjs`, o mesmo método da R13, lido antes; `yaml` do repositório sobre os blobs de `git show` de HEAD, `d0d5a7f` e `63621c6`; saída em `v14/C48-structural.txt`):
  - o documento **inteiro** do HEAD, sem `jobs.lock_diagnostics` e sem `jobs.verify.timeout-minutes`, é `deepStrictEqual` ao de `d0d5a7f` sem `verify.timeout-minutes`: **true**; contra a base: **true**; `d0d5a7f` = base: true;
  - topo (`name`, `on`, `permissions`, `concurrency`) e cada job regular (`changes`, `verify`, `ci`) iguais a `d0d5a7f`: true;
  - jobs: `changes, verify, ci, lock_diagnostics`; conjunto exato: true;
  - tetos: `changes` 5 (`:21`), `verify` a expressão aprovada (`:43`, antes 10), `ci` 5 (`:63`), `lock_diagnostics` 10 (`:84`);
  - `verify`: matriz `["ubuntu-22.04","windows-latest","macos-14"]`, `runs-on: ${{ matrix.os }}`, `needs: changes` e os mesmos sete passos; `ci.needs` `["changes","verify"]` com `if: always()`;
  - hashes do job novo iguais aos do `verify`; nenhum job depende dele; nenhum `continue-on-error`.
- **Provas versionadas**: `governance-C1 C3` e `governance-C49` passaram em A/B/C/D.
- **Limite**: a expressão `${{ … }}` e o `if` do job manual não foram avaliados pelo GitHub aqui, e nenhum job do Actions rodou.

## Carregado e reconferido

- **Asserções de C1–C47**: carried from R13 at `631e281`, que as trazia da R12 em `0f540a0` e das rodadas anteriores. `tests/` tem 0 diff desde `0f540a0`, `src/` desde `f734441`, e nenhum arquivo dessas provas mudou na janela. Reli no HEAD uma amostra, toda conforme:
  - `cmd:48`, `cmd:49`, `cmd:77`;
  - `sess:67`; `store:715`;
  - `end:194`, `end:320`, `end:438`;
  - `conc:214`, `conc:298`, `conc:349`;
  - `ag:310`, `ag:403`, `ag:437`;
  - `harn:88`.
- **C1 / `package.json`**: 0 diff desde a R13. `private: true` e `bin.skill-me` = `src/integrations/launch/cli.mjs` estão iguais (`cmd:48-49`, `gov:358`). Medida em B: ver “Ambientes”.
- **Marcos preservados** (sem diff na janela), todos executados de novo em A/B/C/D:
  - `f734441`: o store relê sob o lock e publica o marcador completo; os 5 controles de intercalação no C32;
  - `619c8e0`: diagnóstico do C32 com indisponibilidade, o erro original preservado, B com 127, todas as barreiras liberadas e A esperada; leitor saudável estrito; 9 C32;
  - C28 com a fixture de 25 s + 25 s sob o supervisor de 60 s e a primeira perda diagnosticada sem retry;
  - C33 com Node e `sh` isolados;
  - C34 com `deps.now` e o recuo de 5 s;
  - C46 (T8 com 40+40, 80 IDs e os 3 controles);
  - C47 (I23-C10 com as etapas iguais e os 2 controles).
- **Core e configuração**:
  - os 5 arquivos do core sem diff na feature;
  - perfis globais `light`/`ui`/`direct` com `maxRounds` 2;
  - overrides 3:9, 4:10, 5:10, 6:3, 7:35, 8:3 e 23:4 intactos;
  - `25` = `{light, 8}`, sem mudança desde a R13; a formal 8 continua disponível, e não aumentei nada;
  - as 7 tentativas do motor ficam preservadas; não rodei `review:run`.

## Ambientes e execuções — verified at `13bb1d4`

As execuções foram **em sequência**, uma invocação por ambiente, sem nenhuma repetição. O alvo de A, B e C é `node --test --test-concurrency=4 --test-reporter=spec … --test-reporter=tap …` sobre 13 arquivos: `tests/integrations/launch/*.test.mjs` (8), `hermes-harness.unit.test.mjs`, `traces/concurrency.cli.test.mjs` e `observe/agents.e2e.test.mjs` completos, `scripts/governance-ci.test.mjs` e `scripts/ci-lock-latency.test.mjs` (`v14/run-win-target.sh`, `wsl-run.sh`).

| # | Ambiente | Resultado |
| --- | --- | --- |
| A | Windows 11, checkout principal, Node v24.22.1 (`C:\nvm4w\nodejs\node.exe`), npm 11.19.1, Python 3.12.10, `npm_execpath` e `RUNNER_TEMP` ausentes. 10:01:42–10:04:33 | **151: 145 pass, 0 fail, 6 skip**, exit 0. Status vazio antes e depois |
| B | Windows 11, Node **v24.13.0 oficial** (`ci-node-24.13.0/node-v24.13.0-win-x64/node.exe`) no início do PATH, npm **11.6.2** adjacente (`npmCli()` = o do zip), `npm_execpath` ausente. **Clone git novo**: `git clone --no-hardlinks --config core.autocrlf=true <checkout> v14/B-clone`; `node_modules` copiado, sem rede. 10:05:04–10:07:47 | **151: 145 pass, 0 fail, 6 skip**, exit 0 |
| C | WSL `Ubuntu`, `oldboydev` uid 1000, `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc`, só com os meus scripts (0 CR). 10:09:03–10:10:07 | **151: 145 pass, 0 fail, 6 skip**, exit 0 |
| D | `npm test` completo, Windows, checkout principal, Node v24.22.1, npm 11.19.1, `npm_execpath` ausente, 32 núcleos, runner `MAX_PARALLEL_FILES = 8` (`scripts/test-integrations.mjs:14`). Rodou **uma vez**, em segundo plano, com orçamento de **2 h definido na ferramenta antes do início**, sem abortar nem repetir; esperei a notificação de término. 10:11:04–10:21:36 | **exit 0** (`EXIT=0`, `D_rc=0`, notificação com exit 0). **Total 1.023: 1.003 pass, 0 fail, 20 skip**, sem nenhum `✖` no log. Status vazio antes e depois |

**D por suíte:**

| Suíte | Testes | Pass | Fail | Skip |
| --- | --- | --- | --- | --- |
| Governança (7 `governance-` e 16 C50) | 23 | 23 | 0 | 0 |
| Motor de revisão | 16 | 16 | 0 | 0 |
| Doctor | 417 | 410 | 0 | 7 |
| Integrações | 567 | 554 | **0** | 13 |

**B: conversão de fim de linha e estado do checkout** (`v14/B-clone-prepare.txt`, `B-clone-after.txt`).
- **Antes**: HEAD do clone `13bb1d4…` e árvore `9d5ce9ec…`, iguais ao esperado; `core.autocrlf` local `true` (`.git/config`) e efetivo `true`.
- **Conversão ativa** (`i/lf w/crlf`):
  - `package.json` com 34 CRLF;
  - `governance.yml` com 95 CRLF;
  - `ci-lock-latency.mjs` com 448 CRLF e `ci-lock-latency.test.mjs` com 397 CRLF;
  - `governance-ci.test.mjs` e `.gitattributes`.
- **`cli.mjs`**: `i/lf w/lf attr/text eol=lf`, 4.257 bytes, 0 CR, 125 LF, primeira linha `b'#!/usr/bin/env node\n'`, modo `100755`.
- **Status do clone** vazio antes e depois de copiar `node_modules`.
- **Depois de B** (o C1 fez o `npm link` com o npm 11.6.2 do zip): `cli.mjs` com os mesmos 4.257 bytes, 0 CR e a mesma primeira linha; status vazio.
- **Remoção do clone**: só depois de conferir o caminho absoluto (`v14/B-clone`), o tipo (diretório, não link) e o HEAD (`B-clone-cleanup.txt`).

**C: cópia exata e ambiente isolado** (`v14/wsl-prepare.txt`, `C-wsl-24.13.0-isolado.env.txt`).
- **Cópia**: `git -c core.autocrlf=false archive HEAD`, tar de **5.847.040 bytes**, sha256 `1863c7a8…79e03f`, `get-tar-commit-id` = `13bb1d4…`.
  - A árvore extraída `9d5ce9ec…` é igual a `HEAD^{tree}`, também depois de copiar `node_modules` e depois do alvo.
  - `cli.mjs` com modo 755 (git `100755`) e 0 CR antes e depois; 0 CR no script, na prova e no workflow.
  - `node_modules` copiado sem rede (yaml 2.9.0, smol-toml 1.9.1).
- **Prefixo sem `sh`**: `prefix/bin` = `node npm npx`.
  - O `node` é cópia byte a byte de `/usr/bin/nsolid` (sha256 `150946e4…bb6351`), v24.13.0, com `execPath` no prefixo.
  - O npm 11.6.2 fica em `prefix/lib/node_modules/npm`, e `npmCli()` aponta para ele.
  - `/usr/bin/node` não foi usado como atalho.
- **Execução**: `env -i`, `HOME=<scratch>/home`, `LANG=C.UTF-8`, `PATH=<scratch>/prefix/bin:<scratch>/tools`, **sem `/usr/bin`**.
  - `tools` tem só links para `/usr/bin/{sh (dash), git, python3 (3.12.3), id, grep, mkfifo}`, sem agentes, `node`, `npm`, `npx` ou `corepack`.
  - `/home/oldboydev/.skill-me` e `.skill-me-authorization.json` ausentes antes e depois (só `test -e`); home do scratch vazio depois.
  - 0 `skill-me i4 i25|t8|i23 *` e 0 `skill-me lock latency *`/`skill-me-lock-latency-*` em `/tmp` antes e depois.
  - As chamadas ao WSL usaram `MSYS_NO_PATHCONV=1`.

**Skips** (todos de plataforma, com o motivo impresso pelo teste):
- **A e B (6)**: C45 POSIX, C5 POSIX, C6, C42 POSIX, C33 arranjo e C15 pty.
- **C (6)**: C4 shim, C45 controle do Windows, C5 console, C42 console, C8 LOCALAPPDATA e C38 console.
- **D (20)**:
  - doctor (7): `agent-resolution-formal5-2`, `agent-resolution-C2`, 2 `fifo-config-formal8-4` e 3 `fs-adapter-formal8-4`, todos POSIX/FIFO;
  - integrações (13): `I4-C15`, `I4-C25b`, `I4-C25j`, `I4-C25k`, `I4-C25l`, `I4-C25m`, `T8-C4` e os 6 I25 POSIX de A.

Cada um dos 6 skips de A/B/C rodou no outro ambiente da matriz: os de A/B em C, e os de C em A/B (`v14/matrix.txt`). Dos 20 de D, só os 6 I25 POSIX rodaram em outro ambiente (C). Não foram reexecutados em nenhum ambiente desta rodada:
- os 7 do doctor (POSIX/FIFO);
- `I4-C15`, `I4-C25b`, `I4-C25j`, `I4-C25k`, `I4-C25l` e `I4-C25m` (Linux/macOS);
- `T8-C4`.

As provas novas (`governance-C49` e os 16 C50) não têm skip.

**Nomes conferidos.**
- **A, B e C**: os 151 nomes são idênticos nos três TAP (`v14/matrix.txt`: “nomes iguais em todos: sim (união 151)”). São os 147 da R13 mais as 4 provas C50 novas.
- **D** (`v14/D-summary.txt`):
  - **I23-C4** ✔ ×7 e **T8-C11** ✔ (6,6 s): as duas provas que falharam na CI 40636157287 passaram aqui, o que não diz nada sobre o runner;
  - **I23-C10** ✔ (15,3 s), **I25-C47** ✔ ×2, **T8-C15** ✔ (12,8 s), **I25-C46** ✔ ×3, **I25-C32** ✔ ×9;
  - **`governance-C1 C3`** ✔, **`governance-C49`** ✔ e **`C50 `** ✔ ×16 na suíte de governança, como o alias manda;
  - **12 nativos do Hermes** ✔, pelo runtime real e só pelo teste versionado: `I4-C18` a `I4-C23`, `I4-C37`, o `I25-C40` nativo, `I23-C8` ×3 e `I4-C44b`;
  - `I25-C*` de 1º nível: 109 ✔ e 6 ﹣.

**Durações-chave**, em segundos (A / B / C / D):

| Prova | A | B | C | D |
| --- | --- | --- | --- | --- |
| I23-C10 | 15,2 | 12,9 | 1,2 | 15,3 |
| C47 (E/S) | 3,3 | 3,1 | 0,3 | 3,8 |
| C47 (disco parado) | 3,9 | 3,6 | 1,0 | 4,4 |
| T8-C15 | 12,9 | 11,7 | 1,6 | 12,8 |
| C28 regressão | 28,4 | 28,3 | 26,1 | 28,9 |
| C1 | 1,9 | 1,7 | 0,4 | 3,1 |
| C50 início parcial | 1,6 | 1,6 | 0,0 | 1,6 |
| C50 erro assíncrono | 2,1 | 2,1 | 0,0 | 2,1 |
| C50 limpeza depois dos dados | 6,9 | 6,4 | 0,2 | 6,3 |
| C50 fronteira real | 3,2 | 3,1 | 0,1 | 3,1 |
| C50 relatório | 9,0 | 8,4 | 0,3 | 8,4 |
| C50 teto | 2,8 | 2,5 | 1,5 | 2,5 |

O teto de 30 s das provas (k)/(l) nunca foi atingido.

## Matriz por check (TAP de A, B e C; `v14/per-check.txt`)

Contagem dos testes executados por prefixo, em pass/skip/fail. **Nenhum check teve 0 testes, e não houve fail.**

| Check | A Win 24.22.1 | B Win 24.13.0 (clone `autocrlf=true`) | C WSL isolado 24.13.0 |
| --- | --- | --- | --- |
| C1–C3, C7, C9–C11, C13, C14, C18–C26, C29, C30, C35, C36 | 1p cada | 1p cada | 1p cada |
| C4 | 3p | 3p | 2p/1s |
| C5 | 1p/1s | 1p/1s | 1p/1s |
| C6 | 1s | 1s | 1p |
| C8 | 2p | 2p | 1p/1s |
| C12, C16, C28, C31, C40 | 2p cada | 2p cada | 2p cada |
| C15 | 1s | 1s | 1p |
| C17 | 4p | 4p | 4p |
| C27, C37, C39, C44 | 3p cada | 3p cada | 3p cada |
| C32 | 9p | 9p | 9p |
| C33 | 1p/1s | 1p/1s | 2p |
| C34 | 4p | 4p | 4p |
| C38 | 1p | 1p | 1s |
| C41 | 17p | 17p | 17p |
| C42 | 3p/1s | 3p/1s | 3p/1s |
| C43 | 12p | 12p | 12p |
| C45 | 2p/1s | 2p/1s | 2p/1s |
| C46 | 3p | 3p | 3p |
| C47 | 2p | 2p | 2p |
| T8-C15 / T8-C16 | 1p / 9p | 1p / 9p | 1p / 9p |
| I23-C10 / I23 do arquivo | 1p / 4p | 1p / 4p | 1p / 4p |
| **`governance-C1 C3`** / **`governance-C49`** / todos `governance-` | **1p / 1p** / 7p | **1p / 1p** / 7p | **1p / 1p** / 7p |
| **C50** | **16p** | **16p** | **16p** |

C48 não tem teste próprio: é a leitura estrutural mais `governance-C1 C3` e `governance-C49`.

## Checks

Abreviações:
- testes de `tests/integrations/launch/`: `cmd` = `command.cli.test.mjs`, `prep` = `prepare.cli`, `sess` = `session.e2e`, `store` = `store.unit`, `end` = `end.e2e`, `rep` = `report.cli`, `agent` = `agent.unit`, `docs` = `docs.test`;
- outros testes: `harn` = `tests/integrations/hermes-harness.unit.test.mjs`, `nat` = `hermes-plugin.native.test.mjs`, `conc` = `traces/concurrency.cli.test.mjs`, `ag` = `observe/agents.e2e.test.mjs`, `gov` = `scripts/governance-ci.test.mjs`, `t` = `scripts/ci-lock-latency.test.mjs`;
- apoios: `hl` = `helpers/launch.mjs`, `tr` = `helpers/traces.mjs`; script `lat` = `scripts/ci-lock-latency.mjs`.

“A/B/C/D” = passou nesses ambientes, nesta rodada, no HEAD `13bb1d4`. As evidências de C1–C47 são as da R13 (`631e281`), sem diff nos arquivos.

| Check | Nome no TAP (prefixo, contagem) | Evidência (arquivo:linha — valor) | Revisão | Result |
| --- | --- | --- | --- | --- |
| C1 | `I25-C1 npm link num prefixo temporário…` (1) A/B/C/D | `cmd:48` `private === true`; `cmd:49` `bin` = `{"skill-me": "src/integrations/launch/cli.mjs"}`; `cmd:65` `[0, SKILL_ME_HELP, ""]` de outro cwd; `cmd:77` `git status` igual. B num clone novo `autocrlf=true`: `cli.mjs` LF/0 CR e status vazio antes e depois | carried from `631e281` + medida B nova | PASS |
| C2 | `I25-C2 argumentos literais…` A/B/C/D | `cmd:96-98` `{status: 0, stdout, stderrFirst, argv: LITERAL_ARGS, stdin}` para os 3 agentes; `LITERAL_ARGS` em `cmd:80` | carried | PASS |
| C3 | `I25-C3 código do agente…` A/B/C/D | `cmd:105` `{0: 0, 7: 7}` | carried | PASS |
| C4 | `I25-C4 shim…` + `entrada do shim…` ×2: A/B 3p, C 2p/1s | `cmd:117-120` `{status: 0, execPath: process.execPath, script: …/@openai/codex/bin/codex.js, sentinel: false}`; `cmd:130-133` `{status: 127, [launcher_requires_shell], sentinel: false}`; `agent:80-118` | carried | PASS |
| C5 | `I25-C5 Ctrl+C no console…` (A/B/D), `sinais do terminal no POSIX` (C) | `cmd:228` `{status: 4, signal: null, signals: ["SIGINT","SIGQUIT","SIGHUP"]}`; `cmd:244-245` `CTRL_C_EVENT` → `["SIGINT"]` | carried | PASS |
| C6 | `I25-C6 SIGTERM só ao launcher…` (C) | `cmd:267` `{status: 0, signal: null, signals: ["SIGTERM"]}` | carried | PASS |
| C7 | `I25-C7 agente ausente…` A/B/C/D | `prep:93-94` `{status: 127, stdout: "", code: true, asked: false}`; `prep:98` árvore igual | carried | PASS |
| C8 | `I25-C8 prévia…` ×2 (A/B/D 2, C 1p/1s) | `prep:122-126` texto exato até cada pergunta, árvores iguais; `prep:141-144` LOCALAPPDATA | carried | PASS |
| C9 | `I25-C9 confirmação aplica…` A/B/C/D | `prep:163-168` `observe.json` da #23; `prep:169` `plan.changes` `[]`; `prep:174` `manualSteps` | carried | PASS |
| C10 | `I25-C10 recusa…` A/B/C/D | `prep:189-191` `{exitCode: 3, code: true, trees: before, started: false, root: false}` | carried | PASS |
| C11 | `I25-C11 caminho relativo…` A/B/C/D | `prep:200` `{exitCode: 2, [root_not_absolute], relative: false, config: false}` | carried | PASS |
| C12 | `I25-C12 sem terminal…` ×2 A/B/C/D | `prep:223` `{status: 3, line: "skill-me: preparação pendente [setup_required]; rode skill-me codex num terminal…", trees: before, started: false}`; `prep:387-388` | carried | PASS |
| C13 | `I25-C13 preparo concluído…` A/B/C/D | `prep:238` `{exitCode: 0, asked: 0, preview: false, config: <SHA-256>, settings: <SHA-256>, started: 1}` | carried | PASS |
| C14 | `I25-C14 falha do preparo…` A/B/C/D | `prep:250` `observe_on` 4; `prep:266, 276, 290` | carried | PASS |
| C15 | `I25-C15 terminal real (pty)…` (C) | `prep:398-403`; `prep:408` `{status: 3, declined: true, trees: before}` | carried | PASS |
| C16 | `I25-C16 …` ×2 A/B/C/D | `sess:67` `{origin: "launch", invocation, segment: 1, state: "active", content: true, retentionDays: 7, limits: {maxEvents: 500, maxBytes: 8388608}, launchedAt}`; `sess:61, 69`; `agent:160-165` | carried | PASS |
| C17 | `I25-C17 …` ×4 A/B/C/D | `store:79` `["launch", invocation, 1, "2026-10-26T10:00:00.000Z"]`; `store:54, 110, 156`; `sess:300-301` | carried | PASS |
| C18 | `I25-C18 execução indisponível…` A/B/C/D | `sess:111` `{status, stderr: "skill-me: não foi possível abrir a execução [<código>]\n", started: false, waited: true}`; `sess:124` | carried | PASS |
| C19 | `I25-C19 eventos na captura da execução…` A/B/C/D | `sess:147, 151, 152-160`; `sess:161` `[0, 0]`; `sess:165-167` | carried | PASS |
| C20 | `I25-C20 par inválido…` A/B/C/D | `sess:190-192` `{bound: false, code: "binding_invalid", entries: 1, committed: 0, persisted: 0, lost: 1}` | carried | PASS |
| C21 | `I25-C21 autorização global intacta…` A/B/C/D | `sess:208-211` bytes iguais com off e com on | carried | PASS |
| C22 | `I25-C22 limite de eventos…` A/B/C/D | `sess:230` `[1, "stopped", 500, 500, {}]`; `sess:236, 240-245` | carried | PASS |
| C23 | `I25-C23 limite de 8 MiB…` A/B/C/D | `sess:282` `["active", MAX_BYTES, {}, 1]`; `sess:289, 291` | carried | PASS |
| C24 | `I25-C24 captura corrente encerrada à mão…` A/B/C/D | `store:168` `[opened.capture, "stopped", 1]`; `store:169` | carried | PASS |
| C25 | `I25-C25 encerramento e resumo…` A/B/C/D | `end:72-79` capturas `stopped`, `endedAt` ISO, ponteiro ausente; `end:80-89` stderr exato | carried | PASS |
| C26 | `I25-C26 nada gravado…` A/B/C/D | `end:101-109` `eventos gravados: 0.` e a dica com `manualSteps[0]` | carried | PASS |
| C27 | `I25-C27 …` ×3 A/B/C/D | `end:120` `{launch: true, code: "launch_ended", entries: 1, committed: 0, persisted: 0, lost: 1}`; `store:222-260` | carried | PASS |
| C28 | `I25-C28 entregas Hermes em voo…` e `… primeira entrega perdida…` A/B/C/D | `end:148-149` sinal nulo e saída antes do parse; `end:158-159` `{started: true, delivered: true, enqueued: 3, sent: 3, queueFull: 0, failed: 0}`; `end:164-165` `persisted` 3 e `stopped`; `end:168` `eventos gravados: 3.`. Regressão: `end:181-185` `{started: false, delivered: false, stats: {enqueued: 1, delivered: 1, …, active: true}}`; `end:187` `[["stopped", 0, 0]]`; `end:188` ponteiro fora; `end:189` `eventos gravados: 0.`; `end:194` `["EIO"]`; `end:195` 1 unlink. Fixture 25 s + 25 s (`hermes-plugin-session.py:25-26`) sob o supervisor de 60 s (`hl:121, 132`) | carried | PASS |
| C29 | `I25-C29 término por sinal…` A/B/C/D | `cmd:278, 295, 300` | carried | PASS |
| C30 | `I25-C30 falha de início…` A/B/C/D | `cmd:342` `{status: 127/126, startCode: true, captures: [[1, "stopped", 0]]}` | carried | PASS |
| C31 | `I25-C31 …` ×2 A/B/C/D | `end:205-215` `[lock_present]`, `continua active`, `privacy stop`, `continua aberta`, `["active", true]`; `end:244-258` `[io_failure]`, `já não recebe registros`, `launch_ended` | carried | PASS |
| C32 | `I25-C32 …` ×9, A/B/C/D | **Processos reais**: `end:280` A sai com 0; `end:283` IDs diferentes; `end:286` `["stopped", "active"]`; `end:291` B sai com 0; `end:293-294` `a-1, a-2` / `b-1, b-2, b-3` com o pseudônimo da chave de cada captura; `end:295` chaves próprias; `end:296` `[1, 1]`. **Diagnóstico original**: `end:320` `"eventos intercalados: B terminou antes"`; `end:322-326`. **Diagnóstico parcial**: `end:370-386`; apoio `hl:214-257` (`:255` erro original em `cause`), `failureCode` em `tr:151`. **Primeira criação**: `store:706-802` (`:715` `lock_present`) e `end:396-444` (`:438` `capturas: 1; eventos gravados: 1.`) | carried | PASS |
| C33 | `I25-C33 on e off…` (A/B/C/D) e `… arranjo do npm run (POSIX)` (C) | `end:457` `npmScriptEnv`; `end:459` `[0, "on"]`; `end:460` `active`; `end:464` `[0, "off", []]`; `end:465` `active`; `end:469` 3× `LAUNCHED(1)`; `end:474` nenhuma automática. Arranjo: `end:493-494` `≠ 0` e `/spawn sh ENOENT/`; `end:497`; `end:501` `[0, "ok", "off"]`. PATH só com `node`/`sh`/fixture em `hl:67-74` | carried | PASS |
| C34 | `I25-C34 …` ×4 A/B/C/D | `rep:82` texto; `rep:90-96`; `rep:145, 155` precondições com tempos (`deps.now`); `rep:159` `[newInv, true]`; `rep:173`; `rep:181`; recuo `rep:208-213`; `rep:237` `--latest`; `rep:239` `[0, 1, [automatic.id]]` | carried | PASS |
| C35 | `I25-C35 report sem execução…` A/B/C/D | `rep:252-259` `[3, {"schemaVersion":1,"command":"report","status":"error","error":{"code":"not_configured"}}, ""]` e `no_launch_capture` | carried | PASS |
| C36 | `I25-C36 ajuda…` A/B/C/D | `cmd:350` `[0, SKILL_ME_HELP, ""]`; `cmd:354` `[2, "", SKILL_ME_HELP]`; `cmd:356-368` | carried | PASS |
| C37 | `I25-C37 documentação…` ×3 A/B/C/D | `docs:57, 60-62`; `docs:82` os 9 limites (`docs:44-54`); `docs:88-89, 93` | carried | PASS |
| C38 | `I25-C38 console real do Windows…` (A/B/D) | `prep:355` `["done", 0]`; `prep:361, 363, 365` | carried | PASS |
| C39 | `I25-C39 …` ×3 A/B/C/D | `harn:88` `["concluded", 0, 3]`; `harn:100-102, 186-188` | carried | PASS |
| C40 | `I25-C40 …` ×2 A/B/C/D + nativo `I25-C40 harness nativa…` (D) + `I4-C20`, `I4-C21`, `I4-C37` (D) | `harn:196-225` `[2000, "timeout"]`, `[5000, "timeout"]`; nativo `nat:335` `{capture: "concluded", ingest: "concluded", inactive: "inactive", spawnfail: "failed", exit: "failed", disconnect: "failed", stall: "timeout"…}` | carried; nativo **executado em D** | PASS |
| C41 | `I25-C41 …` ×17 A/B/C/D | `store:327-523`; `end:518, 535, 539-551, 581, 601-619, 646-656, 681-692, 722-729, 736-752` | carried | PASS |
| C42 | `I25-C42 …` A/B/D 3p/1s; C 3p/1s | `agent:187-236`; `cmd:424` POSIX `{status: null, signal, started: false, …}`; `cmd:456` Windows `status: 130` | carried | PASS |
| C43 | `I25-C43 …` ×12 A/B/C/D | `store:560-632` (`:598` `{code: "root_changed", opened: true, …, lockLeft: false}`); `end:808-813, 823-831, 839-843, 864-867, 877-883, 891-902, 924, 944-954, 966-971`; linhas literais `end:762-769, 907-914` | carried | PASS |
| C44 | `I25-C44 …` ×3 A/B/C/D + nativo `I4-C22` e `I25-C40` (D) | `harn:263-271, 281-289` `[1000, "timeout"]`, `[5000, "timeout"]`; `harn:300-304`; nativo `nat:251-256` | carried; nativo **executado em D** | PASS |
| C45 | `I25-C45 …` A/B/D: resolução + controle Windows; C: resolução + POSIX real | `agent:132-146, 154`; `cmd:166-186`; `cmd:198-201` | carried | PASS |
| C46 | `T8-C15 concurrent producers…` (1) e `I25-C46 diagnóstico do T8-C15…` ×3, A/B/C/D | Saudável: `conc:214-215` `{bound: true, code: null, entries: 40, committed: 40, persisted: 40, lost: 0}`, `:226` 80, `:227` IDs únicos, `:229` `[80, 80]`, `:237` hooks, `:251` `{…code: "lock_present", entries: 3, committed: 0, persisted: 0, lost: 3}`, `:252` árvore igual. (a) `:297` `io_failure`, `lost > 0`, `committed + lost === 40`; `:298` `["rename segmento.tmp EIO (antes do commit)"]`; `:301-310` export `{records: 40 + committed, a: 40, b: committed, others: 0, repeated: 0}`, lock ausente. (b) `:325` `["unlink lock EIO (depois do commit)"]`; `:327-336` export `{80, 40, 40, 0, 0}`. (c) `:349` `{…io_failure, entries: 40, committed: 0, persisted: 0, lost: 40}`; `:351-360` `{unavailable: "lock_present"}` ×2, `{segments: 1, temporaries: 0}`, `lock {present: true}` | carried | PASS |
| C47 | `I23-C10 sessões concorrentes…` (1) e `I25-C47 diagnóstico do I23-C10…` ×2, A/B/C/D; mais `T8-C15`/`I25-C46` (apoio comum) | I23-C10: `ag:310` `deepEqual(run.report?.delivery, DELIVERED_AUTO(1\|20))` nas etapas `ag:321-329`; cauda `ag:331-377`. (a) `ag:402` `[actual, expected]`, `ag:403` prefixo `codex A 0\n<evidência>`, `ag:422` `io_failure` 1/0/0/1, `ag:424` `[["rename segmento.tmp EIO (sob o lock, 2ª tomada)"], 0, 1]`, `ag:426` `active accepted 0 persisted 0`, 0 segmento, 0 temporário, lock ausente. (b) `ag:437` `delivery_timeout` 1/0/0/1, `ag:439` `[[], "close key (sob o lock, 2ª tomada)"]`, `ag:441` `{unavailable: "lock_present"}`, lock presente. Não vazamento: `ag:406-416`, `ag:430`, `ag:444` | carried | PASS |
| **C48** | prova estrutural + `governance-C1 C3 workflow sempre publica CI…` e `governance-C49 …` (A/B/C/D) | Seção “C48 com a exceção”: documento inteiro do HEAD sem `lock_diagnostics` e sem `verify.timeout-minutes` = `d0d5a7f` (true) e = base (true); `governance.yml:43` a expressão; `:21`, `:63` 5; `:84` 10; diff `d0d5a7f..HEAD` 20/1, `631e281..HEAD` 0; `gov:263-278` matriz, `runs-on` e passos; `gov:294-299` conjunto de jobs | **verified at `13bb1d4`** (estrutural; a CI real é do orquestrador) | **PASS** |
| **C49** | `governance-C49 job manual de diagnóstico do lock…` (1) A/B/C/D | Seção “C49”: `gov:317-324` chaves exatas; `gov:325-329` nome, `if`, `windows-latest`, 10, `{contents: "read"}`; `gov:332-339` mesmos hashes do `verify`, `persist-credentials: false`, `node-version: "24.13.0"` sem cache; `gov:340-343` os dois comandos; `gov:345-351` `ci.needs` `["changes","verify"]`, ninguém depende dele, nenhum `continue-on-error`; `gov:354-358` alias e `private` | **verified at `13bb1d4`** | **PASS** |
| **C50** | `C50 …` ×16, A/B/C/D | Seções “Achados 2 e 3” e “C50”: (a) `t:114`, `t:115-119`, `t:120-121`, `t:125`, `t:128-130`; (b) `t:134-137`, `t:147-161`, `t:171`, `t:174`; (c) `t:193-196`, `t:201`; (d) `t:210-215`, `t:226-227`; (e) `t:211-212`, `t:317`, `t:352`; (f) `t:246-266`; (g) `t:231`, `t:234`; (h) `t:364-371`; (i) `t:379-389`, `t:394`, `t:396`; **(j)** `t:275-276`, `t:286-299`, `t:380`; **(k)** `t:314-322`; **(l)** `t:345-354` | **verified at `13bb1d4`** (citações renovadas; arquivo tocado) | **PASS** |

**Checks com prova verde em todos os ambientes aplicáveis e no gate: 50/50.**

## AC → checks

- **AC1** (comando, argumentos, sinais, código): C1–C6, C42, C45. Verdes.
- **AC2** (primeiro uso): C7–C15, C26, C38. Verdes.
- **AC3** (só a sessão iniciada, capturas sucessivas): C16–C24, C41. Verdes.
- **AC4** (encerramento verificável, concorrência, consulta sem ID): C25, C27–C35, C41, C43. Verdes.
- **AC5** (README e ajuda): C36, C37. Verdes.
- **AC6** (harness do Hermes): C39, C40, C44. Unidade verde em A/B/C/D; os 12 nativos verdes em D.
- **AC7** (T8-C15): C46 e T8-C15, verdes em A/B/C/D.
- **AC8** (I23-C10 e orçamento Windows): C47 verde em A/B/C/D; C48 pela leitura estrutural e pelas provas de governança.
- **AC9** (medição comparativa): C49 e C50 (inclusive (j)–(l)) verdes em A/B/C/D; C48 com a exceção. A medição no runner não foi feita aqui.

## Processo desta rodada (o que os meus comandos mostram)

**Executado.**
- git, só leitura ou com configuração local: `rev-parse`, `status`, `diff`, `log`, `show`, `ls-files --eol/-s`, `config --show-origin/--get`, `branch --show-current`, `check-ignore`, `rev-list --count`.
- `git archive -c core.autocrlf=false` e `get-tar-commit-id`.
- `git clone --no-hardlinks --config core.autocrlf=true` do repositório local, com a configuração só no clone.
- Versões: `node`, `npm`, `python`; `wsl.exe -l -q`.
- `node -e` só de leitura (contexto da issue, configuração, `package.json`); `python -I` para contar bytes e CR.
- WSL: `wsl.exe -d Ubuntu -u oldboydev --exec bash --noprofile --norc`, só com os meus scripts.
- Os alvos versionados A, B e C e o `npm test` (D), cada um uma vez.
- C48: a leitura estrutural `v14/c48-structural.mjs` (o método da R13, lido antes). O apoio do autor `builder-ci-lock-latency/workflow-regular.mjs` não foi executado.
- Os meus scripts em `v14/`, adaptações do método da R13 com HEAD, árvore, pasta e rodada trocados:
  - execução e preparo: `run-win-target.sh`, `b-clone-prepare.sh`, `b-clone-after.sh`, `wsl-prepare.sh`, `wsl-run.sh`, `wsl-cleanup.sh` e `run-d-npm-test.sh`;
  - limpeza: `temp-baseline.mjs` e `cleanup-temp.mjs`;
  - leitura dos resultados: `matrix.mjs`, `per-check.mjs`, `d-summary.mjs` e `c48-structural.mjs`.

**Não executado.**
- Nenhuma repetição de prova ou gate. Em D, esperei a notificação de término, sem espera curta.
- Nenhum `codex`, `claude`, `hermes`, `gemini` ou outro agente real, nem `--version`/`--help`, `execvp` ou `spawn` desses nomes fora dos testes versionados.
  - Os agentes dos alvos são de fixture. O C50 usa `node -e`, os próprios filhos do script e um caminho absoluto inexistente no scratch da prova.
  - O Hermes real só foi importado como runtime Python pelos 12 testes nativos versionados, em HOME temporário.
- Nenhuma sonda nova, teste novo, mutação ou fault injection minha. São relato do autor:
  - o RED de `3843867`;
  - as 6 mutações da correção, as 7 do script e as 5 do workflow;
  - as sondas de `'error'`/`'close'`;
  - os controles do CLI local.
- O script `scripts/ci-lock-latency.mjs` pelo CLI completo (1.500 ciclos por fase) e qualquer job do Actions: **nenhum job foi medido ou executado aqui**.
- Nada de rede, credencial, perfil pessoal ou banco. Nenhuma alteração de host, relógio, runtime, Git global ou proteção do sistema.
- Nenhuma listagem ou encerramento de processos.
- Nenhum gate global antigo do WSL com `Date.now()`.
- Nenhuma mudança de timeout de teste: o orçamento de 2 h foi só o da ferramenta, para D.
- Nenhum commit, push, PR, merge, `review:run`, revisão formal ou CI.

**Histórico preservado e não repetido.**
- O incidente da R5 (até 5 inícios do Codex WSL; 12 mtimes sem linha de base de conteúdo) continua registrado em `ffc5937`. Não repeti sondas nem restaurei ou apaguei perfil. Os mesmos dados não o desfazem.
- Ficam como estão: FAIL9 (`4e66de2`), FAIL10 (`788d160`), PASS11 (`d0d5a7f`), PASS12 (`9244eea`) e PASS13 (`0e0325f`). As CIs 40514323240 e 40636157287, vermelhas, continuam registradas (`8868fe1`, `d2d54cf`).
- Não editei `verifier-round1/` a `verifier-round13/`; só li os scripts da R13 como método. Os arquivos da auditoria do orquestrador em `verifier-round14/` ficaram sem leitura nem alteração.

## Falhas, limitações e o que não está provado

- **Nenhuma medição do runner.** A comparação A1/B/A2, com 3 × 500 ciclos e 120 s por fase, é a execução manual do orquestrador. Nada aqui mede o runner, dá taxa ou demonstra causa. Não atribuo nada a runner, Defender, relógio, disco ou hardware.
- **Causas desconhecidas e não eliminadas**:
  - os `lock_present` do I23-C4 e do T8-C11 (CI 40636157287);
  - os `delivery_timeout` do I23-C10 e do primeiro C46 (CI 40514323240);
  - a falha do T8-C15 da R9;
  - a perda do primeiro registro do C28 (R7);
  - o timeout de C32 na CI 40443538957;
  - o C34 do WSL em `abae80a`.

  Uma passada verde por ambiente não mede taxa, e instrumentação ou execução verde não é causa corrigida.
- **C48/C49**: a expressão `${{ … }}` e o `if` do job manual não foram avaliados pelo GitHub aqui. A execução manual também roda a matriz regular; isso é do orquestrador, depois de PASS, `ready` e publicação.
- **C50, só lido** (o checklist não reivindica prova): fase sem pasta própria, `fase interrompida` por erro interno, o exit 1 do CLI, a folga de 5 s e o CLI com as constantes reais. A falha da remoção é injetada pela troca do `rmSync`, sem `EBUSY` real do host, e a remoção parcial seguida de falha não foi simulada (limite declarado pelo autor, `build:1658-1660`).
- **Limites declarados pelo autor e conferidos por leitura** (`build:1661-1665`):
  - um filho que não fecha nem depois do `SIGKILL` deixa `runPhase` esperando até o limite de 10 min do job (`lat:232`);
  - um `kill()` que falha com `'error'` depois do teto deixa a fase com `encerradaPeloTeto: true` e esse código em `interrompidaPorErro`, porque vale o primeiro erro (`lat:250`, `lat:274`).
- **Continuam das rodadas anteriores**:
  - os ramos do C47 sem relatório, sem linha da pré-carga e com listagem ≠ `ENOENT`;
  - os três ramos do apoio de C32 só lidos;
  - a variante “lock ausente” de C43 sem teste nomeado;
  - as janelas do plugin em C44;
  - o ramo com várias capturas `active` na falha do encerramento;
  - recusa e EOF num console real do Windows;
  - os nativos do Hermes pulados na CI (executados aqui em D);
  - C23 sem asserção de tempo;
  - a variante link do C17 não executada no Windows desta máquina (executada em C);
  - macOS e o runner da CI não executados;
  - o uso real sem sessão de agente (`Unresolved` 2, `blocks go-live`).

## Findings (em ordem)

1. **Nenhum bloqueante.** 50/50 checks e os gates A, B, C e D verdes no HEAD `13bb1d4`, cada um numa execução única. O C48 está conforme pela leitura estrutural autorizada.
2. **Achados 2 e 3 da R13: resolvidos no contrato.**
   - **Limpeza**: uma falha da remoção depois dos dados não elimina fases nem impede as seguintes. Sai como `limpeza.falhas` com só o código, e a pasta não é contada como removida (`t:275-276`, `t:286-299`). A guarda continua estrita, com as mesmas recusas (`t:246-266`).
   - **Supervisão**: o início parcial e o `'error'` assíncrono encerram e esperam só os filhos registrados, e o processo alheio fica vivo. A fase sai com `interrompidaPorErro`, os incompletos e as métricas `indisponivel`, sem zero inventado (`t:314-322`, `t:345-354`). Prazos, constantes e carga não mudaram.
3. **Nota de leitura, fora de contrato e não bloqueante** (caminho anterior à correção, não decidido pelo Landing): se o `mkdtempSync` cria a pasta da fase e a gravação do marcador falha em seguida (`lat:355-356`), a fase sai como `pasta própria não criada [<código>]` (`lat:414`). A pasta fica no destino sem marcador e não aparece em `limpeza`. Nada é apagado nem dado como removido, e a guarda nunca a removeria. Não proponho critério novo; registro para o orquestrador.
4. **Precisão do C50 (h), da R13 e sem mudança**: “as cargas fizeram ao menos uma escrita cada” é afirmado pela soma (`t:370` `escritas >= 3` com `t:369` `terminaram: 3`, `erros: {}`), e não por processo. O relatório só expõe a soma por contrato.
5. **Leitura dos contadores (nota da R13, agora com o campo novo)**: numa fase interrompida ou no teto, `carga.escritas` é a soma do que as cargas relataram (0 com `terminaram: 0`), e `erros` pode sair `{lockPresent: 0, lockLost: 0, es: {}}` com 0 ciclos. Esses números devem ser lidos com `ciclos.concluidos`/`incompletos`, `carga.terminaram`, `encerradaPeloTeto` e `interrompidaPorErro`. As métricas de latência nunca viram zero.
6. **AC9 íntegro no que é verificável aqui.**
   - Job manual só na forma do Landing (C49).
   - Jobs regulares e topo idênticos a `d0d5a7f`, fora a linha do AC8 (C48).
   - Script com reúso das APIs públicas, valores exatos, guardas de limpeza, supervisão em toda saída e saída sem caminho, nonce nem ambiente (C50).
   - Sem mudança: `src/`, provas funcionais, prazos, retry, perdas, carga, core e os orçamentos 20/10/5.
7. **Pendências fora deste Verifier**: a revisão formal 8, a publicação, a execução manual com o registro dos resultados, a CI regular verde e o merge ficam com o orquestrador; o uso real fica no `Unresolved` 2.

## Gate

| Gate | Resultado |
| --- | --- |
| A — alvo de 13 arquivos, Windows, Node 24.22.1, concorrência 4 | 151: 145 pass, 0 fail, 6 skip — exit 0 |
| B — o mesmo, Windows, Node 24.13.0 oficial, npm 11.6.2 adjacente, `npm_execpath` ausente, clone novo com `core.autocrlf=true` | 151: 145 pass, 0 fail, 6 skip — exit 0; `cli.mjs` LF/0 CR e status vazio antes e depois |
| C — o mesmo, WSL Ubuntu uid 1000, Node 24.13.0 copiado num prefixo sem `sh`, `env -i`, PATH sem `/usr/bin`, cópia exata | 151: 145 pass, 0 fail, 6 skip — exit 0 |
| C48 — diff, leitura estrutural do documento inteiro contra `d0d5a7f` e a base, `governance-C1 C3`/`governance-C49` | conforme; as duas provas ✔ em A/B/C/D |
| D — `npm test`, Windows, Node 24.22.1, runner padrão (8), 12 nativos do Hermes | **1.023: 1.003 pass, 0 fail, 20 skip — exit 0** (23 + 16 + 417 + 567) |

## Limpeza

- **`%TEMP%`**: linha de base antes de A (`temp-baseline.json`): 60.520 nomes, 0 `skill-me i4 i25 *`, 30.087 `skill-me *` e 0 pastas de latência.
  - `cleanup-temp.mjs` removeu só diretórios que cumprem todas as condições: fora da linha de base, filhos diretos do `%TEMP%`, com prefixo `skill-me i4 ` ou `skill-me i5 `, não links e com mtime na janela.
  - Cada aplicação teve simulação antes:

  | Janela | Linha de base | Removidos | Recusas | Por prefixo |
  | --- | --- | --- | --- | --- |
  | A–B, 13:00:38Z–13:07:56Z | `temp-baseline.json` | **405** | 0 | 377 `i4 i25`, 14 `i4 t8`, 12 `i4 i23`, 1 `i4 ausente`, 1 `i4 secoes` |
  | D, 13:09:56Z–13:21:52Z | `temp-before-D.json` | **127** | 0 | 124 `i4 i5`, 2 `i4 t7`, 1 `i5 c7` |

  - **Depois**: 0 `skill-me i4 i25 *`, 30.087 `skill-me *` e 0 pastas `skill-me lock latency *`/`skill-me-lock-latency-*`; o `after` do C50 removeu as dele. As entradas fora do filtro (temporários `.tmp` de outros processos e `estojo.bak`) não foram tocadas.
- **Clone de B**: removido depois de conferir que o caminho absoluto é `v14/B-clone`, que é diretório e não link, e que o HEAD é `13bb1d4`.
- **WSL**: `wsl-cleanup.sh` removeu `/tmp/skillme-verifier-r14.YRoEBK` depois de conferir o padrão absoluto e o tipo. Restaram 0 scratches `r14`, 0 `skill-me i4 i25|t8|i23 *` e 0 pastas de latência.
- **Mantidos em `v14/`** (pasta ignorada): os logs de A, B, C e D, `matrix.txt`, `per-check.txt`, `D-summary.txt`, `C48-structural.txt`, os workflows extraídos, o tar do HEAD, as linhas de base, os relatórios de limpeza e os meus scripts.
- **Estado final**:
  - configuração, estado de review e prefixo npm real não foram tocados;
  - nenhum processo em segundo plano ficou pendente;
  - o HEAD continua `13bb1d4`;
  - o `git status` estava vazio depois de D e antes de gravar este arquivo; depois, só ele aparece modificado.
