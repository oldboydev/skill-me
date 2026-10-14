# Issue #11 — build

## Origem e autor

- Fonte vinculante: `oldboydev/3dprintingerp@781ca4c5b357c6798e50a2956e61b3c7d6c7d43d`.
  Os cinco blobs de referência foram obtidos pela API GitHub antes desta implementação
  e ficam em `.checks/code-review/issue-11-upstream/` (não versionado).
- Implementador: Claude (Sonnet 5), conforme `AGENTS.md` (`tlc-implement`, profile light).
  Codex é o revisor independente; não implementa correções.

## RED — motor anterior (antes da cópia)

Comando: `node --test --test-name-pattern='^C10|^C11'` contra uma cópia temporária
isolada em `.checks/code-review/issue-11-red-tmp/` (removida após a prova, nunca
commitada): `review.mjs`, `cli.mjs`, `schema.json` do checkout **antes** da cópia
(motor antigo) + `review.test.mjs` da referência nova. O checkout principal não foi
tocado para gerar este resultado.

Resultado: `tests 7`, `pass 0`, `fail 7`, exit code 1. Os sete casos novos falharam,
cada um por uma causa distinta ligada ao defeito da issue:

- `C10 ... devolve o relatório ready ...` — `Error: EPERM cleanup` propaga sem try/catch.
- `C10 ... changes_requested ...` — mesma propagação.
- `C10 ... não deixa a pasta ...` — `Error: Command failed: git worktree remove`.
- `C10 revisão falha seguida de falha de limpeza ...` — erro reportado é o da limpeza
  (`EPERM cleanup`) em vez do erro original da revisão (`falha de revisão`).
- `C11 ... ready ...` — stdout vazio (relatório perdido) em vez do JSON completo.
- `C11 ... changes_requested ...` — mesmo problema.
- `C11 comando com revisão falha e limpeza falha ...` — stderr sem o aviso da pasta
  remanescente e com a mensagem de erro trocada.

## GREEN — motor novo

Copiados byte a byte de `.checks/code-review/issue-11-upstream/` para
`scripts/code-review/`: `review.mjs`, `review.test.mjs`, `README.md`.
`cli.mjs` e `schema.json` permanecem intocados.

Hashes (`git hash-object`) conferidos iguais a AC5 para os cinco arquivos:

- `review.mjs=c51cff675f6472b9e2ffa02eaa03cd80f3d48dad`
- `review.test.mjs=6495b4d3d61db91c5896e7efc919880237f4b572`
- `README.md=711a7161c58ea65dd8dd6a6148d8ef3948d4f2eb`
- `cli.mjs=c6a4abcd52cf140f64b596136080f36d066b1ee8` (inalterado)
- `schema.json=b02001e2b10df2e46b244490ee3cf5ae1b410694` (inalterado)

## Comandos realmente executados

1. `node --test --test-name-pattern='^C10|^C11' <cópia RED temporária>` → RED, exit 1.
2. Cópia byte a byte dos três arquivos da referência para `scripts/code-review/`.
3. `npm.cmd run test:code-review` → 16 tests, 16 pass, 0 fail, 0 skip, exit 0
   (quatro C10 + três C11 + C1–C9 existentes).
4. `node .checks/issue-11-review-cleanup-result.proof.mjs` → exit 0: cinco hashes AC5
   conferidos, escopo restrito à allowlist (diff contra a base `3b6387615aa9233fe89771782fd8e0948042cdac`
   + untracked, excluindo ignorados), caso complementar `blocked`
   com 1 pass / 0 fail e nome do teste confirmado. Reexecutado duas vezes com o mesmo
   resultado e sem pasta temporária remanescente.
5. `npm.cmd run test:governance` → 6 tests, 6 pass, 0 fail, 0 skip, exit 0.

`npm.cmd run test:code-review` e `npm.cmd run test:governance` rodaram duas vezes cada
nesta implementação (`green-*.log` e `final-*.log`), com a mesma contagem nas duas
execuções: 16 tests/16 pass/0 fail/0 skip para o core e 6 tests/6 pass/0 fail/0 skip
para a governança. Nenhum dos dois comandos mudou após a Rodada 1; a Rodada 2 (abaixo)
não os repete.

Logs completos (não versionados, cobertos por `.gitignore`):
`.checks/code-review/issue-11-builder/{red.log,green-code-review.log,green-governance.log,final-code-review.log,final-governance.log,proof-rerun.log}`.

