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
| Configuração do usuário | `<home>/.skill-me/observe.json` (home de `os.homedir()` no Node e `Path.home()` no plugin: `USERPROFILE` no Windows, `HOME` no POSIX), gravado só por `observe setup` com temporário `wx` 0600 + `rename` em pasta 0700: `{"skillMeObserveConfig":1,"root":"<absoluto informado>","rootReal":"<caminho real no setup>","hermesDelivery":["<node>","<src/integrations/cli.mjs>","ingest","--agent","hermes"]}`; leitura limitada a 64 KiB; `setup` recusa com 4 `observe_on` enquanto houver registro da autorização ou a raiz configurada estiver `on`. Toda operação automática confere, já no store, que o caminho real da raiz ainda é `rootReal` (`root_changed`). | Estado on/off no home: não serializa com as gravações do store. Seguir uma raiz trocada por link/junção grava em outro destino. |
| Barreira da configuração | `observe setup`, `on` e `off` tomam `<home>/.skill-me-observe.lock`, direto no home e fora da pasta móvel `.skill-me`, ao lado do registro da autorização; criado com `wx` 0600 sem flush: `{"lockVersion":1,"pid":<pid>,"nonce":"<16 hex>"}`, na forma e na regra do `.lock` do store (ocupado — também por link ou junção no nome — → novas tentativas por até 2 s e então 4 `lock_present`; nunca removido por outro processo; sai só se ainda tiver os bytes gravados, senão 4 `foreign_entry`). Antes do lock, cada um só confere a pasta `.skill-me` (a referência da linha "Pasta da configuração"), e o `setup` valida a raiz nova e cria a pasta 0700. Sob o lock: `setup` relê a configuração anterior e o registro, recusa com 4 `observe_on` se houver registro ou se a raiz anterior estiver `on`, lê o estado da nova e grava a configuração; `on` lê a configuração, confere o registro (linha "Conflito com o registro") e liga a raiz; `off` desliga a raiz configurada e depois a do registro, sem soltar o lock entre as duas, também quando a configuração é recusada. Sem a pasta `.skill-me`, `on` responde 3 `not_configured` sem tomar o lock, e o `off` o toma só para a raiz do registro. Link ou junção no lugar da pasta: 4 `link_refused`. `status`, `report --latest`, hooks e ingest não tomam este lock; os produtores continuam só com o `.lock` do store. | `<home>/.skill-me/observe.lock` (forma do F1): vai junto com a pasta movida, e um `on` com o lock da pasta antiga e um `off` com o lock da nova não se revezam — o `on` repetido, parado antes do lock da raiz, religava a raiz depois de o `off` pelo registro responder, e o `status` lia a pasta nova e dizia `off` (intercalamento apontado depois da correção do F3). Mais uma conferência da pasta no `on`, sob o lock da raiz: a troca pode vir depois dela. Marcar o registro no `off` em vez de apagá-lo: mais um estado persistido e a limpeza dele para obter a ordem que o lock já dá. Manter também o lock da pasta: não protege mais nada e acrescenta um estado de queda. Conferir a raiz anterior fora de uma barreira comum: `setup` concorrente com `on` deixava a raiz anterior `on` fora do alcance do `off` (F1 da verificação, rodada 1). Lock do store da raiz anterior: não existe antes do primeiro `on` e não cobre a troca do arquivo de configuração. |
| Pasta da configuração | `<home>/.skill-me` é a fronteira de confiança da configuração. Toda leitura de `observe.json` — `setup`, `on`, `off`, `status`, `report --latest`, hooks e ingest; no plugin Hermes, a leitura do `hermesDelivery` — confere com `lstat` que a pasta é diretório real (link ou junção: `link_refused`) e guarda a identidade dela (`dev`, `ino`); depois de ler o arquivo, confere de novo: link ou junção no mesmo nome → `link_refused`; outra pasta, ausente ou não diretório → `foreign_entry` (os dois 4). `setup`, `on` e `off` usam como referência a identidade conferida antes de criar o lock do home (linha "Barreira da configuração"), de modo que a primeira conferência sob o lock já recusa uma troca anterior a ele; o `setup` confere também entre o temporário e o `rename`. Hooks e ingest levam o código ao relatório da entrega, sem gravar; o plugin fica sem entrega. O lock do home não se move com a pasta. Uma troca desfeita entre duas conferências continua fora do alcance, como no `assertUnchanged` do store. | Conferir só o arquivo, ou só antes do lock: o `lstat` do arquivo atravessa a pasta trocada, e o lock e a leitura iam para a pasta de outra configuração (F2 da verificação, rodada 2). Só o lock no home, sem esta conferência: serializa os comandos, mas não impede ler a configuração através de uma junção. |
| Registro da autorização | `<home>/.skill-me-authorization.json`, direto no home e fora da pasta móvel `.skill-me`: `{"skillMeObserveAuthorization":1,"rootReal":"<rootReal da raiz>"}`, criado com `wx` 0600 e flush, nunca reescrito; lido com `lstat` e até 64 KiB (link ou junção: 4 `link_refused`; outra entrada, ilegível ou fora da forma: 3 `config_invalid`, e o arquivo fica). Só muda sob o `.lock` do store da raiz que nomeia, sem lock novo: `on`, já com esse lock e antes de gravar `on`, cria o registro com a raiz (registro de outra raiz: 4 `observe_on`, nada é ligado; falha ao criar: nada é ligado); `off`, depois de gravar `off` e encerrar as automáticas sob o mesmo lock, apaga o registro que nomeia a raiz. `off` desliga a raiz configurada e depois, uma vez, a do registro quando for outra ou quando a configuração não puder ser lida, pela própria `rootReal` (com a conferência de `root_changed`), as duas sob o lock do home; a resposta segue a da configuração, com `changed`, `stopped` e `failed` somados, e qualquer erro sai só com o código. Invariante: raiz `on` ⇒ registro com ela; logo no máximo uma raiz `on`, e o `off` a alcança qualquer que seja a pasta `.skill-me` antes ou depois do efeito. Quedas: registro sem `on` (antes do efeito) ou `off` sem apagar o registro → o próximo `off` apaga; registro incompleto da criação → `config_invalid` até a remoção manual (o `on` dele não chegou a ligar). `setup`, `on`, `status` e `report --latest` também leem o registro (linha "Conflito com o registro"); hooks, ingest e plugin não o leem. | Só outra conferência da pasta, ou rollback do `on`: a pasta pode ser trocada depois de qualquer conferência, e um rollback interrompido deixa a raiz `on` sem caminho (F3 da verificação, rodada 3). Registro dentro de `.skill-me`: vai junto com a pasta movida. Conjunto de raízes com lock próprio no home: outro lock e outro estado de queda sem caso de uso, pois a configuração aponta uma raiz por vez. Prender a autorização à identidade da pasta: a raiz fica inerte, mas o `off` continua sem alcançá-la. |
| Conflito com o registro | `setup`, `status` e `report --latest` leem o registro com a leitura da linha anterior e os mesmos códigos (link ou junção: 4 `link_refused`; ilegível ou fora da forma: 3 `config_invalid`). Registro que nomeia raiz diferente da `rootReal` configurada, ou presente sem configuração, é conflito: `status` responde 4 `observe_on`, sem `observation` (nunca `off`); `report --latest` responde 4 `observe_on` sem escolher captura (sem configuração continua 3 `not_configured`, e configuração ilegível dá o código dela, antes do registro); `setup`, sob o lock do home, recusa com 4 `observe_on` qualquer registro presente, sem mudar a configuração. `on`, sob o lock do home, depois de ler a configuração e antes de abrir o store da raiz configurada, recusa o registro de outra raiz (4 `observe_on`), ilegível ou fora da forma (3 `config_invalid`) ou link/junção (4 `link_refused`): nada é criado ou mudado em raiz nenhuma; a conferência do registro sob o `.lock` do store (linha anterior) continua, para um registro alterado fora destes comandos. Para `on`, `status` e `report --latest`, registro da raiz configurada é o uso normal. Nenhuma resposta traz caminho; `npm run off` desfaz o conflito. Hooks, ingest e plugin não leem o registro: com outra raiz registrada, a configurada não pode estar `on`, porque o `on` dela recusa, e eles respondem `observe_off`. | Informar no `status` a raiz do registro como `on`: exporia estado, geração e capturas de uma raiz fora da configuração. `report --latest` pela raiz do registro: consulta fora da configuração. Ler o estado da raiz registrada antes de decidir: o registro já é o sinal que o `on` usa, e uma queda que deixa registro sem `on` se resolve com o mesmo `off`. Recusar o `on` só sob o lock do store: a pasta do store e o marcador da raiz configurada já estavam criados quando o registro recusava. |
| Estado da observação | `<root>/skill-me-privacy/observe.json`, gravado só sob o `.lock` do store por temporário + `rename`: `{"observeVersion":1,"state":"on"\|"off","generation":"<32 hex>"\|null,"sessionKey":"<64 hex>"\|null,"changedAt":"<ISO>","sessions":{"<HMAC-SHA-256(sessionKey, agente\0sessionId) em hex>":"<id da captura>"}}`; `on` repetido não grava; `on` depois de `off` cria `generation`, `sessionKey` e mapa novos; `off` zera os três; até 1000 sessões por geração (a mais antiga sai do mapa). | `session_id` nativo em claro no disco. Uma captura por ativação. |
| Captura automática | O `state.json` (ainda `captureVersion: 1`) ganha `"origin":"automatic"` só nas capturas criadas pela observação; as manuais não mudam. Cada sessão tem a sua, com `content: true`, retenção padrão de 7 dias, chave e limites próprios. Na entrada que não cabe (500 eventos/8 MiB), a captura cheia vira `stopped` e a sucessora é criada sob o mesmo lock, com a política reaplicada com a chave nova; numa captura vazia o limite continua sendo descarte. | Lista de automáticas no `observe.json` (cresce sem limpeza). Arquivo marcador na captura (fora do conjunto literal da exclusão). |
| Barreira do `off` | O produtor automático lê a `generation` sob o lock ao abrir; cada gravação automática — escolha ou criação da captura, política, admissão e commit — ocorre numa única tomada do `.lock`, que confere `state: "on"` e a mesma `generation` (senão `observe_off`, sem gravar e sem nova tentativa). `off` grava `state: "off"` sob o mesmo lock e então encerra (`stopped`) toda captura `origin: automatic` ativa. Produtor aberto com `off` ou numa geração anterior não grava. | Conferir on/off fora do lock (corrida com o `off`). Produtor aberto passar para a geração seguinte. |
| Roteamento | Par explícito completo continua manual e exclusivo; par incompleto ou inválido continua `binding_invalid`, sem rota automática. Sem nenhuma variável, só hooks Claude/Codex e o ingest Hermes usam a observação; `integrations run` continua só manual. A sessão é o `sessionId` aceito pela fronteira v1 (no Hermes, `parentSessionId` em evento de subagente sem `sessionId`); sem ela nada é gravado (contagem `unrouted`). | Atribuir à única sessão aberta ou converter par incompleto em vínculo. |
| Entrega Hermes | O plugin usa `SKILL_ME_HERMES_DELIVERY` quando não vazia (inalterado); sem ela, o `hermesDelivery` do `observe.json` do home. On/off, raiz e sessão continuam decididos no ingest Node. | Artefato novo no plugin instalado (muda manifesto e hashes da instalação). |
| Consulta | `report --latest` escolhe, sem criar lock, a captura `origin: automatic` de maior (`createdAt`, `id`) da raiz configurada; sem automática, 3 `no_automatic_capture`; registro de outra raiz, 4 `observe_on` (linha "Conflito com o registro"); o texto e o Markdown do relatório ganham a linha `Captura: <id>` (o JSON já trazia `timeline.capture.id`). `status` lista até 10 automáticas, da mais recente para a mais antiga. | Escolher captura manual. |

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
