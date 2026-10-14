# Issue #11 — resultado da revisão com limpeza falha

Sources:

- https://github.com/oldboydev/skill-me/issues/11 — AC1–AC7.
- `.tasks/issue-11-review-cleanup-result.md` — plano autorizado pelo pedido de execução.
- ERP `781ca4c5b357c6798e50a2956e61b3c7d6c7d43d` — cinco blobs vinculantes para o core.
- `AGENTS.md` — profile light, autoria Claude/Grok e Verifier independente.

## Out of scope

- Produto, workflow, configuração, adaptação do core, alteração de limites e merge automático.

## Landing

Reutilizar a correção e os testes do ERP em `scripts/code-review/`, copiando apenas
`review.mjs`, `review.test.mjs` e `README.md`. CLI/schema ficam intocados.
Prova complementar em `.checks/` reutiliza C11 em cópia temporária para `blocked`.
Nenhuma nova decisão irreversível; copiar somente os hashes vinculantes evita fork local.

## Checks

### S1 — revisão mantém resultado · 5 arquivos comuns · ~62 KB · ~16k tokens

Executar as provas de testes em um único `npm run test:code-review` e a prova complementar
em `node .checks/issue-11-review-cleanup-result.proof.mjs`.

**C1** — `ready` com limpeza falha retorna relatório completo no stdout e exit 0 (AC1).
Proof: C11 `comando com limpeza falha imprime o relatório ready, sai com 0 e avisa a pasta no stderr`.

**C2** — `changes_requested` com limpeza falha retorna relatório completo no stdout e exit 2 (AC1).
Proof: C11 `comando com limpeza falha imprime o relatório changes_requested, sai com 2 e avisa a pasta no stderr`.

**C3** — `blocked` com limpeza falha retorna relatório completo no stdout e exit 2 (AC1).
Proof: `node .checks/issue-11-review-cleanup-result.proof.mjs`, teste C11 complementar `blocked`.

**C4** — Revisão falha seguida de cleanup falho preserva o erro `falha de revisão` e exit 1 (AC2).
Proof: C11 `comando com revisão falha e limpeza falha escreve o erro da revisão e sai com 1`.
Proof: C10 `revisão falha seguida de falha de limpeza mostra o erro da revisão e libera lock`.

**C5** — Pasta que sobra aparece no aviso exato no stderr, com o caminho (AC3).
Proof: C11 ready, changes_requested e falha; C11 blocked complementar.
Proof: C10 `falha de limpeza devolve o relatório changes_requested e avisa a pasta no stderr`.

**C6** — Cleanup que lança sem deixar pasta não produz aviso (AC3).
Proof: C10 `falha de limpeza que não deixa a pasta devolve o relatório e não avisa`.

**C7** — Lock ausente ao final de ready, changes_requested, blocked, revisão falha e cleanup sem pasta (AC4).
Proof: C10/C11 citados em C1–C6, cada um afirma `existsSync(lock) === false`.

**C8** — Cinco blobs correspondem exatamente aos hashes de AC5.
Proof: `node .checks/issue-11-review-cleanup-result.proof.mjs`, asserção por arquivo/hash Git.

**C9** — Suíte do core executa 16 passes, 0 falhas, 0 skips; quatro C10 e três C11 (AC6).
Proof: `npm run test:code-review`, inventário e resultados individuais C1–C11.

**C10** — Fora dos três arquivos do motor, somente artefatos da issue mudam (AC7).
Proof: `node .checks/issue-11-review-cleanup-result.proof.mjs`, diff contra base fixa e allowlist.
Proof: `npm run test:governance`, seis testes existentes, sem alteração do workflow/config/produto.

**C11** — Cleanup falho preserva relatório/contador e retry reutiliza o mesmo resultado.
Proof: C10 `falha de limpeza devolve o relatório ready, libera lock e preserva aprovação e contador`.

## Swept

- validation: existing — `validateReport` antes de salvar, conferir na verificação.
- failure modes: C1–C7.
- idempotency: C11 — resultado e contador preservados, sem reexecutar o revisor.
- authorization: existing — autenticação/perfis intocados, conferir C10 e código.
- concurrency: existing — lock exclusivo; C7 prova liberação, sem nova política.
- data lifecycle: C5–C7, C11 — pasta, lock e histórico.
- dependency failure: C4–C6 — falhas preservadas, pasta observável.
- state transitions: C1–C4.
- observability: C1–C6.

## Handoff

Um batch S1: cinco arquivos ~62 KB / 4 ≈ 16k tokens, mais artefatos <8k;
total estimado <24k, cabe no teto padrão de 150k. Sem handoff de build necessário.
Autoria Claude; Verifier novo após o commit completo, range base..HEAD, todos os 11 checks.
Perfil light: sem fault injection obrigatório, sem fontes de UI nem Test policy adicional.
