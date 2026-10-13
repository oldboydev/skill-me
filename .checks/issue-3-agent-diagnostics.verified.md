# Issue 3 — Décima verificação independente

**Verdict**: PASS
**Profile**: light
**Diff range**: `4242520dc6b70848bd0ac8acb7e00acdd1755c8a..4bffd96111f8b6de1c30538b4023e8ac18be9855`
**Fix diff**: `75a6c7077b3039c6c021327e4db6094375cbe8b2..4bffd96111f8b6de1c30538b4023e8ac18be9855`
**Round**: 10 — scoped
**Verifier**: Codex independente; Claude autor; nenhuma implementação/correção pelo Verifier.
**Checks**: 18/18 PASS. C3/C5/C8 reavaliados; findingP2 da rodada9 fechado no escopo revisto.

## Escopo e herança

**verified at 4bffd96111f8b6de1c30538b4023e8ac18be9855**. Autorização humana vigente “pode fazer as revisoes necessarias”, registrada em `.checks/issue-3-agent-diagnostics.linux.md`. Li fix diff completo de produto/testes/helper/checklist/evidências, task e build seção27/checkpointLinux. AGENTS/TLC light já abertos; task/AGENTS/critério/core não mudaram. Nenhuma revisão formal/entrega pelo Verifier.

**carried from 24fca7bcaa31d5f2835ef48bb766cf7e16133810**, FAIL9 preservado em `75a6c7077b3039c6c021327e4db6094375cbe8b2`: intenção/ACs/fontes/conclusões dos15 checks aprovados, limitações e proveniência anterior (PASS8 em5fce46d/ba43626). GuiaDownloads não vinculante. C3/C5/C8 não foram herdados como PASS; recebem prova e reavaliação abaixo. Todas as provas, inclusive herdadas, foram reexecutadas nesta HEAD.

Reavaliei os consumidores de python-source/contract-evidence e o alcance em C2/C4/C6/C8/C11/C12/C14/C15/C16/C18. O novo helper de testes só constrói fontes textuais a partir de13 operadores/12 formas explícitos; não contém a decisão do produto. `indexAfterGroupedName` reutiliza a mesma varredura de fechamentos antes usada por callsMutatorDirectly. Citações dos três arquivos de testes tocados atualizadas; nenhuma investigação nova fora do fixdiff.

## Provas executadas nesta HEAD

**verified at 4bffd96**. Original começou HEADexata/porcelainvazio. Archive exato em `.checks/code-review/verifier10/head`, node_modules copiado, sem instalação. Executei **uma invocation `npm test` completa** na cópia isolada, com escalonamento aprovado para os repositórios temporários dos testes de governança/motor. Windows Node24.21.0/npm11.19.0.

| Target da invocation completa | Resultado observado |
| --- | --- |
| test:governance | 6 PASS, 0 FAIL, 0 skip |
| test:code-review | 10 PASS, 0 FAIL, 0 skip |
| test:doctor | 353 testes, 351 PASS, 0 FAIL, 2 skip |

**367 PASS, 0 FAIL, 2 skips; 369 contabilizados; exit0.** Log ignorado `verifier10/npm-test.txt` mostra resultado por nome; confirmei nomes/assertions com rg, sem seleção vazia. Oito novos testes executaram: matriz/controle da versão (:95–96), dois testes CLI separados (:262–263), matriz/exec/controle/leitura de contrato (:310–313). Suite verde e probes extras não repetidos.

Skips Windows: arquivo real noPATH/ENOTDIR POSIX (`agent-resolution.unit.test.mjs:259`–261) e symlink real (:565). ENOTDIRinjetado executou. Linux369PASS/zeroSKIP no produtodc5df6a, RED6falhas/GREEN129PASS2skips e probesRoot são complementares do autor/orquestrador, não execução própria nesta rodada. Não rodei baseline anterior, macOS ou CIremota.

## Fechamento do finding9

**verified at 4bffd96**. O operador após qualquer sequência de fechamentos agora é inspecionado no ramo aumentado de findAssignments, exigindo depth0 no próprio operador. Isso recusa confirmar versão/tabelas após alvo agrupado dos13 operadores, sem confundir subscrito de outro objeto com ligação do nome. O extrator de chamadas reutiliza o avanço; a proteção bruta de uma linha preserva os mesmos5 operadores, agora com fechamento de grupo.

