# Issue 3 — Décima terceira verificação independente

**Verdict: PASS — 18/18.** **Profile:** light, no faults injected. **Round:** 13, scoped.
**Verified at:** `a770aee67b8950d69e6c8a6fb9147cd3b0c341c1`.
**Feature range:** `4242520dc6b70848bd0ac8acb7e00acdd1755c8a..a770aee67b8950d69e6c8a6fb9147cd3b0c341c1`.
**Fix diff:** `00cb167a5b38f182cf2ed214c1664b069708457e..a770aee67b8950d69e6c8a6fb9147cd3b0c341c1`.
**Verifier:** Codex independente, Claude autor; nenhuma implementação pelo Verifier.

## Escopo e herança

Autorização humana vigente das revisões necessárias registrada no checkpoint Linux; AGENTS/TLC/references verify e perfil light já conferidos. Task/checklist, build32, último checkpoint, FAIL12 e fixdiff lidos. **Carried from `8b052343b027ad60f4f08a0580bcbfe5cb289855`**, FAIL12 preservado em `00cb167a5b38f182cf2ed214c1664b069708457e`: intenção, critérios/fontes/análises não afetadas e limitações. Todos18 critérios permanecem obrigatórios; todas as provas são novas nesta HEAD. Reavaliados P2/C2/C3/C5/C8 e blast do scanner/encaminhamento da plataforma; nenhuma investigação de classe fora do fixdiff, nenhum probe duplicado. GuiaDownloads não vinculante; task/AGENTS/core não mudaram.

