# Guia técnico do sistema de orçamentos

## Visão geral

O sistema é uma aplicação interna para criar, consultar, editar, duplicar, exportar e excluir orçamentos da CKF Manutenção. A interface é construída com React e TypeScript; os dados e a autenticação são integrados ao Supabase.

## Estrutura atual

| Caminho | Responsabilidade |
| --- | --- |
| `src/pages` | Telas de login, dashboard, clientes, orçamentos e configurações |
| `src/components` | Layout, formulários, listagens, diálogos e prévia de documentos |
| `src/data` | Repositórios de acesso a dados e configurações do sistema |
| `src/lib` | Integração Supabase, validações, formatação, exportações e regras de orçamento |
| `src/hooks` e `src/stores` | Ações e estado de autenticação/configurações |
| `supabase/migrations` | Evolução do schema, permissões, auditoria e regras de acesso |
| `supabase/functions/admin-delete-orcamento` | Exclusão de orçamento com sessão, aprovação administrativa e auditoria |

## Executar e validar

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

O build executa `tsc -b` antes do Vite. Os testes usam Vitest e cobrem regras de orçamento, clientes, exportações, migrações e contratos da edge function.

## Configuração local

Copie `.env.example` para `.env.local` e informe a URL e a chave publicável do projeto Supabase. O cliente não é inicializado se os valores de exemplo forem mantidos.

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

As variáveis da função de exclusão pertencem ao ambiente do Supabase e não ao arquivo de ambiente do frontend.

## Banco e autorização

O histórico de mudanças do banco está em `supabase/migrations`. A autorização é responsabilidade das políticas, RPCs e funções no Supabase; esconder botões na interface não substitui essas regras.

Para exclusão, a edge function valida a sessão solicitante, autentica a aprovação de um perfil administrativo ativo e registra eventos de negação ou falha antes de invocar a rotina de banco.

## Documentos e dados de cliente

O sistema gera documentos comerciais em PDF e exportações XLSX/CSV. A identificação usada em um orçamento pode preservar um snapshot textual do cliente para manter consistência documental, inclusive quando não há um cliente cadastrado vinculado.

## Marca e repositórios relacionados

As diretrizes e assets oficiais ficam em [CKF Design](https://github.com/Kauerc10/ckf-design). O site institucional fica em [CKF Site Institucional](https://github.com/Kauerc10/ckf-site-institucional). Alterações de marca devem ser originadas no repositório de design e aplicadas aqui por pull request.
