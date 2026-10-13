# Issue 3 — Verificação independente do diagnóstico local

**Verdict**: FAIL
**Profile**: light
**Diff range**: `4242520dc6b70848bd0ac8acb7e00acdd1755c8a..46e7c932e236b979754b10b82330be91d8c7597f`
**Fix diff**: `a41001c2f057b08d690bd12ad40d8c127d03e42c..46e7c932e236b979754b10b82330be91d8c7597f`
**Round**: 3 — scoped (última rodada da skill; nenhuma exceção de teto presumida)
**Verifier**: subagente Codex independente; autor Claude; somente leitura de produto/testes/fontes.
**Checks**: 13/18 PASS; C2, C3, C5, C8 e C12 FAIL. Quatro classes de falha confirmadas abaixo. Suíte verde não libera a entrega.

## Escopo, proveniência e fontes

**verified at 46e7c932e236b979754b10b82330be91d8c7597f**: sete findings de `.checks/code-review/issue-3/response.json` lidos integralmente; diff do fix mapeado inteiro (39 arquivos), código das novas decisões, leitores/contrato/parser/validação/renderers/fixtures e asserções atingidas examinados diretamente. As seções do `.build.md` são self-report e não serviram como prova de execução. Todos os targets rodaram independentemente nesta HEAD.

**carried from 25d2b7054a44129ea7c8fcbab94d453f053a54f8**: conclusões de C9, C10 e C13, sem mudança de sua decisão no fix; seus testes foram novamente executados. Demais critérios foram reavaliados por alcance da resolução, avaliação real do contrato, novas estruturas nativas, origem, integração e apresentação. Os relatórios anteriores continuam no histórico Git; esta edição não apaga commits nem resposta formal.

Task aprovada e os seis ACs da issue continuam a referência: AC1 → C1–C4, AC2 → C5–C6, AC3 → C7–C8, AC4 → C9–C10, AC5 → C11–C14, AC6 → C15–C17. AGENTS e perfil light mantidos. O guia Downloads não foi usado como spec. Checklist alterado foi lido; seus detalhes nativos foram confrontados com fontes primárias, não adotados como verdade só porque possuem testes.

