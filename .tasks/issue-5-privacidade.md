# Issue #5 — controles de coleta e privacidade

> Build this with **tlc-implement**, profile `light`, handoff `on`.
> Cada critério vira check com prova identificada. Nada em `Unresolved` pode
> ser decidido durante o build. Escopo aprovado pelo proprietário em 17/10/2026;
> U1 resolvida. Elaboração técnica e execução autorizadas, inclusive branch/PR.

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

20 critérios em 4 fatias · decisões técnicas abaixo delegadas pela issue ·
0 questões bloqueantes. U1 resolvida pela aprovação literal registrada abaixo.

Base local e remota conferida em 17/10/2026:
`1b6685fe97862ac1a2d2cff1e4d9f0e1f09a6a27`, árvore limpa antes deste plano.
Branch: `codex/issue-5-privacidade`. Uma task e um futuro PR para a entrega;
não abrir PR apenas com este plano nem criar sub-issue.

## Criteria

Os critérios abaixo detalham a política já solicitada. Não substituem os oito
AC da issue e não dispensam controles reais de captura/retenção. Os critérios
13–20 fecham AC1/AC5 conforme o recorte aprovado em U1.

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

### S4 — controlar e eliminar traces sanitizados no disco local

13. `privacy start --root <diretório>` cria uma captura `active`, com ID aleatório
    próprio, conteúdo desligado e retenção de 7 dias. `--content` é opt-in dessa
    captura; `--retention-days` aceita somente inteiros de 1 a 365. `--root` é
    obrigatório, sem descoberta automática ou default em diretório pessoal.
14. `privacy ingest --root <diretório> --capture <id> --agent
    <claude|codex-hooks|codex-exec|hermes>` lê eventos nativos NDJSON explícitos e
    grava somente o resultado sanitizado da política. Não executa agentes nem
    lê sessões, transcrições ou arquivos de skills. Pré-imagem bruta não aparece
    em arquivo de dados, temporário, lock, log ou mensagem de erro.
15. `privacy stop` move `active` para `stopped`; `privacy disable` move `active`
    ou `stopped` para `disabled` e desliga conteúdo. Ambos exigem root e capture;
    repetir a mesma ação é idempotente. Captura stopped/disabled recusa novos
    eventos; nova captura sempre recebe outro ID/chave e conteúdo default off.
16. `privacy status` e `privacy export`, com root e capture explícitos, entregam
    somente estado/contagens ou dados sanitizados daquela captura. Resposta JSON
    versionada por padrão; `--help` em português. Falhas usam códigos fechados:
    exit 0 para sucesso, 2 uso, 3 estado/formato inválido ou ausente, 4 conflito/
    contenção/isolamento, 5 falha de E/S. Nenhum caminho/payload bruto é ecoado.
17. `privacy delete --root <diretório> --capture <id>` mostra prévia por padrão;
    `--apply` elimina os dados de captura stopped/disabled. `privacy prune --root
    <diretório> [--apply]` aplica a mesma prévia/exclusão a capturas encerradas
    com idade maior ou igual ao prazo de retenção, contado do encerramento.
    Captura active nunca é removida pela retenção. Retenção não requer daemon;
    o guia explica que o usuário executa prune explicitamente.
18. Escrita, stop/disable e exclusão compartilham exclusão mútua na raiz. Uma
    operação com lock ocupado falha com conflito sem mutação; não remove lock
    alheio automaticamente. Após stop/disable/delete confirmado, um produtor
    atrasado não grava nem recria dados. Excluir preserva arquivos alheios,
    recusa links/reparse points e conteúdo inesperado em vez de apagar árvores
    arbitrárias. Chave de pseudonimização é removida com a captura e nunca
    integra exportações. Falha parcial é visível, sem reportar exclusão completa.
