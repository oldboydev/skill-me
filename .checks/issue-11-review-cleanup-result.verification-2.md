# Issue #11 — Verification

**Verdict**: PASS
**Profile**: light
**Diff range**: `3b6387615aa9233fe89771782fd8e0948042cdac..b193e2bfa1b00fca40c47a9a8a1354ff1a577672`
**Head**: `b193e2bfa1b00fca40c47a9a8a1354ff1a577672`
**Fix range**: `15e32abb24402726c1e814303331a6696f7e6f44..b193e2bfa1b00fca40c47a9a8a1354ff1a577672`
**Round**: 2 — scoped
**Verifier**: sub-agent independente; autor Claude != Verifier Codex
**Resultado**: 11/11 checks comprovados; F1 fechado.

## Escopo e fontes

**Verified at `b193e2bfa1b00fca40c47a9a8a1354ff1a577672`.** Relida a seção de re-verificação de `tlc-implement/references/verify.md`; lido o diff completo da correção, o proof corrigido e o histórico Round1. A correção altera somente `.checks/issue-11-review-cleanup-result.proof.mjs`, `.checks/issue-11-review-cleanup-result.build.md` e acrescenta `.checks/issue-11-review-cleanup-result.verification-1.md`. O histórico é a cópia integral do relatório anterior: ambos tinham blob `c98f30138ef7568a1f4e95249beff191615e3e60` antes de substituir apenas este relatório. Histórico não foi editado pelo Verifier.

**Carried from `15e32abb24402726c1e814303331a6696f7e6f44`.** Intenção, comparação AC1–AC7/checklist/plano, leitura de AGENTS/README/package, ausência de CONTRIBUTING, fonte da issue em `.checks/code-review/issue-11-body.md`, consulta dos blobs ERP e Swept existing: preservados no histórico `.checks/issue-11-review-cleanup-result.verification-1.md`. Task/checklist/issue e fontes de produto não mudaram. Nenhuma contradição ou mudança de decisão foi introduzida pela correção.

**Verified at `b193e2bfa1b00fca40c47a9a8a1354ff1a577672`.** Diff dos cinco arquivos core, scripts de governança, workflow, configuração, produto, testes do produto e package entre os dois heads é vazio. O diff completo base..novo HEAD permanece restrito aos três arquivos core previstos e aos cinco artefatos da issue. O relatório atual é o único untracked inicial, permitido pela allowlist de evidência.

## F1 fechado — reprodução independente

**Verified at `b193e2bfa1b00fca40c47a9a8a1354ff1a577672`.** O novo proof normaliza CRLF somente no texto do teste copiado para scratch (`proof.mjs:112–115`), preservando os arquivos originais e os bytes da CLI/motor/schema. A âncora continua única (`assert.equal(occurrences, 1, ...)`, linha 119), a substituição inclui `["blocked", 2]` (121) e todas as asserções de execução permanecem exatas. O subprocesso declara `--test-reporter=spec` e `--test-reporter-destination=stdout` em 132–133; o formato exigido não fica condicionado ao default do runner ou ao TTY.

Reproduzi com clone Git local independente, sem hardlinks, em `.checks/code-review/issue-11-verifier2/crlf-clone`; configurei `core.autocrlf=true` antes do checkout destacado do novo HEAD. O teste original tem 0 CRLF/887 LF; o teste recém-criado pelo Git tem 887 CRLF/0 LF isolado. A prova passou em ambos: cinco hashes corretos, escopo correto, CLI/motor/schema copiados sem conversão, âncora única, C11 `blocked` realmente executado/aprovado, `tests 1`, `pass 1`, `fail 0`, exit 0. F1 não subsiste.

O clone foi removido somente após validar seu caminho absoluto dentro do scratch autorizado. Logs e contagens permanecem em `.checks/code-review/issue-11-verifier2/`. Original manteve HEAD e arquivos fonte inalterados; antes de escrever Round2, porcelain continuava contendo somente o relatório ownership já presente no início.

## Provas executadas novamente em full

**Verified at `b193e2bfa1b00fca40c47a9a8a1354ff1a577672`.** Windows/Node 24.21.0. Uma invocação por target no novo HEAD, com escalada autorizada para fixtures Git temporárias; sem repetição por teste. A prova adicional em checkout CRLF é a reprodução específica de F1. Não ocorreram bloqueios de infraestrutura nesta rodada.

| ID | Comando | Resultado | Log em `.checks/code-review/issue-11-verifier2/` |
|---|---|---|---|
| P1 | `npm.cmd run test:code-review` | exit 0; 16 tests/16 pass/0 fail/0 skipped/0 cancelled | `code-review.log` |
| P2 | `npm.cmd run test:governance` | exit 0; 6 tests/6 pass/0 fail/0 skipped | `governance.log` |
| P3 | `node .checks/issue-11-review-cleanup-result.proof.mjs` | exit 0; cinco hashes/escopo; blocked 1 pass/0 fail, original LF | `proof-lf.log` |
| P4 | mesmo proof em checkout Git CRLF novo | exit 0; cinco hashes/escopo; blocked 1 pass/0 fail | `proof-crlf.log`, `newlines.log` |

