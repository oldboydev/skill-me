# Issue 3 — Verificação independente do diagnóstico local

**Verdict**: FAIL
**Profile**: light
**Diff range**: `4242520dc6b70848bd0ac8acb7e00acdd1755c8a..8a4304f95e4aab73ba603fe5a3f4f5b0ccf4fc96`
**Round**: 1 — full
**Verifier**: subagente Codex independente; produto e testes escritos por Claude; nenhuma correção aplicada.
**Checks**: 14/18 PASS; C7, C11, C15 e C16 FAIL. Todas as conclusões abaixo foram verificadas nesta versão.

## Fontes e limites do perfil

AGENTS.md, `.tasks/issue-3-agent-diagnostics.md` (313 linhas), `.checks/issue-3-agent-diagnostics.md` (260 linhas), o self-report `.build.md` (324 linhas) e `references/verify.md` foram lidos integralmente. O self-report não foi usado como prova de execução. `references/checklist-format.md` também foi lido porque o checklist o identifica como vinculante para seu formato.

| Fonte | Aberta | Correspondência / limitação |
| --- | --- | --- |
| Issue #3, `https://github.com/oldboydev/skill-me/issues/3` | Sim, conector GitHub `fetch_issue`; tentativa inicial `gh issue view` falhou por rede do sandbox | AC1 → C1–C4; AC2 → C5–C6; AC3 → C7–C8; AC4 → C9–C10; AC5 → C11–C14; AC6 → C15–C17. Aprovação “ok atualize com a main e pode implementar” confirmada no corpo. |
| Task aprovada | Sim | C7 exige informar que hosted tools ficam fora dos hooks locais; não autoriza tratar cloud/desktop inteiros como indisponíveis. C11 exige os mesmos fatos e códigos. C15 cobre mutações detectadas na leitura. C16 exige cenários por CLI. |
| Checklist completo | Sim | C7 ainda afirma hosted tools `unavailable`, mas sua prova passou a testar cloud genérica `unverified`. Essa equiparação não vem da task; sua correção exige preservar a exclusão de hosted tools, sem mudar a task. |
| AGENTS.md | Sim | Profile light; revisão somente leitura; rigor de comportamento; preservação do motor. |
| CONTRIBUTING | Procurado em raiz, `.github/` e `rg --files --hidden -g '*CONTRIBUTING*' -g '!.git' -g '!node_modules'` | Não existe nesta versão; nenhuma regra dessa fonte foi presumida. |
| Guia em Downloads | Não usado | Não é spec vinculante. |

Comparação visual de fontes (`ui`), recomputação formal do join Coverage e verdicts de Test policy (`standard`/`ui`) não foram executados: perfil light. Não há fonte visual vinculante nem seção Test policy. A revisão ainda conferiu os gaps de nível/amostragem relevantes às claims e leu Swept: não há linha Swept marcada `existing`; todas remetem a critérios ou a decisões `n/a`/fora do escopo.

## Execução independente e isolamento

O original começou em HEAD `8a4304f95e4aab73ba603fe5a3f4f5b0ccf4fc96`, porcelain vazio. Foi criado um ZIP com `git archive HEAD`, extraído em diretório temporário, e `node_modules` foi copiado para essa cópia. Nenhum stash, alteração de produto/teste, commit, push, PR ou nova issue foi feito.

O TEMP do sandbox muda entre chamadas; a primeira cópia não pôde ser reutilizada em outra chamada. Uma tentativa com argumento de archive malformado falhou antes de executar testes; foi corrigida no próprio comando de preparação, sem mudança no repositório. A primeira execução efetiva no sandbox atingiu uma restrição de escrita em `.git/config` de repositórios temporários dos testes de governança/motor. Não é evidência de defeito de produto nem de sucesso. A repetição autorizada com escalonamento apenas para as provas na cópia temporária resolveu essa restrição.

