# Issue 3 — Oitava verificação independente

**Verdict**: PASS
**Profile**: light
**Diff range**: `4242520dc6b70848bd0ac8acb7e00acdd1755c8a..5fce46da44f477baac07cf75f9e946b3ce62fe84`
**Fix diff**: `ed72b3cba86bda5bac0a7fdab61efc3882db1e0f..5fce46da44f477baac07cf75f9e946b3ce62fe84`
**Round**: 8 — scoped
**Verifier**: Codex independente; Claude autor; nenhuma implementação/correção pelo Verifier.
**Checks**: 18/18 PASS. Dois achados formal4 e alcance compartilhado fechados; nenhum defeito bloqueante concreto remanescente no escopo revisto.

## Escopo e herança

**verified at 5fce46da44f477baac07cf75f9e946b3ce62fe84**. Autorização humana vigente “pode fazer as revisoes necessarias”, registrada em `.checks/issue-3-agent-diagnostics.linux.md`. Li os dois findings completos de `.checks/code-review/issue-3-formal4-response.json`, task/checklist, build seção23, checkpoint Linux e diff completo de produto/testes/helpers/governança. AGENTS/TLC light já lidos; task e AGENTS não mudaram no fix diff. O override formal max5 está restrito à issue3; perfis comuns continuam max2. Não executei revisão formal nem entrega.

**carried from 5c39d081874de743a2152babb68d4f6463902173**, PASS7 preservado em `ed72b3cba86bda5bac0a7fdab61efc3882db1e0f`: intenção/seis ACs da issue, fontes e conclusões não afetadas, limitações e proveniência anterior (PASS6 em3eae39f/9f98068). Guia Downloads não vinculante. Todas as provas foram novamente executadas na HEAD atual; herança de análise não é herança de resultado de teste.

Reavaliei C2/C3/C4/C5/C6/C8/C11/C12/C14/C15/C16/C18 pelo alcance dos leitores e dos helpers compartilhados. `buildMinimalPe` mantém o layout PE32+ quando pe32 não é solicitado; PE32 é um controle adicional do ramo já existente. `installAllAgents` só passa hermesInitSource quando explicitamente definido, preservando o default dos demais testes. Citacões dos quatro arquivos de testes tocados atualizadas. Docs de compatibilidade e parser Codex não mudaram; não reabri classes fora do fix diff.

## Provas nesta HEAD

**verified at 5fce46d**. Original começou com HEAD exata/porcelain vazio. Archive extraído em `.checks/code-review/verifier8/head/`, node_modules copiado, sem instalação. Uma invocation **`npm test` completa** na cópia, com escalonamento aprovado apenas para os repositórios temporários usados pelos testes de governança/motor. Windows Node24.21.0/npm11.19.0.

| Target da invocation completa | Resultado observado |
| --- | --- |
| test:governance | 6 PASS, 0 FAIL, 0 skip |
| test:code-review | 10 PASS, 0 FAIL, 0 skip |
| test:doctor | 330 testes, 329 PASS, 0 FAIL, 1 skip |

**345 PASS, 0 FAIL, 1 skip; 346 testes contabilizados; exit0.** Log ignorado `verifier8/npm-test.txt` nomeia cada teste individualmente. Confirmei nomes e asserções por rg; nenhuma seleção vazia. Novos testes de presença PE (:71), versão Hermes/controles (:91–92), CLI suporte sem versão (:101) e sete provas PE (:372–378) aparecem como executados/aprovados. Os dois casos novos das tabelas de contrato são assertions dentro de testes existentes, não test() adicionais. Suite verde não repetida.

Skip único: `agent-resolution-C2 realpath/symlink real liga o launcher do Codex ao pacote (POSIX)`, `tests/doctor/agent-resolution.unit.test.mjs:492`, condição Windows. Linux346PASS/zeroSKIP registrado no produtob72cc45 é execução complementar do orquestrador, não deste Verifier; macOS/CI remota não observados.

Fechei também a fronteira real da CLI do PE: probe isolado `verifier8/head/.checks/probe-pe-cli.mjs:18`–25, contra a CLI da cópia exata, afirma exit0/3agentes, Claude present/versionnull/launcher_not_recognized, Codex/Hermes presentes, motivo no texto e sentinela ausente. Resultado `verifier8/pe-cli.txt`: PASS. É instalação sintética, não validação de agente real.

Li o RED/GREEN do autor, mas não executei a versão anterior nesta rodada: não afirmo aquele RED como minha execução. Magic desconhecido e PE32 válido são controles, sem alegar que ambos falhavam antes.

## Correções conferidas

**verified at 5fce46d**. Em `version-sources/pe.mjs`, as leituras de Magic/campos do optional header, diretórios/entradas de recurso, data entry e VS_FIXEDFILEINFO passam por guardas de alcance no buffer. Casos corrompidos retornam formato não reconhecido/versão ilegível, preservando o candidato encontrado. Erro real de E/S continua propagado; nenhuma execução do PE.

