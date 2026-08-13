import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const functionPath = join(process.cwd(), 'supabase/functions/admin-delete-orcamento/index.ts')
const repositoryPath = join(process.cwd(), 'src/data/orcamentoRepository.ts')
const legacyRpcMigrationPath = join(
  process.cwd(),
  'supabase/migrations/20260813160000_disable_legacy_public_delete_rpcs.sql',
)

describe('admin-delete-orcamento edge function contract', () => {
  it('authenticates an approving admin without replacing the requester session', () => {
    expect(existsSync(functionPath)).toBe(true)

    const source = readFileSync(functionPath, 'utf8')

    expect(source).toContain('adminIdentifier')
    expect(source).toContain('adminPassword')
    expect(source).toContain('signInWithPassword')
    expect(source).toContain('persistSession: false')
    expect(source).toContain("role !== 'admin'")
    expect(source).toContain('requester.id')
    expect(source).toContain('delete_orcamento_with_admin_approval')
    expect(source).toContain("error: 'admin_not_allowed'")
    expect(source).toContain("writeDeleteAudit('delete_denied'")
    expect(source).toContain("writeDeleteAudit('delete_failed'")
  })
})

describe('deletion repository contract', () => {
  it('delegates credential confirmation to the Edge Function', () => {
    const source = readFileSync(repositoryPath, 'utf8')

    expect(source).toContain("supabase.functions.invoke('admin-delete-orcamento'")
    expect(source).not.toContain('request_orcamento_deletion')
    expect(source).not.toContain('deny_orcamento_deletion')
    expect(source).not.toContain("createClient(supabaseUrl")
  })
})

describe('legacy deletion RPC retirement contract', () => {
  it('removes public approval RPCs after the Edge Function is adopted', () => {
    const source = readFileSync(legacyRpcMigrationPath, 'utf8')

    expect(source).toContain('drop function if exists public.request_orcamento_deletion')
    expect(source).toContain('drop function if exists public.deny_orcamento_deletion')
    expect(source).toContain('drop function if exists public.delete_orcamento_with_admin_approval')
    expect(source).toContain("notify pgrst, 'reload schema'")
  })
})
