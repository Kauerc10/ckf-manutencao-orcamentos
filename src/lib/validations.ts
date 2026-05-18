import { z } from 'zod'
import { isValidCnpj, isValidCpf, normalizeDocumento } from './clientes'
import { MAX_ITEM_ROWS } from './constants'
import { calculateItemTotal } from './orcamento'
import { CLIENTE_TIPOS, ORCAMENTO_STATUSES } from '../types'

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
    clienteId: z.string().nullable().optional(),
    clienteNome: z.string().nullable().optional(),
    clienteDocumento: z.string().nullable().optional(),
    representanteId: z.string().nullable().optional(),
    representanteNome: z.string().nullable().optional(),
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

export const systemSettingsSchema = z.object({
  empresa: z.object({
    nome: z.string().trim().min(2, 'Informe o nome da empresa.'),
    email: z.string().email('Informe um email válido.'),
    cnpj: z.string().trim().min(14, 'Informe o CNPJ.'),
    telefone: z.string().trim().min(8, 'Informe o telefone.'),
    regiao: z.string().trim().min(2, 'Informe a região.'),
  }),
  validadePadraoDias: z.number().int().positive('A validade deve ser maior que zero.').max(365),
  observacoesPadrao: z.string().max(800, 'Use até 800 caracteres nas observações padrão.'),
  previewDensidade: z.enum(['compacta', 'confortavel']),
  mostrarLogoDocumentos: z.boolean(),
})

export type SystemSettingsFormValues = z.infer<typeof systemSettingsSchema>

const optionalEmail = z.union([z.string().trim().email('Informe um email valido.'), z.literal(''), z.undefined()]).default('')
const optionalText = z.string().trim().optional().default('')

export const clienteRepresentanteSchema = z.object({
  id: z.string().optional(),
  nome: z.string().trim().min(2, 'Informe o nome do representante.'),
  cargo: z.string().trim().min(2, 'Informe o cargo do representante.'),
  telefone: z.string().trim().min(8, 'Informe o telefone do representante.'),
  email: optionalEmail,
  observacao: optionalText,
  principal: z.boolean().default(false),
  ativo: z.boolean().default(true),
})

export const clienteFormSchema = z
  .object({
    tipo: z.enum(CLIENTE_TIPOS),
    nome: z.string().trim().min(2, 'Informe o nome ou razao social.'),
    documento: z.string().transform(normalizeDocumento),
    nomeFantasia: optionalText,
    email: optionalEmail,
    telefonePrincipal: z.string().trim().min(8, 'Informe o telefone principal.'),
    telefoneAlternativo: optionalText,
    inscricaoEstadual: optionalText,
    cep: z.string().trim().min(8, 'Informe o CEP.'),
    logradouro: z.string().trim().min(2, 'Informe o logradouro.'),
    numero: z.string().trim().min(1, 'Informe o numero.'),
    complemento: optionalText,
    bairro: z.string().trim().min(2, 'Informe o bairro.'),
    cidade: z.string().trim().min(2, 'Informe a cidade.'),
    uf: z.string().trim().length(2, 'Informe a UF.').transform((value) => value.toUpperCase()),
    referenciaAcesso: optionalText,
    observacoes: optionalText,
    tags: z.array(z.string()).default([]),
    ativo: z.boolean().default(true),
    representantes: z.array(clienteRepresentanteSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === 'cpf' && !isValidCpf(data.documento)) {
      ctx.addIssue({ code: 'custom', path: ['documento'], message: 'Informe um CPF valido.' })
    }

    if (data.tipo === 'cnpj' && !isValidCnpj(data.documento)) {
      ctx.addIssue({ code: 'custom', path: ['documento'], message: 'Informe um CNPJ valido.' })
    }

    if (data.tipo === 'cnpj' && !data.representantes.some((representante) => representante.principal && representante.ativo)) {
      ctx.addIssue({
        code: 'custom',
        path: ['representantes'],
        message: 'Cadastre ao menos um representante principal para CNPJ.',
      })
    }
  })

export type ClienteFormValues = z.infer<typeof clienteFormSchema>
