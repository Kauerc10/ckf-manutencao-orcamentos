import { describe, expect, it } from 'vitest'
import {
  calculateGeneralTotal,
  calculateItemTotal,
  createDuplicateDraft,
  normalizeItemsForDocument,
} from './orcamento'
import { DOCUMENT_ITEM_ROW_COUNT } from './constants'

describe('orcamento business rules', () => {
  it('calculates item total from quantity and unit value when both are present', () => {
    expect(calculateItemTotal({ quantidade: 3, valorUnitario: 125, valorTotal: 10 })).toBe(375)
  })

  it('keeps manual total when quantity and unit value are empty', () => {
    expect(calculateItemTotal({ quantidade: null, valorUnitario: null, valorTotal: 840 })).toBe(840)
  })

  it('sums general total from normalized item totals', () => {
    const total = calculateGeneralTotal([
      { quantidade: 2, valorUnitario: 250, valorTotal: 0 },
      { quantidade: null, valorUnitario: null, valorTotal: 120.5 },
      { quantidade: null, valorUnitario: 12, valorTotal: 999 },
    ])

    expect(total).toBe(620.5)
  })

  it('pads document rows to match the visual model row count', () => {
    const rows = normalizeItemsForDocument([
      { id: '1', quantidade: 2, descricao: 'Servico mecanico', valorUnitario: 250, valorTotal: 500 },
    ])

    expect(rows).toHaveLength(DOCUMENT_ITEM_ROW_COUNT)
    expect(rows[0]?.descricao).toBe('Servico mecanico')
    expect(rows.at(-1)?.descricao).toBe('')
  })

  it('duplicates a quotation as a new draft without identity, number or final status', () => {
    const duplicate = createDuplicateDraft({
      id: 'old-id',
      numero: 285,
      dataOrcamento: '2026-05-16',
      servicoCliente: 'Filial Sao Jose',
      clienteId: 'cliente-1',
      clienteNome: 'Filial Sao Jose',
      clienteDocumento: '57.461.028/0001-43',
      representanteId: 'rep-1',
      representanteNome: 'Ana Gestora',
      status: 'aprovado',
      observacoes: 'Manter observacao',
      validadeDias: 10,
      total: 500,
      criadoPor: 'user-1',
      criadoPorNome: 'Kauerc',
      criadoEm: '2026-05-16T12:00:00Z',
      atualizadoEm: '2026-05-16T12:30:00Z',
      itens: [{ id: 'i1', quantidade: 2, descricao: 'Parafusos', valorUnitario: 250, valorTotal: 500 }],
    })

    expect(duplicate).toMatchObject({
      status: 'rascunho',
      servicoCliente: 'Filial Sao Jose',
      clienteId: 'cliente-1',
      representanteId: 'rep-1',
      observacoes: 'Manter observacao',
      validadeDias: 10,
    })
    expect(duplicate).not.toHaveProperty('id')
    expect(duplicate).not.toHaveProperty('numero')
    expect(duplicate.itens[0]).not.toHaveProperty('id')
  })
})
