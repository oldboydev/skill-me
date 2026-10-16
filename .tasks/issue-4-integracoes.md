# Issue #4 — observar execuções em Claude Code, Codex e Hermes

> Implementar com **tlc-implement**, perfil `light`, depois da aprovação deste plano
> e da resolução de U1. Cada critério vira check com prova referenciada pelo número.
> Grok ou Claude implementa e executa as provas; Codex local revisa em processo novo,
> cópia isolada e sandbox somente leitura. Nada em `Unresolved` é autorização para
> decidir escopo durante a implementação.

## Intent

A execução de uma skill ocorre dentro do agente. O usuário não consegue reconstruí-la
apenas lendo `SKILL.md`; o `doctor` existente informa presença, configuração e evidência
estática, mas não recebe eventos. A issue não fornece métricas de impacto.

A entrega observa os mecanismos expostos por versões identificadas de Claude Code,
Codex e Hermes, encaminha eventos ao consumidor do núcleo e permite instalar/remover
as integrações preservando configurações, confiança e arquivos de terceiros. O relatório
da entrega distingue contratos documentados, fixtures e execução real.

14 critérios em 5 fatias observáveis · 2 contratos externos novos propostos ·
1 decisão aberta que bloqueia implementação (U1).

Status: **Planning**, proposta para aprovação. Autorização em 16/10/2026:
“pode puxar e seguir”, após identificar #4 em Ready for Agent. Isso autoriza assumir
e planejar a issue; não resolve a fronteira nova com #5/#8 nem instala nada no perfil pessoal.
Base: `236e999fddb4c096634284e426d9d4db5ac526fa`.
Branch da entrega: `codex/issue-4-integracoes`.

### Recorte e tamanho

Uma task e uma branch/PR para a issue inteira, conforme AGENTS.md. As fatias são:
observar Claude; observar Codex e supervisionar `exec`; observar Hermes; instalar e
remover com segurança; comprovar tolerância a falhas e cobertura. Nenhuma sub-issue
foi criada. O tamanho vem de três contratos nativos diferentes, um modo supervisionado
e mutações reversíveis em configurações, não da quantidade de arquivos.

A fronteira que exige decisão é anterior às três integrações: hoje não existe
consumidor de eventos nem política compartilhada de sanitização. A issue atribui essas
responsabilidades a #8 e #5. Implementá-las integralmente em #4 ampliaria o escopo;
implementar três substitutos privados duplicaria regras. A recomendação em U1 mantém
esta entrega e torna a limitação verificável, sem prometer o núcleo de traces.

## Criteria

### S1 — observar Claude Code e distinguir caminhos de uso de skill