19. Cada captura aceita no máximo 500 eventos e 8 MiB serializados de dados;
    não aceita o evento que ultrapassaria qualquer limite. O status diferencia
    aceitos, persistidos, malformados e descartados, com motivo de limite.
    Registros de controle não guardam conteúdo bruto. Não há fila de disco para
    eventos não sanitizados nem expansão ilimitada de uma entrada.
20. Uma demonstração versionada usa apenas fixtures sintéticas e diretório
    temporário próprio para start → ingest → stop → export → delete; inclui
    opt-in separado, disable, prune com relógio controlado e concorrência de
    produtores com stop/delete. Os arquivos realmente criados são examinados
    para canários e, após exclusão, os dados/chaves realmente deixam de existir.

### Rastreabilidade dos AC originais

| Issue | Plano / situação |
| --- | --- |
| AC1 — opt-in e iniciar/encerrar/desabilitar captura | 1–3, 13–16, 20 |
| AC2 — sanitizar antes de qualquer persistência | 4–9, 14, 18–20 |
| AC3 — canários de cinco categorias | 5–6, 11; matriz inclui os caminhos de saída reais |
| AC4 — limites e cobertura | 7–9, 12 |
| AC5 — retenção e exclusão local | 15, 17–18, 20; operação real no disco |
| AC6 — ausência de envio automático | 10 |
| AC7 — instruções e payloads como dados | 3, 6 |
| AC8 — diagnósticos e falhas sanitizados | 5, 9, 11 |

## Out of scope

- Reabrir a #4 ou repetir a revisão de sua identidade já aprovada.
- Timeline/atribuição da #6, leitura avaliativa e relatórios da #7.
- Transporte entre processos, descoberta de coletor, follow/list/query e núcleo
  completo da #8. O armazenamento mínimo dos critérios 13–20 foi autorizado.
- Instalação pessoal/global, E2E com modelos, alteração de políticas de confiança,
  deploy, publicação do pacote ou envio externo de dados.
- Sanitização do stdout/stderr nativos do filho: isso alteraria o contrato do
  wrapper. Não capturar esses canais brutos como exportação do debugger.
- Limpeza de traces pessoais, backups, scratches ou histórico de governança.
  Provas usam exclusivamente diretórios temporários próprios e dados sintéticos.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| captura local | comandos/flags, defaults, iniciar/parar/desabilitar | 1, 13–16 |
| controle de retenção | formato, prévia, aplicação e erros de exclusão | 17–18 |
| hooks Claude/Codex | saída e falha | existing — stdout vazio, exit 0; 9 |
| wrapper Codex | saída e resultado do agente | existing — repasse byte a byte; 9, 12 |
| Hermes | entrega inativa/ativa e erro | existing — sem entrega não há worker; callback não espera E/S; 9 |
| conteúdo opt-in | ferramentas/campos cobertos e ausência de suporte | 2–3, 6–8 |
| exportação do debugger | formato, limites e falhas | 4–9, 11, 16 |
| guia de privacidade | estrutura, tom e próximo passo | 12; português, exemplos locais sintéticos |
| tela/API remota | estados, autenticação e rate limit | n/a — nenhuma tela ou API remota |

## Swept

- validation: 2, 4–7; allowlist por ferramenta, tipos e orçamento.
- failure modes: 8–9, 11; perda explícita sem saída bruta.
- idempotency and retry: 9; sem retry de payload inseguro; repetição de
  start/stop/delete em 13, 15, 17–18.
- authorization: 1, 10, 13, 17–18; consentimento explícito e raiz delimitada.
- concurrency and ordering: existing — receptor limitado por processo; identidade
  em 4; isolamento e barreira entre stop/delete e escrita em 18, 20.
- data lifecycle: 13–20; AC5 exige operação real, não política simulada.
- external-dependency failure: 9; provas sintéticas não dependem de modelos.
- state transitions: 13, 15, 17–18; active → stopped → disabled; active → disabled;
  stopped/disabled → deleted. Deleted não volta a active.
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
| stored data | não existem traces do produto para migrar; raiz explícita e formato versionado nos critérios 13–20; histórico .checks/code-review e backups não são traces do produto |
| governance | core de cinco arquivos intacto, pacote privado, CI Windows/Ubuntu/macOS; mudanças afetadas entram nos checks existentes |

