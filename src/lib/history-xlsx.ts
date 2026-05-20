import ExcelJS from 'exceljs'
import { formatCurrency, formatDateBR } from './formatters'
import type { Orcamento } from '../types'

export async function createHistoricoWorkbook(orcamentos: Orcamento[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'CKF Sistema'
  const sheet = workbook.addWorksheet('Historico', { views: [{ showGridLines: false }] })

  sheet.columns = [
    { header: 'Nº', key: 'numero', width: 10 },
    { header: 'Data', key: 'data', width: 14 },
    { header: 'Cliente/Serviço', key: 'servico', width: 38 },
    { header: 'Total', key: 'total', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Criado por', key: 'criadoPor', width: 24 },
    { header: 'Criado em', key: 'criadoEm', width: 24 },
    { header: 'Atualizado em', key: 'atualizadoEm', width: 24 },
    { header: 'Solicitado por', key: 'solicitadoPor', width: 24 },
    { header: 'Excluído por', key: 'excluidoPor', width: 24 },
    { header: 'Excluído em', key: 'excluidoEm', width: 24 },
    { header: 'Motivo da exclusão', key: 'excluidoMotivo', width: 36 },
  ]

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } }

  orcamentos.forEach((orcamento) => {
    sheet.addRow({
      numero: orcamento.numero,
      data: formatDateBR(orcamento.dataOrcamento),
      servico: orcamento.servicoCliente,
      total: formatCurrency(orcamento.total),
      status: orcamento.status,
      criadoPor: orcamento.criadoPorNome,
      criadoEm: orcamento.criadoEm,
      atualizadoEm: orcamento.atualizadoEm,
      solicitadoPor: orcamento.exclusaoSolicitadaPorNome ?? '',
      excluidoPor: orcamento.excluidoPorNome ?? '',
      excluidoEm: orcamento.excluidoEm ?? '',
      excluidoMotivo: orcamento.excluidoMotivo ?? '',
    })
  })

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
      cell.alignment = { vertical: 'middle' }
    })
  })

  return workbook
}
