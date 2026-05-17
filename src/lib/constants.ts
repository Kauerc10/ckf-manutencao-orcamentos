import type { OrcamentoStatus } from '../types'

export const EMPRESA = {
  nome: 'CK MANUTENÇÃO',
  email: 'CK.manutencaoblu@gmail.com',
  cnpj: '57.461.028/0001-43',
  telefone: '(47) 99261-4114',
  regiao: 'BLUMENAU E REGIÃO',
} as const

export const DOCUMENT_ITEM_ROW_COUNT = 14
export const DEFAULT_ITEM_ROWS = 5
export const MAX_ITEM_ROWS = 20
export const DEFAULT_VALIDADE_DIAS = 10
export const ORCAMENTO_SEQUENCE_START = 285

export const STATUS_LABELS: Record<OrcamentoStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  cancelado: 'Cancelado',
}

export const STATUS_CLASSES: Record<OrcamentoStatus, string> = {
  rascunho: 'status-badge status-draft',
  enviado: 'status-badge status-sent',
  aprovado: 'status-badge status-approved',
  recusado: 'status-badge status-rejected',
  cancelado: 'status-badge status-canceled',
}
