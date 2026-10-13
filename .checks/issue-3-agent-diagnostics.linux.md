# Issue 3 — execução complementar em Linux

Esta evidência registra execução pelo orquestrador; não substitui o Verifier independente nem concede aprovação de entrega.

## Snapshot e ambiente

- Produto executado: commit `46e7c932e236b979754b10b82330be91d8c7597f`, extraído por `git archive` em diretório temporário separado. Nenhum arquivo de produto foi alterado na cópia.
- Ubuntu 22.04 x86_64 sob WSL, Node `24.13.0`, Git `2.49.0`.
- Node obtido na [distribuição oficial](https://nodejs.org/dist/v24.13.0/), com SHA-256 conferido contra SHASUMS256.txt.
- Git compilado da [fonte oficial 2.49.0](https://www.kernel.org/pub/software/scm/git/git-2.49.0.tar.xz), com SHA-256 conferido; zlib1.3.1 também conferida. Ambos usados somente em prefixo temporário, sem instalação global.
- Dependências JavaScript do lockfile copiadas da instalação local para a cópia isolada. O processo recebeu somente PATH temporário para Node/Git.

## Resultado

`npm test` foi executado de ponta a ponta: **6 governança +10 motor comum +229 doctor =245 PASS, 0FAIL, 0SKIP; exit0**. O teste de symlink POSIX executou e passou (no Windows é o único skip esperado). Log dessa execução preservado em `.checks/code-review/linux-46e7c93-npm-test.txt`, ignorado pelo Git.

A primeira tentativa usou o Git2.34.1 da distribuição: governança passou, mas sete testes do motor comum falharam porque essa versão não suporta `git worktree list --porcelain -z`; doctor não chegou a executar nesse comando encadeado. A falha permanece registrada em `.checks/code-review/linux-initial-git234-npm-test.txt`. A repetição completa com Git2.49.0 passou, sem alterar o motor. O alvo doctor também passou sozinho antes da repetição completa,229/229,0skips.

Problemas de argumentos do comando de preparação no WSL foram corrigidos usando um arquivo de shell salvo; eles não foram contabilizados como execução dos testes. Nenhuma prova macOS foi executada nesta máquina. A matriz de CI é Windows,Ubuntu22.04 e macOS14,com Node24.13.0.

## Limite desta evidência

A suíte verde não elimina os defeitos concretos encontrados na rodada3 independente sobre esse mesmo produto. O relatório `.checks/issue-3-agent-diagnostics.verified.md` decide os18checks. Correções posteriores exigem nova execução em seu próprio commit, indicada abaixo.

## Repetição após as correções

- Commit de produto executado: `e3f9f78a20fe0e452e21a565686dddaf6cce2adf`, extraído novamente por `git archive` em outro diretório temporário, sem alterações de produto. Inclui as correções G1–G4 e as variantes Hermes de catálogo ausente e intérprete absoluto sem X.Y; autoria Claude.
- Mesmo Ubuntu22.04/Node24.13.0/Git2.49.0 e dependências isoladas descritos acima.
- `npm test`: **6 governança +10 motor comum +243 doctor =259 PASS, 0FAIL, 0SKIP; exit0**. Resultado integral preservado em `.checks/code-review/linux-final-npm-test.txt`.
- Execução Windows pelo autor: **6+10+242 =258 PASS, 0FAIL, 1SKIP**. O único skip continua sendo o teste de symlink real POSIX. RED das novas regressões e GREEN estão registrados nas seções13–14 do `.build.md`; não houve substituição do relatório independente por esse self-report.

Probes complementares pela CLI POSIX da mesma cópia: launcherA aponta para `/b/bin/python3`; com pacoteB0.20.0, a CLI publica0.20.0 e mantém as cinco capacidades locais unverified (perfil não examinado). Com pacoteB0.21.4 e tabela nativa sintética ligada, publica0.21.4 e as cinco linhas verified têm `evidence.source.path` no pacoteB, nuncaA. Configuração com handler e sem tabela vinculada resulta `partial/unknown/hooks_catalog_unavailable/trustunknown`. Fixtures e interpretador stub não foram executados; nenhuma sentinela foi criada. Log local: `.checks/code-review/linux-final-probes.txt`. A primeira impressão do probe consultava uma propriedade inexistente (`availability`); foi corrigida para `support` e repetida, sem alteração de produto. Estes probes são complementares, não assertions substitutas dos testes nem uma quarta rodada do Verifier.

Smoke do ambiente Windows real: Claude2.1.295 e Codex0.162.1 presentes/configurados; Hermes presente com versão inconclusiva e not_configured. Hash/tamanho das quatro configurações ativas foram comparados com o baseline de antes da implementação: todos iguais. Os cinco arquivos comuns do motor de revisão também continuam sem diff contra4242520. Nenhuma captura real foi realizada.

## Pendência de entrega

O FAIL independente da rodada3 foi preservado em `c4a4d45`; o arquivo `.verified.md` continua identificando exatamente o produto46e7c93 que verificou. As correções posteriores e estas provas não concedem um novo PASS independente. A regra TLC exige escalar ao proprietário após três rodadas; nova rodada depende de sua decisão. A primeira revisão formal consumiu uma das duas tentativas permitidas. A segunda tentativa formal e a criação do PR permanecem pendentes da verificação independente do produto corrigido. Não houve push dessas correções, PR, merge ou publicação.

## Autorização da rodada4 — 13/10/2026

O proprietário autorizou nesta conversa: “pode fazer a quarta rodada de verificação independente da issue #3 e, se passar na revisão, abra o PR”. A autorização permite uma quarta rodada TLC da issue3, preservando o histórico das três anteriores, seguida da revisão formal e da abertura do PR se aprovadas. O teto de duas tentativas do motor formal não foi alterado; há uma tentativa restante. Não autoriza merge, publicação ou exceções para outras issues.
