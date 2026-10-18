# Issue #5 — verificação independente

**Verdict: PASS — 59/59 checks comprovados; oito AC PASS no escopo aprovado.** Os três achados bloqueantes do formal3 foram confrontados com correções, contratos e provas próprias no novo HEAD. O limite de outra serialização dentro de texto é avaliado explicitamente abaixo; não é declarado corrigido nem aceito pelo proprietário.

**Profile:** light. **Round:** 6 — scoped. **Verifier:** subagente fresco `/root/verify_issue5_round6`, distinto dos autores. Autorização humana vigente: “autorizo quantos precisaram para resolver”, registro `157add2`; esta issue somente, rodadas independentes necessárias e máximo técnico formal10, três tentativas formais já usadas. Esta execução independente não é revisão formal/ready nem autorização de merge.

**HEAD verified at:** `e1bd083060c949c50ed77540bffe3bf50d534a94`. **Feature range:** `1b6685fe97862ac1a2d2cff1e4d9f0e1f09a6a27..e1bd083060c949c50ed77540bffe3bf50d534a94`. **Diff scoped:** `e201c15ac927d683f2c6240ed8407be3f92a7e59..e1bd083060c949c50ed77540bffe3bf50d534a94`, mais todos os não-PASS do formal3 (AC2/AC4/AC5, três findings) e alcance compartilhado. `83e241d` contém a última mudança de produto/teste; `e1bd083` acrescenta somente recibo autoral em build.md.

## Fontes, autorização e continuidade

**verified at e1bd083060c949c50ed77540bffe3bf50d534a94.** Lidos `verify.md` integral e brief Round6 integral, AGENTS.md, CLAUDE.md, plano/critério1–20, checklist/Landing/Proof/Swept, aprovação e handoff, guia atual, incidente integral (incluindo stash autoral duas vezes), seções autorais atuais e históricos pertinentes de build.md, relatório Round5 preservado e formal3 integral. O snapshot atual `issue-approved-v6.json`, fornecido pelo coordenador, contém oito AC e a aprovação ampla. Não foi substituído por suposição sobre a issue. CONTRIBUTING e o guia inicial `AGENT_SKILL_DEBUGGER_SPEC (1).md` foram buscados com `rg --files --hidden`, excluindo dependências/históricos de cópias, sem resultados; este último é expressamente não vinculante. Não há fonte de UI vinculante.

Análise intocada **carried from e34791acd13501e436ed4a9ad8d26261aca91fb3** (Round5), que carrega **79958b506b3e6f694fb3adf95238ccbb654cb0d6**, **f79b944fcc255f84298f04557427ec8b1666b42c**, **ed7dec25b601942591ed19d175a193a7fecf1049** e **be882a54b989f4069d3870c050914d9af7b6e073**. Não se carregou o PASS antigo para decidir os três não-PASS posteriores. Análise nova/scoped e todas as citações dos arquivos tocados são **verified at HEAD atual**; as provas de todos os checks são novas. `E/citation-refresh.json` compara252 localizações antigas com as atuais:252 linhas idênticas, nenhum deslocamento incorreto; referências adicionais novas estão explicitadas no quadro. Sem reabrir subjetivamente cada decisão intocada.

`E` = `.checks/code-review/issue-5/verifier-round6-20261018/`. Cópia integral do relatório anterior em `E/round5-before.md`, além de todos os históricos preservados. Incidente autoral de stash e limitação retrospectiva da pilha foram lidos, sem repetir o procedimento ou herdar seus REDs como execução independente.

## Identidade e isolamento das execuções

**verified at e1bd083060c949c50ed77540bffe3bf50d534a94.** Fonte original limpa antes dos testes. Archive criado por `git -c core.autocrlf=false archive` do SHA exato; SHA256 **2dade612ad0449f921726f5513a792530dd6030ff34de39a316534f9bab8b9bc** e `get-tar-commit-id` igual ao HEAD. Manifesto dos208 blobs conferido byte a byte antes e depois de cada plataforma (`identity.json`, `blob-manifest.json`, `windows-blobs-after.json`, `wsl-blobs.json`, `wsl-blobs-after.json`). Dependências locais copiadas, sem instalação/rede.

Windows Node24.21.0, `E/windows-exact-copy`. Desde a primeira execução, via normal `require_escalated`, pois o Round5 já comprovou incapacidade do sandbox TEMP para Git/config/E/S de fixtures. Nenhuma rejeição de auto-review e nenhuma repetição do sandbox incapaz. Ubuntu WSL Node24.13.0, uid1000 confirmado antes de qualquer mutação e novamente no script, `/tmp/skill-me-i5-verifier6-issue5-DKQmTB/copy`. Script em arquivo, `MSYS_NO_PATHCONV=1`, mktemp nativo e guardas de padrão/realpath antes da cópia e extração; tarSHA/commit conferidos novamente. Nenhum uso da preparação/probe antiga bloqueada, `/repo` ou `/src.tar` na raiz, configs/sessões pessoais, modelos ou limpeza.

Uma invocação por target/plataforma: privacidade inteira sem filtro, `node --test --test-reporter=tap 'tests/integrations/privacy/*.test.mjs'` (incluindo C35), e `npm test` completo. Logs próprios `windows-privacy.log`, `windows-npm-test.log`, `wsl-privacy.log`, `wsl-npm-test.log`; exits em `windows-results.json` e `wsl-results.txt`. Os16 testes de code-review dentro de npm são fixtures do motor, não execução de `review:run`. Os scripts de preparo foram adaptados dos próprios scripts Round5, com diff conferido; nenhum pipeline antigo foi executado.

## Três findings e alcance compartilhado

**verified at HEAD atual.** `sanitize.mjs` lido integralmente, comparado ao diff real e aos contratos. A regra4 em`:44` aceita qualquer comprimento não vazio, caixa ASCII e SP/TAB/CR/LF reais. Mantém o completamento da palavra (`schemeValue`/`completeWord`), ordem e caminho de recusa. `headerValue:242–243` recusa o campo quando a regra3 consumiria um esquema no fim de linha e deixaria a credencial na linha seguinte. C14k/m afirmam resultados literais, controles e recusas; C14l/n atravessam ingest→temporários→segmento→export/status. Mudanças dos controles não removem casos: formas anteriormente intactas estão nas novas expectativas exatas, com decisão prévia no Landing.

`content.mjs:112–133` monta os membros com `Object.fromEntries`; a chave própria `__proto__` recebida por JSON continua própria, serializável e submetida à mesma sanitização/contagem/profundidade. C16c usa `JSON.parse` com pré-condição afirmada, seis valores/tipos, nesting/array, protótipos comuns, global intacto, serialização/releitura e128/129 membros. C16d prova o contrato JSONL/export/status; não se confundiu literal JS que já mudou o protótipo com JSON real.

`store.mjs:486–499` decide em fonte única: captures ausente→not_found; `.deleting` link→link_refused; outro tipo→foreign_entry; diretório mais nome normal existente→foreign_entry antes de escolher/listar/ler/mutar; somente tomb→retomada; sem tomb→estado normal (active→capture_active). O prune seleciona a tomb e pula a captura normal com mesmo ID em`:556`, alcançando a mesma guarda. C49b afirma recusas exatas de delete/prune em prévia/aplicação, CLI/API, ativa/parada, árvores/bytes idênticos e ausência de E/S interna nas duas pastas; só lstat dos nomes. C51b preserva retomadas legítimas em tomb com chave/estado, state-only e vazia; C47/C48/C55/C56 reexecutam exclusão mútua/barreira/concorrência. Nenhum journal ou formato novo, nenhuma prova de posse arbitrária de tomb forjada isolada é alegada.

Alcance relido: `content.mjs:75–82` sanitiza folhas e listas textuais; structured usa a mesma função; `policy.mjs:47–55` usa `isUnsafeName` nos metadados; `observation.mjs:86` e `privacy/ingest.mjs:63` usam applyPolicy; ingest só entrega os registros sanitizados a appendRecords em`:114`. Regras de palavra inteira/vírgula/escape/hífen inicial, último@, composição/backtick/array/NBSP dentro da palavra, concatenação/query/header, multiline/tag/âncora/comentário e marcador NUL permanecem nos novos gates completos. Critérios não foram reduzidos.

## Checks C1–C59

**P** = privacidade inteira Windows e WSL; **N** = npm test inteiro Windows e WSL. Todos os nomes indicados passaram nominalmente nos logs novos, conforme `proof-index.json`. **V** = análise scoped verificada no HEAD; **C** = análise intocada carregada da cadeia acima. Todas as citações de testes tocados foram refrescadas no HEAD, inclusive nas linhas C. `same` em `policy.unit.test.mjs:403` é `assert.ok(isDeepStrictEqual(actual,expected),label)`; esperados novos são literais locais ou constantes literais citadas, sem derivação do produto.



