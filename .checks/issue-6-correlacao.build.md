# Issue #6 — timeline de execução: registro do build

Profile `light`. Builder: Claude, na branch `codex/issue-6-correlacao`, a partir do plano
`f0f0fc6` (`.tasks/issue-6-correlacao.md`, `.checks/issue-6-correlacao.md`; critérios
inalterados). Sem push, PR, merge, deploy, instalação em configuração pessoal ou
execução de agente/modelo real: todas as provas usam fixtures sintéticas e diretórios
temporários próprios. Verifier e revisão Codex ficam com o orquestrador. Core de revisão
vendorizado intocado.

## Commits

| Commit | Conteúdo |
| --- | --- |
| `760a0e5` | `correlateTrace` e módulos puros (S1 + S2 + `coverage`) com as provas C1–C11 e C13 |
| `7a7756b` | `privacy timeline`, ajuda da CLI e as provas C12 e C14 |
| `0d8237e` | guia `docs/traces.md` (seção "Timeline e cobertura") e `docs/agent-observation.md` |
| `27b8ae6` | prova do guia (`docs.test.mjs`) e este registro |
| `2c22d3f` | correção do P1 do Verifier: subagente de hook não pareia entre sessões |
| `9315253` | correção dos achados de C2 (chave pública do subagente) e C10 (pais divergentes) |
| commit seguinte | `parentSession` do par subagente lido também do fim quando só ele nomeia o pai |

## Decisões de implementação

Nenhuma altera os critérios nem as duas portas de mão única do plano (timeline v1; força
do vínculo `native`/`heuristic`/`inconclusive`).

- **Módulos.** `identity.mjs` (chaves por captura/agente/mecanismo), `calls.mjs` (pareamento
  início/resultado, único para ferramenta, skill e subagente), `operations.mjs`, `skills.mjs`,
  `subagents.mjs`, `coverage.mjs` e `timeline.mjs` (coordena). O comando só chama
  `replayCapture` com `correlateTrace`: não há caminho alternativo para o store.
- **Entrada.** Além dos campos do critério 1: `identity`, `session {key, strength, evidence}`,
  `segment`, `duplicateOf`, `outOfOrder`.
- **Identidade nativa completa (C4).** ID de sessão mais o ID do escopo do evento (chamada,
  turno ou subagente). Itens do `codex exec` (só `itemId`) e expansões diretas nunca são
  deduplicados.
- **Candidato `heuristic` (C3).** Só quando a mesma origem identificou exatamente uma sessão;
  `session_start` sem ID nunca é candidato. Com duas ou mais, ou nenhuma, `inconclusive`.
- **Pareamento (C6).** Turno ou subagente só impedem o par quando os dois lados os trazem e
  diferem. Sem sessão ou sem ID de chamada, cada metade vira operação `inconclusive`.
- **Itens do Codex exec.** `itemId` forma operação `heuristic`; colisão (mais de uma sessão na
  origem, fase repetida, fora de ordem, tipos diferentes, fase desconhecida) vira operação
  `ambiguous`/`inconclusive` com o motivo em `ambiguity`.
- **Estados.** `closed`, `open`, `orphan_result`, `ambiguous`, `boundary_only` (só skill).
  `instructionCompletion: "unobserved"` em toda invocação de skill; nunca `skill_completed`.
- **Cobertura.** `partial` não considera duplicata, instante regressivo nem conteúdo omitido por
  política; considera `boundary_only` como operação ainda aberta. Como o contrato v1 declara lacunas
  em quase todo evento, quase toda captura real é `partial: true` (dito no guia).
- **Teste corrigido (não é enfraquecimento).** A prova "sem percentual" de C13 usava um regex que
  casava `ratio` dentro de `inconclusiveOperations`; passou a comparar palavras inteiras
  (`percent`, `pct`, `ratio`, `rate`, `score`, `compliance`, `conformidade`, `cumprimento`) e continua
  exigindo contagens inteiras.

## Alterações em testes e documentos existentes

Nenhum teste existente foi alterado. `docs/traces.md` e `docs/agent-observation.md` deixaram de dizer
que correlação e timeline "ficam para a #6"; os testes `T8-C20` e `I4-C44c` continuam verdes.

## Limitação da prova sintética de C11

