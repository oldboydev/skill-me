# Issue #5 — controles de coleta e privacidade

> Build this with **tlc-implement**, profile `light`, handoff `on`.
> Cada critério vira check com prova identificada. Nada em `Unresolved` pode
> ser decidido durante o build. Este plano está em Planning, não aprovado.

## Intent

Eventos podem carregar credenciais, código e dados pessoais. Hoje a integração
minimiza metadados, mas não oferece política completa de privacidade, opt-in de
conteúdo nem retenção/exclusão de traces. O usuário não consegue controlar esse
ciclo de vida. A issue não informa volume de uso ou incidentes reais.

A entrega aplicará controles de coleta e sanitização antes das saídas do
debugger, com limites e perdas declaradas. Foi selecionada uma única issue: #5.
A #4 está encerrada; #8 depende expressamente da política da #5, #7 depende de
#5 e #6, e #6 precisa preservar a origem e as lacunas produzidas nesta fronteira.
Nenhuma issue aberta está Ready e o Project não define prioridade para elas.

12 critérios em 3 fatias · decisões técnicas abaixo delegadas pela issue ·
1 questão de escopo bloqueante, U1, envolvendo AC1/AC5 e a fronteira com #8.

Base local e remota conferida em 17/10/2026:
`1b6685fe97862ac1a2d2cff1e4d9f0e1f09a6a27`, árvore limpa antes deste plano.
Branch: `codex/issue-5-privacidade`. Uma task e um futuro PR para a entrega;
não abrir PR apenas com este plano nem criar sub-issue.

## Criteria

Os critérios abaixo detalham a política já solicitada. Não substituem os oito
AC da issue, não dispensam controles reais de captura/retenção e não autorizam
implementar a solução candidata de U1. AC1 e AC5 continuam pendentes em U1.

### S1 — observar com uma política explícita

1. Por padrão, nenhum argumento ou resultado de ferramenta integra a saída do
   debugger. A opção de conteúdo começa desligada em cada nova captura, sem
   herdar consentimento de outra captura. Ativá-la exige ação explícita do usuário
   para aquela captura; reiniciar ou desabilitar não reativa o consentimento.
2. Com opt-in, somente pares ferramenta/campo previstos em uma tabela fechada
   podem produzir conteúdo sanitizado. Ferramenta, versão ou formato não coberto
   produz metadados e motivo `unsupported_content`, nunca fallback para copiar
   argumentos/resultados brutos. A tabela literal é registrada antes do código,
   baseada nas fixtures versionadas, sem prometer coleta que o host não fornece.
3. Prompts, raciocínio privado, mensagens finais de assistente e instruções de
   arquivos de skill permanecem fora da captura de conteúdo, inclusive com
   opt-in. Payloads e referências a scripts nunca são executados. Uma fixture
   contendo instrução para criar um arquivo não cria esse arquivo.
4. Para cada metadado textual permitido no envelope v1, a política trata o valor
   antes da entrega ao receptor/exportador. IDs aceitos mantêm igualdade dentro
   da captura por pseudônimos com chave exclusiva dessa captura; a mesma entrada
   não ganha identidade correlacionável entre duas capturas. Caminhos não expõem
   diretório pessoal, credenciais ou componentes originais em saídas do debugger.
   Os códigos de lacuna não carregam valores descartados.

### S2 — impedir que entradas brutas alcancem saídas persistíveis

5. Em qualquer modo de coleta, tokens, valores de cabeçalhos sensíveis,
   credenciais de URL, passwords e blocos de chave privada das fixtures não
   aparecem em eventos aceitos, relatórios, stdout/stderr do debugger, logs,
   arquivos temporários ou exportações criados pelo debugger. A prova inclui
   canários em conteúdo e em IDs/nomes/caminhos, não só em chaves já excluídas.
6. Objetos e arrays são projetados por uma allowlist de campos e tipos antes da
   serialização. Subárvores sob chaves sensíveis são descartadas inteiras; URL
   autenticada não preserva userinfo nem parâmetros sensíveis; blocos de chave
   privada são descartados inteiros. Conteúdo sem projeção segura é omitido com
   `unsanitizable`. Detecção por padrões complementa a projeção, sem ser anunciada
   como garantia universal para qualquer texto livre ou segredo desconhecido.
7. A política limita uma entrada nativa a 1 MiB; em streams, cada linha a 64 KiB;
   o envelope minimizado permanece limitado a 4096 bytes. Conteúdo opt-in tem
   orçamento separado de 8192 bytes UTF-8 por evento, profundidade máxima 8 e
   no máximo 128 membros visitados por evento. Sanitização precede truncamento;
   excesso de profundidade/membros omite conteúdo inteiro. Truncamento só produz
   UTF-8 válido e informa `content_truncated`; IDs nunca são truncados.
