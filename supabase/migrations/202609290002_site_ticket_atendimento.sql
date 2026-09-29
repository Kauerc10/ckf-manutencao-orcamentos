alter table public.site_tickets add column responsavel_id uuid references public.profiles(id), add column versao integer not null default 0;
create table public.site_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.site_tickets(id),
  actor_id uuid not null references public.profiles(id),
  actor_name text not null,
  details jsonb not null,
  created_at timestamptz not null default now()
);
create index site_ticket_events_ticket_idx on public.site_ticket_events(ticket_id,created_at);
create index site_tickets_responsavel_idx on public.site_tickets(responsavel_id,created_at desc);
-- Use the English timestamp column without changing existing legacy triggers.
create function private.update_site_ticket_time() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); new.versao=old.versao+1; return new; end $$;
drop trigger site_tickets_set_updated_at on public.site_tickets;
create trigger site_tickets_set_updated_at before update on public.site_tickets for each row execute function private.update_site_ticket_time();
revoke all on function private.update_site_ticket_time() from public,anon,authenticated;
alter table public.site_ticket_events enable row level security;
revoke all on public.site_ticket_events from public,anon,authenticated;
grant select on public.site_tickets, public.site_ticket_events to authenticated;
create policy tickets_staff_read on public.site_tickets for select to authenticated using(private.is_active_user());
create policy ticket_events_staff_read on public.site_ticket_events for select to authenticated using(private.is_active_user());

create function public.update_site_ticket(p_id uuid,p_versao integer,p_status text,p_responsavel uuid,p_observacao text) returns void
language plpgsql security definer set search_path='' as $$
declare oldrow public.site_tickets; details jsonb := '{}';
begin
  if not private.is_active_user() then raise exception 'Usuário ativo obrigatório.'; end if;
  select * into oldrow from public.site_tickets where id=p_id for update;
  if oldrow.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if oldrow.versao<>p_versao then raise exception 'Solicitação alterada. Recarregue antes de salvar.'; end if;
  if p_status is null or p_status not in ('new','contacted','budget_created','converted','lost','spam') then raise exception 'Etapa inválida.'; end if;
  if p_status='budget_created' and oldrow.converted_orcamento_id is null then raise exception 'Crie o orçamento antes de marcar esta etapa.'; end if;
  if p_responsavel is not null and not exists(select 1 from public.profiles where id=p_responsavel and ativo) then raise exception 'Responsável inativo ou inexistente.'; end if;
  if length(coalesce(p_observacao,''))>2000 then raise exception 'Use até 2000 caracteres na observação.'; end if;
  if oldrow.status<>p_status then details:=details||jsonb_build_object('status',p_status,'anterior',oldrow.status); end if;
  if oldrow.responsavel_id is distinct from p_responsavel then details:=details||jsonb_build_object('responsavel_nome',coalesce((select nome from public.profiles where id=p_responsavel),'Sem responsável')); end if;
  if btrim(coalesce(p_observacao,''))<>'' then details:=details||jsonb_build_object('observacao',btrim(p_observacao)); end if;
  if details='{}'::jsonb then return; end if;
  update public.site_tickets set status=p_status,responsavel_id=p_responsavel where id=p_id;
  insert into public.site_ticket_events(ticket_id,actor_id,actor_name,details) values(p_id,auth.uid(),(select nome from public.profiles where id=auth.uid()),details);
end $$;

