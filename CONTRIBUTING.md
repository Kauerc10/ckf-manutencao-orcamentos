# Como contribuir

## Fluxo de trabalho

A `main` recebe mudanças somente por pull request. Crie uma branch antes de começar, com nome curto e descritivo:

```text
feat/filtro-orcamentos
fix/exportacao-xlsx
docs/atualiza-seguranca
```

Faça commits focados e descreva na pull request o problema, a alteração, o impacto em dados ou documentos e a validação realizada. Não inclua assinaturas automáticas nas mensagens.

## Ambiente local

O projeto usa React, TypeScript, Vite e Supabase.

```bash
npm install
```

Crie o arquivo `.env.local` a partir de `.env.example` e preencha apenas as variáveis públicas do cliente:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Em seguida:

```bash
npm run dev
```

Sem uma configuração válida do Supabase, o cliente fica desabilitado por proteção do próprio código.

## Validação obrigatória

Execute antes de abrir a pull request:

```bash
npm run lint
npm test
npm run build
git diff --check
```

Para mudanças em orçamento, cliente, exportação ou exclusão, inclua testes específicos ou explique na pull request por que não se aplicam.

## Banco e funções

As alterações de banco ficam em `supabase/migrations`. Não edite migrações já aplicadas: adicione uma nova migração ordenada por data. A função `supabase/functions/admin-delete-orcamento` usa variáveis de servidor e não deve receber segredos pelo frontend.

## Marca e dados

Assets e diretrizes visuais vêm de [CKF Design](https://github.com/Kauerc10/ckf-design). Nunca versione dados de clientes, credenciais, chaves de serviço, dumps do banco ou arquivos `.env`.
