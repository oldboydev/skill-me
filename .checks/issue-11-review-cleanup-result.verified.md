# Issue #11 — Verification

**Verdict**: PASS
**Profile**: light
**Diff range**: `3b6387615aa9233fe89771782fd8e0948042cdac..392398b2d0de086c87d7284cbdbdac262013bb42`
**Head**: `392398b2d0de086c87d7284cbdbdac262013bb42`
**Fix range**: `77c442fe8b583ac5a409b58e5fa63a32c1d483e1..392398b2d0de086c87d7284cbdbdac262013bb42`
**Round**: 3 — scoped
**Verifier**: independente; autor Claude != Verifier Codex
**Resultado**: 11/11 checks comprovados; F1 continua fechado, F2 fechado.

## Escopo e origem das conclusões

**Verified at `392398b2d0de086c87d7284cbdbdac262013bb42`.** Lidos o registro formal `.checks/issue-11-review-cleanup-result.review-1.md`, todo o diff da correção, seção de re-verificação de `tlc-implement/references/verify.md`, código do proof tocado e evidência RED de F2 do autor. A correção altera somente proof/build e acrescenta os registros formal1 e Verifier2. Todos os arquivos core, governança, configuração, produto e critérios permanecem idênticos ao HEAD da Round2.

**Carried from `b193e2bfa1b00fca40c47a9a8a1354ff1a577672`.** Comparação intenção/AC1–AC7/plano/checklist, regras AGENTS, ausência de CONTRIBUTING, issue exportada em `.checks/code-review/issue-11-body.md`, consulta da fonte ERP e Swept existing, preservados integralmente em `.checks/issue-11-review-cleanup-result.verification-2.md`. Esse registro carrega explicitamente as inspeções Round1 em `15e32abb24402726c1e814303331a6696f7e6f44`. Fontes e critérios inalterados; nenhuma decisão nova ou contradição introduzida.

**Verified at `392398b2d0de086c87d7284cbdbdac262013bb42`.** Antes de substituir este relatório, o PASS Round2 e `.verification-2.md` tinham o mesmo blob `38997c82964707fb71e37a990b50fb4ccef68d7e`. Históricos Round1/2 e formal1 não foram editados. Porcelain inicial/final antes do relatório vazio; HEAD preservado. Somente este relatório ownership foi escrito pelo Verifier, além de scratch/logs ignorados autorizados. Sem subagentes, alterações de fontes, commits, push, PR ou merge.

## F2 fechado; F1 preservado

**Verified at `392398b2d0de086c87d7284cbdbdac262013bb42`.** F2 era a rejeição de uma cópia CRLF byte-idêntica porque `git hash-object` no scratch perdia `core.autocrlf=true` local. A correção lê o buffer original (`proof.mjs:107`), escreve-o diretamente (108), relê a cópia e compara exatamente com `assert.deepEqual` de `node:assert/strict` (109). Não há normalização de motor/CLI/schema; a comparação deixa de depender de Git no scratch. Os cinco hashes AC5 continuam obrigatórios no contexto `repoRoot` (19–37).

Reprodução independente específica de F2: criei clone Git NOVO, sem hardlinks/checkout inicial, em `.checks/code-review/issue-11-verifier3/local-only-crlf-clone`. Configurei `core.autocrlf=true` somente no `.git/config` desse clone; global direcionado a arquivo vazio temporário e `GIT_CONFIG_NOSYSTEM=1` somente no ambiente dos subprocessos, restaurado no final. Nenhuma configuração de usuário ou do repo principal foi escrita. O log de configuração confirma `local file:.git/config true`, zero entradas globais e sistema neutralizado. Checkout destacado do HEAD atual produziu:

| Fonte do clone | Bytes | CRLF | LF isolado |
|---|---:|---:|---:|
| review.mjs | 28351 | 825 | 0 |
| review.test.mjs | 28448 | 887 | 0 |
| cli.mjs | 747 | 19 | 0 |
| schema.json | 2698 | 123 | 0 |

