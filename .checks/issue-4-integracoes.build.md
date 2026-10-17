# Issue #4 — evidências do build

Builder: Claude (tlc-implement, perfil `light`, handoff `on`, um batch). Esta é a
evidência do autor; **não é verificação independente** — o Verifier do orquestrador
roda depois, sobre `236e999fddb4c096634284e426d9d4db5ac526fa..HEAD` e todos os checks.
Nenhum `review:run`, push ou PR nesta etapa.

Branch `codex/issue-4-integracoes`. Commits da entrega (mais novo primeiro):

| Commit | Conteúdo |
| --- | --- |
| `e60b5e0` | executor das linhas de prova (`.checks/issue-4-integracoes.proofs.mjs`) |
| `7815824` | teste do guia independente de CRLF (achado no WSL) |
| `d03fb8c` | guia `docs/agent-observation.md`, C35/C40/C41/C45/C47, `test:integrations` no `npm test` e na CI |
| `9b433b5` | correção: espera do stdout nativo sem `drain` (achado do coordenador) |
| `5612060` | plugin Hermes nativo, matriz de falhas, wrapper drena após EPIPE, exportador por handle de pipe |
| `0192104` | wrapper supervisionado `integrations run` |
| `0c9d263` | fronteira, receptor, adaptadores, hook neutro, instalador |
| `c3b2700` | plano (assinatura fechada da U1) e checklist, antes de qualquer teste/produto |

## Contagens reais

| Execução | governance | code-review | doctor | integrations | exit |
| --- | --- | --- | --- | --- | --- |
| Windows 11, Node 24.21.0, `npm test` em `e60b5e0` | 6/6 | 16/16 | 417: 410 pass, 7 skip | 54: 53 pass, 1 skip | 0 |
| WSL Ubuntu, Node 24.13.0, `npm test` em `7815824` (árvore do `git archive`, arquivos em CRLF) | 6/6 | 16/16 | 417: 416 pass, 1 skip | 54: 46 pass, 8 skip | 0 |
| Windows, 54 linhas `Proof:` do checklist em `e60b5e0` (executor) | — | — | — | 54 comandos, todos exit 0, N=1 | 0 |
| WSL, 54 linhas `Proof:` em `e60b5e0` (executor) | — | — | — | 54 comandos, todos exit 0, N=1 | 0 |

Skips e motivos:

- Windows, integrations (1): `I4-C15` — `posix-signals: no Windows, sinal programático vira
  TerminateProcess sem handler`. C15 **passou no WSL**.
- Windows, doctor (7): testes POSIX-only já existentes da #3 (FIFO, ENOTDIR, symlink de
  launcher); nenhum é desta entrega.
- WSL, integrations (8): `I4-C18..C23`, `I4-C37`, `I4-C44b` — `hermes-runtime-ausente:
  interpretador do Hermes não encontrado`. A prova nativa do Hermes existe só no Windows
  local; no Linux fica **pendente**, nunca pass.
- WSL, doctor (1): teste `.PYD` específico do Windows, já existente.
- `I4-C27`: no Windows o subcaso de link de **arquivo** não roda (criar symlink de arquivo
  exige privilégio: EPERM) e é registrado por `t.diagnostic`; as junções de diretório rodam.
  No WSL o subcaso de link de arquivo rodou e passou.

Saídas brutas (locais, ignoradas pelo Git): `.checks/code-review/issue-4/npm-test-windows-e60b5e0.txt`,
`npm-test-linux-7815824.txt`, `proofs-windows.md`, `proofs-linux-e60b5e0.md`.

## Provas por check

Todos os comandos são os do checklist; contrato `# tests 1 / # pass 1 / # fail 0 /
# skipped 0`, salvo as exceções declaradas lá.

| Check | Windows | WSL |
| --- | --- | --- |
| C1–C14, C16, C17 | pass | pass |
| C15 | skipped (`posix-signals`) | pass |
| C18–C23 | pass (nativo Hermes 0.21.4) | skipped (`hermes-runtime-ausente`) — pendente |
| C24–C36, C38–C43, C45–C48 | pass | pass |
| C37 | pass (nativo) | skipped — pendente |
| C44 (3 provas) | pass, pass, pass | pass, skipped (C44b nativo), pass |
| C3, C16, C33, C47 (2 provas cada) | pass | pass |

Provas extras além do checklist: `I4-C16c` (consumidor de stdout lento recebe todos os
bytes antes da saída; distingue consumidor lento de relatório sem leitura).

## RED antes do produto

- Núcleo (`boundary`, `memory-receiver`, `line-reader`, adaptadores): 4/4 arquivos
  falharam por módulo ausente antes da implementação.
- Hooks Claude/Codex e instalador: 18/18 testes falharam antes do CLI/instalador.
- Wrapper: 7 falhas + 1 skip antes de `codex-run.mjs`.
- C47: falhou antes de `package.json`/CI.
- Hermes: o plugin já existia (artefato do instalador); a prova de que os testes detectam
  um plugin errado está nas mutações abaixo e no controle RED nativo dentro de C21
  (observador síncrono → o host bloqueia a ferramenta com `pre_tool_call plugin callback
  timed out or is still running`).

## Mutações (produto alterado temporariamente e restaurado com `git checkout`)

| Mutação | Detectada por |
| --- | --- |
| M1 plugin Hermes escreve de forma síncrona no destino dentro do callback | C21 (ferramentas bloqueadas pelo host, fail-closed nativo) |
| M2 callback Hermes devolve `{"action":"allow"}` | C20, C37 |
| M3 plugin projeta todos os kwargs | C19, C23 (canários e nomes fora da lista) |
| MW1 wrapper põe `--json` sempre no fim | C10, C11 |
| MW2 wrapper acrescenta `--full-auto` | C12 |
| MH1 hook escreve `{}` no stdout | C1, C36 |
| MI1 instalador faz `rename` sem reconferir o hash | C30 |
| MB1 fronteira aceita campo fora da allowlist | C42 |
| MJ1 remoção remove pela assinatura em vez do hash registrado | C32 |

Primeira tentativa de M2 não aplicou a mutação (padrão com `\n` sobre arquivo CRLF após o
`git checkout`); refeita com padrão tolerante a CRLF e confirmada antes de valer.

## Defeitos encontrados e corrigidos durante o build

1. **Teste C31** simulava a edição do usuário com `JSON.parse` comum e corrompia o inteiro
   grande antes da remoção; a simulação passou a preservar o token. A asserção não mudou.
2. **Teste C12** comparava o ambiente recebido com o objeto passado; no Windows o libuv
   acrescenta variáveis obrigatórias e funde chaves de caixa diferente em todo `spawn`.
   Passou a comparar com o mesmo fake iniciado diretamente (linha de base).
3. **Teste C19/C22**: o harness também dispara `pre_tool_call` em
   `get_pre_tool_call_block_message` (12 = 3×2 + 5 + 1); argv de fixture com argumento
   vazio deixava o plugin inativo de propósito (argv inválido) — trocado por `-`.
4. **Produto — wrapper com consumidor de stdout que desconecta**: com backpressure ativo,
   o `drain` nunca chegaria e o filho travaria; o handler de erro agora retoma a leitura.
5. **Produto — relatório não drenado travava o encerramento no Windows**. Reprodução
   mínima (`/tmp/fd3`): `fs.write` em pipe cheio deixa uma thread do pool bloqueada e
   `process.exit` não retorna (`1001ms deadline / calling exit / HANG`); com
   `net.Socket({fd: 3})` o processo sai no prazo (leitor pausado: 1070 ms) e entrega tudo
   quando há leitor (307200 bytes). No fd 2 o encerramento também trava com leitor parado,
   por isso fd 2 usa `process.stderr` e é reservado ao relatório de um evento do hook.
