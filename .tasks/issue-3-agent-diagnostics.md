# Issue 3 — Diagnóstico local de agentes e cobertura observável

> Implementar com **tlc-implement**, profile `light`, depois da aprovação deste plano.
> Cada critério vira um check com prova referenciada pelo número. Grok ou Claude
> implementa; Codex local revisa conforme AGENTS.md. Nada em `Unresolved` é decidido
> silenciosamente durante a implementação.

## Intent

Quem quer observar uma skill precisa saber quais agentes estão instalados e quais
mecanismos de observação realmente estão disponíveis. Hoje o repositório só tem
governança: não existe diagnóstico de produto. Versão, política e superfície podem
invalidar uma promessa de cobertura. A issue não fornece métricas de impacto.

A entrega permite consultar o ambiente local, ler um diagnóstico em português e
obter os mesmos fatos em JSON. Presença de executável, suporte de contrato,
configuração e funcionamento real são informações distintas. O comando não inicia
sessões, executa skills, instala hooks nem corrige configurações.

18 critérios em 3 fatias observáveis · 2 contratos externos novos · 0 decisões
técnicas bloqueantes. Aprovação do plano ainda pendente; Planning não equivale a Ready.

### Recorte e tamanho

Uma task e uma branch/PR para a issue inteira, conforme AGENTS.md. As fatias são:
inventariar agentes; explicar condições e cobertura; consumir o diagnóstico e suas
falhas. Não há necessidade de produção, outro time ou decisão de produto que force
sub-issues. Preparação da CLI é parte da mesma entrega, não uma task de bootstrap.

## Criteria

### Saber quais agentes foram encontrados sem iniciar os agentes

1. Com PATH vazio e nenhum local de instalação reconhecido, `doctor --json` retorna
   exatamente três entradas, nesta ordem: `claude`, `codex`, `hermes`; cada uma tem
   `presence: absent`, `version: null` e motivo `executable_not_found`. O texto informa
   que cada agente não foi encontrado. A investigação completa tem exit code `0`.
2. Com fixtures de instalações reconhecidas, o diagnóstico identifica a primeira
   resolução válida no PATH, o caminho e a versão ligados a esse artefato: Claude
   `2.1.295`, Codex `0.162.1` e Hermes `0.21.4`. A origem da versão é explícita:
   `binary_metadata`, `package_metadata` ou `source_literal`. Caminhos com espaços e
   Unicode não alteram a resolução. As versões são casos de teste, não mínimo universal.
3. Com artefato presente mas versão ilegível, launcher não reconhecido ou fonte de
   versão ambígua, mantém `presence: present`, `version: null` e motivo específico;
   não inventa versão nem confunde essa condição com agente ausente. Se uma área não
   puder ser inspecionada por permissão, usa `presence: unknown`, preservando o erro
   de acesso como código, sem interromper o diagnóstico dos demais agentes.
4. A execução de uma fixture que simule launchers com efeitos colaterais não aciona
   nenhum launcher. O mecanismo é leitura estática de artefatos/configuração e de
   metadados do SO; não há invocação de `claude`, `codex` ou `hermes`, importação de
   módulos Python do Hermes, execução de comandos de hooks ou leitura de transcripts.
   Inventário de arquivos e hashes antes/depois comprova zero mudanças em configuração,
   skills e perfil dos agentes.

### Entender o que pode ser observado e o que permanece incerto

5. Cada mecanismo/capacidade possui `support: verified | unavailable | unverified`,
   `reasonCode` e evidência de origem. `verified` exige evidência local compatível
   com a instalação identificada que comprove aquele contrato; documentação sem
   vínculo com a versão não basta. Fixture validada não comprova a máquina real.
   Versão sem perfil compatível fica `unverified`, não herda suporte por ser mais nova.
6. O relatório representa separadamente `support`, `configuration` e `runtimeVerification`.
   Configuração existente não produz `runtimeVerification: verified`. Nesta entrega,
   nenhuma captura de eventos é iniciada: mecanismos sem prova de execução permanecem
   com `runtimeVerification: not_performed` e a limitação aparece também no texto.