As três provas foram agrupadas por target, uma invocação completa por target, na mesma cópia isolada. Node `v24.21.0`, npm `11.19.0`, Windows. O runner nomeou individualmente os testes; nenhuma seleção vazia foi aceita como verde.

| Target / comando realmente executado | Resultado independente |
| --- | --- |
| `npm run test:governance` | 6 testes, 6 PASS, 0 FAIL, 0 skips; exit 0 |
| `npm run test:code-review` | 10 testes, 10 PASS, 0 FAIL, 0 skips; exit 0 |
| `npm run test:doctor` | 138 testes, 137 PASS, 0 FAIL, 1 skip; exit 0 |

O skip foi `agent-resolution-C2 realpath/symlink real liga o launcher do Codex ao pacote (POSIX)`, em `tests/doctor/agent-resolution.unit.test.mjs:413`, com condição `process.platform === "win32"`. Não afirmei tê-lo executado. Os casos parametrizados win32/linux/darwin rodaram, mas isto não comprova execuções reais em Linux/macOS. A matriz CI foi comprovada pela asserção de workflow; ainda não existe prova nesta rodada de runs remotos nos três SOs.

Todas as provas nomeadas no checklist foram encontradas e seus nomes apareceram como executados nos targets acima (exceto o skip declarado). A busca de localização foi feita com `rg -n -C 3 'assert\.|test\('` por grupo de arquivos e `rg -n 'assert\.|test\('` nos demais. Os testes do produto citados são novos no range inteiro; governança e motor são preservação exigida por C18.

## Checks

As referências são relativas à raiz do repositório e têm números de linha desta HEAD. `doctor` abaixo designa a invocação completa `npm run test:doctor` com exit 0; cada grupo nomeado apareceu individualmente no runner. PASS não afirma captura real, instalação de agente ou runtime verificado.

