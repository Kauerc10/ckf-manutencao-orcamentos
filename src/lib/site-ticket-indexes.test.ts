import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/202608250002_add_site_ticket_conversion_indexes.sql',
)

const sql = readFileSync(migrationPath, 'utf8').toLowerCase()

describe('site ticket conversion indexes', () => {
  it('indexes both future conversion foreign keys', () => {
    expect(sql).toContain('site_tickets_converted_cliente_id_idx')
    expect(sql).toContain('on public.site_tickets(converted_cliente_id)')
    expect(sql).toContain('site_tickets_converted_orcamento_id_idx')
    expect(sql).toContain('on public.site_tickets(converted_orcamento_id)')
  })
})
