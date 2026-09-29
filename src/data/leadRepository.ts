import { supabase } from '../lib/supabase'
import { DEMO_PROFILE } from '../lib/demo-data'
import { getCliente } from './clienteRepository'
import { getOrcamento, saveOrcamento } from './orcamentoRepository'
import { orcamentoFormSchema } from '../lib/validations'
import type { Profile, OrcamentoDraft } from '../types'
import type { LeadStage, SiteTicket } from '../types/leads'
import { LEAD_STAGES } from '../types/leads'
const KEY = 'ckf-leads-v1'
export const DEMO_TICKET: SiteTicket = {
  id: 'lead-demo-1',
  public_id: 'DEMO01',
  status: 'new',
  service_name: 'Solda industrial',
  service_slug: 'solda-industrial',
  contact_name: 'Marina Souza',
  company_name: 'Condominio Centro Comercial',
  phone: '5547999990000',
  email: 'contato@exemplo.local',
  city: 'Blumenau',
  uf: 'SC',
  equipment_type: 'Estrutura metálica',
  equipment_brand: '',
  equipment_model: '',
  description: 'Precisamos recuperar a estrutura da garagem. Solicitar visita para avaliar a soldagem.',
  urgency: 'Nesta semana',
  landing_path: '/servicos/solda-industrial',
  cta_source: 'service-page',
  utm_source: '',
  utm_campaign: '',
  responsavel_id: null,
  converted_cliente_id: null,
  converted_orcamento_id: null,
  created_at: '2026-09-29T10:00:00Z',
  updated_at: '2026-09-29T10:00:00Z',
  versao: 0,
  site_ticket_events: [],
}
function read(): SiteTicket[] {
  return JSON.parse(localStorage.getItem(KEY) || JSON.stringify([DEMO_TICKET])) as SiteTicket[]
}
function write(all: SiteTicket[]) {
  localStorage.setItem(KEY, JSON.stringify(all))
}
function assertActive(p: Profile) {
  if (!p.ativo) throw new Error('Usuário ativo obrigatório.')
}
let localConversionQueue: Promise<unknown> = Promise.resolve()
function serializeConversion<T>(operation: () => Promise<T>): Promise<T> {
  // Web Locks coordinates demo tabs; the queue also works in browsers without it.
  if (navigator.locks) return navigator.locks.request('ckf-lead-conversion', operation)
  const pending = localConversionQueue.then(operation, operation)
  localConversionQueue = pending.catch(() => undefined)
  return pending
}
export async function listTickets(): Promise<SiteTicket[]> {
  if (!supabase) return read()
  const tickets: SiteTicket[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('site_tickets')
      .select('*,site_ticket_events(*)')
      .order('created_at', { ascending: false })
      .order('id')
      .range(offset, offset + 499)
    if (error) throw error
    tickets.push(...(data as SiteTicket[]))
    if ((data?.length ?? 0) < 500) break
  }
  return tickets
}
export async function getTicket(id: string): Promise<SiteTicket | null> {
  if (!supabase) return read().find((t) => t.id === id) ?? null
  const { data, error } = await supabase
    .from('site_tickets')
    .select('*,site_ticket_events(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as SiteTicket | null
}
export async function listLeadProfiles(): Promise<Pick<Profile, 'id' | 'nome'>[]> {
  if (!supabase) return [DEMO_PROFILE]
  const { data, error } = await supabase.from('profiles').select('id,nome').eq('ativo', true).order('nome')
  if (error) throw error
  return data ?? []
}
export async function updateTicket(
  id: string,
  versao: number,
  status: LeadStage,
  responsavel: string | null,
  observacao: string,
  profile: Profile,
): Promise<void> {
  assertActive(profile)
  if (!(status in LEAD_STAGES) || observacao.length > 2000) throw new Error('Etapa ou observação inválida.')
  if (supabase) {
    const { error } = await supabase.rpc('update_site_ticket', {
      p_id: id,
      p_versao: versao,
      p_status: status,
      p_responsavel: responsavel,
      p_observacao: observacao,
    })
    if (error) throw error
    return
  }
  const profiles = await listLeadProfiles()
  const all = read()
  const ticket = all.find((t) => t.id === id)
  if (!ticket) throw new Error('Solicitação não encontrada.')
  if (ticket.versao !== versao) throw new Error('Solicitação alterada. Recarregue antes de salvar.')
  if (status === 'budget_created' && !ticket.converted_orcamento_id)
    throw new Error('Crie o orçamento antes de marcar esta etapa.')
  if (responsavel && !profiles.some((p) => p.id === responsavel)) throw new Error('Responsável inativo ou inexistente.')
  const details: SiteTicket['site_ticket_events'][number]['details'] = {}
  if (status !== ticket.status) details.status = status
  if (responsavel !== ticket.responsavel_id)
    details.responsavel_nome = profiles.find((p) => p.id === responsavel)?.nome ?? 'Sem responsável'
  if (observacao.trim()) details.observacao = observacao.trim()
  if (!Object.keys(details).length) return
  const updated = {
    ...ticket,
    status,
    responsavel_id: responsavel,
    versao: versao + 1,
    updated_at: new Date().toISOString(),
    site_ticket_events: [
      ...ticket.site_ticket_events,
      { id: crypto.randomUUID(), actor_name: profile.nome, created_at: new Date().toISOString(), details },
    ],
  }
  write(all.map((t) => (t.id === id ? updated : t)))
}
export async function convertTicket(
  id: string,
  draft: OrcamentoDraft,
  profile: Profile,
): Promise<{ id: string; numero: number }> {
  assertActive(profile)
  if (supabase) {
    const { data, error } = await supabase.rpc('convert_site_ticket', { p_id: id, p_draft: draft })
    if (error) throw error
    return data as { id: string; numero: number }
  }
  return serializeConversion(() => convertLocalTicket(id, draft, profile))
}
async function convertLocalTicket(
  id: string,
  draft: OrcamentoDraft,
  profile: Profile,
): Promise<{ id: string; numero: number }> {
  const ticket = await getTicket(id)
  if (!ticket) throw new Error('Solicitação não encontrada.')
  if (ticket.converted_orcamento_id) {
    const o = await getOrcamento(ticket.converted_orcamento_id)
    if (!o) throw new Error('Orçamento vinculado não encontrado.')
    return o
  }
  const result = orcamentoFormSchema.safeParse(draft)
  if (!result.success) throw new Error(result.error.issues[0].message)
  const cliente = draft.clienteId ? await getCliente(draft.clienteId) : null
  if (!cliente?.ativo) throw new Error('Selecione um cliente ativo ou complete seu cadastro.')
  // Demo persistence rollback mirrors the server transaction on failure.
  const oldBudgets = localStorage.getItem('ckf-orcamentos-v1')
  try {
    const o = await saveOrcamento({ ...draft, status: 'rascunho' }, profile)
    const all = read()
    const latest = all.find((t) => t.id === id)!
    if (!latest) throw new Error('Solicitação não encontrada.')
    write(
      all.map((t) =>
        t.id === id
          ? {
              ...t,
              converted_cliente_id: cliente.id,
              converted_orcamento_id: o.id,
              status: 'budget_created',
              versao: t.versao + 1,
              updated_at: new Date().toISOString(),
              site_ticket_events: [
                ...t.site_ticket_events,
                {
                  id: crypto.randomUUID(),
                  actor_name: profile.nome,
                  created_at: new Date().toISOString(),
                  details: { status: 'budget_created', orcamento_id: o.id },
                },
              ],
            }
          : t,
      ),
    )
    return o
  } catch (e) {
    if (oldBudgets === null) localStorage.removeItem('ckf-orcamentos-v1')
    else localStorage.setItem('ckf-orcamentos-v1', oldBudgets)
    throw e
  }
}
