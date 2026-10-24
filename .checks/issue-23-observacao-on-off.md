# Observação automática local com on/off — issue #23

Sources:

- [Issue #23](https://github.com/oldboydev/skill-me/issues/23) — problema, resultados e aprovações do proprietário.
- `.tasks/issue-23-observacao-on-off.md` — critérios, interfaces e limites aprovados.
- `.tasks/issue-5-privacidade.md`, `docs/privacidade.md` — política, limites, chaves e retenção por captura.
- `.tasks/issue-8-traces.md`, `docs/traces.md` — vínculo manual existente e isolamento.
- [OpenAI Docs: Hooks](https://learn.chatgpt.com/docs/hooks) — cobertura de ferramentas locais e ausência de evento de ativação de skill no contrato consultado.

## Out of scope

- Executar skill ou agente pelo observador; somente eventos nativos são recebidos.
- Capturar raciocínio interno ou ferramentas sem hook local.
- Rede, daemon, publicação do pacote e mudanças nos repositórios pilotos.

## Landing

O novo controle consome o store e `applyPolicy` existentes. O vínculo automático entra pela fronteira de `captureDeliveryFor`; o par de variáveis explícitas permanece uma rota manual independente. A integração Hermes precisa localizar a entrega instalada sem variável por sessão.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Consentimento automático | `on` persiste autorização local deste usuário para capturas sucessivas até `off`; cada captura conserva sua chave, limite de 500 eventos/8 MiB e retenção. | Uma captura única não observa continuamente depois do limite. |
| Interface local | `integrations observe setup --root <diretório-absoluto>`; scripts `npm run on`, `npm run off`, `npm run status`; `integrations report --latest` usa a última captura automática. | Exigir raiz e ID em cada sessão mantém o problema da #21. |

Novas escolhas de formato persistido e barreira atômica de `off` devem ganhar linha aqui antes da implementação correspondente. Nenhuma outra mudança de contrato é aprovada por este checklist.

## Checks

### S1 — Configuração única e controle · 7 arquivos · 60 KB · ~15k tokens de leitura

**C1** — `observe setup --root <diretório-absoluto existente>` guarda a raiz para outro processo; antes de `on`, `npm run status` informa `off` e não cria captura.
Proof: `node --test --test-name-pattern="setup persiste raiz e começa off" tests/integrations/observe/control.cli.test.mjs`

**C2** — Raiz relativa ou inexistente é recusada sem ativar; se a raiz configurada for trocada depois, a coleta não grava em outro destino.
Proof: `node --test --test-name-pattern="setup recusa raiz inválida" tests/integrations/observe/control.cli.test.mjs`

**C3** — `npm run on` autoriza conteúdo sanitizado e informa `on` em outro processo; uma segunda execução mantém a mesma geração e não cria captura extra.
Proof: `node --test --test-name-pattern="on persiste e é idempotente" tests/integrations/observe/control.cli.test.mjs`

**C4** — `npm run off` informa `off`, encerra a autorização automática e é idempotente; as capturas encerradas permanecem consultáveis.
Proof: `node --test --test-name-pattern="off encerra e é idempotente" tests/integrations/observe/control.cli.test.mjs`

**C5** — Captura manual com par explícito de raiz/ID continua usando `privacy start/stop/disable` e não é redirecionada por `on/off`; um par incompleto é recusado, nunca convertido em vínculo automático.
Proof: `node --test --test-name-pattern="vínculo manual mantém precedência" tests/integrations/observe/control.cli.test.mjs`

### S2 — Observação natural e isolamento · 5 arquivos · 66 KB · ~17k tokens de leitura

**C6** — Com `on` e hook Claude instalado/confiável, eventos de sessão e ferramentas com `session_id` são gravados sem variáveis de captura, com comandos suportados somente após sanitização.
Proof: `node --test --test-name-pattern="Claude grava automaticamente com on" tests/integrations/observe/agents.e2e.test.mjs`

**C7** — Com `on` e hook Codex instalado/confiável, eventos de sessão e ferramentas com `session_id` são gravados sem variáveis de captura; leitura de `SKILL.md` permanece inferência, não ativação nativa.
Proof: `node --test --test-name-pattern="Codex grava automaticamente com on" tests/integrations/observe/agents.e2e.test.mjs`

**C8** — Após instalação/configuração única, plugin Hermes entrega eventos com `session_id` sem `SKILL_ME_HERMES_DELIVERY` no ambiente da sessão e não bloqueia o agente se a entrega falhar.
Proof: `node --test --test-name-pattern="Hermes entrega sem variável por sessão" tests/integrations/hermes-plugin.native.test.mjs`

**C9** — Evento sem identidade de sessão válida não escolhe captura automática nem recebe identidade de outra sessão.
Proof: `node --test --test-name-pattern="evento sem sessão não é atribuído" tests/integrations/observe/routing.unit.test.mjs`

**C10** — Duas sessões intercaladas têm capturas e chaves próprias; o relatório de uma não contém eventos da outra.
Proof: `node --test --test-name-pattern="sessões concorrentes ficam isoladas" tests/integrations/observe/agents.e2e.test.mjs`

**C11** — Quando a captura automática alcança 500 eventos ou 8 MiB, a próxima admissão cria outra captura sob a mesma autorização `on`, sem ultrapassar o limite individual e sem perder o evento de transição.
Proof: `node --test --test-name-pattern="limite abre captura sucessiva" tests/integrations/observe/rollover.e2e.test.mjs`

**C12** — Se `off` concorre com um produtor já aberto, nenhuma gravação automática é confirmada após a conclusão de `off`.
Proof: `node --test --test-name-pattern="off corta produtor em voo" tests/integrations/observe/routing.unit.test.mjs`

**C13** — Um novo `on` após `off` cria outra geração de autorização; produtor da geração anterior não grava na nova e não herda sua chave ou conteúdo.
Proof: `node --test --test-name-pattern="novo on isola geração anterior" tests/integrations/observe/routing.unit.test.mjs`

**C14** — Store indisponível/lock ocupado não bloqueia comandos do agente, preserva o código de saída do agente e não escreve conteúdo em stdout/stderr do hook; `status` expõe o estado sem prometer captura bem-sucedida.
Proof: `node --test --test-name-pattern="falha de entrega não bloqueia agente" tests/integrations/observe/agents.e2e.test.mjs`

### S3 — Consulta e documentação · 5 arquivos · 77 KB · ~19k tokens de leitura

**C15** — `integrations report --latest` usa a captura automática mais recente da raiz configurada sem `--root/--capture`; o relatório inclui a identidade da captura escolhida e mantém o formato do relatório atual.
Proof: `node --test --test-name-pattern="report latest escolhe captura automática" tests/integrations/observe/report.cli.test.mjs`

**C16** — Sem captura automática, `report --latest` retorna erro fechado; nunca escolhe silenciosamente uma captura manual.
Proof: `node --test --test-name-pattern="report latest não escolhe captura manual" tests/integrations/observe/report.cli.test.mjs`

**C17** — Conteúdo de comandos não suportado, sensível ou sem opt-in continua omitido conforme a política existente, e a execução automática não abre conexão de rede.
Proof: `node --test --test-name-pattern="modo automático respeita privacidade" tests/integrations/observe/privacy.e2e.test.mjs`

**C18** — README apresenta configuração única, `npm run on`, uso normal, `npm run off` e `report --latest`, com as limitações de Claude/Codex/Hermes e a manutenção dos comandos manuais avançados.
Proof: `node --test --test-name-pattern="README descreve on off real" tests/integrations/observe/docs.test.mjs`

## Swept

- validation: C2, C9.
- failure modes: C14, C16.
- idempotency and retry: C3, C4, C13.
- authorization: C1, C3, C4, C5, C13.
- concurrency and ordering: C10, C11, C12.
- data lifecycle: C4, C11, C13, C17; retenção/limites por captura permanecem da #5.
- external-dependency failure: C8, C14; hooks sem confiança não rodam, conforme instalação existente.
- state transitions: C1, C3, C4, C13.
- observability: C1, C4, C15, C16.

## Handoff

Um lote de build: S1~15k + S2~17k + S3~19k = ~51k tokens mínimos de leitura, abaixo do teto de 150k. A implementação pode permanecer no mesmo agente Claude; o Verifier será outro processo, convocado pelo orquestrador após o último commit.
