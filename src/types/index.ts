export const ORCAMENTO_STATUSES = ['rascunho', 'enviado', 'aprovado', 'recusado', 'cancelado', 'excluido'] as const

export type OrcamentoStatus = (typeof ORCAMENTO_STATUSES)[number]

export type OrcamentoItem = {
  id?: string
  quantidade: number | null
  descricao: string
  valorUnitario: number | null
  valorTotal: number
}

export type Orcamento = {
  id: string
  numero: number
  dataOrcamento: string
  servicoCliente: string
  status: OrcamentoStatus
  observacoes: string
  validadeDias: number
  total: number
  criadoPor: string
  criadoPorNome: string
  criadoEm: string
  atualizadoEm: string
  excluidoEm?: string | null
  excluidoPor?: string | null
  excluidoPorNome?: string | null
  excluidoMotivo?: string | null
  itens: OrcamentoItem[]
}

export type OrcamentoDraft = Omit<
  Orcamento,
  'id' | 'numero' | 'criadoPor' | 'criadoPorNome' | 'criadoEm' | 'atualizadoEm'
>

export type OrcamentoFilters = {
  search: string
  status: OrcamentoStatus | 'todos'
  dataInicial: string
  dataFinal: string
  criadoPor: string
}

export type ProfileRole = 'admin' | 'usuario'

export type Profile = {
  id: string
  nome: string
  email: string
  ativo: boolean
  role: ProfileRole
  criadoEm: string
}

export type CompanySettings = {
  nome: string
  email: string
  cnpj: string
  telefone: string
  regiao: string
}

export type PreviewDensidade = 'compacta' | 'confortavel'

export type SystemSettings = {
  id: 'default'
  empresa: CompanySettings
  validadePadraoDias: number
  observacoesPadrao: string
  previewDensidade: PreviewDensidade
  mostrarLogoDocumentos: boolean
  atualizadoEm: string | null
  atualizadoPor: string | null
}
