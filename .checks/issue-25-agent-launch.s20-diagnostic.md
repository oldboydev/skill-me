# S20 — gerador PURE preparado; nenhum diagnóstico executado, nenhum PASS

Autor: Claude novo (Opus 5.5, modelo padrão sem override), não autor S19 nem Verifier27. Fase `prepare`
(`edit-capabilities.json`): editei somente `controlled-probe.mjs` e este `report.md`, com Edit nativo. Não executei
nada: sem Bash/PowerShell/Write/Agent/Task/rede, sem teste, commit, push, CI, formal15 ou mudança de Source. Nenhuma
tarefa em segundo plano (0 background). O FAIL 27 (D 43/42/1, C11 ready `review.test.mjs:349`, causa DESCONHECIDA)
continua preservado; este trabalho não o resolve nem o reinterpreta.

## 1. Leitura (só o que li de fato)

- `required-sources-pack.md`: 17 chunks exatamente conforme `read-plan.json` (1–150, 151–300, …, 2251–2400,
  2401–2501), 2501/2501 linhas, sem erro de Read. Estimativa do índice: 61.950 tokens (chars/2,5, não tokenizer)
  + reserva 20k < 150k. Runtime (respostas de ferramentas, edições) não somado à Source.
- Fontes vistas pelo pacote: AGENTS.md, CLAUDE.md, SKILL tlc-implement, plano S20, README do core, `cli.mjs`,
  `review.mjs` e `review.test.mjs` INTEIROS; extratos declarados: round27-failed 340–572, task 1065–1093; D.log e
  D.env.txt inteiros. Não li task, checklist ou diff da feature inteiros; o Root mantém C1–C50/9 AC.
- Fora do pacote (declaro): `read-plan.json`, `required-sources-index.json`, `agent-manifest.json`,
  `edit-capabilities.json`, este report original (1 linha) e `builder-s18/controlled-probe.mjs` (102 linhas,
  só como referência de estilo/idioma do gerador anterior; ~1,5k tokens). Não conferi hashes: não tenho como calcular
  SHA-256 sem executar; o Root confere `sourcePackSha256`/`sourceIndexSha256` do manifest.
- CONTRIBUTING ausente, conforme o Root; não inventei leitura dele.

## 2. Análise do C11 (sem causa declarada)

- A asserção que falhou lê `state.attempts[0].report.status` do estado comum. No motor (`review.mjs:681-704`), o
  estado é salvo (comum e local) antes e depois do `push` da tentativa; a tentativa só existe depois de `snapshot`,
  `paths`, lock `wx`, `stateAt`, verificação de rodadas e `authenticate`. Estado sem tentativa é compatível com falha
  em qualquer passo anterior ao 2º `saveState`, inclusive antes do arquivo existir (aí o original lançaria ENOENT no
  `readFileSync`, não TypeError — o D27 mostra TypeError, logo o arquivo existia e era JSON com `attempts` sem item 0;
  isso é leitura do log, não causa).
- O CLI escreve `Code review interrompido: …` no stderr e sai 1 em qualquer erro; o C11 nunca chegou a comparar
  status/stdout/stderr no D27. A coleta foi desenhada para observar exatamente isso. Não presumo EPERM, caminho longo,
  AV, Node ou carga.

## 3. O gerador (`controlled-probe.mjs`)

- Exporta `PROBE_NAME = "S20 diagnostic C11 result collection"` (sem metacaracteres de regex, serve ao
  `--test-name-pattern` exato) e `createProbe(source, reportFile)` PURE: módulo sem import top-level nem efeito.
- `createProbe` recusa fonte vazia, `reportFile` relativo, fonte que já contém o teste, e exige exatamente uma vez
  cada âncora: imports originais usados (`test`, `assert`, bloco `node:fs` em LF, `tmpdir`, `join/resolve/relative`,
  `fileURLToPath/pathToFileURL`), `ready`, `fixture`, `leftoverWarning`, `runCliWithFailingCleanup` e as três
  fórmulas originais do C11. Saída = `source` + separador + UM teste; prefixo EXATO por concatenação.
