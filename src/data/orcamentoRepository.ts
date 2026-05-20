import { DEMO_ORCAMENTOS, DEMO_PROFILE } from '../lib/demo-data'
import { DEFAULT_VALIDADE_DIAS } from '../lib/constants'
import { calculateGeneralTotal, createItemSyncPlan, normalizeItems } from '../lib/orcamento'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Orcamento, OrcamentoDraft, OrcamentoFilters, OrcamentoItem, Profile } from '../types'

const STORAGE_KEY = 'ckf-orcamentos-v1'

type SaveInput = OrcamentoDraft & {
  id?: string
}

type DeleteInput = {
  id: string
  motivo: string
  adminIdentifier: string
  adminPassword: string
}

type SupabaseOrcamentoRow = {
  id: string
  numero: number
  data_orcamento: string
  servico_cliente: string
  cliente_id: string | null
  representante_id: string | null
  status: Orcamento['status']
  observacoes: string
  validade_dias: number
  total: number
  criado_por: string
  criado_em: string
  atualizado_em: string
  excluido_em?: string | null
  excluido_por?: string | null
  exclusao_solicitada_por?: string | null
  excluido_motivo?: string | null
  profiles?: { nome: string; email: string } | null
  clientes?: { nome: string; documento: string } | null
  cliente_representantes?: { nome: string } | null
  excluido_por_profile?: { nome: string; email: string } | null
  exclusao_solicitada_por_profile?: { nome: string; email: string } | null
  orcamento_itens?: Array<{
    id: string
    quantidade: number | null
    descricao: string
    valor_unitario: number | null
    valor_total: number
    ordem: number
  }>
}

function readLocal(): Orcamento[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_ORCAMENTOS))
    return DEMO_ORCAMENTOS
  }

  try {
    return JSON.parse(raw) as Orcamento[]
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_ORCAMENTOS))
    return DEMO_ORCAMENTOS
  }
}

function writeLocal(orcamentos: Orcamento[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orcamentos))
}

function nextLocalNumero(orcamentos: Orcamento[]): number {
  return Math.max(0, ...orcamentos.map((orcamento) => orcamento.numero)) + 1
}

function mapSupabaseOrcamento(row: SupabaseOrcamentoRow): Orcamento {
  return {
    id: row.id,
    numero: row.numero,
    dataOrcamento: row.data_orcamento,
    servicoCliente: row.servico_cliente,
    clienteId: row.cliente_id,
    clienteNome: row.clientes?.nome ?? null,
    clienteDocumento: row.clientes?.documento ?? null,
    representanteId: row.representante_id,
    representanteNome: row.cliente_representantes?.nome ?? null,
    status: row.status,
    observacoes: row.observacoes ?? '',
    validadeDias: row.validade_dias ?? DEFAULT_VALIDADE_DIAS,
    total: Number(row.total ?? 0),
    criadoPor: row.criado_por,
    criadoPorNome: row.profiles?.nome ?? row.profiles?.email ?? 'Usuario',
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    excluidoEm: row.excluido_em ?? null,
    excluidoPor: row.excluido_por ?? null,
    excluidoPorNome: row.excluido_por_profile?.nome ?? row.excluido_por_profile?.email ?? null,
    exclusaoSolicitadaPor: row.exclusao_solicitada_por ?? null,
    exclusaoSolicitadaPorNome:
      row.exclusao_solicitada_por_profile?.nome ?? row.exclusao_solicitada_por_profile?.email ?? null,
    excluidoMotivo: row.excluido_motivo ?? null,
    itens: [...(row.orcamento_itens ?? [])]
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => ({
        id: item.id,
        quantidade: item.quantidade === null ? null : Number(item.quantidade),
        descricao: item.descricao,
        valorUnitario: item.valor_unitario === null ? null : Number(item.valor_unitario),
        valorTotal: Number(item.valor_total),
      })),
  }
}

export function applyOrcamentoFilters(orcamentos: Orcamento[], filters: OrcamentoFilters): Orcamento[] {
  const search = filters.search.trim().toLowerCase()
  return orcamentos.filter((orcamento) => {
    const matchesSearch =
      !search ||
      String(orcamento.numero).includes(search) ||
      orcamento.servicoCliente.toLowerCase().includes(search) ||
      (orcamento.clienteNome?.toLowerCase().includes(search) ?? false) ||
      (orcamento.clienteDocumento?.toLowerCase().includes(search) ?? false) ||
      (orcamento.representanteNome?.toLowerCase().includes(search) ?? false)
    const matchesStatus = filters.status === 'todos' || orcamento.status === filters.status
    const matchesStart = !filters.dataInicial || orcamento.dataOrcamento >= filters.dataInicial
    const matchesEnd = !filters.dataFinal || orcamento.dataOrcamento <= filters.dataFinal
    const matchesCreator = !filters.criadoPor || orcamento.criadoPor === filters.criadoPor
    const matchesCliente = !filters.clienteId || orcamento.clienteId === filters.clienteId

    return matchesSearch && matchesStatus && matchesStart && matchesEnd && matchesCreator && matchesCliente
  })
}

