# Build da issue #23

Base: `2fd303f` (checklist com formatos e barreira do on/off), branch
`codex/issue-23-observacao-on-off`. Perfil: `light`. Builder: Claude, continuando
o processo anterior interrompido por falha do host: o primeiro diff de produto
em `src/integrations/` e `package.json` foi mantido, conferido contra o Landing e
o checklist C1–C18 e completado com provas e documentação. Autorização: decisões
aprovadas pelo proprietário no Planning (configuração única e capturas
sucessivas, `660f165`) e pedido explícito do orquestrador para concluir testes e
documentação nesta branch.

## Commits

- `fd07b89` feat(observe): ligar e desligar a observação automática local
- `a859946` docs(observe): ensinar o fluxo on/off e seus limites
- `dccb2b1` test(observe): provar on/off, sessões, limites e consulta
- o commit deste registro (docs(checks))

## Conferência do diff parcial e ajustes

Cada linha do Landing tem implementação correspondente e uma prova que a exercita:
configuração do usuário (`observe/config.mjs`, C1, C2), estado da observação e
barreira (`observe/authorization.mjs` e `privacy/store.mjs`, C3, C4, C12, C13),
captura automática e sucessivas (`store.mjs#appendAutomatic`, `privacy/ingest.mjs`
com `rollover`, C11), roteamento (`traces/binding.mjs`, `observe/routing.mjs`,
`observe/delivery.mjs`, C5, C9, C10), entrega Hermes (`hermes/plugin/__init__.py`,
C8) e consulta (`report/command.mjs`, `store.mjs#latestAutomaticCapture`, C15, C16).

Ajustes feitos neste build:

- `report/render.mjs`: a linha `Captura` acrescentava `(automática)`, uma
  afirmação sem a própria fonte (a linha cita só `timeline.capture.id`), além da
  forma literal `Captura: <id>` do Landing. O sufixo saiu; o JSON continua com
  `timeline.capture.origin`.
- `tests/integrations/helpers/cli.mjs`: `baseEnv` passa a fixar `HOME` e
  `USERPROFILE` num caminho inexistente. Sem elas o `os.homedir()` dos processos
  de teste cai no perfil real: depois de um `npm run on` de quem roda a suíte, os
  testes que executam hooks "sem variáveis" gravariam fixtures na raiz real do
  usuário (e falhariam, por receberem a entrega automática). Provas que precisam de
  home passam o seu, temporário.
- `tests/integrations/hermes-plugin.native.test.mjs`: `prepareAndRun` ganhou o
  gancho opcional `beforeRun`, usado pelo C8 para fazer `setup`/`on` no home
  temporário do sandbox antes de iniciar o Hermes. Os casos existentes não mudam.

Nenhum outro arquivo de produto foi alterado; os cinco arquivos comuns do motor
de revisão e os pilotos não foram tocados. Nenhum hook pessoal foi instalado e
`on` não foi ativado no ambiente real: todo home e raiz das provas é temporário
(o `~/.skill-me` real continua inexistente).

## Provas C1–C18

Windows 11, Node 24.22.1, HEAD `dccb2b1` com árvore limpa; cada comando exatamente
como no checklist, executado em sequência:

| Critério | Arquivo / padrão | Testes | Resultado |
| --- | --- | --- | --- |
| C1 | `observe/control.cli` / setup persiste raiz e começa off | 1 | 1 pass, 0 fail, 0 skip |
| C2 | `observe/control.cli` / setup recusa raiz inválida | 1 | 1 pass, 0 fail, 0 skip |
| C3 | `observe/control.cli` / on persiste e é idempotente | 1 | 1 pass, 0 fail, 0 skip |
| C4 | `observe/control.cli` / off encerra e é idempotente | 1 | 1 pass, 0 fail, 0 skip |
| C5 | `observe/control.cli` / vínculo manual mantém precedência | 1 | 1 pass, 0 fail, 0 skip |
| C6 | `observe/agents.e2e` / Claude grava automaticamente com on | 1 | 1 pass, 0 fail, 0 skip |
| C7 | `observe/agents.e2e` / Codex grava automaticamente com on | 1 | 1 pass, 0 fail, 0 skip |
| C8 | `hermes-plugin.native` / Hermes entrega sem variável por sessão | 1 | 1 pass, 0 fail, 0 skip (Hermes 0.21.4 local) |
| C9 | `observe/routing.unit` / evento sem sessão não é atribuído | 2 | 2 pass, 0 fail, 0 skip |
| C10 | `observe/agents.e2e` / sessões concorrentes ficam isoladas | 1 | 1 pass, 0 fail, 0 skip |
| C11 | `observe/rollover.e2e` / limite abre captura sucessiva | 2 | 2 pass, 0 fail, 0 skip |
| C12 | `observe/routing.unit` / off corta produtor em voo | 2 | 2 pass, 0 fail, 0 skip |
| C13 | `observe/routing.unit` / novo on isola geração anterior | 1 | 1 pass, 0 fail, 0 skip |
| C14 | `observe/agents.e2e` / falha de entrega não bloqueia agente | 1 | 1 pass, 0 fail, 0 skip |
| C15 | `observe/report.cli` / report latest escolhe captura automática | 2 | 2 pass, 0 fail, 0 skip |
| C16 | `observe/report.cli` / report latest não escolhe captura manual | 1 | 1 pass, 0 fail, 0 skip |
| C17 | `observe/privacy.e2e` / modo automático respeita privacidade | 1 | 1 pass, 0 fail, 0 skip |
| C18 | `observe/docs` / README descreve on off real | 2 | 2 pass, 0 fail, 0 skip |

Total: 23 testes nomeados, 23 pass, 0 fail, 0 skip. O que cada um afirma:

- C1: `npm run status` real antes e depois do `setup` em outro processo (`configured`,
  `off`, sem captura); formato literal de `observe.json` no home; 0700/0600 no POSIX
  (afirmado no WSL); hook e ingest antes do `on` saem com `observe_off` e a raiz fica vazia.
- C2: 13 entradas inválidas com código e saída exatos (relativa existente no cwd,
  inexistente, arquivo, flags), sem eco e sem configurar; raiz trocada por junção
  (Windows) ou link (POSIX) depois do `on`: hooks Claude/Codex e ingest Hermes saem
  `root_changed`, nada no outro destino nem na raiz original (árvore idêntica);
  `status`/`on`/`off`/`report --latest` saem 4 `root_changed`.
- C3: resposta e `observe.json` literais; outro processo vê a mesma geração; `on`
  repetido não reescreve (bytes e mtime) nem cria captura; a captura da sessão nasce
  com conteúdo, sanitizado (`[removido]`, sem canário em disco).
- C4: `stopped` com os IDs exatos, `observe.json` zerado, `status` em ordem
  decrescente, produtores depois do `off` não alteram o store, `off` repetido não
  reescreve, capturas encerradas exportáveis.
- C5: par completo grava só na manual; quatro pares inválidos em Claude, Codex e
  Hermes saem `binding_invalid` sem rota automática; wrapper sem variáveis não grava;
  `off` não encerra a manual, que segue recebendo e aceita `stop`/`disable`; o
  `state.json` manual continua sem `origin`.
- C6/C7: todos os casos válidos das fixtures pelos hooks instalados, sem variável de
  captura; uma captura por sessão, envelopes iguais ao relatório em memória,
  pseudônimos pela chave de cada captura, conteúdo e privacidade iguais ao
  `privacy ingest` numa captura `--content`; no Codex, a leitura de `SKILL.md` é
  operação `tool`, sem `skill_invocation`/`skill_evidence`, e o relatório não infere
  nome de skill.
- C8: Hermes 0.21.4 real, sem `SKILL_ME_HERMES_DELIVERY` nem variável de captura;
  entrega pela configuração única (`enqueued = delivered = 12`), duas capturas
  (7 eventos da sessão das ferramentas, 5 da sessão das fixtures, subagentes pela
  sessão do pai), sem ID nativo em disco; com o store ocupado e com destino
  configurado que não inicia, callbacks `None`, ferramenta com argumentos idênticos e
  nada gravado.
- C9: tabela de `sessionIdentity` (11 entradas sem identidade); a entrega não atribui
  eventos sem sessão nem entrada ilegível à única sessão aberta (`unrouted`), também
  pelo hook real; lote Hermes misto separa cada sessão.
- C10: três sessões Claude/Codex (o mesmo ID nativo em dois agentes) intercaladas e
  simultâneas e duas sessões Hermes num processo: 5 capturas, 5 chaves, cada uma com
  exatamente os seus eventos, mapa igual ao HMAC publicado, relatório de uma sem
  pseudônimos das outras.
- C11: 503 eventos num ingest real: 500 + 3, nenhum descartado, o 501º primeiro da
  sucessora, mapa apontando para ela; nos bytes, o registro que cabe exatamente fica
  (8 388 608) e o que não cabe abre a sucessora sem descarte.
- C12: produtor aberto antes do `off` não grava; com um commit em curso segurado
  pelo io, o `off` espera o lock, conclui depois e nada é confirmado depois dele
  (árvore das capturas idêntica).
- C13: geração e chave novas, produtor antigo recusado, mesma sessão em captura nova
  com chave e pseudônimo próprios, sem conteúdo da geração anterior.
- C14: com lock alheio, hooks Claude/Codex e ingest no uso normal saem 0 com saídas
  vazias e sem esperar o lock; lock que aparece entre a abertura e a gravação termina
  no prazo da entrega; `status` responde 4 sem afirmar estado; depois, `on` com zero
  capturas; raiz ausente não é recriada.
- C15/C16: `--latest` igual byte a byte a `--root --capture` da escolhida nos três
  formatos, linha `Captura` literal, mais recente das automáticas mesmo com uma manual
  mais nova, sem escrita; sem automática `no_automatic_capture`, sem setup
  `not_configured`, lock 4.
- C17: módulos `observe` sem rede; sem `on` nada é gravado; com `on`, conteúdo igual
  ao `privacy ingest --content`, não suportado omitido, valor composto
  `unsanitizable`, Hermes sem conteúdo; sonda da #5 em todos os processos: zero
  chamadas de rede e escrita só no store e na configuração.
- C18: README conferido com `package.json`, help, constantes e códigos; o README é
  seguido linha a linha (setup do bloco bash, `npm run on`, hook, `npm run off`,
  `report --latest`) num home temporário.

Provas suplementares do Landing, sem critério próprio, em `observe/routing.unit`:
mapa com até 1000 sessões por geração (a mais antiga sai) e `status` com no máximo
10 automáticas, da mais recente para a mais antiga (2 pass).

## Suítes

| Ambiente | Alvo | Resultado |
| --- | --- | --- |
| Windows 11, Node 24.22.1 — diff parcial encontrado, antes dos testes novos | `node --test "tests/integrations/**/*.test.mjs"` | 412 tests, 405 pass, 0 fail, 7 skip |
| Windows 11, Node 24.22.1 — produto e docs de `dccb2b1`, sem as 2 provas suplementares | `npm test` | exit 0 — governança 6/6; motor 16/16; doctor 417 (410 pass, 7 skip); integrações 435 (428 pass, 7 skip, 0 fail) |
| Windows 11, Node 24.22.1 — `dccb2b1` | `npm run test:integrations` | exit 0 — 437 tests, 430 pass, 0 fail, 7 skip; as 25 provas I23 passaram |
| WSL Ubuntu — Node 24.13.0, uid 1000, `/tmp/skill-me-i23-PckgkX` de `git archive dccb2b1` (sha256 `36c0ade1…7b07250d` conferido; `git get-tar-commit-id` = `dccb2b14…`), `node_modules` copiado do checkout | `npm test` | exit 0 — governança 6/6; motor 16/16; doctor 417 (416 pass, 1 skip); integrações 437 (424 pass, 13 skip, 0 fail) |

Skips: no Windows, os 7 de integrações são POSIX (sinais, modos e ACL POSIX/macOS),
os mesmos de antes; os 7 do doctor são POSIX/FIFO. No WSL, 9 por falta do runtime
Hermes (`I4-C18`…`I4-C44b` e `I23-C8`: prova nativa pendente lá, nunca aprovada por
simulação), 3 de DACL do Windows e 1 de ACL do macOS; no doctor, 1 do
`hermes_cli.PYD`. `git diff --check`: exit 0.

## Mutações

Cada mutação aplica um erro plausível no produto, roda só a prova correspondente e
restaura os bytes originais (conferido: `git diff` idêntico antes e depois):

| Mutação | Prova | Resultado com a mutação |
| --- | --- | --- |
| M1 store aceita raiz real diferente do setup | C2 | 0/1 |
| M2 geração ignorada na barreira | C13 | 0/1 |
| M3 evento sem sessão vira sessão genérica | C9 | 0/2 |
| M4 entrega sem `rollover` | C11 | 0/2 |
| M5 geração não conferida sob o lock | C12 | 0/2 |
| M6 par inválido cai na rota automática | C5 | 0/1 |
| M7 `--latest` aceita captura manual | C15/C16 | 1/3 (o caso só com automáticas passa) |
| M8 `off` não encerra capturas | C4 | 0/1 |
| M9 agente fora do HMAC da sessão | C10 | 0/1 |
| M10 `on` repetido troca a geração | C3 | 0/1 |
| M11 captura automática sem conteúdo | C17 | 0/1 |
| M12 plugin Hermes sem a configuração única | C8 | 0/1 |
| M13 `setup` aceita raiz relativa | C2 | 0/1 |
| M14 `status` sem as capturas recentes | C4 | 0/1 |
| M15 relatório sem a linha `Captura` | C15 | 1/2 (o caso depois do `off` não lê o texto) |
| M16 gravação automática sem prazo | C14 | 0/1 |

