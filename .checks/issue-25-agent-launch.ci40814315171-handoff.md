# CI do HEAD 066bd98 — próxima fatia, com testes e prazos preservados

O proprietário autorizou manter os testes e prazos e seguir até toda a CI ficar verde para fazer o merge do PR #28. Este registro orienta diagnóstico e correção mínima dentro dos contratos atuais; não concede nova política de retry, perda, durabilidade ou tempo.

## Estado publicado

- HEAD `066bd987a26169d09ebc944b04506d3d002e72bb`, base `63621c691f132dc8d591414269d36cfa18fca594`.
- Verifier22 PASS50/50 sobre `2383c52`: A/B116/110/0/6, C116/112/0/4; D1.059/1.039/0/20, término natural, runner padrão, onze nativos Hermes e ramo I4-C35. O B vermelho do autor ficou preservado.
- Codex formal13 ready, sufficient, AC1–AC9 met, sem achados, concluído29/10/2026 03:47:13 UTC. Histórico e13 tentativas preservados; a próxima formal necessária será14, registrada pontualmente pelo coordenador sob a autorização de quantas forem necessárias.
- Uma publicação e um acionamento manual; nenhum rerun inalterado para procurar verde.

## Resultados remotos

1. [PR40814315171](https://github.com/oldboydev/skill-me/actions/runs/40814315171): changes/Ubuntu/macOS success, Windows e CI failure. Governança27/27, motor16/16 e doctor410/0/7 passaram; integrações599/574/1/24.
   - Falha I23-C6 (`tests/integrations/observe/agents.e2e.test.mjs:102`, asserção `:115`, expansion_slash_command).
   - Produtor7: delivery_timeout1/0/0/1, `sync key`601ms, `close key` ainda pendente havia53ms na saída; primeira à última operação concluída620ms, saída673ms após primeira E/S, CPU16ms, laço máximo25,8ms, sem disputa EEXIST. Os primeiros seis produtores completaram E/S em24–30ms.
   - A operação lenta foi localizada; não foi identificada a causa física. Um pendente de53ms não é uma conclusão de que o close terminou em53ms.
2. [Manual40814471097](https://github.com/oldboydev/skill-me/actions/runs/40814471097): changes/Ubuntu/macOS/diagnóstico success; Windows cancelled, agregado CI failure.
   - Anotação GitHub: `The job has exceeded the maximum execution time of 20m0s`.
   - Governança27/27, motor16/16 e doctor410/0/7 passaram. Integrações incompletas, sem totais finais válidos. Último resultado04:02:02 UTC; cancelamento04:11:42.
   - I4-C16c e os dois controles de EOF/exit passaram. Não retocar essa correção por hipótese.
   - Comparação de rótulos impressos:1.059 nomes únicos no PR completo e1.020 no manual,39 ausentes, começando pelo T8-C19 walkthrough (`traces/demo.e2e.test.mjs`). Isto é observação de saída, não prova de qual teste estava executando: o reporter pode reter eventos.
3. [Medição40814471097/job123252211938](https://github.com/oldboydev/skill-me/actions/runs/40814471097/job/123252211938): A1C:/BD:/A2C: no mesmo runner,4.500/4.500 ciclos, zero erros/incompletos/linhas inválidas/faixas600/650; todas as métricas com1.500 amostras por fase, filhos0/sem sinal, três limpezas sem falha.
   - Tomada p99:4,500/1,748/3,983ms; máximos29,299/17,476/9,602ms. Liberação máxima12,238/20,238/15,578ms. P99 menor em B, máximos mistos.
   - Mede o componente de lock (`durable:false`) e não a criação durável de chave nem o pipeline real. Não demonstra eliminação das falhas.

Logs, JSON, validação, anotações e comparação de nomes: `.checks/code-review/issue-25/ci066-*`, `measurement40814471097*`. O PR foi atualizado com os dois resultados vermelhos e o merge permanece bloqueado.

## Primeiro candidato a reproduzir

Em `traces/demo.e2e.test.mjs`, o T8-C19 cria o subprocesso `privacy follow` e observa seu close imediatamente, antes dos awaits. Não há finalizador por teste para encerrar esse filho se uma asserção/interação anterior ao stop falhar. O hook/ingest/wrapper/list/export podem falhar legitimamente e a captura ainda estar ativa; o follow é contínuo. A limpeza global de pastas não garante a finalização do subprocesso.

É um candidato de ciclo de vida da harness a provar, não uma atribuição do cancelamento manual. Reproduzir falha controlada após o spawn com processo próprio; verificar preservação da falha e ausência de filho pendente; buscar/reutilizar apoio compatível antes de criar outro. Se confirmado, corrigir somente o encerramento de filhos próprios em todas as saídas, sem transformar a falha em sucesso. O fluxo positivo mantém os nove passos, cinco registros, end6, estado, origens, payloads e todas as asserções. Não aumentar timeout ou adicionar retry.

Se não se confirmar, preservar a ausência de reprodução e escolher a menor observação de início/fim necessária para localizar o pendente. Qualquer observação nova exige Landing/prova antes do código; não alterar a seleção de testes, os atores, a concorrência, as asserções ou os prazos para obter verde.

## Limites da fatia

- Só harness do T8-C19, apoios estritamente necessários, regressões e evidências. Nenhum defeito do produto foi demonstrado pelo sync601ms: a entrega tem prazo e melhor esforço.
- Não remover/deferir fsync, enfraquecer durabilidade de chave/estado/segmento, reaproveitar chaves, criar cache/pool, mudar formato, paralelismo, runtime, AV, relógio, UVpool, volumes ou infraestrutura por hipótese. A medição de uma alternativa de I/O pode ser proposta depois, com contrato preservado; não é correção já decidida.
- Prazos1000/750/650ms, stdin2000/faixa1900–6000, Hermes5s, prazos dos testes, jobs20/10/5/manual10, runner padrão, carga, contagens, retry/perda, casos existentes e benchmark original permanecem.
- Isolamento por raízes próprias registradas e limpeza exata. Nada de processos alheios, varredura por prefixo/mtime, auxiliares no TEMPglobal ou CLI real de modelo como fixture.
- Autor Claude/Grok implementa e prova; coordenador não implementa produto. Novo Verifier independente e nova formal antes de publicar. Não repetir os runs066, não fazer merge deles e não apagar histórico.
