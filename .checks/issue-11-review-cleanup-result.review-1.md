# Issue #11 — revisão formal 1

Status: `changes_requested`, perfil light, tentativa 1 de 2.
Head: `77c442fe8b583ac5a409b58e5fa63a32c1d483e1`.
Base: `3b6387615aa9233fe89771782fd8e0948042cdac`.

O revisor formal confirmou os sete critérios da issue com verificação suficiente.
Um achado P2 bloqueante permanece na prova complementar exigida pelo plano.

## F2 — comparação de cópias depende da configuração Git externa

Localização: `.checks/issue-11-review-cleanup-result.proof.mjs:105` nesta versão.
Com checkout CRLF e `core.autocrlf=true` apenas na configuração local, configuração
Git de sistema/global ausente ou false, a cópia temporária perde a configuração local.
`git hash-object` nessa pasta calcula o hash dos bytes CRLF, embora os bytes copiados
sejam exatamente os do checkout. A asserção rejeita a cópia e não executa `blocked`.

Esperado: comparar a identidade dos bytes copiados sem depender da configuração Git
da pasta temporária; manter a verificação dos cinco blobs no contexto do repositório.
Atual: cópia correta rejeitada. Impacto: prova de `blocked` não reproduz em configuração
Git válida. Nenhum defeito adicional foi apontado no motor aprovado do ERP.

O revisor não executou testes nem comandos de escrita. Inspeção e cálculos somente
leitura mostraram `review.mjs` com hash `bdb7fa539c36136630a6274796c833beddde212d` em
autocrlf=false e `c51cff675f6472b9e2ffa02eaa03cd80f3d48dad` em autocrlf=true.
Limites declarados: logs brutos ignorados ausentes na cópia; provas com dublês;
sem diretório realmente ocupado, IA, Linux/macOS ou CI nesta revisão.

O resultado integral e histórico de tentativas permanecem em runtime no diretório Git
comum `code-review/issue-11.state.json` e `.checks/code-review/issue-11/response.json`.
Este registro preserva o achado; não substitui o estado autoritativo nem autoriza novo teto.