6. **Produto — espera final do stdout (achado do coordenador)**: o wrapper esperava
   `drain` quando havia bytes na fila, mas `drain` só é emitido após `write()` devolver
   `false`. Agora um `write("")` com callback aguarda as escritas anteriores. O comentário
   sobre a plataforma estava invertido; corrigido pela nota oficial do Node 24 ("Pipes:
   synchronous on Windows, asynchronous on POSIX").
7. **Teste do guia** procurava `\n## `; checkout Windows com `core.autocrlf` (e o
   `git archive` deste Windows) traz CRLF. Leitura normalizada; rodada WSL repetida verde.

Nota do coordenador: `.checks/issue-4-integracoes.coordinator.md` (escrita pelo
orquestrador, preservada sem alteração) registrou o travamento de 13:16/13:22. As
reproduções acima confirmaram as duas causas de produto (itens 5 e 6) e um erro do harness
(`close` esperando um fd pausado — trocado por `exit` + limpeza). A rodada que travou não é
resultado; as contagens válidas são as da tabela acima.

## Ambiente da prova nativa do Hermes

- Intérprete: `venv\Scripts\python.exe` da instalação local; `hermes_cli/__init__.py` com
  `__version__ = "0.21.4"` e hashes de `plugins.py`/`plugins_dispatch.py` iguais aos do
  plano (conferidos pelo teste antes de rodar; revisão diferente → skip).
- `python -I -B`, `PYTHONDONTWRITEBYTECODE=1`, HERMES_HOME/HOME/USERPROFILE/APPDATA/
  LOCALAPPDATA/TEMP temporários, `HERMES_BUNDLED_PLUGINS` vazio, sem modelo, sem
  configuração pessoal; habilitação em `plugins.enabled` feita só no HERMES_HOME do teste.
- `bytecodeState` dos `__pycache__` da instalação igual antes/depois (C18).
- `hermes --version` nunca foi executado.

## Lacunas reais (não são pass)

- E2E com Claude, Codex e Hermes reais: **pendente** nos três (exige agente, modelo,
  credencial e confiança; não autorizado).
- Execução nativa local de Claude e Codex: **não executada**; os hooks foram executados
  pela forma exec gravada (Claude) e pela linha gravada via `cmd.exe /C`/`sh -lc` como o
  `command_runner.rs` 0.162.1 faz (Codex). O contrato do Claude vem da documentação de
  16/10/2026; o metadado local do launcher é 2.1.299.0, sem verificação de runtime.
- Hermes nativo só no Windows local; Linux/macOS pendentes. macOS só pela CI declarada.
- Windows: interrupção do wrapper por sinal programático não testável (TerminateProcess);
  shim `codex.cmd` exige `--codex-entry`; caminhos com `"`, `%`, `!` recusados para o Codex.
- Escrita da configuração: janela não atômica entre a última comparação de hash e o
  `rename` (sem CAS); lock só exclui processos do skill-me.

## Ponto para decisão do orquestrador

C39 diz que os canários não aparecem "em stdout" também para o wrapper. O stdout do
wrapper é, por desenho aprovado no plano e provado em C16/C17, o JSONL nativo do Codex byte
a byte — inclusive o conteúdo que o Codex emite. A prova de C39 exige que o debugger não
acrescente nenhum byte a esse stdout (igualdade com o stdout do filho) e que os canários
estejam ausentes do relatório, do stderr próprio e de arquivos. A leitura literal
("canário ausente do stdout do wrapper") contradiz C16/C17 e o plano; não mudei o texto
do check. Fica registrado para o Verifier e para decisão se o texto deve ser ajustado.

## Outras notas

- Doctor não foi alterado; reusa `projectConfig`, `readBoundedText`, `ONE_MIB_BYTES`,
  `createProductionFsAdapter`, `resolveAgents`, `CLAUDE_MANAGED_SETTINGS_PATH`,
  `CliUsageError`. Nenhuma dependência nova; `package.json` continua `private: true`.
- Privacidade local: uma sonda de depuração imprimiu o ambiente do processo de teste na
  saída local da ferramenta (inclui variáveis de sessão do agente que roda o build).
  Nenhum valor foi gravado no repositório nem enviado a serviço externo.
- Nenhuma instalação em perfil pessoal; todos os `--target` apontaram para diretórios
  temporários de teste.

## Correções da verificação independente — round 1 (F1–F4)

Builder: Claude, mesma entrega (tlc-implement `light`). Partida em `485939d`; a rodada FAIL
está em `.checks/issue-4-integracoes.verified.md` e não foi alterada. Esta seção é evidência
do autor, **não é verificação independente**; o Verifier é do orquestrador, sobre
`236e999..HEAD`. Escopo: só F1–F4. Checklist (barra), Landing, doctor, motor vendorizado e
`AGENTS.md` não mudaram. Nenhuma decisão nova do proprietário.

| Commit | Achado | Conteúdo |
| --- | --- | --- |
| `5521819` | F1 (C27/C34) | `install/run.mjs`: contenção do `__pycache__` e de cada entrada antes de listar/apagar; regressões em `install.cli.test.mjs`; guia |
| `2e99346` | F2 (C38) | `observation.mjs` (`flush({deadlineAt})`), `codex-run.mjs` (prazo contado do fim do filho, reserva 200 ms); medição em `failure-matrix.cli.test.mjs`; carimbo no `fake-codex.mjs` |
| `c3ac5a2` | F3 (C42) | só teste: `boundary.unit.test.mjs` |
| `7de3bc2` | F4 (C23) | só teste: `hermes-plugin.native.test.mjs` |

### F1 — cache Hermes vinculado (perda de dados)

- **Correção:** `readPluginCache` aplica `assertContained` (contrato existente de
  `install/target.mjs`) ao `__pycache__` e a cada entrada antes de listar ou apagar. Junção/
  link que resolve fora do alvo → `target_escape`, código 4, nada removido (prévia também 4).
  `__pycache__` que não é diretório real, ou entrada que não é arquivo regular, é alheio →
  `foreign_files_preserved` (4), preservado mesmo apontando para dentro do alvo. A remoção
  reconfere contenção e tipo imediatamente antes de cada `unlink` (como o hash dos artefatos)
  e só faz `rmdir` do `__pycache__` real inspecionado (no Windows `rmdir` removeria uma junção
  alheia vazia). Nome `__init__.cpython-*.pyc` continua necessário, não suficiente.
- **Asserções novas:** `I4-C27` — `__pycache__` junção (Windows)/link de diretório (POSIX)
  para fora, com `__init__.cpython-311.pyc` externo: `uninstall` com e sem `--apply` → 4,
  `status: conflict`, `applied: false`, `conflicts == ["target_escape"]`, árvore do alvo e
  diretório externo idênticos (`snapshotTree`); mesmo para link de **arquivo** de nome
  próprio num `__pycache__` real. `I4-C34` — cache próprio regular (`.pyc` e `.opt-1.pyc`)
  sai, exit 0, `remove_cache` exatos, árvore volta à anterior; `__pycache__` como junção para
  o cache de outro plugin dentro do alvo e como arquivo regular → 4,
  `["foreign_files_preserved"]`, nenhum `remove_cache`, bytecode do outro plugin e a entrada
  alheia intactos, artefatos próprios removidos.
- **RED no produto anterior (`485939d`, regressão sem correção):** Windows e WSL, `I4-C27`
  e `I4-C34` falharam (`expected 4, actual 0`): a prévia planejava `remove_cache` através da
  junção; a junção para o cache de outro plugin terminava `applied`/0 apagando o bytecode
  alheio. O subcaso de link de arquivo fica atrás do de junção no mesmo teste; isolado numa
  sonda descartável no WSL: produto anterior `{uninstallExit:0, status:"applied",
  linkKept:false}` (link aceito pelo nome e removido), corrigido `{4, ["target_escape"],
  linkKept:true}`. A reprodução do Verifier não foi executada nem alterada (escreve na pasta
  dele e importa a cópia antiga).
- **GREEN:** Windows 2/2 (subcasos de link de arquivo registrados por `t.diagnostic`: EPERM
  sem privilégio, como o subcaso já existente); WSL 2/2 com os subcasos de link de arquivo
  executados.
- **Mudança de comportamento colateral, provada:** `__pycache__` como arquivo regular saía 5
  (`ENOTDIR` no `readdir`); agora é alheio preservado, 4.
- **Limite:** a reconferência antes do `unlink` estreita, mas não elimina, a janela contra
  quem troca diretórios concorrentemente — mesmo limite não atômico já declarado para o
  `rename` da configuração.

### F2 — 1000 ms além do filho (C38)

- **Medido antes da correção (sem mudar teste nem limiar):** com relatório não drenado, o
  wrapper saía 1023–1042 ms (Windows: sonda n=8 e teste novo n=4) e 1007–1008 ms (WSL) depois do filho: o
  prazo de 1000 ms começava no `flush`, depois de detectar o fim do filho, e o encerramento
  ficava fora dele. Defeito de produto, não só de asserção.
- **Correção:** `flush({ deadlineAt })` (relógio monotônico; serialização dentro do prazo).
  O wrapper conta o prazo do `close` do filho: `deadlineAt = fim + 1000 − 200`. Hook e
  ingest mantêm 1000 ms a partir do `flush`. O plano diz "em até 1000 ms"; o check e o
  limiar não mudaram.
- **Calibração da reserva (sonda descartável, prazo contado do `close` e reserva 0):**
  custo fora do timer — Windows ocioso 23–44 ms (n=20), Windows com 32 laços ocupados em
  todos os núcleos 23–63 ms (n=15), WSL 4–14 ms (n=20). Reserva de 200 ms ≥ 3× o pior caso
  medido. Com a reserva: Windows ocioso 824–842 ms (n=20).
- **Prova (`I4-C38`, caso 4):** o filho falso carimba `Date.now()` no handler de `exit`
  (`FAKE_CODEX_EXIT_STAMP=1`, último instante observável do filho); o teste carimba ao
  receber o `exit` do wrapper e exige `0 ≤ intervalo ≤ 1000` ms, sem tolerância. Depois da
  saída, lê o que ficou no fd 3: a linha do relatório não chegou inteira (sem `"\n"`) —
  prova que a escrita estava bloqueada. `t.diagnostic` registra o valor medido.
- **RED:** produto anterior com o teste novo — Windows 1023, 1027, 1026, 1026 ms (fail);
  WSL 1007, 1008 ms (fail). Mutação `REPORT_DEADLINE_MS = 5000` → fail com 4835 ms
  (revertida; espera de 5 s distinguida).
- **GREEN:** Windows 835 ms (isolado), 843 ms (suíte inteira em paralelo), 65536 bytes
  parados no pipe; WSL 807, 808, 808 ms (isolado), 809 ms (suíte), 146176 bytes no pipe.
- **O que a medição comprova e o que não:** relógio do sistema nos dois processos, resolução
  de 1 ms; o carimbo do filho é anterior ao término real e o `exit` visto pelo teste é
  posterior ao término real do wrapper, logo o intervalo medido é **limite superior** do
  real. Não mede o término real com precisão maior que isso nem garante o limite sob
  contenção acima da calibrada; ajuste de relógio do sistema durante a janela invalidaria a
  medição (não observado).

### F3 — seis categorias em cada eventKind (C42)

- **Correção (só teste; produto inalterado):** toda entrada válida dos quatro contratos
  (Claude, Codex hooks, Codex exec, Hermes) e a observação de fim do filho
  (`processExitDraft`) recebem os nomes nativos das seis categorias do plano (`tool_input`,
  `args`, `command_args`, `arguments`, `command`; `tool_response`, `result`,
  `aggregated_output`, `content`; `prompt`, `child_goal`; `cwd`, `transcript_path`,
  `file_path`, `changes[].path`; `last_assistant_message`, `reasoning`; `error`,
  `error_message`, `message`, `child_summary`), também dentro de `item` no exec. Presença
  dos seis canários conferida em cada entrada **antes** do adaptador e da fronteira. O
  registro Hermes entra sem projeção (a tabela `listed` duplicada no teste foi removida).
  Cobertura exigida: os 14 `eventKind`, inclusive `process_exit`.
- **Na própria fronteira**, para cada um dos 14 `eventKind`: cada categoria como campo ou ID
  fora da allowlist no rascunho → `{ok:false, reason:"invalid_draft"}` exato (12 por kind);
  as seis dentro do valor de cada campo do `eventKind` e de cada ID do rascunho → envelope
  com `ids {}`, `fields {}`, lacunas exatamente `<nome>:invalid_type`, nenhum canário.
  Mantidos: chaves do envelope, campos ⊂ allowlist, `validateEnvelope`, rascunhos inválidos,
  ID > 256, nome fora da regex, nome > 128, envelope > 4096 bytes.
- **Discriminação (mutações temporárias, revertidas):** M‑F3a adaptador exec copia
  `event.prompt` para `platform` em `thread.started`; M‑F3b fronteira aceita valor não string
  em campo `name`. Ambas **passavam** no C42 anterior e **falham** no novo
  (`codex-exec/thread_started vazou prompt`; canário `error` emitido). M‑F3c fronteira copia
  valor objeto em `process_exit` → falha no novo (o anterior nem exercitava `process_exit`).

### F4 — HERMES_HOME inteiro (C23)

- **Observação do host (sonda descartável, mesmo harness `-I -B`, HERMES_HOME temporário,
  sem modelo):** o host grava `SOUL.md`, `state.db`, `cache/schema_columns.json`,
  `cache/tool_discovery_cache.json`, diretórios (`sessions`, `logs`, `memories`…) e
  `backups/config/config.yaml.good.<data-hora>`. Em 4 execuções (2 com o observer ativo, 2
  sem) os hashes foram idênticos por caminho; a única diferença foi o backup, cópia byte a
  byte do `config.yaml` de cada execução (que difere na lista de habilitados).
- **Correção (só teste):** nova execução de controle `hostOnly` no `before()` — mesmo
  cenário e destino da captura, observer **instalado mas não habilitado** (`loaded.enabled
  false`, `hooks []`, `observer_stats` ausente: módulo nunca importado). `I4-C23` exige que o
  mapa caminho→{tipo, sha256} das entradas criadas/alteradas (conteúdo ou mtime)/removidas
  no HERMES_HOME durante a captura seja **igual** ao do controle; o backup (nome normalizado)
  é conferido como cópia do `config.yaml` da própria execução e só ele sai da comparação. A
  pasta do plugin continua idêntica (asserção anterior mantida); o controle precisa observar
  escritas do host (mapa não vazio).
- **Discriminação:** M4 plugin grava os registros em `HERMES_HOME/skill-me-observer.log` —
  suíte nativa anterior **8/8 pass**; C23 novo **falha** (caminho extra). M4b plugin
  acrescenta ao `SOUL.md` criado pelo host (mesmo caminho nos dois lados) → C23 novo falha
  pelo hash. Mutações revertidas; `src/` igual ao HEAD conferido por `git diff --quiet`.
- **Limites:** a discriminação depende de o host 0.21.4 (revisão fixada pelos hashes do
  teste) escrever o mesmo conteúdo para o mesmo cenário; um host não determinístico faria o
  teste falhar, nunca passar em silêncio. Cobre o HERMES_HOME, como C23 afirma; HOME/TEMP do
  sandbox não são afirmados. Nativo só no Windows local; WSL sem runtime → pendente.

### Contagens reais em `7de3bc2`

| Execução | governance | code-review | doctor | integrations | exit |
| --- | --- | --- | --- | --- | --- |
| Windows 11, Node 24.21.0, um `node --test --test-reporter=tap` por target | 6/6 | 16/16 | 417: 410 pass, 7 skip | 54: 53 pass, 1 skip | 0 em todos |
| WSL Ubuntu, Node 24.13.0, `git archive` de `7de3bc2` (CRLF), `env -i` mínimo | 6/6 | 16/16 | 417: 416 pass, 1 skip | 54: 46 pass, 8 skip | 0 em todos |
| Windows, 54 linhas `Proof:` pelo executor | — | — | — | 54 exit 0: 53 `tests 1/pass 1/fail 0/skipped 0`, C15 `skipped 1` | 0 |
| WSL, 54 linhas `Proof:` pelo executor | — | — | — | 54 exit 0: 46 pass, 8 `skipped 1` (C18–C23, C37, C44b) | 0 |

Nenhum `fail`, `cancelled` ou `todo`; contagem de testes executados conferida em cada TAP.
Skips e motivos:

- Windows integrations (1): `I4-C15` — `posix-signals` (TerminateProcess). **C15 passou no
  WSL**, no batch e na linha individual (`tests 1/pass 1/skipped 0`).
- WSL integrations (8): `I4-C18..C23`, `I4-C37`, `I4-C44b` — `hermes-runtime-ausente:
  interpretador do Hermes não encontrado` (conferido: não há runtime Hermes no WSL). Prova
  nativa do Hermes, inclusive o C23 novo, só no Windows local; Linux **pendente**.
  `I4-C35` no WSL registrou "observação Hermes não executada … pendente".
- Windows doctor (7) e WSL doctor (1): os mesmos testes preexistentes da #3 (FIFO, ENOTDIR,
  symlink de launcher; `.PYD` no WSL).
- `I4-C27` Windows: dois subcasos de link de arquivo por `t.diagnostic` (EPERM); no WSL os
  dois executaram e passaram.

Saídas brutas (locais, ignoradas pelo Git) em `.checks/code-review/issue-4/`:
`red-f1-windows-485939d.txt`, `red-f1-wsl-485939d.txt`, `green-f1-*`, `red-f2-windows-5521819.txt`,
`red-f2-wsl-5521819.txt`, `mutation-f2-5s-windows.txt`, `green-f2-windows.txt`,
`mutation-f3{a,b}-{old,new}-test.txt`, `mutation-f3c-new-test.txt`, `green-f4-windows.txt`,
`mutation-f4-old-test.txt`, `mutation-f4-new-test.txt`, `mutation-f4b-new-test.txt`,
`batch-{windows,wsl}-7de3bc2-*.tap`, `proofs-{windows,wsl}-7de3bc2.{md,txt}`.

### Pendente: F5/C39 aguarda decisão humana

Não alterado: texto do C39, sua prova (`failure-matrix.cli.test.mjs`, igualdade do stdout
do wrapper com o do filho) e o comportamento de passthrough nativo do wrapper. A
contradição literal com C16/C17 e com o plano continua registrada em "Ponto para decisão
do orquestrador" acima; nenhuma resposta humana foi recebida nem presumida.

### Privacidade e ambiente

Nenhum `process.env`, token ou credencial impresso; a sonda de ambiente do build anterior
não foi reexecutada. Incidente menor: numa checagem somente leitura da existência do
runtime Hermes no WSL, a máscara do diretório home falhou e a saída local da ferramenta
exibiu o caminho do home do usuário WSL (valor de `HOME`); nada gravado no repositório nem
enviado. Hermes nativo no Windows com o runtime local localizado pelo helper, `-I -B`,
HERMES_HOME/HOME/APPDATA/TEMP temporários, sem modelos; nenhum agente iniciado. Processos de
teste conferidos encerrados ao fim (Windows e WSL).

## Correções da revisão formal — round 1 (F1–F4, 17/10/2026)

