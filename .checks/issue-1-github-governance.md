# Issue 1 — Governança e revisão local

Sources:

- Conversa: “eu tenho o repo sheldon e skill-me faça as configs de governança neles tbm”.
- Sheldon: “Grok implementa; Codex local revisa antes do PR”; Claude preparado como alternativa.
- Sheldon: “no sheldon tem os CI para deploy e publish isso não pode ser alterado”.
- Issue: https://github.com/oldboydev/skill-me/issues/1.
- Referência aprovada: ERP dd031d6b1bd9bbd29a8bd2c049f284923af4da45, scripts/code-review/.

## Out of scope

Sem aplicação no repositório. Primeiro commit remoto em main contém somente README, autorizado explicitamente pelo proprietário e publicado em 1c67990a2e983e9359b7253c9144709192094de7; o restante será entregue por PR.
Sem aplicação, merge, deploy, publicação ou alteração de configuração global.

## Landing

- Reutilizar scripts/code-review integralmente; configuração light/ui/direct, duas tentativas.
- AGENTS contém política única; CLAUDE importa AGENTS. Grok usa AGENTS nativamente.
- CI separado com helpers já usados nos pilotos; em Sheldon todos os workflows antigos permanecem.
- Testes node:test rodam em runner próprio; Vitest preserva os testes anteriores e não coleta os novos de Node.
- Bootstrap único aprovado: main recebeu somente README; ruleset 24907375 ativo e Auto-add skill-me 122605050 no Project 3. Toda a governança segue pela branch/PR.

## Checks

### S1 — Governança e entrega · ~100 KB · ~25k tokens

**C1** — Formulários/PR e regras locais satisfazem os critérios 1–3 e configuração tem teto 2, sem overrides.
Proof: validação YAML/JSON e leitura das instruções pelo Verifier, com paths/linhas e campos explícitos.

**C2** — Os cinco blobs do motor são iguais à referência ERP aprovada.
Proof: comparação SHA-256 dos arquivos scripts/code-review em ambos consumidores e na referência.

**C3** — Relatório inválido, contexto ausente, falha, revisão stale, auth API ou mutação não aprovam.
Proof: npm run test:code-review — C1/C2/C3/C4/C5/C8/C9 individuais.

**C4** — Cache/contagem/lock não são reiniciados entre worktrees; limite e remotos são conferidos.
Proof: npm run test:code-review — C5/C6/C7 individuais.

**C5** — Seleção docs/código e resultado CI falham fechados, incluindo exclusão/renome e eventos inválidos.
Proof: npm run test:governance — quatro provas comportamentais de filtro/diff/eventos/resultado e prova do assembly workflow.

**C6** — Workflows atuais do Sheldon, scripts de release, aliases de qualidade e fontes de aplicação permanecem preservados.
Proof: git diff --exit-code 1c67990a2e983e9359b7253c9144709192094de7 -- .github/workflows/ci.yml .github/workflows/release.yml .github/workflows/publish-npm.yml .github/workflows/build-ocr-runtime.yml scripts/release apps packages.
Proof: comparação dos aliases originais em package.json; novos aliases não substituem os anteriores.
No skill-me, repositório originalmente vazio, preservar a ausência de aplicação/release e manter package.json private: true, sem scripts de deploy/publicação; o guard contra a base continua aplicável.

**C7** — Repo/issue vinculados ao Project existente; ruleset active exige PR e CI strict sem bypass/force/delete.
Proof: gh project/issue/ruleset — consultar a configuração efetiva e citar IDs/checks/status.

## Swept

validation: C1/C3; failure modes: C3/C5; idempotency: C4/C7;
authorization: C7; concurrency: C4; lifecycle: C4;
dependency failure: C3/C5; transitions: C1/C7; observability: C1/C5.

## Handoff

Uma única implementação, abaixo de 150k; Verifier independente cobre a entrega inteira.

## Atualização autorizada do motor comum

Proprietário autorizou: “entendi, pode aplicar a correção nos quatro projetos e concluir os PRs, mantendo o deploy e publish do Sheldon intactos”. A referência anterior ERP dd031d6 é atualizada uniformemente com a correção de finalização aprovada: review.mjs/review.test.mjs. CLI/schema/README permanecem iguais. Os cinco blobs continuam idênticos entre todos os consumidores; C2 usa a referência corrigida, sem relaxar paridade. C10 prova lock liberado após limpeza falha, aprovação/cache/contador preservados e falha de revisão sem aprovação. Core configurado mantém limites/histórico; nenhuma exceção adicional. Filtro adicional já corrigido; toda a entrega exige conferência atual antes do PR. A proposta antes pendente está autorizada por esta resposta humana.