export async function listOrcamentos(): Promise<Orcamento[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('orcamentos')
      .select(
        '*, profiles:profiles!orcamentos_criado_por_fkey(nome,email), clientes:cliente_id(nome,documento), cliente_representantes:representante_id(nome), excluido_por_profile:profiles!orcamentos_excluido_por_fkey(nome,email), exclusao_solicitada_por_profile:profiles!orcamentos_exclusao_solicitada_por_fkey(nome,email), orcamento_itens(*)',
      )
      .order('numero', { ascending: false })

    if (error) throw error
    return ((data ?? []) as unknown as SupabaseOrcamentoRow[]).map(mapSupabaseOrcamento)
  }

  return readLocal().sort((a, b) => b.numero - a.numero)
}

export async function getOrcamento(id: string): Promise<Orcamento | null> {
  const all = await listOrcamentos()
  return all.find((orcamento) => orcamento.id === id) ?? null
}

function toPersistableItems(items: OrcamentoItem[]): OrcamentoItem[] {
  return normalizeItems(items).map((item, index) => ({
    ...item,
    id: item.id ?? `item-${index}`,
  }))
}

function normalizeDeletionReason(motivo: string): string {
  return motivo.trim().replace(/\s+/g, ' ')
}

function assertDeleteInput(input: DeleteInput): string {
  const motivo = normalizeDeletionReason(input.motivo)
  if (!motivo) {
    throw new Error('Informe o motivo da exclusao.')
  }

  if (!input.adminIdentifier.trim() || !input.adminPassword.trim()) {
    throw new Error('Informe as credenciais de administrador.')
  }

  return motivo
}

function identifierMatchesProfile(identifier: string, profile: Profile): boolean {
  const normalized = identifier.trim().toLowerCase()
  return [
    profile.email,
    profile.nome,
    profile.nome.split(/\s+/)[0],
    'admin',
  ]
    .filter(Boolean)
    .map((value) => value.toLowerCase())
    .includes(normalized)
}

function approveLocalDeletion(input: DeleteInput): Profile {
  if (!identifierMatchesProfile(input.adminIdentifier, DEMO_PROFILE) || input.adminPassword !== 'demo-local') {
    throw new Error('Credenciais de administrador invalidas.')
  }

  return DEMO_PROFILE
}

async function readFunctionErrorMessage(error: unknown): Promise<string> {
  const maybeContext = error && typeof error === 'object' && 'context' in error ? error.context : null
  if (maybeContext instanceof Response) {
    const body = await maybeContext
      .clone()
      .json()
      .catch(() => null)
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      return body.error
    }
  }

  return error instanceof Error ? error.message : 'Nao foi possivel excluir o orcamento.'
}

function assertEditable(orcamento: Orcamento): void {
  if (orcamento.status === 'excluido') {
    throw new Error('Orcamentos excluidos nao podem ser editados.')
  }
}

function toItemRow(item: {
  ordem: number
  quantidade: number | null
  descricao: string
  valorUnitario: number | null
  valorTotal: number
}) {
  return {
    ordem: item.ordem,
    quantidade: item.quantidade,
    descricao: item.descricao,
    valor_unitario: item.valorUnitario,
    valor_total: item.valorTotal,
  }
}

