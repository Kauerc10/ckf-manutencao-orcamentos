# Agent instructions

Read PRODUCT.md and DESIGN.md for the product scope and visual direction before changing the application.

## Agent skills

### Issue tracker

Issues and specifications are tracked in GitHub Issues at Kauerc10/ckf-manutencao-orcamentos. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Use a single context: root `CONTEXT.md` and `docs/adr/`, created as domain decisions emerge. See `docs/agents/domain.md`.

## Catálogo comercial

Mantenha o PDF do catálogo principal separado das tabelas por empresa. Cadastre e edite serviços em uma tela própria, com exemplos didáticos de escopo e unidade de cobrança. Gere códigos sequenciais `CKF-00001` no servidor; preserve os códigos existentes e não os altere na edição. O preço padrão corresponde a uma unidade declarada, enquanto quantidade e valores no orçamento continuam manuais.

No formulário do catálogo, prefira exemplos dentro dos campos e um cálculo curto junto ao preço. Evite cartões e textos de ajuda repetindo rótulos ou explicando ações óbvias; deixe exemplos adicionais de unidade sob demanda.