Executei o proof nesse clone sob esse mesmo ambiente. Cinco hashes AC5/escopo passaram; a asserção estrita de buffers executou para todas as três cópias e confirmou 28351/747/2698 bytes idênticos aos respectivos originais. A âncora passou e o C11 blocked executou com 1 pass/0 fail/exit 0. No repo original com configuração intacta, também passou, comparando 27526/747/2698 bytes das cópias. Isto comprova o cenário que a configuração anterior do sistema ocultava; não reutilizei o clone da Round2.

F1 segue fechado: o teste CRLF continua normalizado somente no texto copiado (P:116–119); `assert.equal(occurrences, 1, ...)` continua em 123; `["blocked", 2]` em 125. Reporter `spec` e destino `stdout` explícitos em 136–137; nome/contagens/status exatos em 146–152. CLI/motor/schema e assertions C11 não mudaram. A nova execução em CRLF passou essas condições novamente.

Clone e arquivo global vazio foram removidos após verificar caminho absoluto, nomes e tamanho zero dentro do scratch autorizado; logs foram preservados.

## Execuções completas no novo HEAD

**Verified at `392398b2d0de086c87d7284cbdbdac262013bb42`.** Windows, Node 24.21.0. Cada target invocado uma vez com escalada autorizada para fixtures Git; sem bloqueio de infraestrutura ou repetição por caso. Execução adicional do proof no clone é a reprodução direcionada de F2.

| ID | Target | Resultado | Log em `.checks/code-review/issue-11-verifier3/` |
|---|---|---|---|
| P1 | `npm.cmd run test:code-review` | exit 0; 16 tests/16 pass/0 fail/0 skipped/0 cancelled | `code-review.log` |
| P2 | `npm.cmd run test:governance` | exit 0; 6 tests/6 pass/0 fail/0 skipped | `governance.log` |
| P3 | `node .checks/issue-11-review-cleanup-result.proof.mjs`, original | exit 0; hashes/escopo/buffers; blocked 1 pass/0 fail | `proof-original.log` |
| P4 | mesmo proof, clone CRLF local-only | exit 0; hashes/escopo/buffers; blocked 1 pass/0 fail | `proof-local-only-crlf.log`, `config-isolation.log`, `newlines.log` |

P1 registra individualmente, aprovados, os quatro C10 e três C11 em linhas 5–11:

- C10 falha de limpeza devolve o relatório ready, libera lock e preserva aprovação e contador
- C10 falha de limpeza devolve o relatório changes_requested e avisa a pasta no stderr
- C10 falha de limpeza que não deixa a pasta devolve o relatório e não avisa
- C10 revisão falha seguida de falha de limpeza mostra o erro da revisão e libera lock
- C11 comando com limpeza falha imprime o relatório ready, sai com 0 e avisa a pasta no stderr
- C11 comando com limpeza falha imprime o relatório changes_requested, sai com 2 e avisa a pasta no stderr
- C11 comando com revisão falha e limpeza falha escreve o erro da revisão e sai com 1

Também executados/aprovados os nove casos anteriores, em P1 linhas 12–20: `C1 relatório contraditório, incompleto ou não comprovado nunca libera`; `C2 contexto ausente, árvore suja, caminho externo e issue errada são recusados`; `C3 revisão isolada entrega contexto e remove checkout sem tocar original`; `C4 erro técnico, saída inválida e mutação não produzem aprovação`; `C5 revisão repetida reutiliza resultado e alterações invalidam o gate`; `C6 limite de rodadas e exclusão mútua impedem chamadas adicionais`; `C7 abertura exige revisão atual e cabeça remota igual, com resumo no corpo`; `C8 raia direta dispensa task e evidência, perfil normal exige ambas`; `C9 argumentos estritos e launcher Windows sem shell ou API key`.

P2 executou/aprovou os seis nomes em linhas 5–10: `governance-C2 filtro de mudanças preserva os caminhos documentais explícitos`; `governance-C2 diff real inclui exclusões, renomes e caminhos com espaços`; `governance-C2 exclusão e renome apenas documentais exigem validação`; `governance-C2 eventos manuais e referências inválidas não dispensam verificação`; `governance-C4 resultado obrigatório recusa falhas, cancelamento e skip inesperado`; `governance-C1 C3 workflow sempre publica CI sem IA nem release`.

P3/P4 executaram/aprovaram `C11 comando com limpeza falha imprime o relatório blocked, sai com 2 e avisa a pasta no stderr`. O proof afirma nome aprovado, tests1/pass1/fail0 e status0; filtro sem teste não passa. Nenhum skip/omissão nas execuções.

