# Issue 3 — Diagnóstico local de agentes e cobertura observável

profile: light

Sources:

- [.tasks/issue-3-agent-diagnostics.md](../.tasks/issue-3-agent-diagnostics.md) - 18 critérios em 3 fatias, Out
  of scope, Decided (envelope JSON e CLI doctor) e execução proposta ao implementador.
- Issue #3 (referenciada na task, seis ACs remotos) - rastreada na tabela "Rastreio do aceite" da task; os ACs
  não trazem detalhe adicional além do já incorporado aos 18 critérios.
- [AGENTS.md](../AGENTS.md) atualizado - regras de teste orientado a comportamento, reúso e revisão aplicadas
  nesta fase.
- Referência de formato da skill `tlc-implement` (`references/checklist-format.md`, fora deste repositório,
  consultada pelo caminho local do executor) - **binding para o formato deste artefato**: seções, Coverage
  como join e fechamento de fronteira. Corrigido nesta rodada (ver `.checks/code-review/preflight-issue-3.md`):
  o caminho absoluto de máquina foi retirado desta entrega pública; o contrato de formato seguido não muda.
- [package.json](../package.json) e scripts atuais - `test:governance`/`test:code-review` existentes a preservar
  intactos (critério 18); nenhum script novo foi adicionado nesta fase.
- [.github/workflows/governance.yml](../.github/workflows/governance.yml) e
  [scripts/governance-ci.test.mjs](../scripts/governance-ci.test.mjs) - forma atual do pipeline (sem matriz de
  SO, sem `test:doctor`); `governance-C1 C3` trava essa forma byte a byte e precisará mudar junto da CI na
  implementação (fora desta fase, ver Handoff).
- Base `origin/main` 4242520, integrada em c43d4ca nesta branch - estado de referência para a comparação
  byte a byte dos cinco arquivos comuns de `scripts/code-review/` (critério 18); confirmado sem diff nesta
  data (ver C18).

## Out of scope

- Instalar, ativar, confiar ou executar hooks/plugins; iniciar agente ou chamada de modelo - issue #4.
- Sanitização/retenção/exclusão de traces reais - issue #5; aqui só se impede vazamento do que é lido.
- Correlacionar eventos, avaliar skills, coletor real, protocolo IPC - issues #6-#8.
- Nome global, monorepo, pnpm, publicação, dashboard, certificação de IDE/desktop/cloud - não fazem parte do
  diagnóstico local mínimo.
- Mudança de CI/package.json (matriz de SO, `test:doctor`) nesta fase - a tarefa recebida é "extrair checklist
  e escrever testes primeiro"; a integração à CI é trabalho da implementação (critério 18), registrada como
  pendência no Handoff, não decidida ou aplicada agora.

## Landing

