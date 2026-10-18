# Issue #5 — verificação independente

**Verdict: PASS — 59/59 checks e oito AC comprovados.** R7-1 e R7-2 estão resolvidos: os dois seletores corrigidos encontram um único título no arquivo indicado, e ambos os testes passaram nominalmente nos quatro alvos completos desta rodada. Nenhum resultado antigo contou como gate atual. Nenhum finding aberto no alcance desta rodada.

**Profile:** light. **Round:** 8 — scoped. **Verifier:** subagente fresco `/root/verify_issue5_round8`, independente dos autores, despachado pelo coordenador da entrega inteira. Autorização específica da #5: “autorizo quantos precisaram para resolver”, registro `157add2`, preservada na task/aprovação/issue e confirmada pelo formulário. Quatro revisões formais e sete verificações independentes anteriores; máximo técnico formal10. Esta rodada não executa revisão formal, não concede ready e não autoriza merge.

**HEAD verified at:** `b23c69019503b8b946ad610388d7b7234f43ba2a`. **Feature range:** `1b6685fe97862ac1a2d2cff1e4d9f0e1f09a6a27..b23c69019503b8b946ad610388d7b7234f43ba2a`. **Scoped:** `714525171640ffa3412b2afe85a41f3feed886a5..b23c69019503b8b946ad610388d7b7234f43ba2a` mais todos os não-PASS Round7, C5/R7-1 e C14/R7-2. O diff real contém somente `.checks/issue-5-privacidade.md` e `.checks/issue-5-privacidade.verified.md`: dois seletores Proof, nota editorial aditiva e registro FAIL7; código, testes, critérios, guia, build, configuração e core idênticos ao Round7. Escopo confirmado por Git, sem presumir a intenção do reparo.

## Fontes e continuidade

**Verified at b23c69019503b8b946ad610388d7b7234f43ba2a:** brief Round8 e verify.md integrais, skill tlc-implement, AGENTS/CLAUDE, plano/20 critérios, checklist/Proof/Landing/Swept, aprovação/handoff/incidente, guia e recibos build pertinentes, scripts/code-review/README.md, package/config e snapshot fornecido `issue-approved-v7.json` (oito AC, corpo7569 e um comentário). O snapshot inalterado é o contexto recebido; não foi feita nova leitura remota por este Verifier. CONTRIBUTING e spec inicial foram procurados no inventário versionado sem resultado. A spec inicial é expressamente não vinculante e não existe fonte de UI vinculante.

Análise funcional intocada **carried from `714525171640ffa3412b2afe85a41f3feed886a5` (Round7)**. Sua cadeia completa: `e1bd083060c949c50ed77540bffe3bf50d534a94` → `e34791acd13501e436ed4a9ad8d26261aca91fb3` → `79958b506b3e6f694fb3adf95238ccbb654cb0d6` → `f79b944fcc255f84298f04557427ec8b1666b42c` → `ed7dec25b601942591ed19d175a193a7fecf1049` → `be882a54b989f4069d3870c050914d9af7b6e073`. O antigo juízo Round6 sobre Basic reserializado foi rejeitado pelo formal4 e não é carregado. O Round7 comprovou os reparos Basic/nomes Cookie-auth escapados e text:string missing/null; seu FAIL57/59 foi exclusivamente de rastreabilidade e permanece FAIL no histórico.

`E` = `.checks/code-review/issue-5/verifier-round8-20261018/`. Relatório FAIL7 integral preservado antes de qualquer substituição em `E/round7-before.md`; nenhum histórico foi apagado ou reinterpretado. As 59 linhas continuam contabilizadas. `E/citation-refresh.json` registra519 linhas de fonte citadas, todas idênticas ao SHA Round7; nenhuma linha de teste mudou no diff scoped. `E/test-declarations.txt` contém buscas `rg -n` com contexto; as duas provas antes sem match foram lidas com o corpo e suas asserções. A análise nova se limita ao diff real e aos dois não-PASS, com todas as execuções novas no HEAD exato.

## Identidade e isolamento

**Verified at b23c69019503b8b946ad610388d7b7234f43ba2a.** Fonte original limpa antes e durante os gates. Archive Git byte-exact com `core.autocrlf=false`, SHA256 `24b47e655de37f26b140aa5a2edc36be2c580a8167164340646770e2c6e0e705`, `get-tar-commit-id` igual ao HEAD. Os208 blobs foram conferidos antes e depois nas cópias Windows e WSL. `identity.json`, `blob-manifest.json`, `windows-blobs-after.json`, `wsl-blobs.json`, `wsl-blobs-after.json` registram isso. `core-diff.log` vazio/exit0 e os cinco hashes originais em `core-hashes.json` confirmam core intacto. Dependências locais copiadas; nenhuma instalação ou rede de produto.

Windows Node24.21.0 em `E/windows-exact-copy`, via normal require_escalated desde a primeira execução por incapacidade TEMP sandbox já demonstrada. A leitura WSL sem escalonamento retornou `Wsl/E_ACCESSDENIED` de capacidade; a via normal require_escalated confirmou Ubuntu/uid1000 antes de qualquer mutação. Nenhuma rejeição automática de política ocorreu. WSL Node24.13.0 em `/tmp/skill-me-i5-verifier8-issue5-IUZCtH/copy`, script em arquivo, MSYS_NO_PATHCONV=1, mktemp nativo e contenção/realpath antes de copiar/extrair, SHA256+commit do tar reconferidos. Sem scripts inline entre shells, `/repo` ou `/src.tar` na raiz, antiga preparação/probe, sessões/configs pessoais ou limpeza.

Scripts Round7 foram reutilizados com diff conferido, alterando só SHA, prefixos próprios e nome da cópia anterior. Uma invocação por alvo/plataforma: privacidade inteira sem filtro (C35 incluído) e npm test completo. O npm executa fixtures do motor, não revisão formal. Um script próprio de indexação inicialmente comparou bytes LF do Git com hashes CRLF do checkout; a indexação foi corrigida para comparar a mesma representação. Isso não alterou nem repetiu testes e o diff Git do core permaneceu vazio. Nenhum produto/teste/configuração/critério foi escrito.

## Findings Round7 resolvidos — verified at b23c69019503b8b946ad610388d7b7234f43ba2a

| Finding preservado | Correção e prova atual | Resultado |
|---|---|---|
| R7-1 — C5 Proof vazio | `.checks/issue-5-privacidade.md:191` agora usa `^I5-C5centrada `; match único em `tests/integrations/privacy/outputs.cli.test.mjs:1027`. Título literal completo no índice nominal; passou em Windows P/N e WSL P/N. `:1048` exige `isDeepStrictEqual(ingested.body.batch.contentOmitted,{unsupported_content:5})`; `:1056` exige `[null,null,null,null,list("x",[""]),list("y",["ok"])]`; `:1058` motivos literais por registro; `:1062` status exato5. | PASS |
| R7-2 — C14 Proof vazio | `.checks/issue-5-privacidade.md:228` agora usa `^I5-C14ivalor `; match único em `tests/integrations/privacy/policy.unit.test.mjs:1085`. Título literal completo no índice nominal; passou nos quatro alvos. `refusedCases:724` exige `same(sanitizeText(input),{ok:false},...)`; `exactCases:613–614` exige `{ok:true,text:expected,removed}` com esperados literais locais em`:1087–1128`,`:1141–1179`,`:1184–1226`; `:1133–1135` e`:1231–1233` omitem só o campo e exigem motivo unsanitizable/comando preservado. | PASS |

`same` em `policy.unit.test.mjs:441` é `assert.ok(isDeepStrictEqual(actual,expected),label)`. As tabelas distinguem bloco, valor na linha seguinte, tags/âncoras e comentário, mais os controles; não se trocou a asserção por simples ausência de canário. Nenhum nome, teste, asserção ou critério foi alterado. `E/selector-file-index.json` confirma todos91 seletores Proof nos arquivos indicados, sem match vazio. `E/proof-index.json` confirma existência e aprovação nominal atual. A nota editorial não altera as claims. O FAIL7 continua preservado como FAIL57/59; esta aprovação resulta das provas Round8.


## Análise funcional — carried from 714525171640ffa3412b2afe85a41f3feed886a5

