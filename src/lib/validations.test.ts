import { describe, expect, it } from 'vitest'
import { DEFAULT_SYSTEM_SETTINGS } from './constants'
import { orcamentoFormSchema, systemSettingsSchema } from './validations'

describe('orcamento validation', () => {
  it('accepts a valid quotation with one manual total item', () => {
    const result = orcamentoFormSchema.safeParse({
      dataOrcamento: '2026-05-16',
      servicoCliente: 'Filial Sao Jose',
      status: 'rascunho',
      validadeDias: 10,
      observacoes: '',
      itens: [{ quantidade: null, descricao: 'Reparo geral', valorUnitario: null, valorTotal: 450 }],
    })

    expect(result.success).toBe(true)
  })

  it('rejects empty service/client and quotations without valued items', () => {
    const result = orcamentoFormSchema.safeParse({
      dataOrcamento: '2026-05-16',
      servicoCliente: '',
      status: 'rascunho',
      validadeDias: 0,
      observacoes: '',
      itens: [{ quantidade: null, descricao: '', valorUnitario: null, valorTotal: 0 }],
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('servicoCliente')
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('validadeDias')
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('itens')
  })
})

describe('system settings validation', () => {
  it('accepts official CKF company settings', () => {
    const result = systemSettingsSchema.safeParse(DEFAULT_SYSTEM_SETTINGS)
    expect(result.success).toBe(true)
  })

  it('rejects invalid company email and invalid default validity', () => {
    const result = systemSettingsSchema.safeParse({
      ...DEFAULT_SYSTEM_SETTINGS,
      empresa: { ...DEFAULT_SYSTEM_SETTINGS.empresa, email: 'email-invalido' },
      validadePadraoDias: 0,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('empresa.email')
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('validadePadraoDias')
  })
})
