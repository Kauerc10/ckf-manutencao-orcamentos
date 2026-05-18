create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('cpf', 'cnpj')),
  nome text not null,
  documento text not null,
  nome_fantasia text not null default '',
  email text not null default '',
  telefone_principal text not null,
  telefone_alternativo text not null default '',
  inscricao_estadual text not null default '',
  cep text not null,
  logradouro text not null,
  numero text not null,
  complemento text not null default '',
  bairro text not null,
  cidade text not null,
  uf text not null check (char_length(uf) = 2),
  referencia_acesso text not null default '',
  observacoes text not null default '',
  tags text[] not null default '{}',
  ativo boolean not null default true,
  criado_por uuid not null references public.profiles(id),
  atualizado_por uuid references public.profiles(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint clientes_documento_unique unique (documento)
);

create table if not exists public.cliente_representantes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id),
  nome text not null,
  cargo text not null,
  telefone text not null,
  email text not null default '',
  observacao text not null default '',
  principal boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('cliente', 'cliente_representante', 'orcamento')),
  entity_id uuid not null,
  action text not null,
  actor_id uuid references public.profiles(id),
  details jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

alter table public.orcamentos
  add column if not exists cliente_id uuid references public.clientes(id),
  add column if not exists representante_id uuid references public.cliente_representantes(id),
  add column if not exists atualizado_por uuid references public.profiles(id);

create index if not exists clientes_tipo_idx on public.clientes(tipo);
create index if not exists clientes_ativo_idx on public.clientes(ativo);
create index if not exists clientes_documento_idx on public.clientes(documento);
create index if not exists clientes_cidade_uf_idx on public.clientes(cidade, uf);
create index if not exists cliente_representantes_cliente_id_idx on public.cliente_representantes(cliente_id);
create index if not exists activity_logs_entity_idx on public.activity_logs(entity_type, entity_id, criado_em desc);
create index if not exists activity_logs_actor_idx on public.activity_logs(actor_id);
create index if not exists orcamentos_cliente_id_idx on public.orcamentos(cliente_id);
create index if not exists orcamentos_representante_id_idx on public.orcamentos(representante_id);

create or replace function private.set_cliente_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  new.atualizado_por = (select auth.uid());
  new.uf = upper(new.uf);
  new.documento = regexp_replace(new.documento, '\D', '', 'g');
  return new;
end;
$$;

create or replace function private.set_representante_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create or replace function private.set_orcamento_update_actor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_por = (select auth.uid());
  return new;
end;
$$;

create or replace function private.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_entity_type text := tg_argv[0];
  v_entity_id uuid;
  v_details jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'create';
    v_entity_id := new.id;
  elsif tg_op = 'UPDATE' then
    if v_entity_type = 'cliente' and old.ativo = true and new.ativo = false then
      v_action := 'archive';
    else
      v_action := 'update';
    end if;
    v_entity_id := new.id;
  else
    v_action := lower(tg_op);
    v_entity_id := old.id;
  end if;

  if v_entity_type = 'cliente' then
    if tg_op = 'INSERT' then
      v_details := jsonb_build_object('table', tg_table_name, 'nome', new.nome, 'documento', new.documento);
    else
      v_details := jsonb_build_object(
        'table', tg_table_name,
        'nome', coalesce(new.nome, old.nome),
        'documento', coalesce(new.documento, old.documento)
      );
    end if;
  elsif v_entity_type = 'cliente_representante' then
    if tg_op = 'INSERT' then
      v_details := jsonb_build_object('table', tg_table_name, 'cliente_id', new.cliente_id, 'nome', new.nome);
    else
      v_details := jsonb_build_object(
        'table', tg_table_name,
        'cliente_id', coalesce(new.cliente_id, old.cliente_id),
        'nome', coalesce(new.nome, old.nome)
      );
    end if;
  else
    v_details := jsonb_build_object(
      'table', tg_table_name,
      'cliente_id', coalesce(new.cliente_id, old.cliente_id),
      'numero', coalesce(new.numero, old.numero)
    );
  end if;

  insert into public.activity_logs (entity_type, entity_id, action, actor_id, details)
  values (
    v_entity_type,
    v_entity_id,
    v_action,
    (select auth.uid()),
    v_details
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists clientes_set_audit on public.clientes;
create trigger clientes_set_audit
  before update on public.clientes
  for each row execute function private.set_cliente_audit();

drop trigger if exists cliente_representantes_set_audit on public.cliente_representantes;
create trigger cliente_representantes_set_audit
  before update on public.cliente_representantes
  for each row execute function private.set_representante_audit();

drop trigger if exists orcamentos_set_update_actor on public.orcamentos;
create trigger orcamentos_set_update_actor
  before update on public.orcamentos
  for each row execute function private.set_orcamento_update_actor();

drop trigger if exists clientes_log_activity on public.clientes;
create trigger clientes_log_activity
  after insert or update on public.clientes
  for each row execute function private.log_activity('cliente');

drop trigger if exists cliente_representantes_log_activity on public.cliente_representantes;
create trigger cliente_representantes_log_activity
  after insert or update on public.cliente_representantes
  for each row execute function private.log_activity('cliente_representante');

drop trigger if exists orcamentos_log_activity on public.orcamentos;
create trigger orcamentos_log_activity
  after update on public.orcamentos
  for each row execute function private.log_activity('orcamento');

alter table public.clientes enable row level security;
alter table public.cliente_representantes enable row level security;
alter table public.activity_logs enable row level security;

revoke all on table public.clientes from anon;
revoke all on table public.cliente_representantes from anon;
revoke all on table public.activity_logs from anon;
revoke all on table public.clientes from authenticated;
revoke all on table public.cliente_representantes from authenticated;
revoke all on table public.activity_logs from authenticated;

grant select, insert, update on table public.clientes to authenticated;
grant select, insert, update on table public.cliente_representantes to authenticated;
grant select on table public.activity_logs to authenticated;

revoke all on function private.set_cliente_audit() from public, anon, authenticated;
revoke all on function private.set_representante_audit() from public, anon, authenticated;
revoke all on function private.set_orcamento_update_actor() from public, anon, authenticated;
revoke all on function private.log_activity() from public, anon, authenticated;

drop policy if exists "active users can read clients" on public.clientes;
create policy "active users can read clients"
on public.clientes
for select
to authenticated
using (private.is_active_user());

drop policy if exists "active users can create clients" on public.clientes;
create policy "active users can create clients"
on public.clientes
for insert
to authenticated
with check (private.is_active_user() and criado_por = (select auth.uid()));

drop policy if exists "active users can update clients" on public.clientes;
create policy "active users can update clients"
on public.clientes
for update
to authenticated
using (private.is_active_user())
with check (private.is_active_user());

drop policy if exists "active users can read client representatives" on public.cliente_representantes;
create policy "active users can read client representatives"
on public.cliente_representantes
for select
to authenticated
using (private.is_active_user());

drop policy if exists "active users can create client representatives" on public.cliente_representantes;
create policy "active users can create client representatives"
on public.cliente_representantes
for insert
to authenticated
with check (
  private.is_active_user()
  and exists (
    select 1 from public.clientes
    where public.clientes.id = cliente_representantes.cliente_id
  )
);

drop policy if exists "active users can update client representatives" on public.cliente_representantes;
create policy "active users can update client representatives"
on public.cliente_representantes
for update
to authenticated
using (private.is_active_user())
with check (private.is_active_user());

drop policy if exists "active users can read activity logs" on public.activity_logs;
create policy "active users can read activity logs"
on public.activity_logs
for select
to authenticated
using (private.is_active_user());
