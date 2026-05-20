import { DEMO_CLIENTES } from '../lib/demo-data'
import { applyClienteFilters, formatClienteDocumento, normalizeDocumento } from '../lib/clientes'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { ActivityLog, Cliente, ClienteDraft, ClienteFilters, ClienteRepresentante, Profile } from '../types'

const CLIENTES_STORAGE_KEY = 'ckf-clientes-v1'
const ACTIVITY_STORAGE_KEY = 'ckf-activity-logs-v1'

type SaveClienteInput = ClienteDraft & {
  id?: string
}

type SupabaseRepresentanteRow = {
  id: string
  cliente_id: string
  nome: string
  cargo: string
  telefone: string
  email: string
  observacao: string
  principal: boolean
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

type SupabaseClienteRow = {
  id: string
  tipo: Cliente['tipo']
  nome: string
  documento: string
  rg: string
  nome_fantasia: string
  email: string
  telefone_principal: string
  telefone_alternativo: string
  inscricao_estadual: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  referencia_acesso: string
  observacoes: string
  tags: string[]
  ativo: boolean
  criado_por: string
  atualizado_por: string | null
  criado_em: string
  atualizado_em: string
  profiles?: { nome: string; email: string } | null
  cliente_representantes?: SupabaseRepresentanteRow[]
}

type SupabaseActivityRow = {
  id: string
  entity_type: ActivityLog['entityType']
  entity_id: string
  action: string
  actor_id: string | null
  details: Record<string, unknown>
  criado_em: string
  profiles?: { nome: string; email: string } | null
}

export const DEFAULT_CLIENTE_FILTERS: ClienteFilters = {
  search: '',
  tipo: 'todos',
  status: 'ativos',
  cidadeUf: '',
}

function readClientesLocal(): Cliente[] {
  const raw = localStorage.getItem(CLIENTES_STORAGE_KEY)
  if (!raw) {
    localStorage.setItem(CLIENTES_STORAGE_KEY, JSON.stringify(DEMO_CLIENTES))
    return DEMO_CLIENTES
  }

  try {
    return (JSON.parse(raw) as Cliente[]).map((cliente) => ({
      ...cliente,
      rg: cliente.rg ?? '',
    }))
  } catch {
    localStorage.setItem(CLIENTES_STORAGE_KEY, JSON.stringify(DEMO_CLIENTES))
    return DEMO_CLIENTES
  }
}

function writeClientesLocal(clientes: Cliente[]): void {
  localStorage.setItem(CLIENTES_STORAGE_KEY, JSON.stringify(clientes))
}

function readActivityLocal(): ActivityLog[] {
  const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY)
  if (!raw) return []

  try {
    return JSON.parse(raw) as ActivityLog[]
  } catch {
    return []
  }
}

function appendActivityLocal(log: Omit<ActivityLog, 'id' | 'criadoEm'>): void {
  const next: ActivityLog = {
    ...log,
    id: crypto.randomUUID(),
    criadoEm: new Date().toISOString(),
  }
  localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify([next, ...readActivityLocal()]))
}

function mapActivityLog(row: SupabaseActivityRow): ActivityLog {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    actorId: row.actor_id,
    actorName: row.profiles?.nome ?? row.profiles?.email ?? null,
    details: row.details ?? {},
    criadoEm: row.criado_em,
  }
}

function mapRepresentante(row: SupabaseRepresentanteRow): ClienteRepresentante {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    nome: row.nome,
    cargo: row.cargo,
    telefone: row.telefone,
    email: row.email ?? '',
    observacao: row.observacao ?? '',
    principal: row.principal,
    ativo: row.ativo,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  }
}

