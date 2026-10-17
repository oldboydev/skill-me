# Issue #4 — observar execuções em Claude Code, Codex e Hermes

Perfil `light`, handoff `on`. Checklist escrito antes de qualquer teste ou código de
produto; é a barra da implementação e não muda para acomodá-la.

Sources:

- [Issue #4](https://github.com/oldboydev/skill-me/issues/4) e
  `.checks/code-review/issue-4/issue-body-approved.md` — problema, 9 AC (AC1 já com o
  recorte aprovado), restrições.
- Conversa de 16/10/2026 — aprovação humana do recorte: fronteira mínima e receptor em
  memória; privacidade completa e armazenamento nas #5/#8; sem instalação pessoal,
  E2E com modelos, coleta bruta, servidor, armazenamento, push ou PR.
- Conversa de 16/10/2026 — renegociação explícita de C39 após F5 do Verifier:
  à pergunta "Confirma ajustar C39 para proibir conteúdo bruto nas saídas e registros
  próprios do debugger, preservando byte a byte a saída original do Codex, como já
  previsto no plano?", o proprietário respondeu "Confirmo o ajuste ao plano".
  O texto anterior de C39 e o FAIL da primeira rodada permanecem no histórico Git;
  não houve alteração do comportamento ou das asserções para obter aprovação.
- `.tasks/issue-4-integracoes.md` — 14 critérios em 5 fatias e a seção "Fronteira
  mínima — assinatura fechada (U1)", que fixa envelope, limites, comandos e códigos.
- `AGENTS.md` — regras de teste, reúso, governança; `package.json` privado.
- `docs/agent-compatibility.md` e `src/doctor/*` — evidência estática existente e
  exports reutilizados (`projectConfig`, `readBoundedText`, `resolveAgents`,
  `createProductionFsAdapter`, `CLAUDE_MANAGED_SETTINGS_PATH`, `ONE_MIB_BYTES`,
  `CliUsageError`).
- Contratos nativos (16/10/2026): `code.claude.com/docs/en/hooks` e
  `/docs/en/permissions`; `openai/codex` tag `rust-v0.162.1` (`hooks/src/schema.rs`,
  `hooks/src/engine/command_runner.rs`, `exec/src/exec_events.rs`, `exec/src/cli.rs`)
  e `learn.chatgpt.com/docs/hooks`; Hermes 0.21.4 local (`hermes_cli/plugins.py`,
  `plugins_dispatch.py`, `model_tools.py`, locais de disparo citados no plano).

## Out of scope

- Política integral de coleta/retenção (#5), transporte/armazenamento/consumidor real
  (#8), timeline e atribuição de skill (#6), conformidade (#7) — o recorte aprovado
  entrega só a fronteira mínima e o receptor em memória.
- Instalação em perfil pessoal, habilitar plugin/hook no perfil do proprietário,
  conceder confiança nativa, E2E com modelos reais — sem autorização; ficam pendentes.
- Hooks `UserPromptSubmit`/`Stop`/`PreCompact`/`PostCompact`/`Interrupt` — existem nos
  contratos, mas o payload traz prompt/mensagem e nenhum critério os exige; listados
  como não assinados na matriz.
- Edição de `config.toml` do Codex ou `config.yaml` do Hermes — o instalador escreve só
  `hooks.json`, `settings.json` e a pasta própria do plugin.
- Alterar `doctor`, `AGENTS.md`, motor `scripts/code-review` ou outras issues.

## Landing

Novo módulo `src/integrations/` (CLI separada do doctor, fronteira, receptor,
adaptadores, wrapper, instalador) e plugin Python em `src/integrations/hermes/plugin/`.
Reutiliza do doctor, por import: validação/leitura de configuração (`projectConfig`,
`readBoundedText`, `createProductionFsAdapter`), resolução do pacote Codex
(`resolveAgents`), caminho de política gerenciada, `ONE_MIB_BYTES` e `CliUsageError`.
Nenhuma dependência nova; `yaml`/`smol-toml` já existentes só pelo doctor.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Envelope v1 consumido por #5/#6/#8 | `{schemaVersion:1, source:{agent,mechanism,contract}, signal, eventKind, nativeEvent, ids, fields, gaps, observedAt}`; tabelas de `eventKind`/campos/enums do plano | envelope por agente — #6 teria três formatos para correlacionar; payload nativo filtrado em vez de normalizado — vazaria nomes e formas específicos para cada consumidor |
| IDs nativos nunca truncados | ID > 256 caracteres, vazio ou não string → omitido + `id:too_long`/`invalid_type` | truncar com marca — produziria um ID que o agente nunca emitiu |
| Campos `name` sem truncamento | regex `^[\p{L}\p{N} ._:/@+-]{1,128}$`u; fora disso → omitido + lacuna | truncar com "…" (rascunho anterior) — fabricaria um nome e deixaria texto livre passar |
| Python só projeta nomes de `kwargs.json` | `{hook, kwargs:{<nome listado>: escalar inalterado}, nonScalar:[…]}`; fronteira roda no `ingest` Node | rascunho anterior com envelope montado em Python pela mesma especificação — duplicaria tipos/limites/lacunas em duas linguagens; repassar `kwargs` brutos ao Node — tiraria argumentos/resultados do processo do agente |
| Hermes sem entrega = inativo | sem `SKILL_ME_HERMES_DELIVERY`, callback devolve `None` sem fila/thread/processo | iniciar sempre um `ingest` Node por processo Hermes — custo sem consumidor real |
| Exportador de relatório só por variável explícita | `SKILL_ME_OBSERVER_REPORT_FD` (hook/ingest 2..9; wrapper 3..9), uma linha JSON ao sair, ≤ 1000 ms | arquivo de relatório — seria persistência (#5/#8); stdout — no Claude/Codex vira contexto/decisão |
| Entrada Claude em forma exec | `{"type":"command","command":<node>,"args":[<cli>,"hook","--agent","claude"],"timeout":10}` sem `matcher` | forma shell — citação diferente entre Git Bash e PowerShell no Windows, quebra com espaços/Unicode |
| Entrada Codex em `hooks.json` com linha citada | Windows `"<node>" "<cli>" hook --agent codex` (recusa `"`, `%`, CR/LF); POSIX aspas simples | editar `[hooks]` de `config.toml` — reescrita TOML perderia comentários/formatação do usuário |
| Registro de propriedade | `<target>/.skill-me/<agente>-install.json`: versão, arquivo, SHA-256 do JSON canônico de cada grupo/artefato próprio e o que foi criado | backup integral do arquivo — copiaria segredos e apagaria edições posteriores ao restaurar |
| Escrita com lock + comparação + rename | lock `wx`, temporário no mesmo diretório, releitura e SHA-256 igual à leitura inicial, `rename`; divergência → 4 | escrita direta — perde edição concorrente; CAS com editores arbitrários — não existe no sistema de arquivos |
| CLI `integrations` e códigos | `plan|install|uninstall --agent … --target … [--apply] [--json]`, `run`, `hook`, `ingest`; códigos 0/2/3/4/5; wrapper 127/126/código do filho | subcomando do doctor — doctor é somente leitura e sem execução por contrato da #3 |
| Suite nova na CI | script `test:integrations`, incluído em `npm test` e como passo do job `verify` | rodar só localmente — a matriz de três SO declarada não exercitaria a #4 |
| Resolução padrão do Codex no wrapper (acrescentado no build, antes do código) | sem `--codex-entry`: `resolveAgents` (export existente do doctor) → caminho do launcher; executável nativo ou launcher POSIX (link/script com shebang) é iniciado sem shell; launcher `.cmd`/`.bat` no Windows → 127 com mensagem fixa pedindo `--codex-entry <…/@openai/codex/bin/codex.js>` | acrescentar `packageDir` ao retorno do Codex no doctor — mudaria um export do doctor, fora do recorte ("reusar pelos exports existentes"); reinterpretar o shim npm aqui — duplicaria o parser do doctor; iniciar o `.cmd` com shell — reinterpretaria os argumentos |
| `not_in_contract` derivado pela fronteira (acrescentado no build, antes do código) | chave presente em `draft.fields` = o contrato fornece (valor ausente → `absent`); campo do `eventKind` sem chave → `<campo>:not_in_contract`; tradução impossível no adaptador → `draft.fieldGaps: {campo: motivo}` com motivo do vocabulário fechado | lista `notInContract` mantida à mão por adaptador — esquece campo em silêncio quando um `eventKind` ganha campo novo |
| Reescrita não amplia o acesso POSIX (acrescentado na correção formal F2, antes do código) | POSIX: modo/dono/grupo do arquivo substituído (`stat`); temporário criado (`wx`) só com os bits de dono do original; grupo do temporário diferente → `fchown(-1, grupo original)`; sem permissão para isso, bits de grupo limitados aos de "outros"; `fchmod` aos bits finais (iguais aos do original quando o grupo confere) antes de escrever o conteúdo; modo/dono/grupo reconferidos junto com o hash antes do `rename` (mudou → 4). Dono do arquivo novo é o processo (sem privilégio não há `chown` de dono); ACL POSIX/Windows, xattr e bits especiais não são preservados nem detectados. Windows: inalterado (acesso por ACL; modo do `stat` não a representa) | `chmod` depois de escrever — janela com o conteúdo sob o modo amplo, e quem abrir o arquivo nessa janela continua lendo; criar já com o modo final — com o grupo errado concederia acesso a outro grupo antes do `fchown`; reescrever o próprio arquivo (preservaria inode e ACL) — perde a troca única e a comparação de hash antes do `rename` da linha "Escrita com lock + comparação + rename" |
| Grupo não atribuível: interseção de grupo e "outros" (acrescentado na correção formal F2 após o contraexemplo do coordenador, antes do código que o fecha; substitui só a regra de grupo da linha anterior) | grupo do temporário diferente do original e `fchown` negado → bits de grupo **e** de "outros" = interseção dos dois no original; bits de dono intactos (0640 → 0600, 0604 → 0600, 0664 → 0644) | limitar só o grupo novo aos bits de "outros" (linha anterior) — em 0604 quem pertencia só ao grupo antigo não lia, passa a "outros" e ganharia leitura; recusar a substituição — a interseção já impede ampliação nos quatro casos de pertencimento sem impedir a instalação |
| Reinstalação sobre grupo próprio editado (acrescentado na correção formal F3, antes do código) | `install`: evento sem o grupo registrado e sem grupo idêntico ao canônico, mas com grupo de assinatura própria → conflito `owned_entry_modified` (há registro; a entrada registrada permanece nele) ou `owned_entry_unrecorded` (sem registro); nada é acrescentado nem adotado nesse evento; os demais eventos seguem e o código é 4, como na remoção com conflito. `uninstall`: grupo de assinatura própria que resta depois da remoção, sem conflito já reportado no evento → `owned_entry_unrecorded`, 4 | acrescentar o canônico ao lado (comportamento anterior) — dois observers no evento e remoção seguinte com sucesso falso e registro apagado; adotar o grupo editado pela assinatura — tomaria como próprio o conteúdo alterado pelo usuário e o apagaria na remoção; recusar a instalação inteira — impediria completar os eventos intactos, ao contrário da remoção, que aplica o resto e reporta 4 |
| Escrita acima do teto de leitura (acrescentado na correção formal F4, antes do código) | os planos puros de instalação e remoção medem `Buffer.byteLength(texto novo, "utf8")`; acima de `ONE_MIB_BYTES` (mesmo teto, inclusivo, de `readBoundedText`/`projectConfig`) → 3 `invalid_config` com erro `{code: "output_too_large", file}`, sem escrita nem registro, também na prévia; até o teto, inclusive, segue | gravar e deixar a leitura seguinte falhar (comportamento anterior) — instalação "concluída" que depois não reinstala nem remove; aumentar o teto ou encurtar valores do usuário — muda o contrato ou perde dados; conflito 4 ou incompleto 5 — não há conflito nem mutação iniciada, e o 3 já significa "configuração não substituída", inclusive por tamanho |
| Temporário de nome fixo já ocupado ou mexido depois da criação (acrescentado na correção formal round 2 F2, antes do código; corrige o pressuposto, presente só no código, de que um arquivo regular nesse nome era sobra própria) | temporários que a aplicação vai criar — `<settings.json\|hooks.json>.skill-me-tmp` e `.skill-me/<agente>-install.json.skill-me-tmp`: qualquer entrada já presente (arquivo regular, diretório, junção/link) é alheia → prévia e aplicação 4, `foreign_artifact` com o caminho do temporário, `changes: []`, nada escrito, apagado ou seguido; só conta o temporário de que a aplicação precisaria. Posto por outro depois da leitura (`wx` falha com `EEXIST`) → o mesmo conflito. Depois da criação, o temporário só é renomeado ou apagado enquanto for arquivo regular com exatamente os bytes gravados (tamanho e SHA-256 — caminho, tipo e hash, a identidade já usada para artefatos); editado, trocado ou removido → 4 `config_changed_during_apply` no temporário, sem `rename` nem exclusão; falha de E/S posterior apaga só o temporário que continua nosso. Sobra de execução interrompida também fica e é reportada (remoção manual). Entre a última conferência e o `rename`/`unlink` vale o mesmo limite não atômico da linha "Escrita com lock + comparação + rename" | apagar o arquivo regular pelo nome (comportamento anterior) — perde conteúdo recuperado ou editado pelo usuário; nome fixo e lock só excluem outros processos do skill-me, não provam autoria do conteúdo; adotar como sobra o temporário com os bytes do texto novo — só cobre a repetição imediata da mesma operação e acrescenta um ramo sem consumidor demonstrado; nome aleatório por execução — sobras se acumulariam sem aviso e a troca depois da criação continuaria possível; inode além do conteúdo — muda o modelo de identidade vigente sem necessidade demonstrada; journal ou cópia do conteúdo anterior — copiaria dados privados (linha "Registro de propriedade") |
| Substituição negada por handle aberto de outro processo (acrescentado na correção formal round 2, depois de medir `I4-C29` no Windows e antes do código; defeito do contrato de C29 "cada código ∈ {0,4}", dentro do AC6) | `rename` do temporário sobre a configuração ou o registro que falha com `EPERM`, `EACCES` ou `EBUSY` é repetido até 6 vezes, depois de 10, 20, 40, 80, 160 e 320 ms (no máximo 630 ms de espera); antes de cada tentativa repetem-se a conferência do temporário (arquivo regular com os bytes gravados, linha anterior) e as do chamador (SHA-256 e acesso da configuração lida) — mudou → 4, sem rename. Esgotado, ou outro código → 5 como antes, saindo só o temporário nosso. Mesma regra em todas as plataformas: no Windows esses códigos aparecem enquanto outro processo (o agente, um editor, antivírus, a prévia de outro skill-me) mantém o arquivo aberto; no POSIX indicam permissão real e só atrasam o 5 | relatar 5 na primeira falha (comportamento anterior) — medido no Windows: `I4-C29` saía 5 em 2 de 25 execuções isoladas no produto `7147ac0` (EPERM no rename com 6 aplicações paralelas), contra o contrato; tratar o código como conflito 4 — confundiria permissão negada com concorrência; repetir sem refazer as conferências — promoveria um temporário trocado ou sobrescreveria uma edição feita no intervalo; espera longa (≈ 60 s, como no graceful-fs) — sem necessidade medida (na sonda, toda substituição negada passou na primeira nova tentativa); só no Windows — a regra ficaria sem prova nos testes POSIX |
| Entrada instável na contenção (acrescentado depois da nota do coordenador sobre `c914e5d`, antes do código; registra também a nova sondagem de `c914e5d`, que entrou sem linha própria) | em `assertContained`, `realpath` com `ENOENT` para uma entrada que o `lstat` encontrou e que não é link (sumiu nesse intervalo — ex.: temporário de outro processo do skill-me renomeado) → o mesmo caminho é sondado de novo, no máximo 3 vezes por chamada; além disso → 4 `config_changed_during_read` com o caminho, antes de qualquer leitura ou escrita. Link pendente continua `target_escape`; o que resolve fora do alvo continua recusado | `ENOENT` direto como falha de E/S (comportamento até `0481b28`) — `I4-C29` saía 5 no Windows; repetir sem limite (`c914e5d`) — laço sem progresso se a entrada oscilar a cada sondagem (prova: 1000 repetições, até o instrumento parar); `target_escape` ao esgotar — afirmaria um link para fora que não existe; prazo/timeout genérico — não pedido e sem necessidade medida |
| Registro, lock e pasta de estado conferidos antes de cada efeito (acrescentado na verificação independente round 5, antes do código; R5-F1/F2/F3, dentro do AC6/C27/C30/C31) | **Pasta de estado:** depois do `mkdir` e antes de criar o lock, o caminho real de `.skill-me` — contido no alvo e diretório; junção/link já presente que resolve dentro do alvo continua aceito, como em `I4-C34d` — vira a referência da execução. Antes de ler o registro sob o lock, de criar o temporário do registro, de cada tentativa de `rename` dele, de apagá-lo numa falha, de apagar o registro e de liberar o lock, a pasta precisa resolver para o mesmo caminho real e ser diretório: resolve fora do alvo → 4 `target_escape` (`.skill-me`); outro caminho, arquivo ou ausente → 4 `config_changed_during_apply` (`.skill-me`); nada é lido, escrito ou apagado através dela. **Registro:** o texto lido sob o lock, o mesmo que decide o plano, é a identidade conferida antes de cada `rename` (inclusive as novas tentativas por `EPERM`/`EACCES`/`EBUSY`) e antes da exclusão — lido ausente → o caminho continua sem nenhuma entrada; lido presente → arquivo regular (não link) com exatamente os mesmos bytes (identidade por caminho, tipo e hash dos temporários e artefatos). Senão → 4 `config_changed_during_apply` no registro, a entrada encontrada fica intacta, os passos anteriores continuam `done` e nada é desfeito; registro ausente na hora de apagar também é 4, não sucesso idempotente. Na leitura, registro presente que não é arquivo regular (link, junção, diretório) → 4 `foreign_artifact`, prévia e aplicação, antes de qualquer mutação (antes: link seguido; diretório → 3). **Lock:** criado com `wx` com `<pid>\n`; em sucesso, conflito ou erro só é apagado (e a pasta vazia removida) pela mesma pasta e enquanto for o arquivo regular com esses bytes. Ausente, editado, trocado por arquivo, diretório ou link, ou com a pasta trocada → fica, e o resultado ganha 4 `config_changed_during_apply` em `.skill-me/<agente>.lock` sem esconder o principal: 0 → 4 com passos `done` e `applied: true`; conflito principal → os dois conflitos; 5 → continua 5 com o conflito listado. Falha de E/S ao conferir ou apagar o lock → ele fica, passo `lock: failed` e 5. Limite: entre cada conferência e o syscall não há atomicidade (linha "Escrita com lock + comparação + rename"); bytes idênticos não se distinguem; um diretório real novo no mesmo caminho só é percebido pelo conteúdo do registro e do lock | reusar `replaceChecked`/`deleteChecked` da configuração como estão — o leitor limitado segue link (um link para cópia idêntica do registro seria substituído ou apagado) e trata diretório como ilegível (5 em vez de conflito); mudar essas duas funções alteraria a configuração, fora dos achados; conferir só a contenção — impede efeito fora do alvo, mas a pasta trocada por link para outra pasta do alvo levaria leitura e escrita a arquivos do usuário de mesmo nome; exigir `.skill-me` diretório real desde a leitura — quebraria o contrato de `I4-C34d` (junção dentro do alvo posta antes do comando: a remoção conclui e o link fica) sem necessidade demonstrada; tratar registro ou lock ausente como sucesso idempotente — sob o lock só outro programa os tira, e o 0 esconderia que a pasta de estado mudou durante a aplicação; desfazer a configuração já gravada ao achar o conflito no registro — o rollback sobrescreveria edições do usuário (linha "Registro de propriedade"); inode, conteúdo aleatório no lock, journal, CAS ou cópia do registro — mudariam o modelo de identidade sem necessidade demonstrada, não existem no sistema de arquivos ou copiariam dados; engolir a falha do `unlink` do lock (comportamento anterior) — o lock que fica bloqueia as execuções seguintes (`lock_present`) enquanto a execução dizia 0 |
| Ancestral `plugins` do Hermes e caminho real do alvo Claude conferidos (acrescentado na revisão formal round 3, antes do código; F1/F2, dentro do AC6/C27/C34) | **`plugins` (Hermes):** a mesma conferência da pasta de estado (caminho real contido no alvo e diretório), agora por pasta: lida sob o lock antes da pasta do plugin e do staging — ou, quando a própria instalação cria `plugins`, logo depois do `mkdir` —, o caminho real de `plugins` vira a referência da execução; junção/link já presente que resolve dentro do alvo continua aceito, como em `I4-C34d`. Antes de cada leitura e exclusão de artefato, de cada exclusão de bytecode, do `rmdir` do `__pycache__` e da pasta do plugin, de cada exclusão da sobra própria do staging e do `rmdir` dela, da criação do staging, de cada artefato gravado nele e do `rename` dele, `plugins` precisa resolver para o mesmo caminho real e ser diretório: fora do alvo → 4 `target_escape` (`plugins`); outro caminho — inclusive outra pasta do alvo com cópias exatas dos artefatos —, arquivo ou ausente → 4 `config_changed_during_apply` (`plugins`). Nada mais é lido, gravado ou apagado através dele; o que já saiu ou foi gravado fica assim (sem rollback), o staging já gravado fica onde está e o registro não é tocado. A conferência anterior de que a pasta do plugin e o `__pycache__` continuam diretórios reais permanece depois desta. **Alvo Claude:** depois de `resolveTarget`, o caminho real passa pela mesma `isManagedPolicyTarget` — diretório gerenciado de `CLAUDE_MANAGED_SETTINGS_PATH` ou descendente → 4 `managed_policy_target` —, antes de qualquer leitura de configuração, registro, lock ou temporário; só o `stat` e o `realpath` do próprio alvo vêm antes, e `target` no resultado continua o argumento. A recusa textual, sem nenhum acesso, continua antes de tudo. O diretório gerenciado é a constante, sem resolver link nele: o produto nunca o acessa, e um diretório gerenciado que seja ele mesmo link não é seguido (limite). Limite comum: entre cada conferência e o syscall não há atomicidade; outro diretório real posto no mesmo caminho não se distingue | **F1:** conferir só o `lstat` do filho (comportamento anterior) — atravessa o ancestral trocado e apagava cópias externas com o hash do registro; conferir só a contenção — `plugins` trocado por link para outra pasta do alvo com cópias exatas teria os arquivos apagados; referência na pasta do plugin — a instalação e o staging passam por `plugins` antes de a pasta do plugin existir e ficariam sem guarda; exigir `plugins` diretório real desde a leitura — quebraria `I4-C34d`; sondar cada ancestral até a raiz do sistema — o `realpath` de `plugins` já resolve todos, e a raiz é o caminho real resolvido no início; desfazer o que já saiu ou foi gravado — recriaria ou apagaria arquivos sem prova de propriedade; copiar `stateDirRealPath` para `plugins` — duas regras iguais em silêncio (a função passa a receber a pasta). **F2:** só a comparação textual (comportamento anterior) — o alias passava e o diretório gerenciado virava a raiz autorizada; `realpath` do diretório gerenciado — acessaria o diretório de política em toda instalação Claude, inclusive nos testes; recusar todo alvo que seja link — quebraria alias legítimo (perfil ligado a outro disco); conferir só antes de escrever — a prévia já leria a configuração do diretório gerenciado |
| Staging próprio, destino da promoção e raiz da configuração conferidos antes de cada efeito (acrescentado na verificação independente round 7, antes do código; R7-F1/F2/F3, dentro do AC6/C25/C27/C34) | **Staging (Hermes):** `plugins/.skill-me-observer.skill-me-tmp` só é nosso como diretório real dentro de `plugins` no caminho real de referência (linha anterior). Antes do `readdir` da sobra própria, de cada conferência e exclusão de arquivo dela e do `rmdir` — também na limpeza depois de um `rename` falho —, de cada artefato gravado nele e do `rename` que o promove, `plugins` é conferida e o staging precisa continuar diretório real pelo `lstat`, sem seguir link: junção/link (para dentro ou para fora do alvo), arquivo ou ausência → 4 `config_changed_during_apply` no staging. Nada mais é lido, gravado, apagado ou promovido através dele; o link fica e o que já saiu ou foi gravado fica onde estiver, sem rollback. Essa conferência substitui a contenção e o tipo checados uma vez no início da limpeza (diretório real numa `plugins` conferida já resolve dentro do alvo); uma troca nesse ponto também passa de `foreign_artifact` a `config_changed_during_apply`. **Destino da promoção:** depois dessa conferência e antes do `rename`, a pasta do plugin precisa continuar sem entrada, como o plano a leu — é a única condição em que o plano grava artefatos. Qualquer entrada surgida (diretório real vazio ou não, arquivo, junção/link) é alheia → 4 `foreign_artifact` em `plugins/skill-me-observer`, sem `rename`: o destino fica com tipo, bytes e árvore, o staging próprio completo fica onde está (a instalação seguinte o limpa como sobra própria quando o caminho estiver livre) e o registro não é gravado. Mesma regra em todas as plataformas — no POSIX o `rename` substituiria com sucesso um diretório vazio; no Windows ele já falhava. Entrada surgida entre essa conferência e o `rename` continua no `catch` anterior (limpeza da sobra própria e `foreign_artifact`). **Raiz da configuração:** o caminho real do alvo resolvido no início é a referência da execução, com a mesma regra de `.skill-me` e `plugins` (`dirRealPath`/`dirUnchangedGuard` sobre a própria raiz). Antes de cada efeito que passa só por ela — criação do temporário da configuração do Claude/Codex, cada tentativa de `rename` dele (inclusive as novas tentativas por `EPERM`/`EACCES`/`EBUSY`), limpeza dele numa falha, exclusão da configuração e `mkdir` de `.skill-me` (três agentes) e de `plugins` (Hermes) —, a raiz precisa resolver para o mesmo caminho real e ser diretório: ela ou um ancestral trocados por junção/link → 4 `target_escape` em `.`; arquivo no lugar dela → 4 `config_changed_during_apply` em `.`. Antes de cada leitura da configuração sob o lock (a que decide o plano, a releitura antes de cada tentativa e a da exclusão) e do `unlink` da exclusão, além da raiz, o próprio arquivo precisa continuar contido (`assertContained`): link posto durante a aplicação que leve para fora → 4 `target_escape` no arquivo, nada lido nem apagado através dele, e a limpeza do temporário próprio continua, porque a raiz não mudou. O que já foi gravado fica (sem rollback); o temporário criado antes da troca fica na pasta movida (nada apagado através dela); o lock, com a pasta de estado movida junto, fica e é reportado (linha de R5). Link inicial contido continua aceito e substituído pelo `rename` (julgado na rodada 6). Limite comum: entre cada conferência e o syscall não há atomicidade; outro diretório real posto no mesmo caminho — inclusive no lugar da raiz ou do staging — e arquivo com bytes idênticos não se distinguem | **R7-F1:** conferir só `plugins` (comportamento anterior) — o filho trocado depois da primeira exclusão ou gravação, ou antes da promoção, passava: cópias exatas de outra pasta apagadas, artefatos gravados fora do alvo, link promovido a pasta do plugin e junção removida pelo `rmdir` no Windows; conferir o tipo só no início da limpeza — não cobre as iterações seguintes; caminho real do staging como referência, como `plugins` — aceitaria junção para dentro do alvo, que pela regra do staging é alheia; conferir também o conteúdo do staging antes da promoção — fecharia o limite já registrado do artefato alterado num staging real (bytes, não tipo), fora dos achados. **R7-F2:** só o `catch` do `rename` (comportamento anterior) — no POSIX o diretório vazio era substituído sem erro e a instalação saía 0 tomando a pasta do usuário, que a remoção apagaria depois como nossa; `rename` sem substituição ou CAS — não existe em todas as plataformas nem pela API do Node; limpar o staging ao recusar — apagaria conteúdo próprio depois de o conflito já estar decidido, e a instalação seguinte já o recupera; tratar diretório vazio como "nada a preservar" — a identidade da pasta do usuário passaria a ser nossa. **R7-F3:** guardas só da pasta de estado (comportamento anterior) — a configuração já tinha sido gravada ou apagada fora da raiz quando o registro recusava; conferir só a contenção do arquivo em todo efeito — a limpeza do temporário próprio deixaria de acontecer quando só o arquivo vira link para fora, com a raiz intacta; referência no caminho real do arquivo da configuração — um link inicial contido mudaria a referência a cada `rename`; sondar ancestrais até a raiz do sistema, inode, ponto de montagem ou CAS — o `realpath` da raiz já resolve os ancestrais, e os demais mudariam o modelo de identidade sem necessidade demonstrada; desfazer a configuração gravada — sobrescreveria edições do usuário |
| Acesso do temporário vem da configuração conferida antes de qualquer conteúdo gravado (acrescentado na verificação independente round 8, antes do código; R8-F1, dentro do AC6/C25) | Reescrita de `settings.json`/`hooks.json` lida presente sob o lock, antes de criar o temporário: (1) raiz e contenção do próprio arquivo (`configContained`, linha anterior); (2) modo/dono/grupo do arquivo (`stat`, POSIX) — o acesso que o temporário vai receber; (3) a conferência que já precedia cada tentativa de `rename`, agora numa só função usada nos dois lugares: raiz e contenção, releitura com o SHA-256 da leitura sob o lock e modo/dono/grupo iguais aos do passo (2). Só então o temporário é criado com esse acesso (bits de dono, grupo e modo antes do conteúdo — linha "Reescrita não amplia o acesso POSIX"). Configuração trocada depois da leitura — arquivo regular diferente (com qualquer acesso), link para fora do alvo, conteúdo editado ou removido, ou acesso alterado entre (2) e (3) — → 4 (`config_changed_during_apply` ou `target_escape` no arquivo), **sem criar o temporário**: nenhum conteúdo calculado da leitura é gravado com o acesso de outro documento. A mesma conferência continua antes de cada tentativa de `rename` (inclusive as novas tentativas por `EPERM`/`EACCES`/`EBUSY`) e a limpeza no `catch` segue a linha anterior. Configuração ausente na leitura: a conferência (3) exige que ela continue ausente antes de criar o temporário (antes, só antes do `rename`). Windows: mesma ordem; sem acesso POSIX (ACL), o passo (2) não lê nada. O acesso aplicado é o do documento que será substituído no instante da conferência: mudado pelo dono no próprio arquivo antes de (2), é o desse arquivo; depois de (2), → 4. Limite: entre a conferência e a criação/o `rename` não há atomicidade — uma troca nesse intervalo encontra o temporário com o acesso conferido (nunca o do substituto) e é recusada antes do `rename`; o `stat` de (2) segue um link posto entre (1) e (2) (só metadado, recusado em (3), sem gravação); duas trocas exatas entre os syscalls das conferências não se distinguem (sem CAS/inode) | obter o acesso antes da comparação (comportamento anterior) — o temporário recebia o texto calculado da leitura com o modo do substituto (0644 sobre 0600) e o conflito só vinha depois da gravação; apagar o temporário depois não revoga quem já o abriu; conferir só a contenção antes do acesso — não cobre o arquivo regular substituto contido no alvo; comparar o conteúdo e só depois obter o acesso, sem reconferir — o acesso voltaria a vir de um documento não conferido (troca entre a releitura e o `stat`); guardar o acesso na leitura sob o lock — conteúdo e acesso continuariam lidos por syscalls separados e a mesma conferência antes da gravação seria necessária; só acrescentaria conflito para o dono que muda o acesso do próprio arquivo entre a leitura e a conferência (sem ampliar acesso sobre o documento substituído) e uma leitura de metadado à prévia sem consumidor; gravar o conteúdo só com os bits de dono e aplicar grupo/modo depois da conferência, antes do `rename` — muda a sequência provada nos quatro instantes de `I4-C25b` e ainda dependeria do acesso conferido; conteúdo e metadado pelo mesmo handle (inode) — mudaria o leitor limitado compartilhado com o doctor e o modelo de identidade; CAS — não existe no sistema de arquivos |

- Nada mais nesta entrega é difícil de reverter.

## Checks

Contrato de saída de toda prova: o comando termina com exit 0 e o resumo TAP traz
`# tests N`, `# pass N`, `# fail 0`, `# skipped 0`, com N indicado na própria prova.
Exceções declaradas na prova: testes nativos do Hermes (sem o runtime local 0.21.4 o
teste fica `# skipped 1` com motivo `hermes-runtime-ausente` e o check fica
**pendente**, nunca pass) e o teste de sinais POSIX (no Windows `# skipped 1` com
motivo `posix-signals`; a prova vale no Linux/WSL e na CI POSIX).
Comando-base: `node --test --test-reporter=tap --test-name-pattern="^<ID> " <arquivo>`.

### S1 — observar Claude Code e distinguir caminhos · 6 arquivos novos + leitura · ~60 KB · ~15k

**C1** — `PreToolUse`, `PostToolUse` e `PostToolUseFailure` de fixture `claude-code-hooks@docs-2026-10-16`, executados pelo comando exec gravado em `settings.json` instalado, geram `tool_pre`/`tool_post` com `ids.sessionId`, `ids.toolUseId`, `ids.agentId` e `ids.promptId` iguais aos nativos, `outcome` `success`/`failure`, stdout vazio e exit 0 (crit. 1, AC1).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C1 " tests/integrations/claude-hook.cli.test.mjs` — N=1

**C2** — `SessionStart`, `SessionEnd`, `SubagentStart` e `SubagentStop` pelo mesmo comando instalado geram `session_start{source}`, `session_end{reason}`, `subagent_start{agentType}` e `subagent_stop{agentType}` com `ids.agentId` nativo (crit. 1).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C2 " tests/integrations/claude-hook.cli.test.mjs` — N=1

**C3** — Campo previsto ausente (`is_interrupt`, `duration_ms`, `agent_id` fora de subagente) vira lacuna `<nome>:absent`; tipo errado vira `invalid_type`; valor fora do enum vira `unrecognized_value`; nenhum desses produz valor no envelope (crit. 1, AC1).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C3 " tests/integrations/claude-hook.cli.test.mjs` — N=1
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C3b " tests/integrations/boundary.unit.test.mjs` — N=1

**C4** — Caminho pelo agente: `PreToolUse` com `tool_name: "Skill"` e `tool_input.skill` gera `skill_invocation` com `invocationPath: "skill_tool"`, `phase: "pre"` e `skillName` igual ao nativo; `tool_input.args` não aparece no envelope (crit. 2, AC3).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C4 " tests/integrations/claude-hook.cli.test.mjs` — N=1

**C5** — Caminho direto: cenário só com `UserPromptExpansion` `slash_command` (sem nenhum `PreToolUse`) gera `skill_invocation` `invocationPath: "direct_command"`, `phase: "expansion"`, `skillName` = `command_name`; `prompt`/`command_args` ausentes do envelope; `mcp_prompt` gera `command_expansion`, nunca `skill_invocation` (crit. 2, AC3).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C5 " tests/integrations/claude-hook.cli.test.mjs` — N=1

**C6** — `docs/agent-observation.md` classifica cada caminho de skill por agente (Claude agente/direto, Codex, Hermes) como contrato+fixture, nativo local ou pendente/indisponível, com a fonte de cada classificação (crit. 2).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C6 " tests/integrations/docs-matrix.test.mjs` — N=1

### S2 — observar Codex e supervisionar `exec` · 8 arquivos novos + leitura · ~90 KB · ~23k

**C7** — `PreToolUse`, `PostToolUse`, `SessionStart`, `SessionEnd`, `SubagentStart` e `SubagentStop` de fixture `codex-hooks@rust-v0.162.1`, executados pela linha gravada em `hooks.json` através do shell que o Codex usa (`cmd.exe /C "<linha>"` no Windows, `sh -lc` no POSIX), geram os `eventKind` do plano com `sessionId`, `turnId`, `toolUseId`, `agentId` nativos; `tool_post` traz `outcome:not_in_contract` (crit. 3, AC1).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C7 " tests/integrations/codex-hook.cli.test.mjs` — N=1

**C8** — `PreToolUse`/`PostToolUse` que leem `.../SKILL.md` geram só `tool_pre`/`tool_post` com `signal: "native_hook"`, sem `skill_invocation`, sem `skillName` e sem o caminho em nenhum byte do relatório (crit. 3, AC2).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C8 " tests/integrations/codex-hook.cli.test.mjs` — N=1

**C9** — O guia declara que hooks locais do Codex não cobrem hosted tools e não afirma cobertura deles; a matriz do Codex não tem linha "observado" para hosted tools (crit. 3).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C9 " tests/integrations/docs-matrix.test.mjs` — N=1

**C10** — O filho recebe exatamente `["exec","--json",...argv]`, com argumentos contendo espaços, Unicode, `&&`, `|`, `;`, `$()`, crases, `%PATH%`, `>` e aspas, todos literais; nenhum arquivo-sentinela é criado e nenhum comando embutido executa (crit. 4, AC4).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C10 " tests/integrations/codex-run.cli.test.mjs` — N=1

**C11** — `--json` ou `--experimental-json` antes de `--` não é duplicado; `--json` só depois de `--` é texto literal e o wrapper insere o seu `--json` após `exec` (crit. 4).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C11 " tests/integrations/codex-run.cli.test.mjs` — N=1

**C12** — `cwd` (caminho com espaço e Unicode), bytes do stdin, ambiente inteiro e flags `--sandbox`/`--ask-for-approval`/`-c` do usuário chegam inalterados; o filho não recebe flag de bypass/aprovação que o usuário não passou (crit. 4, restrições).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C12 " tests/integrations/codex-run.cli.test.mjs` — N=1

**C13** — Filho que sai com 0 e com 17 faz o wrapper sair com 0 e 17, também com o destino de observação falhando (fd de relatório fechado e mais de 500 eventos estourando o receptor) (crit. 5, AC4, AC7).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C13 " tests/integrations/codex-run.cli.test.mjs` — N=1

**C14** — Entrada do Codex inexistente → exit 127, stderr com mensagem fixa sem o caminho, stdout vazio, nenhum relatório de eventos (crit. 5).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C14 " tests/integrations/codex-run.cli.test.mjs` — N=1

**C15** — POSIX: SIGINT/SIGTERM enviados ao wrapper chegam ao filho; filho que termina por sinal faz o wrapper terminar pelo mesmo sinal; filho que trata SIGINT e sai 130 faz o wrapper sair 130; eventos anteriores constam do relatório (crit. 5). No Windows o teste fica `skipped` com motivo `posix-signals` e o limite de TerminateProcess fica declarado no guia.
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C15 " tests/integrations/codex-run.cli.test.mjs` — N=1 (Linux/WSL: skipped 0; Windows: skipped 1)

**C16** — Stdout do wrapper é byte a byte igual ao do filho e incremental (primeira linha lida antes de o filho emitir a segunda); o leitor incremental junta linha partida entre chunks, descarta e conta linha > 64 KiB (`oversizeLine`), fragmento final sem `\n` (`partialTrailingLine`), JSON inválido (`invalidJson`) e tipo desconhecido (`unknownEvent`) (crit. 5).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C16 " tests/integrations/codex-run.cli.test.mjs` — N=1
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C16b " tests/integrations/line-reader.unit.test.mjs` — N=1

**C17** — Stderr do filho (inclusive linhas com forma de JSONL) chega inalterado ao stderr do wrapper e não gera envelope; itens `reasoning` não geram envelope, o canário do texto de raciocínio não aparece no relatório e `reasoningExcluded` conta cada item (crit. 5, AC4).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C17 " tests/integrations/codex-run.cli.test.mjs` — N=1

### S3 — observar Hermes sem alterar decisões · 5 arquivos novos + fonte Hermes · ~70 KB · ~18k

**C18** — No `PluginManager` real do Hermes 0.21.4 (HERMES_HOME temporário, `python -I -B`), o plugin instalado carrega por `register(ctx)` e registra exatamente os 7 hooks, sem ferramentas, middleware ou comandos; `invoke_hook`, `handle_function_call` e `_dispatch_pre_tool_call_hooks` mantêm a identidade (sem monkey patch) (crit. 6, AC5).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C18 " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)

**C19** — Os 7 hooks disparados (ferramentas por `handle_function_call`; demais por `invoke_hook` com os kwargs dos locais de disparo citados) com kwargs extras e ausentes chegam ao `ingest` real e geram envelopes com `sessionId`, `taskId`, `toolCallId`, `turnId`, `parentSessionId`, `childSessionId`, `subagentId` nativos; `on_session_end` vira `turn_end`, nunca `session_end` nem fim de skill (crit. 6, AC5).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C19 " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)

**C20** — Os callbacks do plugin não contribuem resultado para `invoke_hook` em nenhum dos 7 hooks; `handle_function_call` executa a ferramenta fixture com argumentos idênticos e devolve o resultado dela; nenhuma mensagem de bloqueio é produzida (crit. 7, AC7).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C20 " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)

**C21** — Com `plugins.hook_callback_timeout: 1` e destino que nunca lê o stdin, 300 chamadas por `handle_function_call` executam todas sem bloqueio, cada callback do plugin retorna em < 1 s e `droppedQueueFull` > 0; controle RED: plugin fixture que escreve de forma síncrona no mesmo destino faz o host bloquear a ferramenta (crit. 7).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C21 " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)

**C22** — Destino inexistente (falha de spawn), destino que sai imediatamente e destino que desconecta após uma linha: ferramenta executa inalterada, `deliveryFailed` ≥ 1, nenhuma exceção chega ao host e não há nova tentativa de spawn (crit. 7, Swept retry).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C22 " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)

**C23** — Python não sanitiza, não atribui e não persiste: o registro enviado contém só nomes de `kwargs.json`, valores escalares idênticos (inclusive string de 300 caracteres, recusada depois pela fronteira JS como `too_long`) e `nonScalar` para dict/list; a pasta do plugin e o HERMES_HOME não ganham arquivo do plugin; canários de `args`/`result`/`error_message`/`child_goal` não aparecem no registro (crit. 7).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C23 " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)

### S4 — instalar e remover preservando o que existe · 10 arquivos novos + leitura doctor · ~110 KB · ~28k

**C24** — `plan` e `install`/`uninstall` sem `--apply` não alteram nenhum byte, mtime ou entrada do alvo e não executam agentes-sentinela presentes no PATH; a saída JSON lista as mudanças próprias por arquivo/evento, nos três agentes (crit. 8, AC6).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C24 " tests/integrations/install.cli.test.mjs` — N=1

**C25** — `install --apply` altera só o alvo indicado; chaves alheias (`permissions`, `env`, `disableAllHooks`, `allowManagedHooksOnly`, hooks de terceiros) ficam deep-equal; `config.toml` do Codex (com `[hooks.state]`) e `config.yaml` do Hermes (com `plugins.enabled`) ficam byte a byte iguais (crit. 8, restrições).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C25 " tests/integrations/install.cli.test.mjs` — N=1

**C26** — JSON malformado, raiz não objeto, `hooks` com forma inválida e arquivo > 1 MiB → exit 3, arquivo inalterado, nenhum registro criado, para Claude e Codex (crit. 8).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C26 " tests/integrations/install.cli.test.mjs` — N=1

**C27** — Arquivo de configuração ou `.skill-me` que resolve para fora do alvo (link/junção) → exit 4 sem escrita fora nem dentro; alvo igual ao diretório de política gerenciada do Claude → 4; `--target` ausente ou inexistente → 2 (crit. 8). Link de arquivo sem privilégio no Windows: subcaso `skip` com motivo, junção de diretório obrigatória.
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C27 " tests/integrations/install.cli.test.mjs` — N=1

**C28** — Instalar duas vezes deixa exatamente um grupo próprio por evento e valores alheios preservados; a segunda execução sai 0 sem mudança de bytes (crit. 9, AC6).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C28 " tests/integrations/install.cli.test.mjs` — N=1

**C29** — Concorrência: lock presente → exit 4 com arquivos inalterados; 6 `install --apply` paralelos → um grupo próprio por evento, cada código ∈ {0,4}, ao menos um 0; edição externa entre `plan` e `install --apply` é preservada (crit. 9).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C29 " tests/integrations/install.cli.test.mjs` — N=1

**C30** — Edição externa entre a leitura e o `rename` (sistema de arquivos com mutação na releitura) → resultado `conflict`/4, nenhuma escrita sobre o arquivo e conteúdo externo preservado (crit. 9).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C30 " tests/integrations/install-apply.unit.test.mjs` — N=1

**C31** — `uninstall --apply` remove só grupos cujo hash confere com o registro; grupos/valores alheios ficam deep-equal ao original; arquivo, objeto `hooks` e chaves que a instalação criou somem só quando ficam vazios (crit. 10, AC6).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C31 " tests/integrations/install.cli.test.mjs` — N=1

**C32** — Grupo próprio editado pelo usuário é preservado e reportado como conflito (exit 4); segunda remoção não muda nenhum byte e continua reportando o conflito (crit. 10).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C32 " tests/integrations/install.cli.test.mjs` — N=1

**C33** — Registro impossível de gravar depois de a configuração ser escrita → exit 5 com `status: "incomplete"` e estado por passo, nunca 0; depois de corrigir, reinstalar sai 0 adotando o grupo e a remoção funciona (crit. 10).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C33 " tests/integrations/install.cli.test.mjs` — N=1
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C33b " tests/integrations/install-apply.unit.test.mjs` — N=1

**C34** — Hermes: install grava os 3 artefatos com hash no registro e não habilita o plugin; pasta `skill-me-observer` alheia → 4 sem escrita; artefato editado é preservado na remoção com 4; arquivo extra do usuário na pasta é preservado (crit. 8–10).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C34 " tests/integrations/install.cli.test.mjs` — N=1

**C35** — Em cada agente, o mapa caminho→SHA-256 de todos os arquivos da skill de terceiro (caminhos com espaço e Unicode) é idêntico antes/depois de instalar, observar e remover, e nenhum arquivo é acrescentado à árvore (crit. 11, AC8).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C35 " tests/integrations/skill-tree-hash.cli.test.mjs` — N=1 (observação Hermes: subcaso skip com motivo se runtime ausente)

### S5 — falhas, limites, fixtures e fronteira · 8 arquivos novos · ~80 KB · ~20k

**C36** — Hook Claude e hook Codex: consumidor ausente, recusa (evento fora da allowlist), desconexão (fd de relatório fechado), timeout (stdin aberto além de 2000 ms), entrada inválida e entrada > 1 MiB → exit 0, stdout vazio e nenhum campo de decisão, nos 12 casos (crit. 12, AC7).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C36 " tests/integrations/failure-matrix.cli.test.mjs` — N=1

**C37** — Hermes: os mesmos seis casos (sem entrega, recusa, desconexão, travado, kwargs inválidos, fila/registro acima do limite) → callbacks `None`, ferramenta inalterada (crit. 12).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C37 " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)

**C38** — Wrapper: sem relatório, eventos recusados, consumidor do stdout desconectado (EPIPE), relatório não drenado (sai em ≤ 1000 ms além do filho), JSONL inválido e linha/receptor acima do limite → código do filho preservado nos seis (crit. 12).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C38 " tests/integrations/failure-matrix.cli.test.mjs` — N=1

**C39** — Canários sintéticos em entrada de ferramenta, resultado, prompt, caminho, erro e raciocínio não aparecem nas saídas e registros próprios do debugger nem em arquivo criado por ele no alvo ou no TEMP dedicado, para hook Claude, hook Codex e wrapper. Nos hooks, stdout e stderr próprios ficam sem canários; no wrapper, o relatório e qualquer conteúdo acrescentado pelo debugger ficam sem canários. O stdout nativo do Codex é repassado byte a byte e seu stderr é preservado conforme C16/C17 e o plano; a prova distingue esse repasse das saídas próprias do debugger (crit. 12, #5).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C39 " tests/integrations/failure-matrix.cli.test.mjs` — N=1

**C40** — Toda fixture em `tests/integrations/fixtures/` declara `origin: "synthetic"`, `contract` e `source`, e cada contrato tem ao menos um caso válido e um inválido (crit. 13, AC9).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C40 " tests/integrations/fixtures-inventory.test.mjs` — N=1

**C41** — A matriz do guia separa determinístico, nativo local e E2E real opt-in por agente; toda linha E2E está `pendente` com motivo, nenhuma `pass` (crit. 13, AC9).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C41 " tests/integrations/docs-matrix.test.mjs` — N=1

**C42** — `buildEnvelope` só emite chaves da allowlist; tabela com as seis categorias excluídas (argumentos, resultados, prompts, caminhos, raciocínio, erro livre) em cada `eventKind` mostra o canário ausente; ID > 256 é omitido, nome fora da regex é omitido, envelope > 4096 bytes é recusado (crit. 14, AC1).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C42 " tests/integrations/boundary.unit.test.mjs` — N=1

**C43** — `MemoryReceiver`: capacidade exata (o 501º é `dropped`), `malformed` para envelope fora do schema, `close()` faz tudo virar `dropped`, `receive` nunca lança, snapshot imutável; o módulo não importa `fs`/`net`/`child_process` (crit. 14).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C43 " tests/integrations/memory-receiver.unit.test.mjs` — N=1

**C44** — Sem consumidor: hook instalado sem variável de relatório não escreve nada (stdout/stderr vazios, nenhum arquivo novo no alvo/TEMP); Hermes sem entrega fica inativo (`enqueued` 0, nenhum processo); o guia não anuncia coletor/ingestão real (crit. 14).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C44 " tests/integrations/failure-matrix.cli.test.mjs` — N=1
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C44b " tests/integrations/hermes-plugin.native.test.mjs` — N=1 (runtime ausente: skipped 1, pendente)
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C44c " tests/integrations/docs-matrix.test.mjs` — N=1

**C45** — Com integrações instaladas nas fixtures lidas pelo doctor, `doctor --json` continua com `runtimeVerification: "not_performed"` e sua ajuda não ganha flag nem subcomando de integração (crit. 14).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C45 " tests/integrations/doctor-invariants.cli.test.mjs` — N=1

**C46** — Todo envelope dos adaptadores traz `signal` coerente com a origem (`native_hook` hooks, `native_plugin` Hermes, `supervised_exec` wrapper); nenhum adaptador produz outro valor, inclusive `inferred` (AC2).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C46 " tests/integrations/adapters.unit.test.mjs` — N=1

**C47** — `npm test` executa `test:integrations` e o job `verify` da CI roda `npm run test:integrations` nos três SO (Swept observability da entrega; integração declarada no plano).
Proof: `node --test --test-reporter=tap --test-name-pattern="^governance-C1 C3 " scripts/governance-ci.test.mjs` — N=1
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C47 " tests/integrations/fixtures-inventory.test.mjs` — N=1

**C48** — Mapas de cada adaptador cobrem o conjunto inteiro do contrato: Claude 8 eventos, Codex hooks 6, `exec` 8 tipos + desconhecido, 9 tipos de item (incluindo `reasoning` excluído) e Hermes 7 hooks, com `eventKind`, IDs e lacunas esperados por linha (crit. 1, 3, 6).
Proof: `node --test --test-reporter=tap --test-name-pattern="^I4-C48 " tests/integrations/adapters.unit.test.mjs` — N=1

## Swept

- validation: C3, C16, C26, C42, C48.
- failure modes: C13, C14, C21, C22, C33, C36, C37, C38.
- idempotency and retry: C28 (instalar 2×), C32 (remover 2×), C33 (reinstalar adota); C22 — sem retry de transporte, falha é contada e desliga a entrega.
- authorization: C12 (nenhum bypass acrescentado), C25 (confiança, política e sandbox intactos), C27 (política gerenciada recusada), C34 (habilitação Hermes manual).
- concurrency and ordering: C29, C30; IDs nativos sem reordenação/correlação em C1, C7, C19; ordem incremental em C16.
- data lifecycle: C31, C35, C39, C43, C44 — nada persistido; retenção/exclusão de traces na #5/#8.
- external-dependency failure: C14, C21, C22, C38; runtime Hermes ausente → pendente (C18–C23, C37).
- state transitions: ausência → prévia sem mutação (C24) → instalada (C28) → removida (C31); edição posterior → conflito preservado (C32); falha parcial → incompleta → reconciliada (C33).
- observability: C16 e C43 (contadores), C21/C22 (`observer_stats`), C46 (sinal), C41 (matriz de evidências).

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| eventos Claude assinados (8) | `PreToolUse` C1 C4 · `PostToolUse` C1 · `PostToolUseFailure` C1 · `UserPromptExpansion` C5 · `SessionStart` C2 · `SessionEnd` C2 · `SubagentStart` C2 · `SubagentStop` C2; tabela C48 | - |
| eventos Codex hooks assinados (6) | C7 tabela sobre os 6; C48 | - |
| tipos `exec --json` (8 + desconhecido) | `thread.started` `turn.started` `turn.completed` `turn.failed` `item.started` `item.updated` `item.completed` `error` C48; desconhecido C16 | - |
| tipos de item `exec` (9) | 8 mapeados C48 · `reasoning` excluído C17 C48 | - |
| hooks Hermes (7) | C18 registro dos 7 · C19 disparo dos 7 · C20 retorno dos 7 · C48 mapa dos 7 | - |
| caminhos de skill Claude (2) | agente C4 · direto C5 | - |
| categorias excluídas (6) | argumentos · resultados · prompts · caminhos · raciocínio · erro livre — C42 tabela, C39 processos | - |
| motivos de lacuna (6) | `absent` C3 · `not_in_contract` C7 · `invalid_type` C3 · `too_long` C23 C42 · `not_identifier` C42 · `unrecognized_value` C3 | - |
| códigos do instalador (5) | 0 C28 · 2 C27 · 3 C26 · 4 C27 C29 C32 C34 · 5 C33 | - |
| saídas do wrapper (5) | 0 C13 · 17 C13 · 127 C14 · sinal C15 (POSIX) · 130 C15 (POSIX) | Windows: sinal/130 — limite de plataforma declarado |
| casos de falha por adaptador (6 × 4) | hook Claude C36 · hook Codex C36 · Hermes C37 · wrapper C38 | - |
| agentes no hash da skill (3) | Claude · Codex · Hermes — C35 | observação Hermes sem runtime → pendente |
| montagens do comando instalado (3) | Claude forma exec C1 · Codex `cmd /C`/`sh -lc` C7 · Hermes `PluginManager` C18 | E2E com agente real — pendente (AC9) |

- Claims que nomeiam código de saída/forma de resposta: C1, C7, C10–C15, C24–C34, C36, C38 — cada um com prova que atravessa a CLI/processo real.
- Nenhum outro check afirma mais do que o caso que sua prova exercita.

## Handoff

Um batch com todas as fatias. Leitura existente: task 41 KB, `docs/agent-compatibility.md` 40 KB,
módulos do doctor reutilizados (~70 KB: `config-projection`, `hooks-shape` parcial, `agent-resolution`,
`config-sources`, `snapshot-read`, `fs-adapter`, `cli-args`), CI/governança 13 KB e fonte Hermes lida
~40 KB ≈ 204 KB → ~51k. Novos arquivos estimados: fonte JS ~100 KB, Python ~10 KB, testes ~130 KB,
fixtures ~25 KB, guia ~25 KB ≈ 290 KB → ~73k. Total ≈ 124k < 150k: S1–S5 cabem num batch; nenhuma
fronteira de handoff dentro da entrega. Verifier é do orquestrador, depois do último commit.

Fechamento do batch único (16/10/2026):

- **Fronteira:** C1–C48 fechados em `e60b5e0` (evidência em `.checks/issue-4-integracoes.build.md`); C15 provado no WSL; C18–C23, C37 e C44b nativos só no Windows local, pendentes nas demais plataformas.
- **Decidido durante o build:** nenhuma decisão nova do proprietário; a nota do coordenador (`.checks/issue-4-integracoes.coordinator.md`) levou às correções de `5612060` e `9b433b5`. Ponto aberto para o orquestrador: redação de C39 para o stdout nativo do wrapper (ver build).
- **Abandonado:** envelope montado em Python (rascunho anterior: duplicaria a fronteira); `fs.write` no exportador (trava o encerramento no Windows com pipe cheio); espera por `drain` no fim do wrapper (`drain` só existe após backpressure); acrescentar `packageDir` ao retorno do Codex no doctor (mudaria um export fora do recorte).

Correções do round 1 da verificação independente (16/10/2026):

- **Fronteira:** F1–F4 fechados em `5521819`..`7de3bc2` (evidência em `.checks/issue-4-integracoes.build.md`, "Correções da verificação independente — round 1"); Checks e Landing inalterados.
- **Decidido durante o build:** nada novo do proprietário. F5/C39 aguarda resposta humana à pergunta do orquestrador; texto, prova e comportamento preservados.
- **Abandonado:** prazo do relatório contado do `flush` (excedia 1000 ms além do filho); reserva 0 (custo medido de 23–63 ms fora do timer); comparar só caminhos do HERMES_HOME (não detecta acréscimo a arquivo do host); comparar com a execução `inactive` (cenário diferente); tratar todo link em `__pycache__` como `target_escape` (link dentro do alvo não escapa: é alheio).

### Coordenação durante F2 — 17/10/2026

O coordenador encontrou um contraexemplo no fallback de grupo ainda em implementação:
`replacementMode({mode: 0o604}, false)` mantinha `0604`; um membro somente do grupo
antigo, antes sem leitura, vira "outros" e ganha leitura após mudar o gid. Isso é
ampliação dentro de F2/AC6. Detalhes e sonda somente leitura em
`.checks/code-review/issue-4/coordinator-f2-group-feedback.md`. Conferir antes de
fechar F2, sem alterar a barra dos checks. Nenhum código/teste foi corrigido pelo
coordenador; esta nota é evidência de coordenação e deve ser preservada/encerrada
com a prova correspondente pelo builder.

Encerramento pelo builder (17/10/2026): contraexemplo confirmado — RED na regra de
`4f2932a`: `I4-C25c` (`0604` sem grupo atribuível → `0604`) e `I4-C25b` com EPERM
injetado no `chown` (`before_content`: o destinatário "só do grupo antigo" ganha
leitura). A regra passou à interseção de grupo e "outros" (linha correspondente em
Landing). As provas conferem as quatro classes de pertencimento pelo modelo POSIX de
`tests/integrations/helpers/posix-access.mjs`, na regra pura (512 modos) e no CLI real
POSIX (0640 e 0604 com grupo não atribuível); a barra dos checks não mudou. Evidência
em `.checks/issue-4-integracoes.build.md`.

Correções da revisão formal round 1 (17/10/2026):

- **Fronteira:** F1–F4 fechados em `bdc1969`..`bb05bcc` (F2 em `4f2932a` + `38bc660`), evidência em `.checks/issue-4-integracoes.build.md`, "Correções da revisão formal — round 1"; Checks inalterados; Landing +4 linhas (F2, regra de grupo corrigida, F3, F4). Achado irmão de F1 (pasta própria do plugin como junção → remoção apaga bytecode de outro plugin) só reportado: aguarda decisão.
- **Decidido durante o build:** nada novo do proprietário; o coordenador apontou o contraexemplo 0604 da regra de grupo (nota acima, encerrada em `38bc660`).
- **Abandonado:** limpar o staging pelos nomes de `ARTIFACT_NAMES` (era o defeito F1); `chmod` depois do conteúdo (janela legível; mutação detectada); limitar só o grupo novo aos bits de "outros" (contraexemplo 0604); adotar grupo editado pela assinatura (apagaria a edição na remoção); medir caracteres em vez de bytes UTF-8 e conferir o tamanho só na instalação (mutações detectadas).

### Conferência de coordenação — container `plugins`

Antes de fechar a remoção, conferir também o cleanup do container: instalar sem
`plugins`, mover o container para `plugin-store`, ligar `plugins` por junction e
remover o observer. `created.pluginsDir` descreve o passado; `removeDirIfEmpty`
não deve apagar o link posterior do usuário quando o destino fica vazio. A
observação ainda é por leitura, sem prova executada pelo coordenador. Cenário e
esperado em `.checks/code-review/issue-4/coordinator-container-link-feedback.md`;
fechar se confirmado dentro de AC6/C34, preservando a barra existente.

Encerramento pelo builder (17/10/2026): confirmado no Windows — com `created.pluginsDir`
true e `plugins` trocado por junção para `plugin-store`, a remoção saía `0 applied` e o
`rmdir` final apagava a junção quando o destino ficava vazio; o mesmo helper apagava uma
junção posta no lugar de `.skill-me` (irmão, comum aos três agentes). No POSIX o `rmdir` em
symlink já falhava (`ENOTDIR`) e o link ficava: lá a regressão é guarda. Corrigido em
`043f287` (`removeDirIfEmpty` só remove diretório real); `I4-C34d` confere o link mantido, o
destino vazio, as mudanças exatas e, como controle, a saída do diretório real criado pela
instalação. A barra dos checks não mudou. Evidência em `.checks/issue-4-integracoes.build.md`,
"Continuidade AC6 — pasta própria do plugin Hermes".

Continuidade AC6 — pasta própria do plugin Hermes (17/10/2026):

- **Fronteira:** o achado irmão de F1 acima ("só reportado: aguarda decisão") foi classificado pelo orquestrador como continuidade do AC6 já aprovado e da fronteira de propriedade de F1 — não é nova feature, issue nem decisão de produto; nenhuma autorização humana nova foi pedida ou presumida, e a formulação anterior fica como histórico. Fechado em `42516ad`: pasta própria como junção/link (dentro ou fora do alvo) ou arquivo → 4 na prévia e na aplicação de install e uninstall, nada lido nem apagado através dela, reconferência antes de cada exclusão. Defeitos adjacentes do mesmo AC6/C34, encontrados durante a correção e tratados pelo builder dentro do escopo (sujeitos à conferência do orquestrador/Verifier): `01faaac` (remoção sem registro apagava bytecode), `043f287` (nota do coordenador e irmão `.skill-me`), `6df4d4c` (artefato trocado por link de arquivo; bytecode ao lado de fonte preservada). Checks e Landing inalterados; regressões `I4-C34b`..`I4-C34e`; evidência em `.checks/issue-4-integracoes.build.md`, "Continuidade AC6 — pasta própria do plugin Hermes".
- **Decidido durante o build:** nada novo do proprietário. A classificação de continuidade é do orquestrador; a nota do coordenador (container `plugins`) foi confirmada e encerrada acima.
- **Abandonado:** tratar `ENOTDIR` como ausente em `assertContained` (mudaria Claude/Codex com `.skill-me` arquivo; a pasta do plugin passou a ser conferida antes dos caminhos dos artefatos); recusar só `isSymbolicLink` (o arquivo regular no lugar da pasta continuaria substituído pelo rename do staging no Windows); reconferir só no início da remoção (troca entre exclusões passa — M-PDb); manter o cache pela lista lida do estado (aplicação apagava o que a prévia não listava — M-PDc); reter também o bytecode com o `__init__.py` já ausente (deixaria cache órfão da nossa fonte e mudaria o código de saída sem necessidade demonstrada).

### Verificação independente round 3 — registro parcial (17/10/2026)

O Verifier encerrou `7083702` com FAIL, 47/48 claims: C34/AC6 continua
incompleto. Instalar Hermes, editar apenas `kwargs.json` e remover produz registro
parcial só desse arquivo; uma fonte `__init__.py` alheia e seu bytecode criados
depois ficam fora do registro. Nova remoção preserva a fonte, mas apaga o bytecode
mesmo retornando conflito 4. Reproduzido com dados sintéticos no Windows e WSL;
nenhum arquivo pessoal afetado. Relatório autêntico em
`.checks/issue-4-integracoes.verified.md`; histórico PASS round2 preservado no Git.
Os lotes de 68 testes passaram (Windows 66/2 skips, WSL 60/8 skips), mas não
cobriam essa transição. F2/F3/F4 e os cenários nomeados de F1 passaram.

A correção desta perda e suas provas continuam dentro de AC6 já aprovado; o
orquestrador encaminha ao Claude sem alterar os Checks. O limite de três rodadas
independentes de `tlc-implement/references/verify.md` foi atingido. Não existe
exceção humana específica para round4: preparar primeiro correção/provas/commits
e então solicitar uma rodada independente adicional. Nenhum contador/histórico
foi alterado. O motor formal segue em uma tentativa consumida de duas e não deve
iniciar a segunda antes de nova verificação independente válida.

### Conferência de coordenação — cache vazio no registro parcial

Durante a correção, a leitura do coordenador apontou que `cacheDirOwned` ainda
descreve apenas um `__pycache__` real. Conferir o cleanup do diretório vazio
criado pelo usuário depois da remoção parcial: com `kwargs.json` restaurado e
fonte alheia presente, a aplicação pode conservar fonte/bytecode mas remover
esse diretório. Ainda não reproduzido pelo coordenador; cenário/esperado em
`.checks/code-review/issue-4/coordinator-partial-cache-directory.md`. Confirmar
ou refutar dentro de AC6/C34, sem alterar os Checks nem limites; registrar o
resultado aditivamente. O coordenador não editou produto/testes.

Encerramento pelo builder (17/10/2026): confirmado em `7083702` e em `c066a5f` (primeiro
commit desta correção) — o `__pycache__` vazio do usuário saía com fonte alheia ou sem fonte
no registro parcial (sem fonte, a pasta inteira e `0 applied`) e ao lado da fonte registrada
editada. Corrigido em `6f1740d`: o plano decide a remoção do `__pycache__` pela mesma regra do
bytecode, o diretório sem fonte registrada é reportado e a fonte é reconferida antes do
`rmdir`; linhas novas em `I4-C34f`/`I4-C34g` com controle normal. A barra dos checks não mudou.
Evidência em `.checks/issue-4-integracoes.build.md`, "Correção pós-verificação round 3 —
registro parcial Hermes".

Correção pós-verificação round 3 — registro parcial (17/10/2026):

- **Fronteira:** achado do Verifier (bytecode de fonte nova apagado com 4 após registro parcial)
  fechado em `c066a5f`..`6f1740d`, com RED no produto `7083702` em cópias isoladas (Windows e
  WSL) e GREEN nos dois batches de 70 testes. Defeitos da mesma raiz no mesmo AC6/C34,
  encontrados pela sonda RED e tratados no escopo, comunicados no retorno: remoção com
  `kwargs.json` restaurado (`0 applied` apagando bytecode alheio), bytecode sem fonte,
  reinstalação sobre a sobra registrando os três artefatos, fonte posta durante a remoção, e a
  nota do coordenador acima. Checks e Landing inalterados; regressões `I4-C34f`, `I4-C34g`.
  Correção aditiva explícita das duas afirmações anteriores sobre o cache órfão na evidência build.
  Nenhuma rodada independente nova foi pedida ou executada; limite de três rodadas e estado
  formal intactos.
- **Decidido durante o build:** nada novo do proprietário. A classificação de continuidade é do
  orquestrador; a nota do coordenador foi confirmada e encerrada acima.
- **Abandonado:** decidir pelo conteúdo atual do `__init__.py` (cópia exata do pacote posta pelo
  usuário seria tomada por nossa, como as cópias de `I4-C34b`); confiar no código 4 (o conflito
  não impedia a exclusão); recusar toda reinstalação sobre registro parcial (perderia a
  reconciliação por conteúdo exato); reconferir a fonte antes da pasta e do `__pycache__` (através
  de uma pasta trocada por junção leria a fonte de outro plugin e apontaria o arquivo errado,
  contra `I4-C34c`); ler o cabeçalho do `.pyc` (não comprova origem; a decisão vem do registro).

### Autorização do proprietário para concluir — 17/10/2026

Após as correções/provas em `cba2752`, o proprietário autorizou nesta conversa:
"use quantas rodadas precisar. após terminar pode fazer o merge e finalizar.
depois em uma nova sessão pode pegar uma nova issues e planejar e fazer o loop
de desenvolvimento." Registro completo e limites em
`.tasks/issue-4-integracoes.md`, seção "Autorização de continuidade". As notas
anteriores de ausência de exceção ficam como histórico; as rodadas necessárias
agora estão autorizadas, sem apagar relatórios nem enfraquecer Checks. O teto
formal exclusivo da #4 foi registrado como 10 (máximo do motor), sem mudar o
core ou o limite de outras issues. Merge autorizado após verificações aprovadas;
nova sessão somente depois da conclusão confirmada da #4.

### Fechamento da verificação independente round 4 — 17/10/2026

PASS 48/48 em `2830d7f9effa8b292818d602e924254b16985d79`, conforme relatório
completo em `.checks/issue-4-integracoes.verified.md`. A reprodução independente
do achado da rodada 3 agora preserva fonte, bytecode, `kwargs.json` e registro,
sem `remove_cache`; C34f/g também provam diretório vazio e troca durante apply.
Lote único por plataforma: 86 testes, Windows 84 pass/2 skips e WSL 78 pass/8
skips, nenhuma falha e exit 0 em ambos. Inclui as 70 provas de
integração/governança e 16 do motor pelo ajuste de configuração autorizado.
Original limpo e sem escrita pelo Verifier nesta rodada; relatório traz
asserções localizadas, origem dos julgamentos carregados e limites reais.
Histórico FAIL preservado no Git e nos scratches. A revisão formal seguinte
continua obrigatória; este fechamento não declara o PR pronto antes dela.

### Revisão formal round 2 — preservação JSON e temporários (17/10/2026)

A revisão formal de `7147ac0` foi `changes_requested`: AC6 unmet, demais oito
AC met, verificação insuficiente. Dois achados bloqueantes P2: `cloneDoc`
copia chaves JSON por atribuição em `{}` e perde `__proto__`; `clearStaleTemp`
apaga qualquer arquivo regular no caminho temporário sem comprovar propriedade.
Os achados derivam da leitura formal, ainda exigem reprodução pelo Claude e
regressões. A preservação dos estados anteriores foi reconhecida; o PASS
independente round 4 fica preservado como resultado daquela versão, sem ser
usado para ignorar estes estados descobertos depois.

Relatório formal autêntico preservado no estado comum Git e em
`.checks/code-review/issue-4/formal-round2-report.json`. Correção de ambos está
dentro de AC6 já aprovado e das rodadas necessárias autorizadas pelo proprietário.
Claude implementa/prova; depois haverá nova verificação independente e revisão
formal do conteúdo novo. Histórico e critérios permanecem intactos, duas
tentativas formais consumidas do teto autorizado de dez. Nenhum PR ou merge
antes de aprovação válida.

### Conferência de coordenação — repetição da contenção em C29

Durante a correção de C29, a leitura do coordenador apontou que o novo ramo
`realpath` → `ENOENT` repete o mesmo caminho sem limite/progresso em
`assertContained`. Conferir a instabilidade em várias sondagens sucessivas,
além do caso de uma única falha, com término seguro em conflito; controles de
links/escape mantidos. Ainda não reproduzido pelo coordenador. Cenário e
esperado em `.checks/code-review/issue-4/coordinator-containment-retry.md`.
Não solicita CAS nem timeout genérico: apenas conferir o novo laço de C29/AC6.
Root não editou produto/testes. Registrar confirmação ou refutação antes do
fechamento do build, preservando esta nota e os Checks.

Encerramento pelo builder (17/10/2026): confirmado em `c914e5d` com io instrumentado — uma entrada
que o `lstat` encontra e cujo `realpath` devolve `ENOENT` a cada nova sondagem fazia
`assertContained` repetir o mesmo caminho até o instrumento parar de oscilar (1001 chamadas) e depois
aplicar (`0 applied`). Linha de Landing registrada antes do código (`f1de786`); corrigido em `01c78bd`:
no máximo 3 novas sondagens por chamada, depois 4 `config_changed_during_read` com o caminho, antes de
qualquer leitura ou escrita. `I4-C29c` ganhou as linhas instáveis (configuração e registro: 4
chamadas, nada escrito) e mantém as de uma única falha (`0 applied`); links pendentes/externos
seguem cobertos por `I4-C27`/`I4-C34b`, verdes. A barra dos checks não mudou. Evidência em
`.checks/issue-4-integracoes.build.md`, "Correção da revisão formal round 2".

Correções da revisão formal round 2 (17/10/2026):

- **Fronteira:** F1 (`cloneDoc` perdia `__proto__`) fechado em `264e4df`; F2 (temporário de nome fixo
  apagado sem prova de propriedade; promovido ou apagado depois da criação) fechado em `0481b28`,
  com Landing antes do código em `56e688d`; RED nos dois sobre o produto `7147ac0` em cópias
  isoladas (Windows e WSL, saídas iguais), GREEN nos dois lotes de 92 testes em `01c78bd`. Defeito
  anterior do mesmo AC6 encontrado na separação dos commits e comunicado: `I4-C29` saía 5 no Windows
  (10/100 em `7147ac0`; rename negado por handle aberto e `ENOENT` na contenção), corrigido em
  `c914e5d` com Landing em `de4f9d6`; 0/100 em `01c78bd`. Nota do coordenador acima confirmada e
  encerrada (`f1de786`/`01c78bd`). Checks inalterados; Landing +3 linhas; `I4-C33` com setup trocado
  (falha de E/S injetada no rename do registro pelo `fs-probe`), contrato e asserções mantidos;
  regressões `I4-C25d`, `I4-C25e`, `I4-C29b`, `I4-C29c`, `I4-C30b`, `I4-C30c`. Nenhuma verificação
  independente nem revisão formal pedida ou executada; contadores e histórico intactos.
- **Decidido durante o build:** nada novo do proprietário; a correção do C29 entra como defeito já
  coberto pelo C29 dentro do AC6 e da autorização de rodadas registrada.
- **Abandonado:** apagar o temporário regular pelo nome (o defeito F2); adotar como sobra o temporário
  com os bytes do texto novo; nome de temporário aleatório; inode além do conteúdo; `EPERM` no
  rename como conflito 4; repetir o rename sem refazer as conferências; espera longa como a do graceful-fs;
  sondagem repetida sem limite (`c914e5d`); `target_escape` ao esgotar a sondagem.

### Verificação independente round 5 — metadados durante apply (17/10/2026)

FAIL 45/48 em `a6c656bab954663b86a2f2fe99f4e6a8a727dc32`: C27/C30/C31 e AC6
não atendidos. Relatório completo preservado em `.checks/issue-4-integracoes.verified.md`,
SHA-256 `0b6d60c6a8c98b655bdad1b1640a4d0ce2e56701b30cd6078f1d8d49f4ed22ec`.
Correções da formal2 confirmadas nos casos definidos, mas três novos achados concretos
bloqueiam entrega: R5-F1 registro substituído depois da leitura é apagado/sobrescrito;
R5-F2 cleanup apaga lock substituído; R5-F3 troca de `.skill-me` por junção/link depois
da escrita da configuração permite apagar ou sobrescrever registro/lock fora do alvo.
Reproduzidos no produto intacto em cópias próprias Windows e Linux, somente dados sintéticos;
perda e quebra de isolamento comunicadas imediatamente ao proprietário. Não são explicadas
pela janela final não atômica: faltam reconferências desses destinos e ancestrais.

Os lotes finais de 92 testes terminaram sem falhas: Windows 90 pass/2 skips, WSL 84 pass/8
skips, exit 0 ambos, incluindo 16 do motor. O relatório distingue a tentativa ambiental
Windows interrompida e repetida com capacidade de encerrar seus processos de teste.
O verde não comprova os estados novos reproduzidos. Sondas/resultados preservados em
`.checks/code-review/issue-4/verifier-residual-*` e no scratch independente citado no relatório.
A sonda staging Hermes preservou bytes na remoção; não é declarada perda nem novo escopo.

Continuidade autorizada dentro do AC6 e das rodadas necessárias já aprovadas. Claude
corrigirá/provará os caminhos de registro, lock e ancestral; depois, nova verificação
independente antes da formal3. Checks e histórico intactos, duas tentativas formais
consumidas do teto dez. Codex não implementou produto/testes; nenhum PR/merge antes de ready.

Correção da verificação independente round 5 (17/10/2026):

- **Fronteira:** R5-F1/F2/F3 fechados em `81b9888`, com a linha de Landing antes do código em
  `9cf73f1`; RED no produto `a6c656b` em cópias isoladas (Windows e WSL, saídas iguais) e GREEN nos
  dois lotes de 96 testes em `81b9888` (Windows 94 pass/2 skips, WSL 88 pass/8 skips, exit 0; 54
  linhas `Proof:` casadas). A sonda RED mostrou a mesma raiz em operações que o Verifier não
  exercitou, tratadas pela mesma mudança e comunicadas no retorno: registro posto durante a primeira
  instalação, lock e pasta de estado trocados na instalação, registro lido através da pasta trocada
  sob o lock, remoção Hermes e falha de E/S do lock engolida (0). Checks inalterados; Landing +1 linha;
  regressões `I4-C27b`, `I4-C30d`, `I4-C30e`, `I4-C31b` (18/18 mutações detectadas); `I4-C29` 0/100
  Windows e 0/40 WSL. Evidência em `.checks/issue-4-integracoes.build.md`, "Correção da verificação
  independente round 5". Nenhuma verificação independente nem revisão formal pedida ou executada;
  contadores e histórico intactos; estas provas são do autor e não aprovam a entrega.
- **Decidido durante o build:** nada novo do proprietário. Registro ou lock ausente na hora do efeito
  → 4 (não idempotente); registro que não é arquivo regular na leitura → 4; junção de `.skill-me` para
  dentro do alvo posta antes do comando continua aceita (`I4-C34d`); `replaceChecked`/`deleteChecked`
  da configuração não mudaram — tudo na linha de Landing de `9cf73f1`.
- **Abandonado:** reusar `replaceChecked`/`deleteChecked` como estão; conferir só a contenção; exigir
  `.skill-me` diretório real desde a leitura; ausência idempotente; desfazer a configuração já gravada;
  inode, conteúdo aleatório no lock, journal ou CAS; engolir a falha do `unlink` do lock.
- **Pendente para decisão (comunicado, não corrigido):** `settings.json` como symlink dentro do alvo
  é substituído por arquivo regular na instalação — comportamento anterior, igual em `a6c656b` e
  `81b9888`, sem perda de bytes, mas o link do usuário não é preservado (por leitura, também
  `hooks.json`); seguir, recusar ou manter é decisão de produto. Hermes staging alterado antes do
  rename: sem perda, limite registrado no guia.

### Fechamento independente round 6 — 17/10/2026

PASS 48/48 em `9aff57735c822dc4a3af3b515a5de7d527b4f9e3`. Relatório completo em
`.checks/issue-4-integracoes.verified.md`, SHA-256
`5533856331ffd224be0e4d113e3e756f1482ccfeaf4d360502cef729efd5cf2a`.
C27/C30/C31 foram reavaliados pelas guardas e quatro regressões versionadas executadas,
com asserções de conteúdo, tipo, ancestral, conflitos e passos. Nenhum critério omitido.
Lotes independentes: 96 testes por plataforma, Windows 94 pass/2 skips, WSL 88 pass/8
skips, nenhuma falha/cancelamento, exit 0; 54 provas nomeadas contabilizadas, 16 testes do
motor separados. Original limpo e somente leitura, 172 blobs conferidos nos dois ambientes.

A plataforma interrompeu a primeira execução do agente por classificação automática de risco
cibernético. Não houve tentativa de repetir ou reformular a ação bloqueada. A continuação
limitou-se à leitura normal do diff/regressões já versionadas e aos lotes previamente iniciados,
que concluíram normalmente. A sonda adicional própria do Verifier NÃO foi executada neste HEAD;
o relatório distingue esse limite das regressões efetivamente executadas, suficientes para
as claims sob o perfil light. Resultados anteriores não são apresentados como nova execução.

A nota autoral sobre o symlink inicial de configuração foi julgada pelo contrato aprovado:
S4:8/C27 recusam escape; S4:9/C25 preservam valores; o Landing escolhe temp+rename. Não há promessa
explícita de conservar o tipo de um symlink inicialmente contido. Por leitura, a ligação é
substituída por arquivo regular, preservando valores lidos e bytes do arquivo apontado; sem
nova sonda específica nem promessa de sincronização futura pela ligação. Limite registrado,
sem decisão funcional nova nem correção fora dos achados. A formulação anterior "pendente
para decisão" fica como histórico, não um bloqueio contratual comprovado nesta entrega.

Este PASS encerra a etapa independente, sem declarar revisão formal aprovada. Próxima ação:
revisão formal obrigatória do commit limpo, terceira tentativa no histórico preservado da #4.

### Revisão formal round 3 — ancestral Hermes e alias gerenciado (17/10/2026)

`changes_requested` em `af607599d6d45e74a89de93b5616345127678082`: AC6 unmet,
demais oito AC met, verificação insuficiente. Relatório autêntico preservado no estado
comum Git e em `.checks/code-review/issue-4/formal-round3-report.json`.
Dois achados bloqueantes por leitura, ainda exigindo reprodução e provas pelo Claude:

- P1: durante remoção Hermes sem cache, troca do ancestral `plugins` por junção/link
  depois da primeira exclusão permite alcançar artefatos de mesmo hash fora do alvo.
  `stillRealDir` do filho não reconfere a contenção do ancestral a cada efeito.
- P2: alias de `--target` para diretório gerenciado Claude passa pela recusa textual;
  o caminho real de `resolveTarget` não é verificado novamente antes dos efeitos.

Segurança e possível perda externa comunicadas imediatamente ao proprietário, distinguindo
leitura de reprodução. As correções anteriores de JSON/temporários e metadados foram
reconhecidas, mas não provam estes estados novos. O PASS independente round 6 mantém seu
método e limites; não constitui aprovação formal da entrega nem execução desses cenários.

Correções/provas dentro de AC6/C27/C34 continuam autorizadas pelas rodadas necessárias já
aprovadas. Claude implementa e prova, Codex coordena/revisa. Preservar critérios, histórico,
core e scratches. Usar somente fixtures sintéticas próprias; nunca acessar ou escrever
perfis pessoais/diretórios gerenciados reais para reproduzir o alias. Não repetir a sonda
adicional bloqueada da rodada 6. Depois das correções, nova verificação independente pelos
testes versionados e revisão formal do conteúdo novo. Três tentativas formais consumidas
do teto exclusivo dez; nenhum PR, push ou merge antes de aprovação válida.

Correção da revisão formal round 3 (17/10/2026):

- **Fronteira:** F1 e F2 fechados em `8ef51d8`, com a linha de Landing antes do código em `d3a728f`;
  **reproduzidos** (não só lidos) pelas regressões novas no produto intacto `af60759` em cópias
  isoladas (Windows e WSL, saídas iguais: 15 tests, 13 pass, 2 fail — só `I4-C34h` e `I4-C27c`, por
  diff de asserção) e GREEN nos dois lotes de 98 testes em `8ef51d8` (Windows 96 pass/2 skips, WSL 90
  pass/8 skips, exit 0; 54 linhas `Proof:` casadas). F1: a remoção Hermes saía 0 apagando cópias
  externas e o registro; a mesma raiz na instalação (staging e artefatos gravados fora do alvo, 0) e na
  limpeza da sobra do staging (cópias de outra pasta apagadas, 5) foi tratada pela mesma guarda e
  comunicada. F2: provado com io determinístico que nunca toca um diretório gerenciado real; controle de
  alias legítimo em scratch real. Checks inalterados; Landing +1 linha; regressões `I4-C34h` (14 linhas)
  e `I4-C27c` (9 linhas); nenhuma asserção existente mudou. Evidência em
  `.checks/issue-4-integracoes.build.md`, "Correção da revisão formal round 3". Nenhuma verificação
  independente nem revisão formal pedida ou executada; contadores e histórico intactos; a sonda
  bloqueada da rodada 6 não foi executada nem substituída; estas provas são do autor e não aprovam a
  entrega.
- **Decidido durante o build:** nada novo do proprietário. Referência no caminho real de `plugins` (o
  ancestral comum da pasta do plugin e do staging), lida sob o lock ou logo depois de a instalação
  criá-la; fora do alvo → `target_escape`, outro caminho → `config_changed_during_apply`, ambos em
  `plugins`; junção para dentro do alvo já presente continua aceita (`I4-C34d`). Alvo Claude: mesma
  `isManagedPolicyTarget` sobre o caminho real, depois da recusa textual; diretório gerenciado não
  resolvido — tudo na linha de Landing de `d3a728f`.
- **Abandonado:** conferir só o `lstat` do filho; só a contenção; referência na pasta do plugin; exigir
  `plugins` diretório real; sondar ancestrais até a raiz do sistema; rollback do que já saiu; copiar
  `stateDirRealPath`; só a comparação textual do alvo; `realpath` do diretório gerenciado; recusar todo
  alias; conferir só antes de escrever.
- **Limites registrados, não corrigidos (fora dos achados):** conflito no meio do passo `artifacts`
  não lista o passo e mantém `applied: false` embora algo já tenha saído (semântica anterior de
  `I4-C34c`/`I4-C34g`); `stat` da pasta do plugin depois de um `rename` falho com `plugins` trocado
  (só metadado); `settings.json`/`hooks.json` sem referência contra a troca de um ancestral da própria
  raiz; diretório gerenciado que seja ele mesmo link não é seguido.
- **Próxima ação (orquestrador):** verificação independente 7 pelos testes versionados e leitura
  permitida; revisão formal 4 só depois de PASS.

### Verificação independente round 7 — propriedade do staging e raiz da configuração (17/10/2026)

FAIL 45/48 em `6053d2cce11d0f42f2a788a0383e02a0becdc27f`: C25/C27/C34 e AC6
bloqueados. Relatório completo em `.checks/issue-4-integracoes.verified.md`, SHA-256
`1177ec412a95ee7ee92cd2312f2694aa0ea387b3227ad74af65c8a3580658ecd`.
Os dois achados da formal3 foram corrigidos nos cenários nomeados, mas três estados
residuais foram estabelecidos por leitura, sem reprodução adicional pelo Verifier:

- R7-F1: o próprio staging pode virar link depois de conferido; a guarda de `plugins`
  não impede limpeza, gravação ou promoção através desse filho substituído.
- R7-F2: diretório alheio vazio surgido no destino pode ser substituído pelo rename POSIX,
  pois a colisão é verificada apenas no catch e a operação pode ter sucesso.
- R7-F3: os efeitos da configuração não guardam a raiz/ancestral durante apply; conteúdo
  e acesso iguais não impedem escrita/exclusão fora da raiz canônica após redirecionamento.

Possível perda e quebra de isolamento comunicadas imediatamente ao proprietário como
achados de leitura. A nota de coordenação e ressalvas autorais foram julgadas contra o
contrato, sem virarem autorização para perda nem prova de execução. stat no catch e
informação limitada de passos de conflito foram registrados como limites, sem impor
rollback ou erro 5 a todo conflito 4.

Lotes independentes de 98 testes: Windows 96 pass/2 skips e WSL 90 pass/8 skips,
nenhuma falha/cancelamento, exit 0; 54 provas nomeadas, 22 regressões e 16 testes do motor
contabilizados. Original somente leitura e limpo, 172 blobs iguais em ambas cópias.
O método permaneceu leitura normal e testes já versionados: nenhuma sonda adicional,
nenhum teste novo do Verifier nem repetição/reformulação da ação bloqueada da rodada 6.

Continuidade em AC6 já autorizada: Claude reproduz com regressões seguras versionadas em
fixtures próprias, corrige e prova; depois haverá nova verificação independente pelo
método permitido. Nenhuma formal4, PR ou merge antes do parecer válido. Três tentativas
formais consumidas, teto exclusivo dez, critérios/histórico/core intactos. Codex não
implementou produto/testes.

Correção da verificação independente round 7 (17/10/2026):

- **Fronteira:** R7-F1/F2/F3 fechados em `e570541`, com a linha de Landing antes do código em `851c3bd`;
  **reproduzidos** (não só lidos) pelas regressões novas no produto intacto `8ef51d8` em cópias
  isoladas (Windows e WSL: `install-apply.unit` 18 tests, 15 pass, 3 fail — só `I4-C34i`, `I4-C34j` e
  `I4-C27d`, por diff de asserção) e GREEN nos dois lotes de 101 testes em `e570541` (Windows 99 pass/2
  skips, WSL 93 pass/8 skips, exit 0; 54 linhas `Proof:` casadas). R7-F1: cópias exatas de outra pasta
  apagadas e junção removida na limpeza da sobra, artefatos gravados fora do alvo e link promovido a
  pasta do plugin com 0. R7-F2: diretório vazio do usuário tomado com 0 (POSIX nativo; Windows por
  emulação declarada no io da prova) e, só no Windows nativo, **arquivo** do usuário no destino
  substituído pelo `rename` (bytes perdidos) — comunicado no retorno, fechado pela mesma conferência.
  R7-F3: configuração do Claude/Codex reescrita ou apagada na pasta movida para fora da raiz real,
  temporário próprio apagado através da troca, `.skill-me`/`plugins` criadas fora da raiz. Checks
  inalterados; Landing +1 linha; regressões `I4-C34i` (13 linhas), `I4-C34j` (7) e `I4-C27d` (20; 3 com
  link de arquivo só no WSL); nenhuma asserção existente mudou. Evidência em
  `.checks/issue-4-integracoes.build.md`, "Correção da verificação independente round 7". Nenhuma
  verificação independente nem revisão formal pedida ou executada; contadores e histórico intactos; a
  sonda bloqueada da rodada 6 não foi executada nem substituída e não houve sonda ad hoc; estas provas
  são do autor e não aprovam a entrega.
- **Nota do coordenador (`coordinator-formal3-residuals.md`):** staging trocado na limpeza — confirmado e
  fechado; staging virando link depois de criado/gravado e destino vazio depois do plano — confirmados
  e fechados; ressalva autoral da raiz/ancestral da configuração — confirmada como defeito do AC6 e
  fechada (a formulação anterior "fora dos ancestrais compartilhados dos achados" fica como histórico);
  `stat` no `catch` do rename e passos parciais de `artifacts` — mantidos como limites, como julgou o
  Verifier7. Nota encerrada.
- **Decidido durante o build:** nada novo do proprietário. Staging só como diretório real pelo `lstat`
  (link para dentro do alvo também é alheio); destino da promoção recusado com `foreign_artifact` e
  staging próprio mantido no lugar; raiz pela mesma regra de `.skill-me`/`plugins`, conflito em `.`;
  contenção do próprio arquivo antes das leituras e da exclusão da configuração sob o lock — tudo na
  linha de Landing de `851c3bd`.
- **Abandonado:** conferir só `plugins`; tipo do staging só no início da limpeza; referência no caminho
  real do staging; conferir o conteúdo do staging antes da promoção; só o `catch` do `rename`; `rename`
  sem substituição/CAS; limpar o staging ao recusar o destino; diretório vazio como "nada a preservar";
  só guardas da pasta de estado; só a contenção do arquivo em todo efeito; referência no caminho real
  do arquivo; sondar ancestrais até a raiz do sistema, inode, montagem; rollback da configuração.
- **Limites registrados, não corrigidos (fora dos achados):** janela entre conferência e syscall; outro
  diretório real no mesmo caminho e bytes idênticos; raiz trocada por arquivo (por leitura, lock pode
  terminar em 5 no POSIX; não testado); prévia sem reconferência entre as próprias leituras; `rmdir` de
  `.skill-me`/`plugins` logo depois da última conferência; `mkdir` do staging com `EEXIST` continua 5;
  `stat` no `catch`, passos parciais de `artifacts` e os demais já registrados.
- **Próxima ação (orquestrador):** verificação independente 8 pelos testes versionados e leitura
  permitida; revisão formal 4 só depois de PASS e relatório commitado.

Verificação independente round 8, concluída após retomada do desligamento (17/10/2026):

FAIL 47/48 em ef341c6b1f84fe342b2b0e58ff987fb3d7f004de: C25 e AC6 permanecem
pendentes por R8-F1. Por leitura, replaceChecked deriva o acesso do arquivo atual antes de
validar que ele ainda corresponde à configuração lida: se for substituído por outro
documento de permissões mais amplas, o temporário recebe o texto anterior sob o novo
acesso; hash/contenção são conferidos somente depois da gravação. A detecção posterior
do conflito não satisfaz C25b, que proíbe ampliar acesso em qualquer instante.
Achado comunicado ao proprietário como análise estática; nenhuma reprodução ou leitura
de conteúdo privado real pelo Verifier/coordenador foi realizada.

Os três achados da rodada 7 foram julgados corrigidos. A retomada preservou os TAPs
anteriores e repetiu apenas os testes já versionados em cópia isolada: 101 testes,
Windows 99 pass/2 skips e Ubuntu 93 pass/8 skips, zero falhas/cancelamentos, exit 0.
A autoria das fases, identidades, 54 provas, carries, limites e interrupção técnica
constam integralmente no relatório independente. Nenhuma sonda adicional ou repetição
da ação bloqueada da rodada 6; Codex não implementou produto nem testes.

Continuidade já autorizada no mesmo AC6: Claude corrige a ordem das verificações antes
da primeira gravação de conteúdo e prova a regressão com fixtures seguras versionadas;
depois, nova verificação independente. A revisão formal 4 aguarda PASS e commit limpo.
Três tentativas formais de dez consumidas; critérios e histórico preservados. A autorização
do proprietário para as rodadas necessárias, merge da #4 após aprovação e uma nova
sessão depois da conclusão permanece vigente após “pc desligou pode continar”.