**Carried from 714525171640ffa3412b2afe85a41f3feed886a5 (Round7); nenhuma fonte de produto desta seção mudou.** `sanitize.mjs:43–69` reutiliza uma gramática fechada de separador escapado: uma ou mais barras e n/r/t/u000a/u000d/u0009/u0020, hex A/D aceitos, sem decodificar o texto. Regra4 reconhece esse separador antes da credencial e como fronteira antes do esquema. Regras3/5 reconhecem a fronteira depois do escape; atribuição relê auth/pwd/passwd depois da letra do escape, e nomes entre aspas duplas escapadas com a mesma sequência dos dois lados são reconhecidos. Flag aceita o mesmo separador entre nome e valor. `assignedValue:270–285` preserva o caminho de recusa existente e evita reler arbitrariamente todo nome comum. Ordem das regras, completamento de palavra, marcador interno e orçamentos permanecem.

C14o prova116 remoções (8 caixas×13 separadores=104, mais12 casos),4 recusas,42 controles, resultado/omissões exatos na política. A forma conhecida do formal4 com aspas escapadas agora sai inteira pelo nome sensível; a forma de uma camada e Basic sob chave comum também são cobertas. C14p atravessa ingest→temporários antes de rename→dados→export/status, com resultados literais e contador exato3 remoções+1 recusa. C14q prova267 remoções (12×(6 cabeçalhos+6 atribuições×2 separadores+3flags)=252, mais15 casos),4 recusas e16 controles, não apenas ausência genérica de substring. C14r faz a mesma passagem real para x-escape-Cookie/auth e nome entre aspas escapadas, inclusive controle comum. Contagens calculadas da fonte, não herdadas do recibo.

`content.mjs:185–187` exige valor string na entrada type:text: ausente/null lança Unsupported, como outro tipo inválido. O catch em`:284` produz conteúdo null e somente content:unsupported_content. O conteúdo anterior do evento também sai; não vira string vazia. C5b cobre9 inválidos (6 formas e3 listas mistas),4 controles exatos (vazio legítimo, texto+vazio, misto não textual e somente não textual). C5centrada exerce6 eventos reais,4 inválidos e2 controles, contador unsupported_content5 (inclui uma entrada image), formas/motivos exatos e ausência do argumento-sonda em arquivos/canais.

Alcance relido: cleanText de folhas/listas/structured compartilha sanitizeText (`content.mjs:75–82`); nomes do envelope usam isUnsafeName (`policy.mjs:47–55`); observação usa applyPolicy (`observation.mjs:86`); ingest adapta/decide em`:63` e somente chama appendRecords depois em`:114`. C11/C15/C16/C17/C19 e limites/ordem/contagens reexecutam a fronteira compartilhada. Regressões formal3 Basic curto/case/LF real, own JSON __proto__ e coexistência tomb+captura continuam nos quatro gates; sua análise intocada é carried from Round6, sem omitir a execução atual de C14k/m/l/n, C16c/d, C49b/C51b e concorrência.

Limites novos foram confrontados com AC2/critério6: a gramática fechada não promete interpretar serializações arbitrárias. Aspas escapadas com números diferentes de barras, nomes entre aspas simples escapadas, N/R/T maiúsculos fora da regra3, outros escapes/codificações, NBSP e esquemas não listados permanecem fora dela. Isso não é a antiga aceitação do vazamento Basic conhecido: esse cenário e os casos Cookie/auth conhecidos agora têm resultados exatos e canais reais comprovados. Não foi identificado outro defeito concreto dentro da gramática garantida. Perdas de palavras, caminhos e sufixo JSON de uma linha são declaradas e testadas. Não há parser/decodificador universal nem promessa de sanitização de qualquer segredo.


## Checks C1–C59 — provas verified at b23c69019503b8b946ad610388d7b7234f43ba2a

P = privacidade completa Windows/WSL, N = npm completo Windows/WSL. Todos os nomes estão no índice nominal. C = análise carried from 714525171640ffa3412b2afe85a41f3feed886a5 e cadeia declarada; V = nova análise de rastreabilidade ou gate nesta rodada. As citações de fonte são idênticas ao Round7 e foram conferidas individualmente em E/citation-refresh.json. Para C5/C14, o quadro de resolução e as asserções atuais no início completam as linhas abaixo.

