-- Internal commercial catalog. Mutations run only through authenticated RPCs.
create table public.catalogo_servicos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  dados jsonb not null,
  versao integer not null default 1
);
create unique index catalogo_codigo_unique on public.catalogo_servicos(lower(codigo));
create sequence public.catalogo_codigo_seq as bigint start 1;
create table public.tabelas_comerciais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.clientes(id),
  dados jsonb not null,
  versao integer not null default 1
);
-- References cover every revision and prevent deletion of a historical service.
create table public.tabela_servico_referencias (
  tabela_id uuid not null references public.tabelas_comerciais(id),
  servico_id uuid not null references public.catalogo_servicos(id),
  primary key (tabela_id, servico_id)
);
alter table public.catalogo_servicos enable row level security;
alter table public.tabelas_comerciais enable row level security;
alter table public.tabela_servico_referencias enable row level security;
revoke all on public.catalogo_servicos, public.tabelas_comerciais, public.tabela_servico_referencias from public, anon, authenticated;
grant select on public.catalogo_servicos, public.tabelas_comerciais to authenticated;
create policy catalogo_read on public.catalogo_servicos for select to authenticated using (private.is_active_user());
create policy tabelas_read on public.tabelas_comerciais for select to authenticated using (private.is_active_user());

create function public.save_catalogo_servico(p_dados jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := coalesce(nullif(p_dados->>'id','')::uuid, gen_random_uuid());
  oldrow public.catalogo_servicos;
  result jsonb;
  price numeric;
  field text;
  generated_code text;
begin
  if not private.is_active_user() or not private.is_admin() then raise exception 'Apenas administradores ativos podem alterar o catálogo.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(sid::text, 0));
  select * into oldrow from public.catalogo_servicos where id = sid for update;
  if oldrow.id is not null and oldrow.versao <> coalesce((p_dados->>'versao')::integer,0) then raise exception 'Este serviço foi alterado. Recarregue antes de salvar.'; end if;
  if oldrow.id is null and nullif(p_dados->>'id','') is not null then raise exception 'Serviço não encontrado.'; end if;
  generated_code := case when oldrow.id is null then 'CKF-' || lpad(nextval('public.catalogo_codigo_seq')::text,5,'0') else oldrow.codigo end;
  foreach field in array array['nome','categoria','escopo','unidade'] loop
    if coalesce(length(btrim(p_dados->>field)),0) < 1 or length(p_dados->>field) > (case when field='escopo' then 2000 else 200 end) then raise exception 'Preencha os campos do serviço (até 200 caracteres; escopo até 2000).'; end if;
  end loop;
  price := (p_dados->>'precoPadrao')::numeric;
  if price is null or price::text in ('NaN','Infinity','-Infinity') or price < 0 or price > 9999999999.99 then raise exception 'Preço inválido.'; end if;
  if coalesce(p_dados->>'imagem','') <> '' and (p_dados->>'imagem') !~ '^servicos/[0-9a-f-]+\.(png|jpg|webp)$' then raise exception 'Imagem inválida.'; end if;
  result := jsonb_build_object(
    'id',sid,'codigo',generated_code,'nome',btrim(p_dados->>'nome'),
    'categoria',btrim(p_dados->>'categoria'),'escopo',btrim(p_dados->>'escopo'),
    'unidade',btrim(p_dados->>'unidade'),'precoPadrao',round(price,2),
    'imagem',coalesce(p_dados->>'imagem',''),'ativo',coalesce((p_dados->>'ativo')::boolean,true),
    'versao',coalesce(oldrow.versao,0)+1,
    'criadorNome',coalesce(oldrow.dados->>'criadorNome',(select nome from public.profiles where id=auth.uid())),
    'criadoEm',coalesce((oldrow.dados->>'criadoEm')::timestamptz,now()),
    'autorNome',(select nome from public.profiles where id=auth.uid()),'atualizadoEm',now()
  );
  insert into public.catalogo_servicos(id,codigo,dados,versao) values(sid,result->>'codigo',result,coalesce(oldrow.versao,0)+1)
  on conflict(id) do update set codigo=excluded.codigo, dados=excluded.dados, versao=excluded.versao;
  return result;
end $$;

create function public.save_tabela_comercial(p_dados jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  eid uuid := (p_dados->>'empresaId')::uuid;
  empresa public.clientes;
  oldrow public.tabelas_comerciais;
  sid uuid;
  servico public.catalogo_servicos;
  item jsonb;
  olditem jsonb;
  items jsonb := '[]';
  result jsonb;
  price numeric;
  tid uuid;
begin
  if not private.is_active_user() or not private.is_admin() then raise exception 'Apenas administradores ativos podem alterar tabelas.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(eid::text, 1));
  select * into empresa from public.clientes where id=eid and tipo='cnpj' and ativo;
  if empresa.id is null then raise exception 'Selecione uma empresa ativa cadastrada.'; end if;
  select * into oldrow from public.tabelas_comerciais where empresa_id=eid for update;
  if coalesce(oldrow.versao,0) <> coalesce((p_dados->>'versao')::integer,0) then raise exception 'Esta tabela foi alterada. Recarregue antes de salvar.'; end if;
  if coalesce(length(btrim(p_dados->>'titulo')),0) not between 1 and 200 then raise exception 'Informe um título (até 200 caracteres).'; end if;
  if jsonb_typeof(p_dados->'itens') is distinct from 'array' then raise exception 'Selecione os serviços.'; end if;
  if jsonb_array_length(p_dados->'itens') not between 1 and 500 then raise exception 'Selecione de 1 a 500 serviços.'; end if;
  if (select count(distinct x->>'servicoId') from jsonb_array_elements(p_dados->'itens') x) <> jsonb_array_length(p_dados->'itens') then raise exception 'Serviço repetido.'; end if;
  for item in select * from jsonb_array_elements(p_dados->'itens') loop
    sid := (item->>'servicoId')::uuid;
    select * into servico from public.catalogo_servicos where id=sid for share;
    select x into olditem from jsonb_array_elements(coalesce(oldrow.dados->'itens','[]')) x where x->>'servicoId'=sid::text;
    if servico.id is null or (not (servico.dados->>'ativo')::boolean and olditem is null) then raise exception 'Serviço indisponível para inclusão.'; end if;
    price := (item->>'preco')::numeric;
    if price is null or price::text in ('NaN','Infinity','-Infinity') or price < 0 or price > 9999999999.99 then raise exception 'Preço inválido.'; end if;
    items := items || jsonb_build_array(jsonb_build_object('servicoId',sid,'codigo',coalesce(olditem->>'codigo',servico.dados->>'codigo'),'nome',coalesce(olditem->>'nome',servico.dados->>'nome'),'categoria',coalesce(olditem->>'categoria',servico.dados->>'categoria'),'escopo',coalesce(olditem->>'escopo',servico.dados->>'escopo'),'unidade',coalesce(olditem->>'unidade',servico.dados->>'unidade'),'imagem',coalesce(olditem->>'imagem',servico.dados->>'imagem'),'preco',round(price,2),'precoReferencia',(servico.dados->>'precoPadrao')::numeric));
  end loop;
  -- A catalog adjustment alone must not cause a new commercial revision.
  if oldrow.id is not null and oldrow.dados->>'titulo'=btrim(p_dados->>'titulo') and
    (select jsonb_agg(jsonb_build_object('servicoId',x->>'servicoId','preco',x->'preco')) from jsonb_array_elements(oldrow.dados->'itens') x) =
    (select jsonb_agg(jsonb_build_object('servicoId',x->>'servicoId','preco',x->'preco')) from jsonb_array_elements(items) x) then return oldrow.dados; end if;
  tid := coalesce(oldrow.id,gen_random_uuid());
  result := jsonb_build_object('id',tid,'titulo',btrim(p_dados->>'titulo'),'empresa',jsonb_build_object('id',eid,'nome',empresa.nome,'documento',empresa.documento),'versao',coalesce(oldrow.versao,0)+1,'itens',items,'autorNome',(select nome from public.profiles where id=auth.uid()),'criadoEm',now(),'historico',case when oldrow.id is null then '[]'::jsonb else jsonb_build_array(oldrow.dados-'historico'-'id') || (oldrow.dados->'historico') end);
  insert into public.tabelas_comerciais(id,empresa_id,dados,versao) values(tid,eid,result,coalesce(oldrow.versao,0)+1)
  on conflict(empresa_id) do update set dados=excluded.dados,versao=excluded.versao;
  insert into public.tabela_servico_referencias(tabela_id,servico_id) select tid,(x->>'servicoId')::uuid from jsonb_array_elements(items) x on conflict do nothing;
  return result;
end $$;

create function public.remove_catalogo_servico(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare s public.catalogo_servicos;
begin
  if not private.is_active_user() or not private.is_admin() then raise exception 'Apenas administradores ativos podem remover serviços.'; end if;
  select * into s from public.catalogo_servicos where id=p_id for update;
  if s.id is null then raise exception 'Serviço não encontrado.'; end if;
  if exists(select 1 from public.tabela_servico_referencias where servico_id=p_id) then
    perform public.save_catalogo_servico(s.dados || '{"ativo":false}'::jsonb);
    return 'archived';
  end if;
  delete from public.catalogo_servicos where id=p_id;
  return 'deleted';
end $$;
revoke all on function public.save_catalogo_servico(jsonb), public.save_tabela_comercial(jsonb), public.remove_catalogo_servico(uuid) from public, anon;
grant execute on function public.save_catalogo_servico(jsonb), public.save_tabela_comercial(jsonb), public.remove_catalogo_servico(uuid) to authenticated;

-- Private, immutable image uploads: older snapshots keep their image path.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('catalogo','catalogo',false,5242880,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create policy catalogo_images_read on storage.objects for select to authenticated using (bucket_id='catalogo' and private.is_active_user());
create policy catalogo_images_insert on storage.objects for insert to authenticated with check (bucket_id='catalogo' and private.is_active_user() and private.is_admin() and name ~ '^servicos/[0-9a-f-]+\.(png|jpg|webp)$');
