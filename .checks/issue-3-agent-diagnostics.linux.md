# Issue 3 — execução complementar em Linux

Esta evidência registra execução pelo orquestrador; não substitui o Verifier independente nem concede aprovação de entrega.

## Snapshot e ambiente

- Produto executado: commit `46e7c932e236b979754b10b82330be91d8c7597f`, extraído por `git archive` em diretório temporário separado. Nenhum arquivo de produto foi alterado na cópia.
- Ubuntu 22.04 x86_64 sob WSL, Node `24.13.0`, Git `2.49.0`.
- Node obtido na [distribuição oficial](https://nodejs.org/dist/v24.13.0/), com SHA-256 conferido contra SHASUMS256.txt.
- Git compilado da [fonte oficial 2.49.0](https://www.kernel.org/pub/software/scm/git/git-2.49.0.tar.xz), com SHA-256 conferido; zlib1.3.1 também conferida. Ambos usados somente em prefixo temporário, sem instalação global.
- Dependências JavaScript do lockfile copiadas da instalação local para a cópia isolada. O processo recebeu somente PATH temporário para Node/Git.

## Resultado

`npm test` foi executado de ponta a ponta: **6 governança +10 motor comum +229 doctor =245 PASS, 0FAIL, 0SKIP; exit0**. O teste de symlink POSIX executou e passou (no Windows é o único skip esperado). Log local preservado em `.checks/code-review/linux-final-npm-test.txt`, ignorado pelo Git.

A primeira tentativa usou o Git2.34.1 da distribuição: governança passou, mas sete testes do motor comum falharam porque essa versão não suporta `git worktree list --porcelain -z`; doctor não chegou a executar nesse comando encadeado. A falha permanece registrada em `.checks/code-review/linux-initial-git234-npm-test.txt`. A repetição completa com Git2.49.0 passou, sem alterar o motor. O alvo doctor também passou sozinho antes da repetição completa,229/229,0skips.

Problemas de argumentos do comando de preparação no WSL foram corrigidos usando um arquivo de shell salvo; eles não foram contabilizados como execução dos testes. Nenhuma prova macOS foi executada nesta máquina. A matriz de CI é Windows,Ubuntu22.04 e macOS14,com Node24.13.0.

## Limite desta evidência

A suíte verde não elimina os defeitos concretos encontrados na rodada3 independente sobre esse mesmo produto. O relatório `.checks/issue-3-agent-diagnostics.verified.md` decide os18checks. Correções posteriores exigem nova execução em seu próprio commit, indicada abaixo.
