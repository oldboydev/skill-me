# Issue 3 — Sétima verificação independente

**Verdict**: PASS
**Profile**: light
**Diff range**: `4242520dc6b70848bd0ac8acb7e00acdd1755c8a..5c39d081874de743a2152babb68d4f6463902173`
**Fix diff**: `9f98068548b33e6aca43fe07dbee8aff2c115aeb..5c39d081874de743a2152babb68d4f6463902173`
**Round**: 7 — scoped
**Verifier**: Codex independente; Claude autor; nenhuma implementação pelo Verifier.
**Checks**: 18/18 PASS. Quatro achados formal3 e variantes relacionadas fechados no escopo revisto.

## Escopo e herança

**verified at 5c39d081874de743a2152babb68d4f6463902173**. Autorização “pode fazer as revisoes necessarias” em `.checks/issue-3-agent-diagnostics.linux.md`; a mesma autorização cobre esta rodada. Li task/checklist, fix diff completo de produto/testes/documentação/evidências, AGENTS e instruções TLC light já abertas na rodada6. Task/AGENTS não mudaram. O override formal max4 está restrito à issue3; perfis comuns continuam max2. Não executei review:run, commit, push ou PR.

**carried from 3eae39f199642146b2c3b53ddef3689e6b8ad4ce**, PASS6 preservado em `9f98068548b33e6aca43fe07dbee8aff2c115aeb`: intenção/seis ACs da issue efetivamente consultados naquela rodada, fontes e conclusões não tocadas; guia Downloads não vinculante. Herança anterior permanece rastreável pelo PASS6 (PASS5 em aa918a5/fd4258f). Não usei o PASS6 para aprovar o produto corrigido posteriormente.

Reavaliei C3/C8/C11/C12 e alcance compartilhado C2/C4/C6/C14/C15/C16/C17/C18: resolução de pacote; projeção por agente; contêiner/entradas features; tipo lexical e precisão de inteiros JSON/TOML; faixa TOML global; grupos grandes; integração, renderização, vazamento, snapshot e docs. As citações dos quatro arquivos de testes tocados foram atualizadas. Os outros checks carregam análise anterior explicitamente, com todas as provas novamente executadas na HEAD atual.

## Provas nesta HEAD

**verified at 5c39d08**. Original: HEAD indicada, porcelain vazio. Archive exato extraído em `.checks/code-review/verifier7/head`, node_modules copiado, sem instalação. Executei **uma invocation `npm test` completa** na cópia isolada, com escalonamento aprovado para os repositórios temporários dos testes de governança/motor (necessidade já demonstrada na rodada6). Windows Node24.21.0/npm11.19.0.

| Target da invocation completa | Resultado observado |
| --- | --- |
| test:governance | 6 PASS, 0 FAIL, 0 skip |
| test:code-review | 10 PASS, 0 FAIL, 0 skip |
| test:doctor | 319 testes, 318 PASS, 0 FAIL, 1 skip |

**334 PASS, 0 FAIL, 1 skip; 335 testes contabilizados; exit0.** Log ignorado `.checks/code-review/verifier7/npm-test.txt` nomeia cada teste individualmente. Confirmei existência e execução das provas C1–C18, buscando nomes e expressões de asserção com rg; não aceitei seleção vazia. Novos casos aparecem individualmente: metadado null/primitivo/controle (:62–64); mapa features (:148–150); extremos/tokens/faixa global/profundidade (:196–207); grupos grandes (:211–214); CLI listas/tokens/projeção compartilhada (:276–280). Suite verde não repetida.

Skip único: `agent-resolution-C2 realpath/symlink real liga o launcher do Codex ao pacote (POSIX)`, `tests/doctor/agent-resolution.unit.test.mjs:492`, condicionado a Windows. Linux335PASS/zeroSKIP registrado pelo orquestrador no produtof71a7ce é complementar, não execução deste Verifier; macOS/CI remota não observados.

Para fechar a fronteira CLI do achado de metadado null, executei adicionalmente só esse cenário do probe existente, copiado/selecionado no scratch e acrescido de asserções exatas (não uma nova suíte). `.checks/code-review/verifier7/head/.checks/code-review/probe-package-null.mjs:39`: exit0, complete, 3 agentes, Codex present/versionnull/launcher_not_recognized, sentinela ausente e canário ausente. Resultado independente em `verifier7/package-null-cli.txt`. O probe rodou contra a CLI da cópia exata, com instalação sintética; não certifica a máquina real.

