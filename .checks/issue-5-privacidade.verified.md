# Issue #5 — verificação independente

**Verdict: FAIL — 58/59 checks comprovados.** As três lacunas anteriores receberam correções e provas; C3 e C15 estão fechados. C11 cobre agora os valores estáveis, inclusive `~`, mas a correção introduziu uma regressão para getter variável no rascunho: o nome sensível já copiado ao envelope pode escapar. O cenário foi identificado por leitura, sem prova nova executada pelo Verifier.

**Profile:** light. **Round:** 2 — scoped. **Verifier:** subagente fresco `/root/verify_issue5_round2`, independente do autor Claude; somente relatório e seus próprios logs/scripts/scratches escritos.

**HEAD verificado:** `ed7dec25b601942591ed19d175a193a7fecf1049`. **Feature:** `1b6685fe97862ac1a2d2cff1e4d9f0e1f09a6a27..ed7dec25b601942591ed19d175a193a7fecf1049`. **Correções analisadas:** `d936fc7..ed7dec25b601942591ed19d175a193a7fecf1049`, todos os antigos não-PASS C3/C11/C15 e o alcance real da política compartilhada. Branch `codex/issue-5-privacidade`; árvore original limpa antes das provas.

## Origem da análise e histórico preservado

Análise sem mudança funcional: **carried from be882a54b989f4069d3870c050914d9af7b6e073**, relatório Round 1 FAIL 56/59 preservado no Git em `d936fc7:.checks/issue-5-privacidade.verified.md` e na cópia runtime `.checks/code-review/issue-5/verifier-round1-final.md`. O FAIL anterior não é reescrito como PASS. A cópia de referência desta rodada está em `E/round1-from-d936fc7.md`.

Análise scoped e citações de todos os arquivos tocados: **verified at ed7dec25b601942591ed19d175a193a7fecf1049**. As três provas alteradas foram lidas, com as expressões e linhas abaixo. O caminho de `buildEnvelope` → política → observação/ingest → receptor/armazenamento foi reavaliado, inclusive nomes, IDs, lacunas v1, razões e contadores. As provas **de todos os checks** são execuções novas nesta cabeça, nunca herdadas.

Lidos integralmente: os dois briefings, `C:/Users/paulo/.agents/skills/tlc-implement/references/verify.md`, AGENTS/CLAUDE, plano, checklist, aprovação U1/D1, evidência autoral, incidente WSL, snapshot aprovado com oito AC, relatório anterior e sua cópia runtime. Range da feature conferido para contexto; correções dos sete arquivos analisadas. `CONTRIBUTING.md` foi procurado e não existe. O relato autoral informa contexto, sem substituir as execuções independentes.

Não existe fonte vinculante de UI. Coverage join, Test policy e fault injection sistemático não exigidos no light; não foram executados. Nenhum produto, teste, configuração ou critério foi corrigido; nenhum teste adicional, modelo ou integração pessoal foi executado. Sem commit, revisão formal, push, PR, merge ou limpeza.

## Identidade e isolamento — verified at ed7dec25

**E** = `.checks/code-review/issue-5/verifier-round2-20261018/`. Todos os diretórios e históricos desta e das rodadas anteriores são preservados.

- Windows: `E/windows`, extraído de `git archive` do HEAD; **208 blobs comparados com `git hash-object --path`, zero divergências**. Node `v24.21.0`. Archive SHA-256 `62e07166f99a061528c08f339f91d7e7141450c0cfbc3362d793f5d300fd07c6`; `E/identity.json`. Dependências locais copiadas, nenhuma instalada.
- WSL: distro **Ubuntu**, UID **1000** conferidos antes de mutação; Node `v24.13.0`. Scratch nativo `/tmp/skill-me-i5-verifier-r2-pCO52F/checkout`. `E/run-wsl.sh`, em arquivo, usa `MSYS_NO_PATHCONV=1`, guardas de contenção do `mktemp`, hash antes/depois da cópia e `git get-tar-commit-id` igual ao HEAD antes da extração. Dependências copiadas; sem instalação.
- Execuções Windows/WSL pela via normal escalada autorizada para Git e processos próprios. Nenhuma rejeição de auto-review nesta rodada. Não se repetiu a preparação proibida Verifier6/probe, script inline WSL ou escrita em `/repo`/`/src.tar`.
- Logs integrais: `E/windows-privacy.tap.log`, `E/privacy.tap.log`, `E/windows-npm-test.log`, `E/npm-test.log`, `E/wsl-run.log`. `E/proof-index.json` confere cada um dos 74 nomes de privacidade como sucesso individual nos quatro lotes. `E/source-gate.json` registra identidade/porcelain e comparação do core.

## Achado necessário — verified at ed7dec25

