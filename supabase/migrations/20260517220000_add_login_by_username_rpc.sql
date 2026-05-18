create or replace function public.get_email_by_username(p_username text)
returns text
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_email text;
begin
  select p.email into v_email
  from public.profiles p
  where (lower(p.nome) = lower(p_username) 
      or lower(split_part(p.nome, '.', 1)) = lower(p_username)
      or lower(split_part(p.nome, ' ', 1)) = lower(p_username))
    and p.ativo = true
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.get_email_by_username(text) from public;
grant execute on function public.get_email_by_username(text) to anon;
grant execute on function public.get_email_by_username(text) to authenticated;