Esta fase não cria `src/doctor/`; cada teste referencia o caminho onde o módulo deverá existir, e a ausência
desses arquivos é a prova do RED (critério de saída desta fase). `tests/doctor/helpers/` reúne fixtures
sintéticas reutilizáveis (PE mínimo, PATH por SO, configs TOML/YAML, servidor TCP loopback real) para que as
18 provas não dupliquem a mesma construção.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Envelope JSON `schemaVersion: 1` | chaves fixas `schemaVersion, status, environment, agents, collector, limitations, errors`; cada agente com `id, presence, version, versionSource, path, reasonCode, configuration, trust, configReasonCode, capabilities[]` | Um booleano global `supported` ou forma ad-hoc por renderer - quebra a paridade texto/JSON do critério 11 e a comparação de fatos do critério 15 |
| Vocabulário de `reasonCode` por campo | strings estáveis (`executable_not_found`, `version_unreadable`, `launcher_not_recognized`, `version_source_ambiguous`, código de SO para `unknown`, `input_too_large`, `unsafe_yaml_tag`, `config_malformed`, `hooks_disabled`, `policy_precedence_undetermined`, `endpoint_not_provided`, `invalid_endpoint`, `connection_refused`, `connection_timeout`) | Mensagem livre só para humano - não dá para um consumidor programático distinguir os estados exigidos pelos critérios 3, 8, 10, 12, 14 |
| Matriz de capacidades 5 mecanismos × 4 superfícies | `skill_usage_signal, tool_calls, results_and_errors, session_turn, subagents` × `cli_local, ide, desktop, cloud`, total 20 linhas por agente | Lista livre sem enumeração fechada - não permite provar "nada ficou de fora" (critério 7) |
| Descoberta de config por agente | **Corrigido na implementação (ver `.checks/issue-3-agent-diagnostics.build.md`, seções 1 e 6)**: não existe `hooks.yaml` genérico — essa era uma convenção inventada nesta fase. Real: Claude usa `settings.json` (JSON) em `<CLAUDE_CONFIG_DIR>` quando definida (substitui `~/.claude` inteiro, sem sufixo adicional) ou em `<HOME>/.claude/` quando não definida, mais `<cwd>/.claude/settings.json`, `.../settings.local.json` e `managed-settings.json` em caminho fixo do SO; Codex usa `hooks.json`/`[hooks]` em `config.toml` sob `<CODEX_HOME ou HOME>/.codex` e `<cwd>/.codex` — a *lista de handlers* é aditiva entre camadas, mas a própria `features.hooks` não é um OR aditivo de `false`: qualquer valor explícito dela em escopo de projeto (`true` OU `false`) depende de confiança de projeto não determinável por leitura e vira `unknown`, nunca `disabled`/`configured` por suposição; só a ausência da chave em projeto deixa a pergunta em aberto para o escopo de usuário, que resolve `false` como `disabled` de verdade; Hermes usa `config.yaml` (YAML) sob `<HERMES_HOME ou HOME>/.hermes` (POSIX) **ou `<HERMES_HOME ou LOCALAPPDATA>/hermes` no Windows** (`HERMES_HOME` aponta para o home exato, sem sufixo adicional) — a premissa inicial desta fase presumia, pela ausência de menção na documentação pública, que não havia override por `%LOCALAPPDATA%`; essa premissa foi corrigida por inspeção estática da instalação local (ver build, seção 6, achado 8), que confirmou o override como real no Windows —, com `hooks_auto_accept` como único consentimento nativo lido | Varrer catálogo arbitrário de plugins/skills - a própria task marca isso fora de escopo |
| Flags da CLI e exit codes | exatamente `--json, --cwd, --collector, --help`; exit `0` completo/parcial, `1` erro interno, `2` sintaxe/flag inválida; **corrigido na rodada de revisão**: um `--collector` fora da assinatura (não loopback literal, com credenciais/path/query) é erro de uso (exit `2`), não um diagnóstico "completo" com `collector.status: unknown/invalid_endpoint` e exit `0` como esta fase presumiu | Qualquer flag de reparo/instalação/coleta - a task proíbe modo de reparo nesta CLI |
| Dependência nova `smol-toml` (parser TOML de dados, sem execução de código) | Adicionada durante a implementação (não nesta fase de preparação) para o único consumidor real: ler `config.toml`/`hooks.json` do Codex sem interpretar nada executável; registrada em `package.json`/`package-lock.json` | Escrever um parser TOML próprio só para este uso mínimo, ou reaproveitar uma lib de schema mais pesada sem necessidade demonstrada |

- Nada mais nesta fase é difícil de reverter: nenhum arquivo de produto, CI ou npm foi criado ou alterado;
  todo o conteúdo novo é teste e fixture, descartável sem custo caso o formato mude na implementação.

## Checks

### S1 - Saber quais agentes foram encontrados sem iniciar os agentes · 6 arquivos · ~26 KB · ~7k

**C1** - PATH vazio e nenhum local reconhecido retorna exatamente três entradas (claude, codex, hermes),
cada uma `presence: absent`, `version: null`, motivo `executable_not_found`, texto informando "não
encontrado" para cada uma, exit `0`.
Proof: `node --test --test-name-pattern="presence-C1" tests/doctor/presence.cli.test.mjs`

