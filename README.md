# skill-me

Relatórios locais de execução: [docs/report.md](docs/report.md).

Infraestrutura mínima de governança. Ainda não há aplicação ou publicação configurada.

## Governança e agentes

Tracking no [OldBoyDev — Engineering](https://github.com/users/oldboydev/projects/3).
Regras compartilhadas em [AGENTS.md](AGENTS.md); Claude usa [CLAUDE.md](CLAUDE.md)
que importa esse arquivo. Grok lê AGENTS.md nativamente, conforme a
[documentação oficial](https://docs.x.ai/build/features/skills-plugins-marketplaces).
Você pode escolher Grok ou Claude para implementar uma entrega; Codex local revisa.
Isso não muda agentes configurados no produto ou na máquina.

Fluxo: issue → plano/aprovação quando exigidos → implementação e provas →
Codex local → PR → In Review → merge humano. Uma revisão aprovada é suficiente;
o teto de duas tentativas serve somente para correções necessárias.

Comandos novos: `npm run review:run -- --issue N --profile light`,
`npm run review:check -- --issue N --profile light` e `npm run pr:create --
--issue N --profile light --title "tipo: descrição" --body-file caminho.md`.
Perfis light/ui exigem plano e verificação; direct mantém checks aplicáveis sem
esses artefatos. [Guia completo e adoção em outros projetos](scripts/code-review/README.md).
O motor é vendorizado nos pilotos. Na issue #7, o proprietário [autorizou manter apenas neste repositório](https://github.com/oldboydev/skill-me/issues/7#issuecomment-6297902519) a ampliação do teto de overrides para 20; três arquivos do core divergem nessa exceção. Outras atualizações devem preservar a igualdade dos cinco arquivos.

Relatórios de runtime ficam ignorados em .checks/code-review; histórico/lock ficam
no Git comum, compartilhados entre worktrees. Não publique relatórios depois da
revisão em novo commit: use o resumo gerado no PR. Conteúdo ou contexto alterado
exige revisão válida novamente. Login Codex por ChatGPT; nenhuma IA executa na CI.

A CI valida as ferramentas de governança. package.json é privado e contém apenas esses comandos.

## Diagnóstico local de agentes (doctor)

`npm run --silent doctor -- --json` lê, de forma somente leitura, quais agentes
(`claude`, `codex`, `hermes`) estão instalados no PATH local, qual versão foi
encontrada e qual evidência a sustenta, e qual configuração/confiança de hooks
foi lida. O comando nunca inicia um agente, não instala hooks e não corrige
configuração — ver [docs/agent-compatibility.md](docs/agent-compatibility.md)
para o contrato completo e as lacunas conhecidas.

Sem `--json`, a mesma informação sai em texto português. Flags: `--json`,
`--cwd <diretório>`, `--collector <endpoint>` (tenta só uma conexão de
transporte a `tcp://127.0.0.1:<porta>` ou `tcp://[::1]:<porta>`, nunca envia
payload) e `--help`.

Três estados aparecem em todo relatório e não devem ser confundidos:

- `status: partial` no envelope — alguma configuração de agente não pôde ser
  lida (inválida, acima do limite de tamanho ou com permissão negada); as
  demais entradas continuam presentes. O comando ainda sai com exit `0`.
- `support: unverified` numa capacidade — não há evidência local vinculada à
  versão encontrada que comprove aquele mecanismo; não significa "não
  suportado", significa "não comprovado por esta leitura". O `reasonCode`
  diz o porquê (ex.: `no_static_contract_source`, `version_unresolved`,
  `surface_not_inspected`). `verified` exige a tabela de contrato que a
  própria instalação traz; `unavailable` só aparece na CLI local quando o
  launcher do agente não está no PATH consultado.
- `collector.identityVerified: false` — mesmo quando `collector.status` é
  `reachable`, um socket aceitar a conexão não comprova que o processo do
  outro lado é o coletor nem que a captura funciona.