Builder: Claude (tlc-implement `light`), mesma entrega. Partida em `fe213e9`; base integral
`236e999`. Escopo: só os quatro findings formais que bloqueiam AC6
(`.checks/code-review/issue-4/formal-round1-report.json`, cópia ignorada). Esta seção é
evidência do autor, **não é verificação independente** nem revisão formal: nenhum
`review:run`/`review:check`/`pr:create`/push/PR/Verifier foi executado; o estado do motor
(1 de 2 tentativas) e o `.verified.md` não foram tocados. Checks (a barra), doctor, motor
vendorizado, `code-review.config.json`, `AGENTS.md`, `package.json` e outras issues não
mudaram (`git diff --name-only fe213e9..bb05bcc` nesses caminhos: vazio). Landing recebeu 4
linhas, cada uma antes do código que a fecha.

| Commit | Finding | Conteúdo |
| --- | --- | --- |
| `bdc1969` | F1 | `install/run.mjs`: staging Hermes só é limpo com propriedade comprovada; regressões em `I4-C27`/`I4-C34` |
| `4f2932a` | F2 | `install/io.mjs`, `install/run.mjs`: temporário POSIX nunca amplia o acesso; `I4-C25b` (POSIX real), `I4-C25c` (regra pura), instrumento `helpers/fs-probe.mjs`; Landing; guia |
| `38bc660` | F2 | regra de grupo não atribuível corrigida após contraexemplo do coordenador (0604); modelo `helpers/posix-access.mjs`; Landing; nota do coordenador preservada e encerrada no checklist |
| `3993713` | F3 | `install/json-hooks.mjs`, `install/run.mjs`: reinstalar sobre grupo próprio editado é conflito; `I4-C32b`; Landing |
| `bb05bcc` | F4 | `install/json-hooks.mjs`: saída acima de 1 MiB recusada antes de escrever; `I4-C26b`; Landing; guia |

### F1 — staging Hermes vinculado ou alheio (perda de dados)

- **Correção:** `readStaging`/`isOwnStagedFile` reutilizam `assertContained` e o hash dos
  artefatos: só é sobra própria um diretório real (lstat, não junção/link) cujas entradas são
  arquivos regulares do tamanho e SHA-256 do artefato de mesmo nome. Junção/link para dentro
  do alvo, arquivo no lugar do diretório, link de arquivo ou conteúdo alheio →
  `foreign_artifact` em `plugins/.skill-me-observer.skill-me-tmp`, código 4, na prévia e na
  aplicação, antes de qualquer exclusão; escape para fora continua `target_escape`.
  `removeOwnedStaging` reconfere a propriedade imediatamente antes de cada `unlink` (também no
  rollback de `rename`) e só faz `rmdir` do diretório real. Nome em `ARTIFACT_NAMES` deixou de
  ser critério.
- **Asserções:** `I4-C34` — junção/link para `plugins/victim-plugin` (só `__init__.py` e
  `plugin.yaml`), diretório real com esses nomes e conteúdo alheio, arquivo, link de arquivo de
  nome próprio: prévia e aplicação → 4, `status: conflict`, `applied: false`, `changes: []`,
  conflitos exatamente `foreign_artifact` no staging, árvore inteira do alvo idêntica
  (`snapshotTree` com mtime). Sobra própria (cópias exatas de 2 artefatos) → 0, staging
  removido, 3 artefatos com o hash do registro e, após remover, árvore igual à anterior.
  `I4-C27` — staging como junção para fora com arquivos de mesmos nomes → 4 `target_escape`,
  externo intacto (guarda: já passava).
- **RED (`fe213e9`):** teste — Windows e WSL, prévia `expected 4, actual 0`. Sonda descartável
  com `--apply`: Windows, junção → `0/applied` e **arquivos do outro plugin apagados**;
  diretório real alheio → `0/applied`, conteúdo alheio apagado. WSL, junção → `5/incomplete`
  com os arquivos do outro plugin **já apagados**; diretório alheio → `0`, apagado; link de
  arquivo → `0`, link removido.
- **GREEN:** Windows 12/12 (link de arquivo por `t.diagnostic`: EPERM); WSL 12/12 com o link
  de arquivo executado; sonda: todos os casos `4/conflict`, outro plugin e conteúdo alheio
  intactos.

### F2 — temporário e arquivo final POSIX ampliavam o acesso

- **Correção (POSIX; Windows inalterado):** `accessOf` lê modo/dono/grupo do original;
  `writeExclusive(…, {like})` cria o temporário (`wx`) só com os bits de dono do original,
  iguala o grupo (`fchown(-1, gid)`) e aplica os bits finais (`fchmod`) antes de escrever o
  conteúdo; `replaceChecked` reconfere modo/dono/grupo junto com o hash antes do `rename`
  (mudou → 4; arquivo sumido → 4). Grupo não atribuível: grupo **e** "outros" recebem a
  interseção do que os dois concediam (`replacementMode`), dono intacto.
- **Prova real (`I4-C25b`, WSL, CLI iniciado por `/bin/sh` com `umask 022`):** instrumento de
  teste pré-carregado (`--import`; envolve `open`/`rename` de `node:fs/promises` por
  `syncBuiltinESMExports`; registra só modo, uid, gid, tamanho e presença do canário sintético)
  observa o temporário em `created`, `before_content`, `after_content` e `before_rename`.
  Install e uninstall, Claude 0600/0640/0660 e Codex 0600/0640, conteúdo com canário
  sintético: sequência exata dos 4 instantes, nenhum destinatário ganha acesso em nenhum
  instante (modelo POSIX das quatro classes), temporário vazio até o modo final, modo e grupo
  do original no `rename` e no arquivo final, remoção restaura o texto. Grupo suplementar do
  usuário em 0640 → grupo e modo preservados. EPERM injetado no `chown` do handle (0640 e
  0604) → grupo diferente, nenhuma ampliação em instante algum, final 0600. `I4-C25c`: tabela e
  os 512 modos pelo mesmo modelo. Windows: `I4-C25b` `# SKIP posix-modes`.
- **RED (`bdc1969`, WSL):** `claude 0600 install created: modo 0644 amplia o original 0600`;
  sonda sem instrumento: 0600 e 0640 viram 0644 após install **e continuam 0644 após
  uninstall**, Claude e Codex. `I4-C25c`: export inexistente.
- **Contraexemplo do coordenador (nota preservada no checklist):** a regra de `4f2932a`
  limitava só o grupo novo; em 0604 quem pertencia só ao grupo antigo passaria a "outros" e
  ganharia leitura. Procedente; meu teste tinha a mesma lacuna (só conferia o grupo novo). RED
  em `4f2932a`: `I4-C25c` `0604 → 0604`; `I4-C25b` com EPERM, `before_content`: "só do grupo
  antigo" ganha leitura. Corrigido em `38bc660`.
- **Discriminação (mutações só em cópias WSL):** M-F2a `chmod` depois do conteúdo → falha em
  `created` (um teste só do modo final passaria); M-F2b criar já com o modo final → falha no
  grupo suplementar; M-F2c copiar os bits de grupo sem igualar o grupo → falha em
  `before_content`. As três foram aplicadas sobre o estado anterior a `38bc660`.
- **GREEN:** WSL 14/14 (permissões, unidade e instalador); Windows 3 pass + 1 skip declarado.
  Sonda: 0600/0640 permanecem após install e uninstall, nos dois agentes.
- **Limites (não anunciados como preservados):** o dono do arquivo novo é quem executa (sem
  privilégio não há `chown` de dono; executar como outro usuário, p. ex. root, troca o dono);
  ACL POSIX/Windows, xattr e bits especiais não são preservados nem detectados — em arquivo
  com ACL POSIX os bits de grupo do modo são a máscara; o Windows não recebe tratamento de
  modo. O caminho EPERM foi exercitado por injeção no handle: um grupo do qual o usuário não é
  membro exigiria root para preparar. Continua a janela não atômica já declarada entre a
  última conferência e o `rename`. Nenhum `chmod`/`chown` fora de diretórios temporários de
  teste.

### F3 — reinstalação sobre grupo próprio editado

- **Correção:** `planJsonInstall`: evento sem o grupo registrado e sem o canônico, mas com
  grupo de assinatura própria → `owned_entry_modified` (com registro, que continua com a
  entrada) ou `owned_entry_unrecorded` (sem registro); nada acrescentado nem adotado no
  evento; os demais seguem; código 4. `run.mjs` deixou de descartar os conflitos da
  instalação. `planJsonUninstall`: grupo de assinatura própria que resta sem conflito no
  evento → `owned_entry_unrecorded`, 4.
- **Asserções (`I4-C32b`, Claude e Codex):** instalar, editar o timeout do grupo próprio de
  `PreToolUse` para 99 (editor que preserva tokens numéricos), reinstalar (prévia e aplicação)
  → 4, conflitos exatamente `[owned_entry_modified, PreToolUse]`, `changes: []`, bytes da
  configuração e do registro iguais, um único grupo próprio no evento (o editado); remover → 4,
  mesmo conflito, só o editado resta, registro = `[entrada original de PreToolUse]`; remover de
  novo → 4, nenhum byte muda. Sem registro: reinstalar → 4 `owned_entry_unrecorded`, nenhuma
  mudança no evento, demais adotados; duas remoções → 4 com o editado ativo. Cópia editada ao
  lado do registrado → remoção 4 `owned_entry_unrecorded`. C24, C28 e C33 (prévia,
  idempotência, reconciliação) inalterados e verdes.
- **RED (`4f2932a`):** teste Windows, prévia `expected 4, actual 0` com `add_group`. Sonda da
  cadeia nos dois agentes: reinstalação `0`, **2** grupos próprios; remoção `0/applied` sem
  conflito; editado (99) ativo; registro apagado.
- **Discriminação (cópias WSL):** M-F3a adotar o editado pela assinatura e M-F3b remover a
  conferência na remoção → `I4-C32b` falha; C28/C32/C33 passam com as duas (a suíte anterior
  não as detectaria).
- **GREEN:** Windows 14/14 no instalador; WSL 11/11; sonda: reinstalação
  `4/owned_entry_modified` com 1 grupo, remoção `4/conflict`, editado reportado, registro
  mantido.

### F4 — saída acima de 1 MiB

- **Correção:** os planos puros de instalação e remoção (compartilhados por Claude e Codex)
  medem `Buffer.byteLength(texto, "utf8")` contra `ONE_MIB_BYTES`, o mesmo teto inclusivo de
  `readBoundedText`/`projectConfig`; acima → 3 `invalid_config`, `errors:
  [{code:"output_too_large", file}]`, sem escrita nem registro, inclusive na prévia.
- **Asserções (`I4-C26b`, Claude e Codex):** entrada ASCII válida de exatamente 1 048 512 bytes
  sem hooks → prévia e aplicação 3 com o erro exato, saída sem conteúdo, árvore idêntica;
  remoção seguinte 0 `unchanged`; reinstalação 3 de novo; arquivo igual. Saída de exatamente
  1 048 576 bytes (calibrada pelos bytes que a instalação acrescenta nesta máquina) → 0
  `applied`, reinstalação 0 `unchanged` com bytes iguais, remoção 0 restaurando a entrada. Um
  byte acima → 3. Dez `x` → `ç`: mesma quantidade de caracteres da saída no limite e 10 bytes
  UTF-8 acima → 3. Claude: arquivo minificado pelo usuário depois da instalação, cuja
  reescrita indentada passaria do limite → remoção 3, configuração e registro intactos.
- **RED (`3993713`):** teste Windows, prévia `expected 3, actual 0`. Sonda nos dois agentes:
  entrada de 1 048 512 bytes → install `0/applied`, arquivo com 1 051 751 (Claude) / 1 050 331
  (Codex) bytes; reinstalação e remoção `3/input_too_large`.
- **Discriminação (cópias WSL):** M-F4a medir caracteres → falha no caso UTF-8; M-F4b não
  conferir na remoção → falha no caso minificado; M-F4c `>=` → falha na saída exatamente no
  limite (`expected 0, actual 3`).
- **GREEN:** Windows 19/19 (instalador + guia); WSL 16/16; sonda: `3/output_too_large`, arquivo
  intacto, remoção `0/unchanged`.
- **Limite:** a remoção que só cresce por reformatação foi provada no Claude; o Codex usa o
  mesmo plano puro.

### Contagens reais em `bb05bcc`

Um batch por target: `node --test --test-reporter=tap "tests/integrations/**/*.test.mjs"
scripts/governance-ci.test.mjs`. WSL: Ubuntu, Node 24.13.0, cópia por `git archive` de
`bb05bcc` no ext4 (`/tmp`), `env -i` só com `PATH`; exit capturado do próprio `wsl.exe`.

| Execução | tests | pass | fail | cancelled | skipped | exit |
| --- | --- | --- | --- | --- | --- | --- |
| Windows 11, Node 24.21.0 — integrações 58 + governança 6 | 64 | 62 | 0 | 0 | 2 | 0 |
| WSL — integrações 58 + governança 6 | 64 | 56 | 0 | 0 | 8 | 0 |

Cruzamento das 54 linhas `Proof:` do checklist com o batch (cada padrão casou exatamente um
teste): Windows 53 PASS + `I4-C15` SKIP; WSL 46 PASS + 8 SKIP. Extras fora das linhas
`Proof:` (todos executados): `I4-C16c`, `I4-C25b`, `I4-C25c`, `I4-C26b`, `I4-C32b` e 5 testes
de governança. Skips e motivos:

- Windows: `I4-C15` `posix-signals` (passa no WSL); `I4-C25b` `posix-modes` (passa no WSL).
  `I4-C27`/`I4-C34`: subcasos de link de arquivo registrados por `t.diagnostic` (EPERM sem
  privilégio); executados no WSL.
- WSL: `I4-C18..C23`, `I4-C37`, `I4-C44b` `hermes-runtime-ausente` — Hermes nativo só no
  Windows (executado nesse batch); Linux **pendente**. `I4-C35` registra a observação Hermes
  pendente.