Em `python-source.mjs`, os13 operadores aumentados já tokenizados agora geram uma segunda ligação inconclusiva. O consumidor da versão não publica o literal anterior; os consumidores VALID_HOOKS/SHELL_UNSUPPORTED_HOOKS também recusam confirmar a tabela reatribuída. Comentário/string/outro nome preservam o literal válido. Não há avaliação/importação de Python ou novo schema.

A alteração do teste de semicolon foi confrontada com `launcher-link/hermes.mjs:51`–63: endsStatement já exige término do literal por quebra de linha, então o caso encadeado não produz literal reconhecido e permanece version_unreadable. O teste agora afirma versionnull com esse motivo; não tornou válida uma versão antes inconclusiva. Atributo `obj.__version__` conserva resultado ambíguo conforme o limite lexical declarado.

## C1–C18

Prefixo dos testes: `tests/doctor/`. C = **carried from 5c39d081874de743a2152babb68d4f6463902173**, análise herdada/prova reexecutada. V = **verified at 5fce46da44f477baac07cf75f9e946b3ce62fe84**, alcance reavaliado. Cada linha contém assertion localizada e prova executada.

| Check | Prova / asserção localizada | Resultado |
| --- | --- | --- |
| C1 presença/ordem | presence-C1, presence.cli.test.mjs:49 `assert.equal(report.agents.length,3)`; :55–57 absent/versionnull/executable_not_found | C PASS |
| C2 caminho/versão | agent-resolution-C2, agent-resolution.unit.test.mjs:143/:148/:153 versõesliterais2.1.295/0.162.1/0.21.4 e origens; version-metadata-formal4-P2 :290–291 `assert.equal(result.version,"2.1.295")`/binary_metadata no novoPE32; defaults dos helpers preservados | V PASS; skipPOSIX declarado |
| C3 presença sem versão | version-metadata-formal4-P2, version-metadata.unit.test.mjs:205–220 null/launcher_not_recognized para optionalheader0/20; :243–244 offsetdiretórioinvalidoconhecido; :256–268 dataentry/VSFixedFileinfo null/version_unreadable. agent-resolution-formal4-P2 :562–565 `assert.equal(agents.claude.presence,"present")`, versionnull/motivo. :1012–1014 13operadoresHermes versionnull/version_source_ambiguous; :1026–1027 controles0.21.4/source_literal. Probe PECLI :21 mesmoscampos | V PASS |
| C4 leitura/preservação | presence-C4, presence.cli.test.mjs:315 sentinelaausente; :318 `assert.deepEqual(snapshotAfter,snapshotBefore)`; version-metadata-C14 :168–182 usa throwingChildProcess e versão válida; probe PECLI sentinelaausente. Leitor/léxico novos somente dados | V PASS |
| C5 contrato/evidência | capability-evidence-C5 formal4-P2, capability-evidence.cli.test.mjs:309–319 present/versionnull/ambiguous, 5linhas `assert.equal(row.support,"unverified",row.mechanism)`/version_unresolved/not_performed apesar da tabelaválida. Controle :148 verified com contrato ligado. contract-evidence.unit.test.mjs:118/:127 %= após VALID_HOOKS →null; :202 **= após SHELL_UNSUPPORTED_HOOKS →null; :141 controla conjunto literal reconhecido | V PASS |
| C6 três estados | capability-matrix-C6, capability-matrix.unit.test.mjs:110 configuration e :111–114 runtime not_performed; novaCLI capability-evidence.cli.test.mjs:319 runtime not_performed | V PASS |
| C7 matriz/exclusões | capability-matrix-C7, capability-matrix.unit.test.mjs:125–138 listasliterais5×4; :174 unverified e :177 exclusãonullcloud; hosted separado/documentado | C PASS |
| C8 config/trust | configuration-trust-C8/G3, configuration-trust.cli.test.mjs:680–682 not_configured/hooks_event_shell_unsupported/not_applicable; :747–750 unknown quando exclusão indisponível. Novo consumidor léxico da exclusão não presume tabela após reatribuição, contract-evidence.unit.test.mjs:202 null | V PASS |
| C9 coletor/identidade | collector-C9, collector.cli.test.mjs:31–32 reachable/identityVerifiedfalse; :48/:50 unreachable/false; :71–72 IPv6 | C PASS |
| C10 entrada/timeout | collector-C10, collector.cli.test.mjs:86–87 unknown/endpoint_not_provided; :127 `assert.equal(status,2,endpoint)`; collector-probe.unit.test.mjs:65–69 connection_timeout, elapsed>=990 e <3000 | C PASS |
| C11 paridade | envelope-C11, envelope.cli.test.mjs:32 JSONúnico/:34 semANSI e :101–118 motivos/origem/fonte/eventos. NovaCLI capability-evidence.cli.test.mjs:313/:327 version_source_ambiguous emJSON/texto, :328–329 versão anterior/contratoverifiedausentes. ProbePECLI :21/:24 motivoJSON/texto | V PASS |
| C12 envelope/isolamento | envelope-C12, envelope.cli.test.mjs:182–184 exit0/schemaVersion1/complete; :205–209 partial/3agentes/presença preservada. NovoPECLI :18–22 exit0/3agentes/presenças preservadas; novoHermesCLI :307–319 exit0/present/null/semverified. envelope-failure.unit.test.mjs:15–17 complete0/partial0/failed1 | V PASS |
| C13 flags | envelope-C13, envelope.cli.test.mjs:252–259 quatroflags/exit0/proibidasausentes; :273 cwdinválidoexit2; :285 reparo/install/coletaexit2 | C PASS |
| C14 limites/privacidade | leak-C14, leak-and-limits.cli.test.mjs:48–54 `assert.doesNotMatch(...,new RegExp(CANARY))`; :111–113 unknown/input_too_large/marker ausente. version-metadata-C14, version-metadata.unit.test.mjs:75–79 versãoexata e totalBytesRead<MAX_ALLOWED_BYTES_READ; :105–106/:137–138 recusa recurso sem alocar tamanho declarado | V PASS |
| C15 snapshot/concorrência | snapshot-C15, snapshot-concurrency.cli.test.mjs:56 `assert.deepEqual(stripTimestamp(reportA),stripTimestamp(reportB))`; :59 after===before; contract-evidence.unit.test.mjs:242 changed_during_read. Guardas/ligações novas não persistem estado | V PASS |
| C16 provas/origens | presence-C16, presence.cli.test.mjs:292 version_profile_incompatible; configuration-trust-C16 :309–317 parcial/inacessível/demaispreservados; capability-evidence.cli.test.mjs:379 nonLocal45/:396 texto sem origemfixture. NovoCLI instala fontes sintéticas explicitamente; não certifica ambiente real | V PASS |
| C17 docs | docs-C17, docs-compatibility.test.mjs:14 invocaçãoREADME/:15–17 partial/unverified/identityfalse; :40–42 contrato documentado/inspeção estática/execução real. Doccompatibilidade inalterada; build/checklist registram novoslimites sem afirmar execução dosagentes | C PASS |
| C18 governança/core | governance-C1/C3, scripts/governance-ci.test.mjs:263–277 matriz3SOs/comandosliteraisci/governance/code-review/doctor; 6governança+10motorPASS; core5 semdiff contra base/mesmosSHA256 | V PASS |