**C2** - Fixtures reconhecidas resolvem a primeira entrada válida do PATH, vinculando caminho e versão ao
artefato encontrado (Claude via `binary_metadata`, Codex via `package_metadata`, Hermes via
`source_literal`); caminhos com espaço/Unicode não alteram a resolução; as três convenções de SO
(Windows/Linux/macOS) resolvem da mesma forma. **Corrigido na implementação**: os shims de Codex/Hermes
precisam referenciar de verdade o pacote/fonte (symlink+realpath ou caminho relativo embutido no shim para
Codex; layout padrão de venv/site-packages para Hermes) — um launcher "stub" sem esse vínculo não basta
(ver C3 abaixo e `.checks/issue-3-agent-diagnostics.build.md`).
Proof: `node --test --test-name-pattern="presence-C2" tests/doctor/presence.cli.test.mjs`
Proof: `node --test --test-name-pattern="agent-resolution-C2" tests/doctor/agent-resolution.unit.test.mjs`

**C3** - Versão ilegível, launcher não reconhecido e fonte ambígua mantêm `presence: present`,
`version: null` com motivo específico; permissão negada vira `presence: unknown` preservando o código do
SO, sem interromper o diagnóstico dos demais agentes. Inclui regressão de launcher alheio com
package.json/hermes_cli vizinho mas não referenciado, que continua `launcher_not_recognized`.
Proof: `node --test --test-name-pattern="presence-C3" tests/doctor/presence.cli.test.mjs`
Proof (camada de permissão, simulação cross-SO declarada abaixo, e regressão de launcher alheio):
`node --test --test-name-pattern="agent-resolution-C3" tests/doctor/agent-resolution.unit.test.mjs`

**C4** - Uma fixture com efeitos colaterais simulados não aciona nenhum launcher; inventário de
arquivos/tamanho/mtime antes e depois não muda; nenhuma chamada a `child_process` ocorre na resolução.
Proof: `node --test --test-name-pattern="presence-C4" tests/doctor/presence.cli.test.mjs`
Proof: `node --test --test-name-pattern="agent-resolution-C4" tests/doctor/agent-resolution.unit.test.mjs`