- Doctor (417) e motor de revisão (16) não foram reexecutados: nenhum arquivo deles, nem os
  módulos do doctor reutilizados, mudou desde as contagens de `7de3bc2`/`82a21f7`.

Saídas brutas (locais, ignoradas) em `.checks/code-review/issue-4/`: `red-formal-*`,
`green-formal-*`, `mutation-formal-*`, `observation-plugin-dir-link-*`,
`batch-{windows,wsl}-bb05bcc.tap`, `proofs-vs-batch-{windows,wsl}-bb05bcc.txt`.

### Pendências e limites desta rodada

- **Achado fora do escopo literal de F1, comunicado e não corrigido (perda de dados):** se a
  própria pasta `plugins/skill-me-observer` for trocada por junção/link para outro plugin
  dentro do alvo, `uninstall --apply` sai 4, mas apaga o bytecode
  `__pycache__/__init__.cpython-311.pyc` desse outro plugin (sonda sintética no Windows e no
  WSL, `victimBytecodeKept: false`; `observation-plugin-dir-link-*`). Mesma causa (link interno
  + nome), outro caminho. Aguarda decisão do orquestrador/proprietário; nada foi alterado.
- Sobras sintéticas das minhas sondas, não removidas porque a remoção por shell foi negada
  pela política de permissões desta sessão: `TEMP/skill-me-formal-probes` (sondas, mutantes,
  helpers), `TEMP/f3-claude-*` (sonda F3 que falhou antes da limpeza), 19 cópias
  `/tmp/skillme-formal2-*` e `/tmp/skill-me plugin-dir-link probe-*` no WSL. Os diretórios
  `skill-me i4 *` restantes no TEMP do Windows são de 16/10, anteriores a esta rodada.
- E2E real dos três agentes continua pendente; Hermes nativo só no Windows; macOS só pela CI.
- Privacidade: nenhum valor de ambiente, token ou credencial impresso; as sondas imprimiram só
  códigos, modos, contagens e tamanhos; conteúdo sintético. Nenhuma instalação em perfil
  pessoal; todos os `--target` em temporários.

## Continuidade AC6 — pasta própria do plugin Hermes (17/10/2026)

Builder: Claude (tlc-implement `light`), mesma entrega. Partida em `9184d65` com checkout
limpo; base integral `236e999`. Esta seção é evidência do autor, **não é verificação
independente** nem revisão formal: nenhum `review:run`/`review:check`/`pr:create`/push/PR/
Verifier foi executado; o estado do motor (1 de 2 tentativas) e o `.verified.md` não foram
tocados. A barra (Checks, inclusive o texto de C27 e C34) e o Landing não mudaram: não há porta
técnica nova — `foreign_artifact`, `owned_entry_modified`, `owned_entry_unrecorded`,
`config_changed_during_apply` e o código 4 já existiam. `git diff --name-only 9184d65..6df4d4c`:
só `src/integrations/install/run.mjs`, `tests/integrations/install.cli.test.mjs`,
`tests/integrations/install-apply.unit.test.mjs` e `docs/agent-observation.md` (doctor, motor
vendorizado, `code-review.config.json`, `AGENTS.md`, `package.json`/lock e outras issues
inalterados). A correção F2 de permissões (`38bc660`, contraexemplo 0604) não foi tocada.

**Classificação.** A pendência registrada acima, em "Pendências e limites desta rodada" (pasta
própria trocada por junção/link → `uninstall --apply` sai 4 e apaga o bytecode de outro
plugin), foi classificada pelo orquestrador como continuidade do AC6 já aprovado — remover
somente artefatos próprios e preservar alterações/terceiros — e da mesma fronteira de
propriedade de F1. Não é nova feature, issue ou decisão de produto e não amplia o recorte da
fronteira mínima/receptor em memória. Nenhuma autorização humana nova foi pedida, recebida ou
presumida; a formulação anterior ("aguarda decisão do orquestrador/proprietário") permanece
acima como histórico e fica encerrada por esta seção. Durante a correção apareceram defeitos
adjacentes no mesmo instalador e no mesmo AC6/C34; o builder os tratou como defeitos dentro do
escopo (AGENTS.md: "Trate defeitos dentro do escopo e teste a correção"), comunicados aqui e no
retorno ao orquestrador, cada um com RED/GREEN próprio — essa extensão é julgamento do builder,
sujeita à conferência do orquestrador e do Verifier.

| Commit | Achado | Conteúdo |
| --- | --- | --- |
| `42516ad` | caso do orquestrador: pasta própria como junção/link/arquivo | `run.mjs`: `entryKind`/`ownPluginDirExists` (lstat) antes dos caminhos dos artefatos e na releitura sob o lock; reconferência de diretório real antes de cada `unlink`/`rmdir`; `I4-C34b`, `I4-C34c`; guia |
| `01faaac` | novo — remoção sem registro apagava bytecode | o plano é a fonte dos caches removidos (vazia sem registro); linha "diretório real de mesmo nome, sem registro" em `I4-C34b`; guia |
| `043f287` | nota do coordenador (container `plugins`) + irmão `.skill-me` | `removeDirIfEmpty` só remove diretório real; `I4-C34d`; guia |
| `6df4d4c` | novos — artefato trocado por link de arquivo; bytecode ao lado de fonte preservada | `lstat` do artefato na leitura e antes do `unlink`; cache acompanha o `__init__.py`; `I4-C34e`; variante de link de arquivo durante a aplicação em `I4-C34c`; guia |

### Caso do orquestrador — pasta própria trocada por junção/link (`42516ad`)

- **Causa no HEAD `9184d65`:** `readHermesState` decidia a existência da pasta com `stat` (segue
  junção/link) e listava através dela. O `lstat` de `skill-me-observer/__pycache__` não vê a
  junção no ancestral, então o `__pycache__` real do outro plugin entrava em `state.caches` e
  era apagado. A reconferência antes do `unlink` só olhava contenção e tipo do arquivo, não se a
  pasta e o `__pycache__` continuavam diretórios reais.
- **Correção:** a pasta do plugin só é nossa como diretório real (`lstat`, mesmo contrato do
  staging de F1). Junção/link para dentro do alvo ou arquivo no lugar dela → `foreign_artifact`
  em `plugins/skill-me-observer`, código 4, na prévia e na aplicação de install e uninstall,
  **antes** de conferir os caminhos dos artefatos e sem ler, apagar ou registrar nada através
  dela (repetido na releitura sob o lock). Para fora do alvo continua `target_escape`
  (`assertContained` existente). Imediatamente antes de cada `unlink` e `rmdir` da remoção, a
  pasta e o `__pycache__` são reconferidos como diretórios reais; troca depois da leitura →
  `config_changed_during_apply` (4), nada além do já conferido é apagado.
- **Asserções `I4-C34b` (CLI):** seis variantes — junção (Windows)/symlink real (POSIX) para
  outro plugin no alvo com `__init__.py` diferente; para cópias exatas dos três artefatos no
  alvo; para cópias exatas fora do alvo; link de arquivo para o `__init__.py` de outro plugin
  no alvo; link de arquivo para fora; arquivo regular — cada uma depois de instalar (registro
  presente, pasta instalada movida para fora do alvo sem exclusão) e sem instalação. Do outro
  lado há sempre `__pycache__/__init__.cpython-311.pyc` sintético. Cada linha roda `install`,
  `install --apply`, `uninstall`, `uninstall --apply` e compara numa única tabela: código,
  status, `applied`, número de mudanças e conflitos (`código:arquivo`); estado do bytecode por
  SHA-256 (`intacto`/`alterado`/`apagado`); `snapshotTree` (tipo, SHA-256, bytes, mtime) da
  árvore do outro plugin e do alvo inteiro (link, `config.yaml`, registro); link ainda link e
  com o mesmo `realpath`. Esperado em todos os comandos: `4 conflict applied=false changes=0`,
  `foreign_artifact:plugins/skill-me-observer` (dentro do alvo, inclusive arquivo regular) ou
  `target_escape` (fora); bytecode intacto; árvores iguais; link mantido. Controle: pasta
  própria real com cache normal ao lado de outro plugin com bytecode de mesmo nome →
  `0 applied`, um `remove_cache` exato, alvo de volta à árvore anterior e outro plugin com mtime
  igual.
- **Asserções `I4-C34c` (io instrumentado, troca durante a aplicação):** depois da remoção do
  último artefato próprio, a pasta ou o `__pycache__` vira junção/symlink para outro plugin com
  bytecode de mesmo nome → 4, `[{code: "config_changed_during_apply", file: <caminho
  trocado>}]`, bytecode e árvore do outro plugin intactos, link mantido, registro byte a byte
  igual, lock liberado.

**RED no HEAD `9184d65`** (`red-plugindir-{windows,wsl}-9184d65.txt`; produto conferido por
`git diff --quiet 9184d65 -- src` e, no WSL, pelo SHA-256 da cópia):

| Variante `I4-C34b` | Registro | Windows | WSL | Outro lado |
| --- | --- | --- | --- | --- |
| junção/link → outro plugin no alvo (**o caso relatado**) | sim | `uninstall --apply → 4 conflict applied=true` (`owned_entry_modified`) | idem | **bytecode apagado** |
| idem | não | `uninstall --apply → 5 incomplete` | idem | **bytecode apagado** |
| junção/link → cópias exatas no alvo | sim | `install → 0 unchanged`; `uninstall --apply → 0 applied`, junção removida | idem; symlink fica | **bytecode e cópias apagados** |
| idem | não | `install --apply → 0 applied` (adota através da junção); `uninstall --apply → 0` | idem | **bytecode e cópias apagados** |
| junção/link → cópias fora do alvo | sim/não | `4 target_escape` nos quatro comandos | idem | intacto (guarda) |
| link de arquivo → `__init__.py` no alvo | sim/não | não executado (EPERM) | `5 incomplete` nos quatro (ENOTDIR) | intacto |
| link de arquivo → fora do alvo | sim/não | não executado (EPERM) | `4 target_escape` | intacto (guarda) |
| arquivo regular no lugar da pasta | sim/não | `install --apply → 0 applied`: **o rename do staging substitui o arquivo do usuário** | `5 incomplete` (ENOTDIR) | outro plugin intacto |
| diretório real de mesmo nome (`01faaac`) | não | `uninstall --apply → 5 incomplete` | idem | **bytecode apagado** |

`I4-C34c` no HEAD: as duas trocas terminaram `0 applied` com o bytecode do outro plugin apagado
e o registro removido; no Windows a junção do `__pycache__` também foi removida. A substituição
do arquivo regular no Windows foi confirmada à parte por sonda sem exclusões
(`observation-plugin-path-file-windows-9184d65.json`: `install 0 applied`, nenhum arquivo com o
conteúdo do usuário restou no alvo; `…-043f287.json`: `4 foreign_artifact`, arquivo intacto).

**Prova pedida — bytecode alheio preservado:** na linha do caso relatado, o produto anterior saía
4 **e** apagava `victim-plugin/__pycache__/__init__.cpython-311.pyc` (Windows e WSL;
`observation-plugin-dir-link-*-fe213e9.json` da rodada anterior e o RED acima). Com a correção,
os quatro comandos saem `4 conflict applied=false changes=0
foreign_artifact:plugins/skill-me-observer`; o SHA-256 do bytecode é igual ao anterior; a árvore
do outro plugin e a do alvo são iguais com mtime; a junção/symlink continua apontando para o
mesmo destino — Windows (junção) e WSL (symlink).

**Mudanças colaterais de comportamento, provadas:** arquivo regular ou link de arquivo no lugar
da pasta saía 0 (Windows, arquivo substituído) ou 5 (POSIX, `ENOTDIR`) e agora sai 4
`foreign_artifact`; remoção sem registro de pasta real com cache saía 5 e agora sai 4
`owned_entry_unrecorded` sem exclusão. Derivada e não testada à parte: a pasta que some entre a
leitura e a remoção passa de 5 (`ENOENT`) a 4 `config_changed_during_apply`.

### Achado novo — remoção sem registro (`01faaac`)

Encontrado pelo RED da variante "sem instalação" e confirmado sem link: um diretório real
`plugins/skill-me-observer` que o skill-me nunca instalou, com `__pycache__/__init__.cpython-311.pyc`.
`uninstall` (prévia) listava só `owned_entry_unrecorded`, mas `uninstall --apply` decidia
escrever pelos caches do estado, apagava o bytecode e depois falhava em `state.manifest.created`
(5). Agora o plano é a única fonte dos caches removidos — vazia sem registro — e a aplicação
não apaga o que a prévia não lista: 4 `owned_entry_unrecorded`, árvore igual. RED: linha
correspondente acima (Windows e WSL); mutação M-PDc.

### Nota do coordenador — container `plugins` — e irmão `.skill-me` (`043f287`)

A nota de coordenação acrescentada ao checklist (preservada sem edição) pedia para provar ou
refutar: instalar sem `plugins` (`created.pluginsDir: true`), mover `plugins` para
`plugin-store`, ligar `plugins` por junção e remover. **Confirmado no Windows:** a remoção
saía `0 applied` com as mudanças próprias corretas, mas `removeDirIfEmpty` fazia `rmdir` na
junção do usuário quando `plugin-store` ficava vazio. O mesmo helper limpa `.skill-me` no
`withLock` dos três agentes; o caso irmão (`.skill-me` movido para `state-store` e ligado por
junção, Claude) perdia a junção do mesmo modo. No POSIX, `rmdir` em symlink já falhava com
`ENOTDIR` (absorvido) e o link ficava: a regressão passa antes e depois (guarda), RED só no
Windows (`red-container-{windows,wsl}-01faaac.txt`).

