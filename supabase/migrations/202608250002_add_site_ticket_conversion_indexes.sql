create index if not exists site_tickets_converted_cliente_id_idx
  on public.site_tickets(converted_cliente_id);

create index if not exists site_tickets_converted_orcamento_id_idx
  on public.site_tickets(converted_orcamento_id);
