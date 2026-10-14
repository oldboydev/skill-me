# Issue #11 — Verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: `3b6387615aa9233fe89771782fd8e0948042cdac..15e32abb24402726c1e814303331a6696f7e6f44`
**Head**: `15e32abb24402726c1e814303331a6696f7e6f44`
**Round**: 1 — full
**Verifier**: sub-agent independente novo; autor Claude != Verifier Codex
**Resultado**: 10/11 checks comprovados; C3 exige correção da prova complementar, sem alterar o core vinculante.

## Finding bloqueante

**F1 — prova complementar não reproduz em checkout Windows padrão.** Localização nesta versão: `.checks/issue-11-review-cleanup-result.proof.mjs:109–119`, especialmente a âncora com `\n` literal em 114 e `assert.equal(occurrences, 1, ...)` em 116.

Cenário realmente executado: clone local isolado, sem hardlinks, em `.checks/code-review/issue-11-verifier/repro-clone`; `core.autocrlf=true`; checkout destacado do HEAD acima. O original tem 887 LF e zero CRLF no teste, enquanto o checkout criado pelo Git tem 887 CRLF e zero LF isolado. Os cinco hashes, o escopo e as cópias de CLI/motor/schema passam. Em seguida, a âncora LF aparece zero vezes; a prova sai com 1 (`0 !== 1`) antes de iniciar o caso `blocked`.

Esperado: a prova complementar reproduzível executa o C11 `blocked`, comprova stdout completo, exit 2, stderr exato e ausência do lock, usando core byte-idêntico. Atual: somente funciona no working tree com LF. Impacto: C3/AC1 não têm a prova complementar reproduzível prometida pelo plano, inclusive na cópia isolada que a própria governança cria. Log: `.checks/code-review/issue-11-verifier/proof-fresh-checkout.log`. Não é um defeito constatado na CLI ou no motor; corrigir os metadados da prova preservando os cinco blobs aprovados. Não enfraquecer a asserção de âncora única nem dispensar a execução do teste.

## Fontes lidas e escopo

Lidos integralmente: `AGENTS.md`, referência `tlc-implement/references/verify.md`, task, checklist, build, proof, README do motor, package.json, issue exportada em `.checks/code-review/issue-11-body.md` e diff completo dos sete arquivos base..HEAD. `CONTRIBUTING.md` não existe; a tentativa de leitura confirmou a ausência.

A issue AC1–AC7 e o plano correspondem aos 11 checks: ready/changes_requested/blocked, erro original, aviso condicionado à pasta restante, liberação do lock, hashes, contagens e escopo. Nenhuma contradição identificada. Fonte ERP consultada pela API GitHub em modo somente leitura: commit `781ca4c5b357c6798e50a2956e61b3c7d6c7d43d`, subárvore scripts `cf2669e1c74b4ff2b4362562f64f317973a2fa48`. Os cinco blobs retornados correspondem aos exigidos; log `upstream-tree.log`. Os arquivos previamente obtidos em `.checks/code-review/issue-11-upstream/` também têm os cinco hashes esperados.

Sem UI vinculante; etapa específica UI não se aplica ao perfil light. O light não exige Coverage join, Test policy verdicts nem fault injection; não foram executados. A checklist não contém Test policy adicional. Não houve despacho de agentes, alteração de código/testes/task/checklist, commit, push, PR ou merge pelo Verifier.

## Provas executadas

Windows; Node `v24.21.0`. Cada target foi invocado uma vez em execução válida no HEAD: suíte oficial, governança e proof. Antes disso, as tentativas sob sandbox bloquearam `git init` em `.git/config` nas pastas temporárias. Governança: 5 pass/1 fail por infraestrutura; proof: caso blocked falhou no setup pelo mesmo motivo. Core mostrou falhas de setup e ficou sem finalizar, sendo interrompido com exit 1. Esses resultados não são passes nem defeitos de produto; logs iniciais preservados. Repetição dos targets afetados com `require_escalated` aprovada resolveu a restrição. Isso não constitui nova rodada da verificação.

