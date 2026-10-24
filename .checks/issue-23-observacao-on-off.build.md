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