Li RED/GREEN das seções18–22 do build, mas **não executei a versão anterior** nesta rodada. Não reivindico o RED do autor como minha execução. Os demais17probes do orquestrador também não são meus testes; o PASS abaixo se apoia na invocation completa, nas asserções inspecionadas e na reprodução CLI acima.

## Fontes e decisões corrigidas

**verified at 5c39d08**. Fontes nativas cached lidas apenas como texto; nenhum Rust compilado/executado. Confirmei blobs de hook_config.rs `7575fa5fcb1042cc380812308f62b8378540ad2a`, features/lib.rs `c68bc3bb748982281b62ce82b664c646e6bb4c7b` e loader/layer_io.rs `1f6bf6b92d682e9fe3ff6d3b1be1bc560f0a121c` por git hash-object. Fontes anteriores não tocadas são **carried from 3eae39f**.

| Fonte aberta | Decisão conferida |
| --- | --- |
| [FeaturesToml, Codex0.162.1](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/features/src/lib.rs) :838–871 | Struct exige tabela; os13 campos nomeados ficam fora da regra bool; demais entradas achatadas são BTreeMap<String,bool>, incluindo chave desconhecida. Data/escalar não é tabela. Regra só do Codex |
| [HookHandlerConfig](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/config/src/hook_config.rs) :169–191 | Timeout Option<u64> em Command/McpTool; additionalContextLimit Option<usize> em Command; ausência/null continuam válidos |
| serde_json1.0.149/src/de.rs :509–526; serde_core1.0.228/src/de/impls.rs :437–447 e de/mod.rs :1494–1498 | Token decimal/exponencial ou -0 passa por F64; visitor u64/usize não aceita float. JSON1 e JSON1.0 não são o mesmo tipo nativo |
| [Codex loader/layer_io.rs](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/config/src/loader/layer_io.rs) :149–165; toml0.9.11/src/value.rs :425–446 | Carregador decodifica documento inteiro em TomlValue; Value::Integer é i64 e visit_u64 acima do teto falha. Faixa global [-2^63,2^63-1] precede campos tipados |
| toml0.9.11/src/de/deserializer/value.rs | Deserializer genérico tipado também possui caminho u64; não confundi sua capacidade com o pipeline específico via TomlValue |

Recalculei SHA256 dos três arquivos `.crate` e comparei às entradas abertas de Cargo.lock: serde_core1.0.228 `41d385c7d4ca58e59fc732af25c3983b67ac852c1a25000afe1175de458b67ad`; serde_json1.0.149 `83fc039473c5595ace860d8c4fafa220ff474b3fc6bfdb4293327f1a37e94d86`; toml0.9.11+spec-1.1.0 `f3afc9a848309fe1aaffaed6e1546a7a14de1f935dc9d89d32afd9a44bab7c46`. Todos iguais aos checksums do lock da fonte nativa.

Precisão JSON preservada pelo texto do token no reviver do Node24: u64MAX válido e u64MAX+1 inválido não são comparados como o mesmo double arredondado. TOML usa integersAsBigInt para preservar magnitude e distinguir float; scanner iterativo aplica i64 a todo documento. Os dois spreads sujeitos ao limite de argumentos viraram laços. Features fica inteiro no ramo Codex, preservando Claude/Hermes. Não houve dependência nova nem execução de hook.

## C1–C18

Prefixo dos testes abaixo: `tests/doctor/`. C = **carried from 3eae39f199642146b2c3b53ddef3689e6b8ad4ce**, análise herdada/prova reexecutada; V = **verified at 5c39d081874de743a2152babb68d4f6463902173**, alcance reavaliado. Todas as provas nomeadas executaram na invocation acima, exceto o skip declarado.