| Fonte primária consultada nesta rodada | Evidência usada / limite |
| --- | --- |
| [Codex hook_config.rs, tag rust-v0.162.1](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/config/src/hook_config.rs) | Obtida pelo conector GitHub, blob `7575fa5fcb1042cc380812308f62b8378540ad2a`; linhas 154–159: matcher Option<String>, hooks com default; 171–172: async bool com default; 190–191 e 203–215: input Map e desserializador customizado. Default de campo ausente não autoriza null em bool/Map. |
| [Codex discovery.rs na mesma tag](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/hooks/src/engine/discovery.rs) | Obtida pelo conector; descoberta carrega structs nativas, trata erro de arquivo e ignora os tipos/eventos expressamente não suportados. Não executado. |
| [Claude Hooks](https://code.claude.com/docs/en/hooks), [Codex Hooks](https://learn.chatgpt.com/docs/hooks), [Hermes Hooks](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks) | Páginas abertas nesta rodada. Forma geral, catálogo/eventos e exclusão de hosted tools examinados; não são prova de execução ou confiança local. |
| `C:/Users/paulo/AppData/Local/hermes/hermes-agent/agent/shell_hooks.py` | Fonte instalada lida somente como texto. Linhas 211–236: valida eventos contra VALID_HOOKS e ignora nomes desconhecidos; 240–250: entradas/command. Nenhum módulo Python importado/executado. |
| Mesmo pacote: `hermes_cli/plugins.py`, `hermes_cli/__init__.py`, `website/docs/user-guide/features/hooks.md` | Tabela na linha 108; versão literal na linha 6 (`0.21.4`); doc local :399 e :445–477 define fonte do catálogo e os sinais mapeados. Parser do produto, carregado de cópia isolada, leu independentemente a fonte real: 41 eventos, os sete nomes mapeados presentes. Isso prova a leitura dessa fonte, não vínculo do launcher compilado instalado nem captura real. |

Não houve captura de eventos, execução de agente ou leitura de transcripts/credenciais. Provas de instalação/contrato usam fixtures sintéticas registradas; `real_environment` no relatório da CLI descreve o filesystem entregue à CLI, não certifica a máquina real a partir da fixture. O Hermes real tem launcher compilado: não afirmei contrato/versão ligados a ele com base na tabela lida diretamente.

## Execuções independentes e resultados externos separados

**verified at 46e7c93**. Original começou limpo nessa HEAD. Criei archive da HEAD exata em TEMP, extraí e copiei node_modules; executei cada target completo uma vez na cópia, com escalonamento restrito aos repos temporários dos testes antigos. Runtime Windows: Node v24.21.0/npm 11.19.0. Não usei stash, worktree do original ou alteração de produto para provar falhas.

| Target executado pelo Verifier | Resultado |
| --- | --- |
| `npm run test:governance` | 6 testes, 6 PASS, 0 FAIL, 0 skip; exit 0 |
| `npm run test:code-review` | 10 testes, 10 PASS, 0 FAIL, 0 skip; exit 0 |
| `npm run test:doctor` | 229 testes, 228 PASS, 0 FAIL, 1 skip; exit 0 |

Total independente Windows: **244 PASS, 0 FAIL, 1 skip**, 245 testes. O runner nomeou os casos individualmente; os casos de PATHEXT, shim npm local, vários intérpretes, three support states, 45 origens not_inspected, forma nativa e campos opcionais executaram. Inclusive executou verde o teste incorreto que exige configured para async:null; verde não torna esse valor compatível com a fonte.

Skip único: `agent-resolution-C2 realpath/symlink real liga o launcher do Codex ao pacote (POSIX)`, `tests/doctor/agent-resolution.unit.test.mjs:443`, condição Windows. Não afirmado como executado. Asserções foram localizadas com `rg -n 'test\(|assert\.'` nos arquivos atingidos; não aceitei ausência de teste selecionado como sucesso.

**Evidência complementar do orquestrador, não execução do Verifier**: li `.checks/code-review/linux-final-npm-test.txt`; há resultados individuais e totais 6 governança + 10 motor + 229 doctor PASS, zero falhas/skips, EXIT_CODE=0, no mesmo commit. Orquestrador informa Node24.13.0/Git temporário2.49.0. A falha anterior com Git2.34 foi preservada em `linux-initial-git234-npm-test.txt`; li o erro `git worktree list -z`. Não atribuí a mim nem escondi essa primeira falha. macOS/CI remota não foram observados. Meu probe adicional de shebang foi executado na CLI Linux com Node24.13.0, em minha própria cópia temporária do snapshot exato, sem executar agente/intérprete.

## Sete achados formais — resultado específico e alcance

**verified at 46e7c93**. Numeração corresponde à ordem de `response.json`.

| Finding | Prova localizada que rodou | Resultado do cenário formal / limite |
| --- | --- | --- |
| F1 caminhos Windows em POSIX | `config-sources.unit.test.mjs:30/:39` — literal `C:\Users\alguem\AppData\Local\hermes`; :94–110 — paths exatos dos três agentes por plataforma | Cenário corrigido; path.win32/path.posix explícitos. Windows independente passa; log Linux complementar passa. Sem afirmar macOS observado. |
| F2 suporte sempre unverified | `capability-evidence.cli.test.mjs:148`–151 — cinco verified/local_contract_lists_events com fonte/eventos; :186–190 — evento ausente só afeta mecanismo; :299–305 — absent CLI unavailable e demais unverified | Avaliação real agora existe e os três estados chegam à CLI. C5 ainda FAIL pelo vínculo errado do caso G4, não pela antiga constante. |
| F3 codex.exe/claude.cmd ignorados | `agent-resolution.unit.test.mjs:489`–496 — presentes, versão null/motivo; :515–518 — primeiro PATH preservado; :529/:534/:545 — ordem PATHEXT e entrada inválida | Cenário corrigido, sem executar launcher. Teste CLI `presence-C3` :356–365 corrobora seleção e sentinel ausente. |
| F4 npm local não reconhecido | `agent-resolution.unit.test.mjs:594`–599 — 0.162.1/package_metadata/path local; `presence.cli.test.mjs:387`–391 — mesmo contrato por processo CLI e sem sentinel | Cenário corrigido. Fixtures usam templates nativos e links reais conforme o SO, não o antigo require inventado. |
| F5 outro pythonX.Y escolhido lexicalmente | `agent-resolution.unit.test.mjs:670`–676 — versão e packageDir do X.Y; :685–686 — sem X.Y ambíguo; :694–695 — sem pacote correspondente null | Cenário original, dentro do mesmo prefixo, corrigido. Vínculo geral ainda incorreto com shebang absoluto em prefixo diferente: G4, reproduzido também na CLI Linux. |
| F6 hooks inválidos configured | `configuration-trust.cli.test.mjs:237`–245 — dois exemplos formais invalid/partial e demais preservados; :273–274 — Codex/Hermes estruturalmente invalid; :458–459 — timeout inválido | Exemplos formais corrigidos, mas critério continua não satisfeito: nullable native fields e evento Hermes fora da tabela ainda produzem conclusões erradas (G1/G2/G3). |
| F7 45 origens fixture falsas | `capability-evidence.cli.test.mjs:333`–350 — 45 linhas not_inspected, CLI local real_environment, zero fixture em JSON/texto | Cenário corrigido. fixture só explícita na camada/registro de teste; nenhuma fixture tratada como validação da máquina real pelo Verifier. |

## Checks — C1 a C18

Todos foram contabilizados. `V` = **verified at 46e7c932e236b979754b10b82330be91d8c7597f**, reavaliado; `C` = **carried from 25d2b7054a44129ea7c8fcbab94d453f053a54f8**, conclusão preservada mas prova novamente executada. Referências são relativas ao repo, com linhas atuais. Uma localização em FAIL demonstra prova parcial/incorreta, não aprovação da claim inteira.

| Check | Claim e prova executada | Asserção localizada / lacuna | Veredito |
| --- | --- | --- | --- |
| C1 | Ausência/ordem/null/motivo/texto/exit, presence-C1 | `presence.cli.test.mjs:49` — length3; :55–57 — absent/null/executable_not_found; :62 — texto por agente. Inventário unitário afirma IDs literais. | V PASS |
| C2 | Versão e origem ligadas ao artefato, PATH/Unicode/SOs/npm | `agent-resolution.unit.test.mjs:143/:148/:153` — versões literais 2.1.295/0.162.1/0.21.4; :594/:599 — shim local; :670–676 — intérprete no mesmo prefixo. G4 publica fonte de A apesar de shebang B; prova amostra só prefixo igual. | V FAIL — G4 |
| C3 | Não inventar versão de launcher/fonte desconhecida/ambígua; acesso | `presence.cli.test.mjs:191`–193 — present/null/ambiguidade; `agent-resolution.unit.test.mjs:491`–496 — formato Windows desconhecido null; :685–686 — ambíguo null. G4 fora desse layout não fica inconclusivo, atribui outra fonte. | V FAIL — G4 |
| C4 | Zero execução/mudança de perfil/skills/config | `presence.cli.test.mjs:315` — sentinel ausente; :318 — inventários iguais, incluindo SHA256. `agent-resolution-C4` executou; inspeção de src/doctor não encontra spawn/exec/import de agentes ou filesystem writes. | V PASS |
| C5 | Contrato local compatível por mecanismo; três estados e origem | `capability-evidence.cli.test.mjs:148`–151 — verified/fonte/eventos; :299–305 — unavailable versus unverified; :212–213 — versão sem perfil unverified. Fonte real foi lida independentemente. G4 ainda faz o produto verificar contrato de pacote não ligado ao intérprete. | V FAIL — G4 |
| C6 | Configuration/support/runtime separados | `capability-matrix.unit.test.mjs:110`–114 — config e runtime not_performed; :121 — matriz inteira not_performed; `capability-evidence.cli.test.mjs:150` — verified de contrato não significa runtime verified. | V PASS |
| C7 | 5×4/superfícies/hosted tools/SkillStart | `capability-matrix.unit.test.mjs:125`–138 — listas literais; :174–177 — cloud unverified/exclusion null; `capability-evidence.cli.test.mjs:92`–105 — motivo local, exclusion documented_contract separado, cloud preservada. | V PASS |
| C8 | Forma/config/trust/precedência nativas corretas | `configuration-trust.cli.test.mjs:240`–245 — estrutura formal invalid/partial; :99–101 — política unknown; :142–144 — confiança nativa; `config-projection.unit.test.mjs:640` exige configured para async:null, em desacordo com bool nativo. G1–G3 confirmados na CLI. | V FAIL — G1/G2/G3 |
| C9 | Transporte loopback IPv4/IPv6/recusa/identidade false | `collector.cli.test.mjs:31`–32 — reachable/false; :48/:50 — unreachable/false; :71–72 — IPv6/false. Função sem envio de payload inalterada. | C PASS |
| C10 | Sem endpoint/entrada recusada/1000ms/continuação | `collector.cli.test.mjs:86`–87 — unknown/endpoint_not_provided; :127–129 — uso inválido exit2; `collector-probe.unit.test.mjs:65`–69 — timeout/motivo/tempo real, :84 — abort. | C PASS |
| C11 | Mesmo modelo/fatos/códigos, JSON único, texto PT | `envelope.cli.test.mjs:32`–34 — JSON único/sem ANSI; :86–117 — fixture verified, path/fonte/eventos nos dois formatos; :160–168 — failure code/message/exit, sem canário; `render-text.unit.test.mjs:181`–188 — fonte/eventos/missingEvents no bloco da linha. | V PASS |
| C12 | Envelope/status/partial por inválido, exit0/1/2 | `envelope.cli.test.mjs:182`–184 — schema1/complete/exit0; :205–209 — partial/continuação; `envelope-failure.unit.test.mjs:15`–17 — exits. G1 gera complete para config que fonte nativa rejeita; G2 gera partial para config válida. | V FAIL — G1/G2 |
| C13 | Help/flags/defaults/exits/sem inspeção | `envelope.cli.test.mjs:252`–259 — help exit0/flags; :273–274 — cwd inexistente exit2 legível; :285 — flags de reparo/instalação/coleta exit2. Citações atualizadas após teste alterado; decisão não mudou. | C PASS |
| C14 | Projeção sem vazamento/limite/YAML/PE/cabeçalho | `leak-and-limits.cli.test.mjs:48`–54 — zero canário; :111–113 — unknown/input_too_large; `config-projection.unit.test.mjs` provas C14 rodaram; `version-metadata.unit.test.mjs:67`–70 — versão/leitura parcial; `agent-resolution.unit.test.mjs:570`–573 — binário nativo só cabeçalho. | V PASS |
| C15 | Concorrência/snapshot/mutação inconclusiva | `snapshot-concurrency.cli.test.mjs:52`–59 — fatos/inventário iguais; `mid-read-mutation.unit.test.mjs:134`–135 — config unknown; :166 — wrapper changed_during_read; :199/:225/:263 — motivo específico de versão; `contract-evidence.unit.test.mjs:186` — fonte de contrato mutada inconclusiva. | V PASS |
| C16 | Cenários CLI/fixture versus real/convenções de SO | `presence.cli.test.mjs:284`–292 — 9.9.0 reconhecida/matriz incompatível; `configuration-trust.cli.test.mjs:167`–176 — leitura inacessível real; `capability-evidence.cli.test.mjs:333`–350 — 45 not_inspected, zero fixture falsamente atribuída; inventário de origem e três convenções executou. | V PASS; macOS não observado |
| C17 | Fontes/data/evidência/lacunas e README | `docs-compatibility.test.mjs:14`–17 — invocação/estados; :32 e :40–42 — colunas/três níveis. Conteúdo e fontes primárias reabertos. Limitações documentadas não autorizam os configured incorretos de G1/G3. | V PASS do registro exigido; erros de produto permanecem |
| C18 | Suítes/core/CI/private/governança | `scripts/governance-ci.test.mjs:263`–281 — matriz/steps/CI; 6gov+10motor rodados independentemente. Cinco SHA256 base/head iguais; package/CI/core não alterados pelo fix nem pelo Verifier. | V PASS |

## Gaps confirmados, ranqueados

**verified at 46e7c93**. Todos P2/bloqueantes para o contrato de diagnóstico; nenhum patch/teste/critério foi corrigido pelo Verifier.

### G4 — Shebang externo atribui versão e contrato de outro pacote (C2/C3/C5)

**Localização**: `src/doctor/launcher-link/hermes.mjs:72`–74 extrai somente X.Y; :173 fixa prefixo a partir do launcher; :178 busca o X.Y nesse prefixo; :194 retorna esse packageDir. `run-diagnostics.mjs` usa esse pacote para a fonte do contrato.

**Cenário**: `/a/bin/hermes` tem `#!/b/bin/python3.12`; A contém pacote 0.21.4 e B contém 0.20.0. **Esperado**: seguir o intérprete/pacote realmente ligado ao launcher ou reportar version null com motivo de vínculo inconclusivo. **Atual**: version0.21.4/source_literal de A e evidência de contrato A verificada. Não foi executado o intérprete, nem precisava ser executado para recusar essa atribuição incorreta. A fonte escolhida não corresponde ao caminho explícito do intérprete.

**Reprodução independente**: primeiro leitor unitário com FS sintético; depois processo real CLI Linux sobre minha própria cópia temporária `/tmp/independent-r3-linux-XqwQoF/checkout`, Node24.13.0, com diretórios A/B e arquivos de fixture. Saída: exit0, Hermes present, version0.21.4, source `.../a/lib/python3.12/site-packages/hermes_cli/plugins.py`, apesar do shebang `.../b/bin/python3.12`. Fonte B tinha 0.20.0; retorno null também seria seguro. O intérprete da fixture era um stub e nunca foi iniciado: a prova é da escolha estática errada, não da execução Python. Testes :661–695 amostram vários X.Y dentro do mesmo prefixo; não têm prefixos absolutos diferentes. Assim, o cenário formal original melhorou, mas a intenção do vínculo ainda falha.

### G1 — Null em campos não Option do Codex é aceito como configured (C8/C12)

**Localização**: `src/doctor/hooks-shape.mjs:29`–32 aceita null genericamente; :107 usa isso para async e :127 para input. Fonte vinculada à versão: `hook_config.rs:171`–172 define bool com default; :190–191 e :203–215 definem Map/desserializador, não Option. Somente ausência pode usar default; null presente não satisfaz esses tipos.

**Reprodução independente na CLI Windows isolada**: escrevi `hooks.json` de usuário com `PreToolUse`/grupo/handler nativos, isolando (a) command `command:"echo ok", async:null`, (b) mcp_tool `server:"s", tool:"t", input:null`. Em ambos: exit0, status complete, configuration configured, hooks_configured. **Esperado**: invalid/hooks_structure_invalid e partial, preservando os demais agentes. **Impacto**: documento que Codex rejeita é anunciado como configuração de captura existente.

**Prova incorreta localizada**: `tests/doctor/config-projection.unit.test.mjs:625`–640 inclui async:null (:633) na tabela de valores aceitos e afirma configuration configured (:640). Esse teste existiu, rodou e passou nesta HEAD; ele mede o valor errado. Precisa ser corrigido com justificativa da fonte, não preservado como verde.

### G3 — Evento Hermes fora do catálogo instalado conta como hook configurado (C8)

**Localização**: `src/doctor/hooks-shape.mjs:304`–316 aceita qualquer chave que não seja reservada e soma entradas com command. **Fonte nativa**: `C:/Users/paulo/AppData/Local/hermes/hermes-agent/agent/shell_hooks.py:224`–230 ignora nomes fora de VALID_HOOKS; a própria tabela instalada está em `hermes_cli/plugins.py:108` e o registro de plugins valida contra ela. Uma configuração não amplia o catálogo só por escrever uma chave.

**Reprodução independente CLI Windows isolada**: instalação Hermes reconhecida0.21.4, plugins.py ligado com tabela sintética da mesma forma nativa, config `hooks: { made_up_event: [ { command: "echo ok" } ] }`. Saída exit0/status complete/configuration configured/hooks_configured. Parser aplicado independentemente à fonte real leu 41 eventos e confirmou made_up_event ausente. **Esperado**: não afirmar configured de um evento que a fonte rejeita/ignora; not_configured quando esse é o único handler e ausência comprovada, ou unknown se não houver catálogo aplicável. **Impacto**: doctor afirma configuração, mas nenhum hook será registrado. A lacuna explicitada na documentação não altera C8 nem autoriza essa afirmação positiva. Não confundir extensão futura do agente com configuração da versão examinada.

### G2 — Matcher null válido do Codex é rejeitado (C8/C12)

**Localização**: `src/doctor/hooks-shape.mjs:14`–16 e :161 só permitem matcher string/undefined; não permitem null. **Fonte**: `hook_config.rs:154`–159 define matcher Option<String> com default. Nesse campo JSON null é ausência de matcher válida (diferente de async/input).

**Reprodução independente na CLI Windows isolada**: mesmo hooks.json com PreToolUse, `matcher:null`, e command válido. Saída exit0/status partial/configuration invalid/hooks_structure_invalid. **Esperado**: grupo válido, handler com alvo → configured, sem partial por esse campo. **Impacto**: falso impedimento para configuração nativa válida. Os testes de matcher inválido amostram números/valores de outro tipo, não esse Option nullable.

## Limitações, nível das provas e teto

Profile light mantido: **sem fault injection/mutação de produto**, sem join formal Coverage/Test policy ou comparação visual ui. Entradas de fixture e probes acima não modificam implementação. Ausência de CONTRIBUTING e Swept sem linhas existing **carried from rodada2**; nenhum novo documento desse tipo no diff.

As sete correções receberam provas específicas, mas amostragem nativa não fecha com testes derivados do novo parser: async:null foi explicitamente rotulado com valor errado, matcher:null faltou, nomes Hermes não foram confrontados com catálogo e vínculo só amostrou X.Y no mesmo prefixo. Fontes e provas de CLI independentes distinguem esses defeitos de preferências de implementação.

Limitações anteriores de acesso EACCES por adaptador, política em caminho fixo, timeout com connect injetado e exit1 por função continuam declaradas. C16 inacessibilidade real usa diretório no lugar do arquivo (EISDIR/EPERM), não prova chmod. CLI local fixture não certifica runtime real; nenhuma capacidade foi afirmada como captura funcional. Zero payload de transporte conferido por inspeção + testes de status, sem alegar contador de bytes inexistente. O skip Windows foi contabilizado e o Linux complementar não foi atribuído ao Verifier.

Esta é a rodada3 da skill. FAIL exige decisão do proprietário para qualquer verificação adicional; o Verifier não abriu rodada extra, aumentou perfil/teto ou alterou a resposta formal. Nenhuma autorização de merge/publicação é inferida do resultado de testes.

## Preservação e hashes

**verified at 46e7c93**: original HEAD correta e porcelain vazio antes das provas e imediatamente antes deste relatório. Após salvar, confirmei novamente HEAD `46e7c932e236b979754b10b82330be91d8c7597f` e porcelain somente ` M .checks/issue-3-agent-diagnostics.verified.md`. Nenhum código/teste/critério, `.git`, estado/resposta de code-review, commit, push, PR, issue ou instalação global foi alterado pelo Verifier. Logs Linux são do orquestrador, só lidos.

Archives base/head extraídos separadamente em TEMP e SHA256 comparado; todos True. `git diff --exit-code 4242520 -- <cinco arquivos>` retornou0.

| Arquivo comum scripts/code-review | SHA256 base = HEAD |
| --- | --- |
| cli.mjs | `D69974087A3B43FCCF482E5F5B56C19F96FED60652B8985E7A9C298F061AE61E` |
| review.mjs | `88508699ED5AB33F81BA438E229CD1A5DA3DE71FCD0EFFCFBD162CF7CF0E0CB6` |
| review.test.mjs | `67247DB5701B1F71337D428BF0103B5BFA0435E5EF85C53E5A93D73E5D21D621` |
| schema.json | `A11E040A7061447C1E0D516E31919DA0D2821E012C6C44F27A56634228C6A467` |
| README.md | `5F1998DB4621A09396920C37DC8AA4267C4DEF33F028F9945EF717DB8E8C0064` |

## Gate

**FAIL — 13/18 PASS**, C2/C3/C5/C8/C12 não satisfeitos nos cenários independentes confirmados. Windows independente: **244 PASS, 0 FAIL, 1 skip**; Linux complementar lido: **245 PASS, 0 FAIL, 0 skip**. Quatro classes bloqueantes G4/G1/G3/G2, apesar da suíte verde. A revisão formal final não é liberada por este relatório; nenhuma correção ou nova rodada foi realizada pelo Verifier.