| Check / análise | Claim | Prova nova | Asserção localizada / expressão | Resultado |
|---|---|---|---|---|
| C1 C | Conteúdo desligado sem captura | P C1/C1b | `tests/integrations/privacy/policy.unit.test.mjs:68` `assert.equal(record.content, null)`; `:69` `assert.deepEqual(...,['content:content_disabled'])`; `tests/integrations/privacy/outputs.cli.test.mjs:77` `assert.deepEqual(Object.keys(report.events[0]), ENVELOPE_KEYS)`; `:82`, `:87` omissões exatas 2/3. | PASS |
| C2 C | Opt-in por captura | P C2 | `tests/integrations/privacy/store.cli.test.mjs:98` `assert.equal(runPrivacy(['start','--root',root]).body.capture.content, false)`; `:101` `assert.equal(after.body.capture.content, false)`; `:103` anterior desabilitada false. | PASS |
| C3 C | Ambiente/cwd não liga conteúdo em caminho algum | P C3 | `tests/integrations/privacy/store.cli.test.mjs:678` `assert.deepEqual(result.body.batch.contentOmitted,{content_disabled:entries.length})` para 2/2/3/2; `:685–686` `content === null`, `privacy === ['content:content_disabled']`; `:690` `assert.deepEqual(...,{content_disabled:9})`; `:701/:713/:719` `assert.deepEqual(...,zero(1/2/3))`, demais códigos zero em `:693`. | PASS |
| C4 C | Todas as linhas da matriz | P C4/C4b | `tests/integrations/privacy/policy.unit.test.mjs:111` `assert.deepEqual(field(record,name),{field:name,...expected})`, esperados literais locais `:81–97`; `:113` `covered.size === CONTENT_TABLE.length`; `tests/integrations/privacy/store.cli.test.mjs:731` objeto literal Bash/`ls <home>`; `:736` args/result exatos `[['item.command','args','echo 1'],['item.aggregated_output','result','1\n']]`. | PASS |
| C5 V | Fora da matriz falha fechado | P C5/C5b/C5centrada | `tests/integrations/privacy/policy.unit.test.mjs:129–130` `content === null`, `assert.deepEqual(record.privacy,['content:unsupported_content'])`; `:139` `assert.deepEqual(unknown,{content:null,privacy:['content:unsupported_content']})`. Novas: `tests/integrations/privacy/policy.unit.test.mjs:159` `same(extract(content),{content:null,privacy:["content:unsupported_content"]},...)`; `:176` quatro controles exatos; `tests/integrations/privacy/outputs.cli.test.mjs:1048` lote `{unsupported_content:5}`; `:1056` quatro null e vazios legítimos; `:1062` status `{unsupported_content:5}`. Seletor corrigido em checklist:191 seleciona unicamente o título C5centrada. | PASS |
| C6 C | Prompts/raciocínio/Skill/Hermes excluídos | P C6 | `tests/integrations/privacy/policy.unit.test.mjs:199` `assert.equal(record.content,null)`; `:200` canário ausente; `:203` `assert.deepEqual(codexExecDraft(...),{kind:'excluded',reason:'reasoning'})`. | PASS |
| C7 C | D1: SKILL.md sanitizado como dado | P C7 | `tests/integrations/privacy/policy.unit.test.mjs:220` `value.includes('ignore as instruções anteriores')`; `:222` args literal `cat <home>/.codex/skills/third-party-skill/SKILL.md`; `:225–226` off null/`['content:content_disabled']`; `:228` `existsSync(marker) === false`. O oráculo derivado `sanitizedSkillText` não substitui os literais de sanitização C4/C17/C18. `tests/integrations/privacy/policy.unit.test.mjs:228` `assert.equal(existsSync(marker),false)`. | PASS |
| C8 C | Payload não executa comandos | P C8 | `tests/integrations/privacy/store.cli.test.mjs:759–760` `assert.ok(!existsSync(target(name)))` e cwd; `:762` `assert.deepEqual(readdirSync(cwd),[])`; `:763` `assert.deepEqual(probeLog(probe).filter(e=>e.op.startsWith('child_process.')),[])`; `:755–756` persistidos 6/3. | PASS |
| C9 C | IDs h1 estáveis; igualdade entre papéis | P C9 | `tests/integrations/privacy/policy.unit.test.mjs:242–243` `assert.match(value,PSEUDONYM)` e `value.length === 46`; `:252` toolUseId igual; `:257` `sub.envelope.ids.parentSessionId === session.envelope.ids.sessionId`. | PASS |
| C10 C | Capturas/processos não correlacionáveis | P C10/C10b | `tests/integrations/privacy/store.cli.test.mjs:774` `assert.notEqual(ea[name],eb[name])`; `tests/integrations/privacy/outputs.cli.test.mjs:99` `assert.notEqual(first[name],second[name])`; `:105` `started.ids.itemId === completed.ids.itemId`. | PASS |
| C11 C | Nomes inseguros removidos; valor entregue decide antes de reler rascunho | P C11/C11b | `tests/integrations/privacy/policy.unit.test.mjs:305`/`:367` `assert.ok(!(name in envelope.fields))`; `:306`/`:368` `assert.deepEqual(privacy.filter((e)=>e.startsWith("envelope.")),["envelope."+name+":sensitive_removed"])` (a expressão no fonte usa template literal para esse mesmo alvo); `:308`/`:369` `assert.equal(validateEnvelope(envelope),true)`; `:370` `assert.deepEqual(leaks(JSON.stringify(result.record)),[])`; `:320` `assert.equal(record.envelope.fields[name],value)` nos controles comuns; `:377` `assert.deepEqual(applyPolicy({draft:throwing,payload:{},key:KEY,content:false}),{ok:false,drop:"privacy_failure"})`. Pré-condição do token copiado afirmada em `:351`–`:352`. | PASS |
| C12 C | Paths só como referência | P C12 | `tests/integrations/privacy/policy.unit.test.mjs:389` `assert.deepEqual(record.content.fields,[{field:'tool_input.file_path',role:'args',kind:'path',ref:expectedPseudonym(KEY,'path',filePath)}])`; `:391` `!text.includes(part)` para componentes locais; `:393–394` lista de refs e componentes ausentes. | PASS |
| C13 C | Motivos fechados sem valor | P C13 | `tests/integrations/privacy/policy.unit.test.mjs:408–409` `assert.match(entry,ENTRY)`, `assert.deepEqual(leaks(entry),[])`; `:412` `new Set(record.privacy).size === record.privacy.length`. | PASS |
| C14 V | Cinco segredos no conteúdo, canais reais | P C14/C14b/C14c/C14d/C14e/C14f/C14g/C14h/C14ivalor/C14j/C14k/C14l/C14m/C14n/C14o/C14p/C14q/C14r | `tests/integrations/privacy/outputs.cli.test.mjs:125/:133/:141` `assert.deepEqual(leaks(channel/report),[])`; `:189–190` stdout sem leak/stderr `''`; `:193–198` observações reais antes do rename, `.lock`/tmp vistos e `containsCanary/containsMarker === false`. Novas: `tests/integrations/privacy/outputs.cli.test.mjs:249` `assert.ok(isDeepStrictEqual(...,{q:"fica",nested:{keep:true,list:[{keep:2}]}}))`; `:272`/`:276` marcadores false; `:288` `assert.ok(leaks(text).length===0 && !text.includes(ENCODED_MARKER),label)`; `:318` sete campos exatos; `:320`/`:321` URLs exatas; `:337`/`:341` marcadores false nas duas passadas. Novas asserções/locais no quadro abaixo, com saídas literais e recusas exatas. | PASS |
| C15 C | Cinco segredos em metadados, mesmos canais | P I5-C15canários | `tests/integrations/privacy/outputs.cli.test.mjs:574` categorias exatas `['token','header','url','password','privateKey']`; `:603–608` `assert.match(envelope.ids[name]??'',PSEUDONYM)`, nomes ausentes/sem lacuna; `:617/:624/:631` leaks `[]`; `:678/:682` motivo de nomes e refs h1; `:693–694` leaks `[]`/stderr `''`; `:706–712` ≥8 temporários de cada tipo, lock por comando e todos `containsCanary/containsMarker === false`. | PASS |
| C16 C | Subárvore sensível descartada | P C16/C16b/C16c/C16d | `tests/integrations/privacy/policy.unit.test.mjs:425` `assert.deepEqual(field(record,'item.arguments').value,{query:'ok',nested:{level2:{keep:1}},list:[{},'fica']})`; `:426` `privacy.includes('item.arguments:sensitive_removed')`. `tests/integrations/privacy/policy.unit.test.mjs:464` `same(extracted.privacy,["item.arguments:sensitive_removed"],label)`; `:465` projeção literal com irmãos preservados; `:472`/`:475` 128 aceitos/129 null; `same` é `assert.ok(isDeepStrictEqual(actual,expected),label)` em `:441`. Novas: `tests/integrations/privacy/policy.unit.test.mjs:505–512` serialização/releitura literal e protótipo comum; `:528–531` membro próprio128/129 e motivo exato. `tests/integrations/privacy/outputs.cli.test.mjs:1087–1094` export literal, own keys e contador `{sensitive_removed:1}`. | PASS |
| C17 C | URL sem userinfo/token | P C17/C17b/C17c/C17d/C17e | `tests/integrations/privacy/policy.unit.test.mjs:432` `assert.deepEqual(sanitizeText(...),{ok:true,text:'https://host/p?token=[removido]&page=2',removed:true})`; `:434` comando literal com a mesma URL sanitizada. `tests/integrations/privacy/policy.unit.test.mjs:549`/`:587` `same(sanitizeText(input),{ok:true,text:expected,removed:true},label)`, esperados locais em `:535` e `:563`; `:552`/`:601` `assert.deepEqual(sanitizeText(control),{ok:true,text:control,removed:false})`; `:609` sem marcador literal/codificado. `same` em `:441`; URL esperada literal em `tests/integrations/helpers/privacy-canaries.mjs:44`. Novas `tests/integrations/privacy/policy.unit.test.mjs:614` `same(sanitizeText(input),{ok:true,text:expected,removed},label)` com esperados literais nas tabelas literais locais (com novas posições registradas no índice); `:724` `same(sanitizeText(input),{ok:false},label)`; `:1321–1322` campo omitido e motivo exato. | PASS |
| C18 C | Chave privada fechada/aberta removida | P I5-C18bloco (nome real) | `tests/integrations/privacy/policy.unit.test.mjs:1329/:1331` `assert.deepEqual(sanitizeText(...),{ok:true,text:'antes\n[removido]\ndepois'/'antes [removido]',removed:true})`; `:1333` resultado literal `cabeçalho\n[removido]`. | PASS |
| C19 C | Surrogate/NUL/chave inválida omitidos | P C19 | `tests/integrations/privacy/policy.unit.test.mjs:1337–1338` `assert.deepEqual(sanitizeText(...),{ok:false})`; `:1341/:1343` campo undefined e `unsanitizable`; `:1347` `assert.deepEqual(...,{ok:'sim',nested:{'a.b-c_9':3}})`. | PASS |
| C20 C | Entrada 1MiB e linha 64KiB, limite/+1 | P C20 | `tests/integrations/privacy/limits.cli.test.mjs:27` `assert.equal(exact.report.events.length,1)`; `:33` `assert.equal(over.report.counters.inputTooLarge,1)`; `:42` `assert.deepEqual(read.body.batch,{accepted:1,persisted:1,malformed:{},dropped:{},contentOmitted:{}})`; `:45` `assert.deepEqual(refused.body.batch,{accepted:1,persisted:1,malformed:{oversize_line:1},dropped:{},contentOmitted:{}})`. | PASS |
| C21 C | Envelope 4096 aceito/4097 recusado | P C21 | `tests/integrations/privacy/policy.unit.test.mjs:1385` `validateEnvelope(exact) === true`; `:1387–1388` `checkEnvelopeBudget(exact) === null`, `over === 'envelope_oversize'`; `:1397` `assert.deepEqual(applyPolicy(...),{ok:false,drop:'envelope_oversize'})`. Decisão pura exata; ramo pós-pseudônimo inalcançável hoje, limite declarado. | PASS |
| C22 C | Conteúdo 8192/8193, UTF-8 válido | P C22 | `tests/integrations/privacy/policy.unit.test.mjs:1422–1424` bytes 8192, campo inteiro/`truncated:false`; `:1431–1433` `assert.deepEqual(cut,{field:'tool_input.command',role:'args',kind:'text',value:prefix,truncated:true})`, bytes ≤8192, motivo; prefixos emoji/ç locais. | PASS |
| C23 C | Profundidade 8/9, membros 128/129 | P C23 | `tests/integrations/privacy/policy.unit.test.mjs:1457` `assert.deepEqual(...,nested(8))`; `:1459–1460` null/unsanitizable em 9; `:1462` `assert.deepEqual(...,members(128))`; `:1464–1469` 129/soma por evento null/unsanitizable. | PASS |
| C24 C | Sanitização antes do corte | P C24 | `tests/integrations/privacy/policy.unit.test.mjs:1479` `assert.ok(!value.endsWith(secret.slice(0,k)))` para todo prefixo; `:1480` `!value.includes('SKILL')`; `:1481–1482` motivos sensitive_removed/content_truncated. | PASS |
| C25 C | Ref/ID nunca cortado | P C25 | `tests/integrations/privacy/policy.unit.test.mjs:1489–1490` path undefined/`content_truncated`; `:1492` `assert.equal(id.length,46)`; `:1497–1498` refs inteiras length120 ou motivo de omissão. | PASS |
| C26 C | Contagens exatas dos seis códigos | P C26/C26b/C28 | `tests/integrations/privacy/outputs.cli.test.mjs:729` `assert.deepEqual(...,zeroPrivacy({content_disabled:5,sensitive_removed:1}))`; `tests/integrations/privacy/store.cli.test.mjs:794–796` batch/status iguais ao literal local `{unsupported_content:2,unsanitizable:1,sensitive_removed:3,content_truncated:2}` e off disabled2; privacy_failure positivo só em processo C28. | PASS |
| C27 C | Omissão/descarte separados; sem cobertura | P C27 | `tests/integrations/privacy/store.cli.test.mjs:804` lote literal `{accepted:2,persisted:2,malformed:{},dropped:{reasoning_excluded:1,unknown_event:1},contentOmitted:{content_disabled:1}}`; `:806–809` chaves/contadores exatos e `!/coverage\|complete\|cobertura\|completo/i.test(status.stdout)`. `tests/integrations/privacy/store.cli.test.mjs:804` `assert.deepEqual(result.body.batch,{accepted:2,persisted:2,malformed:{},dropped:{reasoning_excluded:1,unknown_event:1},contentOmitted:{content_disabled:1}})`. | PASS |
| C28 C | Getter/Proxy que lança: falha fechada sem retry | P C28 | `tests/integrations/privacy/policy.unit.test.mjs:1513–1516` null, `assert.deepEqual(record.privacy,['content:privacy_failure'])`, Bash preservado, `reads === 1`; `:1525–1526` Proxy null/failure; `:1531` envelope hostil retorna `{ok:false,drop:'privacy_failure'}`. Getter variável também é exercitado por C11b `:367–382`; este teste mantém o contrato de exceção no conteúdo. | PASS, escopo literal |
| C29 C | Hook neutro; wrapper bytes/17 | P C29; N I4-C36/C13/C16 | `tests/integrations/privacy/outputs.cli.test.mjs:753–755` status0/stdout `''`/leaks `[]`; `:761–763` status17, `assert.deepEqual(run.stdout,Buffer.from(...))`, relatório limpo. Regressões `tests/integrations/failure-matrix.cli.test.mjs:75–76`, `tests/integrations/codex-run.cli.test.mjs:98/:103/:230–231`. | PASS |
| C30 C | Falha de rename preserva commit anterior | P C30 | `tests/integrations/privacy/store.cli.test.mjs:819–822` status5, JSON exato `io_failure`, `assert.deepEqual(snapshotTree(root),before)` para dados/state; `:824` persisted anterior1. | PASS |
| C31 C | Nenhuma rede | P C31 | `tests/integrations/privacy/no-network.test.mjs:21–22` ausência de imports fechados/fetch; `:50` todos passos status0; `:63–64` sonda observada e `assert.deepEqual(entries.filter(e=>e.op==='network'),[])`. | PASS |
| C32 C | 23 erros com JSON fechado sem eco | P C32 | `tests/integrations/privacy/store.cli.test.mjs:867–870` exit da tabela, `assert.deepEqual(result.body,{schemaVersion:1,command,status:'error',error:{code}})`, sem canários/paths; `:900/:910/:914` conflitos/io_failure/partial_delete exatos; stderr `''` em `:34`. | PASS |
| C33 C | Canais nativos separados | P C33 | `tests/integrations/privacy/outputs.cli.test.mjs:772` `assert.deepEqual(run.stdout,Buffer.from(childLine+'\n'))`; `:774` stderr nativo exato presente; `:776` `assert.deepEqual(leaks(JSON.stringify(run.report)),[])`. | PASS |
| C34 C | Guia/matriz/defaults/limites e perdas vigentes | P C34 | `tests/integrations/privacy/docs-privacy.test.mjs:36` `assert.deepEqual(body.map(cells),expected)`; `:56` `assert.match(text,pattern)`; `:58` `assert.ok(GUIDE.includes(code(omission)),omission)`. Guia atual relido: curto/case/quebra/escapes e nomes escapados; perda de text ausente, own __proto__, coexistência/retomada; análise abaixo. | PASS |
| C35 C | Só plataformas realmente executadas | P/N C35, sem filtro | `tests/integrations/privacy/docs-privacy.test.mjs:75` `assert.ok(executed.some(row=>row.startsWith(platform)))`; `:77` macOS/Linux nativo ausentes se não executados. Windows/WSL reexecutados aqui; macOS não. | PASS |
| C36 C | Start/layout/defaults/ID/chave | P C36 | `tests/integrations/privacy/store.cli.test.mjs:44` `assert.match(id,/^[0-9a-f]{32}$/)`; `:46` JSON literal active/false/7; `:54` árvore exata; `:85–86` IDs/chaves diferentes; `:79–80` modos0700/0600 executados WSL. | PASS |
| C37 C | Retenção válida1/365; inválidos recusados | P C37 | `tests/integrations/privacy/store.cli.test.mjs:111` `capture.retentionDays === days` para1/365; `:118–119` status2/invalid_retention; `:125–126` missing_flag_value e snapshot idêntico. `tests/integrations/privacy/store.cli.test.mjs:111` `assert.equal(result.body.capture.retentionDays,days)` (dias1/365 locais); `:119` `assert.deepEqual(result.body,{schemaVersion:1,command:"start",status:"error",error:{code:"invalid_retention"}})`. | PASS |
| C38 C | Root obrigatório/existente/diretório | P C38 | `tests/integrations/privacy/store.cli.test.mjs:134–135` missing_root/snapshot idêntico; `:140` `assert.deepEqual(...,{code:'root_not_found'})`; `:147` root_not_directory; `:149` cwd sem store. | PASS |
| C39 C | Quatro agentes, v1 e escritas limpas | P C39 | `tests/integrations/privacy/store.cli.test.mjs:954–956` chaves exatas, `recordVersion === 1`, `validateEnvelope === true`; `:959–963` temporário/lock observados, `containsCanary/containsMarker === false`; tabela quatro agentes ×off/on. Não representa getter variável em JSON. `tests/integrations/privacy/store.cli.test.mjs:955` `assert.equal(record.recordVersion,1)`; `:956` `assert.equal(validateEnvelope(record.envelope),true,agent)`. | PASS |
| C40 C | Ingest só acessa store/código próprio | P C40 | `tests/integrations/privacy/store.cli.test.mjs:987–990` acessos store observados, `entry.file.startsWith(storePrefix)`, loader próprio observado, `assert.deepEqual(entries.filter(e=>e.op.startsWith('child_process.')\|\|e.op==='network'),[])`. Exceção explícita dos módulos carregados pelo Node. | PASS |
| C41 C | Transições/idempotência | P C41/C41b | `tests/integrations/privacy/lifecycle.unit.test.mjs:34–44` estado/changed/content/endedAt exatos nas seis linhas; `tests/integrations/privacy/store.cli.test.mjs:159/:162/:166/:171` JSON literal stopped/changedfalse/disabled/invalid_transition. `tests/integrations/privacy/lifecycle.unit.test.mjs:39` `assert.equal(result.capture.state,to)`; `:41` `assert.equal(result.capture.content,false)` para disable. | PASS |
| C42 C | Encerrada recusa sem mutar | P C42 | `tests/integrations/privacy/store.cli.test.mjs:1048–1050` status3, `assert.deepEqual(refused.body,{schemaVersion:1,command:'ingest',status:'error',error:{code:'capture_not_active'}})`, snapshot igual. | PASS |
| C43 C | Status/export isolados, JSON1/help PT | P C43/C43s | `tests/integrations/privacy/store.cli.test.mjs:1063/:1066–1067` schemaVersion1, records1, contadores literais; `:1072–1073` `!exportA.stdout.includes(forbidden)`/`!statusA.includes(forbidden)`; `:1078` `assert.match(help.stdout,pattern)` para rotas/PT locais. | PASS |
| C44 C | Delete prévia/apply só encerradas | P C44 | `tests/integrations/privacy/store.cli.test.mjs:206` `assert.deepEqual(snapshotTree(root),before)`; `:210` capture_active; `:217–218` JSON applied/deletedtrue e `!existsSync(captureDir(root,id))` stopped/disabled. | PASS |
| C45 C | Prazo exato/menos1ms/active/endedAt | P C45 | `tests/integrations/privacy/lifecycle.unit.test.mjs:60–61` `assert.equal(isExpired(stopped,ended+7*DAY_MS),true)` e `assert.equal(isExpired(stopped,ended+7*DAY_MS-1),false)`; `:66` active400dias false; `:70` `assert.equal(disabled.endedAt,T0)`; `:71–72` retém após disable. | PASS |
| C46 C | Prune preview/apply/relógio | P C46 | `tests/integrations/privacy/store.cli.test.mjs:253` snapshot igual; `:257–258` somente duas expiradas deletadas/duas preservadas; `:264–266` fresh não selecionada e active preservada. `tests/integrations/privacy/store.cli.test.mjs:257` `assert.deepEqual(applied.body,{...preview.body,applied:true,deleted:[expiredStop,expiredDisable].sort()})`. | PASS |
| C47 C | Lock alheio impede comandos sem mutação | P C47/C47s | `tests/integrations/privacy/store.cli.test.mjs:1091–1097` status4/JSON lock_present, snapshot igual e lock `lock alheio\n`; `:300–305` mesmo contrato nos demais comandos. `tests/integrations/privacy/store.cli.test.mjs:1092` `assert.deepEqual(result.body,{schemaVersion:1,command,status:"error",error:{code:"lock_present"}})`; `:1096` `assert.deepEqual(snapshotTree(root),before)`. | PASS |
| C48 C | Produtor tardio não recria | P C48 | `tests/integrations/privacy/store.cli.test.mjs:1108–1111` status3, código literal conforme delete/not_active, `assert.deepEqual(snapshotTree(root),before)`, `!existsSync(captureDir(root,id))`. | PASS |
| C49 C | Link/foreign recusado; alheio preservado | P C49/C49b | `tests/integrations/privacy/store.cli.test.mjs:328–332` status4/código da tabela, snapshot igual, sentinela externa `'fora da raiz'`; `:355–356` alheios `'alheio'` preservados. Junção Windows/symlink WSL executados. `tests/integrations/privacy/store.cli.test.mjs:331` `assert.deepEqual(snapshotTree(root),before)`; `:332` `assert.equal(readFileSync(path.join(outside,"sentinela.txt"),"utf8"),"fora da raiz")`. Novas: `tests/integrations/privacy/store.cli.test.mjs:405–406` exit4/corpo literal `foreign_entry`; `:416–417` prune com `selected`, `deleted:[]`, duas falhas; `:396–397` árvore/bytes idênticos; `:437–446` só lstat nos nomes, nenhuma operação interna. | PASS |
| C50 C | Chave não exportada e apagada | P C50 | `tests/integrations/privacy/store.cli.test.mjs:1122` export2; `:1125–1126` `!text.includes(form)` parahex/base64/base64url/latin1 e `!/"key"/.test(text)`; `:1130–1131` key/captura ausentes. `tests/integrations/privacy/store.cli.test.mjs:1125` `assert.ok(!text.includes(form))`; `:1130` `assert.ok(!existsSync(path.join(captureDir(root,id),"key")))`. | PASS |
| C51 C | Exclusão parcial visível/retomável | P C51/C51b/C32 | `tests/integrations/privacy/lifecycle.unit.test.mjs:125–129` exit5/partial_delete e pasta/key presentes; `:137–139` exit0/deletedtrue e captures vazio. CLI `tests/integrations/privacy/store.cli.test.mjs:914` JSON partial_delete. `tests/integrations/privacy/lifecycle.unit.test.mjs:125` `assert.equal(partial.exitCode,5)`; `:139` `assert.deepEqual(readdirSync(captures),[])`. Novas `tests/integrations/privacy/store.cli.test.mjs:496–508` state-only/vazia/key+state, prévia literal, retomadas com deletedtrue; `:509–510` active preservada/capture_active. | PASS |
| C52 C |500/501,8MiB/+1 e ordem | P C52/C52b/C52s/S-databytes/S-databytes-cli | `tests/integrations/privacy/lifecycle.unit.test.mjs:78–96/:102` admissão exata/rejeição e posteriores recusados; `tests/integrations/privacy/store.cli.test.mjs:1140` lote literal persisted500/dropped10; `tests/integrations/privacy/store.unit.test.mjs:75–82` disco8388608/sem aumento no próximo. `tests/integrations/privacy/store.unit.test.mjs:235` teto exato `[original.dataFile,8388608]`; `:243`–`:246` exit3/capture_invalid, segmento não aberto, tetos≤64KiB em8388609/1073741824; `:249` append recusa; `tests/integrations/privacy/store.cli.test.mjs:1030` corpo JSON fechado; `:1032` `assert.deepEqual(segmentOpens(probe.log),[])`; `:1034` árvore idêntica; `:1037` export restaurado2. | PASS |
| C53 C | Contadores mistos exatos | P C53 | `tests/integrations/privacy/store.cli.test.mjs:1174` `assert.deepEqual(counters,{accepted:3,persisted:3,malformed:4,dropped:{reasoning_excluded:1,unknown_event:1},contentOmitted:{content_disabled:2}})`; `:1175` `accepted >= persisted`. | PASS |
| C54 C | State/lock forma exata/sem marcador | P C54/C54s | `tests/integrations/privacy/store.cli.test.mjs:1195` `assert.deepEqual(Object.keys(lock).sort(),['lockVersion','nonce','pid'])`; `:1196/:1198` marker ausente; `:1200–1202` chaves STATE_KEYS/COUNTER_KEYS locais exatas e persisted2. | PASS |
| C55 C | Demo real/disco/exclusão | P C55 | `tests/integrations/privacy/demo.e2e.test.mjs:79–82` dado preservado/disable/ingest recusado; `:90–94` deletedtrue e dados/key ausentes; `:106–111` prune correto/tmp observados/sem canário. `tests/integrations/privacy/demo.e2e.test.mjs:90` `assert.equal(cli(["delete","--root",root,"--capture",capture,"--apply"]).body.deleted,true)`; `:94` `assert.ok(!files(root).some(file=>/events-\d{6}\.ndjson\|[\\/]key$/.test(file)))`. | PASS |
| C56 C | Oito produtores/stop/delete | P C56 | `tests/integrations/privacy/demo.e2e.test.mjs:161–165` sucesso20 ou erro3/4 fechado; `:170–172` persistidos=soma sucessos/linhas; `:177–181` tardio3/not_found, captures vazio e nenhum arquivo dado/key/tmp; duas rodadas. `tests/integrations/privacy/demo.e2e.test.mjs:170` `assert.equal(status.counters.persisted,succeeded)`; `:180` `assert.deepEqual(readdirSync(capturesOf(root)),[])`. | PASS |
| C57 V | Core intacto | Git read-only atual | `E/identity.json:8` `"coreExit":0`; `git diff --exit-code BASE HEAD -- scripts/code-review`, exit0, `E/core-diff.log` vazio. | PASS |
| C58 C | Privado/dependências/CI/suítes | N I4-C47 | `tests/integrations/fixtures-inventory.test.mjs:46` `pkg.private === true`; `:47–51` script/npmtest/dependências exatas smol-toml/yaml; `:53` CI test:integrations. Teste carrega package/workflow atuais. `tests/integrations/fixtures-inventory.test.mjs:46` `assert.equal(pkg.private,true)`; `:50` `assert.deepEqual(Object.keys(pkg.dependencies??{}),["smol-toml"])`. | PASS |
| C59 V | Quatro suítes afetadas verdes | N completo Windows/WSL | `E/windows-results.json` status0 no npm-test; `E/wsl-results.txt:2` `npmTestExit=0`; `E/proof-index.json` localiza cada nome nos quatro lotes. | PASS |

