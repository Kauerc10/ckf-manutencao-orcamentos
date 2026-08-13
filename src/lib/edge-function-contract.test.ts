import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const functionPath = join(process.cwd(), 'supabase/functions/admin-delete-orcamento/index.ts')
const rpcMigrationPath = join(
  process.cwd(),
  'supabase/migrations/20260813000000_delete_orcamento_without_edge_function.sql',
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
  })
})

describe('database deletion approval contract', () => {
  it('binds the requester to their JWT and records denied and failed attempts', () => {
    const source = readFileSync(rpcMigrationPath, 'utf8')

    expect(source).toContain('v_requester_id uuid := auth.uid()')
    expect(source).toContain("action = 'delete_denied'")
    expect(source).toContain("action = 'delete_failed'")
    expect(source).toContain('v_request.actor_id')
    expect(source).not.toContain('p_requester_id')
  })
})