`windowsFoldedSuffix` (`hermes.mjs:191–194`) conserva a base antes do primeiro ponto e normaliza o restante somente com platform win32; `hasCompiledSibling:209` usa essa forma no matcher. Isso corresponde à fonte primária CPython lida na rodada12, **carried from8b052343**: [FileFinder v3.13.0](https://github.com/python/cpython/blob/v3.13.0/Lib/importlib/_bootstrap_external.py#L1682), linhas físicas1682–1698 e1660–1662, SHA256 `E4A5705DE0F740E98BD811A7D15EB09697B0783BF5DADD5263FC23EE6FF9E3DA`. Nenhum Python executado. CLI fornece process.platform (`cli.mjs:64–68`); run-diagnostics:86 e agent-resolution:65–68/131 encaminham até o leitor. Outros agentes conservam suas decisões.

Quatro variantes na própria camada (.PYD, .PyD, ABI maiúsculo e __init__.PYD) exigem resultado inconclusivo exato/nenhum packageDir/nenhuma leitura do vizinho. Seis controles exigem o pacote exato ligado: quatro POSIX, base maiúscula preservada e platform ausente. A fronteira CLI reproduz o cenário com consentimento válido: present/versãonull, cinco unverified, configurationunknown/trustunknown, três agentes/exit0, paridade texto/JSON e sentinelaausente. O P2 do FAIL12 está fechado por essas provas atuais, não pelo self-report do autor.

## Provas nesta HEAD

Original iniciou com HEAD exata/porcelainvazio. Archive ignorado em `.checks/code-review/verifier13/head`, node_modules local copiado, sem instalação. Executei **uma invocation completa `npm.cmd test`**, com escalonamento autorizado para fixtures Git: governança6 PASS, motor10 PASS, doctor384 contabilizados/382 PASS/2 skips. **400 contabilizados; 398 PASS, 0 FAIL, 2 skips; exit0.** Windows/Node24.21.0/npm11.19.0.

Log `verifier13/npm-test.txt` identifica cada teste. Nomes de prova dos18 checks conferidos como presentes/executados; os três novos constam nas linhas111/112/287, com assertions locais inspecionadas. Skips nas linhas54/71: arquivo real no PATH/ENOTDIR e symlink real Codex, exclusivosPOSIX. Adaptadores desses cenários executaram; novaCLI uppercase.PYD executou noWindows. Autor398PASS/2skips, LinuxRoot399PASS/1skipWindows e RED/GREEN são complementares, não minhas execuções. Nenhuma suíte verde/probe repetido; baseline anterior não executado por mim nesta rodada.

## C1–C18

Prefixo das provas: `tests/doctor/`. C = análise **carried from8b052343b027ad60f4f08a0580bcbfe5cb289855**; V = alcance **verified at a770aee67b8950d69e6c8a6fb9147cd3b0c341c1**. Todas as provas citadas executaram agora; linhas conferidas/atualizadas nos arquivos tocados.

| Check | Prova / assertion localizada | Verdict |
| --- | --- | --- |
| C1 presença/ordem | presence-C1, presence.cli.test.mjs:37–45 três agentes/ordem fixa/absent/versionnull/executable_not_found | C PASS |
| C2 PATH/caminho/versão | agent-resolution-C2, agent-resolution.unit.test.mjs:166/171/176 versões exatas2.1.295/0.162.1/0.21.4; novos :1731–1732 quatro variantes/nenhum publicado e :1786–1787 seis controles/nenhum vínculo perdido; CLI :833–837 present/caminhoexato/versãonull | V PASS; P2 fechado |
| C3 inconclusivo/erros | agent-resolution-C3 :232 EACCES; formal7-binding :1363–1364 33casos/nenhum publicado; hermes-shadow :1731–1732 nenhuma versão/pacote diante do sufixo Windows. Resultado SHADOW_UNBOUND exato e neighborReads vazio conferidos :1726–1728 | V PASS; P2 fechado |
| C4 leitura/preservação | presence-C4, presence.cli.test.mjs:297 sentinelaausente/:300 inventárioigual; novaCLI configuration-trust.cli.test.mjs:865 sentinelaausente; normalização só processa nomes retornados | V PASS |
| C5 evidência ligada | capability-evidence-C5, capability-evidence.cli.test.mjs:144/148 fonte/verified; novaCLI configuration-trust.cli.test.mjs:844–849 cinco unverified/version_unresolved/sem verified; pacote não atribuído pela camada | V PASS; P2 fechado |
| C6 três estados | capability-matrix-C6, capability-matrix.unit.test.mjs:110 configuration/:111–114 runtime not_performed/:121 toda matriznot_performed; novaCLI separa estados :838–847 | V PASS |
| C7 matriz/exclusões | capability-matrix-C7, capability-matrix.unit.test.mjs:125–138 listas exatas5×4/:174 unverified/:177 exclusãonullcloud; hosted separado | C PASS |
| C8 configuração/trust | configuration-trust-C2/C5/C8/hermes-shadow uppercase.PYD :838–841 unknown/hooks_catalog_unavailable/unknown/configuration_not_determined, mesmo com command válido e hooks_auto_accept:true | V PASS; P2 fechado |
| C9 coletor/identidade | collector-C9, collector.cli.test.mjs:31–32 reachable/identityVerifiedfalse/:48–50 unreachable/false/:71–72 IPv6 | C PASS |
| C10 entrada/timeout | collector-C10, collector.cli.test.mjs:86–87 unknown/endpoint_not_provided/:127 exit2; collector-probe.unit.test.mjs:65–69 connection_timeout e elapsed>=990/<3000 | C PASS |
| C11 paridade | envelope-C11, envelope.cli.test.mjs:32 JSONúnico/:34 semANSI/:101–118 fatos/motivos/origem/eventos; novaCLI :851–860 motivos equivalentes texto/JSON e sem catálogoafirmativo | V PASS |
| C12 envelope/isolamento | envelope-C12, envelope.cli.test.mjs:182–184 exit0/schema1/complete/:205–209 partial/3agentes; novaCLI :830–831 exit0/trêsagentes; envelope-failure.unit.test.mjs:15–17 complete0/partial0/failed1 | V PASS |
| C13 flags | envelope-C13, envelope.cli.test.mjs:252–259 quatroflags/exit0/proibidas ausentes/:273 cwdinválidoexit2/:285 reparo/install/coletaexit2 | C PASS |
| C14 limites/privacidade | leak-C14, leak-and-limits.cli.test.mjs:48–54 canárioausente/:111–113 limite/marker; mid-read-mutation.unit.test.mjs:96–97 tooLarge/conteúdoausente; novaCLI :862–863 semversões/caminhos do vizinho | V PASS |
| C15 snapshot/mutação | snapshot-C15, snapshot-concurrency.cli.test.mjs:56 stripTimestamp iguais/:59 after===before; mid-read-mutation.unit.test.mjs:264–265 versionnull/version_changed_during_read; scanner não cria estado/cache | V PASS |
| C16 fixtures/origens | presence-C16, presence.cli.test.mjs:274 version_profile_incompatible; configuration-trust-C16 :934–942 parcial/configunknown/demaispreservados; capability-evidence.cli.test.mjs:379 nonLocal45/:396 sem origemfixture; novos casos são fontes sintéticas explícitas | V PASS |
| C17 docs | docs-C17, docs-compatibility.test.mjs:14 invocaçãoREADME/:15–17 partial/unverified/identityfalse/:40–42 contrato/inspeção/execução distintos; docs/agent-compatibility.md:53 e build32 registram sufixo Windows/baseexata/POSIX e supersessão da frase incorreta da seção31 | V PASS |
| C18 governança/core | governance-C1/C3, scripts/governance-ci.test.mjs:263–277 matriz3SOs/comandos ci/governance/code-review/doctor;6governança+10motorPASS; core5 byteigualbase por gitdiffexit0 | V PASS |

## Limitações e preservação

**Light, no faults injected**; Coverage join/Testpolicy/faultinjection standard e comparação ui não executados. Swept relido, nenhuma linha existing; light não certifica cada membro nem poder discriminatório de toda assertion. MacOS/CIremota não executados; skipsWindows explícitos, provasLinux externas. Sem capturaE2E/handlers/IPC/certificaçãoTCP ou execuçãoPython/Rust/PE. Limitações anteriores de EACCES por adaptador/EIO por inspeção/timeout simulado/relógio real/exit1 pela função pública/inacessibilidade por diretório, CONTRIBUTINGausente e fontes/ACs não alterados são **carried from8b052343**.

O default de resolveHermesVersion sem platform é **POSIX exato**, não uma prova conservadora de contexto Windows desconhecido. O teste de ausência documenta esse contrato interno; a CLI fornece a plataforma e sua prova Windows atravessa o encaminhamento. PYTHONCASEOK não modelado. .pth/site do usuário/finders/mudança dinâmica de sys.path/PYTHONSAFEPATH, alias/reflexão/exec e custo anterior de columnOf em linha única longa permanecem limites declarados, sem novas alegações. Dívidas stripCommentLines/realScriptPath/repetiçãoCLI mantidas; não houve refatoração fora do escopo.

HEAD iniciou e terminou `a770aee67b8950d69e6c8a6fb9147cd3b0c341c1`; depois do relatório, somente M `.checks/issue-3-agent-diagnostics.verified.md`. Core5 (`cli.mjs`, `review.mjs`, `review.test.mjs`, `schema.json`, `README.md`) byteigual4242520; gitdiff--check passou. Nenhuma escrita em source/test/task/checklist/AGENTS/config/core/.git/estadoformal pelo Verifier; semstash/instalação/commit/push/PR/reviewrun/agentesextra. Escritas só no relatório e scratch/cópia/fixtures autorizados. FAIL12/histórico preservados no Git.

**PASS — 18/18; 398 PASS, 0 FAIL, 2 skips** na invocation independente da HEAD a770aee. ÚnicoP2 anterior fechado; nenhum gap bloqueante concreto remanescente no escopo revisto. Rodada13 encerrada; formal8/entrega com o orquestrador, sem nova rodada autônoma.