| Check / análise | Claim | Prova nova | Asserção localizada / expressão | Resultado |
|---|---|---|---|---|
| C1 C | Conteúdo desligado sem captura | P C1/C1b | `tests/integrations/privacy/policy.unit.test.mjs:68` `assert.equal(record.content, null)`; `:69` `assert.deepEqual(...,['content:content_disabled'])`; `tests/integrations/privacy/outputs.cli.test.mjs:77` `assert.deepEqual(Object.keys(report.events[0]), ENVELOPE_KEYS)`; `:82`, `:87` omissões exatas 2/3. | PASS |
| C2 C | Opt-in por captura | P C2 | `tests/integrations/privacy/store.cli.test.mjs:98` `assert.equal(runPrivacy(['start','--root',root]).body.capture.content, false)`; `:101` `assert.equal(after.body.capture.content, false)`; `:103` anterior desabilitada false. | PASS |
| C3 C | Ambiente/cwd não liga conteúdo em caminho algum | P C3 | `tests/integrations/privacy/store.cli.test.mjs:678` `assert.deepEqual(result.body.batch.contentOmitted,{content_disabled:entries.length})` para 2/2/3/2; `:685–686` `content === null`, `privacy === ['content:content_disabled']`; `:690` `assert.deepEqual(...,{content_disabled:9})`; `:701/:713/:719` `assert.deepEqual(...,zero(1/2/3))`, demais códigos zero em `:693`. | PASS |
| C4 C | Todas as linhas da matriz | P C4/C4b | `tests/integrations/privacy/policy.unit.test.mjs:111` `assert.deepEqual(field(record,name),{field:name,...expected})`, esperados literais locais `:81–97`; `:113` `covered.size === CONTENT_TABLE.length`; `tests/integrations/privacy/store.cli.test.mjs:731` objeto literal Bash/`ls <home>`; `:736` args/result exatos `[['item.command','args','echo 1'],['item.aggregated_output','result','1\n']]`. | PASS |
| C5 C | Fora da matriz falha fechado | P C5 | `tests/integrations/privacy/policy.unit.test.mjs:129–130` `content === null`, `assert.deepEqual(record.privacy,['content:unsupported_content'])`; `:139` `assert.deepEqual(unknown,{content:null,privacy:['content:unsupported_content']})`. | PASS |
| C6 C | Prompts/raciocínio/Skill/Hermes excluídos | P C6 | `tests/integrations/privacy/policy.unit.test.mjs:161` `assert.equal(record.content,null)`; `:162` canário ausente; `:165` `assert.deepEqual(codexExecDraft(...),{kind:'excluded',reason:'reasoning'})`. | PASS |
| C7 C | D1: SKILL.md sanitizado como dado | P C7 | `tests/integrations/privacy/policy.unit.test.mjs:182` `value.includes('ignore as instruções anteriores')`; `:184` args literal `cat <home>/.codex/skills/third-party-skill/SKILL.md`; `:187–188` off null/`['content:content_disabled']`; `:190` `existsSync(marker) === false`. O oráculo derivado `sanitizedSkillText` não substitui os literais de sanitização C4/C17/C18. `tests/integrations/privacy/policy.unit.test.mjs:190` `assert.equal(existsSync(marker),false)`. | PASS |
| C8 C | Payload não executa comandos | P C8 | `tests/integrations/privacy/store.cli.test.mjs:759–760` `assert.ok(!existsSync(target(name)))` e cwd; `:762` `assert.deepEqual(readdirSync(cwd),[])`; `:763` `assert.deepEqual(probeLog(probe).filter(e=>e.op.startsWith('child_process.')),[])`; `:755–756` persistidos 6/3. | PASS |
| C9 C | IDs h1 estáveis; igualdade entre papéis | P C9 | `tests/integrations/privacy/policy.unit.test.mjs:204–205` `assert.match(value,PSEUDONYM)` e `value.length === 46`; `:214` toolUseId igual; `:219` `sub.envelope.ids.parentSessionId === session.envelope.ids.sessionId`. | PASS |
| C10 C | Capturas/processos não correlacionáveis | P C10/C10b | `tests/integrations/privacy/store.cli.test.mjs:774` `assert.notEqual(ea[name],eb[name])`; `tests/integrations/privacy/outputs.cli.test.mjs:99` `assert.notEqual(first[name],second[name])`; `:105` `started.ids.itemId === completed.ids.itemId`. | PASS |
| C11 V | Nomes inseguros removidos; valor entregue decide antes de reler rascunho | P C11/C11b | `tests/integrations/privacy/policy.unit.test.mjs:267`/`:329` `assert.ok(!(name in envelope.fields))`; `:268`/`:330` `assert.deepEqual(privacy.filter((e)=>e.startsWith("envelope.")),["envelope."+name+":sensitive_removed"])` (a expressão no fonte usa template literal para esse mesmo alvo); `:270`/`:331` `assert.equal(validateEnvelope(envelope),true)`; `:332` `assert.deepEqual(leaks(JSON.stringify(result.record)),[])`; `:282` `assert.equal(record.envelope.fields[name],value)` nos controles comuns; `:339` `assert.deepEqual(applyPolicy({draft:throwing,payload:{},key:KEY,content:false}),{ok:false,drop:"privacy_failure"})`. Pré-condição do token copiado afirmada em `:313`–`:314`. | PASS |
| C12 C | Paths só como referência | P C12 | `tests/integrations/privacy/policy.unit.test.mjs:351` `assert.deepEqual(record.content.fields,[{field:'tool_input.file_path',role:'args',kind:'path',ref:expectedPseudonym(KEY,'path',filePath)}])`; `:353` `!text.includes(part)` para componentes locais; `:355–356` lista de refs e componentes ausentes. | PASS |
| C13 C | Motivos fechados sem valor | P C13 | `tests/integrations/privacy/policy.unit.test.mjs:370–371` `assert.match(entry,ENTRY)`, `assert.deepEqual(leaks(entry),[])`; `:374` `new Set(record.privacy).size === record.privacy.length`. | PASS |
| C14 V | Cinco segredos no conteúdo, canais reais | P C14/C14b/C14c/C14d/C14e/C14f/C14g/C14h/C14i/C14j/C14k/C14l/C14m/C14n | `tests/integrations/privacy/outputs.cli.test.mjs:125/:133/:141` `assert.deepEqual(leaks(channel/report),[])`; `:189–190` stdout sem leak/stderr `''`; `:193–198` observações reais antes do rename, `.lock`/tmp vistos e `containsCanary/containsMarker === false`. Novas: `tests/integrations/privacy/outputs.cli.test.mjs:249` `assert.ok(isDeepStrictEqual(...,{q:"fica",nested:{keep:true,list:[{keep:2}]}}))`; `:272`/`:276` marcadores false; `:288` `assert.ok(leaks(text).length===0 && !text.includes(ENCODED_MARKER),label)`; `:318` sete campos exatos; `:320`/`:321` URLs exatas; `:337`/`:341` marcadores false nas duas passadas. Novas asserções/locais no quadro abaixo, com saídas literais e recusas exatas. | PASS |
| C15 V | Cinco segredos em metadados, mesmos canais | P I5-C15canários | `tests/integrations/privacy/outputs.cli.test.mjs:574` categorias exatas `['token','header','url','password','privateKey']`; `:603–608` `assert.match(envelope.ids[name]??'',PSEUDONYM)`, nomes ausentes/sem lacuna; `:617/:624/:631` leaks `[]`; `:678/:682` motivo de nomes e refs h1; `:693–694` leaks `[]`/stderr `''`; `:706–712` ≥8 temporários de cada tipo, lock por comando e todos `containsCanary/containsMarker === false`. | PASS |
| C16 V | Subárvore sensível descartada | P C16/C16b/C16c/C16d | `tests/integrations/privacy/policy.unit.test.mjs:387` `assert.deepEqual(field(record,'item.arguments').value,{query:'ok',nested:{level2:{keep:1}},list:[{},'fica']})`; `:388` `privacy.includes('item.arguments:sensitive_removed')`. `tests/integrations/privacy/policy.unit.test.mjs:426` `same(extracted.privacy,["item.arguments:sensitive_removed"],label)`; `:427` projeção literal com irmãos preservados; `:434`/`:437` 128 aceitos/129 null; `same` é `assert.ok(isDeepStrictEqual(actual,expected),label)` em `:403`. Novas: `policy.unit.test.mjs:467–474` serialização/releitura literal e protótipo comum; `:490–493` membro próprio128/129 e motivo exato. `outputs.cli.test.mjs:937–944` export literal, own keys e contador `{sensitive_removed:1}`. | PASS |
| C17 V | URL sem userinfo/token | P C17/C17b/C17c/C17d/C17e | `tests/integrations/privacy/policy.unit.test.mjs:394` `assert.deepEqual(sanitizeText(...),{ok:true,text:'https://host/p?token=[removido]&page=2',removed:true})`; `:396` comando literal com a mesma URL sanitizada. `tests/integrations/privacy/policy.unit.test.mjs:511`/`:549` `same(sanitizeText(input),{ok:true,text:expected,removed:true},label)`, esperados locais em `:497` e `:525`; `:514`/`:563` `assert.deepEqual(sanitizeText(control),{ok:true,text:control,removed:false})`; `:571` sem marcador literal/codificado. `same` em `:403`; URL esperada literal em `tests/integrations/helpers/privacy-canaries.mjs:44`. Novas `tests/integrations/privacy/policy.unit.test.mjs:576` `same(sanitizeText(input),{ok:true,text:expected,removed},label)` com esperados literais em653–675 e1103–1128; `:686` `same(sanitizeText(input),{ok:false},label)`; `:1137–1138` campo omitido e motivo exato. | PASS |
| C18 C | Chave privada fechada/aberta removida | P I5-C18bloco (nome real) | `tests/integrations/privacy/policy.unit.test.mjs:1145/:1147` `assert.deepEqual(sanitizeText(...),{ok:true,text:'antes\n[removido]\ndepois'/'antes [removido]',removed:true})`; `:1149` resultado literal `cabeçalho\n[removido]`. | PASS |
| C19 V | Surrogate/NUL/chave inválida omitidos | P C19 | `tests/integrations/privacy/policy.unit.test.mjs:1153–1154` `assert.deepEqual(sanitizeText(...),{ok:false})`; `:1157/:1159` campo undefined e `unsanitizable`; `:1163` `assert.deepEqual(...,{ok:'sim',nested:{'a.b-c_9':3}})`. | PASS |
| C20 C | Entrada 1MiB e linha 64KiB, limite/+1 | P C20 | `tests/integrations/privacy/limits.cli.test.mjs:27` `assert.equal(exact.report.events.length,1)`; `:33` `assert.equal(over.report.counters.inputTooLarge,1)`; `:42` `assert.deepEqual(read.body.batch,{accepted:1,persisted:1,malformed:{},dropped:{},contentOmitted:{}})`; `:45` `assert.deepEqual(refused.body.batch,{accepted:1,persisted:1,malformed:{oversize_line:1},dropped:{},contentOmitted:{}})`. | PASS |
| C21 V | Envelope 4096 aceito/4097 recusado | P C21 | `tests/integrations/privacy/policy.unit.test.mjs:1201` `validateEnvelope(exact) === true`; `:1203–1204` `checkEnvelopeBudget(exact) === null`, `over === 'envelope_oversize'`; `:1213` `assert.deepEqual(applyPolicy(...),{ok:false,drop:'envelope_oversize'})`. Decisão pura exata; ramo pós-pseudônimo inalcançável hoje, limite declarado. | PASS |
| C22 V | Conteúdo 8192/8193, UTF-8 válido | P C22 | `tests/integrations/privacy/policy.unit.test.mjs:1238–1240` bytes 8192, campo inteiro/`truncated:false`; `:1247–1249` `assert.deepEqual(cut,{field:'tool_input.command',role:'args',kind:'text',value:prefix,truncated:true})`, bytes ≤8192, motivo; prefixos emoji/ç locais. | PASS |
| C23 V | Profundidade 8/9, membros 128/129 | P C23 | `tests/integrations/privacy/policy.unit.test.mjs:1273` `assert.deepEqual(...,nested(8))`; `:1275–1276` null/unsanitizable em 9; `:1278` `assert.deepEqual(...,members(128))`; `:1280–1285` 129/soma por evento null/unsanitizable. | PASS |
| C24 V | Sanitização antes do corte | P C24 | `tests/integrations/privacy/policy.unit.test.mjs:1295` `assert.ok(!value.endsWith(secret.slice(0,k)))` para todo prefixo; `:1296` `!value.includes('SKILL')`; `:1297–1298` motivos sensitive_removed/content_truncated. | PASS |
| C25 V | Ref/ID nunca cortado | P C25 | `tests/integrations/privacy/policy.unit.test.mjs:1305–1306` path undefined/`content_truncated`; `:1308` `assert.equal(id.length,46)`; `:1313–1314` refs inteiras length120 ou motivo de omissão. | PASS |
| C26 V | Contagens exatas dos seis códigos | P C26/C26b/C28 | `tests/integrations/privacy/outputs.cli.test.mjs:729` `assert.deepEqual(...,zeroPrivacy({content_disabled:5,sensitive_removed:1}))`; `tests/integrations/privacy/store.cli.test.mjs:794–796` batch/status iguais ao literal local `{unsupported_content:2,unsanitizable:1,sensitive_removed:3,content_truncated:2}` e off disabled2; privacy_failure positivo só em processo C28. | PASS |
| C27 C | Omissão/descarte separados; sem cobertura | P C27 | `tests/integrations/privacy/store.cli.test.mjs:804` lote literal `{accepted:2,persisted:2,malformed:{},dropped:{reasoning_excluded:1,unknown_event:1},contentOmitted:{content_disabled:1}}`; `:806–809` chaves/contadores exatos e `!/coverage\|complete\|cobertura\|completo/i.test(status.stdout)`. `tests/integrations/privacy/store.cli.test.mjs:804` `assert.deepEqual(result.body.batch,{accepted:2,persisted:2,malformed:{},dropped:{reasoning_excluded:1,unknown_event:1},contentOmitted:{content_disabled:1}})`. | PASS |
| C28 V | Getter/Proxy que lança: falha fechada sem retry | P C28 | `tests/integrations/privacy/policy.unit.test.mjs:1329–1332` null, `assert.deepEqual(record.privacy,['content:privacy_failure'])`, Bash preservado, `reads === 1`; `:1341–1342` Proxy null/failure; `:1347` envelope hostil retorna `{ok:false,drop:'privacy_failure'}`. Getter variável também é exercitado por C11b `:329–344`; este teste mantém o contrato de exceção no conteúdo. | PASS, escopo literal |
| C29 V | Hook neutro; wrapper bytes/17 | P C29; N I4-C36/C13/C16 | `tests/integrations/privacy/outputs.cli.test.mjs:753–755` status0/stdout `''`/leaks `[]`; `:761–763` status17, `assert.deepEqual(run.stdout,Buffer.from(...))`, relatório limpo. Regressões `tests/integrations/failure-matrix.cli.test.mjs:75–76`, `tests/integrations/codex-run.cli.test.mjs:98/:103/:230–231`. | PASS |
| C30 V | Falha de rename preserva commit anterior | P C30 | `tests/integrations/privacy/store.cli.test.mjs:819–822` status5, JSON exato `io_failure`, `assert.deepEqual(snapshotTree(root),before)` para dados/state; `:824` persisted anterior1. | PASS |
| C31 C | Nenhuma rede | P C31 | `tests/integrations/privacy/no-network.test.mjs:21–22` ausência de imports fechados/fetch; `:50` todos passos status0; `:63–64` sonda observada e `assert.deepEqual(entries.filter(e=>e.op==='network'),[])`. | PASS |
| C32 V | 23 erros com JSON fechado sem eco | P C32 | `tests/integrations/privacy/store.cli.test.mjs:867–870` exit da tabela, `assert.deepEqual(result.body,{schemaVersion:1,command,status:'error',error:{code}})`, sem canários/paths; `:900/:910/:914` conflitos/io_failure/partial_delete exatos; stderr `''` em `:34`. | PASS |
| C33 V | Canais nativos separados | P C33 | `tests/integrations/privacy/outputs.cli.test.mjs:772` `assert.deepEqual(run.stdout,Buffer.from(childLine+'\n'))`; `:774` stderr nativo exato presente; `:776` `assert.deepEqual(leaks(JSON.stringify(run.report)),[])`. | PASS |
| C34 V | Guia/matriz/defaults/limites e perdas vigentes | P C34 | `tests/integrations/privacy/docs-privacy.test.mjs:36` `assert.deepEqual(body.map(cells),expected)`; `:56` `assert.match(text,pattern)`; `:58` `assert.ok(GUIDE.includes(code(omission)),omission)`. Guia atual relido: curto/case/quebra e limite de texto reserializado, own __proto__, coexistência/retomada; análise abaixo. | PASS |
| C35 V | Só plataformas realmente executadas | P/N C35, sem filtro | `tests/integrations/privacy/docs-privacy.test.mjs:75` `assert.ok(executed.some(row=>row.startsWith(platform)))`; `:77` macOS/Linux nativo ausentes se não executados. Windows/WSL reexecutados aqui; macOS não. | PASS |
| C36 C | Start/layout/defaults/ID/chave | P C36 | `tests/integrations/privacy/store.cli.test.mjs:44` `assert.match(id,/^[0-9a-f]{32}$/)`; `:46` JSON literal active/false/7; `:54` árvore exata; `:85–86` IDs/chaves diferentes; `:79–80` modos0700/0600 executados WSL. | PASS |
| C37 C | Retenção válida1/365; inválidos recusados | P C37 | `tests/integrations/privacy/store.cli.test.mjs:111` `capture.retentionDays === days` para1/365; `:118–119` status2/invalid_retention; `:125–126` missing_flag_value e snapshot idêntico. `tests/integrations/privacy/store.cli.test.mjs:111` `assert.equal(result.body.capture.retentionDays,days)` (dias1/365 locais); `:119` `assert.deepEqual(result.body,{schemaVersion:1,command:"start",status:"error",error:{code:"invalid_retention"}})`. | PASS |
| C38 C | Root obrigatório/existente/diretório | P C38 | `tests/integrations/privacy/store.cli.test.mjs:134–135` missing_root/snapshot idêntico; `:140` `assert.deepEqual(...,{code:'root_not_found'})`; `:147` root_not_directory; `:149` cwd sem store. | PASS |
| C39 V | Quatro agentes, v1 e escritas limpas | P C39 | `tests/integrations/privacy/store.cli.test.mjs:954–956` chaves exatas, `recordVersion === 1`, `validateEnvelope === true`; `:959–963` temporário/lock observados, `containsCanary/containsMarker === false`; tabela quatro agentes ×off/on. Não representa getter variável em JSON. `tests/integrations/privacy/store.cli.test.mjs:955` `assert.equal(record.recordVersion,1)`; `:956` `assert.equal(validateEnvelope(record.envelope),true,agent)`. | PASS |
| C40 V | Ingest só acessa store/código próprio | P C40 | `tests/integrations/privacy/store.cli.test.mjs:987–990` acessos store observados, `entry.file.startsWith(storePrefix)`, loader próprio observado, `assert.deepEqual(entries.filter(e=>e.op.startsWith('child_process.')\|\|e.op==='network'),[])`. Exceção explícita dos módulos carregados pelo Node. | PASS |
| C41 C | Transições/idempotência | P C41/C41b | `tests/integrations/privacy/lifecycle.unit.test.mjs:34–44` estado/changed/content/endedAt exatos nas seis linhas; `tests/integrations/privacy/store.cli.test.mjs:159/:162/:166/:171` JSON literal stopped/changedfalse/disabled/invalid_transition. `tests/integrations/privacy/lifecycle.unit.test.mjs:39` `assert.equal(result.capture.state,to)`; `:41` `assert.equal(result.capture.content,false)` para disable. | PASS |
| C42 V | Encerrada recusa sem mutar | P C42 | `tests/integrations/privacy/store.cli.test.mjs:1048–1050` status3, `assert.deepEqual(refused.body,{schemaVersion:1,command:'ingest',status:'error',error:{code:'capture_not_active'}})`, snapshot igual. | PASS |
| C43 V | Status/export isolados, JSON1/help PT | P C43/C43s | `tests/integrations/privacy/store.cli.test.mjs:1063/:1066–1067` schemaVersion1, records1, contadores literais; `:1072–1073` `!exportA.stdout.includes(forbidden)`/`!statusA.includes(forbidden)`; `:1078` `assert.match(help.stdout,pattern)` para rotas/PT locais. | PASS |
| C44 V | Delete prévia/apply só encerradas | P C44 | `tests/integrations/privacy/store.cli.test.mjs:206` `assert.deepEqual(snapshotTree(root),before)`; `:210` capture_active; `:217–218` JSON applied/deletedtrue e `!existsSync(captureDir(root,id))` stopped/disabled. | PASS |
| C45 C | Prazo exato/menos1ms/active/endedAt | P C45 | `tests/integrations/privacy/lifecycle.unit.test.mjs:60–61` `assert.equal(isExpired(stopped,ended+7*DAY_MS),true)` e `assert.equal(isExpired(stopped,ended+7*DAY_MS-1),false)`; `:66` active400dias false; `:70` `assert.equal(disabled.endedAt,T0)`; `:71–72` retém após disable. | PASS |
| C46 V | Prune preview/apply/relógio | P C46 | `tests/integrations/privacy/store.cli.test.mjs:253` snapshot igual; `:257–258` somente duas expiradas deletadas/duas preservadas; `:264–266` fresh não selecionada e active preservada. `tests/integrations/privacy/store.cli.test.mjs:257` `assert.deepEqual(applied.body,{...preview.body,applied:true,deleted:[expiredStop,expiredDisable].sort()})`. | PASS |
| C47 V | Lock alheio impede comandos sem mutação | P C47/C47s | `tests/integrations/privacy/store.cli.test.mjs:1091–1097` status4/JSON lock_present, snapshot igual e lock `lock alheio\n`; `:300–305` mesmo contrato nos demais comandos. `tests/integrations/privacy/store.cli.test.mjs:1092` `assert.deepEqual(result.body,{schemaVersion:1,command,status:"error",error:{code:"lock_present"}})`; `:1096` `assert.deepEqual(snapshotTree(root),before)`. | PASS |
| C48 V | Produtor tardio não recria | P C48 | `tests/integrations/privacy/store.cli.test.mjs:1108–1111` status3, código literal conforme delete/not_active, `assert.deepEqual(snapshotTree(root),before)`, `!existsSync(captureDir(root,id))`. | PASS |
| C49 V | Link/foreign recusado; alheio preservado | P C49/C49b | `tests/integrations/privacy/store.cli.test.mjs:328–332` status4/código da tabela, snapshot igual, sentinela externa `'fora da raiz'`; `:355–356` alheios `'alheio'` preservados. Junção Windows/symlink WSL executados. `tests/integrations/privacy/store.cli.test.mjs:331` `assert.deepEqual(snapshotTree(root),before)`; `:332` `assert.equal(readFileSync(path.join(outside,"sentinela.txt"),"utf8"),"fora da raiz")`. Novas: `tests/integrations/privacy/store.cli.test.mjs:405–406` exit4/corpo literal `foreign_entry`; `:416–417` prune com `selected`, `deleted:[]`, duas falhas; `:396–397` árvore/bytes idênticos; `:437–446` só lstat nos nomes, nenhuma operação interna. | PASS |
| C50 V | Chave não exportada e apagada | P C50 | `tests/integrations/privacy/store.cli.test.mjs:1122` export2; `:1125–1126` `!text.includes(form)` parahex/base64/base64url/latin1 e `!/"key"/.test(text)`; `:1130–1131` key/captura ausentes. `tests/integrations/privacy/store.cli.test.mjs:1125` `assert.ok(!text.includes(form))`; `:1130` `assert.ok(!existsSync(path.join(captureDir(root,id),"key")))`. | PASS |
| C51 V | Exclusão parcial visível/retomável | P C51/C51b/C32 | `tests/integrations/privacy/lifecycle.unit.test.mjs:125–129` exit5/partial_delete e pasta/key presentes; `:137–139` exit0/deletedtrue e captures vazio. CLI `tests/integrations/privacy/store.cli.test.mjs:914` JSON partial_delete. `tests/integrations/privacy/lifecycle.unit.test.mjs:125` `assert.equal(partial.exitCode,5)`; `:139` `assert.deepEqual(readdirSync(captures),[])`. Novas `tests/integrations/privacy/store.cli.test.mjs:496–508` state-only/vazia/key+state, prévia literal, retomadas com deletedtrue; `:509–510` active preservada/capture_active. | PASS |
| C52 V |500/501,8MiB/+1 e ordem | P C52/C52b/C52s/S-databytes/S-databytes-cli | `tests/integrations/privacy/lifecycle.unit.test.mjs:78–96/:102` admissão exata/rejeição e posteriores recusados; `tests/integrations/privacy/store.cli.test.mjs:1140` lote literal persisted500/dropped10; `tests/integrations/privacy/store.unit.test.mjs:75–82` disco8388608/sem aumento no próximo. `tests/integrations/privacy/store.unit.test.mjs:235` teto exato `[original.dataFile,8388608]`; `:243`–`:246` exit3/capture_invalid, segmento não aberto, tetos≤64KiB em8388609/1073741824; `:249` append recusa; `tests/integrations/privacy/store.cli.test.mjs:1030` corpo JSON fechado; `:1032` `assert.deepEqual(segmentOpens(probe.log),[])`; `:1034` árvore idêntica; `:1037` export restaurado2. | PASS |
| C53 V | Contadores mistos exatos | P C53 | `tests/integrations/privacy/store.cli.test.mjs:1174` `assert.deepEqual(counters,{accepted:3,persisted:3,malformed:4,dropped:{reasoning_excluded:1,unknown_event:1},contentOmitted:{content_disabled:2}})`; `:1175` `accepted >= persisted`. | PASS |
| C54 V | State/lock forma exata/sem marcador | P C54/C54s | `tests/integrations/privacy/store.cli.test.mjs:1195` `assert.deepEqual(Object.keys(lock).sort(),['lockVersion','nonce','pid'])`; `:1196/:1198` marker ausente; `:1200–1202` chaves STATE_KEYS/COUNTER_KEYS locais exatas e persisted2. | PASS |
| C55 V | Demo real/disco/exclusão | P C55 | `tests/integrations/privacy/demo.e2e.test.mjs:79–82` dado preservado/disable/ingest recusado; `:90–94` deletedtrue e dados/key ausentes; `:106–111` prune correto/tmp observados/sem canário. `tests/integrations/privacy/demo.e2e.test.mjs:90` `assert.equal(cli(["delete","--root",root,"--capture",capture,"--apply"]).body.deleted,true)`; `:94` `assert.ok(!files(root).some(file=>/events-\d{6}\.ndjson\|[\\/]key$/.test(file)))`. | PASS |
| C56 V | Oito produtores/stop/delete | P C56 | `tests/integrations/privacy/demo.e2e.test.mjs:161–165` sucesso20 ou erro3/4 fechado; `:170–172` persistidos=soma sucessos/linhas; `:177–181` tardio3/not_found, captures vazio e nenhum arquivo dado/key/tmp; duas rodadas. `tests/integrations/privacy/demo.e2e.test.mjs:170` `assert.equal(status.counters.persisted,succeeded)`; `:180` `assert.deepEqual(readdirSync(capturesOf(root)),[])`. | PASS |
| C57 V | Core intacto | Git read-only atual | `E/identity.json:8` `"coreExit":0`; `git diff --exit-code BASE HEAD -- scripts/code-review`, exit0, `E/core-diff.log` vazio. | PASS |
| C58 C | Privado/dependências/CI/suítes | N I4-C47 | `tests/integrations/fixtures-inventory.test.mjs:46` `pkg.private === true`; `:47–51` script/npmtest/dependências exatas smol-toml/yaml; `:53` CI test:integrations. Teste carrega package/workflow atuais. `tests/integrations/fixtures-inventory.test.mjs:46` `assert.equal(pkg.private,true)`; `:50` `assert.deepEqual(Object.keys(pkg.dependencies??{}),["smol-toml"])`. | PASS |
| C59 V | Quatro suítes afetadas verdes | N completo Windows/WSL | `E/windows-results.json` status0 no npm-test; `E/wsl-results.txt:2` `npmTestExit=0`; `E/proof-index.json` localiza cada nome nos quatro lotes. | PASS |