A M16 passou na primeira versão do C14 (1/1): o lock alheio já existia na
abertura, e o prazo da gravação nunca era exercitado. O C14 ganhou o caso do lock
que aparece entre a abertura e a gravação; com a mutação, 0/1; sem ela, 1/1.

## Falhas e correções durante o build

- C6, primeira execução: 3 pass, 1 fail — o `ref` de caminho no conteúdo é
  pseudônimo da chave de cada captura e diferia da referência. A comparação estava
  errada, não o produto: o helper confere o formato `h1:` de cada `ref` e só então
  compara o resto.
- C18, primeira execução: o recorte de seção parava no comentário `# use …` do
  bloco de shell; o recorte passou a ignorar linhas dentro de cercas.
- O primeiro script de mutações teve as barras invertidas reduzidas pelo shell e não
  leu os totais; foi reescrito e os resultados acima são da versão corrigida.

Nenhuma asserção foi enfraquecida para obter verde.

## Limitações

- Nenhuma sessão real de Claude, Codex ou Hermes com modelo; hooks rodam pela linha
  que o instalador grava (como na #8), e a confiança nativa não é exercitada.
- C8 depende do Hermes 0.21.4 local; sem ele (WSL, CI) fica pulado. No cenário com o
  store ocupado, a ausência de gravação é conferida 3 s depois do fim do Hermes, sem
  acesso ao processo do ingest; o lock alheio fica no lugar durante toda a espera.
- C14, lock entre abertura e gravação: o lock entra 500 ms depois do início do
  processo, e a abertura costuma terminar em ~200 ms; numa máquina mais lenta a
  abertura também encontraria o lock e a prova exercitaria esse caminho.
- Limite de 8 MiB: com registros reais da política (envelope até 4096 bytes e
  conteúdo até 8192) os 500 eventos chegam antes; a prova enche a captura com
  registros sintéticos já sanitizados pelo store, como a prova de limites da #8, e
  dela só lê o status.
- `npm run on/off/status` são executados pelo `npm-cli.js` do Node em uso, com o
  aviso de versão desligado e o cache no home temporário.
- macOS não executado; modos 0700/0600 e link de pasta POSIX só no WSL.
- Sem comparação com a worktree de referência nesta rodada (instrução do
  orquestrador).

## Fora do escopo observado

- A seção "Governança e agentes" do README diz que o `package.json` "contém apenas
  esses comandos" (de governança), o que já não valia desde o doctor; não foi
  alterada.
- `.checks/skill-me i5 c7 gGu6mp/` é uma pasta vazia de 20/10, fora do Git; não foi
  tocada.

## Correção do F1 (verificação independente, rodada 1)

Base: `1ccfe70`, com o veredito FAIL do Verifier em
`.checks/issue-23-observacao-on-off.verified.md` (não editado aqui). Escopo
autorizado pelo orquestrador: corrigir só o F1 e as provas necessárias,
preservando o registro do G1. Builder: Claude, mesmo perfil `light`. As seções
anteriores deste arquivo descrevem `dccb2b1` e não foram alteradas.

### Commits

- `0d915a6` docs(checks): registrar barreira comum de setup, on e off — linha
  "Barreira da configuração" do Landing, commitada antes de qualquer mudança de
  produto (arquivo de lock novo).
- `7f671e3` fix(observe): serializar setup, on e off pelo lock da configuração
- `59c7236` test(observe): provar a barreira entre setup, on e off
- `d2b49cf` docs(observe): documentar o lock comum de setup, on e off
- `deacc50` test(observe): provar que setup relê a configuração sob o lock
- o commit deste registro (docs(checks))

### Correção

`setup`, `on` e `off` tomam `<home>/.skill-me/observe.lock` e, sem soltá-lo, leem
a configuração e aplicam a decisão sobre a raiz dela (`observe/command.mjs`,
`withConfigLock`). O `setup` valida a raiz nova antes, cria a pasta 0700, toma o
lock e, sob ele, relê a configuração anterior, recusa `observe_on` se a raiz
anterior estiver `on`, lê o estado da nova e grava a configuração. Sem a pasta
`.skill-me`, `on`/`off` respondem como antes (não configurado) sem criar nada.
`status`, `report --latest`, hooks e ingest não tomam o lock.

O lock reaproveita o ciclo do `.lock` do store: `withLock` (store.mjs) foi
dividido em `holdLockFile` — criação `wx` sem flush, mesma forma
`{"lockVersion":1,"pid":…,"nonce":…}`, liberação só com os bytes gravados — e
o envoltório da raiz (`onLock`, `assertUnchanged`, código `root_changed`). O
lock da configuração usa `foreign_entry` quando a liberação encontra outra
entrada. `observe/config.mjs` ganhou `configDir` (pasta real, link recusado),
usado pelo `writeObserveConfig` e pela barreira.

Documentação: README (seção "2. Uso normal") e `docs/traces.md` ("Configuração
única") passam a citar o lock, o prazo e a remoção manual depois de uma
interrupção; o C18 confere a frase do README com `CONFIG_DIR`/`CONFIG_LOCK_FILE`.

### Regressão: vermelho e verde

Quatro testes novos, em processo sobre home e raízes temporários reais, com a
ordem fixada pelo io de cada comando (pausa numa operação de disco escolhida e
aviso quando o outro comando encontra um arquivo exclusivo ocupado), sem
depender de tempo:

| Teste | Ordem | Esperado com a correção |
| --- | --- | --- |
| I23-C2 … setup já leu a raiz anterior off, on chega, setup grava a nova | `setup B` pausado antes de gravar `observe.json`; `on` iniciado | `on` espera; `setup` 0 com `off`; `on` 0 liga B; A `off`; configuração B; `off` alcança as duas |
| I23-C2 … on já leu a raiz anterior, setup tenta trocar, on liga | `on` pausado ao abrir A, depois de ler a configuração; `setup B` iniciado | `setup` espera; `on` 0 liga A; `setup` 4 `observe_on`; configuração com os mesmos bytes; `off` alcança A |
| I23-C2 … troca concorrente com outro setup e on | `setup C` pausado antes do lock; `setup B` e `on` concluem | `setup C` 4 `observe_on` pela configuração relida sob o lock; B `on`, A/C `off` |
| I23-C4 … off espera a barreira | `setup B` pausado antes de gravar; `off` iniciado | `off` espera e responde 0, `changed: false`; configuração B |

Os nomes contêm os padrões das provas C2 e C4 do checklist, que os selecionam.
Os três de C2 também conferem que só a raiz configurada pode estar `on` e que o
`off` seguinte alcança todas; os quatro, que a pasta `.skill-me` termina só com
`observe.json`.

- Vermelho, Windows 11, Node 24.22.1: os três primeiros contra o produto de
  `0d915a6` (idêntico ao de `1ccfe70`), antes de mudar o código: 0 pass, 3 fail —
  "raiz anterior ação ficou on fora da configuração" (`'on' !== 'off'`) nas duas
  ordens do F1 e `'off concluído' !== 'off esperou'`. Depois de escrito o quarto, os
  quatro contra os três arquivos de produto de `0d915a6` restaurados na árvore (e
  devolvidos ao HEAD em seguida, `git status` limpo): 0 pass, 4 fail; o quarto com
  "raiz nova ação ficou on fora da configuração".
- Verde: os três primeiros logo depois da correção (3 pass, 0 fail, 0 skip); os
  quatro com o conteúdo de `deacc50` antes do commit (4 pass, 0 fail, 0 skip) e de
  novo no `npm test` e no WSL em `deacc50` (abaixo).
- Reprodução literal do Verifier (script fora do repositório, `on` aguardado antes
  de soltar o `setup B`): produto de `0d915a6` →
  `{"first":0,"onOld":0,"changed":0,"configured":"B","status":"off","old":"on","new":"off"}`,
  o resultado do relatório; produto corrigido → `on` 4 `lock_present` depois de
  2011 ms de espera, `setup B` 0, A e B `off`.

### Mutações

Cada mutação em `observe/command.mjs`, rodando os quatro testes e restaurando os
bytes (conferido: `git diff -- src` vazio depois):

| Mutação | Resultado (pass/4) | Detectada por |
| --- | --- | --- |
| M17 `on`/`off` sem a barreira | 1/4 | as duas ordens do F1 e a espera do `off` |
| M18 `setup` lê a configuração anterior antes do lock | 3/4 | dois setups e `on` |
| M18b `setup` confere a raiz anterior antes do lock | 2/4 | `on` já leu a anterior; dois setups e `on` |
| M19 `off` sem a barreira | 3/4 | espera do `off` |
| M20 `on`/`off` soltam o lock antes de mudar a raiz | 3/4 | `on` já leu a anterior |

A M18 passou nos três primeiros testes (3/3): sem um segundo `setup`, ler a
configuração antes do lock não muda nada. O quarto teste foi escrito por isso
(`deacc50`); a M18b, uma primeira montagem quebrada pelo CRLF do arquivo
restaurado, foi refeita com as quebras normalizadas e os resultados acima são os
dessa versão.

### Provas do checklist

Windows 11, Node 24.22.1, comando literal de cada check, na árvore ainda não
commitada equivalente a `d2b49cf`, exceto por um comentário de `withConfigLock`
reescrito depois (sem efeito no código) e sem o quarto teste:

| Check | Testes | Resultado |
| --- | --- | --- |
| C1 | 1 | 1 pass, 0 fail, 0 skip |
| C2 | 3 (o original e as duas ordens do F1) | 3 pass, 0 fail, 0 skip |
| C3 | 1 | 1 pass, 0 fail, 0 skip |
| C4 | 2 (o original e a espera do `off`) | 2 pass, 0 fail, 0 skip |
| C12 | 2 | 2 pass, 0 fail, 0 skip |
| C13 | 1 | 1 pass, 0 fail, 0 skip |
| C18 | 2 (afetado pela documentação) | 2 pass, 0 fail, 0 skip |

WSL Ubuntu 22.04 (Node 24.13.0, uid 1000), `git archive deacc50` em
`/tmp/skill-me-i23-f1-IHLr5j` (sha256 `81d8ca80…de4182763` igual nos dois lados;
`git get-tar-commit-id` = `deacc501…`), `node_modules` copiado do checkout: C1 1/1,
C2 4/4, C3 1/1, C4 2/2, C12 2/2, C13 1/1, C18 2/2 — 13 pass, 0 fail, 0 skip;
C1 afirma 0700/0600 da pasta e do arquivo de configuração no POSIX.

### Suítes

| Ambiente | Alvo | Resultado |
| --- | --- | --- |
| Windows — a mesma árvore das provas acima | `node --test "tests/integrations/**/*.test.mjs"` | exit 1 — 440 tests, 431 pass, 2 fail, 7 skip |
| Windows — HEAD `deacc50`, árvore limpa | `npm test` | exit 1 — governança 6/6; motor 16/16; doctor 417 (410 pass, 7 skip); integrações 441 (433 pass, 1 fail, 7 skip) |
| WSL Ubuntu — `deacc50` (arquivo acima) | `node --test "tests/integrations/**/*.test.mjs"` | exit 0 — 441 tests, 428 pass, 0 fail, 13 skip |

Falhas no Windows, ambas por prazo de entrega sob a carga da suíte paralela:

- `T8-C15` (o G1 do relatório, captura manual) nas duas rodadas:
  `delivery_timeout` com 39/40 e depois 0/40 confirmados. Isolado no código
  corrigido, 3 de 3 rodadas passaram. O teste não foi alterado; o G1 continua
  registrado como no relatório do Verifier, que já o viu em `1ccfe70`, antes desta
  correção.
- `T7-C10` (relatório de captura manual) só na primeira rodada: `report` respondeu
  4 `lock_present` logo depois dos hooks vinculados; o teste levou 7987 ms, contra
  ~1450 ms isolado. Isolado, 3 de 3 passaram, e passou na segunda rodada completa e
  no WSL. O caminho manual só mudou pela divisão de `withLock` em `holdLockFile`,
  com as mesmas operações na mesma ordem; o comportamento documentado de um hook
  que sai no prazo segurando o lock (`docs/traces.md`, "Falhas de entrega") explica
  o lock encontrado, mas não houve prova direta da causa nesta rodada.

Skips: no Windows, os 7 de integrações e os 7 do doctor são os POSIX/FIFO de
antes; no WSL, 9 por falta do runtime Hermes (`I4-C18`…`I4-C44b` e `I23-C8`), 3 de
DACL do Windows e 1 de ACL do macOS. `git diff --check`: exit 0.

### Limitações e mudanças de comportamento

- O lock da configuração, como o do store, nunca é removido por outro processo:
  depois de uma interrupção no meio de `setup`/`on`/`off`, os três respondem 4
  `lock_present` até a remoção manual, agora documentada.
- `on`/`off` podem esperar até 2 s pelo lock da configuração e depois até 2 s pelo
  da raiz.
- `setup` cria a pasta `.skill-me` antes de ler o estado da raiz nova (que agora
  ocorre sob o lock): um primeiro `setup` recusado por um store inválido na raiz
  nova deixa a pasta vazia, sem configuração.
- `on`/`off` passam a recusar com `link_refused` uma `.skill-me` trocada por link ou
  junção, como o `setup` já fazia; antes eles seguiam o link para ler a
  configuração. Hooks e ingest continuam lendo pelo caminho como antes.
- `status` não toma o lock: durante um `setup` em curso ele pode descrever a
  configuração anterior.
- Nenhuma sessão real de agente; nenhum hook pessoal instalado nem `on` real:
  `~/.skill-me` continua inexistente no Windows e no WSL. Core vendorizado e pilotos
  não foram tocados.

## Correção do F2 (verificação independente, rodada 2)

Base: `7a8553c`, com o veredito FAIL da rodada 2 em
`.checks/issue-23-observacao-on-off.verified.md` (não editado aqui). Escopo
autorizado pelo orquestrador: corrigir o F2 — a pasta da configuração como
fronteira de confiança na leitura, na decisão e no efeito —, avaliar `setup`,
`off`, `status`, `report --latest` e o plugin Hermes onde a mesma falha os atinge,
e investigar o G1 de forma proporcional, sem mudar o T8-C15. Builder: Claude,
perfil `light`. As seções anteriores deste arquivo não foram alteradas.

### Commits

- `05f9c23` docs(checks): registrar a pasta da configuração como fronteira — linha
  "Pasta da configuração" do Landing, commitada antes de qualquer mudança de
  produto (regra nova de conferência e o código `foreign_entry` para outra pasta
  real no mesmo nome).
- `f343e99` fix(observe): conferir a pasta da configuração em cada leitura
- `bb3dbc3` fix(hermes): recusar a pasta da configuração trocada por junção
- `a2b95ad` test(observe): provar a troca da pasta da configuração por junção
- `40d77fc` docs(observe): documentar a pasta da configuração como diretório real
- o commit deste registro (docs(checks))

### Onde a mesma falha chegava

Medido no produto de `7a8553c` pelas provas novas (vermelho abaixo):

| Consumidor | No produto anterior, com `.skill-me` trocada por junção para a pasta de outra configuração | Agora |
| --- | --- | --- |
| `on` | a reprodução do F2: lock e leitura pela junção, 0 e a raiz alheia `on` | 4 `link_refused`, raiz alheia intacta |
| `off` | troca durante a leitura: desligava a raiz alheia (e encerraria as automáticas dela) e deixava a original `on`; respondia 4 `foreign_entry` só porque a liberação do lock não o achava pela junção | 4 `link_refused`, as duas raízes intactas |
| `setup` | temporário e `rename` pelo nome gravavam a configuração nova na pasta alheia (4 `foreign_entry`, de novo pela liberação) | 4 `link_refused`, pasta alheia com os mesmos bytes |
| `status`, `report --latest` | seguiam a junção: `status` 0 com o estado da raiz alheia, `report` 3 `no_automatic_capture` | 4 `link_refused` |
| hooks e ingest | seguiam a junção; com a raiz alheia `on`, o hook gravou a sessão nela (`committed: 1`) | `link_refused` no relatório da entrega, nada gravado |
| plugin Hermes | `is_symlink()` não reconhece junção no Python 3.11 do Hermes: lia o `hermesDelivery` alheio, que passaria a executar | sem destino (inativo, como I4-C44b) |
| captura manual, store | não leem a configuração | inalterados |

### Correção

`observe/config.mjs`: toda leitura de `observe.json` confere a pasta com
`lstat(..., { bigint: true })` antes e depois do arquivo — diretório real (link ou
junção: `link_refused`) e a mesma identidade `dev`/`ino` (outra pasta, ausente ou
não diretório: `foreign_entry`). `bigint` porque no Windows o índice do arquivo de
uma pasta comum medido aqui já passa de 7,5·10^15, perto do limite exato do
Number. `configDir` devolve `{ dir, identity }`; `withConfigLock`
(`observe/command.mjs`) usa essa identidade, obtida antes de criar
`observe.lock`, como referência da leitura sob o lock, de modo que a primeira
conferência ali já recusa uma troca anterior ao lock. `writeObserveConfig` grava
na pasta conferida e a confere de novo entre o temporário e o `rename` (o temporário
gravado pela junção sai de lá; o `rename` pelo nome só acha o temporário na pasta
onde ele foi gravado). Sem referência (`status`, `report --latest`, hooks,
ingest), vale a identidade da primeira conferência, e um nome que não é diretório
continua sendo "nada configurado", como antes. `configPath`, sem uso depois disso,
saiu.

Plugin (`hermes/plugin/__init__.py`): a pasta precisa ser diretório real — sem
`S_ISLNK` nem `st_reparse_tag == IO_REPARSE_TAG_MOUNT_POINT`, que é como o Python
3.11 do Hermes mostra a junção (conferido nesta máquina: `S_ISDIR` verdadeiro,
`is_symlink()` falso) — e ter o mesmo `(st_dev, st_ino)` antes e depois da
leitura; senão, sem destino.

O lock de `holdLockFile` não mudou: a liberação só apaga o arquivo com os bytes
desta execução. Trocada a pasta antes do lock, ele é criado e liberado pela
junção, e nada fica; trocada depois, ele vai junto com a pasta movida e fica lá,
como em I4-C27b. Formato da configuração, permissões, barreira do F1 e comandos
manuais: inalterados.

### Regressão: vermelho e verde

Um teste novo em `observe/control.cli.test.mjs`, com o padrão do C2, sobre home e
raízes temporários reais. A troca é feita pelo io do comando logo antes da
operação escolhida (sem tempo nem pausa) e, na segunda linha, desfeita logo depois
da leitura. Cada linha afirma o código exato, que nenhuma raiz alheia mudou
(estado e geração iguais aos de antes), o conteúdo das duas pastas de
configuração, `status`/`report --latest`/hook com a junção ainda no lugar e, com a
pasta original de volta (e o lock próprio dela removido como o README manda), `on`
e `off` controlando a raiz original:

| Linha | Esperado |
| --- | --- |
| `on`, junção antes de criar o lock (a reprodução do F2) | 4 `link_refused`; lock criado e liberado pela junção |
| `on`, junção antes do lock, desfeita depois da leitura | 4 `link_refused` pela conferência sob o lock |
| `off`, junção sob o lock, ao ler a configuração (raízes `on`) | 4 `link_refused`; lock próprio na pasta movida |
| `on`, outra pasta real antes de criar o lock | 4 `foreign_entry` |
| `setup`, junção sob o lock, antes do temporário | 4 `link_refused`; pasta alheia intacta |

No `hermes-plugin.native.test.mjs`, com o padrão do C8, `_load_delivery()` da
fonte do plugin pelo Python do Hermes: pasta real (controle: o argv do `setup`),
junção antes da leitura e junção posta pelo `open` do módulo ao abrir o arquivo
(as duas: `null`, e a troca confirmada).

- Vermelho, Windows 11, Node 24.22.1, com os dois arquivos de produto (e depois o
  plugin) de `7a8553c` postos na árvore por `git stash` e devolvidos em seguida:
  C2 novo 0/1 — as cinco linhas divergem (`on` 0 e a raiz alheia `on` com sessão
  gravada pelo hook; na linha desfeita, raiz alheia `on` e o lock próprio órfão na
  pasta alheia; `off` desliga a raiz alheia; pasta real: raiz alheia `on`; `setup`
  altera a configuração alheia; `status` 0, `report` 3 e hook `observe_off` com a
  junção). C8 novo 0/1 — as duas trocas devolvem o argv alheio; o controle passa.
- Verde: C2 novo 1/1 e C8 novo 1/1, 0 skip.

### Mutações

Cada mutação aplicada por script fora do repositório, com o teste correspondente,
e os bytes originais restaurados (hashes conferidos depois):

| Mutação | Resultado | Linha que a detecta |
| --- | --- | --- |
| M21 sem a conferência sob o lock antes da leitura | 0/1 | `on`, desfeita depois da leitura (raiz alheia `on`, lock próprio órfão na pasta alheia) |
| M22 sem a conferência depois da leitura | 0/1 | `off` durante a leitura |
| M23 só recusa link, sem comparar a identidade | 0/1 | outra pasta real |
| M24 `setup` sem conferir a pasta antes do `rename` | 0/1 | `setup` |
| M25 leitura sob o lock sem a referência anterior ao lock | 0/1 | outra pasta real |
| M26 plugin sem a conferência depois da leitura | 0/1 | plugin, junção durante a leitura |
| M27 plugin sem reconhecer junção (só `S_ISLNK`) | 0/1 | plugin, junção antes da leitura |

As duas linhas "desfeita depois da leitura" e "outra pasta real" foram
acrescentadas por isso: com a junção sempre no lugar, a conferência depois da
leitura sozinha já recusava as três primeiras, e M21, M23 e M25 passariam.

### Provas do checklist

Windows 11, Node 24.22.1, árvore equivalente a `40d77fc`, comando literal de cada check:

| Check | Testes | Resultado |
| --- | --- | --- |
| C1 | 1 | 1 pass, 0 fail, 0 skip |
| C2 | 5 (o original, os três do F1 e o do F2) | 5 pass, 0 fail, 0 skip |
| C3 | 1 | 1 pass, 0 fail, 0 skip |
| C4 | 2 | 2 pass, 0 fail, 0 skip |
| C8 | 2 (o original e o do plugin) | 2 pass, 0 fail, 0 skip (Hermes 0.21.4 local) |
| C12 | 2 | 2 pass, 0 fail, 0 skip |
| C13 | 1 | 1 pass, 0 fail, 0 skip |
| C18 | 2 | 2 pass, 0 fail, 0 skip |

Essas provas rodaram entre 13:16:29 e 13:17:04 (`/tmp/i23f2/proof-C*.txt`), pouco antes
dos commits (13:17:16). A última modificação dos oito arquivos de `7a8553c..40d77fc`
ocorreu entre 13:05:31 e 13:16:14, e nenhum deles difere de `40d77fc`. Os mesmos
checks rodaram de novo no HEAD dentro do `npm test` abaixo: os 29 testes `I23-`
(C1 a C18) passaram, sem falhas nem skips.

### Suítes

| Ambiente | Alvo | Resultado |
| --- | --- | --- |
| Windows — HEAD `40d77fc`, árvore de produto limpa | `npm test` (`/tmp/i23f2/npm-test-1.txt`) | exit 1 — governança 6/6; motor 16/16; doctor 417 (410 pass, 0 fail, 7 skip); integrações 443 (435 pass, 1 fail, 7 skip) |
| Windows — HEAD `40d77fc` | `node --test --test-reporter=spec --test-name-pattern="T8-C15" tests/integrations/traces/concurrency.cli.test.mjs`, três vezes | 3 de 3 com 1 pass, 0 fail, 0 skip (`/tmp/i23f2/t8c15-iso-{1,2,3}.txt`) |

As integrações passam de 441 para 443 testes com os dois novos do F2. A única
falha foi o `T8-C15` (o G1), na rodada 1: `bound: true` e `entries: 1`, mas
`code: 'lock_present'`, `committed: 0`, `persisted: 0` e `lost: 1`, quando se
esperavam `code: null` e 1/1/0. A mesma falha já ocorreu no Verifier em `1ccfe70`,
antes da correção do F1, e no builder em `deacc50`, antes do F2
(`delivery_timeout`, seção anterior). Isolado no HEAD, o teste passou 3 de 3
vezes. O intervalo `7a8553c..40d77fc` não altera `src/integrations/traces/`, e a
captura manual e o store não leem a configuração. Não há evidência de regressão
determinística no caminho manual. O teste não foi alterado.

### Experimento A/B do G1 (interrompido, sem resultado)

Para investigar o G1, o T8-C15 de duas cópias criadas por `git archive` (`A` =
`a2400c3`, `main` antes da #23; `B` = `40d77fc`), com o `node_modules` do checkout
em `/tmp/i23f2-ab/`, foi executado em alternância:

- Com carga sintética de CPU (`/tmp/i23f2/ab-load.mjs`, com 32, 64 e 96 processos
  de laço e uma rodada cada; `ab-cal{32,64,96}.txt`), A e B passaram nas três e a
  falha não apareceu.
- Com a suíte de integrações de uma terceira cópia (`L`) como carga
  (`/tmp/i23f2/ab-suite.mjs`, saída em `/tmp/i23f2/ab-suite.txt`), as primeiras
  linhas têm resultado mensurável e mostram falhas válidas nos dois lados: `A` com
  `io_failure` (por exemplo, nas linhas 98 e 196) e `B` com `lock_present` (linha
  1). A partir da linha 223 e até o fim (17.301 linhas, sem a linha de resumo),
  todas são `FAIL NaNms`, sem execução mensurável do teste por exaustão de
  processos.

Esse arquivo não serve para calcular taxas, e o A/B não foi concluído. O script
tinha um defeito: o laço `while (running)` só chama `spawnSync` e não devolve o
controle ao event loop, de modo que o `exit` da carga nunca chegava a marcar
`running = false`. Por isso, a interrupção do processo anterior do builder não
encerrou o experimento. No início desta sessão, o processo (PID 20420, iniciado às
13:23:40, logo depois do lançamento em segundo plano às 13:23:39) ainda
acrescentava linhas `NaNms`. Às 13:39:34, ele foi encerrado ao marcar o arquivo de
saída como somente leitura, para que só o processo que escrevia nele falhasse no
`appendFileSync`. Depois de confirmados a saída do PID e o arquivo parado (398.343
bytes), o atributo foi removido. O A/B e a carga sintética não foram executados de
novo.

### Skips e checks gerais

- Windows, integrações: os 7 skips de antes, todos por plataforma — `I4-C15` e
  `T8-C4` (sinais POSIX), `I4-C25b` (modos POSIX), `I4-C25j`, `I4-C25k` e `I4-C25l`
  (ACL POSIX do Linux) e `I4-C25m` (ACL do macOS). Doctor: os 7 skips POSIX/FIFO de
  antes.
- Os dois testes novos do F2 usam junção no Windows e link de diretório no POSIX.
  Nesta rodada não houve execução no WSL, e o lado POSIX deles não foi exercitado.
- `git diff --check 7a8553c 40d77fc`: exit 0. `git diff --check` com este registro:
  exit 0.

### Limitações e mudanças de comportamento

- Este item substitui o da seção anterior segundo o qual hooks e ingest continuavam
  lendo pelo caminho. Agora `status`, `report --latest`, hooks e ingest também
  recusam com `link_refused` uma `.skill-me` trocada por link ou junção (os hooks
  registram a recusa no relatório da entrega e não gravam nada). Outra pasta real
  posta no lugar entre as conferências gera `foreign_entry`. Nesses casos, o plugin
  Hermes fica sem destino.
- Uma troca da pasta depois de criado o lock leva o lock próprio para a pasta
  movida, como em I4-C27b. Com a pasta original de volta, vale a remoção manual
  documentada.
- O G1 continua aberto como no relatório do Verifier: falha sob a carga da suíte
  paralela no Windows, sem causa provada. O A/B não chegou a resultado.
- A linha de comando dos `node.exe` não pôde ser lida nesta sessão, porque a
  consulta de processos pelo PowerShell foi negada sem aprovação. A conferência de
  processos abaixo usa o horário de início e a árvore MSYS.
- Nenhuma sessão real de agente; nenhum hook pessoal instalado nem `on` real.

### Estado ao final

- Processos: o PID 20420 do A/B saiu. Não há `node.exe` vivo iniciado entre 13:22
  (calibração) e 13:36. Os iniciados depois coincidem com o início de sessões de
  agentes nesta máquina (um par de `node.exe` a cada sessão desde 11:37), e os
  processos MSYS ativos são de outros projetos (`fofura_em_camadas`).
- Home real: `~/.skill-me` não existe no Windows. `~/.claude/settings.json`,
  `~/.claude/settings.local.json`, `~/.codex/hooks.json` e `~/.codex/config.toml`
  não mencionam o skill-me, e os plugins do Hermes local se resumem a
  `orca-status`.
- Árvore: antes do commit, `git status` mostra só este registro. `.verified.md`, o
  core vendorizado e os pilotos não mudaram: os oito arquivos de
  `7a8553c..40d77fc` não incluem nenhum deles. O worktree `skillme-base-2da52eb`
  em `%TEMP%`, criado às 11:30 no build original, continua registrado e não foi
  tocado. As cópias `/tmp/i23f2-ab/` e os logs em `/tmp/i23f2/` ficam fora do
  repositório.

## Correção do F3 (verificação independente, rodada 3)

Base: `8b5b62d`, com o veredito FAIL da rodada 3 em
`.checks/issue-23-observacao-on-off.verified.md` (não editado aqui). Escopo
autorizado pelo orquestrador: corrigir o F3 dentro do escopo aprovado — a raiz
que o `on` autorizou precisa continuar ao alcance do `off` mesmo com a pasta
`.skill-me` trocada antes ou depois do efeito, sem autorização órfã numa falha
do `on` — e, depois, tratar a confiabilidade do gate (G1) com medida
proporcional, sem enfraquecer o T8-C15. Builder: Claude, perfil `light`. As
seções anteriores deste arquivo não foram alteradas. Nenhuma nova verificação
foi convocada: ela depende da resposta do proprietário ao escalonamento.

### Commits

- `507707e` docs(checks): registrar a raiz autorizada fora da pasta da
  configuração — linha "Registro da autorização" do Landing, commitada antes de
  qualquer código (arquivo e formato novos, alternativas rejeitadas).
- `e342bfd` fix(observe): manter a raiz ligada ao alcance do off pelo registro no home
- `9412bab` test(observe): provar o off pela raiz registrada depois da troca da pasta
- `c115ce2` docs(observe): documentar o registro da raiz autorizada no home
- `a3a76d8` test(integrations): limitar a suíte a 8 arquivos em paralelo
- `15559b4` docs(observe): explicar on com erro e raiz registrada inacessível
- o commit deste registro (docs(checks))

### Escolha e por que é a menor

O F3 mostra que nenhuma conferência fecha a janela: a pasta pode ser trocada
depois da última, e uma troca depois de um `on` bem-sucedido (ou a pasta
apagada) tem o mesmo efeito — a raiz fica `on` e o `off` lê outra
configuração. Qualquer correção precisa de um apontamento para a raiz que não
se mova com a pasta e que exista antes do efeito. Alternativas:

| Alternativa | Por que não |
| --- | --- |
| Mais uma conferência (`lstat`) depois do efeito | A troca pode vir depois dela. |
| Rollback do `on` ao perceber a troca | Só cobre trocas percebidas pelo próprio `on`; uma queda entre o efeito e o rollback deixa a raiz órfã; uma troca depois de um `on` bem-sucedido não é falha dele. Com um registro durável o rollback deixa de ser necessário, e sem ele não basta. |
| Registro dentro de `.skill-me` | Vai junto com a pasta movida. |
| Conjunto de raízes no home com lock próprio | Mais um lock (e mais um lock residual depois de uma queda) para manter várias raízes `on` ao mesmo tempo, o que a configuração, com uma raiz por vez, nunca produz. |
| Prender a autorização à identidade da pasta | A raiz fica inerte enquanto a pasta é outra, mas o `off` continua sem alcançá-la e ela volta a valer quando a pasta volta. |

Escolha: um único registro, `<home>/.skill-me-authorization.json`, direto no
home (a âncora de `os.homedir()`; não há pasta intermediária que possa ser
trocada), com a forma literal do Landing
`{"skillMeObserveAuthorization":1,"rootReal":"<rootReal>"}`. Nenhum lock
novo: o registro só muda sob o `.lock` do store da raiz que ele nomeia, e a
criação exclusiva (`wx`) impede que duas raízes se registrem.

### Invariante, transições e corridas

Invariante: raiz `on` ⇒ registro com ela. Logo há no máximo uma raiz `on`, e o
`off` a alcança pelo registro, qualquer que seja a pasta `.skill-me`.

| Registro | `on` (raiz configurada R) | `off` |
| --- | --- | --- |
| ausente | sob o lock de R: cria o registro com R (flush), depois grava `on` | desliga R (nada a fazer se já `off`); nada a apagar |
| nomeia R | não reescreve; grava `on` se R estava `off` | desliga R, encerra as automáticas e apaga o registro, sob o lock de R |
| nomeia outra raiz S | 4 `observe_on`, nada ligado | desliga R e depois S, pelo `rootReal` de S; apaga o registro sob o lock de S |
| link/junção | 4 `link_refused`, nada ligado | desliga R; responde 4 e mantém o registro |
| ilegível ou fora da forma | 3 `config_invalid`, nada ligado | desliga R; responde 3 e mantém o registro |
| qualquer, com a configuração ilegível, trocada ou ausente | — (não há raiz a ligar) | desliga a raiz do registro; responde o código da configuração |

- `on` de R × `off` de R: os dois mudam o registro e o estado de R sob o mesmo
  lock, então nunca se cruzam entre um e outro (prova "se revezam pelo lock da
  raiz"; a mutação M28, que registra fora do lock, é detectada por ela).
- `on` de R × registro de S: `wx` falha com o registro de S e o `on` recusa;
  se o `off` acabou de apagá-lo, o `on` seguinte cria o dele.
- `off` concorrentes: o segundo encontra a raiz já `off` e o registro já
  apagado (ou de outra raiz, que não apaga).
- A parte do registro no `off` roda fora do lock da configuração, porque a
  pasta pode estar recusada. `setup` não lê nem muda o registro; um `on`
  concorrente que segura o lock da configuração muda o registro só sob o lock
  da raiz, como acima.

Estados de queda:

- antes do registro: nada mudou.
- registro gravado (com flush), estado `on` não: R `off` com registro. O `on`
  seguinte de R o reaproveita; o `off` o apaga; o `on` de outra raiz recebe
  `observe_on` até o `off`.
- queda entre criar o arquivo e o flush: arquivo vazio ou incompleto. `on` e
  `off` respondem 3 `config_invalid` e o mantêm; o `on` que o criou não chegou a
  gravar `on` (o estado só é gravado depois do flush), então a remoção manual,
  documentada, é segura. Apagar o arquivo depois de uma falha da abertura foi
  descartado: uma falha antes da criação, seguida da criação do registro por
  outra raiz, apagaria o registro alheio.
- estado `on` gravado: R `on` com registro; o `off` alcança.
- `off` depois de gravar `off` e antes de encerrar as automáticas ou apagar o
  registro: o próximo `off` termina.
- Durabilidade: o registro tem flush antes do estado `on`. A pasta do home não
  recebe flush de diretório, como nenhuma pasta do store; vale a ordem dos
  metadados do sistema de arquivos com journal (NTFS, ext4, APFS).

Permissões e links: criação `wx` 0600 (no POSIX; no Windows, a DACL herdada do
home), que nunca segue um link (um link no nome faz a criação falhar com
`EEXIST`, e a leitura por `lstat` responde `link_refused`); leitura até 64 KiB,
chaves exatas e `rootReal` absoluto. O home não é conferido: é a âncora.

Resposta: no uso normal, `on` e `off` respondem exatamente como antes (as provas
C1, C3 e C4 existentes não mudaram). Quando o `off` também desliga a raiz do
registro, `changed`, `stopped` e `failed` somam as duas; qualquer erro sai só
com o código, como antes, mesmo que a raiz registrada tenha sido desligada.

### Regressão: vermelho e verde

Três testes novos em `observe/control.cli.test.mjs`, todos com o padrão do C4
(`off encerra e é idempotente`), em processo, sobre homes e raízes temporários
reais, com a troca feita pelo io do comando (sem tempo):

| Teste | Linhas e o que afirmam |
| --- | --- |
| pasta trocada depois da leitura do on | junção ou pasta real, logo depois do primeiro acesso do `on` à raiz (já depois da última conferência) ou do `rename` que grava o estado `on`: `on` 4 `foreign_entry` com a raiz `on` e o registro dela; um produtor aberto na geração ligada grava 1; `off` desliga a raiz pelo registro (junção: 4 `link_refused`; pasta real: 0, `changed: true`, `stopped` com a captura), encerra a captura e apaga o registro; o produtor tardio sai `observe_off` e o store não muda; o segundo `off` não muda nada; a pasta movida guarda só a configuração e o lock próprio; com a pasta de volta, `on`/`off` controlam a raiz e o registro |
| registro da autorização | seis linhas com o código, `changed`, o estado das duas raízes e os bytes do registro depois de cada passo: falha ao criar o registro (5, nada ligado, sem registro); registro criado vazio e a gravação falha (5; depois `on` e `off` 3 `config_invalid` e o arquivo fica; após a remoção manual, `on`/`off` normais); falha ao gravar o estado `on` depois do registro, seguida de `off` (apaga) ou de `on` (reaproveita); registro de outra raiz depois de apagada a `.skill-me` (`on` 4 `observe_on`, `status` 0, `off` desliga as duas e apaga); registro como link/junção (4 `link_refused` no `on` e no `off`, destino intacto). No POSIX, o registro nasce 0600 |
| on e off pelo registro se revezam pelo lock da raiz | `on` repetido para antes de tomar o lock da raiz; a pasta é trocada por uma real alheia e o `off` desliga a raiz pelo registro e o apaga; solto, o `on` liga de novo, com outra geração, e recria o registro; o `off` seguinte a alcança |

Vermelho, Windows 11, Node 24.22.1: com os três arquivos de produto de
`8b5b62d` postos na árvore (`git checkout 8b5b62d -- <arquivos>`, devolvidos
ao HEAD em seguida, `git status` limpo), os três testes novos, a linha `off` do
teste F2 e o C17: 0 pass, 5 fail (`/tmp/i23f3/red-final.txt`). No teste da
troca, nas quatro linhas: a raiz continua `on` com a mesma geração depois dos
dois `off`, a captura continua `active`, o produtor tardio grava
(`committed: 2`, store alterado) e não há registro; na pasta real, o `off`
responde `changed: false`, `stopped: []` — a reprodução do F3. A primeira
corrida vermelha, antes do código, tinha um erro do próprio teste (a linha do
link não fazia `setup`, `not_configured`); corrigido, a corrida acima é a dos
testes finais.

Verde: `control.cli` 13/13 e os oito arquivos de `observe/` 32/32, 0 skip.

### Mutações

Script fora do repositório (`/tmp/i23f3/mutations.mjs`): aplica a mutação,
roda os quatro testes afetados e restaura os bytes, conferindo os hashes;
`git status` vazio no fim.

| Mutação | F2 pasta trocada | F3 troca depois da leitura | registro | lock da raiz |
| --- | --- | --- | --- | --- |
| M28 registro criado fora do lock da raiz | 1/1 | 1/1 | 1/1 | **0/1** |
| M29 `off` sem a raiz do registro | **0/1** | **0/1** | **0/1** | **0/1** |
| M30 `off` apaga o registro de outra raiz | 1/1 | 1/1 | **0/1** | 1/1 |
| M31 `on` aceita o registro de outra raiz | 1/1 | 1/1 | **0/1** | 1/1 |
| M32 raiz do registro só com a configuração lida | **0/1** | **0/1** | 1/1 | 1/1 |
| M33 registro criado depois de gravar `on` | 1/1 | 1/1 | **0/1** | 1/1 |
| M34 registro lido através de link | 1/1 | 1/1 | **0/1** | 1/1 |

A ordem "apagar o registro depois de encerrar as automáticas" não tem mutação
detectável sem uma falha injetada no encerramento: a autorização já está `off`
nos dois casos; a ordem só evita que uma captura automática fique `active`
sem quem a encerre.

### Testes existentes alterados, e por quê

- `I23-C2 … pasta da configuração trocada por junção depois da primeira
  conferência` (F2): a linha `off, junção sob o lock` esperava a raiz original
  ainda `on` depois do `off` recusado — exatamente a autorização fora do
  alcance do F3. Com o registro, o `off` a desliga; a linha passa a esperar a
  original `off`, e todas as linhas continuam afirmando que a raiz alheia não
  muda. O código (4 `link_refused`), os leitores, as pastas e o controle depois
  da restauração não mudaram. A troca e a restauração da pasta saíram para
  `configSwap`/`removeOwnLock`, reutilizados pelos testes novos, sem mudar o
  que a prova faz.
- `I23-C17`: a sonda da #5 só admitia escrita no store e na pasta
  `.skill-me`. Ela admite agora também o caminho literal do registro (não o
  home inteiro), que só contém a raiz, e afirma que o `on` o gravou e que o
  `off` o apagou. Sem a mudança, a prova falhava em "escrita fora do store" com
  o próprio registro.
- `I23-C18`: confere no README o nome do registro (pela constante) e o
  `observe_on`. Sem o parágrafo novo do README: 0/1.

### Provas do checklist

Windows 11, Node 24.22.1, HEAD `c115ce2`, árvore limpa, comando literal de cada
check, em sequência (`/tmp/i23f3/proof-C*.txt`, 14:18–14:19):

| Check | Testes | Resultado |
| --- | --- | --- |
| C1 | 1 | 1 pass, 0 fail, 0 skip |
| C2 | 5 | 5 pass, 0 fail, 0 skip |
| C3 | 1 | 1 pass, 0 fail, 0 skip |
| C4 | 5 | 5 pass, 0 fail, 0 skip |
| C5 | 1 | 1 pass, 0 fail, 0 skip |
| C6 | 1 | 1 pass, 0 fail, 0 skip |
| C7 | 1 | 1 pass, 0 fail, 0 skip |
| C8 | 2 | 2 pass, 0 fail, 0 skip |
| C9 | 2 | 2 pass, 0 fail, 0 skip |
| C10 | 1 | 1 pass, 0 fail, 0 skip |
| C11 | 2 | 2 pass, 0 fail, 0 skip |
| C12 | 2 | 2 pass, 0 fail, 0 skip |
| C13 | 1 | 1 pass, 0 fail, 0 skip |
| C14 | 1 | 1 pass, 0 fail, 0 skip |
| C15 | 2 | 2 pass, 0 fail, 0 skip |
| C16 | 1 | 1 pass, 0 fail, 0 skip |
| C17 | 1 | 1 pass, 0 fail, 0 skip |
| C18 | 2 | 2 pass, 0 fail, 0 skip |

18/18 checks, 32 testes, 32 pass, 0 fail, 0 skip. O C8 rodou com o Hermes
0.21.4 local, sem skip.
Depois da mudança do README (`15559b4`), o C18 rodou de novo: 2 pass, 0 fail,
0 skip. Os 32 testes também passaram dentro das duas execuções do `npm test`
abaixo, no HEAD `15559b4`.

### G1: confiabilidade do gate no Windows

Histórico: o `T8-C15` falhou na suíte ampla do Windows no Verifier
(`1ccfe70`) e no builder (`deacc50`, duas vezes, uma delas junto com o
`T7-C10`; `40d77fc`), e passou isolado (1/1, 3/3, 3/3). O A/B anterior foi
interrompido sem taxas (seção do F2). O `T8-C15` não foi alterado.

Medida desta rodada: seis execuções de
`node --test --test-reporter=spec "tests/integrations/**/*.test.mjs"` no HEAD
`c115ce2`, alternando o paralelismo padrão do Node (31 arquivos nesta máquina de
32 núcleos lógicos) e `--test-concurrency=8`, cada uma com `timeout 1500`, em
sequência, sem outra carga minha (`/tmp/i23f3/g1.sh`, 14:19:55–14:41:55;
saídas `/tmp/i23f3/g1-<modo>-<n>.txt`). Sem carga sintética.

| Execução | Resultado | Duração |
| --- | --- | --- |
| padrão 1 | 446 testes, 439 pass, 0 fail, 7 skip | 194 s |
| `--test-concurrency=8` 1 | 446, 439 pass, 0 fail, 7 skip | 282 s |
| padrão 2 | 446, 432 pass, **7 fail**, 7 skip | 203 s |
| `--test-concurrency=8` 2 | 446, 439 pass, 0 fail, 7 skip | 180 s |
| padrão 3 | 446, 439 pass, 0 fail, 7 skip | 206 s |
| `--test-concurrency=8` 3 | 446, 439 pass, 0 fail, 7 skip | 254 s |

As sete falhas da execução padrão 2 são todas `delivery_timeout`, nas entregas
manuais (#8: `T8-C1`, `T8-C15` com 29/40 confirmados, `T8-C16`, `T8-C17`) e
automáticas (#23: `I23-C6`, `I23-C11`, `I23-C17`). O diagnóstico do `T8-C1`
mostra espera de disco, não de CPU: 651 ms da primeira à última operação, 82
operações, `sync` de até 125 ms, `close` 96 ms, `read` 79 ms e `lstat` 65 ms por
operação, 16 ms de CPU do processo. Com 31 arquivos em paralelo, os processos das
provas saturam o disco e o prazo de 750 ms da entrega estoura em qualquer
caminho que grave; não há falha determinística. Três rodadas de cada lado não
medem uma taxa: mostram que o limite de 8 removeu a falha nessas rodadas, com
média de 239 s contra 201 s do padrão, e o histórico acima aponta a mesma causa. Outras
sessões de agentes nesta máquina podem ter somado carga; ela não foi medida.

Decisão sobre o script (`a3a76d8`): `npm run test:integrations` passa a ser
`node scripts/test-integrations.mjs`, que roda o mesmo `node --test` com o mesmo
glob e `--test-concurrency=min(núcleos lógicos − 1, 8)` (no mínimo 1) e devolve
o código de saída dele. As asserções de todas as provas são as mesmas.

| Alternativa | Por que não |
| --- | --- |
| `--test-concurrency=8` fixo no `package.json` | Nos runners da CI (4 vCPU no Ubuntu e no Windows, 3 no macOS 14), o padrão é 3 ou 2 arquivos; 8 aumentaria o paralelismo lá sem medida, o mesmo risco transplantado. |
| `--test-concurrency=3` fixo | Neutro na CI de 4 vCPU, mas não medido aqui e mais lento no Windows local. |
| Prazo maior, nova tentativa ou mudança no `T8-C15` | Enfraquece o contrato de entrega da #8 ou esconde a falha. |

Provas: o `I4-C47` passa a fixar o lançador e o glob dele (com o
`package.json` anterior, 0/1); um teste novo em `fixtures-inventory.test.mjs`
confere a tabela do limite (1→1, 2→1, 3→2, 4→3, 9→8, 10→8, 32→8, 128→8), o argv
e, num diretório temporário, que a suíte verde sai 0, a vermelha sai 1 e um
`.mjs` fora do glob não roda. Mutações: o lançador sempre com 0 → 0/1; sem o
teto → 0/1 (lançador restaurado byte a byte).

### Suítes

| Ambiente | Alvo | Resultado |
| --- | --- | --- |
| Windows 11, Node 24.22.1 — HEAD `15559b4`, árvore limpa | `npm test`, 1ª execução (`/tmp/i23f3/npm-test-1.txt`) | exit 0, 220 s — governança 6/6; motor 16/16; doctor 417 (410 pass, 0 fail, 7 skip); integrações 447 (440 pass, 0 fail, 7 skip) |
| o mesmo | `npm test`, 2ª execução (`/tmp/i23f3/npm-test-2.txt`) | exit 0, 223 s — os mesmos números |
| WSL Ubuntu 24.04.3, Node 24.14.0, uid 1000 — `/tmp/skill-me-i23-f3-qKxDIp`, de `git archive 15559b4` (sha256 `984e1b9c1d98fc82…` igual nos dois lados; `git get-tar-commit-id` = `15559b46…`), `node_modules` copiado do checkout | C1–C18 literais | 32 testes: 30 pass, 0 fail, 2 skip (os dois C8, sem runtime Hermes) |
| o mesmo | `node scripts/test-integrations.mjs` | exit 0, 33 s — 447 testes, 433 pass, 0 fail, 14 skip |

As integrações passam de 443 para 447 testes: três provas do F3 e a do
lançador. No WSL rodaram o lado POSIX das provas novas: registro com link
simbólico, pastas trocadas por link de diretório e o modo 0600 do registro.
O doctor não rodou no WSL nesta rodada (não foi tocado).

Skips: no Windows, os 7 de integrações são os de antes, todos de plataforma
(`I4-C15` e `T8-C4`, sinais POSIX; `I4-C25b`, modos POSIX; `I4-C25j`,
`I4-C25k` e `I4-C25l`, ACL POSIX do Linux; `I4-C25m`, ACL do macOS), e os 7 do
doctor são POSIX/FIFO. No WSL, 10 por falta do runtime Hermes (`I23-C8` duas
vezes, `I4-C18` a `I4-C23`, `I4-C37`, `I4-C44b`), 3 de DACL do Windows
(`I4-C25g`/`h`/`i`) e 1 de ACL do macOS (`I4-C25m`). `git diff --check`: exit 0
em cada commit.

### Limitações e mudanças de comportamento

- Um `on` que só percebe a troca da pasta ao soltar o lock responde 4
  (`foreign_entry`) com a raiz já `on`; ela fica no registro e o `off` a
  desliga (documentado). Não há rollback no `on`, pelos motivos da tabela de
  alternativas.
- Um `off` que encontra a configuração recusada (link, junção, outra pasta)
  desliga a raiz registrada e responde só o código da configuração, sem os
  campos da raiz desligada.
- Raiz registrada que não existe mais ou cujo caminho real mudou: o `off`
  responde o código dela (`root_not_found`, `root_changed`…) e mantém o
  registro; o `on` de outra raiz recebe `observe_on` até ela voltar ou até a
  remoção manual (documentado). Um registro que nomeia uma raiz cujo store foi
  apagado à mão também fica, porque o `off` só o apaga sob o lock dessa raiz;
  o `on` dela o reaproveita.
- `status` continua mostrando só a raiz configurada; um registro de outra raiz
  aparece pelo `observe_on` do `on` e é resolvido pelo `off`.
- Sem flush de diretório no home, como no resto do store (ver os estados de
  queda acima).
- A garantia vale contra a troca, o link ou a remoção da pasta `.skill-me`; o
  próprio registro apagado ou trocado à mão junto com a configuração fica fora
  do alcance, como o `observe.json` da raiz editado à mão.
- G1: três rodadas de cada lado; a CI não foi executada (sem push), e o
  lançador não muda o paralelismo nela.
- Nenhuma sessão real de agente; nenhum hook pessoal instalado; nenhum `on` no
  home real: `~/.skill-me` e `~/.skill-me-authorization.json` não existem no
  Windows nem no home do uid 1000 do WSL, e as configurações de Claude e Codex
  do usuário não mencionam o skill-me. Core vendorizado, pilotos e
  `.verified.md` não foram tocados.

### Estado ao final

- Processos: as medições do G1 (`g1.sh`) e as duas execuções do `npm test`
  terminaram sozinhas (14:41:55 e 14:52:08); nenhum script sem término foi
  iniciado. O `Monitor` de acompanhamento foi negado pela sessão e não rodou.
- Fora do repositório: `/tmp/i23f3/` (logs, script de mutações, arquivo do
  `git archive`) no Windows e `/tmp/skill-me-i23-f3-qKxDIp` e
  `/tmp/skill-me-i23-f3-out` no WSL.
- Árvore: limpa antes deste registro.

## Correção do intercalamento on/off e do conflito com o registro (depois do F3)

Base: `db7921a`. Escopo pedido pelo orquestrador nesta sessão: corrigir o
intercalamento do teste `on repetido e off pelo registro se revezam pelo lock da
raiz` — que esperava um `on` religar a raiz depois de o `off` responder —, sem só
trocar a expectativa nem acrescentar outra conferência tardia; tornar explícito o
conflito de `status`, `setup` e `report --latest` com uma raiz registrada `on`
fora da configuração; registrar o formato novo no Landing antes do código; manter
o G1 proporcional, sem repetir o A/B sintético. Builder: Claude, perfil `light`.
As seções anteriores deste arquivo não foram alteradas, e `.verified.md` não foi
tocado. Nenhuma nova verificação foi convocada: ela depende do proprietário.

### Commits

- `18122b8` docs(checks): registrar o lock do controle no home e o conflito com o
  registro — linhas "Configuração do usuário", "Barreira da configuração",
  "Pasta da configuração", "Registro da autorização" e "Consulta" revistas e a
  linha nova "Conflito com o registro", commitadas antes de qualquer código.
- `626129e` fix(observe): serializar on e off pelo lock no home e recusar conflito com o registro
- `223ffb3` docs(observe): documentar o lock no home e o conflito com o registro
- `25bc8a0` test(observe): provar o off depois do on em voo e o conflito com o registro
- o commit deste registro (docs(checks))

### O defeito

O lock de `setup`/`on`/`off` ficava em `<home>/.skill-me/observe.lock`, dentro
da pasta móvel. Com a pasta trocada por outra real B entre a leitura do `on` e o
lock da raiz A, o `on` segurava o lock da pasta antiga e o `off` tomava o da
nova: os dois não se revezavam. O `off` lia B, desligava A pelo registro e o
apagava; o `on` retomava, recriava o registro, ligava A com outra geração e
respondia 4 `foreign_entry` ao soltar o lock da pasta movida. O `status`, lendo
B, respondia `0 off` com A ligada. Do mesmo modo, com o registro apontando A
`on`, `setup` gravava uma raiz nova e `report --latest` relatava, com código 0,
a captura automática da raiz de B.

### Escolha e alternativas

`setup`, `on` e `off` passam a tomar `<home>/.skill-me-observe.lock`, direto no
home, ao lado do registro e fora da pasta móvel, na forma e na regra do `.lock`
do store (sem flush, 2 s de paciência, nunca removido por outro processo,
`foreign_entry` se os bytes mudarem). As duas partes do `off` — raiz configurada
e raiz do registro — ficam sob esse lock, também com a pasta recusada. Os
produtores continuam só com o `.lock` do store; `status`, `report --latest`,
hooks e ingest não tomam o lock novo. A pasta conferida antes do lock continua
a referência da leitura sob ele (F2).

| Alternativa | Por que não |
| --- | --- |
| Manter o lock em `.skill-me` | Vai junto com a pasta movida: é a causa do intercalamento. |
| Mais uma conferência da pasta no `on`, sob o lock da raiz | A troca pode vir depois dela (pedido explícito: sem conferência tardia). |
| Marcar o registro no `off` em vez de apagá-lo | Mais um estado persistido e a limpeza dele para obter a ordem que o lock já dá. |
| Dois locks (pasta e home) | O da pasta não protege mais nada e acrescenta um estado de queda. |

Conflito (linha "Conflito com o registro"): `setup`, `status` e
`report --latest` leem o registro com a mesma leitura e os mesmos códigos.

| Registro | `status` | `report --latest` | `setup` |
| --- | --- | --- | --- |
| ausente | uso normal | uso normal | segue (e recusa se a raiz anterior estiver `on`, como antes) |
| nomeia a raiz configurada | uso normal | uso normal | 4 `observe_on` |
| nomeia outra raiz | 4 `observe_on`, sem `observation` | 4 `observe_on`, nenhuma captura | 4 `observe_on` |
| presente, sem configuração | 4 `observe_on` | 3 `not_configured` (como antes) | 4 `observe_on` |
| ilegível ou fora da forma | 3 `config_invalid` | 3 `config_invalid` | 3 `config_invalid` |
| link ou junção | 4 `link_refused` | 4 `link_refused` | 4 `link_refused` |

As respostas de erro trazem só o código, sem caminho. `npm run off` desfaz o
conflito. Hooks, ingest e plugin não leem o registro: com outra raiz registrada,
a configurada não pode estar `on` (o `on` dela recusa), e eles respondem
`observe_off`. `status` não informa a raiz registrada como `on` porque exporia
estado, geração e capturas de uma raiz fora da configuração.

### Provas e testes alterados

| Teste (padrão do check) | O que afirma |
| --- | --- |
| I23-C4 … off que entra com o on em voo e a pasta da configuração trocada espera o lock do home (substitui o `se revezam pelo lock da raiz`) | Duas linhas: `on` repetido parado antes do lock da raiz A, e `on` (A `off`) parado logo depois de soltar o lock de A. Com o `on` parado, um produtor abre na geração ligada e grava 1; a pasta é trocada por uma real que aponta outra raiz; o `off` encontra o lock do home ocupado (`off esperou`). Solto, o `on` responde 0 (`changed` false/true) com a geração que estava no disco; o `off` responde 0, `changed: true`, `stopped` com a captura; A termina `off`, sem registro, captura `stopped`; o produtor tardio sai `observe_off` com o store intacto; `status` 0 `off`; o lock do home não sobra. |
| I23-C4 … status não afirma off, setup não troca a configuração e o off desfaz o conflito (novo) | Cinco linhas, com a resposta inteira de cada passo, a configuração, o estado de A e a presença do registro: pasta trocada por outra real (`status`, `setup`, `on` 4 `observe_on`; hook `observe_off` sem gravar; `off` 0 com a captura; depois `status` 0 `off` e `setup` grava); pasta apagada (`status`/`setup` 4 `observe_on`, `on` 3 `not_configured`, `off` 0, depois `status` 0 e `setup` grava); registro da raiz configurada sem `on`, depois de uma queda injetada (`status` 0 `off`, `setup` 4 `observe_on`, `off` apaga, `setup` grava); registro ilegível (3 `config_invalid`); registro como link/junção (4 `link_refused`). A raiz alheia termina `off` e sem capturas. |
| I23-C16 … nem a automática de outra configuração enquanto a raiz registrada está on (novo) | Com A `on` e a pasta trocada por outra real que aponta F, com uma captura automática: `report --latest` 4 `observe_on` nos três formatos, resposta inteira sem ID, sem escrita nas raízes; depois do `off`, escolhe a captura de F; registro ilegível 3 `config_invalid`; link 4 `link_refused`. |

Testes existentes alterados, e por quê:

- O teste `se revezam pelo lock da raiz` (F3) esperava o defeito — `on` 4
  `foreign_entry` com A `on` em outra geração depois do `off` — e foi
  substituído pelo primeiro da tabela acima, que exige A `off`.
- `I23-C2 … pasta da configuração trocada por junção` (F2): o gatilho "antes de
  criar o lock" passa a ser a criação do lock do home, e a pasta movida deixa
  de guardar `observe.lock` (nenhuma pasta o recebe; o observado ganhou
  `controlLock: false`). Códigos, raízes alheias, leitores e controle depois da
  restauração não mudaram; `removeOwnLock` saiu por não haver mais o que
  remover.
- `I23-C4 … pasta da configuração trocada depois da leitura do on` (F3): o
  `on` passa a responder 0 (`changed: true`, a geração gravada) em vez de 4
  `foreign_entry`, que vinha só da liberação do lock na pasta movida; a raiz
  continua no registro e o `off` seguinte a desliga, como antes. A pasta movida
  guarda só a configuração.
- `I23-C4 … registro da autorização`, linha "registro de outra raiz": a
  preparação fazia `setup` com outro registro presente, agora recusado; a
  configuração da raiz original entra por uma pasta real trocada (feita num home
  auxiliar). O passo `status` passa de `0 ok` para 4 `observe_on`.
- `I23-C17`: a sonda admite também o caminho literal do lock do home e afirma
  que ele foi gravado e não sobrou.
- `I23-C18`: confere as frases novas do README pelas constantes.

Nenhuma asserção foi enfraquecida. A única expectativa minha corrigida antes do
commit: a primeira versão do teste de conflito exigia que a raiz alheia nem
tivesse pasta do store, mas o `on` recusado pelo registro já a cria antes de
recusar (comportamento do F3, sem estado `on` nem captura); a prova passou a
afirmar raiz alheia `off` e sem capturas.

### Vermelho e verde

Windows 11, Node 24.22.1. Antes do código, as três provas novas contra o
produto de `db7921a` (igual ao de `18122b8`): 0/3 (`/tmp/i23f4/red-control.txt`,
`red-report.txt`). Na linha 1 do teste do `on` em voo: `off concluído` em vez de
`off esperou`, `on` 4 `foreign_entry`, A `on` com outra geração e o registro
dela. No conflito: `status` 0 `off` com A ligada, `setup` 0 gravando a raiz
nova. No `report --latest`: 0, com o relatório da captura de F.

Final, com os três arquivos de produto de `18122b8` postos na árvore
(`git checkout 18122b8 -- …` e devolvidos com `git checkout HEAD -- …`,
`git status` limpo): `control.cli`, `report.cli`, `privacy.e2e` e `docs` — 20
testes, 12 pass, 8 fail (`/tmp/i23f4/red-final.txt`): as três provas novas, as
quatro ajustadas (F2, F3, registro e C17, pelo lock e pelo `status`) e o
arquivo do C18, que não carrega sem a constante nova. Verde: os 19 testes de
`control.cli`, `report.cli` e `privacy.e2e` (`green-observe-a.txt`) e o C18
(`green-docs-1.txt`).

### Mutações

Script fora do repositório (`%TEMP%\i23f4-mutations.mjs`): aplica a mutação
(com o fim de linha do arquivo), roda as provas indicadas e restaura os bytes,
conferindo o sha256; `git status` limpo e hashes iguais depois
(`/tmp/i23f4/mutations.txt`).

| Mutação | Resultado (pass/testes) |
| --- | --- |
| M35 lock do controle de volta em `.skill-me/observe.lock` | on em voo 0/1; F2 0/1; F3 0/1; conflito 1/1 |
| M36 `off` sem o lock do home | on em voo 0/1 |
| M37 `on` sem o lock do home | on em voo 0/1 |
| M38 `status` sem conferir o registro | conflito 0/1; registro 0/1 |
| M39 `status` confere o registro só com configuração | conflito 0/1 |
| M40 `setup` sem conferir o registro | conflito 0/1 |
| M41 `setup` aceita o registro da raiz configurada | conflito 0/1 |
| M42 `report --latest` sem conferir o registro | report 0/1 |
| M43 `report` trata o erro do registro como E/S | report 0/1 |

Na M35 o teste de conflito passa: ele não exercita comandos concorrentes, e na
linha da pasta apagada o `setup` recusado recria a pasta antes do `off`, onde o
lock mutado é criado; as outras três provas a detectam. Rodar a parte do registro do `off`
fora do lock, depois da parte da configuração, não tem mutação detectável: a
parte da configuração já espera o `on` em voo, e um `on` entre as duas partes
seria concorrente com o `off`.

### Provas do checklist

Windows 11, Node 24.22.1, HEAD `25bc8a0`, árvore limpa, comando literal de cada
check em sequência (`/tmp/i23f4/checks.sh`, 15:19:44–15:20:55,
`/tmp/i23f4/proof-C*.txt`): C1 1, C2 5, C3 1, C4 6, C5 1, C6 1, C7 1, C8 2, C9 2,
C10 1, C11 2, C12 2, C13 1, C14 1, C15 2, C16 2, C17 1, C18 2 — 18/18 checks, 34
testes, 34 pass, 0 fail, 0 skip; o C8 rodou com o runtime Hermes local, sem
skip (a versão dele não foi conferida nesta rodada).

WSL Ubuntu 24.04.3, Node 24.13.0, uid 1000 — `/tmp/skill-me-i23-f4-zfyydJ`, de
`git archive 25bc8a0` (sha256 `554ce2ad5a6115e6…8e27834e` igual nos dois lados;
`git get-tar-commit-id` = `25bc8a0a…`), `node_modules` copiado do checkout: os
mesmos 18 checks, 34 testes, 32 pass, 0 fail, 2 skip (os dois C8, sem runtime
Hermes). Ali rodou o lado POSIX das provas novas: registro como link simbólico
no `status`, no `setup` e no `report --latest`, e a pasta trocada por pasta real.

### Suítes

| Ambiente | Alvo | Resultado |
| --- | --- | --- |
| Windows 11, Node 24.22.1 — HEAD `25bc8a0`, árvore limpa | `npm test` (`/tmp/i23f4/npm-test-1.txt`, 15:21:00–15:25:12) | exit 0, 4 min 12 s — governança 6/6; motor 16/16; doctor 417 (410 pass, 0 fail, 7 skip); integrações 449 (442 pass, 0 fail, 7 skip) |
| WSL (acima) | `node scripts/test-integrations.mjs` | exit 0, 33 s — 449 testes, 435 pass, 0 fail, 14 skip |

As integrações passam de 447 para 449: o teste do `on` em voo substitui o
anterior, e entram o do conflito e o do `report --latest`. Skips: no Windows, os
7 de integrações e os 7 do doctor de antes, todos de plataforma (`I4-C15`,
`T8-C4`, `I4-C25b`, `I4-C25j`, `I4-C25k`, `I4-C25l`, `I4-C25m`; POSIX/FIFO no
doctor). No WSL, os 14 de antes: 10 por falta do runtime Hermes (`I23-C8` duas
vezes, `I4-C18` a `I4-C23`, `I4-C37`, `I4-C44b`), 3 de DACL do Windows
(`I4-C25g`/`h`/`i`) e 1 de ACL do macOS (`I4-C25m`). O doctor não rodou no WSL
(não foi tocado). `git diff --check`: exit 0 antes de cada commit.

G1, proporcional: o A/B sintético não foi repetido. Uma execução do
`npm test` no Windows, com o lançador de `a3a76d8`, terminou sem falha; uma
rodada não mede taxa e não muda o que a seção do F3 registrou. A mudança só
acrescenta a criação e a remoção de um lock sem flush por `setup`/`on`/`off`;
produtores e entregas não mudaram.

### Limitações e mudanças de comportamento

- Lock do home residual depois de uma interrupção: `setup`, `on` e `off`
  respondem 4 `lock_present` até a remoção manual, agora de
  `.skill-me-observe.lock` no home (documentado). Diferente de antes, isso vale
  também para o `off` sem a pasta `.skill-me`, que precisa do lock para
  alcançar a raiz do registro.
- Sem a pasta `.skill-me`, o `on` responde 3 `not_configured` sem tomar o lock;
  o `off` cria e remove o lock no home. Sem home absoluto não há lock.
- O `on` que lê a configuração antes de uma troca da pasta responde 0 e liga a
  raiz que leu; a partir daí `status` e `report --latest` respondem
  `observe_on` e o `off` a desliga. Uma troca antes do lock continua recusada
  (F2).
- `setup` recusa com qualquer registro presente, inclusive o de uma queda do
  `on` sem estado `on`: rode `npm run off` antes.
- `status`, `setup` e `report --latest` passam a falhar com o código do
  registro quando ele está ilegível (3) ou é link (4), em vez de responder pela
  configuração.
- O `on` recusado com `observe_on` cria a pasta do store da raiz configurada
  antes de recusar (comportamento do F3, sem estado nem captura); não foi
  alterado.
- Uma troca desfeita entre duas conferências continua fora do alcance, como no
  `assertUnchanged` do store; o registro apagado ou trocado à mão junto com a
  configuração também.
- Nenhuma sessão real de agente; nenhum hook pessoal instalado; nenhum `on` no
  home real: `.skill-me`, `.skill-me-authorization.json` e
  `.skill-me-observe.lock` não existem no home do Windows nem no do uid 1000 do
  WSL, e as configurações de Claude e Codex do usuário não citam o skill-me.
  Core vendorizado, pilotos e `.verified.md` não foram tocados.

### Estado ao final

- Processos: todas as execuções foram em primeiro plano e terminaram; nenhum
  `node.exe` iniciado depois das 15:00:46 está vivo (a primeira prova desta
  rodada é das 15:11). A consulta de processos pelo PowerShell foi negada pela
  sessão; a conferência usou `ps -W`.
- Fora do repositório: `/tmp/i23f4/` (`%TEMP%\i23f4`: logs, `checks.sh`,
  arquivo do `git archive`) e `%TEMP%\i23f4-mutations.mjs` no Windows;
  `/tmp/skill-me-i23-f4-zfyydJ`, o `.tar` dela e `/tmp/i23f4/` no WSL.
- Árvore: limpa antes deste registro.

## Correção do on recusado pelo registro que criava o store da raiz configurada

Base: `909cea7`. Escopo pedido pelo orquestrador nesta sessão, dentro do
isolamento aprovado: o `on` recusado pelo registro não pode criar nada na raiz
configurada; o teste de conflito passa a exigir a árvore inteira das raízes
intacta, não só a falta de capturas. Builder: Claude, perfil `light`. As seções
anteriores deste arquivo não foram alteradas, e `.verified.md` não foi tocado.
Nenhuma nova verificação foi convocada: ela depende do proprietário.

### Commits

- `311c554` docs(checks): registrar a conferência do registro no on antes do
  store — linhas "Barreira da configuração", "Registro da autorização" e
  "Conflito com o registro" do Landing, commitadas antes do código.
- `ced2548` fix(observe): recusar o registro no on antes de abrir o store da raiz
- `a168d53` docs(observe): documentar a conferência do registro no on antes da raiz
- `35ba356` test(observe): exigir as raízes intactas depois do on recusado pelo registro
- o commit deste registro (docs(checks))

### O defeito

Com `<home>/.skill-me-authorization.json` nomeando A (`on`) e a pasta
`.skill-me` trocada por outra real que aponta B, o `on` respondia 4
`observe_on`, mas o `changeObservation` chamava `openStore(B, create: true)` e
`initStore` antes de o `claimAuthorization` recusar: `B/skill-me-privacy` e o
marcador `store.json` ficavam criados. O mesmo com o registro ilegível
(`config_invalid`) ou link/junção (`link_refused`), na raiz configurada. A
seção anterior registrou isso como limitação ("O `on` recusado com
`observe_on` cria a pasta do store…"); esta correção a remove. O teste de
conflito só olhava `stateOf` e a falta de `captures` na raiz alheia, e as
linhas do registro ilegível e do link nem chamavam `on`.

### Escolha e alternativas

O `on`, sob o lock do home, depois de ler a configuração e antes de abrir o
store, chama `assertNoOtherAuthorization({ home, io }, config.rootReal)` — a
mesma leitura e os mesmos códigos de `status` e `setup`. Sob o lock do home
nenhum `on` ou `off` destes comandos muda o registro entre essa conferência e a
do `claim`; a do `claim`, sob o `.lock` do store, continua para um registro
gravado fora deles. Nenhum formato persistido nem lock novo.

| Alternativa | Por que não |
| --- | --- |
| Abrir o store sem `create` e só criar depois do `claim` | Mexe no `openStore`/`initStore` compartilhado com `start` e na ordem lock da raiz → registro; o `claim` precisa do lock da raiz, que mora na pasta do store. |
| Apagar a pasta do store criada quando o `claim` recusa | Rollback de efeito, que pode apagar o que outro processo acabou de criar; a raiz deixa de ser intocada só no caminho feliz. |
| Retirar a conferência do `claim` | Deixa sem barreira um registro gravado depois da conferência do `on` (prova nova abaixo). |

Precedência de erros do `on` (mudança observável): com registro de outra raiz,
ilegível ou link, o código do registro vem antes dos da raiz configurada
(`root_not_found`/`root_not_directory` 3, `root_changed` 4, store alheio). Com
o registro da própria raiz, nada muda.

### Provas e testes alterados

| Teste (padrão do check) | O que afirma |
| --- | --- |
| I23-C4 … status não afirma off, setup não troca a configuração, on recusado não toca raiz nenhuma e o off desfaz o conflito (título e prova ampliados) | Em cada `on` (todos recusados, com a resposta inteira em `records`), a árvore inteira — tipos, sha256, bytes e mtime — da raiz original e da alheia é igual antes e depois. Linhas: pasta real que aponta B (`observe_on`; A continua `on` até o `off`), pasta apagada (`not_configured`), registro ilegível (`on` novo, 3 `config_invalid`) e link/junção (`on` novo, 4 `link_refused`). A raiz alheia termina com árvore vazia (`{}`), em vez de só `off` e sem `captures`. |
| I23-C4 … registro da autorização (prova ampliada) | Cada `on` recusado por `observe_on`, `config_invalid` ou `link_refused` deixa as duas raízes iguais byte a byte: registro de outra raiz (a configurada não ganha store; a registrada continua `on`), registro vazio e link. Os demais passos, inclusive `on` normal e repetido depois do conflito, não mudaram. |
| I23-C4 … registro de outra raiz gravado depois da conferência do on (novo) | O registro de outra raiz é gravado no primeiro `stat` da raiz pelo `on`, já depois da conferência: resposta 4 `observe_on` inteira, raiz `off`, o registro alheio fica, a raiz alheia vazia; a pasta do store tem só `store.json` (limite abaixo). Removido o registro, `on` 0 e `off` 0. |

Nenhuma asserção foi enfraquecida; a expectativa antiga `foreign: ["off", false]`
virou a árvore vazia.

### Vermelho e verde

Windows 11, Node 24.22.1. Os dois testes alterados contra o produto de
`909cea7`, antes de qualquer código: 0/2 (`/tmp/i23f5/red-control.txt`). Em
todas as linhas com `on` recusado pelo registro, a árvore depois traz
`skill-me-privacy/` e `skill-me-privacy/store.json` (25 bytes, sha256
`ad28c02f…71ae48`) na raiz alheia (pasta real que aponta B) ou na configurada
(registro de outra raiz, ilegível, link); as respostas e estados em `records`
já eram os esperados.

Final, com `command.mjs` e `config.mjs` de `909cea7` na árvore (`git checkout
909cea7 -- …`, devolvidos com `git checkout HEAD -- …`, `git status` limpo):
`control.cli` inteiro, 15 testes, 13 pass, 2 fail — os dois alterados
(`/tmp/i23f5/red-final.txt`). A prova nova passa também ali: ela guarda a
conferência do `claim`, que já existia (mutação M47). Verde em `35ba356`:
`control.cli`, `report.cli`, `docs` e `privacy.e2e`, 22 testes, 22 pass
(`green-observe-a.txt`).

### Mutações

Script fora do repositório (`%TEMP%\i23f5-mutations.mjs`, mesma mecânica do
anterior: aplica, roda, restaura e confere o sha256); `git status` limpo depois
(`/tmp/i23f5/mutations.txt`).

| Mutação | Resultado (pass/testes) |
| --- | --- |
| M44 `on` sem a conferência prévia do registro | conflito 0/1; registro 0/1; registro tardio 1/1; C3 1/1 |
| M45 conferência prévia depois de ligar a raiz | conflito 0/1; registro 0/1 |
| M46 conferência prévia recusa também o registro da própria raiz | C3 0/1; registro 0/1; conflito 1/1 |
| M47 `claim` aceita o registro de outra raiz | registro tardio 0/1; registro 1/1; conflito 1/1 |

M44 e M45 são o defeito; o C3 e o registro tardio passam na M44 porque não
dependem da conferência nova. M46 mostra que `on` normal e repetido (C3) e o
`on` depois de uma queda com o registro da própria raiz continuam protegidos.
M47 só é vista pela prova nova: com a conferência prévia, nenhuma outra prova
chega ao `claim` com outro registro.

### Provas do checklist

Windows 11, Node 24.22.1, HEAD `35ba356`, árvore limpa, comando literal de cada
check em sequência (`/tmp/i23f5/checks.sh`, 15:40:08–15:41:14,
`/tmp/i23f5/proof-C*.txt`): C1 1, C2 5, C3 1, C4 7, C5 1, C6 1, C7 1, C8 2, C9 2,
C10 1, C11 2, C12 2, C13 1, C14 1, C15 2, C16 2, C17 1, C18 2 — 18/18 checks, 35
testes, 35 pass, 0 fail, 0 skip; o C8 rodou com o runtime Hermes local.

WSL Ubuntu 24.04.3, Node 24.15.0 (nvm), uid 1000 — `/tmp/skill-me-i23-f5-dpqk8c`,
de `git archive 35ba356` (sha256 `9e9883f8…8b272e10` igual nos dois lados;
`git get-tar-commit-id` = `35ba3561…`), `node_modules` copiado da cópia anterior:
os mesmos 18 checks, 35 testes, 33 pass, 0 fail, 2 skip (os dois C8, sem
runtime Hermes); `control.cli` inteiro 15/15. Ali o registro é link simbólico
de verdade nas linhas do link.

### Suítes

| Ambiente | Alvo | Resultado |
| --- | --- | --- |
| Windows 11, Node 24.22.1 — HEAD `35ba356`, árvore limpa | `npm test` (`/tmp/i23f5/npm-test-1.txt`, 15:41:23–15:44:59) | exit 0, 3 min 36 s — governança 6/6; motor 16/16; doctor 417 (410 pass, 0 fail, 7 skip); integrações 450 (443 pass, 0 fail, 7 skip) |
| WSL (acima) | `node scripts/test-integrations.mjs` | exit 0, 33 s — 450 testes, 436 pass, 0 fail, 14 skip |

As integrações passam de 449 para 450 pela prova nova. Skips iguais aos da
seção anterior: no Windows, os 7 de integrações e os 7 do doctor, de
plataforma; no WSL, os 14 (10 sem runtime Hermes, 3 de DACL do Windows, 1 de
ACL do macOS). `git diff --check`: exit 0 antes de cada commit. Desempenho não
foi medido: a mudança acrescenta uma leitura de até 64 KiB do registro por
`on`, sob o lock do home; produtores, hooks e entregas não mudaram, e o G1 não
foi repetido.

### Limitações e mudanças de comportamento

- Registro gravado por outro processo depois da conferência do `on` e antes do
  `claim`: continua recusado com 4 `observe_on` e nada é ligado, mas a pasta
  `skill-me-privacy` e o marcador da raiz configurada ficam (prova nova). Nossos
  `on`/`off` não chegam a esse intervalo, pois seguram o lock do home.
- Falha ao criar o registro (sem registro presente, por exemplo E/S): o `on`
  responde 5 e a pasta do store e o marcador ficam, como antes; não é conflito
  com o registro e não foi alterado.
- Precedência: com registro de outra raiz, ilegível ou link, o `on` responde o
  código do registro mesmo que a raiz configurada esteja ausente, não seja
  pasta, tenha sido trocada ou tenha um store alheio (antes, o código da raiz).
- Nenhuma sessão real de agente; nenhum hook pessoal instalado; nenhum `on` no
  home real: `.skill-me`, `.skill-me-authorization.json` e
  `.skill-me-observe.lock` não existem no home do Windows nem no do uid 1000 do
  WSL. Core vendorizado, pilotos e `.verified.md` não foram tocados.

### Estado ao final

- Processos: todas as execuções foram em primeiro plano e terminaram; nenhum
  `node.exe` iniciado depois da primeira prova desta rodada (15:35) está vivo
  (`ps -W`).
- Fora do repositório: `/tmp/i23f5/` (`%TEMP%\i23f5`: logs, `checks.sh`,
  `wsl-run.sh`, arquivo do `git archive`) e `%TEMP%\i23f5-mutations.mjs` no
  Windows; `/tmp/skill-me-i23-f5-dpqk8c`, o `.tar` dela e `/tmp/i23f5/` no WSL.
- Árvore: limpa antes deste registro.

## Correção dos achados P1 e P2 da revisão formal

Base: `941b059`, árvore limpa, com a resposta `changes_requested` da primeira
revisão formal em `.checks/code-review/issue-23/response.json` (contexto
`cb9369ca…df988f55`): P1 bloqueante no plugin Hermes (AC2) e P2 bloqueante no
README (AC7). Escopo autorizado pelo orquestrador: corrigir só esses dois
achados e as provas necessárias, sem alterar o motor de revisão, os pilotos nem
a semântica de isolamento das gerações; não reabrir a entrega Hermes na geração
seguinte. Builder: Claude, perfil `light`. As seções anteriores deste arquivo
não foram alteradas, e `.verified.md` não foi tocado. `CONTRIBUTING.md`, citado
no pedido, não existe no repositório (nem na raiz nem em subpastas); valeram
`AGENTS.md`/`CLAUDE.md`, a task e o checklist.

### Commits

- `a892ab1` fix(hermes): ler a configuração única do plugin também no POSIX
- `f13eb03` test(hermes): provar a configuração única do plugin pelo Python do sistema
- `d64a81b` docs(observe): exigir nova instância do Hermes depois de um off
- `aed2dfc` test(observe): exigir no C18 o limite real da entrega Hermes
- o commit deste registro (docs(checks))

Nenhuma linha do Landing mudou: nenhum formato persistido, lock ou decisão nova.

### P1: plugin Hermes inativo em Linux/macOS

O defeito: `_folder_identity` avaliava
`getattr(info, "st_reparse_tag", 0) == stat.IO_REPARSE_TAG_MOUNT_POINT` sempre
que a pasta não era link. A constante só existe no `stat` do Windows; no POSIX,
numa `.skill-me` comum, o `AttributeError` era absorvido por
`_configured_delivery`, que devolvia `None`, e o `register(ctx)` deixava o
plugin sem destino.

Falha anterior em Python POSIX real, antes de qualquer mudança: WSL Ubuntu
24.04, Python 3.12.3, uid 1000, `git archive 941b059` (sha256
`e58e4732…25a78712`, `git get-tar-commit-id` = `941b0591…`) com o
`node_modules` da cópia anterior; `observe setup` real num home temporário
(pasta 0700, `observe.json` 0600), depois a fonte do plugin carregada com
`python3 -I -B` por um script fora do repositório (`/tmp/i23r1/repro.py`,
saída em `/tmp/i23r1/red-posix.txt`):

| Medida | `941b059` | com a correção (`green-posix.txt`) |
| --- | --- | --- |
| `hasattr(stat, "IO_REPARSE_TAG_MOUNT_POINT")` | `False` | `False` |
| `_folder_identity(<home>/.skill-me)` | `AttributeError: module 'stat' has no attribute 'IO_REPARSE_TAG_MOUNT_POINT'` | `(2112, 1295368)` |
| `_load_delivery()` | `null` | o argv do `setup` (`node`, `cli.mjs`, `ingest`, `--agent`, `hermes`) |
| `register(ctx)` → hooks / `observer_stats()["active"]` | 7 / `false` | 7 / `true` |

A constante também falta no Python 3.10.12 do WSL Ubuntu 22.04 e existe no
Python 3.11.16 do Hermes no Windows (conferido com `hasattr`).

Correção (`a892ab1`): `_JUNCTION_TAG = getattr(stat, "IO_REPARSE_TAG_MOUNT_POINT", None)`
no carregamento do módulo; a junção só é reconhecida quando a constante existe.
`S_ISLNK`, a recusa da junção no Windows, a exigência de diretório e a
conferência de `(st_dev, st_ino)` antes e depois da leitura não mudaram.

Prova nova (`f13eb03`), em `hermes-plugin.native.test.mjs`, com o padrão do C8
(selecionada pelo comando literal do checklist): `I23-C8 … pelo Python do
sistema, sem o runtime do Hermes, o plugin lê o destino da configuração única
numa pasta comum e recusa link ou junção no lugar dela`. Para cada linha, um
home temporário, `observe setup` real pelo CLI e a fonte do plugin carregada por
`register(ctx)` (o contrato do Hermes, com um contexto que só anota os hooks) no
Python do sistema, `-I -B`; afirma código 0, stderr vazio, os 7 hooks,
`observer_stats()["active"]` e o `_load_delivery()`:

| Linha | Esperado |
| --- | --- |
| sem configuração | inativo, `null` |
| pasta comum | ativo, `[node, cli.mjs, "ingest", "--agent", "hermes"]` |
| junção (Windows) / link de diretório (POSIX) no lugar da pasta, apontando para a mesma configuração movida | inativo, `null` |

O link aponta para a própria configuração, para que só a forma da pasta mude
entre as linhas 2 e 3. O Python vem de `locateSystemPython()`
(`helpers/hermes-runtime.mjs`): `python`, depois `py -3` no Windows; `python3`,
depois `python` no POSIX; cada candidato precisa responder `3` antes de ser
aceito (o `python3` do Windows pode ser o atalho da loja). Sem nenhum, o teste
fica `skipped` com o motivo `python-ausente`; nesta rodada ele rodou nos dois
ambientes (Windows: `C:\Python312\python.exe`, 3.12.10; WSL: Python 3.12.3). Os três runners da CI
têm Python 3 no PATH, mas a CI não foi executada.

- Vermelho, WSL, `941b059` + os dois arquivos de teste (overlay sha256
  `ff6e3c17…6086ec`): 0/1 — só a linha "pasta comum" diverge (`active: false`,
  `delivery: null` em vez do argv); as outras passam, porque link e ausência já
  davam `None` (`/tmp/i23r1/red-wsl-test.txt`).
- No Windows, o mesmo teste passou antes da correção (1/1): o defeito é só do
  POSIX, e por isso a prova precisa rodar nos dois.
- Verde, WSL, com o plugin corrigido (overlay `92ba8693…ef3edeb`): 1/1
  (`green-wsl-test.txt`); de novo em `aed2dfc` por `git archive` (abaixo).
- Windows, o padrão do C8 com o plugin corrigido: 3/3, com o Hermes 0.21.4
  local nas duas provas nativas (`green-win-c8.txt`) — a entrega real pela
  configuração única e a junção recusada pelo Python 3.11 do Hermes continuam
  passando.

Mutação M48 (`_JUNCTION_TAG = None`, a junção deixa de ser reconhecida),
aplicada e restaurada por script (sha256 do arquivo igual antes e depois): no
Windows, a prova portátil 0/1 e a prova F2 do plugin com o Python do Hermes 0/1
(`mutation-m48.txt`). A prova nova distingue a pasta comum da junção no Windows
e do link no POSIX; a falha anterior no POSIX é o vermelho acima.

### P2: README prometia on/off no mesmo Hermes aberto

O defeito: o README dizia "o `on`/`off` vale sem reiniciar". O plugin inicia um
único processo de entrega por instância do Hermes, no primeiro evento (o
`on_session_start` do Hermes 0.21.4 dispara no primeiro turno,
`agent/conversation_loop.py:774`), e nunca o reinicia (I4-C22, "um único
spawn"); esse `ingest` abre a observação uma vez (`observe/delivery.mjs:102-110`)
e, depois de `observe_off` — off, ou outra geração depois de off/on —, descarta
toda entrada até o EOF (`:119`). Um novo `on` não o reabre. O produto não foi
alterado.

README (`d64a81b`), item Hermes de "Limites reais": cada instância do Hermes
tem uma só entrega, que segue a observação vigente no primeiro evento dela;
inicie (ou reinicie) o Hermes depois do `setup` e do `npm run on`; uma
instância cujo primeiro evento ocorreu com a observação `off`, como uma aberta e
usada antes do `on`, ou que atravessou um `npm run off` não volta a capturar
depois de um novo `npm run on`, mesmo com o `npm run status` em `on`: feche-a e
abra outra; o `off` continua cortando na hora a gravação dessa instância. A
forma "cujo primeiro evento ocorreu com a observação `off`" é a exata: um Hermes
aberto antes do `on` e só usado depois dele captura, porque a entrega só começa
no primeiro turno. Os guias (`docs/traces.md`, `docs/agent-observation.md`) não
tinham a promessa e não mudaram.

C18 (`aed2dfc`), em `observe/docs.test.mjs`:

- O primeiro teste exige as quatro frases novas (no lugar do antigo "inicie o
  Hermes depois do `setup`") e recusa `sem reiniciar` no README,
  `docs/traces.md` e `docs/agent-observation.md`.
- Teste novo, `I23-C18 … a instância Hermes que atravessou um off não volta a
  capturar com um novo on, e outra instância volta`: com `setup` e
  `npm run on` num home temporário, inicia o argv gravado em `hermesDelivery`
  (o processo que o plugin iniciaria), com o stdin aberto como o plugin o
  mantém e stdout/stderr descartados como no plugin. O primeiro evento é
  gravado com o processo aberto (`status` com 1 persistido); `npm run off`
  encerra exatamente essa captura; `npm run on`; dois eventos (a mesma sessão e
  outra) no mesmo processo, que sai com 0 no EOF; `npm run status` diz `on` e
  só a captura encerrada, com 1 registro. Um processo novo ("feche-a e abra
  outra") grava: duas capturas, a nova `active` com 1 registro.

Vermelho e verde, Windows:

- README de `941b059` posto na árvore e restaurado em seguida (sha256 conferido):
  C18 2/3 — o primeiro teste falha na frase nova (`/tmp/i23r1/red-c18.txt`); o
  teste comportamental passa, porque mede o produto, que já tinha a limitação.
- README novo: C18 3/3 (`green-c18.txt`).
- M49, a promessa antiga devolvida ao README novo ("(o `on`/`off` vale sem
  reiniciar)"): 2/3, falha `doesNotMatch` em `README.md`
  (`mutation-m49.txt`).
- M50, o store ignora a geração na gravação automática (só confere `on`, em
  `appendAutomatic`): 2/3, falha "nada gravado pela instância que atravessou o
  off" (`mutation-m50.txt`) — se o produto passar a gravar pelo processo
  antigo, o C18 obriga a rever o README. Arquivos restaurados com sha256
  conferido; `store.mjs` não aparece no `git status`.

### Provas do checklist

Windows 11, Node 24.22.1, HEAD `aed2dfc`, árvore limpa, comando literal de cada
check em sequência (`/tmp/i23r1/checks.sh`, 19:28:26–19:29:36,
`/tmp/i23r1/win/proof-C*.txt`): C1 1, C2 5, C3 1, C4 7, C5 1, C6 1, C7 1, C8 3,
C9 2, C10 1, C11 2, C12 2, C13 1, C14 1, C15 2, C16 2, C17 1, C18 3 — 18/18
checks, 37 testes, 37 pass, 0 fail, 0 skip. O C8 rodou as duas provas nativas
com o Hermes 0.21.4 local (versão e hashes conferidos por
`locateHermesRuntime`) e a portátil com o Python do sistema.

WSL Ubuntu 24.04, Node 24.15.0 (nvm), Python 3.12.3, uid 1000 —
`/tmp/skill-me-i23-r1-mQmJkJ`, de `git archive aed2dfc` (sha256
`a7c3b7b8…a34305af9` igual nos dois lados; `git get-tar-commit-id` =
`aed2dfcd…`), `node_modules` copiado de `/tmp/skill-me-i23-f5-dpqk8c`:

- a prova nova, explicitamente (`--test-name-pattern="pelo Python do sistema"`):
  1 pass, 0 fail, 0 skip — link de diretório POSIX real;
- os mesmos 18 checks (19:34:01–19:34:29): 37 testes, 35 pass, 0 fail, 2 skip
  (as duas provas nativas do C8, sem o runtime Hermes no WSL).

### Suítes

| Ambiente | Alvo | Resultado |
| --- | --- | --- |
| Windows 11, Node 24.22.1 — HEAD `aed2dfc`, árvore limpa | `npm test` (`/tmp/i23r1/npm-test-win.txt`, 19:29:44–19:33:44) | exit 0 — governança 6/6; motor 16/16; doctor 417 (410 pass, 0 fail, 7 skip); integrações 452 (445 pass, 0 fail, 7 skip) |
| WSL (acima) | `npm test` (`/tmp/i23r1-wsl-out/npm-test.txt` no WSL, 19:34:29–19:35:14) | exit 0 — governança 6/6; motor 16/16; doctor 417 (416 pass, 0 fail, 1 skip); integrações 452 (438 pass, 0 fail, 14 skip) |

As integrações passam de 450 para 452: a prova portátil do C8 e a prova
comportamental do C18. Skips iguais aos da seção anterior, todos de plataforma
ou de runtime: no Windows, os 7 de integrações (`I4-C15`, `T8-C4`, `I4-C25b`,
`I4-C25j`, `I4-C25k`, `I4-C25l`, `I4-C25m`) e os 7 do doctor (POSIX/FIFO); no
WSL, 10 por falta do runtime Hermes (`I4-C18` a `I4-C23`, `I4-C37`, `I4-C44b`
e as duas nativas do `I23-C8`), 3 de DACL do Windows (`I4-C25g`/`h`/`i`), 1 de
ACL do macOS (`I4-C25m`) e, no doctor, o `hermes_cli.PYD`. A prova portátil do
C8 não pulou em nenhum dos dois. `git diff --check`: exit 0 antes de cada
commit.

### Limitações

- A prova nativa do C8 com o Hermes continua só no Windows; no POSIX, a
  fronteira provada é a fonte do plugin carregada pelo `register(ctx)` no
  Python do sistema, sem o `PluginManager` do Hermes. macOS não foi executado,
  e a CI não rodou (sem push).
- A prova comportamental do C18 usa o processo de entrega com o argv do
  `hermesDelivery`, sem o Hermes; que o plugin mantém um único processo por
  instância vem do I4-C22 e do código (`_worker`). O caso "primeiro evento com
  a observação `off`" não tem prova comportamental própria: não há sinal
  observável de que o `ingest` já abriu a observação antes de um `on` sem
  depender de tempo. Ele é o mesmo fechamento (`observe_off` na abertura), já
  afirmado pelo C1 (hook e ingest antes do `on` saem `observe_off`), e o
  "não reabre" é o mesmo provado pelo teste novo.
- A prova portátil fica `skipped` (`python-ausente`) numa máquina sem Python 3
  no PATH; não houve skip nesta rodada.
- Os dois arquivos de teste alterados ficaram com LF na cópia de trabalho do
  Windows (o índice guarda LF em todos; `git diff --check` limpo).
- O item "Uso normal" do README continua dizendo que, até o `off`, hooks e
  plugin gravam cada sessão; a exceção do Hermes está no item dele em "Limites
  reais", que é onde o README reúne as limitações por integração. Não foi
  alterado.
- Nenhuma sessão real de agente; nenhum hook pessoal instalado; nenhum `on` no
  home real: `.skill-me`, `.skill-me-authorization.json` e
  `.skill-me-observe.lock` não existem no home do Windows nem no do uid 1000 do
  WSL. Todo `npm run on` desta rodada foi num home temporário. Core vendorizado,
  pilotos e `.verified.md` não foram tocados.

### Estado ao final

- Processos: todas as execuções foram em primeiro plano e terminaram; nenhum
  `node.exe` ou `python.exe` iniciado depois do início desta sessão (19:17) está
  vivo além do par da própria sessão (`ps -W`); os processos de entrega do C18
  saem no EOF dentro do teste.
- Fora do repositório: `%TEMP%\i23r1` (`/tmp/i23r1/`: `repro.py`,
  `repro-wsl.sh`, `run-wsl.sh`, `checks.sh`, os `.tar` e os logs citados) no
  Windows; `/tmp/skill-me-i23-r1-*` e `/tmp/i23r1-wsl-out/` no WSL. A pasta do
  plugin no checkout não ganhou `__pycache__`.
- Árvore: limpa antes deste registro.
