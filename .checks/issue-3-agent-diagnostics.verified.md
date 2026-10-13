# Issue 3 — Nona verificação independente

**Verdict**: FAIL
**Profile**: light
**Diff range**: `4242520dc6b70848bd0ac8acb7e00acdd1755c8a..24fca7bcaa31d5f2835ef48bb766cf7e16133810`
**Fix diff**: `ba436260cf1ebe97c824b4e16eccf53972e7789f..24fca7bcaa31d5f2835ef48bb766cf7e16133810`
**Round**: 9 — scoped
**Verifier**: Codex independente; Claude autor; nenhuma implementação/correção pelo Verifier.
**Checks**: 15/18 PASS; C3/C5/C8 FAIL por um defeito P2 bloqueante confirmado. A suite verde não encerra esse achado.

## Escopo, herança e execução

**verified at 24fca7bcaa31d5f2835ef48bb766cf7e16133810**. Autorização humana “pode fazer as revisoes necessarias”, registrada em `.checks/issue-3-agent-diagnostics.linux.md`. Li findings formal5 completos, task/checklist, build seções24–26, checkpointLinux e fix diff completo. AGENTS/TLC light já lidos; task/AGENTS e critérios não mudaram. Override formal max6 somenteissue3; padrõesmax2/histórico preservados. Sem revisão formal ou entrega pelo Verifier.

**carried from 5fce46da44f477baac07cf75f9e946b3ce62fe84**, PASS8 preservado em `ba436260cf1ebe97c824b4e16eccf53972e7789f`: intenção/ACs/fontes/conclusões não afetadas, limitações e proveniência anterior (PASS7 em5c39d08/ed72b3c). GuiaDownloads não vinculante. Reavaliei descobertaPATH e consumidores do contrato Hermes/configuração/trust, com alcance C1–C6/C8/C11/C12/C14–C16/C18. Demais análises herdadas explicitamente; todas as provas reexecutadas na HEAD atual. Citações de testes tocados atualizadas.

Original começou HEADexata/porcelainvazio. Archive da HEAD em `.checks/code-review/verifier9/head`, node_modules copiado, sem instalação. **Uma invocation `npm test` completa** na cópia, com escalonamento aprovado para os repositórios temporários dos testes de governança/motor. Windows Node24.21.0/npm11.19.0.

| Target da invocation completa | Resultado observado |
| --- | --- |
| test:governance | 6 PASS, 0 FAIL, 0 skip |
| test:code-review | 10 PASS, 0 FAIL, 0 skip |
| test:doctor | 345 testes, 343 PASS, 0 FAIL, 2 skip |

**359 PASS, 0 FAIL, 2 skips; 361 contabilizados; exit0.** Log ignorado `verifier9/npm-test.txt` nomeia cada teste. Confirmei nomes e assertions com rg; nenhuma seleção vazia. Suite verde não repetida. Novas provas aparecem como executadas: ENOTDIR injetado :53; mutações/controles/matriz/profundidade :296–305; CLI residuais/agrupamentos :258–259.

Skips Windows: arquivo real no PATH/ENOTDIR POSIX (`agent-resolution.unit.test.mjs:254`–256) e symlink real POSIX (:560). A prova ENOTDIR injetada executou; não afirmo que o caso nativo POSIX executou aqui. Linux361PASS/zeroSKIP do orquestrador no produtoaa3adf0 é complementar, não minha execução. MacOS/CIremota não observados.

Li os REDs do autor (4/5/4 falhas nas três correções) e os12probesRoot, sem reivindicar execução própria desses registros. Não rodei baseline anterior nem fault injection.

## Finding bloqueante

**verified at 24fca7b — [P2] Alvo agrupado de atribuição aumentada ainda publica fontes anteriores.**

**Localização**: `src/doctor/contract-evidence.mjs:69`, com alcance em `src/doctor/python-source.mjs:225` e consumidores de versão/contrato. O regex aceita fechamento de grupo apenas antes de `.metodo(`; a alternativa de atribuição aumentada continua exigindo operador imediatamente após nome/separador. `findAssignments` exige o operador no token seguinte ao nome e depth0; num alvo agrupado, o próximo token é `)` e a profundidade do nome é maior quezero. `callsMutatorDirectly` cobre chamadas, não essa atribuição.

**Cenário e esperado**: após uma atribuição literal, `(VALID_HOOKS) -= {"pre_tool_call"}` deve tornar o catálogo inconclusivo; `(SHELL_UNSUPPORTED_HOOKS) -= {"pre_tool_call"}` também não pode confirmar exclusões. `(__version__) += "-dev"` deve produzir versionnull/version_source_ambiguous, sem assumir compatibilidade com0.21.4. É agrupamento do mesmo alvo conhecido, não alias/reflexão. A exclusão dessa forma na seção26 não resolve a contradição com C3/C5/C8.

