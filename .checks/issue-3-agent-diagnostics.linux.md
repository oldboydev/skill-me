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
- `npm test`: **6 governança +10 motor comum +243 doctor =259 PASS, 0FAIL, 0SKIP; exit0**. Resultado dessa execução preservado em `.checks/code-review/linux-e3f9f78-npm-test.txt`.
- Execução Windows pelo autor: **6+10+242 =258 PASS, 0FAIL, 1SKIP**. O único skip continua sendo o teste de symlink real POSIX. RED das novas regressões e GREEN estão registrados nas seções13–14 do `.build.md`; não houve substituição do relatório independente por esse self-report.

Probes complementares pela CLI POSIX da mesma cópia: launcherA aponta para `/b/bin/python3`; com pacoteB0.20.0, a CLI publica0.20.0 e mantém as cinco capacidades locais unverified (perfil não examinado). Com pacoteB0.21.4 e tabela nativa sintética ligada, publica0.21.4 e as cinco linhas verified têm `evidence.source.path` no pacoteB, nuncaA. Configuração com handler e sem tabela vinculada resulta `partial/unknown/hooks_catalog_unavailable/trustunknown`. Fixtures e interpretador stub não foram executados; nenhuma sentinela foi criada. Log local: `.checks/code-review/linux-final-probes.txt`. A primeira impressão do probe consultava uma propriedade inexistente (`availability`); foi corrigida para `support` e repetida, sem alteração de produto. Estes probes são complementares, não assertions substitutas dos testes nem uma quarta rodada do Verifier.

Smoke do ambiente Windows real: Claude2.1.295 e Codex0.162.1 presentes/configurados; Hermes presente com versão inconclusiva e not_configured. Hash/tamanho das quatro configurações ativas foram comparados com o baseline de antes da implementação: todos iguais. Os cinco arquivos comuns do motor de revisão também continuam sem diff contra4242520. Nenhuma captura real foi realizada.

## Pendência de entrega

O FAIL independente da rodada3 foi preservado em `c4a4d45`; o arquivo `.verified.md` continua identificando exatamente o produto46e7c93 que verificou. As correções posteriores e estas provas não concedem um novo PASS independente. A regra TLC exige escalar ao proprietário após três rodadas; nova rodada depende de sua decisão. A primeira revisão formal consumiu uma das duas tentativas permitidas. A segunda tentativa formal e a criação do PR permanecem pendentes da verificação independente do produto corrigido. Não houve push dessas correções, PR, merge ou publicação.

## Autorização da rodada4 — 13/10/2026

O proprietário autorizou nesta conversa: “pode fazer a quarta rodada de verificação independente da issue #3 e, se passar na revisão, abra o PR”. A autorização permite uma quarta rodada TLC da issue3, preservando o histórico das três anteriores, seguida da revisão formal e da abertura do PR se aprovadas. O teto de duas tentativas do motor formal não foi alterado; há uma tentativa restante. Não autoriza merge, publicação ou exceções para outras issues.

## Resultado da rodada4 e correção aplicada

Rodada4 independente no produto `6d073b69351a2884d46bf6056aaf8e6ecb7574b8`: **FAIL,17/18PASS**; somente C8 permaneceu reprovado. Relatório preservado no commit `c3ce992cd8ffe9eeb1e26aa86db20771baa1a3f6`. O residual G3 era a tabela `SHELL_UNSUPPORTED_HOOKS`: o Hermes permite `transform_api_error_classification` para plugins Python, mas recusa seu registro shell antes de conferir `VALID_HOOKS`. A fixture anterior omitia esse cruzamento entre os dois conjuntos.

Claude aplicou a correção no commit `7f4eecbe5d082f98998f3363413cb4a6103bedef`; fontes, regressões, RED/GREEN e limites estão na seção15 do `.build.md`. O leitor usa as duas tabelas do mesmo texto vinculado, preserva o contrato de plugins da matriz e filtra a configuração shell. Exclusão sem fonte reconhecida fica unknown, sem inventar conjunto vazio.

