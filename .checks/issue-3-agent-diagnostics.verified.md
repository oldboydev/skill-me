# Issue 3 — Quinta verificação independente

**Verdict**: PASS
**Profile**: light
**Diff range**: `4242520dc6b70848bd0ac8acb7e00acdd1755c8a..aa918a5548c028cbf7f56da3958c7aeafc80cbc1`
**Fix diff**: `6d073b69351a2884d46bf6056aaf8e6ecb7574b8..aa918a5548c028cbf7f56da3958c7aeafc80cbc1`
**Round**: 5 — scoped, autorizada explicitamente pelo proprietário
**Verifier**: subagente Codex independente; Claude autor; nenhuma implementação/correção pelo Verifier.
**Checks**: 18/18 PASS. Residual C8/G3 fechado contra a restrição nativa de shell hooks.

## Autorização, escopo e proveniência

**verified at aa918a5548c028cbf7f56da3958c7aeafc80cbc1**. Autorização humana específica registrada em `.checks/issue-3-agent-diagnostics.linux.md`: “pode fazer a quinta verificação independente da issue #3 e, se passar nas revisões, abra o PR”. O FAIL4 está preservado em `c3ce992cd8ffe9eeb1e26aa86db20771baa1a3f6`; o produto foi corrigido por Claude em `7f4eecbe5d082f98998f3363413cb4a6103bedef`. Esta autorização não inicia rodada6 nem altera silenciosamente o teto formal. Não executei review:run, commit, push ou PR.

Li o fix diff completo de produto/provas, incluindo o helper compartilhado e documentação, não apenas o resumo do autor. Reavaliei C8 e o alcance em C5/C6/C11/C12/C14/C15/C16/C17/C18: extrator textual reutilizado para a tabela de exclusão, propagação pelo coordenador, configuração/trust, renderer/envelope, leitura limitada e snapshot, origem e docs. As 17 conclusões PASS da rodada4 carregam sua proveniência; as atingidas recebem nova avaliação abaixo. Todas as provas foram novamente executadas na HEAD exata. Build e resultados do autor são self-report.

**carried from 6d073b69351a2884d46bf6056aaf8e6ecb7574b8**: leitura de AGENTS/task, intenção dos seis ACs da issue e decisões anteriores não alteradas. Rastreio preservado: AC1 C1–C4; AC2 C5–C6; AC3 C7–C8; AC4 C9–C10; AC5 C11–C14; AC6 C15–C17. O guia Downloads permanece não vinculante. Nenhuma mudança de critério foi usada para aprovar a correção.

## Fontes primárias

**verified at aa918a5**:

- `C:/Users/paulo/AppData/Local/hermes/hermes-agent/agent/shell_hooks.py:211`–236, lido somente como texto: :220–223 recusa evento de SHELL_UNSUPPORTED_HOOKS antes do teste VALID_HOOKS :224–230. Isso rege configuração de shell, não o catálogo geral de plugins.
- Mesmo pacote, `hermes_cli/plugins.py:108` e :208. Leitura textual independente nesta rodada: 41 eventos VALID_HOOKS; SHELL_UNSUPPORTED_HOOKS contém exatamente transform_api_error_classification, também presente na tabela geral.
- `src/doctor/contract-evidence.mjs:97/:147`: mesmo extrator léxico e mesmo texto limitado da fonte ligada ao launcher; exclusão ilegível/não reconhecida resulta null, sem inventar conjunto vazio. `run-diagnostics.mjs:45`–48 propaga o conjunto. `config-reader.mjs:187`–201 filtra somente configuração shell; C5 conserva a decisão por mecanismo do catálogo geral.

**carried from 6d073b69**, fontes previamente abertas e não alteradas:

