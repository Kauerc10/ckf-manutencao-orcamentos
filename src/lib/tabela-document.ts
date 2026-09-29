import type { Servico, TabelaRevisao } from '../types/comercial'
type DocumentoBase = {
  titulo: string
  versao: number
  data: string
  itens: {
    codigo: string
    nome: string
    categoria: string
    escopo: string
    unidade: string
    preco: number
    imagem: string
  }[]
}
export type TabelaDocument = DocumentoBase &
  ({ tipo: 'tabela'; empresa: { nome: string; documento: string } } | { tipo: 'catalogo' })
// Explicit allow-list: internal pricing fields never reach the client document.
export function toTabelaDocument(tabela: TabelaRevisao, imagens = false): TabelaDocument {
  return {
    tipo: 'tabela',
    titulo: tabela.titulo,
    empresa: { nome: tabela.empresa.nome, documento: tabela.empresa.documento },
    versao: tabela.versao,
    data: tabela.criadoEm,
    itens: tabela.itens
      .map((i) => ({
        codigo: i.codigo,
        nome: i.nome,
        categoria: i.categoria,
        escopo: i.escopo,
        unidade: i.unidade,
        preco: i.preco,
        imagem: imagens ? i.imagem : '',
      }))
      .sort((a, b) => a.categoria.localeCompare(b.categoria, 'pt-BR') || a.codigo.localeCompare(b.codigo, 'pt-BR')),
  }
}
export function toCatalogoDocument(servicos: Servico[], imagens = false): TabelaDocument {
  return {
    tipo: 'catalogo',
    titulo: 'Catálogo de serviços CKF',
    versao: 0,
    data: new Date().toISOString(),
    itens: servicos
      .filter((s) => s.ativo)
      .map((s) => ({
        codigo: s.codigo,
        nome: s.nome,
        categoria: s.categoria,
        escopo: s.escopo,
        unidade: s.unidade,
        preco: s.precoPadrao,
        imagem: imagens ? s.imagem : '',
      }))
      .sort((a, b) => a.categoria.localeCompare(b.categoria, 'pt-BR') || a.codigo.localeCompare(b.codigo, 'pt-BR')),
  }
}
