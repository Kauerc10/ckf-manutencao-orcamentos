-- Allow an authenticated administrator to approve a deletion without depending
-- on an Edge Function. The requester remains explicit for the audit trail while
-- the approving administrator is always derived from the authenticated JWT.
create or replace function public.delete_orcamento_with_admin_approval(
  p_orcamento_id uuid,
  p_motivo text,
  p_requester_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
begin
  if v_admin_id is null or not exists (
    select 1
    from public.profiles
    where id = v_admin_id
      and ativo = true
      and role = 'admin'
  ) then
    raise exception 'credenciais de administrador invalidas';
  end if;

  perform private.delete_orcamento_with_admin_approval(
    p_orcamento_id,
    p_motivo,
    p_requester_id,
    v_admin_id
  );
end;
$$;

revoke all on function public.delete_orcamento_with_admin_approval(uuid, text, uuid) from public, anon;
grant execute on function public.delete_orcamento_with_admin_approval(uuid, text, uuid) to authenticated;