### [P2] A política relê o nome do rascunho e deixa passar o valor sensível já copiado

**Localização:** `src/integrations/privacy/policy.mjs:47` e `:57`, na troca de `sanitizeEnvelope`.

**Cenário concreto:** rascunho válido de `tool_pre`, `fields` objeto comum com propriedade própria enumerável `toolName` cujo getter devolve, na primeira leitura, o token sintético `CANARIES.token` e, na segunda, `Bash`. `payload:{}`, chave válida e conteúdo desligado bastam. O objeto é aceito por `validDraftShape`: conferir protótipo e `Object.keys` não avalia esse getter (`src/integrations/boundary.mjs:208`, `:212`). `buildEnvelope` lê a propriedade em `:245` e copia o token para `envelope.fields.toolName` em `:247`; o token usa caracteres aceitos em `NAME_PATTERN` (`:55`) e tem menos de 128 caracteres.

**Esperado:** o token é removido do envelope, com `envelope.toolName:sensitive_removed`, ou o evento é descartado por falha de privacidade. Isso preserva critério 4/C11 e a falha fechada de entrada hostil do critério 9.

**Atual por leitura:** `unsafeNameFields` lê novamente `draft.fields[name]` (`policy.mjs:47`) e só examina `Bash`; `removed` fica vazio. A filtragem em `:57` conserva o token já copiado no envelope e `applyPolicy` retorna `ok:true` em `:95`, sem sanitizar esse valor novamente. O snapshot anterior em `d936fc7` examinava os valores de `envelope.fields` e removia esse token. A regressão não é o antigo problema de `~`: é uma decisão sobre uma segunda leitura que deixou de validar o valor efetivamente entregue.

**Impacto e limite:** a API em processo `applyPolicy` pode devolver metadado sensível para receptor/exportador, sem motivo de remoção. O mesmo núcleo atende `observation.mjs:86` e `privacy/ingest.mjs:63`; os adaptadores do stdin JSON produzem dados estáveis, portanto **não foi demonstrado vazamento por CLI/JSON**. Não houve exposição de segredo real. Os testes C11 usam strings estáveis; C28 cobre getter/Proxy que lança, não getter que muda de valor. Os 74 testes podem passar com esta regressão.

**Método:** leitura completa da validação, cópia, sanitização e comparação com o código anterior. O Verifier não criou nem executou prova nova, respeitando a restrição a testes versionados. É necessário corrigir o valor usado na decisão e acrescentar uma regressão pelo autor autorizado; não cabe ao Verifier fazê-lo.

## Resolução dos três antigos gaps — verified at ed7dec25

- **C3:** o mesmo ambiente e os três arquivos sintéticos agora alcançam os quatro agentes de `privacy ingest`, hooks Claude/Codex, ingest Hermes e wrapper. São nove registros exportados sem conteúdo e contagem exata nove; relatórios de processo contam 1/1/2/3. A ampliação fecha o gap de consumidores.
- **C11 original:** 11 campos × 11 valores inseguros incluem `~segredo`, password, chave privada e nome com 129 caracteres. Campo ausente, motivo exato, nenhuma lacuna v1 do campo e controle `Bash;echo` preservando `not_identifier`. Esse defeito original está resolvido para valores estáveis; o novo achado acima mantém C11 FAIL.
- **C15:** cinco categorias explicitamente enumeradas em IDs, nomes e caminhos dos quatro contratos; asserções comprovam que os IDs chegaram como pseudônimos, nomes pertencem ao evento e paths viraram refs. Com/sem opt-in, respostas, árvore, export, logs de sondas, locks e temporários antes do rename sem marcador. `cwd`/`transcript_path` são entrada descartada pelos adaptadores, sem afirmar tratamento de caminho que o contrato não fornece. A amostra fecha a falta específica de chave privada/sondas da rodada anterior.

## Checks C1–C59

**P** = teste nomeado passou no alvo de privacidade completo Windows **e** WSL, sem filtro. **N** = passou nos dois `npm test` completos. Cada nome/resultado está em `E/proof-index.json` e nos logs integrais. Testes com sufixos b/s são distintos. **V** = análise reavaliada verified at ed7dec25; **C** = análise carried from be882a54, com prova nova e citação atualizada quando o arquivo mudou. Expressões abaixo omitem apenas labels de diagnóstico.