- O corpo do teste é uma função real do módulo anexada por `toString()` (evita escapar regex/`${}` em template; o
  `import` do módulo pelo Root já prova a sintaxe do anexo). Imports dinâmicos só dentro dela (`appendFileSync`,
  `lstatSync`, `realpathSync`, `isAbsolute`).
- Por caso, 1..100 sequenciais, sem retry: `fixture(t)` original (limpeza do próprio `t.after`) →
  `runCliWithFailingCleanup(f, "ready")` original → observação. Registro de forma fixa (16 chaves): `phase`
  (`fixture`/`run`/`observe`/`completed`), `error` {name, code, mensagem sanitizada}, `status`, `spawnError` e
  `signal` = "unavailable" (o helper não os devolve; não inventados), stdout (tamanho, newline final, JSON parseado
  e sanitizado ou erro de parse + texto), stderr sanitizado, checkout (registrado, caminho normalizado, pasta/link),
  estado comum e local (existe, parseError, attempts.length, 1ª tentativa presente, tipo e status do 1º report — sem
  acessar `report` antes de conferir), `.tmp` comum/local, lock, e `originalC11` com as cinco fórmulas originais
  avaliadas uma a uma: `true`/`false`, ou `null` quando a expressão original lançaria.
- Sanitização: `\` → `/`; prefixos próprios (fixture, TEMP, raiz da cópia; caminho e realpath; forma path e
  `file:///`) → `<fixture>`/`<temp>`/`<copy>`; linhas de stack removidas; `//user@` → `//<cred>@`; absolutos
  restantes de unidade/UNC → `<abs>`; texto > 4000 truncado com o tamanho. Operação, código e relativos ficam. Não
  grava env, pid ou bytes de produto.
- Checkout deixado pela limpeza que falha: removido só pelo `f.git("worktree","remove","--force",checkout)` original,
  depois de conferir absoluto, existente, pasta sem link, mesmo dev/ino (bigint) observado após o CLI, filho direto
  com prefixo `codex-code-review-` tanto do `tmpdir()` quanto do seu realpath. Recusa ou falha ficam registradas
  (`refused`/`guard-failed`/`remove-failed`/`remove-returned-folder-remains`), com `existsAfter` conferido; sem retry
  nem `rmSync` de reserva.
- Relatório: no início exige arquivo regular, sem link, realpath = caminho, vazio, e guarda dev/ino (bigint);
  antes do append único confere a mesma identidade e tamanho 0; depois, mesma identidade e tamanho = bytes do
  append. JSON de uma linha: `schemaVersion 1`, `purpose diagnostic-only`, `expectedCases 100`, `complete`,
  `node`, `platform`, `summary` (contagens por fase, status, código de erro, status do 1º report, attempts comum/
  local, limpeza, e quantos casos teriam as 5 fórmulas verdadeiras — só contagem, nada convertido em PASS) e
  `records`. Erro fora dos casos grava parcial `complete:false` e relança.
- Asserts só de integridade: `complete === true`, 100 registros, índices 1..100, chaves fixas, fase válida,
  `error` nulo ⇔ fase `completed`, limpeza com status. Nenhum assert de sucesso por caso. Saída 0 = coleta íntegra,
  NÃO gate, NÃO green de core/produto.

## 4. Limites e o que fica com o Root

- O Root define TEMP/TMP privados, PATH só Git + `process.execPath`, Git global/system/template vazios,
  `protocol.allow=never`, `GIT_TERMINAL_PROMPT=0`, `GCM_INTERACTIVE=never`, env sem chaves/`NODE_OPTIONS`; o
  módulo não verifica nem grava env. Se o gancho original falhar, a parada antes de rede/agente depende desse ambiente.
