import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/202608250001_add_site_tickets.sql',
)

const sql = readFileSync(migrationPath, 'utf8').toLowerCase()

describe('site tickets schema contract', () => {
  it('creates tickets as a separate operational entity with safe public identifiers', () => {
    expect(sql).toContain('create table if not exists public.site_tickets')
    expect(sql).toContain('id uuid primary key default gen_random_uuid()')
    expect(sql).toContain('public_id text not null')
    expect(sql).toMatch(/unique\s*\(public_id\)|public_id text not null unique/)
    expect(sql).toContain('idempotency_key text not null')
    expect(sql).toMatch(/unique\s*\(idempotency_key\)|idempotency_key text not null unique/)
  })

  it('restricts status and preserves future client and quotation links', () => {
    for (const status of [
      'new',
      'contacted',
      'qualified',
      'budget_created',
      'converted',
      'lost',
      'spam',
    ]) {
      expect(sql).toContain(`'${status}'`)
    }

    expect(sql).toContain('converted_cliente_id uuid references public.clientes(id)')
    expect(sql).toContain('converted_orcamento_id uuid references public.orcamentos(id)')
  })

  it('stores acquisition context without granting anonymous table access', () => {
    for (const field of [
      'service_category',
      'service_slug',
      'service_name',
      'landing_path',
      'cta_source',
      'referrer',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
    ]) {
      expect(sql).toContain(field)
    }

    expect(sql).toContain('alter table public.site_tickets enable row level security')
    expect(sql).toContain('revoke all on table public.site_tickets from anon')
    expect(sql).not.toMatch(/grant\s+(select|insert|update|delete)[^;]*public\.site_tickets\s+to\s+anon/)
  })

  it('indexes the access paths required by the future Tickets queue', () => {
    expect(sql).toContain('site_tickets_status_created_idx')
    expect(sql).toContain('on public.site_tickets(status, created_at desc)')
    expect(sql).toContain('site_tickets_service_created_idx')
    expect(sql).toContain('on public.site_tickets(service_category, created_at desc)')
    expect(sql).toContain('site_tickets_phone_created_idx')
    expect(sql).toContain('on public.site_tickets(phone, created_at desc)')
  })
})