## Rodada 2 — achado de verificação independente: reprodutibilidade de newline no proof.mjs

Achado (Round1 FAIL, verificação independente): `proof.mjs` lia `review.test.mjs` com
`readFileSync(..., "utf8")` e procurava a âncora da tabela C11 usando quebras `\n`
literais. O blob commitado é LF-only, mas um checkout novo com `core.autocrlf=true`
(comum em Windows) converte o arquivo para CRLF na working tree. Nesse checkout os
cinco hashes, a cópia dos três arquivos do core e o diff de escopo continuavam
passando, mas `occurrences` da âncora caía para `0`, a asserção da linha 116
("A âncora da tabela C11 deve aparecer exatamente uma vez.") lançava
`AssertionError` não tratada, o processo saía com código 1, e o caso `blocked` nunca
chegava a ser executado — regressão de reprodutibilidade, não do motor nem da
suíte oficial de 16 casos (core e governança, que não mudaram nesta rodada).

### REPRO RED — CRLF, antes do patch

Sem alterar nenhum arquivo original: `git clone -c core.autocrlf=true --no-hardlinks . <tmp>`
a partir do HEAD atual (commit `15e32ab`, que já contém o `proof.mjs` sem o patch desta
rodada), em `.checks/code-review/issue-11-builder-fix/red-crlf-clone/` (removida após
validar a prova; log preservado). Confirmado antes de rodar: `review.test.mjs` na cópia
tem 887 quebras CRLF e 0 LF puro (contado por codepoint), contra 0 CRLF / 887 LF no blob
do HEAD. Executando o `proof.mjs` não corrigido dessa cópia:

```
AssertionError [ERR_ASSERTION]: A âncora da tabela C11 deve aparecer exatamente uma vez.
0 !== 1
```

Resultado: exit 1, `occurrences=0`, caso `blocked` não executado — mesma falha já
registrada pelo Verifier em `.checks/code-review/issue-11-verifier/proof-fresh-checkout.log`
(não editado por esta correção). Log desta reprodução independente:
`.checks/code-review/issue-11-builder-fix/red-crlf-proof.log` (exit em
`red-crlf-proof.exit`).

### FIX — normaliza só o texto copiado ao scratch, âncora e asserções preservadas

Patch restrito aos dois arquivos de ownership desta correção:

- `proof.mjs`: o texto lido de `review.test.mjs` passa por
  `.replace(/\r\n/g, "\n")` antes da busca da âncora — only no texto copiado para o
  scratch, sem escrever de volta no arquivo original nem no checkout. A âncora, a
  substituição e as asserções de `occurrences`, `tests 1`/`pass 1`/`fail 0` e `status 0`
  continuam exatamente as mesmas do C11 aprovado; nenhuma foi relaxada.
- `proof.mjs`: o subprocesso `node --test` do caso `blocked` passa a declarar
  `--test-reporter=spec --test-reporter-destination=stdout` explicitamente, fixando o
  formato (`✔ nome`, `ℹ tests/pass/fail`) que o script já exigia implicitamente das
  asserções de string, sem mudar nenhum critério de aprovação.
- Este arquivo (`build.md`): corrige a quebra de linha acidental do hash da base dentro
  do bloco de código e documenta esta rodada.

### GREEN — original (LF) e cópia Git CRLF (proof corrigido, core intocado)

1. Checkout original (arquivo de teste copiado em LF; configuração Git inalterada): `node .checks/issue-11-review-cleanup-result.proof.mjs`
   → exit 0, caso `blocked` com `tests 1`/`pass 1`/`fail 0`. Log:
   `.checks/code-review/issue-11-builder-fix/green-original-lf-proof.log`.
2. Mesma cópia `red-crlf-clone` (CRLF confirmado), só com o `proof.mjs` corrigido
   copiado por cima (core — `review.mjs`, `review.test.mjs`, `cli.mjs`, `schema.json`,
   `README.md` — sem tocar; hashes reconferidos iguais a AC5 antes de rodar):
   `node <clone>/.checks/issue-11-review-cleanup-result.proof.mjs` → exit 0, mesmo caso
   `blocked` com `tests 1`/`pass 1`/`fail 0`. Log:
   `.checks/code-review/issue-11-builder-fix/green-crlf-clone-proof.log`.

