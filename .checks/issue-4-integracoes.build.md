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

## Correção da verificação independente round 5 — registro, lock e pasta de estado (17/10/2026)

Builder: Claude (tlc-implement `light`), mesma entrega. Partida em `6083af8` (só o relatório
independente 5 e o Handoff; produto e testes = `a6c656b`), checkout limpo, HEAD do despacho
conferido. Esta seção é evidência do autor, **não é verificação independente** nem revisão formal:
nenhum `review:run`/`review:check`/`pr:create`/push/PR/merge/Verifier foi executado; `.verified.md`,
contadores, override, estado do motor (2 de 10 tentativas formais) e histórico não foram tocados; o
scratch do Verifier (`verify-issue4-a6c656b/`) foi só lido. Commits: `9cf73f1` (Landing), `81b9888`
(correção, provas e guia) e o desta evidência. `git diff --name-only 6083af8..81b9888`:
`.checks/issue-4-integracoes.md` (uma linha de Landing), `src/integrations/install/{run,target}.mjs`,
`tests/integrations/install-apply.unit.test.mjs` e `docs/agent-observation.md`; nada em doctor,
`scripts/`, configuração do motor, dependências, `AGENTS.md`, task, helpers de teste ou `.verified.md`.

**Classificação.** R5-F1/F2/F3 são os achados bloqueantes do Verifier (perda e quebra de isolamento,
AC6/C27/C30/C31), já comunicados ao proprietário pelo orquestrador. A sonda RED própria mostrou a
mesma raiz em operações que o Verifier não exercitou — registro posto por outro durante a primeira
instalação (sobrescrito, 0), lock trocado na instalação (apagado, 0), pasta trocada na instalação
(registro externo sobrescrito e lock externo apagado, 0), pasta trocada logo depois de criar o lock
(registro externo lido sob o lock, 3, e lock externo apagado), remoção Hermes (registro novo apagado,
0) e falha real ao apagar o lock (engolida: 0 com o lock bloqueando as execuções seguintes) —
corrigidas pela mesma mudança e comunicadas no retorno; nenhuma é escopo novo.

### Reprodução RED no produto `a6c656b` (cópias isoladas próprias)

Cópia Windows por `git archive a6c656b` (SHA-256 do archive `0fafbdbe…3fe035`) + `node_modules`, os 6
módulos do instalador iguais aos blobs (`git hash-object`); cópia WSL do mesmo archive no ext4
(`/tmp/skillme-r5-red-a6c656b`), 7 módulos iguais aos blobs com CRLF normalizado. Sonda própria fora
das cópias, produto por argumento, só dados sintéticos, imprimindo códigos, conflitos, passos e o
destino de cada arquivo sintético (`round5-probes/r5-metadata-probe.mjs`; mutação logo depois do passo
anterior real, como na sonda do Verifier). Saídas **iguais nas duas plataformas**
(`round5-red-probe-{windows,wsl}-a6c656b.json`); GREEN em `81b9888` também igual entre plataformas
(`round5-green-probe-{windows,wsl}-81b9888.json`).

| Variante | `a6c656b` | `81b9888` |
| --- | --- | --- |
| manifest-delete (Verifier): remoção, registro trocado por arquivo novo | `0 applied`, arquivo **apagado** | `4`, `config_changed_during_apply:.skill-me/claude-install.json`, arquivo intacto |
| manifest-replace (Verifier): remoção parcial | `4` só por `owned_entry_modified`, arquivo **sobrescrito** | `4` com os dois conflitos, intacto |
| manifest-delete no Codex | `0`, **apagado** | `4`, intacto |
| registro posto durante a primeira instalação | `0`, **sobrescrito** | `4`, intacto |
| lock-delete (Verifier): remoção, lock trocado | `0`, **apagado** | `4`, `config_changed_during_apply:.skill-me/claude.lock`, intacto, passos `done` |
| lock trocado na instalação | `0`, **apagado** | `4`, intacto |
| state-dir-link-delete (Verifier) | `0`, registro e lock externos **apagados**, link mantido | `4`, `target_escape:.skill-me` + conflito do lock, externos intactos, link mantido |
| state-dir-link-replace (Verifier) | `4` só pelo hook, registro externo **sobrescrito**, lock externo **apagado** | `4` com os três conflitos, externos intactos |
| pasta trocada na instalação | `0`, registro externo **sobrescrito**, lock externo **apagado** | `4`, externos intactos |
| pasta trocada logo depois de criar o lock | `3 manifest_invalid` (registro externo **lido**), lock externo **apagado** | `4`, nada lido através dela, externos intactos |
| Hermes, remoção, registro trocado | `0`, **apagado** | `4`, intacto |
| `unlink` do lock negado (`EACCES`) | `0 applied`, lock fica | `5 incomplete`, passo `lock: failed`, lock fica |
| Hermes staging alterado antes do rename da pasta (observação do Verifier) | instalação 0 promove o arquivo; remoção 4 o preserva | igual — não alterado; limite no guia |

### Correção (`run.mjs`, `target.mjs`; linha de Landing de `9cf73f1`)

- `assertContained` devolve o caminho real que já calculava (`target.mjs:61`); a decisão não muda.
- Pasta de estado (`run.mjs:160` `stateDirRealPath`, `:219` `withLock`): depois do `mkdir`, o caminho
  real de `.skill-me` (contido; diretório pelo `stat`, então junção/link já presente para dentro do
  alvo continua aceito) vira a referência. `stateDirUnchanged` exige o mesmo caminho real antes de ler
  o registro sob o lock (`beforeManifestRead` em `readJsonState`/`readHermesState`), antes de criar o
  temporário do registro, de cada tentativa de rename e da limpeza (`writeViaTemp`, opção nova
  `dirUnchanged`), antes de apagar o registro e de liberar o lock.
- Registro (`:342`–`:380`): `readManifestText` recusa com 4 `foreign_artifact` o que não é arquivo
  regular (prévia e aplicação); `assertManifestUnchanged` confere o texto lido sob o lock — ausente
  continua sem entrada; presente continua arquivo regular com os mesmos bytes — como `beforeRename` (cada
  tentativa) e antes do `unlink`; `ENOENT` no `unlink` logo depois da conferência também é conflito.
  `stillHolds` (`:149`) é o antigo `isOwnTemp` generalizado (`holdsExactly` + `ENOENT` → falso), agora
  usado pelo temporário, pelo registro e pelo lock — sem cópia da implementação.
- Lock (`:176` `releaseLock`, `:196` `withLockKept`): liberado só pela mesma pasta e com os bytes
  `<pid>\n` gravados pela execução; senão fica, e o conflito se soma sem esconder o resultado
  (conflito principal primeiro; 5 continua 5); E/S falha → passo `lock: failed` e 5. A pasta vazia só
  sai depois de liberado o lock.
- `replaceChecked`/`deleteChecked` da configuração ficaram como estavam (alternativa rejeitada no Landing).

### Regressões e RED/GREEN dos testes (`tests/integrations/install-apply.unit.test.mjs`)

Todos pela API pública `runIntegrationCommand` com io real instrumentado — a mutação acontece dentro do
próprio comando: depois do rename real da configuração ou da pasta do plugin, depois da última exclusão
de artefato, logo depois de criado o lock ou na primeira tentativa negada do rename —, dados sintéticos
e uma tabela `observed`/`expected` comparada por inteiro em cada teste:

- **`I4-C30d`** (asserção em `:904`) — 21 linhas: Claude instalação (posto arquivo, posto diretório,
  posto durante a nova tentativa), remoção (editado no lugar, trocado por arquivo, removido, diretório,
  junção/link de diretório, link de arquivo), remoção parcial (trocado; trocado durante a nova
  tentativa), Codex instalação/remoção, Hermes instalação/remoção/remoção parcial e 5 controles (nada
  muda; rename negado uma vez). Afirma código, `status`, `applied`, conflitos exatos, passos, tentativas
  de rename, o que ficou no caminho do registro (tipo e bytes), o registro próprio movido intacto, o
  destino externo do link, o estado próprio da configuração/pasta do plugin, nenhum temporário sobrando
  e lock liberado.
- **`I4-C31b`** (`:1025`) — 24 linhas: lock removido, editado, trocado por arquivo, diretório,
  junção/link de diretório, link de arquivo e controle × comando em sucesso, conflito (edição externa da
  configuração) e erro (`EIO` no rename do registro); `unlink` do lock negado (`EACCES`); Codex e Hermes.
  Afirma código, `status`, `applied`, conflitos (o principal antes do lock), erros, passos, o que ficou
  no caminho do lock, o lock próprio movido, destino externo, configuração e se a pasta de estado ficou.
- **`I4-C27b`** (`:1169`) — 15 linhas: `.skill-me` trocada por junção/link para fora do alvo, para
  outra pasta do alvo, para a própria pasta movida para fora, ou por outro diretório real com arquivos
  de mesmo nome; depois da configuração/artefatos, logo depois de criar o lock e durante a nova
  tentativa do rename; Claude instalação/remoção/remoção parcial, Codex, Hermes instalação/remoção e
  controle (junção dentro do alvo posta antes do comando: `0 applied`, como `I4-C34d`). Afirma código,
  conflitos, passos, arquivos do usuário intactos, o que está em `.skill-me`, o conteúdo da pasta
  própria movida (registro, temporário e lock próprios lá deixados, nada apagado através da troca) e o
  estado próprio.
- **`I4-C30e`** (`:1239`) — 6 linhas × prévia/aplicação: diretório, junção/link de diretório e link de
  arquivo para cópia exata do registro no caminho do registro (links para dentro do alvo), Claude,
  Codex e Hermes, instalação e remoção. Afirma 4 `foreign_artifact`, `changes: []`, o caminho intacto e
  a árvore inteira do alvo igual (com mtime).
- Windows sem privilégio de symlink de arquivo: 5 linhas por `t.diagnostic` (1 em `I4-C30d`, 3 em
  `I4-C31b`, 1 em `I4-C30e`), executadas no WSL.
- **RED** (versão final do teste, `git hash-object` `ccca0f72…`, SHA-256 com LF `374ceebc…`, sobre o
  produto `a6c656b` intacto, blobs conferidos): Windows `13 tests, 9 pass, 4 fail` e WSL `13, 9, 4` —
  falham exatamente `I4-C30d`, `I4-C31b`, `I4-C27b`, `I4-C30e`, todas por diff de asserção
  (`ERR_ASSERTION`), sem exceção (`round5-red-tests-{windows,wsl}-a6c656b.tap`).
- **Tentativas preservadas.** (1) Primeira execução no Windows: os rótulos das linhas viraram nome de
  scratch com `/` e `:` (inválidos) e as quatro falharam no `mkdtemp`, antes de qualquer comando; o
  scratch passou a usar um rótulo sanitizado. (2) Primeiro RED Windows: `I4-C27b` terminou com
  exceção do próprio teste (`lstat` de `.skill-me`, que o produto antigo apagou junto com os arquivos
  do usuário na variante "outro diretório real") em vez de diff; a observação passou a registrar
  "ausente", sem afrouxar asserção, e o RED foi refeito (`…-tentativa1-c27b-excecao.tap`). (3) Erro do
  teste corrigido antes do commit: `??` trocava o `null` de uma linha nova de `I4-C27b` pelo valor
  padrão (o observado já estava certo). (4) RED/GREEN anteriores às linhas de discriminação ficam como
  `…-antes-das-linhas-de-discriminacao.tap`.
- **GREEN:** `install-apply.unit` 13/13 no WSL, sem diagnóstico, e as quatro novas no Windows; lotes abaixo.

### Discriminação (mutações só em cópias WSL do `/tmp`, sobre o worktree de `81b9888`)

Cada mutação roda `install-apply.unit` + `install.cli` (31 testes) numa cópia nova, com o trecho achado
exatamente uma vez (`round5-probes/mutants.mjs`). Primeira passada (`round5-mutations-wsl-passada1.json`):
15/18 detectadas; sobreviveram m1 e m3 (a troca acontecia antes de criar o temporário, e a conferência
anterior à criação já parava) e m16 (Hermes). Acrescentadas a `I4-C27b` as linhas "durante a nova
tentativa do rename" com link para a própria pasta movida e "Hermes logo depois de criar o lock";
segunda passada (`…passada2.json`): **18/18 detectadas**, sempre só pelas provas novas — as 27
anteriores seguem verdes em todos os mutantes (não cobriam esses estados).

| Mutação | Falha |
| --- | --- |
| m1 sem conferência da pasta antes de cada tentativa · m2 antes de criar o temporário · m3 limpeza do temporário sem conferir a pasta · m6 registro apagado sem conferir a pasta · m8 lock apagado sem conferir a pasta · m14 só contenção, sem a referência · m15/m16 leitura sob o lock sem conferir a pasta (Claude/Codex; Hermes) | `I4-C27b` |
| m4 registro gravado sem conferir o destino · m5 apagado sem conferir o conteúdo · m13 registro lido ausente não conferido | `I4-C30d`, `I4-C27b` |
| m7 lock apagado sem conferir os bytes · m18 conflito do lock no lugar do principal | `I4-C31b`, `I4-C27b` |
| m9 falha de E/S do lock engolida · m10 lock ausente tratado como liberado · m17 pasta vazia removida com o lock mantido | `I4-C31b` |
| m11 registro ausente na exclusão tratado como apagado | `I4-C30d` |
| m12 registro não regular lido como antes | `I4-C30e` |

### Mudanças colaterais de comportamento, provadas

- Registro, lock ou pasta de estado mexidos durante a aplicação: antes apagados ou sobrescritos com 0
  ou com 4 sem conflito próprio; agora 4 com o caminho, preservados, passos anteriores `done`
  (`I4-C30d`, `I4-C31b`, `I4-C27b`).
- Registro ou lock ausente na hora do efeito: antes tolerado (0); agora 4 — escolha não idempotente
  justificada no Landing (`I4-C30d` e `I4-C31b`, linhas "removido").
- Diretório posto no caminho do registro durante a primeira instalação: antes 5 (o rename falhava,
  com novas tentativas no Windows); agora 4.
- Falha de E/S ao liberar o lock: antes 0; agora 5 com passo `lock: failed` (`I4-C31b`).
- Registro já presente como diretório: antes 3 `config_unreadable`; como link: antes seguido (a
  remoção apagava o link); agora 4 `foreign_artifact` na prévia e na aplicação (`I4-C30e`).
- `.skill-me` trocada por arquivo entre a conferência inicial e o lock: antes 5 (`ENOTDIR` no `wx`);
  agora 4, pelo mesmo `stateDirRealPath` — por leitura; essa janela não tem teste dedicado.
- Lock que fica: a pasta de estado vazia também fica (antes saía; `I4-C31b`).

### Contagens reais em `81b9888`

Um batch por plataforma: `node --test --test-reporter=tap "tests/integrations/**/*.test.mjs"
scripts/governance-ci.test.mjs scripts/code-review/review.test.mjs`. Windows: worktree com
`git diff --quiet 81b9888 -- src tests docs scripts package.json package-lock.json`, executado fora do
sandbox pelos testes de timeout/taskkill do motor (só processos dos próprios testes), Hermes nativo pelo
helper (`python -I -B`, HERMES_HOME e HOME/APPDATA/TEMP temporários, sem modelo). WSL: distro `Ubuntu`
explícita, Node 24.13.0, `git archive 81b9888` (SHA-256 `d041a65f…3adae2`) no ext4
(`/tmp/skillme-r5-batch-81b9888`), 140 arquivos de `src`, `tests`, `scripts`, `docs`, `package.json` e
`package-lock.json` iguais aos blobs (CRLF normalizado), `env -i` só com `PATH`; exit do próprio
`wsl.exe`. Nenhum spawn lendo por `/mnt/c`.

| Execução | tests | pass | fail | cancelled | skipped | todo | exit | duração |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Windows 11, Node 24.21.0 — integrações 74 + governança 6 + motor 16 | 96 | 94 | 0 | 0 | 2 | 0 | 0 | 33 s |
| WSL — integrações 74 + governança 6 + motor 16 | 96 | 88 | 0 | 0 | 8 | 0 | 0 | 17 s |

Cruzamento das 54 linhas `Proof:` com os TAPs (`round5-proofs-vs-batch-{windows,wsl}-81b9888.txt`;
cada padrão casou exatamente um teste executado, declarado no arquivo da prova): Windows 53 PASS +
`I4-C15` SKIP; WSL 46 PASS + 8 SKIP. Fora das linhas `Proof:` (42, todos executados): 16 do motor, 5 de
governança e 21 de integração — os 17 anteriores e os novos `I4-C27b`, `I4-C30d`, `I4-C30e`, `I4-C31b`
(+4 em relação aos 92 de `01c78bd`/`a6c656b`). Skips e motivos:

- Windows (2): `I4-C15` `posix-signals` e `I4-C25b` `posix-modes` (passam no WSL). Diagnósticos de link
  de arquivo (EPERM sem privilégio): os 10 anteriores e os 5 novos acima — executados no WSL, sem
  diagnóstico.
- WSL (8): `I4-C18..C23`, `I4-C37`, `I4-C44b` `hermes-runtime-ausente`: prova nativa do Hermes só no
  Windows (executada nesse batch, 8 PASS); Linux **pendente**.
- Medição C38: Windows 821 ms depois do filho, 65536 bytes no pipe; WSL 809 ms, 146176 bytes.
- `I4-C29` isolado (`round5-c29-81b9888.txt`, `round5-probes/c29-loop.sh`): Windows 0/100, WSL 0/40 —
  amostras nos ambientes declarados, não garantia contra carga arbitrária.
