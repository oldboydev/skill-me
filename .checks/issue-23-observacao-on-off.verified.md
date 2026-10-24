# Verificação independente — observação local `on/off` (issue #23)

**Veredito: FAIL**  
**Perfil:** `light`  
**Diff da feature:** `2fd303f..788d0bcc78045b8516433ae53b52a8cf7af15187`  
**Diff da correção:** `1ccfe70..788d0bcc78045b8516433ae53b52a8cf7af15187`  
**Rodada:** 2 — escopo do diff e vereditos não PASS da rodada 1  
**Verifier:** subagente independente, separado do builder

**Estado atual:** F1 corrigido nas ordens testadas; F2 novo defeito bloqueante no caminho da configuração; gate amplo Windows continua vermelho (G1). As seções “Rodada 1” abaixo preservam a evidência obtida em `8f29c40`; a seção “Rodada 2” registra as provas executadas no HEAD atual.

## Rodada 1 — fontes e alcance (carried from `8f29c40`)

| Fonte vinculante | Leitura | Resultado |
| --- | --- | --- |
| [Issue #23](https://github.com/oldboydev/skill-me/issues/23) | Corpo e comentário lidos pelo conector GitHub | Sete critérios e duas decisões aprovadas; o fluxo depende de autorização `on` até `off`. |
| `.tasks/issue-23-observacao-on-off.md` e `.checks/issue-23-observacao-on-off.md` | Abertos | Critérios, comandos, formato de disco, barreira do `off`, roteamento e consulta confrontados com o diff. A regra literal de `setup` recusar enquanto a raiz configurada está `on` ficou sem cobertura de concorrência (F1). |
| `.tasks/issue-5-privacidade.md` e `docs/privacidade.md` | Abertos | `applyPolicy`, chave por captura, 500 eventos, 8 MiB e retenção de 7 dias são contratos existentes. |
| `.tasks/issue-8-traces.md` e `docs/traces.md` | Abertos | Par manual explícito, neutralidade da entrega e prazo de 750 ms conferidos. |
| [OpenAI Docs: Hooks](https://learn.chatgpt.com/docs/hooks) | Aberta | `session_id` é campo comum; hooks alcançam ferramentas locais, não as hospedadas; os eventos listados não incluem ativação de skill. A última conclusão é inferência da lista publicada. |

O perfil `light` não executa a etapa de comparação visual `ui` nem fault injection `standard/ui`. O checklist não contém seções `Coverage` ou `Test policy`; seus `Swept` foram conferidos contra os critérios, as fontes acima e o código afetado. `git diff --check 2fd303f..HEAD` passou. O diff inclui CLI, store, hooks/ingest, plugin Hermes, relatório, documentação e testes; a revisão considerou toda essa faixa, não apenas o último commit.

## Rodada 1 — provas C1–C18 (carried from `8f29c40`)

Uma única invocação de `node --test --test-reporter=spec --test-name-pattern='<alternância C1–C18>'` com os oito arquivos de teste nomeados no checklist executou **23 testes, 23 passes, 0 falhas, 0 skips**. Cada nome apareceu individualmente no resultado. A primeira tentativa dentro do sandbox deu `io_failure` em `observe setup` ao usar fixtures temporárias; C1 passou ao ser repetido fora do sandbox, e o alvo completo passou ali. Essa limitação de ambiente não foi contada como defeito do produto.

| Check | Comportamento e asserção decisiva no teste executado | Resultado |
| --- | --- | --- |
| C1 | `tests/integrations/observe/control.cli.test.mjs:59` — `setup.body` igual ao JSON `status: "ok"`, observação `off`; `:78` — `status.body` em outro processo igual a `OFF`, zero capturas; `:88` — raiz vazia. | PASS local |
| C2 | `tests/integrations/observe/control.cli.test.mjs:117-122` — códigos exatos para raiz relativa/inexistente/arquivo e nenhuma configuração; `:142-152` — `root_changed` e nenhum arquivo no destino trocado. | PASS local; F1 expõe lacuna de simultaneidade |
| C3 | `tests/integrations/observe/control.cli.test.mjs:174` — forma exata do estado `on` com geração/chave/mapa; `:186-189` — repetição sem mudança de bytes, mtime ou capturas; `:195-201` — conteúdo sanitizado e uma captura. | PASS |
| C4 | `tests/integrations/observe/control.cli.test.mjs:217-224` — `off` encerra as duas automáticas e zera geração/chave/mapa; `:233-247` — produtor posterior não grava, repetição não muda estado, export/timeline permanecem. | PASS local; F1 permite autorização órfã em outra raiz |
| C5 | `tests/integrations/observe/control.cli.test.mjs:260-262` — par completo grava só na manual; `:277-282` — par inválido retorna `binding_invalid`, sem rota automática; `:293-300` — `off` não encerra manual, que aceita `privacy stop/disable`. | PASS |
| C6 | `tests/integrations/observe/agents.e2e.test.mjs:90` — nenhuma variável de captura; `:111-121` — captura automática própria com conteúdo e retenção `7`, registros de hook; `:131-135` — texto sensível removido do conteúdo e disco. | PASS |
| C7 | `tests/integrations/observe/agents.e2e.test.mjs:146-159` — hook Codex entrega e persiste os registros; `:170-179` — leitura de `SKILL.md` é operação de ferramenta, sem ativação nativa e sem nome inferido. | PASS |
| C8 | `tests/integrations/hermes-plugin.native.test.mjs:351-352` — sem variável de entrega/captura; `:386-389` — todas as entregas e duas capturas; `:375-379,424-426` — callbacks neutros, ferramenta intacta e falha do destino não bloqueante. Runtime Hermes presente; teste não foi skip. | PASS |
| C9 | `tests/integrations/observe/routing.unit.test.mjs:64-70,88` — identidade aceita ou `null`; `:106-113,121-133` — evento sem sessão aumenta `unrouted`, não cria ou contamina captura. | PASS |
| C10 | `tests/integrations/observe/agents.e2e.test.mjs:206-207` — cinco capturas e cinco chaves distintas; `:219-227,243-248` — eventos/pseudônimos e relatório exclusivos de cada sessão. | PASS |
| C11 | `tests/integrations/observe/rollover.e2e.test.mjs:57-68` — primeira captura no limite e evento `500` no início da sucessora; `:101,107-113` — caso que cabe exatamente e caso que excede um byte. Os valores literais do limite comum são afirmados em `tests/integrations/privacy/store.unit.test.mjs:93-95,112-119` (`500`, `8_388_608`); esse teste adicional foi executado isoladamente e passou. | PASS |
| C12 | `tests/integrations/observe/routing.unit.test.mjs:171-172` — produtor antigo recebe `observe_off`, sem alteração do store; `:196-214` — `off` espera commit em curso e nenhum commit vem após sua conclusão. | PASS para uma raiz estável; F1 contorna o comando `off` por troca concorrente da configuração |
| C13 | `tests/integrations/observe/routing.unit.test.mjs:276-278` — geração, chave e mapa novos; `:284-300` — produtor antigo recusa, capturas/chaves/pseudônimos distintos. | PASS |
| C14 | `tests/integrations/observe/agents.e2e.test.mjs:266-281` — hooks neutros e `status` distingue `on` de captura bem-sucedida; `:292-311` — prazo, saídas vazias, erro fechado e nenhuma captura em lock/raiz ausente. | PASS |
| C15 | `tests/integrations/observe/report.cli.test.mjs:59,63-69` — `--latest` igual ao relatório explícito da automática mais recente, com ID e sem manual; `:73,93` — consulta sem escrita e disponível após `off`. | PASS |
| C16 | `tests/integrations/observe/report.cli.test.mjs:103,108,116-118` — códigos exatos `not_configured` e `no_automatic_capture` mesmo com manual; `:128` — lock ocupado retorna conflito. | PASS |
| C17 | `tests/integrations/observe/privacy.e2e.test.mjs:74-83` — sem `on` não persiste, com `on` há entrega; `:96-103` — sensível removido, não suportado/insanitizável omitido, canários ausentes; `:116-121` — sonda registra execução sem operação de rede e restringe escritas. | PASS |
| C18 | `tests/integrations/observe/docs.test.mjs:63-66,74,80-81` — scripts, setup e fluxo README exatos; `:115-121` — limites e comandos manuais; `:150,161-181` — fluxo documentado executa e produz relatório da captura. | PASS |

## Rodada 1 — achados (carried from `8f29c40`)

**F1 — Bloqueante: `setup` e `on` concorrentes deixam uma autorização ativa sem comando para desligá-la.** Em `src/integrations/observe/command.mjs:131-140`, `setup` lê que a raiz antiga A está `off`, mas não serializa essa decisão com `on`. Em `:140-145` substitui o arquivo de configuração por B. `on`, `off` e `status` leem somente a configuração corrente em `:148-163`. Reprodução determinística com `createStoreIo()` interceptando a escrita temporária da configuração: configurei A, pausei `setup B` imediatamente antes de escrever `observe.json`, executei `on` (ativou A), liberei `setup B`. Resultado observado: `{"first":0,"onOld":0,"changed":0,"status":"off","old":"on"}`. Esperado: `setup B` recusar `observe_on` ou serializar a troca, preservando uma única raiz controlável. Atual: o status e o próximo `off` se referem a B, enquanto A continua `on`; produtores já abertos em A conservam sua geração e podem gravar após esse `off`. Viola a linha “Configuração do usuário” do Landing e o critério de corte da issue. Nenhum arquivo do repositório foi alterado pela reprodução.

**G1 — Gate amplo não verde sob carga.** `npm run test:integrations` executou 437 testes: **429 passes, 1 falha, 7 skips** de recursos de plataforma (sinais POSIX, modos/ACL POSIX e ACL macOS no Windows). `tests/integrations/traces/concurrency.cli.test.mjs:97` (`T8-C15`, captura manual) recebeu `delivery_timeout`, `committed/persisted: 32` e `lost: 8`, contra 40/40/0 esperados na linha `:107`. Reexecutado isoladamente no mesmo HEAD, o teste passou (1/1). Não há prova de regressão determinística da #23 nesse caminho; a falha da suíte ampla permanece registrada e não foi tratada como verde.

## Rodada 1 — gate e limites (carried from `8f29c40`)

- C1–C18: **18/18 nomes encontrados, 23/23 execuções passaram, 0 skips** no HEAD.
- Limites de 500 eventos e 8 MiB: prova C11 mais asserções literais existentes de #5, executadas; retenção `7` em C3/C6/C11.
- `npm run test:integrations`: **FAIL**, com G1 acima; `T8-C15` isolado: PASS.
- UI de fonte vinculante e fault injection `standard/ui`: **não aplicáveis ao perfil `light`**. Sem seção `Coverage` ou `Test policy` no checklist.
- O veredito naquele HEAD foi **FAIL** por F1, independentemente de G1.

## Rodada 2 — fontes e escopo no HEAD `788d0bc`

| Fonte | Situação nesta rodada |
| --- | --- |
| [Issue #23](https://github.com/oldboydev/skill-me/issues/23), `.tasks/issue-23-observacao-on-off.md`, contratos da #5/#8 e [OpenAI Docs: Hooks](https://learn.chatgpt.com/docs/hooks) | Carregados da leitura da rodada 1 em `8f29c40`; nenhum deles mudou no diff `1ccfe70..HEAD`. |
| `.checks/issue-23-observacao-on-off.md:26` | Aberta no HEAD: a nova linha “Barreira da configuração” exige lock comum e `4 link_refused` para link/junção no lugar da pasta `.skill-me`. |
| `.checks/issue-23-observacao-on-off.build.md:227-388` | Aberta: correção de F1, reprodução vermelho/verde, mutações, gates Windows/WSL e limitações declaradas pelo builder. Seus resultados foram distinguidos das execuções independentes abaixo. |
| Diff `1ccfe70..788d0bc` | Lidos `observe/command.mjs`, `observe/config.mjs`, `privacy/store.mjs`, testes C2/C4/C18, checklist, README e `docs/traces.md`. `git diff --check 1ccfe70..HEAD` passou. |

UI de fonte vinculante e fault injection `standard/ui` não se aplicam ao perfil `light`. Não há seção `Coverage` ou `Test policy`. A revisão foi limitada ao diff da correção e aos vereditos não PASS, com todos os proofs novamente executados no HEAD.

## Rodada 2 — provas

Uma invocação independente de `node --test --test-reporter=spec --test-name-pattern='<alternância C1–C18>'` nos oito arquivos do checklist, fora do sandbox que bloqueia as fixtures temporárias, executou **27 testes, 27 passes, 0 falhas, 0 skips**. Cada um dos 18 nomes apareceu; C2 agora seleciona quatro testes e C4, dois. Os demais checks conservam as citações da rodada 1: testes e fontes não mudaram, e todos foram reexecutados no HEAD atual. As citações de arquivos alterados foram atualizadas:

| Check afetado | Asserção no HEAD atual | Veredito da prova |
| --- | --- | --- |
| C1 | `tests/integrations/observe/control.cli.test.mjs:61,80,90`: `setup` e `status` retornam `off`, zero capturas e raiz intacta. | PASS |
| C2 — entrada/raiz trocada | `tests/integrations/observe/control.cli.test.mjs:119-124,144-154`: códigos exatos e `root_changed` sem gravar no destino trocado (mesma lógica da rodada 1, linhas deslocadas). | PASS |
| C2 — `setup` primeiro | `tests/integrations/observe/control.cli.test.mjs:245,246,248,250-252`: `on` espera, `setup B` conclui, B fica `on`, A `off`, e `off` alcança ambas. | PASS; reproduz a primeira ordem de F1 |
| C2 — `on` primeiro | `tests/integrations/observe/control.cli.test.mjs:271,274-278`: `setup` espera, recebe `4 observe_on`, configuração mantém os bytes anteriores, A fica `on` até o `off` seguinte. | PASS; reproduz a segunda ordem de F1 |
| C2 — dois `setup` e `on` | `tests/integrations/observe/control.cli.test.mjs:297-302`: `setup` atrasado relê sob o lock, recebe `4 observe_on`, só B está `on`, `off` alcança todas. | PASS |
| C3 | `tests/integrations/observe/control.cli.test.mjs:345-372`: geração, conteúdo e idempotência do `on` (asserções anteriores, linhas deslocadas); `:350` confirma `status` em outro processo. | PASS |
| C4 — barreira com `setup` | `tests/integrations/observe/control.cli.test.mjs:318,320-323`: `off` espera, responde `changed: false` pela B configurada, A/B `off`, lock removido. | PASS; reproduz espera do `off` |
| C4 — desligamento normal | `tests/integrations/observe/control.cli.test.mjs:388-395,404-418`: estado `off` zera geração/chave, encerra capturas e preserva consulta (asserções anteriores, linhas deslocadas). | PASS |
| C5 | `tests/integrations/observe/control.cli.test.mjs:422-473`: precedência manual e `binding_invalid` (asserções anteriores, linhas deslocadas). | PASS |
| C18 | `tests/integrations/observe/docs.test.mjs:90,98`: README cita o lock declarado por `CONFIG_DIR`/`CONFIG_LOCK_FILE`; `:64-81,152-181`: scripts e fluxo real continuam provados. | PASS |

O fluxo novo usa `withConfigLock` em `src/integrations/observe/command.mjs:127-131,144-174`: `setup`, `on` e `off` leem a configuração e mudam a raiz sob `observe.lock`. `src/integrations/privacy/store.mjs:164-200` mantém a forma e liberação do lock do store; `README.md:98-105` e `docs/traces.md:98-107` explicam prazo e lock residual. Isso resolve F1 para comandos concorrentes sem troca externa da pasta da configuração.

## Rodada 2 — achado novo

**F2 — Bloqueante: a pasta da configuração pode ser trocada por junção após a validação e antes da tomada do lock.** `configDir()` faz `lstat` de `<home>/.skill-me` e retorna apenas o caminho em `src/integrations/observe/config.mjs:86-108`. `withConfigLock` monta `observe.lock` com esse caminho e, após tomá-lo, `readObserveConfig` volta a percorrer o nome da pasta em `src/integrations/observe/command.mjs:127-131`; não há nova conferência da pasta real. Reproduzi em diretórios temporários reais, com IO pausado imediatamente antes de `writeExclusive(observe.lock)`: configurei a home A para a raiz A, renomeei `.skill-me` após seu `lstat`, pus uma junção naquele nome para outra pasta de configuração válida que aponta à raiz B e liberei `on`. Resultado observado: `{"onExit":0,"onResponse":"on","originalRoot":"off","redirectedRoot":"on"}`. Esperado pelo Landing em `.checks/issue-23-observacao-on-off.md:26`: `4 link_refused`, sem ativar uma raiz diferente da configurada no começo da operação. Atual: `on` retorna sucesso e ativa B por um caminho trocado. O lock também é tomado no destino da junção, sem assegurar a identidade da pasta antes validada. Isso quebra o isolamento do destino de consentimento e a regra de recusa de links. A reprodução só criou/removou diretórios temporários; não alterou código ou testes.

F1 da rodada 1 está **resolvido** nas duas ordens e na espera de `off` testadas acima. F2 é uma nova falha da fronteira introduzida com o lock; os 27 testes C1–C18 não a cobrem.

## Rodada 2 — G1 e gate

- Execução independente no HEAD: `T8-C15 concurrent producers` isolado passou **1/1, 0 skips**. Na rodada 1, a mesma execução isolada passou **1/1**.
- A seção de build `:344-369` registra no Windows, no commit `deacc50` da correção, `npm test` com governança 6/6, motor 16/16, doctor 410 pass/7 skip e integrações **441 testes, 433 pass, 1 fail, 7 skip**. O fail foi `T8-C15` sob carga, com `delivery_timeout` e 0/40 confirmados; outra corrida ampla teve dois fails (`T8-C15` e `T7-C10`). O builder executou `T8-C15` isolado 3/3. Essas são evidências do builder, não execuções independentes do Verifier.
- O mesmo build registra WSL Ubuntu com integrações **441 testes, 428 pass, 0 fail, 13 skip**; nove skips são por ausência do runtime Hermes, incluindo C8. No Windows, o runtime estava presente e C8 passou nesta verificação independente.
- **G1 permanece um gate vermelho no Windows.** O teste isolado verde e o WSL verde mostram sensibilidade à carga/plataforma, mas não tornam `npm test` verde no ambiente Windows. O `AGENTS.md` determina que falha de verificação impede entrega. A divisão de `withLock` tocou código compartilhado pela captura manual, portanto não há base para dispensar o fail como comprovadamente alheio ao diff. Não atribuo uma causa de produto que os dados não provam.
- **Veredito final desta rodada: FAIL**, por F2 e, separadamente, pelo gate Windows não verde. Nenhum commit, push ou correção foi feito pelo Verifier.
