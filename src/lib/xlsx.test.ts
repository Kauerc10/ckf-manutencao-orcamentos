import { describe, expect, it } from 'vitest'
import { DOCUMENT_ITEM_ROW_COUNT, EMPRESA } from './constants'
import { createOrcamentoWorkbook } from './xlsx'

describe('xlsx export', () => {
  it('creates a workbook with official company data and visual model rows', async () => {
    const workbook = await createOrcamentoWorkbook({
      id: 'orc-1',
      numero: 285,
      dataOrcamento: '2026-05-16',
      servicoCliente: 'Filial Sao Jose',
      status: 'enviado',
      observacoes: 'Acesso pela lateral',
      validadeDias: 10,
      total: 500,
      criadoPor: 'user-1',
      criadoPorNome: 'Kauerc',
      criadoEm: '2026-05-16T12:00:00Z',
      atualizadoEm: '2026-05-16T12:00:00Z',
      itens: [{ id: 'i1', quantidade: 2, descricao: 'Trocar parafusos quebrados', valorUnitario: 250, valorTotal: 500 }],
    })

    const sheet = workbook.getWorksheet('Orcamento')
    expect(sheet?.getCell('A5').value).toBe(`CNPJ: ${EMPRESA.cnpj}`)
    expect(sheet?.getCell('D9').value).toBe(285)
    expect(sheet?.getCell('B10').value).toBe('Filial Sao Jose')
    expect(sheet?.getCell(`D${12 + DOCUMENT_ITEM_ROW_COUNT}`).value).toBe(500)
  })
})