Logs completos desta rodada (não versionados, cobertos por `.gitignore`):
`.checks/code-review/issue-11-builder-fix/{red-crlf-proof.log,red-crlf-proof.exit,green-original-lf-proof.log,green-original-lf-proof.exit,green-crlf-clone-proof.log,green-crlf-clone-proof.exit}`.

Esta rodada não repetiu `npm run test:code-review` nem `npm run test:governance`:
os dois já estavam aprovados (16/16/0/0 e 6/6/0/0, cada um confirmado duas vezes na
Rodada 1, ver seção acima) e nenhum dos dois arquivos de ownership desta correção os afeta.

## Rodada 3 — revisão formal 1, F2: cópia conferida por configuração Git externa

Origem: revisão formal 1 (`changes_requested`, perfil light, tentativa 1 de 2) sobre o head
`77c442fe8b583ac5a409b58e5fa63a32c1d483e1`, registrada em
`.checks/issue-11-review-cleanup-result.review-1.md`. Implementador desta rodada: Claude
(Opus 5.5). Esta rodada não afirma PASS formal nem do Verifier: a nova verificação
independente e a segunda revisão formal são coordenadas pelo Codex.

Achado F2: `proof.mjs:105` conferia a cópia de `review.mjs`, `cli.mjs` e `schema.json`
com `git hash-object` dentro do scratch. O scratch não é repositório Git e perde o
`core.autocrlf=true` local; com global/sistema ausentes ou false, o hash ali é o dos bytes
CRLF, a cópia byte-idêntica é rejeitada e o caso `blocked` não executa. A Rodada 2 não
detectou o caso porque, nesta máquina, `core.autocrlf=true` vem do gitconfig de sistema
(`C:/Program Files/Git/etc/gitconfig`; o checkout principal não tem valor local nem
global), e a configuração de sistema também vale fora de um repositório.

### REPRO RED — autocrlf=true só local, global/sistema neutralizados

Nenhum arquivo de configuração Git do proprietário ou do repositório principal foi
alterado. Só os subprocessos Git/Node receberam no env `GIT_CONFIG_GLOBAL=<arquivo vazio
temporário>` e `GIT_CONFIG_NOSYSTEM=1`.

1. `git clone --no-checkout --no-hardlinks <repo> .checks/code-review/issue-11-builder-fix2/mixed-config-clone`.
2. `git -C <clone> config --local core.autocrlf true`. Com o env neutralizado,
   `git config --show-origin --show-scope --list` no clone mostra só o escopo local
   (`file:.git/config`, `core.autocrlf=true`); a lista global sai vazia.
3. `git -C <clone> checkout --detach 77c442fe8b583ac5a409b58e5fa63a32c1d483e1` → status
   limpo e checkout CRLF (`review.mjs` 825 CRLF/0 LF puro, `review.test.mjs` 887/0,
   `README.md` 48/0, `cli.mjs` 19/0, `schema.json` 123/0). Os cinco `git hash-object` no
   contexto do clone ficam iguais a AC5.
4. `node <clone>/.checks/issue-11-review-cleanup-result.proof.mjs` (proof antigo do HEAD,
   blob `a2b0755f125cbdaf2673dd224a7a2ccf32fee3b9`):

```
AssertionError [ERR_ASSERTION]: Cópia de review.mjs divergiu do checkout.
+ 'bdb7fa539c36136630a6274796c833beddde212d'
- 'c51cff675f6472b9e2ffa02eaa03cd80f3d48dad'
```

Resultado: C8 (cinco hashes) e C10 (escopo) passam; C3 aborta na linha 105 com exit 1,
sem chegar à âncora nem ao caso `blocked`. `bdb7fa53…` é o
`git hash-object --no-filters` dos bytes CRLF de `review.mjs` no clone, o mesmo valor que
a revisão apontou para autocrlf=false.

### FIX — identidade da cópia por bytes exatos

Patch restrito ao laço de cópia do C3 em `proof.mjs`:

- Cada arquivo é lido do checkout, escrito no scratch e relido; `assert.deepEqual`
  (strict) compara byte a byte o buffer de destino com o de origem. O log passa a dizer
  `OK cópia <arquivo>: <n> bytes idênticos ao original.`, sem atribuir ao scratch um hash Git.