8. Toda omissão ou descarte decorrente desta política informa um código fechado
   e uma contagem numérica: `content_disabled`, `unsupported_content`,
   `unsanitizable`, `sensitive_removed`, `content_truncated`, `privacy_failure`.
   Valores sensíveis não aparecem no nome do código, em labels ou em mensagens.
   Contadores distinguem conteúdo omitido de evento descartado; nenhum número de
   eventos perdido é apresentado como cobertura completa de execução.
9. Falha de sanitização, entrada hostil ou falha de saída descarta a parcela
   insegura, sem spool, cópia bruta, retry com payload ou mensagem da exceção.
   O hook continua com stdout vazio e exit 0; o plugin não espera E/S; o wrapper
   preserva o fluxo e o resultado do filho conforme o contrato já aprovado.

### S3 — reconhecer limites e manter o uso local

10. Nenhum evento do debugger inicia telemetria remota, DNS ou upload. Esta
    entrega não oferece destino remoto; não existe consentimento implícito em
    variável herdada, configuração de agente ou opt-in de conteúdo local.
11. Diagnósticos e falhas das novas funções usam códigos e mensagens próprias,
    de vocabulário fechado, sem stack, mensagem de erro externa, conteúdo de
    configuração ou payload bruto. As saídas existentes afetadas pela política
    são exercitadas com os mesmos canários; não basta testar só o sanitizador.
12. O guia descreve defaults, campos suportados, perdas, limites e controles
    efetivamente implementados. Explica que stdout/stderr nativos do agente
    supervisionado são repassados ao usuário e não são exportação sanitizada do
    debugger; testes separam esses canais sem esconder canários nas saídas do
    próprio debugger. Plataformas não executadas não são declaradas comprovadas.

### Rastreabilidade dos AC originais

| Issue | Plano / situação |
| --- | --- |
| AC1 — opt-in e iniciar/encerrar/desabilitar captura | 1–3; ciclo real e interface dependem de U1 |
| AC2 — sanitizar antes de qualquer persistência | 4–9; fronteira persistente depende de U1 |
| AC3 — canários de cinco categorias | 5–6, 11; matriz inclui os caminhos de saída reais |
| AC4 — limites e cobertura | 7–9, 12 |
| AC5 — retenção e exclusão local | U1; não satisfeito por mock, interface abstrata ou política sem armazenamento |
| AC6 — ausência de envio automático | 10 |
| AC7 — instruções e payloads como dados | 3, 6 |
| AC8 — diagnósticos e falhas sanitizados | 5, 9, 11 |

## Out of scope

- Reabrir a #4 ou repetir a revisão de sua identidade já aprovada.
- Timeline/atribuição da #6, leitura avaliativa e relatórios da #7.
- Transporte entre processos, descoberta de coletor, follow/list/query e núcleo
  completo da #8. Um armazenamento mínimo nesta entrega depende de U1.
- Instalação pessoal/global, E2E com modelos, alteração de políticas de confiança,
  deploy, publicação do pacote ou envio externo de dados.
- Sanitização do stdout/stderr nativos do filho: isso alteraria o contrato do
  wrapper. Não capturar esses canais brutos como exportação do debugger.
- Limpeza de traces pessoais, backups, scratches ou histórico de governança.
  Provas usam exclusivamente diretórios temporários próprios e dados sintéticos.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| captura local | comandos/flags, defaults, iniciar/parar/desabilitar | U1; 1 fixa o default de conteúdo |
| controle de retenção | formato, prévia, aplicação e erros de exclusão | U1 |
| hooks Claude/Codex | saída e falha | existing — stdout vazio, exit 0; 9 |
| wrapper Codex | saída e resultado do agente | existing — repasse byte a byte; 9, 12 |
| Hermes | entrega inativa/ativa e erro | existing — sem entrega não há worker; callback não espera E/S; 9 |
| conteúdo opt-in | ferramentas/campos cobertos e ausência de suporte | 2–3, 6–8 |
| exportação do debugger | formato, limites e falhas | 4–9, 11; assinatura final depende de U1 |
| guia de privacidade | estrutura, tom e próximo passo | 12; português, exemplos locais sintéticos |
| tela/API remota | estados, autenticação e rate limit | n/a — nenhuma tela ou API remota |

## Swept

