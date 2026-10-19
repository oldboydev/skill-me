# Issue #6 — verificação independente da timeline

**Veredito: PASS — C1–C14 (14/14).** Perfil `light`; quarta rodada autorizada pelo proprietário nesta conversa em 19/10/2026, após três rodadas com achados corrigidos. Verifier independente do autor Claude. Diff de `cc74be7952e28bc6427450beb88e1adb0907df5e` a `a1365b9ab8a0e1d331646a1986c535fc8a8c659b`.

O Verifier leu a [issue #6](https://github.com/oldboydev/skill-me/issues/6), seus sete critérios de aceite, `AGENTS.md`, o plano, a checklist, o registro do build e o diff. Os sete critérios estão cobertos por C1–C14, sem contradição encontrada. `CONTRIBUTING.md` não existe neste checkout. A árvore estava limpa; `git diff --check` saiu 0. `package.json` continua `private: true`, e o core vendorizado de revisão não mudou.

## Provas no HEAD

O Verifier executou, em uma chamada, `node --test "tests/integrations/correlation/*.test.mjs"`: **55 testes, 55 pass, 0 fail, 0 skip**. Desses, 53 são provas C1–C14 e dois cobrem o guia. Conferiu a execução e as asserções de cada check:

| Check | Testes | Asserção decisiva no HEAD | Resultado |
| --- | ---: | --- | --- |
| C1 | 2 | `timeline.unit.test.mjs:21,31,36` — sequência `[1,2,3]`, evidência por registro e listas vazias | PASS |
| C2 | 7 | `timeline.unit.test.mjs:271–279,302–310,331–338` — chaves públicas distintas entre sessões, pares da mesma sessão alinhados e `itemId` do exec heurístico | PASS |
| C3 | 3 | `timeline.unit.test.mjs:112,127–135,147–149` — ausência de ID inconclusiva ou heurística com sequências | PASS |
| C4 | 4 | `timeline.unit.test.mjs:208–211,220` — duplicata aponta à primeira entrada e não cria operação | PASS |
| C5 | 2 | `timeline.unit.test.mjs:233–256` — instante regressivo marcado e retomada segmentada | PASS |
| C6 | 5 | `operations.unit.test.mjs:22–23,39–44,60–68,101–105,125` — chamadas paralelas, órfãs, escopos e ambiguidade do exec | PASS |
| C7 | 3 | `operations.unit.test.mjs:156–161,173–184,190–192` — duração nativa ou derivada; cálculo inválido ausente | PASS |
| C8 | 2 | `skills.unit.test.mjs:32–39,45–50` — invocação nativa e conclusão das instruções `unobserved` | PASS |
| C9 | 2 | `skills.unit.test.mjs:63–72,84–87` — expansão/ciclo heurísticos; leitura de `SKILL.md` não cria invocação | PASS |
| C10 | 9 | `subagents.unit.test.mjs:31–34,54–57,110–116,168–172,189–194` — relação pai-filho, isolamento por sessão e pais conflitantes | PASS |
| C11 | 2 | `skills.unit.test.mjs:102–103,121–129` — fronteiras deixam skill `open` ou `boundary_only`, sem `skill_completed` | PASS |
| C12 | 6 | `timeline.cli.test.mjs:46–56,92–93,104–107,157–159` — consulta sem alteração, JSON e códigos 2/3/4/5 | PASS |
| C13 | 5 | `coverage.unit.test.mjs:20–25,42–52,63–64,68–91` — contadores, lacunas, totais exatos e `partial` sem percentual | PASS |
| C14 | 1 | `timeline.e2e.test.mjs:68–80,83–107` — CLI e API idênticas sobre fixtures rotuladas | PASS |

Em execução separada pelo coordenador no mesmo commit, `npm test` saiu 0: governança **6/6**, code review **16/16** e integrações **288 testes: 281 pass, 0 fail, 7 skips de plataforma**. Reexecutei `test:doctor` para capturar seu resumo: **417 testes, 410 pass, 0 fail, 7 skips** de FIFO/links POSIX no Windows. Os skips de integrações são os casos POSIX/ACL preexistentes listados em `.checks/issue-6-correlacao.build.md`; nenhum teste da #6 foi pulado. O Verifier não atribuiu a si esses comandos.

## Histórico e limites

As três rodadas anteriores apontaram vínculos entre subagentes de sessões diferentes, chaves públicas de subagente sem escopo, pais Hermes contraditórios e chaves públicas de turno/chamada sem escopo. Os commits `2c22d3f`, `9315253`, `5da7b1a` e `a1365b9` corrigiram os casos com regressões. A quarta rodada julgou o HEAD final completo.

O `turn_end` de Claude em C11 é sintético, pois o adaptador não o emite. O código 5 de E/S em C12 foi injetado em `runPrivacyCommand`, sem processo CLI. `timeout` e ação manual não têm evento próprio no envelope v1; a prova cobre as fronteiras observáveis. O fluxo C14 usa fixtures, sem execução de agente ou modelo real.

Um início Hermes com `subagentId` e `childSessionId` expõe a chave do primeiro em `entries.identity.subagent`, enquanto o fim e a operação usam a do segundo. Ambos os IDs permanecem em `entries.ids`; a operação usa o `childSessionId` explícito, cita início/fim em `evidence` e só atribui ferramentas da sessão filha. O Verifier registrou isso como alias observado, sem quebra demonstrada de C2/C10.