create function public.convert_site_ticket(p_id uuid,p_draft jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  ticket public.site_tickets;
  cliente public.clientes;
  oid uuid;
  num integer;
  item jsonb;
  qty numeric;
  price numeric;
  subtotal numeric;
  total numeric := 0;
  pos integer := 0;
  valued integer := 0;
begin
  if not private.is_active_user() then raise exception 'Usuário ativo obrigatório.'; end if;
  select * into ticket from public.site_tickets where id=p_id for update;
  if ticket.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if ticket.converted_orcamento_id is not null then
    select numero into num from public.orcamentos where id=ticket.converted_orcamento_id;
    return jsonb_build_object('id',ticket.converted_orcamento_id,'numero',num);
  end if;
  select * into cliente from public.clientes where id=(p_draft->>'clienteId')::uuid and ativo and (criado_por=auth.uid() or private.is_admin());
  if cliente.id is null then raise exception 'Selecione um cliente ativo acessível ou complete seu cadastro.'; end if;
  if nullif(p_draft->>'representanteId','') is not null and not exists(select 1 from public.cliente_representantes where id=(p_draft->>'representanteId')::uuid and cliente_id=cliente.id and ativo) then raise exception 'Representante inválido.'; end if;
  if coalesce(length(btrim(p_draft->>'servicoCliente')),0)<2 or (p_draft->>'validadeDias')::integer is null or (p_draft->>'validadeDias')::integer<=0 or (p_draft->>'dataOrcamento')::date is null then raise exception 'Revise os campos do orçamento.'; end if;
  if jsonb_typeof(p_draft->'itens') is distinct from 'array' then raise exception 'Informe os itens do orçamento.'; end if;
  if jsonb_array_length(p_draft->'itens') not between 1 and 14 then raise exception 'Inclua de 1 a 14 itens.'; end if;
  for item in select * from jsonb_array_elements(p_draft->'itens') loop
    qty := (item->>'quantidade')::numeric;
    price := (item->>'valorUnitario')::numeric;
    subtotal := case when qty is not null and price is not null then round(qty*price,2) when qty is null and price is null then coalesce((item->>'valorTotal')::numeric,0) else 0 end;
    if qty::text in ('NaN','Infinity','-Infinity') or price::text in ('NaN','Infinity','-Infinity') or subtotal::text in ('NaN','Infinity','-Infinity') or qty<0 or price<0 or subtotal<0 or subtotal>9999999999.99 then raise exception 'Valores inválidos.'; end if;
    if subtotal>0 and coalesce(length(btrim(item->>'descricao')),0)=0 then raise exception 'Descreva os itens com valor.'; end if;
    if subtotal>0 then valued:=valued+1; end if;
    total:=total+subtotal;
  end loop;
  if valued=0 then raise exception 'Inclua pelo menos um item com descrição e valor.'; end if;
  insert into public.orcamentos(data_orcamento,servico_cliente,cliente_id,representante_id,status,observacoes,validade_dias,total)
  values((p_draft->>'dataOrcamento')::date,btrim(p_draft->>'servicoCliente'),cliente.id,nullif(p_draft->>'representanteId','')::uuid,'rascunho',coalesce(p_draft->>'observacoes',''),(p_draft->>'validadeDias')::integer,total)
  returning id,numero into oid,num;
  for item in select * from jsonb_array_elements(p_draft->'itens') loop
    pos:=pos+1; qty:=(item->>'quantidade')::numeric; price:=(item->>'valorUnitario')::numeric;
    subtotal:=case when qty is not null and price is not null then round(qty*price,2) when qty is null and price is null then coalesce((item->>'valorTotal')::numeric,0) else 0 end;
    insert into public.orcamento_itens(orcamento_id,ordem,quantidade,descricao,valor_unitario,valor_total) values(oid,pos,qty,coalesce(item->>'descricao',''),price,subtotal);
  end loop;
  update public.site_tickets set converted_cliente_id=cliente.id,converted_orcamento_id=oid,status='budget_created' where id=p_id;
  insert into public.site_ticket_events(ticket_id,actor_id,actor_name,details) values(p_id,auth.uid(),(select nome from public.profiles where id=auth.uid()),jsonb_build_object('status','budget_created','anterior',ticket.status,'orcamento_id',oid));
  return jsonb_build_object('id',oid,'numero',num);
end $$;
revoke all on function public.update_site_ticket(uuid,integer,text,uuid,text),public.convert_site_ticket(uuid,jsonb) from public,anon;
grant execute on function public.update_site_ticket(uuid,integer,text,uuid,text),public.convert_site_ticket(uuid,jsonb) to authenticated;