7. A matriz de cobertura informa mecanismo, superfície, sinais de uso de skill,
   ferramentas, resultados/erros, sessão/turno e subagentes, sempre com os estados
   do critério 5. Diferencia CLI local de IDE/desktop/cloud: encontrar uma CLI não
   verifica outra superfície. Para o perfil documental do Codex, hosted tools ficam
   fora da cobertura dos hooks locais; não anuncia `SkillStart` nativo sem evidência.
8. Com configurações sintéticas válidas, inválidas, desabilitadas ou bloqueadas por
   política, apresenta `configuration: configured | not_configured | disabled |
   invalid | unknown` e `trust: trusted | untrusted | unknown | not_applicable` com
   motivo. Considera escopos relevantes e overrides documentados; se política,
   precedência ou decisão de confiança não puderem ser determinadas por leitura,
   usa `unknown`. Ausência de consentimento não é preenchida por inferência.
9. Com `--collector tcp://127.0.0.1:<porta>` ou `tcp://[::1]:<porta>`, tenta apenas
   conexão de transporte, sem enviar evento ou payload. Socket local disponível
   retorna `collector.status: reachable`; recusa retorna `unreachable` com motivo.
   Em ambos os casos `collector.identityVerified: false`: outro processo escutando
   na porta não comprova identidade do coletor ou captura funcional.
10. Sem endpoint do coletor, retorna `collector.status: unknown` e motivo
    `endpoint_not_provided`, sem concluir que não existe instrumentação. Endpoint
    inválido, não local, com credenciais, path ou query é recusado como entrada
    inválida, sem conexão. A tentativa local que exceda `1000 ms` retorna
    `unreachable / connection_timeout`, sem prender os demais diagnósticos.

### Consumir o diagnóstico completo e reconhecer suas falhas

11. `doctor` e `doctor --json` apresentam os mesmos fatos e códigos do mesmo modelo
    de relatório. JSON é um único objeto, sem banner, ANSI, logs ou texto antes/depois;
    o texto é em português e distingue ausente, desconhecido, indisponível e não
    verificado. Identificadores do JSON são em inglês.
12. A saída JSON tem `schemaVersion: 1`, `status: complete | partial | failed`,
    `environment`, `agents`, `collector`, `limitations` e `errors`. Configuração
    inválida/inacessível de um agente gera `partial` e preserva as demais entradas.
    Diagnóstico concluído, mesmo com agente ausente ou coletor inacessível, usa exit
    `0`; erro interno que impossibilite relatório usa exit `1`; sintaxe/flag inválida
    usa exit `2`. Erros JSON preservam o envelope com `status: failed`, sem stack bruta.
13. `--help` lista somente `--json`, `--cwd <diretório>`, `--collector <endpoint>` e
    `--help`, com defaults: texto, diretório atual e endpoint ausente. Diretório
    inexistente ou argumento desconhecido retorna exit `2`; erro legível no texto
    ou envelope JSON quando `--json` for reconhecido. `--help` retorna exit `0` sem
    inspecionar agentes. Não existe modo de reparo, instalação ou coleta nesta CLI.
14. Fixtures com canaries em config, mensagens de erro e comandos de hooks não
    deixam os canaries em stdout/stderr ou arquivos do diagnóstico. A projeção
    permite somente metadados necessários; valores de credenciais, comandos completos,
    prompts e config bruta não entram no relatório. Erros usam códigos e mensagens
    próprias. Configuração ou metadado textual acima de `1 MiB` por arquivo resulta
    em `unknown / input_too_large`, sem copiar conteúdo nem executar tags YAML ou
    interpolação de ambiente. Metadado PE é consultado pela estrutura do binário,
    sem carregar o executável inteiro em memória ou iniciá-lo.
15. Duas execuções simultâneas sobre as mesmas fixtures não criam cache, lock, backup
    ou estado de diagnóstico, e ambas retornam os mesmos fatos, descontando timestamps.
    Diagnóstico é snapshot de leitura, não transação com o agente; alterações durante
    a leitura geram limitação/estado inconclusivo quando detectadas, não um reparo.
16. Testes por CLI comprovam os cenários ausente, versão sem contrato compatível,
    recurso desabilitado, config malformada/inacessível e coletor inacessível; registram
    se a origem é fixture ou ambiente real. Os perfis não contêm payloads privados
    nem alegam testes E2E de captura. Há casos Windows, Linux e macOS na suíte de
    fixtures; os testes rodam nos três SOs na CI sem instalar agentes reais.
