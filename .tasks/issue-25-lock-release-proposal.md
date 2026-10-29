# Issue #25 / PR #28 — proposta de correção da liberação do lock

**Status: plano completo aprovado pelo proprietário, incluindo D1–D3 e os ajustes do Root, nas três plataformas.** Autorização literal: “Pode aplicar o plano completo nas três plataformas, mantendo os testes e prazos, e seguir até a CI ficar toda verde para fazer o merge e finalizar.” Registro: [6502294779](https://github.com/oldboydev/skill-me/issues/25#issuecomment-6502294779). Autoriza a implementação deste escopo, preservando os gates e todo o histórico.

**Progresso (29/10/2026, acréscimo):** implementação iniciada por um novo autor Claude na mesma branch, a partir de `1613e23`. A forma literal, os refinamentos observáveis, as provas e o corte em fatias foram registrados antes do código no plano principal (seção “Liberação segura do lock”), no Landing (“Liberação do lock por reserva exclusiva”), no C46 (u), no C50 (o), no `Swept` e no `Handoff` de `.checks/issue-25-agent-launch.md`. Este registro não é resultado: nenhuma prova, gate, verificação ou CI desta implementação existe ainda.

Este plano aprovado complementa `.tasks/issue-25-agent-launch.md`. A decisão explícita acima resolve a alteração do layout e do ciclo de vida descrita aqui, conforme `AGENTS.md:86-98` e o retorno ao proprietário previsto no plano principal, `:332-334`. As decisões abaixo ficam registradas na forma em que foram propostas e aprovadas.

## Problema e evidência

O Verifier 23 terminou **FAIL49/50** no HEAD `6204613`: A/B/C19/19, mas D1.062/1.041/1/20, término natural. O T8-C15 saudável recebeu `open lock EPERM` no produtor b, perdeu uma entrega e capturou79/80. Relatório e histórico preservados em `d80b246`; a revisão formal14 não foi usada.

O diagnóstico isolado demonstrou uma classe de defeito: no Windows, entre marcar o `.lock` para exclusão e fechar o handle, outro processo recebe `EPERM` numa tomada normal. Foram1.887 ocorrências nas sondas com a API real e10/10 na condição nativa controlada, nos Nodes24.13.0 e24.22.1. A causa das execuções históricas não foi atribuída, pois os intervalos completos não foram preservados.

A variante com reserva exclusiva completou20.000 eventos densos sem falhas ou sobras, neste Windows/C:. A liberação completa teve p50 de2,34–2,39ms, contra0,60–0,69ms no protocolo atual; a posse passou de0,60–0,69 para1,33–1,35ms. Houve caudas isoladas de49 e101ms. São medidas de um protótipo, com callback vazio, sem promessa de desempenho, prova POSIX ou CI.

Fontes locais completas, ignoradas pelo Git: `.checks/code-review/issue-25/builder-eperm-diagnostic/{identity.txt,plan.md,results.md,release-plan-proposal.md,scripts,logs}`. Fontes primárias: [CreateFileW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew), [DeleteFileW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-deletefilew) e libuv vendorizado nas tags oficiais Node24.13.0/24.22.1. A medição antiga de4.500 ciclos usa um lock por produtor e não prova disputa no mesmo nome.

## Decisões propostas ao proprietário

- **D1 — novo ciclo de vida e layout:** liberar o lock por renomeação para dentro de uma pasta recém-reservada exclusivamente pela operação. Aplicar tanto ao store quanto ao lock da configuração da observação. O nome passa a ficar livre antes da limpeza do arquivo retirado. Falhas de limpeza continuam sendo falhas, sem novas tentativas; quedas podem deixar sobras para inspeção manual, sem coleta automática por nome, prefixo, idade ou pid.
- **D2 — recuperação conservadora:** manter as validações atuais. Com `store.json` válido, uma sobra é inerte; sem marcador, uma pasta com essa entrada desconhecida continua recusada como `store_invalid`, até inspeção manual. Isso inclui uma criação simultânea no caminho excepcional em que outra criação falhou antes de publicar o marcador. Não ampliar adoção ou apagar entradas alheias.
- **D3 — um protocolo comum:** aplicar a mesma liberação em Windows, Linux e macOS, condicionada às provas POSIX e à CI. Nenhuma divisão silenciosa por plataforma se houver regressão.

## Contratos preservados

- Tomada por `wx`, bytes de posse, prioridade do erro do callback e proibição de remover lock alheio.
- Somente `EEXIST` vira `lock_present` e usa a repetição existente de10ms. `EPERM` real continua `io_failure`. Nenhum retry de E/S, fallback para unlink direto ou aceitação de perda.
- Produto750/650ms; relatório1.000ms incluindo settle650; stdin2.000ms/faixa1.900–6.000; Hermes5s;500eventos/8MiB/7dias.
- T8-C15 continua80eventos,40por produtor,2produtores sobrepostos,4linhas intercaladas, payloads, export80 e asserções integrais. T8-C16 continua exigindo3criações do lock.
- Runner padrão min(CPU−1,8), jobs20/10/5min e manual10min. Sem runtime, dependência, relógio, AV, pool, cache ou ambiente global novos.
- Pacote privado; mesma branch e PR. Nada de publicação, deploy, nova issue ou push direto na main.

## Algoritmo a implementar depois da aprovação

1. Manter aquisição e callback atuais, guardando a primeira falha.
2. Reservar uma pasta nova ao lado do lock por `mkdtemp`, com prefixo `<nome-do-lock>-release-`, sem reutilizar entradas existentes. Adicionar esse efeito mínimo a `createStoreIo`.
3. Registrar tipo/não-link e identidade confiável (`dev`/`ino`) da pasta. A reserva tem0700 no POSIX e herança de DACL da raiz no Windows, como o restante do armazenamento.
4. Conferir os bytes do lock imediatamente antes de renomeá-lo para `<slot>/lock`. O destino fica dentro da pasta que a chamada acabou de criar; nome com nonce, sozinho, não é prova de propriedade.
5. A renomeação é a liberação. Limpar apenas recursos desta chamada, relendo os bytes do arquivo retirado e verificando a identidade da pasta. Usar unlink do arquivo conhecido e rmdir da pasta vazia; nunca remoção recursiva ou rollback sobre o nome original.
6. Guardar a primeira falha e executar cada etapa no máximo uma vez. Não esconder falhas posteriores à retirada: continuam confirmação incerta/io_failure, conforme o contrato vigente.

### Ajustes obrigatórios da revisão do Root sobre o protótipo

Estes pontos integram a proposta final e prevalecem sobre as sugestões anteriores do diagnóstico:

- **Identidade antes de qualquer limpeza:** conferir o slot antes de enumerar, abrir ou apagar seu conteúdo, e novamente antes do rmdir. Se a identidade/tipo não conferir, não atravessar nem limpar a entrada trocada. A releitura do retirado não substitui a conferência da pasta.
- **Falha de validação da reserva antes da retirada:** não aceitar um aviso `lockLeft:false` quando o nosso lock pode ter permanecido. Tratar a quebra da pós-condição do recurso reservado como erro interno sem inventar errno nativo, propagado pela fronteira como `io_failure` e `lockLeft:true`. Preservar `lostCode` para a conferência de bytes/posse do lock alheio. Provar a distinção nos dois consumidores.
- **Evidência honesta em rename com erro:** um rename que falha não prova que o lock foi liberado. O formatter deve representar posse indeterminada quando não houver confirmação do efeito, em vez de marcar automaticamente as operações seguintes como “fora do lock”. Preservar a interpretação das linhas legadas e provar os casos de falha antes e depois do movimento.
- **Medida da implementação final:** o protótipo E5 não contém necessariamente todas essas conferências extras. Medir a liberação completa do código final, nas mesmas condições declaradas, antes de alegar seu custo. O orçamento funcional permanece o mesmo.

O limite de ameaça continua o existente: não se promete proteção absoluta contra processo hostil com a mesma autoridade entre uma conferência e a operação seguinte. A reserva exclusiva evita colisão com arquivos preexistentes; as validações não podem ser removidas para reduzir o custo.

## Erros e quedas

- Reserva ou validação anterior à retirada que falha: erro preservado, lock pode permanecer, sem fallback. Se não há identidade suficiente da reserva, ela não é limpa.
- Bytes alheios antes do movimento: lock alheio intacto; erro fechado correspondente; remover apenas uma reserva comprovadamente nossa e vazia.
- Rename que falha sem mover: lock permanece. Rename que move e depois devolve erro: confirmação incerta; cleanup somente se o retirado/slot forem comprovados.
- Arquivo retirado trocado ou identidade divergente: nada alheio é apagado. Não desfazer o movimento sobre um lock que outro processo já pode ter tomado.
- Unlink/rmdir que falha: propagar a falha, sem repetição e sem varredura posterior.
- Queda antes do rename: pode deixar lock e slot; recuperação manual, como já ocorre com lock de processo morto.
- Queda depois do rename: o lock está livre; pode sobrar pasta vazia ou arquivo com pid/nonce, sem chave ou conteúdo de captura. Não coletar automaticamente. A retenção7dias das capturas não se aplica a esses metadados.

## Adaptações e provas obrigatórias

O autor será Claude ou Grok. Antes do código, registrar aprovação e refinamentos no plano principal, Sources/Landing/C46/Swept/Handoff e critérios observáveis. Uma eventual adaptação de teste explica a mudança de operação, sem reduzir o comportamento exigido.

- Reapontar as injeções de “lock fica” e “confirmação perdida” do unlink original para o rename que libera. Preservar variáveis, contagens, códigos, lock presente/ausente, export e mensagens funcionais. Acrescentar a fronteira de falha da limpeza posterior.
- Preservar a prova das3criações e esperar o término da liberação completa onde a prova já exige término real.
- Instrumentar mkdtemp/rename/limpeza, incluindo erros e incerteza de posse. Não converter ausência de dado em zero nem expor caminho, IDs, chaves, conteúdo ou ambiente.
- Manter métricas de tomada/liberação completa. Distinguir retirada, reserva, rename, remoção do retirado e rmdir no diagnóstico; ajustar o esquema e sua validação, sem reutilizar medições antigas como prova do novo HEAD. Manter4500ciclos/3produtores/3cargas64KiB/120s e faixas600/650 como diagnóstico.
- Testes de cada etapa de falha, primeira falha prioritária, contagem exata de chamadas sem retry, tipos/identidades divergentes, entradas alheias intactas, quedas nos três pontos e validação com/sem marcador.
- Regressão de disputa real no Windows, RED anterior e GREEN corrigido, declarando qualquer amostragem estatística; provas de decisão determinísticas e mutantes dos controles de propriedade/cleanup/erro. Não confundir adaptação de injeção com prova da causa.
- Fecho real dos consumidores e helpers afetados, em AWindows24.22.1, Bclone24.13.0/autocrlf, CWSLisolation e Dnpm test completo/default8/nativosHermes. Alvos e orçamentos declarados antes, uma execução de cada gate, sem rerun inalterado para procurar verde. Preservar todos os FAILs/skips/limites e o histórico.
- Nova verificação independente da feature inteira após a última fatia verde. A próxima é24, ainda não registrada; auditoria externa24 tem apenas baseline preparada. Formal14 continua autorizada e não usada, teto14 apenas25/light,13tentativas anteriores preservadas.
- Publicar somente com PASS independente e ready válido; contexto/referências reconferidos. Depois, uma nova execução manual com medição registrada e todos os cinco checks regulares verdes em PR e manual no mesmo HEAD aprovado. Só então o merge já autorizado.

## O que ainda não é resultado

O código de produto, os testes, o workflow e o benchmark continuam no estado anterior. O plano aprovado não faz o FAIL23 virar PASS, não identifica retrospectivamente a causa das duas falhas antigas e não garante uma CI futura verde. A aprovação D1–D3 autoriza a implementação deste escopo; não dispensa nenhuma prova, revisão ou gate.
