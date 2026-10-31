# S23 author report

## Fase 1 (preservada)

Parou natural0 antes de qualquer edição ou teste. Leu somente `read-plan.json` (inteiro, 78 linhas).
O guard recusou `index.md`, `index.json`, `source-index.json` e `source.md` [1,100]; nada do pacote foi lido nessa fase.
Nenhum arquivo foi alterado e nenhum processo em segundo plano foi iniciado.

## Leituras (fase 2)

- `required-sources-index.json`: inteiro, 62 linhas, 10 fontes.
- `required-sources-pack.md`: os 18 pares do `read-plan.json` ([1,100] … [1601,100], [1701,30]), 1730/1730 linhas, nenhum par fora do plano.
  As fontes do pacote são AGENTS.md, CLAUDE.md, tlc-implement/SKILL.md, a proposta `.tasks/issue-25-macos-runner-proposal.md`, governance.yml, governance-ci.test.mjs, ci-lock-latency.test.mjs, ci-change-filter.mjs, ci-result.mjs e package.json.
- Originais não relidos.
- Linhas do teste no pacote: arquivo:268 = pacote:759 (`"macos-14",` em C1/C3 `tools.strategy.matrix.os`) e arquivo:393 = pacote:884 (`["macos-14", [true, false]],` na tabela de ramos C48).
- Linha do YAML: a linha 41 `os: [ubuntu-22.04, windows-latest, macos-14]` (pacote:418).

## Landing

| Porta | Decisão literal | Alternativa rejeitada |
|---|---|---|
| Imagem macOS da matriz `verify` (S23, aprovada em 31/10/2026: “Autorizar macOS 15 (recomendado)”, registro 6538188577) | Imagem fixa `macos-15`. Escopo: 2 arquivos e 3 literais. (1) `scripts/governance-ci.test.mjs:268`: `"macos-14",` → `"macos-15",`. (2) `scripts/governance-ci.test.mjs:393`: `["macos-14", [true, false]],` → `["macos-15", [true, false]],`. (3) `.github/workflows/governance.yml:41`: `macos-14` → `macos-15`. Ordem: primeiro os 2 literais do teste; a prova RED do teste contra o YAML ainda em 14 deve ser falha de igualdade em `deepEqual`, sem TypeError, setup ou ligação; só depois o YAML. | `macos-latest`/`macos-26`: rejeitado porque `latest` é uma imagem móvel que passará a ser a 26, e a proposta fixa a 15. Manter `macos-14` e aguardar a janela: rejeitado porque a imagem será retirada em 02/11 e a decisão do usuário foi migrar. Trocar a igualdade por presença ou remover/pular o caso macOS: proibido. |

Ficam iguais: asserções, nomes e quantidade de testes, prazos (20/10/5/10 min), concorrência, carga, Node 24.13.0, jobs, ubuntu-22.04, windows-latest, comandos e ações fixadas.

## Fase 2: código

Feito com NativeEdit, 2 substituições únicas em `scripts/governance-ci.test.mjs`:

```diff
@@ linha 268 (C1/C3, tools.strategy.matrix.os)
     "windows-latest",
-    "macos-14",
+    "macos-15",
   ]);
@@ linha 393 (C48, tabela de ramos)
-    ["macos-14", [true, false]],
+    ["macos-15", [true, false]],
```

O YAML não foi tocado e continua com `macos-14` para a prova RED. Nenhuma outra asserção, nome ou byte foi alterado.
A contagem de bytes continua 21227, porque a troca é de 1 caractere por 1.
Testes não executados e sem PASS. A prova RED e o commit ficam com o Root. Encerrado natural0, sem processos em segundo plano (0 BG).

## Fase 3: prova RED A (teste em 15, YAML em 14)