## Limitações e preservação

**verified at 5fce46d**. Profile light, **no faults injected**; joinCoverage/Testpolicy/faultinjection standard e comparação ui não executados. Light não certifica todo membro de uma coleção nem a capacidade de cada assertion matar uma implementação errada. Swept relido, sem linha resolvida como existing; CONTRIBUTINGausente e limitações de nível anteriores são **carried from 5c39d08**: EACCES por adaptador, timeout simulado/relógio real, exit1 na função pública, inacessibilidadeCLI por diretório. Sem macOS/CIremota, capturaE2E/handlers/IPC/identidadeTCP ou execuçãoRust/Python/PE.

A amostragem PE usa valores representativos de corrupção, não todo offset possível nem certificação universal de binários. Magic desconhecido era rejeitado por coincidência do layout da fixture antiga; não reivindico RED para esse controle. PE32 é controle novo. Atribuição a atributo permanece conservadoramente ambígua; semicolon permanece version_unreadable; leitura lexical não é parserPython completo. Contratos/versões de agentes e crates anteriormente abertos são herdados, sem investigação nova de versões.

**Desvio do autor, comunicado**: build/checkpoint registram dois usos de git stash push/pop apesar da proibição. Isso não é aprovado retroativamente. O orquestrador relata stashvazio/arquivosprotegidosinalterados/nenhumaediçãoperdida; não apresento essa conferência como minha. Minhas provas usaram archive limpo e nunca stash ou escritaGit. O desvio histórico permanece registrado; o PASS afirma o comportamento e a preservação observados na HEAD atual.

**verified at 5fce46d**: core5 byteigualbase por gitdiffexit0; SHA256 reconfirmados iguais ao PASS7 (cliD6997408…, review88508699…, review.test67247DB5…, schemaA11E040A…, README5F1998DB…). Fixdiff/relatório passam gitdiff--check. Original iniciou e permaneceu até o relatório com porcelainvazio/HEAD5fce46d; depois de salvar, reconferi HEADidêntica e apenas M `.checks/issue-3-agent-diagnostics.verified.md`. Nenhum source/test/task/checklist/AGENTS/config/core/.git/estadoformal alterado pelo Verifier; semstash/instalação/commit/push/PR. Escritas somente no relatório e scratch/cópia/fixtures/repositóriostemporários autorizados.

## Gate

**PASS — 18/18; 345 PASS, 0 FAIL, 1 skip** na invocation independente da HEAD5fce46d; PE também reproduzido na CLI isolada. Nenhum achado comportamental bloqueante concreto no escopo revisto. Rodada8 encerrada; formal5/entrega com o orquestrador, sem rodada adicional autônoma.
