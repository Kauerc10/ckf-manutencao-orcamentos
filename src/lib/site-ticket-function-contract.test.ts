import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const functionPath = join(process.cwd(), 'supabase/functions/capture-site-ticket/index.ts')

describe('capture-site-ticket edge function contract', () => {
  it('expõe somente POST e OPTIONS com CORS baseado em allowlist', () => {
    expect(existsSync(functionPath)).toBe(true)
    if (!existsSync(functionPath)) return

    const source = readFileSync(functionPath, 'utf8')

    expect(source).toContain("req.method === 'OPTIONS'")
    expect(source).toContain("req.method !== 'POST'")
    expect(source).toContain('CKF_SITE_ALLOWED_ORIGINS')
    expect(source).toContain("req.headers.get('Origin')")
    expect(source).not.toContain("'Access-Control-Allow-Origin': '*'")
  })

  it('aceita deployments Vercel apenas do projeto CKF', () => {
    expect(existsSync(functionPath)).toBe(true)
    if (!existsSync(functionPath)) return

    const source = readFileSync(functionPath, 'utf8')

    expect(source).toContain('CKF_VERCEL_ORIGIN')
    expect(source).toContain('CKF_VERCEL_ORIGIN.test(origin)')
    expect(source).toContain('kaueruon-7006s-projects')
    expect(source).not.toContain("endsWith('.vercel.app')")
  })

  it('valida o payload e persiste com service role sem exigir login do visitante', () => {
    expect(existsSync(functionPath)).toBe(true)
    if (!existsSync(functionPath)) return

    const source = readFileSync(functionPath, 'utf8')

    expect(source).toContain('parseTicketRequest')
    expect(source).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')")
    expect(source).toContain(".from('site_tickets')")
    expect(source).toContain('idempotency_key')
    expect(source).not.toContain('Sessao obrigatoria')
    expect(source).not.toContain('signInWithPassword')
  })

  it('retorna somente o identificador público e trata replay idempotente', () => {
    expect(existsSync(functionPath)).toBe(true)
    if (!existsSync(functionPath)) return

    const source = readFileSync(functionPath, 'utf8')

    expect(source).toContain(".select('public_id')")
    expect(source).toContain('public_id')
    expect(source).toContain('201')
    expect(source).toContain('200')
    expect(source).not.toMatch(/jsonResponse\([^\n]*\{[^\n]*\bid\s*:/)
  })
})