- A identidade esperada do relatório (dev/ino do `wx` do Root) não entra em `createProbe(source, reportFile)`; o
  teste prova a constância entre início e append, e o Root compara com a sua anotação.
- Falha na pré-checagem do relatório lança antes de qualquer caso e não escreve nada. A âncora do bloco `node:fs`
  exige cópia LF. Pastas não removidas e fixtures cujo `t.after` falhar ficam para o Root reter/registrar; não toquei
  em `Temp\x` global nem em `/tmp`.
- Ambiente alterado em relação ao D27: reprodução ou não reprodução não atribui causa histórica.
- Pendências do Root antes dos dois comandos literais A/B (Node 24.22.1 e 24.13.0): ler o módulo inteiro, provar
  prefixo/transform estática/sintaxe e `readExact` do `review.test.mjs` inteiro. Nada disso foi feito por mim.

## 5. Execução (mesma sessão S20, fase exec)

O Root informou que leu o módulo e este relatório, provou prefixo/sintaxe e readExact 2501/2501 e congelou HEAD
`b51bbe1c9a79b64b9a3d1352f865e5cde60132f3`. Rodei os dois comandos literais, uma vez cada, sequenciais, Bash em primeiro
plano com timeout 600000, nenhum `run_in_background` e nenhum foi para o fundo sozinho; B só depois do resultado real de
A com `valid:true`. Nenhum outro comando executado. Dados abaixo são a saída JSON do controlador (não li o arquivo
bruto do relatório; não o localizei sem ler fontes do controlador, que não reli).

| Coleta | Node | UTC | Término / `valid` | Teste coletor | Casos |
| --- | --- | --- | --- | --- | --- |
| A | v24.22.1 (`C:/nvm4w/nodejs/node.exe`) | 13:54:01–13:57:12 | natural 0 / `true` | 1/1 pass, 0 fail/cancel/skip | 100 |
| B | v24.13.0 (`ci-node-24.13.0/…/node.exe`) | 13:57:15–14:01:02 | natural 0 / `true` | 1/1 pass, 0 fail/cancel/skip | 100 |

`pass` do coletor = integridade da coleta (100 registros, índices, forma). **Não é green de core/produto nem gate.**
Identidade do relatório inalterada nas duas (`reportIdentityUnchanged: true`); SHA-256 A `c0bf354a…2a2b01`, B
`44842054…2b8339`; raízes retidas pelo Root.

### A — 100 casos

Todos `completed`, status 0, nenhum erro; estado comum e local com 1 tentativa e 1º report `ready`; limpeza
`removed` 100; as cinco fórmulas originais do C11 verdadeiras em 100/100 (`originalC11NotAllTrue: []`).

### B — 98 casos normais, 2 que não atendem às asserções originais

Casos **18 e 43** (idênticos entre si):
- fase `completed` do coletor (a observação concluiu; o erro é do CLI, não da coleta), status do CLI **1**;
- estado comum e local: existem, JSON válido, `attempts.length` **0**, sem 1ª tentativa;
- stderr (354 chars, sanitizado):
  `Code review interrompido: EPERM: operation not permitted, rename '<fixture>/.git/code-review/issue-7.state.json.tmp' -> '<fixture>/.git/code-review/issue-7.state.json'`;
- lock ausente; checkout não registrado → limpeza `not-applicable` (nenhuma pasta `codex-code-review-` deixada);
- fórmulas originais: `reportReady` **null** e `stdoutLiteral` **null** (a expressão original lançaria — é o mesmo
  formato do TypeError do D27), `statusZero` false, `stderrWarning` false, `lockAbsent` true.
- A saída do controlador não traz os campos `commonTmpPresent`/`localTmpPresent`/stdout desses casos; não os afirmo.

Resumo B: fases `completed` 100; status 0:98, 1:2; erro de coleta nenhum; 1º report comum `ready` 98 / ausente 2;
attempts comum e local 1:98, 0:2; limpeza `removed` 98, `not-applicable` 2; cinco fórmulas verdadeiras 98/100.

