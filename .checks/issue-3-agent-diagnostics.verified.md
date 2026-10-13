# Issue 3 — Quarta verificação independente

**Verdict**: FAIL
**Profile**: light
**Diff range**: `4242520dc6b70848bd0ac8acb7e00acdd1755c8a..6d073b69351a2884d46bf6056aaf8e6ecb7574b8`
**Fix diff**: `46e7c932e236b979754b10b82330be91d8c7597f..6d073b69351a2884d46bf6056aaf8e6ecb7574b8`
**Round**: 4 — scoped, autorizada explicitamente pelo proprietário
**Verifier**: subagente Codex independente; Claude autor; nenhuma correção aplicada pelo Verifier.
**Checks**: 17/18 PASS; C8 FAIL por residual de G3. G1/G2/G4 e os casos anteriores de G3 foram corrigidos, mas a validade da configuração Hermes ainda não segue uma restrição nativa expressa.

## Autorização, escopo e fontes

**verified at 6d073b69351a2884d46bf6056aaf8e6ecb7574b8**. Autorização específica registrada em `.checks/issue-3-agent-diagnostics.linux.md`: “pode fazer a quarta rodada de verificação independente da issue #3 e, se passar na revisão, abra o PR”. Esta rodada não autoriza uma quinta nem altera o teto de duas tentativas formais. Não executei revisão formal, push, PR ou correção.

Li o diff dos arquivos de produto e provas alterados, o checklist atualizado, o registro de autorização/Linux e o procedimento de reverificação de `references/verify.md`. Reavaliei C2/C3/C5/C8/C12, que eram FAIL, e o alcance em validação nativa, catálogo, projeção, confiança, resolução de prefixos e integração. `.build.md` e resultados do autor são self-report, não prova independente. O FAIL da rodada 3 está preservado no commit `c4a4d45`; não foi apagado.

**carried from 46e7c932e236b979754b10b82330be91d8c7597f**: regras/task e comparação com os seis ACs (AC1 C1–C4, AC2 C5–C6, AC3 C7–C8, AC4 C9–C10, AC5 C11–C14, AC6 C15–C17); fontes já abertas e conclusões não atingidas identificadas na tabela. Citações dos arquivos alterados foram atualizadas. Task/AGENTS não foram alterados pelo fix. O guia Downloads continua não vinculante.

Fontes nativas da comparação:

- [Codex hook_config.rs na tag rust-v0.162.1](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/config/src/hook_config.rs), obtida na rodada 3, blob `7575fa5fcb1042cc380812308f62b8378540ad2a` — conclusões **carried from 46e7c93**: matcher Option<String> (:154–159), async bool com default (:171–172), input Map/desserializador (:190–191/:203–215). As correções atuais foram comparadas com esses tipos, preservando null válido somente onde a fonte permite.
- Hermes instalado, `C:/Users/paulo/AppData/Local/hermes/hermes-agent/agent/shell_hooks.py:211`–236, somente texto; conferido nesta rodada. O parser recusa `SHELL_UNSUPPORTED_HOOKS` nas linhas 220–223 ANTES de testar presença em VALID_HOOKS nas linhas 224–230. Assim, pertencer à tabela geral não basta para registrar um shell hook.
- Mesmo pacote, `hermes_cli/plugins.py:108` (VALID_HOOKS) e :208 (SHELL_UNSUPPORTED_HOOKS): lido como texto nesta rodada; parser de produto aplicado na cópia isolada confirmou que `transform_api_error_classification` pertence à tabela geral. Fonte real copiada para uma instalação de fixture na reprodução; não importada como Python nem executada.
- Docs oficiais Claude/Codex/Hermes e doc local do Hermes foram abertas na rodada 3; conclusões **carried from 46e7c93**, com as linhas modificadas de `docs/agent-compatibility.md` relidas nesta rodada. Nenhuma documentação foi usada para autorizar configured contrário à fonte nativa.

