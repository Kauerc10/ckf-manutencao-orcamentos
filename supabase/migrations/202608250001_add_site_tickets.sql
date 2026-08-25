create table if not exists public.site_tickets (
  id uuid primary key default gen_random_uuid(),
  public_id text not null,
  status text not null default 'new',
  service_category text not null,
  service_slug text not null,
  service_name text not null,
  equipment_type text not null default '',
  equipment_brand text not null default '',
  equipment_model text not null default '',
  company_name text not null default '',
  contact_name text not null,
  phone text not null,
  email text not null default '',
  city text not null default '',
  uf text not null default '',
  description text not null,
  urgency text not null,
  landing_path text not null default '',
  cta_source text not null default '',
  referrer text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  utm_term text not null default '',
  utm_content text not null default '',
  idempotency_key text not null,
  converted_cliente_id uuid references public.clientes(id) on delete set null,
  converted_orcamento_id uuid references public.orcamentos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_tickets_public_id_unique unique (public_id),
  constraint site_tickets_idempotency_key_unique unique (idempotency_key),
  constraint site_tickets_public_id_format_check
    check (public_id ~ '^[A-Z0-9]{6}$'),
  constraint site_tickets_status_check
    check (status in ('new', 'contacted', 'qualified', 'budget_created', 'converted', 'lost', 'spam')),
  constraint site_tickets_service_category_check
    check (service_category in (
      'trucks',
      'concrete_plants',
      'chassis',
      'metal_structures',
      'heavy_machinery',
      'industrial_maintenance',
      'industrial_welding',
      'heavy_hydraulics',
      'preventive_maintenance',
      'corrective_maintenance'
    )),
  constraint site_tickets_service_slug_check
    check (service_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(service_slug) <= 80),
  constraint site_tickets_service_name_check
    check (char_length(btrim(service_name)) between 2 and 120),
  constraint site_tickets_contact_name_check
    check (char_length(btrim(contact_name)) between 2 and 120),
  constraint site_tickets_phone_check
    check (phone ~ '^55[0-9]{10,11}$'),
  constraint site_tickets_email_check
    check (char_length(email) <= 254),
  constraint site_tickets_city_check
    check (char_length(city) <= 120),
  constraint site_tickets_uf_check
    check (uf = '' or uf ~ '^[A-Z]{2}$'),
  constraint site_tickets_description_check
    check (char_length(btrim(description)) between 5 and 2000),
  constraint site_tickets_urgency_check
    check (char_length(btrim(urgency)) between 2 and 40),
  constraint site_tickets_equipment_type_check
    check (char_length(equipment_type) <= 120),
  constraint site_tickets_equipment_brand_check
    check (char_length(equipment_brand) <= 120),
  constraint site_tickets_equipment_model_check
    check (char_length(equipment_model) <= 120),
  constraint site_tickets_company_name_check
    check (char_length(company_name) <= 160),
  constraint site_tickets_landing_path_check
    check (char_length(landing_path) <= 500),
  constraint site_tickets_cta_source_check
    check (char_length(cta_source) <= 120),
  constraint site_tickets_referrer_check
    check (char_length(referrer) <= 1000),
  constraint site_tickets_utm_source_check
    check (char_length(utm_source) <= 200),
  constraint site_tickets_utm_medium_check
    check (char_length(utm_medium) <= 200),
  constraint site_tickets_utm_campaign_check
    check (char_length(utm_campaign) <= 300),
  constraint site_tickets_utm_term_check
    check (char_length(utm_term) <= 300),
  constraint site_tickets_utm_content_check
    check (char_length(utm_content) <= 300),
  constraint site_tickets_idempotency_key_check
    check (char_length(idempotency_key) between 16 and 128)
);

create index if not exists site_tickets_status_created_idx
  on public.site_tickets(status, created_at desc);

create index if not exists site_tickets_service_created_idx
  on public.site_tickets(service_category, created_at desc);

create index if not exists site_tickets_phone_created_idx
  on public.site_tickets(phone, created_at desc);

create index if not exists site_tickets_created_at_idx
  on public.site_tickets(created_at desc);

drop trigger if exists site_tickets_set_updated_at on public.site_tickets;
create trigger site_tickets_set_updated_at
  before update on public.site_tickets
  for each row execute function private.set_updated_at();

alter table public.site_tickets enable row level security;

revoke all on table public.site_tickets from anon;
revoke all on table public.site_tickets from authenticated;

-- The public website never receives table privileges. Inserts are performed
-- only by the capture-site-ticket Edge Function through its server-side role.
-- Authenticated access for the future Tickets queue will be introduced in a
-- separate migration together with its explicit RLS policies.