### Leitura do observado (sem causa histórica)

- O que se **observou** em B: o `renameSync` de `save()` (`review.mjs:649-653`) do `.state.json.tmp` sobre
  `.state.json` comum falhou com EPERM no Windows. Como o estado ficou com `attempts` vazio, o rename que falhou é o
  do 2º `saveState` (depois do `push` da tentativa, `review.mjs:703-704`): o 1º `saveState` (`:682`) já tinha gravado
  o estado vazio, o lock foi liberado no `finally` e o CLI saiu 1 antes de criar o checkout. Isso reproduz, nesse
  ambiente, o mesmo formato do D27 (estado legível, `attempts[0]` indefinido).
- **Não** afirmo que foi isso que aconteceu no D27: o ambiente é diferente (TEMP/PATH/Git privados, Node, sem
  `npm test`/concorrência 8), e o D27 não registrou stdout/stderr. Também não atribuo o EPERM a AV, indexador,
  Node 24.13.0 em si ou carga: A teve 0/100 e B 2/100, amostra pequena, sem controle do SO nem identificação do
  processo que segurava o arquivo. A diferença A×B não é estatisticamente conclusiva.
- O EPERM ocorre dentro do motor vendorizado (core imutável); qualquer correção (no core ou no teste) é decisão do
  Root/proprietário sob a regra de core vendorizado. Não proponho nem implemento código aqui.

### Processo

- Comandos executados: exatamente os dois literais, A depois B. 0 tarefas em segundo plano. Nenhum retry, nenhum
  outro Bash/PS/Write/Agent, nenhuma mudança de Source, commit, push, CI, formal15 ou merge. Não toquei em `Temp\x`
  global nem em `/tmp`. Edição só neste `report.md`.
- Leituras de runtime: dois Globs sem resultado útil procurando o arquivo de relatório; nenhuma Source relida.
- Nada aqui é PASS da feature: o FAIL 27 continua; a próxima Verifier28 segue pendente.

## 6. PROPOSTA PENDENTE — EPERM no `save()` do core (não aprovada, não implementada)

Estado: **pendente de decisão do Root/proprietário**. Sem código, diff ou protótipo. Nenhuma Source, cópia, probe ou
teste alterado. Nesta etapa não li Source nova (só o fim deste report, runtime próprio); as referências de linha são do
pacote já lido (`review.mjs` = linhas L do pacote 415–1240). Dados de entrada: B casos 18/43 conforme o Root leu
direto — status 1, stderr EPERM no rename `issue-7.state.json.tmp → issue-7.state.json` comum, attempts 0 comum e
local, `commonTmpPresent` true, `localTmpPresent` false, lock ausente, sem checkout. A 100/100 normais.

### 6.1 Onde está o defeito observado

- `save(path, value)` (`review.mjs:649-653`): `writeFileSync(temp)` + `renameSync(temp, path)`, sem tratamento.
  `saveState` (`:654-657`) grava **comum primeiro, local depois**; falha no comum não toca o local.
- Chamadas em `review()`: `saveState` em `:682` (estado lido), `:704` (tentativa adicionada), `:724` (relatório);
  no caminho de cache, `:682` e `:689`. Logo **6 `save()` numa revisão nova e 4 numa reutilização**. `check()`
  (`:746-765`) não grava.
