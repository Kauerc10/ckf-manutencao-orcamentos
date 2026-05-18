import type { CompanySettings, OrcamentoStatus, SystemSettings } from '../types'

export const DEFAULT_VALIDADE_DIAS = 10

export const EMPRESA: CompanySettings = {
  nome: 'CKF MANUTENÇÃO',
  email: 'CK.manutencaoblu@gmail.com',
  cnpj: '57.461.028/0001-43',
  telefone: '(47) 99261-4114',
  regiao: 'BLUMENAU E REGIÃO',
}

export const DOCUMENT_ITEM_ROW_COUNT = 14
export const DEFAULT_ITEM_ROWS = 5
export const MAX_ITEM_ROWS = 20
export const ORCAMENTO_SEQUENCE_START = 285

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  id: 'default',
  empresa: EMPRESA,
  validadePadraoDias: DEFAULT_VALIDADE_DIAS,
  observacoesPadrao: '',
  previewDensidade: 'compacta',
  mostrarLogoDocumentos: true,
  atualizadoEm: null,
  atualizadoPor: null,
}

export const BRAND_ASSETS = {
  logoHorizontalPng: '/brand/ckf-logo-horizontal-color-alpha.png',
  logoHorizontalWhiteAmberPng: '/brand/ckf-logo-horizontal-white-amber-trimmed.png',
  logoVerticalWhiteAmberPng: '/brand/ckf-logo-vertical-white-amber-trimmed.png',
  symbolPng: '/brand/ckf-symbol-ckf-color-alpha.png',
  symbolWhiteAmberPng: '/brand/ckf-symbol-ckf-white-amber-trimmed.png',
  patternDark: '/brand/ckf-pattern-industrial-dark.png',
} as const

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
