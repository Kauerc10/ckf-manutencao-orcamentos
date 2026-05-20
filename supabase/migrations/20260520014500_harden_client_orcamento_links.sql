do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cliente_representantes_id_cliente_unique'
  ) then
    alter table public.cliente_representantes
      add constraint cliente_representantes_id_cliente_unique unique (id, cliente_id);
  end if;
end $$;

update public.orcamentos o
set representante_id = null
where representante_id is not null
  and not exists (
    select 1
    from public.cliente_representantes r
    where r.id = o.representante_id
      and r.cliente_id = o.cliente_id
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orcamentos_representante_requires_cliente'
  ) then
    alter table public.orcamentos
      add constraint orcamentos_representante_requires_cliente
      check (representante_id is null or cliente_id is not null);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orcamentos_representante_cliente_fk'
  ) then
    alter table public.orcamentos
      add constraint orcamentos_representante_cliente_fk
      foreign key (representante_id, cliente_id)
      references public.cliente_representantes(id, cliente_id);
  end if;
end $$;

grant update (
  data_orcamento,
  servico_cliente,
  cliente_id,
  representante_id,
  status,
  observacoes,
  validade_dias,
  total
) on table public.orcamentos to authenticated;
