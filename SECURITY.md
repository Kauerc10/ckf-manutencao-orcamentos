# Política de segurança

## Reporte responsável

Não abra issue pública para relatar falhas de autenticação, regras de acesso, dados de clientes, credenciais, chaves Supabase, URLs internas ou vulnerabilidades na função de exclusão.

Envie um relato privado para [kaue.ruon@gmail.com](mailto:kaue.ruon@gmail.com), com impacto, área afetada e passos seguros para reproduzir. Nunca envie tokens, senhas, dumps ou dados reais de clientes no reporte.

## Escopo atual

O sistema usa Supabase no cliente por meio de `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Essas variáveis são públicas por natureza; a autorização deve permanecer nas políticas RLS, RPCs e funções de servidor.

O repositório contém migrações em `supabase/migrations` e a função `admin-delete-orcamento`, que depende de variáveis de servidor como `SUPABASE_URL`, `SUPABASE_DB_URL` e uma chave publicável. Nunca coloque essas configurações de servidor em arquivos `VITE_*` ou no código do frontend.

## Cuidados ao contribuir

- Não versione `.env`, chaves de serviço, senhas, dados de clientes ou respostas de produção.
- Revise mudanças em RLS, RPCs, migrações e edge functions com atenção especial.
- Mantenha testes, lint e build passando antes de abrir a pull request.
- Preserve a confirmação de administrador e o registro de auditoria no fluxo de exclusão de orçamentos.

## Fora de escopo

Solicitações de uso do sistema, conteúdo de orçamento ou mudanças de interface devem seguir [SUPPORT.md](SUPPORT.md) ou o fluxo normal de contribuição.