- O observado (B 18/43) é o rename comum de `:704`, com destino já existente (escrito em `:682`). Consequência por
  ponto de falha, no core atual:
  - `:682` — antes da tentativa existir: aborta, lock liberado, nenhuma rodada consumida. Aceitável.
  - `:704` comum (observado) — tentativa só em memória; estado comum e local continuam com 0 tentativas, nenhum Codex
    iniciado, lock liberado, CLI sai 1. O C11 original falha (TypeError :349). Não perde histórico, mas aborta uma
    revisão válida por um erro transitório de FS.
  - `:704` local (comum ok) — comum tem a tentativa `report:null`; revisão aborta antes do Codex, mas a rodada fica
    **consumida** sem execução.
  - `:724` comum — o Codex já rodou e o relatório **se perde**: comum fica com `report:null`, `check` recusa
    ("Revisão sem relatório concluído") e a rodada fica consumida. É o pior caso: perde uma aprovação paga.
  - `:724` local (comum ok) — comum tem o relatório (a próxima `review` reutiliza o cache), mas o CLI sai 1 numa
    revisão concluída; cópia legível local defasada.
  - `:689` (cache) — revisão reutilizada aborta; idempotente na repetição.

### 6.2 Alternativas descartadas

1. **Config local** (`code-review.config.json`): o contrato só tem `version`, `base`, `profiles`,
   `roundOverrides` (`review.mjs:474-503`; README "Adotar"). **Não existe** chave compatível para gravação/retry;
   criar uma é mudar o core. Descartada.
2. **Preload/gancho que troque `renameSync`** por uma versão com espera: fork comportamental oculto do motor.
   Descartada (instrução e AGENTS: "não crie fork silencioso").
3. **Mudar o teste** (repetir o CLI, aceitar status 1, relaxar o C11): enfraquece asserção e esconde um defeito que
   também atinge usuários reais no Windows (6.1). Descartada.
4. **Logger/temporização** extra: só observaria; não resolve o EPERM confirmado. Não é fix.
5. **Ajuste de ambiente** (exclusão de AV/indexador, outro TEMP): sem causa identificada, não verificável, não
   protege consumidores. Não é fix.
6. **Gravar sem rename** (escrita direta, copyFile): perde a atomicidade da troca. Descartada.

Conclusão: **a única correção dentro do contrato é uma atualização do core vendorizado** (`review.mjs`), com as
provas em `review.test.mjs` e uma frase no README. Isso exige autorização explícita do proprietário (6.6).

### 6.3 Estratégia proposta (descrição, não código)

Escopo: só a etapa `renameSync(temp, path)` dentro de `save()`; `writeFileSync` do temporário, ordem comum→local,
`saveState`, `stateAt`, lock, cleanup e mensagens existentes ficam iguais.

- **Síncrona e limitada**, para não mudar a assinatura de `save`/`saveState` nem as funções chamadoras: espera
  bloqueante curta (ex.: `Atomics.wait` num `SharedArrayBuffer` local), sem timers/async novos. Nos pontos de
  gravação não há outra tarefa assíncrona do motor em andamento (Codex já terminou ou ainda não começou).
- **Só em `win32`** e **só para códigos justificados**. Decisão bloqueante (D1):
  - D1-a (mínima): só `EPERM` — o único observado.
  - D1-b: `EPERM`, `EACCES`, `EBUSY` — os três que o Windows dá para troca sobre destino aberto por outro handle;
    é o mesmo trio que o produto S19 já trata em promoção de diretório. Mais cobertura, dois códigos não observados
    aqui.
  - POSIX: nenhuma espera para código nenhum (rename atômico; EPERM lá é permissão real). Outros códigos no Windows
    (`ENOENT`, `EXDEV`, `ENOSPC`, …): falha imediata, como hoje.
- **Orçamento exato por `save()`** (decisão D2, proposta): até **7 tentativas**, **6 esperas de 10, 20, 40, 80, 160 e
  320 ms = 630 ms**. Precedente no repositório: o mesmo teto 7/630 ms do `renameRetrying` do produto (S19), que o
  core **não importa** (motor portátil; sem dependência nova). Limite **total adicional** no pior caso: revisão nova
  6 × 630 = **3.780 ms**; reutilização 4 × 630 = **2.520 ms**, todos com o lock mantido. Não há medida da duração
  do EPERM observado; 630 ms é escolha, não SLO. Alternativa D2-b: orçamento maior (ex.: ~2 s por save), mais
  cobertura e lock retido por até ~12 s numa revisão nova. Nenhum prazo de teste/job muda em qualquer das opções.
