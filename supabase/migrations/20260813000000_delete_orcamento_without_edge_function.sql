-- Replace the Edge Function with a two-session approval flow. The requester's
-- identity is captured from their JWT before the approving admin authenticates.
alter table public.activity_logs
  drop constraint if exists activity_logs_action_check;

alter table public.activity_logs
  add constraint activity_logs_action_check check (
    action in (
      'create', 'update', 'delete', 'archive', 'delete_requested',
      'delete_approved', 'delete_denied', 'delete_failed'
    )
  );

create or replace function public.request_orcamento_deletion(
  p_orcamento_id uuid,
  p_motivo text,
  p_admin_identifier text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requester_id uuid := auth.uid();
  v_request_id uuid;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if v_requester_id is null or not exists (
    select 1 from public.profiles where id = v_requester_id and ativo = true
  ) then
    raise exception 'solicitante da exclusao invalido';
  end if;
  if v_motivo is null then raise exception 'informe o motivo da exclusao'; end if;
  if not exists (
    select 1 from public.orcamentos where id = p_orcamento_id and status <> 'excluido'
  ) then
    raise exception 'orcamento nao encontrado ou ja excluido';
  end if;

  insert into public.activity_logs (entity_type, entity_id, action, actor_id, details)
  values (
    'orcamento', p_orcamento_id, 'delete_requested', v_requester_id,
    jsonb_build_object(
      'motivo', v_motivo,
      'admin_identifier', btrim(coalesce(p_admin_identifier, ''))
    )
  )
  returning id into v_request_id;
  return v_request_id;
end;
$$;

create or replace function public.deny_orcamento_deletion(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.activity_logs
  set action = 'delete_denied',
      details = details || jsonb_build_object('error', 'invalid_admin_credentials')
  where id = p_request_id
    and action = 'delete_requested'
    and actor_id = auth.uid();
end;
$$;

create or replace function public.delete_orcamento_with_admin_approval(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_request public.activity_logs%rowtype;
begin
  if v_admin_id is null or not exists (
    select 1 from public.profiles
    where id = v_admin_id and ativo = true and role = 'admin'
  ) then
    raise exception 'credenciais de administrador invalidas';
  end if;

  select * into v_request
  from public.activity_logs
  where id = p_request_id and action = 'delete_requested'
  for update;
  if not found then raise exception 'solicitacao de exclusao invalida'; end if;

  begin
    perform private.delete_orcamento_with_admin_approval(
      v_request.entity_id,
      v_request.details ->> 'motivo',
      v_request.actor_id,
      v_admin_id
    );
    return jsonb_build_object('ok', true);
  exception when others then
    update public.activity_logs
    set action = 'delete_failed',
        details = details || jsonb_build_object('error', sqlerrm, 'admin_id', v_admin_id)
    where id = p_request_id;
    return jsonb_build_object('error', sqlerrm);
  end;
end;
$$;

revoke all on function public.request_orcamento_deletion(uuid, text, text) from public, anon;
revoke all on function public.deny_orcamento_deletion(uuid) from public, anon;
revoke all on function public.delete_orcamento_with_admin_approval(uuid) from public, anon;
grant execute on function public.request_orcamento_deletion(uuid, text, text) to authenticated;
grant execute on function public.deny_orcamento_deletion(uuid) to authenticated;
grant execute on function public.delete_orcamento_with_admin_approval(uuid) to authenticated;
