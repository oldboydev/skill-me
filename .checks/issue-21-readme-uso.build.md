# Issue #21 — evidências da documentação

Entrega `direct`, limitada ao `README.md` e a este registro de checks. Não houve mudança de comportamento.

- Node local: `v24.21.0`; `package.json` exige `>=24` e permanece `private: true`.
- Os comandos `plan`, `install`, `run`, `privacy` e `report` foram confrontados com `src/integrations/cli.mjs`, `codex-run.mjs`, `privacy/command.mjs`, `report --help` e os contratos de `docs/agent-observation.md`, `docs/traces.md`, `docs/privacidade.md` e `docs/report.md`.
- Smoke PowerShell em raiz temporária dentro de `.checks`: `privacy start --content` criou captura; `status` retornou `active`; `stop` retornou `stopped`; `report --format json --skill` retornou `reportVersion: 1` e `unobserved` sem eventos. O JSON de `SKILL_ME_HERMES_DELIVERY` do README foi convertido de volta em array de cinco argumentos com `ingest` na posição esperada. Resultado: PASS; pasta temporária removida.
- Os quatro links novos para guias locais existem. `git diff --check` terminou com exit 0.
- Não iniciei um agente real, não instalei hooks na configuração pessoal e não executei o exemplo bash neste host Windows. Esses passos são documentais; a prova acima cobre a CLI local e asserções reais do fluxo de captura/consulta.
