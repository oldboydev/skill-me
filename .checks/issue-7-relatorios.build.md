# Build da issue #7

Base: `a1f855b` (`origin/main`, merge da #6). Perfil: `light`.
Autorização: pedido explícito do proprietário nesta conversa para puxar a próxima issue e implementar; a issue #7 delega ao agente os detalhes técnicos do escopo já definido.

## Provas executadas

- `node --test "tests/integrations/report/**/*.test.mjs"`: 19 testes, 19 passaram, 0 falharam, 0 skip. Cada `T7-C1` a `T7-C10` foi listado e executado; `T7-C2` cobre comprimento de fence, `T7-C5` cobre comandos compostos, `T7-C6` cobre retry, ordem, sessões distintas e proibição, `T7-C7` prova erro/correção/lacuna e proveniência do nome observado, e `T7-C10` atravessa a fronteira com os seis estados.
- `npm test` após os achados da revisão formal: exit 0. Governança: 6/6. Motor de revisão: 16/16. Doctor: 410 passes, 7 skips condicionais. Integrações: 316 testes, 309 passaram, 7 skips de plataforma/ambiente já declarados pela suíte (casos POSIX no Windows ou criação de symlink sem privilégio); 0 falhas.
- `npm run test:doctor` fora do sandbox de rede: 417 testes, 410 passaram, 7 skips condicionais por SO/ambiente, 0 falhas. A repetição dentro do sandbox deu 2 falhas (`collector-C9` IPv4/IPv6: socket de loopback observado como `unreachable`), 408 passes e 7 skips. Os 8 testes de `collector.cli.test.mjs` passaram fora do sandbox, inclusive os dois casos de loopback; nenhuma mudança no doctor foi feita.
- `git diff --check`: exit 0; avisos de conversão LF/CRLF do Git no Windows, sem erro de whitespace.

A primeira execução do teste de renderização falhou porque o Markdown escapava o marcador `#` de uma citação; a renderização foi corrigida e o mesmo teste passou. A primeira execução dos testes de CLI/E2E falhou ao tentar criar o store no diretório temporário externo ao workspace, proibido pelo sandbox; o scratch foi movido para `.checks/` no workspace e os testes passaram. Nenhuma asserção foi enfraquecida. A suíte completa foi repetida após os ajustes finais e passou integralmente.

O Verifier independente encontrou três lacunas: o avaliador ignorava o segundo comando de uma instrução, uma condição verdadeira podia desaparecer após retry positivo, e a prova ponta a ponta não exercitava `contradicted`. As duas regressões de avaliação foram executadas contra o código anterior e falharam nos estados incorretos `sufficient` e `not_applicable` (5 passes, 2 falhas no lote red). O avaliador agora exige prova de todos os comandos e considera a condição verdadeira observada, exigindo ação posterior na mesma sessão. A fixture ponta a ponta inclui falha terminal. O lote green completo teve 16/16 passes.

A primeira revisão Codex isolada do commit `d031673` retornou `changes_requested` com três achados bloqueantes: fence de quatro crases fechado por três, proibição condicional declarada suficiente após a ação proibida, e nome observado sem fonte na linha Skill. Acrescentei uma regressão para cada cenário e executei o lote red: 11 passes, 3 falhas nos resultados incorretos. O parser agora exige fechamento com mesmo marcador e comprimento suficiente; proibições de comando permanecem inconclusivas, com eventos citados, em vez de virar ação exigida; o relatório inclui sequências e força do vínculo do nome observado. O lote green específico teve 19/19 passes, sem skip.

## Decisões e limites

- A consulta consome somente o snapshot do store da #8, a correlação da #6 e texto de skill explicitamente escolhido ou candidato único local. Não relê payload nativo, não escreve artefato e não inicia agentes.
- A comparação de comandos é literal sobre conteúdo previamente sanitizado. Captura sem `--content`, ausência de comando literal ou condição sem resultado ficam sem conclusão de execução. O relatório descreve o resultado observado da ferramenta, não certifica que o agente seguiu a skill inteira.
- O código de saída de ID de captura **malformado** é 2, conforme `privacy timeline`; estado persistido inválido é 3. A redação inicial do plano agrupava ambos como 3 e foi corrigida para manter o contrato existente. A prova C9 cobre ambos.
- Um comando repetido em sessões distintas não é tratado como correção nem como condição falsa por ordem global; recebe avaliação parcial/inconclusiva com as sequências observadas.
- Uma instrução com vários comandos literais só é suficiente quando todos são comprovados; uma falha em qualquer deles contradiz a instrução. A condição avalia todas as tentativas nativas do gatilho na mesma sessão e só considera ação posterior ao último gatilho verdadeiro.

## Fora do escopo observado

- A leitura conservadora só classifica itens de lista; prosa e Markdown arbitrário permanecem sem interpretação automática. Não há LLM, dashboard, `step` ou percentual de cumprimento.
