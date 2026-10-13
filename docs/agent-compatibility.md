# Compatibilidade de agentes — diagnóstico local (doctor)

Este documento separa três camadas de evidência para cada fato usado pelo
`doctor` (issue #3): **contrato documentado** (o que a fonte oficial declara),
**inspeção estática** (o que o `doctor` lê de artefatos/config locais, sem
executar o agente) e **execução real** (comportamento observado rodando o
agente de verdade). Esta entrega só produz as duas primeiras; a coluna de
execução real está vazia por desenho — `runtimeVerification` é sempre
`not_performed` (critério 6).

## Fonte, data de consulta e lacunas por agente

| Agente | Fonte | Data de consulta | Versão/superfície aplicável | Evidência obtida (inspeção estática) | Lacuna |
| --- | --- | --- | --- | --- | --- |
| Claude Code | [Settings files and precedence](https://code.claude.com/docs/en/settings) | 13/10/2026 | CLI local, `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, managed settings | Precedência (gerenciado > CLI > projeto local > projeto compartilhado > usuário); `CLAUDE_CONFIG_DIR` substitui `~/.claude` inteiro | Confiança de workspace ("trust this folder") não tem caminho estático documentado; `doctor` nunca afirma `trust` para Claude além de `unknown` |
| Claude Code | [Hooks](https://code.claude.com/docs/en/hooks) | 13/10/2026 | Chave `hooks` nos mesmos arquivos de settings | `disableAllHooks`, `allowManagedHooksOnly`: booleans reais, lidos pelo `doctor`; não existe `hooks.yaml` nem `hooks.enabled` genérico | `allowManagedHooksOnly` bloqueia hooks não gerenciados, mas o `doctor` não sabe dizer quais hooks específicos são "force-enabled" por um plugin gerenciado |
| Claude Code | [Managed settings](https://code.claude.com/docs/en/managed-settings) | 13/10/2026 | `managed-settings.json` em caminho fixo do SO | macOS `/Library/Application Support/ClaudeCode/`, Linux/WSL `/etc/claude-code/`, Windows `C:\Program Files\ClaudeCode\` (não o `ProgramData` legado) | Arquivo ilegível (permissão) faz o `doctor` devolver `unknown/policy_precedence_undetermined` em vez de supor qualquer precedência |
| Codex CLI | [Hooks](https://learn.chatgpt.com/docs/hooks) e [config-basic](https://learn.chatgpt.com/docs/config-file/config-basic) | 13/10/2026 | CLI local, `~/.codex/hooks.json` ou `[hooks]` em `~/.codex/config.toml`; mesmos nomes em `<repo>/.codex/` | `CODEX_HOME` substitui `~/.codex`; `[features]\nhooks = false` desliga hooks (chave real, alias depreciado `codex_hooks`); a *lista de handlers* definida em `[hooks]`/`hooks.json` é aditiva entre camadas, mas o escopo de **projeto** só é efetivo se o projeto for confiável — algo que o `doctor` não determina por leitura estática. Essa aditividade não se estende à própria `features.hooks`: ela não é um OR de "false" entre escopos. Por isso **qualquer** valor explícito de `features.hooks` (`true` OU `false`) em escopo de **projeto** vira `unknown/policy_precedence_undetermined` — um `true` de projeto poderia sobrepor um `false` de usuário se o projeto fosse confiável, e o inverso também depende dessa confiança indeterminada; só a ausência da chave em projeto deixa a pergunta em aberto. O mesmo valor no escopo de **usuário** (sem gate de confiança de projeto) continua resolvendo de verdade: `false` vira `disabled/features_hooks_disabled` | Hooks de projeto só ativam com `.codex/` confiável; o `doctor` não determina esse estado de confiança por leitura — fica fora do relatório, não inferido como `trusted` nem como `disabled` |
| Codex CLI | [Hooks](https://learn.chatgpt.com/docs/hooks) | 13/10/2026 | Revisão/confiança por hash de hook (`/hooks`); hooks geridos via `requirements.toml`/`managed_dir` | — | Não há caminho de arquivo fixo e documentado para o armazenamento dessa revisão nem para `requirements.toml`; por isso `trust` do Codex fica sempre `unknown` nesta entrega, nunca `trusted` por suposição |
| Hermes | [Configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration) e instalação local inspecionada (`hermes_constants.py`, `_get_platform_default_hermes_home`/`get_hermes_home`) | 13/10/2026 | CLI local, `~/.hermes/config.yaml` (POSIX) | `HERMES_HOME` substitui o default nativo; no Windows o default real (confirmado por inspeção estática do pacote instalado, não pela documentação pública — ausência de menção lá não prova ausência do comportamento) é `%LOCALAPPDATA%/hermes`, com fallback para `<HOME>/AppData/Local/hermes` quando `LOCALAPPDATA` está vazio | A documentação pública não descreve esse default do Windows; o `doctor` o segue mesmo assim, por evidência de código local, sem fixar um caminho de máquina específica |
| Hermes | [Hooks](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks) | 13/10/2026 | Bloco `hooks:` (shell hooks) dentro de `config.yaml`; chave `hooks_auto_accept` | `hooks_auto_accept: true` é a única origem nativa de confiança lida nesta entrega (`trust: trusted`, motivo `hooks_auto_accept_enabled`); ausência ou `false` fica `unknown`, nunca inferida como recusa | `~/.hermes/shell-hooks-allowlist.json` registra aprovações por comando, mas seu schema exato não foi confirmado — o `doctor` não tenta lê-lo nesta entrega |
| Hermes | [Hooks](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks) | 13/10/2026 | Hooks de gateway (`~/.hermes/hooks/<nome>/HOOK.yaml`+`handler.py`) | Mecanismo "trusted-by-placement", distinto dos shell hooks de `config.yaml` | Fora do escopo desta entrega: não é o mecanismo usado pela matriz de capacidades (issue #4 cobre execução) |

## Launchers e fonte de versão (critério 2-3)

| Agente | Convenção real do launcher | Fonte de versão | Vínculo exigido pelo `doctor` |
| --- | --- | --- | --- |
| Claude | binário nativo (`claude`/`claude.exe`) | `binary_metadata` (VS_FIXEDFILEINFO de um recurso PE) | Estrutura do próprio binário; nunca iniciado |
| Codex | shim gerado pelo npm (`node_modules/.bin/codex`, symlink global ou `.cmd` no Windows) | `package_metadata` (`package.json` de `@openai/codex`) | O shim precisa referenciar o pacote (por `realpath`/symlink real ou por caminho relativo embutido no próprio texto do shim); um `package.json` apenas vizinho, sem essa referência, não é aceito (`launcher_not_recognized`) |
| Hermes | console-script de pip/venv: `<venv>/bin/hermes` no POSIX; no Windows o launcher real é `hermes.exe` (executável compilado pelo pip, confirmado em instalação real — `.cmd` é mantido como candidato secundário só para layouts que produzam um shim de texto) | `source_literal` (`__version__` em `hermes_cli/__init__.py`) | O pacote precisa estar no layout padrão do venv (`lib/pythonX.Y/site-packages` ou `Lib\site-packages`), não apenas ao lado do launcher. Um `hermes.exe` compilado real não é um script de texto: a presença é reconhecida (`presence: present`), mas a ligação por `source_literal` não é demonstrável a partir dos bytes desse executável — `version` fica `null`/`launcher_not_recognized`, o que é um resultado válido (critério 3), não uma falha |

## Estados e vocabulário (critérios 5-12)

- `support`: `verified` exige versão compatível com um perfil examinado nesta
  entrega (Claude 2.1.295, Codex 0.162.1, Hermes 0.21.4) e evidência local
  vinculada ao artefato — não documentação isolada, nem uma versão mais nova
  por suposição.
- `configuration`/`trust`: estados observados de leitura, nunca autorização
  concedida pelo `doctor`. Um campo arbitrário dentro do próprio arquivo de
  hooks (ex.: alguém escrever `"trust": "trusted"` no mesmo JSON/YAML) nunca
  é aceito como consentimento nativo — só a origem `hooks_auto_accept` do
  Hermes, lida por um leitor dedicado e validado contra uma lista reconhecida,
  pode produzir `trusted`.
- `runtimeVerification`: sempre `not_performed` nesta entrega — contrato
  documentado e inspeção estática nunca substituem execução real.

## Limites desta entrega

Correlacionar eventos, medir cobertura em produção ou confirmar que um hook
realmente dispara em uma sessão real são tarefas das issues #4-#8. Este
documento registra apenas o que foi lido/consultado em 13/10/2026 e o que
permanece como lacuna.