## Asserções de alcance e dos reparos — verified at HEAD atual

Os nomes completos e sua linha em cada um dos quatro logs estão em `E/proof-index.json`. As expressões abaixo ampliam C14/C16/C17/C49/C51, sem substituir as59 linhas anteriores.

| Prova / família | Asserção localizada que decide |
|---|---|
| C14d/C17d — palavra inteira e último@ | `tests/integrations/privacy/policy.unit.test.mjs:576` `same(sanitizeText(input),{ok:true,text:expected,removed},...)`; os dois primeiros esperados em`:582–583` são literais `DB_PASSWORD=[removido]` e `mysql --password [removido] -h db`; URL/userinfo em`:653–675`; `:680` comando esperado `git clone https://example.test/repo`. |
| C14f/C17e — composição/autoridade | `policy.unit.test.mjs:686` `same(sanitizeText(input),{ok:false},...)`, casos literais690–709 e1105–1111; saídas literais via`:576`. `:782` motivo `tool_input.command:unsanitizable`; `:1137–1138` campo undefined/motivo exato para autoridade aberta. |
| C14g — canais e NUL | `tests/integrations/privacy/outputs.cli.test.mjs:455–456` campos exatos e `value===COMPOSED_OUTPUT_OUT` (literal em`helpers/privacy-canaries.mjs:61`); `:461` contador unsanitizable4; `:436` `leaks(text).length===0 && !text.includes("\0") && !text.includes("\\u0000")`; `:447` `assert.ok(leaks(text).length===0,...)` na key; `:476/:480` marcadores false antes de rename/depois da escrita. A key continua examinada para canário; NUL só é recusado nos textos porque a key aleatória32bytes pode conter0x00. |
| C14i/j — multiline/tag/âncora/comentário | `policy.unit.test.mjs:686` recusas exatas das famílias tabeladas entre915–1044; `:1059–1061` campo undefined, motivo exato e comando `cat config.yml`. `outputs.cli.test.mjs:537` `assert.deepEqual(texts.sort(),[["item.command",BLOCK_COMMAND],["tool_input.command",BLOCK_COMMAND],["tool_response.stderr",""]],family)`; `:542` unsanitizable2; `:557/:561` marcadores false. Seis subtestes nominais: bloco, linha-seguinte, tag-ancora, tag-mesma-linha, ancora-mesma-linha, comentario. |
| C14h — regressão de custo | `policy.unit.test.mjs:1072–1092` treze entradas de aproximadamente1MiB; `:1098` `assert.equal(result.ok,ok,...)`; `:1099` `assert.ok(elapsed<5000,...)`. Duração total própria do teste no alvo de privacidade: Windows500.2476ms e WSL570.953239ms; não é duração individual de cada entrada nem SLA. Medidas antigo/novo32/64/128KiB e estimativa antiga1MiB em build.md são autorais, não novas execuções minhas. |
| C14k — Basic curto | `policy.unit.test.mjs:794–820` 22 entradas removidas,825 duas recusas e829 oito controles intactos;837–841 os cinco antigos controles agora com saídas novas exatas. `:849` stdout literal com duas credenciais removidas; `:850` stderr undefined; `:851` privacy exatamente `["tool_response.stdout:sensitive_removed","tool_response.stderr:unsanitizable"]`. |
| C14m — caixa e quebra | `policy.unit.test.mjs:857–860` oito grafias,11 credenciais e oito separadores;863–879 total163 remoções exatas via576 (8×11+8×8+11);885–892 seis recusas `{ok:false}` via686;897–900 total74 controles intactos com removedfalse. `:906` stdout literal mantendo caixa/separadores; `:907` campo undefined; `:908` motivos exatos sensitive_removed/unsanitizable. |
| C14l — fronteira Basic curto | `tests/integrations/privacy/outputs.cli.test.mjs:836` lote `{sensitive_removed:1}` por agente; `:843–854` sete campos/valores literais, com comando preservado; `:856` três motivos exatos; `:858` status `{sensitive_removed:3}`; `:828` ausência `YTpi`/`Bearer ab` nos arquivos/canais. |
| C14n — fronteira caixa/quebra/header | `outputs.cli.test.mjs:878/:888` lotes literais1/2/1; `:895–905` seis campos/valores literais (header omitido, comandos preservados); `:907–909` três listas exatas de motivos; `:912` status `{sensitive_removed:3,unsanitizable:1}`; `:880` ausência canário e credenciais curtas pelo contexto. Não procura substring `ab` solta em bytes aleatórios. |
| C14l/n/C16d — canais efetivos | Helper existente `outputs.cli.test.mjs:796–811`: `clean` em cada stdout, stderr `""`, logs das duas sondas; quantidade de temporários de dados ≥ ingests, lock de cada comando e temporário observado; `assert.equal(observation.containsCanary,false)` e `assert.equal(entry.containsMarker,false)`. C14l/n percorrem todos os arquivos inclusive key com latin1. Helpers de teste não executam dados coletados. |
| C16c — own JSON __proto__ | `policy.unit.test.mjs:462/:464` pré-condições reais de linha/chave própria; `:467` `JSON.stringify(value)===expected`, seis esperados literais445–456; `:468` privacy exata; `:470` protótipo Object.prototype/Array.prototype; `:474` releitura exata; `:478–482` ownkey, rootString.a undefined e global intacto; `:490–493`128 membros aceitos,129 null/unsanitizable. |
| C16d — fronteira ownkey | `outputs.cli.test.mjs:922` esperado JSON literal local; `:932` lote `{sensitive_removed:1}`; `:937` export inclui valor serializado; `:940` `Object.hasOwn` na raiz/nesting/array; `:941` serialização exata; `:942` único motivo item.arguments:sensitive_removed; `:944` mesmo contador no status. |
| C49b — coexistência | `tests/integrations/privacy/store.cli.test.mjs:399/:413` corpos literais erro foreign_entry, prune selected dois/deleted[]/failed dois; `:405–406/:416–417/:433–434` status/exit4 e corpos exatos CLI/API para prévia/aplicação em ativa/parada. `:396–397` snapshot idêntico inclusive mtime e key alheia byte a byte; `:437–446` mutações só no lock, apenas lstat dos nomes, nenhum acesso interno. `:454–465` controles active/capture_active, stopped/deletedtrue e tomb-junction/link_refused preservando key externa. |
| C51b — retomada legítima | `store.cli.test.mjs:490–492` partial_delete5 e nome normal ausente; `:496/:498` state-only/vazia exatas; `:503` prévia entries[] literal; `:505` delete appliedtrue/deletedtrue; `:508` prune selected/deleted somente viaPrune, failed[]; `:509–510` sobra só active e capture_active. |

