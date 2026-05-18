alter table public.profiles
  add column if not exists role text not null default 'usuario';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('admin', 'usuario'));
  end if;
end;
$$;

with first_active_profile as (
  select id
  from public.profiles
  where ativo = true
  order by criado_em asc
  limit 1
)
update public.profiles
set role = 'admin'
where id in (select id from first_active_profile)
  and not exists (
    select 1 from public.profiles where role = 'admin'
  );

create or replace function private.is_admin()
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
      and role = 'admin'
  );
$$;

create table if not exists public.system_settings (
  id text primary key default 'default' check (id = 'default'),
  empresa_nome text not null default 'CKF MANUTENÇÃO',
  empresa_email text not null default 'CK.manutencaoblu@gmail.com',
  empresa_cnpj text not null default '57.461.028/0001-43',
  empresa_telefone text not null default '(47) 99261-4114',
  empresa_regiao text not null default 'BLUMENAU E REGIÃO',
  orcamento_validade_padrao integer not null default 10 check (orcamento_validade_padrao > 0 and orcamento_validade_padrao <= 365),
  orcamento_observacoes_padrao text not null default '',
  preview_densidade text not null default 'compacta' check (preview_densidade in ('compacta', 'confortavel')),
  mostrar_logo_documentos boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references public.profiles(id)
);

create or replace function private.set_system_settings_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  new.atualizado_por = (select auth.uid());
  return new;
end;
$$;

drop trigger if exists system_settings_set_audit on public.system_settings;
create trigger system_settings_set_audit
  before update on public.system_settings
  for each row execute function private.set_system_settings_audit();

insert into public.system_settings (
  id,
  empresa_nome,
  empresa_email,
  empresa_cnpj,
  empresa_telefone,
  empresa_regiao,
  orcamento_validade_padrao,
  orcamento_observacoes_padrao,
  preview_densidade,
  mostrar_logo_documentos
)
values (
  'default',
  'CKF MANUTENÇÃO',
  'CK.manutencaoblu@gmail.com',
  '57.461.028/0001-43',
  '(47) 99261-4114',
  'BLUMENAU E REGIÃO',
  10,
  '',
  'compacta',
  true
)
on conflict (id) do nothing;

alter table public.system_settings enable row level security;

revoke all on table public.system_settings from anon;
revoke all on table public.system_settings from authenticated;
revoke update on table public.profiles from authenticated;

grant select on table public.system_settings to authenticated;
grant update on table public.system_settings to authenticated;
grant update (nome) on table public.profiles to authenticated;
grant execute on function private.is_admin() to authenticated;

revoke all on function private.is_admin() from public, anon;
revoke all on function private.set_system_settings_audit() from public, anon, authenticated;

drop policy if exists "active users can read system settings" on public.system_settings;
create policy "active users can read system settings"
on public.system_settings
for select
to authenticated
using (private.is_active_user());

drop policy if exists "admins can update system settings" on public.system_settings;
create policy "admins can update system settings"
on public.system_settings
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());
