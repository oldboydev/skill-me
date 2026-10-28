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