| Check | Claim / prova que rodou | Asserção localizada que resolve a claim | Resultado |
| --- | --- | --- | --- |
| C1 | Ausentes, ordem, null, motivo, texto, exit; `presence-C1` e inventário unitário em doctor | `tests/doctor/presence.cli.test.mjs:47` — `assert.equal(report.agents.length, 3)`; :53–55 — presença `absent`, versão `null`, motivo `executable_not_found`; :60 — texto por agente; `tests/doctor/agent-resolution.unit.test.mjs:110` — IDs literais `["claude", "codex", "hermes"]`. | PASS |
| C2 | Resolução reconhecida, fontes, versões, PATH, espaços/Unicode, três convenções; `presence-C2`, `agent-resolution-C2` | `tests/doctor/agent-resolution.unit.test.mjs:117`, :122, :127 — versões literais `2.1.295`, `0.162.1`, `0.21.4`; :118/:123/:128 — fontes respectivas; :148 — `assert.equal(claude.path, dirFirst + "/" + claudeName)`; :164 — caminho Unicode. Um symlink real foi skipped, declarado acima. | PASS |
| C3 | Presente sem versão/launcher ambíguo, acesso unknown e continuação; `presence-C3`, `agent-resolution-C3` | `tests/doctor/presence.cli.test.mjs:134`–136 — `present`, `null`, `version_unreadable`; :189–191 — ambiguidade; `tests/doctor/agent-resolution.unit.test.mjs:182`–187 — Codex `unknown/EACCES`, outros `present`; :216–217 — launcher alheio `null/launcher_not_recognized`. Acesso é simulado na própria camada conforme limitação do checklist. | PASS |
| C4 | Não executar launchers nem alterar perfil/config/skills; `presence-C4`, `agent-resolution-C4` | `tests/doctor/presence.cli.test.mjs:243` — `assert.throws(() => statSync(sentinelPath))`; :246 — `assert.deepEqual(snapshotAfter, snapshotBefore)`. O inventário inclui SHA256 em `tests/doctor/helpers/fs-inventory.mjs:18`; leitura estática do código confirma ausência de execução/import de agentes e leitura de transcripts. | PASS |
| C5 | Support/motivo/origem e conservadorismo de versão/documentação; `capability-matrix-C5`, `capability-evidence-C5` | `tests/doctor/capability-matrix.unit.test.mjs:46` — `assert.equal(row.support, "unverified")`; :61 — documentação não `verified`; :71 — origem `fixture`; `tests/doctor/capability-evidence.cli.test.mjs:37` — nenhuma capacidade `verified` só por versão conhecida na CLI. Presença de objeto evidence e motivo também afirmados em :32–34 do unitário. | PASS |
| C6 | Configuration/runtime/support separados; `capability-matrix-C6` | `tests/doctor/capability-matrix.unit.test.mjs:89` — `assert.equal(row.configuration, configuration)` para os cinco estados; :90–93 — runtime exatamente `not_performed`; :100 — todas as linhas do Codex `not_performed`. Texto/limitações do modelo registram ausência de execução real. | PASS |
| C7 | Cinco mecanismos × quatro superfícies; superfície distinta e SkillStart conservador; `capability-matrix-C7` | `tests/doctor/capability-matrix.unit.test.mjs:104`–117 — listas literais de mecanismos/superfícies; :136 — outras superfícies não `verified`; :153–155 — cloud genérica `unverified`, não `unavailable`; :173–177 — SkillStart não `verified`. Essas asserções NÃO provam a exclusão específica de hosted tools. Probe independente encontrou zero informação dessa exclusão no texto/JSON. | **FAIL — G2** |
| C8 | Configuração/precedência/confiança, sem consentimento inferido; `config-projection-C8`, `scope-merge-*`, `trust-resolution-*`, `configuration-trust-C8`, `config-reader-*`, `config-sources-*` | `tests/doctor/configuration-trust.cli.test.mjs:57`–58 — `disabled/not_applicable`; :98–100 — conflito de projeto `unknown/policy_precedence_undetermined`, nunca disabled; :137–139 — Hermes `configured/trusted/hooks_auto_accept_enabled`; `tests/doctor/config-projection.unit.test.mjs:110` — malformada `invalid`; `tests/doctor/scope-merge.unit.test.mjs:99`–100 — política ilegível unknown; `tests/doctor/trust-resolution.unit.test.mjs:88` — evidência nativa reconhecida `untrusted`. | PASS |
| C9 | Transporte local IPv4/IPv6, recusa, identidade false; `collector-C9` | `tests/doctor/collector.cli.test.mjs:31`–32 — `reachable`, identidade false; :48/:50 — `unreachable`, false; :71–72 — IPv6 reachable/false. Leitura de `src/doctor/collector-probe.mjs:33`–56 confirma conexão e destroy sem chamada de envio de payload. Os testes atuais não contam bytes; essa parte foi conferida por inspeção, não alegada como asserção de rede. | PASS |
| C10 | Ausente/entrada recusada/1000ms e continuação; `collector-C10`, `collector-probe-C10` | `tests/doctor/collector.cli.test.mjs:86`–87 — unknown/endpoint_not_provided; :127–129 — endpoints inválidos exit 2/failed/não reachable; `tests/doctor/collector-probe.unit.test.mjs:65`–69 — unreachable/connection_timeout/false e tempo real `>=990`, `<3000`; :84 — abort true. Timeout usa connect injetado, não firewall real, conforme limitação aprovada. | PASS |
| C11 | JSON único e paridade de fatos/códigos com texto; `envelope-C11` | `tests/doctor/envelope.cli.test.mjs:31`–33 — JSON único parseável, sem ANSI; :55–56 — só verifica ausente/não verificado. Nenhuma asserção compara fatos/códigos por capacidade, caminho ou origem com o texto. Probe real independente demonstrou a omissão. | **FAIL — G1** |
| C12 | Envelope completo/parcial/failed e exits; `envelope-C12`, `envelope-failure-C12` | `tests/doctor/envelope.cli.test.mjs:68`–70 — exit 0/schema 1/complete; :91–95 — exit 0/partial/três agentes/Codex preservado; :120–124 — exit 2/schema 1/failed/sem stack; `tests/doctor/envelope-failure.unit.test.mjs:15`–17 — complete 0, partial 0, failed 1; :30 — erro inesperado vira exit 1. Exit interno 1 provado na função usada pela CLI, não processo real. | PASS |
| C13 | Ajuda/flags/defaults/sem inspeção/exits; `envelope-C13` | `tests/doctor/envelope.cli.test.mjs:138`–145 — help exit 0, flags presentes e reparo/instalação/coleta ausentes; :159–160 — cwd inexistente exit 2 e erro legível; :171 — flags proibidas exit 2. Defaults e retorno antecipado sem diagnóstico conferidos em `src/doctor/cli-args.mjs:28` e `src/doctor/cli.mjs:48`–52; não foi alegada uma asserção de instrumentação para a ajuda. | PASS |
| C14 | Sem canários/dados brutos, limites, YAML seguro, PE limitado; `leak-C14`, `config-projection-C14`, `version-metadata-*`, regressões adicionais | `tests/doctor/leak-and-limits.cli.test.mjs:48`–54 — canário ausente nas duas saídas; :111–113 — unknown/input_too_large/sem conteúdo; `tests/doctor/config-projection.unit.test.mjs:120`–123 — tag insegura invalid/unsafe_yaml_tag/sem interpolação; :165–167 — 1 MiB exato aceito; `tests/doctor/version-metadata.unit.test.mjs:67`–70 — versão literal correta e leitura abaixo do limite; `tests/doctor/mid-read-mutation.unit.test.mjs:93`–95 — teto efetivo/content undefined. | PASS |
| C15 | Concorrência sem estado e mutações detectadas inconclusivas; `snapshot-C15`, `mid-read-mutation-*` | `tests/doctor/snapshot-concurrency.cli.test.mjs:52`–59 — ambas exit 0, fatos iguais sem timestamp e inventário igual; `tests/doctor/mid-read-mutation.unit.test.mjs:131`–132 — configuração unknown/config_changed_during_read. A prova só fecha configuração; `readBoundedText` descarta a detecção em metadata textual. Probe independente confirmou changed=true → state=ok. | **FAIL — G3** |
| C16 | Suíte por CLI inclui versão sem perfil e config inacessível; `fixture-suite-C16` e cenários da suíte | `tests/doctor/fixture-suite-inventory.test.mjs:21` — origem fixture; :37–46 — nomes dos três SOs e arquivo parametrizado; :50–51 — sem E2E/payload privado. `tests/doctor/capability-matrix.unit.test.mjs:46` prova versão incompatível apenas na camada com booleano injetado; `tests/doctor/scope-merge.unit.test.mjs:99` prova acesso apenas na camada pura. Buscas na suíte de CLI não localizaram os dois cenários obrigatórios. | **FAIL — G4** |
| C17 | Documentação de fontes/data/versão/superfície/evidência/lacunas e README; `docs-C17` | `tests/doctor/docs-compatibility.test.mjs:14`–17 — comando e estados exigidos; :32 — colunas exigidas; :40–42 — três níveis de evidência. Conteúdo do documento foi lido para confirmar as linhas por agente, sem usar só títulos como prova de exatidão. | PASS |
| C18 | Governança/motor/CI preservados, suite nova/matriz, core intacto | `scripts/governance-ci.test.mjs:263`–277 — matriz literal e comandos dos três targets; :279–281 — nome CI/always/needs corretos. 6/6 e 10/10 executados independentemente. SHA256 de archives base/head confirma os cinco arquivos comuns byte-iguais (tabela abaixo). `package.json` permanece private; sem publicação/main/merge nesta verificação. | PASS |

