alter table public.site_tickets
  add column if not exists request_hash text not null default '';

alter table public.site_tickets
  drop constraint if exists site_tickets_request_hash_check;

alter table public.site_tickets
  add constraint site_tickets_request_hash_check
  check (request_hash = '' or request_hash ~ '^[a-f0-9]{64}$');

create index if not exists site_tickets_request_hash_created_idx
  on public.site_tickets(request_hash, created_at desc);