- **Correção:** `removeDirIfEmpty` só remove diretório real (`lstat`); a remoção conclui o que
  é nosso e o link do usuário fica.
- **Asserções `I4-C34d`:** controle — alvo Hermes sem `plugins` → install registra
  `created.pluginsDir: true` e a remoção devolve a árvore anterior (`plugins` e `.skill-me` reais
  saem). Trocas — Hermes `plugins → plugin-store` e Claude `.skill-me → state-store`:
  `0 applied` sem conflito, mudanças exatas (Hermes: 3 `remove_artifact` + `delete_manifest`;
  Claude: 8 `remove_group`, 7 `remove_event_key` — `PreToolUse` já existia —,
  `delete_manifest`), destino vazio e diretório real, link mantido com o mesmo `realpath`.

### Achados novos — artefato trocado por link de arquivo e bytecode de fonte preservada (`6df4d4c`)

Verificados por sonda sem exclusões no produto `043f287` (`observation-residual-wsl-043f287.json`):

- **Artefato trocado por link de arquivo** (o `__init__.py` da pasta própria real vira symlink
  para cópia idêntica em outro plugin): a remoção seguia o link pelo hash e saía `0 applied`
  apagando o **link do usuário** (o destino ficava). Agora só arquivo regular pode ser o
  artefato gravado (mesma regra do staging e das entradas do cache): link é alteração
  preservada como uma edição (`owned_entry_modified`), na leitura e na reconferência antes do
  `unlink`.
- **Bytecode ao lado de fonte preservada** (com registro, a pasta própria real recebe os três
  artefatos de outro plugin de mesmo nome, ou o usuário edita o `__init__.py`, e o Hermes grava
  o bytecode desse arquivo): a remoção saía 4 (`owned_entry_modified` ×3) **e** executava
  `remove_cache`, apagando o bytecode ao lado do `__init__.py` preservado. Agora o bytecode
  acompanha a fonte: com o `__init__.py` preservado, o cache dele fica; sem ele (já ausente) ou
  com ele removido como nosso, o cache próprio sai como antes.
- **Asserções `I4-C34e`:** pasta substituída — os quatro comandos `4 conflict applied=false
  changes=0` com os três `owned_entry_modified`, bytecode intacto, alvo igual com mtime; link de
  arquivo (WSL; Windows EPERM por diagnóstico) — install/prévia `4 … changes=0` só com
  `owned_entry_modified:…/__init__.py`, `uninstall --apply → 4 conflict applied=true changes=3`,
  link mantido para o mesmo destino, cópia do outro plugin intacta, bytecode intacto, pasta
  final exatamente `{__init__.py: link, __pycache__/__init__.cpython-311.pyc}` e registro só com
  `__init__.py`. `I4-C34c` ganhou a variante `plugin.yaml` trocado por link de arquivo para
  cópia idêntica depois da remoção do primeiro artefato → 4 `config_changed_during_apply` em
  `plugin.yaml`, link e registro mantidos.
- **RED:** `I4-C34e` em `043f287`, Windows e WSL — pasta substituída: `uninstall --apply → 4
  conflict applied=true changes=1`, bytecode apagado (`red-ownentries-*-043f287.txt`); a parte
  do link fica depois no mesmo teste: RED pela sonda acima (`0 applied`, link apagado) e pela
  mutação M-PDf. Variante de link em `I4-C34c` no WSL em `043f287`: `0 applied`, link apagado,
  registro removido (`red-artifact-swap-wsl-043f287.txt`). Sonda no produto final
  (`observation-residual-wsl-6df4d4c.json`): link `4`, link e cópia mantidos; pasta substituída
  `4`, `changes: []`, bytecode mantido.

### Discriminação (mutações só em cópias WSL; worktree conferido pelo SHA-256 depois)

| Mutação | O que desfaz | Falha | Passam |
| --- | --- | --- | --- |
| M-PDa | pasta trocada deixa de ser recusada na leitura | `I4-C34b`: a junção para cópias exatas é **adotada** (`install --apply → 0 applied`); a reconferência ainda barra a exclusão (`config_changed_during_apply`) | os outros 16 do instalador |
| M-PDb | sem reconferência de diretório real antes de cada exclusão | `I4-C34c`: as duas trocas `0 applied`, bytecode apagado | os outros 16 |
| M-PDc | caches vêm do estado, não do plano | `I4-C34b` linha sem registro: bytecode apagado, `5 incomplete` | os outros 16 |
| M-PDd | `removeDirIfEmpty` nunca remove | `I4-C34d` (controle), `I4-C30`, `I4-C31`, `I4-C34`, `I4-C34b` | 13 |
| M-PDf | artefato lido pelo hash mesmo sendo link | `I4-C34e`, parte do link | os outros 18 |
| M-PDg | cache sai mesmo com o `__init__.py` preservado | `I4-C34e`, pasta substituída | os outros 18 |
| M-PDh | sem `lstat` do artefato antes do `unlink` | `I4-C34c`, variante `plugin.yaml` | os outros 18 |

M-PDa..M-PDc rodaram sobre o produto de `01faaac` e M-PDd sobre `043f287` (testes de então);
M-PDf..M-PDh sobre `6df4d4c`. As duas camadas do caso relatado são necessárias: sem a recusa na
leitura há adoção através do link; sem a reconferência, a troca depois da leitura apaga o
bytecode alheio com 0. Commit intermediário `42516ad` também passou isolado (Windows 17/17,
`green-plugindir-commit1-windows.txt`).

### Contagens reais em `6df4d4c`

Um batch por plataforma: `node --test --test-reporter=tap "tests/integrations/**/*.test.mjs"
scripts/governance-ci.test.mjs`. Windows: worktree com código igual a `6df4d4c`
(`git diff --quiet HEAD -- src tests docs scripts package.json`), Hermes nativo pelo helper
(`python -I -B`, HERMES_HOME e HOME/APPDATA/TEMP temporários, sem modelo). WSL: Ubuntu, Node
24.13.0, cópia `git archive` de `6df4d4c` no ext4, `env -i` só com `PATH`; exit do próprio
`wsl.exe`.

| Execução | tests | pass | fail | cancelled | skipped | todo | exit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Windows 11, Node 24.21.0 — integrações 62 + governança 6 | 68 | 66 | 0 | 0 | 2 | 0 | 0 |
| WSL — integrações 62 + governança 6 | 68 | 60 | 0 | 0 | 8 | 0 | 0 |

Os 68 nomes executados estão nos TAP (`batch-{windows,wsl}-6df4d4c.tap`), na mesma ordem nas
duas plataformas. Cruzamento das 54 linhas `Proof:` (cada padrão casou exatamente um teste):
Windows 53 PASS + `I4-C15` SKIP; WSL 46 PASS + 8 SKIP. Extras fora das linhas `Proof:` (14, todos
executados): 5 de governança, `I4-C16c`, `I4-C25b`, `I4-C25c`, `I4-C26b`, `I4-C32b`, `I4-C34b`,
`I4-C34c`, `I4-C34d`, `I4-C34e`. Novos desta rodada: `I4-C34b`..`I4-C34e` (+4 em relação aos 64
de `bb05bcc`). Skips e motivos:

- Windows (2): `I4-C15` `posix-signals` e `I4-C25b` `posix-modes` (passam no WSL). Subcasos de
  link de arquivo registrados por `t.diagnostic` (EPERM sem privilégio): 2 em `I4-C27`, 1 em
  `I4-C34`, 4 em `I4-C34b`, 1 em `I4-C34c`, 1 em `I4-C34e` — todos executados no WSL, sem
  diagnóstico.
- WSL (8): `I4-C18..C23`, `I4-C37`, `I4-C44b` `hermes-runtime-ausente` (sem runtime Hermes
  declarado no WSL): prova nativa do Hermes só no Windows (executada nesse batch); Linux
  **pendente**. `I4-C35` registrou a observação Hermes pendente.
- Doctor (417) e motor de revisão (16) não foram reexecutados: nenhum arquivo deles, nem dos
  módulos do doctor reutilizados, mudou desde `9184d65`.
- Batches intermediários (`batch-{windows,wsl}-01faaac.tap`: 66 testes, 64/58 pass;
  `…-043f287.tap`: 67, 65/59 pass; todos exit 0, mesmos skips) foram superados pelo de
  `6df4d4c`; o executor de 54 processos não foi rodado (os nomes saíram do batch).

### Limites e resíduos

- Janela não atômica entre a reconferência e cada `unlink`/`rmdir`, como na escrita da
  configuração; a reconferência estreita, não elimina, a corrida com quem troca diretórios.
- Ponto de montagem de volume (Windows) e bind mount (POSIX) aparecem como diretório real e não
  são distinguidos; criá-los exige privilégio.
- Identidade por caminho, tipo e hash: uma pasta real de mesmo nome com cópias byte a byte dos
  artefatos, alcançada depois que o usuário troca o container `plugins` por junção, é
  indistinguível da instalada (troca do container dentro do alvo é layout aceito do usuário).
- Bytecode de nome próprio com o `__init__.py` já ausente continua saindo como cache órfão da
  nossa fonte (comportamento anterior mantido).
- Hermes nativo só no Windows; Linux pendente; macOS só pela CI; E2E real dos três agentes
  pendente.

### Sobras próprias desta rodada (preservadas; nenhuma exclusão por shell)

Avaliação de limpeza com o orquestrador. Windows `%TEMP%`: em `skill-me-formal-probes/` os
arquivos novos `plugindir-mutants.mjs`, `run.mutation-pd-{a,b,c,d,f,g,h}.mjs`, `run.final.mjs`,
`install.cli.test.final.mjs`, `agent-observation.final.md` (cópias usadas para separar os
commits), `plugin-path-file-probe.mjs`, `residual-probe.mjs` e a cópia `head-9184d65/`
(`git archive` + `node_modules`); fora dela `skill-me i4 lstat-check ação-vLpB5O` e
`skill-me plugin-path-file probe-{Bq7ppi,yR9mrm}`. WSL `/tmp`: `skillme-formal2-plugindir-{red,
green,mut}`, `skillme-formal2-{01faaac,043f287,6df4d4c}`,
`skillme-formal2-container-{red,green}`, `skillme-formal2-ownentries-{red,green}` e
`skill-me residual {A,B} probe-*` (duas execuções). A sonda original
`plugin-dir-link-probe.mjs` e `observation-plugin-dir-link-*` foram preservadas e não
reexecutadas (ela termina com `rmSync`; `I4-C34b` reproduz o cenário com o mesmo conteúdo
sintético). Scratches dos testes: removidos pelo `after()` existente do `node:test`, só
diretórios de `makeScratch` (caminho absoluto sob o TEMP); todo link criado pelos testes aponta
para scratch do próprio teste. Scratches dos Verifiers, backups da recuperação e histórico
formal não foram tocados.

Saídas brutas (locais, ignoradas) em `.checks/code-review/issue-4/`:
`red-plugindir-{windows,wsl}-9184d65.txt`, `green-plugindir-{windows,wsl}.txt`,
`green-plugindir-commit1-windows.txt`, `red-container-{windows,wsl}-01faaac.txt`,
`green-container-{windows,wsl}.txt`, `red-ownentries-{windows,wsl}-043f287.txt`,
`red-artifact-swap-wsl-043f287.txt`, `green-ownentries-{windows,wsl}.txt`,
`green-ownentries-unit-windows.txt`, `mutation-plugindir-pd-{a,b,c,d,f,g,h}-wsl.txt`,
`observation-plugin-path-file-windows-{9184d65,043f287}.json`,
`observation-residual-wsl-{043f287,6df4d4c}.json`, `batch-{windows,wsl}-{01faaac,043f287,6df4d4c}.tap`,
`proofs-vs-batch-{windows,wsl}-{043f287,6df4d4c}.txt`, `proofs-vs-batch-windows-01faaac.txt`.

### Privacidade e ambiente

Nenhum `process.env`, token, credencial ou valor de ambiente impresso; testes e sondas usam
ambiente mínimo (`PATH` e variáveis de sistema do Windows) e conteúdo sintético; as sondas
imprimiram só códigos, ações, tipos e caminhos de temporários próprios. Nenhuma instalação em
perfil pessoal; todos os `--target` em temporários; nenhum agente, modelo ou E2E executado;
nenhum bypass/confiança concedido. Processos de teste conferidos encerrados ao fim (Windows: 0
relacionados à entrega; WSL: 0 `node`/`python`).

## Correção pós-verificação round 3 — registro parcial Hermes (17/10/2026)

Builder: Claude (tlc-implement `light`), mesma entrega. Partida em `bdba7c4` (só relatório FAIL
e Handoff; código e testes = `7083702`), checkout limpo. Esta seção é evidência do autor, **não é
verificação independente** nem revisão formal: nenhum `review:run`/`review:check`/`pr:create`/
push/PR/Verifier foi executado; `.verified.md`, contadores, estado do motor (1 de 2 tentativas) e
o limite de três rodadas independentes não foram tocados. Não existe aprovação humana nova; a
exceção para uma rodada adicional fica com o orquestrador. Commits: `c066a5f` e `6f1740d`;
`git diff --name-only bdba7c4..6f1740d`: só `src/integrations/install/run.mjs`,
`tests/integrations/install.cli.test.mjs`, `tests/integrations/install-apply.unit.test.mjs` e
`docs/agent-observation.md`. Checks e Landing inalterados: não há porta técnica nova —
`foreign_files_preserved`, `foreign_artifact`, `config_changed_during_apply`, `adopt_artifact` e o
código 4 já existiam; a regra cabe em "Remoção só apaga grupos/artefatos cujo hash confere com o
registro; … arquivo alheio na pasta do plugin → preservado e 4" e em "Reinstalar reconcilia".

