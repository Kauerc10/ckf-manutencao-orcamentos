import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const functionPath = join(process.cwd(), 'supabase/functions/admin-delete-orcamento/index.ts')

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