| ID | Comando | Resultado válido | Log em `.checks/code-review/issue-11-verifier/` |
|---|---|---|---|
| P1 | `npm.cmd run test:code-review` | exit 0; 16 tests, 16 pass, 0 fail, 0 skipped, 0 cancelled | `code-review-escalated.log` |
| P2 | `npm.cmd run test:governance` | exit 0; 6 tests, 6 pass, 0 fail, 0 skipped | `governance-escalated.log` |
| P3 | `node .checks/issue-11-review-cleanup-result.proof.mjs` | exit 0 no original LF; cinco hashes/escopo; blocked 1 pass/0 fail | `proof-escalated.log` |
| P4 | P3 em clone destacado com `core.autocrlf=true` | exit 1; âncora 0, esperado 1; blocked não executado | `proof-fresh-checkout.log` |

P1 executou individualmente estes nomes, conforme linhas 5–20 do log:

- C10 falha de limpeza devolve o relatório ready, libera lock e preserva aprovação e contador
- C10 falha de limpeza devolve o relatório changes_requested e avisa a pasta no stderr
- C10 falha de limpeza que não deixa a pasta devolve o relatório e não avisa
- C10 revisão falha seguida de falha de limpeza mostra o erro da revisão e libera lock
- C11 comando com limpeza falha imprime o relatório ready, sai com 0 e avisa a pasta no stderr
- C11 comando com limpeza falha imprime o relatório changes_requested, sai com 2 e avisa a pasta no stderr
- C11 comando com revisão falha e limpeza falha escreve o erro da revisão e sai com 1
- C1 relatório contraditório, incompleto ou não comprovado nunca libera
- C2 contexto ausente, árvore suja, caminho externo e issue errada são recusados
- C3 revisão isolada entrega contexto e remove checkout sem tocar original
- C4 erro técnico, saída inválida e mutação não produzem aprovação
- C5 revisão repetida reutiliza resultado e alterações invalidam o gate
- C6 limite de rodadas e exclusão mútua impedem chamadas adicionais
- C7 abertura exige revisão atual e cabeça remota igual, com resumo no corpo
- C8 raia direta dispensa task e evidência, perfil normal exige ambas
- C9 argumentos estritos e launcher Windows sem shell ou API key

P2 executou os seis nomes: `governance-C2 filtro de mudanças preserva os caminhos documentais explícitos`; `governance-C2 diff real inclui exclusões, renomes e caminhos com espaços`; `governance-C2 exclusão e renome apenas documentais exigem validação`; `governance-C2 eventos manuais e referências inválidas não dispensam verificação`; `governance-C4 resultado obrigatório recusa falhas, cancelamento e skip inesperado`; `governance-C1 C3 workflow sempre publica CI sem IA nem release`.

P3 confirmou realmente `C11 comando com limpeza falha imprime o relatório blocked, sai com 2 e avisa a pasta no stderr`, com asserções de nome aprovado e contagens 1/1/0. As cópias são escritas diretamente de `readFileSync` sem conversão dos bytes de CLI/motor/schema (proof:103), com hashes conferidos (105). P4 não chegou ao runner: não atribuir 1 pass a essa execução.

## Checks — evidência nesta versão

Os nomes C10/C11 abaixo se referem aos testes da suíte, não aos IDs dos checks. Citações são linhas verificadas no HEAD deste relatório. `T` = `scripts/code-review/review.test.mjs`; `P` = `.checks/issue-11-review-cleanup-result.proof.mjs`.