**Classificação.** O achado do Verifier é continuidade da correção de propriedade da remoção
(AC6/C34), encaminhada pelo orquestrador. A sonda RED própria encontrou mais quatro estados com a
mesma raiz — registro parcial (ou ausência de registro de um artefato) tomado como autorização —,
tratados como defeitos do mesmo AC6, comunicados aqui e no retorno: B, C, D e E/E2 abaixo. A nota
do coordenador acrescentada ao Handoff durante a correção (`__pycache__` vazio) foi confirmada e
corrigida em `6f1740d`; a nota fica preservada sem edição e é encerrada no Handoff.

### Reprodução RED no produto `7083702` (cópias isoladas próprias)

Cópia Windows por `git archive 7083702` (SHA-256 do archive `207858f0…a5d589a8`, igual ao
`head.tar` do Verifier) + `node_modules`; blobs de `run.mjs` e dos testes conferidos por
`git hash-object`. Cópia WSL do mesmo archive no ext4 (`/tmp/skillme-round4-red-7083702`),
`run.mjs` normalizado igual ao blob. A sonda do Verifier foi lida e não executada nem alterada;
a sonda própria (`partial-registry-probe.mjs`, fora da cópia, caminho do produto por argumento)
usa só dados sintéticos e imprime códigos, ações e estados. Resultados **iguais nas duas
plataformas** (`red-partial-probe-{windows,wsl}-7083702.json`):

| Cenário (depois de instalar, editar só `kwargs.json` e remover → 4, registro só `kwargs.json`) | `7083702` | `6f1740d` |
| --- | --- | --- |
| A — o do Verifier: `__init__.py` novo do usuário + `__pycache__/__init__.cpython-311.pyc`; prévia, aplicação e repetição | prévia **e** aplicação `4 conflict` com `remove_cache` 1; **bytecode de 41 bytes apagado apesar do 4**; fonte, `kwargs.json` editado e registro intactos; terceira `4` sem mudança | as três `4 conflict changes=[]`, `owned_entry_modified:…/kwargs.json` + `foreign_files_preserved:plugins/skill-me-observer`; `remove_cache` 0 na prévia e na aplicação; bytecode intacto (41 bytes), fonte, `kwargs.json` e registro intactos |
| B — `kwargs.json` restaurado aos bytes instalados, fonte e bytecode do usuário | prévia `0 planned`, aplicação **`0 applied`**: bytecode apagado, fonte alheia deixada sem aviso | `4 conflict`: sai só `kwargs.json` e o registro; fonte e bytecode intactos; repetição `4 owned_entry_unrecorded` |
| C — só bytecode novo, sem fonte | `4`, bytecode apagado | `4`, intacto |
| D — reinstalar sobre a sobra de B (fonte do usuário, `plugin.yaml` ausente); depois o usuário tira a fonte da pasta | `install --apply` **`0 applied`** registrando os três artefatos; remoção seguinte `0 applied` apaga o bytecode do usuário como "órfão da nossa fonte" | `install` e `install --apply` `4 foreign_artifact`, nada registrado; remoção `4`, bytecode intacto |
| E — corrida: logo após a exclusão do nosso `__init__.py`, fonte e bytecode do usuário aparecem | `0 applied`, bytecode do usuário apagado | `4 config_changed_during_apply:…/__init__.py`, bytecode intacto, registro mantido |
| E2 — idem com a fonte registrada já ausente (órfão), após a exclusão de `kwargs.json` | `0 applied`, apagado | `4`, intacto |
| Controles: remoção normal com bytecode próprio; fonte registrada já ausente (órfão) | `0 applied`, `remove_cache` 1, pasta removida | iguais |

Nota do coordenador (`cache-dir-probe.mjs`, `observation-cache-dir-windows-{7083702,c066a5f}.json`,
`observation-cache-dir-windows-fix.json`), confirmada em `7083702` **e** em `c066a5f`: P1 (sobra de
B com `__pycache__` vazio em vez do bytecode) e P2 (fonte registrada editada, preservada, com
`__pycache__` vazio) apagavam o diretório do usuário; P3 (só `__pycache__` vazio, `kwargs.json`
restaurado) apagava o diretório e a pasta inteira com `0 applied`; P4 (só `__pycache__` vazio,
`kwargs.json` editado) não escrevia, mas não reportava o diretório. Em `6f1740d` os quatro mantêm o
diretório (P3/P4 com `foreign_files_preserved`, 4); controles com `__pycache__` vazio ou com
bytecode ao lado da nossa fonte continuam `0 applied` com a pasta removida.

### Correção (`run.mjs`)

- **Remoção:** o bytecode e o `__pycache__` só saem com a fonte comprovada pelo registro —
  `__init__.py` registrado e removido agora como nosso, ou registrado e já ausente (órfão da nossa
  fonte). Preservado ou fora do registro, ficam. Arquivo com nome de artefato fora do registro e
  `__pycache__` real sem fonte registrada são alheios → `foreign_files_preserved` (4). O plano
  decide `removeCacheDir`; o estado passou a dizer só que o diretório é real (`cacheDirReal`,
  antes `cacheDirOwned`, nome que afirmava a propriedade que a decisão não tinha).
- **Reinstalação sobre registro parcial:** artefato fora do registro só volta a ele com o conteúdo
  exato do pacote (`adopt_artifact`, como a adoção sem registro); ausente ou diferente →
  `foreign_artifact` em `plugins/skill-me-observer`, nada registrado.
- **Reconferência na aplicação:** imediatamente antes de cada exclusão de bytecode e do `rmdir` do
  `__pycache__`, depois das reconferências de diretório real existentes, a fonte precisa continuar
  ausente; presente → `config_changed_during_apply` em `…/__init__.py`, nada além do já conferido é
  apagado e o registro não é reescrito.

### Regressões e RED/GREEN dos testes

- **`I4-C34f`** (CLI, `install.cli.test.mjs`), transição real produzida pela própria remoção
  parcial (helper `partialHermesRegistry` afirma a primeira remoção exata e o registro só com
  `kwargs.json`), tabela única `observed`/`expected`: fonte de outra origem, cópia exata do pacote
  e sem fonte, cada uma com bytecode, em prévia/aplicação/repetição (`4 … changes=[]`, bytecode
  intacto, alvo inteiro igual com mtime); `kwargs.json` restaurado com fonte e bytecode (saídas
  exatas e pasta final só com os arquivos do usuário); `__pycache__` vazio com e sem fonte; fonte
  registrada editada com `__pycache__` vazio em duas remoções; reinstalação sobre a sobra e remoção
  depois de tirar a fonte. Controles: reinstalação com cópias exatas adota e remove de volta à
  árvore anterior; registro parcial que ainda guarda a fonte (fonte restaurada + bytecode próprio
  → `0 applied` com `remove_cache`); `__pycache__` vazio ao lado da nossa fonte; fonte registrada
  já ausente com bytecode órfão (`0 applied`, `remove_cache`). Nenhum registro montado à mão.
- **`I4-C34g`** (`install-apply.unit.test.mjs`, io instrumentado): fonte (e bytecode) do usuário
  postos logo após a exclusão do nosso `__init__.py`, ou após a de `kwargs.json` com a fonte
  registrada já ausente, e só a fonte com `__pycache__` próprio vazio → `4`
  `config_changed_during_apply:plugins/skill-me-observer/__init__.py`, fonte e bytecode (ou
  diretório vazio) do usuário intactos, registro byte a byte igual, lock liberado.
- **RED:** versão inicial dos dois testes sobre `7083702` — Windows e WSL `2 tests, 0 pass, 2 fail`
  (`red-partial-tests-{windows,wsl}-7083702.tap`; bytecode `apagado`, `remove_cache` listado,
  `0 applied`). Versão final sobre `7083702` (Windows e WSL) e sobre `c066a5f` (Windows): `2 fail`
  (`red-partial-tests2-*`); em `c066a5f` divergem só as linhas do `__pycache__` vazio de `I4-C34f`
  e a variante do `__pycache__` próprio vazio de `I4-C34g`. Nas cópias RED só os dois arquivos de
  teste foram sobrepostos; produto conferido pelo blob.
- **GREEN:** `2 pass` no worktree (`green-partial-tests-windows.tap`) e nos batches abaixo. Sonda no
  produto corrigido: `green-partial-probe-{windows,wsl}-6f1740d.json`, iguais entre si.

### Discriminação (mutações só em cópias WSL do `/tmp`)

| Mutação | O que desfaz | Falha | Passam |
| --- | --- | --- | --- |
| a | cache volta à regra anterior (só fonte registrada preservada barra) | `I4-C34f` (com fonte presente a reconferência ainda barra com 4; **sem fonte o bytecode é apagado**) | as outras 20 do instalador |
| b | arquivo fora do registro e `__pycache__` sem fonte registrada não são reportados | `I4-C34f` (sobra de B volta a `0 applied`) | 20 |
| c | reinstalação sobre registro parcial sem conferir os artefatos fora dele | `I4-C34f` (registra os três; bytecode apagado depois) | 20 |
| d | sem reconferir a fonte antes de apagar o bytecode | `I4-C34g` | 20 |
| e | `__pycache__` real sai sem a decisão de propriedade | `I4-C34f`, `I4-C34e` | 19 |
| f | sem reconferir a fonte antes do `rmdir` do `__pycache__` | `I4-C34g` | 20 |
| g | `__pycache__` vazio sem fonte registrada não é reportado | `I4-C34f` | 20 |

a–d rodaram sobre o código de `c066a5f` (`mutation-partial-{a,b,c,d}-wsl.tap`) e a–g sobre
`6f1740d` (`mutation-partial2-{a..g}-wsl.tap`), com `install.cli` + `install-apply.unit` (21
testes, nenhum skip; as cópias de a–d foram tiradas do worktree com `run.mjs` e testes iguais aos
de `c066a5f`).

### Mudanças colaterais de comportamento, provadas

- Remoção com registro parcial e fonte/bytecode/`__pycache__` do usuário: antes `4` ou `0` com
  exclusão; agora `4` sem exclusão (`I4-C34f`).
- Arquivo com nome de artefato fora do registro deixado na pasta: antes silencioso (podia sair
  `0`); agora `4 foreign_files_preserved` (`I4-C34f`, sobra de B).
- Reinstalação sobre registro parcial: antes `0 applied` registrando os três; agora `4
  foreign_artifact`, ou `0 applied` com `adopt_artifact` explícito quando os artefatos fora do
  registro são cópias exatas (`I4-C34f`, controle).
- Fonte posta durante a remoção antes da exclusão do bytecode ou do `__pycache__`: antes `0` com
  exclusão; agora `4 config_changed_during_apply` (`I4-C34g`).

**Correção aditiva de afirmações anteriores (o texto acima fica como histórico).** Em "Achados
novos — artefato trocado por link de arquivo e bytecode de fonte preservada (`6df4d4c`)": "sem ele
(já ausente) ou com ele removido como nosso, o cache próprio sai como antes"; em "Limites e
resíduos" da mesma rodada: "Bytecode de nome próprio com o `__init__.py` já ausente continua saindo
como cache órfão da nossa fonte". Ambas valiam só enquanto o registro guardava o `__init__.py`:
depois de uma remoção com conflito, a ausência da fonte não comprovava propriedade e o bytecode (e
o `__pycache__`) do usuário eram apagados (RED C, D, P3). A regra vigente é a desta seção.

### Contagens reais em `6f1740d`

Um batch por plataforma: `node --test --test-reporter=tap "tests/integrations/**/*.test.mjs"
scripts/governance-ci.test.mjs`. Windows: worktree com `git diff --quiet 6f1740d -- src tests docs
scripts package.json`, Hermes nativo pelo helper (`python -I -B`, HERMES_HOME e HOME/APPDATA/TEMP
temporários, sem modelo). WSL: Ubuntu, Node 24.13.0, `git archive 6f1740d` (SHA-256 do archive
`c8187168…afa64a2d8`) no ext4 (`/tmp/skillme-round4-batch-6f1740d`), 139 arquivos de `src`,
`tests`, `scripts`, `docs` e `package.json` iguais aos blobs (CRLF normalizado), `env -i` só com
`PATH`; exit do próprio `wsl.exe`. Nenhum spawn lendo o checkout por `/mnt/c`.

| Execução | tests | pass | fail | cancelled | skipped | todo | exit | duração |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Windows 11, Node 24.21.0 — integrações 64 + governança 6 | 70 | 68 | 0 | 0 | 2 | 0 | 0 | 23 s |
| WSL — integrações 64 + governança 6 | 70 | 62 | 0 | 0 | 8 | 0 | 0 | 15 s |

Cruzamento das 54 linhas `Proof:` com os TAPs (`proofs-vs-batch-{windows,wsl}-6f1740d.txt`; cada
padrão casou exatamente um teste executado): Windows 53 PASS + `I4-C15` SKIP; WSL 46 PASS + 8 SKIP.
Extras fora das linhas `Proof:` (16, todos executados): 5 de governança, `I4-C16c`, `I4-C25b`,
`I4-C25c`, `I4-C26b`, `I4-C32b`, `I4-C34b`, `I4-C34c`, `I4-C34d`, `I4-C34e` e os novos `I4-C34f`,
`I4-C34g` (+2 em relação aos 68 de `6df4d4c`/`7083702`). Skips e motivos:

- Windows (2): `I4-C15` `posix-signals` e `I4-C25b` `posix-modes` (passam no WSL). Subcasos de link
  de arquivo por `t.diagnostic` (EPERM sem privilégio): 2 em `I4-C27`, 1 em `I4-C34`, 4 em
  `I4-C34b`, 1 em `I4-C34c`, 1 em `I4-C34e` — executados no WSL, sem diagnóstico. Os novos testes
  não usam link de arquivo.