## Checks — citations atualizadas e carry explícito

`T` = `scripts/code-review/review.test.mjs`; `P` = `.checks/issue-11-review-cleanup-result.proof.mjs`. A análise de assertions core é **carried from `b193e2bfa1b00fca40c47a9a8a1354ff1a577672`**, histórico Round2, com provas completas executadas no HEAD atual. Citações P do arquivo alterado foram localizadas de novo; C3/C7/C8/C10 e reprodução blocked foram verificados nesta rodada.

| Check | Claim | Proof run atual | Assertion específica / localização | Resultado |
|---|---|---|---|---|
| C1 | ready: stdout completo/exit0 | P1 C11 ready | T:335–337 `["ready", 0]`; T:349 status; T:350–354 `assert.equal(run.stdout, JSON.stringify(state.attempts[0].report, null, 2) + "\n")`, `assert.equal(run.status, code)` | PASS; análise carried from b193 |
| C2 | changes_requested: stdout completo/exit2 | P1 C11 changes_requested | T:337 `["changes_requested", 2]`; T:349–354 mesmas assertions | PASS; análise carried from b193 |
| C3 | blocked: stdout completo/exit2/prova reproduzível/core byte-idêntico | P3/P4 1pass/0fail cada | P:109 ``assert.deepEqual(readFileSync(destPath), original, `Cópia de ${destName} divergiu do original.`)``; P:123 `assert.equal(occurrences, 1, ...)`; P:125 `["blocked", 2]`; T:349–354 status/stdout/exit; P:146 nome aprovado, P:149–152 `lines.includes("ℹ tests 1")`, `lines.includes("ℹ pass 1")`, `lines.includes("ℹ fail 0")`, `assert.equal(run.status, 0, ...)` | PASS; verified at 392398b |
| C4 | erro original/exit1 | P1 C10+C11 erro | T:233–245 `assert.rejects(review(...), { message: "falha de revisão" })`; T:370–374 stderr exato com `Code review interrompido: falha de revisão\n`, `assert.equal(run.status, 1)` | PASS; análise carried from b193 |
| C5 | aviso exato com caminho | P1 C10/C11 + P3/P4 blocked | T:138–139 literal completo `leftoverWarning`; T:198–200 lista stderr exata; T:355 ``assert.equal(run.stderr, `${leftoverWarning(run.checkout)}\n`)``; T:370–372 aviso+erro original | PASS; core carried from b193, blocked verified at 392398b |
| C6 | cleanup lança sem pasta: sem aviso | P1 C10 sem pasta | T:223 `assert.equal(existsSync(f.locations[0]), false)`; T:224 `assert.deepEqual(warnings, [])` | PASS; análise carried from b193 |
| C7 | lock ausente em todos os desfechos | P1 C10/C11 + P3/P4 blocked | T:157–159/202–204/225/247–249/356–358/375–377 `assert.equal(existsSync(join(f.cwd, ".git/code-review/issue-7.lock")), false)`; caso copiado blocked preserva T:356–358, execução confirmada por P:146–152 | PASS; blocked verified at 392398b |
| C8 | cinco blobs AC5 e cópias estritamente idênticas | P3/P4 | P:19–24 hashes fixos, P:35–37 `assert.equal(actual, expected, ...)` no repoRoot; P:107–109 leitura/escrita/buffer read-back estrito, sem normalização de fontes | PASS; verified at 392398b |
| C9 | 16pass/0fail/0skip,4C10/3C11 | P1 todos os casos nomeados | `code-review.log:5–11` quatro C10/três C11; `:21,23,24,26` tests16/pass16/fail0/skipped0; definições T:142/177/211/228/335–339/365 | PASS; contagem verified at 392398b |
| C10 | só três core e artefatos da issue | P3/P4 + P2 + diff | P:73 `assert.ok(isAllowed(path), ...)`, P:63–70 allowlist; P:76–78 CLI/schema fora do diff. Diff b193..392 vazio para scripts/.github/src/tests/config/package/task/checklist. Governance test:263–276 matriz/comandos exatos | PASS; verified at 392398b |
| C11 | relatório/contador/retry preservados | P1 C10 ready | T:164 `assert.deepEqual(checked.report, report)`; T:165 `assert.deepEqual(await review(f.cwd, f.options, deps), report)`; T:166 `assert.equal(f.calls.length, 1)`; T:170 `assert.equal(state.attempts.length, 1)` | PASS; análise carried from b193 |