## Asserções funcionais — carried from 714525171640ffa3412b2afe85a41f3feed886a5

| Família | Asserção localizada / valor que decide |
|---|---|
| C5b — contrato text:string | `tests/integrations/privacy/policy.unit.test.mjs:159` `same(extract(content),{content:null,privacy:["content:unsupported_content"]},...)`; `:161–163` null, motivo único e argumento/texto válidos ausentes; `:176` conteúdo e privacy exatos dos quatro controles literais em`:170–173`. Nove casos inválidos em`:147–156`, sem apagar nenhum tipo ou lista mista. |
| C5centrada — fronteira real | `tests/integrations/privacy/outputs.cli.test.mjs:1048` `isDeepStrictEqual(ingested.body.batch.contentOmitted,{unsupported_content:5})`; `:1056` conteúdos `[null,null,null,null,list("x",[""]),list("y",["ok"])]`; `:1058` motivos exatos quatro `content:unsupported_content`, nenhum no vazio e um `item.result.content[].text:unsupported_content`; `:1062` status exato5. `:1041` exclui canário e texto válido descartado nos canais examinados; helper de sondas`:796–811` observa temporários/lock. Título literal e sua execução atual estão no índice; o Proof agora tem match. |
| C14o — Basic/Bearer escapado | `tests/integrations/privacy/policy.unit.test.mjs:614` `same(sanitizeText(input),{ok:true,text:expected,removed},...)`,116 esperados exatos da tabela`:957–981`; `:724` recusas `{ok:false}` para4 casos em`:987–991`;42 controles em`:996–997`; `:1002–1003` lista sanitizada e privacy exatamente sensitive_removed/unsanitizable. `:960–961` forma do formal4 com nome escapado tem valor inteiro removido. Não se herdou a antiga classificação de limite. |
| C14p — fronteira Basic escapado | `tests/integrations/privacy/outputs.cli.test.mjs:954–958` `isDeepStrictEqual(values.sort(), [...])`, com esperados literais locais em`:927–929`; `:963` motivos exatos por registro; `:967` status `{sensitive_removed:3,unsanitizable:1}`; `:938` ausência de canário e `nYTpi` contextual, sem procurar `ab` arbitrário na chave HMAC. `:949` inspeciona todos os arquivos depois de ingest, `:971` helper dos canais e sondas. |
| C14q — nomes depois do escape/aspas | `tests/integrations/privacy/policy.unit.test.mjs:614` saída/removed exatos para267 casos montados em`:1017–1041`; `:724`4 recusas em`:1047–1051`;16 controles removed:false em`:1058–1073`; `:1079–1080` lista exata incluindo nome comum intacto e único motivo sensitive_removed. `:1082` sem s=abc/auth=abc ou marcador codificado. |
| C14r — fronteira nomes escapados | `tests/integrations/privacy/outputs.cli.test.mjs:1007–1011` resultados exatos, literais locais em`:980–983`; `:1016` motivos por registro; `:1020` status `{sensitive_removed:3,unsanitizable:1}`; `:991` exclui canário/s=abc/auth=abc; `:1002` todos os arquivos após ingest e`:1024` sondas dos temporários, dados e logs. |
| C14h — custo e comportamento | `tests/integrations/privacy/policy.unit.test.mjs:1282` `assert.equal(result.ok,ok,...)`; `:1283` `assert.ok(elapsed<5000,...)`.20 entradas aproximadamente1MiB, sete novas (2 do esquema+5 do nome), incluindo sequências longas de barras e os caminhos novos. É prova normal de regressão, não benchmark independente antes/depois nem SLA. |