| Check | Claim | Proof run | Assertion específica e localização | Result |
|---|---|---|---|---|
| C1 | ready: relatório completo/exit 0 | P1, C11 ready executado | T:335–337 tabela `["ready", 0]`; T:349 `assert.equal(state.attempts[0].report.status, status)`; T:350–354 `assert.equal(run.stdout, JSON.stringify(state.attempts[0].report, null, 2) + "\n")` e `assert.equal(run.status, code)` | PASS |
| C2 | changes_requested: relatório completo/exit 2 | P1, C11 changes_requested executado | T:337 `["changes_requested", 2]`; mesmas asserções T:349–354 | PASS |
| C3 | blocked: relatório completo/exit 2, prova reproduzível | P3 passa; P4 falha | P:118 inclui `["blocked", 2]` no teste copiado; T:349–354 mantém asserções exatas; P:137–143 confirma nome/1 teste/1 pass/0 fail/exit 0. P:116 falha com âncora 0 no checkout padrão e impede essas asserções em P4 | FAIL — F1 |
| C4 | erro original/exit 1 | P1, C10 falha e C11 falha executados | T:233–245 `assert.rejects(review(...), { message: "falha de revisão" })`; T:370–374 `assert.equal(run.stderr, `${leftoverWarning(run.checkout)}\nCode review interrompido: falha de revisão\n`)`, `assert.equal(run.status, 1)` | PASS |
| C5 | aviso exato com caminho da pasta restante | P1 C10 changes_requested e três C11; P3 blocked | T:138–139 define literal `Aviso: a pasta temporária da revisão não foi removida: ${checkout} (EPERM cleanup). Apague-a à mão; o resultado da revisão não muda.`; T:198–200 `assert.deepEqual(stderr.mock.calls.map((call) => call.arguments[0]), [`${leftoverWarning(checkout)}\n`])`; T:355 `assert.equal(run.stderr, `${leftoverWarning(run.checkout)}\n`)`; falha T:370–372 | PASS no HEAD executado; reprodução blocked depende de F1 |
| C6 | limpeza lança após apagar: sem aviso | P1 C10 sem pasta executado | T:216–218 remove pasta antes de lançar; T:223 `assert.equal(existsSync(f.locations[0]), false)`; T:224 `assert.deepEqual(warnings, [])` | PASS |
| C7 | lock ausente em cada desfecho | P1 C10/C11; P3 blocked | T:157–159 ready, T:202–204 changes_requested, T:225 sem pasta, T:247–249 erro, T:356–358 C11 ready/changes_requested/blocked copiado, T:375–377 C11 erro: `assert.equal(existsSync(join(f.cwd, ".git/code-review/issue-7.lock")), false)` | PASS no HEAD executado; reprodução blocked depende de F1 |
| C8 | cinco blobs exatos | P3 e P4 etapa hashes passa; API ERP conferida | P:19–24 constantes exatas AC5; P:35–37 `assert.equal(actual, expected, ...)`; hashes abaixo | PASS |
| C9 | 16 pass/0 fail/0 skip, quatro C10/três C11 | P1, todos os 16 nomes apareceram aprovados | `code-review-escalated.log:5–11`: 4 C10/3 C11; linhas 21,23,24,26: `tests 16`, `pass 16`, `fail 0`, `skipped 0`; definição T:142,177,211,228,335–339,365. Contagem é saída do runner, não uma asserção fictícia do teste | PASS |
| C10 | somente três arquivos core e artefatos da issue | P3/P4 escopo passa; P2 seis casos | P:73 `assert.ok(isAllowed(path), ...)`; P:63–70 allowlist; P:76–78 exige CLI/schema fora do diff. Diff completo contém somente sete arquivos autorizados. `scripts/governance-ci.test.mjs:263–276` afirma matriz e comandos exatos; diff de workflow/config/produto vazio | PASS |
| C11 | relatório/contador preservados e retry reutiliza | P1 C10 ready executado | T:164 `assert.deepEqual(checked.report, report)`; T:165 `assert.deepEqual(await review(f.cwd, f.options, deps), report)`; T:166 `assert.equal(f.calls.length, 1)`; T:170 `assert.equal(state.attempts.length, 1)` | PASS |

## Hashes vinculantes conferidos

| Arquivo em `scripts/code-review/` | Git blob esperado = checkout = referência ERP |
|---|---|
| review.mjs | `c51cff675f6472b9e2ffa02eaa03cd80f3d48dad` |
| review.test.mjs | `6495b4d3d61db91c5896e7efc919880237f4b572` |
| README.md | `711a7161c58ea65dd8dd6a6148d8ef3948d4f2eb` |
| cli.mjs | `c6a4abcd52cf140f64b596136080f36d066b1ee8` |
| schema.json | `b02001e2b10df2e46b244490ee3cf5ae1b410694` |

