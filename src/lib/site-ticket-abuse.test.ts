import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const functionPath = join(process.cwd(), 'supabase/functions/capture-site-ticket/index.ts')
const migrationPath = join(
  process.cwd(),
  'supabase/migrations/202608250003_add_site_ticket_request_hash.sql',
)

describe('site ticket abuse protection', () => {
  it('persiste somente um digest do endereço do cliente e indexa a janela temporal', () => {
    expect(existsSync(migrationPath)).toBe(true)
    if (!existsSync(migrationPath)) return

    const sql = readFileSync(migrationPath, 'utf8').toLowerCase()

    expect(sql).toContain('add column if not exists request_hash text')
    expect(sql).toContain('site_tickets_request_hash_created_idx')
    expect(sql).toContain('on public.site_tickets(request_hash, created_at desc)')
    expect(sql).not.toContain('client_ip')
    expect(sql).not.toContain('ip_address')
  })

  it('gera HMAC server-side e limita solicitações por digest e telefone', () => {
    expect(existsSync(functionPath)).toBe(true)
    if (!existsSync(functionPath)) return

    const source = readFileSync(functionPath, 'utf8')

    expect(source).toContain("req.headers.get('x-forwarded-for')")
    expect(source).toContain("name: 'HMAC'")
    expect(source).toContain('crypto.subtle.sign')
    expect(source).toContain('request_hash')
    expect(source).toContain("count: 'exact'")
    expect(source).toContain(".gte('created_at'")
    expect(source).toContain('429')
    expect(source).not.toContain('client_ip:')
    expect(source).not.toContain('ip_address:')
  })
})
