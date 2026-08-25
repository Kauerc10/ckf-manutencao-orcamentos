# Backend Seguro de Tickets do Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir Solicitações do site como Tickets no Supabase do CKF Orçamentos por uma Edge Function pública, validada e sem acesso anônimo direto às tabelas internas.

**Architecture:** `public.site_tickets` armazena o registro operacional e permanece inacessível ao papel `anon`. A Edge Function `capture-site-ticket` valida origem, payload, honeypot, idempotência e limites antes de inserir usando credencial de servidor. Regras puras ficam separadas do handler para testes Vitest.

**Tech Stack:** PostgreSQL/Supabase, RLS, Supabase Edge Functions/Deno, TypeScript, Zod 4, Vitest, React/Vite apenas para os testes e futuro módulo interno.

**Spec:** arquitetura fonte em `Kauerc10/ckf-site-institucional/docs/superpowers/specs/2026-08-25-ticket-engine-seo-design.md`.

## Global Constraints

- Entidade técnica: `site_tickets`; interface pública usa **Solicitação** e operação interna usa **Ticket**.
- `public_id` aleatório, não sequencial e separado do UUID interno.
- `anon` não recebe SELECT/INSERT/UPDATE/DELETE na tabela.
- Nenhuma service-role key em arquivo `VITE_*` ou frontend.
- Edge Function aceita somente origens CKF configuradas.
- Não armazenar IP bruto para rate limit; usar sinal/hash quando disponível.
- Ticket não vira cliente ou orçamento automaticamente.
- Índices devem refletir filtros operacionais reais: status/data, serviço/data e telefone normalizado/data.

---

### Task 1: Criar schema `site_tickets` com RLS e índices

**Files:**
- Create: `supabase/migrations/202608250001_add_site_tickets.sql`
- Create: `src/lib/site-tickets-schema.test.ts`

**Interfaces:**
- Produces table `public.site_tickets`.
- Status: `new`, `contacted`, `qualified`, `budget_created`, `converted`, `lost`, `spam`.

- [ ] **Step 1: Write failing schema contract test**

Ler a migration como texto e exigir: tabela, check de status, `public_id unique`, `idempotency_key unique`, FKs opcionais para `clientes` e `orcamentos`, RLS, revogação de `anon`, índices e timestamps.

```ts
expect(sql).toContain('create table if not exists public.site_tickets')
expect(sql).toMatch(/public_id text not null unique|unique \(public_id\)/)
expect(sql).toContain('alter table public.site_tickets enable row level security')
expect(sql).toContain('revoke all on table public.site_tickets from anon')
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/lib/site-tickets-schema.test.ts`
Expected: FAIL porque migration não existe.

- [ ] **Step 3: Implement migration**

Campos: UUID interno, public_id, status, service_category, service_slug, service_name, equipamento, empresa, contato, telefone normalizado, e-mail, cidade/UF, descrição, urgência, landing/CTA/referrer/UTM, idempotency_key, vínculos futuros e timestamps.

Adicionar índices compostos:

```sql
create index if not exists site_tickets_status_created_idx
  on public.site_tickets(status, created_at desc);
create index if not exists site_tickets_service_created_idx
  on public.site_tickets(service_category, created_at desc);
create index if not exists site_tickets_phone_created_idx
  on public.site_tickets(phone, created_at desc);
```

RLS habilitado e grants de `anon` revogados. Não criar política pública de INSERT.

- [ ] **Step 4: Run GREEN**

`npm test -- src/lib/site-tickets-schema.test.ts`

- [ ] **Step 5: Commit**

`git commit -m "feat: adiciona schema seguro de tickets do site"`

---

### Task 2: Criar validação pura do payload

**Files:**
- Create: `supabase/functions/capture-site-ticket/domain.ts`
- Create: `src/lib/site-ticket-domain.test.ts`

**Interfaces:**
- Produces: `parseSiteTicketRequest(input)`, `normalizeBrazilPhone(value)`, `createPublicTicketId(randomBytes?)`.

- [ ] **Step 1: Write failing tests**

Cobrir campos obrigatórios, limites, telefone BR, UF, categorias permitidas, honeypot, public ID sem sequência, campos desconhecidos ignorados/rejeitados conforme contrato.

Categorias iniciais estáveis:

```ts
['trucks', 'concrete_plants', 'chassis', 'metal_structures', 'heavy_machinery', 'industrial_maintenance', 'industrial_welding', 'heavy_hydraulics', 'preventive_maintenance', 'corrective_maintenance']
```

- [ ] **Step 2: Run RED**

`npm test -- src/lib/site-ticket-domain.test.ts`

- [ ] **Step 3: Implement pure domain module**

Não acessar `Deno.env`, banco ou rede no módulo puro.

