export const ORCAMENTO_STATUSES = ['rascunho', 'enviado', 'aprovado', 'recusado', 'cancelado', 'excluido'] as const

export type OrcamentoStatus = (typeof ORCAMENTO_STATUSES)[number]

export const CLIENTE_TIPOS = ['cpf', 'cnpj'] as const

export type ClienteTipo = (typeof CLIENTE_TIPOS)[number]

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
  revisao: number
  parentId?: string | null
  dataOrcamento: string
  servicoCliente: string
  clienteId?: string | null
  clienteNome?: string | null
  clienteDocumento?: string | null
  representanteId?: string | null
  representanteNome?: string | null
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
  exclusaoSolicitadaPor?: string | null
  exclusaoSolicitadaPorNome?: string | null
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
  clienteId: string
}

export type ClienteRepresentante = {
  id?: string
  clienteId?: string
  nome: string
  cargo: string
  telefone: string
  email: string
  observacao: string
  principal: boolean
  ativo: boolean
  criadoEm?: string
  atualizadoEm?: string
}

export type Cliente = {
  id: string
  tipo: ClienteTipo
  nome: string
  documento: string
  rg: string
  nomeFantasia: string
  email: string
  telefonePrincipal: string
  telefoneAlternativo: string
  inscricaoEstadual: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  referenciaAcesso: string
  observacoes: string
  tags: string[]
  ativo: boolean
  criadoPor: string
  criadoPorNome: string
  atualizadoPor: string | null
  criadoEm: string
  atualizadoEm: string
  representantes: ClienteRepresentante[]
}

export type ClienteDraft = Omit<Cliente, 'id' | 'criadoPor' | 'criadoPorNome' | 'atualizadoPor' | 'criadoEm' | 'atualizadoEm'>

export type ClienteFilters = {
  search: string
  tipo: ClienteTipo | 'todos'
  status: 'ativos' | 'arquivados' | 'todos'
  cidadeUf: string
}

export type ActivityLog = {
  id: string
  entityType: 'cliente' | 'cliente_representante' | 'orcamento'
  entityId: string
  action: string
  actorId: string | null
  actorName: string | null
  details: Record<string, unknown>
  criadoEm: string
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
