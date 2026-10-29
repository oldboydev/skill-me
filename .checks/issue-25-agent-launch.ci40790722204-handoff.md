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

## Provas do autor (registro `c7e8f14`, código `169e845`, gates em `a50870f`; detalhes no build e no Handoff do checklist)

- **RED**: os dois `governance-C48` falham com o workflow de `86c7677`; **GREEN** no código.
- **Mutantes** numa cópia descartável: os 13 (roteamento, propagação, configuração, persistência, argumentos,
  ambiente, orçamento e shell) são recusados; o teste antigo falha contra o workflow novo só no `governance-C1 C3`,
  cuja lista foi adaptada sem o ramo do Windows.
- **Código de saída**: no `pwsh -command ". '{0}'"` do runner, o npm em 17 chega ao job como 1 (conversão do
  `-Command`, a mesma dos outros passos Windows); 0 continua 0.
- **Gates**: A 27/27/0/0 e B 27/27/0/0 (com o caso do pwsh real executado), C 27/26/0/1 (o skip é esse caso, com o
  motivo) e D 1.057/1.037/0/20, exit 0, com os nativos do Hermes e os 20 skips da R20.
- **Identidade**: fora de `.checks`/`.tasks`, só o workflow e `governance-ci.test.mjs` mudaram desde `86c7677`.
- Nada aqui prova o passo no runner nem que as falhas deixam de ocorrer.

## Revisão do coordenador: literal do caminho no `-Command` da prova nativa (mesmo autor, sobre `c68a392`)

- **Achado**: a prova nativa monta `. '${script}'` sem escapar a aspa simples do caminho; um caminho Windows válido
  com `'` quebra o `-Command`. Defeito da harness, não do produto nem do workflow.
- **Confirmado na sondagem** com `passo ' literal.ps1`; as aspas tipográficas `‘ ’ ‚ ‛` quebram do mesmo jeito.
- **Correção planejada**: só no teste, dobrando cada aspa simples que o PowerShell reconhece no literal do caminho,
  com dois arquivos próprios com aspas no nome e o mesmo `run` do YAML, npm 0 → 0 e npm 17 → 1 para cada um. O shell
  padrão, o `-Command`, o 17 → 1 e o workflow não mudam.
