create schema if not exists private;

create sequence if not exists public.orcamento_numero_seq
  start with 285
  increment by 1
  no minvalue
  no maxvalue
  cache 1;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'orcamento_status') then
    create type public.orcamento_status as enum (
      'rascunho',
      'enviado',
      'aprovado',
      'recusado',
      'cancelado'
    );
  end if;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero integer not null default nextval('public.orcamento_numero_seq'),
  data_orcamento date not null default current_date,
  servico_cliente text not null,
  status public.orcamento_status not null default 'rascunho',
  observacoes text not null default '',
  validade_dias integer not null default 10 check (validade_dias > 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  criado_por uuid not null references public.profiles(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint orcamentos_numero_unique unique (numero)
);

create table if not exists public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  ordem integer not null,
  quantidade numeric(12, 2),
  descricao text not null default '',
  valor_unitario numeric(12, 2),
  valor_total numeric(12, 2) not null default 0 check (valor_total >= 0),
  criado_em timestamptz not null default now(),
  constraint orcamento_itens_ordem_unique unique (orcamento_id, ordem)
);

create index if not exists orcamentos_numero_idx on public.orcamentos(numero desc);
create index if not exists orcamentos_data_idx on public.orcamentos(data_orcamento desc);
create index if not exists orcamentos_status_idx on public.orcamentos(status);
create index if not exists orcamentos_criado_por_idx on public.orcamentos(criado_por);
create index if not exists orcamento_itens_orcamento_id_idx on public.orcamento_itens(orcamento_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

drop trigger if exists orcamentos_set_updated_at on public.orcamentos;
create trigger orcamentos_set_updated_at
  before update on public.orcamentos
  for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

insert into public.profiles (id, nome, email)
select
  id,
  coalesce(raw_user_meta_data ->> 'nome', raw_user_meta_data ->> 'name', split_part(email, '@', 1)),
  coalesce(email, '')
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;

create or replace function private.is_active_user()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and ativo = true
  );
$$;

revoke all on table public.profiles from anon;
revoke all on table public.orcamentos from anon;
revoke all on table public.orcamento_itens from anon;
revoke all on table public.profiles from authenticated;
revoke all on table public.orcamentos from authenticated;
revoke all on table public.orcamento_itens from authenticated;
revoke all on sequence public.orcamento_numero_seq from authenticated;

grant usage on schema public to authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.orcamentos to authenticated;
grant select, insert, update, delete on table public.orcamento_itens to authenticated;
grant usage, select on sequence public.orcamento_numero_seq to authenticated;

grant usage on schema private to authenticated;
grant execute on function private.is_active_user() to authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;

drop policy if exists "active users can read profiles" on public.profiles;
create policy "active users can read profiles"
on public.profiles
for select
to authenticated
using (private.is_active_user());

drop policy if exists "users can update own profile name" on public.profiles;
create policy "users can update own profile name"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id and private.is_active_user())
with check ((select auth.uid()) = id);

drop policy if exists "active users can read quotations" on public.orcamentos;
create policy "active users can read quotations"
on public.orcamentos
for select
to authenticated
using (private.is_active_user());

drop policy if exists "active users can create quotations" on public.orcamentos;
create policy "active users can create quotations"
on public.orcamentos
for insert
to authenticated
with check (private.is_active_user() and criado_por = (select auth.uid()));

drop policy if exists "active users can update quotations" on public.orcamentos;
create policy "active users can update quotations"
on public.orcamentos
for update
to authenticated
using (private.is_active_user())
with check (private.is_active_user());

drop policy if exists "active users can delete quotations" on public.orcamentos;
create policy "active users can delete quotations"
on public.orcamentos
for delete
to authenticated
using (private.is_active_user());

drop policy if exists "active users can read quotation items" on public.orcamento_itens;
create policy "active users can read quotation items"
on public.orcamento_itens
for select
to authenticated
using (
  private.is_active_user()
  and exists (
    select 1 from public.orcamentos
    where public.orcamentos.id = orcamento_itens.orcamento_id
  )
);

drop policy if exists "active users can create quotation items" on public.orcamento_itens;
create policy "active users can create quotation items"
on public.orcamento_itens
for insert
to authenticated
with check (
  private.is_active_user()
  and exists (
    select 1 from public.orcamentos
    where public.orcamentos.id = orcamento_itens.orcamento_id
  )
);

drop policy if exists "active users can update quotation items" on public.orcamento_itens;
create policy "active users can update quotation items"
on public.orcamento_itens
for update
to authenticated
using (private.is_active_user())
with check (private.is_active_user());

drop policy if exists "active users can delete quotation items" on public.orcamento_itens;
create policy "active users can delete quotation items"
on public.orcamento_itens
for delete
to authenticated
using (private.is_active_user());