## Swept existing rechecado contra código

- Validation: `review.mjs:722–724` valida com `validateReport` antes de salvar o relatório; reutilização valida novamente em 688. Continua presente e inalterado.
- Idempotency/retry: fingerprint em 591 e `findLast`/retorno em 684–690; C11 da checklist afirma relatório idêntico, uma execução e uma tentativa.
- Authorization/profile: política validada em 474–488, documentos obrigatórios em 551–564, autenticação em 696 e `authenticateChatGPT` em 267–278. Esses trechos e a configuração não mudam.
- Concurrency/order: lock fica no Git comum em 609–631, adquirido exclusivamente por `openSync(p.lock, "wx")` em 670; `EEXIST` recusa concorrência em 672–675; liberação em 738–740. Política existente preservada.
- Flags/defaults: `parseArgs` começa em 195; CLI/schema e configurações fora do diff. Não há alteração de API/defaults.
- Histórico: `saveState` em 654–656 e tentativas em 697–704 permanecem; a alteração limita-se a capturar erro de cleanup e avisar quando `existsSync(checkout)` em 728–735.

## RED do autor, reporter e limitações

Li integralmente `.checks/code-review/issue-11-builder/red.log`; **não executei RED**. O log registra 7 tests/0 pass/7 fail/0 skipped, `EXIT_CODE=1`; ready/changes_requested propagam EPERM, sem pasta propaga a falha de limpeza, erro original é substituído, stdout CLI fica vazio e stderr CLI traz erro de cleanup. O código anterior no diff chama cleanup sem o catch novo, coerente com os cenários. A cópia RED já removida impede reauditar seus bytes; essa limitação não altera a execução independente GREEN.

Reporter: P3 usa `spawnSync` com stdout pipe e passa no Node 24.21.0. Um probe mínimo separado em scratch rodou também com pipe e com PTY: ambos deram `✔ reporter probe`, `ℹ tests 1`, `ℹ pass 1`, `ℹ fail 0`, exit 0. Não foi constatada dependência de TTY nesta versão instalada. A prova fixa caracteres do reporter sem selecionar explicitamente um reporter (P:128–142); não foi testada outra versão de Node ou opção de reporter. Isso é limite declarado, não um segundo defeito comprovado.

Cleanup e execução do revisor são dublês aprovados no core: os testes exercitam CLI real/motor real com resultados e falhas determinísticas; não há pasta realmente ocupada no Windows nem chamada IA. Não executei CI/Linux/macOS nem testes do doctor: produto/montagem fora do diff e plano dispensa repetição. Nenhum skip ou caso omitido na execução válida. O clone de reprodução foi removido após validação do caminho absoluto dentro do scratch autorizado. Antes de criar este relatório, o original mantinha porcelain vazio e HEAD inalterado.

## Identidade dos logs válidos — SHA256

| Log em `.checks/code-review/issue-11-verifier/` | SHA256 |
|---|---|
| code-review-escalated.log | `03C69C745550CC22261CD38E19A228A245D46AF55CA51F36E56A15C106711189` |
| governance-escalated.log | `DA5F855BA34799EF4A3E7FDC2FED3C0FB65FB1F30EF7F26214ADDA4C28CDB7CF` |
| proof-escalated.log | `C5C5C5DAB03853822B604885345E9BF96F069D08EB4851AC760CC1A79EC29425` |
| proof-fresh-checkout.log | `39FE25098DCEB6774BC8D9A741856DDACF8772D1DC530552296F1C4129F3A627` |

## Gate

FAIL permanece por F1. A aprovação exige correção pelo autor e nova prova na versão corrigida. O core vinculante, a configuração, o workflow e o produto devem preservar seus hashes/escopo. Este relatório pertence exclusivamente ao HEAD indicado; alterações posteriores não herdam silenciosamente seu resultado.