export async function saveOrcamento(input: SaveInput, profile: Profile): Promise<Orcamento> {
  const itens = toPersistableItems(input.itens)
  const total = calculateGeneralTotal(itens)

  if (isSupabaseConfigured && supabase) {
    if (input.id) {
      const existing = await getOrcamento(input.id)
      if (!existing) throw new Error('Orcamento nao encontrado.')
      assertEditable(existing)

      const { error } = await supabase
        .from('orcamentos')
        .update({
          data_orcamento: input.dataOrcamento,
          servico_cliente: input.servicoCliente,
          cliente_id: input.clienteId || null,
          representante_id: input.representanteId || null,
          status: input.status,
          observacoes: input.observacoes,
          validade_dias: input.validadeDias,
          total,
        })
        .eq('id', input.id)

      if (error) throw error

      const itemPlan = createItemSyncPlan(
        existing.itens.map((item) => item.id).filter((id): id is string => Boolean(id)),
        itens,
      )

      if (itemPlan.deleteIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('orcamento_itens')
          .delete()
          .eq('orcamento_id', input.id)
          .in('id', itemPlan.deleteIds)
        if (deleteError) throw deleteError
      }

      for (const item of itemPlan.updates) {
        const { error: updateItemError } = await supabase
          .from('orcamento_itens')
          .update(toItemRow(item))
          .eq('orcamento_id', input.id)
          .eq('id', item.id)

        if (updateItemError) throw updateItemError
      }

      if (itemPlan.inserts.length > 0) {
        const { error: insertItemsError } = await supabase.from('orcamento_itens').insert(
          itemPlan.inserts.map((item) => ({
            orcamento_id: input.id as string,
            ...toItemRow(item),
          })),
        )
        if (insertItemsError) throw insertItemsError
      }

      const updated = await getOrcamento(input.id)
      if (!updated) throw new Error('Orcamento atualizado nao encontrado.')
      return updated
    }

    const { data, error } = await supabase
      .from('orcamentos')
      .insert({
        data_orcamento: input.dataOrcamento,
        servico_cliente: input.servicoCliente,
        cliente_id: input.clienteId || null,
        representante_id: input.representanteId || null,
        status: input.status,
        observacoes: input.observacoes,
        validade_dias: input.validadeDias,
        total,
      })
      .select('id')
      .single()

    if (error) throw error

    const { error: insertItemsError } = await supabase.from('orcamento_itens').insert(
      itens.map((item, index) => ({
        orcamento_id: data.id,
        ordem: index + 1,
        quantidade: item.quantidade,
        descricao: item.descricao,
        valor_unitario: item.valorUnitario,
        valor_total: item.valorTotal,
      })),
    )
    if (insertItemsError) throw insertItemsError

    const created = await getOrcamento(data.id)
    if (!created) throw new Error('Orcamento criado nao encontrado.')
    return created
  }

  const now = new Date().toISOString()
  const all = readLocal()

  if (input.id) {
    const existing = all.find((orcamento) => orcamento.id === input.id)
    if (!existing) throw new Error('Orcamento nao encontrado.')
    assertEditable(existing)

    const updated: Orcamento = {
      ...existing,
      dataOrcamento: input.dataOrcamento,
      servicoCliente: input.servicoCliente,
      clienteId: input.clienteId ?? null,
      clienteNome: input.clienteNome ?? existing.clienteNome ?? null,
      clienteDocumento: input.clienteDocumento ?? existing.clienteDocumento ?? null,
      representanteId: input.representanteId ?? null,
      representanteNome: input.representanteNome ?? null,
      status: input.status,
      observacoes: input.observacoes,
      validadeDias: input.validadeDias,
      total,
      atualizadoEm: now,
      itens,
    }
    writeLocal(all.map((orcamento) => (orcamento.id === input.id ? updated : orcamento)))
    return updated
  }

  const created: Orcamento = {
    id: crypto.randomUUID(),
    numero: nextLocalNumero(all),
    dataOrcamento: input.dataOrcamento,
    servicoCliente: input.servicoCliente,
    clienteId: input.clienteId ?? null,
    clienteNome: input.clienteNome ?? null,
    clienteDocumento: input.clienteDocumento ?? null,
    representanteId: input.representanteId ?? null,
    representanteNome: input.representanteNome ?? null,
    status: input.status,
    observacoes: input.observacoes,
    validadeDias: input.validadeDias,
    total,
    criadoPor: profile.id,
    criadoPorNome: profile.nome,
    criadoEm: now,
    atualizadoEm: now,
    excluidoEm: null,
    excluidoPor: null,
    excluidoPorNome: null,
    exclusaoSolicitadaPor: null,
    exclusaoSolicitadaPorNome: null,
    excluidoMotivo: null,
    itens,
  }

  writeLocal([created, ...all])
  return created
}

export async function deleteOrcamento(input: DeleteInput, profile: Profile): Promise<Orcamento> {
  const motivo = assertDeleteInput(input)

  if (isSupabaseConfigured && supabase) {
    const existing = await getOrcamento(input.id)
    if (!existing) throw new Error('Orcamento nao encontrado.')
    assertEditable(existing)

    const { error } = await supabase.functions.invoke('admin-delete-orcamento', {
      body: {
        orcamentoId: input.id,
        motivo,
        adminIdentifier: input.adminIdentifier,
        adminPassword: input.adminPassword,
      },
    })

    if (error) {
      throw new Error(await readFunctionErrorMessage(error))
    }

    const deleted = await getOrcamento(input.id)
    if (!deleted) throw new Error('Orcamento excluido nao encontrado.')
    return deleted
  }

  const approver = approveLocalDeletion(input)
  const now = new Date().toISOString()
  const all = readLocal()
  const existing = all.find((orcamento) => orcamento.id === input.id)
  if (!existing) throw new Error('Orcamento nao encontrado.')
  assertEditable(existing)

  const deleted: Orcamento = {
    ...existing,
    status: 'excluido',
    atualizadoEm: now,
    excluidoEm: now,
    excluidoPor: approver.id,
    excluidoPorNome: approver.nome,
    exclusaoSolicitadaPor: profile.id,
    exclusaoSolicitadaPorNome: profile.nome,
    excluidoMotivo: motivo,
  }

  writeLocal(all.map((orcamento) => (orcamento.id === input.id ? deleted : orcamento)))
  return deleted
}