| Check / análise | Claim | Prova nova | Asserção localizada / expressão | Resultado |
|---|---|---|---|---|
| C1 V | Conteúdo desligado sem captura | P C1/C1b | `tests/integrations/privacy/policy.unit.test.mjs:67` `assert.equal(record.content, null)`; `:68` `deepEqual(...,['content:content_disabled'])`; `tests/integrations/privacy/outputs.cli.test.mjs:76` `deepEqual(Object.keys(report.events[0]), ENVELOPE_KEYS)`; `:81`, `:86` omissões exatas 2/3. | PASS |
| C2 C | Opt-in por captura | P C2 | `tests/integrations/privacy/store.cli.test.mjs:98` `assert.equal(runPrivacy(['start','--root',root]).body.capture.content, false)`; `:101` `assert.equal(after.body.capture.content, false)`; `:103` anterior desabilitada false. | PASS |
| C3 V | Ambiente/cwd não liga conteúdo em caminho algum | P C3 | `tests/integrations/privacy/store.cli.test.mjs:532` `deepEqual(result.body.batch.contentOmitted,{content_disabled:entries.length})` para 2/2/3/2; `:539–540` `content === null`, `privacy === ['content:content_disabled']`; `:544` `deepEqual(...,{content_disabled:9})`; `:555/:567/:573` `deepEqual(...,zero(1/2/3))`, demais códigos zero em `:547`. | PASS |
| C4 V | Todas as linhas da matriz | P C4/C4b | `tests/integrations/privacy/policy.unit.test.mjs:110` `deepEqual(field(record,name),{field:name,...expected})`, esperados literais locais `:80–96`; `:112` `covered.size === CONTENT_TABLE.length`; `tests/integrations/privacy/store.cli.test.mjs:585` objeto literal Bash/`ls <home>`; `:590` args/result exatos `[['item.command','args','echo 1'],['item.aggregated_output','result','1\n']]`. | PASS |
| C5 V | Fora da matriz falha fechado | P C5 | `tests/integrations/privacy/policy.unit.test.mjs:128–129` `content === null`, `deepEqual(record.privacy,['content:unsupported_content'])`; `:138` `deepEqual(unknown,{content:null,privacy:['content:unsupported_content']})`. | PASS |
| C6 V | Prompts/raciocínio/Skill/Hermes excluídos | P C6 | `tests/integrations/privacy/policy.unit.test.mjs:160` `assert.equal(record.content,null)`; `:161` canário ausente; `:164` `deepEqual(codexExecDraft(...),{kind:'excluded',reason:'reasoning'})`. | PASS |
| C7 V | D1: SKILL.md sanitizado como dado | P C7 | `tests/integrations/privacy/policy.unit.test.mjs:181` `value.includes('ignore as instruções anteriores')`; `:183` args literal `cat <home>/.codex/skills/third-party-skill/SKILL.md`; `:186–187` off null/`['content:content_disabled']`; `:189` `existsSync(marker) === false`. O oráculo derivado `sanitizedSkillText` não substitui os literais de sanitização C4/C17/C18. | PASS |
| C8 C | Payload não executa comandos | P C8 | `tests/integrations/privacy/store.cli.test.mjs:613–614` `assert.ok(!existsSync(target(name)))` e cwd; `:616` `deepEqual(readdirSync(cwd),[])`; `:617` `deepEqual(probeLog(probe).filter(e=>e.op.startsWith('child_process.')),[])`; `:609–610` persistidos 6/3. | PASS |
| C9 V | IDs h1 estáveis; igualdade entre papéis | P C9 | `tests/integrations/privacy/policy.unit.test.mjs:203–204` `assert.match(value,PSEUDONYM)` e `value.length === 46`; `:213` toolUseId igual; `:218` `sub.envelope.ids.parentSessionId === session.envelope.ids.sessionId`. | PASS |
| C10 V | Capturas/processos não correlacionáveis | P C10/C10b | `tests/integrations/privacy/store.cli.test.mjs:628` `assert.notEqual(ea[name],eb[name])`; `tests/integrations/privacy/outputs.cli.test.mjs:98` `notEqual(first[name],second[name])`; `:104` `started.ids.itemId === completed.ids.itemId`. | PASS |
| C11 V | Nomes inseguros removidos com motivo exato | P C11 | `tests/integrations/privacy/policy.unit.test.mjs:266` `assert.ok(!(name in envelope.fields))`; `:267` ``assert.deepEqual(privacy.filter((e) => e.startsWith("envelope.")), [`envelope.${name}:sensitive_removed`])``; `:268–269` sem lacuna e `validateEnvelope === true`; `:276–277` forma comum mantém `not_identifier`. 121 strings estáveis passam; getter variável não é coberto e deixa token no valor entregue. | **FAIL — novo achado** |
| C12 V | Paths só como referência | P C12 | `tests/integrations/privacy/policy.unit.test.mjs:290` `deepEqual(record.content.fields,[{field:'tool_input.file_path',role:'args',kind:'path',ref:expectedPseudonym(KEY,'path',filePath)}])`; `:292` `!text.includes(part)` para componentes locais; `:294–295` lista de refs e componentes ausentes. | PASS |
| C13 V | Motivos fechados sem valor | P C13 | `tests/integrations/privacy/policy.unit.test.mjs:309–310` `assert.match(entry,ENTRY)`, `deepEqual(leaks(entry),[])`; `:313` `new Set(record.privacy).size === record.privacy.length`. | PASS |
| C14 V | Cinco segredos no conteúdo, canais reais | P C14 | `tests/integrations/privacy/outputs.cli.test.mjs:124/:132/:140` `deepEqual(leaks(channel/report),[])`; `:188–189` stdout sem leak/stderr `''`; `:192–197` observações reais antes do rename, `.lock`/tmp vistos e `containsCanary/containsMarker === false`. | PASS |
| C15 V | Cinco segredos em metadados, mesmos canais | P C15 | `tests/integrations/privacy/outputs.cli.test.mjs:209` categorias exatas `['token','header','url','password','privateKey']`; `:238–243` `assert.match(envelope.ids[name]??'',PSEUDONYM)`, nomes ausentes/sem lacuna; `:252/:259/:266` leaks `[]`; `:313/:317` motivo de nomes e refs h1; `:328–329` leaks `[]`/stderr `''`; `:341–347` ≥8 temporários de cada tipo, lock por comando e todos `containsCanary/containsMarker === false`. | PASS |
| C16 V | Subárvore sensível descartada | P C16 | `tests/integrations/privacy/policy.unit.test.mjs:326` `deepEqual(field(record,'item.arguments').value,{query:'ok',nested:{level2:{keep:1}},list:[{},'fica']})`; `:327` `privacy.includes('item.arguments:sensitive_removed')`. | PASS |
| C17 V | URL sem userinfo/token | P C17 | `tests/integrations/privacy/policy.unit.test.mjs:333` `deepEqual(sanitizeText(...),{ok:true,text:'https://host/p?token=[removido]&page=2',removed:true})`; `:335` comando literal com a mesma URL sanitizada. | PASS |
| C18 V | Chave privada fechada/aberta removida | P C18 | `tests/integrations/privacy/policy.unit.test.mjs:342/:344` `deepEqual(sanitizeText(...),{ok:true,text:'antes\n[removido]\ndepois'/'antes [removido]',removed:true})`; `:346` resultado literal `cabeçalho\n[removido]`. | PASS |
| C19 V | Surrogate/NUL/chave inválida omitidos | P C19 | `tests/integrations/privacy/policy.unit.test.mjs:350–351` `deepEqual(sanitizeText(...),{ok:false})`; `:354/:356` campo undefined e `unsanitizable`; `:360` `deepEqual(...,{ok:'sim',nested:{'a.b-c_9':3}})`. | PASS |
| C20 C | Entrada 1MiB e linha 64KiB, limite/+1 | P C20 | `tests/integrations/privacy/limits.cli.test.mjs:27` `assert.equal(exact.report.events.length,1)`; `:33` `assert.equal(over.report.counters.inputTooLarge,1)`; `:42` `deepEqual(read.body.batch,{accepted:1,persisted:1,malformed:{},dropped:{},contentOmitted:{}})`; `:45` `deepEqual(refused.body.batch,{accepted:1,persisted:1,malformed:{oversize_line:1},dropped:{},contentOmitted:{}})`. | PASS |
| C21 V | Envelope 4096 aceito/4097 recusado | P C21 | `tests/integrations/privacy/policy.unit.test.mjs:398` `validateEnvelope(exact) === true`; `:400–401` `checkEnvelopeBudget(exact) === null`, `over === 'envelope_oversize'`; `:410` `deepEqual(applyPolicy(...),{ok:false,drop:'envelope_oversize'})`. Decisão pura exata; ramo pós-pseudônimo inalcançável hoje, limite declarado. | PASS |
| C22 V | Conteúdo 8192/8193, UTF-8 válido | P C22 | `tests/integrations/privacy/policy.unit.test.mjs:435–437` bytes 8192, campo inteiro/`truncated:false`; `:444–446` `deepEqual(cut,{field:'tool_input.command',role:'args',kind:'text',value:prefix,truncated:true})`, bytes ≤8192, motivo; prefixos emoji/ç locais. | PASS |
| C23 V | Profundidade 8/9, membros 128/129 | P C23 | `tests/integrations/privacy/policy.unit.test.mjs:470` `deepEqual(...,nested(8))`; `:472–473` null/unsanitizable em 9; `:475` `deepEqual(...,members(128))`; `:477–482` 129/soma por evento null/unsanitizable. | PASS |
| C24 V | Sanitização antes do corte | P C24 | `tests/integrations/privacy/policy.unit.test.mjs:492` `assert.ok(!value.endsWith(secret.slice(0,k)))` para todo prefixo; `:493` `!value.includes('SKILL')`; `:494–495` motivos sensitive_removed/content_truncated. | PASS |
| C25 V | Ref/ID nunca cortado | P C25 | `tests/integrations/privacy/policy.unit.test.mjs:502–503` path undefined/`content_truncated`; `:505` `assert.equal(id.length,46)`; `:510–511` refs inteiras length120 ou motivo de omissão. | PASS |
| C26 V | Contagens exatas dos seis códigos | P C26/C26b/C28 | `tests/integrations/privacy/outputs.cli.test.mjs:364` `deepEqual(...,zeroPrivacy({content_disabled:5,sensitive_removed:1}))`; `tests/integrations/privacy/store.cli.test.mjs:648–650` batch/status iguais ao literal local `{unsupported_content:2,unsanitizable:1,sensitive_removed:3,content_truncated:2}` e off disabled2; privacy_failure positivo só em processo C28. | PASS |
| C27 V | Omissão/descarte separados; sem cobertura | P C27 | `tests/integrations/privacy/store.cli.test.mjs:658` lote literal `{accepted:2,persisted:2,malformed:{},dropped:{reasoning_excluded:1,unknown_event:1},contentOmitted:{content_disabled:1}}`; `:660–663` chaves/contadores exatos e `!/coverage\|complete\|cobertura\|completo/i.test(status.stdout)`. | PASS |
| C28 V | Getter/Proxy que lança: falha fechada sem retry | P C28 | `tests/integrations/privacy/policy.unit.test.mjs:526–529` null, `deepEqual(record.privacy,['content:privacy_failure'])`, Bash preservado, `reads === 1`; `:538–539` Proxy null/failure; `:544` envelope hostil retorna `{ok:false,drop:'privacy_failure'}`. Getter variável do novo achado não lança: não é provado por este teste. | PASS, escopo literal |
| C29 V | Hook neutro; wrapper bytes/17 | P C29; N I4-C36/C13/C16 | `tests/integrations/privacy/outputs.cli.test.mjs:388–390` status0/stdout `''`/leaks `[]`; `:396–398` status17, `deepEqual(run.stdout,Buffer.from(...))`, relatório limpo. Regressões `tests/integrations/failure-matrix.cli.test.mjs:75–76`, `tests/integrations/codex-run.cli.test.mjs:98/:103/:230–231`. | PASS |
| C30 C | Falha de rename preserva commit anterior | P C30 | `tests/integrations/privacy/store.cli.test.mjs:673–676` status5, JSON exato `io_failure`, `deepEqual(snapshotTree(root),before)` para dados/state; `:678` persisted anterior1. | PASS |
| C31 C | Nenhuma rede | P C31 | `tests/integrations/privacy/no-network.test.mjs:21–22` ausência de imports fechados/fetch; `:50` todos passos status0; `:63–64` sonda observada e `deepEqual(entries.filter(e=>e.op==='network'),[])`. | PASS |
| C32 C | 23 erros com JSON fechado sem eco | P C32 | `tests/integrations/privacy/store.cli.test.mjs:721–724` exit da tabela, `deepEqual(result.body,{schemaVersion:1,command,status:'error',error:{code}})`, sem canários/paths; `:754/:764/:768` conflitos/io_failure/partial_delete exatos; stderr `''` em `:34`. | PASS |
| C33 V | Canais nativos separados | P C33 | `tests/integrations/privacy/outputs.cli.test.mjs:407` `deepEqual(run.stdout,Buffer.from(childLine+'\n'))`; `:409` stderr nativo exato presente; `:411` `deepEqual(leaks(JSON.stringify(run.report)),[])`. | PASS |
| C34 V | Guia/matriz/defaults/limites | P C34 | `tests/integrations/privacy/docs-privacy.test.mjs:36` `deepEqual(body.map(cells),expected)`; `:56` `assert.match(text,pattern)` para todos os padrões locais; `:58` seis motivos presentes. Frase alterada de nomes conferida em `docs/privacidade.md:22–25`; compartilha o limite do achado C11 em processo. | PASS para guia e prova tabelada |
| C35 C | Só plataformas realmente executadas | P/N C35, sem filtro | `tests/integrations/privacy/docs-privacy.test.mjs:75` `assert.ok(executed.some(row=>row.startsWith(platform)))`; `:77` macOS/Linux nativo ausentes se não executados. Windows/WSL reexecutados aqui; macOS não. | PASS |
| C36 C | Start/layout/defaults/ID/chave | P C36 | `tests/integrations/privacy/store.cli.test.mjs:44` `assert.match(id,/^[0-9a-f]{32}$/)`; `:46` JSON literal active/false/7; `:54` árvore exata; `:85–86` IDs/chaves diferentes; `:79–80` modos0700/0600 executados WSL. | PASS |
| C37 C | Retenção válida1/365; inválidos recusados | P C37 | `tests/integrations/privacy/store.cli.test.mjs:111` `capture.retentionDays === days` para1/365; `:118–119` status2/invalid_retention; `:125–126` missing_flag_value e snapshot idêntico. | PASS |
| C38 C | Root obrigatório/existente/diretório | P C38 | `tests/integrations/privacy/store.cli.test.mjs:134–135` missing_root/snapshot idêntico; `:140` `deepEqual(...,{code:'root_not_found'})`; `:147` root_not_directory; `:149` cwd sem store. | PASS |
| C39 V | Quatro agentes, v1 e escritas limpas | P C39 | `tests/integrations/privacy/store.cli.test.mjs:808–810` chaves exatas, `recordVersion === 1`, `validateEnvelope === true`; `:813–817` temporário/lock observados, `containsCanary/containsMarker === false`; tabela quatro agentes ×off/on. Não representa getter variável em JSON. | PASS |
| C40 C | Ingest só acessa store/código próprio | P C40 | `tests/integrations/privacy/store.cli.test.mjs:841–844` acessos store observados, `entry.file.startsWith(storePrefix)`, loader próprio observado, `deepEqual(entries.filter(e=>e.op.startsWith('child_process.')\|\|e.op==='network'),[])`. Exceção explícita dos módulos carregados pelo Node. | PASS |
| C41 C | Transições/idempotência | P C41/C41b | `tests/integrations/privacy/lifecycle.unit.test.mjs:34–44` estado/changed/content/endedAt exatos nas seis linhas; `tests/integrations/privacy/store.cli.test.mjs:159/:162/:166/:171` JSON literal stopped/changedfalse/disabled/invalid_transition. | PASS |
| C42 C | Encerrada recusa sem mutar | P C42 | `tests/integrations/privacy/store.cli.test.mjs:855–857` status3, `deepEqual(refused.body,{schemaVersion:1,command:'ingest',status:'error',error:{code:'capture_not_active'}})`, snapshot igual. | PASS |
| C43 C | Status/export isolados, JSON1/help PT | P C43/C43s | `tests/integrations/privacy/store.cli.test.mjs:870/:873–874` schemaVersion1, records1, contadores literais; `:879–880` `!exportA.stdout.includes(forbidden)`/`!statusA.includes(forbidden)`; `:885` `assert.match(help.stdout,pattern)` para rotas/PT locais. | PASS |
| C44 C | Delete prévia/apply só encerradas | P C44 | `tests/integrations/privacy/store.cli.test.mjs:206` `deepEqual(snapshotTree(root),before)`; `:210` capture_active; `:217–218` JSON applied/deletedtrue e `!existsSync(captureDir(root,id))` stopped/disabled. | PASS |
| C45 C | Prazo exato/menos1ms/active/endedAt | P C45 | `tests/integrations/privacy/lifecycle.unit.test.mjs:60–61` `assert.equal(isExpired(stopped,ended+7*DAY_MS),true)` e `assert.equal(isExpired(stopped,ended+7*DAY_MS-1),false)`; `:66` active400dias false; `:70` `assert.equal(disabled.endedAt,T0)`; `:71–72` retém após disable. | PASS |
| C46 C | Prune preview/apply/relógio | P C46 | `tests/integrations/privacy/store.cli.test.mjs:253` snapshot igual; `:257–258` somente duas expiradas deletadas/duas preservadas; `:264–266` fresh não selecionada e active preservada. | PASS |
| C47 C | Lock alheio impede comandos sem mutação | P C47/C47s | `tests/integrations/privacy/store.cli.test.mjs:898–904` status4/JSON lock_present, snapshot igual e lock `lock alheio\n`; `:300–305` mesmo contrato nos demais comandos. | PASS |
| C48 C | Produtor tardio não recria | P C48 | `tests/integrations/privacy/store.cli.test.mjs:915–918` status3, código literal conforme delete/not_active, `deepEqual(snapshotTree(root),before)`, `!existsSync(captureDir(root,id))`. | PASS |
| C49 C | Link/foreign recusado; alheio preservado | P C49 | `tests/integrations/privacy/store.cli.test.mjs:328–332` status4/código da tabela, snapshot igual, sentinela externa `'fora da raiz'`; `:355–356` alheios `'alheio'` preservados. Junção Windows/symlink WSL executados. | PASS |
| C50 C | Chave não exportada e apagada | P C50 | `tests/integrations/privacy/store.cli.test.mjs:929` export2; `:932–933` `!text.includes(form)` parahex/base64/base64url/latin1 e `!/"key"/.test(text)`; `:937–938` key/captura ausentes. | PASS |
| C51 C | Exclusão parcial visível/retomável | P C51/C32 | `tests/integrations/privacy/lifecycle.unit.test.mjs:125–129` exit5/partial_delete e pasta/key presentes; `:137–139` exit0/deletedtrue e captures vazio. CLI `tests/integrations/privacy/store.cli.test.mjs:768` JSON partial_delete. | PASS |
| C52 C |500/501,8MiB/+1 e ordem | P C52/C52b/C52s | `tests/integrations/privacy/lifecycle.unit.test.mjs:78–96/:102` admissão exata/rejeição e posteriores recusados; `tests/integrations/privacy/store.cli.test.mjs:947` lote literal persisted500/dropped10; `tests/integrations/privacy/store.unit.test.mjs:74–81` disco8388608/sem aumento no próximo. | PASS |
| C53 V | Contadores mistos exatos | P C53 | `tests/integrations/privacy/store.cli.test.mjs:981` `deepEqual(counters,{accepted:3,persisted:3,malformed:4,dropped:{reasoning_excluded:1,unknown_event:1},contentOmitted:{content_disabled:2}})`; `:982` `accepted >= persisted`. | PASS |
| C54 C | State/lock forma exata/sem marcador | P C54/C54s | `tests/integrations/privacy/store.cli.test.mjs:1002` `deepEqual(Object.keys(lock).sort(),['lockVersion','nonce','pid'])`; `:1003/:1005` marker ausente; `:1007–1009` chaves STATE_KEYS/COUNTER_KEYS locais exatas e persisted2. | PASS |
| C55 C | Demo real/disco/exclusão | P C55 | `tests/integrations/privacy/demo.e2e.test.mjs:79–82` dado preservado/disable/ingest recusado; `:90–94` deletedtrue e dados/key ausentes; `:106–111` prune correto/tmp observados/sem canário. | PASS |
| C56 C | Oito produtores/stop/delete | P C56 | `tests/integrations/privacy/demo.e2e.test.mjs:161–165` sucesso20 ou erro3/4 fechado; `:170–172` persistidos=soma sucessos/linhas; `:177–181` tardio3/not_found, captures vazio e nenhum arquivo dado/key/tmp; duas rodadas. | PASS |
| C57 V | Core intacto | Git read-only atual | `E/source-gate.json:4` `coreExit:0` da comparação `git diff --exit-code BASE HEAD -- scripts/code-review`; `E/core-diff.log` vazio. | PASS |
| C58 C | Privado/dependências/CI/suítes | N I4-C47 | `tests/integrations/fixtures-inventory.test.mjs:46` `pkg.private === true`; `:47–51` script/npmtest/dependências exatas smol-toml/yaml; `:53` CI test:integrations. Teste carrega package/workflow atuais. | PASS |
| C59 V | Quatro suítes afetadas verdes | N completo nos dois SOs | `E/windows-results.json:3` `gateExit:0`; `E/results.txt:2` `gateExit=0`; contagens abaixo, sem filtro/skip C35. | PASS |