- **Durante as esperas, falha fechada sem ampliar sobrescritas**:
  - temporário: depois do `writeFileSync`, guardar identidade (dev/ino, bigint) e os bytes escritos; antes de cada
    nova tentativa, exigir arquivo regular sem link com a mesma identidade e os mesmos bytes. Diferente/ausente →
    erro, sem regravar e sem renomear;
  - destino: guardar identidade (ou ausência) antes da 1ª tentativa; antes de cada nova tentativa, exigir a mesma.
    Mudou → erro, sem sobrescrever a escrita alheia;
  - não é CAS: entre a conferência e o rename resta uma janela, como já declarado no S19; o lock da issue continua
    sendo a proteção contra escritores legítimos concorrentes. Sem novo contrato de "PathSecurity" nem API pública;
    só verificações locais dentro de `save`.
- **Esgotado o orçamento**: relança o **último erro original** (mesmo objeto/código/mensagem do Node), o CLI segue
  escrevendo `Code review interrompido: <mensagem>` e saindo 1; o temporário fica no lugar (como hoje) e é
  sobrescrito pela próxima gravação. Decisão D3: anexar ou não o número de tentativas (envolver em novo `Error` com
  `cause` muda a mensagem; manter o original é o mínimo).
- **Commit parcial comum→local**: ordem mantida; o comum continua fonte de verdade (`stateAt`/`check`). Se o local
  falhar após o orçamento, a revisão **não** devolve `ready` (lança), mesmo com o comum gravado; a próxima `review`
  reutiliza o cache do comum. Se o comum falhar em `:724`, o relatório não é aceito sem estado persistido: `check`
  continua recusando `report:null`, a rodada continua consumida (contrato "tentativas iniciadas consomem o limite"),
  sem apagar histórico. A espera reduz a frequência; não elimina esse caso.
- Inalterados: idempotência e reutilização por fingerprint; falha antes de criar tentativa não consome rodada; tetos
  (perfil, override ≤ 35); exclusão por lock `wx`; prioridade do `finally` (aviso de limpeza → fechar/remover lock),
  e o erro da revisão continua prevalecendo sobre o da limpeza.
- Costura de teste (decisão D4): para provas determinísticas é preciso injetar rename, espera e plataforma.
  - D4-a: novas chaves no objeto `dependencies` que `review/check/createPr` já aceitam (padrão existente, não
    documentado no README), repassadas até `saveState`;
  - D4-b: exportar uma função de gravação com parâmetros injetáveis, testada isolada, e manter `save` chamando-a com
    os padrões. Menos fiação em `review`, mas é um export novo do core.

### 6.4 Arquivos afetados e regra do core

- `scripts/code-review/review.mjs` (mudança), `scripts/code-review/review.test.mjs` (só testes novos, os 16
  existentes intactos), `scripts/code-review/README.md` (uma frase em "Relatórios e falhas" sobre a espera limitada
  no Windows). `cli.mjs` e `schema.json` sem mudança.
- Os cinco comuns hoje são iguais à base (identidade A do Verifier27). A mudança cria **divergência nova** em três
  deles perante os dois pilotos, além da exceção #7 (que cobre **só** o teto de overrides 35). Requer:
  - autorização humana específica para essa atualização do core, registrada por issue, com a divergência explícita
    como foi feito na #7 (AGENTS "Code Review Rules" e README §"Adotar"), atualizando o parágrafo da exceção; e
  - nova conferência de hashes dos cinco arquivos registrada na entrega.
  "Rodadas infinitas" autorizadas pelo proprietário **não** autorizam essa exceção. Não proponho alterar os pilotos;
  levar a mudança a eles exigiria outra autorização (decisão D5: só neste repositório, como a #7, ou atualização
  conjunta dos consumidores depois).
