import { describe, expect, it } from 'vitest'
import { EMPRESA } from './constants'
import { formatCurrency, formatDateBR, formatOrcamentoNumero, parseLocalizedNumber, sanitizeFilePart, toOrcamentoFilename } from './formatters'

describe('formatters', () => {
  it('formats Brazilian currency and date values', () => {
    expect(formatCurrency(1234.5)).toBe('R$ 1.234,50')
    expect(formatCurrency(null)).toBe('R$ -')
    expect(formatDateBR('2026-05-16')).toBe('16/05/2026')
  })

  it('sanitizes file names without losing useful client context', () => {
    expect(sanitizeFilePart('Filial São José / Elevador #2')).toBe('Filial_Sao_Jose_Elevador_2')
    expect(toOrcamentoFilename(285, 'Filial São José / Elevador #2', 'pdf')).toBe(
      'Orcamento_285_Filial_Sao_Jose_Elevador_2.pdf',
    )
  })

  it('formats budget numbers with revisions', () => {
    expect(formatOrcamentoNumero(285)).toBe('285')
    expect(formatOrcamentoNumero(5, 0)).toBe('005')
    expect(formatOrcamentoNumero(285, 1)).toBe('285-R1')
    expect(formatOrcamentoNumero(5, 2)).toBe('005-R2')
  })

  it('generates correct file name for budget revisions', () => {
    expect(toOrcamentoFilename(285, 'Elevador #2', 'pdf', 1)).toBe(
      'Orcamento_285-R1_Elevador_2.pdf',
    )
  })

  it('uses the official corrected company CNPJ', () => {
    expect(EMPRESA.nome).toBe('CKF MANUTENÇÃO')
    expect(EMPRESA.cnpj).toBe('57.461.028/0001-43')
  })

  it('parses localized decimal numbers typed in quotation inputs', () => {
    expect(parseLocalizedNumber('1.250,75')).toBe(1250.75)
    expect(parseLocalizedNumber('450.5')).toBe(450.5)
    expect(parseLocalizedNumber('')).toBeNull()
  })
})
