# skill-me

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
O motor é o mesmo dos pilotos e suas atualizações devem preservar a igualdade dos cinco arquivos.

Relatórios de runtime ficam ignorados em .checks/code-review; histórico/lock ficam
no Git comum, compartilhados entre worktrees. Não publique relatórios depois da
revisão em novo commit: use o resumo gerado no PR. Conteúdo ou contexto alterado
exige revisão válida novamente. Login Codex por ChatGPT; nenhuma IA executa na CI.

A CI valida as ferramentas de governança. package.json é privado e contém apenas esses comandos.
