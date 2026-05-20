create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  actor_id uuid references public.profiles(id),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activity_logs_action_check check (
    action in ('create', 'update', 'delete', 'archive', 'delete_approved', 'delete_denied', 'delete_failed')
  )
);

alter table public.activity_logs enable row level security;

revoke all on table public.activity_logs from anon;
revoke all on table public.activity_logs from authenticated;
grant select on table public.activity_logs to authenticated;

drop policy if exists "admins can read activity logs" on public.activity_logs;
create policy "admins can read activity logs"
on public.activity_logs
for select
to authenticated
using (private.is_admin());

alter table public.orcamentos
  add column if not exists exclusao_solicitada_por uuid references public.profiles(id);

create index if not exists orcamentos_exclusao_solicitada_por_idx
on public.orcamentos(exclusao_solicitada_por);

alter table public.orcamentos
  drop constraint if exists orcamentos_exclusao_audit_check;

alter table public.orcamentos
  add constraint orcamentos_exclusao_audit_check check (
    (
      status = 'excluido'
      and excluido_em is not null
      and excluido_por is not null
      and exclusao_solicitada_por is not null
      and length(btrim(coalesce(excluido_motivo, ''))) > 0
    )
    or (
      status <> 'excluido'
      and excluido_em is null
      and excluido_por is null
      and exclusao_solicitada_por is null
      and excluido_motivo is null
    )
  );

create or replace function private.orcamento_is_editable(p_orcamento_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.orcamentos
    where id = p_orcamento_id
      and status <> 'excluido'
  );
$$;

create or replace function private.set_orcamento_criacao_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.criado_por = (select auth.uid());

  if new.criado_por is null then
    raise exception 'usuario autenticado obrigatorio para criar orcamentos';
  end if;

  new.excluido_em = null;
  new.excluido_por = null;
  new.exclusao_solicitada_por = null;
  new.excluido_motivo = null;
  return new;
end;
$$;

drop trigger if exists orcamentos_set_criacao_audit on public.orcamentos;
create trigger orcamentos_set_criacao_audit
  before insert on public.orcamentos
  for each row execute function private.set_orcamento_criacao_audit();

create or replace function private.set_orcamento_exclusao_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'excluido' then
    raise exception 'orcamentos excluidos nao podem ser editados';
  end if;

  if new.status = 'excluido' then
    new.excluido_em = now();
    new.excluido_motivo = nullif(btrim(new.excluido_motivo), '');

    if new.excluido_por is null then
      raise exception 'administrador aprovador obrigatorio';
    end if;

    if new.exclusao_solicitada_por is null then
      raise exception 'solicitante da exclusao obrigatorio';
    end if;

    if new.excluido_motivo is null then
      raise exception 'informe o motivo da exclusao';
    end if;

    if not exists (
      select 1
      from public.profiles
      where id = new.excluido_por
        and ativo = true
        and role = 'admin'
    ) then
      raise exception 'administrador aprovador invalido';
    end if;

    if not exists (
      select 1
      from public.profiles
      where id = new.exclusao_solicitada_por
        and ativo = true
    ) then
      raise exception 'solicitante da exclusao invalido';
    end if;

    return new;
  end if;

  new.excluido_em = null;
  new.excluido_por = null;
  new.exclusao_solicitada_por = null;
  new.excluido_motivo = null;
  return new;
end;
$$;

create or replace function private.delete_orcamento_with_admin_approval(
  p_orcamento_id uuid,
  p_motivo text,
  p_requester_id uuid,
  p_admin_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_numero integer;
begin
  if v_motivo is null then
    raise exception 'informe o motivo da exclusao';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_requester_id
      and ativo = true
  ) then
    raise exception 'solicitante da exclusao invalido';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_admin_id
      and ativo = true
      and role = 'admin'
  ) then
    raise exception 'administrador aprovador invalido';
  end if;

  select numero
  into v_numero
  from public.orcamentos
  where id = p_orcamento_id
  for update;

  if v_numero is null then
    raise exception 'orcamento nao encontrado';
  end if;

  update public.orcamentos
  set
    status = 'excluido',
    excluido_por = p_admin_id,
    exclusao_solicitada_por = p_requester_id,
    excluido_motivo = v_motivo
  where id = p_orcamento_id;

  insert into public.activity_logs (entity_type, entity_id, action, actor_id, details)
  values (
    'orcamento',
    p_orcamento_id,
    'delete_approved',
    p_admin_id,
    jsonb_build_object(
      'numero', v_numero,
      'motivo', v_motivo,
      'solicitante_id', p_requester_id,
      'admin_id', p_admin_id
    )
  );
end;
$$;

revoke all on function private.orcamento_is_editable(uuid) from public, anon;
revoke all on function private.set_orcamento_criacao_audit() from public, anon, authenticated;
revoke all on function private.set_orcamento_exclusao_audit() from public, anon, authenticated;
revoke all on function private.delete_orcamento_with_admin_approval(uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function private.orcamento_is_editable(uuid) to authenticated;

revoke update on table public.orcamentos from authenticated;
revoke all on table public.orcamentos from authenticated;
grant select on table public.orcamentos to authenticated;
grant insert (data_orcamento, servico_cliente, status, observacoes, validade_dias, total) on table public.orcamentos to authenticated;
grant update (data_orcamento, servico_cliente, status, observacoes, validade_dias, total) on table public.orcamentos to authenticated;
grant usage, select on sequence public.orcamento_numero_seq to authenticated;

revoke delete on table public.orcamentos from authenticated;

drop policy if exists "active users can create quotations" on public.orcamentos;
create policy "active users can create quotations"
on public.orcamentos
for insert
to authenticated
with check (private.is_active_user() and criado_por = (select auth.uid()) and status <> 'excluido');

drop policy if exists "active users can update quotations" on public.orcamentos;
create policy "active users can update quotations"
on public.orcamentos
for update
to authenticated
using (private.is_active_user() and status <> 'excluido')
with check (private.is_active_user() and status <> 'excluido');

drop policy if exists "active users can delete quotations" on public.orcamentos;

drop policy if exists "active users can create quotation items" on public.orcamento_itens;
create policy "active users can create quotation items"
on public.orcamento_itens
for insert
to authenticated
with check (
  private.is_active_user()
  and private.orcamento_is_editable(orcamento_id)
);

drop policy if exists "active users can update quotation items" on public.orcamento_itens;
create policy "active users can update quotation items"
on public.orcamento_itens
for update
to authenticated
using (
  private.is_active_user()
  and private.orcamento_is_editable(orcamento_id)
)
with check (
  private.is_active_user()
  and private.orcamento_is_editable(orcamento_id)
);

drop policy if exists "active users can delete quotation items" on public.orcamento_itens;
create policy "active users can delete quotation items"
on public.orcamento_itens
for delete
to authenticated
using (
  private.is_active_user()
  and private.orcamento_is_editable(orcamento_id)
);