A [gramática CPython3.13](https://github.com/python/cpython/blob/v3.13.0/Grammar/python.gram#L968), efetivamente aberta na rodada9, é **carried from 24fca7b**: single_target agrupado em augassign rege estes casos. A seção27/checklist supera explicitamente o limite anterior de `(NOME) -= …`; os critérios não foram reduzidos.

As provas atuais na própria camada afirmam:

- versão: 12×13 casos com versionnull/sem source_literal/version_source_ambiguous, `published=[]`; controles preservam0.21.4/source_literal;
- tabelas: 2×12×13 casos retornamnull, `escaped=[]`; proteção bruta 2×5×2 casos também recusa; consultas/comparações/subscritos/nomes alheios preservam o literal legítimo;
- leitura de arquivo: VALID_HOOKS agrupado mutado vira unrecognized/sem mecanismos; só a exclusão mutada conserva catálogo geral found, mas shellUnsupportedHooksnull;
- duas provas CLI executadas separadamente: catálogo agrupado usa contract_source_unrecognized; versão agrupada usa version_source_ambiguous/version_unresolved. Ambas preservam3agentes/exit0/5unverified/configurationunknown/trustunknown, mesmo com hooks_auto_accept:true, e texto/JSON têm os mesmos motivos. A CLI de versão não expõe0.21.4 em nenhum formato.

Esses são resultados executados pelo Verifier nesta HEAD, confrontados com assertions e código, não aprovação baseada no self-report do autor. A reprodução do defeito anterior permanece no FAIL9; nenhum RED anterior foi apresentado como nova execução.

## C1–C18

Prefixo dos testes: `tests/doctor/`. C = **carried from 24fca7bcaa31d5f2835ef48bb766cf7e16133810**, análise aprovada herdada/prova reexecutada. V = **verified at 4bffd96111f8b6de1c30538b4023e8ac18be9855**, alcance reavaliado. Cada linha tem assertion localizada/prova executada.

| Check | Prova / assertion localizada | Resultado |
| --- | --- | --- |
| C1 presença/ordem | presence-C1, presence.cli.test.mjs:49 `assert.equal(report.agents.length,3)`; :55–57 absent/versionnull/executable_not_found | C PASS |
| C2 PATH/caminho/versão | agent-resolution-C2, agent-resolution.unit.test.mjs:148/:153/:158 versõesliteraisClaude2.1.295/Codex0.162.1/Hermes0.21.4; ENOTDIRinjetado :246–248 present/pathposterior/2.1.295. Novo controle agrupado :1166–1167 versão0.21.4/source_literal preservados | V PASS; skipsPOSIX declarados |
| C3 fonte inconclusiva | agent-resolution-formal5-grouped-binding :1132–1146 filtro versionnull/versionSourceundefined/ambiguous e `assert.equal(checked,12*13)`, `assert.deepEqual(published,[])`; CLI configuration-trust.cli.test.mjs:508–510 present/versãoesperada/motivoesperado (mapaliteral :468–483), :530–533 versionSourcenull/sem0.21.4. EACCES anterior executado | V PASS; FAIL9 fechado |
| C4 leitura/preservação | presence-C4, presence.cli.test.mjs:315 sentinelaausente/:318 `assert.deepEqual(snapshotAfter,snapshotBefore)`; leitor/token/helper novos só analisam texto, sem execução do conteúdo | V PASS |
| C5 contrato/evidência | contract-evidence-formal5-grouped-binding, contract-evidence.unit.test.mjs:427–428 `assert.equal(checked,2*12*13)`/escaped[]; :447–448 2×5×2/escaped[] para exec; :483–485 unrecognized/sem mecanismos/semvalidHooks; :493–494 found/exclusãonull. CLI :517–520 5linhasunverified/motivoexato, mapaliteral :468–483 | V PASS; FAIL9 fechado |
| C6 três estados | capability-matrix-C6, capability-matrix.unit.test.mjs:110 configuration/:111–114 runtime not_performed; :121 toda matriznot_performed. Suporte/configuração/runtime permanecem distintos | V PASS |
| C7 matriz/exclusões | capability-matrix-C7, capability-matrix.unit.test.mjs:125–138 listasliterais5×4; :174 unverified/:177 exclusãonullcloud; hosted separado/documentado | C PASS |
| C8 configuração/trust | duas configuration-trust-C8/formal5-grouped-binding: configuration-trust.cli.test.mjs:511–514 `configuration==="unknown"`, hooks_catalog_unavailable, `trust==="unknown"`, configuration_not_determined; :518–520 sem suporte afirmativo. Mesmo com consentimento explícito, catálogo ou versão inconclusivos não concedem configured/trusted | V PASS; FAIL9 fechado |
| C9 coletor/identidade | collector-C9, collector.cli.test.mjs:31–32 reachable/identityVerifiedfalse; :48/:50 unreachable/false; :71–72 IPv6 | C PASS |
| C10 entrada/timeout | collector-C10, collector.cli.test.mjs:86–87 unknown/endpoint_not_provided; :127 `assert.equal(status,2,endpoint)`; collector-probe.unit.test.mjs:65–69 connection_timeout, elapsed>=990 e <3000 | C PASS |
| C11 paridade | envelope-C11, envelope.cli.test.mjs:32 JSONúnico/:34 semANSI/:101–118 motivos/origem/fonte/eventos. NovasCLI :512/:526 catalogunavailableJSON/texto, :520/:527 motivoexato, :530–533 fonteambígua/semversãoanterior emJSON/texto | V PASS |
| C12 envelope/isolamento | envelope-C12, envelope.cli.test.mjs:182–184 exit0/schemaVersion1/complete e :205–209 partial/3agentes; novasCLI configuration-trust.cli.test.mjs:505–506 exit0/3agentes; C16 :559–567 partial/unknown/demaispreservados. envelope-failure.unit.test.mjs:15–17 complete0/partial0/failed1 | V PASS |
| C13 flags | envelope-C13, envelope.cli.test.mjs:252–259 quatroflags/exit0/proibidasausentes; :273 cwdinválidoexit2; :285 reparo/install/coletaexit2 | C PASS |
| C14 limites/privacidade | leak-C14, leak-and-limits.cli.test.mjs:48–54 `assert.doesNotMatch(...,new RegExp(CANARY))`; :111–113 limite/marker. contract-evidence.unit.test.mjs:400 texto<=1MiB/:404 respostasexatas para mutaçãoprofunda/consultamultilinha. Nenhum texto bruto novo projetado | V PASS |
| C15 snapshot/concorrência | snapshot-C15, snapshot-concurrency.cli.test.mjs:56 `assert.deepEqual(stripTimestamp(reportA),stripTimestamp(reportB))`; :59 after===before; contract-evidence.unit.test.mjs:594 changed_during_read | V PASS |
| C16 provas/origens | presence-C16, presence.cli.test.mjs:292 version_profile_incompatible; configuration-trust-C16 :559–567 parcial/inacessível/demaispreservados; capability-evidence.cli.test.mjs:379 nonLocal45/:396 texto sem origemfixture. Novos casos são fontes sintéticas declaradas | V PASS |
| C17 docs | docs-C17, docs-compatibility.test.mjs:14 invocaçãoREADME/:15–17 partial/unverified/identityfalse; :40–42 contrato/inspeção/execução separados. Seção27/checklist corrigem o limite de agrupamento; doccompatibilidade inalterada | C PASS |
| C18 governança/core | governance-C1/C3, scripts/governance-ci.test.mjs:263–277 matriz3SOs/comandosliteraisci/governance/code-review/doctor; 6governança+10motorPASS; core5 byteigualbase por gitdiffexit0 | V PASS |

## Limitações e preservação

**verified at 4bffd96**. Profile light, **no faults injected**; sem joinCoverage/Testpolicy/faultinjection standard ou comparação ui. Light não certifica cada membro nem o poder discriminatório de cada assertion. Swept relido, sem linha resolvida como existing. CONTRIBUTINGausente/ACs/lacunasanteriores são **carried from 24fca7b**: EACCES por adaptador, EIO pelo ramo genérico inspecionado (sem alegar teste específico), timeout simulado/relógio real, exit1 na função pública, inacessibilidade por diretório.

Dois skips POSIX declarados; Linux do orquestrador não é minha execução. Sem macOS/CIremota, capturaE2E/handlers/IPC ou certificação de identidadeTCP. Regex bruta continua só com5operadores de uma linha em strings/exec; todos13operadores em código direto agrupado foram provados. Alias/reflexão arbitrários, atribuição a atributo conservadoramenteambígua e custo anterior de columnOf em linha única longa continuam limites declarados. Não reabri essas classes nem executeiPython/Rust/PE. Nenhuma nova alegação de desempenho.

**verified at 4bffd96**: core5 semdiff contra4242520; task/AGENTSsemalteração no fixdiff; fixdiff/relatório passam gitdiff--check. Original iniciou e permaneceu até o relatório com porcelainvazio/HEAD4bffd96; após salvar, reconferi HEADidêntica e exclusivamente M `.checks/issue-3-agent-diagnostics.verified.md`. Nenhum source/test/task/checklist/AGENTS/config/core/.git/estadoformal alterado pelo Verifier; semstash/instalação/commit/push/PR. Escritas somente no relatório e scratch/cópia/fixtures/repositóriostemporários autorizados. Histórico anterior preservado.

## Gate

**PASS — 18/18; 367 PASS, 0 FAIL, 2 skips** na invocation independente da HEAD4bffd96. C3/C5/C8 fechados com as provas próprias e as duas fronteirasCLI separadas; nenhum achado bloqueante concreto remanescente no escopo revisto. Rodada10 encerrada; formal6/entrega com o orquestrador, sem nova rodada autônoma.