Nota de precisão da evidência autoral: build.md/brief declara165 remoções em C14m; a fonte executada contém163 (conta acima), seis recusas e74 controles. É divergência aritmética do recibo, sem teste omitido no alvo e sem critério numérico165 aprovado pelo proprietário. O relatório usa a contagem real; o Verifier não altera build/checklist/testes.

## Precisão do limite de texto com outra serialização

**verified at HEAD atual por leitura, sem probe novo.** O cenário comunicado é um resultado TEXT cujo conteúdo tem `Basic` seguido dos dois caracteres literais barra-invertida e `n`, seguido de `YTpi`, representando outra serialização. Esse texto pode continuar no conteúdo/export sem remoção por regra4. A regra de entrada em `privacy/ingest.mjs:50` já faz `JSON.parse` do evento nativo; um escape JSON normal nessa camada vira LF real e está coberto por C14m/n. Só a segunda serialização dentro da string mantém os dois caracteres. Não se chama esse caso de “corrigido”.

Juízo contra AC2 e critério6: não é outro caso de SP/TAB/LF/CR literal, caixa ou comprimento da gramática de credencial já garantida. O critério6 exige projeção tipada, recusa quando a projeção reconhecida não é segura e diz expressamente que detecção por padrões complementa a projeção, sem garantia universal para texto livre/segredo desconhecido. O plano/Landing restringe decodificação adicional a uma camada em pares de query de URL; fora deles não promete interpretar outra serialização, shell ou YAML. Dado TEXT permanece texto, inclusive quando alguém nele escreve outra representação codificada. Recusar todo texto que represente qualquer serialização seria uma regra nova, não deduzível desse contrato fechado.