## Decided

Detalhes técnicos de planejamento foram delegados na issue em 13/10/2026.
Estas escolhas detalham a política solicitada e o recorte aprovado em U1.

| Decision | Shape | Alternative rejected |
| --- | --- | --- |
| Uma política compartilhada | projeção tipada → sanitização → orçamento → receptor/saída; todos os consumidores do debugger usam o mesmo resultado | sanitização separada por exportador permite bypass e divergência |
| Identidade privada por captura | pseudônimo por HMAC-SHA-256 com chave aleatória exclusiva da captura, sem persistir valor original/mapa reversível; campos de ID relacionados compartilham o domínio necessário para igualdade | hash público permite ataques por dicionário; chave global vincula capturas sem necessidade |
| Conteúdo por contrato | allowlist literal ferramenta/campo/versão; ausente ou desconhecido → `unsupported_content` | guardar texto genérico depois de regex confunde detecção parcial com proteção completa |
| Formato privado separado | não adicionar conteúdo arbitrário ao envelope minimizado v1; payload sanitizado tem versão e orçamento próprios, junto da origem/lacunas | aumentar silenciosamente a semântica de v1 quebra seus consumidores e provas |

As assinaturas e valores de retenção estão nos critérios 13–20. O builder
registra a matriz de conteúdo e o formato literal de disco em Landing antes do
código; nova capacidade fora da issue volta ao dono. Node >=24 e APIs nativas,
sem novo banco/dependência: o armazenamento mínimo é consumível pela futura #8.

## Provas e execução após a decisão

Derivar a checklist dos AC completos e deste plano, sem apagar critérios.
Provas devem distinguir default/opt-in, capturas diferentes,
fim/desabilitação, cinco categorias de canários em cada canal, chaves aninhadas,
URL com userinfo/query, chave privada multilinha, tamanho exatamente no limite e
um byte acima, Unicode multibyte, profundidade 8/9, 128/129 membros, erros e
truncamento após sanitização. Payload com comandos embutidos não os executa.

Provar sanitização pura e contratos das saídas afetadas. A prova de retenção
precisa mostrar dados locais realmente removidos, preservação de
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
  Autoriza seleção e continuidade dentro do escopo decidido.
- Aprovação nesta conversa, 17/10/2026: “Aprovado esse recorte. Pode incluir o
  armazenamento local mínimo na #5, reutilizável pela #8, e seguir o loop de
  desenvolvimento com as verificações e o PR.” Resolve U1 e autoriza a execução
  e o push/PR após as verificações, sem delegar merge nem rodadas extras.

## Unresolved

| # | Kind | Question | Until answered |
| --- | --- | --- | --- |
| U1 | resolved — 17/10/2026 | Armazenamento mínimo na #5, reutilizável pela #8 | Aprovado literalmente pelo proprietário, conforme Sources. Critérios 13–20 fecham o recorte; #8 mantém transporte entre processos, consulta/acompanhamento e núcleo completo. |

Recorte aprovado de U1: comando local recebe somente fixtures/entrada
explícita, sanitiza antes de escrever e permite ao usuário controlar sua captura
e seus próprios traces em diretório explicitamente escolhido. Sem daemon, rede,
instalação de hook ou captura de sessões pessoais; arquivos temporários de escrita
contêm exclusivamente dados já sanitizados. Retenção proposta de 7 dias, ajustável
de 1 a 365 dias, exclusão de trace explícito com prévia por padrão e aplicação
explícita, sem apagar arquivos desconhecidos ou seguir links para fora da raiz.
A #8 reutilizará esse ciclo de vida e acrescentará o caminho real das integrações,
consulta e acompanhamento. Esta entrega já protege escritas concorrentes no
armazenamento mínimo; não implementa transporte nem acompanhamento contínuo.