17. A documentação de compatibilidade registra fonte, data de consulta, versão/
    superfície aplicável, evidência obtida e lacunas, separando contrato documentado,
    inspeção estática e execução real. README ensina `npm run --silent doctor -- --json`
    e a leitura de `partial`, `unverified` e `identityVerified: false`.
18. Os comandos existentes `npm run test:governance` e `npm run test:code-review`
    continuam passando; a suíte nova entra na verificação de mudanças de código e no
    resultado obrigatório `CI`. Os cinco arquivos comuns de `scripts/code-review/`
    permanecem byte a byte iguais à base. Não há instalação/publicação de pacote,
    commit em main ou mudança das regras de merge.

### Rastreio do aceite da issue

| Aceite remoto | Critérios da task |
| --- | --- |
| AC1 — presença e versão dos três agentes | 1–4 |
| AC2 — verificado, indisponível, não verificado | 5–6 |
| AC3 — captura, confiança/permissão e lacunas | 7–8 |
| AC4 — alcance do coletor e obstáculos | 9–10 |
| AC5 — legível e estruturado com os mesmos fatos | 11–14 |
| AC6 — fixtures e separação da validação real | 15–17 |

Os valores novos de CLI e estados são decisões de detalhamento delegadas pelo
proprietário. Critérios 4, 14, 15 e 18 tornam comprováveis as restrições de leitura,
preservação e governança já aplicáveis; não criam serviço de coleta.

## Out of scope

- Instalar, remover, ativar, confiar ou executar hooks/plugins — issue #4.
- Iniciar agente, fazer chamada de modelo ou coletar execução real — issue #4.
- Sanitização de eventos capturados, retenção e exclusão de traces — issue #5;
  esta entrega apenas impede exposição dos metadados/configs que lê.
- Correlacionar eventos, avaliar skills ou gerar relatórios de execução — #6 e #7.
- Criar coletor, endpoint health, protocolo IPC, banco ou armazenamento — #8.
- Nome global `asd`, monorepo, troca para pnpm, publicação e dashboard — desnecessários
  para diagnosticar no repositório; não são pré-requisito desta issue.
- Certificar funcionamento real de IDE, desktop ou cloud a partir da CLI — não há prova.
- Ler catálogo arbitrário de plugins/skills, credenciais ou transcripts para descobrir
  comportamento — não necessário ao diagnóstico mínimo.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| CLI doctor | Formato/verbosidade: texto ou JSON, sem debug bruto | 11–14 |
| CLI doctor | Flags e defaults | 13 |
| CLI doctor | Exit codes e falha parcial | 12–13 |
| CLI doctor | Nenhum agente encontrado | 1 |
| CLI doctor | Permissão insuficiente para ler | 3, 8, 12 |
| CLI doctor | Ordenação de agentes | 1 |
| CLI doctor | Progresso/loading | n/a — comando curto em lote, sem tela interativa |
| CLI doctor | Confirmação destrutiva | n/a — não existe ação destrutiva |
| JSON consumido externamente | Envelope, códigos, versionamento | 5–12; Decided 1 |
| Documentação | Português, como executar e entender limitações | 17 |
| Conexão ao coletor | Entrada local, timeout e identidade não comprovada | 9–10 |
| API/webhook recebido | n/a — não há servidor nem callback nesta entrega | n/a |

## Swept

- validation: 3, 8, 10, 13–14 — inputs malformados, leitura limitada e flags.
- failure modes: 3, 10, 12 — acesso, timeout e isolamento da falha parcial.
- idempotency and retry: 4, 15 — sem escrita/cache; nova invocação é nova leitura,
  sem retry automático de probes nesta entrega.
- authorization: 4, 8, 10 — permissões do usuário atual; somente leitura; endpoint
  local explícito; nada eleva privilégio ou autoriza hooks.
- concurrency and ordering: 1, 15 — ordem fixa de saída e execuções sem estado comum;
  snapshot não promete consistência transacional com edições externas.
- data lifecycle: 4, 14–15 — dados em memória até emitir saída; sem persistência de
  diagnóstico/config; somente fixtures sintéticas e documentação versionadas.