Portanto o caso é **limite de codificação da garantia atual, não finding bloqueante contra os contratos aprovados**. Esta conclusão vem dessa fronteira do plano, não da mera documentação do autor ou de aprovação humana presumida. Risco concreto: uma credencial escondida em uma serialização interna, NBSP entre esquema/valor ou outra codificação fora da gramática pode persistir com opt-in; não há prova de sanitização universal nem contador de perda para algo que o detector não reconhece. O guia`:118–120` e`:178–182` comunica o limite. Não foi inventado parser/decode universal nem executada entrada/probe nova. Casos conhecidos dentro da gramática autorizada (Basic curto, qualquer caixa ASCII, quebra real, headerbare) foram exigidos e passaram nas provas novas.

## Oito AC atuais

Fonte `issue-approved-v6.json`. AC2/AC4/AC5 foram reavaliados sem carregar o PASS anterior; alcance de AC3/AC8 também verificado no novo HEAD. Análise intocada dos demais carried from e34791a, com cadeia completa no início; provas novas para todos.

| AC | Resultado / evidência |
|---|---|
| AC1 — opt-in/start/stop/disable | PASS: C1–C4/C36/C41/C42/C55, capturas novas off, transições e recusa após encerramento. |
| AC2 — tratar antes de persistir | PASS no contrato: C11/C14–C19/C30/C39/C54/C55, palavra inteira e autoridade, recusas multiline/propriedade/comentário, novos Basic curtos/case/quebra/header; temporários observados antes de rename, dados/logs/export sem canários. Limite de outra serialização avaliado acima, sem garantia universal. |
| AC3 — cinco categorias sem canário | PASS: C14/C15 e variantes nas folhas/nomes/IDs/paths, canais reais, novos canários e credenciais curtas sintéticas. |
| AC4 — limites/perdas/cobertura | PASS: C20–C27/C34/C52/C53; C16c/d preserva o membro __proto__ em vez de perdê-lo silenciosamente, conta remoções internas e mantém128/129; C14n contador exato3remoções+1recusa. |
| AC5 — retenção/exclusão | PASS: C41–C52/C55/C56; C49b recusa coexistência sem ler/apagar pasta alheia nem deletedtrue falso; C51b mantém retomada legítima. Disco/preview/apply/lock/concorrência reexecutados. |
| AC6 — sem telemetria/upload automático | PASS: C31 e leitura dos consumidores; imports/operações de rede ausentes e sonda sem chamadas. |
| AC7 — skills/payloads como dados | PASS: C6–C8/C55, D1 preservada, SKILL.md sanitizado apenas com opt-in; nenhuma instrução coletada executada/adotada. |
| AC8 — diagnósticos/falhas sanitizados | PASS: C11/C14/C15/C28–C33/C39/C54, códigos fechados, texto sem NUL interno, relatórios limpos e canais nativos do filho separados. |