- O hash AC5 de cada fonte continua conferido somente no contexto do repositório (C8,
  inalterado). Motor, CLI e schema não são normalizados; a normalização CRLF->LF continua
  apenas no texto do teste copiado (Rodada 2). Âncora única, substituição, reporter `spec`
  explícito, asserções `tests 1`/`pass 1`/`fail 0`/`status 0` e o teste C11 (stdout, stderr,
  exits) ficam inalterados.
- A comparação de bytes não enfraquece a prova: com autocrlf=true, o hash anterior aceitaria
  uma cópia que diferisse só em CRLF/LF; a comparação de buffers rejeita essa diferença.
  Uma sonda isolada mostrou que `assert.deepEqual` aceita buffers idênticos (LF e CRLF)
  e rejeita CRLF vs LF, LF vs CRLF, 1 byte trocado e 1 byte a menos
  (`byte-compare-probe.log`).

### GREEN — original e clone de configuração mista

1. Checkout original com a configuração Git inalterada (autocrlf=true de sistema;
   `review.mjs`/`review.test.mjs`/`README.md` em LF, `cli.mjs`/`schema.json` em CRLF):
   `node .checks/issue-11-review-cleanup-result.proof.mjs` → exit 0. Cinco hashes AC5;
   escopo OK (inclui `review-1.md` não rastreado, coberto pelo prefixo); cópias com
   `review.mjs` 27526, `cli.mjs` 747 e `schema.json` 2698 bytes idênticos; `blocked` com
   `tests 1`/`pass 1`/`fail 0`.
2. Mesmo clone, com o mesmo env neutralizado e apenas o `proof.mjs` corrigido copiado
   (bytes idênticos ao original; `git status` do clone mostra só ele modificado; core
   em CRLF e com hashes AC5) → exit 0. Cinco hashes AC5; escopo OK; cópias com
   `review.mjs` 28351, `cli.mjs` 747 e `schema.json` 2698 bytes idênticos; `blocked` com
   `tests 1`/`pass 1`/`fail 0`.

Ao final, o clone e o arquivo global vazio foram removidos depois da validação de caminho,
toplevel, remote, HEAD e tamanho (`cleanup.log`). Nenhuma pasta
`skill-me-issue11-proof-*` sobrou depois das execuções, e nenhum estado de revisão foi tocado.

Logs (não versionados, cobertos por `.gitignore`):
`.checks/code-review/issue-11-builder-fix2/{red-setup.log,red-mixed-config-proof.log,red-mixed-config-proof.exit,byte-compare-probe.log,green-original-proof.log,green-original-proof.exit,green-mixed-config-setup.log,green-mixed-config-proof.log,green-mixed-config-proof.exit,cleanup.log}`.

Esta rodada não repetiu `npm run test:code-review` nem `npm run test:governance`:
core, governança e configuração não mudaram; a alteração se limita à prova complementar.

## Limitações

- `deps.cleanup` (falha de limpeza) e `deps.execute` (resultado do revisor) são dublês
  de teste tanto na suíte oficial (C10/C11) quanto na prova complementar; nenhuma pasta
  ocupada real do Windows nem chamada de IA/Codex foi executada nestes testes.
- Perfil light: sem injeção de falha adicional além da já presente no core aprovado;
  a prova RED é uma regressão contra o motor anterior, não uma mutação artificial do novo.
- O caso `blocked` da tabela C11 só existe na prova complementar de `.checks/`, em cópia
  de teste isolada com core byte-idêntico ao checkout; a suíte oficial de 16 casos
  herdada do ERP continua cobrindo só `ready`/`changes_requested` na CLI, sem alteração.
- Prova e testes rodaram apenas nesta plataforma Windows; não há execução de CI nem de
  outra plataforma nesta etapa de build — a CI existente do repositório cobre as plataformas
  declaradas.
- Rodada 2: a reprodução RED/GREEN usa um clone Git local (`file://` implícito via
  caminho local) com `core.autocrlf=true`, não uma pasta ocupada real nem um ambiente
  CI distinto; cobre o cenário de newline relatado, não outras causas hipotéticas de
  falha de checkout.
- Rodada 3: a neutralização de global/sistema valeu só no env dos subprocessos, com
  Git for Windows 2.50.0 e Node 24.21.0. A prova cobre a combinação apontada pela revisão
  (autocrlf=true só local, global/sistema ausentes); outras combinações, como
  `.gitattributes` com `eol` ou `core.autocrlf=input`, não foram executadas.