A fixture com fonte real copiada prova a decisão da CLI sobre esses artefatos sintéticos. Não certifica suporte/configuração da máquina real; o registro de teste continua fixture. Nenhum agente, módulo Python, hook, handler, prompt ou transcript foi executado/lido pelo Verifier.

## Provas independentes desta HEAD

**verified at 6d073b69**. Original começou com essa HEAD e porcelain vazio. Criei ZIP por git archive da HEAD exata, extraí em TEMP e copiei node_modules; rodei todos os targets completos na cópia. Escalonamento restrito à cópia e aos repositórios temporários dos testes antigos, conforme bloqueio de `.git/config` já demonstrado no sandbox. Runtime Windows Node v24.21.0/npm 11.19.0. Sem stash ou mudanças no produto.

| Target executado pelo Verifier | Resultado observado |
| --- | --- |
| `npm run test:governance` | 6 testes, 6 PASS, 0 FAIL, 0 skip; exit 0 |
| `npm run test:code-review` | 10 testes, 10 PASS, 0 FAIL, 0 skip; exit 0 |
| `npm run test:doctor` | 243 testes, 242 PASS, 0 FAIL, 1 skip; exit 0 |

**258 PASS, 0 FAIL, 1 skip**, 259 testes contabilizados. O runner nomeou testes individualmente. Novos casos de null Option/defaulted, matcher:null, prefixos externos com/sem X.Y e catálogo ausente executaram; não aceitei seleção vazia como sucesso. Asserções localizadas com `rg -n 'test\(|assert\.'`, com diff/corpo dos casos novos lidos. Os casos de configuração Hermes com tabela, sem tabela e evento misto também executaram.

Skip único: `agent-resolution-C2 realpath/symlink real liga o launcher do Codex ao pacote (POSIX)` em `tests/doctor/agent-resolution.unit.test.mjs:443`, condicionado a Windows. Não foi afirmado como executado. Fixtures win32/linux/darwin rodaram; não são execução real em três SOs.

**Complemento do orquestrador, não execução do Verifier**: li `.linux.md` e os totais de `.checks/code-review/linux-final-npm-test.txt`: 6 governança + 10 motor + 243 doctor = 259 PASS, 0 FAIL, 0 skip, EXIT_CODE=0. O produto desse log é e3f9f78, com as mesmas correções; a HEAD posterior 6d073b69 registra documentação/evidência/autorização. Não atribuí o log a mim nem usei resultado do autor no lugar da execução independente na HEAD exata. A falha anterior com Git2.34 permanece registrada. Sem observação de macOS/CI remota.

## G1–G4 e alcance dos fixes

**verified at 6d073b69**.

| Classe anterior | Asserção/prova executada | Veredito |
| --- | --- | --- |
| G1 async/input null inválidos | `config-projection.unit.test.mjs:656`–663 chama `invalidStructure` para async:null e input:null; controle Option null :645–653 permanece configured. isValidDefaultedField separa ausência de null presente, conforme bool/Map nativos. | Corrigido |
| G2 matcher null válido | `config-projection.unit.test.mjs:677` — `assert.equal(codex.configuration, "configured")`; números continuam inválidos. Permissividade só no Codex, com fonte Option<String>; não propagada sem fonte para Claude. | Corrigido |
| G4 fonte de outro prefixo | `agent-resolution.unit.test.mjs:717`–720 — versão0.20.0/packageDir B, não A; :758–761 — python/python3 absolutos sem X.Y também B; :737–738/:774–776 — sem pacote em B fica null, sem fallback; :791–793 — dois candidatos B ficam ambíguos. | Corrigido nos cenários da rodada 3 e variantes explícitas |
| G3 evento desconhecido / catálogo ausente | `configuration-trust.cli.test.mjs:481`–488 — made_up_event fora da tabela not_configured/motivo/sem confiança; :516–517 — evento real ao lado preserva configured; :550–557 — sem fonte unknown/hooks_catalog_unavailable; `config-reader.unit.test.mjs:319`–322 — mesmo motivo/sem confiança na camada. | Casos anteriores corrigidos; classe permanece FAIL por restrição nativa omitida abaixo |