## Gates próprios — verified at e1bd083060c949c50ed77540bffe3bf50d534a94

| Plataforma / alvo | Total | Pass | Fail | Skip | Exit |
|---|---:|---:|---:|---:|---:|
| Windows privacidade inteira |105|105|0|0|0|
| WSL privacidade inteira |105|105|0|0|0|
| Windows npm — governança |6|6|0|0|0|
| Windows npm — fixtures code-review |16|16|0|0|0|
| Windows npm — doctor |417|410|0|7|0|
| Windows npm — integrações |193|187|0|6|0|
| WSL npm — governança |6|6|0|0|0|
| WSL npm — fixtures code-review |16|16|0|0|0|
| WSL npm — doctor |417|416|0|1|0|
| WSL npm — integrações |193|181|0|12|0|

Cada npm test: **632 testes,619 pass,13 skips,0 fail/cancelled/todo, exit0**. Privacidade:99 nomes de topo+seis subtestes=105, todos individualmente aprovados nos quatro logs. C35 incluído. `E/proof-index.json` associa nomes reais/linhas de fonte, linhas dos quatro logs, cada seletor Proof e seus matches, quatro regressões I4, skips e limites. Resultado: nenhum nome sem execução e nenhum seletor sem match; o editorial C15 anterior foi corrigido e C18 usa o literal `I5-C18bloco`. Nenhum marcador-canário nos quatro logs. Nenhuma execução anterior do autor ou de outro Verifier foi usada como gate próprio.

Skips e não execuções não contados como prova executada:

- Windows doctor7: agent-resolution-formal5-2 ENOTDIR POSIX; agent-resolution-C2 realpath/symlink POSIX; fifo-config-formal8-4 FIFO/link (2); fs-adapter-formal8-4 FIFO/link/controle (3). Integrações6: I4-C15 sinais POSIX, I4-C25b modos POSIX, I4-C25j/k/l ACL Linux, I4-C25m ACL macOS.
- WSL doctor1: configuration-trust-C2/C5/C8/hermes-shadow hermes_cli.PYD (sufixo maiúsculo exige Windows). Integrações12: I4-C18–C23/C37/C44b runtime Hermes ausente (8), I4-C25g/h/i DACL Windows (3), I4-C25m macOS (1).
- Windows22 subcasos internos não executados, com nomes/motivos no índice:21 restrições de symlink de arquivo EPERM e um caso de modo POSIX inaplicável. Junções executaram. WSL registrou observação Hermes de I4-C35 não executada por runtime ausente; as provas nativas Hermes executaram no Windows.
- macOS e Linux nativo fora de WSL não executados localmente; nenhuma comprovação dessas plataformas alegada. Nenhum skip no alvo de privacidade.

## Swept, limites e encerramento

**verified at HEAD atual:** guards de exclusão, pseudopropriedade JSON e sanitizador compartilhado; provas de boundary/CLI, arquivos reais, lock e concorrência reexecutadas. **carried from e34791acd13501e436ed4a9ad8d26261aca91fb3**, cadeia completa acima: restrições intocadas de receptor limitado por processo, callback/fila Hermes não bloqueante e demais decisões Swept. A fonte mantém essas restrições; os gates exercitam regressões sem reabrir a #4.

Perfil light: comparação de UI, Coverage join, Test policy e fault injection sistemático não exigidos nem executados. Nenhuma fonte vinculante de UI e nenhuma seção normativa Test policy/Coverage ausente foi inventada. Os testes existentes de falha parcial/IO e suas guardas executaram como provas normais; isso não é uma campanha independente de mutação. Não houve alteração de produto/teste/config/critério nem probe/teste novo.

A matriz e os conjuntos têm casos concretos tabelados, não o produto cartesiano universal. Persistem limites explícitos de formatos/nomes, codificação fora da query, camada percentual única (`%255F` não é `_`), flag com NBSP e esquemas não listados. Texto reserializado foi julgado acima com risco exposto. A contagem de aspas não é parser e pode remover texto útil; composições/autoridade/multiline/propriedades/comentários reconhecidos são recusados. C21 prova4096/4097 na decisão pura e no envelope minimizado, sem alegar atingir ramo pós-pseudonimização hoje inalcançável; privacy_failure positivo usa API em processo porque JSON não representa Proxy/getter. Tempos locais C14h não são SLA; REDs/benchmarks autorais foram lidos, não executados por mim.

