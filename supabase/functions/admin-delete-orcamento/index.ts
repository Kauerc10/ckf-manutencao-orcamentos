import { createClient } from 'npm:@supabase/supabase-js@2'
import postgres from 'npm:postgres@3.4.7'

type DeleteRequest = {
  orcamentoId?: string
  motivo?: string
  adminIdentifier?: string
  adminPassword?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function getPublishableKey(): string {
  const publishableKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
  if (publishableKeys) {
    const parsed = JSON.parse(publishableKeys) as Record<string, string>
    if (parsed.default) return parsed.default
  }

  return Deno.env.get('SUPABASE_ANON_KEY') ?? ''
}

async function resolveAdminEmail(supabaseUrl: string, publishableKey: string, adminIdentifier: string): Promise<string | null> {
  if (adminIdentifier.includes('@')) return adminIdentifier

  const lookupClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await lookupClient.rpc('get_email_by_username', { p_username: adminIdentifier })
  if (error || !data) return null

  return String(data)
}

async function writeDeleteAudit(
  action: 'delete_denied' | 'delete_failed',
  payload: {
    dbUrl: string
    orcamentoId: string
    requesterId: string
    adminIdentifier: string
    motivo: string
    error: string
  },
) {
  const sql = postgres(payload.dbUrl, { max: 1, prepare: false })
  try {
    await sql`
      insert into public.activity_logs (entity_type, entity_id, action, actor_id, details)
      values (
        'orcamento',
        ${payload.orcamentoId}::uuid,
        ${action},
        ${payload.requesterId}::uuid,
        ${sql.json({
          admin_identifier: payload.adminIdentifier,
          motivo: payload.motivo,
          error: payload.error,
        })}::jsonb
      )
    `
  } finally {
    await sql.end({ timeout: 1 })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Metodo nao permitido.' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const dbUrl = Deno.env.get('SUPABASE_DB_URL')
  const publishableKey = getPublishableKey()

  if (!supabaseUrl || !dbUrl || !publishableKey) {
    return jsonResponse(500, { error: 'Funcao de exclusao nao configurada.' })
  }

  const authorization = req.headers.get('Authorization')
  if (!authorization) {
    return jsonResponse(401, { error: 'Sessao obrigatoria.' })
  }

  const body = (await req.json().catch(() => ({}))) as DeleteRequest
  const orcamentoId = body.orcamentoId?.trim()
  const motivo = body.motivo?.trim().replace(/\s+/g, ' ')
  const adminIdentifier = body.adminIdentifier?.trim()
  const adminPassword = body.adminPassword?.trim()

  if (!orcamentoId) return jsonResponse(400, { error: 'Orcamento obrigatorio.' })
  if (!motivo) return jsonResponse(400, { error: 'Informe o motivo da exclusao.' })
  if (!adminIdentifier || !adminPassword) {
    return jsonResponse(400, { error: 'Informe as credenciais de administrador.' })
  }

  const requesterClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const {
    data: { user: requester },
    error: requesterError,
  } = await requesterClient.auth.getUser()

  if (requesterError || !requester) {
    return jsonResponse(401, { error: 'Sessao invalida.' })
  }

  const adminEmail = await resolveAdminEmail(supabaseUrl, publishableKey, adminIdentifier)
  if (!adminEmail) {
    await writeDeleteAudit('delete_denied', {
      dbUrl,
      orcamentoId,
      requesterId: requester.id,
      adminIdentifier,
      motivo,
      error: 'admin_not_found',
    }).catch(() => undefined)
    return jsonResponse(401, { error: 'Credenciais de administrador invalidas.' })
  }

  const adminAuthClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: adminAuth, error: adminAuthError } = await adminAuthClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  })

  if (adminAuthError || !adminAuth.user || !adminAuth.session) {
    await writeDeleteAudit('delete_denied', {
      dbUrl,
      orcamentoId,
      requesterId: requester.id,
      adminIdentifier,
      motivo,
      error: 'invalid_admin_credentials',
    }).catch(() => undefined)
    return jsonResponse(401, { error: 'Credenciais de administrador invalidas.' })
  }

  const approvingClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${adminAuth.session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: adminProfile, error: adminProfileError } = await approvingClient
    .from('profiles')
    .select('id,ativo,role')
    .eq('id', adminAuth.user.id)
    .single()

  if (adminProfileError || !adminProfile?.ativo || adminProfile.role !== 'admin') {
    await writeDeleteAudit('delete_denied', {
      dbUrl,
      orcamentoId,
      requesterId: requester.id,
      adminIdentifier,
      motivo,
      error: 'admin_not_allowed',
    }).catch(() => undefined)
    return jsonResponse(401, { error: 'Credenciais de administrador invalidas.' })
  }

  const sql = postgres(dbUrl, { max: 1, prepare: false })
  try {
    await sql`
      select private.delete_orcamento_with_admin_approval(
        ${orcamentoId}::uuid,
        ${motivo},
        ${requester.id}::uuid,
        ${adminProfile.id}::uuid
      )
    `
    return jsonResponse(200, { ok: true })
  } catch (error) {
    await writeDeleteAudit('delete_failed', {
      dbUrl,
      orcamentoId,
      requesterId: requester.id,
      adminIdentifier,
      motivo,
      error: error instanceof Error ? error.message : 'unknown_error',
    }).catch(() => undefined)
    return jsonResponse(400, { error: error instanceof Error ? error.message : 'Nao foi possivel excluir o orcamento.' })
  } finally {
    await sql.end({ timeout: 1 })
  }
})