## Gaps ranqueados

### G1 — C11: texto perde fatos/códigos relevantes (defeito de produto e prova)

**Cenário**: executar as duas formas sobre a mesma instalação reconhecida. **Esperado**: caminho do artefato e cobertura por mecanismo/superfície com seus motivos e origem são consumíveis nas duas formas, conforme task C11/AC5. **Atual**: `src/doctor/render-text.mjs:44`–51 converte toda a matriz em contagens; :28–43 também não imprime `agent.path`. Mecanismos, superfícies, motivos/evidência e configuração por linha ficam somente no JSON. **Impacto**: quem lê texto não consegue identificar por que um mecanismo não foi verificado ou onde o agente foi encontrado; as saídas não apresentam os mesmos fatos.

**Reprodução independente na cópia isolada**: fixtures dos três agentes, duas invocações reais da CLI, ambas exit 0. JSON de Claude tinha path, `skill_usage_signal`, `cli_local` e `no_local_evidence`; `text.stdout.includes(...)` retornou false para os quatro. `envelope-C11` permanece verde porque suas asserções :55–56 não comparam esses fatos. Falta prova de paridade relevante, incluindo os estados desconhecido/indisponível além das duas palavras hoje amostradas.

### G2 — C7: exclusão de hosted tools não aparece no relatório

