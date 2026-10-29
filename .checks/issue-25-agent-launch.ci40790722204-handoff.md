# CI 40790722204 e execução manual 40790906319 do PR #28 — ambiente do passo de integrações no Windows (handoff pontual, 28/10/2026)

Escopo: a decisão de implementação do coordenador no
[handoff 6484289722](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6484289722), reversível e restrita
à CI, dentro das autorizações 6467154706 (“Pode fazer a medição comparativa. Mantém os testes e prazos e segue até a
CI ficar toda verde para fazer o merge do PR #28.”) e 6442514838 (“Pode fazer quantas precisar”). Só
`.github/workflows/governance.yml` e `scripts/governance-ci.test.mjs` mudam. Produto, testes funcionais, prazos,
carga, paralelismo, retry, perdas, orçamentos, outros sistemas, jobs e a medição não mudam.

## O que falhou (HEAD `86c7677`)

- **PR 40790722204**: os cinco checks verdes (Windows 1.055/1.024/0/31).
- **Manual 40790906319**: Windows e agregado vermelhos; diagnóstico, Ubuntu e macOS verdes. No Windows, só as
  integrações (597/570/3/24):
  - `control.cli.test.mjs:547` (I23-C4): `listCaptures` com `lock_present`, depois de um `writeExclusive
    segmento.tmp` pendente há 310 ms após 424 ms de operações concluídas;
  - `control.cli.test.mjs:906` (I23-C4): hook com `open lock` pendente há 651 ms, laço de eventos 25,6 ms, CPU
    15 ms e lock de 0 byte;
  - `concurrency.cli.test.mjs:1008`: controle positivo do C46 com `delivery_timeout`, sem produtor registrado.
- Log integral: `.checks/code-review/issue-25/ci86-windows-manual40790906319.log`.

## O que se sabe e o que não

- **Causa**: desconhecida. Nenhuma causa física (antivírus, disco, hardware) foi demonstrada, e nada aqui afirma
  defeito do produto nem correção dele.
- **Medição do mesmo job** (`measurement40790906319.*`): 4.500/4.500 ciclos, sem erro nem incompleto. Tomada
  p50/p99/máximo: A1 0,832/6,491/46,601; B (`RUNNER_TEMP`) 0,539/1,629/4,262; A2 0,834/6,374/17,222 ms. Compara o
  componente de E/S do lock no mesmo runner; não reproduz o pipeline das provas nem prova que as falhas deixam de
  ocorrer.

## O que muda para a próxima CI

- No `verify`, o passo de integrações vira dois ramos exclusivos por `matrix.os`. Ubuntu e macOS: o mesmo passo de
  antes. Windows: no pwsh padrão, valida o `RUNNER_TEMP` (caminho absoluto de uma pasta existente; senão para antes
  do npm, sem fallback), põe `TEMP`/`TMP` nele só no processo do passo e chama `npm run test:integrations`,
  devolvendo o resultado.
- Forma literal, alternativas e provas: linhas “Ambiente do passo de integrações no Windows” e “Exceção ao C48
  (passo de integrações)” do Landing e o acréscimo do C48 em `.checks/issue-25-agent-launch.md`.

## Pendente, com o coordenador

- A verificação independente e a revisão formal do novo conteúdo, a publicação, a CI do novo HEAD (que prova o
  passo no runner) e o merge. Nada aqui afirma PASS, `ready` nem CI verde.
