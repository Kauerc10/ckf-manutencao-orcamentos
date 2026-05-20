-- Migration to harden RLS policies and restrict email public RPC
-- Target: BUG-01 and BUG-04

-- 1. BUG-04: Revogar execução pública de get_email_by_username para anon
revoke execute on function public.get_email_by_username(text) from anon;

-- 2. BUG-01: Blindagem de RLS nas tabelas de clientes e representantes

-- Drop old policies on public.clientes
drop policy if exists "active users can read clients" on public.clientes;
drop policy if exists "active users can create clients" on public.clientes;
drop policy if exists "active users can update clients" on public.clientes;

-- Create secure policies on public.clientes
create policy "active users can read clients"
on public.clientes
for select
to authenticated
using (
  private.is_active_user() 
  and (criado_por = auth.uid() or private.is_admin())
);

create policy "active users can create clients"
on public.clientes
for insert
to authenticated
with check (
  private.is_active_user() 
  and criado_por = auth.uid()
);

create policy "active users can update clients"
on public.clientes
for update
to authenticated
using (
  private.is_active_user() 
  and (criado_por = auth.uid() or private.is_admin())
)
with check (
  private.is_active_user() 
  and (criado_por = auth.uid() or private.is_admin())
);

-- Drop old policies on public.cliente_representantes
drop policy if exists "active users can read client representatives" on public.cliente_representantes;
drop policy if exists "active users can create client representatives" on public.cliente_representantes;
drop policy if exists "active users can update client representatives" on public.cliente_representantes;

-- Create secure policies on public.cliente_representantes
create policy "active users can read client representatives"
on public.cliente_representantes
for select
to authenticated
using (
  private.is_active_user()
  and exists (
    select 1 from public.clientes c
    where c.id = cliente_representantes.cliente_id
      and (c.criado_por = auth.uid() or private.is_admin())
  )
);

create policy "active users can create client representatives"
on public.cliente_representantes
for insert
to authenticated
with check (
  private.is_active_user()
  and exists (
    select 1 from public.clientes c
    where c.id = cliente_representantes.cliente_id
      and (c.criado_por = auth.uid() or private.is_admin())
  )
);

create policy "active users can update client representatives"
on public.cliente_representantes
for update
to authenticated
using (
  private.is_active_user()
  and exists (
    select 1 from public.clientes c
    where c.id = cliente_representantes.cliente_id
      and (c.criado_por = auth.uid() or private.is_admin())
  )
)
with check (
  private.is_active_user()
  and exists (
    select 1 from public.clientes c
    where c.id = cliente_representantes.cliente_id
      and (c.criado_por = auth.uid() or private.is_admin())
  )
);

-- Drop old policies on public.orcamentos
drop policy if exists "active users can read quotations" on public.orcamentos;
drop policy if exists "active users can create quotations" on public.orcamentos;
drop policy if exists "active users can update quotations" on public.orcamentos;

-- Create secure policies on public.orcamentos
create policy "active users can read quotations"
on public.orcamentos
for select
to authenticated
using (
  private.is_active_user()
  and (criado_por = auth.uid() or private.is_admin())
);

create policy "active users can create quotations"
on public.orcamentos
for insert
to authenticated
with check (
  private.is_active_user()
  and criado_por = auth.uid()
  and status <> 'excluido'
);

create policy "active users can update quotations"
on public.orcamentos
for update
to authenticated
using (
  private.is_active_user()
  and status <> 'excluido'
  and (criado_por = auth.uid() or private.is_admin())
)
with check (
  private.is_active_user()
  and status <> 'excluido'
  and (criado_por = auth.uid() or private.is_admin())
);

-- Drop old policies on public.orcamento_itens
drop policy if exists "active users can read quotation items" on public.orcamento_itens;
drop policy if exists "active users can create quotation items" on public.orcamento_itens;
drop policy if exists "active users can update quotation items" on public.orcamento_itens;
drop policy if exists "active users can delete quotation items" on public.orcamento_itens;

-- Create secure policies on public.orcamento_itens
create policy "active users can read quotation items"
on public.orcamento_itens
for select
to authenticated
using (
  private.is_active_user()
  and exists (
    select 1 from public.orcamentos o
    where o.id = orcamento_itens.orcamento_id
      and (o.criado_por = auth.uid() or private.is_admin())
  )
);

create policy "active users can create quotation items"
on public.orcamento_itens
for insert
to authenticated
with check (
  private.is_active_user()
  and private.orcamento_is_editable(orcamento_id)
  and exists (
    select 1 from public.orcamentos o
    where o.id = orcamento_id
      and (o.criado_por = auth.uid() or private.is_admin())
  )
);

create policy "active users can update quotation items"
on public.orcamento_itens
for update
to authenticated
using (
  private.is_active_user()
  and private.orcamento_is_editable(orcamento_id)
  and exists (
    select 1 from public.orcamentos o
    where o.id = orcamento_id
      and (o.criado_por = auth.uid() or private.is_admin())
  )
)
with check (
  private.is_active_user()
  and private.orcamento_is_editable(orcamento_id)
  and exists (
    select 1 from public.orcamentos o
    where o.id = orcamento_id
      and (o.criado_por = auth.uid() or private.is_admin())
  )
);

create policy "active users can delete quotation items"
on public.orcamento_itens
for delete
to authenticated
using (
  private.is_active_user()
  and private.orcamento_is_editable(orcamento_id)
  and exists (
    select 1 from public.orcamentos o
    where o.id = orcamento_id
      and (o.criado_por = auth.uid() or private.is_admin())
  )
);