O catálogo é lido antes de configurar, pela mesma fonte ligada à versão; trust é calculada depois do resultado final. Isso fecha a exceção anterior de configured sem catálogo. Porém, `validHooks` é a tabela geral de plugins; a nova decisão a usa como catálogo de shell hooks sem excluir uma restrição nativa já presente na fonte. Não procurei outras classes de defeito depois de confirmar esse residual.

## Residual bloqueante G3 — Evento Python-only é anunciado como shell hook configurado

**Prioridade**: P2. **Critério**: C8; intenção de AC3. **verified at 6d073b69**.

**Localizações do produto**:

- `src/doctor/contract-evidence.mjs:116` devolve `validHooks: listed` do VALID_HOOKS geral.
- `src/doctor/run-diagnostics.mjs` passa esse conjunto a readAgentConfiguration.
- `src/doctor/config-reader.mjs:163`–169 valida configuração somente pela interseção de `hermesTargetedEvents` com `hermesValidHooks`; qualquer interseção preserva configured.

**Fonte nativa**: `C:/Users/paulo/AppData/Local/hermes/hermes-agent/agent/shell_hooks.py:220`–223 testa SHELL_UNSUPPORTED_HOOKS, emite aviso de que o evento é Python-plugin-only e ignora sua entrada. Essa recusa ocorre antes de VALID_HOOKS. No mesmo pacote, `plugins.py:208` define `SHELL_UNSUPPORTED_HOOKS = {"transform_api_error_classification"}`; o evento também pertence a VALID_HOOKS. São superfícies distintas do mesmo agente: contrato de plugin Python não implica configuração de shell hook.

**Reprodução independente, sem execução de agente/handler**:

1. Archive exato 6d073b69 extraído em TEMP; imports somente dos módulos do doctor/helpers dessa cópia.
2. Leitura textual do `plugins.py` instalado e confirmação independente: `extractHermesValidHooks(raw).includes("transform_api_error_classification") === true`.
3. Instalação de fixture Hermes0.21.4 pelo helper existente; o `plugins.py` real é copiado como arquivo textual para o pacote ligado ao launcher. Config de fixture contém apenas `hooks: { transform_api_error_classification: [ { command: "echo forbidden" } ] }`.
4. Processo real `doctor --json --cwd <scratch>` no ambiente da fixture, HOME/USERPROFILE/HERMES_HOME/PATH controlados, coletor ausente.
5. Saída observada: exit0; version0.21.4; status complete; configuration configured; configReasonCode hooks_configured; trust unknown.

**Esperado**: esse único shell hook não sustenta configured, pois a própria instalação o ignora expressamente. Com essa fonte vinculada, nenhum shell handler seria registrado; not_configured com motivo específico seria coerente. Uma implementação que não consiga verificar a restrição deve ficar inconclusiva, sem afirmar configured.

**Impacto**: o usuário recebe uma afirmação de configuração de captura que o Hermes não carregará. A fonte real desmente a decisão positiva apesar de todas as provas terem passado.

**Gap de amostragem/prova**: novos testes distinguem evento ausente da tabela, presente na tabela e catálogo ausente; não cobrem evento presente em VALID_HOOKS e proibido para shell hooks por SHELL_UNSUPPORTED_HOOKS. A fixture padrão `hermesPluginsSource` não inclui esse nome em VALID_HOOKS, embora o registre na tabela de restrição separada; portanto, testar só seu catálogo sintético esconde o caso que a fonte real reproduz. A linha em `.build.md` ou docs não substitui a condição de registro de `_parse_hooks_block`.

Nenhum teste/fonte/critério foi corrigido pelo Verifier. Este residual é da mesma classe G3 de configuração Hermes; não é pedido para ampliar produto ou implementar captura.

## C1–C18 contabilizados