**Cenário**: diagnóstico do Codex CLI. **Esperado**: informar a exclusão documentada de hosted tools dos hooks locais (task C7/AC3), distinguindo-a de IDE/desktop/cloud não inspecionados. **Atual**: `src/doctor/capability-matrix.mjs:1`–17 tem apenas mecanismos genéricos/superfícies e comentário sobre a distinção; `src/doctor/run-diagnostics.mjs:9`–16 emite somente limitações de runtime/identidade. Nenhuma linha/limitação/evidência comunica essa exclusão específica. **Impacto**: consumidor não aprende uma lacuna de cobertura explicitamente exigida.

**Prova independente**: `/hosted/i.test(json.stdout)` e `/hosted/i.test(text.stdout)` retornaram false nas duas formas da CLI. Busca `rg -n 'hosted' src/doctor docs/agent-compatibility.md` encontrou somente comentário no módulo da matriz. O teste em `tests/doctor/capability-matrix.unit.test.mjs:146`–155 corretamente mantém cloud genérica `unverified`; ele não substitui uma prova da exclusão de hosted tools. A frase do checklist sobre unavailable não deve ser corrigida transformando cloud inteira em unavailable, nem a task alterada para acompanhar o código.

### G3 — C15: mutação detectada de metadata textual é descartada

**Cenário**: pacote/shim/source_literal muda de tamanho durante a leitura limitada; `readSnapshot` detecta a divergência. **Esperado**: resultado inconclusivo/limitação, sem publicar metadado como se a leitura fosse estável (task C15). **Atual**: `src/doctor/snapshot-read.mjs:67`–68 retorna `state: "ok"` e texto sem consultar/propagar `snapshot.changedDuringRead`. Os consumidores `src/doctor/launcher-link/codex.mjs:23` e `src/doctor/launcher-link/hermes.mjs:18` usam esse wrapper para versões. **Impacto**: metadado lido durante uma alteração detectada pode ser apresentado como uma versão normal, enquanto a configuração corretamente fica unknown.

**Prova independente**: adaptador de leitura posicional devolvendo JSON de pacote e `stat.size = content.length + 1`; `assert.equal(snapshot.changedDuringRead, true)` passou; wrapper retornou `{state: "ok"}` sem campo changedDuringRead. Não houve mutação de produto: foi uma entrada sintética em cópia isolada. A suíte tem :131–132 do teste de mid-read para configuração, mas não o wrapper nem os consumidores de metadata.

### G4 — C16: faltam dois cenários na fronteira real da CLI (gap de nível)

