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