- validation: 2, 4–7; allowlist por ferramenta, tipos e orçamento.
- failure modes: 8–9, 11; perda explícita sem saída bruta.
- idempotency and retry: 9; sem retry de payload inseguro; repetição de
  start/stop/delete depende do contrato de U1.
- authorization: 1, 10; sem consentimento herdado ou envio remoto; exclusão em U1.
- concurrency and ordering: existing — receptor limitado por processo; identidade
  em 4; isolamento de capturas e barreira entre stop/delete e escrita em U1.
- data lifecycle: U1; AC5 exige operação real, não política simulada.
- external-dependency failure: 9; provas sintéticas não dependem de modelos.
- state transitions: U1; não desenhar máquina de captura que o proprietário
  ainda precisa localizar na fronteira entre #5 e #8.
- observability: 8, 11–12; códigos e contagens sem conteúdo original.

## Impact

| Front | What changes |
| --- | --- |
| domain | `capture` passa a ser a unidade de consentimento e pseudonimização; hoje existe apenas observação por processo, não janela global |
| domain | envelope v1 valida forma e minimização; não equivale a sanitização completa. `buildEnvelope`/`validateEnvelope`, receptor e exportador precisam de uma fronteira comum de privacidade |
| domain | `accepted` continua significando recebido pelo receptor; não pode passar a significar persistido ou cobertura completa |
| integrations | `observation.mjs` é o ponto comum atual; adaptadores descartam conteúdo cedo. Opt-in precisa de extração explícita, sem reabrir cópia arbitrária do payload |
| Hermes | `kwargs.json` não projeta args/resultados; suporte novo exige contrato comprovado, fila limitada e nenhuma cópia de regra de privacidade em Python |
| doctor | leitura de configuração e mensagens fechadas existentes são preservadas; não passar a iniciar agente ou coletor para diagnosticar |
| stored data | não existem traces do produto para migrar; eventual formato/raiz novos dependem de U1; histórico .checks/code-review e backups não são traces do produto |
| governance | core de cinco arquivos intacto, pacote privado, CI Windows/Ubuntu/macOS; mudanças afetadas entram nos checks existentes |

## Decided

Detalhes técnicos de planejamento foram delegados na issue em 13/10/2026.
Estas escolhas detalham a política solicitada; não resolvem U1 por inferência.

| Decision | Shape | Alternative rejected |
| --- | --- | --- |
| Uma política compartilhada | projeção tipada → sanitização → orçamento → receptor/saída; todos os consumidores do debugger usam o mesmo resultado | sanitização separada por exportador permite bypass e divergência |
| Identidade privada por captura | pseudônimo por HMAC-SHA-256 com chave aleatória exclusiva da captura, sem persistir valor original/mapa reversível; campos de ID relacionados compartilham o domínio necessário para igualdade | hash público permite ataques por dicionário; chave global vincula capturas sem necessidade |
| Conteúdo por contrato | allowlist literal ferramenta/campo/versão; ausente ou desconhecido → `unsupported_content` | guardar texto genérico depois de regex confunde detecção parcial com proteção completa |
| Formato privado separado | não adicionar conteúdo arbitrário ao envelope minimizado v1; payload sanitizado tem versão e orçamento próprios, junto da origem/lacunas | aumentar silenciosamente a semântica de v1 quebra seus consumidores e provas |

As assinaturas públicas e valores de retenção dependem de U1; não estão
aprovados por esta tabela. O builder registra matriz de conteúdo e formato
literal em Landing antes do código; nova capacidade fora da issue volta ao dono.

## Provas e execução após a decisão

Derivar a checklist dos AC completos e deste plano depois de U1, sem apagar os
AC pendentes. Provas devem distinguir default/opt-in, capturas diferentes,
fim/desabilitação, cinco categorias de canários em cada canal, chaves aninhadas,
URL com userinfo/query, chave privada multilinha, tamanho exatamente no limite e
um byte acima, Unicode multibyte, profundidade 8/9, 128/129 membros, erros e
truncamento após sanitização. Payload com comandos embutidos não os executa.

Provar sanitização pura e contratos das saídas afetadas. A prova de retenção
depende de U1 e precisa mostrar dados locais realmente removidos, preservação de
arquivos alheios e exclusão sem corrida que permita reaparecimento dos dados.
Mock/fixture de sink não substitui essa prova. Nenhuma suíte foi executada nesta
etapa de planejamento; não existe `.verified.md` desta entrega.