- [Codex hook_config.rs, tag rust-v0.162.1](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/config/src/hook_config.rs), blob7575fa5fcb1042cc380812308f62b8378540ad2a: matcher Option<String> :154–159; async bool :171–172; input Map/desserializador :190–191/:203–215. G1/G2 corrigidos conforme esses tipos.
- [Claude Hooks](https://code.claude.com/docs/en/hooks), [Codex Hooks](https://learn.chatgpt.com/docs/hooks), [Hermes Hooks](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks) e documentação local Hermes, lidas nas rodadas anteriores. As linhas alteradas de docs/agent-compatibility.md foram relidas nesta rodada.

Fontes Python foram lidas como dados; não foram importadas ou executadas. A reprodução com arquivo nativo copiado para instalação sintética prova a decisão da CLI sobre esse contrato, não certifica a configuração da máquina real nem captura E2E.

## Provas independentes na HEAD atual

**verified at aa918a5**. Original começou com HEAD aa918a5 e porcelain vazio. Archive da HEAD exata extraído em TEMP; node_modules copiado; todos os targets completos executados na cópia, uma invocação por target. Escalonamento restrito aos repositórios temporários dos testes de governança/motor, que escrevem sua própria .git/config; original somente leitura. Windows Node v24.21.0/npm11.19.0.

| Target executado pelo Verifier | Resultado observado |
| --- | --- |
| npm run test:governance | 6 testes, 6 PASS, 0 FAIL, 0 skip, exit0 |
| npm run test:code-review | 10 testes, 10 PASS, 0 FAIL, 0 skip, exit0 |
| npm run test:doctor | 252 testes, 251 PASS, 0 FAIL, 1 skip, exit0 |

**267 PASS, 0 FAIL, 1 skip; 268 testes contabilizados**. O runner nomeou individualmente os testes. As três novas provas CLI, quatro provas de configuração na própria camada e duas de extração executaram, incluindo:

- configuration-trust-C8/G3 Hermes: único handler Python-plugin-only (transform_api_error_classification) fica not_configured/hooks_event_shell_unsupported no relatório real, nunca configured.
- configuration-trust-C8/G3 Hermes: evento Python-plugin-only ao lado de um evento shell real continua configured.
- configuration-trust-C8/G3 Hermes: SHELL_UNSUPPORTED_HOOKS não reconhecida/ausente fica unknown/hooks_shell_exclusion_unavailable, nunca configured.
- config-reader-G3 Hermes: único handler cujo evento é Python-plugin-only (SHELL_UNSUPPORTED_HOOKS) fica not_configured/hooks_event_shell_unsupported, nunca configured.
- config-reader-G3 Hermes: evento shell-unsupported ao lado de um evento shell aceito continua configured.
- config-reader-G3 Hermes: catálogo bate mas tabela de exclusão de shell não reconhecida (null) fica unknown/hooks_shell_exclusion_unavailable, sem presumir conjunto vazio.
- config-reader-G3 Hermes: evento fora de VALID_HOOKS preserva hooks_event_not_in_installed_catalog mesmo sem tabela de exclusão de shell.
- contract-evidence-C5/G3 SHELL_UNSUPPORTED_HOOKS reconhecida ao lado de VALID_HOOKS, sem afetar mechanisms.
- contract-evidence-C5/G3 SHELL_UNSUPPORTED_HOOKS ausente, ilegível ou não reconhecida vira shellUnsupportedHooks null, sem derrubar o state found de VALID_HOOKS.

Nomes e corpos localizados com rg, asserções inspecionadas; seleção vazia não foi aceita. Os targets completos também nomearam as provas C1–C18 citadas abaixo, inclusive antigas regressões G1/G2/G4. Skip único: agent-resolution-C2 realpath/symlink real liga o launcher do Codex ao pacote (POSIX), tests/doctor/agent-resolution.unit.test.mjs:443, condicionado ao Windows.

Complemento **do orquestrador/autor, não execução do Verifier**: .linux.md registra Linux268PASS/zeroSKIP e Windows267PASS/1skip no produto7f4eecb. Não substitui minhas provas na HEAD aa918a5. Sem observação independente de macOS ou CI remota.

## Reprodução independente do residual G3

**verified at aa918a5**. Em outro archive da HEAD, importei somente módulos doctor/helpers e li o plugins.py realmente instalado. Afirmei que o evento está nas duas tabelas. Copiei esse texto para o pacote Hermes0.21.4 ligado ao launcher da fixture; executei a CLI real com PATH/HOME/USERPROFILE/LOCALAPPDATA/HERMES_HOME controlados e --cwd no scratch. Nenhum Python, handler ou agente executado. Sentinela de execução habilitada permaneceu ausente.

| Entrada de config/fonte | Resultado efetivamente observado |
| --- | --- |
| Único transform_api_error_classification com command, fonte nativa completa | exit0, complete, version0.21.4, not_configured/hooks_event_shell_unsupported, trust not_applicable |
| Mesmo evento ao lado de pre_tool_call com command, fonte nativa completa | exit0, complete, configured/hooks_configured, trust unknown |
| pre_tool_call com command; fonte nativa com a única atribuição da tabela de exclusão removida | exit0, partial, unknown/hooks_shell_exclusion_unavailable, trust unknown |

Nos três processos: cinco linhas cli_local support verified e runtimeVerification not_performed; sentinela ausente; NATIVE_PROBE_EXIT=0. Asserções exatas sobre estado, motivo, versão, trust, contagem5 e todo runtime não executado passaram. Isso fecha o falso configured anterior sem degradar o contrato C5 de plugins. Catálogo geral ausente ou não reconhecido ainda é unknown; evento fora do catálogo ainda é not_configured, conforme provas novamente executadas.

G1 async/input null inválidos, G2 matcher null válido e G4 prefixo estrangeiro (incluindo absoluto sem X.Y) permanecem **carried from 6d073b69**; suas regressões rodaram novamente. G3 evento desconhecido/catálogo ausente e residual Python-only estão fechados. Não ampliei a investigação para novas classes ou trabalho fora do escopo.

## C1–C18

Todas as localizações de teste abaixo têm prefixo tests/doctor/, salvo scripts/governance-ci.test.mjs. C = **carried from 6d073b69351a2884d46bf6056aaf8e6ecb7574b8**, com prova completa novamente executada nesta HEAD. V = **verified at aa918a5548c028cbf7f56da3958c7aeafc80cbc1**, incluindo reavaliação do alcance do diff. Cada linha contém a asserção relevante, não somente um resultado agregado.

| Check | Prova executada e asserção localizada | Resultado |
| --- | --- | --- |
| C1 três agentes/ausência/ordem | presence-C1; presence.cli.test.mjs:49 `assert.equal(report.agents.length, 3)`; :55–57 `assert.equal(agent.presence, "absent")`, version null e executable_not_found. Ordem literal preservada na camada. | C PASS |
| C2 caminho/versão por SO | agent-resolution/presence-C2; agent-resolution.unit.test.mjs:143/:148/:153 `assert.equal(claude.version, "2.1.295", platform)`, codex0.162.1/hermes0.21.4; :720/:761 `assert.equal(result.packageDir, "/b/lib/python3.12/site-packages/hermes_cli")`; npm local :594–599. | C PASS |
| C3 ilegível/ambíguo inconclusivo | presence-C3; presence.cli.test.mjs:191–193 `assert.equal(hermes.presence, "present")`, `assert.equal(hermes.version, null)`, reason version_source_ambiguous; unit :774–793 prefixo B ausente/ambíguo sem fallback. | C PASS |
| C4 leitura/zero execução | presence-C4; presence.cli.test.mjs:315 `assert.throws(() => statSync(sentinelPath))`; :318 `assert.deepEqual(snapshotAfter, snapshotBefore)`. Nova extração só lê texto; probe nativo sentinela false. | C PASS; preservação também conferida nesta rodada |
| C5 contrato por mecanismo | capability-evidence-C5; capability-evidence.cli.test.mjs:148–150 `assert.equal(row.support, "verified", row.mechanism)`, local_contract_lists_events/not_performed. contract-evidence.unit.test.mjs:163–168 `assert.equal(result.state, "found")`, exclusão exata e missingEvents[]; :178–192 state found com exclusão null. | V PASS; C5 plugin preservado |
| C6 suporte/config/runtime distintos | capability-matrix-C6; capability-matrix.unit.test.mjs:110–114 configuration independente e `assert.equal(row.runtimeVerification, "not_performed")`; :121 `assert.ok(matrix.every((row) => row.runtimeVerification === "not_performed"))`. Probe reforça com contrato verified. | V PASS |
| C7 matriz e exclusão correta | capability-matrix/evidence-C7; capability-matrix.unit.test.mjs:125–138 listas literais5×4; :174–177 `assert.equal(row.support, "unverified")`, surface_not_inspected e `assert.equal(row.exclusion, null)` cloud. capability-evidence.cli.test.mjs:92–105 hosted separado/documented_contract/sourceURL. | C PASS |
| C8 config nativa/trust | configuration-trust-C8/G3; configuration-trust.cli.test.mjs:553–556 `assert.equal(hermes.configuration, "not_configured")`, hooks_event_shell_unsupported/not_applicable; :588–589 configured/hooks_configured misto; :618–623 partial/unknown/hooks_shell_exclusion_unavailable/trustunknown. config-reader.unit.test.mjs:379–382/:423–426 mesma decisão na camada; :447–448 evento fora do catálogo. Controles configured/trusted :156–158; G1/G2 continuam executados. | V PASS; residual G3 fechado |
| C9 coletor sem falsa identidade | collector-C9; collector.cli.test.mjs:31–32 `assert.equal(report.collector.status, "reachable")`, `assert.equal(report.collector.identityVerified, false)`; :48/:50 unreachable/false; :71–72 IPv6. | C PASS |
| C10 limite/endpoint/incerteza | collector-C10; collector.cli.test.mjs:86–87 unknown/endpoint_not_provided; :127 `assert.equal(status, 2, endpoint)`. collector-probe.unit.test.mjs:65–69 unreachable/connection_timeout, elapsed>=990 e <3000; :84 aborted true. | C PASS |
| C11 paridade texto/JSON | envelope-C11; envelope.cli.test.mjs:32–34 JSON único/semANSI; :86–117 processos reais com mesmos fatos. render-text.unit.test.mjs:183 `assert.ok(block.includes(row.evidence.source.path))`; :185/:188 eventos/missingEvents no texto; nova configuration-trust.cli.test.mjs:560/:627 texto contém motivo específico. | V PASS |
| C12 envelope/status/exits | envelope-C12; envelope.cli.test.mjs:182–184 `assert.equal(status, 0)`, schemaVersion1/complete; :205–209 partial preserva3agentes/Codexpresent; configuração nova :618 `assert.equal(report.status, "partial")`; envelope-failure.unit.test.mjs:15–17 complete0/partial0/failed1. | V PASS |
| C13 quatro flags | envelope-C13; envelope.cli.test.mjs:252–254 exit0 e `for (const flag of ["--json", "--cwd", "--collector", "--help"]) assert.match(...)`; :273 `assert.equal(status, 2)` cwd inválido; :285 flags de reparo exit2. | C PASS |
| C14 limite/zero conteúdo privado | leak-C14; leak-and-limits.cli.test.mjs:48–54 `assert.doesNotMatch(jsonRun.stdout, new RegExp(CANARY))` e stderr/JSON/texto; :111–113 unknown/input_too_large e marker ausente. Extrator novo reaproveita leitura limitada1MiB; exclusão projeta estado/motivo, nenhum comando. | V PASS |
| C15 snapshot/concorrrência/mutação | snapshot-C15; snapshot-concurrency.cli.test.mjs:56 `assert.deepEqual(stripTimestamp(reportA), stripTimestamp(reportB))`; :59 `assert.deepEqual(after, before)`. mid-read-mutation.unit.test.mjs:134–135/:166/:199/:225/:263 config/wrapper/versão changed. contract-evidence.unit.test.mjs:234 `assert.equal(changed.state, "changed_during_read")`. | V PASS; citação atualizada |
| C16 provas/origens/lacunas | presence-C16; presence.cli.test.mjs:292 `assert.equal(row.reasonCode, "version_profile_incompatible", row.mechanism)`. configuration-trust.cli.test.mjs:185–190 diretório inacessível e demais preservados. capability-evidence.cli.test.mjs:333 `assert.equal(nonLocal.length, 45)`; :350 `assert.doesNotMatch(stdout, /origem: fixture/)`. Inventário dos3SOs e nova fixture nativa executados, sem certificação real. | V PASS |
| C17 documentação honesta | docs-C17; docs-compatibility.test.mjs:14 `assert.match(readme, /npm run --silent doctor -- --json/)`; :15–17 partial/unverified/identityfalse; :40–42 `assert.match(doc, /contrato documentado/i)` e inspeção estática/execução real. Diff relido descreve exclusão shell separada, sem afirmar captura. | V PASS |
| C18 governança/core/CI | governance-C1/C3 e todos10motor; scripts/governance-ci.test.mjs:263–267 matriz literal ubuntu22.04/windows-latest/macos14; :269–277 `assert.deepEqual(..., ["npm ci --ignore-scripts", "npm run test:governance", "npm run test:code-review", "npm run test:doctor"])`. Cinco hashes base=HEAD abaixo. | V PASS |

## Perfil, níveis e limitações

Profile light mantido. **Fault injection/mutação de produto não realizada**; join formal Coverage/Test policy e comparação visual ui não aplicáveis ao perfil. Não aumentei o rigor silenciosamente. Swept sem linhas classificadas existing e ausência de CONTRIBUTING **carried from 6d073b69**; demais Swept remetem aos critérios, não a comportamento presumido.

Gaps de nível/amostragem declarados continuam sem alegação maior: EACCES por adaptador; política em caminho fixo; timeout com connect simulado e relógio real; erro interno exit1 provado na função pública usada pela CLI, não falha real do subprocesso; inacessibilidade CLI via diretório (não alego chmod nativo). Cenários por platform/FS em memória não certificam três SOs. Sem captura E2E, handler real, IPC, payload/transcript, certificação IDE/desktop/cloud, CI remota ou macOS observado. Contato TCP prova disponibilidade, não identidade; zero payload também foi inspecionado no código, sem alegar medição de bytes inexistente.

O extrator reconhece um literal único de conjunto de strings no nível do módulo; fonte com forma não reconhecida permanece inconclusiva. Assume os contratos nativos da instalação textual vinculada à versão; não executa nem avalia Python arbitrário. A tabela geral sustenta contrato de plugin, a exclusão separada restringe somente shell. O caso nativo omitido antes agora é coberto nas duas camadas e pela reprodução independente. Não há gap bloqueante remanescente dentro do escopo revisto.

## Preservação

**verified at aa918a5**. Archives base/head independentes usados para SHA256; todas as comparações True; git diff --exit-code base -- cinco arquivos retornou0. Core byte-igual:

| Arquivo scripts/code-review | SHA256 base = HEAD |
| --- | --- |
| cli.mjs | D69974087A3B43FCCF482E5F5B56C19F96FED60652B8985E7A9C298F061AE61E |
| review.mjs | 88508699ED5AB33F81BA438E229CD1A5DA3DE71FCD0EFFCFBD162CF7CF0E0CB6 |
| review.test.mjs | 67247DB5701B1F71337D428BF0103B5BFA0435E5EF85C53E5A93D73E5D21D621 |
| schema.json | A11E040A7061447C1E0D516E31919DA0D2821E012C6C44F27A56634228C6A467 |
| README.md | 5F1998DB4621A09396920C37DC8AA4267C4DEF33F028F9945EF717DB8E8C0064 |

Antes do relatório: HEAD aa918a5548c028cbf7f56da3958c7aeafc80cbc1 e porcelain vazio. Depois de salvar, HEAD reconferida idêntica e porcelain somente M .checks/issue-3-agent-diagnostics.verified.md. Nenhum produto/teste/task/checklist/AGENTS/config/core, .git, estado/resposta formal ou log do orquestrador alterado; sem stash, commit, push, PR ou instalação. Escritas isoladas limitaram-se a archives, dependências copiadas, fixtures e repositórios dos testes.

## Gate

**PASS — 18/18 checks; 267 PASS, 0 FAIL, 1 skip** na execução independente desta HEAD. G1–G4 fechados; residual G3 comprovado contra fonte nativa e CLI. Nenhuma mutação obrigatória em light. Este é o gate do Verifier; revisão formal e entrega permanecem com o orquestrador. Rodada5 encerrada, sem iniciar rodada6.
