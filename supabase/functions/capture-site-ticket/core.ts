export const SITE_TICKET_CATEGORIES = [
  'trucks',
  'concrete_plants',
  'chassis',
  'metal_structures',
  'heavy_machinery',
  'industrial_maintenance',
  'industrial_welding',
  'heavy_hydraulics',
  'preventive_maintenance',
  'corrective_maintenance',
] as const

export type SiteTicketCategory = (typeof SITE_TICKET_CATEGORIES)[number]

export type SiteTicketInput = {
  serviceCategory: SiteTicketCategory
  serviceSlug: string
  serviceName: string
  equipmentType: string
  equipmentBrand: string
  equipmentModel: string
  companyName: string
  contactName: string
  phone: string
  email: string
  city: string
  uf: string
  description: string
  urgency: string
  landingPath: string
  ctaSource: string
  referrer: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm: string
  utmContent: string
  idempotencyKey: string
}

export type ParseTicketResult =
  | { ok: true; value: SiteTicketInput }
  | { ok: false; code: 'spam' }
  | { ok: false; code: 'validation'; errors: string[] }

const PUBLIC_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const allowedCategories = new Set<string>(SITE_TICKET_CATEGORIES)

function toRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {}
}

function text(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

function rawText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

export function normalizeBrazilPhone(value: unknown): string {
  if (typeof value !== 'string') return ''

  const digits = value.replace(/\D/g, '')
  if (/^55\d{10,11}$/.test(digits)) return digits
  if (/^\d{10,11}$/.test(digits)) return `55${digits}`
  return ''
}

export function createPublicTicketId(bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(6))): string {
  if (bytes.length < 6) {
    throw new Error('São necessários ao menos 6 bytes aleatórios.')
  }

  return Array.from(bytes.slice(0, 6), (byte) => PUBLIC_ID_ALPHABET[byte % PUBLIC_ID_ALPHABET.length]).join('')
}

export function parseTicketRequest(input: unknown): ParseTicketResult {
  const source = toRecord(input)

  if (text(source.website, 200)) {
    return { ok: false, code: 'spam' }
  }

  const serviceCategory = rawText(source.serviceCategory, 80)
  const serviceSlug = rawText(source.serviceSlug, 80).toLowerCase()
  const serviceName = text(source.serviceName, 120)
  const contactName = text(source.contactName, 120)
  const phone = normalizeBrazilPhone(source.phone)
  const email = rawText(source.email, 254).toLowerCase()
  const city = text(source.city, 120)
  const uf = rawText(source.uf, 2).toUpperCase()
  const description = text(source.description, 2000)
  const urgency = rawText(source.urgency, 40).toLowerCase()
  const idempotencyKey = rawText(source.idempotencyKey, 128)

  const errors: string[] = []

  if (!allowedCategories.has(serviceCategory)) errors.push('serviceCategory')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(serviceSlug)) errors.push('serviceSlug')
  if (serviceName.length < 2) errors.push('serviceName')
  if (contactName.length < 2) errors.push('contactName')
  if (!phone) errors.push('phone')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email')
  if (uf && !/^[A-Z]{2}$/.test(uf)) errors.push('uf')
  if (description.length < 5) errors.push('description')
  if (urgency.length < 2) errors.push('urgency')
  if (idempotencyKey.length < 16) errors.push('idempotencyKey')

  if (errors.length) {
    return { ok: false, code: 'validation', errors }
  }

  return {
    ok: true,
    value: {
      serviceCategory: serviceCategory as SiteTicketCategory,
      serviceSlug,
      serviceName,
      equipmentType: text(source.equipmentType, 120),
      equipmentBrand: text(source.equipmentBrand, 120),
      equipmentModel: text(source.equipmentModel, 120),
      companyName: text(source.companyName, 160),
      contactName,
      phone,
      email,
      city,
      uf,
      description,
      urgency,
      landingPath: rawText(source.landingPath, 500),
      ctaSource: rawText(source.ctaSource, 120),
      referrer: rawText(source.referrer, 1000),
      utmSource: rawText(source.utmSource, 200),
      utmMedium: rawText(source.utmMedium, 200),
      utmCampaign: rawText(source.utmCampaign, 300),
      utmTerm: rawText(source.utmTerm, 300),
      utmContent: rawText(source.utmContent, 300),
      idempotencyKey,
    },
  }
}