| Check | Prova executada / asserção localizada | Resultado |
| --- | --- | --- |
| C1 presença/ordem | presence-C1, presence.cli.test.mjs:49 `assert.equal(report.agents.length,3)`; :55–57 presenceabsent/versionnull/executable_not_found | C PASS |
| C2 caminho/versão | agent-resolution-C2, agent-resolution.unit.test.mjs:143/:148/:153 versões2.1.295/0.162.1/0.21.4; novo controleformal3-1 :408–409 `assert.equal(result.version,"0.162.1")` e package_metadata; vínculoHermes :769 packageDirliteral | V PASS; skipPOSIX declarado |
| C3 metadado/presença | agent-resolution-formal3-1, agent-resolution.unit.test.mjs:385–386 versionnull/launcher_not_recognized para null/primitivos/array; :396–398 `assert.equal(codex.presence,"present")`, versionnull/motivo. Probe CLI :39 afirma os mesmos campos/3agentes/exit0. EACCES :208–209 continua unknown/EACCES | V PASS |
| C4 leitura/preservação | presence-C4, presence.cli.test.mjs:315 `assert.throws(()=>statSync(sentinelPath))`; :318 `assert.deepEqual(snapshotAfter,snapshotBefore)`; novo probe sentinelaausente; scanners novos sem efeitos | V PASS |
| C5 contrato/evidência | capability-evidence-C5, capability-evidence.cli.test.mjs:148 `assert.equal(row.support,"verified",row.mechanism)`; :150 runtime not_performed. Fonte ausente/versionnull permanece inconclusiva | C PASS |
| C6 três estados separados | capability-matrix-C6, capability-matrix.unit.test.mjs:110 configuration; :111–114 `assert.equal(row.runtimeVerification,"not_performed",...)`; :121 toda matriznot_performed | V PASS |
| C7 matriz/exclusões | capability-matrix-C7, capability-matrix.unit.test.mjs:125–138 listasliterais5×4; :174 unverified e :177 exclusãonullcloud; hosted separado/documentado | C PASS |
| C8 configuração/trust | config-projection-C8: config-projection.unit.test.mjs:236–238 invalid/features_hooks_flag_invalid_type/fields{} para entrada desconhecida; :392–424 bool/dateinvalid e tabela vaziaconfigured; :1116–1154 rawJSONu64MAXconfigured/acimainvalid em Command/McpTool/usize; :1179–1197 TOMLi64MAXconfigured/acimaconfig_malformed; :1220–1255 float/expoente/-0JSONinvalid; :1264 -0TOMLconfigured; :1297–1326 faixa global/controles. CLI configuration-trust-C8 :892–908 invalid/config_malformed/partial/3agentes/trustunknown e texto; :1160–1165/:1189–1194 tokensinvalid e mesmo motivo no texto. Reader :246–248 mapa de projetoinvalid/semtrusted | V PASS |
| C9 alcance/identidade | collector-C9, collector.cli.test.mjs:31–32 reachable/`identityVerified===false`; :48/:50 unreachable/false; :71–72 IPv6 | C PASS |
| C10 entrada/timeout | collector-C10, collector.cli.test.mjs:86–87 unknown/endpoint_not_provided; :127 `assert.equal(status,2,endpoint)`; collector-probe.unit.test.mjs:65–69 connection_timeout, elapsed>=990 e <3000 | C PASS |
| C11 paridade | envelope-C11, envelope.cli.test.mjs:32 JSONúnico/:34 semANSI e :101–118 motivos/origem/fonte/eventos no texto. Novas CLI :897/:907 config_malformedJSON/texto; :1190/:1194 hooks_structure_invalidJSON/texto; :1134–1135 listaexit0/motivo no texto | V PASS |
| C12 parcial/isolamento/exits | configuration-trust-C12, configuration-trust.cli.test.mjs:1117–1131 `assert.equal(status,0)`, partial/3agentes/Codexinvalid/demaisnot_configured/collectorpresente para300khandlers; :1215–1220 Claude featuresnull complete/3agentes/configured; :1250–1262 mistura preservaClaude/Hermes/Codexinvalid. config-projection-C12 :1429–1470 listasgrandesvalidas/inválidas emCodex/Claude. envelope-failure.unit.test.mjs:15–17 complete0/partial0/failed1 | V PASS |
| C13 flags | envelope-C13, envelope.cli.test.mjs:252–259 exit0/lista4flags/ausênciaflagsproibidas; :273 cwdinválidoexit2; :285 reparo/install/coletaexit2 | C PASS |
| C14 limite/privacidade | leak-C14, leak-and-limits.cli.test.mjs:48–54 `assert.doesNotMatch(...,new RegExp(CANARY))`; config-projection.unit.test.mjs:479 canárioausente, :503–505 limite; :1484–1485 listagrandeacima1MiB unknown/input_too_large; novaCLI :902–909 chave/dígitosTOMLausentes emJSON/texto | V PASS |
| C15 snapshot/concorrência | snapshot-C15, snapshot-concurrency.cli.test.mjs:56 `assert.deepEqual(stripTimestamp(reportA),stripTimestamp(reportB))`; :59 after===before; mid-read-mutation.unit.test.mjs:134–135 unknown/config_changed_during_read. Novo metadado/scanners não persistem estado | V PASS |
| C16 provas/origens | presence-C16, presence.cli.test.mjs:292 version_profile_incompatible; configuration-trust-C16, configuration-trust.cli.test.mjs:309–317 partial/3agentes/inacessível/demaispreservados; capability-evidence.cli.test.mjs:333 nonLocal45/:350 texto sem origemfixture. Novas provas declaradamente sintéticas | V PASS |
| C17 docs | docs-C17, docs-compatibility.test.mjs:14 invocaçãoREADME/:15–17 partial/unverified/identityfalse; :40–42 distingue contrato/inspeção/execução. docs/agent-compatibility.md:19/:21 relidas contra fontes/tipos/faixas; nota do carregador restringe alegação a TomlValue | V PASS |
| C18 governança/core | governance-C1/C3, scripts/governance-ci.test.mjs:263–277 matriz3SOs/comandosliteraisci/governance/code-review/doctor; 6governança+10motorPASS; core5 byteigualbase por gitdiffexit0 | V PASS |