`probedCapture` mantém stdout verificado, stderr vazio, logs de duas sondas, quantidade mínima de temporários de dados e lock por comando (`outputs.cli.test.mjs:796–811`). As asserções incluem `assert.equal(observation.containsCanary,false)` e `assert.equal(entry.containsMarker,false)`. Os testes de NUL textual existentes continuam; key binária pode legitimamente conter byte0, sem procurar um segredo curto como substring em bytes aleatórios. Cada família nova usa os mesmos consumidores do produto; o Verifier não criou probe/teste novo.

As expectativas fortalecidas C14o/p removem mais texto reconhecido, em vez de trocar um vazamento por uma documentação. O Landing anterior ao código explica a mudança; nenhum caso foi apagado ou tolerância alargada. C14m tem163 remoções,6 recusas,74 controles; o recibo foi corrigido editorialmente para163 no scoped atual. As contagens novas do recibo conferem.


## Oito AC — análise carried from 714525171640ffa3412b2afe85a41f3feed886a5; provas verified at b23c69019503b8b946ad610388d7b7234f43ba2a

Fonte: snapshot issue-approved-v7.json. A análise funcional registrada no Round7 é mantida sem carregar o antigo juízo Round6 rejeitado pelo formal4; o veredito global FAIL7 permanece preservado. Nesta rodada os dois defeitos de rastreabilidade foram resolvidos e todas as provas reexecutadas.

