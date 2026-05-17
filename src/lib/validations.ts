import { z } from 'zod'
import { MAX_ITEM_ROWS } from './constants'
import { calculateItemTotal } from './orcamento'
import { ORCAMENTO_STATUSES } from '../types'

export const orcamentoItemSchema = z.object({
  id: z.string().optional(),
  quantidade: z.number().nonnegative().nullable(),
  descricao: z.string(),
  valorUnitario: z.number().nonnegative().nullable(),
  valorTotal: z.number().nonnegative(),
})

export const orcamentoFormSchema = z
  .object({
    dataOrcamento: z.string().min(1, 'Informe a data do orçamento.'),
    servicoCliente: z.string().trim().min(2, 'Informe o serviço ou cliente.'),
    status: z.enum(ORCAMENTO_STATUSES),
    validadeDias: z.number().int().positive('A validade deve ser maior que zero.'),
    observacoes: z.string(),
    itens: z.array(orcamentoItemSchema).min(1).max(MAX_ITEM_ROWS),
  })
  .superRefine((data, ctx) => {
    const valuedItems = data.itens.filter((item) => item.descricao.trim() && calculateItemTotal(item) > 0)

    if (valuedItems.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['itens'],
        message: 'Inclua pelo menos um item com descrição e valor.',
      })
    }

    data.itens.forEach((item, index) => {
      const hasAnyValue = Boolean(item.quantidade || item.valorUnitario || item.valorTotal)
      if (hasAnyValue && !item.descricao.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['itens', index, 'descricao'],
          message: 'Descreva o item para salvar um valor.',
        })
      }
    })
  })

export type OrcamentoFormValues = z.infer<typeof orcamentoFormSchema>