- Windows, autor: `npm test` completo, **6+10+251 =267PASS,0FAIL,1SKIP**, exit0. O skip permanece o symlink POSIX. Saída preservada em `.checks/code-review/verifier4-g3-shell-fix-npm-test.txt`.
- Linux, orquestrador: novo snapshot isolado do commit7f4eecb, mesmo Ubuntu22.04/Node24.13.0/Git2.49.0; `npm test` completo, **6+10+252 =268PASS,0FAIL,0SKIP**, exit0. Saída dessa execução em `.checks/code-review/linux-7f4eecb-npm-test.txt`.
- Repetição complementar da reprodução nativa: plugins.py real copiado como dado para fixture0.21.4, sem importar/executar Python. Evento recusado sozinho: `complete/not_configured/hooks_event_shell_unsupported/trustnot_applicable`. Mistura com pre_tool_call: `complete/configured/hooks_configured/trustunknown`. Nos dois casos, o suporte de plugin permanece verified nas cinco linhas locais, mostrando a separação C5/C8; nenhuma sentinela foi criada. Script local ignorado: `.checks/code-review/probe-verifier4-native.mjs`.
- Hash/tamanho das quatro configurações ativas reconferidos: todos iguais ao baseline anterior à implementação. Nenhuma configuração ativa foi alterada; core5/task/AGENTS/relatório independente preservados.

Essas execuções são provas do autor/orquestrador e não concedem PASS independente. A quarta rodada autorizada terminou FAIL; uma quinta não foi iniciada. A decisão do proprietário sobre verificação adicional permanece necessária antes da segunda revisão formal e de qualquer PR. O histórico e o teto formal original seguem intactos.

## Autorização da rodada5 — 13/10/2026

O proprietário autorizou nesta conversa: “pode fazer a quinta verificação independente da issue #3 e, se passar nas revisões, abra o PR”. Autoriza a quinta rodada TLC desta issue e a abertura do PR após aprovação independente e formal. Os relatórios anteriores permanecem no histórico. O limite formal continua duas tentativas, com uma restante; nenhuma exceção formal foi inferida desta autorização.

## Quinta rodada e segunda revisão formal

A quinta verificação independente passou18/18 no produtoaa918a5; relatório preservado em `fd4258f1d203e481de02e0368725613d64f807e7`. A segunda revisão formal dessa HEAD retornou `changes_requested/verification:insufficient`, com três achados P2 bloqueantes no Codex: alias de desativação ignorado; null aninhado no input MCP; envelope hooks.json não validado. O contador comum mantém as duas tentativas no histórico; não foi apagado nem alterado para aparentar aprovação. O relatório de runtime permanece em `.checks/code-review/issue-3/response.json`, ignorado, conforme a regra do motor.

Claude corrigiu os três casos em `a698b00ba31ef9cd958f108803cce96dabf56ae5` e o alcance dos tipos das mesmas flags em `fc3b47a0d3ec46fc7fe056dc319c7eb4b0edb2f5`. Fontes primárias da tagrust-v0.162.1, RED/GREEN, regressões próprias/CLI e limitações estão nas seções16–17 do `.build.md`. A chave canônica só delega por ausência; valores não booleanos conhecidos invalidam o arquivo. Null em objetos/arrays de input é rejeitado por uma validação iterativa. A forma HooksFile é aplicada somente a hooks.json, preservando TOML/Claude/Hermes.

- Windows, autor: `npm test`, **6+10+279 =295PASS,0FAIL,1SKIP**, exit0; skip POSIX pré-existente. Log `.checks/code-review/formal2-flag-types-npm-test.txt`.
- Linux, orquestrador: snapshot isolado do commitfc3b47a, mesmo Ubuntu22.04/Node24.13.0/Git2.49.0; `npm test`, **6+10+280 =296PASS,0FAIL,0SKIP**, exit0. Log `.checks/code-review/linux-final-npm-test.txt`.
- Probes complementares de CLI isolada (`.checks/code-review/probe-formal2-native-cli.mjs`): alias false →disabled/features_hooks_disabled/trustnot_applicable/complete; null aninhado →invalid/hooks_structure_invalid/partial; description42 →invalid/hooks_file_envelope_invalid/partial; flag de tipo errado →invalid/features_hooks_flag_invalid_type/partial; envelope válido com descriptionnull →configured/hooks_configured/complete. Em todos: exit0, três agentes preservados e sentinela ausente. Os três probes de flags que antes mascaravam tipos errados agora retornam invalid.
- Quatro configurações ativas: hash/tamanho iguais ao baseline anterior à implementação. Core5/AGENTS/task/configuração dos limites e relatório independente preservados.

Essas provas não substituem uma nova verificação independente do código corrigido nem concedem ready formal. A rodada5 e as duas tentativas formais autorizadas terminaram; nenhuma verificação6 ou revisão formal3 foi iniciada. A entrega está preparada para a decisão específica do proprietário sobre ambas, exclusivamente para a issue3. Não houve push das correções, PR, merge ou publicação.
