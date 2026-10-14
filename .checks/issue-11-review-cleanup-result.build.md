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
   conferidos, escopo restrito à allowlist (diff contra a base `3b6387615aa9233fe8977
   1782fd8e0948042cdac` + untracked, excluindo ignorados), caso complementar `blocked`
   com 1 pass / 0 fail e nome do teste confirmado. Reexecutado duas vezes com o mesmo
   resultado e sem pasta temporária remanescente.
5. `npm.cmd run test:governance` → 6 tests, 6 pass, 0 fail, 0 skip, exit 0.

Logs completos (não versionados, cobertos por `.gitignore`):
`.checks/code-review/issue-11-builder/{red.log,green-code-review.log,green-governance.log,final-code-review.log,final-governance.log,proof-rerun.log}`.

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
  outra plataforma nesta entrega — a CI existente do repositório cobre as plataformas
  declaradas.
