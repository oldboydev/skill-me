# Relatório local de execução (issue #7)

`integrations report` lê uma captura existente pelo mesmo store de `privacy timeline`, correlaciona os registros sanitizados e compara comandos **literais** de itens de lista de uma skill. Não inicia o agente, não executa comandos mencionados no `SKILL.md`, não acessa rede e não grava relatório automaticamente.

```sh
node src/integrations/cli.mjs report --root <diretório> --capture <id> --skill <caminho/para/SKILL.md>
node src/integrations/cli.mjs report --root <diretório> --capture <id> --skill <caminho/para/SKILL.md> --format markdown > relatorio.md
node src/integrations/cli.mjs report --root <diretório> --capture <id> --skill <caminho/para/SKILL.md> --format json > relatorio.json
```

`--skill` é opcional quando a timeline nomeia exatamente uma skill e existe exatamente um arquivo regular em `<cwd>/.agents/skills/<nome>/SKILL.md`, `.claude/skills`, `.codex/skills` ou `skills`. O relatório diz `observed_name` nessa busca e `explicit_path` quando o caminho é informado. Caminho explícito pode divergir do nome observado; a divergência aparece em `nameMatchesObservation: false`. O hash SHA-256 corresponde aos bytes lidos, e cada instrução aponta a linha do arquivo. A consulta recusa arquivo não regular, UTF-8 inválido ou mais de 1 MiB.

O leitor ignora frontmatter e blocos cercados de código. Itens de lista são classificados em ação, validação, orientação e condição por padrões conservadores de início da frase. Outros formatos de Markdown e linguagem livre podem ficar sem avaliação precisa. Um comando só é comparado quando aparece literalmente entre crases e o mesmo texto está no conteúdo **já sanitizado** de argumentos observado pela captura. Para isso, a captura precisa ter sido iniciada com `--content`; sem esse opt-in o relatório costuma marcar `unobserved`.

Os estados de avaliação são `sufficient`, `partial`, `contradicted`, `unobserved`, `not_applicable` e `inconclusive`. `sufficient` significa que operações com vínculo nativo registraram resultado positivo de **todos** os comandos literais do item; não prova toda a intenção da instrução. `partial` cobre comando faltante, operação aberta ou vínculo heurístico. `contradicted` registra resultado negativo em algum comando. Uma condição só é `not_applicable` quando as observações explícitas mostram que ela foi falsa; uma falha anterior continua sendo gatilho mesmo após retry positivo. A ação precisa vir depois do último gatilho verdadeiro na mesma sessão. Sem prova suficiente do gatilho, a condição fica `inconclusive`. Orientação é `not_applicable` porque não é etapa executável. A ausência de evento não é acusação de omissão. Um `Read` de `SKILL.md` não prova que o agente carregou as instruções.

Texto é o formato padrão. Markdown e JSON usam a mesma análise. JSON contém `reportVersion: 1`, identificação/hash da skill, ambiente/contratos observados, timeline v1, avaliações com `sources.skill` e `sources.events`, correções e limitações. O conteúdo coletado continua sujeito à política e às limitações de [privacidade](privacidade.md); o relatório não relê payload nativo nem conteúdo bruto da captura. Mantenha o arquivo exportado sob o mesmo cuidado da captura local.

Erros saem como JSON único `{schemaVersion:1,command:"report",status:"error",error:{code}}`, sem ecoar caminhos nem valores. Exit 2 significa uso inválido, inclusive ID de captura malformado; 3, arquivo de skill ou estado da captura ausente/inválido; 4, conflito ou lock do store; 5, E/S. Um relatório de captura ativa é um snapshot: eventos posteriores podem mudar o resultado.