| AC | Resultado / evidência |
|---|---|
| AC1 — opt-in/start/stop/disable | PASS: C1–C4/C36/C41/C42/C55; capturas novas off, consentimento explícito, estados e recusa após encerramento. |
| AC2 — antes de persistir | PASS: C11/C14–C19/C30/C39/C54/C55; os novos C14o/p/q/r fecham Basic reserializado e Cookie/auth escapados antes dos temporários/dados/export, com motivos exatos. C14ivalor executou e o seletor atual tem match único (R7-2 resolvido). |
| AC3 — cinco categorias sem canário | PASS: C14/C15 nos canais reais; regressões das cinco categorias preservadas, mais os casos novos contextuais. |
| AC4 — limites/perdas/cobertura | PASS: C20–C27/C34/C52/C53; C5b/C5centrada distinguem ausência/null/tipo inválido de string vazia, contagem exata e listas mistas; motivo no status/export. O seletor atual C5centrada corresponde ao título real (R7-1 resolvido). |
| AC5 — retenção/exclusão | PASS: C41–C52/C55/C56; coexistência recusada, retomadas legítimas, arquivo/chave removidos, lock/barreira e concorrência nos gates atuais. |
| AC6 — sem telemetria/upload automático | PASS: C31, importação e sonda sem rede, nenhum destino remoto novo. |
| AC7 — skills/payloads como dados | PASS: C6–C8/C55 e D1; texto suportado de SKILL.md sanitizado só com opt-in, sem execução/adoção de instrução. |
| AC8 — diagnósticos/falhas sanitizados | PASS: C11/C14/C15/C28–C33/C39/C54 e novas sondas, vocabulário fechado, logs/temporários limpos, NUL interno ausente dos canais textuais e canais nativos do filho separados. |



## Gates próprios — verified at b23c69019503b8b946ad610388d7b7234f43ba2a

Comandos nas duas plataformas: `node --test --test-reporter=tap tests/integrations/privacy/*.test.mjs` e `npm test`. Uma invocação por alvo, sem filtro, sem target vazio. Exits próprios em E/windows-results.json e E/wsl-results.txt.

| Plataforma / alvo | Total | Pass | Fail | Skip | Exit |
|---|---:|---:|---:|---:|---:|
| Windows privacidade inteira |111|111|0|0|0|
| WSL privacidade inteira |111|111|0|0|0|
| Windows npm governança |6|6|0|0|0|
| Windows npm fixtures code-review |16|16|0|0|0|
| Windows npm doctor |417|410|0|7|0|
| Windows npm integrações |199|193|0|6|0|
| WSL npm governança |6|6|0|0|0|
| WSL npm fixtures code-review |16|16|0|0|0|
| WSL npm doctor |417|416|0|1|0|
| WSL npm integrações |199|187|0|12|0|

Cada npm test: **638 testes,625 pass,13 skips,0 fail/cancelled/todo,exit0**. Cada alvo de privacidade: **111/111,0 skip**, com105 títulos de topo e6 subtestes. Todos têm resultados nominais próprios; C35 incluído. Nenhum marcador-canário nos quatro logs. Os91 seletores publicados têm match nos arquivos nomeados; nenhum resultado antigo foi usado como execução atual.

Skips não contam como prova executada:

- Windows doctor7: dois casos de resolução POSIX e cinco de FIFO/link/controle POSIX. Integrações6: I4-C15 sinais POSIX; I4-C25b modos POSIX; I4-C25j/k/l ACL Linux; I4-C25m ACL macOS.
- WSL doctor1: hermes_cli.PYD exige Windows para o sufixo maiúsculo. Integrações12: I4-C18–C23/C37/C44b runtime Hermes ausente (8); I4-C25g/h/i DACL Windows (3); I4-C25m macOS (1).
- Windows22 limitações de subcasos internos registradas nominalmente no índice; symlinks de arquivo recusados por EPERM e modo POSIX inaplicável. Junções foram executadas. WSL1 aviso interno: observação Hermes não executada por runtime ausente; as provas nativas Hermes executaram no Windows.
- macOS e Linux nativo fora de WSL não executados localmente. Nenhum skip no alvo privacidade, nenhum alvo vazio apresentado como verde.

## Perfil, Swept e limites — carried from 714525171640ffa3412b2afe85a41f3feed886a5; omissões de perfil verified at b23c69019503b8b946ad610388d7b7234f43ba2a

