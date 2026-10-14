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