## Limitações e preservação

**verified at 5c39d08**. Profile light, **no faults injected**; Coverage/Test policy/fault injection standard e comparação ui não executados. Light não prova que todo membro de uma coleção tem caso nem que cada assertion rejeita uma implementação errada. Swept relido, sem linha resolvida como existing; restrições remeteram a checks/fora de escopo. CONTRIBUTING ausente e intenção/ACs não alterados são **carried from 3eae39f**.

Gaps de nível/amostragem **carried from 3eae39f**: EACCES por adaptador, timeout com connect simulado/relógio real, exit1 na função pública sem falha real de subprocesso, inacessibilidade CLI por diretório. Não certifico3SOs, CIremota/macOS, capturaE2E/handlers/IPC ou identidadeTCP. Campos nomeados/tipados de FeaturesToml são excluídos da regra do BoolMap; seu schema inteiro não é reproduzido. A representação TOML do input MCP continua validada só quanto a null. usize usa teto64bits conforme plataformas nativas do perfil; nenhum perfil32bits foi criado. Hermes com hooks+features está provado na projeção; a nova CLI compartilhada usa Hermes sem hooks, preservando a limitação declarada no build. Não usei fonte/testesRust lidos como se executados.

**verified at 5c39d08**: `git diff --exit-code 4242520dc6b70848bd0ac8acb7e00acdd1755c8a HEAD --` core5 retornou0; SHA256 atuais reconfirmam hashes do PASS6: cliD6997408…, review88508699…, review.test67247DB5…, schemaA11E040A…, README5F1998DB…. Fix diff e relatório passam gitdiff--check. Original começou e permaneceu até o relatório com porcelainvazio/HEAD5c39d08; após escrever, reconferi HEADidêntica e exclusivamente M `.checks/issue-3-agent-diagnostics.verified.md`. Sem mudanças de source/tests/task/checklist/AGENTS/config/core/.git/estadoformal pelo Verifier, semstash/instalação/commit/push/PR. Escritas ficaram em scratch/copias/fixtures/repositóriostemporários autorizados.

## Gate

**PASS — 18/18; 334 PASS, 0 FAIL, 1 skip** na execução independente da HEAD5c39d08. Nenhum achado bloqueante concreto remanescente no escopo. Rodada7 encerrada; revisão formal/entrega com o orquestrador, sem iniciar rodada adicional.
