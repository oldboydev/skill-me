# CI Windows: medição comparativa antes de nova mitigação — aprovada em 28/10/2026

O proprietário autorizou: “Pode fazer a medição comparativa. Mantém os testes e prazos e segue até a CI ficar toda verde para fazer o merge do PR #28.” [Registro da aprovação](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467154706). O AC9 foi acrescentado à issue antes do código. Implementação e provas serão registradas pelo autor, preservando a proposta abaixo.

Estado: não implementada. A CI40636157287 do PR28 terminou vermelha no Windows: I23-C4 e T8-C11, ambos lock_present; Ubuntu/macOS passaram. Diagnóstico em d2d54cf, com controles saudáveis e duas vias de falha que reproduzem cada sintoma. Não há defeito do produto demonstrado, nem causa atribuída às ocorrências no runner. O Verifier12 PASS48/48 e a formal7 ready8/8 do conteúdo publicado9244eea ficam preservados.

## Objetivo e limite desta decisão

Após as provas do autor em `3843867` e os registros `059e518`, o orquestrador registrou as próximas rodadas necessárias sob a autorização humana “Pode fazer quantas precisar”: [13ª verificação independente e 8ª revisão Codex](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6467998235). As doze verificações e sete revisões anteriores ficam preservadas. Só o override formal25 passa de sete para oito; este registro não declara PASS ou ready das novas rodadas.

Obter uma comparação finita da latência do lock no runner Windows, entre a pasta temporária padrão e a pasta temporária fornecida pelo runner. Esta decisão autoriza a medição e sua validação; qualquer mitigação posterior depende do resultado e de proposta concreta. Produto, provas funcionais existentes, prazos de750/650ms, contagens, perdas, retries, carga da suíte e orçamentos regulares20/10/5 continuam vinculantes. O merge continua exigindo todos os checks regulares verdes.

## Como executar antes do merge

Usar o arquivo de workflow existente `.github/workflows/governance.yml`, que já contém `workflow_dispatch` na main. Acrescentar somente um job `lock_diagnostics`, nome `Diagnosticar lock Windows (manual)`, com:
- `if: github.event_name == 'workflow_dispatch'`;
- `runs-on: windows-latest`;
- `timeout-minutes: 10`;
- permissões `contents: read`, ações checkout/setup-node já pinadas nos mesmos hashes, Node24.13.0, instalação local `npm ci --ignore-scripts`;
- execução do script abaixo;
- sem referência nova em `ci.needs`, sem `continue-on-error` nos jobs normais.

Os jobs regulares changes/verify/ci permanecem completos. O diagnóstico manual é não aplicável nos eventos pull_request/push; esse skip explícito não substitui nem dispensa os cinco checks regulares. A execução manual também executa a matriz normal já existente, além do job diagnóstico de até10min; será acionada uma vez, sobre o HEAD aprovado e publicado.