- A #25 é outra entrega: decisão D6 do Root/proprietário — tratar como correção dentro da #25 (task registra o
  achado fora de escopo e a exceção) ou entrega/issue própria antes de retomar a #25. AGENTS diz que achados fora do
  escopo não autorizam correção sem decisão.

### 6.5 Provas propostas (RED/GREEN determinísticas)

- **RED** no core atual (`b51bbe1`) e **GREEN** depois, mesmos testes:
  - rename falso que lança EPERM N vezes e depois troca: N = 1…6 sucede com a sequência exata de esperas
    [10], [10,20], …, [10,20,40,80,160,320]; N = 7 lança o **mesmo** objeto do último erro, 6 esperas, 630 ms
    somados, temporário presente, destino com bytes/identidade anteriores;
  - códigos: (D1-b) EACCES/EBUSY idem; `ENOENT`/`EXDEV`/erro sem código → 0 esperas, erro imediato; plataforma não
    Windows com EPERM → 0 esperas;
  - identidade: temporário trocado ou com bytes diferentes durante a espera → falha fechada sem rename; destino
    trocado durante a espera → falha fechada sem sobrescrever;
  - ordem: comum falha até o fim → local intacto (bytes iguais); comum ok e local falha → comum novo, `review`
    rejeita, nunca devolve `ready`;
  - pontos da revisão: falha permanente em `:704` → sem checkout, lock removido, comum com 0 tentativas; em `:724`
    → `review` rejeita, `check` rejeita "sem relatório concluído", 1 tentativa `report:null`, rodada consumida; em
    `:689` → rejeita e a repetição reutiliza; EPERM transitório (≤ 6) em cada ponto → resultado idêntico ao sem falha.
  - Valores exatos nas asserções; sem relaxar timeouts; sem tempo real (espera injetada registra os valores).
- **Real**: o C11 original (`review.test.mjs:335-363`) continua sem mudança e prova a fronteira do CLI.
- **Probes**: repetir as coletas S20 100×2 (Node 24.22.1 e 24.13.0), **mesmo gerador e mesma ordem/ambiente**,
  antes e depois; registrar todos os casos. Ausência de EPERM em 200 casos não prova causa nem SLO; o que prova a
  política são os testes determinísticos.
- **Gates**: A/B/C completos + D `npm test` completo nos três ambientes, Verifier28 fresco sobre a feature inteira,
  formal15, CI e o esquema 2 A1/B/A2/4.500 no HEAD novo antes do merge — sem atalhos.

### 6.6 Decisões que bloqueiam (para o Root levar ao proprietário)

| # | Decisão | Opções / tradeoff |
| --- | --- | --- |
| D0 | Autorizar atualização do core vendorizado | sem ela não há correção dentro do contrato; C11 segue com falha intermitente no Windows |
| D1 | Códigos com espera | a) só EPERM (observado) · b) EPERM/EACCES/EBUSY (semântica Windows, precedente S19) |
| D2 | Orçamento | 7 tentativas/630 ms por save (+3,78 s / +2,52 s pior caso) · maior, com lock retido mais tempo |
| D3 | Erro final | último erro original intacto · envolvido com contagem (muda a mensagem) |
| D4 | Costura de teste | chaves em `dependencies` · export de função de gravação |
| D5 | Pilotos | divergência só aqui (como #7) · atualização conjunta futura, com autorização própria |
| D6 | Onde entra | dentro da #25 com registro · entrega própria antes de retomar a #25 |

Limites: causa do EPERM (qual processo segura o destino) desconhecida; D27 continua sem causa atribuída; 630 ms não é
medido contra a duração real; a espera não elimina falha fechada em `:724`; janela TOCTOU declarada.

### 6.7 Processo desta etapa

Só Read (fim deste report) e Edit neste `report.md`. Nenhum Bash/Write/Agent/PS/rede/execução, nenhuma Source, cópia,
probe ou teste alterado, 0 tarefas em segundo plano. Proposta **não** aprovada; nada aqui é PASS.