Perfil light: não exigidos nem executados UI binding comparison, Coverage join, Test policy ou fault injection sistemático. Não se inventou fonte de UI ou uma seção normativa ausente. Falhas parciais e sondas já existentes executaram como testes normais; não são campanha independente de mutação. Nenhum probe/teste novo ou correção de produto foi feito pelo Verifier.

Swept intocado carried from Round7 e cadeia completa declarada no início: receptor limitado por processo, callback/fila Hermes não bloqueante, demais restrições e escopo de instalação da #4. Leitura do alcance atual confirma política antes de append e mesmas decisões de conteúdo/códigos; os gates atuais exercitam todas as regressões. Não foi reaberta a #4. Matriz/conjuntos têm casos concretos, não produto cartesiano universal. C21 mantém a prova4096/4097 na decisão pura e envelope minimizado; o ramo depois de pseudônimos ainda é inalcançável hoje. privacy_failure positivo usa API em processo, pois JSON não representa getter/Proxy. C14h é teto local largo, não SLA nem medida própria de otimização antes/depois. A leitura dos REDs autorais declarada no Round7 é carried from 714525171640ffa3412b2afe85a41f3feed886a5; esta rodada não os reexecutou.

Persistem formatos fora da gramática fechada de nomes/escapes, uma camada percentual só na query, esquemas não listados, flag com NBSP e as perdas declaradas de texto útil. O cenário conhecido de Basic reserializado rejeitado pelo formal4 e os nomes Cookie/auth conhecidos estão comprovadamente removidos, não reclassificados como limites. Nenhuma garantia universal é alegada.


Conferência própria Swept existing: `memory-receiver.mjs:19` mantém capacidade500 por processo; `hermes/plugin/__init__.py:165/:181/:200` mantém worker daemon, put_nowait e fila limitada; sem entrega a observação permanece inativa. `privacy/ingest.mjs:63` chama applyPolicy antes de appendRecords em`:114`, `observation.mjs:86` usa a mesma política. As demais restrições de instalação da #4 são carried from Round7; nenhum novo consumidor ou escopo foi criado pelo diff documental.

**Encerramento: PASS,59/59 checks e oito AC comprovados; R7-1/R7-2 resolvidos.** Nenhum finding novo no alcance. Limites de plataforma, amostragem, C21, C28 e sanitização acima permanecem explícitos; o perfil light não executa UI comparison, Coverage join, Test policy ou fault injection sistemático. Não foi criado probe/teste novo nem feita correção de produto.

Escritos somente este relatório e próprios scripts/logs/índices/cópias em E, além do scratch WSL contido. Fonte original permaneceu no SHA exato e limpa durante os gates; depois deste relatório, só .checks/issue-5-privacidade.verified.md muda. E/source-final.json registra isso e E/round8-final.md preserva o relatório final. Nenhuma instalação, limpeza, stash/reset, alternância de fonte, modelo/sessão/config pessoal, commit, review:run, push, PR, merge ou deploy. Formal5 cabe ao coordenador somente após commit do relatório; merge humano.


## Índice nominal — verified at b23c69019503b8b946ad610388d7b7234f43ba2a

Cada título literal abaixo tem linha de resultado aprovado nos quatro logs próprios de E. P = privacidade inteira; N = npm completo. A representação de barras do reporter TAP/spec é normalizada apenas para comparar o título. Fonte/linha de declaração, resultados, subcasos/skips e seletores estão em E/proof-index.json.