Uma proposta anterior citava workflow manual novo. Ela não serve para este pré-merge: o arquivo precisa existir na branch padrão para receber workflow_dispatch. O workflow existente pode ser executado na branch do PR com `--ref`. Fontes: [execução manual](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow?tool=webui), [variáveis do runner](https://docs.github.com/en/actions/reference/workflows-and-actions/variables). A proposta atual substitui essa parte do handoff anterior.

## Script e amostragem finita

Novo `scripts/ci-lock-latency.mjs`, usando os contratos públicos existentes `createStoreIo` (privacy/fs.mjs) e `holdLockFile` (privacy/store.mjs), sem copiar o algoritmo de lock.

1. Resolver os caminhos reais de `os.tmpdir()` e `RUNNER_TEMP`. Comparar com a semântica de caminhos do Windows. Se forem o mesmo destino, declarar que não há alternativa distinta; não apresentar duas execuções da mesma pasta como comparação.
2. Se distintos, executar três fases no mesmo job/runner: A1 (temporário padrão), B (RUNNER_TEMP) e A2 (temporário padrão). A volta a A reduz a confusão com aquecimento e mudança de carga ao longo do tempo.
3. Por fase: três produtores, cada um com seu próprio diretório/lock para separar latência de E/S de disputa intencional; alvo de500 ciclos por produtor, total1.500. Três processos de carga escrevem64KiB e fazem flush em arquivos próprios. Todos usam a mesma implementação e os mesmos limites nas três fases.
4. Cada fase tem teto total de120s. O supervisor encerra somente os filhos que criou se o teto vencer, aguarda sua saída e registra amostras incompletas. Nenhum erro ou término parcial vira zero ocorrências. Os600/650ms são faixas observadas, não novos prazos de produto.
5. Medir duração total de tomada/liberação e operações de criação/escrita/fechamento/remoção, erros por código, quantidade prevista/concluída/incompleta e contagens >=600ms e >=650ms; p50, p99 e máximo das amostras concluídas. Separar lock_present dos erros de E/S. Saída só com rótulos e métricas; sem conteúdo, chaves ou dump de ambiente.
6. Todos os arquivos são sintéticos em pastas próprias. Validar caminho absoluto e propriedade antes da limpeza. Não mudar o TEMP/TMP global, runtime, host ou configurações de proteção.

A carga é sintética, não a suíte completa. As três fases não medem taxa histórica da CI nem provam a causa dos dois casos anteriores.

## Critérios propostos antes do código

- C49: o job novo só executa em workflow_dispatch, tem10min e não altera ou substitui nenhum job/check regular. A prova de governança existente mantém as asserções sobre a matriz, passos, runner, aggregate, permissões e ausência de publicação/IA; acrescenta as condições do job manual.
- C50: provas controladas do script distinguem amostras completas, caminhos equivalentes, limite de tempo com amostras pendentes, erro de E/S e dados vazios. Os percentis, contagens e limiares600/650 exigem valores exatos. Limpeza recusa diretórios fora da árvore própria; o supervisor não encerra processos alheios. Nenhum agente real é iniciado.
- Registrar esses critérios na issue/task/checklist após aprovação e antes do código. Novos testes em `scripts/ci-lock-latency.test.mjs`, incluídos em `test:governance` do package.json (pacote continua privado).
- Autor Claude implementa/prova. Verificação independente e revisão Codex necessárias seguem a autorização “Pode fazer quantas precisar”, com histórico preservado. Publicar a branch somente após PASS/ready.
- Acionar uma execução manual sobre esse HEAD e coletar as três fases. Não reexecutar CI inalterada até obter verde.
- Se houver evidência de diferença, preparar a mitigação mínima com essa evidência para decisão; se não reproduzir ou for incompleto, declarar inconclusivo. Não atribuir a causa ao runner, Defender, relógio ou disco por hipótese.
- Merge segue autorizado somente quando todos os checks regulares do HEAD aprovado estiverem verdes; nenhum resultado do diagnóstico substitui essa condição.

## Arquivos previstos

`.github/workflows/governance.yml`; `scripts/ci-lock-latency.mjs`; `scripts/ci-lock-latency.test.mjs`; `scripts/governance-ci.test.mjs`; alias `test:governance` em `package.json`; task/checklist/build/evidências da mesma issue25 e PR28. Os cinco arquivos do core de revisão permanecem intactos.

## Por que precisa de aprovação

A autorização atual permite o diagnóstico do I23-C10 e apenas os orçamentos regulares20/10/5 do workflow. Um job e uma ferramenta de medição novos ampliam esse escopo. Nenhuma mudança foi implementada com base apenas neste documento.


## Estado da implementação

Registro antes do código em `0362aec` (critérios 41–42 com a exceção datada ao critério 40, Landing com o job, o script e a exceção ao C48, S12 com C49–C50) e ajuste do Landing antes das provas em `39278dd`; job `lock_diagnostics`, `scripts/ci-lock-latency.mjs`, as provas `governance-C49` e C50 e o alias `test:governance` em `3843867`. Provas, comandos e resultados na seção “Medição comparativa do lock na CI Windows” de `.checks/issue-25-agent-launch.build.md`: controles e mutações, conferência do C48 com a exceção, alvo de 147 testes com 141/0/6 em Windows 24.22.1, Windows 24.13.0 (clone com `core.autocrlf=true`) e WSL isolado, e `npm test` completo com exit 0 (1.019 testes, 999 pass, 0 fail, 20 skip). A medição no runner ainda não foi feita: o job manual é acionado pelo orquestrador depois de PASS, `ready` e publicação, e a causa continua desconhecida.

Correção dos achados 2 e 3 da verificação 13 (relatório em `0e0325f`, preservado): registro em `7198fef` e código em `6a242a2`, só no script e na prova dele. A limpeza que falha passa a sair em `limpeza.falhas` sem perder fases. O teto, um erro no início da fase e o `'error'` de um filho encerram só os filhos próprios e esperam o fechamento de cada um, com `interrompidaPorErro` na fase. Os prazos e as quantidades desta proposta não mudam. Provas, RED/GREEN e os gates A/B/C/D estão na seção “Achados 2 e 3 da verificação 13 na ferramenta de medição” do build. A medição no runner continua por fazer, pelo orquestrador, depois do Verifier 14, da formal e da publicação.