1. Em fixture vinculada a uma versão do Claude, a integração encaminha os fatos de
   `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, início/fim de sessão e subagentes
   que o contrato dessa versão expõe, conservando nomes e identificadores nativos;
   campos/eventos ausentes aparecem como lacunas, nunca como valores fabricados (AC1).
2. A prova do Claude contém dois cenários separados: invocação pelo agente através
   da ferramenta `Skill` e invocação direta por `/nome`. Quando o contrato comporta
   `UserPromptExpansion`, o segundo cenário observa esse evento; não depende de
   `PreToolUse` da ferramenta `Skill`. Um caminho não suportado fica explicitamente
   pendente ou indisponível com a fonte que fundamenta a classificação (AC2, AC3).

### S2 — observar Codex e acompanhar uma execução supervisionada

3. Para uma versão contratada do Codex, os hooks locais encaminham ferramentas,
   resultados e ciclo de vida disponíveis sem afirmar cobertura de hosted tools.
   Sem sinal nativo de início de skill, leitura de `SKILL.md` não produz evento
   nativo de execução nem atribuição forte; indicação supervisionada e eventual
   inferência ficam identificadas como tais (AC1, AC2, AC4).
4. No modo supervisionado, `codex exec --json` é iniciado com o vetor de argumentos
   fornecido, acrescido apenas de `--json` quando necessário, sem remontar texto em
   shell. `cwd`, stdin, ambiente de permissões e flags de sandbox/aprovação mantêm
   seus valores; não são acrescentados bypasses ou aprovação automática. Fixtures
   exercitam argumentos com espaços, Unicode e metacaracteres como argumentos literais
   e comprovam que o wrapper não os executa como comandos (AC4, restrições).
5. Com processo filho saindo com 0 ou 17, o wrapper termina respectivamente com 0 ou
   17, inclusive quando o destino de observação falha. A prova cobre também falha de
   spawn e interrupção conforme o contrato da plataforma; eventos `thread.started`,
   `turn.*`, `item.*` e `error` reconhecidos são consumidos incrementalmente.
   Stderr do filho continua separado do canal de eventos; nenhuma mensagem de
   raciocínio é incorporada aos dados do debugger (AC4, AC7, AC9).

### S3 — observar Hermes sem alterar as decisões do agente

6. Um plugin nativo, carregado pelo contrato público `register(ctx)`, recebe
   `pre_tool_call`, `post_tool_call`, `on_skill_lifecycle`, eventos de sessão e
   subagente existentes no perfil validado. Callbacks aceitam campos aditivos,
   preservam os IDs fornecidos e deixam campos ausentes inconclusivos.
   `on_session_end` conserva o significado de fim de run/turno observado, sem
   convertê-lo em fim definitivo da skill ou da identidade de sessão (AC1, AC2, AC5).
7. Callbacks do Hermes devolvem `None`; não modificam argumentos/resultados nem
   retornam diretivas de aprovação, bloqueio ou contexto. Falha, fila cheia ou destino
   travado não propagam exceção nem espera ao callback `pre_tool_call`.
   A prova exercita o dispatch real do perfil em ambiente isolado, com destino que
   não responde e com falha do consumidor, e confirma a execução da ferramenta
   inalterada. Sanitização, persistência e atribuição não são reimplementadas no
   plugin Python (AC5, AC7).

### S4 — instalar e remover preservando o que já existe

8. A prévia de instalação mostra alvos e alterações próprias sem escrever arquivos
   nem iniciar agentes. Aplicação só acontece por operação explícita sobre o alvo
   indicado; políticas gerenciadas, flags de confiança, sandbox e hooks de terceiros
   não são alterados. Configuração ilegível/inválida não é substituída por defaults;
   alvo fora do diretório autorizado ou link que escape dele é recusado (AC6, restrições).
9. Partindo de configurações válidas com entradas de terceiros, instalar duas vezes
   produz uma única instalação própria e mantém os valores alheios. Duas aplicações
   concorrentes não duplicam entradas nem sobrescrevem uma edição externa: uma
   operação conflitante falha explicitamente e deixa os arquivos preexistentes
   preservados (AC6).
10. Remover uma instalação reconhecida exclui somente entradas/artefatos cuja
    identidade e conteúdo correspondem ao registro próprio. Uma alteração posterior
    do usuário na entrada própria é preservada e reportada como conflito; mudanças
    em entradas de terceiros também são preservadas. Remover novamente não apaga
    nada adicional. Uma falha de aplicação/remoção é reportada como incompleta,
    sem declarar sucesso de uma operação parcial (AC6).
11. Em cada agente, o SHA-256 de todos os arquivos da skill de terceiro usada na
    prova é idêntico antes/depois da instalação, observação e remoção. O mecanismo
    instala artefatos próprios fora dessa árvore; não adiciona frontmatter, hooks ou
    marcadores à skill (AC8).

### S5 — observar falhas e limites sem interromper o agente

12. Para cada adaptador, fixtures de consumidor ausente, recusa, desconexão,
    timeout, entrada inválida e limite excedido preservam o fluxo do agente:
    handlers de comando do debugger não emitem decisões e retornam sucesso neutro
    no contrato do evento; callbacks mantêm o retorno neutro do critério 7;
    o wrapper conserva o resultado do filho do critério 5. Conteúdo bruto não é
    despejado em logs, stderr, arquivos temporários ou retries (AC7, AC9, #5).
13. Cada fixture tem origem sintética/sanitizada e referência de versão/contrato,
    incluindo casos válidos e inválidos. Evidências registram separadamente testes
    determinísticos, execução nativa local e E2E real opt-in; agente, credencial,
    confiança ou ambiente ausente gera pendência identificada, nunca pass de E2E.
    A matriz por agente informa o que foi observado e o que continua sem prova
    (AC1, AC9).
14. Dados encaminhados passam pela fronteira compartilhada de #5/#8 aprovada em U1.
    Sem ela disponível, a integração declara observação inativa e deixa o agente
    seguir; um receptor de teste não é anunciado como ingestão real nem como
    sanitização completa. O `doctor` conserva sua interface e
    `runtimeVerification: not_performed`; resultados de execução pertencem à nova
    integração, sem promover a evidência estática anterior (AC1, AC5, AC7, AC9).

## Out of scope

- Implementar a política integral de coleta/retenção da #5 ou o serviço/armazenamento
  de traces da #8 sem nova autorização. U1 trata somente da fronteira mínima.
- Reconstrução de timeline, deduplicação analítica e atribuição de skill (#6);
  comparação de instruções e relatórios de conformidade (#7).
- Pausa/step, dashboard, publicação de pacote, deploy, telemetria remota ou upload.
- Instalação real em perfis pessoais, ligar plugins/hooks no perfil usado pelo
  proprietário, consumir créditos de E2E ou conceder confiança automaticamente.
  Fixtures isoladas não exigem essas ações.
- Monkey patch de agentes, leitura de transcrições pessoais, captura de raciocínio
  privado e alteração de skills de terceiros.
- Refatorar o `doctor`, inventar novos frameworks/pacotes ou modificar o motor
  vendorizado de revisão. Reusar contratos compatíveis pelos exports existentes.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| comandos de integração | ações de prévia, instalação e remoção; defaults seguros | 8–10; assinatura candidata abaixo, sujeita a U1 |
| comandos de integração | texto/JSON, códigos de uso/conflito/falha parcial | U1 — fechar junto da fronteira aprovada; sem inventar API pública antes disso |
| execução supervisionada | argumentos, stdin, cwd, permissões, saída e interrupção | 4, 5; política de encaminhamento/persistência de stdout em U1 |
| hooks de comando | entrada, saída neutra e falha do consumidor | 1, 3, 12 |
| plugin Hermes | callback público, retorno e falha do destino | 6, 7 |
| fronteira com núcleo | formato, versão, limites e falhas | 14; U1 |
| configuração instalada | identidade própria, conflito, concorrência, remoção | 8–10 |
| guia de uso | instalação isolada, confiança manual, versões e lacunas, próximo passo | 2, 3, 13, 14 |
| telas/HTTP público/agendamento | estados visuais, densidade, autenticação e rate limit | n/a — não há essas superfícies na #4 |

## Swept

- validation: 8, 12, 13; schema de integração ao núcleo depende de U1.
- failure modes: 5, 7, 10, 12.
- idempotency and retry: 9, 10; retries de transporte, se existirem, ficam no contrato
  aprovado em U1, nunca em três implementações independentes.
- authorization: 4, 8; confiança continua nativa/manual; instalação pessoal fora do escopo.
- concurrency and ordering: 9 cobre escritores concorrentes e edições externas;
  1, 3, 6 preservam IDs sem reordenar ou correlacionar por conta própria. Ordenação
  da timeline fica em #6; filas/limites de transporte dependem de U1.
- data lifecycle: 10, 11, 12, 14; retenção/exclusão de traces ficam em #5/#8.
- external-dependency failure: 5, 7, 12, 13.
- state transitions: 8–10 — ausência → prévia sem mutação → instalação reconhecida
  → remoção reconhecida; edição posterior → conflito preservado, não remoção forçada.
- observability: 2, 3, 12–14; códigos/contadores de descarte definidos em U1.

## Impact

| Front | What changes |
| --- | --- |
| produto existente | `doctor` continua somente leitura e não executa agentes; nenhum campo existente ganha significado de captura real |
| runtime/toolchain | Node >=24, ESM, npm e `node:test` existentes permanecem; plugin Hermes precisa de Python compatível com a instalação testada, sem dependência Python adicional presumida |
| configurações externas | novas entradas/arquivos próprios, acompanhados de registro de instalação; sem migração de configuração alheia |
| dados armazenados | hoje não há traces do produto; #4 não cria banco, retenção ou spool de payloads |
| documentação | nova matriz de execução, separada da matriz estática de `docs/agent-compatibility.md` |
| verificações | novas provas dos adaptadores/instalação; checks existentes de governança, revisão e doctor permanecem; integração à CI no futuro diff deve respeitar a matriz declarada |

### Ancoragem no código

- `src/doctor/agent-resolution.mjs` exporta `resolveAgents`; a descoberta de launchers
  já existe, não deve ser copiada. Perfis/limites do doctor não comprovam execução.
- `src/doctor/config-sources.mjs` exporta os resolvedores de escopo; leitura de caminhos
  pode ser reutilizada, mas os readers atuais não são writers de configuração.
- `src/doctor/fs-adapter.mjs` e `snapshot-read.mjs` já recusam arquivos não regulares
  e limitam leitura; não existe escrita com controle de conflito. Não estender o
  adaptador de leitura apenas para acomodar uma responsabilidade distinta.
- `src/doctor/collector-probe.mjs` prova apenas conectividade TCP loopback e deixa
  `identityVerified: false`; não é protocolo de ingestão nem autentica um coletor.
- `src/doctor/run-diagnostics.mjs` mantém `runtimeVerification` estático. A #4 não
  deve falsificar esse resultado ao usar um consumidor simulado.
- `package.json` é privado; não há servidor, transporte de eventos ou política comum
  de sanitização para reutilizar. `CONTRIBUTING.md` e o guia SPEC citado pela issue
  não foram encontrados no checkout atual; a issue e AGENTS.md vinculam o escopo.

## Decided

As regras de autoria, privacidade, confiança e uma branch/PR já vêm das fontes.
Os dois contratos novos abaixo são **propostas**, dependentes de aprovação e U1;
nenhuma definição de wire format passa a aprovada apenas por aparecer neste arquivo.

| Decision | Shape | Alternative rejected |
| --- | --- | --- |
| Fronteira única com #5/#8 | entrada nativa → política comum → entrega ao consumidor; preservação de origem/IDs e descarte explícito; detalhes ainda em U1 | três sanitizadores/coletores privados repetiriam regras das outras issues |
| Propriedade da instalação | registro versionado de alvos e identidade/hash somente de entradas/artefatos próprios; conflito preserva conteúdo editado; nunca backup integral com secrets | restaurar o arquivo inteiro apagaria edições posteriores e copiaria dados alheios |

### Ordem e opções técnicas para implementação após aprovação

1. Fechar U1 e congelar o contrato mínimo aprovado, com fixtures de sucesso e falha.
2. Claude: separar as duas invocações de skill antes de tratar o restante do ciclo.
3. Codex: hooks locais e wrapper de `exec --json`, provados como superfícies distintas.
4. Hermes: plugin público com callback sem espera por I/O; não registrar wrappers
   modificadores. A fila não bloqueante é justificada pelo timeout observado no host,
   não por uma meta inventada de desempenho. Overflow é perda declarada.
5. Instalação/remoção: plano de mutações próprio, leitura validada, lock por alvo,
   conferência da revisão lida antes de escrever e atualização recuperável. O teste
   deve comprovar conflito sem perda; lock só entre processos do skill-me não resolve
   edição por um terceiro. A estratégia concreta fica no diff, subordinada ao critério 9.
6. Provas de fronteira, documentação e verificação independente; revisão formal só
   depois da implementação completa, evidências e commit limpo.

Assinatura candidata, para tornar U1 revisável: comando separado de `doctor`,
`integrations plan|install|uninstall --agent <claude|codex|hermes> --target <diretório>`;
prévia sem escrita é o default e aplicação é explícita. Wrapper candidato:
`integrations run --agent codex -- <argumentos de exec>`. Nomes e disposição são
reversíveis; formatos consumidos por outras issues, limites, saída e códigos ainda
precisam ser fechados em U1. Não instalar estes comandos durante o planejamento.

## Contratos examinados e provas previstas

Consulta em 16/10/2026, somente leitura. Documentação corrente não é prova de execução
nem estabelece sozinha o perfil de uma versão. Não foram iniciados agentes/modelos,
importados módulos Hermes, executadas skills ou instalados hooks.

| Agente | Fato conferido | Consequência para as provas |
| --- | --- | --- |
| Claude | documentação distingue `UserPromptExpansion` de chamadas à ferramenta `Skill`; metadado PE local agora é `2.1.299.0`, diferente do perfil estático `2.1.295` do doctor | fixtures devem declarar a versão real que representam; presença/versão não basta para comprovar dispatch |
| Codex | pacote local `@openai/codex` informa `0.162.1`; docs separam hooks locais, confiança por definição e fluxo `exec --json` | duas suítes de fronteira e lacunas explícitas; não passar bypass de confiança para facilitar E2E |
| Hermes | fonte local declara `0.21.4`; `plugins.py` registra callbacks; `plugins_dispatch.py` distingue o timeout de `pre_tool_call` dos observers | provar caminho de falha usando o dispatch dessa revisão, sem presumir fail-open universal |

No Hermes, `plugins.py:1747` documenta que timeout de `pre_tool_call` devolve bloqueio;
`plugins_dispatch.py:49` o classifica entre hooks fail-closed. Isso é mais específico
que a generalização fail-open da documentação. O plano não altera o host nem suas
políticas para esconder essa diferença. O nome de versão sozinho também não fixa
a revisão de uma instalação editável.

Hashes SHA-256 lidos das fontes locais em `hermes-agent/hermes_cli/`:

- `__init__.py`: `401221c84bca43ca48a51484b761c7aafa67fad6f6549f8df6d2444babcdaeb7`.
- `plugins.py`: `51c7fdd506b187c8713e706a7b264614902b28039e79875770e4b120180b423c`.
- `plugins_dispatch.py`: `fd1185e23edb80234e3f816a2fbbf990cdab37a3bf5c3d98b38337c7dd50e330`.

Estes hashes documentam a inspeção; não demonstram que o launcher importaria esse
checkout nem autorizam copiar configurações pessoais para fixtures. Antes de declarar
suporte, o builder vincula revisão/versão e congela os payloads sanitizados com origem.

Provas derivadas dos critérios: eventos válidos/ausentes/malformados; duas invocações
Claude; erro de ferramenta; execução Codex 0/17, spawn, interrupção e fluxo incremental;
Hermes com destino travado; consumidor ausente/desconectado; instalação repetida e
concorrente; edição externa entre prévia e aplicação; remoção com conflito; rollback
de falha parcial; SHA-256 da árvore de skill; caminhos com espaços/Unicode; canaries
sintéticos em payloads e mensagens de erro. Asserções verificam decisões exatas,
não apenas presença de saída. Windows local e matriz já declarada em CI têm evidências
separadas; plataforma não exercitada fica pendente, nunca aprovada por simulação de path.

Evidências de implementação ficam em `.checks/issue-4-integracoes*`, com contagem
real de testes, falhas/skips e cobertura por critério. Não criar `.verified.md` de
aprovação nesta etapa: a implementação ainda não existe. Verifier independente
posterior precede `npm run review:run -- --issue 4 --profile light`; teto de duas
tentativas, sem consumir rodada apenas para revisar este rascunho. Com `ready`, push
e PR pelo `npm run pr:create`, incluindo `Closes #4` apenas quando todos os critérios
estiverem atendidos. Merge continua humano.

