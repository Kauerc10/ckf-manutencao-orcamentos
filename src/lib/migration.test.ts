import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationSql = readFileSync(
  join(process.cwd(), 'supabase/migrations/202605160001_initial_schema.sql'),
  'utf8',
).toLowerCase()

describe('supabase migration contract', () => {
  it('keeps quotation numbers unique and starting at the official visual model range', () => {
    expect(migrationSql).toContain('create sequence if not exists public.orcamento_numero_seq')
    expect(migrationSql).toContain('start with 285')
    expect(migrationSql).toContain('constraint orcamentos_numero_unique unique (numero)')
  })

  it('enables rls and limits quotation access to authenticated active users', () => {
    expect(migrationSql).toContain('alter table public.orcamentos enable row level security')
    expect(migrationSql).toContain('alter table public.orcamento_itens enable row level security')
    expect(migrationSql).toContain('security definer')
    expect(migrationSql).toContain('to authenticated')
    expect(migrationSql).toContain('private.is_active_user()')
    expect(migrationSql).toContain('grant select, insert, update, delete on table public.orcamentos to authenticated')
  })
})
