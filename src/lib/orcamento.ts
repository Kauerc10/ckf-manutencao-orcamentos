import { DOCUMENT_ITEM_ROW_COUNT } from './constants'
import type { Orcamento, OrcamentoDraft, OrcamentoItem } from '../types'

export type ItemCalculationInput = Pick<OrcamentoItem, 'quantidade' | 'valorUnitario' | 'valorTotal'>

export type ItemSyncPlanItem = {
  ordem: number
  quantidade: number | null
  descricao: string
  valorUnitario: number | null
  valorTotal: number
}

export type ItemSyncPlan = {
  updates: Array<ItemSyncPlanItem & { id: string }>
  inserts: ItemSyncPlanItem[]
  deleteIds: string[]
}

export function toMoneyNumber(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateItemTotal(item: ItemCalculationInput): number {
  const hasQuantidade = typeof item.quantidade === 'number' && !Number.isNaN(item.quantidade)
  const hasValorUnitario = typeof item.valorUnitario === 'number' && !Number.isNaN(item.valorUnitario)

  if (hasQuantidade && hasValorUnitario) {
    return toMoneyNumber((item.quantidade ?? 0) * (item.valorUnitario ?? 0))
  }

  if (!hasQuantidade && !hasValorUnitario) {
    return toMoneyNumber(item.valorTotal || 0)
  }

  return 0
}

export function calculateGeneralTotal(items: ItemCalculationInput[]): number {
  return toMoneyNumber(items.reduce((sum, item) => sum + calculateItemTotal(item), 0))
}

export function normalizeItems(items: OrcamentoItem[]): OrcamentoItem[] {
  return items
    .map((item) => ({
      ...item,
      descricao: item.descricao.trim(),
      valorTotal: calculateItemTotal(item),
    }))
    .filter((item) => item.descricao || item.quantidade || item.valorUnitario || item.valorTotal)
}

export function createItemSyncPlan(existingItemIds: string[], items: OrcamentoItem[]): ItemSyncPlan {
  const existingIds = new Set(existingItemIds)
  const keptIds = new Set<string>()
  const updates: ItemSyncPlan['updates'] = []
  const inserts: ItemSyncPlan['inserts'] = []

  normalizeItems(items).forEach((item, index) => {
    const plannedItem: ItemSyncPlanItem = {
      ordem: index + 1,
      quantidade: item.quantidade,
      descricao: item.descricao,
      valorUnitario: item.valorUnitario,
      valorTotal: item.valorTotal,
    }

    if (item.id && existingIds.has(item.id)) {
      keptIds.add(item.id)
      updates.push({ id: item.id, ...plannedItem })
      return
    }

    inserts.push(plannedItem)
  })

  return {
    updates,
    inserts,
    deleteIds: existingItemIds.filter((id) => !keptIds.has(id)),
  }
}

export function normalizeItemsForDocument(items: OrcamentoItem[]): OrcamentoItem[] {
  const normalized = normalizeItems(items).slice(0, DOCUMENT_ITEM_ROW_COUNT)
  const emptyRows = Array.from({ length: Math.max(0, DOCUMENT_ITEM_ROW_COUNT - normalized.length) }, (_, index) => ({
    id: `empty-${index}`,
    quantidade: null,
    descricao: '',
    valorUnitario: null,
    valorTotal: 0,
  }))

  return [...normalized, ...emptyRows]
}

export function createEmptyItem(index: number): OrcamentoItem {
  return {
    id: `draft-${index}`,
    quantidade: null,
    descricao: '',
    valorUnitario: null,
    valorTotal: 0,
  }
}

export function createDuplicateDraft(orcamento: Orcamento): OrcamentoDraft {
  const itens = orcamento.itens.map(({ quantidade, descricao, valorUnitario, valorTotal }) => ({
    quantidade,
    descricao,
    valorUnitario,
    valorTotal,
  }))

  return {
    dataOrcamento: orcamento.dataOrcamento,
    servicoCliente: orcamento.servicoCliente,
    status: 'rascunho',
    observacoes: orcamento.observacoes,
    validadeDias: orcamento.validadeDias,
    total: calculateGeneralTotal(itens),
    itens,
  }
}

export function createInitialItems(count: number): OrcamentoItem[] {
  return Array.from({ length: count }, (_, index) => createEmptyItem(index))
}
