# Verificação independente — observação local `on/off` (issue #23)

**Veredito: PASS**
**Perfil:** `light`
**Diff da feature:** `a2400c3..ae0111b9db7002b7e1e84860e2a610c590c87407`
**Diff da correção:** `8b5b62d..ae0111b9db7002b7e1e84860e2a610c590c87407`
**Rodada:** 4 — escopo do diff e vereditos não PASS da rodada 3
**Verifier:** subagente independente, separado do builder

**Estado atual:** F1 e F2 permanecem corrigidos nas janelas provadas; F3 e o intercalamento posterior de `on/off` passam nos cenários determinísticos. O gate Windows G1 passou no HEAD com paralelismo limitado a oito arquivos. As rodadas 1–3 abaixo preservam seus vereditos e evidências nos SHAs anteriores; a rodada 4 documenta a verificação do HEAD atual.

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

## Rodada 3 — fontes e escopo no HEAD `998235bb2e6844b3ef7ab791adacc0da00a6bff7`

| Fonte | Situação |
| --- | --- |
| [Issue #23](https://github.com/oldboydev/skill-me/issues/23), task da #23, contratos da #5/#8 e [OpenAI Docs: Hooks](https://learn.chatgpt.com/docs/hooks) | Carregados das leituras independentes em `8f29c40`; não alterados em `7a8553c..HEAD`. O consentimento vai de `on` até `off`; a configuração seleciona qual raiz está sob esse controle. |
| `.checks/issue-23-observacao-on-off.md:26-27,41-96` | Aberto no HEAD. A linha “Pasta da configuração” agora exige pasta real, identidade `dev/ino` antes do lock e após cada leitura; `link_refused` ou `foreign_entry` (ambos saída 4), nenhum destino alheio ativado, e lock movido preservado. C1–C18 e seus `Swept` confrontados. |
| `.checks/issue-23-observacao-on-off.build.md:390-616` | Aberto no HEAD: F2, red/green, provas, gates e A/B interrompido do builder. Resultados do builder não foram atribuídos ao Verifier. |
| `7a8553c..HEAD` | Lidos os diffs de `observe/config.mjs`, `observe/command.mjs`, plugin Hermes, testes C2/C8, checklist, README e `docs/traces.md`. `git diff --check 7a8553c..HEAD` passou. |

Perfil `light`: comparação visual de fonte vinculante `ui` e fault injection `standard/ui` **não se aplicam**. O checklist não tem seções `Coverage` ou `Test policy`. Os contratos de fronteira foram julgados pelos critérios e pelas regras de testes do `AGENTS.md`. C6–C17 fora dos arquivos tocados carregam as citações verificadas em `8f29c40`, reexecutadas neste HEAD; F1 e F2, antes não PASS, foram reavaliados.

## Rodada 3 — provas C1–C18

Uma **única invocação independente** de `node --test --test-reporter=spec --test-name-pattern='<alternância C1–C18>'` nos oito arquivos nomeados pelo checklist, fora do sandbox que impede as fixtures temporárias, executou **29 testes, 29 passes, 0 falhas, 0 skips**. Cada nome C1–C18 apareceu no resultado; C2 selecionou cinco testes e C8 dois, inclusive os cenários novos de F2. Os valores citados abaixo são as asserções executadas; o teste novo de C2 compara `observed` a uma tabela `expected` literal imediatamente acima.

| Check | Asserção decisiva no HEAD e limite | Resultado |
| --- | --- | --- |
| C1 | `tests/integrations/observe/control.cli.test.mjs:61,80,90`: setup e status exatos `off`, zero capturas, raiz intacta. | PASS |
| C2 | `control.cli.test.mjs:119-124,143-154`: códigos de raiz inválida e `root_changed` sem destino alheio; `:245-251,271-277,298-301`: ordens concorrentes e `observe_on`; `:457-472`: cinco trocas de pasta, códigos 4 `link_refused`/`foreign_entry`, raízes e gerações inalteradas, leitores recusam a junção, lock movido preservado, controle após restaurar. | PASS nos cenários afirmados; F3 abaixo é lacuna após a leitura |
| C3 | `control.cli.test.mjs:483-500,506-509,513-521`: `on`, geração, chave, repetição sem mudança e uma captura sanitizada com retenção `7`. | PASS |
| C4 | `control.cli.test.mjs:318-323,537-544,553-567`: espera pelo setup, `off` zera autorização, produtor posterior recusado, repetição e consulta preservadas. | PASS nas ordens afirmadas; F3 abaixo |
| C5 | `control.cli.test.mjs:580-582,597-603,613-622`: vínculo manual completo precede automático; incompleto dá `binding_invalid`; `off` não encerra a manual. | PASS |
| C6 | `tests/integrations/observe/agents.e2e.test.mjs:90,111-135`: Claude sem variáveis de captura, sessão própria, sanitização e retenção `7` (citação carregada de `8f29c40`). | PASS |
| C7 | `agents.e2e.test.mjs:146-159,170-179`: entrega Codex e leitura de `SKILL.md` como operação, sem ativação nativa (carregada de `8f29c40`). | PASS |
| C8 | `tests/integrations/hermes-plugin.native.test.mjs:351-352,375-389,424-426`: Hermes real sem variável e callback neutro; `:460-485`: pasta real fornece argv, junção antes/durante a leitura fornece `null`, teste não skip no Windows. | PASS |
| C9 | `tests/integrations/observe/routing.unit.test.mjs:64-70,106-133`: sessão inválida não recebe captura nem identidade alheia (carregada de `8f29c40`). | PASS |
| C10 | `agents.e2e.test.mjs:206-227,243-248`: cinco capturas/chaves próprias, eventos e relatório segregados (carregada de `8f29c40`). | PASS |
| C11 | `tests/integrations/observe/rollover.e2e.test.mjs:57-68,101-113`: evento 501 na sucessora, sem perda, e fronteira de bytes exata/mais um byte. Literais 500 e 8.388.608 também afirmados em `tests/integrations/privacy/store.unit.test.mjs:93-95,112-119` na rodada 1; o teste adicional não foi reexecutado nesta rodada. | PASS para os dois proofs C11 |
| C12 | `routing.unit.test.mjs:171-172,196-214`: produtor antigo recusa e `off` espera commit em curso (carregada de `8f29c40`). | PASS para raiz estável; F3 abaixo |
| C13 | `routing.unit.test.mjs:276-300`: geração/chave novas e produtor antigo sem escrita nem herança (carregada de `8f29c40`). | PASS |
| C14 | `agents.e2e.test.mjs:266-311`: agente neutro sob falha de store/lock, prazo e status sem promessa de captura (carregada de `8f29c40`). | PASS |
| C15 | `tests/integrations/observe/report.cli.test.mjs:59-73,93`: latest = automática mais recente, ID e formato, sem escrita, após off (carregada de `8f29c40`). | PASS |
| C16 | `report.cli.test.mjs:103-128`: `not_configured`, `no_automatic_capture` mesmo com manual, conflito com lock (carregada de `8f29c40`). | PASS |
| C17 | `tests/integrations/observe/privacy.e2e.test.mjs:74-83,96-121`: sem opt-in/sensível/não suportado omitidos; sonda sem rede (carregada de `8f29c40`). | PASS |
| C18 | `tests/integrations/observe/docs.test.mjs:63-98,115-121,150-181`: scripts, preparo, fluxo, limites e comandos manuais; `README.md:104` e `docs/traces.md:102` incluem o lock; a documentação nova de pasta real foi inspecionada no diff, sem proof dedicado. | PASS para o critério C18 |

O código novo recusa junção pelo `lstat` e compara `dev/ino` em `src/integrations/observe/config.mjs:69-89,114-130,159-169`. O plugin usa `os.lstat` e a marca de reparse de junção no Python 3.11, com segunda conferência em `src/integrations/hermes/plugin/__init__.py:96-125`. Reproduzi F2 literalmente com diretórios temporários: `on` pausado antes de `writeExclusive(observe.lock)`, `.skill-me` movida e substituída por junção para uma configuração B válida. Resultado no HEAD: `4 link_refused`, A/B `off`. Troca por junção ao `lstat(observe.json)`: `4 link_refused`, A/B `off`. Outra pasta **real** antes do lock: `4 foreign_entry`, A/B `off`. Os testes C2 verificam ainda `off`, `setup`, leitores, lock e restauração; C8 verifica sem destino no plugin. **F2 está resolvido nos intervalos cobertos.** F1 permanece resolvido nas duas ordens e na espera do `off` (`control.cli.test.mjs:245-323`).

## Rodada 3 — achado F3

**F3 — Bloqueante: troca da pasta após a conferência pós-leitura deixa uma autorização `on` fora do alcance do `off`.** O `readObserveConfig` confere `.skill-me` pela segunda vez em `src/integrations/observe/config.mjs:128-130`; em seguida, `withConfigLock` passa a configuração lida ao callback (`src/integrations/observe/command.mjs:130-134`) e `change` aplica `changeObservation` na raiz antiga em `:166-176`. Não há conferência da identidade da pasta entre o fim da leitura e o efeito na raiz. A liberação de `holdLockFile` percebe que o lock saiu da pasta (`src/integrations/privacy/store.mjs:164-189`), mas a autorização já foi gravada.

Reprodução determinística independente: configurei A e B em homes/raízes temporárias distintas; injetei a troca imediatamente **após o retorno do terceiro `lstat(.skill-me)`** de `on` (o `lstat` posterior à leitura), antes de `changeObservation`. Ao pôr uma **junção** para a configuração B, resultado `on: 4 foreign_entry`, estado A `on`, B `off`; o próximo `off: 4 link_refused`, A permanece `on`. Ao pôr outra **pasta real** com o `observe.json` de B, resultado `on: 4 foreign_entry`, A `on`, B `off`; o próximo `off: 0`, porém A **continua `on`**. Como controle, as trocas antes do lock ou durante a leitura deram 4 e A/B `off`. Resultado completo: `beforeLockJunction=[4 link_refused,off,off]`; `atReadJunction=[4 link_refused,off,off]`; `beforeLockReal=[4 foreign_entry,off,off]`; `postReadJunction=[4 foreign_entry,on,off]`; `postReadReal=[4 foreign_entry,on,off]`. A reprodução não alterou arquivos do repositório.

**Esperado:** o comando que recusa a pasta trocada não ativa A, ou conserva uma forma confiável de o `off` encerrá-la; nenhuma autorização permanece fora da configuração atual. **Atual/impacto:** `on` informa erro, mas A está ativa e o `off` alcança apenas B (ou recusa a junção). Produtores já associados à geração de A podem continuar gravando. Isso viola o consentimento até `off` da issue e as linhas “Barreira da configuração” e “Pasta da configuração” do Landing (`.checks/issue-23-observacao-on-off.md:26-27`). O teste novo de C2 encerra a troca no máximo durante a leitura ou antes do temporário (`control.cli.test.mjs:383-390`), portanto não distingue essa falha.

## Rodada 3 — gate, skips e limites

- **G1 continua bloqueante independentemente de F3.** O builder executou `npm test` no Windows em `40d77fc`, mesma árvore de produto que este HEAD documental: governança **6/6**, motor **16/16**, doctor **410 pass, 0 fail, 7 skip** de 417; integrações **443 testes, 435 pass, 1 fail, 7 skip** (`.checks/issue-23-observacao-on-off.build.md:533-544`). A falha foi `T8-C15`, `lock_present`, 0/1 confirmado em vez de `code:null`, 1/1/0 esperado em `tests/integrations/traces/concurrency.cli.test.mjs:122`. Isolado, passou **3/3** no Windows. O Verifier já observara falha de T8-C15 antes de F1; sob carga A/B houve falhas mensuráveis tanto em main quanto no HEAD, mas o experimento foi interrompido e **não tem taxas finais** (`build.md:546-572`). Não há prova de regressão determinística da #23 nem de que a falha seja alheia; `npm test` segue vermelho e o `AGENTS.md` determina que falha de verificação impede entrega. Não o declaro verde.
- Os **7 skips de integrações Windows** são sinais POSIX (2), modos POSIX (1), ACL POSIX/Linux (3) e ACL macOS (1); os **7 do doctor** são POSIX/FIFO. O runtime Hermes está presente no Windows e os dois C8 passaram sem skip. Nesta rodada **WSL não rodou os novos testes F2**; o verde WSL da rodada 2 não lhes é atribuído.
- Provas C1–C18 no HEAD: **18/18 nomes, 29/29 execuções PASS, 0 skips**. A comparação de fonte vinculante UI e fault injection `standard/ui` não se aplicam ao perfil `light`. Nenhuma mutação de código/testes, commit, push, PR ou merge foi feita pelo Verifier.
- **Veredito final no HEAD `998235b`: FAIL**, por F3 e pelo gate Windows G1. F1/F2 passam nas janelas reproduzidas, mas isso não encerra a entrega.

## Rodada 4 — fontes e escopo no HEAD `ae0111b9db7002b7e1e84860e2a610c590c87407`

**Veredito desta rodada: PASS.** Perfil `light`; base da feature `a2400c3`, último verificado `8b5b62d`. A issue #23 e seu comentário foram relidos pelo conector GitHub. Também foram lidos `AGENTS.md`, o procedimento `tlc-implement/references/verify.md`, a task, o checklist, o build report, o FAIL da rodada 3 e os contratos da #5/#8 afetados. Não há `CONTRIBUTING.md` neste checkout (`rg --files -g '*CONTRIBUTING*'` não encontrou arquivo). As fontes de produto da issue mantêm o consentimento de `on` até `off`, isolamento e limite por captura. A comparação de interface `ui`, `Coverage`, `Test policy` e fault injection formal não se aplicam a este perfil/checklist; os `Swept` de concorrência, estado, autorização, consulta e ciclo dos dados foram confrontados com as provas abaixo.

O diff `8b5b62d..HEAD` introduz o registro fora de `.skill-me`, o lock de controle estável no home, a leitura do registro por `setup/status/report --latest`, o `off` que alcança a raiz registrada e a recusa do `on` antes de abrir o store da raiz configurada. `src/integrations/observe/config.mjs:19,23,179-242`, `observe/command.mjs:145-148,162-180,210-260,277`, `privacy/store.mjs:810,820` e `report/command.mjs:80` foram inspecionados. README e `docs/traces.md` agora descrevem o lock, o registro e os códigos de conflito; `docs/report.md` descreve a recusa de consulta divergente. Os arquivos do core vendorizado e os dois pilotos não foram alterados nesta verificação.

## Rodada 4 — provas no HEAD

Executei **cada comando literal de C1–C18**, em sequência, no HEAD: **18/18 checks encontrados, 35 testes, 35 passes, 0 falhas, 0 skips**. C8 executou 2/2 testes com o runtime Hermes local. A primeira tentativa de C1 no sandbox retornou `io_failure` ao criar fixture temporária, como nas rodadas anteriores; reexecutei C1 e os demais comandos fora desse sandbox, todos com saída 0. Esse erro de ambiente não foi contado como prova do produto. As citações de C6–C14 em arquivos não tocados vêm da rodada 3 (`998235b`) e seus comandos foram executados novamente neste HEAD; as asserções em arquivos tocados foram conferidas de novo:

| Check | Asserção decisiva executada no HEAD | Resultado |
| --- | --- | --- |
| C1 | `tests/integrations/observe/control.cli.test.mjs:68,87,97`: `setup`/`status` exatos em `off`, raiz intacta antes de `on`. | PASS 1/1 |
| C2 | `control.cli.test.mjs:119-124,151-162,256-261,282-287,469-482`: entradas inválidas, `root_changed`, revezamento de `setup/on` e tabela literal de pasta trocada sem raiz alheia alterada. | PASS 5/5 |
| C3 | `control.cli.test.mjs:1028,1049-1050`: outro processo vê `on`; repetição preserva geração e apenas uma captura. | PASS 1/1 |
| C4 | `control.cli.test.mjs:584-601,742-753,773-785,848-861,988-1001,1066-1095`: `off` pelo registro, registro inválido, espera do `on` em voo, raiz alheia intacta e capturas encerradas. | PASS 7/7 |
| C5 | `control.cli.test.mjs:1109-1111,1124-1131,1141-1151`: par manual prevalece, incompleto recusa e `off` preserva a manual. | PASS 1/1 |
| C6–C14 | Asserções individuais da tabela da rodada 3 nos arquivos `agents.e2e`, `hermes-plugin.native`, `routing.unit` e `rollover.e2e`, todos não tocados desde `8b5b62d`. | PASS 13/13; sem skip |
| C15 | `tests/integrations/observe/report.cli.test.mjs:59-73,91-93`: `--latest` seleciona a automática mais recente, identifica-a nos três formatos e mantém consulta após `off`. | PASS 2/2 |
| C16 | `report.cli.test.mjs:102-128,159-180`: erro sem automática/manual, `4 observe_on` sem escolher outra raiz, `3 config_invalid` e `4 link_refused`. | PASS 2/2 |
| C17 | `tests/integrations/observe/privacy.e2e.test.mjs:96-128`: conteúdo sensível omitido, sonda sem rede, registro e lock gravados, lock não residual. | PASS 1/1 |
| C18 | `tests/integrations/observe/docs.test.mjs:63-98,115-121,140-181`: scripts e fluxo README, lock/registro declarados e fluxo de exemplo executado. | PASS 2/2 |

Os casos novos discriminam regressões concretas: `control.cli.test.mjs:848-861` exige `off esperou`, A `off`, captura `stopped`, produtor tardio `observe_off` e ausência do lock; `:988-1001` compara a árvore inteira de ambas as raízes antes e depois de cada `on` recusado; `report.cli.test.mjs:159-180` exige erro fechado em três formatos, nenhuma escrita e nenhuma captura escolhida. O caso de registro inserido depois da primeira conferência (`control.cli.test.mjs:767-785`) conserva a barreira sob o lock do store. Essas asserções usam valores literais e distinguem os defeitos F3 e o `on` que criava store na raiz alheia. O build report registra vermelho/verde 0/3 e depois 0/2 contra versões anteriores, além de mutações mortas; são evidências do builder, não execuções minhas. Não fiz fault injection, conforme perfil `light`.

## Rodada 4 — F3, G1 e gate

- **F3 resolvido no cenário de falha:** o registro em `config.mjs:211-241` é criado antes do estado `on` (`store.mjs:810`) e removido após o estado `off` e encerramento (`:820`). Mesmo se `.skill-me` muda depois da leitura, `off` procura a raiz registrada em `command.mjs:257-258`. O teste C4 das quatro trocas exige A `off` e produtor tardio sem gravação (`control.cli.test.mjs:584-601`). O caso posterior, com `on` e `off` simultâneos, exige espera no lock do home e o mesmo resultado (`:848-861`).
- **Configuração divergente e raiz alheia:** `setup/status/report --latest` recusam o registro divergente; `on` o consulta antes de `switchRoot` (`command.mjs:217-218`). C4 compara bytes, tipo e mtime das árvores das duas raízes antes/depois de cada recusa (`control.cli.test.mjs:988-1001`); C16 recusa relatório de outra configuração (`report.cli.test.mjs:159-180`). Os cinco cenários incluem pasta real trocada, pasta apagada, registro da própria raiz após queda, registro ilegível e link.
- **G1:** `npm test` executado por mim no HEAD encerrou com **exit 0**: governança **6/6**, code review **16/16**, doctor **417 testes, 410 pass, 7 skip, 0 fail** (contagens também reconfirmadas por `npm run test:doctor`), integrações **450 testes, 443 pass, 7 skip, 0 fail**. O `T8-C15` isolado passou **1/1, 0 skip**. `scripts/test-integrations.mjs:14-20` limita o runner a oito arquivos sem aumentar a concorrência em hosts menores; `tests/integrations/fixtures-inventory.test.mjs:64-66` afirma os argumentos e limites. Os sete skips Windows de integrações continuam restrições POSIX/ACL já nomeadas na rodada 3; os sete do doctor são POSIX/FIFO. Um gate verde não mede a taxa futura do antigo flake sob carga, mas não há falha observada neste HEAD.

Nenhum check foi omitido e não há achado bloqueante novo. `git diff --check main` e `git diff --check` passaram após remover os espaços finais de hard-break do cabeçalho; `git diff --check main...HEAD` só refletirá essa correção depois do commit do relatório. Nenhum arquivo além deste `.verified.md` foi editado pelo Verifier; não houve commit, push, PR ou merge.

## Rodada 5 — verificação independente no HEAD `a24a9feb8079afe965c4816cf4582fef3f889d94`

**Veredito: PASS.** Perfil `light`; base da feature `a2400c368fa74bda6ad8c93bf54b4196196392d7`. O proprietário autorizou esta rodada adicional. Li `AGENTS.md`, `tlc-implement/references/verify.md`, task, checklist, esta evidência anterior e o `response.json` da primeira revisão formal. As fontes vinculantes e os vereditos de C1–C7 e C9–C17, não tocados pelo diff `941b059..HEAD`, são **carregados da rodada 4 (`ae0111b9db7002b7e1e84860e2a610c590c87407`)**; as respectivas provas foram executadas novamente no HEAD. O diff atual altera plugin Hermes, helper/teste C8, README e teste C18; estes foram reinspecionados. Não há `Coverage` ou `Test policy` no checklist, e comparação de interface e fault injection formal são passos de `ui`/`standard`, não do perfil `light`.

Uma chamada batched de `node --test --test-reporter=spec --test-name-pattern=<alternância dos 18 filtros literais C1–C18> <oito arquivos de prova>` fora do sandbox executou **18/18 checks, 37/37 testes PASS, 0 fail, 0 skip, exit 0**. Cada nome `I23-Cn` apareceu na saída. Contagem por check: C1 1; C2 5; C3 1; C4 7; C5 1; C6 1; C7 1; C8 3; C9 2; C10 1; C11 2; C12 2; C13 1; C14 1; C15 2; C16 2; C17 1; C18 3. A primeira chamada no sandbox deu `io_failure` no `observe setup` de fixtures temporárias (C1 e C8 portátil, com falhas em cascata); o runtime Hermes nativo também não foi localizado ali. Essa execução **não** foi contada como aprovação. Fora do sandbox, os dois C8 nativos Windows e o C8 portátil Windows executaram e passaram, sem skip.

### C8 — achado P1 da revisão formal

`src/integrations/hermes/plugin/__init__.py:91,100-108` agora obtém `IO_REPARSE_TAG_MOUNT_POINT` com `getattr(..., None)` e só compara a marca quando existe; pasta comum segue com identidade `(dev, ino)` e link/junção é recusado. A prova nativa mantém `SKILL_ME_HERMES_DELIVERY` ausente (`tests/integrations/hermes-plugin.native.test.mjs:353`), exige callbacks neutros (`:378-381`), entrega `[true, total, total, 0]` (`:388`) e duas capturas de sessões (`:391`). A prova portátil nova executa `observe setup` (`:523`), chama `register(ctx)` no Python do sistema e compara os três casos literais — sem configuração, pasta comum com `hooks: SEVEN`, `active: true` e argv `ingest --agent hermes`, e link/junção com `active: false`/`delivery: null` (`:510-536`). O esperado é construído no próprio teste (`:533-534`) e comparado em `:536`, não em fixture distante.

No **Ubuntu WSL, Linux real**, `node` Linux e `python3` do sistema executaram todos os C8 filtrados: **3 encontrados, 1 PASS (portátil), 2 SKIP, 0 fail, exit 0**. Os dois skips nativos disseram `hermes-runtime-ausente: interpretador do Hermes não encontrado`; não os declaro aprovados no WSL. A prova portátil isolada também executou **1/1 PASS, 0 skip** nesse POSIX. O cenário que antes consultava a constante Windows e desativava silenciosamente o plugin agora lê a configuração real no POSIX. No Windows, a prova nativa com Hermes executou **2/2 PASS**, além da portátil **1/1 PASS**.

### C18 — achado P2 da revisão formal

`README.md:134-143` instrui iniciar/reiniciar o Hermes após `setup` e `on`, e explica que uma instância já usada em `off` ou que atravessou `off` não captura na reativação; é preciso abrir outra. Isso corresponde ao plugin que carrega o argv em `register` (`src/integrations/hermes/plugin/__init__.py:244-253`) e à entrega que fecha ao perder `on` sem reabrir (`src/integrations/observe/delivery.mjs:102-119`). O teste exige a instrução específica (`tests/integrations/observe/docs.test.mjs:115-119`) e recusa a promessa antiga `sem reiniciar` nos três guias (`:129-130`). O cenário executável mantém a instância aberta em `off`/novo `on` e exige `[[first, "stopped", 1]]` apesar de `status: on` (`:241-249`); outra instância cria a captura nova `active, 1`, preservando a antiga `stopped, 1` (`:251-259`). C18 passou **3/3** na chamada batched.

`npm test` executado por mim fora do sandbox neste HEAD terminou com **exit 0**: governança **6/6**, code review **16/16**, doctor sem falha, integrações **452 testes, 445 pass, 0 fail, 7 skip**. Os sete skips Windows de integrações são os cenários POSIX/ACL já descritos na rodada 4; nenhum C8 foi skipped. `git diff --check a2400c3..HEAD` passou, e o checkout estava limpo antes deste registro. Não encontrei achado bloqueante novo. Esta rodada editou exclusivamente este `.verified.md`; não fez commit, push, PR, merge nem revisão formal.