**Achados funcionais bloqueantes: nenhum. PASS59/59; oito AC PASS dentro do contrato aprovado.** Nota factual não bloqueante: recibo autoral C14m diz165 remoções; fonte/prova têm163, conforme cálculo e precisão acima. Esta conclusão independente não substitui formal4/ready; o coordenador recebe o veredito e decide a continuidade já autorizada.

Escritos somente este relatório e os próprios scripts/logs/índices/cópias sob E, além do scratch WSL contido identificado. Fonte original conferida limpa antes/depois dos gates; após o relatório, somente `.checks/issue-5-privacidade.verified.md` difere e HEAD permanece exato, conforme `E/source-final.json`. Cópia final preservada em `E/round6-final.md`; histórico Round5 e demais evidências preservados. Nenhum subagente, commit, review:run, push, PR, merge, deploy, instalação, limpeza, modelo real, rede de produto, sessão/config pessoal ou repetição da preparação/probe proibida. Nenhum stash/reset ou mutação comparativa na fonte original.



## Índice nominal das provas executadas

Linhas nos logs de E, respectivamente Windows privacidade / WSL privacidade / Windows npm / WSL npm. Cada célula aponta resultado aprovado; o arquivo JSON traz também a linha de declaração de cada teste e todos os padrões Proof.

