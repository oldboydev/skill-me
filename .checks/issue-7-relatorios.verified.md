# Issue #7 — verificação independente do relatório

**Verdict**: PASS — C1–C10: 10/10 comprovados; exceção local do core autorizada e explícita.
**Profile**: light.
**HEAD**: a404779047c62cdb6f5410f6c820e862b19bd645.
**Diff range**: a1f855b..a404779 (entrega); 3bc5456..a404779 (desde a verificação anterior).
**Round**: 14 — scoped; provas de produto repetidas no HEAD.
**Verifier**: subagente independente; somente este arquivo foi editado.

## Fontes e alcance

Li AGENTS.md atualizado, `C:\Users\paulo\.agents\skills\tlc-implement\references\verify.md`, `.tasks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.md`, `.checks/issue-7-relatorios.build.md`, a verificação anterior FAIL e `.checks/code-review/issue-7/context.json` com a issue e cinco comentários. Examinei o diff completo a1f855b..HEAD e o diff integral 3bc5456..HEAD. O diff recente só documenta a decisão do proprietário em AGENTS.md, README.md, guia do motor e build; não altera produto, testes, configuração ou limite do motor. O guia `AGENT_SKILL_DEBUGGER_SPEC` citado na issue é expressamente não vinculante. O checklist não contém `Coverage` ou `Test policy`; comparação de interface e injeção de falhas são etapas dos perfis standard/ui, não do light.

## Provas executadas no HEAD

- `node --test tests/integrations/report/*.test.mjs`: exit 0, **50/50 PASS**, 0 falhas, 0 skips. O runner listou T7-C1 a T7-C10.
- `npm run test:governance`: exit 0, **6/6 PASS**, 0 falhas, 0 skips.
- `node --test --test-name-pattern="C6 limite de rodadas" scripts/code-review/review.test.mjs`: exit 0, **1/1 PASS**, 0 falhas, 0 skips, com TEMP/TMP apontando para `.checks` do workspace. A primeira tentativa falhou antes das asserções: o sandbox negou escrita em `.git/config` no Temp do Windows. Não a contei como prova verde.
- `git diff --check a1f855b..HEAD` e `git diff --check 3bc5456..HEAD`: exit 0.

As asserções de C1–C10 foram localizadas nos testes. Como os testes e a implementação do relatório não mudaram desde 156c20e, os julgamentos de conteúdo abaixo são **carried from 156c20e**, com todas as provas repetidas em a404779.

| Check | Asserção decisiva | Resultado |
| --- | --- | --- |
| C1 | `skill-source.unit.test.mjs:31–38`: `observed.identification === "observed_name"`, SHA-256 dos bytes, `[[2,"Build"]]`, `explicit_path/false`, bytes e mtime inalterados; `report.e2e.test.mjs:67–68`: nome Unicode e fonte nativa. | PASS |
| C2 | `instructions.unit.test.mjs:14–18`: vetor exato de tipos/linhas/headings e comandos, `existsSync(marker) === false`; `:58–61`: subitem aninhado separado. | PASS |
| C3 | `skill-source.unit.test.mjs:74–88`: `assert.rejects` exige códigos fechados para ausência, ambiguidade, não regular, UTF-8 inválido e 1 MiB + 1; `report.cli.test.mjs:48–51` impede eco. | PASS |
| C4 | `evaluate.unit.test.mjs:22–26`: estados exatos, linhas, eventos `[1,2]`, `guidance_not_step`, motivo e SHA-256. | PASS |
| C5 | `evaluate.unit.test.mjs:37–39`: `sufficient/contradicted/partial/unobserved` e leitura sem atribuição; `:120–122`, `:148–154`, `:164–166`, `:172–173` distinguem conflito, contextos, múltiplos comandos e bash literal. | PASS |
| C6 | `evaluate.unit.test.mjs:83–85`: `not_applicable/inconclusive/sufficient` e correção `{failed:[3,4],corrected:[5,6]}`; `:204–207` rejeita sobreposição; `:262–275` exige gatilho e ordem; `:284–286` conserva correção antes de tentativa aberta. | PASS |
| C7 | `render.unit.test.mjs:14–21`: hash/linha/evento/contrato/timeline/limites, sem percentual ou raciocínio privado; `:55–59` exibe `exit 1` e ausência de conteúdo; `:92–106` detalha cobertura; `:121–124` cita correção. | PASS |
| C8 | `report.cli.test.mjs:30–40`: texto, Markdown e JSON v1, saída JSON repetida idêntica, timeline vazia e snapshot/skill inalterados. | PASS |
| C9 | `report.cli.test.mjs:48–51`: exit, objeto fechado e ausência de eco; `:53–66` cobre 2/3/4; `:70–72` cobre E/S 5. | PASS |
| C10 | `report.e2e.test.mjs:38–48`: hooks/captura/CLI com vetor exato dos seis estados, correção, fontes e limite de leitura de SKILL.md. | PASS |