## Hashes vinculantes

**Verified at `392398b2d0de086c87d7284cbdbdac262013bb42`.** P3/P4 repetiram hashes das cinco fontes no contexto do repo, preservando AC5 mesmo com CRLF/local-only. Comparação upstream ERP carried from b193 via histórico Round2/Round1.

| Arquivo core | Hash Git = AC5 |
|---|---|
| review.mjs | `c51cff675f6472b9e2ffa02eaa03cd80f3d48dad` |
| review.test.mjs | `6495b4d3d61db91c5896e7efc919880237f4b572` |
| README.md | `711a7161c58ea65dd8dd6a6148d8ef3948d4f2eb` |
| cli.mjs | `c6a4abcd52cf140f64b596136080f36d066b1ee8` |
| schema.json | `b02001e2b10df2e46b244490ee3cf5ae1b410694` |

## Swept, RED e limitações

**Carried from `b193e2bfa1b00fca40c47a9a8a1354ff1a577672`.** Swept existing: validateReport antes de guardar722–724/reutilização688; fingerprint591/findLast684–690; auth/perfil267–278/474–488/551–564/696; lock Git comum609–631/openSync670/EEXIST672–675/liberação738–740; parseArgs195; histórico654–656/697–704. Os trechos permanecem intocados. Nenhuma necessidade de reinspecionar domínio/produto nesta correção da prova.

**Verified at `392398b2d0de086c87d7284cbdbdac262013bb42`.** Perfil light sem Coverage join, Test policy verdicts ou fault injection obrigatórios: não executados. Sem fonte UI vinculante ou Test policy adicional. Comparação estrita dos buffers foi realmente executada pelo proof em P3/P4. Não executei a sonda de buffers mutados do autor, nem o RED F2; li seu `red-mixed-config-proof.log`, que registra rejeição do hash CRLF `bdb7fa539c36136630a6274796c833beddde212d` contra AC5 e interrompe antes de blocked. Não atribuo essa execução a mim. O RED F1 independente executado Round1 e os REDs do autor permanecem nos históricos, sem reescrita.

As provas usam dublês determinísticos de cleanup/execute; não testam pasta realmente ocupada nem IA. Sem Linux/macOS/CI/doctor nesta verificação; produto/montagem sem mudança. A reprodução atual cobre CRLF com autocrlf localtrue/global-sistema neutralizados; não foram executadas outras combinações eol/.gitattributes/autocrlf=input. Não houve enfraquecimento de assertions, aumento de teto ou nova rodada para acumular aprovação.

## SHA256 dos logs atuais

**Verified at `392398b2d0de086c87d7284cbdbdac262013bb42`.** Diretório `.checks/code-review/issue-11-verifier3/`:

| Log | SHA256 |
|---|---|
| code-review.log | `8ED0AD5FAC6E689F2F132E3E0D42D1EF79888CB0C56FBBEFAFC8E7EC46107CAF` |
| governance.log | `74FD0DB23047246A9FE1B9A4BAF6979F904A136C49DB20D83660813CDAA7D3A3` |
| proof-original.log | `BFF2013CF5732742CA2107E9BD29F699E1F6B4C18D2236F77BC29648D950B8F7` |
| proof-local-only-crlf.log | `BEC64ADE7830C0C70842BC33D1C420D73A425AB9883CAAEF5981AE176F2EEA50` |
| config-isolation.log | `2577637342D7C5322E716155531B5A717F4478D156E5FF560A0A547A083161DF` |
| newlines.log | `A3E05BEAA7BA3743E0E994262D9A0855E44F769FE4109F9BB6935F0142C8AAC2` |

## Gate

PASS no HEAD indicado, 11/11 checks; F1 e F2 fechados. Terceira rodada independente encerrada. A segunda revisão formal permanece com o coordenador; este PASS não substitui essa etapa nem autoriza merge. Históricos e limite preservados.