- [ ] **Step 4: Run GREEN**

`npm test -- src/lib/site-ticket-domain.test.ts`

- [ ] **Step 5: Commit**

`git commit -m "feat: valida contrato de tickets do site"`

---

### Task 3: Implementar Edge Function `capture-site-ticket`

**Files:**
- Create: `supabase/functions/capture-site-ticket/index.ts`
- Create: `src/lib/site-ticket-function-contract.test.ts`

**Interfaces:**
- Request: POST JSON.
- Success: HTTP 201 `{ ok: true, public_id: "XXXXXX" }`.
- Public errors: 400 validation, 403 origin, 409 idempotency conflict/replay handled safely, 429 rate limit, 500 generic.

- [ ] **Step 1: Write failing function-contract tests**

Exigir POST/OPTIONS, CORS derivado de allowlist, `Content-Type: application/json`, nenhum UUID interno na resposta e nenhuma dependência de autenticação do visitante.

- [ ] **Step 2: Run RED**

`npm test -- src/lib/site-ticket-function-contract.test.ts`

- [ ] **Step 3: Implement handler**

Variáveis de servidor:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CKF_SITE_ALLOWED_ORIGINS
CKF_TICKET_RATE_LIMIT_SECRET
```

Usar service-role somente dentro da Edge Function. Para origem, refletir apenas origem presente na allowlist, nunca `*` em produção.

- [ ] **Step 4: Implement idempotent insert**

`idempotency_key` é gerado no cliente e unique no banco. Em replay válido, retornar o mesmo `public_id` sem criar duplicata.

- [ ] **Step 5: Run GREEN**

`npm test -- src/lib/site-ticket-function-contract.test.ts`

- [ ] **Step 6: Commit**

`git commit -m "feat: captura tickets públicos pela edge function"`

---

### Task 4: Adicionar proteção anti-spam e rate limit

**Files:**
- Modify: `supabase/functions/capture-site-ticket/domain.ts`
- Modify: `supabase/functions/capture-site-ticket/index.ts`
- Create: `supabase/migrations/202608250002_add_site_ticket_rate_limits.sql`
- Modify: `src/lib/site-ticket-domain.test.ts`

**Interfaces:**
- Honeypot `website` preenchido resulta em resposta neutra e nenhuma criação útil.
- Rate-limit usa digest não reversível + janela temporal.

- [ ] **Step 1: Write failing abuse tests**

Testar honeypot, payload > limite, muitas tentativas na janela e normalização antes da deduplicação.

- [ ] **Step 2: Run RED**

`npm test -- src/lib/site-ticket-domain.test.ts`

- [ ] **Step 3: Implement minimal rate-limit storage**

Tabela separada ou função SQL privada com retenção curta. Não persistir IP bruto. Índice pela chave digest + janela.

- [ ] **Step 4: Run GREEN**

`npm test`

- [ ] **Step 5: Commit**

`git commit -m "feat: protege captura pública contra abuso"`

---

### Task 5: Definir acesso interno futuro sem liberar módulo Tickets ainda

**Files:**
- Modify: `supabase/migrations/202608250001_add_site_tickets.sql` ou nova migration se a primeira já estiver publicada.
- Create: `src/data/site-tickets.ts`
- Create: `src/data/site-tickets.test.ts`

**Interfaces:**
- Repositório interno autenticado pode listar/ler tickets somente conforme RLS/perfil existente.
- Não criar telas nesta task.

- [ ] **Step 1: Write failing repository tests**

Contrato de filtros: status, service_category, cidade, data e busca por public_id/telefone.

- [ ] **Step 2: Run RED**

`npm test -- src/data/site-tickets.test.ts`

- [ ] **Step 3: Implement typed repository**

Seguir padrões existentes de `src/data`; retornar tipos internos sem expor service-role.

- [ ] **Step 4: Run GREEN**

`npm run lint && npm test && npm run build`

- [ ] **Step 5: Commit**

`git commit -m "feat: prepara consulta interna de tickets"`

---

### Task 6: Validar em Supabase de desenvolvimento/produção controlada

**Files:**
- No code changes unless validation exposes defect.

- [ ] **Step 1: Apply migrations through Supabase tooling**

Executar migrations no projeto correto e confirmar RLS/grants.

- [ ] **Step 2: Deploy Edge Function**

Publicar `capture-site-ticket` com secrets de servidor configurados.

- [ ] **Step 3: Smoke tests**

Validar OPTIONS, origem permitida, origem negada, payload inválido, sucesso 201, replay idempotente e ausência de leitura anônima da tabela.

- [ ] **Step 4: Verify repository gates**

`npm run lint && npm test && npm run build`

- [ ] **Step 5: Document endpoint for site integration**

Registrar somente URL pública da função; nunca secrets.
