export const LEAD_STAGES = {
  new: 'Novo',
  contacted: 'Em atendimento',
  budget_created: 'Orçamento criado',
  converted: 'Ganho',
  lost: 'Perdido',
  spam: 'Spam',
} as const
export type LeadStage = keyof typeof LEAD_STAGES
export function toLeadStage(status: LeadStage | 'qualified'): LeadStage {
  return status === 'qualified' ? 'contacted' : status
}
export type LeadEvent = {
  id: string
  actor_name: string
  created_at: string
  details: { status?: string; responsavel_nome?: string; observacao?: string; orcamento_id?: string }
}
export type SiteTicket = {
  id: string
  public_id: string
  status: LeadStage | 'qualified'
  service_name: string
  service_slug: string
  contact_name: string
  company_name: string
  phone: string
  email: string
  city: string
  uf: string
  equipment_type: string
  equipment_brand: string
  equipment_model: string
  description: string
  urgency: string
  landing_path: string
  cta_source: string
  utm_source: string
  utm_campaign: string
  responsavel_id: string | null
  converted_cliente_id: string | null
  converted_orcamento_id: string | null
  created_at: string
  updated_at: string
  versao: number
  site_ticket_events: LeadEvent[]
}
