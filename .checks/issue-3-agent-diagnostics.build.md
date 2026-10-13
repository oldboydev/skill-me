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