O adaptador do Claude não emite `turn_end` (não há mapeamento de `Stop`). A prova do limite por
`turn_end` em C11 (`T6-C11 scope boundaries: session_end, turn_end e subagent_stop…`) usa por isso
um registro `turn_end` **sintético** do Claude, construído no teste: ela exercita a regra pura da
correlação (turno da skill igual ao do fim ⇒ `boundary_only`), não um evento real. `session_end` e
`subagent_stop` do Claude são eventos que o adaptador realmente emite. O mesmo vale para
`process_exit`: no Claude e no Hermes ele não existe; só o wrapper do Codex o produz, e o Codex não
tem evento de skill. Nenhum evento real de turno do Claude foi observado para esta prova.

## Limitação da prova de E/S de C12

O código 5 (falha de E/S) é provado em processo, por `runPrivacyCommand` com um `io` cujo
`readBounded` lança EIO, porque a pré-carga de falha de E/S do CLI (`fs-probe`) só injeta falha em
`rename` (escrita) e este comando só lê. O formato do envelope e a recusa de eco são provados; a
tradução do código em saída do processo é a mesma já provada para os demais comandos `privacy`.

## Correção do achado P1 do Verifier (subagente entre sessões)

**Defeito.** O pareamento de subagente usava só o texto do `agentId` (chave sem sessão): `subagent_start`
em `s1` e `subagent_stop` em `s2` com o mesmo `agentId` viravam um subagente `native` `closed`, e as
ferramentas de `s2` com esse `agentId` eram atribuídas ao subagente de `s1`. Isso contraria C2 (mesmo texto
de ID em sessões distintas não cria vínculo) e C10 (as ferramentas ficam na sessão do filho).

**Reprodução (RED no HEAD `27b8ae6`).** Os três testes novos de `subagents.unit.test.mjs` falharam
(`pass 4, fail 3` na suíte do arquivo): start(s1,A) + tool pre/post(s2,A) + stop(s2,A); o mesmo agentId em
duas sessões completas; e `agentId` sem sessão.

**Correção (`subagents.mjs`).** A chave de pareamento passa a ser:
- `childSessionId` (Hermes): vale sozinha. Pai e filho são sessões diferentes por definição, então a sessão
  do início e a do fim não precisam coincidir; a identidade é a sessão filha, única na captura e na origem.
- `agentId`/`subagentId` (hooks): `[subagente, sessão]`. Sem ID de sessão não há par e cada metade fica
  `inconclusive`.
Na atribuição, o subagente com sessão filha leva as ferramentas dessa sessão; o dos hooks leva as do mesmo
`agentId` **na mesma sessão** em que foi nomeado (`op.session === sub.parentSession`). O campo público
`subagent` e `identity.subagent` não mudaram.

**Resultado do cenário.** start(s1,A) fica `native open`; stop(s2,A) fica `native orphan_result`; nenhuma
operação cruza sessões; a ferramenta de s2 é atribuída ao subagente órfão de s2 (mesma sessão e `agentId`) e
não ao de s1.

**Hermes (avaliação).** O teste existente de pai ≠ filho continua verde, e um novo prova `parentSession ≠
childSession` pareando por `childSessionId` com a ferramenta da sessão filha atribuída. Não se exige que
`parentSessionId` do início e do fim coincidam: um mesmo `childSessionId` com pais diferentes seria
contraditório e não é tratado. Isso é uma limitação declarada, sem prova.

**Provas (no momento desta correção, `2c22d3f`; os totais finais estão em "Execuções").** `Proof:` de C10: 7 tests, 7 pass, 0 fail, 0 skipped. `tests/integrations/correlation/*.test.mjs`:
48 tests, 48 pass. `npm run test:integrations`: 281 tests, 274 pass, 0 fail, 0 cancelled, 7 skipped (os mesmos
7 skips de plataforma já listados). Mutação: remover `op.session === sub.parentSession` da atribuição faz
2 dos novos testes falharem. Sem push, PR, merge ou revisão formal.

## Correção dos achados de C2 e C10 do Verifier (identidade pública e pais divergentes)

