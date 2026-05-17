import ExcelJS from 'exceljs'
import { DOCUMENT_ITEM_ROW_COUNT, EMPRESA } from './constants'
import { formatDateBR } from './formatters'
import { normalizeItemsForDocument } from './orcamento'
import type { Orcamento } from '../types'

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
}

export async function createOrcamentoWorkbook(orcamento: Orcamento): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'CKF Sistema'
  workbook.created = new Date()
  workbook.modified = new Date()

  const sheet = workbook.addWorksheet('Orcamento', {
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      margins: {
        left: 0.511811024,
        right: 0.511811024,
        top: 0.787401575,
        bottom: 0.787401575,
        header: 0.31496062,
        footer: 0.31496062,
      },
    },
    views: [{ showGridLines: false }],
  })

  sheet.columns = [
    { key: 'qtd', width: 9 },
    { key: 'descricao', width: 55.88671875 },
    { key: 'unitario', width: 13.109375 },
    { key: 'total', width: 13.6640625 },
  ]

  sheet.mergeCells('A1:D3')
  sheet.mergeCells('A4:D4')
  sheet.mergeCells('A5:D5')
  sheet.mergeCells('A6:D6')
  sheet.mergeCells('A7:D7')

  sheet.getCell('A1').value = EMPRESA.nome
  sheet.getCell('A4').value = `E-mail: ${EMPRESA.email}`
  sheet.getCell('A5').value = `CNPJ: ${EMPRESA.cnpj}`
  sheet.getCell('A6').value = `Telefone: ${EMPRESA.telefone}`
  sheet.getCell('A7').value = EMPRESA.regiao

  for (let row = 1; row <= 7; row += 1) {
    const current = sheet.getRow(row)
    current.height = row === 1 ? 33 : 15
    current.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } }
      cell.font = { name: row === 1 ? 'Calibri' : 'Arial', size: row === 1 ? 16 : 9, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
  }

  sheet.getCell('A9').value = 'Data:'
  sheet.getCell('B9').value = formatDateBR(orcamento.dataOrcamento)
  sheet.getCell('C9').value = 'Orçamento n°'
  sheet.getCell('D9').value = orcamento.numero

  sheet.getCell('A10').value = 'Serviço:'
  sheet.getCell('B10').value = orcamento.servicoCliente
  sheet.mergeCells('B10:D10')

  sheet.getRow(11).values = ['QTD', 'DESCRIÇÃO', 'VLR UNIT', 'VLR TOTAL']

  for (let row = 9; row <= 11; row += 1) {
    sheet.getRow(row).eachCell({ includeEmpty: true }, (cell) => {
      cell.border = thinBorder
      cell.font = { name: 'Calibri', size: row === 11 ? 8 : 11, bold: row === 11 }
      cell.alignment = { horizontal: row === 11 ? 'center' : 'left', vertical: 'middle' }
    })
  }

  const items = normalizeItemsForDocument(orcamento.itens)
  items.forEach((item, index) => {
    const rowNumber = 12 + index
    const row = sheet.getRow(rowNumber)
    row.getCell(1).value = item.quantidade ?? null
    row.getCell(2).value = item.descricao
    row.getCell(3).value = item.valorUnitario ?? null
    row.getCell(4).value = item.descricao ? item.valorTotal : 'R$               -'
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cell.border = thinBorder
      cell.font = { name: 'Calibri', size: 11 }
      cell.alignment = {
        horizontal: columnNumber === 2 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: columnNumber === 2,
      }
      if (columnNumber >= 3 && typeof cell.value === 'number') {
        cell.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00'
      }
    })
  })

  const totalRowNumber = 12 + DOCUMENT_ITEM_ROW_COUNT
  sheet.mergeCells(`A${totalRowNumber}:C${totalRowNumber}`)
  sheet.getCell(`A${totalRowNumber}`).value = 'Total'
  sheet.getCell(`D${totalRowNumber}`).value = orcamento.total
  sheet.getRow(totalRowNumber).eachCell({ includeEmpty: true }, (cell) => {
    cell.border = thinBorder
    cell.font = { name: 'Calibri', size: 11, bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    if (typeof cell.value === 'number') {
      cell.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00'
    }
  })

  const obsRow = totalRowNumber + 2
  sheet.mergeCells(`A${obsRow}:A${obsRow + 1}`)
  sheet.mergeCells(`B${obsRow}:D${obsRow + 1}`)
  sheet.getCell(`A${obsRow}`).value = 'Obs:'
  sheet.getCell(`B${obsRow}`).value = orcamento.observacoes || ''
  for (let row = obsRow; row <= obsRow + 1; row += 1) {
    sheet.getRow(row).eachCell({ includeEmpty: true }, (cell) => {
      cell.border = thinBorder
      cell.alignment = { vertical: 'middle', wrapText: true }
    })
  }

  const validadeRow = obsRow + 2
  sheet.mergeCells(`A${validadeRow}:D${validadeRow + 2}`)
  sheet.getCell(`A${validadeRow}`).value = `VALIDADE DA PROPOSTA ${orcamento.validadeDias} DIAS`
  sheet.getCell(`A${validadeRow}`).font = { name: 'Calibri', size: 16, bold: true }
  sheet.getCell(`A${validadeRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getCell(`A${validadeRow}`).border = thinBorder

  return workbook
}

export async function workbookToBlob(workbook: ExcelJS.Workbook): Promise<Blob> {
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