| Título literal | Win P | WSL P | Win N | WSL N |
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
| I5-C14p separador escrito como escape antes da credencial de Basic/Bearer num resultado reserializado sai com sensitive_removed; cabeçalho que termina no esquema escapado sai com unsanitizable; nada chega a temporários, lock, arquivos, logs nem export | 184 | 184 | 625 | 602 |
| I5-C14r nome sensível colado depois de separador escrito como escape ou entre aspas escapadas num resultado reserializado sai com sensitive_removed; bloco depois do nome sai com unsanitizable; nada chega a temporários, lock, arquivos, logs nem export | 190 | 190 | 626 | 603 |
| I5-C5centrada type:text sem text string num resultado MCP pelo ingest/export real omite o conteúdo do evento com unsupported_content; text vazio fica vazio sem motivo | 196 | 196 | 627 | 604 |
| I5-C16d chave própria __proto__ em argumentos MCP pelo ingest/export real fica como membro próprio, mascarado por dentro e sem perda silenciosa | 202 | 202 | 628 | 605 |
| I5-C1 sem opt-in nenhum evento de ferramenta leva conteúdo e cada um conta content_disabled | 208 | 208 | 629 | 606 |
| I5-C4 com opt-in cada linha da matriz produz exatamente o campo previsto, sanitizado | 214 | 214 | 630 | 607 |
| I5-C5 ferramenta, evento, contrato ou formato fora da matriz → content null e unsupported_content | 220 | 220 | 631 | 608 |
| I5-C5b entrada type:text de mcp_tool_call sem text string (ausente, null, outro tipo, lista mista) omite o conteúdo com unsupported_content; text vazio e entradas de outro tipo seguem a regra anterior | 226 | 226 | 632 | 609 |
| I5-C6 prompts, raciocínio, mensagem final, Skill, collab e Hermes nunca produzem conteúdo com opt-in | 232 | 232 | 633 | 610 |
| I5-C7 resultado suportado que mostra SKILL.md é guardado sanitizado como dado, sem executar; sem opt-in continua omitido | 238 | 238 | 634 | 611 |
| I5-C9 todo ID aceito vira pseudônimo h1 estável na captura, inclusive entre sessionId e parentSessionId | 244 | 244 | 635 | 612 |
| I5-C11 os 11 campos de nome com caminho, @, ~, drive ou segredo são removidos com sensitive_removed | 250 | 250 | 636 | 613 |
| I5-C11b nome hostil que muda entre leituras não escapa: decide o valor entregue no envelope | 256 | 256 | 637 | 614 |
| I5-C12 campo path vira só ref, sem nenhum componente original | 262 | 262 | 638 | 615 |
| I5-C13 toda entrada privacy é código fechado sem valor descartado | 268 | 268 | 639 | 616 |
| I5-C16 subárvore sob chave sensível é descartada inteira com sensitive_removed | 274 | 274 | 640 | 617 |
| I5-C17 URL com userinfo e parâmetro sensível (literal) | 280 | 280 | 641 | 618 |
| I5-C16b chave de structured com formato de token sai inteira com sensitive_removed, sem descer na subárvore | 286 | 286 | 642 | 619 |
| I5-C16c chave própria __proto__ vinda de JSON.parse fica como propriedade própria do objeto comum projetado, sem trocar protótipo | 292 | 292 | 643 | 620 |
| I5-C17b parâmetro de query com nome sensível codificado tem o valor removido; o nome fica como veio | 298 | 298 | 644 | 621 |
| I5-C17c valor de query com formato de token em uma camada de percent encoding é removido inteiro; nome e demais parâmetros ficam literais | 304 | 304 | 645 | 622 |
| I5-C14d valor de nome sensível é a palavra inteira de shell: vírgula, aspas, escapes e '-' inicial saem juntos; separadores reais delimitam | 310 | 310 | 646 | 623 |
| I5-C17d userinfo de URL sai até o último @ da autoridade; @ em caminho, query e fragmento fica | 316 | 316 | 647 | 624 |
| I5-C14f valor sensível composto: composição aberta omite o campo; NBSP, aspa e concatenação coladas saem com a palavra inteira | 322 | 322 | 648 | 625 |
| I5-C14k credencial curta depois de Bearer/bearer/Basic (1 a 8 caracteres, padding) é removida; esquema sem valor e palavras fora da regra não mudam | 328 | 328 | 649 | 626 |
| I5-C14m Bearer/Basic em qualquer caixa ASCII e credencial depois de espaço, tab ou quebra são removidos com a caixa e os separadores da entrada; cabeçalho que termina no esquema antes da credencial omite o campo | 334 | 334 | 650 | 627 |
| I5-C14o separador escrito como escape (\n, \r, \t, \u000a…) entre Bearer/Basic e a credencial ou antes do esquema remove a credencial sem decodificar; cabeçalho que termina no esquema escapado omite o campo | 340 | 340 | 651 | 628 |
| I5-C14q nome sensível de cabeçalho, atribuição ou flag colado depois de separador escrito como escape, ou entre aspas escapadas, tem o valor removido sem decodificar; nomes comuns e outros escapes ficam | 346 | 346 | 652 | 629 |
| I5-C14ivalor sensível em bloco multilinha, na linha seguinte, depois de tag/âncora ou de comentário omite o campo; indicador sem linha seguinte ou com texto na mesma linha segue a regra anterior | 352 | 352 | 653 | 630 |
| I5-C14h sanitização de 1 MiB numa linha com muitos valores termina em tempo linear | 358 | 358 | 654 | 631 |
| I5-C17e userinfo com aspas, escapes ou vários @ sai inteiro até o último @; autoridade aberta no fim omite o campo; URLs entre aspas ficam | 364 | 364 | 655 | 632 |
| I5-C18bloco de chave privada fechado ou não é descartado inteiro; o texto antes permanece (literal) | 370 | 370 | 656 | 633 |
| I5-C19 surrogate isolado, NUL e chave fora do padrão são omitidos com unsanitizable | 376 | 376 | 657 | 634 |
| I5-C21 envelope sanitizado de 4096 bytes é aceito; 4097 descarta com envelope_oversize | 382 | 382 | 658 | 635 |
| I5-C22 conteúdo de 8192 bytes não é truncado; 8193 é truncado em UTF-8 válido | 388 | 388 | 659 | 636 |
| I5-C23 profundidade 8 e 128 membros aceitos; 9 ou 129 omitem o conteúdo inteiro | 394 | 394 | 660 | 637 |
| I5-C24 segredo que atravessa a posição de corte não deixa prefixo no resultado | 400 | 400 | 661 | 638 |
| I5-C25 com orçamento esgotado ref de caminho e IDs nunca são cortados | 406 | 406 | 662 | 639 |
| I5-C28 exceção na sanitização descarta só a parte insegura com privacy_failure, sem mensagem e sem nova tentativa | 412 | 412 | 663 | 640 |
| I5-C36 start cria captura active, conteúdo off, 7 dias, ID próprio e o layout literal | 418 | 418 | 664 | 641 |
| I5-C2 conteúdo é opt-in por captura e não é herdado | 424 | 424 | 665 | 642 |
| I5-C37 --retention-days aceita 1 e 365 e rejeita fora do contrato sem criar nada | 430 | 430 | 666 | 643 |
| I5-C38 --root é obrigatório, sem default, e precisa ser um diretório existente | 436 | 436 | 667 | 644 |
| I5-C41b stop/disable pelo CLI seguem a tabela de transições e são idempotentes | 442 | 442 | 668 | 645 |
| I5-C44 delete mostra prévia sem mudar a árvore e --apply remove stopped/disabled, nunca active | 448 | 448 | 669 | 646 |
| I5-C46 prune: prévia sem mudança, --apply com now injetado remove só as vencidas, relógio real preserva recém-parada | 454 | 454 | 670 | 647 |
| I5-C47s lock presente: start/stop/disable/delete/prune/status saem 4 sem mutação e o lock alheio fica | 460 | 460 | 671 | 648 |
| I5-C49 delete recusa link/junção, subdiretório e arquivo alheio sem apagar nada e preserva alheios fora da captura | 466 | 466 | 672 | 649 |
| I5-C49b pasta .deleting-<id> inesperada junto da captura ativa ou parada: delete e prune recusam foreign_entry sem ler nem apagar nenhuma das duas | 472 | 472 | 673 | 650 |
| I5-C51b retomada legítima: só a pasta em exclusão — com chave e estado, só com state.json ou já sem state.json (vazia) — é concluída por delete e por prune | 478 | 478 | 674 | 651 |
| I5-C50s a chave nunca aparece no status e sai com a captura | 484 | 484 | 675 | 652 |
| I5-C43s status isolado por captura, JSON v1 e --help em português | 490 | 490 | 676 | 653 |
| I5-C54s state.json e .lock têm exatamente as chaves do Landing | 496 | 496 | 677 | 654 |
| I5-C32s códigos de uso e de estado do lote de armazenamento, sem eco | 502 | 502 | 678 | 655 |
| I5-C3 variáveis herdadas e configurações de agente no cwd não ativam conteúdo | 508 | 508 | 679 | 656 |
| I5-C4b com --content o CLI real grava args e results sanitizados para claude, codex-hooks e codex-exec | 514 | 514 | 680 | 657 |
| I5-C8 payloads que mandam criar arquivo não criam nada nem iniciam processo | 520 | 520 | 681 | 658 |
| I5-C10 o mesmo ID em duas capturas dá pseudônimos diferentes | 526 | 526 | 682 | 659 |
| I5-C26b status traz a contagem exata de cada código para lotes mistos | 532 | 532 | 683 | 660 |
| I5-C27 contentOmitted e dropped são separados e o status tem conjunto de chaves exato, sem cobertura | 538 | 538 | 684 | 661 |
| I5-C30 falha de rename na gravação: ingest sai 5 io_failure, estado e dados anteriores idênticos, nenhum temporário | 544 | 544 | 685 | 662 |
| I5-C32 cada código de erro do privacy sai de um cenário real com JSON exato e sem eco | 550 | 550 | 686 | 663 |
| I5-C39 ingest dos quatro agentes grava só registros v1 válidos e nenhum arquivo, temporário ou lock tem canário | 556 | 556 | 687 | 664 |
| I5-C40 ingest não inicia processo nem abre arquivo fora de <root>/skill-me-privacy/ | 562 | 562 | 688 | 665 |
| I5-S-databytes-cli state.json com dataBytes acima de 8 MiB sai capture_invalid pelo CLI sem abrir o segmento | 568 | 568 | 689 | 666 |
| I5-C42 captura stopped ou disabled recusa ingest com capture_not_active e árvore idêntica | 574 | 574 | 690 | 667 |
| I5-C43 status e export isolados por captura, JSON v1 e --help em português | 580 | 580 | 691 | 668 |
| I5-C47 com .lock presente ingest e export saem 4 lock_present sem mutação e o lock alheio fica | 586 | 586 | 692 | 669 |
| I5-C48 depois de stop/disable/delete um ingest atrasado sai 3 e não grava nem recria a captura | 592 | 592 | 693 | 670 |
| I5-C50 a chave nunca aparece em export/status e sai com a captura | 598 | 598 | 694 | 671 |
| I5-C52b 510 linhas pelo CLI: persisted 500 e dropped 10 por capture_event_limit | 604 | 604 | 695 | 672 |
| I5-C53 lote misto pelo ingest: accepted, persisted, malformed e dropped exatos, accepted >= persisted | 610 | 610 | 696 | 673 |
| I5-C54 state.json e .lock têm exatamente as chaves do Landing e nenhum canário depois de ingest real | 616 | 616 | 697 | 674 |
| I5-C42s captura stopped ou disabled recusa novos registros sem mudar a árvore | 622 | 622 | 698 | 675 |
| I5-C48s depois de stop/disable/delete um produtor atrasado não grava nem recria a captura | 628 | 628 | 699 | 676 |
| I5-C52s storage admite 500 de 510 registros e exatamente 8 MiB | 634 | 634 | 700 | 677 |
| I5-C53s status traz contadores exatos de um lote misto e accepted >= persisted | 640 | 640 | 701 | 678 |
| I5-C30s falha de rename na gravação deixa estado e dados anteriores idênticos e nenhum temporário | 646 | 646 | 702 | 679 |
| I5-S-bounded controle ou segmento maior que o limite é recusado sem ler o arquivo inteiro | 652 | 652 | 703 | 680 |
| I5-S-databytes state.json com dataBytes acima de 8 MiB é capture_invalid antes de abrir o segmento | 658 | 658 | 704 | 681 |
| I5-S-record o storage recusa o que não é registro v1 sem gravar nada | 664 | 664 | 705 | 682 |
| bloco | 106 | 106 | 612 | 589 |
| linha-seguinte | 112 | 112 | 613 | 590 |
| tag-ancora | 118 | 118 | 614 | 591 |
| tag-mesma-linha | 124 | 124 | 615 | 592 |
| ancora-mesma-linha | 130 | 130 | 616 | 593 |
| comentario | 136 | 136 | 617 | 594 |

| Regressão npm | Win N | WSL N |
|---|---:|---:|
| I4-C36 hooks Claude e Codex: seis falhas do consumidor/entrada mantêm saída neutra | 509 | 509 |
| I4-C13 códigos 0 e 17 do filho são preservados mesmo com o destino falhando | 498 | 498 |
| I4-C16 stdout repassado byte a byte e de forma incremental; JSONL consumido com limites | 501 | 501 |
| I4-C47 a suíte de integrações faz parte do npm test e da CI | 515 | 515 |