- WSL (8): `I4-C18..C23`, `I4-C37`, `I4-C44b` `hermes-runtime-ausente`: prova nativa do Hermes só no
  Windows (executada nesse batch); Linux **pendente**. `I4-C35` registrou a observação Hermes pendente.
- Medição C38: Windows 831 ms depois do filho, 65536 bytes no pipe; WSL 808 ms, 146176 bytes.
- Doctor (417) e motor de revisão (16) não reexecutados: nenhum arquivo deles, dos módulos do
  doctor reutilizados, de `scripts/code-review`, `code-review.config.json`, `package.json`/lock ou
  `AGENTS.md` mudou desde `9184d65`.

### Limites e resíduos

- Janela não atômica entre cada reconferência e o `unlink`/`rmdir`, como na escrita da
  configuração: estreita, não elimina, a corrida com quem põe uma fonte ou troca diretórios.
- Bytecode da nossa fonte que o Hermes grave depois da leitura feita por uma remoção não está no
  plano e fica; sem a fonte no registro, as remoções seguintes não o tomam por nosso (limpeza
  manual, declarada no guia). Conservador: nenhuma exclusão sem prova.
- A ligação bytecode→fonte vem do registro e do nome; o cabeçalho do `.pyc` (mtime/tamanho da
  fonte) não é lido — não comprovaria origem e não é necessário para a decisão.
- Identidade por caminho, tipo e hash, como antes; ponto de montagem/bind mount não distinguido.
- Hermes nativo só no Windows; Linux pendente; macOS só pela CI; E2E real dos três agentes pendente.

### Sobras próprias desta rodada (preservadas; nenhuma exclusão por shell)