## Oito AC — verified at ed7dec25; base analítica carried from be882a54

| AC | Resultado e evidência |
|---|---|
| AC1 — opt-in/start/stop/disable | PASS: C1/C2/C3/C4/C36/C41/C42/C55. O gap de consentimento herdado C3 foi fechado em todos os consumidores enumerados. |
| AC2 — antes de toda persistência | FAIL: C14/C15/C30/C39/C54/C55 comprovam os lotes reais JSON; a API compartilhada devolve envelope inseguro no cenário do getter variável C11. Não se afirma vazamento CLI. |
| AC3 — cinco categorias sem canários | FAIL no contrato geral de metadados: C15 agora prova as cinco categorias/canais enumerados, mas o token em getter variável escapa pela política em processo C11. Conteúdo estável C14/C16–19 passou. |
| AC4 — limites/perdas/cobertura compreensíveis | PASS nas decisões e amostras C20–27/C34/C53. O antigo motivo incorreto para `~` foi corrigido. Mantêm-se precisão C21 e limite JSON de privacy_failure descritos abaixo; o bypass C11 é falha de sanitização do AC2/3. |
| AC5 — retenção/exclusão local controlável | PASS: C41–52/C55/C56, disco real, prévia/clock, conflito, retomada e barreira a produtores tardios. |
| AC6 — sem telemetria/upload automático | PASS: C31, inspeção e sonda sem chamadas; sem destino remoto nesta entrega. |
| AC7 — skill/payload como dado | PASS: D1/C6/C7/C8/C55. Sem modelo real; nenhuma afirmação sobre adotar instruções por modelo não executado. |
| AC8 — diagnósticos/falhas sanitizados | PASS nas fronteiras e exceções efetivamente exercitadas C14/C15/C28–33/C39/C54; stdout/stderr/lock/tmp sem canário. O envelope devolvido por API hostil C11 continua registrado como falha de AC2/3, sem inventar exposição em mensagens de erro. |

