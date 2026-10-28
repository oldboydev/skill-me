# CI 40702252461 do PR #28 — fonte do `RUNNER_TEMP` na medição (handoff pontual, 28/10/2026)

Escopo: a autorização 6467154706 (“Pode fazer a medição comparativa. Mantém os testes e prazos e
segue até a CI ficar toda verde para fazer o merge do PR #28.”) e “Pode fazer quantas precisar”. É uma
correção necessária da ferramenta aprovada, só em `scripts/ci-lock-latency.mjs` e na prova dele.
Workflow, jobs, `src/`, provas antigas, prazos, quantidades, carga e configuração não mudam.

## O que falhou

- **Onde**: na CI 40702252461 (merge de `41dcf5d`), o Ubuntu 22.04 (job 122865010604) falhou no
  `test:governance` com 23 testes, 21 pass e 2 fail. O `fail-fast` cancelou Windows e macOS. O log
  integral é `.checks/code-review/issue-25/ci40702252461-ubuntu.log`.
- **`C50 caminhos`** (`ci-lock-latency.test.mjs:147`): saiu `RUNNER_TEMP ilegível [ENOENT]` no lugar
  de `RUNNER_TEMP ausente`.
- **`C50 relatório`** (`:383`): `measure({env: {}})` saiu `A1/B/A2` no lugar de uma fase `A`.
- **Causa demonstrada**: `resolveDestinations` tinha o padrão `runnerTemp = process.env.RUNNER_TEMP`,
  aplicado também ao `undefined` dado, e no runner o processo tem `RUNNER_TEMP`. A falha é
  determinística e não é intermitência. Os alvos locais A/B/C rodaram sem `RUNNER_TEMP` e não a
  exercitaram.

## Correção e provas (detalhes no build, seção “CI 40702252461 (Ubuntu)”)

- **Registro antes do código**: `efa56ea`, com o Landing, o C50 (m)–(n), a task 42 e o Handoff.
- **Código**: `f133c55`.
  - `resolveDestinations` usa só a entrada recebida.
  - `measure` continua com `env = process.env` por padrão, que é a leitura do CLI.
  - Um `env` dado, inclusive `{}`, é o único ambiente consultado.
  - A saída do CLI é a mesma antes e depois.
- **RED** no script de `41dcf5d`: sem `RUNNER_TEMP`, 24/25 (só (m) falha); com `RUNNER_TEMP`, 22/25
  (as duas da CI e (m) falham).
- **GREEN**: 25/25, sem e com `RUNNER_TEMP`.
- **Mutações**: as 3 foram detectadas.
- **A/B/C**: os dois arquivos do `test:governance`, sem filtro, com o `RUNNER_TEMP` presente e válido,
  deram 25/25/0/0 em cada ambiente, com os 23 nomes da CI mantidos.
- **O que fica carregado**: fora desses dois arquivos, os blobs são os da R14 (`13bb1d4`). C1–C49 e o
  resto ficam com as provas executadas dela (A/B/C 151/145/0/6; D 1.023/1.003/0/20, 12 nativos), sem
  reexecução e sem D novo.

## Medição real (dados do orquestrador, não executados pelo autor)

- **Execução**: manual 40702384050, job 122865354493, sobre `41dcf5d`; dados em
  `.checks/code-review/issue-25/measurement40702384050.json` e `.log`.
- **Fases e ciclos**: A1 no `C:`, B no `D:`, A2 no `C:`; 4.500 de 4.500 ciclos; zero erros,
  incompletos, linhas inválidas e falhas de limpeza; nenhuma amostra ≥ 600 ou ≥ 650 ms.
- **Tomada, p99/máximo em ms**: A1 5,622/33,979; B 1,740/16,559; A2 5,853/14,672.
- **Liberação, p99/máximo em ms**: A1 4,695/16,127; B 2,321/14,721; A2 6,268/19,204.
- **Cargas**: 3 de 3 terminaram, com 164, 223 e 127 escritas.
- **O que os números não dizem**: não demonstram a causa das falhas históricas, não justificam
  otimizar `TEMP`, antivírus ou prazos, e não autorizam ajuste de produto nem do ambiente da CI.

## Pendente, com o orquestrador

- as rodadas necessárias 16/10 sobre o código novo, preservando a formal 8 `blocked`, a formal 9
  `ready` e o histórico;
- a publicação;
- a medição repetida uma vez no HEAD revisto;
- a CI regular verde para o merge.

Nada aqui afirma CI verde nem causa corrigida.
