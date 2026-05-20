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

  it('keeps deleted quotations auditable and blocks physical quotation deletes', () => {
    expect(migrationSql).toContain("alter type public.orcamento_status add value if not exists 'excluido'")
    expect(migrationSql).toContain('add column if not exists excluido_em timestamptz')
    expect(migrationSql).toContain('add column if not exists excluido_por uuid references public.profiles(id)')
    expect(migrationSql).toContain('add column if not exists exclusao_solicitada_por uuid references public.profiles(id)')
    expect(migrationSql).toContain('add column if not exists excluido_motivo text')
    expect(migrationSql).toContain('orcamentos_exclusao_audit_check')
    expect(migrationSql).toContain('drop policy if exists "active users can delete quotations"')
    expect(migrationSql).toContain('revoke delete on table public.orcamentos from authenticated')
    expect(migrationSql).toContain("new.status = 'excluido'")
    expect(migrationSql).toContain('private.is_admin()')
  })

  it('routes admin-approved quotation deletion through hardened database boundaries', () => {
    expect(migrationSql).toContain('create table if not exists public.activity_logs')
    expect(migrationSql).toContain('create or replace function private.delete_orcamento_with_admin_approval')
    expect(migrationSql).toContain('revoke all on function private.delete_orcamento_with_admin_approval(uuid, text, uuid, uuid) from public, anon, authenticated')
    expect(migrationSql).toContain('new.excluido_em = now()')
    expect(migrationSql).toContain('new.excluido_por is null')
    expect(migrationSql).toContain('revoke update on table public.orcamentos from authenticated')
    expect(migrationSql).toContain('grant update (data_orcamento, servico_cliente, status, observacoes, validade_dias, total) on table public.orcamentos to authenticated')
    expect(migrationSql).toContain('private.orcamento_is_editable')
    expect(migrationSql).toContain("status <> 'excluido'")
    expect(migrationSql).toContain("'delete_approved'")
    expect(migrationSql).toContain("'delete_denied'")
    expect(migrationSql).toContain("'delete_failed'")
  })
})