function mapCliente(row: SupabaseClienteRow): Cliente {
  return {
    id: row.id,
    tipo: row.tipo,
    nome: row.nome,
    documento: normalizeDocumento(row.documento),
    rg: row.rg ?? '',
    nomeFantasia: row.nome_fantasia ?? '',
    email: row.email ?? '',
    telefonePrincipal: row.telefone_principal,
    telefoneAlternativo: row.telefone_alternativo ?? '',
    inscricaoEstadual: row.inscricao_estadual ?? '',
    cep: row.cep,
    logradouro: row.logradouro,
    numero: row.numero,
    complemento: row.complemento ?? '',
    bairro: row.bairro,
    cidade: row.cidade,
    uf: row.uf,
    referenciaAcesso: row.referencia_acesso ?? '',
    observacoes: row.observacoes ?? '',
    tags: row.tags ?? [],
    ativo: row.ativo,
    criadoPor: row.criado_por,
    criadoPorNome: row.profiles?.nome ?? row.profiles?.email ?? 'Usuario',
    atualizadoPor: row.atualizado_por,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    representantes: [...(row.cliente_representantes ?? [])].sort((a, b) => Number(b.principal) - Number(a.principal)).map(mapRepresentante),
  }
}

function toClientePayload(input: ClienteDraft) {
  return {
    tipo: input.tipo,
    nome: input.nome.trim(),
    documento: normalizeDocumento(input.documento),
    rg: input.rg.trim(),
    nome_fantasia: input.nomeFantasia.trim(),
    email: input.email.trim(),
    telefone_principal: input.telefonePrincipal.trim(),
    telefone_alternativo: input.telefoneAlternativo.trim(),
    inscricao_estadual: input.inscricaoEstadual.trim(),
    cep: input.cep.trim(),
    logradouro: input.logradouro.trim(),
    numero: input.numero.trim(),
    complemento: input.complemento.trim(),
    bairro: input.bairro.trim(),
    cidade: input.cidade.trim(),
    uf: input.uf.trim().toUpperCase(),
    referencia_acesso: input.referenciaAcesso.trim(),
    observacoes: input.observacoes.trim(),
    tags: input.tags,
    ativo: input.ativo,
  }
}

function toRepresentantePayload(clienteId: string, representante: ClienteRepresentante) {
  return {
    cliente_id: clienteId,
    nome: representante.nome.trim(),
    cargo: representante.cargo.trim(),
    telefone: representante.telefone.trim(),
    email: representante.email.trim(),
    observacao: representante.observacao.trim(),
    principal: representante.principal,
    ativo: representante.ativo,
  }
}

async function syncRepresentantes(clienteId: string, representantes: ClienteRepresentante[]): Promise<void> {
  if (!supabase) return

  const { data: existing, error: existingError } = await supabase
    .from('cliente_representantes')
    .select('id')
    .eq('cliente_id', clienteId)

  if (existingError) throw existingError

  const activeIds = new Set<string>()

  for (const representante of representantes) {
    if (representante.id) {
      activeIds.add(representante.id)
      const { error } = await supabase
        .from('cliente_representantes')
        .update(toRepresentantePayload(clienteId, representante))
        .eq('id', representante.id)
        .eq('cliente_id', clienteId)
      if (error) throw error
    } else {
      const { data, error } = await supabase
        .from('cliente_representantes')
        .insert(toRepresentantePayload(clienteId, representante))
        .select('id')
        .single()
      if (error) throw error
      activeIds.add(data.id)
    }
  }

  const idsToArchive = ((existing ?? []) as Array<{ id: string }>).map((row) => row.id).filter((id) => !activeIds.has(id))
  if (idsToArchive.length) {
    const { error } = await supabase.from('cliente_representantes').update({ ativo: false }).in('id', idsToArchive)
    if (error) throw error
  }
}

export async function listClientes(): Promise<Cliente[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('clientes')
      .select('*, profiles:criado_por(nome,email), cliente_representantes(*)')
      .order('nome', { ascending: true })

    if (error) throw error
    return ((data ?? []) as unknown as SupabaseClienteRow[]).map(mapCliente)
  }

  return readClientesLocal().sort((a, b) => a.nome.localeCompare(b.nome))
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const all = await listClientes()
  return all.find((cliente) => cliente.id === id) ?? null
}

