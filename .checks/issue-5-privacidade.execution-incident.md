# Issue #5 — incidente na preparação dos testes WSL

Registro do coordenador Codex em 17/10/2026, baseado no log integral do autor
Claude em `.checks/code-review/issue-5/author-storage.jsonl`, preservado localmente.
Não é resultado de teste de produto nem aprovação do Verifier.

## Ocorrência

Na preparação do archive do commit `0ab38fb`, a passagem de script inline por
shells Windows/Git Bash/WSL expandiu a variável do diretório temporário fora da
camada pretendida. No distro `Ubuntu-22.04`, com usuário root, a cópia do archive
foi escrita em `/src.tar`, a extração em `/repo`, e um diretório vazio foi criado
em `/tmp/skill-me-i5-storage-sJrF`. Esses dois primeiros destinos descumpriram o
isolamento em `/tmp` previsto para esta execução.

O comando inicial usava `set -e` e `mkdir /repo` sem `-p`: seu prosseguimento até
a extração indica que `/repo` foi criado por aquela execução. O archive copiado
teve SHA-256
`d4ea9da52b5767d140eb4497620f10f419873c8293dbc541bdb5d8196bf3107d`, igual ao
archive da cabeça testada. A inspeção posterior mostrou os artefatos no mesmo
minuto da operação e o diretório temporário vazio.

## Remoção já executada pelo autor

O autor conferiu o hash de `/src.tar`, a presença de arquivos do archive em
`/repo` e o diretório temporário vazio antes de removê-los. O resultado do
comando confirmou a ausência dos três destinos. O coordenador não repetiu essa
remoção nem executou nova limpeza do sistema WSL.

Limitação: não há preflight que registre a existência anterior de `/src.tar`.
A cópia usou uma operação que poderia substituir esse arquivo caso existisse.
O hash posterior não prova que ele não existia antes. Portanto, não se pode
afirmar ausência absoluta de sobrescrita nesse destino. Não há indicação de
perda de dados do checkout do projeto. A ressalva foi comunicada ao proprietário.

Identificadores examinados no log: inicial `toolu_013rZKXHsoV31MfpXoxtGvi6`,
inspeção válida `toolu_01LRn1gaBhfdgF89oBLUYdH7`, remoção
`toolu_012z5o8jAgnAAZrurhE4iwVs`. Os resultados foram lidos, não inferidos
apenas do relato final do autor.

## Execução válida e prevenção

As provas válidas usaram o distro `Ubuntu`, usuário não root, Node 24.13.0,
script em arquivo e `MSYS_NO_PATHCONV=1`. Archive e checkout ficaram em
`/tmp/skill-me-i5-storage-RLPgp1`; o hash do tar foi comparado antes dos testes.
Essa cópia e os logs são preservados. Uma preparação subsequente deve conferir
usuário não root antes de mutações, usar `mktemp -d` com caminhos citados e
recusar destino fora do diretório gerado; não passar variáveis de shell por
camadas que as possam expandir antecipadamente.

Não se tratou de rejeição da plataforma nem da preparação antiga do Verifier6.
Esse fluxo proibido e seu probe residual não foram repetidos. Nenhum histórico,
scratch de Verifier ou backup anterior foi removido para reiniciar verificações.

## Comparação RED do store na árvore original — 18/10/2026

No lote de correções da terceira tentativa formal, o autor usou `git stash
push/pop -- src/integrations/privacy/store.mjs` duas vezes para comparar o
produto antigo com o corrigido. O coordenador identificou o procedimento ao
ler o log e informou o proprietário. A referência `verify.md` da skill
`tlc-implement` prescreve isolamento para comparações/mutações e diz “never
use git stash” na seção de fault injection. O procedimento não será repetido;
as provas finais e independentes usam commits limpos e cópias com identidade
conferida. O perfil light não alegou injeção sistemática de falhas.

Os registros preservados em `.checks/code-review/issue-5/author-fix-formal3.jsonl`
mostram `STORE_AT_HEAD`, RED de C49b com controle C51b aprovado e o retorno da
correção (`STORE_FIXED`), sem erro/conflito de pop. O diff subsequente dos três
módulos correspondeu às correções inspecionadas, commitadas em `fecbea5`;
Windows/WSL passaram os gates nesse commit. A lista de stash ao final estava
vazia; não foi capturado um hash inicial de toda a pilha, portanto não se
alega prova retrospectiva absoluta sobre seu estado anterior. Não há evidência
de perda de fonte nos resultados examinados. Root não executou stash, reset,
limpeza ou nova operação sobre essa pilha.

A comparação F3 reproduziu a perda exclusivamente no scratch sintético: o
produto antigo informou `deleted:true`, removeu a chave alheia da fixture e
manteve a captura ativa com sua chave; o corrigido recusou com `foreign_entry`,
exit4, preservando ambos. Nenhum dado pessoal foi usado. O recibo autoral
`86815ad` registra a comparação; a nova verificação independente reexecutará
as provas no HEAD final e distinguirá sua execução do método autoral anterior.
