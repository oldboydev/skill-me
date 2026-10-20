# Build da issue #7

Base: `a1f855b` (`origin/main`, merge da #6). Perfil: `light`.
Autorização: pedido explícito do proprietário nesta conversa para puxar a próxima issue e implementar; a issue #7 delega ao agente os detalhes técnicos do escopo já definido.

## Provas executadas

- `node --test "tests/integrations/report/**/*.test.mjs"`: 22 testes, 22 passaram, 0 falharam, 0 skip. Cada `T7-C1` a `T7-C10` foi listado e executado; `T7-C1` cobre nome Unicode na regra e na captura real; `T7-C2` cobre comprimento de fence; `T7-C5` cobre comandos compostos; `T7-C6` cobre retry, ordem, sessões distintas, proibição e sobreposição; `T7-C7` prova erro/correção/lacuna e proveniência do nome observado; `T7-C10` atravessa a fronteira com os seis estados.
- `npm test` após os achados da segunda revisão formal: exit 0. Governança: 6/6. Motor de revisão: 16/16. Doctor: 410 passes, 7 skips condicionais. Integrações: 319 testes, 312 passaram, 7 skips de plataforma/ambiente já declarados pela suíte (casos POSIX no Windows ou criação de symlink sem privilégio); 0 falhas.
- `npm run test:doctor` fora do sandbox de rede: 417 testes, 410 passaram, 7 skips condicionais por SO/ambiente, 0 falhas. A repetição dentro do sandbox deu 2 falhas (`collector-C9` IPv4/IPv6: socket de loopback observado como `unreachable`), 408 passes e 7 skips. Os 8 testes de `collector.cli.test.mjs` passaram fora do sandbox, inclusive os dois casos de loopback; nenhuma mudança no doctor foi feita.
- `git diff --check`: exit 0; avisos de conversão LF/CRLF do Git no Windows, sem erro de whitespace.

A primeira execução do teste de renderização falhou porque o Markdown escapava o marcador `#` de uma citação; a renderização foi corrigida e o mesmo teste passou. A primeira execução dos testes de CLI/E2E falhou ao tentar criar o store no diretório temporário externo ao workspace, proibido pelo sandbox; o scratch foi movido para `.checks/` no workspace e os testes passaram. Nenhuma asserção foi enfraquecida. A suíte completa foi repetida após os ajustes finais e passou integralmente.

O Verifier independente encontrou três lacunas: o avaliador ignorava o segundo comando de uma instrução, uma condição verdadeira podia desaparecer após retry positivo, e a prova ponta a ponta não exercitava `contradicted`. As duas regressões de avaliação foram executadas contra o código anterior e falharam nos estados incorretos `sufficient` e `not_applicable` (5 passes, 2 falhas no lote red). O avaliador agora exige prova de todos os comandos e considera a condição verdadeira observada, exigindo ação posterior na mesma sessão. A fixture ponta a ponta inclui falha terminal. O lote green completo teve 16/16 passes.

A primeira revisão Codex isolada do commit `d031673` retornou `changes_requested` com três achados bloqueantes: fence de quatro crases fechado por três, proibição condicional declarada suficiente após a ação proibida, e nome observado sem fonte na linha Skill. Acrescentei uma regressão para cada cenário e executei o lote red: 11 passes, 3 falhas nos resultados incorretos. O parser agora exige fechamento com mesmo marcador e comprimento suficiente; proibições de comando permanecem inconclusivas, com eventos citados, em vez de virar ação exigida; o relatório inclui sequências e força do vínculo do nome observado. O lote green específico teve 19/19 passes, sem skip.

A segunda revisão Codex isolada do commit `1bca839` confirmou a correção dos três achados anteriores, mas retornou `changes_requested` por dois novos casos: nome Unicode `revisão` rejeitado no modo automático e tentativas simultâneas apresentadas como correção. O lote red executou 13 testes, com 11 passes e 2 falhas nesses cenários. A resolução agora aceita componentes Unicode sem aceitar travessia, separadores, nomes de dispositivo ou caracteres perigosos de caminho; um teste percorre captura e comando sem `--skill`. Tentativas sobrepostas do mesmo comando ficam `partial` sem `corrections`; a correção sequencial positiva continua coberta. O lote green específico passou com 22/22 testes.

As duas tentativas formais do perfil `light` foram usadas; a verificação independente teve três rodadas até `3bb71cf`. O arquivo `.verified.md` e o resultado formal ainda não aprovam o conteúdo posterior a `1bca839`. O proprietário autorizou em 20/10/2026 uma quarta verificação independente, a terceira revisão formal e o merge após os gates ([registro na issue #7](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6289269096)). O override exclusivo da #7 eleva o teto formal a 3 e preserva o histórico; a nova verificação e revisão ainda precisam executar sobre o HEAD atualizado.

Após registrar o override, `npm run test:governance` passou 6/6 fora do sandbox e `npm run test:code-review` passou 16/16. A execução inicial de governança dentro do sandbox falhou ao criar o repositório Git temporário (`Permission denied` no Temp isolado); a repetição fora dele executou o mesmo teste e passou. O JSON da configuração foi lido pelo runner de revisão sem erro.

## Decisões e limites

- A consulta consome somente o snapshot do store da #8, a correlação da #6 e texto de skill explicitamente escolhido ou candidato único local. Não relê payload nativo, não escreve artefato e não inicia agentes.
- A comparação de comandos é literal sobre conteúdo previamente sanitizado. Captura sem `--content`, ausência de comando literal ou condição sem resultado ficam sem conclusão de execução. O relatório descreve o resultado observado da ferramenta, não certifica que o agente seguiu a skill inteira.
- O código de saída de ID de captura **malformado** é 2, conforme `privacy timeline`; estado persistido inválido é 3. A redação inicial do plano agrupava ambos como 3 e foi corrigida para manter o contrato existente. A prova C9 cobre ambos.
- Um comando repetido em sessões distintas não é tratado como correção nem como condição falsa por ordem global; recebe avaliação parcial/inconclusiva com as sequências observadas.
- Uma instrução com vários comandos literais só é suficiente quando todos são comprovados; uma falha em qualquer deles contradiz a instrução. A condição avalia todas as tentativas nativas do gatilho na mesma sessão e só considera ação posterior ao último gatilho verdadeiro.

## Fora do escopo observado

- A leitura conservadora só classifica itens de lista; prosa e Markdown arbitrário permanecem sem interpretação automática. Não há LLM, dashboard, `step` ou percentual de cumprimento.
