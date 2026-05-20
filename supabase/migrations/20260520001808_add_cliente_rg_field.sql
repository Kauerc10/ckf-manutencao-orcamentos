alter table public.clientes
  add column if not exists rg text not null default '';

update public.clientes
set rg = ''
where rg is null;

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
  new.rg = upper(regexp_replace(coalesce(new.rg, ''), '[^0-9a-zA-Z]', '', 'g'));

  if new.tipo = 'cpf' then
    new.nome_fantasia = '';
    new.inscricao_estadual = '';
  else
    new.rg = '';
  end if;

  return new;
end;
$$;
