export type Servico = {
  id: string
  codigo: string
  nome: string
  categoria: string
  escopo: string
  unidade: string
  precoPadrao: number
  imagem: string
  ativo: boolean
  versao: number
  criadorNome: string
  criadoEm: string
  autorNome: string
  atualizadoEm: string
}
export type ServicoDraft = Omit<Servico, 'id' | 'versao' | 'criadorNome' | 'criadoEm' | 'autorNome' | 'atualizadoEm'> & {
  id?: string
  versao?: number
}
export type TabelaItem = {
  servicoId: string
  codigo: string
  nome: string
  categoria: string
  escopo: string
  unidade: string
  imagem: string
  preco: number
  precoReferencia: number
}
export type TabelaRevisao = {
  versao: number
  titulo: string
  empresa: { id: string; nome: string; documento: string }
  itens: TabelaItem[]
  autorNome: string
  criadoEm: string
}
export type Tabela = TabelaRevisao & { id: string; historico: TabelaRevisao[] }
export type TabelaDraft = {
  empresaId: string
  titulo: string
  versao: number
  itens: { servicoId: string; preco: number }[]
}
