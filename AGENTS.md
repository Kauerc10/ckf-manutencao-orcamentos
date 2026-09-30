# Agent instructions

Read PRODUCT.md and DESIGN.md for the product scope and visual direction before changing the application.

## Agent skills

### Issue tracker

Issues and specifications are tracked in GitHub Issues at Kauerc10/ckf-manutencao-orcamentos. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Use a single context: root `CONTEXT.md` and `docs/adr/`, created as domain decisions emerge. See `docs/agents/domain.md`.

### Git e revisão

Não use `codex/` no nome das branches. Escreva commits e PRs em português, de forma natural e profissional, como comunicação da equipe CKF. Humor leve cabe quando ajudar o texto, sem atrapalhar a revisão.

## Catálogo comercial

Mantenha o PDF do catálogo principal separado das tabelas por empresa. Cadastre e edite serviços em uma tela própria, com exemplos didáticos de escopo e unidade de cobrança. Gere códigos sequenciais `CKF-00001` no servidor; preserve os códigos existentes e não os altere na edição. O preço padrão corresponde a uma unidade declarada, enquanto quantidade e valores no orçamento continuam manuais.

No formulário do catálogo, prefira exemplos dentro dos campos e um cálculo curto junto ao preço. Evite cartões e textos de ajuda repetindo rótulos ou explicando ações óbvias; deixe exemplos adicionais de unidade sob demanda.

Tabelas por empresa também têm editor dedicado. A lista serve para consultar versões e PDF; criação e edição ficam em rotas próprias, com empresa, serviços, preço por valor ou porcentagem e diferença interna visíveis antes de salvar. Preserve o histórico e a separação entre preço padrão e preço negociado.
