# Issue #4 — achado durante execução das provas

## Espera por drain no wrapper

Em 16/10/2026 às 13:16 (America/Sao_Paulo), a execução iniciada às 13:10:58 de
`node --test --test-reporter=spec tests/integrations/failure-matrix.cli.test.mjs
tests/integrations/codex-run.cli.test.mjs` continuava presa, sem novo resultado.
Runner observado: PID 125000; worker da failure-matrix: PID 85588; filho próprio:
PID 111564, executando este repositório em `integrations run --agent codex
--codex-entry .../tests/integrations/fixtures/codex/fake-codex.mjs -- p`.

Cenário a conferir pelo builder: C38 começa com ausência do canal de relatório.
Após o filho encerrar, `src/integrations/codex-run.mjs` consulta
`process.stdout.writableLength > 0` e espera `drain`/`error`. Uma escrita em pipe
no Windows pode estar pendente mesmo tendo retornado `true`; `drain` só é devido
quando houve backpressure. Assim, a espera final pode nunca resolver, especialmente
quando `observation.flush()` não tem relatório para escrever e retorna de imediato.
Confirmar com a reprodução e asserção, sem enfraquecer C38 nem o passthrough.

Esperado: saída 17 da fixture preservada e processo concluído. Observado: execução
sem conclusão por mais de cinco minutos, sob os PIDs acima. O orquestrador encerra
somente a árvore desse runner de teste para permitir o diagnóstico e continuação;
isso não constitui resultado PASS nem execução concluída da matriz.

Claude é responsável por confirmar/corrigir e executar novamente as provas afetadas.
Esta nota não altera produto, checklist ou critérios e não substitui o Verifier.

## Isolamento posterior

O builder isolou a desconexão e observou saída 17 com relatório. Identificou também
um erro no harness: no caso de relatório deliberadamente sem leitura, esperar
`close` pode aguardar o fechamento dos pipes; o resultado do processo deve ser
observado por `exit`, seguido de limpeza explícita dos canais. A primeira hipótese
de que o PID observado correspondia ao caso sem relatório não ficou confirmada.
Não atribuir o travamento original a um defeito de produto sem a reprodução.

A observação de código sobre `writableLength`/`drain` permanece uma hipótese
separada para o builder conferir: uma escrita pendente abaixo do highWaterMark
não obriga emissão de `drain`. O teste deve distinguir consumidor de stdout lento
de canal de relatório sem leitura. Registrar o resultado de qualquer reprodução e
a correção/limitação exata, sem tratar esta nota como prova de execução aprovada.

Às 13:26:44, uma nova execução iniciada às 13:22:09 ainda estava presa:
runner 15180, worker 100672, wrapper de fixture 127964 (13:22:15). Isso ocorreu
depois da alteração para aguardar `exit`; essa alteração isolada não resolveu a
reprodução. Conferir separadamente o caso do relatório não drenado e o uso de
`fs.write` em `observation.mjs`: resolver a Promise por timer não cancela uma
escrita nativa ainda pendente. Verificar qual dos dois pontos mantém o processo
vivo, com limite externo e limpeza da árvore de processos própria em cada sonda.
Não considerar a rodada encerrada/PASS; nova interrupção só alcança o runner e seus
filhos de fixture conhecidos. Não houve modificação de produto pelo orquestrador.

A segunda tentativa de interrupção não foi executada: ao conferir novamente a
identidade, o PID 15180 já havia mudado/terminado e a guarda abortou antes de
`taskkill`. Somente a primeira árvore (125000) foi encerrada pelo orquestrador.

Fontes primárias consultadas para a revisão de I/O:

- [Node 24 — A note on process I/O](https://nodejs.org/docs/latest-v24.x/api/process.html#a-note-on-process-io):
  pipes de stdout/stderr são síncronos no Windows e assíncronos em POSIX; o comentário
  atual do wrapper sobre a plataforma precisa ser confrontado com essa distinção.
- [Writable drain](https://nodejs.org/api/stream.html#event-drain): confirmar a
  condição que exige `drain`; existência de bytes pendentes, sozinha, não é prova
  de que uma escrita retornou `false`.

Estas referências fundamentam a revisão; não substituem uma reprodução do defeito.
