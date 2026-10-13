# Issue 3 — Evidência do builder (implementação)

Autor: Claude (implementador), conforme `AGENTS.md`/`tlc-implement`. Este arquivo registra o que foi
corrigido na preparação, o que foi implementado e os resultados reais de execução. Não é o Verifier
independente nem substitui `review:run`; nenhum `.verified.md` foi criado por esta fase.

## 1. Correções na preparação

Correção de ordem histórica (apontada na rodada de revisão do orquestrador, ver
`.checks/code-review/preflight-issue-3.md`): RED foi de fato comprovado antes de qualquer linha de produto —
os testes/helpers herdados da fase de preparação falhavam por ausência dos módulos de `src/doctor/**`, que
ainda não existiam. Mas nem toda correção de fixture listada abaixo aconteceu antes dessa primeira linha de
produto; algumas foram descobertas e corrigidas durante o próprio build, à medida que a implementação expunha
uma convenção inventada na preparação. O título anterior ("antes de escrever produto") afirmava uma ordem
única que não é exata; esta versão registra o que de fato ocorreu.

O orquestrador apontou quatro fatos inventados nos testes/fixtures herdados da fase de planejamento.
Todos foram corrigidos **nos testes e fixtures**, nunca enfraquecendo um critério da task:

1. **Convenções de agente inventadas** (`.claude/hooks.yaml`, `.hermes/hooks.yaml` genéricos, override
   `%LOCALAPPDATA%` para Hermes no Windows). Verificado contra as fontes reais (consultadas nesta data):
   - [Settings files and precedence](https://code.claude.com/docs/en/settings) e
     [Hooks](https://code.claude.com/docs/en/hooks) — Claude usa `settings.json` (JSON) em
     `<CLAUDE_CONFIG_DIR>` quando definida (substitui `~/.claude` inteiro, sem sufixo adicional), ou em
     `<HOME>/.claude/` quando não definida, mais `.claude/settings.json` e `.claude/settings.local.json` no
     projeto e `disableAllHooks`/`allowManagedHooksOnly`; não existe `hooks.yaml` nem `hooks.enabled`.
   - [Managed settings](https://code.claude.com/docs/en/managed-settings) — caminho fixo por SO:
     macOS `/Library/Application Support/ClaudeCode/managed-settings.json`, Linux/WSL
     `/etc/claude-code/managed-settings.json`, Windows `C:\Program Files\ClaudeCode\managed-settings.json`.
   - [Codex Hooks](https://learn.chatgpt.com/docs/hooks) — `~/.codex/hooks.json` ou `[hooks]` em
     `~/.codex/config.toml` (e equivalentes em `<repo>/.codex/`), `CODEX_HOME` substitui `~/.codex`,
     `[features]\nhooks = false` desliga globalmente, camadas são aditivas (não há "vencedor" único) — mas,
     como corrigido em uma rodada de revisão posterior (ver seção 6, achado 9), essa aditividade vale para a
     *lista de handlers*, não para a própria `features.hooks`: um valor explícito dela em escopo de projeto
     depende de confiança de projeto não determinável por leitura, então nunca resolve sozinho como `disabled`.
   - [Hermes Configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration) e
     [Hooks](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks) — `config.yaml` (YAML)
     sob `HERMES_HOME` (aponta para o home exato, sem sufixo adicional) ou `~/.hermes` nos demais SOs;
     `hooks_auto_accept` é a única chave de consentimento nativo para shell hooks. **Premissa inicial
     corrigida nesta mesma fase** (ver seção 6, achado 8): a documentação pública consultada aqui não
     menciona um override por `%LOCALAPPDATA%` no Windows, mas essa ausência de menção não prova a ausência
     do comportamento — a inspeção estática da instalação local confirmou que o default real do Windows é
     `%LOCALAPPDATA%/hermes`, e é esse o caminho que o `doctor` usa.
   Corrigido em `src/doctor/config-sources.mjs`, `src/doctor/config-projection.mjs`,
   `tests/doctor/helpers/fixture-agent-config.mjs` e nos testes de configuração/confiança.

2. **Campo `trust: trusted/untrusted` arbitrário no próprio arquivo tratado como consentimento nativo**.
   Corrigido: `config-projection.mjs` nunca projeta uma chave `trust`/`trusted` (não está no conjunto seguro
   de campos); `trust-resolution.mjs` só aceita evidência de uma origem reconhecida, estruturada e separada
   do conteúdo não confiável (`native-trust-evidence.mjs`, hoje só `hermes_hooks_auto_accept`). Provas:
   `config-projection.unit.test.mjs` (campo nunca projetado),
   `trust-resolution.unit.test.mjs` (origem não reconhecida nunca vira `trusted`),
   `configuration-trust.cli.test.mjs` (mesmo regressão na fronteira real da CLI).

3. **Launchers "stub"/script genérico do Codex/Hermes com metadata ao lado, sem vínculo real**.
   Corrigido: `src/doctor/launcher-link/codex.mjs` exige que o shim referencie de verdade o pacote
   (symlink real + `realpath`, ou caminho relativo embutido no texto do shim — os dois mecanismos reais de
   um shim gerado por npm); `src/doctor/launcher-link/hermes.mjs` exige o layout padrão de venv/pip
   (`lib/pythonX.Y/site-packages` ou `Lib/site-packages`), não "qualquer `hermes_cli` perto". Regressão de
   launcher alheio com `package.json`/`hermes_cli` vizinho mas não referenciado adicionada em
   `presence.cli.test.mjs` e `agent-resolution.unit.test.mjs` (`launcher_not_recognized`, nunca atribui
   versão). PE sintético do Claude é tratado só como estrutura de versão (`version-metadata.unit.test.mjs`
   já provava isso; nada mudou aqui além de preservar a distinção no texto).

4. **C4/C18 sem inventário por hash e sem provas da integração de CI**. Corrigido: `inventory()` (extraída
   para `tests/doctor/helpers/fs-inventory.mjs`, reusada por `presence-C4` e `snapshot-C15`) agora inclui
   SHA256 do conteúdo de cada arquivo além de tamanho/mtime, fechando o caso de um conteúdo trocado que
   mantenha o mesmo tamanho. Para C18, a suíte nova foi de fato incorporada a
   `.github/workflows/governance.yml` (matriz de SO) e a `scripts/governance-ci.test.mjs`
   (`governance-C1 C3`), com proof real abaixo, substituindo a fase anterior que só descrevia a pendência.

## 2. Arquivos criados/alterados nesta fase

### Produto (`src/doctor/**`, somente leitura, sem child_process/writeFile — conferido por grep)

`agent-resolution.mjs`, `capability-matrix.mjs`, `cli-args.mjs`, `cli.mjs`, `collector-probe.mjs`,
`config-projection.mjs`, `config-reader.mjs`, `config-sources.mjs`, `fs-adapter.mjs`,
`known-version-profiles.mjs`, `launcher-link/codex.mjs`, `launcher-link/hermes.mjs`,
`launcher-link/path-helpers.mjs`, `native-trust-evidence.mjs`, `render-text.mjs`, `report-envelope.mjs`,
`run-diagnostics.mjs`, `scope-merge.mjs`, `snapshot-read.mjs`, `trust-resolution.mjs`,
`version-sources/pe.mjs`.

### Testes/fixtures (`tests/doctor/**`)

Todos os 15 arquivos de teste herdados foram mantidos (nomes e critérios cobertos preservados) e
corrigidos onde a preparação estava errada; 2 arquivos novos foram adicionados:
`scope-merge.unit.test.mjs` e `trust-resolution.unit.test.mjs`, separando a prova da precedência de escopos
e da resolução de confiança por evidência nativa (antes misturada incorretamente em
`config-projection.unit.test.mjs`). Helpers corrigidos: `fixture-agent-config.mjs` (caminhos/; formatos
reais), `fixture-agents.mjs` (shims reais com vínculo, layout de venv do Hermes), `fake-fs-adapter.mjs`
(`lstat`/`realpath`/`addDir`, separador consistente com `path-helpers.mjs`), `fixture-manifest.mjs`
(cenários novos registrados). Helper novo: `fs-inventory.mjs` (inventário com SHA256 por arquivo, reusado
por `presence-C4` e `snapshot-C15`, antes duplicado em cada teste e sem hash de conteúdo).

### Documentação e CI

- `docs/agent-compatibility.md` (novo): fonte, data de consulta, versão/superfície, evidência e lacunas por
  agente, separando contrato documentado / inspeção estática / execução real.
- `README.md`: seção "Diagnóstico local de agentes (doctor)" — invocação e leitura de `partial`,
  `unverified`, `identityVerified: false`.
- `package.json`/`package-lock.json`: scripts `doctor` e `test:doctor`; `test` agora roda os três;
  dependência nova `smol-toml@1.9.1` (parser TOML de dados, sem execução de código, usado só para Codex).
- `.github/workflows/governance.yml`: job `verify` ganhou `strategy.matrix.os` (ubuntu-22.04,
  windows-latest, macos-14) e o step `npm run test:doctor`; os dois steps existentes preservados.
- `scripts/governance-ci.test.mjs`: `governance-C1 C3` atualizado para a nova forma do workflow (matriz e
  step novo); nenhuma outra política alterada.

## 3. Resultados reais de execução (rodados nesta máquina, Windows, nesta data)

```
npm test
  test:governance  -> 6 passed, 0 failed, 0 skipped
  test:code-review -> 10 passed, 0 failed, 0 skipped
  test:doctor      -> 103 passed, 0 failed, 1 skipped
```

O único skip é `agent-resolution-C2 realpath/symlink real liga o launcher do Codex ao pacote (POSIX)`,
guardado por `{ skip: process.platform === "win32" }` porque link simbólico real é um mecanismo POSIX; ele
roda nos runners Linux/macOS da matriz de CI. O vínculo por link simbólico tem cobertura adicional por
conteúdo de shim (caminho relativo embutido), que roda em todas as plataformas e já prova o mesmo
critério 2/3 de vínculo ao pacote.

Paridade do motor comum confirmada nesta data:
`git diff --exit-code 4242520 -- scripts/code-review/cli.mjs scripts/code-review/review.mjs scripts/code-review/review.test.mjs scripts/code-review/schema.json scripts/code-review/README.md`
— sem diff.

## 4. Limitações reais (declaradas, não contornadas)

- **Exit 1 / erro interno (C12)**: não determinístico via processo real (qualquer entrada reconhecida vira
  exit 0 ou 2); provado na função `toFailureEnvelope`/`exitCodeForStatus` (`envelope-failure.unit.test.mjs`).
- **Mutação durante a leitura (C15)**: sincronizar uma escrita real durante a leitura de um processo externo
  não é determinístico; provado em `readSnapshot` com `stat`/`readFile` injetados que discordam
  (`mid-read-mutation.unit.test.mjs`).
- **Permissão negada cross-SO (C3)**: `chmod` não bloqueia o dono no Windows e CI roda como root em
  containers; provado na camada de resolução com adaptador de filesystem que lança `EACCES`
  (`agent-resolution.unit.test.mjs`).
- **Política gerenciada do Claude (C8)**: o caminho real de `managed-settings.json` é fixo por SO fora do
  controle do processo de teste (não se escreve em `/etc` ou `Program Files` a partir de um teste); provado
  na camada pura de `mergeConfigScopes` com resultados de escopo já estruturados
  (`scope-merge.unit.test.mjs`), não via CLI real.
- **Confiança nativa de Claude/Codex**: nenhuma fonte documentada e estática (sem executar o agente) foi
  encontrada para a decisão de confiança desses dois agentes nesta data; `trust` permanece `unknown` para
  ambos por desenho, não por lacuna de implementação — registrado em `docs/agent-compatibility.md`.
- **Launcher Windows do Hermes**: corrigido na rodada de revisão (ver seção 6 abaixo) — o candidato
  reconhecido passou a ser `hermes.exe` (o launcher real observado numa instalação local), com `hermes.cmd`
  mantido como candidato secundário. O launcher real é um executável compilado (não um script de texto); a
  presença é reconhecida normalmente (`presence: present`), mas a entrega não reproduz o formato binário
  exato do launcher do pip para extrair `source_literal` dele — isso permanece fora do escopo mínimo desta
  issue, e o resultado honesto é `version: null`/`launcher_not_recognized` (critério 3), não uma falha.
  **Registro histórico — generalizado na seção 9, achado 3**: a lista fixa por agente deu lugar à
  resolução por `PATHEXT` em cada diretório do PATH, para os três agentes.
- Nenhum teste foi pulado para "fechar" a entrega além do skip de symlink POSIX acima, que é condicional à
  plataforma do executor, não uma omissão.

## 5. Fora do escopo desta fase (não decidido nem aplicado)

Nada do Handoff original ficou pendente: `src/doctor/**`, `docs/agent-compatibility.md`, README e a
integração de CI foram todos implementados nesta fase. Verifier independente e `review:run` continuam
fora desta fase, conforme a task e `AGENTS.md` (Codex local revisa; orquestrador decide a aprovação).

## 6. Rodada de fixes pós-preflight (achados do orquestrador)

O orquestrador rodou um smoke manual (`npm run --silent doctor -- --json`) e uma pré-revisão antes de
acionar o Verifier/motor formal, registrados em `.checks/code-review/preflight-issue-3.md`. Esta seção
documenta as correções aplicadas para cada um dos 10 achados, dentro do mesmo escopo da task (nenhum
critério foi alterado; nenhuma capacidade nova foi implementada — apenas conclusões/garantias incorretas
foram corrigidas, com regressão RED→GREEN para cada uma):

1. **C5 — versão não é evidência de contrato**: `run-diagnostics.mjs` atribuía `hasLocalVerifiedContract =
   versionProfileCompatible`, deixando um PE sintético com versão conhecida "provar" ferramentas/skills. Agora
   `hasLocalVerifiedContract` é sempre `false` nesta entrega (nenhum artefato de contrato por mecanismo é
   inspecionado); `capability-matrix.mjs` continua capaz de produzir `verified` quando receber essa evidência
   (prova isolada em `capability-matrix.unit.test.mjs`), mas `run-diagnostics.mjs` nunca a fornece hoje.
   Regressão de fronteira real: `capability-evidence.cli.test.mjs` (versão conhecida/compatível, zero
   `verified`). **Registro histórico — substituído na seção 9, achado 2**: o valor constante deixava a CLI
   sem nenhuma avaliação de contrato; a rodada formal 1 passou a ler a tabela instalada por mecanismo.
2. **C7 — superfície não é "hosted tool"**: removido `CODEX_HOSTED_SURFACES`, que marcava todo
   desktop/cloud do Codex como `unavailable` para os cinco mecanismos. Agora qualquer superfície que não seja
   `cli_local` cai no mesmo tratamento genérico (`unverified/surface_not_inspected`) para todos os agentes,
   Codex incluído. O teste que equiparava `tool_calls`/`cloud` a "hosted tool" foi corrigido (equivalência
   inventada na preparação, não exigida pela task) em `capability-matrix.unit.test.mjs`.
3. **C14 — erros com dados brutos**: `toFailureEnvelope` repassava `error.code`/`error.message` arbitrários;
   `cli.mjs` ecoava `error.message` em stderr; `cli-args.mjs` interpolava flag/valor brutos nas mensagens de
   `CliUsageError`. Trocado por um vocabulário fechado de código/mensagem própria
   (`report-envelope.mjs`), usado tanto por JSON quanto por texto. Regressões: canário em `message`/`code`
   (`envelope-failure.unit.test.mjs`), em flag e em `--cwd` (`leak-and-limits.cli.test.mjs`), e em
   `--collector` (`collector.cli.test.mjs`).
4. **C10 — timeout não cancelava o socket real; endpoint fora da assinatura não era erro de uso**:
   `collector-probe.mjs` agora aceita um `AbortSignal`; no timeout, cancela a tentativa pendente
   (`controller.abort()`) e aguarda o handle real se liberar antes de retornar — provado com um `connect`
   fake que só resolve no abort e com um `defaultConnect` real contra um servidor loopback
   (`collector-probe.unit.test.mjs`). Um `--collector` fora da assinatura (credenciais/path/query/não
   local/esquema errado/`localhost`) virou validação em `cli-args.mjs` (reaproveitando
   `parseLoopbackEndpoint` exportado de `collector-probe.mjs`): exit `2`, envelope `failed`, sem expor o
   endpoint — os testes que esperavam exit `0` para isso foram corrigidos (erro da preparação,
   `collector.cli.test.mjs`).
5. **C14/C15 — limite não valia para a leitura efetiva; mutação não chegava ao consumidor**:
   `snapshot-read.mjs` fazia `stat()` e depois `readFile()` sem teto real na segunda chamada; agora usa um
   handle "abrível" (`fs-openable.mjs`, extraído do helper que já existia em `agent-resolution.mjs`) e lê no
   máximo `maxBytes + 1` bytes de verdade, não importa o que o `stat()` diga — provado derrubando o processo
   nativamente antes da correção (buffer de ~4 GiB) e com GREEN determinístico depois
   (`mid-read-mutation.unit.test.mjs`). O mesmo mecanismo (`readBoundedText`) substituiu as duas cópias de
   stat+readFile em `launcher-link/codex.mjs` e `launcher-link/hermes.mjs`. `config-reader.mjs` ignorava
   `snapshot.changedDuringRead`; agora propaga como `configuration: unknown/config_changed_during_read`
   através do consumidor real (`readAgentConfiguration`, não só a função de snapshot).
6. **C3/C14 — PE malformado podia alocar sem limite**: `resourceSize` (campo de 32 bits não confiável do
   próprio arquivo) era usado para alocar/ler a seção `.rsrc` inteira sem checagem; um header corrompido
   anunciando ~4 GiB **derrubou o processo Node nativamente** (não apenas estourou memória) antes da
   correção. Agora o tamanho é validado contra um teto conservador e contra o tamanho real do arquivo antes
   de qualquer alocação (`version-sources/pe.mjs`). Também acrescentada cobertura de um recurso de versão com
   idioma diferente de `0x0409` (nenhum ID de idioma é fixado no código; só faltava a prova).
7. **C1/C2/C3 — launcher real do Windows**: `agent-resolution.mjs` só procurava `hermes.cmd`; o Hermes
   instalado nesta máquina é `hermes.exe`, reportado `absent` pelo smoke do orquestrador. Corrigido para uma
   lista de candidatos por SO (`hermes.exe` primeiro, `hermes.cmd` como secundário), com precedência de
   diretório do PATH preservada. Também corrigido: um diretório com o nome do agente nunca é aceito como
   launcher (checagem de `isDirectory()`), e no POSIX um arquivo sem nenhum bit de execução é tratado como
   "não encontrado" nesse candidato, não como presença válida.
8. **C8 — home real do Hermes no Windows**: a preparação presumiu, por ausência de menção na documentação
   pública, que não havia override por `%LOCALAPPDATA%`. Fonte primária local (lida só como texto, nunca
   importada/executada): `hermes_constants.py`, `_get_platform_default_hermes_home` (linhas 52-59) e
   `get_hermes_home` (linha 109) — confirmam que o default nativo do Windows é `%LOCALAPPDATA%/hermes`, com
   fallback para `<HOME>/AppData/Local/hermes`. Corrigido em `config-sources.mjs::hermesHome`, sem hardcodar
   nome de usuário (tudo vem de env/override). `docs/agent-compatibility.md` e o Landing da fase de
   preparação (`.checks/issue-3-agent-diagnostics.md`) foram corrigidos para não repetir a afirmação factual
   errada.
9. **C8 — precedência não é a mesma coisa que definição aditiva**: para Claude, `allowManagedHooksOnly`
   restringe hooks não gerenciados, mas não desativa os hooks que o próprio escopo `managed` já define —
   `config-reader.mjs` tratava os dois casos como "disabled" global; agora um `managed` com hooks próprios
   resolve `configured`. Para Codex, um `features.hooks=false` em escopo de **projeto** dependia de confiança
   de projeto (não determinável por leitura estática) e não podia ser lido como desativação confiante; agora
   produz `unknown/policy_precedence_undetermined` (novo retorno possível de `isDisabled`, definido e testado
   em `config-reader.mjs`), enquanto o escopo de **usuário** continua um `disabled` confiante (sem gate de
   confiança de projeto). **Registro histórico — generalizado na seção 7, achado 2**: esta correção só
   endereçava o caso `features.hooks=false` em projeto; um `true` explícito de projeto em conflito com um
   `false` de usuário ainda resolvia `disabled`, incorretamente, até a rodada seguinte.
10. **C3/C14 — reconhecimento de versão/shim**: os regex de vínculo (`hermes_cli` em `hermes.mjs`, path de
    pacote em `codex.mjs`) casavam uma referência mesmo dentro de uma linha de comentário; corrigido com
    `stripCommentLines` (`path-helpers.mjs`) antes de qualquer match. O literal de versão
    (`__version__`/`package.json`) aceitava qualquer string não vazia, inclusive um canário/credencial;
    corrigido com `isPlausibleVersionString` (`version-sources/validate.mjs`). Arquivos de vínculo/versão
    acima de 1 MiB agora produzem `input_too_large` (reasonCode específico), não mais confundidos com
    `launcher_not_recognized`. **Registro histórico — refinado na seção 10**: tirar linhas de comentário
    não bastava (echo, docstring, string); o Codex passou à linha de invocação do template e o Hermes
    (versão, import do launcher Python e `VALID_HOOKS`) a um leitor léxico de Python.

Resultado real após os fixes (rodado nesta máquina, Windows, nesta data):

```
npm test
  test:governance  -> 6 passed, 0 failed, 0 skipped
  test:code-review -> 10 passed, 0 failed, 0 skipped
  test:doctor      -> 134 passed, 0 failed, 1 skipped
```

O único skip continua sendo o mesmo da seção 3 (symlink real, mecanismo POSIX, condicional à plataforma do
executor). Verificação manual contra o ambiente real desta máquina
(`node src/doctor/cli.mjs --json`) após os fixes: Claude `2.1.295` (`binary_metadata`), Codex `0.162.1`
(`package_metadata`), Hermes `present` via `hermes.exe` (`version: null`/`launcher_not_recognized`, como
esperado para um launcher compilado — não mais `absent`); as três contagens de capacidades `verified` são
`0` para os três agentes.

Nenhum arquivo fora do escopo de `src/doctor/**`, `tests/doctor/**`, `docs/agent-compatibility.md` e os dois
checklists desta issue foi tocado. O motor comum (`scripts/code-review/**`) permanece sem diff contra a base
registrada na seção 3. Nenhum `global settings`, `install hooks`, execução de agente ou trace real foi
introduzido; Node/npm/ESM/`node:test` preservados. Verifier independente e `review:run` continuam fora desta
rodada, por instrução explícita do orquestrador — ele despacha ambos depois destes fixes e commits.

Arquivos de produto novos nesta rodada: `src/doctor/fs-openable.mjs` (extraído de um helper que já existia
em `agent-resolution.mjs`, agora reusado por `snapshot-read.mjs`), `src/doctor/version-sources/validate.mjs`.
Arquivos de teste novos: `tests/doctor/config-reader.unit.test.mjs`, `tests/doctor/config-sources.unit.test.mjs`,
`tests/doctor/capability-evidence.cli.test.mjs`. Todos os demais arquivos de `src/doctor/**` e `tests/doctor/**`
já existiam e foram editados in loco, conforme descrito acima item a item.

## 7. Rodada de fixes pós-revisão do Codex local (achados pré-Verifier)

Nova revisão local (Codex, conforme `AGENTS.md`) apontou três achados antes do Verifier independente, na
mesma branch, sem mudar critérios, core ou regras de governança:

1. **C5/C7 — Codex `skill_usage_signal` não deveria alegar "unavailable" genérico**: `capability-matrix.mjs`
   decidia o caso codex/`skill_usage_signal` ANTES da checagem de compatibilidade de versão, então uma
   versão sem perfil compatível ainda recebia `unavailable/skill_start_not_documented` em vez do motivo real
   (`version_profile_incompatible`) — escondendo por que o mecanismo não pôde ser avaliado. A ausência do
   evento nativo "SkillStart" documentado prova só isso, não a ausência de qualquer sinal de uso de skill por
   outro caminho não inspecionado por este doctor. Corrigido: a checagem de versão/documentação roda antes;
   o caso específico do Codex sempre resolve `unverified/skill_start_not_documented` (nunca `unavailable`,
   nunca `verified` por evidência genérica, mesmo com `hasLocalVerifiedContract: true`). Regressão RED→GREEN
   em `capability-matrix.unit.test.mjs` (versão compatível e incompatível).
2. **C8 — `isDisabled` do Codex só tratava `false` de projeto como indeterminado**: um `features.hooks=true`
   explícito em escopo de PROJETO não endereçava a chave (código anterior), então a iteração continuava até
   um `false` de escopo de USUÁRIO e resolvia `disabled` — ignorando que o projeto já havia afirmado o
   oposto. Como a efetividade do valor de projeto depende de confiança não determinável por leitura, esse
   conflito deveria ser `unknown`, nunca `disabled` por suposição: hooks definidos são aditivos entre
   camadas, mas a feature flag não é um OR aditivo de "false". Corrigido: qualquer valor explícito de
   `features.hooks` em escopo de projeto (`true` OU `false`) vira `unknown/policy_precedence_undetermined`;
   só a ausência da chave em projeto deixa a pergunta em aberto para o escopo de usuário, que continua
   resolvendo `false` como `disabled` de verdade (preservado). Regressão RED→GREEN na camada de configuração
   (`config-reader.unit.test.mjs`) e na fronteira real da CLI com home/cwd temporários
   (`configuration-trust.cli.test.mjs`).
3. **Coerência dos artefatos**: `docs/agent-compatibility.md` e o Landing de
   `.checks/issue-3-agent-diagnostics.md` descreviam a regra do achado 2 acima só para o caso `false` —
   generalizados para refletir a regra real. A frase `<CLAUDE_CONFIG_DIR ou HOME>/.claude/` sugeria que
   `CLAUDE_CONFIG_DIR` recebia o mesmo sufixo `/.claude/` do `HOME`; corrigida para deixar explícito que
   `CLAUDE_CONFIG_DIR` (como `HERMES_HOME`) aponta para o home exato, sem sufixo adicional, e é uma
   alternativa distinta a `<HOME>/.claude`, não uma combinação dos dois. A seção 1 deste documento (registro
   do entendimento daquela data) afirmava "nenhum override por `%LOCALAPPDATA%` documentado" para o Hermes,
   contradizendo a correção já registrada na seção 6 (achado 8); a seção 1 agora identifica essa premissa
   como corrigida na mesma fase, em vez de deixar as duas conclusões lado a lado sem reconciliação.
   Comentários de código (`src/doctor/**`, `tests/doctor/**`) que citavam
   `.checks/code-review/preflight-issue-3.md` — caminho coberto por `.checks/code-review/` em `.gitignore`,
   portanto indisponível a quem recebe o PR — foram reescritos para registrar a razão/contrato duradouro
   diretamente, sem depender desse arquivo nem narrar o número do achado de uma rodada anterior.

Resultado real após estes fixes (rodado nesta máquina, Windows, nesta data):

```
npm test
  test:governance  -> 6 passed, 0 failed, 0 skipped
  test:code-review -> 10 passed, 0 failed, 0 skipped
  test:doctor      -> 137 passed, 0 failed, 1 skipped
```

O único skip continua sendo o mesmo da seção 3 (symlink real, mecanismo POSIX, condicional à plataforma do
executor). Paridade do motor comum reconfirmada nesta data:
`git diff --exit-code 4242520 -- scripts/code-review/cli.mjs scripts/code-review/review.mjs scripts/code-review/review.test.mjs scripts/code-review/schema.json scripts/code-review/README.md`
— sem diff. Nenhum critério foi alterado; nenhuma capacidade nova foi implementada; nenhum arquivo fora de
`src/doctor/**`, `tests/doctor/**`, `docs/agent-compatibility.md` e os dois checklists desta issue foi
tocado. Nenhum arquivo de teste novo nesta rodada: os três testes de regressão foram adicionados a
`capability-matrix.unit.test.mjs`, `config-reader.unit.test.mjs` e `configuration-trust.cli.test.mjs`,
arquivos já existentes. Verifier independente e `review:run` continuam fora desta rodada.

## 8. Rodada de fixes pós-Verifier independente (G1-G4)

O Verifier independente rodou `.checks/issue-3-agent-diagnostics.verified.md` e reprovou (gate FAIL) quatro
checks com defeito de produto e/ou prova: C7 (G2), C11 (G1), C15 (G3) e C16 (G4). Esta seção documenta as
quatro correções, dentro do mesmo escopo da task (nenhum critério alterado, nenhuma capacidade nova, nenhuma
captura real introduzida):

1. **C7/G2 — exclusão de hosted tools do Codex não era consultável**: o relatório nunca comunicava que hosted
   tools (ferramentas executadas no servidor, ex.: busca web/WebSearch) ficam fora da cobertura dos hooks
   locais do Codex (fonte: "Hooks" em https://learn.chatgpt.com/docs/hooks, seção "Tool coverage" — a tabela
   documenta cobertura de hook local para ferramentas de função locais e nenhuma cobertura para hosted tools).
   O Verifier também apontou que o checklist de preparação (`.checks/issue-3-agent-diagnostics.md`, C7) havia
   herdado uma equivalência errada ("hosted tools ficam `unavailable`"), nunca produzida pelo código real
   (sempre `unverified`) nem exigida pela task. Corrigido em duas etapas:
   - Primeira tentativa: um caso especial em `evaluateSupport` (`capability-matrix.mjs`) que sobrescrevia
     `reasonCode` de `tool_calls`/`cli_local` do Codex para `hosted_tools_outside_local_hooks`. Revisão
     adicional do orquestrador (nota preservada em `.checks/code-review/hosted-tools-followup.md`) apontou
     dois problemas nessa primeira versão: (a) o comentário/documentação citava `pre_tool_call`/
     `post_tool_call` como nomes de hook do Codex — esses nomes pertencem ao Hermes, não aparecem na fonte
     primária do Codex; (b) a exclusão é um fato do **contrato documentado**, não desta instalação, então
     sobrescrever `reasonCode`/`support`/`evidence.origin` da linha escondia o motivo genérico real (ex.:
     `no_local_evidence`) atrás de um motivo que não resultou de inspeção local, violando a distinção de
     origem exigida pelos critérios 5/7.
   - Versão final: `evaluateSupport` nunca trata `tool_calls` como caso especial — a linha `tool_calls`/
     `cli_local` do Codex segue a avaliação genérica normalmente (`no_local_evidence` ou
     `version_profile_incompatible`, igual a qualquer outro mecanismo). A exclusão documentada vira um campo
     próprio e independente na linha, `exclusion: { reasonCode: "hosted_tools_outside_local_hooks", origin:
     "documented_contract", source: "https://learn.chatgpt.com/docs/hooks" } | null`, presente só para
     `codex`/`tool_calls`/`cli_local` (nunca para as demais superfícies, que já usam
     `surface_not_inspected` sem relação com hosted tools). `render-text.mjs` imprime essa exclusão como uma
     linha adicional, com sua própria origem, quando presente. `docs/agent-compatibility.md` ganhou uma linha
     nova citando a fonte/seção corretas, sem nomes de hook do Hermes e sem exemplo não sustentado por fonte
     (removido "interpretador de código"; mantido só "busca web/WebSearch"). Regressão RED→GREEN em
     `capability-matrix.unit.test.mjs` (linha genérica nunca sobrescrita, exclusão presente só em
     `cli_local`) e prova de fronteira real da CLI nos dois formatos, com motivo distinto da superfície
     `cloud`, em `capability-evidence.cli.test.mjs`.
2. **C11/G1 — texto perdia path, mecanismo/superfície, reasonCode/evidence e decisões de cada capacidade**:
   `render-text.mjs` reduzia as 20 linhas de capacidade por agente a uma contagem por estado (`verificado: N,
   não verificado: M`) e nunca imprimia `agent.path` nem `environment.platform/cwd/generatedAt` — os dois
   formatos deixavam de apresentar os mesmos fatos do mesmo modelo de relatório. Corrigido: o renderer agora
   imprime, por agente, o caminho do artefato e o ambiente do relatório, e por capacidade, mecanismo ×
   superfície, `support`, `reasonCode`, `evidence.origin`, `configuration` e a exclusão documentada quando
   presente — consumindo as decisões já tomadas pelo modelo, sem reimplementar nenhuma regra de diagnóstico
   no renderer. Provas: `tests/doctor/render-text.unit.test.mjs` (novo; função pura, relatório sintético
   COMPARTILHADO entre montagem e asserções, sem depender de timestamps de processo) e uma regressão
   `envelope-C11` em `envelope.cli.test.mjs` que invoca a CLI real duas vezes sobre a mesma instalação
   sintética (texto numa chamada, JSON na outra) e confirma que todo `reasonCode`/`evidence.origin`/
   `exclusion` distintos por superfície aparecem no texto — `generatedAt` é o único fato excluído da
   comparação, por variar entre as duas invocações reais; nenhum outro campo foi ignorado para obter verde.
3. **C15/G3 — mutação durante a leitura não chegava aos consumidores de versão**: `readBoundedText`
   (`snapshot-read.mjs`), usado por `launcher-link/codex.mjs` (shim e `package_metadata`) e
   `launcher-link/hermes.mjs` (shim e `source_literal`), descartava `snapshot.changedDuringRead` e devolvia
   `state: "ok"` com o texto lido durante a mutação, como se a leitura fosse estável — diferente de
   `config-reader.mjs`, que já propagava a mesma condição para `configuration: unknown`. Corrigido:
   `readBoundedText` agora devolve `state: "changed_during_read"`, e os quatro pontos de leitura reais
   (`resolveCodexVersion` para o shim e para `package.json`; `resolveHermesVersion` para o shim e para
   `__init__.py`) retornam `version: null`/`reasonCode: "version_changed_during_read"` quando essa mutação é
   detectada — nunca publicando a versão lida durante a mutação, nunca confundindo com
   `launcher_not_recognized`/`version_unreadable`, e preservando `presence: present` a montante (decidida em
   `agent-resolution.mjs` apenas pela existência do launcher, não pela versão). Provas RED→GREEN em
   `mid-read-mutation.unit.test.mjs`: o wrapper isolado (`readBoundedText`) e os três consumidores reais
   (package.json mutado, shim mutado, `__init__.py` mutado), cada um com `stat()`/leitura efetiva que
   discordam deliberadamente, como numa mutação real.
4. **C16/G4 — faltavam dois cenários na fronteira real da CLI**: o inventário (`fixture-suite-inventory.
   test.mjs`) provava declaração de origem e existência de arquivo, mas não a montagem real do relatório via
   processo para (a) uma instalação RECONHECIDA (vínculo real ao pacote, não um "launcher alheio" como
   `presence-C3`) com versão fora de `known-version-profiles.mjs`, e (b) configuração inacessível. Corrigido
   com dois testes novos que executam a CLI real:
   - `presence-C16` (`presence.cli.test.mjs`): `writeCodex` (agora exportado de `fixture-agents.mjs`) com
     versão `9.9.0`, shim ligado de verdade ao `package.json` — `presence: present`, `version: "9.9.0"`,
     `versionSource: "package_metadata"`, nunca `launcher_not_recognized`; as cinco linhas `cli_local` da
     matriz de capacidades ficam `unverified/version_profile_incompatible`.
   - `configuration-trust-C16` (`configuration-trust.cli.test.mjs`): em vez de permissão negada real (não
     portátil entre Windows/Linux/macOS — `chmod` não bloqueia o dono no Windows, CI roda como root, mesma
     limitação já declarada para C3), um diretório real no lugar de `config.yaml` do Hermes produz uma falha
     de leitura real e determinística nas três convenções de SO (`EISDIR` ao tentar ler um diretório como
     arquivo, confirmado nesta máquina via `fs.readFile`/`open`+`read`) — `configuration:
     unknown/policy_precedence_undetermined`, com Claude/Codex preservados como `not_configured` no mesmo
     relatório (`status: partial`, `agents.length === 3`). Nenhum teste foi pulado em toda plataforma nem
     afirma permissão nativa não exercitada; os dois cenários novos também foram registrados em
     `fixture-manifest.mjs` (`C16-versao-sem-perfil-cli`, `C16-config-inacessivel-cli`).

Resultado real após estes fixes (rodado nesta máquina, Windows, nesta data; saída completa salva em
`.checks/code-review/verifier-fixes-issue-3.npm-test.txt`, sem pipe mascarando o código de saída):

```
npm test
  test:governance  -> 6 passed, 0 failed, 0 skipped   (exit 0)
  test:code-review -> 10 passed, 0 failed, 0 skipped  (exit 0)
  test:doctor      -> 149 passed, 0 failed, 1 skipped (exit 0)
EXIT_CODE=0
```

O único skip continua sendo o mesmo da seção 3 (symlink real, mecanismo POSIX, condicional à plataforma do
executor) — não um skip novo desta rodada. Nenhum arquivo fora de `src/doctor/**`, `tests/doctor/**`,
`docs/agent-compatibility.md` e os dois checklists desta issue foi tocado:

- Produto: `src/doctor/capability-matrix.mjs`, `src/doctor/render-text.mjs`, `src/doctor/snapshot-read.mjs`,
  `src/doctor/launcher-link/codex.mjs`, `src/doctor/launcher-link/hermes.mjs`.
- Testes/fixtures: `tests/doctor/capability-matrix.unit.test.mjs`,
  `tests/doctor/capability-evidence.cli.test.mjs`, `tests/doctor/mid-read-mutation.unit.test.mjs`,
  `tests/doctor/presence.cli.test.mjs`, `tests/doctor/configuration-trust.cli.test.mjs`,
  `tests/doctor/envelope.cli.test.mjs`, `tests/doctor/helpers/fixture-agents.mjs` (exporta `writeCodex`),
  `tests/doctor/helpers/fixture-manifest.mjs`. Arquivo de teste novo: `tests/doctor/render-text.unit.test.mjs`.
- Documentação/checklist: `docs/agent-compatibility.md`, `.checks/issue-3-agent-diagnostics.md` (C7/C11/C15/C16).

Limitações reais preservadas, nenhuma contornada: permissão negada real continua provada só na camada pura
(`agent-resolution.unit.test.mjs`/`scope-merge.unit.test.mjs`), pela mesma razão de portabilidade entre SOs já
declarada para C3 — o cenário novo de C16 usa uma falha de leitura real e determinística (diretório no lugar
do arquivo), não uma simulação de permissão, por isso cruza a fronteira real da CLI sem depender de `chmod`.
`readBoundedText`/`version_changed_during_read` não promete snapshot transacional nem detecção de toda
mutação possível — apenas a mesma condição de tamanho divergente entre `stat()` e a leitura efetiva já usada
por `config-reader.mjs`. Verifier independente e `review:run` continuam fora desta rodada: o orquestrador
pede nova verificação após o commit.

### Complemento C11 — paridade também nas falhas

A conferência do orquestrador (último parágrafo de `.checks/code-review/hosted-tools-followup.md`) apontou que
`emitFailure` (`src/doctor/cli.mjs`), no modo texto, imprimia só `envelope.errors[0].message`, perdendo o
`code` seguro que o JSON informa. Corrigido sem tocar no renderer: o stderr continua direto e agora imprime
`Erro [<code>]: <message>`, ambos lidos do próprio envelope de `toFailureEnvelope` (vocabulário fechado),
nunca de `error.code`/`error.message` brutos. Nenhuma flag ou regra nova; C7/C15/C16 não foram alterados.

Prova escrita antes da correção: `envelope-C11 falha em texto expõe o mesmo code e message seguros do envelope
JSON (flag, cwd e collector inválidos), sem canário nem stack` (`envelope.cli.test.mjs`). Para cada entrada
inválida (`--<canário>` → `unknown_flag`, `--cwd <scratch>/<canário>` → `cwd_not_found`,
`--collector=tcp://<canário>:x@127.0.0.1:9` → `invalid_collector_endpoint`), invoca a CLI real duas vezes
(texto e `--json`), afirma o `code` exato do envelope, exit 2 idêntico nos dois formatos, `code` e `message`
do envelope presentes no stderr do texto, e ausência do canário e de frame de stack nas quatro saídas.

- RED (comportamento anterior, só esse teste): `tests 1, pass 0, fail 1`, falha em
  `unknown_flag: código do envelope ausente no texto`.
- GREEN após a correção: `tests 1, pass 1, fail 0, skipped 0`.
- Provas afetadas (`envelope.cli.test.mjs` + `collector.cli.test.mjs`): `tests 19, pass 19, fail 0, skipped 0`.
- `npm test` completo (saída em `.checks/code-review/c11-failure-parity.npm-test.txt`, sem pipe mascarando o
  código de saída): governance 6/6, code-review 10/10, doctor `tests 151, pass 150, fail 0, skipped 1` (o
  mesmo skip POSIX de symlink da seção 3), `EXIT_CODE=0`.

Arquivos desta complementação: `src/doctor/cli.mjs` (`emitFailure`) e `tests/doctor/envelope.cli.test.mjs`.

## 9. Rodada formal 1 — sete achados bloqueantes de `review:run` (13/10/2026)

A primeira revisão formal (`.checks/code-review/issue-3/response.json`, HEAD revisada `a41001c`) devolveu
`changes_requested` com sete achados bloqueantes e AC1, AC2, AC3 e AC6 como `unmet`. Esta seção registra
as correções do autor (Claude), dentro do escopo decidido: nenhum critério da task mudou; `.verified.md`,
task, core vendorizado, `code-review.config.json` e regras de governança não foram tocados; nada foi
instalado, executado de agente, capturado, confiado ou reparado; nenhuma flag nova. Sem commit, push,
stash ou subagente nesta rodada; `review:run` fica com o orquestrador.

### Ordem seguida

1. **Landing antes do código**: as sete decisões foram registradas em `.checks/issue-3-agent-diagnostics.md`,
   seção "Landing da rodada formal 1", antes de qualquer linha de produto.
2. **Regressões escritas antes da correção** e executadas contra o produto anterior. RED real (saída
   completa em `.checks/code-review/formal-round1-red.txt`, sem pipe mascarando o exit):
   `tests 190, pass 148, fail 41, skipped 1, EXIT_CODE=1`. Falharam todas as regressões novas dos sete
   achados, inclusive as de fronteira CLI (Hermes `verified`, launcher ausente `unavailable`, 45 linhas
   `not_inspected`, `codex.exe`/`claude.cmd` no primeiro diretório, shim npm local, hooks
   estruturalmente inválidos) — no Windows, o teste POSIX de caminhos (`config-sources`) falhou de forma
   simétrica ao achado 1.
3. Implementação e GREEN (abaixo). Durante o GREEN, uma asserção que eu mesmo acrescentara estava errada
   (`configuration` das linhas de IDE/desktop/cloud é `unknown` por desenho; só a CLI local carrega a
   configuração lida) e foi restringida às linhas `cli_local` — não é um critério da task nem um
   enfraquecimento de prova anterior.

### Decisões e correções por achado

1. **Caminhos Hermes sob `platform: "win32"` (P1)** — `config-sources.mjs` passou a montar todos os
   caminhos (Claude, Codex, Hermes) com `path.win32` quando `platform === "win32"` e `path.posix` nos
   demais, nunca com o `path` nativo do executor. Em produção coincide com o nativo. O teste corrigido
   compara com literais exatos do contrato para win32, linux e darwin (o caso POSIX antigo comparava com
   `path.join` nativo e por isso falharia no Windows depois da correção); a garantia de descoberta do home
   nativo (`%LOCALAPPDATA%/hermes`, fallback `<HOME>/AppData/Local/hermes`, `HERMES_HOME` exato) e dos
   overrides `CLAUDE_CONFIG_DIR`/`CODEX_HOME` foi mantida e ampliada. Outros usos de separador conferidos:
   `fixture-agent-config.mjs` usa a mesma função com `process.platform` (coincide com a CLI);
   `agent-resolution`/`launcher-link` detectam o separador no próprio caminho; os testes com plataforma
   simulada usam FS em memória.
2. **Avaliação efetiva de contrato (P2)** — removido `hasLocalVerifiedContract` constante. Novo
   `src/doctor/contract-evidence.mjs`: para o Hermes, lê como texto (até 1 MiB, snapshot, sem import) o
   literal `VALID_HOOKS` de `hermes_cli/plugins.py` no MESMO pacote do `__init__.py` de onde veio a versão
   (o `packageDir` agora devolvido por `resolveHermesVersion` e repassado por `agent-resolution.mjs`, sem
   entrar no relatório). Atribuição única no nível do módulo, sem mutação, só strings simples; comentários
   descartados. `capability-matrix.mjs` decide por mecanismo, nesta ordem: superfície não local →
   `surface_not_inspected`; launcher ausente → `unavailable/executable_not_found` (só CLI local); presença
   `unknown` → `presence_undetermined`; versão nula → `version_unresolved`; perfil incompatível →
   `version_profile_incompatible`; depois a tabela: todos os eventos mapeados listados →
   `verified/local_contract_lists_events` com `evidence.source {kind, path}` e `evidence.events`; algum
   ausente → `unverified/contract_event_not_listed` com `evidence.missingEvents`; fonte ausente, ilegível,
   grande, mutada ou com forma não reconhecida → `unverified` com motivo próprio. Claude e Codex →
   `unverified/no_static_contract_source`. `runtimeVerification` continua sempre `not_performed`.
3. **Resolução Windows (P2)** — candidatos por `PATHEXT` do ambiente em cada diretório do PATH (entradas
   validadas `^\.[a-z0-9]{1,8}$`; default `.com;.exe;.bat;.cmd`); primeiro candidato existente vence;
   formato desconhecido → `present/version null/launcher_not_recognized`. Novo
   `launcher-link/native-executable.mjs` + `readHead` (`snapshot-read.mjs`): executável nativo (PE/ELF/
   Mach-O) de Codex/Hermes é reconhecido só pelos 4 primeiros bytes, sem leitura como texto (antes, um
   `codex.exe` de 333 MB daria `input_too_large`). Nenhum `--version` é executado.
4. **Shim npm local do Codex (P2)** — a referência passa a ser ancorada na base do shim
   (`%dp0%`/`%~dp0`/`$basedir`) e resolvida com `.`/`..` a partir do diretório do launcher
   (`resolveRelative` em `path-helpers.mjs`, que substituiu `normalizeReference`), exigindo
   `node_modules/@openai/codex` no caminho resolvido; mais de um pacote distinto → ambíguo. O código
   anterior também remontava qualquer `node_modules/@openai/codex` encontrado no texto a partir do
   diretório do launcher, ignorando o prefixo real. Fixtures trocadas pelos templates reais do cmd-shim
   (global `"%dp0%\node_modules\@openai\codex\bin\codex.js"` e local `"%dp0%\..\<pacote>\..."`, conferidos
   em `C:\nvm4w\nodejs\codex.cmd` e em `node_modules/.bin/yaml.cmd` deste repositório) e pelo symlink do
   npm no POSIX; o shim `require("./node_modules/...")` anterior era fictício. Recusas de launcher alheio,
   comentário (`#`, `REM`, `::`, inclusive na forma ancorada) e referência que sai de `node_modules`
   preservadas e provadas. **Registro histórico — refinado na seção 10**: a referência ancorada ainda
   valia em qualquer posição (um `echo` dela ligava o pacote); agora só a linha de invocação do template.
5. **Hermes com vários `pythonX.Y` (P2)** — `pythonX.Y` do shebang (direto, via `env`, com flags como
   `-S`) escolhe `lib/pythonX.Y/site-packages`; sem versão no shebang, um único candidato com `hermes_cli`
   é usado e dois ou mais → `version_source_ambiguous`; versão do shebang sem pacote →
   `launcher_not_recognized`. A extração de versão de launcher compilado não foi ampliada (C3 admite
   inconclusivo).
6. **Hooks estruturalmente inválidos (P2)** — novo `src/doctor/hooks-shape.mjs`, uma forma por agente
   (sem schema comum): Claude e Codex com grupos `{ matcher?: string, hooks: [handler] }` (`type` string
   obrigatório só no Claude, conforme as duas docs oficiais consultadas nesta data); Codex com `state`
   reservado; Hermes com mapeamento evento → `null` ou lista de mapeamentos com `command` não vazio e
   `output_spill`/`outbound` reservados (do parser instalado). Fora da forma →
   `invalid/hooks_structure_invalid` → `partial`, preservando os demais agentes. Vazio válido,
   `disabled`, consentimento e a regra `configured` (≥1 evento) inalterados. Fixtures corrigidas: o TOML
   `PreToolUse = [{ command = "x" }]` não era a forma documentada do Codex, e `agent:start` é evento de
   gateway hook, não de shell hook em `config.yaml`. **Registro histórico — refinado na seção 11**: alvo
   obrigatório por tipo de handler, `type` também obrigatório no Codex, `managed_dir`/`windows_managed_dir`
   reservados, e `configured` passa a exigir ≥1 handler com alvo.
7. **Origem `fixture` por default (P2)** — `evidence.origin` agora é `not_inspected` por default e em
   qualquer superfície não inspecionada; a CLI local declara `real_environment`; `fixture` só quando uma
   prova a passa; `documented_contract` só na `exclusion`. Texto e JSON trazem as 45 linhas não locais
   como `not_inspected`.

### Fontes primárias examinadas (somente leitura como texto; nada importado ou executado)

- Hermes instalado (`%LOCALAPPDATA%\hermes\hermes-agent`, 0.21.4): `hermes_cli/plugins.py`
  (`VALID_HOOKS`, `SHELL_UNSUPPORTED_HOOKS`), `agent/shell_hooks.py` (`_parse_hooks_block`,
  `_parse_single_entry`), `website/docs/user-guide/features/hooks.md` (catálogo de plugin hooks e a frase
  "Runtime event-name validity comes from `hermes_cli.plugins.VALID_HOOKS`"), `hermes_cli/__init__.py`;
  `bin/hermes.exe` e `venv/Scripts/hermes.exe` lidos só nos últimos bytes (launcher de 47 KB sem
  conteúdo de texto anexado; `pyvenv.cfg` com `version_info = 3.11`; instalação editável). Nenhum outro
  conteúdo do perfil (config, `.env`, auth, sessões) foi aberto.
- Codex npm global (`C:\nvm4w\nodejs`): `codex.cmd`, `codex` (sh), `node_modules/@openai/codex/package.json`,
  pacote de plataforma e `codex-package.json` — só wrapper JS e binário nativo, sem tabela de eventos.
  `~/.codex/config.toml`: apenas os cabeçalhos de tabela ligados a hooks, com valores ocultados
  (`[hooks.state]` e subtabelas escritas pelo Codex).
- Claude nativo (`~/.local/bin/claude.exe`, `~/.local/share/claude/versions`): só listagem; nenhum
  artefato textual de contrato.
- Docs oficiais (WebFetch nesta data): [Codex Hooks](https://learn.chatgpt.com/docs/hooks) — forma de
  `hooks.json`/`config.toml`, `matcher` opcional, `type` sem obrigatoriedade declarada, nenhum `[hooks.state]`
  documentado; [Claude Hooks](https://code.claude.com/docs/en/hooks) — três níveis, `type` obrigatório,
  `matcher` opcional.

### Evidência local obtida

- `node src/doctor/cli.mjs --json` nesta máquina (resumo, saída bruta não versionada): `status: complete`;
  Claude `present` (`.local\bin\claude.exe`, 2.1.295, `binary_metadata`), config `configured`, CLI local
  `unverified/no_static_contract_source`; Codex `present` no `codex.cmd` do prefixo npm (antes do
  `codex.exe` do app, mais adiante no PATH), 0.162.1 (`package_metadata`), config `configured` (o
  `config.toml` com `[hooks.state]` não é mais tratado como hook definido nem como inválido), CLI local
  `no_static_contract_source`/`skill_start_not_documented`; Hermes `present` em `hermes.exe`, versão
  `null`/`launcher_not_recognized`, CLI local `version_unresolved`. Origens no relatório: só
  `real_environment` e `not_inspected`.
- `readContractEvidence` contra o `hermes_cli/plugins.py` real (124.598 bytes): `state: found`, 41 nomes
  lidos (conferidos à mão contra o arquivo), todos os eventos mapeados presentes. Na CLI real esse arquivo
  não é alcançado porque o launcher compilado não liga ao pacote — lacuna declarada, não contornada.
- Fixtures sintéticas comprovam o algoritmo; não comprovam a máquina do usuário.

### Resultados

```
npm test   (saída completa em .checks/code-review/formal-round1-npm-test.txt, sem pipe)
  test:governance  -> tests 6,   pass 6,   fail 0, skipped 0
  test:code-review -> tests 10,  pass 10,  fail 0, skipped 0
  test:doctor      -> tests 197, pass 196, fail 0, skipped 1
EXIT_CODE=0
```

Provas nomeadas do checklist rodadas isoladamente com contagem não nula: `capability-evidence-C5` 5/5,
`capability-evidence-C16` 1/1, `agent-resolution-C14` 1/1, `configuration-trust-C8` 11/11,
`presence-C2` 3/3, `presence-C3` 5/5, `contract-evidence` + `config-sources` + `config-reader` 21/21.
Paridade do motor comum: `git diff --exit-code 4242520 -- scripts/code-review/{cli.mjs,review.mjs,
review.test.mjs,schema.json,README.md}` sem diff. `package.json`, `package-lock.json`, CI, task,
`.verified.md` e `code-review.config.json` sem diff.

### Plataforma e limitações

- Executado de verdade só em **Windows 11 Pro, Node 24.21.0**. Linux e macOS **não** foram executados:
  há WSL Ubuntu e Docker nesta máquina, mas sem Node e sem imagem Node local, e instalar algo está fora do
  escopo. A matriz da CI é a primeira execução real nesses SOs.
- O que roda em qualquer runner por simulação: caminhos com `platform` explícito (`path.win32`/
  `path.posix`), resolução com FS em memória para `win32`/`linux`/`darwin` (inclusive symlink simulado e
  dois `pythonX.Y`). Os caminhos POSIX da CLI (symlink real do npm global e local, launcher ELF opaco)
  foram revisados estaticamente e só rodam na CI; os testes CLI se adaptam ao SO do runner, sem skip.
- Skip: só o mesmo `agent-resolution-C2 realpath/symlink real ... (POSIX)` da seção 3, condicional ao
  executor.
- Estados `unreadable`/`too_large`/`changed_during_read` da fonte de contrato são provados na camada de
  `contract-evidence`, não pela CLI (mesma limitação de permissão/mutação já declarada para C3/C15).

### Riscos e lacunas declaradas

- Claude e Codex nunca chegam a `verified` nesta entrega: não há fonte textual de contrato nos layouts
  inspecionados. O Hermes só chega lá com layout padrão de venv; instalação editável e launcher compilado
  ficam `version_unresolved`, como nesta máquina.
- O mapeamento mecanismo→evento é decisão do doctor (fonte: catálogo da doc do Hermes); a tabela prova o
  que o mecanismo de hooks aceita, não captura real. Evento ausente nunca vira `unavailable`.
- `[hooks.state]` do Codex é reservado com base em observação local, não em contrato publicado.
- A validação estrutural não confere nomes de evento nem comandos; `{"hooks":{"PreToolUse":[]}}` continua
  `configured` pela regra anterior (≥1 evento), que esta rodada não mudou.
- `PATHEXT` do ambiente é respeitado com validação; a preferência do PowerShell por `.ps1` e o
  `pyvenv.cfg` não são modelados.
- Fora do escopo, só registrado: `tests/doctor/helpers/fixture-configs.mjs` mantém escritores sem uso
  (`writeValidYamlConfig` etc.) com formas inventadas na preparação; não foram alterados nem usados.

### Arquivos desta rodada

- Produto novo: `src/doctor/contract-evidence.mjs`, `src/doctor/hooks-shape.mjs`,
  `src/doctor/launcher-link/native-executable.mjs`.
- Produto alterado: `agent-resolution.mjs`, `capability-matrix.mjs`, `config-projection.mjs`,
  `config-reader.mjs`, `config-sources.mjs`, `launcher-link/codex.mjs`, `launcher-link/hermes.mjs`,
  `launcher-link/path-helpers.mjs`, `render-text.mjs`, `run-diagnostics.mjs`, `snapshot-read.mjs`.
- Testes novos: `tests/doctor/contract-evidence.unit.test.mjs`, `helpers/npm-shims.mjs`,
  `helpers/hermes-contract-source.mjs`.
- Testes alterados: `agent-resolution.unit`, `capability-evidence.cli`, `capability-matrix.unit`,
  `config-projection.unit`, `config-reader.unit`, `config-sources.unit`, `configuration-trust.cli`,
  `envelope.cli`, `mid-read-mutation.unit`, `presence.cli`, `render-text.unit`, `helpers/fake-fs-adapter`
  (symlink simulado), `helpers/fixture-agents` (layouts reais do npm, `plugins.py` opcional, sem a tabela
  `HOOKS` inventada no `__init__.py`), `helpers/fixture-manifest` (cenários novos).
- Documentação/checklist: `docs/agent-compatibility.md`, `README.md`, `.checks/issue-3-agent-diagnostics.md`
  (Landing da rodada formal 1, C2, C3, C5, C8, C11, C16, Coverage) e esta seção.

## 10. Pré-revisão formal da rodada 2 — vínculo e fonte só em código (13/10/2026)

Antes da nova revisão, o orquestrador registrou em `.checks/code-review/formal-source-hints.md` probes
concretos sobre o código da seção 9, todos do mesmo tipo: texto que só MENCIONA o vínculo ou a fonte era
aceito como vínculo/fonte. Autor: Claude. Escopo: os três casos abaixo (achados 4, 2 e 5 da rodada formal
1; critérios C2-C3 e C5), sem mudar critério, task, `.verified.md`, core vendorizado ou
`code-review.config.json`; nada instalado, importado ou executado (Python e Hermes nunca foram chamados);
sem commit, push, stash, subagente ou `review:run`.

### Ordem seguida (TDD)

1. Regressões escritas antes do produto, na própria camada e na CLI. RED real (saída em
   `.checks/code-review/formal-round2-red.txt`, sem pipe mascarando o exit): `tests 10, pass 1, fail 9,
   EXIT_CODE=1` — as nove regressões novas falharam pelo motivo esperado (o único `pass` é um teste
   anterior que casou o filtro de nome). Como o runner só mostra a primeira asserção de cada teste, o mesmo
   arquivo traz a tabela caso a caso do produto anterior (script temporário fora do repositório): os 10
   casos de shim que não invocam o pacote davam `0.162.1`; comentário, comentário após código, docstring e
   outra string davam `__version__` `0.21.4`; a forma instalada com uma docstring de função citando outra
   versão dava `version_source_ambiguous` (falso ambíguo); as três fontes do probe davam 11 nomes de
   `VALID_HOOKS` (logo `verified`).
2. Implementação e GREEN: a mesma tabela passou a dar `launcher_not_recognized`, `version_unreadable`/
   `version_source_ambiguous`, `0.21.4` e `null` nos casos correspondentes, com os dois templates nativos
   ainda em `0.162.1` (mesmo script depois da correção, anexado ao fim do mesmo arquivo).

### Decisões

1. **Codex: vínculo só pela invocação do template npm** (`launcher-link/codex.mjs`). A referência ao
   arquivo de entrada só conta como argumento do node na linha com que o cmd-shim executa o pacote: no
   `.cmd`, `endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\<ref>" %*`; no sh,
   as duas linhas `exec "$basedir/node"`/`exec node  "$basedir/<ref>" "$@"`. O dialeto vem da extensão
   (`.cmd`/`.bat` → cmd; sem extensão → sh) e a linha precisa começar um comando segundo o contexto léxico
   do dialeto (novo `launcher-link/shim-lines.mjs`): no sh, fora de aspas que atravessam linhas, de
   here-document e de continuação com `\`; no cmd (sem string multilinha), não depois de uma linha
   terminada em `^`. O resto (resolução de `..`, exigência de `node_modules/@openai/codex`, ambiguidade,
   symlink por `realpath`) não mudou. Um `echo` da referência, a linha de invocação impressa por `echo`,
   dentro de here-document ou string, continuando outra linha ou no dialeto errado →
   `launcher_not_recognized`. O `%~dp0` de templates antigos do cmd-shim deixou de ser aceito: os shims
   reais conferidos e as fixtures usam o template atual; um template diferente fica
   `launcher_not_recognized`/versão nula (inconclusivo admitido por C3), nunca uma versão errada.
2. **`VALID_HOOKS` só como literal atribuído em código** (`contract-evidence.mjs`). Novo leitor léxico
   compartilhado `src/doctor/python-source.mjs` (tokenizador mínimo: nomes, strings, pontuação, fim de
   linha lógica, profundidade de colchetes; sem import/eval/compilação). Exige exatamente uma ligação do
   nome em código, que seja `VALID_HOOKS[: T] = {` no início de instrução, coluna 0 e fora de colchetes; os
   itens são strings simples (sem prefixo, sem três aspas, sem `\`) separadas por vírgula (vírgula final
   opcional); depois do `}` a instrução termina (comentário permitido). Strings adjacentes (concatenação
   implícita do Python), operador depois do literal, `;`, continuação com `\`, `{}` (dict), atribuição em
   docstring/comentário/string, argumento nomeado em chamada, cadeia, `:=`, reatribuição indentada e as
   demais ligações (desempacotamento, `for`, `import`/`as`, `del`/`global`, `def`/`class`) → forma não
   reconhecida → `unverified/contract_source_unrecognized`. A busca de mutação (`|=`, `.add(` etc.)
   continua no texto bruto, conservadora. Nomes citados em docstring deixam de contar como segunda
   atribuição.
3. **`__version__` só como atribuição reconhecida em código** (`launcher-link/hermes.mjs`, mesmo leitor).
   Versão = literal simples de `__version__ = "..."`/`__version__: T = "..."` no nível do módulo,
   encerrando a instrução. Comentário, docstring ou outra string → `version_unreadable` (sem
   `source_literal`, sem `packageDir`, logo sem fonte de contrato). Literal seguido de expressão
   (`"0.21.4" + "-dev"`, `; ...`) ou valor calculado → `version_unreadable`. Literal reconhecido junto de
   outra ligação do nome em código (reatribuição indentada ou calculada) ou de literais distintos →
   `version_source_ambiguous`.
4. **Mesma fronteira no import do launcher Hermes** (extensão do item 3 no mesmo arquivo, sem caso novo de
   produto): quando o shebang é de Python, o `from hermes_cli… import`/`import hermes_cli` precisa ser
   instrução em código, não docstring. Launchers que não são Python pelo shebang (o `.cmd` simplificado, o
   trampolim `#!/bin/sh` do pip) seguem a leitura por linha sem comentários da seção 9.
5. **Fail-closed do leitor**: string não terminada, `\` fora de string sem fim de linha, colchetes
   desbalanceados e f-string cujo fim cairia dentro de um campo `{…}` (aspas aninhadas do Python 3.12) fazem
   o arquivo inteiro não ser reconhecido; nada é adivinhado.

### Provas

| Caso | Camada própria | Fronteira CLI |
| --- | --- | --- |
| (1) shim Codex echo-only + `package.json` real ao lado | `agent-resolution-C3 shim do Codex que só menciona a referência…` (6 casos sh + 4 cmd, com controle positivo dos dois templates no mesmo layout) | `presence-C3 shim do Codex que só imprime a referência ao pacote (echo)…` (JSON `launcher_not_recognized`/`versionSource null`; texto sem `0.162.1`) |
| (2) strings adjacentes, diferença após o literal, atribuição em docstring | `contract-evidence-C5 strings adjacentes, expressão depois do literal…` e `…só a atribuição literal em código…` (12 formas recusadas, 2 aceitas) | `capability-evidence-C5 fonte que só parece VALID_HOOKS…` (as três fontes, versão/perfil compatíveis como premissa: 5 linhas `unverified/contract_source_unrecognized`, texto sem `local_contract_lists_events`) |
| (3) `__version__` só em comentário | `agent-resolution-C3 __version__ só em comentário, docstring ou outra string…` e `…__version__ em código: literal no nível do módulo…` (positivo com a forma instalada) | `capability-evidence-C5 __version__ só em comentário…` (com `VALID_HOOKS` válido ao lado: versão nula, `version_unreadable`, 5 linhas `version_unresolved`, texto sem `0.21.4`) |
| import do launcher só em docstring | `agent-resolution-C3 launcher Python do Hermes que cita o import…` (com controle positivo) | — (mesma regra do item 3, provada na camada) |

As variantes de (2) vêm de `hermesPluginsLookalikeSources()` (`helpers/hermes-contract-source.mjs`),
derivadas da fonte sintética completa, com todos os eventos mapeados escritos: só a forma explica a
recusa. O fixture `writeHermes` ganhou `initSource` opcional (default inalterado).

### Formas reais preservadas (leitura só como dados, ≤ 1 MiB, nada importado ou executado)

- `hermes_cli/plugins.py` instalado (124.598 bytes): tokenizado sem falha, exatamente uma ligação de
  `VALID_HOOKS` em código (a do nível do módulo), 41 nomes, todos os eventos mapeados presentes.
- `hermes_cli/__init__.py` instalado, num layout sintético de venv: `0.21.4`/`source_literal`.
- Shims npm reais `C:\nvm4w\nodejs\codex.cmd` e `C:\nvm4w\nodejs\codex` (sh), pelo adaptador de produção:
  `0.162.1`/`package_metadata`.
- `node src/doctor/cli.mjs --json` nesta máquina (resumo): igual à seção 9 — Claude 2.1.295
  (`binary_metadata`), Codex `codex.cmd` 0.162.1 (`package_metadata`), Hermes `hermes.exe`
  `null`/`launcher_not_recognized`; origens só `real_environment` e `not_inspected`.

### Resultados

```
npm test   (saída completa em .checks/code-review/formal-round2-npm-test.txt, sem pipe)
  test:governance  -> tests 6,   pass 6,   fail 0, skipped 0
  test:code-review -> tests 10,  pass 10,  fail 0, skipped 0
  test:doctor      -> tests 206, pass 205, fail 0, skipped 1
EXIT_CODE=0
```

As nove regressões novas aparecem como `✔` pelo nome na saída. Skip: só o mesmo
`agent-resolution-C2 realpath/symlink real … (POSIX)` das seções 3 e 9, condicional ao executor.
Paridade do motor comum: `git diff --exit-code 4242520 -- scripts/code-review/{cli.mjs,review.mjs,
review.test.mjs,schema.json,README.md}` sem diff; `package.json`, `package-lock.json`, CI e task sem diff.

### Limitações declaradas

- Executado só em Windows 11 Pro, Node 24.21.0 (mesma limitação da seção 9). Os casos sh e POSIX desta
  seção rodam em FS em memória em qualquer runner; a regressão CLI do echo usa `codex.cmd` no Windows e o sh
  no POSIX (este último só na CI).
- O vínculo do Codex é léxico: fluxo de controle (`goto`, `exit`, `if`) e valores de variáveis/funções do
  shim (`_prog`, `basedir`, `node`) não são avaliados. A regra do `^` no cmd é conservadora (pode recusar
  um shim alterado à mão; nunca liga um que não invoca).
- O leitor Python não é um parser: reconhece só as formas descritas; qualquer outra fica não reconhecida
  (contrato) ou ilegível/ambígua (versão). A busca de mutação no texto bruto pode recusar um arquivo que
  só cite `VALID_HOOKS.add(` numa string — falso negativo admitido.
- `docs/agent-compatibility.md` (células de Codex e Hermes) e o checklist (landing da rodada 1: linhas de
  contrato e de shim, e o resumo de C2) foram ajustados só para descrever a regra refinada.

### Arquivos desta seção

- Produto novo: `src/doctor/python-source.mjs`, `src/doctor/launcher-link/shim-lines.mjs`.
- Produto alterado: `src/doctor/launcher-link/codex.mjs`, `src/doctor/launcher-link/hermes.mjs`,
  `src/doctor/contract-evidence.mjs`.
- Testes: `agent-resolution.unit`, `contract-evidence.unit`, `capability-evidence.cli`, `presence.cli`,
  `helpers/hermes-contract-source.mjs` (`hermesPluginsLookalikeSources`), `helpers/fixture-agents.mjs`
  (`initSource`).
- Evidência: `.checks/code-review/formal-round2-red.txt`, `.checks/code-review/formal-round2-npm-test.txt`
  e esta seção; documentação e checklist como acima.

## 11. Pré-revisão formal da rodada 2 — forma nativa dos handlers de hooks (13/10/2026)

Último parágrafo de `.checks/code-review/formal-source-hints.md` (achado 6 / C8): `managed_dir`/
`windows_managed_dir` do Codex davam `invalid`, e Claude `{type:"command"}` sem `command` e Codex `{}`
davam `configured`. Autor: Claude. Escopo: só `hooks-shape.mjs` e o necessário em `config-projection`/
`config-reader`/`scope-merge` para o estado seguro; launchers, contrato e leitores Python intocados; sem
mudar critério, task, `.verified.md`, core vendorizado, `code-review.config.json`, CI ou `package.json`;
sem commit, push, stash, subagente ou `review:run`. Decisão registrada no Landing (linha "Forma nativa dos
hooks") antes do código.

### Fontes primárias (leitura como texto; nada executado nem enviado)

- [Claude Hooks](https://code.claude.com/docs/en/hooks), "Hook handler fields": cinco tipos; `type`
  obrigatório; `command` (command), `url` (http), `server`+`tool` (mcp_tool), `prompt` (prompt/agent)
  marcados "Required: yes". A página não diz o que acontece com tipo fora dos cinco.
- [Codex Hooks](https://learn.chatgpt.com/docs/hooks), "Managed hooks": `managed_dir` (macOS/Linux) e
  `windows_managed_dir` (Windows) sob `[hooks]` de `requirements.toml`, como strings; "Codex doesn't
  distribute the scripts in `managed_dir`"; "`command` and `mcp_tool` handlers are supported. `prompt` and
  `agent` handlers are parsed but skipped".
- Código do Codex na tag `rust-v0.162.1` (a versão instalada nesta máquina), via API pública do GitHub:
  `codex-rs/config/src/hook_config.rs` — `HookHandlerConfig` é `#[serde(tag = "type")]` (`type`
  obrigatório), `Command { command: String, command_windows (rename commandWindows, alias
  command_windows): Option<String>, … }`, `McpTool { server: String, tool: String, … }`, `Prompt {}`,
  `Agent {}`; `MatcherGroup { matcher: Option<String>, #[serde(default)] hooks }`; `HooksToml` =
  eventos achatados + `state`, sem `deny_unknown_fields`; `ManagedHooksRequirementsToml { managed_dir,
  windows_managed_dir: Option<PathBuf>, eventos }` só nos requirements. `codex-rs/hooks/src/engine/
  discovery.rs` — no Windows o comando efetivo é `command_windows.unwrap_or(command)`; comando efetivo
  vazio, `mcp_tool` com `server`/`tool` vazios e `prompt`/`agent` são pulados com aviso; o diretório
  gerenciado só vira o caminho-rótulo dos hooks de requirements (`managed_hooks_source_path`); `hooks.json`
  só é lido da pasta da camada, nunca de `managed_dir`. Requirements e o diretório gerenciado não estão
  entre os arquivos que o doctor lê.

### Decisões

1. **Classificação por handler** (`hooks-shape.mjs`): com alvo, sem alvo, inválido ou tipo não
   reconhecido. Claude: `type` string não vazia obrigatória; campos obrigatórios por tipo como na doc.
   Codex: `type` obrigatório (o doc não o declarava; o código da versão instalada exige); `command` string
   obrigatório mesmo no Windows; `command_windows`/`commandWindows` string opcional, as duas grafias juntas
   → inválido (campo duplicado para o serde); `mcp_tool` com `server`/`tool` strings. Campo obrigatório
   ausente ou de outro tipo → `invalid/hooks_structure_invalid`. Alvo vazio/só espaços e `prompt`/`agent`
   no Codex → sem alvo: válido, não conta. Nunca se olha a linguagem/conteúdo do comando, da URL ou do
   prompt; campos opcionais (`timeout`, `async`, `args`, `if`…) não são validados.
2. **`configured` = ≥1 handler com alvo**, para os três agentes. Antes contava evento endereçado, e um
   handler sem alvo teria de valer mais que nenhum handler para não contar. Por isso `PreToolUse: []`,
   grupo sem handlers e `null` no Hermes passam de `configured` a `not_configured` (continuam válidos).
   Os testes de confiança que usavam `PreToolUse: []` como "configured" passam a usar um handler real;
   as asserções não mudam.
3. **Tipo não reconhecido → `unknown/hooks_handler_type_unrecognized`** (arquivo inteiro, campos
   descartados, como o inválido; inválido tem precedência). A versão instalada do Codex rejeita o arquivo
   inteiro com variante desconhecida e o Claude não documenta; uma versão futura pode aceitar. Novo estado
   de escopo `inconclusive` em `config-reader`/`scope-merge`, com a mesma precedência dos estados que
   bloqueiam; `trust` fica `unknown/configuration_not_determined`.
4. **`managed_dir`/`windows_managed_dir` reservados no Codex**, ao lado de `state`: string; outro tipo →
   inválido. Não são eventos e não contam. O diretório não é aberto nem listado, e nenhuma confiança
   "gerenciada" é inferida: a configuração vem só dos handlers lidos, e `trust` segue a regra existente
   (`unknown/no_native_consent_evidence` se configurado). A decisão não depende do diretório, pois o
   Codex não carrega definições dele; se dependesse, o resultado seria `unknown`.
5. **Plataforma no Codex**: `projectConfig`/`readScope` recebem a `platform` já usada por
   `config-sources`, para escolher o comando efetivo como o Codex escolhe.
6. **Grupo sem `hooks` continua inválido** nos dois agentes. O código do Codex o aceitaria como vazio
   (`#[serde(default)]`, campos extras ignorados), o que faria `PreToolUse = [{ command = "x" }]` deixar de
   ser inválido e enfraqueceria a asserção da rodada 1. Mais estrito que a fonte, nunca leva a `configured`.

### Ordem seguida (TDD)

1. Testes escritos antes do produto. RED real em `.checks/code-review/formal-round2-hooks-red.txt` (sem
   pipe mascarando o exit): `tests 64, pass 50, fail 14, EXIT_CODE=1`. As 14 falhas são os testes novos
   ou ajustados, cada um pelo motivo esperado (`configured` ou `invalid` onde não deveria; o `scope-merge`
   quebrava com o estado novo). Dois testes novos são guardas e já passavam: tipos conhecidos com alvo e
   `managed_dir` de outro tipo. O mesmo arquivo traz a tabela caso a caso do produto anterior, gerada por
   um script temporário fora do repositório. Ela inclui os três probes do hint: `managed_dir` dava
   `invalid`; `{type:"command"}` e `{}` davam `configured`. Uma nota no fim registra o único caso trocado
   depois do RED.
2. GREEN em `.checks/code-review/formal-round2-hooks-green.txt`: `tests 64, pass 64, fail 0, EXIT_CODE=0`,
   e a mesma tabela depois da correção.

### Provas

| Caso | Camada própria | Montagem (leitor) | Fronteira CLI |
| --- | --- | --- | --- |
| `managed_dir`/`windows_managed_dir` | `config-projection-C8 Codex: managed_dir e windows_managed_dir…` (TOML e JSON, win32/linux, com e sem evento) e `…fora do tipo string são inválidos` | — | `configuration-trust-C8 managed_dir/windows_managed_dir do Codex…`: diretório real com `hooks.json` e script canário; só as chaves → `not_configured`/`not_applicable`; com evento → `configured`/`unknown/no_native_consent_evidence`; `complete`, 20 linhas `not_performed`, canário ausente, marcador de execução inexistente |
| handler sem alvo obrigatório | `config-projection-C8 Claude: handler de tipo conhecido sem o campo obrigatório…` (10 formas) e `…Codex: handler sem type…` (10 JSON + 2 TOML) | — | `configuration-trust-C8 handler sem alvo obrigatório (Claude {type:'command'}, Codex {})…` → `invalid/hooks_structure_invalid`, `partial` |
| alvo vazio, `prompt`/`agent` no Codex | `…handler sem alvo é válido mas não conta…` (8 formas + caso misto) | — | — |
| comando efetivo por plataforma | `…Codex usa o comando efetivo da plataforma…` | `config-reader-C8 Codex recebe a plataforma do leitor…` | — |
| tipo não reconhecido | `…tipo de handler não reconhecido fica unknown…` (4 formas + precedência do inválido) e `scope-merge-C8 escopo inconclusivo…` | `config-reader-C8 tipo de handler não reconhecido em um escopo…` (não é coberto por handler válido de outro escopo) | `configuration-trust-C8 tipo de handler não reconhecido…`: JSON e texto, `trust unknown/configuration_not_determined`, sem canário |
| evento sem handler | `…evento sem handler é válido e não conta…` (Claude, Codex, Hermes) | — | `configuration-trust-C8 seção de hooks vazia e válida (ou evento sem handler)…` |
| formas válidas preservadas | `…cada tipo conhecido com o alvo obrigatório fica configured…` e os testes anteriores (state, outbound, disabled, consentimento) | testes anteriores de `config-reader` | testes anteriores de `configuration-trust` |

### Resultados

```
npm test   (saída completa em .checks/code-review/formal-round2-hooks-npm-test.txt, sem pipe)
  test:governance  -> tests 6,   pass 6,   fail 0, skipped 0
  test:code-review -> tests 10,  pass 10,  fail 0, skipped 0
  test:doctor      -> tests 221, pass 220, fail 0, skipped 1
EXIT_CODE=0
```

Os 15 testes novos e o ajustado da CLI aparecem como `✔` pelo nome. O único skip continua sendo
`agent-resolution-C2 realpath/symlink real … (POSIX)`, que depende do executor. `node src/doctor/cli.mjs
--json` nesta máquina (resumo): `complete`; Claude e Codex `configured`/`unknown/no_native_consent_evidence`
(os handlers reais têm alvo); Hermes `not_configured`; `runtimeVerification` sempre `not_performed`.

### Testes anteriores ajustados (justificativa)

- `config-projection-C2-trust` e `configuration-trust-C8 campo 'trust' arbitrário…` usavam
  `PreToolUse: []` como configuração "configured". Pela decisão 2 isso agora é `not_configured`, e a
  prova de confiança só faz sentido com configuração existente. Por isso passam a usar um handler real;
  as asserções não mudaram.
- `configuration-trust-C8 seção de hooks vazia…` ganhou o caso `{"hooks":{"PreToolUse":[]}}`.
- `config-projection-C14 arquivo exatamente no limite de 1 MiB` usa um handler sem `command`, que agora é
  inválido. A asserção é só `reasonCode !== input_too_large` e continua válida; o teste não foi alterado.

### Limitações declaradas

- Executado só em Windows 11 Pro, Node 24.21.0. As provas de plataforma do Codex passam `platform`
  explícito; a CLI usa a do executor.
- O Codex foi conferido no código da tag da versão instalada, não em outras versões. Tipos futuros ficam
  inconclusivos de propósito.
- Fica fora da validação: nomes de evento, campos opcionais (o Codex 0.162.1 descarta os hooks do
  arquivo com tipo errado neles), restrições por evento (ex.: `mcp_tool` em `SessionEnd` no Codex,
  `SessionStart` só com command/mcp_tool no Claude) e grupo sem `hooks` no Codex (decisão 6).
- O comportamento do Claude com alvo vazio não é documentado. O handler apenas não conta; não se afirma
  que o Claude rejeita o arquivo.
- `requirements.toml` e o diretório gerenciado continuam fora dos arquivos lidos, como antes.

### Arquivos desta seção

- Produto: `src/doctor/hooks-shape.mjs` (classificação por handler; `inspectNativeHooks` substitui
  `countNativeHookEvents`), `src/doctor/config-projection.mjs`, `src/doctor/config-reader.mjs`
  (`platform`, estado `inconclusive`), `src/doctor/scope-merge.mjs` (bloqueio do estado `inconclusive`).
- Testes: `config-projection.unit`, `config-reader.unit`, `scope-merge.unit`, `configuration-trust.cli`.
- Documentação/checklist: `docs/agent-compatibility.md` (linhas de forma do Claude, do Codex e do Hermes, e
  a de `managed_dir`), Landing "Forma nativa dos hooks" em `.checks/issue-3-agent-diagnostics.md` e esta
  seção.
- Evidência: `.checks/code-review/formal-round2-hooks-red.txt`, `…-hooks-green.txt` e
  `…-hooks-npm-test.txt`.

## 12. Pré-revisão formal da rodada 3 — grupo vazio, nomes de evento e campos opcionais tipados dos hooks (achado 6/C8, continuação) (13/10/2026)

O orquestrador apontou três falhas concretas que sobreviviam à seção 11 (a mesma rodada de achado 6/C8),
recusando que ficassem só numa seção de Limitações. Autor: Claude. Escopo mínimo, como pedido: só
`src/doctor/hooks-shape.mjs` e o necessário em `config-projection.mjs` para propagar o `reasonCode` por
shape (sem tocar launchers, `contract-evidence.mjs`, `capability-matrix.mjs`, `config-reader.mjs` nem
`scope-merge.mjs` — nenhuma mudança foi necessária neles, pois já propagam genericamente qualquer
`configuration: "unknown"`/`"invalid"` com o `reasonCode` recebido). Nenhum critério da task, `.verified.md`,
core vendorizado, `code-review.config.json`, CI ou `package.json` foi tocado; nada instalado, importado ou
executado; sem commit, push, stash, subagente ou `review:run` nesta rodada. Landing "grupo vazio, nomes de
evento e campos opcionais tipados dos hooks" registrado em `.checks/issue-3-agent-diagnostics.md` antes do
código.

### Fontes primárias examinadas nesta rodada (somente leitura como texto; nada importado ou executado)

- `codex-rs/config/src/hook_config.rs` e `codex-rs/hooks/src/engine/discovery.rs` (API pública do GitHub, tag
  `rust-v0.162.1`, já usada nas rodadas anteriores): `MatcherGroup { matcher: Option<String>,
  #[serde(default)] hooks: Vec<HookHandlerConfig> }`, sem `deny_unknown_fields`; `HookEventsToml` com os 12
  campos renomeados (`PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, SessionStart,
  SessionEnd, UserPromptSubmit, SubagentStart, SubagentStop, Stop, Interrupt`), também sem
  `deny_unknown_fields`; `HookHandlerConfig::Command` com `timeout` (`timeout_sec: Option<u64>`), `async`
  (`r#async: bool`), `statusMessage` (`status_message: Option<String>`), `additionalContextLimit`
  (`Option<usize>`); `HookHandlerConfig::McpTool` com `timeout`, `statusMessage` e `input`
  (`serde_json::Map`, com um `deserialize_with` extra de representabilidade TOML não reproduzido);
  `HookHandlerConfig::Prompt {}`/`Agent {}` sem nenhum campo.
- `codex-rs/hooks/src/engine/discovery.rs` (trecho de `events/session_end.rs` citado no mesmo arquivo): um
  handler `mcp_tool` sob o evento `SessionEnd` é lido e pulado com aviso ("skipping MCP tool hook in {}:
  SessionEnd MCP hooks are not supported"), antes mesmo de checar `server`/`tool` vazios — mesmo tratamento
  que `prompt`/`agent`.
- [Codex Hooks](https://learn.chatgpt.com/docs/hooks) (consultada nesta data): lista os mesmos 12 nomes de
  evento do código; confirma "`SessionEnd` doesn't support MCP tool hooks" e os tipos documentados de
  `timeout`/`statusMessage`/`async`/`additionalContextLimit`.
- [Claude Hooks](https://code.claude.com/docs/en/hooks) (consultada nesta data, duas buscas independentes
  com o mesmo resultado): seção "Hook Events" lista 33 nomes (lifecycle completo, de `SessionStart`/`Setup` a
  `SessionEnd`); seção do evento `SessionStart` declara "Only `type: "command"` and `type: "mcp_tool"` hooks
  are supported", sem dizer o que acontece com outro tipo ali; tabela "Hook handler fields" confirma
  `timeout`/`statusMessage`/`once` como campos comuns tipados, mas não especifica o efeito de um tipo errado
  (sem código acessível do Claude para confirmar, ao contrário do Codex).

### Ordem seguida (TDD)

1. Landing registrado antes do código (tabela acima, três linhas).
2. Regressões escritas antes do produto, na própria camada (`config-projection.unit.test.mjs`) e na
   fronteira real da CLI (`configuration-trust.cli.test.mjs`). RED real (saída completa em
   `.checks/code-review/formal-round3-hooks-red.txt`, sem pipe mascarando o exit):
   `tests 51, pass 44, fail 7, EXIT_CODE=1` (as duas suítes combinadas). As 7 falhas são exatamente os casos
   novos/corrigidos, cada um pelo motivo esperado (grupo sem `hooks` dava `invalid` em vez de
   `not_configured`; evento desconhecido e `mcp_tool`/`SessionEnd` davam `configured`; `SessionStart` com
   `http` dava `configured`; campo opcional de tipo errado dava `configured`; os dois testes de fronteira CLI
   replicavam evento desconhecido e campo de tipo errado no relatório real). Um erro no próprio teste de CLI
   do achado 3 (conteúdo JSON escrito no `config.toml`, formato TOML do Codex) foi corrigido antes do GREEN,
   sem mudar a asserção.
3. Implementação em `hooks-shape.mjs`/`config-projection.mjs` e GREEN (abaixo).

### Decisões e correções por achado

1. **Grupo sem a chave `hooks` no Codex (achado 1)** — corrige a decisão 6 da seção 11, que registrava essa
   forma como "mais estrito que a fonte, nunca leva a `configured`": isso invertia a fonte de verdade, pois
   a fonte mostra que a forma é válida e vazia, não inválida. `matcherGroupHandlers` (`hooks-shape.mjs`)
   ganhou `hooksFieldOptional`, `true` só para o Codex: um grupo com `hooks === undefined` conta como `[]`
   em vez de reprovar a forma. Claude preserva a exigência atual (nenhuma mudança no código do validador de
   Claude) — não há fonte (doc ou código) que declare um default equivalente para esse campo no Claude, e
   "preservar quando o campo é obrigatório" aqui significa preservar quando falta prova do contrário. A
   fixture antiga (`PreToolUse = [{ command = "x" }]` → `invalid`) era a hipótese errada; corrigida para
   `not_configured`, com o motivo registrado no comentário do teste e no Landing, não apagada em silêncio.
   `configured` continua exigindo ≥1 handler com alvo (decisão 2 da seção 11), então um grupo vazio nunca
   basta sozinho, mesmo relaxado.
2. **Nomes de evento e restrições por evento (achado 2)** — `inspectMatcherGroupHooks` agora recebe
   `recognizedEvents` (`CODEX_RECOGNIZED_EVENTS`, 12 nomes de `HookEventsToml`; `CLAUDE_RECOGNIZED_EVENTS`,
   33 nomes da doc) e nunca inspeciona o valor de uma chave fora desse conjunto (e fora das chaves
   reservadas já existentes) — o próprio Codex também não inspeciona, pois `HookEventsToml`/`HooksToml` não
   têm `deny_unknown_fields` nem campo coletor. Resultado: `unknown/hooks_event_name_unrecognized`, nunca
   `configured` só porque o handler dentro tem alvo. Restrição por evento confirmada em código:
   `classifyCodexMcpTool` retorna `untargeted` quando `event === "SessionEnd"`, depois de validar os tipos
   (a checagem de tipo é anterior na fonte real: a struct inteira precisa deserializar antes de qualquer
   despacho por evento). Restrição só documentada: `classifyClaudeHandler` retorna `unsupported_for_event`
   para `http`/`prompt`/`agent` sob `event === "SessionStart"`, depois de confirmar que o handler já seria
   válido fora dessa restrição (um handler malformado continua `invalid`). As duas restrições resolvem
   `configuration: "unknown"` (via o novo shape `unrecognized` com `reasonCode` próprio -
   `hooks_handler_type_unsupported_for_event`) — nunca `invalid`, pois a forma em si está correta, e nunca
   `configured`, pois o suporte não está confirmado. Explicitamente **não** usado como prova: a tabela
   mecanismo→evento de `contract-evidence.mjs`/C5 permanece uma evidência de contrato de capacidade,
   diferente desta validação de schema de configuração — nenhum dos dois arquivos foi tocado nesta rodada.
3. **Campos opcionais tipados do Codex (achado 3)** — `classifyCodexCommand` e a nova `classifyCodexMcpTool`
   (extraída de `classifyRequiredTargets` + checagens adicionais) validam só os campos que `hook_config.rs`
   tipa e que o Codex 0.162.1 realmente lê: `timeout`/`additionalContextLimit` (inteiro não negativo),
   `async` (booleano), `statusMessage` (string), `input` (objeto simples, sem reproduzir a checagem extra de
   representabilidade TOML do deserializer customizado). `null` (o `None` de JSON) continua válido como
   ausência, igual ao tratamento já existente de `command_windows`. Um valor presente de outro tipo em
   qualquer um desses campos vira `invalid/hooks_structure_invalid` — não um estado novo —, porque é o que
   a fonte confirma: sem `deny_unknown_fields` mas com tipo exato por campo, o serde falha a struct do
   handler inteira, o que falha o documento TOML/JSON inteiro (nunca "esse handler" isolado). `Prompt
   {}`/`Agent {}` não têm campo nenhum na fonte, então não são afetados. Caso concreto do achado,
   `{type:"command", command:"echo ok", timeout:{bad:true}}` em `hooks.json`, agora resolve `invalid`, nunca
   `configured`/`complete` — provado na própria camada e na fronteira real da CLI (hooks.json/JSON e
   config.toml/TOML). Fora desta validação, por decisão (não por omissão não registrada): o conteúdo de
   comandos/URLs/`input` continua nunca inspecionado; o Claude fica fora (sem código acessível, a doc não
   declara o efeito de um tipo errado em `timeout`/`once`/`statusMessage`).
4. **Propagação do `reasonCode` por shape** — `inspectNativeHooks` passou a devolver `{ shape, reasonCode }`
   também para `invalid`/`unrecognized` (antes só `{ shape }`, com um mapa fixo em `config-projection.mjs`
   que não suportava mais de um motivo por shape). `extractSafeFields`/`projectConfig`
   (`config-projection.mjs`) agora leem `hooks.reasonCode` direto, em vez de `HOOKS_SHAPE_RESULT[shape]`
   fixo; `HOOKS_SHAPE_CONFIGURATION` mapeia só `shape → configuration` (`invalid`/`unknown`). Nenhuma mudança
   em `config-reader.mjs`/`scope-merge.mjs`: ambos já propagam genericamente qualquer `reasonCode` recebido
   de um estado `invalid`/`inconclusive`.

### Precedência entre os eixos

Registrada no Landing: `invalid` (campo obrigatório ausente/tipo errado) decide antes de qualquer forma de
"não sei"; entre as formas de "não sei", evento não reconhecido decide antes de tipo de handler não
reconhecido, que decide antes de restrição por evento. Implementada em `summarizeGroupHooks`
(`hooks-shape.mjs`): a ordem não muda nenhum resultado hoje coberto por teste (cada caso de prova isola um
eixo), só documenta o desempate para um caso futuro que combine mais de um.

### Resultados

```
npm test   (saída completa em .checks/code-review/formal-round3-hooks-green.txt, sem pipe)
  test:governance  -> tests 6,   pass 6,   fail 0, skipped 0
  test:code-review -> tests 10,  pass 10,  fail 0, skipped 0
  test:doctor      -> tests 229, pass 228, fail 0, skipped 1
EXIT_CODE=0
```

Delta de `test:doctor` contra a seção 11 (221 → 229): 8 testes novos, todos desta rodada — 6 na própria
camada (`config-projection.unit.test.mjs`: grupo sem `hooks` no Codex, evento não reconhecido em Claude e
Codex, `mcp_tool`/`SessionEnd`, `http`/`prompt`/`agent` sob `SessionStart`, campo opcional com tipo errado,
campo opcional válido/ausente/nulo) e 2 na fronteira real da CLI (`configuration-trust.cli.test.mjs`: evento
não reconhecido do Codex, `timeout` de tipo errado do Codex). O único skip continua
`agent-resolution-C2 realpath/symlink real … (POSIX)`, condicional ao executor, não um skip novo. Paridade
do motor comum reconfirmada nesta data: `git diff --exit-code 4242520 -- scripts/code-review/{cli.mjs,
review.mjs,review.test.mjs,schema.json,README.md}` sem diff.

### Limitações declaradas

- Executado só em Windows 11 Pro, Node 24.21.0 (mesma limitação das seções 9-11); nenhum caso novo desta
  rodada depende de symlink real, permissão de SO ou mutação concorrente.
- O catálogo de 33 eventos do Claude vem de duas leituras independentes da mesma página pública (não de
  código, que é fechado); um nome documentado incorretamente nessa página propagaria para
  `CLAUDE_RECOGNIZED_EVENTS` sem um segundo meio de checagem.
- A restrição `SessionStart`/Claude é tratada como inconclusiva por desenho: não se afirma que o Claude
  ignora, rejeita ou simplesmente nunca invoca um `http`/`prompt`/`agent` ali — só que o doctor não tem
  fonte para decidir, então não assume `configured`.
- O deserializer customizado de `input` (`McpTool`) no Codex rejeita valores não representáveis em TOML
  (ex.: `null` aninhado); o doctor só confere que `input` é um objeto simples, sem essa checagem extra —
  admitido, não contornado.
- Claude permanece sem validação de tipo para `timeout`/`once`/`statusMessage`/`async`/outros campos comuns:
  não há código acessível e a doc não declara o efeito de um tipo errado, diferente do Codex. Estender essa
  validação ao Claude exigiria inventar um comportamento sem fonte, o que a task e o `AGENTS.md` proíbem.
- Hermes não ganhou validação de nomes de evento nesta rodada: seus eventos são extensíveis por plugin e só
  são conhecidos lendo `VALID_HOOKS` da instalação (`contract-evidence.mjs`, evidência de contrato C5), uma
  preocupação distinta da forma estrutural local decidida aqui — misturar as duas inverteria a separação já
  registrada no achado 2 (schema de config local vs. evidência de contrato).

### Arquivos desta rodada

- Produto: `src/doctor/hooks-shape.mjs` (reescrito: `hooksFieldOptional`, `recognizedEvents`,
  `classifyCodexMcpTool`, restrição `SessionStart`/Claude e `SessionEnd`/Codex, `isValidOptionalField`/
  `isNonNegativeInteger`, `reasonCode` por shape), `src/doctor/config-projection.mjs`
  (`HOOKS_SHAPE_CONFIGURATION`, propagação de `hooksReasonCode`). Nenhuma mudança em
  `config-reader.mjs`/`scope-merge.mjs`/`contract-evidence.mjs`/`capability-matrix.mjs`/launchers.
- Testes: `tests/doctor/config-projection.unit.test.mjs` (6 novos, 1 existente corrigido com comentário de
  justificativa), `tests/doctor/configuration-trust.cli.test.mjs` (2 novos).
- Documentação/checklist: `docs/agent-compatibility.md` (linhas de forma do Claude e do Codex), Landing
  "grupo vazio, nomes de evento e campos opcionais tipados dos hooks" em
  `.checks/issue-3-agent-diagnostics.md` e esta seção.
- Evidência: `.checks/code-review/formal-round3-hooks-red.txt`, `…-hooks-green.txt`.

## 13. Rodada de fixes pós-Verifier independente rodada 3 (G1-G4) (13/10/2026)

O Verifier independente rodou `.checks/issue-3-agent-diagnostics.verified.md` sobre o produto
`46e7c932e236b979754b10b82330be91d8c7597f` e reprovou (gate FAIL, 13/18 checks) quatro classes de defeito:
C2/C3/C5 (G4 — vínculo Hermes por shebang de outro prefixo) e C8/C12 (G1 — `async`/`input` do Codex tratados
como `Option<T>`; G2 — `matcher:null` do Codex rejeitado; G3 — evento Hermes fora do `VALID_HOOKS` instalado
conta como configurado). Encaminhamento do orquestrador: `.checks/code-review/verifier-round3-fixes.md`. O
FAIL da rodada 3 permanece preservado no commit `c4a4d45` e em `.verified.md`, não editados por este autor.
Autor: Claude. Nenhuma mudança na task, nos critérios, no motor comum de `scripts/code-review/` (paridade
SHA-256 confirmada abaixo) ou em `.verified.md`. Sem commit, push, stash deixado, `review:run` ou `pr:create`
nesta rodada — o orquestrador faz o commit limpo depois desta entrega.

### Ordem seguida (TDD)

Para cada achado: leitura da fonte primária já citada no encaminhamento (sem nova consulta externa, pois as
mesmas tags/arquivos de `hook_config.rs`, `discovery.rs` e `hermes_cli/plugins.py`/`shell_hooks.py` já
examinados nas rodadas anteriores bastam) → regressão nova ou corrigida na própria camada e, quando o achado
cruza a fronteira real da CLI (G3, e os casos formais de G1/G2), também em `configuration-trust.cli.test.mjs`
→ RED confirmado por execução real (stash dos arquivos de produto desta rodada, suíte afetada rodada sobre o
produto antigo, depois `stash pop`) → implementação → GREEN com `npm test` completo.

RED real, produto antigo (código de `src/doctor/**` revertido via `git stash` para o estado do commit
`c4a4d45`/`46e7c93`; testes desta rodada já presentes), saída completa em
`.checks/code-review/verifier-round3-fixes-red.txt`:

```
config-projection.unit.test.mjs   -> tests 37, pass 35, fail 2, skipped 0
agent-resolution.unit.test.mjs    -> tests 35, pass 32, fail 2, skipped 1
configuration-trust.cli.test.mjs  -> tests 19, pass 18, fail 1, skipped 0
```

As 5 falhas são exatamente os casos novos/corrigidos desta rodada, cada um pelo motivo esperado:
`async:null`/`input:null` do Codex davam `configured` (esperado `invalid`); `matcher:null` do Codex dava
`invalid` (esperado `configured`); o shebang de outro prefixo publicava a versão/pacote do launcher em vez do
intérprete real, nos dois cenários (pacote correspondente em B, e ausência em B); o evento Hermes fora do
catálogo instalado dava `configured` na fronteira real da CLI (esperado `not_configured`). O skip é o mesmo
de sempre (`agent-resolution-C2 realpath/symlink real … POSIX`, condicional ao executor), não um skip novo.

### Decisões e correções por achado

1. **G1 — `async`/`input` do Codex não são `Option<T>` (C8/C12)**: `hook_config.rs` (rust-v0.162.1) tipa
   `timeout`/`statusMessage`/`additionalContextLimit` como `Option<T>` (ausência e `null` presente contam
   igualmente como "sem valor"), mas `async` (`r#async: bool`) e `input` do McpTool (`serde_json::Map`) têm
   `#[serde(default)]` SEM serem `Option`: só a ausência da chave usa o default; um `null` presente é tipo
   errado para um bool/Map, falhando a deserialização da struct do handler (e por isso do documento inteiro)
   como qualquer outro tipo errado — a seção 12 (achado 3) tratava os quatro campos com a mesma regra, o que
   invertia a fonte para estes dois. `isValidDefaultedField` (`hooks-shape.mjs`) decide `async`/`input`;
   `isValidOptionalField` continua para os três campos `Option<T>` de verdade. A tabela de valores aceitos de
   `config-projection.unit.test.mjs` (que incluía `async:null` como `configured`) foi corrigida com
   justificativa da fonte, não preservada como verde incorreto.
2. **G2 — `matcher:null` do Codex é `Option<String>` válido (C8/C12)**: `MatcherGroup.matcher`
   (`hook_config.rs:154-159`) é `Option<String>` com default — `null` é o `None` válido, distinto de um
   matcher de outro tipo (continua `invalid`). `matcherGroupHandlers` ganhou `matcherAllowsNull`, habilitado
   só para o Codex (`HOOKS_INSPECTORS.codex`); o Claude preserva a exigência atual (`matcher:null` continua
   `invalid`), por não haver doc nem código acessível que confirme um default equivalente lá — a regra não foi
   propagada sem fonte, como o encaminhamento exigiu.
3. **G3 — evento Hermes fora do `VALID_HOOKS` instalado conta como configurado (C8)**: `hooks-shape.mjs`
   decide só a FORMA do bloco `hooks:` (mapeamento → lista de `{command}`), nunca se o nome do evento existe
   de verdade na instalação — misturar as duas inverteria a separação já registrada na seção 12/achado 2 e
   quebraria `inspectHermesHooks`/`projectConfig` como funções síncronas, sem `fs`, usadas por dezenas de
   testes de forma pura. A validação de catálogo foi adicionada numa camada acima, onde a evidência de
   contrato (assíncrona, com `fs`/`packageDir`) já é lida para C5:
   - `contract-evidence.mjs`: `readHermesContract` agora também devolve `validHooks` (a lista crua de nomes de
     `VALID_HOOKS`, já extraída por `extractHermesValidHooks` para montar `mechanisms`) — nenhuma leitura
     nova, só exposição do que já era computado.
   - `hooks-shape.mjs`: `inspectHermesHooks` passa a devolver também `eventsWithTarget` (as CHAVES de evento
     com ≥1 handler bem formado — nunca o comando/credencial dentro deles), estrutural como `handlersWithTarget`
     já era.
   - `config-projection.mjs`: projeta `fields.hermesTargetedEvents` (só para Hermes) a partir de
     `eventsWithTarget` — acrescentado ao vocabulário seguro já testado (`SAFE_FIELD_KEYS` em
     `config-projection.unit.test.mjs`), pois são nomes de chave, nunca conteúdo.
   - `config-reader.mjs`: `readAgentConfiguration` ganhou o parâmetro opcional `hermesValidHooks` (`Set` ou
     `null`). Quando a configuração resolvida é `configured` para o Hermes E o catálogo foi lido (`!== null`)
     E nenhum evento com handler bate com a tabela real, a configuração é rebaixada para
     `not_configured/hooks_event_not_in_installed_catalog` ANTES de `resolveTrust` — `trust` continua
     decidido por essa única função, nunca duplicando a regra `not_configured → not_applicable` em outro
     lugar. Sem catálogo lido (`null`), nada muda: o resultado estrutural de sempre é preservado.
   - `run-diagnostics.mjs`: `readContractEvidence` passou a ser lido ANTES de `readAgentConfiguration` (antes
     era depois, só para a matriz de capacidades) e seu `validHooks` (quando `state === "found"`) é repassado
     como `hermesValidHooks`.
   - Caso misto provado: um evento real ao lado do inventado preserva `configured` (pelo menos um hook de
     verdade seria registrado) — não é tudo-ou-nada por contagem, só por existência de ao menos um evento
     válido, conforme o cenário formal demonstrado (não se estendeu a uma contagem por evento sem necessidade
     demonstrada).
   - Preservação deliberada do caso sem catálogo: o teste já aprovado `hooks_auto_accept:true do Hermes…`
     (`configuration-trust.cli.test.mjs`) roda com PATH vazio (presence `absent`, nenhuma instalação real) e
     já esperava `configured` para `pre_tool_call` sem nenhum `plugins.py` montado — esse teste continua
     passando sem alteração, porque `hermesValidHooks` fica `null` quando a presença não é `present` (a
     função só lê contrato quando `presence.presence === "present" && versionProfileCompatible`,
     inalterado).
4. **G4 — shebang de outro prefixo atribui versão/contrato do launcher (C2/C3/C5)**: `resolveHermesVersion`
   (`launcher-link/hermes.mjs`) extraía só a versão X.Y do shebang e presumia que o pacote morava no MESMO
   prefixo do launcher (`dirnameGeneric(dirnameGeneric(launcherPath))`), mesmo quando o shebang trazia um
   caminho absoluto de intérprete em OUTRO prefixo. `shebangPythonInterpreterPath` (nova função) reconhece um
   caminho absoluto `.../pythonX.Y` (com separador — distinto do nome bare que sobra de `#!/usr/bin/env
   python3.12`, que não carrega prefixo próprio) e, quando presente, o prefixo de busca do site-packages passa
   a vir DESSE caminho, não do launcher; sem esse caminho absoluto reconhecido, o prefixo do launcher é
   preservado como sempre — nenhum teste existente (todos no mesmo prefixo, ou via `env`) muda de resultado.
   Sem pacote correspondente no prefixo do intérprete, o resultado é `launcher_not_recognized` (inconclusivo),
   nunca uma queda de volta ao pacote do launcher.

### Resultados

```
npm test   (saída completa em .checks/code-review/verifier-round3-fixes-green.txt, sem pipe mascarando o exit)
  test:governance  -> tests 6,   pass 6,   fail 0, skipped 0
  test:code-review -> tests 10,  pass 10,  fail 0, skipped 0
  test:doctor      -> tests 236, pass 235, fail 0, skipped 1
EXIT_CODE=0
```

Delta de `test:doctor` contra a seção 12 (229 → 236): 7 testes novos — 5 na própria camada
(`config-projection.unit.test.mjs`: 3 novos — Option<T> com null/async e input com null/matcher:null Codex
vs. Claude; `agent-resolution.unit.test.mjs`: 2 novos — shebang de outro prefixo com e sem pacote
correspondente) e 2 na fronteira real da CLI (`configuration-trust.cli.test.mjs`: evento Hermes fora do
catálogo instalado isolado e ao lado de um evento real, usando `installAllAgents`/`hermesPluginsSource` para
uma instalação reconhecida de verdade, não a forma estrutural isolada). O único skip continua
`agent-resolution-C2 realpath/symlink real … (POSIX)`, condicional ao executor. Paridade do motor comum
reconfirmada nesta data: `git diff --exit-code 4242520 -- scripts/code-review/{cli.mjs,review.mjs,
review.test.mjs,schema.json,README.md}` sem diff.

### Limitações declaradas

- Executado só em Windows 11 Pro, Node 24.21.0 (mesma limitação das seções 9-12); o Verifier já reproduziu
  G4 e G3 numa CLI real Linux/POSIX isolada (ver `.verified.md`) — esta rodada não repete essa reprodução
  POSIX-real, só a prova na própria camada (fake-fs, determinística e independente de SO) e, para G3, a prova
  real de CLI nesta máquina (Windows, instalação sintética via `installAllAgents`). Nenhum launcher/Python/
  hook de fixture foi executado; nenhuma configuração ativa da máquina foi lida ou alterada.
- G3 só decide quando o catálogo foi de fato lido e reconhecido (`contract.state === "found"`); nos demais
  estados (`not_found`, `unreadable`, `too_large`, `changed_during_read`, `unrecognized`, ou presença/versão
  que nunca chega a tentar a leitura) o comportamento estrutural de sempre é preservado — não foi
  implementado um estado "unknown sem catálogo" novo, por não haver caso formal que o exija e por já existir
  um teste aprovado (`hooks_auto_accept`) que depende do comportamento atual nesse cenário. Esse é um gap
  residual explícito: um evento inventado SEM nenhum catálogo linkável (ex.: Hermes ausente do PATH mas
  config.yaml presente) continua contando como `configured`, igual a antes desta rodada.
- `hermesTargetedEvents`/`hermesValidHooks` só carregam nomes de chave (nunca comando/credencial); a projeção
  segura (`SAFE_FIELD_KEYS`) foi atualizada para reconhecer o novo campo como parte do vocabulário testado,
  não relaxada de outra forma.
- O cruzamento de G3 usa só o primeiro escopo analisado (`firstParsedFields`, padrão já existente para
  evidência de confiança) — sem impacto real, pois o Hermes tem um único escopo (`user`,
  `hermesConfigScopes`), confirmado em `config-sources.mjs`.

### Arquivos desta rodada

- Produto: `src/doctor/hooks-shape.mjs` (`isValidDefaultedField`, `matcherAllowsNull`, `eventsWithTarget`),
  `src/doctor/config-projection.mjs` (`fields.hermesTargetedEvents`), `src/doctor/config-reader.mjs`
  (`hermesValidHooks`, cruzamento antes de `resolveTrust`), `src/doctor/contract-evidence.mjs` (expõe
  `validHooks`), `src/doctor/run-diagnostics.mjs` (contrato lido antes da configuração, repassa
  `hermesValidHooks`), `src/doctor/launcher-link/hermes.mjs` (`shebangPythonInterpreterPath`, prefixo do
  intérprete quando absoluto).
- Testes: `tests/doctor/config-projection.unit.test.mjs` (1 teste incorreto corrigido + 3 novos),
  `tests/doctor/agent-resolution.unit.test.mjs` (2 novos), `tests/doctor/configuration-trust.cli.test.mjs`
  (2 novos).
- Documentação/checklist: `docs/agent-compatibility.md` (linhas do Codex — `async`/`input`/`matcher` não são
  todos `Option<T>`; linha do Hermes — catálogo instalado agora decide; linha do launcher Hermes — prefixo do
  intérprete), Landing "rodada de fixes pós-Verifier independente rodada 3 (G1-G4)" em
  `.checks/issue-3-agent-diagnostics.md` e esta seção. `.checks/issue-3-agent-diagnostics.verified.md` não foi
  editado (relatório independente, preservado).
- Evidência: `.checks/code-review/verifier-round3-fixes-red.txt`, `…-fixes-green.txt`.

## 14. Correção residual de G3/G4 pós-encaminhamento (13/10/2026)

Encaminhamento do orquestrador ao autor Claude após a primeira correção (commit `637abc9`), **não** uma
rodada de verificação independente nova: `.checks/code-review/verifier3-fix-residuals.md`. As mesmas quatro
classes confirmadas pelo Verifier na rodada 3 (`.checks/code-review/verifier-round3-fixes.md`) permanecem;
só o alcance real de G3 e G4 estava incompleto nessa primeira correção. Autor: Claude. Nenhuma mudança na
task, nos critérios, em `.verified.md` ou no motor comum de `scripts/code-review/` (paridade SHA-256
reconfirmada abaixo). Sem commit, push, stash deixado, `review:run`/`pr:create` nem nova verificação
independente nesta rodada.

### Os dois gaps residuais

1. **G3 — `configured` preservado sem catálogo vinculado**: `readAgentConfiguration` (`config-reader.mjs`,
   estado pós-637abc9) só cruzava `hermesTargetedEvents` contra `hermesValidHooks` quando este não era
   `null`. Sem fonte vinculada (presença ausente, versão fora do perfil, `plugins.py` ilegível/ausente/não
   reconhecido), a configuração estrutural `configured` passava direto, afirmando um registro que ninguém
   comprovara. O encaminhamento ORIGINAL da rodada 3 já exigia "mantenha motivo inconclusivo e prove o
   caso" nesse cenário; a primeira correção preservou o comportamento antigo citando um teste já aprovado
   (`hooks_auto_accept:true do Hermes…`, sem nenhuma instalação real) como justificativa. Essa justificativa
   estava invertida: um teste é prova de comportamento, não uma decisão vinculante — quando ele contradiz o
   critério/fonte (aqui, a exigência explícita de motivo inconclusivo sem fonte), ele precisa ser corrigido
   com justificativa, não usado para preservar a lacuna. A aprovação humana foi do escopo (fechar G3/G4),
   nunca dessas expectativas antigas.
2. **G4 — vínculo do intérprete do shebang não cobria `python`/`python3` bare, e "absoluto" aceitava
   qualquer barra**: `shebangPythonInterpreterPath` (estado pós-637abc9) só reconhecia um caminho absoluto
   terminado em `pythonX.Y`. `referencesHermesCli` já reconhece `python`/`python3` SEM X.Y como intérprete
   Python válido para decidir se o shim é Python (mesma fonte, família `python[\d.]*$`) — um shebang
   absoluto de OUTRO prefixo sem a versão (`#!/b/bin/python`, `#!/b/bin/python3`) não entrava no ramo do
   intérprete reconhecido e caía de volta ao prefixo do launcher por omissão, publicando de novo a fonte
   errada (o mesmo defeito que G4 original visava fechar, só que para a variante bare). Separadamente, a
   checagem de "caminho absoluto" (`/[\\/]/.test(interpreter)`) aceitava qualquer string com barra, inclusive
   relativa (`venv/bin/python3.12`), inventando um prefixo de outro processo que não existe.

### Ordem seguida (TDD)

Reprodução real do orquestrador já presente em `.checks/code-review/probe-verifier3-residual.mjs`
(referenciada no próprio encaminhamento) → regressão nova na própria camada (`config-reader.unit.test.mjs`,
`agent-resolution.unit.test.mjs`) e na fronteira real da CLI (`configuration-trust.cli.test.mjs`, G3 cruza a
CLI) → RED confirmado por execução real (`git stash push --keep-index` dos três arquivos de produto desta
rodada para o estado `637abc9`, suíte afetada rodada sobre o produto antigo, depois `stash pop`) →
implementação → GREEN com os alvos afetados e depois `npm test` completo uma única vez.

RED real, produto no estado `637abc9` (só os testes desta rodada já presentes), saída completa em
`.checks/code-review/verifier3-fix-residuals-red.txt`:

```
config-reader.unit.test.mjs         -> (dentro da suíte combinada abaixo)
agent-resolution.unit.test.mjs      -> (dentro da suíte combinada abaixo)
configuration-trust.cli.test.mjs    -> (dentro da suíte combinada abaixo)
node --test config-reader.unit.test.mjs agent-resolution.unit.test.mjs configuration-trust.cli.test.mjs
  -> tests 70, pass 63, fail 6, skipped 1
```

As 6 falhas são exatamente os casos novos/corrigidos desta rodada:

- `config-reader-G3 Hermes sem catálogo vinculado … fica unknown/hooks_catalog_unavailable` — produto antigo
  devolvia `configured` (reasonCode `hooks_configured`).
- `configuration-trust-C8/G3 Hermes: sem plugins.py vinculado … fica unknown/hooks_catalog_unavailable` —
  produto antigo devolvia `report.status: complete` (esperado `partial`).
- `agent-resolution-G4 Hermes: shebang absoluto SEM X.Y … liga ao pacote desse prefixo` (`python`/`python3`,
  2 variantes na mesma `assert` em loop) — produto antigo publicava a versão do launcher (`0.21.4`) em vez
  da do intérprete real (`0.20.0`).
- `agent-resolution-G4 Hermes: … de outro prefixo sem pacote lá fica inconclusivo` — produto antigo publicava
  `0.21.4` (do launcher) em vez de `null/launcher_not_recognized`.
- `agent-resolution-G4 Hermes: … com dois pythonX.Y ambíguos fica version_source_ambiguous` — produto antigo
  publicava `0.21.4` (do launcher) em vez de `null/version_source_ambiguous`.
- `agent-resolution-G4 Hermes: intérprete relativo com barra … usa X.Y no prefixo do launcher` — produto
  antigo tratava `venv/bin/python3.12` como caminho absoluto de um prefixo "venv" inexistente, devolvendo
  `null/launcher_not_recognized` em vez de `0.21.4` no prefixo real do launcher.

O skip é o mesmo de sempre (`agent-resolution-C2 realpath/symlink real … POSIX`, condicional ao executor),
não um skip novo. O teste corrigido `hooks_auto_accept` (ver abaixo) já passava mesmo no produto antigo,
porque a reescrita usa um catálogo real (`hermesPluginsSource`) que o cruzamento de G3 já decidia
corretamente antes desta rodada — não é um caso RED, é uma correção de dependência indevida do teste em
"nenhuma instalação real", preservando o que ele de fato prova.

### Decisões e correções por achado

1. **G3 residual — sem catálogo vinculado, `configured` não pode ser preservado (`config-reader.mjs`)**:
   `readAgentConfiguration` ganhou um segundo ramo no mesmo bloco que já existia (`agentId === "hermes" &&
   configuration === "configured"`): quando `hermesValidHooks === null`, a configuração vira
   `unknown/hooks_catalog_unavailable` ANTES de `resolveTrust` — `trust` continua decidido por essa única
   função a partir da `configuration` final (fonte única de verdade, nenhuma duplicação da regra
   `!== "configured" → trust unknown/configuration_not_determined` em outro lugar). `not_configured` (sem
   handler algum) e `invalid` (erro nativo de forma) não entram neste ramo, pois ele só roda depois que a
   forma estrutural já decidiu `configured` — provado em teste dedicado
   (`config-reader-G3 … preserva not_configured … e invalid …`). Um evento com nome plausível
   (`pre_tool_call`, já documentado/mapeado) recebe o mesmo tratamento que um inventado (`made_up_event`):
   sem a tabela REAL desta instalação, "parece real" não é fonte — provado com os dois nomes na mesma
   prova (`config-reader-G3 … com evento configurado fica unknown …`).
   - Teste corrigido com justificativa explícita (AGENTS.md permite e exige corrigir uma expectativa que
     contradiz a fonte/critério): `configuration-trust.cli.test.mjs`, teste `hooks_auto_accept:true do
     Hermes…`. Antes, rodava com PATH vazio (presence absent, catálogo nunca lido) e dependia de
     `configured` sem nenhuma instalação real — exatamente o comportamento que este achado corrige. Reescrito
     para instalar um Hermes real com catálogo (`installAllAgents`+`hermesContractSource:
     hermesPluginsSource()`, mesmo padrão dos demais testes G3 de catálogo real), confirmando
     `pre_tool_call` contra um `VALID_HOOKS` de verdade. Isola o que o teste de fato prova — `hooks_auto_accept`
     é a única origem nativa de confiança — sem depender da ausência de catálogo para chegar a `configured`.
   - Teste novo na fronteira real da CLI, reproduzindo o cenário exato do encaminhamento (Hermes presente e
     com versão lida via `installAllAgents` sem `hermesContractSource`, logo sem `plugins.py` vinculado):
     `configuration-trust-C8/G3 Hermes: sem plugins.py vinculado…` — confirma `report.status: partial`,
     `configuration: unknown`, `configReasonCode: hooks_catalog_unavailable`, `trust: unknown`,
     `trustReasonCode: configuration_not_determined`, e o motivo aparecendo também na saída de texto.
2. **G4 residual — vínculo do intérprete cobre `python`/`python3` bare; "absoluto" exige separador inicial
   de verdade (`launcher-link/hermes.mjs`, `launcher-link/path-helpers.mjs`)**:
   - `PYTHON_INTERPRETER_NAME` (`/(?:^|[\\/])python[\d.]*$/`) é agora uma constante compartilhada,
     reaproveitada por `referencesHermesCli` (que já usava essa família inline) e por
     `shebangPythonInterpreterPath` (que antes só reconhecia `python\d+\.\d+$`) — a mesma fonte decide as
     duas perguntas ("isto é um shebang Python?" e "este caminho absoluto é um intérprete Python
     reconhecido?"), nenhuma lista nova inventada.
   - `isAbsolutePathGeneric` (`path-helpers.mjs`, nova função pura: POSIX `/...` ou Windows
     `[A-Za-z]:[\\/]`/UNC `\\\\`) substitui a checagem antiga (`/[\\/]/.test(...)`, que aceitava qualquer
     string com barra, inclusive relativa) em `shebangPythonInterpreterPath`. Sem X.Y no caminho absoluto
     reconhecido, a versão específica continua indeterminada pelo shebang: `findSitePackagesInitFile` decide
     por varredura do prefixo já resolvido (um único candidato com `hermes_cli` é aceito; dois ou mais,
     `version_source_ambiguous`; nenhum, `launcher_not_recognized`) — nunca cai de volta ao pacote do
     launcher, mesma regra já provada para a variante com X.Y.
   - Nenhum teste existente mudou de resultado: os casos de mesmo prefixo (`installHermesTwoPythons`) e via
     `env` continuam resolvendo exatamente igual, porque `interpreterPrefix` coincide com `launcherPrefix`
     quando o intérprete absoluto está no mesmo prefixo, e `env`/bare sem barra nunca eram afetados pela
     checagem de "absoluto". Confirmado por reexecução da suíte completa (ver Resultados).
   - Reprodução real do orquestrador (`.checks/code-review/probe-verifier3-residual.mjs`) confirmada após a
     correção: `external-python`/`external-python3` publicam `0.20.0`/`source_literal`/packageDir em `/b`
     (nunca `0.21.4`/`/a`); `missing-catalog-cli` publica `exitCode:0`, `reportStatus:"partial"`,
     `presence:"present"`, `version:"0.21.4"`, `configuration:"unknown"`,
     `reasonCode:"hooks_catalog_unavailable"`, `trust:"unknown"`.

### Resultados

Alvos afetados, logo após a implementação (saída completa em
`.checks/code-review/verifier3-fix-residuals-green-targets.txt`):

```
node --test config-reader.unit.test.mjs agent-resolution.unit.test.mjs configuration-trust.cli.test.mjs
  -> tests 70, pass 69, fail 0, skipped 1
```

`npm test` completo, uma única execução após as alterações finais (saída completa em
`.checks/code-review/verifier3-fix-residuals-green.txt`, sem pipe mascarando o exit):

```
  test:governance  -> tests 6,   pass 6,   fail 0, skipped 0
  test:code-review -> tests 10,  pass 10,  fail 0, skipped 0
  test:doctor      -> tests 243, pass 242, fail 0, skipped 1
EXIT_CODE=0
```

Delta de `test:doctor` contra a seção 13 (236 → 243): 7 testes — 2 novos em `config-reader.unit.test.mjs`
(unknown sem catálogo; preserva not_configured/invalid), 4 novos em `agent-resolution.unit.test.mjs` (bare
absoluto liga a B com pacote; bare absoluto sem pacote em B; bare absoluto ambíguo em B; relativo com barra
não inventa prefixo), 1 novo em `configuration-trust.cli.test.mjs` (fronteira CLI do cenário sem
`plugins.py`) — o teste `hooks_auto_accept` foi reescrito, não contado como novo (mesma contagem de testes
naquele arquivo). O único skip continua `agent-resolution-C2 realpath/symlink real … (POSIX)`, condicional
ao executor. Paridade do motor comum reconfirmada nesta data: `git diff --exit-code 4242520 --
scripts/code-review/{cli.mjs,review.mjs,review.test.mjs,schema.json,README.md}` sem diff.

### Limitações declaradas

- Executado só em Windows 11 Pro, Node 24.21.0 (mesma limitação das seções 9-13); a reprodução POSIX-real
  do orquestrador (`.checks/code-review/probe-verifier3-residual.mjs`) foi executada nesta máquina (Node
  interpreta os caminhos `/a/...`/`/b/...` como strings opacas via o adaptador de filesystem falso — nenhum
  filesystem POSIX real é necessário para este probe, mesmo padrão já usado pela suíte determinística desde
  a seção 9). Nenhum launcher/Python/intérprete/hook de fixture foi executado; nenhuma configuração ativa da
  máquina foi lida ou alterada nesta rodada.
- `hermesValidHooks === null` continua um agregado único (presença ausente, versão fora do perfil, ou
  `plugins.py` ilegível/ausente/forma não reconhecida todos colapsam para `null` em `run-diagnostics.mjs`,
  inalterado nesta rodada): `hooks_catalog_unavailable` não distingue esses sub-motivos entre si no
  `configReasonCode`. Diferenciar exigiria repassar o `contract.state` bruto até `config-reader.mjs`, uma
  extensão não demonstrada por nenhum critério desta entrega — registrado como gap residual explícito, não
  implementado.
- Como antes (seção 13): o cruzamento de G3 usa só o primeiro escopo analisado (`firstParsedFields`), sem
  impacto real porque o Hermes tem um único escopo (`hermesConfigScopes`).

### Arquivos desta rodada

- Produto: `src/doctor/config-reader.mjs` (ramo `hermesValidHooks === null` → `unknown/
  hooks_catalog_unavailable`, antes de `resolveTrust`), `src/doctor/launcher-link/hermes.mjs`
  (`PYTHON_INTERPRETER_NAME` compartilhada, `shebangPythonInterpreterPath` cobre bare), `src/doctor/
  launcher-link/path-helpers.mjs` (`isAbsolutePathGeneric`, nova).
- Testes: `tests/doctor/config-reader.unit.test.mjs` (2 novos), `tests/doctor/agent-resolution.unit.test.mjs`
  (4 novos), `tests/doctor/configuration-trust.cli.test.mjs` (1 teste corrigido com justificativa + 1 novo).
- Documentação/checklist: `docs/agent-compatibility.md` (linha Hermes de `shell_hooks.py`/G3 — corrige a
  frase sobre preservar o resultado estrutural sem catálogo; linha do launcher Hermes — cobre intérprete
  bare absoluto e exige separador inicial de verdade), `.checks/issue-3-agent-diagnostics.md` (nova
  subseção "Landing da correção residual G3/G4") e esta seção. `.checks/issue-3-agent-diagnostics.verified.md`
  não foi editado (relatório independente, preservado).
- Evidência: `.checks/code-review/verifier3-fix-residuals-red.txt`,
  `…-fix-residuals-green-targets.txt`, `…-fix-residuals-green.txt`. Preservados sem alteração:
  `.checks/code-review/verifier3-fix-residuals.md` (encaminhamento) e
  `.checks/code-review/probe-verifier3-residual.mjs` (reprodução do orquestrador).

## 15. Correção residual de G3, variante shell, pós-Verifier independente rodada 4 (13/10/2026)

A quarta verificação independente (`.checks/issue-3-agent-diagnostics.verified.md`, gate FAIL 17/18)
confirmou um único residual bloqueante, C8, da mesma classe G3 de configuração Hermes — não uma rodada nova
de verificação, e sim o encaminhamento do orquestrador ao autor Claude após ela:
`.checks/code-review/verifier4-g3-shell-fix.md`. Autor: Claude. Nenhuma mudança na task, nos critérios, em
`.verified.md`, no motor comum de `scripts/code-review/` (paridade SHA-256 reconfirmada abaixo), em
`AGENTS.md` ou nos limites/raias de governança. Sem commit, push, stash deixado, `review:run`/`pr:create`
nem nova verificação independente nesta rodada — autorização explícita só para esta correção pontual, não
para uma quinta rodada.

### O gap residual

`config-reader.mjs` (estado pós-rodada 3, commit `c3ce992`) cruzava `hermesTargetedEvents` só contra
`hermesValidHooks` (o literal `VALID_HOOKS` de `hermes_cli/plugins.py`, lido por `contract-evidence.mjs`).
Mas a fonte nativa real tem DUAS tabelas distintas no mesmo arquivo: `VALID_HOOKS` (contrato geral de
plugin hooks, usado pela matriz de capacidades/C5) e `SHELL_UNSUPPORTED_HOOKS` (`plugins.py:208`), que
`agent/shell_hooks.py::_parse_hooks_block` testa ANTES de `VALID_HOOKS` (linhas 220-223, antes das 224-230)
para recusar — com aviso nativo — um evento cuja diretiva o parser de shell hooks não tem como devolver.
`transform_api_error_classification` pertence às DUAS tabelas ao mesmo tempo: um `hooks:` de `config.yaml`
que só o define nunca registraria um shell hook de verdade, mas o `doctor` anunciava `configured`/
`hooks_configured` porque o nome batia em `VALID_HOOKS`, a única tabela cruzada. Confirmado pelo Verifier
com a fonte real copiada para uma fixture isolada (reprodução no relatório, não repetida por este autor).

### Ordem seguida (TDD)

Reprodução do achado (fonte nativa lida como texto, só leitura, conforme encaminhamento) → regressões novas
na própria camada (`contract-evidence.unit.test.mjs`, `config-reader.unit.test.mjs`) e na fronteira real da
CLI (`configuration-trust.cli.test.mjs`) → RED confirmado por execução real (`git stash push --keep-index`
dos três arquivos de produto desta rodada para o estado anterior, suíte afetada rodada sobre o produto
antigo, depois `stash pop`) → implementação → GREEN com os alvos afetados e depois `npm test` completo uma
única vez.

RED real, produto no estado anterior a esta rodada (testes desta rodada já presentes), saída completa em
`.checks/code-review/verifier4-g3-shell-fix-red.txt`:

```
node --test tests/doctor/contract-evidence.unit.test.mjs tests/doctor/config-reader.unit.test.mjs tests/doctor/configuration-trust.cli.test.mjs
  -> tests 39, pass 34, fail 5
EXIT_CODE=1
```

As 5 falhas são exatamente os casos novos desta rodada que discriminam o defeito, mais o erro de import
esperado (o produto antigo ainda não exporta o novo extrator):

- `tests\doctor\contract-evidence.unit.test.mjs` falha ao carregar o módulo inteiro
  (`SyntaxError: ... does not provide an export named 'extractHermesShellUnsupportedHooks'`) — as duas
  provas novas desta suíte ficam dentro desse arquivo, contadas como 1 teste de arquivo no total do runner.
- `config-reader-G3 Hermes: único handler cujo evento é Python-plugin-only ... fica not_configured/
  hooks_event_shell_unsupported` — produto antigo devolvia `configured` (reasonCode `hooks_configured`).
- `config-reader-G3 Hermes: catálogo bate mas tabela de exclusão de shell não reconhecida (null) fica
  unknown/hooks_shell_exclusion_unavailable` — produto antigo devolvia `configured`.
- `configuration-trust-C8/G3 Hermes: único handler Python-plugin-only ... no relatório real` — produto
  antigo devolvia `configured` na fronteira real da CLI (fixture com `plugins.py` real do Verifier
  reproduzida via `hermesPluginsSource()` corrigida).
- `configuration-trust-C8/G3 Hermes: SHELL_UNSUPPORTED_HOOKS não reconhecida/ausente ...` — produto antigo
  devolvia `report.status: complete` (esperado `partial`).

Os outros dois casos novos desta rodada (evento shell-unsupported ao lado de um evento shell aceito, nas
duas camadas) já passavam no produto antigo — não são regressão deste achado, mas cobertura da alternativa
"misto" que a correção precisa preservar sem quebrar.

### Decisão e correção

1. **`contract-evidence.mjs` — extrator reaproveitado, nenhuma leitura nova**: a leitura léxica de conjunto
   Python (antes só `extractHermesValidHooks`, acoplada ao nome `VALID_HOOKS` dentro de
   `RUNTIME_MUTATION`/`findAssignments`) foi generalizada em `extractTopLevelStringSet(text, name)`,
   parametrizada pelo NOME da ligação; `extractHermesValidHooks` chama essa função com `"VALID_HOOKS"`
   (comportamento idêntico, mesma suíte de 12 testes já aprovados continua verde sem alteração) e a nova
   `extractHermesShellUnsupportedHooks` chama a MESMA função com `"SHELL_UNSUPPORTED_HOOKS"`. `readHermesContract`
   chama as duas sobre o MESMO `read.text` já obtido (uma única leitura de arquivo, limite de 1 MiB
   preservado) e devolve `shellUnsupportedHooks` (array de nomes ou `null`) ao lado de `mechanisms`/
   `validHooks`, sem alterar nenhum dos dois — C5 nunca é tocado por esta correção.
2. **`run-diagnostics.mjs` — vínculo ao mesmo contrato encontrado**: `hermesShellUnsupportedHooks` só vira
   `Set` quando `contract.state === "found"` E `contract.shellUnsupportedHooks !== null`; caso contrário
   `null`, no mesmo padrão já usado para `hermesValidHooks` (nunca presume conjunto vazio).
3. **`config-reader.mjs` — exclusão só na confirmação de configuração shell**: o ramo que já existia
   (`agentId === "hermes" && configuration === "configured"`) ganhou dois ramos novos, DEPOIS de filtrar
   `hermesTargetedEvents` pelos que batem em `hermesValidHooks` (preservando `hooks_event_not_in_installed_
   catalog` quando nenhum bate, inalterado): se esse subconjunto não é vazio mas `hermesShellUnsupportedHooks`
   é `null`, vira `unknown/hooks_shell_exclusion_unavailable` (tabela de exclusão não reconhecida — nunca
   presume ausência de exclusão); se todos os eventos desse subconjunto também estão em
   `hermesShellUnsupportedHooks`, vira `not_configured/hooks_event_shell_unsupported` (nenhum sobreviveria
   ao parser real); um evento shell aceito ao lado de um Python-plugin-only preserva `configured`, pois
   basta UM handler real sobreviver. `not_configured` (sem handler algum) e `invalid` (erro nativo de forma)
   continuam fora deste bloco inteiro, como já valia para o ramo de catálogo.
4. **Fixture positiva corrigida com justificativa** (`tests/doctor/helpers/hermes-contract-source.mjs`):
   `hermesPluginsSource()` já listava `transform_api_error_classification` em `SHELL_UNSUPPORTED_HOOKS`,
   mas não em `VALID_HOOKS` — diferente da instalação real, que lista o nome nas DUAS tabelas. Essa lacuna
   escondia exatamente o caso que a fonte real reproduz (um evento válido no catálogo geral E recusado como
   shell hook); adicionado a `UNMAPPED_EVENTS` (não afeta nenhum mecanismo mapeado nem `EXPECTED_EVENTS` dos
   testes de C5 já aprovados). Novo parâmetro `shellUnsupportedHooksLine` (default: a forma real
   reconhecida; string vazia simula ausência da tabela; uma forma alternativa simula "não reconhecida") para
   provar os dois ramos sem inventar uma segunda função de fixture.

### Resultados

Alvos afetados, logo após a implementação (saída completa em
`.checks/code-review/verifier4-g3-shell-fix-green-targets.txt`):

```
node --test tests/doctor/contract-evidence.unit.test.mjs tests/doctor/config-reader.unit.test.mjs tests/doctor/configuration-trust.cli.test.mjs
  -> tests 50, pass 50, fail 0, skipped 0
EXIT_CODE=0
```

`test:doctor` completo isolado (saída em `.checks/code-review/verifier4-g3-shell-fix-doctor.txt`):

```
node --test "tests/doctor/**/*.test.mjs"
  -> tests 252, pass 251, fail 0, skipped 1
EXIT_CODE=0
```

`npm test` completo, uma única execução após as alterações finais (saída completa em
`.checks/code-review/verifier4-g3-shell-fix-npm-test.txt`, sem pipe mascarando o exit):

```
  test:governance  -> tests 6,   pass 6,   fail 0, skipped 0
  test:code-review -> tests 10,  pass 10,  fail 0, skipped 0
  test:doctor      -> tests 252, pass 251, fail 0, skipped 1
EXIT_CODE=0
```

Delta de `test:doctor` contra a rodada 4 verificada (243 → 252): 9 testes — 2 novos em
`contract-evidence.unit.test.mjs` (tabela reconhecida ao lado de VALID_HOOKS, sem afetar mechanisms; tabela
ausente/ilegível/não reconhecida vira null sem derrubar `state: found`), 4 novos em
`config-reader.unit.test.mjs` (único evento shell-unsupported; misto continua configured; exclusão
indisponível vira unknown; evento fora do catálogo geral preserva o motivo antigo mesmo sem tabela de
exclusão), 3 novos em `configuration-trust.cli.test.mjs` (reprodução exata do Verifier na fronteira real da
CLI, variante mista, variante de exclusão não reconhecida — JSON e texto nos três). O único skip continua
`agent-resolution-C2 realpath/symlink real … (POSIX)`, condicional ao executor, não um skip novo. Paridade
do motor comum reconfirmada nesta data: `git diff --exit-code 4242520 --
scripts/code-review/{cli.mjs,review.mjs,review.test.mjs,schema.json,README.md}` sem diff.

### Limitações declaradas

- Executado só em Windows 11 Pro, Node 24.21.0 (mesma limitação das seções anteriores). Nenhum
  launcher/Python/hook/agente/config ativa da máquina foi executado, importado ou alterado nesta rodada —
  só leitura textual das duas fontes nativas já citadas pelo encaminhamento
  (`hermes_cli/plugins.py`, `agent/shell_hooks.py`), ambas em `C:/Users/paulo/AppData/Local/hermes/
  hermes-agent/`, fora do controle de versão deste repositório.
- `hermesShellUnsupportedHooks === null` continua um agregado único (tabela ausente, ilegível, mutada ou de
  forma não reconhecida colapsam para `null`, mesmo padrão já aceito para `hermesValidHooks` desde a rodada
  3): `hooks_shell_exclusion_unavailable` não distingue esses sub-motivos entre si — mesma lacuna já
  registrada e aceita para `hooks_catalog_unavailable`, não ampliada nem reduzida nesta correção.
- `extractTopLevelStringSet` continua exigindo exatamente uma atribuição de nível de módulo por nome; duas
  tabelas distintas no mesmo arquivo não competem entre si (nomes diferentes, buscas independentes sobre o
  mesmo texto).

### Arquivos desta rodada

- Produto: `src/doctor/contract-evidence.mjs` (`extractTopLevelStringSet` generalizado por nome,
  `extractHermesShellUnsupportedHooks` nova, `shellUnsupportedHooks` no resultado `found`),
  `src/doctor/run-diagnostics.mjs` (`hermesShellUnsupportedHooks` repassado a `readAgentConfiguration`),
  `src/doctor/config-reader.mjs` (dois ramos novos: `hooks_shell_exclusion_unavailable`,
  `hooks_event_shell_unsupported`).
- Testes/fixtures: `tests/doctor/contract-evidence.unit.test.mjs` (2 novos),
  `tests/doctor/config-reader.unit.test.mjs` (4 novos), `tests/doctor/configuration-trust.cli.test.mjs` (3
  novos), `tests/doctor/helpers/hermes-contract-source.mjs` (`transform_api_error_classification` também em
  `VALID_HOOKS`; parâmetro `shellUnsupportedHooksLine`).
- Documentação/checklist: `docs/agent-compatibility.md` (linha Hermes de `shell_hooks.py`/G3 — nova frase
  "Corrigido na correção residual de G3, variante shell"), `.checks/issue-3-agent-diagnostics.md` (nova
  subseção "Landing da correção residual G3, variante shell" e frase adicional na entrada C8) e esta seção.
  `.checks/issue-3-agent-diagnostics.verified.md` não foi editado (relatório independente, preservado).
- Evidência: `.checks/code-review/verifier4-g3-shell-fix-red.txt`, `…-green-targets.txt`, `…-doctor.txt`,
  `…-npm-test.txt`. Preservado sem alteração: `.checks/code-review/verifier4-g3-shell-fix.md`
  (encaminhamento).

## 16. Correção dos três achados bloqueantes da segunda revisão formal (13/10/2026)

A segunda revisão formal (`.checks/code-review/issue-3/response.json`, HEAD `fd4258f`, `changes_requested`,
AC3/AC5 `unmet`) confirmou três defeitos na avaliação de configuração do Codex, todos da mesma classe:
`configuration=configured`/`status=complete` para instrumentação que o Codex 0.162.1 real desligaria ou
rejeitaria. Encaminhamento do orquestrador: `.checks/code-review/formal2-codex-fixes.md`. Autor: Claude.
Nenhuma mudança na task, nos critérios, em `.verified.md`, no motor comum de `scripts/code-review/` (paridade
SHA-256/diff reconfirmada abaixo), em `AGENTS.md` ou nos limites/raias de governança. Sem commit, push,
`review:run`/`pr:create` nem nova verificação independente nesta rodada — as duas tentativas formais já
estavam consumidas; autorização explícita só para esta correção pontual.

### Os três achados e seu alcance real

Fontes primárias da tag `rust-v0.162.1` obtidas pelo orquestrador via GitHub API e preservadas byte a byte em
`.checks/code-review/native-codex-0.162.1/` (`hook_config.rs`, `hooks_tests.rs`, `legacy.rs`, `lib.rs`), só
para leitura, nunca para execução.

1. **Alias `features.codex_hooks` descartado (`config-projection.mjs:36`)**: `legacy.rs` define `Alias {
   legacy_key: "codex_hooks", feature: Feature::CodexHooks }`; `lib.rs` confirma `Feature::CodexHooks.key()
   == "hooks"` — mesma feature, chave legada. `extractSafeFields` só lia `parsed.features.hooks`; um usuário
   com `[features]\ncodex_hooks = false` e hooks nativos válidos, sem override de projeto, aparecia
   `configured` em vez de `disabled`. Quando as duas chaves coexistem no MESMO escopo, `FeaturesToml::entries`/
   `Features::apply_map` (`lib.rs`) as achatam num único `BTreeMap<String, bool>`, cuja iteração alfabética
   aplica "codex_hooks" antes de "hooks" — a canônica, por último, sobrescreve a legada; nunca um OR de
   "false" entre as duas.
2. **`input` do `mcp_tool` com `null` aninhado (`hooks-shape.mjs:144`)**: `deserialize_mcp_tool_input`
   (`hook_config.rs`) roda `toml::Value::try_from` sobre o mapa inteiro de `input`; TOML não tem `null`, então
   qualquer profundidade de objeto/array com `null` falha a deserialização. `hooks_tests.rs::
   hooks_file_rejects_mcp_tool_handler_with_null_input` prova três formas: objeto raso (`{"optional": null}`),
   aninhado em objeto (`{"metadata": {"optional": null}}`) e aninhado em array (`{"values": [null]}`) — as
   três rejeitadas pela fonte. `isValidDefaultedField(handler, "input", isPlainObject)` só conferia o
   container externo, então as três formas apareciam `configured`.
3. **Envelope de `hooks.json` não validado (`config-projection.mjs:21`)**: `HooksFile` tem `#[serde(
   deny_unknown_fields)]` na raiz, `description: Option<String>` e `hooks: HookEventsToml` (default só na
   AUSÊNCIA da chave, não um `Option`). `hooks_tests.rs::hooks_file_rejects_events_outside_hooks_object` prova
   que um campo de raiz fora de `description`/`hooks` falha a deserialização do arquivo inteiro.
   `extractSafeFields` nunca validava a raiz antes de projetar: `description=42` ao lado de um
   `hooks.PreToolUse` válido aparecia `configured`, embora o Codex real rejeitasse o arquivo inteiro.

### Ordem seguida (TDD)

Leitura das quatro fontes primárias (só texto, nunca importadas/executadas) → regressões novas na própria
camada (`config-projection.unit.test.mjs`, 11 casos novos) e na fronteira real da CLI
(`configuration-trust.cli.test.mjs`, 8 casos novos) → RED confirmado por execução real (`git stash push --
` dos dois arquivos de produto desta rodada para o estado anterior — `fd4258f` —, suíte afetada rodada sobre
o produto antigo, depois `stash pop`) → implementação → GREEN com os alvos afetados, depois `test:doctor`
completo isolado e `npm test` completo uma única vez.

RED real, produto no estado anterior a esta rodada (testes desta rodada já presentes), saída completa em
`.checks/code-review/formal2-codex-fixes-red.txt`:

```
node --test tests/doctor/config-projection.unit.test.mjs tests/doctor/configuration-trust.cli.test.mjs
  -> tests 79, pass 68, fail 11
EXIT_CODE=1
```

As 11 falhas são exatamente os casos novos desta rodada que discriminam os três achados (6 em
`config-projection.unit.test.mjs`: alias isolado, null aninhado em profundidade variável, `description=42`,
campo de raiz desconhecido, `hooks: null`, raiz não-objeto; 5 em `configuration-trust.cli.test.mjs`: alias em
usuário, alias em projeto, `description=42` na fronteira real, raiz desconhecida na fronteira real, `null`
aninhado na fronteira real). Os demais 68 casos (antigos e os novos que já valiam sem a correção, ex.: a
chave canônica decidindo o conflito, dados válidos preservados, config.toml/Claude não afetados pela
whitelist de hooks.json) já passavam no produto antigo — cobertura da alternativa que a correção precisa
preservar sem quebrar, não regressão deste achado.

### Decisão e correção

1. **`config-projection.mjs` — alias de `features.hooks`**: `extractSafeFields` agora lê
   `parsed.features.hooks` (canônica) e, só quando esta não é booleana, cai para `parsed.features.codex_hooks`
   (alias) — reproduzindo a sobrescrita alfabética do `BTreeMap` nativo sem reimplementar o merge inteiro de
   features (fora do escopo: só a feature de hooks importa aqui). A restrição de confiança de projeto em
   `config-reader.mjs` (`isDisabled` do Codex) já operava sobre o campo final `fields.featuresHooksEnabled`,
   então passou a cobrir o alias automaticamente, sem alteração própria nesse arquivo.
2. **`hooks-shape.mjs` — `input` do `mcp_tool` sem `null` em nenhuma profundidade**: nova `hasNullDeep`
   (pilha explícita com `Array.prototype.push`/`pop`, sem recursão de chamada, para não depender da
   profundidade de um `input` arbitrário — o limite de 1 MiB já aplicado à leitura do arquivo limita o número
   de nós, não a profundidade de pilha de uma recursão) e `isTomlRepresentableMcpInput` (objeto E sem `null`
   em nenhuma profundidade), substituindo o `isPlainObject` raso em `isValidDefaultedField(handler, "input",
   ...)`. Reproduz só a regra de `null` (não um parser de representabilidade TOML completo — fora do escopo:
   nenhum outro caso de não-representabilidade foi identificado pela fonte revisada).
3. **`config-projection.mjs` — envelope de `hooks.json`**: nova `hooksFileEnvelopeReasonCode`, chamada em
   `projectConfig` só quando `agentId === "codex" && format === "json"` (hooks.json é o único arquivo JSON do
   Codex; `config.toml` é sempre format `"toml"`, nunca passa por esta checagem; Claude/Hermes nunca têm
   `agentId === "codex"`). Raiz fora de objeto, campo desconhecido fora de `description`/`hooks`,
   `description` de outro tipo que não string/null, ou `hooks` explicitamente `null` (tipo errado para um
   campo não-`Option`, distinto da ausência da chave, que usa o default vazio) retornam
   `invalid/hooks_file_envelope_invalid` antes de `extractSafeFields`. Um `hooks` presente de outro tipo
   (array/string/número) continua decidido por `inspectNativeHooks`, como antes — não duplicado aqui, para
   preservar o `reasonCode hooks_structure_invalid` já coberto por teste aprovado
   (`config-projection-C8 Codex: hooks.json e config.toml com forma diferente da documentada são inválidos`).

### Resultados

Alvos afetados, logo após a implementação (saída completa em
`.checks/code-review/formal2-codex-fixes-green-targets.txt`):

```
node --test tests/doctor/config-projection.unit.test.mjs tests/doctor/configuration-trust.cli.test.mjs tests/doctor/config-reader.unit.test.mjs tests/doctor/scope-merge.unit.test.mjs tests/doctor/trust-resolution.unit.test.mjs
  -> tests 113, pass 113, fail 0, skipped 0
EXIT_CODE=0
```

`test:doctor` completo isolado (saída em `.checks/code-review/formal2-codex-fixes-doctor.txt`):

```
node --test "tests/doctor/**/*.test.mjs"
  -> tests 271, pass 270, fail 0, skipped 1
EXIT_CODE=0
```

`npm test` completo, uma única execução após as alterações finais (saída completa em
`.checks/code-review/formal2-codex-fixes-npm-test.txt`, sem pipe mascarando o exit):

```
  test:governance  -> tests 6,   pass 6,   fail 0, skipped 0
  test:code-review -> tests 10,  pass 10,  fail 0, skipped 0
  test:doctor      -> tests 271, pass 270, fail 0, skipped 1
EXIT_CODE=0
```

Delta de `test:doctor` contra a rodada 4 verificada (252 → 271): 19 testes — 11 novos em
`config-projection.unit.test.mjs` (alias isolado; canônica decidindo o conflito nos dois sentidos; cinco
casos de envelope de hooks.json inválido; dois casos de envelope válido preservado; dois casos de não-
interferência em Claude/config.toml; null aninhado em até 4 níveis de profundidade; dados aninhados válidos
preservados) e 8 novos em `configuration-trust.cli.test.mjs` (reprodução exata na fronteira real da CLI,
JSON e texto, dos mesmos três achados). O único skip continua `agent-resolution-C2 realpath/symlink real …
(POSIX)`, condicional ao executor, não um skip novo. Paridade do motor comum reconfirmada nesta data: `git
diff --exit-code 4242520 -- scripts/code-review/{cli.mjs,review.mjs,review.test.mjs,schema.json,README.md}`
sem diff.

### Limitações declaradas

- Executado só em Windows 11 Pro, Node 24.21.0 (mesma limitação das seções anteriores). Nenhuma fonte, agente,
  hook, intérprete ou config ativa da máquina foi executada, importada ou alterada nesta rodada — só leitura
  textual das quatro fontes primárias da tag `rust-v0.162.1` já citadas pelo encaminhamento, preservadas em
  `.checks/code-review/native-codex-0.162.1/`.
- `isTomlRepresentableMcpInput` reproduz só a rejeição de `null` do deserializer customizado; outros valores
  que o JSON permite e o TOML eventualmente não represente (nenhum identificado pela fonte revisada) ficam
  fora do escopo desta checagem — mesma lacuna já registrada em `docs/agent-compatibility.md` para o restante
  de `input`/comandos/URLs/prompts.
- `hooksFileEnvelopeReasonCode` não distingue, dentro do mesmo `reasonCode`, qual das quatro condições (raiz
  não-objeto, campo desconhecido, `description` de tipo errado, `hooks: null`) disparou a invalidação — mesmo
  nível de granularidade já aceito para `hooks_structure_invalid` (forma interna de `hooks`), não ampliado nem
  reduzido nesta correção.

### Arquivos desta rodada

- Produto: `src/doctor/config-projection.mjs` (`isPlainObject`/`hooksFileEnvelopeReasonCode` novos; alias
  `codex_hooks` em `extractSafeFields`; chamada do envelope em `projectConfig`), `src/doctor/hooks-shape.mjs`
  (`hasNullDeep`/`isTomlRepresentableMcpInput` novos, usados por `classifyCodexMcpTool`).
- Testes: `tests/doctor/config-projection.unit.test.mjs` (11 novos), `tests/doctor/configuration-trust.cli.
  test.mjs` (8 novos).
- Documentação/checklist: `docs/agent-compatibility.md` (linha Codex de alias/precedência; linha Codex de
  `hooks.json`/`input` do `mcp_tool` com a checagem de `null` e o novo envelope de raiz),
  `.checks/issue-3-agent-diagnostics.md` (nova subseção "Landing da correção dos três achados bloqueantes da
  segunda revisão formal" e frase adicional na entrada C8) e esta seção.
  `.checks/issue-3-agent-diagnostics.verified.md` não foi editado (relatório independente, preservado).
- Evidência: `.checks/code-review/formal2-codex-fixes-red.txt`, `…-green-targets.txt`, `…-doctor.txt`,
  `…-npm-test.txt`. Preservados sem alteração: `.checks/code-review/formal2-codex-fixes.md` (encaminhamento),
  `.checks/code-review/issue-3/response.json` (segunda revisão formal),
  `.checks/code-review/native-codex-0.162.1/*.rs` (fontes primárias).

## 17. Complementação residual do mesmo achado 1: tipos inválidos nas duas flags conhecidas (13/10/2026)

Encaminhamento: `.checks/code-review/formal2-flag-types-residual.md`. Autor: Claude. A correção do item 16.1
(alias `codex_hooks`) só tratava a AUSÊNCIA da chave canônica como gatilho de fallback para o alias; o
próprio encaminhamento original (`.checks/code-review/formal2-codex-fixes.md`, "Alcance da mesma decisão de
flags conhecidas") já exigia não descartar silenciosamente um tipo inválido nem deixar um alias válido
esconder um erro nativo de desserialização — lacuna não fechada na rodada 16. Nenhuma mudança na task, nos
critérios, em `.verified.md`, em `AGENTS.md`, no motor comum de `scripts/code-review/` ou nos limites de
governança. Sem commit, push, `review:run`/`pr:create` nem nova verificação independente.

### O achado residual

Probes reais (`.checks/code-review/probe-formal2-flag-types.mjs`) com handlers nativos válidos ao lado
mostravam `configured` em três casos que a fonte (`FeaturesToml::entries: BTreeMap<String, bool>`,
`lib.rs:869–871`, tag `rust-v0.162.1`) rejeita antes mesmo de aplicar a precedência entre canônica e alias:

1. `hooks="yes"` + `codex_hooks=true` — canônica de tipo errado caindo para um alias bool válido.
2. `hooks=true` + `codex_hooks="no"` — alias de tipo errado escondido atrás de uma canônica bool válida.
3. `codex_hooks="no"` (sozinho, sem `hooks`) — alias de tipo errado sem a canônica presente.

Não é um conflito válido entre dois booleans (já coberto na rodada 16): é um tipo errado numa chave CONHECIDA
presente, que a deserialização nativa do `BTreeMap<String, bool>` rejeita por inteiro, independente de a outra
chave estar ausente ou ser um bool válido.

### Decisão e correção

`extractSafeFields` (`config-projection.mjs`) agora confere, antes de escolher a flag efetiva, se cada chave
conhecida presente (`features.hooks`, `features.codex_hooks`) é booleana. Qualquer uma presente com outro tipo
retorna `{ fields: {}, featuresFlagsReasonCode: "features_hooks_flag_invalid_type" }`, que `projectConfig`
traduz para `invalid/features_hooks_flag_invalid_type` sem projetar campos — mesmo sozinha, sem a outra chave.
Só a ausência de uma das duas chaves (nunca um tipo inválido dela) continua abrindo espaço para a outra
decidir; com as duas presentes e booleanas, a canônica continua vencendo (comportamento da rodada 16,
preservado e agora também coberto por teste de não-regressão explícito). Nenhum parser novo, nenhuma
dependência nova, nenhuma extensão a outras chaves de `[features]` ou a schema geral — só as duas chaves já
conhecidas por este diagnóstico.

### Ordem seguida (TDD) e evidência de execução real

Derivação das regressões a partir da fonte primária já citada (`lib.rs:869–871`, preservada byte a byte em
`.checks/code-review/native-codex-0.162.1/lib.rs`) → RED confirmado por execução real (`git stash push
--keep-index -- src/doctor/config-projection.mjs`, suíte afetada rodada sobre o produto anterior, depois
`stash pop`) → implementação → GREEN nos alvos afetados → `test:doctor` completo isolado → `npm test` completo
uma única vez.

RED real, produto no estado anterior a esta rodada (testes desta rodada já presentes), saída completa em
`.checks/code-review/formal2-flag-types-red.txt`:

```
node --test tests/doctor/config-projection.unit.test.mjs tests/doctor/config-reader.unit.test.mjs tests/doctor/configuration-trust.cli.test.mjs
  -> tests 103, pass 95, fail 8
EXIT_CODE=1
```

As 8 falhas são exatamente os casos novos desta rodada que discriminam o achado residual (4 em
`config-projection.unit.test.mjs`: canônica inválida não cai para alias válido, alias inválido não fica
escondido atrás de canônica válida, alias sozinho inválido, canônica sozinha inválida; 2 em
`config-reader.unit.test.mjs`: mesmos dois primeiros casos na camada de leitura de escopos/trust; 2 em
`configuration-trust.cli.test.mjs`: mesmos dois primeiros casos na fronteira real da CLI, JSON e texto). Um
nono caso novo (ausência de uma das chaves delegando normalmente à outra, em `config-projection.unit.test.mjs`)
já passava no produto antigo — preservação da alternativa que a correção não pode quebrar, não regressão deste
achado.

Alvos afetados, logo após a implementação, incluindo as camadas vizinhas que dependem do campo
`featuresHooksEnabled` (saída completa em `.checks/code-review/formal2-flag-types-green-targets.txt`):

```
node --test tests/doctor/config-projection.unit.test.mjs tests/doctor/config-reader.unit.test.mjs tests/doctor/configuration-trust.cli.test.mjs tests/doctor/scope-merge.unit.test.mjs tests/doctor/trust-resolution.unit.test.mjs
  -> tests 122, pass 122, fail 0
EXIT_CODE=0
```

`test:doctor` completo isolado (saída em `.checks/code-review/formal2-flag-types-doctor.txt`):

```
node --test "tests/doctor/**/*.test.mjs"
  -> tests 280, pass 279, fail 0, skipped 1
EXIT_CODE=0
```

`npm test` completo, uma única execução após as alterações finais (saída completa em
`.checks/code-review/formal2-flag-types-npm-test.txt`, sem pipe mascarando o exit):

```
  test:governance  -> tests 6,   pass 6,   fail 0, skipped 0
  test:code-review -> tests 10,  pass 10,  fail 0, skipped 0
  test:doctor      -> tests 280, pass 279, fail 0, skipped 1
EXIT_CODE=0
```

Delta de `test:doctor` contra a rodada 16 (271 → 280): 9 testes novos — 5 em
`config-projection.unit.test.mjs` (os 4 casos de tipo inválido acima e 1 caso de preservação da ausência de
chave), 2 em `config-reader.unit.test.mjs`, 2 em `configuration-trust.cli.test.mjs`. O único skip continua
`agent-resolution-C2 realpath/symlink real … (POSIX)`, condicional ao executor, não um skip novo.

### Limitações declaradas

- Executado só em Windows 11 Pro, Node 24.21.0 (mesma limitação das seções anteriores). Nenhuma fonte, agente,
  hook, intérprete ou config ativa da máquina foi executada, importada ou alterada nesta rodada — só leitura
  textual de `lib.rs`, já preservado de rodadas anteriores em `.checks/code-review/native-codex-0.162.1/`.
- `features_hooks_flag_invalid_type` não distingue, dentro do mesmo `reasonCode`, qual das duas chaves
  (`hooks` ou `codex_hooks`) carregava o tipo errado quando as duas estão presentes — mesmo nível de
  granularidade já aceito para `hooks_file_envelope_invalid`/`hooks_structure_invalid` em rodadas anteriores,
  não ampliado nem reduzido aqui.
- Esta checagem continua restrita às duas chaves já conhecidas por este diagnóstico
  (`features.hooks`/`features.codex_hooks`); nenhuma outra chave de `[features]`, feature desconhecida do
  agente ou schema geral foi validada — fora do escopo deste achado e desta entrega.

### Arquivos desta rodada

- Produto: `src/doctor/config-projection.mjs` (validação de tipo das duas chaves conhecidas de `[features]`
  antes de escolher a flag efetiva, nova saída `featuresFlagsReasonCode`/`features_hooks_flag_invalid_type`).
- Testes: `tests/doctor/config-projection.unit.test.mjs` (5 novos), `tests/doctor/config-reader.unit.test.mjs`
  (2 novos), `tests/doctor/configuration-trust.cli.test.mjs` (2 novos).
- Documentação/checklist: `docs/agent-compatibility.md` (linha Codex de alias/precedência, frase adicional
  sobre a validação de tipo antes da precedência), `.checks/issue-3-agent-diagnostics.md` (frase adicional na
  entrada C8, logo após a "Landing da correção dos três achados bloqueantes") e esta seção.
  `.checks/issue-3-agent-diagnostics.verified.md` não foi editado (relatório independente, preservado).
- Evidência: `.checks/code-review/formal2-flag-types-red.txt`, `…-green-targets.txt`, `…-doctor.txt`,
  `…-npm-test.txt`. Preservados sem alteração: `.checks/code-review/formal2-flag-types-residual.md`
  (encaminhamento), `.checks/code-review/formal2-codex-fixes.md` (encaminhamento original),
  `.checks/code-review/probe-formal2-flag-types.mjs` (probe), `.checks/code-review/native-codex-0.162.1/lib.rs`
  (fonte primária).

## 18. Correção dos quatro achados bloqueantes da revisão formal3 (13/10/2026)

A revisão formal3 (`.checks/code-review/issue-3-formal3-response.json`, HEAD `9f98068`,
`changes_requested`, AC1/AC3/AC5 `unmet`) confirmou quatro defeitos novos, nenhum dos três achados
anteriores reaberto. Encaminhamento do orquestrador: `.checks/code-review/formal3-fixes.md`. Autor:
Claude. Responsabilidade exclusiva do alcance direto dos quatro achados: `src/doctor/launcher-link/
codex.mjs`, `src/doctor/config-projection.mjs`, `src/doctor/hooks-shape.mjs` e os testes
correspondentes. Nenhuma mudança na task, nos critérios, em `.verified.md`, em `AGENTS.md`, no motor
comum de `scripts/code-review/` (paridade sem diff reconfirmada abaixo) ou nos limites de governança.
Sem commit, push, stash definitivo, `review:run`/`pr:create` nem nova verificação independente nesta
rodada.

### Os quatro achados e seu alcance real

Fontes primárias da tag `rust-v0.162.1`, já preservadas byte a byte em `.checks/code-review/
native-codex-0.162.1/` (`hook_config.rs`, `hooks_tests.rs`, `legacy.rs`, `lib.rs`), só para leitura,
nunca para execução.

1. **Metadado JSON `null` do pacote Codex (`launcher-link/codex.mjs:81`)**: um launcher reconhecido
   (shim ligado de verdade a `node_modules/@openai/codex`) com `package.json` contendo o JSON válido
   `null` fazia `parsed.name` lançar `TypeError`; o `catch` de `resolveOneAgent`
   (`agent-resolution.mjs`) convertia a falha em `presence: unknown/unknown_error`, embora o artefato
   já tivesse sido encontrado e lido com sucesso — violando o critério 3 (artefato presente com
   metadado ilegível nunca é confundido com presença indeterminável).
2. **Mapa `[features]` inteiro do Codex não validado (`config-projection.mjs:87`)**: a correção da
   rodada 17 só conferia `features.hooks`/`features.codex_hooks`. `FeaturesToml::entries`
   (`lib.rs:838–871`) é o `BTreeMap<String, bool>` que absorve QUALQUER outra chave de `[features]`
   via `#[serde(flatten)]` — uma chave desconhecida do `doctor` (ex.: `shell_tool = "yes"`) com valor
   não booleano já derruba a deserialização do mapa inteiro na fonte, mesmo com `hooks=true` e
   handlers nativos válidos ao lado. O `doctor` anunciava `configured`/`complete` para um arquivo que
   o Codex real rejeitaria.
3. **Campos inteiros nativos sem teto (`hooks-shape.mjs:121,124,172`)**: `timeout` (`Command` e
   `McpTool`) é `Option<u64>`; `additionalContextLimit` (só `Command`) é `Option<usize>`
   (`hook_config.rs`). `isNonNegativeInteger` conferia sinal e integralidade, nunca o teto superior
   (2^64-1). Um `timeout` de `18446744073709551616` (2^64, inválido) em `hooks.json` aparecia
   `configured`/`complete`.
4. **Lista grande de hooks derruba a CLI inteira (`hooks-shape.mjs:219,278`)**:
   `matcherGroupHandlers`/`inspectMatcherGroupHooks` espalhavam a lista de handlers de um grupo como
   argumentos de `.push(...)`/`.push(...array.map(...))`. Um `hooks.json` sintaticamente válido com um
   grupo `PreToolUse` de 300.000 objetos vazios (~900 KB, abaixo do limite de 1 MiB) estourava o
   limite de argumentos do V8 (`RangeError: Maximum call stack size exceeded`) ANTES de qualquer
   classificação rodar; a exceção escapava da leitura de configuração e a CLI real emitia
   `failed/internal_error`, `agents: []` e exit 1 — todo o diagnóstico perdido por causa de um único
   agente, violando o isolamento de falha exigido pelo critério 12.

### Decisão e correção

1. **Metadado `null`**: `parsed === null || parsed.name !== "@openai/codex"` — o curto-circuito do
   `||` evita o acesso a `.name` quando `parsed` é `null`, sem mudar o resultado para os demais casos
   (primitivos/arrays já não lançavam, só não tinham `name`, então já caíam na mesma resposta de
   "não reconhecido").
2. **Mapa `[features]`**: nova função `codexFeaturesEntriesReasonCode`, chamada só para
   `agentId === "codex"`, que percorre `Object.entries(parsed.features)` e exige booleano em toda
   chave que não seja um dos 13 campos nomeados/tipados de `FeaturesToml` (`tool_registry`,
   `code_mode`, `code_mode_host`, `non_prefixed_mcp_tool_names`, `guardianv2`, `multi_agent_v2`,
   `token_budget`, `context_management`, `rollout_budget`, `current_time_reminder`, `sleep_tool`,
   `apps_mcp_path_override`, `network_proxy`). Não reimplementa o schema desses 13 campos — só a
   decisão de exclusão do mapa achatado. Restrito ao Codex: Claude não tem essa struct.
3. **Teto dos campos inteiros**: `isValidOptionalU64Field` substitui `isNonNegativeInteger` nos três
   pontos (`timeout` de `Command`/`McpTool`, `additionalContextLimit` de `Command`). Decisão
   documentada antes de implementar: um `Number` do `JSON.parse` não representa 2^64-1 com exatidão
   (arredonda para o MESMO double que o primeiro valor inválido acima dele, 2^64) — e um literal
   `18446744073709551615` escrito como `Number` no próprio código sofreria o mesmo arredondamento, por
   isso o teto é um `BigInt` (`18446744073709551615n`) comparado contra o texto-fonte exato do número,
   não contra o `value` já convertido. Esse texto-fonte vem do reviver de três argumentos do
   `JSON.parse` do Node 24 (`context.source`, confirmado disponível nesta versão — Node 24.21.0):
   `parseCodexHooksJson` (`config-projection.mjs`) guarda o texto por campo (`timeout`,
   `additionalContextLimit`) numa propriedade de `Symbol` (`CODEX_INTEGER_SOURCE`, exportado de
   `hooks-shape.mjs`) no próprio objeto do handler — invisível a `Object.keys`/`JSON.stringify`/
   `Object.values`, então nunca vaza na projeção nem atrapalha as checagens estruturais existentes.
   Só usado para `format: "json"` do Codex. **Nota de correção (ver seção 19)**: a frase original
   aqui afirmava que `config.toml` nunca precisaria de checagem de teto, porque `smol-toml` rejeitava
   (`config_malformed`) qualquer inteiro fora da faixa segura de um double — incluindo um `i64::MAX`
   legítimo e nativo (`9223372036854775807`), que é um FALSO NEGATIVO: essa afirmação tratava uma
   limitação do parser padrão como se fosse o comportamento correto do formato, rejeitando uma
   configuração que o Codex real aceita. A correção residual da seção 19 substitui o parsing padrão
   por `integersAsBigInt: true` (já existente no pacote) e aplica o teto real do PRÓPRIO formato TOML
   (`i64::MAX`, menor que o teto do campo Rust `u64`). Nenhum parser novo, nenhuma dependência nova.
4. **Lista grande de hooks**: os dois `.push(...)` viram laço simples (`for (const x of arr)
   target.push(x)`), sem teto de argumentos. `matcherGroupHandlers` é compartilhada por Claude e
   Codex (`HOOKS_INSPECTORS`): a mesma correção cobre os dois agentes que a usam, sem duplicar lógica.

### Ordem seguida (TDD) e evidência de execução real

Leitura das quatro fontes primárias (só texto, nunca importadas/executadas) → regressões novas nas
três camadas afetadas (`agent-resolution.unit.test.mjs`, `config-projection.unit.test.mjs`,
`config-reader.unit.test.mjs`, `configuration-trust.cli.test.mjs`) → RED confirmado por execução real
(`git stash push -- src/doctor/launcher-link/codex.mjs src/doctor/config-projection.mjs
src/doctor/hooks-shape.mjs`, suíte afetada rodada sobre o produto anterior ao achado, depois
`stash pop`) → implementação dos quatro pontos → GREEN nos alvos afetados → `test:doctor` completo
isolado → `npm test` completo uma única vez, após as últimas alterações.

RED real, produto no estado anterior a esta rodada (testes desta rodada já presentes), saída completa
em `.checks/code-review/formal3-red.txt`:

```
node --test tests/doctor/config-projection.unit.test.mjs tests/doctor/config-reader.unit.test.mjs tests/doctor/agent-resolution.unit.test.mjs tests/doctor/configuration-trust.cli.test.mjs
  -> tests 159, pass 149, fail 9
EXIT_CODE=1
```

As 9 falhas isolam exatamente os quatro achados: 2 em `agent-resolution.unit.test.mjs` (metadado
`null`/primitivo/array lançando e `presence: unknown` na resolução completa — o terceiro caso novo,
controle com `package.json` válido, já passava no produto antigo); 2 em
`config-projection.unit.test.mjs` para o achado 2 (`shell_tool` inválido) e 1 em
`config-reader.unit.test.mjs` (mesmo achado na fronteira de escopo de projeto); 2 em
`config-projection.unit.test.mjs` para o achado 3 (`timeout`/`additionalContextLimit` imediatamente
acima do teto do u64 — o caso "no teto máximo válido" já passava no produto antigo, já que o `Number`
arredondado coincidia com o teto); 3 em `config-projection.unit.test.mjs` e 1 em
`configuration-trust.cli.test.mjs` para o achado 4 (lista grande inválida/válida na camada pura e na
fronteira real da CLI — `AssertionError: 1 !== 0` no exit code, confirmando o `failed`/exit 1 relatado
pela revisão). Os demais 149 casos (antigos e os novos que já valiam sem a correção) preservavam a
alternativa que cada correção não pode quebrar.

Alvos afetados, GREEN após a implementação (saída completa em
`.checks/code-review/formal3-green-targets.txt`):

```
node --test tests/doctor/config-projection.unit.test.mjs tests/doctor/config-reader.unit.test.mjs tests/doctor/agent-resolution.unit.test.mjs tests/doctor/configuration-trust.cli.test.mjs
  -> tests 159, pass 158, fail 0, skipped 1
EXIT_CODE=0
```

`test:doctor` completo isolado (saída em `.checks/code-review/formal3-doctor.txt`):

```
node --test "tests/doctor/**/*.test.mjs"
  -> tests 297, pass 296, fail 0, skipped 1
EXIT_CODE=0
```

`npm test` completo, uma única execução após as alterações finais (saída completa em
`.checks/code-review/formal3-npm-test.txt`, sem pipe mascarando o exit):

```
  test:governance  -> tests 6,   pass 6,   fail 0, skipped 0
  test:code-review -> tests 10,  pass 10,  fail 0, skipped 0
  test:doctor      -> tests 297, pass 296, fail 0, skipped 1
EXIT_CODE=0
```

Delta de `test:doctor` contra a rodada 17 (280 → 297): 17 testes novos — 3 em
`agent-resolution.unit.test.mjs` (metadado `null`/primitivo/array, `presence: present` na resolução
completa, controle com `package.json` válido); 5 em `config-projection.unit.test.mjs` para o achado 2
(chave desconhecida inválida, booleano desconhecido preservado, campo nomeado/tipado como objeto
preservado, regra restrita ao Codex); 6 em `config-projection.unit.test.mjs` para o achado 3 (teto
válido e acima do teto em `Command`/`McpTool`, `additionalContextLimit`, faixa própria do TOML); 4 em
`config-projection.unit.test.mjs` para o achado 4 (lista inválida grande, lista válida em larga
escala, mesmo helper do Claude, limite de bytes independente preservado); 1 em
`config-reader.unit.test.mjs` (achado 2 em escopo de projeto); 1 em `configuration-trust.cli.test.mjs`
(achado 4 na fronteira real, com paridade texto/JSON e isolamento dos três agentes/collector). Paridade
dos cinco arquivos comuns de `scripts/code-review/` contra a base (`4242520`) reconfirmada sem diff. O
único skip continua `agent-resolution-C2 realpath/symlink real … (POSIX)`, condicional ao executor.

### Limitações declaradas

- Executado só em Windows 11 Pro, Node 24.21.0 (mesma limitação das seções anteriores). Nenhum
  agente, hook, intérprete, Python ou script de instalação foi executado, importado ou alterado nesta
  rodada — só leitura textual das fontes Rust já preservadas em `.checks/code-review/
  native-codex-0.162.1/`.
- O teto exato de `isValidOptionalU64Field` depende do texto-fonte do número (`CODEX_INTEGER_SOURCE`)
  estar presente; como o `doctor` sempre usa o reviver próprio (`parseCodexHooksJson`) para
  `format: "json"` do Codex, essa fonte nunca falta nesse caminho — mas se faltasse (nunca observado),
  a decisão cai para `invalid` por falta de prova, nunca para "dentro do limite" por omissão.
- A faixa representável de `usize` depende da plataforma nativa; esta correção assume 64 bits em
  todas as plataformas que o Codex 0.162.1 publica binário nativo (Windows x64/arm64, macOS, Linux
  x64/arm64 — inspeção local já registrada na tabela de compatibilidade), sem confirmar uma
  plataforma de 32 bits hipotética fora desse conjunto.
- A prova de "lista válida grande" para `Command`/`McpTool` usa 30.000 handlers mínimos (não 300.000):
  um handler visado de verdade exige `type`+`command` não vazios (≥32 bytes), bem mais pesado que o
  `{}` inválido (2 bytes) do caso de regressão — 300.000 handlers válidos excedem o teto de 1 MiB do
  próprio arquivo antes de alcançar o código corrigido. 30.000 já excede com folga a contagem mínima
  de handlers que o `doctor` processa em qualquer fixture existente, provando a ausência de teto
  implícito de argumentos sem depender de um tamanho de arquivo inviável.

### Arquivos desta rodada

- Produto: `src/doctor/launcher-link/codex.mjs` (guarda contra `parsed === null` antes de `.name`),
  `src/doctor/config-projection.mjs` (`codexFeaturesEntriesReasonCode`, seleção do parser
  `parseCodexHooksJson` para `format: "json"` do Codex), `src/doctor/hooks-shape.mjs`
  (`isValidOptionalU64Field`/`CODEX_INTEGER_SOURCE`/`CODEX_U64_MAX`, laços simples em
  `matcherGroupHandlers`/`inspectMatcherGroupHooks` no lugar de `.push(...)`).
- Testes: `tests/doctor/agent-resolution.unit.test.mjs` (3 novos), `tests/doctor/
  config-projection.unit.test.mjs` (15 novos), `tests/doctor/config-reader.unit.test.mjs` (1 novo),
  `tests/doctor/configuration-trust.cli.test.mjs` (1 novo).
- Documentação/checklist: `docs/agent-compatibility.md` (três frases adicionais: metadado `null` do
  Codex, mapa `[features]` inteiro, teto dos campos inteiros, isolamento de lista grande — todas
  marcadas "Corrigido na revisão formal3"), esta seção. `.checks/issue-3-agent-diagnostics.md` recebe
  só a entrada aditiva da Landing (ver seção própria); `.checks/issue-3-agent-diagnostics.verified.md`
  não foi editado (relatório independente, preservado).
- Evidência: `.checks/code-review/formal3-red.txt`, `…-green-targets.txt`, `…-doctor.txt`,
  `…-npm-test.txt`. Preservados sem alteração: `.checks/code-review/formal3-fixes.md`
  (encaminhamento), `.checks/code-review/issue-3-formal3-response.json` (revisão formal),
  `.checks/code-review/native-codex-0.162.1/*.rs` (fontes primárias).

## 19. Correção dos três resíduos concretos dos achados 2 e 3 da revisão formal3 (13/10/2026)

Após a seção 18, a raiz (Codex) registrou dois encaminhamentos de acompanhamento com probes reais da
CLI (`.checks/code-review/probe-formal3-after-initial.txt`, produzido por `probe-formal3-native-cli.mjs`):
`.checks/code-review/formal3-number-token-note.md` (nota de investigação, fontes `serde`/`serde_json`
na tag exata do `Cargo.lock`) e `.checks/code-review/formal3-residual-fixes.md` (encaminhamento com os
três casos concretos). Autor: Claude; Codex raiz só revisa. Mesmo escopo da issue #3, achados 2 e 3 já
corrigidos na seção 18 — nenhum achado novo, nenhuma mudança de critério. `.verified.md`, `.tasks`,
AGENTS.md, core vendorizado e `code-review.config.json` não tocados. Sem commit/stash/push/PR/review
nesta rodada.

### Os três resíduos

1. **`features=true`/`features=false` (bool solto) no lugar de `[features]`**: `FeaturesToml`
   desserializa de uma TABELA (struct); um booleano solto falha a deserialização do documento inteiro
   antes mesmo de qualquer chave interna existir. A checagem da seção 18 testava
   `if (parsed.features)` (truthiness): `features = true` entrava no bloco mas
   `Object.hasOwn(true, "hooks")` retorna `false` sem lançar, então passava sem validação alguma;
   `features = false` era falsy e pulava o bloco inteiro. Os dois casos apareciam
   `configured`/`not_configured` quando o Codex real rejeitaria o arquivo.
2. **`timeout`/`additionalContextLimit` como token decimal/exponencial do JSON**: serde_json
   (`serde_json` 1.0.149, `de.rs::parse_number`, confirmado via `Cargo.lock` da tag `rust-v0.162.1`)
   roteia um token com ponto decimal ou expoente para `ParserNumber::F64`; o visitor de inteiro que
   `u64`/`usize` exigem (`serde` 1.0.228, `impls.rs`) não aceita float. `timeout: 1.0` e `timeout: 1e0`
   são portanto REJEITADOS pelo Codex real, mas `JSON.parse`/`Number.isInteger` apagam essa distinção
   lexical — `1.0`, `1e0` e `1` viram o mesmo `Number` 1 — então a correção da seção 18 (que só
   consultava o texto-fonte para valores FORA da faixa segura de um double) aceitava os três como
   `configured`. `-0` não tem ponto nem expoente: continua um token inteiro válido (zero).
3. **`config.toml`: teto de precisão incorreto e float não distinguido do inteiro**: a correção da
   seção 18 confiava no comportamento padrão do `smol-toml`, que rejeita (`config_malformed`) qualquer
   inteiro fora da faixa segura de um double (2^53) — isso incluía um `timeout = 9223372036854775807`
   (`i64::MAX`, legítimo e nativo), um FALSO NEGATIVO: uma configuração válida rejeitada como inválida.
   Além disso, `timeout = 1.0` (float TOML, sintaticamente distinto de `timeout = 1` no próprio formato)
   virava o mesmo `Number` 1 que o inteiro, então era aceito como `configured`, igual ao problema 2 mas
   do lado do TOML.

### Decisão e correção

1. **Container de `[features]`**: `extractSafeFields` agora testa `parsed.features !== undefined`
   (presença, não truthiness) e, para `agentId === "codex"`, exige `isPlainObject(parsed.features)`
   antes de ler `hooks`/`codex_hooks`/o mapa achatado — um valor que não é objeto vira
   `invalid/features_hooks_flag_invalid_type` imediatamente. `[features]` vazio (`{}`) continua válido
   (tabela real, só sem chaves).
2. **Token lexical do JSON**: `isValidOptionalU64Field` (`hooks-shape.mjs`) agora SEMPRE consulta o
   texto-fonte exato (`CODEX_INTEGER_SOURCE`) para um `Number`, não só quando o valor excede a faixa
   segura de um double — `PLAIN_INTEGER_TOKEN` (`/^-?\d+$/`) exige um token puramente decimal (sinal
   opcional + dígitos, sem `.`/`e`/`E`). Como o reviver de `parseCodexHooksJson` já capturava
   `context.source` para QUALQUER `Number` de `timeout`/`additionalContextLimit` (não só os fora da
   faixa segura, decisão já tomada na seção 18), nenhuma mudança foi necessária no reviver — só na
   função que decide com essa fonte.
3. **TOML — teto do próprio formato e distinção de tipo**: `parseCodexToml` (`config-projection.mjs`)
   agora chama `smol-toml` com `{ integersAsBigInt: true }` (opção `ParseOptions` já existente no
   pacote instalado, confirmada em `node_modules/smol-toml/dist/parse.d.ts`; nenhuma dependência nova).
   Com essa opção, TODO inteiro TOML vira `BigInt` exato, qualquer magnitude, sem jamais perder
   precisão; um FLOAT do TOML (`1.0`) nunca vira `BigInt`, só `Number` — a mesma distinção de tipo que
   o `toml`/`serde` nativos fazem. `isValidOptionalU64Field` decide por tipo: `BigInt` é comparado
   contra `CODEX_TOML_I64_MAX` (`9223372036854775807n`, teto do PRÓPRIO formato TOML — `i64` assinado,
   sempre menor que o teto do campo Rust `u64`/`usize`, e decide primeiro porque o toml-rs real falha
   ao desserializar o documento ANTES de alcançar a conversão para o campo); um `Number` nessa posição
   (sem fonte de texto JSON, já que `config.toml` nunca passa por `JSON.parse`) só pode ser um float
   TOML, recusado. Confirmado por execução real: `smol-toml` com `integersAsBigInt: true` parseia
   `9223372036854775807` (`i64::MAX`) e até `18446744073709551615` (u64::MAX, acima do i64::MAX) sem
   lançar — a biblioteca não impõe o teto i64 da spec TOML sozinha, então o `doctor` precisa impor seu
   próprio teto (`CODEX_TOML_I64_MAX`) para replicar a rejeição real do toml-rs.

### Ordem seguida e evidência de execução real

Leitura das fontes citadas pelo encaminhamento (`Cargo.lock` da tag `rust-v0.162.1`, preservado em
`.checks/code-review/native-codex-0.162.1/Cargo.lock`; `serde-rs/json` `de.rs` e `serde-rs/serde`
`impls.rs` nas tags exatas via GitHub; `node_modules/smol-toml/dist/parse.d.ts` local) → reprodução
direta dos três resíduos por execução real (scripts Node ad-hoc, abaixo) confirmando o comportamento
ANTES da correção → implementação dos três pontos → GREEN nos alvos afetados → `test:doctor` completo
isolado → `npm test` completo uma única vez, após as últimas alterações.

RED real (produto no estado da seção 18, antes desta correção), confirmado por execução direta:

```
features=true (TOML, só [hooks] válido ao lado)  -> not_configured/no_config_found (esperado: invalid)
features=false (TOML, idem)                       -> not_configured/no_config_found (esperado: invalid)
timeout=9223372036854775807 (TOML, i64::MAX)      -> invalid/config_malformed (esperado: configured)
timeout=1.0 (TOML)                                -> configured/hooks_configured (esperado: invalid)
timeout=1.0 (JSON)                                -> configured/hooks_configured (esperado: invalid)
timeout=1e0 (JSON)                                -> configured/hooks_configured (esperado: invalid)
```

GREEN real, mesmos seis casos após a implementação, mais os existentes preservados: alvos afetados
(saída completa em `.checks/code-review/formal3-residual-green-targets.txt`):

```
node --test tests/doctor/config-projection.unit.test.mjs tests/doctor/config-reader.unit.test.mjs tests/doctor/configuration-trust.cli.test.mjs
  -> tests 124, pass 124, fail 0
EXIT_CODE=0
```

`test:doctor` completo isolado (saída em `.checks/code-review/formal3-residual-doctor.txt`):

```
node --test "tests/doctor/**/*.test.mjs"
  -> tests 304, pass 303, fail 0, skipped 1
EXIT_CODE=0
```

`npm test` completo, uma única execução após as alterações finais (saída completa em
`.checks/code-review/formal3-residual-npm-test.txt`):

```
  test:governance  -> tests 6,   pass 6,   fail 0, skipped 0
  test:code-review -> tests 10,  pass 10,  fail 0, skipped 0
  test:doctor      -> tests 304, pass 303, fail 0, skipped 1
EXIT_CODE=0
```

Delta de `test:doctor` contra a seção 18 (297 → 304): 7 testes novos — 4 em
`config-projection.unit.test.mjs` (float TOML, token decimal/exponencial do JSON, `features` bool
solto, `[features]` vazio válido; um teste existente da seção 18 — teto do TOML — foi reescrito para o
novo teto `i64::MAX`/`i64::MAX+1`/`u64::MAX`, sem mudar a contagem), 1 em `config-reader.unit.test.mjs`
(`features=true` em escopo de usuário), 2 em `configuration-trust.cli.test.mjs` (residuais 1+3 em TOML
e residual 2 em JSON, ambos na fronteira real da CLI). Paridade dos cinco arquivos comuns de
`scripts/code-review/` contra a base (`4242520`) reconfirmada sem diff. O único skip continua
`agent-resolution-C2 realpath/symlink real … (POSIX)`.

### Limitações declaradas

- Executado só em Windows 11 Pro, Node 24.21.0. Nenhum agente, hook, intérprete ou script de
  instalação foi executado, importado ou alterado nesta rodada.
- A nota de investigação (`formal3-number-token-note.md`) registra que consultas a URLs versionadas de
  `docs.rs` não abriram na ferramenta da raiz; as fontes efetivamente usadas para decidir (código-fonte
  de `serde-rs/json`/`serde-rs/serde` nas tags exatas do `Cargo.lock`, e a documentação TypeScript local
  de `smol-toml`) foram lidas com sucesso e são as citadas acima — nenhuma alegação de execução nativa
  do Codex/Rust.
- `smol-toml` com `integersAsBigInt: true` não impõe sozinho o teto `i64` da spec TOML (parseia além
  dele sem lançar); o `doctor` precisa do próprio `CODEX_TOML_I64_MAX` para replicar a rejeição real do
  toml-rs — uma dependência de comportamento específico desta versão do `smol-toml` (`1.9.1`, já
  instalada), não uma garantia documentada da biblioteca.
- O teto de `additionalContextLimit` em `config.toml` segue a mesma regra do `timeout` (`i64::MAX`),
  por não haver razão na fonte para um teto de formato diferente entre os dois campos quando a origem
  é a mesma tabela TOML.

### Arquivos desta rodada

- Produto: `src/doctor/config-projection.mjs` (`parsed.features !== undefined` + checagem de
  container antes das chaves; `parseCodexToml` com `integersAsBigInt: true`), `src/doctor/
  hooks-shape.mjs` (`isValidOptionalU64Field` decide por tipo `BigInt`/`Number`+fonte;
  `PLAIN_INTEGER_TOKEN`; `CODEX_TOML_I64_MAX`).
- Testes: `tests/doctor/config-projection.unit.test.mjs` (4 novos, 1 reescrito), `tests/doctor/
  config-reader.unit.test.mjs` (1 novo), `tests/doctor/configuration-trust.cli.test.mjs` (2 novos).
- Documentação/checklist: `docs/agent-compatibility.md` (frases residuais nas células de achado 2 e 3
  do Codex), `.checks/issue-3-agent-diagnostics.md` (frases residuais aditivas na entrada C8, achados 2
  e 3), correção da frase imprecisa da seção 18 sobre o comportamento padrão do `smol-toml` (acima,
  nota de correção), esta seção.
- Evidência: `.checks/code-review/formal3-residual-green-targets.txt`, `…-doctor.txt`,
  `…-npm-test.txt`. Preservados sem alteração: `.checks/code-review/formal3-number-token-note.md`,
  `.checks/code-review/formal3-residual-fixes.md` (encaminhamentos), `.checks/code-review/
  probe-formal3-after-initial.txt` (probe da raiz), `.checks/code-review/native-codex-0.162.1/Cargo.lock`
  (fonte primária de versões).

## 20. Correção dos dois resíduos finais concretos dos achados 1 e 2 da revisão formal3 (13/10/2026)

Após a seção 19, a raiz (Codex) rodou `probe-formal3-native-cli.mjs` de novo contra o produto corrigido
(`.checks/code-review/probe-formal3-after-residual.txt`) e registrou dois casos concretos ainda
`complete`/`configured` em `.checks/code-review/formal3-final-residuals.md`. Autor: Claude; Codex raiz
só revisa. Mesmo escopo da issue #3, achados 1 e 2 já corrigidos nas seções 18-19 — nenhum achado novo,
nenhuma mudança de critério. `.verified.md`, `.tasks`, AGENTS.md, core vendorizado e
`code-review.config.json` não tocados. Sem commit/stash/push/PR/review/spawn nesta rodada.

### Os dois resíduos

1. **`features = 1979-05-27` (datetime TOML solto) no lugar de `[features]`**: a correção da seção 19
   testa `isPlainObject(parsed.features)` com `typeof value === "object" && !Array.isArray(value)` —
   essa condição também é verdadeira para um `Date`. `smol-toml` devolve um datetime/date TOML como
   `TomlDate extends Date` (`node_modules/smol-toml/dist/date.js`); um `Date` não tem propriedade
   própria enumerável, então `Object.entries(date)` é sempre `[]`, indistinguível de uma tabela vazia
   de verdade. `FeaturesToml` desserializa de um MAPA (lib.rs:838-871), nunca de um `Date` — o caso
   precisa do mesmo resultado que `features = true`/`features = false` (seção 19), mas a checagem só
   olhava "é objeto, não é array", sem considerar o protótipo.
2. **`timeout = -0` em `hooks.json`**: a correção da seção 19 exige um token puramente decimal
   (`PLAIN_INTEGER_TOKEN`, `/^-?\d+$/`) via o texto-fonte exato do `JSON.parse`. O literal `-0` casa
   com esse regex (não tem ponto nem expoente) e `BigInt("-0")` é `0n`, dentro do teto — então passava
   como inteiro válido. A fonte real do parser (`serde_json` 1.0.149, `de.rs::parse_number`, obtida do
   publisher crates.io com checksum idêntico ao `Cargo.lock` da tag `rust-v0.162.1`, preservada em
   `.checks/code-review/native-codex-0.162.1/serde-json-1.0.149/src/de.rs`) mostra que um token
   negativo cuja magnitude é zero NUNCA produz o inteiro: `neg = (significand as i64).wrapping_neg()`
   é `0` nesse caso, e o comentário da própria fonte na linha 519 ("Convert into a float if we
   underflow, or on `-0`") confirma que o parser roteia esse caso para `ParserNumber::F64(-0.0)`, não
   para `ParserNumber::I64`/`U64` — o visitor de `Option<u64>` nunca recebe esse valor como inteiro.
   `-0 < 0` é `false` em JS e `BigInt("-0")` é `0n`: nenhum dos dois revela essa armadilha: só o
   texto-fonte exato ("-0" literal, e não qualquer outro token) decide.

### Decisão e correção

1. **Protótipo do container de `[features]`**: `isPlainObject` (`config-projection.mjs`) agora também
   confere `Object.getPrototypeOf(value)`: `null` (tabelas reais do `smol-toml`, que usa
   `Object.create(null)` em `dist/parse.js`) ou `Object.prototype` (objetos de `JSON.parse`) são
   aceitos; qualquer outro protótipo — de `Date`/`TomlDate` ou de qualquer outra classe — é recusado
   como container de `[features]`, igual a um bool/número/string soltos. Os dois únicos pontos de
   chamada de `isPlainObject` neste arquivo (`hooksFileEnvelopeReasonCode` na raiz de `hooks.json`, e
   o container de `parsed.features`) só recebem `Object.prototype`/`null` em qualquer caso válido hoje
   coberto por teste, então a checagem mais estrita não muda nenhum resultado existente.
2. **Token lexical `-0` do JSON**: `isValidOptionalU64Field` (`hooks-shape.mjs`) agora recusa
   especificamente o texto-fonte `"-0"`, depois de confirmar que o token já é puramente decimal — um
   caso lexical único (um segundo zero à esquerda, como `"-00"`, já é rejeitado pelo próprio
   `JSON.parse` antes de chegar aqui, então `"-0"` é a única forma possível dessa armadilha). Qualquer
   outro token negativo (`"-5"`) já era recusado pelo `value < 0` existente; este é o único caso em
   que um `Number` não negativo (`-0` em JS não é `< 0`) esconde um token que o parser real trata como
   float. O mesmo valor em `config.toml` (`BigInt`, sem essa conversão do parser JSON) não passa por
   este ramo — `typeof value === "bigint"` decide antes, e continua válido (confirmado por teste
   dedicado, abaixo).

### Ordem seguida e evidência de execução real

Leitura da fonte baixada do publisher (`de.rs:460-528`, trecho citado acima) e do contrato de datas do
`smol-toml` já instalado (`dist/date.js`, `dist/parse.js` — confirmação por execução real de
`parse('timeout = -0\n', { integersAsBigInt: true })`, que devolve `0n`) → adição/atualização dos
testes próprios desta rodada, confirmando RED no produto da seção 19 → correção dos dois pontos →
GREEN nos mesmos testes, mais os já existentes preservados → `test:doctor` completo isolado →
`npm test` completo uma única vez, após as últimas alterações.

RED real (produto no estado da seção 19, antes desta correção), confirmado por execução direta dos
testes (saída completa em `.checks/code-review/formal3-final-red.txt`):

```
features=1979-05-27 (TOML, [[hooks.PreToolUse]] válido ao lado)  -> configured/hooks_configured (esperado: invalid/features_hooks_flag_invalid_type)
timeout=-0 (JSON, hooks.json)                                     -> configured/hooks_configured (esperado: invalid/hooks_structure_invalid)
  (mesmos dois casos reproduzidos na fronteira da CLI: configuration-trust.cli.test.mjs)
tests 109, pass 105, fail 4
EXIT_CODE=1
```

GREEN real, mesmos quatro testes (camada pura + CLI) após a implementação, mais os existentes
preservados (saída completa em `.checks/code-review/formal3-final-green-targets.txt`):

```
node --test tests/doctor/config-projection.unit.test.mjs tests/doctor/configuration-trust.cli.test.mjs tests/doctor/config-reader.unit.test.mjs
  -> tests 128, pass 128, fail 0
EXIT_CODE=0
```

`test:doctor` completo isolado (saída em `.checks/code-review/formal3-final-doctor.txt`):

```
node --test "tests/doctor/**/*.test.mjs"
  -> tests 308, pass 307, fail 0, skipped 1
EXIT_CODE=0
```

`npm test` completo, uma única execução após as alterações finais (saída completa em
`.checks/code-review/formal3-final-npm-test.txt`):

```
  test:governance  -> tests 6,   pass 6,   fail 0, skipped 0
  test:code-review -> tests 10,  pass 10,  fail 0, skipped 0
  test:doctor      -> tests 308, pass 307, fail 0, skipped 1
EXIT_CODE=0
```

Delta de `test:doctor` contra a seção 19 (304 → 308): 4 testes novos, todos em
`config-projection.unit.test.mjs` e `configuration-trust.cli.test.mjs` — `features=1979-05-27`
(datetime TOML solto, camada pura), `timeout=-0` em JSON (camada pura, substituindo a asserção antiga
e incorreta "`-0` continua válido" do mesmo teste), `timeout=-0` em `config.toml` (caracterização de
controle: o MESMO valor continua `configured` no formato TOML, camada pura), e `timeout=-0` em
`hooks.json` na fronteira da CLI (`configuration-trust.cli.test.mjs`); o teste CLI existente de
`features=true`/`timeout=1.0` ganhou um terceiro caso (`features=1979-05-27`) sem virar um teste novo.
Paridade dos cinco arquivos comuns de `scripts/code-review/` contra a base (`4242520`) não reconferida
nesta rodada (nenhum arquivo do core foi tocado). O único skip continua
`agent-resolution-C2 realpath/symlink real … (POSIX)`.

### Limitações declaradas

- Executado só em Windows 11 Pro, Node 24.21.0. Nenhum agente, hook, intérprete, binário Rust ou script
  de instalação foi executado, importado ou alterado nesta rodada — a citação de `de.rs` vem de leitura
  de texto da fonte baixada do publisher (`.crate` do crates.io, checksum conferido contra o
  `Cargo.lock` antes da extração), nunca de uma execução do parser nativo.
- A consulta de `docs.rs`/GitHub versionado para `serde_json` 1.0.149 continua indisponível na
  ferramenta da raiz (mesma limitação registrada em `formal3-number-token-note.md`); o publisher
  crates.io supriu essa lacuna para este resíduo específico.
- `TomlDate`/`Date` é o único tipo de container TOML excluído por protótipo nesta correção; outras
  classes hipotéticas que `smol-toml` não devolve hoje (ou que outro agente/formato viesse a produzir)
  não foram enumeradas — a regra é "protótipo nulo ou `Object.prototype`", não uma lista fechada de
  exclusões.
- Não foi alterado — nem precisou ser — o `isPlainObject` duplicado em `hooks-shape.mjs` (função
  idêntica, usada para a forma de `hooks`/grupos/handlers, não para o container de `[features]`):
  nenhum caso de teste conhecido ou do probe da raiz exercita um `Date` nesse caminho (um `Date` solto
  em `hooks`/`PreToolUse` já falha por outro motivo — `Array.isArray`/forma de grupo — antes de chegar
  a `isPlainObject` ali). Ficou fora do escopo autorizado (só os dois resíduos concretos do briefing).

### Arquivos desta rodada

- Produto: `src/doctor/config-projection.mjs` (`isPlainObject` confere protótipo), `src/doctor/
  hooks-shape.mjs` (`isValidOptionalU64Field` recusa o token `"-0"`).
- Testes: `tests/doctor/config-projection.unit.test.mjs` (3 novos — datetime TOML, `-0` JSON inválido,
  `-0` TOML válido de controle —, 1 teste existente com a asserção antiga de `-0` removida/renomeado),
  `tests/doctor/configuration-trust.cli.test.mjs` (1 novo — `timeout=-0` em `hooks.json` — e 1 teste
  existente estendido com o caso do datetime TOML).
- Documentação/checklist: `docs/agent-compatibility.md` (frases "Resíduo final corrigido" aditivas nas
  células de achado 1 e 2 do Codex), `.checks/issue-3-agent-diagnostics.md` (frases "Resíduo final do
  mesmo achado" aditivas na entrada C8), esta seção.
- Evidência: `.checks/code-review/formal3-final-red.txt`, `…-green-targets.txt`, `…-doctor.txt`,
  `…-npm-test.txt`. Preservados sem alteração: `.checks/code-review/formal3-final-residuals.md`
  (encaminhamento), `.checks/code-review/probe-formal3-after-residual.txt` (probe da raiz),
  `.checks/code-review/native-codex-0.162.1/serde-json-1.0.149/src/de.rs` (fonte primária do publisher,
  já presente antes desta rodada).