Comando literal, em primeiro plano: `C:/nvm4w/nodejs/node.exe C:/Users/paulo/projects/debuguer_skills/.checks/code-review/issue-25/worker-guard/author-s23-red-controller.mjs author-s23-red A`.
O timeout foi de 600000 ms, que é o máximo da ferramenta em primeiro plano; os 900000 ms pedidos não eram aceitos. A execução levou cerca de 11 s.

Evidência em `.checks/code-review/issue-25/author-s23-red/A-result.json` e `A.log`:

- HEAD `4581ee4660efea3c6e8b7bbbd82a3f633a71399f`, de 2026-10-31T03:11:02.033Z a 03:11:13.458Z, `error: null`, `valid: true`, `naturalExit: 1`.
- Contagens: tests 27, pass 26, fail 1, cancelled 0, skipped 0, todo 0, duration_ms 8442.5.
- Única falha: `governance-C1 C3 workflow sempre publica CI sem IA nem release` (teste em `scripts\governance-ci.test.mjs:242:1`, asserção em `:265:10`, ou seja, `assert.deepEqual(tools.strategy.matrix.os, [...])`).
  `AssertionError [ERR_ASSERTION]`, `operator: 'deepStrictEqual'`, `actual: [ 'ubuntu-22.04', 'windows-latest', 'macos-14' ]`, `expected: [ 'ubuntu-22.04', 'windows-latest', 'macos-15' ]`.
- É uma falha de igualdade: esperado 15, atual 14. Não há TypeError, falha de setup, de import ou de ligação. Os outros 26 testes passaram, incluindo os dois de C48, C49, C2, C4 e os 18 de C50 (o pwsh real usou `C:\Program Files\PowerShell\7\pwsh.exe`).

Isto é o RED esperado, não PASS do produto.

Observação para o Root, sem alteração: o literal da linha 393 (tabela de ramos C48) não compara com a matriz do YAML. Ele só alimenta `runsOn` contra as duas condições `if`, por isso C48 passa com o YAML ainda em 14. Quem fixa a imagem `macos-15` no YAML é a asserção de C1/C3 da linha 268. Isso coincide com o plano, que pede só a troca dos literais; não proponho mudar nenhuma asserção.

YAML e testes não foram alterados nesta fase. Nada de commit, push, cleanup ou processos em segundo plano. `Temp\x` não foi acessado.

## Fase 4: YAML (depois do RED comprovado pelo Root)

Reli `author-s23-red/A-result.json` (inteiro) e `A.log` (linhas 24–65), e o conteúdo coincide com a Fase 3:
HEAD `4581ee46…`, `valid: true`, `naturalExit: 1`, 27 testes, 26 pass, 1 fail, 0 cancelled, 0 skipped.
A única falha é C1/C3 em `governance-ci.test.mjs:265`, `deepStrictEqual`, com atual `macos-14` e esperado `macos-15`, sem TypeError nem falha de setup ou ligação.

Alteração com NativeEdit, uma única ocorrência, usando a âncora literal da linha 418 do pacote:

```diff
@@ .github/workflows/governance.yml:41 (jobs.verify.strategy.matrix)
-        os: [ubuntu-22.04, windows-latest, macos-14]
+        os: [ubuntu-22.04, windows-latest, macos-15]
```

O escopo do Landing está completo: 2 arquivos e 3 literais. Nenhum outro byte do YAML mudou (troca de 1 caractere por 1, tamanho de 3901 bytes mantido); não mudaram prazos, jobs, Node, ações, comandos nem os outros sistemas.
Não executei testes nesta fase e não declaro GREEN nem PASS. A conferência do diff, o commit e a liberação do GREEN ficam com o Root. Nada de push, cleanup ou processos em segundo plano. `Temp\x` não foi acessado.

## Fase 5: GREEN de governança 27, alvos A/B/C (somente `test:governance`, não o produto ABC)

