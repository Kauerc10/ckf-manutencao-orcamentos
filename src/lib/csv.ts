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
    'cliente_nome',
    'cliente_documento',
    'representante_nome',
    'total',
    'status',
    'criado_por_nome',
    'criado_em',
    'atualizado_em',
  ]

  const rows = orcamentos.map((orcamento) => [
    orcamento.numero,
    formatDateBR(orcamento.dataOrcamento),
    orcamento.servicoCliente,
    orcamento.clienteNome ?? '',
    orcamento.clienteDocumento ?? '',
    orcamento.representanteNome ?? '',
    orcamento.total.toFixed(2).replace('.', ','),
    orcamento.status,
    orcamento.criadoPorNome,
    orcamento.criadoEm,
    orcamento.atualizadoEm,
  ])

  return [header, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n')
}
