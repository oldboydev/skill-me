# Issue 3 — Décima segunda verificação independente

**Verdict: FAIL — 14/18 PASS; C2/C3/C5/C8 FAIL.**
**Profile:** light, no faults injected. **Round:** 12, scoped.
**Verified at:** `8b052343b027ad60f4f08a0580bcbfe5cb289855`.
**Feature range:** `4242520dc6b70848bd0ac8acb7e00acdd1755c8a..8b052343b027ad60f4f08a0580bcbfe5cb289855`.
**Fix diff:** `1673f0aba8bf8104de874be86dc089f72d1a1479..8b052343b027ad60f4f08a0580bcbfe5cb289855`.
**Verifier:** Codex independente, Claude autor; nenhuma implementação pelo Verifier.

## Escopo, herança e execução

Autorização humana vigente das revisões necessárias, registrada no checkpoint Linux. AGENTS/TLC/references verify, task/checklist, formal7-response, build29–31 e último checkpoint lidos. Perfil light confirmado. **Carried from `276138cc4af822510a10bb830e6f2984c2af5596`**, PASS11 preservado em `1673f0aba8bf8104de874be86dc089f72d1a1479`: intenção, critérios/fontes e análises não afetadas, lacunas e limitações. Critérios permanecem18; guia Downloads não vinculante. Task/AGENTS/core sem mudança no fixdiff. Reavaliados vínculo/env/cwd/shadow/bytecode/extensões/symlink, encaminhamento e shared fixtures. Todas as provas abaixo são novas nesta HEAD, independentemente da análise herdada.

Archive exato ignorado em `.checks/code-review/verifier12/head`; deps locais copiadas, sem instalação. **Uma invocation completa `npm.cmd test`**, com escalonamento autorizado para fixtures Git: governança6 PASS, motor10 PASS, doctor381 contabilizados/379 PASS/2 skips. **Total397 contabilizados, 395 PASS, 0 FAIL, 2 skips, exit0**. Windows/Node24.21.0/npm11.19.0. Log `verifier12/npm-test.txt` registra cada nome executado; conferi nomes e assertions localizadas, incluindo formal7-binding, hermes-shadow, mid-read-mutation e presence. Skips: arquivo real no PATH/ENOTDIR POSIX e symlink real Codex POSIX (log54/71); provas com adaptador executaram. Linux397PASS/zero skips e RED/GREEN do autor são complementares, não minhas execuções. Não repeti a suíte verde.

Os helpers agora fixam o intérprete do venv, em vez de presumir vínculo a partir de env/PATH; a mutação durante leitura mantém sua assertion e passa a alcançar o arquivo pretendido. `agent-resolution.mjs:65–68/131/165–168` e `run-diagnostics.mjs:86` encaminham cwd/env ao leitor. Catálogo/consumidores não mudaram. As provas atuais aceitam formas vinculadas e rejeitam33 launchers sem vínculo,32 combinações de vizinhos/launchers e ambiente conflitante; nomes parecidos/namespace/cache/posição oposta são controles. O cenário formal7 via env foi corrigido, mas o novo scanner compilado tem o P2 abaixo.

## Finding bloqueante

**[P2] Sufixo compilado em maiúsculas é ignorado no Windows — `src/doctor/launcher-link/hermes.mjs:183–184`, consumo :194/:214–215.**

Cenário reproduzido na CLI isolada: fixture Windows usa `"%~dp0python.exe" -m hermes_cli %*`; site-packages contém Hermes0.21.4 e catálogo completo; no `--cwd` existe `hermes_cli.PYD`; usuário tem pre_tool_call válido e hooks_auto_accept:true. As regex dos nomes compilados são case-sensitive e ignoram o arquivo retornado por listDir. **Atual:** present, 0.21.4/source_literal, cinco verified, configured/trusted, exit0/três agentes. **Esperado:** presença preservada, vínculo inconclusivo/versão null, cinco unverified e configuração/confiança unknown; o site-packages não está comprovado como módulo efetivamente selecionado. Impacto: versão, contrato e confiança atribuídos a outra fonte, contrariando C2/C3/C5/C8. Também alcança `hermes_cli/__init__.PYD` pelo mesmo scanner; este segundo caminho foi inspecionado, não executado.