**Fonte primária aberta nesta rodada**: [CPython3.13 Grammar/python.gram](https://github.com/python/cpython/blob/v3.13.0/Grammar/python.gram#L968). A regra de assignment usa single_target com augassign; single_target admite recursivamente um alvo entre parênteses. Assim, os casos acima são formas válidas do alvo, sem exigir avaliação de Python.

**Reproduções independentes na cópia exata**, dados Python apenas lidos como texto:

| Caso executado | Esperado | Observado |
| --- | --- | --- |
| Extração após `(VALID_HOOKS) -= {"pre_tool_call"}` | null | lista `["pre_tool_call"]` anterior |
| Extração após `(SHELL_UNSUPPORTED_HOOKS) -= {"pre_tool_call"}` | null | mesma lista anterior |
| CLI com catálogo agrupado mutado, handler pre_tool_call e hooks_auto_accept:true | 5unverified, configurationunknown/trustunknown | 5verified, configured/trusted |
| CLI com `(__version__) += "-dev"` e catálogo legítimo | versionnull/ambiguous, 5unverified | versão0.21.4/source_literal, 5verified, configured/trusted |

Logs ignorados: `verifier9/grouped-binding.txt` e `verifier9/grouped-cli.txt`; probes apenas no scratch da cópia. Ambos os processos CLI preservaram3agentes/exit0/sentinelaausente/canárioprivadoausente. O exit0 dos probes só confirma execução/reprodução; **não aprova produto**: matches:false registra desacordo com o contrato.

**Impacto**: publica versão incompatível como compatível e afirma suporte/configuração/confiança usando fonte efetiva diferente da literal lida. Bloqueia C3/C5/C8. Os testes dos14 métodos e dos13 operadores sem alvo agrupado estão verdes, mas não detectam essa combinação concreta. Nenhuma correção foi feita pelo Verifier; sem investigação ampla nova.

## C1–C18

Prefixo dos testes: `tests/doctor/`. C = **carried from 5fce46da44f477baac07cf75f9e946b3ce62fe84**, análise herdada/prova reexecutada; V = **verified at 24fca7bcaa31d5f2835ef48bb766cf7e16133810**, alcance reavaliado. Assertions localizadas abaixo; FAILs usam também as reproduções acima.

| Check | Prova / assertion localizada | Resultado |
| --- | --- | --- |
| C1 presença/ordem | presence-C1, presence.cli.test.mjs:49 `assert.equal(report.agents.length,3)`; :55–57 absent/versionnull/executable_not_found | V PASS |
| C2 PATH/caminho/versão | agent-resolution-formal5-2, agent-resolution.unit.test.mjs:241–243 `assert.equal(claude.presence,"present")`, pathliteralposterior/versão2.1.295 depois de ENOTDIRinjetado; controlesC2 :143/:148/:153 trêsversõesliterais/origens | V PASS; POSIXnativo skip declarado |
| C3 presença/inconclusividade | agent-resolution-C3 :208–209 unknown/EACCES; regressõesPE/Hermes anteriores executadas. **Probe grouped-cli.mjs** observa0.21.4 após `(__version__) += "-dev"`, esperado versionnull/ambiguous; causa python-source:225 | V FAIL |
| C4 leitura/preservação | presence-C4, presence.cli.test.mjs:315 sentinelaausente; :318 `assert.deepEqual(snapshotAfter,snapshotBefore)`; probes agrupados também sentinelaausente; alterações novas não executam agentes | V PASS |
| C5 contrato/evidência | contract-evidence-formal5, contract-evidence.unit.test.mjs:163/:167 mutaçãonull nas2tabelas; :178 unrecognized; :332–333 2×13×14 casos/escaped[] para chamadas; :351 consultas preservadas. CLI mutation :334–335 unverified/contract_source_unrecognized. **Probe agrupado -= retorna lista e CLI5verified**; fontes não comprovam o literal efetivo | V FAIL |
| C6 três estados | capability-matrix-C6, capability-matrix.unit.test.mjs:110 configuration e :111–114 `runtimeVerification==="not_performed"`; suporte/config/runtime ainda distintos mesmo com fatos incorretos apontados em C5/C8 | V PASS |
| C7 matriz/exclusões | capability-matrix-C7, capability-matrix.unit.test.mjs:125–138 listasliterais5×4; :174 unverified/:177 exclusãonullcloud; hosted separado/documentado | C PASS |
| C8 configuração/trust | configuration-trust-C8/formal5, configuration-trust.cli.test.mjs:325–329 unknown/catalogunavailable/trustunknown; :437–447 mesma decisão/5unverified para agrupamento de chamada. contract-evidence.unit.test.mjs:373–374 catálogo geral found/exclusãonull quando só a exclusão é mutada. **Probe atribuiçãoagrupada publica configured/trusted** em vez de unknown | V FAIL |
| C9 coletor/identidade | collector-C9, collector.cli.test.mjs:31–32 reachable/identityVerifiedfalse; :48/:50 unreachable/false; :71–72 IPv6 | C PASS |
| C10 entrada/timeout | collector-C10, collector.cli.test.mjs:86–87 unknown/endpoint_not_provided; :127 `assert.equal(status,2,endpoint)`; collector-probe.unit.test.mjs:65–69 connection_timeout, elapsed>=990 e <3000 | C PASS |
| C11 paridade | envelope-C11, envelope.cli.test.mjs:32 JSONúnico/:34 semANSI/:101–118 motivos/origem/fonte/eventos. NovasCLI :326/:342 e :335/:343 mesmosmotivosJSON/texto; :438/:453 e :447/:454 agrupamentos. Fatos falsos de C3/C5/C8 não são aprovados por esta paridade | V PASS |
| C12 envelope/isolamento/exits | envelope-C12, envelope.cli.test.mjs:182–184 exit0/schemaVersion1/complete e :205–209 partial/3agentes. NovasCLI :321–322/:433–434 exit0/3agentes preservados; configuration-trustC16 :480–488 partial/demaispreservados. Defeito upstream de classificação continua bloqueado em C8 | V PASS |
| C13 flags | envelope-C13, envelope.cli.test.mjs:252–259 quatroflags/exit0/proibidasausentes; :273 cwdinválidoexit2; :285 reparo/install/coletaexit2 | C PASS |
| C14 limites/privacidade | leak-C14, leak-and-limits.cli.test.mjs:48–54 `assert.doesNotMatch(...,new RegExp(CANARY))`; :111–113 limite/marker. Novo contract-evidence.unit.test.mjs:395 texto<=1MiB/:399 respostasexatas para mutaçãoprofunda e consultamultilinha; probes semcanário | V PASS; custo anterior declarado |
| C15 snapshot/concorrência | snapshot-C15, snapshot-concurrency.cli.test.mjs:56 `assert.deepEqual(stripTimestamp(reportA),stripTimestamp(reportB))`; :59 after===before; contract-evidence.unit.test.mjs:500 changed_during_read | V PASS |
| C16 provas/origens | presence-C16, presence.cli.test.mjs:292 version_profile_incompatible; configuration-trust-C16 :480–488 parcial/inacessível/demaispreservados; capability-evidence.cli.test.mjs:379 nonLocal45/:396 texto sem origemfixture | V PASS; não certifica POSIXnativo nesta execução |
| C17 docs | docs-C17, docs-compatibility.test.mjs:14 invocaçãoREADME/:15–17 partial/unverified/identityfalse; :40–42 contrato/inspeção/execução separados. Fontes/docsinalteradas herdadas; limite incorreto de agrupamento foi contestado no finding | C PASS |
| C18 governança/core | governance-C1/C3, scripts/governance-ci.test.mjs:263–277 matriz3SOs/comandosliteraisci/governance/code-review/doctor; 6governança+10motorPASS; core5 byteigualbase por gitdiffexit0 | V PASS |

## Limitações e preservação

**verified at 24fca7b**. Profile light, **no faults injected**; sem joinCoverage/Testpolicy/faultinjection standard ou comparação ui. Light não certifica cada membro ou poder de discriminação de cada assertion. Swept relido, sem linha resolvida como existing; CONTRIBUTINGausente/ACs/lacunasanteriores são **carried from 5fce46d**. EACCES foi realmente testado; EIO preservado pelo ramo genérico throw inspecionado, sem alegar teste específico inexistente.

Dois skips POSIX declarados; não executei symlink/ENOTDIRnativo no Windows. Fontes longas sem mutação ainda podem sofrer custo anterior do tokenizer columnOf (linha única ~1MiB); não medi nem corrigi essa classe. Strings/exec multiline, alias/reflexão arbitrários seguem fora da leitura estática. **Alvo agrupado de atribuição aumentada não foi aceito como limitação**, pois causa falso afirmativo reproduzido dentro dos critérios. Sem execuçãoPython/Rust/PE, capturaE2E/handlers/IPC ou certificação de identidadeTCP. RED/probes12Root e resultadosLinux permanecem evidência complementar, não execução própria.

**verified at 24fca7b**: core5 semdiff contra4242520; task/AGENTSsemalteração no fixdiff; fixdiff/relatório passam gitdiff--check. Original iniciou e permaneceu até o relatório com porcelainvazio/HEAD24fca7b. Após salvar, reconferi HEADidêntica e exclusivamente M `.checks/issue-3-agent-diagnostics.verified.md`. Nenhum source/test/task/checklist/AGENTS/config/core/.git/estadoformal alterado pelo Verifier; semstash/instalação/commit/push/PR. Escritas apenas no relatório e scratch/cópia/fixtures/repositóriostemporários autorizados. Desvio histórico de stash do autor continua no histórico; nenhuma operação desse tipo nesta verificação.

## Gate

**FAIL — 15/18 PASS; C3/C5/C8 não comprovados no caso agrupado.** Uma invocation completa terminou359PASS/0FAIL/2skips, mas reproduções independentes confirmam um P2 bloqueante. Correção e regressões próprias/CLI necessárias antes de entrega. Rodada9 encerrada; decisão/encaminhamento com o orquestrador, sem rodada autônoma adicional.