Nenhum `rm` nem equivalente foi emitido. Windows `%TEMP%\skill-me-round4\`: `probes/`
(`partial-registry-probe.mjs`, `cache-dir-probe.mjs`, `partial-mutants.mjs` — versão final; a
inicial, usada em a–d sobre `c066a5f`, foi substituída pela própria sonda —, `wsl-copy.sh`,
`wsl-run.sh`, `hash-files.sh`, listas de hashes, dois TAPs das suítes do instalador e a observação
do cache vazio no worktree), `head-7083702/` e `head-7083702.tar`, `head-6f1740d.tar`,
`redtests-7083702/`, `redtests2-7083702/`, `redtests2-c066a5f/`; e 34 alvos sintéticos
`%TEMP%\skill-me round4 <cenário> probe-*` das sondas (A–F, P1–P4, controles). WSL `/tmp`:
`skillme-round4-{probes,red-7083702,redtests-7083702,batch-6f1740d}`, `skillme-round4-mut-{a,b,c,d}`,
`skillme-round4-mut2-{a..g}` e 16 alvos `/tmp/skill-me round4 <cenário> probe-*`. Scratches dos
testes: removidos pelo `after()` existente do `node:test` (só diretórios de `makeScratch`, caminho
absoluto sob o TEMP; os novos testes não criam links). Scratch do Verifier
(`verify-issue4-7083702`), sobras das rodadas anteriores, backups da queda e histórico formal não
foram tocados.

Saídas brutas (locais, ignoradas) em `.checks/code-review/issue-4/`:
`red-partial-probe-{windows,wsl}-7083702.json`, `red-partial-tests-{windows,wsl}-7083702.tap`,
`red-partial-tests2-{windows-7083702,windows-c066a5f,wsl-7083702}.tap`,
`observation-cache-dir-windows-{7083702,c066a5f,fix}.json`, `green-partial-tests-windows.tap`,
`green-partial-probe-{windows,wsl}-6f1740d.json`, `mutation-partial-{a,b,c,d}-wsl.tap`,
`mutation-partial2-{a,b,c,d,e,f,g}-wsl.tap`, `batch-{windows,wsl}-6f1740d.tap`,
`proofs-vs-batch-{windows,wsl}-6f1740d.txt`.

### Privacidade e ambiente

Nenhum `process.env`, token, credencial ou valor de ambiente impresso; nenhuma sonda de ambiente
repetida. Testes e sondas usam ambiente mínimo e conteúdo sintético; as sondas imprimiram só
códigos, ações, conflitos, estados e caminhos de temporários próprios. Nenhuma instalação em perfil
pessoal; todos os `--target` em temporários; nenhum agente, modelo, download ou E2E; nenhum
bypass/confiança concedido; nenhum subagente.

## Correção da revisão formal round 2 — preservação JSON e temporários (17/10/2026)

Builder: Claude (tlc-implement `light`), mesma entrega. Partida em `f0f5322` (só achados no Handoff;
produto e testes = `7147ac0`), checkout limpo. Esta seção é evidência do autor, **não é verificação
independente** nem revisão formal: nenhum `review:run`/`review:check`/`pr:create`/push/PR/merge/
Verifier foi executado; `.verified.md`, contadores, estado do motor (2 de 10 tentativas formais) e
histórico não foram tocados. Commits: `56e688d` (Landing F2), `264e4df` (F1), `0481b28` (F2),
`de4f9d6` (Landing da nova tentativa do rename), `c914e5d` (C29 no Windows), `f1de786` (Landing do
limite da contenção, levando também a nota do coordenador no Handoff), `01c78bd` (limite). `git diff --name-only f0f5322..01c78bd`: só
`src/integrations/install/{json-hooks,run,target}.mjs`, `tests/integrations/{install.cli,
install-apply.unit}.test.mjs`, `tests/integrations/helpers/{cli,fs-probe}.mjs`,
`docs/agent-observation.md` e este checklist (três linhas de Landing e a nota do coordenador);
nada em doctor, `scripts/`, configuração do motor, dependências, `AGENTS.md`, task ou `.verified.md`.

**Classificação.** F1 e F2 são os achados formais bloqueantes (AC6). Durante a separação dos commits
apareceu um terceiro defeito, anterior a esta rodada e dentro do AC6: `I4-C29` saía 5 no Windows
(contrato "cada código ∈ {0,4}"), sem perda — configuração intacta, `incomplete` honesto. Foi
comunicado na hora e corrigido como defeito já coberto por C29, com Landing antes do código. A nota
do coordenador acrescentada ao Handoff durante essa correção (laço sem limite em `assertContained`)
foi confirmada e corrigida em `01c78bd`; a nota fica preservada e é encerrada no Handoff.

### Reprodução RED no produto `7147ac0` (cópias isoladas próprias)

Cópia Windows por `git archive 7147ac0` (SHA-256 do archive `aa89f585…7d973d196`) + `node_modules`,
blobs de `run.mjs`, `json-hooks.mjs`, `io.mjs` e dos testes conferidos por `git hash-object`; cópia
WSL do mesmo archive no ext4 (`/tmp/skillme-formal3-red-7147ac0`), SHA-256 dos módulos do instalador
iguais aos da cópia Windows. Sondas próprias fora das cópias, produto por argumento, só dados
sintéticos, imprimindo códigos e estados (`f1-proto-probe.mjs`, `f2-temp-probe.mjs`). Saídas
**iguais nas duas plataformas** (`formal2-red-f{1,2}-probe-{windows,wsl}-7147ac0.json`); GREEN em
`01c78bd` também igual entre plataformas (`formal2-green-f{1,2}-probe-*-01c78bd.json`).

| F1 — `__proto__` em texto JSON | `7147ac0` | `01c78bd` |
| --- | --- | --- |
| Claude, `env` (cenário formal) + grupo de terceiro com `__proto__` objeto | install `0 applied`, `env.__proto__` e o do grupo **perdidos**; remoção `0`, perdidos | as duas chaves próprias mantidas na instalação e na remoção |
| Claude, objeto `__proto__` na raiz com chave `hooks`, sem `hooks` próprio | install `0 applied` gravando o arquivo **sem nenhum grupo próprio e sem o objeto** (os grupos foram para o protótipo da cópia) | 8 grupos próprios num `hooks` próprio; objeto mantido; remoção devolve o original |
| Claude, `env.__proto__` acrescentado depois da instalação | remoção `0`, chave perdida | mantida |
| Codex, `__proto__` no grupo e no handler de terceiro | perdidos na instalação e na remoção | mantidos |

| F2 — temporário de nome fixo | `7147ac0` | `01c78bd` |
| --- | --- | --- |
| A — remoção Claude com arquivo do usuário em `settings.json.skill-me-tmp` (cenário formal) | prévia `0 planned`; aplicação **`0 applied`, arquivo apagado** | prévia e aplicação `4 conflict`, `changes=0`, `foreign_artifact:settings.json.skill-me-tmp`; arquivo intacto, configuração inalterada |
| B–F — instalação Claude (configuração e registro), instalação e remoção Codex (configuração), instalação Hermes (registro) | `0 applied`, arquivo **apagado** | as mesmas `4 … foreign_artifact:<temporário>`, intacto |
| G/H — remoção parcial (grupo/artefato editado) com o temporário do registro ocupado | `4`, mas arquivo **apagado** e registro reescrito | `4`, `owned_entry_modified` + `foreign_artifact`, nada escrito |
| I — diretório no temporário do registro (setup antigo de `I4-C33`) | prévia `0`; aplicação `5 incomplete` **depois de escrever a configuração** | `4` na prévia e na aplicação, sem mutação |
| J — junção no temporário da configuração | prévia `0`; aplicação `5` (`tmp_path_occupied`) | `4`, link mantido |
| K — temporário editado depois da criação, antes do rename (instrumentado) | `0 applied`: **conteúdo do usuário promovido a `settings.json`** | `4 config_changed_during_apply:settings.json.skill-me-tmp`, arquivo do usuário intacto, configuração inalterada |
| L/M — temporário editado + edição externa; trocado + `rename` com EIO | catch **apaga o arquivo do usuário** (4 / 5) | catch o preserva (4 / 5) |

### Correções

- **F1 (`json-hooks.mjs`):** `cloneDoc` define cada chave como propriedade própria
  (`Object.fromEntries`, como o `JSON.parse`); `JSON.rawJSON` segue por referência. Nenhuma outra
  cópia foi tocada; doctor e política geral fora do recorte.
- **F2 (`run.mjs`, linha de Landing de `56e688d`):** sem `clearStaleTemp`. O estado lê se cada
  temporário (configuração, registro; Hermes só o registro) tem alguma entrada, sem seguir link; o
  plano recusa inteiro (4 `foreign_artifact`, `changes: []`, nenhum passo de escrita) quando um
  temporário de que precisa está ocupado — `delete_file`/`delete_manifest` não precisam e seguem.
  `writeViaTemp` reúne a escrita da configuração e do registro: `EEXIST` na criação → o mesmo
  conflito; antes do rename o temporário precisa ser o arquivo regular com os bytes gravados
  (`holdsExactly`, a conferência que o staging Hermes já usava) → senão 4
  `config_changed_during_apply` no temporário; o catch só apaga o temporário que continua nosso.
- **C29 (`run.mjs` e `target.mjs`, linhas de Landing de `de4f9d6` e `f1de786`):** `EPERM`/`EACCES`/
  `EBUSY` no rename → até 6 novas tentativas (10…320 ms, ≤ 630 ms), refazendo antes de cada uma a
  conferência do temporário e a do chamador (SHA-256 e acesso); `assertContained` sonda de novo uma
  entrada que sumiu entre `lstat` e `realpath`, no máximo 3 vezes, depois 4
  `config_changed_during_read`.

### Causa e medição do C29 no Windows

Diagnóstico numa cópia descartável com syscall/caminho no código do erro: `rename(settings.json.
skill-me-tmp → settings.json)` negado com `EPERM` enquanto outro processo mantém `settings.json`
aberto (as prévias dos outros 5 processos; no uso real, também o agente, um editor ou antivírus) e,
mais raro, `ENOENT` no `realpath` de `assertContained`, fora do lock, quando o temporário de outro
processo era renomeado entre o `lstat` e o `realpath`. Execuções isoladas de `I4-C29`, mesma máquina:

| Produto | Windows | WSL |
| --- | --- | --- |
| `7147ac0` | 2/25 e **10/100** saem 5 (7 `EPERM`, 3 `ENOENT`) | — |
| `0481b28` (F1+F2) | 3/25 e 3/40 (+5/40 na cópia de diagnóstico) | 0/60 |
| protótipo só com a nova tentativa (cópia descartável) | 3/60, só `ENOENT` da contenção; 5 renames passaram na 1ª nova tentativa | — |
| protótipo com as duas correções (cópia descartável) | 0/100; 12 renames passaram na 1ª nova tentativa (10 ms) | — |
| `c914e5d` | 0/100 | 0/40 |
| `01c78bd` | **0/100** | **0/40** |

Amostras nos ambientes declarados, não garantia contra carga arbitrária; a prova discriminante é
`I4-C29b`/`I4-C29c`. Um passe anterior do protótipo, com erro no próprio registro de diagnóstico, foi
descartado. A falha do C29 com o `run.mjs` antigo também apareceu na conferência do
commit 1 (`formal2-commit1-check-windows.tap`): instabilidade anterior, não efeito do F1.

### Regressões e RED/GREEN dos testes

- **`I4-C25d`** (CLI, Claude e Codex): tabela `observed`/`expected` com textos JSON (nenhum literal
  JS com `__proto__`) — `env`, grupo e handler de terceiro, objeto na raiz com `hooks`, chaves
  acrescentadas depois da instalação por definição própria; confere propriedade própria, valor,
  protótipo intacto, forma serializada (`"__proto__": "valor-do-usuario"`), demais valores, tokens
  `12345678901234567890`/`1.50`, um grupo próprio por evento e a remoção de volta aos valores.
- **`I4-C25e`** (planos puros, sem sistema de arquivos): os textos planejados de instalação e
  remoção mantêm as chaves próprias e põem os grupos num `hooks` próprio.
- **`I4-C30b`** (CLI): 12 casos — os três agentes, install/uninstall, temporários de configuração e
  registro, arquivo do usuário, diretório, junção/symlink de diretório e link de arquivo (Windows sem
  privilégio: diagnóstico, executado no WSL); prévia e aplicação iguais (`4`, `changes: []`,
  conflitos exatos), árvore inteira igual com mtime, ocupante intacto. Controle: remoção que só
  apaga arquivo e registro não precisa do temporário e conclui deixando o arquivo do usuário.
  Depois que o usuário move o arquivo, remoção (cenário formal) e instalação (setup antigo) concluem.
- **`I4-C30c`** (io instrumentado): temporário posto antes da criação, editado ou trocado depois,
  trocado com rename falhando e controle com rename falhando — configuração Claude, registro Claude,
  configuração Codex (remoção), registro Hermes; 20 linhas com código, conflitos, passos, ocupante,
  estado e lock.
- **`I4-C29b`**: `EPERM` 2×, `EACCES`, `EBUSY`, registro, temporário trocado e configuração editada
  durante a espera, sempre negado (7 tentativas → 5) e `EIO` sem repetição. **`I4-C29c`**: entrada
  que some uma vez (configuração e registro) → `0 applied`; instável em sondagens sucessivas → 4
  `config_changed_during_read` com 4 chamadas de `realpath` e nada escrito.
- **RED:** testes F1/F2 (versão de `0481b28`, conferida por hash nas duas cópias) sobre o produto
  `7147ac0` — Windows `25 tests, 21 pass, 4 fail`, WSL `26, 22, 4` (`I4-C25d`, `I4-C25e`, `I4-C30b`,
  `I4-C30c`); `I4-C25b` (com o `fs-probe` alterado) e o `I4-C33` novo passam no produto antigo.
  `I4-C29b`/`I4-C29c` (versão de `c914e5d`) sobre `0481b28`: `2 fail` nas duas plataformas.
  Linhas instáveis de `I4-C29c` sobre `c914e5d`: falha nas duas, 1001 chamadas de `realpath` (o
  instrumento para de oscilar em 1000) e `0 applied`.
- **GREEN:** suítes do instalador no worktree depois de cada correção (no fim: Windows 28 testes,
  27 pass, 1 skip `posix-modes`; WSL 28/28) e os lotes abaixo.

**`I4-C33` — setup trocado, contrato e asserções mantidos.** O diretório no temporário do registro
agora é recusado antes da primeira mutação (linha I acima), então não produz mais uma falha
posterior a ela: o `I4-C33` antigo (blob de `7147ac0`) contra o produto corrigido falha com
`4 !== 5` (`formal2-oldc33-on-fixed-product-windows.tap`). A falha passou a ser E/S real injetada no
processo do CLI: `fs-probe.mjs` ganhou `SKILL_ME_TEST_FS_PROBE_FAIL_RENAME_TO=<nome>` (rename para
esse nome → `EIO`), carregado por `--import` (novo `nodeArgs` em `helpers/cli.mjs`). As asserções
anteriores ficaram (5, `incomplete`, passos `config:done`/`manifest:failed`, 8 grupos escritos,
reinstalação adotando 8, remoção de volta ao original); acrescentou-se que o registro não foi gravado
e que o temporário nosso saiu. A barra de C33 não mudou; o setup antigo virou caso de `I4-C30b`.

### Discriminação (mutações só em cópias WSL do `/tmp`, sobre `01c78bd`)

Cada mutação roda `install.cli` + `install-apply.unit` (27 testes); falham só os listados:

| Mutação | Falha |
| --- | --- |
| m1 cópia por atribuição (F1 desfeito) | `I4-C25d`, `I4-C25e` |
| m2 temporário ocupado não recusa o plano · m3 recusa mantém as mudanças · m4 temporário da configuração exigido com `delete_file` · m13 ocupação do registro não lida (Claude/Codex) · m14 idem (Hermes) | `I4-C30b` |
| m5 `EEXIST` vira falha de E/S | `I4-C30c` |
| m6 temporário não conferido antes do rename · m7 catch sem conferir · m10 nova tentativa para qualquer código | `I4-C30c`, `I4-C29b` |
| m8 sem nova tentativa · m9 nova tentativa sem refazer as conferências | `I4-C29b` |
| m11 sondagem sem limite · m12 entrada que sumiu vira falha de E/S | `I4-C29c` |

(`formal2-mutations-wsl-01c78bd*.json`; o primeiro passe não achou os trechos de várias linhas por
CRLF do `git archive` e foi repetido com o fim de linha do arquivo.)

### Mudanças colaterais de comportamento, provadas

- Temporário necessário já ocupado (qualquer tipo, inclusive sobra de execução interrompida): antes
  apagado com `0`/`4`, ou `5`; agora `4 foreign_artifact` na prévia e na aplicação, remoção manual
  (`I4-C30b`, guia).
- Diretório no temporário do registro: antes `5` depois de escrever a configuração; agora `4` sem
  mutação (`I4-C30b`).
- Temporário editado/trocado durante a aplicação: antes promovido (`0`) ou apagado; agora `4`
  preservado (`I4-C30c`). `EEXIST` na criação: antes `5`, agora `4 foreign_artifact`.
- Rename negado de forma transitória: antes `5`; agora repetido (≤ 630 ms). Entrada que some na
  contenção: antes `5` (`ENOENT`); agora nova sondagem, e oscilando, `4` (`I4-C29b`/`I4-C29c`).
- Chaves `__proto__`: antes perdidas com `0`; agora mantidas (`I4-C25d`/`I4-C25e`).

**Correção aditiva de afirmação anterior (o texto fica como histórico).** A mensagem de `c914e5d`
("A contenção sonda de novo a entrada que sumiu") descrevia uma repetição sem limite; vale a regra
limitada de `01c78bd`.

### Contagens reais em `01c78bd`

Um batch por plataforma: `node --test --test-reporter=tap "tests/integrations/**/*.test.mjs"
scripts/governance-ci.test.mjs scripts/code-review/review.test.mjs`. Windows: worktree com
`git diff --quiet 01c78bd -- src tests docs scripts package.json`, Hermes nativo pelo helper
(`python -I -B`, HERMES_HOME e HOME/APPDATA/TEMP temporários, sem modelo). WSL: Ubuntu, Node 24.13.0,
`git archive 01c78bd` (SHA-256 `e83e3937…4e81bb811f`) no ext4 (`/tmp/skillme-formal3-batch-01c78bd`),
139 arquivos de `src`, `tests`, `scripts`, `docs` e `package.json` iguais aos blobs (CRLF
normalizado), `env -i` só com `PATH`; exit do próprio `wsl.exe`. Nenhum spawn lendo por `/mnt/c`.

| Execução | tests | pass | fail | cancelled | skipped | todo | exit | duração |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Windows 11, Node 24.21.0 — integrações 70 + governança 6 + motor 16 | 92 | 90 | 0 | 0 | 2 | 0 | 0 | 35 s |
| WSL — integrações 70 + governança 6 + motor 16 | 92 | 84 | 0 | 0 | 8 | 0 | 0 | 18 s |

Cruzamento das 54 linhas `Proof:` com os TAPs (`formal2-proofs-vs-batch-{windows,wsl}-01c78bd.txt`;
cada padrão casou exatamente um teste executado, declarado no arquivo da prova — o TAP do lote não
traz localização): Windows 53 PASS + `I4-C15` SKIP; WSL 46 PASS + 8 SKIP. Fora das linhas `Proof:`
(38, todos executados): 16 do motor, 5 de governança e 17 de integração — `I4-C16c`, `I4-C25b`,
`I4-C25c`, `I4-C26b`, `I4-C32b`, `I4-C34b`, `I4-C34c`, `I4-C34d`, `I4-C34e`, `I4-C34f`, `I4-C34g` e
os novos `I4-C25d`, `I4-C25e`, `I4-C29b`, `I4-C29c`, `I4-C30b`, `I4-C30c` (+6 em relação aos 86 de
`2830d7f`/`7147ac0`). Skips e motivos:

- Windows (2): `I4-C15` `posix-signals` e `I4-C25b` `posix-modes` (passam no WSL). Subcasos de link
  de arquivo por `t.diagnostic` (EPERM sem privilégio): 2 em `I4-C27`, 1 em `I4-C34`, 4 em
  `I4-C34b`, 1 em `I4-C34c`, 1 em `I4-C34e` e 1 novo em `I4-C30b` — executados no WSL, sem
  diagnóstico. Nenhum diagnóstico de grupo suplementar ausente em `I4-C25b` no WSL.
- WSL (8): `I4-C18..C23`, `I4-C37`, `I4-C44b` `hermes-runtime-ausente`: prova nativa do Hermes só no
  Windows (executada nesse batch, 8 PASS); Linux **pendente**. `I4-C35` registrou a observação
  Hermes pendente.
- Medição C38: Windows 826 ms depois do filho, 65536 bytes no pipe; WSL 808 ms, 146176 bytes.
- Doctor (417) não reexecutado: nenhum arquivo do doctor, dos módulos reutilizados, de `scripts/`,
  `code-review.config.json`, `package.json`/lock ou `AGENTS.md` mudou desde `f0f5322` (`I4-C45`, no
  lote, confere a interface do doctor com as integrações instaladas).

### Examinado e não alterado (limites e resíduos)

- Operações depois da criação exclusiva fora dos temporários: o lock (`.skill-me/<agente>.lock`) e
  o registro (`deleteManifest`) são apagados sem conferir o conteúdo. Os dois ficam no diretório de
  estado próprio, o lock preexistente nunca é apagado (`lock_present`) e a troca exigiria escrever
  ali dentro da janela da aplicação; não alterados (sem necessidade demonstrada), comunicados.
- Hermes: um artefato trocado no staging antes do rename da pasta seria promovido, mas o registro
  guarda o hash do pacote e a remoção o preserva como `owned_entry_modified`; sem perda, não alterado.
- Remoções concorrentes: o `removeDirIfEmpty(.skill-me)` de um processo pode fazer o lock de outro
  falhar com `ENOENT` (5, nada mudado) — visto como cascata no C29 antes da correção; não testado
  nem alterado.
- Temporário parcialmente escrito por falha de E/S durante a escrita fica e passa a ser reportado
  como `foreign_artifact` na execução seguinte (remoção manual), como a sobra de uma interrupção.
- Identidade por caminho, tipo, tamanho e hash: um arquivo posto no lugar com bytes idênticos não é
  distinguível (declarado no guia). Janela não atômica entre cada conferência e o `rename`/`unlink`.
- Hermes nativo só no Windows; Linux pendente; macOS só pela CI; E2E real dos três agentes pendente.

### Sobras próprias desta rodada (preservadas; nenhuma exclusão por shell)

Nenhum `rm` de diretório nem limpeza opaca foi emitido. Windows `%TEMP%\skill-me-formal3\`:
`probes/` (`f1-proto-probe.mjs`, `f2-temp-probe.mjs`, `split-f1.mjs`, `c29-diag-patch.mjs`,
`c29-loop.sh`, `mutants.mjs`, `proofs-vs-batch.mjs`, `wsl-copy.sh`, `wsl-run.sh`, `hash-files.sh`),
`head-{7147ac0,c914e5d,01c78bd}/` e os `.tar` de `7147ac0`, `56e688d`, `0481b28`, `c914e5d`,
`01c78bd`, `redtests-7147ac0/`, `oldc33-newproduct/`, `commit1-check/`, `c29-diag/`, `split/`,
`wx sonda/`, `c29 alvo/`, os alvos sintéticos `f{1,2} alvos {red-7147ac0,green-c914e5d,
green-01c78bd} ação/` e TAPs/JSON/listas de hashes. WSL `/tmp`: `skillme-formal3-{probes,
red-7147ac0,redtests-7147ac0,wip,wip2,wip3,redretry-0481b28,redbound-c914e5d,green-c914e5d,
mutbase-01c78bd,batch-01c78bd}`, `skillme-formal3-mut-m1..m14` (em m3, m5, m6, m9, m11 e m12 o
segundo passe copiou a base para dentro do diretório do primeiro, que não tinha sido mutado — a
mutação foi aplicada e testada no nível de cima, como mostram as falhas esperadas), os alvos
`skillme-formal3-f{1,2} alvos … ação`, `skillme-formal3-wx sonda` e os `*.c29.tap`. Scratches dos
testes: removidos pelo `after()` existente (só diretórios de `makeScratch`, caminho absoluto sob o
TEMP; as junções criadas pelos testes apontam para dentro do próprio scratch e não são seguidas pelo
`rmSync`). Scratches de Verifiers, recovery e histórico formal não foram tocados.

Saídas brutas (locais, ignoradas) em `.checks/code-review/issue-4/formal2-*`: sondas RED/GREEN,
TAPs RED (`red-tests-*-7147ac0`, `red-c29bc-*-0481b28`, `red-c29c-unstable-*-c914e5d`),
`oldc33-on-fixed-product-windows.tap`, `commit1-check-windows.tap`, mutações, lotes e cruzamentos.

### Privacidade e ambiente

Nenhum `process.env`, token, credencial ou valor de ambiente impresso. Testes e sondas usam ambiente
mínimo e conteúdo sintético; as sondas imprimiram só códigos, ações, conflitos, estados e caminhos de
temporários próprios. Nenhuma instalação em perfil pessoal; todos os `--target` em temporários;
nenhum agente, modelo, download ou E2E; nenhum bypass/confiança concedido; nenhum subagente.
