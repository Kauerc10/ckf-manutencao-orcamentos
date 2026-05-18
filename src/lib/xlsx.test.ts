import { describe, expect, it } from 'vitest'
import { DEFAULT_SYSTEM_SETTINGS, DOCUMENT_ITEM_ROW_COUNT, EMPRESA } from './constants'
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

  it('uses editable company settings when generating the workbook', async () => {
    const workbook = await createOrcamentoWorkbook(
      {
        id: 'orc-2',
        numero: 286,
        dataOrcamento: '2026-05-17',
        servicoCliente: 'Teste configuracao',
        status: 'rascunho',
        observacoes: '',
        validadeDias: 12,
        total: 100,
        criadoPor: 'user-1',
        criadoPorNome: 'Kauerc',
        criadoEm: '2026-05-17T12:00:00Z',
        atualizadoEm: '2026-05-17T12:00:00Z',
        itens: [{ id: 'i1', quantidade: 1, descricao: 'Servico', valorUnitario: 100, valorTotal: 100 }],
      },
      {
        ...DEFAULT_SYSTEM_SETTINGS,
        empresa: {
          ...DEFAULT_SYSTEM_SETTINGS.empresa,
          nome: 'CKF TESTE',
          cnpj: '00.000.000/0001-00',
        },
      },
    )

    const sheet = workbook.getWorksheet('Orcamento')
    expect(sheet?.getCell('A1').value).toBe('CKF TESTE')
    expect(sheet?.getCell('A5').value).toBe('CNPJ: 00.000.000/0001-00')
  })
})