- Doctor (417) não reexecutado: nenhum arquivo do doctor, dos módulos reutilizados, de `scripts/`,
  `code-review.config.json`, `package.json`/lock ou `AGENTS.md` mudou desde `6083af8` (`I4-C45`, no
  lote, confere a interface do doctor com as integrações instaladas).

### Examinado e não alterado (limites e resíduos)

- **`settings.json` como symlink dentro do alvo** (comportamento anterior, fora dos achados R5;
  sonda `round5-probes/config-link-probe.mjs`, WSL, igual em `a6c656b` e `81b9888`,
  `round5-config-link-probe-wsl-*.json`): a instalação substitui o link por um arquivo regular com o
  conteúdo lido mais os grupos próprios; o arquivo apontado fica sem mudança e o link do usuário some;
  a remoção deixa arquivo regular. Sem perda de bytes, mas a estrutura do link não é preservada. Por
  leitura, o mesmo vale para `hooks.json` do Codex (mesmo `replaceChecked`); não executado. Seguir o
  link, recusar ou manter é decisão de produto — comunicada, não corrigida. Link que resolve fora do
  alvo continua `target_escape` (`I4-C27`).
- Hermes staging: artefato alterado na pasta temporária antes do rename dela é promovido (instalação
  0); o registro guarda o hash do pacote e a remoção o preserva (4) — sem perda; limite no guia.
- Remoções concorrentes: o `removeDirIfEmpty(.skill-me)` de um processo pode fazer o `wx` do lock de
  outro falhar com `ENOENT` (5, nada mudado); a remoção da pasta entre o `mkdir` e a referência agora é
  4. Não testado nem alterado; C29 continua limitado a seis instalações paralelas.
- Janela não atômica entre cada conferência nova (pasta, registro, lock) e o syscall; identidade por
  caminho, tipo, tamanho e hash — bytes idênticos não se distinguem (inclusive um lock com o mesmo pid
  de outro sistema sobre o mesmo alvo). Um diretório real novo no mesmo caminho de `.skill-me` só é
  percebido pelo conteúdo do registro e do lock: vazio, numa primeira instalação, recebe o registro.
- Temporário do registro criado antes de a pasta ser trocada fica na pasta movida (nada é apagado
  através da troca; remoção manual), como mostra `I4-C27b`.
- Hermes nativo só no Windows; Linux pendente; macOS só pela CI; E2E real dos três agentes pendente.

### Sobras próprias desta rodada (preservadas)