export async function saveCliente(input: SaveClienteInput, profile: Profile): Promise<Cliente> {
  const now = new Date().toISOString()
  const representantes = input.tipo === 'cnpj' ? input.representantes : []

  if (isSupabaseConfigured && supabase) {
    if (input.id) {
      const { error } = await supabase
        .from('clientes')
        .update({
          ...toClientePayload({ ...input, representantes }),
          atualizado_por: profile.id,
        })
        .eq('id', input.id)

      if (error) throw error
      await syncRepresentantes(input.id, representantes)

      const updated = await getCliente(input.id)
      if (!updated) throw new Error('Cliente atualizado nao encontrado.')
      return updated
    }

    const { data, error } = await supabase
      .from('clientes')
      .insert({ ...toClientePayload({ ...input, representantes }), criado_por: profile.id })
      .select('id')
      .single()

    if (error) throw error
    await syncRepresentantes(data.id, representantes)

    const created = await getCliente(data.id)
    if (!created) throw new Error('Cliente criado nao encontrado.')
    return created
  }

  const all = readClientesLocal()

  if (input.id) {
    const existing = all.find((cliente) => cliente.id === input.id)
    if (!existing) throw new Error('Cliente nao encontrado.')

    const updated: Cliente = {
      ...existing,
      ...input,
      documento: normalizeDocumento(input.documento),
      representantes,
      atualizadoPor: profile.id,
      atualizadoEm: now,
    }

    writeClientesLocal(all.map((cliente) => (cliente.id === input.id ? updated : cliente)))
    appendActivityLocal({
      entityType: 'cliente',
      entityId: input.id,
      action: input.ativo ? 'update' : 'archive',
      actorId: profile.id,
      actorName: profile.nome,
      details: { nome: input.nome, documento: formatClienteDocumento(input.documento) },
    })
    return updated
  }

  const id = crypto.randomUUID()
  const created: Cliente = {
    ...input,
    id,
    documento: normalizeDocumento(input.documento),
    representantes: representantes.map((representante) => ({
      ...representante,
      id: representante.id ?? crypto.randomUUID(),
      clienteId: id,
      criadoEm: now,
      atualizadoEm: now,
    })),
    criadoPor: profile.id,
    criadoPorNome: profile.nome,
    atualizadoPor: profile.id,
    criadoEm: now,
    atualizadoEm: now,
  }

  writeClientesLocal([created, ...all])
  appendActivityLocal({
    entityType: 'cliente',
    entityId: created.id,
    action: 'create',
    actorId: profile.id,
    actorName: profile.nome,
    details: { nome: created.nome, documento: formatClienteDocumento(created.documento) },
  })
  return created
}

export async function archiveCliente(id: string, profile: Profile): Promise<void> {
  const cliente = await getCliente(id)
  if (!cliente) throw new Error('Cliente nao encontrado.')
  await saveCliente({ ...cliente, ativo: false }, profile)
}

export async function listClienteActivity(clienteId: string): Promise<ActivityLog[]> {
  if (isSupabaseConfigured && supabase) {
    const baseSelect = '*, profiles:actor_id(nome,email)'
    const [entityResult, detailsResult] = await Promise.all([
      supabase
        .from('activity_logs')
        .select(baseSelect)
        .eq('entity_id', clienteId)
        .order('criado_em', { ascending: false })
        .limit(30),
      supabase
        .from('activity_logs')
        .select(baseSelect)
        .filter('details->>cliente_id', 'eq', clienteId)
        .order('criado_em', { ascending: false })
        .limit(30),
    ])

    if (entityResult.error) throw entityResult.error
    if (detailsResult.error) throw detailsResult.error

    const byId = new Map<string, ActivityLog>()
    ;[...((entityResult.data ?? []) as unknown as SupabaseActivityRow[]), ...((detailsResult.data ?? []) as unknown as SupabaseActivityRow[])]
      .map(mapActivityLog)
      .forEach((log) => byId.set(log.id, log))

    return [...byId.values()]
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .slice(0, 30)
  }

  return readActivityLocal().filter((log) => log.entityId === clienteId || log.details.cliente_id === clienteId)
}

export { applyClienteFilters }