## Sources

- [Issue #4](https://github.com/oldboydev/skill-me/issues/4): texto e 9 AC lidos integralmente
  em 16/10/2026, sem comentários naquele momento; AC1–AC9 acima seguem a ordem da lista.
- Issues [#5](https://github.com/oldboydev/skill-me/issues/5),
  [#8](https://github.com/oldboydev/skill-me/issues/8) e
  [#6](https://github.com/oldboydev/skill-me/issues/6): fronteiras citadas pela #4;
  #5/#8 foram relidas integralmente em 16/10/2026: #5 exige minimização por padrão
  e sanitização antes de persistir; #8 é dona do contrato versionado, transporte e
  armazenamento. Não há contrato concreto nessas issues que possa ser copiado hoje.
- Conversa de 16/10/2026: `Ready` exige plano aprovado; #4 estava em `Ready for Agent`;
  proprietário autorizou “pode puxar e seguir”. Detalhes de planejamento delegados
  ao agente conforme a própria issue; escopo adicional exige decisão explícita.
- `AGENTS.md`, `package.json`, `.github/workflows/governance.yml`,
  `scripts/code-review/README.md` e fontes citadas em Impact, na base acima:
  autoria, rigor, runtime, limites e comportamento existente.
- [Hooks Claude Code](https://code.claude.com/docs/en/hooks): caminhos de skill e eventos;
  documentação corrente consultada, sem prova de runtime.
- [Hooks Codex](https://learn.chatgpt.com/docs/hooks): confiança, superfície local e saída neutra;
  [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode): JSONL supervisionado.
- [Hermes Event Hooks](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks),
  [Plugins](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins) e
  [Observer Hooks](https://hermes-agent.nousresearch.com/docs/developer-guide/observer-hooks):
  interfaces públicas e significado dos eventos; ressalva de timeout conferida nas fontes locais.

## Unresolved

| # | Kind | Question | Until answered |
| --- | --- | --- | --- |
| U1 | blocks implementation | Autorizar nesta #4 somente a fronteira mínima compartilhada de eventos, política conservadora sem conteúdo bruto e consumidor de teste em memória (recomendado), ou priorizar o planejamento/entrega de #5/#8 antes dos adaptadores? | Manter Planning. A opção recomendada não entrega servidor, armazenamento, retenção nem coleta opt-in de conteúdo: #5/#8 permanecem donas dessas capacidades. Antes de codificar, anexar aqui a assinatura/envelope, campos permitidos, tratamento de stdout do wrapper, limites/timeouts e códigos exatos aprovados, com compatibilidade explicitada para #5/#8. Não chamar receptor de fixture de núcleo real. Se a escolha for #5/#8 primeiro, não abrir novas issues nem alterar sua prioridade sem executar a autorização recebida. |

Aprovar apenas a existência deste arquivo não resolve U1. Nenhuma instalação real
nem E2E com consumo externo foi solicitada ou é condição para decidir essa fronteira.