| Nome literal | Win P | WSL P | Win N | WSL N |
|---|---:|---:|---:|---:|
| I5-C55 demo: start → ingest → stop → export → delete, opt-in separado, disable e prune com relógio controlado | 3 | 3 | 594 | 571 |
| I5-C56 oito produtores concorrentes com stop e depois delete: contagem coerente e nada reaparece | 9 | 9 | 595 | 572 |
| I5-C34 guia traz a matriz idêntica a CONTENT_TABLE, defaults, limites, códigos, prune manual, canais nativos e a ressalva da detecção | 15 | 15 | 596 | 573 |
| I5-C35 o guia lista como comprovadas só as plataformas com execução real registrada no build.md | 21 | 21 | 597 | 574 |
| I5-C41 tabela de transições stop/disable | 27 | 27 | 598 | 575 |
| I5-C45 retenção conta do encerramento, igualdade seleciona e active nunca | 33 | 33 | 599 | 576 |
| I5-C52 admissão: 500 eventos e 8 388 608 bytes exatos; o seguinte e os demais recusados | 39 | 39 | 600 | 577 |
| I5-C51 falha de unlink no meio da exclusão sai 5 partial_delete e novo delete --apply conclui | 45 | 45 | 601 | 578 |
| I5-C20 hook lê exatamente 1 MiB e conta inputTooLarge com 1 byte a mais; ingest lê linha de 64 KiB e recusa 64 KiB + 1 | 51 | 51 | 602 | 579 |
| I5-C31 nenhum módulo de privacidade importa rede e o demo e os hooks não fazem chamada de rede | 57 | 57 | 603 | 580 |
| I5-C1b sem captura hook, ingest e wrapper não levam conteúdo e contam content_disabled por evento de ferramenta | 63 | 63 | 604 | 581 |
| I5-C10b o mesmo ID em dois processos de hook dá pseudônimos diferentes; no mesmo wrapper, o mesmo | 69 | 69 | 605 | 582 |
| I5-C14 canários das cinco categorias em conteúdo não aparecem em nenhum canal do debugger, com e sem opt-in | 75 | 75 | 606 | 583 |
| I5-C14b token como chave de argumentos MCP e nome de query codificado não chegam a temporários, lock, arquivos nem export | 81 | 81 | 607 | 584 |
| I5-C14c valor de query com token percent-encoded não chega a temporários, lock, arquivos, logs nem export | 87 | 87 | 608 | 585 |
| I5-C14e valor sensível com vírgula/escape e userinfo com vários @ não chegam a temporários, lock, arquivos, logs nem export | 93 | 93 | 609 | 586 |
| I5-C14g valor sensível composto: comando omitido como unsanitizable e saída com a palavra inteira removida, sem chegar a temporários, lock, arquivos, logs nem export | 99 | 99 | 610 | 587 |
| I5-C14j valor sensível em bloco multilinha, na linha seguinte, depois de tag/âncora ou de comentário num resultado textual: campo omitido como unsanitizable, evento preservado, sem chegar a temporários, lock, arquivos, logs nem export | 142 | 142 | 618 | 595 |
| I5-C15canários em IDs, nomes e caminhos não aparecem em nenhum canal do debugger | 148 | 148 | 619 | 596 |
| I5-C26 relatório v2 traz a contagem exata dos seis códigos para um lote misto | 154 | 154 | 620 | 597 |
| I5-C29 entrada hostil com canários: hooks com stdout vazio e exit 0; wrapper preserva stdout e código 17 | 160 | 160 | 621 | 598 |
| I5-C33 o wrapper repassa canário nativo do filho enquanto o relatório do debugger não o contém | 166 | 166 | 622 | 599 |
| I5-C14l credencial curta depois de Basic/Bearer num resultado textual sai com sensitive_removed e não chega a temporários, lock, arquivos, logs nem export | 172 | 172 | 623 | 600 |
| I5-C14n Basic/Bearer em outra caixa e credencial depois de quebra num resultado textual saem com sensitive_removed; cabeçalho que termina no esquema sai com unsanitizable; nada chega a temporários, lock, arquivos, logs nem export | 178 | 178 | 624 | 601 |
| I5-C16d chave própria __proto__ em argumentos MCP pelo ingest/export real fica como membro próprio, mascarado por dentro e sem perda silenciosa | 184 | 184 | 625 | 602 |
| I5-C1 sem opt-in nenhum evento de ferramenta leva conteúdo e cada um conta content_disabled | 190 | 190 | 626 | 603 |
| I5-C4 com opt-in cada linha da matriz produz exatamente o campo previsto, sanitizado | 196 | 196 | 627 | 604 |
| I5-C5 ferramenta, evento, contrato ou formato fora da matriz → content null e unsupported_content | 202 | 202 | 628 | 605 |
| I5-C6 prompts, raciocínio, mensagem final, Skill, collab e Hermes nunca produzem conteúdo com opt-in | 208 | 208 | 629 | 606 |
| I5-C7 resultado suportado que mostra SKILL.md é guardado sanitizado como dado, sem executar; sem opt-in continua omitido | 214 | 214 | 630 | 607 |
| I5-C9 todo ID aceito vira pseudônimo h1 estável na captura, inclusive entre sessionId e parentSessionId | 220 | 220 | 631 | 608 |
| I5-C11 os 11 campos de nome com caminho, @, ~, drive ou segredo são removidos com sensitive_removed | 226 | 226 | 632 | 609 |
| I5-C11b nome hostil que muda entre leituras não escapa: decide o valor entregue no envelope | 232 | 232 | 633 | 610 |
| I5-C12 campo path vira só ref, sem nenhum componente original | 238 | 238 | 634 | 611 |
| I5-C13 toda entrada privacy é código fechado sem valor descartado | 244 | 244 | 635 | 612 |
| I5-C16 subárvore sob chave sensível é descartada inteira com sensitive_removed | 250 | 250 | 636 | 613 |
| I5-C17 URL com userinfo e parâmetro sensível (literal) | 256 | 256 | 637 | 614 |
| I5-C16b chave de structured com formato de token sai inteira com sensitive_removed, sem descer na subárvore | 262 | 262 | 638 | 615 |
| I5-C16c chave própria __proto__ vinda de JSON.parse fica como propriedade própria do objeto comum projetado, sem trocar protótipo | 268 | 268 | 639 | 616 |
| I5-C17b parâmetro de query com nome sensível codificado tem o valor removido; o nome fica como veio | 274 | 274 | 640 | 617 |
| I5-C17c valor de query com formato de token em uma camada de percent encoding é removido inteiro; nome e demais parâmetros ficam literais | 280 | 280 | 641 | 618 |
| I5-C14d valor de nome sensível é a palavra inteira de shell: vírgula, aspas, escapes e '-' inicial saem juntos; separadores reais delimitam | 286 | 286 | 642 | 619 |
| I5-C17d userinfo de URL sai até o último @ da autoridade; @ em caminho, query e fragmento fica | 292 | 292 | 643 | 620 |
| I5-C14f valor sensível composto: composição aberta omite o campo; NBSP, aspa e concatenação coladas saem com a palavra inteira | 298 | 298 | 644 | 621 |
| I5-C14k credencial curta depois de Bearer/bearer/Basic (1 a 8 caracteres, padding) é removida; esquema sem valor e palavras fora da regra não mudam | 304 | 304 | 645 | 622 |
| I5-C14m Bearer/Basic em qualquer caixa ASCII e credencial depois de espaço, tab ou quebra são removidos com a caixa e os separadores da entrada; cabeçalho que termina no esquema antes da credencial omite o campo | 310 | 310 | 646 | 623 |
| I5-C14i valor sensível em bloco multilinha, na linha seguinte, depois de tag/âncora ou de comentário omite o campo; indicador sem linha seguinte ou com texto na mesma linha segue a regra anterior | 316 | 316 | 647 | 624 |
| I5-C14h sanitização de 1 MiB numa linha com muitos valores termina em tempo linear | 322 | 322 | 648 | 625 |
| I5-C17e userinfo com aspas, escapes ou vários @ sai inteiro até o último @; autoridade aberta no fim omite o campo; URLs entre aspas ficam | 328 | 328 | 649 | 626 |
| I5-C18bloco de chave privada fechado ou não é descartado inteiro; o texto antes permanece (literal) | 334 | 334 | 650 | 627 |
| I5-C19 surrogate isolado, NUL e chave fora do padrão são omitidos com unsanitizable | 340 | 340 | 651 | 628 |
| I5-C21 envelope sanitizado de 4096 bytes é aceito; 4097 descarta com envelope_oversize | 346 | 346 | 652 | 629 |
| I5-C22 conteúdo de 8192 bytes não é truncado; 8193 é truncado em UTF-8 válido | 352 | 352 | 653 | 630 |
| I5-C23 profundidade 8 e 128 membros aceitos; 9 ou 129 omitem o conteúdo inteiro | 358 | 358 | 654 | 631 |
| I5-C24 segredo que atravessa a posição de corte não deixa prefixo no resultado | 364 | 364 | 655 | 632 |
| I5-C25 com orçamento esgotado ref de caminho e IDs nunca são cortados | 370 | 370 | 656 | 633 |
| I5-C28 exceção na sanitização descarta só a parte insegura com privacy_failure, sem mensagem e sem nova tentativa | 376 | 376 | 657 | 634 |
| I5-C36 start cria captura active, conteúdo off, 7 dias, ID próprio e o layout literal | 382 | 382 | 658 | 635 |
| I5-C2 conteúdo é opt-in por captura e não é herdado | 388 | 388 | 659 | 636 |
| I5-C37 --retention-days aceita 1 e 365 e rejeita fora do contrato sem criar nada | 394 | 394 | 660 | 637 |
| I5-C38 --root é obrigatório, sem default, e precisa ser um diretório existente | 400 | 400 | 661 | 638 |
| I5-C41b stop/disable pelo CLI seguem a tabela de transições e são idempotentes | 406 | 406 | 662 | 639 |
| I5-C44 delete mostra prévia sem mudar a árvore e --apply remove stopped/disabled, nunca active | 412 | 412 | 663 | 640 |
| I5-C46 prune: prévia sem mudança, --apply com now injetado remove só as vencidas, relógio real preserva recém-parada | 418 | 418 | 664 | 641 |
| I5-C47s lock presente: start/stop/disable/delete/prune/status saem 4 sem mutação e o lock alheio fica | 424 | 424 | 665 | 642 |
| I5-C49 delete recusa link/junção, subdiretório e arquivo alheio sem apagar nada e preserva alheios fora da captura | 430 | 430 | 666 | 643 |
| I5-C49b pasta .deleting-<id> inesperada junto da captura ativa ou parada: delete e prune recusam foreign_entry sem ler nem apagar nenhuma das duas | 436 | 436 | 667 | 644 |
| I5-C51b retomada legítima: só a pasta em exclusão — com chave e estado, só com state.json ou já sem state.json (vazia) — é concluída por delete e por prune | 442 | 442 | 668 | 645 |
| I5-C50s a chave nunca aparece no status e sai com a captura | 448 | 448 | 669 | 646 |
| I5-C43s status isolado por captura, JSON v1 e --help em português | 454 | 454 | 670 | 647 |
| I5-C54s state.json e .lock têm exatamente as chaves do Landing | 460 | 460 | 671 | 648 |
| I5-C32s códigos de uso e de estado do lote de armazenamento, sem eco | 466 | 466 | 672 | 649 |
| I5-C3 variáveis herdadas e configurações de agente no cwd não ativam conteúdo | 472 | 472 | 673 | 650 |
| I5-C4b com --content o CLI real grava args e results sanitizados para claude, codex-hooks e codex-exec | 478 | 478 | 674 | 651 |
| I5-C8 payloads que mandam criar arquivo não criam nada nem iniciam processo | 484 | 484 | 675 | 652 |
| I5-C10 o mesmo ID em duas capturas dá pseudônimos diferentes | 490 | 490 | 676 | 653 |
| I5-C26b status traz a contagem exata de cada código para lotes mistos | 496 | 496 | 677 | 654 |
| I5-C27 contentOmitted e dropped são separados e o status tem conjunto de chaves exato, sem cobertura | 502 | 502 | 678 | 655 |
| I5-C30 falha de rename na gravação: ingest sai 5 io_failure, estado e dados anteriores idênticos, nenhum temporário | 508 | 508 | 679 | 656 |
| I5-C32 cada código de erro do privacy sai de um cenário real com JSON exato e sem eco | 514 | 514 | 680 | 657 |
| I5-C39 ingest dos quatro agentes grava só registros v1 válidos e nenhum arquivo, temporário ou lock tem canário | 520 | 520 | 681 | 658 |
| I5-C40 ingest não inicia processo nem abre arquivo fora de <root>/skill-me-privacy/ | 526 | 526 | 682 | 659 |
| I5-S-databytes-cli state.json com dataBytes acima de 8 MiB sai capture_invalid pelo CLI sem abrir o segmento | 532 | 532 | 683 | 660 |
| I5-C42 captura stopped ou disabled recusa ingest com capture_not_active e árvore idêntica | 538 | 538 | 684 | 661 |
| I5-C43 status e export isolados por captura, JSON v1 e --help em português | 544 | 544 | 685 | 662 |
| I5-C47 com .lock presente ingest e export saem 4 lock_present sem mutação e o lock alheio fica | 550 | 550 | 686 | 663 |
| I5-C48 depois de stop/disable/delete um ingest atrasado sai 3 e não grava nem recria a captura | 556 | 556 | 687 | 664 |
| I5-C50 a chave nunca aparece em export/status e sai com a captura | 562 | 562 | 688 | 665 |
| I5-C52b 510 linhas pelo CLI: persisted 500 e dropped 10 por capture_event_limit | 568 | 568 | 689 | 666 |
| I5-C53 lote misto pelo ingest: accepted, persisted, malformed e dropped exatos, accepted >= persisted | 574 | 574 | 690 | 667 |
| I5-C54 state.json e .lock têm exatamente as chaves do Landing e nenhum canário depois de ingest real | 580 | 580 | 691 | 668 |
| I5-C42s captura stopped ou disabled recusa novos registros sem mudar a árvore | 586 | 586 | 692 | 669 |
| I5-C48s depois de stop/disable/delete um produtor atrasado não grava nem recria a captura | 592 | 592 | 693 | 670 |
| I5-C52s storage admite 500 de 510 registros e exatamente 8 MiB | 598 | 598 | 694 | 671 |
| I5-C53s status traz contadores exatos de um lote misto e accepted >= persisted | 604 | 604 | 695 | 672 |
| I5-C30s falha de rename na gravação deixa estado e dados anteriores idênticos e nenhum temporário | 610 | 610 | 696 | 673 |
| I5-S-bounded controle ou segmento maior que o limite é recusado sem ler o arquivo inteiro | 616 | 616 | 697 | 674 |
| I5-S-databytes state.json com dataBytes acima de 8 MiB é capture_invalid antes de abrir o segmento | 622 | 622 | 698 | 675 |
| I5-S-record o storage recusa o que não é registro v1 sem gravar nada | 628 | 628 | 699 | 676 |
| bloco | 106 | 106 | 612 | 589 |
| linha-seguinte | 112 | 112 | 613 | 590 |
| tag-ancora | 118 | 118 | 614 | 591 |
| tag-mesma-linha | 124 | 124 | 615 | 592 |
| ancora-mesma-linha | 130 | 130 | 616 | 593 |
| comentario | 136 | 136 | 617 | 594 |

| Regressão literal adicional de npm | Win N | WSL N |
|---|---:|---:|
| I4-C36 hooks Claude e Codex: seis falhas do consumidor/entrada mantêm saída neutra | 509 | 509 |
| I4-C13 códigos 0 e 17 do filho são preservados mesmo com o destino falhando | 498 | 498 |
| I4-C16 stdout repassado byte a byte e de forma incremental; JSONL consumido com limites | 501 | 501 |
| I4-C47 a suíte de integrações faz parte do npm test e da CI | 515 | 515 |
