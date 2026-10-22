# Instruções do skill-me

## Regras próprias do skill-me

- O primeiro código de produto autorizado é o diagnóstico local `doctor` (issue #3).
  Não invente domínio, framework ou deploy para entregas que não os definem.
- package.json contém a CLI de diagnóstico e ferramentas de governança; permanece privado,
  sem autorização para publicação.
- Novas regras de domínio e verificações específicas serão definidas com o trabalho aprovado.

## Boas práticas de desenvolvimento

Estas regras valem para o código e as ferramentas que forem aprovados neste repositório.
Não definem uma arquitetura, um framework ou um produto antes de existir essa necessidade.

### Responsabilidades e limites dos módulos

- Cada função ou método tem uma responsabilidade clara e um nome que a expressa.
  Misturar busca de dados, decisões e apresentação, usar um booleano para alternar tarefas
  distintas ou precisar montar o sistema inteiro para testar uma regra são sinais para
  revisar a separação. Quantidade de linhas, sozinha, não determina essa separação.
- Uma função que coordena passos pode permanecer linear; delegue as decisões e os efeitos
  a peças com contratos claros, sem fragmentar cada linha em uma função.
- Quando houver regras de domínio, mantenha uma fonte de verdade para elas. Apresentação
  e integrações consomem os resultados; não reimplementam a regra para chegar ao mesmo número.
- Separe decisões puras de efeitos externos quando isso permitir testar a regra diretamente.
  Respeite as fronteiras e interfaces públicas dos módulos que existirem; uma necessidade
  nova não autoriza acessar detalhes internos ou inventar pacotes antes de haver consumidores.

### Comentários que preservam decisões

- Use nomes e estrutura para explicar o que o código faz. Evite comentários que apenas
  repetem a instrução, o nome da função ou acrescentam separadores decorativos.
- Registre o porquê que o código não consegue expressar: uma restrição, uma alternativa
  descartada, uma armadilha conhecida ou uma consequência não óbvia. Preserve esse contexto
  mesmo quando o trecho de código for simples.
- Explicações extensas ficam na documentação ou no registro da decisão, com referência
  no código quando necessária. Mantenha a explicação coerente ao alterar o comportamento.

### Reúso e solução mínima

- Antes de criar uma função, módulo ou ferramenta, procure uma solução existente no
  repositório. Reutilize um contrato compatível; não copie uma implementação em silêncio.
- Generalize apenas o que consumidores reais precisam. Uma abstração deve resolver uma
  necessidade demonstrada; não crie extensões, camadas ou dependências para usos hipotéticos.
- Quando houver duplicação relevante, consolide dentro do escopo autorizado ou registre
  a dívida e sua justificativa na entrega. Uma regra de reúso não autoriza uma refatoração
  fora do escopo aprovado.
- Prefira a menor solução que atende aos critérios e permanece compreensível. Não reduza
  a análise do problema nem remova validação em fronteiras de confiança, segurança,
  integridade dos dados ou precisão para encurtar o código.
- Otimizações exigem medida do comportamento real antes e depois em condições comparáveis.
  Cache, paralelismo e novas dependências precisam de uma necessidade demonstrada;
  não invente metas de desempenho ou infraestrutura que o trabalho não definiu.

### Testes orientados ao comportamento

- Derive os casos dos critérios de aceite, dos contratos e dos cenários de falha, antes
  de usar a implementação como referência. Um teste deve distinguir o comportamento
  correto de um erro plausível; reproduzir a lógica do código no teste não prova a regra.
- Mudanças de comportamento incluem suas provas na mesma entrega. Teste decisões na
  própria camada e cubra cada caso relevante da tabela de decisão, incluindo limites,
  entradas inválidas e transições de estado quando fizerem parte do contrato.
- Quando a alteração afetar uma fronteira externa, prove também o contrato nessa
  fronteira. Um teste que atravessa uma regra não substitui as asserções sobre suas decisões.
  Para uma ferramenta que fiscaliza uma regra, prove que detecta um caso inválido e aceita
  um caso válido. Encaminhamento sem decisão pode ser provado pelo teste do consumidor.
- Em correções de defeitos, demonstre que o caso de regressão falha no comportamento
  anterior e passa com a correção, quando for viável; declare qualquer limitação dessa prova.
- Confira que os testes selecionados realmente executaram e quais casos afirmaram.
  Código de saída zero com nenhum teste executado não comprova sucesso. Informe falhas,
  omissões e skips com os motivos; não pule casos apenas para concluir a entrega.
- Não enfraqueça asserções, tolerâncias ou critérios para obter verde. Se o teste estiver
  errado, justifique sua correção. Valores exatos e limites definidos pelo contrato exigem
  asserções correspondentes, não apenas verificações genéricas de presença ou valor positivo.
- Execute as verificações afetadas pela mudança e amplie quando houver risco ou falha
  que justifique. Documentação pura e encaminhamento sem comportamento novo não exigem
  testes artificiais; preserve os checks e o rigor aplicáveis à entrega.

## Governança GitHub

- Issue contém problema, resultado, critérios em lista e aprovações. Plano técnico fica
  em `.tasks/issue-N-<assunto>.md`; evidências em `.checks/`; resumo no PR.
- Use o [Project existente](https://github.com/users/oldboydev/projects/3): Backlog,
  Planning, Ready, In Progress, In Review, Done. Não duplique campos ou Project.
- Planeje mudanças funcionais antes de implementar; aprovação explícita do proprietário
  autoriza escopo e decisões bloqueantes. Pedido explícito para executar escopo já decidido
  vale como autorização. Criação de arquivo não é aprovação.
- Uma branch e um PR por entrega; plano e implementação ficam na mesma branch. Sub-issues
  apenas para entregas independentes e depois de autorização. Não abra PR só para o plano.
- Documentação pura pode usar raia `direct`, com checks aplicáveis e sem task/Verifier.
  Mudança de comportamento usa `light` com task e verificação independente; interface com
  fonte vinculante usa `ui` e compara a fonte. Não rebaixe o rigor para obter aprovação.
- Publique um handoff curto na issue quando Planning exigir decisão; não copie o plano.
- Achados fora do escopo são comunicados e registrados na entrega; não autorizam novas
  issues ou correções. Segurança, perda de dados e quebra de isolamento são comunicadas imediatamente.
- Não faça push direto na main, merge, deploy ou publicação automática. Push de branch/PR
  segue o escopo autorizado; merge e novas decisões continuam com o proprietário.
- Use Conventional Commits: `tipo(escopo): descrição`, com escopo opcional e descrição clara.
- Ready exige aprovação do plano; In Review corresponde ao PR; Done exige merge e encerramento.

## Code Review Rules

- Grok ou Claude implementam, executam as provas e corrigem achados. Codex local é o revisor
  em processo novo, cópia isolada e sandbox somente leitura; ele não implementa correções.
- Ao concluir a entrega, execute automaticamente o fluxo de `scripts/code-review/README.md`,
  sem aguardar novo pedido de revisão: commit limpo, contexto da issue e evidências exigidas,
  `npm run review:run -- --issue N --profile PERFIL`.
- Compare intenção e cada critério da issue com plano, diff e provas; leia CONTRIBUTING e
  regras aplicáveis. Aponte defeito concreto com cenário, esperado, atual, impacto e localização.
- Uma revisão aprovada encerra a etapa. Só correção necessária ou contexto alterado demanda
  nova versão revisada. Mesma identidade reutiliza resultado; não rode para acumular aprovações.
- Perfis light/ui/direct têm teto de duas tentativas, não duas rodadas obrigatórias. light/ui
  exigem task e `.verified.md`; direct dispensa esses artefatos, mas preserva checks aplicáveis.
- Falha, bloqueio, omissão de critério ou contexto desatualizado impede entrega. Trate defeitos
  dentro do escopo e teste a correção. Notas não viram refatoração cosmética ou rodada obrigatória.
- Limite atingido exige decisão do proprietário. Nunca apague histórico nem aumente o teto
  silenciosamente; exceção exige autorização humana específica e registro por issue.
- Não afirme teste que só leu, nem enfraqueça testes para aprovar. O Codex complementa as
  verificações do projeto e do Verifier; processo concluído não significa revisão aprovada.
- Com ready, faça o push autorizado e use `npm run pr:create -- --issue N --profile PERFIL
--title "tipo: descrição" --body-file caminho.md`, incluindo Closes/Refs e evidências.
  Não contorne o comando de entrega. Alteração posterior exige revisão válida para o novo conteúdo.
- O motor não impede outros clientes GitHub nem forma transação atômica com o servidor;
  confira novamente fontes alteradas. CI é informativa para merge; mantenha PR obrigatório,
  provas aplicáveis, revisão Codex local e merge humano.
- Core vendorizado: preservar os cinco arquivos comuns e conferir hashes em atualizações.
  Ajuste regras/configuração locais; não crie fork silencioso do motor.
- Exceção da issue #7: o proprietário escolheu manter somente neste repositório a
  [ampliação autorizada do teto de overrides para 35](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6342492981). A divergência de
  `scripts/code-review/README.md`, `review.mjs` e `review.test.mjs` perante os
  dois pilotos fica explícita no [registro da issue](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6297902519);
  os pilotos não serão alterados por esta entrega. As demais atualizações do core
  continuam sujeitas à regra de igualdade e conferência de hashes acima.

## tlc-implement

profile: light
handoff: on