`V` = **verified at 6d073b69351a2884d46bf6056aaf8e6ecb7574b8**; `C` = **carried from 46e7c932e236b979754b10b82330be91d8c7597f** com prova novamente executada nesta HEAD. Citações de arquivos alterados foram atualizadas. As localizações em C8 demonstram a prova parcial e o que falta, não a aprovação da claim inteira.

| Check | Provas e asserção relevante localizada | Resultado |
| --- | --- | --- |
| C1 | presence-C1: `presence.cli.test.mjs:49` length3; :55–57 absent/null/executable_not_found; :62 texto por agente. Ordem literal unitária preservada. | C PASS |
| C2 | agent-resolution/presence-C2: `agent-resolution.unit.test.mjs:143/:148/:153` versões literais; :717–720 fonte do prefixo B; :758–761 variante absoluta bare; :594–599 npm local. | V PASS — G4 fechado |
| C3 | `presence.cli.test.mjs:191`–193 present/null/ambiguidade; `agent-resolution.unit.test.mjs:737`–738 e :774–793 null/motivo sem fallback A quando B ausente/ambíguo; :491–496 launchers Windows desconhecidos presentes. | V PASS — G4 fechado |
| C4 | presence-C4: `presence.cli.test.mjs:315` sentinel ausente; :318 inventários SHA256 iguais. Inspeção confirma novos passos só leem/projetam, sem execução ou escrita. | V PASS |
| C5 | capability-evidence-C5: `capability-evidence.cli.test.mjs:148`–151 verified/fonte/eventos/runtime separado; :299–305 unavailable CLI versus unverified remoto. `agent-resolution.unit.test.mjs:720/:761` pacote B agora sustenta a ligação da fonte de contrato; contrato ligado lido antes da config. | V PASS — G4 fechado |
| C6 | `capability-matrix.unit.test.mjs:110`–114 config/runtime distintos; :121 matriz inteira not_performed; `capability-evidence.cli.test.mjs:150` contrato verified nunca runtime verified. | C PASS |
| C7 | `capability-matrix.unit.test.mjs:125`–138 listas 5×4; :174–177 cloud unverified; `capability-evidence.cli.test.mjs:92`–105 exclusão hosted documentada separada, cloud sem exclusão. | C PASS |
| C8 | `config-projection.unit.test.mjs:656`–677 fecha null inválido/matcher válido; `configuration-trust.cli.test.mjs:481`–488 fecha evento ausente e :550–557 catálogo ausente; :156–158 confiança exige catálogo válido. Nenhuma prova cobre presente-no-catálogo/Python-only. Probe nativo acima confirma configured falso. | V FAIL — G3 residual |
| C9 | `collector.cli.test.mjs:31`–32 reachable/identity false; :48/:50 unreachable/false; :71–72 IPv6/false. Transporte sem payload inalterado. | C PASS |
| C10 | `collector.cli.test.mjs:86`–87 unknown/endpoint_not_provided; :127–129 inválido exit2; `collector-probe.unit.test.mjs:65`–69 timeout/motivo/tempo real; :84 abort. | C PASS |
| C11 | `envelope.cli.test.mjs:32`–34 JSON único; :86–117 path/contrato/eventos e mesmos fatos; :160–168 falha segura; `render-text.unit.test.mjs:181`–188 fonte/eventos/missingEvents por linha. Campos de catálogo novos são internos, não fatos adicionais divergentes do relatório. | V PASS |
| C12 | `envelope.cli.test.mjs:182`–184 complete/schema1/exit0; :205–209 partial e continuação; `envelope-failure.unit.test.mjs:15`–17 exits; null inválido passa pela projeção invalid corrigida e fluxo partial existente. `configuration-trust.cli.test.mjs:547`–553 sem catálogo partial/unknown. | V PASS — antigos G1/G2 fechados |
| C13 | `envelope.cli.test.mjs:252`–259 ajuda/flags; :273–274 cwd inválido exit2; :285 flags de reparo inexistentes. | C PASS |
| C14 | `leak-and-limits.cli.test.mjs:48`–54 zero canário; :111–113 unknown/input_too_large; `version-metadata.unit.test.mjs:67`–70 leitura PE parcial; nova projeção só passa chaves internas de evento e motivo próprio. | V PASS |
| C15 | `snapshot-concurrency.cli.test.mjs:52`–59 fatos/inventário iguais; `mid-read-mutation.unit.test.mjs:134`–135 config inconclusiva, :166 wrapper changed, :199/:225/:263 versão mutada; `contract-evidence.unit.test.mjs:186` contrato mutado. | V PASS |
| C16 | `presence.cli.test.mjs:284`–292 versão9.9.0 reconhecida/incompatível; `configuration-trust.cli.test.mjs:185`–190 leitura inacessível e demais preservados; `capability-evidence.cli.test.mjs:333`–350 45 not_inspected e zero fixture falsa; inventário fixture/SOs executado. | V PASS; sem macOS observado |
| C17 | `docs-compatibility.test.mjs:14`–17 comando/estados, :32/:40–42 fontes/três níveis; texto das correções relido. Registro documental existe; não neutraliza restrição de shell nativa omitida em C8. | V PASS do registro exigido |
| C18 | `scripts/governance-ci.test.mjs:263`–281 matriz/steps/CI; 6gov+10motor repetidos; cinco arquivos comuns com SHA256 iguais à base. | V PASS |