**Esperado**: testes por CLI para versão reconhecida sem perfil compatível e configuração inacessível, além de ausente/desabilitado/malformada/coletor inacessível. **Atual**: o inventário prova declaração de origem, existência de arquivos e nomes de plataformas. Não prova execução dos dois cenários na CLI. A versão `9.9.9` vista em `presence.cli.test.mjs:212` pertence a launcher alheio não reconhecido; asserções :219–221 cobrem `launcher_not_recognized`, não `version_profile_incompatible`. Acesso de C3 em unitário não demonstra configuração inacessível por CLI.

**Busca realizada**: `rg -n -C 2 'inacess|EACCES|incompat|version_profile|999|9\.9|malform|disabled' tests/doctor -g '*.cli.test.mjs'` mostrou recursos disabled, política unknown e launcher alheio; nenhum teste da CLI com config inacessível nem perfil de versão incompatível. A busca geral de asserções localizou esses comportamentos apenas nos unitários citados em C16. **Impacto**: um erro de montagem/projeção desses dois estados pode passar apesar do inventário verde. A limitação de permissão real de C3 é válida para aquela camada; não fecha silenciosamente a claim distinta da task C16.

## Limitações de provas e amostragem

- Perfil light: sem fault injection; nenhuma mutação de produto realizada. As entradas sintéticas independentes reproduzem falhas de comportamento sem alterar código.
- Acesso real por permissão de C3, política gerenciada, timeout de rede/firewall e falha interna exit 1 têm as limitações de nível declaradas no checklist. Os unitários respectivos rodaram e o vínculo aos consumidores foi lido. Não aleguei E2E dessas falhas.
- C9 tem asserções de status/identidade com socket real; zero envio de payload foi conferido por inspeção da única função de conexão, sem contagem de bytes na suíte. C13 foi conferido com teste CLI e leitura do retorno antecipado/defaults, sem alegar instrumento de filesystem no help.
- C1–C18 recebem evidência localizada mesmo quando FAIL: a localização mostra o que o teste efetivamente afirmou, e não transforma prova parcial em prova da claim inteira.
- C7/C11/C15/C16 são gaps acima; eles não foram mascarados pelas 137 aprovações da suíte. O join Coverage do checklist permanece self-report e não foi recomputado formalmente neste perfil.

## Paridade byte a byte do motor

SHA256 calculado pelo Verifier sobre cada arquivo extraído dos dois archives, base e HEAD, na mesma sessão; ambos os lados produziram o hash abaixo e comparação True.

| Arquivo comum `scripts/code-review/` | SHA256 base = HEAD |
| --- | --- |
| cli.mjs | `D69974087A3B43FCCF482E5F5B56C19F96FED60652B8985E7A9C298F061AE61E` |
| review.mjs | `88508699ED5AB33F81BA438E229CD1A5DA3DE71FCD0EFFCFBD162CF7CF0E0CB6` |
| review.test.mjs | `67247DB5701B1F71337D428BF0103B5BFA0435E5EF85C53E5A93D73E5D21D621` |
| schema.json | `A11E040A7061447C1E0D516E31919DA0D2821E012C6C44F27A56634228C6A467` |
| README.md | `5F1998DB4621A09396920C37DC8AA4267C4DEF33F028F9945EF717DB8E8C0064` |

`git diff --exit-code <base> -- <cinco arquivos>` também retornou 0. HEAD e porcelain original foram reconferidos antes deste relatório: mesmo HEAD, vazio. Após a escrita, o Verifier reconferiu HEAD (a mesma) e porcelain: somente `?? .checks/issue-3-agent-diagnostics.verified.md`; nenhuma alteração de produto/teste. A revisão formal `review:run` é etapa do orquestrador, não foi substituída pelo target test:code-review.

## Gate

Targets: **153 PASS, 0 FAIL, 1 skip** na repetição isolada bem-sucedida (6 governança + 10 motor + 137 doctor). **Gate FAIL**: C7/C11/C15/C16 não estão totalmente provados e três deles têm falhas de comportamento demonstradas. Nenhuma aprovação, merge ou entrega liberada por este relatório.