**C2.** `identity.subagent` e `operations[].subagent` usavam o texto do `agentId` sem sessão: `subagent_start(s1,A)`,
`subagent_start(s2,A)` e `tool_pre(s2,k2,A)` davam a mesma chave pública. Agora `agentId`/`subagentId` só geram chave
junto com o escopo que os nomeia — `sessionId`/`threadId` do evento ou, no Hermes, `parentSessionId` (`identity.mjs`,
`agentKeyOf`; o escopo entra na chave com o comprimento, sem ambiguidade de separador). Sem escopo a chave é `null` e o
subagente fica `inconclusive`: texto compartilhado nunca é vínculo forte. `childSessionId` continua sendo identidade por si
(`childKeyOf`). A operação de ferramenta e o subagente da mesma sessão têm a mesma chave; a de outra sessão, outra.

**C10.** `subagent_start(parent p1, child c)` e `subagent_stop(parent p2, child c)` pareavam `native closed` com pai p1,
escondendo a contradição. O pareamento agora exige `parentSessionId` igual quando os **dois** lados o trazem; divergindo,
saem `open` (evidência [1]) e `orphan_result` (evidência [3] no teste, que intercala uma ferramenta). Uma sessão filha
reivindicada por pais em conflito não atribui suas ferramentas a nenhum dos subagentes. Mesmo pai pareia e atribui as
ferramentas da sessão filha. Se um lado não traz o pai, a ausência não prova divergência e o par se forma, o mesmo
critério de C6 para turno e subagente; essa é uma escolha conservadora declarada.

**Correção posterior (`parentSession` do par).** A frase anterior desta seção dizia que o pai exposto vinha do início ou do
fim, mas o código só lia o início: com `subagent_start` sem `parentSessionId` e `subagent_stop` com p2, o par saía
`native closed` com `parentSession: null`. Agora `parentSession` vem do início, ou do fim quando só ele nomeia o pai, e nos
hooks cai no ID de sessão do evento; sem pai em nenhum lado continua `null` (nada é inventado). RED no HEAD `9315253`
(`T6-C10`: obtido `null`, esperada a chave de p2); GREEN: C10 9/9, correlação 52/52, `npm run test:integrations` 285 tests, 278
pass, 0 fail, 7 skipped (totais inalterados: o teste existente ganhou asserções, não casos). Mutação (ler o pai só do início)
falha em C10. Pais em conflito seguem separados (`open` com o pai do início, `orphan_result` com o do fim) e o mesmo pai
segue pareando.

**RED no HEAD `2c22d3f`:** 3 falhas (2 de C2, 1 de C10); o teste de pais coincidentes/ausentes já passava e serve de
controle. **GREEN:** C2 4/4, C10 9/9, correlação 52/52, `npm run test:integrations` 285 tests, 278 pass, 0 fail, 7 skipped.
Limitações: o comportamento com pai ausente de um lado e a atribuição de ferramentas de uma sessão filha contestada são
decisões de projeto, provadas só por fixtures sintéticas; `parentSessionId` não é validado contra eventos do pai.

## Provas por check

| Check | Teste(s) | Arquivo | Resultado |
| --- | --- | --- | --- |
| C1 | `T6-C1` (2) | `timeline.unit.test.mjs` | 2 pass |
| C2 | `T6-C2` (4) | idem | 4 pass |
| C3 | `T6-C3` (3) | idem | 3 pass |
| C4 | `T6-C4` (4) | idem | 4 pass |
| C5 | `T6-C5` (2) | idem | 2 pass |
| C6 | `T6-C6` (5) | `operations.unit.test.mjs` | 5 pass |
| C7 | `T6-C7` (3) | idem | 3 pass |
| C8 | `T6-C8` (2) | `skills.unit.test.mjs` | 2 pass |
| C9 | `T6-C9` (2) | idem | 2 pass |
| C10 | `T6-C10` (9) | `subagents.unit.test.mjs` | 9 pass |
| C11 | `T6-C11` (2) | `skills.unit.test.mjs` | 2 pass |
| C12 | `T6-C12` (6) | `timeline.cli.test.mjs` | 6 pass |
| C13 | `T6-C13` (5) | `coverage.unit.test.mjs` | 5 pass |
| C14 | `T6-C14` (1) | `timeline.e2e.test.mjs` | 1 pass |
| guia | `T6-docs` (2) | `docs.test.mjs` | 2 pass |