Limitação declarada (C3): simular permissão negada de forma real e portátil entre Windows/Linux/macOS não é
determinístico (chmod não bloqueia o dono no Windows; containers de CI rodam como root). A prova de
`presence: unknown` por permissão é feita na própria camada de resolução, com um adaptador de filesystem
injetado que lança `EACCES`, conforme AGENTS.md ("separe decisões puras de efeitos externos... teste a regra
diretamente"). A fronteira de CLI permanece provada para os demais estados do critério 3.

### S2 - Entender o que pode ser observado e o que permanece incerto · 8 arquivos · ~25 KB · ~6k

**C5** - Cada mecanismo/capacidade tem `support`, `reasonCode` e evidência; `verified` exige evidência local
vinculada à versão identificada; versão sem perfil compatível ou documentação sem vínculo de versão não
chegam a `verified`; fixture validada nunca é marcada como prova do ambiente real.
Proof: `node --test --test-name-pattern="capability-matrix-C5" tests/doctor/capability-matrix.unit.test.mjs`

**C6** - `support`, `configuration` e `runtimeVerification` são representados separadamente; configuração
existente nunca produz `runtimeVerification: verified`; nesta entrega `runtimeVerification` é sempre
`not_performed`.
Proof: `node --test --test-name-pattern="capability-matrix-C6" tests/doctor/capability-matrix.unit.test.mjs`

**C7** - A matriz cobre os cinco mecanismos (sinais de skill, ferramentas, resultados/erros, sessão/turno,
subagentes) nas quatro superfícies (CLI local, IDE, desktop, cloud); encontrar a CLI local não verifica outra
superfície (`unverified/surface_not_inspected`, nunca `unavailable`); Codex nunca anuncia `SkillStart` nativo
como `verified`. **Corrigido na correção do Verifier (G2)**: esta fase havia equiparado erroneamente hosted
tools do Codex a `unavailable` — equivalência que não vem da task e que o código nunca produziu (a frase
desta linha estava desatualizada frente ao comportamento real, sempre `unverified`). A entrega real comunica
a exclusão de hosted tools dos hooks locais (fonte: "Hooks" em https://learn.chatgpt.com/docs/hooks, seção
"Tool coverage" - hosted tools como busca web/WebSearch não têm cobertura de hook local documentada) como um
fato separado (`exclusion: { reasonCode: "hosted_tools_outside_local_hooks", origin: "documented_contract" }`)
na própria linha `tool_calls`/`cli_local`, sem sobrescrever o `support`/`reasonCode` genérico dessa linha nem
equipará-la à superfície `cloud` inteira não inspecionada (`surface_not_inspected`) - os dois motivos nunca se
confundem e nenhum dos dois é `unavailable`.
Proof: `node --test --test-name-pattern="capability-matrix-C7" tests/doctor/capability-matrix.unit.test.mjs`
Proof (fronteira real da CLI, motivo distinto da superfície cloud, nos dois formatos):
`node --test --test-name-pattern="capability-evidence-C7" tests/doctor/capability-evidence.cli.test.mjs`

**C8** - Configurações reais por agente (JSON do Claude, TOML do Codex, YAML do Hermes)
válidas/inválidas/desabilitadas/bloqueadas por política produzem `configuration` e `trust` corretos com
motivo; ausência de consentimento nunca vira `trusted` por inferência; política/precedência não
determinável por leitura usa `unknown`. **Corrigido na implementação**: um campo `trust`/`trusted`
arbitrário dentro do próprio arquivo de configuração nunca é projetado nem concede confiança — a única
origem nativa de confiança lida nesta entrega é `hooks_auto_accept` do Hermes, validada contra uma lista de
origens reconhecidas em `trust-resolution.mjs` (ver `.checks/issue-3-agent-diagnostics.build.md`).
Proof: `node --test --test-name-pattern="config-projection-C8" tests/doctor/config-projection.unit.test.mjs`
Proof: `node --test tests/doctor/scope-merge.unit.test.mjs`
Proof: `node --test tests/doctor/trust-resolution.unit.test.mjs`
Proof: `node --test --test-name-pattern="configuration-trust-C8" tests/doctor/configuration-trust.cli.test.mjs`

**C9** - `--collector tcp://127.0.0.1:<porta>` ou `tcp://[::1]:<porta>` tenta só conexão de transporte;
socket disponível retorna `reachable`; recusa retorna `unreachable`; `identityVerified` é sempre `false`.
Proof: `node --test --test-name-pattern="collector-C9" tests/doctor/collector.cli.test.mjs`

**C10** - Sem endpoint, `collector.status: unknown` com `endpoint_not_provided`; endpoint inválido (não
loopback literal, com credenciais/path/query, ou `localhost` não normalizado) é recusado sem conexão;
tentativa que excede 1000 ms retorna `unreachable/connection_timeout` sem travar os demais diagnósticos.
Proof: `node --test --test-name-pattern="collector-C10" tests/doctor/collector.cli.test.mjs`
Proof (timeout real e recusa pré-conexão, limitação declarada abaixo): `node --test --test-name-pattern="collector-probe-C10" tests/doctor/collector-probe.unit.test.mjs`

Limitação declarada (C10): um timeout real de rede (SYN engolido por firewall) não é reproduzível de forma
rápida e portátil em CI sem admin/firewall. A aplicação do teto de 1000 ms é provada na própria função de
probe com uma função `connect` injetada que nunca resolve, medindo tempo de parede real (sem relógio falso).
A recusa pré-conexão de endpoints inválidos também é provada nessa camada, com um `connect` que lança se for
chamado. O status `reachable`/`unreachable` por recusa real de socket cruza a fronteira real da CLI.

### S3 - Consumir o diagnóstico completo e reconhecer suas falhas · 9 arquivos · ~25 KB · ~6k

**C11** - `doctor` e `doctor --json` apresentam os mesmos fatos; o JSON é um objeto único sem
banner/ANSI/log antes ou depois; o texto em português distingue ausente/desconhecido/indisponível/não
verificado; identificadores do JSON são em inglês. **Corrigido na correção do Verifier (G1)**: o renderer de
texto reduzia cada capacidade a uma contagem por estado e nunca imprimia `agent.path` nem o ambiente
(`environment.platform/cwd/generatedAt`), então os dois formatos não apresentavam os mesmos fatos/códigos do
mesmo modelo. `src/doctor/render-text.mjs` agora expõe, por agente, o caminho e, por capacidade, mecanismo ×
superfície, `support`, `reasonCode`, `evidence.origin`, `configuration` e a exclusão documentada quando
presente (ver C7).
Proof: `node --test --test-name-pattern="envelope-C11" tests/doctor/envelope.cli.test.mjs` (inclui a nova
paridade texto/JSON na fronteira real da CLI, duas invocações de processo distintas sobre a mesma fixture,
com motivos/origens reais e distintos por superfície)
Proof (renderer puro com modelo sintético compartilhado, sem depender de timestamps de processo):
`node --test tests/doctor/render-text.unit.test.mjs`

**C12** - `schemaVersion: 1`, `status: complete|partial|failed`, seções `environment/agents/collector/
limitations/errors`; config inválida de um agente gera `partial` preservando as demais entradas; exit `0`
para completo/parcial; flag desconhecida usa exit `2`; erro com `--json` preserva envelope `failed` sem
stack bruta.
Proof: `node --test --test-name-pattern="envelope-C12" tests/doctor/envelope.cli.test.mjs`
Proof (exit `1`/erro interno, limitação declarada abaixo): `node --test --test-name-pattern="envelope-failure-C12" tests/doctor/envelope-failure.unit.test.mjs`

**C13** - `--help` lista exatamente `--json, --cwd, --collector, --help` com defaults documentados; diretório
inexistente ou flag desconhecida usa exit `2`; `--help` usa exit `0` sem inspecionar agentes; não existe
flag de reparo/instalação/coleta.
Proof: `node --test --test-name-pattern="envelope-C13" tests/doctor/envelope.cli.test.mjs`

**C14** - Canários em config/erros/comandos de hooks não vazam em stdout/stderr/relatório; a projeção só
permite metadados necessários; config acima de 1 MiB vira `unknown/input_too_large` sem copiar conteúdo nem
executar tags YAML ou interpolação; metadado PE é lido pela estrutura do binário sem carregar o executável
inteiro em memória nem iniciá-lo.
Proof: `node --test --test-name-pattern="leak-C14" tests/doctor/leak-and-limits.cli.test.mjs`
Proof: `node --test --test-name-pattern="config-projection-C14" tests/doctor/config-projection.unit.test.mjs`
Proof: `node --test tests/doctor/version-metadata.unit.test.mjs`

**C15** - Duas execuções simultâneas sobre as mesmas fixtures não criam cache/lock/backup e retornam os
mesmos fatos (descontando timestamp); mutação detectada durante a leitura vira limitação, não reparo.
**Corrigido na correção do Verifier (G3)**: `readBoundedText` (`src/doctor/snapshot-read.mjs`) descartava
`snapshot.changedDuringRead` e devolvia `state: "ok"` com o texto lido durante a mutação, então os
consumidores de `shim`/`package_metadata` (Codex) e `source_literal` (Hermes) nunca recebiam essa
inconclusividade - só `config-reader.mjs` já propagava. Agora `readBoundedText` devolve
`state: "changed_during_read"` e os três consumidores reais (`launcher-link/codex.mjs`,
`launcher-link/hermes.mjs`) retornam `version: null`/`reasonCode: "version_changed_during_read"`,
preservando `presence: present` a montante (a montagem fica em `agent-resolution.mjs`, que só depende de
`launcherPath` ter sido encontrado).
Proof: `node --test tests/doctor/snapshot-concurrency.cli.test.mjs`
Proof (mutação durante a leitura, limitação declarada abaixo, inclui o wrapper `readBoundedText` e os três
consumidores reais de shim/package_metadata/source_literal):
`node --test tests/doctor/mid-read-mutation.unit.test.mjs`

**C16** - Os cenários da suíte comprovam ausente, versão sem perfil, recurso desabilitado, config
malformada/inacessível e coletor inacessível, registrando se a origem é fixture ou ambiente real; há casos
Windows/Linux/macOS nas fixtures; a suíte não alega payload privado nem E2E de captura. **Corrigido na
correção do Verifier (G4)**: faltavam cenários na fronteira real da CLI (processo filho) para uma instalação
RECONHECIDA (vínculo real ao pacote/fonte, não um "launcher alheio") com versão sem perfil compatível, e para
configuração inacessível. Versão sem perfil: `writeCodex` com versão `9.9.0` fora de
`known-version-profiles.mjs`, resolução bem-sucedida (`presence: present`, `version: "9.9.0"`,
`versionSource: "package_metadata"`), e as cinco linhas `cli_local` da matriz ficam
`unverified/version_profile_incompatible`, nunca `verified` nem `launcher_not_recognized`. Config inacessível:
prova portátil entre Windows/Linux/macOS sem depender de permissão de SO (`chmod` não bloqueia o dono no
Windows; CI roda como root) - um diretório real no lugar de `config.yaml` do Hermes produz uma falha de
leitura real (`EISDIR` no Windows/Linux/macOS) capturada por `readScope`, resultando em
`configuration: unknown/policy_precedence_undetermined` e preservando Claude/Codex como `not_configured`.
Proof: `node --test tests/doctor/fixture-suite-inventory.test.mjs`
Proof (versão sem perfil compatível, fronteira real da CLI):
`node --test --test-name-pattern="presence-C16" tests/doctor/presence.cli.test.mjs`
Proof (configuração inacessível, fronteira real da CLI, prova portátil via diretório no lugar do arquivo):
`node --test --test-name-pattern="configuration-trust-C16" tests/doctor/configuration-trust.cli.test.mjs`

**C17** - A documentação de compatibilidade registra fonte, data de consulta, versão/superfície aplicável,
evidência obtida e lacunas, separando contrato documentado, inspeção estática e execução real; o README
ensina `npm run --silent doctor -- --json` e a leitura de `partial`, `unverified` e
`identityVerified: false`.
Proof: `node --test tests/doctor/docs-compatibility.test.mjs`

**C18** - `test:governance` e `test:code-review` continuam passando; a suíte nova entra na verificação de
mudanças de código e no `CI` obrigatório; os cinco arquivos comuns de `scripts/code-review/` permanecem byte
a byte iguais à base; sem instalação/publicação de pacote, commit em main ou mudança das regras de merge.
Proof (linha de base confirmada nesta data, 13/10/2026): `npm run test:governance` (6/6 passando) e
`npm run test:code-review` (10/10 passando).
Proof (paridade do motor, confirmada sem diff nesta data): `git diff --exit-code 4242520 -- scripts/code-review/cli.mjs scripts/code-review/review.mjs scripts/code-review/review.test.mjs scripts/code-review/schema.json scripts/code-review/README.md`
Pendente de implementação (não decidido nem aplicado nesta fase, ver Handoff): acrescentar
`node --test "tests/doctor/**/*.test.mjs"` ao job `verify` de `governance.yml`, a matriz Windows/Linux/macOS
e, se necessário, atualizar `governance-C1 C3` em `scripts/governance-ci.test.mjs` para a nova forma do
workflow — sem alterar `package.json`/CI nesta fase, por instrução explícita desta rodada.

Limitação declarada (C12, exit 1): não há como forçar um "erro interno que impossibilite relatório" de forma
determinística via processo real sem um knob de teste na CLI de usuário (o que é proibido) - qualquer entrada
reconhecida vira um estado tratado (exit 0 ou 2), não uma falha genuína. O mapeamento erro→envelope→exit code
é provado diretamente na função que `cli.mjs` deverá usar como barreira final.

Limitação declarada (C15, mutação durante leitura): sincronizar uma escrita real durante a leitura de um
processo CLI externo não é determinístico (depende de timing de SO). A detecção é provada na função de
leitura com snapshot, injetando um `stat()`/`readFile()` que discordam, como aconteceria numa mutação real.

## Swept

- validation: C3, C8, C10, C13, C14 - entradas malformadas, leitura limitada e flags.
- failure modes: C3, C10, C12 - acesso negado, timeout e isolamento da falha parcial.
- idempotency and retry: C4, C15 - sem escrita/cache; nova invocação é nova leitura; mutação detectada não é
  reparada nem relida automaticamente.
- authorization: C4, C8, C10 - permissões do usuário atual; somente leitura; endpoint local explícito.
- concurrency and ordering: C1, C15 - ordem fixa de saída; duas execuções concorrentes sem estado comum.
- data lifecycle: C4, C14, C15 - sem persistência de diagnóstico/config; só fixtures sintéticas e
  documentação são versionadas.
- dependency failure: C3, C5, C10 - artefato inacessível, versão sem perfil e coletor indisponível não viram
  suporte afirmado.
- state transitions: n/a - relatório de snapshot, sem ciclo de vida persistido nesta entrega.
- observability: C5-C12, C17 - motivos e origem de evidência no mesmo relatório; nenhuma captura real.

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| Fonte de versão (3) | `binary_metadata` C2/C14 (PE) · `package_metadata` C2 (Codex) · `source_literal` C2 (Hermes) | - |
| Convenções de SO (3) | `win32` C2 · `linux` C2 · `darwin` C2, parametrizado em `agent-resolution.unit.test.mjs` | - |
| Matriz de capacidades (5 mecanismos × 4 superfícies = 20/agente) | C5-C7, tabela única percorre as 20 combinações por agente, tamanho declarado no teste | - |
| `configuration` (5) | `configured` C8 · `not_configured` C8 · `disabled` C8 · `invalid` C8 · `unknown` C8/C14 | - |
| `trust` (4) | `trusted` C8 · `untrusted` C8 · `unknown` C8 · `not_applicable` C8 | - |
| `collector.status`/motivo (5) | `reachable` C9 · `unreachable/connection_refused` C9 · `unreachable/connection_timeout` C10 · `unknown/endpoint_not_provided` C10 · `unknown/invalid_endpoint` C10 | - |
| Exit code × status (4 combinações observáveis) | `0/complete` C12 · `0/partial` C12 · `2/sintaxe-flag` C12-C13 · `1/failed` C12 (camada de função, limitação declarada) | - |
| Startup config: descoberta de config por agente (1 montagem) | A CLI é a única montagem desta entrega (sem servidor/outro app); texto e JSON consomem o mesmo relatório interno - nenhuma linha é devida (ver nota do formato de checklist sobre montagem única compartilhada) | - |

- Claims naming a status code, route ou response shape: C9, C10, C12, C13 - cada uma tem ao menos uma prova
  que cruza a fronteira real da CLI, com duas exceções declaradas e justificadas acima: o exit `1`/"erro
  interno" de C12 e o `connection_timeout` de C10, ambos provados na função que a CLI usará como barreira,
  não via processo real, por não serem reproduzíveis de forma determinística nessa fronteira.
- Nenhum outro check afirma mais do que o caso único que sua prova exercita.

## Handoff

Uma única implementação cobrindo as três fatias em um único lote (não há necessidade de produto, outro time
ou decisão de produto que force sub-issues, conforme a própria task). Tamanho estimado pelo que já existe
nesta fase (testes e fixtures reais, `wc -c` dividido por 4): S1 ~7k, S2 ~6k, S3 ~6k, total ~19k de leitura
mínima sobre os arquivos de teste - a implementação ainda vai acrescentar `src/doctor/**`, `docs/agent-
compatibility.md`, trechos de `README.md` e a mudança de CI, cujo tamanho real só é conhecido quando esses
arquivos existirem; esta estimativa é a base mínima declarada nesta fase, não o total final do PR.

Trabalho que esta fase deixou pendente, por instrução explícita de escopo ("não implemente produto, não mude
npm/CI, não instale dependências"):

1. Implementar `src/doctor/**` conforme os contratos fixados pelos testes (nomes de módulos, formas de dados
   e `reasonCode`s já são vinculantes - mudar a forma exige atualizar os 18 checks, não apenas o código).
2. Escrever `docs/agent-compatibility.md` e os trechos do `README.md` exigidos pelo critério 17.
3. Acrescentar a suíte nova (`node --test "tests/doctor/**/*.test.mjs"`) ao job `verify` de
   `governance.yml`, a matriz Windows/Linux/macOS, e atualizar `governance-C1 C3` para a nova forma do
   workflow, preservando os cinco arquivos comuns de `scripts/code-review/` (critério 18).
4. Rodar a suíte completa (`node --test "tests/doctor/**/*.test.mjs"`) e confirmar GREEN antes de acionar o
   Verifier independente e `review:run -- --issue 3 --profile light`, conforme a "Execução proposta" da task.

Verifier independente prova cada critério e salva `.checks/issue-3-agent-diagnostics.verified.md`, conforme
a task; esta fase não afirma nenhum teste como executado além do RED comprovado abaixo.
