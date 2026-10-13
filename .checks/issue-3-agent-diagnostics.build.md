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
   `verified`).
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
    `launcher_not_recognized`.

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