Cada comando `Proof:` de `.checks/issue-6-correlacao.md` (C1–C14), executado como escrito, saiu
com exit 0 e `fail 0`, `skipped 0`; a soma é 50 testes nomeados (C2 tem 4 e C10 tem 9 depois das correções do Verifier), mais 2 do guia = 52 em
`tests/integrations/correlation/`. As provas de decisão ficam no consumidor puro; a fronteira
é provada pelo CLI real (C12) e pelo fluxo de fixtures (C14), que compara a API com a resposta
do CLI (mesmos registros, ordem, vínculos e cobertura) e identifica cada passo como fixture ou
comando do usuário, sem afirmar execução de modelo real.

## Mutações

Cada mutação foi aplicada ao produto, a prova correspondente rodou e o arquivo foi restaurado
(`git checkout` ou cópia); a árvore ficou sem diferenças.

| Mutação | Prova | Resultado |
| --- | --- | --- |
| chave de identidade sem o mecanismo | C2 | falhou |
| pareamento sem a sessão | C6 | falhou |
| expansão direta ignorada | C9 | falhou |
| `session_end` de qualquer sessão fecha a skill | C11 | falhou |
| `post` afirma conclusão das instruções | C8 | falhou |
| duplicata gera operação | C4 | falhou |
| duração calculada com resultado anterior ao início | C7 | falhou |
| `partial` ignora registros descartados | C13 | falhou |
| `eventGaps` vazio | C13 | 2 falhas |
| resposta do CLI diverge da API | C14 | falhou |
| `timeline` aceita flag extra | C12 | falhou |
| `agentId` sem a sessão na chave pública | C2 | falhou |
| pais divergentes pareiam | C10 | falhou |
| sessão filha com pais em conflito atribuída | C10 | falhou |
| controle: `agentType` acrescentado à lista de ID (sem efeito) | C10 | passou (esperado) |

## Execuções

| Plataforma | Comando | Resultado |
| --- | --- | --- |
| Windows 11 (local) | `node --test "tests/integrations/correlation/*.test.mjs"` (final) | 52 tests, 52 pass, 0 fail, 0 skipped |
| Windows 11 (local) | `npm run test:integrations`, 1ª execução (antes deste registro existir) | 278 tests, 270 pass, 1 fail, 0 cancelled, 7 skipped; a falha era `T6-docs … build.md`, que exige este arquivo |
| Windows 11 (local) | `npm run test:integrations`, entrega inicial `27b8ae6` | 278 tests, 271 pass, 0 fail, 0 cancelled, 7 skipped (exit 0) |
| Windows 11 (local) | `npm run test:integrations`, após o P1 (`2c22d3f`) | 281 tests, 274 pass, 0 fail, 0 cancelled, 7 skipped |
| Windows 11 (local) | `npm run test:integrations`, **execução final** | 285 tests, 278 pass, 0 fail, 0 cancelled, 7 skipped |
| Windows 11 (local, em `27b8ae6`; não reexecutado depois: as correções só tocam `src/integrations/correlation/` e seus testes) | `npm run test:governance` | 6 tests, 6 pass, 0 fail |
| idem | `npm run test:code-review` | 16 tests, 16 pass, 0 fail, 0 skipped |
| idem | `npm run test:doctor` | 417 tests, 410 pass, 0 fail, 0 cancelled, 7 skipped (FIFO e links POSIX: `agent-resolution-formal5-2`, `agent-resolution-C2`, `fifo-config-formal8-4` ×2, `fs-adapter-formal8-4` ×3; já existentes, nenhum da #6) |

Skips de `test:integrations`, todos já existentes e de plataforma, nenhum da #6: `I4-C15` e
`T8-C4` (sinal POSIX), `I4-C25b` (modo POSIX), `I4-C25j`, `I4-C25k`, `I4-C25l` (ACL POSIX, Linux) e
`I4-C25m` (ACL do macOS). WSL, Linux nativo e macOS não foram executados nesta entrega; a CI do PR
cobre as demais plataformas. Nenhuma falha, omissão ou skip foi introduzido pela #6.

## Pendências

- Verificação independente (Verifier) e revisão Codex local: com o orquestrador.
- E2E real com agentes e modelos: não autorizado nesta entrega.