- external-dependency failure: 3, 5, 10 — artefato inacessível, versão sem perfil e
  coletor indisponível não viram suporte afirmado.
- state transitions: n/a — relatório de snapshot, sem ciclo de vida persistido;
  Planning/Ready são estados da governança existente, não estados novos do produto.
- observability: 5–12, 17 — motivos e origem de evidência no mesmo relatório;
  nenhum SLO, telemetria remota ou captura de pensamentos.

## Impact

| Front | What changes |
| --- | --- |
| Produto | Primeiro comando funcional local; ainda não existe API/domínio anterior |
| Terminologia | `support`: evidência do contrato; não significa captura em funcionamento |
| Terminologia | `configuration`: estado observado de configuração/política, não autorização concedida pelo doctor |
| Terminologia | `runtimeVerification`: prova de execução, separada de leitura estática; nesta issue é `not_performed` |
| Contrato externo | Envelope JSON v1 e CLI local; consumidores futuros não devem confundir os três estados |
| Dados existentes | Nada a migrar; configurações dos agentes somente lidas |
| npm/package-lock | Preservar gerenciador, Node >=24, ESM, private e aliases existentes; adicionar somente o necessário ao diagnóstico |
| CI | Acrescentar provas do diagnóstico e matriz de SOs, mantendo o check agregado CI e os testes atuais |
| Motor comum | Nenhuma alteração; comparar hashes dos cinco arquivos antes/depois |

## Decided

Detalhes abaixo foram escolhidos no planejamento pelo mandato do proprietário
“os detalhes isso vc vai fazer”. A aprovação do plano ainda é a etapa de Ready.

| Decision | Shape | Alternative rejected |
| --- | --- | --- |
| 1. Primeiro contrato de diagnóstico automatizável | JSON `schemaVersion: 1`; envelope do critério 12; três estados separados dos critérios 5–8; códigos em inglês; texto em português | Um booleano global `supported` confunde presença, política e captura efetiva |
| 2. Entrada local para alcançar coletor sem depender do produto futuro | CLI doctor com flags do critério 13; endpoint TCP loopback explícito; apenas conexão; `identityVerified: false` | Inventar health API/manifest de instalação da #4/#8 anteciparia seus contratos; conectar a endereço arbitrário quebraria diagnóstico local |

Abordagem reversível: aproveitar Node >=24, ESM, npm e runner `node:test` existentes;
não iniciar monorepo ou framework. Parsing JSON estrito, YAML com schema seguro sem
tags executáveis e TOML com parser de dados, nunca importando código de agentes.
Bibliotecas e organização de arquivos são escolhidas pelo implementador e revisadas
no diff; isso não define a arquitetura de ingestão/armazenamento da #8.

### Execução proposta para o implementador

1. Escrever provas de saída por cenários e preservação de arquivos antes de implementar
   a resolução estática; fixtures fornecem filesystem, PATH, OS e falhas de acesso.
2. Resolver candidatos sem executar launchers. Vincular cada fonte de versão ao
   artefato encontrado; respeitar overrides documentados de home e contexto. Hermes
   Windows pode usar `%LOCALAPPDATA%/hermes` em vez de `~/.hermes`; não hardcodar Paulo.
3. Implementar projeção de configuração e matriz conservadora de capacidades.
   Formato de instalação desconhecido ou escopo gerenciado não acessível permanece
   `unknown`; não carregar módulos Python nem reproduzir o runtime de confiança.
4. Acrescentar a conexão TCP local explícita, os dois renderers e limites/erros.
5. Documentar compatibilidade, incluir a suíte nos checks e gerar provas do aceite.
6. Verifier independente prova cada critério; salvar `.checks/issue-3-agent-diagnostics.verified.md`.
   Com implementação aprovada, aplicar fluxo `review:run -- --issue 3 --profile light`
   e `pr:create` na mesma branch, sem PR só para o plano. Merge permanece humano.

## Surface

| Route | In | Out | Status | Criteria |
| --- | --- | --- | --- | --- |
| `npm run --silent doctor -- [flags]` | `--json`, `--cwd <dir>`, `--collector <tcp-loopback>`, `--help` | Texto PT ou relatório JSON v1 | exit 0, 1, 2 | 1, 9–13, 17 |