## Gates novos — verified at ed7dec25

| Plataforma / target | Total | Pass | Fail | Skip | Exit |
|---|---:|---:|---:|---:|---:|
| Windows `node --test --test-reporter=tap "tests/integrations/privacy/*.test.mjs"` |74|74|0|0|0|
| WSL mesmo alvo, script em arquivo |74|74|0|0|0|
| Windows npm test — governança |6|6|0|0|0|
| Windows npm test — code-review fixtures |16|16|0|0|0|
| Windows npm test — doctor |417|410|0|7|0|
| Windows npm test — integrações |162|156|0|6|0|
| WSL npm test — governança |6|6|0|0|0|
| WSL npm test — code-review fixtures |16|16|0|0|0|
| WSL npm test — doctor |417|416|0|1|0|
| WSL npm test — integrações |162|150|0|12|0|

Cada `npm test`: 601 testes, 588 pass, 13 skip, zero fail/cancelled/todo, exit0. Alvo de privacidade:74/74, sem filtro, incluindo C35 e os 72 nomes I5-C (sufixos inclusos) e dois I5-S. Nenhuma execução formal `review:run`: os16 testes de code-review são fixtures do projeto.

Skips novos conferidos nos logs, motivos iguais aos anteriores:

- Windows doctor7: dois testes POSIX de resolução ENOTDIR/symlink, dois de configuração FIFO, três de adaptador POSIX/FIFO (inclusive controle regular). Guards de plataforma.
- Windows integrações6: I4-C15 sinais POSIX, I4-C25b modo/grupo POSIX, I4-C25j/k/l ACL Linux, I4-C25m ACL macOS. Subcasos internos de symlink de arquivo recusados com EPERM são relatados à parte, não contados como PASS desse cenário; WSL executa-os.
- WSL doctor1: `configuration-trust-C2/C5/C8/hermes-shadow hermes_cli.PYD`, guard Windows (`tests/doctor/configuration-trust.cli.test.mjs:911`).
- WSL integrações12: I4-C18–23/C37/C44b (8) runtime Hermes exigido ausente; I4-C25g/h/i DACL Windows (3); I4-C25m ACL macOS (1). Subcaso Hermes de I4-C35 informa runtime ausente separadamente. Testes nativos Hermes executados no Windows; nenhum modelo chamado.