## Perfil, limitações e preservação

Profile light mantido: **fault injection/mutação de produto não realizada**, sem join formal Coverage/Test policy/visual ui. Swept sem linhas existing e ausência de CONTRIBUTING **carried from 46e7c93**. Entradas sintéticas e leitura de fontes não são mutação de produto nem captura real.

Limitações já declaradas continuam: EACCES por adaptador, política em caminho fixo, timeout de firewall simulado no connect com relógio real, exit1 provado na função usada pela CLI; inacessibilidade CLI via diretório, sem alegar chmod. Zero payload foi conferido por inspeção + status TCP, sem alegar contador inexistente. Uma prova por plataforma simulada não certifica o SO real. Fonte de plugin aceita não implica handler shell aceito: é precisamente o residual reproduzido.

Original antes do relatório: HEAD6d073b69, porcelain vazio. Após salvar, reconferi HEAD `6d073b69351a2884d46bf6056aaf8e6ecb7574b8` e porcelain somente ` M .checks/issue-3-agent-diagnostics.verified.md`. Sem alteração de produto/testes/task/checklist/regras, `.git`, estado/resposta formal, logs do orquestrador, commits, push, PR ou instalação pelo Verifier.

SHA256 de arquivos extraídos dos archives base/head calculado nesta rodada; todas as comparações True. `git diff --exit-code 4242520 -- <cinco arquivos>` retornou0:

| Arquivo scripts/code-review | SHA256 base = HEAD |
| --- | --- |
| cli.mjs | `D69974087A3B43FCCF482E5F5B56C19F96FED60652B8985E7A9C298F061AE61E` |
| review.mjs | `88508699ED5AB33F81BA438E229CD1A5DA3DE71FCD0EFFCFBD162CF7CF0E0CB6` |
| review.test.mjs | `67247DB5701B1F71337D428BF0103B5BFA0435E5EF85C53E5A93D73E5D21D621` |
| schema.json | `A11E040A7061447C1E0D516E31919DA0D2821E012C6C44F27A56634228C6A467` |
| README.md | `5F1998DB4621A09396920C37DC8AA4267C4DEF33F028F9945EF717DB8E8C0064` |

## Gate

**FAIL — 17/18 PASS; C8 bloqueado pelo residual G3**, apesar de **258 PASS, 0 FAIL, 1 skip** na execução independente desta HEAD. Sem aprovação de entrega/revisão formal/PR por este relatório. A autorização específica desta rodada4 não autoriza uma quinta; qualquer verificação adicional depende de nova decisão do proprietário. O Verifier encerra esta rodada sem corrigir o defeito nem iniciar trabalho adicional.
