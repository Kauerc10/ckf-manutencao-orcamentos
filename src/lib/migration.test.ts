import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDir = join(process.cwd(), 'supabase/migrations')
const migrationSql = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => readFileSync(join(migrationsDir, file), 'utf8'))
  .join('\n')
  .toLowerCase()

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

  it('adds admin-controlled system settings without allowing profile role escalation', () => {
    expect(migrationSql).toContain("add column if not exists role text not null default 'usuario'")
    expect(migrationSql).toContain("set role = 'admin'")
    expect(migrationSql).toContain('create or replace function private.is_admin()')
    expect(migrationSql).toContain('create table if not exists public.system_settings')
    expect(migrationSql).toContain('alter table public.system_settings enable row level security')
    expect(migrationSql).toContain('using (private.is_admin())')
    expect(migrationSql).toContain('revoke update on table public.profiles from authenticated')
    expect(migrationSql).toContain('grant update (nome) on table public.profiles to authenticated')
  })
})
