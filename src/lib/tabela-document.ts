import type { TabelaRevisao } from '../types/comercial'
export type TabelaDocument = {
  titulo: string
  empresa: { nome: string; documento: string }
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
// Explicit allow-list: internal pricing fields never reach the client document.
export function toTabelaDocument(tabela: TabelaRevisao, imagens = false): TabelaDocument {
  return {
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
