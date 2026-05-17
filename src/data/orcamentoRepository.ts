import { DEMO_ORCAMENTOS } from '../lib/demo-data'
import { DEFAULT_VALIDADE_DIAS } from '../lib/constants'
import { calculateGeneralTotal, normalizeItems } from '../lib/orcamento'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Orcamento, OrcamentoDraft, OrcamentoFilters, OrcamentoItem, Profile } from '../types'

const STORAGE_KEY = 'ckf-orcamentos-v1'

type SaveInput = OrcamentoDraft & {
  id?: string
}

type SupabaseOrcamentoRow = {
  id: string
  numero: number
  data_orcamento: string
  servico_cliente: string
  status: Orcamento['status']
  observacoes: string
  validade_dias: number
  total: number
  criado_por: string
  criado_em: string
  atualizado_em: string
  profiles?: { nome: string; email: string } | null
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
  return Math.max(284, ...orcamentos.map((orcamento) => orcamento.numero)) + 1
}

function mapSupabaseOrcamento(row: SupabaseOrcamentoRow): Orcamento {
  return {
    id: row.id,
    numero: row.numero,
    dataOrcamento: row.data_orcamento,
    servicoCliente: row.servico_cliente,
    status: row.status,
    observacoes: row.observacoes ?? '',
    validadeDias: row.validade_dias ?? DEFAULT_VALIDADE_DIAS,
    total: Number(row.total ?? 0),
    criadoPor: row.criado_por,
    criadoPorNome: row.profiles?.nome ?? row.profiles?.email ?? 'Usuário',
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
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
      orcamento.servicoCliente.toLowerCase().includes(search)
    const matchesStatus = filters.status === 'todos' || orcamento.status === filters.status
    const matchesStart = !filters.dataInicial || orcamento.dataOrcamento >= filters.dataInicial
    const matchesEnd = !filters.dataFinal || orcamento.dataOrcamento <= filters.dataFinal
    const matchesCreator = !filters.criadoPor || orcamento.criadoPor === filters.criadoPor

    return matchesSearch && matchesStatus && matchesStart && matchesEnd && matchesCreator
  })
}

export async function listOrcamentos(): Promise<Orcamento[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('orcamentos')
      .select('*, profiles:criado_por(nome,email), orcamento_itens(*)')
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

export async function saveOrcamento(input: SaveInput, profile: Profile): Promise<Orcamento> {
  const itens = toPersistableItems(input.itens)
  const total = calculateGeneralTotal(itens)

  if (isSupabaseConfigured && supabase) {
    if (input.id) {
      const { error } = await supabase
        .from('orcamentos')
        .update({
          data_orcamento: input.dataOrcamento,
          servico_cliente: input.servicoCliente,
          status: input.status,
          observacoes: input.observacoes,
          validade_dias: input.validadeDias,
          total,
        })
        .eq('id', input.id)

      if (error) throw error

      const { error: deleteError } = await supabase.from('orcamento_itens').delete().eq('orcamento_id', input.id)
      if (deleteError) throw deleteError

      const { error: insertItemsError } = await supabase.from('orcamento_itens').insert(
        itens.map((item, index) => ({
          orcamento_id: input.id as string,
          ordem: index + 1,
          quantidade: item.quantidade,
          descricao: item.descricao,
          valor_unitario: item.valorUnitario,
          valor_total: item.valorTotal,
        })),
      )
      if (insertItemsError) throw insertItemsError

      const updated = await getOrcamento(input.id)
      if (!updated) throw new Error('Orçamento atualizado não encontrado.')
      return updated
    }

    const { data, error } = await supabase
      .from('orcamentos')
      .insert({
        data_orcamento: input.dataOrcamento,
        servico_cliente: input.servicoCliente,
        status: input.status,
        observacoes: input.observacoes,
        validade_dias: input.validadeDias,
        total,
        criado_por: profile.id,
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
    if (!created) throw new Error('Orçamento criado não encontrado.')
    return created
  }

  const now = new Date().toISOString()
  const all = readLocal()

  if (input.id) {
    const existing = all.find((orcamento) => orcamento.id === input.id)
    if (!existing) throw new Error('Orçamento não encontrado.')

    const updated: Orcamento = {
      ...existing,
      dataOrcamento: input.dataOrcamento,
      servicoCliente: input.servicoCliente,
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
    status: input.status,
    observacoes: input.observacoes,
    validadeDias: input.validadeDias,
    total,
    criadoPor: profile.id,
    criadoPorNome: profile.nome,
    criadoEm: now,
    atualizadoEm: now,
    itens,
  }

  writeLocal([created, ...all])
  return created
}

export async function deleteOrcamento(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('orcamentos').delete().eq('id', id)
    if (error) throw error
    return
  }

  writeLocal(readLocal().filter((orcamento) => orcamento.id !== id))
}
