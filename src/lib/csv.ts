import { formatDateBR } from './formatters'
import type { Orcamento } from '../types'

function csvEscape(value: string | number): string {
  const text = String(value)
  if (/[",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function exportOrcamentosCsv(orcamentos: Orcamento[]): string {
  const header = [
    'numero',
    'data_orcamento',
    'servico_cliente',
    'total',
    'status',
    'criado_por_nome',
    'criado_em',
    'atualizado_em',
    'exclusao_solicitada_por_nome',
    'excluido_por_nome',
    'excluido_em',
    'excluido_motivo',
  ]

  const rows = orcamentos.map((orcamento) => [
    orcamento.numero,
    formatDateBR(orcamento.dataOrcamento),
    orcamento.servicoCliente,
    orcamento.total.toFixed(2).replace('.', ','),
    orcamento.status,
    orcamento.criadoPorNome,
    orcamento.criadoEm,
    orcamento.atualizadoEm,
    orcamento.exclusaoSolicitadaPorNome ?? '',
    orcamento.excluidoPorNome ?? '',
    orcamento.excluidoEm ?? '',
    orcamento.excluidoMotivo ?? '',
  ])

  return [header, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n')
}