Probe executado somente no scratch: `verifier12/head/.checks/probe-compiled-case.mjs`; resultado final `verifier12/compiled-case-result.json` traz pass:false, sentinelaausente e sem canário privado. Primeiro ensaio do scratch usou campo de handler inválido; ele já mostrava versão/suporte indevidos, mas não serve como prova de trusted. Corrigi somente o dado da fixture do probe para command válido; o resultado final acima é o observado. Nenhuma mudança de produto/teste versionado e nenhum Python/agente/hook executado.

Fonte primária lida como texto: [CPython v3.13.0, FileFinder](https://github.com/python/cpython/blob/v3.13.0/Lib/importlib/_bootstrap_external.py#L1682). Linhas físicas1682–1698 normalizam sufixos para minúsculas no Windows;1660–1662 selecionam o módulo no cache antes de continuar. Scratch `verifier12/bootstrap_external.py`, SHA256 `E4A5705DE0F740E98BD811A7D15EB09697B0783BF5DADD5263FC23EE6FF9E3DA`. A seção31 afirma que o vizinho com outra caixa é contado conservadoramente; essa afirmação não vale para o novo scanner. O probe e a fonte tornam o finding concreto dentro do fixdiff; não houve investigação de outra classe.

## C1–C18

Prefixo das provas: `tests/doctor/`. C = análise **carried from276138cc4af822510a10bb830e6f2984c2af5596**; V = alcance reavaliado na HEAD8b052343b027ad60f4f08a0580bcbfe5cb289855. Todos os testes nomeados citados existem e executaram na invocation atual; skips declarados. As linhas são da HEAD atual.

| Check | Prova executada / assertion localizada | Verdict |
| --- | --- | --- |
| C1 presença/ordem | presence-C1, presence.cli.test.mjs:37–45 três agentes/ordem fixa/absent/versionnull/executable_not_found | C PASS |
| C2 PATH/caminho/versão | agent-resolution-C2, agent-resolution.unit.test.mjs:166/171/176 versões exatas2.1.295/0.162.1/0.21.4; formal7-binding :1398 resultado/pacote do intérprete exatos. Probe compiled-case contradiz vínculo no Windows | V FAIL P2 |
| C3 inconclusivo/erros | agent-resolution-C3 :232 EACCES; formal7-binding :1363–1364 33casos/nenhum publicado; hermes-shadow :1557–1558 32casos/nenhum publicado. Casos lowercase passam, uppercase.PYD não é rejeitado | V FAIL P2 |
| C4 leitura/preservação | presence-C4, presence.cli.test.mjs:297 sentinelaausente/:300 snapshotAfter===snapshotBefore; scanner só lista nomes. Probe também não iniciou agente | V PASS |
| C5 evidência ligada | capability-evidence-C5, capability-evidence.cli.test.mjs:144/148 fonte/verified; novos hermes-shadow configuration-trust.cli.test.mjs:786–789 unverified/version_unresolved. Probe ainda concede cinco verified a pacote não ligado | V FAIL P2 |
| C6 três estados | capability-matrix-C6, capability-matrix.unit.test.mjs:110 configuration/:111–114 runtime not_performed/:121 toda matriznot_performed; vínculo não executa captura | V PASS |
| C7 matriz/exclusões | capability-matrix-C7, capability-matrix.unit.test.mjs:125–138 listas exatas5×4/:174 unverified/:177 exclusãonullcloud; hosted separado | C PASS |
| C8 configuração/trust | configuration-trust-C2/C5/C8/hermes-shadow :773–779 unknown/hooks_catalog_unavailable/unknown/configuration_not_determined; probe com command válido+consentimento ainda produz configured/trusted | V FAIL P2 |
| C9 coletor/identidade | collector-C9, collector.cli.test.mjs:31–32 reachable/identityVerifiedfalse/:48–50 unreachable/false/:71–72 IPv6 | C PASS |
| C10 entrada/timeout | collector-C10, collector.cli.test.mjs:86–87 unknown/endpoint_not_provided/:127 exit2; collector-probe.unit.test.mjs:65–69 connection_timeout e elapsed>=990/<3000 | C PASS |
| C11 paridade | envelope-C11, envelope.cli.test.mjs:32 JSONúnico/:34 semANSI/:101–118 fatos/motivos/origem/eventos; novos hermes-shadow configuration-trust.cli.test.mjs:793–799 motivos texto/JSON/sem catálogo afirmativo | V PASS; paridade não valida vínculo P2 |
| C12 envelope/isolamento | envelope-C12, envelope.cli.test.mjs:182–184 exit0/schema1/complete/:205–209 partial/3agentes; novos hermes-shadow configuration-trust.cli.test.mjs:766–767 exit0/3agentes; envelope-failure.unit.test.mjs:15–17 complete0/partial0/failed1 | V PASS; complete não prova C8 |
| C13 flags | envelope-C13, envelope.cli.test.mjs:252–259 quatroflags/exit0/proibidas ausentes/:273 cwdinválidoexit2/:285 reparo/install/coletaexit2 | C PASS |
| C14 limites/privacidade | leak-C14, leak-and-limits.cli.test.mjs:48–54 canárioausente/:111–113 limite/marker; mid-read-mutation.unit.test.mjs:96–97 tooLarge/conteúdoausente. Scanner não lê conteúdo do vizinho; CLI :799–803 semversões/caminhos do vizinho nos casos cobertos | V PASS |
| C15 snapshot/mutação | snapshot-C15, snapshot-concurrency.cli.test.mjs:56 stripTimestamp iguais/:59 after===before; mid-read-mutation.unit.test.mjs:264–265 versionnull/version_changed_during_read com shebang corrigido | V PASS |
| C16 fixtures/origens | presence-C16, presence.cli.test.mjs:274 version_profile_incompatible; configuration-trust-C16 :871–879 parcial/configunknown/demais preservados; capability-evidence.cli.test.mjs:379 nonLocal45/:396 sem origemfixture; fixture-manifest cenários declarados | V PASS |
| C17 docs | docs-C17, docs-compatibility.test.mjs:14 invocaçãoREADME/:15–17 partial/unverified/identityfalse/:40–42 contrato/inspeção/execução distintos. Docs descrevem intérprete/env/cwd/limites; ressalva de casefold incorreta destacada no P2, não prova de cobertura | V PASS com ressalva P2 |
| C18 governança/core | governance-C1/C3, scripts/governance-ci.test.mjs:263–277 matriz3SOs/comandos ci/governance/code-review/doctor;6governança+10motorPASS; cinco arquivos comuns byteiguais à base por gitdiffexit0 | V PASS |

## Limitações, preservação e gate

Perfil light: **no faults injected**; Coverage join/Testpolicy/faultinjection standard e comparação ui não executados. Swept relido, nenhuma linha existing a reinspecionar. Não se certifica cada membro nem poder discriminatório de toda assertion. MacOS e CIremota não executados; dois skips Windows explícitos. Linux/RED/GREEN externos não substituem minha prova. Sem baseline anterior executado nesta rodada, sem captura E2E/handlers/IPC/certificação TCP ou execuçãoPython/Rust/PE. EACCES por adaptador, EIO por inspeção, timeout simulado/relógio real, exit1 pela função pública e inacessibilidade por diretório são limitações **carried from276138c**. Alias/reflexão/exec e custo de columnOf em linha única longa continuam declarados; .pth/site do usuário/finders/mudança dinâmica de sys.path/PYTHONSAFEPATH não modelados. Dívidas stripCommentLines/realScriptPath e duplicaçãoCLI registradas pelo autor; nenhuma refatoração fora de escopo. CONTRIBUTINGausente herdado; nenhuma fonte deDownloads virou requisito.

Original iniciou HEAD8b052343b027ad60f4f08a0580bcbfe5cb289855/porcelainvazio. Core5 (`cli.mjs`, `review.mjs`, `review.test.mjs`, `schema.json`, `README.md`) semdiff contra4242520; task/AGENTS/core intactos no fixdiff; gitdiff--check passou. Após salvar reconferi HEADidêntica e apenas M `.checks/issue-3-agent-diagnostics.verified.md`. Nenhuma mutaçãoGit/stash/commit/push/PR/reviewrun/estadoformal/source/test/config pelo Verifier; escritas só relatório e scratch/cópia/fixtures autorizados. Histórico anterior preservado no Git.

**FAIL — 14/18 PASS, um P2 concreto bloqueante em C2/C3/C5/C8.** Suíte atual verde (395PASS/2skips) não cobre a variante uppercase.PYD comprovada. Rodada12 encerrada; correção/decisão/entrega com o orquestrador, sem nova rodada autônoma.
