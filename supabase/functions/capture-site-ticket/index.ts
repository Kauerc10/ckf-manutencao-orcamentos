import { createClient } from 'npm:@supabase/supabase-js@2'
import { createPublicTicketId, parseTicketRequest, type SiteTicketInput } from './core.ts'

const DEFAULT_ALLOWED_ORIGINS = ['https://ckf-home.vercel.app']

function allowedOrigins(): Set<string> {
  const configured = (Deno.env.get('CKF_SITE_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured])
}

function isAllowedOrigin(origin: string | null): origin is string {
  return Boolean(origin && allowedOrigins().has(origin))
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'content-type, x-client-info, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function jsonResponse(origin: string | null, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(origin && isAllowedOrigin(origin) ? corsHeaders(origin) : { Vary: 'Origin' }),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function toDatabaseRow(input: SiteTicketInput, publicId: string) {
  return {
    public_id: publicId,
    status: 'new',
    service_category: input.serviceCategory,
    service_slug: input.serviceSlug,
    service_name: input.serviceName,
    equipment_type: input.equipmentType,
    equipment_brand: input.equipmentBrand,
    equipment_model: input.equipmentModel,
    company_name: input.companyName,
    contact_name: input.contactName,
    phone: input.phone,
    email: input.email,
    city: input.city,
    uf: input.uf,
    description: input.description,
    urgency: input.urgency,
    landing_path: input.landingPath,
    cta_source: input.ctaSource,
    referrer: input.referrer,
    utm_source: input.utmSource,
    utm_medium: input.utmMedium,
    utm_campaign: input.utmCampaign,
    utm_term: input.utmTerm,
    utm_content: input.utmContent,
    idempotency_key: input.idempotencyKey,
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')

  if (!isAllowedOrigin(origin)) {
    return jsonResponse(null, 403, { ok: false, error: 'Origem não permitida.' })
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return jsonResponse(origin, 405, { ok: false, error: 'Método não permitido.' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(origin, 500, { ok: false, error: 'Serviço temporariamente indisponível.' })
  }

  const body = await req.json().catch(() => null)
  const parsed = parseTicketRequest(body)

  if (!parsed.ok && parsed.code === 'spam') {
    return jsonResponse(origin, 202, { ok: true })
  }

  if (!parsed.ok) {
    return jsonResponse(origin, 400, {
      ok: false,
      error: 'Revise os dados da solicitação.',
      fields: parsed.errors,
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: replay, error: replayError } = await supabase
    .from('site_tickets')
    .select('public_id')
    .eq('idempotency_key', parsed.value.idempotencyKey)
    .maybeSingle()

  if (replayError) {
    return jsonResponse(origin, 500, { ok: false, error: 'Não foi possível registrar a solicitação.' })
  }

  if (replay?.public_id) {
    return jsonResponse(origin, 200, { ok: true, public_id: replay.public_id })
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const publicId = createPublicTicketId()
    const { data, error } = await supabase
      .from('site_tickets')
      .insert(toDatabaseRow(parsed.value, publicId))
      .select('public_id')
      .single()

    if (!error && data?.public_id) {
      return jsonResponse(origin, 201, { ok: true, public_id: data.public_id })
    }

    if (error?.code === '23505') {
      const { data: concurrentReplay } = await supabase
        .from('site_tickets')
        .select('public_id')
        .eq('idempotency_key', parsed.value.idempotencyKey)
        .maybeSingle()

      if (concurrentReplay?.public_id) {
        return jsonResponse(origin, 200, { ok: true, public_id: concurrentReplay.public_id })
      }

      continue
    }

    return jsonResponse(origin, 500, { ok: false, error: 'Não foi possível registrar a solicitação.' })
  }

  return jsonResponse(origin, 500, { ok: false, error: 'Não foi possível registrar a solicitação.' })
})