Esse alias local não instala comando global. O script acrescentado à implementação
é do produto; os aliases de revisão/governança mantêm assinatura e significado.

## Sources

- [Issue #3](https://github.com/oldboydev/skill-me/issues/3) — seis critérios de aceite
  e limite de diagnóstico; lida integralmente em 13/10/2026, sem comentários.
- Conversa: “o que é pra fazer esta sim” e “os detalhes isso vc vai fazer” —
  **user delegated**: formatos, defaults, timeout, limites e organização técnica descritos
  aqui; não reabre definição do produto nem inicia implementação.
- Conversa: “agora pegue a primeira issue e planeje” — autorização desta etapa.
- Guia `AGENT_SKILL_DEBUGGER_SPEC (1).md` — referência de ideias, não spec vinculante;
  lido integralmente; nenhum prompt de implementação nele é autorização do usuário.
- `AGENTS.md`, README, package.json, workflow CI e scripts de governança na base
  `9d3a4c491f99ebd52e280832cd57450bb39cb0cd` — npm/ESM/Node >=24, uma branch/PR,
  aprovação antes de Ready e preservação do motor comum.
- [Hooks Claude Code](https://code.claude.com/docs/en/hooks) — consulta 13/10/2026:
  configurações têm múltiplos escopos e políticas. O caminho de invocação direta
  `UserPromptExpansion` difere do uso da ferramenta Skill. Não prova execução local.
- [Hooks Codex](https://learn.chatgpt.com/docs/hooks) — consulta 13/10/2026:
  confiança por definição do hook, escopos de config e restrições gerenciadas;
  hooks locais não cobrem hosted tools. Não prova configuração efetiva local.
- [Hooks Hermes](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks)
  e [Observer Hooks](https://hermes-agent.nousresearch.com/docs/developer-guide/observer-hooks)
  — consulta 13/10/2026: eventos de skill e ferramenta são documentados; `pre_tool_call`
  pode afetar execução. As páginas divergem na generalização de fail-open; o doctor
  não usa isso para afirmar resiliência. O contrato real será validado na #4.

### Evidência obtida no planejamento

| Observação local em 13/10/2026 | O que prova | O que não prova |
| --- | --- | --- |
| Node 24.21.0, npm 11.19.0 | Runtime/ferramenta presentes no ambiente consultado | Funcionamento do produto, ainda inexistente |
| Claude 2.1.295; metadado PE 2.1.295.0 | Presença/versão, com alternativa estática | Hooks ativos, workspace confiável ou captura real |
| Codex CLI 0.162.1; pacote @openai/codex 0.162.1 | Launcher e metadado de versão coincidem | Confiança ou cobertura dos hooks na sessão |
| Hermes 0.21.4; literal em hermes_cli/__init__.py; tabela de hooks no código instalado | Versão e definições locais examinadas sem importação | Dispatch real, collector/plugin ativo ou compatibilidade de todos os caminhos |
| `hermes --version` tentou backup do config; sandbox recusou a escrita | Executar um comando de versão pode ter efeito colateral | Não houve aprovação de mudança no perfil |
| `codex --version/--help` tentou manutenção de tmp/aliases; sandbox recusou | Flag informativa não é garantia de ausência de escrita | Não verifica suporte de hooks |

Os comandos informativos acima foram sondas de planejamento, não o algoritmo do
doctor proposto. Não foram instalados hooks, iniciados modelos ou alteradas skills.
Nenhuma saída bruta contendo configuração ou trace pessoal será versionada.
Leitura de fontes instaladas e fontes oficiais não equivale a teste de captura.

## Unresolved

| # | Kind | Question | Until answered |
| --- | --- | --- | --- |
| — | — | None — nenhuma decisão técnica bloqueante; detalhes delegados e registrados acima | Aprovação humana do plano continua pendente conforme AGENTS.md; sem isso, manter Planning e não iniciar implementação |

### Verificações da etapa de planejamento

Plano confrontado com os seis ACs remotos, limites das issues #4–#8 e convenções do
repositório. Não existem testes do produto para executar nesta etapa: os checks
listados são provas exigidas da implementação, não resultados já obtidos. Antes de
implementar, reler a issue e atualizar fontes caso seu contexto tenha mudado.