## Swept e limites

**carried from be882a54**, código relido para confirmar continuidade: receptor `src/integrations/memory-receiver.mjs:19/:41–43/:53`, capacidade500/descarte/fechamento. Hermes `src/integrations/hermes/plugin/__init__.py:162–185/:200`, worker somente na entrega e `put_nowait`/`queue.Full`, fila limitada. Nenhum desses arquivos mudou nas correções. Os contratos externos da #4 foram reexecutados no gate; não autorizam reabrir a #4.

**verified at ed7dec25:** o blast radius da correção de nomes alcança todos os consumidores de `applyPolicy`, não apenas C11. IDs/pseudônimos não mudaram, enums/inteiros/booleanos continuam fora de NAME_FIELDS e o `fieldGaps` explícito mantém precedência. Nomes comuns e inválidos só pela forma têm controles C11; casos JSON dos quatro contratos e contadores foram reexecutados. A proteção dos valores efetivamente copiados no envelope foi retirada e é o único achado necessário desta rodada. Nenhuma omissão anterior C3/C15 foi carregada como PASS por autoridade do relato do autor.

Limites light, base carried from be882a54 e citações tocadas atualizadas: matriz amostral de um caso por linha; C15 um caso por papel/categoria, sem todas as combinações; padrões não garantem detecção universal. C21 prova4096/4097 na decisão pura e no envelope antes dos pseudônimos, sem afirmar ramo pós-pseudônimo alcançável. `privacy_failure` positivo em processo C28; JSON não transporta getter/Proxy, sendo zero nos lotes CLI. C28 não prova getter que muda sem lançar. Sem fault injection sistemático/coverage/Test policy/UI, macOS ou modelo real. A regressão atual foi comprovada por encadeamento de código, não por execução nova; o relatório distingue isso das74 provas realmente executadas.

**Encaminhamento ao coordenador:** FAIL,58/59, um achado P2 dentro do diff das correções. Somente o autor autorizado corrige e prova; esta é a segunda rodada independente, sem consumo de rodada formal. Fonte e HEAD intactos; único arquivo versionado escrito pelo Verifier é este relatório, não commitado.
