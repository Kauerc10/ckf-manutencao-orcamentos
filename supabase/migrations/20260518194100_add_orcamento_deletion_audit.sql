alter table public.orcamentos
  add column if not exists excluido_em timestamptz,
  add column if not exists excluido_por uuid references public.profiles(id),
  add column if not exists excluido_motivo text;

create index if not exists orcamentos_excluido_por_idx
on public.orcamentos(excluido_por);

alter table public.orcamentos
  drop constraint if exists orcamentos_exclusao_audit_check;

alter table public.orcamentos
  add constraint orcamentos_exclusao_audit_check check (
    (
      status = 'excluido'
      and excluido_em is not null
      and excluido_por is not null
      and length(btrim(coalesce(excluido_motivo, ''))) > 0
    )
    or (
      status <> 'excluido'
      and excluido_em is null
      and excluido_por is null
      and excluido_motivo is null
    )
  );

create or replace function private.set_orcamento_exclusao_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'excluido' then
    if old.status = 'excluido' then
      raise exception 'orcamentos excluidos nao podem ser editados';
    end if;

    if not private.is_admin() then
      raise exception 'apenas administradores podem excluir orcamentos';
    end if;

    new.excluido_em = coalesce(new.excluido_em, now());
    new.excluido_por = coalesce(new.excluido_por, (select auth.uid()));
    new.excluido_motivo = nullif(btrim(new.excluido_motivo), '');

    if new.excluido_motivo is null then
      raise exception 'informe o motivo da exclusao';
    end if;

    return new;
  end if;

  if old.status = 'excluido' then
    raise exception 'orcamentos excluidos nao podem ser editados';
  end if;

  new.excluido_em = null;
  new.excluido_por = null;
  new.excluido_motivo = null;
  return new;
end;
$$;

drop trigger if exists orcamentos_set_exclusao_audit on public.orcamentos;
create trigger orcamentos_set_exclusao_audit
  before update on public.orcamentos
  for each row execute function private.set_orcamento_exclusao_audit();

drop policy if exists "active users can delete quotations" on public.orcamentos;
drop policy if exists "active users can update quotations" on public.orcamentos;

create policy "active users can update quotations"
on public.orcamentos
for update
to authenticated
using (private.is_active_user())
with check (
  private.is_active_user()
  and (status <> 'excluido' or private.is_admin())
);

revoke delete on table public.orcamentos from authenticated;
revoke all on function private.set_orcamento_exclusao_audit() from public, anon, authenticated;
