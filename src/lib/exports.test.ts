import { describe, expect, it } from 'vitest'
import { exportOrcamentosCsv } from './csv'
import { createHistoricoWorkbook } from './history-xlsx'
import type { Orcamento } from '../types'

const orcamento: Orcamento = {
  id: 'orc-1',
  numero: 285,
  dataOrcamento: '2026-05-18',
  servicoCliente: 'Manutencao preventiva',
  clienteId: 'cliente-1',
  clienteNome: 'Empresa Teste LTDA',
  clienteDocumento: '57.461.028/0001-43',
  representanteId: 'rep-1',
  representanteNome: 'Ana Gestora',
  status: 'enviado',
  observacoes: '',
  validadeDias: 10,
  total: 1200,
  criadoPor: 'user-1',
  criadoPorNome: 'Kauerc',
  criadoEm: '2026-05-18T10:00:00Z',
  atualizadoEm: '2026-05-18T10:30:00Z',
  itens: [{ id: 'i1', quantidade: 1, descricao: 'Servico', valorUnitario: 1200, valorTotal: 1200 }],
}

describe('history exports with linked clients', () => {
  it('includes linked client data in CSV history exports', () => {
    const csv = exportOrcamentosCsv([orcamento])

    expect(csv.split('\n')[0]).toContain('cliente_nome')
    expect(csv.split('\n')[0]).toContain('cliente_documento')
    expect(csv).toContain('Empresa Teste LTDA')
    expect(csv).toContain('57.461.028/0001-43')
  })

  it('includes linked client data in XLSX history exports', async () => {
    const workbook = await createHistoricoWorkbook([orcamento])
    const sheet = workbook.getWorksheet('Historico')

    expect(sheet?.getRow(1).values).toContain('Cliente cadastrado')
    expect(sheet?.getRow(1).values).toContain('Documento')
    expect(sheet?.getCell('D2').value).toBe('Empresa Teste LTDA')
    expect(sheet?.getCell('E2').value).toBe('57.461.028/0001-43')
  })
})