Nenhum `rm` de diretório nem limpeza opaca. Windows `%TEMP%\skill-me-r5\`: `probes/`
(`r5-metadata-probe.mjs`, `config-link-probe.mjs`, `mutants.mjs`, `c29-loop.sh`, `proofs-vs-batch.mjs`
copiado da rodada formal 2, `wsl-copy.sh`, `wsl-run.sh`, `hash-lf.sh`, `hash-list-lf.sh`),
`head-a6c656b/` (a primeira extração falhou depois de criar a pasta e copiar `node_modules`, porque o
`tar` do Git Bash leu `C:` como host; a segunda extraiu no mesmo diretório e os blobs foram
conferidos depois), `redtests-a6c656b/`, os `.tar` de `a6c656b` e `81b9888`, `results/` e os alvos
sintéticos `alvos red-a6c656b`, `alvos wip`, `alvos green-81b9888`. Única exclusão: `c29-loop.sh`
apaga o TAP da própria execução que passou (arquivo recém-criado por ele, caminho absoluto no
`results/`); os das falhas ficariam — não houve. WSL `/tmp`: `skillme-r5-{probes,red-a6c656b,
redtests-a6c656b,redtests2-a6c656b,wip,mutbase,mutbase2,batch-81b9888,c29-wsl-81b9888}`,
`skillme-r5-mut-m1..m18`, `skillme-r5-mut2-m1..m18` e os alvos `skillme-r5-alvos …`. Scratches dos
testes: removidos pelo `after()` existente (só diretórios de `makeScratch`, caminho absoluto sob o
TEMP; as junções criadas pelos testes que apontam para fora do alvo apontam para dentro do próprio
scratch). Scratches de Verifiers, recovery e histórico formal não foram tocados. Cópias locais
(ignoradas) em `.checks/code-review/issue-4/round5-*`.

### Privacidade e ambiente

Nenhum `process.env`, token, credencial ou valor de ambiente impresso. Testes e sondas usam ambiente
mínimo e conteúdo sintético; as sondas imprimiram só códigos, conflitos, passos, tipos e o destino de
arquivos sintéticos. Nenhuma instalação em perfil pessoal; todos os `--target` em temporários; nenhum
agente, modelo, download ou E2E; nenhum bypass/confiança concedido; nenhum subagente.

## Correção da revisão formal round 3 — ancestral `plugins` e alvo gerenciado real (17/10/2026)

Builder: Claude (tlc-implement `light`), mesma entrega. Partida em `4088045` (só evidência e Handoff
desde `81b9888`; produto e testes de `af60759` = `81b9888`, `git diff --name-only af60759 81b9888 --
src tests` vazio), checkout limpo, HEAD do despacho conferido. Esta seção é evidência do autor, **não é
verificação independente** nem revisão formal: nenhum `review:run`/`review:check`/`pr:create`/push/
PR/merge/Verifier foi executado; `.verified.md`, contadores, override, estado do motor (3 de 10
tentativas formais) e histórico não foram tocados; scratches de Verifier e recovery não foram lidos nem
mexidos. A sonda adicional do Verifier interrompida na rodada 6 (`verifier-residual-probe.mjs`) **não**
foi executada, recriada nem substituída: as provas desta seção são as regressões versionadas, sem
sonda própria à parte. Commits: `d3a728f` (Landing, antes do código), `8ef51d8` (correção, regressões
e guia) e o desta evidência. `git diff --name-only 4088045..8ef51d8`: `.checks/issue-4-integracoes.md`
(uma linha de Landing), `docs/agent-observation.md`, `src/integrations/install/{run,target}.mjs` e
`tests/integrations/install-apply.unit.test.mjs`; nada em doctor, `scripts/`, configuração do motor,
dependências, `AGENTS.md`, task, helpers de teste ou `.verified.md`.

**Classificação.** F1 (P1) e F2 (P2) são os achados bloqueantes da revisão formal round 3 (AC6/C27/
C34), lidos pelo revisor e agora **reproduzidos** pelas regressões no produto intacto, nas duas
plataformas, só com dados sintéticos dentro do scratch de cada linha. A mesma falta de guarda aparece
na **instalação** Hermes — `plugins` trocado durante a aplicação levava staging, artefatos e `rename`
para fora do alvo, com 0 e registro gravado — e na limpeza da sobra própria do staging — cópias exatas
apagadas em outra pasta do alvo, depois 5. Comunicados no retorno como reproduzidos; tratados pela mesma
guarda, como o despacho previu ("instalação/cleanup/staging se a mesma guarda for usada e se houver
defeito concreto em AC6"). Nenhum é escopo novo.

### Reprodução RED no produto `af60759` (cópias isoladas próprias)

- Windows: `git archive af60759` (CRLF pelo `core.autocrlf`; SHA-256 do tar `4e32a530…cfe36`) extraído
  em `%TEMP%\skill-me-f3\head-af60759` + `node_modules`; 49 arquivos (`src/integrations/install`,
  `src/integrations/*.mjs`, `src/doctor`, plugin Hermes, helpers de teste, `install.cli.test.mjs`) iguais
  aos blobs com CRLF normalizado.
- WSL (`Ubuntu` 24.04, Node 24.13.0, `env -i` só com `PATH`): `git -c core.autocrlf=false archive
  af60759` (LF; `0660f0e5…f723d`) no ext4 (`/tmp/skillme-f3-red-af60759`); 61 arquivos de `src` e dos
  helpers iguais aos blobs **sem** normalização.
- Teste novo sobreposto nas duas cópias: blob `68ce4fd4…` (SHA-256 LF `81401c41…3f45`), o mesmo
  commitado em `8ef51d8`.
- Resultado igual nas duas: `install-apply.unit` **15 tests, 13 pass, 2 fail** — falham exatamente
  `I4-C34h` e `I4-C27c`, ambas por diff de asserção (`ERR_ASSERTION`), sem exceção; as 13 anteriores
  passam (`formal3-red-tests-{windows,wsl}-af60759.tap`). Valores observados no produto antigo,
  iguais nas duas plataformas:

| Linha (`I4-C34h`, depois da troca de `plugins`) | `af60759` | `8ef51d8` |
| --- | --- | --- |
| remoção, depois do 1º artefato, pasta externa com cópias exatas (cenário F1) | `0 applied`; `readBytes`+`unlink` de `kwargs.json` e `plugin.yaml` **externos**, destino alterado, **registro apagado** | `4 target_escape:plugins`, nada lido/apagado através dele, destino intacto, registro intacto |
| remoção, 1º artefato, outra pasta do alvo com cópias exatas | `0`, cópias internas **apagadas**, registro apagado | `4 config_changed_during_apply:plugins`, intactos |
| remoção, 1º artefato, a própria `plugins` movida para fora | `0`, artefatos próprios apagados fora do alvo e pasta removida | `4 target_escape`, `kwargs.json`/`plugin.yaml` ficam na pasta movida |
| remoção com cache, 3º artefato, outra pasta com bytecode de mesmo nome | `0`, bytecode alheio **apagado**, `__pycache__` e pasta alheios removidos | `4 config_changed_during_apply`, intactos |
| remoção, 3º artefato, pasta externa com `skill-me-observer` vazio | `0`, diretório externo **removido** | `4 target_escape`, intacto |
| remoção, logo depois de criar o lock, pasta externa com cópias exatas | `0`, externos **lidos** sob o lock e **apagados** | `4 target_escape` antes de qualquer leitura da pasta do plugin |
| instalação, logo depois de criar `plugins`, pasta externa vazia | `0`, staging, 3 artefatos e `rename` **fora do alvo**, registro gravado | `4 target_escape`, nada criado, sem registro |
| instalação, 1º / 3º artefato no staging, a própria `plugins` movida para fora | `0`, restante gravado e renomeado fora do alvo, registro gravado | `4 target_escape`; staging com 1 / 3 artefatos fica na pasta movida |
| instalação, 1º artefato no staging, `plugins` movida para outra pasta do alvo | `0`, plugin instalado na outra pasta | `4 config_changed_during_apply` |
| instalação, 1ª exclusão da sobra do staging, outra pasta com staging de cópias exatas | `5` (`rmdir` falha), 2 cópias alheias **apagadas** | `4 config_changed_during_apply`, intactas |
| `I4-C27c`, alias → diretório gerenciado ou descendente (install/uninstall `--apply`, `plan`, `uninstall` prévia) | sem `managed_policy_target`; `target` = caminho gerenciado; próximo acesso `lstat <gerenciado>/settings.json` (recusado pelo io da prova) → `5 EACCES` | `4 managed_policy_target`; acessos só `stat` e `realpath` do alias; `target` = argumento |

Controles iguais nos dois produtos: remoção e instalação sem troca (`0 applied`), `plugins` como
junção/link para outra pasta do alvo já antes do comando (`0`, link fica — contrato de `I4-C34d`),
recusa textual do diretório gerenciado e do descendente (4, nenhum acesso), irmão com o mesmo prefixo
(`ClaudeCode-irmão` / `claude-code-irmão`: segue, `5 EACCES` no primeiro `lstat`) e alias legítimo
num scratch real (`0 applied` no diretório real, alias mantido).

**Segurança da prova F2.** Nenhum diretório gerenciado real foi acessado, criado ou editado: o io da
prova responde só ao `stat`/`realpath` do alias sintético (no scratch) e registra e recusa (`EACCES`)
qualquer outra chamada, sem delegar nada ao sistema de arquivos; o produto antigo mostra que segue para
um acesso dentro do diretório gerenciado, e esse acesso é recusado pela prova. A recusa textual de
`I4-C27` continua sem nenhum acesso, e a conferência nova é pura (comparação do caminho que o
`realpath` devolveu).

### Correção (`run.mjs`, `target.mjs`; linha de Landing de `d3a728f`)

- `stateDirRealPath` passou a receber a pasta (`dirRealPath(io, root, rel, platform)`, `run.mjs:161`)
  e a comparação com a referência virou `dirUnchangedGuard` (`:178`); `.skill-me` usa os dois como antes
  (`withLock`, `:239`) — mesma regra, sem cópia.
- `readHermesState` (`:554`): com `plugins` presente, o caminho real dele é lido logo depois do `stat`
  e antes da pasta do plugin e do staging (`pluginsDirReal`); sob o lock é a referência. Fora do alvo →
  `target_escape` antes de ler a pasta do plugin.
- Remoção (`removeHermesArtifacts`, `:750`): `pluginDirStillOwn` confere primeiro `plugins` e depois a
  pasta do plugin como diretório real; usada antes de cada leitura+exclusão de artefato, de cada
  bytecode (por `cacheDirStillOwn`), do `rmdir` do `__pycache__` e da pasta do plugin.
- Instalação (`installHermesArtifacts`, `:715`): referência da leitura, ou logo depois do `mkdir` de
  `plugins` quando a instalação a cria; conferida antes do `mkdir` do staging, de cada artefato gravado
  e do `rename`. `removeOwnedStaging` (`:697`) recebe a conferência e a usa antes do `readdir`, de cada
  exclusão e do `rmdir`.
- Claude (`runIntegrationCommand`, `:883`): depois de `resolveTarget`, `isManagedPolicyTarget(root)`
  → 4 `managed_policy_target`, antes de `result.target` e de qualquer leitura no alvo; a recusa textual
  anterior continua antes de tudo. Comentário de `isManagedPolicyTarget` (`target.mjs:22`) atualizado.

### Regressões (`tests/integrations/install-apply.unit.test.mjs`)

Pela API pública `runIntegrationCommand`; tabela `observed`/`expected` comparada por inteiro.

- **`I4-C34h`** — 14 linhas (11 trocas + 3 controles), io real instrumentado que dispara a troca
  dentro do comando (exclusão real do 1º/3º artefato próprio, lock criado, `plugins` criada, 1º/3º
  artefato no staging, 1ª exclusão da sobra) e registra toda leitura de conteúdo, gravação e exclusão
  (`readdir`, `readBytes`, `readText`, `unlink`, `rmdir`, `mkdir`, `writeExclusive`, `rename`) através de
  `<alvo>/plugins` depois da troca. Cada linha num scratch próprio; destino "fora do alvo" é uma pasta
  irmã do alvo no mesmo scratch. Afirma: troca ocorrida, código, `status`, `applied`, conflito exato,
  passos, **nenhuma operação através do caminho trocado**, destino alheio igual ao snapshot anterior
  (bytes, mtime e tipo), o que está em `plugins` (link → destino), o conteúdo exato da `plugins` própria
  movida (o que já saiu não volta; o restante fica), registro intacto/ausente/gravado e lock liberado.
  A linha da sobra do staging deriva a listagem esperada do arquivo que disparou a troca (ordem do
  `readdir`: NTFS ordena por maiúsculas, o ext4 não ordena).
- **`I4-C27c`** — 9 linhas: alias → diretório gerenciado (install `--apply`, uninstall `--apply`,
  `plan`), alias → descendente (install `--apply`, uninstall prévia), texto do próprio diretório e do
  descendente (nenhum acesso), controle irmão com o mesmo prefixo e controle de alias legítimo
  (junção/symlink de diretório num scratch, io real). Afirma código, `status`, `applied`, conflitos,
  erros, `changes: []`, `target` (argumento na recusa) e a **lista exata de acessos** (`stat` e
  `realpath` do alias; nenhum na recusa textual); no controle legítimo, 8 eventos próprios no
  diretório real, hook `Stop` de terceiro intacto, alias mantido e registro criado.
- RED/GREEN acima; os controles passam nos dois produtos. Nenhuma asserção existente mudou.

### Mudanças colaterais de comportamento, provadas

- Hermes com `plugins` trocado durante a remoção ou a instalação: antes 0 (ou 5 na sobra) com
  leitura, gravação ou exclusão através da troca; agora 4 com `plugins`, nada através dele (`I4-C34h`).
- O conflito no meio do passo `artifacts` segue a semântica já existente de `I4-C34c`/`I4-C34g`: o passo
  não é listado e `applied` fica `false`, embora o que saiu antes da troca tenha saído (sem rollback);
  `changes` continua sendo o plano. Não alterado (ver limites).
- Prévia Hermes com `plugins` presente: uma conferência de contenção a mais (`lstat`/`realpath`/`stat`),
  sem leitura de conteúdo; sem mudança de resultado nos testes existentes.
- Claude com alias para o diretório gerenciado: antes seguia para dentro dele; agora 4 antes de
  qualquer leitura (`I4-C27c`). Alias legítimo inalterado (controle).

### Contagens reais em `8ef51d8`

Um batch por plataforma: `node --test --test-reporter=tap "tests/integrations/**/*.test.mjs"
scripts/governance-ci.test.mjs scripts/code-review/review.test.mjs`. Windows: worktree com
`git diff --quiet 8ef51d8 -- src tests docs scripts package.json package-lock.json`, executado fora do
sandbox pelos testes de timeout/taskkill do motor (só processos dos próprios testes), Hermes nativo pelo
helper (`python -I -B`, HERMES_HOME e HOME/APPDATA/TEMP temporários, sem modelo). WSL: distro `Ubuntu`
explícita, Node 24.13.0, `git -c core.autocrlf=false archive 8ef51d8` (SHA-256 `34439095…ac77c811`) no
ext4 (`/tmp/skillme-f3-batch-8ef51d8`), 140 arquivos de `src`, `tests`, `scripts`, `docs`,
`package.json` e `package-lock.json` iguais aos blobs sem normalização, `env -i` só com `PATH`; exit do
próprio `wsl.exe`. Nenhum spawn lendo por `/mnt/c`.

| Execução | tests | pass | fail | cancelled | skipped | todo | exit | duração |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Windows 11, Node 24.21.0 — integrações 76 + governança 6 + motor 16 | 98 | 96 | 0 | 0 | 2 | 0 | 0 | 34 s |
| WSL — integrações 76 + governança 6 + motor 16 | 98 | 90 | 0 | 0 | 8 | 0 | 0 | 17 s |

Cruzamento das 54 linhas `Proof:` com os TAPs (`formal3-proofs-vs-batch-{windows,wsl}-8ef51d8.txt`,
mesmo script da rodada anterior; cada padrão casou exatamente um teste executado, declarado no arquivo
da prova): Windows 53 PASS + `I4-C15` SKIP; WSL 46 PASS + 8 SKIP. Fora das linhas `Proof:` (44, todos
executados): 16 do motor, 5 de governança e 23 de integração — os 21 anteriores e os novos `I4-C34h`,
`I4-C27c` (+2 em relação aos 96 de `81b9888`). Skips e motivos:

- Windows (2): `I4-C15` `posix-signals` e `I4-C25b` `posix-modes` (passam no WSL). Diagnósticos de link
  de arquivo (EPERM sem privilégio): os mesmos 15 anteriores, executados no WSL; as linhas novas não
  usam link de arquivo.
- WSL (8): `I4-C18..C23`, `I4-C37`, `I4-C44b` `hermes-runtime-ausente`: prova nativa do Hermes só no
  Windows (executada nesse batch, 8 PASS); Linux **pendente**.
- Medição C38: Windows 818 ms depois do filho, 65536 bytes no pipe; WSL 808 ms, 146176 bytes.
- `I4-C29` não foi repetido em laço: a mudança no caminho Claude/Codex é a conferência pura depois de
  `resolveTarget` e a troca de `stateDirRealPath` por `dirRealPath` com a mesma regra; passou nos dois
  lotes. Sem mutações adicionais (não exigidas no `light`): cada linha nova falhou no produto antigo.
- Doctor (417) não reexecutado: nenhum arquivo do doctor, dos módulos reutilizados, de `scripts/`,
  `code-review.config.json`, `package.json`/lock ou `AGENTS.md` mudou desde `4088045` (`I4-C45`, no
  lote, confere a interface do doctor com as integrações instaladas).

### Examinado e não alterado (limites e resíduos)

- **Conflito no meio do passo `artifacts`** (remoção ou instalação Hermes): o resultado não lista o passo
  e mantém `applied: false`, embora artefatos já possam ter saído ou estar no staging — mesma semântica
  anterior de `I4-C34c`/`I4-C34g`; o registro fica, e a remoção seguinte reporta `already_absent` para o
  que saiu. Mudar o relatório de passos parciais ficaria fora dos achados.
- **`rename` do staging falho com `plugins` trocado:** a limpeza é conferida, mas o `stat` da pasta do
  plugin que escolhe entre `foreign_artifact` e o erro de E/S pode atravessar a troca — só metadado,
  nada lido nem apagado. Sem teste dedicado (dupla falha).
- `removeDirIfEmpty(plugins)` no fim da remoção (quando a instalação criou `plugins`): inalterado — só
  remove diretório real vazio; link fica (`I4-C34d`); outro diretório real vazio no mesmo caminho não se
  distingue.
- **Ancestrais do próprio alvo:** a raiz é o caminho real resolvido no início; as conferências de
  `.skill-me` e de `plugins` comparam caminhos reais e percebem a troca de qualquer ancestral nos efeitos
  delas. `settings.json`/`hooks.json`, filhos diretos da raiz, não têm essa referência contra a troca de
  um ancestral da própria raiz durante a aplicação — fora dos ancestrais compartilhados dos achados; não
  sondado (sem sondagem ilimitada do sistema de arquivos).
- **F2:** o diretório gerenciado é a constante do doctor, não resolvida — se ele próprio for link, o
  destino não é reconhecido (o produto nunca o acessa). Por leitura, não testado: no Windows um nome
  curto 8.3 no argumento escapa da comparação textual, mas o `realpath` devolve o nome longo e a
  conferência nova o recusa. Codex/Hermes não têm política gerenciada (inalterado).
- Janela não atômica entre cada conferência e o syscall; bytes idênticos e outro diretório real no
  mesmo caminho não se distinguem.
- Inalterados e já registrados: `settings.json` como symlink dentro do alvo (julgado na rodada 6),
  staging Hermes alterado antes do `rename`, remoções concorrentes de `.skill-me`, Hermes nativo só no
  Windows (Linux pendente), macOS só pela CI, E2E real dos três agentes pendente.

### Sobras próprias desta rodada (preservadas)

Nenhum `rm` nem limpeza opaca. Windows `%TEMP%\skill-me-f3\`: `probes/` (`wsl-copy.sh`, `wsl-run.sh`,
`verify-blobs.sh` e `proofs-vs-batch.mjs` copiado da rodada anterior), `head-af60759/` (cópia RED),
`af60759.tar`, `af60759-lf.tar`, `8ef51d8-lf.tar` e `results/`. WSL `/tmp`: `skillme-f3-red-af60759` e
`skillme-f3-batch-8ef51d8`. Scratches dos testes: removidos pelo `after()` existente (só diretórios de
`makeScratch`, caminho absoluto sob o TEMP; as junções/symlinks que os testes criam apontam para
dentro do próprio scratch da linha); nenhum `skill-me i4 f1`/`f2` restou nas duas plataformas. Cópias
locais (ignoradas) em `.checks/code-review/issue-4/formal3-*`. Scratches de Verifiers, recovery e
histórico formal não foram tocados.

### Privacidade e ambiente

Nenhum `process.env`, token, credencial ou valor de ambiente impresso. Testes com conteúdo sintético;
os TAPs registram códigos, conflitos, passos, tipos e caminhos sintéticos, nunca conteúdo de
configuração. Nenhuma instalação em perfil pessoal; nenhum diretório gerenciado real acessado; todos os
`--target` em temporários; nenhum agente, modelo, download ou E2E; nenhum bypass/confiança concedido;
nenhum subagente; nenhuma operação recusada pela plataforma nesta rodada.

## Correção da verificação independente round 7 — staging próprio, destino da promoção e raiz da configuração (17/10/2026)

Builder: Claude (tlc-implement `light`), mesma entrega. Partida em `2e7fd75` (só o relatório
independente 7 e o Handoff desde `6053d2c`; produto e testes = `8ef51d8`, `git diff --quiet 8ef51d8 --
src` verdadeiro), checkout limpo, HEAD do despacho conferido; SHA-256 do relatório rastreado e da cópia
ignorada `verifier-round7-report.md` iguais (`1177ec41…80658ecd`). Esta seção é evidência do autor,
**não é verificação independente** nem revisão formal: nenhum `review:run`/`review:check`/`pr:create`/
push/PR/merge/Verifier foi executado; `.verified.md`, contadores, override, estado do motor (3 de 10
tentativas formais) e histórico não foram tocados; scratches de Verifiers e recovery não foram lidos nem
mexidos. A sonda adicional do Verifier interrompida na rodada 6 (`verifier-residual-probe.mjs`) **não**
foi executada, recriada nem substituída, e não houve sonda ad hoc: as provas são as regressões
versionadas; os auxiliares desta rodada (`%TEMP%\skill-me-r7\probes`) só copiam, rodam e conferem blobs e
cruzam `Proof:` com TAP, sem cenário de produto próprio. Commits: `851c3bd` (Landing, antes do código),
`e570541` (correção, regressões e guia) e o desta evidência. `git diff --name-only 2e7fd75..e570541`:
`.checks/issue-4-integracoes.md` (uma linha de Landing), `docs/agent-observation.md`,
`src/integrations/install/{run,target}.mjs` e `tests/integrations/install-apply.unit.test.mjs`; nada em
doctor, `scripts/`, configuração do motor, dependências, `AGENTS.md`, task, helpers de teste ou `.verified.md`.

**Classificação.** R7-F1/F2/F3 são os achados bloqueantes do Verifier7 (AC6/C25/C27/C34), estabelecidos
por **leitura**, sem reprodução pelo Verifier. Agora foram **reproduzidos** pelas regressões novas no
produto intacto `8ef51d8`, nas duas plataformas, só com dados sintéticos dentro do scratch de cada linha
(todo destino "fora do alvo" é uma pasta irmã no mesmo scratch). Consequências estabelecidas pela
execução, comunicadas no retorno: cópias exatas de outra pasta do alvo apagadas e junção removida
(Windows) durante a limpeza da sobra; artefatos gravados fora do alvo e um link promovido a pasta do
plugin com registro gravado e saída 0; diretório vazio do usuário substituído pela instalação (POSIX
nativo; Windows pela emulação declarada); configuração do Claude/Codex reescrita ou apagada na pasta
movida para fora da raiz real; temporário próprio apagado através da troca; `.skill-me`/`plugins`
criadas fora da raiz. **Achado adicional do mesmo R7-F2, só no Windows e sem emulação:** um **arquivo** do
usuário posto em `plugins/skill-me-observer` depois do plano era substituído pelo `rename` nativo do
staging (saída 0, bytes do arquivo perdidos); no POSIX o mesmo `rename` falha (`ENOTDIR`) e caía no
`catch` (4). Fechado pela mesma conferência; perda de dados comunicada no retorno. Nenhum é escopo novo.

### Reprodução RED no produto `8ef51d8` (cópias isoladas próprias)

- Windows: `git -c core.autocrlf=false archive 8ef51d8` (SHA-256 do tar `34439095…ac77c811`, o mesmo da
  rodada anterior) extraído em `%TEMP%\skill-me-r7\red-8ef51d8` + `node_modules`; 61 arquivos de `src` e
  dos helpers de teste iguais aos blobs de `8ef51d8` **sem** normalização; teste sobreposto com o blob
  commitado em `e570541` (`011679ba…`, SHA-256 LF `c486d5f9…11df6d`).
- WSL (distro `Ubuntu` explícita, Node 24.13.0, ext4, `env -i` só com `PATH`): mesmo tar em
  `/tmp/skillme-r7-red2-8ef51d8`, os mesmos 61 arquivos iguais aos blobs, mesmo blob do teste.
- Resultado igual nas duas: `install-apply.unit` **18 tests, 15 pass, 3 fail** — falham exatamente
  `I4-C34i`, `I4-C34j` e `I4-C27d`, todas por diff de asserção (`ERR_ASSERTION`), sem exceção; as 15
  anteriores passam (`round7-red-tests-{windows,wsl}-8ef51d8.tap`). A primeira execução RED, com a versão
  do teste anterior a uma troca de expressão equivalente (`realHome`), fica preservada como
  `round7-red-new-*-antes-da-expressao-equivalente.tap`: diffs de asserção idênticos aos finais.

Valores observados no produto antigo (Windows | WSL), contra `e570541` (igual nas duas):

| `I4-C34i` (staging trocado; `plugins` estável) | `8ef51d8` | `e570541` |
| --- | --- | --- |
| sobra própria, 1ª exclusão, junção/link → outra pasta do alvo com cópias exatas | `0 applied`, cópias **apagadas**, junção removida pelo `rmdir`, plugin instalado \| `5 ENOTDIR` depois de **apagar** as cópias | `4 config_changed_during_apply` no staging, nada através dele, pasta intacta, link fica |
| sobra própria, 1ª exclusão, → pasta externa com cópias | `4 target_escape` no arquivo (contenção do filho), `lstat`/`realpath` através do link \| igual | `4` no staging, sem nenhum acesso através dele |
| sobra própria, última exclusão, → outra pasta vazia | `0`, junção removida pelo `rmdir` \| `5 ENOTDIR` | `4`, link fica |
| logo depois de criar o staging, → pasta externa vazia | `0`, 3 artefatos gravados **fora do alvo**, link promovido a `plugins/skill-me-observer`, registro gravado \| igual | `4`, nada gravado fora |
| 1º artefato, → outra pasta vazia / pasta externa vazia | `0`, restantes gravados através do link, link promovido \| igual | `4`; staging próprio movido com `__init__.py` |
| 1º artefato, arquivo no lugar do staging | `5 ENOENT` \| `5 ENOTDIR` | `4`, arquivo do usuário intacto |
| 3º artefato (antes da promoção), → pasta externa / outra pasta com cópias | `0`, link promovido a pasta do plugin \| igual | `4`, nenhuma promoção |
| limpeza depois de `rename` falho (EIO), 1ª exclusão, → outra pasta com cópias | `5 EIO`, cópias **apagadas** (Windows: junção removida) \| `5 EIO`, cópias apagadas | `5 EIO`, passo `artifacts: failed`, pasta intacta, link fica |
| controles: instalação, sobra própria limpa, `rename` falho sem troca | `0`, `0`, `5` com a sobra própria limpa \| igual | igual |

| `I4-C34j` (entrada surgida no destino depois do 3º artefato) | `8ef51d8` | `e570541` |
| --- | --- | --- |
| diretório real vazio (`plugins` presente ou criada pela instalação) | `0 applied`, destino **substituído** pelo staging, registro gravado (Windows pela emulação declarada; WSL nativo) | `4 foreign_artifact` em `plugins/skill-me-observer`, nenhuma promoção, destino intacto (tipo, mtime, árvore), staging próprio completo no lugar |
| diretório com arquivo do usuário / junção-link para pasta vazia do alvo | `4` pelo `catch`, promoção tentada, staging limpo \| igual | `4`, nenhuma promoção, staging no lugar |
| arquivo do usuário | `0`, arquivo **substituído** pelo `rename` nativo do Windows \| `4` pelo `catch` (`ENOTDIR`) | `4`, nenhuma promoção, arquivo intacto |
| controles: nada surge (`plugins` presente ou criada) | `0` \| `0` | `0` |

| `I4-C27d` (raiz ou ancestral trocados por junção/link para a pasta movida) | `8ef51d8` (iguais nas duas) | `e570541` |
| --- | --- | --- |
| Claude install, depois da última leitura da prévia | `4 target_escape .skill-me` depois de **criar** `.skill-me` na pasta movida | `4 target_escape .`, nada criado |
| Claude install, lock criado (leitura sob o lock) | `4 .skill-me`, configuração **lida** através da troca | `4 .` antes da leitura |
| Claude install, registro lido sob o lock / temporário criado; ancestral, temporário criado | `4 .skill-me` tardio, configuração **reescrita** na pasta movida (8 eventos) | `4 .` + lock mantido; configuração movida com os bytes originais; temporário próprio fica lá |
| Claude uninstall (reescrita), temporário criado | `4` tardio, configuração movida **reescrita** | `4 .`, bytes iguais |
| Claude uninstall que apaga o arquivo: registro lido sob o lock / leitura da exclusão; ancestral | `4` tardio, configuração movida **apagada** | `4 .`, arquivo intacto |
| Codex install, rename negado (EPERM) com a troca | nova tentativa **grava** na pasta movida | `4 .`, 1 tentativa |
| Codex install, rename com falha (EIO) com a troca | `5`, temporário próprio **apagado através da troca** | `5 EIO`, temporário fica na pasta movida |
| Codex uninstall, temporário criado | `4` tardio, `hooks.json` movido **reescrito** | `4 .`, bytes iguais |
| Hermes install sem `plugins`, registro lido sob o lock | `4 target_escape plugins` depois de **criar** `plugins` na pasta movida | `4 .`, nada criado |
| só o arquivo da configuração trocado por link de arquivo para ele movido para fora (WSL) | install `0` (lido através do link, link substituído); remoção `0` (link apagado, registro apagado) | `4 target_escape settings.json`, nada lido nem apagado através dele; temporário próprio limpo |
| controles: nada muda, rename negado uma vez, alvo por alias, link de arquivo contido (WSL) | `0` | `0` (o link contido continua substituído por arquivo regular, julgado na rodada 6) |

### Correção (`run.mjs`, `target.mjs`; linha de Landing de `851c3bd`)

- `assertContained` nomeia a própria raiz como `.` (`target.mjs:67`); nenhum chamador anterior passava a raiz.
- `rootUnchangedGuard` (`run.mjs:189`) é `dirUnchangedGuard` sobre a raiz com a referência `root` — a
  mesma regra de `.skill-me`/`plugins`, sem cópia. `withLock` (`:248`) a confere antes do `mkdir` de
  `.skill-me` e a entrega a `fn`.
- Claude/Codex (`runJsonAgent`, `:500`): `configContained` = raiz + `assertContained` do arquivo; usada
  antes da leitura sob o lock (`readJsonState`, `:432`, gancho novo `beforeConfigRead`), a cada
  releitura em `beforeRename` (`replaceChecked`, `:349`) e antes da leitura e do `unlink` da exclusão
  (`deleteChecked`, `:364`). `writeViaTemp` recebe a raiz como `dirUnchanged` (criação, cada tentativa,
  limpeza) — a opção já usada pelo registro.
- Hermes: `assertStillRealDir` (`:197`) é o antigo `stillRealDir` local da remoção, agora compartilhado
  com o staging. `installHermesArtifacts` (`:754`): raiz antes do `mkdir` de `plugins`; `stagingStillOwn`
  (`plugins` + staging diretório real) antes de cada artefato gravado, antes da promoção e, via
  `removeOwnedStaging` (`:735`), antes do `readdir`, de cada arquivo e do `rmdir` da sobra (também na
  limpeza do `catch`); a contenção e o tipo checados uma vez no início da limpeza saíram (cobertos pela
  conferência). Antes do `rename`, a pasta do plugin precisa continuar ausente (`:783`), senão
  `foreign_artifact` sem promoção nem limpeza do staging.

### Regressões (`tests/integrations/install-apply.unit.test.mjs`)

Pela API pública `runIntegrationCommand` com io real instrumentado que dispara a troca dentro do
comando, depois de um efeito real; tabela `observed`/`expected` comparada por inteiro.

- **`I4-C34i`** (asserção em `:1753`) — 13 linhas (10 trocas + 3 controles). Registra toda operação que
  atravessa o caminho do staging depois da troca (leitura, gravação, exclusão, promoção e metadado de um
  filho; só o `lstat` do próprio caminho fica de fora) e cada promoção tentada. Afirma troca ocorrida,
  código, `status`, `applied`, conflitos, erros, passos, **nenhuma operação através do staging trocado**,
  promoções, destino alheio igual ao snapshot anterior (bytes, mtime, tipo), o que está no caminho do
  staging (link → destino; arquivo do usuário), o conteúdo exato do staging próprio movido (derivado do
  arquivo que disparou a troca: ordem do `readdir`), pasta do plugin, registro e lock.
- **`I4-C34j`** (`:1893`) — 7 linhas (5 entradas + 2 controles). Afirma código, conflito exato, passos,
  **nenhuma promoção com a entrada presente**, destino com tipo, mtime e árvore iguais, o que ficou no
  destino, staging próprio completo no lugar (bytes do pacote), registro ausente e lock liberado;
  controles com uma promoção para destino ausente. No Windows o io emula a semântica POSIX só para o
  diretório vazio, com `t.diagnostic`; no GREEN ela nunca é acionada (nenhuma promoção sobre entrada
  presente).
- **`I4-C27d`** (`:2158`) — 20 linhas (15 trocas + 5 controles; 3 com link de arquivo, executadas no WSL e
  com `t.diagnostic` no Windows). Registra leitura de conteúdo, gravação e exclusão através do caminho
  trocado e as tentativas de `rename` do temporário. Afirma código, `status`, `applied`, conflitos exatos
  (`.` e o do lock quando ele já existia), erros, passos, tentativas, **nenhuma operação através da
  troca**, o link no caminho trocado, a árvore inteira da pasta real reconhecida pelo conteúdo
  (configuração com N eventos próprios, registro, lock e temporário próprios), bytes da configuração
  movida iguais aos de antes, o arquivo movido para fora e o alias.
- Nenhuma asserção existente mudou: o diff do arquivo só troca as duas linhas de import (acrescenta
  `rmdirSync` e `INTEGRATIONS_CLI`) e acrescenta código no fim.

### Mudanças colaterais de comportamento, provadas

- Staging trocado durante a instalação: antes 0 (gravação/promoção através do link, exclusão de cópias)
  ou 5 (`ENOTDIR`/`ENOENT`); agora 4 `config_changed_during_apply` no staging (`I4-C34i`). Troca entre a
  leitura do plano e o início da limpeza: de `foreign_artifact` para `config_changed_during_apply` (por
  leitura; sem linha dedicada).
- Pasta do plugin surgida depois do plano: antes 0 (diretório vazio no POSIX; arquivo no Windows) ou 4
  com o staging limpo e promoção tentada; agora 4 sem promoção e com o staging próprio no lugar
  (`I4-C34j`). A instalação seguinte, com o caminho livre, limpa a sobra (controle já existente de
  `I4-C34`).
- Raiz ou ancestral trocados: antes efeitos na pasta movida e 4 tardio por `.skill-me`/`plugins` (ou 5
  com o temporário apagado através da troca); agora 4 `target_escape .` antes do efeito (`I4-C27d`).
- Configuração trocada por link de arquivo para fora durante a aplicação: antes lida através do link e
  0 (link substituído ou apagado); agora 4 `target_escape` no arquivo (`I4-C27d`, WSL).
- Aplicação sem troca: até 3 conferências a mais por efeito (`lstat`/`realpath`/`stat` da raiz,
  `lstat`/`realpath` do arquivo); nenhuma leitura de conteúdo nova; resultados dos testes anteriores iguais.

### Contagens reais em `e570541`

Um batch por plataforma: `node --test --test-reporter=tap "tests/integrations/**/*.test.mjs"
scripts/governance-ci.test.mjs scripts/code-review/review.test.mjs`. Windows: worktree com HEAD
`e570541` e `git diff --quiet e570541 -- src tests docs scripts package.json package-lock.json`,
executado fora do sandbox pelos testes de timeout/taskkill do motor (só processos dos próprios testes),
Hermes nativo pelo helper (`python -I -B`, HERMES_HOME e HOME/APPDATA/TEMP temporários, sem modelo). WSL:
distro `Ubuntu` explícita, Node 24.13.0, `git -c core.autocrlf=false archive e570541` (SHA-256
`b8575dea…8470da0a`) no ext4 (`/tmp/skillme-r7-batch-e570541`), 140 arquivos de `src`, `tests`,
`scripts`, `docs`, `package.json` e `package-lock.json` iguais aos blobs sem normalização, `env -i` só com
`PATH`; exit do próprio `wsl.exe`. Nenhum spawn lendo por `/mnt/c`.

| Execução | tests | pass | fail | cancelled | skipped | todo | exit | duração |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Windows 11, Node 24.21.0 — integrações 79 + governança 6 + motor 16 | 101 | 99 | 0 | 0 | 2 | 0 | 0 | 33 s |
| WSL — integrações 79 + governança 6 + motor 16 | 101 | 93 | 0 | 0 | 8 | 0 | 0 | 17 s |

Cruzamento das 54 linhas `Proof:` com os TAPs (`round7-proofs-vs-batch-{windows,wsl}-e570541.txt`, mesmo
script das rodadas anteriores; cada padrão casou exatamente um teste executado, declarado no arquivo da
prova): Windows 53 PASS + `I4-C15` SKIP; WSL 46 PASS + 8 SKIP. Fora das linhas `Proof:` (47, todos
executados): 16 do motor, 5 de governança e 26 de integração — os 23 anteriores e os novos `I4-C34i`,
`I4-C34j`, `I4-C27d` (+3 em relação aos 98 de `8ef51d8`). Skips e motivos:

- Windows (2): `I4-C15` `posix-signals` e `I4-C25b` `posix-modes` (passam no WSL). Diagnósticos de link
  de arquivo (EPERM sem privilégio): os 15 anteriores e as 3 linhas novas de `I4-C27d` — executadas no
  WSL, sem diagnóstico.
- WSL (8): `I4-C18..C23`, `I4-C37`, `I4-C44b` `hermes-runtime-ausente`: prova nativa do Hermes só no
  Windows (executada nesse batch, 8 PASS); Linux **pendente**.
- Medição C38: Windows 828 ms depois do filho, 65536 bytes no pipe; WSL 808 ms, 146176 bytes.
- GREEN intermediário (antes do commit, cópia WIP): suítes de instalação, 38 testes — Windows 37 pass/1
  skip (`posix-modes`), WSL 38/38 (`round7-green-install-suites-*-wip.tap`).
- `I4-C29` não foi repetido em laço: no caminho concorrente só entram, sob o lock, conferências de
  metadado da raiz e do arquivo (`lstat`/`realpath`/`stat`), sem `rename`, exclusão ou leitura nova que
  disputem com os leitores das outras execuções; passou nos dois lotes. Sem mutações adicionais (não
  exigidas no `light`): cada linha nova falhou no produto antigo.
- Doctor (417) não reexecutado: nenhum arquivo do doctor, dos módulos reutilizados, de `scripts/`,
  `code-review.config.json`, `package.json`/lock ou `AGENTS.md` mudou desde `2e7fd75` (`I4-C45`, no
  lote, confere a interface do doctor com as integrações instaladas).

### Nota do coordenador (`coordinator-formal3-residuals.md`) — confirmação e fechamento

- **Pasta própria do staging trocada durante sua limpeza:** confirmado e reproduzido (`I4-C34i`, linhas
  da sobra própria): cópias exatas de outra pasta do alvo apagadas através da junção/link e a junção
  removida pelo `rmdir` no Windows (0); no POSIX, 5 depois das exclusões. Fechado em `e570541`.
- **Ressalvas finais do autor:** (a) `settings.json`/`hooks.json` sem referência contra a troca de um
  ancestral da raiz — confirmado como defeito do AC6 (R7-F3), reproduzido e fechado (`I4-C27d`); a
  formulação anterior "fora dos ancestrais compartilhados dos achados" fica como histórico. (b) `stat`
  no `catch` do `rename` do staging com `plugins` trocada — mantido como limite de metadado, como julgou
  o Verifier7; a conferência nova do destino fica antes do `try`, sem levar mais casos a esse ramo.
  (c) conflito no meio do passo `artifacts` sem o passo listado e com `applied: false` — semântica
  anterior mantida (não há 0 falso; 4 continua distinto de 5).
- **Mesmo lifecycle do staging:** (a) staging virando link depois da criação ou de um artefato gravado —
  confirmado e reproduzido (gravação fora do alvo, link promovido, registro gravado, 0); fechado.
  (b) pasta do plugin vazia surgida depois do plano — confirmado no POSIX nativo e, pela emulação
  declarada, no Windows; o Windows nativo também substituía um **arquivo** do usuário nesse caminho.
  Fechado pela conferência antes da promoção.

### Examinado e não alterado (limites e resíduos)

- Janela não atômica entre cada conferência nova e o syscall; outro diretório real posto no mesmo
  caminho (raiz, staging, pasta do plugin) e arquivo com bytes idênticos não se distinguem.
- Raiz trocada por um **arquivo** regular: por leitura, a conferência da raiz responde
  `config_changed_during_apply` em `.` antes do efeito; a liberação do lock pela pasta de estado pode
  então terminar com E/S no POSIX (`ENOTDIR` no `lstat` através do arquivo → passo `lock: failed`, 5,
  lock mantido, regra de R5) e, no Windows, provavelmente como conflito do lock. Não testado nem
  executado (dependente de plataforma; nenhum efeito através da troca pela leitura do fluxo).
- A prévia (fora do lock) confere a contenção uma vez antes das leituras; uma troca entre a leitura da
  configuração e a do registro na prévia não é reconferida (só leitura, sem efeito; a aplicação
  reconfere sob o lock). As leituras do estado Hermes sob o lock seguem a referência de `plugins`
  conferida no início da leitura (desenho da rodada formal 3).
- `rmdir` vazio de `.skill-me` depois de liberar o lock e de `plugins` no fim da remoção: syscalls
  seguidos à última conferência (janela), inalterados.
- `mkdir` do staging com `EEXIST` (entrada posta entre o plano e o `mkdir`): continua 5, sem nada
  gravado através dela; não reclassificado.
- `stat` no `catch` do `rename` do staging, conflito no meio de `artifacts`, staging real com artefato
  alterado antes da promoção, `settings.json` como symlink contido, remoções concorrentes de
  `.skill-me`, diretório gerenciado que seja link: limites já registrados, inalterados.
- Hermes nativo só no Windows; Linux pendente; macOS só pela CI; E2E real dos três agentes pendente.

### Sobras próprias desta rodada (preservadas)

Nenhum `rm` nem limpeza opaca. Windows `%TEMP%\skill-me-r7\`: `probes/` (`wsl-copy.sh`, `wsl-run.sh`,
`verify-blobs.sh`, `proofs-vs-batch.mjs` copiados/adaptados da rodada anterior), `red-8ef51d8/` (cópia
RED), `8ef51d8-lf.tar`, `851c3bd-lf.tar`, `e570541-lf.tar`, listas de blobs, `results/` e o rascunho desta
seção. WSL `/tmp`: `skillme-r7-{red-8ef51d8,red2-8ef51d8,wip1,batch-e570541,probes}` e
`skillme-r7-blobs-{8ef51d8,e570541}.txt`. Scratches dos testes: removidos pelo `after()` existente (só
diretórios de `makeScratch`, caminho absoluto sob o TEMP; as junções/symlinks criados apontam para
dentro do próprio scratch da linha); nenhum `skill-me i4 r7 …` restou nas duas plataformas. Restam no
TEMP do Windows 11 scratches `skill-me i4 failure-*`/`lstat-check` de 16/10 e 17/10 09:53, anteriores a
esta rodada e não criados por ela — não tocados. Cópias locais (ignoradas) em
`.checks/code-review/issue-4/round7-*`. Scratches de Verifiers, recovery e histórico formal não foram tocados.

### Privacidade e ambiente

Nenhum `process.env`, token, credencial ou valor de ambiente impresso. Testes com conteúdo sintético; os
TAPs registram códigos, conflitos, passos, tipos, rótulos de conteúdo reconhecido e caminhos sintéticos,
nunca conteúdo de configuração. Nenhuma instalação em perfil pessoal; nenhum diretório gerenciado real
acessado; todos os `--target` em temporários; nenhum agente, modelo, download ou E2E; nenhum
bypass/confiança concedido; nenhum subagente; nenhuma operação recusada pela plataforma nesta rodada.

## Correção da verificação independente round 8 — acesso do temporário conferido antes da gravação (17/10/2026)

Builder: Claude (tlc-implement `light`), mesma entrega. Partida em `006bd5d` (só o relatório
independente 8 e o Handoff desde `ef341c6`; produto e testes = `e570541`, `git diff --quiet e570541
006bd5d -- src tests docs scripts package.json package-lock.json` verdadeiro), checkout limpo, HEAD do
despacho conferido; SHA-256 do relatório rastreado e da cópia ignorada `verifier-round8-report.md`
iguais (`8a9cfb5f…5110b5b9`, 125567 bytes); `.verified.md` não foi alterado. Esta seção é evidência do
autor, **não é verificação independente** nem revisão formal: nenhum `review:run`/`review:check`/
`pr:create`/push/PR/merge/Verifier foi executado; contadores, override, estado do motor (3 de 10
tentativas formais) e histórico não foram tocados; scratches de Verifiers e recovery não foram lidos nem
mexidos. A sonda adicional interrompida na rodada 6 (`verifier-residual-probe.mjs`) **não** foi
executada, recriada nem substituída, e não houve sonda ad hoc: a prova é a regressão versionada; os
auxiliares desta rodada (`%TEMP%\skill-me-r8\probes`, copiados da rodada 7 trocando só o prefixo para
`skillme-r8-`) só copiam, rodam e conferem blobs e cruzam `Proof:` com TAP, sem cenário de produto
próprio. Commits: `9a1e122` (Landing, antes do código), `b197650` (correção, regressão e guia) e o desta
evidência. `git diff --name-only 006bd5d..b197650`: `.checks/issue-4-integracoes.md` (uma linha de
Landing), `docs/agent-observation.md`, `src/integrations/install/{io,run}.mjs` e
`tests/integrations/install-apply.unit.test.mjs`; nada em doctor, `scripts/`, configuração do motor,
dependências, `AGENTS.md`, task, helpers de teste ou `.verified.md`.

**Classificação.** R8-F1 é o achado bloqueante do Verifier8 (C25/C25b, AC6), estabelecido por **leitura
estática**, sem reprodução, sonda ou execução específica pelo Verifier. Agora foi **reproduzido** pela
regressão nova no produto intacto `006bd5d` (= `e570541`) no WSL (POSIX), só com dados sintéticos dentro
do scratch de cada linha: o texto calculado da configuração lida `0600` (com um canário sintético no
lugar de um segredo) foi gravado num temporário `0644` — grupo e "outros" ganhavam leitura — antes de a
comparação recusar com 4 e apagar o temporário. Isso valeu para arquivo regular diferente `0644` contido
no alvo e para link para documento `0644` fora do alvo, nos dois instantes anteriores à conferência
(logo depois da leitura do registro sob o lock e imediatamente antes do `stat` do acesso), também na
remoção do Codex. Nenhum outro usuário, `sudo`, arquivo privado real ou leitura por terceiro: a
exposição é o estado do temporário observado pelo próprio teste. No Windows (ACL; o modo POSIX não se
aplica) o produto antigo também gravava o conteúdo lido no temporário depois da troca, antes do
conflito. Não é escopo novo.

### Reprodução RED no produto `006bd5d` (cópias isoladas próprias)

- Windows: `git -c core.autocrlf=false archive 006bd5d` (SHA-256 `c873f7ec…f1ea35e4`) extraído em
  `%TEMP%\skill-me-r8\red-006bd5d` + `node_modules`; 61 arquivos de `src` e dos helpers de teste iguais
  aos blobs de `006bd5d` (os mesmos de `e570541`) **sem** normalização; teste sobreposto com o blob
  commitado em `b197650` (`832a9502…`).
- WSL (distro `Ubuntu` explícita, 24.04.3, Node 24.13.0, ext4, `env -i` só com `PATH`): mesmo tar em
  `/tmp/skillme-r8-red-006bd5d`, 62 blobs conferidos (os 61 + o teste).
- Resultado nas duas: `install-apply.unit` **19 tests, 18 pass, 1 fail** — só `I4-C25f`, por diff de
  asserção (`ERR_ASSERTION`); as 18 anteriores passam (`round8-red-tests-{windows,wsl}-006bd5d.tap`). O
  diff toca só `requested` e `temp`: 6 linhas no WSL e 4 no Windows (as linhas de link e de modo não rodam
  lá); as outras 7 linhas são iguais no produto antigo e no corrigido (janela residual, nova tentativa e
  controles). RED de desenvolvimento, antes do commit, com a versão do teste anterior à troca de redação
  do rótulo (`antes da acesso do original`): Windows no worktree (só console) e WSL
  (`round8-red-new-wsl-006bd5d-wip.tap`), mesmas linhas divergentes.

Valores observados (WSL \| Windows), contra `b197650` (iguais nas duas, salvo as colunas "ACL" no Windows):

| `I4-C25f` (configuração lida `0600` com canário) | `006bd5d` | `b197650` |
| --- | --- | --- |
| Claude install, arquivo regular diferente `0644`, logo depois da leitura do registro sob o lock | `4 config_changed_during_apply` **depois** de gravar o temporário: acesso pedido `0644`, temporário `0644` com o canário, grupo e "outros" ganham acesso; apagado em seguida \| temporário com o canário (ACL) | `4` sem criar o temporário; substituto `0644` e configuração lida `0600` intactos |
| idem, imediatamente antes de obter o acesso do original (`accessOf`) | igual \| igual | igual |
| Claude install, link para documento externo `0644`, nos mesmos dois instantes | `4 target_escape settings.json` depois de gravar o temporário `0644` com o canário \| não executado (EPERM) | `4 target_escape` sem temporário; link, externo `0644` e configuração lida `0600` intactos |
| Codex uninstall, arquivo regular diferente `0644`, antes do `accessOf` | `4` depois do temporário `0644` com o canário \| temporário com o canário | `4` sem temporário; registro (6) intacto |
| Claude install sem configuração, arquivo do usuário posto logo depois da leitura do registro | `4` depois de criar e apagar o temporário com o texto próprio (sem canário) \| igual | `4` sem temporário (mudança colateral, abaixo) |
| janela residual: troca (arquivo regular; link só no WSL) imediatamente antes de criar o temporário | temporário `0600` (acesso conferido) com o canário, `4`, temporário apagado, sem `rename` | igual |
| acesso do próprio arquivo ampliado para `0644` imediatamente antes de criar o temporário | temporário `0600`, `4` pela comparação de acesso | igual (só WSL) |
| rename negado (EPERM) e arquivo trocado antes da nova tentativa | `0600` depois da gravação e antes do `rename`, `4`, 1 tentativa | igual |
| controles: Claude install, Codex uninstall, Claude install sem configuração | `0`; `0600` nos dois instantes; arquivo final `0600` (configuração original restaurada no Codex) | igual |

### Correção (`run.mjs`, `io.mjs`; linha de Landing de `9a1e122`)

- `replaceChecked` (`run.mjs:359`): com a configuração lida presente, `configContained` (raiz e contenção
  do arquivo) e só então `accessBeforeReplace` (`:363`), o acesso que o temporário recebe. `stillAsRead`
  (`:365`) é a conferência que já vinha no `beforeRename` — raiz e contenção, releitura com o SHA-256 da
  leitura sob o lock e modo/dono/grupo iguais ao obtido —, agora chamada **antes de criar o temporário**
  (`:372`) e passada como `beforeRename` de `writeViaTemp` (cada tentativa, inclusive as novas por
  `EPERM`/`EACCES`/`EBUSY`). A comparação de acesso passa a usar `accessBeforeReplace` (sumiu → 4), como a
  primeira leitura. Configuração ausente na leitura: `like` nulo e a mesma conferência (continua
  ausente) antes do temporário.
- Nenhum outro efeito mudou: `writeViaTemp`, `matchAccess`/`replacementMode`, a limpeza do `catch` e o
  registro ficam como estavam; em `io.mjs` e no comentário de `configContained` em `runJsonAgent`
  (`:511`) só o registro de que o acesso é o conferido.
- Guia (`docs/agent-observation.md`, parágrafo da reescrita POSIX): acesso do arquivo conferido antes de
  criar o temporário; troca depois da leitura → 4 sem gravar; Windows com a mesma conferência.

### Regressão (`tests/integrations/install-apply.unit.test.mjs`)

- **`I4-C25f`** (asserção em `:2406`) — 13 linhas (6 trocas antes da conferência, 4 depois dela, 3
  controles), pela API pública `runIntegrationCommand` com io real instrumentado (`accessSwapIo`,
  `:2192`) que dispara a troca dentro do comando: logo depois da 2ª leitura do registro (a sob o lock),
  imediatamente antes do 1º `accessOf` da configuração, imediatamente antes de criar o temporário ou na
  1ª tentativa de `rename` (EPERM). O io registra o acesso pedido a `writeExclusive` (`like`) e, depois
  da gravação real e antes de cada `rename`, modo, grupo e se o canário está no temporário; quem ganhou
  acesso é calculado por `widenedRecipients` (helper existente) sobre o original `0600`. Afirma troca
  ocorrida, código, `status`, `applied`, conflito exato, erros, passos, tentativas de `rename`,
  **nenhum acesso pedido nem temporário com conteúdo nas 6 trocas antes da conferência**, temporário só
  com `0600` e nenhum destinatário ampliado nas demais, o que fica no caminho da configuração
  (substituto, link, arquivo do usuário, configuração com N eventos, configuração original) com o modo,
  a configuração lida movida com bytes e `0600`, o documento externo com bytes e `0644`, temporário
  ausente no fim, registro e lock liberado.
- Por que o modo depois da gravação basta: `writeExclusive` cria só com os bits de dono e aplica
  grupo/modo antes do conteúdo (os quatro instantes já provados em `I4-C25b`); nada muda o modo depois —
  o instante observado é o mais amplo em que o temporário tem conteúdo.
- Discriminação (por leitura, sem mutações executadas — não exigidas no `light`): conferir só a
  contenção antes do `stat` deixaria as linhas de arquivo regular e a de link "antes do `accessOf`" com o
  temporário `0644`; comparar o conteúdo e só depois ler o acesso deixaria as linhas "antes do
  `accessOf`" com o acesso do substituto. As duas alternativas rejeitadas no Landing falham nesta tabela.
- Plataformas: 13 linhas no WSL; 9 no Windows, com colunas de acesso "ACL" e `t.diagnostic` para as 3 de
  link de arquivo (EPERM sem privilégio) e a de modo POSIX. Não há PASS de modo POSIX no Windows: lá o
  teste afirma só código, conflito, temporário (existência e canário) e arquivos.
- Nenhuma asserção existente mudou: o diff do arquivo troca a linha de import (acrescenta `chmodSync`) e
  acrescenta código no fim. Nenhum helper alterado.

### Mudanças colaterais de comportamento, provadas

- Configuração trocada (arquivo regular, link) entre a leitura sob o lock e a conferência: antes,
  temporário gravado com o acesso do substituto e 4 depois; agora 4 sem temporário (`I4-C25f`).
- Configuração ausente na leitura e arquivo posto antes da conferência: antes, temporário criado com o
  texto próprio e apagado, 4; agora 4 sem criar o temporário (`I4-C25f`).
- Configuração removida entre a releitura e o `stat` da conferência: antes 5 (`ENOENT` no
  `beforeRename`); agora 4 `config_changed_during_apply` (`accessBeforeReplace`). Só por leitura; não
  testado (exige remoção exatamente entre dois syscalls).
- Aplicação sem troca: uma conferência a mais antes do temporário — contenção (`lstat`/`realpath`/`stat`
  da raiz, `lstat`/`realpath` do arquivo) duas vezes, uma releitura limitada da configuração e um
  `stat` a mais; resultados dos testes anteriores iguais. A releitura nova roda sob o lock, antes de
  criar o temporário, e não mantém o arquivo aberto durante o `rename`.

### Contagens reais em `b197650`

Um batch por plataforma: `node --test --test-reporter=tap "tests/integrations/**/*.test.mjs"
scripts/governance-ci.test.mjs scripts/code-review/review.test.mjs`. Windows: worktree com HEAD
`b197650` e `git diff --quiet b197650 -- src tests docs scripts package.json package-lock.json`,
executado fora do sandbox pelos testes de timeout/taskkill do motor (só processos dos próprios testes),
Hermes nativo pelo helper (`python -I -B`, HERMES_HOME e HOME/APPDATA/TEMP temporários, sem modelo). WSL:
distro `Ubuntu` explícita (24.04.3), Node 24.13.0, `git -c core.autocrlf=false archive b197650` (SHA-256
`358779f9…d883c502`) no ext4 (`/tmp/skillme-r8-batch-b197650`), 140 arquivos de `src`, `tests`,
`scripts`, `docs`, `package.json` e `package-lock.json` iguais aos blobs sem normalização, `env -i` só com
`PATH`; exit do próprio `wsl.exe`. Nenhum spawn lendo por `/mnt/c`.

| Execução | tests | pass | fail | cancelled | skipped | todo | exit | duração |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Windows 11, Node 24.21.0 — integrações 80 + governança 6 + motor 16 | 102 | 100 | 0 | 0 | 2 | 0 | 0 | 33 s |
| WSL — integrações 80 + governança 6 + motor 16 | 102 | 94 | 0 | 0 | 8 | 0 | 0 | 17 s |

Cruzamento das 54 linhas `Proof:` com os TAPs (`round8-proofs-vs-batch-{windows,wsl}-b197650.txt`, mesmo
script das rodadas anteriores; cada padrão casou exatamente um teste executado, declarado no arquivo da
prova): Windows 53 PASS + `I4-C15` SKIP; WSL 46 PASS + 8 SKIP. Fora das linhas `Proof:` (48, todos
executados): 16 do motor, 5 de governança e 27 de integração — os 26 anteriores e o novo `I4-C25f` (+1
em relação aos 101 de `e570541`). Skips e motivos:

- Windows (2): `I4-C15` `posix-signals` e `I4-C25b` `posix-modes` (passam no WSL). Diagnósticos de link
  de arquivo (EPERM sem privilégio): os 18 anteriores e as 3 linhas de link de `I4-C25f`; mais a linha de
  modo de `I4-C25f` e o aviso das colunas "ACL" — tudo executado no WSL, sem diagnóstico.
- WSL (8): `I4-C18..C23`, `I4-C37`, `I4-C44b` `hermes-runtime-ausente`: prova nativa do Hermes só no
  Windows (executada nesse batch, 8 PASS); Linux **pendente**.
- Medição C38: Windows 833 ms depois do filho, 65536 bytes no pipe; WSL 808 ms, 146176 bytes.
- GREEN intermediário (antes do commit, cópia WIP): suítes de instalação, 38 testes — Windows 37 pass/1
  skip (`posix-modes`), WSL 38/38 (`round8-green-install-suites-*-wip.tap`).
- `I4-C29` não foi repetido em laço: no caminho concorrente só entram, sob o lock e antes do temporário,
  uma conferência de metadado, uma releitura limitada e um `stat`; nada novo disputa o `rename`; passou
  nos dois lotes.
- Doctor (417) não reexecutado: nenhum arquivo do doctor, dos módulos reutilizados, de `scripts/`,
  `code-review.config.json`, `package.json`/lock ou `AGENTS.md` mudou desde `006bd5d` (`I4-C45`, no
  lote, confere a interface do doctor com as integrações instaladas).

### Nota do coordenador (`coordinator-replace-access-order.md`) — confirmação e fechamento

- **Link para fora (`accessOf` seguia o link antes de `configContained`):** confirmado e reproduzido no
  WSL (linhas de link de `I4-C25f`: acesso pedido `0644` do externo, temporário `0644` com o canário antes
  do `target_escape`). Nenhum preflight anterior eliminava o cenário: a contenção sob o lock vinha antes
  da leitura, e a guarda da raiz em `writeViaTemp` não olha o arquivo. A última validação relevante antes
  da gravação era só essa guarda da raiz; apagar depois não atende C25b. Fechado em `b197650`.
- **Variante do arquivo REGULAR (contenção passa; hash comparado só depois da escrita):** confirmada e
  reproduzida (linhas de arquivo regular, inclusive Codex); fechada pela conferência antes do temporário.
- **`stat` isolado:** continua possível só entre a conferência de contenção e o `stat` do acesso (link
  posto nesse intervalo) — só metadado, recusado pela conferência seguinte, sem gravação; registrado
  como limite, sem política nova de permissões nem privacidade da #5. Nota encerrada.

### Examinado e não alterado (limites e resíduos)

- Janela não atômica entre a última conferência e a criação do temporário/o `rename`: uma troca nesse
  intervalo encontra o temporário com o acesso conferido — nunca o do substituto — e é recusada antes do
  `rename` (linhas de janela residual e de nova tentativa de `I4-C25f`). Duas trocas exatas entre os
  syscalls das conferências (substituto no `stat`, original na releitura, substituto de novo no `stat`
  seguinte) não se distinguem sem CAS/inode.
- `stat` do acesso segue um link posto entre a conferência de contenção e ele: metadado de fora do alvo,
  sem gravação; a conferência seguinte recusa com `target_escape`.
- Acesso mudado pelo dono no próprio arquivo entre a leitura sob o lock e o `stat`: é o acesso do
  documento substituído e o temporário o recebe (não amplia sobre ele); depois do `stat`, 4 (linha de
  acesso ampliado de `I4-C25f`). Registrado no Landing (alternativa "guardar o acesso na leitura sob o
  lock" rejeitada); sem linha dedicada para o intervalo anterior.
- Configuração removida entre a releitura e o `stat`: agora 4, só por leitura.
- Windows: o temporário recebe a ACL herdada do diretório (limite já declarado); a ordem nova só evita
  gravar o conteúdo lido depois de uma troca.
- Limites anteriores inalterados: link inicial contido vira arquivo regular; bytes idênticos; outro
  diretório real no mesmo caminho; prévia sem reconferência entre as próprias leituras; `stat` no `catch`
  do staging; passos parciais de `artifacts`; raiz trocada por arquivo; `mkdir` do staging com `EEXIST`;
  Hermes nativo só no Windows (Linux pendente); macOS só pela CI; E2E real pendente.

### Sobras próprias desta rodada (preservadas)

Nenhum `rm` nem limpeza opaca. Windows `%TEMP%\skill-me-r8\`: `probes/` (`wsl-copy.sh`, `wsl-run.sh`,
`verify-blobs.sh`, `proofs-vs-batch.mjs` e listas de blobs), `red-006bd5d/` (cópia RED),
`006bd5d-lf.tar`, `9a1e122-lf.tar`, `b197650-lf.tar`, `blobs-006bd5d-src-helpers.{raw,txt}`, `results/`
e o rascunho desta seção. WSL `/tmp`: `skillme-r8-{wip-red,wip-green,red-006bd5d,batch-b197650,probes}`.
Scratches dos testes: removidos pelo `after()` existente (só diretórios de `makeScratch`, caminho
absoluto sob o TEMP; os links criados apontam para dentro do próprio scratch da linha); nenhum
`skill-me i4 r8 …` restou nas duas plataformas. Os scratches `skill-me i4 failure-*`/`lstat-check`
anteriores a esta rodada continuam no TEMP do Windows, não tocados. Cópias locais (ignoradas) em
`.checks/code-review/issue-4/round8-*`. Scratches de Verifiers, recovery e histórico formal não foram
tocados.

### Privacidade e ambiente

Nenhum `process.env`, token, credencial ou valor de ambiente impresso. Canário e documentos sintéticos;
os TAPs registram códigos, conflitos, passos, modos, rótulos de conteúdo reconhecido, se o canário está
no temporário (booleano) e caminhos sintéticos, nunca conteúdo de configuração (o canário não aparece em
nenhum TAP desta rodada). Nenhum outro usuário, `sudo`, arquivo privado real ou perfil pessoal; nenhum
diretório gerenciado real acessado; todos os `--target` em temporários; nenhum agente, modelo, download
ou E2E; nenhum bypass/confiança concedido; nenhum subagente; nenhuma operação recusada pela plataforma
nesta rodada (o batch do Windows rodou fora do sandbox, como nas rodadas anteriores, pela capacidade de
`taskkill` dos próprios testes do motor).

## Correção da revisão formal round 4 — DACL do temporário no Windows (17/10/2026)

Builder: Claude (tlc-implement `light`), mesma entrega. Partida em `58ed596` (HEAD do despacho, limpo; desde
`8a8f992` só checklist e relatórios; produto e testes = `b197650`, `git diff --quiet b197650 58ed596 -- src tests
docs scripts package.json package-lock.json` verdadeiro). Relatório formal autêntico
`.checks/code-review/issue-4/formal-round4-report.json` lido e não reescrito (SHA-256 `f14f0052…`);
`.verified.md` não foi alterado. Esta seção é evidência do autor, **não é verificação independente** nem
revisão formal: nenhum `review:run`/`review:check`/`pr:create`/push/PR/merge/Verifier foi executado;
contadores, override, estado do motor (4 de 10 tentativas formais) e histórico não foram tocados; scratches de
Verifiers e recovery não foram lidos nem mexidos. A sonda adicional interrompida na rodada 6
(`verifier-residual-probe.mjs`) **não** foi executada, recriada nem substituída, e não houve sonda ad hoc do
produto: a prova é a regressão versionada. Antes de escolher a forma, como o despacho pediu ("verificar
comportamento real antes de usar"), o comportamento das APIs do Windows foi conferido em
`%TEMP%\skill-me-f4\probes\api-check.mjs`, `api-check2.mjs` e `helper-check.mjs`: só criam arquivos sintéticos
num scratch privado, aplicam e leem DACLs pelo PowerShell do Windows e imprimem SDDL com o SID do usuário
trocado por rótulo; não importam nem executam o produto. Os auxiliares de cópia, execução no WSL, conferência
de blobs e cruzamento `Proof:`×TAP (`wsl-copy.sh`, `wsl-run.sh`, `verify-blobs.sh`, `proofs-vs-batch.mjs`)
são os da rodada 8 com o prefixo trocado para `skillme-f4-`. Commits: `316dec6` (Landing, antes do código),
`e513af7` (correção, regressões e guia) e o desta evidência. `git diff --name-only 58ed596..e513af7`:
`.checks/issue-4-integracoes.md` (uma linha de Landing), `docs/agent-observation.md`,
`src/integrations/install/{io,run,windows-access}.mjs`, `tests/integrations/helpers/{fs-probe,windows-acl}.mjs`,
`tests/integrations/{install-apply.unit,install-permissions.cli,windows-access.unit}.test.mjs`; nada em doctor,
`scripts/`, configuração do motor, dependências, `AGENTS.md`, task ou `.verified.md`.

**Classificação.** O P1 da revisão formal 4 (`io.mjs:71`, AC6/C25) foi estabelecido por **leitura estática**,
sem execução pela revisão. Agora foi **reproduzido por execução** no produto intacto `58ed596` (= `b197650`),
no Windows, só com dados sintéticos dentro do scratch de cada linha: com `settings.json`/`hooks.json` de DACL
protegida só do usuário do teste (canário sintético no lugar de um segredo) numa pasta que concede a
"Usuários" leitura herdável por arquivos, `install --apply` e `uninstall --apply` saem 0, o temporário com o
canário concede leitura a "Usuários" desde a criação (instantes `created`, `before_content`, `after_content`,
`before_rename`) e o arquivo final fica com a DACL herdada, sem proteção — a configuração antes só do usuário
passa a ser legível por "Usuários". Também sem detecção: a DACL ampliada pelo dono depois da conferência
(antes de criar o temporário ou antes da nova tentativa de um rename negado) não era comparada (`accessOf`
devolvia `null`) e o comando saía 0. A exposição é o estado observado pelo próprio teste; nenhum outro usuário
leu nada. Não é escopo novo: é o AC6 já aprovado.

### Mecanismo e fontes

- Node não expõe DACL. Mecanismo: PowerShell do Windows 5.1 (componente do sistema; aqui `5.1.26100.9711`, CLR
  `4.0.30319.42000`, `FullLanguage`) em `%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -NoLogo
  -NoProfile -NonInteractive -Command <script fixo>`, só com tipos .NET. Nenhuma dependência nova, download,
  compilação ou elevação.
- Fontes primárias (Microsoft Learn, consultadas nesta rodada): "File Security and Access Rights" — com
  `lpSecurityAttributes` nulo o arquivo recebe o descritor padrão, cujas ACLs são herdadas da pasta, "assigned
  only when a file or directory is newly created, and not when it is renamed or moved", e o acesso é concedido
  na entrega do handle; construtor `FileStream(String, FileMode, FileSystemRights, FileShare, Int32,
  FileOptions, FileSecurity)` do .NET Framework 2.0–4.8.1 ("determines the access control and audit security
  for the file"); `about_PowerShell_exe` (5.1) — com `-Command` em string, "all arguments following it are
  interpreted as part of the command to execute". As páginas de `Get-Acl`/`Set-Acl` indicadas pelo coordenador
  não foram usadas (abaixo).
- Constatado em execução (scratch sintético, antes do código): `FileStream(CreateNew, …, FileSecurity)` cria o
  arquivo já com a DACL passada; com DACL explícita na criação a pasta **não** mescla entradas herdáveis; o
  `rename` mantém a DACL do temporário; o handle da criação escreve mesmo com DACL só de leitura;
  `RawSecurityDescriptor` com a flag `Inherited` limpa (`AceFlags & 0xEF`) e a DACL protegida reproduz a mesma
  lista ordenada, inclusive fora da ordem canônica; `SetAccessRuleProtection($true,$true)` deixa ACEs marcadas
  como herdadas dentro da DACL protegida; HResults estáveis (`0x80070002` ausente, `0x80070050` existe);
  chamada típica 0,15–0,3 s. Com o `PSModulePath` herdado do ambiente (PowerShell 7 no caminho), o Windows
  PowerShell falha ao carregar `Microsoft.PowerShell.Security` (`Get-ExecutionPolicy`/`Get-Acl`/`Set-Acl`) —
  por isso nenhum cmdlet.

### Correção (`windows-access.mjs`, `io.mjs`, `run.mjs`; linha de Landing de `316dec6`)

- `src/integrations/install/windows-access.mjs` (novo; só o efeito de processo e o mapeamento da saída):
  `readDacl(file)` (`:93`) devolve a SDDL da seção `Access` (`[IO.File]::GetAccessControl`), validada por
  `^D:[^\r\n]*$`; `createWithDacl(file, data, dacl)` (`:102`) cria com `FileStream(CreateNew, Write,
  FileShare.None, FileSecurity)` — mesmas ACEs, mesma ordem, explícitas, DACL protegida — e escreve e descarrega
  (`Flush(true)`) o conteúdo pelo handle da criação, depois de ler toda a entrada. Scripts fixos sem aspas
  duplas (`:38`, `:46`); caminho, DACL e conteúdo (base64) pelo stdin, uma linha cada; caminho ou DACL com
  quebra de linha é recusado sem processo. Saída: 0; `10` → `ENOENT`; `11` → `EEXIST`; qualquer outro código,
  processo não criado ou prazo de 20 s (`:17`) → `config_access_unavailable`. Mensagens fixas, stderr
  descartado, stdout só lido na leitura e validado.
- `io.mjs`: `accessOf` (`:67`) devolve `{ dacl }` no Windows; `writeExclusive` (`:82`) com `like` no Windows
  chama `createWithDacl` (`:83`); `sameAccess` (`:15`) — igualdade da forma de `accessOf` — passa a ser a
  comparação única das duas plataformas (antes, `run.mjs` comparava modo/dono/grupo, que no Windows comparariam
  `undefined`).
- `run.mjs`: importa `sameAccess` (`:6`, usada em `:370`); ordem de `replaceChecked` (`:359`) inalterada —
  raiz/contenção, acesso obtido, conferência antes de criar o temporário e antes de cada tentativa de `rename`,
  limpeza no `catch`. Uma falha de `accessOf`/`writeExclusive` com `config_access_unavailable` cai no `step`
  existente: 5, passo `config: failed`, nada gravado com outro acesso.
- Guia (`docs/agent-observation.md`): código 5 com `config_access_unavailable`; parágrafo do Windows
  (conferência, criação com a DACL, entradas explícitas e herança desligada, dono, SACL/rótulo, recusa e sobra).

### Regressões

- **`I4-C25g`** (`install-permissions.cli.test.mjs:217`, asserção `:323`) — CLI real com o instrumento
  `fs-probe.mjs` (no Windows registra a DACL rotulada do temporário em cada instante; com
  `SKILL_ME_TEST_FS_PROBE_NO_POWERSHELL=1` o `spawn` do PowerShell aponta para um executável inexistente — falha
  real de criação de processo). 19 linhas: 6 de fixture (arquivo novo na pasta herda "Usuários: leitura", 2
  ACEs herdadas) e 13 comandos — Claude e Codex com DACL protegida (instalar, instalar de novo, remover),
  configuração que herda da pasta (instalar e remover: mesmo acesso, DACL protegida explícita), configuração
  ausente (criada com a ACL herdada, sem conteúdo preexistente; remoção a apaga), PowerShell indisponível na
  instalação do Claude e na remoção do Codex (5 `config_access_unavailable`, passo `config: failed`, sem
  temporário, configuração com bytes e DACL, registro como estava, lock liberado). Afirma código, status,
  erros, passos, instantes do temporário, SIDs ampliados sobre a configuração lida em cada instante, canário,
  DACL final (protegida, acessos por SID, ACEs herdadas), SIDs ampliados no final, conteúdo, registro, lock e
  sobra de temporário.
- **`I4-C25h`** (`install-apply.unit.test.mjs:2462`, asserção `:2557`) — `runIntegrationCommand` com o io real
  de `accessSwapIo` (o do C25f, agora também com a DACL do temporário). 7 linhas: controles (instalação Claude,
  remoção Codex), DACL ampliada pelo dono imediatamente antes de criar o temporário (4, temporário com a DACL
  conferida, sem rename, apagado; a mudança do dono fica), rename negado (EPERM) e DACL ampliada antes da nova
  tentativa (4, 1 tentativa), documento com a ACL herdada posto imediatamente antes de obter o acesso (Claude
  instalação e Codex remoção: 4 sem temporário, documento posto e configuração movida com bytes e DACL) e
  falha de E/S no rename (5 `EIO`, temporário próprio apagado pelo `catch`). Afirma a DACL pedida ACE por ACE
  contra a da configuração lida, SIDs ampliados em cada instante, canário, conflitos, passos, tentativas,
  entradas e DACLs finais, registro e lock.
- **`I4-C25i`** (`windows-access.unit.test.mjs:45`, asserção `:140`) — contrato do módulo: leitura de DACL
  protegida, herdada e fora da ordem canônica (ACE por ACE); criação **sem conteúdo** já com a DACL — o estado
  anterior a qualquer conteúdo, protegida, explícita —; com conteúdo (bytes) e DACL só do usuário numa pasta
  que daria leitura a "Usuários"; ordem preservada; `EEXIST` sem mudar o arquivo; `ENOENT`; DACL inválida, com
  quebra de linha ou que não é DACL e PowerShell indisponível → `config_access_unavailable` sem criar nada;
  mensagens sem caminho nem canário.
- Helper novo `tests/integrations/helpers/windows-acl.mjs`: define e lê DACLs de arquivos sintéticos pelo
  PowerShell (tipos .NET), decompõe em ACEs (`RawSecurityDescriptor`) e compara acesso por SID (união das
  máscaras de permissão; ACE de negação → a prova falha em vez de aplicar o modelo). O SID do usuário vira
  "usuário do teste" dentro do PowerShell; conhecidos têm nome; outros, prefixo de hash. SID conhecido usado nas
  fixtures: `BU` (Usuários). Independente do produto: compara ACEs/SIDs, não a SDDL transmitida.
- Testes existentes alterados, com justificativa (nenhuma asserção enfraquecida):
  - `I4-C25f`: no Windows a coluna `requested` passa de `"nenhum"` (o produto não transmitia acesso — o limite
    que o achado recusa) para `"DACL da configuração lida"`, conferida ACE por ACE contra a DACL lida antes do
    comando; POSIX inalterado (`octal(like.mode)`). `accessSwapIo` registra o `like` inteiro e, no Windows, a
    DACL do temporário (campo extra não usado pelo C25f). No produto antigo só essa coluna diverge (4 linhas).
  - `I4-C29b`: o limite (< 1,5 s) passa a medir o comando menos o tempo de `accessOf`/`writeExclusive`. Motivo:
    a asserção substitui "esperas entre tentativas ≤ 630 ms" (linha de Landing da substituição negada); no
    Windows cada conferência agora é um processo do PowerShell (~0,25 s), sem relação com a espera, e o caso
    "sempre negado" faz 10. Uma espera longa no laço (sleep) continua contada. No POSIX os descontos são
    `stat`/`open`. Constatado: com a medida antiga o teste falhava só por isso no Windows — só a linha
    "sempre negado" passava de 1,5 s, todas as outras chaves iguais (GREEN de desenvolvimento,
    `f4-dev-green-integrations-windows-wip.tap`).
  - `I4-C25b`: só o texto do skip no Windows (aponta para `I4-C25g`).
  - `fs-probe.mjs`: aditivo (DACL no Windows; opção sem PowerShell).

### Reprodução RED no produto `58ed596` (cópias isoladas próprias)

- Windows: `git -c core.autocrlf=false archive 58ed596` (SHA-256 `2069f425…7f30f85`) extraído em
  `%TEMP%\skill-me-f4\red-58ed596` + `node_modules`; por cima, `git archive e513af7 --` dos 5 arquivos de
  teste (SHA-256 `e9bc7334…0fb11e83`; blobs `5bfd761a` install-apply, `12595e99` install-permissions,
  `5d6500c0` windows-access, `48fcc3f2` windows-acl, `a05713a6` fs-probe). 90 blobs (`src`,
  `tests/integrations`) conferidos sem normalização, 0 diferentes.
- Resultado (`f4-red-tests-windows-58ed596.tap`, três arquivos): **23 tests, 18 pass, 4 fail, 1 skip** — falham
  só `I4-C25f`, `I4-C25h` e `I4-C25g`, por diff de asserção (`ERR_ASSERTION`), e o arquivo
  `windows-access.unit.test.mjs` por `ERR_MODULE_NOT_FOUND` (o módulo é contrato novo, não regressão); skip
  `I4-C25b` (`posix-modes`); `I4-C29b` e os demais passam.
- WSL (distro `Ubuntu` explícita, 24.04.3, Node 24.13.0, ext4, `env -i` só com `PATH`): mesmos tars em
  `/tmp/skillme-f4-red-58ed596`, 90 blobs conferidos. **23 tests, 20 pass, 1 fail, 2 skip** — só o arquivo do
  módulo novo falha (import); `I4-C25f`, `I4-C25b` e `I4-C29b` passam no produto antigo (a barra POSIX dos
  testes alterados é a mesma); `I4-C25g`/`I4-C25h` em skip `windows-dacl` (`f4-red-tests-wsl-58ed596.tap`).
- RED de desenvolvimento antes do código: `I4-C25g` no worktree com o produto ainda sem correção, mesmas
  divergências (só console).

Valores observados no Windows (`58ed596` → `e513af7`):

| Linha | `58ed596` | `e513af7` |
| --- | --- | --- |
| C25g Claude/Codex, DACL protegida, instalar e remover | 0; temporário com canário concede "Usuários: leitura" em `created`, `before_content`, `after_content`, `before_rename`; final herdado, sem proteção, "Usuários: leitura" | 0; só `before_rename` observado (criado pelo PowerShell), sem SID ampliado; final protegido só com o usuário do teste |
| C25g instalar de novo | 0 `unchanged`; DACL final ampliada da instalação anterior | 0 `unchanged`; DACL protegida mantida |
| C25g configuração que herda da pasta | 0; sem SID ampliado; final herdado sem proteção | 0; sem SID ampliado; final com o mesmo acesso, explícito e protegido |
| C25g configuração ausente | 0; temporário (só conteúdo próprio) e final com a ACL herdada | igual |
| C25g PowerShell indisponível (instalar Claude, remover Codex) | 0 aplicado; temporário e final com "Usuários: leitura" | 5 `config_access_unavailable`, passo `config: failed`, sem temporário, configuração com bytes e DACL, registro como estava |
| C25h controles | 0; DACL pedida "nenhum"; temporário com "Usuários"; final herdado | 0; DACL pedida = a da configuração lida; temporário sem SID ampliado; final protegido só com o usuário |
| C25h DACL ampliada antes de criar o temporário | 0 aplicado (mudança não detectada); temporário com "Usuários" | 4, temporário com a DACL conferida, apagado, sem rename; a mudança do dono fica |
| C25h EPERM + DACL ampliada antes da nova tentativa | 0 depois de 2 tentativas | 4, 1 tentativa, temporário apagado |
| C25h documento posto antes de obter o acesso | 4 sem temporário (conteúdo) | igual |
| C25h falha de E/S no rename | 5 `EIO`; temporário com "Usuários" apagado | 5 `EIO`; temporário com a DACL conferida apagado |

### Mudanças colaterais de comportamento, provadas

- Configuração reescrita no Windows fica com DACL protegida explícita (mesmo acesso efetivo), também quando
  herdava da pasta; a herança não volta na remoção (`I4-C25g`, linhas "herdada"). Registrado no Landing e no guia.
- DACL mudada depois de obtida → 4 (antes não era comparada) (`I4-C25h`).
- Windows sem PowerShell utilizável → 5 na reescrita de configuração existente (antes 0 com a ACL herdada);
  prévia, configuração ausente, exclusão da configuração, registro, lock e Hermes não usam o PowerShell
  (`I4-C25g`; demais suítes verdes).
- Custo: 4 chamadas do PowerShell por reescrita sem nova tentativa (obter, conferir, criar, conferir antes do
  `rename`) e mais 1 por nova tentativa — lote do Windows de 33 s para 116 s.

### Contagens reais em `e513af7`

Um batch por plataforma: `node --test --test-reporter=tap "tests/integrations/**/*.test.mjs"
scripts/governance-ci.test.mjs scripts/code-review/review.test.mjs`. Windows: worktree com HEAD `e513af7` e
`git diff --quiet e513af7 -- src tests docs scripts package.json package-lock.json`, executado fora do sandbox
pelos testes de timeout/taskkill do motor (só processos dos próprios testes), Hermes nativo pelo helper. WSL:
distro `Ubuntu` explícita (24.04.3), Node 24.13.0, `git -c core.autocrlf=false archive e513af7` (SHA-256
`41effc6d…d064e`) no ext4 (`/tmp/skillme-f4-batch-e513af7`), 143 arquivos de `src`, `tests`, `scripts`,
`docs`, `package.json` e `package-lock.json` iguais aos blobs sem normalização, `env -i` só com `PATH`; exit do
próprio `wsl.exe`. Nenhum spawn lendo por `/mnt/c`.

| Execução | tests | pass | fail | cancelled | skipped | todo | exit | duração |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Windows 11, Node 24.21.0 — integrações 83 + governança 6 + motor 16 | 105 | 103 | 0 | 0 | 2 | 0 | 0 | 116 s |
| WSL — integrações 83 + governança 6 + motor 16 | 105 | 94 | 0 | 0 | 11 | 0 | 0 | 19 s |

Cruzamento das 54 linhas `Proof:` com os TAPs (`f4-proofs-vs-batch-{windows,wsl}-e513af7.txt`, mesmo script
das rodadas anteriores; cada padrão casou exatamente um teste executado, declarado no arquivo da prova):
Windows 53 PASS + `I4-C15` SKIP; WSL 46 PASS + 8 SKIP. Fora das linhas `Proof:` (51): 16 do motor, 5 de
governança e 30 de integração — os 27 anteriores e os novos `I4-C25g`, `I4-C25h`, `I4-C25i` (+3 em relação aos
102 de `b197650`). Skips e motivos:

- Windows (2): `I4-C15` `posix-signals` e `I4-C25b` `posix-modes` (passam no WSL). Diagnósticos `não executado`
  (22): os 18 anteriores de link de arquivo (EPERM sem privilégio) e, no `I4-C25f`, as 3 linhas de link e a de
  modo POSIX — executadas no WSL.
- WSL (11): `I4-C18..C23`, `I4-C37`, `I4-C44b` `hermes-runtime-ausente` (prova nativa do Hermes só no Windows,
  executada nesse batch, 8 PASS; Linux **pendente**) e `I4-C25g`, `I4-C25h`, `I4-C25i` `windows-dacl` (DACL só
  existe no Windows; executados no batch do Windows, 3 PASS; o contrato POSIX equivalente é `I4-C25b`/`I4-C25f`,
  PASS no WSL).
- Medição C38: Windows 822 ms depois do filho, 65536 bytes no pipe; WSL 811 ms, 146176 bytes.
- `I4-C29` não foi repetido em laço: sob o lock o vencedor só ganha as chamadas do PowerShell antes do
  `rename`; os perdedores saem com `lock_present` antes delas; passou nos dois lotes e no GREEN de
  desenvolvimento.
- Doctor (417) não reexecutado: nenhum arquivo do doctor, dos módulos reutilizados, de `scripts/`,
  `code-review.config.json`, `package.json`/lock ou `AGENTS.md` mudou desde `58ed596` (`I4-C45`, no lote,
  confere a interface do doctor com as integrações instaladas).

### Examinado e não alterado (limites e resíduos)

- Janela não atômica entre a última conferência e a criação/o `rename`, como no POSIX: a troca encontra o
  temporário com a DACL conferida e é recusada antes do `rename` (`I4-C25h`). Duas trocas exatas entre os
  processos das conferências não se distinguem.
- Prazo de 20 s do PowerShell: só por leitura, não testado (exige um processo que não responde); esgotado,
  `config_access_unavailable` e 5; durante a criação pode deixar o temporário com a DACL conferida (sobra
  reportada na execução seguinte, como os demais).
- Política do ambiente (AppLocker/WDAC, modo de linguagem restrito) que bloqueie o PowerShell ou os tipos .NET:
  recusa com 5 por construção (qualquer saída diferente de 0/10/11 ou sem processo); provado com o processo
  inexistente (`I4-C25g`, `I4-C25i`), não com uma política real — nenhuma política foi alterada.
- Não preservados (registrado no Landing e no guia): vínculo de herança, dono (passa a quem executa), SACL e
  rótulo de integridade. DACL com tipos de ACE que o .NET não reproduz → recusa (não testado: exigiria ACE
  condicional/objeto numa fixture).
- `accessOf` segue link como o `stat` (link de arquivo exige privilégio no Windows; linhas de link continuam só
  no WSL).
- Limites anteriores inalterados: link inicial contido vira arquivo regular; bytes idênticos; outro diretório
  real no mesmo caminho; prévia sem reconferência entre as próprias leituras; `stat` no `catch` do staging;
  passos parciais de `artifacts`; raiz trocada por arquivo; `mkdir` do staging com `EEXIST`; Hermes nativo só no
  Windows (Linux pendente); macOS só pela CI; E2E real pendente.

### Sobras próprias desta rodada (preservadas)

Nenhum `rm` nem limpeza opaca. Windows `%TEMP%\skill-me-f4\`: `probes/` (`api-check.mjs`, `api-check2.mjs`,
`helper-check.mjs`, `wsl-copy.sh`, `wsl-run.sh`, `verify-blobs.sh`, `proofs-vs-batch.mjs`, listas de blobs),
`api/` (scratches sintéticos das conferências de API, alguns com DACL que concede leitura a "Usuários" a
conteúdo sintético), `red-58ed596/` (cópia RED), `58ed596-lf.tar`, `overlay-e513af7-tests.tar`,
`e513af7-lf.tar`, `perm-head.mjs`/`perm-tail.mjs` (montagem do arquivo de teste), `results/` e
`dev-green-integrations-windows.tap`. WSL `/tmp`: `skillme-f4-red-58ed596`, `skillme-f4-batch-e513af7`.
Scratches dos testes: removidos pelo `after()` de cada arquivo (só diretórios de `makeScratch`, caminho
absoluto sob o TEMP; o usuário do teste tem controle total em todas as DACLs das fixtures); nenhum `skill-me i4
dacl…`, `r4 dacl…` ou `f4 windows-access…` restou nas duas plataformas. Cópias locais (ignoradas) em
`.checks/code-review/issue-4/f4-*`. Scratches de Verifiers, recovery e histórico formal não foram tocados.

### Privacidade e ambiente

Nenhum `process.env`, token, credencial ou valor de ambiente impresso. Canários e documentos sintéticos; os
TAPs registram códigos, conflitos, passos, rótulos de conteúdo, se o canário está no temporário (booleano),
acessos por SID rotulado e caminhos sintéticos — nenhum SID, SDDL ou nome de conta (conferido: nenhuma
ocorrência de `S-1-5-21`, `D:P(`, `D:AI(` ou dos canários nos `f4-*`). Nas conferências de API o console mostrou
SDDLs com SIDs de outras contas herdados do TEMP; nada disso foi gravado em arquivo ou commit. Nenhum outro
usuário, `sudo`, arquivo privado real ou perfil pessoal; nenhum diretório gerenciado real; todos os
`--target` em temporários; SID conhecido só em DACL de arquivos sintéticos; nenhum agente, modelo, download ou
E2E; nenhum bypass/confiança concedido; nenhum subagente; nenhuma operação recusada pela plataforma nesta
rodada (o batch do Windows rodou fora do sandbox, como nas rodadas anteriores, pela capacidade de `taskkill`
dos próprios testes do motor).

## Correção da revisão formal round 5 — ACL POSIX do temporário (17/10/2026)

Builder: Claude (tlc-implement `light`), mesma entrega, retomada autorizada após desligamento. Partida em `437dc3d`
(HEAD do despacho, limpo; produto e testes = `e513af7`, `git diff --quiet e513af7 437dc3d -- src tests docs scripts
package.json package-lock.json` verdadeiro). Relatório formal autêntico `.checks/code-review/issue-4/formal-round5-report.json`
lido e não reescrito (SHA-256 `b62ebc7d…b10f3dd7`); `.verified.md` não foi alterado. Esta seção é evidência do autor,
**não é verificação independente** nem revisão formal: nenhum `review:run`/`review:check`/`pr:create`/push/PR/merge/
Verifier/subagente foi executado; contadores, override, estado do motor (5 de 10 tentativas formais) e histórico não
foram tocados; scratches de Verifiers, recovery e rodadas anteriores não foram lidos nem mexidos (11 scratches
`skill-me i4 failure-*`/`lstat-check` de 16/10 e de 17/10 09:53 no TEMP do Windows são de rodadas anteriores e ficaram).
A sonda adicional interrompida na rodada 6 (`verifier-residual-probe.mjs`) **não** foi executada, recriada, reformulada
nem substituída, e não houve sonda ad hoc do produto: a prova é a regressão versionada. Antes da forma, o comportamento
das APIs foi conferido só em arquivos sintéticos num scratch privado do WSL (`/tmp/skillme-f5-api-*`, 0700; `api_check.py`
e `fd_check.mjs` em `%TEMP%\skill-me-f5\probes`), sem importar nem executar o produto; nenhuma ACL fora desses scratches
foi alterada. O root só leu as capacidades do WSL; nenhuma execução aqui é atribuída a ele ou à revisão formal. Commits:
`a5114a7` (Landing, antes do código), `550007f` (correção, regressões e guia) e o desta evidência.
`git diff --name-only 437dc3d..550007f`: `.checks/issue-4-integracoes.md` (uma linha de Landing),
`docs/agent-observation.md`, `src/integrations/install/{io,run,windows-access}.mjs`, novos
`src/integrations/install/{posix-acl,system-tool}.mjs`, `tests/integrations/helpers/{fs-probe,posix-access}.mjs`, novo
`tests/integrations/helpers/posix-acl.mjs`, `tests/integrations/{install-apply.unit,install-permissions.cli}.test.mjs` e
novo `tests/integrations/posix-acl.unit.test.mjs`; nada em doctor, `scripts/`, configuração do motor, dependências,
`AGENTS.md`, task, critérios ou `.verified.md`.

**Classificação.** O P1 da revisão formal 5 (`io.mjs:43/84–87`, AC6/C25) foi estabelecido por **leitura estática**.
Agora foi **reproduzido por execução** no produto intacto `437dc3d` (= `e513af7`), no WSL, só com dados sintéticos dentro
do scratch de cada linha: com `settings.json`/`hooks.json` 0640 sem ACL estendida (canário sintético no lugar de um
segredo) numa pasta que recebeu, depois da configuração, ACL default concedendo `r-x` a um uid sintético sem conta,
`install --apply` e `uninstall --apply` saem 0 e o temporário com o canário concede leitura a esse uid a partir do
`fchmod` (instantes `after_chmod`, `before_content`, `after_content`, `before_rename`); o arquivo final fica com a ACL
herdada (`user:<uid>:r-x`, `mask::r--`). Também sem detecção: ACL estendida da configuração que restringe o uid abaixo
de "outros" é descartada (o uid passa a ler como "outros"); ACL com grupo nomeado vira a herdada (o grupo dono também
ganha leitura); a ACL mudada pelo dono depois da conferência não era comparada. A exposição é o estado calculado pelo
modelo de acesso do teste sobre as ACLs observadas; nenhum outro usuário existe nem leu nada (scratch 0700). Não é escopo
novo: é o AC6 já aprovado. Por leitura, a mesma raiz vale no macOS (ACE herdável da pasta chega ao temporário), tratada
pela recusa abaixo.

### Mecanismo e fontes

- Node não expõe xattr nem ACL. Linux: a ACL de acesso é o xattr `system.posix_acl_access` — a própria libacl a guarda
  nele (`acl_ea.h` do pacote `acl` 2.3.2: `ACL_EA_ACCESS "system.posix_acl_access"`, `ACL_EA_VERSION 0x0002`, entradas
  `e_tag`/`e_perm`/`e_id`) —, lido e gravado pelo Python do sistema (`/usr/bin/python3`, aqui 3.12.3; `os.getxattr`/
  `setxattr`/`removexattr`, disponíveis só no Linux, desde 3.3, aceitam descritor) sobre o descritor do processo passado
  como fd 3 (`spawn` com `stdio[3]`). Nenhuma dependência nova, download, compilação, `sudo` ou instalação.
- Fontes primárias consultadas nesta rodada: acl(5) (man7.org) — "OBJECT CREATION AND DEFAULT ACLs" (o objeto novo herda
  a ACL default como ACL de acesso e as entradas que correspondem aos bits de modo ficam limitadas pelo `mode`),
  "CORRESPONDENCE BETWEEN ACL ENTRIES AND FILE PERMISSION BITS" (com `ACL_MASK`, os bits de grupo são a máscara; mudar os
  bits muda as entradas) e "ACCESS CHECK ALGORITHM"; umask(2); getxattr(2)/removexattr(2) (`ENODATA`, `ENOTSUP`,
  variantes por descritor); acl_set_file(3), acl_from_text(3), acl_get_file(3), acl_to_text(3) e `acl.h`
  (`ACL_TYPE_ACCESS 0x8000`, `ACL_TYPE_DEFAULT 0x4000`) só para as fixtures; documentação do módulo `os` do Python
  ("Linux extended attributes"); file_cmds da Apple (`ls/print.c`, `ls/ls.c`, `chmod/chmod_acl.c`): `-e` imprime cada ACE
  como `" %d: …"` só quando há ACL, `-i` o inode no início, o sufixo do modo é `@` (xattr) antes de `+` (ACL), e
  `chmod +a` aceita `read` em diretório. setfacl(1) indicado no despacho foi lido para a forma curta; `getfacl`/`setfacl`
  não existem no Ubuntu do WSL.
- Constatado em execução (scratch sintético, antes do código): arquivo criado 0600 na pasta com ACL default →
  `user:<uid>:r-x #effective:---` com `mask::---`; `fchmod 0640` → `mask::r--` e `#effective:r--` (o mecanismo do
  achado); `fremovexattr` antes do `fchmod` remove a herdada; `fsetxattr` com o xattr bruto de outro arquivo reproduz a
  ACL (relida igual, modo atualizado) e o `fchmod` ao mesmo modo a mantém; procfs → `ENOTSUP`; drvfs do WSL (`/mnt/c`,
  9p) → `ENOTSUP`; `/tmp` ext4 → `ENODATA`; o fd de um `FileHandle` do Node chega ao Python como o mesmo inode.

### Correção (`posix-acl.mjs`, `system-tool.mjs`, `io.mjs`, `windows-access.mjs`, `run.mjs`; linha de Landing de `a5114a7`)

- `src/integrations/install/posix-acl.mjs` (novo): `aclOf(handle, file)` (`:82`) — Linux: script fixo `READ_ACL` (`:28`)
  pelo fd 3 → hexadecimal validado por `^(?:[0-9a-f]{2})+$` ou `null` (`ENODATA`); macOS: `ls -ledi` no caminho real com
  o inode do descritor (`listsAce`, `:66`) → ACE → recusa; outra plataforma → recusa. `matchAcl(handle, file, acl,
  sameGroup)` (`:105`) — Linux: ACL estendida com grupo dono diferente ou fora do formato → recusa; script fixo
  `APPLY_ACL` (`:40`) grava a ACL ou remove a do descritor e relê (sai 0 só com o pedido); macOS: ACE herdada no
  temporário → recusa. Python com caminho fixo, `-I -S`, ambiente vazio; mensagens fixas (`config_access_unavailable`).
- `system-tool.mjs` (novo): o executor que estava em `windows-access.mjs` (prazo de 20 s, stderr descartado, stdout só
  para quem chamou), agora com `fd` opcional (fd 3 do filho) e `env`; `windows-access.mjs` passa a usá-lo sem mudar
  scripts, argumentos nem ambiente do PowerShell (consolidação, não cópia).
- `io.mjs`: `accessOf` POSIX (`:91`) abre a configuração (`O_RDONLY|O_NONBLOCK|O_NOCTTY`) e devolve modo/dono/grupo do
  `fstat` e `acl` do mesmo descritor; `sameAccess` (`:20`) inalterada no código — a forma ganhou `acl`, então ACL mudada
  → 4 nas conferências já existentes; `matchAccess` (`:41`): `fchown` → `matchAcl` → `fchmod`; `matchAccessOrDiscard`
  (`:58`, usada por `writeExclusive`, `:112`): falha antes do conteúdo apaga o temporário vazio enquanto o caminho for o
  inode do handle (`dev`/`ino` em `bigint`) e propaga o erro (cai no `step` existente: 5, `config: failed`).
- `run.mjs`: só comentários (forma do acesso com ACL); ordem de `replaceChecked` inalterada.
- Guia (`docs/agent-observation.md`): código 5 generalizado; parágrafo do Linux (ACL lida do descritor, copiada ou
  removida antes do conteúdo e dos bits, ACL default não chega, ACL restritiva continua valendo, recusas) e do macOS
  (ACE recusada, só pela CI); a frase anterior "ACL POSIX … não são preservados nem detectados" saiu.

### Regressões

- **`I4-C25j`** (`install-permissions.cli.test.mjs:372`, asserção `:485`) — CLI real sob `umask 022` com o instrumento
  `fs-probe.mjs` (com `SKILL_ME_TEST_FS_PROBE_ACL=1` registra as entradas da ACL do temporário em cada instante,
  inclusive `after_chmod`; `…_NO_PYTHON=1` e `…_FAIL_ACL_APPLY=1` apontam o `spawn` do Python, ou só o do script que
  grava, para um executável inexistente — falha real de criação de processo). 25 linhas: 7 de fixture (arquivo novo 0640
  na pasta com ACL default fica legível pelo uid sintético) e 18 comandos — Claude e Codex com 0640 sem ACL numa pasta com
  ACL default (Claude: instalar, instalar de novo, remover; Codex: instalar, remover), ACL estendida restritiva (instalar,
  remover), ACL com grupo nomeado numa pasta com ACL default (instalar, remover), controle sem ACL (instalar, remover),
  Python ausente na instalação do Claude e na remoção do Codex, falha ao gravar a ACL no temporário, ACL estendida com
  grupo não atribuível (EPERM injetado no `fchown`; só com grupo suplementar, presente no WSL) e configuração ausente sem
  Python (criada com a ACL herdada, sem conteúdo preexistente; a remoção a apaga). Afirma código, status, erros, passos,
  instantes do temporário, destinatários ampliados em cada instante (uid nomeado, membro só do grupo dono, membro só do
  grupo sintético, "outros" — modelo de acl(5) em `helpers/posix-access.mjs`), canário, ACL final (estendida e
  entradas), ampliados no final, conteúdo, registro, lock e sobra de temporário.
- **`I4-C25k`** (`install-apply.unit.test.mjs:2582`, asserção `:2672`) — `runIntegrationCommand` com o io real de
  `accessSwapIo` (agora também com as entradas da ACL do temporário). 6 linhas: controles (instalação Claude, remoção
  Codex), ACL ampliada pelo dono imediatamente antes de criar o temporário, ACL estendida removida pelo dono no mesmo
  instante, rename negado (EPERM) e ACL ampliada antes da nova tentativa, falha de E/S no rename. Afirma a ACL pedida
  (igual ao xattr bruto lido pelo teste antes do comando), ampliados e "ACL da lida" em cada instante, canário,
  conflitos, passos, tentativas, entradas e ACL finais, registro e lock.
- **`I4-C25l`** (`posix-acl.unit.test.mjs:34`, asserção `:92`) — contrato do módulo, 9 linhas: leitura sem ACL (`null`),
  com ACL (xattr exato), procfs (`ENOTSUP` → recusa); no temporário 0600 recém-criado na pasta com ACL default (herdada
  sob máscara fechada, conferida): cópia exata, remoção da herdada, e recusa com mensagem fixa para ACL com grupo não
  atribuível, fora do formato, recusada pelo kernel (marca 0x40) — nessas três a ACL do temporário fica intacta — e
  aceita mas relida diferente (só as três entradas do modo: o kernel a converte em bits).
- **`I4-C25m`** (`install-permissions.cli.test.mjs:502`, asserção `:557`) — macOS, **não executado** (sem macOS local; só a
  CI macOS o roda): controle sem ACE, ACE herdável na pasta (`group:everyone allow read,file_inherit`) e ACE na
  configuração (`user:nobody deny read`) → 0 e 5 `config_access_unavailable` sem canário no temporário nem sobra.
- Helpers: `tests/integrations/helpers/posix-acl.mjs` (novo; libacl pela API de texto via `ctypes`, pelo caminho —
  independente do produto, que usa o xattr bruto pelo descritor); `posix-access.mjs` (+ modelo de acesso efetivo da ACL
  e `widenedAclRecipients`); `fs-probe.mjs` (aditivo: ACL, `after_chmod` só com ACL, Python ausente/falha ao gravar; o
  caso do PowerShell mantém o mesmo nome inexistente). Fixtures: uid/gid `2147400001..3`, sem conta, sem `sudo`.
- Testes existentes: nenhuma asserção alterada. `accessSwapIo` ganhou o quarto parâmetro opcional (`{ acl }`) e
  `runUnderProbe` passou a aceitar opções nomeadas (a de `failChown` continua igual).
- Mutações de desenvolvimento (não versionadas, cópias WSL do worktree antes do commit; M1–M5 antes da linha "aceita mas
  relida diferente" de `I4-C25l`, M6 depois; `f5-mutations-wsl-550007f-wip.txt`): `fchmod` antes da ACL (M1, `I4-C25j`),
  herdada não removida (M2, `I4-C25j`), ACL fora da comparação (M3, `I4-C25k`), temporário vazio não apagado (M4,
  `I4-C25j`), grupo ignorado (M5, `I4-C25j`/`I4-C25l`), sem releitura (M6, `I4-C25l`) — 6/6 detectadas.

### Reprodução RED no produto `437dc3d` (cópias isoladas próprias)

- Windows: `git -c core.autocrlf=false archive 437dc3d` (SHA-256 `36c0b7b7…ee58e51b`) extraído em
  `%TEMP%\skill-me-f5\red-437dc3d` + `node_modules`; por cima, `git archive 550007f --` dos 6 arquivos de teste/helpers
  (SHA-256 `743e6658…5fc8a713`). 93 blobs (`src`, `tests/integrations`) conferidos sem normalização, 0 diferentes.
  Resultado (`f5-red-tests-windows-437dc3d.tap`, três arquivos): **26 tests, 21 pass, 1 fail, 4 skip** — falha só o
  arquivo `posix-acl.unit.test.mjs` por `ERR_MODULE_NOT_FOUND` (módulo novo); `I4-C25j`/`I4-C25k`/`I4-C25l` em skip
  `posix-acl`, `I4-C25m` em `macos-acl`, `I4-C25b` em `posix-modes`; `I4-C25f/g/h` e os demais passam (os helpers alterados
  mantêm a barra do Windows; o achado é POSIX).
- WSL (distro `Ubuntu` explícita, 24.04.3, Node 24.13.0, ext4, `env -i` só com `PATH`): mesmos tars em
  `/tmp/skillme-f5-red-437dc3d`, 93 blobs conferidos. **26 tests, 20 pass, 3 fail, 3 skip** — falham `I4-C25j` e
  `I4-C25k` por diff de asserção (`ERR_ASSERTION`) e o arquivo do módulo novo por import; `I4-C25g/h` em `windows-dacl`,
  `I4-C25m` em `macos-acl`; `I4-C25b`, `I4-C25f` e os demais passam (`f5-red-tests-wsl-437dc3d.tap`).
- RED de desenvolvimento antes do código: as mesmas regressões, na versão de então (antes de `after_chmod` e da última
  linha de `I4-C25l`), no worktree com o produto ainda sem correção (`f5-dev-red-wsl-a5114a7-wip.tap`), mesmas
  divergências.

Valores observados no WSL (`437dc3d` → `550007f`):

| Linha | `437dc3d` | `550007f` |
| --- | --- | --- |
| C25j fixture: arquivo novo 0640 na pasta com ACL default | uid sintético lê | igual (é a fixture) |
| C25j Claude/Codex 0640 sem ACL, ACL default (instalar, de novo, remover) | 0; temporário com canário legível pelo uid sintético desde `after_chmod`; final com a ACL herdada (`user:<uid>:r-x`, `mask::r--`) | 0; nenhum ampliado em instante algum; final sem ACL estendida, 0640 como o lido |
| C25j ACL estendida restritiva (instalar, remover) | 0; ACL descartada, uid sintético lê como "outros" (temporário e final) | 0; ACL exata no temporário e no final |
| C25j ACL com grupo nomeado + ACL default (instalar, remover) | 0; ACL herdada no lugar: uid sintético e grupo dono ganham leitura | 0; ACL exata, nenhum ampliado |
| C25j sem Python (instalar Claude, remover Codex) | 0 aplicado com a herdada | 5 `config_access_unavailable`, passo `config: failed`, sem temporário, configuração com bytes e ACL, registro como estava |
| C25j falha ao gravar a ACL no temporário | 0 aplicado com a herdada | 5; temporário só em `created` (vazio, sem ampliado), apagado |
| C25j ACL estendida com grupo não atribuível | 0; ACL descartada, uid sintético lê | 5; temporário só em `created`, apagado |
| C25j controles (sem ACL; configuração ausente sem Python) | iguais | iguais (criada do zero com a ACL herdada, sem conteúdo preexistente) |
| C25k controles | 0; ACL não transmitida; temporário com a herdada (uid sintético lê); final idem | 0; ACL pedida = a lida; temporário com ela, nenhum ampliado; final com ela |
| C25k ACL ampliada/removida pelo dono antes de criar o temporário | 0 aplicado (mudança não detectada) | 4, temporário com a ACL conferida, sem rename, apagado; a mudança do dono fica |
| C25k EPERM + ACL ampliada antes da nova tentativa | 0 depois de 2 tentativas | 4, 1 tentativa, temporário apagado |
| C25k falha de E/S no rename | 5 `EIO`; temporário legível pelo uid sintético, apagado | 5 `EIO`; temporário com a ACL conferida, apagado |

### Mudanças colaterais de comportamento, provadas

- Linux: reescrita de configuração existente passa a exigir `/usr/bin/python3`; sem ele, 5 antes de qualquer conteúdo
  (antes, 0 sem garantia). Configuração criada do zero, exclusão, registro, lock, prévia e Hermes não usam Python
  (`I4-C25j`, linha da configuração ausente; demais suítes verdes).
- Linux: ACL mudada depois de obtida → 4 (antes não era comparada) (`I4-C25k`); sistema de arquivos sem ACL POSIX
  (`ENOTSUP`: NFSv4, SMB, drvfs do WSL) → 5 (provado no módulo com procfs em `I4-C25l`; montagens de rede não exercitadas).
- `accessOf` POSIX abre a configuração para leitura (antes, só `stat`); a leitura sob o lock já exigia a mesma permissão.
- Falha ao preparar o acesso do temporário depois de criado (antes, uma falha do `fchmod` deixava o temporário vazio)
  agora o apaga pelo inode; no Windows nada mudou.
- macOS: ACE na configuração ou herdada pelo temporário → 5 (antes, 0 sem detecção) — só por leitura e pela CI.
- Custo: 4 chamadas do Python por reescrita sem nova tentativa (obter, conferir, gravar no temporário, conferir antes do
  `rename`) e mais 1 por nova tentativa; o lote do WSL continuou em 19 s.

### Contagens reais em `550007f`

Um batch por plataforma: `node --test --test-reporter=tap "tests/integrations/**/*.test.mjs"
scripts/governance-ci.test.mjs scripts/code-review/review.test.mjs`. Windows: worktree com HEAD `550007f` e
`git diff --quiet 550007f -- src tests docs scripts package.json package-lock.json`, pelo shell normal da sessão, sem
pedir desativação de sandbox (os testes de timeout/`taskkill` do motor, que só encerram processos dos próprios testes,
passaram; nenhuma recusa do ambiente); Hermes nativo pelo helper. WSL: distro `Ubuntu` explícita (24.04.3), Node 24.13.0, `git -c core.autocrlf=false archive 550007f`
(SHA-256 `bed974eb…10b21d0e01`) no ext4 (`/tmp/skillme-f5-batch-550007f`), 147 arquivos de `src`, `tests`, `scripts`,
`docs`, `package.json` e `package-lock.json` iguais aos blobs sem normalização, `env -i` só com `PATH`; exit do próprio
`wsl.exe`. Nenhum spawn lendo por `/mnt/c`.

| Execução | tests | pass | fail | cancelled | skipped | todo | exit | duração |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Windows 11, Node 24.21.0 — integrações 87 + governança 6 + motor 16 | 109 | 103 | 0 | 0 | 6 | 0 | 0 | 106 s |
| WSL — integrações 87 + governança 6 + motor 16 | 109 | 97 | 0 | 0 | 12 | 0 | 0 | 19 s |

Cruzamento das 54 linhas `Proof:` com os TAPs (`f5-proofs-vs-batch-{windows,wsl}-550007f.txt`, mesmo script das rodadas
anteriores; cada padrão casou exatamente um teste executado, declarado no arquivo da prova): Windows 53 PASS + `I4-C15`
SKIP; WSL 46 PASS + 8 SKIP. Fora das linhas `Proof:` (55): 16 do motor, 5 de governança e 34 de integração — os 30
anteriores e os novos `I4-C25j`, `I4-C25k`, `I4-C25l`, `I4-C25m` (+4 em relação aos 105 de `e513af7`). Skips e motivos:

- Windows (6): `I4-C15` `posix-signals`, `I4-C25b` `posix-modes`, `I4-C25j`/`I4-C25k`/`I4-C25l` `posix-acl` (passam no
  WSL) e `I4-C25m` `macos-acl`. Diagnósticos `não executado` (22): os mesmos da rodada anterior (18 de link de arquivo sem
  privilégio e, no `I4-C25f`, 3 de link e 1 de modo POSIX — executados no WSL).
- WSL (12): `I4-C18..C23`, `I4-C37`, `I4-C44b` `hermes-runtime-ausente` (prova nativa do Hermes só no Windows, executada
  nesse batch, 8 PASS; Linux **pendente**), `I4-C25g`, `I4-C25h`, `I4-C25i` `windows-dacl` (executados no Windows, 3 PASS)
  e `I4-C25m` `macos-acl`. Nenhum diagnóstico de grupo suplementar ausente: as linhas de grupo de `I4-C25b`/`I4-C25j`
  rodaram.
- **macOS:** `I4-C25m` e o caminho `darwin` de `posix-acl.mjs` não foram executados em lugar nenhum por mim; ficam para
  a CI macOS (matriz já declarada). Nada aqui afirma execução nativa no macOS.
- Medição C38: Windows 835 ms depois do filho, 65536 bytes no pipe; WSL 807 ms, 146176 bytes.
- Doctor (417) não reexecutado: nenhum arquivo do doctor, dos módulos reutilizados, de `scripts/`,
  `code-review.config.json`, `package.json`/lock ou `AGENTS.md` mudou desde `437dc3d` (`I4-C45`, no lote, confere a
  interface do doctor com as integrações instaladas).

### Examinado e não alterado (limites e resíduos)

- Janela não atômica entre a última conferência e a criação/o `rename`, como antes: a troca encontra o temporário com a
  ACL conferida e é recusada antes do `rename` (`I4-C25k`). Duas trocas exatas entre os processos das conferências não se
  distinguem.
- Dependência runtime declarada: `/usr/bin/python3` (3.5+, `os.*xattr` do Linux) só para reescrever configuração
  existente no Linux; o PATH não é consultado (sistema sem esse caminho → 5). macOS: `/bin/ls`. Prazo de 20 s só por
  leitura (não testado; exige processo que não responde).
- Não copiados: rótulo SELinux/AppArmor, demais xattrs (`security.*`, `user.*`), bits especiais; dono passa a quem
  executa. ACL com IDs mapeados por namespace de usuário e montagens NFSv4/SMB não exercitadas (estas recusam por
  `ENOTSUP`, provado com procfs).
- `accessOf` segue link como o `stat` (abre o destino); macOS confere o inode do caminho real contra o descritor.
- Limites anteriores inalterados: link inicial contido vira arquivo regular; bytes idênticos; outro diretório real no
  mesmo caminho; prévia sem reconferência entre as próprias leituras; `stat` no `catch` do staging; passos parciais de
  `artifacts`; raiz trocada por arquivo; `mkdir` do staging com `EEXIST`; vínculo de herança/SACL do Windows; Hermes
  nativo só no Windows (Linux pendente); macOS só pela CI; E2E real pendente.

### Sobras próprias desta rodada (preservadas)

Nenhum `rm` nem limpeza opaca. Windows `%TEMP%\skill-me-f5\`: `probes/` (`api_check.py`, `fd_check.mjs`, `wsl-copy.sh`,
`wsl-run.sh`, `verify-blobs.sh`, `proofs-vs-batch.mjs`, `mutate.py`, `mutants.sh`, `mutants-m6.sh`, `mut-summary.sh`,
listas de blobs), `red-437dc3d/` (cópia RED), `437dc3d-lf.tar`, `overlay-550007f-tests.tar`, `a5114a7-lf.tar`,
`550007f-lf.tar` e os TAPs de desenvolvimento. WSL `/tmp`: `skillme-f5-probes`, `skillme-f5-api-*`, `skillme-f5-fd-*`
(scratches sintéticos das conferências de API, um com ACL default que concede leitura a um uid sintético),
`skillme-f5-devred`, `skillme-f5-devgreen{,2,3}`, `skillme-f5-mut-M1..M6`, `skillme-f5-red-437dc3d`,
`skillme-f5-batch-550007f`. Scratches dos testes: removidos pelo `after()` de cada arquivo (só diretórios de
`makeScratch`, caminho absoluto sob o TEMP); nenhum `skill-me i4 acl…`, `f5 acl…`, `f5 posix-acl…` ou `macos acl…`
restou nas duas plataformas. Cópias locais (ignoradas) em `.checks/code-review/issue-4/f5-*`.

### Privacidade e ambiente

Nenhum `process.env`, token, credencial ou valor de ambiente impresso. Canários e documentos sintéticos; os TAPs
registram códigos, conflitos, passos, rótulos de conteúdo, se o canário está no temporário (booleano), entradas de ACL
com uid/gid sintéticos ou do dono (`user::`/`group::`) e caminhos sintéticos (conferido: nenhuma ocorrência dos
canários, `S-1-5-21`, `D:P(`, `API_TOKEN` nem de nomes de conta em entradas de ACL nos `f5-*`). Nenhum outro usuário
criado ou personificado, `sudo`, arquivo privado real ou perfil pessoal; nenhum diretório gerenciado real; todos os
`--target` em temporários; nenhuma ACL fora dos scratches; nenhum agente, modelo, download ou E2E; nenhum
bypass/confiança concedido; nenhum subagente; nenhuma operação recusada pela plataforma nesta rodada.