Executei os 3 comandos literais do controlador, em sequência e em primeiro plano, um de cada vez e sem repetição.
O timeout foi de 600000 ms em cada um, o máximo da ferramenta em primeiro plano, em vez dos 900000 ms pedidos; todos terminaram em menos de 70 s.
O HEAD é `3e4d1ec3348684e63f15e55280f95ccfca12f809` (tree `b3a40cbe…`) em A, B e C.

| Alvo | Ambiente (env) | Comando | EXIT natural | tests | pass | fail | cancelled | skipped | duration_ms |
|---|---|---|---|---|---|---|---|---|---|
| A | repositório Windows, Node v24.22.1, npm 11.19.1, concorrência min(CPU−1,8)=8, RUNNER_TEMP e TEMP isolados, status antes/depois `[]` | `node --test --test-concurrency=8 scripts/governance-ci.test.mjs scripts/ci-lock-latency.test.mjs` | 0 | 27 | 27 | 0 | 0 | 0 | 11194.99 |
| B | clone Windows `B-clone`, Node v24.13.0, npm 11.6.2, concorrência 8, mesmo HEAD/tree, status `[]` | igual, com concorrência 8 | 0 | 27 | 27 | 0 | 0 | 0 | 40585.60 |
| C | WSL, archive do commit com sha256 `316f0ba1…` e tree conferida, Node v24.13.0, npm 11.6.2, concorrência 7, sem agentes nem pwsh no PATH | igual, com concorrência 7 | 0 | 27 | 26 | 0 | 0 | 1 | 4773.62 |

Os resultados `*-result.json` têm `valid: true` e `error: null` nos três alvos.

Skip em C: 1, e é o esperado. É o teste `governance-C48 ramo Windows das integrações no pwsh real…`, pulado com o motivo declarado `# o ramo roda no pwsh do runner Windows; fora dele, só a estrutura (governance-C48 integrações)`. Em A e B ele rodou com `C:\Program Files\PowerShell\7\pwsh.exe` e passou (6212 ms / 9223 ms).

Testes nomeados nos logs A, B e C:

- `governance-C1 C3 workflow sempre publica CI sem IA nem release`: ✔ em A, B e C. É a asserção que estava RED na Fase 3 e agora vê a matriz `macos-15`.
- `governance-C48 integrações: um só passo por sistema da matriz…; orçamentos 20/10/5 e 10 iguais`: ✔ em A, B e C.
- `governance-C48 ramo Windows das integrações no pwsh real…`: ✔ em A e B; ﹣ skip declarado em C.
- `governance-C49 job manual de diagnóstico do lock…`: ✔ em A, B e C.
- C50, 18 testes ✔ em A, B e C: percentis e faixas; sem amostras; caminhos; caminhos reais; E/S; teto; término parcial; protocolo; limpeza; limpeza que falha; limpeza que falha depois dos dados; início parcial; erro assíncrono; fronteira real; relatório; fonte do RUNNER_TEMP; fonte do RUNNER_TEMP pelo padrão do CLI; CLI.
- Os demais, ✔ em A, B e C: governance-C2 (4 testes) e governance-C4 (1 teste).

Contabilidade:

- Source: estimativa de 64520 tokens com reserva (do `read-plan.json`), com 1730/1730 linhas do pacote lidas nos 18 pares. Nenhum original foi relido.
- O runtime é contado à parte: os resultados A/B/C e os logs/env (`A.log`, `A.env.txt`, `B.log`, `B.env.txt`, `C.log`, `C.run.txt`) não entram no Source.
- Nenhum processo em segundo plano (0 BG). Nenhuma edição de produto, testes ou YAML nesta fase; só o report. Nada de commit, push ou cleanup. `Temp\x` não foi acessado.

Isto é GREEN somente do par de governança 27 em A/B/C. Não declaro Verifier, PASS da feature, ready nem CI remota: o Verifier30 fresco sobre toda a feature 50/9 é despachado pelo Root, e a prova real em macOS 15 continua obrigatória na CI posterior.