## Exceção do core vendorizado

O comentário `issuecomment-6297275855` em `context.json` autoriza elevar o teto do motor e o override exclusivo da #7 para 20, preservando as dez tentativas anteriores. O comentário posterior `issuecomment-6297902519` recusa sincronizar os dois pilotos: **“Não, mantenha o trabalho apenas na #7”**. AGENTS.md:129–134 agora registra a exceção à igualdade de três arquivos, com link para essa decisão; README.md e `scripts/code-review/README.md` também a declaram. A regra de igualdade continua aplicável às demais atualizações. A divergência que causou o FAIL anterior foi, portanto, deliberadamente autorizada e deixou de ser bloqueio.

SHA-256 dos bytes com CRLF/CR normalizados para LF, recalculado neste HEAD para os cinco arquivos locais. Os hashes dos pilotos foram calculados na verificação anterior d7e526f e são **carried from d7e526f**, não recalculados nesta rodada; o diff recente não altera arquivos do core.

| Arquivo em `scripts/code-review/` | skill-me no HEAD | ambos os pilotos (d7e526f) | Política |
| --- | --- | --- | --- |
| README.md | `4dde98b5ca43448f5432214b30852f8be6cf54d6f8427e9dfdbc166e43acf818` | `b729b74da75236c2a5127c759d288e0aa76799677e7365955a835d06fbc5965e` | divergência autorizada |
| cli.mjs | `4ff9a5e7a50950bda2857f6d76f0d7b690630a9feaef5fd7471e7ba1b66dd4a0` | mesmo hash | igual |
| review.mjs | `dae814895e7acecdcccd7c28f78ce6576467679e30d52db71bed7b4546351479` | `e71fe427d4434e570b3bde731e8e55af22695cb21eb3cdfe75fa50a2db09ba3f` | divergência autorizada |
| review.test.mjs | `2a1f1c5b5587d4b8c62425e31c5c804e4b32c506e0b81d76095f0d81f6e9ec6a` | `7fd05ac419a07982f5588d7157be931cf2df5dbd6992815a7deb38f244da7462` | divergência autorizada |
| schema.json | `09381948e36666bd22234eb2ce39c61d7208bbb93a6ffb95861d2d92ea1b983c` | mesmo hash | igual |

`code-review.config.json` conserva light/ui/direct em 2 e aplica 20 só à issue 7. `review.mjs:483–500` aceita override aprovado até 20, preservando o teto normal; `review.test.mjs:679–711` rejeita 21, perfil errado, ausência de aprovação e continuidade sem override, e verifica que ampliar o teto mantém o histórico da fixture. `.git/code-review/issue-7.state.json` tinha dez tentativas nesta leitura. O teste C6 executado acima comprovou o contrato alterado; a suíte completa do motor 16/16 foi executada pelo builder e não foi repetida aqui, pois o diff desde a verificação anterior é documental.

## Gate e limites

G1 C1–C10: PASS, 10/10 no HEAD. G2 override exclusivo e histórico: PASS. G3 política atual do core: PASS pela exceção específica, documentada e respaldada na issue. G4 revisão formal: não executada por este Verifier. Não houve skips nas provas selecionadas; não executei novamente `npm test` amplo nem a suíte do doctor porque o diff recente não toca essas superfícies. O relato do builder de 16/16 do motor foi distinguido das execuções feitas nesta verificação. Injeção de falhas não se aplica ao perfil light.