P1 log linhas 5–20 contém, individualmente aprovados:

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

P2 confirmou os seis nomes em linhas 5–10: `governance-C2 filtro de mudanças preserva os caminhos documentais explícitos`; `governance-C2 diff real inclui exclusões, renomes e caminhos com espaços`; `governance-C2 exclusão e renome apenas documentais exigem validação`; `governance-C2 eventos manuais e referências inválidas não dispensam verificação`; `governance-C4 resultado obrigatório recusa falhas, cancelamento e skip inesperado`; `governance-C1 C3 workflow sempre publica CI sem IA nem release`.

P3/P4 confirmaram `C11 comando com limpeza falha imprime o relatório blocked, sai com 2 e avisa a pasta no stderr`, respectivamente `proof-lf.log:25–26` e `proof-crlf.log:24–25`. O proof afirma o nome aprovado e as contagens, evitando filtro sem teste. Não há skips ou omissões nos targets executados.

## Checks e assertions

Os IDs C1–C11 são os checks da entrega. `T` = `scripts/code-review/review.test.mjs`; `P` = `.checks/issue-11-review-cleanup-result.proof.mjs`. Assertions/linhas do core não mudaram; sua inspeção anterior é carregada de `15e32abb24402726c1e814303331a6696f7e6f44`, com execução novamente em full no novo HEAD. As citations do proof tocado foram atualizadas nesta rodada.

| Check | Claim | Proof run no novo HEAD | Assertion e localização | Resultado/origem da análise |
|---|---|---|---|---|
| C1 | ready: stdout completo/exit 0 | P1 C11 ready | T:335–337 `["ready", 0]`; T:349 status; T:350–354 `assert.equal(run.stdout, JSON.stringify(state.attempts[0].report, null, 2) + "\n")`, `assert.equal(run.status, code)` | PASS; carried from 15e32, prova b193 |
| C2 | changes_requested: stdout completo/exit 2 | P1 C11 changes_requested | T:337 `["changes_requested", 2]`; T:349–354 mesmas asserções | PASS; carried from 15e32, prova b193 |
| C3 | blocked: stdout completo/exit 2, prova reproduzível | P3 + P4, 1 pass/0 fail cada | P:115 normalização; P:119 `assert.equal(occurrences, 1, ...)`; P:121 `["blocked", 2]`; T:349–354 status/stdout/exit exatos; P:142 `lines.some((line) => line.startsWith(`✔ ${expectedTestName}`))`; P:145–148 `lines.includes("ℹ tests 1")`, `lines.includes("ℹ pass 1")`, `lines.includes("ℹ fail 0")`, `assert.equal(run.status, 0, ...)` | PASS; verified at b193, F1 fechado |
| C4 | erro original e exit 1 | P1 C10 falha + C11 falha | T:233–245 `assert.rejects(review(...), { message: "falha de revisão" })`; T:370–374 stderr exato com `Code review interrompido: falha de revisão\n`, `assert.equal(run.status, 1)` | PASS; carried from 15e32, prova b193 |
| C5 | aviso exato com caminho | P1 C10/C11 + P3/P4 blocked | T:138–139 literal inteiro de `leftoverWarning(checkout)`; T:198–200 compara stderr com aviso+newline; T:355 `assert.equal(run.stderr, `${leftoverWarning(run.checkout)}\n`)`; T:370–372 combina aviso/erro original | PASS; core carried from 15e32; reprodução blocked verified at b193 |
| C6 | cleanup lança sem pasta: sem aviso | P1 C10 sem pasta | T:223 `assert.equal(existsSync(f.locations[0]), false)`; T:224 `assert.deepEqual(warnings, [])` | PASS; carried from 15e32, prova b193 |
| C7 | ausência lock em todos os desfechos | P1 C10/C11 + P3/P4 blocked | T:157–159 ready; T:202–204 changes_requested; T:225 sem pasta; T:247–249 erro; T:356–358 CLI ready/changes_requested/blocked; T:375–377 CLI erro: `assert.equal(existsSync(join(f.cwd, ".git/code-review/issue-7.lock")), false)` | PASS; core carried from 15e32; bloqueado reprodução verified at b193 |
| C8 | cinco blobs exatos | P3 + P4 | P:19–24 hashes AC5; P:35–37 `assert.equal(actual, expected, ...)`; P:103 cópia direta dos bytes; P:105 `assert.equal(actual, expectedHashes[relPath], ...)` | PASS; verified at b193 |
| C9 | 16 passes/0 falhas/0 skips, 4 C10/3 C11 | P1 todos os nomes confirmados | `code-review.log:5–11` quatro C10/três C11; `:21,23,24,26` tests16/pass16/fail0/skipped0; definições T:142,177,211,228,335–339,365 | PASS; análise carried from 15e32; contagem verified at b193 |
| C10 | só três core e artefatos issue | P3/P4 + P2; diff base..b193 e fix | P:73 `assert.ok(isAllowed(path), ...)`; P:63–70 allowlist; P:76–78 CLI/schema ausentes do diff. Governance test:263–276 matriz/comandos exatos. Diff fix dos diretórios scripts/.github/src/tests e config/package vazio | PASS; verified at b193 |
| C11 | relatório/contador/retry preservados | P1 C10 ready | T:164 `assert.deepEqual(checked.report, report)`; T:165 `assert.deepEqual(await review(f.cwd, f.options, deps), report)`; T:166 `assert.equal(f.calls.length, 1)`; T:170 `assert.equal(state.attempts.length, 1)` | PASS; carried from 15e32, prova b193 |