Claude ou Grok implementa e executa as provas; Codex coordena. Verifier fresco,
independente do autor, cobre a entrega inteira. Provas por plataforma em lotes;
WSL em cópia Linux nativa `/tmp` com identidade do conteúdo conferida. Windows
usa a via normal de aprovação para Git e processos próprios das fixtures. Não
repetir a ação antiga bloqueada de preparação do Verifier6, nem seu probe residual.

Após código, provas, Verifier e commit limpo:
`npm run review:run -- --issue 5 --profile light`. O teto desta issue é 2;
o override da #4 não se aplica. Aprovação encerra a etapa; achado necessário
provoca correção pelo autor e nova revisão somente da identidade alterada.
Com ready, push autorizado e PR exclusivamente por `npm run pr:create`, anexado
à sessão, com conferência do conteúdo e CI. Merge exige autorização específica
para a #5: a autorização registrada na #4 não foi generalizada.

## Sources

- [Issue #5](https://github.com/oldboydev/skill-me/issues/5), oito AC e corpo
  completos, sem comentários na leitura de 17/10/2026: escopo funcional e
  delegação dos detalhes técnicos de planejamento.
- [Project 3](https://github.com/users/oldboydev/projects/3), consulta em
  17/10/2026: #3/#4 Done, #5/#6/#7/#8 Backlog, sem prioridade definida. #5
  movida para Planning nesta sessão; não se confunde com plano aprovado.
- [#8](https://github.com/oldboydev/skill-me/issues/8),
  [#6](https://github.com/oldboydev/skill-me/issues/6) e
  [#7](https://github.com/oldboydev/skill-me/issues/7), corpos completos lidos:
  propriedade de armazenamento, atribuição e relatório e dependências explícitas.
- `AGENTS.md`, `CLAUDE.md`, `scripts/code-review/README.md`,
  `code-review.config.json`, `package.json`, workflow existente: governança,
  autoria, runtime e limites. `CONTRIBUTING.md` não existe neste checkout.
- `.tasks/issue-4-integracoes.md`: U1 e fronteira aprovada; receptor só em
  memória, sem conteúdo opt-in, armazenamento ou retenção; #4 não reaberta.
- `src/integrations/{boundary,observation,memory-receiver,hook-command,ingest-command,codex-run,cli}.mjs`,
  adaptadores e `hermes/plugin/{__init__.py,kwargs.json}`: caminhos reais de
  entrada/saída, conteúdo descartado cedo e limites existentes.
- `tests/integrations/boundary.unit.test.mjs` e inventário de testes:
  provas existentes de minimização; leitura não é nova execução dos testes.
- A issue cita `AGENT_SKILL_DEBUGGER_SPEC (1).md` como guia não vinculante.
  Esse arquivo não foi encontrado no checkout; nenhum contrato foi inferido dele.
- Pedido do proprietário transmitido a esta sessão: “depois em uma nova sessão
  pode pegar uma nova issues e planejar e fazer o loop de desenvolvimento”.
  Autoriza seleção e continuidade dentro do escopo decidido; não resolve U1.

## Unresolved

| # | Kind | Question | Until answered |
| --- | --- | --- | --- |
| U1 | blocks | A #5 pode entregar a parcela mínima de captura local e armazenamento sanitizado necessária para start/stop/disable e retenção/exclusão reais, reutilizável pela #8? Recomendação: sim, mantendo na #8 transporte entre processos, acompanhamento/consulta e o núcleo completo. Alternativa: limitar agora a #5 à política executável e manter AC1/AC5 abertos até a #8, sem declarar a #5 concluída. | AC1 e AC5 não têm operação executável hoje. Nenhum código é iniciado antes desta decisão. Após resposta, congelar assinatura, estados, formato versionado, raiz explícita, retenção e exclusão, barreira de escrita, limites e provas reais; incorporar a fronteira aprovada à issue antes do build. |

Proposta concreta para avaliar U1: comando local recebe somente fixtures/entrada
explícita, sanitiza antes de escrever e permite ao usuário controlar sua captura
e seus próprios traces em diretório explicitamente escolhido. Sem daemon, rede,
instalação de hook ou captura de sessões pessoais; arquivos temporários de escrita
contêm exclusivamente dados já sanitizados. Retenção proposta de 7 dias, ajustável
de 1 a 365 dias, exclusão de trace explícito com prévia por padrão e aplicação
explícita, sem apagar arquivos desconhecidos ou seguir links para fora da raiz.
A #8 reutilizaria esse ciclo de vida e acrescentaria o caminho real das integrações,
concorrência entre produtores, consulta e acompanhamento. Esta proposta não está
aprovada e não vira critério ou comportamento por passagem de tempo.