## Hashes e escopo

**Verified at `b193e2bfa1b00fca40c47a9a8a1354ff1a577672`.** P3/P4 afirmaram os cinco hashes exatos novamente. A comparação com a API ERP vinculante é carried from `15e32abb24402726c1e814303331a6696f7e6f44`, conforme histórico; nenhum core mudou na correção.

| Arquivo em scripts/code-review | Git blob checkout LF/CRLF = AC5 |
|---|---|
| review.mjs | `c51cff675f6472b9e2ffa02eaa03cd80f3d48dad` |
| review.test.mjs | `6495b4d3d61db91c5896e7efc919880237f4b572` |
| README.md | `711a7161c58ea65dd8dd6a6148d8ef3948d4f2eb` |
| cli.mjs | `c6a4abcd52cf140f64b596136080f36d066b1ee8` |
| schema.json | `b02001e2b10df2e46b244490ee3cf5ae1b410694` |

## Swept, rigor e limitações

**Carried from `15e32abb24402726c1e814303331a6696f7e6f44`.** Swept existing rechecado Round1: validação antes de guardar (`review.mjs:722–724`, reutilização688); fingerprint591/findLast684–690; autenticação/perfil267–278/474–488/551–564/696; lock comum609–631/openSync670/EEXIST672–675/liberação738–740; parseArgs195/defaults/configuração; histórico654–656/697–704. Nada foi tocado pela correção.

**Verified at `b193e2bfa1b00fca40c47a9a8a1354ff1a577672`.** Perfil light: sem Coverage join, fault injection ou Test policy verdicts obrigatórios; não executados. Sem UI vinculante e sem Test policy adicional. A mudança não cria decisões ou amplia escopo. Reporter explicitamente fixado no subprocesso corrigido; execução em pipe passou nos dois formatos. A CLI/motor/schema não foram alterados para contornar a prova.

**Carried from `15e32abb24402726c1e814303331a6696f7e6f44`.** RED original do autor foi lido, não executado pelo Verifier (7 falhas na implementação anterior). O RED independente de F1 foi realmente executado pelo Verifier na Round1 e preservado. As provas usam dublês determinísticos de cleanup/execute; não executam IA nem pasta ocupada real. Sem Linux/macOS/CI ou doctor nesta verificação; o produto/montagem estão fora do diff. Essas limitações permanecem declaradas, sem skips artificiais ou enfraquecimento das assertions.

## SHA256 dos logs novos

**Verified at `b193e2bfa1b00fca40c47a9a8a1354ff1a577672`.** Diretório `.checks/code-review/issue-11-verifier2/`:

| Log | SHA256 |
|---|---|
| code-review.log | `BB48F35A31EFFDCA49E8E2B4145001B3EE5CC5117D78BE5D8B5FD639CDAC3ECC` |
| governance.log | `76C939CAD806F7241A71E29808A1F3A49E3920A7DEC158167C4B9D010ED4E0EA` |
| proof-lf.log | `EAC2CD61FF5DB98E2B39D47D24AEDE0B69F0EEB7BEF220B4A231008B8D80BC33` |
| proof-crlf.log | `BD813AD01D1BD25683509478D626A554EBBBA4822DDDF0ADF89FD5B4ECE0ED15` |
| newlines.log | `890EFA96604C1BCD15F59D1629711E2DF331D6D9AB4940F9C496D69387884270` |

## Gate

PASS no HEAD indicado: 11/11 checks, nenhuma lacuna bloqueante; F1 fechado. Esta aprovação encerra a etapa Verifier. Não autoriza merge nem substitui a revisão formal automática do coordenador. Não foi feita nova rodada para acumular aprovações. Apenas o relatório ownership foi escrito pelo Verifier; fontes e histórico preservados.
